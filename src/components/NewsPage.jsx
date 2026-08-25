import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { IconChevron, IconFilm, IconSearch, IconSparkle, IconX } from '../lib/icons.jsx'

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
  const [source, setSource] = useState('all')
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(12)

  useEffect(() => {
    let cancelled = false
    fetch('/film-news.json', { cache: 'no-store' }).then((response) => {
      if (!response.ok) throw new Error(`News request failed (${response.status})`)
      return response.json()
    }).then((data) => { if (!cancelled) setFeed(data) }).catch((reason) => { if (!cancelled) setError(reason.message) })
    return () => { cancelled = true }
  }, [])

  const published = useMemo(() => (feed?.articles || []).filter((article) => article.category !== 'TV'), [feed])
  const sources = useMemo(() => {
    const counts = new Map()
    for (const article of published) {
      const entry = counts.get(article.sourceId) || { id: article.sourceId, name: article.source, colour: article.sourceColour, count: 0 }
      entry.count += 1
      counts.set(article.sourceId, entry)
    }
    return [...counts.values()]
  }, [published])

  const articles = useMemo(() => {
    const term = query.trim().toLowerCase()
    return published
      .filter((article) => category === 'All' || article.category === category)
      .filter((article) => source === 'all' || article.sourceId === source)
      .filter((article) => !term || `${article.title} ${article.description} ${article.source}`.toLowerCase().includes(term))
  }, [published, category, source, query])

  useEffect(() => { setShown(12) }, [category, source, query])

  const updated = feed?.generatedAt ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(feed.generatedAt)) : ''
  const [lead, ...remaining] = articles
  const spotlight = remaining.slice(0, 2)
  const grid = remaining.slice(2, 8)
  const more = remaining.slice(8)
  const visibleMore = more.slice(0, shown)

  return <section className="news-page">
    <header className="news-masthead">
      <div className="news-masthead-copy">
        <span className="watchlist-eyebrow"><IconSparkle size={15} /> The Reel Report</span>
        <h1>Film news, <em>without the noise.</em></h1>
        <p>Fresh stories gathered from trusted publications and sorted by the hour. Read everything at the original source.</p>
      </div>
      <div className="news-masthead-side">
        {updated && <span className="news-updated"><i className="news-pulse" />Updated {updated}</span>}
        {sources.length > 0 && <div className="news-sources">
          <button type="button" className={source === 'all' ? 'active' : ''} onClick={() => setSource('all')}>All sources<small>{published.length}</small></button>
          {sources.map((item) => <button type="button" key={item.id} className={`${item.colour} ${source === item.id ? 'active' : ''}`} onClick={() => setSource(source === item.id ? 'all' : item.id)}><i />{item.name}<small>{item.count}</small></button>)}
        </div>}
      </div>
    </header>

    {published.length > 0 && <div className="news-controls">
      <div className="search-box">
        <IconSearch size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the news…" />
        {query && <button type="button" className="news-search-clear" onClick={() => setQuery('')} aria-label="Clear search"><IconX size={13} /></button>}
      </div>
      <div className="news-categories">{CATEGORIES.map((item) => <button type="button" key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>
        {category === item && <motion.span layoutId="news-category-pill" className="news-category-pill" transition={{ type: 'spring', stiffness: 430, damping: 36 }} />}
        <span>{item}</span>
      </button>)}</div>
    </div>}

    {!feed && !error && <div className="news-skeleton">{Array.from({ length: 7 }).map((_, index) => <div key={index} className="news-skeleton-card" />)}</div>}
    {error && <div className="news-state"><div className="empty-mark"><IconFilm size={40} /></div><h3>The newsroom is quiet</h3><p>Could not load the feed: {error}</p></div>}

    {lead && <div className="news-headline-row">
      <NewsFeature article={lead} variant="lead" index={0} />
      {spotlight.length > 0 && <div className="news-spotlight">{spotlight.map((article, index) => <NewsFeature key={article.id} article={article} variant="spotlight" index={index + 1} />)}</div>}
    </div>}

    {grid.length > 0 && <div className="news-grid">{grid.map((article, index) => <NewsCard key={article.id} article={article} index={index + 3} />)}</div>}

    {more.length > 0 && <div className="news-more">
      <div className="news-more-head"><h3>More headlines</h3><span>{more.length} stories</span></div>
      <div className="news-more-list">{visibleMore.map((article, index) => <NewsRow key={article.id} article={article} index={index} />)}</div>
      {more.length > visibleMore.length && <button type="button" className="news-more-btn" onClick={() => setShown((value) => value + 16)}>Show {Math.min(16, more.length - visibleMore.length)} more <IconChevron size={15} /></button>}
    </div>}

    {feed && !articles.length && <div className="empty"><div className="empty-mark news-empty-mark"><IconFilm size={46} /></div><h3>No stories match</h3><p>Try another category, source, or search term.</p></div>}
  </section>
}

const fade = (index) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: .34, delay: Math.min(index * .028, .22) } })

function NewsFeature({ article, variant, index }) {
  return <motion.a className={`news-feature news-feature-${variant}`} href={article.url} target="_blank" rel="noreferrer" {...fade(index)}>
    <div className="news-feature-art"><NewsImage article={article} /></div>
    <div className="news-feature-copy">
      <Meta article={article} over />
      <h2>{article.title}</h2>
      {variant === 'lead' && <p>{article.description}</p>}
      <span className="news-read">Read story <IconChevron size={14} /></span>
    </div>
  </motion.a>
}

function NewsCard({ article, index }) {
  return <motion.a className="news-card" href={article.url} target="_blank" rel="noreferrer" {...fade(index)}>
    <div className="news-card-art"><NewsImage article={article} /></div>
    <div className="news-card-copy">
      <Meta article={article} />
      <h2>{article.title}</h2>
      <p>{article.description}</p>
      <span className="news-read">Read story <IconChevron size={14} /></span>
    </div>
  </motion.a>
}

function NewsRow({ article, index }) {
  return <motion.a className="news-row" href={article.url} target="_blank" rel="noreferrer" {...fade(index)}>
    <span className="news-row-index">{String(index + 1).padStart(2, '0')}</span>
    <div className="news-row-art"><NewsImage article={article} /></div>
    <div className="news-row-copy">
      <h2>{article.title}</h2>
      <Meta article={article} />
    </div>
    <span className="news-row-go"><IconChevron size={16} /></span>
  </motion.a>
}

function Meta({ article, over }) {
  return <div className={`news-meta${over ? ' news-meta-over' : ''}`}>
    <span className={`news-source ${article.sourceColour}`}><i />{article.source}</span>
    <span>{article.category}</span>
    <span>{relativeTime(article.publishedAt)}</span>
  </div>
}

function NewsImage({ article }) {
  const [failed, setFailed] = useState(false)
  if (!article.image || failed) return <div className="news-art-fallback"><IconFilm size={26} /></div>
  return <img src={article.image} alt="" loading="lazy" onError={() => setFailed(true)} />
}
