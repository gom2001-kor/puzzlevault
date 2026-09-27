import { useCallback, useEffect, useRef, useState } from 'react'

type SpeechSettings = { rate: number; voiceURI: string; accent: 'en-US' | 'en-GB' }
type SequenceState = { key: string; index: number; total: number; pass: number; repeat: number }
const isEnglish = (voice: SpeechSynthesisVoice) => /^en(?:[-_]|$)/i.test(voice.lang)
function voicePreference(voice: SpeechSynthesisVoice, accent: SpeechSettings['accent']) {
  let score = voice.lang.toLowerCase().replace('_', '-') === accent.toLowerCase() ? 200 : 0
  if (/natural|neural|premium|enhanced/i.test(voice.name)) score += 80
  if (/google|microsoft/i.test(voice.name)) score += 40
  if (voice.default) score += 10
  return score
}
export function useSpeech({ rate, voiceURI, accent }: SpeechSettings) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [speaking, setSpeaking] = useState<string | null>(null)
  const [sequence, setSequence] = useState<SequenceState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const currentTextRef = useRef<string | null>(null)
  const requestRef = useRef(0)
  const mountedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearTimer = useCallback(() => { if (timerRef.current !== null) clearTimeout(timerRef.current); timerRef.current = null }, [])

  useEffect(() => {
    mountedRef.current = true
    if (!supported) return () => { mountedRef.current = false }
    const synthesis = window.speechSynthesis
    const refresh = () => { if (mountedRef.current) setVoices(synthesis.getVoices().filter(isEnglish)) }
    refresh(); synthesis.addEventListener('voiceschanged', refresh)
    return () => {
      mountedRef.current = false; requestRef.current += 1; clearTimer()
      synthesis.removeEventListener('voiceschanged', refresh); synthesis.cancel()
      currentTextRef.current = null; utteranceRef.current = null
    }
  }, [supported, clearTimer])

  const stop = useCallback(() => {
    requestRef.current += 1; clearTimer(); currentTextRef.current = null
    if (supported) window.speechSynthesis.cancel()
    utteranceRef.current = null
    if (mountedRef.current) { setSpeaking(null); setSequence(null); setError(null) }
  }, [supported, clearTimer])

  const start = useCallback((source: string[], isSequence: boolean, pauseMs: number, repeats: number, sequenceKey = '') => {
    stop()
    const texts = source.map(text => text.trim()).filter(Boolean)
    if (!texts.length) return
    if (!supported) { setError('이 브라우저에서는 문장 읽기를 지원하지 않아요. Chrome, Edge 또는 Safari에서 열어 주세요.'); return }
    const synthesis = window.speechSynthesis
    const available = synthesis.getVoices().filter(isEnglish)
    const selected = available.find(voice => voice.voiceURI === voiceURI) ?? [...available].sort((a,b) => voicePreference(b,accent)-voicePreference(a,accent))[0]
    if (!selected) { setError('영어 음성을 찾지 못했어요. 앱 내 미리보기라면 Chrome 또는 Edge에서 같은 주소를 열어 주세요. 일반 브라우저에서도 안 되면 기기에 영어 음성을 설치해 주세요.'); return }
    const request = ++requestRef.current
    const pause = Number.isFinite(pauseMs) ? Math.max(0, Math.min(5000, pauseMs)) : 900
    const repeat = Number.isFinite(repeats) ? Math.max(1, Math.min(3, Math.trunc(repeats))) : 1
    let index = 0; let pass = 1
    const live = () => mountedRef.current && request === requestRef.current
    const finish = () => {
      if (!live()) return
      clearTimer(); currentTextRef.current = null; utteranceRef.current = null
      setSpeaking(null); setSequence(null)
    }
    const play = () => {
      if (!live()) return
      timerRef.current = null
      const content = texts[index]
      let settled = false
      const utterance = new SpeechSynthesisUtterance(content)
      utterance.voice = selected; utterance.lang = selected.lang || accent
      utterance.rate = Number.isFinite(rate) ? Math.min(1.25, Math.max(.5, rate)) : .9
      utterance.pitch = 1; utterance.volume = 1
      utteranceRef.current = utterance; currentTextRef.current = content; setSpeaking(content)
      if (isSequence) setSequence({ key: sequenceKey, index, total: texts.length, pass, repeat })
      utterance.onend = () => {
        if (!live() || settled) return
        settled = true
        currentTextRef.current = null; utteranceRef.current = null; setSpeaking(null)
        if (index < texts.length - 1) index += 1
        else if (pass < repeat) { pass += 1; index = 0 }
        else { finish(); return }
        timerRef.current = setTimeout(play, pause)
      }
      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        if (!live() || settled) return
        settled = true
        finish()
        if (event.error === 'canceled' || event.error === 'interrupted') return
        setError(event.error === 'not-allowed' ? '음성 재생이 차단되었어요. 스피커 버튼을 직접 누르거나 브라우저의 소리 권한을 확인해 주세요.' : event.error === 'network' ? '음성을 불러오지 못했어요. 연결을 확인하거나 다른 영어 음성을 선택해 주세요.' : '영어 음성을 재생하지 못했어요. 다른 영어 음성을 선택하거나 다시 시도해 주세요.')
      }
      try { if (synthesis.paused) synthesis.resume(); synthesis.speak(utterance) }
      catch { finish(); setError('영어 음성을 재생하지 못했어요. 브라우저의 소리 설정을 확인한 뒤 다시 시도해 주세요.') }
    }
    play()
  }, [accent, rate, voiceURI, supported, stop, clearTimer])

  const speak = useCallback((text: string) => {
    const content = text.trim()
    if (!content) return
    if (currentTextRef.current === content) { stop(); return }
    start([content], false, 0, 1)
  }, [start, stop])
  const speakSequence = useCallback((texts: string[], options: { pauseMs?: number; repeat?: number; key?: string } = {}) => {
    start(texts, true, options.pauseMs ?? 900, options.repeat ?? 1, options.key ?? '')
  }, [start])
  return { voices, supported, speaking, sequence, error, speak, speakSequence, stop }
}
