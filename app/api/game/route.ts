import {createRoom,getRoom,updateRoom,StorageError} from '../../../lib/game/storage';
export const runtime='nodejs';
import {advance,newPlayer,newRoom,publicRoom,start,type Room} from '../../../lib/game/engine';
export async function POST(req:Request){
 try {
  if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Invalid origin.'},{status:403});
  const b=await req.json() as {action:string;name?:string;code?:string;weapon?:string;id?:string;token?:string;input?:{x?:unknown;y?:unknown;aim?:unknown;fire?:unknown}};const now=Date.now();
  if(b.action==='create'){
   for(let i=0;i<5;i++){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const bytes=crypto.getRandomValues(new Uint8Array(6));const code=Array.from(bytes,x=>alphabet[x%alphabet.length]).join('');const p=newPlayer(String(b.name||''),0,b.weapon||'rifle',now);const room=newRoom(code,p,now);if(await createRoom(room,now))return Response.json({room:publicRoom(room),id:p.id,token:p.token});if(i===4)throw Error('Unable to create a room. Please try again.');}
  }
  const code=String(b.code||'').toUpperCase();if(!/^[A-Z2-9]{6}$/.test(code))throw Error('Enter a six-character room code.');
  for(let retry=0;retry<10;retry++){
   const row=await getRoom(code);const now=Date.now();if(!row||now-row.updated>7200000)throw Error('Room not found. Check the code or create a new room.');
   const r:Room=row.state;advance(r,now);let id=b.id,token=b.token;
   if(b.action==='join'){
    if(r.phase==='playing')throw Error('Match in progress. Join when this round ends.');if(r.players.length>=8)throw Error('This room is full.');
    const team=r.players.filter(p=>p.team===0).length>r.players.filter(p=>p.team===1).length?1:0;const p=newPlayer(String(b.name||''),team,b.weapon||'rifle',now);r.players.push(p);id=p.id;token=p.token;
   }else{
    const p=r.players.find(p=>p.id===b.id&&p.token===b.token);if(!p) return Response.json({error:'Your session ended. Please rejoin the room.'},{status:401});p.seen=now;
    if(b.action==='leave'){r.players=r.players.filter(q=>q.id!==p.id);if(r.host===p.id)r.host=r.players[0]?.id||'';}
    else if(b.action==='start'){if(r.host!==p.id)throw Error('Only the host can start a match.');if(r.phase==='playing')throw Error('A match is already running.');start(r,now);}
    else if(b.action==='weapon'){if(r.phase==='playing'&&p.hp>0)throw Error('Change your weapon while respawning.');p.weapon=b.weapon==='smg'?'smg':'rifle';}
    else if(b.action==='sync'){const n=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:0;p.input={x:Math.max(-1,Math.min(1,n(b.input?.x))),y:Math.max(-1,Math.min(1,n(b.input?.y))),aim:n(b.input?.aim),fire:b.input?.fire===true};}
    else throw Error('Unknown game action.');
   }
   const result=await updateRoom(code,row.revision,r,now);
   if(result)return Response.json({room:publicRoom(r),id,token},{headers:{'Cache-Control':'no-store'}});
  }
  return Response.json({error:'Server busy. Retrying…'},{status:503});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Unable to connect.'},{status:e instanceof StorageError?503:400});}
}
