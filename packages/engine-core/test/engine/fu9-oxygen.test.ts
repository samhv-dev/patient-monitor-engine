// FU-9 Task A2 (F3): low flow raises O2 extraction before VO2 becomes supply-dependent (research/22 BF-29b). Rig = the
// BF runner's GA vent (MODELED, 70 kg man); a 2 L bleed over 10 min from 60 s; read at 1200 s against no bleed.
import { describe, expect, it } from 'vitest';
import { arm, ev, GA_VENT, st } from '../helpers/fu9.ts';

describe('FU-9 F3: SvO2 falls with cardiac output in haemorrhage (Rivers 2001; Vincent & De Backer 2013)', { timeout: 300_000 }, () => {
  it('2 L bleed: 7c SvO2 < 65 % while lactate rises (was 77.8 % — the regional term cut VO2 instead); extraction ≥ 0.4', async () => {
    const read = (e: Parameters<typeof st>[0]) => ({ ...st(e).blood.core.o2, lact: st(e).blood.out.lactate });
    const [lo] = await arm([...GA_VENT, [60, ev({ kind: 'bleed', volumeMl: 2000, overS: 600 })]], [1200], read);
    const [n] = await arm(GA_VENT, [1200], read);
    if (!lo || !n) throw new Error('no sample');
    console.log(`FU-9 F3: SvO2 ${(100 * lo.svo2).toFixed(1)} % (control ${(100 * n.svo2).toFixed(1)}), DO2 ${lo.do2.toFixed(0)}, VO2 ${lo.vo2.toFixed(0)}/${lo.demand.toFixed(0)}, ER ${lo.er.toFixed(2)}, lactate ${lo.lact.toFixed(2)} (control ${n.lact.toFixed(2)})`);
    expect(lo.svo2).toBeLessThan(0.65);
    expect(n.svo2).toBeGreaterThan(0.65);
    expect(lo.lact).toBeGreaterThan(n.lact + 1);
    expect(lo.er).toBeGreaterThanOrEqual(0.4); // below DO2crit VO2 is supply-dependent at ER = demand/DO2crit
  });
});
