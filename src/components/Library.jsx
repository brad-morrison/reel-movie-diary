import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import PosterCard from './PosterCard.jsx'
import AnimatedNumber from './AnimatedNumber.jsx'
import { IconSearch, IconChevron, IconPlus } from '../lib/icons.jsx'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'movie', label: 'Films' },
  { key: 'tv', label: 'TV' },
  { key: 'firstTime', label: 'First time' },
]

const SORTS = {
  recent: { label: 'Recently watched', fn: (a, b) => (b.watchedDate || '').localeCompare(a.watchedDate || '') },
  added: { label: 'Recently added', fn: (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') },
  rating: { label: 'Highest rated', fn: (a, b) => (b.rating || 0) - (a.rating || 0) },
  title: { label: 'Title A–Z', fn: (a, b) => a.title.localeCompare(b.title) },
  year: { label: 'Newest release', fn: (a, b) => (b.year || 0) - (a.year || 0) },
}

export default function Library({ entries, onOpen, onAdd }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('recent')

  const hero = useMemo(() => {
    const withArt = entries.filter((e) => e.backdrop || e.poster)
    const top = [...withArt].sort((a, b) => (b.rating || 0) - (a.rating || 0))
    return top[0] || entries[0]
  }, [entries])

  const filtered = useMemo(() => {
    let list = entries
    if (filter === 'movie' || filter === 'tv') list = list.filter((e) => e.type === filter)
    else if (filter === 'firstTime') list = list.filter((e) => e.firstTime)
    if (q.trim()) {
      const s = q.toLowerCase()
      list = list.filter((e) =>
        e.title.toLowerCase().includes(s) ||
        (e.genres || []).some((g) => g.toLowerCase().includes(s)) ||
        (e.platform || '').toLowerCase().includes(s) ||
        (e.companions || []).some((c) => c.toLowerCase().includes(s)),
      )
    }
    return [...list].sort(SORTS[sort].fn)
  }, [entries, filter, q, sort])

  const thisYear = new Date().getFullYear()
  const yearCount = entries.filter((e) => e.watchedDate?.startsWith(String(thisYear))).length
  const rated = entries.filter((e) => e.rating > 0)
  const avg = rated.length ? rated.reduce((s, e) => s + e.rating, 0) / rated.length : 0

  return (
    <div>
      {hero && (
        <motion.div className="hero" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
          {(hero.backdrop || hero.poster) && (
            <motion.div className="hero-bg" style={{ backgroundImage: `url(${hero.backdrop || hero.poster})` }}
              initial={{ scale: 1.15, opacity: 0 }} animate={{ scale: 1.08, opacity: 1 }} transition={{ duration: 1.4 }} />
          )}
          <div className="hero-veil" />
          <div className="hero-eyebrow">Your diary · {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <h1>Every film & show you've lived with, <em>kept beautifully</em>.</h1>
          <p className="hero-sub">
            {entries.length > 0
              ? <>Top of the pile right now: <strong>{hero.title}</strong>{hero.rating ? ` — you gave it ${hero.rating}.` : '.'}</>
              : 'Start logging and this space becomes yours.'}
          </p>
        </motion.div>
      )}

      <div className="stat-strip">
        {[
          { label: 'In your diary', value: entries.length },
          { label: `Watched in ${thisYear}`, value: yearCount },
          { label: 'Average rating', value: avg, decimals: 1 },
          { label: 'First-time watches', value: entries.filter((e) => e.firstTime).length },
        ].map((c, i) => (
          <motion.div key={c.label} className="stat-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <div className="stat-value"><AnimatedNumber value={c.value} decimals={c.decimals || 0} />{c.unit && <span className="unit">{c.unit}</span>}</div>
            <div className="stat-label">{c.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="toolbar">
        <div className="search-box">
          <IconSearch size={18} />
          <input placeholder="Search your diary — title, genre, platform…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="chips">
          {FILTERS.map((f) => (
            <button key={f.key} className={`chip ${filter === f.key ? 'on' : ''}`} onClick={() => setFilter(f.key)}>{f.label}</button>
          ))}
        </div>
        <div className="select-wrap">
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <IconChevron size={16} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-mark">🎬</div>
          <h3>{entries.length === 0 ? 'Your diary is a blank reel' : 'Nothing matches that'}</h3>
          <p>{entries.length === 0 ? 'Log the last thing you watched and watch this fill up.' : 'Try a different filter or search.'}</p>
          {entries.length === 0 && (
            <button className="btn btn-primary" onClick={onAdd}><IconPlus size={16} /> Log your first watch</button>
          )}
        </div>
      ) : (
        <div className="grid">
          <AnimatePresence>
            {filtered.map((e, i) => (
              <PosterCard key={e.id} entry={e} index={i} onClick={onOpen} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
