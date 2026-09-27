import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { Lesson, LessonGuide, TextGuide } from '../src/data/types.ts'
import { assembledCorrect, getWordIndex, normalizeSpacing, originalParts, shuffledIndices, textTokens, withoutSpeaker, wordKey } from '../src/lib/learning.ts'

const library = ['classics.json','voa-lincoln.json','modern.json'].flatMap(file=>JSON.parse(readFileSync(new URL('../src/data/'+file,import.meta.url),'utf8')) as Lesson[])
const readGuides = () => ['classics-a.json','classics-b.json','voa-lincoln.json'].flatMap(file=>JSON.parse(readFileSync(new URL('../src/data/guides/'+file,import.meta.url),'utf8')) as LessonGuide[])

test('interactive tokenization preserves source punctuation, spaces, contractions, spelling, and numbers',()=>{
  const source = 'Pete: I’m Pete. "Anna" Is that A-N-A? 1400 Irving Street!\nAlice’s rabbit-hole.'
  const parts = textTokens(source)
  assert.equal(parts.map(v=>v.text).join(''),source)
  assert.deepEqual(parts.filter(v=>v.word).map(v=>v.text),['Pete','I’m','Pete','Anna','Is','that','A-N-A','1400','Irving','Street','Alice’s','rabbit-hole'])
  assert.equal(wordKey('ALICE’S'),"alice's")
  assert.deepEqual(textTokens('… --'),[{text:'… --',word:false,offset:0}])
  assert.deepEqual(textTokens(''),[])
})

test('reading speech excludes known dialogue labels without changing the original source',()=>{
  assert.equal(withoutSpeaker('Pete: Hi!'),'Hi!')
  assert.equal(withoutSpeaker('Anna:'),'')
  assert.equal(withoutSpeaker('The Tale of Peter Rabbit'),'The Tale of Peter Rabbit')
  assert.equal(withoutSpeaker('Four score and seven years ago'),'Four score and seven years ago')
})

test('sentence assembly requires each original chunk exactly once and in a source-preserving order',()=>{
  const guide={text:'The rabbit ran home.',chunks:[{text:'The rabbit'},{text:'ran'},{text:'home.'}]} as TextGuide
  assert.equal(assembledCorrect(guide,[0,1,2]),true)
  assert.equal(assembledCorrect(guide,[1,0,2]),false)
  assert.equal(assembledCorrect(guide,[0,0,2]),false)
  assert.equal(assembledCorrect(guide,[0,1]),false)
  assert.equal(assembledCorrect(guide,[0,1,3]),false)
  assert.equal(assembledCorrect(guide,[0,1,2.5]),false)
  for(const random of [()=>0,()=>.5,()=>.99999]){
    const shuffled=shuffledIndices(7,random)
    assert.deepEqual([...shuffled].sort((a,b)=>a-b),[0,1,2,3,4,5,6])
    assert.notDeepEqual(shuffled,[0,1,2,3,4,5,6])
  }
  assert.deepEqual(shuffledIndices(1),[0]);assert.deepEqual(shuffledIndices(0),[])
})

test('full-original reading links preserve every source character and target only verified excerpts',()=>{
  for(const lesson of library.filter(v=>v.status==='verified')) {
    const parts=originalParts(lesson.originalText,lesson.segments)
    assert.equal(parts.map(v=>v.text).join(''),lesson.originalText,lesson.id)
    for(const part of parts.filter(v=>v.segmentIndex!==undefined))assert.equal(part.text,lesson.segments[part.segmentIndex!].en)
    assert.equal(parts.filter(v=>v.segmentIndex!==undefined).length,lesson.segments.length,lesson.id)
  }
})

test('every verified title and all learning passages have authored analysis, without adding unverified material',()=>{
  const guides=readGuides()
  const verified=library.filter(v=>v.status==='verified')
  assert.equal(guides.length,verified.length)
  assert.equal(new Set(guides.map(v=>v.lessonId)).size,guides.length)
  for(const guide of guides){
    const lesson=verified.find(v=>v.id===guide.lessonId)
    assert.ok(lesson,guide.lessonId)
    assert.equal(guide.title.text,lesson.title)
    assert.equal(guide.segments.length,lesson.segments.length)
    guide.segments.forEach((segment,index)=>assert.equal(segment.text,lesson.segments[index].en,`${lesson.id}:${index}`))
  }
})

test('all chunks reconstruct the original and every displayed word has a contextual gloss',()=>{
  for(const lesson of readGuides()){
    for(const [index,guide] of [lesson.title,...lesson.segments].entries()){
      const id=`${lesson.lessonId}:${index===0?'title':index-1}`
      assert.ok(guide.meaning.trim() && guide.overview.trim() && guide.tip.trim(),id)
      assert.ok(['title','sentence','fragment','dialogue'].includes(guide.kind),id)
      assert.ok(guide.chunks.length>0,id)
      assert.equal(normalizeSpacing(guide.chunks.map(v=>v.text).join(' ')),normalizeSpacing(guide.text),`${id}: chunk reconstruction`)
      for(const chunk of guide.chunks){assert.ok(chunk.text.trim()&&chunk.meaning.trim()&&chunk.label.trim(),id);assert.ok(['subject','verb','object','complement','modifier','connector','other'].includes(chunk.role),id)}
      const tokens=new Set(textTokens(guide.text).filter(v=>v.word).map(v=>wordKey(v.text)))
      assert.equal(new Set(guide.words.map(w=>wordKey(w.text))).size,guide.words.length,`${id}: duplicate glossary words`)
      for(const token of tokens)assert.ok(getWordIndex(guide,token)>=0,`${id}: missing word ${token}`)
      for(const word of guide.words){
        assert.ok(tokens.has(wordKey(word.text)),`${id}: word not found in source: ${word.text}`)
        assert.ok(word.lemma.trim()&&word.pos.trim()&&word.meaning.trim(),`${id}: incomplete word ${word.text}`)
        assert.equal(typeof word.note,'string',id)
      }
      assert.ok(guide.structure.length>0 && guide.grammar.length>0,id)
      for(const part of guide.structure){assert.ok(guide.text.includes(part.text),`${id}: structure excerpt ${part.text}`);assert.ok(part.label.trim()&&part.explanation.trim(),id)}
      for(const point of guide.grammar)assert.ok(point.title.trim()&&point.explanation.trim()&&point.example.trim()&&point.translation.trim(),id)
      assert.ok(guide.check.question.trim()&&guide.check.answer.trim()&&guide.check.hint.trim(),id)
    }
  }
})
