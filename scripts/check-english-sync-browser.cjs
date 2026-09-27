/* Controlled source-feed checks; never alter the user's browser or public content. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.argv[2]||'playwright');
const root=path.resolve(__dirname,'..');
const origin=process.argv[3]||'http://127.0.0.1:8765';
const url=origin+'/learn/english/';
(async()=>{
 const validation=await import(pathToFileURL(path.join(root,'apps/english/src/lib/content-validation.ts')).href);
 const quest=await import(pathToFileURL(path.join(root,'apps/english/src/lib/quest.ts')).href);
 const baseline=Object.fromEntries(validation.CONTENT_FILES.map(name=>[name,JSON.parse(fs.readFileSync(path.join(root,'apps/english/src/data',name),'utf8'))]));
 const updated=structuredClone(baseline);
 const first=updated['voa-lincoln.json'].find(l=>l.id==='voa-welcome');
 first.subtitle='새 학습 자료 동기화 확인';
 const addition=structuredClone(first);addition.id='sync-browser-fixture';addition.order=900;
 addition.subtitle='추가 수업 동기화 확인';updated['voa-lincoln.json'].push(addition);
 const newGuide=structuredClone(updated['guides/voa-lincoln.json'].find(g=>g.lessonId==='voa-welcome'));
 newGuide.lessonId=addition.id;updated['guides/voa-lincoln.json'].push(newGuide);
 const feed={manifest:await validation.createManifest(updated,'a'.repeat(40),'2026-09-28T12:00:00+09:00'),files:updated};
 await validation.validateFeed(feed,baseline);
 const old=validation.inspectContent(baseline),bank=quest.buildQuestBank(old.lessons,Object.fromEntries(old.guides.map(g=>[g.lessonId,g])));
 const saved=quest.freshQuest(),day=quest.utcQuestDay();
 saved.dailyAwards[day]={correct:6,xp:90};saved.best['daily:'+day]=6;
 saved.active=quest.startQuest(bank,'daily',day,null,'before-content-update');
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const errors=[],requests=[],checks=[];
 try {
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  let mode='valid';
  await context.route(validation.CONTENT_SOURCE,async route=>{
   requests.push({method:route.request().method(),body:route.request().postData(),headers:route.request().headers()});
   if(mode==='offline')return route.abort('internetdisconnected');
   const candidate=structuredClone(feed);
   if(mode==='tampered') candidate.files['voa-lincoln.json'][0].subtitle='THIS MUST NEVER APPEAR';
   return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(candidate)});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({saved})=>{
   if(!sessionStorage.getItem('fixture-created')) {
    localStorage.setItem('pv_english_quest_v1',JSON.stringify(saved));
    localStorage.setItem('pv_numvault_best','314');
    sessionStorage.setItem('fixture-created','yes');
   }
  },{saved});
  await page.goto(url);await page.locator('.app-shell').waitFor();
  await page.getByRole('heading',{name:'새 학습 자료 동기화 확인'}).waitFor();
  await page.locator('.content-edition summary').click();
  assert.ok((await page.locator('.content-edition').innerText()).includes('최신 원본 확인'));
  assert.ok((await page.locator('.content-edition').innerText()).includes('9편'));
  await page.waitForFunction(async()=>!!(await (await caches.open('puzzlevault-english-content-v1')).match('/learn/english/last-verified-content.json')));
  checks.push('A validated source edition is applied before rendering and adds a lesson without changing application code');
  await page.goto(url+'#/quest');await page.locator('.eq-hero').waitFor();
  assert.ok((await page.locator('[role="status"]').allTextContents()).some(text=>text.includes('XP와 최고 기록은 그대로')));
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('pv_english_quest_v1')));
  assert.equal(quest.questXP(after),90);
  await page.getByRole('button',{name:/오늘의 코스 다시 탐험/}).click();await page.locator('.eq-question').waitFor();
  const next=await page.evaluate(()=>JSON.parse(localStorage.getItem('pv_english_quest_v1')));
  assert.ok(next.active.bankFingerprint);assert.equal(quest.questXP(next),90);
  assert.equal(await page.evaluate(()=>localStorage.getItem('pv_numvault_best')),'314');
  checks.push('A changed question bank safely starts a new course while preserving XP, best records and unrelated game storage');
  mode='offline';await page.goto(url+'#/home');await page.reload();await page.locator('.app-shell').waitFor();
  await page.getByRole('heading',{name:'새 학습 자료 동기화 확인'}).waitFor();
  assert.ok((await page.locator('.content-edition').innerText()).includes('보관한 자료 사용'));
  checks.push('A later offline visit uses the last verified public edition from Cache API');
  mode='tampered';await page.reload();await page.locator('.app-shell').waitFor();
  await page.getByRole('heading',{name:'새 학습 자료 동기화 확인'}).waitFor();
  assert.equal(await page.getByText('THIS MUST NEVER APPEAR',{exact:true}).count(),0);
  checks.push('Tampered content is rejected and cannot replace the last verified edition');
  for(const request of requests){assert.equal(request.method,'GET');assert.equal(request.body,null);assert.ok(!request.headers.cookie);assert.ok(!request.headers.referer);}
  assert.equal(requests.length,3);
  checks.push('One anonymous public-data GET per app opening; no cookies, referrer, answers or learning records sent');
  assert.deepEqual(errors,[]);
  const report={date:'2026-09-28',checks,requests:requests.map(({method,body})=>({method,body})),pageErrors:errors,source:'controlled test feed; no production content changed'};
  fs.writeFileSync(path.join(root,'docs/english-sync-browser-checks.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));await context.close();
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
