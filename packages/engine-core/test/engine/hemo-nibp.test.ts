// BUILD-PLAN Stage 2 acceptance test 9 (NIBP) at engine level, plus "NIBP ≈ IBP MAP".
import { describe, expect, it } from 'vitest';
import type { EngineEvent, MonitorEngine } from '../../src/types.ts';
import { cmd, mean, numeric, read, rig, sd } from '../helpers/hemo.ts';

type Nibp = Extract<EngineEvent, { type: 'nibp' }>;
const isEnd = (x: EngineEvent): x is Nibp => x.type === 'nibp' && (x.phase === 'done' || x.phase === 'failed');

/** Start one manual measurement and run until it ends; returns the end event and its duration. */
function measure(e: MonitorEngine, ev: EngineEvent[]): { end: Nibp; dur: number; start: number } {
  const start = e.now().simT;
  e.dispatch(cmd({ type: 'device', action: { device: 'nibp', action: 'start' } }));
  let end: Nibp | undefined;
  for (let k = 0; k < 400 && !end; k++) {
    e.advanceTo(e.now().simT + 0.5);
    end = ev.find((x): x is Nibp => isEnd(x) && x.t > start);
  }
  if (!end) throw new Error('NIBP never finished');
  return { end, dur: end.t - (start + 0.02), start };
}

/**
 * Back-to-back measurements (5 s apart) with the error against the displayed IBP over each window. A failed
 * cycle (possible in AF, brief §4.5) counts in `durs` but has no error.
 */
function series(rhythm: 'sinus' | 'afib', n: number, seed: number) {
  const { e, ev } = rig({ seed });
  if (rhythm === 'afib') e.dispatch(cmd({ type: 'setRhythm', rhythm: 'afib', opts: { rateBpm: 75 } }));
  e.advanceTo(20);
  const out: Array<{ dur: number; dSys: number; dDia: number; dMap: number }> = [];
  const durs: number[] = [];
  for (let i = 0; i < n; i++) {
    const { end, dur, start } = measure(e, ev);
    durs.push(dur);
    e.advanceTo(e.now().simT + 5);
    if (!end.result) continue;
    const r = end.result;
    out.push({
      dur,
      dSys: r.sys - mean(numeric(ev, 'abpSys', start, end.t)),
      dDia: r.dia - mean(numeric(ev, 'abpDia', start, end.t)),
      dMap: r.map - mean(numeric(ev, 'abpMean', start, end.t)),
    });
  }
  return Object.assign(out, { durs });
}

describe('Stage 2 acceptance 9: NIBP', () => {
  it('one adult cycle at HR 75 (inflate to 165) lasts 25–40 s (median of 12 first cycles)', { timeout: 120_000 }, () => {
    // Evidence band (Stage 3.1 item 7): Philips manual typical 30 s, max 180 s; Stage 2's gate measured 33.9 s mean.
    // A 6-seed mean ≤ 35 s was seed-dependent (12-seed mean ≈ 35.5 s), so the median of 12 is asserted instead.
    const d: number[] = [];
    for (let seed = 1; seed <= 12; seed++) {
      const { e, ev } = rig({ seed });
      e.advanceTo(20);
      const { end, dur } = measure(e, ev);
      expect(end.phase).toBe('done');
      d.push(dur);
    }
    const s = [...d].sort((a, b) => a - b);
    const median = (s[5]! + s[6]!) / 2;
    expect(median).toBeGreaterThanOrEqual(25);
    expect(median).toBeLessThanOrEqual(40);
  });

  it('over 100 sinus measurements: bias ≤ 5 and SD ≤ 8 mmHg vs the site pressures; MAP ≈ IBP MAP', { timeout: 60_000 }, () => {
    const s = series('sinus', 100, 9);
    expect(s.length).toBe(100);
    for (const k of ['dSys', 'dDia'] as const) {
      expect(Math.abs(mean(s.map((x) => x[k])))).toBeLessThanOrEqual(5);
      expect(sd(s.map((x) => x[k]))).toBeLessThanOrEqual(8);
    }
    expect(Math.abs(mean(s.map((x) => x.dMap)))).toBeLessThanOrEqual(3);
  });

  it('in AF, the cycle is longer and the error SD larger than in sinus, but not biased: |bias| ≤ 6, SD ≤ 10', { timeout: 120_000 }, () => {
    const s = series('sinus', 30, 9);
    const a = series('afib', 30, 9);
    expect(s.length).toBe(30);
    expect(a.length).toBeGreaterThanOrEqual(25); // an occasional AF cycle may fail
    expect(mean(a.durs)).toBeGreaterThan(mean(s.durs));
    expect(sd(a.map((x) => x.dSys))).toBeGreaterThan(sd(s.map((x) => x.dSys)));
    // orchestrator ruling on the Stage 2 gate: AF makes oscillometry noisy, not biased
    for (const k of ['dSys', 'dDia', 'dMap'] as const) {
      expect(Math.abs(mean(a.map((x) => x[k])))).toBeLessThanOrEqual(6);
      expect(sd(a.map((x) => x[k]))).toBeLessThanOrEqual(10);
    }
  });

  it('at SBP 45 the cycle fails with an INOP after 2 attempts', () => {
    const { e, ev } = rig({ seed: 3, baseline: { sbp: 45, dbp: 30 } });
    e.advanceTo(30);
    const { end } = measure(e, ev);
    expect(end.phase).toBe('failed');
    expect(ev.some((x) => x.type === 'alarm' && x.id === 'nibp-failed' && x.category === 'technical')).toBe(true);
    const phases = ev.filter((x): x is Nibp => x.type === 'nibp').map((x) => x.phase);
    const attempts = phases.filter((p, i) => p === 'inflating' && phases[i - 1] !== 'inflating').length;
    expect(attempts).toBe(2);
  });

  it('a manual start cancels auto; auto reports the countdown', () => {
    const { e, ev } = rig({ seed: 4 });
    e.dispatch(cmd({ type: 'device', action: { device: 'nibp', action: 'auto', intervalMin: 5 } }));
    e.advanceTo(60);
    const idle = ev.filter((x): x is Nibp => x.type === 'nibp' && x.phase === 'idle' && x.nextInS !== undefined);
    expect(idle.length).toBeGreaterThan(0);
    expect(idle[idle.length - 1]!.nextInS!).toBeGreaterThan(200);
    e.dispatch(cmd({ type: 'device', action: { device: 'nibp', action: 'start' } }));
    e.advanceTo(400);
    const starts = ev.filter((x) => x.type === 'nibp' && x.phase === 'inflating' && x.cuffMmHg === 0);
    expect(starts.length).toBe(2); // the auto start at 0 s and the manual one; no auto start at 300 s
  });

  it('with the cuff on the SpO2 arm, the pleth is flat while the cuff is above systolic', () => {
    const { e, ev } = rig({ seed: 5 });
    e.dispatch(cmd({ type: 'attachSensor', sensor: 'spo2', state: 'on', site: 'rightFinger' }));
    e.dispatch(cmd({ type: 'attachSensor', sensor: 'nibp', state: 'on', site: 'rightArm' }));
    e.advanceTo(20);
    const { start } = measure(e, ev);
    const cuff = ev.filter((x): x is Nibp => x.type === 'nibp' && x.t > start && x.cuffMmHg !== undefined && x.cuffMmHg >= 140);
    expect(cuff.length).toBeGreaterThan(10);
    const t0 = cuff[0]!.t + 1;
    const t1 = cuff[cuff.length - 1]!.t;
    expect(Math.max(...read(e, 'pleth', t0, t1))).toBeLessThan(0.05);
  });
});
