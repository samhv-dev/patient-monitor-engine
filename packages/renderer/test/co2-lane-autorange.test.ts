// Owner ruling of 1 Nov 2026 (E63 revisited): in the malignant-hyperthermia climb the capnogram lay flat on the roof of
// its fixed 0–50 mmHg lane. The lane now widens its range when the breath peaks exceed it and narrows back when they
// fall, with hysteresis (co2-range.ts), as real units do; the scale texts and the dotted line follow, EtCO2 does not
// change, and above the widest range the trace still clips at the top (E63 there). #245's test (capnogram-roof.test.ts)
// still pins 42 of 50 at 84 %.
import { describe, expect, it } from 'vitest';
import { resolveSkin } from '@pme/skins';
import { CO2_NARROW_BREATHS, CO2_WIDEN_BREATHS, feedCo2Range, newCo2Range } from '../src/co2-range.ts';
import { MonitorCore } from '../src/monitor-core.ts';
import { renderPlan, type PlanLane, type RenderPlan } from '../src/skin-plan.ts';
import type { SweepLane } from '../src/sweep-lane.ts';
import { FakeCtx } from './fake-ctx.ts';

const RATE = 62.5;
const BREATH_S = 5; // RR 12: 2 s of inspiration at 0, then a 3 s plateau at the breath's peak
const TOPS = [50, 80, 100];
/** The displayed capnogram sample `j` when breath k peaks at peaks(k) mmHg. */
const capnoAt = (peaks: (k: number) => number) => (j: number) => {
  const t = j / RATE;
  return t % BREATH_S < 2 ? 0 : peaks(Math.floor(t / BREATH_S));
};
/** The scale shown after each whole breath of `peaks` (a breath is judged when its plateau ends, at the next inspiration). */
function scalesAfter(peaks: number[], start = 0): number[] {
  const r = newCo2Range(start);
  const at = capnoAt((k) => peaks[k] ?? 0);
  const out: number[] = [];
  let j = 0;
  const one = new Float32Array(1);
  for (let k = 0; k < peaks.length; k++) {
    for (; j < ((k + 1) * BREATH_S + 0.5) * RATE; j++) { // through the first 0.5 s of breath k + 1's inspiration
      one[0] = at(j);
      feedCo2Range(r, one, 1, RATE, TOPS);
    }
    out.push(TOPS[r.at] as number);
  }
  return out;
}

describe('the CO2 auto-range rule (co2-range.ts)', () => {
  it('a plateau at 42 stays on the 0–50 scale, however long', () => {
    expect(scalesAfter(Array(40).fill(42))).toEqual(Array(40).fill(50));
  });

  it(`peaks of 52, 53, 54 widen the lane to 0–80 after ${CO2_WIDEN_BREATHS} breaths, one step only`, () => {
    expect(CO2_WIDEN_BREATHS).toBe(2);
    expect(scalesAfter([42, 42, 52, 53, 54, 54, 54])).toEqual([50, 50, 50, 80, 80, 80, 80]);
  });

  it('a peak must EXCEED the top: 49.5 (the first ventilated breaths after the apnoea) and exactly 50 never widen', () => {
    expect(scalesAfter(Array(12).fill(49.5))).toEqual(Array(12).fill(50));
    expect(scalesAfter(Array(12).fill(50))).toEqual(Array(12).fill(50));
    expect(scalesAfter([49.5, 49.5, 50.5, 50.5])).toEqual([50, 50, 50, 80]);
    expect(scalesAfter([60, 60, 79.5, 79.5, 80, 80, 80], 0)).toEqual([50, 80, 80, 80, 80, 80, 80]);
  });

  it('a single breath above 50 does not widen (hysteresis): 42, 55, 42, 42, and 42, 55, 42, 55, 42', () => {
    expect(scalesAfter([42, 55, 42, 42])).toEqual([50, 50, 50, 50]);
    expect(scalesAfter([42, 55, 42, 55, 42])).toEqual([50, 50, 50, 50, 50]);
  });

  it(`back under 40 the lane narrows to 0–50 after ${CO2_NARROW_BREATHS} breaths; in the 40–50 band it never moves`, () => {
    expect(CO2_NARROW_BREATHS).toBe(6);
    expect(scalesAfter([38, 38, 38, 38, 38, 38, 38], 1)).toEqual([80, 80, 80, 80, 80, 50, 50]);
    // one breath back over 40 restarts the count
    expect(scalesAfter([38, 38, 38, 38, 38, 41, 38, 38, 38, 38, 38, 38], 1)).toEqual([...Array(11).fill(80), 50]);
    // the hysteresis band: 45 and 49.5 stay on whichever scale they are shown on
    for (const p of [45, 49.5]) {
      expect(scalesAfter(Array(20).fill(p), 1)).toEqual(Array(20).fill(80));
      expect(scalesAfter(Array(20).fill(p), 0)).toEqual(Array(20).fill(50));
    }
  });

  it('the climb goes 50 → 80 → 100 a step at a time, and nothing widens past the widest (E63 there)', () => {
    expect(scalesAfter([60, 60, 82, 82, 120, 120, 120])).toEqual([50, 80, 80, 100, 100, 100, 100]);
    expect(scalesAfter([60, 60, 60], 0)).toEqual([50, 80, 80]);
  });

  it('a flat line (apnoea, a detached line) changes nothing', () => {
    const r = newCo2Range(1);
    feedCo2Range(r, new Float32Array(60 * RATE), 60 * RATE, RATE, TOPS);
    expect(r.at).toBe(1);
  });
});

describe('the plan: saadat-like offers 0–50, 0–80 and 0–100; other skins keep their fixed lane', () => {
  it('saadat-like (and its preset) starts at 0–50 with the dotted line at 50', () => {
    for (const id of ['saadat-like', 'iran-icu-as-found']) {
      const co2 = renderPlan(resolveSkin(id, { sensors: { co2: true } })).lanes.find((l) => l.channel === 'co2') as PlanLane;
      expect([co2.range, co2.scaleLines, co2.autoRanges], id).toEqual([[0, 50], [50], [50, 80, 100]]);
    }
  });
  it('philips-like keeps a fixed CO2 scale', () => {
    const co2 = renderPlan(resolveSkin('philips-like', { sensors: { co2: true } })).lanes.find((l) => l.channel === 'co2');
    expect(co2?.autoRanges ?? null).toBeNull();
  });
});

// ── MonitorCore: the rule on the drawn lane, its texts, and two windows on the same timeline ───────────────────────
/** The texts painted since the last `clear()` (FakeCtx.texts keeps every text ever painted). */
const drawn = (ctx: FakeCtx) => ctx.calls.filter((k) => k.op === 'fillText').map((k) => k.style!.split(':')[1]);
const lanes = (c: MonitorCore) => (c as unknown as { lanes: SweepLane[] }).lanes;
const plan = (): RenderPlan => renderPlan(resolveSkin('saadat-like', { sensors: { co2: true } }));

/**
 * A monitor whose co2 channel is replaced by a known capnogram (the sim clock's sample index → mmHg). `still`: the
 * engine is not advanced (the clock and the CO2 lane run; the other lanes have nothing new to draw), which keeps these
 * cases cheap: the CO2 judgement reads only the co2 channel. `joinAt` (s): the window's first frame is at that sim time
 * with nothing held before it, as a follower that takes the host's snapshot there.
 */
function monitor(peaks: (k: number) => number, o: { size?: { cssW: number; cssH: number; dpr: number }; fps?: 60 | 30; still?: boolean; joinAt?: number } = {}) {
  const { size = { cssW: 1056, cssH: 600, dpr: 1 }, fps = 60, still = true } = o;
  const ctx = new FakeCtx();
  const p = plan();
  const core = new MonitorCore({ width: 0, height: 0 }, ctx, size, { engine: { seed: 1, device: { skin: 'saadat-like' }, patient: { sensors: { co2: 'on' } } }, plan: p, fps }, () => {});
  const e = core.engine;
  const read = e.readSamples.bind(e);
  const latest = e.latestSampleIndex.bind(e);
  const at = capnoAt(peaks);
  e.readSamples = ((ch, from, out) => {
    if (ch !== 'co2') return read(ch, from, out);
    const last = Math.floor(core.clock.simT * RATE);
    const n = Math.max(0, Math.min(out.length, last + 1 - from));
    for (let k = 0; k < n; k++) out[k] = at(from + k);
    return n;
  }) as typeof e.readSamples;
  e.latestSampleIndex = ((ch) => (ch === 'co2' ? Math.floor(core.clock.simT * RATE) : latest(ch))) as typeof e.latestSampleIndex;
  if (still) e.advanceTo = () => {};
  if (o.joinAt !== undefined) {
    core.clock.setTick(Math.round(o.joinAt / 0.02)); // 50 Hz ticks
    (core as unknown as { historyT: number }).historyT = core.clock.simT;
  }
  const i = p.lanes.findIndex((l) => l.channel === 'co2');
  let ms = 0;
  const run = (s: number) => {
    for (const end = ms + s * 1000; ms < end; ms += 1000 / 60) core.frame(1_000_000 + ms);
  };
  return { core, ctx, run, lane: () => lanes(core)[i] as SweepLane, pl: () => p.lanes[i] as PlanLane };
}

describe('MonitorCore: the CO2 lane follows its range', () => {
  it('a climb to 52–54 widens the drawn lane to 0–80: 52 is then drawn at 65 %, the texts read "80mmHg", the dots at 80', () => {
    const m = monitor((k) => (k < 3 ? 42 : 52 + Math.min(2, k - 3)));
    m.run(14.9); // breaths 0–1 judged (42)
    expect(m.pl().range).toEqual([0, 50]);
    m.run(10); // breaths 2 (42), 3 (52) judged: one breath over, still 50
    expect(m.pl().range).toEqual([0, 50]);
    m.ctx.clear();
    m.run(0.2); // breath 4 (53) ends at 25 s: the second breath over → 80
    expect(m.pl().range).toEqual([0, 80]);
    expect(m.pl().scaleLines).toEqual([80]);
    expect(m.lane().cfg.hLines?.values).toEqual([80]);
    const c = m.lane().cfg;
    // the lane was cleared whole and drawn again from the engine's buffer at the new scale, with its texts
    const cleared = m.ctx.calls.findIndex((k) => k.op === 'fillRect' && k.args[0] === c.x && k.args[1] === c.y && k.args[2] === c.width && k.args[3] === c.height);
    expect(cleared).toBeGreaterThanOrEqual(0);
    const after = m.ctx.calls.slice(cleared);
    const texts = drawn(Object.assign(new FakeCtx(), { calls: after }));
    expect(texts).toContain('80mmHg');
    expect(texts).not.toContain('50mmHg');
    // a 52 plateau (breath 3, backfilled) at 52/80 = 65 % of the lane, a 53 one at 66.25 %; nothing on the roof
    const zero = c.y + c.height;
    const ys = after.filter((k) => (k.op === 'lineTo' || k.op === 'moveTo') && k.args[1]! >= c.y - 1 && k.args[1]! <= zero + 1).map((k) => k.args[1] as number);
    const shares = new Set(ys.map((y) => Math.round(((zero - y) / c.height) * 10000) / 100));
    expect(shares.has(65)).toBe(true);
    expect(Math.max(...shares)).toBeLessThan(70);
    m.ctx.clear();
    m.run(20); // the sweep goes on at 0–80; "50mmHg" is never painted again
    expect(drawn(m.ctx)).not.toContain('50mmHg');
  });

  it('back under 40 for the narrowing breaths: 0–50 again, "50mmHg" back', () => {
    const m = monitor((k) => (k < 2 ? 42 : k < 6 ? 60 : 36));
    m.run(40);
    expect(m.pl().range).toEqual([0, 80]);
    m.ctx.clear();
    m.run(35); // breaths 6… at 36: six of them
    expect(m.pl().range).toEqual([0, 50]);
    expect(drawn(m.ctx).lastIndexOf('50mmHg')).toBeGreaterThan(drawn(m.ctx).lastIndexOf('80mmHg')); // the 80 painted until then
    expect(m.pl().scaleLines).toEqual([50]);
  });

  it('two windows on the same timeline take the same steps at the same breaths: a pane and a full screen, 60 and 30 fps; one joined later agrees once caught up', () => {
    // breaths of 5 s: 42, then 52–55 (the lane widens when breath 2 ends, at 15 s), then 36 (it narrows when the sixth
    // of them ends, breath 10, at 55 s)
    const peaks = (k: number) => (k === 0 ? 42 : k <= 4 ? 51 + k : 36);
    const a = monitor(peaks);
    const b = monitor(peaks, { size: { cssW: 360, cssH: 267, dpr: 2 }, fps: 30 });
    const c = monitor(peaks, { joinAt: 12 }); // a follower whose snapshot is at 12 s, mid-breath 2
    const steps = (m: ReturnType<typeof monitor>, from: number, to: number) => {
      const out: Array<[number, number]> = [];
      for (let t = from; t < to; t += 0.25) {
        const before = m.pl().range![1];
        m.run(0.25);
        const t = m.core.clock.simT;
        // a step is named by the breath in which it was shown: it must come within half a second of that breath's start,
        // when the breath before it ended
        if (m.pl().range![1] !== before) out.push([Math.floor(t / BREATH_S), m.pl().range![1]]), expect(t % BREATH_S).toBeLessThan(0.5);
      }
      return out;
    };
    const sa = steps(a, 0, 57);
    expect(sa).toEqual([[3, 80], [11, 50]]); // shown as breath 3 starts (15 s) and as breath 11 starts (55 s)
    expect(steps(b, 0, 57)).toEqual(sa);
    // the late window starts at 50, judges breaths 2 (53, its part from 12 s) and 3 (54): 80 at the end of breath 3,
    // and from then on it shows what the others show, narrowing at the same breath
    expect(steps(c, 12, 57)).toEqual([[4, 80], [11, 50]]);
  });

  it('a restore keeps the scale shown (the follower takes the host\'s snapshot), and a theme switch keeps it too', () => {
    const m = monitor((k) => (k < 2 ? 42 : 60));
    m.run(30);
    expect(m.pl().range).toEqual([0, 80]);
    const snap = m.core.engine.snapshot();
    m.core.restore(snap);
    m.run(1);
    expect(m.pl().range).toEqual([0, 80]);
    const next = plan();
    m.core.setPlan(next);
    expect(next.lanes.find((l) => l.channel === 'co2')!.range).toEqual([0, 80]);
    expect(next.lanes.find((l) => l.channel === 'co2')!.scaleLines).toEqual([80]);
  });
});
