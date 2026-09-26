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
            vertices.push(...a,...b,...c); normals.push(...n,...n,...n);
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
    const VS = `attribute vec3 aPosition; attribute vec3 aNormal;
        uniform mat4 uVP; uniform vec3 uPosition; uniform vec3 uScale;
        uniform vec2 uRotation; uniform vec3 uEye;
        varying float vLight; varying float vDistance;
        void main(){
            vec3 p=aPosition*uScale;
            vec3 world=vec3(uRotation.x*p.x+uRotation.y*p.z,p.y,-uRotation.y*p.x+uRotation.x*p.z)+uPosition;
            vec3 n=normalize(aNormal/max(abs(uScale),vec3(0.0001)));
            n=vec3(uRotation.x*n.x+uRotation.y*n.z,n.y,-uRotation.y*n.x+uRotation.x*n.z);
            vLight=0.43+0.57*max(dot(n,normalize(vec3(-0.45,0.8,0.65))),0.0);
            vDistance=length(world-uEye); gl_Position=uVP*vec4(world,1.0);
        }`;
    const FS = `precision mediump float; uniform vec3 uColor; uniform vec3 uFog;
        uniform float uOpacity; varying float vLight; varying float vDistance;
        void main(){float fog=smoothstep(35.0,110.0,vDistance)*0.82;
            gl_FragColor=vec4(mix(uColor*vLight,uFog,fog),uOpacity);}`;
    class Renderer {
        constructor(canvas, options={}) {
            if(!canvas || !canvas.getContext) throw new Error('PV3D needs a canvas.');
            this.canvas=canvas; this.clear=color(options.clear || '#102b2c'); this.disposed=false; this.lost=false;
            this.gl=canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'low-power'}) || canvas.getContext('experimental-webgl');
            if(!this.gl) throw new Error('WebGL is unavailable in this browser.');
            this.onLost=e=>{ e.preventDefault(); this.lost=true; };
            this.onRestore=()=>{ if(!this.disposed) { this.init(); this.lost=false; } };
            canvas.addEventListener('webglcontextlost',this.onLost);
            canvas.addEventListener('webglcontextrestored',this.onRestore);
            this.init();
        }
        init() {
            const gl=this.gl;
            const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
                if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) {const message=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(message);} return shader;};
            const vert=compile(gl.VERTEX_SHADER,VS), frag=compile(gl.FRAGMENT_SHADER,FS);
            this.program=gl.createProgram(); gl.attachShader(this.program,vert);gl.attachShader(this.program,frag);gl.linkProgram(this.program);
            gl.deleteShader(vert);gl.deleteShader(frag);
            if(!gl.getProgramParameter(this.program,gl.LINK_STATUS)) throw new Error('PV3D shader linking failed.');
            this.uniform={}; for(const name of ['VP','Position','Scale','Rotation','Eye','Color','Fog','Opacity']) this.uniform[name]=gl.getUniformLocation(this.program,'u'+name);
            this.position=gl.getAttribLocation(this.program,'aPosition');this.normal=gl.getAttribLocation(this.program,'aNormal');
            this.meshes={};
            for(const shape of ['box','plane','cone','octa','cylinder']) {
                const data=meshData(shape), buffers=[];
                for(const values of [data.vertices,data.normals]) { const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,values,gl.STATIC_DRAW);buffers.push(buffer); }
                this.meshes[shape]={buffers,count:data.vertices.length/3};
            }
            gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
        }
        render(objects, camera={}) {
            if(this.disposed || this.lost || this.gl.isContextLost()) return;
            const gl=this.gl, canvas=this.canvas, dpr=Math.min(finite(root.devicePixelRatio,1),1.5);
            const width=Math.max(1,Math.round((canvas.clientWidth || 640)*dpr)), height=Math.max(1,Math.round((canvas.clientHeight || 420)*dpr));
            if(canvas.width!==width || canvas.height!==height) {canvas.width=width;canvas.height=height;}
            const eye=camera.eye || [12,14,18], target=camera.target || [0,0,0];
            const vp=multiply(perspective(Math.min(100,Math.max(20,finite(camera.fov,45))),width/height,.08,180),lookAt(eye,target));
            gl.viewport(0,0,width,height);gl.clearColor(...this.clear,1);gl.depthMask(true);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
            gl.useProgram(this.program);gl.uniformMatrix4fv(this.uniform.VP,false,vp);gl.uniform3fv(this.uniform.Eye,eye);gl.uniform3fv(this.uniform.Fog,this.clear);
            gl.enableVertexAttribArray(this.position);gl.enableVertexAttribArray(this.normal);
            let previous=null;
            const draw=obj=>{
                const mesh=this.meshes[obj.shape || 'box']; if(!mesh) return;
                if(mesh!==previous) {
                    gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffers[0]);gl.vertexAttribPointer(this.position,3,gl.FLOAT,false,0,0);
                    gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffers[1]);gl.vertexAttribPointer(this.normal,3,gl.FLOAT,false,0,0);previous=mesh;
                }
                const ry=finite(obj.ry,0);
                gl.uniform3f(this.uniform.Position,finite(obj.x,0),finite(obj.y,0),finite(obj.z,0));
                gl.uniform3f(this.uniform.Scale,Math.max(.0001,finite(obj.sx,1)),Math.max(.0001,finite(obj.sy,1)),Math.max(.0001,finite(obj.sz,1)));
                gl.uniform2f(this.uniform.Rotation,Math.cos(ry),Math.sin(ry));gl.uniform3fv(this.uniform.Color,color(obj.color));
                gl.uniform1f(this.uniform.Opacity,Math.min(1,Math.max(0,finite(obj.opacity,1))));gl.drawArrays(gl.TRIANGLES,0,mesh.count);
            };
            const transparent=[];gl.disable(gl.BLEND);
            for(const obj of objects || []) {if(!obj || obj.visible===false) continue; if(finite(obj.opacity,1)<1) transparent.push(obj);else draw(obj);}
            if(transparent.length) {
                const distance=o=>(finite(o.x,0)-eye[0])**2+(finite(o.y,0)-eye[1])**2+(finite(o.z,0)-eye[2])**2;
                transparent.sort((a,b)=>distance(b)-distance(a));gl.enable(gl.BLEND);gl.depthMask(false);
                transparent.forEach(draw);gl.depthMask(true);gl.disable(gl.BLEND);
            }
        }
        dispose() {
            if(this.disposed) return;this.disposed=true;
            this.canvas.removeEventListener('webglcontextlost',this.onLost);this.canvas.removeEventListener('webglcontextrestored',this.onRestore);
            for(const mesh of Object.values(this.meshes)) for(const buffer of mesh.buffers) this.gl.deleteBuffer(buffer);
            this.gl.deleteProgram(this.program);
        }
    }
    const api={Renderer,math:{normalize,lookAt,perspective,multiply,project},meshData};
    root.PV3D=api; if(typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof window!=='undefined' ? window : globalThis);
