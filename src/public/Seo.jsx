import { useEffect } from 'react'

export default function Seo({ title, description, path, article = false, noindex = false, image }) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = `${title} — Munchira English`
    const tags = [
      ['meta[name="description"]', 'meta', 'name', 'description', description],
      ['meta[property="og:title"]', 'meta', 'property', 'og:title', document.title],
      ['meta[property="og:description"]', 'meta', 'property', 'og:description', description],
      ['meta[property="og:type"]', 'meta', 'property', 'og:type', article ? 'article' : 'website'],
      ['meta[property="og:url"]', 'meta', 'property', 'og:url', `https://munchira.com${path}`],
      ['meta[name="twitter:card"]', 'meta', 'name', 'twitter:card', image ? 'summary_large_image' : 'summary'],
      ['link[rel="canonical"]', 'link', 'rel', 'canonical', `https://munchira.com${path}`],
      ['meta[name="robots"]', 'meta', 'name', 'robots', noindex ? 'noindex, follow' : 'index, follow'],
    ]
    if (image) {
      tags.push(['meta[property="og:image"]', 'meta', 'property', 'og:image', image])
      tags.push(['meta[name="twitter:image"]', 'meta', 'name', 'twitter:image', image])
    }
    const restore = tags.map(([selector, tag, key, identifier, value]) => {
      let element = document.head.querySelector(selector)
      const existing = Boolean(element)
      if (!element) { element = document.createElement(tag); element.setAttribute(key, identifier); document.head.append(element) }
      const attr = tag === 'link' ? 'href' : 'content'
      const old = element.getAttribute(attr)
      element.setAttribute(attr, value)
      return () => { if (!existing) element.remove(); else if (old === null) element.removeAttribute(attr); else element.setAttribute(attr, old) }
    })
    return () => { document.title = previousTitle; restore.forEach(fn => fn()) }
  }, [title, description, path, article, noindex, image])
  return null
}
