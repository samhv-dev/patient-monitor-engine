import { describe, expect, it } from 'vitest';
import { cmd, read, rig } from '../helpers/hemo.ts';

describe('PV-loop teaching channels', () => {
  it('are absent by default and appear at 125 Hz when the pv sensor is on', () => {
    const { e } = rig();
    e.advanceTo(2);
    expect(e.latestSampleIndex('lvp')).toBe(-1);
    e.dispatch(cmd({ type: 'attachSensor', sensor: 'pv', state: 'on' }));
    e.advanceTo(20);
    expect(e.sampleRate('lvv')).toBe(125);
    const p = read(e, 'lvp', 10, 20);
    const v = read(e, 'lvv', 10, 20);
    expect(Math.max(...p)).toBeGreaterThan(95);
    expect(Math.min(...p)).toBeLessThan(10);
    expect(Math.max(...v) - Math.min(...v)).toBeGreaterThan(50); // stroke volume
    expect(Math.max(...read(e, 'rvp', 10, 20))).toBeGreaterThan(18);
  });
});
