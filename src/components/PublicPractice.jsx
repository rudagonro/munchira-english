import { useState } from 'react'
import { checkPublicPractice, publicPractice } from '../data/publicPractice'

export default function PublicPractice() {
  const [selected, setSelected] = useState('')
  const [checked, setChecked] = useState(false)
  const correct = checkPublicPractice(selected)
  return (
    <div className="mp-practice" aria-label="Ejercicio de muestra de inglés">
      <div className="mp-practice-top"><span>Una pequeña práctica</span><span>A1 · Presentaciones</span></div>
      <div className="mp-practice-body">
        <p className="mp-eyebrow">Completa la frase</p>
        <h3>Hello! My name <span className="mp-blank">{checked && correct ? selected : '___'}</span> Ana.</h3>
        <fieldset><legend className="mp-sr-only">Elige la palabra que completa la frase</legend>
          {publicPractice.options.map(option => <label className={`mp-option ${selected === option ? 'mp-option-selected' : ''}`} key={option}>
            <input type="radio" name="public-practice" value={option} checked={selected === option} disabled={checked} onChange={() => setSelected(option)} />
            <span>{option}</span>
          </label>)}
        </fieldset>
        {checked && <div className={`mp-feedback ${correct ? 'mp-feedback-correct' : ''}`} role="status"><strong>{correct ? '¡Muy bien! La respuesta es «is».' : 'La respuesta es «is». Vamos a verlo.'}</strong><p>{publicPractice.explanation}</p></div>}
        <div className="mp-practice-bottom"><span>Ejemplo · no guarda progreso</span>
          {checked ? <button className="mp-button mp-button-dark" onClick={() => { setSelected(''); setChecked(false) }}>Volver a practicar ↻</button> : <button className="mp-button mp-button-dark" disabled={!selected} onClick={() => setChecked(true)}>Comprobar <span aria-hidden="true">→</span></button>}
        </div>
      </div>
    </div>
  )
}
