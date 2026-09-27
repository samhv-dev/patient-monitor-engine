import { describe, expect, it } from 'vitest';
import { cmd, numeric, read, rig } from '../helpers/hemo.ts';

describe('arrest and CPR on the circulation', () => {
  it('asystole: ABP decays to a flat 8–20 mmHg plateau (≈ Pmsf; A7 band 10–20) within 20 s', () => {
    const { e } = rig();
    e.advanceTo(10);
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'asystole' }));
    e.advanceTo(40);
    const w = read(e, 'abp', 36, 40);
    expect(Math.max(...w) - Math.min(...w)).toBeLessThan(1);
    expect(Math.min(...w)).toBeGreaterThanOrEqual(8);
    expect(Math.max(...w)).toBeLessThanOrEqual(20);
  });
  it('CPR 110/min at quality 0.8 makes compression pulses with SBP 60–110 and DBP 10–30; CO 1–2.5 L/min', () => {
    const { e, ev } = rig();
    e.advanceTo(10);
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'asystole' }));
    e.advanceTo(30);
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 0.8 } }));
    e.advanceTo(60);
    const w = read(e, 'abp', 50, 60);
    expect(Math.max(...w)).toBeGreaterThanOrEqual(60);
    expect(Math.max(...w)).toBeLessThanOrEqual(110);
    expect(Math.min(...w)).toBeGreaterThanOrEqual(10);
    expect(Math.min(...w)).toBeLessThanOrEqual(30);
    const circ = ev.filter((x) => x.type === 'circ').at(-1) as { co: number } | undefined; // needs Task 19 (the circ event)
    expect(circ?.co ?? 0).toBeGreaterThan(1);
    expect(circ?.co ?? 0).toBeLessThan(2.5);
    expect(numeric(ev, 'pr', 55, 60).at(-1)).toBeCloseTo(110, -1);
  });
});
