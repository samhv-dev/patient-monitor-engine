import { describe, expect, it } from 'vitest';
import { keepContextRunning, mapPerfToAudio, measureOutputLatency } from '../src/context.ts';

describe('audio context helpers', () => {
  it('maps perf ms to audio time through getOutputTimestamp when it is valid', () => {
    const r = { currentTime: 10.02, perfNow: 5000, baseLatency: 0.005, outputLatency: 0.016, ts: { contextTime: 10, performanceTime: 4990 } };
    expect(mapPerfToAudio(5100, r)).toBeCloseTo(10.11, 12);
  });

  it('fallback mapping SUBTRACTS base + output latency (review M6: it used to add baseLatency)', () => {
    const r = { currentTime: 10, perfNow: 5000, baseLatency: 0.005, outputLatency: 0.016, ts: { contextTime: 0, performanceTime: 0 } };
    // the sample at currentTime is heard base + output latency from now, so perf 5100 ↔ 10 + 0.1 − 0.021
    expect(mapPerfToAudio(5100, r)).toBeCloseTo(10.079, 12);
    expect(mapPerfToAudio(5100, { currentTime: 10, perfNow: 5000 })).toBeCloseTo(10.1, 12);
  });

  it('measures output latency: AudioContext.outputLatency, else from the output timestamp, else unknown', () => {
    expect(measureOutputLatency({ currentTime: 3, perfNow: 1000, outputLatency: 0.2 })).toBe(0.2);
    const ts = { contextTime: 2.97, performanceTime: 990 }; // output position now = 2.98 → 20 ms behind currentTime
    expect(measureOutputLatency({ currentTime: 3, perfNow: 1000, outputLatency: 0, ts })).toBeCloseTo(0.02, 12);
    expect(measureOutputLatency({ currentTime: 3, perfNow: 1000 })).toBeUndefined();
  });

  it('resumes a suspended/interrupted context on visibilitychange and pageshow, and reports interruptions (iOS)', async () => {
    const ctx = Object.assign(new EventTarget(), {
      state: 'running' as string,
      resumes: 0,
      resume() {
        this.resumes++;
        return Promise.resolve();
      },
    });
    const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
    const win = new EventTarget();
    let interrupted = 0;
    const stop = keepContextRunning(ctx, doc, win, () => interrupted++);
    ctx.state = 'interrupted';
    ctx.dispatchEvent(new Event('statechange'));
    expect(interrupted).toBe(1);
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(ctx.resumes).toBe(1);
    win.dispatchEvent(new Event('pageshow'));
    expect(ctx.resumes).toBe(2);
    ctx.state = 'running';
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(ctx.resumes).toBe(2);
    stop();
    ctx.state = 'suspended';
    win.dispatchEvent(new Event('pageshow'));
    expect(ctx.resumes).toBe(2);
  });
});
