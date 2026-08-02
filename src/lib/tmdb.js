// Lightweight TMDB client. All calls take the user's API key (v3).
// If no key is set, the app falls back to fully manual entry.
const BASE = 'https://api.themoviedb.org/3'
const IMG = 'https://image.tmdb.org/t/p'

export const posterUrl = (path, size = 'w500') =>
  path ? `${IMG}/${size}${path}` : ''
export const backdropUrl = (path, size = 'w1280') =>
  path ? `${IMG}/${size}${path}` : ''

const GENRE_MAP = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
  10765: 'Science Fiction', 10766: 'Soap', 10767: 'Talk', 10768: 'War',
}

export async function searchTitles(query, key) {
  if (!key || !query.trim()) return []
  const url = `${BASE}/search/multi?api_key=${key}&query=${encodeURIComponent(
    query,
  )}&include_adult=false`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TMDB ${res.status}`)
  const data = await res.json()
  return (data.results || [])
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
    .slice(0, 8)
    .map((r) => {
      const isTv = r.media_type === 'tv'
      const date = isTv ? r.first_air_date : r.release_date
      return {
        tmdbId: r.id,
        type: isTv ? 'tv' : 'movie',
        title: isTv ? r.name : r.title,
        year: date ? Number(date.slice(0, 4)) : undefined,
        poster: posterUrl(r.poster_path),
        backdrop: backdropUrl(r.backdrop_path),
        overview: r.overview || '',
        genres: (r.genre_ids || []).map((id) => GENRE_MAP[id]).filter(Boolean),
        voteAverage: r.vote_average,
      }
    })
}

export async function verifyKey(key) {
  try {
    const res = await fetch(`${BASE}/configuration?api_key=${key}`)
    return res.ok
  } catch {
    return false
  }
}

// ---- Artwork enrichment ---------------------------------------------------
const normTitle = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

// Strip "- Season 3" / "Xmas Special" style suffixes so a season entry still
// matches its parent show. Returns the cleaned title + whether it looks like TV.
function cleanTitle(title) {
  let t = title || ''
  const forcedTv = /season\s*\d+|xmas special|:\s*season|\bpart\s*\d+\b/i.test(t)
  t = t
    .replace(/[\s\-:]+season\s*\d+.*$/i, '')
    .replace(/\bseason\s*\d+.*$/i, '')
    .replace(/[\s\-:]+xmas special.*$/i, '')
    .replace(/xmas special.*$/i, '')
    .replace(/[-:]\s*$/, '')
    .trim()
  return { t: t || title, forcedTv }
}

const yearOf = (r, type) =>
  String((type === 'tv' ? r.first_air_date : r.release_date) || '').slice(0, 4)

function pickBest(results, title, year, type) {
  const target = normTitle(title)
  return (
    results.find((r) => normTitle(r.title || r.name) === target && (!year || yearOf(r, type) === String(year))) ||
    results.find((r) => normTitle(r.title || r.name) === target) ||
    (year && results.find((r) => yearOf(r, type) === String(year))) ||
    results.find((r) => r.poster_path) ||
    results[0]
  )
}

// Look a single entry up on TMDB and return a patch of artwork/metadata.
// Never overwrites the user's own genres/overview if already present.
export async function enrichEntry(entry, key) {
  if (!key || !entry?.title) return null
  const c = cleanTitle(entry.title)
  const order = c.forcedTv || entry.type === 'tv' ? ['tv', 'movie'] : ['movie', 'tv']
  const q = encodeURIComponent(c.t)
  const yr = entry.year

  for (const t of order) {
    let results = []
    try {
      const yq = yr ? (t === 'tv' ? `&first_air_date_year=${yr}` : `&year=${yr}`) : ''
      results = (await (await fetch(`${BASE}/search/${t}?api_key=${key}&query=${q}${yq}`)).json()).results || []
      if (!results.length) {
        results = (await (await fetch(`${BASE}/search/${t}?api_key=${key}&query=${q}`)).json()).results || []
      }
    } catch {
      results = []
    }
    if (!results.length) continue
    const best = pickBest(results, c.t, yr, t)
    if (!best || !best.poster_path) continue
    const date = t === 'tv' ? best.first_air_date : best.release_date
    return {
      poster: posterUrl(best.poster_path),
      backdrop: backdropUrl(best.backdrop_path),
      overview: entry.overview || best.overview || '',
      tmdbId: best.id,
      type: t,
      year: entry.year || (date ? Number(date.slice(0, 4)) : undefined),
      genres: entry.genres?.length
        ? entry.genres
        : (best.genre_ids || []).map((id) => GENRE_MAP[id]).filter(Boolean),
    }
  }
  return null
}

// Enrich every entry that has no poster. Returns a fresh entries array plus a
// summary. onProgress(done, total, enriched) fires after each batch.
export async function enrichMissing(entries, key, onProgress) {
  const byId = new Map(entries.map((e) => [e.id, { ...e }]))
  const todo = entries.filter((e) => !e.poster)
  const notFound = []
  let done = 0
  let enriched = 0
  const CONCURRENCY = 8

  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const chunk = todo.slice(i, i + CONCURRENCY)
    const patches = await Promise.all(chunk.map((e) => enrichEntry(e, key).catch(() => null)))
    chunk.forEach((e, j) => {
      const patch = patches[j]
      if (patch && patch.poster) {
        Object.assign(byId.get(e.id), patch)
        enriched++
      } else {
        notFound.push(e.title)
      }
      done++
    })
    onProgress?.(done, todo.length, enriched)
  }

  return { entries: Array.from(byId.values()), attempted: todo.length, enriched, notFound }
}
