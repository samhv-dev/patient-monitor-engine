// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { createDrugPanel } from '../src/drug-panel.ts';

describe('drug panel', () => {
  it('renders one row per drug with Cp/Ce, TCI target and decrement time; a volatile line with MAC', () => {
    const host = document.createElement('div');
    const p = createDrugPanel(host);
    p.update({
      type: 'drugs', t: 60, macTotal: 0.9,
      volatile: { agent: 'sevoflurane', dialPct: 2, fgfLpm: 2, fi: 1.8, fa: 1.5, brain: 1.3, macAge: 1.8, macFrac: 0.72, n2oFrac: 0 },
      drugs: [{ id: 'propofol', name: 'Propofol', unit: 'µg/mL', cp: 4.1, ce: 3.2, rate: 12, rateUnit: 'mg/min', tci: { mode: 'effect', target: 4, model: 'eleveld' }, totalAmount: 160, amountUnit: 'mg', decrement50Min: 3.9 }],
    });
    expect(host.textContent).toContain('Propofol');
    expect(host.textContent).toContain('3.20');
    expect(host.textContent).toContain('Ce 4');
    expect(host.textContent).toContain('0.72 MAC');
    expect(host.querySelectorAll('canvas').length).toBe(1);
  });
});
