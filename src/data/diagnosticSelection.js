// Search every level once so exhausted adjacent pools cannot recurse forever.
export function selectGVQuestion(bank, levels, targetIndex, used, streak) {
  const direction = streak >= 0 ? 1 : -1
  const candidates = levels.map((_, i) => i).sort((a, b) =>
    Math.abs(a - targetIndex) - Math.abs(b - targetIndex) || direction * (b - a))
  for (const idx of candidates) {
    const level = levels[idx]
    const index = bank[level].findIndex((_, i) => !used[level].has(i))
    if (index !== -1) return { level, index }
  }
  throw new Error('El banco de preguntas está agotado.')
}
