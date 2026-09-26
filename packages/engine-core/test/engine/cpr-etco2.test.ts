// R39-2 (research 09 §2): EtCO2 during CPR by compression quality and ventilation rate. Measured as the mean
// displayed EtCO2 over minutes 1–10 of CPR ("first 10 min", salvageable patient), coarse VF, BVM 500 mL FiO2 1.
import { describe, expect, it } from 'vitest';
import { ADULT, cmd, ev3, hemoOf, mean, numSeries, rig3, run } from '../helpers/resp.ts';

async function cprEtco2(quality: number | undefined, rr = 10): Promise<number> {
  const { e, ev } = rig3({ patient: ADULT });
  await run(e, 60);
  e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' }));
  e.dispatch(ev3({ kind: 'cpr', active: true, rate: 110, ...(quality === undefined ? {} : { quality }) }));
  e.dispatch(ev3({ kind: 'ventilation', source: 'bvm', rr, vtMl: 500, fio2: 1 }));
  await run(e, 60 + 600);
  return mean(numSeries(ev, 'etco2', 120, 660).map(([, v]) => v).filter(Number.isFinite));
}

describe('R39-2 CPR EtCO2 (research 09 §2)', { timeout: 300_000 }, () => {
  it('the learner default cpr.quality is 0.8', () => {
    const { e } = rig3({ patient: ADULT });
    e.dispatch(ev3({ kind: 'cpr', active: true }));
    e.advanceTo(1);
    expect(hemoOf(e).cpr.quality).toBe(0.8);
  });

  it('quality map at 10 breaths/min: 0.5 → 12 (8–15), default 0.8 → 20 (17–23), 1.0 → 25 (22–28), 1.2 mechanical-grade → 29 (26–32)', async () => {
    const poor = await cprEtco2(0.5);
    const learner = await cprEtco2(undefined);
    const perfect = await cprEtco2(1.0);
    const mech = await cprEtco2(1.2);
    expect(poor).toBeGreaterThanOrEqual(8);
    expect(poor).toBeLessThanOrEqual(15);
    expect(learner).toBeGreaterThanOrEqual(17);
    expect(learner).toBeLessThanOrEqual(23);
    expect(perfect).toBeGreaterThanOrEqual(22);
    expect(perfect).toBeLessThanOrEqual(28);
    expect(mech).toBeGreaterThanOrEqual(26);
    expect(mech).toBeLessThanOrEqual(32);
  });

  it('ventilation: +10 breaths/min lowers EtCO2 by ≈ 3 mmHg (−2 to −4.5) at the learner default', async () => {
    const d = (await cprEtco2(0.8, 20)) - (await cprEtco2(0.8, 10));
    expect(d).toBeLessThanOrEqual(-2);
    expect(d).toBeGreaterThanOrEqual(-4.5);
  });
});
