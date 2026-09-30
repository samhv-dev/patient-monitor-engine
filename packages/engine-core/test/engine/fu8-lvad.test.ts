// FU-8 Task A26 (research/20 DV-17, DV-16d; gap V9): the continuous-flow LVAD depends on filling. MODELED, seed 7,
// HFrEF 60 y 80 kg, ventilated (ETT + VCV 12 × 550, PEEP 5, FiO2 0.5), LVAD 5 400 rpm from 1 s. Before FU-8 (origin/main,
// research/20 on 3feee6f; re-measured on this branch before A26): a 1.5 L bleed over 5 min lowered the pump flow only
// 4.04 → 3.70 L/min (1 Hz minimum) and never reached suction — the dilated HFrEF LV (resting EDV 197 mL) never came near
// the absolute 40 mL suction volume (end-systolic volume 100 → 73 mL), and the HQ flow RISES as the MAP falls.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';

type Lvad = { t: number; flowLpm: number; pi: number; suction: boolean };
async function lvadBleed(bleedMl: number): Promise<{ rest: Lvad[]; bleed: Lvad[]; pvcAtSuction: boolean }> {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 60, sex: 'M', weightKg: 80, conditions: [{ id: 'hfref' }], sensors: { abp: 'connected', cvp: 'connected' } } as never });
  let n = 0;
  const ev = (event: Record<string, unknown>) => e.dispatch({ id: `k${++n}`, issuedBy: 'test', type: 'applyEvent', event } as never);
  const out: Lvad[] = [];
  e.on((x) => {
    const l = (x as { lvad?: Omit<Lvad, 't'> }).lvad;
    if (x.type === 'circ' && l) out.push({ t: x.t, ...l });
  }, ['circ']);
  e.advanceTo(1);
  ev({ kind: 'airwayDevice', device: 'ett' });
  ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 550, peep: 5, fio2: 0.5 });
  e.dispatch({ id: 'lvad', issuedBy: 'test', type: 'device', action: { device: 'lvad', action: 'start' } } as never);
  let pvcAtSuction = false;
  for (let t = 10; t <= 900; t += 10) {
    if (t === 310 && bleedMl > 0) ev({ kind: 'bleed', volumeMl: bleedMl, overS: 300 });
    e.advanceTo(t);
    const pvc = (e as unknown as { st: { mods: { pvc: unknown } } }).st.mods.pvc;
    if (pvc !== null && out.at(-1)?.suction) pvcAtSuction = true;
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  return { rest: out.filter((x) => x.t >= 120 && x.t < 300), bleed: out.filter((x) => x.t >= 310), pvcAtSuction };
}
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

describe('FU-8 A26: the LVAD depends on filling (research/20 DV-17, DV-16d)', () => {
  let run15: ReturnType<typeof lvadBleed> | undefined;
  let run20: ReturnType<typeof lvadBleed> | undefined;
  const bled15 = () => (run15 ??= lvadBleed(1500));
  const bled20 = () => (run20 ??= lvadBleed(2000));
  it('HFrEF + LVAD at rest: pump flow 3.5–4.5 L/min, no suction (tables §8.2 HeartMate-3-like 4–6 at 5 400 rpm; 3.99 before and after A26)', async () => {
    const r = await bled15();
    const f = mean(r.rest.map((x) => x.flowLpm));
    console.log(`fu8 A26: rest flow ${f.toFixed(2)} L/min, PI ${mean(r.rest.map((x) => x.pi)).toFixed(1)}, suction ${r.rest.some((x) => x.suction)}`);
    expect(f).toBeGreaterThanOrEqual(3.5);
    expect(f).toBeLessThanOrEqual(4.5);
    expect(r.rest.some((x) => x.suction)).toBe(false);
  }, 120_000);
  it('2 L bleed over 5 min: the LV empties onto the inlet — suction reported, pump flow ≤ 3.0 L/min, ventricular ectopy while it stands (before A26: suction at 573 s against the absolute 40 mL, flow min 2.47, no ectopy; after: 595 s, 1.44)', async () => {
    const r = await bled20();
    const fMin = Math.min(...r.bleed.map((x) => x.flowLpm));
    const first = r.bleed.find((x) => x.suction);
    console.log(`fu8 A26: 2 L bleed flow min ${fMin.toFixed(2)} L/min; first suction ${first ? `${first.t} s` : 'none'}; PVCs while sucking ${r.pvcAtSuction}`);
    expect(first).toBeDefined();
    expect(fMin).toBeLessThanOrEqual(3.0);
    expect(r.pvcAtSuction).toBe(true);
  }, 120_000);
  // R45: research/20 DV-17's cell (1.5 L) is not reached by the pump-side mechanism: after 1.5 L the reflexes keep the
  // venous return at ≈ 4.0 L/min, the native LV stops ejecting and the pump carries all of it (end-systolic volume 73 mL
  // against a size-scaled collapse volume of 66 mL, window to 82). How much a 1.5 L bleed lowers the venous return of an
  // HFrEF patient is the circulation's (the calibration pass's), not the pump's
  it.fails('1.5 L bleed over 5 min: pump flow ≤ 3.0 L/min and a suction event (research/20 DV-17) — measured min 3.68 L/min, no suction after A26 (3.70, none before)', async () => {
    const r = await bled15();
    const fMin = Math.min(...r.bleed.map((x) => x.flowLpm));
    console.log(`fu8 A26: 1.5 L bleed flow min ${fMin.toFixed(2)} L/min; suction ${r.bleed.some((x) => x.suction)}`);
    expect(fMin).toBeLessThanOrEqual(3.0);
    expect(r.bleed.some((x) => x.suction)).toBe(true);
  }, 120_000);
  it.fails('pulsatility index 3–5 at rest (HeartMate 3; research/20 DV-16d) — measured 6.8: the native LV\'s own pulsatility (recorded, not refitted: plan A26 (3))', async () => {
    const pi = mean((await bled15()).rest.map((x) => x.pi));
    expect(pi).toBeGreaterThanOrEqual(3);
    expect(pi).toBeLessThanOrEqual(5);
  }, 120_000);
});
