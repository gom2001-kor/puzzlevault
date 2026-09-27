import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import {
  STORAGE_KEY, freshState, validateState, loadState, dayKey, addDays,
  completeSentence, schedule, streak, normalizeAnswer,
} from '../src/lib/store.ts'
import type { Lesson } from '../src/data/types.ts'

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value))
const localNoon = (year: number, month: number, date: number) => new Date(year, month - 1, date, 12)
const textKey = (value: string) => value.normalize('NFKC').replace(/\s+/g, ' ').trim()

test('fresh states have independent mutable collections and validate after a JSON round trip', () => {
  const one = freshState()
  const two = freshState()
  one.completed.push('lesson:s:0')
  one.settings.rate = 1.1
  assert.deepEqual(two.completed, [])
  assert.equal(two.settings.rate, .9)
  assert.deepEqual(validateState(copy(two)), two)
})

test('valid backups preserve learning work, review dates, settings, and quiz scores', () => {
  const state = freshState()
  state.completed = ['voa-welcome:s:0']
  state.saved = ['voa-welcome:w:0']
  state.reviews['voa-welcome:s:0'] = { due: '2028-02-29', interval: 90, count: 7 }
  state.activity['2028-02-29'] = 3
  state.writings['voa-welcome'] = 'I’m glad to meet you. <This remains plain text.>'
  state.quizScores['voa-welcome'] = 100
  state.lastLesson = 'voa-welcome'
  state.settings = { rate: .5, voiceURI: 'local-english', accent: 'en-GB', dailyGoal: 10, showTranslation: true }
  assert.deepEqual(validateState(copy(state)), state)
})

test('backup validation rejects malformed shapes, unsafe IDs, duplicates, and invalid settings', async t => {
  const mutations: [string, (state: any) => void][] = [
    ['unsupported version', s => { s.version = 1 }],
    ['missing completed list', s => { delete s.completed }],
    ['non-list saved cards', s => { s.saved = {} }],
    ['duplicate cards', s => { s.completed = ['lesson:s:0', 'lesson:s:0'] }],
    ['prototype card ID', s => { s.saved = ['__proto__'] }],
    ['constructor card ID', s => { s.completed = ['constructor'] }],
    ['HTML card ID', s => { s.saved = ['<script>'] }],
    ['oversized ID', s => { s.completed = ['x'.repeat(151)] }],
    ['missing settings', s => { delete s.settings }],
    ['too-fast speech', s => { s.settings.rate = 2 }],
    ['NaN speech rate', s => { s.settings.rate = NaN }],
    ['infinite speech rate', s => { s.settings.rate = Infinity }],
    ['unsupported accent', s => { s.settings.accent = 'ko-KR' }],
    ['unsupported goal', s => { s.settings.dailyGoal = 999 }],
    ['non-boolean translation flag', s => { s.settings.showTranslation = 'true' }],
    ['oversized voice ID', s => { s.settings.voiceURI = 'x'.repeat(1001) }],
    ['non-record reviews', s => { s.reviews = [] }],
    ['non-record activity', s => { s.activity = null }],
    ['non-text writing', s => { s.writings.lesson = 123 }],
    ['oversized writing', s => { s.writings.lesson = 'x'.repeat(10001) }],
    ['negative quiz score', s => { s.quizScores.lesson = -1 }],
    ['out-of-range quiz score', s => { s.quizScores.lesson = 101 }],
    ['fractional quiz score', s => { s.quizScores.lesson = 2.5 }],
    ['unsafe last lesson', s => { s.lastLesson = 'prototype' }],
  ]
  for (const [label, mutate] of mutations) {
    await t.test(label, () => {
      const state = freshState()
      mutate(state)
      assert.throws(() => validateState(state))
    })
  }
  for (const malformed of [null, [], 'backup', 2, {}]) {
    assert.throws(() => validateState(malformed))
  }
})

test('malicious restore record keys cannot become prototype properties', async t => {
  for (const key of ['__proto__', 'constructor', 'prototype']) {
    for (const collection of ['reviews', 'writings', 'quizScores']) {
      await t.test(collection + ': ' + key, () => {
        const state = freshState()
        const entry = collection === 'reviews'
          ? { due: '2026-09-27', interval: 1, count: 0 }
          : collection === 'writings' ? 'injected' : 1
        const poisoned = JSON.parse('{"' + key + '":' + JSON.stringify(entry) + '}')
        ;(state as any)[collection] = poisoned
        assert.throws(() => validateState(state))
        assert.equal(({} as any).due, undefined)
        assert.equal(({} as any).injected, undefined)
      })
    }
  }
})

test('restore rejects impossible calendar days and invalid review counters', async t => {
  const invalidDates = ['2026-02-29', '2028-02-30', '2026-04-31', '2026-13-01', '2026-00-10', '2026-09-00', '2026-9-7', 'not-a-date', '2026-09-27T00:00:00Z']
  for (const date of invalidDates) {
    await t.test(date, () => {
      const reviewState = freshState()
      reviewState.reviews.card = { due: date, interval: 1, count: 0 }
      assert.throws(() => validateState(reviewState))
      const activityState = freshState()
      activityState.activity[date] = 1
      assert.throws(() => validateState(activityState))
    })
  }
  for (const values of [{ interval: -1, count: 0 }, { interval: 91, count: 0 }, { interval: .5, count: 0 }, { interval: 1, count: -1 }, { interval: 1, count: .5 }, { interval: 1, count: Number.MAX_SAFE_INTEGER + 1 }]) {
    const state = freshState()
    state.reviews.card = { due: '2026-09-27', ...values }
    assert.throws(() => validateState(state))
  }
  for (const count of [-1, .5, Number.MAX_SAFE_INTEGER + 1]) {
    const state = freshState()
    state.activity['2026-09-27'] = count
    assert.throws(() => validateState(state))
  }
})

test('loading corrupt or invalid saved data preserves storage and reports recovery mode', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  let raw: string | null = null
  let writes = 0
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => { assert.equal(key, STORAGE_KEY); return raw },
    setItem: () => { writes++ },
    removeItem: () => { writes++ },
  } })
  try {
    assert.deepEqual(loadState(), { state: freshState(), error: '' })
    for (const bad of ['{broken', 'null', JSON.stringify({ version: 2 }), JSON.stringify({ ...freshState(), reviews: { card: { due: '2026-02-30', interval: 1, count: 0 } } })]) {
      raw = bad
      const result = loadState()
      assert.deepEqual(result.state, freshState())
      assert.ok(result.error.length > 0)
      assert.equal(raw, bad)
      assert.equal(writes, 0)
    }
    const saved = freshState()
    saved.writings.lesson = 'My own writing.'
    raw = JSON.stringify(saved)
    assert.deepEqual(loadState(), { state: saved, error: '' })
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})

test('sentence completion is immutable and idempotent; existing reviews are preserved', () => {
  const initial = freshState()
  const now = localNoon(2026, 9, 27)
  const first = completeSentence(initial, 'lesson:s:0', now)
  assert.deepEqual(initial.completed, [])
  assert.deepEqual(initial.reviews, {})
  assert.deepEqual(first.completed, ['lesson:s:0'])
  assert.equal(first.activity['2026-09-27'], 1)
  assert.deepEqual(first.reviews['lesson:s:0'], { due: '2026-09-28', interval: 1, count: 0 })
  const duplicate = completeSentence(first, 'lesson:s:0', localNoon(2026, 9, 28))
  assert.equal(duplicate, first)
  assert.equal(duplicate.activity['2026-09-28'], undefined)
  const next = completeSentence(first, 'lesson:s:1', now)
  assert.equal(next.activity['2026-09-27'], 2)

  const withReview = freshState()
  withReview.reviews['lesson:s:0'] = { due: '2026-10-01', interval: 4, count: 2 }
  const completed = completeSentence(withReview, 'lesson:s:0', now)
  assert.deepEqual(completed.reviews['lesson:s:0'], withReview.reviews['lesson:s:0'])
})

test('review ratings update due dates and cap spacing while counting each review', () => {
  const now = localNoon(2026, 9, 27)
  assert.deepEqual(schedule(undefined, 'again', now), { due: '2026-09-27', interval: 0, count: 1 })
  assert.deepEqual(schedule(undefined, 'good', now), { due: '2026-09-29', interval: 2, count: 1 })
  assert.deepEqual(schedule(undefined, 'easy', now), { due: '2026-09-30', interval: 3, count: 1 })
  const old = { due: '2026-09-27', interval: 40, count: 6 }
  assert.deepEqual(schedule(old, 'good', now), { due: '2026-11-26', interval: 60, count: 7 })
  assert.deepEqual(schedule(old, 'easy', now), { due: '2026-12-26', interval: 90, count: 7 })
  assert.deepEqual(schedule(old, 'again', now), { due: '2026-09-27', interval: 0, count: 7 })
  assert.deepEqual(old, { due: '2026-09-27', interval: 40, count: 6 })
})

test('calendar helpers use local days across month, year, and leap-year boundaries', () => {
  assert.equal(dayKey(new Date(2026, 8, 27, 0, 1)), '2026-09-27')
  assert.equal(addDays(1, localNoon(2026, 12, 31)), '2027-01-01')
  assert.equal(addDays(1, localNoon(2028, 2, 28)), '2028-02-29')
  assert.equal(addDays(1, localNoon(2028, 2, 29)), '2028-03-01')
  assert.equal(addDays(1, localNoon(2027, 2, 28)), '2027-03-01')
})

test('local day and review dates remain correct across daylight-saving changes', () => {
  const storeUrl = new URL('../src/lib/store.ts', import.meta.url).href
  const program = `
    import assert from 'node:assert/strict';
    import { dayKey, addDays, schedule, completeSentence, freshState } from ${JSON.stringify(storeUrl)};
    assert.equal(dayKey(new Date('2026-09-27T02:00:00Z')), '2026-09-26');
    const spring = new Date(2026, 2, 7, 12);
    const springTomorrow = new Date(spring); springTomorrow.setDate(springTomorrow.getDate() + 1);
    assert.equal((springTomorrow.getTime() - spring.getTime()) / 3600000, 23);
    assert.equal(addDays(1, spring), '2026-03-08');
    assert.equal(completeSentence(freshState(), 'card:s:0', spring).reviews['card:s:0'].due, '2026-03-08');
    assert.equal(schedule(undefined, 'good', spring).due, '2026-03-09');
    const fall = new Date(2026, 9, 31, 12);
    const fallTomorrow = new Date(fall); fallTomorrow.setDate(fallTomorrow.getDate() + 1);
    assert.equal((fallTomorrow.getTime() - fall.getTime()) / 3600000, 25);
    assert.equal(addDays(1, fall), '2026-11-01');
  `
  const child = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', program], { env: { ...process.env, TZ: 'America/New_York' }, encoding: 'utf8' })
  assert.equal(child.status, 0, child.stderr || child.stdout)
})

test('streak includes yesterday when today has not been studied and stops at a gap', () => {
  const now = localNoon(2026, 9, 27)
  assert.equal(streak({}, now), 0)
  assert.equal(streak({ '2026-09-26': 1, '2026-09-25': 2 }, now), 2)
  assert.equal(streak({ '2026-09-27': 1, '2026-09-26': 1, '2026-09-24': 3 }, now), 2)
  assert.equal(streak({ '2026-09-27': 0, '2026-09-25': 1 }, now), 0)
})

test('dictation normalization tolerates presentation differences without removing meaning', () => {
  assert.equal(normalizeAnswer('  NICE  to meet you! '), normalizeAnswer('Nice to meet you.'))
  assert.equal(normalizeAnswer('Ｈｅｌｌｏ， world！'), normalizeAnswer('hello, world'))
  assert.equal(normalizeAnswer('I’m Anna.'), normalizeAnswer("I'm Anna"))
  assert.equal(normalizeAnswer('“Go—again!”'), normalizeAnswer('go again'))
  assert.notEqual(normalizeAnswer("I'm good."), normalizeAnswer('I am good.'))
  assert.notEqual(normalizeAnswer('This is a gym.'), normalizeAnswer('This is not a gym.'))
  assert.notEqual(normalizeAnswer('cat'), normalizeAnswer('cut'))
})

const readLibrary = (): Lesson[] => ['classics.json', 'voa-lincoln.json', 'modern.json']
  .flatMap(name => JSON.parse(readFileSync(new URL('../src/data/' + name, import.meta.url), 'utf8')) as Lesson[])
  .sort((a, b) => a.order - b.order)

test('the ten source candidates have stable, unique identities and usable provenance', () => {
  const lessons = readLibrary()
  assert.equal(lessons.length, 10)
  assert.deepEqual(lessons.map(l => l.order), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  assert.equal(new Set(lessons.map(l => l.id)).size, lessons.length)
  const cardIds: string[] = []
  for (const lesson of lessons) {
    assert.match(lesson.id, /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,149}$/)
    for (const key of ['title', 'subtitle', 'category', 'level', 'author', 'sourceLabel', 'licenseName', 'verificationNotes', 'rightsScope', 'changes'] as const) {
      assert.equal(typeof lesson[key], 'string', lesson.id + ': ' + key)
      assert.ok(lesson[key].trim(), lesson.id + ': missing ' + key)
    }
    for (const key of ['sourceUrl', 'licenseUrl'] as const) {
      const url = new URL(lesson[key])
      assert.equal(url.protocol, 'https:', lesson.id + ': unsafe ' + key)
      assert.equal(url.username, '')
      assert.equal(url.password, '')
    }
    assert.match(lesson.verifiedAt, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(['verified', 'needs-review'].includes(lesson.status))
    lesson.segments.forEach((_, i) => cardIds.push(lesson.id + ':s:' + i))
    lesson.vocabulary.forEach((_, i) => cardIds.push(lesson.id + ':w:' + i))
  }
  assert.equal(new Set(cardIds).size, cardIds.length)
})

test('unverified candidates are quarantined without invented source or educational text', () => {
  for (const lesson of readLibrary().filter(l => l.status === 'needs-review')) {
    assert.equal(lesson.originalText, '', lesson.id)
    assert.deepEqual(lesson.segments, [], lesson.id)
    assert.deepEqual(lesson.vocabulary, [], lesson.id)
    assert.deepEqual(lesson.quiz, [], lesson.id)
    assert.equal(lesson.writingPrompt, '', lesson.id)
    assert.equal(lesson.minutes, 0, lesson.id)
  }
})

test('verified learning segments are exact excerpts of the retained original and have complete exercises', () => {
  const lessons = readLibrary().filter(l => l.status === 'verified')
  assert.ok(lessons.length > 0)
  for (const lesson of lessons) {
    const original = textKey(lesson.originalText)
    assert.ok(original.length > 50, lesson.id + ': missing original')
    assert.ok(Number.isInteger(lesson.minutes) && lesson.minutes > 0, lesson.id + ': duration')
    assert.ok(lesson.segments.length >= 6, lesson.id + ': insufficient sentence practice')
    assert.ok(lesson.vocabulary.length >= 5, lesson.id + ': vocabulary')
    assert.ok(lesson.quiz.length >= 3, lesson.id + ': comprehension quiz')
    assert.ok(lesson.writingPrompt.trim(), lesson.id + ': writing prompt')
    for (const segment of lesson.segments) {
      assert.ok(textKey(segment.en), lesson.id + ': empty excerpt')
      assert.ok(original.includes(textKey(segment.en)), lesson.id + ': excerpt not in original: ' + segment.en)
      assert.ok(segment.ko.trim(), lesson.id + ': translation')
      assert.ok(segment.note.trim(), lesson.id + ': explanation')
    }
    for (const word of lesson.vocabulary) {
      assert.ok(word.term.trim() && word.meaning.trim() && word.example.trim(), lesson.id + ': incomplete vocabulary')
    }
    for (const quiz of lesson.quiz) {
      assert.ok(quiz.question.trim() && quiz.explanation.trim(), lesson.id + ': incomplete quiz')
      assert.ok(quiz.options.length >= 2 && quiz.options.every(option => typeof option === 'string' && option.trim()), lesson.id + ': quiz choices')
      assert.equal(new Set(quiz.options).size, quiz.options.length, lesson.id + ': duplicate choices')
      assert.ok(Number.isInteger(quiz.answer) && quiz.answer >= 0 && quiz.answer < quiz.options.length, lesson.id + ': invalid answer index')
    }
  }
})
