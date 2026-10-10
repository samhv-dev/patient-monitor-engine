// FU-11: the external browser audit's shared fixture (research/17; installed unchanged from audit-fixture.ts): a Vite
// server on apps/demo with configFile false and a one-element page; the tests import the packages' sources by /@fs.
import {test as base,expect} from '@playwright/test';
import {createServer} from 'vite';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import net from 'node:net';
export {expect};
export const test=base.extend<{}, {audit:{url:string,root:string}}>({audit:[async({},use,info)=>{
 const root=process.env.PME_AUDIT_REPO??resolve(import.meta.dirname,'../../..');
 const probe=net.createServer();await new Promise<void>(r=>probe.listen(0,'127.0.0.1',r));const port=(probe.address() as net.AddressInfo).port;await new Promise<void>(r=>probe.close(()=>r()));
 const vite=await createServer({configFile:false,root:resolve(root,'apps/demo'),cacheDir:resolve(process.env.PME_AUDIT_OUTPUT??tmpdir(),`pme-regression-vite-${process.pid}-${info.workerIndex}`),publicDir:false,optimizeDeps:{noDiscovery:true,include:[]},server:{port,strictPort:true,host:'127.0.0.1',fs:{allow:[root]}},logLevel:'error',plugins:[{name:'audit-page',configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url==='/__regression.html'){res.setHeader('Content-Type','text/html');res.end('<button id="sound">Sound</button><div id="monitor" style="width:1080px;height:520px"></div>')}else next()})}}]});
 await vite.listen();try{await use({url:`http://127.0.0.1:${port}/__regression.html`,root})}finally{await vite.close()}
},{scope:'worker'}]});
