import { describe, expect, it } from 'vitest';
import { cardiacOutput } from '../../src/l2/gas/coupling.ts';
import { numeric, rig } from '../helpers/hemo.ts';

describe('CircBeats feed the Stage 2/3 consumers', () => {
  it('pulse rate (pleth) equals HR in sinus and the NIBP cycle completes near the arterial truth', () => {
    const { e, ev } = rig({ hr: 75, sensors: { abp: 'connected' } });
    e.dispatch({ id: 'n', issuedBy: 't', type: 'device', action: { device: 'nibp', action: 'start' } });
    e.advanceTo(60);
    const pr = numeric(ev, 'pr', 40, 60);
    expect(pr.length).toBeGreaterThan(5);
    expect(Math.abs(pr[pr.length - 1]! - 75)).toBeLessThanOrEqual(3);
    const sys = numeric(ev, 'nibpSys');
    expect(sys.length).toBe(1);
    expect(sys[0]!).toBeGreaterThan(100);
    expect(sys[0]!).toBeLessThan(135);
  });
  it('the gas model reads cardiac output from the circulation (4–7 L/min at rest)', () => {
    const { e } = rig({ hr: 75 });
    e.advanceTo(20);
    const st = (e.snapshot().state as { st: { hemo: Parameters<typeof cardiacOutput>[0] } }).st;
    const co = cardiacOutput(st.hemo, 20);
    expect(co).toBeGreaterThan(4);
    expect(co).toBeLessThan(7);
  });
});
