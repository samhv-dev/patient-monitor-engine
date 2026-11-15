// FU-11: the external browser audit's shared fixture (research/17; installed unchanged from audit-fixture.ts): a Vite
// server on apps/demo with configFile false and a one-element page; the tests import the packages' sources by /@fs.
// The server starts through app-support.ts's startVite like every e2e server (its own port, strictly held); with
// PME_E2E_PORT set, this worker-wide server takes the ports after the per-file servers' (offset by the worker count).
import {test as base,expect} from './evidence.ts';
import {startVite} from './app-support.ts';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
export {expect};
export const test=base.extend<{}, {audit:{url:string,root:string}}>({audit:[async({},use,info)=>{
 const root=process.env.PME_AUDIT_REPO??resolve(import.meta.dirname,'../../..');
 const {vite,base:origin}=await startVite({configFile:false,root:resolve(root,'apps/demo'),cacheDir:resolve(process.env.PME_AUDIT_OUTPUT??tmpdir(),`pme-regression-vite-${process.pid}-${info.workerIndex}`),publicDir:false,optimizeDeps:{noDiscovery:true,include:[]},server:{fs:{allow:[root]}},logLevel:'error',plugins:[{name:'audit-page',configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url==='/__regression.html'){res.setHeader('Content-Type','text/html');res.end('<button id="sound">Sound</button><div id="monitor" style="width:1080px;height:520px"></div>')}else next()})}}]},{portOffset:info.config.workers});
 try{await use({url:`${origin}/__regression.html`,root})}finally{await vite.close()}
},{scope:'worker'}]});
