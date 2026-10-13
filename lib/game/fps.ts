import * as THREE from 'three';
import {COVER,W,H} from './engine';

// First-person renderer. Map pixels are world units: x stays x, map y becomes world z, height is y.
export type FpsPlayer={id:string;name:string;team:number;weapon:string;hp:number;shield:number;x:number;y:number;aim:number};
export type FpsShot={x:number;y:number;ex:number;ey:number;team:number;t:number};
export type FpsFrame={players:FpsPlayer[];pos:Record<string,{x:number;y:number}>;me:string;aim:number;shots:FpsShot[];time:number;now:number;dt:number;moving:number;colors:string[]};

const EYE=54,GUN_Y=38;

function canvasTexture(draw:(g:CanvasRenderingContext2D,s:number)=>void,size=256){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d')!,size);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
function speckle(g:CanvasRenderingContext2D,s:number,n:number,light:string,dark:string){let seed=11;const rand=()=>(seed=seed*16807%2147483647)/2147483647;for(let i=0;i<n;i++){g.fillStyle=rand()>.5?light:dark;g.fillRect(rand()*s,rand()*s,1+rand()*2,1+rand()*2);}}
function crate(top:string,bottom:string){return canvasTexture((g,s)=>{const grad=g.createLinearGradient(0,0,0,s);grad.addColorStop(0,top);grad.addColorStop(1,bottom);g.fillStyle=grad;g.fillRect(0,0,s,s);speckle(g,s,1400,'rgba(230,225,195,.07)','rgba(10,14,12,.12)');
 g.strokeStyle='rgba(22,28,23,.55)';g.lineWidth=3;for(let x=32;x<s;x+=32){g.beginPath();g.moveTo(x,14);g.lineTo(x,s-14);g.stroke();}
 g.strokeStyle='rgba(170,172,142,.5)';g.lineWidth=4;g.strokeRect(8,8,s-16,s-16);g.fillStyle='rgba(10,14,12,.45)';g.fillRect(0,s-10,s,10);g.fillStyle='rgba(238,232,202,.16)';g.fillRect(0,0,s,6);g.fillStyle='#c4ad74';g.fillRect(20,20,28,9);});}
function glow(){return canvasTexture((g,s)=>{const r=g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.25,'rgba(255,255,255,.6)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,s,s);},64);}

export function createFirstPerson(canvas:HTMLCanvasElement,yard:HTMLCanvasElement){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.5;
 const scene=new THREE.Scene(),sky=new THREE.Color('#0d120f');scene.background=sky;scene.fog=new THREE.Fog(sky,520,1700);
 const camera=new THREE.PerspectiveCamera(74,16/10,1,3000);scene.add(camera);
 scene.add(new THREE.HemisphereLight('#e6e9d6','#3a4036',2.4));const sun=new THREE.DirectionalLight('#fff0d8',2.2);sun.position.set(300,900,150);scene.add(sun);
 ['#62a9dc','#ed9368'].forEach((c,t)=>{const l=new THREE.PointLight(c,2.2,520,0);l.position.set(t?W-70:70,90,H/2);scene.add(l);});

 // Floor reuses the painted top-down yard, so markings, spawn pads and baked shadows line up.
 const floorTex=new THREE.CanvasTexture(yard);floorTex.colorSpace=THREE.SRGBColorSpace;floorTex.anisotropy=renderer.capabilities.getMaxAnisotropy();
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(W,H),new THREE.MeshStandardMaterial({map:floorTex,roughness:.95}));floor.rotation.x=-Math.PI/2;floor.position.set(W/2,0,H/2);scene.add(floor);
 const outside=new THREE.Mesh(new THREE.PlaneGeometry(W*4,H*4),new THREE.MeshStandardMaterial({color:'#151a17',roughness:1}));outside.rotation.x=-Math.PI/2;outside.position.set(W/2,-0.5,H/2);scene.add(outside);

 const crates=[crate('#8c8a72','#4f574a'),crate('#6a7462','#41493d'),crate('#7d8170','#4b5348')];
 COVER.forEach((b,i)=>{const core=i===4,h=core?96:66,tex=crates[core?2:i%2].clone();tex.wrapS=THREE.RepeatWrapping;tex.repeat.set(Math.max(1,Math.round(Math.max(b.w,b.h)/90)),1);tex.needsUpdate=true;
  const side=new THREE.MeshStandardMaterial({map:tex,roughness:.85}),cap=new THREE.MeshStandardMaterial({color:core?'#6d7163':'#7b7a66',roughness:.9});
  const box=new THREE.Mesh(new THREE.BoxGeometry(b.w,h,b.h),[side,side,cap,cap,side,side]);box.position.set(b.x+b.w/2,h/2,b.y+b.h/2);scene.add(box);});

 const concrete=canvasTexture((g,s)=>{g.fillStyle='#343a35';g.fillRect(0,0,s,s);speckle(g,s,2600,'rgba(214,208,182,.08)','rgba(8,12,10,.18)');g.fillStyle='rgba(10,14,12,.5)';g.fillRect(0,s-6,s,6);g.fillStyle='rgba(16,21,18,.6)';g.fillRect(s-3,0,3,s);});concrete.wrapS=THREE.RepeatWrapping;
 for(const [x,z,w,d,color] of [[W/2,-15,W+60,30,'#c9a64f'],[W/2,H+15,W+60,30,'#c9a64f'],[-15,H/2,30,H,'#62a9dc'],[W+15,H/2,30,H,'#ed9368']] as [number,number,number,number,string][]){
  const tex=concrete.clone();tex.repeat.set(Math.max(w,d)/140,1);tex.needsUpdate=true;const wall=new THREE.Mesh(new THREE.BoxGeometry(w,140,d),new THREE.MeshStandardMaterial({map:tex,roughness:.95}));wall.position.set(x,70,z);scene.add(wall);
  const strip=new THREE.Mesh(new THREE.BoxGeometry(w+2,4,d+2),new THREE.MeshBasicMaterial({color}));strip.position.set(x,108,z);scene.add(strip);}

 // Players: simple soldiers in team colours with a name plate that tracks HP.
 const bodyMat=new THREE.MeshStandardMaterial({color:'#5d6650',roughness:.9}),skinMat=new THREE.MeshStandardMaterial({color:'#8d9176',roughness:.9}),gunMat=new THREE.MeshStandardMaterial({color:'#1d241f',roughness:.6,metalness:.3});
 const teamMat=['#62a9dc','#ed9368'].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.7})),shadowMat=new THREE.MeshBasicMaterial({color:'#000',transparent:true,opacity:.45,depthWrite:false});
 const shieldMat=new THREE.MeshBasicMaterial({color:'#e6f0ce',transparent:true,opacity:.14,depthWrite:false});
 type Rig={group:THREE.Group;gun:THREE.Mesh;shield:THREE.Mesh;plate:THREE.Sprite;plateCtx:CanvasRenderingContext2D;plateTex:THREE.CanvasTexture;key:string;team:number;hp:number};
 const rigs=new Map<string,Rig>();
 function rig(p:FpsPlayer){let r=rigs.get(p.id);if(r&&r.team===p.team)return r;if(r){scene.remove(r.group);rigs.delete(p.id);}
  const group=new THREE.Group();const add=(geo:THREE.BufferGeometry,mat:THREE.Material,x:number,y:number,z=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);group.add(m);return m;};
  const shadow=add(new THREE.CircleGeometry(20,20),shadowMat,0,0.6);shadow.rotation.x=-Math.PI/2;
  add(new THREE.CylinderGeometry(10,11,30,12),bodyMat,0,15);add(new THREE.CylinderGeometry(13,12,18,12),teamMat[p.team],0,34);add(new THREE.SphereGeometry(8.5,14,12),skinMat,0,50);
  const helmet=add(new THREE.SphereGeometry(10,14,10,0,Math.PI*2,0,Math.PI/2),teamMat[p.team],0,52);helmet.scale.y=.8;
  const gun=add(new THREE.BoxGeometry(1,5,5),gunMat,0,36,7);const shield=add(new THREE.SphereGeometry(30,20,16),shieldMat,0,32);
  const pc=document.createElement('canvas');pc.width=256;pc.height=72;const plateTex=new THREE.CanvasTexture(pc);plateTex.colorSpace=THREE.SRGBColorSpace;const plate=new THREE.Sprite(new THREE.SpriteMaterial({map:plateTex,transparent:true,depthWrite:false}));plate.scale.set(72,20,1);plate.position.y=78;group.add(plate);
  scene.add(group);r={group,gun,shield,plate,plateCtx:pc.getContext('2d')!,plateTex,key:'',team:p.team,hp:p.hp};rigs.set(p.id,r);return r;}
 function drawPlate(r:Rig,p:FpsPlayer,color:string){const key=p.name+'|'+p.hp;if(r.key===key)return;r.key=key;const g=r.plateCtx;g.clearRect(0,0,256,72);g.font='600 26px "IBM Plex Mono",monospace';const tw=Math.min(240,g.measureText(p.name).width+28),x=(256-tw)/2;
  g.fillStyle='rgba(12,18,14,.82)';g.beginPath();g.roundRect(x,4,tw,36,6);g.fill();g.fillStyle=color;g.fillRect(x,4,6,36);g.fillStyle='#eeecdd';g.textAlign='center';g.textBaseline='middle';g.fillText(p.name,128+3,23);
  const hp=Math.max(0,p.hp)/100;g.fillStyle='rgba(12,18,14,.85)';g.beginPath();g.roundRect(68,50,120,14,7);g.fill();g.fillStyle=hp>.35?color:'#e5574d';g.beginPath();g.roundRect(70,52,116*hp,10,5);g.fill();r.plateTex.needsUpdate=true;}

 // Tracers, flashes and sparks are pooled additive meshes and sprites.
 const glowTex=glow(),beamGeo=new THREE.BoxGeometry(1,1,1);
 const beams=Array.from({length:48},()=>{const m=new THREE.Mesh(beamGeo,new THREE.MeshBasicMaterial({transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));m.visible=false;scene.add(m);return m;});
 const flashes=Array.from({length:96},()=>{const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));s.visible=false;scene.add(s);return s;});
 const sparks:{s:THREE.Sprite;vx:number;vy:number;vz:number;life:number;max:number}[]=[];
 function burst(x:number,z:number,color:string,count:number){for(let i=0;i<count&&sparks.length<120;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));s.position.set(x,30,z);s.scale.setScalar(8);scene.add(s);const a=Math.random()*Math.PI*2,v=80+Math.random()*180;sparks.push({s,vx:Math.cos(a)*v,vy:40+Math.random()*120,vz:Math.sin(a)*v,life:0,max:.3+Math.random()*.4});}}

 // Your own weapon, fixed to the camera.
 const view=new THREE.Group();camera.add(view);view.scale.setScalar(.82);const viewMat=new THREE.MeshStandardMaterial({color:'#3b443c',roughness:.55,metalness:.35}),railMat=new THREE.MeshStandardMaterial({color:'#262d27',roughness:.5,metalness:.5});
 const part=(geo:THREE.BufferGeometry,mat:THREE.Material,x:number,y:number,z:number)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);view.add(m);return m;};
 part(new THREE.BoxGeometry(2.6,3,13),viewMat,0,0,0);part(new THREE.BoxGeometry(1.4,1,11),railMat,0,2,-1);const vBarrel=part(new THREE.CylinderGeometry(.6,.6,10,10),railMat,0,.6,-11);vBarrel.rotation.x=Math.PI/2;
 part(new THREE.BoxGeometry(1.8,4,2.2),railMat,0,-3,1.5);part(new THREE.BoxGeometry(2.2,3,1.4),viewMat,0,-3,-3.5);const vHand=part(new THREE.BoxGeometry(4,4,9),bodyMat,1.5,-3.5,7);vHand.rotation.z=.2;
 const vFlash=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:'#ffd9a0',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false}));vFlash.position.set(0,.6,-17);view.add(vFlash);
 const vLight=new THREE.PointLight('#ffb36b',0,180,0);vLight.position.set(0,0,-30);view.add(vLight);
 let kick=0,lastOwnShot=0;const lastHp:Record<string,number>={};

 function render(f:FpsFrame){
  const w=canvas.clientWidth,h=canvas.clientHeight;if(w&&h&&(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio()))){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  const me=f.players.find(p=>p.id===f.me),eye=f.pos[f.me]||me;
  if(eye){const bob=Math.sin(f.now/110)*1.8*f.moving;camera.position.set(eye.x,EYE+bob,eye.y);camera.lookAt(eye.x+Math.cos(f.aim)*100,EYE+bob*.6,eye.y+Math.sin(f.aim)*100);}
  const seen=new Set<string>();
  for(const p of f.players){const r=rig(p),d=f.pos[p.id]||p;seen.add(p.id);const was=lastHp[p.id];lastHp[p.id]=p.hp;if(was!==undefined&&was>0&&p.hp<=0&&p.id!==f.me){burst(d.x,d.y,f.colors[p.team],18);burst(d.x,d.y,'#fff2c9',6);}
   r.group.visible=p.id!==f.me&&p.hp>0;if(!r.group.visible)continue;r.group.position.set(d.x,0,d.y);r.group.rotation.y=-(p.id===f.me?f.aim:p.aim);
   const len=p.weapon==='smg'?22:32;r.gun.scale.x=len;r.gun.position.x=10+len/2;r.shield.visible=p.shield>f.time;drawPlate(r,p,f.colors[p.team]);}
  for(const [id,r] of rigs)if(!seen.has(id)){scene.remove(r.group);rigs.delete(id);}
  let b=0,fl=0;for(const s of f.shots){const age=f.time-s.t;if(age>200||age<0)continue;const fade=1-age/200,len=Math.hypot(s.ex-s.x,s.ey-s.y)||1,dx=(s.ex-s.x)/len,dy=(s.ey-s.y)/len,mx=s.x+dx*34,my=s.y+dy*34,beamLen=Math.max(1,len-34),tint=s.team===0?'#b7dcf3':'#ffd0a0';
   const own=me&&s.team===me.team&&Math.hypot(s.x-me.x,s.y-me.y)<40;if(own&&s.t>lastOwnShot){lastOwnShot=s.t;kick=1;}
   if(b<beams.length){const m=beams[b++],mat=m.material as THREE.MeshBasicMaterial;m.visible=true;mat.color.set(tint);mat.opacity=fade*.9;m.position.set(mx+dx*beamLen/2,GUN_Y,my+dy*beamLen/2);m.rotation.set(0,-Math.atan2(dy,dx),0);m.scale.set(beamLen,1.4,1.4);}
   if(fl<flashes.length-1){const hit=flashes[fl++];hit.visible=true;(hit.material as THREE.SpriteMaterial).color.set('#f9de9d');(hit.material as THREE.SpriteMaterial).opacity=fade;hit.position.set(s.ex,GUN_Y,s.ey);hit.scale.setScalar(10+10*fade);
    if(age<70&&!own){const mf=flashes[fl++];mf.visible=true;(mf.material as THREE.SpriteMaterial).color.set('#ffe2b0');(mf.material as THREE.SpriteMaterial).opacity=1-age/70;mf.position.set(mx,GUN_Y,my);mf.scale.setScalar(34*(1-age/70)+8);}}}
  for(let i=b;i<beams.length;i++)beams[i].visible=false;for(let i=fl;i<flashes.length;i++)flashes[i].visible=false;
  for(let i=sparks.length-1;i>=0;i--){const s=sparks[i];s.life+=f.dt;if(s.life>=s.max){scene.remove(s.s);s.s.material.dispose();sparks.splice(i,1);continue;}s.vy-=320*f.dt;s.s.position.x+=s.vx*f.dt;s.s.position.y=Math.max(1,s.s.position.y+s.vy*f.dt);s.s.position.z+=s.vz*f.dt;s.s.material.opacity=1-s.life/s.max;}
  kick=Math.max(0,kick-f.dt*9);view.visible=!!me&&me.hp>0;view.position.set(7+Math.sin(f.now/220)*.5*f.moving,-7+Math.abs(Math.sin(f.now/110))*.6*f.moving,-16+kick*2.2);view.rotation.set(kick*.1,-.06,0);
  vBarrel.scale.y=me?.weapon==='smg'?.6:1.2;vFlash.visible=kick>.55;vFlash.scale.setScalar(14*kick);vLight.intensity=kick>.55?1.1:0;
  renderer.render(scene,camera);}
 function destroy(){renderer.dispose();}
 return {render,destroy};
}
