import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeModuleLessons, attachLessonProgress, resumeModuleStage } from '../src/data/moduleLessonProgress.js'
const lessons = Array.from({ length: 7 }, (_, index) => ({ id: `lesson-${index + 1}`, module_id: 'grammar' }))
test('one saved lesson of seven counts as partial progress and resumes at lesson two', () => {
  assert.deepEqual(summarizeModuleLessons(lessons, ['lesson-1']), { completed: 1, total: 7, nextIndex: 1, pct: 14 })
  assert.deepEqual(resumeModuleStage(lessons, ['lesson-1'], false), { stage: 'lessons', lessonIdx: 1 })
})
test('seven saved lessons with pending quiz resume at quiz, not lesson one', () => {
  assert.deepEqual(resumeModuleStage(lessons, lessons.map(lesson => lesson.id), false), { stage: 'quiz', lessonIdx: 0 })
})
test('completed module stays available for review without rewriting historical results', () => {
  assert.equal(resumeModuleStage(lessons, lessons.map(lesson => lesson.id), true).stage, 'lessons')
})
test('deduplicates saved rows and never counts lessons from another module', () => {
  const modules = attachLessonProgress([{ id: 'grammar', status: 'locked' }, { id: 'other' }], lessons, ['lesson-1', 'lesson-1', 'foreign'])
  assert.equal(modules[0].lessonProgress.completed, 1)
  assert.equal(modules[0].status, 'locked')
  assert.equal(modules[1].lessonProgress.completed, 0)
  assert.equal(modules[1].lessonProgress.total, 0)
})
