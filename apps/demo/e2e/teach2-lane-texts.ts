// e2e support (not a test file): the monitor's canvas texts (wave labels, scale values, sweep speeds), recorded where
// they are drawn, so a test can say whether two of them touch. The renderer draws them inside a worker on an
// OffscreenCanvas, out of the page's reach; with `transferControlToOffscreen` removed it runs the same MonitorCore on
// the page's main thread (worker-host.ts `canUseWorker`), and `fillText` is wrapped to record each text's ink box
// (measureText, the canvas's own font, alignment and baseline).
import type { Page } from '@playwright/test';

type Ink = { text: string; canvas: number; size: string; x: number; y: number; l: number; r: number; top: number; bot: number; at: number };

/** Before the page loads: the renderer on the main thread, and every `fillText` on a canvas of the stage recorded. */
export async function recordLaneTexts(page: Page): Promise<void> {
  await page.addInitScript(() => {
    delete (HTMLCanvasElement.prototype as Partial<HTMLCanvasElement>).transferControlToOffscreen;
    const w = window as unknown as { __laneTexts: Ink[]; __laneCanvases: HTMLCanvasElement[] };
    w.__laneTexts = [];
    w.__laneCanvases = [];
    const fill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (this: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth?: number) {
      if (this.canvas.closest?.('.stage') && text.trim()) {
        let canvas = w.__laneCanvases.indexOf(this.canvas);
        if (canvas < 0) canvas = w.__laneCanvases.push(this.canvas) - 1;
        const m = this.measureText(text);
        w.__laneTexts.push({ text, canvas, size: `${this.canvas.width}x${this.canvas.height}`, x, y, l: x - m.actualBoundingBoxLeft, r: x + m.actualBoundingBoxRight, top: y - m.actualBoundingBoxAscent, bot: y + m.actualBoundingBoxDescent, at: performance.now() });
        if (w.__laneTexts.length > 50000) w.__laneTexts.splice(1000, 10000); // keep the first (the chrome), drop the oldest repaints
      }
      return maxWidth === undefined ? fill.call(this, text, x, y) : fill.call(this, text, x, y, maxWidth);
    };
  });
}

/** The texts on screen now — drawn at each canvas's present size, the latest at each anchor (the static chrome is drawn
 *  once per size, the rest repainted as the sweep passes) — and every pair whose ink boxes overlap. */
export function laneTextOverlaps(page: Page): Promise<{ texts: string[]; touching: string[] }> {
  return page.evaluate(() => {
    const w = window as unknown as { __laneTexts: Ink[]; __laneCanvases: HTMLCanvasElement[] };
    const sizes = w.__laneCanvases.map((c) => `${c.width}x${c.height}`);
    const latest = new Map<string, Ink>();
    for (const t of w.__laneTexts) if (t.size === sizes[t.canvas]) latest.set(`${t.canvas}|${Math.round(t.x)}|${Math.round(t.y)}`, t);
    const inks = [...latest.values()];
    const touching: string[] = [];
    inks.forEach((a, i) => inks.slice(i + 1).forEach((b) => {
      if (a.canvas !== b.canvas) return;
      const dx = Math.min(a.r, b.r) - Math.max(a.l, b.l);
      const dy = Math.min(a.bot, b.bot) - Math.max(a.top, b.top);
      if (dx > 0.5 && dy > 0.5) touching.push(`"${a.text}" × "${b.text}"`);
    }));
    return { texts: inks.map((t) => t.text), touching };
  });
}
