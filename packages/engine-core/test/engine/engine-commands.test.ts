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

  it('a command every tick (slider drag) still gives exactly one tone per R and never re-posts a live tone (review H3)', () => {
    const e = createEngine({ seed: 7 });
    const ev = collect(e);
    let i = 0;
    for (let t = 0; t <= 30; t += 0.02) {
      e.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 75 }, `drag-${i++}`));
      e.advanceTo(t);
    }
    // Web Audio cannot un-schedule a tone it already has, so the engine must post each R's tone exactly once.
    const tones = ev.filter((x) => x.type === 'tone').map((x) => (x as { t: number }).t);
    expect(ev.filter((x) => x.type === 'toneCancel')).toHaveLength(0); // nothing in flight changed
    const beats = ev.filter((x) => x.type === 'beat' && x.t > 3 && x.t < 29.5).map((x) => (x as { t: number }).t);
    expect(beats.length).toBeGreaterThan(25);
    for (const r of beats) expect(tones.filter((t) => t > r && t < r + 0.1)).toHaveLength(1);
  });

  it('a command that changes the in-flight detections cancels exactly the stale tones, by id', () => {
    const e = createEngine({ seed: 7 });
    const ev = collect(e);
    let i = 0;
    for (let t = 0; t <= 30; t += 0.02) {
      if (i % 37 === 0) {
        const value = (i / 37) % 2 === 1 ? 'diagnostic' : 'monitor';
        e.dispatch(cmd({ type: 'device', action: { device: 'ecg', action: 'filter', value } }, `f-${i}`));
      }
      i++;
      e.advanceTo(t);
    }
    const live = new Map<string, number>();
    for (const x of ev) {
      if (x.type === 'tone') {
        expect(live.has(x.id)).toBe(false); // never re-posted while live
        live.set(x.id, x.t);
      } else if (x.type === 'toneCancel') {
        expect(x.ids).toBeDefined();
        for (const id of x.ids!) expect(live.delete(id)).toBe(true); // only tones that were posted
      }
    }
    const tones = [...live.values()].sort((a, b) => a - b);
    for (let k = 1; k < tones.length; k++) expect(tones[k]! - tones[k - 1]!).toBeGreaterThan(0.2); // no double beeps
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
