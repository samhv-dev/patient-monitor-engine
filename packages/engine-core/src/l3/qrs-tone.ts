// Whether a detected QRS sounds the QRS tone. In ventricular fibrillation the beat detector still finds waves, but the
// tone follows them only while the fibrillation is coarse and the monitor's VF call (the VFIB alarm) does not stand.
import { vfCalled } from './alarms/conditions.ts';

/**
 * `vfSince`: when the monitor's VF analysis began (null: not VF); `fine`: the fibrillation's amplitude is below the
 * rhythm library's coarse/fine boundary (`FINE_MV`), the generator's own flag standing in for the monitor's amplitude
 * analysis of the displayed lead [ENG: device]; `refT`: the detected R.
 */
export const qrsToneSounds = (vfSince: number | null, fine: boolean, refT: number): boolean =>
  vfSince === null || (!fine && !vfCalled(vfSince, refT));
