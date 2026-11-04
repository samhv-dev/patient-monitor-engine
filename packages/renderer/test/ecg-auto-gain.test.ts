// The ECG auto-gain (Saadat-like `ecg.gainDefault: "AUTO"`), as the owner's review of 30 October asked: it holds through
// a single ectopic beat, changes only with hysteresis and after the new size has held for two consecutive windows, and
// is judged in millivolts against the lane's NOMINAL height from the plan (the real unit's lane), not the pixel height of
// the window it is drawn in, so the instructor's small pane and the learners' full monitor show the same gain.
// Vendor sources (PR body): Philips IntelliVue "Auto Size" chooses from a discrete set per wave; Mindray "Auto" adjusts the
// wave size; neither manual states a cadence or a hysteresis, so the change waits for two consecutive windows (the brief's
// rule; the one published algorithm, US 6,510,339 B2, also votes over several measurements before it changes the gain).
import { describe, expect, it } from 'vitest';
import { resolveSkin } from '@pme/skins';
import type { EngineEvent } from '@pme/engine-core';
import { MonitorCore } from '../src/monitor-core.ts';
import { legacyPlan, renderPlan, type RenderPlan } from '../src/skin-plan.ts';
import type { SweepLane } from '../src/sweep-lane.ts';
import { FakeCtx } from './fake-ctx.ts';

const NOMINAL_ECG_LANE_MM = 30; // ecg-gain.ts: a skin with no measured screen

describe('the plan carries each ECG lane\'s nominal height (mm on the real unit)', () => {
  it('saadat-like: the photo\'s lane extents at the photo\'s px per mm (ECG1 115 px, ECG2 117 px at 3.10 px/mm)', () => {
    const p = renderPlan(resolveSkin('saadat-like'));
    expect(p.lanes[0]!.gainLaneMm).toBeCloseTo(115 / 3.1, 6);
    expect(p.lanes[1]!.gainLaneMm).toBeCloseTo(117 / 3.1, 6);
    // the same in portrait (a phone): the nominal lane is the unit's, not the screen's
    expect(renderPlan(resolveSkin('saadat-like'), undefined, undefined, true).lanes[0]!.gainLaneMm).toBeCloseTo(115 / 3.1, 6);
  });

  it('a page with its own lanes shares the photo\'s wave area equally (P7: 614 px over six lanes)', () => {
    const p = renderPlan(resolveSkin('saadat-like'), 'P7');
    expect(p.lanes[0]!.kind).toBe('ecg');
    expect(p.lanes[0]!.gainLaneMm).toBeCloseTo(614 / 6 / 3.1, 6);
  });

  it(`a skin without a measured screen, and the legacy plan, judge against ${NOMINAL_ECG_LANE_MM} mm`, () => {
    expect(renderPlan(resolveSkin('zoll-like')).lanes[0]!.gainLaneMm).toBe(NOMINAL_ECG_LANE_MM);
    expect(legacyPlan(['ecgII'], []).lanes[0]!.gainLaneMm).toBe(NOMINAL_ECG_LANE_MM);
  });
});

// MonitorCore with the real engine. The rc.3 chrome (one label string, "II  X1  NORMAL") at the skin's 3.10 px/mm.
const FRAME_MS = 1000 / 60;
const gainOf = (texts: string[]) => texts.filter((t) => /^II\s+X/.test(t)).at(-1);
const lanesOf = (c: MonitorCore) => (c as unknown as { lanes: SweepLane[] }).lanes;
function saadat(laneMm?: number): RenderPlan {
  const p = renderPlan(resolveSkin('saadat-like'), undefined, undefined, true);
  if (laneMm !== undefined) for (const l of p.lanes) if (l.kind === 'ecg') l.gainLaneMm = laneMm;
  return p;
}
function make(cssH: number, plan: RenderPlan = saadat(), skin = 'saadat-like') {
  const ctx = new FakeCtx();
  const core = new MonitorCore({ width: 0, height: 0 }, ctx, { cssW: 1056, cssH, dpr: 1 }, { engine: { seed: 1, device: { skin } }, plan }, () => {});
  const pvcs: number[] = [];
  core.engine.on((e: EngineEvent) => void (e.type === 'beat' && e.template === 'pvc' && pvcs.push(e.t)));
  let ms = 0;
  const run = (s: number, each?: () => void) => {
    for (const end = ms + s * 1000; ms < end; ms += FRAME_MS) {
      core.frame(1_000_000 + ms);
      each?.();
    }
  };
  return { core, ctx, run, pvcs, gain: () => gainOf(ctx.texts) };
}
const pvc = (pattern: 'single' | 'run', probability: number) =>
  ({ id: `pvc-${pattern}-${probability}-${Math.random()}`, issuedBy: 't', type: 'setModifiers', modifiers: { pvc: { pattern, probability, ...(pattern === 'run' ? { runLength: 30 } : {}) } } }) as never;

describe('MonitorCore: the auto-gain on the real engine', () => {
  // 26 mm puts X1's threshold at 1.56 mV: the sinus lead II (≈ 1.2–1.4 mV a beat) fits X1, and a PVC (≈ 2.4 mV) is well
  // outside the hysteresis band (> 1.87 mV), so only the median and the hold keep the gain through it
  it('a single PVC in the window does not change the gain', () => {
    const m = make(614, saadat(26)); // the photo's own lane heights (ECG1 115 px): the old pixel judgement drops on the PVC too
    m.run(12);
    expect(m.gain()).toBe('II  X1  NORMAL');
    m.ctx.texts = [];
    m.core.command(pvc('single', 0.9));
    m.run(3, () => m.pvcs.length > 0 && m.core.command(pvc('single', 0)));
    m.core.command(pvc('single', 0));
    m.run(12);
    expect(m.pvcs).toHaveLength(1);
    expect(m.gain() ?? 'II  X1  NORMAL').toBe('II  X1  NORMAL');
    expect(m.ctx.texts.filter((t) => /^II\s+X/.test(t) && t !== 'II  X1  NORMAL')).toEqual([]);
  });

  it('a sustained taller rhythm (PVC runs) changes it, but not before two consecutive windows; the label and the lane follow', () => {
    const m = make(614, saadat(26));
    m.run(12);
    expect(m.gain()).toBe('II  X1  NORMAL');
    m.core.command(pvc('run', 0.9));
    let changedAt: number | null = null;
    m.run(20, () => changedAt === null && m.gain() !== 'II  X1  NORMAL' && (changedAt = m.core.clock.renderT));
    const onset = m.pvcs[0] as number;
    expect(changedAt).not.toBeNull();
    expect(changedAt! - onset).toBeGreaterThan(4.5); // one 4-s window is never enough
    expect(changedAt! - onset).toBeLessThan(16);
    expect(m.gain()).toBe('II  X0.5  NORMAL');
    expect(lanesOf(m.core)[0]!.cfg.gainMmPerMv).toBe(5);
  });

  it('two windows of different size showing the same signal show the same gain (the pane and the full monitor)', () => {
    const small = make(320); // ECG1 ≈ 60 px: the old judgement chose X0.5
    const large = make(1000); // ECG1 ≈ 187 px: the old judgement chose X2
    for (let s = 0; s < 30; s++) {
      small.run(1);
      large.run(1);
      expect(small.gain(), `${s + 1} s`).toBe(large.gain());
    }
    expect(large.gain()).toBe('II  X1  NORMAL'); // the photo shows X1 on an adult in sinus (IMG_8113)
  });

  it('one window resized (the monitor moved from the instructor\'s pane to the Monitor view) keeps its gain', () => {
    const m = make(1000);
    m.run(12);
    const before = m.gain();
    m.core.resize({ cssW: 700, cssH: 320, dpr: 1 });
    m.ctx.texts = [];
    m.run(12);
    expect(m.gain() ?? before).toBe(before);
    expect(m.ctx.texts.filter((t) => /^II\s+X/.test(t) && t !== before)).toEqual([]);
  });

  it('philips-like stays fixed at 10 mm/mV, whatever the window', () => {
    for (const cssH of [320, 1000]) {
      const plan = renderPlan(resolveSkin('philips-like'));
      const ecg = plan.lanes.flatMap((l, i) => (l.kind === 'ecg' ? [i] : []));
      const m = make(cssH, plan, 'philips-like');
      m.run(14);
      expect(ecg.map((i) => lanesOf(m.core)[i]!.cfg.gainMmPerMv)).toEqual(ecg.map(() => 10));
      expect(m.ctx.texts).toContain('II  M');
      expect(m.ctx.texts.some((t) => /X\d/.test(t))).toBe(false);
    }
  });
});

// Owner's run of 31 October (MH card, Early signs, HR ≈ 130, Instructor v2 at a 1440-wide window): the lead II trace was
// cut flat at the top and the bottom of its lane in the STATE pane while the lane read X1. Measured on main 649ab03c at
// 1440 × 900: the pane's monitor is 372 × 267 CSS px, so ECG1 is 50 px = 16.1 mm at the skin's 3.10 px/mm, against the
// unit's 37.1 mm that the auto-gain judges for; at X1 the trace had room for +0.97 / −0.65 mV, and the card's PVCs reach
// +1.9 / −1.7 mV (sinus beats +0.9 / −0.45: the gain is right, X1). The full Monitor view's ECG1 is 124 px = 40 mm and
// held them. An auto-gain lane drawn shorter than the unit's lane is now drawn as the unit's lane in miniature: the size
// is judged for the unit's lane, so mV take the share of the lane they take there, and the label stays the same in
// every window (#213).
describe('an auto-gain ECG lane shorter than the unit\'s lane is drawn as the unit\'s lane in miniature', () => {
  /** ECG1's trace points (CSS y) and its box: the strokes clipped inside lane 0. */
  const ecg1 = (m: ReturnType<typeof make>) => {
    const lane = lanesOf(m.core)[0]!.cfg;
    const top = lane.y;
    const bot = lane.y + lane.height;
    const ys: number[] = [];
    let pts: number[] = [];
    for (const c of m.ctx.calls) {
      if (c.op === 'beginPath') pts = [];
      else if (c.op === 'moveTo' || c.op === 'lineTo') pts.push(c.args[1] as number);
      else if (c.op === 'stroke' && c.style === lane.color && c.clip?.length && c.clip.every((r) => (r[1] as number) >= top - 1e-6 && (r[1] as number) + (r[3] as number) <= bot + 1e-6)) ys.push(...pts);
    }
    return { ys, top, bot, base: top + 0.6 * lane.height, h: lane.height };
  };
  const withPvcs = (cssH: number) => {
    const m = make(cssH);
    m.run(12);
    m.core.command(pvc('single', 0.35));
    m.ctx.clear();
    m.run(12);
    return m;
  };

  it('the STATE pane\'s lane (267 px canvas, ECG1 50 px = 16 mm) keeps sinus beats and PVCs inside it, at X1', () => {
    const m = withPvcs(267);
    const { ys, top, bot } = ecg1(m);
    expect(m.pvcs.length).toBeGreaterThan(2);
    expect(m.gain()).toBe('II  X1  NORMAL');
    expect(ys.length).toBeGreaterThan(1000);
    // yOf clamps to the lane: a point on an edge is a clipped sample
    expect(ys.filter((y) => y <= top + 1e-6).length, 'samples cut at the top').toBe(0);
    expect(ys.filter((y) => y >= bot - 1e-6).length, 'samples cut at the bottom').toBe(0);
  });

  it('the pane draws the same beat at the same share of its lane as the full monitor; a lane as tall as the unit\'s keeps 10 mm/mV', () => {
    const pane = withPvcs(267);
    const full = withPvcs(662); // the Monitor view at 1440 × 900: ECG1 124 px = 40 mm, taller than the unit's 37.1 mm
    expect(pane.gain()).toBe(full.gain());
    const unit = renderPlan(resolveSkin('saadat-like')).lanes[0]!.gainLaneMm;
    expect(lanesOf(full.core)[0]!.cfg.gainMmPerMv).toBe(10); // calibrated: 10 mm/mV on the screen
    const p = lanesOf(pane.core)[0]!.cfg;
    expect(p.gainMmPerMv).toBeCloseTo((10 * p.height) / (3.1 * unit), 9); // the unit's 37.1 mm drawn in 50 px
    // the highest point (a PVC's or a sinus R): its mV from the full monitor (10 mm/mV, 3.10 px/mm), and in the pane the
    // share of the lane it takes on the unit's 37.1-mm lane (same engine seed, same beats)
    const f = ecg1(full);
    const peakMv = (f.base - Math.min(...f.ys)) / (10 * 3.1);
    expect(peakMv).toBeGreaterThan(1);
    const q = ecg1(pane);
    expect((q.base - Math.min(...q.ys)) / q.h).toBeCloseTo((peakMv * 10) / unit, 2);
  });
});
