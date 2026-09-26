const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require(process.argv[2] || 'playwright');
const base = process.argv[3] || 'http://127.0.0.1:8765';
const out = process.argv[4] || path.join(require('node:os').tmpdir(), 'puzzlevault-blog-qa');
fs.mkdirSync(out, {recursive:true});
(async () => {
 const browser = await chromium.launch({channel:'msedge',headless:true});
 const checks=[],errors=[],external=[];
 const context = await browser.newContext({viewport:{width:390,height:844},locale:'ko-KR',reducedMotion:'reduce',serviceWorkers:'block'});
 const page = await context.newPage();
 page.on('pageerror', e=>errors.push(e.message));
 page.on('request',req=>{if(!req.url().startsWith(base))external.push(req.url())});
 await page.goto(base+'/blog/ko/');
 await page.waitForFunction(()=>window.pvReady);
 assert.equal(await page.locator('#blog-grid .blog-card').count(),15);
 assert.equal(await page.locator('.guide-directory a').count(),10);
 await page.getByRole('button',{name:'게임 공략',exact:true}).click();
 assert.equal(await page.locator('#blog-grid .blog-card:visible').count(),10);
 assert.equal(await page.locator('#blog-result-count').innerText(),'글 10개');
 await page.getByRole('button',{name:'전체',exact:true}).click();
 checks.push('Korean listing shows all 15 articles, all 10 game links, filters and live count');
 await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:path.join(out,'blog-ko-mobile.png'),fullPage:true});
 await page.screenshot({path:path.join(out,'blog-ko-viewport.png')});
 const sources=['existing-guides','cognitive-guides','spatial-guides'].flatMap(name=>JSON.parse(fs.readFileSync('scripts/content/'+name+'.json','utf8')));
 for(const width of [320,390,1280]){
  await page.setViewportSize({width,height:900});
  for(const post of sources){
   await page.goto(base+'/blog/ko/'+post.slug+'.html');
   await page.waitForFunction(()=>window.pvReady);
   assert.equal(await page.locator('h1').count(),1);
   const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,figures:[...document.querySelectorAll('figure')].map(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}))}));
   assert.ok(layout.scroll<=layout.width+1,post.slug+' overflows '+width+': '+JSON.stringify(layout));
   assert.ok(layout.figures.some(f=>f.width>100&&f.height>70),post.slug+' missing rendered figure');
   const solution=page.locator('article details').first();
   if(await solution.count()){
    await solution.locator('summary').click();
    assert.equal(await solution.getAttribute('open'),'');
   }
  }
  checks.push('All ten Korean guides render figures and exercises without page overflow at '+width+'px');
 }
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+'/blog/ko/colorflow-advanced-pathing-strategies.html');
 await page.locator('article details').first().locator('summary').click();
 await page.screenshot({path:path.join(out,'colorflow-ko-mobile.png'),fullPage:true});
 await page.goto(base+'/blog/ko/patternpop-targets-and-decoy-guide.html');
 await page.locator('article details summary').click();
 const cta = page.locator('article a.pv-btn');
 const ctaStyle = await cta.evaluate(el=>({color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor}));
 assert.notEqual(ctaStyle.color,ctaStyle.background);
 await cta.screenshot({path:path.join(out,'play-button.png')});
 await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:path.join(out,'patternpop-ko-mobile.png'),fullPage:true});
 await page.locator('article a[href^="/games/patternpop.html"]').first().click();
 await page.waitForFunction(()=>window.pvReady);
 assert.equal(await page.locator('html').getAttribute('lang'),'ko');
 checks.push('Korean guide link opens the game in Korean');
 await page.goto(base+'/blog/ko/patternpop-targets-and-decoy-guide.html');
 await page.waitForFunction(()=>window.pvReady);
 await page.evaluate(()=>I18n.switchLang('ja'));
 await page.waitForURL('**/blog/ja/patternpop-targets-and-decoy-guide.html');
 await page.waitForFunction(()=>window.pvReady);
 assert.equal(await page.locator('html').getAttribute('lang'),'ja');
 checks.push('Article language switch opens the translated version of the same article');
 for(const lang of ['en','ko','ja','zh','es']){
  const route=lang==='en'?'/blog/':'/blog/'+lang+'/';
  await page.goto(base+route); await page.waitForFunction(()=>window.pvReady);
  assert.equal(await page.locator('html').getAttribute('lang'),lang);
  assert.equal(await page.locator('#blog-grid .blog-card').count(),15);
 }
 checks.push('All five static listing languages remain consistent with their routes');
 for(const slug of ['welcome-to-puzzlevault','the-evolution-of-browser-puzzles']){
  await page.goto(base+'/blog/ko/'+slug+'.html'); await page.waitForFunction(()=>window.pvReady);
  assert.ok(await page.locator('article table').count());
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 }
 await page.goto(base+'/blog/ko/patternpop-targets-and-decoy-guide.html');
 await page.waitForFunction(()=>window.pvReady);
 await page.emulateMedia({colorScheme:'dark'});
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('.blog-toc a')).color==='rgb(147, 197, 253)');
 assert.equal(await page.locator('.blog-toc a').first().evaluate(el=>getComputedStyle(el).color),'rgb(147, 197, 253)');
 await page.locator('figure').first().screenshot({path:path.join(out,'patternpop-dark-figure.png')});
 await page.screenshot({path:path.join(out,'patternpop-dark-viewport.png')});
 await page.emulateMedia({colorScheme:'light'});
 checks.push('Revised chooser/browser articles fit mobile; dark theme links and light theme play CTA retain contrast');

 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844},serviceWorkers:'block'});
 const staticPage=await nojs.newPage();
 await staticPage.goto(base+'/blog/ko/');
 assert.equal(await staticPage.locator('#blog-grid .blog-card').count(),15);
 assert.equal(await staticPage.locator('#blog-tabs').isVisible(),false);
 await staticPage.locator('.guide-directory a').filter({hasText:'NumVault'}).click();
 assert.ok(await staticPage.locator('article').innerText());
 assert.ok(await staticPage.locator('figure').count());
 assert.equal(await staticPage.locator('.related-post-card').count(),2);
 checks.push('JavaScript disabled: all article links, body, figures, related links remain available');
 assert.deepEqual(errors,[],'Browser script errors');
 assert.deepEqual(external,[],'Unexpected external tracking or assets');
 const report={base,checks,errors,unexpectedExternalRequests:external,screenshots:out};
 fs.writeFileSync('docs/blog-browser-checks.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
