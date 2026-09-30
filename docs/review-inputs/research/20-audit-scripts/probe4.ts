import { A, VENTED, runArm } from './runner.ts';
const R = await runArm({ dt: 10, steps: [...VENTED, [60, A.cond('tamponade', 1)], [300, A.drug('propofol', 2, 'mg/kg')], [530, A.cpr(true, 0.8)]], tEnd: 800 });
for (const r of R.rows.filter((x) => (x.t as number) >= 440)) console.log(r.t, r.rhythm, 'qFwd', (r.qFwd as number).toFixed(1), 'map', (r.map as number).toFixed(1), 'cvp', (r.cvp as number).toFixed(1), 'cpp', (r.cpp as number).toFixed(1), 'dAbp', r.dAbpS, r.dAbpD, 'etco2', (r.etco2 as number).toFixed(1));
