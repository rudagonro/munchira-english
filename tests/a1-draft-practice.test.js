import test from 'node:test'
import assert from 'node:assert/strict'
import { LESSON_STEPS } from '../src/public/model-lesson.js'
import { canOpenStep } from '../src/public/lessonProgress.js'
import { restoreLessonProgress } from '../src/public/lessonDraftProgress.js'
import { restoreModuleDraft } from '../src/data/moduleDraftProgress.js'

test('restoring step 8 and completed guided work keeps translation mandatory', () => {
  const completed = new Set(LESSON_STEPS.slice(0, 7).map(step => step.id))
  const restored = restoreLessonProgress(7, LESSON_STEPS, completed)
  assert.equal(restored.step, 7)
  assert.equal(canOpenStep(8, LESSON_STEPS, restored.completed), false)
  assert.equal(canOpenStep(14, LESSON_STEPS, restored.completed), false)
})

test('an old position-only draft cannot claim unperformed practice', () => {
  const restored = restoreLessonProgress(14, LESSON_STEPS, new Set())
  assert.equal(restored.step, 6)
  assert.equal(restored.completed.has('guided'), false)
  assert.equal(restored.completed.has('translate'), false)
  assert.equal(restored.completed.size, 6) // only theory before the unfinished practice
})

test('old drafts recover completed exercises but a revealed translation still requires correction', () => {
  const fields = { 'guided.done': true, 'translate.idx': 0, 'translate.result': 'bad', 'translate.value': 'wrong' }
  const restored = restoreLessonProgress(14, LESSON_STEPS, new Set(), fields, { translations: [{ en: 'Hello' }] })
  assert.equal(restored.step, 7)
  assert.equal(restored.completed.has('guided'), true)
  assert.equal(restored.completed.has('translate'), false)
})

test('finishing every translation restores access to cards without redoing translations', () => {
  const completed = new Set(LESSON_STEPS.slice(0, 7).map(step => step.id))
  const restored = restoreLessonProgress(8, LESSON_STEPS, completed, { 'translate.idx': 2 }, { translations: [{ en: 'Hi' }, { en: 'Hello' }] })
  assert.equal(restored.step, 8)
  assert.equal(restored.completed.has('translate'), true)
  assert.equal(restored.completed.has('cards'), false)
})

test('a module quiz draft does not replace missing authoritative lesson completion', () => {
  const lessons = Array.from({ length: 7 }, (_, index) => ({ id: `lesson-${index}` }))
  assert.deepEqual(restoreModuleDraft({ stage: 'quiz', lessonIdx: 6, lessons, completedIds: ['lesson-0'] }), { stage: 'lessons', lessonIdx: 1 })
})

test('one of seven saved module lessons resumes lesson 2 while earlier review remains possible', () => {
  const lessons = Array.from({ length: 7 }, (_, index) => ({ id: `lesson-${index}` }))
  assert.deepEqual(restoreModuleDraft({ stage: 'lessons', lessonIdx: 1, lessons, completedIds: ['lesson-0'] }), { stage: 'lessons', lessonIdx: 1 })
  assert.deepEqual(restoreModuleDraft({ stage: 'lessons', lessonIdx: 0, lessons, completedIds: ['lesson-0'] }), { stage: 'lessons', lessonIdx: 0 })
})

test('seven saved lessons restore the pending quiz without claiming module approval', () => {
  const lessons = Array.from({ length: 7 }, (_, index) => ({ id: `lesson-${index}` }))
  assert.deepEqual(restoreModuleDraft({ stage: 'quiz', lessonIdx: 6, lessons, completedIds: lessons.map(lesson => lesson.id) }), { stage: 'quiz', lessonIdx: 6 })
})