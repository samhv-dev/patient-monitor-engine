import { describe, expect, it } from 'vitest';
import { createTonePlayer, harmonicTable, playAlarmPulse } from '../src/alarm-voice.ts';
import { IEC_STYLE } from '../src/profiles/index.ts';

/** Minimal Web Audio stand-in that records calls (same idea as tones.test.ts). */
function fakeCtx() {
  const calls: string[] = [];
  const param = (name: string) => ({
    value: 0,
    setValueAtTime: (v: number, t: number) => calls.push(`${name}.set ${v} @${+t.toFixed(4)}`),
    linearRampToValueAtTime: (v: number, t: number) => calls.push(`${name}.ramp ${+v.toFixed(4)} @${+t.toFixed(4)}`),
  });
  const node = (name: string) => ({
    frequency: param(`${name}.freq`),
    gain: param(`${name}.gain`),
    setPeriodicWave: () => calls.push(`${name}.wave`),
    connect(n: unknown) {
      return n;
    },
    disconnect: () => calls.push(`${name}.disconnect`),
    start: (w: number) => calls.push(`${name}.start ${w}`),
    stop: (w: number) => calls.push(`${name}.stop ${+w.toFixed(4)}`),
  });
  const ctx = { createOscillator: () => node('osc'), createGain: () => node('env'), createPeriodicWave: () => ({}) };
  return { ctx: ctx as unknown as BaseAudioContext, calls };
}

describe('alarm voices', () => {
  it('an alarm pulse has 15 ms linear rise and fall at the requested gain', () => {
    const { ctx, calls } = fakeCtx();
    playAlarmPulse(ctx, {} as AudioNode, 2, { freqHz: 880, durS: 0.15, gain: 0.5 }, IEC_STYLE.harmonicsDb, IEC_STYLE.rampMs);
    expect(calls).toContain('env.gain.ramp 0.5 @2.015');
    expect(calls).toContain('env.gain.set 0.5 @2.135');
    expect(calls).toContain('env.gain.ramp 0 @2.15');
    expect(calls).toContain('osc.start 2');
    expect(calls).toContain('osc.wave');
  });

  it('createTonePlayer dispatches by kind; unknown kinds play nothing; handles stop', () => {
    const { ctx, calls } = fakeCtx();
    const play = createTonePlayer(ctx, {} as AudioNode, { profile: IEC_STYLE, toneSet: 'lifepak-like' });
    const h = play({ t: 1, id: 'a', kind: 'alarm', freqHz: 660, durS: 0.2, gain: 0.3 } as never, 1);
    expect(calls).toContain('osc.start 1');
    h?.stop();
    expect(calls).toContain('env.disconnect');
    play({ t: 1, id: 'c', kind: 'charge', chargeS: 7 } as never, 3);
    expect(calls).toContain('osc.freq.ramp 1000 @10'); // LIFEPAK-like ramping charge tone, 400 → 1000 Hz over 7 s
    expect(play({ t: 1, id: 'q', kind: 'qrs', freqHz: 830 }, 4)).toBeDefined();
    expect(play({ t: 1, id: 'x', kind: 'mystery' }, 5)).toBeUndefined();
  });
  it('harmonic table: 0/−3/−6/−9/−12 dB', () => {
    const { imag } = harmonicTable([0, -3, -6, -9, -12]);
    expect(imag[0]).toBe(0);
    expect(imag[1]).toBeCloseTo(1, 6);
    expect(imag[5]).toBeCloseTo(10 ** (-12 / 20), 6);
  });
});
