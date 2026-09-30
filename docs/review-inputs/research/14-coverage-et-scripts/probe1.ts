// Probe: ET-01 rigs — thermal flag GA vs drug GA (propofol + rocuronium, sevoflurane 2 %), 3 h at 21 °C, no warming.
import { A, VENTED, runArm, at } from './runner.ts';
const t0 = Date.now();
const GA = [...VENTED, [300, A.drug('propofol', 2, 'mg/kg'), 'prop'] as any, [300, A.drug('rocuronium', 0.6, 'mg/kg'), 'roc'] as any, [300, A.vap('sevoflurane', 2, 2), 'sevo'] as any];
const flag = [...VENTED, [300, A.thermal({ anaesthesia: 'general' }), 'flag'] as any];
for (const [n, steps] of [['drug', GA], ['flag', flag], ['both', [...GA, [300, A.thermal({ anaesthesia: 'general' }), 'flag'] as any]]] as const) {
  const R = await runArm({ steps: steps as any, tEnd: 300 + 4 * 3600, dt: 60 });
  const p = (k: string) => [300, 900, 1800, 3900, 7500, 11100, 14700].map((t) => (at(R.rows, k, t) as number)?.toFixed?.(2)).join(' ');
  console.log(n, R.rejected, ((Date.now() - t0) / 1000).toFixed(0), 's');
  for (const k of ['tc', 'tp', 'depth', 'thermoDepth', 'vasoF', 'kcp', 'metW', 'dryW', 'respW', 'shivW', 'vo2', 'metCo2', 'map', 'hr', 'etco2', 'mac', 'glu', 'dTemp']) console.log('  ', k.padEnd(10), p(k));
}
