// Probe: the 7b spontaneous drive over PaCO2 × PaO2 for a few depression states (FU-6 Task 1; reconstruction).
// Extra inputs FU-6 adds (loc, load, hvrDep, jDrive …) are passed when present in the module's input shape.
import { dirname, join } from 'node:path';
const m = (await import(join(dirname(process.env.PME_ENGINE as string), 'l2/lung/drive.ts'))) as any;
const base = { paco2Set: 40, ve0: 6.3, co2SlopeMult: 1, opioidDep: 0, hypnoticDep: 0, pain: 0, evlwi: 0, vt0: 490, rr0: 12.9 };
const states: [string, Record<string, number>][] = [
  ['awake', {}], ['opioid 0.5', { opioidDep: 0.5 }], ['hypnotic 0.5', { hypnoticDep: 0.5 }],
  ['unconscious (loc 1)', { loc: 1, wake: 1 }], ['hvrDep 0.8', { hvrDep: 0.8 }], ['load 1', { load: 1 }],
];
console.log(['state', 'PaCO2', 'PaO2', 'VE', 'RR', 'VT'].join('\t'));
for (const [lab, o] of states) for (const paco2 of [30, 36, 40, 45, 50, 60]) for (const pao2 of [95, 50]) {
  const r = m.drive({ ...base, ...o, paco2, pao2 });
  console.log([lab, paco2, pao2, r.ve.toFixed(2), r.rr.toFixed(1), r.vt.toFixed(0)].join('\t'));
}
