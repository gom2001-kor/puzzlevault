import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Trash2 } from 'lucide-react'

const MAX_SECONDS = 60

function recordingError(error: unknown) {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return '마이크 사용이 허용되지 않았어요. 브라우저의 마이크 권한을 허용한 뒤 다시 눌러 주세요.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return '연결된 마이크를 찾지 못했어요. 마이크 연결을 확인해 주세요.'
  if (name === 'NotReadableError' || name === 'TrackStartError') return '마이크를 사용할 수 없어요. 다른 앱의 마이크 사용을 종료한 뒤 다시 시도해 주세요.'
  return '녹음을 시작하지 못했어요. 마이크와 브라우저 권한을 확인한 뒤 다시 시도해 주세요.'
}

export default function Recorder() {
  const supported = typeof window !== 'undefined'
    && window.isSecureContext
    && typeof navigator !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia
    && typeof MediaRecorder !== 'undefined'
  const [recording, setRecording] = useState(false)
  const [pending, setPending] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const urlRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mountedRef = useRef(false)
  const requestingRef = useRef(false)
  const requestRef = useRef(0)

  const clearTimers = () => {
    if (timerRef.current !== null) clearInterval(timerRef.current)
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
    timerRef.current = null
    timeoutRef.current = null
  }

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  const clearAudio = () => {
    audioRef.current?.pause()
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
    setAudioUrl(null)
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      requestRef.current += 1
      clearTimers()
      const recorder = recorderRef.current
      if (recorder) {
        recorder.ondataavailable = null
        recorder.onstop = null
        recorder.onerror = null
        if (recorder.state !== 'inactive') recorder.stop()
      }
      recorderRef.current = null
      releaseStream()
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
  }, [])

  const stopRecording = () => {
    clearTimers()
    const recorder = recorderRef.current
    if (recorder?.state === 'recording') recorder.stop()
    // The final data event still arrives after stop(); release the mic immediately.
    releaseStream()
    if (mountedRef.current) setRecording(false)
  }

  const startRecording = async () => {
    if (!supported || requestingRef.current || recorderRef.current) return
    requestingRef.current = true
    audioRef.current?.pause()
    setError(null)
    setPending(true)
    const request = ++requestRef.current
    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!mountedRef.current || request !== requestRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = stream
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm']
        .find((type) => MediaRecorder.isTypeSupported(type))
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      const chunks: Blob[] = []
      let failed = false
      recorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }
      recorder.onerror = () => {
        failed = true
        if (!mountedRef.current || request !== requestRef.current) return
        clearTimers()
        releaseStream()
        if (recorder.state !== 'inactive') recorder.stop()
        recorderRef.current = null
        setRecording(false)
        setError('녹음 중 문제가 생겼어요. 마이크 연결을 확인한 뒤 다시 시도해 주세요.')
      }
      recorder.onstop = () => {
        if (!mountedRef.current || request !== requestRef.current) return
        clearTimers()
        releaseStream()
        if (recorderRef.current === recorder) recorderRef.current = null
        setRecording(false)
        if (failed) return
        const blob = new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type || 'audio/webm' })
        if (blob.size === 0) {
          setError('녹음된 소리가 없어요. 마이크를 확인한 뒤 다시 녹음해 주세요.')
          return
        }
        clearAudio()
        const url = URL.createObjectURL(blob)
        urlRef.current = url
        setAudioUrl(url)
      }
      recorder.start()
      // Preserve a previous take until a replacement recording has successfully started.
      clearAudio()
      setSeconds(0)
      setRecording(true)
      const started = Date.now()
      timerRef.current = setInterval(() => {
        if (mountedRef.current) setSeconds(Math.min(MAX_SECONDS, Math.floor((Date.now() - started) / 1000)))
      }, 250)
      timeoutRef.current = setTimeout(stopRecording, MAX_SECONDS * 1000)
    } catch (caught) {
      stream?.getTracks().forEach((track) => track.stop())
      if (mountedRef.current && request === requestRef.current) {
        streamRef.current = null
        recorderRef.current = null
        clearTimers()
        setRecording(false)
        setError(recordingError(caught))
      }
    } finally {
      requestingRef.current = false
      if (mountedRef.current && request === requestRef.current) setPending(false)
    }
  }

  return (
    <div className="recorder">
      <p className="muted">내 목소리로 따라 말하고 원문과 비교해 보세요. 최대 60초까지 녹음하며, 이 앱의 서버로 전송하거나 저장하지 않아요.</p>
      {!supported ? (
        <p className="alert" role="status">이 환경에서는 마이크 녹음을 사용할 수 없어요. HTTPS 주소에서 지원되는 최신 브라우저로 열어 주세요.</p>
      ) : (
        <>
          <div className="recording-state">
            {recording ? (
              <button className="btn btn-secondary" type="button" onClick={stopRecording} aria-label="내 목소리 녹음 종료">
                <Square size={17} aria-hidden="true" /> 녹음 종료
              </button>
            ) : (
              <button className="btn btn-primary" type="button" onClick={startRecording} disabled={pending} aria-label={audioUrl ? '내 목소리 다시 녹음하기' : '내 목소리 녹음 시작'}>
                <Mic size={17} aria-hidden="true" /> {pending ? '마이크 연결 중…' : audioUrl ? '다시 녹음' : '녹음 시작'}
              </button>
            )}
            <span className="muted" role="timer" aria-label={`녹음 시간 ${seconds}초`}>{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')} / 01:00</span>
          </div>
          <span className="muted" role="status" aria-live="polite">{recording ? '녹음 중이에요. 문장을 또박또박 말해 보세요.' : pending ? '마이크 권한을 확인하고 있어요.' : audioUrl ? '녹음이 준비되었어요. 아래 재생 버튼으로 들어 보세요.' : ''}</span>
          {audioUrl && (
            <div className="recording-state">
              <audio ref={audioRef} controls src={audioUrl} aria-label="녹음한 내 목소리 재생" preload="metadata" />
              <button className="btn btn-secondary" type="button" onClick={() => { clearAudio(); setSeconds(0) }} aria-label="녹음한 내 목소리 삭제">
                <Trash2 size={17} aria-hidden="true" /> 삭제
              </button>
            </div>
          )}
        </>
      )}
      {error && <p className="alert" role="alert">{error}</p>}
    </div>
  )
}
