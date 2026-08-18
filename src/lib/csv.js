// Tolerant CSV parser + Notion column mapper.
// Handles quoted fields, embedded commas, and newlines inside quotes.
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
      else field += c
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

const norm = (s) => (s || '').trim().toLowerCase()

function findCol(headers, candidates) {
  for (const cand of candidates) {
    const i = headers.findIndex((h) => norm(h) === cand || norm(h).includes(cand))
    if (i !== -1) return i
  }
  return -1
}

// Convert a rating string (e.g. "★★★★", "8/10", "4.5", "9") into a 0–10 number.
function parseRating(raw) {
  if (!raw) return 0
  const stars = (raw.match(/[★⭐]/g) || []).length
  if (stars) return Math.min(5, stars) * 2
  const outOfTen = raw.match(/(\d+(?:\.\d+)?)\s*\/\s*10/)
  if (outOfTen) return Math.min(10, Number(outOfTen[1]))
  const outOfFive = raw.match(/(\d+(?:\.\d+)?)\s*\/\s*5/)
  if (outOfFive) return Math.min(10, Number(outOfFive[1]) * 2)
  const num = parseFloat(raw)
  if (!isNaN(num)) {
    if (num > 5) return Math.min(10, num) // assume /10
    return Math.min(10, num * 2) // assume /5
  }
  return 0
}

export function normalizeTenPointRating(score) {
  const s = Number(score)
  if (isNaN(s)) return 0
  return Math.max(0, Math.min(10, Math.round(s * 10) / 10))
}

function parseDate(raw) {
  if (!raw) return ''
  // Prefer an explicit ISO-ish match first (no timezone conversion).
  const m = raw.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  // Fall back to Date parsing, but read LOCAL parts so the day never shifts.
  const d = new Date(raw)
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${mo}-${day}`
  }
  return ''
}

function truthy(raw) {
  const v = norm(raw)
  return v === 'yes' || v === 'true' || v === '✓' || v === 'x' || v === '1'
}

// Split a "Watched with" value like "Charlie, Emily" into ["Charlie", "Emily"].
function splitPeople(raw) {
  return (raw || '')
    .split(/\s*[,;&]\s*|\s+and\s+/i)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function parseNotionCsv(text) {
  const rows = parseCsv(text)
  if (rows.length < 2) return []
  const headers = rows[0]

  const ci = {
    title: findCol(headers, ['name', 'title', 'movie', 'film', 'show']),
    year: findCol(headers, ['release year', 'year', 'released']),
    type: findCol(headers, ['type', 'category', 'format', 'medium']),
    // "My rating" must win over "IMDb Rating" — list the specific names first.
    rating: findCol(headers, ['my rating', 'my score', 'your rating', 'score', 'stars', 'rating']),
    imdb: findCol(headers, ['imdb']),
    date: findCol(headers, ['watched on', 'date watched', 'watched', 'date', 'seen', 'when']),
    genres: findCol(headers, ['genre', 'genres', 'tags']),
    // "First watch? = No" means it's a rewatch.
    firstWatch: findCol(headers, ['first watch', 'first time']),
    rewatch: findCol(headers, ['rewatch', 'rewatched']),
    platform: findCol(headers, ['platform', 'service', 'streaming', 'where watched', 'app']),
    companions: findCol(headers, ['watched with', 'who with', 'companions', 'company', 'seen with']),
    poster: findCol(headers, ['poster', 'image', 'cover']),
  }
  if (ci.title === -1) ci.title = 0 // fall back to first column
  const cell = (row, i) => (i !== -1 ? (row[i] || '').trim() : '')

  // Detect the rating scale: if any value in the column exceeds 5 it's /10.
  let tenScale = false
  if (ci.rating !== -1) {
    for (let r = 1; r < rows.length; r++) {
      const v = parseFloat(cell(rows[r], ci.rating))
      if (!isNaN(v) && v > 5) { tenScale = true; break }
    }
  }

  const out = []
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    const title = cell(cells, ci.title)
    if (!title) continue

    const typeRaw = norm(cell(cells, ci.type))
    const type = /tv|show|series|season|episode/.test(typeRaw) ? 'tv' : 'movie'
    const yearMatch = cell(cells, ci.year).match(/\d{4}/)

    // Rewatch: prefer an explicit rewatch column, else invert "First watch?".
    let rewatch = false
    if (ci.rewatch !== -1) rewatch = truthy(cell(cells, ci.rewatch))
    else if (ci.firstWatch !== -1) rewatch = norm(cell(cells, ci.firstWatch)) === 'no'

    const rawRating = parseFloat(cell(cells, ci.rating))
    const rawImdbRating = parseFloat(cell(cells, ci.imdb))
    const hasRating = !isNaN(rawRating)
    // Preserve /10 scores; convert /5 columns to the new scale.
    let rating = 0
    if (hasRating && tenScale) {
      rating = normalizeTenPointRating(rawRating)
    } else if (hasRating) {
      rating = Math.min(10, Math.round(rawRating * 20) / 10)
    } else {
      rating = parseRating(cell(cells, ci.rating)) // ★ symbols, "8/10", etc.
    }

    out.push({
      title,
      year: yearMatch ? Number(yearMatch[0]) : undefined,
      type,
      poster: cell(cells, ci.poster),
      backdrop: '',
      overview: '',
      genres: ci.genres !== -1 ? cell(cells, ci.genres).split(/[,;]/).map((g) => g.trim()).filter(Boolean) : [],
      rating,
      imdbRating: !isNaN(rawImdbRating) ? rawImdbRating : undefined,
      watchedDate: parseDate(cell(cells, ci.date)),
      firstTime: !rewatch,
      platform: cell(cells, ci.platform),
      companions: splitPeople(cell(cells, ci.companions)),
    })
  }
  return out
}

// Distinct platforms and people across a set of entries — for seeding the
// Settings catalogues after an import.
export function collectCatalogs(entries) {
  const platforms = new Set()
  const people = new Set()
  for (const e of entries) {
    if (e.platform) platforms.add(e.platform)
    for (const p of e.companions || []) people.add(p)
  }
  return {
    platforms: [...platforms].sort(),
    people: [...people].sort(),
  }
}
