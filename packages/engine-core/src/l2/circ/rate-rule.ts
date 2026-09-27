// FU-2 (NR-7g-5, G7g): who owns the ventricular rate in MODELED mode. Only the sinus node answers to the
// circulation's HR set point (baroreflex, chemoreflex, drugs); every other pacemaker — ectopic atrial foci, the AF
// junction, re-entry circuits, junctional and ventricular foci, escape rhythms, pacemakers — keeps its own rate and
// the circulation follows IT. Two bounded exceptions: in AF the reflex modulates AV-nodal conduction, so the
// ventricular response moves with sympathetic/vagal tone by a bounded fraction; an atrial-sensing pacemaker (AAI,
// DDD) is inhibited when the intrinsic sinus runs faster than its lower rate, so the reflex can raise the rate above
// the programmed lower rate but never pull it below. An explicit instructor rate on a sinus-family rhythm overrides
// the reflex exactly as in MANUAL until a sinus-family rhythm is set without a rate.
import { rampValue, type RampState } from '../../l1/ramp.ts';
import { RHYTHMS } from '../ecg/rhythms.ts';
import type { RhythmId } from '../../types.ts';
import type { CircModelState } from './model.ts';

const IDS = Object.keys(RHYTHMS) as RhythmId[];
/** Rhythms whose rate is the sinus node's, which the circulation's HR set point drives — DERIVED from the rhythm
 * library (sinus atria whose rate the hr ramp drives): the sinus rhythms, sinus pause, WPW in sinus and the AV blocks
 * with a conducted sinus rate (1st degree, Mobitz I/II, 2:1, high grade). Complete block is not in it: its hr drives
 * the escape focus (rateDrives 'escape'). */
export const SINUS_FAMILY: ReadonlySet<string> = new Set(IDS.filter((id) => RHYTHMS[id].atria === 'sinus' && RHYTHMS[id].rateDrives === 'sinus'));
/** Atrial-sensing pacemakers (AAI, DDD): the rate is max(programmed lower rate, the reflex's sinus rate). */
export const PACER_SENSING: ReadonlySet<string> = new Set(IDS.filter((id) => RHYTHMS[id].pacing === 'AAI' || RHYTHMS[id].pacing === 'DDD'));
/** Rhythms whose ventricular response the reflex modulates through AV-nodal conduction. Flutter conducts at a
 * fixed ratio (a discrete 2:1 → 4:1 change is not a bounded modulation), so it is not listed. */
export const AV_MODULATED: ReadonlySet<string> = new Set(['afib']);
/** Largest fractional change of the AF ventricular response the reflex can cause [ENG, calibration pass R44]. */
export const AV_MOD_MAX = 0.1;
/** AV-nodal share of the sinus node's autonomic rate change (the node's conduction is less tone-sensitive than the
 * sinus node's automaticity) [ENG, calibration pass R44]. */
export const AV_GAIN = 0.25;

/**
 * The rate to hold for a rhythm just set: null hands a sinus-family rate to the reflex (no explicit rate);
 * otherwise the ramp the instructor or the rhythm set (the base of an AF response, a pacer's lower rate, the rate of
 * a focus).
 */
export function heldRate(rhythmId: string, explicit: boolean, hr: RampState): RampState | null {
  return SINUS_FAMILY.has(rhythmId) && !explicit ? null : { ...hr };
}

/** The rate MODELED mode asks the rhythm engine for at time t, or null when the rhythm's own rate stands. */
export function modeledHrRequest(m: CircModelState, rhythmId: string, t: number): number | null {
  if (SINUS_FAMILY.has(rhythmId)) return m.hrSet ? null : m.hrModel;
  if (!m.hrSet) return null; // entered by a mode switch with no rate on record: the rhythm's own rate stands
  if (PACER_SENSING.has(rhythmId)) return Math.max(rampValue(m.hrSet, t), m.hrModel);
  if (AV_MODULATED.has(rhythmId)) {
    const drive = Math.min(1 + AV_MOD_MAX, Math.max(1 - AV_MOD_MAX, 1 + AV_GAIN * (m.hrModel / m.prof.hrRest - 1)));
    return rampValue(m.hrSet, t) * drive;
  }
  return null;
}
