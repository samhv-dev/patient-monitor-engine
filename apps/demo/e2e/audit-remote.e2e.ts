// FU-11: the external browser audit's regression for BA07 (the Remote owns its transports) (research/17; ChatGPT, baseline b2a0292), installed
// unchanged from audit-controller.e2e.ts (its second test). Red on origin/main; the task named in docs/plans/fu-11-hardening.md turns it green.
import {test,expect} from './audit-fixture';
test('remote closes transports it creates on rejoin and destroy',async({page,audit})=>{
 await page.goto(audit.url);
 const states=await page.evaluate(async root=>{const C=await import('/@fs'+root+'/packages/controller/src/index.ts'),{createEngine}=await import('/@fs'+root+'/packages/engine-core/src/index.ts');const ts:any[]=[];const remote=C.mountRemote(document.getElementById('monitor'),{vocabulary:C.vocabularyOf(createEngine()),vias:['broadcastChannel'],connect:(s:string)=>{const t=C.createBroadcastChannelTransport(s);ts.push(t);return t}});remote.join('ABC234','broadcastChannel');remote.join('ABC234','broadcastChannel');remote.destroy();const states=ts.map(t=>t.status);ts.forEach(t=>t.close());return states},audit.root);
 expect(states).toEqual(['closed','closed']);
});
