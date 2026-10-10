// FU-11: the external browser audit's regression for BA10 (malformed peers cannot end the relay) (research/17; ChatGPT, baseline b2a0292), installed
// unchanged from audit-relay.e2e.ts. Red on origin/main; the task named in docs/plans/fu-11-hardening.md turns it green.
import {test,expect} from './audit-fixture';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {once} from 'node:events';
async function bounded<T>(p:Promise<T>):Promise<T>{let t:ReturnType<typeof setTimeout>;try{return await Promise.race([p,new Promise<T>((_,reject)=>{t=setTimeout(()=>reject(new Error('relay response deadline')),5000)})])}finally{clearTimeout(t!)}}
for(const kind of ['signal-null','oversized','deep-envelope'])test(`relay survives ${kind}`,async({audit})=>{
 const require=createRequire(audit.root+'/packages/controller/package.json');const WebSocket=require('ws');
 const child=spawn(process.execPath,['--experimental-strip-types','--input-type=module','-e',`import {startRelay} from ${JSON.stringify(audit.root+'/packages/controller/relay/server.ts')};const r=await startRelay({host:'127.0.0.1',port:0});process.stdout.write(String(r.port)+'\\n');process.on('SIGTERM',async()=>{await r.close();process.exit(0)});`],{stdio:['ignore','pipe','pipe']});
 let stderr='';child.stderr!.on('data',x=>stderr+=x);const sockets:any[]=[];
 const hello={v:1,session:'ABC234',from:'probe',seq:1,sentAt:0,kind:'hello',role:'controller'};
 try{
  const [data]=await bounded(once(child.stdout!,'data'));const url=`ws://127.0.0.1:${String(data).trim()}`;
  const connect=async(path='')=>{const ws=new WebSocket(url+path);sockets.push(ws);ws.on('error',()=>{});await bounded(once(ws,'open'));return ws};
  if(kind==='signal-null'){
   const receiver=await connect('/signal?session=ABC234&peer=receiver'),sender=await connect('/signal?session=ABC234&peer=sender');const response=bounded(once(receiver,'message'));
   sender.send('null');sender.send(JSON.stringify({to:'receiver',data:'sentinel'}));const [body]=await response;expect(JSON.parse(String(body)).data).toBe('sentinel');
  }else if(kind==='oversized'){
   const bad=await connect();const closed=bounded(once(bad,'close'));bad.send('x'.repeat(262145));await closed;
   const probe=await connect();const response=bounded(once(probe,'message'));probe.send(JSON.stringify(hello));await response;
  }else{
   const bad=await connect();const response=bounded(once(bad,'message'));
   bad.send('{"v":1,"session":"ABC234","from":"probe","seq":1,"sentAt":0,"kind":"hello","role":"controller","extra":'+'{"x":'.repeat(12000)+'0'+'}'.repeat(12000)+'}');bad.send(JSON.stringify(hello));await response;
  }
  expect(child.exitCode,stderr).toBeNull();
 }catch(error){throw new Error(String(error)+'\nRelay stderr: '+stderr)}finally{for(const s of sockets)s.terminate();if(child.exitCode===null){child.kill('SIGTERM');await bounded(once(child,'exit')).catch(()=>child.kill('SIGKILL'))}}
});
