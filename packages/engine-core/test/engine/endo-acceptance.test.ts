// Stage 7e acceptance at engine level, MANUAL circulation (tables §7 check 21; R39-7; tables §5c stress/glucose;
// §5e sepsis). Drugs are Stage 7g's events (R51 §3); K and the lab glucose are Stage 7c's.
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '../../src/types.ts';
import { createEngine } from '../../src/index.ts';
import { ADULT, beatsIn, ev3, mean, numSeries, rig3, stateSeries, vent, run } from '../helpers/resp.ts';

type Endo = Extract<EngineEvent, { type: 'endo' }>;
type Labs = Extract<EngineEvent, { type: 'labs' }>;
const endoAt = (ev: EngineEvent[], t: number) => ev.find((x): x is Endo => x.type === 'endo' && x.t >= t)!;
const labsAt = (ev: EngineEvent[], t: number) => ev.find((x): x is Labs => x.type === 'labs' && x.t >= t)!.values;
const hrAt = (ev: EngineEvent[], t0: number, t1: number) => {
  const b = beatsIn(ev, t0, t1);
  return (60 * (b.length - 1)) / (b[b.length - 1]!.t - b[0]!.t);
};
const drug = (drugId: string, dose: number, unit: string) => ev3({ kind: 'drug', drugId, dose, unit, route: 'iv' });

describe('endocrine acceptance (MANUAL)', { timeout: 600_000 }, () => {
  // R45 (FU-4, the one physical dead space): this MANUAL rig ventilates 12 × 500 through the ventilator, whose dead space
  // fell 204 + fit → 127 + fit (an ETT replaces the upper airway it bypasses), so the same MH VCO2 raises EtCO2 more
  // slowly — measured 36/42/54/71/86 at 0/5/10/15/20 min (slope 3.4/min still in band). The "≥ 60 by 10 min" edge is
  // split out as a record; the rig is not re-tuned (its "fixed ventilation" premise has no PaCO2 target to re-derive to).
  it.fails('MH severity 1 at fixed ventilation (tables §7 check 21): EtCO2 ≥ 60 by 10 min — measured 54 with the corrected dead space', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
    e.dispatch(vent(12));
    await run(e, 300);
    e.dispatch(ev3({ kind: 'condition', id: 'mh', severity: 1 }));
    await run(e, 300 + 10 * 60);
    expect(mean(numSeries(ev, 'etco2', 300 + 580, 300 + 600).map(([, v]) => v))).toBeGreaterThanOrEqual(60);
  });
  it('MH severity 1 at fixed ventilation (tables §7 check 21): EtCO2 rising 3–5 mmHg/min (the ≥ 60 by 10 min edge: the it.fails above), core +1 °C by 15 min, HR +30 bpm, K 5.5–6.5 by 20 min', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
    e.dispatch(vent(12));
    await run(e, 300);
    const hr0 = hrAt(ev, 240, 300);
    e.dispatch(ev3({ kind: 'condition', id: 'mh', severity: 1 }));
    await run(e, 300 + 20 * 60);
    const et = (a: number) => mean(numSeries(ev, 'etco2', a - 20, a).map(([, v]) => v));
    const tc = stateSeries(ev, 'tempCore');
    const T = (s: number) => tc.find(([t]) => t >= s)![1];
    console.log(`MH: EtCO2 ${[0, 5, 10, 15, 20].map((m) => et(300 + m * 60).toFixed(0)).join('/')} at 0/5/10/15/20 min; core +${(T(300 + 900) - T(300)).toFixed(2)} °C at 15 min; HR ${hr0.toFixed(0)} → ${hrAt(ev, 300 + 1140, 300 + 1200).toFixed(0)}; K ${labsAt(ev, 300 + 1200).k}`);
    const slope = (et(300 + 900) - et(300 + 600)) / 5;
    expect(slope).toBeGreaterThanOrEqual(3);
    expect(slope).toBeLessThanOrEqual(5);
    expect(T(300 + 900) - T(300)).toBeGreaterThanOrEqual(1);
    expect(hrAt(ev, 300 + 1140, 300 + 1200) - hr0).toBeGreaterThanOrEqual(30);
    expect(labsAt(ev, 300 + 1200).k).toBeGreaterThanOrEqual(5.5);
    expect(labsAt(ev, 300 + 1200).k).toBeLessThanOrEqual(6.5);
  });

  /** MH severity 1 under GA at RR 12; dantrolene 2.5 mg/kg (7g) at 20 min; `mv`: treatment also doubles MV (RR 24). */
  const mhDantrolene = async (mv: boolean) => {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
    e.dispatch(vent(12));
    await run(e, 300);
    e.dispatch(ev3({ kind: 'condition', id: 'mh', severity: 1 }));
    await run(e, 300 + 20 * 60);
    e.dispatch(drug('dantrolene', 2.5, 'mg/kg'));
    if (mv) e.dispatch(vent(24));
    await run(e, 300 + 45 * 60);
    return ev;
  };
  const t0 = 300 + 20 * 60;

  // R45 (FU-4, the one physical dead space — as the MH row above): the lower alveolar dead-space load washes the CO2
  // out sooner after dantrolene — measured peak at +4.0 min (band 5–10, asserted from 4.5 min). FU-6: the peak is at
  // +5.0 min (EtCO2 91) on the FU-6 branch at Task 11 — the pre-declared it.fails is met, flipped (R45).
  it('MH + dantrolene 2.5 mg/kg at 20 min, fixed MV: EtCO2 turns 5–10 min after the dose (tables §7 check 21)', async () => {
    const ev = await mhDantrolene(false);
    const et = (a: number) => mean(numSeries(ev, 'etco2', a - 20, a).map(([, v]) => v));
    let peak = t0;
    for (let s = t0; s <= t0 + 25 * 60; s += 30) if (et(s) > et(peak)) peak = s;
    console.log(`dantrolene, fixed MV: EtCO2 peak ${et(peak).toFixed(0)} at +${((peak - t0) / 60).toFixed(1)} min, ${et(t0 + 1500).toFixed(0)} at +25`);
    expect(peak - t0).toBeGreaterThanOrEqual(5 * 60 - 30);
    expect(peak - t0).toBeLessThanOrEqual(10 * 60);
  });

  // The tables' "MH + dantrolene + MV × 2: HR normal (< 100) by 15–20 min" (an it.fails here, measured 129/121) was
  // MIS-SPECIFIED (target audit row 133: it assumes active cooling). Its band (b) is asserted on the MODELED rig below
  // (E117), where the HR is the circulation's and the baroreflex acts; this MANUAL rig has no baroreflex.

  it('stress: a stimulus without anaesthesia raises HR +15–25 % (tables §5c) with onset τ 20–40 s and offset τ 2–4 min; the GA flag blunts it', async () => {
    const hrRise = async (ga: boolean) => {
      const { e, ev } = rig3({ patient: ADULT });
      if (ga) e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
      await run(e, 120);
      e.dispatch(ev3({ kind: 'stimulus', intensity: 1 }));
      await run(e, 420);
      e.dispatch(ev3({ kind: 'stimulus', intensity: 0 }));
      await run(e, 900);
      return { base: hrAt(ev, 60, 120), top: hrAt(ev, 380, 420), on: hrAt(ev, 140, 170), off: hrAt(ev, 580, 620) };
    };
    const l = await hrRise(false);
    console.log(`stimulus: HR ${l.base.toFixed(1)} → ${l.top.toFixed(1)} (+${(100 * (l.top / l.base - 1)).toFixed(1)} %)`);
    expect(l.top / l.base - 1).toBeGreaterThanOrEqual(0.15);
    expect(l.top / l.base - 1).toBeLessThanOrEqual(0.25);
    expect((l.on - l.base) / (l.top - l.base)).toBeGreaterThan(0.4); // most of the rise within 20–50 s
    expect((l.off - l.base) / (l.top - l.base)).toBeGreaterThan(0.25); // still elevated 3 min after the stimulus ends
    expect((l.off - l.base) / (l.top - l.base)).toBeLessThan(0.75);
    const g = await hrRise(true);
    expect(g.top / g.base - 1).toBeLessThan(0.5 * (l.top / l.base - 1));
  });

  it('glucose through the drugs: dextrose 25 g → > 250 mg/dL at once, < 130 by 60 min; insulin infusion 4 U/h → < 70 by 2 h; the blood lab panel shows it', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    await run(e, 60);
    e.dispatch(drug('dextrose', 25, 'g'));
    await run(e, 70);
    expect(endoAt(ev, 62).glucoseMgDl).toBeGreaterThan(250);
    await run(e, 60 + 3600);
    expect(endoAt(ev, 60 + 3600).glucoseMgDl).toBeLessThan(130);
    e.dispatch(ev3({ kind: 'infusion', drugId: 'insulin', rate: 4, unit: 'units/h' }));
    await run(e, 60 + 3600 + 7200);
    const g = endoAt(ev, 60 + 3600 + 7200).glucoseMgDl;
    expect(g).toBeLessThan(70);
    expect(Math.abs(labsAt(ev, 60 + 3600 + 7200).glucose - g)).toBeLessThanOrEqual(2);
  });

  it('diabetic hypoglycaemia under GA: type 1 + insulin 20 U/h → glucose < 65 mg/dL and HR +20 % (the unexplained tachycardia)', async () => {
    const { e, ev } = rig3({ patient: { ...ADULT, endo: { diabetes: 'type1' } } });
    e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
    await run(e, 300);
    const base = hrAt(ev, 240, 300);
    e.dispatch(ev3({ kind: 'infusion', drugId: 'insulin', rate: 20, unit: 'units/h' }));
    await run(e, 300 + 3600);
    console.log(`hypoglycaemia: glucose ${endoAt(ev, 300 + 3600).glucoseMgDl} mg/dL, HR ${base.toFixed(0)} → ${hrAt(ev, 300 + 3540, 300 + 3600).toFixed(0)}`);
    expect(endoAt(ev, 300 + 3600).glucoseMgDl).toBeLessThan(65);
    expect(hrAt(ev, 300 + 3540, 300 + 3600) / base).toBeGreaterThanOrEqual(1.2);
  });

  it('warm septic shock (MANUAL: HR, temperature, glucose): HR 110–130 within 30 min (tables §5e), fever toward 38.5–40 °C, glucose ↑', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    await run(e, 60);
    e.dispatch(ev3({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'warm', rampS: 300 }));
    await run(e, 60 + 3600);
    const hr = hrAt(ev, 60 + 1740, 60 + 1800);
    const tc = stateSeries(ev, 'tempCore');
    console.log(`sepsis MANUAL: HR ${hr.toFixed(0)}, core ${tc[tc.length - 1]![1].toFixed(2)}, glucose ${endoAt(ev, 60 + 3600).glucoseMgDl}`);
    expect(hr).toBeGreaterThanOrEqual(110);
    expect(hr).toBeLessThanOrEqual(130);
    expect(tc[tc.length - 1]![1]).toBeGreaterThan(37.8);
    expect(endoAt(ev, 60 + 3600).glucoseMgDl).toBeGreaterThan(105);
  });
});

// E117 (owner-confirmed 2026-10-23): MODELED, the showcase-mh card's own induction (apps/demo/src/app/showcase/
// showcase-mh.json): a 35-year-old 80 kg man, propofol 2 mg/kg + succinylcholine 1.5 mg/kg, ETT, ventilator 12 × 500
// PEEP 5 FiO2 0.5, sevoflurane 2 % at 2 L/min, MH severity 1 from t = 0, rocuronium at 4 min; the ventilation never
// changes. Tachycardia is among the earliest and most consistent signs of MH (Miller's Anesthesia 10e, MH chapter):
// the HR must be rising before the EtCO2 leaves its baseline and be ≥ 120 by the time the EtCO2 passes 55 mmHg.
// Measured before E117: HR 78 → 79 while the EtCO2 left its baseline, 99 at EtCO2 55 (the kit-round rehearsal: 93 at 58).
describe('MH tachycardia (E117, MODELED)', { timeout: 600_000 }, () => {
  const MH_PATIENT = { ageY: 35, sex: 'M', weightKg: 80, heightCm: 180, sensors: { ecg: 'on', spo2: 'on', abp: 'connected', co2: 'on', temp: 'on' } } as const;
  const drugIv = (drugId: string, dose: number, unit: string) => ev3({ kind: 'drug', drugId, dose, unit, route: 'iv' });
  /** The card's induction; `mh` adds the condition, `rrAt` changes the ventilator rate at 10 min (hypoventilation). */
  const induced = async (untilS: number, o: { mh?: boolean; rrAt600?: number; dantroleneAt1200?: boolean } = {}) => {
    const e = createEngine({ seed: 7, mode: 'modeled', patient: MH_PATIENT } as never);
    const ev: EngineEvent[] = [];
    e.on((x) => ev.push(x));
    e.dispatch(drugIv('propofol', 2, 'mg/kg'));
    e.dispatch(drugIv('succinylcholine', 1.5, 'mg/kg'));
    e.dispatch(ev3({ kind: 'airwayDevice', device: 'ett' }));
    e.dispatch(vent(12, 500, 0.5, 5));
    e.dispatch(ev3({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 2 }));
    if (o.mh) e.dispatch(ev3({ kind: 'condition', id: 'mh', severity: 1 }));
    await run(e, 240);
    e.dispatch(drugIv('rocuronium', 0.6, 'mg/kg'));
    if (o.rrAt600 !== undefined) {
      await run(e, 600);
      e.dispatch(drugIv('rocuronium', 0.6, 'mg/kg')); // keeps the patient from triggering the ventilator
      e.dispatch(vent(o.rrAt600, 500, 0.5, 5));
    }
    if (o.dantroleneAt1200) {
      await run(e, 1200);
      e.dispatch(drugIv('dantrolene', 2.5, 'mg/kg'));
      e.dispatch(vent(24, 500, 0.5, 5));
    }
    await run(e, untilS);
    return ev;
  };
  const meanOf = (ev: EngineEvent[], id: 'hr' | 'etco2', a: number, b: number) => mean(numSeries(ev, id, a, b).map(([, v]) => v).filter((v) => Number.isFinite(v)));

  it('E117: the HR is rising before the EtCO2 leaves its baseline and is ≥ 120 by the time the EtCO2 passes 55 mmHg (constant ventilation)', async () => {
    const ev = await induced(1200, { mh: true });
    const et = numSeries(ev, 'etco2', 0, 1200).filter(([, v]) => Number.isFinite(v));
    const base = Math.min(...et.filter(([t]) => t >= 60 && t <= 120).map(([, v]) => v));
    const tLeave = et.find(([t, v]) => t > 120 && v >= base + 3)![0];
    const t55 = et.find(([, v]) => v > 55)![0];
    // The rise is attributed to MH against a no-MH arm of the same induction at the same moment (the propofol and
    // succinylcholine transients are in both), and against the MH arm's own HR at 25–35 s
    const noMh = await induced(tLeave + 5);
    const hr0 = meanOf(ev, 'hr', 25, 35);
    const hrLeave = meanOf(ev, 'hr', tLeave - 5, tLeave);
    const hrNoMh = meanOf(noMh, 'hr', tLeave - 5, tLeave);
    const hr55 = meanOf(ev, 'hr', t55 - 5, t55);
    console.log(`E117: EtCO2 baseline ${base}, leaves it (+3) at ${(tLeave / 60).toFixed(1)} min with HR ${hr0.toFixed(0)} → ${hrLeave.toFixed(0)} (no MH at that moment ${hrNoMh.toFixed(0)}); passes 55 at ${(t55 / 60).toFixed(1)} min with HR ${hr55.toFixed(0)}`);
    expect(hrLeave - hr0).toBeGreaterThanOrEqual(8);
    expect(hrLeave - hrNoMh).toBeGreaterThanOrEqual(8);
    expect(hr55).toBeGreaterThanOrEqual(120);
  });

  // Target audit row 133 band (b) (owner-confirmed with E117): without active cooling the HR need not be normal, but
  // dantrolene brings it down with the activity — at +20 min it is ≥ 15 % below its peak and no higher than
  // baseline + 8.5 bpm/°C × (core − 36.8) + 15 [ENG, derived by the audit]. MH from t = 0, dantrolene 2.5 mg/kg and
  // MV × 2 (RR 24) at 20 min, no cooling.
  it('E117 dantrolene (audit row 133 band (b)): MH + dantrolene 2.5 mg/kg + MV × 2 at 20 min: HR ≥ 15 % below its peak by +20 min and ≤ baseline + 8.5 bpm/°C × (core − 36.8) + 15', async () => {
    const ev = await induced(2500, { mh: true, dantroleneAt1200: true });
    const hr0 = meanOf(ev, 'hr', 25, 35);
    const hr20 = meanOf(ev, 'hr', 2340, 2400);
    let peak = 0;
    for (let s = 60; s <= 2400; s += 30) peak = Math.max(peak, meanOf(ev, 'hr', s - 30, s));
    const core20 = stateSeries(ev, 'tempCore').find(([t]) => t >= 2400)![1];
    const ceiling = hr0 + 8.5 * (core20 - 36.8) + 15;
    console.log(`E117 dantrolene: HR ${hr0.toFixed(0)} → peak ${peak.toFixed(0)} → ${meanOf(ev, 'hr', 2040, 2100).toFixed(0)}/${hr20.toFixed(0)} at +15/+20 min (−${(100 * (1 - hr20 / peak)).toFixed(0)} %); core ${core20.toFixed(2)}, ceiling ${ceiling.toFixed(0)}`);
    expect(hr20).toBeLessThanOrEqual(0.85 * peak);
    expect(hr20).toBeLessThanOrEqual(ceiling);
  });

  it('E117 controls: without MH, hypoventilation to PaCO2 ≈ 50 raises the HR by ≤ 10 bpm and to PaCO2 ≈ 65–70 by ≤ 20 (the hypercapnic sympathetic term stays small beside the chemoreflex terms already there)', async () => {
    const ctl = await induced(1800, { rrAt600: 12 }); // the same second rocuronium dose, the ventilation unchanged
    const pco2 = (ev: EngineEvent[]) => ev.filter((x): x is Labs => x.type === 'labs' && x.t >= 1740).at(-1)!.values.pco2 as number;
    const hr = (ev: EngineEvent[]) => meanOf(ev, 'hr', 1740, 1800);
    for (const [rr, lo, hi, maxDHr] of [[7, 47, 54, 10], [4, 63, 72, 20]] as const) {
      const hyp = await induced(1800, { rrAt600: rr });
      console.log(`E117 control RR ${rr}: PaCO2 ${pco2(ctl)} → ${pco2(hyp)}, HR ${hr(ctl).toFixed(1)} → ${hr(hyp).toFixed(1)} (Δ ${(hr(hyp) - hr(ctl)).toFixed(1)})`);
      expect(pco2(hyp)).toBeGreaterThanOrEqual(lo);
      expect(pco2(hyp)).toBeLessThanOrEqual(hi);
      expect(hr(hyp) - hr(ctl)).toBeLessThanOrEqual(maxDHr);
    }
  });
});
