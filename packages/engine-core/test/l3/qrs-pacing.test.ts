// R-51-3 (Stage 5.1 request, FU-1 item 4): the QRS detector must reject transcutaneous pacing artefacts (spike +
// polarisation tail) and count only captured complexes. Failure to capture → HR from the intrinsic beats (or 0).
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '../../src/types.ts';
import { cmd, devRig } from '../helpers/device.ts';

type Meas = Extract<EngineEvent, { type: 'measurement' }>;
const pacer = (mode: string, extra: Record<string, unknown> = {}) => cmd({ type: 'applyEvent', event: { kind: 'pacer', action: 'set', mode, ...extra } });

/** Median of the displayed HR numeric (engine measurement, not the device overlay) over [t0, t1]; null values → 0. */
function hrMedian(ev: EngineEvent[], t0: number, t1: number): number {
  const v = ev
    .filter((x): x is Meas => x.type === 'measurement' && x.values.hr !== undefined && x.t >= t0 && x.t <= t1)
    .map((m) => m.values.hr?.value ?? 0)
    .sort((a, b) => a - b);
  return v[Math.floor(v.length / 2)] as number;
}

describe('QRS detector with pacing artefacts (R-51-3)', () => {
  it('tcpCapture: avb3Wide + fixed 70 ppm at 90 mA → HR = the pacing rate (spike and complex counted once)', async () => {
    const { e, ev } = devRig('zoll-like', { patient: { rhythm: { id: 'avb3Wide' } } });
    e.dispatch(pacer('fixed', { ratePpm: 70, mA: 90 }));
    for (const t of [20, 40]) e.advanceTo(t), await new Promise<void>((r) => setImmediate(r));
    expect(Math.abs(hrMedian(ev, 20, 40) - 70)).toBeLessThanOrEqual(2);
  }, { timeout: 300_000 });

  it('tcpNoCapture: avb3Wide + fixed 70 ppm at 40 mA → HR = the 32 bpm escape rhythm, spikes not counted', async () => {
    const { e, ev } = devRig('zoll-like', { patient: { rhythm: { id: 'avb3Wide' } } });
    e.dispatch(pacer('fixed', { ratePpm: 70, mA: 40 }));
    for (const t of [20, 40]) e.advanceTo(t), await new Promise<void>((r) => setImmediate(r));
    expect(Math.abs(hrMedian(ev, 20, 40) - 32)).toBeLessThanOrEqual(5);
  }, { timeout: 300_000 });

  it('tcpNoCapture in asystole: 50 mA fixed pacing reads HR 0, not the pacing rate (the G5.1 observation)', async () => {
    const { e, ev } = devRig('zoll-like', { patient: { rhythm: { id: 'asystole' } } });
    e.dispatch(pacer('fixed', { ratePpm: 70, mA: 50 }));
    for (const t of [20, 40]) e.advanceTo(t), await new Promise<void>((r) => setImmediate(r));
    expect(hrMedian(ev, 20, 40)).toBe(0);
  }, { timeout: 300_000 });

  it('pacedVVI (implanted pacemaker) is unchanged: HR = the paced rate', async () => {
    const { e, ev } = devRig('zoll-like', { patient: { rhythm: { id: 'pacedVVI' } } });
    for (const t of [20, 40]) e.advanceTo(t), await new Promise<void>((r) => setImmediate(r));
    expect(Math.abs(hrMedian(ev, 20, 40) - 70)).toBeLessThanOrEqual(2);
  }, { timeout: 300_000 });
});
