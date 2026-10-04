// @vitest-environment happy-dom
// The component set's behaviour contracts (research/13 brief §7): labels in the accessible name, units, clamping,
// ARIA tabs with arrow keys, pressed state on toggles and segmented controls.
import { describe, expect, it } from 'vitest';
import { glossLabel, seg, stepper, tabs, toggle } from './ui.ts';

describe('components', () => {
  it('stepper: unit in the accessible name, clamps to its range, repeats the step', () => {
    let got = 0;
    const s = stepper({ label: 'SpO₂ target', unit: '%', min: 0, max: 100, step: 1, value: 97, onchange: (v) => (got = v) });
    expect(s.input.getAttribute('aria-label')).toBe('SpO₂ target (%)');
    s.input.value = '140';
    s.input.dispatchEvent(new Event('change'));
    expect(s.value).toBe(100);
    expect(got).toBe(100);
    const [minus] = s.el.querySelectorAll('button');
    expect(minus?.getAttribute('aria-label')).toBe('Decrease SpO₂ target');
  });
  it('segmented control and toggle expose aria-pressed', () => {
    let v = '';
    const g = seg('Mode', [['modeled', 'MODELED'], ['manual', 'MANUAL']], 'modeled', (x) => (v = x));
    const b = g.querySelectorAll('button');
    (b[1] as HTMLButtonElement).click();
    expect(v).toBe('manual');
    expect([...b].map((x) => x.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
    const t = toggle('Synchronised', false, () => undefined);
    t.click();
    expect(t.getAttribute('aria-pressed')).toBe('true');
  });
  it('tabs: one selected, arrow keys move, panels are built on first open', () => {
    let built = 0;
    const t = tabs('Instructor controls', ['a', 'b', 'c'].map((id) => ({ id, label: id.toUpperCase(), render: () => (built++, document.createElement('div')) })), 'a');
    document.body.append(t.el);
    expect(built).toBe(1);
    const list = t.el.querySelector('[role=tablist]') as HTMLElement;
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(t.current()).toBe('c');
    expect(built).toBe(2);
    expect([...list.querySelectorAll('[role=tab]')].map((x) => x.getAttribute('aria-selected'))).toEqual(['false', 'false', 'true']);
  });
  it('glossary label: short label plus a tooltip button named after it', () => {
    const l = glossLabel(15);
    expect(l.querySelector('b')?.textContent).toBe('EtCO₂');
    expect(l.querySelector('button')?.getAttribute('aria-label')).toBe('About EtCO₂');
  });
});
