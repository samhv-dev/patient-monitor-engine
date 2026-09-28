// FU-5 monitor-fidelity suite items 5, 12, 13 (research/10 §13): ECG leads off, HR response per skin, the rhythm tour.
// Sources: research/05 §6 [S1] p. 50 and [S2] IFU p. 55, 97–99, 108 (LEADS OFF "-?-", Alarm Source Auto, arrhythmia
// chaining); brief §6.1 and IEC 60601-2-27 (HR response < 11 s; Philips 6.8 s); research/06 §4.1 (B9: 6 s / 8 s at the
// 8 s window).
import { describe, expect, it } from 'vitest';
import { activeIds, M, monitorRun, VENTED, type MonRun, type Step } from '../helpers/monitor.ts';

const settle = (run: MonRun, from: number, target: number) => (run.rows.find((r) => r.t >= from && Math.abs((r.m.hr?.value ?? 0) - target) <= 0.05 * target)?.t ?? Infinity) - from;

describe('FU-5 fidelity 5: ECG leads off', () => {
  it.each(['philips-like', 'mindray-like', 'saadat-like'])('%s: HR invalid within 2 s (never "0"), LEADS OFF active; no HR alarm within 15 s of reconnection', async (skin) => {
    const run = await monitorRun({ mode: 'manual', skin, tEnd: 140, steps: [...VENTED, [60, M.sensor('ecg', 'off')], [120, M.sensor('ecg', 'on')]] });
    const off = run.rows.filter((r) => r.t > 62 && r.t <= 120);
    expect(off.filter((r) => r.m.hr?.value === 0).map((r) => r.t)).toEqual([]);
    expect(off.every((r) => r.m.hr?.flag === 'invalid' && activeIds(r).includes('ecgLeadsOff'))).toBe(true);
    expect(run.alarms.filter((a) => a.state === 'raised' && /^(HR_|EXTREME_)/.test(a.id) && a.t >= 120 && a.t <= 135).map((a) => a.id)).toEqual([]);
  }, 120_000);

  it('mindray-like (HR/PR Alarm Source Auto, [S4] App. C.1.1.1 / C.1.3; review ruling 5): with the leads off the pulse is the alarm source — "**Pulse 130>120"', async () => {
    const run = await monitorRun({ mode: 'manual', skin: 'mindray-like', tEnd: 110, steps: [...VENTED, [60, M.sensor('ecg', 'off')], [70, M.target('hr', 130)]] });
    const hi = run.alarms.find((a) => a.id === 'HR_HIGH' && a.state === 'raised' && a.t > 60);
    expect(hi?.text).toBe('**Pulse 130>120');
    expect(run.rows.filter((r) => r.t > 62).every((r) => r.m.hr?.flag === 'invalid')).toBe(true);
  }, 120_000);

  it('philips-like: LEADS OFF stays active beside a red APNEA (the bar rotates it in: renderer Task 12, e2e Task 16)', async () => {
    const run = await monitorRun({ mode: 'modeled', tEnd: 165, steps: [...VENTED, [60, M.ventOff()], [100, M.sensor('ecg', 'off')], [160, M.sensor('ecg', 'on')]] });
    const both = run.rows.filter((r) => r.t > 101 && r.t < 160);
    expect(both.every((r) => activeIds(r).includes('ecgLeadsOff') && activeIds(r).includes('apnoea-co2'))).toBe(true);
  }, 120_000);
});

describe('FU-5 fidelity 12: HR response per skin (MANUAL steps 80 → 120 → 40 → 80)', () => {
  it.each(['philips-like', 'mindray-like', 'saadat-like'])('%s: every step within 11 s (IEC 60601-2-27)', async (skin) => {
    const run = await monitorRun({ mode: 'manual', skin, tEnd: 240, steps: [...VENTED, [2, M.target('hr', 80)], [60, M.target('hr', 120)], [120, M.target('hr', 40)], [180, M.target('hr', 80)]] });
    for (const [from, to] of [[60, 120], [120, 40], [180, 80]] as const) expect(settle(run, from, to)).toBeLessThanOrEqual(11);
  }, 120_000);
  it('philips-like: 80 → 120 within 6.8 ± 2 s (research/05 §2.4, brief §6.1)', async () => {
    const run = await monitorRun({ mode: 'manual', tEnd: 90, steps: [...VENTED, [2, M.target('hr', 80)], [60, M.target('hr', 120)]] });
    expect(settle(run, 60, 120)).toBeLessThanOrEqual(8.8);
  }, 120_000);
  it.fails('saadat-like: 80 → 120 within 8 s (B9 manual M p. 65–66: 6 s at the 8 s averaging window, research/06 §4.1; ± 2 s as philips-like) — measured 9 s (the review measured 10 s to its settle rule; Orchestrator ruling (FU-5 review), 2026-09-28, ruling 5)', async () => {
    const run = await monitorRun({ mode: 'manual', skin: 'saadat-like', tEnd: 90, steps: [...VENTED, [2, M.target('hr', 80)], [60, M.target('hr', 120)]] });
    expect(settle(run, 60, 120)).toBeLessThanOrEqual(8);
  }, 120_000);
});

describe('FU-5 fidelity 13: rhythm tour, one arrhythmia alarm at a time', () => {
  const tour: Step[] = [
    [60, M.rhythm('sinus', { rateBpm: 30 })], [120, M.rhythm('sinusBrady', { rateBpm: 35 })], [180, M.rhythm('junctionalEscape', { rateBpm: 40 })],
    [240, M.rhythm('afib', { rateBpm: 140 })], [300, M.rhythm('vtMono', { rateBpm: 180 })], [360, M.rhythm('sinus', { rateBpm: 75 })],
    [420, M.rhythm('avb3Wide', { rateBpm: 32 })], [480, M.rhythm('pacedVVI', { pacer: { ratePpm: 70 } })], [540, M.rhythm('sinusTachy', { rateBpm: 187 })], [600, M.rhythm('sinus', { rateBpm: 75 })],
  ];
  const LETHAL = ['ASYSTOLE', 'VFIB', 'VTAC', 'EXTREME_BRADY', 'EXTREME_TACHY'];
  it.each([['philips-like', false], ['philips-like', true], ['mindray-like', true], ['saadat-like', false]] as const)(
    '%s (arrhythmia analysis %s): VTAC ≤ 3 s after VT 180; at most one live lethal/extreme alarm at a time; a PAUSE stays ≥ 5 s',
    async (skin, arrOn) => {
      const run = await monitorRun({ mode: 'manual', skin, tEnd: 660, steps: [...VENTED, ...(arrOn ? [[2, M.alarm('arrhythmiaAnalysis', { value: true })] as Step] : []), ...tour] });
      const vt = run.alarms.find((a) => a.id === 'VTAC' && a.state === 'raised' && a.t >= 300);
      expect((vt?.t ?? Infinity) - 300).toBeLessThanOrEqual(3);
      expect(Math.max(...run.rows.map((r) => r.active.filter((a) => LETHAL.includes(a.id) && !a.latched).length))).toBeLessThanOrEqual(1);
      const p = run.alarms.filter((a) => a.id === 'PAUSE');
      for (let i = 0; i + 1 < p.length; i++) if (p[i]?.state === 'raised' && p[i + 1]?.state === 'cleared') expect((p[i + 1] as { t: number }).t - (p[i] as { t: number }).t).toBeGreaterThanOrEqual(5 - 1e-6);
    },
    120_000,
  );
});
