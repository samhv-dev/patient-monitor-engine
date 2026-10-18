import { describe, expect, it } from 'vitest';
import { beepEnvelope, beepMsAt, BEEP_MS, playBeep } from '../src/tones.ts';

/** Minimal Web Audio stand-in that records calls. */
function fakeCtx() {
  const calls: string[] = [];
  const param = { value: 0, setValueAtTime: () => undefined, linearRampToValueAtTime: () => undefined };
  const node = (name: string) => ({
    frequency: param,
    gain: param,
    setPeriodicWave: () => undefined,
    connect(n: unknown) {
      return n;
    },
    disconnect: () => calls.push(`${name}.disconnect`),
    start: (w: number) => calls.push(`${name}.start ${w}`),
    stop: (w: number) => calls.push(`${name}.stop ${w}`),
  });
  const ctx = { createOscillator: () => node('osc'), createGain: () => node('env'), createPeriodicWave: () => ({}) };
  return { ctx: ctx as unknown as BaseAudioContext, calls };
}

describe('playBeep', () => {
  it('returns a handle whose stop() silences a beep that is already scheduled', () => {
    const { ctx, calls } = fakeCtx();
    const h = playBeep(ctx, {} as AudioNode, 5, 880);
    expect(calls[0]).toBe('osc.start 5');
    expect(calls).toHaveLength(2); // start + the scheduled stop
    h.stop();
    expect(calls).toContain('env.disconnect');
  });
});

describe('the beep length caps at 60 % of the wall-clock beat interval (beats never run together)', () => {
  it('HR 80 ×1 → 100 ms; HR 60 ×1 → 100 ms; HR 150 ×4 → 60 ms', () => {
    expect(BEEP_MS).toBe(100);
    expect(beepMsAt(80, 1)).toBe(100);
    expect(beepMsAt(60, 1)).toBe(100);
    expect(beepMsAt(150, 4)).toBeCloseTo(60, 9);
  });

  it('shortens only when beats come fast, never below its two 5 ms ramps; no rate, no cap', () => {
    expect(beepMsAt(100, 4)).toBe(90); // 0.6 × 0.6 s / 4
    expect(beepMsAt(360, 1)).toBe(100);
    expect(beepMsAt(1000, 4)).toBe(10);
    expect(beepMsAt(0, 4)).toBe(100);
    expect(beepMsAt(Number.NaN, 4)).toBe(100);
  });

  it('playBeep plays the given length (the fast-forward cue keeps the default)', () => {
    const { ctx, calls } = fakeCtx();
    expect(playBeep(ctx, {} as AudioNode, 5, 1245, 0.25, 60).endsAt).toBeCloseTo(5.07, 12);
    expect(Number(calls[1]!.replace('osc.stop ', ''))).toBeCloseTo(5.07, 12);
    expect(beepEnvelope(0.5, 60).at(-1)).toEqual([0.06, 0]);
    expect(playBeep(ctx, {} as AudioNode, 5, 660).endsAt).toBeCloseTo(5.11, 12);
  });
});
