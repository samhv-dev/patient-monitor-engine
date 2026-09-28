// FU-3 item 16: the MODELED asphyxial sequence — an apnoeic paralysed adult on room air desaturates, becomes
// bradycardic, then arrests (bradycardic PEA, or asystole / VF by the seeded onset draw); oxygenating before the arrest
// reverses the bradycardia; MANUAL is unchanged (the instructor owns the rhythm). Bands (R45 targets):
//   HR < 40 (held 30 s) after SaO2 first < 60 % and before the arrest, within 6 min — the asphyxia models' heart rate peaks at
//     2–6 min after the airway is occluded and falls steadily until the pulsations are lost (DeBehnke 1995, dogs;
//     Varvarousi 2011, swine) [P]; 40/min is the item's threshold.
//   arrest 5–14 min after SaO2 first < 60 % — loss of aortic pulsations 9.3–9.7 ± 1.4 min (swine, Varvarousi 2011)
//     and 11.4 ± 2.4 min (dogs, DeBehnke 1995) after airway occlusion on room air (≈ mean ± 2 SD: 6.5–16 min), less
//     the ≈ 1.5–2 min a room-air apnoea takes to reach SaO2 60 % [P].
//   6–10 min AFTER the arrest (R50 review finding 1, orchestrator ruling 2026-09-27): the arrest is a monitor-visible
//     arrest and stays one — organised beats on the ECG with no mechanical beat (PEA: every beat `mech.perfused`
//     false), no pulse (pulse rate invalid, ABP pulse pressure ≤ 5 mmHg), SaO2 < 20 % and the SpO2 numeric
//     unmeasurable or < 20 %, and the heart rate not rising (the rhythm's rate ≤ its rate at the arrest; the monitor's
//     HR numeric no higher than in the minute before the arrest). A pulseless, unperfused heart does not recover its
//     hypoxic depression, and no blood is ejected to carry re-oxygenated blood to the arteries (E-FU3-9).
//   5–10 min AFTER the arrest (E-FU3-10, orchestrator ruling 2026-09-27 17:55): no spontaneous breathing — agonal
//     gasps last seconds to ≈ 2 min after the circulation stops, then apnoea (Clark 1992; Bobrow 2008) [P]: the RR
//     numeric reads 0 or `--`, alveolar ventilation is 0 and the CO2 trace is flat.
// Multi-sim-minute engine runs: yields once per sim-minute (CI rule), SLOW list.
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type EngineEvent } from '../../src/index.ts';

type Body = Command extends infer C ? (C extends Command ? Omit<C, 'id' | 'issuedBy'> : never) : never;
let n = 0;
const cmd = (c: Body) => ({ id: `ha${++n}`, issuedBy: 'test', ...c }) as Command;
const ev = (event: Record<string, unknown>) => cmd({ type: 'applyEvent', event } as Body);
const ADULT = { weightKg: 70, heightCm: 175, ageY: 40, sex: 'M' as const };
const ARREST_IDS = new Set(['asystole', 'vfCoarse', 'vfFine']);
/** A bradycardia is HR < 40 held for 30 s (the chemoreflex's sign change at SaO2 60 % dips the rate below 40 for a
 * few seconds while the baroreflex catches up; that transient is not the hypoxic bradycardia). */
const BRADY_HOLD_S = 30;
/** The post-arrest window (s after the arrest) the R50 review asked to be tested: 6–10 min. */
const WIN = [360, 600] as const;
/** The post-arrest breathing window of the E-FU3-10 ruling: 5–10 min. */
const RESP_WIN = [300, 600] as const;
/** CO2 waveform rate (l2/co2/capno.ts CO2_RATE). */
const CO2_HZ = 62.5;
type Rhythm = { id: string; opts: { pulseless?: boolean } };
const rhythmOf = (e: ReturnType<typeof createEngine>) => (e as unknown as { st: { rhythm: Rhythm } }).st.rhythm;
const vaOf = (e: ReturnType<typeof createEngine>) => (e as unknown as { st: { resp: { vaLpm?: number } } }).st.resp.vaLpm ?? 0;
const arrested = (r: Rhythm) => r.opts.pulseless === true || ARREST_IDS.has(r.id);

/** Monitor-visible samples, one per second, in the post-arrest window (and the monitor HR before the arrest). */
interface Window {
  rate: number[]; // the rhythm's rate (state `hr`)
  hrMon: number[]; // the monitor's HR numeric (measurement `hr`)
  sat: number[]; // SaO2 truth (state `spo2`)
  spo2Shown: Array<number | null>; // the SpO2 numeric (null = unmeasurable)
  pr: Array<number | null>; // the pulse-rate numeric (null = no pulse detected)
  abpPp: number[]; // ABP trace max − min over 5 s, every 30 s
  beats: number; // ECG beats in the window
  perfused: number; // of which mechanically perfused
}
/** Breathing samples in the E-FU3-10 window (only with the capnograph on). */
interface RespWindow {
  rr: Array<number | null>; // the RR numeric, one per second (null = `--`)
  va: number[]; // alveolar ventilation truth (L/min), one per second
  co2Range: number[]; // CO2 trace max − min over 30 s, every 30 s (mmHg)
}
interface Course {
  tSat60?: number; tBrady?: number; tArrest?: number; arrestRhythm?: string; hrAfter: Array<[number, number]>; tVent?: number;
  rateAtArrest?: number; hrMonBefore: number[]; win: Window; resp: RespWindow;
}

/** Paralysed (rocuronium 0.6 mg/kg), never ventilated, room air; optionally oxygenated (FiO2 1) once HR < 40 has held 30 s. */
async function asphyxia(mode: 'modeled' | 'manual', ventAtBrady: boolean, endS: number, abp = false, co2 = false): Promise<Course> {
  const sensors = { ...(abp ? { abp: 'connected' } : {}), ...(co2 ? { co2: 'on' } : {}) };
  const e = createEngine({ seed: 16, mode, patient: abp || co2 ? { ...ADULT, sensors } : ADULT });
  const c: Course = {
    hrAfter: [], hrMonBefore: [], win: { rate: [], hrMon: [], sat: [], spo2Shown: [], pr: [], abpPp: [], beats: 0, perfused: 0 },
    resp: { rr: [], va: [], co2Range: [] },
  };
  let spo2 = 100;
  let hr = 75;
  let hrMon: number | null = null;
  let spo2Shown: number | null = null;
  let pr: number | null = null;
  let rr: number | null = null;
  let below = -1; // start of the current run of HR < 40
  const after = (t: number, w: readonly [number, number]) => c.tArrest !== undefined && t - c.tArrest >= w[0] && t - c.tArrest <= w[1];
  const inWin = (t: number) => after(t, WIN);
  e.on((x: EngineEvent) => {
    if (x.type === 'beat') {
      if (inWin(x.t)) {
        c.win.beats++;
        if (x.mech.perfused) c.win.perfused++;
      }
      return;
    }
    if (x.type === 'measurement') {
      if (x.values.hr) hrMon = x.values.hr.value;
      if (x.values.spo2) spo2Shown = x.values.spo2.value;
      if (x.values.pr) pr = x.values.pr.value;
      if (x.values.rr) rr = x.values.rr.value;
      return;
    }
    if (x.type !== 'state') return;
    spo2 = x.values.spo2 ?? spo2;
    hr = x.values.hr ?? hr;
    if (c.tSat60 === undefined && spo2 < 60) c.tSat60 = x.t;
    below = hr < 40 ? (below < 0 ? x.t : below) : -1;
    if (c.tSat60 !== undefined && c.tBrady === undefined && below >= 0 && x.t - below >= BRADY_HOLD_S) c.tBrady = below;
    if (c.tVent !== undefined) c.hrAfter.push([x.t, hr]);
  }, ['state', 'measurement', 'beat']);
  e.dispatch(ev({ kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg', route: 'iv' }));
  for (let t = 1; t <= endS; t++) {
    e.advanceTo(t);
    const r = rhythmOf(e);
    if (c.tArrest === undefined && arrested(r)) {
      c.tArrest = t;
      c.arrestRhythm = r.opts.pulseless ? `PEA (${r.id})` : r.id;
      c.rateAtArrest = hr;
    }
    if (c.tArrest === undefined && hrMon !== null) c.hrMonBefore = [...c.hrMonBefore.slice(-59), hrMon]; // the minute before
    if (inWin(t)) {
      c.win.rate.push(hr);
      if (hrMon !== null) c.win.hrMon.push(hrMon);
      c.win.sat.push(spo2);
      c.win.spo2Shown.push(spo2Shown);
      c.win.pr.push(pr);
      if (abp && t % 30 === 0) {
        const w = new Float32Array(5 * 125);
        e.readSamples('abp', (t - 5) * 125, w);
        c.win.abpPp.push(Math.max(...w) - Math.min(...w));
      }
    }
    if (co2 && after(t, RESP_WIN)) {
      c.resp.rr.push(rr);
      c.resp.va.push(vaOf(e));
      if (t % 30 === 0) {
        const w = new Float32Array(30 * CO2_HZ);
        e.readSamples('co2', Math.round((t - 30) * CO2_HZ), w);
        c.resp.co2Range.push(Math.max(...w) - Math.min(...w));
      }
    }
    if (ventAtBrady && c.tBrady !== undefined && c.tVent === undefined) {
      c.tVent = t;
      e.dispatch(ev({ kind: 'ventilation', source: 'ventilator', rr: 14, vtMl: 500, fio2: 1, peep: 5 }));
    }
    if (t % 60 === 0) await new Promise((r2) => setImmediate(r2));
  }
  return c;
}

const max = (xs: readonly number[]) => Math.max(...xs);
const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
/** The FiO2 1 reversal run, shared by the reversal test and its final-HR `it.fails` (seeded, deterministic). */
let reversalRun: Promise<Course> | undefined;
const reversalCourse = (): Promise<Course> => (reversalRun ??= asphyxia('modeled', true, 15 * 60));

describe('FU-3 item 16: MODELED hypoxaemic bradycardia and asphyxial arrest', { timeout: 300_000 }, () => {
  it('apnoeic paralysed adult on room air: HR < 40 within 6 min of SaO2 < 60 %, then PEA/asystole/VF 5–14 min after it; 6–10 min later still pulseless, SaO2 < 20 %, HR not rising — measured SaO2 0.29 %, PP 0.11 mmHg, rate 30, monitor HR 58/57.6 vs 58/57.7', async () => {
    const c = await asphyxia('modeled', false, 20 * 60, true);
    const sat = c.tSat60 ?? Number.NaN;
    const w = c.win;
    console.log(`asphyxia: SaO2 < 60 % at ${(sat / 60).toFixed(2)} min; HR < 40 at +${(((c.tBrady ?? Number.NaN) - sat) / 60).toFixed(2)} min; arrest (${c.arrestRhythm ?? 'none'}) at +${(((c.tArrest ?? Number.NaN) - sat) / 60).toFixed(2)} min`);
    console.log(`post-arrest 6–10 min: rate max ${max(w.rate).toFixed(1)} (at arrest ${c.rateAtArrest?.toFixed(1)}); monitor HR max ${max(w.hrMon)} mean ${mean(w.hrMon).toFixed(1)} (minute before: max ${max(c.hrMonBefore)} mean ${mean(c.hrMonBefore).toFixed(1)}); SaO2 max ${max(w.sat).toFixed(2)} %; SpO2 shown ${JSON.stringify([...new Set(w.spo2Shown)])}; pr ${JSON.stringify([...new Set(w.pr)])}; ABP PP max ${max(w.abpPp).toFixed(2)} mmHg; beats ${w.beats} (perfused ${w.perfused})`);
    expect(c.tSat60).toBeDefined();
    expect(c.tBrady).toBeDefined();
    expect(((c.tBrady as number) - sat) / 60).toBeLessThanOrEqual(6);
    expect(c.tArrest).toBeDefined();
    expect(c.tBrady as number).toBeLessThan(c.tArrest as number); // bradycardia precedes the arrest
    expect(((c.tArrest as number) - sat) / 60).toBeGreaterThanOrEqual(5);
    expect(((c.tArrest as number) - sat) / 60).toBeLessThanOrEqual(14);
    // 6–10 min after the arrest (R50 finding 1): a monitor-visible arrest that does not undo itself
    expect(w.sat.length).toBe(WIN[1] - WIN[0] + 1); // the run covers the whole window
    expect(max(w.sat)).toBeLessThan(20); // SaO2 truth: no re-saturation without an ejected pulse (measured 0.33 %)
    expect(w.spo2Shown.every((v) => v === null || v < 20)).toBe(true); // SpO2 unmeasurable (measured: null throughout)
    expect(max(w.rate)).toBeLessThanOrEqual((c.rateAtArrest as number) + 0.5); // the rhythm's rate does not rise (30 → 30)
    expect(mean(w.hrMon)).toBeLessThanOrEqual(mean(c.hrMonBefore) + 1); // the monitor HR does not rise (57.6 vs 57.7); 1 bpm tolerance (G-FU3 ruling 1)
    expect(max(w.hrMon)).toBeLessThanOrEqual(max(c.hrMonBefore) + 2); // (max 58 vs 58)
    expect(w.pr.every((v) => v === null)).toBe(true); // no pulse detected
    expect(w.abpPp.length).toBeGreaterThan(0);
    expect(max(w.abpPp)).toBeLessThanOrEqual(5); // no arterial pulse (measured ≤ 0.33 mmHg: a flat ≈ 15 mmHg trace)
    if (c.arrestRhythm?.startsWith('PEA')) {
      expect(w.beats).toBeGreaterThan(0); // organised electrical activity on the ECG (measured 207 beats) …
      expect(w.perfused).toBe(0); // … with no mechanical beat (7a's kRhythm 0 path)
    }
  });
  // FU-4 Task 13 (G-FU3 ruling 1): the MONITOR must show the hypoxic bradycardia before the arrest. Measured: the monitor
  // reads 58 while the sinus state is 30, because the 40/min junctional backup and the sinus beats ADD (Task 13a's
  // escape-reset test: sinus 30 → 60 QRS/min). Task 13b (escape foci × the sinus-node factor) makes the monitor read 29,
  // but then this rig does not arrest inside its 20 min (kIsch stays 1.00: the extra escape beats were what made the
  // hypoxic heart ischaemic — lowFlow PEA at ≈ 480 s without 13b), so 13b is NOT landed (ruling 5's checkbox) and this
  // stays it.fails with the number (R45; question to the orchestrator).
  it.fails('the monitor shows the bradycardia before the arrest: monitor HR < 45 in the minute before — measured min 58 (Task 13b not landed)', async () => {
    const c = await asphyxia('modeled', false, 20 * 60, true);
    expect(Math.min(...c.hrMonBefore)).toBeLessThan(45);
  });
  it('E-FU3-10: 5–10 min after the arrest the brainstem is unperfused — no spontaneous breathing: RR numeric 0 or --, VA 0, flat CO2 trace — measured RR numeric 0, VA 0.000 L/min, CO2 range 0.00 mmHg (without the gate: RR 43–48 and VA up to 59.7 L/min in this window)', async () => {
    const c = await asphyxia('modeled', false, 20 * 60, false, true);
    const sat = c.tSat60 ?? Number.NaN;
    const r = c.resp;
    console.log(`E-FU3-10: arrest (${c.arrestRhythm ?? 'none'}) at +${(((c.tArrest ?? Number.NaN) - sat) / 60).toFixed(2)} min after SaO2 < 60 % (${(sat / 60).toFixed(2)} min); 5–10 min after it: RR numeric ${JSON.stringify([...new Set(r.rr)])}; VA max ${max(r.va).toFixed(3)} L/min; CO2 trace range max ${max(r.co2Range).toFixed(2)} mmHg`);
    expect(c.tArrest).toBeDefined();
    expect(((c.tArrest as number) - sat) / 60).toBeGreaterThanOrEqual(5); // the capnograph does not move the onsets
    expect(((c.tArrest as number) - sat) / 60).toBeLessThanOrEqual(14);
    expect(r.va.length).toBe(RESP_WIN[1] - RESP_WIN[0] + 1); // the run covers the whole window
    expect(r.rr.every((v) => v === null || v === 0)).toBe(true); // RR numeric 0 or `--`
    expect(max(r.va)).toBeLessThanOrEqual(0.01); // apnoea: no alveolar ventilation
    expect(r.co2Range.length).toBeGreaterThan(0);
    expect(max(r.co2Range)).toBeLessThan(1); // no breath on the CO2 trace
  });
  it('oxygenating once HR < 40 has held 30 s (before the arrest) reverses the bradycardia: HR ≥ 60 no sooner than the 5 s lung-to-ear circulation delay (DELAY_EAR_S) and within 3 min, no arrest, HR ≥ 60 at the end — measured 0.12 min (7.0 s)', async () => {
    const c = await reversalCourse();
    const tv = c.tVent ?? Number.NaN;
    const back = c.hrAfter.find(([t, h]) => t > tv && h >= 60)?.[0];
    console.log(`reversal: ventilated FiO2 1 at ${(tv / 60).toFixed(2)} min; HR ≥ 60 after ${(((back ?? Number.NaN) - tv) / 60).toFixed(2)} min (${((back ?? Number.NaN) - tv).toFixed(1)} s); arrest ${c.arrestRhythm ?? 'none'}; HR at the end ${c.hrAfter.at(-1)?.[1].toFixed(0)}`);
    expect(c.tVent).toBeDefined();
    expect(back).toBeDefined();
    // floor: re-oxygenated blood reaches the carotid body and the coronary bed no sooner than the lung-to-ear
    // circulation time (≈ 5 s at a normal output: research/03 §"Circulatory delay", the engine's DELAY_EAR_S)
    expect((back as number) - tv).toBeGreaterThanOrEqual(5);
    expect(((back as number) - tv) / 60).toBeLessThanOrEqual(3);
    expect(c.tArrest).toBeUndefined();
    expect(c.hrAfter.at(-1)?.[1] ?? 0).toBeGreaterThanOrEqual(60);
  });
  // R45 (executor, FU-3 Task 15, after merging Stage 7e): the [ENG] "no runaway rebound" bound was met before 7e
  // (final HR 126) and missed on main + 7e (132.1). FU-4 (Tasks 4–6): met again — 74.4. The criterion is unchanged;
  // it is kept apart so the reversal time, the no-arrest and the HR ≥ 60 assertions above stay enforced (R-5).
  it('after the FiO2 1 reversal the final HR is ≤ 130 [ENG] — was 132.1 on main + 7e, 74.4 with FU-4', async () => {
    const c = await reversalCourse();
    console.log(`reversal: HR at the end ${c.hrAfter.at(-1)?.[1].toFixed(1)}`);
    expect(c.hrAfter.at(-1)?.[1] ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(130); // [ENG] sanity: no runaway rebound
  });
  it('MANUAL: the same apnoea never switches the rhythm (the instructor owns it)', async () => {
    const c = await asphyxia('manual', false, 15 * 60);
    console.log(`MANUAL: SaO2 < 60 % at ${((c.tSat60 ?? Number.NaN) / 60).toFixed(2)} min; HR < 40 ${c.tBrady ?? 'never'}; arrest ${c.arrestRhythm ?? 'none'}`);
    expect(c.tSat60).toBeDefined();
    expect(c.tBrady).toBeUndefined();
    expect(c.tArrest).toBeUndefined();
  });
});
