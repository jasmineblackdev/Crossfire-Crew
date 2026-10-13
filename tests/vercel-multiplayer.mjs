import http from 'node:http';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const rows=new Map();let conflicts=0,gets=0,writes=0;
const redis=http.createServer(async(req,res)=>{
 try{let body='';for await(const chunk of req)body+=chunk;const args=JSON.parse(body);assert.equal(req.headers.authorization,'Bearer isolated-test-token');let result=null;
 if(args[0]==='GET'){gets++;result=rows.get(args[1])||null;await new Promise(resolve=>setTimeout(resolve,10));}
 else if(args[0]==='SET'){assert.equal(args[3],'NX');assert.equal(args[4],'EX');assert.equal(args[5],7200);if(!rows.has(args[1])){rows.set(args[1],args[2]);result='OK';}}
 else if(args[0]==='EVAL'){assert.ok(args[1].includes("redis.call('GET'"));assert.equal(args[2],1);assert.equal(args[6],7200);const old=rows.get(args[3]);result=0;if(old&&JSON.parse(old).revision===args[4]){const next=JSON.parse(args[5]);assert.equal(next.revision,args[4]+1);rows.set(args[3],args[5]);writes++;result=1;}else conflicts++;}
 else throw Error('Unexpected command');res.setHeader('Content-Type','application/json');res.end(JSON.stringify({result}));
 }catch(e){res.writeHead(500);res.end(JSON.stringify({error:e.message}));}
});
await new Promise(resolve=>redis.listen(0,'127.0.0.1',resolve));
const port=redis.address().port;let output='';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3099'],{env:{...process.env,UPSTASH_REDIS_REST_URL:`http://127.0.0.1:${port}`,UPSTASH_REDIS_REST_TOKEN:'isolated-test-token'},stdio:['ignore','pipe','pipe']});server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);
try{
 let ready=false;for(let i=0;i<80;i++){try{const r=await fetch('http://127.0.0.1:3099');if(r.status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
 assert.ok(ready,output);
 const status=await new Promise(resolve=>{const test=spawn(process.execPath,['tests/multiplayer.mjs'],{env:{...process.env,GAME_TEST_URL:'http://127.0.0.1:3099'},stdio:'inherit'});test.on('exit',resolve);});assert.equal(status,0);
 assert.ok(gets>0&&writes>0);assert.ok(conflicts>0,'Concurrent players must exercise the CAS retry path.');console.log(`PASS: standard Next.js server used shared Redis REST storage; ${conflicts} concurrent revision conflicts retried.`);
}finally{server.kill('SIGTERM');await new Promise(resolve=>redis.close(resolve));}
