// FU-4 clinical scenario suite (plan Task 22; audit §6 S1–S16, adjusted; re-run after Tasks 18a–18g). What the
// orchestrator inspects BEFORE Ali is asked to test again (R53). Rig (audit §1): adult 40 y 70 kg male, seed 7, MODELED
// unless stated, intubated (ETT) on VCV 12 × 600 mL / PEEP 5 / FiO2 0.5 from t = 1 s (removes 7f's propofol airway
// obstruction as a confounder). Bands are the audit's proposals with their sources (Q1–Q12 are Ali's to confirm); R45: a
// band the mechanism misses is `it.fails` with the measured number in its title.
// D27 / review F9: every physiological assertion reads TRUTH — `resp.o2.sa` (SaO2), `hemo.circ` — never the displayed
// SpO2; the displayed value is carried in a separate column (`spo2Shown`) for the screenshots only, because once FU-5
// makes SpO2 invalid at low perfusion a `null → −1` would satisfy "SpO2 < 90" on a monitor dropout.
// Scenarios living in their own files: S3 → circ-pulsus (Task 10; its tamponade SBP-swing `it.fails`, 3–4 mmHg, is
// counted in this suite's list), S7 → circ-lowflow-arrest (Task 6; with the untreated PEA → asystole row of Task 18b),
// S11 → blood-k-rhythm (Task 7), S12 → circ-hypoxic-arrest (FU-3/Task 13), S15 → vagal-events (Tasks 12/18f: the
// repeat-succinylcholine draw over seeds 7/8/9, none with atropine first), the tension pneumothorax's own course and
// decompression → tension-ptx (Task 18c), the 7 kg infant → vent-infant (Task 18d).
// The `it.fails` of this file (counted, R45): S2's MAP side, S4b, S5, S6a's percentage side, S9's SaO2 side, S9's
// CVP/MAP side, S13, S14's MAP side, the 2 L full-exsanguination ROSC row (E-FU4-19), the 10-min VF kIsch row, the
// MANUAL floor row — ELEVEN here, plus S3 in circ-pulsus. S1b (0.920), S8 (+9.75 min) and CPR alone (G-FU4-1) flipped. Every run yields once per sim-minute (CI amendment 4);
// SLOW_A (Task 20).
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type PatientProfile } from '../../src/index.ts';

type Ev = Record<string, unknown>;
type Step = [number, Ev];
interface Row {
  t: number; map: number; sbp: number; hr: number; co: number; cvp: number; sao2: number; spo2Shown: number | null; etco2: number;
  cpp: number; propCe: number; pulseless: boolean; rhythm: string; cause: string; kIsch: number; tempC: number; shownSys: number | null; shownDia: number | null;
}
let n = 0;
const drug = (drugId: string, dose: number, unit: string): Ev => ({ kind: 'drug', drugId, dose, unit, route: 'iv' });
const vent = (peep = 5): Ev => ({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep, fio2: 0.5 });
type St = {
  rhythm: { id: string; opts: { pulseless?: boolean } };
  hemo: { circ: { mapNow: number; beats: { t: number; sbp: number }[]; qFwd: number; lastEjT: number; t: number; arrest: { cause: string } | null; cor: { cpp: number }; ext: { kIsch: number } }; circOut: { pRa: number } };
  resp: { etco2: number; num: { spo2: { shown: number | null } }; o2: { sa: number }; temp: { tc: number } };
  pk: { bus: { cns: { propCe?: number } } };
};
const ARREST = new Set(['asystole', 'vfCoarse', 'vfFine', 'agonal']);

type Opts = { mode?: 'modeled' | 'manual'; patient?: PatientProfile; ventilated?: boolean; commands?: [number, Ev][] };
async function scenario(steps: Step[], tEnd: number, opts: Opts = {}): Promise<Row[]> {
  const e = createEngine({ seed: 7, mode: opts.mode ?? 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, ...(opts.patient ?? {}), sensors: { abp: 'connected', cvp: 'connected', spo2: 'on' } } });
  let hr = 75;
  let sys: number | null = null;
  let dia: number | null = null;
  e.on((x) => {
    if (x.type !== 'measurement') return;
    if (x.values.hr?.value != null) hr = x.values.hr.value;
    if (x.values.abpSys !== undefined) sys = x.values.abpSys.value;
    if (x.values.abpDia !== undefined) dia = x.values.abpDia.value;
  }, ['measurement']);
  const send = (t: number, event: Ev) => e.dispatch({ id: `cs${++n}`, issuedBy: 'test', type: 'applyEvent', event, atTick: Math.round(t * 50) } as unknown as Command);
  if (opts.ventilated !== false) { send(1, { kind: 'airwayDevice', device: 'ett' }); send(1, vent()); }
  for (const [t, ev] of steps) send(t, ev);
  for (const [t, c] of opts.commands ?? []) e.dispatch({ id: `cs${++n}`, issuedBy: 'test', ...c, atTick: Math.round(t * 50) } as unknown as Command);
  const rows: Row[] = [];
  for (let t = 5; t <= tEnd; t += 5) {
    e.advanceTo(t);
    const s = (e as unknown as { st: St }).st;
    const c = s.hemo.circ;
    const bs = c.beats.filter((b) => b.t > t - 6);
    rows.push({
      t, map: c.mapNow, sbp: bs.length ? Math.max(...bs.map((b) => b.sbp)) : c.mapNow, hr, co: c.t - c.lastEjT > 3 ? 0 : c.qFwd * 0.06, cvp: s.hemo.circOut.pRa,
      sao2: s.resp.o2.sa, spo2Shown: s.resp.num.spo2.shown, etco2: s.resp.etco2, cpp: c.cor.cpp, propCe: s.pk.bus.cns.propCe ?? 0,
      pulseless: s.rhythm.opts.pulseless === true || ARREST.has(s.rhythm.id), rhythm: s.rhythm.id, cause: c.arrest?.cause ?? '',
      kIsch: c.ext.kIsch, tempC: s.resp.temp.tc, shownSys: sys, shownDia: dia,
    });
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  return rows;
}
const win = (rows: Row[], a: number, b: number) => rows.filter((r) => r.t > a && r.t <= b);
const mean = (rows: Row[], k: keyof Row) => rows.reduce((s, r) => s + (r[k] as number), 0) / Math.max(1, rows.length);
const minOf = (rows: Row[], k: keyof Row) => Math.min(...rows.map((r) => r[k] as number));
const arrestAt = (rows: Row[], after = 0) => rows.find((r) => r.t > after && r.pulseless)?.t;
const TAMP = { kind: 'condition', id: 'tamponade', severity: 1 };
const BLEED15: Step = [60, { kind: 'bleed', volumeMl: 1500, overS: 600 }];
const memo = <T>(f: () => Promise<T>) => { let p: Promise<T> | undefined; return () => (p ??= f()); };

describe('FU-4 clinical scenario suite (MODELED, audit rig)', { timeout: 600_000 }, () => {
  const s1 = memo(() => scenario([[300, drug('propofol', 2, 'mg/kg')]], 1200));
  it('S1 healthy, propofol 2 mg/kg: MAP nadir 60–80 % of baseline at 2–5 min, HR change −10…+10, no arrest (Miller ch. 21 p. 519; Q1)', async () => {
    const r = await s1();
    const base = mean(win(r, 270, 300), 'map');
    const nadir = minOf(win(r, 420, 600), 'map');
    const dHr = mean(win(r, 420, 480), 'hr') - mean(win(r, 270, 300), 'hr');
    console.log(`S1: MAP ${base.toFixed(0)} → ${nadir.toFixed(0)} (${(nadir / base).toFixed(3)}), ΔHR ${dHr.toFixed(0)}, 15 min ${(mean(win(r, 1170, 1200), 'map') / base).toFixed(3)}`);
    expect(nadir / base).toBeGreaterThanOrEqual(0.6);
    expect(nadir / base).toBeLessThanOrEqual(0.8);
    expect(Math.abs(dHr)).toBeLessThanOrEqual(10);
    expect(arrestAt(r)).toBeUndefined();
  });
  // R45: flipped — the humoral arm (Task 18e) carries the recovery: 0.920 at 15 min (was 0.84 on the prototype)
  it('S1b the same run: MAP back to ≥ 85 % of baseline by 15 min (audit S1 proposal; measured 0.920 — was 0.84 on the prototype)', async () => {
    const r = await s1();
    expect(mean(win(r, 1170, 1200), 'map') / mean(win(r, 270, 300), 'map')).toBeGreaterThanOrEqual(0.85);
  });
  const s2 = memo(() => scenario([[300, { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 3, fgfLpm: 2, n2oFrac: 0 }]], 1500));
  it('S2 healthy, sevoflurane to ≈ 1 MAC (3 % dial, 20 min): HR change ≤ +10, no arrest (Ebert 1995; Miller inhaled agents)', async () => {
    const r = await s2();
    const base = mean(win(r, 270, 300), 'map');
    const end = mean(win(r, 1440, 1500), 'map');
    const dHr = mean(win(r, 1440, 1500), 'hr') - mean(win(r, 270, 300), 'hr');
    console.log(`S2: MAP ${base.toFixed(0)} → ${end.toFixed(0)} (${((end / base - 1) * 100).toFixed(1)} %), ΔHR ${dHr.toFixed(0)}, arrest ${arrestAt(r) ?? 'none'}`);
    expect(dHr).toBeLessThanOrEqual(10);
    expect(arrestAt(r)).toBeUndefined();
  });
  // R45 (Task 18e): the humoral arm answers the volatile's own unloading — −21 % on the prototype, −14.3 % now (Q1)
  it.fails('S2 the same: MAP −15 to −30 % at 20 min — measured −14.3 % with the humoral arm (−21 % on the prototype; Q1)', async () => {
    const r = await s2();
    const f = mean(win(r, 1440, 1500), 'map') / mean(win(r, 270, 300), 'map') - 1;
    expect(f).toBeLessThanOrEqual(-0.15);
    expect(f).toBeGreaterThanOrEqual(-0.3);
  });
  it("S4a severe tamponade (compensated), propofol 2 mg/kg: collapse and PEA within 10 min (Ali, R53; Barash, pericardial disease)", async () => {
    const r = await scenario([[60, TAMP], [660, drug('propofol', 2, 'mg/kg')]], 1260);
    const pre = mean(win(r, 630, 660), 'map');
    const a = arrestAt(r, 660);
    console.log(`S4a: compensated MAP ${pre.toFixed(0)}, HR ${mean(win(r, 630, 660), 'hr').toFixed(0)}; PEA at +${a !== undefined ? a - 660 : '–'} s`);
    expect(pre).toBeGreaterThanOrEqual(75);
    expect(a).toBeDefined();
    expect((a as number) - 660).toBeLessThanOrEqual(600);
  });
  it.fails('S4b severe tamponade, propofol 1 mg/kg: MAP < 55 within 3 min and CO −25 % (audit S4 proposal; Q2; measured MAP 59.7, CO −15 % — 57 / −15 % on the prototype)', async () => {
    const r = await scenario([[60, TAMP], [660, drug('propofol', 1, 'mg/kg')]], 1260);
    const co0 = mean(win(r, 630, 660), 'co');
    const w = win(r, 660, 840);
    console.log(`S4b: MAP nadir ${minOf(w, 'map').toFixed(1)}, CO ${co0.toFixed(2)} → ${minOf(w, 'co').toFixed(2)} (${((minOf(w, 'co') / co0 - 1) * 100).toFixed(0)} %)`);
    expect(minOf(w, 'map')).toBeLessThan(55);
    expect(minOf(w, 'co')).toBeLessThanOrEqual(0.75 * co0);
  });
  it.fails('S5 severe tamponade, PEEP 5 → 10: CO −20 % and MAP ≥ 10 mmHg more than the same PEEP in a healthy patient (Barash; measured ΔMAP 4.1 vs 1.5, CO ×0.88 — 4 vs 1, ×0.89 on the prototype; Q2)', async () => {
    const t = await scenario([[60, TAMP], [660, vent(10)]], 1260);
    const h = await scenario([[660, vent(10)]], 1260);
    const dT = mean(win(t, 630, 660), 'map') - minOf(win(t, 660, 1260), 'map');
    const dH = mean(win(h, 630, 660), 'map') - minOf(win(h, 660, 1260), 'map');
    const coF = minOf(win(t, 660, 1260), 'co') / mean(win(t, 630, 660), 'co');
    console.log(`S5: tamponade ΔMAP ${dT.toFixed(1)} (CO ×${coF.toFixed(2)}), healthy ΔMAP ${dH.toFixed(1)}`);
    expect(coF).toBeLessThanOrEqual(0.8);
    expect(dT - dH).toBeGreaterThanOrEqual(10);
  });
  const s6a = memo(() => scenario([BLEED15, [960, drug('propofol', 2, 'mg/kg')]], 1500));
  it('S6a hypovolaemia −30 % (1.5 L over 10 min), propofol 2 mg/kg: MAP < 50 (Johnson 2003; ATLS)', async () => {
    const r = await s6a();
    console.log(`S6a: MAP ${mean(win(r, 930, 960), 'map').toFixed(1)} → ${minOf(win(r, 960, 1500), 'map').toFixed(1)} (${((minOf(win(r, 960, 1500), 'map') / mean(win(r, 930, 960), 'map') - 1) * 100).toFixed(0)} %); arrest ${arrestAt(r, 960) ?? '–'}`);
    expect(minOf(win(r, 960, 1500), 'map')).toBeLessThan(50);
  });
  // Task 18e (ruling 2 / D23): the "arrest is not the rule" side — INTUBE (Russotto 2021: arrest 3.1 %), Heffner 2013 (≈ 4 %)
  it('S6a the same: class III haemorrhage + propofol 2 mg/kg does not arrest within 5 min — profound hypotension, not PEA (Russotto 2021; Heffner 2013)', async () => {
    const r = await s6a();
    expect(arrestAt(r, 960)).toBeUndefined();
    expect(win(r, 960, 1260).every((x) => !x.pulseless)).toBe(true);
  });
  // R45 (Task 18e, D23): the two sourced targets pull against each other — kept with the numbers (Ali's Q1, item 19)
  it.fails('S6a the same: MAP falls 40–60 % to a nadir of 30–50 over 1–3 min (the expected picture; measured nadir 27.0, −68 % — 28.7 on the prototype; Q1)', async () => {
    const r = await s6a();
    const pre = mean(win(r, 930, 960), 'map');
    const nadir = minOf(win(r, 960, 1140), 'map');
    expect(nadir).toBeGreaterThanOrEqual(30);
    expect(nadir).toBeLessThanOrEqual(50);
    expect(1 - nadir / pre).toBeGreaterThanOrEqual(0.4);
    expect(1 - nadir / pre).toBeLessThanOrEqual(0.6);
  });
  it('S6b the same: propofol peak Ce ≥ 1.3× the healthy peak (Task 14, G10; Johnson 2003, Kazama 2002)', async () => {
    const h = await scenario([[960, drug('propofol', 2, 'mg/kg')]], 1260);
    const b = await scenario([BLEED15, [960, drug('propofol', 2, 'mg/kg')]], 1260);
    const ratio = Math.max(...win(b, 960, 1260).map((x) => x.propCe)) / Math.max(...win(h, 960, 1260).map((x) => x.propCe));
    console.log(`S6b: peak Ce ratio ${ratio.toFixed(2)}`);
    expect(ratio).toBeGreaterThanOrEqual(1.3);
  });
  // R45: Task 18c's one-way valve gives the minutes course; flipped to `it` at the gate — +9.75 min once the
  // empty-ventricle term was withdrawn (+10.67 with it; the tension-ptx.test rig, lungCondition side R: +10.45, it.fails)
  it('S8 tension pneumothorax (ventilated, one command), untreated: PEA within 3–10 min (the catalogue row: build-up 2–5 min, PEA ≈ 20–25 mmHg; measured +9.75 min — was +10.67 with the withdrawn Bezold–Jarisch term)', async () => {
    const r = await scenario([[60, { kind: 'condition', id: 'tensionPtx', severity: 1 }]], 900);
    const a = arrestAt(r, 60);
    console.log(`S8: PEA at +${a !== undefined ? ((a - 60) / 60).toFixed(2) : '–'} min`);
    expect(a).toBeDefined();
    expect((a as number) - 60).toBeGreaterThanOrEqual(180);
    expect((a as number) - 60).toBeLessThanOrEqual(600);
  });
  const s9 = memo(() => scenario([[60, { kind: 'condition', id: 'pe', severity: 1 }], [420, drug('propofol', 1, 'mg/kg')]], 1020));
  it('S9 massive PE (one command): EtCO2 falls ≥ 10 mmHg by 5 min (dead space; ACLS "T")', async () => {
    const r = await s9();
    const w = win(r, 360, 420);
    const et0 = mean(win(r, 30, 60), 'etco2');
    console.log(`S9: SaO2 ${(mean(w, 'sao2') * 100).toFixed(1)} (shown SpO2 ${w.at(-1)?.spo2Shown?.toFixed(0) ?? 'invalid'}), EtCO2 ${et0.toFixed(0)} → ${mean(w, 'etco2').toFixed(0)}, CVP ${mean(w, 'cvp').toFixed(1)}, MAP ${mean(w, 'map').toFixed(1)}; PEA ${arrestAt(r, 420) ?? '–'}`);
    expect(et0 - mean(w, 'etco2')).toBeGreaterThanOrEqual(10);
  });
  it.fails("S9 the same: SaO2 < 90 % at 5 min (truth, not the display; the proposed band SpO2 ≤ 92 at FiO2 0.5 is Ali's, item 15; measured 97.8 %)", async () => {
    expect(mean(win(await s9(), 360, 420), 'sao2')).toBeLessThan(0.9);
  });
  it.fails('S9 the same: CVP ≥ 15 and MAP < 65 at 5 min (RV failure; Q15; measured CVP 9.3, MAP 82.1)', async () => {
    const w = win(await s9(), 360, 420);
    expect(mean(w, 'cvp')).toBeGreaterThanOrEqual(15);
    expect(mean(w, 'map')).toBeLessThan(65);
  });
  it('S9 the same: propofol 1 mg/kg at 7 min → PEA within 10 min (ACLS "T")', async () => {
    expect(arrestAt(await s9(), 420)).toBeDefined();
  });
  it('S10 anaphylaxis severity 1 (grade IV), untreated: arrest within 10 min (Ring & Messmer; Q7)', async () => {
    const r = await scenario([[60, { kind: 'condition', id: 'anaphylaxis', severity: 1 }]], 900);
    const a = arrestAt(r, 60);
    console.log(`S10: arrest at +${a !== undefined ? a - 60 : '–'} s`);
    expect(a).toBeDefined();
    expect((a as number) - 60).toBeLessThanOrEqual(600);
  });
  it('S10b anaphylaxis severity 1, adrenaline 50 µg at 2 min and every 2 min: no arrest in 15 min, MAP ≥ 65 at the end (UK Resuscitation Council)', async () => {
    const adr = [120, 240, 360, 480, 600, 720].map((t) => [t, drug('epinephrine', 50, 'mcg')] as Step);
    const r = await scenario([[60, { kind: 'condition', id: 'anaphylaxis', severity: 1 }], ...adr], 960);
    console.log(`S10b: arrest ${arrestAt(r, 60) ?? 'none'}; MAP end ${mean(win(r, 900, 960), 'map').toFixed(0)}`);
    expect(arrestAt(r, 60)).toBeUndefined();
    expect(mean(win(r, 900, 960), 'map')).toBeGreaterThanOrEqual(65);
  });
  // R45 (Task 18a): 23.8 at 70 s on the 18a rig, but the CoPP climbs as the CPR circulation settles — 25.1–28.8 over
  // 1–5 min of CPR alone here (the plan's quality-1 rig read 43–46 before 18a). Kept with the number (Q13's residual).
  it.fails('S13 VF + standard-quality CPR (q 0.8, no adrenaline): the continuous coronary perfusion pressure (CoPP) 15–25 mmHg (Paradis 1990; measured 24.9–28.0 after FU-8 A19, 25.1–28.8 before)', async () => {
    // commanded VF is a setRhythm, not an applyEvent: its own engine
    const eng = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: { abp: 'connected' } } });
    const cpp: number[] = [];
    eng.on((x) => { if (x.type === 'circ' && x.t > 180) cpp.push(x.cpp); }, ['circ']);
    eng.dispatch({ id: `cs${++n}`, issuedBy: 'test', type: 'setRhythm', rhythm: 'vfCoarse', atTick: 60 * 50 } as unknown as Command);
    eng.dispatch({ id: `cs${++n}`, issuedBy: 'test', type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 0.8 }, atTick: 120 * 50 } as unknown as Command);
    for (let t = 60; t <= 420; t += 60) { eng.advanceTo(t); await new Promise((res) => setImmediate(res)); }
    console.log(`S13: CPR CoPP ${Math.min(...cpp).toFixed(1)}–${Math.max(...cpp).toFixed(1)}`);
    expect(Math.min(...cpp)).toBeGreaterThanOrEqual(15);
    expect(Math.max(...cpp)).toBeLessThanOrEqual(25);
  });
  const s14 = memo(() => scenario([[300, drug('propofol', 2, 'mg/kg')]], 900, { patient: { ageY: 80, weightKg: 70, conditions: [{ id: 'htn' }] } as PatientProfile }));
  it('S14 80 y hypertensive, propofol 2 mg/kg: HR change ≤ +10 (Reich 2005; Miller geriatrics)', async () => {
    const r = await s14();
    const base = mean(win(r, 270, 300), 'map');
    const nadir = minOf(win(r, 360, 660), 'map');
    const dHr = mean(win(r, 420, 480), 'hr') - mean(win(r, 270, 300), 'hr');
    console.log(`S14: MAP ${base.toFixed(0)} → ${nadir.toFixed(0)} (${((nadir / base - 1) * 100).toFixed(1)} %), ΔHR ${dHr.toFixed(0)}`);
    expect(dHr).toBeLessThanOrEqual(10);
  });
  // R45 (Task 18e, D23): −31 % on the prototype; with the humoral arm −22.9 % (the four-patient table's −20 to −22 %; Q1)
  it.fails('S14 the same: MAP −30 to −45 % — measured −22.9 % with the humoral arm (−31 % on the prototype; Q1)', async () => {
    const r = await s14();
    const f = minOf(win(r, 360, 660), 'map') / mean(win(r, 270, 300), 'map') - 1;
    expect(f).toBeLessThanOrEqual(-0.3);
    expect(f).toBeGreaterThanOrEqual(-0.45);
  });
  it('S16 untreated MH under sevoflurane: arrest (VF/asystole) before 60 min, core ≤ 44 °C at the arrest (MHAUS; Miller, MH; Q6)', async () => {
    const r = await scenario([[60, { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 2, n2oFrac: 0 }], [120, { kind: 'condition', id: 'mh', severity: 1 }]], 3720);
    const a = r.find((x) => x.t > 120 && x.pulseless);
    console.log(`S16: arrest ${a ? `${((a.t - 120) / 60).toFixed(1)} min ${a.rhythm} (${a.cause}), core ${a.tempC.toFixed(1)} °C` : 'none'}`);
    expect(a).toBeDefined();
    expect(a?.rhythm === 'vfCoarse' || a?.rhythm === 'asystole').toBe(true);
    expect(a?.tempC).toBeLessThanOrEqual(44);
  });
});

describe('FU-4 clinical scenario suite — resuscitation (Tasks 18a, 18b)', { timeout: 600_000 }, () => {
  // full exsanguination (3 L over 10 min) → PEA; the arrest time is found by the run itself
  async function exsang(cpr: 'none' | 'alone' | 'full', tEnd: number, fluidMl = 2000): Promise<{ rows: Row[]; tArrest?: number; tCpr?: number }> {
    const probe = await scenario([[60, { kind: 'bleed', volumeMl: 3000, overS: 600 }]], 900);
    const tArrest = arrestAt(probe, 60);
    if (cpr === 'none' || tArrest === undefined) return { rows: probe, tArrest };
    const tCpr = Math.max(tArrest + 60, 720); // FULL exsanguination: the 3 L are out at 660 s (18b: CPR into a still-bleeding patient restores a pulse)
    const steps: Step[] = [[60, { kind: 'bleed', volumeMl: 3000, overS: 600 }], [tCpr, { kind: 'cpr', active: true, rate: 110, quality: 0.8 }]];
    if (cpr === 'full') steps.push([tCpr, { kind: 'fluid', fluid: 'balanced', volumeMl: fluidMl, overS: 300 }], [tCpr, drug('epinephrine', 1, 'mg')]);
    return { rows: await scenario(steps, tEnd), tArrest, tCpr };
  }
  // FU-4 gate finding G-FU4-1 (orchestrator ruling, final): the humoral arm's effect is withdrawn in the declared
  // arrest (model.ts) — before that, the unsuppressed humoral venous term let CPR alone restore a pulse at +175 s.
  // Flipped to `it` (was `it.fails`, pulse at +175 s); measured after the fix: no pulse, CoPP 2.9–3.5.
  it('CPR alone after full exsanguination (3 L): no pulse in 10 min of standard-quality CPR (an empty heart cannot be pumped; ruling 3) — was a pulse at +175 s before G-FU4-1', async () => {
    const { rows, tArrest, tCpr } = await exsang('alone', 1800);
    const w = win(rows, (tCpr as number) + 5, (tCpr as number) + 600);
    console.log(`CPR alone: arrest ${tArrest} s, CPR from ${tCpr} s; pulse regained ${w.find((x) => !x.pulseless)?.t ?? 'never'}; CoPP ${minOf(w, 'cpp').toFixed(1)}–${Math.max(...w.map((x) => x.cpp)).toFixed(1)}`);
    expect(tArrest).toBeDefined();
    expect(w.every((x) => x.pulseless)).toBe(true);
  });
  // E-FU4-19 (orchestrator ruling G-FU4-1 final, 2026-09-29): this was the executor's own measured expectation from
  // ruling 3, not a sourced band; with the humoral effect withdrawn in the arrest, 2 L no longer refills a COMPLETE 3 L
  // bleed-out. Kept as a record with its number; the sourced ROSC-with-volume assertion is circ-lowflow-arrest's class IV
  // rig (2 L + adrenaline 60 s after the arrest: pulse at +119 s). The volume threshold is measured below (Ali: A-new).
  it.fails('CPR + 2 L + adrenaline 1 mg after full exsanguination: a pulse within 4 min of the first compression — measured none in 10 min after G-FU4-1 (was +105 s)', async () => {
    const { rows, tCpr } = await exsang('full', 1800);
    const back = win(rows, tCpr as number, (tCpr as number) + 600).find((x) => !x.pulseless);
    console.log(`CPR + 2 L + adrenaline: pulse at +${back ? back.t - (tCpr as number) : '–'} s`);
    expect(back).toBeDefined();
    expect((back as Row).t - (tCpr as number)).toBeLessThanOrEqual(240);
  });
  // A MEASUREMENT, not a band (orchestrator ruling G-FU4-1 final): the volume at which a complete 3 L bleed-out regains a
  // pulse under CPR + adrenaline 1 mg, the volume given over 300 s from the first compression — for Ali's question A-new.
  it('measurement: after a complete 3 L bleed-out, CPR + adrenaline + 2 / 2.5 / 3 / 3.5 L over 300 s — time to a pulse per volume (recorded, no band; Ali A-new)', async () => {
    const out: string[] = [];
    for (const ml of [2000, 2500, 3000, 3500]) {
      const { rows, tCpr } = await exsang('full', 1800, ml);
      const back = win(rows, tCpr as number, (tCpr as number) + 600).find((x) => !x.pulseless);
      out.push(`${ml / 1000} L: ${back ? `pulse at +${back.t - (tCpr as number)} s` : 'no pulse in 10 min'}`);
      expect(tCpr).toBeDefined();
    }
    console.log(`exsanguination volume threshold: ${out.join('; ')}`);
  });
  // R45 (Task 18a's residual): 0.56 at 70 s, but the flow share recovered as CoPP settled above 25 — max 0.91 (end 0.87).
  // FU-8 (E-FU8-9): flipped by the outflow limiter (A19): max 0.89
  it('10 min of VF with standard-quality CPR alone: the myocardium stays ischaemic, flow share kIsch < 0.9 throughout (Weisfeldt & Becker 2002; measured max 0.89 after FU-8 A19, 0.91 before)', async () => {
    const eng = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: { abp: 'connected' } } });
    eng.dispatch({ id: `cs${++n}`, issuedBy: 'test', type: 'setRhythm', rhythm: 'vfCoarse', atTick: 60 * 50 } as unknown as Command);
    eng.dispatch({ id: `cs${++n}`, issuedBy: 'test', type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 0.8 }, atTick: 120 * 50 } as unknown as Command);
    const k: number[] = [];
    for (let t = 125; t <= 720; t += 5) {
      eng.advanceTo(t);
      k.push((eng as unknown as { st: St }).st.hemo.circ.ext.kIsch);
      if (t % 60 === 0) await new Promise((res) => setImmediate(res));
    }
    console.log(`VF + CPR 10 min: kIsch max ${Math.max(...k).toFixed(2)}, end ${k.at(-1)?.toFixed(2)}`);
    expect(Math.max(...k)).toBeLessThan(0.9);
  });
});

describe('FU-4 clinical scenario suite — MANUAL (review F16, ruling 6)', { timeout: 600_000 }, () => {
  it('MANUAL class III haemorrhage + propofol 2 mg/kg: no engine arrest in 5 min, MAP nadir < 50 (Task 18e)', async () => {
    const r = await scenario([BLEED15, [960, drug('propofol', 2, 'mg/kg')]], 1260, { mode: 'manual' });
    console.log(`MANUAL class III + propofol: MAP nadir ${minOf(win(r, 960, 1260), 'map').toFixed(1)}; arrest ${arrestAt(r, 960) ?? 'none'}`);
    expect(arrestAt(r, 960)).toBeUndefined();
    expect(minOf(win(r, 960, 1260), 'map')).toBeLessThan(50);
  });
  it('MANUAL tamponade + propofol 1 + 1 mg/kg: no engine arrest, MAP ≥ 35 (D6: the instructor holds the picture; audit L-B6)', async () => {
    const r = await scenario([[60, TAMP], [660, drug('propofol', 1, 'mg/kg')], [960, drug('propofol', 1, 'mg/kg')]], 1560, { mode: 'manual' });
    console.log(`MANUAL tamponade + propofol: MAP min ${minOf(win(r, 660, 1560), 'map').toFixed(1)}; arrest ${arrestAt(r, 60) ?? 'none'}`);
    expect(arrestAt(r, 60)).toBeUndefined();
    expect(minOf(win(r, 660, 1560), 'map')).toBeGreaterThanOrEqual(35);
  });
  // R45 (ruling 6, item 21, Q-FU3-4a): the MANUAL tracker's floor — an instructor cannot dial a peri-arrest pressure
  it.fails('MANUAL target 18/10 mmHg: the displayed arterial pressure reaches the target (≤ 25/15) — the tracker floors it (monitor audit T4: 65/30; Q9)', async () => {
    const r = await scenario([], 240, { mode: 'manual', commands: [[60, { type: 'setTarget', variable: 'sbp', value: 18 }], [60, { type: 'setTarget', variable: 'dbp', value: 10 }]] });
    const w = win(r, 180, 240);
    console.log(`MANUAL 18/10: displayed ${w.at(-1)?.shownSys?.toFixed(0)}/${w.at(-1)?.shownDia?.toFixed(0)}, MAP ${mean(w, 'map').toFixed(1)}`);
    expect(w.at(-1)?.shownSys as number).toBeLessThanOrEqual(25);
    expect(w.at(-1)?.shownDia as number).toBeLessThanOrEqual(15);
  });
});
