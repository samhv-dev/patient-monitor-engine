// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { LAB_ROWS, labCritical, labFlag, mountLabPanel } from '../src/lab-panel.ts';

const V = { ph: 7.21, pco2: 40, po2: 95, hco3: 15.6, be: -11, so2: 97, cohb: 0, methb: 0, lactate: 6.1, na: 140, k: 6.2, cl: 104, iCa: 1.2, mg: 0.85, hb: 12, glucose: 100, ag: 20, osm: 290 };
const row = (k: string) => LAB_ROWS.find((r) => r.key === k)!;

describe('lab panel widget', () => {
  it('flags values outside the reference range', () => {
    expect(labFlag(row('k'), 6.2)).toBe('high');
    expect(labFlag(row('k'), 4.2)).toBe('ok');
    const el = document.createElement('div');
    mountLabPanel(el)(V, 'ABG');
    expect(el.querySelectorAll('tbody tr').length).toBe(Object.keys(V).length); // a row per value given, none for INR
    expect(el.querySelector('tr.high')?.textContent).toContain('↑');
    expect(el.textContent).toContain('ABG');
  });

  it('every range and every critical limit carries its source; a row without a sourced range is never flagged (L11)', () => {
    for (const r of LAB_ROWS) {
      for (const x of [r.range, r.crit, r.venous?.range, r.venous?.crit]) if (x) expect(x.src.length, r.key).toBeGreaterThan(10);
      if (r.range === null) {
        expect(labFlag(r, -1e9)).toBe('ok');
        expect(labFlag(r, 1e9)).toBe('ok');
      }
    }
    // the gas panels' and the laboratory panels' analytes the engine computes today each have a row
    for (const k of ['ph', 'pco2', 'po2', 'hco3', 'be', 'so2', 'cohb', 'methb', 'lactate', 'na', 'k', 'cl', 'iCa', 'mg', 'hb', 'glucose', 'ag', 'osm', 'inr']) expect(row(k), k).toBeDefined();
  });

  it('marks a critical value from the Kost list (at or beyond the limit), arterial and venous apart', () => {
    expect(labCritical(row('k'), 6.0)).toBe(true);
    expect(labCritical(row('k'), 5.9)).toBe(false);
    expect(labCritical(row('k'), 2.8)).toBe(true);
    expect(labCritical(row('pco2'), 69, 'vbg')).toBe(true); // venous PCO2 high limit 68
    expect(labCritical(row('pco2'), 69, 'abg')).toBe(false); // arterial 70
    expect(labCritical(row('po2'), 39, 'abg')).toBe(true);
    expect(labCritical(row('po2'), 30, 'vbg')).toBe(false); // no venous PO2 limit
    expect(labCritical(row('be'), -30)).toBe(false); // no list carries base excess
    const el = document.createElement('div');
    mountLabPanel(el)({ k: 6.4, na: 140 }, 'Chemistry', 'chem');
    const k = el.querySelector('tr[data-key="k"]')!;
    expect(k.classList.contains('crit')).toBe(true);
    expect(k.textContent).toContain('critical');
    expect(el.querySelector('tr[data-key="na"]')?.classList.contains('crit')).toBe(false);
  });

  it('shows the range it flags against; a venous gas is not flagged against arterial ranges', () => {
    const el = document.createElement('div');
    const up = mountLabPanel(el);
    up({ po2: 40, pco2: 50 }, 'VBG', 'vbg');
    expect(el.querySelector('tr[data-key="po2"]')?.className).toBe('ok'); // venous 35–45
    expect(el.querySelector('tr[data-key="pco2"]')?.className).toBe('ok'); // no sourced venous range: unflagged
    expect(el.querySelector('tr[data-key="pco2"] .range')?.textContent).toBe('—');
    up({ po2: 40, pco2: 50 }, 'ABG', 'abg');
    expect(el.querySelector('tr[data-key="pco2"]')?.className).toBe('high');
    expect(el.querySelector('tr[data-key="pco2"] .range')?.textContent).toBe('35–45');
    const po2 = el.querySelector('tr[data-key="po2"]')!; // arterial PO2 depends on the FiO2: no range, but 40 is critical
    expect(po2.classList.contains('low')).toBe(false);
    expect(po2.classList.contains('crit')).toBe(true);
  });
});
