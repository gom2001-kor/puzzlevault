"""Maintain static multilingual articles from reviewed source material.

Run with Python installed. This is an editorial maintenance command,
not a production build dependency: the published site serves ordinary HTML.
"""
from pathlib import Path
import html
import json
import re
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'scripts/content'
LANGS = ('en', 'ko', 'ja', 'zh', 'es')
DATE = '2026-09-26'
VERSION = 17
SITE = 'https://puzzlevault.pages.dev'
GAMES = dict(zip(('numvault','gridsmash','patternpop','sortstack','quickcalc','tileturn','colorflow','pipelink','mergechain','hexmatch'), ('NumVault','GridSmash','PatternPop','SortStack','QuickCalc','TileTurn','ColorFlow','PipeLink','MergeChain','HexMatch')))
ICONS = dict(zip(GAMES, ('🔢','🧱','🧠','📚','⚡','🔄','🎨','🔧','🔮','⬡')))
COPY = {
 'en': dict(home='Home',games='Games',blog='Guides & notes',about='About',privacy='Privacy',terms='Terms',contact='Contact',title='PuzzleVault Guides: Worked Examples for Every Game',intro='See what a move changes before you try it. Explore illustrated examples, compare choices, and put one idea into practice in the game.',directory='Find your game',directoryIntro='Ten board puzzles, ten dedicated guides. Choose a puzzle to see its rules in action.',all='All',tips='Play tips',strategy='Game guides',updates='Project notes',science='Behind the rules',read='Read the guide',published='Published',updated='Updated',minutes='min read',toc='In this guide',more='Continue reading',play='Try these games',editorial='How these guides are made',count='{count} articles',review='Examples are teaching positions unless a specific level is named. The rules and worked results were checked against this version of the game; random and daily boards can differ.',feedback='Found a mismatch? Send the game, mode, page and steps through our contact page.',by='Published by PuzzleVault'),
 'ko': dict(home='홈',games='게임',blog='공략과 이야기',about='소개',privacy='개인정보',terms='이용약관',contact='문의',title='PuzzleVault 게임 공략: 예제로 이해하고 직접 플레이하기',intro='한 수를 두면 무엇이 달라질까요? 그림과 풀이로 선택의 차이를 살펴보고, 게임에서 직접 확인해 보세요.',directory='게임별 공략 찾기',directoryIntro='10개 보드 퍼즐의 규칙과 판단 방법을 예제로 풀었습니다. 플레이 중 막힌 게임을 골라 보세요.',all='전체',tips='플레이 팁',strategy='게임 공략',updates='프로젝트 이야기',science='규칙 이야기',read='공략 읽기',published='처음 게시',updated='내용 수정',minutes='분 읽기',toc='이 글에서 살펴볼 내용',more='함께 읽으면 좋은 글',play='게임에서 직접 해보기',editorial='공략 작성·검토 방법',count='글 {count}개',review='특정 레벨이라고 밝힌 경우를 제외하면, 예제는 설명을 위해 구성한 게임판입니다. 규칙과 풀이 결과는 현재 게임 구현과 대조했으며, 무작위·데일리 게임판은 예제와 다를 수 있습니다.',feedback='게임과 설명이 다르면 문의 페이지에 게임명, 모드, 글 주소와 재현 순서를 알려 주세요.',by='게시: PuzzleVault'),
 'ja': dict(home='ホーム',games='ゲーム',blog='攻略と読みもの',about='紹介',privacy='プライバシー',terms='利用規約',contact='お問い合わせ',title='PuzzleVault攻略：冒険とパズルの実例',intro='一手で何が変わるでしょうか。図と手順で選択を比べ、ゲームの中で確かめてみましょう。',directory='ゲームから攻略を探す',directoryIntro='10種類の盤面パズルのルールと判断を実例で説明します。気になるゲームを選んでください。',all='すべて',tips='遊び方のヒント',strategy='ゲーム攻略',updates='プロジェクトの話',science='ルールのしくみ',read='攻略を読む',published='公開',updated='更新',minutes='分で読めます',toc='この記事の内容',more='あわせて読む',play='ゲームで試す',editorial='記事の作成と確認について',count='{count}件の記事',review='特定のレベルと明記しない限り、図は説明用に組み立てた盤面です。ルールと例の結果は現在のゲームと照合しています。ランダム・デイリー盤面は異なる場合があります。',feedback='説明と動作が違う場合は、ゲーム名、モード、記事のURLと再現手順をお問い合わせからお知らせください。',by='発行：PuzzleVault'),
 'zh': dict(home='首页',games='游戏',blog='攻略与随笔',about='关于',privacy='隐私',terms='条款',contact='联系',title='PuzzleVault游戏攻略：通过实例理解每一步',intro='一步操作会改变什么？用图解比较不同选择，再到游戏中亲手试一试。',directory='按游戏查找攻略',directoryIntro='为10款棋盘益智游戏分别讲解规则与判断方法。选择你正在玩的游戏，查看具体示例。',all='全部',tips='游玩建议',strategy='游戏攻略',updates='项目随笔',science='规则解析',read='阅读攻略',published='首次发布',updated='内容更新',minutes='分钟阅读',toc='本文内容',more='继续阅读',play='到游戏中试试',editorial='攻略的编写与核对方法',count='{count}篇文章',review='除非明确标注具体关卡，示例均为讲解而构造的棋盘。规则和示例结果已与当前游戏实现核对；随机关卡和每日棋盘可能不同。',feedback='若说明与游戏不符，请通过联系页面提供游戏名、模式、文章地址和复现步骤。',by='发布：PuzzleVault'),
 'es': dict(home='Inicio',games='Juegos',blog='Guías y notas',about='Acerca de',privacy='Privacidad',terms='Condiciones',contact='Contacto',title='Guías de PuzzleVault: aventuras y ejemplos de puzles',intro='¿Qué cambia con cada movimiento? Compara opciones en los diagramas, sigue los ejemplos y prueba una idea dentro del juego.',directory='Encuentra tu juego',directoryIntro='Diez puzles de tablero con una guía propia. Elige un puzzle para ver sus reglas en acción.',all='Todo',tips='Consejos de juego',strategy='Guías de juego',updates='Notas del proyecto',science='Cómo funcionan las reglas',read='Leer la guía',published='Publicado',updated='Actualizado',minutes='min de lectura',toc='En esta guía',more='Sigue leyendo',play='Pruébalo en estos juegos',editorial='Cómo elaboramos las guías',count='{count} artículos',review='Salvo que se indique un nivel concreto, los diagramas son posiciones construidas para explicar las reglas. Las reglas y los resultados se contrastaron con esta versión del juego; los tableros aleatorios y diarios pueden diferir.',feedback='Si algo no coincide, envía el juego, modo, página y pasos mediante nuestra página de contacto.',by='Publica: PuzzleVault')
}

def esc(value):
    return html.escape(str(value), quote=True)

def blog_root(lang):
    return '/blog/' if lang == 'en' else f'/blog/{lang}/'

def post_url(slug, lang):
    return ('/blog/posts/' if lang == 'en' else blog_root(lang)) + slug + '.html'

def support(page, lang):
    return ('/' if lang == 'en' else f'/{lang}/') + page + '.html'

def head(lang,title,description,url,alternates,structured=None):
    links = ''.join(f'<link rel="alternate" hreflang="{code}" href="{SITE}{path}">\n' for code,path in alternates.items())
    data = '<script type="application/ld+json">'+json.dumps(structured,ensure_ascii=False).replace('</','<\\/')+'</script>' if structured else ''
    return f'''<!DOCTYPE html>
<html lang="{lang}" translate="no" class="notranslate">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="google" content="notranslate"><meta name="google-adsense-account" content="ca-pub-6035096210993315">
<title>{esc(title)}</title><meta name="description" content="{esc(description)}">
<link rel="canonical" href="{SITE}{url}">{links}<link rel="alternate" hreflang="x-default" href="{SITE}{alternates['en']}">
<meta name="theme-color" content="#2563EB"><link rel="icon" href="/favicon.ico?v=2"><link rel="manifest" href="/manifest.json">
<meta property="og:type" content="{'article' if structured and structured.get('@type')=='BlogPosting' else 'website'}">
<meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(description)}"><meta property="og:url" content="{SITE}{url}">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="{esc(title)}"><meta name="twitter:description" content="{esc(description)}">
<link rel="stylesheet" href="/css/global.css?v={VERSION}"><link rel="stylesheet" href="/css/site-quality.css?v={VERSION}"><link rel="stylesheet" href="/css/blog.css?v={VERSION}">
<script defer src="/js/privacy-controls.js?v={VERSION}"></script>{data}
</head><body>
'''

def nav(lang):
    c=COPY[lang]; home='/' if lang=='en' else f'/{lang}/'
    return f'<header id="pv-header"><nav class="pv-static-nav" aria-label="{c["home"]}"><a href="{home}">🧩 PuzzleVault</a><a href="{home}#games">{c["games"]}</a><a href="{blog_root(lang)}">{c["blog"]}</a><a href="{support("about",lang)}">{c["about"]}</a></nav></header>\n'

def foot(lang):
    c=COPY[lang]
    links=''.join(f'<a href="{support(page,lang)}">{c[page]}</a>' for page in ('about','privacy','terms','contact'))
    return f'''<footer id="pv-footer"><nav class="pv-static-footer">{links}<a href="{blog_root(lang)}">{c['blog']}</a></nav></footer>
<script src="/js/i18n.js?v={VERSION}"></script><script src="/js/common.js?v={VERSION}"></script><script src="/js/blog-ui.js?v={VERSION}"></script>
</body></html>\n'''

def card(post,lang):
    c=COPY[lang]; p=post['locales'][lang]
    return f'''<a class="blog-card" data-category="{post['category']}" href="{post_url(post['slug'],lang)}"><span class="blog-card-category">{c[post['category']]}</span><h2>{esc(p['title'])}</h2><p class="blog-card-desc">{esc(p['description'])}</p><span class="blog-card-meta">{c['updated']} <time datetime="{DATE}">{DATE}</time> · {post['readTime']} {c['minutes']}</span><span class="blog-card-read">{c['read']} →</span></a>'''

def toc(body,lang):
    headings=[]
    def heading(match):
        number=len(headings)+1; label=re.sub('<[^>]+>','',match.group(1))
        headings.append((f'section-{number}',label))
        return f'<h2 id="section-{number}">{match.group(1)}</h2>'
    body=re.sub(r'<h2(?:\s[^>]*)?>([\s\S]*?)</h2>',heading,body)
    contents=''.join(f'<li><a href="#{ident}">{label}</a></li>' for ident,label in headings)
    return f'<nav class="blog-toc" aria-label="{COPY[lang]["toc"]}"><h2>{COPY[lang]["toc"]}</h2><ol>{contents}</ol></nav>\n'+body

def localize_game_links(body,lang):
    def replace(match):
        url=urlsplit(html.unescape(match[1]))
        params=[(key,value) for key,value in parse_qsl(url.query,keep_blank_values=True) if key!='lang']
        params.append(('lang',lang))
        return 'href="'+esc(urlunsplit(('', '', url.path, urlencode(params), url.fragment)))+'"'
    return re.sub(r'href="(/games/[^"]+)"',replace,body)

def render_post(post,lang,posts):
    c=COPY[lang]; p=post['locales'][lang]; slug=post['slug']; url=post_url(slug,lang)
    schema={'@context':'https://schema.org','@type':'BlogPosting','headline':p['title'],'description':p['description'],'inLanguage':lang,'datePublished':post['date'],'dateModified':DATE,'author':{'@type':'Organization','name':'PuzzleVault','url':SITE+support('about',lang)},'publisher':{'@type':'Organization','name':'PuzzleVault'},'mainEntityOfPage':SITE+url}
    result=head(lang,p['title']+' | PuzzleVault',p['description'],url,{l:post_url(slug,l) for l in LANGS},schema)+nav(lang)
    result+=f'''<main><header class="blog-post-header"><nav class="blog-breadcrumb" aria-label="{c['blog']}"><a href="{blog_root(lang)}">← {c['blog']}</a></nav><span class="blog-card-category">{c[post['category']]}</span><h1>{esc(p['title'])}</h1><p class="blog-post-description">{esc(p['description'])}</p><p class="blog-post-meta">{c['by']} · {post['readTime']} {c['minutes']}<br>{c['published']} <time datetime="{post['date']}">{post['date']}</time> · {c['updated']} <time datetime="{DATE}">{DATE}</time><br><a href="{blog_root(lang)}editorial.html">{c['editorial']}</a></p></header>
<article class="blog-content">{toc(localize_game_links(p['body'],lang),lang)}
'''
    if post.get('game') in GAMES:
        result+=f'<aside class="blog-review-note"><p>{c["review"]}</p><p><a href="{support("contact",lang)}">{c["feedback"]}</a></p></aside>'
    result+='</article>\n'
    games=[g for g in post['tags'] if g in GAMES]
    for game in GAMES:
        if len(games)>=2: break
        if game not in games: games.append(game)
    result+=f'<section class="blog-related"><h2>{c["play"]}</h2><div class="related-games-grid">'
    result+=''.join(f'<a class="related-game-card" href="/games/{game}.html?lang={lang}"><span class="related-game-name">{ICONS[game]} {GAMES[game]} →</span></a>' for game in games[:3])+'</div></section>'
    related=sorted([other for other in posts if other['slug']!=slug],key=lambda other:(-len(set(other['tags'])&set(post['tags'])),other['slug']))[:2]
    result+=f'<section class="blog-related"><h2>{c["more"]}</h2><div class="related-posts-grid">'
    result+=''.join(f'<a class="related-post-card" href="{post_url(other["slug"],lang)}"><div class="related-post-title">{esc(other["locales"][lang]["title"])}</div><p class="related-post-desc">{esc(other["locales"][lang]["description"])}</p></a>' for other in related)+'</div></section></main>'
    return result+foot(lang)

ADVENTURE_COPY = {'en': ['Explore the two 3D adventures', 'Read the controls and routes on the game pages, then begin your journey.', 'Mosslight Wardens: gardens, combat and upgrades', 'Cloudweft Passage: changing bridges and island checkpoints'], 'ko': ['새로운 3D 모험 게임 두 가지', '각 게임의 조작법과 탐험 규칙을 살펴본 뒤 직접 여정을 시작해 보세요.', '이끼빛 수호대: 빛의 정원·전투·능력 성장', '구름결 여정: 해와 달의 다리·섬 체크포인트'], 'ja': ['2つの3Dアドベンチャーへ', 'ゲームページで操作と探索のルールを読み、旅を始めましょう。', 'Mosslight Wardens：光の庭・戦闘・能力選択', 'Cloudweft Passage：切り替わる橋と島のチェックポイント'], 'zh': ['探索两款3D冒险', '先在游戏页面了解操作与探索规则，再开始自己的旅程。', 'Mosslight Wardens：光之花园、战斗与升级', 'Cloudweft Passage：切换桥梁与浮岛检查点'], 'es': ['Explora las dos aventuras 3D', 'Lee los controles y las reglas en cada juego antes de iniciar tu viaje.', 'Mosslight Wardens: jardines, combate y mejoras', 'Cloudweft Passage: puentes y puntos de control']}

def render_adventures(lang):
    title, intro, mosslight, cloudweft = ADVENTURE_COPY[lang]
    return f'<section class="blog-related"><h2>{title}</h2><p>{intro}</p><div class="related-posts-grid"><a class="related-post-card" href="/games/mosslight.html?lang={lang}#guide">{mosslight} →</a><a class="related-post-card" href="/games/cloudweft.html?lang={lang}#guide">{cloudweft} →</a></div></section>'

def render_index(posts,lang):
    c=COPY[lang]; url=blog_root(lang)
    schema={'@context':'https://schema.org','@type':'CollectionPage','name':c['title'],'inLanguage':lang,'url':SITE+url}
    result=head(lang,c['title'],c['intro'],url,{l:blog_root(l) for l in LANGS},schema)+nav(lang)
    result+=f'<main class="blog-shell"><header class="blog-hero"><p class="blog-eyebrow">PUZZLEVAULT / PLAY & LEARN</p><h1>{c["title"]}</h1><p>{c["intro"]}</p><a class="blog-editorial-link" href="{url}editorial.html">{c["editorial"]} →</a></header>{render_adventures(lang)}<section class="guide-directory"><h2>{c["directory"]}</h2><p>{c["directoryIntro"]}</p><nav aria-label="{c["directory"]}">'
    for game in GAMES:
        guide=next((p for p in posts if p.get('game')==game),None)
        if guide:
            result+=f'<a href="{post_url(guide["slug"],lang)}"><span aria-hidden="true">{ICONS[game]}</span>{GAMES[game]}</a>'
    result+='</nav></section><div class="blog-tabs" id="blog-tabs" hidden>'
    for category in ('','strategy','tips','updates','science'):
        if category and not any(p['category']==category for p in posts):continue
        result+=f'<button type="button" data-category="{category}" aria-pressed="{str(category=="").lower()}">{c[category or "all"]}</button>'
    result+=f'</div><p id="blog-result-count" class="blog-result-count" aria-live="polite" data-template="{c["count"]}">{c["count"].replace("{count}",str(len(posts)))}</p><div class="blog-grid" id="blog-grid">'
    result+='\n'.join(card(p,lang) for p in posts)+'</div></main>'+foot(lang)
    return result

def render_editorial(lang):
    p=json.loads((CONTENT/'editorial.json').read_text(encoding='utf-8'))[lang]
    c=COPY[lang]; url=blog_root(lang)+'editorial.html'
    schema={'@context':'https://schema.org','@type':'WebPage','name':p['title'],'inLanguage':lang,'dateModified':DATE,'url':SITE+url}
    result=head(lang,p['title']+' | PuzzleVault',p['description'],url,{l:blog_root(l)+'editorial.html' for l in LANGS},schema)+nav(lang)
    result+=f'<main><header class="blog-post-header"><nav class="blog-breadcrumb"><a href="{blog_root(lang)}">← {c["blog"]}</a></nav><h1>{p["title"]}</h1><p class="blog-post-meta">{c["updated"]} <time datetime="{DATE}">{DATE}</time></p></header><article class="blog-content">{p["body"]}</article></main>'
    return result+foot(lang)

def update_registry(posts):
    path=ROOT/'js/blog-data.js'; original=path.read_text(encoding='utf-8')
    entries=[]
    for p in posts:
        entries.append(dict(slug=p['slug'],title={l:p['locales'][l]['title'] for l in LANGS},description={l:p['locales'][l]['description'] for l in LANGS},date=p['date'],updated=DATE,category=p['category'],tags=p['tags'],readTime=p['readTime']))
    new='/* Static article registry. Maintain sources in scripts/content and run scripts/refresh-blog.py. */\nconst BLOG_POSTS = '+json.dumps(entries,ensure_ascii=False,indent=2)+';'
    helpers=original[original.index('/**'):]
    path.write_text(new+'\n\n'+helpers,encoding='utf-8')

def update_game_links(posts):
    corrections=json.loads((CONTENT/'pipelink-rule-corrections.json').read_text(encoding='utf-8'))
    for lang in LANGS:
        path=ROOT/f'lang/{lang}.json'; data=json.loads(path.read_text(encoding='utf-8-sig'))
        data['games']['pipelink'].update(corrections[lang])
        for key in ('tips','strategy','updates','science'):
            data['blog'][key]=COPY[lang][key]
        for p in posts:
            if p.get('game') not in GAMES:continue
            data['games'][p['game']]['articleGuide']=f'<a href="{post_url(p["slug"],lang)}">{esc(p["locales"][lang]["title"])} →</a>'
        path.write_text(json.dumps(data,ensure_ascii=False,indent=4)+'\n',encoding='utf-8')
    for p in posts:
        game=p.get('game')
        if game not in GAMES:continue
        path=ROOT/f'games/{game}.html'; source=path.read_text(encoding='utf-8')
        source=re.sub(r'\s*<p class="guide-article-link"[\s\S]*?</p>','',source)
        pattern=r'(<section\b[^>]*class="game-guide[^>]*>[\s\S]*?)(</section>)'
        link=f'<p class="guide-article-link" data-i18n-html="games.{game}.articleGuide"><a href="{post_url(p["slug"],"en")}">{esc(p["locales"]["en"]["title"])} →</a></p>'
        source,count=re.subn(pattern,lambda m:m[1]+link+'\n'+m[2],source,count=1)
        if count!=1:raise ValueError(f'Missing guide section: {game}')
        if game=='pipelink':
            for key,value in corrections['en'].items():
                source=re.sub(r'(<(?:p|summary)\b[^>]*data-i18n="games\.pipelink\.'+key+r'"[^>]*>)[\s\S]*?(</(?:p|summary)>)',lambda m:m[1]+esc(value)+m[2],source)
        path.write_text(source,encoding='utf-8')

def update_sitemap(paths):
    path=ROOT/'sitemap.xml'; source=path.read_text(encoding='utf-8'); existing=set(re.findall(r'<loc>(.*?)</loc>',source))
    new=''.join(f'  <url><loc>{SITE}{url}</loc><lastmod>{DATE}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n' for url in paths if SITE+url not in existing)
    path.write_text(source.replace('</urlset>',new+'</urlset>'),encoding='utf-8')

def main():
    posts=[]
    for name in ('general-posts','existing-guides','cognitive-guides','spatial-guides'):
        path=CONTENT/(name+'.json')
        if not path.exists():raise SystemExit(f'Waiting for reviewed content: {path.name}')
        posts+=json.loads(path.read_text(encoding='utf-8'))
    for name in ('history-post','welcome-post'):
        path=CONTENT/(name+'.json')
        if not path.exists():raise SystemExit(f'Missing reviewed content: {path.name}')
        posts.append(json.loads(path.read_text(encoding='utf-8')))
    if len({p['slug'] for p in posts})!=len(posts):raise ValueError('Duplicate article slug')
    for p in posts:
        if set(p['locales'])!=set(LANGS):raise ValueError(f'Incomplete translations: {p["slug"]}')
    posts.sort(key=lambda p:(p['date'],p['slug']),reverse=True)
    paths=[]
    for lang in LANGS:
        for p in posts:
            url=post_url(p['slug'],lang); target=ROOT/url.lstrip('/'); target.parent.mkdir(exist_ok=True,parents=True)
            target.write_text(render_post(p,lang,posts),encoding='utf-8'); paths.append(url)
        target=ROOT/blog_root(lang).lstrip('/')/'index.html'; target.write_text(render_index(posts,lang),encoding='utf-8')
        editorial=blog_root(lang)+'editorial.html'; (ROOT/editorial.lstrip('/')).write_text(render_editorial(lang),encoding='utf-8'); paths.append(editorial)
    update_registry(posts); update_game_links(posts); update_sitemap(paths)
    print(f'Rendered {len(posts)} topics in {len(LANGS)} languages with static lists, related links and game links.')

if __name__=='__main__':
    main()
