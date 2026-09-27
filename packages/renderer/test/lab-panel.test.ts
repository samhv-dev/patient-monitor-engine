// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { LAB_ROWS, labFlag, mountLabPanel } from '../src/lab-panel.ts';

const V = { ph: 7.21, pco2: 40, po2: 95, hco3: 15.6, be: -11, so2: 97, cohb: 0, methb: 0, lactate: 6.1, na: 140, k: 6.2, cl: 104, iCa: 1.2, mg: 0.85, hb: 12, glucose: 100, ag: 20, osm: 290 };

describe('lab panel widget', () => {
  it('flags values outside the reference range', () => {
    const k = LAB_ROWS.find((r) => r.key === 'k')!;
    expect(labFlag(k, 6.2)).toBe('high');
    expect(labFlag(k, 4.2)).toBe('ok');
    const el = document.createElement('div');
    mountLabPanel(el)(V, 'ABG');
    expect(el.querySelectorAll('tr').length).toBe(LAB_ROWS.length);
    expect(el.querySelector('tr.high')?.textContent).toContain('↑');
    expect(el.textContent).toContain('ABG');
  });
});
