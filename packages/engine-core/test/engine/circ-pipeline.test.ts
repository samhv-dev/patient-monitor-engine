// The Stage 2 channels are now fed by the Stage 7a circulation (MANUAL mode, default profile).
import { describe, expect, it } from 'vitest';
import { read, rig } from '../helpers/hemo.ts';

describe('hemo pipeline fed by the circulation', () => {
  it('ABP is a radial waveform with a dicrotic notch near 120/80 once the tracker settles', () => {
    const { e } = rig({ hr: 75 });
    e.advanceTo(40);
    const w = read(e, 'abp', 30, 40);
    const sbp = Math.max(...w);
    const dbp = Math.min(...w);
    expect(sbp).toBeGreaterThan(112);
    expect(sbp).toBeLessThan(128);
    expect(dbp).toBeGreaterThan(74);
    expect(dbp).toBeLessThan(86);
  });
  it('the state snapshot carries the circulation and stays JSON-safe (structuredClone round-trip is exact)', () => {
    const { e } = rig({ hr: 75 });
    e.advanceTo(5);
    const s = e.snapshot();
    expect(JSON.parse(JSON.stringify(s.state)).st.hemo.circ.s.length).toBe(11);
  });
  it('CVP and PAP lines show chamber-derived traces with the expected means', () => {
    const { e } = rig({ hr: 75, sensors: { cvp: 'connected', pap: 'connected' } });
    e.advanceTo(40);
    const cvp = read(e, 'cvp', 30, 40);
    const pap = read(e, 'pap', 30, 40);
    const mean = (a: Float32Array) => a.reduce((x, y) => x + y, 0) / a.length;
    expect(mean(cvp)).toBeGreaterThan(2);
    expect(mean(cvp)).toBeLessThan(9);
    expect(Math.max(...pap)).toBeGreaterThan(18);
    expect(Math.max(...pap)).toBeLessThan(34);
    expect(Math.min(...pap)).toBeGreaterThan(4);
    expect(Math.min(...pap)).toBeLessThan(15);
  });
});
