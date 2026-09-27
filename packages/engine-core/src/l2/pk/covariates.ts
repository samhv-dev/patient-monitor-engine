// Patient covariates for the published PK models (Stage 7g). Every formula is the model author's own — a ke0 or a
// body-size scalar belongs to the model it was fitted with (tables §6 "Rule for a ke0").

export interface PkPatient {
  ageY: number;
  weightKg: number;
  heightCm: number;
  sex: 'm' | 'f';
  /** postmenstrual age in weeks (Eleveld maturation); default ageY·52.143 + 40 (term birth) */
  pmaWeeks?: number;
  /** plasma cholinesterase phenotype (succinylcholine, mivacurium); default 'normal' (tables §5d Lee 2009) */
  pche?: 'normal' | 'het' | 'hom';
}

export const DEFAULT_PK_PATIENT: PkPatient = { ageY: 40, weightKg: 70, heightCm: 170, sex: 'm' };

export const bmi = (p: PkPatient): number => p.weightKg / (p.heightCm / 100) ** 2;

/** James (1976) lean body mass, as Schnider 1998 and Minto 1997 used it (kg; height in cm). */
export function lbmJames(p: PkPatient): number {
  const r = p.weightKg / p.heightCm;
  return p.sex === 'm' ? 1.1 * p.weightKg - 128 * r * r : 1.07 * p.weightKg - 148 * r * r;
}

/** Al-Sallami (2015) fat-free mass, as Eleveld 2018 used it (kg). */
export function ffmAlSallami(p: PkPatient): number {
  const b = bmi(p);
  if (p.sex === 'm') return (0.88 + (1 - 0.88) / (1 + (p.ageY / 13.4) ** -12.7)) * ((9270 * p.weightKg) / (6680 + 216 * b));
  return (1.11 + (1 - 1.11) / (1 + (p.ageY / 7.1) ** -1.1)) * ((9270 * p.weightKg) / (8780 + 244 * b));
}
