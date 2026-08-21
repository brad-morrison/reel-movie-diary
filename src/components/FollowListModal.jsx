import { motion } from 'framer-motion'
import { IconUser, IconX } from '../lib/icons.jsx'

export default function FollowListModal({ kind, profiles, loading, onClose, onSelect }) {
  const title = kind === 'followers' ? 'Followers' : 'Following'
  return (
    <motion.div className="overlay follow-list-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.section className="modal follow-list-modal" initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} onMouseDown={(event) => event.stopPropagation()}>
        <div className="follow-list-head"><div><span>Reel community</span><h2>{title}</h2></div><button className="icon-btn" type="button" onClick={onClose} aria-label="Close"><IconX size={18} /></button></div>
        <div className="follow-list-body">
          {loading ? <p className="follow-list-empty">Loading {title.toLowerCase()}…</p> : profiles.length ? profiles.map((profile) => (
            <button className="follow-person" type="button" key={profile.uid} onClick={() => onSelect(profile.username)}>
              {profile.photoURL ? <img src={profile.photoURL} alt="" referrerPolicy="no-referrer" /> : <span><IconUser size={19} /></span>}
              <span><strong>{profile.displayName || profile.username}</strong><small>@{profile.username}</small></span>
            </button>
          )) : <p className="follow-list-empty">No {title.toLowerCase()} yet.</p>}
        </div>
      </motion.section>
    </motion.div>
  )
}
