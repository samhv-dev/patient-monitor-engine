import { describe, expect, it } from 'vitest';
import { bypassFlow, createLvad, lvadFlow, type BypassDevice } from '../../../src/l2/circ/devices.ts';
import { createCircModel, RESTING_ENV, type CircBeat } from '../../../src/l2/circ/model.ts';
import { collectBeats, driver, runTo } from '../../helpers/circ.ts';

describe('LVAD (tables §8.2)', () => {
  it('HQ curve: 5400 rpm gives 3.5–6.5 L/min against ΔP 20–60 mmHg; suction cuts flow', () => {
    const d = createLvad();
    d.on = true;
    for (const dp of [20, 60]) {
      const q = lvadFlow(d, 20, 20 + dp, 100) * 0.06;
      expect(q).toBeGreaterThan(3.5);
      expect(q).toBeLessThan(6.5);
    }
    const qs = lvadFlow(d, 20, 80, 30);
    expect(d.suction).toBe(true);
    expect(qs).toBeLessThan(0.5 * lvadFlow(createLvadOn(), 20, 80, 100));
  });
  it('HFrEF + LVAD 5400 rpm: pulse pressure falls below 25 mmHg and MAP holds ≥ 65', () => {
    const m = createCircModel({ ageY: 60, sex: 'M', weightKg: 80, conditions: [{ id: 'hfref' }] });
    const dr = driver(m);
    const d = createLvad();
    d.on = true;
    const all: CircBeat[] = [];
    const col = collectBeats(m, all);
    const env = { ...RESTING_ENV, qVad: (lvp: number, aop: number) => lvadFlow(d, lvp, aop, m.s[10]!) };
    for (let t = 0; t < 60; t += 1) {
      runTo(dr, t + 1, env);
      col();
    }
    const last = all.slice(-6);
    const pp = last.reduce((a, b) => a + b.sbp - b.dbp, 0) / last.length;
    const map = last.reduce((a, b) => a + b.map, 0) / last.length;
    expect(pp).toBeLessThan(25);
    expect(map).toBeGreaterThanOrEqual(65);
  }, 60_000);
  it('VA-ECMO / CPB are interfaces only until 7h', () => {
    const e: BypassDevice = { kind: 'vaEcmo', on: true, flowLpm: 4 };
    expect(() => bypassFlow(e, 5, 70)).toThrow(/7h/);
  });
  it.skip('7h: VA-ECMO pulsatility fades with flow fraction (tables §8.5) — marked for Stage 7h', () => {});
});

function createLvadOn() {
  const d = createLvad();
  d.on = true;
  return d;
}
