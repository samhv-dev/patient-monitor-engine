// Stage V (R27 ventilator link): additive VentFrame fields, in their own file so Stage 3's types stay untouched.
// Both are optional: a Stage 3 frame is still a valid frame and behaves exactly as before.
import type { VentFrame } from './types-resp.ts';

export type VentFrameExt = VentFrame & {
  /**
   * Alveolar pressure (cmH2O). When present, the drive's pressure history (mean for the venous-return coupling,
   * swing for u(t)) uses it instead of Paw: intrinsic PEEP raises mean ALVEOLAR pressure but not mean airway
   * pressure, and u(t)'s reference (U_REF_CMH2O) is an alveolar swing.
   */
  palvCmH2O?: number;
  /** Ventilator mode name (R27 "mode"): carried for logs/controllers, not used by the physiology. */
  mode?: string;
};

/** The pressure the drive integrates: alveolar when the ventilator sends it, else airway. */
export const framePressure = (f: VentFrameExt): number => f.palvCmH2O ?? f.pawCmH2O;
