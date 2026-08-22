import { motion } from 'framer-motion'
import { IconCrown, IconFilm, IconStar } from '../../lib/icons.jsx'
import { formatWatchDate } from '../../lib/profile.js'

function Artwork({ entry }) {
  return entry.poster
    ? <img src={entry.poster} alt="" loading="lazy" referrerPolicy="no-referrer" />
    : <span className="pf-poster-fallback"><IconFilm size={20} /><em>{entry.title}</em></span>
}

// Both shelves render as buttons only when there is somewhere to go; a visitor
// browsing /@someone has no diary detail to open, so the tiles stay inert
// rather than looking like disabled controls.
function Tile({ entry, onOpen, className, children, index }) {
  const interactive = !!onOpen
  const Element = interactive ? motion.button : motion.div
  return (
    <Element
      className={className}
      type={interactive ? 'button' : undefined}
      onClick={interactive ? () => onOpen(entry) : undefined}
      aria-label={interactive ? `Open ${entry.title}` : undefined}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.35), duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Element>
  )
}

export function Top20Shelf({ entries = [], onOpen, owner }) {
  return (
    <section className="pf-section">
      <div className="pf-section-head">
        <div><span>Hall of fame</span><h2>Top 20</h2></div>
        <IconCrown size={20} />
      </div>
      {entries.length ? (
        <div className="pf-shelf">
          {entries.map((entry, index) => (
            <Tile key={entry.id || `${entry.title}-${index}`} entry={entry} onOpen={onOpen} index={index} className="pf-shelf-item">
              <div className="pf-shelf-art">
                <Artwork entry={entry} />
                <i className="pf-rank">{entry.top20Rank || index + 1}</i>
                {Number(entry.rating) > 0 && <span className="pf-score"><IconStar size={11} /> {entry.rating}</span>}
              </div>
              <strong>{entry.title}</strong>
              <small>{entry.year || (entry.type === 'tv' ? 'TV' : 'Film')}</small>
            </Tile>
          ))}
        </div>
      ) : (
        <p className="pf-empty">
          {owner ? 'Crown favourites from your diary and they’ll take pride of place here.' : 'No favourites crowned yet.'}
        </p>
      )}
    </section>
  )
}

export function RecentGrid({ entries = [], onOpen, owner }) {
  return (
    <section className="pf-section">
      <div className="pf-section-head">
        <div><span>Fresh from the credits</span><h2>Recently watched</h2></div>
        <IconFilm size={20} />
      </div>
      {entries.length ? (
        <div className="pf-recent-grid">
          {entries.map((entry, index) => (
            <Tile key={entry.id || `${entry.title}-${index}`} entry={entry} onOpen={onOpen} index={index} className="pf-recent-item">
              <div className="pf-recent-art">
                <Artwork entry={entry} />
                {Number(entry.rating) > 0 && <span className="pf-score"><IconStar size={11} /> {entry.rating}</span>}
              </div>
              <strong>{entry.title}</strong>
              <small>{formatWatchDate(entry.watchedDate) || (entry.type === 'tv' ? 'TV' : 'Film')}</small>
            </Tile>
          ))}
        </div>
      ) : (
        <p className="pf-empty">{owner ? 'Your latest watches will appear here.' : 'Nothing logged yet.'}</p>
      )}
    </section>
  )
}
