// One sweep lane (brief §3.5 "Per frame, for each lane"): x comes from sim time, never from frame counts.
// Each frame: (1) take the sample range since the last frame, (2) clear the erase gap ahead of the cursor,
// (3) draw the new samples min/max-decimated per device-pixel column, (4) re-stroke the previous frame's
// tail so joins are seamless. Static chrome (labels, cal bar) is drawn elsewhere, once.
// Erase/redraw ordering (review H2): each frame clears a band that starts at the LEFT edge of the last drawn
// device column (a frame often ends mid-column, and the new samples continue it) minus the columns that half a line
// width reaches into, re-strokes every earlier point whose stroke reaches into that band, and clips all strokes to
// the band. So every pixel in the band is drawn
// exactly once and nothing outside it is touched again. Stage 1 re-stroked only the last two points, which lost
// that column's first→min→max run and cut gaps of up to ~19 px into QRS strokes at DPR 1.
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
type Rect = [number, number, number, number]; // canvas CSS px

export class SweepLane {
  cfg: LaneConfig;
  private dpr: number;
  private lastIndex = -1;
  /** Unwrapped device-pixel column of the last drawn sample (-1: nothing drawn since reset). */
  private lastCol = -1;
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
    this.lastCol = -1;
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

  /** Snap a CSS x to the device-pixel grid (the epsilon keeps an exact column edge such as 7/1.5 on its column). */
  private snap(x: number): number {
    return Math.floor(x * this.dpr + 1e-6) / this.dpr;
  }

  /**
   * Where the next frame's band starts (unwrapped CSS px) when the last drawn column is `col`: that column's left
   * edge, minus the columns a stroke centred in it reaches into (antialiased half line width − half a column).
   */
  private bandStart(col: number): number {
    const reach = Math.ceil((this.cfg.lineWidth * this.dpr) / 2 - 0.5);
    return (col - reach) / this.dpr;
  }

  /** Fill [x0, x1) (unwrapped, CSS px) with the background, wrapping at the lane width. Returns the rects filled. */
  private clearSpan(ctx: Ctx2D, x0: number, x1: number): Rect[] {
    const c = this.cfg;
    const rects: Rect[] = [];
    ctx.fillStyle = c.background;
    let a = x0;
    while (a < x1) {
      const lap = Math.floor(a / c.width);
      const end = Math.min(x1, (lap + 1) * c.width);
      const la = this.snap(a - lap * c.width);
      const lb = end - lap * c.width >= c.width ? c.width : this.snap(end - lap * c.width) + 1 / this.dpr;
      const r: Rect = [c.x + la, c.y, Math.max(0, lb - la), c.height];
      ctx.fillRect(...r);
      rects.push(r);
      a = end;
    }
    return rects;
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
    const xFrom = this.lastCol >= 0 ? this.bandStart(this.lastCol) : this.xOf(first);
    const band = this.clearSpan(ctx, xFrom, this.xOf(last) + c.eraseGapPx);

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
    this.strokeWrapped(ctx, pts, band);
    // Keep for re-stroking every point whose stroke (half the line width) reaches into the next band, plus one
    // point before them for the joining segment (the band clip hides everything outside it).
    const edge = this.bandStart((this.cols[this.cols.length - 1] as Column).col) - c.lineWidth / 2;
    let k = pts.length - 1;
    while (k > 0 && (pts[k - 1] as Pt).x >= edge) k--;
    if (k > 0) k--;
    this.tail = pts.slice(k);
    this.lastIndex = last;
    this.lastCol = (this.cols[this.cols.length - 1] as Column).col;
    return cursor;
  }

  /** Stroke a polyline given in unwrapped x, splitting it where it crosses the right edge, clipped to `band`. */
  private strokeWrapped(ctx: Ctx2D, pts: Pt[], band: readonly Rect[]): void {
    const c = this.cfg;
    if (pts.length < 2) return;
    // Clip to the band just cleared (always inside the lane): half the line width and the round caps would
    // otherwise spill past the lane edges and build up a ghost column at the wrap [ENG, Gate 1 check], and
    // re-stroked points would thicken the antialiased trace left of the band.
    ctx.save();
    ctx.beginPath();
    for (const r of band) ctx.rect(...r);
    ctx.clip();
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
    ctx.restore();
  }
}
