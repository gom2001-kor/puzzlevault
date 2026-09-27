import a from './guides/classics-a.json'
import b from './guides/classics-b.json'
import c from './guides/voa-lincoln.json'
import type { LessonGuide } from './types'
export const lessonGuides = [...a,...b,...c] as LessonGuide[]
export const guidesByLesson = Object.fromEntries(lessonGuides.map(guide=>[guide.lessonId,guide]))
export const contextualWordId = (lessonId:string,section:number|'title',index:number) => `${lessonId}:g:${section}:w:${index}`
