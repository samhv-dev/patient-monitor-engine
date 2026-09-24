import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { Command, EngineEvent } from '../../src/types.ts';

function cmd(c: Record<string, unknown>, id = 'c'): Command {
  return { id, issuedBy: 'test', ...c } as Command;
}

function collect(e: ReturnType<typeof createEngine>) {
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  return ev;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('engine commands', () => {
  it('dispatch accepts Stage 1 commands for the next tick and rejects the rest with a reason', () => {
    const e = createEngine();
    expect(e.dispatch(cmd({ type: 'setRhythm', rhythm: 'afib' }))).toEqual({ accepted: true, tick: 1 });
    expect(e.dispatch(cmd({ type: 'setTarget', variable: 'sbp', value: 90 })).accepted).toBe(false);
    expect(e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse' })).reason).toMatch(/unknown rhythm/);
    expect(e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'cpr', active: true } })).accepted).toBe(false);
    expect(e.dispatch(cmd({ type: 'device', action: { device: 'ecg', action: 'filter', value: 'surgical' } })).accepted).toBe(false);
    expect(e.dispatch(cmd({ type: 'setModifiers', modifiers: { bbb: 'lbbb' } })).accepted).toBe(false);
    expect(e.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 100, atTick: 50 })).tick).toBe(50);
  });

  it('setRhythm now: the new rhythm starts within one look-ahead window', () => {
    const e = createEngine({ seed: 5 });
    const ev = collect(e);
    e.advanceTo(10);
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vtMono' }));
    e.advanceTo(20);
    const firstVt = ev.find((x) => x.type === 'beat' && x.origin === 'ventricular') as { t: number } | undefined;
    expect(firstVt).toBeDefined();
    expect(firstVt!.t).toBeGreaterThan(10);
    expect(firstVt!.t).toBeLessThan(10.6);
    const after = ev.filter((x) => x.type === 'beat' && x.t > 11);
    expect(after.every((b) => b.type === 'beat' && b.origin === 'ventricular')).toBe(true);
  });

  it("setRhythm nextBeat: switches right after the next ventricular beat", () => {
    const e = createEngine({ seed: 5 });
    const ev = collect(e);
    e.advanceTo(10);
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'asystole', when: 'nextBeat' }));
    e.advanceTo(20);
    const beatsAfter = ev.filter((x) => x.type === 'beat' && x.t > 10.02);
    expect(beatsAfter.length).toBeGreaterThanOrEqual(1);
    expect(beatsAfter.length).toBeLessThanOrEqual(2); // already-planned beat(s) inside the planning window
  });

  it('setTarget hr with a 10 s linear ramp raises the rate gradually', () => {
    const e = createEngine({ seed: 6, patient: { baseline: { hr: 60 } } });
    e.dispatch(cmd({ type: 'setModifiers', modifiers: { hrvScale: 0 } }));
    const beats: number[] = [];
    e.on((x) => x.type === 'beat' && beats.push(x.t), ['beat']);
    e.advanceTo(10);
    e.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 120, ramp: { durationS: 10, curve: 'linear' } }));
    e.advanceTo(30);
    const rrAt = (t: number) => {
      const i = beats.findIndex((b) => b > t);
      return beats[i]! - beats[i - 1]!;
    };
    expect(rrAt(9)).toBeCloseTo(1, 3);
    expect(rrAt(15.2)).toBeGreaterThan(0.6);
    expect(rrAt(15.2)).toBeLessThan(0.85);
    expect(rrAt(25)).toBeCloseTo(0.5, 3);
  });

  it('an accepted command emits toneCancel at the command tick and tones are re-posted after it', () => {
    const e = createEngine({ seed: 7 });
    const ev = collect(e);
    for (let t = 0; t <= 5; t += 0.02) e.advanceTo(t);
    e.dispatch(cmd({ type: 'setModifiers', modifiers: { pvc: { pattern: 'bigeminy', probability: 0 } } }));
    e.advanceTo(5.02);
    const cancel = ev.find((x) => x.type === 'toneCancel');
    expect(cancel).toEqual({ type: 'toneCancel', after: 5.02 });
    for (let t = 5.04; t <= 10; t += 0.02) e.advanceTo(t);
    const tonesAfter = ev.filter((x) => x.type === 'tone' && x.t > 5.02);
    expect(tonesAfter.length).toBeGreaterThan(3);
  });

  it('filter and lead device actions change the displayed channels', () => {
    const e = createEngine({ seed: 8 });
    e.dispatch(cmd({ type: 'device', action: { device: 'ecg', action: 'lead', value: 'V1', lane: 1 } }));
    e.advanceTo(2);
    expect(e.latestSampleIndex('V1')).toBe(1050);
    expect(e.latestSampleIndex('V5')).toBe(-1);
  });

  it('snapshot → restore reproduces the same samples (engine state only) and is JSON-safe', () => {
    const e = createEngine({ seed: 9 });
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'afib' }));
    e.advanceTo(10);
    const snap = JSON.parse(JSON.stringify(e.snapshot()));
    e.advanceTo(20);
    const a = new Float32Array(5000);
    e.readSamples('ecgII', 5001, a);
    e.restore(snap);
    expect(e.now().tick).toBe(500);
    e.advanceTo(20);
    const b = new Float32Array(5000);
    e.readSamples('ecgII', 5001, b);
    expect(Array.from(b)).toEqual(Array.from(a));
  });

  it('start / pause / setTimeScale / step drive the internal wall-clock pump', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] });
    const e = createEngine();
    expect(() => e.setTimeScale(8)).toThrow(RangeError);
    e.start();
    vi.advanceTimersByTime(1000);
    expect(e.now().tick).toBeGreaterThanOrEqual(49);
    expect(e.now().tick).toBeLessThanOrEqual(50);
    e.setTimeScale(2);
    const t0 = e.now().tick;
    vi.advanceTimersByTime(1000);
    expect(e.now().tick - t0).toBeGreaterThanOrEqual(99);
    e.pause();
    const t1 = e.now().tick;
    vi.advanceTimersByTime(1000);
    expect(e.now().tick).toBe(t1);
    e.step(3);
    expect(e.now().tick).toBe(t1 + 3);
    e.resume();
    vi.advanceTimersByTime(100);
    expect(e.now().tick).toBeGreaterThan(t1 + 3);
  });
});
