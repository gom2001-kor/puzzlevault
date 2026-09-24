# PuzzleVault 광고 연결 준비 상태

이 변경은 재미와 재방문을 위한 기능, 공유, 광고 연결 경계를 준비합니다. 바이럴 확산이나 광고 수익을 보장하지 않습니다. 현재 브라우저 코드만으로 광고 계정 승인, 광고 재고, 실제 노출 또는 매출을 검증할 수 없습니다.

## 현재 동작

- `AdController`의 보상형/전면 광고는 기본적으로 비활성입니다. 기존 페이지의 AdSense/Auto ads 설정은 별개입니다.
- provider가 연결되지 않은 도움 요청은 무료로 실행됩니다. 광고를 시청했다는 문구나 가짜 전면 화면은 표시하지 않습니다.
- 전면 광고 기회는 세션의 6, 9, 12번째 완료 시점입니다. 최초 3회 보호 뒤 3회마다 기회를 만들며, 실제 광고 노출 간 최소 120초 간격을 적용합니다. 빈 슬롯을 띄우지 않습니다.
- provider가 준비된 보상형 광고는 매번 보상 내용과 광고 1회 시청을 알린 뒤 명시적 동의를 받습니다. 완료 콜백만 보상을 한 번 지급합니다. 닫기, 광고 없음, 오류, 시간 초과는 보상으로 계산하지 않습니다.
- 기존 `refreshBottomAd()` 호출은 아무 작업도 하지 않습니다. 실제 광고 DOM을 삭제하거나 자동 새로고침하지 않습니다. AdSense의 자동 갱신 제한을 60초 타이머만으로 충족한다고 볼 수 없습니다. [Google 광고 배치 정책](https://support.google.com/adsense/answer/1346295?hl=en)

## 실제 공급자 연결

계정과 운영 도메인에서 사용할 광고 제품/자격, 게시자 ID와 광고 설정을 확인한 뒤 연결합니다. 일반 AdSense 스크립트가 있다는 사실은 이 게임의 보상형 광고 통합이 완료됐다는 뜻이 아닙니다. Google을 선택한다면 공식 [Ad Placement 구현 예제](https://developers.google.com/ad-placement/docs/example)에 따라 `adBreak`/`adConfig`를 초기화하고 실제 게임의 음소거/일시정지를 연결해야 합니다. 이 저장소에는 아직 실서비스 provider가 없습니다.

```js
AdController.configure({
    enabled: true,
    provider: gameAdProvider,
    cooldownMs: 120000,
    timeoutMs: 90000
});
```

`gameAdProvider`는 다음 계약을 구현해야 합니다. 모든 광고 요청과 보상 상태는 해당 공급자의 실제 콜백을 기준으로 합니다.

| 메서드/콜백 | 계약 |
| --- | --- |
| `isRewardAvailable()` | 실제 준비 상태를 동기 boolean으로 반환. 무조건 true 금지 |
| `showReward(callbacks)` | 이미 사용자가 이 보상에 동의한 요청. 해당 보상 광고만 시작 |
| `showInterstitial(callbacks)` | 게임이 끝난 자연스러운 전환에서만 요청 |
| `onShown()` | 실제 표시 시작. 타이머/입력을 중지하고 음소거한 뒤 호출 |
| `onComplete()` | 보상 자격을 얻고 광고 흐름이 끝났을 때 호출. 단순 Promise 완료나 광고 로딩 완료로 호출 금지 |
| `onClose()` | 시청 완료가 아닌 닫기. 게임/음소거 상태를 복원 |
| `onNoFill()` / `onError()` | 광고 없음/실패. 게임 상태를 복원 |
| 반환 cleanup 함수 | 시간 초과/오류 시 공급자 요청과 게임의 대기/음소거 상태 정리 |

provider의 SDK 요청이 Promise를 반환하는 경우 rejection은 오류로 처리하지만 resolve는 광고 완료의 증거가 아닙니다. 시간 초과한 요청의 뒤늦은 콜백은 무시합니다. 실제 광고 길이에 맞게 1~180초 범위의 timeout을 정하고, provider가 만료된 요청을 표시하지 않도록 정리해야 합니다.

Google 콜백을 연결할 때 `beforeReward(showAdFn)`는 광고 준비를 알립니다. 그 콜백에서 사용자에게 보상을 제시하고 실제 동의 버튼 동작에 `showAdFn`을 연결해야 합니다. 기존 확인창에서 받은 동의가 오래되거나 비동기 로딩으로 사용자 제스처가 사라졌다면 provider에서 다시 명확한 시청 버튼을 제시하세요. `adViewed`만 시청 완료의 근거이며, `afterAd`에서 게임을 복원하고 `adBreakDone`에서 완료/무광고 상태를 정리합니다. [Google API와 콜백 순서](https://developers.google.com/ad-placement/apis)

각 호출에 실제 보상을 명시하세요. 예: `showRewardAd(revealHint, { rewardLabel: '힌트 1개' })`. 힌트, 재시작, 추가 행동 등 서로 다른 보상을 같은 이름으로 약속하면 안 됩니다. 거절하거나 광고를 닫아도 기본 게임을 계속할 수 있어야 합니다. [Google 보상형 광고 정책](https://support.google.com/adsense/answer/9121589?hl=en)

## 출시 전 확인

1. 공급자의 테스트 광고 모드로 완료/닫기/광고 없음/네트워크 오류/중복 클릭/페이지 이탈을 확인합니다. Google의 `data-adbreak-test="on"`은 테스트 광고와 무광고 시나리오를 제공하며, 실제 계정 설정이나 수익을 검증하지 않습니다. 운영 전 테스트 플래그를 제거합니다. [Google 테스트 모드](https://developers.google.com/ad-placement/docs/test)
2. 기존 광고·분석 태그와 운영 지역/대상에 맞는 개인정보 및 동의 설정을 점검합니다. `enabled: true`는 기술 설정이며 개인정보 동의를 대신하지 않습니다.
3. 모바일 화면에서 광고가 게임 입력·결과·닫기 버튼을 가리지 않는지 확인합니다. 개발·QA에서는 실광고 클릭으로 시험하지 않습니다.
4. `node --test tests/sharing-ads.test.js`는 공유 취소/복사 실패, opt-in, 완료 중복, 무광고, 시간 초과, 첫 광고 경계와 cooldown을 검증합니다. 실제 SDK와 실기기 검증은 별도입니다.

## 측정할 것

7일 단위로 실제 신규 방문, 첫 게임 완료율, 2번째 게임 진입률, 다음날 재방문율, 성공 공유/복사 비율, 도전 링크 유입과 완료율을 먼저 비교합니다. 이후 provider의 실제 노출·광고 완료·수익 보고를 연결해 방문자당 수익과 이탈을 함께 봅니다. 추정 수익은 `실제 노출 수 × 관측 eCPM / 1000`으로 계산하고 관측값이 생기기 전 수익 숫자는 제시하지 않습니다.

`shareResult()`는 성공한 native share 또는 clipboard copy만 `share` 이벤트로 남깁니다. 공유 취소와 PNG 다운로드는 실제 공유로 집계하지 않습니다. 공유 텍스트·URL·사용자 입력은 이 이벤트에 넣지 않습니다. 실제 공유 후 도달이나 수신자의 방문은 브라우저 공유 성공만으로 확인할 수 없습니다.
