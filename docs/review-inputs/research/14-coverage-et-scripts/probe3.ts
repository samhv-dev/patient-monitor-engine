// Probe: rigs that reach 32 / 28 °C (physical cooling vs the MODELED temperature target), read-only.
import { A, VENTED, runArm, at } from './runner.ts';
const GA = [...VENTED, [60, A.drug('propofol', 2, 'mg/kg'), 'prop'] as any, [60, A.drug('rocuronium', 0.6, 'mg/kg'), 'roc'] as any, [60, A.vap('sevoflurane', 2, 2), 'sevo'] as any];
const arms: Record<string, any> = {
  cold2: { steps: [...GA, [120, A.thermal({ ambientC: 5 }), 'amb 5'], [120, A.thermal7e({ exposure: 'prep', airSpeedMs: 2 }), 'prep'], [120, A.fluid('saline', 4000, 3600), '4 L cold']], tEnd: 4 * 3600, dt: 60 },
  cold: { steps: [...GA, [120, A.thermal({ ambientC: 5 }), 'amb 5'], [120, A.thermal7e({ exposure: 'exposed', airSpeedMs: 1 }), 'exposed']], tEnd: 4 * 3600, dt: 60 },
  target: { steps: [...GA, [120, A.target('tempCore', 32, 900), 'target 32']], tEnd: 3600, dt: 60 },
};
for (const [n, a] of Object.entries(arms)) {
  const R = await runArm(a);
  console.log(n, R.rejected);
  const ts = [120, 600, 1800, 3600, 5400, 7200, 10800, 14400];
  for (const k of ['tc', 'tp', 'setShift', 'shivW', 'hr', 'map', 'macF', 'rhythm', 'arrest']) console.log('  ', k.padEnd(8), ts.map((t) => { const v = at(R.rows, k, t); return typeof v === 'number' ? v.toFixed(2) : v; }).join(' '));
}
