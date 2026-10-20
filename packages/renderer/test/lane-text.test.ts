// Lane text as on the real unit (research/34 §3 row 9, IMG_8113): white lane text, wave labels and sweep speeds at the
// right, "50mmHg" at the CO2 lane's top-left, the second ECG lane unlabelled. Skins without `layout.laneText` keep the
// old chrome.
import { describe, expect, it } from 'vitest';
import { resolveSkin } from '@pme/skins';
import { MonitorCore } from '../src/monitor-core.ts';
import { formatSpeed, renderPlan } from '../src/skin-plan.ts';
import { FakeCtx } from './fake-ctx.ts';

function make(sensors: Record<string, string>, cssW = 1056, cssH = 600) {
  const ctx = new FakeCtx();
  const co2 = sensors.co2 === 'on';
  const plan = renderPlan(resolveSkin('saadat-like', { sensors: { co2 } }));
  const core = new MonitorCore({ width: 0, height: 0 }, ctx, { cssW, cssH, dpr: 1 }, { engine: { seed: 1, device: { skin: 'saadat-like' }, patient: { sensors } }, plan }, () => {});
  let f = 0;
  const run = (s: number) => {
    for (let k = 0, n = Math.round(s * 60); k < n; k++) core.frame(1000 + (f++ * 1000) / 60);
  };
  return { core, ctx, run, plan };
}
const fillTexts = (ctx: FakeCtx, text: string) => ctx.calls.filter((c) => c.op === 'fillText' && c.style?.endsWith(`:${text}`));

describe('saadat-like lane text', () => {
  it('with the CO2 line: the top scale reads "50mmHg" at the top-left, the label CO2 and "6 mm/s" at the right', () => {
    const { ctx } = make({ co2: 'on' });
    expect(ctx.texts).toEqual([
      'II  X1  NORMAL', '25 mm/s', '50mmHg', '0', 'CO2', '6 mm/s', '200', '120', '40', 'IBP', '25 mm/s', '30', '10', '-10', 'IBP', '25 mm/s', 'NORMAL', 'X1', '25 mm/s',
    ]);
    const h = 600 / 6;
    expect(fillTexts(ctx, '50mmHg')[0]).toMatchObject({ style: 'start:50mmHg', args: [6, 2 * h + 6] });
    for (const t of ['CO2', '6 mm/s']) expect(fillTexts(ctx, t)[0]!.style).toBe(`right:${t}`);
    expect(fillTexts(ctx, 'CO2')[0]!.args).toEqual([1056 - 6, 2 * h + 6]);
    expect(fillTexts(ctx, '6 mm/s')[0]!.args).toEqual([1056 - 6, 3 * h - 18]);
  });

  it('lane text is drawn in the skin foreground; the pleth label in its own colour, its gain in the foreground', () => {
    const { ctx, plan } = make({});
    const fg = resolveSkin('saadat-like').render.foreground;
    expect(plan.laneText).toEqual({ color: fg });
    for (const t of ['II  X1  NORMAL', '25 mm/s', '200', 'IBP', 'X1']) expect(fillTexts(ctx, t).every((c) => c.color === fg)).toBe(true);
    expect(fillTexts(ctx, 'NORMAL')[0]!.color).toBe('#F0F030');
  });

  it('the second ECG lane has no label and no speed (as photographed) until its lead differs from the first', () => {
    const { core, ctx } = make({});
    expect(fillTexts(ctx, 'II  X1  NORMAL')).toHaveLength(1);
    expect(fillTexts(ctx, '25 mm/s').filter((c) => c.args[1]! < 200)).toHaveLength(1); // ECG1 only (lanes 0–1 are y < 200)
    ctx.texts = [];
    core.command({ id: 'l1', issuedBy: 't', type: 'device', action: { device: 'ecg', action: 'lead', value: 'V1', lane: 1 } } as never);
    expect(ctx.texts).toContain('V1  X1  NORMAL');
  });

  it('right-hand lane texts on wave lanes are repainted as the erase bar passes them (review L-3)', () => {
    const { ctx, run } = make({ abp: 'connected', cvp: 'connected' }, 400);
    ctx.texts = [];
    ctx.clear();
    run(25); // RESP at 6 mm/s crosses 344 px in ≈ 15 s; IBP at 25 mm/s in ≈ 3.6 s
    expect(ctx.texts.filter((t) => t === '6 mm/s').length).toBeGreaterThan(1);
    expect(ctx.texts.filter((t) => t === 'IBP').length).toBeGreaterThan(6);
    // each repaint clears its own box first (background, 18 px high, ending 6 px from the right edge)
    expect(ctx.calls.some((c) => c.op === 'fillRect' && c.style === '#000000' && c.args[3] === 18 && Math.abs(c.args[0]! + c.args[2]! - 394) < 1e-6)).toBe(true);
  });

  it('a lane that is cleared (its line detached) gets its texts back at once', () => {
    const { core, ctx, run } = make({ abp: 'connected' }, 400);
    run(2);
    ctx.texts = [];
    core.command({ id: 'd1', issuedBy: 't', type: 'attachSensor', sensor: 'abp', state: 'none' } as never);
    run(1);
    expect(ctx.texts).toContain('IBP');
  });

  it('pages that name their lanes keep the old chrome', () => {
    const p = renderPlan(resolveSkin('saadat-like'), undefined, { lanes: ['ecgII'], waves: ['abp'] });
    expect(p.laneText).toBeNull();
    expect(p.lanes.every((l) => l.rightLabel === null && l.scaleSuffix === '')).toBe(true);
    expect(renderPlan(resolveSkin('philips-like')).laneText).toBeNull();
  });

  it('formatSpeed', () => {
    expect([25, 6, 12.5, 6.25].map(formatSpeed)).toEqual(['25 mm/s', '6 mm/s', '12.5 mm/s', '6.25 mm/s']);
  });
});
