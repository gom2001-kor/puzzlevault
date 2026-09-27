/* Read-only production checks. Never submit a form or click a live advertisement. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.argv[2]||'playwright');
const root=path.resolve(__dirname,'..');
const base='https://puzzlevault.pages.dev';
(async()=>{
 const checks=[];
 for(const [route,status,pattern] of [
  ['/ko/',200,/\/learn\/english\/guides\//],
  ['/ko/contact.html',200,/의견 보내기 양식 열기/],
  ['/learn/english/guides/',200,/문장을 읽고/],
  ['/learn/english/guides/voa-welcome.html',200,/의미 덩어리로 읽기/],
  ['/ads.txt',200,/pub-6035096210993315/],
  ['/robots.txt',200,/Sitemap:/],
  ['/readiness-missing-page-20260928',404,/찾을 수 없어요/],
  ['/apps/english/package.json',404,/찾을 수 없어요/],
 ]){
  const response=await fetch(base+route,{signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,status,route);assert.match(await response.text(),pattern,route);
  checks.push({url:base+route,status:response.status});
 }
 const validator=await import(pathToFileURL(path.join(root,'apps/english/src/lib/content-validation.ts')).href);
 const response=await fetch(validator.CONTENT_SOURCE,{signal:AbortSignal.timeout(15000)});
 assert.equal(response.headers.get('access-control-allow-origin'),'*');
 const feed=await validator.validateFeed(await validator.readBoundedFeed(response));
 checks.push({url:validator.CONTENT_SOURCE,status:200,lessons:feed.manifest.verifiedLessons,segments:feed.manifest.segments,contentHash:feed.manifest.contentHash});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const errors=[],requests=[];
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},colorScheme:'dark',serviceWorkers:'block'});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>requests.push(request.url()));
  await page.goto(base+'/learn/english/',{waitUntil:'networkidle'});await page.locator('.app-shell').waitFor();
  assert.ok((await page.locator('.content-edition').innerText()).includes('최신 원본 확인'));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.goto(base+'/ko/contact.html',{waitUntil:'networkidle'});
  const colors=await page.getByRole('link',{name:'의견 보내기 양식 열기'}).evaluate(node=>{const s=getComputedStyle(node);return{color:s.color,background:s.backgroundColor,height:node.getBoundingClientRect().height}});
  assert.equal(colors.color,'rgb(255, 255, 255)');assert.equal(colors.background,'rgb(29, 78, 216)');assert.ok(colors.height>=44);
  assert.deepEqual(errors,[]);
  assert.ok(requests.every(url=>!/(?:googlesyndication|doubleclick|google-analytics|googletagmanager|clarity\.ms)/.test(url)));
  checks.push({browser:'390px dark',liveSourceApplied:true,contactButton:colors,pageErrors:errors,advertisingRequests:0});
  await context.close();
 }finally{await browser.close();}
 const report={verifiedAt:new Date().toISOString(),checks};
 if(!process.argv.includes('--no-save')) fs.writeFileSync(path.join(root,'docs/production-readiness-checks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
