// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { mountEndoPanel } from '../src/endo-panel.ts';

const E = { type: 'endo' as const, t: 1, glucoseMgDl: 50, glucoseMmolL: 2.8, insulinUuMl: 30, epinephrinePgMl: 600, norepinephrinePgMl: 400, cortisolNmolL: 900, stressIndex: 72, mhActivity: 0, shivering: false, sweating: true, vasoconstricted: false, tempPeriphC: 33 };

describe('endo panel', () => {
  it('shows glucose with a red level-2 flag; hides the stress index unless instructor', () => {
    const host = document.createElement('div');
    const p = mountEndoPanel(host, { instructor: false });
    p.update(E);
    expect(host.textContent).toContain('2.8');
    expect(host.querySelector('[data-level="red"]')).not.toBeNull();
    expect(host.textContent).not.toContain('72');
    const h2 = document.createElement('div');
    mountEndoPanel(h2, { instructor: true }).update(E);
    expect(h2.textContent).toContain('72');
    p.destroy();
    expect(host.childElementCount).toBe(0);
  });
});
