import { useCallback, useEffect, useRef, useState } from 'react'
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut as fbSignOut,
} from 'firebase/auth'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider, isFirebaseConfigured } from './firebase.js'
import { SAMPLE_ENTRIES } from './sample.js'
import { collectCatalogs } from './csv.js'

const ENTRIES_KEY = 'reel.entries.v1'
const SETTINGS_KEY = 'reel.settings.v1'

const DEFAULT_PLATFORMS = ['Netflix', 'Disney+', 'Prime', 'Apple TV+', 'Cinema']
const DEFAULT_SETTINGS = { tmdbKey: '', platforms: DEFAULT_PLATFORMS, people: [], seeded: true }

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

export function useDiary() {
  const [entries, setEntries] = useState(() => {
    const stored = load(ENTRIES_KEY, null)
    if (stored) return stored.map(normalizeEntry)
    // First run — seed with a few nice examples so the app looks alive.
    return SAMPLE_ENTRIES.map(normalizeEntry)
  })

  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...load(SETTINGS_KEY, {}),
  }))

  // ---- Cloud sync (Firebase) --------------------------------------------
  const [user, setUser] = useState(null)
  const [syncStatus, setSyncStatus] = useState('idle') // idle | saving | synced | error
  const [syncError, setSyncError] = useState('')
  const [syncRetry, setSyncRetry] = useState(0)
  const [cloudLoaded, setCloudLoaded] = useState(false) // has this user's doc arrived?

  const entriesRef = useRef(entries)
  entriesRef.current = entries
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const lastSyncedRef = useRef(null) // JSON of the last data exchanged with the cloud

  // Track who's signed in.
  useEffect(() => {
    if (!isFirebaseConfigured) return
    return onAuthStateChanged(auth, (u) => setUser(u))
  }, [])

  // Subscribe to the signed-in user's diary doc. First sign-in (no doc yet)
  // migrates this browser's local data up to the cloud.
  useEffect(() => {
    if (!isFirebaseConfigured || !user) {
      setCloudLoaded(false)
      setSyncStatus('idle')
      setSyncError('')
      return
    }
    setCloudLoaded(false)
    setSyncStatus('saving')
    const ref = doc(db, 'diaries', user.uid)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          const payload = { entries: entriesRef.current, settings: settingsRef.current }
          setDoc(ref, { ...payload, updatedAt: serverTimestamp() })
            .then(() => {
              lastSyncedRef.current = JSON.stringify(payload)
              setSyncError('')
              setSyncStatus('synced')
            })
            .catch((error) => {
              console.error('Initial cloud save failed', error)
              setSyncError(error?.message || 'Cloud save failed')
              setSyncStatus('error')
              setTimeout(() => setSyncRetry((n) => n + 1), 3000)
            })
          setCloudLoaded(true)
          return
        }
        const data = snap.data() || {}
        const nextEntries = Array.isArray(data.entries) ? data.entries.map(normalizeEntry) : []
        const nextSettings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) }
        lastSyncedRef.current = JSON.stringify({ entries: nextEntries, settings: nextSettings })
        setEntries(nextEntries)
        setSettings(nextSettings)
        setCloudLoaded(true)
        setSyncError('')
        setSyncStatus('synced')
      },
      (error) => {
        console.error('Cloud load failed', error)
        setSyncError(error?.message || 'Cloud load failed')
        setSyncStatus('error')
      },
    )
    return unsub
  }, [user])

  // Push local edits to the cloud (debounced). Guards prevent a fresh device
  // from overwriting real cloud data before the first snapshot arrives, and
  // skip writing data we just received from the cloud.
  useEffect(() => {
    if (!isFirebaseConfigured || !user || !cloudLoaded) return
    const json = JSON.stringify({ entries, settings })
    if (json === lastSyncedRef.current) return
    setSyncStatus('saving')
    const t = setTimeout(() => {
      setDoc(doc(db, 'diaries', user.uid), { entries, settings, updatedAt: serverTimestamp() })
        .then(() => {
          lastSyncedRef.current = json
          setSyncError('')
          setSyncStatus('synced')
        })
        .catch((error) => {
          console.error('Cloud save failed', error)
          setSyncError(error?.message || 'Cloud save failed')
          setSyncStatus('error')
          setTimeout(() => setSyncRetry((n) => n + 1), 3000)
        })
    }, 800)
    return () => clearTimeout(t)
  }, [entries, settings, user, cloudLoaded, syncRetry])

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

  const addEntry = useCallback((entry) => {
    const withId = {
      id: uid(),
      createdAt: new Date().toISOString(),
      ...normalizeEntry(entry),
    }
    setEntries((prev) => [withId, ...prev])
    return withId
  }, [])

  const updateEntry = useCallback((id, patch) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    )
  }, [])

  const removeEntry = useCallback((id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const replaceAll = useCallback((next) => {
    setEntries(Array.isArray(next) ? next : [])
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
    const next = Array.from(byKey.values())
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
    settings,
    setSettings,
    addEntry,
    updateEntry,
    removeEntry,
    replaceAll,
    importEntries,
    // cloud
    cloudEnabled: isFirebaseConfigured,
    user,
    syncStatus,
    syncError,
    signIn,
    signOut,
  }
}
