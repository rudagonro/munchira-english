import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { supabase } from '../lib/supabase'
import './diagnostic-choice.css'
import { useDiagnostic } from '../hooks/useDiagnostic'
import { LEVEL_NAMES, bankReading, bankListening, bankWriting } from '../data/diagnosticBank'
import { getCurriculum } from '../data/curriculum'
import { isWaitlisted, unit0For } from '../data/levelAccess'

// Duración orientativa de cada nivel (semanas de estudio constante).
const LEVEL_DURATION = { A1: '8–10 semanas', A2: '10–12 semanas', B1: '12–14 semanas', B2: '14–16 semanas', C1: '16–18 semanas', C2: 'Programa abierto' }

export default function Diagnostic({ preview = false }) {
  const { saveDiagnosticResult } = useAuth()
  const navigate = useNavigate()
  const diag = useDiagnostic()
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState('')

  // «Empiezo desde cero»: inscribe en A1 sin guardar un diagnóstico falso.
  async function handleStartFromZero() {
    setStarting(true)
    setStartError('')
    const { error } = await supabase.rpc('start_from_zero')
    setStarting(false)
    if (error) {
      console.error(error)
      setStartError('No pudimos empezar en A1 ahora mismo. Inténtalo de nuevo en unos minutos o haz la prueba de nivel.')
      return
    }
    navigate('/app')
  }

  function handleExit() {
    if (preview) return navigate('/revisor')
    if (window.confirm('Si sales ahora, tus respuestas de esta prueba no se guardan. ¿Quieres salir?')) navigate('/app')
  }

  function handleSelect(idx) {
    setSelectedIdx(idx)
  }

  function handleNext() {
    if (diag.block === 1) {
      diag.submitGVAnswer(selectedIdx)
      setSelectedIdx(null)
    } else if (diag.block === 2) {
      diag.advanceReading(selectedIdx)
      setSelectedIdx(null)
    } else if (diag.block === 3) {
      diag.advanceListening(selectedIdx)
      setSelectedIdx(null)
    } else if (diag.block === 4) {
      handleFinish()
    }
  }

  async function handleFinish() {
    const result = diag.finishDiagnostic()
    if (preview) return // modo revisor: se muestra el resultado pero no se guarda nada
    setSaving(true)
    setSaveError('')
    const { error } = await saveDiagnosticResult(result)
    setSaving(false)
    if (error) {
      console.error(error)
      setSaveError('El diagnóstico se calculó pero no se pudo guardar. Intenta de nuevo más tarde.')
    }
  }

  function playAudio(transcript) {
    if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(transcript)
      utter.lang = 'en-US'
      utter.rate = 0.95
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utter)
    }
  }

  const exitPath = preview ? '/revisor' : '/app'
  const previewBanner = preview ? (
    <div className="rv-bar" role="note">
      <div className="rv-bar-top">
        <span><strong>Modo revisor</strong> · el diagnóstico no se guarda. Puedes avanzar sin responder.</span>
        <button className="rv-chip" type="button" onClick={() => navigate('/revisor')}>← Revisor</button>
      </div>
    </div>
  ) : null

  // --- Pantalla de intro ---
  if (diag.block === 0 || (diag.block === 1 && !diag.gvCurrentQ)) {
    return (
      <div className="diag-intro">
        {previewBanner}
        <div className="diag-mark">Primer paso · Munchira English</div>
        <h1>¿Cómo quieres <span>empezar</span>?</h1>
        <p>Elige lo que mejor te describa. Siempre podrás hacer la prueba de nivel más tarde desde tu panel.</p>
        <div className="diag-choice">
          {!preview && (
            <div className="diag-choice-card">
              <h2>Empiezo desde cero</h2>
              <p>Nunca he estudiado inglés o sé muy poco. Empiezo en A1, paso a paso.</p>
              <button type="button" className="diag-choice-btn" onClick={handleStartFromZero} disabled={starting}>
                {starting ? 'Preparando A1...' : 'Empezar en A1'}
              </button>
            </div>
          )}
          <div className="diag-choice-card">
            <h2>Ya sé algo de inglés</h2>
            <p>Haz la prueba de nivel: gramática, vocabulario, lectura, escucha y escritura. La dificultad se adapta a tus respuestas.</p>
            <button className="btn-primary diag-start-btn" onClick={diag.startDiagnostic}>
              Hacer prueba de nivel
            </button>
          </div>
        </div>
        {startError && <div className="error-banner" role="alert">{startError}</div>}
        {!preview && (
          <button type="button" className="diag-exit-link" onClick={() => navigate('/app')}>Volver a mi panel</button>
        )}
      </div>
    )
  }

  // --- Pantalla de resultados ---
  if (diag.block === 5 && diag.result) {
    const r = diag.result
    const units = getCurriculum(r.finalLevel)?.units ?? []
    const unit0 = unit0For(r.finalLevel)
    const waiting = isWaitlisted(r.finalLevel)
    return (
      <div className="diag-results">
        {previewBanner}
        <div className="diag-eyebrow">Tu nivel MCER es</div>
        <div className="diag-level-big">{r.finalLevel}</div>
        <div className="diag-level-name">{LEVEL_NAMES[r.finalLevel]}</div>

        <div className="diag-skill-bars">
          <SkillBar label="Gramática y vocabulario" pct={r.gvPct} />
          <SkillBar label="Lectura" pct={r.readingPct} />
          <SkillBar label="Escucha" pct={r.listeningPct} />
          <SkillBar label="Escritura" pct={r.writingPct} />
        </div>

        <div className="diag-cycle-card">
          <div className="diag-ctitle">Tu nivel y sus unidades</div>
          <h2>{r.finalLevel} — {LEVEL_NAMES[r.finalLevel]}</h2>
          <ul>
            <li key="u0">Unidad 0 · {unit0.title}</li>
            {units.map((unit) => <li key={unit.id}>Unidad {unit.number} · {unit.title}</li>)}
          </ul>
          {waiting && <p className="diag-waitlist" role="status">Este nivel está en preparación: quedas en su lista de espera y te avisaremos cuando esté listo. Mientras tanto puedes practicar con A1 si quieres.</p>}
          <div className="diag-cycle-meta">
            Duración estimada: {LEVEL_DURATION[r.finalLevel]} · Puntaje global: {r.finalScore.toFixed(1)}/100
          </div>
        </div>

        {saving && <p className="loading-text" style={{ marginTop: 16 }}>Guardando resultado...</p>}
        {saveError && <div className="error-banner" role="alert" style={{ marginTop: 16 }}>{saveError}</div>}
        {!saving && !saveError && (
          <p className="success-banner" style={{ marginTop: 16, display: 'inline-block' }}>
            {waiting ? `Resultado guardado. Quedaste en la lista de espera de ${r.finalLevel}.` : `Resultado guardado. Ya quedaste inscrito en ${r.finalLevel}.`}
          </p>
        )}

        <button
          className="btn-primary diag-continue-btn"
          onClick={() => navigate(exitPath)}
          disabled={saving}
        >
          {saving ? 'Guardando...' : preview ? 'Volver al revisor' : 'Ir a mi panel'}
        </button>
      </div>
    )
  }

  // --- Bloque 1: Gram/Vocab ---
  if (diag.block === 1) {
    const q = diag.gvCurrentQ
    return (
      <DiagShell onExit={handleExit} banner={previewBanner} stageLabel={`Bloque 1 · Gramática y vocabulario — calibrando: ${diag.gvCurrentLevel}`}>
        <div className="diag-tag">Pregunta {diag.gvQuestionNumber} de hasta 15</div>
        <h1 className="diag-question">{q.q}</h1>
        <OptionsList options={q.opts} selectedIdx={selectedIdx} onSelect={handleSelect} />
        <NextButton disabled={!preview && selectedIdx === null} onClick={handleNext} />
      </DiagShell>
    )
  }

  // --- Bloque 2: Reading ---
  if (diag.block === 2) {
    const data = bankReading[diag.readingLevel]
    if (diag.readingStep === 0) {
      return (
        <DiagShell onExit={handleExit} banner={previewBanner} stageLabel={`Bloque 2 · Lectura — nivel ${diag.readingLevel}`}>
          <div className="diag-tag">Comprensión de lectura</div>
          <div className="diag-passage">{data.passage}</div>
          <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>
            Lee el texto con atención. Pulsa "Siguiente" cuando estés listo.
          </p>
          <NextButton disabled={false} onClick={handleNext} label="Responder preguntas →" />
        </DiagShell>
      )
    }
    const q = data.questions[diag.readingStep - 1]
    return (
      <DiagShell onExit={handleExit} banner={previewBanner} stageLabel={`Bloque 2 · Lectura — nivel ${diag.readingLevel}`}>
        <div className="diag-tag">Pregunta {diag.readingStep} de {data.questions.length}</div>
        <div className="diag-passage diag-passage-small">{data.passage}</div>
        <h1 className="diag-question">{q.q}</h1>
        <OptionsList options={q.opts} selectedIdx={selectedIdx} onSelect={handleSelect} />
        <NextButton disabled={!preview && selectedIdx === null} onClick={handleNext} />
      </DiagShell>
    )
  }

  // --- Bloque 3: Listening ---
  if (diag.block === 3) {
    const data = bankListening[diag.listeningLevel]
    if (diag.listeningStep === 0) {
      return (
        <DiagShell onExit={handleExit} banner={previewBanner} stageLabel={`Bloque 3 · Escucha — nivel ${diag.listeningLevel}`}>
          <div className="diag-tag">Comprensión auditiva</div>
          <AudioBox transcript={data.transcript} onPlay={playAudio} />
          <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>
            Escucha con atención antes de continuar. Puedes reproducirlo varias veces.
          </p>
          <NextButton disabled={false} onClick={handleNext} label="Responder preguntas →" />
        </DiagShell>
      )
    }
    const q = data.questions[diag.listeningStep - 1]
    return (
      <DiagShell onExit={handleExit} banner={previewBanner} stageLabel={`Bloque 3 · Escucha — nivel ${diag.listeningLevel}`}>
        <div className="diag-tag">Pregunta {diag.listeningStep} de {data.questions.length}</div>
        <AudioBox transcript={data.transcript} onPlay={playAudio} />
        <h1 className="diag-question">{q.q}</h1>
        <OptionsList options={q.opts} selectedIdx={selectedIdx} onSelect={handleSelect} />
        <NextButton disabled={!preview && selectedIdx === null} onClick={handleNext} />
      </DiagShell>
    )
  }

  // --- Bloque 4: Writing ---
  if (diag.block === 4) {
    const prompt = bankWriting[diag.writingLevel]
    const words = diag.writingText.trim().split(/\s+/).filter((w) => w.length > 0).length
    const ok = words >= 40
    return (
      <DiagShell onExit={handleExit} banner={previewBanner} stageLabel={`Bloque 4 · Escritura — nivel ${diag.writingLevel}`}>
        <div className="diag-tag">Expresión escrita</div>
        <p className="diag-writing-prompt">{prompt}</p>
        <textarea
          className="diag-writing-area"
          placeholder="Escribe tu respuesta en inglés..."
          value={diag.writingText}
          onChange={(e) => diag.setWritingText(e.target.value)}
        />
        <div className={`diag-word-count ${ok ? 'ok' : ''}`}>{words} palabras</div>
        <NextButton disabled={!preview && !ok} onClick={handleNext} label="Finalizar diagnóstico →" />
      </DiagShell>
    )
  }

  return null
}

function DiagShell({ stageLabel, banner, children, onExit }) {
  return (
    <div className="diag-shell">
      {banner}
      <div className="diag-topbar">
        <div className="diag-stage-label">{stageLabel}</div>
        {onExit && <button type="button" className="diag-exit" onClick={onExit}>Salir</button>}
      </div>
      <div className="diag-main">{children}</div>
    </div>
  )
}

function OptionsList({ options, selectedIdx, onSelect }) {
  return (
    <div className="diag-options" role="radiogroup" aria-label="Opciones de respuesta">
      {options.map((opt, i) => (
        <button
          key={i}
          className={`diag-opt ${selectedIdx === i ? 'selected' : ''}`}
          onClick={() => onSelect(i)}
          type="button"
          role="radio"
          aria-checked={selectedIdx === i}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function NextButton({ disabled, onClick, label = 'Siguiente →' }) {
  return (
    <button className="btn-primary diag-next-btn" disabled={disabled} onClick={onClick}>
      {label}
    </button>
  )
}

function AudioBox({ transcript, onPlay }) {
  return (
    <div className="diag-audio-box">
      <button className="diag-play-btn" onClick={() => onPlay(transcript)} type="button" aria-label="Reproducir audio">▶</button>
      <div className="diag-audio-meta">Pulsa play para escuchar el audio.</div>
    </div>
  )
}

function SkillBar({ label, pct }) {
  return (
    <div className="diag-skill-row">
      <span className="diag-skill-name">{label}</span>
      <div className="diag-skill-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
        <div className="diag-skill-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="diag-skill-pct">{pct.toFixed(0)}%</span>
    </div>
  )
}
