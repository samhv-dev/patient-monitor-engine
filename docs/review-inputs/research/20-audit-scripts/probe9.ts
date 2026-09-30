import { A, VENTED, runArm } from './runner.ts';
for (const [nm, pat, mode] of [['HFMI modeled', { ageY: 65, weightKg: 80, conditions: [{ id: 'hfref' }, { id: 'cad', grade: 'recentMI' }] }, 'modeled'], ['healthy modeled', {}, 'modeled']] as const) {
  const R = await runArm({ mode, patient: pat as any, steps: [...VENTED, [400, A.iabp('start', { ratio: 1 })]], tEnd: 700, dt: 5, fine: [[600, 660]] });
  let prev: { i: number; o: number } | null = null; let cycles = 0, missed = 0, partial = 0;
  for (const f of R.fine) {
    if (!prev || prev.i !== f.iabpIn) {
      if (prev) { cycles++; if (f.t < prev.o) missed++; else if (f.t < prev.o + 0.06) partial++; }
      prev = { i: f.iabpIn, o: f.iabpOut };
    }
  }
  console.log(nm, 'cycles', cycles, 'deflation not started when overwritten', missed, 'deflation cut short', partial);
  for (const r of R.rows.filter((x) => (x.t as number) % 100 === 0)) process.stdout.write(`${r.t}: cvp ${(r.cvp as number).toFixed(1)} lvedv ${(r.lvedv as number).toFixed(0)}  `); console.log();
}
