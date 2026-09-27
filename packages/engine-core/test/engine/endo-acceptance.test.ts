// Stage 7e acceptance at engine level, MANUAL circulation (tables §7 check 21; R39-7; tables §5c stress/glucose;
// §5e sepsis). Drugs are Stage 7g's events (R51 §3); K and the lab glucose are Stage 7c's.
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '../../src/types.ts';
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

describe('Stage 7e acceptance (MANUAL)', { timeout: 600_000 }, () => {
  it('MH severity 1 at fixed ventilation (tables §7 check 21): EtCO2 ≥ 60 by 10 min rising 3–5 mmHg/min, core +1 °C by 15 min, HR +30 bpm, K 5.5–6.5 by 20 min', async () => {
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
    expect(et(300 + 600)).toBeGreaterThanOrEqual(60);
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

  it('MH + dantrolene 2.5 mg/kg at 20 min (7g), fixed MV: EtCO2 turns 5–10 min after the dose (tables §7 check 21)', async () => {
    const ev = await mhDantrolene(false);
    const et = (a: number) => mean(numSeries(ev, 'etco2', a - 20, a).map(([, v]) => v));
    let peak = t0;
    for (let s = t0; s <= t0 + 25 * 60; s += 30) if (et(s) > et(peak)) peak = s;
    console.log(`dantrolene, fixed MV: EtCO2 peak ${et(peak).toFixed(0)} at +${((peak - t0) / 60).toFixed(1)} min, ${et(t0 + 1500).toFixed(0)} at +25`);
    expect(peak - t0).toBeGreaterThanOrEqual(5 * 60 - 30);
    expect(peak - t0).toBeLessThanOrEqual(10 * 60);
  });

  // R45 miss (prototype: HR 121 at +20 min, core 39.8 °C): the fever term (× 1.27) and the hypercapnic epinephrine keep
  // the HR up; the tables' "HR normal" assumes active cooling, which 7e does not model (Q-7e-5). Not widened.
  it.fails('MH + dantrolene + MV × 2 at 20 min: HR normal (< 100) by 15–20 min after the dose (tables §7 check 21; measured 129/121 at +15/+20 min, core 39.78 °C; Q-7e-5)', async () => {
    const ev = await mhDantrolene(true);
    const hr20 = hrAt(ev, t0 + 1140, t0 + 1200);
    const tc = stateSeries(ev, 'tempCore');
    console.log(`dantrolene + MV×2: HR ${hrAt(ev, t0 - 60, t0).toFixed(0)} → ${hrAt(ev, t0 + 840, t0 + 900).toFixed(0)}/${hr20.toFixed(0)} at +15/+20 min; core ${tc.find(([t]) => t >= t0 + 1200)![1].toFixed(2)}`);
    expect(hr20).toBeLessThan(100);
  });

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

  it('glucose through 7g: dextrose 25 g → > 250 mg/dL at once, < 130 by 60 min; insulin infusion 4 U/h → < 70 by 2 h; 7c’s lab panel shows it', async () => {
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
