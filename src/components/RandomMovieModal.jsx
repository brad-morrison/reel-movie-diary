import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { IconSparkle, IconX } from '../lib/icons.jsx'
import { useEscape } from '../lib/useEscape.js'

const REVEAL_BITS = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  angle: (index / 18) * Math.PI * 2,
  distance: 115 + (index % 4) * 22,
}))

export default function RandomMovieModal({ items, listName, onClose }) {
  const [run, setRun] = useState(0)
  const [current, setCurrent] = useState(items[0])
  const [spinning, setSpinning] = useState(true)
  const [progress, setProgress] = useState(0)
  const lastPickRef = useRef(null)
  useEscape(onClose)

  useEffect(() => {
    if (!items.length) return
    let cancelled = false
    let timer
    let step = 0
    let shownId = current?.id
    const totalSteps = 20
    setSpinning(true)
    setProgress(0)

    function randomExcept(id, source = items) {
      const choices = source.length > 1 ? source.filter((item) => item.id !== id) : source
      return choices[Math.floor(Math.random() * choices.length)]
    }

    function settle() {
      let choices = items
      if (items.length > 1 && lastPickRef.current) choices = items.filter((item) => item.id !== lastPickRef.current)
      const winner = randomExcept(null, choices)
      lastPickRef.current = winner.id
      setCurrent(winner)
      setProgress(1)
      setSpinning(false)
    }

    function advance() {
      if (cancelled) return
      if (step >= totalSteps) { settle(); return }
      const next = randomExcept(shownId)
      shownId = next.id
      setCurrent(next)
      setProgress((step + 1) / totalSteps)
      const ease = step / (totalSteps - 1)
      // Start like a quickly-spinning reel, then linger more and more on each
      // contender so the final few choices build real suspense.
      const delay = 85 + 430 * ease * ease
      step++
      timer = setTimeout(advance, delay)
    }

    timer = setTimeout(advance, 180)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [run, items])

  const suspense = progress < .35 ? 'Shuffling the deck' : progress < .72 ? 'Narrowing it down' : 'Almost there'

  return (
    <motion.div className="overlay random-movie-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className={`modal random-movie-modal ${spinning ? 'is-spinning' : 'has-winner'}`} initial={{ opacity: 0, y: 35, scale: .95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: .97 }} onClick={(event) => event.stopPropagation()}>
        <motion.div className="random-movie-glow" animate={{ opacity: spinning ? .2 : .4, scale: spinning ? 1.12 : 1.2 }} transition={{ duration: .7 }} style={current?.backdrop || current?.poster ? { backgroundImage: `url(${current.backdrop || current.poster})` } : undefined} />
        <div className="random-movie-light random-movie-light-one" />
        <div className="random-movie-light random-movie-light-two" />
        <button className="icon-btn random-movie-close" onClick={onClose} aria-label="Close"><IconX size={18} /></button>
        <div className="random-movie-content">
          <span className="watchlist-eyebrow"><IconSparkle size={14} /> Picking from {listName}</span>
          <h2>{spinning ? 'Let fate decide…' : 'Tonight’s pick'}</h2>
          <div className="random-movie-progress" aria-hidden><motion.span animate={{ scaleX: progress }} transition={{ duration: .22, ease: 'easeOut' }} /></div>

          <div className={`random-movie-stage ${spinning ? 'spinning' : 'settled'}`}>
            <div className="random-movie-orbit"><i /><i /><i /></div>
            {!spinning && <div className="random-movie-burst" aria-hidden>{REVEAL_BITS.map((bit) => <motion.i key={`${run}-${bit.id}`} initial={{ x: 0, y: 0, opacity: 1, scale: 0 }} animate={{ x: Math.cos(bit.angle) * bit.distance, y: Math.sin(bit.angle) * bit.distance, opacity: 0, scale: [0, 1, .5] }} transition={{ duration: .9, delay: bit.id * .012, ease: [0.22, 1, 0.36, 1] }} />)}</div>}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div key={`${run}-${current?.id}-${spinning}`} className="random-movie-card" initial={{ opacity: 0, y: -64, rotateX: 7, rotateZ: -2, scale: .86 }} animate={{ opacity: 1, y: 0, rotateX: 0, rotateZ: 0, scale: 1 }} exit={{ opacity: 0, y: 82, rotateX: -8, rotateZ: 2, scale: .84 }} transition={spinning ? { duration: .19, ease: [0.22, 1, 0.36, 1] } : { type: 'spring', stiffness: 190, damping: 16, mass: .8 }}>
                {current?.poster ? <img src={current.poster} alt="" /> : <div className="random-movie-fallback"><IconSparkle size={36} /><span>{current?.title}</span></div>}
                <div className="random-movie-card-sheen" />
              </motion.div>
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={spinning ? suspense : current?.id} className="random-movie-result" initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .28 }}>
              <h3>{spinning ? suspense : current?.title}</h3>
              <p>{spinning ? `${items.length} ${items.length === 1 ? 'possibility' : 'possibilities'} in play` : `${current?.year || 'Year unknown'} · ${current?.type === 'tv' ? 'TV Series' : 'Film'}`}</p>
            </motion.div>
          </AnimatePresence>
          <div className="random-movie-actions">
            <button className="btn btn-ghost" onClick={onClose}>{spinning ? 'Cancel' : 'That’s the one'}</button>
            <button className="btn btn-primary" disabled={spinning} onClick={() => setRun((value) => value + 1)}><IconSparkle size={16} /> Pick again</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
