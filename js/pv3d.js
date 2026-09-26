/* PuzzleVault's original, dependency-free low-poly WebGL renderer.
   Unit meshes are centered at the origin; plane is horizontal in XZ.
   The caller owns the animation loop. No network, assets, or audio are loaded. */
(function (root) {
    'use strict';
    const EPS = 1e-6;
    const finite = (n, fallback) => Number.isFinite(n) ? n : fallback;
    const sub = (a, b) => a.map((n, i) => n - b[i]);
    const dot = (a, b) => a.reduce((n, v, i) => n + v * b[i], 0);
    const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
    function normalize(v) { const n = Math.hypot(...v); return n > EPS ? v.map(x => x/n) : [0, 1, 0]; }
    function perspective(fov, aspect, near, far) {
        const out = new Float32Array(16), f = 1 / Math.tan(fov * Math.PI / 360);
        out[0] = f / aspect; out[5] = f; out[10] = (far + near) / (near - far);
        out[11] = -1; out[14] = 2 * far * near / (near - far); return out;
    }
    function lookAt(eye, target) {
        let z = normalize(sub(eye, target));
        let x = normalize(cross(Math.abs(z[1]) > .999 ? [0,0,1] : [0,1,0], z));
        let y = cross(z, x);
        return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
    }
    function multiply(a, b) {
        const out = new Float32Array(16);
        for (let col=0; col<4; col++) for(let row=0; row<4; row++)
            for(let k=0; k<4; k++) out[col*4+row] += a[k*4+row]*b[col*4+k];
        return out;
    }
    function project(point, matrix) {
        const p = [...point, 1], out = [0,0,0,0];
        for(let r=0;r<4;r++) for(let c=0;c<4;c++) out[r] += matrix[c*4+r]*p[c];
        return out[3] > EPS ? out.slice(0,3).map(n=>n/out[3]) : null;
    }
    function meshData(shape) {
        const vertices = [], normals = [];
        function tri(a,b,c, normal) {
            const n = normal || normalize(cross(sub(b,a),sub(c,a)));
            vertices.push(...a,...b,...c); if(n.length===9) normals.push(...n); else normals.push(...n,...n,...n);
        }
        function quad(a,b,c,d,n) { tri(a,b,c,n); tri(a,c,d,n); }
        const p=.5, m=-.5;
        if(shape === 'plane') quad([m,0,m],[m,0,p],[p,0,p],[p,0,m],[0,1,0]);
        else if(shape === 'box') {
            quad([m,p,m],[m,p,p],[p,p,p],[p,p,m],[0,1,0]);
            quad([m,m,p],[m,m,m],[p,m,m],[p,m,p],[0,-1,0]);
            quad([m,m,p],[p,m,p],[p,p,p],[m,p,p],[0,0,1]);
            quad([p,m,m],[m,m,m],[m,p,m],[p,p,m],[0,0,-1]);
            quad([p,m,p],[p,m,m],[p,p,m],[p,p,p],[1,0,0]);
            quad([m,m,m],[m,m,p],[m,p,p],[m,p,m],[-1,0,0]);
        } else if(shape === 'octa') {
            const ring = [[p,0,0],[0,0,m],[m,0,0],[0,0,p]];
            for(let i=0;i<4;i++) { tri([0,p,0],ring[i],ring[(i+1)%4]); tri([0,m,0],ring[(i+1)%4],ring[i]); }
        } else if(shape === 'cone' || shape === 'cylinder') {
            for(let i=0;i<10;i++) {
                const a=i*Math.PI/5, b=(i+1)*Math.PI/5;
                const a0=[Math.cos(a)*p,m,Math.sin(a)*p], b0=[Math.cos(b)*p,m,Math.sin(b)*p];
                tri([0,m,0],a0,b0,[0,-1,0]);
                if(shape === 'cone') tri(a0,[0,p,0],b0);
                else { const a1=[a0[0],p,a0[2]], b1=[b0[0],p,b0[2]];
                    quad(a0,a1,b1,b0); tri([0,p,0],b1,a1,[0,1,0]); }
            }
        } else if(shape === 'sphere') {
            const rings=8, sides=14;
            const point=(i,j)=>{const a=i*Math.PI/rings,b=j*Math.PI*2/sides;return [Math.sin(a)*Math.cos(b)*.5,Math.cos(a)*.5,Math.sin(a)*Math.sin(b)*.5];};
            for(let i=0;i<rings;i++) for(let j=0;j<sides;j++) {
                const a=point(i,j),b=point(i,j+1),c=point(i+1,j+1),d=point(i+1,j);
                if(i>0) tri(a,b,d,[...a,...b,...d].map(v=>v*2));
                if(i<rings-1) tri(b,c,d,[...b,...c,...d].map(v=>v*2));
            }
        } else if(shape === 'bevelbox') {
            const steps=[-.5,-.41,.41,.5];
            for(let axis=0;axis<3;axis++) for(const sign of [-1,1]) {
                const point=(u,v)=>{const q=[0,0,0];q[axis]=sign*.5;q[(axis+1)%3]=u;q[(axis+2)%3]=v;
                    const center=q.map(x=>Math.max(-.41,Math.min(.41,x))),n=normalize(sub(q,center));return {p:center.map((x,i)=>x+n[i]*.09),n};};
                for(let i=0;i<3;i++) for(let j=0;j<3;j++) {const a=point(steps[i],steps[j]),b=point(steps[i+1],steps[j]),c=point(steps[i+1],steps[j+1]),d=point(steps[i],steps[j+1]);
                    tri(a.p,b.p,c.p,[...a.n,...b.n,...c.n]);tri(a.p,c.p,d.p,[...a.n,...c.n,...d.n]);}
            }
        } else if(shape === 'torus') {
            const point=(i,j)=>{const a=i*Math.PI/10,b=j*Math.PI/3,r=.42+.08*Math.cos(b);return {p:[Math.cos(a)*r,Math.sin(b)*.08,Math.sin(a)*r],n:[Math.cos(a)*Math.cos(b),Math.sin(b),Math.sin(a)*Math.cos(b)]};};
            for(let i=0;i<20;i++) for(let j=0;j<6;j++){const a=point(i,j),b=point(i+1,j),c=point(i+1,j+1),d=point(i,j+1);tri(a.p,b.p,c.p,[...a.n,...b.n,...c.n]);tri(a.p,c.p,d.p,[...a.n,...c.n,...d.n]);}
        } else if(shape === 'disk') {
            for(let i=0;i<32;i++){const a=i*Math.PI/16,b=(i+1)*Math.PI/16;tri([0,0,0],[Math.cos(a)*.5,0,Math.sin(a)*.5],[Math.cos(b)*.5,0,Math.sin(b)*.5],[0,1,0]);}
        } else throw new Error('Unknown PV3D primitive: ' + shape);
        return {vertices:new Float32Array(vertices), normals:new Float32Array(normals)};
    }
    const colors = new Map();
    function color(value) {
        const key = typeof value === 'string' ? value : '#ffffff';
        if(colors.has(key)) return colors.get(key);
        let hex=key.replace('#',''); if(hex.length===3) hex=hex.split('').map(c=>c+c).join('');
        if(!/^[0-9a-f]{6}$/i.test(hex)) hex='ffffff';
        const rgb=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255);
        if(colors.size < 512) colors.set(key,rgb); return rgb;
    }
    function orthographic(span, near, far) {
        return new Float32Array([1/span,0,0,0,0,1/span,0,0,0,0,-2/(far-near),0,0,0,-(far+near)/(far-near),1]);
    }
    const SHAPES=['box','plane','cone','octa','cylinder','sphere','bevelbox','torus','disk'];
    const ATTRS=['aPosition','aNormal','iPosition','iScale','iRotation','iColor','iSurface'];
    const STRIDE=16;
    const VS=`attribute vec3 aPosition; attribute vec3 aNormal;
        attribute vec3 iPosition; attribute vec3 iScale; attribute vec3 iRotation;
        attribute vec4 iColor; attribute vec3 iSurface;
        uniform mat4 uVP; uniform mat4 uShadowVP;
        varying PV_PRECISION vec3 vWorld; varying PV_PRECISION vec3 vNormal; varying PV_PRECISION vec4 vColor;
        varying PV_PRECISION vec3 vSurface; varying PV_PRECISION vec4 vShadow; varying PV_PRECISION vec2 vLocal;
        vec3 rotate(vec3 p, vec3 a){
            vec3 c=cos(a),s=sin(a);
            p=vec3(p.x,c.x*p.y-s.x*p.z,s.x*p.y+c.x*p.z);
            p=vec3(c.y*p.x+s.y*p.z,p.y,-s.y*p.x+c.y*p.z);
            return vec3(c.z*p.x-s.z*p.y,s.z*p.x+c.z*p.y,p.z);
        }
        void main(){
            vec3 world=rotate(aPosition*iScale,iRotation)+iPosition;
            vWorld=world;vNormal=rotate(normalize(aNormal/max(abs(iScale),vec3(.0001))),iRotation);
            vColor=iColor;vSurface=iSurface;vLocal=aPosition.xz;
            vShadow=uShadowVP*vec4(world,1.0);gl_Position=uVP*vec4(world,1.0);
        }`;
    const FS=`#ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
        #else
        precision mediump float;
        #endif
        uniform vec3 uEye; uniform vec3 uFog; uniform vec3 uLight;
        uniform vec2 uFogRange; uniform sampler2D uShadowMap;
        uniform float uPass; uniform float uHasShadow; uniform float uDisk; uniform float uShadowTexel;
        varying PV_PRECISION vec3 vWorld; varying PV_PRECISION vec3 vNormal; varying PV_PRECISION vec4 vColor;
        varying PV_PRECISION vec3 vSurface; varying PV_PRECISION vec4 vShadow; varying PV_PRECISION vec2 vLocal;
        vec4 packDepth(float d){
            #ifdef GL_FRAGMENT_PRECISION_HIGH
            vec4 p=fract(d*vec4(16777216.0,65536.0,256.0,1.0));return (p-p.xxyz*vec4(0.0,.00390625,.00390625,.00390625))*(256.0/255.0);
            #else
            return vec4(d);
            #endif
        }
        float unpackDepth(vec4 p){
            #ifdef GL_FRAGMENT_PRECISION_HIGH
            return dot(p,vec4(.000000059604644775,.0000152587890625,.00390625,1.0))*(255.0/256.0);
            #else
            return p.r;
            #endif
        }
        float shadow(vec3 n){
            vec3 p=vShadow.xyz/vShadow.w*.5+.5;
            if(uHasShadow<.5||p.x<.002||p.x>.998||p.y<.002||p.y>.998||p.z<0.0||p.z>1.0)return 1.0;
            float bias=.0016+.0018*(1.0-max(dot(n,normalize(vec3(-.55,1.0,.6))),0.0));
            float sum=0.0;
            for(int x=0;x<2;x++)for(int y=0;y<2;y++){
                vec2 d=(vec2(float(x),float(y))-.5)*uShadowTexel*1.6;
                sum+=step(p.z-bias,unpackDepth(texture2D(uShadowMap,p.xy+d)));
            }
            return .38+.62*sum*.25;
        }
        void main(){
            if(uPass<.5){gl_FragColor=packDepth(gl_FragCoord.z);return;}
            vec3 n=normalize(vNormal),view=normalize(uEye-vWorld),key=normalize(vec3(-.55,1.0,.6));
            float visibility=shadow(n),diffuse=max(dot(n,key),0.0);
            float rough=clamp(vSurface.y,.08,1.0);
            float spec=pow(max(dot(n,normalize(key+view)),0.0),mix(80.0,9.0,rough))*(1.0-rough)*.55;
            float rim=pow(1.0-max(dot(n,view),0.0),3.0)*.13;
            vec3 base=pow(max(vColor.rgb,vec3(.0)),vec3(2.2));
            vec3 ambient=mix(vec3(.19,.25,.28),vec3(.60,.72,.82),n.y*.5+.5)*.72;
            vec3 lit=base*(ambient+uLight*diffuse*.82*visibility)+uLight*spec*visibility+base*rim+base*vSurface.x*2.5;
            vec3 result=pow(max(lit,vec3(.0)),vec3(.454545));
            result=result/(vec3(1.0)+result*.12);
            float distance=length(vWorld-uEye),fog=smoothstep(uFogRange.x,uFogRange.y,distance)*.9;
            float alpha=vColor.a;
            if(uDisk>.5)alpha*=1.0-smoothstep(.5-clamp(vSurface.z,.02,.48),.5,length(vLocal));
            gl_FragColor=vec4(mix(result,uFog,fog),alpha);
        }`;
    const QUAD_VS=`attribute vec2 aPosition; varying mediump vec2 vUV;void main(){vUV=aPosition*.5+.5;gl_Position=vec4(aPosition,0.0,1.0);}`;
    const SKY_FS=`precision mediump float; varying mediump vec2 vUV;uniform vec3 uTop;uniform vec3 uBottom;uniform vec3 uLight;
        void main(){float h=smoothstep(0.0,1.0,vUV.y);vec3 col=mix(uBottom,uTop,h);
            float glow=exp(-length((vUV-vec2(.72,.76))*vec2(1.0,1.3))*4.8)*.16;
            gl_FragColor=vec4(col+uLight*glow,1.0);}`;
    const POST_FS=`precision mediump float; varying mediump vec2 vUV;uniform sampler2D uScene;uniform vec2 uTexel;uniform float uBloom;
        vec3 bright(vec2 uv){vec3 col=texture2D(uScene,uv).rgb;return col*max(max(col.r,col.g),col.b-0.0)*smoothstep(.76,1.0,max(max(col.r,col.g),col.b));}
        void main(){vec3 base=texture2D(uScene,vUV).rgb;
            vec3 north=texture2D(uScene,vUV+vec2(0.0,uTexel.y)).rgb,south=texture2D(uScene,vUV-vec2(0.0,uTexel.y)).rgb;
            vec3 east=texture2D(uScene,vUV+vec2(uTexel.x,0.0)).rgb,west=texture2D(uScene,vUV-vec2(uTexel.x,0.0)).rgb;
            vec3 lum=vec3(.299,.587,.114);float hi=max(max(dot(north,lum),dot(south,lum)),max(dot(east,lum),dot(west,lum)));
            float lo=min(min(dot(north,lum),dot(south,lum)),min(dot(east,lum),dot(west,lum)));
            base=mix(base,(base*2.0+north+south+east+west)/6.0,smoothstep(.06,.18,hi-lo)*.45);
            vec3 glow=vec3(0.0);
            for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)glow+=bright(vUV+vec2(float(x),float(y))*uTexel*3.5);
            float vignette=1.0-.13*pow(length((vUV-.5)*vec2(1.0,.8)),1.5);
            gl_FragColor=vec4((base+glow*(uBloom/9.0))*vignette,1.0);}`;
    function instanceValues(obj, target, offset=0) {
        const rgb=color(obj.color);
        target[offset]=finite(obj.x,0);target[offset+1]=finite(obj.y,0);target[offset+2]=finite(obj.z,0);
        target[offset+3]=Math.max(.0001,finite(obj.sx,1));target[offset+4]=Math.max(.0001,finite(obj.sy,1));target[offset+5]=Math.max(.0001,finite(obj.sz,1));
        target[offset+6]=finite(obj.rx,0);target[offset+7]=finite(obj.ry,0);target[offset+8]=finite(obj.rz,0);
        target[offset+9]=rgb[0];target[offset+10]=rgb[1];target[offset+11]=rgb[2];
        target[offset+12]=Math.min(1,Math.max(0,finite(obj.opacity,1)));
        target[offset+13]=Math.min(3,Math.max(0,finite(obj.emissive,0)));
        target[offset+14]=Math.min(1,Math.max(.08,finite(obj.roughness,.72)));
        target[offset+15]=Math.min(.48,Math.max(.02,finite(obj.softness,.15)));return target;
    }

    class Renderer {
        constructor(canvas, options={}) {
            if(!canvas || !canvas.getContext) throw new Error('PV3D needs a canvas.');
            this.canvas=canvas;this.disposed=false;this.lost=false;this.options={};this.setEnvironment(options);
            this.gl=canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'high-performance'})||canvas.getContext('experimental-webgl');
            if(!this.gl)throw new Error('WebGL is unavailable in this browser.');
            this.onLost=e=>{e.preventDefault();this.lost=true;};
            this.onRestore=()=>{if(!this.disposed){this.init();this.lost=false;}};
            canvas.addEventListener('webglcontextlost',this.onLost);canvas.addEventListener('webglcontextrestored',this.onRestore);
            this.init();
        }
        setEnvironment(options={}) {
            Object.assign(this.options,options);
            this.clear=color(this.options.clear||'#173c42');
            this.skyTop=color(this.options.skyTop||this.options.clear||'#1c4a55');
            this.skyBottom=color(this.options.skyBottom||this.options.clear||'#395f64');
            this.light=color(this.options.lightColor||'#ffe1ac');
            this.fogNear=finite(this.options.fogNear,30);this.fogFar=Math.max(this.fogNear+1,finite(this.options.fogFar,100));
            this.bloom=Math.max(0,Math.min(.4,finite(this.options.bloom,.12)));
        }
        program(vertex,fragment,attributes=ATTRS) {
            const gl=this.gl,compiled=[];
            try{
                for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
                    const shader=gl.createShader(type);compiled.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);
                    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));
                }
                const program=gl.createProgram();compiled.forEach(shader=>gl.attachShader(program,shader));
                attributes.forEach((name,i)=>gl.bindAttribLocation(program,i,name));gl.linkProgram(program);
                if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);throw new Error('PV3D shader linking failed.');}
                return program;
            }finally{compiled.forEach(shader=>gl.deleteShader(shader));}
        }
        init() {
            const gl=this.gl;this.ext=this.options.instancing===false?null:gl.getExtension('ANGLE_instanced_arrays');
            const precision=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT);
            const varyingPrecision=precision&&precision.precision>0?'highp':'mediump';
            this.programMain=this.program(VS.replaceAll('PV_PRECISION',varyingPrecision),FS.replaceAll('PV_PRECISION',varyingPrecision));this.programSky=this.program(QUAD_VS,SKY_FS,['aPosition']);this.programPost=this.program(QUAD_VS,POST_FS,['aPosition']);
            const locations=(program,names)=>Object.fromEntries(names.map(n=>[n,gl.getUniformLocation(program,'u'+n)]));
            this.u=locations(this.programMain,['VP','ShadowVP','Eye','Fog','Light','FogRange','ShadowMap','Pass','HasShadow','Disk','ShadowTexel']);
            this.sky=locations(this.programSky,['Top','Bottom','Light']);this.post=locations(this.programPost,['Scene','Texel','Bloom']);
            this.meshes={};this.groups={};this.shadowGroups={};
            for(const shape of SHAPES){
                const data=meshData(shape),buffers=[];
                for(const values of [data.vertices,data.normals]){const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,values,gl.STATIC_DRAW);buffers.push(buffer);}
                this.meshes[shape]={buffers,count:data.vertices.length/3,instance:gl.createBuffer(),capacity:0,values:new Float32Array(0)};
                this.groups[shape]=[];this.shadowGroups[shape]=[];
            }
            this.quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
            this.single=new Float32Array(STRIDE);this.sceneTarget=null;this.shadowTarget=null;
            if(this.options.shadows!==false&&precision&&precision.precision>0){this.shadowTarget=this.target(768,768);if(this.shadowTarget){gl.bindTexture(gl.TEXTURE_2D,this.shadowTarget.texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);}}
            gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
            this.stats={drawCalls:0,instances:0,triangles:0,instanced:!!this.ext};
        }
        target(width,height) {
            const gl=this.gl,texture=gl.createTexture(),depth=gl.createRenderbuffer(),buffer=gl.createFramebuffer();
            gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
            gl.bindRenderbuffer(gl.RENDERBUFFER,depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,width,height);
            gl.bindFramebuffer(gl.FRAMEBUFFER,buffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);
            const target={width,height,texture,depth,buffer};
            if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){this.deleteTarget(target);gl.bindFramebuffer(gl.FRAMEBUFFER,null);return null;}
            gl.bindFramebuffer(gl.FRAMEBUFFER,null);return target;
        }
        deleteTarget(target){if(!target)return;this.gl.deleteTexture(target.texture);this.gl.deleteRenderbuffer(target.depth);this.gl.deleteFramebuffer(target.buffer);}
        bindMesh(mesh){const gl=this.gl;for(let i=0;i<2;i++){gl.enableVertexAttribArray(i);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffers[i]);gl.vertexAttribPointer(i,3,gl.FLOAT,false,0,0);}}
        batch(shape,objects,shadowPass=false){
            if(!objects.length)return;
            const gl=this.gl,mesh=this.meshes[shape];this.bindMesh(mesh);gl.uniform1f(this.u.Disk,shape==='disk'?1:0);
            if(this.ext){
                if(mesh.capacity<objects.length){mesh.capacity=Math.max(32,2**Math.ceil(Math.log2(objects.length)));mesh.values=new Float32Array(mesh.capacity*STRIDE);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.instance);gl.bufferData(gl.ARRAY_BUFFER,mesh.values.byteLength,gl.DYNAMIC_DRAW);}
                objects.forEach((obj,i)=>instanceValues(obj,mesh.values,i*STRIDE));gl.bindBuffer(gl.ARRAY_BUFFER,mesh.instance);gl.bufferSubData(gl.ARRAY_BUFFER,0,mesh.values.subarray(0,objects.length*STRIDE));
                [3,3,3,4,3].forEach((size,i)=>{const loc=i+2,offset=[0,3,6,9,13][i];gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,STRIDE*4,offset*4);this.ext.vertexAttribDivisorANGLE(loc,1);});
                this.ext.drawArraysInstancedANGLE(gl.TRIANGLES,0,mesh.count,objects.length);this.stats.drawCalls++;
            }else objects.forEach(obj=>this.drawObject(obj,mesh,true));
            if(!shadowPass){this.stats.instances+=objects.length;this.stats.triangles+=mesh.count/3*objects.length;}
        }
        constants(){for(let i=2;i<7;i++){this.gl.disableVertexAttribArray(i);if(this.ext)this.ext.vertexAttribDivisorANGLE(i,0);}}
        drawObject(obj,mesh,alreadyBound=false){
            const gl=this.gl;if(!alreadyBound)this.bindMesh(mesh);this.constants();instanceValues(obj,this.single);
            gl.vertexAttrib3fv(2,this.single.subarray(0,3));gl.vertexAttrib3fv(3,this.single.subarray(3,6));gl.vertexAttrib3fv(4,this.single.subarray(6,9));gl.vertexAttrib4fv(5,this.single.subarray(9,13));gl.vertexAttrib3fv(6,this.single.subarray(13,16));
            gl.uniform1f(this.u.Disk,obj.shape==='disk'?1:0);gl.drawArrays(gl.TRIANGLES,0,mesh.count);this.stats.drawCalls++;
        }
        fullScreen(program){const gl=this.gl;gl.useProgram(program);for(let i=1;i<7;i++){gl.disableVertexAttribArray(i);if(this.ext)this.ext.vertexAttribDivisorANGLE(i,0);}gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.enableVertexAttribArray(0);gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,3);this.stats.drawCalls++;}
        render(objects,camera={}) {
            if(this.disposed||this.lost||this.gl.isContextLost())return;
            const gl=this.gl,canvas=this.canvas,dpr=Math.min(finite(root.devicePixelRatio,1),1.5),maxPixels=1800000;
            let width=Math.max(1,Math.round((canvas.clientWidth||640)*dpr)),height=Math.max(1,Math.round((canvas.clientHeight||420)*dpr));
            const limit=Math.min(1,Math.sqrt(maxPixels/(width*height)));width=Math.round(width*limit);height=Math.round(height*limit);
            if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
            if(!this.sceneTarget||this.sceneTarget.width!==width||this.sceneTarget.height!==height){this.deleteTarget(this.sceneTarget);this.sceneTarget=this.target(width,height);}
            const eye=camera.eye||[12,14,18],target=camera.target||[0,0,0];
            const vp=multiply(perspective(Math.min(100,Math.max(20,finite(camera.fov,45))),width/height,.08,180),lookAt(eye,target));
            const shadowEye=[target[0]-22,target[1]+40,target[2]+24];
            const shadowVP=multiply(orthographic(finite(this.options.shadowSpan,23),1,100),lookAt(shadowEye,target));
            for(const shape of SHAPES){this.groups[shape].length=0;this.shadowGroups[shape].length=0;}
            const transparent=[];this.stats={drawCalls:0,instances:0,triangles:0,instanced:!!this.ext};
            for(const obj of objects||[]){if(!obj||obj.visible===false||!this.meshes[obj.shape||'box'])continue;
                const shape=obj.shape||'box';if(finite(obj.opacity,1)<.995||shape==='disk')transparent.push(obj);else{this.groups[shape].push(obj);if(obj.castShadow!==false)this.shadowGroups[shape].push(obj);}}
            gl.useProgram(this.programMain);gl.uniformMatrix4fv(this.u.ShadowVP,false,shadowVP);gl.uniform1f(this.u.Pass,0);gl.uniform1f(this.u.HasShadow,0);
            gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.disable(gl.BLEND);
            // Explicitly unbind the sampled texture before rendering into it.
            gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,null);
            if(this.shadowTarget){
                gl.disable(gl.DITHER); // Packed RGBA depth must not receive color dithering.
                gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowTarget.buffer);gl.viewport(0,0,this.shadowTarget.width,this.shadowTarget.height);gl.clearColor(1,1,1,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
                gl.uniformMatrix4fv(this.u.VP,false,shadowVP);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,2);
                for(const shape of SHAPES)this.batch(shape,this.shadowGroups[shape],true);gl.disable(gl.POLYGON_OFFSET_FILL);
            }
            gl.enable(gl.DITHER);gl.bindFramebuffer(gl.FRAMEBUFFER,this.sceneTarget?this.sceneTarget.buffer:null);gl.viewport(0,0,width,height);gl.clearColor(...this.clear,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
            gl.useProgram(this.programSky);gl.uniform3fv(this.sky.Top,this.skyTop);gl.uniform3fv(this.sky.Bottom,this.skyBottom);gl.uniform3fv(this.sky.Light,this.light);this.fullScreen(this.programSky);
            gl.useProgram(this.programMain);gl.enable(gl.DEPTH_TEST);gl.uniform1f(this.u.Pass,1);gl.uniformMatrix4fv(this.u.VP,false,vp);gl.uniform3fv(this.u.Eye,eye);gl.uniform3fv(this.u.Fog,this.skyBottom);gl.uniform3fv(this.u.Light,this.light);gl.uniform2f(this.u.FogRange,this.fogNear,this.fogFar);
            gl.uniform1f(this.u.HasShadow,this.shadowTarget?1:0);gl.uniform1f(this.u.ShadowTexel,this.shadowTarget?1/this.shadowTarget.width:0);gl.uniform1i(this.u.ShadowMap,0);gl.bindTexture(gl.TEXTURE_2D,this.shadowTarget?this.shadowTarget.texture:null);
            for(const shape of SHAPES)this.batch(shape,this.groups[shape]);
            if(transparent.length){const distance=o=>(finite(o.x,0)-eye[0])**2+(finite(o.y,0)-eye[1])**2+(finite(o.z,0)-eye[2])**2;transparent.sort((a,b)=>distance(b)-distance(a));gl.enable(gl.BLEND);gl.depthMask(false);
                for(const obj of transparent){const mesh=this.meshes[obj.shape||'box'];this.drawObject(obj,mesh);this.stats.instances++;this.stats.triangles+=mesh.count/3;}gl.depthMask(true);gl.disable(gl.BLEND);}
            if(this.sceneTarget){gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,width,height);gl.useProgram(this.programPost);gl.bindTexture(gl.TEXTURE_2D,this.sceneTarget.texture);gl.uniform1i(this.post.Scene,0);gl.uniform2f(this.post.Texel,1/width,1/height);gl.uniform1f(this.post.Bloom,this.bloom);this.fullScreen(this.programPost);}
        }
        dispose(){
            if(this.disposed)return;this.disposed=true;
            const gl=this.gl;this.canvas.removeEventListener('webglcontextlost',this.onLost);this.canvas.removeEventListener('webglcontextrestored',this.onRestore);
            for(const mesh of Object.values(this.meshes)){mesh.buffers.forEach(b=>gl.deleteBuffer(b));gl.deleteBuffer(mesh.instance);}
            gl.deleteBuffer(this.quad);[this.programMain,this.programSky,this.programPost].forEach(p=>gl.deleteProgram(p));this.deleteTarget(this.shadowTarget);this.deleteTarget(this.sceneTarget);
        }
    }
    const api={Renderer,math:{normalize,lookAt,perspective,multiply,project,orthographic},meshData,instanceValues};
    root.PV3D=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
