#!/usr/bin/env node
// Node.js 24. Fetch data, validate it, then update only the six allowlisted JSON files.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { CONTENT_FILES, CONTENT_SOURCE, MAX_CONTENT_BYTES, createManifest, readBoundedFeed, validateFeed } from '../apps/english/src/lib/content-validation.ts'

const root = path.resolve(import.meta.dirname, '..')
const dataDirectory = path.join(root, 'apps/english/src/data')
const args = process.argv.slice(2)
const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined
if (args.some((arg, index) => arg.startsWith('--') && !['--source', '--feed', '--check', '--if-available'].includes(arg))) throw new Error('Unsupported argument')
const readFiles = directory => Object.fromEntries(CONTENT_FILES.map(name => [name, JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'))]))
const baseline = readFiles(dataDirectory)
let input
if (option('--source')) {
  const source = path.resolve(option('--source'))
  const git = (...command) => execFileSync('git', ['-C', source, ...command], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }).trim()
  const paths = CONTENT_FILES.map(name => 'src/data/' + name)
  const commit = git('log', '-1', '--format=%H', '--', ...paths)
  const committedAt = git('show', '-s', '--format=%cI', commit)
  const files = Object.fromEntries(CONTENT_FILES.map(name => [name, JSON.parse(git('show', `HEAD:src/data/${name}`))]))
  input = { manifest: await createManifest(files, commit, committedAt), files }
} else if (option('--feed')) {
  const file = path.resolve(option('--feed'))
  if (fs.statSync(file).size > MAX_CONTENT_BYTES) throw new Error('Feed exceeds the size limit')
  input = JSON.parse(fs.readFileSync(file, 'utf8'))
} else {
  const response = await fetch(CONTENT_SOURCE, { signal: AbortSignal.timeout(15000), redirect: 'error', headers: { accept: 'application/json' } })
  if (args.includes('--if-available') && (response.status === 404 || response.ok && response.headers.get('content-type')?.includes('text/html'))) {
    console.log('awaiting_source_deployment: the source JSON feed has not been published; no files changed.')
    process.exit(0)
  }
  input = await readBoundedFeed(response)
}
const feed = await validateFeed(input, baseline)
const manifestPath = path.join(dataDirectory, 'content-manifest.json')
const oldManifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : null
if (oldManifest && Date.parse(feed.manifest.sourceCommittedAt) < Date.parse(oldManifest.sourceCommittedAt)) throw new Error('Refusing an older source edition')
if (args.includes('--check')) {
  console.log(`Valid English content: ${feed.manifest.verifiedLessons} lessons, ${feed.manifest.segments} segments, ${feed.manifest.contentHash.slice(0, 12)}`)
} else if (oldManifest?.contentHash === feed.manifest.contentHash && oldManifest?.sourceCommit === feed.manifest.sourceCommit) {
  console.log('English content is already current; no files changed.')
} else {
  // No UI, scripts, dependencies, or storage code can be copied through this list.
  for (const name of CONTENT_FILES) fs.writeFileSync(path.join(dataDirectory, name), JSON.stringify(feed.files[name], null, 2) + '\n')
  fs.writeFileSync(manifestPath, JSON.stringify(feed.manifest, null, 2) + '\n')
  console.log(`Synced ${feed.manifest.verifiedLessons} verified lessons from ${feed.manifest.sourceCommit.slice(0, 7)} (${feed.manifest.contentHash.slice(0, 12)}).`)
}
