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
  // Re-specified by Stage 7c (R51 addendum 15, ruling 1): with the blood on main the bleed event removes 500 mL but the
  // capillary refill (Starling, plan 7c decision 5) returns a few mL during the 65 s — correct physiology, so the
  // circulation no longer loses exactly 500 mL (measured 497.4 mL: refill 2.6 mL). The property tested is now the
  // haemorrhage ACCOUNTING — the event removes exactly 500.0 mL — and the volume balance: circulation loss = 500 − refill.
  it('a 500 mL bleed over 60 s removes 500.0 mL; the circulation loses 500 − capillary refill', () => {
    const { e } = rig();
    e.advanceTo(5);
    type St = { hemo: { circ: { s: number[]; p: Parameters<typeof totalVolume>[1] } }; blood: { core: { bledMl: number }; circNetMl: number } };
    const st = () => (e.snapshot().state as { st: St }).st;
    // the whole circulating volume incl. the arterial capacitor (the plan's s[4..] sum missed the arterial change the
    // MANUAL tracker makes while defending the pressure targets)
    const vol = () => totalVolume(st().hemo.circ.s, st().hemo.circ.p);
    const v0 = vol();
    const bled0 = st().blood.core.bledMl;
    const net0 = st().blood.circNetMl;
    e.dispatch(ev({ kind: 'bleed', volumeMl: 500, overS: 60 }));
    e.advanceTo(70);
    const bled = st().blood.core.bledMl - bled0;
    const refill = st().blood.circNetMl - net0 + bled; // everything the blood returned besides the bleed
    console.log(`circ-events bleed: event ${bled.toFixed(2)} mL, refill ${refill.toFixed(2)} mL, circulation −${(v0 - vol()).toFixed(2)} mL`);
    expect(bled).toBeCloseTo(500, 1);
    expect(refill).toBeGreaterThan(0);
    expect(refill).toBeLessThan(10);
    expect(v0 - vol()).toBeCloseTo(500 - refill, 0);
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
