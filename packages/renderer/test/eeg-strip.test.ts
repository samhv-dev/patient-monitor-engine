// EEG E5 (plan §7 E5): the developer page's raw trace and spectrogram strip — generic look, red high and blue low
// (Ch36 pp. 1138–1139). The display memory keeps the device's raw window and about the last hour of 2-s columns (C24);
// the colour map and the strip's pixels are pure, so Node tests them without a canvas.
import { describe, expect, it } from 'vitest';
import { createEegDisplay, dsaColour, paintDsa, pushEegDisplay } from '../src/eeg-strip.ts';

const reading = (t: number, raw: number[], col: number[] | null) => ({ type: 'eegReading' as const, t, model: 'generic', label: 'Processed EEG (generic)', flags: { questionable: false, invalid: false }, bands: { slow: 0, delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 }, display: { raw, dsa: col === null ? null : { dfHz: 0.5, db: col } } });

describe('EEG display memory (C24)', () => {
  it('keeps the raw window of the device (8 s at 125 Hz) and 1800 spectrogram columns (1 h of 2-s epochs)', () => {
    const d = createEegDisplay('generic', 125);
    for (let s = 2; s <= 3700; s++) pushEegDisplay(d, reading(s, new Array<number>(125).fill(s), s % 2 === 0 ? new Array<number>(101).fill(s) : null));
    expect(d.raw.length).toBe(8 * 125);
    expect(d.raw[0]).toBe(3693);
    expect(d.raw.at(-1)).toBe(3700);
    expect(d.cols.length).toBe(1800);
    expect(d.cols[0]?.t).toBe(3700 - 2 * 1799);
    expect(d.cols.at(-1)?.t).toBe(3700);
  });
});

describe('the spectrogram colours: blue low, red high', () => {
  it('the ends and the middle of the range', () => {
    const [r0, , b0] = dsaColour(0);
    const [r1, , b1] = dsaColour(1);
    expect(b0).toBeGreaterThan(200);
    expect(r0).toBeLessThan(40);
    expect(r1).toBeGreaterThan(200);
    expect(b1).toBeLessThan(40);
    expect(dsaColour(-5)).toEqual(dsaColour(0));
    expect(dsaColour(7)).toEqual(dsaColour(1));
  });
  it('paints one pixel column per spectrogram column, low frequencies at the bottom', () => {
    const img = { width: 4, height: 2, data: new Uint8ClampedArray(4 * 2 * 4) };
    // two columns: power high in 0–25 Hz and low in 25–50 Hz, then the reverse
    const half = (lo: number, hi: number) => [...new Array<number>(51).fill(lo), ...new Array<number>(50).fill(hi)];
    paintDsa(img, [{ t: 2, db: half(30, -10) }, { t: 4, db: half(-10, 30) }], { minDb: -10, maxDb: 30 });
    const px = (x: number, y: number) => Array.from(img.data.slice((y * 4 + x) * 4, (y * 4 + x) * 4 + 4));
    // the newest column at the right edge
    expect(px(3, 1)[2]).toBeGreaterThan(200); // bottom (0 Hz) of the newest column: low → blue
    expect(px(3, 0)[0]).toBeGreaterThan(200); // top (50 Hz): high → red
    expect(px(2, 1)[0]).toBeGreaterThan(200);
    expect(px(0, 0)[3]).toBe(0); // no data yet on the left: transparent
  });
});
