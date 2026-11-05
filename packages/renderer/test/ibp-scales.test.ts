// E130 (owner ruling, 2026-10-26): the IBP1 (arterial) and IBP2 (venous) lanes take a scale per channel: the skin's
// fixed one (Saadat-like ART 0–200 by the ruling, Philips-like 0–150 unchanged), a range the instructor types within
// 0–200, or AUTO. AUTO is judged every IBP_AUTO_EVERY_S of sim time from a discrete set of ranges, never beat by beat,
// and a range steps down only when two windows in a row fit the smaller one; a beat or two of outlier does not move it.
// The judgement reads mmHg samples only (not the lane height), at sim-time boundaries, so the instructor's monitor and
// every learner's phone draw the same range at the same moment.
import { describe, expect, it } from 'vitest';
import { resolveSkin } from '@pme/skins';
import { autoIbpRange, IBP_AUTO_EVERY_S, IBP_AUTO_RANGES, ibpScaleError } from '../src/ibp-scale.ts';
import { MonitorCore } from '../src/monitor-core.ts';
import { renderPlan, type PlanLane } from '../src/skin-plan.ts';
import type { SweepLane } from '../src/sweep-lane.ts';
import { FakeCtx } from './fake-ctx.ts';

const RATE = 125;

/** An arterial-like trace: a 1-s beat from `dia` up to `sys` (a raised cosine), `seconds` long. */
function beats(seconds: number, sys: number, dia: number, spikeAt: number[] = [], spikeTo = 0): Float32Array {
  const out = new Float32Array(seconds * RATE);
  for (let k = 0; k < out.length; k++) {
    const s = Math.floor(k / RATE);
    const ph = (k % RATE) / RATE;
    const top = spikeAt.includes(s) ? spikeTo : sys;
    out[k] = dia + (top - dia) * 0.5 * (1 - Math.cos(2 * Math.PI * ph));
  }
  return out;
}
const concat = (...a: Float32Array[]) => {
  const out = new Float32Array(a.reduce((n, x) => n + x.length, 0));
  let o = 0;
  for (const x of a) (out.set(x, o), (o += x.length));
  return out;
};

describe('E130 defaults: the skin plan', () => {
  it('saadat-like: IBP1 is the ruled fixed 0–200 (the photo-matched 40–200 goes), its marks 200/100/0; IBP2 stays −10–30', () => {
    const p = renderPlan(resolveSkin('saadat-like'));
    const [art, cvp] = [p.lanes[3] as PlanLane, p.lanes[4] as PlanLane];
    expect(art).toMatchObject({ id: 'IBP1', range: [0, 200], scaleLines: [200, 100, 0], scaleMid: 100 });
    expect(cvp).toMatchObject({ id: 'IBP2', range: [-10, 30], scaleLines: [30, 10, -10], scaleMid: 10 });
    expect(art.ibp).toMatchObject({ channel: 'IBP1', scale: { mode: 'fixed' } });
    expect(cvp.ibp).toMatchObject({ channel: 'IBP2', scale: { mode: 'fixed' } });
    expect(p.lanes.filter((l) => l.ibp !== null).map((l) => l.id)).toEqual(['IBP1', 'IBP2']); // not pleth, resp, ECG
  });

  it('philips-like keeps its fixed ABP 0–150 (no scale marks)', () => {
    const p = renderPlan(resolveSkin('philips-like'));
    const art = p.lanes.find((l) => l.channel === 'abp') as PlanLane;
    expect(art).toMatchObject({ range: [0, 150], scaleLines: null, ibp: { channel: 'IBP1', scale: { mode: 'fixed' } } });
  });

  it('a typed range: the lane draws it and the Saadat-like marks follow (upper, middle, lower)', () => {
    const p = renderPlan(resolveSkin('saadat-like'), undefined, undefined, false, { IBP1: { mode: 'custom', lower: 20, upper: 180 }, IBP2: { mode: 'custom', lower: 0, upper: 40 } });
    expect(p.lanes[3]).toMatchObject({ range: [20, 180], scaleLines: [180, 100, 20], scaleMid: 100, ibp: { scale: { mode: 'custom', lower: 20, upper: 180 } } });
    expect(p.lanes[4]).toMatchObject({ range: [0, 40], scaleLines: [40, 20, 0], scaleMid: 20 });
    const ph = renderPlan(resolveSkin('philips-like'), undefined, undefined, false, { IBP1: { mode: 'custom', lower: 0, upper: 100 } });
    expect(ph.lanes.find((l) => l.channel === 'abp')).toMatchObject({ range: [0, 100], scaleLines: null });
  });

  it('a refused typed range leaves the skin default', () => {
    const p = renderPlan(resolveSkin('saadat-like'), undefined, undefined, false, { IBP1: { mode: 'custom', lower: 120, upper: 80 } });
    expect(p.lanes[3]).toMatchObject({ range: [0, 200], ibp: { scale: { mode: 'fixed' } } });
  });
});

describe('E130 typed range: within 0–200, lower below upper', () => {
  it('accepts 0–200 and any whole range inside it', () => {
    expect(ibpScaleError({ mode: 'custom', lower: 0, upper: 200 })).toBeNull();
    expect(ibpScaleError({ mode: 'custom', lower: 40, upper: 160 })).toBeNull();
    expect(ibpScaleError({ mode: 'fixed' })).toBeNull();
    expect(ibpScaleError({ mode: 'auto' })).toBeNull();
  });
  it('refuses a bound outside 0–200, lower ≥ upper, or a number that is not one', () => {
    expect(ibpScaleError({ mode: 'custom', lower: -5, upper: 100 })).toMatch(/0.*200/);
    expect(ibpScaleError({ mode: 'custom', lower: 0, upper: 250 })).toMatch(/0.*200/);
    expect(ibpScaleError({ mode: 'custom', lower: 100, upper: 100 })).toMatch(/lower/i);
    expect(ibpScaleError({ mode: 'custom', lower: 150, upper: 100 })).toMatch(/lower/i);
    expect(ibpScaleError({ mode: 'custom', lower: Number.NaN, upper: 100 })).not.toBeNull();
    expect(ibpScaleError({ mode: 'nope' } as never)).not.toBeNull();
  });
});

describe('E130 AUTO: the smallest discrete range that holds the window, with headroom', () => {
  it('names its discrete sets (arterial capped at 0–200 by the ruling; venous starting at −10–30)', () => {
    expect(IBP_AUTO_EVERY_S).toBe(30);
    expect(IBP_AUTO_RANGES.IBP1).toEqual([[0, 60], [0, 100], [0, 160], [0, 200]]);
    expect(IBP_AUTO_RANGES.IBP2).toEqual([[-10, 30], [0, 60], [0, 100], [0, 160], [0, 200]]);
  });

  it('120/80 → 0–160; 85/50 → 0–100; 40/25 → 0–60; 170/90 → 0–200', () => {
    const at = (sys: number, dia: number) => autoIbpRange(concat(beats(30, sys, dia), beats(30, sys, dia)), 60 * RATE, RATE, 'IBP1');
    expect(at(120, 80)).toEqual([0, 160]);
    expect(at(85, 50)).toEqual([0, 100]);
    expect(at(40, 25)).toEqual([0, 60]);
    expect(at(170, 90)).toEqual([0, 200]);
    expect(at(260, 120)).toEqual([0, 200]); // nothing larger than the ruled 0–200
  });

  it('a venous trace 4–12 → −10–30; one of 20–45 → 0–60', () => {
    const at = (hi: number, lo: number) => autoIbpRange(concat(beats(30, hi, lo), beats(30, hi, lo)), 60 * RATE, RATE, 'IBP2');
    expect(at(12, 4)).toEqual([-10, 30]);
    expect(at(45, 20)).toEqual([0, 60]);
  });

  it('one or two outlier beats (a flush, an ectopic pressure) in the window do not raise the range', () => {
    const quiet = beats(30, 120, 80);
    const spiky = beats(30, 120, 80, [7, 21], 195);
    expect(autoIbpRange(concat(quiet, spiky), 60 * RATE, RATE, 'IBP1')).toEqual([0, 160]);
    const sustained = beats(30, 120, 80, [3, 7, 12, 21], 195); // four seconds high: real, the range steps up
    expect(autoIbpRange(concat(quiet, sustained), 60 * RATE, RATE, 'IBP1')).toEqual([0, 200]);
  });

  it('hysteresis: it steps down only when two windows in a row fit the smaller range', () => {
    const high = beats(30, 170, 90);
    const normal = beats(30, 120, 80);
    expect(autoIbpRange(concat(high, normal), 60 * RATE, RATE, 'IBP1')).toEqual([0, 200]); // one window fits 0–160: held
    expect(autoIbpRange(concat(normal, normal), 60 * RATE, RATE, 'IBP1')).toEqual([0, 160]);
    expect(autoIbpRange(concat(normal, high), 60 * RATE, RATE, 'IBP1')).toEqual([0, 200]); // up at once
  });

  it('under a second of signal judges nothing (null)', () => {
    expect(autoIbpRange(new Float32Array(0), 0, RATE, 'IBP1')).toBeNull();
    expect(autoIbpRange(beats(1, 120, 80), 100, RATE, 'IBP1')).toBeNull();
  });
});

// A MonitorCore whose arterial channel reads a scripted pressure (mmHg) by sample index: the engine's own trace is
// whatever the patient makes, the test needs a known one.
function make(o: { cssW?: number; cssH?: number; portrait?: boolean; pressure: (idx: number) => number }) {
  const ctx = new FakeCtx();
  const plan = renderPlan(resolveSkin('saadat-like'), undefined, undefined, o.portrait === true);
  const core = new MonitorCore({ width: 0, height: 0 }, ctx, { cssW: o.cssW ?? 1056, cssH: o.cssH ?? 600, dpr: 1 },
    { engine: { seed: 1, device: { skin: 'saadat-like' }, patient: { sensors: { abp: 'connected', cvp: 'connected' } } }, plan }, () => {});
  const eng = core.engine as unknown as { readSamples: (ch: string, from: number, out: Float32Array) => number; latestSampleIndex: (ch: string) => number };
  const real = eng.readSamples.bind(eng);
  eng.readSamples = (ch, from, out) => {
    if (ch !== 'abp') return real(ch, from, out);
    const latest = eng.latestSampleIndex('abp');
    const start = Math.max(0, from);
    const n = Math.max(0, Math.min(start + out.length - 1, latest) - start + 1); // the ring's own read (buffers/ring.ts)
    for (let k = 0; k < n; k++) out[k] = o.pressure(start + k);
    return n;
  };
  let f = 0;
  const runTo = (s: number) => {
    while (core.clock.renderT < s) core.frame(1000 + f++ * 200); // 5 frames a second: the boundaries, not the beats, are under test
  };
  const lane = (i = 3) => (core as unknown as { lanes: SweepLane[] }).lanes[i] as SweepLane;
  const plane = (i = 3) => (core as unknown as { plan: { lanes: PlanLane[] } }).plan.lanes[i] as PlanLane;
  return { core, ctx, runTo, lane, plane };
}
/** 120/80 until `upAt` s, then 175/95. */
const stepUp = (upAt: number) => (idx: number) => {
  const s = idx / RATE;
  const ph = (idx % RATE) / RATE;
  const [sys, dia] = s < upAt ? [120, 80] : [175, 95];
  return dia + (sys - dia) * 0.5 * (1 - Math.cos(2 * Math.PI * ph));
};
const span = (l: SweepLane) => l.cfg.height / (l.cfg.gainMmPerMv * l.cfg.pxPerMm);

describe('E130 AUTO in the monitor: judged at 30-s sim-time boundaries, never beat by beat', () => {
  it('switching to AUTO judges the last full windows at once; a pressure rise moves it only at the next boundary', () => {
    const m = make({ pressure: stepUp(70) });
    m.runTo(65);
    m.core.setIbpScales({ IBP1: { mode: 'auto' } });
    m.runTo(66);
    expect(m.plane().range).toEqual([0, 160]);
    expect(span(m.lane())).toBeCloseTo(160, 6);
    m.runTo(89); // 175/95 since 70 s: still 0–160 until the boundary at 90 s
    expect(m.plane().range).toEqual([0, 160]);
    m.runTo(91);
    expect(m.plane().range).toEqual([0, 200]);
    expect(m.plane().scaleLines).toEqual([200, 100, 0]);
  });

  it('the scale marks and the printed values follow the range', () => {
    const m = make({ pressure: stepUp(1e9) });
    m.runTo(61);
    m.ctx.texts = [];
    m.core.setIbpScales({ IBP1: { mode: 'auto' } });
    m.runTo(62);
    expect(m.lane().cfg.hLines?.values).toEqual([160, 80, 0]);
    expect(m.ctx.texts).toEqual(expect.arrayContaining(['160', '80', '0']));
    m.ctx.texts = [];
    m.core.setIbpScales({ IBP1: { mode: 'custom', lower: 20, upper: 180 } });
    expect(m.plane().range).toEqual([20, 180]);
    expect(m.lane().cfg.hLines?.values).toEqual([180, 100, 20]);
    expect(m.ctx.texts).toEqual(expect.arrayContaining(['180', '100', '20']));
    m.core.setIbpScales({});
    expect(m.plane().range).toEqual([0, 200]); // back to the skin's fixed scale
  });

  it('a refused typed range is ignored (the lane keeps what it had)', () => {
    const m = make({ pressure: stepUp(1e9) });
    m.core.setIbpScales({ IBP1: { mode: 'custom', lower: 0, upper: 300 } });
    expect(m.plane().range).toEqual([0, 200]);
  });

  it('the instructor\'s landscape monitor and a phone in portrait choose the same range at the same sim time', () => {
    const host = make({ pressure: stepUp(70) });
    const phone = make({ cssW: 390, cssH: 664, portrait: true, pressure: stepUp(70) });
    for (const m of [host, phone]) m.core.setIbpScales({ IBP1: { mode: 'auto' } });
    const seen: string[][] = [[], []];
    for (let s = 20; s <= 130; s += 5) {
      host.runTo(s);
      phone.runTo(s);
      seen[0]!.push(String(host.plane().range));
      seen[1]!.push(String(phone.plane().range));
    }
    expect(seen[1]).toEqual(seen[0]);
    expect(new Set(seen[0])).toEqual(new Set(['0,200', '0,160'])); // the fixed default before a window, then the judgement
  }, 120_000);

  it('a resize does not re-judge on its own: the range is the boundary\'s, whatever the lane height', () => {
    const m = make({ pressure: stepUp(70) });
    m.core.setIbpScales({ IBP1: { mode: 'auto' } });
    m.runTo(80);
    expect(m.plane().range).toEqual([0, 160]);
    m.core.resize({ cssW: 800, cssH: 400, dpr: 1 });
    m.runTo(81);
    expect(m.plane().range).toEqual([0, 160]);
  });
});
