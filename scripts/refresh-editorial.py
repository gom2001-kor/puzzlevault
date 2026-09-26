"""Maintain the site's static, crawlable support pages (no runtime/build dependency)."""
from pathlib import Path
import html
import re

ROOT = Path(__file__).resolve().parents[1]
DATE = '2026-09-26'
FORM = 'https://forms.gle/NBjCNdVCBGaGGcbM9'
COPY = {
    'en': {
        'updated': 'Updated', 'privacy': 'Privacy policy', 'about': 'About PuzzleVault', 'contact': 'Contact & feedback', 'terms': 'Terms of use',
        'settings': 'Change privacy choices', 'form': 'Open the feedback form', 'games': 'Explore all ten games',
        'aboutSections': [
            ('A small collection made for playing', 'PuzzleVault is a browser-game project with ten puzzles based on numbers, patterns, colors and spatial decisions. You can start a game without creating an account or installing an app. The project combines original interfaces and implementations of familiar puzzle principles with daily goals and local progress.'),
            ('Choose your kind of challenge', 'NumVault asks you to deduce a hidden code. PatternPop tests recall of a displayed sequence. QuickCalc offers timed arithmetic, including a 30-second friend challenge. GridSmash, MergeChain and HexMatch reward careful placement and combinations. SortStack, TileTurn, ColorFlow and PipeLink offer step-by-step spatial puzzles. Each game page explains its rules, controls and available modes.'),
            ('Records that belong to your browser', 'Finished rounds earn experience toward local levels and badges. Three daily missions reset at midnight UTC. Your scores, settings and progress are stored in this browser; they are not an online account or a verified public leaderboard. Clearing site data, switching browsers or using another device may start a separate record.'),
            ('A fair invitation to a friend', 'QuickCalc challenge links preserve the question seed and a self-reported target score. Players get the same question sequence and answer positions, with a 30-second limit and a three-second penalty for a wrong answer. The challenge does not allow time bonuses or hints. Replaying a course is practice, and shared scores are not independently verified.'),
            ('How the games are presented', 'The games use HTML, CSS, Canvas and browser audio. Raised tiles, shaded pieces and animated feedback make actions easier to see. These are dimensional visuals on puzzle boards, not a promise of a full 3D world. Reduced-motion preferences limit decorative effects. Loading speed and smoothness depend on the device and browser.'),
            ('Editorial care and feedback', 'Guides explain the games that are actually available. Tips are suggestions for play, not medical or educational guarantees. We revise material when mechanics change or an error is reported. Use the contact page to report a broken level, confusing control, accessibility issue or incorrect article. Reports should identify the game, mode and steps needed to reproduce the issue.'),
            ('Keeping the project available', 'Games are free to access. Advertising may help support the project when an approved advertising setup is active. Optional analytics is off until allowed through the privacy controls. Game access does not depend on clicking an advertisement. Privacy details and the external feedback service are described on the linked pages below.')
        ],
        'privacySections': [
            ('Scope and hosting', 'This notice explains the browser-game site at puzzlevault.pages.dev. No account is required to play. The hosting provider, Cloudflare, necessarily handles network requests such as IP address, requested URL and browser information to deliver and protect the site. This is different from the game progress stored on your device.'),
            ('Local game data and preferences', 'Keys beginning with pv_ store scores, experience, missions, streaks, sound, language and privacy choices. Session storage may hold temporary hints or game-session counters. The pv_lang cookie remembers language preference. The service worker caches public game assets for offline use. Game saves are not synced to an account; clearing site data can permanently remove them.'),
            ('Optional Google Analytics', 'Google Analytics is off by default. If you allow analytics in Privacy choices, it can receive page visits, device/browser information and game events such as a completed round or a successful share. A share event does not contain the shared message or challenge URL. Google may set analytics cookies such as _ga. Refusing optional analytics does not restrict games. Microsoft Clarity session recording is not loaded by the current site.'),
            ('Changing your choice', 'Use Privacy choices in the footer or the button below. Permission changes take effect on the next page so a live round is not restarted. Revoking analytics permission disables subsequent Google Analytics collection on this page and removes accessible first-party analytics cookies. It cannot undo data already sent. Where storage is blocked, the choice lasts only for the current page.'),
            ('Advertising', 'AdSense publisher verification metadata may be present without serving advertisements. The current site does not automatically load advertising tags. Before advertising is enabled, the publisher must configure the applicable certified consent platform and ad placements. Google and its advertising partners may then process identifiers and use cookies as described in that platform. These analytics controls are not a Google-certified advertising CMP and do not replace one.'),
            ('Feedback, external services and sharing', 'The feedback link opens Google Forms only when you choose it; the form is not embedded automatically. Information you enter, and any account information disclosed by the form, is handled by Google Forms and the recipient. Do not include passwords or other sensitive data. Native sharing sends the result only through the destination you select. Clipboard copying and downloaded result cards remain under your control.'),
            ('Your options and contact', 'You can refuse analytics, use your browser to delete site data, adjust Google advertising settings, or contact the project through the feedback page about a privacy question. Include enough context to identify the request without sending unnecessary personal information. We update this notice when the site’s handling changes.')
        ],
        'contactSections': [
            ('Make your report useful', 'For a game problem, include the game name, mode or level, device/browser, and the exact steps that led to the problem. Say what you expected and what happened instead. A challenge link can help reproduce a seeded course, but do not send credentials, payment details or private account data.'),
            ('What you can send', 'Use the form for gameplay bugs, accessibility feedback, translation corrections, content corrections, copyright concerns or privacy requests. For a content concern, include the affected page and describe the passage or asset. Do not submit someone else’s private information.'),
            ('An external feedback service', 'The button opens the project’s Google Forms feedback channel in a new tab. It is not an on-site live chat, and submitting it is a separate action. Google’s service may process information you choose to provide. If the form cannot open, try opening it directly in another browser; do not repeatedly submit the same report.')
        ],
        'termsSections': [
            ('Using the games', 'PuzzleVault offers browser puzzles for personal entertainment. You can play without registering. Use the site lawfully and do not disrupt its operation or other users. The games do not provide gambling, cash prizes or financial rewards.'),
            ('Availability and saved progress', 'The site is provided as available. Features and levels may change, and errors or interruptions can occur. Progress is stored locally and can be lost when you clear browser data or change devices. Shared results are personal records, not verified competitive rankings.'),
            ('Creative work and third-party rights', 'The project’s original code, artwork and written material remain subject to applicable intellectual-property rights. Familiar puzzle rules or mathematical ideas are not claimed as exclusive inventions. Third-party trademarks and materials remain the property of their owners. Use the contact page to identify a rights concern.'),
            ('Fair play and links', 'Do not use automation or modified client data to misrepresent scores as independently verified results. Shared challenge links contain a course and a self-reported target. External sites and services, including the feedback form and sharing destinations, have their own terms and policies.'),
            ('Advertising and privacy', 'Basic gameplay does not require clicking an ad or accepting optional analytics. When an advertising service is active, its placement and consent requirements also apply. A reward must be clearly identified before a player chooses to watch a reward ad. See the privacy policy for the current data handling.'),
            ('Changes and questions', 'We may update these terms when the service changes. The revision date appears above. For questions about content, use or privacy, use the contact page. These terms do not limit rights that cannot be excluded under applicable law.')
        ]
    },
    'ko': {
        'updated':'수정일', 'privacy':'개인정보 처리방침', 'about':'PuzzleVault 소개', 'contact':'문의와 의견 보내기', 'terms':'이용약관', 'settings':'개인정보 설정 변경', 'form':'의견 보내기 양식 열기', 'games':'10가지 게임 둘러보기',
        'aboutSections':[
            ('가볍게 시작하는 열 가지 퍼즐','PuzzleVault는 숫자, 패턴, 색상과 공간적 판단을 활용하는 브라우저 퍼즐 프로젝트입니다. 계정이나 앱 설치 없이 게임을 시작할 수 있습니다. 익숙한 퍼즐 원리를 직접 구현한 인터페이스에 일일 목표와 브라우저 내 성장 기록을 더했습니다.'),
            ('취향에 맞는 도전','NumVault는 비밀 숫자 추리, PatternPop은 순서 기억, QuickCalc는 시간 제한 연산 게임입니다. GridSmash·MergeChain·HexMatch에서는 배치와 조합을 고민하고, SortStack·TileTurn·ColorFlow·PipeLink에서는 단계별 공간 퍼즐을 풀 수 있습니다. 각 게임 페이지에서 실제 규칙과 조작법, 제공 모드를 확인하세요.'),
            ('내 브라우저에 쌓이는 기록','완료한 게임으로 경험치를 모아 레벨과 배지를 얻습니다. 하루 세 가지 미션은 UTC 자정, 한국 시간 오전 9시에 갱신됩니다. 점수·설정·진행도는 현재 브라우저에 저장되며 온라인 계정이나 공인 순위가 아닙니다. 사이트 데이터를 지우거나 다른 기기를 사용하면 기록이 사라지거나 별도로 시작됩니다.'),
            ('친구에게 건네는 같은 문제','QuickCalc의 도전 링크에는 문제 생성값과 플레이어가 공유한 목표 점수가 담깁니다. 같은 문제와 선택지 순서, 30초 제한을 사용하며 오답은 3초를 차감합니다. 대결 중에는 힌트나 시간 보너스가 없습니다. 같은 코스로 연습할 수 있지만 공유 점수는 서버에서 검증한 대회 기록이 아닙니다.'),
            ('입체감과 조작의 균형','HTML·CSS·Canvas·브라우저 오디오를 사용합니다. 돌출된 타일, 음영이 있는 조각, 행동에 반응하는 효과로 퍼즐 상태를 알아보기 쉽게 표현합니다. 이는 퍼즐판의 입체 표현이며 자유롭게 이동하는 3D 세계를 뜻하지 않습니다. 움직임 줄이기 설정을 반영하며 실제 속도는 기기와 브라우저에 따라 다릅니다.'),
            ('설명과 오류를 고치는 방법','공략은 현재 제공하는 게임을 기준으로 작성하고 기능 변경이나 오류 제보가 있으면 수정합니다. 퍼즐 팁은 플레이 제안이며 의학적 효능이나 학습 성과를 보장하지 않습니다. 풀리지 않는 레벨, 불편한 조작, 접근성·번역 문제는 게임 이름, 모드, 재현 순서와 함께 문의해 주세요.'),
            ('무료 이용과 운영','승인된 광고 설정이 활성화되면 광고가 프로젝트 운영에 도움이 될 수 있습니다. 선택적 분석은 개인정보 설정에서 허용하기 전까지 꺼져 있습니다. 광고 클릭은 게임 이용 조건이 아닙니다. 데이터 처리와 외부 문의 서비스는 아래 안내에서 확인할 수 있습니다.')
        ],
        'privacySections':[
            ('범위와 호스팅','이 안내는 puzzlevault.pages.dev의 브라우저 게임에 적용됩니다. 게임에 계정은 필요하지 않습니다. 호스팅 제공자인 Cloudflare는 사이트 전달과 보호를 위해 IP 주소, 요청 URL, 브라우저 정보 같은 네트워크 요청 정보를 처리합니다. 이는 기기에 저장되는 게임 기록과 별개입니다.'),
            ('게임 기록과 필수 설정','pv_로 시작하는 브라우저 저장 항목에 점수, 경험치, 미션, 연속 기록, 소리, 언어, 개인정보 선택을 저장합니다. 세션 저장소에는 힌트와 임시 플레이 횟수가 들어갈 수 있고 pv_lang 쿠키는 언어 선택을 기억합니다. 서비스 워커는 오프라인 이용을 위해 공개 게임 파일을 캐시합니다. 저장 기록은 계정으로 동기화되지 않으며 사이트 데이터 삭제 시 사라질 수 있습니다.'),
            ('선택적 Google Analytics','Google Analytics는 기본적으로 꺼져 있습니다. 개인정보 설정에서 허용하면 페이지 방문, 기기·브라우저 정보, 게임 완료나 공유 성공 같은 이용 이벤트가 전송될 수 있으며 _ga 등의 분석 쿠키를 사용할 수 있습니다. 공유 이벤트에 공유 메시지나 도전 URL을 넣지 않습니다. 분석을 거부해도 게임은 이용할 수 있습니다. 현재 사이트는 Microsoft Clarity 세션 기록을 불러오지 않습니다.'),
            ('선택 변경과 철회','하단의 개인정보 설정 또는 아래 버튼을 이용하세요. 진행 중인 게임을 다시 시작하지 않도록 허용 변경은 다음 페이지부터 적용합니다. 분석 허용을 철회하면 현재 페이지의 추가 Google Analytics 수집을 비활성화하고 접근 가능한 자체 도메인 분석 쿠키를 삭제합니다. 이미 전송된 데이터까지 되돌리지는 못합니다. 브라우저 저장이 차단된 경우 선택은 현재 페이지에서만 유지됩니다.'),
            ('광고','AdSense 게시자 확인용 메타데이터가 있어도 광고가 제공되는 것은 아닙니다. 현재 사이트는 광고 태그를 자동으로 불러오지 않습니다. 광고 활성화 전 운영자는 해당 지역에 필요한 인증 동의 관리 플랫폼과 광고 배치를 구성해야 합니다. 활성화 후 Google 및 광고 파트너는 해당 동의 화면의 안내에 따라 식별자와 쿠키를 처리할 수 있습니다. 여기의 분석 설정은 Google 인증 광고 CMP가 아니며 이를 대체하지 않습니다.'),
            ('문의·외부 서비스·공유','문의 링크를 선택하면 Google Forms가 열리며 양식을 자동으로 삽입하지 않습니다. 입력한 정보와 양식이 안내하는 계정 정보는 Google Forms 및 수신자가 처리합니다. 비밀번호 등 민감한 정보는 적지 마세요. 기기의 공유 기능은 직접 선택한 대상으로 결과를 보내며 클립보드 복사와 다운로드한 카드의 전달 여부는 이용자가 결정합니다.'),
            ('이용자의 선택과 문의','분석 거부, 브라우저의 사이트 데이터 삭제, Google 광고 설정 변경을 이용할 수 있습니다. 개인정보 질문은 문의 페이지로 전달해 주세요. 요청을 확인하는 데 필요한 설명만 적고 불필요한 개인정보는 보내지 마세요. 처리 방식이 바뀌면 이 안내를 갱신합니다.')
        ],
        'contactSections':[
            ('재현할 수 있는 설명을 보내 주세요','게임 이름, 모드·레벨, 기기·브라우저와 문제가 발생한 순서를 알려 주세요. 기대한 동작과 실제 결과를 함께 적으면 도움이 됩니다. 도전 링크는 같은 문제를 확인하는 데 쓸 수 있지만 계정 비밀번호, 결제 정보나 개인 계정 자료는 보내지 마세요.'),
            ('보낼 수 있는 의견','게임 오류, 접근성, 번역과 콘텐츠 수정, 저작권 문제, 개인정보 관련 문의를 보낼 수 있습니다. 콘텐츠 문제라면 해당 페이지와 문구 또는 이미지 위치를 알려 주세요. 다른 사람의 개인정보는 제출하지 마세요.'),
            ('외부 문의 서비스','아래 버튼은 프로젝트의 Google Forms 문의 창을 새 탭에서 엽니다. 실시간 채팅이 아니며 양식 제출은 별도의 동작입니다. 직접 입력한 정보는 Google의 서비스에서 처리될 수 있습니다. 열리지 않으면 다른 브라우저에서 링크를 열어 보고, 같은 문의를 반복 제출하지 마세요.')
        ],
        'termsSections':[
            ('게임 이용','PuzzleVault는 개인의 오락을 위한 브라우저 퍼즐을 제공합니다. 가입 없이 이용할 수 있으며 사이트 운영이나 다른 이용자를 방해해서는 안 됩니다. 도박, 현금 상금 또는 금전적 보상은 제공하지 않습니다.'),
            ('서비스와 저장 기록','기능과 레벨은 바뀔 수 있고 오류나 중단이 발생할 수 있습니다. 기록은 로컬에 저장되므로 브라우저 데이터 삭제 또는 기기 변경 시 잃을 수 있습니다. 공유 결과는 개인 기록이며 검증된 공식 순위가 아닙니다.'),
            ('창작물과 권리','프로젝트의 독자적인 코드, 그래픽, 글에는 관련 지식재산권이 적용됩니다. 일반적인 퍼즐 규칙이나 수학적 아이디어 자체를 독점 발명으로 주장하지 않습니다. 제3자의 상표와 자료는 해당 권리자에게 귀속됩니다. 권리 문제가 있다면 문의 페이지에서 구체적인 위치를 알려 주세요.'),
            ('공정한 이용과 외부 링크','자동화나 클라이언트 데이터 변경으로 만든 점수를 검증된 기록으로 오인시키지 마세요. 도전 링크의 목표 점수는 공유자가 제시한 값입니다. 문의 양식과 공유 대상 등 외부 서비스에는 각각의 약관과 정책이 적용됩니다.'),
            ('광고와 개인정보','기본 플레이에 광고 클릭이나 선택적 분석 동의는 필요하지 않습니다. 광고 서비스가 활성화되면 해당 배치·동의 기준을 적용합니다. 보상형 광고는 시청을 선택하기 전에 받을 보상을 알려야 합니다. 현재 데이터 처리는 개인정보 처리방침에서 확인하세요.'),
            ('변경과 문의','서비스 변경에 따라 약관을 갱신할 수 있으며 수정일을 표시합니다. 콘텐츠·이용·개인정보 질문은 문의 페이지로 전달해 주세요. 관련 법률에 따라 제한할 수 없는 이용자의 권리를 이 약관으로 제한하지 않습니다.')
        ]
    },
    'ja': {
        'updated':'更新日', 'privacy':'プライバシーポリシー', 'about':'PuzzleVaultについて', 'contact':'お問い合わせ・ご意見', 'terms':'利用規約', 'settings':'プライバシー設定を変更', 'form':'フィードバックフォームを開く', 'games':'10種類のゲームを見る',
        'aboutSections':[
            ('すぐに遊べるパズル集','PuzzleVaultは数字、記憶、色、空間を使う10種類のブラウザパズルのプロジェクトです。アカウントやアプリのインストールは不要です。親しまれているパズルの原理を独自の画面とコードで実装し、日々の目標と端末内の成長記録を加えています。'),
            ('好きな挑戦を選ぶ','NumVaultは暗号推理、PatternPopは順番の記憶、QuickCalcは時間制限の計算です。GridSmash・MergeChain・HexMatchは配置と組み合わせ、SortStack・TileTurn・ColorFlow・PipeLinkは段階的な空間パズルです。各ページにルールと操作方法があります。'),
            ('ブラウザに残る記録','完了したプレイで経験値、レベル、バッジを獲得します。3つの日次ミッションはUTC午前0時に更新されます。記録はこのブラウザに保存され、アカウントや認証済みランキングではありません。サイトデータの消去や端末変更で失われる場合があります。'),
            ('友達と同じ問題で挑戦','QuickCalcの共有リンクには問題の生成値と本人申告の目標点数が入ります。同じ問題と選択肢の順番を30秒で解き、誤答は3秒減点します。対戦中はヒントや時間追加は使えません。再挑戦は練習用で、点数はサーバーで検証していません。'),
            ('見やすい立体表現','HTML・CSS・Canvas・ブラウザ音声を使い、盛り上がるタイルや陰影、操作への反応を表現します。自由に移動する3D世界ではなく、パズル盤の立体的な見せ方です。動きを減らす設定を尊重し、速度は環境によって異なります。'),
            ('説明の改善と運営','実際の機能に合わせてガイドを見直します。遊びの提案は医療効果や学習成果の保証ではありません。不具合や翻訳の指摘はゲーム名と再現手順を添えてご連絡ください。広告クリックは利用条件ではなく、任意の分析は許可前には動作しません。')
        ],
        'privacySections':[
            ('対象とホスティング','この方針はpuzzlevault.pages.devに適用されます。アカウントは不要です。Cloudflareはサイトの配信と保護のため、IPアドレス、要求URL、ブラウザ情報などの通信情報を処理します。これは端末内のゲーム記録とは別です。'),
            ('端末内の保存','pv_で始まる項目に得点、経験値、ミッション、連続記録、音声、言語、プライバシー設定を保存します。セッション保存には一時的なヒントや回数が入り、pv_lang Cookieは言語を記憶します。公開ゲームファイルはオフライン用にキャッシュします。記録は同期されず、サイトデータ削除で失われる場合があります。'),
            ('任意のGoogle Analytics','分析は初期状態で無効です。許可するとページ閲覧、端末・ブラウザ情報、ゲーム完了や共有成功などのイベントを送信し、_gaなどのCookieを使う場合があります。共有イベントに本文や挑戦URLは入れません。拒否しても遊べます。現在Microsoft Clarityのセッション記録は読み込みません。'),
            ('設定の変更','下部の設定から変更できます。プレイを再開させないため許可の変更は次のページから適用します。取り消すと現在ページの追加分析を無効にし、アクセス可能な自サイトの分析Cookieを削除します。送信済みのデータは取り消せません。保存を拒否する環境では選択は現在ページのみ有効です。'),
            ('広告','AdSense確認用メタデータがあっても広告配信を意味しません。現在は広告タグを自動読み込みしません。有効化前に運営者は必要な認証済み同意管理サービスと配置を設定する必要があります。分析設定はGoogle認証済み広告CMPの代わりにはなりません。広告提供時の識別子やCookieはその同意画面で説明されます。'),
            ('お問い合わせと共有','フォームはクリック時だけGoogle Formsで開き、自動埋め込みしません。入力内容やフォームで表示されるアカウント情報はGoogleと受信者が処理します。パスワードなどは送らないでください。共有先やコピーした結果・画像の送付先はご自身で選びます。'),
            ('選択と連絡','分析の拒否、ブラウザでのサイトデータ削除、Google広告設定を利用できます。疑問はお問い合わせページから、不要な個人情報を含めずにご連絡ください。扱いが変わるとこの方針を更新します。')
        ],
        'contactSections':[
            ('再現できる情報を','ゲーム名、モードやレベル、端末・ブラウザ、問題が起きた操作順をお知らせください。期待した結果と実際の動作を区別すると役立ちます。挑戦リンクは再現に使えますが、認証情報や決済情報は送らないでください。'),
            ('受け付ける内容','不具合、アクセシビリティ、翻訳、記事の訂正、著作権、プライバシーについて送信できます。内容の問題には該当ページと箇所を添えてください。他人の個人情報は送らないでください。'),
            ('外部のフォーム','ボタンからGoogle Formsの連絡窓口が別タブで開きます。ライブチャットではなく、送信は別操作です。入力した情報はGoogleのサービスで処理されます。開けない場合は別ブラウザで直接開き、同じ報告を繰り返し送らないでください。')
        ],
        'termsSections':[
            ('利用目的','PuzzleVaultは個人の娯楽用のブラウザパズルです。登録は不要です。適法に利用し、運営や他の利用者を妨害しないでください。賭博、現金賞金、金銭的報酬はありません。'),
            ('提供状態と記録','機能やレベルは変更され、障害や中断が起こる場合があります。ローカル記録はブラウザデータ削除や端末変更で失われることがあります。共有点数は認証済みランキングではありません。'),
            ('創作物と権利','独自のコード、画像、文章には適用される知的財産権があります。一般的なパズルのルールや数学的なアイデア自体を独占発明と主張しません。第三者の権利は各所有者に帰属します。問題は該当箇所とともにお問い合わせください。'),
            ('公正な利用','自動操作や改変による点数を検証済みの記録と誤認させないでください。挑戦リンクの目標は本人申告です。外部フォームや共有先にはそれぞれの規約が適用されます。'),
            ('広告と設定','基本プレイには広告クリックや任意分析への同意は不要です。広告有効化時には必要な配置・同意基準が適用されます。報酬広告は選択前に報酬を明示します。データの扱いはプライバシーポリシーをご覧ください。'),
            ('変更と連絡','変更時には更新日を表示します。疑問はお問い合わせページからご連絡ください。法令で除外できない利用者の権利を制限しません。')
        ]
    },
    'zh': {
        'updated':'更新日期', 'privacy':'隐私政策', 'about':'关于PuzzleVault', 'contact':'联系与反馈', 'terms':'使用条款', 'settings':'更改隐私选择', 'form':'打开反馈表单', 'games':'探索十款游戏',
        'aboutSections':[
            ('随时开始的益智游戏','PuzzleVault是一个包含十款数字、记忆、颜色与空间益智游戏的浏览器项目。无需账号或安装应用即可开始。我们独立实现常见益智原理的界面和代码，加入每日目标与本地成长记录。'),
            ('选择适合你的挑战','NumVault侧重密码推理，PatternPop需要记住顺序，QuickCalc提供限时计算。GridSmash、MergeChain和HexMatch侧重放置与组合；SortStack、TileTurn、ColorFlow和PipeLink提供逐步解题的空间挑战。每款游戏页面介绍实际规则和操作。'),
            ('保存在浏览器的记录','完成游戏可获得经验、等级和徽章。三个每日任务在UTC零点更新。成绩保存在当前浏览器，并非在线账号或经验证的排行榜。清除网站数据或更换设备可能丢失记录。'),
            ('与朋友挑战相同题目','QuickCalc链接保留题目生成值和分享者提供的目标分数。双方获得相同题目和选项顺序，时间为30秒，答错扣3秒。对决不提供提示或加时。重玩用于练习，分数未经服务器核验。'),
            ('立体表现与清晰操作','游戏使用HTML、CSS、Canvas和浏览器音频。凸起的方块、阴影和反馈帮助辨认游戏状态，这是平面棋盘的立体表现，不是自由移动的3D世界。我们尊重减少动态效果设置，性能取决于设备和浏览器。'),
            ('内容维护与运营','指南会随实际功能和错误反馈更新。技巧不是医疗效果或学习成果的保证。请通过联系页面提供游戏名、模式与复现步骤。基础游戏不要求点击广告，可选分析在允许前保持关闭。')
        ],
        'privacySections':[
            ('范围与托管','本政策适用于puzzlevault.pages.dev。游戏无需账号。Cloudflare为交付和保护网站处理IP地址、请求网址、浏览器信息等网络请求数据；这些与设备内的游戏记录不同。'),
            ('本地数据','pv_开头的存储项保存分数、经验、任务、连续记录、声音、语言和隐私选择。会话存储可包含临时提示与次数；pv_lang Cookie记住语言。服务工作线程缓存公开游戏文件以供离线使用。记录不与账号同步，清除网站数据可能导致丢失。'),
            ('可选的Google Analytics','默认关闭。允许分析后，可发送页面访问、设备和浏览器信息以及游戏完成、分享成功等事件，并可能使用_ga等Cookie。分享事件不包含分享正文或挑战网址。拒绝不影响游戏。当前网站不加载Microsoft Clarity会话记录。'),
            ('更改选择','可以使用页脚或下方按钮更改选择。允许变更从下一页生效，以免重启正在进行的游戏。撤回许可会停用当前页面后续分析并移除可访问的本域分析Cookie，但不能撤回已发送的数据。存储被阻止时，选择只对当前页面有效。'),
            ('广告','AdSense验证元数据不代表正在展示广告。当前网站不自动加载广告标签。启用前，运营者需配置适用的认证同意管理平台及广告位置。广告服务可能按同意界面的说明处理标识符和Cookie。这里的分析选择不是Google认证广告CMP，不能取代它。'),
            ('反馈与分享','仅在点击链接时打开Google Forms，不自动嵌入。输入的信息以及表单披露的账号信息由Google和接收者处理。不要提交密码等敏感信息。您自行选择分享目的地，并决定如何发送复制结果或下载的卡片。'),
            ('您的选择与联系','您可以拒绝分析、通过浏览器清除网站数据、调整Google广告设置，或通过联系页面提出隐私问题。请只提供必要说明，不发送多余个人资料。处理方式变化时会更新本政策。')
        ],
        'contactSections':[
            ('提供可复现的信息','请说明游戏名、模式或关卡、设备和浏览器、导致问题的操作步骤，以及预期和实际结果。挑战链接可帮助复现题目，但不要发送账号凭证、支付信息或私人账户资料。'),
            ('可以反馈什么','欢迎提交错误、无障碍问题、翻译与内容更正、版权或隐私问题。内容反馈请附上相关页面及位置。不要提交他人的私人信息。'),
            ('外部反馈服务','按钮在新标签页打开项目的Google Forms反馈渠道。它不是实时聊天，提交表单是单独操作。您提供的信息可能由Google的服务处理。如无法打开，可用其他浏览器直接访问；请勿重复提交相同报告。')
        ],
        'termsSections':[
            ('游戏用途','PuzzleVault提供个人娱乐用的浏览器益智游戏，无需注册。请合法使用，不干扰网站或其他用户。网站不提供赌博、现金奖品或金钱奖励。'),
            ('可用性与记录','功能和关卡可能调整，也可能出现错误或中断。本地记录可能因清除数据或换设备而丢失。分享成绩不是经验证的正式排名。'),
            ('作品与权利','原创代码、图形和文字受适用的知识产权保护。项目不主张独占一般益智规则或数学理念。第三方商标和资料归各权利人所有。如有问题，请通过联系页面指出具体位置。'),
            ('公平使用与外链','不要把自动化或修改数据产生的分数冒充为经验证记录。挑战分数由分享者自行报告。外部表单和分享目的地适用其各自条款。'),
            ('广告与隐私','基础游戏不要求点击广告或允许可选分析。启用广告时，应遵守相应位置和同意要求。奖励广告必须在选择观看前明确奖励。数据处理详见隐私政策。'),
            ('变更和问题','条款随服务变化更新，并注明日期。问题请通过联系页面反馈。本条款不限制适用法律规定不得排除的权利。')
        ]
    },
    'es': {
        'updated':'Actualizado', 'privacy':'Política de privacidad', 'about':'Acerca de PuzzleVault', 'contact':'Contacto y comentarios', 'terms':'Condiciones de uso', 'settings':'Cambiar opciones de privacidad', 'form':'Abrir el formulario', 'games':'Explorar los diez juegos',
        'aboutSections':[
            ('Una colección para jugar al instante','PuzzleVault es un proyecto con diez puzles de números, memoria, colores y decisiones espaciales. Puedes empezar sin cuenta ni aplicación. Combina implementaciones e interfaces propias de principios conocidos con metas diarias y progreso local.'),
            ('Elige tu reto','NumVault trata de deducir un código, PatternPop de recordar secuencias y QuickCalc de calcular contrarreloj. GridSmash, MergeChain y HexMatch premian la colocación y las combinaciones. SortStack, TileTurn, ColorFlow y PipeLink ofrecen retos espaciales por etapas. Cada página explica las reglas y los controles disponibles.'),
            ('Registros en tu navegador','Las partidas completadas dan experiencia, niveles e insignias. Tres misiones se renuevan a medianoche UTC. Los datos pertenecen a este navegador: no son una cuenta sincronizada ni una clasificación verificada. Borrar datos o cambiar de dispositivo puede hacer perder el progreso.'),
            ('El mismo reto para tus amigos','Los enlaces de QuickCalc conservan la semilla y una puntuación declarada por quien comparte. Las preguntas y posiciones de respuesta coinciden, con 30 segundos y tres segundos de penalización por error. No hay pistas ni tiempo extra en el duelo. Repetir sirve para practicar; las puntuaciones no están verificadas por un servidor.'),
            ('Gráficos con profundidad','HTML, CSS, Canvas y audio del navegador permiten fichas elevadas, sombras y respuesta visual. Son tableros con apariencia dimensional, no mundos 3D de movimiento libre. Se respeta la preferencia de reducir movimiento y el rendimiento depende del dispositivo.'),
            ('Cuidar el contenido y el proyecto','Revisamos las guías cuando cambian las funciones o se comunican errores. Los consejos no garantizan beneficios médicos ni educativos. Envía el juego, modo y pasos del problema por la página de contacto. No hace falta pulsar anuncios para jugar y la analítica opcional no se inicia sin permiso.')
        ],
        'privacySections':[
            ('Ámbito y alojamiento','Esta política corresponde a puzzlevault.pages.dev. No necesitas una cuenta. Cloudflare procesa solicitudes de red, como IP, URL y datos del navegador, para entregar y proteger el sitio. Es distinto del progreso guardado en el dispositivo.'),
            ('Datos locales','Las claves pv_ guardan puntuaciones, experiencia, misiones, rachas, sonido, idioma y privacidad. El almacenamiento de sesión puede incluir pistas o contadores temporales. La cookie pv_lang recuerda el idioma y el service worker guarda archivos públicos para uso sin conexión. Los registros no se sincronizan; borrar datos puede eliminarlos.'),
            ('Google Analytics opcional','Está desactivado por defecto. Si lo permites, puede recibir visitas, información del dispositivo y eventos como completar partidas o compartir con éxito, y usar cookies como _ga. El evento de compartir no contiene el mensaje ni el enlace del reto. Rechazarlo no limita los juegos. La versión actual no carga grabaciones de Microsoft Clarity.'),
            ('Cambiar tu elección','Usa las opciones del pie de página o el botón inferior. Los cambios de permiso se aplican desde la próxima página para no reiniciar una partida. Al retirar el permiso se desactiva la recogida posterior y se eliminan las cookies propias de analítica accesibles. No se deshacen datos ya enviados. Si el navegador bloquea el almacenamiento, la elección dura esta página.'),
            ('Publicidad','Los metadatos de verificación de AdSense no implican que se muestren anuncios. El sitio actual no carga etiquetas publicitarias automáticamente. Antes de activarlas se necesita la plataforma de consentimiento certificada y las ubicaciones aplicables. Los identificadores y cookies se explicarán en ese flujo. Estas opciones de analítica no sustituyen una CMP publicitaria certificada por Google.'),
            ('Comentarios y servicios externos','Google Forms se abre al elegir el enlace y no se incrusta automáticamente. Google y el destinatario procesan lo que envíes y la información de cuenta indicada por el formulario. No incluyas contraseñas ni datos sensibles. Tú eliges el destino de un resultado compartido, copiado o descargado.'),
            ('Opciones y contacto','Puedes rechazar la analítica, borrar datos del sitio en el navegador, ajustar la publicidad de Google o consultar dudas en la página de contacto. Proporciona solo la información necesaria. Actualizaremos esta política cuando cambie el tratamiento.')
        ],
        'contactSections':[
            ('Describe cómo reproducirlo','Incluye juego, modo o nivel, dispositivo y navegador, pasos, resultado esperado y resultado real. Un enlace de reto ayuda a reproducir la secuencia; no envíes credenciales, datos de pago ni información privada de cuentas.'),
            ('Qué puedes comunicar','El formulario sirve para errores, accesibilidad, traducciones, correcciones de contenido, derechos de autor y privacidad. Identifica la página y el pasaje o recurso afectado. No incluyas información privada de otras personas.'),
            ('Un servicio externo','El botón abre el canal Google Forms del proyecto en otra pestaña. No es un chat en directo y enviar el formulario es una acción aparte. Google puede procesar lo que proporciones. Si no abre, prueba el enlace en otro navegador y evita enviar varias veces el mismo informe.')
        ],
        'termsSections':[
            ('Uso de los juegos','PuzzleVault ofrece puzles de navegador para entretenimiento personal sin registro. Utiliza el sitio legalmente y no interfieras en su funcionamiento ni en otros usuarios. No ofrece apuestas, premios en efectivo ni recompensas monetarias.'),
            ('Disponibilidad y registros','Las funciones y niveles pueden cambiar y pueden producirse errores o interrupciones. El progreso local puede perderse al borrar datos o cambiar de dispositivo. Los resultados compartidos no son clasificaciones verificadas.'),
            ('Creaciones y derechos','El código, gráficos y textos originales están sujetos a los derechos aplicables. No se reivindican reglas habituales o ideas matemáticas como invenciones exclusivas. Los derechos de terceros pertenecen a sus titulares. Comunica cualquier incidencia con su ubicación por la página de contacto.'),
            ('Juego limpio y enlaces','No presentes puntuaciones automatizadas o manipuladas como registros verificados. Los objetivos compartidos son declaraciones del jugador. Los formularios y destinos externos tienen sus propias condiciones.'),
            ('Publicidad y privacidad','El juego básico no exige pulsar anuncios ni aceptar analítica opcional. Una configuración publicitaria activa debe cumplir sus requisitos de ubicación y consentimiento. Las recompensas deben identificarse antes de elegir ver un anuncio. Consulta la política de privacidad.'),
            ('Cambios y consultas','La fecha identifica las revisiones de estas condiciones. Envía tus dudas por la página de contacto. No se limitan los derechos que no pueden excluirse bajo la ley aplicable.')
        ]
    }
}

def localized(lang, page):
    return ('/' if lang == 'en' else '/' + lang + '/') + page + '.html'

def refresh():
    for lang, copy in COPY.items():
        for page in ('about', 'privacy', 'contact', 'terms'):
            target = ROOT / (page + '.html' if lang == 'en' else lang + '/' + page + '.html')
            source = target.read_text(encoding='utf-8')
            blocks = [f'<main class="pv-editorial"><h1>{html.escape(copy[page])}</h1>', f'<p class="pv-editorial-meta">{copy["updated"]}: <time datetime="{DATE}">{DATE}</time></p>']
            if page == 'contact':
                blocks.append(f'<div class="pv-editorial-callout"><a class="pv-btn pv-btn-primary" href="{FORM}" target="_blank" rel="noopener noreferrer">{copy["form"]} ↗</a></div>')
            for heading, paragraph in copy[page + 'Sections']:
                blocks.append(f'<section><h2>{html.escape(heading)}</h2><p>{html.escape(paragraph)}</p></section>')
            if page == 'privacy':
                blocks.append(f'<button type="button" class="pv-btn pv-btn-secondary" data-privacy-settings>{copy["settings"]}</button>')
                blocks.append('<p><a href="https://policies.google.com/technologies/partner-sites">Google — partner sites</a> · <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare — privacy</a> · <a href="https://myadcenter.google.com/">Google — My Ad Center</a></p>')
            links = ' · '.join(f'<a href="{localized(lang, name)}">{copy[name]}</a>' for name in ('about', 'privacy', 'contact', 'terms') if name != page)
            blocks.append(f'<p class="pv-editorial-callout">{links}</p>')
            if page == 'about':
                blocks.append(f'<a class="pv-btn pv-btn-primary" href="{"/" if lang == "en" else "/" + lang + "/"}#games">{copy["games"]} →</a>')
            blocks.append('</main>')
            source = re.sub(r'<main\b[^>]*>[\s\S]*?</main>', '\n'.join(blocks), source, count=1)
            source = re.sub(r'<title>.*?</title>', '<title>' + html.escape(copy[page]) + ' | PuzzleVault</title>', source)
            description = html.escape(copy[page + 'Sections'][0][1], quote=True)
            source = re.sub(r'<meta\s+name="description"\s+content="[^"]*"\s*/?>', lambda _: '<meta name="description" content="' + description + '">', source)
            target.write_text(source, encoding='utf-8')

if __name__ == '__main__':
    refresh()
    print('Refreshed 20 static support pages in five languages.')
