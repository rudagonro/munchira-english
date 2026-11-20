import { useEffect, useMemo, useRef, useState } from 'react'
import { getLessonAudioTurns } from '../data/lessonAudio'
import { voiceInfo } from '../data/voices'
import { accessToken, fetchAudioUrl } from '../lib/ttsClient'
import { canSpeak, cancelSpeech, speakTurns } from '../lib/browserSpeech'

/**
 * Reproductor didáctico de un diálogo: quién habla, frase resaltada, repetir una frase,
 * velocidad lenta y transcripción opcional.
 * Usa el archivo fijo de cada frase (audioUrl) si existe: es instantáneo y no gasta nada.
 * Si no existe lo pide a la función y, si eso falla, lee con la voz del dispositivo.
 */
export default function DialoguePlayer({ lesson }) {
  const turns = useMemo(() => getLessonAudioTurns(lesson), [lesson])
  const [playing, setPlaying] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [slow, setSlow] = useState(false)
  const [showText, setShowText] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const run = useRef(0)
  const audioRef = useRef(null)
  const stopSpeech = useRef(null)
  const jobs = useRef(new Map())
  const blobUrls = useRef([])
  const slowRef = useRef(false)

  function stop() {
    run.current++
    audioRef.current?.pause()
    audioRef.current = null
    stopSpeech.current?.()
    stopSpeech.current = null
    cancelSpeech()
    setPlaying(-1)
    setLoading(false)
  }

  useEffect(() => () => {
    run.current++
    audioRef.current?.pause()
    stopSpeech.current?.()
    cancelSpeech()
    blobUrls.current.forEach((url) => URL.revokeObjectURL(url))
    blobUrls.current = []
  }, [])

  // Frases sin archivo fijo: se piden por adelantado en 2 carriles (ElevenLabs limita las simultáneas).
  function ensureJobs(token, from, to) {
    const lanes = [Promise.resolve(), Promise.resolve()]
    for (let i = from; i < to; i++) {
      const turn = turns[i]
      if (turn.audioUrl || jobs.current.has(i)) continue
      const lane = i % 2
      const job = lanes[lane].then(() => fetchAudioUrl(turn.text, turn.voice, token)).then((url) => {
        blobUrls.current.push(url)
        return url
      })
      lanes[lane] = job.catch(() => {})
      job.catch(() => jobs.current.delete(i))
      jobs.current.set(i, job)
    }
  }

  function playUrl(url) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url)
      audio.playbackRate = slowRef.current ? 0.75 : 1
      audioRef.current = audio
      audio.onended = resolve
      audio.onerror = () => reject(new Error('audio error'))
      audio.play().catch(reject)
    })
  }

  function speakFallback(from, to, my) {
    if (my !== run.current) return
    if (!canSpeak()) { setError('No se pudo reproducir el audio. Intenta de nuevo.'); setPlaying(-1); return }
    setNotice('Reproduciendo con la voz de tu dispositivo.')
    stopSpeech.current = speakTurns(turns.slice(from, to), {
      rate: slowRef.current ? 0.7 : 0.95,
      onTurn: (k) => setPlaying(from + k),
      onEnd: () => setPlaying(-1),
      onError: () => { setNotice(''); setError('No se pudo reproducir el audio.'); setPlaying(-1) },
    })
  }

  async function playFrom(start, single = false) {
    stop()
    const my = ++run.current
    const end = single ? start + 1 : turns.length
    setError('')
    setNotice('')
    let i = start
    try {
      if (turns.slice(start, end).some((t) => !t.audioUrl)) {
        setLoading(true)
        const token = await accessToken()
        if (!token) throw new Error('No hay sesión activa')
        ensureJobs(token, start, end)
      }
      for (; i < end; i++) {
        if (my !== run.current) return
        setPlaying(i)
        const url = turns[i].audioUrl ?? await jobs.current.get(i)
        if (my !== run.current) return
        setLoading(false)
        await playUrl(url)
      }
      if (my === run.current) setPlaying(-1)
    } catch (err) {
      if (my !== run.current) return
      console.error(err)
      setLoading(false)
      speakFallback(i, end, my)
    }
  }

  function toggleSlow() {
    const next = !slow
    setSlow(next)
    slowRef.current = next
    if (audioRef.current) audioRef.current.playbackRate = next ? 0.75 : 1
  }

  if (!turns.length) return null
  const busy = loading || playing >= 0

  return (
    <div className="lesson-card audio-card dlg">
      <div className="lesson-card-label">
        <span className="lesson-card-icon" aria-hidden="true">🎧</span>
        Escucha el diálogo
      </div>

      <div className="dlg-controls">
        <button
          className="dlg-play"
          type="button"
          onClick={() => (busy ? stop() : playFrom(0))}
          aria-label={busy ? 'Detener el audio' : 'Escuchar todo el diálogo'}
        >
          {loading ? '⌛' : busy ? '⏹' : '▶'}
        </button>
        <div className="dlg-meta" role="status">
          {loading ? 'Preparando el audio…' : playing >= 0 ? `Frase ${playing + 1} de ${turns.length}` : `${turns.length} frases · pulsa ▶ para escuchar todo`}
        </div>
        <button className="dlg-speed" type="button" aria-pressed={slow} onClick={toggleSlow}>
          {slow ? '🐢 Lento' : 'Velocidad normal'}
        </button>
      </div>

      <ul className="dlg-lines">
        {turns.map((turn, i) => {
          const v = voiceInfo(turn.voice)
          return (
            <li key={i} className={`dlg-line ${playing === i ? 'now' : ''}`} style={{ '--vc': v.color }}>
              <span className="dlg-avatar" aria-hidden="true">{v.emoji}</span>
              <div className="dlg-body">
                <span className="dlg-speaker">{turn.speaker || v.label}</span>
                <span className={`dlg-text ${showText ? '' : 'hidden'}`}>{showText ? turn.text : '• • • • • •'}</span>
              </div>
              <button className="dlg-line-btn" type="button" onClick={() => playFrom(i, true)} aria-label={`Repetir la frase ${i + 1}`}>
                🔁
              </button>
            </li>
          )
        })}
      </ul>

      <label className="dlg-toggle">
        <input type="checkbox" checked={showText} onChange={(e) => setShowText(e.target.checked)} />
        Ver la transcripción (intenta primero sin ella)
      </label>

      {notice && !error && <p className="lesson-audio-note" role="status">{notice}</p>}
      {error && <p className="lesson-audio-error" role="alert">{error}</p>}
    </div>
  )
}
