import { motion } from 'framer-motion'
import AnimatedNumber from '../AnimatedNumber.jsx'
import { IconBookmark, IconChart, IconCheck, IconCrown, IconFilm, IconStar } from '../../lib/icons.jsx'
import { activityMonths, watchesInYear } from '../../lib/profile.js'

const percent = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0)

function Tile({ icon, value, decimals = 0, suffix = '', label, delay }) {
  return (
    <motion.div className="pf-tile" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
      <span className="pf-tile-icon">{icon}</span>
      <strong>{typeof value === 'number' ? <AnimatedNumber value={value} decimals={decimals} /> : value}{suffix}</strong>
      <span className="pf-tile-label">{label}</span>
    </motion.div>
  )
}

function Donut({ films, shows }) {
  const total = films + shows || 1
  const radius = 46
  const circumference = 2 * Math.PI * radius
  return (
    <svg className="pf-donut" width="118" height="118" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--rose)" strokeWidth="15" opacity=".85" />
      <motion.circle
        cx="60" cy="60" r={radius} fill="none" stroke="var(--gold)" strokeWidth="15" strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference * (1 - films / total) }}
        transition={{ delay: 0.35, duration: 1, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  )
}

export default function ProfileInsights({ stats, owner }) {
  const watches = stats?.watches ?? 0
  const films = stats?.films ?? 0
  const shows = stats?.shows ?? 0
  const genres = stats?.topGenres || []
  const spread = stats?.ratingSpread || []
  const activity = stats?.activity || {}
  const months = activityMonths(activity, 12)
  const busiest = Math.max(1, ...months.map((month) => month.count))
  const thisYear = new Date().getFullYear()
  const maxGenre = genres[0]?.count || 1
  const maxSpread = Math.max(1, ...spread)
  const hasActivity = months.some((month) => month.count > 0)
  const hasSpread = spread.some((count) => count > 0)

  return (
    <>
      <div className="pf-tiles">
        <Tile icon={<IconFilm size={16} />} value={watches} label="Watches logged" delay={0} />
        <Tile icon={<IconBookmark size={16} />} value={stats?.uniqueTitles ?? 0} label="Unique titles" delay={0.05} />
        <Tile icon={<IconStar size={16} />} value={stats?.averageRating ?? '—'} decimals={1} label="Average rating" delay={0.1} />
        <Tile icon={<IconChart size={16} />} value={watchesInYear(activity, thisYear)} label={`Watched in ${thisYear}`} delay={0.15} />
        <Tile icon={<IconCheck size={16} />} value={percent(stats?.firstTime ?? 0, watches)} suffix="%" label="First-time watches" delay={0.2} />
        {owner && <Tile icon={<IconCrown size={16} />} value={stats?.watchlistCount ?? 0} label="Saved to watch" delay={0.25} />}
      </div>

      {watches > 0 && (
        <div className="pf-insight-grid">
          <section className="pf-panel pf-panel-wide">
            <div className="pf-panel-head"><div><span>Rhythm</span><h2>Last 12 months</h2></div><IconChart size={19} /></div>
            {hasActivity ? (
              <div className="pf-activity">
                {months.map((month, index) => (
                  <div className="pf-activity-col" key={month.key} title={`${month.count} in ${month.full}`}>
                    <div className="pf-activity-track">
                      <motion.span
                        className="pf-activity-bar"
                        initial={{ height: 0 }}
                        animate={{ height: month.count ? `${Math.max(6, (month.count / busiest) * 100)}%` : 0 }}
                        transition={{ delay: 0.15 + index * 0.035, type: 'spring', stiffness: 130, damping: 17 }}
                      >
                        {month.count > 0 && <i>{month.count}</i>}
                      </motion.span>
                    </div>
                    <small>{month.label}</small>
                  </div>
                ))}
              </div>
            ) : <p className="pf-empty">No watches logged in the past year.</p>}
          </section>

          <section className="pf-panel">
            <div className="pf-panel-head"><div><span>Taste</span><h2>Top genres</h2></div><IconFilm size={19} /></div>
            {genres.length ? (
              <div className="pf-genres">
                {genres.slice(0, 6).map((genre, index) => (
                  <div className="pf-genre" key={genre.name}>
                    <span>{genre.name}</span>
                    <div className="pf-genre-track">
                      <motion.i
                        initial={{ width: 0 }}
                        animate={{ width: `${(genre.count / maxGenre) * 100}%` }}
                        transition={{ delay: 0.2 + index * 0.06, type: 'spring', stiffness: 120, damping: 18 }}
                      />
                    </div>
                    <em>{genre.count}</em>
                  </div>
                ))}
              </div>
            ) : <p className="pf-empty">Genres appear once entries carry TMDB data.</p>}
          </section>

          {films + shows > 0 && (
          <section className="pf-panel pf-panel-split">
            <div className="pf-panel-head"><div><span>Diet</span><h2>Films vs TV</h2></div></div>
            <div className="pf-split">
              <Donut films={films} shows={shows} />
              <div className="pf-split-legend">
                <div className="pf-split-row pf-split-films"><i /><strong>{films}</strong><span>Films</span><em>{percent(films, films + shows)}%</em></div>
                <div className="pf-split-row pf-split-shows"><i /><strong>{shows}</strong><span>TV series</span><em>{percent(shows, films + shows)}%</em></div>
              </div>
            </div>
          </section>
          )}

          {hasSpread && (
            <section className="pf-panel pf-panel-spread">
              <div className="pf-panel-head"><div><span>Standards</span><h2>How they rate</h2></div><IconStar size={19} /></div>
              <div className="pf-spread">
                {spread.map((count, index) => (
                  <div className="pf-spread-col" key={index} title={`${count} rated ${index + 1}`}>
                    <div className="pf-spread-track">
                      <motion.span
                        initial={{ height: 0 }}
                        animate={{ height: count ? `${Math.max(6, (count / maxSpread) * 100)}%` : 0 }}
                        transition={{ delay: 0.2 + index * 0.035, type: 'spring', stiffness: 130, damping: 17 }}
                      />
                    </div>
                    <small>{index + 1}</small>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  )
}
