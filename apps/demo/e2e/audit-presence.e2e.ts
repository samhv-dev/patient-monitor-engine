// FU-11: the external browser audit's regression for BA12 (the relay's host-offline notice reaches the session) (research/17; ChatGPT, baseline b2a0292), installed
// unchanged from audit-controller.e2e.ts (its fourth test); adapted: `spawn`/`once` imported statically (the demo tsconfig rejects the dynamic
// `node:events` import). Red on origin/main; the task named in docs/plans/fu-11-hardening.md turns it green.
import {test,expect} from './audit-fixture';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
// Real relay peer notification must reach the surviving controller session.
test('controller marks host offline after relay peer notice',async({page,audit})=>{
 const child=spawn(process.execPath,['--experimental-strip-types','--input-type=module','-e',`import {startRelay} from ${JSON.stringify(audit.root+'/packages/controller/relay/server.ts')};const r=await startRelay({host:'127.0.0.1',port:0});process.stdout.write(String(r.port)+'\\n');process.on('SIGTERM',async()=>{await r.close();process.exit(0)});`],{stdio:['ignore','pipe','pipe']});
 let stderr='';child.stderr!.on('data',b=>stderr+=b);
 try{
  const [data]=await once(child.stdout!,'data');const url='ws://127.0.0.1:'+String(data).trim();await page.goto(audit.url);
  await page.evaluate(async({root,url})=>{const C=await import('/@fs'+root+'/packages/controller/src/index.ts'),{createEngine}=await import('/@fs'+root+'/packages/engine-core/src/index.ts');const e=createEngine();const ht=C.createWebSocketTransport({url}),frames:any[]=[];const rt=C.createWebSocketTransport({url,onRelayFrame:(f:any)=>frames.push(f)});const h=new C.HostSession({session:'ABC234',target:{dispatch:(c:any)=>e.dispatch(c),snapshot:()=>e.snapshot(),restore:(s:any)=>e.restore(s),on:(f:any)=>e.on(f),now:()=>e.now(),time:()=>{}},stateIntervalMs:0});h.addTransport(ht);const c=new C.ControllerSession({session:'ABC234',transport:rt});(window as any).offline={h,ht,rt,c,frames};},{root:audit.root,url});
  await expect.poll(()=>page.evaluate(()=>(window as any).offline.c.hostOnline)).toBe(true);
  await page.evaluate(()=>{const o=(window as any).offline;o.frames.length=0;o.h.close();o.ht.close()});
  await expect.poll(()=>page.evaluate(()=>(window as any).offline.frames.some((f:any)=>f.relay==='peers'&&!f.hostOnline))).toBe(true);
  await expect.poll(()=>page.evaluate(()=>(window as any).offline.c.hostOnline)).toBe(false);
 }finally{await page.evaluate(()=>{const o=(window as any).offline;if(o){o.c.close();o.rt.close();o.h.close();o.ht.close()}}).catch(()=>{});if(child.exitCode===null){child.kill('SIGTERM');await once(child,'exit')}}
});
