// E133: ventricular ectopy through the engine — a healthy resting patient takes no ectopy draw and shows no PVC; a core
// temperature held just below the hyperthermic VF threshold (41.9 °C) shows PVCs on the drawn ECG with no VF (the VF
// hazard starts above T_HOT 42); MANUAL keeps the instructor's rhythm.
// The untreated MH course (since E131 it plateaus near 38.65 °C with no VF: its ectopy is the acidaemia's × the MH
// catecholamines) and the haemorrhage course are measured on the cards:
// apps/demo/src/app/showcase/{malignant-hyperthermia,haemorrhage-anaphylaxis}.slow.test.ts.
import { describe, expect, it } from 'vitest';
import { createRngState } from '../../src/rng/sfc32.ts';
import { rig6, runTo, st6 } from '../helpers/resp-modeled-rig.ts';

async function run(mode: 'modeled' | 'manual', holdTc: number | null, untilS: number) {
  const e = rig6(undefined, mode);
  const pvcs: number[] = [];
  const rhythms = new Set<string>();
  e.on((x) => {
    if (x.type === 'beat' && x.template === 'pvc') pvcs.push(x.t);
    if (x.type === 'state' && x.rhythm) rhythms.add(x.rhythm.id);
  });
  await runTo(e, untilS, () => {
    if (holdTc !== null) st6(e).resp.temp.tc = holdTc;
  }, 1);
  return { e, pvcs, rhythms };
}

describe('ectopy through the engine', { timeout: 120_000 }, () => {
  it('a healthy resting patient: no PVC, no draw on the ectopy stream, no pending request', async () => {
    const { e, pvcs } = await run('modeled', null, 120);
    expect(pvcs).toEqual([]);
    expect(st6(e).rng.ectopy).toEqual(createRngState(7).ectopy);
    expect('physPvc' in st6(e).rhythm).toBe(false);
  });
  it('core 41.9 °C held for 120 s: PVCs on the ECG, still no VF', async () => {
    const { pvcs, rhythms } = await run('modeled', 41.9, 125);
    expect(pvcs.filter((t) => t >= 5).length).toBeGreaterThanOrEqual(3);
    expect([...rhythms].some((r) => r.startsWith('vf'))).toBe(false);
  });
  it('MANUAL: the same temperature draws no ectopy (the instructor owns the rhythm; the PVC control stays)', async () => {
    const { e, pvcs } = await run('manual', 41.9, 125);
    expect(pvcs).toEqual([]);
    expect(st6(e).rng.ectopy).toEqual(createRngState(7).ectopy);
  });
});
