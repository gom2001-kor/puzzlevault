/* Publish useful, readable lesson notes from the same reviewed data as the app. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const BASE = '/learn/english/guides/';
const SITE = 'https://puzzlevault.pages.dev';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = value => { try { const u = new URL(value); return u.protocol === 'https:' ? escape(u.href) : '#source'; } catch { return '#source'; } };
const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, 'apps/english/src/data', file), 'utf8').replace(/^\uFEFF/, ''));
const route = lesson => BASE + lesson.id + '.html';
const lessonLink = lesson => '/learn/english/#/lesson/' + lesson.id;
const referenceDate = lessons => lessons.map(l => l.verifiedAt).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x)).sort().at(-1) || '2026-09-28';

function shell({title, description, url, body, type='Article'}) {
    const schema = {'@context':'https://schema.org','@type':type, name:title, description, url:SITE+url, inLanguage:['ko','en'], isAccessibleForFree:true};
    return `<!doctype html>
<html lang="ko"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)} | PuzzleVault English</title>
<meta name="description" content="${escape(description)}"><meta name="theme-color" content="#15394b">
<meta name="google-adsense-account" content="ca-pub-6035096210993315">
<link rel="canonical" href="${SITE+url}"><link rel="icon" href="/favicon.png">
<meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}">
<meta property="og:type" content="${type==='Article'?'article':'website'}"><meta property="og:url" content="${SITE+url}">
<meta property="og:image" content="${SITE}/images/og-default.png"><meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/css/english-guides.css?v=25">
<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
</head><body>
<a class="skip" href="#main">본문 바로가기</a>
<header id="pv-header"><nav aria-label="주 메뉴"><a class="brand" href="/ko/">PuzzleVault<span>ENGLISH NOTES</span></a><div><a href="${BASE}">읽기 가이드</a><a href="/learn/english/">학습실</a><a href="/ko/#games">게임</a></div></nav></header>
<main id="main">${body}</main>
<footer id="pv-footer"><p><strong>PuzzleVault English</strong> · Little by Little의 원문 학습 자료와 한국어 해설</p><nav aria-label="사이트 안내"><a href="/ko/about.html">소개</a><a href="/blog/ko/editorial.html">제작·수정 원칙</a><a href="/ko/privacy.html">개인정보</a><a href="/ko/terms.html">이용약관</a><a href="/ko/contact.html">오류 제보·문의</a><a href="/learn/english/THIRD-PARTY-NOTICES.txt">소프트웨어 라이선스</a></nav></footer>
</body></html>\n`;
}

function passage(guide, index) {
    return `<section class="passage" id="passage-${index+1}"><p class="eyebrow">READING NOTE ${String(index+1).padStart(2,'0')}</p>
<h2 lang="en">${escape(guide.text)}</h2><p class="meaning">${escape(guide.meaning)}</p><p>${escape(guide.overview)}</p>
<h3>의미 덩어리로 읽기</h3><ol class="chunks">${guide.chunks.map(c=>`<li><strong lang="en">${escape(c.text)}</strong><span>${escape(c.meaning)}</span><small>${escape(c.label)}</small></li>`).join('')}</ol>
<h3>문장에서 살펴볼 문법</h3>${guide.grammar.map(g=>`<div class="grammar"><h4>${escape(g.title)}</h4><p>${escape(g.explanation)}</p><p class="example" lang="en">${escape(g.example)}</p><p>${escape(g.translation)}</p></div>`).join('')}
<p class="tip"><strong>읽기 팁</strong> ${escape(guide.tip)}</p>
<details class="self-check"><summary>${escape(guide.check.question)} <span>생각한 뒤 해설 보기</span></summary><p>${escape(guide.check.answer)}</p><p class="muted">${escape(guide.check.hint)}</p></details></section>`;
}

function renderLesson(lesson, guide) {
    const samples = guide.segments.slice(0,3);
    const description = `${lesson.subtitle}. ${lesson.title}의 선정 문장을 한국어 풀이, 끊어 읽기, 문법 예문과 확인 문제로 공부합니다.`;
    return shell({title:lesson.title+' — 문장 읽기 가이드', description, url:route(lesson), body:`
<nav class="breadcrumb" aria-label="현재 위치"><a href="${BASE}">읽기 가이드</a><span aria-hidden="true">/</span><span>${escape(lesson.category)}</span></nav>
<article><header class="hero"><p class="eyebrow">READ A LITTLE. NOTICE MORE.</p><h1>${escape(lesson.subtitle)}</h1><p class="english-title" lang="en">${escape(lesson.title)}</p><p class="muted">${escape(lesson.author)} · ${escape(lesson.level)} · 핵심 학습 약 ${lesson.minutes}분</p>
<p>${escape(guide.title.overview)}</p><a class="button" href="${lessonLink(lesson)}">이 작품 학습 시작 <span aria-hidden="true">→</span></a></header>
<section class="reading-plan"><h2>이 가이드로 공부하는 순서</h2><ol><li>영어 문장을 먼저 읽고 어떤 장면인지 생각합니다.</li><li>한국어 뜻을 확인한 뒤, 의미 덩어리와 문법 예문을 비교합니다.</li><li>확인 질문에 자기 말로 답하고 해설을 펼칩니다. 학습실에서는 소리 내어 읽기와 복습으로 이어갈 수 있습니다.</li></ol><p>전체 ${lesson.segments.length}개 학습 구간 중 앞의 ${samples.length}개를 골랐습니다. 수준과 시간은 학습용 안내이며 공인 시험 등급이나 성과를 뜻하지 않습니다.</p></section>
${samples.map(passage).join('\n')}
<section class="writing"><p class="eyebrow">MAKE IT YOURS</p><h2>한 번 직접 써 보기</h2><p>${escape(lesson.writingPrompt)}</p><p>완성한 문장을 읽으며 주어와 동사를 찾고, 이 글에서 배운 표현을 어떻게 썼는지 확인하세요. 앱의 쓰기 탭에 기록할 수 있으며 자동 채점이나 AI 평가를 제공하지 않습니다.</p><a class="button" href="${lessonLink(lesson)}">듣기·쓰기·전체 학습 구간 열기</a></section>
<section id="source" class="source"><h2>원문과 학습 해설의 출처</h2><dl><dt>원문 저자</dt><dd>${escape(lesson.author)}</dd><dt>원 출처</dt><dd><a href="${safeUrl(lesson.sourceUrl)}" rel="noreferrer">${escape(lesson.sourceLabel)}</a></dd><dt>원문 이용 조건</dt><dd><a href="${safeUrl(lesson.licenseUrl)}" rel="noreferrer">${escape(lesson.licenseName)}</a></dd><dt>이용 범위</dt><dd>${escape(lesson.rightsScope)}</dd><dt>학습 자료 제작</dt><dd>한국어 번역·문장 분석·문법 예문·확인 질문: Little by Little Reading Room. PuzzleVault는 선정 읽기 가이드와 영어 탐험으로 연결합니다. 원문과 학습 해설을 구분해 제공합니다.</dd><dt>내용 변경</dt><dd>${escape(lesson.changes)}</dd><dt>자료 확인일</dt><dd>${escape(lesson.verifiedAt)}</dd></dl><p>${escape(lesson.verificationNotes)}</p><p>원문 그림·음성·로고를 가져오지 않았습니다. 자료의 수록이 저자나 출처 기관의 제휴·추천을 뜻하지 않습니다.</p><p>틀린 풀이를 발견했다면 <a href="/ko/contact.html">문의 페이지</a>에서 작품명과 문장을 알려주세요. <a href="/blog/ko/editorial.html">콘텐츠 제작·수정 원칙</a></p></section>
</article><aside class="next"><h2>다음 문장도 읽어볼까요?</h2><a href="${BASE}">다른 작품의 읽기 가이드 →</a><a href="/learn/english/#/quest">배운 표현으로 영어 탐험 →</a></aside>`});
}

function build() {
    const lessons = ['classics.json','voa-lincoln.json','modern.json'].flatMap(read).filter(l=>l.status==='verified').sort((a,b)=>a.order-b.order);
    const guides = Object.fromEntries(['guides/classics-a.json','guides/classics-b.json','guides/voa-lincoln.json'].flatMap(read).map(g=>[g.lessonId,g]));
    for (const lesson of lessons) {
        if (!/^[a-z0-9-]+$/.test(lesson.id) || !guides[lesson.id]?.segments.length) throw new Error('Missing reviewed lesson guide: '+lesson.id);
    }
    const output = path.join(ROOT,'learn/english/guides');
    fs.mkdirSync(output,{recursive:true});
    const expected = new Set(['index.html',...lessons.map(l=>l.id+'.html')]);
    // Delete only stale generated HTML directly within this known output directory.
    for(const name of fs.readdirSync(output)) if(/^[a-z0-9-]+\.html$/.test(name)&&!expected.has(name)) fs.unlinkSync(path.join(output,name));
    lessons.forEach(l=>fs.writeFileSync(path.join(output,l.id+'.html'),renderLesson(l,guides[l.id])));
    const count = lessons.reduce((n,l)=>n+l.segments.length,0);
    const body = `<header class="hero"><p class="eyebrow">PUZZLEVAULT ENGLISH / READING NOTES</p><h1>문장을 읽고,<br>뜻이 이어지는 순간.</h1><p>짧은 회화부터 고전 이야기까지, 원문 ${lessons.length}편을 한국어 풀이로 읽습니다. 글마다 선정 문장의 끊어 읽기와 문법 예문, 스스로 답해 보는 질문을 담았습니다.</p><p>브라우저에서 바로 읽을 수 있는 가이드입니다. 듣기·말하기·쓰기와 ${count}개 구간의 자세한 학습은 영어 학습실에서 이어가세요.</p><a class="button" href="/learn/english/">영어 학습실 열기 →</a></header>
<section class="reading-plan"><h2>어디서 시작할까요?</h2><p>처음 인사하는 표현이 필요하면 <a href="${BASE}voa-welcome.html">Welcome!</a>, 길을 묻는 대화를 연습하려면 <a href="${BASE}voa-gym.html">Where Is the Gym?</a>을 골라 보세요. 짧은 이야기에서 사건을 따라가려면 <a href="${BASE}north-wind.html">The North Wind and the Sun</a>으로 시작할 수 있습니다.</p><p>번역부터 외우기보다 영어 한 문장을 읽고 뜻을 떠올린 뒤 풀이와 비교해 보세요. 틀린 부분 하나를 찾고 다시 설명할 수 있으면 다음 문장으로 넘어갑니다.</p></section>
<section aria-labelledby="lessons"><h2 id="lessons">작품별 읽기 가이드</h2><div class="guide-grid">${lessons.map(l=>`<a class="guide-card" href="${route(l)}"><span class="eyebrow">${escape(l.category)} · ${escape(l.level)}</span><h3>${escape(l.subtitle)}</h3><p lang="en">${escape(l.title)}</p><p>${escape(guides[l.id].title.overview)}</p><span class="card-end">${l.segments.length}개 학습 구간 · 가이드 읽기 →</span></a>`).join('')}</div></section>
<section class="source"><h2>어떤 자료를 골랐나요?</h2><p>원문과 이용 조건을 확인한 자료만 학습에 포함합니다. 각 작품 페이지에 저자·원 출처·이용 범위와 확인일을 공개합니다. 한국어 번역과 학습 해설은 원문과 구분해 제공합니다. 본문이나 이용 조건을 확인하지 못한 자료는 이 목록에 넣지 않습니다.</p><p>해설은 초안 작성에 AI 도구를 활용할 수 있으며, 원문 대조와 구문·문법·예문 검사를 거쳐 수정합니다. 결과물에는 오류가 남을 수 있습니다. <a href="/blog/ko/editorial.html">제작·수정 원칙 읽기</a></p><p>학습실은 배포된 최신 원본 학습 자료를 확인합니다. 이 읽기 가이드는 검증된 사이트 빌드와 함께 갱신됩니다. 데이터와 화면의 적용 시점은 다를 수 있습니다.</p></section>`;
    fs.writeFileSync(path.join(output,'index.html'),shell({title:'영어 읽기 가이드 — 회화와 고전 문장 풀이',description:`영어 자료 ${lessons.length}편의 선정 문장을 한국어 해설, 끊어 읽기, 문법 예문과 이해 확인 문제로 공부하세요. 원문 출처와 이용 조건을 함께 제공합니다.`,url:BASE,body,type:'CollectionPage'}));
    const sitemapFile=path.join(ROOT,'sitemap.xml');
    let sitemap=fs.readFileSync(sitemapFile,'utf8');
    const manifestPath=path.join(ROOT,'apps/english/src/data/content-manifest.json');
    const sourceDate=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')).sourceCommittedAt?.slice(0,10):'';
    const date=[referenceDate(lessons),'2026-09-28',/^\d{4}-\d{2}-\d{2}$/.test(sourceDate)?sourceDate:''].sort().at(-1);
    const block='  <!-- ENGLISH_GUIDES_START -->\n'+[BASE,...lessons.map(route)].map(url=>`  <url><loc>${SITE+url}</loc><lastmod>${date}</lastmod><changefreq>weekly</changefreq></url>`).join('\n')+'\n  <!-- ENGLISH_GUIDES_END -->';
    sitemap=sitemap.includes('<!-- ENGLISH_GUIDES_START -->')?sitemap.replace(/  <!-- ENGLISH_GUIDES_START -->[\s\S]*?  <!-- ENGLISH_GUIDES_END -->/,block):sitemap.replace('</urlset>',block+'\n</urlset>');
    fs.writeFileSync(sitemapFile,sitemap);
    // Keep the static app introduction accurate after upstream content changes.
    for(const file of ['apps/english/index.html','learn/english/index.html']) {
        const p=path.join(ROOT,file); if(!fs.existsSync(p)) continue;
        let html=fs.readFileSync(p,'utf8').replace(/영어 원문 \d+편/g,`영어 원문 ${lessons.length}편`).replace(/선정 학습 구간 \d+개/g,`선정 학습 구간 ${count}개`).replace(/핵심 \d+구간/g,`핵심 ${count}구간`);
        html=html.replace(/(<section id="\/library">[\s\S]*?<ul>)[\s\S]*?(<\/ul>)/,(_,start,end)=>start+lessons.map(l=>`<li><a href="${route(l)}">${escape(l.title)}</a> — ${escape(l.subtitle)}</li>`).join('')+end);
        fs.writeFileSync(p,html.replace(/\r\r?\n/g,'\n'));
    }
    for(const language of ['en','ko','ja','zh','es']) {
        const file=path.join(ROOT,'lang',language+'.json');
        const strings=JSON.parse(fs.readFileSync(file,'utf8'));
        strings.learning.intro=strings.learning.intro.replace(/\d+/,String(lessons.length));
        fs.writeFileSync(file,JSON.stringify(strings,null,4)+'\n');
        const home=path.join(ROOT,language==='en'?'index.html':language+'/index.html');
        let html=fs.readFileSync(home,'utf8');
        html=html.replace(/(<p[^>]*data-i18n="learning.intro"[^>]*>)[\s\S]*?(<\/p>)/,(_,start,end)=>start+escape(strings.learning.intro)+end);
        html=html.replace(/<strong>\d+<\/strong>(<span data-i18n="learning.texts">)/,`<strong>${lessons.length}</strong>$1`);
        html=html.replace(/<strong>\d+<\/strong>(<span data-i18n="learning.segments">)/,`<strong>${count}</strong>$1`);
        fs.writeFileSync(home,html);
    }
    console.log(`Generated ${lessons.length} reviewed lesson guides and an index.`);
}
if(require.main===module) build();
module.exports={escape,safeUrl,renderLesson,build};
