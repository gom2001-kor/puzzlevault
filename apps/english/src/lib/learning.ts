import type { TextGuide } from '../data/types.ts'

// Tokens are used only to connect manually authored glossary entries to source words.
// This tokenizer does not infer translations, parts of speech, or grammatical structure.
export const wordPattern = /[A-Za-z]+(?:['’][A-Za-z]+)*(?:-[A-Za-z]+(?:['’][A-Za-z]+)*)*|\d+(?:[,.]\d+)*/g
export function wordKey(text: string) { return text.toLowerCase().replace(/’/g,"'") }
export function textTokens(text: string): { text: string; word: boolean; offset: number }[] {
  const result: {text:string;word:boolean;offset:number}[]=[]
  let cursor=0
  for(const match of text.matchAll(new RegExp(wordPattern))) {
    if(match.index!>cursor) result.push({text:text.slice(cursor,match.index),word:false,offset:cursor})
    result.push({text:match[0],word:true,offset:match.index!});cursor=match.index!+match[0].length
  }
  if(cursor<text.length)result.push({text:text.slice(cursor),word:false,offset:cursor})
  return result
}
export const normalizeSpacing = (value:string) => value.replace(/\s+/g,' ').trim()
export function getWordIndex(guide: TextGuide, text: string) {return guide.words.findIndex(w=>wordKey(w.text)===wordKey(text))}
export function withoutSpeaker(text:string) {return text.replace(/^(?:Anna|Pete|Marsha):\s*/,'').trim()}
export function shuffledIndices(length:number, random:()=>number=Math.random) {
  const indices=Array.from({length},(_,i)=>i)
  for(let i=length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1))));[indices[i],indices[j]]=[indices[j],indices[i]]}
  if(length>1 && indices.every((v,i)=>v===i))indices.push(indices.shift()!)
  return indices
}
export function assembledCorrect(guide:TextGuide,indices:number[]) {
  return indices.length===guide.chunks.length && new Set(indices).size===indices.length && indices.every(i=>Number.isInteger(i)&&i>=0&&i<guide.chunks.length) && normalizeSpacing(indices.map(i=>guide.chunks[i].text).join(' '))===normalizeSpacing(guide.text)
}
export function originalParts(original:string,segments:{en:string}[]) {
  const matches=segments.map((segment,index)=>({index,start:original.indexOf(segment.en),text:segment.en})).filter(v=>v.start>=0).sort((a,b)=>a.start-b.start)
  const parts:{text:string;segmentIndex?:number}[]=[];let cursor=0
  for(const match of matches){if(match.start<cursor)continue;if(match.start>cursor)parts.push({text:original.slice(cursor,match.start)});parts.push({text:match.text,segmentIndex:match.index});cursor=match.start+match.text.length}
  if(cursor<original.length)parts.push({text:original.slice(cursor)})
  return parts
}
