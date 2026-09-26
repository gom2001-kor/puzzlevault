"""Apply shared static navigation, privacy loading, and honest metadata to public HTML."""
from pathlib import Path
import html
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
GAMES = [('numvault','🔢','NumVault'),('gridsmash','🧱','GridSmash'),('patternpop','🧠','PatternPop'),('sortstack','📚','SortStack'),('quickcalc','⚡','QuickCalc'),('tileturn','🔄','TileTurn'),('colorflow','🎨','ColorFlow'),('pipelink','🔧','PipeLink'),('mergechain','🔮','MergeChain'),('hexmatch','⬡','HexMatch')]

def harden(include_games=True):
    count = 0
    for path in ROOT.rglob('*.html'):
        relative = path.relative_to(ROOT)
        if relative.parts[0] in ('.git','.agent','docs','tests','scripts') or path.name in ('solution.html','_template.html'):
            continue
        if not include_games and relative.parts[0] == 'games':
            continue
        source = path.read_text(encoding='utf-8')
        lang_match = re.search(r'<html[^>]*lang="([^"]+)"', source)
        lang = lang_match[1] if lang_match else 'en'
        if lang not in ('en','ko','ja','zh','es'): lang = 'en'
        strings = json.loads((ROOT/'lang'/f'{lang}.json').read_text(encoding='utf-8'))
        common = strings['common']
        base = '/' if lang == 'en' else '/' + lang + '/'
        blog = '/blog/' if lang == 'en' else '/blog/' + lang + '/'
        def strip_tracking(match):
            script = match[0]
            return '' if any(term in script for term in ('pagead2.googlesyndication.com','googletagmanager.com/gtag','gtag(\'config\'','clarity.ms/tag/')) else script
        source = re.sub(r'<script\b[^>]*>[\s\S]*?</script>', strip_tracking, source)
        if '/js/privacy-controls.js' not in source:
            source = source.replace('</head>', '    <link rel="stylesheet" href="/css/site-quality.css?v=14">\n    <script defer src="/js/privacy-controls.js?v=14"></script>\n</head>')
        nav = f'<header id="pv-header"><nav class="pv-static-nav" aria-label="{html.escape(common["home"])}"><a href="{base}">🧩 PuzzleVault</a><a href="{base}#games">{common["games"]}</a><a href="{blog}">{common["blog"]}</a><a href="{base}about.html">{common["about"]}</a></nav></header>'
        source = re.sub(r'<header\b[^>]*id="pv-header"[^>]*>[\s\S]*?</header>', lambda _: nav, source)
        links = ''.join(f'<a href="{base}{name}.html">{common[name]}</a>' for name in ('about','privacy','terms','contact'))
        footer = f'<footer id="pv-footer"><nav class="pv-static-footer">{links}<a href="{blog}">{common["blog"]}</a></nav></footer>'
        source = re.sub(r'<footer\b[^>]*id="pv-footer"[^>]*>[\s\S]*?</footer>', lambda _: footer, source)
        if path.name == 'index.html' and relative.parts[0] != 'blog':
            cards = ''.join(f'<a class="game-card-link" href="/games/{game_id}.html"><div class="game-card-icon" aria-hidden="true">{emoji}</div><div class="game-card-body"><div class="game-card-name">{name}</div><div class="game-card-desc" data-i18n="games.{game_id}.tagline">{html.escape(strings["games"][game_id]["tagline"])}</div></div><div class="game-card-play">{common["play"]} ▸</div></a>' for game_id,emoji,name in GAMES)
            source = re.sub(r'(<div[^>]*id="all-games-grid"[^>]*>)\s*</div>', lambda m:m[1]+cards+'</div>', source)
        def schema(match):
            try: value=json.loads(match[1])
            except ValueError: return match[0]
            if value.get('@type') == 'WebSite': value.pop('potentialAction', None)
            return '<script type="application/ld+json">\n'+json.dumps(value,ensure_ascii=False,indent=2)+'\n</script>'
        source = re.sub(r'<script type="application/ld\+json">([\s\S]*?)</script>', schema, source)
        # Advertising is not currently active. Do not promise an ad for a free action.
        source = source.replace('(Ad)', '').replace('(광고)', '')
        # Every changed asset gets a distinct cache key across already-installed workers.
        source = re.sub(r'((?:src|href)="/(?:js|css|games)/[^"?]+\.(?:js|css))(?:\?v=\d+)?"',r'\1?v=14"',source)
        source = '\n'.join(line.rstrip() for line in source.splitlines()) + '\n'
        path.write_text(source,encoding='utf-8')
        count += 1
    print(f'Hardened {count} public pages; game pages included: {include_games}.')

if __name__ == '__main__':
    harden('--skip-games' not in sys.argv)
