import test from 'node:test'
import assert from 'node:assert/strict'
import { lessonTextSections, lessonTextBlocks } from '../src/components/lessonText.js'

test('parses sequential authored sections without treating quoted labels as headings', () => {
  const result = lessonTextSections('Introducción. Paso 1: Lee "Paso 2: no es un paso". Paso 2: Escribe. Nota: Revisa.')
  assert.deepEqual(result.map(item => item.type), ['prose', 'step', 'step', 'note'])
  assert.equal(result[1].text, 'Lee "Paso 2: no es un paso".')
  assert.equal(result[2].label, 'Paso 2')
})
test('recognizes curly quotation and avoids splitting its sentences', () => {
  assert.deepEqual(lessonTextBlocks('“Hi. My name is Ana.”'), [{ text: '“Hi. My name is Ana.”', type: 'example' }])
})
test('keeps every separator, contraction and example in original order', () => {
  const text = '"He is a teacher." — "We are from Colombia." — "My sister is very happy."'
  const blocks = lessonTextBlocks(text)
  assert.equal(blocks.filter(block => block.type === 'example').length, 3)
  assert.equal(blocks.map(block => block.text).join(' '), text)
  assert.equal(lessonTextBlocks("I'm here. You're welcome.").map(block => block.text).join(' '), "I'm here. You're welcome.")
})
test('honors newlines and sentence boundaries but keeps abbreviations intact', () => {
  assert.deepEqual(lessonTextBlocks('Mr. Brown arrived. Ana left.\nOtro párrafo.').map(block => block.text), ['Mr. Brown arrived.', 'Ana left.', 'Otro párrafo.'])
})
test('does not interpret markup as trusted HTML or remove authored text', () => {
  const value = '<script>alert(1)</script> & <strong>Example</strong>'
  assert.equal(lessonTextSections(value)[0].text, value)
  assert.equal(lessonTextBlocks(value)[0].text, value)
})
test('handles empty, missing and non-string inputs safely', () => {
  for (const value of [null, undefined, '', '   ', {}, 123]) assert.deepEqual(lessonTextSections(value), [])
})
