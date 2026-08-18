import { useState } from 'react'
import { motion } from 'framer-motion'
import { IconBookmark, IconCheck, IconX } from '../lib/icons.jsx'
import { useEscape } from '../lib/useEscape.js'

export default function WatchlistCleanupModal({ title, matches, onRemove, onKeep }) {
  useEscape(onKeep)
  const [selected, setSelected] = useState(() => new Set(matches.map((match) => match.listId)))

  function toggle(listId) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(listId)) next.delete(listId)
      else next.add(listId)
      return next
    })
  }

  const selectedMatches = matches.filter((match) => selected.has(match.listId))

  return (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onKeep}>
      <motion.div className="modal watchlist-cleanup-modal" initial={{ opacity: 0, y: 28, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: .98 }} onClick={(event) => event.stopPropagation()}>
        <button className="icon-btn modal-sticky-close" onClick={onKeep} aria-label="Close"><IconX size={18} /></button>
        <div className="modal-pad">
          <div className="modal-head">
            <div className="watchlist-cleanup-icon"><IconCheck size={24} /></div>
          </div>
          <span className="watchlist-eyebrow"><IconBookmark size={14} /> Watch list check</span>
          <h2>You watched “{title}”</h2>
          <p className="watchlist-cleanup-copy">Choose which {matches.length === 1 ? 'list' : 'lists'} to remove it from. Unchecked lists will keep the movie.</p>
          <div className="watchlist-cleanup-lists">
            {matches.map((match) => (
              <button key={match.listId} type="button" className={selected.has(match.listId) ? 'selected' : ''} onClick={() => toggle(match.listId)} aria-pressed={selected.has(match.listId)}>
                <span className="watchlist-cleanup-check">{selected.has(match.listId) && <IconCheck size={13} />}</span>
                <IconBookmark size={14} fill={selected.has(match.listId) ? 'currentColor' : 'none'} />
                <span>{match.listName}</span>
              </button>
            ))}
          </div>
          <div className="modal-foot">
            <button className="btn btn-ghost" onClick={onKeep}>Keep on all lists</button>
            <button className="btn btn-primary" disabled={!selectedMatches.length} onClick={() => onRemove(selectedMatches)}>
              Remove from {selectedMatches.length || 0} {selectedMatches.length === 1 ? 'list' : 'lists'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
