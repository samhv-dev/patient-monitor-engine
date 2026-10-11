// FU-11: the external browser audit's regression for BA04/BA05 (viewer anchor, controller clock after a restore) (research/17; ChatGPT, baseline b2a0292), installed
// unchanged from audit-controller.e2e.ts (its first test). Red on origin/main; the task named in docs/plans/fu-11-hardening.md turns it green.
import {test,expect} from './audit-fixture';
// Public controller/session APIs; in-process delivery makes the rewind boundary deterministic.
test('viewer and controller adopt the restored timeline',async({page,audit})=>{
 await page.goto(audit.url);
 await page.evaluate(async root=>{
  const C=await import('/@fs'+root+'/packages/controller/src/index.ts'),{createEngine}=await import('/@fs'+root+'/packages/engine-core/src/index.ts');
  const a=createEngine({seed:7}),b=createEngine({seed:7}),hub=C.createInProcessHub();a.advanceTo(1);
  const hs=new C.HostSession({session:'ABC234',target:{dispatch:(c:any)=>a.dispatch(c),snapshot:()=>a.snapshot(),restore:(s:any)=>a.restore(s),on:(fn:any)=>a.on(fn),now:()=>a.now(),time:()=>{}},stateIntervalMs:0,wallNow:()=>0});hs.addTransport(hub.connect());
  const controller=new C.ControllerSession({session:'ABC234',transport:hub.connect(),wallNow:()=>0});
  const viewer=new C.ViewerSync({session:'ABC234',transport:hub.connect(),engineVersion:b.version,wallNow:()=>0,target:{restore:(s:any)=>b.restore(s),dispatch:(c:any)=>b.dispatch(c),on:(fn:any,types:any)=>b.on(fn,types),renderT:()=>b.now().simT,tick:()=>b.now().tick,setRate:()=>{},setPaused:()=>{},jumpTo:(t:number)=>b.advanceTo(t)}});
  (window as any).c={a,b,hs,controller,viewer};
 },audit.root);
 await expect.poll(()=>page.evaluate(()=>(window as any).c.viewer.status)).toBe('synced');
 await page.evaluate(async()=>{const {a,hs}= (window as any).c;await hs.submit({id:'mark',issuedBy:'test',type:'scenario',action:'bookmark',target:'one'});a.advanceTo(5);hs.emitState();hs.flush()});
 await expect.poll(()=>page.evaluate(()=>(window as any).c.controller.simT)).toBeGreaterThanOrEqual(5);
 await page.evaluate(async()=>{const {hs}=(window as any).c;await hs.submit({id:'restore',issuedBy:'test',type:'scenario',action:'restoreBookmark',target:'one'})});
 await expect.poll(()=>page.evaluate(()=>(window as any).c.viewer.resyncs)).toBeGreaterThan(0);
 await expect.poll(()=>page.evaluate(()=>(window as any).c.viewer.status)).toBe('synced');
 const r=await page.evaluate(()=>{const c=(window as any).c;c.viewer.follow();const r={viewer:c.b.now().simT,controller:c.controller.simT};c.viewer.close();c.controller.close();c.hs.close();return r});
 expect.soft(r.viewer).toBeLessThan(2);expect(r.controller).toBeLessThan(2);
});
