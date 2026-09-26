#!/usr/bin/env python3
"""Dependency-free static public-site audit. Run: python scripts/audit-site.py.

This checks deployable source, not remote availability, ad approval or runtime SEO.
Editorial claim matches are review prompts, never automatic truth judgements.
"""
from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

SITE = 'https://puzzlevault.pages.dev'
EXCLUDED = {'.git', '.agent', '.agents', '.codex', 'node_modules', 'docs', 'tests', 'scripts'}
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}
TRACKERS = ('googletagmanager.com', 'google-analytics.com', 'googlesyndication.com', 'doubleclick.net', 'clarity.ms')
CLAIMS = {
    'solvability_guarantee': r'(?:100\s*%.{0,100}(?:solv|resol|可解|解け|풀)|guarantee.{0,80}(?:solvable|resolvable)|모든.{0,45}보장)',
    'zero_loading': r'(?:zero.{0,25}load|instant(?:ly)?.{0,20}load|0\s*(?:초|秒).{0,20}(?:로딩|読み|加载))',
    'daily_limit': r'(?:once (?:a|per|each) day|one attempt per day|only one.{0,15}(?:daily|per day)|하루\s*(?:1\s*번|한\s*번).{0,20}도전)',
    'unsubstantiated_benefit': r'(?:cognitive benefits|boost.{0,25}(?:IQ|intelligence)|prevent.{0,25}(?:dementia|Alzheimer)|과학적으로.{0,30}(?:향상|증명))',
    'optimality': r'(?:optimal drop|minimum number of taps|advanced heuristic checks)',
}


def public_html(root: Path):
    for path in sorted(root.rglob('*.html')):
        rel = path.relative_to(root)
        if set(rel.parts) & EXCLUDED or path.name in {'solution.html', '_template.html'}:
            continue
        yield path


class Page(HTMLParser):
    def __init__(self, source: str):
        super().__init__(convert_charrefs=True)
        self.ids = []
        self.refs = []
        self.scripts = []
        self.inline_scripts = []
        self.canonical = []
        self.descriptions = []
        self.publishers = []
        self.titles = []
        self.regions = {'pv-header': [], 'pv-footer': []}
        self.stack = []
        self.skip = None
        self.script_text = []
        self.script_line = 0
        self.visible_text = []
        self.feed(source)
        self.close()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        line = self.getpos()[0]
        if attrs.get('id'):
            self.ids.append((attrs['id'], line))
        if tag == 'meta':
            name = attrs.get('name', '').lower()
            if name == 'description':
                self.descriptions.append(attrs.get('content', '').strip())
            if name == 'google-adsense-account':
                self.publishers.append(attrs.get('content', '').strip())
        if tag == 'link' and 'canonical' in attrs.get('rel', '').lower().split():
            self.canonical.append(attrs.get('href', '').strip())
        for attr in ('src', 'href'):
            if attrs.get(attr):
                self.refs.append((tag, attr, attrs[attr], line))
        if tag == 'script':
            if attrs.get('type', '').lower() in {'', 'module', 'text/javascript', 'application/javascript'}:
                self.scripts.append((attrs.get('src', ''), line))
            self.skip = 'script'
            self.script_text = []
            self.script_line = line
        elif tag == 'style':
            self.skip = 'style'
        region = attrs.get('id') if attrs.get('id') in self.regions else None
        if region:
            self.regions[region].append({'text': [], 'elements': 0, 'line': line})
        if tag in {'a', 'img', 'button'}:
            for _, active in self.stack:
                if active:
                    self.regions[active][-1]['elements'] += 1
        if tag not in VOID:
            self.stack.append((tag, region))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if tag == 'script' and self.skip == 'script':
            self.inline_scripts.append((''.join(self.script_text), self.script_line))
            self.skip = None
        elif tag == 'style':
            self.skip = None
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        if self.skip:
            if self.skip == 'script':
                self.script_text.append(data)
            return
        if not data.strip():
            return
        if any(tag == 'title' for tag, _ in self.stack):
            self.titles.append(data.strip())
        self.visible_text.append((data, self.getpos()[0]))
        for _, region in self.stack:
            if region:
                self.regions[region][-1]['text'].append(data.strip())


def audit(root: Path):
    root = root.resolve()
    pages = {path.resolve(): Page(path.read_text(encoding='utf-8-sig')) for path in public_html(root)}
    blockers, warnings, claims = [], [], []
    aliases = {}
    redirects = root / '_redirects'
    if redirects.exists():
        for line in redirects.read_text(encoding='utf-8-sig').splitlines():
            parts = line.split()
            if len(parts) >= 2 and not parts[0].startswith('#') and '*' not in parts[0]:
                aliases[parts[0].rstrip('/') or '/'] = parts[1]

    def issue(code, path, detail, line=None, warning=False):
        value = {'code': code, 'file': path.relative_to(root).as_posix(), 'detail': detail}
        if line:
            value['line'] = line
        (warnings if warning else blockers).append(value)

    def resolve(path: Path, value: str):
        current_url = SITE + '/' + path.relative_to(root).as_posix()
        url = urlsplit(urljoin(current_url, value))
        if url.scheme not in {'http', 'https'} or url.netloc != urlsplit(SITE).netloc:
            return None, None
        route = unquote(url.path)
        seen = set()
        while (route.rstrip('/') or '/') in aliases:
            key = route.rstrip('/') or '/'
            if key in seen:
                return False, url.fragment
            seen.add(key)
            target = urlsplit(urljoin(SITE, aliases[key]))
            if target.netloc != urlsplit(SITE).netloc:
                return None, None
            route = unquote(target.path)
        candidate = (root / route.lstrip('/')).resolve()
        if not candidate.is_relative_to(root):
            return False, url.fragment
        choices = [candidate]
        if not candidate.suffix:
            choices.extend([candidate.with_suffix('.html'), candidate / 'index.html'])
        if candidate.is_dir():
            choices.insert(0, candidate / 'index.html')
        return next((choice for choice in choices if choice.is_file()), False), unquote(url.fragment)

    dynamic_ids = {}
    for path, page in pages.items():
        code = '\n'.join(text for text, _ in page.inline_scripts)
        for source, _ in page.scripts:
            if source:
                resolved, _ = resolve(path, source)
                if resolved and resolved.suffix == '.js':
                    code += '\n' + resolved.read_text(encoding='utf-8-sig')
        # Known literal IDs created by JS are not missing static-anchor blockers.
        dynamic_ids[path] = set(re.findall(r'\bid\s*=\s*[\x22\x27]([\w-]+)[\x22\x27]', code))

    games = {path for path in pages if path.parent == root / 'games'}
    homes = {root / 'index.html'} | {root / lang / 'index.html' for lang in ['ko', 'ja', 'zh', 'es']}
    metadata_publishers = set()
    for path, page in pages.items():
        if not page.titles:
            issue('missing_title', path, 'A nonempty static title is required.')
        if not any(page.descriptions):
            issue('missing_description', path, 'A nonempty meta description is required.')
        if len(page.canonical) != 1 or not page.canonical[0]:
            issue('missing_or_duplicate_canonical', path, 'Provide exactly one nonempty canonical link.')
        elif urlsplit(page.canonical[0]).scheme not in {'http', 'https'}:
            issue('relative_canonical', path, page.canonical[0])
        for identity, count in Counter(identity for identity, _ in page.ids).items():
            if count > 1:
                issue('duplicate_id', path, identity, next(line for value, line in page.ids if value == identity))
        for region, entries in page.regions.items():
            if not entries:
                issue('missing_static_region', path, region)
            elif any(not entry['text'] and not entry['elements'] for entry in entries):
                issue('empty_static_region', path, region, entries[0]['line'])
        linked_games = set()
        for tag, attr, value, line in page.refs:
            if value.startswith(('mailto:', 'tel:', 'data:', 'blob:', 'javascript:')) or value == '#':
                continue
            target, fragment = resolve(path, value)
            if target is False:
                issue('broken_local_reference', path, value, line)
            elif target:
                if tag == 'a' and attr == 'href' and target in games:
                    linked_games.add(target)
                if fragment and target in pages:
                    known = {identity for identity, _ in pages[target].ids}
                    if fragment not in known and fragment not in dynamic_ids[target]:
                        issue('missing_fragment', path, value, line)
        for source, line in page.scripts:
            if any(domain in urlsplit(source).netloc.lower() for domain in TRACKERS):
                issue('tracking_before_consent', path, source, line)
        for code, line in page.inline_scripts:
            if any(domain in code.lower() for domain in TRACKERS):
                direct = re.search(r'\.src\s*=|fetch\s*\(|sendBeacon\s*\(', code)
                gated = re.search(r'PVPrivacy|analytics\s*===?\s*true|consent\s*[.=]', code, re.IGNORECASE)
                issue('inline_tracking_requires_review' if gated or not direct else 'tracking_before_consent',
                      path, 'Inline code references a tracking host; inspect its request and consent guard.',
                      line, warning=bool(gated or not direct))
        if path in homes:
            for game in sorted(games - linked_games):
                issue('home_missing_static_game_link', path, game.relative_to(root).as_posix())
        metadata_publishers.update(page.publishers)
        if not page.publishers:
            issue('missing_publisher_metadata', path, 'google-adsense-account meta is absent.', warning=True)
        for data, line in page.visible_text:
            for code, expression in CLAIMS.items():
                found = re.search(expression, data, re.IGNORECASE)
                if found:
                    claims.append({'code': code, 'file': path.relative_to(root).as_posix(), 'line': line,
                                   'excerpt': re.sub(r'\s+', ' ', data[max(0, found.start()-30):found.end()+80]).strip()})
    # Translation text is runtime copy, so inspect it separately from page metadata.
    for path in sorted((root / 'lang').glob('*.json')):
        for line_no, line in enumerate(path.read_text(encoding='utf-8-sig').splitlines(), 1):
            for code, expression in CLAIMS.items():
                if re.search(expression, line, re.IGNORECASE):
                    claims.append({'code': code, 'file': path.relative_to(root).as_posix(), 'line': line_no, 'excerpt': line.strip()[:260]})
    ads = root / 'ads.txt'
    if not ads.exists():
        issue('missing_ads_txt', ads, 'ads.txt is missing.')
    else:
        authorized = set()
        for line in ads.read_text(encoding='utf-8-sig').splitlines():
            parts = [part.strip() for part in line.split(',')]
            if len(parts) >= 3 and parts[0].lower() == 'google.com':
                authorized.add('ca-' + parts[1])
        for publisher in sorted(metadata_publishers):
            if publisher not in authorized:
                issue('publisher_mismatch', ads, publisher + ' is present in HTML but absent from ads.txt.')
        if not authorized:
            issue('missing_google_publisher', ads, 'No google.com publisher entry found.')
    return {'root': str(root), 'pages_checked': len(pages), 'games_checked': len(games),
            'blocker_count': len(blockers), 'warning_count': len(warnings), 'claim_review_count': len(claims),
            'blockers': blockers, 'warnings': warnings, 'claims_to_review': claims}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    result = audit(args.root)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 1 if result['blocker_count'] else 0


if __name__ == '__main__':
    import sys
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    raise SystemExit(main())
