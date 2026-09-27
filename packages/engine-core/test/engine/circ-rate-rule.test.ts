// FU-2 item 1 (NR-7g-5, G7g): in MODELED mode only the sinus node follows the circulation's HR set point; every other
// pacemaker keeps its own rate and the circulation follows it; AF's ventricular response moves by a bounded fraction.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent, RhythmId } from '../../src/types.ts';
import { cmd } from '../helpers/hemo.ts';

const yieldNow = () => new Promise((r) => setImmediate(r));
type Ev = { type: string; t: number; values?: { hr?: { value: number | null } } };

/** MODELED engine; a rhythm at 20 s, an optional drug event at 120 s; advanced minute by minute with a yield (CI rule). */
async function run(rhythm: RhythmId | null, opts: Record<string, unknown>, drug?: Record<string, unknown>, tEnd = 240, extra?: (e: ReturnType<typeof createEngine>) => void) {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { sensors: { abp: 'connected' } } });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  e.advanceTo(20);
  if (rhythm) e.dispatch(cmd({ type: 'setRhythm', rhythm, opts }));
  if (drug) e.dispatch(cmd({ type: 'applyEvent', event: drug, atTick: 120 * 50 }));
  extra?.(e);
  for (let t = 60; t <= tEnd; t += 60) {
    e.advanceTo(t);
    await yieldNow();
  }
  /** Mean monitor HR (the 1 Hz measurement) over (a, b]. */
  const hr = (a: number, b: number) => {
    const v = (ev as unknown as Ev[]).filter((x) => x.type === 'measurement' && x.values?.hr?.value != null && x.t > a && x.t <= b).map((x) => x.values!.hr!.value as number);
    return v.reduce((p, q) => p + q, 0) / Math.max(1, v.length);
  };
  return { e, ev, hr };
}
const PHE = { kind: 'infusion', drugId: 'phenylephrine', rate: 1, unit: 'mcg/kg/min' };
const BLEED = { kind: 'bleed', volumeMl: 1225, overS: 60 }; // 25 % of an adult's blood volume in a minute: reflex tachycardia

describe('MODELED rate ownership (NR-7g-5)', () => {
  it('SVT (AVNRT) set at 180 reads 180 ± 5 on the monitor (was 140: the reflex request, clamped to the SVT range)', async () => {
    const r = await run('svtAvnrt', { rateBpm: 180 }, undefined, 120);
    console.log(`FU-2 SVT 180 MODELED: monitor ${r.hr(80, 120).toFixed(1)}`);
    expect(Math.abs(r.hr(80, 120) - 180)).toBeLessThanOrEqual(5);
  }, 300_000);
  it('sinus bradycardia set at 40 reads 40 ± 3 and holds through phenylephrine (the instructor rate overrides the reflex)', async () => {
    const r = await run('sinusBrady', { rateBpm: 40 }, PHE);
    console.log(`FU-2 sinusBrady 40 MODELED: ${r.hr(80, 120).toFixed(1)} → ${r.hr(150, 240).toFixed(1)} with phenylephrine`);
    expect(Math.abs(r.hr(80, 120) - 40)).toBeLessThanOrEqual(3);
    expect(Math.abs(r.hr(150, 240) - 40)).toBeLessThanOrEqual(3);
  }, 300_000);
  it('the rhythm-intrinsic rates hold: VT 170, atrial tachycardia 170, junctional escape 50, complete block 32, VVI 70 (± 3)', async () => {
    for (const [id, rate] of [['vtMono', 170], ['atrialTach', 170], ['junctionalEscape', 50], ['avb3Wide', 32], ['pacedVVI', 70]] as [RhythmId, number][]) {
      const r = await run(id, { rateBpm: rate }, undefined, 120);
      console.log(`FU-2 ${id} ${rate} MODELED: ${r.hr(80, 120).toFixed(1)}`);
      expect(Math.abs(r.hr(80, 120) - rate)).toBeLessThanOrEqual(3);
    }
  }, 600_000);
  it('AF set at 100 holds its mean (100 ± 5); phenylephrine slows the response through the AV node by 2–12 %', async () => {
    const a = await run('afib', { rateBpm: 100 });
    const b = await run('afib', { rateBpm: 100 }, PHE);
    const f = b.hr(150, 240) / a.hr(150, 240);
    console.log(`FU-2 AF 100 MODELED: ${a.hr(150, 240).toFixed(1)}; with phenylephrine ${b.hr(150, 240).toFixed(1)} (×${f.toFixed(3)})`);
    expect(Math.abs(a.hr(150, 240) - 100)).toBeLessThanOrEqual(5);
    expect(f).toBeGreaterThanOrEqual(0.88);
    expect(f).toBeLessThanOrEqual(0.98);
  }, 600_000);
  it('AAI 70: phenylephrine cannot pull it below 70; the reflex tachycardia of a bleed lets the intrinsic sinus overtake it', async () => {
    const a = await run('pacedAAI', { rateBpm: 70 }, PHE);
    const b = await run('pacedAAI', { rateBpm: 70 }, BLEED);
    console.log(`FU-2 AAI 70 MODELED: phenylephrine ${a.hr(80, 120).toFixed(1)} → ${a.hr(150, 240).toFixed(1)}; bleed ${b.hr(80, 120).toFixed(1)} → ${b.hr(150, 240).toFixed(1)}`);
    expect(Math.abs(a.hr(150, 240) - 70)).toBeLessThanOrEqual(3);
    expect(b.hr(150, 240)).toBeGreaterThanOrEqual(80);
  }, 600_000);
  it('sinus at rest still follows the reflex: phenylephrine brings the rate down 5–15; a rate-less sinus hands a held rate back', async () => {
    const r = await run(null, {}, PHE);
    const d = r.hr(150, 240) - r.hr(80, 120);
    console.log(`FU-2 sinus rest + phenylephrine: ${r.hr(80, 120).toFixed(1)} → ${r.hr(150, 240).toFixed(1)}`);
    expect(d).toBeLessThanOrEqual(-5);
    expect(d).toBeGreaterThanOrEqual(-15);
    const h = await run('sinusBrady', { rateBpm: 40 }, undefined, 180, (e) => e.dispatch(cmd({ type: 'setRhythm', rhythm: 'sinus', atTick: 90 * 50 })));
    console.log(`FU-2 sinusBrady 40 → sinus (no rate) at 90 s: ${h.hr(60, 90).toFixed(1)} → ${h.hr(140, 180).toFixed(1)}`);
    expect(h.hr(140, 180)).toBeGreaterThan(60); // the reflex owns it again (rest ≈ 70)
  }, 600_000);
});
