import { useState } from 'react'
import { motion } from 'framer-motion'
import { IconStar } from '../lib/icons.jsx'

const ratingAtPointer = (event, star) => {
  const rect = event.currentTarget.getBoundingClientRect()
  return event.clientX - rect.left <= rect.width / 2 ? star - 0.5 : star
}

// Precise half-star rating with a stable hover preview and touch support.
export default function Rating({ value = 0, onChange, big = false, readOnly = false }) {
  const [preview, setPreview] = useState(null)
  const shown = preview ?? value

  const moveByKeyboard = (event) => {
    if (readOnly || !['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp'].includes(event.key)) return
    event.preventDefault()
    const direction = event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -0.5 : 0.5
    onChange?.(Math.max(0, Math.min(5, value + direction)))
  }

  return (
    <div
      className={`stars ${big ? 'rating-big' : ''}`}
      role="radiogroup"
      aria-label="Rating out of 5"
      onPointerLeave={() => setPreview(null)}
      onKeyDown={moveByKeyboard}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.max(0, Math.min(1, shown - (star - 1))) * 100
        return (
          <button
            key={star}
            className="star-btn"
            type="button"
            disabled={readOnly}
            role="radio"
            aria-checked={value > star - 1 && value <= star}
            aria-label={`${star - 0.5} or ${star} stars`}
            onPointerMove={(event) => {
              if (!readOnly && event.pointerType !== 'touch') setPreview(ratingAtPointer(event, star))
            }}
            onClick={(event) => {
              if (readOnly) return
              const next = event.detail === 0 ? star : ratingAtPointer(event, star)
              setPreview(null)
              onChange?.(next)
            }}
          >
            <motion.span
              className="star-visual"
              initial={false}
              animate={{ scale: fill > 0 ? 1.12 : 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22, mass: 0.5, delay: star * 0.018 }}
            >
              <IconStar className="star-empty" fill="currentColor" />
              <motion.span
                className="star-fill"
                initial={false}
                animate={{ clipPath: `inset(0 ${100 - fill}% 0 0)` }}
                transition={{ type: 'spring', stiffness: 500, damping: 38, mass: 0.45 }}
              >
                <IconStar fill="currentColor" />
              </motion.span>
            </motion.span>
          </button>
        )
      })}
    </div>
  )
}
