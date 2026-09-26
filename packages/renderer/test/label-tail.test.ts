// A long ECG label (Saadat-like `II  X1  NORMAL`) runs past the 56 px chrome into the sweep area: it is repainted
// (clipped to the sweep area) when the erase bar passes under it, and a relabel erases the old tail first.
import { expect, it } from 'vitest';
import { resolveSkin } from '@pme/skins';
import { MonitorCore } from '../src/monitor-core.ts';
import { renderPlan } from '../src/skin-plan.ts';
import { FakeCtx } from './fake-ctx.ts';

it('saadat-like: the label tail is repainted once per sweep, clipped to x ≥ 56 px', () => {
  const ctx = new FakeCtx();
  const core = new MonitorCore({ width: 0, height: 0 }, ctx, { cssW: 1056, cssH: 500, dpr: 1 }, { engine: { seed: 1, device: { skin: 'saadat-like' } }, plan: renderPlan(resolveSkin('saadat-like')) }, () => {});
  ctx.texts = [];
  ctx.clear();
  for (let k = 0; k < 60 * 25; k++) core.frame(1000 + (k * 1000) / 60); // 25 s: at least two sweeps of the ECG lane
  const repaints = ctx.texts.filter((t) => t === 'II  X1  NORMAL').length;
  expect(repaints).toBeGreaterThan(1);
  const clipped = ctx.calls.filter((c) => c.op === 'fillRect' && c.args[0] === 56 && c.args[3] === 18);
  expect(clipped.length).toBeGreaterThan(0);
});
