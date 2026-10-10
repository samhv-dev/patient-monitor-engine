// FU-11: the external browser audit's regression for BA11 (wrong-session and over-budget structured commands) (research/17; ChatGPT, baseline b2a0292), installed
// unchanged from audit-controller.e2e.ts (its third test). Red on origin/main; the task named in docs/plans/fu-11-hardening.md turns it green.
import {test,expect} from './audit-fixture';
test('BroadcastChannel rejects wrong-session and oversized structured commands',async({page,audit})=>{
 await page.goto(audit.url);
 await page.evaluate(async root=>{const C=await import('/@fs'+root+'/packages/controller/src/index.ts'),{createEngine}=await import('/@fs'+root+'/packages/engine-core/src/index.ts');const e=createEngine();const t=C.createBroadcastChannelTransport('ABC234');const h=new C.HostSession({session:'ABC234',target:{dispatch:(c:any)=>e.dispatch(c),snapshot:()=>e.snapshot(),restore:(s:any)=>e.restore(s),on:(f:any)=>e.on(f),now:()=>e.now(),time:()=>{}},stateIntervalMs:0});h.addTransport(t);const ch=new BroadcastChannel('pme/ABC234');(window as any).c={h,t,ch,acks:[]};ch.onmessage=(ev:any)=>{if(ev.data.kind==='ack')(window as any).c.acks.push(ev.data)};
 for(const [i,session,extra] of [[1,'DEF567',''],[2,'ABC234','x'.repeat(262145)]] as any[])ch.postMessage({v:1,session,from:'foreign',seq:i,sentAt:0,kind:'command',body:{id:'bad'+i,issuedBy:'foreign',type:'setTarget',variable:'hr',value:130,extra}});
 // A valid sentinel observes that preceding messages were delivered/processed, without a sleep.
 ch.postMessage({v:1,session:'ABC234',from:'foreign',seq:3,sentAt:0,kind:'command',body:{id:'sentinel',issuedBy:'test',type:'setTarget',variable:'hr',value:80}});
 },audit.root);
 await expect.poll(()=>page.evaluate(()=>(window as any).c.acks.some((a:any)=>a.commandId==='sentinel'))).toBe(true);
 const r=await page.evaluate(()=>{const c=(window as any).c;const r={applied:c.h.stats.applied,acks:c.acks};c.h.close();c.t.close();c.ch.close();return r});expect(r.applied).toBe(1);
});
