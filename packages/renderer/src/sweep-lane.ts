// One sweep lane (brief §3.5 "Per frame, for each lane"): x comes from sim time, never from frame counts.
// Each frame: (1) take the sample range since the last frame, (2) clear the erase gap ahead of the cursor,
// (3) draw the new samples min/max-decimated per device-pixel column, (4) re-stroke the previous frame's
// tail so joins are seamless. Static chrome (labels, cal bar) is drawn elsewhere, once.
// Erase/redraw ordering: each frame clears a band that starts at the LEFT edge of the last drawn
// device column (a frame often ends mid-column, and the new samples continue it) minus the columns that half a line
// width reaches into, re-strokes every earlier point whose stroke reaches into that band, and clips all strokes to
// the band. So every pixel in the band is drawn
// exactly once and nothing outside it is touched again. Re-stroking only the last two points would lose
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
  /** ECG-paper grid painted wherever the lane is cleared, so the erase bar keeps it (request RR-4). */
  grid?: { minorMm: number; majorMm: number; minor: string; major: string } | null;
  /** A 1-px line at the leading edge of the erase gap (request RR-3; every shipped skin says false). */
  cursorLine?: boolean;
  /** Fill the area between the trace and the lane's zero line in the trace colour (skin `co2.fill`; research/34 row 2). */
  fill?: boolean;
  /**
   * Display-side moving average over this many samples (0 or 1 = off): each drawn sample is the mean of itself and
   * the `smoothN − 1` before it. Only what is drawn changes, never the engine signal (owner correction M2).
   */
  smoothN?: number;
  /**
   * With `smoothN`: the window's range (max − min, signal units) below which the average is drawn in full, and above
   * which the sample is drawn as it is, blended linearly in between. So only small fluctuations (the cardiogenic ripple)
   * are smoothed, and an upstroke or a curare cleft keeps its shape. Absent: always the average.
   */
  smoothGate?: readonly [number, number];
  /** Dotted horizontal scale lines at these values (signal units), repainted wherever the lane is cleared (skin
   *  `ibp.scaleLines`; research/34 row 11). */
  hLines?: { values: readonly number[]; color: string } | null;
  /** FX-24: the first sample index the source holds (default 0). A restored engine holds nothing before its snapshot,
   *  and a read from earlier returns its first sample as if it were the one asked for, so the backfill starts here. */
  firstIndex?: number;
}

/** Reads samples starting at absolute index `from` into `out`; returns the count (out[0] = sample `from`). */
export type SampleSource = (from: number, out: Float32Array) => number;

type Pt = { x: number; y: number }; // x unwrapped CSS px relative to lane start, y CSS px
type Rect = [number, number, number, number]; // canvas CSS px

/** The backfill never reaches past the engine's 120 s buffer (`BUFFER_SECONDS`), where a read would start at the
 * oldest sample instead of the one asked for [ENG margin]. */
const BACKFILL_MAX_S = 100;
/** Dotted scale lines: a 1.4 px dot every 14 px, as the approved mock-up draws them (NOTES.md; IMG_8113). */
const DOT_PITCH_PX = 14;
const DOT_PX = 1.4;

export class SweepLane {
  cfg: LaneConfig;
  private dpr: number;
  private lastIndex = -1;
  /** Unwrapped device-pixel column of the last drawn sample (-1: nothing drawn since reset). */
  private lastCol = -1;
  private tail: Pt[] = [];
  private scratch = new Float32Array(4096);
  private smoothed = new Float32Array(4096);
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
    this.resets++;
    this.lastIndex = -1;
    this.lastCol = -1;
    this.tail = [];
    ctx.fillStyle = this.cfg.background;
    ctx.fillRect(this.cfg.x, this.cfg.y, this.cfg.width, this.cfg.height);
    this.paintGrid(ctx, [this.cfg.x, this.cfg.y, this.cfg.width, this.cfg.height]);
    this.paintHLines(ctx, [this.cfg.x, this.cfg.y, this.cfg.width, this.cfg.height]);
  }

  private resets = 0;
  /** Counts the times the lane was cleared whole, so text drawn over it knows to come back. */
  get generation(): number {
    return this.resets;
  }

  /** Absolute index of the last sample drawn (-1 after a reset). */
  get lastDrawnIndex(): number {
    return this.lastIndex;
  }

  /** Paint the grid inside one cleared rect (RR-4): minor then major lines, anchored to the lane's top-left. */
  private paintGrid(ctx: Ctx2D, r: Rect): void {
    const g = this.cfg.grid;
    if (!g || r[2] <= 0) return;
    const c = this.cfg;
    const step = g.minorMm * c.pxPerMm;
    const every = Math.max(1, Math.round(g.majorMm / g.minorMm));
    ctx.save();
    ctx.beginPath();
    ctx.rect(...r);
    ctx.clip();
    ctx.lineWidth = 1 / this.dpr;
    for (const major of [false, true]) {
      ctx.strokeStyle = major ? g.major : g.minor;
      ctx.beginPath();
      for (let k = Math.ceil((r[0] - c.x) / step); k * step <= r[0] + r[2] - c.x; k++) {
        if ((k % every === 0) !== major) continue;
        ctx.moveTo(c.x + k * step, r[1]);
        ctx.lineTo(c.x + k * step, r[1] + r[3]);
      }
      for (let k = 0; k * step <= c.height; k++) {
        if ((k % every === 0) !== major) continue;
        ctx.moveTo(r[0], c.y + k * step);
        ctx.lineTo(r[0] + r[2], c.y + k * step);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Paint the dotted scale lines inside one cleared rect. The dots are anchored to the lane's left edge (they do not
   * crawl) and snapped to device pixels; a line on the lane's bottom edge is drawn one dot inside it (review L-1).
   */
  private paintHLines(ctx: Ctx2D, r: Rect): void {
    const h = this.cfg.hLines;
    if (!h || r[2] <= 0) return;
    const c = this.cfg;
    const s = Math.max(1, Math.round(DOT_PX * this.dpr)) / this.dpr;
    ctx.save();
    ctx.beginPath();
    ctx.rect(...r);
    ctx.clip();
    ctx.fillStyle = h.color;
    for (const v of h.values) {
      const y = Math.min(c.y + c.height - s, Math.max(c.y, Math.round(this.yOf(v) * this.dpr) / this.dpr));
      for (let k = Math.max(0, Math.ceil((r[0] - c.x - s) / DOT_PITCH_PX)); c.x + k * DOT_PITCH_PX < Math.min(r[0] + r[2], c.x + c.width); k++) {
        ctx.fillRect(c.x + k * DOT_PITCH_PX, y, s, s);
      }
    }
    ctx.restore();
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
      ctx.fillStyle = c.background;
      ctx.fillRect(...r);
      this.paintGrid(ctx, r);
      this.paintHLines(ctx, r);
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
      // First frame, or a jump longer than one lane (hidden tab): start clean. Redraw the last lane-width of samples
      // (less the erase gap) in this frame, so a resize or a view change does not blank the sweep until the cursor has
      // gone round once; the engine's buffer holds them (a read returns what it has).
      this.reset(ctx);
      const back = Math.min(Math.floor(((c.width - c.eraseGapPx) / this.pxPerS) * c.rate), BACKFILL_MAX_S * c.rate);
      this.lastIndex = Math.max((c.firstIndex ?? 0) - 1, endIdx - 1 - back);
    }
    if (endIdx <= this.lastIndex) return cursor;
    const sn = Math.max(1, Math.floor(c.smoothN ?? 1));
    const pre = Math.min(sn - 1, this.lastIndex + 1 - (c.firstIndex ?? 0)); // samples before the new ones that the average needs
    const need = endIdx - this.lastIndex + pre;
    if (this.scratch.length < need) this.scratch = new Float32Array(need * 2);
    let out: Float32Array = this.scratch.subarray(0, need);
    const got = read(this.lastIndex + 1 - pre, out) - pre;
    if (got <= 0) return cursor;
    if (sn > 1) out = this.smooth(out, pre, got, sn, c.smoothGate);
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
    if (c.fill) this.fillWrapped(ctx, pts, band);
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
    if (c.cursorLine) {
      // inside the band the next frame clears, so it moves with the sweep and never leaves a trail
      ctx.fillStyle = c.color;
      ctx.fillRect(c.x + ((this.xOf(last) + c.eraseGapPx - 1) % c.width), c.y, 1 / this.dpr, c.height);
    }
    return cursor;
  }

  /**
   * The `got` samples after `pre` leading ones, each replaced by the mean of itself and up to `n − 1` before it; with a
   * gate, by a blend of the mean and the sample by the window's range (LaneConfig.smoothGate).
   */
  private smooth(src: Float32Array, pre: number, got: number, n: number, gate?: readonly [number, number]): Float32Array {
    if (this.smoothed.length < got) this.smoothed = new Float32Array(got * 2);
    const dst = this.smoothed;
    let sum = 0;
    for (let k = 0; k < pre; k++) sum += src[k] as number;
    for (let k = 0; k < got; k++) {
      const i = pre + k;
      const v = src[i] as number;
      sum += v;
      if (i >= n) sum -= src[i - n] as number;
      const mean = sum / Math.min(n, i + 1);
      let a = 1;
      if (gate) {
        let lo = v;
        let hi = v;
        for (let j = Math.max(0, i - n + 1); j < i; j++) {
          const u = src[j] as number;
          if (u < lo) lo = u;
          if (u > hi) hi = u;
        }
        a = Math.min(1, Math.max(0, (gate[1] - (hi - lo)) / (gate[1] - gate[0])));
      }
      dst[k] = v + a * (mean - v);
    }
    return dst;
  }

  /**
   * Fill under a polyline (unwrapped x) down to the lane's zero line, one polygon per lap, clipped to `band`. Drawn before
   * the stroke so the line stays on top; the tail points are filled again with the band, so the joins have no gaps.
   */
  private fillWrapped(ctx: Ctx2D, pts: Pt[], band: readonly Rect[]): void {
    const c = this.cfg;
    if (pts.length < 2) return;
    const base = Math.min(c.y + c.height, Math.max(c.y, c.y + c.baseline * c.height));
    ctx.save();
    ctx.beginPath();
    for (const r of band) ctx.rect(...r);
    ctx.clip();
    ctx.fillStyle = c.color;
    let i = 0;
    while (i < pts.length) {
      const lap = Math.floor((pts[i] as Pt).x / c.width);
      const off = c.x - lap * c.width;
      ctx.beginPath();
      ctx.moveTo(off + (pts[i] as Pt).x, base);
      let x = 0;
      for (; i < pts.length && Math.floor((pts[i] as Pt).x / c.width) === lap; i++) {
        const p = pts[i] as Pt;
        x = off + p.x;
        ctx.lineTo(x, p.y);
      }
      ctx.lineTo(x, base);
      ctx.fill();
    }
    ctx.restore();
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
