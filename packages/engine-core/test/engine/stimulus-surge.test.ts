// FU-7 Task 10 (R51 addendum 22 + 25; Orchestrator ruling (FU-7 review) 1; research/14 D8, research/19 CM-03c,
// research/14-coverage ET-16a): the laryngoscopy / surgical stimulus sympathetic SURGE — its circulating catecholamine
// release acted out by 7g's adrenergic rows and its set-point reset defended by 7a — the blunting drugs, and the guard
// arms: a CONDITION's or a DRUG's sympathetic activity never resets the set point. Rig = the audit's ventilated adult
// (ETT + VCV 12 × 600, PEEP 5, FiO2 0.5), seed 7, 5 s samples; ΔMAP/ΔHR against the same arm without the stimulus.
// Pre-treatments (fentanyl, labetalol, esmolol, lidocaine) at 180 s — DI-08's labetalol time — before propofol 2 mg/kg
// at 240 s and the stimulus at 300 s. One yield per sim-MINUTE (CI amendment 4). SLOW_A (executor instruction).
import { describe, expect, it } from 'vitest';
import type { MonitorEngine, PatientProfile } from '../../src/types.ts';
import { ADULT6, rig6, runTo, send, st6 } from '../helpers/fu6.ts';

type Ev = Record<string, unknown>;
interface Row { t: number; map: number; hr: number; set: number; surgeF: number; ne: number; epi: number }
const drug = (drugId: string, dose: number, unit: string): Ev => ({ kind: 'drug', drugId, dose, unit, route: 'iv' });
const stim = (intensity: number): Ev => ({ kind: 'stimulus', intensity });

function sample(e: MonitorEngine, t: number): Row {
  const s = st6(e);
  const c = s.hemo.circ;
  const bs = c.beats.filter((b: { t: number }) => b.t > t - 6);
  const out = s.endo?.core?.out ?? {};
  return {
    t, map: bs.length ? bs.reduce((a: number, b: { map: number }) => a + b.map, 0) / bs.length : (c.s[0] as number), hr: c.hrModel as number,
    set: c.baro.set as number, surgeF: (out.surgeF as number | undefined) ?? Number.NaN,
    ne: (out.surgeCat?.ne as number | undefined) ?? Number.NaN, epi: (out.surgeCat?.epi as number | undefined) ?? Number.NaN,
  };
}

/** One ventilated arm: `steps` [t, event] in time order, sampled every 5 s to `tEnd`; `force` overwrites 7a's surge factor to 1. */
async function arm(steps: [number, Ev][], tEnd: number, o: { patient?: PatientProfile; force?: boolean } = {}): Promise<Row[]> {
  const e = rig6(o.patient ?? ADULT6, 'modeled', 7);
  await runTo(e, 1);
  send(e, { kind: 'airwayDevice', device: 'ett' });
  send(e, { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 });
  const q = [...steps];
  const rows: Row[] = [];
  await runTo(e, tEnd, (u) => {
    while (q.length && q[0]![0] <= u) send(e, q.shift()![1]);
    if (o.force) st6(e).hemo.circ.ext.surgeF = 1;
    rows.push(sample(e, u));
  }, 5);
  return rows;
}
const cache = new Map<string, Promise<Row[]>>();
const run = (key: string, steps: [number, Ev][], tEnd: number, o: { patient?: PatientProfile; force?: boolean } = {}) => {
  if (!cache.has(key)) cache.set(key, arm(steps, tEnd, o));
  return cache.get(key)!;
};
const at = (r: Row[], t: number) => r.find((x) => x.t >= t)!;
/** Peak Δ of `k` (arm − control, sample by sample) over [t0, t0 + win]. */
const dPeak = (i: Row[], c: Row[], k: 'map' | 'hr', t0: number, win = 300) =>
  Math.max(...i.filter((r) => r.t >= t0 && r.t <= t0 + win).map((r) => r[k] - at(c, r.t)[k]));

const STIM_T = 300;
const LARYNX: [number, Ev][] = [[STIM_T, stim(1.5)], [STIM_T + 60, stim(0)]];
const PROP: [number, Ev] = [240, drug('propofol', 2, 'mg/kg')];
/** Case 1's rig with an optional pre-treatment at 180 s: ΔMAP, ΔHR (peaks) and ΔMAP at +90 s. */
async function laryngoscopy(pre: Ev | null, key: string) {
  const base: [number, Ev][] = [...(pre ? [[180, pre] as [number, Ev]] : []), PROP];
  const i = await run(`${key}:stim`, [...base, ...LARYNX], STIM_T + 600);
  const c = await run(`${key}:ctrl`, base, STIM_T + 600);
  const dMap = dPeak(i, c, 'map', STIM_T);
  const dHr = dPeak(i, c, 'hr', STIM_T);
  const at90 = at(i, STIM_T + 90).map - at(c, STIM_T + 90).map;
  return { dMap, dHr, at90, i, c };
}
const f1 = (x: number) => x.toFixed(1);
const f2 = (x: number) => x.toFixed(2);

describe('FU-7 Task 10: the stimulus sympathetic surge (R51 addenda 22 + 25; ruling 1)', { timeout: 3_600_000 }, () => {
  it('laryngoscopy after propofol raises MAP 20–30 mmHg and HR 12–30 and is still ≥ 50 % of its peak at 90 s (Shribman 1987; research/14 D8: was +6.1)', async () => {
    const r = await laryngoscopy(null, 'prop');
    console.log(`FU-7 case 1 propofol: ΔMAP ${f1(r.dMap)}, ΔHR ${f1(r.dHr)}, at +90 s ${f1(r.at90)} (${f1((100 * r.at90) / r.dMap)} %)`);
    expect(r.dMap).toBeGreaterThanOrEqual(20);
    expect(r.dMap).toBeLessThanOrEqual(30);
    expect(r.dHr).toBeGreaterThanOrEqual(12);
    expect(r.dHr).toBeLessThanOrEqual(30);
    expect(r.at90).toBeGreaterThanOrEqual(0.5 * r.dMap);
  });

  it('awake laryngoscopy raises MAP 20–40 mmHg and HR 12–30 (M10; the sourced awake band, orchestrator ruling 2026-09-28)', async () => {
    const i = await run('awake:stim', LARYNX, STIM_T + 600);
    const c = await run('awake:ctrl', [], STIM_T + 600);
    const dMap = dPeak(i, c, 'map', STIM_T);
    const dHr = dPeak(i, c, 'hr', STIM_T);
    console.log(`FU-7 case 1 awake: ΔMAP ${f1(dMap)}, ΔHR ${f1(dHr)}`);
    expect(dMap).toBeGreaterThanOrEqual(20);
    expect(dMap).toBeLessThanOrEqual(40);
    expect(dHr).toBeGreaterThanOrEqual(12);
    expect(dHr).toBeLessThanOrEqual(30);
  });

  // R45 (CM amendment): the resting-tone half of the exaggerated response is research/19's C1, owned by FU-8 Part B.
  // No 7e gain, `htn` set point or SURGE_SET_PER_NOX is raised to reach it; both arms' absolute ΔMAP are logged.
  it.fails('1b: the untreated hypertensive\'s pressor response is exaggerated: ΔMAP ratio HTN / healthy ≥ 1.3 (Prys-Roberts 1971) — measured 1.19 (HTN +29.8 vs healthy +25.0; CM-03c before 1.19 at +10.8 / +9.1); the resting-tone half is FU-8 Part B\'s C1', async () => {
    const HTN: PatientProfile = { ...ADULT6, conditions: [{ id: 'htn', severity: 1 }] } as PatientProfile;
    const steps: [number, Ev][] = [PROP, [360, stim(1.5)], [420, stim(0)]];
    const d = async (p: PatientProfile, k: string) => dPeak(await run(`${k}:stim`, steps, 700, { patient: p }), await run(`${k}:ctrl`, [PROP], 700, { patient: p }), 'map', 360, 240);
    const u = await d(HTN, 'htn');
    const a = await d(ADULT6, 'healthy1b');
    console.log(`FU-7 case 1b: ΔMAP untreated HTN ${f1(u)} vs healthy ${f1(a)}, ratio ${f2(u / a)}`);
    expect(u / a).toBeGreaterThanOrEqual(1.3);
  });

  describe('1c: surgical incision under sevoflurane (research/14-coverage ET-16a)', () => {
    const TI = 900;
    const GA: [number, Ev][] = [[300, drug('propofol', 2, 'mg/kg')], [300, drug('rocuronium', 0.6, 'mg/kg')], [300, { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 2, n2oFrac: 0 }]];
    const incision = (f: number, s: boolean): [number, Ev][] => [...GA, ...(f ? [[TI - 60, drug('fentanyl', f, 'mcg/kg')] as [number, Ev]] : []), ...(s ? [[TI, stim(1)] as [number, Ev]] : [])];
    /** ET-16a's measure: the peak MAP over 5 min after the incision − the control arm's MAP AT the incision. */
    const d = async (f: number) => {
      const i = await run(`inc${f}:stim`, incision(f, true), TI + 300);
      const c = await run(`inc${f === 2 ? 2 : 0}:ctrl`, incision(f === 2 ? 2 : 0, false), TI + 300);
      return Math.max(...i.filter((r) => r.t >= TI).map((r) => r.map)) - at(c, TI).map;
    };
    // R45 (ET amendment): SURGE_NE_GAIN / SURGE_SET_PER_NOX are fitted to case 1 and not raised; the stimulus scale is 7e's
    // one shape (R51 addendum 12). The 0.7 mmHg remainder goes to the gate note §5 and Ali (Q17).
    it.fails('no opioid: ΔMAP 20–30 mmHg (ET-16a band; Shribman 1987 via R51 addendum 25; Q17) — measured +19.3 (was +7.7)', async () => {
      const x = await d(0);
      console.log(`FU-7 case 1c: incision, no opioid ΔMAP ${f1(x)}`);
      expect(x).toBeGreaterThanOrEqual(20);
      expect(x).toBeLessThanOrEqual(30);
    });
    it('fentanyl 2 and 5 µg/kg: ΔMAP smaller in dose order (Desborough 2000)', async () => {
      const [a, b, c] = [await d(0), await d(2), await d(5)];
      console.log(`FU-7 case 1c: incision ΔMAP fentanyl 0 / 2 / 5 µg/kg: ${f1(a)} / ${f1(b)} / ${f1(c)}`);
      expect(b).toBeLessThan(a);
      expect(c).toBeLessThan(b);
    });
  });

  it('2: fentanyl 3 µg/kg blunts it — ΔMAP ratio to case 1 0.2–0.7 (M10 ch. 22; Shribman 1987)', async () => {
    const base = await laryngoscopy(null, 'prop');
    const r = await laryngoscopy(drug('fentanyl', 3, 'mcg/kg'), 'fent');
    console.log(`FU-7 case 2 fentanyl 3: ΔMAP ${f1(r.dMap)} ratio ${f2(r.dMap / base.dMap)}, HR ratio ${f2(r.dHr / base.dHr)}`);
    expect(r.dMap / base.dMap).toBeGreaterThanOrEqual(0.2);
    expect(r.dMap / base.dMap).toBeLessThanOrEqual(0.7);
  });

  it.fails('3: labetalol 10 mg blunts it — ΔMAP ratio 0.2–0.8 (Inada 1989; DI-08) — measured 0.96 (HR 0.64): the circulating noradrenaline acts through α and the reset set point is reached through the α limb; labetalol 10 mg\'s α share is small', async () => {
    const base = await laryngoscopy(null, 'prop');
    const r = await laryngoscopy(drug('labetalol', 10, 'mg'), 'lab');
    console.log(`FU-7 case 3 labetalol 10 mg: ΔMAP ratio ${f2(r.dMap / base.dMap)}, HR ratio ${f2(r.dHr / base.dHr)}`);
    expect(r.dMap / base.dMap).toBeGreaterThanOrEqual(0.2);
    expect(r.dMap / base.dMap).toBeLessThanOrEqual(0.8);
  });

  describe('4: esmolol 1 mg/kg (T6.2; the classic teaching)', () => {
    const ratios = async () => {
      const base = await laryngoscopy(null, 'prop');
      const r = await laryngoscopy(drug('esmolol', 1000, 'mcg/kg'), 'esm');
      return { hr: r.dHr / base.dHr, map: r.dMap / base.dMap };
    };
    it('blunts the HR component more than the MAP component (ΔHR ratio < ΔMAP ratio)', async () => {
      const x = await ratios();
      console.log(`FU-7 case 4 esmolol 1 mg/kg: HR ratio ${f2(x.hr)}, MAP ratio ${f2(x.map)}`);
      expect(x.hr).toBeLessThan(x.map);
    });
    it.fails('the bounds: ΔHR ratio ≤ 0.5 and ΔMAP ratio ≤ 0.9 — measured HR 0.56, MAP 1.00 on the gate tree (8454221: 0.58 / 0.98; β-occupancy blunts the HR share only; the MAP share acts through α)', async () => {
      const x = await ratios();
      expect(x.hr).toBeLessThanOrEqual(0.5);
      expect(x.map).toBeLessThanOrEqual(0.9);
    });
  });

  it('5: IV lidocaine 1.5 mg/kg blunts it — ΔMAP ratio 0.4–0.9 (Lin 2016)', async () => {
    const base = await laryngoscopy(null, 'prop');
    const r = await laryngoscopy(drug('lidocaine', 1.5, 'mg/kg'), 'lido');
    console.log(`FU-7 case 5 lidocaine 1.5 mg/kg: ΔMAP ratio ${f2(r.dMap / base.dMap)}, HR ratio ${f2(r.dHr / base.dHr)}`);
    expect(r.dMap / base.dMap).toBeGreaterThanOrEqual(0.4);
    expect(r.dMap / base.dMap).toBeLessThanOrEqual(0.9);
  });

  it('6: the surge does not move a resting patient\'s set point — baro.set within 1 mmHg of its 300 s value over 10 min', async () => {
    const r = await run('rest', [], 900);
    const s0 = at(r, 300).set;
    const dev = Math.max(...r.filter((x) => x.t >= 300).map((x) => Math.abs(x.set - s0)));
    console.log(`FU-7 case 6 rest: set ${f1(s0)}, max |Δset| ${f2(dev)}`);
    expect(dev).toBeLessThanOrEqual(1);
  });

  describe('7: a CONDITION\'s or a DRUG\'s sympathetic activity never resets the set point (ruling 1; addendum 25)', () => {
    const guards: [string, [number, Ev][], number][] = [
      ['(a) septic shock (sepsis severity 1)', [[60, { kind: 'condition', id: 'sepsis', severity: 1 }]], 1200],
      ['(b) anaphylaxis grade III (severity 0.75)', [[60, { kind: 'condition', id: 'anaphylaxis', severity: 0.75 }]], 1200],
      ['(c) untreated MH (sevoflurane + succinylcholine, condition mh 1, no dantrolene)', [[60, { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 4, n2oFrac: 0 }], [120, drug('succinylcholine', 1.5, 'mg/kg')], [180, { kind: 'condition', id: 'mh', severity: 1 }]], 1200],
      ['(d) ephedrine 10 mg', [[300, drug('ephedrine', 10, 'mg')]], 1200],
      ['(e) ketamine 1.5 mg/kg', [[300, drug('ketamine', 1.5, 'mg/kg')]], 1200],
      ['(f) hypoglycaemia (insulin 40 U at 60 s, 60 min)', [[60, drug('insulin', 40, 'units')]], 3600],
    ];
    for (const [name, steps, tEnd] of guards) {
      it(`${name}: surgeF exactly 1, surgeCat exactly 0, baro.set within 1 mmHg of the arm with ext.surgeF forced to 1`, async () => {
        const a = await run(`g${name}`, steps, tEnd);
        const b = await run(`g${name}:forced`, steps, tEnd, { force: true });
        const dF = Math.max(...a.map((r) => Math.abs(r.surgeF - 1)));
        const cat = Math.max(...a.map((r) => Math.max(r.ne, r.epi)));
        const dSet = Math.max(...a.map((r, k) => Math.abs(r.set - b[k]!.set)));
        const dMap = Math.max(...a.map((r, k) => Math.abs(r.map - b[k]!.map)));
        console.log(`FU-7 case 7 ${name}: |surgeF−1| max ${dF}, surgeCat max ${cat}, |Δset| max ${dSet.toFixed(3)}, |ΔMAP| max ${dMap.toFixed(3)}`);
        expect(dF).toBeLessThanOrEqual(1e-9);
        expect(cat).toBe(0);
        expect(dSet).toBeLessThanOrEqual(1);
      });
    }
  });
});
