import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { Lesson, LessonGuide } from '../src/data/types.ts'
import {
  QUEST_STORAGE_KEY, advanceQuest, buildQuestBank, courseLessons, courseQuestionIds, createQuestSession,
  freshQuest, isQuestCorrect, loadQuest, mergeQuestProgress, questChoices, questRecordKey,
  questSummary, questXP, saveQuest, setQuestDraft, startQuest, startQuestReview,
  submitQuestAnswer, utcQuestDay, validateQuest,
} from '../src/lib/quest.ts'
import type { QuestQuestion, QuestRun, QuestState, QuestStorage } from '../src/lib/quest.ts'

const json = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const lessons: Lesson[] = ['classics', 'voa-lincoln', 'modern'].flatMap(file => json(`../src/data/${file}.json`))
const guides: Record<string, LessonGuide> = Object.fromEntries(['classics-a', 'classics-b', 'voa-lincoln'].flatMap(file => json(`../src/data/guides/${file}.json`)).map((guide: LessonGuide) => [guide.lessonId, guide]))
const bank = buildQuestBank(lessons, guides)
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value))
const correctAnswer = (q: QuestQuestion) => q.kind === 'order' ? q.choices.map((_, i) => i) : [q.answer]
const wrongAnswer = (q: QuestQuestion) => q.kind === 'order' ? correctAnswer(q).reverse() : [(q.answer + 1) % q.choices.length]
function finish(state: QuestState, wrong: number[] = []) {
  while (state.active!.stage !== 'result') {
    const run = state.active!; const q = bank[run.questionIds[run.position]]
    if (run.stage === 'question') state = submitQuestAnswer(setQuestDraft(state, bank, wrong.includes(run.position) ? wrongAnswer(q) : correctAnswer(q)), bank)
    state = advanceQuest(state, bank)
  }
  return state
}
function memory(raw: string | null = null): QuestStorage & { raw: string | null; writes: number } {
  return { raw, writes: 0, getItem(key) { assert.equal(key, QUEST_STORAGE_KEY); return this.raw }, setItem(key, value) { assert.equal(key, QUEST_STORAGE_KEY); this.writes++; this.raw = value } }
}
const daily = (day = '2026-09-28', id = 'test-run') => ({ ...freshQuest(), active: startQuest(bank, 'daily', day, null, id) })

test('question bank includes only verified source material and short exact chunk excerpts', () => {
  assert.equal(courseLessons(bank).length, 8)
  assert.equal(Object.values(bank).filter(q => q.kind === 'word').length, 40)
  assert.equal(Object.values(bank).filter(q => q.kind === 'reading').length, 24)
  for (const q of Object.values(bank)) {
    const lesson = lessons.find(l => l.id === q.lessonId)!
    assert.equal(lesson.status, 'verified')
    if (q.kind === 'word') {
      const word = lesson.vocabulary[Number(q.id.split(':').at(-1))]
      assert.equal(q.english, word.term); assert.equal(q.evidence, word.example)
      assert.equal(q.choices.length, 4); assert.equal(new Set(q.choices).size, 4)
      assert.equal(q.choices[q.answer], word.meaning)
      assert.equal(q.cardId, `${lesson.id}:w:${lesson.vocabulary.indexOf(word)}`)
    } else if (q.kind === 'order') {
      assert.ok(q.choices.length >= 2 && q.choices.length <= 6)
      assert.ok(q.english.length <= 175)
      assert.equal(q.choices.join(' ').replace(/\s+/g, ' ').trim(), lesson.segments[q.segment!].en.replace(/\s+/g, ' ').trim())
      assert.equal(q.translation, lesson.segments[q.segment!].ko)
      assert.equal(q.explanation, guides[lesson.id].segments[q.segment!].overview)
      assert.equal(q.cardId, `${lesson.id}:s:${q.segment}`)
    } else {
      const quiz = lesson.quiz[Number(q.id.split(':').at(-1))]
      assert.equal(q.evidence, lesson.originalText)
      assert.deepEqual(q.choices, quiz.options); assert.equal(q.explanation, quiz.explanation)
      assert.equal(q.cardId, undefined)
    }
  }
})

test('daily route is deterministic across run IDs and bank insertion order, with three types twice', () => {
  const one = startQuest(bank, 'daily', '2026-09-28', null, 'one')
  const two = startQuest(bank, 'daily', '2026-09-28', null, 'two')
  assert.deepEqual(one.questionIds, two.questionIds)
  const reversedBank = Object.fromEntries(Object.entries(bank).reverse())
  assert.deepEqual(one.questionIds, startQuest(reversedBank, 'daily', '2026-09-28', null, 'three').questionIds)
  assert.deepEqual(one.questionIds.map(id => bank[id].kind), ['word', 'order', 'reading', 'word', 'order', 'reading'])
  assert.equal(new Set(one.questionIds).size, 6)
  assert.equal(new Set(one.questionIds.map(id => bank[id].lessonId)).size, 2)
  assert.deepEqual(questChoices(bank[one.questionIds[0]], one.seed), questChoices(bank[two.questionIds[0]], two.seed))
  const routeDays = new Set(Array.from({ length: 20 }, (_, i) => JSON.stringify(courseQuestionIds(bank, `2026-09-${String(i + 1).padStart(2, '0')}`, null))))
  assert.ok(routeDays.size > 10)
})

test('every verified lesson offers a complete six-question practice without repeated questions', () => {
  for (const lesson of courseLessons(bank)) {
    const run = startQuest(bank, 'practice', '2026-09-28', lesson.id, `practice-${lesson.id}`)
    assert.equal(run.questionIds.length, 6)
    assert.equal(new Set(run.questionIds).size, 6)
    assert.ok(run.questionIds.every(id => bank[id].lessonId === lesson.id))
    const complete = finish({ ...freshQuest(), active: run })
    assert.equal(questSummary(complete.active!, bank).correct, 6)
    assert.equal(questXP(complete), 0)
    assert.equal(complete.best[`practice:${lesson.id}`], 6)
    assert.deepEqual(validateQuest(clone(complete), bank), complete)
  }
})

test('chunk tiles support repeated text safely and accept interchangeable identical pieces', () => {
  const q: QuestQuestion = { ...Object.values(bank).find(q => q.kind === 'order')!, choices: ['very', 'very', 'good.'], english: 'very very good.' }
  assert.equal(isQuestCorrect(q, [0, 1, 2]), true)
  assert.equal(isQuestCorrect(q, [1, 0, 2]), true)
  assert.equal(isQuestCorrect(q, [0, 0, 2]), false)
  assert.equal(isQuestCorrect(q, [0, 2, 1]), false)
  assert.equal(isQuestCorrect(q, [0, 1]), false)
  assert.equal(isQuestCorrect(q, [-1, 1, 2]), false)
  for (const question of Object.values(bank).filter(q => q.kind === 'order')) {
    const options = questChoices(question, 'tile-test')
    assert.equal(new Set(options.map(option => option.index)).size, question.choices.length)
    assert.equal(isQuestCorrect(question, options.map(option => option.index)), false)
  }
})

test('intermediate answers, shuffled options and partial construction survive a reload', () => {
  let state = daily()
  state = setQuestDraft(state, bank, correctAnswer(bank[state.active!.questionIds[0]]))
  state = submitQuestAnswer(state, bank)
  const store = memory()
  assert.equal(saveQuest(store, state, bank), '')
  let loaded = loadQuest(store, bank)
  assert.equal(loaded.error, '')
  assert.deepEqual(loaded.state, state)
  state = advanceQuest(loaded.state, bank)
  state = setQuestDraft(state, bank, [1])
  assert.equal(saveQuest(store, state, bank), '')
  loaded = loadQuest(store, bank)
  assert.deepEqual(loaded.state.active!.draft, [1])
  assert.equal(loaded.state.active!.position, 1)
  assert.equal(loaded.state.active!.stage, 'question')
  assert.deepEqual(questChoices(bank[state.active!.questionIds[1]], state.active!.seed), questChoices(bank[loaded.state.active!.questionIds[1]], loaded.state.active!.seed))
  assert.equal(questXP(state), 0)
})

test('daily XP is awarded once, on completion, and remains bound to its UTC start date', () => {
  assert.equal(utcQuestDay(new Date('2026-09-28T08:59:59+09:00')), '2026-09-27')
  assert.equal(utcQuestDay(new Date('2026-09-28T09:00:00+09:00')), '2026-09-28')
  let state = finish(daily('2026-09-27'), [0, 3])
  assert.equal(questSummary(state.active!, bank).correct, 4)
  assert.equal(state.active!.reward, 70)
  assert.equal(state.dailyAwards['2026-09-27'].xp, 70)
  assert.equal(questXP(state), 70)
  assert.equal(advanceQuest(state, bank), state)
  const saved = memory(JSON.stringify(state))
  state = loadQuest(saved, bank).state
  state = { ...state, active: startQuest(bank, 'daily', '2026-09-27', null, 'second-run') }
  state = finish(state)
  assert.equal(state.active!.reward, 0); assert.equal(questXP(state), 70)
  assert.equal(state.best['daily:2026-09-27'], 6)
  state = finish({ ...state, active: startQuest(bank, 'daily', '2026-09-28', null, 'next-day') })
  assert.equal(questXP(state), 160)
  assert.equal(state.active!.reward, 90)
})

test('wrong answers still advance; review contains only mistakes and cannot award XP or inflate course best', () => {
  let state = finish(daily(), [0, 2, 4])
  const summary = questSummary(state.active!, bank)
  assert.equal(summary.correct, 3); assert.equal(summary.bestStreak, 1)
  const scoreKey = questRecordKey(state.active!)
  const review = startQuestReview(state.active!, bank, 'review-1')!
  assert.equal(review.mode, 'review'); assert.equal(review.questionIds.length, 3)
  assert.deepEqual(review.questionIds, [0, 2, 4].map(i => state.active!.questionIds[i]))
  state = finish({ ...state, active: review })
  assert.equal(state.best[scoreKey], 3); assert.equal(questXP(state), 60)
  assert.equal(state.active!.reward, 0); assert.equal(startQuestReview(state.active!, bank, 'review-2'), null)
  assert.deepEqual(validateQuest(clone(state), bank), state)
})

test('stale-tab progress merges daily awards as a set and keeps the stronger personal record', () => {
  const complete = finish(daily(), [0])
  const stale = mergeQuestProgress(daily('2026-09-28', 'stale'), complete)
  const result = finish(stale)
  assert.equal(questXP(result), 80)
  assert.equal(result.active!.reward, 0)
  assert.equal(result.best['daily:2026-09-28'], 6)
  const otherDay = finish(daily('2026-09-27'))
  assert.equal(questXP(mergeQuestProgress(result, otherDay)), 170)
})

test('malformed and prototype-like records are rejected without overwriting original storage', () => {
  const malformed: unknown[] = [null, [], {}, { ...freshQuest(), version: 2 }, { ...freshQuest(), dailyAwards: { '2026-02-29': { correct: 6, xp: 90 } } }, { ...freshQuest(), dailyAwards: { '2026-09-28': { correct: 4, xp: 9999 } } }, { ...freshQuest(), best: JSON.parse('{"__proto__":6}') }]
  const activeMutations: ((run: QuestRun) => void)[] = [
    run => { run.questionIds[0] = '__proto__' }, run => { run.questionIds[1] = run.questionIds[0] },
    run => { run.position = 3 }, run => { run.draft = [99] }, run => { run.answers = [[0]] },
    run => { run.stage = 'result' }, run => { run.reward = 90 }, run => { run.day = '2026-09-31' },
    run => { run.seed = 'daily:2026-09-27' }, run => { run.lessonId = 'cameroon' },
  ]
  for (const mutate of activeMutations) { const state = daily(); mutate(state.active!); malformed.push(state) }
  for (const value of malformed) {
    assert.throws(() => validateQuest(value, bank))
    const raw = JSON.stringify(value); const store = memory(raw)
    const loaded = loadQuest(store, bank)
    assert.ok(loaded.error); assert.equal(loaded.raw, raw); assert.equal(store.raw, raw); assert.equal(store.writes, 0)
    assert.ok(saveQuest(store, freshQuest(), bank)); assert.equal(store.raw, raw); assert.equal(store.writes, 0)
  }
  for (const raw of ['', '{broken', 'undefined']) { const store = memory(raw); assert.ok(loadQuest(store, bank).error); assert.equal(store.raw, raw) }
  assert.equal(({} as { xp?: number }).xp, undefined)
})

test('storage unavailability and quota failures preserve raw data and return actionable errors', () => {
  const denied = { getItem() { throw new Error('SecurityError') }, setItem() { throw new Error('SecurityError') } }
  assert.ok(loadQuest(denied, bank).error); assert.ok(saveQuest(denied, freshQuest(), bank))
  const raw = JSON.stringify(daily())
  const quota = { raw, getItem() { return this.raw }, setItem() { throw new Error('QuotaExceededError') } }
  assert.ok(saveQuest(quota, finish(daily()), bank)); assert.equal(quota.raw, raw)
})

test('temporary progress survives route remounts while broken raw storage remains untouched', () => {
  const store = memory('{broken-original')
  const session = createQuestSession(store, bank)
  const initial = session.load()
  let state = daily()
  state = submitQuestAnswer(setQuestDraft(state, bank, correctAnswer(bank[state.active!.questionIds[0]])), bank)
  session.remember(state, initial.error, initial.raw)
  const resumed = session.load()
  assert.equal(resumed.state.active!.stage, 'feedback')
  assert.equal(resumed.state.active!.answers.length, 1)
  assert.match(resumed.error, /새로고침.*탭을 닫으면/)
  assert.equal(store.raw, '{broken-original'); assert.equal(store.writes, 0)
  // An explicit storage repair wins over the temporary session.
  store.raw = JSON.stringify(freshQuest())
  assert.deepEqual(session.load().state, freshQuest())
})

test('quota-blocked progress survives routes and persists when storage becomes writable again', () => {
  const original = JSON.stringify(freshQuest())
  let writable = false
  const store = { raw: original, getItem() { return this.raw }, setItem(_key: string, value: string) { if (!writable) throw new Error('quota'); this.raw = value } }
  const session = createQuestSession(store, bank)
  const state = finish(daily())
  const issue = saveQuest(store, state, bank)
  session.remember(state, issue, original)
  assert.deepEqual(session.load().state, state)
  assert.equal(store.raw, original)
  writable = true
  const recovered = session.load()
  assert.equal(recovered.error, '')
  assert.equal(recovered.state.active!.stage, 'result')
  assert.equal(questXP(recovered.state), 90)
  assert.deepEqual(JSON.parse(store.raw), state)
  assert.deepEqual(session.load().state, state)
})

test('incomplete or out-of-range answer input never advances a run', () => {
  const initial = daily()
  assert.equal(submitQuestAnswer(initial, bank), initial)
  assert.equal(advanceQuest(initial, bank), initial)
  assert.equal(setQuestDraft(initial, bank, [-1]), initial)
  assert.equal(setQuestDraft(initial, bank, [0, 0]), initial)
  assert.equal(startQuestReview(initial.active!, bank, 'too-early'), null)
  assert.throws(() => startQuest(bank, 'practice', '2026-09-28', null, 'bad'))
  assert.throws(() => startQuest(bank, 'practice', '2026-09-28', 'cameroon', 'bad'))
})
