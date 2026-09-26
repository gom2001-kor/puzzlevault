/* Run: node scripts/check-flagship-browser.cjs <playwright module> [base URL] [image directory] */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require(process.argv[2] || 'playwright');
const base = process.argv[3] || 'http://127.0.0.1:8765';
const out = process.argv[4] || path.join(require('node:os').tmpdir(),'puzzlevault-flagship-qa');
fs.mkdirSync(out,{recursive:true});
let activeBrowser;
(async()=>{
 const browser=activeBrowser=await chromium.launch({channel:'msedge',headless:true});
 const checks=[],errors=[],external=[];
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(!r.url().startsWith(base))external.push(r.url());});
 const ready=game=>page.waitForFunction(id=>id==='mosslight'?!!window.PVMosslight:!!window.Cloudweft?.inspect,game);
 const state=game=>page.evaluate(id=>id==='mosslight'?PVMosslight.getState():Cloudweft.inspect().state,game);
 const start=game=>page.locator(game==='mosslight'?'#ml-overlay .ml-primary':'#sf-start').click();
 const pause=game=>page.evaluate(id=>id==='mosslight'?PVMosslight.getState().phase==='paused':Cloudweft.inspect().paused,game);
 for(const game of ['mosslight','cloudweft']){
  for(const lang of ['en','ko','ja','zh','es']){
   await page.goto(`${base}/games/${game}.html?lang=${lang}`);await ready(game);
   await page.waitForFunction(l=>document.documentElement.lang===l,lang);
   assert.ok(await page.locator('#guide p').count()>=4);
   assert.ok((await page.locator('#guide').innerText()).length>150,`${game}/${lang}: missing guide text`);
   for(const width of [320,390,1280]){
    await page.setViewportSize({width,height:844});await page.emulateMedia({colorScheme:width===390?'dark':'light'});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${game}/${lang} overflow at${width}`);
   }
   checks.push(`${game}/${lang}: boot, readable guide, layout320/390dark/1280`);
  }
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({colorScheme:'light'});
  await page.goto(`${base}/games/${game}.html?lang=ko`);await ready(game);await start(game);
  const before=await state(game);await page.keyboard.down('ArrowUp');await page.waitForTimeout(300);await page.keyboard.up('ArrowUp');
  assert.ok((await state(game)).z < before.z || (await state(game)).player?.z < before.player?.z);
  if(game==='mosslight'){
   await page.keyboard.press('q');await page.waitForTimeout(80);assert.equal((await state(game)).gardens.length,1);
  }else{
   await page.keyboard.press('Space');await page.waitForTimeout(140);assert.ok((await state(game)).y>.3);
   await page.keyboard.press('e');await page.waitForTimeout(100);assert.equal((await state(game)).phase,1);
  }
  await page.keyboard.press('Escape');assert.equal(await pause(game),true);
  const paused=await state(game);await page.waitForTimeout(180);assert.equal((await state(game)).elapsed,paused.elapsed);
  await page.locator(game==='mosslight'?'#ml-overlay .ml-primary':'#sf-continue').click();
  const control=page.locator(game==='mosslight'?'#ml-east':'[data-direction="right"]');
  const rect=await control.boundingBox();assert.ok(rect.y+rect.height<844,`${game}: touch controls below viewport`);
  const xBefore=game==='mosslight'?(await state(game)).player.x:(await state(game)).x;
  await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();await page.waitForTimeout(200);
  await control.dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse'});await page.mouse.up();
  const xAfter=game==='mosslight'?(await state(game)).player.x:(await state(game)).x;assert.ok(xAfter>xBefore);
  await page.screenshot({path:path.join(out,game+'-mobile.png')});
  await page.evaluate(id=>{const c=document.querySelector(id==='mosslight'?'#ml-canvas':'#sf-canvas');window.__qaRestored=false;c.addEventListener('webglcontextrestored',()=>window.__qaRestored=true,{once:true});window.__qaLoss=c.getContext('webgl').getExtension('WEBGL_lose_context');window.__qaLoss.loseContext();},game);
  await page.waitForTimeout(200);assert.equal(await pause(game),true);
  await page.evaluate(()=>window.__qaLoss.restoreContext());await page.waitForFunction(()=>window.__qaRestored);
  assert.equal(await pause(game),true);await page.locator(game==='mosslight'?'#ml-overlay .ml-primary':'#sf-continue').click();
  checks.push(`${game}: keyboard/pointer hold/cancel, special action, pause clock, WebGL loss and explicit resume`);
  await page.goto(`${base}/games/${game}.html?lang=ko&mode=daily&date=2026-09-20`);await ready(game);await start(game);
  const daily=await state(game);assert.equal(game==='mosslight'?daily.mode:await page.evaluate(()=>Cloudweft.inspect().mode),'daily');
  let hash=0;for(const char of game+':2026-09-20')hash=((hash<<5)-hash+char.charCodeAt(0))|0;
  assert.equal(daily.seed,Math.abs(hash));checks.push(`${game}: dated daily invitation retains original course`);
  if(game==='cloudweft'){
   await page.keyboard.press('Escape');await page.locator('#sf-menu-button').click();await page.locator('#sf-daily').click();
   const todaySeed=await page.evaluate(()=>Cloudweft.seedForDate(new Date().toISOString().slice(0,10)));
   assert.equal((await state(game)).seed,todaySeed);
   await page.keyboard.press('Escape');await page.locator('#sf-menu-button').click();await page.locator('#sf-campaign').click();
   assert.equal(await page.evaluate(()=>Cloudweft.inspect().mode),'campaign');
   checks.push('Dated Cloudweft links also allow a fresh daily course and a normal campaign');
  }
 }
 const broken=await browser.newContext({serviceWorkers:'block'});
 await broken.addInitScript(()=>localStorage.setItem('pv_cloudweft_progress','"bad"'));
 const bp=await broken.newPage();const brokenErrors=[];bp.on('pageerror',e=>brokenErrors.push(e.message));
 await bp.goto(base+'/games/cloudweft.html?lang=en');await bp.waitForFunction(()=>!!window.Cloudweft?.inspect);
 await bp.locator('#sf-start').click();assert.equal(await bp.evaluate(()=>Cloudweft.inspect().running),true);assert.deepEqual(brokenErrors,[]);
 checks.push('Cloudweft recovers from malformed progress JSON');await broken.close();
 const unavailable=await browser.newContext({serviceWorkers:'block'});
 await unavailable.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/i.test(kind)?null:original.call(this,kind,...args);};});
 const up=await unavailable.newPage();
 for(const game of ['mosslight','cloudweft']){await up.goto(base+'/games/'+game+'.html');await up.waitForFunction(()=>window.pvReady);assert.equal(await up.locator(game==='mosslight'?'#ml-webgl':'#sf-error').isVisible(),true);assert.ok((await up.locator('#guide').innerText()).length>400);}
 checks.push('Both games show a readable WebGL fallback and keep guides accessible');await unavailable.close();
 const offline=await browser.newContext({viewport:{width:390,height:844}}),op=await offline.newPage();
 await op.goto(base+'/');await op.evaluate(()=>navigator.serviceWorker.ready);await op.reload();
 await op.waitForFunction(()=>!!navigator.serviceWorker.controller);
 assert.equal(await op.evaluate(async()=>!!(await caches.match('/js/pv3d.js?v=17'))),true);
 assert.equal(await op.evaluate(async()=>!!(await caches.match('/js/flagship.js?v=17'))),true);
 await offline.setOffline(true);
 for(const game of ['mosslight','cloudweft']){await op.goto(base+'/games/'+game+'.html?lang=ko');await op.waitForFunction(id=>id==='mosslight'?!!window.PVMosslight:!!window.Cloudweft?.inspect,game);await op.locator(game==='mosslight'?'#ml-overlay .ml-primary':'#sf-start').click();}
 checks.push('Version17 cache starts both 3D games offline with localized URLs');await offline.close();
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 const report={date:'2026-09-27',browser:'Microsoft Edge / Chromium, headless WebGL',checks,errors,externalRequests:external};
 fs.writeFileSync('docs/flagship-browser-checks.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));await browser.close();
})().catch(async e=>{console.error(e);if(activeBrowser)await activeBrowser.close();process.exit(1);});
