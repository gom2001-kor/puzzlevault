import bundledManifest from '../data/content-manifest.json'
import { bundledContent } from '../data/content-files'
import { replaceGuides } from '../data/guides'
import { replaceLibrary } from '../data/library'
import { CONTENT_SOURCE, inspectContent, readBoundedFeed, validateFeed, type ContentFeed, type ContentManifest } from './content-validation'

export const CONTENT_CACHE = 'puzzlevault-english-content-v1'
const CACHE_PATH = '/learn/english/last-verified-content.json'
export let contentStatus: { manifest: ContentManifest; channel: 'bundled' | 'live' | 'cached'; notice: string } = {
  manifest: bundledManifest as ContentManifest, channel: 'bundled', notice: '',
}
function bounded<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Content check timed out')), milliseconds)
    promise.then(value => { clearTimeout(timer); resolve(value) }, error => { clearTimeout(timer); reject(error) })
  })
}
export async function initializeContent(): Promise<void> {
  let candidate: ContentFeed | undefined
  // Cache calls can stall in restricted profiles; neither read nor write may block boot.
  try {
    const feed = await bounded((async () => {
      const cache = await caches.open(CONTENT_CACHE)
      const saved = await cache.match(CACHE_PATH)
      return saved ? validateFeed(await readBoundedFeed(saved), bundledContent) : undefined
    })(), 400)
    if (feed && Date.parse(feed.manifest.sourceCommittedAt) >= Date.parse(bundledManifest.sourceCommittedAt)) {
      candidate = feed; contentStatus.channel = 'cached'
    }
  } catch { /* Keep the compiled, verified edition. */ }
  const controller = new AbortController()
  try {
    const baseline = candidate?.files ?? bundledContent
    const feed = await bounded((async () => {
      const response = await fetch(CONTENT_SOURCE, { credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer', signal: controller.signal })
      return validateFeed(await readBoundedFeed(response), baseline)
    })(), 3500)
    const previous = candidate?.manifest ?? bundledManifest
    if (Date.parse(feed.manifest.sourceCommittedAt) < Date.parse(previous.sourceCommittedAt)) throw new Error('Older content edition')
    candidate = feed; contentStatus.channel = 'live'
    void (async () => {
      try {
        const cache = await caches.open(CONTENT_CACHE)
        await cache.put(CACHE_PATH, new Response(JSON.stringify(feed), { headers: { 'content-type': 'application/json; charset=utf-8' } }))
      } catch { /* The live edition remains available in memory. */ }
    })()
  } catch {
    contentStatus.notice = candidate ? '최신 자료를 확인하지 못해 이 기기에 보관한 확인 완료 자료를 열었습니다.' : '최신 자료를 확인하지 못해 앱에 포함된 확인 완료 자료를 열었습니다.'
  } finally { controller.abort() }
  if (candidate) {
    const content = inspectContent(candidate.files)
    replaceGuides(content.guides); replaceLibrary(content.lessons)
    contentStatus.manifest = candidate.manifest
  }
}
