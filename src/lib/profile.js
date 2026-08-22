// Profile projections shared by the signed-in /profile page and the public
// /@username page. Both render the same layout, so both need the same shape:
// the signed-in page derives it from the live diary, while a visitor reads it
// back from the published projection in `publicProfiles`.

const ACTIVITY_MONTHS = 24
const TOP_GENRE_COUNT = 8

// A viewing has its own entry, while title-level details (such as the user's
// rating) are shared by every viewing of the same film or show.
export function movieKey(entry) {
  const title = (entry.title || '').trim().toLowerCase().replace(/\s+/g, ' ')
  // Title/year/type remains stable when an imported entry is later enriched
  // with a TMDB id. Using tmdbId first split those two versions of the same
  // movie, which disconnected Top 20 rank from its shared rating.
  if (title) return `title:${entry.type || 'movie'}:${title}:${entry.year || ''}`
  return `tmdb:${entry.type || 'movie'}:${entry.tmdbId || ''}`
}

export const watchedOn = (entry) => entry.watchedDate || entry.createdAt || ''

export const byWatchedDesc = (a, b) => watchedOn(b).localeCompare(watchedOn(a))

export const profileTop20 = (entries = []) => entries
  .filter((entry) => entry.top20)
  .sort((a, b) => (a.top20Rank || 99) - (b.top20Rank || 99))
  .slice(0, 20)

export const profileRecent = (entries = [], count = 12) => [...entries].sort(byWatchedDesc).slice(0, count)

// The published document stores absolute `YYYY-MM` keys rather than a
// pre-windowed chart, so a projection written months ago still renders a
// correct trailing-twelve-month view for whoever opens the page today.
// The hero banner. An owner can pin any watch from their diary; otherwise it
// falls back to their highest-ranked favourite, so a profile looks like the
// films it is made of rather than a generic gradient. The resolved image is
// published with the projection because visitors never see the diary itself.
export function profileHero(entries = [], pinnedId = '') {
  const pinned = pinnedId ? entries.find((entry) => entry.id === pinnedId) : null
  const pool = pinned ? [pinned] : [...profileTop20(entries), ...profileRecent(entries, 12)]
  const pick = pool.find((entry) => entry.backdrop) || pool.find((entry) => entry.poster)
  if (!pick) return null
  return { id: pick.id, image: pick.backdrop || pick.poster, title: pick.title || '', year: pick.year || '' }
}

// Only watches with artwork can carry the banner. Favourites lead, one tile per
// film rather than per viewing, and posters trail the wide backdrops because
// they crop poorly at banner proportions.
export function heroCandidates(entries = []) {
  const seen = new Set()
  const unique = []
  for (const entry of [...profileTop20(entries), ...[...entries].sort(byWatchedDesc)]) {
    if (!entry.backdrop && !entry.poster) continue
    const key = movieKey(entry)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(entry)
  }
  return [...unique.filter((entry) => entry.backdrop), ...unique.filter((entry) => !entry.backdrop)]
}

export function buildProfileStats(entries = [], watchlists = []) {
  const genreCount = {}
  const activity = {}
  const ratingSpread = Array.from({ length: 10 }, () => 0)
  let films = 0
  let shows = 0
  let firstTime = 0
  let rated = 0
  let ratingTotal = 0
  let firstWatch = ''
  let lastWatch = ''

  for (const entry of entries) {
    if (entry.type === 'tv') shows += 1
    else films += 1
    if (entry.firstTime) firstTime += 1
    for (const genre of entry.genres || []) if (genre) genreCount[genre] = (genreCount[genre] || 0) + 1

    const rating = Number(entry.rating)
    if (rating > 0) {
      rated += 1
      ratingTotal += rating
      ratingSpread[Math.min(9, Math.max(0, Math.ceil(rating) - 1))] += 1
    }

    const date = watchedOn(entry).slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      if (!firstWatch || date < firstWatch) firstWatch = date
      if (!lastWatch || date > lastWatch) lastWatch = date
      const month = date.slice(0, 7)
      activity[month] = (activity[month] || 0) + 1
    }
  }

  const recentMonths = Object.keys(activity).sort().slice(-ACTIVITY_MONTHS)

  return {
    watches: entries.length,
    uniqueTitles: new Set(entries.map(movieKey)).size,
    rated,
    averageRating: rated ? Number((ratingTotal / rated).toFixed(1)) : null,
    watchlistCount: watchlists.reduce((sum, list) => sum + (list.items?.length || 0), 0),
    films,
    shows,
    firstTime,
    topGenres: Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, TOP_GENRE_COUNT)
      .map(([name, count]) => ({ name, count })),
    ratingSpread,
    activity: Object.fromEntries(recentMonths.map((month) => [month, activity[month]])),
    firstWatch,
    lastWatch,
  }
}

// Builds the trailing window at render time from whichever month keys the
// projection happens to carry.
export function activityMonths(activity = {}, count = 12, now = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    return {
      key,
      label: new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date),
      full: new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date),
      count: activity?.[key] || 0,
    }
  })
}

// `throughMonth` bounds the sum so this year can be compared against the same
// stretch of last year rather than against a full twelve months of it.
export function watchesInYear(activity = {}, year = new Date().getFullYear(), throughMonth = 12) {
  return Object.entries(activity || {})
    .filter(([month]) => month.startsWith(`${year}-`) && Number(month.slice(5, 7)) <= throughMonth)
    .reduce((sum, [, count]) => sum + count, 0)
}

export function formatWatchDate(value) {
  if (!value) return ''
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export function formatMonthYear(value) {
  if (!value) return ''
  const date = new Date(`${String(value).slice(0, 7)}-01T12:00:00`)
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date)
}
