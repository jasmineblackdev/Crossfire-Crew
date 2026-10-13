export type Input = { x:number; y:number; aim:number; fire:boolean };
export type Player = { id:string; token:string; name:string; team:number; weapon:string; x:number; y:number; aim:number; hp:number; kills:number; deaths:number; respawn:number; shield:number; nextShot:number; seen:number; input:Input; bot?:boolean; ai?:{since:number;strafe:number;flip:number;tx:number;ty:number;next:number;lx:number;ly:number;check:number} };
export type Room = {code:string; host:string; phase:string; players:Player[]; score:number[]; time:number; end:number; winner:number|null; shots:{x:number;y:number;ex:number;ey:number;team:number;t:number}[]; feed:{text:string;t:number}[];round:number};
export const W=1440,H=900;
export const COVER=[{x:220,y:150,w:150,h:80},{x:1070,y:670,w:150,h:80},{x:1070,y:150,w:150,h:80},{x:220,y:670,w:150,h:80},{x:620,y:360,w:200,h:180},{x:470,y:125,w:75,h:180},{x:895,y:595,w:75,h:180},{x:470,y:595,w:75,h:180},{x:895,y:125,w:75,h:180},{x:170,y:370,w:90,h:160},{x:1180,y:370,w:90,h:160}];
export function blocked(x:number,y:number,r=18){return x<r||y<r||x>W-r||y>H-r||COVER.some(b=>x>b.x-r&&x<b.x+b.w+r&&y>b.y-r&&y<b.y+b.h+r)}
export function spawn(p:Player,now:number,index=0){p.x=p.team===0?75:W-75;p.y=240+(index%4)*140;p.hp=100;p.respawn=0;p.shield=now+1500;p.input={x:0,y:0,aim:p.team===0?0:Math.PI,fire:false};p.aim=p.input.aim;}
export function newPlayer(name:string,team:number,weapon:string,now:number):Player{const p={id:crypto.randomUUID(),token:crypto.randomUUID(),name:name.trim().slice(0,18)||'Operator',team,weapon:weapon==='smg'?'smg':'rifle',x:0,y:0,aim:0,hp:100,kills:0,deaths:0,respawn:0,shield:0,nextShot:0,seen:now,input:{x:0,y:0,aim:0,fire:false}};spawn(p,now);return p;}
export function newRoom(code:string,p:Player,now:number):Room{return {code,host:p.id,phase:'lobby',players:[p],score:[0,0],time:now,end:0,winner:null,shots:[],feed:[],round:0};}
export function start(r:Room,now:number){if(r.players.length<2||!r.players.some(p=>p.team===0)||!r.players.some(p=>p.team===1))throw Error('Two players on opposing teams are needed to start.');r.phase='playing';r.end=now+180000;r.time=now;r.winner=null;r.score=[0,0];r.shots=[];r.feed=[];r.round++;r.players.forEach((p,i)=>{p.kills=0;p.deaths=0;p.nextShot=0;spawn(p,now,i);});}
function wallDistance(x:number,y:number,dx:number,dy:number,max:number){for(let d=8;d<=max;d+=8)if(blocked(x+dx*d,y+dy*d,0))return d;return max;}
const BOT_NAMES=['Viper','Rook','Ghost','Nova','Havoc','Jinx','Sable','Bolt'];
export function addBot(r:Room,now:number){if(r.players.length>=8)throw Error('This room is full.');const team=r.players.filter(p=>p.team===0).length>r.players.filter(p=>p.team===1).length?1:0;const used=new Set(r.players.map(p=>p.name));const p=newPlayer('BOT '+(BOT_NAMES.find(n=>!used.has('BOT '+n))||'Unit'),team,Math.random()<.5?'rifle':'smg',now);p.bot=true;p.token='';r.players.push(p);return p;}
function sees(p:Player,q:{x:number;y:number}){const d=Math.hypot(q.x-p.x,q.y-p.y)||1;return wallDistance(p.x,p.y,(q.x-p.x)/d,(q.y-p.y)/d,d)>=d;}
// Bots hunt the nearest visible enemy, hold a weapon-appropriate distance and strafe; otherwise they roam toward the enemy.
function think(r:Room,p:Player,t:number,dt:number){const ai=p.ai||(p.ai={since:0,strafe:1,flip:0,tx:W/2,ty:H/2,next:0,lx:p.x,ly:p.y,check:t});const range=p.weapon==='smg'?440:710;
 const foes=r.players.filter(q=>q.team!==p.team&&q.hp>0).map(q=>({q,d:Math.hypot(q.x-p.x,q.y-p.y)})).sort((a,b)=>a.d-b.d),seen=foes.find(f=>f.d<range+120&&(ai.since>0||f.d<160||Math.abs(Math.atan2(Math.sin(Math.atan2(f.q.y-p.y,f.q.x-p.x)-p.aim),Math.cos(Math.atan2(f.q.y-p.y,f.q.x-p.x)-p.aim)))<1.2)&&sees(p,f.q));
 if(t>=ai.flip){ai.strafe=-ai.strafe;ai.flip=t+700+Math.random()*1100;}
 if(t-ai.check>1200){if(Math.hypot(p.x-ai.lx,p.y-ai.ly)<25)ai.next=0;ai.lx=p.x;ai.ly=p.y;ai.check=t;}
 let mx=0,my=0,aim=p.aim,fire=false;
 if(seen){const want=Math.atan2(seen.q.y-p.y,seen.q.x-p.x),diff=Math.atan2(Math.sin(want-p.aim),Math.cos(want-p.aim));if(!ai.since)ai.since=t;aim=p.aim+Math.max(-7*dt,Math.min(7*dt,diff))+(Math.random()-.5)*0.14;fire=t-ai.since>500&&Math.abs(diff)<0.22&&seen.d<range;
  const ideal=p.weapon==='smg'?210:370,push=seen.d>ideal+60?1:seen.d<ideal-80?-0.7:0;mx=Math.cos(want)*push-Math.sin(want)*ai.strafe*0.8;my=Math.sin(want)*push+Math.cos(want)*ai.strafe*0.8;}
 else{ai.since=0;if(t>=ai.next||Math.hypot(ai.tx-p.x,ai.ty-p.y)<40){const f=foes[0]?.q;ai.tx=f?f.x+(Math.random()-.5)*260:200+Math.random()*(W-400);ai.ty=f?f.y+(Math.random()-.5)*260:120+Math.random()*(H-240);ai.next=t+2200+Math.random()*1500;}
  const a=Math.atan2(ai.ty-p.y,ai.tx-p.x);mx=Math.cos(a);my=Math.sin(a);aim=a;}
 const mag=Math.min(1,Math.hypot(mx,my));if(mag>0.05){const dir=Math.atan2(my,mx);for(const off of [0,0.6,-0.6,1.2,-1.2,1.9,-1.9,2.6,-2.6]){const a=dir+off*ai.strafe;if(!blocked(p.x+Math.cos(a)*28,p.y+Math.sin(a)*28)){mx=Math.cos(a)*mag;my=Math.sin(a)*mag;break;}}}
 p.input={x:mx,y:my,aim,fire};p.seen=t;}
function finish(r:Room){r.phase='ended';r.winner=r.score[0]===r.score[1]?null:r.score[0]>r.score[1]?0:1;r.players.forEach(p=>p.input.fire=false);}
export function advance(r:Room,now:number){
 r.players=r.players.filter(p=>p.bot||now-p.seen<15000);if(!r.players.some(p=>!p.bot))r.players=[];if(!r.players.some(p=>p.id===r.host&&!p.bot))r.host=r.players.find(p=>!p.bot)?.id||'';
 r.shots=r.shots.filter(s=>now-s.t<200);r.feed=r.feed.filter(f=>now-f.t<4500);
 if(r.phase!=='playing'){r.time=now;return;}if(now>=r.end){finish(r);r.time=now;return;}
 const from=Math.max(r.time,now-500);
 for(let t=from;t<now&&r.phase==='playing';t+=33){const dt=Math.min(33,now-t)/1000;
  for(const p of r.players){if(p.hp<=0){if(t>=p.respawn)spawn(p,t,r.players.indexOf(p));else continue;}if(p.bot)think(r,p,t,dt);
   const input=t-p.seen<350?p.input:{x:0,y:0,aim:p.aim,fire:false};p.aim=input.aim;
   const n=Math.max(1,Math.hypot(input.x,input.y)),speed=p.weapon==='smg'?235:210;
   const nx=p.x+input.x/n*speed*dt,ny=p.y+input.y/n*speed*dt;if(!blocked(nx,p.y))p.x=nx;if(!blocked(p.x,ny))p.y=ny;
   if(!input.fire||t<p.nextShot)continue;p.shield=0;p.nextShot=t+(p.weapon==='smg'?120:230);
   const range=p.weapon==='smg'?440:710;let angle=p.aim;
   const candidates=r.players.filter(q=>q.team!==p.team&&q.hp>0&&t>=q.shield).map(q=>({q,dist:Math.hypot(q.x-p.x,q.y-p.y),angle:Math.atan2(q.y-p.y,q.x-p.x)})).filter(q=>q.dist<range&&Math.abs(Math.atan2(Math.sin(q.angle-angle),Math.cos(q.angle-angle)))<0.1&&wallDistance(p.x,p.y,Math.cos(q.angle),Math.sin(q.angle),q.dist)>=q.dist).sort((a,b)=>a.dist-b.dist);
   if(candidates[0])angle+=Math.atan2(Math.sin(candidates[0].angle-angle),Math.cos(candidates[0].angle-angle))*0.55;
   const dx=Math.cos(angle),dy=Math.sin(angle);let length=wallDistance(p.x,p.y,dx,dy,range),hit:Player|undefined;
   for(const q of r.players){if(q.team===p.team||q.hp<=0||t<q.shield)continue;const vx=q.x-p.x,vy=q.y-p.y,along=vx*dx+vy*dy,across=Math.abs(vx*dy-vy*dx);if(along>0&&along<length&&across<20){length=along;hit=q;}}
   r.shots.push({x:p.x,y:p.y,ex:p.x+dx*length,ey:p.y+dy*length,team:p.team,t});
   if(hit){hit.hp=Math.max(0,hit.hp-(p.weapon==='smg'?17:29));if(hit.hp===0){p.kills++;hit.deaths++;hit.respawn=t+3000;hit.input.fire=false;r.score[p.team]++;r.feed.unshift({text:p.name+' eliminated '+hit.name,t});r.feed=r.feed.slice(0,4);if(r.score[p.team]>=25)finish(r);}}
  }
 }
 r.time=now;
}
export function publicRoom(r:Room){return {...r,players:r.players.map(({token,input,ai,...p})=>p),serverTime:Date.now()};}
