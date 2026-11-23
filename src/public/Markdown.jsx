import { Fragment } from 'react'
import { Link } from 'react-router-dom'

function inline(text) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link) {
      if (/^\/(?!\/)/.test(link[2])) return <Link key={index} to={link[2]}>{link[1]}</Link>
      if (/^https:\/\//.test(link[2])) return <a key={index} href={link[2]} rel="noopener noreferrer">{link[1]}</a>
      return <Fragment key={index}>{link[1]}</Fragment>
    }
    return <Fragment key={index}>{part}</Fragment>
  })
}

export default function Markdown({ source }) {
  const lines = source.split('\n')
  const blocks = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) { index++; continue }
    if (line.startsWith('```')) {
      const code = []; index++
      while (index < lines.length && !lines[index].startsWith('```')) code.push(lines[index++])
      index++; blocks.push(<pre key={blocks.length}><code>{code.join('\n')}</code></pre>); continue
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      const Tag = `h${Math.max(2, heading[1].length)}`
      blocks.push(<Tag key={blocks.length}>{inline(heading[2])}</Tag>); index++; continue
    }
    if (/^>\s?/.test(line)) { blocks.push(<blockquote key={blocks.length}>{inline(line.replace(/^>\s?/, ''))}</blockquote>); index++; continue }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line); const items = []
      const pattern = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/
      while (index < lines.length && pattern.test(lines[index])) items.push(lines[index++].replace(pattern, ''))
      const List = ordered ? 'ol' : 'ul'
      blocks.push(<List key={blocks.length}>{items.map((item, i) => <li key={i}>{inline(item)}</li>)}</List>); continue
    }
    if (line.includes('|') && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1] || '')) {
      const cells = row => row.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim())
      const headers = cells(line); const rows = []; index += 2
      while (index < lines.length && lines[index].includes('|')) rows.push(cells(lines[index++]))
      blocks.push(<div className="mp-table-scroll" key={blocks.length} role="region" aria-label="Tabla del artículo" tabIndex={0}><table><thead><tr>{headers.map((cell, i) => <th scope="col" key={i}>{inline(cell)}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{inline(cell)}</td>)}</tr>)}</tbody></table></div>); continue
    }
    const paragraph = [line]; index++
    while (index < lines.length && lines[index].trim() && !/^(#|>|```|[-*]\s|\d+\.\s)/.test(lines[index])) paragraph.push(lines[index++])
    blocks.push(<p key={blocks.length}>{inline(paragraph.join(' '))}</p>)
  }
  return <div className="mp-prose">{blocks}</div>
}
