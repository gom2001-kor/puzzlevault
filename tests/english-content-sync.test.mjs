import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { CONTENT_FILES, MAX_CONTENT_BYTES, assertStableIdentities, createManifest, inspectContent, readBoundedFeed, validateFeed } from '../apps/english/src/lib/content-validation.ts'

const files = Object.fromEntries(CONTENT_FILES.map(name => [name, JSON.parse(fs.readFileSync(new URL('../apps/english/src/data/' + name, import.meta.url), 'utf8'))]))
const manifest = JSON.parse(fs.readFileSync(new URL('../apps/english/src/data/content-manifest.json', import.meta.url), 'utf8'))
const copy = value => JSON.parse(JSON.stringify(value))
const makeFeed = async input => ({ files: input, manifest: await createManifest(input, manifest.sourceCommit, manifest.sourceCommittedAt) })

test('bundled content has a reproducible complete source manifest', async () => {
  const feed = await validateFeed({ files, manifest }, files)
  assert.equal(feed.manifest.contentHash, manifest.contentHash)
  assert.equal(inspectContent(files).verifiedLessons, manifest.verifiedLessons)
})

test('feed accepts corrected explanations and keeps all saved-card identities', async () => {
  const next = copy(files)
  next['classics.json'][0].segments[0].note += ' 원문을 다시 읽어 확인하세요.'
  const feed = await makeFeed(next)
  await validateFeed(feed, files)
  assert.notEqual(feed.manifest.contentHash, manifest.contentHash)
})

test('feed rejects changed hashes and unsupported payloads before applying data', async () => {
  const feed = await makeFeed(copy(files))
  feed.files['classics.json'][0].segments[0].note += ' Unverified change.'
  await assert.rejects(validateFeed(feed, files), /hash/)
  await assert.rejects(validateFeed({ ...await makeFeed(files), code: 'arbitrary code' }), /unsupported fields/)
  const extra = copy(files); extra['App.tsx'] = ['code']
  assert.throws(() => inspectContent(extra), /unsupported fields/)
})

test('feed refuses unverified teaching material, insecure source URLs and noncommercial licenses', () => {
  const unverified = copy(files); unverified['modern.json'][0].originalText = 'Unverified source text'
  assert.throws(() => inspectContent(unverified), /quarantined/)
  const url = copy(files); url['classics.json'][0].sourceUrl = 'javascript:alert(1)'
  assert.throws(() => inspectContent(url), /HTTPS/)
  const rights = copy(files); rights['classics.json'][0].licenseName = 'CC BY-NC 4.0'
  assert.throws(() => inspectContent(rights), /commercial/)
})

test('feed refuses renamed lessons, reordered cards and contextual glossary indices', () => {
  const removed = copy(files); removed['classics.json'][0].id = 'new-identity'; removed['guides/classics-a.json'][0].lessonId = 'new-identity'
  assert.throws(() => assertStableIdentities(files, removed), /identity changed/)
  const words = copy(files); words['classics.json'][0].vocabulary.reverse()
  assert.throws(() => assertStableIdentities(files, words), /card indices changed/)
  const glosses = copy(files); glosses['guides/classics-a.json'][0].title.words.reverse()
  assert.throws(() => assertStableIdentities(files, glosses), /contextual card indices changed/)
})

test('feed bounds network responses and rejects a static-host HTML fallback', async () => {
  await assert.rejects(readBoundedFeed(new Response('<html>fallback</html>', { headers: { 'content-type': 'text/html' } })), /JSON response/)
  await assert.rejects(readBoundedFeed(new Response('{}', { headers: { 'content-type': 'application/json', 'content-length': String(MAX_CONTENT_BYTES + 1) } })), /too large/)
  await assert.rejects(readBoundedFeed(new Response(' '.repeat(MAX_CONTENT_BYTES + 1), { headers: { 'content-type': 'application/json' } })), /size limit/)
  const feed = await makeFeed(files)
  const read = await readBoundedFeed(new Response(JSON.stringify(feed), { headers: { 'content-type': 'application/json' } }))
  assert.deepEqual(read, feed)
})

test('new verified lessons can be added without changing existing lesson or review IDs', async () => {
  const next = copy(files)
  const lesson = copy(next['classics.json'][0]); lesson.id = 'new-reading-fixture'; lesson.order = 999
  const guide = copy(next['guides/classics-a.json'][0]); guide.lessonId = lesson.id
  next['classics.json'].push(lesson); next['guides/classics-a.json'].push(guide)
  const feed = await makeFeed(next)
  await validateFeed(feed, files)
  assert.equal(feed.manifest.verifiedLessons, manifest.verifiedLessons + 1)
  assert.equal(feed.manifest.segments, manifest.segments + lesson.segments.length)
})

test('existing quiz answers and construction-piece identities require an explicit migration', () => {
  const quiz = copy(files); quiz['classics.json'][0].quiz[0].answer = (quiz['classics.json'][0].quiz[0].answer + 1) % quiz['classics.json'][0].quiz[0].options.length
  assert.throws(() => assertStableIdentities(files, quiz), /quiz identities changed/)
  const chunks = copy(files)
  const guide = chunks['guides/classics-a.json'][0].title
  guide.chunks = [{ ...guide.chunks[0], text: guide.text }]
  assert.throws(() => assertStableIdentities(files, chunks), /chunk identities changed/)
})
