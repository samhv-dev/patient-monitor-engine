// FU-7 Task 7 (R51 addendum 20, D7; research/14 DI-89, DI-71, DI-03; review F9, F11): the apnoea flag has ONE truth —
// the MODELED chemoreflex's own committed zero rate (FU-6's relative threshold) — and the drug layer's ventilatory
// depression reaches that chemoreflex. Engine rig: adult 40 y / 70 kg (FU-6's ADULT6), no airway device, spontaneous,
// FiO2 as each case states; sampled every simulated second; one yield per sim-MINUTE (CI amendment 4). SLOW_B.
// Apnoea = spontaneous VE < 1 L/min (the audit's `apnoeic`), or the committed rate 0 where the case says so.
import { describe, expect, it } from 'vitest';
import type { MonitorEngine } from '../../src/types.ts';
import { rig6, runTo, send, st6 } from '../helpers/fu6.ts';

const T = 300; // the audit's intervention time
const drug = (drugId: string, dose: number, unit: string) => ({ kind: 'drug', drugId, dose, unit, route: 'iv' });

interface Sample { t: number; flag: boolean; rr: number; ve: number; spo2: number }
function sample(e: MonitorEngine, t: number): Sample {
  const s = st6(e);
  return { t, flag: s.neuro?.resp?.apnoea === true, rr: s.resp.spont?.rr ?? Number.NaN, ve: s.resp.spont?.ve ?? Number.NaN, spo2: s.resp.num?.spo2?.shown ?? Number.NaN };
}

/** A spontaneous rig (no airway device) with `events` given at T, sampled every second from T to `tEnd`. */
async function spontRig(events: Record<string, unknown>[], tEnd: number, o: { fio2?: number; seed?: number; later?: [number, Record<string, unknown>][] } = {}) {
  const e = rig6(undefined, 'modeled', o.seed ?? 7);
  await runTo(e, 1);
  if (o.fio2 !== undefined) send(e, { kind: 'ventilation', source: 'spontaneous', fio2: o.fio2 });
  await runTo(e, T - 5);
  const ve0 = st6(e).resp.spont?.ve as number;
  await runTo(e, T);
  for (const ev of events) send(e, ev);
  const rows: Sample[] = [];
  const later = [...(o.later ?? [])];
  await runTo(e, tEnd, (u) => {
    while (later.length && later[0]![0] <= u) send(e, later.shift()![1]);
    rows.push(sample(e, u));
  }, 1);
  return { rows, ve0 };
}
const apnoeaS = (rows: Sample[]) => rows.filter((r) => r.ve < 1).length;
const minSpo2 = (rows: Sample[]) => Math.min(...rows.map((r) => r.spo2).filter(Number.isFinite));
const minVe = (rows: Sample[]) => Math.min(...rows.map((r) => r.ve).filter(Number.isFinite));

/** FU-6's induction rig (resp-induction.test.ts): SGA, room air, the agent at 300 s, seconds at committed rate 0. */
async function induce(agent: Record<string, unknown>, seed = 7): Promise<number> {
  const e = rig6(undefined, 'modeled', seed);
  await runTo(e, 1);
  send(e, { kind: 'airwayDevice', device: 'sga' });
  await runTo(e, 299);
  send(e, agent);
  let s = 0;
  await runTo(e, 900, () => { if ((st6(e).resp.spont?.rr ?? -1) === 0) s += 1; }, 1);
  return s;
}

describe('FU-7 D7: the apnoea flag is the chemoreflex\'s own state; the drug layer reaches the drive', { timeout: 1_800_000 }, () => {
  // FU-8 B4 (E-FU8B-8): after the tonic share the apnoea in this rig ends at 540 s and the flag clears at 541 s — one sample
  // where the committed rate (4.1/min, VE 0.11) leads the flag by a second (an edge offset of FU-7's flag, not new breathing)
  it.fails('the apnoea flag never contradicts the breathing (DI-89): propofol 2 mg/kg + remifentanil 1 µg/kg, FiO2 0.5, 20 min — 0 s of flag-while-breathing — measured 1 s after FU-8 B4 (t 540: first breath, flag clears at 541; 0 before; 180 s on the merged main, 255 s on main 3ff2fb0)', async () => {
    const { rows } = await spontRig([drug('propofol', 2, 'mg/kg'), drug('remifentanil', 1, 'mcg/kg')], T + 1200, { fio2: 0.5 });
    const bad = rows.filter((r) => r.flag && !(r.rr === 0 && r.ve < 0.5));
    console.log(`FU-7 DI-89: flag ${rows.filter((r) => r.flag).length} s, flag-while-breathing ${bad.length} s, VE<1 ${apnoeaS(rows)} s`);
    expect(rows.some((r) => r.flag)).toBe(true);
    expect(bad.length).toBe(0);
  });

  // R45 (Task 7 Step 5, named in advance): fentanyl 5 µg/kg still breathes on the merged tree. The weight is NOT changed —
  // FENT_VENT_REMI_EQ 0.55 (D16/D-7f-3, FU-6-calibrated) and FU-6's APNOEA_VE_IN 0.1 × ve0 are the two constants.
  it.fails('fentanyl 5 µg/kg on room air stops breathing (DI-71): VE < 1 L/min for ≥ 60 s within 5 min, SpO2 nadir < 90 % — measured 0 s (VE nadir 2.28 L/min, −65 % of 6.44), SpO2 86; FENT_VENT_REMI_EQ 0.55, APNOEA_VE_IN 0.1', async () => {
    const { rows } = await spontRig([drug('fentanyl', 5, 'mcg/kg')], T + 300);
    console.log(`FU-7 DI-71 fentanyl 5 µg/kg: apnoea ${apnoeaS(rows)} s in 5 min, SpO2 nadir ${minSpo2(rows)}, VE nadir ${minVe(rows).toFixed(2)} L/min`);
    expect(apnoeaS(rows)).toBeGreaterThanOrEqual(60);
    expect(minSpo2(rows)).toBeLessThan(90);
  });

  // R45: the case's premise (an apnoea to reverse) is the previous case's miss — VE never fell below 40 % of baseline.
  it.fails('naloxone 0.4 mg restores breathing (DI-71): VE back to ≥ 40 % of the pre-drug VE within 30–180 s — measured +1 s: VE never fell below 40 % (nadir 2.27 of 6.45 L/min), no apnoea to reverse', async () => {
    const { rows, ve0 } = await spontRig([drug('fentanyl', 5, 'mcg/kg')], T + 900, { later: [[T + 300, drug('naloxone', 0.4, 'mg')]] });
    const after = rows.filter((r) => r.t > T + 300);
    const back = after.find((r) => r.ve >= 0.4 * ve0);
    const s = back ? back.t - (T + 300) : Number.NaN;
    console.log(`FU-7 DI-71 naloxone: VE ≥ 40 % of ${ve0.toFixed(2)} L/min at +${s} s; apnoea before naloxone ${apnoeaS(rows.filter((r) => r.t <= T + 300))} s, VE nadir before it ${minVe(rows.filter((r) => r.t <= T + 300)).toFixed(2)} L/min`);
    expect(s).toBeGreaterThanOrEqual(30);
    expect(s).toBeLessThanOrEqual(180);
  });

  // R45: VENT_ALPHA_BENZO 1.5 (D15, Bailey fit on the pre-FU-6 drive: 77 %) overshoots on FU-6's drive — deeper
  // hypoxaemia WITHOUT apnoea (VE −79.6 %; audit DI-03). Not re-fitted (D15 is not revisited); gate note §9 / Ali.
  it.fails('the Bailey pair (DI-03): fentanyl 2 µg/kg + midazolam 0.05 mg/kg on room air — SpO2 nadir 70–89 % on seed 7; the singles ≥ 93 % — measured pair 46 %, fentanyl 94 %, midazolam 95 %', async () => {
    const pair = await spontRig([drug('fentanyl', 2, 'mcg/kg'), drug('midazolam', 0.05, 'mg/kg')], T + 1200);
    const f = await spontRig([drug('fentanyl', 2, 'mcg/kg')], T + 1200);
    const z = await spontRig([drug('midazolam', 0.05, 'mg/kg')], T + 1200);
    console.log(`FU-7 DI-03 seed 7: SpO2 nadir pair ${minSpo2(pair.rows)} / fentanyl ${minSpo2(f.rows)} / midazolam ${minSpo2(z.rows)}; pair apnoea ${apnoeaS(pair.rows)} s`);
    expect(minSpo2(pair.rows)).toBeGreaterThanOrEqual(70);
    expect(minSpo2(pair.rows)).toBeLessThanOrEqual(89);
    expect(minSpo2(f.rows)).toBeGreaterThanOrEqual(93);
    expect(minSpo2(z.rows)).toBeGreaterThanOrEqual(93);
  });

  it.fails('the Bailey pair (DI-03), a POPULATION claim over FU-6\'s seeds 1–20: apnoea (VE < 1 L/min) in ≥ 4 of 20 (Bailey 1990: 6/12) — measured 0 of 20', async () => {
    const n: number[] = [];
    for (let seed = 1; seed <= 20; seed++) n.push(apnoeaS((await spontRig([drug('fentanyl', 2, 'mcg/kg'), drug('midazolam', 0.05, 'mg/kg')], T + 1200, { seed })).rows));
    console.log(`FU-7 DI-03 seeds 1–20 apnoea s: ${n.join(' ')}; apnoeic ${n.filter((x) => x > 0).length}/20`);
    expect(n.filter((x) => x > 0).length).toBeGreaterThanOrEqual(4);
  });

  it('propofol 2 mg/kg alone is briefly apnoeic (seed 7, u 0.737 — FU-6\'s modal patient and rig): 10–90 s, FU-6\'s fit unchanged by FU-7\'s surface', async () => {
    const s = await induce(drug('propofol', 2, 'mg/kg'));
    console.log(`FU-7 guard: propofol 2 mg/kg seed 7 apnoea ${s} s (FU-6 measured 38 s)`);
    expect(s).toBeGreaterThanOrEqual(10);
    expect(s).toBeLessThanOrEqual(90);
  });

  it('etomidate 0.3 mg/kg is less apnoeic than thiopental 4 mg/kg (review F9: ventShare 0.7 vs 1.0; M10 ch. 21 p. 541)', async () => {
    const et = await induce(drug('etomidate', 0.3, 'mg/kg'));
    const th = await induce(drug('thiopental', 4, 'mg/kg'));
    console.log(`FU-7 F9: apnoea etomidate ${et} s vs thiopental ${th} s (seed 7)`);
    expect(et).toBeLessThan(th);
  });

  /** Review F11's rig: ETT + VCV 12 × 600, FiO2 0.5, remifentanil 1 µg/kg at 300 s, sampled every second for 20 min. */
  async function ventilated(): Promise<Sample[]> {
    const e = rig6(undefined, 'modeled', 7);
    await runTo(e, 1);
    send(e, { kind: 'airwayDevice', device: 'ett' });
    send(e, { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 });
    await runTo(e, T);
    send(e, drug('remifentanil', 1, 'mcg/kg'));
    const rows: Sample[] = [];
    await runTo(e, T + 1200, (u) => rows.push(sample(e, u)), 1);
    return rows;
  }
  it('a VENTILATED patient\'s flag is the chemoreflex\'s too (review F11): ETT + VCV 12 × 600, FiO2 0.5, remifentanil 1 µg/kg — 0 s of disagreement, the flag set while the committed rate is 0', async () => {
    const rows = await ventilated();
    const disagree = rows.filter((r) => r.flag !== (r.rr === 0));
    console.log(`FU-7 F11 ventilated: flag ${rows.filter((r) => r.flag).length} s of ${rows.length}, disagreement ${disagree.length} s, max committed rate ${Math.max(...rows.map((r) => r.rr))}`);
    expect(disagree.length).toBe(0);
    expect(rows.some((r) => r.flag && r.rr === 0)).toBe(true);
  });
  // R45: VCV 12 × 600 keeps this 70 kg patient below the apnoeic PaCO2 for the whole window, so effort never returns
  // and the "flag clears when the trigger returns" half cannot be observed on this rig.
  it.fails('… and the flag clears once effort returns (the trigger is visible: rr > 0) — measured: the committed rate stays 0 for all 1200 s (flag 1200 s)', async () => {
    const rows = await ventilated();
    const lastFlag = rows.reduce((a, r, i) => (r.flag ? i : a), -1);
    expect(lastFlag >= 0 && rows.slice(lastFlag + 1).some((r) => r.rr > 0 && !r.flag)).toBe(true);
  });
});
