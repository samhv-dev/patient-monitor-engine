// R-51-1 (Stage 5.1 request, FU-1 item 3): transcutaneous pacing marks. The engine emits `marker { kind: 'paceSpike',
// data: { tcp: true } }` for every pad pulse; the renderer draws them as event overlays (brief §3.5 step 5), on every ECG
// lane of a skin with a device pacer, TALLER than implanted-pacer marks and above the trace, so the overlay is never
// mistaken for the sampled 3–6 mV spike at the baseline.
import { describe, expect, it } from 'vitest';
import { resolveSkin } from '@pme/skins';
import { drawMark, Overlays, shows } from '../src/overlays.ts';
import { renderPlan } from '../src/skin-plan.ts';
import { SweepLane } from '../src/sweep-lane.ts';
import { FakeCtx } from './fake-ctx.ts';

const lane = () =>
  new SweepLane({ x: 0, y: 100, width: 800, height: 120, baseline: 0.6, rate: 500, mmPerS: 25, pxPerMm: 3.78, gainMmPerMv: 10, color: '#0f0', background: '#000', lineWidth: 1.5, eraseGapPx: 16 }, 1);

/** The vertical segments stroked by one drawMark call: [x, y0, y1]. */
function segments(ctx: FakeCtx): number[][] {
  const out: number[][] = [];
  ctx.calls.forEach((c, i) => {
    const p = ctx.calls[i - 1];
    if (c.op === 'lineTo' && p?.op === 'moveTo' && p.args[0] === c.args[0]) out.push([c.args[0] as number, p.args[1] as number, c.args[1] as number]);
  });
  return out;
}

describe('TCP pace marks (R-51-1)', () => {
  const plan = renderPlan(resolveSkin('zoll-like'));
  const px = 3.78;

  it('the overlay queue tags TCP spikes from the marker source field', () => {
    const o = new Overlays();
    o.push({ type: 'marker', t: 1, kind: 'paceSpike', data: { chamber: 2, captured: true, tcp: true, mA: 80 } });
    o.push({ type: 'marker', t: 2, kind: 'paceSpike', data: { chamber: 2, captured: true, tcp: false } });
    const [a, b] = o.due(3);
    expect(a).toMatchObject({ kind: 'pace', tcp: true });
    expect(b).toMatchObject({ kind: 'pace', tcp: false });
  });

  it('a pacer skin shows TCP marks even with pace detect off; a skin without a pacer and pace detect off does not', () => {
    expect(plan.devicePacer).toBe(true);
    expect(shows(plan, { t: 1, kind: 'pace', tcp: true })).toBe(true);
    const philips = renderPlan(resolveSkin('philips-like'));
    expect(shows(philips, { t: 1, kind: 'pace', tcp: true })).toBe(false);
  });

  it('a TCP mark is taller than an implanted-pacer mark, starts at the lane top and stays clear of the baseline', () => {
    const l = lane();
    const c = l.cfg;
    const base = c.y + c.baseline * c.height;
    const imp = new FakeCtx();
    drawMark(imp, l, { t: 1, kind: 'pace' }, plan, px);
    const tcp = new FakeCtx();
    drawMark(tcp, l, { t: 1, kind: 'pace', tcp: true }, plan, px);
    const [si] = segments(imp);
    const [st] = segments(tcp);
    const len = (s: number[]) => Math.abs((s[2] as number) - (s[1] as number));
    expect(len(st!)).toBeGreaterThan(1.5 * len(si!));
    expect(len(st!)).toBeGreaterThanOrEqual(5 * px - 0.01); // ≥ 5 mm
    expect(Math.min(st![1]!, st![2]!)).toBeLessThanOrEqual(c.y + 2 * px); // begins within 2 mm of the lane top
    expect(Math.max(st![1]!, st![2]!)).toBeLessThan(base - 2 * px); // never reaches the trace baseline
    // a horizontal cap at the top tells it apart from an implanted spike at a glance
    const cap = tcp.calls.findIndex((q, i) => q.op === 'lineTo' && tcp.calls[i - 1]?.op === 'moveTo' && tcp.calls[i - 1]!.args[1] === q.args[1]);
    expect(cap).toBeGreaterThan(-1);
    // drawn in the skin foreground, clipped to the lane
    const strokes = tcp.calls.filter((q) => q.op === 'stroke');
    expect(strokes.every((q) => q.style === plan.foreground && q.clip?.[0]?.[1] === c.y)).toBe(true);
  });

  it('a vertical-line skin (saadat-like) draws a TCP mark through the baseline, taller than its 10 mm implanted mark', () => {
    const saadat = renderPlan(resolveSkin('saadat-like'));
    const l = lane();
    const imp = new FakeCtx();
    drawMark(imp, l, { t: 1, kind: 'pace' }, saadat, px);
    const tcp = new FakeCtx();
    drawMark(tcp, l, { t: 1, kind: 'pace', tcp: true }, saadat, px);
    const len = (s: number[]) => Math.abs((s[2] as number) - (s[1] as number));
    expect(len(segments(tcp)[0]!)).toBeGreaterThan(len(segments(imp)[0]!));
  });
});
