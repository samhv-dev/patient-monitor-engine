// Drug library III (Stage 7g Task 14). DATA only.
import type { DrugRow } from '../row.ts';

const gammaPk = (refDose: number, perKg: boolean, tpS: number, t10S: number, refRate?: number): DrugRow['pk'] => ({
  kind: 'gamma', refDose, perKg, tpS, t10S, ...(refRate !== undefined ? { refRate, tauOnS: 120, tauOffS: 900 } : {}),
});
const blood: DrugRow['pk'] = { kind: 'blood' };
const LA = (v1: number, v2: number, cl1: number, cl2: number): DrugRow['pk'] => ({ kind: 'perKg', conc: 'plain', pk: { v1, v2, v3: 0, cl1, cl2, cl3: 0, ke0: [1] } });

/**
 * Total plasma concentration (µg/mL) at which CNS symptoms start (`cns`, E = 0.5 of the CNS Hill), seizures
 * (`seizure`) and cardiovascular collapse (`cv`, E_cv = 0.5) [TXT: ASRA 2020 practice advisory; Stoelting 8e;
 * Q-7g-2 for Ali]. Acidosis/hypercapnia raise the free fraction (M10 ch. 25 p. 761) — applied in Task 16.
 */
export const LAST_THRESHOLDS: Record<string, { cns: number; seizure: number; cv: number }> = {
  lidocaine: { cns: 5, seizure: 10, cv: 20 },
  bupivacaine: { cns: 1.6, seizure: 3, cv: 4 },
  ropivacaine: { cns: 2.2, seizure: 4, cv: 6 },
};

export const OTHER_ROWS: DrugRow[] = [
  // --- chemistry owned by 7c (decision 10): 7g lists them; the blood module acts ---
  { id: 'calciumChloride', name: 'Calcium chloride 10 %', cls: 'electrolyte', amountUnit: 'mg', pk: blood, pd: [], doses: '10 mg/kg (0.5–1 g) — 13.6 mEq Ca per g', onset: 'iCa ↑ in 1–3 min (7c)', ir: '?', src: '7c plan decision 8', tag: 'TXT' },
  { id: 'calciumGluconate', name: 'Calcium gluconate 10 %', cls: 'electrolyte', amountUnit: 'mg', pk: blood, pd: [], doses: '30 mg/kg (1–3 g) — 4.65 mEq Ca per g', onset: 'as chloride, one third of the calcium per gram (7c)', ir: '?', src: '7c plan decision 8', tag: 'TXT' },
  { id: 'sodiumBicarbonate', name: 'Sodium bicarbonate 8.4 %', cls: 'electrolyte', amountUnit: 'mmol', pk: blood, pd: [], doses: '1 mmol/kg (1 mL/kg of 8.4 %)', onset: 'pH ↑ at once; EtCO2 +5 mmHg at 90 s (7c decision 14)', ir: '?', src: '7c plan decision 14', tag: 'TXT' },
  { id: 'insulinDextrose', name: 'Insulin + dextrose', cls: 'metabolic', amountUnit: 'units', pk: blood, pd: [], doses: '10 U insulin + 25 g dextrose', onset: 'K −0.6 to −1.0 mmol/L at 60 min (7c)', ir: '?', src: '7c plan decision 7', tag: 'TXT' },
  { id: 'magnesium', name: 'Magnesium sulfate', cls: 'electrolyte', amountUnit: 'mg', shared: 'blood', elim: { renal: 1 },
    pk: { kind: 'perKg', conc: 'plain', pk: { v1: 0.3, v2: 0, v3: 0, cl1: 0.0015, cl2: 0, cl3: 0, ke0: [0.5] } },
    pd: [{ target: 'svr', emax: -0.3, ec50: 60 }],
    doses: '2 g over 1–2 min (TdP); 40–50 mg/kg (analgesia, bronchospasm); concentration = rise over baseline, mg/L', onset: 'TdP termination within minutes; vecuronium ED50 −25 % after 40 mg/kg (M10 ch. 24 p. 698)', ir: '?', src: 'T6.2; M10 ch. 24', tag: 'TXT' },
  { id: 'salbutamol', name: 'Salbutamol (IV/neb)', cls: 'betaAgonist', amountUnit: 'mcg', shared: 'blood', pk: gammaPk(250, false, 600, 7200),
    pd: [{ target: 'hr', emax: 0.3, ec50: 1, beta: true, catecholamine: true }, { target: 'bronchodilation', emax: 1, ec50: 0.5 }, { target: 'kShift', emax: -0.8, ec50: 1 }],
    doses: '250 µg IV slowly; 10–20 mg nebulised for K', onset: 'K −1.4 at full effect (7c); HR +10–20 %', ir: '?', src: '7c decision 7; [TXT]', tag: 'TXT' },
  { id: 'insulin', name: 'Insulin (regular)', cls: 'metabolic', amountUnit: 'units', pk: gammaPk(10, false, 1800, 14400, 0.1 / 60),
    pd: [{ target: 'glucose', emax: -120, ec50: 1 }, { target: 'kShift', emax: -1.2, ec50: 1 }], doses: '10 U bolus; 0.05–0.1 U/kg/h', onset: 'IV onset 5–15 min, peak 30–60, 2–4 h (7e owns glucose)', ir: '?', src: '[TXT] placeholder for 7e', tag: 'TXT' },
  { id: 'dextrose', name: 'Dextrose 50 %', cls: 'metabolic', amountUnit: 'mg', pk: gammaPk(25000, false, 120, 3600),
    pd: [{ target: 'glucose', emax: 300, ec50: 1 }], doses: '25 g (50 mL of 50 %)', onset: 'glucose ↑ at once, back over 30–60 min (7e owns glucose)', ir: '?', src: '[TXT] placeholder for 7e', tag: 'TXT' },
  { id: 'dantrolene', name: 'Dantrolene', cls: 'dantrolene', amountUnit: 'mg', pk: gammaPk(2.5, true, 600, 21600),
    pd: [], doses: '2.5 mg/kg, repeat to 10 mg/kg', onset: 'EtCO2 falls within 5–10 min, HR normal by 15–20 (tables §7 21); bus.metabolic.dantroleneE → 7e/Stage 3 MH', ir: '?', src: 'tables §7 21; M10 ch. on neuromuscular disorders (2.4 mg/kg max twitch depression)', tag: 'TXT' },
  { id: 'furosemide', name: 'Furosemide', cls: 'diuretic', amountUnit: 'mg', pk: gammaPk(20, false, 900, 7200), pd: [{ target: 'v0Frac', emax: 0.06, ec50: 1 }],
    doses: '10–40 mg IV', onset: 'venodilation within 5–15 min (modelled); diuresis 5–30 min (7d owns urine)', ir: '?', src: '[TXT]; 7d plan Task 11', tag: 'TXT' },
  { id: 'mannitol', name: 'Mannitol 20 %', cls: 'osmotic', amountUnit: 'mg', pk: blood, pd: [], doses: '0.25–1 g/kg over 15–20 min', onset: 'ICP −25 % over 15–30 min (7d scenario 19)', ir: '?', src: 'tables §7 19; 7c/7d', tag: 'TXT' },
  { id: 'hypertonicSaline', name: 'Hypertonic saline 3 %/7.5 %', cls: 'osmotic', amountUnit: 'mL', pk: blood, pd: [], doses: '3 %: 2–5 mL/kg; 7.5 %: 250 mL', onset: 'Na ↑ and ICP ↓ over 5–15 min (7c/7d)', ir: '?', src: '[TXT]', tag: 'TXT' },
  // --- antagonists ---
  { id: 'naloxone', name: 'Naloxone', cls: 'opioidAntagonist', amountUnit: 'mg', pk: gammaPk(0.1, false, 120, 3600), pd: [],
    antagonises: { cls: 'opioid', ec50: 0.5, emax: 0.98 },
    doses: '40–100 µg titrated; 0.4 mg for overdose', onset: 'onset 1–2 min; duration 30–90 min — shorter than morphine/fentanyl infusions (renarcotisation)', ir: '?', src: '[TXT]; decision 6', tag: 'TXT' },
  { id: 'flumazenil', name: 'Flumazenil', cls: 'benzoAntagonist', amountUnit: 'mg', pk: gammaPk(0.2, false, 60, 3600), pd: [],
    antagonises: { cls: 'benzodiazepine', ec50: 0.5, emax: 0.98 },
    doses: '0.2 mg, repeat to 1 mg', onset: 'onset 1–2 min, duration 45–60 min (resedation)', ir: '?', src: '[TXT]; decision 6', tag: 'TXT' },
  // --- local anaesthetics (LAST, decision 12) and lipid ---
  { id: 'lidocaine', name: 'Lidocaine', cls: 'localAnaesthetic', amountUnit: 'mg', pk: LA(0.5, 1.0, 0.01, 0.05), elim: { hepatic: 1, highExtraction: true },
    pd: [{ target: 'ees', emax: -0.7, ec50: 20, hill: 2 }, { target: 'svr', emax: -0.3, ec50: 20, hill: 2 }],
    doses: 'antiarrhythmic 1–1.5 mg/kg; max 4.5 mg/kg plain / 7 with epinephrine (M10 ch. 25 Table 25.6: 350/500 mg)', onset: 'IV peak 1–2 min; seizures reported from 1.4 mg/kg in IVRA (M10 p. 755)', ir: '?', src: 'M10 ch. 25; LAST_THRESHOLDS', tag: 'TXT' },
  { id: 'bupivacaine', name: 'Bupivacaine', cls: 'localAnaesthetic', amountUnit: 'mg', pk: LA(0.25, 0.75, 0.008, 0.03), elim: { hepatic: 1 },
    pd: [{ target: 'ees', emax: -0.7, ec50: 4, hill: 2 }, { target: 'svr', emax: -0.3, ec50: 4, hill: 2 }],
    doses: 'max 2.5 mg/kg (175 mg plain / 225 with epinephrine, M10 Table 25.6)', onset: 'intravascular injection: CNS then CV collapse within minutes; resistant VF', ir: '?', src: 'M10 ch. 25; LAST_THRESHOLDS', tag: 'TXT' },
  { id: 'ropivacaine', name: 'Ropivacaine', cls: 'localAnaesthetic', amountUnit: 'mg', pk: LA(0.25, 0.6, 0.0071, 0.03), elim: { hepatic: 1 },
    pd: [{ target: 'ees', emax: -0.7, ec50: 6, hill: 2 }, { target: 'svr', emax: -0.3, ec50: 6, hill: 2 }],
    doses: 'max 3 mg/kg (200 mg plain / 250 with epinephrine, M10 Table 25.6)', onset: 'as bupivacaine with a higher CV threshold', ir: '?', src: 'M10 ch. 25; LAST_THRESHOLDS', tag: 'TXT' },
  { id: 'lipidEmulsion', name: 'Lipid emulsion 20 %', cls: 'lipid', amountUnit: 'mL', pk: gammaPk(1.5, true, 60, 1800, 0.25), pd: [],
    doses: '1.5 mL/kg over 1 min, then 0.25 mL/kg/min (ASRA 2020)', onset: 'lipid sink: free LA ↓ up to 50 % [ENG]; M10 p. 762: cardiac bupivacaine −11 % in 3 min', ir: '?', src: 'ASRA 2020; M10 ch. 25 p. 762', tag: 'ENG' },
  // --- placeholders (panel only; no engine effect in v1) ---
  { id: 'tranexamicAcid', name: 'Tranexamic acid', cls: 'placeholder', amountUnit: 'mg', pk: gammaPk(1000, false, 600, 10800), pd: [], doses: '1 g over 10 min, then 1 g over 8 h', onset: 'no monitor effect in v1', ir: '?', src: 'placeholder', tag: 'TXT' },
  { id: 'ondansetron', name: 'Ondansetron', cls: 'placeholder', amountUnit: 'mg', pk: gammaPk(4, false, 600, 14400), pd: [], doses: '4 mg', onset: 'no monitor effect in v1 (QTc prolongation not modelled)', ir: '?', src: 'placeholder', tag: 'TXT' },
  { id: 'dexamethasone', name: 'Dexamethasone', cls: 'placeholder', amountUnit: 'mg', pk: gammaPk(8, false, 3600, 86400), pd: [], doses: '4–8 mg', onset: 'no monitor effect in v1 (glucose ↑ is 7e)', ir: '?', src: 'placeholder', tag: 'TXT' },
];
