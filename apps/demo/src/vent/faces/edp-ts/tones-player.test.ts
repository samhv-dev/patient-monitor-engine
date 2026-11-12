// Brief 202, tests first: the EDP-TS tones played through the project's audio package (@pme/audio's playAlarmPulse on
// the context its unlockAudio makes), each pulse at its offset in the train (research/57 A-10, A-18), a pure tone at
// face.json's pitch (eng until the owner's recording, VQ6), at the gain of the Sound setting (E-10). The tones' leaves:
// the pulse counts are the manual's (documented A-10, A-18); everything a pulse sounds like is a marked choice.
import type { AudioOut } from '@pme/audio';
import { describe, expect, it } from 'vitest';
import FACE from './face.json';
import { audioPackagePlayer, gainOf, train } from './tones.ts';

/** A stand-in AudioContext that records each oscillator's frequency, start and stop and its envelope's peak. */
function fakeOut(now = 3): { out: AudioOut; voices: Array<{ hz: number; start: number; stop: number; peak: number }> } {
  type Env = { peak: number; gain: object; connect: (d: unknown) => unknown; disconnect(): void };
  const voices: Array<{ hz: number; start: number; stop: number; env?: Env; readonly peak: number }> = [];
  const ctx = {
    currentTime: now,
    createPeriodicWave: () => ({}),
    createOscillator() {
      const v = { hz: 0, start: 0, stop: 0, env: undefined as Env | undefined, get peak() { return this.env?.peak ?? 0; } };
      voices.push(v);
      return {
        frequency: { set value(x: number) { v.hz = x; } },
        setPeriodicWave() {},
        connect: (g: Env) => { v.env = g; return g; },
        start(t: number) { v.start = t; },
        stop(t: number) { v.stop = t; },
      };
    },
    createGain() {
      const g: Env = {
        peak: 0,
        gain: { setValueAtTime: (x: number) => { g.peak = Math.max(g.peak, x); }, linearRampToValueAtTime: (x: number) => { g.peak = Math.max(g.peak, x); } },
        connect: (d) => d,
        disconnect() {},
      };
      return g;
    },
  };
  const out = { ctx, master: {}, perfToAudio: (x: number) => x / 1000, outputLatency: () => undefined, close() {} } as unknown as AudioOut;
  return { out, voices };
}

describe('the EDP-TS tones through @pme/audio', () => {
  it('a high train: 10 pulses, each at its offset after now, at face.json\'s pitch and the Sound setting\'s gain', () => {
    const { out, voices } = fakeOut(3);
    const p = train('high', 'active');
    audioPackagePlayer(out)(p, gainOf(50));
    expect(voices.length).toBe(10);
    voices.forEach((v, i) => {
      expect(v.hz).toBe(FACE.tones.high.freqHz.v);
      expect(v.start).toBeCloseTo(3 + 0.02 + p[i]!.atMs / 1000, 9);
      expect(v.stop - v.start).toBeGreaterThanOrEqual(p[i]!.durMs / 1000);
      expect(v.peak).toBeCloseTo(gainOf(50), 9);
    });
  });

  it('the leaves: the manual gives the pulse counts (A-10, A-18); the pitch, lengths, repeat and gain are marked choices until the recording (VQ6)', () => {
    const T = FACE.tones as Record<string, Record<string, { p: string; src: string; why?: string }> | { p: string; src: string; why?: string }>;
    for (const pr of ['high', 'medium', 'low']) {
      const l = T[pr] as Record<string, { p: string; src: string; why?: string }>;
      for (const k of ['pulses', 'groups', 'endPulses']) expect(l[k]!.p, `${pr}.${k}`).toBe('documented');
      for (const k of ['freqHz', 'repeatS']) { expect(l[k]!.p, `${pr}.${k}`).toBe('eng'); expect(l[k]!.why, `${pr}.${k}`).toMatch(/VQ6/); }
    }
    for (const k of ['pulseMs', 'gapMs', 'groupGapMs', 'gainMax']) expect((T[k] as { p: string }).p, k).toBe('eng');
  });
});
