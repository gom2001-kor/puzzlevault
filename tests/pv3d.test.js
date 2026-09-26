const test = require('node:test');
const assert = require('node:assert/strict');
const { math, meshData, instanceValues } = require('../js/pv3d.js');
test('perspective camera projects its target to the center and rejects points behind it', () => {
    const vp=math.multiply(math.perspective(45,16/9,.1,100),math.lookAt([4,8,12],[0,0,0]));
    const projected=math.project([0,0,0],vp);
    assert.ok(Math.abs(projected[0])<1e-6 && Math.abs(projected[1])<1e-6);
    assert.ok(projected[2]>-1 && projected[2]<1);
    assert.equal(math.project([8,16,24],vp),null);
});
test('vertical cameras stay finite without a singular view matrix', () => {
    assert.ok([...math.lookAt([0,10,0],[0,0,0])].every(Number.isFinite));
    const vp=math.multiply(math.perspective(45,1,.1,100),math.lookAt([0,10,0],[0,0,0]));
    assert.ok(math.project([1,0,0],vp).some(n=>n!==0));
});
test('all authored primitives have finite unit geometry and normalized triangle normals', () => {
    for(const shape of ['box','plane','cone','cylinder','octa','sphere','bevelbox','torus','disk']) {
        const mesh=meshData(shape);
        assert.equal(mesh.vertices.length%9,0);assert.equal(mesh.normals.length,mesh.vertices.length);
        assert.ok(mesh.vertices.length>=18);
        assert.ok([...mesh.vertices].every(v=>Number.isFinite(v) && Math.abs(v)<=.500001));
        for(let i=0;i<mesh.normals.length;i+=3) assert.ok(Math.abs(Math.hypot(...mesh.normals.slice(i,i+3))-1)<1e-6);
    }
});
test('unknown primitives fail explicitly', () => assert.throws(()=>meshData('downloaded-model'),/Unknown/));

test('a local shadow camera covers the focus point and excludes distant terrain', () => {
    const vp=math.multiply(math.orthographic(23,1,100),math.lookAt([-22,40,24],[0,0,0]));
    const center=math.project([0,0,0],vp);
    assert.ok(Math.abs(center[0])<1e-6 && Math.abs(center[1])<1e-6);
    assert.ok(Math.abs(center[2])<1);
    assert.ok(math.project([200,0,200],vp).some(n=>Math.abs(n)>1));
});
test('GPU instance packing preserves Euler rotations, material and opacity without mutating source', () => {
    const obj=Object.freeze({shape:'sphere',x:3,y:2,z:-4,sx:2,sy:3,sz:4,rx:.1,ry:.2,rz:.3,color:'#ff8000',opacity:.5,emissive:.8,roughness:.2,softness:.1});
    const data=new Float32Array(32);instanceValues(obj,data,16);
    assert.deepEqual([...data.slice(16,22)],[3,2,-4,2,3,4]);
    assert.ok(Math.abs(data[22]-.1)<1e-6 && Math.abs(data[24]-.3)<1e-6);
    assert.equal(data[25],1);assert.equal(data[27],0);assert.equal(data[28],.5);
    assert.ok(Math.abs(data[29]-.8)<1e-6 && Math.abs(data[30]-.2)<1e-6);
    assert.ok([...data.slice(0,16)].every(n=>n===0));
});
test('invalid per-instance values cannot introduce NaN or negative mesh dimensions', () => {
    const data=instanceValues({x:NaN,y:Infinity,sx:-1,sy:0,ry:NaN,emissive:9,roughness:-4,opacity:5,color:'invalid'},new Float32Array(16));
    assert.ok([...data].every(Number.isFinite));assert.ok(data[3]>0&&data[4]>0);
    assert.equal(data[12],1);assert.equal(data[13],3);assert.ok(data[14]>.07);
});
