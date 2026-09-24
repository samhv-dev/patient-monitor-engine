// One sweep lane (brief §3.5 "Per frame, for each lane"): x comes from sim time, never from frame counts.
// Each frame: (1) take the sample range since the last frame, (2) clear the erase gap ahead of the cursor,
// (3) draw the new samples min/max-decimated per device-pixel column, (4) re-stroke the previous frame's
// last two points so joins are seamless. Static chrome (labels, cal bar) is drawn elsewhere, once.
import { sweepPxPerS } from './calibration.ts';
import type { Ctx2D } from './ctx.ts';
import { decimateMinMax, type Column } from './decimate.ts';

export interface LaneConfig {
  /** Trace area in CSS px. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Baseline as a fraction of the height from the top. */
  baseline: number;
  rate: number; // samples/s of the channel
  mmPerS: number; // 25 by default
  pxPerMm: number; // calibration
  gainMmPerMv: number; // 10 mm/mV default
  color: string;
  background: string;
  lineWidth: number; // 1.5–2 CSS px
  eraseGapPx: number; // 16 CSS px default (brief §3.5)
}

/** Reads samples starting at absolute index `from` into `out`; returns the count (out[0] = sample `from`). */
export type SampleSource = (from: number, out: Float32Array) => number;

type Pt = { x: number; y: number }; // x unwrapped CSS px relative to lane start, y CSS px

export class SweepLane {
  cfg: LaneConfig;
  private dpr: number;
  private lastIndex = -1;
  private tail: Pt[] = [];
  private scratch = new Float32Array(4096);
  private cols: Column[] = [];

  constructor(cfg: LaneConfig, dpr: number) {
    this.cfg = cfg;
    this.dpr = dpr;
  }

  get pxPerS(): number {
    return sweepPxPerS(this.cfg.mmPerS, this.cfg.pxPerMm);
  }

  /** Forget drawn history (after resize, calibration change, or a big time jump). */
  reset(ctx: Ctx2D, dpr: number = this.dpr): void {
    this.dpr = dpr;
    this.lastIndex = -1;
    this.tail = [];
    ctx.fillStyle = this.cfg.background;
    ctx.fillRect(this.cfg.x, this.cfg.y, this.cfg.width, this.cfg.height);
  }

  /** Unwrapped x (CSS px) of absolute sample n. */
  xOf(n: number): number {
    return (n / this.cfg.rate) * this.pxPerS;
  }

  private yOf(mv: number): number {
    const c = this.cfg;
    const y = c.y + c.baseline * c.height - mv * c.gainMmPerMv * c.pxPerMm;
    return Math.min(c.y + c.height, Math.max(c.y, y));
  }

  /** Snap a CSS x to the device-pixel grid. */
  private snap(x: number): number {
    return Math.floor(x * this.dpr) / this.dpr;
  }

  /** Fill [x0, x1) (unwrapped, CSS px) with the background, wrapping at the lane width. */
  private clearSpan(ctx: Ctx2D, x0: number, x1: number): void {
    const c = this.cfg;
    ctx.fillStyle = c.background;
    let a = x0;
    while (a < x1) {
      const lap = Math.floor(a / c.width);
      const end = Math.min(x1, (lap + 1) * c.width);
      const la = this.snap(a - lap * c.width);
      const lb = end - lap * c.width >= c.width ? c.width : this.snap(end - lap * c.width) + 1 / this.dpr;
      ctx.fillRect(c.x + la, c.y, Math.max(0, lb - la), c.height);
      a = end;
    }
  }

  /** Draw everything up to render time `t` (sim seconds). Returns the cursor x inside the lane (CSS px). */
  draw(ctx: Ctx2D, t: number, read: SampleSource): number {
    const c = this.cfg;
    const endIdx = Math.floor(t * c.rate + 1e-9);
    const cursor = this.xOf(endIdx) % c.width;
    if (this.lastIndex < 0 || endIdx - this.lastIndex > (c.width / this.pxPerS) * c.rate) {
      // First frame, or a jump longer than one lane (hidden tab): start clean one sample back.
      this.reset(ctx);
      this.lastIndex = endIdx - 1;
    }
    if (endIdx <= this.lastIndex) return cursor;
    const need = endIdx - this.lastIndex;
    if (this.scratch.length < need) this.scratch = new Float32Array(need * 2);
    const out = this.scratch.subarray(0, need);
    const got = read(this.lastIndex + 1, out);
    if (got <= 0) return cursor;
    const first = this.lastIndex + 1;
    const last = first + got - 1;
    const xFrom = this.tail.length > 0 ? (this.tail[this.tail.length - 1] as Pt).x : this.xOf(first);
    this.clearSpan(ctx, xFrom, this.xOf(last) + c.eraseGapPx);

    this.cols.length = 0;
    decimateMinMax(out, got, first, c.rate, this.pxPerS, this.dpr, this.cols);
    const pts: Pt[] = [...this.tail];
    for (const col of this.cols) {
      const x = (col.col + 0.5) / this.dpr;
      pts.push({ x, y: this.yOf(col.first) });
      if (col.max !== col.min) {
        const minFirst = col.minIndex < col.maxIndex;
        pts.push({ x, y: this.yOf(minFirst ? col.min : col.max) });
        pts.push({ x, y: this.yOf(minFirst ? col.max : col.min) });
      }
      pts.push({ x, y: this.yOf(col.last) });
    }
    this.strokeWrapped(ctx, pts);
    this.tail = pts.slice(-2);
    this.lastIndex = last;
    return cursor;
  }

  /** Stroke a polyline given in unwrapped x, splitting it where it crosses the right edge. */
  private strokeWrapped(ctx: Ctx2D, pts: Pt[]): void {
    const c = this.cfg;
    if (pts.length < 2) return;
    ctx.strokeStyle = c.color;
    ctx.lineWidth = c.lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    let lap = Math.floor((pts[0] as Pt).x / c.width);
    ctx.beginPath();
    ctx.moveTo(c.x + (pts[0] as Pt).x - lap * c.width, (pts[0] as Pt).y);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i] as Pt;
      const l = Math.floor(p.x / c.width);
      if (l !== lap) {
        ctx.stroke();
        ctx.beginPath();
        lap = l;
        ctx.moveTo(c.x + p.x - lap * c.width, p.y);
      } else {
        ctx.lineTo(c.x + p.x - lap * c.width, p.y);
      }
    }
    ctx.stroke();
  }
}
