// Brief 94: the one pericardium every chamber shares (circuit.ts P_peri = A·(e^{λ(V_LV + V_RV + vFluid − v0Peri)} − 1))
// is engaged at rest, its free space set by stabilisation from the measured resting intrapericardial pressure, and its
// curve checked against the same source's volume-expansion point.
import { describe, expect, it } from 'vitest';
import { circVolume, createCircModel, RESTING_ENV } from '../../../src/l2/circ/model.ts';
import { PERI_REST_MEAN_MMHG } from '../../../src/l2/circ/params.ts';
import { resolveProfile } from '../../../src/l2/circ/profile.ts';
import { stabilise } from '../../../src/l2/circ/stabilise.ts';
import { driver, mean, runTo } from '../../helpers/circ.ts';

function window(dr: ReturnType<typeof driver>, t0: number, t1: number) {
  const peri: number[] = [], laTm: number[] = [];
  runTo(dr, t1, RESTING_ENV, (o, t) => { if (t >= t0) { peri.push(o.pPeri); laTm.push(o.pLa - o.pIt - o.pPeri); } });
  return { peri: mean(peri), laTm: mean(laTm) };
}

describe('the resting pericardium (Freeman & LeWinter 1986, J Appl Physiol 60:758, open chest)', () => {
  const m = createCircModel();
  const dr = driver(m);
  runTo(dr, 30, RESTING_ENV);
  const rest = window(dr, 30, 40);
  it('stabilisation converges with the pericardium engaged, for every age band', () => {
    for (const pr of [{ ageY: 40, sex: 'M' as const, weightKg: 70, conditions: [] }, { ageY: 0.1, sex: 'F' as const, weightKg: 3.5, conditions: [] }, { ageY: 4, sex: 'M' as const, weightKg: 16, conditions: [] }, { ageY: 80, sex: 'F' as const, weightKg: 60, conditions: [] }]) {
      expect(stabilise(resolveProfile(pr)).converged).toBe(true);
    }
  }, 120_000);
  it('the resting heart meets its pericardium: cycle-mean pericardial pressure inside 1.1 ± 0.9 mmHg once the reflexes run (stabilised to 1.1 ± 0.1)', () => {
    console.log('PERI rest', JSON.stringify(rest), 'v0Peri', m.p.v0Peri.toFixed(1));
    expect(PERI_REST_MEAN_MMHG).toBe(1.1);
    expect(rest.peri).toBeGreaterThanOrEqual(0.2);
    expect(rest.peri).toBeLessThanOrEqual(2.0);
  });
  it('volume expansion that raises LA transmural pressure ≈ 7 mmHg (source 9.5 → 16.4) raises it inside 3.0 ± 1.6', () => {
    // with the reflexes on, as in the anaesthetised dog; a litre is enough to move the LA by the source's ≈ 7 mmHg
    let after = rest;
    for (let k = 0; k < 8 && after.laTm - rest.laTm < 6.9; k++) {
      circVolume(m, 250, 30);
      runTo(dr, m.t + 60, RESTING_ENV);
      after = window(dr, m.t, m.t + 10);
    }
    console.log('PERI expanded', JSON.stringify(after), 'ΔLA', (after.laTm - rest.laTm).toFixed(1));
    expect(after.laTm - rest.laTm).toBeGreaterThanOrEqual(6.9);
    expect(after.peri).toBeGreaterThanOrEqual(1.4);
    expect(after.peri).toBeLessThanOrEqual(4.6);
  }, 120_000);
});
