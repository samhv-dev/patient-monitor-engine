// DOM numeric tiles (brief §3.1: DOM numerics ≤1 Hz). Stage 1 has the HR tile only.
import type { Measured } from '@pme/engine-core';

/** Text for a numeric: dashes when there is no valid value (brief §6.2 "dashes"). */
export function formatNumeric(m: Measured | undefined): string {
  if (!m || m.value === null || m.flag === 'invalid') return '---';
  return String(Math.round(m.value));
}

export interface TileOptions {
  label: string;
  unit: string;
  color: string;
}

export class NumericTile {
  readonly el: HTMLDivElement;
  private readonly valueEl: HTMLDivElement;

  constructor(parent: HTMLElement, opts: TileOptions) {
    const doc = parent.ownerDocument;
    this.el = doc.createElement('div');
    this.el.className = 'pme-tile';
    this.el.style.cssText = `color:${opts.color};font-family:system-ui,sans-serif;padding:8px 12px;line-height:1;`;
    const head = doc.createElement('div');
    head.style.cssText = 'font-size:16px;display:flex;justify-content:space-between;gap:12px;';
    head.innerHTML = `<span>${opts.label}</span><span style="opacity:.8">${opts.unit}</span>`;
    this.valueEl = doc.createElement('div');
    this.valueEl.style.cssText = 'font-size:64px;font-weight:600;text-align:right;font-variant-numeric:tabular-nums;';
    this.valueEl.textContent = '---';
    this.el.append(head, this.valueEl);
    parent.append(this.el);
  }

  update(m: Measured | undefined): void {
    this.valueEl.textContent = formatNumeric(m);
  }
}
