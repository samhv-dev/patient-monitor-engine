// Thyroid profiles and thyroid storm (tables §5c `hyperthyroid`; Klein 2007 [TXT]). Pulse has no thyroid (annex §5c).
// A profile state (normal / hypo / hyper) sets resting multipliers; the `thyroidStorm` condition (severity 0–1, set
// by the scenario, smoothed in core.ts) adds the storm on top: HR 110–150, Ees × 1.3, SVR × 0.6, VO2 × 1.3–1.8,
// core 38.5–41 °C (set point + heat), β-agonist sensitivity × 1.5. Pure.
export type ThyroidState = 'normal' | 'hypo' | 'hyper';

export interface ThyroidEffects {
  hrF: number;
  eesF: number;
  svrF: number;
  vo2F: number; // also the heat multiplier (BMR)
  setShiftC: number;
  betaSens: number; // × on the β effects of stress (the EXCESS over 1)
}

const ROW: Record<ThyroidState, ThyroidEffects> = {
  normal: { hrF: 1, eesF: 1, svrF: 1, vo2F: 1, setShiftC: 0, betaSens: 1 },
  hyper: { hrF: 1.35, eesF: 1.2, svrF: 0.75, vo2F: 1.3, setShiftC: 0.3, betaSens: 1.3 }, // HR ≈ 100 at rest [TXT]
  hypo: { hrF: 0.8, eesF: 0.85, svrF: 1.2, vo2F: 0.8, setShiftC: -0.4, betaSens: 0.8 }, // [TXT] brady, low BMR, ↑SVR
};
const STORM: ThyroidEffects = { hrF: 1.8, eesF: 1.3, svrF: 0.6, vo2F: 1.4, setShiftC: 1.8, betaSens: 1.5 }; // → HR ≈ 135, VO2 ≈ × 1.55 with Q10, T ≈ 38.7

export function thyroidEffects(state: ThyroidState, storm: number): ThyroidEffects {
  const r = ROW[state];
  const s = Math.min(1, Math.max(0, storm));
  const mix = (a: number, b: number) => a * (1 + (b - 1) * s);
  return {
    hrF: mix(r.hrF, STORM.hrF / Math.max(1, r.hrF)),
    eesF: mix(r.eesF, STORM.eesF),
    svrF: mix(r.svrF, STORM.svrF),
    vo2F: mix(r.vo2F, STORM.vo2F),
    setShiftC: r.setShiftC + STORM.setShiftC * s,
    betaSens: mix(r.betaSens, STORM.betaSens),
  };
}
