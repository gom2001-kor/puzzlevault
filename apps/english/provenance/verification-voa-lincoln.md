# VOA / Lincoln 콘텐츠 검증 기록

검증일: 2026-09-27<br>
담당 파일: `src/data/voa-lincoln.json`<br>
검증 방법: 원문 URL과 그 본문에 적용되는 권리 고지를 web 도구로 직접 열어 읽고, 실제 공개된 영어 문장과 저장할 문장을 대조했다. 첨부 문서의 권리 설명만으로 판정하지 않았다.

## 공통 적용 범위

- `originalText`와 `segments[].en`은 확인한 영어 원문이다.
- `segments[].ko`, `segments[].note`, `vocabulary`의 뜻과 예문, `quiz`, `writingPrompt`는 이번 앱용으로 직접 작성한 교육 콘텐츠다. 출처 사이트의 기존 번역·단어 설명·퀴즈를 복제하지 않았다.
- `sourceUrl`, `sourceLabel`, `licenseUrl`, `rightsScope`, `changes`는 앱의 출처/이용 조건 화면에 표시할 데이터다.
- 외부 사진, 로고, 기존 녹음, 동영상은 수록하지 않는다. 브라우저 음성 합성을 제공할 경우 원 출처 녹음과 구분해야 한다.
- verified는 아래 명시된 **텍스트 범위**의 본문 및 공개 이용 조건을 확인했다는 뜻이다. 모든 국가의 추가 권리 문제까지 포괄하는 보증은 아니다.

## 1. Welcome!

- 본문: [VOA Lesson 1: Welcome!](https://learningenglish.voanews.com/a/lets-learn-english-lesson-one/3111026.html)
- 정책: [VOA Terms of Use and Privacy Note](https://learningenglish.voanews.com/p/6021.html)
- 상태: **verified**
- 확인한 부분: Conversation 섹션, Pete의 첫 인사부터 Anna의 마지막 아파트 반응까지 9개 발화.
- 직접 확인한 게시 정보: 본문 페이지 표시 날짜 2019-09-10. Conversation은 VOA 제작으로 표시되어 있고 이 대본에는 별도 제3자 권리 표기가 없다.
- 이용 조건 근거: 정책 Copyright Statement는 전적으로 VOA가 만든 텍스트·오디오·영상을 public domain으로 분류한다. VOA 출처를 표시하도록 하며 제3자 라이선스 자료는 해당하지 않는다고 구분한다. 상표는 별도 제한을 받는다.
- 상업적 이용 판단: 전적으로 VOA가 제작한 대화 텍스트에 관한 public domain 명시에는 비상업 전용 제한이 없다. 대본만 사용하고, VOA 이름은 출처 표시로 사용한다. VOA 로고나 공식 제휴·보증 표현은 사용하지 않는다.
- 변경: 원문 철자와 구두점 유지, 줄바꿈 정리, 직접 번역·해설·어휘 예문·퀴즈 추가.
- 원본 오타/표현을 임의로 고치지 않음: `"Anna" Is that A-N-A?`의 대문자 I, 마지막 철자 설명의 원래 표기 유지.

## 2. Where Is the Gym?

- 본문: [VOA Lesson 6: Where Is the Gym?](https://learningenglish.voanews.com/a/lets-learn-english-lesson-6-where-is-the-gym/3225958.html)
- 정책: [VOA Terms of Use and Privacy Note](https://learningenglish.voanews.com/p/6021.html)
- 상태: **verified**
- 확인한 부분: Conversation 전체. 도입부터 Anna의 마지막 거절까지 무대 지문을 포함한다. `originalText`에는 전체, `segments`에는 정확한 대화행 10개 발췌.
- 직접 확인한 게시 정보: 본문 페이지 표시 날짜 2018-10-12. 대화 제작자는 VOA로 표시되고 대본에는 별도 제3자 권리 표기가 없다.
- 이용 조건과 상업적 이용 판단: Lesson 1과 같은 공식 VOA 정책의 자체 제작 텍스트 public domain 범위가 적용된다. 출처를 표시하고 제3자 자료 및 상표 사용 권한과 혼동하지 않는다.
- 변경: 원문 철자와 구두점 유지, 줄바꿈 정리, 학습용 발췌. 한국어 번역·해설·예문·퀴즈는 신규 작성.
- 학습 주의: 마지막 `I’m good.`은 이 장면에서는 운동하자는 제안을 사양하는 말이다. 일반적인 건강/능력 진술로만 번역하지 않았다.

## 10. The Gettysburg Address — Bliss Copy

- 본문 및 권리 고지: [Abraham Lincoln Online](https://www.abrahamlincolnonline.org/lincoln/speeches/gettysburg.htm)
- 상태: **verified**
- 확인한 부분: Bliss Copy 제목 아래의 3개 원문 단락만. 다른 사본의 문구를 섞지 않았다.
- 권리 근거: 같은 페이지 하단은 Lincoln 연설문을 public domain으로 명시한다. 반면 페이지 구성·나머지 설명문·사진은 Abraham Lincoln Online 저작권 보호 대상으로 구분한다.
- 상업적 이용 판단: 공개 도메인으로 명시된 Lincoln 연설문 자체에는 별도 비상업 전용 제한이 없다. 이번 데이터는 연설문에 한정된다. 현대 편집 설명과 사진을 사용하지 않는다.
- 원전 표시: 원문 페이지는 전체 사본의 출전을 Roy P. Basler 등이 편집한 Collected Works of Abraham Lincoln으로 표시한다. 앱은 실제 확인한 전사 출처인 Abraham Lincoln Online와 판본 Bliss Copy를 함께 표시한다.
- 변경: 10문장 학습 단위 분리, 직접 번역·해설·어휘 예문·퀴즈 추가. `can not`, `battle-field`, `--` 등 확인한 전사 표기를 유지했다. 문단을 나눈 것 외에 영어 문장을 현대화하지 않았다.
- 학습 내용: score = 20이라는 수 표현, 관계절, 반복 및 병렬 구조에 초점을 둔다.

## 검증의 한계와 갱신

- 이번 검증은 위 URL에서 2026-09-27에 확인한 상태를 기록한 것이다. 페이지나 정책이 변경될 수 있으므로 배포 전후 권리 정책 변경을 점검할 수 있도록 URL과 날짜를 보존한다.
- 이용 조건은 원문 텍스트에만 적용된다. 이후 이미지, 영상, 외부 오디오, 현대 번역이나 삽화를 추가하면 그 자산별로 별도 검증이 필요하다.
- 이 세 자료에서는 본문 접근 실패나 텍스트 이용 조건의 불명확성이 발견되지 않았다. 그래서 임의의 대체 본문이나 확인 필요용 가상 콘텐츠는 만들지 않았다.
