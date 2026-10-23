import { useState, useCallback } from 'react'
import {
  LEVELS, bankGV, bankReading, bankListening, bankWriting,
  levelIdx, clampIdx, closestAvailableLevel,
} from '../data/diagnosticBank'
import { selectGVQuestion } from '../data/diagnosticSelection.js'

/**
 * Hook que encapsula toda la máquina de estados del diagnóstico adaptativo.
 * Misma lógica validada en el prototipo HTML:
 * - Gram/Vocab: empieza en A2, sube/baja según streaks de 2, selección SIN
 *   REEMPLAZO por nivel (nunca repite una pregunta ya vista en la sesión).
 * - Reading/Listening: nivel del contenido = nivel asentado en Gram/Vocab,
 *   acotado al banco disponible.
 * - Writing: heurística de longitud/complejidad/diversidad lexical.
 * - Puntaje final: Gram/Vocab 30% (tasa de acierto REAL, no posición en el
 *   track — bug corregido en la v1) + Reading 25% + Listening 25% + Writing 20%.
 */
export function useDiagnostic() {
  const [block, setBlock] = useState(1) // 1=GV, 2=Reading, 3=Listening, 4=Writing, 5=done
  const [result, setResult] = useState(null)

  // --- Bloque 1: Gramática/Vocabulario ---
  const [gvLevelIdx, setGvLevelIdx] = useState(1) // arranca en A2
  const [gvHistory, setGvHistory] = useState([])
  const [gvStreak, setGvStreak] = useState(0)
  const [gvUsedIndices, setGvUsedIndices] = useState(() => {
    const obj = {}
    LEVELS.forEach((l) => (obj[l] = new Set()))
    return obj
  })
  const [gvCurrentQ, setGvCurrentQ] = useState(null)
  const [gvCurrentLevel, setGvCurrentLevel] = useState(null)
  const [gvSettledLevel, setGvSettledLevel] = useState(null)

  // --- Bloque 2: Reading ---
  const [readingLevel, setReadingLevel] = useState(null)
  const [readingStep, setReadingStep] = useState(0)
  const [readingScore, setReadingScore] = useState(0)

  // --- Bloque 3: Listening ---
  const [listeningLevel, setListeningLevel] = useState(null)
  const [listeningStep, setListeningStep] = useState(0)
  const [listeningScore, setListeningScore] = useState(0)

  // --- Bloque 4: Writing ---
  const [writingLevel, setWritingLevel] = useState(null)
  const [writingText, setWritingText] = useState('')

  const pickNextGVQuestion = useCallback((targetLevelIdx, usedIndicesSnapshot, streakSnapshot) => {
    const { level, index } = selectGVQuestion(bankGV, LEVELS, targetLevelIdx, usedIndicesSnapshot, streakSnapshot)
    usedIndicesSnapshot[level].add(index)
    setGvCurrentQ(bankGV[level][index])
    setGvCurrentLevel(level)
    setGvLevelIdx(LEVELS.indexOf(level))
  }, [])

  const startDiagnostic = useCallback(() => {
    const usedIndices = {}
    LEVELS.forEach((l) => (usedIndices[l] = new Set()))
    setGvUsedIndices(usedIndices)
    setGvHistory([])
    setGvStreak(0)
    pickNextGVQuestion(1, usedIndices, 0)
  }, [pickNextGVQuestion])

  function checkStabilized(history) {
    const last4 = history.slice(-4)
    if (last4.length < 4) return false
    const levels = last4.map((h) => levelIdx(h.level))
    const range = Math.max(...levels) - Math.min(...levels)
    return range <= 0 && history.length >= 10
  }

  const finishGVBlock = useCallback((history) => {
    const counts = {}
    LEVELS.forEach((l) => (counts[l] = { correct: 0, total: 0 }))
    history.forEach((h) => {
      counts[h.level].total++
      if (h.correct) counts[h.level].correct++
    })

    let bestLevel = 'A1'
    for (const l of LEVELS) {
      if (counts[l].total > 0) {
        const rate = counts[l].correct / counts[l].total
        if (rate >= 0.6) bestLevel = l
      }
    }
    setGvSettledLevel(bestLevel)

    const target = closestAvailableLevel(bestLevel, Object.keys(bankReading))
    setReadingLevel(target)
    setReadingStep(0)
    setReadingScore(0)
    setBlock(2)
  }, [])

  const submitGVAnswer = useCallback((selectedIdx) => {
    const correct = selectedIdx === gvCurrentQ.correct
    const newHistory = [...gvHistory, { level: gvCurrentLevel, correct }]
    setGvHistory(newHistory)

    let newStreak
    if (correct) {
      newStreak = gvStreak >= 0 ? gvStreak + 1 : 1
    } else {
      newStreak = gvStreak <= 0 ? gvStreak - 1 : -1
    }

    let newLevelIdx = gvLevelIdx
    if (newStreak >= 2 && gvLevelIdx < LEVELS.length - 1) {
      newLevelIdx = clampIdx(gvLevelIdx + 1)
      newStreak = 0
    } else if (newStreak <= -2 && gvLevelIdx > 0) {
      newLevelIdx = clampIdx(gvLevelIdx - 1)
      newStreak = 0
    }
    setGvStreak(newStreak)

    const totalAsked = newHistory.length
    const stabilized = totalAsked >= 8 && checkStabilized(newHistory)

    if (totalAsked >= 15 || stabilized) {
      finishGVBlock(newHistory)
    } else {
      pickNextGVQuestion(newLevelIdx, gvUsedIndices, newStreak)
    }
  }, [gvCurrentQ, gvCurrentLevel, finishGVBlock, gvHistory, gvStreak, gvLevelIdx, gvUsedIndices, pickNextGVQuestion])

  const advanceReading = useCallback((selectedIdx) => {
    if (readingStep === 0) {
      setReadingStep(1)
      return
    }
    const data = bankReading[readingLevel]
    const q = data.questions[readingStep - 1]
    const newScore = selectedIdx === q.correct ? readingScore + 1 : readingScore
    setReadingScore(newScore)

    const nextStep = readingStep + 1
    if (nextStep > data.questions.length) {
      const target = closestAvailableLevel(gvSettledLevel, Object.keys(bankListening))
      setListeningLevel(target)
      setListeningStep(0)
      setListeningScore(0)
      setBlock(3)
    } else {
      setReadingStep(nextStep)
    }
  }, [readingStep, readingLevel, readingScore, gvSettledLevel])

  const advanceListening = useCallback((selectedIdx) => {
    if (listeningStep === 0) {
      setListeningStep(1)
      return
    }
    const data = bankListening[listeningLevel]
    const q = data.questions[listeningStep - 1]
    const newScore = selectedIdx === q.correct ? listeningScore + 1 : listeningScore
    setListeningScore(newScore)

    const nextStep = listeningStep + 1
    if (nextStep > data.questions.length) {
      const target = closestAvailableLevel(gvSettledLevel, Object.keys(bankWriting))
      setWritingLevel(target)
      setBlock(4)
    } else {
      setListeningStep(nextStep)
    }
  }, [listeningStep, listeningLevel, listeningScore, gvSettledLevel])

  function evaluateWriting(text) {
    const trimmed = text.trim()
    const words = trimmed.split(/\s+/).filter((w) => w.length > 0)
    const wordCount = words.length
    const sentences = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0)
    const avgSentenceLen = wordCount / Math.max(1, sentences.length)
    const uniqueWords = new Set(words.map((w) => w.toLowerCase().replace(/[^a-z']/g, ''))).size
    const lexicalDiversity = uniqueWords / Math.max(1, wordCount)

    let score = 0
    if (wordCount >= 40) score += 25
    if (wordCount >= 60) score += 10
    if (avgSentenceLen >= 8) score += 25
    if (avgSentenceLen >= 12) score += 10
    if (lexicalDiversity >= 0.5) score += 30
    return Math.min(100, score)
  }

  const finishDiagnostic = useCallback(() => {
    const gvCounts = { correct: 0, total: 0 }
    gvHistory.forEach((h) => {
      gvCounts.total++
      if (h.correct) gvCounts.correct++
    })
    const gvPct = gvCounts.total > 0 ? (gvCounts.correct / gvCounts.total) * 100 : 0

    const readingTotal = bankReading[readingLevel]?.questions.length || 0
    const readingPct = readingTotal > 0 ? (readingScore / readingTotal) * 100 : 0

    const listeningTotal = bankListening[listeningLevel]?.questions.length || 0
    const listeningPct = listeningTotal > 0 ? (listeningScore / listeningTotal) * 100 : 0

    const writingPct = evaluateWriting(writingText)

    const finalScore = gvPct * 0.3 + readingPct * 0.25 + listeningPct * 0.25 + writingPct * 0.2

    let finalLevelIdx = levelIdx(gvSettledLevel)
    if (finalScore < 40 && finalLevelIdx > 0) finalLevelIdx -= 1
    if (finalScore > 85 && finalLevelIdx < LEVELS.length - 1) finalLevelIdx += 1
    finalLevelIdx = clampIdx(finalLevelIdx)
    const finalLevel = LEVELS[finalLevelIdx]

    const finalResult = { finalLevel, finalScore, gvPct, readingPct, listeningPct, writingPct }
    setResult(finalResult)
    setBlock(5)
    return finalResult
  }, [gvHistory, gvSettledLevel, readingLevel, readingScore, listeningLevel, listeningScore, writingText])

  return {
    block,
    result,
    startDiagnostic,
    // Bloque 1
    gvCurrentQ,
    gvCurrentLevel,
    gvQuestionNumber: gvHistory.length + 1,
    submitGVAnswer,
    // Bloque 2
    readingLevel,
    readingStep,
    advanceReading,
    // Bloque 3
    listeningLevel,
    listeningStep,
    advanceListening,
    // Bloque 4
    writingLevel,
    writingText,
    setWritingText,
    finishDiagnostic,
  }
}
