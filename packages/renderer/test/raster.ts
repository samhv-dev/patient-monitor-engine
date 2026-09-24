// A tiny rasteriser for FakeCtx call lists (tests only): fills clear pixels whose centres lie inside the rect, and
// strokes light every pixel whose centre is within half the line width of a segment (round caps and joins),
// inside the active clip. Close enough to a real canvas to see whether a trace column has been erased.
import type { Call } from './fake-ctx.ts';

export class Raster {
  readonly w: number;
  readonly h: number;
  readonly px: Uint8Array;
  private readonly dpr: number;

  constructor(cssW: number, cssH: number, dpr: number) {
    this.dpr = dpr;
    this.w = Math.ceil(cssW * dpr);
    this.h = Math.ceil(cssH * dpr);
    this.px = new Uint8Array(this.w * this.h);
  }

  apply(calls: readonly Call[], background: string, lineWidth: number): void {
    let path: Array<[number, number][]> = [];
    for (const c of calls) {
      if (c.op === 'fillRect' && c.style === background) this.fill(c.args as [number, number, number, number], 0);
      else if (c.op === 'beginPath') path = [];
      else if (c.op === 'moveTo') path.push([[c.args[0]!, c.args[1]!]]);
      else if (c.op === 'lineTo') path[path.length - 1]!.push([c.args[0]!, c.args[1]!]);
      else if (c.op === 'stroke') for (const sub of path) this.stroke(sub, lineWidth, c.clip ?? null);
    }
  }

  /** Lit rows of device column `col`. */
  column(col: number): number[] {
    const rows: number[] = [];
    for (let y = 0; y < this.h; y++) if (this.px[y * this.w + col]) rows.push(y);
    return rows;
  }

  private fill([x, y, w, h]: [number, number, number, number], v: number): void {
    const d = this.dpr;
    for (let X = Math.max(0, Math.ceil(x * d - 0.5)); X < Math.min(this.w, Math.ceil((x + w) * d - 0.5)); X++) {
      for (let Y = Math.max(0, Math.ceil(y * d - 0.5)); Y < Math.min(this.h, Math.ceil((y + h) * d - 0.5)); Y++) this.px[Y * this.w + X] = v;
    }
  }

  private stroke(pts: [number, number][], lineWidth: number, clip: number[][] | null): void {
    const d = this.dpr;
    const r = (lineWidth * d) / 2;
    const rects = (clip ?? [[0, 0, this.w / d, this.h / d]]).map((q) => q.map((v) => v * d));
    const inClip = (px: number, py: number) => rects.some(([x, y, w, h]) => px >= x! && px < x! + w! && py >= y! && py < y! + h!);
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = [pts[i]![0] * d, pts[i]![1] * d];
      const [bx, by] = i + 1 < pts.length ? [pts[i + 1]![0] * d, pts[i + 1]![1] * d] : [ax, ay];
      const x0 = Math.max(Math.floor(Math.min(ax, bx) - r), 0);
      const x1 = Math.min(Math.ceil(Math.max(ax, bx) + r), this.w);
      const y0 = Math.max(Math.floor(Math.min(ay, by) - r), 0);
      const y1 = Math.min(Math.ceil(Math.max(ay, by) + r), this.h);
      const L2 = (bx - ax) ** 2 + (by - ay) ** 2;
      for (let X = x0; X < x1; X++) {
        for (let Y = y0; Y < y1; Y++) {
          const px = X + 0.5;
          const py = Y + 0.5;
          if (!inClip(px, py)) continue;
          const t = L2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / L2));
          if ((px - ax - t * (bx - ax)) ** 2 + (py - ay - t * (by - ay)) ** 2 <= r * r) this.px[Y * this.w + X] = 1;
        }
      }
    }
  }
}
