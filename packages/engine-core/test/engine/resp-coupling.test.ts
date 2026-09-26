// Stage 3 coupling (M6 PPV through the driver), RR three ways, the R27 ventilator link and lungState, the
// SpO2 tone pitch and MH at engine level.
import { describe, expect, it } from 'vitest';
import { cardiacOutput } from '../../src/l2/gas/coupling.ts';
import { plethRr } from '../../src/l3/resp/impedance.ts';
import type { EngineEvent } from '../../src/types.ts';
import { ADULT, beatsIn, breaths, cmd, ev3, hemoOf, mean, numSeries, rig3, stateSeries, vent, run } from '../helpers/resp.ts';

describe('Stage 3 acceptance: respiratory coupling, RR, ventilator link', { timeout: 300_000 }, () => {
  it('M6: PPV through the respiratory driver — ventilated 5–10 % (g 0.05) and 15–30 % (g 0.2); spontaneous is smaller', async () => {
    const ppv = async (g: number, ventilated: boolean) => {
      const { e, ev } = rig3({ patient: { ...ADULT, sensors: { abp: 'connected' } } });
      if (ventilated) e.dispatch(vent(15, 500, 0.5, 5));
      e.dispatch(cmd({ type: 'setModifiers', modifiers: { hrvScale: 0 } }));
      e.dispatch(cmd({ type: 'setTarget', variable: 'volumeStatus', value: 1 - (g - 0.04) / 0.21 }));
      await run(e, 70);
      const abp = new Float32Array(Math.round(70 * 125));
      e.readSamples('abp', 0, abp);
      const pp = beatsIn(ev, 30, 68).map((b) => {
        const w = abp.subarray(Math.round(b.t * 125), Math.round((b.t + 0.8) * 125));
        return { t: b.t, pp: Math.max(...w) - Math.min(...w) };
      });
      const out: number[] = [];
      for (let t0 = 32; t0 + 4 <= 66; t0 += 4) {
        const s = pp.filter((x) => x.t >= t0 && x.t < t0 + 4).map((x) => x.pp);
        out.push((100 * (Math.max(...s) - Math.min(...s))) / ((Math.max(...s) + Math.min(...s)) / 2));
      }
      return mean(out);
    };
    const lo = await ppv(0.05, true);
    const hi = await ppv(0.2, true);
    expect(lo).toBeGreaterThanOrEqual(5);
    expect(lo).toBeLessThanOrEqual(10);
    expect(hi).toBeGreaterThanOrEqual(15);
    expect(hi).toBeLessThanOrEqual(30);
    expect(await ppv(0.2, false)).toBeLessThan(hi);
  });

  it('RR three ways (impedance, capnogram, pleth) agree within 1/min in sinus on a ventilator at 14/min', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(vent(14, 500, 0.5, 5));
    e.dispatch(cmd({ type: 'setModifiers', modifiers: { hrvScale: 0 } }));
    e.dispatch(cmd({ type: 'setTarget', variable: 'volumeStatus', value: 0.5 }));
    await run(e, 120);
    const aw = mean(numSeries(ev, 'awrr', 100, 120).map(([, v]) => v));
    const imp = mean(numSeries(ev, 'rr', 100, 120).map(([, v]) => v));
    const pl = new Float32Array(Math.round(120 * 125));
    e.readSamples('pleth', 0, pl);
    const beats = beatsIn(ev, 55, 118).map((b) => {
      const w = pl.subarray(Math.round((b.t + 0.1) * 125), Math.round((b.t + 0.6) * 125));
      return { t: b.t, amp: Math.max(...w) - Math.min(...w) };
    });
    const pr = plethRr(beats, 118)!;
    for (const v of [aw, imp, pr]) expect(Math.abs(v - 14)).toBeLessThanOrEqual(1);
  });

  it('M5/obstruction: impedance keeps counting chest efforts (obstructive apnoea missed) while the capnograph alarms', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    await run(e, 30);
    e.dispatch(ev3({ kind: 'airway', state: 'obstructed' }));
    await run(e, 80);
    expect(ev.some((a) => a.type === 'alarm' && a.id === 'apnoea-co2' && a.state === 'raised' && a.t > 30)).toBe(true);
    expect(ev.some((a) => a.type === 'alarm' && a.id === 'apnoea-resp' && a.state === 'raised' && a.t > 30)).toBe(false);
    expect(mean(numSeries(ev, 'rr', 70, 80).map(([, v]) => v))).toBeGreaterThan(10);
  });

  it('8. ventilator link: a 50 Hz VentFrame stream (RR 12, VT 500, FiO2 0.4, PEEP 5) → 12 ± 0.5 breaths/min, EtCO2/SpO2 steady; PEEP 15 lowers CO and MAP, raises CVP', async () => {
    const { e, ev } = rig3({ patient: { ...ADULT, sensors: { abp: 'connected', cvp: 'connected' } } });
    e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
    let peep = 5;
    let vt = 500;
    const frameAt = (t: number) => {
      const T = 5;
      const ti = 1.6;
      const u = t % T;
      const C = 50;
      const flow = u < ti ? vt / 1000 / ti : -((vt / 1000) / 0.5) * Math.exp(-(u - ti) / 0.5);
      const vol = u < ti ? (vt * u) / ti : vt * Math.exp(-(u - ti) / 0.5);
      return { pawCmH2O: peep + vol / C + (u < ti ? 10 * flow : 0), flowLps: flow, volumeMl: vol, fio2: 0.4, peepCmH2O: peep };
    };
    const drive = async (until: number) => {
      let nextYield = e.now().simT + 60;
      for (let t = e.now().simT + 0.02; t <= until + 1e-9; t += 0.02) {
        e.dispatch(cmd({ type: 'externalDrive', source: 'ventilator', frame: frameAt(t) }));
        e.advanceTo(t);
        if (t >= nextYield) { // CI rule: yield once per sim-minute
          nextYield += 60;
          await new Promise<void>((r) => setImmediate(r));
        }
      }
    };
    await drive(600);
    const n = breaths(ev, 300, 600).length / 5;
    expect(Math.abs(n - 12)).toBeLessThanOrEqual(0.5);
    const et = numSeries(ev, 'etco2', 540, 600).map(([, v]) => v);
    expect(Math.max(...et) - Math.min(...et)).toBeLessThanOrEqual(2);
    expect(Math.abs(mean(et) - mean(stateSeries(ev, 'etco2', 540, 600).map(([, v]) => v)))).toBeLessThanOrEqual(2);
    expect(Math.min(...numSeries(ev, 'spo2', 540, 600).map(([, v]) => v))).toBeGreaterThanOrEqual(97);
    const co5 = cardiacOutput(hemoOf(e), e.now().simT);
    const map5 = mean(numSeries(ev, 'abpMean', 560, 600).map(([, v]) => v));
    const cvp5 = mean(numSeries(ev, 'cvpMean', 560, 600).map(([, v]) => v));
    peep = 15;
    await drive(720);
    const co15 = cardiacOutput(hemoOf(e), e.now().simT);
    const map15 = mean(numSeries(ev, 'abpMean', 680, 720).map(([, v]) => v));
    const cvp15 = mean(numSeries(ev, 'cvpMean', 680, 720).map(([, v]) => v));
    expect(co15).toBeLessThan(0.92 * co5);
    expect(map15).toBeLessThan(map5 - 5);
    expect(cvp15 - cvp5).toBeGreaterThanOrEqual(0.3 * 0.7356 * 8);
    expect(cvp15 - cvp5).toBeLessThanOrEqual(0.5 * 0.7356 * 10);
    // CVP respiratory swing follows the drive's pressure swing
    const swing = (t0: number) => { // respiratory swing of the 1 s moving average (removes the a/c/v waves)
      const x = new Float32Array(11 * 125);
      e.readSamples('cvp', Math.round(t0 * 125), x);
      const avg: number[] = [];
      for (let k = 0; k + 125 <= x.length; k += 5) avg.push(x.subarray(k, k + 125).reduce((a, b) => a + b, 0) / 125);
      return Math.max(...avg) - Math.min(...avg);
    };
    const s500 = swing(705);
    vt = 800;
    await drive(780);
    expect(swing(765)).toBeGreaterThan(1.3 * s500);
  }, 300_000); // 39 000 frames, each a dispatch + a tick with its look-ahead

  it('R27: lungState at start from the profile, again on bronchospasm (resistance ×4, auto-PEEP tendency)', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    await run(e, 1);
    const ls = ev.filter((x): x is Extract<EngineEvent, { type: 'lungState' }> => x.type === 'lungState');
    // Stage 7b (plan decision 15): compliance comes from the lung module (healthy Crs 55, Pulse healthy 54 ± 10 %),
    // no longer Stage 3's fixed 50 [ENG]; re-specified from the exact 50 to the module's healthy band.
    expect(ls[0]).toMatchObject({ t: 0, resistanceCmH2OPerLps: 10, effort: 1, autoPeepTendency: 0 });
    expect(ls[0]!.complianceMlPerCmH2O).toBeGreaterThanOrEqual(48);
    expect(ls[0]!.complianceMlPerCmH2O).toBeLessThanOrEqual(60);
    expect(ls[0]!.frcMl).toBeGreaterThan(2000);
    e.dispatch(ev3({ kind: 'airway', state: 'bronchospasm', severity: 1 }));
    await run(e, 2);
    const b = ev.filter((x): x is Extract<EngineEvent, { type: 'lungState' }> => x.type === 'lungState').pop()!;
    expect(b.resistanceCmH2OPerLps).toBe(40);
    expect(b.autoPeepTendency).toBeGreaterThan(0.5);
  });

  it('9. tone: the QRS beep pitch follows the displayed SpO2 (90 % → 830.6 Hz ± 1)', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(cmd({ type: 'setTarget', variable: 'spo2', value: 89.5 }));
    await run(e, 80);
    for (let t = 80; t <= 90; t += 0.02) e.advanceTo(t); // tones are posted from the look-ahead of each tick
    const sp = numSeries(ev, 'spo2', 85, 90).pop()![1];
    const tone = ev.filter((x) => x.type === 'tone' && x.t > 88).pop() as Extract<EngineEvent, { type: 'tone' }>;
    expect(tone.freqHz).toBeCloseTo(880 * 2 ** (-(100 - sp) * 0.1 / 12), 3);
    if (sp === 90) expect(Math.abs(tone.freqHz! - 830.6)).toBeLessThanOrEqual(1);
  });

  it('R39-7 GA redistribution, default adult: core −0.9 °C at 30 min (−0.7 to −1.1), −1.3 °C at 60 min (−1.0 to −1.6); forced-air warming −0.9 at 60 min (−0.6 to −1.2)', async () => {
    // research 09 §7: unwarmed, draped, 21–22 °C OR; the change is measured from the L1 core truth at induction.
    // Measured at 3.1: −0.97 / −1.28 °C unwarmed, −0.68 °C warmed (the warm edge of its band; constants kept per R39-7).
    const drop = async (warming: boolean) => {
      const { e, ev } = rig3({ patient: ADULT });
      await run(e, 60);
      e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general', ...(warming ? { warming: true } : {}) }));
      await run(e, 60 + 3600);
      const tc = stateSeries(ev, 'tempCore');
      const at = (s: number) => tc.find(([t]) => t >= 60 + s)![1];
      return { d30: at(1800) - at(0), d60: at(3600) - at(0) };
    };
    const cold = await drop(false);
    expect(cold.d30).toBeLessThanOrEqual(-0.7);
    expect(cold.d30).toBeGreaterThanOrEqual(-1.1);
    expect(cold.d60).toBeLessThanOrEqual(-1.0);
    expect(cold.d60).toBeGreaterThanOrEqual(-1.6);
    const warm = await drop(true);
    expect(warm.d60).toBeLessThanOrEqual(-0.6);
    expect(warm.d60).toBeGreaterThanOrEqual(-1.2);
  });

  it('MH: VCO2 climbs, so EtCO2 rises at a fixed ventilation, and the core temperature rises', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
    e.dispatch(vent(12));
    await run(e, 300);
    e.dispatch(ev3({ kind: 'condition', id: 'mh', severity: 1 }));
    await run(e, 300 + 30 * 60);
    const et0 = mean(numSeries(ev, 'etco2', 280, 300).map(([, v]) => v));
    const et1 = mean(numSeries(ev, 'etco2', 2080, 2100).map(([, v]) => v));
    expect(et1 - et0).toBeGreaterThan(20);
    expect(et1).toBeLessThan(150); // the schema limit (brief §4.9)
    const tc = stateSeries(ev, 'tempCore');
    expect(tc[tc.length - 1]![1] - tc.find(([t]) => t >= 300)![1]).toBeGreaterThan(1.0); // the rate: l2/temp test
  });
});
