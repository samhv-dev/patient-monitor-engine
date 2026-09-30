// Drug library I (Stage 7g Task 12): hypnotics, opioids, benzodiazepines, α2 agonist, volatiles. DATA only.
// Sources: tables §6.1/§6.3 (T6.x), research 03 §8.6 (R03), Miller 10e (M10 ch. N p. M), labels, papers as named.
import { FENTANYL_KE0, SUFENTANIL_KE0 } from '../models.ts';
import { ELEVELD_CE50_AGE_K, FENT_VENT_REMI_EQ } from '../pd.ts';
import type { DrugRow, PdEffect } from '../row.ts';

/**
 * Opioid haemodynamic EC50s [ENG]: tables §6.3 give only the size (HR −10–20 %, SVR −5–15 %) with no concentration.
 * Each EC50 is the typical clinical Ce (remifentanil 3 ng/mL), scaled by the tables' §5d potency (fentanyl 1.6×
 * → 2 ng/mL; sufentanil 12× [ENG, Q59] → 0.25), so a usual dose gives half of Emax −0.25/−0.15: HR −12.5 %,
 * SVR −7.5 % — mid-band of T6.3. Calibration items for Ali (R44); no primary source.
 */
const OPIOID_HEMO_SRC = 'haemodynamic EC50 [ENG]: typical clinical Ce ÷ T5d potency, sized to T6.3';

const gammaPk = (refDose: number, perKg: boolean, tpS: number, t10S: number, refRate?: number, tauOnS?: number, tauOffS?: number): DrugRow['pk'] => ({
  kind: 'gamma', refDose, perKg, tpS, t10S, ...(refRate !== undefined ? { refRate, tauOnS: tauOnS ?? 300, tauOffS: tauOffS ?? 600 } : {}),
});

/**
 * Volatile depression of the sympathetic HR arm of the baroreflex (7a `gvHr`, the term propofol's row carries), per MAC,
 * linear: HR arm ×(1 − 1.0·MAC) → gone by 1 MAC (combine floor 0.05). Direction: Kotrly 1984 (isoflurane: pressor
 * baroslope falls progressively to 1.0 and 1.5 MAC), Muzi & Ebert 1995 (cardiac baroslopes equally diminished with
 * isoflurane and desflurane). Size [ENG], fit target: Ebert, Muzi & Lopatka 1995 — sevoflurane 0.41–1.24 MAC lowers
 * MAP with NO change in HR and lower sympathetic nerve activity (tables T6.3 "HR ~"); the rig's HR at 0.96 MAC is
 * 75 vs 73 awake (was 93.5 with `gv` alone). Cross-check: the phenylephrine reflex HR drop falls to ≈ 0.4× awake,
 * Nagasaki 2001 (sevoflurane 2 % / isoflurane 1.3 %: pressor BRS −50–60 %). FU-3 item 3 (R-7f-9).
 */
const VOLATILE_GVHR: PdEffect = { target: 'gvHr', emax: -1, ec50: 1, linear: true };

/**
 * FU-6 R13 (E-FU6-1): volatile inhibition of hypoxic pulmonary vasoconstriction, 0.2 per MAC, linear — the sevoflurane
 * row's value (Miller 10e ch. 49 p. 1538; catalogue §22: < 1 MAC inhibits HPV by ≈ 20 %; Slinger & Campos, Miller
 * thoracic chapter), now on isoflurane and desflurane too.
 */
const VOLATILE_HPV: PdEffect = { target: 'hpvInhibit', emax: 0.2, ec50: 1, linear: true };
/**
 * FU-4 G2: central sympatholysis — × on the DELIVERED sympathetic output (7a stepBaro `outF`, after the reflex
 * saturation). Propofol near-abolishes MSNA at induction and inhibits it dose-dependently (Ebert 1992, Anesthesiology
 * 76:725; Sellgren 1994, 80:534; Robinson 1997, 86:64; Ebert 2005, 103:20) [P direction]; size [ENG], fit targets:
 * healthy 2 mg/kg MAP −25 to −40 % with HR ±10 (M10 ch. 21 p. 519) — Ce 3 µg/mL leaves 10 % of the output, Ce 1.5
 * leaves 31 %. The set point resets toward lower pressure with it (Sellgren 1994) [ENG size −15 % at full effect].
 */
export const PROPOFOL_SYMP: PdEffect = { target: 'symp', emax: -1, ec50: 1.0, hill: 2 };
export const PROPOFOL_SETF: PdEffect = { target: 'setF', emax: -0.15, ec50: 1.0, hill: 2 };
/**
 * FU-4 G7/F10: opioid VAGOTONIA. A large opioid bolus causes bradycardia through a central vagal (nucleus
 * ambiguus/vagal nucleus) mechanism, not through a negative chronotropic action on the node — which is why atropine or
 * glycopyrrolate abolishes it and why it is worse in a patient with high resting vagal tone (M10 ch. 22: opioids cause
 * a centrally mediated bradycardia; Reitan 1978 for fentanyl's vagal mechanism) [P direction, ENG size].
 * Units: `ec50` is the drug's own effect-site concentration in ng/mL, as the other opioid rows use; `emax` is
 * milliseconds added to the cycle length at full effect.
 * Fit target: fentanyl 10 µg/kg → HR into the 40s–50s without an anticholinergic (before: 74 → 68).
 */
export const FENTANYL_VAGAL: PdEffect = { target: 'vagalMs', emax: Number(globalThis.process?.env?.PME_VAG_EMAX ?? 420), ec50: Number(globalThis.process?.env?.PME_VAG_F ?? 4) };
export const REMIFENTANIL_VAGAL: PdEffect = { target: 'vagalMs', emax: Number(globalThis.process?.env?.PME_VAG_EMAX ?? 420), ec50: Number(globalThis.process?.env?.PME_VAG_R ?? 6) };
export const SUFENTANIL_VAGAL: PdEffect = { target: 'vagalMs', emax: 420, ec50: 0.5 };
/** FU-4 G2: sevoflurane/isoflurane lower SNA with MAP and no HR change (Ebert, Muzi & Lopatka 1995, Anesthesiology 83:88) [ENG size, fit: 0.65 MAC MAP −10 to −20 %]. */
export const VOLATILE_SYMP: PdEffect = { target: 'symp', emax: -0.5, ec50: 1, linear: true };
export const VOLATILE_SETF: PdEffect = { target: 'setF', emax: -0.1, ec50: 1, linear: true };

export const ANAESTHETIC_ROWS: DrugRow[] = [
  {
    id: 'propofol', name: 'Propofol', cls: 'hypnotic', amountUnit: 'mg', pk: { kind: 'model', model: 'eleveld' },
    elim: { hepatic: 0.6, highExtraction: true }, flowDist: true, // FU-4 G10
    // T6.3: E = Ce/(Ce + 3.5): SVR ×(1 − 0.45E), Ees ×(1 − 0.2E), V0 +8 %·E, reflex ×(1 − 0.6E); gvHr −0.7 (7a fit, Cullen 1987) — refitted in Task 20
    pd: [
      { target: 'svr', emax: -0.45, ec50: 3.5 }, { target: 'ees', emax: -0.2, ec50: 3.5 }, { target: 'v0Frac', emax: 0.08, ec50: 3.5 },
      { target: 'gv', emax: -0.6, ec50: 3.5 }, { target: 'gvHr', emax: -0.7, ec50: 3.5 },
      PROPOFOL_SYMP, PROPOFOL_SETF, // FU-4 G2
    ],
    cns: { hypC50: 3.08, hypC50AgeK: ELEVELD_CE50_AGE_K, cmro2: 0.5 }, syringePerMl: 10, // T5d Ce50 3.08·e^(−0.00635(age − 35))
    doses: 'induction 1.5–2.5 mg/kg (ED50 LOC 1–1.5, M10 ch. 21 p. 516); TCI Ce 2–5 µg/mL; infusion 4–12 mg/kg/h',
    onset: 'TTPE 90–100 s (M10 ch. 21 p. 515); MAP −25–40 % after 2–2.5 mg/kg (p. 519)',
    ir: '?', src: 'Eleveld 2018 (PK; BIS Ce50 3.08 with the age term, T5d/Q53); T6.3; M10 ch. 21', tag: 'P',
  },
  {
    // FU-7 (D20; the first fixer's finding): t10S 2700 s — the effect falls by REDISTRIBUTION (distribution t½ 11–16 min,
    // M10 ch. 21 Table 21.1; emergence 10–20 min after 1–2 mg/kg), so 10 % of the peak is ≈ 3.3 × 13.5 min after it.
    // The 900 s it carried was the row's 10–15 min DURATION read as a 10 % time. tpS stays the sourced 1-min peak.
    id: 'ketamine', name: 'Ketamine', cls: 'ketamine', amountUnit: 'mg', pk: gammaPk(1.5, true, 60, 2700, 0.01, 300, 900),
    elim: { hepatic: 0.9, t12S: 9540 }, // FU-7 (H9): t½β 2.5–2.8 h (M10 ch. 21 Table 21.1)
    // FU-7 (addendum 20 / audit D9): ketamine's pressor effect is INDIRECT (central sympathetic drive), so it is blunted
    // by β-blockade and disappears when catecholamines are depleted (M10 ch. 21: the direct myocardial depression is then
    // unmasked); the DIRECT Ees −0.2 stays. [ENG size; fit target: MAP +15–25 % replete (T6.3) — prototype +8.7 % —
    // and a FALL in the catecholamine-depleted phase — prototype −0.5 %]
    pd: [{ target: 'sympDrive', emax: 2.2, ec50: 1 }, { target: 'ees', emax: -0.2, ec50: 1 }, { target: 'bronchodilation', emax: 1, ec50: 1 }, { target: 'cbfVaso', emax: 0.4, ec50: 1 }],
    // FU-7 (addendum 20): ketamine joins the ONE hypnotic-potency output. hypC50 0.8 reference doses [ENG]: 1.5 mg/kg
    // (c ≈ 1 at the peak) is an induction dose (M10 ch. 21 p. 536: plasma 0.7–2.2 µg/mL for hypnosis), so the
    // propofol-equivalent Ce at the peak ≈ 3.8 µg/mL. `dissociative` keeps the EEG/BIS behaviour and the airway
    // reflexes (D3); `ventShare` 0.3 = minimal respiratory depression (T6.3).
    cns: { hypC50: 0.8, dissociative: true, ventShare: 0.3 },
    doses: 'induction 1–2 mg/kg IV (M10 ch. 21 p. 536); analgesia 0.1–0.3 mg/kg; infusion 0.1–0.5 mg/kg/h',
    onset: 'onset 30–60 s, duration 10–15 min (R03 §8.6); plasma 0.7–2.2 µg/mL for hypnosis (M10 p. 536)',
    ir: '?', src: 'T6.3 (HR +15–20 %, SVR +15–25 % sympathetic; direct Ees ×0.9); M10 ch. 21', tag: 'TXT',
  },
  {
    id: 'etomidate', name: 'Etomidate', cls: 'hypnotic', amountUnit: 'mg', pk: gammaPk(0.3, true, 60, 480),
    elim: { hepatic: 0.8, t12S: 14760 }, // FU-7 (H9): t½β 2.9–5.3 h (M10 ch. 21 Table 21.1)
    pd: [{ target: 'svr', emax: -0.1, ec50: 1 }],
    // FU-7 (addendum 20): hypC50 0.55 reference doses [ENG], fitted to the awakening time (duration 3–5 min after
    // 0.3 mg/kg, M10 ch. 21 p. 541); at hypC50 1 the prototype woke the patient at 90 s. ventShare 0.7 (review F9)
    // [ENG; fit target: apnoea after 0.3 mg/kg is brief or absent, less than an equipotent thiopental/propofol dose —
    // M10 ch. 21 p. 541]. No hypC50AgeK (D19a): the elderly dose reduction is PHARMACOKINETIC (Arden 1986).
    cns: { hypC50: 0.55, cmro2: 0.4, ventShare: 0.7 },
    doses: 'induction 0.2–0.3 mg/kg (M10 ch. 21 p. 541)', onset: 'onset 30–60 s, duration 3–5 min; cortisol response ×0.5 for 24 h (T6.3)',
    ir: '?', src: 'T6.3 (MAP −0–10 %); M10 ch. 21 Table 21.1', tag: 'TXT',
  },
  {
    id: 'thiopental', name: 'Thiopental', cls: 'hypnotic', amountUnit: 'mg', pk: gammaPk(4, true, 45, 900),
    elim: { hepatic: 1, t12S: 43200 }, // FU-7 (H9): t½β 7–17 h (M10 ch. 21 Table 21.1)
    pd: [{ target: 'svr', emax: -0.4, ec50: 1 }, { target: 'ees', emax: -0.3, ec50: 1 }, { target: 'hr', emax: 0.24, ec50: 1 }, { target: 'v0Frac', emax: 0.16, ec50: 1 }, { target: 'gv', emax: -0.8, ec50: 1 }],
    // FU-7 (addendum 20): hypC50 0.55 reference doses [ENG], fitted to awakening 5–10 min after 4 mg/kg by
    // redistribution (M10 ch. 21 Table 21.1); at hypC50 1 the prototype woke the patient at 140 s. No hypC50AgeK
    // (D19a): the elderly need less thiopental because of a smaller initial distribution volume, with UNCHANGED brain
    // sensitivity (Homer & Stanski 1985); 7f's LOC scale already gives ≈ 0.71 × the dose at 80 y.
    cns: { hypC50: 0.55, cmro2: 0.55 },
    doses: 'induction 3–5 mg/kg', onset: 'onset 30 s, awakening 5–10 min (redistribution); t½ 7–17 h (M10 Table 21.1)',
    ir: '?', src: 'T6.3 (SVR −20 %, Ees −15 %, HR +10–15 %, V0 +8 %, reflex ×0.6)', tag: 'TXT',
  },
  {
    // FU-7 (review F7, ruling 6): tpS 240 s — peak effect 3–5 min, t½ke0 2–3 min (M10 ch. 21 p. 532); 180 s sat at the
    // fast edge and put the depth nadir 5 s before the 2–7 min band.
    id: 'midazolam', name: 'Midazolam', cls: 'benzodiazepine', amountUnit: 'mg', pk: gammaPk(0.05, true, 240, 3600, 0.001, 600, 1800),
    elim: { hepatic: 1, t12S: 7740 }, // FU-7 (H9): t½β 1.7–2.6 h (M10 ch. 21 Table 21.1); cirrhosis halves CL (MacGilchrist 1986)
    pd: [{ target: 'svr', emax: -0.24, ec50: 1 }, { target: 'v0Frac', emax: 0.06, ec50: 1 }, { target: 'gv', emax: -0.4, ec50: 1 }],
    // FU-7 (D19a; review F5): midazolam's age effect IS pharmacodynamic (increased brain sensitivity; M10 ch. 21: reduce
    // the dose 20–50 % in the elderly). hypC50AgeK 0.008 [ENG; fit target: LOC dose at 80 y ≈ 0.5 × the 35-y dose
    // through 7f's Schnider LOC scale — measured in "Prototype — second fixer"].
    cns: { midazEq: 1, hypC50: 4, hypC50AgeK: 0.008 },
    doses: 'sedation 0.02–0.05 mg/kg; induction 0.05–0.15 mg/kg (M10 ch. 21 Table 21.7)', onset: 'T½ke0 2–3 min (M10 ch. 21 p. 532); peak 3–5 min; duration 30–60 min',
    ir: '?', src: 'T6.3 (SVR −10–15 %, V0 +3 %, reflex ×0.8); M10 ch. 21', tag: 'TXT',
  },
  {
    id: 'dexmedetomidine', name: 'Dexmedetomidine', cls: 'alpha2', amountUnit: 'mcg', pk: gammaPk(1, true, 900, 7200, 0.5 / 60, 900, 1800),
    elim: { hepatic: 1, t12S: 9000 }, // FU-7 (H9): t½β 2–3 h (M10 ch. 21 Table 21.1)
    pd: [{ target: 'hr', emax: -0.3, ec50: 1 }, { target: 'svr', emax: -0.3, ec50: 1 }],
    doses: 'load 1 µg/kg over 10 min, then 0.2–0.7 µg/kg/h', onset: 'peak 15 min after the load; t½ 2–3 h (M10 Table 21.1)',
    ir: '?', src: 'T6.3 (HR −10–20 %, SVR −10–20 % after the biphasic load; the transient rise of a fast load is not modelled in v1)', tag: 'TXT',
  },
  {
    // vent site: tables give no fentanyl ventilatory ke0 → the brain ke0 [ENG] (deviations list)
    id: 'fentanyl', name: 'Fentanyl', cls: 'opioid', amountUnit: 'mcg', pk: { kind: 'model', model: 'shafer', ventKe0: FENTANYL_KE0 },
    // FU-7 (RH amendment, research/13 RH-15b): FU-4 G10's flow-dependent distribution, as propofol — haemorrhagic shock
    // shrinks fentanyl's central volume and clearance and ≈ doubles its concentrations (Egan 1999 Anesthesiology 91:156).
    elim: { hepatic: 1, highExtraction: true }, flowDist: true,
    pd: [{ target: 'hr', emax: -0.25, ec50: 2 }, { target: 'svr', emax: -0.15, ec50: 2 }, { target: 'v0Frac', emax: 0.03, ec50: 2 }, FENTANYL_VAGAL],
    // FU-7 (D16): EEG 1.6 (tables §5d), MAC reduction 0.8 (remifentanil 1.2 ≈ fentanyl 1.5 ng/mL, tables §5d — 7f's
    // `opioidFentEq` scale), ventilation 0.55 (D-7f-3; Bouillon 2003: ventilatory C50 ≈ 1.7 vs remifentanil 0.92)
    cns: { remiEq: 1.6, macRemiEq: 0.8, ventRemiEq: FENT_VENT_REMI_EQ }, syringePerMl: 50,
    doses: '1–3 µg/kg analgesia; 5–10 µg/kg blunting; plasma 15–30 ng/mL as sole agent (M10 ch. 22 Table 22.7)',
    onset: 'TTPE 3.6 min; CSHT rises steeply (M10 ch. 22 p. 588)',
    ir: '?', src: `Shafer 1990 PK; ke0 by TTPE (decision 2); T5d potency 1.6× remifentanil; ${OPIOID_HEMO_SRC}`, tag: 'VERIFY',
  },
  {
    // vent site ke0 0.92/min: Bouillon 2003 ventilatory ke0 (T5d "ke0 for CO2 0.92/min") [P]; R51 §2
    id: 'remifentanil', name: 'Remifentanil', cls: 'opioid', amountUnit: 'mcg', pk: { kind: 'model', model: 'minto', ventKe0: 0.92 },
    pd: [{ target: 'hr', emax: -0.25, ec50: 3 }, { target: 'svr', emax: -0.15, ec50: 3 }, { target: 'v0Frac', emax: 0.03, ec50: 3 }, REMIFENTANIL_VAGAL],
    cns: { remiEq: 1, ventRemiEq: 1 }, syringePerMl: 50, // FU-7 (D16, ruling 4): the ventilatory unit, PINNED at 1.0
    doses: '0.05–0.5 µg/kg/min; TCI Ce 2–8 ng/mL; bolus 0.5–1 µg/kg', onset: 'TTPE ≈ 1.4–1.6 min; CSHT ≈ 3 min, context-independent',
    ir: '?', src: `Minto 1997; Bouillon 2003 (ventilation C50 0.92, ke0 0.92); Kapila 1995; ${OPIOID_HEMO_SRC}`, tag: 'P',
  },
  {
    id: 'sufentanil', name: 'Sufentanil', cls: 'opioid', amountUnit: 'mcg', pk: { kind: 'model', model: 'gepts', ventKe0: SUFENTANIL_KE0 }, // vent = brain ke0 [ENG]
    elim: { hepatic: 1, highExtraction: true },
    pd: [{ target: 'hr', emax: -0.25, ec50: 0.25 }, { target: 'svr', emax: -0.15, ec50: 0.25 }, SUFENTANIL_VAGAL],
    // FU-7 (D16): ventilatory weight 5 [ENG; ≈ 9 × fentanyl's 0.55 — sufentanil's analgesic potency ratio to fentanyl,
    // M10 ch. 22; no ventilatory C50 source]. MAC weight = remiEq (7f's pre-FU-7 scale, unchanged).
    cns: { remiEq: 12, ventRemiEq: 5 }, syringePerMl: 5,
    doses: '0.1–0.5 µg/kg; plasma 5–10 ng/mL as sole agent (M10 Table 22.7)', onset: 'TTPE 5.6 min (Shafer & Varvel 1991)',
    ir: '?', src: `Gepts 1995 PK [VERIFY]; potency ×12 remifentanil [ENG, Q59]; ${OPIOID_HEMO_SRC}`, tag: 'VERIFY',
  },
  {
    id: 'morphine', name: 'Morphine', cls: 'opioid', amountUnit: 'mg', pk: gammaPk(0.1, true, 1200, 14400),
    elim: { hepatic: 0.9, renal: 0.1, t12S: 9000 }, // FU-7 (H9): t½β 1.7–3.3 h (M10 ch. 22 Table 22.6) [VERIFY]
    pd: [{ target: 'svr', emax: -0.2, ec50: 1 }, { target: 'histamine', emax: 0.6, ec50: 1 }],
    // FU-7 (D16): ventilatory weight 0.8 per 0.1 mg/kg reference dose [ENG; the row is in reference-dose units, fit
    // target: breathing depressed like the equianalgesic ≈ 1–1.5 µg/kg fentanyl (0.55 × ≈ 1.5 ng/mL), M10 ch. 22].
    cns: { remiEq: 1.5, ventRemiEq: 0.8 },
    doses: '0.05–0.15 mg/kg IV', onset: 'peak 15–30 min, duration 3–4 h (R03 §8.6); CL 15–30 mL/kg/min (M10 Table 22.6)',
    ir: '?', src: 'R03 §8.6; M10 ch. 22; remi-equivalent [ENG]', tag: 'TXT',
  },
  {
    id: 'sevoflurane', name: 'Sevoflurane', cls: 'volatile', amountUnit: 'mL', pk: { kind: 'volatile', agent: 'sevoflurane' },
    pd: [
      { target: 'svr', emax: -0.2, ec50: 1, linear: true }, { target: 'ees', emax: -0.1, ec50: 1, linear: true }, { target: 'v0Frac', emax: 0.03, ec50: 1, linear: true },
      { target: 'gv', emax: -0.3, ec50: 1, linear: true }, VOLATILE_GVHR, { target: 'bronchodilation', emax: 1, ec50: 0.5 }, { target: 'hpvInhibit', emax: 0.2, ec50: 1, linear: true },
      VOLATILE_SYMP, VOLATILE_SETF, // FU-4 G2
    ],
    cns: { cmro2PerMac: 0.25, cbfDirect: [0.04, 0.17] }, // FU-2 item 8: tables §5.1 (Matta 1999): CMRO2 ×(1 − 0.25·MAC), direct CBF +4 % / +17 % at 0.5 / 1.5 MAC
    doses: 'MAC 1.80 % at 40 y (Mapleson; label 2.1, Q52); maintenance 0.8–1.3 MAC', onset: 'FA/FI 0.85 at 30 min (Yasuda 1991); b/g 0.65 (M10 ch. 19 p. 427)',
    ir: '?', src: 'T6.3 (Malan 1995); T5d', tag: 'P',
  },
  {
    id: 'isoflurane', name: 'Isoflurane', cls: 'volatile', amountUnit: 'mL', pk: { kind: 'volatile', agent: 'isoflurane' },
    pd: [
      { target: 'svr', emax: -0.25, ec50: 1, linear: true }, { target: 'ees', emax: -0.1, ec50: 1, linear: true }, { target: 'hr', emax: 0.07, ec50: 1, linear: true },
      { target: 'v0Frac', emax: 0.03, ec50: 1, linear: true }, { target: 'gv', emax: -0.3, ec50: 1, linear: true }, VOLATILE_GVHR, { target: 'bronchodilation', emax: 1, ec50: 0.5 },
      VOLATILE_HPV, // FU-6 R13
      VOLATILE_SYMP, VOLATILE_SETF, // FU-4 G2
    ],
    cns: { cmro2PerMac: 0.3, cbfDirect: [0.19, 0.72] }, // FU-2 item 8: tables §5.1 (Matta 1999): CMRO2 ×(1 − 0.3·MAC), direct CBF +19 % / +72 % at 0.5 / 1.5 MAC
    doses: 'MAC 1.17 % at 40 y', onset: 'FA/FI 0.73 at 30 min; b/g 1.46', ir: '?', src: 'T6.3; Mapleson 1996; M10 ch. 19 p. 427', tag: 'TXT',
  },
  {
    id: 'desflurane', name: 'Desflurane', cls: 'volatile', amountUnit: 'mL', pk: { kind: 'volatile', agent: 'desflurane' },
    pd: [
      { target: 'svr', emax: -0.25, ec50: 1, linear: true }, { target: 'ees', emax: -0.1, ec50: 1, linear: true }, { target: 'hr', emax: 0.07, ec50: 1, linear: true },
      { target: 'v0Frac', emax: 0.03, ec50: 1, linear: true }, { target: 'gv', emax: -0.3, ec50: 1, linear: true }, VOLATILE_GVHR, { target: 'cbfVaso', emax: 0.3, ec50: 1, linear: true },
      VOLATILE_HPV, // FU-6 R13 (no bronchodilation row: desflurane irritates the airway above 1 MAC — Goff 2000 Anesthesiology 93:404)
    ],
    cns: { cmro2: 0.5 },
    doses: 'MAC 6.6 % at 40 y', onset: 'FA/FI 0.90 at 30 min; sympathetic surge on a rapid rise above 1 MAC (Task 15)', ir: '?', src: 'T6.3; Mapleson 1996', tag: 'TXT',
  },
  {
    id: 'n2o', name: 'Nitrous oxide', cls: 'volatile', amountUnit: 'mL', pk: { kind: 'volatile', agent: 'n2o' },
    pd: [{ target: 'svr', emax: 0.1, ec50: 1, linear: true }, { target: 'ees', emax: -0.1, ec50: 1, linear: true }, { target: 'pvr', emax: 0.4, ec50: 1, linear: true }],
    doses: '50–70 % of the fresh gas; MAC 104 %', onset: 'FA/FI > 0.9 within 10–30 min; expands closed gas spaces', ir: '?', src: 'T6.3 (per 0.5 MAC: SVR ×1.05, Ees ×0.95, PVR ×1.1–1.3)', tag: 'VERIFY',
  },
];
