// FU-6 Task 18: the respiratory scenario suite (research/09-respiratory-integration-audit.md §6, RS1–RS15). MODELED, adult
// 40 y 70 kg unless stated, the GA state derived (no thermal event). One RS-ROW line per row → the gate note's table.
// Bands are the audit's §6 proposals (Ali's §7 questions decide them); R45: a missed band is it.fails with its number.
import { describe, expect, it } from 'vitest';
import type { PatientProfile } from '../../src/types.ts';
import { cardiacOutput } from '../../src/l2/gas/coupling.ts';
import { capnoAngles, mean, numSeries, read62 } from '../helpers/resp.ts';
import { VCV_PMAX_DEFAULT } from '../../src/l2/resp/driver.ts'; // FU-6 F2: the default-Pmax LIMIT rows (RS7c, RS11b)
import { ADULT6, fineWindow, rig6, runTo, send, st6, ventRig } from '../helpers/fu6.ts';

const row = (id: string, v: Record<string, number | string>) => console.log(`RS-ROW ${id} ${JSON.stringify(v)}`);
const WOMAN: PatientProfile = { ageY: 40, sex: 'F', weightKg: 60, heightCm: 165 };
const ETT = { kind: 'airwayDevice', device: 'ett' };
const vent = (o: Record<string, number> = {}) => ({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5, ...o });
const roc = (mgkg = 1.2) => ({ kind: 'drug', drugId: 'rocuronium', dose: mgkg, unit: 'mg/kg', route: 'iv' });
const prop = (mgkg: number) => ({ kind: 'drug', drugId: 'propofol', dose: mgkg, unit: 'mg/kg', route: 'iv' });

async function apnoea90(p: PatientProfile): Promise<number> {
  const e = rig6(p);
  await runTo(e, 60);
  send(e, { kind: 'preoxygenate', fio2: 1, durationS: 180 });
  await runTo(e, 240);
  send(e, prop(2));
  send(e, roc(0.6));
  send(e, { kind: 'ventilation', source: 'none' });
  let t90 = Infinity;
  await runTo(e, 1140, (t) => { if (t90 === Infinity && st6(e).resp.o2.sa < 0.9) t90 = t; }, 1);
  return (t90 - 240) / 60;
}

describe('FU-6 respiratory suite (RS1–RS15)', { timeout: 1_800_000 }, () => {
  // R45 (merged main): VD/VT is now met (FU-4's ONE physical dead space) but both patients are HYPOcapnic — FU-4's R1 root
  // plus FU-6 R4's anaesthetised VCO2 (−15 %) on a 7 mL/kg × 12 VCV. Calibration row (GA_METABOLIC via gaLvl; the default
  // ventilator setting), owner FU-6/FU-4 with Ali (§7 question 1).
  it.fails('RS1 healthy intubated, VCV 12 × 7 mL/kg IBW, man and woman: PaCO2 35–42 at 30 min, VD/VT 0.25–0.4 — measured PaCO2 32.2 / 33.7, VD/VT 0.26 / 0.28 (FU-6 R4 + FU-4 R1; was 50.0 / 0.54 on 94040f7)', async () => {
    const got: Array<{ pa: number; vdvt: number }> = [];
    for (const [p, vt] of [[ADULT6, 490], [WOMAN, 400]] as Array<[PatientProfile, number]>) {
      const e = rig6(p);
      await runTo(e, 1);
      send(e, ETT);
      send(e, vent({ vtMl: vt }));
      send(e, prop(2));
      send(e, { kind: 'infusion', drugId: 'propofol', rate: 100, unit: 'mcg/kg/min' });
      send(e, roc());
      await runTo(e, 1800);
      const rs = st6(e).resp;
      const vdvt = 1 - (rs.vaLpm * 1000) / (12 * vt);
      row('RS1', { sex: p.sex ?? 'M', vt, paco2: +rs.co2.pf.toFixed(1), vdvt: +vdvt.toFixed(2), etco2: +rs.etco2.toFixed(1) });
      got.push({ pa: rs.co2.pf as number, vdvt });
    }
    // FU-6 executor: both patients are measured before the bands are asserted (the RS-ROW lines carry both)
    for (const g of got) {
      expect(g.pa).toBeGreaterThanOrEqual(35);
      expect(g.pa).toBeLessThanOrEqual(42);
      expect(g.vdvt).toBeGreaterThanOrEqual(0.25);
      expect(g.vdvt).toBeLessThanOrEqual(0.4);
    }
  });
  it('RS2 preoxygenated apnoea to SaO2 90 %: adult 6.5–9.5, obese 2–3.5 (measured 7.95 / 2.77 with FU-8’s body-size rule; 2.87 before the FU-8 merge)', async () => {
    const a = await apnoea90(ADULT6);
    const o = await apnoea90({ ...ADULT6, weightKg: 127 });
    row('RS2', { adult: +a.toFixed(2), obese: +o.toFixed(2) });
    expect(a).toBeGreaterThanOrEqual(6.5);
    expect(a).toBeLessThanOrEqual(9.5);
    expect(o).toBeGreaterThanOrEqual(2);
    expect(o).toBeLessThanOrEqual(3.5);
  });
  it.fails('RS2 pregnancy 2.5–4.5 (measured 4.82) and child 4 y 2–3.2 (measured 3.38) (FU-6 R10 / R4; 7j, FU-4 R1 owners)', async () => {
    const p = await apnoea90({ ageY: 30, sex: 'F', weightKg: 70, heightCm: 165, lungConditions: [{ id: 'pregnancy', severity: 1 }] });
    const c = await apnoea90({ ageY: 4, sex: 'M', weightKg: 16, heightCm: 102 });
    row('RS2b', { pregnancy: +p.toFixed(2), child: +c.toFixed(2) });
    expect(p).toBeLessThanOrEqual(4.5);
    expect(c).toBeLessThanOrEqual(3.2);
  });
  it('RS3 propofol 2 mg/kg, natural airway, air: RR ≤ 30, VT < 100 (or apnoea) within 60 s, SaO2 < 90 within 2 min (measured 22.6 / +44 s / +59 s)', async () => {
    const e = rig6();
    await runTo(e, 300);
    send(e, prop(2));
    let maxRr = 0;
    let tVt = Infinity;
    let tSa = Infinity;
    await runTo(e, 600, (t) => {
      const rs = st6(e).resp;
      maxRr = Math.max(maxRr, rs.spont?.rr ?? 0);
      if (tVt === Infinity && rs.spont && rs.spont.vt < 100) tVt = t; // apnoea (VT 0) counts, as in Task 5's C4 test
      if (tSa === Infinity && rs.o2.sa < 0.9) tSa = t;
    }, 1);
    row('RS3', { maxRr: +maxRr.toFixed(1), vt100: tVt - 300, sa90: tSa - 300 });
    expect(maxRr).toBeLessThanOrEqual(30);
    expect(tVt - 300).toBeLessThanOrEqual(60);
    expect(tSa - 300).toBeLessThanOrEqual(120);
  });
  it.fails('RS3 capnogram < 15 mmHg while VT < dead space (from 10 s after the first such breath) — measured 26.8 on the merged main (15.6 on 94040f7: FU-4’s smaller physical VDs moves the Fowler ramp down, as predicted; Q-FU6-12)', async () => {
    const e = rig6();
    await runTo(e, 300);
    send(e, prop(2));
    let tBelow = Infinity;
    let waveMax = 0;
    await runTo(e, 600, (t) => {
      const rs = st6(e).resp;
      if (tBelow === Infinity && rs.spont && rs.spont.rr > 0 && rs.spont.vt < rs.pat.deadSpaceMl) tBelow = t;
      if (t >= tBelow + 10) waveMax = Math.max(waveMax, ...read62(e, 'co2', t - 1, t)); // the waveform: the numeric's hold is FU-5's (D10)
    }, 1);
    row('RS3b', { vtBelowVdAt: tBelow - 300, capnoMax: +waveMax.toFixed(1) });
    expect(waveMax).toBeLessThan(15);
  });
  it('RS4 full induction (preox → propofol + roc → 3 min no ventilation → BVM): SaO2 ≥ 95 through the apnoea; the first BVM breath EtCO2 = PaCO2 ± 5 (measured 99.9 %; 58.9 vs 59.3)', async () => {
    const e = rig6();
    const bvm: Array<{ t: number; et: number }> = [];
    e.on((x) => { if (x.type === 'breath' && x.kind === 'bvm') bvm.push({ t: x.t, et: x.etco2True }); }, ['breath']);
    await runTo(e, 120);
    send(e, { kind: 'preoxygenate', fio2: 1, durationS: 180 });
    await runTo(e, 300);
    send(e, prop(2));
    send(e, roc(0.6));
    send(e, { kind: 'ventilation', source: 'none' });
    let minSa = 1;
    await runTo(e, 480, () => { minSa = Math.min(minSa, st6(e).resp.o2.sa); }, 1);
    const pa = st6(e).resp.co2.pf as number;
    send(e, { kind: 'ventilation', source: 'bvm', rr: 12, vtMl: 500, fio2: 1 });
    await runTo(e, 500);
    const et1 = bvm.find((b) => b.t >= 480)?.et ?? Number.NaN; // the first breath (the true EtCO2 10 s later has washed out: 48.4)
    row('RS4', { minSaO2: +(minSa * 100).toFixed(1), paco2AtBvm: +pa.toFixed(1), firstEt: +et1.toFixed(1) });
    expect(minSa).toBeGreaterThanOrEqual(0.95);
    expect(Math.abs(et1 - pa)).toBeLessThanOrEqual(5);
  });
  it('RS5 remifentanil 0.2 µg/kg/min awake: RR ≤ 6; naloxone 0.1 mg: RR +3 within 2 min (measured 4.0 → 7.0)', async () => {
    const e = rig6();
    await runTo(e, 300);
    send(e, { kind: 'infusion', drugId: 'remifentanil', rate: 0.1, unit: 'mcg/kg/min' });
    await runTo(e, 900);
    send(e, { kind: 'infusion', drugId: 'remifentanil', rate: 0.2, unit: 'mcg/kg/min' });
    await runTo(e, 1500);
    const rr2 = st6(e).resp.spont.rr as number;
    send(e, { kind: 'drug', drugId: 'naloxone', dose: 0.1, unit: 'mg', route: 'iv' });
    await runTo(e, 1620);
    const rr3 = st6(e).resp.spont.rr as number;
    row('RS5', { rr02: +rr2.toFixed(1), rrNaloxone: +rr3.toFixed(1) });
    expect(rr2).toBeLessThanOrEqual(6);
    expect(rr3 - rr2).toBeGreaterThanOrEqual(3);
  });
  it.fails('RS5 remifentanil 0.1 awake: RR 6–10 and, at 0.2, PaCO2 +5–15 — measured RR 5.58 (audit D1 5.6: 7f/7g opioid rate depression, calibration row) and ΔPaCO2 +13.3 (met; +15.0 on 94040f7)', async () => {
    const e = rig6();
    await runTo(e, 300);
    const pa0 = st6(e).resp.co2.pf as number;
    send(e, { kind: 'infusion', drugId: 'remifentanil', rate: 0.1, unit: 'mcg/kg/min' });
    await runTo(e, 900);
    const rr1 = st6(e).resp.spont.rr as number;
    send(e, { kind: 'infusion', drugId: 'remifentanil', rate: 0.2, unit: 'mcg/kg/min' });
    await runTo(e, 1500);
    const dPa = (st6(e).resp.co2.pf as number) - pa0;
    row('RS5b', { rr01: +rr1.toFixed(2), dPaco2: +dPa.toFixed(2) });
    expect(rr1).toBeGreaterThanOrEqual(6);
    expect(rr1).toBeLessThanOrEqual(10);
    expect(dPa).toBeGreaterThanOrEqual(5);
    expect(dPa).toBeLessThanOrEqual(15);
  });
  it.fails('RS6 sevoflurane via SGA to ≈ 1 MAC: RR ≥ 1.4× awake and VT ≤ 0.7× awake — measured RR 16.7 vs 13.6 (1.23×), VT 0.67× (met) at 0.88 MAC (94040f7: 1.29× / 0.71×; D2 "tachypnoea too weak", Q-FU6-7)', async () => {
    const e = rig6();
    await runTo(e, 1);
    send(e, { kind: 'airwayDevice', device: 'sga' });
    send(e, { kind: 'ventilation', source: 'spontaneous', fio2: 0.5 });
    await runTo(e, 290);
    const rr0 = st6(e).resp.spont.rr as number;
    const vt0 = st6(e).resp.spont.vt as number;
    send(e, prop(2));
    send(e, { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2.5, fgfLpm: 6, n2oFrac: 0 });
    await runTo(e, 1500);
    const rs = st6(e).resp;
    row('RS6', { rr0: +rr0.toFixed(1), rr: +rs.spont.rr.toFixed(1), vt0: Math.round(vt0), vt: Math.round(rs.spont.vt), paco2: +rs.co2.pf.toFixed(1), mac: +(st6(e).pk.bus.cns?.macBrain ?? 0).toFixed(2) });
    expect(rs.spont.rr).toBeGreaterThanOrEqual(1.4 * rr0);
    expect(rs.spont.vt).toBeLessThanOrEqual(0.7 * vt0);
  });
  it('RS7 severe bronchospasm on VCV (one event), UNLIMITED arm (pmax 80 — F2): Ppeak ≥ 40, PEEPi ≥ 8, α ≥ 140°; salbutamol within 10 min: Ppeak −30 %, PEEPi −50 % (measured 44.3 / 11.9 / 164° → 24.0 / 2.4)', async () => {
    const e = rig6();
    await ventRig(e, { pmax: 80 }); // FU-6 F2: at the default Pmax 40 the peak reads the limit, not the lung
    await runTo(e, 600);
    send(e, { kind: 'airway', state: 'bronchospasm', severity: 1 });
    await runTo(e, 840);
    const w0 = await fineWindow(e, 900);
    const ap0 = st6(e).resp.lung.peepTot - 5;
    const alpha = mean(capnoAngles(read62(e, 'co2', 860, 900)).map((x) => x.alpha));
    send(e, { kind: 'drug', drugId: 'salbutamol', dose: 250, unit: 'mcg', route: 'iv' });
    await runTo(e, 1440);
    const w1 = await fineWindow(e, 1500);
    const ap1 = st6(e).resp.lung.peepTot - 5;
    row('RS7', { peak: +w0.peak.toFixed(1), autoPeep: +ap0.toFixed(1), alpha: +alpha.toFixed(0), peakSalb: +w1.peak.toFixed(1), autoPeepSalb: +ap1.toFixed(1) });
    expect(w0.peak).toBeGreaterThanOrEqual(40);
    expect(ap0).toBeGreaterThanOrEqual(8);
    expect(alpha).toBeGreaterThanOrEqual(140);
    expect(w1.peak).toBeLessThanOrEqual(0.7 * w0.peak);
    expect(ap1).toBeLessThanOrEqual(0.5 * ap0);
  });
  it('RS7c the same spasm at the DEFAULT Pmax 40 is pressure-limited: Ppeak pinned within 0.5 of the limit and the delivered VT below the set 500 mL (measured 40.0 / 476 mL) — what a Pmax alarm teaches (F2)', async () => {
    const e = rig6();
    await ventRig(e); // the factory default Pmax
    await runTo(e, 600);
    send(e, { kind: 'airway', state: 'bronchospasm', severity: 1 });
    await runTo(e, 840);
    const w = await fineWindow(e, 900);
    const vt = st6(e).resp.driver.cycles.filter((c: { mech: boolean }) => c.mech).at(-2)?.vt as number;
    const pmax = st6(e).resp.driver.vent.pmax ?? VCV_PMAX_DEFAULT;
    row('RS7c', { peak: +w.peak.toFixed(1), pmax, deliveredVt: Math.round(vt) });
    expect(Math.abs(w.peak - pmax)).toBeLessThanOrEqual(0.5);
    expect(vt).toBeLessThan(500);
  });
  it.fails('RS7 SaO2 falls ≥ 4 in untreated severe bronchospasm at FiO2 0.5 — measured 99.9 → 99.7 on the merged main (99.8 → 99.5 on 94040f7)', async () => {
    const e = rig6();
    await ventRig(e);
    await runTo(e, 600);
    const sa0 = st6(e).resp.o2.sa as number;
    send(e, { kind: 'airway', state: 'bronchospasm', severity: 1 });
    await runTo(e, 1500);
    const sa1 = st6(e).resp.o2.sa as number;
    row('RS7b', { sao2: +(sa0 * 100).toFixed(1), sao2Spasm: +(sa1 * 100).toFixed(1) });
    expect(sa0 - sa1).toBeGreaterThanOrEqual(0.04);
  });
  it.fails('RS8 laryngospasm after propofol 1 mg/kg on air: pleural swing ≤ −20 cmH2O with pulsus ≥ 10 mmHg — measured −30.7 cmH2O (met) / pulsus 8.2 mmHg (missed), SaO2 12.8 % at 180 s (94040f7: −14.6 / 12.6)', async () => {
    const e = rig6();
    await runTo(e, 480);
    send(e, prop(1));
    await runTo(e, 570);
    send(e, { kind: 'airway', state: 'obstructed' });
    await runTo(e, 700);
    const w = await fineWindow(e, 750);
    const b = st6(e).hemo.circ.beats.filter((x: { t: number }) => x.t > 700) as Array<{ sbp: number }>;
    const pulsus = Math.max(...b.map((x) => x.sbp)) - Math.min(...b.map((x) => x.sbp));
    const swing = (w.pplMin + 4) / 0.7356; // cmH2O below the resting −4 mmHg
    row('RS8', { swingCmH2O: +swing.toFixed(1), pulsus: +pulsus.toFixed(1), saO2: +(st6(e).resp.o2.sa * 100).toFixed(1) });
    expect(swing).toBeLessThanOrEqual(-20);
    expect(pulsus).toBeGreaterThanOrEqual(10);
  });
  // FU-6 F8 (Orchestrator ruling (FU-6 review), 2026-09-28): NPPE is a DECLARED NOT-MODELLED item, not an `it.fails`.
  // The chemical-drive effort is capped (the VT ceiling → effort ≈ 4.4–4.9), so the obstructed-effort transmural term
  // cannot reach the Starling threshold (σ·COP − 2 ≈ 23 mmHg) in ANY scenario — a real Mueller manoeuvre generates
  // −40 to −100 cmH2O. This row records the number and guards the declaration: if a later stage adds a reflex
  // laryngospasm effort (Q-FU6-3) and oedema appears, this row fails and the declaration is re-opened, not re-banded.
  it('RS8 NPPE — NOT MODELLED (declared): the transmural term adds only ≈ 6.5 mmHg at the maximal chemical effort and no lung water forms (measured palvObs −5.8 mmHg at effort 4.0, EVLWI +0.00; plan −6.5 at 4.4)', async () => {
    const e = rig6();
    await runTo(e, 480);
    send(e, prop(1));
    await runTo(e, 570);
    const ev0 = st6(e).blood.lung.evlwi as number;
    send(e, { kind: 'airway', state: 'obstructed' });
    let palv = 0;
    let effort = 0;
    await runTo(e, 750, () => { palv = Math.min(palv, st6(e).resp.palvObs ?? 0); effort = Math.max(effort, st6(e).resp.spont?.effort ?? 0); }, 0.5);
    const dEv = (st6(e).blood.lung.evlwi as number) - ev0;
    row('RS8-NPPE', { palvObsMin: +palv.toFixed(2), effortMax: +effort.toFixed(2), dEvlwi: +dEv.toFixed(2) });
    expect(palv).toBeLessThan(-1); // the transmural term IS wired (FU-6 R3b, Task 6 Step 5) …
    expect(palv).toBeGreaterThan(-12); // … but bounded by the capped chemical effort
    expect(dEv).toBeLessThan(0.5); // no negative-pressure oedema: NOT MODELLED (gate note §5, Q-FU6-3)
  });
  it('RS9 circuit events on VCV: kink → Ppeak ≥ Pmax − 0.5, VT ≤ 20 % (measured 40.0 / 68 mL); disconnection → capnogram flat within one breath (0.0; the numeric follows at +13 s: FU-5)', async () => {
    const e = rig6();
    const ev: unknown[] = [];
    e.on((x) => ev.push(x), ['measurement']);
    await ventRig(e);
    await runTo(e, 300);
    send(e, { kind: 'airway', state: 'obstructed' });
    await runTo(e, 330);
    const k = await fineWindow(e, 360);
    const vtK = st6(e).resp.driver.cycles.filter((c: { mech: boolean }) => c.mech).at(-2)?.vt as number;
    send(e, { kind: 'airway', state: 'patent' });
    await runTo(e, 480);
    send(e, { kind: 'airway', state: 'disconnected' });
    await runTo(e, 500);
    const et = st6(e).resp.etco2 as number;
    const wave = Math.max(...read62(e, 'co2', 486, 490)); // one breath (5 s) after the disconnection at 480
    const numZero = numSeries(ev as never, 'etco2', 480, 500).find(([, v]) => !(v > 5))?.[0] ?? Number.NaN;
    row('RS9', { kinkPeak: +k.peak.toFixed(1), kinkVt: Math.round(vtK), kinkVdSeries: Math.round(st6(e).resp.pat.deadSpaceMl), disconnectEtTrue: +et.toFixed(1), capnoMax: +wave.toFixed(1), numericZeroAt: numZero - 480 });
    // FU-6 F2: the kink row is the ONE place where a peak pinned at Pmax IS the evidence (that is what a kink does), so
    // it is asserted against the limit itself and the delivered VT carries the obstruction's size
    expect(Math.abs(k.peak - (st6(e).resp.driver.vent.pmax ?? VCV_PMAX_DEFAULT))).toBeLessThanOrEqual(0.5);
    expect(vtK).toBeLessThanOrEqual(100);
    expect(wave).toBeLessThan(5); // measured 0.0 from 484 s; the displayed numeric held 40 until 493 s (FU-5's hold, D10)
  });
  // RS10 runs at Pmax 80: at the default Pmax 40 the RR-30 breaths are pressure-limited (peak 40, VT 352) and the
  // hyperinflation this scenario teaches is capped (auto-PEEP 13.4, MAP −18 %) — the Pmax alarm is the other lesson
  const copd = async () => {
    const e = rig6({ ageY: 65, sex: 'M', weightKg: 70, heightCm: 175, lungConditions: [{ id: 'copd', severity: 1 }] });
    await ventRig(e, { rr: 10, pmax: 80 });
    const mapNow = () => { const b = st6(e).hemo.circ.beats.slice(-8) as Array<{ map: number }>; return b.reduce((a, x) => a + x.map, 0) / b.length; };
    await runTo(e, 600);
    const m10 = mapNow();
    send(e, vent({ rr: 30, pmax: 80 }));
    await runTo(e, 1200);
    const m30 = mapNow();
    const ap30 = st6(e).resp.lung.peepTot - 5;
    send(e, { kind: 'airway', state: 'disconnected' });
    await runTo(e, 1230);
    const mDisc = mapNow();
    row('RS10', { map10: +m10.toFixed(1), map30: +m30.toFixed(1), autoPeep30: +ap30.toFixed(1), mapAfterDisconnect: +mDisc.toFixed(1) });
    return { m10, m30, ap30, mDisc };
  };
  // WARNING for the gate note: on the merged main this patient ARRESTS ≈ 70 s after RR 30 (PEEPtot 23.2, CO 0, the
  // last beat at 669 s) — identically on origin/main 2473f0b without FU-6 — so "MAP 29.7" is the last live beats. The row's
  // band is met, but the evidence is an arrest, not a hypotension (94040f7: 94.0 → 67.8). Owner: FU-4/V.1 (pre-existing).
  it('RS10 COPD severe, VCV RR 10 → 30 (Pmax 80): PEEPi ≥ 15 with MAP −25 % (measured 18.2; 84.5 → 29.7 — the patient arrests, pre-existing on main; 94040f7: 94.0 → 67.8)', async () => {
    const r = await copd();
    expect(r.ap30).toBeGreaterThanOrEqual(15);
    expect(r.m30).toBeLessThanOrEqual(0.75 * r.m10);
  });
  it.fails('RS10 a 30 s disconnection restores MAP to ≥ 85 % of the RR-10 value — measured 29.7 of 84.5 (35 %): arrested before the disconnection, and PEEPtot stays 23.2 after it (pre-existing on main; 94040f7: 73.6 of 94.0)', async () => {
    const r = await copd();
    expect(r.mDisc).toBeGreaterThanOrEqual(0.85 * r.m10);
  });
  it('RS11 ARDS severe high recruiter (unlimited arm, pmax 80 — F2): plateau ≤ 30 at 6 mL/kg; driving pressure lower at PEEP 15 after recruitment (13.1 → 11.7) with the DELIVERED VT intact (F5c) (measured 13.1 → 11.8, Pplat 27.1, VT 420)', async () => {
    const e = rig6({ ...ADULT6, lungConditions: [{ id: 'ards', severity: 1, recruitFrac: 0.5 }] });
    // FU-6 F2/F5c: Pplat 27.2 sits close to the default Pmax 40's reach, and a pressure-limited breath would lower ΔP by
    // delivering LESS VOLUME — which is not the compliance gain R14 asks for. The arm is unlimited and the delivered VT
    // is guarded, so a ΔP fall can only be a compliance change.
    await ventRig(e, { rr: 20, vtMl: 420, fio2: 0.8, pmax: 80 });
    await runTo(e, 900);
    send(e, vent({ rr: 20, vtMl: 420, peep: 15, fio2: 0.8, pmax: 80 }));
    await runTo(e, 1500);
    const dp0 = st6(e).resp.lung.pInsp - st6(e).resp.lung.peepTot;
    send(e, { kind: 'recruit', pressureCmH2O: 40, durationS: 30 });
    await runTo(e, 2100);
    const lung = st6(e).resp.lung;
    const vt1 = st6(e).resp.driver.cycles.filter((c: { mech: boolean }) => c.mech).at(-2)?.vt as number;
    row('RS11', { dp0: +dp0.toFixed(1), dp1: +(lung.pInsp - lung.peepTot).toFixed(1), plateau: +lung.pInsp.toFixed(1), deliveredVt: Math.round(vt1), paco2: +st6(e).resp.co2.pf.toFixed(1) });
    expect(lung.pInsp).toBeLessThanOrEqual(30);
    expect(vt1).toBeGreaterThanOrEqual(0.95 * 420); // F5c: the ΔP fall is a compliance change, not a truncated breath
    expect(lung.pInsp - lung.peepTot).toBeLessThan(dp0 - 1);
  });
  it('RS12 OLV at FiO2 1, VT 5 mL/kg × 16: sevoflurane lowers PaO2 5–20 % (measured 78 → 68, −12.8 %; non-dependent flow 0.36); PaO2 150–250 and non-dependent flow ≤ 25 % need posture (Q-FU6-6) — logged', async () => {
    const run = async (sevo: boolean) => {
      const e = rig6();
      await ventRig(e, { fio2: 1 });
      await runTo(e, 600);
      send(e, { kind: 'lungCondition', id: 'olv', severity: 1, side: 'R' });
      send(e, vent({ rr: 16, vtMl: 350, fio2: 1 }));
      await runTo(e, 1800);
      if (sevo) send(e, { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2.5, fgfLpm: 6, n2oFrac: 0 });
      await runTo(e, 2400);
      const f = st6(e).resp.lung.perf.f as number[];
      return { pao2: st6(e).resp.o2.pao2 as number, fR: f[1] as number, paco2: st6(e).resp.co2.pf as number };
    };
    const c = await run(false);
    const s = await run(true);
    row('RS12', { pao2: Math.round(c.pao2), pao2Sevo: Math.round(s.pao2), nonDependentFlow: +c.fR.toFixed(2), paco2: +c.paco2.toFixed(1) });
    expect(1 - s.pao2 / c.pao2).toBeGreaterThanOrEqual(0.05);
    expect(1 - s.pao2 / c.pao2).toBeLessThanOrEqual(0.2);
  });
  // R45 (merged main): the awake arm is met (RR 28.2, PaCO2 33.1); the ventilated GA arm ARRESTS within ≈ 2 min of
  // `lungCondition pe 1` (FU-4's one-PE alias: CO 0 from +120 s, EtCO2 0, mPAP 11.2) — identical on origin/main 2473f0b.
  // Owner: FU-4 (the one-PE event's severity scale). it.fails with the numbers.
  it.fails('RS13 massive PE (one command), awake then ventilated: RR ≥ 25 and PaCO2 ≤ 35 awake; EtCO2 falls ≥ 10 with Pa–Et ≥ 15 ventilated; mPAP 30–45 — measured awake 28.2 / 33.1 (met); ventilated: arrest (CO 0, EtCO2 30.6 → 0, mPAP 11.2) (94040f7: 40.2 → 27.8, gap 33.6, mPAP 31.7)', async () => {
    const a = rig6();
    await runTo(a, 600);
    send(a, { kind: 'lungCondition', id: 'pe', severity: 1 });
    await runTo(a, 1200);
    const v = rig6();
    await ventRig(v);
    await runTo(v, 600);
    const et0 = st6(v).resp.etco2 as number;
    send(v, { kind: 'lungCondition', id: 'pe', severity: 1 });
    await runTo(v, 1200);
    let pap = 0;
    let n = 0;
    await runTo(v, 1260, () => { pap += st6(v).hemo.circOut.pPa; n++; }, 0.1);
    const rv = st6(v).resp;
    row('RS13', { rrAwake: +st6(a).resp.spont.rr.toFixed(1), paco2Awake: +st6(a).resp.co2.pf.toFixed(1), et0: +et0.toFixed(1), et: +rv.etco2.toFixed(1), gap: +(rv.co2.pf - rv.etco2).toFixed(1), mpap: +(pap / n).toFixed(1), co: +cardiacOutput(st6(v).hemo, v.now().simT).toFixed(2) });
    expect(st6(a).resp.spont.rr).toBeGreaterThanOrEqual(25);
    expect(st6(a).resp.co2.pf).toBeLessThanOrEqual(35);
    expect(et0 - rv.etco2).toBeGreaterThanOrEqual(10);
    expect(rv.co2.pf - rv.etco2).toBeGreaterThanOrEqual(15);
    expect(pap / n).toBeGreaterThanOrEqual(30);
    expect(pap / n).toBeLessThanOrEqual(45);
  });
  // FU-8 B4 (E-FU8B-7): flipped — EtCO2 +5.98 → +6.1 with the tonic sympathetic share.
  // R45 (FU-7.1; OWNER RULING Q5, 2026-10-10): recorded as a known miss with its number, NOT widened. On the executed
  // branch it is FU-7.1 B3 (the alveolar-washout fall of the low-flow factor), not B1, that moves the rebreathing arm's
  // EtCO2 rise from +6.1 to +5.99994 — red by 6 × 10⁻⁵ of an [ENG] band that read +5.98 before FU-8 B4 moved it just
  // inside (B1 alone measured +6.1). The PaCO2 rise (+6.7) is unchanged; the twin row in resp-inspired-co2.test.ts is
  // recorded the same way.
  it.fails('RS14 rebreathing FiCO2 8 for 20 min at fixed VCV: PaCO2 and EtCO2 +6–10 — measured +6.7 / EtCO2 +5.99994 after FU-7.1 B3 (+6.1 after FU-8 B4, +5.98 before it; 94040f7: +5.9 / +5.1)', async () => {
    const run = async (fico2: number) => {
      const e = rig6();
      await ventRig(e);
      await runTo(e, 300);
      if (fico2) send(e, vent({ fico2 }));
      await runTo(e, 1500);
      return { pa: st6(e).resp.co2.pf as number, et: st6(e).resp.etco2 as number };
    };
    const c = await run(0);
    const r = await run(8);
    row('RS14', { dPaco2: +(r.pa - c.pa).toFixed(1), dEtco2: +(r.et - c.et).toFixed(1) });
    expect(r.pa - c.pa).toBeGreaterThanOrEqual(6);
    expect(r.et - c.et).toBeGreaterThanOrEqual(6);
  });
});
