/* Shareable QuickCalc courses. Scores in links are friendly, self-reported targets. */
(function (root) {
    'use strict';
    const MAX_SEED = 2147483646;
    const MAX_SCORE = 1000000000;
    const copy = {
        en: {
            classic: 'Classic', daily: 'Daily', timeattack: '2-minute race', blitz: '30s duel',
            title: 'Your next 30 seconds', invitation: 'A friend set the score to beat', target: 'Target: {score} points',
            rules: 'Same questions. Same 30 seconds. Wrong answers cost 3 seconds. No hints or time boosts.',
            local: 'Friendly challenge · scores are self-reported, not verified.', start: 'Let’s play',
            classicTitle: 'Three hearts. How far can you go?', classicRules: 'Choose the answer. Build a streak. Each mistake costs a heart.',
            dailyTitle: 'Today’s shared course', dailyRules: 'The same question sequence for everyone today (UTC). Replay to practice.',
            raceTitle: 'Two minutes to find your rhythm', raceRules: 'Build your combo. Every wrong answer costs 3 seconds.',
            ready: 'Ready?', restart: 'Restart this round?', score: 'Score', correct: 'Correct', accuracy: 'Accuracy', combo: 'Best streak',
            finished: 'Round complete!', beat: 'You beat the target! 🎉', tie: 'A perfect tie! 🤝', close: '{points} points to the target',
            share: 'Share result', challenge: 'Challenge a friend', replay: 'Replay this course', again: 'Play again', fresh: 'New 30s course',
            shareLine: 'Can you beat my {score} points in 30 seconds?', sameCourse: 'Same questions · no hints · wrong = −3s',
            closeButton: 'Close result', time: 'Time left', hintsOff: 'Duels use 30 seconds with no hints.', boostUsed: 'Time boost already used this round.',
            boost: '+5 seconds! One free boost per round.', helpTitle: 'How to play', help: 'Tap the correct answer, or use keys 1–4. Correct answers build a combo for more points. Classic and Daily give you 3 hearts and a timer per question. In timed modes, mistakes cost 3 seconds. A 30s duel uses a fixed course with no hints or time boosts. Share your result to send that exact course to a friend.',
            soundOn: 'Sound on', soundOff: 'Sound off', duelLabel: 'FRIEND CHALLENGE', soloLabel: 'QUICK CHALLENGE',
            stats: 'Statistics', played: 'Played', best: 'Best score', addition: 'Addition', subtraction: 'Subtraction', multiplication: 'Multiplication', division: 'Division', roulette: 'Operator roulette', expert: 'Expert roulette', step: '2-step', hardAddition: 'Hard addition', hardSubtraction: 'Hard subtraction'
        },
        ko: {
            classic: '클래식', daily: '오늘의 도전', timeattack: '2분 레이스', blitz: '30초 대결',
            title: '딱 30초, 어디까지 풀 수 있을까?', invitation: '친구가 도전장을 보냈어요', target: '목표: {score}점',
            rules: '같은 문제, 같은 30초. 오답은 3초 차감. 힌트와 시간 추가 없이 승부해요.',
            local: '친선 대결 · 공유 점수는 본인 기록이며 검증되지 않았어요.', start: '도전 시작',
            classicTitle: '하트 3개로 어디까지 갈까요?', classicRules: '정답을 골라 연속 기록을 쌓으세요. 오답마다 하트가 줄어요.',
            dailyTitle: '오늘 모두가 푸는 같은 문제', dailyRules: '매일 UTC 기준으로 새 문제가 열려요. 다시 풀며 연습할 수 있어요.',
            raceTitle: '2분 동안 나만의 리듬을 찾아요', raceRules: '연속 정답에 도전하세요. 오답마다 3초가 줄어요.',
            ready: '준비됐나요?', restart: '이번 판을 다시 시작할까요?', score: '점수', correct: '정답', accuracy: '정확도', combo: '최고 연속 정답',
            finished: '도전 완료!', beat: '친구의 기록을 넘었어요! 🎉', tie: '정확히 동점이에요! 🤝', close: '목표까지 {points}점',
            share: '기록 공유', challenge: '친구에게 도전장', replay: '같은 문제 다시 도전', again: '한 번 더', fresh: '새로운 30초 도전',
            shareLine: '30초 안에 내 기록 {score}점을 넘을 수 있을까?', sameCourse: '같은 문제 · 힌트 없음 · 오답 −3초',
            closeButton: '결과 닫기', time: '남은 시간', hintsOff: '30초 대결에는 힌트와 시간 추가가 없어요.', boostUsed: '이번 판의 시간 추가를 이미 사용했어요.',
            boost: '+5초! 한 판에 한 번 무료로 추가돼요.', helpTitle: '게임 방법', help: '정답을 누르거나 숫자 키 1~4를 사용하세요. 연속 정답으로 보너스 점수를 쌓아요. 클래식과 오늘의 도전은 하트 3개와 문제별 제한 시간이 있어요. 시간제 모드는 오답마다 3초를 잃어요. 30초 대결은 힌트와 시간 추가 없이 같은 문제로 겨뤄요. 결과를 공유하면 친구도 같은 문제에 도전할 수 있어요.',
            soundOn: '소리 켜짐', soundOff: '소리 꺼짐', duelLabel: '친구의 도전장', soloLabel: '짧고 짜릿한 도전',
            stats: '통계', played: '플레이', best: '최고 점수', addition: '덧셈', subtraction: '뺄셈', multiplication: '곱셈', division: '나눗셈', roulette: '연산자 찾기', expert: '고급 연산자 찾기', step: '두 단계 계산', hardAddition: '고급 덧셈', hardSubtraction: '고급 뺄셈'
        },
        ja: {
            classic: 'クラシック', daily: '今日の挑戦', timeattack: '2分レース', blitz: '30秒対決', title: '30秒でどこまで解ける？', invitation: '友達からの挑戦状', target: '目標：{score}点',
            rules: '同じ問題、同じ30秒。ミスは3秒減点。ヒント・時間追加なし。', local: '友達との対決 · 共有スコアは自己申告で未検証です。', start: '挑戦する',
            classicTitle: 'ハート3つでどこまで進める？', classicRules: '正解を選んで連続記録を伸ばそう。ミスするとハートが減ります。', dailyTitle: '今日みんなが解く問題', dailyRules: '毎日UTC基準で問題が更新。繰り返し練習できます。', raceTitle: '2分でリズムをつかもう', raceRules: '連続正解を目指そう。ミスは3秒減ります。', ready: '準備はいい？', restart: 'このラウンドを再開しますか？', score: 'スコア', correct: '正解', accuracy: '正解率', combo: '最高連続正解', finished: '挑戦完了！', beat: '目標を超えた！🎉', tie: '引き分け！🤝', close: '目標まであと{points}点', share: '結果を共有', challenge: '友達に挑戦状', replay: '同じ問題で再挑戦', again: 'もう一度', fresh: '新しい30秒コース', shareLine: '30秒で私の{score}点を超えられる？', sameCourse: '同じ問題 · ヒントなし · ミス −3秒', closeButton: '結果を閉じる', time: '残り時間', hintsOff: '30秒対決ではヒントと時間追加は使えません。', boostUsed: 'このラウンドの時間追加は使用済みです。', boost: '+5秒！1ラウンド1回無料。', helpTitle: '遊び方', help: '正解をタップするか、キー1〜4を押します。連続正解で得点アップ。クラシックと今日の挑戦はハート3つと問題別の制限時間があります。時間制ではミスで3秒減少。30秒対決は同じ問題でヒント・時間追加なし。結果を共有すると友達も同じ問題で遊べます。', soundOn: 'サウンドON', soundOff: 'サウンドOFF', duelLabel: '友達の挑戦', soloLabel: 'クイックチャレンジ', stats: '統計', played: 'プレイ数', best: '最高点', addition: '足し算', subtraction: '引き算', multiplication: '掛け算', division: '割り算', roulette: '演算子探し', expert: '上級演算子探し', step: '2段階計算', hardAddition: '上級足し算', hardSubtraction: '上級引き算'
        },
        zh: {
            classic: '经典', daily: '每日挑战', timeattack: '2分钟竞速', blitz: '30秒对决', title: '30秒，你能答对几题？', invitation: '好友发来了挑战', target: '目标：{score}分', rules: '相同题目，相同30秒。答错扣3秒。无提示，无加时。', local: '好友挑战 · 分享分数由玩家自报，未经验证。', start: '开始挑战', classicTitle: '三颗心，能走多远？', classicRules: '选择正确答案，积累连胜。每次答错失去一颗心。', dailyTitle: '今天大家的同一套题', dailyRules: '每天按UTC更新时间，可重复练习。', raceTitle: '用两分钟找到节奏', raceRules: '挑战连续答对，每次答错扣3秒。', ready: '准备好了吗？', restart: '重新开始这一局？', score: '分数', correct: '答对', accuracy: '正确率', combo: '最高连对', finished: '挑战完成！', beat: '超越目标了！🎉', tie: '平分！🤝', close: '离目标还差{points}分', share: '分享成绩', challenge: '挑战好友', replay: '重玩相同题目', again: '再来一局', fresh: '新的30秒挑战', shareLine: '30秒内能超过我的{score}分吗？', sameCourse: '相同题目 · 无提示 · 答错 −3秒', closeButton: '关闭结果', time: '剩余时间', hintsOff: '30秒对决不能使用提示或加时。', boostUsed: '本局加时已使用。', boost: '+5秒！每局免费一次。', helpTitle: '玩法', help: '点击正确答案，或使用数字键1–4。连续答对可获得加分。经典和每日挑战有三颗心和每题限时。计时模式答错扣3秒。30秒对决使用相同题目，无提示或加时。分享结果即可邀请好友挑战相同题目。', soundOn: '声音已开启', soundOff: '声音已关闭', duelLabel: '好友挑战', soloLabel: '快速挑战', stats: '统计', played: '游玩次数', best: '最高分', addition: '加法', subtraction: '减法', multiplication: '乘法', division: '除法', roulette: '寻找运算符', expert: '高级运算符', step: '两步运算', hardAddition: '高级加法', hardSubtraction: '高级减法'
        },
        es: {
            classic: 'Clásico', daily: 'Diario', timeattack: 'Carrera de 2 min', blitz: 'Duelo de 30 s', title: '¿Hasta dónde llegas en 30 segundos?', invitation: 'Un amigo te ha retado', target: 'Objetivo: {score} puntos', rules: 'Mismas preguntas, mismos 30 segundos. Cada error resta 3 segundos. Sin pistas ni tiempo extra.', local: 'Reto amistoso · las puntuaciones compartidas no están verificadas.', start: 'Jugar', classicTitle: 'Tres corazones. ¿Hasta dónde llegas?', classicRules: 'Elige la respuesta y encadena aciertos. Cada error cuesta un corazón.', dailyTitle: 'El recorrido de hoy para todos', dailyRules: 'Las mismas preguntas para todos, renovadas a diario (UTC). Repite para practicar.', raceTitle: 'Dos minutos para encontrar tu ritmo', raceRules: 'Encadena aciertos. Cada error resta 3 segundos.', ready: '¿Listo?', restart: '¿Reiniciar esta ronda?', score: 'Puntos', correct: 'Aciertos', accuracy: 'Precisión', combo: 'Mejor racha', finished: '¡Ronda completada!', beat: '¡Superaste el objetivo! 🎉', tie: '¡Empate! 🤝', close: 'Faltan {points} puntos para el objetivo', share: 'Compartir resultado', challenge: 'Retar a un amigo', replay: 'Repetir recorrido', again: 'Otra vez', fresh: 'Nuevo recorrido de 30 s', shareLine: '¿Puedes superar mis {score} puntos en 30 segundos?', sameCourse: 'Mismas preguntas · sin pistas · error −3 s', closeButton: 'Cerrar resultado', time: 'Tiempo restante', hintsOff: 'Los duelos duran 30 segundos, sin pistas ni tiempo extra.', boostUsed: 'Ya usaste el tiempo extra de esta ronda.', boost: '¡+5 segundos! Una ayuda gratis por ronda.', helpTitle: 'Cómo jugar', help: 'Toca la respuesta correcta o usa las teclas 1–4. Encadena aciertos para sumar más puntos. Clásico y Diario dan tres corazones y un tiempo por pregunta. En los modos cronometrados, cada error resta 3 segundos. El duelo de 30 s tiene un recorrido fijo, sin pistas ni tiempo extra. Comparte el resultado para enviar ese mismo recorrido a un amigo.', soundOn: 'Sonido activado', soundOff: 'Sonido desactivado', duelLabel: 'RETO DE UN AMIGO', soloLabel: 'RETO RÁPIDO', stats: 'Estadísticas', played: 'Partidas', best: 'Mejor puntuación', addition: 'Suma', subtraction: 'Resta', multiplication: 'Multiplicación', division: 'División', roulette: 'Adivina el operador', expert: 'Operador experto', step: 'Dos pasos', hardAddition: 'Suma avanzada', hardSubtraction: 'Resta avanzada'
        }
    };

    Object.assign(copy.en, { save: 'Save score card', rouletteHelp: 'From question 11, some questions hide one operator. Choose +, −, × or ÷. These answers earn double points. Hints are available outside duels.' });
    Object.assign(copy.ko, { save: '기록 카드 저장', rouletteHelp: '11번째 문제부터 일부 문제의 연산자가 숨겨져요. +, −, ×, ÷ 중 하나를 고르세요. 맞히면 점수가 두 배예요. 대결 외의 모드에서는 힌트도 사용할 수 있어요.' });
    Object.assign(copy.ja, { save: 'スコアカードを保存', rouletteHelp: '11問目から、一部の問題で演算子が隠れます。+、−、×、÷から選んでください。正解すると得点が2倍。対決以外ではヒントも使えます。' });
    Object.assign(copy.zh, { save: '保存成绩卡', rouletteHelp: '第11题起，部分题目会隐藏一个运算符。从+、−、×、÷中选择，答对得双倍分。对决以外的模式可以使用提示。' });
    Object.assign(copy.es, { save: 'Guardar tarjeta', rouletteHelp: 'Desde la pregunta 11, algunas preguntas ocultan un operador. Elige +, −, × o ÷ para ganar el doble de puntos. Puedes usar pistas fuera de los duelos.' });

    function integer(value, min, max) {
        if (typeof value !== 'string' || !/^(0|[1-9]\d{0,9})$/.test(value)) return null;
        const n = Number(value);
        return Number.isSafeInteger(n) && n >= min && n <= max ? n : null;
    }
    function parse(search) {
        const params = new URLSearchParams(search);
        const requested = params.get('mode');
        const mode = ['classic', 'daily', 'timeattack', 'blitz'].includes(requested) ? requested : 'classic';
        if (mode !== 'blitz' || params.getAll('seed').length !== 1) return { mode, seed: null, target: null };
        const seed = integer(params.get('seed'), 1, MAX_SEED);
        const target = seed !== null && params.getAll('target').length === 1 ? integer(params.get('target'), 0, MAX_SCORE) : null;
        return { mode, seed, target };
    }
    function buildURL(base, seed, score) {
        if (integer(String(seed), 1, MAX_SEED) === null || integer(String(score), 0, MAX_SCORE) === null) throw new RangeError('Invalid challenge');
        const url = new URL('/games/quickcalc.html', base);
        url.search = new URLSearchParams({ mode: 'blitz', seed: String(seed), target: String(score) }).toString();
        return url.href;
    }
    function newSeed() {
        if (root.crypto && root.crypto.getRandomValues) {
            const values = new Uint32Array(1);
            root.crypto.getRandomValues(values);
            return values[0] % MAX_SEED + 1;
        }
        return Math.floor(Math.random() * MAX_SEED) + 1;
    }
    function t(key, values, lang) {
        const selected = lang || (typeof I18n !== 'undefined' ? I18n.currentLang : 'en');
        let value = (copy[selected] || copy.en)[key] || copy.en[key] || key;
        Object.entries(values || {}).forEach(([k, v]) => { value = value.replaceAll('{' + k + '}', String(v)); });
        return value;
    }
    root.PVDuel = { parse, buildURL, newSeed, t };
    if (typeof module !== 'undefined' && module.exports) module.exports = root.PVDuel;
})(typeof window !== 'undefined' ? window : globalThis);
