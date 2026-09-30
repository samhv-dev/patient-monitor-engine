// DV group A — defibrillation of VF, CPR quality, arrest states under CPR (DV-01…05) and the P2 arrest cells
// (DV-22 CPR pauses/ROSC, DV-24 hypothermic VF, DV-25 hyperkalaemic arrest, DV-26 asphyxial arrest).
import { A, OUTCOME, VENTED, mean, r1, r2 } from './runner.ts';
import { add, anyR, arms, cpr, cprOff, epi, m, mn, mx, outcome, perfusing, pulseAt, rh, seeds, share, shock, sustained, TVF, V, VF, w, w2, XA } from './spec.ts';

const N = 40; // seeds per stochastic arm
const P = (c: Record<string, unknown>) => OUTCOME.outcomeProbabilities({ cls: 'vf', synced: false, energyJ: 200, defaultJ: 120, vfDurationS: 60, onTPeak: false, ...c });
const SRC_PARADIS = 'Paradis NA et al., JAMA 1990;263:1106 (human CPR: no ROSC below CoPP 15; ROSC group max CoPP 25.8 ± 7.4); research/12 DV-02 (15–25)';

// ---- DV-01 VF · shock 150/200 J biphasic ------------------------------------------------------------------------------
const vfShock = (J: number, tShock: number, extra: Parameters<typeof shock>[2] = {}, post: Parameters<typeof cpr>[] = []) =>
  (seed: number) => V([VF, ...shock(tShock, J, extra), ...post.map((p) => cpr(...p))], tShock + 480, XA, { seed, dt: 5 });
add({ id: 'DV-01a', tier: 'P1', ctx: 'X-A ventilated, MODELED', state: 'VF 60 s (instructor), no CPR', intv: `first shock 150 J and 200 J biphasic, ${N} seeds each (the skin's first-shock energy: philips-like → ZOLL-like fallback 120 J)`, sys: 'RHY DEV',
  arms: { ...seeds(N, (s) => vfShock(150, 120)(s)), ...Object.fromEntries(Object.entries(seeds(N, (s) => vfShock(200, 120)(s))).map(([k, v]) => [`h${k}`, v])) },
  measure: (R) => {
    const o150 = arms(R, 's').map(outcome); const o200 = arms(R, 'hs').map(outcome);
    const p = P({ energyJ: 150 });
    return m({ term150Pct: share(o150, (x) => x !== 'unchanged'), term200Pct: share(o200, (x) => x !== 'unchanged'), roscPct150: share(o150, (x) => x === 'rosc'),
      exactTermPct: r1(100 * (1 - (p.unchanged ?? 0))), exactRoscPct: r1(100 * (p.rosc ?? 0)), exactTerm50JPct: r1(100 * (1 - (P({ energyJ: 50 }).unchanged ?? 0))),
      dist150: `unchanged ${share(o150, (x) => x === 'unchanged')} / asystole ${share(o150, (x) => x === 'asystole')} / pea ${share(o150, (x) => x === 'pea')} / rosc ${share(o150, (x) => x === 'rosc')} %` });
  },
  expect: [{ m: 'term150Pct', lo: 85, hi: 99, src: 'first biphasic shock terminates VF (removes it ≥ 5 s) in 85–98 %: Schneider T et al., Circulation 2000;102:1780 (ORBIT, 150 J: 96 %); van Alem AP et al., Resuscitation 2003;58:17 (biphasic 98 %) [VERIFY exact figures]' },
    { m: 'term200Pct', lo: 85, hi: 99, src: 'as above (ERC 2021 ALS: first biphasic shock ≥ 150 J)' }],
  hand: { verdict: 'TW', why: 'VF_TABLE persistent 0.3 (l3/defib-pacer/outcome.ts:10) gives 70 % termination at every energy ≥ 50 % of the skin default — the monophasic-era figure; biphasic first-shock termination is ≈ 90–98 %. The share that does terminate is split as the table says (asystole 30 / PEA 30 / ROSC 10 %)' },
  owner: 'L3 outcome.ts VF_TABLE (calibration R44; the same file FU-7 Task 12 edits under E-FU7-6)' });

add({ id: 'DV-01b', tier: 'P1', ctx: 'X-A ventilated, MODELED', state: 'VF 60 s (instructor)', intv: `shock 200 J, then CPR q 0.8 from +20 s for 8 min, ${N} seeds: the post-shock rhythm and what CPR does to each`, sys: 'RHY CIRC',
  arms: seeds(N, (s) => V([VF, ...shock(120, 200), cpr(140, 0.8)], 620, XA, { seed: s, dt: 5 })),
  measure: (R) => {
    const all = arms(R, 's');
    const oc = all.map(outcome);
    const term = oc.filter((x) => x !== 'unchanged');
    const pea = all.filter((r) => outcome(r) === 'pea');
    const asy = all.filter((r) => outcome(r) === 'asystole');
    const peaBack = pea.filter((r) => Number.isFinite(pulseAt(r.rows, 130, 620))).length;
    const asyBack = asy.filter((r) => anyR(r.rows, 130, 620, (x) => x.rhythm !== 'asystole')).length;
    return m({ nTerm: term.length, asystoleOfTermPct: share(term, (x) => x === 'asystole'), peaOfTermPct: share(term, (x) => x === 'pea'), roscOfTermPct: share(term, (x) => x === 'rosc'),
      nPea: pea.length, peaRegainPct: r1((100 * peaBack) / Math.max(1, pea.length)), peaRegains: peaBack > 0,
      peaCppMean: pea.length ? r1(mean(pea[0]!.rows, 'cpp', 300, 620)) : NaN, peaMyoEnd: pea.length ? r2(pea[0]!.rows[pea[0]!.rows.length - 1]!.myo as number) : NaN,
      peaArrestDeclared: pea.some((r) => anyR(r.rows, 130, 620, (x) => x.arrest !== '')), nAsy: asy.length, asyLeavesPct: r1((100 * asyBack) / Math.max(1, asy.length)) });
  },
  expect: [{ m: 'peaRegains', event: true, src: 'ERC 2021 ALS: compressions resume at once after the shock because the post-shock heart is stunned; an organised post-shock rhythm on a heart that fibrillated for only 1 min and is perfused at CoPP > 15 regains a pulse under CPR (Weisfeldt & Becker 2002 electrical/circulatory phase; the engine\'s own roscStep rule, CPP ≥ 15 and myocardial state ≥ 0.4 for 60 s)' },
    { m: 'roscOfTermPct', lo: 5, hi: 40, src: 'post-shock rhythm after termination: asystole or an organised non-perfusing rhythm in most, immediate ROSC in a minority (research/12 DV-01; van Alem 2003) — direction proposal' }],
  hand: { verdict: 'WR', why: 'a PEA produced by a SHOCK is a pulseless sinus with no declared arrest (c.arrest stays null: only arrestStep/hypoxicArrestRequest set it, hemo/pipeline.ts:401–404), so roscStep (arrest.ts:136–139) and peaDecayStep (arrest.ts:112–113) both return at `if (!a)`: under 8 min of CPR at CoPP 27–28 with a fully recovered myocardium (state 1.00) not one shock-PEA regained a pulse, and none decayed. The same holds for any instructor-set PEA. Asystole after a shock stays asystole for ever (Q3 ruling), even on a myocardium at 1.00' },
  owner: 'FU-4 arrest machine (hemo/pipeline.ts:397–417; device-layer.ts:199–226) — new: a shock/instructor PEA must enter the arrest state' });

add({ id: 'DV-01c', tier: 'P1', ctx: 'X-A ventilated, MODELED', state: 'VF 1 min vs 8 min (no CPR) vs 8 min with the last 3 min under CPR q 0.8', intv: 'shock 200 J pre-selected to an organised rhythm (sinus) — does the circulation sustain it? — plus the table\'s ROSC probability for each state', sys: 'RHY CIRC',
  arms: { early: V([VF, ...shock(120, 200, { pre: 'sinus' })], 600, XA, { dt: 5 }), late: V([VF, ...shock(540, 200, { pre: 'sinus' })], 1020, XA, { dt: 5 }),
    lateCpr: V([VF, cpr(360, 0.8), ...shock(540, 200, { pre: 'sinus' }), cprOff(538)], 1020, XA, { dt: 5 }) },
  measure: (R) => {
    const pE = P({ vfDurationS: 60 }), pL = P({ vfDurationS: 480 });
    return m({ sustEarly: sustained(R.early!.rows, 135, 420), sustLate: sustained(R.late!.rows, 555, 840), sustLateCpr: sustained(R.lateCpr!.rows, 555, 840),
      myoPreEarly: r2(R.early!.rows.find((r) => r.t === 120)!.myo as number), myoPreLate: r2(R.late!.rows.find((r) => r.t === 540)!.myo as number), myoPreLateCpr: r2(R.lateCpr!.rows.find((r) => r.t === 535)!.myo as number),
      cppCpr: w(R.lateCpr!.rows, 'cpp', 420, 535), pRoscEarlyPct: r1(100 * (pE.rosc ?? 0)), pRoscLatePct: r1(100 * (pL.rosc ?? 0)),
      pRoscLateCprPct: r1(100 * (pL.rosc ?? 0)), cprRaisesProbability: (pL.rosc ?? 0) > (pL.rosc ?? 0), lateRhythms: `late: ${R.late!.rhythms.map(([t, id]) => `${t} ${id}`).join(', ')}` });
  },
  expect: [{ m: 'sustEarly', event: true, src: 'Weisfeldt & Becker, JAMA 2002;288:3035 (electrical phase 0–4 min: an early shock restores a perfusing rhythm)' },
    { m: 'sustLate', event: false, src: 'Weisfeldt & Becker 2002 (circulatory phase 4–10 min: a shock without prior CPR yields a non-perfusing rhythm)' },
    { m: 'sustLateCpr', event: true, src: 'Weisfeldt & Becker 2002; Wik 2003 JAMA 289:1389 (CPR before the shock in the circulatory phase improves ROSC)' },
    { m: 'cprRaisesProbability', event: true, src: 'research/12 DV-01: ROSC probability rises with CoPP (Paradis 1990; Niemann) — the shock table has no CoPP input' }],
  hand: { verdict: 'WR', why: 'the physiology is right (1 min sustains; 8 min no-CPR re-arrests through the low-flow rule within 20 s; 8 min with 3 min of CPR sustains, myocardial state 0.02 vs 0.9 at the shock). The shock TABLE ignores it: ROSC 5 % at 8 min whether or not CPR ran (outcome.ts ShockContext has no CoPP or myocardial input). FU-7 Task 12 adds `cppMmHg`' },
  known: 'FU-7 Task 12', owner: 'L3 outcome.ts ShockContext (FU-7 Task 12, E-FU7-6)' });

// ---- DV-02 VF · CPR quality 1 / 0.4 -----------------------------------------------------------------------------------
const cprArm = (q: number) => V([VF, cpr(120, q)], 600, XA, { dt: 5 });
add({ id: 'DV-02a', tier: 'P1', ctx: 'X-A ventilated, MODELED', state: 'VF (instructor) at 60 s', intv: 'CPR quality 1.0 (and the default 0.8) from 120 s: CoPP and cerebral flow over minutes 2–8', sys: 'CIRC BRN',
  arms: { q1: cprArm(1), q08: cprArm(0.8) },
  measure: (R) => m({ cppQ1: w(R.q1!.rows, 'cpp', 180, 600), cppQ1Max: mx(R.q1!.rows, 'cpp', 130, 600), cppQ08: w(R.q08!.rows, 'cpp', 180, 600), cbfQ1: w2(R.q1!.rows, 'cbf', 180, 600),
    coQ1: w2(R.q1!.rows, 'co', 180, 600), mapQ1: w(R.q1!.rows, 'map', 180, 600), myoQ1End: r2(R.q1!.rows[R.q1!.rows.length - 1]!.myo as number), myoQ08Max: mx(R.q08!.rows, 'myo', 180, 600) }),
  expect: [{ m: 'cppQ1', lo: 15, hi: 25, src: SRC_PARADIS },
    { m: 'cbfQ1', lo: 0.2, hi: 0.45, src: 'Meaney PA et al., Circulation 2013;128:417 (CPR quality consensus: high-quality CPR delivers ≈ 10–30 % of normal coronary and 30–40 % of cerebral flow) [VERIFY]' },
    { m: 'coQ1', lo: 1.0, hi: 1.9, src: 'CPR cardiac output 20–33 % of normal (AHA 2020 ALS physiology; Meaney 2013)' }],
  hand: { verdict: 'TS', why: 'CoPP 27 at quality 1 and 26 at the default 0.8 (FU-4 S13 already pins 25.1–28.8 as `it.fails` under R45); new here: cerebral flow 0.71 of normal under CPR, about twice the 30–40 % of the consensus — organs/brain reads cbfRel from a CPR MAP of 55 that sits on the autoregulation plateau; and the myocardial state recovers to 0.8–0.9 in VF (FU-4 `it.fails` "kIsch < 0.9 throughout", max 0.91)' },
  known: 'FU-4 S13 it.fails (CoPP) + new (CBF)', owner: 'FU-4 CPR model (circ/params.ts:109–125) for CoPP; 7d brain (CBF under CPR) — new' });

add({ id: 'DV-02b', tier: 'P1', ctx: 'X-A ventilated VCV 12 × 600, MODELED', state: 'VF + CPR quality 1', intv: 'EtCO2 during minutes 2–8 of CPR (truth and displayed)', sys: 'LUNG DEV',
  arms: { q1: cprArm(1) },
  measure: (R) => m({ etco2Q1: w(R.q1!.rows, 'etco2', 240, 600), etco2Q1Disp: w(R.q1!.rows, 'dEtco2', 240, 600), etco2Early: w(R.q1!.rows, 'etco2', 125, 180) }),
  expect: [{ m: 'etco2Q1', lo: 10, hi: 20, src: 'research/12 DV-02 (10–20; > 20 at ROSC); Sanders AB et al., JAMA 1989;262:1347 (EtCO2 during CPR 15 ± 4 in survivors vs 7 ± 5); AHA 2020 (EtCO2 < 10 = poor CPR)' }],
  owner: '3 / FU-4 (CO2 low-flow coupling, gas/coupling.ts CPR_FLOW_EXP)' });

add({ id: 'DV-02c', tier: 'P1', ctx: 'X-A ventilated, MODELED', state: 'VF', intv: 'CPR quality 0.4 vs 1.0 (poor vs good compressions)', sys: 'CIRC LUNG',
  arms: { q1: cprArm(1), q04: cprArm(0.4) },
  measure: (R) => { const c1 = mean(R.q1!.rows, 'cpp', 240, 600), c4 = mean(R.q04!.rows, 'cpp', 240, 600), e1 = mean(R.q1!.rows, 'etco2', 240, 600), e4 = mean(R.q04!.rows, 'etco2', 240, 600);
    return m({ cppQ04: r1(c4), cppRatio: r2(c4 / c1), etco2Q04: r1(e4), etco2Ratio: r2(e4 / e1), coRatio: r2(mean(R.q04!.rows, 'co', 240, 600) / mean(R.q1!.rows, 'co', 240, 600)), cbfQ04: w2(R.q04!.rows, 'cbf', 240, 600) }); },
  expect: [{ m: 'cppRatio', lo: 0.3, hi: 0.7, src: 'research/12 DV-02: poor CPR roughly halves CoPP (compression depth → flow, Edelson 2006 / Stiell 2014 depth–outcome) — proposal' },
    { m: 'etco2Ratio', lo: 0.3, hi: 0.7, src: 'research/12 DV-02: poor CPR roughly halves EtCO2 (EtCO2 tracks CPR cardiac output; Sheak 2015 Resuscitation 89:149: EtCO2 rises with depth)' }],
  owner: 'FU-4 CPR model / 3 (CO2 coupling)' });

// ---- DV-03 exsanguination · CPR alone ---------------------------------------------------------------------------------
const EXS: Parameters<typeof V>[0] = [[60, A.bleed(3000, 600), 'bleed 3000 mL / 600 s']];
add({ id: 'DV-03', tier: 'P1', ctx: 'X-A ventilated, MODELED', state: 'complete exsanguination (3 L over 10 min) → PEA', intv: 'CPR q 0.8 alone from 720 s for 10 min (no volume, no adrenaline)', sys: 'CIRC RHY',
  arms: { i: V([...EXS, cpr(720, 0.8)], 1320, XA, { dt: 5 }) },
  measure: (R) => { const rows = R.i!.rows; const tA = rows.find((r) => r.arrest !== '')?.t ?? NaN;
    return m({ arrestAtS: tA, arrestCause: String(rows.find((r) => r.arrest !== '')?.arrest ?? ''), pulseUnderCpr: Number.isFinite(pulseAt(rows, 725, 1320)), cppCpr: w(rows, 'cpp', 780, 1320), etco2Cpr: w(rows, 'etco2', 780, 1320), rhythms: R.i!.rhythms.map(([t, id]) => `${t} ${id}`).join(', ') }); },
  expect: [{ m: 'pulseUnderCpr', event: false, src: 'FU-4 ruling 3 / G-FU4-1: an empty heart cannot be pumped — no pulse returns without volume (ERC 2021 traumatic arrest: address hypovolaemia first)' },
    { m: 'cppCpr', lo: 0, hi: 12, src: 'FU-4 gate: CoPP 2.9–3.5 under CPR after a 3 L bleed-out; below Paradis\'s 15' },
    { m: 'etco2Cpr', lo: 0, hi: 10, src: 'EtCO2 during CPR tracks pulmonary blood flow (Weil 1985; AHA 2020: EtCO2 < 10 = no effective output) — compressions on an empty heart move no blood through the lungs' }],
  hand: { verdict: 'WR', why: 'the circulation is right (no pulse, CoPP 3.1), but EtCO2 reads 17.4 — as in VF with a full circulation (18.8): during CPR the gas model takes its flow from the interim quality fit `cardiacOutput` = SV_REF·CPR_SV_FRAC·quality^1.9·rate (gas/coupling.ts:38–41), not from the circulation, so EtCO2 cannot see an empty heart (or a tamponade, DV-04a). V.1 lists "CPR flow scaling" among its Requests; no stage owns it' },
  owner: 'FU-4 (arrest) — PL; new: gas/coupling.ts cardiacOutput during CPR (CO2 from the circulation\'s CPR flow)' });

// ---- DV-04 tamponade PEA · CPR; drainage ------------------------------------------------------------------------------
// FU-4 S4a rig: tamponade severity 1 from 60 s, propofol 2 mg/kg at 300 s → PEA at 470 s (seed 7, measured), agonal 580 s.
const TAMP: Parameters<typeof V>[0] = [[60, A.cond('tamponade', 1), 'tamponade severity 1'], [300, A.drug('propofol', 2, 'mg/kg'), 'propofol 2 mg/kg (FU-4 S4a)']];
const TPEA = 470;
add({ id: 'DV-04a', tier: 'P1', ctx: 'X-A ventilated, MODELED', state: 'severe tamponade + propofol 2 mg/kg → PEA at 470 s (FU-4 S4a)', intv: 'CPR q 0.8 from PEA + 60 s for 10 min (no drainage); reference: the same CPR in VF', sys: 'CIRC LUNG RHY',
  arms: { i: V([...TAMP, cpr(TPEA + 60, 0.8)], TPEA + 660, XA, { dt: 5 }), c: V(TAMP, TPEA + 660, XA, { dt: 5 }), vf: cprArm(0.8) },
  measure: (R) => { const rows = R.i!.rows; const t0 = TPEA + 60;
    return m({ arrestAtS: (rows.find((r) => r.arrest !== '')?.t as number) ?? NaN, mapPea: w(rows, 'map', TPEA + 10, t0), cppTamp: w(rows, 'cpp', t0 + 60, t0 + 600), cppVf: w(R.vf!.rows, 'cpp', 180, 600), etco2Tamp: w(rows, 'etco2', t0 + 60, t0 + 600), etco2Vf: w(R.vf!.rows, 'etco2', 180, 600),
      mapCprTamp: w(rows, 'map', t0 + 60, t0 + 600), artCprTamp: `${w(rows, 'dAbpS', t0 + 60, t0 + 600)}/${w(rows, 'dAbpD', t0 + 60, t0 + 600)}`, mapCprVf: w(R.vf!.rows, 'map', 180, 600), cvpCprTamp: w(rows, 'cvp', t0 + 60, t0 + 600),
      fwdFlowTampLpm: w2(rows, 'qFwd', t0 + 60, t0 + 600), fwdFlowVfLpm: w2(R.vf!.rows, 'qFwd', 180, 600), pulseUnderCpr: Number.isFinite(pulseAt(rows, t0, t0 + 600)), rhythms: rh(R.i!), rhythmsNoCpr: rh(R.c!) }); },
  expect: [{ m: 'pulseUnderCpr', event: false, src: 'ERC 2021 ALS special circumstances (tamponade: closed-chest compressions are unlikely to be effective until the pericardium is decompressed)' },
    { m: 'mapCprTamp', lo: 0, hi: 40, src: 'the tamponaded heart cannot fill, so compressions move little blood: arterial pressure under CPR no higher than in VF CPR (≈ 40–55 mean here) — direction proposal' },
    { m: 'cppTamp', lo: -30, hi: 15, src: 'the compressed heart cannot fill: CoPP below Paradis\'s 15 (direction proposal; a negative value, RA above aortic relaxation pressure, is consistent)' },
    { m: 'etco2Tamp', lo: 0, hi: 10, src: 'AHA 2020: EtCO2 < 10 mmHg = ineffective CPR output (direction proposal for the tamponaded heart)' }],
  hand: { verdict: 'WR', why: 'no pulse returns (right), but compressions on the tamponaded heart drive the arterial line to ≈ 174/118 (MAP 140–165, higher than CPR in VF), a rectified forward aortic flow of ≈ 12 L/min and a CVP of 55–65, while CoPP is −13 (RA above aortic relaxation pressure): the CPR chamber pressure is added on top of a tense pericardium (circ/params.ts CPR_CARDIAC_MMHG, pericardial pressure in circuit.ts) and qFwd rectifies the to-and-fro flow (model.ts:402). EtCO2 16 — the interim CPR gas flow (gas/coupling.ts:38–41), blind to the circulation' },
  owner: 'FU-4 (tamponade dynamics + CPR on volume); gas/coupling.ts for EtCO2' });
add({ id: 'DV-04b', tier: 'P1', ctx: 'X-A ventilated, MODELED', state: 'tamponade PEA under CPR', intv: 'pericardiocentesis / surgical drainage', sys: 'CIRC RHY',
  arms: { probe: V([...TAMP, cpr(TPEA + 60, 0.8), [TPEA + 180, A.cond('tamponade', 0, { volumeMl: 0 }), 'PROXY: tamponade condition reset to 0 (instructor)'], [TPEA + 180, A.raw({ type: 'applyEvent', event: { kind: 'pericardiocentesis', volumeMl: 150 } }), 'pericardiocentesis 150 mL']], TPEA + 780, XA, { dt: 5 }) },
  measure: (R) => { const rows = R.probe!.rows; const t0 = TPEA + 180; return m({ proxyPulseAfterS: pulseAt(rows, t0, t0 + 600), proxyCppAfter: w(rows, 'cpp', t0 + 20, t0 + 120), rhythms: rh(R.probe!), rejected: R.probe!.rejected.join(' | ') }); },
  expect: [], ne: 'no pericardiocentesis/drainage action (research/12 §5.8 blocker; 7h). PROBE: the instructor resetting the tamponade condition to 0 under CPR is recorded as what a drainage would do',
  owner: '7h (pericardiocentesis) / FU-7' });

// ---- DV-05 asystole · adrenaline 1 mg q 3–5 min ------------------------------------------------------------------------
const ASY: Parameters<typeof V>[0] = [[TVF, A.rhythm('asystole'), 'asystole (instructor)'], cpr(120, 0.8)];
add({ id: 'DV-05a', tier: 'P1', ctx: 'X-A ventilated, MODELED', state: 'asystole (instructor at 60 s) + CPR q 0.8 from 120 s', intv: 'adrenaline 1 mg at 240, 480, 720 s vs no drug (same CPR)', sys: 'CIRC',
  arms: { i: V([...ASY, epi(240), epi(480), epi(720)], 900, XA, { dt: 5 }), c: V(ASY, 900, XA, { dt: 5 }) },
  measure: (R) => { const i = R.i!.rows, c = R.c!.rows;
    return m({ cppCtrl: w(c, 'cpp', 200, 240), dCpp1: r1(mean(i, 'cpp', 250, 330) - mean(c, 'cpp', 250, 330)), dCpp3: r1(mean(i, 'cpp', 730, 810) - mean(c, 'cpp', 730, 810)), dMapCpr: r1(mean(i, 'map', 250, 330) - mean(c, 'map', 250, 330)), dEtco2: r1(mean(i, 'etco2', 250, 400) - mean(c, 'etco2', 250, 400)) }); },
  expect: [{ m: 'dCpp1', dir: 1, tol: 3, src: 'Paradis NA et al., JAMA 1991;265:1139 (adrenaline raises CPR CoPP; standard dose by a few mmHg, high dose more); Michael 1984 (α-agonism raises aortic diastolic pressure) — direction' }],
  owner: '7g (adrenaline α) / FU-4 CPR' });
add({ id: 'DV-05b', tier: 'P1', ctx: 'X-A ventilated, MODELED', state: 'asystole + CPR q 0.8', intv: 'adrenaline 1 mg ×3 over 10 min: rhythm course', sys: 'RHY',
  arms: { i: V([...ASY, epi(240), epi(480), epi(720)], 900, XA, { dt: 5 }) },
  measure: (R) => m({ leavesAsystole: anyR(R.i!.rows, 130, 900, (x) => x.rhythm !== 'asystole'), rosc: Number.isFinite(pulseAt(R.i!.rows, 130, 900)), myoEnd: r2(R.i!.rows[R.i!.rows.length - 1]!.myo as number) }),
  expect: [{ m: 'rosc', event: false, src: 'ERC 2021 ALS: ROSC from asystole is uncommon (non-shockable arrest, survival a few %) — in one 10-min run, none' }],
  owner: 'FU-4 (asystole stays, Q3)' });

// ---- DV-22 CPR pauses; ROSC -------------------------------------------------------------------------------------------
add({ id: 'DV-22a', tier: 'P2', ctx: 'X-A ventilated, MODELED', state: 'VF + CPR q 0.8 for 4 min', intv: 'shock 200 J pre-selected to sinus at 360 s (compressions stop 2 s before): EtCO2 at ROSC', sys: 'LUNG DEV',
  arms: { i: V([VF, cpr(120, 0.8), cprOff(358), ...shock(360, 200, { pre: 'sinus' })], 600, XA, { dt: 1 }) },
  measure: (R) => { const r = R.i!.rows; const pre = mean(r, 'dEtco2', 330, 355); const peak = mx(r, 'dEtco2', 362, 420);
    return m({ etco2PreDisp: r1(pre), etco2PeakDisp: peak, jump: r1(peak - pre), tPeakS: (r.find((x) => (x.t as number) > 362 && x.dEtco2 === peak)?.t as number) - 360, sustained: sustained(r, 375, 600) }); },
  expect: [{ m: 'jump', lo: 10, hi: 40, src: 'Pokorná M et al., J Emerg Med 2010;38:614 (an abrupt EtCO2 rise ≥ 10 mmHg marks ROSC); AHA 2020 ALS' }],
  owner: '3 / FU-4' });
add({ id: 'DV-22b', tier: 'P2', ctx: 'X-A ventilated, MODELED', state: 'VF + CPR q 0.8 for 4 min', intv: '10-s pause for a rhythm check at 360 s: CoPP during the pause and its rebuild', sys: 'CIRC',
  arms: { i: V([VF, cpr(120, 0.8), cprOff(360), cpr(370, 0.8)], 480, XA, { dt: 1 }) },
  measure: (R) => { const r = R.i!.rows; const pre = mean(r, 'cpp', 340, 359); const min = mn(r, 'cpp', 361, 371); const back = r.find((x) => (x.t as number) > 371 && (x.cpp as number) >= 0.9 * pre);
    return m({ cppPre: r1(pre), cppPauseMin: min, rebuildS: back ? (back.t as number) - 370 : NaN }); },
  expect: [{ m: 'cppPauseMin', lo: 0, hi: 12, src: 'Berg RA et al., Circulation 2001;104:2465 (CoPP falls at once when compressions stop)' },
    { m: 'rebuildS', lo: 5, hi: 40, src: 'Berg 2001 / Kern 2002: after a pause CoPP needs several compressions (≈ 10–20 s) to return — direction proposal' }],
  owner: 'FU-4 CPR model' });

// ---- DV-24 hypothermic VF 28 °C · shocks ------------------------------------------------------------------------------
const COLD = { baseline: { tempCore: 28.5 } };
const coldShock = (warm: boolean) => (seed: number) => V([VF, cpr(120, 0.8), ...(warm ? [[125, A.target('tempCore', 33), 'rewarm to 33 °C (instructor placement)'] as any] : []), ...shock(300, 200)], 400, COLD, { seed, dt: 5 });
add({ id: 'DV-24a', tier: 'P2', ctx: 'X-A ventilated, core 28.5 °C (profile baseline), MODELED', state: 'VF (instructor) + CPR', intv: `shock 200 J at 4 min, ${N} seeds: termination vs normothermia`, sys: 'RHY',
  arms: { ...seeds(N, coldShock(false)), ...Object.fromEntries(Object.entries(seeds(N, (s) => V([VF, cpr(120, 0.8), ...shock(300, 200)], 400, XA, { seed: s, dt: 5 }))).map(([k, v]) => [`n${k}`, v])) },
  measure: (R) => { const oc = arms(R, 's').map(outcome), on = arms(R, 'ns').map(outcome); const tc = arms(R, 's')[0]!.rows.find((r) => r.t === 295)!.temp as number;
    return m({ core: r1(tc), term28Pct: share(oc, (x) => x !== 'unchanged'), term37Pct: share(on, (x) => x !== 'unchanged'), rosc28Pct: share(oc, (x) => x === 'rosc'), rosc37Pct: share(on, (x) => x === 'rosc'), diff: r1(share(on, (x) => x !== 'unchanged') - share(oc, (x) => x !== 'unchanged')) }); },
  expect: [{ m: 'diff', dir: 1, tol: 20, src: 'ERC 2021 special circumstances (hypothermia): below 30 °C VF is often refractory to shocks; if 3 shocks fail, delay further attempts until > 30 °C' }],
  hand: { verdict: 'WR', why: 'the shock table has no temperature input (outcome.ts ShockContext): at 28.5 °C the termination rate equals normothermia. FU-7 Task 12 adds K, pH, CPP, drugs and the arrest clock — not temperature' },
  owner: 'L3 outcome.ts (FU-7 Task 12 must add a temperature factor — new item for it)' });
add({ id: 'DV-24b', tier: 'P2', ctx: 'X-A, 28.5 °C → rewarmed to 33 °C (instructor placement) under CPR', state: 'VF + CPR', intv: `shock 200 J after rewarming vs at 28.5 °C, ${N} seeds`, sys: 'RHY END',
  arms: { ...seeds(N, coldShock(true)), ...Object.fromEntries(Object.entries(seeds(N, coldShock(false))).map(([k, v]) => [`c${k}`, v])) },
  measure: (R) => { const ow = arms(R, 's').map(outcome), oc = arms(R, 'cs').map(outcome);
    return m({ coreWarm: r1(arms(R, 's')[0]!.rows.find((r) => r.t === 295)!.temp as number), termWarmPct: share(ow, (x) => x !== 'unchanged'), termColdPct: share(oc, (x) => x !== 'unchanged'), gain: r1(share(ow, (x) => x !== 'unchanged') - share(oc, (x) => x !== 'unchanged')) }); },
  expect: [{ m: 'gain', dir: 1, tol: 20, src: 'ERC 2021 (hypothermic arrest: shocks succeed once the core is rewarmed above 30 °C)' }],
  hand: { verdict: 'WR', why: 'no temperature term in the shock outcome: rewarming changes nothing' },
  owner: 'L3 outcome.ts (FU-7 Task 12 + temperature)' });

// ---- DV-25 hyperkalaemic arrest · Ca, shock --------------------------------------------------------------------------
const HK = { blood: { k: 9.5 } }; // FU-4: VF by hazard at ≈ 65 s (measured: 70 s, cause hyperkalaemia)
const hkArm = (treat: boolean, pre?: string) => (seed: number) => V([cpr(90, 0.8), ...(treat ? [[100, A.drug('calciumChloride', 1000, 'mg'), 'CaCl2 1 g'], [100, A.drug('insulinDextrose', 10, 'units'), 'insulin 10 U + dextrose'], [100, A.drug('sodiumBicarbonate', 50, 'mmol'), 'NaHCO3 50 mmol']] as any : []), ...shock(300, 200, pre ? { pre } : {})], 600, HK, { seed, dt: 5 });
add({ id: 'DV-25a', tier: 'P2', ctx: 'X-A ventilated, K 9.5 (profile), MODELED', state: 'hyperkalaemic VF (engine-declared at ≈ 70 s) + CPR', intv: `shock 200 J at 300 s untreated vs normokalaemic VF, ${N} seeds; and a pre-selected organised rhythm: does it hold?`, sys: 'RHY BLD',
  arms: { ...seeds(N, hkArm(false)), ...Object.fromEntries(Object.entries(seeds(N, (s) => V([VF, cpr(90, 0.8), ...shock(300, 200)], 600, XA, { seed: s, dt: 5 }))).map(([k, v]) => [`n${k}`, v])), pre: hkArm(false, 'sinus')(7) },
  measure: (R) => { const oh = arms(R, 's').map(outcome), on = arms(R, 'ns').map(outcome); const pr = R.pre!.rows;
    return m({ kEcg: r2(pr.find((r) => r.t === 295)!.kEcg as number), termHkPct: share(oh, (x) => x !== 'unchanged'), termNormoPct: share(on, (x) => x !== 'unchanged'), roscHkPct: share(oh, (x) => x === 'rosc'), roscNormoPct: share(on, (x) => x === 'rosc'),
      forcedSinusHolds: sustained(pr, 320, 600), forcedSinusRefibS: (pr.find((r) => (r.t as number) > 320 && !perfusing(r))?.t as number) - 300, rhythmsForced: rh(R.pre!) }); },
  expect: [{ m: 'forcedSinusHolds', event: false, src: 'ERC 2021 special circumstances (hyperkalaemia): shocks fail / VF recurs until K⁺ is lowered and the membrane stabilised' },
    { m: 'roscHkPct', lo: 0, hi: 5, src: 'ERC 2021 (hyperkalaemia): ROSC from a shock alone is unlikely before calcium/insulin — proposal (the table\'s normokalaemic ROSC share is 10 %)' }],
  hand: { verdict: 'WR', why: 'the physiology half is right (a forced organised rhythm re-fibrillates through the K hazard, arrest.ts K_HAZARD); the shock table is K-blind — ROSC share the same as normokalaemia. FU-7 Task 12 adds `kEcg`' },
  known: 'FU-7 Task 12', owner: 'L3 outcome.ts (FU-7 Task 12 kEcg factor)' });
add({ id: 'DV-25b', tier: 'P2', ctx: 'X-A ventilated, K 9.5 (profile), MODELED', state: 'hyperkalaemic VF + CPR', intv: 'CaCl2 1 g + insulin–dextrose + NaHCO3 50 mmol at 100 s, then a shock pre-selected to sinus at 300 s (vs untreated)', sys: 'RHY BLD',
  arms: { t: hkArm(true, 'sinus')(7), u: hkArm(false, 'sinus')(7) },
  measure: (R) => m({ kEcgTreated: r2(R.t!.rows.find((r) => r.t === 295)!.kEcg as number), kEcgUntreated: r2(R.u!.rows.find((r) => r.t === 295)!.kEcg as number), kTreated: r2(R.t!.rows.find((r) => r.t === 295)!.k as number),
    treatedHolds: sustained(R.t!.rows, 320, 600), untreatedHolds: sustained(R.u!.rows, 320, 600), treatedPulseEnd: sustained(R.t!.rows, 540, 600), untreatedPulseEnd: sustained(R.u!.rows, 540, 600), rhythmsTreated: rh(R.t!), rhythmsUntreated: rh(R.u!) }),
  expect: [{ m: 'treatedHolds', event: true, src: 'ERC 2021 (hyperkalaemic arrest: calcium, insulin–glucose, bicarbonate, then shocks succeed)' }, { m: 'untreatedHolds', event: false, src: 'as DV-25a' }],
  hand: { verdict: 'TW', why: 'the direction is right — treated, the membrane-effective K falls 9.47 → 7.41 (below K_HAZARD 8.5), the forced rhythm dips into a PEA at +100 s and regains a pulse under CPR at +185 s and holds; untreated, it becomes pulseless at +80 s and never returns. Weak because plasma K is still 9.35 at 200 s (insulin–dextrose acts over 30–60 min, 7c) and the K-driven contractility depression is read from plasma K, not the calcium-stabilised value' },
  owner: '7c (K treatments; kChem from plasma K vs kEcg) / FU-4 K hazard' });

// ---- DV-26 asphyxial arrest · ventilation first ------------------------------------------------------------------------
const ASPH: Parameters<typeof V>[0] = [[1, A.thermal({ anaesthesia: 'general' }), 'GA flag'], [60, A.drug('propofol', 2, 'mg/kg'), 'propofol 2 mg/kg'], [60, A.drug('rocuronium', 0.6, 'mg/kg'), 'rocuronium 0.6 mg/kg'], [60, A.none(), 'apnoea (no ventilation), room air']];
const asph = (steps: Parameters<typeof V>[0], tEnd: number, seed = 7) => ({ patient: XA, steps: [...ASPH, ...steps], tEnd, seed, dt: 5 });
add({ id: 'DV-26a', tier: 'P2', ctx: 'X-A, induced apnoea on air (no airway device), MODELED', state: 'hypoxic bradycardia (HR 40, SpO2 ≈ 45 at 185 s), not yet arrested', intv: 'BVM/ventilation FiO2 1.0 at 190 s (no CPR, no drug) vs continued apnoea', sys: 'LUNG RHY CIRC',
  arms: { i: asph([[190, A.device('ett'), 'ETT'], [190, A.vent({ fio2: 1 }), 'VCV FiO2 1.0']], 600), c: asph([], 600) },
  measure: (R) => { const i = R.i!.rows; const back = i.find((r) => (r.t as number) > 190 && (r.hr as number) >= 60);
    return m({ hrAt190: r1(i.find((r) => r.t === 190)!.hr as number), spo2At190: r1(i.find((r) => r.t === 190)!.spo2True as number), hr60AfterS: back ? (back.t as number) - 190 : NaN, arrestTreated: anyR(i, 190, 600, (r) => r.arrest !== ''), arrestCtrl: anyR(R.c!.rows, 190, 600, (r) => r.arrest !== '') }); },
  expect: [{ m: 'hr60AfterS', lo: 10, hi: 120, src: 'ERC 2021 (hypoxic bradycardia/peri-arrest: oxygenation restores the rate within 1–2 min)' }, { m: 'arrestTreated', event: false, src: 'ERC 2021 (ventilation first in asphyxia)' }, { m: 'arrestCtrl', event: true, src: 'FU-3 hypoxic arrest (control)' }],
  owner: 'FU-3 hypoxic path / 3' });
add({ id: 'DV-26b', tier: 'P2', ctx: 'X-A, induced apnoea on air, MODELED, 6 seeds', state: 'asphyxial arrest (engine-declared at ≈ 410 s)', intv: 'CPR q 0.8 + ETT/VCV FiO2 1.0 from 450 s vs CPR without ventilation', sys: 'RHY CIRC LUNG',
  arms: { ...Object.fromEntries([7, 8, 9, 10, 11, 12].map((s) => [`v${s}`, asph([cpr(450, 0.8), [450, A.device('ett'), 'ETT'], [450, A.vent({ fio2: 1 }), 'VCV FiO2 1.0']], 1050, s)])),
    ...Object.fromEntries([7, 8, 9, 10, 11, 12].map((s) => [`n${s}`, asph([cpr(450, 0.8)], 1050, s)])) },
  measure: (R) => { const v = arms(R, 'v'), n = arms(R, 'n');
    const onset = v.map((r) => String(r.rows.find((x) => x.arrest !== '')?.rhythm ?? 'none'));
    const orgV = v.filter((r) => { const x = r.rows.find((y) => y.arrest !== ''); return x && x.rhythm !== 'asystole' && x.rhythm !== 'vfCoarse'; });
    const orgN = n.filter((r) => { const x = r.rows.find((y) => y.arrest !== ''); return x && x.rhythm !== 'asystole' && x.rhythm !== 'vfCoarse'; });
    const roscV = orgV.filter((r) => Number.isFinite(pulseAt(r.rows, 450, 1050))).length, roscN = orgN.filter((r) => Number.isFinite(pulseAt(r.rows, 450, 1050))).length;
    return m({ onsetRhythms: onset.join(','), nOrganised: orgV.length, roscVentPct: r1((100 * roscV) / Math.max(1, orgV.length)), roscNoVentPct: r1((100 * roscN) / Math.max(1, orgN.length)), ventBetter: roscV > roscN }); },
  expect: [{ m: 'ventBetter', event: true, src: 'ERC 2021 (asphyxial arrest: ventilation with oxygen is the priority; compressions alone do not correct the cause)' }],
  owner: 'FU-3/FU-4 arrest machine' });
