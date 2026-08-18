import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Rating from './Rating.jsx'
import TagPicker from './TagPicker.jsx'
import Top20Button from './Top20Button.jsx'
import { useEscape } from '../lib/useEscape.js'
import { searchTitles } from '../lib/tmdb.js'
import {
  IconX, IconCheck, IconCalendar, IconTrash, IconStar, IconSearch, IconImage,
} from '../lib/icons.jsx'

function fmtDate(d) {
  if (!d) return 'Undated'
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch {
    return d
  }
}

export default function DetailModal({ entry, viewings = [], tmdbKey = '', platforms = [], people = [], top20Full = false, nestedOpen = false, onAddPlatform, onAddPerson, onToggleTop20, onSelectViewing, onChangeArtwork, onClose, onUpdate, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false)
  const [repairOpen, setRepairOpen] = useState(false)
  const [repairQuery, setRepairQuery] = useState('')
  const [repairResults, setRepairResults] = useState([])
  const [repairLoading, setRepairLoading] = useState(false)
  const [repairError, setRepairError] = useState('')
  useEscape(() => { if (!nestedOpen) onClose() })

  useEffect(() => {
    setConfirmDel(false)
    setRepairOpen(false)
  }, [entry.id])

  useEffect(() => {
    if (!repairOpen || !tmdbKey || !repairQuery.trim()) {
      setRepairResults([])
      return
    }
    setRepairLoading(true)
    setRepairError('')
    const timer = setTimeout(async () => {
      try {
        setRepairResults(await searchTitles(repairQuery, tmdbKey))
      } catch {
        setRepairError('Search failed — check your TMDB key in Settings.')
      } finally {
        setRepairLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [repairOpen, repairQuery, tmdbKey])

  function openRepair() {
    setRepairQuery(entry.title)
    setRepairLoading(true)
    setRepairOpen(true)
    setConfirmDel(false)
  }

  function chooseRepair(result) {
    onUpdate(entry.id, {
      title: result.title,
      year: result.year || undefined,
      type: result.type,
      poster: result.poster || '',
      backdrop: result.backdrop || '',
      overview: result.overview || '',
      genres: result.genres || [],
      tmdbId: result.tmdbId,
      voteAverage: result.voteAverage,
    })
    setRepairOpen(false)
    setRepairResults([])
  }

  return (
    <motion.div
      className="overlay fullscreen-mobile-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal detail-modal"
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="icon-btn modal-sticky-close" onClick={onClose} aria-label="Close"><IconX size={18} /></button>
        <div className="detail">
          <div className="detail-backdrop">
            {entry.backdrop || entry.poster ? (
              <img src={entry.backdrop || entry.poster} alt="" />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(160deg,#1a1a26,#101019)' }} />
            )}
            <div className="veil" />
          </div>

          <div className="detail-body">
            <div className="detail-top">
              {entry.poster ? (
                <img className="detail-poster" src={entry.poster} alt={entry.title} />
              ) : (
                <div className="detail-poster poster-fallback" style={{ position: 'relative' }}>
                  <div className="pf-title">{entry.title}</div>
                </div>
              )}
              <div className="detail-headings">
                <h2>{entry.title}</h2>
                <div className="sub">
                  <span>{entry.year}</span>
                  <span className="genre-tag" style={{ padding: '4px 10px' }}>
                    {entry.type === 'tv' ? 'TV Series' : 'Film'}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconCalendar size={14} /> {fmtDate(entry.watchedDate)}
                  </span>
                  {entry.firstTime && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--gold)' }}>
                      <IconCheck size={14} /> First time
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h4>Your rating</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                <Rating big value={entry.rating} onChange={(r) => onUpdate(entry.id, { rating: r })} />
                <button className={`chip ${entry.firstTime ? 'on' : ''}`} onClick={() => onUpdate(entry.id, { firstTime: !entry.firstTime })}>
                  <IconCheck size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} /> First time
                </button>
              </div>
              <div style={{ marginTop: 16 }}>
                <Top20Button active={!!entry.top20} full={top20Full} onToggle={() => onToggleTop20(entry)} />
              </div>
            </div>

            <div className="detail-section">
              <h4>Times watched · {viewings.length || 1}</h4>
              <div className="viewing-list">
                {(viewings.length ? viewings : [entry]).map((viewing, index, list) => (
                  <button type="button" className={`viewing-row ${viewing.id === entry.id ? 'current' : ''}`} key={viewing.id} onClick={() => onSelectViewing?.(viewing)}>
                    <span className="viewing-number">{list.length - index}</span>
                    <div>
                      <strong>{fmtDate(viewing.watchedDate)}</strong>
                      <span>
                        {viewing.firstTime ? 'First watch' : 'Rewatch'}
                        {viewing.platform ? ` · ${viewing.platform}` : ''}
                        {viewing.companions?.length ? ` · with ${viewing.companions.join(', ')}` : ''}
                      </span>
                    </div>
                    {viewing.id === entry.id && <span className="viewing-current">Selected</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="detail-section">
              <h4>Where did you watch it?</h4>
              <TagPicker
                options={platforms}
                value={entry.platform || ''}
                onChange={(v) => onUpdate(entry.id, { platform: v })}
                onAddOption={onAddPlatform}
                placeholder="e.g. Netflix"
              />
            </div>

            <div className="detail-section">
              <h4>Who did you watch it with?</h4>
              <TagPicker
                multi
                accent="rose"
                options={people}
                value={entry.companions || []}
                onChange={(v) => onUpdate(entry.id, { companions: v })}
                onAddOption={onAddPerson}
                placeholder="Add a name"
              />
            </div>

            {entry.overview && (
              <div className="detail-section">
                <h4>Overview</h4>
                <p>{entry.overview}</p>
              </div>
            )}

            {entry.genres?.length > 0 && (
              <div className="detail-section">
                <h4>Genres</h4>
                <div className="genre-tags">
                  {entry.genres.map((g) => (
                    <span key={g} className="genre-tag">{g}</span>
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence>
              {repairOpen && (
                <motion.div className="detail-section repair-search" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <div className="repair-head">
                    <div><h4>Find the correct movie</h4><p>Your watch details and rating will be preserved.</p></div>
                    <button className="icon-btn" onClick={() => setRepairOpen(false)}><IconX size={15} /></button>
                  </div>
                  <div className="search-box">
                    <IconSearch size={18} />
                    <input autoFocus value={repairQuery} onChange={(e) => setRepairQuery(e.target.value)} placeholder="Search TMDB…" />
                  </div>
                  {repairLoading && <p className="dim repair-message">Searching…</p>}
                  {repairError && <p className="repair-message repair-error">{repairError}</p>}
                  {!repairLoading && repairQuery && !repairError && repairResults.length === 0 && <p className="dim repair-message">No matches found.</p>}
                  <div className="repair-results">
                    {repairResults.slice(0, 6).map((result) => (
                      <button key={`${result.type}-${result.tmdbId}`} className="repair-result" onClick={() => chooseRepair(result)}>
                        {result.poster ? <img src={result.poster} alt="" /> : <span className="repair-result-poster">No art</span>}
                        <span><strong>{result.title}</strong><small>{result.year || '—'} · {result.type === 'tv' ? 'TV' : 'Film'}</small></span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="detail-actions">
              {confirmDel ? (
                <>
                  <button className="btn btn-ghost" onClick={() => setConfirmDel(false)} style={{ flex: 1, justifyContent: 'center' }}>
                    Cancel
                  </button>
                  <button
                    className="btn"
                    onClick={() => onDelete(entry.id)}
                    style={{ flex: 1, justifyContent: 'center', background: 'var(--rose)', color: '#fff' }}
                  >
                    <IconTrash size={16} /> Delete forever
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-ghost" onClick={() => onChangeArtwork(entry)} disabled={!tmdbKey} title={!tmdbKey ? 'Connect TMDB in Settings first' : 'Choose a different TMDB poster'}>
                    <IconImage size={16} /> Change poster
                  </button>
                  <button className="btn btn-ghost" onClick={openRepair} disabled={!tmdbKey} title={!tmdbKey ? 'Connect TMDB in Settings first' : 'Search TMDB for the correct title'}>
                    <IconSearch size={16} /> Find correct movie
                  </button>
                  <button className="btn btn-ghost" onClick={() => setConfirmDel(true)} style={{ color: 'var(--rose)' }}>
                    <IconTrash size={16} /> Remove from diary
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
