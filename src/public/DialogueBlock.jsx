import { useEffect, useRef, useState } from 'react'
import { sayDialogue, stopLessonAudio } from './lessonSpeech'
import AccentSpeakers, { AccentToggle } from './AccentSpeakers'
import { readDialogueAccent, writeDialogueAccent } from './dialogueAccent'

/** Diálogo: selector US/UK para escucharlo completo y, en cada línea, sus dos bocinas. */
export default function DialogueBlock({ dialogue: d, children = null }) {
  const [accent, setAccentState] = useState(() => readDialogueAccent(d.title))
  const [line, setLine] = useState(-1)
  const accentRef = useRef(accent)
  const setAccent = next => {
    accentRef.current = next
    writeDialogueAccent(d.title, next)
    setAccentState(next)
  }
  useEffect(() => () => stopLessonAudio(), [])
  const play = slow => sayDialogue(d.lines, { accent: accentRef.current, slow, onLine: setLine })
  return <div className="ml-dialogue-block">
    <h3>{d.title}</h3>
    <div className="ml-dialogue-all">
      <AccentToggle value={accent} onChange={setAccent} label={`Acento para escuchar completo: ${d.title}`} />
      <button type="button" onClick={() => play(false)} aria-label={`Escuchar completo en acento ${accent === 'en-GB' ? 'británico' : 'americano'}: ${d.title}`}>🔊 Escuchar todo</button>
      <button type="button" onClick={() => play(true)} aria-label={`Escuchar despacio en acento ${accent === 'en-GB' ? 'británico' : 'americano'}: ${d.title}`}>🐢 Despacio</button>
    </div>
    <ul className="ml-dialogue">{d.lines.map((t, i) => <li key={i} className={[t.speaker !== d.lines[0].speaker && 'ml-me', line === i && 'ml-now'].filter(Boolean).join(' ') || undefined}><strong>{t.speaker}</strong><p>{t.text}</p>{t.es && <p className="ml-dialogue-es">{t.es}</p>}<AccentSpeakers text={t.text} voice={t.voice} /></li>)}</ul>
    {children}
  </div>
}
