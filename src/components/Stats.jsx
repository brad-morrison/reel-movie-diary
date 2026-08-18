import { useState } from 'react'
import { motion } from 'framer-motion'
import AnimatedNumber from './AnimatedNumber.jsx'
import { IconStar, IconChart, IconFilm, IconCheck, IconHeart } from '../lib/icons.jsx'
import { movieKey } from '../lib/store.js'
import { fetchAudienceRating } from '../lib/tmdb.js'

function ratingOrder(a, b) {
  const score = b.rating - a.rating
  if (score) return score
  const aRank = a.top20 ? (a.top20Rank || 21) : Number.MAX_SAFE_INTEGER
  const bRank = b.top20 ? (b.top20Rank || 21) : Number.MAX_SAFE_INTEGER
  return aRank - bRank || (b.year || 0) - (a.year || 0)
}

export default function Stats({ entries, tmdbKey = '', onUpdate }) {
  const [scoreRefresh, setScoreRefresh] = useState(null)
  const total = entries.length
  const uniqueMap = new Map()
  for (const entry of entries) {
    const key = movieKey(entry)
    const existing = uniqueMap.get(key)
    if (!existing || (entry.top20 && !existing.top20)) uniqueMap.set(key, entry)
  }
  const uniqueMovies = [...uniqueMap.values()]
  const rated = uniqueMovies.filter((e) => e.rating > 0)
  const avg = rated.length ? rated.reduce((s, e) => s + e.rating, 0) / rated.length : 0
  const thisYear = new Date().getFullYear()
  const yearCount = entries.filter((e) => e.watchedDate?.startsWith(String(thisYear))).length
  const films = entries.filter((e) => e.type === 'movie').length
  const shows = entries.filter((e) => e.type === 'tv').length
  const firstTime = entries.filter((e) => e.firstTime).length

  // Genre frequency
  const genreCount = {}
  for (const e of entries) for (const g of e.genres || []) genreCount[g] = (genreCount[g] || 0) + 1
  const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxGenre = topGenres[0]?.[1] || 1

  // Platform frequency
  const platformCount = {}
  for (const e of entries) if (e.platform) platformCount[e.platform] = (platformCount[e.platform] || 0) + 1
  const topPlatforms = Object.entries(platformCount).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxPlatform = topPlatforms[0]?.[1] || 1

  // Who you watch with
  const companionCount = {}
  for (const e of entries) for (const c of e.companions || []) companionCount[c] = (companionCount[c] || 0) + 1
  const topCompanions = Object.entries(companionCount).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxCompanion = topCompanions[0]?.[1] || 1

  // Ten readable bands preserve the curve while ratings retain 0.1 precision.
  const buckets = Array.from({ length: 10 }, (_, i) => i + 1)
  const hist = buckets.map((b) => rated.filter((e) => Math.ceil(e.rating) === b).length)
  const maxHist = Math.max(1, ...hist)

  // Top rated
  const topRated = [...rated].sort(ratingOrder).slice(0, 5)
  const lowestRated = [...rated].sort((a, b) => a.rating - b.rating || (a.year || 0) - (b.year || 0)).slice(0, 5)
  const largestSwings = rated
    .map((entry) => {
      const viewings = entries.filter((viewing) => movieKey(viewing) === movieKey(entry))
      const imdbValue = viewings.map((viewing) => viewing.imdbRating ?? viewing.imdb ?? viewing.imdbScore).find((value) => Number(value) > 0)
      const tmdbValue = viewings.map((viewing) => viewing.voteAverage).find((value) => Number(value) > 0)
      const audienceRating = Number(imdbValue ?? tmdbValue)
      if (!Number.isFinite(audienceRating) || audienceRating <= 0) return null
      return {
        entry,
        audienceRating,
        source: imdbValue != null ? 'IMDb' : 'TMDB',
        swing: entry.rating - audienceRating,
      }
    })
    .filter((item) => item && item.swing > 0)
    .sort((a, b) => b.swing - a.swing)
    .slice(0, 5)
  const audienceScoreCount = rated.filter((entry) => entries.some((viewing) =>
    movieKey(viewing) === movieKey(entry) && Number(viewing.imdbRating ?? viewing.imdb ?? viewing.imdbScore ?? viewing.voteAverage) > 0,
  )).length

  async function refreshAudienceScores() {
    if (!tmdbKey || !onUpdate || scoreRefresh) return
    const missing = rated.filter((entry) => !entries.some((viewing) =>
      movieKey(viewing) === movieKey(entry) && Number(viewing.imdbRating ?? viewing.imdb ?? viewing.imdbScore ?? viewing.voteAverage) > 0,
    ))
    setScoreRefresh({ done: 0, total: missing.length })
    let done = 0
    const concurrency = 6
    for (let i = 0; i < missing.length; i += concurrency) {
      const chunk = missing.slice(i, i + concurrency)
      const scores = await Promise.all(chunk.map((entry) => fetchAudienceRating(entry, tmdbKey).catch(() => 0)))
      chunk.forEach((entry, index) => {
        if (scores[index] > 0) onUpdate(entry.id, { voteAverage: scores[index] })
        done++
      })
      setScoreRefresh({ done, total: missing.length })
    }
    setScoreRefresh(null)
  }

  // Monthly activity (last 12 months)
  const now = new Date()
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString(undefined, { month: 'short' }) }
  })
  const monthCount = months.map((m) => entries.filter((e) => e.watchedDate?.startsWith(m.key)).length)
  const maxMonth = Math.max(1, ...monthCount)

  if (total === 0) {
    return (
      <div className="empty">
        <div className="empty-mark">📊</div>
        <h3>No stats yet</h3>
        <p>Log a few things you've watched and your year in film will bloom here.</p>
      </div>
    )
  }

  const cards = [
    { label: 'Total logged', value: total, ic: <IconFilm size={18} /> },
    { label: `Watched in ${thisYear}`, value: yearCount, ic: <IconChart size={18} /> },
    { label: 'Average rating', value: avg, decimals: 1, ic: <IconStar size={18} /> },
    { label: 'First-time watches', value: firstTime, ic: <IconCheck size={18} /> },
  ]

  return (
    <div>
      <div className="stat-strip">
        {cards.map((c, i) => (
          <motion.div key={c.label} className="stat-card"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <div className="stat-value">
              <AnimatedNumber value={c.value} decimals={c.decimals || 0} />
              {c.unit && <span className="unit">{c.unit}</span>}
            </div>
            <div className="stat-label">{c.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="stats-grid">
        <motion.div className="panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h3><IconChart size={18} /> Rating distribution</h3>
          <div className="rating-hist">
            {hist.map((count, i) => (
              <div className="hist-col" key={i}>
                <div className="hist-bar-area">
                  <motion.div
                    className="hist-bar"
                    initial={{ height: 0 }}
                    animate={{ height: `${(count / maxHist) * 100}%` }}
                    transition={{ delay: 0.2 + i * 0.04, type: 'spring', stiffness: 120, damping: 16 }}
                    title={`${count} rated ${buckets[i]}`}
                  />
                </div>
                <span className="hist-label">{buckets[i]}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <h3><IconFilm size={18} /> Top genres</h3>
          {topGenres.length === 0 && <p className="dim">No genre data yet.</p>}
          {topGenres.map(([g, n], i) => (
            <div className="bar-row" key={g}>
              <span className="bar-label">{g}</span>
              <div className="bar-track">
                <motion.div className="bar-fill" initial={{ width: 0 }} animate={{ width: `${(n / maxGenre) * 100}%` }}
                  transition={{ delay: 0.25 + i * 0.06, type: 'spring', stiffness: 120, damping: 18 }} />
              </div>
              <span className="bar-val">{n}</span>
            </div>
          ))}
        </motion.div>

        {topPlatforms.length > 0 && (
          <motion.div className="panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <h3><IconFilm size={18} /> Top platforms</h3>
            {topPlatforms.map(([p, n], i) => (
              <div className="bar-row" key={p}>
                <span className="bar-label">{p}</span>
                <div className="bar-track">
                  <motion.div className="bar-fill" initial={{ width: 0 }} animate={{ width: `${(n / maxPlatform) * 100}%` }}
                    transition={{ delay: 0.24 + i * 0.06, type: 'spring', stiffness: 120, damping: 18 }} />
                </div>
                <span className="bar-val">{n}</span>
              </div>
            ))}
          </motion.div>
        )}

        {topCompanions.length > 0 && (
          <motion.div className="panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h3><IconHeart size={18} /> Watched with</h3>
            {topCompanions.map(([c, n], i) => (
              <div className="bar-row" key={c}>
                <span className="bar-label">{c}</span>
                <div className="bar-track">
                  <motion.div className="bar-fill companion-bar-fill" initial={{ width: 0 }} animate={{ width: `${(n / maxCompanion) * 100}%` }}
                    transition={{ delay: 0.26 + i * 0.06, type: 'spring', stiffness: 120, damping: 18 }} />
                </div>
                <span className="bar-val">{n}</span>
              </div>
            ))}
          </motion.div>
        )}

        <motion.div className="panel panel-full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
          <h3><IconChart size={18} /> Last 12 months</h3>
          <div className="rating-hist" style={{ height: 150 }}>
            {monthCount.map((count, i) => (
              <div className="hist-col" key={i}>
                <div className="hist-bar-area">
                  <motion.div className="hist-bar" initial={{ height: 0 }} animate={{ height: `${(count / maxMonth) * 100}%` }}
                    transition={{ delay: 0.3 + i * 0.04, type: 'spring', stiffness: 120, damping: 16 }} title={`${count} in ${months[i].label}`}>
                    <span className="hist-bar-value">{count}</span>
                  </motion.div>
                </div>
                <span className="hist-label">{months[i].label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
          <h3><IconStar size={18} /> Highest rated</h3>
          <div className="mini-list">
            {topRated.map((e, i) => (
              <div className="mini-row" key={e.id}>
                <span className="mini-rank">{i + 1}</span>
                {e.poster ? <img className="mini-poster" src={e.poster} alt="" /> : <div className="mini-poster" />}
                <span className="mini-title">{e.title}</span>
                <span className="mini-val"><IconStar size={13} /> {e.rating}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3><IconStar size={18} /> Lowest rated</h3>
          <div className="mini-list">
            {lowestRated.map((e, i) => (
              <div className="mini-row" key={e.id}>
                <span className="mini-rank">{i + 1}</span>
                {e.poster ? <img className="mini-poster" src={e.poster} alt="" /> : <div className="mini-poster" />}
                <span className="mini-title">{e.title}</span>
                <span className="mini-val"><IconStar size={13} /> {e.rating}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
          <h3><IconChart size={18} /> Largest swing</h3>
          {largestSwings.length === 0 ? (
            <p className="dim swing-empty">No positive audience-score swings yet. Re-import your Notion CSV if it contains an IMDb Rating column.</p>
          ) : (
            <div className="mini-list">
              {largestSwings.map(({ entry, audienceRating, source, swing }, i) => (
                <div className="mini-row" key={entry.id}>
                  <span className="mini-rank">{i + 1}</span>
                  {entry.poster ? <img className="mini-poster" src={entry.poster} alt="" /> : <div className="mini-poster" />}
                  <span className="mini-title swing-title">{entry.title}<small>You {entry.rating} · {source} {audienceRating.toFixed(1)}</small></span>
                  <span className="mini-val swing-value">+{swing.toFixed(1)}★</span>
                </div>
              ))}
            </div>
          )}
          {audienceScoreCount < rated.length && (
            <div className="swing-refresh">
              <span>{scoreRefresh ? `Fetching scores… ${scoreRefresh.done}/${scoreRefresh.total}` : `${audienceScoreCount} of ${rated.length} movies have audience scores`}</span>
              <button type="button" onClick={refreshAudienceScores} disabled={!tmdbKey || !!scoreRefresh}>
                {tmdbKey ? 'Complete scores' : 'Connect TMDB first'}
              </button>
            </div>
          )}
        </motion.div>

        <motion.div className="panel panel-natural" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
          <h3><IconFilm size={18} /> Films vs TV</h3>
          <div className="media-split">
            <Donut films={films} shows={shows} />
            <div className="media-legend">
              <div className="media-row films">
                <span className="media-swatch" />
                <strong>{films}</strong>
                <span>Films</span>
                <em>{Math.round((films / (films + shows || 1)) * 100)}%</em>
              </div>
              <div className="media-row shows">
                <span className="media-swatch" />
                <strong>{shows}</strong>
                <span>TV series</span>
                <em>{Math.round((shows / (films + shows || 1)) * 100)}%</em>
              </div>
            </div>
          </div>
          <div className="first-watch-summary">
            <div><span>First-time watches</span><strong>{Math.round((firstTime / (total || 1)) * 100)}%</strong></div>
            <div className="first-watch-track"><motion.span initial={{ width: 0 }} animate={{ width: `${(firstTime / (total || 1)) * 100}%` }} transition={{ delay: .45, duration: .8 }} /></div>
            <small>{firstTime} of {total} diary entries</small>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function Donut({ films, shows }) {
  const total = films + shows || 1
  const filmPct = films / total
  const r = 46
  const c = 2 * Math.PI * r
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--rose)" strokeWidth="16" />
      <motion.circle
        cx="60" cy="60" r={r} fill="none" stroke="var(--gold)" strokeWidth="16" strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - filmPct) }}
        transition={{ delay: 0.4, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  )
}
