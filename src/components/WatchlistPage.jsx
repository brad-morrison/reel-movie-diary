import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { IconBookmark, IconChevron, IconPlus, IconSearch, IconSparkle, IconTrash } from '../lib/icons.jsx'

const SORTS = {
  added: { label: 'Recently added', fn: (a, b) => (b.addedAt || '').localeCompare(a.addedAt || '') },
  title: { label: 'Title A–Z', fn: (a, b) => a.title.localeCompare(b.title) },
  year: { label: 'Newest release', fn: (a, b) => (b.year || 0) - (a.year || 0) },
}

export default function WatchlistPage({ lists, activeListId, onSelectList, onCreateList, onAdd, onRandom, onOpen, onRemove }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [sort, setSort] = useState('added')
  const [creatingList, setCreatingList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const activeList = lists.find((list) => list.id === activeListId) || lists[0]
  const items = activeList?.items || []

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return items.filter((item) => type === 'all' || item.type === type)
      .filter((item) => !needle || item.title.toLowerCase().includes(needle) || (item.genres || []).some((genre) => genre.toLowerCase().includes(needle)))
      .sort(SORTS[sort].fn)
  }, [items, query, type, sort])

  function createList(event) {
    event.preventDefault()
    if (!newListName.trim()) return
    if (onCreateList(newListName)) { setNewListName(''); setCreatingList(false); setQuery(''); setType('all') }
  }

  function selectList(id) {
    onSelectList(id)
    setQuery('')
    setType('all')
  }

  return (
    <section className="watchlist-page">
      <div className="watchlist-heading">
        <div>
          <span className="watchlist-eyebrow"><IconBookmark size={15} /> Your next watches</span>
          <h1>{activeList?.name || 'Watch list'}</h1>
          <p>{items.length} {items.length === 1 ? 'title' : 'titles'} saved for the right movie night.</p>
        </div>
        <div className="watchlist-heading-actions">
          <button className="btn btn-ghost" disabled={!items.length} onClick={onRandom}><IconSparkle size={17} /> Surprise me</button>
          <button className="btn btn-primary" onClick={onAdd}><IconPlus size={17} /> Add to this list</button>
        </div>
      </div>

      <div className="watchlist-listbar">
        <div className="watchlist-list-tabs" role="tablist" aria-label="Your watch lists">
          {lists.map((list) => (
            <button key={list.id} role="tab" aria-selected={list.id === activeList?.id} className={list.id === activeList?.id ? 'active' : ''} onClick={() => selectList(list.id)}>
              <IconBookmark size={15} fill={list.id === activeList?.id ? 'currentColor' : 'none'} /><span>{list.name}</span><small>{list.items.length}</small>
            </button>
          ))}
        </div>
        <button className="watchlist-new-trigger" onClick={() => setCreatingList((value) => !value)}><IconPlus size={16} /> New list</button>
      </div>

      <AnimatePresence>
        {creatingList && (
          <motion.form className="watchlist-create" onSubmit={createList} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <input autoFocus aria-label="New list name" placeholder="e.g. Movies with my sisters" value={newListName} onChange={(event) => setNewListName(event.target.value)} />
            <button type="button" className="btn btn-ghost" onClick={() => { setCreatingList(false); setNewListName('') }}>Cancel</button>
            <button className="btn btn-primary" type="submit" disabled={!newListName.trim()}>Create list</button>
          </motion.form>
        )}
      </AnimatePresence>

      {items.length > 0 && (
        <div className="toolbar watchlist-toolbar">
          <div className="search-box"><IconSearch size={18} /><input aria-label="Search watch list" placeholder={`Search ${activeList.name}…`} value={query} onChange={(event) => setQuery(event.target.value)} /></div>
          <div className="chips">{[['all', 'All'], ['movie', 'Films'], ['tv', 'TV']].map(([key, label]) => <button key={key} className={`chip ${type === key ? 'on' : ''}`} onClick={() => setType(key)}>{label}</button>)}</div>
          <div className="select-wrap"><select aria-label="Sort watch list" value={sort} onChange={(event) => setSort(event.target.value)}>{Object.entries(SORTS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select><IconChevron size={16} /></div>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="empty watchlist-empty">
          <div className="empty-mark"><IconBookmark size={48} /></div>
          <h3>{items.length === 0 ? `${activeList?.name || 'This list'} is ready` : 'Nothing matches that'}</h3>
          <p>{items.length === 0 ? 'Add a film or show and it’ll be waiting here when the moment is right.' : 'Try another title, genre, or filter.'}</p>
          {items.length === 0 && <button className="btn btn-primary" onClick={onAdd}><IconPlus size={16} /> Add the first movie</button>}
        </div>
      ) : (
        <div className="watchlist-grid"><AnimatePresence>
          {visible.map((item, index) => (
            <motion.article layout className="watchlist-card" key={item.id} role="button" tabIndex={0} onClick={() => onOpen(item)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(item) } }} initial={{ opacity: 0, y: 22, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: .9 }} transition={{ delay: Math.min(index * .025, .3) }}>
              <div className="watchlist-art">
                {item.poster ? <img src={item.poster} alt="" loading="lazy" /> : <div className="watchlist-art-fallback"><IconBookmark size={28} /><span>{item.title}</span></div>}
                <span className="badge-type">{item.type === 'tv' ? 'TV' : 'Film'}</span>
                <button className="watchlist-remove" onClick={(event) => { event.stopPropagation(); onRemove(item) }} aria-label={`Remove ${item.title} from ${activeList.name}`} title="Remove from this list"><IconTrash size={16} /></button>
              </div>
              <div className="watchlist-card-copy"><h2>{item.title}</h2><p>{item.year || 'Year unknown'}{item.genres?.length ? ` · ${item.genres.slice(0, 2).join(', ')}` : ''}</p></div>
            </motion.article>
          ))}
        </AnimatePresence></div>
      )}
    </section>
  )
}
