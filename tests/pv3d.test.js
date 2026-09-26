const test = require('node:test');
const assert = require('node:assert/strict');
const { math, meshData } = require('../js/pv3d.js');
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
    for(const shape of ['box','plane','cone','cylinder','octa']) {
        const mesh=meshData(shape);
        assert.equal(mesh.vertices.length%9,0);assert.equal(mesh.normals.length,mesh.vertices.length);
        assert.ok(mesh.vertices.length>=18);
        assert.ok([...mesh.vertices].every(v=>Number.isFinite(v) && Math.abs(v)<=.500001));
        for(let i=0;i<mesh.normals.length;i+=3) assert.ok(Math.abs(Math.hypot(...mesh.normals.slice(i,i+3))-1)<1e-6);
    }
});
test('unknown primitives fail explicitly', () => assert.throws(()=>meshData('downloaded-model'),/Unknown/));
