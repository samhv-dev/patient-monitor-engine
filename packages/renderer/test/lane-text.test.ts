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
    // the CO2 lane (the third) at the photo's lane weights 115, 117, 96, … of 614 (layout.grid, PR-G)
    const [top, bottom] = [(600 * 232) / 614, (600 * 328) / 614];
    expect(fillTexts(ctx, '50mmHg')[0]).toMatchObject({ style: 'start:50mmHg', args: [6, top + 6] });
    for (const t of ['CO2', '6 mm/s']) expect(fillTexts(ctx, t)[0]!.style).toBe(`right:${t}`);
    expect(fillTexts(ctx, 'CO2')[0]!.args).toEqual([1056 - 6, top + 6]);
    expect(fillTexts(ctx, '6 mm/s')[0]!.args).toEqual([1056 - 6, bottom - 18]);
  });

  it('lane text is drawn in the skin foreground; the pleth label in its own colour, its gain in the foreground', () => {
    const { ctx, plan } = make({});
    const fg = resolveSkin('saadat-like').render.foreground;
    expect(plan.laneText).toEqual({ color: fg });
    for (const t of ['II  X1  NORMAL', '25 mm/s', '200', 'IBP', 'X1']) expect(fillTexts(ctx, t).every((c) => c.color === fg)).toBe(true);
    expect(fillTexts(ctx, 'NORMAL')[0]!.color).toBe('#ECE84A');
  });

  it('the second ECG lane has no label and no speed (as photographed) until its lead differs from the first', () => {
    const { core, ctx } = make({});
    expect(fillTexts(ctx, 'II  X1  NORMAL')).toHaveLength(1);
    expect(fillTexts(ctx, '25 mm/s').filter((c) => c.args[1]! < 200)).toHaveLength(1); // ECG1 only (lanes 0–1 end at y 600 × 232 / 614 ≈ 227)
    ctx.texts = [];
    core.command({ id: 'l1', issuedBy: 't', type: 'device', action: { device: 'ecg', action: 'lead', value: 'V1', lane: 1 } } as never);
    expect(ctx.texts).toContain('V1  X1  NORMAL');
  });

  it('right-hand lane texts on wave lanes are repainted as the erase bar passes them (review L-3)', () => {
    const { ctx, run } = make({ abp: 'connected', cvp: 'connected' }, 160);
    ctx.texts = [];
    ctx.clear();
    run(6); // a light test (CI runs it beside the engine tick bench): RESP at 6 mm/s crosses 104 px in ≈ 4.6 s, IBP in ≈ 1.1 s
    expect(ctx.texts.filter((t) => t === '6 mm/s').length).toBeGreaterThan(1);
    expect(ctx.texts.filter((t) => t === 'IBP').length).toBeGreaterThan(6);
    // each repaint clears its own box first (background, 18 px high, ending 6 px from the right edge)
    expect(ctx.calls.some((c) => c.op === 'fillRect' && c.style === '#000000' && c.args[3] === 18 && Math.abs(c.args[0]! + c.args[2]! - 154) < 1e-6)).toBe(true);
  });

  it('"50mmHg" runs past the 56 px chrome, so its tail is repainted like a long ECG label (1280x800 screenshot)', () => {
    const { ctx, run } = make({ co2: 'on' }, 160);
    ctx.texts = [];
    run(6); // CO2 at 6 mm/s crosses 104 px in ≈ 4.6 s
    expect(ctx.texts.filter((t) => t === '50mmHg').length).toBeGreaterThan(1);
    // the repainted tail covers the whole word ("mm" is wide: the 8.5 px/char estimate left the "g" cut)
    expect(ctx.calls.some((c) => c.op === 'fillRect' && c.args[0] === 56 && c.args[1] === (600 * 232) / 614 + 4 && c.args[2]! >= 6 + 6 * 10.5 - 56)).toBe(true);
  });

  it('a cleared CO2 lane gets "50mmHg" back at once, with its right-hand texts', () => {
    const { core, ctx, run } = make({ co2: 'on' }, 160);
    run(2);
    ctx.texts = [];
    core.command({ id: 'd2', issuedBy: 't', type: 'attachSensor', sensor: 'co2', state: 'off' } as never);
    run(1);
    expect(ctx.texts).toEqual(expect.arrayContaining(['50mmHg', 'CO2', '6 mm/s']));
  });

  it('a right-hand box is wide enough for capitals (the screenshot clipped "NORMAL" to "ORMAL")', () => {
    const { ctx } = make({});
    const box = ctx.calls.find((c, k) => c.op === 'fillRect' && ctx.calls[k + 1]?.style === 'right:NORMAL');
    expect(box?.args[2]).toBeGreaterThanOrEqual(6 * 10.5);
  });

  it('a lane that is cleared (its line detached) gets its texts back at once', () => {
    const { core, ctx, run } = make({ abp: 'connected' }, 160);
    run(2);
    ctx.texts = [];
    core.command({ id: 'd1', issuedBy: 't', type: 'attachSensor', sensor: 'abp', state: 'none' } as never);
    run(1);
    expect(ctx.texts).toContain('IBP');
  });

  // F28 (a phone in portrait, 390 × 664 in Safari: 215 px of canvas for six lanes, ≈ 30–41 px each)
  const rightRows = (ctx: FakeCtx) => ctx.calls.filter((c) => c.op === 'fillText' && c.style?.startsWith('right:')).map((c) => c.args[1]!).sort((a, b) => a - b);

  it('F28: on a short lane the middle IBP scale value is left out instead of overprinting the top value', () => {
    const { ctx } = make({}, 390, 215);
    for (const t of ['200', '40', '30', '-10']) expect(ctx.texts).toContain(t);
    expect(ctx.texts).not.toContain('120');
    expect(ctx.texts).not.toContain('10');
  });

  it("F28: on a short lane the speed text's cleared box never covers the lane label (NORMAL, IBP, RESP stay whole)", () => {
    const { ctx } = make({}, 390, 215);
    for (const t of ['NORMAL', 'IBP', 'RESP']) expect(ctx.texts).toContain(t);
    const ys = rightRows(ctx);
    for (let k = 1; k < ys.length; k++) expect(ys[k]! - ys[k - 1]!).toBeGreaterThanOrEqual(18); // one 18 px row each, no overlap
    expect(ctx.texts.filter((t) => t === '25 mm/s')).toHaveLength(1); // the ECG lane, which has no right-hand label, keeps its speed
  });

  it('F28: the smallest landscape canvas (548 px, 1366 × 768: PLETH ≈ 77 px) draws every lane text, the guards do not fire', () => {
    const at = (h: number) => make({}, 1056, h).ctx.texts;
    const small = at(548);
    expect(small).toEqual(at(600));
    expect(small).toEqual(['II  X1  NORMAL', '25 mm/s', 'RESP', '6 mm/s', '200', '120', '40', 'IBP', '25 mm/s', '30', '10', '-10', 'IBP', '25 mm/s', 'NORMAL', 'X1', '25 mm/s']);
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
