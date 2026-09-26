// Drug library II (Stage 7g Task 13). DATA only. T6.x = tables §6.x; R03 = research 03 §8.6; M10 = Miller 10e.
import type { DrugRow } from '../row.ts';
import { CISATRACURIUM, ROCURONIUM, SUCCINYLCHOLINE, SUGAMMADEX, VECURONIUM } from '../nmb.ts';

const gammaPk = (refDose: number, perKg: boolean, tpS: number, t10S: number): DrugRow['pk'] => ({ kind: 'gamma', refDose, perKg, tpS, t10S });
const vaso = (v1: number, cl1: number, ke0: number, v2 = 0, cl2 = 0): DrugRow['pk'] => ({ kind: 'perKg', conc: 'rateEq', pk: { v1, v2, v3: 0, cl1, cl2, cl3: 0, ke0: [ke0] } });

export const CARDIOVASCULAR_ROWS: DrugRow[] = [
  // --- neuromuscular (7f owns the block PD; these rows publish Ce on the bus) ---
  { id: 'rocuronium', name: 'Rocuronium', cls: 'nmb', amountUnit: 'mcg', pk: { kind: 'nmb', agent: 'rocuronium' }, elim: { hepatic: 0.7, renal: 0.3 }, pd: [],
    doses: '0.6 mg/kg (2×ED95 0.305, M10 ch. 24 Table 24.3); RSI 1.2 mg/kg', onset: '0.6: max block 1.8 min, duration 31 min; 1.2: 1.0 / 67 (label)', ir: '?', src: `Roc label; Plaud 1995; ${ROCURONIUM.cl1} L/kg/min`, tag: 'P' },
  { id: 'vecuronium', name: 'Vecuronium', cls: 'nmb', amountUnit: 'mcg', pk: { kind: 'nmb', agent: 'vecuronium' }, elim: { hepatic: 0.6, renal: 0.4 }, pd: [],
    doses: '0.1 mg/kg (ED95 0.043)', onset: 'max block 3–5 min, duration 25–30 min (label; M10 Table 24.5 41–44)', ir: '?', src: `Vec label; ${VECURONIUM.cl1} L/kg/min`, tag: 'P' },
  { id: 'cisatracurium', name: 'Cisatracurium', cls: 'nmb', amountUnit: 'mcg', pk: { kind: 'nmb', agent: 'cisatracurium' }, pd: [],
    doses: '0.15–0.2 mg/kg (ED95 0.04)', onset: 'max block 2–3 min, duration ≈ 45 min; Hofmann elimination (T5d, Q50)', ir: '?', src: `Cis label; ${CISATRACURIUM.cl1} L/kg/min`, tag: 'P' },
  { id: 'succinylcholine', name: 'Succinylcholine', cls: 'depolariser', amountUnit: 'mcg', pk: { kind: 'nmb', agent: 'succinylcholine' }, pd: [], shared: 'blood',
    doses: '1–1.5 mg/kg (ED95 0.51–0.63, M10 ch. 24 p. 677)', onset: 'block ≈ 1 min; T1 10 % 7.1 min, 90 % 10.9 (label); K +0.5 (7c)', ir: '?', src: `Sux label; Lee 2009; ${SUCCINYLCHOLINE.cl1} L/kg/min`, tag: 'P' },
  { id: 'sugammadex', name: 'Sugammadex', cls: 'nmbReversal', amountUnit: 'mg', pk: { kind: 'nmb', agent: 'sugammadex' }, elim: { renal: 1 }, pd: [],
    doses: '2 mg/kg at T2; 4 mg/kg at 1–2 PTC; 16 mg/kg immediate (M10 ch. 24 pp. 728–731)', onset: 'TOFR 0.9 in 2.2 / 2.7 min; 16 mg/kg T1 10 % in 1.2 min (label)', ir: '?', src: `Sgx label; V ${SUGAMMADEX.v1} L/kg`, tag: 'P' },
  { id: 'neostigmine', name: 'Neostigmine', cls: 'anticholinesterase', amountUnit: 'mg', pk: gammaPk(0.05, true, 600, 3600), elim: { renal: 0.5 },
    pd: [{ target: 'achGain', emax: 3, ec50: 1 }, { target: 'hr', emax: -0.5, ec50: 1 }],
    doses: '0.03–0.07 mg/kg, max 5 mg (with glycopyrrolate 0.2 mg per 1 mg)', onset: 'onset 1–3 min, peak ≈ 10 min; ceiling from TOF < 2 (7f; M10 ch. 24 p. 716)', ir: '?', src: 'Neo label; BJAEd 2020; T5d', tag: 'P' },
  { id: 'glycopyrrolate', name: 'Glycopyrrolate', cls: 'anticholinergic', amountUnit: 'mg', pk: gammaPk(0.2, false, 180, 10800),
    pd: [{ target: 'hr', emax: 0.3, ec50: 1 }], doses: '0.2–0.4 mg', onset: 'onset 2–3 min, duration 2–4 h; HR +10–20', ir: '?', src: 'T6.2; brief §4.9', tag: 'TXT' },
  { id: 'atropine', name: 'Atropine', cls: 'anticholinergic', amountUnit: 'mg', pk: gammaPk(0.5, false, 60, 5400),
    pd: [{ target: 'hr', emax: 0.6, ec50: 1 }], doses: '0.5–1 mg (child 0.02 mg/kg); arrest per ALS', onset: 'onset < 1 min, duration 30–60 min; HR +20–40 scaled by vagal tone (T6.2)', ir: '?', src: 'T6.2; R03 §8.6', tag: 'TXT' },
  // --- vasoactives (decision 4: rate-equivalent Ce, EC50 µg/kg/min) ---
  { id: 'phenylephrine', name: 'Phenylephrine', cls: 'alpha1', amountUnit: 'mcg', pk: vaso(0.04, 0.035, 1.2),
    pd: [{ target: 'svr', emax: 1, ec50: 0.25, catecholamine: true }, { target: 'pvr', emax: 0.15, ec50: 0.25, catecholamine: true }, { target: 'v0Frac', emax: -0.045, ec50: 0.25, catecholamine: true }],
    syringePerMl: 100, doses: 'bolus 50–100 µg (label 40–100); infusion 10–35 µg/min (≈ 0.15–0.5 µg/kg/min); obstetric ED90 0.54 µg/kg/min',
    onset: 'bolus onset 30–60 s, peak 1–2 min, 5–10 min; infusion steady in ≈ 5 min', ir: '?', src: 'Phe label; Hengstmann 1982 (CL ≈ 2.1 L/min); T6.2 (Emax +100 %); EC50 0.25 [ENG, D1]', tag: 'ENG' },
  { id: 'ephedrine', name: 'Ephedrine', cls: 'mixedAdrenergic', amountUnit: 'mg', pk: gammaPk(10, false, 270, 3600), tachyphylaxis: 0.7,
    pd: [{ target: 'hr', emax: 0.24, ec50: 1, beta: true, catecholamine: true }, { target: 'ees', emax: 0.36, ec50: 1, beta: true, catecholamine: true }, { target: 'svr', emax: 0.24, ec50: 1, catecholamine: true }, { target: 'v0Frac', emax: -0.06, ec50: 1 }],
    doses: '5–10 mg (label 5–25)', onset: 'onset ≈ 1 min, peak 4–5 min, ≈ 60 min; each repeat ×0.7 (tachyphylaxis)', ir: '?', src: 'Eph label; T6.2', tag: 'ENG' },
  { id: 'norepinephrine', name: 'Norepinephrine', cls: 'alpha1', amountUnit: 'mcg', pk: vaso(0.1, 0.03, 1.0),
    pd: [{ target: 'svr', emax: 1.5, ec50: 0.15, catecholamine: true }, { target: 'ees', emax: 0.25, ec50: 0.1, beta: true, catecholamine: true }, { target: 'v0Frac', emax: -0.1, ec50: 0.15, catecholamine: true }, { target: 'pvr', emax: 0.2, ec50: 0.15, catecholamine: true }],
    syringePerMl: 64, doses: 'ICU 0.05–0.5 µg/kg/min; label start 8–12 µg/min, maintain 2–4', onset: 'onset 1–2 min, offset 2–3 min (t½ 2–2.5 min)', ir: '?', src: 'NE label; T6.2', tag: 'ENG' },
  { id: 'epinephrine', name: 'Epinephrine', cls: 'mixedAdrenergic', amountUnit: 'mcg', pk: vaso(0.1, 0.05, 1.0),
    pd: [
      { target: 'hr', emax: 0.5, ec50: 0.05, beta: true, catecholamine: true }, { target: 'ees', emax: 0.6, ec50: 0.04, beta: true, catecholamine: true },
      { target: 'svr', emax: -0.1, ec50: 0.02, beta: true, catecholamine: true }, { target: 'svr', emax: 1.2, ec50: 0.2, catecholamine: true },
      { target: 'v0Frac', emax: -0.05, ec50: 0.1, catecholamine: true }, { target: 'bronchodilation', emax: 1, ec50: 0.05 }, { target: 'kShift', emax: -0.5, ec50: 0.1 }, { target: 'glucose', emax: 40, ec50: 0.1 },
    ],
    syringePerMl: 16, doses: 'infusion 0.01–0.05 (β) / > 0.1 µg/kg/min (α); push-dose 10–20 µg; anaphylaxis 50–100 µg; arrest 1 mg', onset: 'onset 1 min, offset 2–3 min', ir: '?', src: 'Epi label; T6.2; T5e', tag: 'ENG' },
  { id: 'vasopressin', name: 'Vasopressin', cls: 'vasopressin', amountUnit: 'units', pk: vaso(0.14, 0.01, 0.2),
    pd: [{ target: 'svr', emax: 0.8, ec50: 0.00057 }], syringePerMl: 1,
    doses: '0.01–0.07 U/min (typical 0.03–0.04); rate-eq EC50 = 0.04 U/min in 70 kg', onset: 'onset ≈ 5 min, offset 10–20 min; not blunted by acidosis; spares PVR', ir: '?', src: 'Vaso label; T6.2 (+40 % at 0.04 U/min, Emax +80 %)', tag: 'ENG' },
  { id: 'dobutamine', name: 'Dobutamine', cls: 'betaAgonist', amountUnit: 'mcg', pk: vaso(0.2, 0.07, 0.35),
    pd: [{ target: 'ees', emax: 0.8, ec50: 7, beta: true, catecholamine: true }, { target: 'hr', emax: 0.25, ec50: 10, beta: true, catecholamine: true }, { target: 'svr', emax: -0.3, ec50: 10, beta: true, catecholamine: true }, { target: 'pvr', emax: -0.2, ec50: 10, beta: true, catecholamine: true }],
    syringePerMl: 2000, doses: '2–20 µg/kg/min', onset: 'onset 2 min, offset 2–5 min (t½ 2 min)', ir: '?', src: 'Dobu label (SBP +10–20, HR +5–15); T6.2', tag: 'ENG' },
  { id: 'milrinone', name: 'Milrinone', cls: 'pde3', amountUnit: 'mcg', pk: vaso(0.38, 0.0022, 0.3), elim: { renal: 0.8 },
    pd: [{ target: 'ees', emax: 0.6, ec50: 0.5 }, { target: 'svr', emax: -0.6, ec50: 0.7, hill: 1.5 }, { target: 'hr', emax: 0.1, ec50: 0.5 }, { target: 'v0Frac', emax: 0.1, ec50: 0.5 }, { target: 'pvr', emax: -0.5, ec50: 0.5 }, { target: 'hpvInhibit', emax: 0.3, ec50: 0.5 }],
    syringePerMl: 200, doses: 'load 50 µg/kg over 10 min, then 0.375–0.75 µg/kg/min', onset: 't½ 2.3–2.4 h (CKD ×2–3); SVR −17/−21/−37 % at 0.375/0.5/0.75 (label)', ir: '?', src: 'Mil label; T6.2', tag: 'P' },
  { id: 'dopamine', name: 'Dopamine', cls: 'mixedAdrenergic', amountUnit: 'mcg', pk: vaso(0.2, 0.06, 0.35),
    pd: [{ target: 'hr', emax: 0.35, ec50: 8, beta: true, catecholamine: true }, { target: 'ees', emax: 0.4, ec50: 5, beta: true, catecholamine: true }, { target: 'svr', emax: 0.6, ec50: 15, hill: 2, catecholamine: true }],
    syringePerMl: 1600, doses: '2–20 µg/kg/min', onset: 'onset 2 min, offset 5 min', ir: '?', src: 'T6.2 [TXT], Q59', tag: 'TXT' },
  { id: 'nitroglycerin', name: 'Nitroglycerin', cls: 'vasodilator', amountUnit: 'mcg', pk: vaso(0.05, 0.2, 0.5),
    pd: [{ target: 'v0Frac', emax: 0.25, ec50: 1 }, { target: 'svr', emax: -0.3, ec50: 1 }, { target: 'pvr', emax: -0.4, ec50: 1 }, { target: 'hpvInhibit', emax: 1, ec50: 1 }],
    syringePerMl: 200, doses: 'infusion 10–200 µg/min (≈ 0.15–3 µg/kg/min); bolus 50–100 µg; SL 400 µg', onset: 'onset 1–2 min, offset 5–10 min; venous > arterial', ir: '?', src: 'NTG label; T6.2 (V +10–15 % at 1 µg/kg/min, SVR ×0.85, PVR ×0.8)', tag: 'ENG' },
  { id: 'hydralazine', name: 'Hydralazine', cls: 'vasodilator', amountUnit: 'mg', pk: gammaPk(10, false, 900, 14400),
    pd: [{ target: 'svr', emax: -0.4, ec50: 1 }], doses: '5–20 mg IV', onset: 'onset 5–20 min, peak 10–20 min, 2–4 h; reflex tachycardia emerges', ir: '?', src: 'label [TXT]', tag: 'TXT' },
  // --- β-blockers and antiarrhythmics ---
  // β-receptor OCCUPANCY (`betaBlock` Emax/EC50) is [ENG] for all three: no source gives occupancy vs dose. Sized so a
  // usual dose blocks about half the receptors (esmolol 100 µg/kg/min → 0.45; labetalol 10 mg and metoprolol 2.5 mg
  // at their peak → 0.3 / 0.35); the occupancy enters decision 7's β-agonist EC50 shift and Task 17's betaBlockAdd.
  // Esmolol 2-cmt set: label CL 285 mL/kg/min, Vss 3.4 L/kg, distribution t½ 2 min, elimination t½ 9 min → the
  // unique V1 2.71, V2 0.69 L/kg, Q 0.175 L/kg/min (closed form: λ1 = ln2/2, λ2 = ln2/9 per min) [P-derived];
  // ke0 0.7 [ENG]. HR −10 % per 100 µg/kg/min, Emax −35 % (T6.2) → hr EC50 250 rate-eq.
  { id: 'esmolol', name: 'Esmolol', cls: 'betaBlocker', amountUnit: 'mcg', pk: { kind: 'perKg', conc: 'rateEq', pk: { v1: 2.71, v2: 0.69, v3: 0, cl1: 0.285, cl2: 0.175, cl3: 0, ke0: [0.7] } },
    pd: [{ target: 'betaBlock', emax: 0.9, ec50: 100 }, { target: 'hr', emax: -0.35, ec50: 250 }, { target: 'ees', emax: -0.2, ec50: 250 }],
    syringePerMl: 10000, doses: 'load 0.5 mg/kg over 1 min (peri-op 1 mg/kg over 30 s); 50–300 µg/kg/min', onset: 'distribution t½ 2 min, elimination t½ 9 min (label; the PK set reproduces both)', ir: '?', src: 'Esmolol label (CL 285 mL/kg/min, Vss 3.4 L/kg, t½ 2/9 min); T6.2; β occupancy [ENG]', tag: 'ENG' },
  { id: 'labetalol', name: 'Labetalol', cls: 'betaBlocker', amountUnit: 'mg', pk: gammaPk(10, false, 300, 14400),
    pd: [{ target: 'betaBlock', emax: 0.6, ec50: 1 }, { target: 'hr', emax: -0.3, ec50: 1 }, { target: 'ees', emax: -0.2, ec50: 1 }, { target: 'svr', emax: -0.25, ec50: 1 }],
    doses: '5–20 mg IV, repeat', onset: 'onset 2–5 min, peak ≈ 5 min, 2–6 h', ir: '?', src: 'T6.2 [TXT], Q59; β occupancy [ENG]', tag: 'TXT' },
  { id: 'metoprolol', name: 'Metoprolol', cls: 'betaBlocker', amountUnit: 'mg', pk: gammaPk(2.5, false, 1200, 21600),
    pd: [{ target: 'betaBlock', emax: 0.7, ec50: 1 }, { target: 'hr', emax: -0.3, ec50: 1 }, { target: 'ees', emax: -0.2, ec50: 1 }],
    doses: '1–5 mg IV', onset: 'onset 2–5 min, peak 20 min (tpS 1200), 3–6 h', ir: '?', src: 'T6.2 [TXT], Q59; β occupancy [ENG]', tag: 'TXT' },
  { id: 'amiodarone', name: 'Amiodarone', cls: 'antiarrhythmic', amountUnit: 'mg', pk: gammaPk(150, false, 600, 7200),
    pd: [{ target: 'hr', emax: -0.2, ec50: 1 }, { target: 'svr', emax: -0.3, ec50: 1 }, { target: 'avNode', emax: 0.3, ec50: 1 }],
    doses: '150 mg over 10 min; arrest 300 mg then 150 mg', onset: 'acute effects over 10–60 min; QTc +20–40 ms [ENG]; raises AF→sinus conversion (Stage 5 hook, Task 16)', ir: '?', src: 'T6.2 antiarrhythmic paragraph', tag: 'TXT' },
  { id: 'adenosine', name: 'Adenosine', cls: 'adenosine', amountUnit: 'mg', pk: gammaPk(6 / 70, true, 15, 30),
    pd: [{ target: 'avNode', emax: 1, ec50: 0.42, hill: 2 }, { target: 'svr', emax: -0.3, ec50: 1 }],
    doses: '6 mg rapid push + flush, then 12 mg (central line: half)', onset: 'AV block 3–10 s, 10–30 s after the push (R03 §8.6; brief §4.9); plasma t½ < 10 s', ir: '?', src: 'R03 §8.6; decision 11 (E 0.85 at 6 mg / 70 kg, 0.59 at 3 mg, 0.96 at 12 mg)', tag: 'ENG' },
];
