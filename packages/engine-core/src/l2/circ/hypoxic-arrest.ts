// FU-3 item 16: asphyxial (hypoxaemic) arrest in MODELED mode. The coronary step (coronary.ts) carries the arterial
// O2 content in the myocardial O2 supply and keeps `cor.hyp`, the hypoxaemic share of the supply deficit; the control
// layer (model.ts) turns it into sinus-node depression and a global contractility loss. What emerges is the sequence
// of the asphyxia models — early tachycardia and hypertension, then bradycardia and hypotension, then loss of aortic
// pulsations with the ECG still organised (DeBehnke 1995 [P]; Varvarousi 2011, 2015 [P]). This module declares the
// arrest once the hypoxic depression leaves the heart unable to eject (HYP_ARREST), and picks its rhythm. MANUAL never
// calls it (the instructor owns the rhythm there). The carotid-chemoreflex bradycardia below SaO2 60 % is the existing
// chemoFactors rule (model.ts, tables §1.1); the direct SA-node depression adds to it through cor.hyp.
// The beats alone never make the declaration: at a vanishing contractility the lumped ventricle (active and passive
// elastances blended by the activation) still moves ≈ 1 L/min against a reflex-raised filling pressure, so "loss of
// aortic pulsations" is reached through the myocardial state, not the pressure.
import type { RhythmId, RhythmOpts } from '../../types.ts';
import { SINUS_FAMILY } from './rate-rule.ts';
import type { CircModelState } from './model.ts';

/**
 * The hypoxic myocardial depression (cor.hyp) at which the heart no longer ejects and the arrest is declared:
 * contractility ≤ 10 % of rest (kHyp = 1 − hyp) — electromechanical dissociation [ENG]. The timing is TAU_HYP_S's fit.
 */
export const HYP_ARREST = 0.9;
/**
 * Rhythm at the onset of an asphyxial arrest. Swine (Varvarousi 2015, n = 30): PEA 21, VF 7, asystole 2 [P]; humans
 * with airway-obstruction arrest (Tokyo 2017–2019, n = 1,352): 1.7 % shockable at EMS contact [P]. VF 0.1 lies between
 * the two [ENG: the swine onset rate is for a VF-prone species, the human rate is minutes after the onset]; asystole
 * 2/30 [P, swine]; the rest is a bradycardic PEA (the organised rhythm continues, pulseless).
 */
export const P_VF_ONSET = 0.1;
export const P_ASYSTOLE_ONSET = 2 / 30;

/**
 * The rhythm the circulation asks for at this 1 Hz step, or null. `u` is one uniform draw (the engine's outcome
 * stream), taken only when the arrest is declared, so runs without an arrest keep every stream untouched.
 */
export function hypoxicArrestRequest(
  m: CircModelState, rhythmId: string, pulseless: boolean, hrNow: number, u: () => number,
): { id: RhythmId; opts: RhythmOpts } | null {
  if (pulseless || !SINUS_FAMILY.has(rhythmId) || m.cor.hyp < HYP_ARREST) return null;
  const x = u();
  if (x < P_VF_ONSET) return { id: 'vfCoarse', opts: {} };
  if (x < P_VF_ONSET + P_ASYSTOLE_ONSET) return { id: 'asystole', opts: {} };
  return { id: rhythmId as RhythmId, opts: { pulseless: true, rateBpm: Math.round(hrNow) } };
}
