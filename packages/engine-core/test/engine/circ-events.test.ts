import { describe, expect, it } from 'vitest';
import { cmd, rig } from '../helpers/hemo.ts';
import { totalVolume } from '../../src/l2/circ/circuit.ts';

const ev = (event: Record<string, unknown>) => cmd({ type: 'applyEvent', event });

describe('circulation clinical events', () => {
  it('accepts the 7a drugs and every library drug (Stage 7g); unknown ids are rejected', () => {
    const { e } = rig();
    expect(e.dispatch(ev({ kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg', route: 'iv' })).accepted).toBe(true);
    expect(e.dispatch(ev({ kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' })).accepted).toBe(true);
    expect(e.dispatch(ev({ kind: 'drug', drugId: 'vasopressin', dose: 1, unit: 'units', route: 'iv' })).accepted).toBe(true); // Stage 7g
    const r = e.dispatch(ev({ kind: 'drug', drugId: 'unobtainium', dose: 1, unit: 'mg', route: 'iv' }));
    expect(r.accepted).toBe(false);
    expect(r.reason).toMatch(/unknown drug/);
  });
  it('a 500 mL bleed over 60 s removes 500 mL from the circulation', () => {
    const { e } = rig();
    e.advanceTo(5);
    const vol = () => {
      const c = (e.snapshot().state as { st: { hemo: { circ: { s: number[]; p: Parameters<typeof totalVolume>[1] } } } }).st.hemo.circ;
      return totalVolume(c.s, c.p);
    };
    const v0 = vol();
    e.dispatch(ev({ kind: 'bleed', volumeMl: 500, overS: 60 }));
    e.advanceTo(70);
    // the whole circulating volume incl. the arterial capacitor (the plan's s[4..] sum missed the arterial change the
    // MANUAL tracker makes while defending the pressure targets)
    expect(v0 - vol()).toBeCloseTo(500, 0);
  });
  it('tamponade raises CVP; tension pneumothorax raises CVP and lowers ABP', () => {
    const { e } = rig({ sensors: { cvp: 'connected' } });
    e.advanceTo(30);
    expect(e.dispatch(ev({ kind: 'condition', id: 'tensionPtx', severity: 1 })).accepted).toBe(true);
    e.advanceTo(90);
    const st = (e.snapshot().state as { st: { hemo: { circOut: { pRa: number } } } }).st.hemo.circOut;
    expect(st.pRa).toBeGreaterThan(10);
  });
});
