export function summarizeModuleLessons(lessons, completedIds) {
  const done = new Set(completedIds)
  const completed = lessons.filter(lesson => done.has(lesson.id)).length
  const nextIndex = lessons.findIndex(lesson => !done.has(lesson.id))
  return { completed, total: lessons.length, nextIndex, pct: lessons.length ? Math.round(completed * 100 / lessons.length) : 0 }
}

export function attachLessonProgress(modules, lessons, completedIds) {
  return modules.map(module => ({ ...module, lessonProgress: summarizeModuleLessons(lessons.filter(lesson => lesson.module_id === module.id), completedIds) }))
}

export function resumeModuleStage(lessons, completedIds, moduleCompleted) {
  const progress = summarizeModuleLessons(lessons, completedIds)
  return { stage: progress.total > 0 && progress.nextIndex === -1 && !moduleCompleted ? 'quiz' : 'lessons', lessonIdx: Math.max(0, progress.nextIndex) }
}
