// DV group C — IABP (DV-13…15), LVAD (DV-16…19) and ECMO (DV-20, not expressible).
import { A, mean, r1, r2, type ArmResult, type FineRow } from './runner.ts';
import { add, anyR, avgOf, fbeats, HF, HFMI, m, mn, mx, rh, V, w, w2, type FBeat } from './spec.ts';

// ---- IABP rigs ---------------------------------------------------------------------------------------------------------
// Cardiogenic shock is not a MODELED state on main (HFrEF is a compensated profile; `contractility` acts only in MANUAL).
// The graded rig is therefore the MODELED HFrEF 60 y profile (compensated, SV ≈ 77 mL) — the tables' IABP targets hold
// for any correctly timed balloon. The instructor's MANUAL cardiogenic-shock rig (contractility 0.4, SBP/DBP 85/55: SV 34,
// CO ≈ 2.6, PAWP 24) is run beside it: there the balloon deflates 0.25–0.35 s AFTER the next valve opening (see
// `deflLagMs`), i.e. every "correct" setting is late deflation — reported, not graded as the tables' targets.
const CS = { mode: 'manual' as const, pre: [[30, A.target('contractility', 0.4), 'contractility 0.4'], [30, A.target('sbp', 85), 'SBP 85'], [30, A.target('dbp', 55), 'DBP 55']] as [number, any, string][] };
const TI = 400; // IABP start
const csArm = (iabp: Record<string, unknown> | null, tEnd = TI + 300) => V([...(iabp ? [[TI, A.iabp('start', iabp), `IABP start ${JSON.stringify(iabp)}`] as [number, any, string]] : [])], tEnd, HF, { dt: 5, fine: [[TI - 12, TI - 1], [TI + 200, TI + 215]] });
const manArm = (iabp: Record<string, unknown>) => V([...CS.pre, [TI, A.iabp('start', iabp), `IABP start ${JSON.stringify(iabp)}`]], TI + 300, HF, { mode: CS.mode, dt: 5, fine: [[TI - 12, TI - 1], [TI + 200, TI + 215]] });
/** Deflation relative to the next aortic-valve opening after each inflation (ms; + = the LV ejects into a full balloon). */
const deflLag = (f: FineRow[]): number => { const opens: number[] = []; let o = false; for (const x of f) { const n = x.qAv > 1; if (n && !o) opens.push(x.t); o = n; }
  const pairs = [...new Map(f.filter((x) => x.iabpIn > 0).map((x) => [x.iabpIn, x.iabpOut])).entries()];
  const lags = pairs.map(([i, d]) => { const nx = opens.find((t) => t > i); return nx === undefined ? NaN : 1000 * (d - nx); }).filter(Number.isFinite);
  return avgOf(lags); };
const infl = (f: FineRow[]): number[] => [...new Set(f.map((x) => x.iabpIn).filter((x) => x > 0))];
/** Beat-level IABP read-out over (t0, t1] of the fine rows: assisted = the diastole that followed the beat had an inflation. */
function iabpRead(f: FineRow[], t0: number, t1: number) {
  const rows = f.filter((x) => x.t > t0 && x.t <= t1);
  const bs = fbeats(rows);
  const inf = infl(rows);
  const asD: FBeat[] = [], unD: FBeat[] = [], sysAfterA: FBeat[] = [], sysAfterU: FBeat[] = [];
  const lead: number[] = [];
  for (let i = 0; i + 1 < bs.length; i++) {
    const a = bs[i]!, b = bs[i + 1]!;
    const ii = inf.find((x) => x > a.tOpen && x < b.tOpen);
    if (ii !== undefined) { asD.push(a); sysAfterA.push(b); if (Number.isFinite(a.tClose)) lead.push(1000 * (ii - a.tClose)); } else { unD.push(a); sysAfterU.push(b); }
  }
  return { n: bs.length, aug: avgOf(asD.map((x) => x.diaPeak)), notchPeakU: avgOf(unD.map((x) => x.diaPeak)), edpA: avgOf(sysAfterA.map((x) => x.edp)), edpU: avgOf(sysAfterU.map((x) => x.edp)),
    sysA: avgOf(sysAfterA.map((x) => x.sys)), sysU: avgOf(sysAfterU.map((x) => x.sys)), svA: avgOf(sysAfterA.map((x) => x.sv)), svU: avgOf(sysAfterU.map((x) => x.sv)), svAll: avgOf(bs.map((x) => x.sv)),
    sysAll: avgOf(bs.map((x) => x.sys)), edpAll: avgOf(bs.map((x) => x.edp)), inflLeadMs: avgOf(lead), nAssisted: asD.length, nUnassisted: unD.length };
}
const pre = (R: ArmResult) => iabpRead(R.fine, TI - 12, TI - 1);
const post = (R: ArmResult) => iabpRead(R.fine, TI + 200, TI + 215);

add({ id: 'DV-13a', tier: 'P1', ctx: 'HFrEF 60 y 80 kg ventilated, MODELED (compensated profile; no MODELED cardiogenic-shock state exists)', state: 'HFrEF (Ees ×0.45)', intv: 'IABP 1:1, 40 mL, correct timing (inflation at the notch, deflation before the R)', sys: 'CIRC DEV',
  arms: { i: csArm({ ratio: 1 }) },
  measure: (R) => { const a = pre(R.i!), b = post(R.i!); return m({ unassistedSbp: r1(a.sysAll), augmentation: r1(b.aug), augMinusSbp: r1(b.aug - a.sysAll), consoleAug: w(R.i!.rows, 'iabpAug', TI + 100, TI + 300), inflLeadMs: r1(b.inflLeadMs) }); },
  expect: [{ m: 'augMinusSbp', lo: 0, hi: 40, src: 'tables §8.1 (IABP-PMC4972967; EMCrit-IABP): diastolic augmentation > unassisted systolic pressure with correct timing' }],
  owner: '7a devices.ts (IABP) / hemo pipeline' });
add({ id: 'DV-13b', tier: 'P1', ctx: 'as DV-13a', state: 'HFrEF', intv: 'IABP 1:1 correct timing: assisted end-diastolic and systolic pressures vs unassisted; the same in the MANUAL cardiogenic-shock rig', sys: 'CIRC',
  arms: { i: csArm({ ratio: 1 }), man: manArm({ ratio: 1 }) },
  measure: (R) => { const a = pre(R.i!), b = post(R.i!), ma = pre(R.man!), mb = post(R.man!); return m({ edpUnassisted: r1(a.edpAll), edpAssisted: r1(b.edpA), dEdp: r1(b.edpA - a.edpAll), sysAssisted: r1(b.sysA), dSys: r1(b.sysA - a.sysAll), deflLagMs: r1(deflLag(R.i!.fine.filter((x) => x.t > TI + 100))), manDEdp: r1(mb.edpA - ma.edpAll), manDSys: r1(mb.sysA - ma.sysAll), manDeflLagMs: r1(deflLag(R.man!.fine.filter((x) => x.t > TI + 100))) }); },
  expect: [{ m: 'dEdp', lo: -25, hi: -10, src: 'tables §8.1: assisted end-diastolic pressure 15–20 mmHg below the unassisted (afterload reduction)' }, { m: 'dSys', lo: -12, hi: 0, src: 'tables §8.1: assisted systolic ≈ 5 mmHg below the unassisted' }],
  owner: '7a devices.ts (IABP)' });
add({ id: 'DV-13c', tier: 'P1', ctx: 'as DV-13a', state: 'HFrEF', intv: 'IABP 1:1 correct timing: cardiac output and PAWP after 3–5 min', sys: 'CIRC',
  arms: { i: csArm({ ratio: 1 }), c: csArm(null) },
  measure: (R) => { const i = R.i!.rows, c = R.c!.rows; return m({ coBase: w2(c, 'co', TI + 180, TI + 300), dCo: r2(mean(i, 'co', TI + 180, TI + 300) - mean(c, 'co', TI + 180, TI + 300)), pawpBase: w(c, 'pawp', TI + 180, TI + 300), pawpPct: r1((100 * (mean(i, 'pawp', TI + 180, TI + 300) - mean(c, 'pawp', TI + 180, TI + 300))) / mean(c, 'pawp', TI + 180, TI + 300)), dMap: r1(mean(i, 'map', TI + 180, TI + 300) - mean(c, 'map', TI + 180, TI + 300)) }); },
  expect: [{ m: 'dCo', lo: 0.4, hi: 1.0, src: 'tables §8.1: CO +0.5–1 L/min (≈ 20 %) (IABP-PMC4972967; EMCrit-IABP)' }, { m: 'pawpPct', lo: -30, hi: -10, src: 'tables §8.1: PCWP −20 %' }],
  owner: '7a devices.ts (IABP)' });
add({ id: 'DV-13d', tier: 'P1', ctx: 'HFrEF + recent MI 65 y, MODELED (compensated)', state: 'compensated HFrEF with a recent infarct', intv: 'IABP 1:1 correct timing for 18 min vs no IABP: the quiet check (a correctly timed balloon must not harm) and coronary perfusion', sys: 'CIRC RHY DEV',
  arms: { i: V([[TI, A.iabp('start', { ratio: 1 }), 'IABP 1:1']], TI + 1100, HFMI, { dt: 5 }), c: V([], TI + 1100, HFMI, { dt: 5 }) },
  measure: (R) => { const i = R.i!.rows, c = R.c!.rows; const ta = i.find((r) => (r.t as number) > TI && r.arrest !== '');
    return m({ arrestWithIabp: !!ta, arrestAtMin: ta ? r1(((ta.t as number) - TI) / 60) : NaN, arrestCtrl: anyR(c, TI, TI + 1100, (r) => r.arrest !== ''), cppCtrl: w(c, 'cpp', TI + 60, TI + 300), cppIabp: w(i, 'cpp', TI + 60, TI + 300), dCpp: r1(mean(i, 'cpp', TI + 60, TI + 300) - mean(c, 'cpp', TI + 60, TI + 300)), dLvedp: r1(mean(i, 'lvedp', TI + 360, TI + 420) - mean(c, 'lvedp', TI + 360, TI + 420)), dCvp: r1(mean(i, 'cvp', TI + 360, TI + 420) - mean(c, 'cvp', TI + 360, TI + 420)),
      kIschMinBeforeArrest: mn(i, 'kIsch', TI, ta ? (ta.t as number) - 5 : TI + 1100), displayedAbpAfterArrest: ta ? `${i.find((r) => (r.t as number) > (ta.t as number) + 60)?.dAbpS}/${i.find((r) => (r.t as number) > (ta.t as number) + 60)?.dAbpD} (${i.find((r) => (r.t as number) > (ta.t as number) + 60)?.dAbpF})` : 'n/a', rhythms: rh(R.i!) }); },
  expect: [{ m: 'arrestWithIabp', event: false, src: 'FU-4 quiet rule (a compensated patient must not arrest on a standard intervention); tables §8.1: coronary supply ↑ with IABP (CPP from the augmented diastolic pressure)' },
    { m: 'dCpp', dir: 1, tol: 0, src: 'tables §8.1 / §3: the augmented diastole raises coronary perfusion (direction: CoPP with IABP ≥ without)' }],
  hand: { verdict: 'WR', why: 'a correctly timed 1:1 balloon arrests a compensated HFrEF + recent-MI patient at +8.8 min (control: no arrest). Two mechanisms: (1) the coronary step reads CoPP from the beat\'s MINIMUM aortic pressure (coronary.ts:142, b.aoDia) — with a balloon that is the post-deflation dip, so CoPP FALLS 57.7 → 46.1 when the augmented diastole should raise it; (2) the balloon leaks volume: when the next beat reschedules the balloon mid-deflation (devices.ts:48–54 iabpOnBeat overwrites deflateAt) the rest of that 40 mL stays in the aorta — 7 of 63 deflations cut short per minute here — so LVEDV 219 → 244 mL and LVEDP 10 → 24 over 8 min, CoPP 46 → 33, and the ischaemic spiral closes (kIsch 0.85 → 0.1 in 60 s)' },
  owner: 'new: 7a coronary.ts:142 (CoPP from the beat\'s minimum aortic pressure) — FU-8 Part A (same defect family as C3)' });

// ---- DV-14 IABP timing errors (1:2 so assisted and unassisted beats sit side by side) ------------------------------------
const T14: Record<string, Record<string, unknown>> = { ok: { ratio: 2 }, eI: { ratio: 2, inflateOffsetMs: -120 }, lI: { ratio: 2, inflateOffsetMs: 120 }, eD: { ratio: 2, deflateOffsetMs: -200 }, lD: { ratio: 2, deflateOffsetMs: 150 } };
const t14arms = Object.fromEntries(Object.entries(T14).map(([k, v]) => [k, csArm(v)]));
const rd = (R: Record<string, ArmResult>, k: string) => post(R[k]!);
add({ id: 'DV-14a', tier: 'P2', ctx: 'as DV-13a (MODELED HFrEF), IABP 1:2', state: 'HFrEF', intv: 'EARLY inflation (−120 ms: inflates in systole) vs correct', sys: 'CIRC',
  arms: t14arms, measure: (R) => { const o = rd(R, 'ok'), e = rd(R, 'eI'); return m({ inflLeadOk: r1(o.inflLeadMs), inflLeadEarly: r1(e.inflLeadMs), svInterruptedPct: r1((100 * (e.svAll - o.svAll)) / o.svAll), augEarly: r1(e.aug), augOk: r1(o.aug) }); },
  expect: [{ m: 'inflLeadEarly', lo: -200, hi: -20, src: 'tables §8.1 (Deranged-IABP): early inflation starts before the dicrotic notch' }, { m: 'svInterruptedPct', dir: -1, tol: 2, src: 'tables §8.1: early inflation closes the aortic valve early — SV ↓, afterload ↑' }],
  owner: '7a devices.ts' });
add({ id: 'DV-14b', tier: 'P2', ctx: 'as DV-14a', state: 'HFrEF', intv: 'LATE inflation (+120 ms) vs correct', sys: 'CIRC',
  arms: t14arms, measure: (R) => { const o = rd(R, 'ok'), l = rd(R, 'lI'); return m({ augLate: r1(l.aug), augOk: r1(o.aug), dAug: r1(l.aug - o.aug), inflLeadLate: r1(l.inflLeadMs) }); },
  expect: [{ m: 'dAug', dir: -1, tol: 2, src: 'tables §8.1: late inflation — the notch is visible and the augmentation smaller' }],
  owner: '7a devices.ts' });
add({ id: 'DV-14c', tier: 'P2', ctx: 'as DV-14a', state: 'HFrEF', intv: 'EARLY deflation (−200 ms) vs correct', sys: 'CIRC',
  arms: t14arms, measure: (R) => { const o = rd(R, 'ok'), e = rd(R, 'eD'); return m({ dEdpOk: r1(o.edpA - o.edpU), dEdpEarly: r1(e.edpA - e.edpU), dSysEarly: r1(e.sysA - e.sysU), dSysOk: r1(o.sysA - o.sysU), afterloadBenefitLost: r1((e.edpA - e.edpU) - (o.edpA - o.edpU)) }); },
  expect: [{ m: 'afterloadBenefitLost', dir: 1, tol: 3, src: 'tables §8.1 (Deranged-IABP; LITFL-IABP): early deflation — U-shaped dip, assisted EDP ≈ unassisted, no afterload reduction' }],
  owner: '7a devices.ts' });
add({ id: 'DV-14d', tier: 'P2', ctx: 'as DV-14a', state: 'HFrEF', intv: 'LATE deflation (+150 ms: the balloon is still full when the LV ejects) vs correct', sys: 'CIRC',
  arms: t14arms, measure: (R) => { const o = rd(R, 'ok'), l = rd(R, 'lD'); return m({ dEdpLate: r1(l.edpA - l.edpU), dEdpOk: r1(o.edpA - o.edpU), svAfterAssistedPct: r1((100 * (l.svA - o.svA)) / o.svA) }); },
  expect: [{ m: 'dEdpLate', lo: 0, hi: 30, src: 'tables §8.1: late deflation — assisted EDP ≥ unassisted (LV ejects against the balloon)' }, { m: 'svAfterAssistedPct', dir: -1, tol: 2, src: 'tables §8.1: afterload ↑, SV ↓ on the assisted systole' }],
  owner: '7a devices.ts' });

// ---- DV-15 IABP 1:2; AF; arrest ---------------------------------------------------------------------------------------
add({ id: 'DV-15a', tier: 'P2', ctx: 'as DV-13a', state: 'HFrEF', intv: 'IABP 1:2: assisted and unassisted beats side by side', sys: 'CIRC DEV',
  arms: { ok: t14arms.ok! }, measure: (R) => { const o = post(R.ok!); return m({ nAssisted: o.nAssisted, nUnassisted: o.nUnassisted, aug: r1(o.aug), unassistedDiastolicPeak: r1(o.notchPeakU), sysA: r1(o.sysA), sysU: r1(o.sysU) }); },
  expect: [{ m: 'nUnassisted', lo: 3, hi: 30, src: 'tables §8.1: 1:2 shows assisted and unassisted beats side by side (the teaching view)' }, { m: 'nAssisted', lo: 3, hi: 30, src: 'as above' }],
  owner: '7a devices.ts' });
add({ id: 'DV-15b', tier: 'P2', ctx: 'HFrEF, MODELED, IABP 1:1 running', state: 'AF 110 at 300 s, then VF at 480 s', intv: 'trigger in AF and in arrest (tables: internal/asynchronous trigger in arrest; trigger-loss alarms)', sys: 'DEV CIRC',
  arms: { i: V([[TI - 300, A.iabp('start', { ratio: 1 }), 'IABP 1:1'], [300, A.rhythm('afib', { rateBpm: 110 }), 'AF 110'], [480, A.rhythm('vfCoarse'), 'VF'], [540, A.cpr(true, 0.8), 'CPR']], 700, HF, { dt: 5, fine: [[400, 410], [600, 610]] }) },
  measure: (R) => { const f = R.i!.fine; const inArrest = infl(f.filter((x) => x.t > 600)).length; const alarmsIabp = R.i!.alarmsSeen.filter((a) => /IABP|BALLOON|TRIGGER/i.test(a));
    return m({ inflationsInAfWindow: infl(f.filter((x) => x.t > 400 && x.t <= 410)).length, inflationsInArrest10s: inArrest, iabpAlarms: alarmsIabp.join(',') || 'none', consoleAugInArrest: w(R.i!.rows, 'iabpAug', 600, 700) }); },
  expect: [{ m: 'inflationsInArrest10s', lo: 5, hi: 20, src: 'tables §8.1 (LITFL-IABP): in arrest the pump runs on an internal/asynchronous trigger (or is triggered from CPR pressure)' }],
  hand: { verdict: 'MI', why: 'the IABP triggers only from the last ejected beat (hemo/pipeline.ts:285–288, iabpOnBeat): with no beat it simply stops — no internal trigger, no CPR-pressure trigger, no "trigger lost" alarm; the console keeps showing the last augmentation' },
  owner: 'new: 7h (IABP trigger modes and alarms)' });

// ---- LVAD --------------------------------------------------------------------------------------------------------------
const TL = 300;
const lv = (steps: [number, any, string][], tEnd: number, patient = HF) => V([[TL, A.lvad('start', 5400), 'LVAD 5400 rpm'], ...steps], tEnd, patient, { dt: 5 });
add({ id: 'DV-16a', tier: 'P2', ctx: 'HFrEF 60 y ventilated, MODELED', state: 'LVAD 5400 rpm (HeartMate-3-like)', intv: 'baseline arterial pulse pressure', sys: 'CIRC DEV',
  arms: { i: lv([], 900) }, measure: (R) => { const r = R.i!.rows; return m({ ppTruth: r1(mean(r, 'sbp', 600, 900) - mean(r, 'dbp', 600, 900)), ppDisplayed: r1(mean(r, 'dAbpS', 600, 900) - mean(r, 'dAbpD', 600, 900)), ppBefore: r1(mean(r, 'sbp', 200, 300) - mean(r, 'dbp', 200, 300)), map: w(r, 'map', 600, 900), svNative: w(r, 'sv', 600, 900) }); },
  expect: [{ m: 'ppTruth', lo: 5, hi: 20, src: 'tables §8.2 (HM3-Abbott; EMCrit-HM3): arterial pulse pressure 10–20 or less; MAP the reliable value' }],
  hand: { verdict: 'PL', why: 'PP 38 → 20.4 at the band edge with the native HFrEF ventricle still ejecting 25 mL (aortic valve opening, as the tables allow); MAP 91.5' },
  owner: '7a devices.ts (LVAD)' });
add({ id: 'DV-16b', tier: 'P2', ctx: 'as DV-16a', state: 'LVAD 5400', intv: 'NIBP cycles (3 stat measurements)', sys: 'DEV',
  arms: { i: lv([[600, A.nibp('stat'), 'NIBP'], [700, A.nibp('stat'), 'NIBP'], [800, A.nibp('stat'), 'NIBP']], 900) },
  measure: (R) => { const n = R.i!.nibp.filter((x) => x.t > 600); return m({ results: n.map((x) => `${x.sys}/${x.dia} (${x.flag})`).join('; ') || 'none', nValid: n.filter((x) => x.sys !== null).length, nFailed: n.filter((x) => x.sys === null).length }); },
  expect: [{ m: 'nFailed', lo: 1, hi: 3, src: 'tables §8.2 (EMCrit-HM3): NIBP often fails at a pulse pressure ≤ 15–20 (Doppler "return to flow" is used instead); oscillometric success ≈ 50–60 % in continuous-flow LVADs (Bennett 2010) [VERIFY]' }],
  hand: { verdict: 'TW', why: '10 of 10 cycles (the auto cycle plus 3 stat) return a valid reading at PP ≈ 20; since FU-5 fixed A10-C8 the oscillometric model reads down to PP 10 (G-FU5: "NIBP at PP 10 → 80/56"), so the LVAD patient\'s frequent NIBP failure never appears. A pulsatility-dependent failure probability is the smallest mechanism' },
  owner: 'Stage 2 NIBP (hemo/nibp) — FU-8 list (FU-5 follow-ups)' });
add({ id: 'DV-16c', tier: 'P2', ctx: 'as DV-16a', state: 'LVAD 5400', intv: 'pulse oximetry', sys: 'DEV',
  arms: { i: lv([], 900) }, measure: (R) => { const r = R.i!.rows; return m({ piBefore: w2(r, 'dPi', 200, 300), piLvad: w2(r, 'dPi', 600, 900), piRatio: r2(mean(r, 'dPi', 600, 900) / mean(r, 'dPi', 200, 300)), spo2Shown: w(r, 'dSpo2', 600, 900), validPct: r1((100 * r.filter((x) => (x.t as number) > 600 && x.dSpo2F === 'valid').length) / r.filter((x) => (x.t as number) > 600).length) }); },
  expect: [{ m: 'piRatio', lo: 0.1, hi: 0.6, invert: true, src: 'tables §8.2 (HM3-Abbott; EMCrit-HM3): the pleth is small or absent on continuous flow — perfusion index falls, SpO2 may be unobtainable (proposal: PI at least halves)' }],
  owner: 'Stage 3 pleth (pulsatility → PI)' });
add({ id: 'DV-16d', tier: 'P2', ctx: 'as DV-16a', state: 'LVAD 5400', intv: 'console numerics: flow, power, pulsatility index', sys: 'DEV CIRC',
  arms: { i: lv([], 900) }, measure: (R) => { const r = R.i!.rows; return m({ flow: w2(r, 'lvadFlow', 600, 900), powerW: w2(r, 'lvadW', 600, 900), puI: w2(r, 'lvadPi', 600, 900), co: w2(r, 'co', 600, 900) }); },
  expect: [{ m: 'flow', lo: 4, hi: 6, src: 'tables §8.2 (HM3-Abbott): flow 4–6 L/min at 5400 rpm' }, { m: 'powerW', lo: 4, hi: 5, src: 'tables §8.2: power 4–5 W' }, { m: 'puI', lo: 2.5, hi: 5, src: 'tables §8.2: pulsatility index 3–4 (clinical 1–10)' }],
  owner: '7a devices.ts (LVAD HQ/power/PI)' });
add({ id: 'DV-17', tier: 'P2', ctx: 'as DV-16a', state: 'LVAD 5400', intv: 'hypovolaemia: bleed 1500 mL over 5 min from 600 s → suction', sys: 'CIRC RHY DEV',
  arms: { i: lv([[600, A.bleed(1500, 300), 'bleed 1500 mL / 300 s']], 1200) },
  measure: (R) => { const r = R.i!.rows; const s = r.find((x) => (x.t as number) > 600 && x.lvadSuction === true);
    return m({ flowBefore: w2(r, 'lvadFlow', 500, 600), flowMin: mn(r, 'lvadFlow', 600, 1200), puIBefore: w2(r, 'lvadPi', 500, 600), puIMax: mx(r, 'lvadPi', 600, 1200), puIEnd: w2(r, 'lvadPi', 1100, 1200), suctionAtS: s ? (s.t as number) - 600 : NaN, ectopy: anyR(r, 600, 1200, (x) => x.rhythm !== 'sinus'), rhythms: rh(R.i!) }); },
  expect: [{ m: 'flowMin', lo: 0, hi: 3, src: 'tables §8.2: flow falls in hypovolaemia (low-flow alarm < 2.5)' }, { m: 'suctionAtS', lo: 0, hi: 600, src: 'tables §8.2: suction event when LV volume < ~40 mL' }, { m: 'ectopy', event: true, src: 'tables §8.2: suction → ventricular ectopy/VT (Stage 5 hook)' }],
  hand: { verdict: 'WR', why: 'a 1.5 L bleed (21 % of the blood volume) lowers pump flow only 3.99 → 3.70 L/min and never reaches suction: the dilated HFrEF ventricle (EDV ×1.5, profile.ts:121) keeps far above LVAD_SUCTION_ML 40 mL, and the HQ term (flow ∝ ΔP) RISES as MAP falls; the suction flag has no consumer (grep: only the circ event reads it) — no ectopy, no PI event, no speed drop' },
  owner: '7a devices.ts (preload dependence, suction) + new Stage 5 hook' });
add({ id: 'DV-18a', tier: 'P2', ctx: 'as DV-16a', state: 'LVAD 5400', intv: 'hypertension: phenylephrine 1 µg/kg/min from 600 s', sys: 'CIRC DEV',
  arms: { i: lv([[600, A.infusion('phenylephrine', 1, 'mcg/kg/min'), 'phenylephrine 1 µg/kg/min']], 1000), c: lv([], 1000) },
  measure: (R) => { const dMap = mean(R.i!.rows, 'map', 800, 1000) - mean(R.c!.rows, 'map', 800, 1000); const dF = mean(R.i!.rows, 'lvadFlow', 800, 1000) - mean(R.c!.rows, 'lvadFlow', 800, 1000);
    return m({ dMap: r1(dMap), dFlow: r2(dF), slopeLpmPerMmHg: r2(dF / dMap) }); },
  expect: [{ m: 'dFlow', dir: -1, tol: 0.1, src: 'tables §8.2: pump flow falls as afterload rises (HQ curve; MAP target < 90 in LVAD patients)' }],
  dirOnly: true, owner: '7a devices.ts LVAD_KH' });
add({ id: 'DV-18b', tier: 'P2', ctx: 'as DV-16a', state: 'LVAD 5400', intv: 'acute RV failure (circ condition rvInfarct 1 at 600 s)', sys: 'CIRC DEV',
  arms: { i: lv([[600, A.cond('rvInfarct', 1), 'rvInfarct 1']], 1000), c: lv([], 1000) },
  measure: (R) => m({ dFlow: r2(mean(R.i!.rows, 'lvadFlow', 800, 1000) - mean(R.c!.rows, 'lvadFlow', 800, 1000)), dCvp: r1(mean(R.i!.rows, 'cvp', 800, 1000) - mean(R.c!.rows, 'cvp', 800, 1000)), suction: anyR(R.i!.rows, 600, 1000, (x) => x.lvadSuction === true), dMap: r1(mean(R.i!.rows, 'map', 800, 1000) - mean(R.c!.rows, 'map', 800, 1000)) }),
  expect: [{ m: 'dFlow', dir: -1, tol: 0.3, src: 'tables §8.2 / research/12 DV-18: RV failure limits LVAD preload — flow falls' }, { m: 'dCvp', dir: 1, tol: 2, src: 'RV failure: CVP rises' }],
  dirOnly: true, owner: '7a devices.ts / circ conditions' });
add({ id: 'DV-19', tier: 'P3', ctx: 'as DV-16a', state: 'LVAD pump thrombosis', intv: 'thrombus in the pump', sys: 'DEV',
  arms: { i: lv([], 700) }, measure: (R) => m({ powerW: w2(R.i!.rows, 'lvadW', 600, 700), flow: w2(R.i!.rows, 'lvadFlow', 600, 700), note: 'power = 0.8 + 0.7·flow (devices.ts:101): power cannot rise without flow' }),
  expect: [{ m: 'powerW', lo: 10, hi: 20, src: 'tables §8.2 (HM3-Abbott): pump thrombosis → sustained power ≥ 10 W with a spuriously high flow estimate' }],
  hand: { verdict: 'MI', why: 'no thrombosis state and no command for it; the console power is a fixed function of flow (lvadNumerics, l2/circ/devices.ts:98–103), so the "power up, flow estimate spuriously high" signature cannot be produced' },
  owner: '7h (LVAD failure modes)' });

// ---- ECMO ---------------------------------------------------------------------------------------------------------------
const ecmoProbe = (label: string, action: Record<string, unknown>) => ({ probe: V([[120, { type: 'device', action }, label]], 150) });
add({ id: 'DV-20a', tier: 'P3', ctx: 'VA-ECMO', state: 'cardiogenic shock / arrest', intv: 'VA-ECMO 4 L/min: pulsatility and PP fall with flow fraction; EtCO2 low', sys: 'CIRC DEV', arms: ecmoProbe('VA-ECMO start', { device: 'vaEcmo', action: 'start', flowLpm: 4 }), measure: (R) => m({ rejected: R.probe!.rejected.join(' | ') }), expect: [], ne: 'no ECMO (research/11 D14; devices.ts bypassFlow throws "VA-ECMO/CPB arrive in Stage 7h")', owner: '7h' });
add({ id: 'DV-20b', tier: 'P3', ctx: 'VV-ECMO', state: 'severe ARDS', intv: 'VV-ECMO 5 L/min, sweep 2–4 L/min: SaO2 as the weighted mix; PaCO2 set by sweep', sys: 'LUNG DEV', arms: ecmoProbe('VV-ECMO start', { device: 'vvEcmo', action: 'start', flowLpm: 5 }), measure: (R) => m({ rejected: R.probe!.rejected.join(' | ') }), expect: [], ne: 'no ECMO (tables §8.5)', owner: '7h' });
add({ id: 'DV-20c', tier: 'P3', ctx: 'VA-ECMO femoral', state: 'recovering LV, poor lungs', intv: 'differential hypoxaemia (right radial SpO2 low, legs normal)', sys: 'LUNG DEV', arms: {}, expect: [], ne: 'no ECMO; also needs site-dependent SpO2 mixing (tables §8.5)', owner: '7h' });
add({ id: 'DV-20d', tier: 'P3', ctx: 'VV-ECMO', state: 'severe ARDS', intv: 'recirculation 0.1–0.3: SaO2 falls without a flow change', sys: 'LUNG DEV', arms: {}, expect: [], ne: 'no ECMO (tables §8.5)', owner: '7h' });
