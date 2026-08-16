import { useEffect, useRef, useState } from 'react'
import { Reorder, motion, useDragControls } from 'framer-motion'
import { IconCrown } from '../lib/icons.jsx'

export default function Top20Page({ entries, onOpen, onReorder }) {
  const entryIds = entries.map((entry) => entry.id)
  const incomingOrderKey = entryIds.join('|')
  const [orderedIds, setOrderedIds] = useState(entryIds)
  const [dragging, setDragging] = useState(false)
  const orderRef = useRef(entryIds)
  const draggingRef = useRef(false)

  // Accept rank changes arriving from another device, while leaving the list
  // alone during the user's own active drag gesture.
  useEffect(() => {
    if (draggingRef.current) return
    setOrderedIds(entryIds)
    orderRef.current = entryIds
  }, [incomingOrderKey])

  function reorder(nextIds) {
    orderRef.current = nextIds
    setOrderedIds(nextIds)
  }

  function saveOrder() {
    draggingRef.current = false
    setDragging(false)
    onReorder(orderRef.current)
  }

  function startDragging() {
    draggingRef.current = true
    setDragging(true)
  }

  const byId = new Map(entries.map((entry) => [entry.id, entry]))
  const orderedEntries = orderedIds.map((id) => byId.get(id)).filter(Boolean)

  return (
    <div className="top20-page">
      <motion.div className="top20-heading" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <span className="top20-heading-icon"><IconCrown size={25} /></span>
        <div>
          <div className="top20-eyebrow">Your definitive list</div>
          <h1>Top 20</h1>
          <p>Drag the films into your perfect order. Your ranking saves automatically.</p>
        </div>
        <span className="top20-count">{entries.length} / 20</span>
      </motion.div>

      {entries.length === 0 ? (
        <div className="empty">
          <div className="empty-mark">♛</div>
          <h3>Your throne room is empty</h3>
          <p>Give a title five stars, then add it to your Top 20 from its details.</p>
        </div>
      ) : (
        <Reorder.Group axis="y" values={orderedIds} onReorder={reorder} className={`top20-list ${dragging ? 'dragging' : ''}`}>
          {orderedEntries.map((entry, index) => (
            <Top20Row key={entry.id} entry={entry} index={index} onOpen={onOpen} onDragStart={startDragging} onDragEnd={saveOrder} />
          ))}
        </Reorder.Group>
      )}
    </div>
  )
}

function Top20Row({ entry, index, onOpen, onDragStart, onDragEnd }) {
  const dragControls = useDragControls()

  return (
    <Reorder.Item
      value={entry.id}
      className="top20-row"
      dragListener={false}
      dragControls={dragControls}
      dragElastic={0}
      dragMomentum={false}
      layout="position"
      transition={{ layout: { type: 'tween', duration: 0.2, ease: [0.22, 1, 0.36, 1] } }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      whileDrag={{ zIndex: 3 }}
    >
      {(entry.backdrop || entry.poster) && <span className="top20-card-art" style={{ backgroundImage: `url(${entry.backdrop || entry.poster})` }} />}
      <span className="top20-rank">{index + 1}</span>
      <button className="top20-poster-button" onClick={() => onOpen(entry)} aria-label={`Open ${entry.title}`}>
        {entry.poster ? <img src={entry.poster} alt={entry.title} /> : <div className="top20-poster-fallback">{entry.title.slice(0, 1)}</div>}
      </button>
      <button className="top20-title-button" onClick={() => onOpen(entry)}>
        <strong>{entry.title}</strong>
        <span>{entry.year || 'Year unknown'} · {entry.type === 'tv' ? 'TV Series' : 'Film'} · ★ {entry.rating}</span>
        {entry.overview && <p>{entry.overview}</p>}
        {entry.genres?.length > 0 && <em>{entry.genres.slice(0, 3).join(' · ')}</em>}
      </button>
      <button
        type="button"
        className="top20-drag"
        aria-label={`Drag to reorder ${entry.title}`}
        title="Drag to reorder"
        onPointerDown={(event) => dragControls.start(event)}
      >⠿</button>
    </Reorder.Item>
  )
}
