import type { Lesson, LessonGuide } from '../data/types.ts'

// Only these JSON files cross the application boundary. No source code is imported.
export const CONTENT_FILES = ['classics.json', 'voa-lincoln.json', 'modern.json', 'guides/classics-a.json', 'guides/classics-b.json', 'guides/voa-lincoln.json'] as const
export const CONTENT_SOURCE = 'https://study-english2.pages.dev/puzzlevault-content.json'
export const CONTENT_REPOSITORY = 'gom2001-kor/study-english2'
export const MAX_CONTENT_BYTES = 3 * 1024 * 1024
export type ContentFiles = Record<typeof CONTENT_FILES[number], unknown[]>
export type ContentManifest = {
  schemaVersion: 1; sourceRepository: string; sourceCommit: string; sourceCommittedAt: string;
  contentHash: string; fileHashes: Record<string, string>; verifiedLessons: number; segments: number
}
export type ContentFeed = { manifest: ContentManifest; files: ContentFiles }

function fail(message: string): never { throw new Error('English content: ' + message) }
function record(value: unknown, keys: string[], label: string): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(label + ' must be an object')
  const object = value as Record<string, any>
  if (Object.keys(object).sort().join('|') !== [...keys].sort().join('|')) fail(label + ' has unsupported fields')
  return object
}
function text(value: unknown, label: string, allowEmpty = false, max = 12000): asserts value is string {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim())) fail(label + ' must be bounded text')
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value as string)) fail(label + ' contains control characters')
}
function list(value: unknown, label: string, min = 0, max = 3000): any[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) fail(label + ' must be a bounded array')
  return value as any[]
}
function positiveInteger(value: unknown, label: string, min = 1, max = 10000) {
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) fail(label + ' is out of range')
}
function https(value: unknown, label: string) {
  text(value, label, false, 2000)
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password) fail(label + ' must be an HTTPS URL without credentials')
}
const normalize = (value: string) => value.replace(/\s+/g, ' ').trim()
const wordKey = (value: string) => value.toLowerCase().replace(/’/g, "'")
const wordPattern = /[A-Za-z]+(?:['’][A-Za-z]+)*(?:-[A-Za-z]+(?:['’][A-Za-z]+)*)*|\d+(?:[,.]\d+)*/g
function validateGuide(value: unknown, expected: string, label: string) {
  const guide = record(value, ['text', 'meaning', 'kind', 'overview', 'structure', 'chunks', 'grammar', 'words', 'tip', 'check'], label)
  for (const key of ['text', 'meaning', 'kind', 'overview', 'tip']) text(guide[key], label + '.' + key)
  if (guide.text !== expected || !['title', 'sentence', 'fragment', 'dialogue'].includes(guide.kind)) fail(label + ' does not match source text')
  for (const part of list(guide.structure, label + '.structure', 1, 200)) {
    const item = record(part, ['text', 'label', 'explanation'], label)
    for (const key of Object.keys(item)) text(item[key], label + '.' + key)
    if (!expected.includes(item.text)) fail(label + ' structure is not in the source')
  }
  for (const part of list(guide.chunks, label + '.chunks', 1, 200)) {
    const item = record(part, ['text', 'meaning', 'role', 'label'], label)
    for (const key of Object.keys(item)) text(item[key], label + '.' + key)
    if (!['subject', 'verb', 'object', 'complement', 'modifier', 'connector', 'other'].includes(item.role)) fail(label + ' invalid chunk role')
  }
  if (normalize(guide.chunks.map((item: any) => item.text).join(' ')) !== normalize(expected)) fail(label + ' chunks do not reconstruct the source')
  for (const part of list(guide.grammar, label + '.grammar', 1, 100)) {
    const item = record(part, ['title', 'explanation', 'example', 'translation'], label)
    for (const key of Object.keys(item)) text(item[key], label + '.' + key)
  }
  const tokens = new Set(Array.from(expected.matchAll(wordPattern), match => wordKey(match[0])))
  const glosses = new Set<string>()
  for (const part of list(guide.words, label + '.words', 1, 500)) {
    const item = record(part, ['text', 'lemma', 'pos', 'meaning', 'note'], label)
    for (const key of Object.keys(item)) text(item[key], label + '.' + key, key === 'note')
    const key = wordKey(item.text)
    if (!tokens.has(key) || glosses.has(key)) fail(label + ' invalid or duplicate glossary word')
    glosses.add(key)
  }
  if (tokens.size !== glosses.size) fail(label + ' has missing contextual word explanations')
  const check = record(guide.check, ['question', 'answer', 'hint'], label + '.check')
  for (const key of Object.keys(check)) text(check[key], label + '.' + key)
}

export function inspectContent(files: unknown): { lessons: Lesson[]; guides: LessonGuide[]; verifiedLessons: number; segments: number } {
  const input = record(files, [...CONTENT_FILES], 'files')
  for (const name of CONTENT_FILES) list(input[name], name, 0, 300)
  const lessons = CONTENT_FILES.slice(0, 3).flatMap(name => input[name]) as Lesson[]
  const guides = CONTENT_FILES.slice(3).flatMap(name => input[name]) as LessonGuide[]
  if (!lessons.length || lessons.length > 300) fail('invalid lesson count')
  const ids = new Set<string>(), orders = new Set<number>()
  for (const value of lessons) {
    const lesson = record(value, ['id', 'order', 'title', 'subtitle', 'category', 'level', 'minutes', 'author', 'sourceLabel', 'sourceUrl', 'licenseName', 'licenseUrl', 'status', 'verifiedAt', 'verificationNotes', 'rightsScope', 'changes', 'originalText', 'segments', 'vocabulary', 'quiz', 'writingPrompt'], 'lesson')
    for (const key of ['id', 'title', 'subtitle', 'category', 'level', 'author', 'sourceLabel', 'licenseName', 'status', 'verifiedAt', 'verificationNotes', 'rightsScope', 'changes']) text(lesson[key], key)
    if (!/^[a-z][a-z0-9-]{0,79}$/.test(lesson.id) || ['constructor', 'prototype', '__proto__'].includes(lesson.id) || ids.has(lesson.id)) fail('invalid or duplicate lesson identity')
    ids.add(lesson.id)
    positiveInteger(lesson.order, 'order')
    if (orders.has(lesson.order)) fail('duplicate lesson order')
    orders.add(lesson.order)
    https(lesson.sourceUrl, 'sourceUrl'); https(lesson.licenseUrl, 'licenseUrl')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(lesson.verifiedAt) || new Date(lesson.verifiedAt).toISOString().slice(0, 10) !== lesson.verifiedAt) fail('invalid verification date')
    if (!['verified', 'needs-review'].includes(lesson.status)) fail('unsupported verification status')
    text(lesson.originalText, 'originalText', true, 400000); text(lesson.writingPrompt, 'writingPrompt', true)
    list(lesson.segments, 'segments', 0, 500); list(lesson.vocabulary, 'vocabulary', 0, 500); list(lesson.quiz, 'quiz', 0, 100)
    if (lesson.status === 'needs-review') {
      if (lesson.originalText || lesson.writingPrompt || lesson.minutes !== 0 || lesson.segments.length || lesson.vocabulary.length || lesson.quiz.length) fail('unverified material is not quarantined')
      continue
    }
    // A verified marker is editorial evidence, never a substitute for the owner's rights review.
    if (/\bBY-NC\b|\bBY-ND\b|non-commercial|noncommercial|no derivatives/i.test(lesson.licenseName)) fail('license is incompatible with the commercial, adapted learning edition')
    positiveInteger(lesson.minutes, 'minutes', 1, 1000)
    if (lesson.originalText.length < 50 || !lesson.writingPrompt.trim() || lesson.segments.length < 6 || lesson.vocabulary.length < 5 || lesson.quiz.length < 3) fail('verified lesson lacks original practice')
    for (const value of lesson.segments) {
      const part = record(value, ['en', 'ko', 'note'], 'segment')
      for (const key of Object.keys(part)) text(part[key], 'segment.' + key)
      if (!lesson.originalText.includes(part.en)) fail('segment is not an exact source excerpt')
    }
    for (const value of lesson.vocabulary) {
      const part = record(value, ['term', 'meaning', 'example'], 'vocabulary')
      for (const key of Object.keys(part)) text(part[key], 'vocabulary.' + key)
    }
    for (const value of lesson.quiz) {
      const quiz = record(value, ['question', 'options', 'answer', 'explanation'], 'quiz')
      text(quiz.question, 'quiz.question'); text(quiz.explanation, 'quiz.explanation')
      const options = list(quiz.options, 'quiz.options', 2, 6)
      options.forEach(option => text(option, 'quiz option'))
      if (new Set(options).size !== options.length) fail('duplicate quiz options')
      positiveInteger(quiz.answer, 'quiz.answer', 0, options.length - 1)
    }
  }
  const verified = lessons.filter(lesson => lesson.status === 'verified')
  if (!verified.length || guides.length !== verified.length) fail('all verified lessons need original learning guides')
  const guideIds = new Set<string>()
  for (const value of guides) {
    const guide = record(value, ['lessonId', 'title', 'segments'], 'lesson guide')
    const lesson = verified.find(item => item.id === guide.lessonId)
    if (!lesson || guideIds.has(guide.lessonId)) fail('invalid or duplicate guide lesson')
    guideIds.add(guide.lessonId)
    validateGuide(guide.title, lesson.title, lesson.id + ':title')
    if (list(guide.segments, 'guide segments').length !== lesson.segments.length) fail('guide and lesson segment counts differ')
    guide.segments.forEach((part: unknown, index: number) => validateGuide(part, lesson.segments[index].en, lesson.id + ':' + index))
  }
  return { lessons, guides, verifiedLessons: verified.length, segments: verified.reduce((sum, lesson) => sum + lesson.segments.length, 0) }
}

export function assertStableIdentities(previous: ContentFiles, next: ContentFiles) {
  const oldContent = inspectContent(previous), newContent = inspectContent(next)
  for (const oldLesson of oldContent.lessons.filter(lesson => lesson.status === 'verified')) {
    const nextLesson = newContent.lessons.find(lesson => lesson.id === oldLesson.id && lesson.status === 'verified')
    if (!nextLesson || nextLesson.title !== oldLesson.title) fail(oldLesson.id + ': existing lesson identity changed; manual migration required')
    if (oldLesson.segments.some((part, index) => nextLesson.segments[index]?.en !== part.en) || oldLesson.vocabulary.some((word, index) => nextLesson.vocabulary[index]?.term !== word.term)) fail(oldLesson.id + ': existing card indices changed; manual migration required')
    if (oldLesson.quiz.some((quiz, index) => {
      const nextQuiz = nextLesson.quiz[index]
      return !nextQuiz || nextQuiz.question !== quiz.question || nextQuiz.answer !== quiz.answer || JSON.stringify(nextQuiz.options) !== JSON.stringify(quiz.options)
    })) fail(oldLesson.id + ': existing quiz identities changed; manual migration required')
    const oldGuide = oldContent.guides.find(guide => guide.lessonId === oldLesson.id)!
    const nextGuide = newContent.guides.find(guide => guide.lessonId === oldLesson.id)!
    const newTexts = [nextGuide.title, ...nextGuide.segments]
    for (const [index, oldText] of [oldGuide.title, ...oldGuide.segments].entries()) {
      if (JSON.stringify(oldText.chunks.map(chunk => chunk.text)) !== JSON.stringify(newTexts[index]?.chunks.map(chunk => chunk.text))) fail(oldLesson.id + ': existing chunk identities changed; manual migration required')
      if (oldText.words.some((word, wordIndex) => newTexts[index]?.words[wordIndex]?.text !== word.text)) fail(oldLesson.id + ': contextual card indices changed; manual migration required')
    }
  }
}

const sha256 = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('')
export async function createManifest(files: ContentFiles, sourceCommit: string, sourceCommittedAt: string): Promise<ContentManifest> {
  const stats = inspectContent(files)
  const fileHashes = Object.fromEntries(await Promise.all(CONTENT_FILES.map(async name => [name, await sha256(JSON.stringify(files[name]))])))
  return { schemaVersion: 1, sourceRepository: CONTENT_REPOSITORY, sourceCommit, sourceCommittedAt, contentHash: await sha256(JSON.stringify(fileHashes)), fileHashes, verifiedLessons: stats.verifiedLessons, segments: stats.segments }
}
export async function validateFeed(value: unknown, baseline?: ContentFiles): Promise<ContentFeed> {
  const feed = record(value, ['manifest', 'files'], 'feed')
  const metadata = record(feed.manifest, ['schemaVersion', 'sourceRepository', 'sourceCommit', 'sourceCommittedAt', 'contentHash', 'fileHashes', 'verifiedLessons', 'segments'], 'manifest')
  if (metadata.schemaVersion !== 1 || metadata.sourceRepository !== CONTENT_REPOSITORY || !/^[a-f0-9]{40}$/.test(metadata.sourceCommit)) fail('unsupported source identity')
  if (typeof metadata.sourceCommittedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(metadata.sourceCommittedAt) || !Number.isFinite(Date.parse(metadata.sourceCommittedAt))) fail('invalid source date')
  const expected = await createManifest(feed.files, metadata.sourceCommit, metadata.sourceCommittedAt)
  record(metadata.fileHashes, [...CONTENT_FILES], 'file hashes')
  if (metadata.contentHash !== expected.contentHash || metadata.verifiedLessons !== expected.verifiedLessons || metadata.segments !== expected.segments || CONTENT_FILES.some(name => metadata.fileHashes[name] !== expected.fileHashes[name])) fail('hash or content counts do not match')
  if (baseline) assertStableIdentities(baseline, feed.files)
  return feed as ContentFeed
}

export async function readBoundedFeed(response: Response): Promise<unknown> {
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) fail('feed is not an available JSON response')
  if (Number(response.headers.get('content-length')) > MAX_CONTENT_BYTES || !response.body) fail('feed is too large or empty')
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let length = 0
  try {
    while (true) {
      const result = await reader.read()
      if (result.done) break
      length += result.value.byteLength
      if (length > MAX_CONTENT_BYTES) { await reader.cancel(); fail('feed exceeds the size limit') }
      chunks.push(result.value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(length); let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
}
