// EEG E5 (plan §7 E5): the raw trace and the spectrogram strip (density spectral array) of an EEG device, generic look
// — red high, blue low (Ch36 pp. 1138–1139) — built from the engine's `eegReading` events. The display memory keeps the
// device's raw window and about the last hour of 2-s columns (its spec row: rawWindowS, dsaHistoryS, epochS), like a
// monitor's screen memory: it is not engine state. The colour map and the pixels are pure (Node tests them).
import { EEG_DEVICES, type EegModelId, type EegReadingEvent } from '@pme/engine-core';

export interface EegDisplay {
  model: string;
  rawN: number;
  colsN: number;
  raw: number[];
  cols: Array<{ t: number; db: number[] }>;
}

export function createEegDisplay(model: string, fsHz: number): EegDisplay {
  const k = EEG_DEVICES[model as EegModelId].spec.constants;
  return { model, rawN: Math.round(k.rawWindowS.value * fsHz), colsN: Math.round(k.dsaHistoryS.value / k.epochS.value), raw: [], cols: [] };
}

/** Add one reading's raw samples and its spectrogram column (when it closes one). */
export function pushEegDisplay(d: EegDisplay, e: EegReadingEvent): void {
  d.raw.push(...e.display.raw);
  if (d.raw.length > d.rawN) d.raw.splice(0, d.raw.length - d.rawN);
  if (e.display.dsa) {
    d.cols.push({ t: e.t, db: e.display.dsa.db });
    if (d.cols.length > d.colsN) d.cols.splice(0, d.cols.length - d.colsN);
  }
}

/** Blue (low) → cyan → green → yellow → red (high), x in 0–1 (clamped), RGB 0–255. */
export function dsaColour(x: number): [number, number, number] {
  const v = 0.125 + 0.75 * Math.max(0, Math.min(1, x)); // the jet map's bright part: pure blue … pure red
  const ch = (c: number) => Math.round(255 * Math.max(0, Math.min(1, 1.5 - Math.abs(4 * v - c))));
  return [ch(3), ch(2), ch(1)];
}

/**
 * Paint the columns into an RGBA image, the newest at the right edge, one pixel column each; 0 Hz at the bottom and the
 * column's top bin at the top; pixels without a column are transparent.
 */
export function paintDsa(img: { width: number; height: number; data: Uint8ClampedArray }, cols: ReadonlyArray<{ t?: number; db: readonly number[] }>, range: { minDb: number; maxDb: number }): void {
  img.data.fill(0);
  const shown = cols.slice(-img.width);
  const x0 = img.width - shown.length;
  shown.forEach((c, i) => {
    for (let y = 0; y < img.height; y++) {
      const bin = Math.min(c.db.length - 1, Math.floor(((img.height - 1 - y + 0.5) / img.height) * c.db.length));
      const [r, g, b] = dsaColour(((c.db[bin] as number) - range.minDb) / (range.maxDb - range.minDb));
      const o = (y * img.width + x0 + i) * 4;
      img.data[o] = r;
      img.data[o + 1] = g;
      img.data[o + 2] = b;
      img.data[o + 3] = 255;
    }
  });
}

/** The raw trace: the window's samples across the width, ±rangeUv over the height. */
export function drawEegRaw(ctx: CanvasRenderingContext2D, raw: readonly number[], w: number, h: number, n: number, rangeUv: number): void {
  ctx.clearRect(0, 0, w, h);
  ctx.beginPath();
  raw.forEach((v, i) => {
    const x = ((n - raw.length + i) / n) * w;
    const y = h / 2 - (v / rangeUv) * (h / 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}
