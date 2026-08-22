import { motion } from 'framer-motion'
import AnimatedNumber from '../AnimatedNumber.jsx'
import { IconChart, IconFilm, IconRepeat, IconStar } from '../../lib/icons.jsx'
import { activityMonths, watchesInYear } from '../../lib/profile.js'

const percent = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0)

function StatCard({ icon, eyebrow, value, decimals = 0, unit, badge, caption, delay, children }) {
  return (
    <motion.div className="pf-stat" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
      <span className="pf-stat-eyebrow">{icon} {eyebrow}</span>
      <span className="pf-stat-figure">
        <strong>{typeof value === 'number' ? <AnimatedNumber value={value} decimals={decimals} /> : value}{unit && <em>{unit}</em>}</strong>
        {badge}
      </span>
      {children}
      {caption && <small>{caption}</small>}
    </motion.div>
  )
}

// Ten segments echo the ten-point scale; the segment the average lands inside
// is drawn part-lit so 7.5 reads differently from 7.0.
function RatingScale({ average }) {
  return (
    <div className="pf-scale" aria-hidden="true">
      {Array.from({ length: 10 }, (_, index) => {
        const fill = Math.max(0, Math.min(1, average - index))
        return (
          <span key={index}>
            <motion.i
              style={{ background: `color-mix(in srgb, var(--rose) ${index * 11}%, var(--gold))` }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: fill }}
              transition={{ delay: 0.25 + index * 0.045, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </span>
        )
      })}
    </div>
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

export default function ProfileInsights({ stats }) {
  const watches = stats?.watches ?? 0
  const films = stats?.films ?? 0
  const shows = stats?.shows ?? 0
  const genres = stats?.topGenres || []
  const spread = stats?.ratingSpread || []
  const activity = stats?.activity || {}
  const months = activityMonths(activity, 12)
  const busiest = Math.max(1, ...months.map((month) => month.count))
  const now = new Date()
  const thisYear = now.getFullYear()
  const yearCount = watchesInYear(activity, thisYear)
  // Compare like for like: the same stretch of last year, not all twelve months.
  const lastYearToDate = watchesInYear(activity, thisYear - 1, now.getMonth() + 1)
  const comparable = lastYearToDate > 0
  const delta = yearCount - lastYearToDate
  const paceMax = Math.max(1, yearCount, lastYearToDate)
  const average = stats?.averageRating ?? null
  const ratedCount = stats?.rated ?? 0
  const topScores = (spread[8] || 0) + (spread[9] || 0)
  // Every viewing past the first of a given title is a return to it.
  const rewatches = Math.max(0, watches - (stats?.uniqueTitles ?? watches))
  const maxGenre = genres[0]?.count || 1
  const maxSpread = Math.max(1, ...spread)
  const hasActivity = months.some((month) => month.count > 0)
  const hasSpread = spread.some((count) => count > 0)

  return (
    <>
      <div className="pf-stats">
        <StatCard
          icon={<IconStar size={13} />}
          eyebrow="Average rating"
          value={average ?? '—'}
          decimals={1}
          unit={average == null ? '' : '/10'}
          caption={topScores ? `${topScores.toLocaleString()} scored 9 or higher` : ratedCount ? `across ${ratedCount.toLocaleString()} rated ${ratedCount === 1 ? 'watch' : 'watches'}` : 'Nothing rated yet'}
          delay={0}
        >
          <RatingScale average={average || 0} />
        </StatCard>

        <StatCard
          icon={<IconChart size={13} />}
          eyebrow={`Watched in ${thisYear}`}
          value={yearCount}
          badge={comparable && delta !== 0 && <span className={`pf-delta ${delta > 0 ? 'up' : 'down'}`}>{delta > 0 ? '▲' : '▼'} {Math.abs(delta)}</span>}
          caption={comparable ? `vs ${lastYearToDate} by this point in ${thisYear - 1}` : 'First year on record'}
          delay={0.07}
        >
          {comparable && (
            <div className="pf-versus" aria-hidden="true">
              <div><i>{thisYear}</i><span><motion.b initial={{ width: 0 }} animate={{ width: `${(yearCount / paceMax) * 100}%` }} transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }} /></span></div>
              <div className="pf-versus-past"><i>{thisYear - 1}</i><span><motion.b initial={{ width: 0 }} animate={{ width: `${(lastYearToDate / paceMax) * 100}%` }} transition={{ delay: 0.4, duration: 0.7, ease: [0.22, 1, 0.36, 1] }} /></span></div>
            </div>
          )}
        </StatCard>

        <StatCard
          icon={<IconRepeat size={13} />}
          eyebrow="Rewatches"
          value={rewatches}
          caption={watches ? `${percent(rewatches, watches)}% of everything logged was a return visit` : 'Nothing logged yet'}
          delay={0.14}
        >
          <div className="pf-proportion" aria-hidden="true">
            <motion.span initial={{ width: 0 }} animate={{ width: `${Math.max(rewatches ? 3 : 0, percent(rewatches, watches))}%` }} transition={{ delay: 0.35, duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
          </div>
        </StatCard>
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
