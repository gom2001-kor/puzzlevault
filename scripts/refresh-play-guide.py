"""Replace unsupported health claims with practical, game-specific editorial content."""
from pathlib import Path
import html
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SLUG = '5-tips-to-boost-your-brain-with-puzzles'
CONTENT = {
 'en': {
  'old':'5 Science-Backed Ways Puzzle Games Boost Your Brain',
  'title':'Five Practical Ways to Enjoy PuzzleVault',
  'description':'Choose a clear goal, read the feedback, leave room for your next move, and build a puzzle session that feels satisfying.',
  'intro':'A good puzzle break can be short, focused and enjoyable without turning into a test you have to pass. The suggestions below concern choices inside PuzzleVault: how to notice useful information, experiment with a move, and decide what to try next. They are practical play tips, not evidence that this website improves intelligence, memory capacity or health. Pick one idea to try during your next round rather than attempting to change every habit at once.',
  'sections':[
   ('1. Choose one goal for the round','Start by choosing the kind of experience you want. A QuickCalc friend challenge gives you a definite 30-second limit. A ColorFlow level lets you work toward connecting the pairs. In NumVault, the goal is to identify a hidden code from feedback. Choose a goal you can actually observe: finish a level, make fewer wrong guesses, or notice when a chain becomes ready. A personal target is more useful than comparing your score with an unsupported online percentile. Your records are local to this browser, so a new device may not have your previous best.'),
   ('2. Read the feedback before the next action','After a NumVault guess, separate digits in the correct position from digits that occur in another position and digits excluded by the feedback. Repeating a guess without using that information spends an attempt without testing a new possibility. For example, a confirmed position should normally stay fixed while you test unresolved positions. In modes that permit duplicate digits, one matching digit does not establish the total number of copies. In PatternPop, wait until the displayed sequence is over before entering it, and distinguish real flashes from decoys. The feedback belongs to the current question or board; it is not a measure of your general ability.'),
   ('3. Protect the space needed for the next move','In GridSmash, look at all offered pieces before committing to a convenient placement. A small gap might accept one piece while making the remaining pieces awkward. Leaving flexible space can be more useful than immediately pursuing a bonus. In SortStack, an empty tube is a temporary workspace, not merely something that must be filled. Before moving a top group, check both the destination color and its remaining capacity. In ColorFlow, drawing a short-looking route can block another pair, so look at neighboring endpoints and narrow passages. These are planning heuristics, not promises that every move or round will succeed.'),
   ('4. Make practice comparable','If you want to compare QuickCalc attempts, use the same challenge link. It preserves the question seed and answer order, so improvement is easier to interpret than when both the questions and your performance change. Wrong answers remove three seconds, and time bonuses and hints are disabled in the duel. Replaying teaches you that course; it does not prove that a first-time friend had identical practice. Share the score as a friendly invitation. The target in the URL is supplied by the player and is not an independently verified competition result.'),
   ('5. End at a checkpoint that you chose','Decide whether this visit is one round, one level, or one attempt at a daily mission. When the checkpoint arrives, notice one choice that helped and one you would change. The next session can begin with that small observation. Daily missions reset at midnight UTC, but a streak is an optional goal rather than an obligation. If a timer feels tiring, switch to a puzzle without that pace or take a break. Sound and reduced-motion options can make the experience more comfortable. Your best session is one you enjoyed and were able to stop when you intended.')
  ],
  'end':'Try these ideas in <a href="/games/numvault.html">NumVault</a> or start a <a href="/games/quickcalc.html?mode=blitz">30-second QuickCalc challenge</a>. If an explanation does not match a game, send the page and the steps through our <a href="/contact.html">feedback channel</a> so it can be corrected.'
 },
 'ko': {
  'old':'퍼즐 게임이 두뇌를 강화하는 과학적으로 입증된 5가지 방법', 'title':'PuzzleVault를 더 즐겁게 플레이하는 다섯 가지 방법',
  'description':'작은 목표 정하기, 피드백 읽기, 다음 수를 위한 공간 남기기와 같은 조건에서 다시 도전하는 실용적인 퍼즐 팁입니다.',
  'intro':'좋은 퍼즐 시간은 짧아도 충분히 즐거울 수 있습니다. 이 글은 PuzzleVault 안에서 정보를 읽고 다음 행동을 선택하는 방법을 소개합니다. 지능, 기억력 용량이나 건강이 좋아진다는 의학적 주장은 아닙니다. 모든 습관을 한꺼번에 바꾸려 하지 말고 다음 한 판에서 한 가지씩 시도해 보세요.',
  'sections':[
   ('1. 이번 한 판의 목표를 하나만 정해요','QuickCalc 친구 대결은 30초라는 분명한 끝이 있고, ColorFlow는 같은 번호의 쌍을 연결하는 목표가 있습니다. NumVault에서는 피드백으로 비밀 숫자를 좁혀 갑니다. 한 레벨 끝내기, 불필요한 추측 줄이기, 체인이 완성되는 순간 알아보기처럼 확인할 수 있는 목표를 골라 보세요. 근거 없는 상위 몇 퍼센트보다 자신의 선택을 비교하는 편이 유용합니다. 기록은 현재 브라우저에 저장되므로 다른 기기에는 이전 점수가 없을 수 있습니다.'),
   ('2. 다음 입력 전에 결과를 읽어요','NumVault에서는 자리가 맞는 숫자, 다른 자리에 있는 숫자, 제외된 숫자를 구분하세요. 피드백을 활용하지 않고 같은 추측을 반복하면 새로운 가능성을 확인하지 못한 채 기회를 씁니다. 확정된 위치는 유지하고 미확정 위치를 시험해 보는 방식이 도움이 됩니다. 중복 숫자 모드에서는 한 번 맞았다고 그 숫자의 전체 개수까지 알 수 있는 것은 아닙니다. PatternPop은 표시가 끝날 때까지 기다리고 실제 점멸과 방해 점멸을 구별하세요. 이 결과는 현재 문제의 정보이지 일반적인 능력을 평가하는 점수가 아닙니다.'),
   ('3. 다음 수가 들어갈 자리를 남겨요','GridSmash에서는 지금 손에 든 조각만 보지 말고 제시된 조각 전체를 살펴보세요. 작은 빈칸을 채우기 쉬워도 남은 조각을 놓기 어려워질 수 있습니다. SortStack의 빈 튜브는 무조건 채워야 할 공간이 아니라 임시 작업 공간입니다. 위쪽 구슬을 옮기기 전에 목적지의 색과 남은 용량을 확인하세요. ColorFlow에서는 짧아 보이는 경로가 다른 쌍을 가로막을 수 있으므로 좁은 통로와 가까운 끝점을 함께 살피세요. 이런 기준은 생각을 돕는 제안이며 매번 성공을 보장하지 않습니다.'),
   ('4. 같은 조건으로 다시 도전해요','QuickCalc의 같은 도전 링크를 쓰면 문제 생성값과 답의 위치가 유지됩니다. 문제도 바뀌고 성적도 바뀌는 경우보다 자신의 변화를 비교하기 쉽습니다. 오답은 3초를 차감하고 대결 중에는 시간 추가와 힌트를 쓸 수 없습니다. 여러 번 연습하면 그 코스에 익숙해지므로 처음 보는 친구와 연습량까지 같다고 생각하지는 마세요. 링크의 목표 점수는 공유자가 제시한 값이고 서버에서 검증한 대회 기록이 아닙니다. 가벼운 도전장으로 주고받는 것이 목적입니다.'),
   ('5. 내가 정한 지점에서 쉬어요','한 판, 한 레벨, 일일 미션 한 번처럼 이번 방문의 끝을 정해 보세요. 끝났을 때 도움이 된 선택 하나와 바꾸고 싶은 선택 하나를 돌아보면 다음 시작점이 됩니다. 미션은 UTC 자정, 한국 시간 오전 9시에 갱신되지만 연속 기록은 의무가 아닙니다. 시간 제한이 피곤하면 느긋한 퍼즐로 바꾸거나 쉬어도 좋습니다. 소리와 움직임 줄이기 설정을 이용해 편한 환경을 만드세요. 즐겁게 플레이하고 원할 때 마칠 수 있는 시간이 좋은 퍼즐 시간입니다.')
  ],
  'end':'<a href="/games/numvault.html">NumVault</a> 또는 <a href="/games/quickcalc.html?mode=blitz">QuickCalc 30초 대결</a>에서 한 가지 팁을 시도해 보세요. 설명과 실제 동작이 다르면 <a href="/ko/contact.html">문의 페이지</a>로 게임과 재현 순서를 알려 주세요.'
 },
 'ja': {
  'old':'パズルゲームが脳を鍛える科学的に証明された5つの方法', 'title':'PuzzleVaultを楽しく遊ぶための5つのヒント',
  'description':'小さな目標、フィードバック、次の一手の空間、同じ条件での再挑戦を使う実用的な遊び方。',
  'intro':'パズルの休憩は短くても楽しめます。このガイドはゲーム内の情報を読み、次の一手を選ぶための提案です。知能、記憶容量、健康の向上を示す医学的な主張ではありません。次の一回では一つの方法だけ試してみましょう。',
  'sections':[
   ('1. 今回の目標を一つ選ぶ','QuickCalcなら30秒、ColorFlowならペアの接続、NumVaultなら隠された数字の推理という具体的な目標があります。一面を終える、無駄な推測を減らす、チェーンの完成を見分けるなど観察できる目標を選びましょう。根拠のない順位より自分の選択を比べる方が有用です。記録は今のブラウザに保存されるため、別の端末では以前の得点がない場合があります。'),
   ('2. 次の入力前に結果を読む','NumVaultでは位置まで正しい数字、別の位置にある数字、除外された数字を分けます。同じ推測を繰り返すだけでは新しい可能性を調べられません。確定位置を保ち、未確定の位置を試すと考えやすくなります。重複数字のモードでは一度一致しても総数が分かるとは限りません。PatternPopは表示終了まで待ち、本物の点滅とおとりを区別します。これは今の問題の情報であり、一般的な能力評価ではありません。'),
   ('3. 次の一手のために空間を残す','GridSmashでは提示された全ピースを見てから置きます。今の小さな隙間を埋めると残りを置けなくなることがあります。SortStackの空の管は作業用の場所です。移動先の色と空き容量を確認しましょう。ColorFlowは短い経路が別のペアをふさぐことがあるため、狭い通路や近い端点を合わせて考えます。これらは考えるための目安で、毎回の成功を保証しません。'),
   ('4. 同じ条件で練習する','QuickCalcの同じリンクなら生成値と選択肢順が保たれ、問題が変わる場合より比較しやすくなります。誤答は3秒減り、対戦中の加時やヒントはありません。再挑戦でその問題に慣れるため、初めての友達と練習量まで同じではありません。共有点数は本人申告で、検証済みの大会結果ではなく友好的な招待として使います。'),
   ('5. 自分で決めた地点で休む','一回、一面、ミッションへの一度の挑戦など終了点を決めます。役立った選択と次に変えたい選択を一つずつ振り返りましょう。日次ミッションはUTC午前0時に変わりますが、連続記録は義務ではありません。時間制限に疲れたら別のパズルや休憩を選びます。音や動きを減らす設定を活用し、楽しんで終えたい時に終われる遊び方にしましょう。')
  ],
  'end':'<a href="/games/numvault.html">NumVault</a>や<a href="/games/quickcalc.html?mode=blitz">QuickCalcの30秒対戦</a>で試してください。説明と動作が違う場合は<a href="/ja/contact.html">お問い合わせ</a>から手順をお知らせください。'
 },
 'zh': {
  'old':'益智游戏提升大脑的5种科学方法', 'title':'更愉快地玩PuzzleVault的五个实用方法',
  'description':'设定小目标，读懂反馈，为下一步留空间，用相同条件练习，并在自己选择的节点休息。',
  'intro':'愉快的益智休息不必很长。这些建议针对游戏中如何读信息和选择下一步，并非关于提高智力、记忆容量或健康的医学结论。下一局挑一个方法尝试，不用同时改变所有习惯。',
  'sections':[
   ('1. 每局只选一个目标','QuickCalc有明确的30秒终点，ColorFlow要连接配对，NumVault需要根据反馈推理密码。选择能观察的目标，例如完成一关、减少无用猜测、发现连锁何时就绪。与没有依据的百分位排名相比，回顾自己的选择更有用。成绩保存在当前浏览器，换设备可能看不到过去的纪录。'),
   ('2. 下一次操作前先读反馈','在NumVault中区分位置正确、存在于其他位置和被排除的数字。没有利用信息就重复猜测，只会消耗机会。一般可以保留确认的位置，尝试未确定的位置。允许重复数字的模式下，一次匹配并不能说明该数字总共有几个。PatternPop需要等展示结束，分清真实闪烁和干扰。这些反馈属于当前题目，并不是对一般能力的评价。'),
   ('3. 为下一步留出空间','GridSmash应先看所有待放的形状。容易填满的小空隙可能让剩余形状难以放置。SortStack的空管是临时工作空间，移动前先检查目标颜色与容量。ColorFlow里看似短的路线可能堵住另一对，因此要兼顾狭窄通道和相邻端点。这些只是帮助规划的方法，不保证每局成功。'),
   ('4. 用相同条件练习','相同QuickCalc链接保留题目生成值和选项顺序，比同时更换题目更容易比较表现。答错扣3秒，对决不提供提示和加时。重玩会让你熟悉该套题，不能说明初次接触的朋友有同样练习量。链接分数由玩家自行报告，不是经过核验的比赛结果，适合友好的挑战邀请。'),
   ('5. 在自己选定的节点休息','可以把一次访问定为一局、一关或一次每日任务尝试。结束时回顾一个有效选择和一个想改变的选择。任务在UTC零点更新，但连续记录不是义务。觉得倒计时疲劳时，可以换一种节奏或休息。使用声音和减少动态设置，让游戏舒适，并在想停下时结束。')
  ],
  'end':'在<a href="/games/numvault.html">NumVault</a>或<a href="/games/quickcalc.html?mode=blitz">QuickCalc 30秒挑战</a>中试试。如果说明与实际行为不同，请通过<a href="/zh/contact.html">联系页面</a>反馈复现步骤。'
 },
 'es': {
  'old':'5 Formas Científicamente Comprobadas de Mejorar tu Cerebro con Puzzles', 'title':'Cinco formas prácticas de disfrutar de PuzzleVault',
  'description':'Elige una meta, interpreta las pistas, reserva espacio para el próximo movimiento y practica en condiciones comparables.',
  'intro':'Una pausa de puzles puede ser corta y agradable sin convertirse en un examen. Estas sugerencias tratan de decisiones dentro de PuzzleVault: observar información, probar un movimiento y elegir el siguiente paso. No son pruebas de mejoras en inteligencia, capacidad de memoria o salud. Prueba una idea en tu próxima partida en vez de cambiar todos tus hábitos de golpe.',
  'sections':[
   ('1. Elige una meta para la partida','QuickCalc ofrece un límite claro de 30 segundos. ColorFlow propone conectar parejas y NumVault deducir un código. Elige algo observable: completar un nivel, evitar una suposición innecesaria o reconocer cuándo una cadena está lista. Comparar tus decisiones es más útil que un percentil sin datos. Los registros son locales al navegador, por lo que otro dispositivo puede no tener tu mejor marca.'),
   ('2. Lee la respuesta antes de actuar','En NumVault, distingue números bien colocados, números presentes en otra posición y números descartados. Repetir sin usar esa información consume un intento sin comprobar una posibilidad nueva. Mantén normalmente las posiciones confirmadas y experimenta con las demás. Si el modo permite duplicados, una coincidencia no indica cuántas copias existen. En PatternPop espera a que termine la secuencia y distingue destellos reales de señuelos. La respuesta describe el problema actual, no tu capacidad general.'),
   ('3. Conserva espacio para la siguiente jugada','En GridSmash observa todas las piezas antes de colocar la primera. Rellenar un hueco pequeño puede dejar sin sitio a las restantes. Un tubo vacío de SortStack es espacio de trabajo: comprueba color y capacidad del destino. En ColorFlow una ruta aparentemente corta puede bloquear otra pareja; observa también pasos estrechos y extremos cercanos. Son criterios de planificación, no garantías de éxito en todas las partidas.'),
   ('4. Compara prácticas equivalentes','El mismo enlace de QuickCalc conserva la semilla y el orden de respuestas. Así puedes comparar mejor que si cambian las preguntas y tu rendimiento a la vez. Los errores restan tres segundos; el duelo no permite pistas ni tiempo extra. Repetir familiariza con ese recorrido y no significa que un amigo nuevo haya practicado lo mismo. La puntuación del enlace es declarada por el jugador, no un resultado competitivo verificado. Compártela como una invitación amistosa.'),
   ('5. Termina en un punto elegido por ti','Decide si esta visita será una partida, un nivel o un intento de misión. Al terminar, recuerda una elección útil y otra que cambiarías. Las misiones se renuevan a medianoche UTC, pero la racha no es una obligación. Si el cronómetro cansa, elige otro ritmo o descansa. Ajusta sonido y movimiento para jugar con comodidad. Una buena sesión es la que disfrutas y puedes dejar cuando querías.')
  ],
  'end':'Prueba una idea en <a href="/games/numvault.html">NumVault</a> o en el <a href="/games/quickcalc.html?mode=blitz">duelo de QuickCalc</a>. Si la explicación no coincide con el juego, envía la página y los pasos por <a href="/es/contact.html">contacto</a>.'
 }
}

def refresh():
    registry = (ROOT/'js/blog-data.js').read_text(encoding='utf-8')
    for lang, copy in CONTENT.items():
        target = ROOT/'blog'/('posts' if lang == 'en' else lang)/(SLUG+'.html')
        source = target.read_text(encoding='utf-8')
        source = source.replace(copy['old'],copy['title'])
        source = re.sub(r'(<meta\b(?=[^>]*(?:name="description"|property="og:description"|name="twitter:description"))[^>]*content=")[^"]*',lambda m:m[1]+html.escape(copy['description'],quote=True),source)
        body = '<p>'+html.escape(copy['intro'])+'</p>'+''.join('<h2>'+html.escape(h)+'</h2><p>'+html.escape(p)+'</p>' for h,p in copy['sections'])+'<p>'+copy['end']+'</p>'
        source = re.sub(r'(<article class="blog-content">)[\s\S]*?</article>',lambda m:m[1]+body+'</article>',source,count=1)
        source = re.sub(r'(<div class="blog-post-meta">)[\s\S]*?</div>',lambda m:m[1]+'2026-03-01 · Updated 2026-09-26</div>',source,count=1)
        def schema(match):
            value=json.loads(match[1]); value['headline']=copy['title']; value['description']=copy['description']; value['dateModified']='2026-09-26'
            return '<script type="application/ld+json">'+json.dumps(value,ensure_ascii=False,indent=2)+'</script>'
        source = re.sub(r'<script type="application/ld\+json">([\s\S]*?)</script>',schema,source)
        target.write_text(source,encoding='utf-8')
        registry=registry.replace(copy['old'],copy['title'])
    pattern=r"(slug: '"+SLUG+r"',[\s\S]*?description: )\{[\s\S]*?\}(,[\s\S]*?category: )'science'"
    descriptions='{\n'+',\n'.join('            '+lang+': '+json.dumps(copy['description'],ensure_ascii=False) for lang,copy in CONTENT.items())+'\n        }'
    registry=re.sub(pattern,lambda m:m[1]+descriptions+m[2]+"'tips'",registry,count=1)
    (ROOT/'js/blog-data.js').write_text(registry,encoding='utf-8')
    print('Replaced unsupported health claims in all five article editions and blog registry.')

if __name__ == '__main__': refresh()
