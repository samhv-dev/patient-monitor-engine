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
  // FU-7 (addendum 24): atracurium — histamine release on a fast bolus (M10 ch. 24: transient hypotension and flushing,
  // dose- and rate-dependent; cisatracurium does not). Hofmann elimination as cisatracurium; potency ED95 0.25 mg/kg.
  { id: 'atracurium', name: 'Atracurium', cls: 'nmb', amountUnit: 'mcg', pk: { kind: 'nmb', agent: 'cisatracurium' },
    pd: [{ target: 'histamine', emax: 0.7, ec50: 400 }],
    doses: '0.5 mg/kg (2×ED95 0.25); infusion 5–10 µg/kg/min', onset: 'max block 2–3 min, duration 20–35 min (label); v1: histamine release only — NO neuromuscular block (7f models four NMB agents)',
    ir: '?', src: 'label; M10 ch. 24 (histamine release); PK shared with cisatracurium [ENG, Q: its own set]', tag: 'ENG' },
  // FU-7 (addendum 24): mivacurium — the shortest-acting benzylisoquinolinium, the strongest histamine releaser of the
  // three, hydrolysed by plasma cholinesterase (so the cholinesterase phenotypes prolong it as they do succinylcholine).
  { id: 'mivacurium', name: 'Mivacurium', cls: 'nmb', amountUnit: 'mcg', pk: { kind: 'nmb', agent: 'succinylcholine' },
    pd: [{ target: 'histamine', emax: 0.9, ec50: 250 }],
    doses: '0.2 mg/kg (2.5×ED95 0.08); infusion 4–10 µg/kg/min', onset: 'max block 2–3 min, duration 15–20 min (label); v1: histamine release only — NO neuromuscular block (7f models four NMB agents)',
    ir: '?', src: 'label; M10 ch. 24; PK shared with succinylcholine [ENG, Q: its own set]', tag: 'ENG' },
  { id: 'succinylcholine', name: 'Succinylcholine', cls: 'depolariser', amountUnit: 'mcg', pk: { kind: 'nmb', agent: 'succinylcholine' }, pd: [], shared: 'blood',
    doses: '1–1.5 mg/kg (ED95 0.51–0.63, M10 ch. 24 p. 677)', onset: 'block ≈ 1 min; T1 10 % 7.1 min, 90 % 10.9 (label); K +0.5 (7c)', ir: '?', src: `Sux label; Lee 2009; Roy 2002 CL ${SUCCINYLCHOLINE.cl1} L/kg/min`, tag: 'P' },
  { id: 'sugammadex', name: 'Sugammadex', cls: 'nmbReversal', amountUnit: 'mg', pk: { kind: 'nmb', agent: 'sugammadex' }, elim: { renal: 1 },
    // FU-7 (DI-45): marked bradycardia is a recognised sugammadex reaction (MHRA/EMA; M10 ch. 24 pp. 728–731). Modelled
    // as a dose-related vagal fall at the high (16 mg/kg) end [ENG: no incidence-vs-dose source exists]; the anaphylaxis
    // is 7e's `condition anaphylaxis`, dispatched by the instructor, not a drug row.
    pd: [{ target: 'hr', emax: -0.25, ec50: 12 }],
    doses: '2 mg/kg at T2; 4 mg/kg at 1–2 PTC; 16 mg/kg immediate (M10 ch. 24 pp. 728–731)', onset: 'TOFR 0.9 in 2.2 / 2.7 min; 16 mg/kg T1 10 % in 1.2 min (label)', ir: '?', src: `Sgx label; V ${SUGAMMADEX.v1} L/kg`, tag: 'P' },
  // FU-7 (H9): t½β 77 min, 181 min in renal failure (Cronnelly 1979 Anesthesiology 51:222; M10 ch. 24)
  { id: 'neostigmine', name: 'Neostigmine', cls: 'anticholinesterase', amountUnit: 'mg', pk: gammaPk(0.05, true, 600, 3600), elim: { renal: 0.5, t12S: 4620 },
    // FU-4 G7/F10: neostigmine's bradycardia is muscarinic — the reason it is never given without an
    // anticholinergic. `ec50` is neostigmine's own effect-site concentration in the row's units (mg-equivalent Ce, as
    // its `achGain` row uses); `emax` is ms added to the cycle length at full effect [ENG size, P direction].
    pd: [{ target: 'achGain', emax: 3, ec50: 1 }, { target: 'hr', emax: -0.5, ec50: 1 }, { target: 'vagalMs', emax: 500, ec50: 1 }],
    doses: '0.03–0.07 mg/kg, max 5 mg (with glycopyrrolate 0.2 mg per 1 mg)', onset: 'onset 1–3 min, peak ≈ 10 min; ceiling from TOF < 2 (7f; M10 ch. 24 p. 716)', ir: '?', src: 'Neo label; BJAEd 2020; T5d', tag: 'P' },
  // FU-7 (H9): ≈ 80 % excreted unchanged in urine, t½β ≈ 0.8 h, prolonged in uraemia (Kirvelä 1993 BJA 71:437) [VERIFY]
  { id: 'glycopyrrolate', name: 'Glycopyrrolate', cls: 'anticholinergic', amountUnit: 'mg', pk: gammaPk(0.2, false, 180, 10800), elim: { renal: 0.8, t12S: 2880 },
    // FU-4 G7/F10: muscarinic occupancy 0–1 — 7g multiplies every `vagalMs` by (1 − occupancy), so an anticholinergic
    // given first abolishes the opioid and neostigmine bradycardias. ec50 in mg-equivalent Ce [ENG].
    pd: [{ target: 'hr', emax: 0.3, ec50: 1 }, { target: 'muscarinic', emax: 1, ec50: 0.35 }], doses: '0.2–0.4 mg', onset: 'onset 2–3 min, duration 2–4 h; HR +10–20', ir: '?', src: 'T6.2; brief §4.9', tag: 'TXT' },
  // FU-7 (review F7, ruling 6): tpS is the PEAK time — IV atropine's peak chronotropic effect is at 2–4 min (label);
  // the 60 s it carried was the ONSET ("< 1 min", T6.2), which the zero-slope chain would have turned into the peak.
  { id: 'atropine', name: 'Atropine', cls: 'anticholinergic', amountUnit: 'mg', pk: gammaPk(0.5, false, 150, 5400),
    pd: [{ target: 'hr', emax: 0.6, ec50: 1 }, { target: 'muscarinic', emax: 1, ec50: 0.3 }], doses: '0.5–1 mg (child 0.02 mg/kg); arrest per ALS', onset: 'onset < 1 min, duration 30–60 min; HR +20–40 scaled by vagal tone (T6.2)', ir: '?', src: 'T6.2; R03 §8.6', tag: 'TXT' },
  // --- vasoactives (decision 4: rate-equivalent Ce, EC50 µg/kg/min) ---
  { id: 'phenylephrine', name: 'Phenylephrine', cls: 'alpha1', amountUnit: 'mcg', pk: vaso(0.04, 0.035, 1.2),
    pd: [{ target: 'svr', emax: 1, ec50: 0.25, catecholamine: true }, { target: 'pvr', emax: 0.15, ec50: 0.25, catecholamine: true }, { target: 'v0Frac', emax: -0.045, ec50: 0.25, catecholamine: true }],
    syringePerMl: 100, doses: 'bolus 50–100 µg (label 40–100); infusion 10–35 µg/min (≈ 0.15–0.5 µg/kg/min); obstetric ED90 0.54 µg/kg/min',
    onset: 'bolus onset 30–60 s, peak 1–2 min, 5–10 min; infusion steady in ≈ 5 min', ir: '?', src: 'Phe label; Hengstmann 1982 (CL ≈ 2.1 L/min); T6.2 (Emax +100 %); EC50 0.25 [ENG, D1]', tag: 'ENG' },
  { id: 'ephedrine', name: 'Ephedrine', cls: 'mixedAdrenergic', amountUnit: 'mg', pk: gammaPk(10, false, 270, 3600), tachyphylaxis: 0.7,
    // FU-7 (addendum 21): ephedrine is an INDIRECT sympathomimetic — most of its effect is released noradrenaline, so it
    // enters 7e's central sympathetic drive (`sympDrive`), where chronic β-blockade removes the β1 share (7e applies
    // `prof.betaBlock/betaBlockC`) and the α share remains; only its small DIRECT α arm stays on 7a.
    // [ENG sizes; fit target: MAP +10–15 % after 10 mg (T6.2) — prototype 13.4 mmHg — and ×0.3–0.7 under β-blockade (Q1)]
    pd: [{ target: 'sympDrive', emax: 1.6, ec50: 1 }, { target: 'svr', emax: 0.08, ec50: 1, catecholamine: true }, { target: 'v0Frac', emax: -0.06, ec50: 1 }],
    doses: '5–10 mg (label 5–25)', onset: 'onset ≈ 1 min, peak 4–5 min, ≈ 60 min; each repeat ×0.7 (tachyphylaxis)', ir: '?', src: 'Eph label; T6.2', tag: 'ENG' },
  { id: 'norepinephrine', name: 'Norepinephrine', cls: 'alpha1', amountUnit: 'mcg', pk: vaso(0.1, 0.03, 1.0),
    pd: [{ target: 'svr', emax: 1.5, ec50: 0.15, catecholamine: true }, { target: 'ees', emax: 0.25, ec50: 0.1, beta: true, catecholamine: true }, { target: 'v0Frac', emax: -0.1, ec50: 0.15, catecholamine: true }, { target: 'pvr', emax: 0.2, ec50: 0.15, catecholamine: true }],
    syringePerMl: 64, doses: 'ICU 0.05–0.5 µg/kg/min; label start 8–12 µg/min, maintain 2–4', onset: 'onset 1–2 min, offset 2–3 min (t½ 2–2.5 min)', ir: '?', src: 'NE label; T6.2', tag: 'ENG' },
  { id: 'epinephrine', name: 'Epinephrine', cls: 'mixedAdrenergic', amountUnit: 'mcg', pk: vaso(0.1, 0.05, 1.0),
    pd: [
      { target: 'hr', emax: 0.5, ec50: 0.05, beta: true, catecholamine: true }, { target: 'ees', emax: 0.6, ec50: 0.04, beta: true, catecholamine: true },
      // FU-7 (addendum 21): the β2 VASODILATOR arm is β2-tagged, so only NON-SELECTIVE blockade removes it and the α
      // rise goes unopposed (M10 ch. 14; the anaphylaxis/β-blockade teaching case, DI-05/DI-41)
      { target: 'svr', emax: -0.1, ec50: 0.02, beta: true, beta2: true, catecholamine: true }, { target: 'svr', emax: 1.2, ec50: 0.2, catecholamine: true },
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
    pd: [{ target: 'betaBlock', emax: 0.9, ec50: 100 }, { target: 'hr', emax: -0.35, ec50: 250 }, { target: 'ees', emax: -0.2, ec50: 250 }, { target: 'avNode', emax: 0.5, ec50: 150 }], // FU-2 E-FU2-6: AV-nodal block (AF rate control) [ENG]
    syringePerMl: 10000, doses: 'load 0.5 mg/kg over 1 min (peri-op 1 mg/kg over 30 s); 50–300 µg/kg/min', onset: 'distribution t½ 2 min, elimination t½ 9 min (label; the PK set reproduces both)', ir: '?', src: 'Esmolol label (CL 285 mL/kg/min, Vss 3.4 L/kg, t½ 2/9 min); T6.2; β occupancy [ENG]', tag: 'ENG' },
  { id: 'labetalol', name: 'Labetalol', cls: 'betaBlocker', amountUnit: 'mg', pk: gammaPk(10, false, 300, 14400),
    pd: [{ target: 'betaBlock', emax: 0.6, ec50: 1 }, { target: 'hr', emax: -0.3, ec50: 1 }, { target: 'ees', emax: -0.2, ec50: 1 }, { target: 'svr', emax: -0.25, ec50: 1 }, { target: 'avNode', emax: 0.4, ec50: 2 }], // FU-2 E-FU2-6 [ENG]
    doses: '5–20 mg IV, repeat', onset: 'onset 2–5 min, peak ≈ 5 min, 2–6 h', ir: '?', src: 'T6.2 [TXT], Q59; β occupancy [ENG]', tag: 'TXT' },
  { id: 'metoprolol', name: 'Metoprolol', cls: 'betaBlocker', amountUnit: 'mg', pk: gammaPk(2.5, false, 1200, 21600),
    pd: [{ target: 'betaBlock', emax: 0.7, ec50: 1 }, { target: 'hr', emax: -0.3, ec50: 1 }, { target: 'ees', emax: -0.2, ec50: 1 }, { target: 'avNode', emax: 0.5, ec50: 2 }], // FU-2 E-FU2-6 [ENG]
    doses: '1–5 mg IV', onset: 'onset 2–5 min, peak 20 min (tpS 1200), 3–6 h', ir: '?', src: 'T6.2 [TXT], Q59; β occupancy [ENG]', tag: 'TXT' },
  // FU-7 (addendum 21): glucagon — the rescue when β receptors are occupied (β-blocker overdose, β-blocked anaphylaxis):
  // it raises cAMP through the glucagon receptor, DOWNSTREAM of the β receptor, so its entries are NOT `beta`-shifted.
  { id: 'glucagon', name: 'Glucagon', cls: 'metabolic', amountUnit: 'mg', pk: gammaPk(1, false, 420, 3600),
    pd: [{ target: 'hr', emax: 0.2, ec50: 1 }, { target: 'ees', emax: 0.35, ec50: 1 }, { target: 'glucose', emax: 60, ec50: 1 }],
    doses: '1–5 mg IV bolus, then 1–5 mg/h (β-blocker overdose: ACMT/AHA); 1 mg for hypoglycaemia',
    onset: 'onset 1–3 min, peak 5–7 min, duration 15–30 min; nausea and hyperglycaemia are expected',
    ir: '?', src: 'ACMT β-blocker-toxicity guidance; AHA 2010 toxicology (glucagon 3–10 mg); T6.2 sizes [ENG]', tag: 'ENG' },
  { id: 'amiodarone', name: 'Amiodarone', cls: 'antiarrhythmic', amountUnit: 'mg', pk: gammaPk(150, false, 600, 7200),
    // FU-7 (addendum 23): antiarrhythmic occupancy — ec50 one 150 mg reference dose (conversion hazards; shock success)
    pd: [{ target: 'hr', emax: -0.2, ec50: 1 }, { target: 'svr', emax: -0.3, ec50: 1 }, { target: 'avNode', emax: 0.3, ec50: 1 }, { target: 'antiarrhythmic', emax: 1, ec50: 1 }],
    doses: '150 mg over 10 min; arrest 300 mg then 150 mg', onset: 'acute effects over 10–60 min; QTc +20–40 ms [ENG]; raises AF→sinus conversion (Stage 5 hook, Task 16)', ir: '?', src: 'T6.2 antiarrhythmic paragraph', tag: 'TXT' },
  // FU-7 (addendum 23): procainamide — PROCAMIO's comparator (67 % VT termination at 40 min vs amiodarone 25 %), with the
  // hypotension that limits it. Gamma row: peak 10 min after a 10 mg/kg load over 20 min, 10 % at 4 h [label].
  { id: 'procainamide', name: 'Procainamide', cls: 'antiarrhythmic', amountUnit: 'mg', pk: gammaPk(1000, false, 600, 14400),
    pd: [{ target: 'antiarrhythmic', emax: 1, ec50: 1 }, { target: 'svr', emax: -0.25, ec50: 1 }, { target: 'ees', emax: -0.15, ec50: 1 }, { target: 'avNode', emax: 0.2, ec50: 1 }],
    doses: '10 mg/kg IV over 20 min (max 17 mg/kg), stop on hypotension or QRS widening > 50 %',
    onset: 'effect during the infusion, peak ≈ 10 min after it; QRS and QT widen (label)',
    ir: '?', src: 'PROCAMIO (Ortiz 2017); label; sizes [ENG]', tag: 'ENG' },
  // FU-7 (D13, DI-15): verapamil — AV-nodal block with vasodilation; in PRE-EXCITED AF it is the classic hazard
  // (blocking the node favours the accessory pathway: Step 4's rule), and it is contraindicated there (ALS).
  { id: 'verapamil', name: 'Verapamil', cls: 'antiarrhythmic', amountUnit: 'mg', pk: gammaPk(5, false, 300, 7200),
    pd: [{ target: 'avNode', emax: 0.7, ec50: 1 }, { target: 'svr', emax: -0.3, ec50: 1 }, { target: 'ees', emax: -0.2, ec50: 1 }, { target: 'hr', emax: -0.15, ec50: 1 }],
    doses: '2.5–5 mg IV over 2 min, repeat to 20 mg (SVT rate control)', onset: 'onset 1–2 min, peak 3–5 min, 30–60 min',
    ir: '?', src: 'label; T6.2 [TXT]; sizes [ENG]', tag: 'ENG' },
  { id: 'adenosine', name: 'Adenosine', cls: 'adenosine', amountUnit: 'mg', pk: gammaPk(6 / 70, true, 15, 30),
    pd: [{ target: 'avNode', emax: 1, ec50: 0.42, hill: 2 }, { target: 'svr', emax: -0.3, ec50: 1 }],
    doses: '6 mg rapid push + flush, then 12 mg (central line: half)', onset: 'AV block 3–10 s, 10–30 s after the push (R03 §8.6; brief §4.9); plasma t½ < 10 s', ir: '?', src: 'R03 §8.6; decision 11 (E 0.85 at 6 mg / 70 kg, 0.59 at 3 mg, 0.96 at 12 mg)', tag: 'ENG' },
];
