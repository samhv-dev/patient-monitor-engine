// Stage 7e: the Stage 3 heat model now lives in `l2/thermal/**` (tables §5c, annex B3). This file keeps Stage 3's
// public names so its importers (resp pipeline, L3 temperature numerics, the Stage 3 tests) are unchanged.
import { mhActivity } from '../thermal/mh.ts';
import { MH_HEAT_X } from '../thermal/params.ts';
import { createThermal, setCoreTarget, stepThermal, type ThermalState } from '../thermal/heat.ts';

export {
  AMBIENT_C, CORE_FRACTION, GA_KCP, GA_M, HEAT_CAP_J_KG_C, M_AWAKE_W_70, MH_ONSET_S, MH_VCO2_FACTOR, NEURAXIAL_H,
  NEURAXIAL_KCP, PERIPH_GRADIENT_C, SENSOR_TAU_S, VASOCONSTRICT_C, VASOCONSTRICT_KCP,
} from '../thermal/params.ts';
export { SITES, setCoreTarget } from '../thermal/heat.ts';

/** Stage 3 name: MH heat multiplier at activity 1 (heat = m0·(factor − 1)·activity). */
export const MH_MAX_FACTOR = 1 + MH_HEAT_X;
export type TempState = ThermalState;

export function createTemp(tCore: number, effKg: number): TempState {
  return createThermal(tCore, effKg);
}

export function stepTemp(st: TempState, t: number, dtS: number): void {
  stepThermal(st, t, dtS);
}

/** MH multiplier at time t (1 when absent): heat by default, `max` = MH_VCO2_FACTOR for CO2 production. */
export function mhFactor(st: TempState, t: number, max = MH_MAX_FACTOR): number {
  return 1 + (max - 1) * mhActivity(st.mh, t);
}
