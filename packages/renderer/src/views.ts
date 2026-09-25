// Stage 4b views drawn on a plain canvas: the 12-lead report (brief §6.6: 3×4 + lead II rhythm strip, 25 mm/s,
// 10 mm/mV, calibration pulses, on ECG paper) and the graphic trend (brief §6.7; `trend.style` line or
// filled-area, brief §3.8). Both take a Ctx2D, so they are tested with the recording fake.
import type { Capture12, LeadId, NumericId, TrendStore } from '@pme/engine-core';
import type { Ctx2D } from './ctx.ts';
import { LEAD_LABEL } from './skin-plan.ts';

export const PAPER = { background: '#FFF8F4', minor: '#FAE2E2', major: '#F4C4C4', trace: '#000000' } as const; // ecg-grid theme colours

export interface Report12Geometry {
  widthPx: number;
  heightPx: number;
}

/** Pixel size of the report at pxPerMm: 250 mm of trace + 10 mm margins; 4 rows of 30 mm + 10 mm top. */
export function report12Size(pxPerMm: number): Report12Geometry {
  return { widthPx: Math.round(270 * pxPerMm), heightPx: Math.round(135 * pxPerMm) };
}

function grid(ctx: Ctx2D, w: number, h: number, pxPerMm: number): void {
  ctx.fillStyle = PAPER.background;
  ctx.fillRect(0, 0, w, h);
  for (const major of [false, true]) {
    ctx.strokeStyle = major ? PAPER.major : PAPER.minor;
    ctx.lineWidth = major ? 1 : 0.5;
    ctx.beginPath();
    for (let k = 0; k * pxPerMm <= w; k++) {
      if ((k % 5 === 0) !== major) continue;
      ctx.moveTo(k * pxPerMm, 0);
      ctx.lineTo(k * pxPerMm, h);
    }
    for (let k = 0; k * pxPerMm <= h; k++) {
      if ((k % 5 === 0) !== major) continue;
      ctx.moveTo(0, k * pxPerMm);
      ctx.lineTo(w, k * pxPerMm);
    }
    ctx.stroke();
  }
}

/** Draw the 12-lead report. Returns the number of trace segments drawn (12 + the rhythm strip = 13). */
export function draw12Lead(ctx: Ctx2D, c: Capture12, pxPerMm: number): number {
  const { widthPx, heightPx } = report12Size(pxPerMm);
  grid(ctx, widthPx, heightPx, pxPerMm);
  const mmPerSample = c.paper.mmPerS / c.rate;
  const x0 = 15 * pxPerMm; // after the calibration pulse
  const rowH = 30 * pxPerMm;
  const colN = Math.round(c.layout.columnS * c.rate);
  ctx.font = `${Math.round(3.5 * pxPerMm)}px system-ui, sans-serif`;
  ctx.textBaseline = 'top';
  let segments = 0;
  const trace = (lead: LeadId, from: number, n: number, x: number, base: number) => {
    const d = c.leads[lead];
    ctx.strokeStyle = PAPER.trace;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const px = x + i * mmPerSample * pxPerMm;
      const py = base - (d[from + i] as number) * c.paper.mmPerMv * pxPerMm;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    segments++;
  };
  const cal = (base: number) => {
    const h = c.cal.mV * c.paper.mmPerMv * pxPerMm;
    const w = (c.cal.ms / 1000) * c.paper.mmPerS * pxPerMm;
    const x = 5 * pxPerMm;
    ctx.strokeStyle = PAPER.trace;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - 2 * pxPerMm, base);
    ctx.lineTo(x, base);
    ctx.lineTo(x, base - h);
    ctx.lineTo(x + w, base - h);
    ctx.lineTo(x + w, base);
    ctx.lineTo(x + w + 2 * pxPerMm, base);
    ctx.stroke();
  };
  c.layout.rows.forEach((row, r) => {
    const base = 10 * pxPerMm + r * rowH + 0.6 * rowH;
    cal(base);
    row.forEach((lead, col) => {
      const x = x0 + col * c.layout.columnS * c.paper.mmPerS * pxPerMm;
      trace(lead, col * colN, colN, x, base);
      ctx.fillStyle = PAPER.trace;
      ctx.fillText(LEAD_LABEL[lead], x + pxPerMm, 10 * pxPerMm + r * rowH + 2 * pxPerMm);
    });
  });
  const base = 10 * pxPerMm + 3 * rowH + 0.6 * rowH;
  cal(base);
  trace(c.layout.rhythmLead, 0, c.leads[c.layout.rhythmLead].length, x0, base);
  ctx.fillStyle = PAPER.trace;
  ctx.fillText(`${LEAD_LABEL[c.layout.rhythmLead]}  25 mm/s  10 mm/mV  ${c.filter[0]}–${c.filter[1]} Hz  HR ${c.measurements.hr ?? '--'}  axis ${c.measurements.axisDeg ?? '--'}°`, x0, 2 * pxPerMm);
  return segments;
}

export interface TrendSeries {
  id: NumericId;
  color: string;
  range: [number, number];
}

/** Graphic trend of [fromS, toS] in a w×h box: one band per series, `line` or `filled-area` (saadat-like). */
export function drawTrend(ctx: Ctx2D, store: TrendStore, series: readonly TrendSeries[], fromS: number, toS: number, w: number, h: number, style: 'line' | 'filled-area', background = '#000'): void {
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);
  const bandH = h / Math.max(1, series.length);
  const span = Math.max(1, toS - fromS);
  const step = Math.max(1, Math.floor(span / w)); // one point per pixel column at most
  ctx.font = '12px system-ui, sans-serif';
  ctx.textBaseline = 'top';
  series.forEach((s, k) => {
    const y0 = k * bandH;
    const vals = store.series(s.id, fromS, toS);
    const yOf = (v: number) => y0 + bandH - ((v - s.range[0]) / (s.range[1] - s.range[0])) * (bandH - 16);
    ctx.fillStyle = s.color;
    ctx.fillText(`${s.id} ${s.range[0]}–${s.range[1]}`, 4, y0 + 2);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let open = false;
    for (let i = 0; i < vals.length; i += step) {
      const v = vals[i] as number;
      const x = (i / span) * w;
      if (Number.isNaN(v)) {
        open = false;
        continue;
      }
      const y = Math.min(y0 + bandH, Math.max(y0 + 14, yOf(v)));
      if (style === 'filled-area') {
        ctx.moveTo(x, y0 + bandH);
        ctx.lineTo(x, y);
      } else if (open) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
      open = true;
    }
    ctx.stroke();
  });
}
