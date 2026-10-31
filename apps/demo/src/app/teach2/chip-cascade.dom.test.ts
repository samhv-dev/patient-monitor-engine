// @vitest-environment happy-dom
// The strip's chips and the sheets' tray share the class name `ip2-chip` (state.css, sheets.css). With both sheets
// loaded, in either order, a strip chip keeps its state's look (a finished stage's chip no frame and the muted text, the
// current one its blue frame, a future one its dashed frame), and a tray chip keeps the tray's frame. Before, the tray's
// unscoped `.ip2-chip { border: 1px solid … }` tied the state rules on specificity and won when sheets.css came later.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

const css = (f: string) => readFileSync(resolve(import.meta.dirname, f), 'utf8');
const SHEETS = { tokens: css('teach2.css'), state: css('state.css'), sheets: css('sheets.css') };

function page(order: Array<keyof typeof SHEETS>) {
  document.head.replaceChildren(...order.map((k) => Object.assign(document.createElement('style'), { textContent: SHEETS[k] })));
  document.body.innerHTML = `
    <nav class="ip2-strip"><div class="ip2-chips">
      <button class="ip2-chip ip2-past" id="past"><span class="ip2-chip-name">Awake</span></button>
      <span class="ip2-chip ip2-current" id="cur"><span class="ip2-chip-name">Induced</span></span>
      <button class="ip2-chip ip2-future" id="fut"><span class="ip2-chip-name">MH</span></button>
    </div></nav>
    <div class="ip2-tray-items"><span class="ip2-chip" id="tray">Dantrolene 2.5 mg/kg</span></div>`;
  const cs = (id: string) => getComputedStyle(document.getElementById(id) as HTMLElement);
  return { cs };
}

beforeEach(() => document.head.replaceChildren());

describe('a strip chip keeps its state look with the sheets\' tray loaded', () => {
  for (const order of [['tokens', 'state', 'sheets'], ['tokens', 'sheets', 'state']] as Array<Array<keyof typeof SHEETS>>) {
    it(`loaded ${order.slice(1).join(' then ')}`, () => {
      const { cs } = page(order);
      expect(cs('past').borderTopColor, 'a finished stage: no frame').toBe('transparent');
      expect(cs('past').color, 'a finished stage: the muted text').toBe('#9aa4ad');
      expect(cs('cur').borderTopColor, 'the current stage: its blue frame').toBe('#3b82f6');
      expect(cs('fut').borderTopStyle, 'a future stage: its dashed frame').toBe('dashed');
      expect(cs('tray').borderTopColor, "the tray's chip keeps its frame").toBe('#3a434d');
      expect(cs('tray').display).toBe('inline-flex');
    });
  }
});
