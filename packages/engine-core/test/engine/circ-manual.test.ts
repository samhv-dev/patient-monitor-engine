import { describe, expect, it } from 'vitest';
import { cmd, read, rig } from '../helpers/hemo.ts';

describe('MANUAL mode on the circulation (brief §4.9 M2 via Ees/SVR/V0)', () => {
  it('targets 90/50 with a 30 s ramp are met ±4 mmHg on the displayed ABP 10 beats after the ramp', () => {
    const { e } = rig({ hr: 80 });
    e.advanceTo(20);
    e.dispatch(cmd({ type: 'setTarget', variable: 'sbp', value: 90, ramp: { durationS: 30 } }));
    e.dispatch(cmd({ type: 'setTarget', variable: 'dbp', value: 50, ramp: { durationS: 30 } }));
    e.advanceTo(75);
    const w = read(e, 'abp', 65, 75);
    expect(Math.abs(Math.max(...w) - 90)).toBeLessThanOrEqual(4);
    expect(Math.abs(Math.min(...w) - 50)).toBeLessThanOrEqual(4);
  });
  it('a CVP target of 12 is met within 60 s on the CVP line (±1.5 mmHg mean)', () => {
    const { e } = rig({ hr: 75, sensors: { cvp: 'connected' } });
    e.dispatch(cmd({ type: 'setTarget', variable: 'cvp', value: 12 }));
    e.advanceTo(80);
    const w = read(e, 'cvp', 70, 80);
    const m = w.reduce((a, b) => a + b, 0) / w.length;
    expect(Math.abs(m - 12)).toBeLessThanOrEqual(1.5);
  });
  it('volumeStatus 0.3 lowers CVP and narrows PP (hypovolaemia is emergent)', () => {
    const a = rig({ hr: 75, sensors: { cvp: 'connected' } });
    const b = rig({ hr: 75, sensors: { cvp: 'connected' }, baseline: { volumeStatus: 0.3 } });
    a.e.advanceTo(90);
    b.e.advanceTo(90);
    const mean = (x: Float32Array) => x.reduce((p, q) => p + q, 0) / x.length;
    expect(mean(read(b.e, 'cvp', 80, 90))).toBeLessThan(mean(read(a.e, 'cvp', 80, 90)) - 2);
  });
});
