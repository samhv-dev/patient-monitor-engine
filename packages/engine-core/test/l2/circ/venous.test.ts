// FU-2 item 2 (NR-7g-2): β-adrenergic mobilisation of unstressed venous volume (l2/circ/venous.ts).
import { describe, expect, it } from 'vitest';
import { betaDV0Ml, betaVenousUnits, BETA_V0_MAX_ML_KG } from '../../../src/l2/circ/venous.ts';
import { circCardiacOutput, createCircModel, CTL_DT, RESTING_ENV, stepCircModel } from '../../../src/l2/circ/model.ts';
import { createOut } from '../../../src/l2/circ/circuit.ts';
import { advancePk, applyPkCommand, createPkState, NEUTRAL_PK_CTX } from '../../../src/l2/pk/pipeline.ts';
import { V0_RECRUIT_MAX_ML_KG } from '../../../src/l2/circ/baroreflex.ts';
import { driver, runTo } from '../../helpers/circ.ts';
import type { Command } from '../../../src/types.ts';

describe('β venous mobilisation (NR-7g-2)', () => {
  it('potency: dobutamine Ce / 7 µg/kg/min; other agents are ignored', () => {
    expect(betaVenousUnits({ dobutamine: { brain: 7 } })).toBeCloseTo(1, 12);
    expect(betaVenousUnits({ norepinephrine: { brain: 0.3 }, phenylephrine: { brain: 1 } })).toBe(0);
    expect(betaVenousUnits({})).toBe(0);
  });
  it('volume: Emax = the recruitable reservoir (12 mL/kg), half at u = 1; β occupancy 0.5 doubles the EC50', () => {
    expect(BETA_V0_MAX_ML_KG).toBe(12);
    expect(betaDV0Ml(1, 0, 70)).toBeCloseTo(420, 9);
    expect(betaDV0Ml(1, 0.5, 70)).toBeCloseTo(840 / 3, 9);
    expect(betaDV0Ml(0, 0, 70)).toBe(0);
  });
  it('the control step moves the volume out of the unstressed pool (default 0 leaves the state identical)', () => {
    const step = (u?: number) => {
      const m = createCircModel();
      if (u !== undefined) m.ext.betaAgonistU = u;
      stepCircModel(m, CTL_DT / 2, RESTING_ENV, createOut());
      return m;
    };
    const a = step();
    expect(step(0).p).toEqual(a.p);
    expect(a.p.v0Sv - step(1).p.v0Sv).toBeCloseTo(betaDV0Ml(1, 0, 70), 6);
  });
  it('F4: the β term and the reflex share one reservoir — a 25 % haemorrhage + dobutamine never mobilise more than 12 mL/kg', () => {
    /** Largest unstressed volume moved out of the reservoir (base − current v0Sv, mL) over a bleed of 25 % of the blood
     * volume in 60 s and 4 min after it, reflexes on, with β potency u (1 ≈ dobutamine 7 µg/kg/min at the effect site). */
    const most = (u: number) => {
      const m = createCircModel();
      const dr = driver(m);
      runTo(dr, 30, RESTING_ENV);
      m.vol.push({ rate: (-0.25 * m.prof.bloodVolumeMl) / 60, until: 90 });
      m.ext.betaAgonistU = u;
      let v = 0;
      for (let t = 30.5; t <= 330; t += 0.5) {
        runTo(dr, t, RESTING_ENV);
        v = Math.max(v, m.base.v0Sv - m.p.v0Sv);
      }
      return v;
    };
    const cap = V0_RECRUIT_MAX_ML_KG * 70;
    const reflex = most(0);
    const both = most(1);
    console.log(`FU-2 F4 haemorrhage 25 %: reflex recruits ${reflex.toFixed(0)} mL; + dobutamine (u 1, ${betaDV0Ml(1, 0, 70).toFixed(0)} mL alone) ${both.toFixed(0)} mL (cap ${cap})`);
    expect(reflex + betaDV0Ml(1, 0, 70)).toBeGreaterThan(cap); // unclamped, the two would overdraw the reservoir
    expect(both).toBeLessThanOrEqual(cap + 1e-6);
    expect(both).toBeGreaterThanOrEqual(reflex); // the β term still adds while there is room
  }, 120_000);
  it('closed loop: dobutamine 5 µg/kg/min (7g multipliers) raises CO ≥ 8 points more with the venous term than without', () => {
    const pk = createPkState();
    applyPkCommand(pk, { type: 'applyEvent', event: { kind: 'infusion', drugId: 'dobutamine', rate: 5, unit: 'mcg/kg/min' } } as unknown as Command, 0);
    advancePk(pk, NEUTRAL_PK_CTX, 1200);
    const rise = (venous: boolean) => {
      const m = createCircModel();
      const dr = driver(m);
      /** CO averaged over [a, b] at 20 Hz (a single reading carries the 4 s filter's beat ripple, ±10 %). */
      const coMean = (a: number, b: number) => {
        let sum = 0;
        let n = 0;
        for (let t = a; t < b; t += 0.05, n++) {
          runTo(dr, t, RESTING_ENV);
          sum += circCardiacOutput(m);
        }
        return sum / n;
      };
      const co0 = coMean(30, 60);
      m.ext.drug = pk.fx;
      m.ext.betaAgonistU = venous ? betaVenousUnits(pk.bus.agents) : 0;
      runTo(dr, 360, RESTING_ENV);
      return 100 * (coMean(360, 400) / co0 - 1);
    };
    const without = rise(false);
    const withV = rise(true);
    console.log(`FU-2 dobutamine 5 (circ level, reflexes on): CO +${without.toFixed(1)} % → +${withV.toFixed(1)} % with the β venous term`);
    expect(withV - without).toBeGreaterThanOrEqual(8);
  }, 120_000);
});
