// BF group B — P1 electrolyte extremes: hyperkalaemia 6.5 / 7.5 / 8.5 (profile and acute) and its treatments
// (matrix BF-07, BF-08). Run after group A, as the brief orders (fluid, transfusion and acid–base cells first).
// FU-4 G3 (potassium beyond morphology: arrhythmia and arrest) is NOT merged on this branch: those items are FU-4 pending.
import { add, AW, d, dAt, dMin, G, m, mn, mx, T, v, XA } from './spec.ts';
import type { ArmResult, Row } from './runner.ts';

const W = 900; // read window after the insult
/** Burns severity that makes succinylcholine 1.5 mg/kg peak at plasma K ≈ target from 4.2 (7c suxDeltaK: +0.5 + 6·burns at 4 min). */
const burnsFor = (k: number) => Math.round(((k - 4.7) / 6) * 1000) / 1000;
const malignant = (r: Row) => ['vfCoarse', 'vfFine', 'asystole', 'pWaveAsystole', 'agonal', 'vtMono', 'vtPoly', 'torsades', 'chb', 'junctional', 'idioventricular', 'sinusBrady'].includes(r.rhythm as string) || r.pulseless === true || r.noEject === true;
const rhythmsOf = (R: ArmResult) => R.rhythms.map(([t, id]) => `${t}s ${id}`).join(' → ');

for (const [id, K, band] of [['BF-07a', 6.5, 'peaked T only'], ['BF-07b', 7.5, 'P flattening, QRS widening'], ['BF-07c', 8.5, 'sine wave → VF/asystole']] as const) {
  const b = burnsFor(K);
  const arms = {
    p: G([], T + W, { blood: { k: K } }), // profile: the patient arrives with K = K
    a: G([d(T, 'succinylcholine', 1.5, 'mg/kg')], T + W, { blood: { burns: b } }), // acute: burns + succinylcholine → peak ≈ K at +4 min
  };
  const expect = id === 'BF-07a'
    ? [{ m: 'ecgKProfile', lo: K - 0.3, hi: K + 0.3, src: 'the ECG reads the patient\'s plasma K (brief §5 electrolytes; UK Renal Association 2023: K ≥ 6.5 is ECG-significant)' },
      { m: 'ecgKAcutePeak', lo: K - 0.5, hi: K + 0.5, src: 'the same K reached acutely shows on the ECG (7c plan decision 9)' },
      { m: 'arrestAny', event: false, src: 'K 6.5: peaked T, arrhythmia uncommon (UK RA 2023; Mattu 2000 Am J Emerg Med 18:721)' }]
    : id === 'BF-07b'
      ? [{ m: 'ecgKProfile', lo: K - 0.3, hi: K + 0.3, src: 'the ECG reads the plasma K (brief §5)' },
        { m: 'qrsProfile', lo: 110, hi: 180, src: 'K 7–8: P flattening, QRS widening (Mattu 2000; Stage 5.1 morphology: QRS +20–100 % from K 7)' },
        { m: 'qrsAcutePeak', lo: 110, hi: 180, src: 'as above, acute rise (Mattu 2000)' }]
      : [{ m: 'ecgKProfile', lo: K - 0.3, hi: K + 0.3, src: 'the ECG reads the plasma K (brief §5)' },
        { m: 'qrsAcutePeak', lo: 140, hi: 300, src: 'K ≥ 8: sine wave (Mattu 2000; Stage 5.1: complete at 8.5)' },
        { m: 'malignantAny', event: true, src: 'research/12 BF-07: VF/asystole/conduction block from K 8–9 (UK RA 2023; ERC 2021 special circumstances)' }];
  add({ id, tier: 'P1', ctx: 'X-A GA vent', state: `hyperkalaemia ${K} (profile blood.k ${K}; acute: burns ${b} + succinylcholine 1.5 mg/kg)`, intv: `none — the state itself (${band})`, sys: 'BLD RHY CIRC',
    arms, measure: (R) => m({
      kProfile: v(R.p!.rows, 'k', T + 60), ecgKProfile: v(R.p!.rows, 'ecgK', T + 60), qrsProfile: mx(R.p!.rows, 'qrs', T, T + W),
      kAcutePeak: mx(R.a!.rows, 'k', T, T + W), ecgKAcutePeak: mx(R.a!.rows, 'ecgK', T, T + W), qrsAcutePeak: mx(R.a!.rows, 'qrs', T, T + W),
      mapMinAcute: mn(R.a!.rows, 'map', T, T + W), hrMinAcute: mn(R.a!.rows, 'hr', T, T + W),
      arrestAny: [R.p!, R.a!].some((x) => x.rows.some((r) => (r.t as number) > T && (r.pulseless === true || r.noEject === true))),
      malignantAny: [R.p!, R.a!].some((x) => x.rows.some((r) => (r.t as number) > T && malignant(r))),
      rhythmsAcute: rhythmsOf(R.a!) || 'sinus', rhythmsProfile: rhythmsOf(R.p!) || 'sinus',
    }),
    expect, owner: 'FU-4 G3 (+ 7c pipeline.ts bloodEcgTargets, F2)', fu4: true,
    hand: { verdict: 'WR', why: id === 'BF-07c'
      ? 'the acute rise to 8.5 draws a sine wave (QRS 253 ms) in sinus rhythm at MAP 95 for 15 min with no VF, asystole or block (FU-4 G3 pending: K acts on morphology only); the PROFILE patient with K 8.5 shows a normal ECG (ecgK 4.2, QRS 93) because only the change from the profile set point reaches the ECG (F2, new)'
      : `the acute rise shows on the ECG (ecgK ${K - 0.02}), but the PROFILE patient with the same plasma K ${K} shows a normal ECG (ecgK 4.2, QRS 93): bloodEcgTargets pushes only kEcg − set point (blood/pipeline.ts:210) into a Modifiers.k that starts at 4.2 (modifiers.ts:16) — the displayed ECG contradicts the plasma K (F2, new)` } });
}

// ---- BF-08: hyperkalaemia 7.5 — calcium, insulin–dextrose, salbutamol, bicarbonate, furosemide --------------------------
{
  const P = { blood: { k: 7.5 } };
  const L = 3 * 3600;
  const arms = {
    ca: G([d(T, 'calciumChloride', 1, 'g')], T + 1800, P, { dt: 10 }), cc: G([], T + 1800, P, { dt: 10 }),
    // acute route (the ECG path works only for a K CHANGE on this branch, BF-07): burns + sux, calcium at the peak
    aca: G([d(T, 'succinylcholine', 1.5, 'mg/kg'), d(T + 240, 'calciumChloride', 1, 'g')], T + 1800, { blood: { burns: burnsFor(7.5) } }, { dt: 5 }),
    acc: G([d(T, 'succinylcholine', 1.5, 'mg/kg')], T + 1800, { blood: { burns: burnsFor(7.5) } }, { dt: 5 }),
    ins: G([d(T, 'insulinDextrose', 10, 'units')], T + 3600, P, { dt: 10 }), sb: G([d(T, 'salbutamol', 10, 'mg')], T + 3600, P, { dt: 10 }),
    hc: G([d(T, 'sodiumBicarbonate', 50, 'mmol')], T + 3600, P, { dt: 10 }), c60: G([], T + 3600, P, { dt: 10 }),
    fu: G([d(T, 'furosemide', 40, 'mg')], T + L, P, { dt: 30 }), fc: G([], T + L, P, { dt: 30 }),
  };
  add({ id: 'BF-08a', tier: 'P1', ctx: 'X-A GA vent', state: 'hyperkalaemia 7.5 (profile; and acute sux + burns)', intv: 'calcium chloride 1 g: ECG reversal without lowering K', sys: 'RHY BLD',
    arms, measure: (R) => m({
      dK5min: dAt(R.ca!.rows, R.cc!.rows, 'k', T + 300), ecgKProfileBase: v(R.cc!.rows, 'ecgK', T), ecgKProfileAfterCa: mn(R.ca!.rows, 'ecgK', T, T + 600),
      // resume fix: read at 2 min after the calcium (T + 360), while the succinylcholine K pulse is still near its peak
      qrsAcuteNoCa: v(R.acc!.rows, 'qrs', T + 360), qrsAcuteCa: v(R.aca!.rows, 'qrs', T + 360), dQrsCa3min: Math.round(v(R.aca!.rows, 'qrs', T + 360) - v(R.acc!.rows, 'qrs', T + 360)),
      kAcute: v(R.acc!.rows, 'k', T + 360), ecgKAcuteCa: v(R.aca!.rows, 'ecgK', T + 360),
    }),
    expect: [{ m: 'dK5min', quiet: true, tol: 0.15, src: 'calcium stabilises the membrane without lowering K (UK Renal Association 2023)' },
      { m: 'dQrsCa3min', dir: -1, tol: 10, src: 'calcium narrows the QRS within 1–3 min (UK RA 2023; research/12 BF-08)' },
      { m: 'ecgKProfileAfterCa', lo: 3.5, hi: 7.6, src: 'calcium must not push the ECG into hypokalaemic morphology (a quiet check on the displayed K)' }],
    owner: '7c pipeline.ts bloodEcgTargets (F2) / FU-4 G3', fu4: true,
    hand: { verdict: 'WR', why: 'in the PROFILE hyperkalaemic patient, calcium drives the displayed ECG K from 4.2 to 3.1 — the monitor shows HYPOkalaemic morphology (U waves) in a patient with K 7.5 (F2); the acute arm is graded on the QRS' } });
  add({ id: 'BF-08b', tier: 'P1', ctx: 'X-A GA vent, profile K 7.5', state: 'hyperkalaemia 7.5', intv: 'insulin 10 U + dextrose 25 g: K at 30 and 60 min', sys: 'BLD',
    arms, measure: (R) => m({ dK30: dAt(R.ins!.rows, R.c60!.rows, 'k', T + 1800), dK60: dAt(R.ins!.rows, R.c60!.rows, 'k', T + 3600), dGluMin: dMin(R.ins!.rows, R.c60!.rows, 'glu', T, T + 3600) }),
    expect: [{ m: 'dK60', lo: -1.0, hi: -0.6, src: 'insulin–dextrose: K −0.6 to −1.0 mmol/L at 30–60 min (UK Renal Association 2023; research/12 BF-08)' }],
    owner: '7c treatments.ts' });
  add({ id: 'BF-08c', tier: 'P1', ctx: 'X-A GA vent, profile K 7.5', state: 'hyperkalaemia 7.5', intv: 'salbutamol 10 mg nebulised: K at 30 and 60 min; HR', sys: 'BLD CIRC',
    arms, measure: (R) => m({ dK30: dAt(R.sb!.rows, R.c60!.rows, 'k', T + 1800), dK60: dAt(R.sb!.rows, R.c60!.rows, 'k', T + 3600), dHrMax: Math.round(mx(R.sb!.rows, 'hr', T, T + 3600) - mx(R.c60!.rows, 'hr', T, T + 3600)) }),
    expect: [{ m: 'dK30', lo: -1.0, hi: -0.5, src: 'nebulised salbutamol 10–20 mg: K −0.5 to −1.0 within 30 min (UK RA 2023; Allon 1989 Ann Intern Med 110:426)' }],
    owner: '7g salbutamol kShift / 7c' });
  add({ id: 'BF-08d', tier: 'P1', ctx: 'X-A GA vent, profile K 7.5 (normal pH)', state: 'hyperkalaemia 7.5 without acidosis', intv: 'sodium bicarbonate 50 mmol (K at 60 min); furosemide 40 mg (K at 3 h)', sys: 'BLD KID',
    arms, measure: (R) => m({ dKBicarb60: dAt(R.hc!.rows, R.c60!.rows, 'k', T + 3600), dKFuro3h: dAt(R.fu!.rows, R.fc!.rows, 'k', T + L), dUopFuro: Math.round(mx(R.fu!.rows, 'uop', T, T + 3600) - v(R.fc!.rows, 'uop', T + 1800)) }),
    expect: [{ m: 'dKBicarb60', lo: -0.4, hi: 0, src: 'bicarbonate alone barely lowers K without acidosis (Blumberg 1988 Am J Med 85:507; UK RA 2023: not first line)' },
      { m: 'dKFuro3h', dir: -1, tol: 0.1, src: 'loop diuretic: kaliuresis over hours if the kidney works (UK RA 2023)' }],
    dirOnly: true, owner: '7d organs/pipeline.ts renalSeam (F6)', hand: { verdict: 'TW', why: 'furosemide raises urine by 173 mL/h but K falls only 0.01 in 3 h: the seam excretes K at a FIXED urine concentration (organs/pipeline.ts:168–172), independent of plasma K, aldosterone or the loop diuretic, while the lost water concentrates the rest' } });
}
export { AW, XA };
