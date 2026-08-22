import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { IconCalendar, IconCheck, IconFilm, IconImage, IconSettings, IconUpload, IconUser, IconX } from '../../lib/icons.jsx'
import { normalizeUsername, usernameError } from '../../lib/store.js'
import { formatMonthYear } from '../../lib/profile.js'

const FOLLOW_LABEL = { accepted: 'Following', pending: 'Requested' }

// Projections published before covers existed carry no resolved hero, so fall
// back to reading the favourites the way the owner's own page does.
function legacyHero(top20 = [], recent = []) {
  const pool = [...top20, ...recent]
  const pick = pool.find((entry) => entry.backdrop) || pool.find((entry) => entry.poster)
  return pick ? { image: pick.backdrop || pick.poster, title: pick.title || '', year: pick.year || '' } : null
}

export default function ProfileHero({
  owner, user, username, stats, social, hero, top20 = [], recent = [],
  onFollow, onFollowers, onFollowing, onSettings, onChangeCover,
  updateAvatar, updateDisplayName, updateUsername, onUsernameChanged, notify,
}) {
  const avatarInput = useRef(null)
  const [uploading, setUploading] = useState(false)
  // A profile with no handle is not reachable at /@name yet, so the editor
  // opens itself and says so rather than waiting to be found.
  const [editing, setEditing] = useState(owner && !username)
  const [nameInput, setNameInput] = useState(user?.displayName || '')
  const [usernameInput, setUsernameInput] = useState(username || '')
  const [usernameStatus, setUsernameStatus] = useState('')
  const [saving, setSaving] = useState(false)

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Film lover'
  const initial = displayName[0]?.toUpperCase() || '?'
  const cover = hero || legacyHero(top20, recent)
  const handleError = usernameInput ? usernameError(usernameInput) : 'Choose a username'
  const since = formatMonthYear(stats?.firstWatch)
  const canEdit = owner && (updateDisplayName || updateUsername)

  async function chooseAvatar(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await updateAvatar(file)
      notify('Profile picture updated')
    } catch (error) {
      notify(error?.message || 'Could not upload profile picture')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  async function saveIdentity(event) {
    event.preventDefault()
    const nextName = nameInput.trim()
    const nextUsername = normalizeUsername(usernameInput)
    if (nextUsername !== username && handleError) return
    setSaving(true)
    setUsernameStatus('')
    try {
      if (updateDisplayName && nextName && nextName !== user?.displayName) await updateDisplayName(nextName)
      if (updateUsername && nextUsername !== username) {
        const saved = await updateUsername(nextUsername)
        setUsernameInput(saved)
        onUsernameChanged?.(saved)
        notify(`Your profile is now /@${saved}`)
      } else if (nextName && nextName !== user?.displayName) {
        notify('Profile name updated')
      }
      setEditing(false)
    } catch (error) {
      setUsernameStatus(error?.message || 'Could not save your profile')
    } finally {
      setSaving(false)
    }
  }

  function cancelEditing() {
    setNameInput(user?.displayName || '')
    setUsernameInput(username || '')
    setUsernameStatus('')
    setEditing(false)
  }

  return (
    <header className="pf-hero">
      <div className={`pf-banner ${cover ? '' : 'pf-banner-blank'}`}>
        {cover && <img src={cover.image} alt="" aria-hidden="true" referrerPolicy="no-referrer" />}
        <span className="pf-banner-scrim" aria-hidden="true" />
        {owner && onChangeCover && (
          <button className="pf-cover-button" type="button" onClick={onChangeCover}>
            <IconImage size={14} /> <span>{cover ? 'Change cover' : 'Choose a cover'}</span>
          </button>
        )}
        {cover?.title && <span className="pf-cover-credit">{cover.title}{cover.year ? ` · ${cover.year}` : ''}</span>}
      </div>

      <div className="pf-identity">
        <div className="pf-avatar-wrap">
          {user?.photoURL
            ? <img className="pf-avatar" src={user.photoURL} alt={`${displayName}'s profile`} referrerPolicy="no-referrer" />
            : <span className="pf-avatar pf-avatar-fallback">{initial}</span>}
          {owner && updateAvatar && (
            <>
              <button className="pf-avatar-edit" type="button" onClick={() => avatarInput.current?.click()} disabled={uploading} aria-label="Change profile picture">
                {uploading ? <span className="pf-dots" /> : <IconUpload size={14} />}
              </button>
              <input ref={avatarInput} className="visually-hidden" type="file" accept="image/*" onChange={chooseAvatar} />
            </>
          )}
        </div>

        <div className="pf-identity-main">
          <h1>{displayName}</h1>
          <div className="pf-handle-row">
            {username
              ? <span className="pf-handle">@{username}</span>
              : owner && <span className="pf-handle pf-handle-missing">No public handle yet</span>}
            {since && <span className="pf-since"><IconCalendar size={13} /> Watching since {since}</span>}
          </div>

          <div className="pf-counts">
            <span><strong>{stats?.watches ?? 0}</strong> watches</span>
            <button type="button" onClick={onFollowers} disabled={!onFollowers}><strong>{social?.followers ?? 0}</strong> followers</button>
            <button type="button" onClick={onFollowing} disabled={!onFollowing}><strong>{social?.following ?? 0}</strong> following</button>
          </div>
        </div>

        <div className="pf-identity-actions">
          {!owner && onFollow && (
            <button
              className={`btn ${social?.relationshipStatus ? 'btn-ghost' : 'btn-primary'} pf-follow`}
              type="button"
              onClick={onFollow}
              disabled={social?.busy}
            >
              {social?.busy ? 'Saving…' : FOLLOW_LABEL[social?.relationshipStatus] || 'Follow'}
            </button>
          )}
          {canEdit && !editing && (
            <button className="btn btn-ghost" type="button" onClick={() => { setNameInput(user?.displayName || ''); setUsernameInput(username || ''); setEditing(true) }}>
              <IconUser size={15} /> Edit profile
            </button>
          )}
          {owner && onSettings && <button className="btn btn-ghost" type="button" onClick={onSettings}><IconSettings size={15} /> Settings</button>}
        </div>
      </div>

      {editing && (
        <motion.form
          className="pf-editor"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          onSubmit={saveIdentity}
        >
          <div className="pf-editor-inner">
            {!username && <p className="pf-editor-note"><IconFilm size={14} /> Pick a username to give your diary a shareable page at /@you.</p>}
            <div className="pf-editor-fields">
              <label className="pf-field">
                <span>Display name</span>
                <input value={nameInput} onChange={(event) => setNameInput(event.target.value)} maxLength={50} autoFocus={!!username} placeholder="Your name" />
              </label>
              <label className="pf-field pf-field-handle">
                <span>Username</span>
                <div>
                  <i>@</i>
                  <input
                    value={usernameInput}
                    onChange={(event) => { setUsernameInput(normalizeUsername(event.target.value)); setUsernameStatus('') }}
                    placeholder="your_username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    maxLength={24}
                    autoFocus={!username}
                  />
                </div>
              </label>
            </div>
            <small className={usernameStatus ? 'error' : ''}>
              {usernameStatus || (usernameInput && usernameInput !== username && handleError) || `Your page will be reel.app/@${usernameInput || 'you'}`}
            </small>
            <div className="pf-editor-actions">
              <button className="btn btn-primary" type="submit" disabled={saving || (usernameInput !== username && !!handleError)}>
                {saving ? 'Saving…' : <><IconCheck size={15} /> Save profile</>}
              </button>
              {username && <button className="btn btn-ghost" type="button" onClick={cancelEditing}><IconX size={15} /> Cancel</button>}
            </div>
          </div>
        </motion.form>
      )}
    </header>
  )
}
