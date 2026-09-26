/* Static article registry. Maintain sources in scripts/content and run scripts/refresh-blog.py. */
const BLOG_POSTS = [
  {
    "slug": "tileturn-cross-and-cascade-guide",
    "title": {
      "en": "TileTurn: solve the cross before following the cascade",
      "ko": "TileTurn 공략: 십자 범위를 읽고 연쇄 반응까지 계산하기",
      "ja": "TileTurn攻略：十字の範囲を読み、連鎖の結果まで考える",
      "zh": "TileTurn 攻略：先看十字范围，再算连锁变化",
      "es": "TileTurn: entiende la cruz antes de seguir la cascada"
    },
    "description": {
      "en": "Compare a correct center tap with a tempting corner move, trace Cascade's diagonal effects, and learn Spectrum's three states and TileTurn's star targets.",
      "ko": "가운데 한 번으로 끝나는 예제와 모서리 오답을 비교하고, Cascade의 대각선·겹침 효과, Spectrum의 세 상태, 별 점수 조건을 알아보세요.",
      "ja": "中央の一手で解ける例と角の手を比較し、Cascadeで対角線が変わる理由、効果の重なり、Spectrumの3状態と星の条件を学びます。",
      "zh": "比较中心一步完成与角落误选的结果，弄清 Cascade 的对角变化及重叠抵消、Spectrum 的三种状态和星级目标。",
      "es": "Compara una solución central con un movimiento de esquina, sigue los efectos diagonales de Cascade y aprende los tres estados de Spectrum y las estrellas."
    },
    "date": "2026-09-26",
    "updated": "2026-09-26",
    "category": "strategy",
    "tags": [
      "tileturn",
      "strategy"
    ],
    "readTime": 6
  },
  {
    "slug": "quickcalc-accuracy-and-duel-guide",
    "title": {
      "en": "QuickCalc: protect your streak before racing the clock",
      "ko": "QuickCalc 공략: 빨리 누르기 전에 연속 정답을 지키는 법",
      "ja": "QuickCalc攻略：時計を追う前に連続正解を守る",
      "zh": "QuickCalc 攻略：抢时间之前，先保住连续答对",
      "es": "QuickCalc: protege tu racha antes de correr contra el reloj"
    },
    "description": {
      "en": "Check worked QuickCalc arithmetic and scoring examples, understand the three-second penalty, and send a friend the same 30-second duel course.",
      "ko": "계산 순서와 실제 점수 예제로 QuickCalc를 익혀보세요. 오답의 3초 차감, 연속 정답 보너스, 같은 코스로 겨루는 30초 대결을 설명합니다.",
      "ja": "計算の優先順位と具体的な得点例からQuickCalcを学び、3秒のペナルティや同じコースを使う30秒対決のルールを確認しましょう。",
      "zh": "通过计算顺序和具体计分例子了解 QuickCalc，掌握答错扣三秒的代价，以及用同一套题目进行30秒好友对决的方法。",
      "es": "Comprueba ejemplos de cálculo y puntuación de QuickCalc, entiende la penalización de tres segundos y comparte el mismo duelo de 30 segundos con un amigo."
    },
    "date": "2026-09-26",
    "updated": "2026-09-26",
    "category": "strategy",
    "tags": [
      "quickcalc",
      "strategy"
    ],
    "readTime": 6
  },
  {
    "slug": "pipelink-connections-and-rotation-guide",
    "title": {
      "en": "PipeLink: read the ports before rotating a tile",
      "ko": "PipeLink 공략: 돌리기 전에 입구와 출구부터 확인하기",
      "ja": "PipeLink攻略：回す前に入口と出口を確かめる",
      "zh": "PipeLink 攻略：旋转之前，先看入口和出口",
      "es": "PipeLink: comprueba la entrada y la salida antes de girar"
    },
    "description": {
      "en": "A worked PipeLink circuit shows how reciprocal ports, clockwise turns and isolated crossings work, with a three-tap example and honest star-score limits.",
      "ko": "직접 구성한 회로 예제로 PipeLink의 연결 조건과 시계 방향 회전을 설명합니다. 세 번 탭하는 풀이, 교차 타일의 규칙, 별점 계산의 한계까지 확인하세요.",
      "ja": "学習用の回路を使い、PipeLinkの接続条件と時計回りの回転を解説。3回の操作でつなぐ例、交差管の仕組み、星評価の基準を確認できます。",
      "zh": "用一个专门设计的教学电路，理解 PipeLink 的双向接口、顺时针旋转和独立交叉通道，并看懂三次点击的解法与星级评分。",
      "es": "Resuelve un circuito didáctico de PipeLink en tres toques y entiende las conexiones, los cruces independientes, las ayudas y los límites de las estrellas."
    },
    "date": "2026-09-26",
    "updated": "2026-09-26",
    "category": "strategy",
    "tags": [
      "pipelink",
      "strategy"
    ],
    "readTime": 6
  },
  {
    "slug": "patternpop-targets-and-decoy-guide",
    "title": {
      "en": "PatternPop: remember the targets, ignore the decoy",
      "ko": "PatternPop 공략: 순서 대신 위치를 기억하고 가짜 불빛 구별하기",
      "ja": "PatternPop攻略：順番ではなく位置を覚え、おとりを見分ける",
      "zh": "PatternPop 攻略：记住目标位置，分清干扰闪光",
      "es": "PatternPop: recuerda los objetivos y descarta el señuelo"
    },
    "description": {
      "en": "Work through a six-target PatternPop board, separate blue diamonds from red decoys, and understand recall order, lives, replay hints, and scoring.",
      "ko": "6개 목표가 있는 예제 게임판으로 PatternPop의 기억 방법을 익혀보세요. 가짜 불빛, 생명, 힌트 재생, 점수 계산까지 실제 규칙에 맞춰 설명합니다.",
      "ja": "6つの目標と1つのおとりを使った例で、PatternPopの記憶方法、入力順、ライフ、ヒント再生、得点の仕組みを確認しましょう。",
      "zh": "用一个含六个目标的示例棋盘练习 PatternPop，了解选择顺序、红色干扰、生命、慢速重播提示及计分规则。",
      "es": "Resuelve un ejemplo de PatternPop con seis objetivos y aprende a distinguir señuelos, elegir el orden de respuesta y usar vidas, pistas y puntuación."
    },
    "date": "2026-09-26",
    "updated": "2026-09-26",
    "category": "strategy",
    "tags": [
      "patternpop",
      "strategy"
    ],
    "readTime": 6
  },
  {
    "slug": "mergechain-drop-and-merge-guide",
    "title": {
      "en": "MergeChain: choose a landing target and read the chain score",
      "ko": "MergeChain 공략: 떨어뜨릴 위치와 연쇄 점수 이해하기",
      "ja": "MergeChain攻略：落とす相手と連鎖得点を見極める",
      "zh": "MergeChain 攻略：选对落点，算清连锁得分",
      "es": "MergeChain: elige el primer contacto y calcula la cadena"
    },
    "description": {
      "en": "Compare two constructed MergeChain drops, calculate a 20-point chain, and learn what the first-contact guide, cooldown and danger line can actually tell you.",
      "ko": "직접 구성한 두 낙하 경로를 비교하고 20점 연쇄를 계산합니다. 첫 접촉 안내선의 의미, 다음 공을 기다릴 때, 위험선을 관리하는 방법을 알아보세요.",
      "ja": "2つの落下ルートと20点の連鎖例でMergeChainを解説。最初の接触ガイド、次を落とすタイミング、危険ラインの意味がわかります。",
      "zh": "比较两条专门构造的落球路线，计算一次20分连锁，并理解MergeChain的首次接触提示、投放间隔和危险线。",
      "es": "Compara dos caídas de MergeChain, calcula una cadena de 20 puntos y entiende qué indican la guía de contacto, la espera entre bolas y la línea de peligro."
    },
    "date": "2026-09-26",
    "updated": "2026-09-26",
    "category": "strategy",
    "tags": [
      "mergechain",
      "strategy"
    ],
    "readTime": 6
  },
  {
    "slug": "hexmatch-chains-and-special-gems-guide",
    "title": {
      "en": "HexMatch: trace a real chain and use special gems correctly",
      "ko": "HexMatch 공략: 이어지는 경로와 특수 보석 제대로 쓰기",
      "ja": "HexMatch攻略：たどれる連鎖と特殊ジェムの使い方",
      "zh": "HexMatch 攻略：画出有效连线，用对特殊宝石",
      "es": "HexMatch: traza una cadena válida y usa las gemas especiales"
    },
    "description": {
      "en": "Follow a five-gem HexMatch example to learn adjacency, rainbow limits, bomb placement and exact scoring, then practise avoiding branches you cannot trace.",
      "ko": "무지개 보석을 포함한 다섯 칸 예제로 HexMatch의 인접 규칙, 색상 제한, 폭탄 생성 위치와 점수를 설명합니다. 가지가 갈라진 모양의 함정도 확인하세요.",
      "ja": "虹を含む5個の例でHexMatchの隣接ルール、色の制約、爆弾の生成位置と得点を解説。枝分かれした集まりの見落としも確認できます。",
      "zh": "通过含彩虹的五颗宝石示例，理解HexMatch的相邻规则、颜色限制、炸弹位置和准确分数，避免无法一笔经过的分叉路线。",
      "es": "Sigue cinco gemas de HexMatch para entender la vecindad, los límites del arcoíris, las bombas y la puntuación, evitando ramas que no puedes recorrer."
    },
    "date": "2026-09-26",
    "updated": "2026-09-26",
    "category": "strategy",
    "tags": [
      "hexmatch",
      "strategy"
    ],
    "readTime": 6
  },
  {
    "slug": "why-we-built-puzzlevault-with-vanilla-js",
    "title": {
      "en": "Why PuzzleVault Uses Vanilla JavaScript",
      "ko": "PuzzleVault가 바닐라 JavaScript를 사용하는 이유",
      "ja": "PuzzleVaultが素のJavaScriptを使う理由",
      "zh": "PuzzleVault为何使用原生JavaScript",
      "es": "Por qué PuzzleVault usa JavaScript sin frameworks"
    },
    "description": {
      "en": "A look at PuzzleVault’s HTML, CSS and JavaScript architecture: direct drawing, small modules, browser storage, and the work required to keep games responsive.",
      "ko": "PuzzleVault의 HTML·CSS·JavaScript 구조를 살펴봅니다. 직접 그리기, 게임별 코드 분리, 브라우저 저장과 반응성 검증의 실제 역할을 설명합니다.",
      "ja": "HTML・CSS・JavaScriptで作るPuzzleVaultの構成を紹介。描画、ゲーム別のコード、保存機能と操作性の確認について説明します。",
      "zh": "了解PuzzleVault的HTML、CSS与JavaScript结构，以及直接绘图、独立游戏模块、浏览器存储和实际操作测试之间的关系。",
      "es": "Así se organiza PuzzleVault con HTML, CSS y JavaScript: dibujo directo, módulos por juego, almacenamiento del navegador y pruebas de respuesta."
    },
    "date": "2026-03-29",
    "updated": "2026-09-26",
    "category": "updates",
    "tags": [
      "performance"
    ],
    "readTime": 6
  },
  {
    "slug": "the-math-behind-sortstack",
    "title": {
      "en": "SortStack: use completed tubes to create working space",
      "ko": "SortStack 공략: 완성한 통으로 작업 공간 늘리기",
      "ja": "SortStack攻略：完成したチューブで作業場所を増やす",
      "zh": "SortStack攻略：利用完成的管子增加操作空间",
      "es": "SortStack: completa tubos para crear espacio de trabajo"
    },
    "description": {
      "en": "Follow a four-move SortStack example and see how matching tops, single-ball moves and newly unlocked empty tubes change the order of your decisions.",
      "ko": "네 번의 이동으로 푸는 SortStack 예제를 따라가며 맨 위 공의 색, 한 번에 한 공 이동, 새 빈 통이 생기는 규칙을 활용해 보세요.",
      "ja": "4手で解ける例を通して、先頭の色、1個ずつの移動、完成時に増える空チューブを使った手順を考えましょう。",
      "zh": "通过四步整理的例子，理解顶层匹配、每次只移动一球以及完成后新增空管如何影响下一步选择。",
      "es": "Sigue un ejemplo de cuatro movimientos y descubre cómo los colores superiores y los nuevos tubos vacíos cambian el orden de tus decisiones."
    },
    "date": "2026-03-29",
    "updated": "2026-09-26",
    "category": "strategy",
    "tags": [
      "sortstack",
      "strategy"
    ],
    "readTime": 6
  },
  {
    "slug": "the-evolution-of-browser-puzzles",
    "title": {
      "en": "From Flash to today's browser puzzles: what players should expect",
      "ko": "Flash 이후의 브라우저 퍼즐: 실행·기록·오프라인 이해하기",
      "ja": "Flash以後のブラウザパズル：起動・記録・オフラインの違い",
      "zh": "Flash之后的浏览器益智游戏：加载、记录与离线的区别",
      "es": "Después de Flash: cómo funcionan las partidas en el navegador"
    },
    "description": {
      "en": "Understand how PuzzleVault loads games, starts sound, stores local records and caches files, with a practical distinction between offline access and saved progress.",
      "ko": "PuzzleVault가 게임을 불러오고 소리를 재생하며 기록과 파일을 저장하는 방식을 설명합니다. 오프라인 실행과 진행 상황 저장의 차이를 실제 상황으로 알아보세요.",
      "ja": "PuzzleVaultがゲームを読み込み、音を鳴らし、記録やファイルを保存する仕組みを解説。オフライン起動と進行保存を具体例で区別します。",
      "zh": "了解PuzzleVault如何加载游戏、播放声音、保存本地记录和缓存文件，通过具体场景区分离线打开游戏与恢复游戏进度。",
      "es": "Entiende cómo PuzzleVault carga juegos, inicia sonidos y guarda archivos y récords locales, distinguiendo el acceso sin conexión del progreso de una partida."
    },
    "date": "2026-03-29",
    "updated": "2026-09-26",
    "category": "updates",
    "tags": [
      "all-games"
    ],
    "readTime": 6
  },
  {
    "slug": "colorflow-advanced-pathing-strategies",
    "title": {
      "en": "ColorFlow: plan coverage before connecting the final pair",
      "ko": "ColorFlow 공략: 마지막 연결 전에 빈칸을 확인하세요",
      "ja": "ColorFlow攻略：最後の接続前に空きマスを確認しよう",
      "zh": "ColorFlow攻略：连上最后一对前，先检查空格",
      "es": "ColorFlow: planifica la cobertura antes de conectar la última pareja"
    },
    "description": {
      "en": "Compare two valid routes on a 5×5 ColorFlow board and see why connecting every pair can still leave unused cells and fewer stars.",
      "ko": "5×5 설명용 보드의 두 경로를 비교하며, 모든 쌍을 연결해도 빈칸과 별 점수가 달라지는 이유를 알아보세요.",
      "ja": "5×5の解説用盤面で二つの経路を比べ、すべてのペアを結んでも埋まる面積と星が変わる理由を学びましょう。",
      "zh": "比较5×5示意棋盘上的两种合法路线，了解为何全部配对成功后，仍可能留下空格并获得不同星数。",
      "es": "Compara dos rutas válidas en un tablero de 5×5 y descubre por qué conectar todas las parejas puede dejar casillas vacías y dar menos estrellas."
    },
    "date": "2026-03-29",
    "updated": "2026-09-26",
    "category": "strategy",
    "tags": [
      "colorflow",
      "strategy"
    ],
    "readTime": 6
  },
  {
    "slug": "5-tips-to-boost-your-brain-with-puzzles",
    "title": {
      "en": "Five Practical Ways to Enjoy PuzzleVault",
      "ko": "PuzzleVault를 더 즐겁게 플레이하는 다섯 가지 방법",
      "ja": "PuzzleVaultを楽しく遊ぶための5つのヒント",
      "zh": "更愉快地玩PuzzleVault的五个实用方法",
      "es": "Cinco formas prácticas de disfrutar de PuzzleVault"
    },
    "description": {
      "en": "Choose a clear goal, read the feedback, leave room for your next move, and build a puzzle session that feels satisfying.",
      "ko": "작은 목표 정하기, 피드백 읽기, 다음 수를 위한 공간 남기기와 같은 조건에서 다시 도전하는 실용적인 퍼즐 팁입니다.",
      "ja": "小さな目標、フィードバック、次の一手の空間、同じ条件での再挑戦を使う実用的な遊び方。",
      "zh": "设定小目标，读懂反馈，为下一步留空间，用相同条件练习，并在自己选择的节点休息。",
      "es": "Elige una meta, interpreta las pistas, reserva espacio para el próximo movimiento y practica en condiciones comparables."
    },
    "date": "2026-03-01",
    "updated": "2026-09-26",
    "category": "tips",
    "tags": [
      "memory",
      "patternpop",
      "numvault",
      "brain"
    ],
    "readTime": 5
  },
  {
    "slug": "numvault-tips-and-strategy",
    "title": {
      "en": "NumVault: read the clues before spending another guess",
      "ko": "NumVault 공략: 다음 숫자를 누르기 전에 단서 읽기",
      "ja": "NumVault攻略：次の入力の前にヒントを整理しよう",
      "zh": "NumVault攻略：先读懂线索，再输入下一组数字",
      "es": "NumVault: interpreta las pistas antes de gastar otro intento"
    },
    "description": {
      "en": "Follow a four-guess NumVault example, distinguish digit clues from position clues, and learn why repeated digits need careful counting.",
      "ko": "네 번의 추측으로 코드를 좁히는 예제를 따라가며 숫자와 위치를 구분하고, 중복 숫자의 회색 단서를 정확히 읽어 보세요.",
      "ja": "4回の推測を使った例で数字と位置を分けて考え、重複する数字の灰色ヒントを正しく読む方法を紹介します。",
      "zh": "通过四次猜测的完整例子，区分数字和位置线索，理解重复数字为何可能同时出现绿色和灰色提示。",
      "es": "Sigue un ejemplo de cuatro intentos, separa las pistas de cifra y posición, y aprende a contar coincidencias cuando hay dígitos repetidos."
    },
    "date": "2026-02-28",
    "updated": "2026-09-26",
    "category": "strategy",
    "tags": [
      "numvault",
      "strategy"
    ],
    "readTime": 6
  },
  {
    "slug": "gridsmash-beginner-strategy-guide",
    "title": {
      "en": "GridSmash: plan a tray, not just the next block",
      "ko": "GridSmash 공략: 블록 하나보다 세 조각의 순서를 보세요",
      "ja": "GridSmash攻略：1個の置き場所より3個の順番を考えよう",
      "zh": "GridSmash攻略：规划三块的顺序，而不只看眼前一块",
      "es": "GridSmash: planifica la bandeja completa, no solo el siguiente bloque"
    },
    "description": {
      "en": "Use a marked 10×10 board to compare two placements, calculate a two-line clear, and preserve useful space for the pieces still in your tray.",
      "ko": "10×10 설명용 보드에서 두 배치를 비교하고 두 줄을 지웠을 때의 점수를 계산하며, 남은 조각이 들어갈 공간을 지키는 방법을 익혀 보세요.",
      "ja": "10×10の解説用盤面で二つの配置を比べ、2列消去の得点を計算しながら、残りのピースに必要な空間を確保しましょう。",
      "zh": "用10×10示意棋盘比较两种摆法，计算双行消除得分，并为托盘中剩余的形状保留可用空间。",
      "es": "Compara dos colocaciones en un tablero de 10×10, calcula una limpieza de dos filas y conserva espacio útil para las piezas que todavía faltan."
    },
    "date": "2026-02-25",
    "updated": "2026-09-26",
    "category": "strategy",
    "tags": [
      "gridsmash",
      "strategy"
    ],
    "readTime": 6
  },
  {
    "slug": "daily-challenge-streak-tips",
    "title": {
      "en": "How to Build a 30-Day Daily Challenge Streak",
      "ko": "30일 데일리 챌린지 연속 기록을 만드는 방법",
      "ja": "30日間デイリーチャレンジ連続記録を作る方法",
      "zh": "如何建立30天每日挑战连胜记录",
      "es": "Cómo Construir una Racha de 30 Días en los Desafíos Diarios"
    },
    "description": {
      "en": "Choose an optional puzzle routine, understand UTC daily resets and local records, and practice at your own pace.",
      "ko": "UTC 기준 데일리 갱신과 브라우저 기록을 이해하고, 내 속도에 맞춰 즐겁게 반복 연습하는 방법입니다.",
      "ja": "UTC基準のデイリー更新とブラウザ内の記録を知り、自分のペースでパズルを楽しむためのヒント。",
      "zh": "了解UTC每日更新和浏览器本地记录，按自己的节奏选择练习与休息。",
      "es": "Elige una rutina opcional, conoce el reinicio diario en UTC y los registros locales, y practica a tu ritmo."
    },
    "date": "2026-02-20",
    "updated": "2026-09-26",
    "category": "tips",
    "tags": [
      "daily",
      "numvault",
      "gridsmash",
      "colorflow",
      "streak"
    ],
    "readTime": 5
  },
  {
    "slug": "welcome-to-puzzlevault",
    "title": {
      "en": "Choose your first PuzzleVault game",
      "ko": "PuzzleVault 첫 게임 고르기: 지금 하고 싶은 방식으로 선택하세요",
      "ja": "最初のPuzzleVaultゲームを選ぶ：遊びたい操作から始めよう",
      "zh": "选择你的第一款 PuzzleVault 游戏",
      "es": "Elige tu primer juego de PuzzleVault"
    },
    "description": {
      "en": "Compare all ten PuzzleVault games by play style, first action, and a manageable first goal, then choose a calm puzzle or a short timed challenge.",
      "ko": "PuzzleVault의 10개 게임을 플레이 방식, 첫 조작, 작은 첫 목표로 비교합니다. 차분한 추리부터 30초 대결까지 자신에게 맞는 시작점을 찾아보세요.",
      "ja": "PuzzleVaultの全10ゲームを遊び方、最初の操作、小さな目標で比較。落ち着いた推理から30秒対決まで、自分に合う入口を見つけましょう。",
      "zh": "按玩法、第一步操作和小目标比较 PuzzleVault 的十款游戏，从安静推理到30秒对决，找到适合这次休息的开始方式。",
      "es": "Compara los diez juegos de PuzzleVault por estilo, primera acción y un objetivo sencillo; después elige un rompecabezas tranquilo o un reto breve con reloj."
    },
    "date": "2026-02-15",
    "updated": "2026-09-26",
    "category": "updates",
    "tags": [
      "all-games"
    ],
    "readTime": 6
  }
];

/**
 * Get blog posts, optionally filtered by category and limited.
 * Returns posts sorted by date (newest first) with localized title/description.
 * @param {number} [count] — Max posts to return (undefined = all)
 * @param {string} [category] — Filter by category
 * @returns {Array}
 */
function getBlogPosts(count, category) {
    let posts = [...BLOG_POSTS];

    if (category) {
        posts = posts.filter(p => p.category === category);
    }

    // Sort by date descending
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (count) {
        posts = posts.slice(0, count);
    }

    // Resolve localized title/description and URL
    const lang = (typeof I18n !== 'undefined' && I18n.currentLang) ? I18n.currentLang : 'en';
    return posts.map(p => ({
        ...p,
        title: (typeof p.title === 'object') ? (p.title[lang] || p.title.en) : p.title,
        description: (typeof p.description === 'object') ? (p.description[lang] || p.description.en) : p.description,
        url: lang === 'en' ? `/blog/posts/${p.slug}.html` : `/blog/${lang}/${p.slug}.html`
    }));
}

/**
 * Get related posts based on matching tags.
 * Excludes the current post.
 * @param {string} currentSlug — Slug of the current post
 * @param {number} [count=3] — Number of related posts to return
 * @returns {Array}
 */
function getRelatedPosts(currentSlug, count = 3) {
    const current = BLOG_POSTS.find(p => p.slug === currentSlug);
    if (!current) return getBlogPosts(count);

    const others = BLOG_POSTS.filter(p => p.slug !== currentSlug);

    const lang = (typeof I18n !== 'undefined' && I18n.currentLang) ? I18n.currentLang : 'en';

    // Score by tag overlap
    const scored = others.map(post => {
        const overlap = post.tags.filter(t => current.tags.includes(t)).length;
        return {
            ...post,
            title: (typeof post.title === 'object') ? (post.title[lang] || post.title.en) : post.title,
            description: (typeof post.description === 'object') ? (post.description[lang] || post.description.en) : post.description,
            url: lang === 'en' ? `/blog/posts/${post.slug}.html` : `/blog/${lang}/${post.slug}.html`,
            score: overlap
        };
    });

    // Sort by score desc, then date desc
    scored.sort((a, b) => b.score - a.score || new Date(b.date) - new Date(a.date));

    return scored.slice(0, count);
}

/**
 * Get related game cards for tags that match game IDs.
 * Tags like 'numvault', 'gridsmash' map to PV_GAMES entries.
 * @param {string[]} tags — Tag array from a blog post
 * @returns {Array<{id: string, emoji: string, name: string, tagline: string, path: string}>}
 */
function getRelatedGames(tags) {
    if (typeof PV_GAMES === 'undefined') return [];
    const games = [];
    tags.forEach(tag => {
        if (PV_GAMES[tag] && !games.find(g => g.id === tag)) {
            games.push({ id: tag, ...PV_GAMES[tag] });
        }
    });
    return games;
}
