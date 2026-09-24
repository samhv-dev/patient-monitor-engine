import { describe, expect, it } from 'vitest';
import { playBeep } from '../src/tones.ts';

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
