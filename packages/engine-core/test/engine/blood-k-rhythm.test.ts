// FU-4 G3 (Task 7): hyperkalaemia acts on the ECG from the ABSOLUTE K, on the sinus node and contractility, and ends in
// VF/asystole; calcium stabilises the membrane (7c's caMem) and prevents it. Bands (R45 targets, D7, Q5):
//   a K 8.5 profile draws its ECG: Modifiers.k within 0.3 of 8.5 (the Stage 5.1 sine-wave threshold), HR ≤ 90 % of the
//     K 4.2 control;
//   a K 9.5 profile arrests (VF or asystole) within 5 min;
//   burns + succinylcholine 1.5 mg/kg: VF/asystole within 5 min of the dose (Miller, neuromuscular blockers; audit S11);
//   CaCl2 1 g 60 s before the same dose: no arrest in 15 min.
// Engine runs of 5–20 sim-min, one yield per sim-minute: SLOW_B (Task 20).
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type PatientProfile } from '../../src/index.ts';

let n = 0;
const ev = (event: Record<string, unknown>, atS: number) => ({ id: `kr${++n}`, issuedBy: 'test', type: 'applyEvent', event, atTick: Math.round(atS * 50) }) as unknown as Command;
type St = { rhythm: { id: string; opts: { pulseless?: boolean } }; mods: { k: number }; hemo: { circ: { arrest: { cause: string } | null } } };
const stOf = (e: ReturnType<typeof createEngine>) => (e as unknown as { st: St }).st;

async function course(blood: PatientProfile['blood'], script: [number, Record<string, unknown>][], endS: number) {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, ...(blood ? { blood } : {}) } });
  let hr = 75;
  e.on((x) => { if (x.type === 'measurement' && x.values.hr?.value != null) hr = x.values.hr.value; }, ['measurement']);
  e.dispatch(ev({ kind: 'airwayDevice', device: 'ett' }, 0));
  e.dispatch(ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 }, 0));
  for (const [t, x] of script) e.dispatch(ev(x, t));
  let tArrest: number | undefined;
  let cause: string | undefined;
  let hr120 = NaN;
  let k120 = NaN;
  for (let t = 1; t <= endS; t++) {
    e.advanceTo(t);
    const s = stOf(e);
    if (t === 120) { hr120 = hr; k120 = s.mods.k; }
    if (tArrest === undefined && (s.rhythm.opts.pulseless === true || ['vfCoarse', 'vfFine', 'asystole'].includes(s.rhythm.id))) {
      tArrest = t;
      cause = s.hemo.circ.arrest?.cause;
    }
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  return { tArrest, cause, hr120, k120 };
}

describe('FU-4 G3: hyperkalaemia on the ECG, the pump and the rhythm', () => {
  it('K 8.5 profile: the ECG draws K 8.5 (absolute), the sinus rate slows', async () => {
    const ctl = await course(undefined, [], 130);
    const k = await course({ k: 8.5 }, [], 130);
    console.log(`K 8.5: mods.k ${k.k120.toFixed(2)} HR ${k.hr120} vs ${ctl.hr120}`);
    expect(Math.abs(k.k120 - 8.5)).toBeLessThanOrEqual(0.3);
    expect(k.hr120).toBeLessThanOrEqual(0.9 * ctl.hr120);
  }, 120_000);
  it('K 9.5 profile: VF or asystole within 5 min', async () => {
    const r = await course({ k: 9.5 }, [], 300);
    console.log(`K 9.5: arrest ${r.tArrest} s (${r.cause})`);
    expect(r.tArrest).toBeLessThanOrEqual(300);
    expect(r.cause).toBe('hyperkalaemia');
  }, 120_000);
  it('burns + succinylcholine 1.5 mg/kg: arrest within 5 min of the dose; CaCl2 1 g first prevents it for 15 min', async () => {
    const sux = { kind: 'drug', drugId: 'succinylcholine', dose: 1.5, unit: 'mg/kg', route: 'iv' };
    const a = await course({ burns: 1 }, [[300, sux]], 900);
    const b = await course({ burns: 1 }, [[240, { kind: 'drug', drugId: 'calciumChloride', dose: 1, unit: 'g', route: 'iv' }], [300, sux]], 1200);
    console.log(`burns + sux: arrest ${a.tArrest} s (${a.cause}); with CaCl2: ${b.tArrest ?? 'none'}`);
    expect((a.tArrest as number) - 300).toBeLessThanOrEqual(300);
    expect(b.tArrest).toBeUndefined();
  }, 300_000);
});
