// DI group D — antiarrhythmics × rhythm × hypotension, anticholinergic × opioid bradycardia, local-anaesthetic
// toxicity × lipid, electrolyte/metabolic therapy, diuretics × volume, dantrolene × MH (matrix DI-13, DI-14, DI-15,
// DI-16, DI-23, DI-24, DI-26, DI-27, DI-28, DI-38, DI-39, DI-40 plus the atropine-timing and MH cells).
import { A } from './runner.ts';
import { add, dWin, anyR, arrestIn, CL2, d, dMax, dMin, hemo, inf, m, mn, mx, pctMin, pctWin, SP, T, V, vap, XA } from './spec.ts';
import { mean, type Row } from './runner.ts';

const firstAt = (rows: Row[], t0: number, f: (r: Row) => boolean): number => { for (const r of rows) if ((r.t as number) >= t0 && f(r)) return (r.t as number) - t0; return NaN; };
const rh = (R: { rhythms: [number, string][] }) => R.rhythms.map(([t, id]) => `${t}s ${id}`).join(',') || 'unchanged';

// ---- antiarrhythmics -------------------------------------------------------------------------------------------------
add({ id: 'DI-13a', tier: 'P1', ctx: 'X-A vent, VF arrest with CPR', state: 'VF', intv: 'amiodarone 300 mg during CPR', sys: 'RHY CIRC',
  arms: { i: V([[T, A.rhythm('vfCoarse'), 'VF'], [T + 30, { type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 1 } } as never, 'CPR'], d(T + 150, 'epinephrine', 1, 'mg'), d(T + 210, 'amiodarone', 300, 'mg')], T + 900, XA, { dt: 5 }),
    c: V([[T, A.rhythm('vfCoarse'), 'VF'], [T + 30, { type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 1 } } as never, 'CPR'], d(T + 150, 'epinephrine', 1, 'mg')], T + 900, XA, { dt: 5 }) },
  measure: (R) => m({ rhythmsWithAmio: rh(R.i!), rhythmsWithout: rh(R.c!), etco2CPR: mx(R.i!.rows, 'etco2', T + 60, T + 900), mapCPR: mx(R.i!.rows, 'map', T + 60, T + 900),
    amioCe: Math.round(mx(R.i!.rows, 'c_amiodarone', T + 210, T + 900) * 100) / 100, stillVF: (R.i!.rows.at(-1)!.rhythm as string) }),
  expect: [{ m: 'amioCe', dir: 1, tol: 0, src: 'the drug must reach an effect site during CPR (ALS 2021: amiodarone 300 mg after the third shock)' }],
  owner: 'DV/FU-7 (shock outcome has no drug or myocardial term)', hand: { verdict: 'MI', why: 'amiodarone reaches its site (Ce 2 ref units) but nothing reads it during VF: the shock outcome context (l3/defib-pacer/outcome.ts:41–72) has only rhythm class, energy, VF duration and R-on-T — no antiarrhythmic, adrenaline, K⁺ or perfusion term' } });
add({ id: 'DI-13b', tier: 'P1', ctx: 'X-A vent, AF with rapid ventricular response', state: 'AF ≈ 140/min', intv: 'amiodarone 150 mg over 10 min vs esmolol 0.5 mg/kg', sys: 'RHY CIRC',
  arms: { a: V([[T, A.rhythm('afib', { rateBpm: 140 }), 'AF 140'], d(T + 120, 'amiodarone', 150, 'mg', { overS: 600 })], T + 1500),
    e: V([[T, A.rhythm('afib', { rateBpm: 140 }), 'AF 140'], d(T + 120, 'esmolol', 0.5, 'mg/kg')], T + 1500),
    c: V([[T, A.rhythm('afib', { rateBpm: 140 }), 'AF 140']], T + 1500) },
  // resume fix: hrBase is the mean, not the max of an irregular rhythm
  measure: (R) => m({ hrBase: Math.round(mean(R.c!.rows, 'hr', T + 30, T + 120)), hrAmio: Math.round(dWin(R.a!.rows, R.c!.rows, 'hr', T + 600, T + 1200)), hrEsmolol: Math.round(dWin(R.e!.rows, R.c!.rows, 'hr', T + 150, T + 450)), // windowed means: single 5-s samples of AF are noisy
    mapPctAmio: pctMin(R.a!.rows, R.c!.rows, 'map', T + 120, T + 1200), mapPctEsmolol: pctMin(R.e!.rows, R.c!.rows, 'map', T + 120, T + 1200),
    avNodeAmio: Math.round(mx(R.a!.rows, 'avNode', T + 120, T + 1200) * 100) / 100, rhythmsAmio: rh(R.a!) }),
  expect: [{ m: 'hrAmio', lo: -45, hi: -10, src: 'amiodarone slows AF conduction: HR −10 % and more with the AV-nodal effect (tables §6.2; ALS)' },
    { m: 'mapPctAmio', lo: -25, hi: -3, src: 'tables §6.2: SVR −10–20 % with the solvent on rapid injection' },
    { m: 'hrEsmolol', lo: -50, hi: -12, src: 'esmolol is the fast rate-control option (tables §6.2; FU-2 E-FU2-6 AV-nodal block)' }],
  owner: '7g rows (amiodarone) / 7a rate rule' });
add({ id: 'DI-14a', tier: 'P1', ctx: 'X-A vent, AVNRT 180/min', state: 'AV-node-dependent SVT', intv: 'adenosine 6 mg then 12 mg', sys: 'RHY CIRC',
  arms: { i: V([[T, A.rhythm('svtAvnrt', { rateBpm: 180 }), 'AVNRT 180'], d(T + 60, 'adenosine', 6, 'mg')], T + 600, XA, { dt: 1 }),
    c: V([[T, A.rhythm('svtAvnrt', { rateBpm: 180 }), 'AVNRT 180']], T + 600, XA, { dt: 1 }) },
  measure: (R) => m({ rhythms: rh(R.i!), convertedS: (() => { const s = R.i!.rhythms.find(([t, id]) => t > T + 60 && id.startsWith('sinus')); return s ? Math.round(s[0] - (T + 60)) : NaN; })(),
    pauseStartS: (() => { const s = R.i!.rhythms.find(([t, id]) => t > T + 60 && (id === 'pWaveAsystole' || id === 'sinusPause' || id.startsWith('avb'))); return s ? Math.round(s[0] - (T + 60)) : NaN; })(),
    mapNadirDuringBlock: mn(R.i!.rows, 'map', T + 60, T + 180), hrAfter: mx(R.i!.rows, 'hr', T + 240, T + 600) }),
  expect: [{ m: 'pauseStartS', lo: 3, hi: 30, invert: true, src: 'adenosine: AV block 3–10 s after the push, 10–30 s duration (research 03 §8.6; ALS)' },
    { m: 'convertedS', lo: 5, hi: 60, src: 'AVNRT terminates and sinus resumes (ALS; 7g gate: standstill 8.9 s → sinus 23.5 s)' }],
  owner: '7g hooks.ts' });
add({ id: 'DI-14b', tier: 'P1', ctx: 'X-A vent, AF 140', state: 'AF', intv: 'adenosine 6 mg (transient slowing only)', sys: 'RHY',
  arms: { i: V([[T, A.rhythm('afib', { rateBpm: 140 }), 'AF 140'], d(T + 60, 'adenosine', 6, 'mg')], T + 600, XA, { dt: 1 }), c: V([[T, A.rhythm('afib', { rateBpm: 140 }), 'AF 140']], T + 600, XA, { dt: 1 }) },
  measure: (R) => m({ rhythms: rh(R.i!), hrDrop: dMin(R.i!.rows, R.c!.rows, 'hr', T + 60, T + 180), hrAfter90s: dMin(R.i!.rows, R.c!.rows, 'hr', T + 150, T + 300), endRhythm: (R.i!.rows.at(-1)!.rhythm as string), stayedAF: (R.i!.rows.at(-1)!.rhythm as string) === 'afib' }),
  expect: [{ m: 'hrDrop', lo: -120, hi: -10, src: 'adenosine transiently slows AF and reveals the atrial activity, it does not convert it (ALS)' },
    { m: 'stayedAF', event: true, src: 'the rhythm must return to AF, not convert to sinus (ALS)' }],
  owner: '7g hooks.ts' });
add({ id: 'DI-14c', tier: 'P2', ctx: 'X-A vent, pre-excited AF', state: 'WPW with AF', intv: 'adenosine 6 mg (may accelerate)', sys: 'RHY',
  arms: { i: V([[T, A.rhythm('preexcitedAf'), 'pre-excited AF'], d(T + 60, 'adenosine', 6, 'mg')], T + 600, XA, { dt: 1 }), c: V([[T, A.rhythm('preexcitedAf'), 'pre-excited AF']], T + 600, XA, { dt: 1 }) },
  measure: (R) => m({ rhythms: rh(R.i!), hrChange: dMax(R.i!.rows, R.c!.rows, 'hr', T + 60, T + 240), hrDrop: dMin(R.i!.rows, R.c!.rows, 'hr', T + 60, T + 240), vfSeen: R.i!.rhythms.some(([, id]) => id.startsWith('vf')) }),
  expect: [{ m: 'hrChange', dir: 1, tol: 5, src: 'AV-nodal block in pre-excited AF can accelerate the accessory-pathway conduction (ALS; Miller ch. 25 arrhythmia) — a teaching hazard' }],
  owner: 'FU-7 (no accessory-pathway hazard)', hand: { verdict: 'MI', why: 'the adenosine hook (pk/hooks.ts:31) acts only on AV-node-dependent SVT, atrial rhythms and sinus; preexcitedAf is outside it and no accessory-pathway conduction exists' } });
add({ id: 'DI-15', tier: 'P2', ctx: 'pre-excited AF', state: 'WPW with AF', intv: 'verapamil', sys: 'RHY', arms: {}, expect: [], owner: 'FU-7 drug', ne: 'no calcium-channel blocker in the library (research/11 §2.13)' });
add({ id: 'DI-16', tier: 'P2', ctx: 'heart transplant', state: 'denervated heart', intv: 'atropine', sys: 'RHY', arms: {}, expect: [], owner: 'FU-7 profile', ne: 'no transplanted-heart profile (vagal tone is not a profile input)' });
add({ id: 'DI-61', tier: 'P1', ctx: 'X-A vent, monomorphic VT with a pulse', state: 'VT 150/min', intv: 'lidocaine 1.5 mg/kg vs amiodarone 150 mg', sys: 'RHY CIRC',
  arms: { l: V([[T, A.rhythm('vtMono', { rateBpm: 150 }), 'VT 150'], d(T + 60, 'lidocaine', 1.5, 'mg/kg')], T + 900), a: V([[T, A.rhythm('vtMono', { rateBpm: 150 }), 'VT 150'], d(T + 60, 'amiodarone', 150, 'mg', { overS: 600 })], T + 900), c: V([[T, A.rhythm('vtMono', { rateBpm: 150 }), 'VT 150']], T + 900) },
  measure: (R) => m({ rhythmsLido: rh(R.l!), rhythmsAmio: rh(R.a!), lidoConverted: R.l!.rhythms.some(([t, id]) => t > T + 60 && id.startsWith('sinus')), amioConverted: R.a!.rhythms.some(([t, id]) => t > T + 60 && id.startsWith('sinus')), eitherConverted: R.l!.rhythms.some(([t, id]) => t > T + 60 && id.startsWith('sinus')) || R.a!.rhythms.some(([t, id]) => t > T + 60 && id.startsWith('sinus')), mapPctLido: pctMin(R.l!.rows, R.c!.rows, 'map', T + 60, T + 600), mapPctAmio: pctMin(R.a!.rows, R.c!.rows, 'map', T + 60, T + 600),
    lidoCe: Math.round(mx(R.l!.rows, 'c_lidocaine', T + 60, T + 600) * 100) / 100 }),
  expect: [{ m: 'eitherConverted', event: true, src: 'lidocaine or amiodarone terminates a share of stable monomorphic VT (ALS; PROCAMIO) — no conversion hook exists: MI by hand' },
    { m: 'mapPctAmio', lo: -25, hi: 0, src: 'tables §6.2: amiodarone lowers SVR 10–20 % (hypotension on rapid injection)' }],
  owner: 'FU-7 (no antiarrhythmic → rhythm conversion except adenosine/Mg)', hand: { verdict: 'MI', why: 'pk/hooks.ts has conversion paths for adenosine, LAST and magnesium only (lines 31–64); amiodarone/lidocaine carry no rhythm effect beyond the AV-node occupancy' } });

// ---- anticholinergics × opioid bradycardia ---------------------------------------------------------------------------
add({ id: 'DI-62', tier: 'P1', ctx: 'X-A vent', state: 'opioid bradycardia', intv: 'fentanyl 10 µg/kg, then atropine 0.5 mg at the nadir', sys: 'RHY CIRC',
  arms: { i: V([d(T, 'fentanyl', 10, 'mcg/kg'), d(T + 300, 'atropine', 0.5, 'mg')], T + 1200), f: V([d(T, 'fentanyl', 10, 'mcg/kg')], T + 1200), c: V([], T + 1200) },
  measure: (R) => m({ hrDropFentanyl: dMin(R.f!.rows, R.c!.rows, 'hr', T, T + 600), hrAfterAtropine: dMax(R.i!.rows, R.f!.rows, 'hr', T + 300, T + 900),
    mapPctFentanyl: pctMin(R.f!.rows, R.c!.rows, 'map', T, T + 600), atropineRise: dMax(R.i!.rows, R.c!.rows, 'hr', T + 300, T + 900) }),
  expect: [{ m: 'hrDropFentanyl', lo: -30, hi: -8, src: 'fentanyl 10 µg/kg: vagal bradycardia HR −10–20 % (tables §6.3; Miller ch. 22)' },
    { m: 'hrAfterAtropine', lo: 8, hi: 45, src: 'atropine 0.5 mg reverses opioid bradycardia (Miller ch. 22; tables §6.2 HR +20–40 scaled by vagal tone)' }],
  owner: 'FU-4 G7 (vagal events)', fu4: true });
add({ id: 'DI-63', tier: 'P2', ctx: 'X-A vent', state: 'GA', intv: 'atropine 0.5 mg vs glycopyrrolate 0.4 mg (onset/offset)', sys: 'RHY PK',
  arms: { a: V([d(T, 'atropine', 0.5, 'mg')], T + 2400, XA, { dt: 10 }), g: V([d(T, 'glycopyrrolate', 0.4, 'mg')], T + 2400, XA, { dt: 10 }), c: V([], T + 2400, XA, { dt: 10 }) },
  measure: (R) => m({ atropinePeak: dMax(R.a!.rows, R.c!.rows, 'hr', T, T + 600), atropinePeakS: Math.round(((R.a!.rows.find((r) => (r.t as number) > T && (r.hr as number) === mx(R.a!.rows, 'hr', T, T + 600))?.t as number) ?? NaN) - T),
    atropineAt30min: dMax(R.a!.rows, R.c!.rows, 'hr', T + 1500, T + 1800), glycoPeak: dMax(R.g!.rows, R.c!.rows, 'hr', T, T + 1200),
    glycoPeakS: Math.round(((R.g!.rows.find((r) => (r.t as number) > T && (r.hr as number) === mx(R.g!.rows, 'hr', T, T + 1200))?.t as number) ?? NaN) - T), glycoAt30min: dMax(R.g!.rows, R.c!.rows, 'hr', T + 1500, T + 1800) }),
  expect: [{ m: 'atropinePeak', lo: 15, hi: 45, src: 'tables §6.2: atropine 0.5–1 mg HR +20–40, onset < 1 min' },
    { m: 'atropinePeakS', lo: 10, hi: 180, invert: true, src: 'atropine onset < 1 min, peak ≈ 1 min (tables §6.2)' },
    { m: 'glycoPeakS', lo: 60, hi: 600, invert: true, src: 'glycopyrrolate onset 2–3 min (tables §6.2)' },
    { m: 'glycoPeak', lo: 8, hi: 25, src: 'tables §6.2: glycopyrrolate HR +10–20' }],
  owner: '7g rows-cardiovascular.ts' });

// ---- local anaesthetic toxicity × lipid ------------------------------------------------------------------------------
add({ id: 'DI-23', tier: 'P2', ctx: 'X-A vent', state: 'after a bupivacaine block dose', intv: 'lidocaine 1.5 mg/kg IV on top of bupivacaine 100 mg (additive toxicity)', sys: 'RHY CIRC NEU',
  arms: { i: V([d(T, 'bupivacaine', 100, 'mg'), d(T + 120, 'lidocaine', 1.5, 'mg/kg')], T + 900), b: V([d(T, 'bupivacaine', 100, 'mg')], T + 900), c: V([], T + 900) },
  measure: (R) => m({ cnsBoth: Math.round(mx(R.i!.rows, 'lastCns', T, T + 900) * 100) / 100, cnsBupiOnly: Math.round(mx(R.b!.rows, 'lastCns', T, T + 900) * 100) / 100,
    cvBoth: Math.round(mx(R.i!.rows, 'lastCv', T, T + 900) * 100) / 100, cvBupiOnly: Math.round(mx(R.b!.rows, 'lastCv', T, T + 900) * 100) / 100,
    cnsExcess: Math.round((mx(R.i!.rows, 'lastCns', T + 120, T + 900) - mx(R.b!.rows, 'lastCns', T + 120, T + 900)) * 100) / 100, // resume: the additivity measure itself seizureBoth: anyR(R.i!.rows, T, T + 900, (r) => r.seizure === true), seizureBupi: anyR(R.b!.rows, T, T + 900, (r) => r.seizure === true),
    mapPct: pctMin(R.i!.rows, R.c!.rows, 'map', T, T + 900) }),
  expect: [{ m: 'cnsExcess', dir: 1, tol: 0.02, src: 'local-anaesthetic toxicity is additive between agents (ASRA 2020; Miller ch. 25): lidocaine on top of bupivacaine must raise the CNS effect' }],
  owner: '7g pipeline (cnsE/cvE take the MAXIMUM, not the sum)', hand: { verdict: 'TW', why: 'lidocaine adds nothing to bupivacaine (CNS effect 0.9 vs 0.9): pk/pipeline.ts:384–385 takes the maximum over agents, so toxicity is not additive — an interaction that is too weak, not a reversed one' } });
add({ id: 'DI-24', tier: 'P2', ctx: 'X-A vent', state: 'LAST: bupivacaine 225 mg IV', intv: 'lipid emulsion 1.5 mL/kg + 0.25 mL/kg/min at the first sign', sys: 'RHY CIRC PK',
  arms: { i: V([d(T, 'bupivacaine', 225, 'mg'), d(T + 30, 'lipidEmulsion', 1.5, 'mL/kg'), inf(T + 30, 'lipidEmulsion', 0.25, 'mL/kg/min')], T + 900, XA, { dt: 5 }),
    c: V([d(T, 'bupivacaine', 225, 'mg')], T + 900, XA, { dt: 5 }) },
  measure: (R) => m({ freeCeNoLipid: Math.round(mx(R.c!.rows, 'c_bupivacaine', T + 200, T + 300) * 100) / 100, freeCeLipid: Math.round(mx(R.i!.rows, 'c_bupivacaine', T + 200, T + 300) * 100) / 100,
    ratio: Math.round((mx(R.i!.rows, 'c_bupivacaine', T + 200, T + 300) / mx(R.c!.rows, 'c_bupivacaine', T + 200, T + 300)) * 100) / 100,
    cvNoLipid: Math.round(mx(R.c!.rows, 'lastCv', T, T + 900) * 100) / 100, cvLipid: Math.round(mx(R.i!.rows, 'lastCv', T, T + 900) * 100) / 100,
    rhythmsNoLipid: rh(R.c!), rhythmsLipid: rh(R.i!), arrestNoLipid: arrestIn(R.c!.rows, T, T + 900), arrestLipid: arrestIn(R.i!.rows, T, T + 900) }),
  expect: [{ m: 'ratio', lo: 0.4, hi: 0.75, src: 'ASRA 2020 / 7g gate: lipid lowers the free level ≥ 30 % (gate measured ×0.681)' },
    { m: 'arrestNoLipid', event: true, src: '7g decision 12: bupivacaine 225 mg → seizure, bradycardia, then VF at 78 s (untreated)' }],
  owner: '7g LAST (NR-7g-4: the engine rig at 70 kg reaches VF; the demo at 80 kg did not)' });

// ---- electrolyte and metabolic therapy --------------------------------------------------------------------------------
add({ id: 'DI-26', tier: 'P1', ctx: 'X-A vent, profile K 7.0', state: 'hyperkalaemia 7.0', intv: 'calcium chloride 1 g; insulin–dextrose; salbutamol 10 mg neb', sys: 'BLD RHY',
  arms: { ca: V([d(T, 'calciumChloride', 1, 'g')], T + 1800, { blood: { k: 7 } }, { dt: 10 }), id: V([d(T, 'insulinDextrose', 10, 'units')], T + 3600, { blood: { k: 7 } }, { dt: 10 }),
    sb: V([d(T, 'salbutamol', 10, 'mg')], T + 3600, { blood: { k: 7 } }, { dt: 10 }), both: V([d(T, 'insulinDextrose', 10, 'units'), d(T, 'salbutamol', 10, 'mg')], T + 3600, { blood: { k: 7 } }, { dt: 10 }),
    c: V([], T + 3600, { blood: { k: 7 } }, { dt: 10 }) },
  measure: (R) => m({ kBase: Math.round(mx(R.c!.rows, 'k', T - 60, T) * 100) / 100,
    dkCa5min: Math.round((mn(R.ca!.rows, 'k', T + 240, T + 300) - mx(R.c!.rows, 'k', T + 240, T + 300)) * 100) / 100,
    dkEcgCa: Math.round((mn(R.ca!.rows, 'kEcg', T + 60, T + 300) - mx(R.c!.rows, 'kEcg', T + 60, T + 300)) * 100) / 100,
    qrsBase: mx(R.c!.rows, 'qrs', T - 60, T), qrsAfterCa: mn(R.ca!.rows, 'qrs', T + 60, T + 600),
    dkInsulin30: Math.round((mn(R.id!.rows, 'k', T + 1740, T + 1800) - mx(R.c!.rows, 'k', T + 1740, T + 1800)) * 100) / 100,
    dkInsulin60: Math.round((mn(R.id!.rows, 'k', T + 3540, T + 3600) - mx(R.c!.rows, 'k', T + 3540, T + 3600)) * 100) / 100,
    dkSalbutamol30: Math.round((mn(R.sb!.rows, 'k', T + 1740, T + 1800) - mx(R.c!.rows, 'k', T + 1740, T + 1800)) * 100) / 100,
    dkBoth30: Math.round((mn(R.both!.rows, 'k', T + 1740, T + 1800) - mx(R.c!.rows, 'k', T + 1740, T + 1800)) * 100) / 100 }),
  expect: [{ m: 'dkCa5min', lo: -0.15, hi: 0.15, src: 'calcium stabilises the membrane without lowering K (UK Renal Association 2023)' },
    { m: 'dkInsulin60', lo: -1.1, hi: -0.6, src: 'insulin–dextrose: K −0.6 to −1.0 mmol/L at 30–60 min (UK Renal Association; 7c gate −0.87 at 60 min)' },
    { m: 'dkSalbutamol30', lo: -1.0, hi: -0.4, src: 'nebulised salbutamol 10–20 mg: K −0.5 to −1.0 within 30 min (UK Renal Association)' },
    { m: 'dkBoth30', dir: -1, tol: 0.5, src: 'insulin and salbutamol are additive (UK Renal Association)' }],
  owner: '7c treatments.ts' });
add({ id: 'DI-27', tier: 'P2', ctx: 'X-A vent, lactic acidosis (HCl load proxy)', state: 'metabolic acidosis at fixed minute ventilation', intv: 'sodium bicarbonate 1 mmol/kg', sys: 'BLD LUNG',
  // resume fix: 140 mmol HCl → pH 7.22 (the first run's 560 mmol gave 6.5)
  arms: { i: V([[60, A.metabolic({ acidMmol: 140, overS: 600 }), 'HCl 140 mmol'], d(900, 'sodiumBicarbonate', 70, 'mmol')], 1800), c: V([[60, A.metabolic({ acidMmol: 140, overS: 600 }), 'HCl 140 mmol']], 1800) },
  measure: (R) => m({ phBefore: Math.round(mn(R.c!.rows, 'ph', 840, 900) * 100) / 100, dPh: Math.round((mx(R.i!.rows, 'ph', 900, 1500) - mx(R.c!.rows, 'ph', 900, 1500)) * 100) / 100,
    dEtco2: dMax(R.i!.rows, R.c!.rows, 'etco2', 900, 1200), dPaco2: dMax(R.i!.rows, R.c!.rows, 'paco2', 900, 1200), dIca: Math.round((mn(R.i!.rows, 'iCa', 900, 1500) - mn(R.c!.rows, 'iCa', 900, 1500)) * 1000) / 1000,
    dNa: dMax(R.i!.rows, R.c!.rows, 'na', 900, 1500), dHco3: Math.round((mx(R.i!.rows, 'hco3', 900, 1500) - mx(R.c!.rows, 'hco3', 900, 1500)) * 10) / 10 }),
  expect: [{ m: 'dEtco2', lo: 3, hi: 9, src: '7c decision 14: 1 mmol/kg at fixed MV raises EtCO2 5–8 mmHg within 1–3 min' },
    { m: 'dPh', lo: 0.02, hi: 0.2, src: 'a small pH rise only (Miller ch. 47; 7c)' },
    { m: 'dIca', dir: -1, tol: 0.005, src: 'alkalinisation lowers ionised calcium (Miller ch. 47)' }],
  owner: '7c' });
add({ id: 'DI-28', tier: 'P2', ctx: 'X-A vent, class II bleed', state: 'class II haemorrhage', intv: 'furosemide 40 mg', sys: 'CIRC KID',
  arms: { i: V([...CL2, d(960, 'furosemide', 40, 'mg')], 2400, XA, { dt: 10 }), c: V(CL2, 2400, XA, { dt: 10 }) },
  measure: (R) => m({ mapPct: pctMin(R.i!.rows, R.c!.rows, 'map', 960, 2400), uopDelta: Math.round((mx(R.i!.rows, 'uop', 960, 2400) - mx(R.c!.rows, 'uop', 960, 2400)) * 10) / 10,
    cvpDelta: dMin(R.i!.rows, R.c!.rows, 'cvp', 960, 2400), coPct: pctMin(R.i!.rows, R.c!.rows, 'co', 960, 2400) }),
  expect: [{ m: 'uopDelta', dir: 1, tol: 5, src: 'furosemide 40 mg: diuresis within 5–30 min (7d Task 11)' },
    { m: 'mapPct', dir: -1, tol: 2, src: 'diuresis on top of hypovolaemia lowers pressure further (Miller ch. 47)' }],
  owner: '7d renal / 7g (venodilation only)' });
add({ id: 'DI-64', tier: 'P2', ctx: 'X-A vent', state: 'GA, normoglycaemia', intv: 'insulin 10 U vs dextrose 25 g (glucose course)', sys: 'END BLD',
  arms: { i: V([d(T, 'insulin', 10, 'units')], T + 3600, XA, { dt: 10 }), g: V([d(T, 'dextrose', 25, 'g')], T + 3600, XA, { dt: 10 }), c: V([], T + 3600, XA, { dt: 10 }) },
  measure: (R) => m({ gluBase: mx(R.c!.rows, 'glu', T - 60, T), gluMinInsulin: mn(R.i!.rows, 'glu', T, T + 3600), dGluInsulin60: Math.round(mn(R.i!.rows, 'glu', T + 3540, T + 3600) - mx(R.c!.rows, 'glu', T + 3540, T + 3600)),
    gluPeakDextrose: mx(R.g!.rows, 'glu', T, T + 1800), dGluDextrosePeak: Math.round(mx(R.g!.rows, 'glu', T, T + 1800) - mx(R.c!.rows, 'glu', T, T + 1800)),
    kDeltaInsulin: Math.round((mn(R.i!.rows, 'k', T, T + 3600) - mn(R.c!.rows, 'k', T, T + 3600)) * 100) / 100 }),
  expect: [{ m: 'dGluInsulin60', lo: -120, hi: -30, src: 'insulin 10 U IV: glucose falls over 30–60 min (Miller ch. 47; 7e glucose model)' },
    { m: 'dGluDextrosePeak', lo: 60, hi: 300, src: '25 g dextrose raises glucose at once (7e)' },
    { m: 'kDeltaInsulin', dir: -1, tol: 0.1, src: 'insulin shifts K into cells (tables §5b.2)' }],
  owner: '7e glucose.ts / 7c kShift' });

// ---- MH and dantrolene, bronchospasm, renal opioid ---------------------------------------------------------------------
add({ id: 'DI-65', tier: 'P1', ctx: 'X-A vent, MH-susceptible', state: 'MH triggered by sevoflurane + succinylcholine', intv: 'dantrolene 2.5 mg/kg at 20 min', sys: 'END LUNG CIRC BLD',
  arms: { i: V([vap(60, 'sevoflurane', 2, 4), d(120, 'succinylcholine', 1.5, 'mg/kg'), [180, A.cond('mh', 1), 'MH 1'], d(1380, 'dantrolene', 2.5, 'mg/kg')], 3000, XA, { dt: 10 }),
    c: V([vap(60, 'sevoflurane', 2, 4), d(120, 'succinylcholine', 1.5, 'mg/kg'), [180, A.cond('mh', 1), 'MH 1']], 3000, XA, { dt: 10 }) },
  measure: (R) => m({ etco2At10min: mx(R.c!.rows, 'etco2', 720, 780), etco2At20min: mx(R.c!.rows, 'etco2', 1320, 1380), tempAt20min: Math.round(mx(R.c!.rows, 'temp', 1320, 1380) * 10) / 10,
    kAt20min: Math.round(mx(R.c!.rows, 'k', 1320, 1380) * 100) / 100, hrAt20min: mx(R.c!.rows, 'hr', 1320, 1380),
    dEtco2_10minAfterDantrolene: dMin(R.i!.rows, R.c!.rows, 'etco2', 1380, 1980), dHr20minAfter: dMin(R.i!.rows, R.c!.rows, 'hr', 1380, 2580), dTempEnd: Math.round((mx(R.i!.rows, 'temp', 2700, 3000) - mx(R.c!.rows, 'temp', 2700, 3000)) * 10) / 10 }),
  expect: [{ m: 'etco2At10min', lo: 52, hi: 70, src: 'tables §7 check 21: EtCO2 40 → 60 by 10 min at constant MV' },
    { m: 'dEtco2_10minAfterDantrolene', lo: -40, hi: -5, src: 'tables §7 check 21: dantrolene 2.5 mg/kg → EtCO2 falls within 5–10 min' },
    { m: 'kAt20min', lo: 5.5, hi: 6.5, src: 'tables §7 check 21: K 5.5–6.5 by 20 min' }],
  owner: '7e thermal/MH + 7g dantrolene' });
add({ id: 'DI-40', tier: 'P2', ctx: 'X-A vent, bronchospasm severity 1', state: 'bronchospasm', intv: 'salbutamol 10 mg nebulised', sys: 'LUNG',
  arms: { i: V([[T, A.lung('bronchospasm', 1), 'bronchospasm 1'], d(T + 300, 'salbutamol', 10, 'mg')], T + 1500), c: V([[T, A.lung('bronchospasm', 1), 'bronchospasm 1']], T + 1500) },
  measure: (R) => m({ paco2Peak: mx(R.c!.rows, 'paco2', T, T + 1500), etco2Base: mn(R.c!.rows, 'etco2', T + 240, T + 300),
    dPaco2: dMin(R.i!.rows, R.c!.rows, 'paco2', T + 300, T + 1200), dEtco2: dMax(R.i!.rows, R.c!.rows, 'etco2', T + 300, T + 1200),
    dSpo2: dMax(R.i!.rows, R.c!.rows, 'spo2', T + 300, T + 1200), hrRise: dMax(R.i!.rows, R.c!.rows, 'hr', T + 300, T + 1200) }),
  expect: [{ m: 'dPaco2', lo: -20, hi: -2, src: 'bronchodilation in 5–15 min (FU-6 R2; GINA)' },
    { m: 'hrRise', lo: 3, hi: 30, src: 'salbutamol raises HR 10–20 % (tables §6.2 row)' }],
  owner: 'FU-6 R2 (bronchodilator response)', known: 'FU-6 R2' });
add({ id: 'DI-38', tier: 'P2', ctx: 'AKI profile', state: 'renal failure', intv: 'morphine 10 mg (M6G accumulation)', sys: 'NEU PK', arms: {}, expect: [],
  owner: 'FU-7 (active metabolites)', ne: 'MI: no active metabolite (morphine-6-glucuronide) in the PK layer; `elim.renal 0.1` only scales clearance' });
add({ id: 'DI-39', tier: 'P2', ctx: 'X-A vent, TBI (brain mass 20 mL)', state: 'raised ICP', intv: 'ketamine 1 mg/kg at constant PaCO2', sys: 'BRN CIRC',
  arms: { i: V([[60, A.cond('tbi', 1), 'TBI 1'], d(T + 300, 'ketamine', 1, 'mg/kg')], T + 1200), c: V([[60, A.cond('tbi', 1), 'TBI 1']], T + 1200) },
  measure: (R) => m({ icpBase: Math.round(mx(R.c!.rows, 'icp', T, T + 300) * 10) / 10, dIcp: Math.round((mx(R.i!.rows, 'icp', T + 300, T + 900) - mx(R.c!.rows, 'icp', T + 300, T + 900)) * 10) / 10,
    dPaco2: Math.round((mx(R.i!.rows, 'paco2', T + 300, T + 900) - mx(R.c!.rows, 'paco2', T + 300, T + 900)) * 10) / 10,
    dCbf: Math.round((mx(R.i!.rows, 'cbf', T + 300, T + 900) - mx(R.c!.rows, 'cbf', T + 300, T + 900)) * 100) / 100, mapDelta: dMax(R.i!.rows, R.c!.rows, 'map', T + 300, T + 900) }),
  expect: [{ m: 'dIcp', lo: -3, hi: 3, quiet: true, tol: 3, src: 'Zeiler 2014 / Miller ch. 21: ketamine does not raise ICP at constant PaCO2 under controlled ventilation' },
    { m: 'mapDelta', dir: 1, tol: 1, src: 'ketamine supports MAP, so CPP improves (tables §6.3)' }],
  owner: '7d brain / 7g cbfVaso' });
