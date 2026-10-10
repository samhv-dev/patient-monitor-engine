// FU-11: the external browser audit's regression for BA08 A04 (disarm ends the ready tone) (research/17; ChatGPT, baseline b2a0292), installed
// unchanged from audit-audio.e2e.ts (its third test); adapted: `override` on the AudioContext member it wraps (the demo tsconfig
// has noImplicitOverride). Red on origin/main; the task named in docs/plans/fu-11-hardening.md turns it green.
import {test,expect} from './audit-fixture';
for(const mode of ['off','auto'])test(`disarm ends ready oscillator (${mode})`,async({page,audit})=>{
 await page.goto(audit.url);
 await page.evaluate(async({root,mode})=>{const C=AudioContext;const w=window as any;w.voices=[];window.AudioContext=class extends C{override createOscillator(){const o=super.createOscillator(),stop=o.stop.bind(o);const rec={end:0,ended:false};w.voices.push(rec);o.stop=(t=0)=>{rec.end=t;stop(t)};o.addEventListener('ended',()=>rec.ended=true);return o}};const {mountMonitor}=await import('/@fs'+root+'/packages/renderer/src/mount.ts');w.m=mountMonitor(document.getElementById('monitor'),{worker:mode,skin:'zoll-like'});w.events=[];w.m.on((e:any)=>w.events.push(e));document.getElementById('sound')!.onclick=()=>{w.unlock=w.m.enableSound()};await w.m.renderPath},{root:audit.root,mode});
 await page.locator('#sound').click();await page.evaluate(()=>(window as any).unlock);
 await page.evaluate(()=>(window as any).m.dispatch({id:'charge',issuedBy:'test',type:'applyEvent',event:{kind:'defib',action:'charge',energyJ:10}}));
 await expect.poll(()=>page.evaluate(()=>(window as any).voices.some((v:any)=>v.end>50))).toBe(true);
 await page.evaluate(()=>{const w=window as any;w.readyVoice=w.voices.find((v:any)=>v.end>50);return w.m.dispatch({id:'disarm',issuedBy:'test',type:'applyEvent',event:{kind:'defib',action:'disarm'}})});
 await expect.poll(()=>page.evaluate(()=>(window as any).events.some((e:any)=>e.type==='marker'&&e.kind==='disarm'))).toBe(true);
 try{await expect.poll(()=>page.evaluate(()=>(window as any).readyVoice.ended)).toBe(true)}finally{await page.evaluate(()=>(window as any).m.destroy())}
});
