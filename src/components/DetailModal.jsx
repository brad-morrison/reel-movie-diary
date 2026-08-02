import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Rating from './Rating.jsx'
import AnimatedNumber from './AnimatedNumber.jsx'
import TagPicker from './TagPicker.jsx'
import Top20Button from './Top20Button.jsx'
import { useEscape } from '../lib/useEscape.js'
import {
  IconX, IconCheck, IconCalendar, IconTrash, IconStar,
} from '../lib/icons.jsx'

function fmtDate(d) {
  if (!d) return 'Undated'
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch {
    return d
  }
}

export default function DetailModal({ entry, platforms = [], people = [], top20Full = false, onAddPlatform, onAddPerson, onToggleTop20, onClose, onUpdate, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false)
  useEscape(onClose)

  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal"
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="detail">
          <div className="detail-backdrop">
            {entry.backdrop || entry.poster ? (
              <img src={entry.backdrop || entry.poster} alt="" />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(160deg,#1a1a26,#101019)' }} />
            )}
            <div className="veil" />
            <button className="icon-btn close-x" onClick={onClose} style={{ position: 'absolute', top: 16, right: 16 }}>
              <IconX size={18} />
            </button>
          </div>

          <div className="detail-body">
            <div className="detail-top">
              {entry.poster ? (
                <img className="detail-poster" src={entry.poster} alt={entry.title} />
              ) : (
                <div className="detail-poster poster-fallback" style={{ position: 'relative' }}>
                  <div className="pf-title">{entry.title}</div>
                </div>
              )}
              <div className="detail-headings">
                <h2>{entry.title}</h2>
                <div className="sub">
                  <span>{entry.year}</span>
                  <span className="genre-tag" style={{ padding: '4px 10px' }}>
                    {entry.type === 'tv' ? 'TV Series' : 'Film'}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconCalendar size={14} /> {fmtDate(entry.watchedDate)}
                  </span>
                  {entry.firstTime && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--gold)' }}>
                      <IconCheck size={14} /> First time
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h4>Your rating</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                <Rating big value={entry.rating} onChange={(r) => onUpdate(entry.id, { rating: r, ...(r !== 5 ? { top20: false } : {}) })} />
                <span style={{ fontFamily: 'Fraunces, serif', fontSize: 30, color: 'var(--gold)' }}>
                  {entry.rating ? <AnimatedNumber value={entry.rating} decimals={1} trim duration={0.28} /> : '—'}
                </span>
                <button className={`chip ${entry.firstTime ? 'on' : ''}`} onClick={() => onUpdate(entry.id, { firstTime: !entry.firstTime })}>
                  <IconCheck size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} /> First time
                </button>
              </div>
              <AnimatePresence>
                {entry.rating === 5 && (
                  <motion.div layout style={{ marginTop: 16 }}>
                    <Top20Button active={!!entry.top20} full={top20Full} onToggle={() => onToggleTop20(entry)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="detail-section">
              <h4>Where did you watch it?</h4>
              <TagPicker
                options={platforms}
                value={entry.platform || ''}
                onChange={(v) => onUpdate(entry.id, { platform: v })}
                onAddOption={onAddPlatform}
                placeholder="e.g. Netflix"
              />
            </div>

            <div className="detail-section">
              <h4>Who did you watch it with?</h4>
              <TagPicker
                multi
                accent="rose"
                options={people}
                value={entry.companions || []}
                onChange={(v) => onUpdate(entry.id, { companions: v })}
                onAddOption={onAddPerson}
                placeholder="Add a name"
              />
            </div>

            {entry.overview && (
              <div className="detail-section">
                <h4>Overview</h4>
                <p>{entry.overview}</p>
              </div>
            )}

            {entry.genres?.length > 0 && (
              <div className="detail-section">
                <h4>Genres</h4>
                <div className="genre-tags">
                  {entry.genres.map((g) => (
                    <span key={g} className="genre-tag">{g}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="detail-actions">
              {confirmDel ? (
                <>
                  <button className="btn btn-ghost" onClick={() => setConfirmDel(false)} style={{ flex: 1, justifyContent: 'center' }}>
                    Cancel
                  </button>
                  <button
                    className="btn"
                    onClick={() => onDelete(entry.id)}
                    style={{ flex: 1, justifyContent: 'center', background: 'var(--rose)', color: '#fff' }}
                  >
                    <IconTrash size={16} /> Delete forever
                  </button>
                </>
              ) : (
                <button className="btn btn-ghost" onClick={() => setConfirmDel(true)} style={{ color: 'var(--rose)' }}>
                  <IconTrash size={16} /> Remove from diary
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
