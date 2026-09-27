import a from './guides/classics-a.json'
import b from './guides/classics-b.json'
import c from './guides/voa-lincoln.json'
import type { LessonGuide } from './types'
export let lessonGuides = [...a,...b,...c] as LessonGuide[]
export let guidesByLesson = Object.fromEntries(lessonGuides.map(guide=>[guide.lessonId,guide]))
export function replaceGuides(guides: LessonGuide[]) {
  lessonGuides = guides
  guidesByLesson = Object.fromEntries(guides.map(guide => [guide.lessonId, guide]))
}
export const contextualWordId = (lessonId:string,section:number|'title',index:number) => `${lessonId}:g:${section}:w:${index}`
