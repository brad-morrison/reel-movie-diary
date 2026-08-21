import { useRef, useState } from 'react'
import { IconBookmark, IconCalendar, IconCheck, IconCrown, IconFilm, IconSettings, IconStar, IconUpload, IconX } from '../lib/icons.jsx'
import { normalizeUsername, usernameError } from '../lib/store.js'

const formatDate = (value) => {
  if (!value) return 'Date not set'
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function Poster({ entry }) {
  return entry.poster
    ? <img src={entry.poster} alt="" />
    : <span className="profile-poster-fallback"><IconFilm size={22} /></span>
}

export default function Profile({ user, username, entries = [], publicTop20, publicRecent, sharedEntries, watchlists = [], stats, social, followRequests = [], isPublic = false, onFollow, onFollowers, onFollowing, onResolveRequest, onOpen, onSettings, updateAvatar, updateDisplayName, updateUsername, onUsernameChanged, notify }) {
  const avatarInput = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [editingUsername, setEditingUsername] = useState(!username)
  const [usernameInput, setUsernameInput] = useState(username || '')
  const [usernameStatus, setUsernameStatus] = useState('')
  const [savingUsername, setSavingUsername] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(user?.displayName || '')
  const [savingName, setSavingName] = useState(false)
  const uniqueTitles = stats?.uniqueTitles ?? new Set(entries.map((entry) => `${entry.type || 'movie'}:${entry.title?.toLowerCase()}:${entry.year || ''}`)).size
  const rated = entries.filter((entry) => Number(entry.rating) > 0)
  const averageRating = stats?.averageRating ?? (rated.length ? (rated.reduce((sum, entry) => sum + Number(entry.rating), 0) / rated.length).toFixed(1) : '—')
  const top20 = publicTop20?.slice(0, 4) || entries.filter((entry) => entry.top20).sort((a, b) => (a.top20Rank || 99) - (b.top20Rank || 99)).slice(0, 4)
  const recent = publicRecent || [...entries].sort((a, b) => (b.watchedDate || b.createdAt || '').localeCompare(a.watchedDate || a.createdAt || '')).slice(0, 5)
  const watchlistCount = stats?.watchlistCount ?? watchlists.reduce((sum, list) => sum + list.items.length, 0)
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Film lover'
  const initial = displayName[0]?.toUpperCase() || '?'
  const handleError = usernameInput ? usernameError(usernameInput) : 'Choose a username'

  async function saveUsername(event) {
    event.preventDefault()
    if (handleError) return
    setSavingUsername(true)
    setUsernameStatus('')
    try {
      const saved = await updateUsername(usernameInput)
      setUsernameInput(saved)
      setEditingUsername(false)
      setUsernameStatus('saved')
      onUsernameChanged(saved)
      notify(`Your profile is now /@${saved}`)
    } catch (error) {
      setUsernameStatus(error?.message || 'Could not save username')
    } finally {
      setSavingUsername(false)
    }
  }

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

  async function saveDisplayName(event) {
    event.preventDefault()
    setSavingName(true)
    try {
      const saved = await updateDisplayName(nameInput)
      setNameInput(saved)
      setEditingName(false)
      notify('Profile name updated')
    } catch (error) {
      notify(error?.message || 'Could not update profile name')
    } finally {
      setSavingName(false)
    }
  }

  return (
    <section className="profile-page">
      <div className="profile-hero">
        <div className="profile-hero-glow" aria-hidden="true" />
        <div className="profile-avatar-wrap">
          {user?.photoURL
            ? <img className="profile-avatar" src={user.photoURL} alt={`${displayName}'s profile`} referrerPolicy="no-referrer" />
            : <span className="profile-avatar profile-avatar-fallback">{initial}</span>}
          {!isPublic && updateAvatar && (
            <>
              <button className="profile-avatar-edit" type="button" onClick={() => avatarInput.current?.click()} disabled={uploading} aria-label="Change profile picture">
                {uploading ? '…' : <IconUpload size={15} />}
              </button>
              <input ref={avatarInput} className="visually-hidden" type="file" accept="image/*" onChange={chooseAvatar} />
            </>
          )}
        </div>
        <div className="profile-identity">
          <span className="profile-kicker">{isPublic ? `@${username}` : 'My Reel profile'}</span>
          {!isPublic && editingName ? (
            <form className="profile-name-form" onSubmit={saveDisplayName}>
              <label htmlFor="profile-display-name">Profile name</label>
              <div><input id="profile-display-name" value={nameInput} onChange={(event) => setNameInput(event.target.value)} autoFocus maxLength={50} />
                <button type="submit" disabled={!nameInput.trim() || savingName} aria-label="Save profile name">{savingName ? '…' : <IconCheck size={16} />}</button>
                <button type="button" onClick={() => { setEditingName(false); setNameInput(user?.displayName || '') }} aria-label="Cancel"><IconX size={16} /></button>
              </div>
            </form>
          ) : <h1>{displayName}{!isPublic && updateDisplayName && <button className="profile-name-edit" type="button" onClick={() => { setNameInput(user?.displayName || ''); setEditingName(true) }}>Edit</button>}</h1>}
          {!isPublic && username && !editingUsername ? (
            <button className="profile-handle" type="button" onClick={() => { setUsernameInput(username); setEditingUsername(true); setUsernameStatus('') }}>@{username} <span>Edit</span></button>
          ) : !isPublic ? (
            <form className="profile-username-form" onSubmit={saveUsername}>
              <label htmlFor="profile-username">Profile username</label>
              <div><span>@</span><input id="profile-username" value={usernameInput} onChange={(event) => { setUsernameInput(normalizeUsername(event.target.value)); setUsernameStatus('') }} placeholder="your_username" autoCapitalize="none" autoCorrect="off" spellCheck="false" maxLength={24} />
                <button type="submit" disabled={!!handleError || savingUsername} aria-label="Save username">{savingUsername ? '…' : <IconCheck size={16} />}</button>
                {username && <button type="button" onClick={() => { setEditingUsername(false); setUsernameInput(username); setUsernameStatus('') }} aria-label="Cancel"><IconX size={16} /></button>}
              </div>
              <small className={usernameStatus && usernameStatus !== 'saved' ? 'error' : ''}>{usernameStatus === 'saved' ? 'Username saved' : usernameStatus || handleError || `Your profile will be /@${normalizeUsername(usernameInput)}`}</small>
            </form>
          ) : null}
          <div className="profile-since"><IconCalendar size={14} /> {isPublic ? 'Reel member' : entries.length ? `Diary active · ${formatDate([...entries].sort((a, b) => (a.createdAt || a.watchedDate || '').localeCompare(b.createdAt || b.watchedDate || ''))[0]?.watchedDate)}` : 'Your diary is ready for its first watch'}</div>
          {social && <div className="profile-social"><button type="button" onClick={onFollowers} disabled={!onFollowers}><strong>{social.followers}</strong> followers</button><button type="button" onClick={onFollowing} disabled={!onFollowing}><strong>{social.following}</strong> following</button></div>}
        </div>
        {isPublic && onFollow && <button className={`btn profile-follow-button ${social?.relationshipStatus ? 'btn-ghost' : 'btn-primary'}`} type="button" onClick={onFollow} disabled={social?.busy}>{social?.busy ? 'Saving…' : social?.relationshipStatus === 'accepted' ? 'Following' : social?.relationshipStatus === 'pending' ? 'Requested' : 'Follow'}</button>}
        {!isPublic && <button className="btn btn-ghost profile-settings-button" type="button" onClick={onSettings}><IconSettings size={16} /> Settings</button>}
      </div>

      {!isPublic && followRequests.length > 0 && <section className="profile-card profile-requests"><div className="profile-card-heading"><div><span>Private access</span><h2>Follow requests</h2></div><strong>{followRequests.length}</strong></div>{followRequests.map((request) => <div className="profile-request-row" key={request.uid}>{request.photoURL ? <img src={request.photoURL} alt="" referrerPolicy="no-referrer" /> : <span className="account-initial">{(request.displayName || request.username || '?')[0].toUpperCase()}</span>}<span><strong>{request.displayName || request.username}</strong><small>@{request.username} wants to follow you</small></span><div><button className="btn btn-primary" type="button" onClick={() => onResolveRequest(request, true)}>Accept</button><button className="btn btn-ghost" type="button" onClick={() => onResolveRequest(request, false)}>Decline</button></div></div>)}</section>}

      <div className="profile-stat-grid">
        <div><IconFilm size={18} /><strong>{stats?.watches ?? entries.length}</strong><span>Watches logged</span></div>
        <div><IconBookmark size={18} /><strong>{uniqueTitles}</strong><span>Unique titles</span></div>
        <div><IconStar size={18} /><strong>{averageRating}</strong><span>Average rating</span></div>
        <div><IconCrown size={18} /><strong>{watchlistCount}</strong><span>Saved to watch</span></div>
      </div>

      <div className="profile-content-grid">
        <section className="profile-card profile-favorites">
          <div className="profile-card-heading"><div><span>Your hall of fame</span><h2>Top picks</h2></div><IconCrown size={21} /></div>
          {top20.length ? (
            <div className="profile-poster-grid">
              {top20.map((entry, index) => (
                <button type="button" key={entry.id} onClick={() => onOpen?.(entry)} disabled={!onOpen} aria-label={`Open ${entry.title}`}>
                  <Poster entry={entry} />
                  <i>#{entry.top20Rank || index + 1}</i>
                  <strong>{entry.title}</strong>
                  <small>{entry.year || entry.type}</small>
                </button>
              ))}
            </div>
          ) : <p className="profile-empty">Crown favorites from your diary and they’ll take pride of place here.</p>}
        </section>

        <section className="profile-card profile-recent">
          <div className="profile-card-heading"><div><span>Fresh from the credits</span><h2>Recently watched</h2></div><IconFilm size={21} /></div>
          {recent.length ? recent.map((entry) => (
            <button type="button" className="profile-recent-row" key={entry.id} onClick={() => onOpen?.(entry)} disabled={!onOpen}>
              <span className="profile-recent-poster"><Poster entry={entry} /></span>
              <span className="profile-recent-copy"><strong>{entry.title}</strong><small>{formatDate(entry.watchedDate)} · {entry.type === 'tv' ? 'TV' : 'Film'}</small></span>
              {Number(entry.rating) > 0 && <span className="profile-recent-score"><IconStar size={12} /> {entry.rating}</span>}
            </button>
          )) : <p className="profile-empty">Your latest watches will appear here.</p>}
        </section>
      </div>
      {isPublic && Array.isArray(sharedEntries) && <section className="profile-card shared-diary"><div className="profile-card-heading"><div><span>Follower access</span><h2>Full diary</h2></div><strong>{sharedEntries.length} watches</strong></div><div className="shared-diary-list">{[...sharedEntries].sort((a, b) => (b.watchedDate || b.createdAt || '').localeCompare(a.watchedDate || a.createdAt || '')).map((entry) => <article key={entry.id}><span className="shared-diary-poster"><Poster entry={entry} /></span><div><strong>{entry.title}</strong><small>{formatDate(entry.watchedDate)} · {entry.type === 'tv' ? 'TV' : 'Film'}{entry.year ? ` · ${entry.year}` : ''}</small>{(entry.review || entry.notes) && <p>{entry.review || entry.notes}</p>}</div>{Number(entry.rating) > 0 && <span className="profile-recent-score"><IconStar size={12} /> {entry.rating}</span>}</article>)}</div></section>}
    </section>
  )
}
