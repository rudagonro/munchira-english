/** Acento US/UK elegido para un diálogo. Si el bloque se remonta, no vuelve a Americano. */
const accents = new Map()

export function readDialogueAccent(id) {
  return accents.get(id) ?? 'en-US'
}

export function writeDialogueAccent(id, accent) {
  accents.set(id, accent)
  return accent
}

export function resetDialogueAccents() {
  accents.clear()
}
