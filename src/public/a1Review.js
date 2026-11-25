import { practicedWordIndices } from './lessonProgress'
import { supabase } from '../lib/supabase'
import cycle from '../../content/cycles/A1.json'

// Indices refer to the checked-in catalog, never text supplied by an API caller.
export async function recordA1Word(unit, word, known) {
  if (!cycle.modules.find(item => item.order === unit)?.practice.vocab[word]) return { error: new Error('Palabra no disponible') }
  try { return await supabase.rpc('record_a1_vocab_practice', { p_unit: unit, p_word: word, p_known: known }) }
  catch (error) { return { error } }
}
export async function recordA1Review(id, known) {
  try { return await supabase.rpc('record_a1_vocab_review', { p_vocab_item_id: id, p_known: known }) }
  catch (error) { return { error } }
}

export async function recordA1Text(lesson, text, known) {
  const results = await Promise.all(practicedWordIndices(lesson, text).map(index => recordA1Word(lesson.number ?? 1, index, known)))
  return { error: results.find(result => result.error)?.error ?? null }
}
