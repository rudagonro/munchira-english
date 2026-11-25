import { lessonTextBlocks, lessonTextSections } from './lessonText.js'
import './lesson-text.css'

function TextBlocks({ text }) {
  return lessonTextBlocks(text).map((block, index) => block.type === 'example'
    ? <blockquote className="lesson-copy-example" key={index}>{block.text}</blockquote>
    : block.type === 'separator'
      ? <span className="lesson-copy-separator" key={index}>{block.text}</span>
      : <p key={index}>{block.text}</p>)
}

export default function LessonText({ text }) {
  const sections = lessonTextSections(text)
  if (!sections.length) return null
  return (
    <div className="lesson-copy">
      {sections.map((section, index) => (
        <section className={`lesson-copy-section lesson-copy-${section.type}`} key={index}>
          {section.label && <h3 className="lesson-copy-heading">{section.label}</h3>}
          <div className="lesson-copy-body"><TextBlocks text={section.text} /></div>
        </section>
      ))}
    </div>
  )
}
