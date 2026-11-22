// A public, standalone example: never writes student progress or course grades.
export const publicPractice = {
  prompt: 'Hello! My name ___ Ana.',
  options: ['am', 'is', 'are'],
  answer: 'is',
  explanation: '«My name» equivale a «it»: usamos «is». Para hablar de ti con «I», usamos «am»: I am Ana.',
}
export function checkPublicPractice(answer) {
  return publicPractice.options.includes(answer) && answer === publicPractice.answer
}
