import { expandContractions, displayForm } from './model-lesson.js'
// Visiting a screen is not completion. Only finished activities unlock practice steps.
export const PRACTICE_STEPS = new Set(['guided', 'translate', 'cards', 'reading', 'dictation', 'free', 'summary'])
export const isPracticeStep = id => PRACTICE_STEPS.has(id)
export function canOpenStep(index, steps, completed) {
  return Number.isInteger(index) && index >= 0 && index < steps.length && steps.slice(0, index).every(step => completed.has(step.id))
}

// Match taught phrases as complete words, never a substring (he is not she).
export function practicedWordIndices(lesson, text) {
  const sentence = ` ${expandContractions(displayForm(text))} `
  return lesson.vocab.flatMap((word, index) => sentence.includes(` ${expandContractions(word.en)} `) ? [index] : [])
}
