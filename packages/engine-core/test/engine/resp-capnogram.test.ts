// BUILD-PLAN Stage 3 acceptance 1–2 (capnogram shape, sampling, pattern library) at engine level.
import { describe, expect, it } from 'vitest';
import { ADULT, breaths, capnoAngles, ev3, mean, numSeries, read62, rig3, vent, run } from '../helpers/resp.ts';

describe('Stage 3 acceptance: capnogram', { timeout: 300_000 }, () => {
  it('1. α 100–110° normally and ≥ 120° in bronchospasm (25 mmHg/s axis), phase III +1–3 mmHg', async () => {
    const { e } = rig3({ patient: ADULT });
    e.dispatch(vent());
    await run(e, 60);
    const n = capnoAngles(read62(e, 'co2', 20, 60));
    expect(n.length).toBeGreaterThanOrEqual(6);
    for (const b of n) {
      expect(b.alpha).toBeGreaterThanOrEqual(100);
      expect(b.alpha).toBeLessThanOrEqual(110);
      expect(b.riseIII).toBeGreaterThanOrEqual(1);
      expect(b.riseIII).toBeLessThanOrEqual(3);
    }
    e.dispatch(ev3({ kind: 'airway', state: 'bronchospasm', severity: 1 }));
    await run(e, 120);
    const b = capnoAngles(read62(e, 'co2', 80, 120));
    expect(mean(b.map((x) => x.alpha))).toBeGreaterThanOrEqual(120);
  });

  it('2. sidestream: the trace is 2.3 ± 0.1 s behind the breath; at RR 60 sidestream reads below mainstream (≥ 0.5 mmHg)', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(vent(12));
    await run(e, 60);
    const x = read62(e, 'co2', 0, 60);
    const lags: number[] = [];
    for (const b of breaths(ev, 20, 55)) {
      const k0 = Math.round((b.t + 1.5) * 62.5);
      const plateau = x[k0]!;
      let k = k0;
      while (x[k]! > 0.9 * plateau) k++;
      lags.push(k / 62.5 - b.t);
    }
    expect(Math.min(...lags)).toBeGreaterThanOrEqual(2.2);
    expect(Math.max(...lags)).toBeLessThanOrEqual(2.4);
    const peak = async (s: 'sidestream' | 'mainstream') => {
      const r = rig3({ patient: { ageY: 0.05, weightKg: 3.5 }, sampling: s });
      r.e.dispatch(ev3({ kind: 'ventilation', source: 'ventilator', rr: 60, vtMl: 25, fio2: 0.4, peep: 5, ie: 1.5 }));
      await run(r.e, 40);
      const x = read62(r.e, 'co2', 20, 40);
      const p: number[] = [];
      for (let k = 0; k + 62 < x.length; k += 62) p.push(Math.max(...x.subarray(k, k + 62))); // one breath per second
      return mean(p);
    };
    expect((await peak('mainstream')) - (await peak('sidestream'))).toBeGreaterThanOrEqual(0.5); // plan decision 5: not the > 3 mmHg of BUILD-PLAN
  });

  it('1c. oesophageal intubation: fewer than 6 breaths of decreasing height, then flat', async () => {
    const { e } = rig3({ patient: ADULT, sampling: 'mainstream' });
    e.dispatch(vent(12));
    await run(e, 30);
    e.dispatch(ev3({ kind: 'airway', state: 'oesophageal' }));
    await run(e, 97);
    const x = read62(e, 'co2', 36, 96); // 5 s windows holding one whole expiration each (cycles restart at 35 s)
    const peaks: number[] = [];
    for (let k = 0; k < 12; k++) peaks.push(Math.max(...x.subarray(Math.round(k * 5 * 62.5), Math.round((k + 1) * 5 * 62.5))));
    const visible = peaks.filter((p) => p > 1);
    expect(visible.length).toBeGreaterThanOrEqual(3);
    expect(visible.length).toBeLessThan(6);
    for (let i = 1; i < visible.length; i++) expect(visible[i]!).toBeLessThan(visible[i - 1]!);
    expect(Math.max(...peaks.slice(7))).toBeLessThan(1);
  });

  it('1d. rebreathing raises the inspiratory baseline (FiCO2) and curare-cleft effort notches the plateau', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(ev3({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fico2: 6 }));
    await run(e, 40);
    const fi = numSeries(ev, 'imco2', 30, 40).map(([, v]) => v);
    expect(Math.min(...fi)).toBeGreaterThanOrEqual(5);
    const r = rig3({ patient: ADULT, sampling: 'mainstream' });
    r.e.dispatch(ev3({ kind: 'ventilation', source: 'ventilator', rr: 8, vtMl: 500, effort: 0.6 }));
    await run(r.e, 40);
    const x = read62(r.e, 'co2', 20, 40);
    let notch = 0; // deepest dip below the running plateau
    for (let k = 20; k < x.length; k++) if (x[k - 20]! > 25 && x[k]! > 5) notch = Math.max(notch, x[k - 20]! - x[k]!);
    expect(notch).toBeGreaterThanOrEqual(3);
  });
});
