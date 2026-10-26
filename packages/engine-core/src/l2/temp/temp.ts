// The heat model lives in `l2/thermal/**` (tables §5c, annex B3). This file keeps the older public names so
// its importers (resp pipeline, L3 temperature numerics, their tests) are unchanged.
import { createThermal, setCoreTarget, stepThermal, type ThermalInputs, type ThermalState } from '../thermal/heat.ts';

export {
  AMBIENT_C, CORE_FRACTION, GA_KCP, GA_M, HEAT_CAP_J_KG_C, M_AWAKE_W_70, MH_ONSET_S, NEURAXIAL_H,
  NEURAXIAL_KCP, PERIPH_GRADIENT_C, SENSOR_TAU_S, VASOCONSTRICT_C, VASOCONSTRICT_KCP,
} from '../thermal/params.ts';
export { SITES, setCoreTarget } from '../thermal/heat.ts';

export type TempState = ThermalState;

export function createTemp(tCore: number, effKg: number): TempState {
  return createThermal(tCore, effKg);
}

export function stepTemp(st: TempState, t: number, dtS: number, x: ThermalInputs = {}): void {
  stepThermal(st, t, dtS, x);
}
