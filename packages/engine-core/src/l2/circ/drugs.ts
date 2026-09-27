// Bolus drug effect curves for the drugs the demo offers in 7a (tables §6.2–§6.3; B §4.9 "Drug effect"). 7g replaces
// these with PK + effect-site models; until then each bolus is a Bateman curve on the mechanism multipliers,
//   E(t) = Emax·(e^{−t/τoff} − e^{−t/τon}) / peak   (peak-normalised, so Emax is the effect at the peak),
// scaled by dose/refDose (capped at 2× the reference effect), and repeated boluses add (tachyphylaxis for ephedrine
// × 0.7 per repeat). Effects on the same multiplier combine MULTIPLICATIVELY (audit A11); no drug ever moves the
// baroreflex set point (A11) — reflex bradycardia to phenylephrine is emergent.
export type DrugId = 'phenylephrine' | 'ephedrine' | 'nitroglycerin' | 'esmolol' | 'propofol';

export interface DrugEffect {
  hr: number; // × on the HR set point
  ees: number; // × on LV and RV Emax
  svr: number; // × on systemic resistance
  v0Frac: number; // + fraction of blood volume moved INTO the venous unstressed pool (+ = venodilation)
  pvr: number; // × on PVR
  gv: number; // × on the vagal and sympathetic reflex gains
  gvHr: number; // × on the sympathetic HR arm only (propofol depresses the baroreflex HR response most: Cullen 1987)
}

interface DrugRow {
  refDose: number; // mg for mg-dosed drugs, mg/kg for propofol/esmolol
  unit: 'mg' | 'mg/kg';
  tauOn: number;
  tauOff: number;
  peak: Omit<DrugEffect, 'gv' | 'gvHr'> & { gv?: number; gvHr?: number }; // relative change at the peak of the reference dose (× − 1 or + frac)
  betaMediated?: boolean; // hr/ees part is β-mediated (blunted by β-blockade)
  tachyphylaxis?: number;
}

/** Peak effects at the reference dose (tables §6.2/§6.3; [ENG] where marked there). */
export const DRUGS: Record<DrugId, DrugRow> = {
  // phenylephrine 100 µg: SVR ×1.7 at peak [ENG, refitted to MAP +15–25 against the emergent reflex: prototype ×1.8, ×1.7 after the R45(b) reflex/Zc changes; tables said ×1.35], V −3 %, PVR ×1.1; onset 30–60 s, peak 1–2 min
  phenylephrine: { refDose: 0.1, unit: 'mg', tauOn: 30, tauOff: 300, peak: { hr: 0, ees: 0, svr: 0.7, v0Frac: -0.03, pvr: 0.1 } },
  // ephedrine 10 mg: HR +12 %, contractility +18 %, SVR +12 %, V −3 %; peak 4–5 min, ~1 h; tachyphylaxis ×0.7
  ephedrine: { refDose: 10, unit: 'mg', tauOn: 90, tauOff: 1800, peak: { hr: 0.12, ees: 0.18, svr: 0.12, v0Frac: -0.03, pvr: 0 }, betaMediated: true, tachyphylaxis: 0.7 },
  // nitroglycerin 100 µg bolus: venous +10 % of V, SVR ×0.9, PVR ×0.8; onset 1–2 min, 5–10 min
  nitroglycerin: { refDose: 0.1, unit: 'mg', tauOn: 20, tauOff: 240, peak: { hr: 0, ees: 0, svr: -0.1, v0Frac: 0.1, pvr: -0.2 } },
  // esmolol 0.5 mg/kg: HR −20 %, contractility −15 %; t½ 9 min
  esmolol: { refDose: 0.5, unit: 'mg/kg', tauOn: 30, tauOff: 540, peak: { hr: -0.2, ees: -0.15, svr: 0, v0Frac: 0, pvr: 0 } },
  // propofol 2 mg/kg: tables §6.3 row at E = 0.9 (the upper end of E = Ce/(Ce + 3.5) after 2 mg/kg): SVR ×(1 − 0.45E),
  // Ees ×(1 − 0.2E), V0 +8 %·E, reflex ×(1 − 0.6E); plus the sympathetic HR arm ×0.3 at peak (tables "HR ~/↓";
  // propofol depresses the baroreflex HR response most, Cullen 1987) [ENG, fitted in Task 24 to brief sanity check 3:
  // the prototype's E 0.6 row gave MAP 88 % and HR +33 against the R45(b) reflexes]
  propofol: { refDose: 2, unit: 'mg/kg', tauOn: 40, tauOff: 420, peak: { hr: 0, ees: -0.18, svr: -0.405, v0Frac: 0.072, pvr: 0, gv: -0.54, gvHr: -0.7 } },
};

export interface Bolus {
  drug: DrugId;
  t: number; // given at
  scale: number; // dose/refDose × tachyphylaxis
}

export function bolusScale(drug: DrugId, doseMg: number, weightKg: number, previous: readonly Bolus[]): number {
  const row = DRUGS[drug];
  const dose = row.unit === 'mg/kg' ? doseMg / weightKg : doseMg;
  const n = previous.filter((b) => b.drug === drug).length;
  return Math.min(2, dose / row.refDose) * (row.tachyphylaxis ?? 1) ** n; // Stage 7g: age sensitivity lives in the Eleveld models (l2/pk)
}

function bateman(t: number, on: number, off: number): number {
  if (t <= 0) return 0;
  const tp = (Math.log(off / on) * on * off) / (off - on);
  const pk = Math.exp(-tp / off) - Math.exp(-tp / on);
  return (Math.exp(-t / off) - Math.exp(-t / on)) / pk;
}

/** Combined multipliers of every bolus at time t (β-mediated parts × (1 − betaBlock)). */
export function drugEffect(list: readonly Bolus[], t: number, betaBlock: number): DrugEffect {
  const e: DrugEffect = { hr: 1, ees: 1, svr: 1, v0Frac: 0, pvr: 1, gv: 1, gvHr: 1 };
  for (const b of list) {
    const row = DRUGS[b.drug];
    const k = b.scale * bateman(t - b.t, row.tauOn, row.tauOff);
    if (k === 0) continue;
    const bb = row.betaMediated ? 1 - betaBlock : 1;
    e.hr *= 1 + row.peak.hr * k * bb;
    e.ees *= 1 + row.peak.ees * k * bb;
    e.svr *= 1 + row.peak.svr * k;
    e.v0Frac += row.peak.v0Frac * k;
    e.pvr *= 1 + row.peak.pvr * k;
    e.gv *= 1 + (row.peak.gv ?? 0) * k;
    e.gvHr *= 1 + (row.peak.gvHr ?? 0) * k;
  }
  return e;
}

/** Drop boluses whose effect is below 0.1 % (t > 7 τoff). */
export function pruneBoluses(list: Bolus[], t: number): Bolus[] {
  return list.filter((b) => t - b.t < 7 * DRUGS[b.drug].tauOff);
}
