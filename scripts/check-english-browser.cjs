/* Run: node scripts/check-english-browser.cjs [Playwright module] [origin]. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.argv[2]||'playwright');
const origin=process.argv[3]||'http://127.0.0.1:8765';
const root=path.resolve(__dirname,'..');
const url=origin+'/learn/english/';
const read=file=>JSON.parse(fs.readFileSync(path.join(root,'apps/english/src/data',file),'utf8'));
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
(async()=>{
 const quest=await import(pathToFileURL(path.join(root,'apps/english/src/lib/quest.ts')).href);
 const lessons=['classics.json','voa-lincoln.json','modern.json'].flatMap(read).sort((a,b)=>a.order-b.order);
 const guides=Object.fromEntries(['guides/classics-a.json','guides/classics-b.json','guides/voa-lincoln.json'].flatMap(read).map(item=>[item.lessonId,item]));
 const bank=quest.buildQuestBank(lessons,guides);
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const errors=[],external=[],checks=[];
 async function observe(page){await page.route("https://study-english2.pages.dev/puzzlevault-content.json", route=>route.fulfill({status:503,contentType:"application/json",body:"{}",headers:{"access-control-allow-origin":"*"}}));page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(/^https?:/.test(request.url())&&!request.url().startsWith(origin+'/'))external.push(request.url());});}
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const page=await context.newPage();await observe(page);
  await page.goto(url+'#/quest');await page.locator('.eq-hero').waitFor();
  await page.evaluate(()=>{localStorage.setItem('pv_numvault_best','81');localStorage.setItem('pv_player_progress','existing-game-record');});
  await page.getByRole('button',{name:/오늘의 탐험 시작/}).click();
  const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('pv_english_quest_v1')));
  const first=await state();assert.equal(first.active.questionIds.length,6);
  assert.deepEqual(first.active.questionIds,quest.courseQuestionIds(bank,first.active.day,null));
  async function answer(correct=true){
   const run=(await state()).active;const q=bank[run.questionIds[run.position]];
   if(q.kind==='order'){
    for(const piece of q.choices){await page.locator('.eq-piece-bank button:enabled').filter({hasText:new RegExp('^'+escape(piece)+'$')}).first().click();}
   }else{
    const target=correct?q.answer:(q.answer+1)%q.choices.length;
    const choices=quest.questChoices(q,run.seed);await page.locator('.eq-options button').nth(choices.findIndex(item=>item.index===target)).click();
   }
   await page.getByRole('button',{name:/답 확인하기/}).click();
   await page.locator('.eq-feedback').waitFor();
  }
  await answer(false);
  await page.getByRole('button',{name:'복습함에 담기',exact:true}).click();
  const reading=await page.evaluate(()=>JSON.parse(localStorage.getItem('pv_english_reading_v2')));
  assert.ok(reading.saved.includes(bank[first.active.questionIds[0]].cardId));assert.equal(reading.completed.length,0);
  await page.reload();await page.locator('.eq-feedback').waitFor();assert.equal((await state()).active.answers.length,1);
  await page.getByRole('button',{name:/다음 단서로/}).click();
  const order=bank[(await state()).active.questionIds[1]];
  await page.locator('.eq-piece-bank button:enabled').filter({hasText:new RegExp('^'+escape(order.choices[0])+'$')}).first().click();
  await page.reload();await page.locator('.eq-built button').waitFor();assert.deepEqual((await state()).active.draft,[0]);
  await page.getByRole('button',{name:'다시 배열',exact:true}).click();
  for(let i=1;i<6;i++){await answer();await page.getByRole('button',{name:i===5?/탐험 결과 보기/:/다음 단서로/}).click();}
  await page.locator('.eq-result').waitFor();
  const completed=await state();assert.equal(quest.questXP(completed),80);assert.equal(completed.active.reward,80);
  await page.screenshot({path:path.join(root,'docs/english-quest-mobile.png'),fullPage:true});
  await page.reload();await page.locator('.eq-result').waitFor();assert.equal(quest.questXP(await state()),80);
  checks.push('Daily course uses verified source questions; drafts and feedback resume after reload; first completion awards XP once');
  await page.getByRole('button',{name:/오답 1개 다시 탐험/}).click();await answer();await page.getByRole('button',{name:/탐험 결과 보기/}).click();
  assert.equal((await state()).active.reward,0);assert.equal(quest.questXP(await state()),80);
  await page.getByRole('button',{name:'다음 탐험 고르기',exact:true}).click();await page.getByRole('button',{name:/오늘의 코스 다시 탐험/}).click();
  for(let i=0;i<6;i++){await answer();await page.getByRole('button',{name:i===5?/탐험 결과 보기/:/다음 단서로/}).click();}
  assert.equal((await state()).active.reward,0);assert.equal(quest.questXP(await state()),80);
  assert.equal(await page.evaluate(()=>localStorage.getItem('pv_numvault_best')),'81');
  assert.equal(await page.evaluate(()=>localStorage.getItem('pv_player_progress')),'existing-game-record');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pv_english_reading_v2')).completed.length),0);
  checks.push('Wrong answers can enter the reading review list; review and repeated daily completion do not duplicate XP or alter game/reading completion records');
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  const broken=await browser.newContext({serviceWorkers:'block'}),bp=await broken.newPage();await observe(bp);
  await bp.goto(url+'#/quest');await bp.locator('.eq-hero').waitFor();await bp.evaluate(()=>localStorage.setItem('pv_english_quest_v1','{broken'));
  await bp.reload();await bp.getByRole('alert').waitFor();await bp.getByRole('button',{name:/오늘의 탐험 시작/}).click();
  await bp.locator('.eq-options button').first().click();await bp.getByRole('button',{name:/답 확인하기/}).click();
  assert.equal(await bp.evaluate(()=>localStorage.getItem('pv_english_quest_v1')),'{broken');
  await bp.getByRole('button',{name:/원문 수업에서 더 읽기/}).click();await bp.locator('.sentence-panel').waitFor();
  await bp.goto(url+'#/quest');await bp.locator('.eq-feedback').waitFor();
  assert.equal(await bp.evaluate(()=>localStorage.getItem('pv_english_quest_v1')),'{broken');await broken.close();
  checks.push('Malformed quest storage is preserved; temporary progress survives the round trip to its source lesson');
  const offline=await browser.newContext({viewport:{width:390,height:844}}),op=await offline.newPage();await observe(op);
  await op.goto(url);await op.locator('.app-shell').waitFor();await op.evaluate(()=>navigator.serviceWorker.ready);await op.reload();
  await op.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const cached=await op.evaluate(async()=>{const cache=await caches.open('puzzlevault-v22');return (await cache.keys()).map(r=>new URL(r.url).pathname);});
  for(const file of fs.readdirSync(path.join(root,'learn/english/assets')))assert.ok(cached.includes('/learn/english/assets/'+file),file);
  await offline.setOffline(true);await op.goto(url+'#/lesson/peter-rabbit/0');await op.reload();await op.locator('.sentence-panel').waitFor();
  await op.goto(url+'#/quest');await op.getByRole('button',{name:/오늘의 탐험 시작/}).click();await op.locator('.eq-question').waitFor();
  await op.goto(origin+'/games/numvault.html?lang=ko');await op.waitForFunction(()=>window.pvReady);
  checks.push('The version22 root cache includes every hashed learning bundle; reading, quests and an existing puzzle start offline');await offline.close();
  const nojs=await browser.newContext({javaScriptEnabled:false,serviceWorkers:'block'}),np=await nojs.newPage();await np.goto(url);
  assert.ok((await np.locator('main').innerText()).includes('선정 학습 구간 69개'));assert.ok(await np.locator('header a[href="/ko/"]').count());await nojs.close();
  checks.push('Static learning/content/backup/source information remains readable without JavaScript');
  assert.deepEqual(errors,[]);assert.deepEqual([...new Set(external)],['https://study-english2.pages.dev/puzzlevault-content.json']);
  const report={date:'2026-09-28',checks,pageErrors:errors,externalRequests:external,microphoneTested:false};
  fs.writeFileSync(path.join(root,'docs/english-integration-browser-checks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
