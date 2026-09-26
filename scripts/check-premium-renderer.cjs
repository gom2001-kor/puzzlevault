/* Run: node scripts/check-premium-renderer.cjs [Playwright module] [base URL]. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.argv[2] || 'playwright');
const base = process.argv[3] || 'http://127.0.0.1:8765';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + '/about.html', { waitUntil: 'domcontentloaded' });
    await page.addScriptTag({ url: base + '/js/pv3d.js?renderer-review=17' });
    const report = await page.evaluate(() => {
      document.body.replaceChildren();
      const camera = { eye: [9, 8, 12], target: [0, .5, 0], fov: 45 };
      const objects = [{shape:'box', x:0, y:-.4, z:0, sx:12, sy:.5, sz:9, color:'#8899aa'}];
      const shapes = ['box','cone','octa','cylinder','sphere','bevelbox','torus'];
      shapes.forEach((shape,i) => objects.push({shape,x:(i%4-1.5)*2.1,y:.6,z:(Math.floor(i/4)-.5)*3,sx:1.2,sy:1.6,sz:1.2,rx:i*.08,ry:i*.19,rz:i*.05,color:['#2563eb','#f43f5e','#059669','#d97706'][i%4],roughness:.15+i*.1}));
      objects.push({shape:'disk',x:0,y:-.14,z:0,sx:7,sy:1,sz:4,color:'#152539',opacity:.3,softness:.4});
      objects.push({shape:'sphere',x:1.1,y:1.6,z:2,sx:2,sy:2,sz:2,color:'#aaddff',opacity:.35,roughness:.1});
      objects.push({shape:'sphere',x:-1.5,y:1.8,z:2.5,sx:.5,sy:.5,sz:.5,color:'#ffd475',emissive:1.3});
      function make(options) {
        const canvas=document.createElement('canvas');canvas.style.cssText='width:480px;height:300px;display:block';document.body.append(canvas);
        return new PV3D.Renderer(canvas,{...options,skyTop:'#273757',skyBottom:'#8da8be',fogNear:40,fogFar:90,bloom:.1});
      }
      function shot(renderer,items=objects) {
        renderer.render(items,camera);const gl=renderer.gl,data=new Uint8Array(renderer.canvas.width*renderer.canvas.height*4);
        gl.readPixels(0,0,renderer.canvas.width,renderer.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,data);
        const error=gl.getError();let hash=2166136261;for(const byte of data){hash^=byte;hash=Math.imul(hash,16777619);}
        return {data,hash:hash>>>0,error,stats:{...renderer.stats},width:renderer.canvas.width,height:renderer.canvas.height};
      }
      function compare(a,b) {let differing=0,max=0,sum=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(d)differing++;sum+=d;max=Math.max(max,d);}return {differing,max,mean:sum/a.length};}
      const instanced=make({instancing:true}),fallback=make({instancing:false});
      const a=shot(instanced),b=shot(fallback);
      const parity=compare(a.data,b.data);
      const repeat=shot(instanced),repeatDifference=compare(a.data,repeat.data);
      const reverse=shot(instanced,[...objects].reverse()),orderDifference=compare(a.data,reverse.data);
      const noShadow=make({shadows:false,instancing:true});const c=shot(noShadow);
      const old=instanced.sceneTarget;instanced.canvas.style.width='333px';instanced.canvas.style.height='217px';const resized=shot(instanced);
      const resize={width:resized.width,height:resized.height,error:resized.error,oldFramebufferDeleted:!instanced.gl.isFramebuffer(old.buffer),oldTextureDeleted:!instanced.gl.isTexture(old.texture),oldDepthDeleted:!instanced.gl.isRenderbuffer(old.depth)};
      const resources={program:fallback.programMain,mesh:fallback.meshes.box.buffers[0],target:fallback.sceneTarget};fallback.dispose();fallback.dispose();
      const disposal={programDeleted:!fallback.gl.isProgram(resources.program),meshDeleted:!fallback.gl.isBuffer(resources.mesh),framebufferDeleted:!fallback.gl.isFramebuffer(resources.target.buffer),textureDeleted:!fallback.gl.isTexture(resources.target.texture),error:fallback.gl.getError()};
      // A flat rough surface with no occluder must not gain self-shadow stipples.
      const flat=[{shape:'plane',x:0,y:0,z:0,sx:28,sz:28,color:'#839fa1',roughness:1}];
      const floorShadow=make({shadows:true}),floorClear=make({shadows:false});
      floorShadow.setEnvironment({fogNear:500,fogFar:900,bloom:0});floorClear.setEnvironment({fogNear:500,fogFar:900,bloom:0});
      const selfShadow=[];
      for(const [eye,target] of [[[9,8,12],[0,.5,0]], [[1,14,16],[0,0,0]], [[-8,7,11],[2,0,1]]]){
        camera.eye=eye;camera.target=target;
        const lit=shot(floorShadow,flat),clear=shot(floorClear,flat);
        selfShadow.push({eye,target,difference:compare(lit.data,clear.data),error:lit.error|clear.error});
      }
      floorShadow.dispose();floorClear.dispose();camera.eye=[9,8,12];camera.target=[0,.5,0];
      window.rendererReview={instanced,noShadow,objects,camera,shot};
      return {selfShadow,instancingSupported:!!instanced.ext,instanced:{hash:a.hash,stats:a.stats,error:a.error},fallback:{hash:b.hash,stats:b.stats,error:b.error},parity,repeatDifference,orderDifference,shadowsDisabled:{targetIsNull:noShadow.shadowTarget===null,error:c.error,pixelsDiffer:compare(a.data,c.data).differing},resize,disposal};
    });
    for(const check of report.selfShadow){assert.equal(check.error,0);assert.equal(check.difference.max,0,'Unoccluded ground must remain fully lit with shadows enabled');}
    assert.equal(report.instanced.error,0);assert.equal(report.fallback.error,0);
    assert.equal(report.parity.max,0,'Instancing must preserve pixels');
    assert.equal(report.repeatDifference.max,0,'Same scene should render repeatably');
    assert.equal(report.orderDifference.max,0,'Depth and transparency sorting should preserve pixels');
    assert.equal(report.shadowsDisabled.targetIsNull,true);assert.equal(report.shadowsDisabled.error,0);
    assert.equal(report.resize.width,333);assert.equal(report.resize.height,217);assert.equal(report.resize.error,0);
    assert.equal(report.resize.oldFramebufferDeleted,true);assert.equal(report.resize.oldTextureDeleted,true);assert.equal(report.resize.oldDepthDeleted,true);
    assert.equal(report.disposal.error,0);for(const key of ['programDeleted','meshDeleted','framebufferDeleted','textureDeleted'])assert.equal(report.disposal[key],true);
    const lossSupported = await page.evaluate(() => {const r=rendererReview.instanced;window.reviewLoss=r.gl.getExtension('WEBGL_lose_context');if(!reviewLoss)return false;reviewLoss.loseContext();return true;});
    if(lossSupported){
      await page.waitForFunction(()=>rendererReview.instanced.lost);
      await page.evaluate(()=>{rendererReview.instanced.render(rendererReview.objects,rendererReview.camera);reviewLoss.restoreContext();});
      await page.waitForFunction(()=>!rendererReview.instanced.lost&&!rendererReview.instanced.gl.isContextLost());
      report.contextRestore=await page.evaluate(()=>{const r=rendererReview.instanced,shot=rendererReview.shot(r);return {error:shot.error,drawCalls:shot.stats.drawCalls,width:shot.width,height:shot.height,shadowReady:!!r.shadowTarget,sceneReady:!!r.sceneTarget};});
      assert.equal(report.contextRestore.error,0);assert.ok(report.contextRestore.drawCalls>0);assert.equal(report.contextRestore.shadowReady,true);assert.equal(report.contextRestore.sceneReady,true);
    }else report.contextRestore={supported:false};
    // Capability simulation on this desktop GPU, not a physical legacy-device test.
    report.fragmentHighpFallback = await page.evaluate(() => {
      const canvas=document.createElement('canvas');canvas.style.cssText='width:320px;height:200px;display:block';document.body.append(canvas);
      const gl=canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'high-performance'});
      const nativeQuery=gl.getShaderPrecisionFormat.bind(gl);
      const nativeHighpPrecision=nativeQuery(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT).precision;
      let simulatedQueries=0;
      gl.getShaderPrecisionFormat=(shaderType,precisionType)=>{
        if(shaderType===gl.FRAGMENT_SHADER&&precisionType===gl.HIGH_FLOAT){simulatedQueries++;return {rangeMin:0,rangeMax:0,precision:0};}
        return nativeQuery(shaderType,precisionType);
      };
      let renderer;
      try {
        renderer=new PV3D.Renderer(canvas,{shadows:true});
        const result=rendererReview.shot(renderer);
        const attached=gl.getAttachedShaders(renderer.programMain);
        const matchingMediumpVaryings=attached.every(shader=>/varying mediump vec3 vWorld/.test(gl.getShaderSource(shader)));
        return {method:'Per-context getShaderPrecisionFormat capability simulation; not physical legacy hardware',nativeHighpPrecision,simulatedHighpPrecision:0,simulatedQueries,matchingMediumpVaryings,created:true,shadowTargetIsNull:renderer.shadowTarget===null,error:result.error,drawCalls:result.stats.drawCalls,instances:result.stats.instances};
      } finally {
        gl.getShaderPrecisionFormat=nativeQuery;
        if(renderer)renderer.dispose();canvas.remove();
      }
    });
    assert.equal(report.fragmentHighpFallback.created,true);
    assert.ok(report.fragmentHighpFallback.simulatedQueries>0);
    assert.equal(report.fragmentHighpFallback.matchingMediumpVaryings,true);
    assert.equal(report.fragmentHighpFallback.shadowTargetIsNull,true);
    assert.equal(report.fragmentHighpFallback.error,0);
    assert.ok(report.fragmentHighpFallback.drawCalls>0);
    assert.equal(report.fragmentHighpFallback.instances,11);
    report.pageErrors=errors;assert.deepEqual(errors,[]);
    await page.evaluate(()=>{rendererReview.instanced.dispose();rendererReview.noShadow.dispose();});
    fs.writeFileSync('docs/premium-renderer-checks.json',JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
