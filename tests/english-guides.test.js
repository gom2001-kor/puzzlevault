const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {renderLesson} = require('../scripts/build-english-guides.cjs');
const root = path.resolve(__dirname, '..');
const data = name => JSON.parse(fs.readFileSync(path.join(root,'apps/english/src/data',name),'utf8'));
const all = ['classics.json','voa-lincoln.json','modern.json'].flatMap(data);
const guides = ['guides/classics-a.json','guides/classics-b.json','guides/voa-lincoln.json'].flatMap(data);

test('every reviewed lesson has crawlable explanations and an accurate route into the app',()=>{
    const directory = path.join(root,'learn/english/guides');
    const index = fs.readFileSync(path.join(directory,'index.html'),'utf8');
    const sitemap = fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
    assert.equal(fs.readdirSync(directory).filter(x=>x.endsWith('.html')).length,all.filter(l=>l.status==='verified').length+1);
    for(const lesson of all) {
        if(lesson.status!=='verified') {
            assert.ok(!fs.existsSync(path.join(directory,lesson.id+'.html')));
            continue;
        }
        const file = '/learn/english/guides/'+lesson.id+'.html';
        const html = fs.readFileSync(path.join(root,file),'utf8');
        assert.ok(index.includes('href="'+file+'"'));
        assert.ok(sitemap.includes('https://puzzlevault.pages.dev'+file));
        assert.ok(html.includes('href="/learn/english/#/lesson/'+lesson.id+'"'));
        assert.match(html, /class="chunks"/);
        assert.match(html, /class="grammar"/);
        assert.match(html, /class="self-check"/);
        assert.match(html, /원문과 학습 해설의 출처/);
        assert.ok(!html.includes('adsbygoogle'));
    }
});

test('untrusted upstream strings are escaped in text and metadata; unsafe source URLs cannot execute',()=>{
    const lesson = structuredClone(all.find(l=>l.status==='verified'));
    const guide = structuredClone(guides.find(g=>g.lessonId===lesson.id));
    lesson.subtitle = '"><script>alert(1)</script>';
    lesson.sourceUrl = 'javascript:alert(1)';
    guide.segments[0].overview = '<img src=x onerror=alert(2)>';
    const html = renderLesson(lesson,guide);
    assert.ok(!html.includes('<script>alert(1)</script>'));
    assert.ok(!html.includes('href="javascript:'));
    assert.ok(!html.includes('<img src=x'));
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(html.includes('href="#source"'));
});

test('missing-page response has recovery links and requests neither ads nor analytics',()=>{
    const html = fs.readFileSync(path.join(root,'404.html'),'utf8');
    assert.match(html, /name="robots" content="noindex"/);
    assert.match(html, /href="\/learn\/english\/"/);
    assert.ok(!/<script\b/i.test(html));
    assert.ok(!/adsbygoogle|googletagmanager/.test(html));
    assert.ok(fs.readFileSync(path.join(root,'scripts/package-site.py'),'utf8').includes("'404.html'"));
});
