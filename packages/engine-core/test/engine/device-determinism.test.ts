// The device layer keeps replay exact (brief §3.3 "Determinism"): same seed + same commands → the same alarm,
// marker, tone and deviceStatus events; a snapshot taken mid-charge resumes identically.
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '../../src/types.ts';
import { cmd, devRig } from '../helpers/device.ts';

const DEVICE_TYPES = new Set(['alarm', 'alarmStatus', 'marker', 'deviceStatus', 'beat']);
function script(seed: number, snapAt?: number): EngineEvent[] {
  const { e, ev } = devRig('zoll-like', { seed, patient: { sensors: { abp: 'connected' } } });
  e.dispatch(cmd({ id: 'a', type: 'setRhythm', rhythm: 'vfCoarse' }));
  e.dispatch(cmd({ id: 'b', type: 'applyEvent', event: { kind: 'defib', action: 'charge', energyJ: 150 } }));
  e.advanceTo(3);
  if (snapAt !== undefined) {
    const snap = e.snapshot();
    const { e: e2, ev: ev2 } = devRig('zoll-like', { seed, patient: { sensors: { abp: 'connected' } } });
    e2.restore(snap);
    e2.advanceTo(7);
    e2.dispatch(cmd({ id: 'c', type: 'applyEvent', event: { kind: 'defib', action: 'shock' } }));
    e2.advanceTo(25);
    return ev2.filter((x) => DEVICE_TYPES.has(x.type));
  }
  e.advanceTo(7);
  e.dispatch(cmd({ id: 'c', type: 'applyEvent', event: { kind: 'defib', action: 'shock' } }));
  e.advanceTo(25);
  return ev.filter((x) => DEVICE_TYPES.has(x.type) && (x as { t: number }).t > 3);
}

describe('device layer determinism', () => {
  it('same seed and commands → identical device events', () => {
    expect(JSON.stringify(script(21))).toBe(JSON.stringify(script(21)));
  });
  it('a snapshot taken while charging resumes to the same events', () => {
    const whole = script(22);
    const resumed = script(22, 3);
    expect(JSON.stringify(resumed.filter((x) => (x as { t: number }).t > 3.02))).toBe(JSON.stringify(whole.filter((x) => (x as { t: number }).t > 3.02)));
  });
});
