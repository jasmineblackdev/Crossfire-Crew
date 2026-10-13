import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newPlayer,newRoom,start,advance,publicRoom,blocked} from '../lib/game/engine.ts';
const now=100000;
function fixture(){const a=newPlayer('Alpha',0,'rifle',now),b=newPlayer('Bravo',1,'smg',now);const r=newRoom('ABC234',a,now);r.players.push(b);start(r,now);a.shield=b.shield=0;return {r,a,b};}
test('requires two opposing players',()=>{const a=newPlayer('A',0,'rifle',now),r=newRoom('ABC234',a,now);assert.throws(()=>start(r,now));});
test('cover stops movement and shots',()=>{const {r,a,b}=fixture();a.x=560;a.y=450;b.x=860;b.y=450;a.input={x:1,y:0,aim:0,fire:true};a.seen=b.seen=now+500;advance(r,now+500);assert.ok(a.x<603);assert.equal(b.hp,100);assert.ok(blocked(650,450));});
test('rifle eliminates, scores, then respawns',()=>{const {r,a,b}=fixture();a.x=400;a.y=450;b.x=550;b.y=450;for(let i=0;i<12;i++){a.input.fire=true;a.input.aim=0;a.seen=b.seen=now+i*100;advance(r,now+i*100);}assert.equal(b.hp,0);assert.equal(r.score[0],1);assert.equal(a.kills,1);assert.equal(b.deaths,1);a.input.fire=false;a.seen=b.seen=now+5000;advance(r,now+5000);assert.equal(b.hp,100);assert.ok(b.shield>now+4500);});
test('friendly fire is disabled',()=>{const {r,a,b}=fixture();b.team=0;a.x=400;a.y=450;b.x=550;b.y=450;a.input.fire=true;a.seen=b.seen=now+300;advance(r,now+300);assert.equal(b.hp,100);});
test('25 eliminations ends the round',()=>{const {r,a,b}=fixture();r.score[0]=24;b.hp=10;a.x=400;a.y=450;b.x=550;b.y=450;a.input.fire=true;a.seen=b.seen=now+100;advance(r,now+100);assert.equal(r.phase,'ended');assert.equal(r.winner,0);assert.equal(r.score[0],25);});
test('time limit supports winner and draw',()=>{const {r,a,b}=fixture();a.seen=b.seen=r.end;advance(r,r.end);assert.equal(r.phase,'ended');assert.equal(r.winner,null);start(r,r.end);r.score=[2,3];a.seen=b.seen=r.end;advance(r,r.end);assert.equal(r.winner,1);});
test('stale inputs stop movement and host migrates after disconnect',()=>{const {r,a,b}=fixture();a.input.x=1;advance(r,now+1000);assert.equal(a.x,75);b.seen=now+16000;advance(r,now+16000);assert.equal(r.host,b.id);assert.equal(r.players.length,1);});
test('public state hides player credentials and input',()=>{const {r}=fixture();const p=publicRoom(r).players[0];assert.equal('token' in p,false);assert.equal('input' in p,false);});
