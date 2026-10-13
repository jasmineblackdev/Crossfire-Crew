import * as THREE from 'three';
import {COVER,W,H} from './engine';

// First-person renderer. Map pixels are world units: x stays x, map y becomes world z, height is y.
export type FpsPlayer={id:string;name:string;team:number;weapon:string;hp:number;shield:number;x:number;y:number;aim:number};
export type FpsShot={x:number;y:number;ex:number;ey:number;team:number;t:number;by?:string;mine?:boolean};
export type FpsFrame={players:FpsPlayer[];pos:Record<string,{x:number;y:number}>;me:string;aim:number;shots:FpsShot[];time:number;now:number;dt:number;moving:number;colors:string[]};

const EYE=54,GUN_Y=38;

function canvasTexture(draw:(g:CanvasRenderingContext2D,s:number)=>void,size=256){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d')!,size);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
function speckle(g:CanvasRenderingContext2D,s:number,n:number,light:string,dark:string){let seed=11;const rand=()=>(seed=seed*16807%2147483647)/2147483647;for(let i=0;i<n;i++){g.fillStyle=rand()>.5?light:dark;g.fillRect(rand()*s,rand()*s,1+rand()*2,1+rand()*2);}}
function crate(top:string,bottom:string){return canvasTexture((g,s)=>{const grad=g.createLinearGradient(0,0,0,s);grad.addColorStop(0,top);grad.addColorStop(1,bottom);g.fillStyle=grad;g.fillRect(0,0,s,s);speckle(g,s,1400,'rgba(230,225,195,.07)','rgba(10,14,12,.12)');
 g.strokeStyle='rgba(22,28,23,.55)';g.lineWidth=3;for(let x=32;x<s;x+=32){g.beginPath();g.moveTo(x,14);g.lineTo(x,s-14);g.stroke();}
 g.strokeStyle='rgba(170,172,142,.5)';g.lineWidth=4;g.strokeRect(8,8,s-16,s-16);g.fillStyle='rgba(10,14,12,.45)';g.fillRect(0,s-10,s,10);g.fillStyle='rgba(238,232,202,.16)';g.fillRect(0,0,s,6);g.fillStyle='#c4ad74';g.fillRect(20,20,28,9);});}
function container(base:string,shade:string){return canvasTexture((g,s)=>{g.fillStyle=base;g.fillRect(0,0,s,s);for(let x=0;x<s;x+=16){g.fillStyle=shade;g.fillRect(x,0,6,s);g.fillStyle='rgba(255,255,255,.07)';g.fillRect(x+7,0,2,s);}
 speckle(g,s,1800,'rgba(170,110,60,.18)','rgba(10,8,6,.22)');g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,0,s,10);g.fillRect(0,s-12,s,12);g.fillStyle='rgba(120,70,40,.25)';for(let i=0;i<6;i++)g.fillRect(Math.random()*s,s-40-Math.random()*40,3+Math.random()*10,30+Math.random()*30);});}
function concreteBlock(){return canvasTexture((g,s)=>{g.fillStyle='#9a978c';g.fillRect(0,0,s,s);speckle(g,s,5000,'rgba(235,232,220,.14)','rgba(30,30,26,.22)');for(let i=0;i<14;i++){const x=Math.random()*s,y=Math.random()*s,r=10+Math.random()*40,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(40,38,30,.16)');gr.addColorStop(1,'rgba(40,38,30,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);}
 const dirt=g.createLinearGradient(0,s*.6,0,s);dirt.addColorStop(0,'rgba(60,50,35,0)');dirt.addColorStop(1,'rgba(60,50,35,.55)');g.fillStyle=dirt;g.fillRect(0,0,s,s);g.fillStyle='rgba(20,20,16,.35)';g.fillRect(0,0,s,3);});}
function glow(){return canvasTexture((g,s)=>{const r=g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.25,'rgba(255,255,255,.6)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,s,s);},64);}

export function createFirstPerson(canvas:HTMLCanvasElement,yard:HTMLCanvasElement){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.5;
 const scene=new THREE.Scene(),haze=new THREE.Color('#7d6852');scene.background=haze;scene.fog=new THREE.Fog(haze,700,2700);
 // Sunset sky dome and a ring of mountains, after the cover art.
 const skyTex=canvasTexture((g,s)=>{const gr=g.createLinearGradient(0,0,0,s);gr.addColorStop(0,'#141c2a');gr.addColorStop(.32,'#3b4558');gr.addColorStop(.47,'#c98a55');gr.addColorStop(.5,'#f0b46e');gr.addColorStop(.53,'#6d5845');gr.addColorStop(1,'#2a241c');g.fillStyle=gr;g.fillRect(0,0,s,s);
  for(let i=0;i<40;i++){g.fillStyle=`rgba(255,${190+Math.random()*40|0},140,${.05+Math.random()*.08})`;g.beginPath();g.ellipse(Math.random()*s,s*(.3+Math.random()*.15),20+Math.random()*60,4+Math.random()*6,0,0,Math.PI*2);g.fill();}},512);
 const skyDome=new THREE.Mesh(new THREE.SphereGeometry(3200,32,16),new THREE.MeshBasicMaterial({map:skyTex,side:THREE.BackSide,fog:false,depthWrite:false}));skyDome.position.set(W/2,0,H/2);scene.add(skyDome);
 const ridge=document.createElement('canvas');ridge.width=2048;ridge.height=256;{const g=ridge.getContext('2d')!;let seed=5;const rand=()=>(seed=seed*16807%2147483647)/2147483647;
  for(const [base,amp,color] of [[120,90,'#4a5466'],[160,60,'#38403f'],[210,24,'#1f2a22']] as [number,number,string][]){g.fillStyle=color;g.beginPath();g.moveTo(0,256);let y=base;for(let x=0;x<=2048;x+=8){y+=(rand()-.5)*amp*.35;y=Math.max(base-amp,Math.min(base+amp*.4,y));g.lineTo(x,color==='#1f2a22'?y-(x%24<12?14:0):y);}g.lineTo(2048,256);g.closePath();g.fill();}}
 const ridgeTex=new THREE.CanvasTexture(ridge);ridgeTex.colorSpace=THREE.SRGBColorSpace;ridgeTex.wrapS=THREE.RepeatWrapping;ridgeTex.repeat.set(2,1);
 const mountains=new THREE.Mesh(new THREE.CylinderGeometry(2600,2600,700,48,1,true),new THREE.MeshBasicMaterial({map:ridgeTex,side:THREE.BackSide,transparent:true,fog:false,depthWrite:false}));mountains.position.set(W/2,180,H/2);scene.add(mountains);
 const camera=new THREE.PerspectiveCamera(74,16/10,1,7000);scene.add(camera);
 scene.add(new THREE.HemisphereLight('#b9c4d0','#5a4a36',2.1));const sun=new THREE.DirectionalLight('#ffc98e',2.8);sun.position.set(W+900,520,-500);sun.target.position.set(W/2,0,H/2);scene.add(sun,sun.target);
 ['#62a9dc','#ed9368'].forEach((c,t)=>{const l=new THREE.PointLight(c,2.2,520,0);l.position.set(t?W-70:70,90,H/2);scene.add(l);});

 // Floor reuses the painted top-down yard, so markings, spawn pads and baked shadows line up.
 const floorTex=new THREE.CanvasTexture(yard);floorTex.colorSpace=THREE.SRGBColorSpace;floorTex.anisotropy=renderer.capabilities.getMaxAnisotropy();
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(W,H),new THREE.MeshStandardMaterial({map:floorTex,roughness:.95}));floor.rotation.x=-Math.PI/2;floor.position.set(W/2,0,H/2);scene.add(floor);
 const outside=new THREE.Mesh(new THREE.PlaneGeometry(W*5,H*5),new THREE.MeshStandardMaterial({color:'#4b4334',roughness:1}));outside.rotation.x=-Math.PI/2;outside.position.set(W/2,-0.5,H/2);scene.add(outside);

 // Cover follows the cover art: blue containers on Cobalt's side, red on Ember's, concrete barriers, ammo crates, and a concrete core.
 const blueBox=container('#4a6788','#3a5472'),redBox=container('#8a3a2c','#6c2a20'),slab=concreteBlock(),ammo=crate('#5c6b46','#3c4630');
 COVER.forEach((b,i)=>{const kind=i===4?'core':i<4?'container':i<9?'barrier':'ammo',h={core:96,container:84,barrier:64,ammo:62}[kind];
  const base=kind==='container'?(b.x<W/2?blueBox:redBox):kind==='ammo'?ammo:slab,tex=base.clone();tex.wrapS=THREE.RepeatWrapping;tex.repeat.set(Math.max(1,Math.round(Math.max(b.w,b.h)/(kind==='container'?60:90))),1);tex.needsUpdate=true;
  const side=new THREE.MeshStandardMaterial({map:tex,roughness:kind==='container'?.6:.92,metalness:kind==='container'?.25:0}),cap=new THREE.MeshStandardMaterial({color:kind==='container'?(b.x<W/2?'#3a5677':'#7a3428'):kind==='ammo'?'#56633f':'#a29f93',roughness:.9});
  const box=new THREE.Mesh(new THREE.BoxGeometry(b.w,h,b.h),[side,side,cap,cap,side,side]);box.position.set(b.x+b.w/2,h/2,b.y+b.h/2);scene.add(box);});

 const concrete=canvasTexture((g,s)=>{g.fillStyle='#343a35';g.fillRect(0,0,s,s);speckle(g,s,2600,'rgba(214,208,182,.08)','rgba(8,12,10,.18)');g.fillStyle='rgba(10,14,12,.5)';g.fillRect(0,s-6,s,6);g.fillStyle='rgba(16,21,18,.6)';g.fillRect(s-3,0,3,s);});concrete.wrapS=THREE.RepeatWrapping;
 for(const [x,z,w,d,color] of [[W/2,-15,W+60,30,'#c9a64f'],[W/2,H+15,W+60,30,'#c9a64f'],[-15,H/2,30,H,'#62a9dc'],[W+15,H/2,30,H,'#ed9368']] as [number,number,number,number,string][]){
  const tex=concrete.clone();tex.repeat.set(Math.max(w,d)/140,1);tex.needsUpdate=true;const wall=new THREE.Mesh(new THREE.BoxGeometry(w,140,d),new THREE.MeshStandardMaterial({map:tex,roughness:.95}));wall.position.set(x,70,z);scene.add(wall);
  const strip=new THREE.Mesh(new THREE.BoxGeometry(w+2,4,d+2),new THREE.MeshBasicMaterial({color}));strip.position.set(x,108,z);scene.add(strip);}

 const steel=new THREE.MeshStandardMaterial({color:'#3a3a36',roughness:.6,metalness:.5}),lamp=new THREE.MeshBasicMaterial({color:'#fff1cf'});
 for(const [x,z] of [[-80,-80],[W+80,-80],[-80,H+80],[W+80,H+80],[W/2,-120],[W/2,H+120]]){const pole=new THREE.Mesh(new THREE.CylinderGeometry(3,4,320,8),steel);pole.position.set(x,160,z);scene.add(pole);const head=new THREE.Mesh(new THREE.BoxGeometry(34,14,10),steel);head.position.set(x,322,z);head.lookAt(W/2,322,H/2);scene.add(head);const bulb=new THREE.Mesh(new THREE.BoxGeometry(30,10,2),lamp);bulb.position.copy(head.position).add(new THREE.Vector3(W/2-x,0,H/2-z).normalize().multiplyScalar(6));bulb.lookAt(W/2,322,H/2);scene.add(bulb);}
 // Players: low-poly soldiers built from primitives, with walking legs and arms holding the weapon.
 const SKIN=['#f1c9a5','#d9a37a','#b07a52','#8a5a3b','#5e3a24'];
 const mat=(color:string,rough=.85,metal=0)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
 const uniformMat=mat('#6f6a4c'),pantsMat=mat('#615d43'),bootMat=mat('#2a241c',.7),beltMat=mat('#2c3128',.7),packMat=mat('#4f4d38'),carrierMat=mat('#46462f'),gloveMat=mat('#26261f',.8),goggleMat=mat('#151a17',.25,.4),gunMat=mat('#1d241f',.55,.35),earMat=mat('#2b2d26',.6);
 const skinMats=SKIN.map(c=>mat(c,.75)),teamMat=['#2f6fe0','#f0782a'].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.6,emissive:c,emissiveIntensity:.25})),helmetMat=mat('#6b6448',.65);
 const shadowMat=new THREE.MeshBasicMaterial({color:'#000',transparent:true,opacity:.45,depthWrite:false}),shieldMat=new THREE.MeshBasicMaterial({color:'#e6f0ce',transparent:true,opacity:.14,depthWrite:false});
 const UP=new THREE.Vector3(0,1,0);
 // A capsule-ish limb from a to b, in the parent's space.
 function limb(parent:THREE.Object3D,a:THREE.Vector3,b:THREE.Vector3,r:number,m:THREE.Material){const len=a.distanceTo(b),mesh=new THREE.Mesh(new THREE.CapsuleGeometry(r,Math.max(.1,len-r*2),4,8),m);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(UP,b.clone().sub(a).normalize());parent.add(mesh);return mesh;}
 type Rig={group:THREE.Group;body:THREE.Group;legs:THREE.Group[];gun:THREE.Group;gunLen:number;shield:THREE.Mesh;plate:THREE.Sprite;plateCtx:CanvasRenderingContext2D;plateTex:THREE.CanvasTexture;key:string;team:number;weapon:string;phase:number;lx:number;lz:number};
 const rigs=new Map<string,Rig>();
 function hash(s:string){let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))|0;return Math.abs(h);}
 function buildGun(g:THREE.Group,weapon:string){g.clear();const len=weapon==='smg'?20:30,add=(w:number,h:number,d:number,x:number,y:number,m:THREE.Material=gunMat)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(x,y,0);g.add(b);};
  add(len,3.4,2.6,len/2,0);add(len*.45,1.6,1.4,len+len*.2,.6);add(2.2,5,2,len*.3,-3.6);add(2.6,4.4,2.2,len*.62,-3);if(weapon!=='smg')add(8,4,2.4,-3,-.6,beltMat);return len;}
 function rig(p:FpsPlayer){let r=rigs.get(p.id);if(r&&r.team===p.team){if(r.weapon!==p.weapon){r.gunLen=buildGun(r.gun,p.weapon);r.weapon=p.weapon;}return r;}if(r){scene.remove(r.group);rigs.delete(p.id);}
  const group=new THREE.Group(),body=new THREE.Group();group.add(body);const box=(parent:THREE.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(x,y,z);parent.add(b);return b;};
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(16,20),shadowMat);shadow.rotation.x=-Math.PI/2;shadow.position.y=.6;group.add(shadow);
  // Legs pivot at the hip so they can swing.
  const legs=[-5,5].map(z=>{const leg=new THREE.Group();leg.position.set(0,29,z);limb(leg,new THREE.Vector3(0,0,0),new THREE.Vector3(1,-14,0),3.6,pantsMat);limb(leg,new THREE.Vector3(1,-14,0),new THREE.Vector3(0,-26,0),3.2,pantsMat);box(leg,8,4,5,2,-27,0,bootMat);body.add(leg);return leg;});
  box(body,10,4,15,0,30,0,beltMat);box(body,9,17,16,0,40,0,uniformMat);box(body,11,12,16.6,.3,41,0,carrierMat);box(body,2.4,4,4,5.8,39,-4,beltMat);box(body,2.4,4,4,5.8,39,0,beltMat);box(body,2.4,4,4,5.8,39,4,beltMat);box(body,1,2.4,9,5.9,45,0,teamMat[p.team]);box(body,7,14,12,-8,42,0,packMat);
  limb(body,new THREE.Vector3(0,53,0),new THREE.Vector3(0,49,0),2.6,skinMats[hash(p.name)%SKIN.length]);
  const skin=skinMats[hash(p.name)%SKIN.length],head=new THREE.Mesh(new THREE.SphereGeometry(5.6,16,12),skin);head.position.set(.5,57,0);head.scale.set(1,1.12,.92);body.add(head);
  box(body,1.6,2,7.4,5.2,57.6,0,goggleMat);const helmet=new THREE.Mesh(new THREE.SphereGeometry(6.6,16,10,0,Math.PI*2,0,Math.PI/2),helmetMat);helmet.position.set(0,58.4,0);helmet.scale.set(1.08,.9,1.02);body.add(helmet);
  const band=new THREE.Mesh(new THREE.CylinderGeometry(7.15,7.15,1.4,18,1,true),teamMat[p.team]);band.position.set(0,59.2,0);body.add(band);for(const z of [-6.4,6.4]){const ear=new THREE.Mesh(new THREE.CylinderGeometry(2.6,2.6,2.2,12),earMat);ear.rotation.x=Math.PI/2;ear.position.set(0,56.5,z);body.add(ear);}
  // Arms reach forward to hold the weapon at chest height.
  const gun=new THREE.Group();gun.position.set(6,42,2.5);body.add(gun);const gunLen=buildGun(gun,p.weapon);
  limb(body,new THREE.Vector3(0,48,8.5),new THREE.Vector3(5,40,8),2.7,uniformMat);limb(body,new THREE.Vector3(5,40,8),new THREE.Vector3(9,38.5,3.5),2.4,uniformMat);
  limb(body,new THREE.Vector3(0,48,-8.5),new THREE.Vector3(9,42,-6),2.7,uniformMat);limb(body,new THREE.Vector3(9,42,-6),new THREE.Vector3(18,41.5,2),2.4,uniformMat);
  [new THREE.Vector3(9.5,38.5,3.5),new THREE.Vector3(18.5,41.5,2)].forEach(v=>{const hand=new THREE.Mesh(new THREE.SphereGeometry(2.3,8,6),gloveMat);hand.position.copy(v);body.add(hand);});
  // Team armbands and shoulder patches, as on the cover.
  for(const z of [8.6,-8.6]){const arm=new THREE.Mesh(new THREE.CylinderGeometry(3.1,3.1,2.4,10),teamMat[p.team]);arm.position.set(z>0?2.6:4.2,44.6,z>0?8.4:-7.6);arm.rotation.z=.5;body.add(arm);box(body,3,3.4,.8,0,47,z>0?9.9:-9.9,teamMat[p.team]);}
  const shield=new THREE.Mesh(new THREE.SphereGeometry(30,20,16),shieldMat);shield.position.y=32;group.add(shield);
  const pc=document.createElement('canvas');pc.width=256;pc.height=72;const plateTex=new THREE.CanvasTexture(pc);plateTex.colorSpace=THREE.SRGBColorSpace;const plate=new THREE.Sprite(new THREE.SpriteMaterial({map:plateTex,transparent:true,depthWrite:false}));plate.scale.set(72,20,1);plate.position.y=80;group.add(plate);
  scene.add(group);r={group,body,legs,gun,gunLen,shield,plate,plateCtx:pc.getContext('2d')!,plateTex,key:'',team:p.team,weapon:p.weapon,phase:0,lx:p.x,lz:p.y};rigs.set(p.id,r);return r;}
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
 part(new THREE.BoxGeometry(1.8,4,2.2),railMat,0,-3,1.5);part(new THREE.BoxGeometry(2.2,3,1.4),viewMat,0,-3,-3.5);const vHand=part(new THREE.BoxGeometry(4,4,9),uniformMat,1.5,-3.5,7);vHand.rotation.z=.2;
 const vFlash=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:'#ffd9a0',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false}));vFlash.position.set(0,.6,-17);view.add(vFlash);
 const vLight=new THREE.PointLight('#ffb36b',0,180,0);vLight.position.set(0,0,-30);view.add(vLight);
 let kick=0,lastOwnShot=0;const from=new THREE.Vector3(),to=new THREE.Vector3(),X_AXIS=new THREE.Vector3(1,0,0);const lastHp:Record<string,number>={};

 function render(f:FpsFrame){
  const w=canvas.clientWidth,h=canvas.clientHeight;if(w&&h&&(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio()))){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  const me=f.players.find(p=>p.id===f.me),eye=f.pos[f.me]||me;
  if(eye){const bob=Math.sin(f.now/110)*1.8*f.moving;camera.position.set(eye.x,EYE+bob,eye.y);camera.lookAt(eye.x+Math.cos(f.aim)*100,EYE+bob*.6,eye.y+Math.sin(f.aim)*100);}
  const seen=new Set<string>();
  for(const p of f.players){const r=rig(p),d=f.pos[p.id]||p;seen.add(p.id);const was=lastHp[p.id];lastHp[p.id]=p.hp;if(was!==undefined&&was>0&&p.hp<=0&&p.id!==f.me){burst(d.x,d.y,f.colors[p.team],18);burst(d.x,d.y,'#fff2c9',6);}
   r.group.visible=p.id!==f.me&&p.hp>0;if(!r.group.visible){r.lx=d.x;r.lz=d.y;continue;}
   // Walk cycle driven by how far the player moved this frame.
   const speed=f.dt>0?Math.hypot(d.x-r.lx,d.y-r.lz)/f.dt:0,stride=Math.min(1,speed/160);r.lx=d.x;r.lz=d.y;r.phase+=f.dt*speed*.075;const swing=Math.sin(r.phase)*.7*stride;
   r.legs[0].rotation.z=swing;r.legs[1].rotation.z=-swing;r.body.position.y=Math.abs(Math.cos(r.phase))*1.4*stride;r.body.rotation.z=-.05*stride;
   r.group.position.set(d.x,0,d.y);r.group.rotation.y=-p.aim;r.plate.visible=!eye||Math.hypot(d.x-eye.x,d.y-eye.y)>90;r.shield.visible=p.shield>f.time;drawPlate(r,p,f.colors[p.team]);}
  for(const [id,r] of rigs)if(!seen.has(id)){scene.remove(r.group);rigs.delete(id);}
  let b=0,fl=0;for(const s of f.shots){const age=f.time-s.t;if(age>200||age<0)continue;const fade=1-age/200,len=Math.hypot(s.ex-s.x,s.ey-s.y)||1,dx=(s.ex-s.x)/len,dy=(s.ey-s.y)/len,mx=s.x+dx*34,my=s.y+dy*34,tint=s.team===0?'#b7dcf3':'#ffd0a0';
   const own=!!s.mine;if(own&&s.t>lastOwnShot){lastOwnShot=s.t;kick=1;}
   if(b<beams.length){const m=beams[b++],mat=m.material as THREE.MeshBasicMaterial;if(own)vFlash.getWorldPosition(from);else from.set(mx,GUN_Y,my);to.set(s.ex,own?EYE-6:GUN_Y,s.ey);const span=from.distanceTo(to);m.visible=span>2;mat.color.set(tint);mat.opacity=fade*.9;m.position.copy(from).add(to).multiplyScalar(.5);m.quaternion.setFromUnitVectors(X_AXIS,to.clone().sub(from).normalize());m.scale.set(span,own?.8:1.4,own?.8:1.4);}
   if(fl<flashes.length-1){const hit=flashes[fl++];hit.visible=true;(hit.material as THREE.SpriteMaterial).color.set('#f9de9d');(hit.material as THREE.SpriteMaterial).opacity=fade;hit.position.set(s.ex,own?EYE-6:GUN_Y,s.ey);hit.scale.setScalar(10+10*fade);
    if(age<70&&!own){const mf=flashes[fl++];mf.visible=true;(mf.material as THREE.SpriteMaterial).color.set('#ffe2b0');(mf.material as THREE.SpriteMaterial).opacity=1-age/70;mf.position.set(mx,GUN_Y,my);mf.scale.setScalar(34*(1-age/70)+8);}}}
  for(let i=b;i<beams.length;i++)beams[i].visible=false;for(let i=fl;i<flashes.length;i++)flashes[i].visible=false;
  for(let i=sparks.length-1;i>=0;i--){const s=sparks[i];s.life+=f.dt;if(s.life>=s.max){scene.remove(s.s);s.s.material.dispose();sparks.splice(i,1);continue;}s.vy-=320*f.dt;s.s.position.x+=s.vx*f.dt;s.s.position.y=Math.max(1,s.s.position.y+s.vy*f.dt);s.s.position.z+=s.vz*f.dt;s.s.material.opacity=1-s.life/s.max;}
  kick=Math.max(0,kick-f.dt*9);view.visible=!!me&&me.hp>0;view.position.set(7+Math.sin(f.now/220)*.5*f.moving,-7+Math.abs(Math.sin(f.now/110))*.6*f.moving,-16+kick*2.2);view.rotation.set(kick*.1,-.06,0);
  vBarrel.scale.y=me?.weapon==='smg'?.6:1.2;vFlash.visible=kick>.55;vFlash.scale.setScalar(14*kick);vLight.intensity=kick>.55?1.1:0;
  renderer.render(scene,camera);}
 function destroy(){renderer.dispose();}
 return {render,destroy};
}
