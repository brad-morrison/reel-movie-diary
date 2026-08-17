import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { searchTitles } from '../lib/tmdb.js'
import { useEscape } from '../lib/useEscape.js'
import { IconBookmark, IconSearch, IconX } from '../lib/icons.jsx'

export default function AddWatchlistModal({ tmdbKey, onClose, onSave }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [manual, setManual] = useState(!tmdbKey)
  const [title, setTitle] = useState('')
  const [year, setYear] = useState('')
  const [type, setType] = useState('movie')
  const inputRef = useRef(null)
  useEscape(onClose)

  useEffect(() => { inputRef.current?.focus() }, [manual])
  useEffect(() => {
    if (manual || !tmdbKey || !query.trim()) { setResults([]); setLoading(false); return }
    setLoading(true)
    setError('')
    const timer = setTimeout(async () => {
      try { setResults(await searchTitles(query, tmdbKey)) }
      catch { setError('Search failed — check your TMDB API key in Settings.') }
      finally { setLoading(false) }
    }, 350)
    return () => clearTimeout(timer)
  }, [query, manual, tmdbKey])

  function submit(event) {
    event.preventDefault()
    if (!title.trim()) return
    onSave({ title: title.trim(), year: year ? Number(year) : undefined, type, poster: '', backdrop: '', overview: '', genres: [] })
  }

  return (
    <motion.div className="overlay fullscreen-mobile-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal watchlist-modal" initial={{ opacity: 0, y: 32, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: .98 }} onClick={(event) => event.stopPropagation()}>
        <div className="modal-pad">
          <div className="modal-head">
            <div><span className="watchlist-eyebrow"><IconBookmark size={14} /> Watch list</span><h2>Add something to watch</h2><p>{manual ? 'Enter the title details below.' : 'Search for a film or show you want to see.'}</p></div>
            <button className="icon-btn" onClick={onClose} aria-label="Close"><IconX size={18} /></button>
          </div>

          {!manual ? (
            <>
              <div className="search-box">
                <IconSearch size={18} />
                <input ref={inputRef} placeholder="Search films & TV…" value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              {error && <p className="watchlist-search-error">{error}</p>}
              <div className="results">
                {loading && <p className="dim" style={{ padding: 12 }}>Searching…</p>}
                {!loading && query && results.length === 0 && !error && <p className="dim" style={{ padding: 12 }}>No matches found.</p>}
                {results.map((result) => (
                  <button className="result-row" key={`${result.type}-${result.tmdbId}`} onClick={() => onSave(result)}>
                    {result.poster ? <img className="result-poster" src={result.poster} alt="" /> : <div className="result-poster result-no-art">No art</div>}
                    <div className="result-info"><div className="result-title">{result.title}</div><div className="result-sub">{result.year || '—'} · {result.type === 'tv' ? 'TV' : 'Film'}{result.genres?.length ? ` · ${result.genres.slice(0, 2).join(', ')}` : ''}</div>{result.overview && <div className="result-overview">{result.overview}</div>}</div>
                  </button>
                ))}
              </div>
              <button className="btn btn-ghost watchlist-manual-button" onClick={() => setManual(true)}>Enter manually instead</button>
            </>
          ) : (
            <form onSubmit={submit}>
              <div className="field"><label>Title</label><input ref={inputRef} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. The Godfather" required /></div>
              <div className="field-row">
                <div className="field"><label>Year</label><input type="number" value={year} onChange={(event) => setYear(event.target.value)} placeholder="1972" /></div>
                <div className="field"><label>Type</label><div className="seg"><button type="button" className={type === 'movie' ? 'on' : ''} onClick={() => setType('movie')}>Film</button><button type="button" className={type === 'tv' ? 'on' : ''} onClick={() => setType('tv')}>TV</button></div></div>
              </div>
              <div className="modal-foot"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" type="submit">Add to watch list</button></div>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
