import { motion } from 'framer-motion'
import { IconChevron, IconCrown, IconStar } from '../lib/icons.jsx'
import { useEscape } from '../lib/useEscape.js'

// Shown when the Top 20 is full and a new 5-star title wants in.
// The candidate floats up; the reigning 20 drift in from the right to be picked off.
export default function Top20SwapModal({ candidate, top20, onReplace, onCancel }) {
  useEscape(onCancel)
  if (!candidate) return null

  return (
    <motion.div
      className="overlay swap-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="swap-panel"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="swap-back" onClick={onCancel}>
          <IconChevron size={16} style={{ transform: 'rotate(90deg)' }} /> Never mind
        </button>

        {/* Candidate floats up */}
        <motion.div
          className="swap-candidate"
          initial={{ opacity: 0, y: 90, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 22, delay: 0.05 }}
        >
          <div className="swap-cand-poster">
            {candidate.poster ? (
              <img src={candidate.poster} alt={candidate.title} />
            ) : (
              <div className="poster-fallback" style={{ position: 'relative' }}>
                <div className="pf-title">{candidate.title}</div>
              </div>
            )}
            <span className="swap-cand-crown"><IconCrown size={18} /></span>
          </div>
          <div className="swap-cand-copy">
            <div className="swap-eyebrow"><IconStar size={13} /> A new five-star favourite</div>
            <h2>Make room for <em>{candidate.title}</em>?</h2>
            <p>Your Top 20 is full. Pick the title it should replace — or step back and leave things as they are.</p>
          </div>
        </motion.div>

        {/* The reigning 20 drift in from the right */}
        <div className="swap-grid">
          {top20.map((e, i) => (
            <motion.button
              key={e.id}
              className="swap-tile"
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.035, type: 'spring', stiffness: 260, damping: 24 }}
              whileHover={{ scale: 1.06, y: -4 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onReplace(e.id)}
            >
              {e.poster ? (
                <img src={e.poster} alt={e.title} />
              ) : (
                <div className="poster-fallback" style={{ position: 'relative' }}>
                  <div className="pf-title" style={{ fontSize: 13 }}>{e.title}</div>
                </div>
              )}
              <div className="swap-tile-veil" />
              <span className="swap-tile-replace">Replace</span>
              <span className="swap-tile-title">{e.title}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
