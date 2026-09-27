import { useEffect, useRef, useState } from 'react'
import { available } from '../data/library'
import { guidesByLesson } from '../data/guides'
import {
  advanceQuest, buildQuestBank, courseLessons, createQuestSession, isQuestCorrect, loadQuest,
  mergeQuestProgress, questChoices, questRecordKey, questSummary, questXP, saveQuest,
  setQuestDraft, startQuest, startQuestReview, submitQuestAnswer, utcQuestDay, validQuestAnswer,
} from '../lib/quest'
import type { QuestState } from '../lib/quest'
import './EnglishQuest.css'

type Props = { onStudy: (lessonId: string, segment?: number) => void; speak: (text: string) => void; stopSpeech: () => void; onSaveCard: (cardId: string) => void }
const bank = buildQuestBank(available, guidesByLesson)
const lessons = courseLessons(bank)
const storage = { getItem: (key: string) => window.localStorage.getItem(key), setItem: (key: string, value: string) => window.localStorage.setItem(key, value) }
const session = createQuestSession(storage, bank)
const labels = { word: '단어의 숲', order: '문장의 다리', reading: '이야기의 등대' }
const symbols = { word: '✦', order: '⌘', reading: '◈' }
const newId = () => `quest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

function QuestLandscape() {
  return <svg className="eq-landscape" viewBox="0 0 660 320" fill="none" aria-hidden="true">
    <defs><linearGradient id="eq-island" x1="160" y1="162" x2="510" y2="276" gradientUnits="userSpaceOnUse"><stop stopColor="#79BFAA"/><stop offset="1" stopColor="#247B80"/></linearGradient><linearGradient id="eq-book" x1="300" y1="150" x2="330" y2="255" gradientUnits="userSpaceOnUse"><stop stopColor="#FFF8DB"/><stop offset="1" stopColor="#E4C88B"/></linearGradient></defs>
    <circle cx="495" cy="79" r="40" fill="#FFE1A6" opacity=".9"/><circle cx="495" cy="79" r="57" stroke="#FFE1A6" opacity=".13"/>
    <path d="M15 196C67 145 84 144 143 184C200 109 235 104 306 176C365 136 399 139 461 180C538 133 600 147 660 182V320H15Z" fill="#96B9B6" opacity=".12"/>
    <path d="M111 220L210 140L388 128L563 216L461 276L234 284Z" fill="#144F61"/><path d="M111 208L210 130L388 119L563 204L461 258L234 270Z" fill="url(#eq-island)"/>
    <path d="M153 211L247 156L388 143L487 199L440 226L279 242Z" fill="#A7D6B0" opacity=".25"/><path d="M217 208C258 175 259 233 305 205C351 177 376 220 420 188" stroke="#F7DA9B" strokeWidth="8" strokeLinecap="round" strokeDasharray="2 12"/>
    <path d="M286 172L319 161L354 177V219L320 209L286 217Z" fill="#C29653"/><path d="M282 167L316 157L351 172V212L317 201L282 210Z" fill="url(#eq-book)"/><path d="M317 158V201M289 181L308 176M289 189L308 184M326 179L343 185M326 188L343 194" stroke="#B89567" strokeWidth="2"/>
    {[{x:191,y:164,s:1},{x:232,y:148,s:.75},{x:413,y:153,s:.9},{x:466,y:196,s:.65},{x:179,y:199,s:.6}].map(({x,y,s},i)=><g key={i} transform={`translate(${x} ${y}) scale(${s})`}><path d="M0 0V29" stroke="#725D48" strokeWidth="6"/><path d="M-24 4L0-42L24 4Z" fill={i%2 ? '#21686A' : '#174D59'}/><path d="M-19-10L0-48L19-10Z" fill="#3D8C7D"/></g>)}
    <path d="M403 183L408 117L430 117L436 183Z" fill="#F3DBAB"/><path d="M403 117L419 103L435 117Z" fill="#DB9569"/><path d="M412 124H426V138H412Z" fill="#FFD875"/><path d="M398 183H441" stroke="#FFECC0" strokeWidth="6" strokeLinecap="round"/>
    <path d="M407 130L373 112M432 130L467 114" stroke="#FFE2A2" strokeWidth="2" opacity=".55"/>
    <g fill="#FADEA6"><path d="M108 91L110 97L116 99L110 101L108 107L106 101L100 99L106 97Z"/><path d="M347 69L349 75L355 77L349 79L347 85L345 79L339 77L345 75Z"/><circle cx="234" cy="71" r="2"/><circle cx="567" cy="149" r="2"/><circle cx="155" cy="127" r="2"/></g>
    <ellipse cx="336" cy="302" rx="153" ry="8" fill="#031D31" opacity=".24"/>
  </svg>
}

export default function EnglishQuest({ onStudy, speak, stopSpeech, onSaveCard }: Props) {
  const [initial] = useState(() => session.load())
  const [state, setState] = useState(initial.state)
  const stateRef = useRef(state)
  const blocked = useRef(!!initial.error)
  const preservedRaw = useRef(initial.raw)
  const [error, setError] = useState(initial.error)
  const errorRef = useRef(initial.error)
  const [lobby, setLobby] = useState(!initial.state.active)
  const [selection, setSelection] = useState(lessons[0]?.id ?? '')
  const [discard, setDiscard] = useState(false)
  const [savedCards, setSavedCards] = useState<string[]>([])
  const [today, setToday] = useState(utcQuestDay())
  const feedbackRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const run = state.active
  const question = run ? bank[run.questionIds[run.position]] : null
  const summary = run ? questSummary(run, bank) : null
  const hasSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window

  useEffect(() => { const timer = window.setInterval(() => setToday(utcQuestDay()), 30000); return () => window.clearInterval(timer) }, [])
  useEffect(() => () => stopSpeech(), [stopSpeech])
  useEffect(() => {
    if (!lobby) {
      if (run?.stage === 'feedback') feedbackRef.current?.focus()
      else headingRef.current?.focus()
    }
  }, [run?.position, run?.stage, lobby])

  function update(change: (previous: QuestState) => QuestState) {
    let previous = stateRef.current
    let issue = errorRef.current
    if (!blocked.current) {
      const current = loadQuest(storage, bank)
      preservedRaw.current = current.raw
      if (current.error) { blocked.current = true; issue = current.error }
      else previous = mergeQuestProgress(previous, current.state)
    }
    const next = change(previous)
    if (!blocked.current) {
      issue = saveQuest(storage, next, bank)
      if (issue) blocked.current = true
    }
    errorRef.current = issue; setError(issue)
    session.remember(next, issue, preservedRaw.current)
    stateRef.current = next; setState(next)
  }
  function start(mode: 'daily' | 'practice') {
    stopSpeech(); setSavedCards([])
    const day = utcQuestDay(); setToday(day)
    update(previous => ({ ...previous, active: startQuest(bank, mode, day, mode === 'daily' ? null : selection, newId()) }))
    setLobby(false); setDiscard(false)
  }
  function review() {
    if (!run) return
    stopSpeech(); setSavedCards([])
    const next = startQuestReview(run, bank, newId())
    if (next) update(previous => ({ ...previous, active: next }))
  }
  function study(lessonId: string, segment?: number) { stopSpeech(); onStudy(lessonId, segment) }
  function saveCard(id: string) { onSaveCard(id); setSavedCards(previous => [...previous, id]) }
  function downloadPreserved() {
    if (preservedRaw.current === null) return
    const url = URL.createObjectURL(new Blob([preservedRaw.current], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'puzzlevault-english-quest-preserved.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const inProgress = !!run && run.stage !== 'result'
  const xp = questXP(state)

  return <section className="english-quest" aria-label="영어 탐험">
    <div className="eq-topline"><span className="eq-eyebrow">PUZZLEVAULT · ENGLISH QUEST</span><span className="eq-xp"><span aria-hidden="true">✦</span> 학습 {xp} XP</span></div>
    {error && <div className="eq-storage-note" role="alert"><strong>이 기기의 저장을 확인해 주세요</strong><p>{error}</p>{preservedRaw.current !== null && <button type="button" onClick={downloadPreserved}>기존 탐험 기록 내려받기</button>}</div>}
    {lobby || !run || !question ? <>
      <header className="eq-hero">
        <div className="eq-hero-copy"><span className="eq-kicker">읽고, 연결하고, 발견하는 6개의 순간</span><h1>단어의 숲에서<br/>이야기의 끝까지.</h1><p>짧은 원문 속 단어를 발견하고, 문장을 잇고, 이야기의 단서를 찾아보세요. 틀린 답도 다음 탐험의 힌트가 됩니다.</p><div className="eq-hero-tags"><span>단어 찾기</span><span>문장 조립</span><span>내용 이해</span></div></div>
        <QuestLandscape/>
      </header>
      {inProgress && <div className="eq-resume"><div><strong>잠시 멈춘 탐험이 있어요</strong><p>{run!.mode === 'daily' ? `${run!.day} 오늘의 탐험` : run!.mode === 'review' ? '오답 다시 탐험' : '수업별 연습'} · {run!.answers.length} / {run!.questionIds.length}문제 제출</p></div><button className="eq-primary" type="button" onClick={() => setLobby(false)}>이어서 탐험</button><button className="eq-text-button" type="button" onClick={() => setDiscard(!discard)}>이 탐험 그만두기</button>{discard && <div className="eq-discard"><p>이 탐험의 중간 진도만 지워집니다. 지금까지 얻은 XP와 최고 기록은 유지돼요.</p><button type="button" onClick={() => { update(previous => ({ ...previous, active: null })); setDiscard(false) }}>중간 진도 지우기</button><button type="button" onClick={() => setDiscard(false)}>계속 보관하기</button></div>}</div>}
      <div className="eq-course-grid">
        <article className="eq-course eq-daily"><div className="eq-course-top"><span className="eq-small-icon" aria-hidden="true">◈</span><span className="eq-chip">매일 새로운 조합</span></div><h2>오늘의 탐험</h2><p>두 이야기에서 출발하는 여섯 문제. 같은 날에는 누구나 같은 코스를 만나게 됩니다.</p><div className="eq-route-mini" aria-label="단어, 문장, 독해를 두 번 만나는 코스">✦ <i/> ⌘ <i/> ◈ <i/> ✦ <i/> ⌘ <i/> ◈</div><button className="eq-primary" type="button" disabled={inProgress} onClick={() => start('daily')}>{state.dailyAwards[today] ? '오늘의 코스 다시 탐험' : '오늘의 탐험 시작'} <span aria-hidden="true">↗</span></button><small>{today} · UTC 기준, 한국 시간 오전 9시 갱신</small>{state.dailyAwards[today] && <span className="eq-earned">오늘의 학습 XP 수령 완료 · 다시 풀어도 XP는 추가되지 않아요.</span>}</article>
        <article className="eq-course"><div className="eq-course-top"><span className="eq-small-icon" aria-hidden="true">⌘</span><span className="eq-chip eq-chip-soft">나의 속도로</span></div><h2>수업별 연습</h2><p>마음에 드는 이야기를 골라 집중해 보세요. 정답 해설에서 원문 수업으로 바로 이어집니다.</p><label className="eq-select-label" htmlFor="eq-lesson-select">탐험할 이야기</label><select id="eq-lesson-select" value={selection} onChange={event => setSelection(event.target.value)} disabled={inProgress}>{lessons.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select><button className="eq-secondary" type="button" onClick={() => start('practice')} disabled={inProgress || !selection}>이 이야기로 연습 <span aria-hidden="true">→</span></button><small>문제 조합은 매번 변경 · XP 없이 최고 정답 기록 갱신</small></article>
      </div>
      <div className="eq-explainer"><span aria-hidden="true">✧</span><p><strong>완벽한 첫 답보다, 이해한 다음 답.</strong> 시간제한과 생명 차감 없이 진행합니다. 오늘의 탐험은 처음 완료할 때 30 XP와 정답당 10 XP를 얻으며, 다른 PuzzleVault 게임의 XP와 별도로 이 브라우저에 저장됩니다.</p></div>
      {Object.keys(state.best).length > 0 && <section className="eq-records"><h2>내 탐험 기록</h2><div><span><strong>{Object.keys(state.dailyAwards).length}</strong> 일일 탐험 완료</span><span><strong>{xp}</strong> 학습 XP</span><span><strong>{Math.max(...Object.values(state.best))} / 6</strong> 최고 정답 수</span></div><p>이 기기의 연습 기록입니다. 공인 영어 등급이나 성적을 의미하지 않아요.</p></section>}
    </> : run.stage === 'result' ? <>
      <div className="eq-result">
        <span className="eq-kicker">{run.mode === 'review' ? '다시 만난 문장이 내 것이 되는 순간' : '여섯 개의 발자국, 한 번의 발견'}</span><h1 ref={headingRef} tabIndex={-1}>탐험을 마쳤어요.</h1><p>{summary!.correct === summary!.total ? '모든 단서를 연결했어요. 다른 이야기에도 도전해 보세요.' : '해설을 다시 읽고, 헷갈렸던 단서부터 한 번 더 연결해 보세요.'}</p>
        <div className="eq-score-orbit" style={{ '--eq-score': `${summary!.correct / summary!.total * 360}deg` } as React.CSSProperties}><div><strong>{summary!.correct}<span> / {summary!.total}</span></strong><small>이번 탐험 정답</small></div></div>
        <div className="eq-result-stats"><span><strong>{summary!.bestStreak}</strong>최장 연속 정답</span><span><strong>{run.reward ? `+${run.reward}` : '—'}</strong>{run.reward ? '획득한 학습 XP' : run.mode === 'daily' ? '오늘의 XP 이미 수령' : '연습 · XP 미지급'}</span>{run.mode !== 'review' && <span><strong>{state.best[questRecordKey(run)] ?? summary!.correct} / 6</strong>{run.mode === 'daily' ? '이 날짜 코스 최고 기록' : '이 수업 최고 기록'}</span>}</div>
        {run.mode === 'daily' && <p className="eq-result-note">{run.day}에 시작한 코스의 기록입니다. 날짜가 바뀌어도 시작 날짜에 적립해요.</p>}
        <div className="eq-result-actions">{summary!.correct < summary!.total && <button className="eq-primary" type="button" onClick={review}>오답 {summary!.total - summary!.correct}개 다시 탐험</button>}<button className="eq-secondary" type="button" onClick={() => { stopSpeech(); setLobby(true) }}>다음 탐험 고르기</button></div>
      </div>
      <section className="eq-review-list"><h2>이번에 만난 단서</h2>{run.questionIds.map((id, i) => { const q = bank[id]; const correct = isQuestCorrect(q, run.answers[i]); return <details key={id}><summary><span className={correct ? 'eq-mark-correct' : 'eq-mark-review'}>{correct ? '✓' : '↻'}</span><span>{q.kind === 'word' ? q.english : q.kind === 'order' ? q.translation : q.prompt}<small>{q.lessonTitle} · {labels[q.kind]}</small></span><span className="eq-answer-label">{correct ? '정답' : '복습'}</span></summary><div><p className="eq-answer-text" lang={q.kind === 'order' ? 'en' : undefined}>{q.kind === 'order' ? q.english : q.choices[q.answer]}</p><p>{q.explanation}</p><div className="eq-inline-actions"><button type="button" onClick={() => study(q.lessonId, q.segment)}>원문 수업 열기 ↗</button>{q.cardId && <button type="button" disabled={savedCards.includes(q.cardId)} onClick={() => saveCard(q.cardId!)}>{savedCards.includes(q.cardId) ? '복습함에 담았어요' : '복습함에 담기'}</button>}</div></div></details> })}</section>
    </> : <>
      <div className="eq-play-heading"><button className="eq-text-button" type="button" onClick={() => { stopSpeech(); setLobby(true) }}>← 코스 선택</button><span>{run.mode === 'daily' ? `${run.day} 오늘의 탐험` : run.mode === 'review' ? '오답 다시 탐험' : '수업별 연습'}</span><strong>{summary!.currentStreak > 1 ? `${summary!.currentStreak} 연속 정답 ✦` : `${summary!.correct}개 발견`}</strong></div>
      <ol className="eq-trail" aria-label="탐험 진행">{run.questionIds.map((id, i) => <li key={id} aria-current={i === run.position ? 'step' : undefined} className={i < run.answers.length ? isQuestCorrect(bank[id], run.answers[i]) ? 'eq-step-done' : 'eq-step-review' : ''}><span aria-hidden="true">{i < run.answers.length ? isQuestCorrect(bank[id], run.answers[i]) ? '✓' : '↻' : symbols[bank[id].kind]}</span><small>{i + 1}<span className="eq-step-name"> · {labels[bank[id].kind]}</span></small></li>)}</ol>
      <article className={`eq-question eq-${question.kind}`}>
        <div className="eq-question-meta"><span>{labels[question.kind]}</span><span>{run.position + 1} / {run.questionIds.length}</span></div><p className="eq-source-name">{question.lessonTitle}</p><h1 ref={headingRef} tabIndex={-1}>{question.prompt}</h1>
        {question.kind === 'word' && <div className="eq-word-prompt"><strong lang="en">{question.english}</strong><button type="button" className="eq-listen" disabled={!hasSpeech} onClick={() => speak(question.english)}>◖ 듣기</button><p lang="en">{question.evidence}</p></div>}
        {question.kind === 'order' && <><div className="eq-order-prompt"><p>{question.translation}</p><button type="button" className="eq-listen" disabled={!hasSpeech} onClick={() => speak(question.english)}>◖ 듣고 힌트 얻기</button></div>{question.fragment && <p className="eq-fragment-note">이어지는 원문의 일부입니다. 조각의 순서를 맞춰 보세요.</p>}</>}
        {question.kind === 'reading' && <details className="eq-source" open><summary>원문에서 단서 찾기 <span>펼치기 / 접기</span></summary><div className="eq-source-scroll" tabIndex={0} role="region" aria-label="문제의 근거가 있는 영어 원문"><p lang="en">{question.evidence}</p></div><button className="eq-listen" type="button" disabled={!hasSpeech} onClick={() => speak(question.english)}>◖ 원문 듣기</button></details>}
        {run.stage === 'question' ? <>
          {question.kind === 'order' ? <div className="eq-builder"><div className="eq-builder-label"><span>나의 문장 · {run.draft.length} / {question.choices.length}조각</span><button type="button" disabled={!run.draft.length} onClick={() => update(previous => setQuestDraft(previous, bank, []))}>다시 배열</button></div><div className="eq-built" aria-live="polite">{run.draft.length ? run.draft.map((index, order) => <button type="button" key={index} lang="en" onClick={() => update(previous => setQuestDraft(previous, bank, previous.active!.draft.filter(i => i !== index)))} aria-label={`${order + 1}번째 조각 ${question.choices[index]}, 누르면 제거`}><span>{order + 1}</span>{question.choices[index]}<i aria-hidden="true">×</i></button>) : <p>아래 조각을 순서대로 눌러 문장을 만드세요.</p>}</div><div className="eq-piece-bank" aria-label="사용할 문장 조각">{questChoices(question, run.seed).map(piece => <button type="button" key={piece.index} lang="en" disabled={run.draft.includes(piece.index)} onClick={() => update(previous => setQuestDraft(previous, bank, [...previous.active!.draft, piece.index]))}>{piece.text}</button>)}</div><p className="eq-input-hint">놓은 조각을 다시 누르면 빼낼 수 있어요. 키보드는 Tab과 Enter로 선택하세요.</p></div> : <div className="eq-options" role="group" aria-label="답 선택">{questChoices(question, run.seed).map((choice, i) => <button type="button" key={choice.index} className={run.draft[0] === choice.index ? 'eq-selected' : ''} aria-pressed={run.draft[0] === choice.index} onClick={() => update(previous => setQuestDraft(previous, bank, [choice.index]))}><span>{String.fromCharCode(65 + i)}</span>{choice.text}</button>)}</div>}
          <div className="eq-question-footer"><p>서두르지 않아도 괜찮아요. 제출 후 해설을 확인할 수 있어요.</p><button className="eq-primary" type="button" disabled={!validQuestAnswer(question, run.draft)} onClick={() => { stopSpeech(); update(previous => submitQuestAnswer(previous, bank)) }}>답 확인하기 →</button></div>
        </> : <div className={`eq-feedback ${isQuestCorrect(question, run.answers[run.position]) ? 'eq-correct' : 'eq-retry'}`} ref={feedbackRef} tabIndex={-1}>
          <div className="eq-feedback-heading"><span aria-hidden="true">{isQuestCorrect(question, run.answers[run.position]) ? '✦' : '↻'}</span><h2>{isQuestCorrect(question, run.answers[run.position]) ? '단서를 찾았어요!' : '이 단서는 함께 다시 읽어볼까요?'}</h2></div>
          {!isQuestCorrect(question, run.answers[run.position]) && <p className="eq-your-answer"><strong>내 답</strong> <span lang={question.kind === 'order' ? 'en' : undefined}>{run.draft.map(index => question.choices[index]).join(' ')}</span></p>}
          <p className="eq-answer-text"><strong>{question.kind === 'order' ? '원문의 순서' : '정답'}</strong><span lang={question.kind === 'order' ? 'en' : undefined}>{question.kind === 'order' ? question.english : question.choices[question.answer]}</span></p>
          <p>{question.explanation}</p>{question.kind === 'order' && <div className="eq-chunk-evidence">{question.evidence.split('\n').map((line, i) => <p key={i}>{line}</p>)}</div>}
          <div className="eq-inline-actions"><button type="button" onClick={() => study(question.lessonId, question.segment)}>원문 수업에서 더 읽기 ↗</button>{question.cardId && <button type="button" disabled={savedCards.includes(question.cardId)} onClick={() => saveCard(question.cardId!)}>{savedCards.includes(question.cardId) ? '복습함에 담았어요' : '복습함에 담기'}</button>}</div>
          <button className="eq-primary" type="button" onClick={() => { stopSpeech(); update(previous => advanceQuest(previous, bank)) }}>{run.position === run.questionIds.length - 1 ? '탐험 결과 보기' : '다음 단서로'} →</button>
        </div>}
        {!hasSpeech && <p className="eq-input-hint">이 브라우저에서는 음성 듣기를 사용할 수 없어요. 모든 문제는 읽고 풀 수 있습니다.</p>}
      </article>
    </>}
    <p className="eq-footnote">단어·번역·해설은 이 학습관의 검증된 수업 자료를 사용합니다. 탐험 결과는 원문 수업을 읽었거나 학습 완료한 것으로 처리하지 않습니다.</p>
  </section>
}
