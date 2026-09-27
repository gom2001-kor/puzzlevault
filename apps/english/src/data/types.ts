export type Segment = { en: string; ko: string; note: string }
export type Word = { term: string; meaning: string; example: string }
export type Quiz = { question: string; options: string[]; answer: number; explanation: string }
export type ChunkRole = 'subject' | 'verb' | 'object' | 'complement' | 'modifier' | 'connector' | 'other'
export type LearningChunk = { text: string; meaning: string; role: ChunkRole; label: string }
export type ContextWord = { text: string; lemma: string; pos: string; meaning: string; note: string }
export type TextGuide = {
  text: string; meaning: string; kind: 'title' | 'sentence' | 'fragment' | 'dialogue'; overview: string;
  structure: { text: string; label: string; explanation: string }[];
  chunks: LearningChunk[];
  grammar: { title: string; explanation: string; example: string; translation: string }[];
  words: ContextWord[]; tip: string; check: { question: string; answer: string; hint: string }
}
export type LessonGuide = { lessonId: string; title: TextGuide; segments: TextGuide[] }
export type Lesson = {
  id: string; order: number; title: string; subtitle: string; category: string; level: string; minutes: number;
  author: string; sourceLabel: string; sourceUrl: string; licenseName: string; licenseUrl: string;
  status: 'verified' | 'needs-review'; verifiedAt: string; verificationNotes: string; rightsScope: string; changes: string;
  originalText: string; segments: Segment[]; vocabulary: Word[]; quiz: Quiz[]; writingPrompt: string
}
