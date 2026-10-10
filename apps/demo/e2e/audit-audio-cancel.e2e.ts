// FU-11: the external browser audit's regression for BA08 A02/A03 (cancel a sounding voice) (research/17; ChatGPT, baseline b2a0292), installed
// unchanged from audit-audio.e2e.ts (its first test). Red on origin/main; the task named in docs/plans/fu-11-hardening.md turns it green.
import {test,expect} from './audit-fixture';
for(const elapsed of [.25,2.5])test(`cancel active tone at audio time ${elapsed}`,async({page,audit})=>{
 await page.goto(audit.url);
 const rms=await page.evaluate(async({root,elapsed})=>{const {ToneScheduler,playSegments}=await import('/@fs'+root+'/packages/audio/src/index.ts');const ctx=new OfflineAudioContext(1,4*48000,48000);const scheduler=new ToneScheduler({audioNow:()=>ctx.currentTime,perfToAudio:(x:number)=>x/1000,play:(_:any,t:number)=>playSegments(ctx,ctx.destination,t,[{startHz:1000,endHz:1000,durMs:3900,gapMs:0}],.3)});scheduler.clock.setAnchor({simT:0,perfMs:0,timeScale:1});scheduler.enqueue({id:'tone',t:0,kind:'chargeReady'});const suspended=ctx.suspend(elapsed);const rendering=ctx.startRendering();await suspended;scheduler.pump();scheduler.cancel(['tone']);await ctx.resume();const buffer=await rendering;const samples=buffer.getChannelData(0).subarray(Math.ceil((elapsed+.1)*48000),Math.ceil((elapsed+.3)*48000));return Math.sqrt(samples.reduce((s:number,x:number)=>s+x*x,0)/samples.length)},{root:audit.root,elapsed});
 expect(rms).toBeLessThan(.0001);
});
