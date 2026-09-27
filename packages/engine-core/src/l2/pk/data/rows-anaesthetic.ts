// Drug library I (Stage 7g Task 12): hypnotics, opioids, benzodiazepines, α2 agonist, volatiles. DATA only.
// Sources: tables §6.1/§6.3 (T6.x), research 03 §8.6 (R03), Miller 10e (M10 ch. N p. M), labels, papers as named.
import { FENTANYL_KE0, SUFENTANIL_KE0 } from '../models.ts';
import { ELEVELD_CE50_AGE_K } from '../pd.ts';
import type { DrugRow } from '../row.ts';

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

export const ANAESTHETIC_ROWS: DrugRow[] = [
  {
    id: 'propofol', name: 'Propofol', cls: 'hypnotic', amountUnit: 'mg', pk: { kind: 'model', model: 'eleveld' },
    elim: { hepatic: 0.6, highExtraction: true },
    // T6.3: E = Ce/(Ce + 3.5): SVR ×(1 − 0.45E), Ees ×(1 − 0.2E), V0 +8 %·E, reflex ×(1 − 0.6E); gvHr −0.7 (7a fit, Cullen 1987) — refitted in Task 20
    pd: [
      { target: 'svr', emax: -0.45, ec50: 3.5 }, { target: 'ees', emax: -0.2, ec50: 3.5 }, { target: 'v0Frac', emax: 0.08, ec50: 3.5 },
      { target: 'gv', emax: -0.6, ec50: 3.5 }, { target: 'gvHr', emax: -0.7, ec50: 3.5 },
    ],
    cns: { hypC50: 3.08, hypC50AgeK: ELEVELD_CE50_AGE_K, cmro2: 0.5 }, syringePerMl: 10, // T5d Ce50 3.08·e^(−0.00635(age − 35))
    doses: 'induction 1.5–2.5 mg/kg (ED50 LOC 1–1.5, M10 ch. 21 p. 516); TCI Ce 2–5 µg/mL; infusion 4–12 mg/kg/h',
    onset: 'TTPE 90–100 s (M10 ch. 21 p. 515); MAP −25–40 % after 2–2.5 mg/kg (p. 519)',
    ir: '?', src: 'Eleveld 2018 (PK; BIS Ce50 3.08 with the age term, T5d/Q53); T6.3; M10 ch. 21', tag: 'P',
  },
  {
    id: 'ketamine', name: 'Ketamine', cls: 'ketamine', amountUnit: 'mg', pk: gammaPk(1.5, true, 60, 900, 0.01, 300, 900),
    elim: { hepatic: 0.9 },
    pd: [{ target: 'hr', emax: 0.35, ec50: 1 }, { target: 'svr', emax: 0.4, ec50: 1 }, { target: 'ees', emax: -0.2, ec50: 1 }, { target: 'bronchodilation', emax: 1, ec50: 1 }, { target: 'cbfVaso', emax: 0.4, ec50: 1 }],
    doses: 'induction 1–2 mg/kg IV (M10 ch. 21 p. 536); analgesia 0.1–0.3 mg/kg; infusion 0.1–0.5 mg/kg/h',
    onset: 'onset 30–60 s, duration 10–15 min (R03 §8.6); plasma 0.7–2.2 µg/mL for hypnosis (M10 p. 536)',
    ir: '?', src: 'T6.3 (HR +15–20 %, SVR +15–25 % sympathetic; direct Ees ×0.9); M10 ch. 21', tag: 'TXT',
  },
  {
    id: 'etomidate', name: 'Etomidate', cls: 'hypnotic', amountUnit: 'mg', pk: gammaPk(0.3, true, 60, 480),
    elim: { hepatic: 0.8 },
    pd: [{ target: 'svr', emax: -0.1, ec50: 1 }],
    cns: { hypC50: 1, cmro2: 0.4 },
    doses: 'induction 0.2–0.3 mg/kg (M10 ch. 21 p. 541)', onset: 'onset 30–60 s, duration 3–5 min; cortisol response ×0.5 for 24 h (T6.3)',
    ir: '?', src: 'T6.3 (MAP −0–10 %); M10 ch. 21 Table 21.1', tag: 'TXT',
  },
  {
    id: 'thiopental', name: 'Thiopental', cls: 'hypnotic', amountUnit: 'mg', pk: gammaPk(4, true, 45, 900),
    elim: { hepatic: 1 },
    pd: [{ target: 'svr', emax: -0.4, ec50: 1 }, { target: 'ees', emax: -0.3, ec50: 1 }, { target: 'hr', emax: 0.24, ec50: 1 }, { target: 'v0Frac', emax: 0.16, ec50: 1 }, { target: 'gv', emax: -0.8, ec50: 1 }],
    cns: { hypC50: 1, cmro2: 0.55 },
    doses: 'induction 3–5 mg/kg', onset: 'onset 30 s, awakening 5–10 min (redistribution); t½ 7–17 h (M10 Table 21.1)',
    ir: '?', src: 'T6.3 (SVR −20 %, Ees −15 %, HR +10–15 %, V0 +8 %, reflex ×0.6)', tag: 'TXT',
  },
  {
    id: 'midazolam', name: 'Midazolam', cls: 'benzodiazepine', amountUnit: 'mg', pk: gammaPk(0.05, true, 180, 3600, 0.001, 600, 1800),
    elim: { hepatic: 1 },
    pd: [{ target: 'svr', emax: -0.24, ec50: 1 }, { target: 'v0Frac', emax: 0.06, ec50: 1 }, { target: 'gv', emax: -0.4, ec50: 1 }],
    cns: { midazEq: 1, hypC50: 4 },
    doses: 'sedation 0.02–0.05 mg/kg; induction 0.05–0.15 mg/kg (M10 ch. 21 Table 21.7)', onset: 'T½ke0 2–3 min (M10 ch. 21 p. 532); peak 3–5 min; duration 30–60 min',
    ir: '?', src: 'T6.3 (SVR −10–15 %, V0 +3 %, reflex ×0.8); M10 ch. 21', tag: 'TXT',
  },
  {
    id: 'dexmedetomidine', name: 'Dexmedetomidine', cls: 'alpha2', amountUnit: 'mcg', pk: gammaPk(1, true, 900, 7200, 0.5 / 60, 900, 1800),
    elim: { hepatic: 1 },
    pd: [{ target: 'hr', emax: -0.3, ec50: 1 }, { target: 'svr', emax: -0.3, ec50: 1 }],
    doses: 'load 1 µg/kg over 10 min, then 0.2–0.7 µg/kg/h', onset: 'peak 15 min after the load; t½ 2–3 h (M10 Table 21.1)',
    ir: '?', src: 'T6.3 (HR −10–20 %, SVR −10–20 % after the biphasic load; the transient rise of a fast load is not modelled in v1)', tag: 'TXT',
  },
  {
    // vent site: tables give no fentanyl ventilatory ke0 → the brain ke0 [ENG] (deviations list)
    id: 'fentanyl', name: 'Fentanyl', cls: 'opioid', amountUnit: 'mcg', pk: { kind: 'model', model: 'shafer', ventKe0: FENTANYL_KE0 },
    elim: { hepatic: 1, highExtraction: true },
    pd: [{ target: 'hr', emax: -0.25, ec50: 2 }, { target: 'svr', emax: -0.15, ec50: 2 }, { target: 'v0Frac', emax: 0.03, ec50: 2 }],
    cns: { remiEq: 1.6 }, syringePerMl: 50,
    doses: '1–3 µg/kg analgesia; 5–10 µg/kg blunting; plasma 15–30 ng/mL as sole agent (M10 ch. 22 Table 22.7)',
    onset: 'TTPE 3.6 min; CSHT rises steeply (M10 ch. 22 p. 588)',
    ir: '?', src: `Shafer 1990 PK; ke0 by TTPE (decision 2); T5d potency 1.6× remifentanil; ${OPIOID_HEMO_SRC}`, tag: 'VERIFY',
  },
  {
    // vent site ke0 0.92/min: Bouillon 2003 ventilatory ke0 (T5d "ke0 for CO2 0.92/min") [P]; R51 §2
    id: 'remifentanil', name: 'Remifentanil', cls: 'opioid', amountUnit: 'mcg', pk: { kind: 'model', model: 'minto', ventKe0: 0.92 },
    pd: [{ target: 'hr', emax: -0.25, ec50: 3 }, { target: 'svr', emax: -0.15, ec50: 3 }, { target: 'v0Frac', emax: 0.03, ec50: 3 }],
    cns: { remiEq: 1 }, syringePerMl: 50,
    doses: '0.05–0.5 µg/kg/min; TCI Ce 2–8 ng/mL; bolus 0.5–1 µg/kg', onset: 'TTPE ≈ 1.4–1.6 min; CSHT ≈ 3 min, context-independent',
    ir: '?', src: `Minto 1997; Bouillon 2003 (ventilation C50 0.92, ke0 0.92); Kapila 1995; ${OPIOID_HEMO_SRC}`, tag: 'P',
  },
  {
    id: 'sufentanil', name: 'Sufentanil', cls: 'opioid', amountUnit: 'mcg', pk: { kind: 'model', model: 'gepts', ventKe0: SUFENTANIL_KE0 }, // vent = brain ke0 [ENG]
    elim: { hepatic: 1, highExtraction: true },
    pd: [{ target: 'hr', emax: -0.25, ec50: 0.25 }, { target: 'svr', emax: -0.15, ec50: 0.25 }],
    cns: { remiEq: 12 }, syringePerMl: 5,
    doses: '0.1–0.5 µg/kg; plasma 5–10 ng/mL as sole agent (M10 Table 22.7)', onset: 'TTPE 5.6 min (Shafer & Varvel 1991)',
    ir: '?', src: `Gepts 1995 PK [VERIFY]; potency ×12 remifentanil [ENG, Q59]; ${OPIOID_HEMO_SRC}`, tag: 'VERIFY',
  },
  {
    id: 'morphine', name: 'Morphine', cls: 'opioid', amountUnit: 'mg', pk: gammaPk(0.1, true, 1200, 14400),
    elim: { hepatic: 0.9, renal: 0.1 },
    pd: [{ target: 'svr', emax: -0.2, ec50: 1 }, { target: 'histamine', emax: 0.6, ec50: 1 }],
    cns: { remiEq: 1.5 },
    doses: '0.05–0.15 mg/kg IV', onset: 'peak 15–30 min, duration 3–4 h (R03 §8.6); CL 15–30 mL/kg/min (M10 Table 22.6)',
    ir: '?', src: 'R03 §8.6; M10 ch. 22; remi-equivalent [ENG]', tag: 'TXT',
  },
  {
    id: 'sevoflurane', name: 'Sevoflurane', cls: 'volatile', amountUnit: 'mL', pk: { kind: 'volatile', agent: 'sevoflurane' },
    pd: [
      { target: 'svr', emax: -0.2, ec50: 1, linear: true }, { target: 'ees', emax: -0.1, ec50: 1, linear: true }, { target: 'v0Frac', emax: 0.03, ec50: 1, linear: true },
      { target: 'gv', emax: -0.3, ec50: 1, linear: true }, { target: 'bronchodilation', emax: 1, ec50: 0.5 }, { target: 'cbfVaso', emax: 0.2, ec50: 1, linear: true }, { target: 'hpvInhibit', emax: 0.2, ec50: 1, linear: true },
    ],
    cns: { cmro2: 0.5 },
    doses: 'MAC 1.80 % at 40 y (Mapleson; label 2.1, Q52); maintenance 0.8–1.3 MAC', onset: 'FA/FI 0.85 at 30 min (Yasuda 1991); b/g 0.65 (M10 ch. 19 p. 427)',
    ir: '?', src: 'T6.3 (Malan 1995); T5d', tag: 'P',
  },
  {
    id: 'isoflurane', name: 'Isoflurane', cls: 'volatile', amountUnit: 'mL', pk: { kind: 'volatile', agent: 'isoflurane' },
    pd: [
      { target: 'svr', emax: -0.25, ec50: 1, linear: true }, { target: 'ees', emax: -0.1, ec50: 1, linear: true }, { target: 'hr', emax: 0.07, ec50: 1, linear: true },
      { target: 'v0Frac', emax: 0.03, ec50: 1, linear: true }, { target: 'gv', emax: -0.3, ec50: 1, linear: true }, { target: 'bronchodilation', emax: 1, ec50: 0.5 }, { target: 'cbfVaso', emax: 0.4, ec50: 1, linear: true },
    ],
    cns: { cmro2: 0.5 },
    doses: 'MAC 1.17 % at 40 y', onset: 'FA/FI 0.73 at 30 min; b/g 1.46', ir: '?', src: 'T6.3; Mapleson 1996; M10 ch. 19 p. 427', tag: 'TXT',
  },
  {
    id: 'desflurane', name: 'Desflurane', cls: 'volatile', amountUnit: 'mL', pk: { kind: 'volatile', agent: 'desflurane' },
    pd: [
      { target: 'svr', emax: -0.25, ec50: 1, linear: true }, { target: 'ees', emax: -0.1, ec50: 1, linear: true }, { target: 'hr', emax: 0.07, ec50: 1, linear: true },
      { target: 'v0Frac', emax: 0.03, ec50: 1, linear: true }, { target: 'gv', emax: -0.3, ec50: 1, linear: true }, { target: 'cbfVaso', emax: 0.3, ec50: 1, linear: true },
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
