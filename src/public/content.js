import { collectArticles } from './content-model'
import { collectGrammarPractice } from './grammar-practice'

// Negative glob excludes examples before Vite creates production imports.
const files = import.meta.glob(['/content/blog/*.md', '!/content/blog/*.example.md'], { eager: true, query: '?raw', import: 'default' })
const examples = import.meta.env.DEV ? import.meta.glob('/content/blog/*.example.md', { eager: true, query: '?raw', import: 'default' }) : {}
export const blogArticles = collectArticles({ ...files, ...examples }, import.meta.env.DEV)

const grammarFiles = import.meta.glob(['/content/grammar/*.md', '!/content/grammar/*.example.md'], { eager: true, query: '?raw', import: 'default' })
const grammarExamples = import.meta.env.DEV ? import.meta.glob('/content/grammar/*.example.md', { eager: true, query: '?raw', import: 'default' }) : {}
export const grammarArticles = collectArticles({ ...grammarFiles, ...grammarExamples }, import.meta.env.DEV)
const practiceFiles = import.meta.glob(['/content/grammar/*.practice.json', '!/content/grammar/*.example.practice.json'], { eager: true, query: '?raw', import: 'default' })
const practiceExamples = import.meta.env.DEV ? import.meta.glob('/content/grammar/*.example.practice.json', { eager: true, query: '?raw', import: 'default' }) : {}
export const grammarPractice = collectGrammarPractice({ ...practiceFiles, ...practiceExamples }, import.meta.env.DEV)
