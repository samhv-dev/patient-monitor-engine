// FU-11: the external browser audit's regression for BA02/BA03 (exact continuation after a JSON or pending-group restore) (research/17; ChatGPT, baseline b2a0292), installed
// unchanged from audit-snapshot.e2e.ts (its first test). Red on origin/main; the task named in docs/plans/fu-11-hardening.md turns it green.
import {test,expect} from './audit-fixture';
// Desired invariants: red on reviewed commit until the implementation is fixed.
for(const kind of ['json-lvad','pending-group'])test(`snapshot fidelity: ${kind}`,async({page,audit})=>{
 await page.goto(audit.url);
 const r=await page.evaluate(async({root,kind})=>{
  const {createEngine}=await import('/@fs'+root+'/packages/engine-core/src/index.ts');
  const a=createEngine({seed:781,truthHz:1});a.advanceTo(3);
  if(kind==='pending-group')a.dispatch({id:'first',issuedBy:'test',type:'setTarget',variable:'hr',value:100,stageGroup:'g',atTick:250});
  const s=structuredClone(a.snapshot()),b=createEngine({seed:781,truthHz:1});b.restore(kind==='json-lvad'?JSON.parse(JSON.stringify(s)):s);
  const ea:any[]=[],eb:any[]=[];a.on((e:any)=>ea.push(e));b.on((e:any)=>eb.push(e));
  const c=kind==='json-lvad'?{id:'next',issuedBy:'test',type:'device',action:{device:'lvad',action:'start'}}:{id:'next',issuedBy:'test',type:'setTarget',variable:'hr',value:120,stageGroup:'g',atTick:350};
  const acks=[a.dispatch(c),b.dispatch(c)];a.advanceTo(6);b.advanceTo(6);return {acks,ea,eb};
 },{root:audit.root,kind});
 expect(r.acks[1]).toEqual(r.acks[0]);expect(r.eb).toEqual(r.ea);
});
