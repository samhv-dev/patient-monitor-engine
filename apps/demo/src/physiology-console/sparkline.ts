// Stage 7x: 60 s sparklines — a bounded history per numeric path (one sample per truth event, 1 Hz) and a tiny canvas
// plot, newest sample at the right edge, auto-scaled to the window's min–max and the baseline (drawn as a faint line).
export const SPARK_N = 60;

export function pushHist(h: number[], v: number, n = SPARK_N): void {
  h.push(v);
  if (h.length > n) h.splice(0, h.length - n);
}

/** [lo, hi] over the finite samples and the baseline; null when there is nothing finite. */
export function sparkRange(values: readonly number[], base?: number): [number, number] | null {
  const fin = values.filter(Number.isFinite);
  if (base !== undefined && Number.isFinite(base)) fin.push(base);
  return fin.length ? [Math.min(...fin), Math.max(...fin)] : null;
}

/** y of `v` in an h-tall box (1 px inset); a flat range sits mid-height. */
export function sparkY(v: number, h: number, [lo, hi]: [number, number]): number {
  return hi === lo ? h / 2 : h - 1 - ((v - lo) / (hi - lo)) * (h - 2);
}

/** Canvas points for `values` in a w×h box, the newest at the right edge; non-finite samples are skipped. */
export function sparkPoints(values: readonly number[], w: number, h: number, range = sparkRange(values), n = SPARK_N): Array<[number, number]> {
  if (!range) return [];
  const dx = (w - 2) / (n - 1);
  const x0 = w - 1 - (values.length - 1) * dx;
  const pts: Array<[number, number]> = [];
  values.forEach((v, i) => {
    if (Number.isFinite(v)) pts.push([x0 + i * dx, sparkY(v, h, range)]);
  });
  return pts;
}

export function drawSpark(g: CanvasRenderingContext2D | null, values: readonly number[], w: number, h: number, color: string, base?: number): void {
  if (!g) return; // no 2D context (happy-dom, or a lost context): the numbers still render
  g.clearRect(0, 0, w, h);
  const range = sparkRange(values, base);
  if (!range) return;
  if (base !== undefined && Number.isFinite(base)) {
    g.fillStyle = 'rgba(255,255,255,0.16)';
    g.fillRect(0, Math.round(sparkY(base, h, range)), w, 1);
  }
  const pts = sparkPoints(values, w, h, range);
  if (pts.length < 2) return;
  g.strokeStyle = color;
  g.lineWidth = 1;
  g.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
  g.stroke();
}
