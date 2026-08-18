import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchTitleDetails } from '../lib/tmdb.js'
import { useEscape } from '../lib/useEscape.js'
import { IconBookmark, IconImage, IconStar, IconX } from '../lib/icons.jsx'

export default function WatchlistDetailModal({ item, listName, tmdbKey, nestedOpen = false, onChangeArtwork, onClose, onUpdate }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  useEscape(() => { if (!nestedOpen) onClose() })

  useEffect(() => {
    if (!tmdbKey || item.tmdbId == null || (item.cast?.length && item.directors)) return
    let cancelled = false
    setLoading(true)
    fetchTitleDetails(item, tmdbKey)
      .then((details) => { if (!cancelled && details) onUpdate(details) })
      .catch(() => { if (!cancelled) setError('Could not load the full details right now.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [item.id, item.tmdbId, tmdbKey])

  const date = item.releaseDate
    ? new Date(`${item.releaseDate}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
    : item.year

  return (
    <motion.div className="overlay fullscreen-mobile-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal watchlist-detail-modal" initial={{ opacity: 0, y: 30, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 15, scale: .98 }} onClick={(event) => event.stopPropagation()}>
        <button className="icon-btn modal-sticky-close" onClick={onClose} aria-label="Close"><IconX size={18} /></button>
        <div className="watchlist-detail-backdrop">
          {(item.backdrop || item.poster) && <img src={item.backdrop || item.poster} alt="" />}
          <div className="watchlist-detail-veil" />
        </div>
        <div className={`watchlist-detail-body ${item.poster ? '' : 'no-poster'}`}>
          {item.poster && <img className="watchlist-detail-poster" src={item.poster} alt={`${item.title} poster`} />}
          <div className="watchlist-detail-main">
            <span className="watchlist-eyebrow"><IconBookmark size={14} fill="currentColor" /> {listName}</span>
            <h2>{item.title}</h2>
            <div className="watchlist-detail-meta">
              <span>{item.type === 'tv' ? 'TV Series' : 'Film'}</span>
              {date && <span>{date}</span>}
              {item.runtime && <span>{item.runtime} min</span>}
              {item.voteAverage > 0 && <span className="watchlist-detail-score"><IconStar size={13} /> {Number(item.voteAverage).toFixed(1)}</span>}
            </div>
            {item.genres?.length > 0 && <div className="genre-tags">{item.genres.map((genre) => <span className="genre-tag" key={genre}>{genre}</span>)}</div>}
            <button className="btn btn-ghost watchlist-change-art" onClick={() => onChangeArtwork(item)} title="Choose or upload a different poster"><IconImage size={16} /> Change poster</button>

            <section className="watchlist-detail-section">
              <h3>Synopsis</h3>
              <p>{item.overview || (loading ? 'Loading synopsis…' : 'No synopsis is available for this title yet.')}</p>
            </section>

            {(item.directors?.length > 0 || loading) && <section className="watchlist-detail-section"><h3>{item.type === 'tv' ? 'Created by' : 'Directed by'}</h3><p>{item.directors?.join(', ') || 'Loading…'}</p></section>}

            {(item.cast?.length > 0 || loading) && (
              <section className="watchlist-detail-section">
                <h3>Cast</h3>
                {loading && !item.cast?.length ? <p>Loading cast…</p> : <div className="watchlist-cast-grid">{item.cast.map((person) => <div className="watchlist-cast-person" key={person.id || person.name}>{person.profile ? <img src={person.profile} alt="" /> : <span className="watchlist-cast-fallback">{person.name[0]}</span>}<div><strong>{person.name}</strong>{person.character && <small>{person.character}</small>}</div></div>)}</div>}
              </section>
            )}
            {error && <p className="watchlist-detail-error">{error}</p>}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
