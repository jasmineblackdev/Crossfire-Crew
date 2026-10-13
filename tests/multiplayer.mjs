// Run against the local preview, with its D1 migration applied.
import assert from 'node:assert/strict';
const base=process.env.GAME_TEST_URL||'http://127.0.0.1:8787';
async function call(action,data={},expected=200){const res=await fetch(base+'/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...data})});const out=await res.json();assert.equal(res.status,expected,JSON.stringify(out));return out;}
const a=await call('create',{name:'Test Alpha',weapon:'rifle'});const sa={code:a.room.code,id:a.id,token:a.token};
const b=await call('join',{code:a.room.code,name:'Test Bravo',weapon:'smg'});const sb={code:b.room.code,id:b.id,token:b.token};
assert.equal(a.room.code,b.room.code);assert.equal(b.room.players.length,2);assert.equal(b.room.players[1].team,1);assert.equal(b.room.players[1].weapon,'smg');
await call('start',sb,400);let started=await call('start',sa);assert.equal(started.room.phase,'playing');assert.equal(started.room.score[0],0);assert.equal(started.room.score[1],0);await call('start',sa,400);await call('weapon',{...sa,weapon:'smg'},400);
const x=started.room.players[0].x;
await call('sync',{...sa,input:{x:1,y:0,aim:0,fire:false}});await new Promise(r=>setTimeout(r,200));
const [aa,bb]=await Promise.all([call('sync',{...sa,input:{x:1,y:0,aim:0,fire:false}}),call('sync',{...sb,input:{x:0,y:0,aim:Math.PI,fire:false}})]);
assert.ok(aa.room.players[0].x>x);assert.ok(bb.room.players[0].x>x);assert.deepEqual(aa.room.score,bb.room.score);assert.equal('token' in aa.room.players[0],false);
await call('sync',{...sa,token:'invalid'},401);await call('leave',sa);const after=await call('sync',{...sb,input:{}});assert.equal(after.room.players.length,1);assert.equal(after.room.host,sb.id);await call('leave',sb);
console.log('PASS: independent sessions share room, balanced teams, movement, score, host restrictions, weapon lock, credentials, and host migration.');
