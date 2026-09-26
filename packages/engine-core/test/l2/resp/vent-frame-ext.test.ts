// Stage V additive VentFrame fields (types-vent-link.ts): alveolar pressure, when sent, drives the external
// drive's mean pressure (venous-return coupling) and u(t); Paw-only frames behave exactly as in Stage 3.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../../src/engine.ts';
import { seedStream } from '../../../src/rng/sfc32.ts';
import { breathSignal, createDriver, meanAirwayPressure, onVentFrame } from '../../../src/l2/resp/driver.ts';
import { framePressure, type VentFrameExt } from '../../../src/types-vent-link.ts';
import type { Command } from '../../../src/types.ts';

const frames = (palv: boolean) => {
  const d = createDriver(seedStream(1, 'resp'));
  for (let i = 0; i <= 300; i++) {
    const t = i * 0.02;
    const insp = t % 3 < 1;
    const f: VentFrameExt = { pawCmH2O: insp ? 25 : 5, flowLps: insp ? 0.5 : -0.2, volumeMl: insp ? 400 * (t % 3) : 0, fio2: 0.4, peepCmH2O: 5 };
    if (palv) f.palvCmH2O = 13; // trapped gas keeps the alveoli at 13 all cycle
    onVentFrame(d, f, t);
  }
  return d;
};

describe('Stage V VentFrame extension', () => {
  it('framePressure prefers palvCmH2O', () => {
    expect(framePressure({ pawCmH2O: 20, flowLps: 0, volumeMl: 0, fio2: 0.21, peepCmH2O: 5 })).toBe(20);
    expect(framePressure({ pawCmH2O: 20, palvCmH2O: 12, flowLps: 0, volumeMl: 0, fio2: 0.21, peepCmH2O: 5 })).toBe(12);
  });
  it('the drive mean and u(t) follow alveolar pressure when it is sent; Paw-only frames are unchanged', () => {
    const paw = frames(false);
    const alv = frames(true);
    expect(meanAirwayPressure(paw, 6, 50)).toBeGreaterThan(10);
    expect(meanAirwayPressure(paw, 6, 50)).toBeLessThan(13);
    expect(meanAirwayPressure(alv, 6, 50)).toBeCloseTo(13, 6);
    expect(breathSignal(alv, 5.5, 50)).toBeCloseTo(0.5, 6); // constant alveolar pressure → no swing
  });
  it('the engine validates palvCmH2O and accepts mode', () => {
    const e = createEngine({ seed: 1 });
    const cmd = (frame: Record<string, unknown>) => ({ id: 'f', issuedBy: 't', type: 'externalDrive', source: 'ventilator', frame: { pawCmH2O: 10, flowLps: 0, volumeMl: 0, fio2: 0.4, peepCmH2O: 5, ...frame } }) as Command;
    expect(e.dispatch(cmd({ palvCmH2O: 12, mode: 'PCV+' })).accepted).toBe(true);
    expect(e.dispatch(cmd({ palvCmH2O: 400 })).reason).toMatch(/palvCmH2O/);
  });
});
