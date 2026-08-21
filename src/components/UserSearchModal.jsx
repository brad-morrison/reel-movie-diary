import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { IconSearch, IconUser, IconX } from '../lib/icons.jsx'
import { searchPublicProfiles } from '../lib/store.js'

export default function UserSearchModal({ onClose, onSelect }) {
  const inputRef = useRef(null)
  const [value, setValue] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const term = value.trim().replace(/^@+/, '')
    if (!term) { setResults([]); setLoading(false); setSearched(false); return }
    let active = true
    setLoading(true)
    const timeout = setTimeout(() => {
      searchPublicProfiles(term)
        .then((profiles) => { if (active) { setResults(profiles); setSearched(true) } })
        .catch(() => { if (active) { setResults([]); setSearched(true) } })
        .finally(() => { if (active) setLoading(false) })
    }, 220)
    return () => { active = false; clearTimeout(timeout) }
  }, [value])

  return (
    <motion.div className="overlay follow-list-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.section className="modal follow-list-modal user-search-modal" initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} onMouseDown={(event) => event.stopPropagation()}>
        <div className="follow-list-head"><div><span>Reel community</span><h2>Find people</h2></div><button className="icon-btn" type="button" onClick={onClose} aria-label="Close"><IconX size={18} /></button></div>
        <div className="user-search-field"><IconSearch size={18} /><span>@</span><input ref={inputRef} value={value} onChange={(event) => setValue(event.target.value)} placeholder="Search by username" autoCapitalize="none" autoCorrect="off" spellCheck="false" /></div>
        <div className="follow-list-body">
          {loading ? <p className="follow-list-empty">Searching…</p> : results.length ? results.map((profile) => (
            <button className="follow-person" type="button" key={profile.uid} onClick={() => onSelect(profile.username)}>
              {profile.photoURL ? <img src={profile.photoURL} alt="" referrerPolicy="no-referrer" /> : <span><IconUser size={19} /></span>}
              <span><strong>{profile.displayName || profile.username}</strong><small>@{profile.username}</small></span>
            </button>
          )) : searched ? <p className="follow-list-empty">No matching people found.</p> : <p className="follow-list-empty">Type a username to find someone.</p>}
        </div>
      </motion.section>
    </motion.div>
  )
}
