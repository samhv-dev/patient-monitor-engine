// Stage 4b MonitorCore: skin layout (RR-1), switch without restart, auto gain (RR-2), event overlays.
import { describe, expect, it } from 'vitest';
import { resolveSkin } from '@pme/skins';
import { MonitorCore } from '../src/monitor-core.ts';
import { renderPlan } from '../src/skin-plan.ts';
import { FakeCtx } from './fake-ctx.ts';

function make(skin: string, engine: Record<string, unknown> = {}, cssH = 500) {
  const ctx = new FakeCtx();
  const core = new MonitorCore({ width: 0, height: 0 }, ctx, { cssW: 1056, cssH, dpr: 1 }, { engine: { seed: 1, device: { skin }, ...engine }, plan: renderPlan(resolveSkin(skin)) }, () => {});
  let f = 0;
  const run = (s: number) => {
    const n = Math.round(s * 60);
    for (let k = 0; k < n; k++) core.frame(1000 + (f++ * 1000) / 60);
  };
  return { core, ctx, run };
}
const cmd = (body: Record<string, unknown>) => ({ id: `c${Math.random()}`, issuedBy: 't', ...body }) as never;

describe('MonitorCore with a skin plan', () => {
  it('saadat-like lanes and chrome: II X1 NORMAL, PLETH, IBP1 200/40, IBP2 30/-10, RESP (auto-scaled, no numbers)', () => {
    const { ctx } = make('saadat-like');
    expect(ctx.texts).toEqual(['II  X1  NORMAL', 'PLETH', 'IBP1', '200', '40', 'IBP2', '30', '-10', 'RESP']);
    expect(ctx.calls.some((c) => c.op === 'fillRect' && c.style === '#000000')).toBe(true);
  });

  it('a skin switch relayouts lanes and chrome without restarting the engine', () => {
    const { core, ctx, run } = make('saadat-like');
    run(2);
    const tick = core.engine.now().tick;
    ctx.texts = [];
    core.setPlan(renderPlan(resolveSkin('philips-like')));
    expect(ctx.texts).toEqual(['II  M', 'V1  M', 'ART', '150', '0', 'PLETH', 'CO2', '40', '0']);
    run(1);
    expect(core.engine.now().tick).toBeGreaterThanOrEqual(tick + 49);
  });

  it('auto gain (RR-2): lead II (~1.4 mV p-p) in a 60 px lane settles on ×0.5 and relabels', () => {
    const { ctx, run } = make('saadat-like', {}, 300);
    ctx.texts = [];
    run(6.5);
    expect(ctx.texts).toContain('II  X0.5  NORMAL');
  });

  it('zoll-like: TCP pace marks and sync markers in the foreground colour, a shock mark with its energy', () => {
    const { core, ctx, run } = make('zoll-like');
    run(1);
    core.command(cmd({ type: 'applyEvent', event: { kind: 'pacer', action: 'set', mode: 'fixed', ratePpm: 80, mA: 100 } }));
    ctx.clear();
    run(3);
    const white = () => ctx.calls.filter((c) => c.op === 'stroke' && c.style === '#FFFFFF').length;
    expect(white()).toBeGreaterThanOrEqual(3); // 80 ppm for 3 s on the one ECG lane (the last spike may still be in the lag)
    core.command(cmd({ type: 'applyEvent', event: { kind: 'pacer', action: 'set', mode: 'off' } }));
    core.command(cmd({ type: 'applyEvent', event: { kind: 'defib', action: 'syncOn' } }));
    core.command(cmd({ type: 'applyEvent', event: { kind: 'defib', action: 'charge' } }));
    run(6);
    ctx.clear();
    ctx.texts = [];
    run(2);
    expect(white()).toBeGreaterThanOrEqual(2);
    core.command(cmd({ type: 'applyEvent', event: { kind: 'defib', action: 'shock' } }));
    run(1.5);
    expect(ctx.texts).toContain('120 J');
  });

  it('philips-like draws no pace marks for a paced rhythm (pace detect off), lead-off draws a dashed baseline', () => {
    const { core, ctx, run } = make('philips-like', { patient: { rhythm: { id: 'pacedVVI' } } });
    run(2);
    ctx.clear();
    run(2);
    expect(ctx.calls.some((c) => c.op === 'stroke' && c.style === '#FFFFFF')).toBe(false);
    core.command(cmd({ type: 'attachSensor', sensor: 'ecg', state: 'off' }));
    run(1);
    ctx.clear();
    run(1);
    const base = 0.6 * 100; // lane 0: 500 px / 5 lanes, baseline 0.6
    const dashes = ctx.calls.filter((c, i) => {
      const prev = ctx.calls[i - 1];
      return c.op === 'lineTo' && c.args[1] === base && prev?.op === 'moveTo' && (c.args[0] as number) - (prev.args[0] as number) <= 6.01;
    });
    expect(dashes.length).toBeGreaterThan(5);
  });
});
