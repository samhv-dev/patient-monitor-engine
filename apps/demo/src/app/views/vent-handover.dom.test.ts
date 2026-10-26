// @vitest-environment happy-dom
// E128: the Ventilator view's hand-over — the cockpit's settings as the engine's `ventilation` event takes them, and back.
import { describe, expect, it } from 'vitest';
import { createVent, monitorMatchedFlow, type VentConfig } from '@pme/ventilator';
import { cockpitPatch, engineVentilation } from './vent.ts';

const cfg = (patch: Partial<VentConfig> = {}): VentConfig => ({ ...createVent().cfg, ...patch });

describe('engineVentilation', () => {
  it('VC at the monitor-matched flow: rate, VT, PEEP, FiO2 as a fraction, Pmax, I:E 1:2', () => {
    const c = cfg({ mode: 'VC', rate: 14, vt: 500, peep: 5, fio2: 40, pmax: 35 });
    Object.assign(c, monitorMatchedFlow(c));
    expect(engineVentilation(c)).toEqual({ rr: 14, vtMl: 500, peep: 5, fio2: 0.4, ie: 2, pmax: 35 });
  });
  it('VC with its own flow and pause: I:E from VT / flow + pause', () => {
    // Ti = 0.5 L / 1 L/s + 0.5 s = 1 s; period 60 / 15 = 4 s → I:E 1:3
    expect(engineVentilation(cfg({ mode: 'VC', rate: 15, vt: 500, vcFlow: 60, pause: 0.5 })).ie).toBe(3);
  });
  it('PC hands over the volume it delivers; PSV the rate it measures; PRVC its target', () => {
    expect(engineVentilation(cfg({ mode: 'PC', rate: 12, itime: 1.25 }), { RR: 12, VTE: 430 })).toMatchObject({ rr: 12, vtMl: 430, ie: 3 });
    expect(engineVentilation(cfg({ mode: 'PSV', rate: 12 }), { RR: 22, VTE: 380 })).toMatchObject({ rr: 22, vtMl: 380 });
    expect(engineVentilation(cfg({ mode: 'PRVC', prvcTarget: 450 }), { RR: 14, VTE: 300 })).toMatchObject({ vtMl: 450 });
  });
  it('stays inside the event\'s ranges', () => {
    const v = engineVentilation(cfg({ mode: 'VC', rate: 14, vt: 2000, peep: 40, fio2: 100, pmax: 90, vcFlow: 10, pause: 0 }));
    expect(v).toMatchObject({ vtMl: 1500, peep: 30, fio2: 1, pmax: 80 });
    expect(v.ie).toBeGreaterThanOrEqual(0.5);
  });
});

describe('cockpitPatch', () => {
  it('the engine settings as a VC patch; a cockpit in another mode goes back to VC', () => {
    expect(cockpitPatch({ rr: 16, vtMl: 450, peep: 6, fio2: 0.5, pmax: 30 }, { mode: 'VC' })).toEqual({ rate: 16, vt: 450, peep: 6, fio2: 50, pmax: 30 });
    expect(cockpitPatch({ rr: 16 }, { mode: 'PC' })).toEqual({ mode: 'VC', modeLabel: null, rate: 16 });
  });
});
