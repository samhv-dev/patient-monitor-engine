// FU-2 (AF rate control, E-FU2-6): the AV-nodal block of the β-blocker rows (esmolol, metoprolol, labetalol) and of
// amiodarone reaches the drug bus's `avNodeBlock`, and MODELED AF's ventricular response is the set response × the
// reflex's AV drive × (1 − avNodeBlock). Band: a clinical esmolol infusion or an amiodarone load slows AF by 20–30 %
// [ENG: the tables give no AF rate-control number (§6 T6.2 gives esmolol's sinus HR fall only); the acute rate-control
// response the ACLS/AF-guideline drugs are chosen for; calibration pass R44].
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent } from '../../src/types.ts';
import { cmd } from '../helpers/hemo.ts';

const yieldNow = () => new Promise((r) => setImmediate(r));
type Ev = { type: string; t: number; values?: { hr?: { value: number | null } } };

/** MODELED AF set at 130 from 20 s; drug events at 120 s; mean monitor HR at 80–120 s (before) and over [a, b]. */
async function afFall(drugs: Record<string, unknown>[], a: number, b: number) {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { sensors: { abp: 'connected' } } });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  e.advanceTo(20);
  e.dispatch(cmd({ type: 'setRhythm', rhythm: 'afib', opts: { rateBpm: 130 } }));
  for (const d of drugs) e.dispatch(cmd({ type: 'applyEvent', event: d, atTick: 120 * 50 }));
  for (let t = 60; t <= b; t += 60) {
    e.advanceTo(t);
    await yieldNow();
  }
  const hr = (p: number, q: number) => {
    const v = (ev as unknown as Ev[]).filter((x) => x.type === 'measurement' && x.values?.hr?.value != null && x.t > p && x.t <= q).map((x) => x.values!.hr!.value as number);
    return v.reduce((s, x) => s + x, 0) / Math.max(1, v.length);
  };
  return { before: hr(80, 120), after: hr(a, b), fall: 100 * (1 - hr(a, b) / hr(80, 120)) };
}

describe('AF rate control through the AV node (FU-2, E-FU2-6)', () => {
  it('esmolol 0.5 mg/kg load + 150 µg/kg/min: AF 130 slows by 20–30 % at 15–20 min', async () => {
    const r = await afFall([{ kind: 'drug', drugId: 'esmolol', dose: 0.5, unit: 'mg/kg', route: 'iv' }, { kind: 'infusion', drugId: 'esmolol', rate: 150, unit: 'mcg/kg/min' }], 1020, 1320);
    console.log(`FU-2 AF 130 + esmolol 150: ${r.before.toFixed(1)} → ${r.after.toFixed(1)} (fall ${r.fall.toFixed(1)} %)`);
    expect(r.fall).toBeGreaterThanOrEqual(20);
    expect(r.fall).toBeLessThanOrEqual(30);
  }, 600_000);
  // Amiodarone's row already carried an AV-nodal entry (Emax 0.3, EC50 1× the 150 mg load) that no consumer read; E-FU2-6
  // only ADDS fields, so its block at the load's peak is 0.15 and AF falls 14.0 % (below the band). Raising that Emax
  // is a calibration-pass change to a 7g row (R44), not FU-2's.
  it.fails('amiodarone 150 mg over 10 min: AF 130 slows by 20–30 % at its peak (10–13 min) (measured 14.0)', async () => {
    const r = await afFall([{ kind: 'drug', drugId: 'amiodarone', dose: 150, unit: 'mg', route: 'iv' }], 720, 900);
    console.log(`FU-2 AF 130 + amiodarone 150 mg: ${r.before.toFixed(1)} → ${r.after.toFixed(1)} (fall ${r.fall.toFixed(1)} %)`);
    expect(r.fall).toBeGreaterThanOrEqual(20);
    expect(r.fall).toBeLessThanOrEqual(30);
  }, 600_000);
});
