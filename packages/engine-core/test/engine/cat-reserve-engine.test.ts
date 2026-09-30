// FU-7 Task 9 Step 4 (audit D9), the engine case: the SAME ketamine dose raises MAP less when 7e's releasable
// catecholamine store is depleted — ketamine's pressor effect is indirect (M10 ch. 21: its direct myocardial depression
// is unmasked when catecholamines are exhausted). Band: the depleted MAP rise ≤ 0.5 × the replete rise (the direction the
// audit asks for; the depth of the fall is the calibration item). The depleted state is a TEST-ONLY seam: the arm's
// `endo.core.hormones.catReserve` is held at the floor (0.2) after every advance. The audit's ventilated rig; one yield
// per sim-minute (CI amendment 4). SLOW_A.
import { describe, expect, it } from 'vitest';
import type { MonitorEngine } from '../../src/types.ts';
import { rig6, runTo, send, st6 } from '../helpers/fu6.ts';

const T = 300;
const mapOf = (e: MonitorEngine): number => {
  const c = st6(e).hemo.circ;
  const bs = c.beats.filter((b: { t: number }) => b.t > e.now().simT - 6);
  return bs.length ? bs.reduce((a: number, b: { map: number }) => a + b.map, 0) / bs.length : (c.s[0] as number);
};

async function arm(ketamine: boolean, depleted: boolean): Promise<number[]> {
  const e = rig6(undefined, 'modeled', 7);
  const hold = () => { if (depleted) st6(e).endo.core.hormones.catReserve = 0.2; };
  await runTo(e, 1);
  send(e, { kind: 'airwayDevice', device: 'ett' });
  send(e, { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 });
  await runTo(e, T, hold, 1);
  if (ketamine) send(e, { kind: 'drug', drugId: 'ketamine', dose: 1.5, unit: 'mg/kg', route: 'iv' });
  const map: number[] = [];
  await runTo(e, T + 600, () => { hold(); map.push(mapOf(e)); }, 5);
  return map;
}
const rise = (i: number[], c: number[]) => Math.max(...i.map((v, k) => v - c[k]!));

describe('FU-7 Task 9: the catecholamine reserve reaches the engine (audit D9)', { timeout: 900_000 }, () => {
  it('ketamine 1.5 mg/kg raises MAP less in the depleted state: rise ≤ 0.5 × the replete rise', async () => {
    const replete = rise(await arm(true, false), await arm(false, false));
    const depleted = rise(await arm(true, true), await arm(false, true));
    console.log(`FU-7 cat reserve: ketamine MAP rise replete ${replete.toFixed(1)} vs depleted (reserve 0.2) ${depleted.toFixed(1)} mmHg`);
    expect(replete).toBeGreaterThan(2);
    expect(depleted).toBeLessThanOrEqual(0.5 * replete);
  });
});
