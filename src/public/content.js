import { collectArticles } from './content-model'

// Negative glob excludes examples before Vite creates production imports.
const files = import.meta.glob(['/content/blog/*.md', '!/content/blog/*.example.md'], { eager: true, query: '?raw', import: 'default' })
const examples = import.meta.env.DEV ? import.meta.glob('/content/blog/*.example.md', { eager: true, query: '?raw', import: 'default' }) : {}
export const blogArticles = collectArticles({ ...files, ...examples }, import.meta.env.DEV)
