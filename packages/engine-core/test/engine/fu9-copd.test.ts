// FU-9 Task B2 (F7): COPD GOLD 3 is a compensated retainer (research/22 BF-16b; research/19 CM-07a). Rig = the BF runner's
// awake, spontaneously breathing room-air patient (MODELED) with lung `copd` 0.75, read at 30 min against X-A.
import { describe, expect, it } from 'vitest';
import { arm, MAN, st } from '../helpers/fu9.ts';

describe('FU-9 F7: chronic hypercapnia with chronic renal compensation (tables §1.5; Brackett 1965)', { timeout: 300_000 }, () => {
  it('COPD GOLD 3: PaCO2 43–52 (was 39.7), HCO3 +3 to +4.5 per 10 mmHg above X-A (was +1.3), pH 7.35–7.45', async () => {
    const read = (e: Parameters<typeof st>[0]) => ({ paco2: st(e).resp.co2.pf, hco3: st(e).blood.core.ab.hco3, ph: st(e).blood.core.ab.ph });
    const [c] = await arm([], [1800], read, { ...MAN, lungConditions: [{ id: 'copd', severity: 0.75 }] });
    const [n] = await arm([], [1800], read);
    if (!c || !n) throw new Error('no sample');
    const per10 = (10 * (c.hco3 - n.hco3)) / (c.paco2 - n.paco2);
    console.log(`FU-9 F7: COPD PaCO2 ${c.paco2.toFixed(1)} HCO3 ${c.hco3.toFixed(2)} pH ${c.ph.toFixed(3)}; X-A ${n.paco2.toFixed(1)} / ${n.hco3.toFixed(2)} → ${per10.toFixed(2)} per 10 mmHg`);
    expect(c.paco2).toBeGreaterThanOrEqual(43);
    expect(c.paco2).toBeLessThanOrEqual(52);
    expect(per10).toBeGreaterThanOrEqual(3);
    expect(per10).toBeLessThanOrEqual(4.5);
    expect(c.ph).toBeGreaterThanOrEqual(7.35);
    expect(c.ph).toBeLessThanOrEqual(7.45);
  });
});
