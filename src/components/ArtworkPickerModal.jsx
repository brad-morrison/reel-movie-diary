import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchPosterOptions } from '../lib/tmdb.js'
import { IconCheck, IconImage, IconX } from '../lib/icons.jsx'
import { useEscape } from '../lib/useEscape.js'

export default function ArtworkPickerModal({ entry, tmdbKey, onClose, onSelect }) {
  const [posters, setPosters] = useState([])
  const [identity, setIdentity] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEscape(onClose)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchPosterOptions(entry, tmdbKey)
      .then((result) => {
        if (cancelled) return
        setPosters(result.posters)
        setIdentity(result.identity)
      })
      .catch(() => { if (!cancelled) setError('Could not load alternative artwork. Try again shortly.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [entry.id, entry.tmdbId, tmdbKey])

  return (
    <motion.div className="overlay artwork-picker-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal artwork-picker-modal" initial={{ opacity: 0, y: 30, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 15, scale: .98 }} onClick={(event) => event.stopPropagation()}>
        <button className="icon-btn modal-sticky-close" onClick={onClose} aria-label="Close"><IconX size={18} /></button>
        <div className="artwork-picker-head">
          <div><span className="watchlist-eyebrow"><IconImage size={14} /> Artwork</span><h2>Choose a poster</h2><p>Alternative artwork for <strong>{entry.title}</strong>, provided by TMDB.</p></div>
        </div>
        {loading && <div className="artwork-picker-loading"><IconImage size={34} /><span>Loading the poster gallery…</span><i /></div>}
        {!loading && error && <div className="empty artwork-picker-empty"><div className="empty-mark"><IconImage size={44} /></div><h3>Gallery unavailable</h3><p>{error}</p></div>}
        {!loading && !error && posters.length === 0 && <div className="empty artwork-picker-empty"><div className="empty-mark"><IconImage size={44} /></div><h3>No alternatives found</h3><p>TMDB doesn’t currently have another poster for this title.</p></div>}
        {!loading && posters.length > 0 && (
          <div className="artwork-picker-grid">
            {posters.map((poster, index) => {
              const current = poster.full === entry.poster || poster.preview === entry.poster
              return <button key={poster.path} className={current ? 'current' : ''} onClick={() => onSelect({ ...identity, poster: poster.full })} aria-label={`${current ? 'Current poster' : 'Choose poster'} ${index + 1}`}><img src={poster.preview} alt="" loading="lazy" />{current && <span><IconCheck size={13} /> Current</span>}{poster.language && <small>{poster.language.toUpperCase()}</small>}</button>
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
