import classics from './classics.json'
import voaLincoln from './voa-lincoln.json'
import modern from './modern.json'
import type { Lesson } from './types'
import { guidesByLesson, contextualWordId } from './guides'
export let library = ([...classics, ...voaLincoln, ...modern] as Lesson[]).sort((a,b) => a.order-b.order)
export let available = library.filter(lesson => lesson.status === 'verified')
export const sentenceId = (lesson: Lesson, index: number) => `${lesson.id}:s:${index}`
export const wordId = (lesson: Lesson, index: number) => `${lesson.id}:w:${index}`
const buildCards = () => available.flatMap(lesson => [
  ...lesson.segments.map((s, i) => ({ id: sentenceId(lesson, i), lesson, en: s.en, ko: s.ko, note: s.note, kind: 'sentence' as const, link: `lesson/${lesson.id}/${i}` })),
  ...guideCards(lesson),
  ...lesson.vocabulary.map((w, i) => ({ id: wordId(lesson, i), lesson, en: w.term, ko: w.meaning, note: w.example, kind: 'word' as const, link: `lesson/${lesson.id}` }))
])
export let cards = buildCards()
export function replaceLibrary(lessons: Lesson[]) {
  library = [...lessons].sort((a, b) => a.order - b.order)
  available = library.filter(lesson => lesson.status === 'verified')
  cards = buildCards()
}

function guideCards(lesson: Lesson) {
  const guide=guidesByLesson[lesson.id]
  if(!guide)return []
  return [
    { id: lesson.id+':title',lesson,en:guide.title.text,ko:guide.title.meaning,note:guide.title.overview,kind:'sentence' as const,link:'lesson/'+lesson.id+'/title' },
    ...[{section:'title' as const,text:guide.title},...guide.segments.map((text,section)=>({section,text}))].flatMap(({section,text})=>text.words.map((word,index)=>({id:contextualWordId(lesson.id,section,index),lesson,en:word.text,ko:word.meaning,note:word.pos+' · 기본형 '+word.lemma+(word.note?' · '+word.note:''),kind:'word' as const,link:'lesson/'+lesson.id+'/'+section})))
  ]
}
