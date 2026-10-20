// rc.3 PR-G (plan G2): saadat-like lanes take the heights of the real unit (layout.grid.laneWeights, the owner-approved
// mock-up: y 70-185-302-398-500-598-684 of 800). Any other lane count, and every skin without a grid, keeps equal lanes
// with today's arithmetic.
import { describe, expect, it } from 'vitest';
import { resolveSkin } from '@pme/skins';
import { MonitorCore } from '../src/monitor-core.ts';
import { renderPlan } from '../src/skin-plan.ts';
import type { SweepLane } from '../src/sweep-lane.ts';
import { FakeCtx } from './fake-ctx.ts';

function boxes(skin: string, cssH: number, page?: string, only?: Parameters<typeof renderPlan>[2]) {
  const plan = renderPlan(resolveSkin(skin), page, only);
  const core = new MonitorCore({ width: 0, height: 0 }, new FakeCtx(), { cssW: 1056, cssH, dpr: 1 }, { engine: { seed: 1, device: { skin } }, plan }, () => {});
  return (core as unknown as { lanes: SweepLane[] }).lanes.map((l) => [l.cfg.y, l.cfg.height]);
}

describe('lane weights (layout.grid.laneWeights)', () => {
  it('saadat-like lanes take the mock-up heights', () => {
    expect(renderPlan(resolveSkin('saadat-like')).laneWeights).toEqual([115, 117, 96, 102, 98, 86]);
    expect(boxes('saadat-like', 614)).toEqual([[0, 115], [115, 117], [232, 96], [328, 102], [430, 98], [528, 86]]);
  });

  it('equal lanes when the lane count differs (iran-icu-as-found, P7, named-lane pages)', () => {
    expect(renderPlan(resolveSkin('iran-icu-as-found')).laneWeights).toBeNull();
    expect(boxes('iran-icu-as-found', 400)).toEqual([[0, 100], [100, 100], [200, 100], [300, 100]]);
    expect(renderPlan(resolveSkin('saadat-like'), 'P7').laneWeights).toBeNull(); // a page that names its own lanes
    expect(renderPlan(resolveSkin('saadat-like'), undefined, { lanes: ['ecgII'], waves: ['abp', 'pleth', 'co2', 'resp', 'cvp'] }).laneWeights).toBeNull();
  });

  it('without a grid the y values are byte-identical to i * h', () => {
    expect(renderPlan(resolveSkin('philips-like')).laneWeights).toBeNull();
    const b = boxes('philips-like', 500);
    expect(b.map(([y]) => y)).toEqual(b.map((_, i) => i * (500 / b.length)));
    expect(b.every(([, h]) => h === 500 / b.length)).toBe(true);
  });
});
