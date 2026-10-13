import type { Room } from './engine';
export type StoredRoom = {state:Room;revision:number;updated:number};
export class StorageError extends Error {}
// Match state belongs in shared storage; process memory cannot synchronize
// independent Vercel function instances. Every mutation uses an atomic CAS.
export const COMPARE_AND_SWAP = `
local value = redis.call('GET', KEYS[1])
if not value then return 0 end
local room = cjson.decode(value)
if room.revision ~= tonumber(ARGV[1]) then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
return 1
`;
const TTL=7200;
async function command<T>(args:(string|number)[]):Promise<T>{
 const url=process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL;
 const token=process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN;
 if(!url||!token)throw new StorageError('Multiplayer storage is not configured. Connect Upstash Redis and set the server environment variables.');
 try {
  const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(args),cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw new Error('Storage request failed');
  const data=await response.json() as {result:T;error?:string};
  if(data.error)throw new Error('Storage command failed');
  return data.result;
 }catch{throw new StorageError('Unable to reach multiplayer storage. Please try again.');}
}
const key=(code:string)=>`crossfire:room:${code}`;
export async function createRoom(room:Room,now:number){
 const result=await command<string|null>(['SET',key(room.code),JSON.stringify({state:room,revision:0,updated:now}),'NX','EX',TTL]);
 return result==='OK';
}
export async function getRoom(code:string):Promise<StoredRoom|null>{
 const result=await command<string|null>(['GET',key(code)]);
 return result?JSON.parse(result) as StoredRoom:null;
}
export async function updateRoom(code:string,revision:number,state:Room,now:number){
 return await command<number>(['EVAL',COMPARE_AND_SWAP,1,key(code),revision,JSON.stringify({state,revision:revision+1,updated:now}),TTL])===1;
}
