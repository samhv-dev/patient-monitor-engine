import { A, VENTED, runArm } from './runner.ts';
for (const [name, pat, mode] of [['HFMI 1:1 modeled', { ageY: 65, weightKg: 80, conditions: [{ id: 'hfref' }, { id: 'cad', grade: 'recentMI' }] }, 'modeled'], ['healthy 1:1 modeled', {}, 'modeled']] as const) {
  const R = await runArm({ mode, patient: pat as any, steps: [...VENTED, [400, A.iabp('start', { ratio: 1 })]], tEnd: 520, dt: 5, fine: [[500, 504]] });
  const opens: number[] = []; let o = false; for (const f of R.fine) { const n = f.qAv > 1; if (n && !o) opens.push(f.t); o = n; }
  const infl = [...new Set(R.fine.map((f) => `${f.iabpIn.toFixed(2)}→${f.iabpOut.toFixed(2)}`))];
  console.log(name, 'valve openings', opens.map((x) => x.toFixed(2)).join(' '), '| inflate→deflate', infl.join(' '));
}
