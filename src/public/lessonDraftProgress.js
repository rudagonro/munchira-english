import { canOpenStep, isPracticeStep } from './lessonProgress.js'

// Older drafts stored position but no completion list: recover performed work,
// never turn a remembered screen number into completed practice.
export function restoreLessonProgress(savedStep, steps, completed, fields = {}, lesson = {}) {
  const requested = Number.isInteger(savedStep) && savedStep >= 0 && savedStep < steps.length ? savedStep : 0
  const validIds = new Set(steps.map(step => step.id))
  const restored = new Set([...completed].filter(id => validIds.has(id)))
  if (fields['guided.done'] === true) restored.add('guided')
  if (fields['reading.done'] === true) restored.add('reading')
  for (const [id, count] of [['cards', (lesson.vocab?.length ?? 0) * 2], ['translate', lesson.translations?.length ?? 0], ['dictation', lesson.dictation?.length ?? 0]]) {
    if (count > 0 && Number.isInteger(fields[`${id}.idx`]) && fields[`${id}.idx`] >= count) restored.add(id)
  }
  if (lesson.number <= 1 && fields['free.review']?.ok === true) restored.add('free')
  for (const prior of steps.slice(0, requested)) {
    if (isPracticeStep(prior.id) && !restored.has(prior.id)) break
    if (!isPracticeStep(prior.id)) restored.add(prior.id)
  }
  let step = requested
  while (step > 0 && !canOpenStep(step, steps, restored)) step--
  return { step, completed: restored }
}