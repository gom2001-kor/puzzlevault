# 고전 콘텐츠 원문·상업적 이용 조건 검증

검증일: 2026-09-27. 대상 파일: `src/data/classics.json`.

첨부 마크다운은 후보 목록으로만 사용했다. 아래 5개 원문 URL, 각각의 도서 메타데이터, 실제 전자책 헤더·본문, 배포 정책 및 한국의 공식 보호기간 안내에 새로 접속하여 대조했다. 전자책 카탈로그의 자동 생성 줄거리나 첨부 파일의 설명을 원문으로 사용하지 않았다.

## 판정과 범위

5개 모두 `verified`이다. 이 상태는 지정한 영문 문학본문에 대해 접근·출처·상업 이용 근거를 확인했다는 뜻이다. 전 세계 서비스에 대한 권리 보증이나 모든 부속 자료의 이용 허락을 뜻하지 않는다.

미국은 각 카탈로그의 `Public domain in the USA` 표시 및 저작권자 허락으로 제공되는 제한 저작물이라는 별도 고지가 없음을 확인했다. 한국은 각 저자 또는 지정 영어 번역자의 사망연도를 메타데이터에서 확인하고 공식 안내의 사망 다음 해부터 70년이라는 일반 기준을 적용했을 때, 모두 2026년 이전에 보호기간이 경과한다는 판단이다. 특히 이솝우화는 고대 원작만 보지 않고 이 판본의 영어 번역자 Townsend(1900년 사망)를 기준으로 검토했다. 다른 국가의 특칙 및 현대 각색·번역·상표는 이 판단에 포함되지 않는다.

한국 기준: [법제처 찾기쉬운 생활법령정보 — 저작권 보호기간 만료](https://m.easylaw.go.kr/MOB/CsmInfoRetrieve.laf?ccfNo=3&cciNo=2&cnpClsNo=1&csmSeq=695). 단독저작물 사망 다음 해 기산, 70년 표와 저작권법 제39~41조 연결을 확인했다.

## 상업적 이용과 상표를 구분한 구현

[Project Gutenberg License](https://www.gutenberg.org/policy/license.html)의 기초 텍스트와 상표·라이선스 구별, 1.C 및 해외 이용에 관한 1.D를 확인했다. 본문에서 배포용 헤더·푸터·상표 표기를 제거한 문학 텍스트를 이용했다. 상표가 붙은 전자책을 그대로 유료 재배포하는 경우의 별도 조건(1.E.8/1.E.9)은 이 앱의 콘텐츠 포장 방식으로 채택하지 않았다.

[Permission How-to](https://www.gutenberg.org/policy/permission.html)의 Most permissions not needed, Crediting, Linking, Quotes and extracts, US only를 확인했다. 미국 공개영역 본문의 상업적 재사용·가공과 참고자료 출처 표시는 허용된다는 설명이 있다. 정책은 참고자료·감사의 글에서 링크와 함께 수집처를 밝히는 행위와 상표를 상품명·홍보에 내세우는 행위를 구별한다.

따라서 `sourceLabel`은 **별도 출처/참고자료 영역에만 표시**하고 앱 이름, 상품명, 수업 홍보 배지에 사용하지 않는다. `sourceUrl`은 정책의 권장에 맞춰 안정적인 도서 소개 페이지를 가리킨다. 실제 수집한 본문 URL은 아래 기록한다. 원문 저자와 작품명, 원문 범위, 확인일, 보호기간 판단의 지역 범위, 변경 사항을 함께 표시해야 한다. 이 출처 표시가 해당 단체의 후원이나 제휴를 의미하는 것은 아니다.

## 작품별 기록

| ID | 채택한 문학본문 | 저자·번역자 사망연도 | 메타데이터 | 실제 수집·대조한 HTML |
|---|---|---:|---|---|
| north-wind | The North Wind and the Sun 우화와 교훈 전체 | George Fyler Townsend 1900 | [#21](https://www.gutenberg.org/ebooks/21) | [원문](https://www.gutenberg.org/cache/epub/21/pg21-images.html) |
| peter-rabbit | The Tale of Peter Rabbit 영문 이야기 전체 | Beatrix Potter 1943 | [#14838](https://www.gutenberg.org/ebooks/14838) | [원문](https://www.gutenberg.org/cache/epub/14838/pg14838-images.html) |
| magi | The Gift of the Magi 단편 전체 | O. Henry 1910 | [#7256](https://www.gutenberg.org/ebooks/7256) | [원문](https://www.gutenberg.org/cache/epub/7256/pg7256-images.html) |
| alice | Alice’s Adventures in Wonderland 제1장 Down the Rabbit-Hole 전체 | Lewis Carroll 1898 | [#11](https://www.gutenberg.org/ebooks/11) | [원문](https://www.gutenberg.org/cache/epub/11/pg11-images.html) |
| hat | All Things Considered 중 On Running After One’s Hat 에세이 전체 | G. K. Chesterton 1936 | [#11505](https://www.gutenberg.org/ebooks/11505) | [원문](https://www.gutenberg.org/cache/epub/11505/pg11505-images.html) |

각 실제 본문을 웹 열람 도구로 접속하고 HTTP로 내려받아 추출했다. 일부 HTTP 연결은 시간 초과가 있었지만 재시도 후 5종 모두 정상 수집했다. 실패한 응답을 대체하기 위해 기억에 의존하여 원문을 작성한 사례는 없다.

### 추출 경계

- **north-wind**: `The North Wind and the Sun` 제목 다음의 본문에서 `Persuasion is better than Force.`까지. 다음 우화 `The Crow and Mercury`는 제외. 128단어. 원문은 5문장이므로 임의로 문장을 늘리지 않고 긴 두 문장을 의미 단위로 나눠 7개 수업 구간을 구성했다. 구간 해설에서 문장 앞·중간·뒷부분임을 명시했다.
- **peter-rabbit**: `Once upon a time`부터 마지막 저녁 식사 문단까지. 948단어. 표제지, 출판사 표기, 삽화, 말미 `THE END` 표시는 제외. 토끼 이름을 개행으로 열거한 부분은 같은 단어를 한 줄로 연결했다.
- **magi**: `One dollar and eighty-seven cents.`부터 `They are the magi.`까지. 2,057단어. 작가 이름 표제와 배포 안내는 제외. 수업 발췌는 도입부로 제한하여 읽기 전 예측 과제가 결말을 먼저 알려주지 않도록 했다. 전체 읽기에는 결말이 있다.
- **alice**: 제1장 첫 문장 `Alice was beginning`부터 `very soon finished off the cake.`까지. 2,141단어. 제2장은 제외. 별표로 된 장식 구분선은 제외. 첫 문장의 세 구간 분할을 해설에서 명시했다.
- **hat**: `I feel an almost savage envy`부터 `water is good with everything except wine.`까지. 1,327단어. 다음 에세이 `THE VOTE AND THE HOUSE`는 제외. 홍수에 대한 글쓴이의 과장과 시대적 관점은 원문 그대로이며 현대의 재난 안전 조언으로 작성된 글이 아니다. 수업은 관점과 논증 분석에 초점을 두었다.

단어 수는 저장된 문자열을 공백 기준으로 나눈 수이며 언어학적 토큰 수와 다를 수 있다.

## 원문과 직접 제작물의 분리

- `originalText`: 확인된 영문 문학본문. HTML 제거, 공백·개행 정리 외에는 현대 영어로 개작하지 않음.
- `segments[].en`: `originalText`에 그대로 존재하는 발췌. 일부는 문장 내 의미 단위이며 생략 구간을 새 문장처럼 이어 붙이지 않음.
- `segments[].ko`, `segments[].note`: 이 앱을 위해 직접 작성한 한국어 번역과 구문·독해 해설.
- `vocabulary`: 학습 어휘의 뜻과 직접 만든 예문. 예문은 원작의 인용이라고 표시하지 않음.
- `quiz`, `writingPrompt`: 직접 제작한 평가 문항과 작문 과제. 난이도 및 소요 시간은 편집상 추정이며 공인 CEFR 인증값이 아님.
- `sourceLabel`, `sourceUrl`, `licenseName`, `licenseUrl`, `verificationNotes`, `rightsScope`, `changes`: 서지 출처, 법적 근거, 적용 범위, 변경 사항을 각각 관리.

삽화·캐릭터 디자인·녹음 음성·현대 번역·현대 각색의 대사는 가져오지 않았다. Peter Rabbit의 현대 브랜드 및 Alice의 현대 영상물과 연결된 권리는 이 고전 영문본문의 권리 상태와 별개다. 직접 추가한 학습 자료가 기초 원문의 공개영역 지위를 독점적 권리로 바꾸지는 않는다.

## 저장본 무결성 및 검증

모든 발췌에 대해 `segment.en in originalText`를 생성 단계에서 검사했다. 5종 모두 원문에 배포용 헤더·푸터·상표 문자열이 남아 있지 않은지 확인했다. 한국어 문자열의 인코딩, 각 5개 어휘 및 3개 퀴즈와 정답 범위도 검사한다.

저장된 `originalText`를 UTF-8로 인코딩한 SHA-256:

| ID | SHA-256 |
|---|---|
| north-wind | `e532b4726065d7aed406c04b7aad8fb1c04391768a62dabf7027e683b31e0962` |
| peter-rabbit | `149f5be0e6a7a06fcdc147db54a58f7063816d1853f6057501f7c71c782b7aba` |
| magi | `12f6e34da76e3b2235e71ed792b6d76b498e0253a39d70a668887c9c753e92e3` |
| alice | `e82b4637718db534fe243dc6e9f30657df9465f1e307c17fdd98624bf40c9e26` |
| hat | `3b9882980796f9f0682885a0f7f0852c66a5a7ecdf11e114f61ace8cdad3a7d4` |

현재 5종 중 `needs-review` 항목은 없다. 다른 원문·판본으로 교체하거나 별도의 사진·음원·현대 번역을 추가하면 이 검증이 자동으로 승계되지 않으며 해당 자료를 새로 확인해야 한다.
