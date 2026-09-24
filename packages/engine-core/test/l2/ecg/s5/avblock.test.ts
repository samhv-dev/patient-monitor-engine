import { describe, expect, it } from 'vitest';
import { diffs, run5 } from '../../../helpers/s5.ts';

describe('Stage 5 rhythms: Mobitz II, 2:1, high grade (acceptance 5)', () => {
  it('avb2Mobitz2 4:3: constant PR, one sudden drop per group with no PR change before it', () => {
    const { beats, atrial } = run5('avb2Mobitz2', 60, { mods: { hrvScale: 0 } });
    expect(new Set(beats.map((b) => b.prMs)).size).toBe(1);
    const c = atrial.map((a) => a.conducted);
    expect(c.filter((x) => !x).length).toBeGreaterThanOrEqual(15);
    for (let i = 1; i < c.length; i++) expect(!c[i] && !c[i - 1]).toBe(false); // never 2 consecutive drops
  });

  it('avb2to1: every other P conducted, constant PR, ventricular rate = half the atrial rate', () => {
    const { beats, atrial } = run5('avb2to1', 60, { mods: { hrvScale: 0 } });
    atrial.forEach((a, i) => expect(a.conducted).toBe(i % 2 === 0));
    expect(new Set(beats.map((b) => b.prMs)).size).toBe(1);
    expect(60 / (diffs(beats.map((b) => b.t)).reduce((a, b) => a + b, 0) / (beats.length - 1))).toBeCloseTo(40, 0);
  });

  it('avbHighGrade 3:1 and 4:1: ≥ 2 consecutive dropped P, constant PR', () => {
    for (const ratio of [3, 4] as const) {
      const { beats, atrial } = run5('avbHighGrade', 60, { mods: { hrvScale: 0 }, rhythmOpts: { ratio } });
      atrial.forEach((a, i) => expect(a.conducted).toBe(i % ratio === 0));
      expect(new Set(beats.map((b) => b.prMs)).size).toBe(1);
      expect(beats.every((b) => b.origin === 'sinus')).toBe(true);
    }
  });
});
