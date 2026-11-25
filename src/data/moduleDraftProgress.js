import { summarizeModuleLessons } from './moduleLessonProgress.js'

// Saved position is not proof of lesson completion; authoritative rows win.
export function restoreModuleDraft({ stage, lessonIdx, lessons, completedIds, moduleCompleted = false, quizResult }) {
  const progress = summarizeModuleLessons(lessons, completedIds)
  const pending = progress.nextIndex < 0 ? lessons.length - 1 : progress.nextIndex
  const index = Number.isInteger(lessonIdx) && lessonIdx >= 0 && lessonIdx < lessons.length ? lessonIdx : Math.max(0, pending)
  const allDone = progress.total > 0 && progress.completed === progress.total
  if (!moduleCompleted && !allDone && (stage === 'quiz' || stage === 'result')) return { stage: 'lessons', lessonIdx: Math.max(0, pending) }
  const safeStage = ['vocab', 'lessons', 'quiz', 'result'].includes(stage) ? stage : 'lessons'
  return { stage: safeStage === 'result' && !quizResult ? 'quiz' : safeStage, lessonIdx: moduleCompleted ? index : Math.min(index, Math.max(0, pending)) }
}