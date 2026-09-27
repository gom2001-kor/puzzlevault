# PuzzleVault English

`/learn/english/`에서 실행되는 영어 읽기 학습실과 영어 탐험입니다. 사용자 소유 `study-english2` 프로젝트의 커밋 `45a8dd3`을 바탕으로 통합했으며 원본 저장소는 수정하지 않습니다. 한국어 인터페이스와 해설을 제공합니다.

PuzzleVault 본체는 기존 정적 HTML/JavaScript 구조를 유지합니다. 이 모듈은 기존 읽기 앱의 React/TypeScript 구조와 검증한 학습 데이터를 보존하고, 빌드된 정적 파일만 본 사이트에서 실행합니다.

## 개발과 빌드

Node.js 24에서 다음을 실행합니다.

```powershell
cd apps/english
npm ci
npm test
npm run build
```

- 소스: `apps/english/src`
- 공개 결과: `learn/english/`
- 빌드 후 `scripts/sync-english-assets.cjs`가 서비스 워커에 실제 번들 파일명을 갱신합니다.
- 사이트 루트에서 `python -m http.server 8765 --bind 127.0.0.1`로 실행하면 `http://127.0.0.1:8765/learn/english/`에서 확인할 수 있습니다.
- `npm run dev`는 5175 포트에서 이 모듈만 실행합니다. 홈으로 돌아가기, 공유 서비스 워커와 정책 링크는 위의 통합 미리보기에서 검사하세요.

정적 결과도 Git에 포함하므로 다른 사람이 사이트를 보기 위해 npm을 설치할 필요는 없습니다. 배포 파일을 만들 때 `apps`, `node_modules`, `.npm-cache`, `.git`, 테스트와 내부 문서는 포함하지 않습니다. 루트에서 `python scripts/package-site.py`를 실행하면 개발 파일을 제외한 `dist/puzzlevault-public.zip`을 만들 수 있습니다. 이 ZIP은 정적 파일 묶음이며 기존 Cloudflare Functions 미들웨어는 CLI 배포 시 저장소의 `functions/`를 함께 사용합니다. 공개 사이트 배포는 Git 푸시와 별도입니다.

## 저장과 기존 기록 이전

- 읽기·복습·글쓰기·음성 설정: `pv_english_reading_v2`
- 영어 탐험 기록과 학습 XP: `pv_english_quest_v1`
- 기존 12개 게임의 기록 및 게임 XP와 분리됩니다.
- 원래 사이트 설정에서 v2 JSON 백업을 받은 후 통합 앱 설정에서 미리보기를 확인하고 복원합니다. 서로 다른 도메인의 기록은 자동으로 이동하지 않습니다.
- 카드 ID, 자료 순서, v2 백업 앱 식별자와 데이터 검증 규칙을 유지합니다. 영어 탐험은 기존 읽기 백업과 별도 기록입니다.
- 마이크 녹음은 사용자의 버튼 입력으로만 시작하고 화면 메모리에만 보관합니다. 최대 60초이며 화면 이동 시 해제합니다. 서버 전송·백업 저장을 하지 않습니다.

## 콘텐츠와 라이선스

확인 완료 자료 8편과 선정 구간 69개를 유지합니다. 확인 필요 자료 2편은 학습·탐험에서 제외합니다. 원문, 한국어 해설, 저자, 출처, 이용 조건을 별도 필드로 관리합니다. 자료별 검증 기록은 `provenance/`에 있습니다. 그 안의 원본 README는 통합 전 앱의 기록이며 현재 경로와 기능은 이 문서를 기준으로 합니다.

React, ReactDOM, Scheduler, Lucide의 고지는 `public/THIRD-PARTY-NOTICES.txt`에 보존하며 공개 빌드에도 포함합니다. 원본의 Google Fonts 요청은 제거했으며, 텍스트 학습에는 외부 API 키가 필요하지 않습니다. 음성은 브라우저·OS 합성 기능으로 일부 음성은 네트워크가 필요합니다.

## 브라우저 회귀 검사

먼저 통합 빌드와 사이트 서버를 준비합니다. Playwright가 설치된 검증 환경에서:

```powershell
$env:PLAYWRIGHT_PATH = '설치된 Playwright 패키지 경로'
$env:BASE_URL = 'http://127.0.0.1:8765/learn/english/'
node tests/browser-check.mjs
node tests/learning-browser-check.mjs
```

기존 읽기·퀴즈·작문·복습·백업·구문 분석·음성 순서 검사에 새 탐험 규칙의 테스트를 더합니다. 통제된 합성 이벤트는 실제 음질이나 실제 마이크 장치 검사와 구분합니다.
