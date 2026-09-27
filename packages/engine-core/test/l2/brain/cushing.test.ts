import { describe, expect, it } from 'vitest';
import { createCushing, cushingDMap, cushingHrFactor, stepCushing } from '../../../src/l2/brain/cushing.ts';

describe('Cushing response (tables §5.1)', () => {
  it('needs CPP < 40 for 30 s, then MAP +30–50 within 60 s and HR × 0.6 at full drive; ends 30 s after recovery', () => {
    const c = createCushing();
    for (let i = 0; i < 290; i++) stepCushing(c, 35, Infinity, 0.1);
    expect(c.active).toBe(false);
    for (let i = 0; i < 20; i++) stepCushing(c, 35, Infinity, 0.1);
    expect(c.active).toBe(true);
    for (let i = 0; i < 600; i++) stepCushing(c, 35, Infinity, 0.1);
    expect(cushingDMap(c)).toBeGreaterThanOrEqual(30);
    expect(cushingDMap(c)).toBeLessThanOrEqual(50);
    for (let i = 0; i < 1200; i++) stepCushing(c, 25, Infinity, 0.1);
    expect(cushingHrFactor(c)).toBeCloseTo(0.6, 2);
    for (let i = 0; i < 310; i++) stepCushing(c, 60, Infinity, 0.1);
    expect(c.active).toBe(false);
    for (let i = 0; i < 6000; i++) stepCushing(c, 60, Infinity, 0.1);
    expect(c.drive).toBe(0);
  });
  it('second trigger (tables): ICP within 10 mmHg of the head MAP for 30 s → full drive even while the pre-surge CPP is ≥ 40', () => {
    const c = createCushing();
    for (let i = 0; i < 310; i++) stepCushing(c, 45, 8, 0.1);
    expect(c.active).toBe(true);
    for (let i = 0; i < 1200; i++) stepCushing(c, 45, 8, 0.1);
    expect(c.drive).toBeGreaterThan(0.99);
  });
  it('a brief dip does not trigger it', () => {
    const c = createCushing();
    for (let i = 0; i < 200; i++) stepCushing(c, 30, Infinity, 0.1);
    for (let i = 0; i < 10; i++) stepCushing(c, 45, Infinity, 0.1);
    for (let i = 0; i < 200; i++) stepCushing(c, 30, Infinity, 0.1);
    expect(c.active).toBe(false);
  });
});
