import { A, VENTED, runArm } from './runner.ts';
const R = await runArm({ mode: 'manual', patient: { ageY: 60, weightKg: 80, conditions: [{ id: 'hfref' }] }, steps: [...VENTED, [30, A.target('contractility', 0.4)], [30, A.target('sbp', 85)], [30, A.target('dbp', 55)], [400, A.iabp('start', { ratio: 2 })]], tEnd: 620, dt: 5, fine: [[600, 603.5]] });
let last = '';
for (const f of R.fine) { const k = `${f.iabpIn.toFixed(2)}/${f.iabpOut.toFixed(2)}`; if (Math.round(f.t * 100) % 4 === 0 || k !== last) console.log(f.t.toFixed(2), 'pAo', f.pAo.toFixed(1), 'qAv', f.qAv.toFixed(0), 'in/out', k); last = k; }
