import { A, VENTED, runArm } from './runner.ts';
const out: string[] = [];
for (let seed = 1; seed <= 40; seed++) {
  const R = await runArm({ seed, steps: [...VENTED, [60, A.rhythm('vfCoarse')], [111, A.defib('charge', { energyJ: 200 })], [120, A.defib('shock')], [140, A.cpr(true, 0.8)]], tEnd: 600, dt: 5 });
  const sh = R.marks.find((m) => m.kind === 'shock');
  const last = R.rows[R.rows.length - 1]!;
  out.push(`${seed}: ${R.device.find((d) => d.defib?.lastShock)?.defib.lastShock.outcome} | ${R.rhythms.map(([t, id]) => `${t}:${id}`).join(' ')} | end map ${Math.round(last.map as number)} arrest=${last.arrest} cpp=${Math.round(last.cpp as number)} myo=${(last.myo as number).toFixed(2)}`);
}
console.log(out.join('\n'));
