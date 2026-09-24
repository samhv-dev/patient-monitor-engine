import { describe, expect, it } from 'vitest';
import { diffs, mean, runRhythm } from '../../helpers/rhythm.ts';
import { ksUniform } from '../../helpers/stats.ts';

describe('rhythm engine: AV blocks', () => {
  it('avb1: every P conducts with a constant PR of 280 ms', () => {
    const { beats, atrial } = runRhythm('avb1', 30, { mods: { hrvScale: 0 } });
    expect(atrial.every((a) => a.conducted)).toBe(true);
    expect(new Set(beats.map((b) => b.prMs))).toEqual(new Set([280]));
  });

  it('acceptance 5: Mobitz I — decreasing PR increments, one dropped P per group, pause < 2·PP', () => {
    const { beats, atrial } = runRhythm('avb2Mobitz1', 60, { mods: { hrvScale: 0 } }); // 4:3 at 75 bpm
    const pp = mean(diffs(atrial.map((a) => a.t)));
    // Split conducted beats into groups separated by a dropped P.
    const groups: number[][] = [];
    let cur: number[] = [];
    let bi = 0;
    for (const a of atrial) {
      if (a.conducted) {
        const b = beats[bi++];
        if (b) cur.push(b.prMs!);
      } else {
        if (cur.length) groups.push(cur);
        cur = [];
      }
    }
    const full = groups.slice(1).filter((g) => g.length === 3);
    expect(full.length).toBeGreaterThanOrEqual(10);
    for (const g of full) {
      const inc = diffs(g);
      for (let i = 1; i < inc.length; i++) expect(inc[i]!).toBeLessThan(inc[i - 1]!);
      expect(inc.every((x) => x > 0)).toBe(true);
    }
    // exactly one dropped P between consecutive groups
    const dropped = atrial.map((a) => a.conducted);
    for (let i = 1; i < dropped.length; i++) expect(dropped[i] === false && dropped[i - 1] === false).toBe(false);
    // the pause containing the dropped P is shorter than two P–P intervals
    const rr = diffs(beats.map((b) => b.t));
    const pause = Math.max(...rr);
    expect(pause).toBeLessThan(2 * pp);
    expect(beats.every((b) => b.origin === 'sinus')).toBe(true); // no escape beats at 75 bpm
  });

  it('acceptance 6: avb3Narrow — P–QRS interval uniformly spread (KS p > 0.05), ventricular rate 40–60', () => {
    const { beats, atrial } = runRhythm('avb3Narrow', 300, { seed: 6 });
    const pTimes = atrial.map((a) => a.t);
    const phases: number[] = [];
    for (const b of beats) {
      const onset = b.t - 0.04;
      let i = -1;
      for (let j = 0; j < pTimes.length && pTimes[j]! <= onset; j++) i = j;
      if (i < 0 || i + 1 >= pTimes.length) continue;
      phases.push((onset - pTimes[i]!) / (pTimes[i + 1]! - pTimes[i]!));
    }
    expect(phases.length).toBeGreaterThan(100);
    expect(ksUniform(phases).p).toBeGreaterThan(0.05);
    const vRate = 60 / mean(diffs(beats.map((b) => b.t)));
    expect(vRate).toBeGreaterThanOrEqual(40);
    expect(vRate).toBeLessThanOrEqual(60);
    expect(atrial.every((a) => !a.conducted)).toBe(true);
    expect(beats.every((b) => b.origin === 'junctional' && b.qrsMs < 120)).toBe(true);
  });

  it('avb3Wide: ventricular escape 20–40/min with wide QRS', () => {
    const { beats } = runRhythm('avb3Wide', 120);
    const vRate = 60 / mean(diffs(beats.map((b) => b.t)));
    expect(vRate).toBeGreaterThanOrEqual(20);
    expect(vRate).toBeLessThanOrEqual(40);
    expect(beats.every((b) => b.origin === 'ventricular' && b.qrsMs >= 120)).toBe(true);
  });
});
