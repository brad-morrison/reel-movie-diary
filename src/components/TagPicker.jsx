import { useState } from 'react'
import { IconPlus, IconCheck } from '../lib/icons.jsx'

// Select from a catalogue of options (single or multi), with an inline "add new".
// value is a string (single) or string[] (multi). accent tints the selected chips.
export default function TagPicker({
  options = [],
  value,
  onChange,
  onAddOption,
  multi = false,
  placeholder = 'Add new…',
  accent = 'gold',
}) {
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')

  const selected = multi ? value || [] : value ? [value] : []
  const isOn = (o) => selected.some((s) => s.toLowerCase() === o.toLowerCase())

  const onStyle =
    accent === 'rose'
      ? { color: 'var(--rose)', borderColor: 'rgba(255,77,109,0.5)', background: 'rgba(255,77,109,0.12)' }
      : { color: 'var(--gold)', borderColor: 'rgba(245,185,66,0.5)', background: 'rgba(245,185,66,0.14)' }

  function toggle(o) {
    if (multi) {
      const cur = value || []
      onChange(isOn(o) ? cur.filter((x) => x.toLowerCase() !== o.toLowerCase()) : [...cur, o])
    } else {
      onChange(isOn(o) ? '' : o)
    }
  }

  function commit() {
    const v = text.trim()
    if (!v) {
      setAdding(false)
      setText('')
      return
    }
    onAddOption?.(v)
    if (multi) {
      if (!isOn(v)) onChange([...(value || []), v])
    } else {
      onChange(v)
    }
    setText('')
    setAdding(false)
  }

  // Show any currently-selected values that aren't in the catalogue too.
  const extras = selected.filter((s) => !options.some((o) => o.toLowerCase() === s.toLowerCase()))
  const all = [...options, ...extras]

  return (
    <div className="picker">
      <div className="chips">
        {all.map((o) => (
          <button
            type="button"
            key={o}
            className={`chip ${isOn(o) ? 'on' : ''}`}
            style={isOn(o) ? onStyle : undefined}
            onClick={() => toggle(o)}
          >
            {isOn(o) && <IconCheck size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />}
            {o}
          </button>
        ))}

        {adding ? (
          <input
            autoFocus
            className="picker-input"
            value={text}
            placeholder={placeholder}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commit() }
              if (e.key === 'Escape') { e.stopPropagation(); setAdding(false); setText('') }
            }}
            onBlur={commit}
          />
        ) : (
          <button type="button" className="chip chip-add" onClick={() => setAdding(true)}>
            <IconPlus size={13} style={{ verticalAlign: '-2px', marginRight: 3 }} /> New
          </button>
        )}
      </div>
    </div>
  )
}
