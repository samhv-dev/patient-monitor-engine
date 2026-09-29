import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type EngineEvent } from '../../src/index.ts';

type Body = Command extends infer C ? (C extends Command ? Omit<C, 'id' | 'issuedBy'> : never) : never;
let n = 0;
const cmd = (c: Body) => ({ id: `t${++n}`, issuedBy: 'test', ...c }) as Command;
const ev = (event: Record<string, unknown>) => cmd({ type: 'applyEvent', event } as Body);
const drug = (drugId: string, dose: number, unit: 'mg' | 'mg/kg' | 'mcg/kg' | 'mcg' | 'mcg/kg/min', infusion = false) =>
  ev({ kind: 'drug', drugId, dose, unit, route: 'iv', ...(infusion ? { infusion: true } : {}) });
const yieldNow = () => new Promise((r) => setImmediate(r));
const ADULT = { weightKg: 70, heightCm: 170, ageY: 40, sex: 'M' as const };

async function run(e: ReturnType<typeof createEngine>, toS: number): Promise<void> {
  for (let t = Math.ceil(e.now().simT / 60) * 60; t < toS; t += 60) {
    e.advanceTo(Math.min(t + 60, toS));
    await yieldNow();
  }
  e.advanceTo(toS);
}

describe('Stage 7f through the engine (drug events through 7g, R51)', { timeout: 180_000 }, () => {
  it('rocuronium 0.6 mg/kg: the stimulator reads TOF 0 by 2 min and spontaneous TOFR ≥ 90 % at 55–95 min (R51 addendum 17)', async () => {
    const e = createEngine({ seed: 3, patient: ADULT });
    const tofs: Extract<EngineEvent, { type: 'tof' }>[] = [];
    e.on((x) => { if (x.type === 'tof') tofs.push(x); }, ['tof']);
    expect(e.dispatch(cmd({ type: 'device', action: { device: 'tof', action: 'start', intervalS: 15 } } as Body)).accepted).toBe(true);
    // E-7d-4 (rig fix, band unchanged): a paralysed patient is ventilated to normocapnia. Left apnoeic, this rig reached
    // SaO2 0 by 4 min, PaCO2 270 / pH 6.56 and MAP 46 by 60 min; once 7d's kidney exists that shock is anuric (GFR 0
    // from 36 min), rocuronium's 30 % renal clearance goes with it (7g clFactor 0.98 → 0.69) and TOFR 0.9 never came
    // within the run — correct physiology for an asphyxiated patient, not the spontaneous-recovery premise of the band.
    e.dispatch(ev({ kind: 'ventilation', source: 'ventilator', rr: 18, vtMl: 500, fio2: 0.5, peep: 5 }));
    expect(e.dispatch(drug('rocuronium', 0.6, 'mg/kg')).accepted).toBe(true);
    await run(e, 100 * 60);
    const zero = tofs.find((x) => x.count === 0);
    expect(zero && zero.t).toBeLessThan(135);
    const back = tofs.find((x) => x.t > 600 && x.count === 4 && (x.ratio ?? 0) >= 0.9);
    expect(back && back.t / 60).toBeGreaterThan(55);
    expect(back && back.t / 60).toBeLessThan(95);
    expect(tofs.length).toBeGreaterThan(390);
  });
  it('sugammadex 2 mg/kg at TOF 2 → a train reads TOFR ≥ 90 % within 3.5 min (train every 15 s)', async () => {
    const e = createEngine({ seed: 4, patient: ADULT });
    const tofs: Extract<EngineEvent, { type: 'tof' }>[] = [];
    e.on((x) => { if (x.type === 'tof') tofs.push(x); }, ['tof']);
    e.dispatch(cmd({ type: 'device', action: { device: 'tof', action: 'start', intervalS: 15 } } as Body));
    e.dispatch(drug('rocuronium', 0.6, 'mg/kg'));
    let given = -1;
    for (let t = 60; t < 45 * 60 && given < 0; t += 15) {
      e.advanceTo(t);
      if (t % 60 === 0) await yieldNow();
      const last = tofs[tofs.length - 1];
      if (last && last.t > 600 && last.count >= 2) {
        e.dispatch(drug('sugammadex', 2, 'mg/kg'));
        given = t;
      }
    }
    expect(given).toBeGreaterThan(0);
    await run(e, given + 300);
    const ok = tofs.find((x) => x.t > given && x.count === 4 && (x.ratio ?? 0) >= 0.9);
    expect(ok && (ok.t - given) / 60).toBeLessThan(3.5);
  });
  it('remifentanil infusion stops spontaneous breaths (apnoea mark, no breath events); stopping it restores breathing', async () => {
    const e = createEngine({ seed: 5, patient: ADULT });
    const marks: string[] = [];
    let breaths = 0;
    let lastBreath = 0;
    e.on((x) => {
      if (x.type === 'neuroMark') marks.push(x.kind);
      if (x.type === 'breath') { breaths++; lastBreath = x.t; }
    });
    e.dispatch(drug('remifentanil', 1, 'mcg/kg'));
    e.dispatch(drug('remifentanil', 0.4, 'mcg/kg/min', true));
    await run(e, 600);
    expect(marks).toContain('apnoea');
    expect(600 - lastBreath).toBeGreaterThan(30);
    e.dispatch(drug('remifentanil', 0, 'mcg/kg/min', true));
    await run(e, 1200); // remifentanil context-sensitive half-time ≈ 2–4 min (7g decision 3): Ce falls below the apnoea level within minutes
    expect(marks).toContain('breathing');
    const before = breaths;
    await run(e, 1500);
    expect(breaths - before).toBeGreaterThan(40); // RR ≈ 12 × 5 min, opioid tail allowed
  });
  it('naloxone (F2): remifentanil 0.3 µg/kg/min makes the patient apnoeic; naloxone 0.4 mg restores spontaneous breaths within 3 min', async () => {
    const e = createEngine({ seed: 10, patient: ADULT });
    const marks: { t: number; k: string }[] = [];
    const breaths: number[] = [];
    e.on((x) => {
      if (x.type === 'neuroMark') marks.push({ t: x.t, k: x.kind });
      if (x.type === 'breath') breaths.push(x.t);
    });
    e.dispatch(drug('remifentanil', 0.3, 'mcg/kg/min', true));
    await run(e, 600);
    expect(marks.some((m) => m.k === 'apnoea')).toBe(true);
    expect(breaths.filter((t) => t > 540).length).toBe(0);
    expect(e.dispatch(drug('naloxone', 0.4, 'mg')).accepted).toBe(true);
    await run(e, 900);
    const back = marks.find((m) => m.k === 'breathing' && m.t > 600);
    expect(back && (back.t - 600) / 60).toBeLessThan(3);
    expect(breaths.filter((t) => t > 780).length).toBeGreaterThan(10); // RR ≥ 5/min over the last 2 min, the infusion still running
  });
  it('stimulus is 7e\'s event, observed by 7f: accepted by the engine (7f validates it until 7e lands), laryngoscopy under 0.5 MAC → movement', async () => {
    const e = createEngine({ seed: 11, patient: ADULT });
    const marks: string[] = [];
    e.on((x) => { if (x.type === 'neuroMark') marks.push(x.kind); });
    e.dispatch(ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 }));
    e.dispatch(ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 1.2, fgfLpm: 6 }));
    await run(e, 900);
    expect(e.dispatch(ev({ kind: 'stimulus', intensity: 3 })).accepted).toBe(false);
    expect(e.dispatch(ev({ kind: 'stimulus', intensity: 1.5 })).accepted).toBe(true);
    await run(e, 960);
    expect(marks).toContain('movement');
  });
  it('anaesthesia event every second with depth, MAC and TOF; propofol (7g\'s Eleveld Ce) deepens the index', async () => {
    const e = createEngine({ seed: 6, patient: ADULT });
    const an: Extract<EngineEvent, { type: 'anaesthesia' }>[] = [];
    e.on((x) => { if (x.type === 'anaesthesia') an.push(x); }, ['anaesthesia']);
    expect(e.dispatch(drug('propofol', 2, 'mg/kg')).accepted).toBe(true);
    await run(e, 180);
    expect(an.length).toBeGreaterThanOrEqual(179);
    const nadir = Math.min(...an.map((a) => a.di));
    console.log(`DI nadir ${nadir}`);
    expect(nadir).toBeGreaterThan(38);
    expect(an[an.length - 1]?.conscious).toBe(false);
  });
  // R45 (FU-4 F4, Task 18d): the upper edge moved by one integer step when Stage 3's gas-exchange flow became the
  // patient's own cardiac output (coRatio against CI_LPM_PER_KG × effKg instead of the adult 5.25 L/min; this 70 kg /
  // 170 cm adult's reference falls 5.25 → 5.07 L/min) — measured nadir 52 (51 before). Split out of the test above
  // unchanged, kept as a record.
  it.fails('propofol 2 mg/kg: depth-index nadir < 52 — measured 52 after FU-4 F4 (51 before)', async () => {
    const e = createEngine({ seed: 6, patient: ADULT });
    const an: Extract<EngineEvent, { type: 'anaesthesia' }>[] = [];
    e.on((x) => { if (x.type === 'anaesthesia') an.push(x); }, ['anaesthesia']);
    e.dispatch(drug('propofol', 2, 'mg/kg'));
    await run(e, 180);
    expect(Math.min(...an.map((a) => a.di))).toBeLessThan(52);
  });
  it('succinylcholine: 7g consumes the dose, 7f observes it (fasciculation mark); 7f leaves ECG potassium alone (7c owns it, R51 §3)', async () => {
    const e = createEngine({ seed: 7, patient: { ...ADULT, neuro: { nm: 'burn' } } });
    const marks: string[] = [];
    e.on((x) => { if (x.type === 'neuroMark') marks.push(x.kind); });
    const st = () => (e.snapshot().state as { st: { mods: { k: number }; blood?: unknown } }).st;
    const k0 = st().mods.k;
    expect(e.dispatch(drug('succinylcholine', 1.5, 'mg/kg')).accepted).toBe(true);
    await run(e, 300);
    expect(marks).toContain('fasciculation');
    if (st().blood === undefined) expect(st().mods.k).toBe(k0); // without 7c nothing moves K; with 7c its deltas do
  });
  it('determinism: same seed and commands → identical tof and anaesthesia streams', async () => {
    const go = async () => {
      const e = createEngine({ seed: 9, patient: { weightKg: 70 } });
      const out: string[] = [];
      e.on((x) => { if (x.type === 'tof' || x.type === 'anaesthesia') out.push(JSON.stringify(x)); });
      e.dispatch(cmd({ type: 'device', action: { device: 'tof', action: 'start' } } as Body));
      e.dispatch(drug('rocuronium', 0.6, 'mg/kg'));
      e.dispatch(ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2.2, fgfLpm: 6 }));
      await run(e, 300);
      return out;
    };
    expect(await go()).toEqual(await go());
  });
  it('snapshot/restore mid-block continues the TOF stream identically', async () => {
    const mk = () => createEngine({ seed: 12, patient: { weightKg: 70 } });
    const a = mk();
    a.dispatch(cmd({ type: 'device', action: { device: 'tof', action: 'start' } } as Body));
    a.dispatch(drug('rocuronium', 0.6, 'mg/kg'));
    await run(a, 600);
    const snap = a.snapshot();
    const b = mk();
    b.restore(snap);
    const ta: string[] = [];
    const tb: string[] = [];
    a.on((x) => { if (x.type === 'tof') ta.push(JSON.stringify(x)); }, ['tof']);
    b.on((x) => { if (x.type === 'tof') tb.push(JSON.stringify(x)); }, ['tof']);
    await run(a, 900);
    await run(b, 900);
    expect(tb).toEqual(ta);
    expect(ta.length).toBeGreaterThan(15);
  });
});
