import { A, VENTED, runArm } from './runner.ts';
for (const ratio of [1, 2]) for (const mode of ['manual', 'modeled'] as const) {
  const pre: any[] = mode === 'manual' ? [[30, A.target('contractility', 0.4)], [30, A.target('sbp', 85)], [30, A.target('dbp', 55)]] : [];
  const R = await runArm({ mode, patient: { ageY: 60, weightKg: 80, conditions: [{ id: 'hfref' }] }, steps: [...VENTED, ...pre, [400, A.iabp('start', { ratio })]], tEnd: 620, dt: 5, fine: [[600, 604]] });
  const opens: number[] = []; let o = false; for (const f of R.fine) { const n = f.qAv > 1; if (n && !o) opens.push(f.t); o = n; }
  const infl = [...new Set(R.fine.map((f) => `${f.iabpIn.toFixed(2)}→${f.iabpOut.toFixed(2)}`))];
  console.log(mode, ratio, 'opens', opens.map((x) => x.toFixed(2)).join(' '), '| in→out', infl.join(' '));
}
