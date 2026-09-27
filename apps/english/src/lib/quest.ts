import type { Lesson, LessonGuide } from '../data/types.ts'

export const QUEST_STORAGE_KEY = 'pv_english_quest_v1'
export type QuestKind = 'word' | 'order' | 'reading'
export type QuestQuestion = {
  id: string; kind: QuestKind; lessonId: string; lessonTitle: string; segment?: number;
  prompt: string; english: string; translation: string; explanation: string;
  choices: string[]; answer: number; evidence: string; cardId?: string; fragment?: boolean;
}
export type QuestBank = Record<string, QuestQuestion>
export type QuestRun = {
  id: string; seed: string; mode: 'daily' | 'practice' | 'review'; day: string; lessonId: string | null;
  questionIds: string[]; position: number; answers: number[][]; draft: number[];
  stage: 'question' | 'feedback' | 'result'; reward: number; bankFingerprint?: string;
}
export type QuestState = {
  version: 1; dailyAwards: Record<string, { correct: number; xp: number }>;
  best: Record<string, number>; active: QuestRun | null;
}
export type QuestStorage = Pick<Storage, 'getItem' | 'setItem'>
export type QuestLoad = { state: QuestState; error: string; raw: string | null; notice?: string }
export const freshQuest = (): QuestState => ({ version: 1, dailyAwards: {}, best: {}, active: null })
export const utcQuestDay = (date = new Date()): string => date.toISOString().slice(0, 10)
const compact = (text: string) => text.normalize('NFKC').replace(/\s+/g, ' ').trim()
const hash = (text: string) => { let n = 2166136261; for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0 }
export function questShuffle<T>(items: readonly T[], seed: string): T[] {
  const result = [...items]; let n = hash(seed)
  for (let i = result.length - 1; i > 0; i--) {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0
    const j = n % (i + 1); [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** Only verified, already-authored translations and explanations enter the game. */
export function buildQuestBank(lessons: readonly Lesson[], guides: Record<string, LessonGuide>): QuestBank {
  const bank: QuestBank = {}
  const verified = lessons.filter(lesson => lesson.status === 'verified')
  const meanings = [...new Set(verified.flatMap(lesson => lesson.vocabulary.map(word => word.meaning)))]
  for (const lesson of verified) {
    lesson.vocabulary.forEach((word, i) => {
      const distractors = questShuffle(meanings.filter(meaning => compact(meaning) !== compact(word.meaning)), `${lesson.id}:word:${i}`).slice(0, 3)
      if (distractors.length < 3) return
      const id = `${lesson.id}:word:${i}`
      bank[id] = { id, kind: 'word', lessonId: lesson.id, lessonTitle: lesson.title, prompt: '이 문맥에서 단어의 뜻을 골라 보세요.', english: word.term, translation: word.meaning, explanation: `${word.term} — ${word.meaning}`, choices: [word.meaning, ...distractors], answer: 0, evidence: word.example, cardId: `${lesson.id}:w:${i}` }
    })
    guides[lesson.id]?.segments.forEach((guide, i) => {
      const segment = lesson.segments[i]
      const choices = guide.chunks.map(chunk => chunk.text)
      // A short, exact excerpt avoids unmanageable tiles and altered source text.
      if (!segment || choices.length < 2 || choices.length > 6 || new Set(choices).size < 2 || segment.en.length > 175 || compact(choices.join(' ')) !== compact(segment.en)) return
      const id = `${lesson.id}:order:${i}`
      bank[id] = { id, kind: 'order', lessonId: lesson.id, lessonTitle: lesson.title, segment: i, prompt: '뜻을 읽고, 조각을 눌러 원문의 순서로 연결하세요.', english: segment.en, translation: segment.ko, explanation: guide.overview, choices, answer: -1, evidence: guide.chunks.map(chunk => `${chunk.text} → ${chunk.meaning}`).join('\n'), cardId: `${lesson.id}:s:${i}`, fragment: guide.kind === 'fragment' }
    })
    lesson.quiz.forEach((quiz, i) => {
      const id = `${lesson.id}:reading:${i}`
      bank[id] = { id, kind: 'reading', lessonId: lesson.id, lessonTitle: lesson.title, prompt: quiz.question, english: lesson.originalText, translation: '', explanation: quiz.explanation, choices: [...quiz.options], answer: quiz.answer, evidence: lesson.originalText }
    })
  }
  return bank
}

/** A local edition marker, not an authentication signature. Include answer text as
 * well as IDs: a new lesson can also change existing word distractor choices. */
export function questBankFingerprint(bank: QuestBank): string {
  const source = JSON.stringify(Object.keys(bank).sort().map(id => {
    const q = bank[id]
    return [q.id, q.kind, q.lessonId, q.lessonTitle, q.segment ?? null, q.prompt, q.english,
      q.translation, q.explanation, q.choices, q.answer, q.evidence, q.cardId ?? null, !!q.fragment]
  }))
  return 'b1:' + hash(source).toString(16).padStart(8, '0') + hash('edition:' + source).toString(16).padStart(8, '0')
}

export function courseLessons(bank: QuestBank): { id: string; title: string }[] {
  const lessons = new Map<string, { id: string; title: string }>()
  Object.values(bank).forEach(q => lessons.set(q.lessonId, { id: q.lessonId, title: q.lessonTitle }))
  return [...lessons.values()].filter(lesson => (['word', 'order', 'reading'] as const).every(kind => Object.values(bank).filter(q => q.lessonId === lesson.id && q.kind === kind).length >= 2)).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}
export function courseQuestionIds(bank: QuestBank, day: string, lessonId: string | null, seed = ''): string[] {
  if (!validDay(day)) throw new Error('탐험 날짜를 확인해 주세요.')
  const eligible = courseLessons(bank)
  if (lessonId && !eligible.some(lesson => lesson.id === lessonId)) throw new Error('이 수업의 탐험 코스를 찾을 수 없어요.')
  const key = lessonId ? `practice:${lessonId}:${seed}` : `daily:${day}`
  const picked = lessonId ? [lessonId, lessonId] : questShuffle(eligible, key).slice(0, 2).map(lesson => lesson.id)
  if (picked.length !== 2) throw new Error('탐험을 만들 수 있는 수업이 부족해요.')
  const used = new Set<string>(); const result: string[] = []
  picked.forEach((lesson, round) => {
    for (const kind of ['word', 'order', 'reading'] as const) {
      const candidates = Object.values(bank).filter(q => q.lessonId === lesson && q.kind === kind && !used.has(q.id)).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
      const chosen = questShuffle(candidates, `${key}:${round}:${kind}`)[0]
      if (!chosen) throw new Error('탐험 문제를 찾을 수 없어요.')
      result.push(chosen.id); used.add(chosen.id)
    }
  })
  return result
}
export function startQuest(bank: QuestBank, mode: 'daily' | 'practice', day: string, lessonId: string | null, id: string): QuestRun {
  if (mode === 'practice' && !lessonId) throw new Error('연습할 수업을 선택해 주세요.')
  const lesson = mode === 'daily' ? null : lessonId
  return { id, seed: mode === 'daily' ? `daily:${day}` : id, mode, day, lessonId: lesson, questionIds: courseQuestionIds(bank, day, lesson, id), position: 0, answers: [], draft: [], stage: 'question', reward: 0, bankFingerprint: questBankFingerprint(bank) }
}
export function startQuestReview(run: QuestRun, bank: QuestBank, id: string): QuestRun | null {
  if (run.stage !== 'result') return null
  const questionIds = run.questionIds.filter((q, i) => !isQuestCorrect(bank[q], run.answers[i]))
  if (!questionIds.length) return null
  return { ...run, id, seed: id, mode: 'review', questionIds, position: 0, answers: [], draft: [], stage: 'question', reward: 0 }
}
export function questChoices(question: QuestQuestion, seed: string): { index: number; text: string }[] {
  const shuffled = questShuffle(question.choices.map((text, index) => ({ index, text })), `${seed}:${question.id}`)
  // A shuffled construction puzzle should not arrive already solved.
  if (question.kind === 'order' && shuffled.every((piece, i) => piece.text === question.choices[i])) shuffled.push(shuffled.shift()!)
  return shuffled
}
export function validQuestAnswer(question: QuestQuestion, answer: unknown, complete = true): answer is number[] {
  return Array.isArray(answer) && answer.every(index => Number.isInteger(index) && index >= 0 && index < question.choices.length) && new Set(answer).size === answer.length && (question.kind === 'order' ? (complete ? answer.length === question.choices.length : answer.length <= question.choices.length) : (complete ? answer.length === 1 : answer.length <= 1))
}
export function isQuestCorrect(question: QuestQuestion, answer: unknown): boolean {
  if (!validQuestAnswer(question, answer)) return false
  // Compare text rather than token IDs so identical pieces are interchangeable.
  return question.kind === 'order' ? compact(answer.map(index => question.choices[index]).join(' ')) === compact(question.choices.join(' ')) : answer[0] === question.answer
}
export function questSummary(run: QuestRun, bank: QuestBank) {
  let currentStreak = 0; let bestStreak = 0; let correct = 0
  run.answers.forEach((answer, i) => {
    if (isQuestCorrect(bank[run.questionIds[i]], answer)) { correct++; currentStreak++; bestStreak = Math.max(bestStreak, currentStreak) }
    else currentStreak = 0
  })
  return { correct, currentStreak, bestStreak, total: run.questionIds.length }
}
export const questXP = (state: QuestState) => Object.values(state.dailyAwards).reduce((total, award) => total + award.xp, 0)
export const questRecordKey = (run: QuestRun) => run.mode === 'daily' ? `daily:${run.day}` : `practice:${run.lessonId ?? 'mixed'}`
export function setQuestDraft(state: QuestState, bank: QuestBank, draft: number[]): QuestState {
  const run = state.active
  if (!run || run.stage !== 'question' || !validQuestAnswer(bank[run.questionIds[run.position]], draft, false)) return state
  return { ...state, active: { ...run, draft: [...draft] } }
}
export function submitQuestAnswer(state: QuestState, bank: QuestBank): QuestState {
  const run = state.active
  if (!run || run.stage !== 'question' || !validQuestAnswer(bank[run.questionIds[run.position]], run.draft)) return state
  return { ...state, active: { ...run, stage: 'feedback', answers: [...run.answers, [...run.draft]] } }
}
export function advanceQuest(state: QuestState, bank: QuestBank): QuestState {
  const run = state.active
  if (!run || run.stage !== 'feedback') return state
  if (run.position < run.questionIds.length - 1) return { ...state, active: { ...run, position: run.position + 1, stage: 'question', draft: [] } }
  const { correct } = questSummary(run, bank)
  const reward = run.mode === 'daily' && !state.dailyAwards[run.day] ? 30 + correct * 10 : 0
  return {
    ...state,
    dailyAwards: reward ? { ...state.dailyAwards, [run.day]: { correct, xp: reward } } : state.dailyAwards,
    best: run.mode === 'review' ? state.best : { ...state.best, [questRecordKey(run)]: Math.max(state.best[questRecordKey(run)] ?? 0, correct) },
    active: { ...run, stage: 'result', reward },
  }
}
export function mergeQuestProgress(current: QuestState, saved: QuestState): QuestState {
  const best = { ...current.best }
  Object.entries(saved.best).forEach(([key, value]) => { best[key] = Math.max(best[key] ?? 0, value) })
  // One date is one award, including when another tab already finished that day.
  return { ...current, best, dailyAwards: { ...current.dailyAwards, ...saved.dailyAwards } }
}
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const integer = (value: unknown, min: number, max: number): value is number => Number.isSafeInteger(value) && (value as number) >= min && (value as number) <= max
function validDay(value: unknown): value is string { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value }
function check(value: unknown): asserts value { if (!value) throw new Error('탐험 기록의 형식이 올바르지 않아요.') }
export function validateQuest(value: unknown, bank: QuestBank, migrateContent = false): QuestState {
  const lessonIds = new Set(Object.values(bank).map(question => question.lessonId))
  check(record(value) && value.version === 1 && record(value.dailyAwards) && record(value.best))
  check(Object.keys(value.dailyAwards).length <= 10000 && Object.keys(value.best).length <= 20000)
  for (const [day, award] of Object.entries(value.dailyAwards)) check(validDay(day) && record(award) && integer(award.correct, 0, 6) && award.xp === 30 + (award.correct as number) * 10)
  for (const [key, score] of Object.entries(value.best)) check(integer(score, 0, 6) && (key.startsWith('daily:') ? validDay(key.slice(6)) : key.startsWith('practice:') && /^[a-z][a-z0-9-]{0,79}$/.test(key.slice(9))))
  if (value.active !== null) {
    const run = value.active
    check(record(run) && typeof run.id === 'string' && /^[a-zA-Z0-9:_-]{1,150}$/.test(run.id) && typeof run.seed === 'string' && /^[a-zA-Z0-9:_-]{1,150}$/.test(run.seed))
    check(['daily', 'practice', 'review'].includes(run.mode as string) && validDay(run.day) && ['question', 'feedback', 'result'].includes(run.stage as string))
    check(run.lessonId === null || typeof run.lessonId === 'string' && /^[a-z][a-z0-9-]{0,79}$/.test(run.lessonId))
    check(Array.isArray(run.questionIds) && run.questionIds.length > 0 && run.questionIds.length <= 6 && new Set(run.questionIds).size === run.questionIds.length && run.questionIds.every(id => typeof id === 'string' && /^[a-z][a-z0-9-]{0,79}:(word|order|reading):\d{1,3}$/.test(id)))
    const ids = run.questionIds as string[]
    // Validate the saved record itself before treating an edition change as a migration.
    // Damaged JSON, impossible rewards or answer indices must retain the old error path.
    check(run.bankFingerprint === undefined || typeof run.bankFingerprint === 'string' && /^b1:[a-f0-9]{16}$/.test(run.bankFingerprint))
    check(integer(run.position, 0, ids.length - 1) && Array.isArray(run.answers))
    const expected = run.stage === 'question' ? run.position : run.position + 1
    const boundedAnswer = (answer: unknown) => Array.isArray(answer) && answer.length <= 6 && answer.every(index => integer(index, 0, 5)) && new Set(answer).size === answer.length
    check(run.answers.length === expected && run.answers.every(answer => boundedAnswer(answer) && (answer as unknown[]).length > 0))
    check(boundedAnswer(run.draft))
    if (run.stage !== 'question') check(JSON.stringify(run.draft) === JSON.stringify(run.answers[run.position]))
    check(run.stage !== 'result' || run.position === ids.length - 1)
    check(integer(run.reward, 0, 90) && (run.stage === 'result' && run.mode === 'daily' ? run.reward === 0 || (record(value.dailyAwards[run.day as string]) && run.reward === (value.dailyAwards[run.day as string] as Record<string, unknown>).xp) : run.reward === 0))
    if (run.mode !== 'review') check(ids.length === 6 && (run.mode === 'daily' ? run.lessonId === null && run.seed === `daily:${run.day}` : run.lessonId !== null && run.seed === run.id))
    const editionChanged = run.bankFingerprint !== questBankFingerprint(bank)
    if (migrateContent && editionChanged) {
      // Legacy v1 runs have no edition marker, so their old option indices cannot be
      // interpreted safely. Close only that run, keeping earned XP and personal bests.
      return { ...value, active: null } as QuestState
    }
    check(run.bankFingerprint === undefined || !editionChanged)
    check(run.lessonId === null || lessonIds.has(run.lessonId))
    check(ids.every(id => Object.hasOwn(bank, id)))
    if (run.mode !== 'review') {
      check(ids.length === 6 && (run.mode === 'daily' ? run.lessonId === null && run.seed === `daily:${run.day}` : run.lessonId !== null && run.seed === run.id))
      check(JSON.stringify(ids) === JSON.stringify(courseQuestionIds(bank, run.day as string, run.lessonId as string | null, run.id as string)))
    }
    check(run.answers.every((answer, i) => validQuestAnswer(bank[ids[i]], answer)))
    check(validQuestAnswer(bank[ids[run.position]], run.draft, run.stage !== 'question'))
  }
  return value as QuestState
}
export function loadQuest(storage: QuestStorage, bank: QuestBank): QuestLoad {
  let raw: string | null = null
  try {
    raw = storage.getItem(QUEST_STORAGE_KEY)
    if (raw === null) return { state: freshQuest(), error: '', raw }
    const parsed = JSON.parse(raw)
    const state = validateQuest(parsed, bank, true)
    const notice = parsed.active !== null && state.active === null
      ? '학습 자료 버전이 달라 이전 코스를 닫았어요. 획득한 XP와 최고 기록은 그대로입니다. 새 코스로 이어가세요.' : ''
    return { state, error: '', raw, notice }
  }
  catch { return { state: freshQuest(), error: '탐험 기록을 읽을 수 없어 자동 저장을 멈췄어요. 기존 기록은 보존됩니다. 지금 탐험은 이 창에서 임시로 유지되며, 페이지를 새로고침하거나 탭을 닫으면 사라집니다.', raw } }
}
export function saveQuest(storage: QuestStorage, state: QuestState, bank: QuestBank): string {
  try {
    const existing = storage.getItem(QUEST_STORAGE_KEY)
    if (existing !== null) validateQuest(JSON.parse(existing), bank, true)
    validateQuest(state, bank); storage.setItem(QUEST_STORAGE_KEY, JSON.stringify(state)); return ''
  }
  catch { return '탐험 기록을 저장하지 못했어요. 기존 저장 기록은 보존됩니다. 새 진도와 XP는 이 창에서 임시로 유지되며, 페이지를 새로고침하거나 탭을 닫으면 사라집니다.' }
}

/** Keep unsaved play alive when React routes unmount the quest. A changed stored
 * value takes precedence, so an explicit restore/clear in another tab is honored. */
export function createQuestSession(storage: QuestStorage, bank: QuestBank) {
  let fallback: QuestLoad | null = null
  return {
    load(): QuestLoad {
      const current = loadQuest(storage, bank)
      if (fallback && (current.raw === fallback.raw || current.error && current.raw === null)) {
        if (current.error) { fallback = { ...fallback, error: current.error }; return fallback }
        const next = mergeQuestProgress(fallback.state, current.state)
        const error = saveQuest(storage, next, bank)
        if (error) { fallback = { state: next, error, raw: current.raw }; return fallback }
        fallback = null
        return { state: next, error: '', raw: JSON.stringify(next) }
      }
      fallback = current.error ? current : null
      return current
    },
    remember(state: QuestState, error: string, raw: string | null) {
      fallback = error ? { state, error, raw } : null
    },
  }
}
