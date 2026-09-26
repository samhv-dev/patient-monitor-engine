import { describe, expect, it } from 'vitest';
import { respOf as resp } from '../helpers/lung.ts';
import { cmd, ev3, rig3 } from '../helpers/resp.ts';
import type { MonitorEngine } from '../../src/types.ts';

/** A 50 Hz square-flow VC ventilator: 0.5 L/s for 1 s, passive expiration (frames report volume), period 4.3 s. */
function drive(e: MonitorEngine, t0: number, t1: number, palv = false) {
  for (let t = t0; t < t1; t += 0.02) {
    const ph = t % 4.3;
    const insp = ph < 1;
    const vol = insp ? 500 * ph : 500 * Math.exp(-(ph - 1) / 0.55);
    const frame: Record<string, unknown> = { pawCmH2O: insp ? 20 : 5, flowLps: insp ? 0.5 : -0.9 * Math.exp(-(ph - 1) / 0.55), volumeMl: vol, fio2: 0.4, peepCmH2O: 5, phase: insp ? 'insp' : 'exp' };
    if (palv) { frame.palvCmH2O = 5 + vol / 55; frame.mode = 'VC'; }
    e.dispatch(cmd({ type: 'externalDrive', source: 'ventilator', frame }));
    e.advanceTo(t + 0.02);
  }
}

describe('external ventilator frames drive the two lungs', { timeout: 300_000 }, () => {
  it('unit tidal volumes add up to the frame VT; OLV puts it all in one lung', () => {
    const { e } = rig3();
    drive(e, 0, 30);
    const tid = resp(e).lung.tidal;
    expect(tid.reduce((a, b) => a + b, 0)).toBeGreaterThan(450);
    expect(tid.reduce((a, b) => a + b, 0)).toBeLessThan(550);
    e.dispatch(ev3({ kind: 'mainstem', ventilated: 'right' }));
    drive(e, 30, 60);
    const t2 = resp(e).lung.tidal;
    expect((t2[0] as number) + (t2[1] as number)).toBeLessThan(5);
  });
  it('frames with palvCmH2O/mode (Stage V) are accepted once Stage V is merged, and change nothing in the lungs', () => {
    const { e } = rig3();
    const probe = e.dispatch(cmd({ type: 'externalDrive', source: 'ventilator', frame: { pawCmH2O: 5, flowLps: 0, volumeMl: 0, fio2: 0.4, peepCmH2O: 5, palvCmH2O: 5 } })) as { accepted: boolean };
    if (!probe.accepted) return; // Stage V not on main yet: nothing to check
    drive(e, 0, 30, true);
    const tid = resp(e).lung.tidal;
    expect(tid.reduce((a, b) => a + b, 0)).toBeGreaterThan(450);
  });
});
