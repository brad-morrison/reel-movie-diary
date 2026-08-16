import { forwardRef, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { IconStar, IconCheck, IconCrown } from '../lib/icons.jsx'

const PosterCard = forwardRef(function PosterCard({ entry, onClick, index = 0, showViewingCount = false }, outerRef) {
  const ref = useRef(null)
  const [imgOk, setImgOk] = useState(true)
  const canHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 260, damping: 20 })
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 260, damping: 20 })
  const glowX = useTransform(mx, [-0.5, 0.5], ['0%', '100%'])
  const glowY = useTransform(my, [-0.5, 0.5], ['0%', '100%'])

  function handleMove(e) {
    const r = ref.current.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width - 0.5)
    my.set((e.clientY - r.top) / r.height - 0.5)
  }
  function reset() {
    mx.set(0)
    my.set(0)
  }

  return (
    <motion.div
      ref={outerRef}
      layout={canHover}
      initial={canHover ? { opacity: 0, y: 30, scale: 0.94 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: Math.min(index * 0.035, 0.4), type: 'spring', stiffness: 220, damping: 24 }}
      style={{ perspective: 900 }}
    >
      <motion.button
        ref={ref}
        layoutId={canHover ? `poster-${entry.id}` : undefined}
        className="poster"
        onMouseMove={canHover ? handleMove : undefined}
        onMouseLeave={canHover ? reset : undefined}
        onClick={() => onClick(entry)}
        style={canHover ? { rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' } : undefined}
        whileHover={canHover ? { scale: 1.04, boxShadow: 'var(--shadow)' } : undefined}
        whileTap={{ scale: 0.99 }}
      >
        {entry.poster && imgOk ? (
          <motion.img
            className="poster-img"
            src={entry.poster}
            alt={entry.title}
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={() => setImgOk(false)}
          />
        ) : (
          <div className="poster-fallback">
            <div>
              <div className="pf-title">{entry.title}</div>
              <div className="pf-year">{entry.year || ''}</div>
            </div>
          </div>
        )}

        <motion.div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: useTransform(
              [glowX, glowY],
              ([x, y]) => `radial-gradient(240px circle at ${x} ${y}, rgba(255,255,255,0.18), transparent 60%)`,
            ),
            mixBlendMode: 'soft-light',
            pointerEvents: 'none',
          }}
        />

        <div className="poster-shade" />

        {entry.rating > 0 && (
          <div className="poster-rating">
            <IconStar size={13} /> {entry.rating}
          </div>
        )}
        <div className="poster-tl">
          {entry.top20 && (
            <span className="poster-top20"><IconCrown size={12} /> TOP 20</span>
          )}
        </div>

        <div className="poster-info">
          <div className="poster-title">{entry.title}</div>
          <div className="poster-meta">
            <span>{entry.year}</span>
            {showViewingCount && <span className="dot-sep">{entry.viewingCount}× watched</span>}
            {entry.platform && <span className="dot-sep">{entry.platform}</span>}
            {entry.firstTime && (
              <span className="dot-sep" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <IconCheck size={12} /> first time
              </span>
            )}
          </div>
        </div>
        <span className="badge-type">{entry.type === 'tv' ? 'TV' : 'Film'}</span>
      </motion.button>
    </motion.div>
  )
})

export default PosterCard
