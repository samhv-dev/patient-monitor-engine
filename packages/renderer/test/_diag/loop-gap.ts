// TEMPORARY DIAGNOSTIC (not for merge): the longest stretch this test file's worker went without an event-loop turn.
import { afterAll, beforeAll } from 'vitest';
import { basename } from 'node:path';
let last = 0, max = 0, maxAt = '';
let timer: ReturnType<typeof setInterval> | undefined;
const t0 = Date.now();
import { availableParallelism } from "node:os";
beforeAll(() => { last = Date.now(); timer = setInterval(() => { const n = Date.now(); if (n - last > max) { max = n - last; maxAt = new Date(n).toISOString().slice(11, 19); } last = n; }, 25); });
afterAll(() => { const n = Date.now(); if (n - last > max) { max = n - last; maxAt = 'end'; } clearInterval(timer); console.log(`LOOPGAP ${basename((globalThis as any).__vitest_worker__?.filepath ?? "?")} maxBlockMs=${max} at=${maxAt} fileMs=${n - t0} cpus=${availableParallelism()} pid=${process.pid}`); });
