import { motion } from 'framer-motion'
import AnimatedNumber from './AnimatedNumber.jsx'
import { IconStar, IconChart, IconFilm, IconCheck } from '../lib/icons.jsx'

export default function Stats({ entries }) {
  const total = entries.length
  const rated = entries.filter((e) => e.rating > 0)
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

  // Rating histogram (0.5 buckets from 0.5..5)
  const buckets = Array.from({ length: 10 }, (_, i) => (i + 1) * 0.5)
  const hist = buckets.map((b) => rated.filter((e) => e.rating === b).length)
  const maxHist = Math.max(1, ...hist)

  // Top rated
  const topRated = [...rated].sort((a, b) => b.rating - a.rating || (b.year || 0) - (a.year || 0)).slice(0, 5)

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
                <span className="hist-label">{i % 2 === 1 ? <><IconStar size={9} />{buckets[i]}</> : ''}</span>
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

        <motion.div className="panel panel-full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
          <h3><IconChart size={18} /> Last 12 months</h3>
          <div className="rating-hist" style={{ height: 150 }}>
            {monthCount.map((count, i) => (
              <div className="hist-col" key={i}>
                <div className="hist-bar-area">
                  <motion.div className="hist-bar" initial={{ height: 0 }} animate={{ height: `${(count / maxMonth) * 100}%` }}
                    transition={{ delay: 0.3 + i * 0.04, type: 'spring', stiffness: 120, damping: 16 }} title={`${count} in ${months[i].label}`} />
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

        {topPlatforms.length > 0 && (
          <motion.div className="panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h3><IconFilm size={18} /> Top platforms</h3>
            {topPlatforms.map(([p, n], i) => (
              <div className="bar-row" key={p}>
                <span className="bar-label">{p}</span>
                <div className="bar-track">
                  <motion.div className="bar-fill" initial={{ width: 0 }} animate={{ width: `${(n / maxPlatform) * 100}%` }}
                    transition={{ delay: 0.32 + i * 0.06, type: 'spring', stiffness: 120, damping: 18 }} />
                </div>
                <span className="bar-val">{n}</span>
              </div>
            ))}
          </motion.div>
        )}

        {topCompanions.length > 0 && (
          <motion.div className="panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
            <h3><IconHeart size={18} /> Watched with</h3>
            {topCompanions.map(([c, n], i) => (
              <div className="bar-row" key={c}>
                <span className="bar-label">{c}</span>
                <div className="bar-track">
                  <motion.div className="bar-fill" initial={{ width: 0 }} animate={{ width: `${(n / maxCompanion) * 100}%`, background: 'linear-gradient(90deg,#ff8a3d,#ff4d6d)' }}
                    transition={{ delay: 0.34 + i * 0.06, type: 'spring', stiffness: 120, damping: 18 }} />
                </div>
                <span className="bar-val">{n}</span>
              </div>
            ))}
          </motion.div>
        )}

        <motion.div className="panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
          <h3><IconFilm size={18} /> Films vs TV</h3>
          <div style={{ display: 'flex', gap: 26, alignItems: 'center', paddingTop: 6 }}>
            <Donut films={films} shows={shows} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 18 }}>
                <span style={{ width: 12, height: 12, borderRadius: 4, background: 'var(--gold)', alignSelf: 'center' }} />
                <span style={{ fontWeight: 700, fontSize: 26 }}>{films}</span>
                <span className="dim">Films</span>
                <span style={{ marginLeft: 'auto', color: 'var(--gold)', fontWeight: 700 }}>{Math.round((films / (films + shows || 1)) * 100)}%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ width: 12, height: 12, borderRadius: 4, background: 'var(--rose)', alignSelf: 'center' }} />
                <span style={{ fontWeight: 700, fontSize: 26 }}>{shows}</span>
                <span className="dim">TV series</span>
                <span style={{ marginLeft: 'auto', color: 'var(--rose)', fontWeight: 700 }}>{Math.round((shows / (films + shows || 1)) * 100)}%</span>
              </div>
            </div>
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
