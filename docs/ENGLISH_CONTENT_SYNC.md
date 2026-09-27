# 영어 콘텐츠 연동과 공개 배포

## 실제 갱신 경로

1. `study-english2`의 허용 JSON 자료를 편집하고 원문·이용 조건을 검토한다.
2. 원본 자료 변경을 커밋한 뒤 Node.js 24에서 `npm test`, `npm run build`를 실행한다. 원본 앱 화면은 유지되며 빌드 마지막에 `dist/puzzlevault-content.json`과 CORS 응답 헤더가 생성된다. 자료를 커밋하지 않은 상태의 피드는 내보내지 않는다.
3. 원본 `main`에 푸시하면 연결된 Cloudflare Pages가 `npm run build`를 실행해 `dist`를 배포한다. 수동 배포 시에도 동일한 `dist`를 기존 `study-english2` 프로젝트에 업로드한다. 원본 콘텐츠 피드가 HTTP 200, `application/json`, `Access-Control-Allow-Origin: *`로 제공되어야 한다.
4. PuzzleVault 학습실은 다음 진입/새로고침에서 공개 피드를 한 번 검증하고 적용한다. 페이지를 열어 둔 동안에는 교재와 문제를 바꾸지 않는다. 읽기·복습·쓰기 기록은 전송하지 않는다.
5. PuzzleVault의 `Sync verified English content` Actions는 15분 일정과 수동 실행을 지원한다. 공개 피드 변경이 있을 때만 가져오기 → 학습 테스트 → 빌드/정적 가이드 생성 → 사이트 검사 → Git 커밋/푸시를 실행한다. 변경된 공개 ZIP은 Actions 아티팩트에 14일 보관한다.
6. PuzzleVault도 GitHub 자동 배포가 연결돼 있다. 검증된 콘텐츠 커밋이 `main`에 올라오면 Cloudflare가 `python3 scripts/package-site.py --directory`로 공개 파일만 `dist/site`에 모아 배포한다. 정적 가이드·홈페이지의 실제 반영은 Actions와 Cloudflare 작업 완료 뒤 이뤄진다.

Actions 일정은 GitHub 큐에 의해 지연될 수 있다. 콘텐츠 제공자의 실제 배포와 사이트 방문 시점을 기준으로 설명하며, 실시간 푸시 알림·학습 중 교체를 약속하지 않는다.

## 검증 범위와 기록 보호

허용 파일은 `classics.json`, `voa-lincoln.json`, `modern.json`, `guides/classics-a.json`, `guides/classics-b.json`, `guides/voa-lincoln.json`뿐이다. 소스 코드, 실행 스크립트, HTML, API 키, 원본 앱 설정은 피드로 가져오지 않는다. 새 자료는 이 파일의 배열에 추가할 수 있다.

- 최대 3 MiB의 JSON, 지원 스키마 버전과 고정 원본 저장소 식별자만 허용한다.
- 원본 커밋, 실제 커밋 시각, 파일별 SHA-256, 전체 콘텐츠 해시, 확인 완료 자료/구간 수를 확인한다. 해시는 전송 내용의 일치 검사이며 독립된 저작권 심사를 대신하지 않는다.
- 원문과 선정 구간, 청크 재결합, 제목/구간 해설, 문맥 단어, 퀴즈, 출처·저자·이용 범위·수정 내역을 검사한다.
- `needs-review`는 빈 학습 자료로 격리한다. 명시적 비상업용/변경금지 라이선스는 거부한다. 새 자료에 대한 실제 원문 및 상업적 이용·번역 권리 검토는 편집자가 수행해야 한다.
- 기존 lesson ID, 문장·어휘·문맥 단어의 인덱스, 제목, 퀴즈의 문항·선택지·정답, 청크 영문 순서를 변경하면 자동 가져오기를 중단한다. 의미가 달라진 카드를 이전 학습 완료 기록에 덮어쓰지 않도록 수동 마이그레이션을 먼저 설계한다. 번역·해설·예문 수정 및 새 자료/문항의 추가는 가능하다.

정상 피드는 브라우저 Cache API에 보관한다. 읽기는 최대 0.4초, 네트워크/파싱/검증은 최대 3.5초로 제한한다. 캐시 쓰기는 화면 시작을 막지 않는다. 네트워크 실패·잘못된 피드·오프라인에서는 저장된 정상 판본, 없으면 앱에 포함된 판본을 연다.

## 운영 명령

PuzzleVault 저장소 루트, Node.js 24:

```powershell
node --experimental-strip-types scripts/sync-english-content.mjs --check
node --experimental-strip-types scripts/sync-english-content.mjs
node --experimental-strip-types scripts/sync-english-content.mjs --source C:\dev\study-english2
node --experimental-strip-types scripts/sync-english-content.mjs --feed C:\path\puzzlevault-content.json --check
cd apps/english
npm test
npm run build
```

`--source`는 원본 작업 폴더의 미커밋 내용을 가져오지 않는다. `--check`는 파일을 쓰지 않는다. `--if-available`은 원본 피드 배포 전의 404/HTML 대체 응답만 정상 대기로 처리하며 검증 실패를 숨기지 않는다.

## 계정과 배포 전제

두 저장소는 비공개이며 기존 Actions 공유 비밀값은 없었다. 이 연동은 공개된 학습 콘텐츠 JSON만 사용하므로 cross-repository 토큰이나 새 비밀값을 저장하지 않는다. 원본 JSON의 공개 범위는 이미 학습 앱에서 공개하는 원문·직접 제작 학습 데이터와 동일하다.

2026-09-28 사용자가 Cloudflare OAuth 인증을 완료했다. 계정에서 두 사이트의 GitHub `main` 자동 배포가 활성화된 것을 확인했으며, PuzzleVault의 빌드 명령과 출력 디렉터리를 공개 파일 전용으로 설정했다. 공개 피드가 일시적으로 없는 동안 Actions는 `awaiting_source_deployment`를 보고하고 앱은 포함 자료로 정상 동작한다. 인증 토큰이나 비밀값은 저장소·Actions에 복사하지 않았다.

새 수업이나 선택지 변경으로 탐험 문제 은행이 달라지면 진행 중 코스는 안내 후 종료한다. 이미 얻은 XP와 최고 기록, 읽기·복습·쓰기 기록은 보존하며 새 코스 저장을 막지 않는다. 같은 날짜에 다시 완료해도 XP는 중복 지급하지 않는다.
