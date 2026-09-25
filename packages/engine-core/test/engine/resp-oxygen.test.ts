// BUILD-PLAN Stage 3 acceptance 5–6 (O2 store: Benumof, Patel; the R8 SpO2 lag structure) and the SpO2
// validity rules (pulseless, low PI, same-limb cuff) at engine level.
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '../../src/types.ts';
import { ADULT, cmd, desatTime, ev3, numSeries, rig3, stateSeries, run } from '../helpers/resp.ts';

describe('Stage 3 acceptance: O2 store (Benumof, Patel) and the R8 lag structure', { timeout: 300_000 }, () => {
  it('5. preoxygenated healthy 70 kg adult: SaO2 90 % at 8 ± 1.5 min of apnoea', async () => {
    const t = (await desatTime(ADULT, true)) / 60;
    expect(t).toBeGreaterThanOrEqual(6.5);
    expect(t).toBeLessThanOrEqual(9.5);
  });

  it('5b. room air: 90 % in 40–90 s (R29; model ≈ 0.7 min, plan decision 4); children 2–5 y 160 ± 30 s; obese 127 kg ≈ 2.7 min', async () => {
    const room = await desatTime(ADULT, false);
    expect(room).toBeGreaterThanOrEqual(40); // R29: band 40–90 s pending Ali's verdict at gate 3 (brief said 1–2 min)
    expect(room).toBeLessThanOrEqual(90);
    const child = await desatTime({ ageY: 4, weightKg: 16, baseline: { rr: 24, vt: 130 } }, true);
    expect(child).toBeGreaterThanOrEqual(130);
    expect(child).toBeLessThanOrEqual(190);
    const obese = (await desatTime({ ageY: 40, weightKg: 127, heightCm: 175, sex: 'M' }, true)) / 60;
    expect(obese).toBeGreaterThanOrEqual(1.7);
    expect(obese).toBeLessThanOrEqual(3.7);
  });

  it('6. R8: EtCO2 vanishes at once on airway loss while SpO2 is still normal; displayed SpO2 KEEPS FALLING 10–30 s after ventilation resumes', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
    await run(e, 60);
    e.dispatch(ev3({ kind: 'airway', state: 'obstructed' }));
    await run(e, 75);
    expect(numSeries(ev, 'etco2', 74, 75)[0]![1]).toBeLessThan(5); // gone (sidestream + 10 s window)
    expect(numSeries(ev, 'spo2', 74, 75)[0]![1]).toBeGreaterThanOrEqual(94);
    let tRestore = 0;
    for (let t = 76; t < 400; t++) {
      await run(e, t);
      const sa = stateSeries(ev, 'spo2', t - 1.01).pop();
      if (sa && sa[1] <= 85) {
        tRestore = t;
        break;
      }
    }
    expect(tRestore).toBeGreaterThan(0);
    e.dispatch(ev3({ kind: 'airway', state: 'patent' }));
    e.dispatch(ev3({ kind: 'ventilation', source: 'bvm', rr: 12, vtMl: 600, fio2: 1 }));
    await run(e, tRestore + 90);
    const shown = numSeries(ev, 'spo2', tRestore, tRestore + 90).filter(([, v]) => Number.isFinite(v));
    const minAt = shown.reduce((a, b) => (b[1] < a[1] ? b : a))[0];
    expect(minAt - tRestore).toBeGreaterThanOrEqual(10);
    expect(minAt - tRestore).toBeLessThanOrEqual(30);
    expect(shown[shown.length - 1]![1]).toBeGreaterThan(90); // and then it recovers
  });

  it('6b. finger dead time at normal CO: displayed SpO2 lags a SaO2 step by 15 ± 3 s plus the averaging; site step → 90 % shown ≤ 20 s', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    await run(e, 60);
    const t0 = e.now().simT;
    const base = numSeries(ev, 'spo2', t0 - 1, t0)[0]![1];
    e.dispatch(cmd({ type: 'setTarget', variable: 'spo2', value: 85 }));
    await run(e, t0 + 60);
    const shown = numSeries(ev, 'spo2', t0, t0 + 60);
    const firstMove = shown.find(([, v]) => v <= base - 1)![0] - t0; // dead time 15 s + lag + the start of the average
    expect(firstMove).toBeGreaterThanOrEqual(12);
    expect(firstMove).toBeLessThanOrEqual(18 + 4);
    const final = numSeries(ev, 'spo2', t0 + 55, t0 + 60)[0]![1];
    const t90 = shown.find(([, v]) => v <= base - 0.9 * (base - final))![0] - t0;
    expect(t90 - 15).toBeLessThanOrEqual(20);
  });

  it('9a. pulseless (VF): SpO2 is invalid within 10–30 s; low PI flags it questionable', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    await run(e, 30);
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' }));
    await run(e, 70);
    const inv = numSeries(ev, 'spo2', 30, 70).find(([, v]) => Number.isNaN(v));
    expect(inv).toBeDefined();
    expect(inv![0] - 30).toBeGreaterThanOrEqual(10);
    expect(inv![0] - 30).toBeLessThanOrEqual(30);
    const r = rig3({ patient: ADULT });
    r.e.dispatch(cmd({ type: 'setTarget', variable: 'pi', value: 0.2 }));
    await run(r.e, 40);
    const last = r.ev.filter((x) => x.type === 'measurement' && x.values.spo2).pop() as Extract<EngineEvent, { type: 'measurement' }>;
    expect(last.values.spo2!.flag).toBe('questionable');
  });

  it('9b. a same-limb NIBP cuff flattens the pleth but SpO2 holds its value (valid) through the cycle', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(cmd({ type: 'attachSensor', sensor: 'nibp', state: 'on', site: 'leftArm' }));
    await run(e, 30);
    e.dispatch(cmd({ type: 'device', action: { device: 'nibp', action: 'start' } }));
    await run(e, 75);
    const sp = numSeries(ev, 'spo2', 30, 75);
    expect(sp.every(([, v]) => v >= 95 && v <= 99)).toBe(true);
  });
});
