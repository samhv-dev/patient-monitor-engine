// FU-11: the external browser audit's regression for BA06 (every worker request settles on failure or destroy) (research/17; ChatGPT, baseline b2a0292), installed
// unchanged from audit-worker.e2e.ts. Red on origin/main; the task named in docs/plans/fu-11-hardening.md turns it green.
import {test,expect} from './audit-fixture';
for(const op of ['command','snapshot','restore','capture12','destroy'])test(`worker failure settles ${op}`,async({page,audit})=>{
 await page.addInitScript(()=>{const W=Worker;(window as any).ws=[];window.Worker=class extends W{constructor(...a:any[]){super(a[0],a[1]);(window as any).ws.push(this)}}});
 await page.goto(audit.url);const path=await page.evaluate(async root=>{const {mountMonitor}=await import('/@fs'+root+'/packages/renderer/src/mount.ts');(window as any).m=mountMonitor(document.getElementById('monitor'),{worker:'auto'});return await (window as any).m.renderPath},audit.root);
 test.skip(!path.startsWith('worker'),'actual worker capability required');
 await page.evaluate(async(op)=>{const w=window as any,m=w.m,s=await m.snapshot(),worker=w.ws.at(-1);w.outcome='pending';
 const post=worker.postMessage.bind(worker);worker.postMessage=(message:any,...rest:any[])=>{const result=post(message,...rest);worker.terminate();return result};
 const promise=op==='command'?m.dispatch({id:'test',issuedBy:'test',type:'setTarget',variable:'hr',value:100}):op==='restore'?m.restore(s):op==='capture12'?m.capture12():m.snapshot();
 promise.then(()=>w.outcome='resolved',()=>w.outcome='rejected');if(op==='destroy')m.destroy();
 },op);
 try{await expect.poll(()=>page.evaluate(()=>(window as any).outcome),{timeout:5000}).toBe('rejected')}finally{await page.evaluate(()=>(window as any).m.destroy())}
});
