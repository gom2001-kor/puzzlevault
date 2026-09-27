# PuzzleVault English

`/learn/english/`에서 실행되는 영어 읽기 학습실과 영어 탐험입니다. 사용자 소유 `study-english2` 프로젝트의 커밋 `45a8dd3`을 바탕으로 통합했으며 원본 앱 화면과 학습 기록은 유지하며, 원본 빌드에는 검증된 콘텐츠 피드 생성 단계만 추가합니다. 한국어 인터페이스와 해설을 제공합니다.

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

정적 결과도 Git에 포함하므로 다른 사람이 사이트를 보기 위해 npm을 설치할 필요는 없습니다. 배포 파일을 만들 때 `apps`, `node_modules`, `.npm-cache`, `.git`, 테스트와 내부 문서는 포함하지 않습니다. 루트에서 `python scripts/package-site.py`를 실행하면 개발 파일을 제외한 `dist/puzzlevault-public.zip`을 만들 수 있습니다. 이 ZIP은 정적 파일 묶음이며 기존 Cloudflare Functions 미들웨어는 CLI 배포 시 저장소의 `functions/`를 함께 사용합니다. 현재 Cloudflare GitHub 연동은 `main` 푸시 뒤 `python3 scripts/package-site.py --directory`를 실행하고 `dist/site`를 자동 배포합니다. 실제 반영은 배포 성공 뒤 확인합니다.

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


## 원본 콘텐츠 자동 연동

원본 `study-english2`를 배포하면 `/puzzlevault-content.json`에 여섯 개 허용 JSON 데이터 파일과 원본 커밋·파일 해시가 공개됩니다. 이 앱은 시작할 때 최대 3.5초 동안 해당 피드를 한 번 확인하고, 스키마·출처·이용 조건 필드·원문/해설 일치·해시·기존 카드 ID를 모두 검사한 뒤 화면을 엽니다. 브라우저 캐시 읽기는 별도로 최대 0.4초입니다. 실제 적용한 자료 버전은 학습실에 표시됩니다.

- 자료 업데이트는 원본 **배포 완료 후 다음 학습실 방문 또는 새로고침** 때 적용됩니다. 학습 중인 화면을 중간에 교체하지 않습니다.
- 정상 피드는 Cache API의 `puzzlevault-english-content-v1`에 보관해 오프라인에서도 이용합니다. 실패·시간 초과·손상·오래된 피드는 적용하지 않으며 마지막 정상 자료 또는 앱에 포함된 자료로 계속 학습합니다.
- 자료 요청은 쿠키·인증·리퍼러를 보내지 않으며, 진도·작성문·녹음·백업을 원본 서버로 보내지 않습니다.
- `scripts/sync-english-content.mjs`는 같은 검증 후 통합 저장소의 허용 데이터 파일만 갱신합니다. Actions가 15분 일정으로 확인하고 테스트·빌드·정적 가이드 생성 후 검증된 변경을 자동 커밋합니다. 예약 실행은 GitHub 사정으로 지연될 수 있습니다.
- 공개 학습 앱은 원본 피드를 직접 받습니다. 검색용 정적 가이드·홈페이지는 Actions가 검증한 커밋을 푸시한 뒤 연결된 Cloudflare Git 배포가 완료되면 갱신됩니다. 예약 실행과 호스팅 대기 시간은 추가될 수 있습니다.

원본 피드가 아직 배포되지 않아 404 또는 HTML 대체 응답을 주면 예약 작업은 `awaiting_source_deployment`로 정상 종료하고 현재 데이터를 보존합니다. 피드의 구조·해시·권리 표시 검증 실패는 오류로 처리합니다.

```powershell
# 공개 원본 피드를 검사만 하기
node --experimental-strip-types scripts/sync-english-content.mjs --check
# 같은 컴퓨터의 원본 저장소에서 커밋된 최신 학습 자료를 가져오기
node --experimental-strip-types scripts/sync-english-content.mjs --source C:\dev\study-english2
```

위 명령은 PuzzleVault 저장소 루트에서 실행합니다. 자세한 갱신·배포·실패 복구 절차는 [콘텐츠 연동 안내](../../docs/ENGLISH_CONTENT_SYNC.md)에 있습니다.
