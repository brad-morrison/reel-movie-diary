import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { IconStar } from '../lib/icons.jsx'

const RATING_MIN = 1

const clampRating = (rating) => Math.max(0, Math.min(10, Math.round(Number(rating) * 10) / 10))

// Anything the slider produces is a real rating; 0 stays reachable only as "never rated".
const clampInput = (rating) => Math.max(RATING_MIN, clampRating(rating))

const formatRating = (rating) => Number.isInteger(rating) ? String(rating) : rating.toFixed(1)

const ratingLabel = (rating) => {
  if (!rating) return ''
  if (rating < 2) return 'Terrible'
  if (rating < 3.5) return 'Bad'
  if (rating < 5) return 'Poor'
  if (rating < 6) return 'Average'
  if (rating < 7) return 'Good'
  if (rating < 8) return 'Very good'
  if (rating < 9) return 'Great'
  if (rating < 9.7) return 'Amazing'
  return 'Masterpiece'
}

// Anchors, not bands — the palette is interpolated between them so dragging never snaps.
const ratingStops = [
  [1, '#66666f', '#777780'],
  [3, '#78645f', '#9a7468'],
  [4.5, '#8d7051', '#b58a57'],
  [5.5, '#a47d43', '#c99b4d'],
  [6.5, '#ba8740', '#e0aa49'],
  [7.5, '#d26f55', '#edb447'],
  [8.5, '#d75979', '#f0b444'],
  [9.4, '#a861d8', '#f2b843'],
  [10, '#7b5cff', '#f5b942'],
]

const mix = (from, to, t) => `color-mix(in oklab, ${to} ${(t * 100).toFixed(2)}%, ${from})`

const ratingPalette = (rating) => {
  const upper = ratingStops.findIndex(([at]) => rating <= at)
  if (upper <= 0) {
    const [, start, end] = ratingStops[upper === 0 ? 0 : ratingStops.length - 1]
    return [start, end]
  }
  const [fromAt, fromStart, fromEnd] = ratingStops[upper - 1]
  const [toAt, toStart, toEnd] = ratingStops[upper]
  const t = (rating - fromAt) / (toAt - fromAt)
  return [mix(fromStart, toStart, t), mix(fromEnd, toEnd, t)]
}

export default function Rating({ value = 0, onChange, big = false, readOnly = false, alwaysOpen = false }) {
  const rating = clampRating(value)
  const [editing, setEditing] = useState(rating < RATING_MIN)
  const setRating = (next) => onChange?.(clampInput(next))
  const [trackStart, trackEnd] = ratingPalette(rating)
  const rated = rating >= RATING_MIN
  const pct = rated ? ((rating - RATING_MIN) / (10 - RATING_MIN)) * 100 : 0
  // Glow fades in from 8 upwards so a masterpiece is the peak of a ramp, not a sudden switch.
  const glow = Math.max(0, Math.min(1, (rating - 8) / 2))

  const score = (
    <div className="rating-score" aria-live="polite">
      <div className="rating-score-value">
        {rating > 0 && <IconStar className="rating-score-star" size={25} fill="currentColor" aria-hidden="true" />}
        <strong>{rating ? formatRating(rating) : '—'}</strong>
        <span>{rating ? '/ 10' : 'Not rated'}</span>
      </div>
      {rating > 0 && <em className="rating-score-label">{ratingLabel(rating)}</em>}
    </div>
  )

  return (
    <motion.div
      layout
      className={`rating-control ${big ? 'rating-big' : ''} ${readOnly ? 'is-readonly' : ''} ${rated ? '' : 'is-unrated'} ${rating >= 9.7 ? 'is-masterpiece' : ''}`}
      style={{ '--rating-pct': pct, '--rating-start': trackStart, '--rating-end': trackEnd, '--rating-glow': glow }}
      transition={{ layout: { duration: .28, ease: [0.22, 1, 0.36, 1] } }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {rating >= RATING_MIN && !editing && !alwaysOpen ? (
          <motion.div key="summary" className="rating-state" initial={{ opacity: 0, y: -5, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: .985 }} transition={{ duration: .2, ease: 'easeOut' }}>
            <button type="button" className="rating-summary" onClick={() => !readOnly && setEditing(true)} disabled={readOnly} aria-label={`Rated ${formatRating(rating)} out of 10. Edit rating`}>
              {score}
            </button>
          </motion.div>
        ) : (
          <motion.div key="editor" className="rating-state" initial={{ opacity: 0, y: 6, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: .985 }} transition={{ duration: .22, ease: 'easeOut' }}>
            {score}
            <div className="rating-inputs">
              {!readOnly && <button type="button" className="rating-step" onClick={() => { setRating(rating - 0.1); if (!alwaysOpen) setEditing(false) }} disabled={rating <= RATING_MIN} aria-label="Decrease rating by 0.1">−</button>}
              <div className="rating-slider-wrap">
                <span className="rating-glow" aria-hidden="true" />
                <span className="rating-track" aria-hidden="true"><span className="rating-track-fill" /></span>
                <input className="rating-slider" type="range" min={RATING_MIN} max="10" step="0.1" value={Math.max(RATING_MIN, rating)} disabled={readOnly}
                  onChange={(event) => setRating(event.target.value)} onPointerUp={() => !alwaysOpen && setEditing(false)} onBlur={() => !alwaysOpen && rating >= RATING_MIN && setEditing(false)}
                  aria-label="Rating out of 10" aria-valuetext={rating ? `${rating.toFixed(1)} out of 10` : 'Not rated'} />
              </div>
              {!readOnly && <button type="button" className="rating-step" onClick={() => { setRating(rating + 0.1); if (!alwaysOpen) setEditing(false) }} disabled={rating >= 10} aria-label="Increase rating by 0.1">+</button>}
            </div>
            <div className="rating-ticks" aria-hidden="true"><span>1</span><span>Average · 5</span><span>10</span></div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
