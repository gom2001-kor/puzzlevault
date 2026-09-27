export type Review = { due: string; interval: number; count: number }
export type StudyState = {
  version: 2; completed: string[]; saved: string[]; reviews: Record<string, Review>; activity: Record<string, number>;
  writings: Record<string, string>; quizScores: Record<string, number>; lastLesson: string;
  settings: { rate: number; voiceURI: string; accent: 'en-US' | 'en-GB'; dailyGoal: number; showTranslation: boolean }
}
export const STORAGE_KEY = 'pv_english_reading_v2'
export const freshState = (): StudyState => ({ version: 2, completed: [], saved: [], reviews: {}, activity: {}, writings: {}, quizScores: {}, lastLesson: '', settings: { rate: .9, voiceURI: '', accent: 'en-US', dailyGoal: 5, showTranslation: false } })
export function dayKey(date = new Date()): string { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` }
export function addDays(days: number, now = new Date()): string { const date = new Date(now); date.setDate(date.getDate()+days); return dayKey(date) }
export function schedule(previous: Review | undefined, rating: 'again' | 'good' | 'easy', now = new Date()): Review {
  const interval = rating === 'again' ? 0 : rating === 'easy' ? Math.min(90, Math.max(3,(previous?.interval || 1)*3)) : Math.min(60,Math.max(1,(previous?.interval || 1)*2))
  return { due: addDays(interval,now), interval, count: (previous?.count || 0)+1 }
}
export function completeSentence(state: StudyState, id: string, now = new Date()): StudyState {
  if(state.completed.includes(id)) return state
  return { ...state, completed: [...state.completed,id], reviews: { ...state.reviews, [id]: state.reviews[id] ?? {due:addDays(1,now),interval:1,count:0} }, activity: {...state.activity,[dayKey(now)]:(state.activity[dayKey(now)] || 0)+1} }
}
export function streak(activity: Record<string, number>, now = new Date()) { const date = new Date(now); let result=0; if(!activity[dayKey(date)]) date.setDate(date.getDate()-1); while(activity[dayKey(date)]) {result++;date.setDate(date.getDate()-1)} return result }
export function normalizeAnswer(value: string) { return value.normalize('NFKC').toLowerCase().replace(/[‘’]/g,"'").replace(/[.,!?;:“”"—–-]/g,' ').replace(/\s+/g,' ').trim() }
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isId = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,149}$/.test(v) && !['constructor','prototype','__proto__'].includes(v)
function check(v: unknown, message: string): asserts v { if(!v) throw new Error(message) }
function validDay(v: unknown): v is string { if(typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false; const date = new Date(`${v}T12:00:00Z`);return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10)===v }
export function validateState(value: unknown): StudyState {
  check(record(value) && value.version===2,'이 앱의 v2 백업 파일인지 확인해 주세요.')
  for(const key of ['completed','saved']) {const v=value[key];check(Array.isArray(v) && v.length<=20000 && v.every(isId) && new Set(v).size===v.length,'카드 기록 형식이 올바르지 않아요.')}
  check(record(value.settings),'설정 값이 없어요.');const s=value.settings
  check(typeof s.rate==='number' && s.rate>=.5 && s.rate<=1.25 && typeof s.voiceURI==='string' && s.voiceURI.length<=1000 && ['en-US','en-GB'].includes(s.accent as string) && [3,5,10].includes(s.dailyGoal as number) && typeof s.showTranslation==='boolean','학습 설정을 확인해 주세요.')
  for(const key of ['reviews','activity','writings','quizScores']) check(record(value[key]) && Object.keys(value[key]).length<=20000,'백업 기록 형식을 확인해 주세요.')
  for(const [id,r] of Object.entries(value.reviews as Record<string,unknown>)) check(isId(id) && record(r) && validDay(r.due) && Number.isInteger(r.interval) && (r.interval as number)>=0 && (r.interval as number)<=90 && Number.isSafeInteger(r.count) && (r.count as number)>=0,'복습 날짜와 간격을 확인해 주세요.')
  for(const [date,count] of Object.entries(value.activity as Record<string,unknown>)) check(validDay(date) && Number.isSafeInteger(count) && (count as number)>=0,'활동 기록을 확인해 주세요.')
  for(const [id,writing] of Object.entries(value.writings as Record<string,unknown>)) check(isId(id) && typeof writing==='string' && writing.length<=10000,'쓰기 기록이 올바르지 않아요.')
  for(const [id,score] of Object.entries(value.quizScores as Record<string,unknown>)) check(isId(id) && Number.isInteger(score) && (score as number)>=0 && (score as number)<=100,'퀴즈 기록을 확인해 주세요.')
  check(value.lastLesson==='' || isId(value.lastLesson),'최근 수업 기록을 확인해 주세요.')
  return value as StudyState
}
export function loadState(): {state: StudyState; error: string} {
  try {const raw=localStorage.getItem(STORAGE_KEY);return {state:raw?validateState(JSON.parse(raw)):freshState(),error:''}}
  catch {return {state:freshState(),error:'저장된 기록을 읽을 수 없어 자동 저장을 멈췄어요. 기존 기록은 보존됩니다. 설정에서 정상 백업을 복원해 주세요.'}}
}
export function downloadJson(data: unknown, filename: string) {const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
