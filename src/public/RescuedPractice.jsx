import ExerciseBlock from '../components/ExerciseBlock'
import { useDraftState } from '../contexts/a1-draft-context'
import AccentSpeakers from './AccentSpeakers'
import DialogueBlock from './DialogueBlock'
import { displayForm } from './model-lesson'

// Content rescued from the four old A1 modules (see A1_UNIFICACION.md). It is optional practice:
// it never gates a step or records grades. Only the rescued words reach Repaso, through the cards step.

/** Bocinas 🇺🇸/🇬🇧 y «Despacio»: solo MP3 de ElevenLabs; sin grabación, la bocina queda deshabilitada. */
function Listen({ text, voice }) {
  return <AccentSpeakers text={text} voice={voice} slow className="ml-listen" />
}

export function ExtraVocab({ lesson, legacy = false }) {
  if (!lesson.extraVocab?.length) return null
  return <>
    <h3>Más palabras útiles</h3>
    <p className="ml-tip">{legacy ? 'Vienen del curso anterior. ' : ''}También aparecen en las tarjetas y entran en «Repaso».</p>
    <ul className="ml-vocab">{lesson.extraVocab.map(v => <li key={v.en}><strong>{v.en}</strong><span>{displayForm(v.es)}</span><em>«{v.say}»</em>{v.example && <span>{v.example}</span>}<Listen text={v.en} /></li>)}</ul>
  </>
}

export function ExtraTables({ lesson }) {
  if (!lesson.extraTables?.length) return null
  return lesson.extraTables.map(table => <div key={table.caption} className="ml-table-wrap"><table className="ml-table"><caption>{table.caption}</caption>
    <thead><tr>{table.head.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
    <tbody>{table.rows.map(r => <tr key={r[0]}>{r.map((cell, i) => i === 0 ? <th key={i} scope="row">{cell}</th> : <td key={i}>{cell}</td>)}</tr>)}</tbody></table></div>)
}

export function ExtraGuided({ lesson, legacy = false }) {
  // Mounted only on demand: its inputs autofocus and must not pull the learner away from required practice.
  const [open, setOpen] = useDraftState('extraGuided.open', false)
  if (!lesson.extraGuided?.length) return null
  return <>
    <h3>Práctica extra (opcional)</h3>
    <p>{lesson.extraGuided.length} ejercicios {legacy ? 'del curso anterior ' : ''}para reforzar lo mismo. No cuentan para la nota.</p>
    {open ? <ExerciseBlock speakOptions draftKey="extraGuided" exercises={lesson.extraGuided} /> : <button type="button" className="mp-button" onClick={() => setOpen(true)}>Abrir la práctica extra</button>}
  </>
}

/** Rescued listening dialogues: speaker names in bold and never voiced; US/UK selector for the whole dialogue and two speakers per turn. */
export function RescuedDialogues({ lesson }) {
  if (!lesson.rescuedDialogues?.length) return null
  return lesson.rescuedDialogues.map((d, index) => <DialogueBlock key={d.title} dialogue={d}>
    {d.questions?.length > 0 && <><h4>¿Entendiste?</h4><ExerciseBlock speakOptions draftKey={`rescuedDialogue.${index}`} exercises={d.questions} /></>}
  </DialogueBlock>)
}

export function FreeChallenge({ lesson }) {
  const challenge = lesson.freeChallenge
  const [text, setText] = useDraftState('freeChallenge.text', '')
  const [shown, setShown] = useDraftState('freeChallenge.shown', false)
  if (!challenge) return null
  return <>
    <h3>Reto de escritura (opcional)</h3><p>{challenge.task}</p>
    <label className="ml-free">Escribe aquí<textarea rows={6} value={text} maxLength={2000} lang="en" spellCheck onChange={e => setText(e.target.value)} /></label>
    <h4>Revisa tu texto</h4><ul className="ml-summary">{challenge.checklist.map(item => <li key={item}>{item}</li>)}</ul>
    <button type="button" className="mp-button" onClick={() => setShown(true)}>Ver un modelo</button>
    {shown && <p className="ml-example">{challenge.model}</p>}
    <p className="ml-tip">Este reto no recibe nota ni corrección automática.</p>
  </>
}
