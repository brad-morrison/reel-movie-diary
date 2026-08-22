import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { IconCheck, IconFilm, IconImage, IconSearch, IconSparkle, IconX } from '../../lib/icons.jsx'
import { useEscape } from '../../lib/useEscape.js'
import { heroCandidates } from '../../lib/profile.js'

const PAGE_SIZE = 18

export default function HeroCoverModal({ entries = [], pinnedId = '', onClose, onSelect }) {
  const searchRef = useRef(null)
  const [term, setTerm] = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)
  useEscape(onClose)

  const candidates = useMemo(() => heroCandidates(entries), [entries])
  const matches = useMemo(() => {
    const needle = term.trim().toLowerCase()
    if (!needle) return candidates
    return candidates.filter((entry) => `${entry.title || ''} ${entry.year || ''}`.toLowerCase().includes(needle))
  }, [candidates, term])

  return (
    <motion.div className="overlay pf-cover-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.section
        className="modal pf-cover-modal"
        initial={{ opacity: 0, y: 24, scale: .98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: .98 }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="pf-cover-head">
          <div>
            <span><IconImage size={13} /> Profile cover</span>
            <h2>Choose your backdrop</h2>
            <p>Any watch in your diary can front your profile.</p>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close"><IconX size={18} /></button>
        </header>

        <div className="pf-cover-search">
          <IconSearch size={16} />
          <input
            ref={searchRef}
            value={term}
            onChange={(event) => { setTerm(event.target.value); setVisible(PAGE_SIZE) }}
            placeholder="Search your diary"
            aria-label="Search your diary"
            autoFocus
          />
          {term && <button type="button" onClick={() => { setTerm(''); setVisible(PAGE_SIZE) }} aria-label="Clear search"><IconX size={14} /></button>}
        </div>

        <div className="pf-cover-body">
          {candidates.length === 0 ? (
            <p className="pf-cover-empty">Log a watch with artwork and it can front your profile.</p>
          ) : (
            <>
              <div className="pf-cover-grid">
                {!term && (
                  <button className={`pf-cover-tile pf-cover-auto ${pinnedId ? '' : 'current'}`} type="button" onClick={() => onSelect(null)}>
                    <span className="pf-cover-art"><IconSparkle size={22} /></span>
                    <strong>Automatic</strong>
                    <small>Follows your top favourite</small>
                    {!pinnedId && <i className="pf-cover-mark"><IconCheck size={13} /></i>}
                  </button>
                )}
                {matches.slice(0, visible).map((entry) => (
                  <button
                    className={`pf-cover-tile ${entry.id === pinnedId ? 'current' : ''}`}
                    type="button"
                    key={entry.id}
                    onClick={() => onSelect(entry)}
                    aria-label={`Use ${entry.title} as your cover`}
                  >
                    <span className="pf-cover-art">
                      {entry.backdrop || entry.poster
                        ? <img src={entry.backdrop || entry.poster} alt="" loading="lazy" referrerPolicy="no-referrer" />
                        : <IconFilm size={20} />}
                    </span>
                    <strong>{entry.title}</strong>
                    <small>{entry.year || (entry.type === 'tv' ? 'TV' : 'Film')}{entry.backdrop ? '' : ' · poster only'}</small>
                    {entry.id === pinnedId && <i className="pf-cover-mark"><IconCheck size={13} /></i>}
                  </button>
                ))}
              </div>
              {visible < matches.length && (
                <button className="btn btn-ghost pf-cover-more" type="button" onClick={() => setVisible((count) => count + PAGE_SIZE)}>
                  Show more · {matches.length - visible} left
                </button>
              )}
              {matches.length === 0 && <p className="pf-cover-empty">Nothing in your diary matches “{term}”.</p>}
            </>
          )}
        </div>
      </motion.section>
    </motion.div>
  )
}
