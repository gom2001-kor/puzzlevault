# 콘텐츠 모델과 추가 절차

2026-09-27 기준 실제 JSON에는 **후보 10개, 학습 가능 8개, 확인 필요 2개**가 있습니다. 확인된 자료는 학습 구간 69개, 핵심 표현 40개, 퀴즈 24개, 쓰기 과제 8개로 구성됩니다. 제목 8개와 구간별 문맥 단어 960개를 포함하면 저장 가능한 카드 정의는 총 1,077개입니다. 카드 정의 수는 학습 완료나 예약된 복습 수가 아닙니다.

## 현재 자료

| 순서 | ID / 자료 | 상태 | 구간 / 어휘 / 퀴즈 |
| --- | --- | --- | --- |
| 1 | `voa-welcome` · Welcome! | 확인 완료 | 9 / 5 / 3 |
| 2 | `voa-gym` · Where Is the Gym? | 확인 완료 | 10 / 5 / 3 |
| 3 | `north-wind` · The North Wind and the Sun | 확인 완료 | 7 / 5 / 3 |
| 4 | `peter-rabbit` · The Tale of Peter Rabbit | 확인 완료 | 8 / 5 / 3 |
| 5 | `magi` · The Gift of the Magi | 확인 완료 | 9 / 5 / 3 |
| 6 | `alice` · Down the Rabbit-Hole, 제1장 | 확인 완료 | 8 / 5 / 3 |
| 7 | `hat` · On Running After One’s Hat | 확인 완료 | 8 / 5 / 3 |
| 8 | `cameroon` · In Cameroon, before the scroll, there was the dance floor | 확인 필요 | 0 / 0 / 0 |
| 9 | `casablanca` · As Casablanca’s music scene grows, its musicians struggle | 확인 필요 | 0 / 0 / 0 |
| 10 | `gettysburg-address` · The Gettysburg Address, Bliss Copy | 확인 완료 | 10 / 5 / 3 |

고전 5종은 `src/data/classics.json`, VOA 2종과 연설문은 `voa-lincoln.json`, 현대 기사 후보 2종은 `modern.json`에 있습니다. `library.ts`가 세 배열을 합쳐 `order`로 정렬하고, `verified`만 학습·복습 카드로 구성합니다.

`verified`는 명시한 텍스트 범위의 원문과 이용 조건을 확인했다는 의미입니다. 부속 자료나 다른 판본까지 포괄하지 않습니다. 두 현대 기사는 일반 재게시 정책은 확인했으나 실제 본문을 열지 못해 분리했습니다. 접근 실패를 기사 부재로 단정하지 않습니다.

## 원문과 직접 제작물

실제 타입 정의는 `src/data/types.ts`입니다.

```ts
type Segment = { en: string; ko: string; note: string }
type Word = { term: string; meaning: string; example: string }
type Quiz = {
  question: string; options: string[]; answer: number; explanation: string
}
type Lesson = {
  id: string; order: number; title: string; subtitle: string;
  category: string; level: string; minutes: number;
  author: string; sourceLabel: string; sourceUrl: string;
  licenseName: string; licenseUrl: string;
  status: 'verified' | 'needs-review'; verifiedAt: string;
  verificationNotes: string; rightsScope: string; changes: string;
  originalText: string; segments: Segment[]; vocabulary: Word[];
  quiz: Quiz[]; writingPrompt: string
}
```

| 구분 | 필드 | 작성 원칙 |
| --- | --- | --- |
| 확인한 원문 | `originalText`, `segments[].en` | 지정한 작품·대화·장의 본문과 정확한 발췌. 원문처럼 보이는 대체 문장 생성 금지. |
| 직접 제작 | `segments[].ko/note`, `vocabulary[].meaning/example`, `quiz`, `writingPrompt` | 한국어 번역, 설명, 새 예문, 평가·쓰기 과제. 원 출처의 번역·해설과 구별. |
| 교육 편집 | `subtitle`, `category`, `level`, `minutes`, `vocabulary[].term` | 학습 목적의 분류·선정. 수준과 시간은 추정값. |
| 출처·권리 | `author`, `sourceLabel/Url`, `licenseName/Url`, `rightsScope` | 저자·판본·출처·본문에 적용되는 조건과 이용 범위 기록. |
| 검증·변경 | `status`, `verifiedAt`, `verificationNotes`, `changes` | 확인 근거·날짜·실패 사유·삭제·발췌·번역 등 변경을 기록. |

`quiz.answer`는 0부터 시작하는 선택지 인덱스입니다. `verifiedAt`은 `YYYY-MM-DD`이며 확인 필요 자료에서는 **확인 시도일**입니다. `needs-review`의 본문과 쓰기 과제는 빈 문자열, 교육 배열은 빈 배열, `minutes`는 0으로 유지합니다.

앱 화면은 원문 저자, 출처 링크, 라이선스, 검증 기록, 변경 사항과 학습 자료 제작자를 구별합니다. 음성은 브라우저의 합성 음성이며 원 출처의 녹음이 아닙니다.

## 제목과 문장 자세히 배우기

직접 작성한 확장 해설은 원문 파일을 변경하지 않고 `src/data/guides/`의 `classics-a.json`, `classics-b.json`, `voa-lincoln.json`에 분리합니다. `src/data/guides.ts`가 이를 수업 ID에 연결합니다. 분석 범위는 8개 제목과 선정한 69개 구간이며, 전체 원문의 나머지 문장에 해설을 자동 생성하지 않습니다.

```ts
type LessonGuide = { lessonId: string; title: TextGuide; segments: TextGuide[] }
type TextGuide = {
  text: string; meaning: string;
  kind: 'title' | 'sentence' | 'fragment' | 'dialogue';
  overview: string;
  structure: { text: string; label: string; explanation: string }[];
  chunks: { text: string; meaning: string; role: ChunkRole; label: string }[];
  grammar: { title: string; explanation: string; example: string; translation: string }[];
  words: { text: string; lemma: string; pos: string; meaning: string; note: string }[];
  tip: string;
  check: { question: string; answer: string; hint: string };
}
type ChunkRole = 'subject' | 'verb' | 'object' | 'complement' | 'modifier' | 'connector' | 'other'
```

- `text`는 기존 제목 또는 해당 인덱스의 `segments[].en`과 정확히 일치합니다. 의미 덩어리를 순서대로 공백으로 결합하면 공백 정규화 후 원문과 같아야 합니다. 분석에 제시하는 영어 조각도 원문 안에 있어야 합니다.
- `kind`는 제목, 완전한 문장, 문장 일부, 대사를 구별합니다. 해설에는 생략·도치·고어·화자 표시 등 실제 문맥에 필요한 사항을 직접 적습니다.
- 단어는 구간 내 표기를 대소문자·아포스트로피 정규화 후 한 번씩 등록합니다. 관사·전치사·이름·축약형·하이픈 단어·숫자를 포함합니다. 동일 표기가 여러 역할이면 `note`에 문맥 차이를 설명합니다. `lemma`는 기본형, `meaning`과 `pos`는 해당 구간의 뜻과 역할입니다.
- `structure`, `chunks`, `grammar`, `words`, `check`는 교육 편집자가 직접 작성한 해설입니다. `learning.ts`의 토큰화는 원문 클릭 연결 및 누락 검사에만 사용하며 뜻·품사·구문을 자동 추정하지 않습니다.
- 현재 집계는 해설 77개, 구조 조각 381개, 끊어 읽기 390개, 문법·예문 158쌍, 문맥 단어 960개입니다. 단어 수는 서로 다른 구간에 반복 등장하는 단어를 포함합니다.
- `originalParts`는 전체 원문의 모든 문자를 보존하면서 이미 선정한 구간에만 분석 링크를 연결합니다. 화면에서 그 분석 범위를 알립니다.
- 문법 작성의 별도 참고 근거는 [GRAMMAR_REFERENCES.md](GRAMMAR_REFERENCES.md)에 기록합니다. 참고 사전의 정의·예문은 앱에 복제하지 않았습니다.

## 새로운 자료를 추가할 때

1. 후보의 실제 원문 URL을 열고 저자·판본·채택 범위를 확인합니다. 첨부 설명이나 검색 요약만으로 본문을 작성하지 않습니다.
2. 그 본문에 적용되는 공식 권리 고지를 직접 읽습니다. 상업적 이용, 번역·발췌, 저작자 표시, 추가 제한과 제3자 자산의 예외를 구분합니다. 접근이나 조건이 불명확하면 `needs-review`로 남깁니다.
3. `docs/verification-*.md`에 실제 접근 URL, 날짜, 채택 본문 경계, 권리 근거, 실패·불확실성을 기록합니다. 기존 검증은 다른 판본이나 새 사진·음원에 자동 적용되지 않습니다.
4. 확인된 본문만 `originalText`에 보관하고 정확한 발췌로 `segments[].en`을 만듭니다. 번역·해설·예문·문항은 새로 작성하고 `changes`에 구분합니다. 문장 일부를 구간으로 쓰면 해설에 그 사실을 밝힙니다.
5. 새 `id`와 `order`로 해당 JSON에 추가합니다. 새 파일을 만들었다면 `library.ts`에서 가져옵니다. 화면에서 원문·출처·조건·직접 제작 부분과 확인 필요 자료의 학습 차단을 점검합니다.
6. 제목과 각 학습 구간의 `TextGuide`를 작성합니다. 원문 일치, 끊어 읽기의 의미 단위, 문법 예문, 모든 단어의 문맥 뜻, 회상 연습을 검토합니다. 제목·문장 일부를 완전한 문장으로 설명하지 않습니다.
7. `npm test`와 `npm run build`를 실행합니다. `tests/core.test.ts`는 원문·권리 상태·백업·복습을 검사하고, `tests/learning.test.ts`는 모든 확인 완료 자료의 분석 연결·단어 누락·조립·원문 보존을 검사합니다. 자료 수를 의도적으로 늘렸다면 테스트 기대값과 이 문서의 집계도 함께 갱신합니다. 자동 검사는 언어 설명의 정확성에 대한 직접 검수를 대체하지 않습니다.

저장된 학습 기록은 `${lesson.id}:s:${index}` 또는 `${lesson.id}:w:${index}`를 사용합니다. 배포 후 기존 구간·어휘의 순서를 바꾸면 학습 기록이 다른 카드에 연결될 수 있으므로, 기존 인덱스를 보존하거나 기록 이전을 설계합니다.

확장 카드 ID는 제목 `${lesson.id}:title`, 문맥 단어 `${lesson.id}:g:${section}:w:${index}`입니다. `section`은 `title` 또는 구간의 0부터 시작하는 인덱스입니다. 기존 v2 저장 키·구간·핵심 표현 ID는 유지했으며, 추가된 단어도 배포 이후에는 인덱스를 보존해야 합니다. 카드의 `link`는 `lesson/<id>/<section>`으로 원래 분석 위치를 가리킵니다. 학습 진도 분모는 69개 선정 구간으로 유지됩니다.

개별 검증 근거: [고전 5종](verification-classics.md), [VOA와 연설문](verification-voa-lincoln.md), [현대 기사 후보](verification-modern.md).
