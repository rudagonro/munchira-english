export function parseGrammarPractice(source, path) {
  const exercise = JSON.parse(source)
  if (!exercise || typeof exercise.prompt !== 'string' || !exercise.prompt.trim() || typeof exercise.explanation !== 'string' || !exercise.explanation.trim() || !Array.isArray(exercise.options) || exercise.options.length < 2 || exercise.options.some(option => typeof option !== 'string' || !option.trim()) || new Set(exercise.options).size !== exercise.options.length || !exercise.options.includes(exercise.answer)) throw new Error(`${path}: ejercicio de gramática no válido`)
  return exercise
}

export function collectGrammarPractice(files, includeExamples = false) {
  return Object.fromEntries(Object.entries(files).filter(([path]) => includeExamples || !path.endsWith('.example.practice.json')).map(([path, source]) => [path.split('/').pop().replace(/(?:\.example)?\.practice\.json$/, ''), parseGrammarPractice(source, path)]))
}
