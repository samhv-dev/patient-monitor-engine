// FU-11: the external browser audit's regression for BA09 (a late audio unlock after destroy) (research/17; ChatGPT, baseline b2a0292), installed
// unchanged from audit-audio.e2e.ts (its second test); adapted: `override` on the AudioContext member it wraps (the demo tsconfig
// has noImplicitOverride). Red on origin/main; the task named in docs/plans/fu-11-hardening.md turns it green.
import {test,expect} from './audit-fixture';
test('destroy while native audio unlock is pending closes the late context',async({page,audit})=>{
 await page.goto(audit.url);
 await page.evaluate(async root=>{const {mountMonitor}=await import('/@fs'+root+'/packages/renderer/src/mount.ts');const C=AudioContext;(window as any).contexts=[];window.AudioContext=class extends C{constructor(...a:any[]){super(a[0]);(window as any).contexts.push(this)}override resume(){return super.resume().then(()=>new Promise<void>(resolve=>(window as any).release=resolve))}};const m=mountMonitor(document.getElementById('monitor'),{worker:'off'});(window as any).m=m;document.getElementById('sound')!.onclick=()=>{(window as any).unlock=m.enableSound()};await m.renderPath},audit.root);
 await page.locator('#sound').click();await page.waitForFunction(()=>!!(window as any).release);
 await page.evaluate(async()=>{const w=window as any;w.m.destroy();w.release();await w.unlock});
 try{await expect.poll(()=>page.evaluate(()=>(window as any).contexts.map((c:any)=>c.state))).toEqual(['closed'])}finally{await page.evaluate(async()=>{for(const c of (window as any).contexts)if(c.state!=='closed')await c.close()})}
});
