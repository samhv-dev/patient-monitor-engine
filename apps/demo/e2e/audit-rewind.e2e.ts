// FU-11: the external browser audit's regression for BA01 (a rewind resets the trend timeline and the waveform) (research/17; ChatGPT, baseline b2a0292), installed
// unchanged from audit-snapshot.e2e.ts (its second test). Red on origin/main; the task named in docs/plans/fu-11-hardening.md turns it green.
import {test,expect} from './audit-fixture';
for(const mode of ['off','auto'])test(`rewind resets trend timeline and waveform: ${mode}`,async({page,audit})=>{
 await page.goto(audit.url);
 await page.evaluate(async({root,mode})=>{const {mountMonitor}=await import('/@fs'+root+'/packages/renderer/src/mount.ts');(window as any).m=mountMonitor(document.getElementById('monitor'),{worker:mode,engine:{seed:7}});await (window as any).m.renderPath},{root:audit.root,mode});
 const tick=()=>page.evaluate(async()=>(await (window as any).m.snapshot()).tick);
 await expect.poll(tick).toBeGreaterThanOrEqual(50);await page.evaluate(async()=>{(window as any).s=await (window as any).m.snapshot()});
 await expect.poll(tick,{timeout:10000}).toBeGreaterThanOrEqual(250);await page.evaluate(()=>(window as any).m.restore((window as any).s));
 await expect.poll(tick).toBeGreaterThanOrEqual(100);
 const a=await page.screenshot({clip:{x:0,y:50,width:870,height:210}});
 await expect.poll(tick).toBeGreaterThanOrEqual(125);
 const b=await page.screenshot({clip:{x:0,y:50,width:870,height:210}});
 const r=await page.evaluate(async()=>({t:(await (window as any).m.snapshot()).tick*.02,trend:(window as any).m.trends.latestS}));
 await page.evaluate(()=>(window as any).m.destroy());
 expect.soft(b.equals(a),'waveform must advance after rewind').toBe(false);expect(r.trend).toBeLessThanOrEqual(Math.floor(r.t));
});
