// A recording stand-in for CanvasRenderingContext2D (tests run in Node without a canvas).
import type { Ctx2D } from '../src/ctx.ts';

export type Call = { op: string; args: number[]; style?: string; clip?: number[][] | null };

export class FakeCtx implements Ctx2D {
  fillStyle: string | CanvasGradient | CanvasPattern = '#000';
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000';
  lineWidth = 1;
  lineJoin: CanvasLineJoin = 'miter';
  lineCap: CanvasLineCap = 'butt';
  font = '';
  textBaseline: CanvasTextBaseline = 'alphabetic';
  calls: Call[] = [];
  texts: string[] = [];
  fillRect(x: number, y: number, w: number, h: number): void {
    this.calls.push({ op: 'fillRect', args: [x, y, w, h], style: String(this.fillStyle) });
  }
  beginPath(): void {
    this.pathRects = [];
    this.calls.push({ op: 'beginPath', args: [] });
  }
  moveTo(x: number, y: number): void {
    this.calls.push({ op: 'moveTo', args: [x, y] });
  }
  lineTo(x: number, y: number): void {
    this.calls.push({ op: 'lineTo', args: [x, y] });
  }
  stroke(): void {
    this.calls.push({ op: 'stroke', args: [], style: String(this.strokeStyle), clip: this.clipRect });
  }
  fillText(text: string, x: number, y: number): void {
    this.texts.push(text);
    this.calls.push({ op: 'fillText', args: [x, y] });
  }
  setTransform(): void {}
  /** Active clip: a union of rectangles [x, y, w, h] (null = whole canvas); tracked through save/restore. */
  clipRect: number[][] | null = null;
  private clipStack: (number[][] | null)[] = [];
  private pathRects: number[][] = [];
  save(): void {
    this.clipStack.push(this.clipRect);
  }
  restore(): void {
    this.clipRect = this.clipStack.pop() ?? null;
  }
  rect(x: number, y: number, w: number, h: number): void {
    this.pathRects.push([x, y, w, h]);
  }
  clip(): void {
    this.clipRect = [...this.pathRects];
  }
  clear(): void {
    this.calls = [];
  }
}
