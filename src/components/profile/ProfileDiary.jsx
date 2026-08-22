import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { IconFilm, IconSearch, IconStar, IconUser, IconX } from '../../lib/icons.jsx'
import { byWatchedDesc, formatWatchDate, watchedOn } from '../../lib/profile.js'

const PAGE_SIZE = 24
const TYPES = [{ key: 'all', label: 'Everything' }, { key: 'movie', label: 'Films' }, { key: 'tv', label: 'TV' }]
const SORTS = [{ key: 'recent', label: 'Newest' }, { key: 'oldest', label: 'Oldest' }, { key: 'rating', label: 'Highest rated' }]

const LOCKED_COPY = {
  pending: { title: 'Request pending', body: 'Once they accept your follow request, every watch in their diary opens up here.' },
  none: { title: 'Followers only', body: 'Follow this profile and, once the request is accepted, you’ll see the full diary — dates, ratings and notes.' },
}

export default function ProfileDiary({ entries, owner, onOpen, relationshipStatus = '' }) {
  const [term, setTerm] = useState('')
  const [type, setType] = useState('all')
  const [sort, setSort] = useState('recent')
  const [visible, setVisible] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    if (!Array.isArray(entries)) return []
    const needle = term.trim().toLowerCase()
    const matches = entries.filter((entry) => {
      if (type !== 'all' && (entry.type || 'movie') !== type) return false
      if (!needle) return true
      return `${entry.title || ''} ${entry.year || ''}`.toLowerCase().includes(needle)
    })
    if (sort === 'rating') return matches.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0) || byWatchedDesc(a, b))
    if (sort === 'oldest') return matches.sort((a, b) => watchedOn(a).localeCompare(watchedOn(b)))
    return matches.sort(byWatchedDesc)
  }, [entries, term, type, sort])

  if (!Array.isArray(entries)) {
    if (owner) return null
    // An accepted follower's diary arrives on a second request, so hold the
    // section rather than flashing the followers-only wall at someone who has
    // already been let in.
    if (relationshipStatus === 'accepted') {
      return (
        <section className="pf-section pf-locked">
          <span className="public-profile-loader" />
          <p>Loading their diary…</p>
        </section>
      )
    }
    const copy = LOCKED_COPY[relationshipStatus === 'pending' ? 'pending' : 'none']
    return (
      <section className="pf-section pf-locked">
        <span className="pf-locked-mark"><IconUser size={22} /></span>
        <h2>{copy.title}</h2>
        <p>{copy.body}</p>
      </section>
    )
  }

  const shown = filtered.slice(0, visible)

  return (
    <section className="pf-section">
      <div className="pf-section-head">
        <div><span>{owner ? 'Every watch' : 'Follower access'}</span><h2>Full diary</h2></div>
        <strong className="pf-count">{entries.length} {entries.length === 1 ? 'watch' : 'watches'}</strong>
      </div>

      <div className="pf-diary-controls">
        <div className="pf-diary-search">
          <IconSearch size={16} />
          <input
            value={term}
            onChange={(event) => { setTerm(event.target.value); setVisible(PAGE_SIZE) }}
            placeholder="Search this diary"
            aria-label="Search this diary"
          />
          {term && <button type="button" onClick={() => { setTerm(''); setVisible(PAGE_SIZE) }} aria-label="Clear search"><IconX size={14} /></button>}
        </div>
        <div className="pf-chips" role="group" aria-label="Filter by type">
          {TYPES.map((option) => (
            <button key={option.key} type="button" className={type === option.key ? 'active' : ''} onClick={() => { setType(option.key); setVisible(PAGE_SIZE) }}>{option.label}</button>
          ))}
        </div>
        <div className="pf-chips" role="group" aria-label="Sort order">
          {SORTS.map((option) => (
            <button key={option.key} type="button" className={sort === option.key ? 'active' : ''} onClick={() => setSort(option.key)}>{option.label}</button>
          ))}
        </div>
      </div>

      {shown.length ? (
        <>
          <div className="pf-diary-list">
            {shown.map((entry, index) => {
              const interactive = !!onOpen
              const Element = interactive ? motion.button : motion.article
              return (
                <Element
                  key={entry.id || `${entry.title}-${index}`}
                  className="pf-diary-row"
                  type={interactive ? 'button' : undefined}
                  onClick={interactive ? () => onOpen(entry) : undefined}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min((index % PAGE_SIZE) * 0.015, 0.3), duration: 0.32 }}
                >
                  <span className="pf-diary-art">
                    {entry.poster
                      ? <img src={entry.poster} alt="" loading="lazy" referrerPolicy="no-referrer" />
                      : <span className="pf-poster-fallback"><IconFilm size={16} /></span>}
                  </span>
                  <span className="pf-diary-copy">
                    <strong>{entry.title}</strong>
                    <small>
                      {formatWatchDate(entry.watchedDate) || 'Date not set'} · {entry.type === 'tv' ? 'TV' : 'Film'}{entry.year ? ` · ${entry.year}` : ''}
                      {entry.firstTime ? ' · first time' : ''}
                    </small>
                    {(entry.review || entry.notes) && <em>{entry.review || entry.notes}</em>}
                  </span>
                  {Number(entry.rating) > 0 && <span className="pf-diary-score"><IconStar size={12} /> {entry.rating}</span>}
                </Element>
              )
            })}
          </div>
          {visible < filtered.length && (
            <button className="btn btn-ghost pf-more" type="button" onClick={() => setVisible((count) => count + PAGE_SIZE)}>
              Show {Math.min(PAGE_SIZE, filtered.length - visible)} more · {filtered.length - visible} left
            </button>
          )}
        </>
      ) : (
        <p className="pf-empty">{entries.length ? 'Nothing matches those filters.' : 'This diary is empty so far.'}</p>
      )}
    </section>
  )
}
