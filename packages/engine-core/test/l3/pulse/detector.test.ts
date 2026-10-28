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
function feetOf(x: (t: number) => number, seconds: number, searchBack = true): { feet: number[]; sb: number[] } {
  const st = createPulseDet(3);
  const feet: number[] = [];
  const sb: number[] = [];
  for (let n = 0; n < 125 * seconds; n++) {
    const f = pulseStep(st, x(n / 125), searchBack);
    if (f < 0) continue;
    feet.push(f / 125);
    if (st.sbFoot === f) sb.push(f / 125);
  }
  return { feet, sb };
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
      const on = feetOf(x, seconds);
      const off = feetOf(x, seconds, false);
      expect(off.sb).toEqual([]);
      expect(off.feet).toEqual(on.feet.filter((f) => !on.sb.includes(f)));
      expect(on.sb.length).toBeGreaterThan(0);
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
