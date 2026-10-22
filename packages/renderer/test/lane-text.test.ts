// Lane text as on the real unit (research/34 §3 row 9, IMG_8113): white lane text, wave labels and sweep speeds at the
// right, "50mmHg" at the CO2 lane's top-left, the second ECG lane unlabelled. Skins without `layout.laneText` keep the
// old chrome.
//
// Two lane-text modes:
// - the rc.3 chrome (14 px, a 56 px chrome column, right texts on black boxes) — what a phone in portrait keeps, so the
//   F28 fit guards measure against it; tested here with the portrait plan;
// - pass 2 (the rc.3 photo review, landscape): `layout.laneText` fontPx 18, a gutter (ECG traces from x 0, the others
//   from x 18), the ECG label's parts at their anchors, scale values in their columns, right texts 45 px in, every text
//   drawn OVER the trace and repainted only where the sweep has just drawn (no black boxes), no 1 mV bar.
import { describe, expect, it } from 'vitest';
import { resolveSkin } from '@pme/skins';
import { DEFAULT_PX_PER_MM } from '../src/calibration.ts';
import { MonitorCore } from '../src/monitor-core.ts';
import { formatSpeed, renderPlan, type RenderPlan } from '../src/skin-plan.ts';
import type { SweepLane } from '../src/sweep-lane.ts';
import { FakeCtx } from './fake-ctx.ts';

/** The rc.3 chrome: the portrait plan (no pass-2 keys) at 96 dpi, as before pass 2. */
const rc3 = (co2: boolean): RenderPlan => ({ ...renderPlan(resolveSkin('saadat-like', { sensors: { co2 } }), undefined, undefined, true), pxPerMm: null });
const pass2 = (co2: boolean): RenderPlan => renderPlan(resolveSkin('saadat-like', { sensors: { co2 } }));

function make(sensors: Record<string, string>, cssW = 1056, cssH = 600, mode: 'rc3' | 'pass2' = 'rc3') {
  const ctx = new FakeCtx();
  const co2 = sensors.co2 === 'on';
  const plan = mode === 'rc3' ? rc3(co2) : pass2(co2);
  const core = new MonitorCore({ width: 0, height: 0 }, ctx, { cssW, cssH, dpr: 1 }, { engine: { seed: 1, device: { skin: 'saadat-like' }, patient: { sensors } }, plan }, () => {});
  let f = 0;
  const run = (s: number) => {
    for (let k = 0, n = Math.round(s * 60); k < n; k++) core.frame(1000 + (f++ * 1000) / 60);
  };
  return { core, ctx, run, plan };
}
const fillTexts = (ctx: FakeCtx, text: string) => ctx.calls.filter((c) => c.op === 'fillText' && c.style?.endsWith(`:${text}`));
const lanesOf = (c: MonitorCore) => (c as unknown as { lanes: SweepLane[] }).lanes;
// the CO2 lane (the third) at the photo's lane weights 115, 117, 96, … of 614 (layout.grid, PR-G)
const [CO2_TOP, CO2_BOTTOM] = [(600 * 232) / 614, (600 * 328) / 614];

describe('saadat-like lane text, the rc.3 chrome (a phone in portrait)', () => {
  it('with the CO2 line: the top scale reads "50mmHg" at the top-left, the label CO2 and "6 mm/s" at the right', () => {
    const { ctx } = make({ co2: 'on' });
    expect(ctx.texts).toEqual([
      'II  X1  NORMAL', '25 mm/s', '50mmHg', '0', 'CO2', '6 mm/s', '200', '120', '40', 'IBP', '25 mm/s', '30', '10', '-10', 'IBP', '25 mm/s', 'NORMAL', 'X1', '25 mm/s',
    ]);
    expect(fillTexts(ctx, '50mmHg')[0]).toMatchObject({ style: 'start:50mmHg', args: [6, CO2_TOP + 6] });
    for (const t of ['CO2', '6 mm/s']) expect(fillTexts(ctx, t)[0]!.style).toBe(`right:${t}`);
    expect(fillTexts(ctx, 'CO2')[0]!.args).toEqual([1056 - 6, CO2_TOP + 6]);
    expect(fillTexts(ctx, '6 mm/s')[0]!.args).toEqual([1056 - 6, CO2_BOTTOM - 18]);
  });

  it('lane text is drawn in the skin foreground; the pleth label in its own colour, its gain in the foreground', () => {
    const { ctx, plan } = make({});
    const fg = resolveSkin('saadat-like').render.foreground;
    expect(plan.laneText).toEqual({ color: fg, fontPx: 14, gutter: null, insetPx: 6, ecgLabelX: null, scaleX: null });
    expect(plan.calBar).toBe(true);
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
    expect(ctx.calls.some((c) => c.op === 'fillRect' && c.args[0] === 56 && c.args[1] === CO2_TOP + 4 && c.args[2]! >= 6 + 6 * 10.5 - 56)).toBe(true);
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
    // the bottom value starts below the top value's ink (≈ 11 px of a 14 px digit): IBP2 is ≈ 34 px, where y0 + h − 18 is 10 px down
    for (const [top, bottom] of [['200', '40'], ['30', '-10']]) expect(fillTexts(ctx, bottom!)[0]!.args[1]! - fillTexts(ctx, top!)[0]!.args[1]!).toBeGreaterThanOrEqual(11);
  });

  it("F28: on a short lane the speed text's cleared box never covers the lane label (NORMAL, IBP, RESP stay whole)", () => {
    const { ctx } = make({}, 390, 215);
    for (const t of ['NORMAL', 'IBP', 'RESP']) expect(ctx.texts).toContain(t);
    const ys = rightRows(ctx);
    for (let k = 1; k < ys.length; k++) expect(ys[k]! - ys[k - 1]!).toBeGreaterThanOrEqual(13); // a cleared box (from y − 2) never reaches the ink (11 px) of the row above
    expect(ctx.texts.filter((t) => t === '25 mm/s')).toHaveLength(1); // the ECG lane, which has no right-hand label, keeps its speed
  });

  it('F28: a phone at 390 × 844 (394 px: IBP ≈ 63–66 px, PLETH ≈ 55 px) still draws every lane text, as before the guards', () => {
    expect(make({}, 390, 394).ctx.texts).toEqual(['II  X1  NORMAL', '25 mm/s', 'RESP', '6 mm/s', '200', '120', '40', 'IBP', '25 mm/s', '30', '10', '-10', 'IBP', '25 mm/s', 'NORMAL', 'X1', '25 mm/s']);
  });

  it('F28: the smallest landscape canvas (548 px, 1366 × 768: PLETH ≈ 77 px) draws every lane text, the guards do not fire', () => {
    const at = (h: number) => make({}, 1056, h).ctx.texts;
    const small = at(548);
    expect(small).toEqual(at(600));
    expect(small).toEqual(['II  X1  NORMAL', '25 mm/s', 'RESP', '6 mm/s', '200', '120', '40', 'IBP', '25 mm/s', '30', '10', '-10', 'IBP', '25 mm/s', 'NORMAL', 'X1', '25 mm/s']);
  });

});

describe('saadat-like lane text, pass 2 (landscape: IMG_8113 rows T1, T2, G1, G2, W2, W5, W10, W11)', () => {
  it('the keys reach the plan in landscape only: a phone in portrait keeps the rc.3 chrome (F28 measures against it)', () => {
    const land = pass2(false);
    expect(land.laneText).toMatchObject({ fontPx: 18, gutter: { ecg: 0, wave: 18 }, insetPx: 45, ecgLabelX: [10, 65, 183], scaleX: { edge: 30, mid: 85 } });
    expect(land.calBar).toBe(false); // W2: ecg.calPulse.defaultOn false
    const port = renderPlan(resolveSkin('saadat-like'), undefined, undefined, true);
    expect(port.laneText).toMatchObject({ fontPx: 14, gutter: null, insetPx: 6, ecgLabelX: null, scaleX: null });
    expect(port.calBar).toBe(true);
    expect(renderPlan(resolveSkin('philips-like')).laneText).toBeNull();
    expect(renderPlan(resolveSkin('philips-like')).calBar).toBe(true);
  });

  it('T1/T2/G2/W11: 18 px text; the ECG label in three parts at x 10, 65, 183; scale values at x 30 (the middle one at 85, across its line); right texts 45 px in', () => {
    const { ctx } = make({ co2: 'on' }, 1056, 600, 'pass2');
    expect(ctx.texts).toEqual([
      'II', 'X1', 'NORMAL', '25 mm/s', '50mmHg', '0', 'CO2', '6 mm/s', '200', '120', '40', 'IBP', '25 mm/s', '30', '10', '-10', 'IBP', '25 mm/s', 'NORMAL', 'X1', '25 mm/s',
    ]);
    expect(['II', 'X1', 'NORMAL'].map((t) => fillTexts(ctx, t)[0]!.args[0])).toEqual([10, 65, 183]);
    expect(fillTexts(ctx, '50mmHg')[0]!.args[0]).toBe(30);
    // the IBP1 lane (y 600 × 328 / 614 … 600 × 430 / 614): "120" at x 85, its middle on the 120 line
    const [top, h] = [(600 * 328) / 614, (600 * 102) / 614];
    const line = top + ((200 - 120) / 160) * h;
    expect(fillTexts(ctx, '120')[0]!.args).toEqual([85, line - 9]);
    expect(fillTexts(ctx, '6 mm/s')[0]!.args).toEqual([1056 - 45, CO2_BOTTOM - 22]);
  });

  it('G1/W2: ECG traces start at x 0, the other lanes at x 18; no 1 mV bar', () => {
    const { core, ctx } = make({ co2: 'on' }, 1056, 600, 'pass2');
    const xs = lanesOf(core).map((l) => [l.cfg.x, l.cfg.width]);
    expect(xs).toEqual([[0, 1056], [0, 1056], [18, 1038], [18, 1038], [18, 1038], [18, 1038]]);
    // the bar is a 6-point stroke from x 14 to 46 (moveTo 14 … lineTo 46); none is drawn
    expect(ctx.calls.some((c) => c.op === 'moveTo' && c.args[0] === 14)).toBe(false);
  });

  it('W5: no black box is cleared under a lane text; a text is repainted only inside the rects the sweep has just drawn', () => {
    const { core, ctx, run } = make({ co2: 'on' }, 160, 600, 'pass2');
    run(2);
    ctx.texts = [];
    ctx.clear();
    run(6); // CO2 at 6 mm/s (3.10 px/mm: 18.6 px/s) crosses the 142 px lane in ≈ 7.6 s
    const texts = ctx.calls.filter((c) => c.op === 'fillText');
    expect(texts.filter((c) => c.style === 'right:6 mm/s').length).toBeGreaterThan(1);
    // every repaint is clipped to rects the sweep has just cleared (each is a background fillRect issued shortly before it)
    for (const t of texts) {
      const k = ctx.calls.indexOf(t);
      expect(t.clip).not.toBeNull();
      for (const r of t.clip!) {
        const cleared = ctx.calls.slice(Math.max(0, k - 400), k).some((c) => c.op === 'fillRect' && c.style === '#000000' && c.args[0] === r[0] && c.args[2] === r[2]);
        expect(cleared, `${t.style} clip ${r.join(',')}`).toBe(true);
      }
    }
    // no fillRect of a text box: the only background fills are the sweep's own bands (lane-high) and its gutter
    const boxes = ctx.calls.filter((c) => c.op === 'fillRect' && c.style === '#000000' && c.args[3]! < 50);
    expect(boxes).toEqual([]);
    expect(lanesOf(core)[2]!.cfg.x).toBe(18);
  });

  it('a lane cleared whole (its line detached) gets every text back at once, its gutter cleared first', () => {
    const { core, ctx, run } = make({ co2: 'on', abp: 'connected' }, 160, 600, 'pass2');
    run(2);
    ctx.clear();
    ctx.texts = [];
    core.command({ id: 'd1', issuedBy: 't', type: 'attachSensor', sensor: 'abp', state: 'none' } as never);
    run(0.1);
    expect(ctx.texts).toEqual(expect.arrayContaining(['200', '120', '40', 'IBP', '25 mm/s']));
    const top = (600 * 328) / 614;
    expect(ctx.calls.some((c) => c.op === 'fillRect' && c.args[0] === 0 && c.args[1] === top && c.args[2] === 18)).toBe(true);
  });

  it('a gain change repaints only the gain part: the old "X1" box is cleared, "NORMAL" and "II" stay', () => {
    const { ctx, run } = make({}, 1056, 320, 'pass2'); // ECG1 115/614 × 320 ≈ 60 px: the auto-gain halves the gain
    ctx.texts = [];
    run(6.5);
    expect(ctx.texts).toContain('X0.5');
    const relabel = ctx.calls.findIndex((c) => c.op === 'fillText' && c.style === 'start:X0.5');
    const before = ctx.calls.slice(Math.max(0, relabel - 6), relabel);
    expect(before.some((c) => c.op === 'fillRect' && c.args[0] === 65)).toBe(true); // the old X1 box, at its anchor
  });

  it('W1: the skin screen scale (sweep.pxPerMm 3.10) until the user calibrates', () => {
    const { core } = make({}, 1056, 600, 'pass2');
    expect(lanesOf(core)[0]!.cfg.pxPerMm).toBe(3.1);
    core.calibrate(4);
    expect(lanesOf(core)[0]!.cfg.pxPerMm).toBe(4);
    const legacy = make({}, 1056, 600, 'rc3').core;
    expect(lanesOf(legacy)[0]!.cfg.pxPerMm).toBe(DEFAULT_PX_PER_MM);
    expect(renderPlan(resolveSkin('philips-like')).pxPerMm).toBeNull();
  });

  it('fit guards: a short landscape lane (1024 × 640: a 485 px canvas, PLETH ≈ 68 px) drops the pleth "X1" before its speed; no right-hand rows overlap', () => {
    const rows = (ctx: FakeCtx) => ctx.calls.filter((c) => c.op === 'fillText' && c.style?.startsWith('right:')).map((c) => c.args[1]!).sort((a, b) => a - b);
    const tall = make({}, 1056, 614, 'pass2').ctx;
    expect(tall.texts.slice(-3)).toEqual(['NORMAL', 'X1', '25 mm/s']); // the photo's 614 px of lanes: all three
    const short = make({}, 1056, 485, 'pass2').ctx;
    expect(short.texts.slice(-2)).toEqual(['NORMAL', '25 mm/s']);
    for (const ctx of [tall, short]) {
      const ys = rows(ctx);
      for (let k = 1; k < ys.length; k++) expect(ys[k]! - ys[k - 1]!).toBeGreaterThanOrEqual(22); // one 22 px row each (18 px text)
    }
    expect(short.texts).toEqual(expect.arrayContaining(['120', '10'])); // the middle IBP values still fit at 485 px
    expect(make({}, 1056, 300, 'pass2').ctx.texts).not.toContain('120'); // … and are left out when they would not
  });

  it('W10: a dotted line at the CO2 scale top (co2.scaleLineTop)', () => {
    const p = pass2(true);
    expect(p.lanes.find((l) => l.channel === 'co2')!.scaleLines).toEqual([50]);
    expect(renderPlan(resolveSkin('philips-like')).lanes.every((l) => l.channel !== 'co2' || l.scaleLines === null)).toBe(true);
  });
});

describe('lane text, other plans', () => {
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
