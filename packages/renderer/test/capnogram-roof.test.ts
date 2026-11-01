// Owner's report of 1 Nov 2026 (old MH card, premedicated, room air): the capnogram's plateau "flat against the top of
// its 50 mmHg lane" while EtCO2 read 42. Diagnosis: the lane draws the same displayed airway CO2 the EtCO2 detector
// reads, on the skin's fixed 0–50 mmHg scale (zero at the lane's foot, 50 at its top, the dotted line there), so a 42 mmHg
// plateau sits at 84 % of the lane: in the 1440 × 900 Instructor pane's ≈ 34 px lane that leaves ≈ 5 px to the roof,
// which reads as touching it. Nothing is clipped below 50 (values above 50 clip at the top: owner E63). This pins it.
import { describe, expect, it } from 'vitest';
import { resolveSkin } from '@pme/skins';
import { renderPlan } from '../src/skin-plan.ts';
import { SweepLane, type LaneConfig } from '../src/sweep-lane.ts';
import { scaleFor } from '../src/wave-lanes.ts';
import { FakeCtx } from './fake-ctx.ts';

const RATE = 62.5;
/** A capnogram: 2 s of inspiration at 0, then a 3 s plateau at `et` mmHg, repeated. */
const capno = (et: number) => (from: number, out: Float32Array) => {
  for (let k = 0; k < out.length; k++) out[k] = ((from + k) / RATE) % 5 < 2 ? 0 : et;
  return out.length;
};

describe('the Saadat-like CO2 lane: plateau height for a known EtCO2', () => {
  const plan = renderPlan(resolveSkin('saadat-like', { sensors: { co2: true } }));
  const co2 = plan.lanes.find((l) => l.id === 'CO2')!;
  const pxPerMm = plan.pxPerMm as number;

  for (const height of [34, 120]) {
    it(`42 of 50 mmHg is drawn at 84 % of a ${height} px lane, under the dotted 50 line, not clipped`, () => {
      expect(co2.range).toEqual([0, 50]);
      expect(co2.scaleLines).toEqual([50]);
      const [lo, hi] = co2.range as [number, number];
      const cfg: LaneConfig = {
        x: 18, y: 85, width: 354, height, rate: RATE, mmPerS: co2.mmPerS, pxPerMm, color: co2.color, background: plan.background,
        lineWidth: plan.lineWidth, eraseGapPx: plan.eraseGapPx, fill: co2.fill, smoothN: Math.round((co2.smoothMs / 1000) * RATE), smoothGate: [1.5, 3],
        ...scaleFor(lo, hi, height, pxPerMm),
      };
      const ctx = new FakeCtx();
      const lane = new SweepLane(cfg, 1);
      const src = capno(42);
      for (let f = 1; f <= 120; f++) lane.draw(ctx, f / 10, src);
      const zero = cfg.y + height;
      const ys = ctx.calls.filter((c) => c.op === 'lineTo' || c.op === 'moveTo').map((c) => c.args[1] as number);
      const top = Math.min(...ys);
      expect((zero - top) / height).toBeCloseTo(42 / 50, 6); // the plateau at 84 % of the lane
      expect(top - cfg.y).toBeCloseTo(height * (8 / 50), 6); // 8 mmHg of headroom below the lane's top (the 50 line)
      expect(ys.some((y) => y === zero)).toBe(true); // and the inspiratory baseline on the zero line
    });
  }
});
