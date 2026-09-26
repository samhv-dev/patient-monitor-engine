// Event overlays on the ECG lanes (brief §3.5 step 5; research/05 §2.6): pace marks, sync markers, shock marks and
// lead-off dashes. They are drawn from EVENTS, never from samples, a little behind the cursor (so the next frame's
// erase band does not take them) and the erase bar removes them on the next lap, like the trace.
import type { EngineEvent } from '@pme/engine-core';
import type { Ctx2D } from './ctx.ts';
import type { RenderPlan } from './skin-plan.ts';
import type { SweepLane } from './sweep-lane.ts';

/** Marks are drawn once the render time is this far past them [ENG]: ≥ 4 px behind the cursor at 25 mm/s. */
export const DRAW_LAG_S = 0.05;
const DASH_PX = 6;

export interface OverlayMark {
  t: number;
  kind: 'pace' | 'sync' | 'shock';
  tcp?: boolean;
  label?: string;
}

export class Overlays {
  private queue: OverlayMark[] = [];
  leadsOff = false;

  /** Watch the engine event stream. */
  push(e: EngineEvent): void {
    if (e.type === 'marker') {
      if (e.kind === 'paceSpike') this.add({ t: e.t, kind: 'pace', tcp: e.data?.tcp === true });
      else if (e.kind === 'syncR') this.add({ t: e.t, kind: 'sync' });
      else if (e.kind === 'shock') this.add({ t: (e.data?.atS as number | undefined) ?? e.t, kind: 'shock', label: `${String(e.data?.energyJ ?? '')} J` });
    } else if (e.type === 'alarm' && e.id === 'ecgLeadsOff' && e.level !== undefined) {
      if (e.state === 'raised') this.leadsOff = true;
      if (e.state === 'cleared') this.leadsOff = false;
    }
  }

  private add(m: OverlayMark): void {
    let i = this.queue.length;
    while (i > 0 && (this.queue[i - 1] as OverlayMark).t > m.t) i--;
    this.queue.splice(i, 0, m);
  }

  /** Marks whose time has come at render time t (removed from the queue). */
  due(t: number): OverlayMark[] {
    let n = 0;
    while (n < this.queue.length && (this.queue[n] as OverlayMark).t <= t - DRAW_LAG_S) n++;
    return this.queue.splice(0, n);
  }

  clear(): void {
    this.queue = [];
  }
}

/** Does this plan draw this mark at all? */
export function shows(plan: RenderPlan, m: OverlayMark): boolean {
  if (m.kind === 'pace') return plan.paceDetect || (m.tcp === true && plan.devicePacer);
  if (m.kind === 'sync') return plan.syncMarker !== null;
  return true;
}

function vline(ctx: Ctx2D, x: number, y0: number, y1: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y0);
  ctx.lineTo(x, y1);
  ctx.stroke();
}

/** Draw one mark on one ECG lane (inside the lane rectangle). */
export function drawMark(ctx: Ctx2D, lane: SweepLane, m: OverlayMark, plan: RenderPlan, pxPerMm: number): void {
  const c = lane.cfg;
  const x = c.x + (lane.xOf(m.t * c.rate) % c.width);
  const base = c.y + c.baseline * c.height;
  const clampY = (y: number) => Math.min(c.y + c.height, Math.max(c.y, y));
  ctx.save();
  ctx.beginPath();
  ctx.rect(c.x, c.y, c.width, c.height);
  ctx.clip();
  ctx.strokeStyle = plan.foreground;
  ctx.fillStyle = plan.foreground;
  ctx.lineWidth = 1.5;
  if (m.kind === 'pace') {
    const h = plan.paceMarker.heightMm * pxPerMm;
    // vertical-line: a 1 cm line through the baseline (saadat-like); marker-above: a short mark near the lane top
    if (plan.paceMarker.style === 'vertical-line') vline(ctx, x, clampY(base - h / 2), clampY(base + h / 2));
    else vline(ctx, x, c.y + 4, c.y + 4 + h);
  } else if (m.kind === 'sync') {
    const s = 5;
    if (plan.syncMarker === 'line') vline(ctx, x, c.y + 4, c.y + 0.3 * c.height);
    else {
      // triangle-mid-qrs (LIFEPAK-like) at the baseline, r-above (ZOLL-like) near the top: an outlined ▼
      const y = plan.syncMarker === 'triangle-mid-qrs' ? base - s : c.y + 4;
      ctx.beginPath();
      ctx.moveTo(x - s, y);
      ctx.lineTo(x + s, y);
      ctx.lineTo(x, y + 1.6 * s);
      ctx.lineTo(x - s, y);
      ctx.stroke();
    }
  } else {
    ctx.lineWidth = 2.5;
    vline(ctx, x, c.y, c.y + c.height);
    ctx.font = `12px ${plan.font}`;
    ctx.textBaseline = 'top';
    ctx.fillText(m.label ?? 'SHOCK', x + 4, c.y + 4);
  }
  ctx.restore();
}

/** Lead-off (brief §6.2 "flat dashed trace"): repaint the samples just drawn as a dashed baseline. */
export function drawLeadOffDashes(ctx: Ctx2D, lane: SweepLane, fromIdx: number, toIdx: number): void {
  if (toIdx <= fromIdx) return;
  const c = lane.cfg;
  const x0 = lane.xOf(fromIdx + 1);
  const x1 = lane.xOf(toIdx) + 1;
  const base = c.y + c.baseline * c.height;
  ctx.save();
  ctx.beginPath();
  ctx.rect(c.x, c.y, c.width, c.height);
  ctx.clip();
  ctx.strokeStyle = c.color;
  ctx.lineWidth = c.lineWidth;
  for (let a = x0; a < x1; ) {
    const lap = Math.floor(a / c.width);
    const end = Math.min(x1, (lap + 1) * c.width);
    ctx.fillStyle = c.background;
    ctx.fillRect(c.x + a - lap * c.width, c.y, end - a, c.height);
    ctx.beginPath();
    for (let d = Math.floor(a / (2 * DASH_PX)) * 2 * DASH_PX; d < end; d += 2 * DASH_PX) {
      const s0 = Math.max(a, d);
      const s1 = Math.min(end, d + DASH_PX);
      if (s1 <= s0) continue;
      ctx.moveTo(c.x + s0 - lap * c.width, base);
      ctx.lineTo(c.x + s1 - lap * c.width, base);
    }
    ctx.stroke();
    a = end;
  }
  ctx.restore();
}
