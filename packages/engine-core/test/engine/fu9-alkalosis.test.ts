// FU-9 Task A7 (F9): metabolic alkalosis is compensated by hypoventilation (research/22 BF-15b). Rig = the BF runner's
// awake, spontaneously breathing room-air patient (MODELED) with a profile HCO3 34, read at 30 min against X-A.
import { describe, expect, it } from 'vitest';
import { arm, MAN, st } from '../helpers/fu9.ts';

describe('FU-9 F9: respiratory compensation of metabolic alkalosis (Javaheri 1987; the Boston rules)', { timeout: 300_000 }, () => {
  it('HCO3 34: PaCO2 +5 to +9 above the normal patient (expected +7), pH below 7.55 (was PaCO2 −0.1, pH 7.55)', async () => {
    const read = (e: Parameters<typeof st>[0]) => ({ paco2: st(e).resp.co2.pf, ph: st(e).blood.core.ab.ph, hco3: st(e).blood.core.ab.hco3 });
    const [a] = await arm([], [1800], read, { ...MAN, blood: { hco3: 34 } });
    const [n] = await arm([], [1800], read);
    if (!a || !n) throw new Error('no sample');
    console.log(`FU-9 F9: PaCO2 ${a.paco2.toFixed(1)} vs ${n.paco2.toFixed(1)}, pH ${a.ph.toFixed(3)}, HCO3 ${a.hco3.toFixed(1)}`);
    expect(a.paco2 - n.paco2).toBeGreaterThanOrEqual(5);
    expect(a.paco2 - n.paco2).toBeLessThanOrEqual(9);
    expect(a.ph).toBeLessThan(7.55);
  });
});
