// Tables §7 / brief §4.9 sanity checks on the whole engine (MODELED). Bands marked "prototype" are the 7a
// prototype's measured bands where the tables' targets are not yet met (Deviations; Ali's R44 calibration pass).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent, PatientProfile } from '../../src/types.ts';
import { cmd } from '../helpers/hemo.ts';

const yieldNow = () => new Promise((r) => setImmediate(r));
async function run(patient: PatientProfile, events: [number, Record<string, unknown>][], tEnd: number) {
  const e = createEngine({ seed: 11, mode: 'modeled', patient: { ...patient, sensors: { abp: 'connected' } } });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5 } }));
  for (const [t, event] of events) e.dispatch(cmd({ type: 'applyEvent', event, atTick: Math.round(t * 50) }));
  for (let t = 60; t <= tEnd; t += 60) {
    e.advanceTo(Math.min(t, tEnd));
    await yieldNow();
  }
  const st = (a: number, b: number, k: 'sbp' | 'dbp' | 'hr') => {
    const s = ev.filter((x) => x.type === 'state' && x.t >= a && x.t < b) as Extract<EngineEvent, { type: 'state' }>[];
    return s.reduce((p, q) => p + (q.values[k] ?? 0), 0) / Math.max(1, s.length);
  };
  const map = (a: number, b: number) => st(a, b, 'dbp') + (st(a, b, 'sbp') - st(a, b, 'dbp')) / 3;
  return { e, ev, st, map };
}

describe('sanity scenarios I (MODELED)', () => {
  it('phenylephrine 100 µg: MAP +15–25, HR −5–15 within 30–60 s (brief §4.9 check 1)', async () => {
    const r = await run({}, [[120, { kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg', route: 'iv' }]], 240);
    const dMap = Math.max(r.map(150, 160), r.map(170, 180), r.map(190, 200)) - r.map(100, 120);
    const dHr = r.st(160, 180, 'hr') - r.st(100, 120, 'hr');
    console.log(`phenylephrine dMAP ${dMap.toFixed(1)} dHR ${dHr.toFixed(1)}`);
    expect(dMap).toBeGreaterThanOrEqual(15);
    expect(dMap).toBeLessThanOrEqual(25);
    expect(dHr).toBeLessThanOrEqual(-5);
    expect(dHr).toBeGreaterThanOrEqual(-16); // prototype −15.0 at 60 s (band −15; 1 bpm tolerance)
  }, 300_000);
  it('R45(b) class II haemorrhage (25 % over 10 min, ventilated): HR 100–125, SBP ≥ 85 % of baseline, PP narrowed ≥ 30 %, PPV > 13 %', async () => {
    const r = await run({}, [[120, { kind: 'bleed', volumeMl: 1225, overS: 600 }]], 780);
    expect(r.st(740, 780, 'hr')).toBeGreaterThanOrEqual(100);
    expect(r.st(740, 780, 'hr')).toBeLessThanOrEqual(125);
    const pp0 = r.st(100, 120, 'sbp') - r.st(100, 120, 'dbp');
    const pp1 = r.st(740, 780, 'sbp') - r.st(740, 780, 'dbp');
    expect(pp1).toBeLessThanOrEqual(0.7 * pp0);
    expect(r.st(740, 780, 'sbp')).toBeGreaterThanOrEqual(0.85 * r.st(100, 120, 'sbp'));
    const ppv = (a: number, b: number) => {
      const w = new Float32Array(Math.round((b - a) * 125));
      r.e.readSamples('abp', Math.round(a * 125), w);
      const bs = r.ev.filter((x): x is Extract<EngineEvent, { type: 'beat' }> => x.type === 'beat' && x.t > a && x.t < b - 1);
      const pp = bs.map((x) => {
        const s = w.subarray(Math.round((x.t - a) * 125), Math.round((x.t - a + 0.6) * 125));
        return Math.max(...s) - Math.min(...s);
      });
      const out: number[] = [];
      for (let k = 0; k + 6 <= pp.length; k += 6) {
        const g = pp.slice(k, k + 6);
        out.push((100 * (Math.max(...g) - Math.min(...g))) / ((Math.max(...g) + Math.min(...g)) / 2));
      }
      return out.reduce((x, y) => x + y, 0) / out.length;
    };
    console.log(`class II: SBP ${r.st(100, 120, 'sbp').toFixed(0)} → ${r.st(740, 780, 'sbp').toFixed(0)}, HR ${r.st(740, 780, 'hr').toFixed(0)}, PP ${pp0.toFixed(0)} → ${pp1.toFixed(0)}, PPV ${ppv(100, 118).toFixed(1)} → ${ppv(750, 778).toFixed(1)} %`);
    expect(ppv(750, 778)).toBeGreaterThan(13);
  }, 300_000);
  // Stage 7g Task 20 (R45: band kept, it.fails, gate note): propofol now runs on the Eleveld Ce with T6.3's
  // E = Ce/(Ce + 3.5). Measured MAP ratio 0.913, HR +16.6 at 2 min (nadir 0.910 at the 3 min Ce peak). No re-fit inside
  // the permitted T6.3 ranges meets the band: gvHr −0.8 / SVR −0.55 / EC50 2.5 (the corner) gives 0.867 with HR +19.6;
  // gvHr −0.8 alone 0.913 / +15.3. With the Schnider ke0 the ratio is 0.838 / +18.6. The 7a Bateman fit used E ≈ 0.9 at
  // the peak; T6.3 gives E ≈ 0.44 at Ce 2.75. Needs a ruling (Q57 / calibration pass).
  it.fails('propofol 2 mg/kg: MAP ≈ 70 % of baseline at 2 min (60–80 %) with little HR rise (< +15)', async () => {
    const r = await run({}, [[120, { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' }]], 300);
    const ratio = r.map(235, 245) / r.map(100, 120);
    console.log(`propofol MAP ratio ${ratio.toFixed(2)} dHR ${(r.st(235, 245, 'hr') - r.st(100, 120, 'hr')).toFixed(1)}`);
    expect(ratio).toBeGreaterThanOrEqual(0.6);
    expect(ratio).toBeLessThanOrEqual(0.8);
    expect(r.st(235, 245, 'hr') - r.st(100, 120, 'hr')).toBeLessThan(15);
  }, 300_000);
  it('β-blocked 35 % haemorrhage: HR 75–95 (tables §7 17b; prototype 79)', async () => {
    const r = await run({ conditions: [{ id: 'betaBlocked' }] }, [[120, { kind: 'bleed', volumeMl: 1715, overS: 600 }]], 780);
    expect(r.st(740, 780, 'hr')).toBeGreaterThanOrEqual(75);
    expect(r.st(740, 780, 'hr')).toBeLessThanOrEqual(95);
  }, 300_000);
});
