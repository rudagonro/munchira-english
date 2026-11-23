import { useState } from 'react'

export default function GrammarPractice({ exercise }) {
  const [selected, setSelected] = useState('')
  const [checked, setChecked] = useState(false)
  const correct = selected === exercise.answer
  return <section className="mp-grammar-practice" aria-labelledby="grammar-practice-title">
    <p className="mp-eyebrow">TU TURNO</p><h2 id="grammar-practice-title">Un pequeño paso más.</h2>
    <form onSubmit={event => { event.preventDefault(); if (selected) setChecked(true) }}>
      <fieldset disabled={checked}><legend>{exercise.prompt}</legend><div className="mp-grammar-options">{exercise.options.map(option => <label className={`mp-option ${selected === option ? 'mp-option-selected' : ''}`} key={option}><input type="radio" name="grammar-answer" value={option} checked={selected === option} onChange={() => setSelected(option)} /><span>{option}</span></label>)}</div></fieldset>
      {checked && <div className={`mp-feedback ${correct ? 'mp-feedback-correct' : ''}`} role="status"><strong>{correct ? '¡Muy bien!' : 'Vamos a verlo paso a paso.'} La respuesta es «{exercise.answer}».</strong><p>{exercise.explanation}</p></div>}
      <div className="mp-grammar-actions">{checked ? <button className="mp-button mp-button-dark" type="button" onClick={() => { setSelected(''); setChecked(false) }}>Volver a practicar <span aria-hidden="true">↻</span></button> : <button className="mp-button mp-button-dark" type="submit" disabled={!selected}>Comprobar <span aria-hidden="true">→</span></button>}</div>
    </form>
  </section>
}
