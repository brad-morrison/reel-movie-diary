import { writeFile } from 'node:fs/promises'

const feeds = [
  { id: 'guardian', name: 'The Guardian', url: 'https://www.theguardian.com/film/rss', colour: 'blue', filmOnly: true },
  { id: 'bbc', name: 'BBC Culture', url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', colour: 'red', filterFilm: true },
  { id: 'indiewire', name: 'IndieWire', url: 'https://www.indiewire.com/feed/', colour: 'pink' },
]

const decode = (value = '') => value
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#8217;/g, '’').replace(/&#8216;/g, '‘').replace(/&#8220;/g, '“').replace(/&#8221;/g, '”').replace(/&#8211;/g, '–').replace(/&#8230;/g, '…')
const tag = (xml, name) => decode(xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'))?.[1] || '').trim()
const attr = (xml, tagName, name) => decode(xml.match(new RegExp(`<${tagName}[^>]*\\s${name}=["']([^"']+)["']`, 'i'))?.[1] || '')
const text = (html = '') => decode(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
const category = (title, description, categories) => {
  const value = `${title} ${description} ${categories}`.toLowerCase()
  if (/trailer|teaser|first look/.test(value)) return 'Trailers'
  if (/review|five stars|four stars|three stars|two stars|one star/.test(value)) return 'Reviews'
  if (/classic|restoration|restored|retrospective|anniversary|re-?release/.test(value)) return 'Classics'
  if (/television|\btv\b|series|netflix|hbo|disney\+|prime video/.test(value)) return 'TV'
  return 'Movies'
}

const status = {}
const articles = []
for (const feed of feeds) {
  try {
    const response = await fetch(feed.url, { headers: { 'user-agent': 'ReelMovieDiary/1.0' } })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const xml = await response.text()
    const items = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((match) => match[1])
    let kept = 0
    for (const item of items) {
      const title = text(tag(item, 'title'))
      const description = text(tag(item, 'description')).replace(/Continue reading…?$/i, '').trim()
      const categories = [...item.matchAll(/<category(?:\s[^>]*)?>([\s\S]*?)<\/category>/gi)].map((match) => text(decode(match[1]))).join(' ')
      if (feed.filterFilm && !/film|movie|cinema|actor|actress|director|oscar|hollywood/i.test(`${title} ${description}`)) continue
      const url = tag(item, 'link')
      const image = attr(item, 'media:content', 'url') || attr(item, 'media:thumbnail', 'url') || attr(tag(item, 'content:encoded'), 'img', 'src')
      if (!title || !url) continue
      articles.push({ id: `${feed.id}-${Buffer.from(url).toString('base64url').slice(-18)}`, title, description, url, image: image.replace('/standard/240/', '/standard/976/'), publishedAt: new Date(tag(item, 'pubDate')).toISOString(), sourceId: feed.id, source: feed.name, sourceColour: feed.colour, category: category(title, description, categories) })
      kept += 1
    }
    status[feed.id] = { ok: true, articles: kept }
  } catch (error) {
    status[feed.id] = { ok: false, error: error.message }
  }
}

articles.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

// Some feeds (currently IndieWire) omit images even though the linked page
// publishes a standard social-sharing image. Fill only those gaps.
for (const article of articles.filter((item) => !item.image || item.sourceId === 'guardian')) {
  try {
    const response = await fetch(article.url, { headers: { 'user-agent': 'ReelMovieDiary/1.0' } })
    if (!response.ok) continue
    const html = await response.text()
    article.image = decode(
      html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i)?.[1]
      || '',
    )
  } catch {
    // The card retains its designed artwork fallback when enrichment fails.
  }
}

const output = { generatedAt: new Date().toISOString(), sources: status, articles }
await writeFile(new URL('../public/film-news.json', import.meta.url), `${JSON.stringify(output, null, 2)}\n`)
console.log(`Collected ${articles.length} articles from ${Object.values(status).filter((item) => item.ok).length}/${feeds.length} sources`)
