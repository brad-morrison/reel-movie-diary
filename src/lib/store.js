import { useCallback, useEffect, useRef, useState } from 'react'
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
} from 'firebase/auth'
import { collection, deleteDoc, doc, getDoc, getDocFromServer, getDocs, onSnapshot, query, runTransaction, setDoc, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { auth, db, googleProvider, isFirebaseConfigured } from './firebase.js'
import { SAMPLE_ENTRIES } from './sample.js'
import { collectCatalogs } from './csv.js'
import { uploadPosterImage, uploadProfileImage } from './uploads.js'

const ENTRIES_KEY = 'reel.entries.v1'
const SETTINGS_KEY = 'reel.settings.v1'
const WATCHLIST_KEY = 'reel.watchlist.v1'
const ACCOUNT_CACHE_PREFIX = 'reel.account.v1.'

const DEFAULT_PLATFORMS = ['Netflix', 'Disney+', 'Prime', 'Apple TV+', 'Cinema']
const DEFAULT_SETTINGS = { theme: 'dark', accentScheme: 'reel', tmdbKey: '', platforms: DEFAULT_PLATFORMS, people: [], seeded: true, ratingScale: 10 }

export const normalizeUsername = (value = '') => value.trim().toLowerCase().replace(/^@+/, '')

export function usernameError(value) {
  const username = normalizeUsername(value)
  if (username.length < 3) return 'Use at least 3 characters'
  if (username.length > 24) return 'Use no more than 24 characters'
  if (!/^[a-z0-9_]+$/.test(username)) return 'Use letters, numbers, and underscores only'
  if (/^[_]|[_]$/.test(username)) return 'A username cannot start or end with an underscore'
  return ''
}

function publicEntry(entry) {
  return {
    id: entry.id,
    title: entry.title || '',
    year: entry.year || '',
    type: entry.type || 'movie',
    poster: entry.poster || '',
    rating: Number(entry.rating) || 0,
    watchedDate: entry.watchedDate || '',
    top20: !!entry.top20,
    top20Rank: entry.top20Rank || null,
  }
}

function publicProfilePayload(user, username, entries, watchlists) {
  const uniqueTitles = new Set(entries.map((entry) => movieKey(entry))).size
  const rated = entries.filter((entry) => Number(entry.rating) > 0)
  const top20 = entries.filter((entry) => entry.top20).sort((a, b) => (a.top20Rank || 99) - (b.top20Rank || 99)).slice(0, 20).map(publicEntry)
  const recent = [...entries].sort((a, b) => (b.watchedDate || b.createdAt || '').localeCompare(a.watchedDate || a.createdAt || '')).slice(0, 5).map(publicEntry)
  return {
    uid: user.uid,
    username,
    displayName: user.displayName || user.email?.split('@')[0] || 'Film lover',
    photoURL: user.photoURL || '',
    stats: {
      watches: entries.length,
      uniqueTitles,
      averageRating: rated.length ? Number((rated.reduce((sum, entry) => sum + Number(entry.rating), 0) / rated.length).toFixed(1)) : null,
      watchlistCount: watchlists.reduce((sum, list) => sum + list.items.length, 0),
    },
    top20,
    recent,
  }
}

export async function loadPublicProfile(username) {
  if (!db) return null
  const snapshot = await getDocFromServer(doc(db, 'publicProfiles', normalizeUsername(username)))
  return snapshot.exists() ? snapshot.data() : null
}

const followId = (followerUid, followedUid) => `${followerUid}_${followedUid}`

export async function loadFollowSummary(profileUid, viewerUid) {
  if (!db || !profileUid) return { followers: 0, following: 0, isFollowing: false }
  const follows = collection(db, 'follows')
  const [followersSnapshot, followingSnapshot, relationship] = await Promise.all([
    getDocs(query(follows, where('followedUid', '==', profileUid), where('status', '==', 'accepted'))),
    getDocs(query(follows, where('followerUid', '==', profileUid), where('status', '==', 'accepted'))),
    viewerUid && viewerUid !== profileUid ? getDoc(doc(db, 'follows', followId(viewerUid, profileUid))) : null,
  ])
  const relationshipStatus = relationship?.exists() ? (relationship.data()?.status || 'pending') : ''
  return {
    followers: followersSnapshot.size,
    following: followingSnapshot.size,
    relationshipStatus,
    isFollowing: relationshipStatus === 'accepted',
  }
}

export function subscribeFollowSummary(profileUid, viewerUid, onChange, onError = () => {}) {
  if (!db || !profileUid) return () => {}
  const state = { followers: 0, following: 0, relationshipStatus: '', isFollowing: false }
  const emit = () => onChange({ ...state })
  const follows = collection(db, 'follows')
  const unsubscribers = [
    onSnapshot(query(follows, where('followedUid', '==', profileUid), where('status', '==', 'accepted')), (snapshot) => { state.followers = snapshot.size; emit() }, onError),
    onSnapshot(query(follows, where('followerUid', '==', profileUid), where('status', '==', 'accepted')), (snapshot) => { state.following = snapshot.size; emit() }, onError),
  ]
  if (viewerUid && viewerUid !== profileUid) {
    unsubscribers.push(onSnapshot(doc(db, 'follows', followId(viewerUid, profileUid)), (snapshot) => {
      state.relationshipStatus = snapshot.exists() ? (snapshot.data()?.status || 'pending') : ''
      state.isFollowing = state.relationshipStatus === 'accepted'
      emit()
    }, onError))
  }
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
}

export async function setFollowing(profileUid, shouldFollow) {
  const viewer = auth?.currentUser
  if (!viewer) throw new Error('Sign in to follow people')
  if (viewer.uid === profileUid) throw new Error('You cannot follow yourself')
  const ref = doc(db, 'follows', followId(viewer.uid, profileUid))
  if (shouldFollow) await setDoc(ref, { followerUid: viewer.uid, followedUid: profileUid, status: 'pending', createdAt: serverTimestamp() })
  else await deleteDoc(ref)
  return shouldFollow
}

export async function loadFollowProfiles(profileUid, kind) {
  if (!db || !profileUid) return []
  const isFollowers = kind === 'followers'
  const snapshot = await getDocs(query(collection(db, 'follows'), where(isFollowers ? 'followedUid' : 'followerUid', '==', profileUid), where('status', '==', 'accepted')))
  const uids = [...new Set(snapshot.docs.map((item) => item.data()?.[isFollowers ? 'followerUid' : 'followedUid']).filter(Boolean))]
  if (!uids.length) return []
  const profiles = []
  for (let index = 0; index < uids.length; index += 30) {
    const chunk = uids.slice(index, index + 30)
    const matches = await getDocs(query(collection(db, 'publicProfiles'), where('uid', 'in', chunk)))
    profiles.push(...matches.docs.map((item) => item.data()))
  }
  return profiles.sort((a, b) => (a.displayName || a.username).localeCompare(b.displayName || b.username))
}

export async function loadFollowRequests(profileUid) {
  if (!db || !profileUid) return []
  const snapshot = await getDocs(query(collection(db, 'follows'), where('followedUid', '==', profileUid)))
  const pending = snapshot.docs.filter((item) => (item.data()?.status || 'pending') === 'pending')
  if (!pending.length) return []
  const uids = pending.map((item) => item.data().followerUid)
  const profiles = []
  for (let index = 0; index < uids.length; index += 30) {
    const matches = await getDocs(query(collection(db, 'publicProfiles'), where('uid', 'in', uids.slice(index, index + 30))))
    profiles.push(...matches.docs.map((item) => item.data()))
  }
  return profiles
}

export function subscribeFollowRequests(profileUid, onChange, onError = () => {}) {
  if (!db || !profileUid) return () => {}
  let sequence = 0
  return onSnapshot(query(collection(db, 'follows'), where('followedUid', '==', profileUid)), async (snapshot) => {
    const currentSequence = ++sequence
    const uids = snapshot.docs.filter((item) => (item.data()?.status || 'pending') === 'pending').map((item) => item.data().followerUid)
    if (!uids.length) { onChange([]); return }
    try {
      const profiles = []
      for (let index = 0; index < uids.length; index += 30) {
        const matches = await getDocs(query(collection(db, 'publicProfiles'), where('uid', 'in', uids.slice(index, index + 30))))
        profiles.push(...matches.docs.map((item) => item.data()))
      }
      if (currentSequence === sequence) onChange(profiles)
    } catch (error) { onError(error) }
  }, onError)
}

export async function resolveFollowRequest(followerUid, accept) {
  const owner = auth?.currentUser
  if (!owner) throw new Error('Sign in to manage follow requests')
  const ref = doc(db, 'follows', followId(followerUid, owner.uid))
  if (accept) await updateDoc(ref, { status: 'accepted', acceptedAt: serverTimestamp() })
  else await deleteDoc(ref)
}

export async function loadSharedDiary(profileUid) {
  if (!db || !profileUid || !auth?.currentUser) return null
  const snapshot = await getDocFromServer(doc(db, 'sharedDiaries', profileUid))
  return snapshot.exists() ? snapshot.data() : null
}

function sharedEntry(entry) {
  const allowed = ['id', 'title', 'year', 'type', 'poster', 'backdrop', 'rating', 'watchedDate', 'createdAt', 'top20', 'top20Rank', 'genres', 'overview', 'firstTime', 'review', 'notes']
  return Object.fromEntries(allowed.filter((key) => entry[key] !== undefined).map((key) => [key, entry[key]]))
}

// A viewing has its own entry, while title-level details (such as the user's
// rating) are shared by every viewing of the same film or show.
export function movieKey(entry) {
  const title = (entry.title || '').trim().toLowerCase().replace(/\s+/g, ' ')
  // Title/year/type remains stable when an imported entry is later enriched
  // with a TMDB id. Using tmdbId first split those two versions of the same
  // movie, which disconnected Top 20 rank from its shared rating.
  if (title) return `title:${entry.type || 'movie'}:${title}:${entry.year || ''}`
  return `tmdb:${entry.type || 'movie'}:${entry.tmdbId || ''}`
}

function syncSharedRatings(entries) {
  const ratings = new Map()
  for (const entry of entries) {
    if (Number(entry.rating) > 0 && !ratings.has(movieKey(entry))) ratings.set(movieKey(entry), Number(entry.rating))
  }
  return entries.map((entry) => ({ ...entry, rating: ratings.get(movieKey(entry)) || 0 }))
}

// Diaries created before the 10-point control stored ratings out of five.
// The settings marker makes this a one-time, lossless migration locally and in
// Firestore: 4.5/5 becomes 9/10, for example.
function migrateRatings(entries, ratingScale) {
  if (Number(ratingScale) === 10) return entries
  return entries.map((entry) => ({
    ...entry,
    rating: Number(entry.rating) > 0 ? Math.min(10, Number(entry.rating) * 2) : 0,
  }))
}

// Strip undefined optional fields before sending imported data to Firestore.
// Keeping this explicit also makes the value used for sync comparisons exactly
// match the value Firebase receives.
function cloudPayload(entries, settings, watchlists) {
  return JSON.parse(JSON.stringify({ entries, settings, watchlists }))
}

const uniqMerge = (a = [], b = []) => {
  const seen = new Set(a.map((x) => x.toLowerCase()))
  const out = [...a]
  for (const x of b) if (x && !seen.has(x.toLowerCase())) { seen.add(x.toLowerCase()); out.push(x) }
  return out
}

// Fill in fields on an existing entry from a freshly-imported one without
// clobbering the user's edits or previously-fetched artwork.
function mergeEntry(existing, inc) {
  const companions = uniqMerge(existing.companions, inc.companions)
  return {
    ...existing,
    platform: existing.platform || inc.platform || '',
    companions,
    firstTime: existing.firstTime ?? inc.firstTime ?? true,
    myScore: existing.myScore ?? inc.myScore,
    imdbRating: existing.imdbRating ?? inc.imdbRating,
    rating: existing.rating || inc.rating || 0,
    genres: existing.genres?.length ? existing.genres : (inc.genres || []),
  }
}

function normalizeEntry(entry) {
  const { liked: _liked, rewatch, notes: _notes, ...rest } = entry
  return { ...rest, firstTime: entry.firstTime ?? !rewatch }
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

const DEFAULT_WATCHLIST_ID = 'my-watch-list'

// Version one stored one flat array. Wrap it as the default named list so
// existing local and cloud data moves forward without losing a title.
function normalizeWatchlists(value) {
  if (Array.isArray(value) && value.some((list) => Array.isArray(list?.items))) {
    return value.map((list) => ({ ...list, items: Array.isArray(list.items) ? list.items : [] }))
  }
  return [{ id: DEFAULT_WATCHLIST_ID, name: 'My watch list', createdAt: new Date(0).toISOString(), items: Array.isArray(value) ? value : [] }]
}

export function useDiary() {
  const [entries, setEntries] = useState(() => {
    const stored = load(ENTRIES_KEY, null)
    if (stored) {
      const storedSettings = load(SETTINGS_KEY, {})
      return syncSharedRatings(migrateRatings(stored.map(normalizeEntry), storedSettings.ratingScale))
    }
    // First run — seed with a few nice examples so the app looks alive.
    return syncSharedRatings(SAMPLE_ENTRIES.map(normalizeEntry))
  })

  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...load(SETTINGS_KEY, {}),
  }))
  const [watchlists, setWatchlists] = useState(() => normalizeWatchlists(load(WATCHLIST_KEY, [])))

  // ---- Cloud sync (Firebase) --------------------------------------------
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured)
  const [syncStatus, setSyncStatus] = useState('idle') // idle | saving | synced | error
  const [syncError, setSyncError] = useState('')
  const [cloudLoaded, setCloudLoaded] = useState(false) // has this user's doc arrived?
  const [serverConfirmed, setServerConfirmed] = useState(false) // safe to push writes?

  const entriesRef = useRef(entries)
  entriesRef.current = entries
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const watchlistsRef = useRef(watchlists)
  watchlistsRef.current = watchlists
  const lastSyncedRef = useRef(null) // JSON of the last data exchanged with the cloud

  // Track who's signed in.
  useEffect(() => {
    if (!isFirebaseConfigured) return
    return onAuthStateChanged(
      auth,
      (u) => {
        // localStorage is shared by every account on this browser, so never
        // hydrate private UI from it during authentication. The UID-specific
        // Firestore listener below is the only source allowed to unlock data.
        if (u) {
          setEntries([])
          setSettings({ ...DEFAULT_SETTINGS })
          setWatchlists(normalizeWatchlists([]))
          setCloudLoaded(false)
          setServerConfirmed(false)
          lastSyncedRef.current = null
        }
        setUser(u)
        setAuthReady(true)
      },
      () => setAuthReady(true),
    )
  }, [])

  // Subscribe to the signed-in user's diary doc. First sign-in (no doc yet)
  // migrates this browser's local data up to the cloud.
  useEffect(() => {
    if (!isFirebaseConfigured || !user) {
      setCloudLoaded(false)
      setServerConfirmed(false)
      setSyncStatus('idle')
      setSyncError('')
      return
    }
    setCloudLoaded(false)
    setServerConfirmed(false)
    setSyncStatus('saving')
    const ref = doc(db, 'diaries', user.uid)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        // Cached snapshots may render the UI (including offline localhost),
        // but they must never unlock cloud writes. Only the server snapshot
        // below can make this client authoritative.
        if (snap.metadata.fromCache) {
          if (snap.exists()) {
            const data = snap.data() || {}
            const cachedEntries = Array.isArray(data.entries)
              ? syncSharedRatings(migrateRatings(data.entries.map(normalizeEntry), data.settings?.ratingScale))
              : entriesRef.current
            const cachedSettings = { ...DEFAULT_SETTINGS, ...(data.settings || settingsRef.current) }
            const cachedLists = Array.isArray(data.watchlists)
              ? normalizeWatchlists(data.watchlists)
              : watchlistsRef.current
            setEntries(cachedEntries)
            setSettings(cachedSettings)
            setWatchlists(cachedLists)
            setCloudLoaded(true)
          }
          return
        }
        setServerConfirmed(true)
        if (!snap.exists()) {
          // A missing document means this is a genuinely new account. Never
          // seed it from the last account's browser cache: that would leak one
          // person's diary into another person's account on a shared device.
          const freshEntries = []
          const freshSettings = { ...DEFAULT_SETTINGS }
          const freshWatchlists = normalizeWatchlists([])
          const payload = cloudPayload(freshEntries, freshSettings, freshWatchlists)
          setEntries(freshEntries)
          setSettings(freshSettings)
          setWatchlists(freshWatchlists)
          setDoc(ref, { ...payload, updatedAt: serverTimestamp() })
            .then(() => {
              lastSyncedRef.current = JSON.stringify(payload)
              setCloudLoaded(true)
              setSyncError('')
              setSyncStatus('synced')
            })
            .catch((error) => {
              console.error('Initial cloud save failed', error)
              setSyncError(error?.message || 'Cloud save failed')
              setSyncStatus('error')
            })
          return
        }
        const data = snap.data() || {}
        const nextEntries = Array.isArray(data.entries)
          ? syncSharedRatings(migrateRatings(data.entries.map(normalizeEntry), data.settings?.ratingScale))
          : []
        const nextSettings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) }
        // Accept both the old flat watchlist and the new named-list model.
        const cloudLists = Array.isArray(data.watchlists) ? data.watchlists : data.watchlist
        const nextWatchlists = Array.isArray(cloudLists) ? normalizeWatchlists(cloudLists) : watchlistsRef.current
        lastSyncedRef.current = Array.isArray(data.watchlists)
          ? JSON.stringify(cloudPayload(nextEntries, nextSettings, nextWatchlists))
          : JSON.stringify({ entries: nextEntries, settings: nextSettings, watchlists: data.watchlists })
        setEntries(nextEntries)
        setSettings(nextSettings)
        setWatchlists(nextWatchlists)
        setCloudLoaded(true)
        setSyncError('')
        setSyncStatus('synced')
      },
      (error) => {
        console.error('Cloud load failed', error)
        // Keep cached/local data usable, but leave serverConfirmed false so
        // an unavailable server can never be overwritten by that fallback.
        setCloudLoaded(true)
        setSyncError(error?.message || 'Cloud load failed')
        setSyncStatus('error')
      },
    )
    return unsub
  }, [user])

  // Push local edits to the cloud with a very short batching window. Firestore's
  // live listener then delivers the change to every already-open device.
  // Guards prevent a fresh device
  // from overwriting real cloud data before the first snapshot arrives, and
  // skip writing data we just received from the cloud.
  useEffect(() => {
    if (!isFirebaseConfigured || !user || !cloudLoaded || !serverConfirmed) return
    const payload = cloudPayload(entries, settings, watchlists)
    const json = JSON.stringify(payload)
    if (json === lastSyncedRef.current) return
    setSyncStatus('saving')
    const t = setTimeout(() => {
      setDoc(doc(db, 'diaries', user.uid), { ...payload, updatedAt: serverTimestamp() })
        .then(() => {
          lastSyncedRef.current = json
          setSyncError('')
          setSyncStatus('synced')
        })
        .catch((error) => {
          console.error('Cloud save failed', error)
          setSyncError(error?.message || 'Cloud save failed')
          setSyncStatus('error')
        })
    }, 100)
    return () => clearTimeout(t)
  }, [entries, settings, watchlists, user, cloudLoaded, serverConfirmed])

  // A username opts into a small, explicitly public projection. Private diary
  // fields never leave the owner-only diary document.
  useEffect(() => {
    const username = normalizeUsername(settings.username)
    if (!isFirebaseConfigured || !user || !cloudLoaded || !serverConfirmed || !username) return
    const payload = publicProfilePayload(user, username, entries, watchlists)
    setDoc(doc(db, 'publicProfiles', username), { ...payload, updatedAt: serverTimestamp() })
      .catch((error) => console.error('Public profile update failed', error))
  }, [entries, settings.username, watchlists, user, cloudLoaded, serverConfirmed])

  // Accepted followers read this sanitized projection. It deliberately omits
  // settings, watch lists, platforms, companions, email, and account data.
  useEffect(() => {
    if (!isFirebaseConfigured || !user || !cloudLoaded || !serverConfirmed) return
    setDoc(doc(db, 'sharedDiaries', user.uid), {
      ownerUid: user.uid,
      entries: entries.map(sharedEntry),
      updatedAt: serverTimestamp(),
    }).catch((error) => console.error('Follower diary update failed', error))
  }, [entries, user, cloudLoaded, serverConfirmed])

  const signIn = useCallback(async () => {
    if (!isFirebaseConfigured) return
    // Safari can complete Google's popup but delay (or fail to restore) the
    // auth observer. Persist explicitly and use the returned credential so
    // the UI and cloud subscription update immediately.
    await setPersistence(auth, browserLocalPersistence)
    const credential = await signInWithPopup(auth, googleProvider)
    setUser(credential.user)
    return credential
  }, [])
  const signOut = useCallback(() => {
    if (isFirebaseConfigured) return fbSignOut(auth)
  }, [])
  const signInEmail = useCallback(async (email, password) => {
    if (!isFirebaseConfigured) return
    await setPersistence(auth, browserLocalPersistence)
    const credential = await signInWithEmailAndPassword(auth, email, password)
    setUser(credential.user)
    return credential
  }, [])
  const createAccount = useCallback(async (name, email, password) => {
    if (!isFirebaseConfigured) return
    await setPersistence(auth, browserLocalPersistence)
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    if (name.trim()) await updateProfile(credential.user, { displayName: name.trim() })
    setUser(credential.user)
    return credential
  }, [])
  const resetPassword = useCallback((email) => {
    if (!isFirebaseConfigured) return
    return sendPasswordResetEmail(auth, email)
  }, [])

  const updateAvatar = useCallback(async (file) => {
    if (!auth.currentUser) throw new Error('Sign in before uploading a profile picture')
    const photoURL = await uploadProfileImage(auth.currentUser.uid, file)
    await updateProfile(auth.currentUser, { photoURL })
    setUser({
      ...auth.currentUser,
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
      displayName: auth.currentUser.displayName,
      photoURL,
    })
    return photoURL
  }, [])

  const updateUsername = useCallback(async (value) => {
    if (!auth.currentUser || !db) throw new Error('Sign in before choosing a username')
    const username = normalizeUsername(value)
    const validationError = usernameError(username)
    if (validationError) throw new Error(validationError)
    const previous = normalizeUsername(settingsRef.current.username)
    if (username === previous) return username

    await runTransaction(db, async (transaction) => {
      const nextRef = doc(db, 'usernames', username)
      const next = await transaction.get(nextRef)
      const previousRef = previous ? doc(db, 'usernames', previous) : null
      const old = previousRef ? await transaction.get(previousRef) : null
      if (next.exists() && next.data()?.uid !== auth.currentUser.uid) throw new Error('That username is already taken')
      transaction.set(nextRef, { uid: auth.currentUser.uid, updatedAt: serverTimestamp() })
      if (previousRef) {
        if (old.exists() && old.data()?.uid === auth.currentUser.uid) transaction.delete(previousRef)
        if (previous !== username) transaction.delete(doc(db, 'publicProfiles', previous))
      }
    })
    setSettings((current) => ({ ...current, username }))
    return username
  }, [])

  const uploadPoster = useCallback(async (file, itemId) => {
    if (!auth.currentUser) throw new Error('Sign in before uploading custom artwork')
    return uploadPosterImage(auth.currentUser.uid, itemId, file)
  }, [])

  // Explicitly make the currently visible diary authoritative. This is used
  // after imports so an older (or empty) cloud snapshot cannot win the race.
  const saveToCloud = useCallback(async (entriesOverride) => {
    if (!isFirebaseConfigured || !user) throw new Error('Sign in before saving to the cloud')
    const nextEntries = syncSharedRatings(entriesOverride || entriesRef.current)
    const payload = cloudPayload(nextEntries, settingsRef.current, watchlistsRef.current)
    setSyncStatus('saving')
    setSyncError('')
    try {
      await setDoc(doc(db, 'diaries', user.uid), { ...payload, updatedAt: serverTimestamp() })
      lastSyncedRef.current = JSON.stringify(payload)
      setCloudLoaded(true)
      setSyncStatus('synced')
      return payload
    } catch (error) {
      console.error('Forced cloud save failed', error)
      setSyncError(error?.message || 'Cloud save failed')
      setSyncStatus('error')
      throw error
    }
  }, [user])

  // ---- Local persistence (always on — offline cache) --------------------
  useEffect(() => {
    try {
      localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries))
    } catch {}
  }, [entries])

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {}
  }, [settings])

  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlists))
    } catch {}
  }, [watchlists])

  // Keep offline data isolated per Firebase account. This prevents one
  // person's last-opened diary from appearing during another user's startup.
  useEffect(() => {
    if (!user || !cloudLoaded) return
    try {
      localStorage.setItem(`${ACCOUNT_CACHE_PREFIX}${user.uid}`, JSON.stringify({ entries, settings, watchlists }))
    } catch {}
  }, [entries, settings, watchlists, user, cloudLoaded])

  const addEntry = useCallback((entry) => {
    const normalized = normalizeEntry(entry)
    const saved = { id: uid(), createdAt: new Date().toISOString(), ...normalized }
    setEntries((prev) => {
      const key = movieKey(normalized)
      const existing = prev.find((e) => movieKey(e) === key)
      const rating = Number(normalized.rating) > 0 ? Number(normalized.rating) : (existing?.rating || 0)
      const next = Number(normalized.rating) > 0
        ? prev.map((e) => movieKey(e) === key ? { ...e, rating } : e)
        : prev
      return [{ ...saved, rating }, ...next]
    })
    return saved
  }, [])

  const updateEntry = useCallback((id, patch) => {
    setEntries((prev) => {
      const target = prev.find((e) => e.id === id)
      if (!target) return prev
      const sharesRating = Object.prototype.hasOwnProperty.call(patch, 'rating')
      const changesTop20 = Object.prototype.hasOwnProperty.call(patch, 'top20')
      if (!sharesRating && !changesTop20) return prev.map((e) => (e.id === id ? { ...e, ...patch } : e))

      const key = movieKey(target)
      return prev.map((entry) => {
        if (movieKey(entry) !== key) return entry
        let next = entry
        if (sharesRating) next = { ...next, rating: patch.rating }
        // Exactly one viewing represents a title in the ranked list. Every
        // other viewing still reads that membership through its movie key.
        if (changesTop20) next = { ...next, top20: patch.top20 ? entry.id === id : false }
        if (entry.id === id) next = { ...next, ...patch }
        return next
      })
    })
  }, [])

  const removeEntry = useCallback((id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const updateMovieArtwork = useCallback((id, patch) => {
    setEntries((previous) => {
      const target = previous.find((entry) => entry.id === id)
      if (!target) return previous
      const key = movieKey(target)
      return previous.map((entry) => movieKey(entry) === key ? { ...entry, ...patch } : entry)
    })
  }, [])

  const createWatchlist = useCallback((name) => {
    const cleanName = name.trim()
    if (!cleanName) return null
    const list = { id: uid(), name: cleanName, createdAt: new Date().toISOString(), items: [] }
    const next = [...watchlistsRef.current, list]
    watchlistsRef.current = next
    setWatchlists(next)
    return list
  }, [])

  const addToWatchlist = useCallback((listId, title) => {
    const target = watchlistsRef.current.find((list) => list.id === listId)
    if (!target || target.items.some((item) => movieKey(item) === movieKey(title))) {
      return { item: null, added: false }
    }
    const saved = { id: uid(), addedAt: new Date().toISOString(), ...title }
    const next = watchlistsRef.current.map((list) => list.id === listId ? { ...list, items: [saved, ...list.items] } : list)
    watchlistsRef.current = next
    setWatchlists(next)
    return { item: saved, added: true }
  }, [])

  const removeFromWatchlist = useCallback((listId, itemId) => {
    setWatchlists((previous) => previous.map((list) => list.id === listId
      ? { ...list, items: list.items.filter((item) => item.id !== itemId) }
      : list))
  }, [])

  const updateWatchlistItem = useCallback((listId, itemId, patch) => {
    setWatchlists((previous) => previous.map((list) => list.id === listId
      ? { ...list, items: list.items.map((item) => item.id === itemId ? { ...item, ...patch } : item) }
      : list))
  }, [])

  const reorderTop20 = useCallback((orderedIds) => {
    const ranks = new Map(orderedIds.map((id, index) => [id, index + 1]))
    setEntries((prev) => prev.map((entry) => ranks.has(entry.id) ? { ...entry, top20Rank: ranks.get(entry.id) } : entry))
  }, [])

  const replaceAll = useCallback((next) => {
    setEntries(Array.isArray(next) ? syncSharedRatings(next.map(normalizeEntry)) : [])
  }, [])

  const restoreBackup = useCallback((backup) => {
    if (!backup || typeof backup !== 'object' || Array.isArray(backup)) throw new Error('Invalid Reel backup')
    if (!Array.isArray(backup.entries) || !Array.isArray(backup.watchlists)) throw new Error('Incomplete Reel backup')
    const nextEntries = syncSharedRatings(backup.entries.map(normalizeEntry))
    const nextSettings = { ...DEFAULT_SETTINGS, ...(backup.settings || {}) }
    const nextWatchlists = normalizeWatchlists(backup.watchlists)
    setEntries(nextEntries)
    setSettings(nextSettings)
    setWatchlists(nextWatchlists)
    return {
      entries: nextEntries.length,
      lists: nextWatchlists.length,
      watchlistItems: nextWatchlists.reduce((total, list) => total + list.items.length, 0),
    }
  }, [])

  const clearAllData = useCallback(() => {
    setEntries([])
    setSettings({ ...DEFAULT_SETTINGS })
    setWatchlists(normalizeWatchlists([]))
  }, [])

  const importEntries = useCallback((incoming) => {
    // A diary logs each watch: the same title on a different date is a separate
    // entry. Keying on title+date keeps rewatches distinct yet re-import idempotent.
    const keyOf = (e) => (e.title + '|' + (e.watchedDate || e.year || '')).toLowerCase()
    let added = 0
    let merged = 0
    const byKey = new Map()
    for (const e of entriesRef.current) byKey.set(keyOf(e), e)
    for (const e of incoming) {
      const key = keyOf(e)
      const existing = byKey.get(key)
      if (existing) {
        byKey.set(key, mergeEntry(existing, e))
        merged++
      } else {
        byKey.set(key, { id: uid(), createdAt: new Date().toISOString(), ...e })
        added++
      }
    }
    const next = syncSharedRatings(Array.from(byKey.values()))
    setEntries(next)
    // Grow the platform / people catalogues from whatever was imported.
    const cat = collectCatalogs(incoming)
    setSettings((s) => ({
      ...s,
      platforms: uniqMerge(s.platforms, cat.platforms),
      people: uniqMerge(s.people, cat.people),
    }))
    return { entries: next, added, merged }
  }, [])

  return {
    entries,
    watchlists,
    settings,
    setSettings,
    addEntry,
    updateEntry,
    removeEntry,
    updateMovieArtwork,
    createWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    updateWatchlistItem,
    reorderTop20,
    replaceAll,
    restoreBackup,
    clearAllData,
    importEntries,
    // cloud
    cloudEnabled: isFirebaseConfigured,
    user,
    authReady,
    cloudLoaded,
    syncStatus,
    syncError,
    signIn,
    signInEmail,
    createAccount,
    resetPassword,
    signOut,
    saveToCloud,
    updateAvatar,
    updateUsername,
    uploadPoster,
  }
}
