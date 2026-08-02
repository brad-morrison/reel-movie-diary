import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useDiary } from './lib/store.js'
import Library from './components/Library.jsx'
import Stats from './components/Stats.jsx'
import Settings from './components/Settings.jsx'
import AddModal from './components/AddModal.jsx'
import DetailModal from './components/DetailModal.jsx'
import Top20SwapModal from './components/Top20SwapModal.jsx'
import Toast from './components/Toast.jsx'

const TOP20_CAP = 20
import { IconPlus, IconFilm, IconChart, IconSettings, IconCrown, IconCloud } from './lib/icons.jsx'

const TABS = [
  { key: 'diary', label: 'Diary' },
  { key: 'stats', label: 'Stats' },
  { key: 'settings', label: 'Settings' },
]

let toastSeq = 0

export default function App() {
  const diary = useDiary()
  const [tab, setTab] = useState('diary')
  const [adding, setAdding] = useState(false)
  const [detail, setDetail] = useState(null)
  const [toasts, setToasts] = useState([])
  const [burst, setBurst] = useState(null)
  const [swapCandidateId, setSwapCandidateId] = useState(null)

  // Jump back to the top when switching tabs, so you never land mid-scroll.
  useEffect(() => { window.scrollTo({ top: 0 }) }, [tab])

  const notify = useCallback((message, icon) => {
    const id = ++toastSeq
    setToasts((t) => [...t, { id, message, icon }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
  }, [])

  function fireBurst() {
    setBurst({ x: window.innerWidth / 2, y: window.innerHeight / 2, id: Date.now() })
    setTimeout(() => setBurst(null), 900)
  }

  const top20 = diary.entries.filter((e) => e.top20)

  // Turn a saved entry's Top 20 flag on, handling the full-list swap flow.
  const requestTop20Add = useCallback((entryId) => {
    const count = diary.entries.filter((e) => e.top20).length
    if (count >= TOP20_CAP) {
      setSwapCandidateId(entryId)
    } else {
      diary.updateEntry(entryId, { top20: true })
      fireBurst()
      notify('Crowned for your Top 20', <IconCrown size={16} />)
    }
  }, [diary])

  const toggleTop20 = useCallback((entry) => {
    if (entry.top20) diary.updateEntry(entry.id, { top20: false })
    else requestTop20Add(entry.id)
  }, [diary, requestTop20Add])

  function confirmSwap(outgoingId) {
    diary.updateEntry(outgoingId, { top20: false })
    if (swapCandidateId) diary.updateEntry(swapCandidateId, { top20: true })
    setSwapCandidateId(null)
    fireBurst()
    notify('Swapped into your Top 20', <IconCrown size={16} />)
  }

  function handleSave(entry) {
    const wantsTop20 = entry.top20
    const saved = diary.addEntry({ ...entry, top20: false })
    setAdding(false)
    fireBurst()
    notify(`“${entry.title}” added to your diary`)
    if (wantsTop20) requestTop20Add(saved.id)
  }

  // Keep the open detail modal in sync with the latest entry data.
  const liveDetail = detail ? diary.entries.find((e) => e.id === detail.id) || null : null
  const swapCandidate = swapCandidateId ? diary.entries.find((e) => e.id === swapCandidateId) || null : null

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

        <nav className="nav">
          {TABS.map((t) => (
            <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>
              {tab === t.key && <motion.span layoutId="pill" className="pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              {t.label}
            </button>
          ))}
        </nav>

        <div className="header-spacer" />

        {diary.cloudEnabled && (
          diary.user ? (
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
            {tab === 'stats' && <Stats entries={diary.entries} />}
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
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {adding && (
          <AddModal
            key="add-modal"
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
        {liveDetail && (
          <DetailModal
            key="detail-modal"
            entry={liveDetail}
            platforms={diary.settings.platforms}
            people={diary.settings.people}
            top20Full={top20.length >= TOP20_CAP && !liveDetail.top20}
            onAddPlatform={addPlatform}
            onAddPerson={addPerson}
            onToggleTop20={toggleTop20}
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
