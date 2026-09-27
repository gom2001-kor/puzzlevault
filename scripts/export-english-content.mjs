#!/usr/bin/env node
// This producer is also installed in study-english2 with its import and data paths adjusted.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { CONTENT_FILES, MAX_CONTENT_BYTES, createManifest, validateFeed } from '../apps/english/src/lib/content-validation.ts'

const root = path.resolve(import.meta.dirname, '..')
const dataDirectory = path.join(root, 'apps/english/src/data')
const output = path.join(root, 'dist')
const relativeData = path.relative(root, dataDirectory).split(path.sep).join('/')
const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }).trim()
const paths = CONTENT_FILES.map(name => relativeData + '/' + name)
if (git('status', '--porcelain', '--', ...paths)) throw new Error('Commit content changes before publishing their versioned feed.')
// The integrated repository must retain the original repository's version identity.
const manifestPath = path.join(dataDirectory, 'content-manifest.json')
const importedManifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : null
const sourceCommit = importedManifest?.sourceCommit ?? git('log', '-1', '--format=%H', '--', ...paths)
const sourceCommittedAt = importedManifest?.sourceCommittedAt ?? git('show', '-s', '--format=%cI', sourceCommit)
const files = Object.fromEntries(CONTENT_FILES.map(name => [name, JSON.parse(fs.readFileSync(path.join(dataDirectory, name), 'utf8'))]))
const feed = await validateFeed({ manifest: await createManifest(files, sourceCommit, sourceCommittedAt), files })
if (importedManifest && importedManifest.contentHash !== feed.manifest.contentHash) throw new Error('Imported data no longer matches its original source manifest; sync the source edition first.')
const json = JSON.stringify(feed)
if (Buffer.byteLength(json) > MAX_CONTENT_BYTES) throw new Error('Public feed exceeds the supported size limit.')
fs.mkdirSync(output, { recursive: true })
fs.writeFileSync(path.join(output, 'puzzlevault-content.json'), json + '\n')
const headersPath = path.join(output, '_headers')
let headers = fs.existsSync(headersPath) ? fs.readFileSync(headersPath, 'utf8') : ''
headers = headers.replace(/# PUZZLEVAULT_CONTENT_START[\s\S]*?# PUZZLEVAULT_CONTENT_END\s*/g, '')
headers += '\n# PUZZLEVAULT_CONTENT_START\n/puzzlevault-content.json\n  Access-Control-Allow-Origin: *\n  Content-Type: application/json; charset=utf-8\n  Cache-Control: no-cache, max-age=0, must-revalidate\n  X-Content-Type-Options: nosniff\n  X-Robots-Tag: noindex\n# PUZZLEVAULT_CONTENT_END\n'
fs.writeFileSync(headersPath, headers)
console.log(`Published feed artifact: ${feed.manifest.verifiedLessons} lessons, ${feed.manifest.segments} segments, ${Buffer.byteLength(json)} bytes.`)
