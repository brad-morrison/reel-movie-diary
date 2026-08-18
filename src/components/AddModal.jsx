import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AnimatePresence, motion, useMotionValue, useSpring, useTransform,
} from 'framer-motion'
import Rating from './Rating.jsx'
import TagPicker from './TagPicker.jsx'
import Top20Button from './Top20Button.jsx'
import { searchTitles } from '../lib/tmdb.js'
import { movieKey } from '../lib/store.js'
import { useEscape } from '../lib/useEscape.js'
import {
  IconX, IconSearch, IconCheck, IconSparkle, IconChevron, IconStar, IconFilm,
} from '../lib/icons.jsx'

const today = () => new Date().toISOString().slice(0, 10)

const blank = () => ({
  title: '', year: '', type: 'movie', poster: '', backdrop: '',
  overview: '', genres: [], tmdbId: undefined, voteAverage: undefined,
  rating: 0, watchedDate: today(), firstTime: true,
  platform: '', companions: [], top20: false,
})

// Small, drifting dust motes that float up behind the poster.
const DUST = Array.from({ length: 7 }, (_, i) => ({
  left: `${6 + i * 13}%`,
  '--d': `${7 + (i % 4) * 2.4}s`,
  '--delay': `${-i * 1.7}s`,
  '--drift': `${(i % 2 ? 1 : -1) * (10 + i * 5)}px`,
  '--size': `${3 + (i % 3)}px`,
}))

// The floaty poster: continuous idle bob + 3D tilt that follows the cursor,
// an ambient colour glow pulled from the artwork, a soft floor shadow, a
// slow specular sheen, and rising dust motes.
function FloatyPoster({ poster, title }) {
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const spring = { stiffness: 140, damping: 16, mass: 0.6 }
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-20, 20]), spring)
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [15, -15]), spring)

  function onMove(e) {
    const r = e.currentTarget.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width - 0.5)
    py.set((e.clientY - r.top) / r.height - 0.5)
  }
  function onLeave() {
    px.set(0)
    py.set(0)
  }

  return (
    <div className="floaty-stage" onMouseMove={onMove} onMouseLeave={onLeave}>
      {poster && <div className="floaty-glow" style={{ backgroundImage: `url("${poster}")` }} />}
      {DUST.map((s, i) => <span key={i} className="floaty-dust" style={s} />)}
      <div className="floaty-floor" />
      <motion.div className="floaty-tilt" style={{ rotateX, rotateY }}>
        <motion.div
          className="floaty-bob"
          animate={{ y: [0, -16, 0], rotateZ: [-1.6, 1.6, -1.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        >
          {poster ? (
            <>
              <img src={poster} alt={title} />
              <span className="floaty-sheen" />
            </>
          ) : (
            <div className="floaty-placeholder">
              <IconFilm size={34} />
              <span>Paste a poster URL to<br />see it float here</span>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}

export default function AddModal({ entries = [], tmdbKey, platforms = [], people = [], top20Full = false, top20SwapOutgoingId = null, onRequestTop20Swap, onClearTop20Swap, onAddPlatform, onAddPerson, onClose, onSave }) {
  const [step, setStep] = useState(tmdbKey ? 'search' : 'form')
  const [manual, setManual] = useState(!tmdbKey)
  const [form, setForm] = useState(blank())
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [scoreGuide, setScoreGuide] = useState(null)
  const inputRef = useRef(null)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  useEscape(onClose)

  const matchingViewings = useMemo(() => {
    if (!form.title.trim()) return []
    const key = movieKey(form)
    return entries.filter((entry) => movieKey(entry) === key)
  }, [entries, form.title, form.year, form.type])
  const existingMovie = matchingViewings[0] || null
  const seededMovieRef = useRef('')

  useEffect(() => {
    if (!existingMovie) {
      seededMovieRef.current = ''
      return
    }
    const key = movieKey(existingMovie)
    if (seededMovieRef.current === key) return
    seededMovieRef.current = key
    const top20 = matchingViewings.some((entry) => entry.top20)
    setForm((current) => ({ ...current, rating: existingMovie.rating || 0, top20, firstTime: false }))
  }, [existingMovie, matchingViewings])

  const ratedMovies = useMemo(() => {
    const seen = new Set()
    return entries.filter((entry) => {
      if (!entry.rating || entry.type !== 'movie') return false
      const key = entry.tmdbId != null
        ? `${entry.type}:${entry.tmdbId}`
        : `${entry.type}:${(entry.title || '').trim().toLowerCase()}:${entry.year || ''}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [entries])

  function nextComparison(low, high, asked) {
    const midpoint = (low + high) / 2
    const unasked = ratedMovies.filter((entry) => !asked.includes(entry.id))
    const focusRadius = Math.max(0.1, (high - low) / 2)
    const focused = unasked.filter((entry) => Math.abs(entry.rating - midpoint) <= focusRadius)
    return (focused.length ? focused : unasked)
      .sort((a, b) => Math.abs(a.rating - midpoint) - Math.abs(b.rating - midpoint))[0] || null
  }

  function finishGuide(low, high, asked) {
    const result = Math.max(0.1, Math.min(10, Math.round(((low + high) / 2) * 10) / 10))
    setScoreGuide({ low, high, asked, current: null, result })
  }

  function startScoreGuide() {
    const low = 0.1
    const high = 10
    const current = nextComparison(low, high, [])
    if (current) setScoreGuide({ low, high, asked: [], current, result: null })
    else setScoreGuide({ low, high, asked: [], current: null, result: null, empty: true })
  }

  function answerComparison(isBetter) {
    const { current, asked } = scoreGuide
    const nextAsked = [...asked, current.id]
    const proposedLow = Math.min(10, current.rating + 0.1)
    const proposedHigh = Math.max(0.1, current.rating)
    const low = isBetter && proposedLow <= scoreGuide.high ? Math.max(scoreGuide.low, proposedLow) : scoreGuide.low
    const high = !isBetter && proposedHigh >= low ? Math.min(scoreGuide.high, proposedHigh) : scoreGuide.high
    if (nextAsked.length >= Math.min(7, ratedMovies.length)) {
      finishGuide(low, high, nextAsked)
      return
    }
    const currentNext = nextComparison(low, high, nextAsked)
    if (!currentNext) finishGuide(low, high, nextAsked)
    else setScoreGuide({ low, high, asked: nextAsked, current: currentNext, result: null })
  }

  useEffect(() => {
    inputRef.current?.focus()
  }, [step])

  // Debounced TMDB search
  useEffect(() => {
    if (step !== 'search' || !tmdbKey) return
    if (!query.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    setErr('')
    const t = setTimeout(async () => {
      try {
        const r = await searchTitles(query, tmdbKey)
        setResults(r)
      } catch (e) {
        setErr('Search failed — check your API key in Settings.')
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [query, step, tmdbKey])

  function pick(r) {
    setForm({ ...blank(), ...r, year: r.year || '' })
    setManual(false)
    setStep('form')
  }

  function goManual() {
    setForm(blank())
    setManual(true)
    setStep('form')
  }

  function submit(e) {
    e?.preventDefault()
    if (!form.title.trim()) return
    onSave({ ...form, top20: form.top20 || !!top20SwapOutgoingId, top20SwapOutgoingId, year: form.year ? Number(form.year) : undefined })
  }

  return (
    <motion.div className="overlay fullscreen-mobile-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className={`modal add-modal ${step === 'form' ? 'modal-wide' : ''}`}
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="icon-btn modal-sticky-close" onClick={onClose} aria-label="Close"><IconX size={18} /></button>
        <div className="modal-pad">
          <div className={`modal-head ${step === 'form' ? 'form-modal-head' : ''}`}>
            {step === 'search' && <div><h2>Log something you watched</h2><p>Search TMDB for the title, or add it by hand.</p></div>}
          </div>

          <AnimatePresence mode="wait">
            {step === 'search' ? (
              <motion.div key="search" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <div className="search-box">
                  <IconSearch size={18} />
                  <input
                    ref={inputRef}
                    placeholder="Search films & TV…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>

                {err && <p style={{ color: 'var(--gold)', fontSize: 13, marginTop: 12 }}>{err}</p>}

                <div className="results">
                  {loading && <p className="dim" style={{ padding: 12 }}>Searching…</p>}
                  {!loading && query && results.length === 0 && !err && (
                    <p className="dim" style={{ padding: 12 }}>No matches. You can still add it manually below.</p>
                  )}
                  {results.map((r) => (
                    <button className="result-row" key={`${r.type}-${r.tmdbId}`} onClick={() => pick(r)}>
                      {r.poster ? (
                        <img className="result-poster" src={r.poster} alt="" />
                      ) : (
                        <div className="result-poster" style={{ display: 'grid', placeItems: 'center', fontSize: 10, color: 'var(--text-faint)' }}>No art</div>
                      )}
                      <div className="result-info">
                        <div className="result-title">{r.title}</div>
                        <div className="result-sub">
                          {r.year || '—'} · {r.type === 'tv' ? 'TV' : 'Film'}
                          {r.genres?.length ? ` · ${r.genres.slice(0, 2).join(', ')}` : ''}
                        </div>
                        {r.overview && <div className="result-overview">{r.overview}</div>}
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}
                  onClick={goManual}
                >
                  Enter manually instead
                </button>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={submit} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
                <div className="add-hero">
                  <div className="add-hero-stage-wrap">
                    <FloatyPoster poster={form.poster} title={form.title} />
                  </div>

                  <div className="add-hero-content">
                    <div className="add-hero-eyebrow">Now logging</div>
                    <h2 className="add-hero-title">{form.title || 'New entry'}</h2>

                    {!manual ? (
                      <>
                        <div className="add-hero-meta">
                          <span>{form.year || '—'}</span>
                          <span className="meta-dot">·</span>
                          <span>{form.type === 'tv' ? 'TV Series' : 'Film'}</span>
                          {form.voteAverage ? (
                            <>
                              <span className="meta-dot">·</span>
                              <span className="tmdb-score"><IconStar size={14} fill="currentColor" /> {Number(form.voteAverage).toFixed(1)}</span>
                            </>
                          ) : null}
                        </div>
                        {form.genres?.length > 0 && (
                          <div className="add-hero-genres">
                            {form.genres.slice(0, 4).map((g) => <span key={g} className="genre-tag">{g}</span>)}
                          </div>
                        )}
                        {form.overview && <p className="add-hero-overview">{form.overview}</p>}
                      </>
                    ) : (
                      <div className="add-hero-manual">
                        <div className="field"><label>Title</label><input ref={inputRef} value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Blade Runner 2049" required /></div>
                        <div className="field-row">
                          <div className="field"><label>Year</label><input type="number" value={form.year} onChange={(e) => set({ year: e.target.value })} placeholder="2017" /></div>
                          <div className="field">
                            <label>Type</label>
                            <div className="seg"><button type="button" className={form.type === 'movie' ? 'on' : ''} onClick={() => set({ type: 'movie' })}>Film</button><button type="button" className={form.type === 'tv' ? 'on' : ''} onClick={() => set({ type: 'tv' })}>TV</button></div>
                          </div>
                        </div>
                        <div className="field"><label>Poster URL (optional)</label><input value={form.poster} onChange={(e) => set({ poster: e.target.value })} placeholder="https://…" /></div>
                      </div>
                    )}

                    <div className="add-hero-divider" />

                    <div className="add-hero-form">
                      {existingMovie && (
                        <motion.div className="existing-movie-notice" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
                          <IconCheck size={17} />
                          <div>
                            <strong>Already in your diary</strong>
                            <span>Watched {matchingViewings.length} {matchingViewings.length === 1 ? 'time' : 'times'} · your rating{matchingViewings.some((entry) => entry.top20) ? ' and Top 20 place are' : ' is'} carried over.</span>
                          </div>
                        </motion.div>
                      )}
                      <div className="field">
                        <label>Your rating</label>
                        <div className="rating-row">
                          <Rating big alwaysOpen value={form.rating} onChange={(r) => set({ rating: r })} />
                          <button type="button" className="score-guide-trigger" onClick={startScoreGuide}>Not sure?</button>
                        </div>
                        <AnimatePresence>
                          {scoreGuide && (
                            <ScoreGuide
                              guide={scoreGuide}
                              onAnswer={answerComparison}
                              onRestart={startScoreGuide}
                              onCancel={() => setScoreGuide(null)}
                              onApply={(rating) => {
                                set({ rating })
                                setScoreGuide(null)
                              }}
                            />
                          )}
                        </AnimatePresence>
                        <div style={{ marginTop: 14 }}><Top20Button active={form.top20 && !top20SwapOutgoingId} pending={!!top20SwapOutgoingId} full={top20Full && !form.top20} onToggle={() => {
                          if (top20SwapOutgoingId) onClearTop20Swap?.()
                          else if (top20Full && !form.top20) onRequestTop20Swap?.(form)
                          else set({ top20: !form.top20 })
                        }} /></div>
                      </div>
                      <div className="field-row">
                        <div className="field watched-date-field">
                          <div className="watched-date-label"><label>Watched on <span>(optional)</span></label><button type="button" onClick={() => set({ watchedDate: form.watchedDate ? '' : today() })}>{form.watchedDate ? 'I don’t remember' : 'Use today'}</button></div>
                          <input type="date" value={form.watchedDate} max={today()} onChange={(e) => set({ watchedDate: e.target.value })} />
                          {!form.watchedDate && <motion.p className="date-unknown-note" initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }}><IconCheck size={13} /> This watch will be saved without a date</motion.p>}
                        </div>
                        <div className="field"><label>First watch?</label><button type="button" className="chip first-time-btn" style={form.firstTime ? { color: 'var(--gold)', borderColor: 'rgba(245,185,66,0.5)', background: 'rgba(245,185,66,0.12)' } : undefined} onClick={() => set({ firstTime: !form.firstTime })}><IconCheck size={14} /> First time</button></div>
                      </div>
                      <div className="field"><label>Where did you watch it?</label><TagPicker options={platforms} value={form.platform} onChange={(v) => set({ platform: v })} onAddOption={onAddPlatform} placeholder="e.g. Netflix" /></div>
                      <div className="field"><label>Who did you watch it with?</label><TagPicker multi accent="rose" options={people} value={form.companions} onChange={(v) => set({ companions: v })} onAddOption={onAddPerson} placeholder="Add a name" /></div>
                    </div>

                    <div className="add-hero-actions">
                      {tmdbKey && <button type="button" className="btn btn-ghost" onClick={() => setStep('search')}><IconChevron size={16} style={{ transform: 'rotate(90deg)' }} /> Back</button>}
                      <button type="submit" className="btn btn-primary" disabled={!form.title.trim()}><IconSparkle size={16} /> {existingMovie ? 'Add viewing' : 'Add to diary'}</button>
                    </div>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ScoreGuide({ guide, onAnswer, onRestart, onCancel, onApply }) {
  return (
    <motion.div
      className="score-guide"
      initial={{ opacity: 0, height: 0, y: -8 }}
      animate={{ opacity: 1, height: 'auto', y: 0 }}
      exit={{ opacity: 0, height: 0, y: -8 }}
      transition={{ duration: .28, ease: [0.22, 1, 0.36, 1] }}
    >
      <button type="button" className="score-guide-close" onClick={onCancel} aria-label="Close rating guide"><IconX size={15} /></button>
      {guide.empty ? (
        <div className="score-guide-empty">
          <IconSparkle size={22} />
          <strong>We need a few reference points first</strong>
          <p>Rate some movies normally, then this guide can compare against your taste.</p>
        </div>
      ) : guide.result ? (
        <div className="score-guide-result">
          <div className="score-guide-eyebrow">Your suggested score</div>
          <div className="score-guide-score"><IconStar size={24} fill="currentColor" /> {guide.result}</div>
          <p>Based on {guide.asked.length} comparison{guide.asked.length === 1 ? '' : 's'} from your diary.</p>
          <div className="score-guide-actions">
            <button type="button" className="btn btn-ghost" onClick={onRestart}>Try again</button>
            <button type="button" className="btn btn-primary" onClick={() => onApply(guide.result)}>Use this score</button>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={guide.current.id} className="score-guide-question" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: .2 }}>
            <div className="score-guide-eyebrow">Taste check · {guide.asked.length + 1} of up to 7</div>
            <div className="score-guide-compare">
              {guide.current.poster
                ? <img src={guide.current.poster} alt={guide.current.title} />
                : <div className="score-guide-poster-fallback">{guide.current.title.slice(0, 1)}</div>}
              <div>
                <span>Better than this?</span>
                <strong>{guide.current.title}</strong>
                <small>{guide.current.year || ''}</small>
              </div>
            </div>
            <div className="score-guide-answers">
              <button type="button" className="score-answer no" onClick={() => onAnswer(false)}>No</button>
              <button type="button" className="score-answer yes" onClick={() => onAnswer(true)}>Yes</button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  )
}
