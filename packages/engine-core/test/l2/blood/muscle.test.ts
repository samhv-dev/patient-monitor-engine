// E134: the muscle model's own limits on anaerobic metabolism (the pH and glycogen brakes), its heat, and the
// unpaid-ATP/thermal injury dose with the potassium necrosis releases.
import { describe, expect, it } from 'vitest';
import {
  anaerobicFactor, createMuscle, glycogenFactor, muscleActivityKShift, pfkFactor, pHi, stepMuscle,
  CEM43_MUSCLE_MIN, GLYCOGEN_LOW_MMOL_PER_KG, GLYCOGEN_MMOL_PER_KG, GLYCOLYSIS_HEAT_J_PER_MMOL, INJ_FULL_DOSE_MIN,
  INJ_TOL_DOSE_MIN, K_ACT_PER_VO2X, LACTATE_PER_GLUCOSYL, MUSCLE_K_MMOL_PER_KG, MUSCLE_MASS_FRAC_M, MUSCLE_REST_VO2_FRAC,
} from '../../../src/l2/blood/muscle.ts';
import { K_ANAER } from '../../../src/l2/blood/params.ts';

const VO2_REST = 280; // 80 kg at 3.5 mL/kg/min
const quiet = (ph: number, deficit: number, tempC = 37) => ({ ph, tempC, deficitMlMin: deficit, activityMlMin: 0, restVo2MlMin: VO2_REST, demandMlMin: 280 });

describe('E134 muscle: the anaerobic brakes', () => {
  it('the phosphofructokinase brake: 1 at the resting pH, half at a plasma pH of 6.92 (pHi 6.6), shut by 6.6', () => {
    expect(pHi(7.4)).toBeCloseTo(7.08, 9);
    expect(pfkFactor(7.4)).toBeCloseTo(1, 9);
    expect(pfkFactor(7.5)).toBeCloseTo(1, 9); // normalised: alkalaemia does not speed it beyond the measured yield
    expect(pfkFactor(6.92)).toBeCloseTo(0.5, 2);
    expect(pfkFactor(6.6)).toBeLessThan(0.05);
    expect(pfkFactor(7.2)).toBeGreaterThan(pfkFactor(7.0));
    expect(pfkFactor(7.0)).toBeGreaterThan(pfkFactor(6.8));
  });

  it('the glycogen brake: no limit above the low store, linear to 0 at an empty one', () => {
    const st = createMuscle(80, false);
    expect(st.massKg).toBeCloseTo(MUSCLE_MASS_FRAC_M * 80, 9);
    expect(st.glycogenMmol).toBeCloseTo(GLYCOGEN_MMOL_PER_KG * st.massKg, 9);
    expect(glycogenFactor(st)).toBe(1);
    st.glycogenMmol = 0.5 * GLYCOGEN_LOW_MMOL_PER_KG * st.massKg;
    expect(glycogenFactor(st)).toBeCloseTo(0.5, 9);
    st.glycogenMmol = 0;
    expect(glycogenFactor(st)).toBe(0);
    expect(anaerobicFactor(st, 7.4)).toBe(0);
  });

  it('the flux spends glycogen and the heat is the flux × 98 J/mmol', () => {
    const st = createMuscle(80, false);
    const g0 = st.glycogenMmol;
    const x = quiet(7.4, 400); // 400 mL O2/min of unmet demand
    stepMuscle(st, { ...x, factor: anaerobicFactor(st, 7.4) }, 60);
    const lac = K_ANAER * 400;
    expect(st.lacMmolMin).toBeCloseTo(lac, 9);
    expect(st.anaerW).toBeCloseTo((lac * GLYCOLYSIS_HEAT_J_PER_MMOL) / 60, 9);
    expect(g0 - st.glycogenMmol).toBeCloseTo(lac / LACTATE_PER_GLUCOSYL - (1.5 * st.massKg) / 60, 6); // minus one minute of refill
  });

  it('a falling pH closes the flux and its heat: the same deficit makes less lactate and less heat', () => {
    const st = createMuscle(80, false);
    const run = (ph: number) => {
      stepMuscle(st, { ...quiet(ph, 400), factor: anaerobicFactor(st, ph) }, 1);
      return { lac: st.lacMmolMin, w: st.anaerW, unpaid: st.unpaidMlMin };
    };
    const a = run(7.4);
    const b = run(7.0);
    const c = run(6.7);
    expect(b.lac).toBeLessThan(0.75 * a.lac); // plasma 7.0 → pHi 6.68: 0.70 of the resting yield
    expect(c.lac).toBeLessThan(0.25 * b.lac); // plasma 6.7 → pHi 6.38: 0.10
    expect(c.w).toBeLessThan(b.w);
    expect(c.unpaid).toBeGreaterThan(b.unpaid); // what glycolysis cannot pay for is the injury's drive
  });
});

describe('E134 muscle: injury and its potassium', () => {
  /** `min` minutes at a constant unpaid ATP rate `unpaidFrac` of the muscle's resting bill, at `tempC`. */
  const soak = (min: number, unpaidFrac: number, tempC = 37) => {
    const st = createMuscle(80, false);
    const rest = MUSCLE_REST_VO2_FRAC * VO2_REST;
    let k = 0;
    for (let s = 0; s < min * 60; s++) {
      // a deficit the brake cannot cover at all (factor 0): the unpaid ATP is the deficit itself
      k += stepMuscle(st, { ph: 7.4, tempC, deficitMlMin: unpaidFrac * rest, factor: 0, activityMlMin: 0, restVo2MlMin: VO2_REST, demandMlMin: rest }, 1);
    }
    return { st, k };
  };

  it('ten minutes with no ATP supply injures nothing (muscle tolerates about three hours of warm ischaemia)', () => {
    const { st, k } = soak(10, 1);
    expect(st.doseMin).toBeCloseTo(10, 1);
    expect(st.injured).toBe(0);
    expect(k).toBe(0);
  });

  it('necrosis begins at the tolerance dose and is complete at the full dose', () => {
    expect(soak(INJ_TOL_DOSE_MIN - 1, 1).st.injured).toBe(0);
    const mid = soak((INJ_TOL_DOSE_MIN + INJ_FULL_DOSE_MIN) / 2, 1).st;
    expect(mid.injured).toBeCloseTo(0.5, 2);
    expect(soak(INJ_FULL_DOSE_MIN + 10, 1).st.injured).toBe(1);
  });

  it('necrosis hands the muscle potassium to the pool: 100 mmol per kg of necrotic muscle, and CK/myoglobin/phosphate as state', () => {
    const { st, k } = soak(INJ_TOL_DOSE_MIN + 90, 1);
    expect(k).toBeCloseTo(st.injured * st.massKg * MUSCLE_K_MMOL_PER_KG, 6);
    expect(k).toBeGreaterThan(100);
    expect(st.release.ckU).toBeGreaterThan(0);
    expect(st.release.mbMg).toBeGreaterThan(0);
    expect(st.release.piMmol).toBeGreaterThan(0);
    expect(st.kHandedMmol).toBeCloseTo(st.release.kMmol, 9);
    // a second pass hands nothing twice
    expect(stepMuscle(st, { ph: 7.4, tempC: 37, deficitMlMin: 0, factor: 1, activityMlMin: 0, restVo2MlMin: VO2_REST, demandMlMin: 280 }, 1)).toBe(0);
  });

  it('injured muscle makes no lactate (the factor carries the surviving mass)', () => {
    const { st } = soak((INJ_TOL_DOSE_MIN + INJ_FULL_DOSE_MIN) / 2, 1);
    expect(anaerobicFactor(st, 7.4)).toBeCloseTo(1 - st.injured, 6);
  });

  it('the thermal dose consumes the same tolerance: 11 CEM43 minutes alone reach it, and a fever of 39 °C for two hours does not', () => {
    const hot = soak(CEM43_MUSCLE_MIN * 4, 0, 41); // 41 °C: R^(43−T) = 0.25² = 1/16 per minute
    expect(hot.st.cem43Min).toBeCloseTo((CEM43_MUSCLE_MIN * 4) / 16, 3);
    expect(hot.st.injured).toBe(0);
    const hotter = soak(CEM43_MUSCLE_MIN * 20, 0, 41);
    expect(hotter.st.cem43Min).toBeGreaterThan(CEM43_MUSCLE_MIN);
    expect(hotter.st.injured).toBeGreaterThan(0);
    const fever = soak(120, 0, 39);
    expect(fever.st.cem43Min).toBeLessThan(CEM43_MUSCLE_MIN);
    expect(fever.st.injured).toBe(0);
  });

  it('active muscle shifts the K set point with its activity, and necrotic muscle no longer does', () => {
    const st = createMuscle(80, false);
    expect(muscleActivityKShift(st, 0, VO2_REST)).toBe(0);
    expect(muscleActivityKShift(st, 1.5 * VO2_REST, VO2_REST)).toBeCloseTo(1.5 * K_ACT_PER_VO2X, 9);
    st.injured = 0.5;
    expect(muscleActivityKShift(st, 1.5 * VO2_REST, VO2_REST)).toBeCloseTo(0.75 * K_ACT_PER_VO2X, 9);
  });
});
