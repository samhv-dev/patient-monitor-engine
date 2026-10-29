import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { createWaveNumerics, numericsStep } from '../../../src/l3/pressure-numerics/numerics.ts';
import { createPulseDet, pulseRate, pulseStep } from '../../../src/l3/pulse/detector.ts';

/** A crude arterial-like wave: fast rise, slow fall, a dicrotic bump; period RR s. */
function wave(t: number, rr: number): number {
  const u = (t % rr) / rr;
  const up = u < 0.12 ? u / 0.12 : Math.exp(-(u - 0.12) * 3);
  const bump = 0.25 * Math.exp(-(((u - 0.4) / 0.05) ** 2));
  return 80 + 40 * (up + bump);
}

describe('l3/pulse detector (slope sum, Zong 2003)', () => {
  it('finds one foot per beat, near the true foot, and ignores the dicrotic wave', () => {
    const st = createPulseDet(3);
    const feet: number[] = [];
    for (let n = 0; n < 125 * 20; n++) {
      const f = pulseStep(st, wave(n / 125, 0.8));
      if (f >= 0) feet.push(f / 125);
    }
    expect(feet.length).toBeGreaterThanOrEqual(24);
    expect(feet.length).toBeLessThanOrEqual(25);
    for (const f of feet.slice(2)) expect(Math.abs(f - Math.round(f / 0.8) * 0.8)).toBeLessThan(0.03);
    expect(pulseRate(feet)).toBeCloseTo(75, 0);
  });

  it('a flat line gives no pulses', () => {
    const st = createPulseDet(3);
    for (let n = 0; n < 1000; n++) expect(pulseStep(st, 12)).toBe(-1);
  });
});

/**
 * A radial-like pulse of unit rise at onset u = 0 (s): an 80 ms upstroke, the systolic run-off, the dicrotic notch and
 * wave (`dicrotic` scales the wave; the engine's displayed radial line shows one of 0.3–0.45 of the pulse, research
 * ibp-missed-foot-diag), then a diastolic tail. Beats superpose, as pressure waves do on a Windkessel.
 */
function pulse(u: number, dicrotic: number): number {
  if (u <= 0) return 0;
  if (u < 0.08) return 0.5 * (1 - Math.cos((Math.PI * u) / 0.08));
  const v = u - 0.08;
  return Math.exp(-((v / 0.15) ** 2)) + 0.25 * Math.exp(-v / 1.2) * (1 - Math.exp(-v / 0.05)) + dicrotic * Math.exp(-(((u - 0.36) / 0.045) ** 2));
}
type B = { t: number; a: number };
const art = (beats: readonly B[], dicrotic = 0.4) => (t: number) => 60 + beats.reduce((s, b) => s + b.a * pulse(t - b.t, dicrotic), 0);
function feetRun(x: (t: number) => number, seconds: number, searchBack: boolean): number[] {
  const st = createPulseDet(3);
  const feet: number[] = [];
  for (let n = 0; n < 125 * seconds; n++) {
    const f = pulseStep(st, x(n / 125), searchBack);
    if (f >= 0) feet.push(f / 125);
  }
  return feet;
}
/** The feet with or without the search-back; `sb`: the feet the search-back adds to the detection path's. */
function feetOf(x: (t: number) => number, seconds: number, searchBack = true): { feet: number[]; sb: number[] } {
  const feet = feetRun(x, seconds, searchBack);
  if (!searchBack) return { feet, sb: [] };
  const off = feetRun(x, seconds, false);
  return { feet, sb: feet.filter((f) => !off.includes(f)) };
}
/** Every foot lies at a beat's onset (± 40 ms): the detector invents no pulse. */
const noInvented = (feet: readonly number[], beats: readonly B[]) => feet.filter((f) => !beats.some((b) => Math.abs(b.t - f) <= 0.04));

describe('search-back for a missed pulse (Pan & Tompkins 1985) with Li 2010\'s shape test', () => {
  it('a small upstroke after large beats, under 60 % of the SSF peaks, is recovered at its onset', () => {
    // 0.6 s beats of 40 mmHg; at 6.5 s one of 20 mmHg: its SSF peak is under 60 % of the others', so the interval
    // 5.9–7.1 s spans two beats (> 166 % of 0.6 s)
    const beats: B[] = [];
    for (let t = 0.5; t < 12; t += 0.6) beats.push({ t, a: Math.abs(t - 6.5) < 0.01 ? 20 : 40 });
    const { feet, sb } = feetOf(art(beats), 12);
    expect(noInvented(feet, beats)).toEqual([]);
    expect(sb).toHaveLength(1);
    expect(sb[0]).toBeCloseTo(6.5, 1);
    for (const b of beats.slice(2)) expect(feet.some((f) => Math.abs(f - b.t) <= 0.04)).toBe(true);
  });

  it('two missed upstrokes in a row are both recovered, the earlier one after the larger later one (the split interval is searched on both sides)', () => {
    // 0.6 s beats of 40 mmHg; at 6.5 s and 7.1 s two small beats, the later one the larger: the search-back takes the
    // candidates largest first, so it finds 7.1 s first and must still search 5.9–7.1 s for the beat at 6.5 s
    const beats: B[] = [];
    for (let t = 0.5; t < 12; t += 0.6) beats.push({ t, a: Math.abs(t - 6.5) < 0.01 ? 18 : Math.abs(t - 7.1) < 0.01 ? 22 : 40 });
    const off = feetOf(art(beats), 12, false);
    expect(off.feet.filter((f) => f > 6.2 && f < 7.4)).toEqual([]); // the detection path misses both
    const { feet, sb } = feetOf(art(beats), 12);
    expect(noInvented(feet, beats)).toEqual([]);
    expect(sb.map((f) => Math.round(f * 10) / 10)).toEqual([6.5, 7.1]);
    for (const b of beats.slice(2)) expect(feet.some((f) => Math.abs(f - b.t) <= 0.04)).toBe(true);
  });

  it('a genuine long diastole stays one interval: HR 120 → 40 and a 2.4 s pause, dicrotic waves of 0.45', () => {
    const beats: B[] = [];
    for (let t = 0.5; t < 8; t += 0.5) beats.push({ t, a: 40 });
    for (let t = 8; t < 20; t += 1.5) beats.push({ t, a: 45 });
    beats.push({ t: 22.4, a: 50 }, { t: 23.4, a: 45 }, { t: 24.4, a: 45 });
    const { feet, sb } = feetOf(art(beats, 0.45), 25);
    expect(sb).toEqual([]);
    expect(noInvented(feet, beats)).toEqual([]);
    expect(feet.filter((f) => f > 19.6 && f < 22.3)).toEqual([]);
  });

  it('AF-like irregular beats (each rise set by its preceding interval): the recovered pulses are beats, never dicrotic waves', () => {
    // A fixed irregular sequence 0.28–1.0 s; the rise follows the filling time (Frank–Starling), so a short interval
    // gives a small beat whose upstroke starts in the previous beat's dicrotic wave
    const rr = [0.62, 0.31, 0.85, 0.44, 0.29, 0.72, 0.38, 0.95, 0.33, 0.52, 0.28, 0.66, 0.41, 0.9, 0.35, 0.58, 0.3, 0.78, 0.47, 1.0];
    const beats: B[] = [];
    let t = 0.5;
    for (let k = 0; k < 60; k++) {
      const r = rr[k % rr.length] as number;
      beats.push({ t, a: 50 * (1 - Math.exp(-(r - 0.15) / 0.3)) });
      t += r;
    }
    const { sb } = feetOf(art(beats), t);
    // Only the recovered feet are asserted: the detection path places some feet of these synthetic beats in the
    // previous beat's dicrotic dip (its 128 ms foot window), which this mechanism does not change
    expect(noInvented(sb, beats)).toEqual([]);
    expect(sb.length).toBeGreaterThan(0);
  });

  it('Li\'s amplitude test: a wiggle of 0.35 × the pulses in a long diastole is not a pulse', () => {
    // 0.6 s beats of 40 mmHg, then a 1.6 s pause (over 166 % of 0.6 s) with a 14 mmHg wiggle 0.8 s into it: outside
    // both eye-closings, its SSF peak between the search threshold and the detection threshold, its rise under
    // 0.4 × the recent rises. Only the 0.4 × bound rejects it.
    const beats: B[] = [];
    for (let t = 0.5; t < 6.6; t += 0.6) beats.push({ t, a: 40 });
    for (let t = 8.1; t < 12; t += 0.6) beats.push({ t, a: 40 });
    const x = art([...beats, { t: 7.3, a: 14 }]);
    expect(feetOf(x, 12, false).feet.filter((f) => f > 6.6 && f < 8)).toEqual([]); // the detection path skips it
    const { feet, sb } = feetOf(x, 12);
    expect(sb).toEqual([]);
    expect(noInvented(feet, beats)).toEqual([]);
  });

  it('Li\'s systolic peak: a rise still rising at the next foot, with no run-off, is not a pulse', () => {
    // The same pause; 0.8 s into it the line steps up 18 mmHg (time constant 30 ms) and keeps rising, 10 mmHg/s, until
    // the next beat, as a slow flush or a baseline shift would: its derivative never turns from + to − before the next
    // foot. Its onset, SSF peak and rise pass every other test; only the run-off rule rejects it.
    const beats: B[] = [];
    for (let t = 0.5; t < 6.6; t += 0.6) beats.push({ t, a: 40 });
    for (let t = 8.1; t < 12; t += 0.6) beats.push({ t, a: 40 });
    const step = (t: number) => (t <= 7.3 ? 0 : 18 * (1 - Math.exp(-(Math.min(t, 8.1) - 7.3) / 0.03)) + 10 * (Math.min(t, 8.1) - 7.3));
    const a = art(beats);
    const x = (t: number) => a(t) + step(t);
    expect(feetOf(x, 12, false).feet.filter((f) => f > 6.6 && f < 7.9)).toEqual([]); // the detection path skips it
    expect(feetOf(x, 12).sb).toEqual([]);
  });

  it('post-ROSC: after 20 s of arrest the first slow beats with large dicrotic waves are not split', () => {
    const beats: B[] = [];
    for (let t = 0.5; t < 10; t += 0.5) beats.push({ t, a: 35 });
    for (let t = 30; t < 40; t += 1.4) beats.push({ t, a: 70 }); // the post-ROSC surge: slow, large
    for (let t = 40.7; t < 50; t += 0.7) beats.push({ t, a: 45 });
    const { feet, sb } = feetOf(art(beats, 0.3), 50);
    expect(noInvented(feet, beats)).toEqual([]);
    expect(sb).toEqual([]);
  });

  it('the pleth path is unchanged: without the search-back (pleth, PAP) a signal gives the same feet, less the recovered ones', () => {
    // The search-back only adds feet: every foot found without it is found with it, at the same sample
    const rr = [0.62, 0.31, 0.85, 0.44, 0.29, 0.72, 0.38, 0.95, 0.33, 0.52];
    const af: B[] = [];
    let t = 0.5;
    for (let k = 0; k < 40; k++) {
      const r = rr[k % rr.length] as number;
      af.push({ t, a: 50 * (1 - Math.exp(-(r - 0.15) / 0.3)) });
      t += r;
    }
    const small: B[] = [];
    for (let u = 0.5; u < 12; u += 0.6) small.push({ t: u, a: Math.abs(u - 6.5) < 0.01 ? 20 : 40 });
    for (const [x, seconds] of [[art(af), t], [art(small), 12]] as const) {
      const on = feetRun(x, seconds, true);
      const off = feetRun(x, seconds, false);
      expect(off.filter((f) => !on.includes(f))).toEqual([]);
      expect(on.length).toBeGreaterThan(off.length);
    }
  });
});

/**
 * The genuine long diastoles of the 2026-10-27 diagnosis (research/ibp-missed-foot-diag: the 'long-beat' class, no
 * second ejecting beat inside an interval over the missed limit: abrupt slowing, AV block, AF pulse deficit, PVC
 * pauses, post-ROSC). The fixture holds the displayed ABP of a window ending in each, cut from origin/main's
 * instrumented runs (dea151c4); origin/main's detector, started at the window, finds the same beats there as the engine
 * did in the full run. 283 of the diagnosis's 288 long beats (all runs, every skin), as 147 distinct windows; the other
 * 5 need a window from the start of the run and are checked in the run set itself.
 */
describe('the diagnosis\'s genuine long diastoles stay one interval with the search-back', () => {
  const fx = JSON.parse(gunzipSync(readFileSync(resolve(import.meta.dirname, 'fixtures/long-diastoles.json.gz'))).toString()) as {
    cases: Array<{ src: string; also: string[]; p: number; f: number; d: number[] }>;
  };
  it(`all ${fx.cases.length} windows: the long beat is measured from its own foot to the next, nothing found inside it`, () => {
    expect(fx.cases.length).toBe(147);
    const split: string[] = [];
    for (const c of fx.cases) {
      const wn = createWaveNumerics(3);
      let x = 0;
      let kept = false;
      const inside: number[] = [];
      for (let k = 0; k < c.d.length; k++) {
        x += c.d[k] as number;
        const b = numericsStep(wn, k, x / 1000, false, true);
        if (wn.prevFoot > c.p + 10 && wn.prevFoot < c.f - 10 && !inside.includes(wn.prevFoot)) inside.push(wn.prevFoot);
        if (b && wn.prevFoot === c.f && Math.round(b.dur * 125) === c.f - c.p) kept = true;
      }
      if (!kept || inside.length) split.push(`${c.src} (${c.p}-${c.f}): ${inside.join(',')}`);
    }
    expect(split).toEqual([]);
  });
});

/**
 * The IABP rig (circ-iabp.test.ts, MANUAL cardiogenic-shock, IABP 1:1; displayed ABP of two windows, with the times the
 * aortic valve opened and the balloon inflated). The detection path counts each inflation's augmentation wave as a
 * pulse, so a cycle carries two feet, the ejection's and the augmentation's, and at 464.04 and 564.14 s it skipped the
 * ejection between two augmentation feet. The two feet the search-back adds there were first scored "not a beat":
 * the engine's beat records of that rig open the valve at the record's start (its ejection starts ≈ 400 ms after R and
 * spills into the next record), so the expected foot was misplaced. Against the valve itself they are the ejections:
 * 72 and 64 ms after the valve opened, as the detection path's ejection feet are (0–72 ms in this run). Without the
 * search-back neither is found.
 */
describe('the IABP rig: the search-back recovers an ejection the detection path skipped, never a balloon wave', () => {
  const fx = JSON.parse(readFileSync(resolve(import.meta.dirname, 'fixtures/iabp-rig.json'), 'utf8')) as {
    windows: Array<{ t0: number; d: number[]; valveOpen: number[]; inflate: number[] }>;
  };
  const feet = (w: (typeof fx.windows)[number], searchBack: boolean): number[] => {
    const wn = createWaveNumerics(3);
    const out: number[] = [];
    let x = 0;
    for (let k = 0; k < w.d.length; k++) {
      x += w.d[k] as number;
      if (numericsStep(wn, k, x / 1000, false, searchBack)) out.push(Math.round((w.t0 + wn.prevFoot / 125) * 1000) / 1000);
    }
    return out;
  };
  it('each recovered foot lies 0–80 ms after a valve opening; the ejections at 464.04 and 564.14 s are found', () => {
    const recovered: number[] = [];
    for (const w of fx.windows) {
      const on = feet(w, true);
      const off = feet(w, false);
      expect(off.filter((f) => !on.includes(f))).toEqual([]);
      for (const f of on.filter((g) => !off.includes(g))) {
        recovered.push(f);
        expect(w.valveOpen.some((o) => f - o >= 0 && f - o <= 0.08)).toBe(true);
        expect(w.inflate.some((i) => f - i >= 0 && f - i <= 0.15)).toBe(false);
      }
    }
    expect(recovered).toEqual([464.04, 564.136]);
  });
});
