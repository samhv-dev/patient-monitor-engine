// Stage 4b acceptance: transcutaneous pacing in the running engine (brief §6.5; BUILD-PLAN Stage 4 acceptance 5).
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '../../src/types.ts';
import { advanceYielding, beats, cmd, devRig, markers } from '../helpers/device.ts';

type Status = Extract<EngineEvent, { type: 'deviceStatus' }>;
const pacer = (mode: string, extra: Record<string, unknown> = {}) => cmd({ type: 'applyEvent', event: { kind: 'pacer', action: 'set', mode, ...extra } });

/** Systolic peaks in [t0, t1): local maxima over ±0.3 s in the upper half of the range (skips the dicrotic wave). */
function abpPulses(e: ReturnType<typeof devRig>['e'], t0: number, t1: number): number {
  const x = new Float32Array(Math.round((t1 - t0) * 125));
  e.readSamples('abp', Math.round(t0 * 125), x);
  const lo = Math.min(...x);
  const hi = Math.max(...x);
  if (hi - lo < 10) return 0;
  const w = Math.round(0.3 * 125);
  let n = 0;
  for (let i = w; i < x.length - w; i++) {
    const v = x[i] as number;
    if (v < lo + 0.5 * (hi - lo)) continue;
    let top = true;
    for (let j = i - w; j <= i + w && top; j++) if ((x[j] as number) > v) top = false;
    if (top) {
      n++;
      i += w;
    }
  }
  return n;
}

describe('transcutaneous pacer', () => {
  it('below threshold: spikes, no capture, intrinsic rhythm unchanged; at/above: paced wide QRS after every spike and ABP pulses at the pacing rate', async () => {
    const { e, ev } = devRig('zoll-like', { patient: { rhythm: { id: 'avb3Wide' }, sensors: { abp: 'connected' } } });
    e.dispatch(cmd({ type: 'setTarget', variable: 'paceThresholdMa', value: 70 })); // brief §6.5 default 70 mA [ENG]
    e.dispatch(pacer('fixed', { ratePpm: 70, mA: 40 }));
    e.advanceTo(30);
    const below = markers(ev, 'paceSpike').filter((m) => m.t > 5 && m.t < 30);
    expect(below.length).toBeGreaterThan(25);
    expect(below.every((m) => m.data?.captured === false && m.data?.tcp === true)).toBe(true);
    expect(beats(ev).filter((b) => b.t > 5 && b.origin === 'paced')).toEqual([]);
    const intrinsic = beats(ev).filter((b) => b.t > 5 && b.t < 30);
    expect(Math.abs((intrinsic.length / 25) * 60 - 32)).toBeLessThan(6); // the avb3Wide escape (32 bpm) goes on

    e.dispatch(pacer('fixed', { ratePpm: 70, mA: 90 }));
    await advanceYielding(e, 95);
    const spikes = markers(ev, 'paceSpike').filter((m) => m.t > 35 && m.t < 95);
    const paced = beats(ev).filter((b) => b.origin === 'paced' && b.t > 35);
    expect(spikes.every((m) => m.data?.captured === true)).toBe(true);
    for (const s of spikes) expect(paced.some((b) => b.t > s.t && b.t - s.t < 0.15)).toBe(true); // capture after 100 % of spikes
    expect(paced.every((b) => b.template === 'pacedV' && b.qrsMs >= 140 && b.mech.perfused)).toBe(true);
    expect(Math.abs(abpPulses(e, 85, 95) - (70 * 9.4) / 60)).toBeLessThanOrEqual(1); // Stage 2 ejects every captured beat
  }, { timeout: 300_000 });

  it('demand mode is inhibited by intrinsic beats; failure to sense paces asynchronously through them', async () => {
    const { e, ev } = devRig('zoll-like', { patient: { baseline: { hr: 80 } } });
    e.dispatch(pacer('demand', { ratePpm: 60, mA: 100 }));
    e.advanceTo(30);
    expect(markers(ev, 'paceSpike').filter((m) => m.t > 5)).toEqual([]);
    e.dispatch(pacer('demand', { ratePpm: 60, mA: 100, fault: 'failureToSense' }));
    await advanceYielding(e, 60);
    const asyn = markers(ev, 'paceSpike').filter((m) => m.t > 35 && m.t < 60);
    expect(Math.abs(asyn.length - 25)).toBeLessThanOrEqual(2);
    expect(beats(ev).filter((b) => b.t > 35 && b.origin === 'sinus').length).toBeGreaterThan(10);
  }, { timeout: 300_000 });

  it('failure to capture: spikes at any output, no paced beat; LIFEPAK-like HR dashes and PAUSE at 25 % of the rate', async () => {
    const { e, ev } = devRig('lifepak-like', { patient: { rhythm: { id: 'avb3Wide' } } });
    e.dispatch(pacer('fixed', { ratePpm: 80, mA: 140, fault: 'failureToCapture' }));
    e.advanceTo(20);
    expect(markers(ev, 'paceSpike').length).toBeGreaterThan(15);
    expect(beats(ev).filter((b) => b.origin === 'paced')).toEqual([]);
    const st = ev.filter((x): x is Status => x.type === 'deviceStatus').pop()!;
    expect(st.hrDashes).toBe(true);
    e.dispatch(pacer('fixed', { ratePpm: 80, mA: 140, fault: 'none', pause: true }));
    await advanceYielding(e, 80);
    const paused = markers(ev, 'paceSpike').filter((m) => m.t > 21 && m.t < 80);
    expect(Math.abs(paused.length - 20 * (59 / 60))).toBeLessThanOrEqual(2); // 80 × 25 % = 20 ppm
  }, { timeout: 300_000 });
});
