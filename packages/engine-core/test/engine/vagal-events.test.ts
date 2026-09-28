// FU-4 G7/F10 (Tasks 12 and 18f): the vagal events. Drug-driven: a large opioid bolus and neostigmine without an
// anticholinergic lengthen the SA-node cycle (7g `vagalMs`, additive ms, × (1 − muscarinic occupancy)); a SECOND
// succinylcholine dose draws a junctional bradyarrhythmia on the seeded `outcome` stream. Stimulus-driven: a `stimulus`
// with a `site` (laryngoscopy, oculocardiac, peritoneal traction) adds a transient vagal increment that atropine blocks.
// Sources: opioid bradycardia is central-vagal and anticholinergic-reversible (Miller ch. 22); neostigmine is never
// given without an anticholinergic (Miller ch. 24); the second succinylcholine dose (Miller ch. 23); the oculocardiac
// reflex, abolished by atropine (Miller, ophthalmic anaesthesia). Rig: adult 40 y 70 kg male MODELED, ETT + VCV 12 × 600 /
// PEEP 5 / FiO2 0.5 from 1 s, the monitored HR (measurement events). SLOW_B; one yield per sim-minute.
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type PatientProfile } from '../../src/index.ts';

type Ev = Record<string, unknown>;
let n = 0;
const drug = (drugId: string, dose: number, unit: string): Ev => ({ kind: 'drug', drugId, dose, unit, route: 'iv' });
interface Course { hr: [number, number][]; rhythms: Set<string>; pulseless: boolean; tPulseless?: number }
type St = { rhythm: { id: string; opts: { pulseless?: boolean } } };

async function course(steps: [number, Ev][], tEnd: number, seed = 7, patient: Partial<PatientProfile> = {}): Promise<Course> {
  const e = createEngine({ seed, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, ...patient, sensors: { abp: 'connected' } } as PatientProfile });
  let hr = NaN;
  e.on((x) => { if (x.type === 'measurement' && x.values.hr?.value != null) hr = x.values.hr.value; }, ['measurement']);
  const send = (t: number, event: Ev) => e.dispatch({ id: `ve${++n}`, issuedBy: 'test', type: 'applyEvent', event, atTick: Math.round(t * 50) } as unknown as Command);
  send(1, { kind: 'airwayDevice', device: 'ett' });
  send(1, { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 });
  for (const [t, ev] of steps) send(t, ev);
  const c: Course = { hr: [], rhythms: new Set(), pulseless: false };
  for (let t = 5; t <= tEnd; t += 5) {
    e.advanceTo(t);
    const s = (e as unknown as { st: St }).st;
    c.hr.push([t, hr]);
    c.rhythms.add(s.rhythm.id);
    if (s.rhythm.opts.pulseless === true || ['vfCoarse', 'vfFine', 'asystole'].includes(s.rhythm.id)) { c.pulseless = true; c.tPulseless ??= t; }
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  return c;
}
const hrMean = (c: Course, a: number, b: number) => { const w = c.hr.filter(([t]) => t > a && t <= b); return w.reduce((s, [, h]) => s + h, 0) / w.length; };
const hrMin = (c: Course, a: number, b: number) => Math.min(...c.hr.filter(([t]) => t > a && t <= b).map(([, h]) => h));
const T0 = 300;

const stim = (site: string, i: number, dur: number): [number, Ev][] => [[T0, { kind: 'stimulus', intensity: i, site }], [T0 + dur, { kind: 'stimulus', intensity: 0 }]];
const GLYCO: [number, Ev] = [T0 - 180, drug('glycopyrrolate', 0.4, 'mg')];

describe('FU-4 G7: vagal events, drug-driven (Task 18f)', { timeout: 600_000 }, () => {
  const ctl = course([], 900);
  it('opioid bradycardia: fentanyl 10 µg/kg → HR nadir ≤ 55 and > 40, no arrest (Miller ch. 22)', async () => {
    const f = await course([[T0, drug('fentanyl', 10, 'mcg/kg')]], 900);
    const c = await ctl;
    console.log(`fentanyl 10 µg/kg: HR ${hrMean(c, T0 - 30, T0).toFixed(0)} → ${hrMin(f, T0, 900).toFixed(0)} (control min ${hrMin(c, T0, 900).toFixed(0)})`);
    expect(hrMin(f, T0, 900)).toBeLessThanOrEqual(55);
    expect(hrMin(f, T0, 900)).toBeGreaterThan(40);
    expect(f.pulseless).toBe(false);
  });
  it('an anticholinergic given first abolishes it: glycopyrrolate 0.4 mg, then fentanyl 10 µg/kg → nadir within 5 of control', async () => {
    const f = await course([GLYCO, [T0, drug('fentanyl', 10, 'mcg/kg')]], 900);
    const c = await ctl;
    console.log(`glycopyrrolate + fentanyl: nadir ${hrMin(f, T0, 900).toFixed(0)} (control ${hrMin(c, T0, 900).toFixed(0)})`);
    expect(hrMin(f, T0, 900)).toBeGreaterThanOrEqual(hrMin(c, T0, 900) - 5);
  });
  it('remifentanil 3 µg/kg → HR nadir ≤ 58', async () => {
    const r = await course([[T0, drug('remifentanil', 3, 'mcg/kg')]], 900);
    console.log(`remifentanil 3 µg/kg: nadir ${hrMin(r, T0, 900).toFixed(0)}`);
    expect(hrMin(r, T0, 900)).toBeLessThanOrEqual(58);
  });
  it('neostigmine 0.05 mg/kg without an anticholinergic → HR nadir ≤ 50 (Miller ch. 24)', async () => {
    const r = await course([[T0, drug('neostigmine', 0.05, 'mg/kg')]], 1200);
    const g = await course([GLYCO, [T0, drug('neostigmine', 0.05, 'mg/kg')]], 1200);
    console.log(`neostigmine 0.05 mg/kg: nadir ${hrMin(r, T0, 1200).toFixed(0)}; after glycopyrrolate 0.4 mg ${hrMin(g, T0, 1200).toFixed(0)} (blunted, not abolished: occupancy < 1)`);
    expect(hrMin(r, T0, 1200)).toBeLessThanOrEqual(50);
    expect(hrMin(g, T0, 1200)).toBeGreaterThan(hrMin(r, T0, 1200));
  });
  it('S15 repeat succinylcholine (1.5 then 1 mg/kg at +5 min), seeds 7/8/9: ≥ 1 seed shows a junctional escape, 0 with atropine 0.5 mg first (Miller ch. 23)', async () => {
    const fired: number[] = [];
    const firedAtropine: number[] = [];
    for (const seed of [7, 8, 9]) {
      const s = await course([[T0, drug('succinylcholine', 1.5, 'mg/kg')], [T0 + 300, drug('succinylcholine', 1, 'mg/kg')]], T0 + 420, seed);
      const a = await course([[T0 - 60, drug('atropine', 0.5, 'mg')], [T0, drug('succinylcholine', 1.5, 'mg/kg')], [T0 + 300, drug('succinylcholine', 1, 'mg/kg')]], T0 + 420, seed);
      if (s.rhythms.has('junctionalEscape')) fired.push(seed);
      if (a.rhythms.has('junctionalEscape')) firedAtropine.push(seed);
      console.log(`repeat sux seed ${seed}: min HR ${hrMin(s, T0 + 300, T0 + 420).toFixed(0)} [${[...s.rhythms].join(', ')}]; atropine first ${hrMin(a, T0 + 300, T0 + 420).toFixed(0)}`);
    }
    expect(fired.length).toBeGreaterThanOrEqual(1);
    expect(firedAtropine).toEqual([]);
  });
});

describe('FU-4 G7: vagal events, stimulus-driven (Task 12 Step 3 / 18f Step 3, UNPROTOTYPED → measured)', { timeout: 600_000 }, () => {
  it('oculocardiac traction (intensity 1, 60 s): HR −20 % or more while it lasts, back within 10 of baseline after release (Miller, ophthalmic anaesthesia)', async () => {
    const c = await course(stim('oculocardiac', 1, 60), T0 + 240);
    const pre = hrMean(c, T0 - 30, T0);
    console.log(`oculocardiac: HR ${pre.toFixed(0)} → ${hrMin(c, T0, T0 + 60).toFixed(0)}, after ${hrMean(c, T0 + 120, T0 + 180).toFixed(0)}`);
    expect(hrMin(c, T0, T0 + 60)).toBeLessThanOrEqual(0.8 * pre);
    expect(Math.abs(hrMean(c, T0 + 120, T0 + 180) - pre)).toBeLessThanOrEqual(10);
  });
  // the same criterion as the opioid rig: no bradycardia against the undrugged patient. Measured 90 → 81 on top of
  // glycopyrrolate's own +17 — a residual −10 % because 0.4 mg does not occupy every receptor (occupancy < 1, as for
  // neostigmine above), recorded rather than fitted away.
  it('glycopyrrolate 0.4 mg first abolishes the bradycardia: the traction nadir within 5 of the undrugged HR', async () => {
    const c = await course([GLYCO, ...stim('oculocardiac', 1, 60)], T0 + 120);
    const ctlHr = hrMean(await course([], T0), T0 - 30, T0);
    console.log(`glycopyrrolate + oculocardiac: HR ${hrMean(c, T0 - 30, T0).toFixed(0)} → ${hrMin(c, T0, T0 + 60).toFixed(0)} (undrugged ${ctlHr.toFixed(0)})`);
    expect(hrMin(c, T0, T0 + 60)).toBeGreaterThanOrEqual(ctlHr - 5);
  });
  it('laryngoscopy (1.5, 30 s) and peritoneal traction (1, 120 s) slow the node too, and the site is validated', async () => {
    const l = await course(stim('laryngoscopy', 1.5, 30), T0 + 60);
    const p = await course(stim('peritoneal', 1, 120), T0 + 180);
    console.log(`laryngoscopy: HR ${hrMean(l, T0 - 30, T0).toFixed(0)} → ${hrMin(l, T0, T0 + 30).toFixed(0)}; peritoneal: ${hrMean(p, T0 - 30, T0).toFixed(0)} → ${hrMin(p, T0, T0 + 120).toFixed(0)}`);
    expect(hrMin(l, T0, T0 + 30)).toBeLessThan(hrMean(l, T0 - 30, T0) - 5);
    expect(hrMin(p, T0, T0 + 120)).toBeLessThanOrEqual(0.8 * hrMean(p, T0 - 30, T0));
    const e = createEngine({ seed: 7, mode: 'modeled' });
    const bad = e.dispatch({ id: 'x', issuedBy: 'test', type: 'applyEvent', event: { kind: 'stimulus', intensity: 1, site: 'elbow' } } as unknown as Command);
    expect(JSON.stringify(bad)).toMatch(/site must be/);
  });
  it('class IV haemorrhage (2.5 L over 10 min): HR falls below 100 in the minute before the arrest (the empty-ventricle and ischaemic bradycardia; Secher 1984)', async () => {
    const h = await course([[60, { kind: 'bleed', volumeMl: 2500, overS: 600 }]], 900);
    const ta = h.tPulseless as number;
    console.log(`class IV: HR peak ${Math.max(...h.hr.filter(([t]) => t < ta).map(([, x]) => x)).toFixed(0)}, last minute before the arrest ${hrMean(h, ta - 60, ta - 5).toFixed(0)}, arrest at ${ta} s`);
    expect(ta).toBeDefined();
    expect(hrMean(h, ta - 60, ta - 5)).toBeLessThan(100);
  });
});
