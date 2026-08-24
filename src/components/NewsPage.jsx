import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { IconFilm, IconSearch, IconSparkle } from '../lib/icons.jsx'

const CATEGORIES = ['All', 'Movies', 'Trailers', 'Reviews', 'Classics']
const relativeTime = (value) => {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 3600000))
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function NewsPage() {
  const [feed, setFeed] = useState(null)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/film-news.json', { cache: 'no-store' }).then((response) => {
      if (!response.ok) throw new Error(`News request failed (${response.status})`)
      return response.json()
    }).then((data) => { if (!cancelled) setFeed(data) }).catch((reason) => { if (!cancelled) setError(reason.message) })
    return () => { cancelled = true }
  }, [])

  const articles = useMemo(() => (feed?.articles || []).filter((article) => article.category !== 'TV').filter((article) => category === 'All' || article.category === category).filter((article) => !query.trim() || `${article.title} ${article.description} ${article.source}`.toLowerCase().includes(query.trim().toLowerCase())), [feed, category, query])
  const updated = feed?.generatedAt ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(feed.generatedAt)) : ''

  return <section className="news-page">
    <div className="news-heading"><div><span className="watchlist-eyebrow"><IconSparkle size={15} /> The Reel Report</span><h1>Film news, without the noise.</h1><p>Fresh stories gathered from trusted publications. Read everything at the original source.</p></div>{updated && <small>Updated {updated}</small>}</div>
    <div className="news-controls"><div className="search-box"><IconSearch size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the news…" /></div><div className="news-categories">{CATEGORIES.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div></div>
    {!feed && !error && <div className="news-state">Loading today’s stories…</div>}
    {error && <div className="news-state">Could not load the news feed: {error}</div>}
    <div className="news-grid">{articles.map((article, index) => <motion.a className={`news-card ${index === 0 ? 'news-card-lead' : index < 3 ? 'news-card-tile' : 'news-card-row'}`} href={article.url} target="_blank" rel="noreferrer" key={article.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * .018, .16) }}><NewsImage article={article} /><div className="news-card-copy"><div className="news-meta"><span className={`news-source ${article.sourceColour}`}>{article.source}</span><span>{article.category}</span><span>{relativeTime(article.publishedAt)}</span></div><h2>{article.title}</h2><p>{article.description}</p><strong>Read story <span>→</span></strong></div></motion.a>)}</div>
    {feed && !articles.length && <div className="empty"><div className="empty-mark"><IconFilm size={46} /></div><h3>No stories match</h3><p>Try another category or search.</p></div>}
  </section>
}

function NewsImage({ article }) {
  const [failed, setFailed] = useState(false)
  return <div className="news-card-art">{article.image && !failed ? <img src={article.image} alt="" onError={() => setFailed(true)} /> : <div className="news-art-fallback"><IconFilm size={28} /></div>}</div>
}
