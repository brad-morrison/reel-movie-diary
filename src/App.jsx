import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useDiary } from './lib/store.js'
import Library from './components/Library.jsx'
import Stats from './components/Stats.jsx'
import Settings from './components/Settings.jsx'
import AddModal from './components/AddModal.jsx'
import DetailModal from './components/DetailModal.jsx'
import Top20Page from './components/Top20Page.jsx'
import Top20SwapModal from './components/Top20SwapModal.jsx'
import Toast from './components/Toast.jsx'
import { movieKey } from './lib/store.js'

const TOP20_CAP = 20
import { IconPlus, IconFilm, IconChart, IconSettings, IconCrown, IconCloud, IconX } from './lib/icons.jsx'

const TABS = [
  { key: 'diary', label: 'Diary' },
  { key: 'top20', label: 'Top 20' },
  { key: 'stats', label: 'Stats' },
  { key: 'settings', label: 'Settings' },
]

const ACTIVE_TAB_KEY = 'reel.activeTab.v1'

function savedTab() {
  try {
    const value = localStorage.getItem(ACTIVE_TAB_KEY)
    return TABS.some((tab) => tab.key === value) ? value : 'diary'
  } catch {
    return 'diary'
  }
}

let toastSeq = 0

export default function App() {
  const diary = useDiary()
  const [tab, setTab] = useState(savedTab)
  const [adding, setAdding] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [toasts, setToasts] = useState([])
  const [burst, setBurst] = useState(null)
  const [swapCandidateId, setSwapCandidateId] = useState(null)

  useEffect(() => {
    document.documentElement.dataset.theme = diary.settings.theme === 'light' ? 'light' : 'dark'
  }, [diary.settings.theme])

  // Remember the current section across reloads on this device.
  useEffect(() => {
    try { localStorage.setItem(ACTIVE_TAB_KEY, tab) } catch {}
    window.scrollTo({ top: 0 })
  }, [tab])

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

  // Turn a saved entry's Top 20 flag on, handling the full-list swap flow.
  const requestTop20Add = useCallback((entryId) => {
    const current = diary.entries
      .filter((e) => e.top20)
      .sort((a, b) => (a.top20Rank ?? Number.MAX_SAFE_INTEGER) - (b.top20Rank ?? Number.MAX_SAFE_INTEGER))
      .filter((entry, index, list) => list.findIndex((candidate) => movieKey(candidate) === movieKey(entry)) === index)
    const count = current.length
    if (count >= TOP20_CAP) {
      setSwapCandidateId(entryId)
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
    else requestTop20Add(entry.id)
  }, [diary, requestTop20Add])

  function confirmSwap(outgoingId) {
    const reordered = [
      ...top20.filter((entry) => entry.id !== outgoingId).map((entry) => entry.id),
      ...(swapCandidateId ? [swapCandidateId] : []),
    ]
    diary.reorderTop20(reordered)
    diary.updateEntry(outgoingId, { top20: false })
    if (swapCandidateId) diary.updateEntry(swapCandidateId, { top20: true, top20Rank: reordered.indexOf(swapCandidateId) + 1 })
    setSwapCandidateId(null)
    fireBurst()
    notify('Swapped into your Top 20', <IconCrown size={16} />)
  }

  function handleSave(entry) {
    const wantsTop20 = entry.top20
    const alreadyTop20 = diary.entries.some((candidate) => candidate.top20 && movieKey(candidate) === movieKey(entry))
    const saved = diary.addEntry({ ...entry, top20: false })
    setAdding(false)
    fireBurst()
    notify(`“${entry.title}” added to your diary`)
    if (wantsTop20 && !alreadyTop20) requestTop20Add(saved.id)
  }

  // Keep the open detail modal in sync with the latest entry data.
  const liveDetail = detail ? diary.entries.find((e) => e.id === detail.id) || null : null
  const detailViewings = liveDetail
    ? diary.entries.filter((e) => movieKey(e) === movieKey(liveDetail)).sort((a, b) => (b.watchedDate || '').localeCompare(a.watchedDate || ''))
    : []
  const detailTop20Entry = liveDetail ? top20.find((entry) => movieKey(entry) === movieKey(liveDetail)) : null
  const displayDetail = liveDetail ? { ...liveDetail, top20: !!detailTop20Entry, top20Rank: detailTop20Entry?.top20Rank } : null
  const swapCandidate = swapCandidateId ? diary.entries.find((e) => e.id === swapCandidateId) || null : null
  const modalOpen = adding || !!liveDetail || !!swapCandidate || mobileMenuOpen

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

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-mark">
            <IconFilm size={22} color="#14110a" />
          </span>
          <span className="brand-name">Reel<span className="dot">.</span></span>
        </div>

        <button className="mobile-menu-button" onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation" aria-expanded={mobileMenuOpen}>
          <span /><span /><span />
        </button>

        <nav className="nav">
          {TABS.map((t) => (
            <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>
              {tab === t.key && <span className="pill" />}
              {t.label}
            </button>
          ))}
        </nav>

        <div className="header-spacer" />

        {diary.cloudEnabled && (
          !diary.authReady ? (
            <span className="account-chip account-chip-loading" aria-hidden="true" />
          ) : diary.user ? (
            <button
              className="account-chip"
              onClick={() => setTab('settings')}
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
            {tab === 'top20' && (
              <Top20Page entries={top20} onOpen={setDetail} onReorder={diary.reorderTop20} />
            )}
            {tab === 'stats' && <Stats entries={diary.entries} tmdbKey={diary.settings.tmdbKey} onUpdate={diary.updateEntry} />}
            {tab === 'settings' && (
              <Settings
                settings={diary.settings}
                setSettings={diary.setSettings}
                entries={diary.entries}
                replaceAll={diary.replaceAll}
                importEntries={diary.importEntries}
                notify={notify}
                cloudEnabled={diary.cloudEnabled}
                user={diary.user}
                syncStatus={diary.syncStatus}
                syncError={diary.syncError}
                signIn={diary.signIn}
                signOut={diary.signOut}
                saveToCloud={diary.saveToCloud}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div className="mobile-menu-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileMenuOpen(false)}>
            <motion.aside className="mobile-menu" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 360, damping: 34 }} onClick={(e) => e.stopPropagation()}>
              <div className="mobile-menu-head">
                <div className="brand">
                  <span className="brand-mark"><IconFilm size={22} color="#14110a" /></span>
                  <span className="brand-name">Reel<span className="dot">.</span></span>
                </div>
                <button className="icon-btn" onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation"><IconX size={19} /></button>
              </div>
              <nav className="mobile-menu-nav" aria-label="Mobile navigation">
                {TABS.map((item) => (
                  <button key={item.key} className={tab === item.key ? 'active' : ''} onClick={() => { setTab(item.key); setMobileMenuOpen(false) }}>
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
            onAddPlatform={addPlatform}
            onAddPerson={addPerson}
            onClose={() => setAdding(false)}
            onSave={handleSave}
          />
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
            onAddPlatform={addPlatform}
            onAddPerson={addPerson}
            onToggleTop20={toggleTop20}
            onSelectViewing={setDetail}
            onClose={() => setDetail(null)}
            onUpdate={diary.updateEntry}
            onDelete={(id) => { diary.removeEntry(id); setDetail(null); notify('Removed from diary') }}
          />
        )}
        {swapCandidate && (
          <Top20SwapModal
            key="swap-modal"
            candidate={swapCandidate}
            top20={top20}
            onReplace={confirmSwap}
            onCancel={() => setSwapCandidateId(null)}
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
