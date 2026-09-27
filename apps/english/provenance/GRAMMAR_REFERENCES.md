# 문법 해설 작성 및 참고 근거

확인일: 2026-09-27

## 직접 작성한 부분과 외부 참고의 구분

앱의 한국어 번역, 구문 분석, 쉬운 문법 설명, 끊어읽기 뜻, 단어의 문맥 뜻, 연습 예문, 미니 확인 문항은 이번 앱을 위해 직접 작성했다. 원문 영어는 기존 콘텐츠 데이터에 있는 확인된 텍스트를 그대로 사용하며, 새 해설은 `src/data/guides/`에 분리했다.

아래 자료는 애매할 수 있는 문법·용법의 정확성을 확인하기 위해 직접 열람한 참고 근거다. 사전의 정의 문장·설명문·예문을 앱에 복제한 것이 아니며, 사전 자체의 이용 권리가 원문 학습 자료나 이 앱에 일괄 적용되는 것도 아니다. 학습 예문은 새로 작성했다.

## VOA / Gettysburg 해설의 특별 검수 항목

| 검수 항목 | 확인한 문법·용법 | 직접 열람한 근거 |
| --- | --- | --- |
| `We are met` | 일부 자동사는 옛 영어에서 be + 과거분사로 완료를 나타냈다. 이 연설의 표현은 “모였다, 모여 있다”로 설명하며 현대의 일반 수동태로 오해하지 않도록 했다. | [Merriam-Webster: be — auxiliary verb 3](https://www.merriam-webster.com/dictionary/be) |
| 평가 뒤의 `should` | should는 단순한 의무 외에도 평가·반응을 담은 that절에 쓰인다. “It is ... fitting and proper that we should do this”를 무조건 강한 명령으로 옮기지 않았다. | [Cambridge: Should](https://dictionary.cambridge.org/grammar/british-grammar/should), [Cambridge: natural — expected](https://dictionary.cambridge.org/us/dictionary/english/natural) |
| `shall not have died` | will/shall + have + 과거분사의 형태를 확인했다. 문맥상 이미 일어난 희생이 결국 헛되지 않게 하겠다는 결의를 설명하며, 죽음 자체가 일어나지 않았다는 부정으로 풀이하지 않았다. | [Cambridge: future perfect](https://dictionary.cambridge.org/us/dictionary/english/future-perfect) |
| 연설의 `shall` | shall에는 미래뿐 아니라 결의를 나타내는 용법이 있다. 연설의 다짐을 단순한 일정 예측으로 축소하지 않았다. | [Merriam-Webster: shall — auxiliary verb 2](https://www.merriam-webster.com/dictionary/shall) |
| `will little note` | little은 형용사 외에 적은 정도나 부정에 가까운 정도를 나타내는 부사로도 쓰인다. 여기서는 note를 꾸미는 “거의 주목하지 않다”로 설명했다. | [Merriam-Webster: little — adverb](https://www.merriam-webster.com/dictionary/little) |
| `these honored dead` | dead가 사람들을 가리키는 명사적 표현이라는 원문 문맥을 유지했다. 추상적인 “명예로운 죽음들” 대신 “명예롭게 기리는 이 전사자들”로 풀이했다. | [확인된 Bliss Copy 원문](https://www.abrahamlincolnonline.org/lincoln/speeches/gettysburg.htm) |

## 해설의 범위

입문자가 문장 뼈대를 찾는 것을 돕기 위해 설명을 간단하게 썼다. 예를 들어 격식체·고어를 현대식 일반 규칙과 구별하고, `that`, `to`, `for`, `have`처럼 같은 철자가 다른 역할을 맡는 경우에는 해당 문장의 역할을 단어 주석과 구문 분석에 적었다. 제목이나 생략된 대사를 완전한 주어·동사 문장으로 억지로 분석하지 않았다.

VOA 대사의 콜론 앞 이름은 화자 표시로 따로 설명했다. 이름·관사·전치사·축약형·알파벳 철자와 숫자도 단어 목록 검수에 포함했다. 단어 토큰 추출은 누락 확인용이며 품사나 뜻을 자동 추정하는 데 사용하지 않았다.

원문과 청크 결합의 일치, 구문 분석 조각의 원문 포함 여부, 원문 토큰의 단어 목록 누락 여부는 별도로 검사했다. 이러한 구조 검사는 문법적 정확성 자체를 보증하지 않으므로 직접 읽는 검수와 함께 사용했다.
