import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useDiary } from './lib/store.js'
import Library from './components/Library.jsx'
import Stats from './components/Stats.jsx'
import Settings from './components/Settings.jsx'
import Profile from './components/Profile.jsx'
import FollowListModal from './components/FollowListModal.jsx'
import UserSearchModal from './components/UserSearchModal.jsx'
import AddModal from './components/AddModal.jsx'
import DetailModal from './components/DetailModal.jsx'
import Top20Page from './components/Top20Page.jsx'
import Top20SwapModal from './components/Top20SwapModal.jsx'
import WatchlistPage from './components/WatchlistPage.jsx'
import NewsPage from './components/NewsPage.jsx'
import AddWatchlistModal from './components/AddWatchlistModal.jsx'
import WatchlistCleanupModal from './components/WatchlistCleanupModal.jsx'
import WatchlistDetailModal from './components/WatchlistDetailModal.jsx'
import RandomMovieModal from './components/RandomMovieModal.jsx'
import AuthPage, { AuthLoading } from './components/AuthPage.jsx'
import ArtworkPickerModal from './components/ArtworkPickerModal.jsx'
import HeroCoverModal from './components/profile/HeroCoverModal.jsx'
import Toast from './components/Toast.jsx'
import { movieKey } from './lib/store.js'
import { buildProfileStats, profileHero, profileRecent } from './lib/profile.js'
import { loadFollowProfiles, loadPublicProfile, loadSharedDiary, resolveFollowRequest, setFollowing, subscribeFollowRequests, subscribeFollowSummary } from './lib/store.js'

const TOP20_CAP = 20
import { IconPlus, IconFilm, IconChart, IconSettings, IconCrown, IconCloud, IconSearch, IconX } from './lib/icons.jsx'

const TABS = [
  { key: 'diary', label: 'Diary' },
  { key: 'watchlist', label: 'Watch list' },
  { key: 'top20', label: 'Top 20' },
  { key: 'stats', label: 'Stats' },
  { key: 'news', label: 'News' },
  { key: 'settings', label: 'Settings' },
]

const ACTIVE_TAB_KEY = 'reel.activeTab.v1'

function savedTab() {
  try {
    if (/^\/(?:profile|@[a-z0-9_]+)\/?$/i.test(window.location.pathname)) return 'profile'
    const value = localStorage.getItem(ACTIVE_TAB_KEY)
    return TABS.some((tab) => tab.key === value) || value === 'profile' ? value : 'diary'
  } catch {
    return 'diary'
  }
}

let toastSeq = 0

export default function App() {
  const diary = useDiary()
  const visibleTabs = diary.settings.showNews === false ? TABS.filter((item) => item.key !== 'news') : TABS
  const [tab, setTab] = useState(savedTab)
  const [adding, setAdding] = useState(false)
  const [addingToWatchlist, setAddingToWatchlist] = useState(false)
  const [activeWatchlistId, setActiveWatchlistId] = useState('my-watch-list')
  const [watchlistCleanup, setWatchlistCleanup] = useState(null)
  const [watchlistDetail, setWatchlistDetail] = useState(null)
  const [randomWatchlistId, setRandomWatchlistId] = useState(null)
  const [artworkPicker, setArtworkPicker] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [toasts, setToasts] = useState([])
  const [burst, setBurst] = useState(null)
  const [swapCandidate, setSwapCandidate] = useState(null)
  const [addSwapOutgoingId, setAddSwapOutgoingId] = useState(null)
  const [deferredSwap, setDeferredSwap] = useState(null)
  const [publicProfile, setPublicProfile] = useState({ status: 'idle', data: null })
  const [publicReload, setPublicReload] = useState(0)
  const [authIntent, setAuthIntent] = useState('signin')
  const [pathname, setPathname] = useState(() => window.location.pathname)
  const [social, setSocial] = useState(null)
  const [followList, setFollowList] = useState(null)
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [followRequests, setFollowRequests] = useState([])
  const [sharedDiary, setSharedDiary] = useState(null)
  const [mySocial, setMySocial] = useState(null)
  const [choosingCover, setChoosingCover] = useState(false)
  const routeUsername = pathname.match(/^\/@([a-z0-9_]+)\/?$/i)?.[1]?.toLowerCase() || ''

  const selectTab = useCallback((nextTab) => {
    if (pathname !== '/') window.history.pushState({}, '', '/')
    setPathname('/')
    setTab(nextTab)
  }, [pathname])

  const openProfile = useCallback(() => {
    const path = '/profile'
    if (pathname !== path) window.history.pushState({}, '', path)
    setPathname(path)
    setTab('profile')
  }, [pathname])

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname)
      setTab(/^\/(?:profile|@[a-z0-9_]+)\/?$/i.test(window.location.pathname) ? 'profile' : 'diary')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const viewingPublicProfile = !!routeUsername
  useEffect(() => {
    if (!viewingPublicProfile) return
    let active = true
    setPublicProfile({ status: 'loading', data: null })
    loadPublicProfile(routeUsername)
      .then((data) => { if (active) setPublicProfile({ status: data ? 'ready' : 'missing', data }) })
      .catch(() => { if (active) setPublicProfile({ status: 'error', data: null }) })
    return () => { active = false }
  }, [routeUsername, viewingPublicProfile, publicReload])

  useEffect(() => {
    const profileUid = publicProfile.data?.uid
    if (publicProfile.status !== 'ready' || !profileUid) { setSocial(null); return }
    return subscribeFollowSummary(profileUid, diary.user?.uid, setSocial, () => setSocial((current) => current || { followers: 0, following: 0, relationshipStatus: '', isFollowing: false, error: true }))
  }, [publicProfile.status, publicProfile.data?.uid, diary.user?.uid])

  useEffect(() => {
    if (!diary.user || !diary.cloudLoaded) return
    return subscribeFollowRequests(diary.user.uid, setFollowRequests)
  }, [diary.user?.uid, diary.cloudLoaded])

  useEffect(() => {
    if (!diary.user || !diary.cloudLoaded) { setMySocial(null); return }
    return subscribeFollowSummary(diary.user.uid, diary.user.uid, setMySocial)
  }, [diary.user?.uid, diary.cloudLoaded])

  useEffect(() => {
    setSharedDiary(null)
    if (social?.relationshipStatus !== 'accepted' || !publicProfile.data?.uid) return
    let active = true
    loadSharedDiary(publicProfile.data.uid).then((data) => { if (active) setSharedDiary(data) }).catch(() => {})
    return () => { active = false }
  }, [social?.relationshipStatus, publicProfile.data?.uid])

  const openFollowList = useCallback((kind, requestedProfileUid) => {
    const profileUid = requestedProfileUid || publicProfile.data?.uid
    if (!profileUid) return
    setFollowList({ kind, loading: true, profiles: [] })
    loadFollowProfiles(profileUid, kind)
      .then((profiles) => setFollowList({ kind, loading: false, profiles }))
      .catch(() => setFollowList({ kind, loading: false, profiles: [] }))
  }, [publicProfile.data?.uid])

  const visitPublicProfile = useCallback((username) => {
    const path = `/@${username}`
    window.history.pushState({}, '', path)
    setPathname(path)
    setTab('profile')
    setFollowList(null)
    setPublicProfile({ status: 'loading', data: null })
  }, [])

  const openAuth = useCallback((mode) => {
    setAuthIntent(mode)
    window.history.pushState({}, '', '/')
    setPathname('/')
    setTab('diary')
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = diary.settings.theme === 'light' ? 'light' : 'dark'
    document.documentElement.dataset.accent = diary.settings.accentScheme === 'candy' ? 'candy' : 'reel'
  }, [diary.settings.theme, diary.settings.accentScheme])

  // Remember the current section across reloads on this device.
  useEffect(() => {
    try { localStorage.setItem(ACTIVE_TAB_KEY, tab) } catch {}
    window.scrollTo({ top: 0 })
  }, [tab])

  useEffect(() => {
    if (diary.settings.showNews === false && tab === 'news') selectTab('stats')
  }, [diary.settings.showNews, selectTab, tab])

  const notify = useCallback((message, icon) => {
    const id = ++toastSeq
    setToasts((t) => [...t, { id, message, icon }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
  }, [])

  function fireBurst() {
    setBurst({ x: window.innerWidth / 2, y: window.innerHeight / 2, id: Date.now() })
    setTimeout(() => setBurst(null), 900)
  }

  const rankedTop20 = diary.entries
    .filter((e) => e.top20)
    .sort((a, b) => (a.top20Rank ?? Number.MAX_SAFE_INTEGER) - (b.top20Rank ?? Number.MAX_SAFE_INTEGER))
  const top20 = rankedTop20.filter((entry, index, list) =>
    list.findIndex((candidate) => movieKey(candidate) === movieKey(entry)) === index,
  )
  const profileStats = useMemo(() => buildProfileStats(diary.entries, diary.watchlists), [diary.entries, diary.watchlists])
  const profileRecentEntries = useMemo(() => profileRecent(diary.entries, 12), [diary.entries])
  const profileHeroCover = useMemo(() => profileHero(diary.entries, diary.settings.heroEntryId), [diary.entries, diary.settings.heroEntryId])

  // Turn a saved entry's Top 20 flag on, handling the full-list swap flow.
  const requestTop20Add = useCallback((candidate) => {
    const entry = typeof candidate === 'string'
      ? diary.entries.find((item) => item.id === candidate)
      : candidate
    if (!entry) return
    const entryId = entry.id
    const current = diary.entries
      .filter((e) => e.top20)
      .sort((a, b) => (a.top20Rank ?? Number.MAX_SAFE_INTEGER) - (b.top20Rank ?? Number.MAX_SAFE_INTEGER))
      .filter((entry, index, list) => list.findIndex((candidate) => movieKey(candidate) === movieKey(entry)) === index)
    const count = current.length
    if (count >= TOP20_CAP) {
      setSwapCandidate(entry)
    } else {
      diary.reorderTop20([...current.map((e) => e.id), entryId])
      diary.updateEntry(entryId, { top20: true, top20Rank: count + 1 })
      fireBurst()
      notify('Crowned for your Top 20', <IconCrown size={16} />)
    }
  }, [diary])

  const toggleTop20 = useCallback((entry) => {
    const existing = diary.entries.find((candidate) => candidate.top20 && movieKey(candidate) === movieKey(entry))
    if (existing) diary.updateEntry(existing.id, { top20: false })
    else requestTop20Add(entry)
  }, [diary, requestTop20Add])

  function confirmSwap(outgoingId) {
    const reordered = [
      ...top20.filter((entry) => entry.id !== outgoingId).map((entry) => entry.id),
      ...(swapCandidate ? [swapCandidate.id] : []),
    ]
    diary.reorderTop20(reordered)
    diary.updateEntry(outgoingId, { top20: false })
    if (swapCandidate) diary.updateEntry(swapCandidate.id, { top20: true, top20Rank: reordered.indexOf(swapCandidate.id) + 1 })
    setSwapCandidate(null)
    fireBurst()
    notify('Swapped into your Top 20', <IconCrown size={16} />)
  }

  function handleSave(entry) {
    const { top20SwapOutgoingId, ...diaryEntry } = entry
    const wantsTop20 = entry.top20
    const alreadyTop20 = diary.entries.some((candidate) => candidate.top20 && movieKey(candidate) === movieKey(entry))
    const watchlistMatches = diary.watchlists.flatMap((list) => list.items
      .filter((item) => movieKey(item) === movieKey(entry))
      .map((item) => ({ listId: list.id, listName: list.name, itemId: item.id })))
    const saved = diary.addEntry({ ...diaryEntry, top20: false })
    setAdding(false)
    setAddSwapOutgoingId(null)
    fireBurst()
    notify(`“${entry.title}” added to your diary`)
    if (top20SwapOutgoingId && !alreadyTop20) setDeferredSwap({ outgoingId: top20SwapOutgoingId, candidateId: saved.id })
    else if (wantsTop20 && !alreadyTop20) requestTop20Add(saved)
    if (watchlistMatches.length) setWatchlistCleanup({ title: entry.title, matches: watchlistMatches })
  }

  useEffect(() => {
    if (!deferredSwap || !diary.entries.some((entry) => entry.id === deferredSwap.candidateId)) return
    const reordered = [
      ...top20.filter((entry) => entry.id !== deferredSwap.outgoingId).map((entry) => entry.id),
      deferredSwap.candidateId,
    ]
    diary.reorderTop20(reordered)
    diary.updateEntry(deferredSwap.outgoingId, { top20: false })
    diary.updateEntry(deferredSwap.candidateId, { top20: true, top20Rank: reordered.length })
    setDeferredSwap(null)
    fireBurst()
    notify('Swapped into your Top 20', <IconCrown size={16} />)
  }, [deferredSwap, diary.entries])

  function handleWatchlistSave(title) {
    const activeList = diary.watchlists.find((list) => list.id === activeWatchlistId)
    const result = diary.addToWatchlist(activeWatchlistId, title)
    if (!result.added) {
      notify(`“${title.title}” is already on ${activeList?.name || 'this list'}`)
      return
    }
    setAddingToWatchlist(false)
    notify(`“${title.title}” added to ${activeList?.name || 'your list'}`, <IconPlus size={16} />)
  }

  useEffect(() => {
    if (!diary.watchlists.some((list) => list.id === activeWatchlistId)) {
      setActiveWatchlistId(diary.watchlists[0]?.id || 'my-watch-list')
    }
  }, [diary.watchlists, activeWatchlistId])

  // Keep the open detail modal in sync with the latest entry data.
  const liveDetail = detail ? diary.entries.find((e) => e.id === detail.id) || null : null
  const detailViewings = liveDetail
    ? diary.entries.filter((e) => movieKey(e) === movieKey(liveDetail)).sort((a, b) => (b.watchedDate || '').localeCompare(a.watchedDate || ''))
    : []
  const detailTop20Entry = liveDetail ? top20.find((entry) => movieKey(entry) === movieKey(liveDetail)) : null
  const displayDetail = liveDetail ? { ...liveDetail, top20: !!detailTop20Entry, top20Rank: detailTop20Entry?.top20Rank } : null
  const watchlistDetailList = watchlistDetail ? diary.watchlists.find((list) => list.id === watchlistDetail.listId) : null
  const liveWatchlistDetail = watchlistDetailList?.items.find((item) => item.id === watchlistDetail?.itemId) || null
  const randomWatchlist = randomWatchlistId ? diary.watchlists.find((list) => list.id === randomWatchlistId) : null
  const artworkEntry = artworkPicker?.kind === 'diary'
    ? diary.entries.find((entry) => entry.id === artworkPicker.itemId)
    : diary.watchlists.find((list) => list.id === artworkPicker?.listId)?.items.find((item) => item.id === artworkPicker?.itemId)
  const modalOpen = adding || addingToWatchlist || !!watchlistCleanup || !!liveWatchlistDetail || !!randomWatchlist?.items.length || !!artworkEntry || !!liveDetail || !!swapCandidate || !!followList || searchingUsers || choosingCover || mobileMenuOpen

  useEffect(() => {
    if (!modalOpen) return
    const isInsideModal = (target) => target instanceof Element && !!target.closest('.modal, .swap-panel')
    const stopBackgroundScroll = (event) => {
      if (!isInsideModal(event.target)) event.preventDefault()
    }
    const stopBackgroundKeys = (event) => {
      if (isInsideModal(event.target)) return
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) event.preventDefault()
    }
    document.addEventListener('wheel', stopBackgroundScroll, { passive: false })
    document.addEventListener('touchmove', stopBackgroundScroll, { passive: false })
    document.addEventListener('keydown', stopBackgroundKeys)
    return () => {
      document.removeEventListener('wheel', stopBackgroundScroll)
      document.removeEventListener('touchmove', stopBackgroundScroll)
      document.removeEventListener('keydown', stopBackgroundKeys)
    }
  }, [modalOpen])

  const addPlatform = useCallback((p) => {
    diary.setSettings((s) => ({ ...s, platforms: s.platforms.some((x) => x.toLowerCase() === p.toLowerCase()) ? s.platforms : [...s.platforms, p] }))
  }, [diary])
  const addPerson = useCallback((p) => {
    diary.setSettings((s) => ({ ...s, people: s.people.some((x) => x.toLowerCase() === p.toLowerCase()) ? s.people : [...s.people, p] }))
  }, [diary])

  if (viewingPublicProfile) {
    const data = publicProfile.data
    return (
      <div className="app public-app">
        <header className="header public-header">
          <button className="brand public-brand" type="button" onClick={() => diary.user ? selectTab('diary') : openAuth('signin')} aria-label="Reel home">
            <span className="brand-mark"><IconFilm size={22} color="#14110a" /></span>
            <span className="brand-name">Reel<span className="dot">.</span></span>
          </button>
          {diary.authReady && diary.user && (
            <>
              <button className="mobile-menu-button" onClick={() => { selectTab('diary'); setMobileMenuOpen(true) }} aria-label="Open navigation">
                <span /><span /><span />
              </button>
              <nav className="nav" aria-label="Account navigation">
                {TABS.map((item) => <button key={item.key} onClick={() => selectTab(item.key)}>{item.label}</button>)}
              </nav>
            </>
          )}
          <div className="header-spacer" />
          <button className="header-user-search" type="button" onClick={() => setSearchingUsers(true)} aria-label="Search for users" title="Find people"><IconSearch size={18} /><span>Find people</span></button>
          {diary.authReady && diary.user ? (
            <>
              <button className="account-chip" onClick={openProfile} aria-label="Open my profile" title={`Synced as ${diary.user.email || diary.user.displayName}`}>
                {diary.user.photoURL
                  ? <img src={diary.user.photoURL} alt="" referrerPolicy="no-referrer" />
                  : <span className="account-initial">{(diary.user.displayName || diary.user.email || '?')[0].toUpperCase()}</span>}
                <span className={`sync-dot ${diary.syncStatus}`} />
              </button>
              <button className="btn btn-primary" type="button" onClick={() => { selectTab('diary'); setAdding(true) }}><IconPlus size={17} /> <span className="add-label">Add watch</span></button>
            </>
          ) : (
            <div className="public-auth-actions">
              <button className="btn btn-ghost" type="button" onClick={() => openAuth('signin')}>Log in</button>
              <button className="btn btn-primary" type="button" onClick={() => openAuth('create')}>Create account</button>
            </div>
          )}
        </header>
        {publicProfile.status === 'ready' ? (
          <main className="public-profile-shell">
            <Profile
              user={{ displayName: data.displayName, photoURL: data.photoURL }}
              username={data.username}
              stats={data.stats}
              hero={data.hero}
              top20={data.top20 || []}
              recent={data.recent || []}
              diaryEntries={sharedDiary?.entries || null}
              social={social}
              onFollowers={() => openFollowList('followers')}
              onFollowing={() => openFollowList('following')}
              onFollow={data.uid !== diary.user?.uid ? async () => {
                if (!diary.user) { openAuth('signin'); return }
                const previousStatus = social?.relationshipStatus || ''
                const next = !previousStatus
                setSocial((current) => ({ ...(current || { followers: 0, following: 0 }), busy: true }))
                try {
                  await setFollowing(data.uid, next)
                  setSocial((current) => ({ ...current, busy: false, relationshipStatus: next ? 'pending' : '', isFollowing: false, followers: Math.max(0, current.followers - (!next && previousStatus === 'accepted' ? 1 : 0)) }))
                } catch {
                  setSocial((current) => ({ ...current, busy: false }))
                }
              } : null}
            />
          </main>
        ) : publicProfile.status === 'missing' ? (
          <main className="public-profile-message"><h1>Profile not found</h1><p>There’s no public Reel profile at /@{routeUsername}.</p></main>
        ) : publicProfile.status === 'error' ? (
          <main className="public-profile-message"><h1>Couldn’t load this profile</h1><p>Check your connection and try again.</p><button className="btn btn-primary" type="button" onClick={() => setPublicReload((value) => value + 1)}>Try again</button></main>
        ) : (
          <main className="public-profile-loading"><span className="public-profile-loader" /><span>Loading @{routeUsername}</span></main>
        )}
        <AnimatePresence>
          {searchingUsers && <UserSearchModal key="user-search-modal" onClose={() => setSearchingUsers(false)} onSelect={(username) => { setSearchingUsers(false); visitPublicProfile(username) }} />}
          {followList && <FollowListModal key="follow-list-modal" kind={followList.kind} profiles={followList.profiles} loading={followList.loading} onClose={() => setFollowList(null)} onSelect={visitPublicProfile} />}
        </AnimatePresence>
      </div>
    )
  }

  if (diary.cloudEnabled && !diary.authReady) return <AuthLoading />
  if (diary.cloudEnabled && !diary.user) {
    return (
      <AuthPage
        initialMode={authIntent}
        onGoogle={diary.signIn}
        onSignIn={diary.signInEmail}
        onCreateAccount={diary.createAccount}
        onResetPassword={diary.resetPassword}
      />
    )
  }
  if (diary.cloudEnabled && diary.user && !diary.cloudLoaded) return <AuthLoading />

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-mark">
            <IconFilm size={22} color="#14110a" />
          </span>
          <span className="brand-name">Reel<span className="dot">.</span></span>
          <span className="brand-version" title="Deployed app version">{__APP_VERSION__}</span>
        </div>

        <button className="mobile-menu-button" onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation" aria-expanded={mobileMenuOpen}>
          <span /><span /><span />
        </button>

        <nav className="nav">
          {visibleTabs.map((t) => (
            <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => selectTab(t.key)}>
              {tab === t.key && <span className="pill" />}
              {t.label}
            </button>
          ))}
        </nav>

        <div className="header-spacer" />

        <button className="header-user-search" type="button" onClick={() => setSearchingUsers(true)} aria-label="Search for users" title="Find people"><IconSearch size={18} /><span>Find people</span></button>

        {diary.cloudEnabled && (
          !diary.authReady ? (
            <span className="account-chip account-chip-loading" aria-hidden="true" />
          ) : diary.user ? (
            <button
              className="account-chip"
              onClick={openProfile}
              aria-label="Open profile"
              title={`Synced as ${diary.user.email || diary.user.displayName}`}
            >
              {diary.user.photoURL ? (
                <img src={diary.user.photoURL} alt="" referrerPolicy="no-referrer" />
              ) : (
                <span className="account-initial">
                  {(diary.user.displayName || diary.user.email || '?')[0].toUpperCase()}
                </span>
              )}
              <span className={`sync-dot ${diary.syncStatus}`} />
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={() => diary.signIn()?.catch((error) => notify(error?.message || 'Could not sign in'))}>
              <IconCloud size={16} /> Sign in
            </button>
          )
        )}

        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <IconPlus size={17} /> <span className="add-label">Add watch</span>
        </button>
      </header>

      <main className="container">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {tab === 'diary' && (
              <Library entries={diary.entries} onOpen={setDetail} onAdd={() => setAdding(true)} />
            )}
            {tab === 'watchlist' && (
              <WatchlistPage
                lists={diary.watchlists}
                activeListId={activeWatchlistId}
                onSelectList={setActiveWatchlistId}
                onCreateList={(name) => {
                  const list = diary.createWatchlist(name)
                  if (list) { setActiveWatchlistId(list.id); notify(`“${list.name}” created`) }
                  return list
                }}
                onAdd={() => setAddingToWatchlist(true)}
                onRandom={() => setRandomWatchlistId(activeWatchlistId)}
                onOpen={(item) => setWatchlistDetail({ listId: activeWatchlistId, itemId: item.id })}
                onRemove={(item) => { diary.removeFromWatchlist(activeWatchlistId, item.id); notify(`“${item.title}” removed from this list`) }}
              />
            )}
            {tab === 'news' && <NewsPage />}
            {tab === 'top20' && (
              <Top20Page entries={top20} onOpen={setDetail} onReorder={diary.reorderTop20} />
            )}
            {tab === 'stats' && <Stats entries={diary.entries} tmdbKey={diary.settings.tmdbKey} onUpdate={diary.updateEntry} />}
            {tab === 'profile' && (
              <Profile
                owner
                user={diary.user}
                username={diary.settings.username}
                stats={profileStats}
                hero={profileHeroCover}
                top20={top20}
                recent={profileRecentEntries}
                diaryEntries={diary.entries}
                onOpen={setDetail}
                onSettings={() => selectTab('settings')}
                onChangeCover={() => setChoosingCover(true)}
                updateAvatar={diary.user ? diary.updateAvatar : null}
                updateDisplayName={diary.updateDisplayName}
                updateUsername={diary.updateUsername}
                onUsernameChanged={() => { window.history.replaceState({}, '', '/profile'); setPathname('/profile') }}
                notify={notify}
                social={mySocial}
                onFollowers={() => openFollowList('followers', diary.user.uid)}
                onFollowing={() => openFollowList('following', diary.user.uid)}
                followRequests={followRequests}
                onResolveRequest={async (request, accept) => {
                  try {
                    await resolveFollowRequest(request.uid, accept)
                    setFollowRequests((current) => current.filter((item) => item.uid !== request.uid))
                    notify(accept ? `@${request.username} can now view your diary` : `Declined @${request.username}`)
                  } catch (error) {
                    notify(error?.message || 'Could not update this request')
                  }
                }}
              />
            )}
            {tab === 'settings' && (
              <Settings
                settings={diary.settings}
                setSettings={diary.setSettings}
                entries={diary.entries}
                watchlists={diary.watchlists}
                replaceAll={diary.replaceAll}
                restoreBackup={diary.restoreBackup}
                clearAllData={diary.clearAllData}
                importEntries={diary.importEntries}
                notify={notify}
                cloudEnabled={diary.cloudEnabled}
                user={diary.user}
                syncStatus={diary.syncStatus}
                syncError={diary.syncError}
                signIn={diary.signIn}
                signOut={diary.signOut}
                saveToCloud={diary.saveToCloud}
                updateAvatar={diary.updateAvatar}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {searchingUsers && (
          <UserSearchModal key="user-search-modal" onClose={() => setSearchingUsers(false)} onSelect={(username) => { setSearchingUsers(false); visitPublicProfile(username) }} />
        )}
        {choosingCover && (
          <HeroCoverModal
            key="hero-cover-modal"
            entries={diary.entries}
            pinnedId={diary.settings.heroEntryId || ''}
            onClose={() => setChoosingCover(false)}
            onSelect={(entry) => {
              diary.setSettings((current) => ({ ...current, heroEntryId: entry?.id || '' }))
              setChoosingCover(false)
              notify(entry ? `“${entry.title}” now fronts your profile` : 'Cover set back to automatic')
            }}
          />
        )}
        {followList && (
          <FollowListModal key="follow-list-modal" kind={followList.kind} profiles={followList.profiles} loading={followList.loading} onClose={() => setFollowList(null)} onSelect={visitPublicProfile} />
        )}
        {mobileMenuOpen && (
          <motion.div className="mobile-menu-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileMenuOpen(false)}>
            <motion.aside className="mobile-menu" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 360, damping: 34 }} onClick={(e) => e.stopPropagation()}>
              <div className="mobile-menu-head">
                <div className="brand">
                  <span className="brand-mark"><IconFilm size={22} color="#14110a" /></span>
                  <span className="brand-name">Reel<span className="dot">.</span></span>
                  <span className="brand-version" title="Deployed app version">{__APP_VERSION__}</span>
                </div>
                <button className="icon-btn" onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation"><IconX size={19} /></button>
              </div>
              <nav className="mobile-menu-nav" aria-label="Mobile navigation">
                <button type="button" onClick={() => { setMobileMenuOpen(false); setSearchingUsers(true) }}>Find people <IconSearch size={18} /></button>
                {visibleTabs.map((item) => (
                  <button key={item.key} className={tab === item.key ? 'active' : ''} onClick={() => { selectTab(item.key); setMobileMenuOpen(false) }}>
                    <span>{item.label}</span>
                    {tab === item.key && <span className="mobile-menu-current">Current</span>}
                  </button>
                ))}
              </nav>
              <button className="btn btn-primary mobile-menu-add" onClick={() => { setMobileMenuOpen(false); setAdding(true) }}><IconPlus size={17} /> Add watch</button>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {adding && (
          <AddModal
            key="add-modal"
            entries={diary.entries}
            tmdbKey={diary.settings.tmdbKey}
            platforms={diary.settings.platforms}
            people={diary.settings.people}
            top20Full={top20.length >= TOP20_CAP}
            top20SwapOutgoingId={addSwapOutgoingId}
            onRequestTop20Swap={(entry) => setSwapCandidate({ ...entry, id: 'pending-add' })}
            onClearTop20Swap={() => setAddSwapOutgoingId(null)}
            onAddPlatform={addPlatform}
            onAddPerson={addPerson}
            onClose={() => { setAdding(false); setAddSwapOutgoingId(null) }}
            onSave={handleSave}
          />
        )}
        {addingToWatchlist && (
          <AddWatchlistModal
            key="add-watchlist-modal"
            tmdbKey={diary.settings.tmdbKey}
            onClose={() => setAddingToWatchlist(false)}
            onSave={handleWatchlistSave}
          />
        )}
        {watchlistCleanup && !swapCandidate && (
          <WatchlistCleanupModal
            key="watchlist-cleanup-modal"
            title={watchlistCleanup.title}
            matches={watchlistCleanup.matches}
            onKeep={() => setWatchlistCleanup(null)}
            onRemove={(selectedMatches) => {
              selectedMatches.forEach((match) => diary.removeFromWatchlist(match.listId, match.itemId))
              notify(`Removed “${watchlistCleanup.title}” from ${selectedMatches.length === 1 ? selectedMatches[0].listName : `${selectedMatches.length} watch lists`}`)
              setWatchlistCleanup(null)
            }}
          />
        )}
        {liveWatchlistDetail && (
          <WatchlistDetailModal
            key="watchlist-detail-modal"
            item={liveWatchlistDetail}
            listName={watchlistDetailList.name}
            tmdbKey={diary.settings.tmdbKey}
            nestedOpen={!!artworkEntry}
            onClose={() => setWatchlistDetail(null)}
            onChangeArtwork={(item) => setArtworkPicker({ kind: 'watchlist', listId: watchlistDetail.listId, itemId: item.id })}
            onUpdate={(patch) => diary.updateWatchlistItem(watchlistDetail.listId, watchlistDetail.itemId, patch)}
          />
        )}
        {randomWatchlist?.items.length > 0 && (
          <RandomMovieModal key="random-movie-modal" items={randomWatchlist.items} listName={randomWatchlist.name} onClose={() => setRandomWatchlistId(null)} />
        )}
        {displayDetail && (
          <DetailModal
            key="detail-modal"
            entry={displayDetail}
            viewings={detailViewings}
            tmdbKey={diary.settings.tmdbKey}
            platforms={diary.settings.platforms}
            people={diary.settings.people}
            top20Full={top20.length >= TOP20_CAP && !displayDetail.top20}
            nestedOpen={!!artworkEntry}
            onAddPlatform={addPlatform}
            onAddPerson={addPerson}
            onToggleTop20={toggleTop20}
            onSelectViewing={setDetail}
            onChangeArtwork={(entry) => setArtworkPicker({ kind: 'diary', itemId: entry.id })}
            onClose={() => setDetail(null)}
            onUpdate={diary.updateEntry}
            onDelete={(id) => { diary.removeEntry(id); setDetail(null); notify('Removed from diary') }}
          />
        )}
        {artworkEntry && (
          <ArtworkPickerModal
            key="artwork-picker-modal"
            entry={artworkEntry}
            tmdbKey={diary.settings.tmdbKey}
            canUpload={!!diary.user}
            onUpload={(file) => diary.uploadPoster(file, artworkEntry.id)}
            onClose={() => setArtworkPicker(null)}
            onSelect={(patch) => {
              if (artworkPicker.kind === 'diary') diary.updateMovieArtwork(artworkPicker.itemId, patch)
              else diary.updateWatchlistItem(artworkPicker.listId, artworkPicker.itemId, patch)
              notify(`Poster updated for “${artworkEntry.title}”`)
              setArtworkPicker(null)
            }}
          />
        )}
        {swapCandidate && (
          <Top20SwapModal
            key="swap-modal"
            candidate={swapCandidate}
            top20={top20}
            onReplace={(outgoingId) => {
              if (swapCandidate.id === 'pending-add') {
                setAddSwapOutgoingId(outgoingId)
                setSwapCandidate(null)
              } else confirmSwap(outgoingId)
            }}
            onCancel={() => setSwapCandidate(null)}
          />
        )}
      </AnimatePresence>

      {burst && <Burst x={burst.x} y={burst.y} key={burst.id} />}

      <Toast toasts={toasts} />
    </div>
  )
}

// A quick particle burst for that satisfying "logged it" moment.
function Burst({ x, y }) {
  const colors = ['#f5b942', '#ff8a3d', '#ff4d6d', '#ffd787', '#ffffff']
  const bits = Array.from({ length: 26 }, (_, i) => {
    const angle = (i / 26) * Math.PI * 2
    const dist = 90 + (i % 5) * 26
    return {
      i,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      color: colors[i % colors.length],
      rot: (i % 2 ? 1 : -1) * 220,
    }
  })
  return (
    <div className="burst" style={{ left: x, top: y }}>
      {bits.map((b) => (
        <motion.span
          key={b.i}
          style={{ background: b.color }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
          animate={{ x: b.dx, y: b.dy, opacity: 0, scale: 0.4, rotate: b.rot }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </div>
  )
}
