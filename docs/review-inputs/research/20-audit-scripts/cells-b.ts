// DV group B — synchronised cardioversion (DV-06/07), transcutaneous and implanted pacing (DV-08…10), the
// not-expressible device cells (DV-11/12), the defibrillator as a device (DV-21) and CPR artefacts (DV-23).
import { A, OUTCOME, mean, r1, r2, type ArmResult, type Mark } from './runner.ts';
import { add, anyR, arms, cpr, m, outcome, pulseAt, rh, seeds, share, shock, TVF, V, VF, w, w2, XA } from './spec.ts';

const N = 40;
const PO = (c: Record<string, unknown>) => OUTCOME.outcomeProbabilities({ cls: 'organisedPulse', synced: true, energyJ: 150, defaultJ: 120, vfDurationS: 0, onTPeak: false, ...c });
const conv = (id: string, opts: Record<string, unknown>, J: number) => (seed: number) => V([[TVF, A.rhythm(id, opts), `${id} ${JSON.stringify(opts)}`], ...shock(100, J, { sync: true })], 160, XA, { seed, dt: 5 });
const pref = (p: string, rec: Record<string, any>) => Object.fromEntries(Object.entries(rec).map(([k, v]) => [`${p}${k}`, v]));
const conversions = (R: Record<string, ArmResult>, p: string) => arms(R, p).map(outcome);

// ---- DV-06 synchronised cardioversion ----------------------------------------------------------------------------------
// AF windows are 40 s (C3 / FU-7 Task 0 Step 6b guard: the AF rig loses contractility within minutes on this main).
add({ id: 'DV-06a', tier: 'P1', ctx: 'X-A ventilated, MODELED', state: 'AF 110/min (instructor, 40 s before the shock)', intv: `synchronised 120 J and 200 J biphasic, and 20 J, ${N} seeds each`, sys: 'RHY DEV',
  arms: { ...pref('a', seeds(N, conv('afib', { rateBpm: 110 }, 120))), ...pref('b', seeds(N, conv('afib', { rateBpm: 110 }, 200))), ...pref('z', seeds(N, conv('afib', { rateBpm: 110 }, 20))) },
  measure: (R) => { const a = conversions(R, 'as'), b = conversions(R, 'bs'), z = conversions(R, 'zs');
    return m({ conv120Pct: share(a, (x) => x === 'sinus'), conv200Pct: share(b, (x) => x === 'sinus'), conv20JPct: share(z, (x) => x === 'sinus'), vfPct: share([...a, ...b], (x) => x === 'vf'),
      exact120: r1(100 * (PO({ energyJ: 120 }).sinus ?? 0)), exact20: r1(100 * (PO({ energyJ: 20 }).sinus ?? 0)), energyDependence: r1(share(b, (x) => x === 'sinus') - share(z, (x) => x === 'sinus')) }); },
  expect: [{ m: 'conv200Pct', lo: 75, hi: 95, src: 'biphasic AF cardioversion, first shock 120–200 J: ≈ 75–90 % (Mittal S et al., Circulation 2000;101:1282; Page RL et al., JACC 2002;39:1956; ERC 2021 ALS: start at 120–150 J) [VERIFY]' },
    { m: 'energyDependence', dir: 1, tol: 30, src: 'success rises with energy; a 20 J biphasic shock rarely converts AF (Page 2002: low-energy first shocks ≈ 20–30 %) — direction' }],
  owner: 'L3 outcome.ts CARDIOVERSION_SINUS (FU-7 Task 12 E-FU7-6: energy and rhythm class)' });
add({ id: 'DV-06b', tier: 'P1', ctx: 'X-A ventilated, MODELED', state: 'atrial flutter 2:1 (instructor)', intv: `synchronised 50 J and 100 J biphasic, ${N} seeds each`, sys: 'RHY',
  arms: { ...pref('a', seeds(N, conv('aflutter', { ratio: 2 }, 50))), ...pref('b', seeds(N, conv('aflutter', { ratio: 2 }, 100))) },
  measure: (R) => m({ conv50Pct: share(conversions(R, 'as'), (x) => x === 'sinus'), conv100Pct: share(conversions(R, 'bs'), (x) => x === 'sinus'), exactPct: r1(100 * (PO({ energyJ: 50 }).sinus ?? 0)) }),
  expect: [{ m: 'exactPct', lo: 90, hi: 100, src: 'ERC 2021 ALS: flutter usually converts at lower energy (biphasic 70–120 J); success ≥ 90–95 % (ACC/AHA AF–flutter guideline)' },
    { m: 'conv50Pct', lo: 85, hi: 100, src: 'as above: 50 J biphasic converts most flutter (Neumar 2010 ACLS: 50–100 J); the seeded sample (40 seeds) beside the table\'s exact 80 %' }],
  owner: 'L3 outcome.ts (one 0.8 for every organised rhythm and energy)' });
add({ id: 'DV-06c', tier: 'P1', ctx: 'X-A ventilated, MODELED', state: 'monomorphic VT 150 with a pulse (instructor)', intv: `synchronised 100 J biphasic, ${N} seeds`, sys: 'RHY CIRC',
  arms: seeds(N, conv('vtMono', { rateBpm: 150 }, 100)),
  measure: (R) => { const o = conversions(R, 's'); const r0 = arms(R, 's')[0]!.rows; return m({ convPct: share(o, (x) => x === 'sinus'), exactPct: r1(100 * (PO({ energyJ: 100 }).sinus ?? 0)), vfPct: share(o, (x) => x === 'vf'), mapVt: w(r0, 'map', 70, 95), mapSinus: w(r0, 'map', 20, 55) }); },
  expect: [{ m: 'exactPct', lo: 85, hi: 100, src: 'ERC 2021 ALS (VT with a pulse: synchronised 120–150 J, escalate); cardioversion of stable monomorphic VT succeeds in > 90 % (Neumar 2010 ACLS)' }],
  owner: 'L3 outcome.ts' });

// ---- DV-07 AF · unsynchronised shock -----------------------------------------------------------------------------------
const unsync = (k: number) => V([[TVF, A.rhythm('afib', { rateBpm: 110 }), 'AF 110'], [91 + k * 0.0137 - 9, A.defib('charge', { energyJ: 150 }), 'charge 150 J'], [91 + k * 0.0137, A.defib('shock'), 'UNSYNC shock 150 J']], 150, XA, { seed: k + 1, dt: 5 });
add({ id: 'DV-07', tier: 'P2', ctx: 'X-A ventilated, MODELED', state: 'AF 110', intv: 'UNsynchronised 150 J at 40 phases of the cardiac cycle (vs the synchronised arms of DV-06a)', sys: 'RHY',
  arms: Object.fromEntries(Array.from({ length: 40 }, (_, k) => [`u${k}`, unsync(k)])),
  measure: (R) => { const o = arms(R, 'u').map(outcome); return m({ vfPct: share(o, (x) => x === 'vf'), convPct: share(o, (x) => x === 'sinus'), expectedVfPct: r1(100 * 0.3 * (0.08 / (60 / 110))) }); },
  expect: [{ m: 'vfPct', dir: 1, tol: 0, src: 'research/12 DV-07: an unsynchronised shock on the T wave (vulnerable period) can induce VF — the reason for SYNC (ERC 2021) — direction' }],
  owner: 'L3 outcome.ts R_ON_T_VF' });

// ---- DV-08 CHB 30 · transcutaneous pacing ------------------------------------------------------------------------------
const CHB: [number, any, string] = [TVF, A.rhythm('avb3Wide', { rateBpm: 30 }), 'CHB, ventricular escape 30'];
const mARamp = Array.from({ length: 15 }, (_, i) => [300 + 20 * i, A.pacer('fixed', { ratePpm: 70, mA: 10 * i }), `TCP fixed 70 ppm ${10 * i} mA`] as [number, any, string]);
const capturedMa = (marks: Mark[]): number => { const c = marks.find((x) => x.kind === 'paceSpike' && x.data?.tcp && x.data?.captured); return c ? c.data.mA : NaN; };
add({ id: 'DV-08a', tier: 'P1', ctx: 'X-A ventilated, MODELED (default capture threshold 70 mA, R39-4)', state: 'complete heart block, escape 30', intv: 'TCP fixed 70 ppm, output 0 → 140 mA in 10 mA steps every 20 s', sys: 'RHY DEV',
  arms: { i: V([CHB, ...mARamp], 620, XA, { dt: 5 }) },
  measure: (R) => m({ captureMa: capturedMa(R.i!.marks), spikes: R.i!.marks.filter((x) => x.kind === 'paceSpike').length, hrAfter: w(R.i!.rows, 'hr', 580, 620) }),
  expect: [{ m: 'captureMa', lo: 40, hi: 80, src: 'ERC 2021 ALS / Resuscitation Council UK: capture usually at 50–100 mA; research/12 DV-08 (40–80); R39-4 adult default 70 (patients 40–120)' }],
  owner: '4b pacer / Stage 5 tcp.ts' });
add({ id: 'DV-08b', tier: 'P1', ctx: 'X-A ventilated, MODELED', state: 'CHB 30 (healthy myocardium) vs asystole after 8 min of untreated VF (myocardial state ≈ 0)', intv: 'TCP fixed 70 ppm 100 mA: electrical capture and the pulse', sys: 'RHY CIRC',
  arms: { chb: V([CHB, [300, A.pacer('fixed', { ratePpm: 70, mA: 100 }), 'TCP 100 mA']], 600, XA, { dt: 5 }), dead: V([VF, [540, A.rhythm('asystole'), 'asystole (instructor) after 8 min of VF'], [720, A.pacer('fixed', { ratePpm: 70, mA: 100 }), 'TCP 100 mA']], 960, XA, { dt: 5 }) },
  measure: (R) => { const c = R.chb!.rows, d = R.dead!.rows;
    return m({ mapChb: w(c, 'map', 240, 300), mapPaced: w(c, 'map', 400, 600), coChb: w2(c, 'co', 240, 300), coPaced: w2(c, 'co', 400, 600), dMap: r1(mean(c, 'map', 400, 600) - mean(c, 'map', 240, 300)),
      deadRhythmAtPacing: String(d.find((r) => r.t === 720)!.rhythm), deadCaptured: R.dead!.marks.some((x) => x.kind === 'paceSpike' && x.data?.captured), deadPulse: Number.isFinite(pulseAt(d, 720, 960)), deadMyo: r2(d.find((r) => r.t === 720)!.myo as number),
      dispHrDead: w(d, 'dHr', 760, 960), dispPrDead: w(d, 'dPr', 760, 960) }); },
  expect: [{ m: 'dMap', dir: 1, tol: 5, src: 'ERC 2021: mechanical capture of a healthy ventricle restores output (check the pulse / arterial line)' },
    { m: 'deadCaptured', event: true, src: 'electrical capture of a dying myocardium is possible (the paced complexes appear) …' },
    { m: 'deadPulse', event: false, src: '… without mechanical capture: "electrical ≠ mechanical capture — check the pulse" (research/12 DV-08; ERC 2021 ALS pacing)' }],
  owner: 'Stage 5 tcp.ts / 7a (paced beats eject by contractility)' });
add({ id: 'DV-08c', tier: 'P1', ctx: 'X-A awake, spontaneous (no sedation), MODELED', state: 'CHB 30', intv: 'TCP 80 mA (discomfort): sympathetic/pain response vs the same capture in the ventilated GA rig', sys: 'END CIRC NEU',
  arms: { aw: { patient: XA, steps: [CHB, [300, A.pacer('fixed', { ratePpm: 70, mA: 80 }), 'TCP 80 mA']], tEnd: 600, dt: 5 }, ga: V([[1, A.thermal({ anaesthesia: 'general' }), 'GA'], CHB, [300, A.pacer('fixed', { ratePpm: 70, mA: 80 }), 'TCP 80 mA']], 600, XA, { dt: 5 }) },
  measure: (R) => { const a = R.aw!.rows, g = R.ga!.rows; return m({ dEpiAwake: r1(mean(a, 'epi', 400, 600) - mean(a, 'epi', 240, 300)), dNeAwake: r1(mean(a, 'ne', 400, 600) - mean(a, 'ne', 240, 300)), mapAwake: w(a, 'map', 400, 600), mapGa: w(g, 'map', 400, 600), dMapAwakeVsGa: r1(mean(a, 'map', 400, 600) - mean(g, 'map', 400, 600)) }); },
  expect: [{ m: 'dNeAwake', dir: 1, tol: 50, src: 'ERC 2021 ALS: transcutaneous pacing is painful — analgesia/sedation; the awake patient\'s pain raises catecholamines (research/12 DV-08)' }],
  hand: { verdict: 'MI', why: 'the pacer writes only Modifiers.tcp (l3/device-layer.ts:285–291); nothing reaches 7e\'s stimulus or 7f\'s consciousness — an awake patient paced at 80 mA has no pain, no surge, no movement (any catecholamine change is the baroreflex answering the paced MAP)' },
  owner: 'new: 4b pacer → 7e stimulus (pain as a nociceptive input scaled by mA and depth)' });

// ---- DV-09 TCP failure to capture / sense ------------------------------------------------------------------------------
add({ id: 'DV-09a', tier: 'P2', ctx: 'X-A ventilated, MODELED', state: 'CHB 30', intv: 'TCP 100 mA with the instructor fault failureToCapture', sys: 'RHY CIRC',
  arms: { i: V([CHB, [300, A.pacer('fixed', { ratePpm: 70, mA: 100, fault: 'failureToCapture' }), 'TCP 100 mA, failure to capture']], 500, XA, { dt: 5 }) },
  measure: (R) => m({ spikes: R.i!.marks.filter((x) => x.kind === 'paceSpike').length, captured: R.i!.marks.filter((x) => x.kind === 'paceSpike' && x.data?.captured).length, hr: w(R.i!.rows, 'hr', 400, 500), map: w(R.i!.rows, 'map', 400, 500) }),
  expect: [{ m: 'captured', lo: 0, hi: 0, src: 'research/12 DV-09: spikes without capture, no mechanical beats' }, { m: 'hr', lo: 25, hi: 35, src: 'the escape rhythm (30) continues underneath' }],
  owner: '4b pacer' });
add({ id: 'DV-09b', tier: 'P2', ctx: 'X-A ventilated, MODELED', state: 'sinus bradycardia 50 (intrinsic beats present)', intv: 'TCP DEMAND 70 ppm 80 mA with failureToSense (pacer fires asynchronously) vs demand without the fault', sys: 'RHY',
  arms: { i: V([[TVF, A.rhythm('sinusBrady', { rateBpm: 50 }), 'sinus brady 50'], [300, A.pacer('demand', { ratePpm: 70, mA: 80, fault: 'failureToSense' }), 'TCP demand 80 mA, failure to sense']], 500, XA, { dt: 5 }), ok: V([[TVF, A.rhythm('sinusBrady', { rateBpm: 50 }), 'sinus brady 50'], [300, A.pacer('demand', { ratePpm: 70, mA: 80 }), 'TCP demand 80 mA']], 500, XA, { dt: 5 }) },
  measure: (R) => { const sp = R.i!.marks.filter((x) => x.kind === 'paceSpike' && x.t > 300); const ok = R.ok!.marks.filter((x) => x.kind === 'paceSpike' && x.t > 300);
    return m({ spikesPerMin: r1(sp.length / (200 / 60)), capturedShare: r2(sp.filter((x) => x.data?.captured).length / Math.max(1, sp.length)), spikesPerMinOk: r1(ok.length / (200 / 60)), hr: w(R.i!.rows, 'hr', 400, 500), vf: anyR(R.i!.rows, 300, 500, (r) => r.rhythm === 'vfCoarse') }); },
  expect: [{ m: 'spikesPerMin', lo: 65, hi: 75, src: 'research/12 DV-09: failure to sense = asynchronous pacing at the set rate, competing with the intrinsic rhythm' }, { m: 'capturedShare', lo: 0.2, hi: 0.95, src: 'competition: spikes that fall in the refractory period do not capture' }],
  owner: '4b pacer / Stage 5 tcp.ts' });

// ---- DV-10 implanted pacemaker faults ----------------------------------------------------------------------------------
const VVI = (fault?: string, faultRate?: number) => A.rhythm('pacedVVI', { rateBpm: 70, pacer: { ratePpm: 70, intrinsic: 'none', ...(fault ? { fault, faultRate } : {}) } });
add({ id: 'DV-10a', tier: 'P2', ctx: 'X-A ventilated, pacemaker-dependent (VVI 70 over CHB, `opts.pacer.intrinsic none`), MODELED', state: 'VVI 70', intv: 'loss of capture (failureToCapture, faultRate 1) at 300 s', sys: 'RHY CIRC',
  arms: { i: V([[TVF, VVI(), 'VVI 70 dependent'], [300, VVI('failureToCapture', 1), 'VVI failure to capture']], 600, XA, { dt: 5 }) },
  measure: (R) => m({ hrBefore: w(R.i!.rows, 'hr', 240, 300), hrAfter: w(R.i!.rows, 'hr', 360, 600), mapAfter: w(R.i!.rows, 'map', 360, 600), arrest: anyR(R.i!.rows, 300, 600, (r) => r.arrest !== ''), rhythms: rh(R.i!) }),
  expect: [{ m: 'hrAfter', lo: 0, hi: 40, src: 'tables §8.4 pacemaker-dependent failure: underlying CHB escape 30–35 or asystole (research/12 DV-10)' }],
  owner: 'Stage 5 pacing.ts' });
add({ id: 'DV-10b', tier: 'P2', ctx: 'X-A ventilated, MODELED', state: 'DDD 60 with conducted sinus 75 (sensing) / VVI-dependent', intv: 'failure to sense (DDD) → competition; oversensing (VVI, faultRate 1) → inhibition', sys: 'RHY CIRC',
  arms: { fts: V([[TVF, A.rhythm('pacedDDD', { rateBpm: 75, pacer: { ratePpm: 60, intrinsic: 'conducted', fault: 'failureToSense', faultRate: 1 } }), 'DDD 60, sinus 75 conducted, failure to sense']], 400, XA, { dt: 5 }),
    ovs: V([[TVF, VVI(), 'VVI 70 dependent'], [300, VVI('oversensing', 1), 'VVI oversensing']], 600, XA, { dt: 5 }) },
  measure: (R) => { const sp = R.fts!.marks.filter((x) => x.kind === 'paceSpike' && x.t > 120 && !x.data?.tcp);
    return m({ ftsSpikesPerMin: r1(sp.length / (280 / 60)), ftsHr: w(R.fts!.rows, 'hr', 120, 400), ovsHrAfter: w(R.ovs!.rows, 'hr', 360, 600), ovsMapAfter: w(R.ovs!.rows, 'map', 360, 600), ovsSpikes: R.ovs!.marks.filter((x) => x.kind === 'paceSpike' && x.t > 305).length }); },
  expect: [{ m: 'ftsSpikesPerMin', dir: 1, tol: 20, src: 'failure to sense: spikes continue on top of the intrinsic rhythm (competition)' }, { m: 'ovsSpikes', lo: 0, hi: 2, src: 'oversensing inhibits the output: no spikes' }, { m: 'ovsHrAfter', lo: 0, hi: 40, src: 'the dependent patient falls to the escape or asystole' }],
  owner: 'Stage 5 pacing.ts' });
add({ id: 'DV-10c', tier: 'P2', ctx: 'X-A ventilated, pacemaker-dependent VVI 70, MODELED', state: 'VVI 70', intv: 'electrosurgery (diathermy) bursts near the generator: EMI oversensing', sys: 'RHY DEV',
  arms: { probe: V([[TVF, VVI(), 'VVI 70 dependent'], ...[300, 305, 310, 315].map((t) => [t, { type: 'setModifiers', modifiers: { artefact: { electrosurgery: { atS: t, durationS: 4 } } } }, `diathermy burst 4 s at ${t}`] as any)], 400, XA, { dt: 1 }) },
  measure: (R) => m({ spikesDuringBurst: R.probe!.marks.filter((x) => x.kind === 'paceSpike' && x.t > 300 && x.t < 319).length, hrDuring: w(R.probe!.rows, 'hr', 300, 319), rejected: R.probe!.rejected.join(' | ') }),
  expect: [], ne: 'no coupling from the ECG electrosurgery artefact to the pacemaker\'s sensing (the EMI arm of research/12 DV-10 is NE); PROBE: what the burst does to the VVI output — the instructor must use the `oversensing` fault instead',
  owner: 'Stage 5 pacing.ts / FU-7 (EMI → oversensing)' });

// ---- DV-11 / DV-12 not expressible -------------------------------------------------------------------------------------
add({ id: 'DV-11', tier: 'P2', ctx: 'X-A, VVI 70', state: 'pacemaker', intv: 'magnet over the generator', sys: 'RHY',
  arms: { probe: V([[TVF, VVI(), 'VVI'], [120, { type: 'device', action: { device: 'pacemaker', action: 'magnet' } }, 'magnet']], 180, XA) },
  measure: (R) => m({ rejected: R.probe!.rejected.join(' | ') }), expect: [], ne: 'no magnet (research/12 §5.8 blocker; tables §8.4: asynchronous VOO/DOO at the vendor magnet rate 85–100)', owner: '7h' });
add({ id: 'DV-12a', tier: 'P2', ctx: 'ICD patient', state: 'VF', intv: 'ICD detection and internal shock', sys: 'RHY DEV',
  arms: { probe: V([[120, { type: 'device', action: { device: 'icd', action: 'enable' } }, 'ICD']], 180, XA) }, measure: (R) => m({ rejected: R.probe!.rejected.join(' | ') }), expect: [], ne: 'no ICD (research/11 D15; tables §8.3)', owner: '7h' });
add({ id: 'DV-12b', tier: 'P2', ctx: 'ICD patient', state: 'monomorphic VT 190', intv: 'anti-tachycardia pacing (8 pulses at 88 % of the cycle), then shock', sys: 'RHY DEV', arms: {}, expect: [], ne: 'no ICD (tables §8.3)', owner: '7h' });

// ---- DV-21 defibrillator state and audio --------------------------------------------------------------------------------
const chargeRig = (skin: string) => V([[100, A.defib('charge', { energyJ: 200 }), 'charge 200 J'], [130, A.defib('charge', { energyJ: 360 }), 'charge 360 J'], [150, A.defib('disarm'), 'disarm'], [160, A.defib('charge', { energyJ: 200 }), 'charge 200 J, then leave it']], 260, XA, { skin, dt: 5 });
const ct = (R2: ArmResult, t0: number) => { const s = R2.marks.find((x) => x.kind === 'chargeStart' && x.t >= t0); const r = R2.marks.find((x) => x.kind === 'chargeReady' && x.t >= t0); return s && r ? r2(r.t - s.t) : NaN; };
const autoDis = (R2: ArmResult) => { const d = R2.marks.find((x) => x.kind === 'disarm' && x.data?.auto); const r = [...R2.marks].filter((x) => x.kind === 'chargeReady').pop(); return d && r ? r1(d.t - r.t) : NaN; };
add({ id: 'DV-21a', tier: 'P1', ctx: 'X-A, skins lifepak-like, zoll-like and philips-like (no defibrillator of its own)', state: 'sinus', intv: 'charge 200 J, charge 360 J, disarm, charge and leave it armed', sys: 'DEV',
  arms: { lp: chargeRig('lifepak-like'), zo: chargeRig('zoll-like'), ph: chargeRig('philips-like') },
  measure: (R) => m({ lp200: ct(R.lp!, 100), lp360: ct(R.lp!, 130), zo200: ct(R.zo!, 100), zo360: ct(R.zo!, 130), ph200: ct(R.ph!, 100), lpAutoDisarmS: autoDis(R.lp!), zoAutoDisarmS: autoDis(R.zo!),
    tones: [...new Set(R.lp!.tones.map((x) => x.kind))].join(','), defaultJ: `lifepak ${R.lp!.device[0]?.defib?.energyJ} / zoll ${R.zo!.device[0]?.defib?.energyJ} / philips ${R.ph!.device[0]?.defib?.energyJ}` }),
  expect: [{ m: 'lp200', lo: 3, hi: 10, src: 'LIFEPAK 15 operating instructions: charge to 200 J in < 10 s (typically ≈ 5–7), 360 J < 10 s; IEC 60601-2-4: ≤ 15 s to maximum energy [VERIFY vendor figure]' },
    { m: 'lp360', lo: 5, hi: 15, src: 'as above' }, { m: 'zo200', lo: 3, hi: 10, src: 'ZOLL R Series: charge to 200 J in < 7 s [VERIFY]' }, { m: 'lpAutoDisarmS', lo: 30, hi: 90, src: 'LIFEPAK 15: an unused charge is removed after 60 s (auto-disarm) [VERIFY]' }],
  owner: '4b defib.ts / skins' });
add({ id: 'DV-21b', tier: 'P1', ctx: 'X-A, lifepak-like', state: 'AF 110', intv: 'SYNC on, charge 150 J, shock (outcome pre-selected unchanged so the rhythm stays): sync markers, delay from R, the shock tone and SYNC after the shock', sys: 'DEV RHY',
  arms: { af: V([[TVF, A.rhythm('afib', { rateBpm: 110 }), 'AF 110'], ...shock(100, 150, { sync: true, pre: 'unchanged' })], 130, XA, { skin: 'lifepak-like', dt: 1 }) },
  measure: (R) => { const mk = R.af!.marks; const sh = mk.find((x) => x.kind === 'shock'); const lastR = [...mk].filter((x) => x.kind === 'syncR' && sh && x.t <= sh.data.atS).pop();
    const syncRs = mk.filter((x) => x.kind === 'syncR' && x.t > 90 && x.t < 100).length;
    const after = R.af!.device.filter((d) => sh && d.t > sh.t + 0.5)[0];
    return m({ syncMarkersPerMinBeforeShock: r1(syncRs * 6), delayFromRms: sh && lastR ? r1(1000 * (sh.data.atS - lastR.t)) : NaN, shockTone: R.af!.tones.some((x) => x.kind === 'shock'), syncAfterShock: after ? after.defib.sync === true : 'n/a' }); },
  expect: [{ m: 'delayFromRms', lo: 0, hi: 60, src: 'IEC 60601-2-4 (synchronised discharge within 60 ms of the R-wave peak); research/05 §2.6' },
    { m: 'syncMarkersPerMinBeforeShock', lo: 90, hi: 130, src: 'a sync marker on every detected R (AF 110)' }],
  owner: '4b sync.ts / device-layer.ts' });

// ---- DV-23 CPR artefact on ECG / SpO2 / ART -----------------------------------------------------------------------------
add({ id: 'DV-23a', tier: 'P2', ctx: 'X-A ventilated, MODELED', state: 'VF', intv: 'CPR q 0.8 at 110/min: does the ECG carry the compression artefact, and the arterial line the compression pulses?', sys: 'DEV',
  arms: { i: V([VF, cpr(120, 0.8, 110)], 300, XA, { dt: 1 }) },
  measure: (R) => m({ ecgCprArtefact: false, artPr: w(R.i!.rows, 'dPrAbp', 200, 300), artSys: w(R.i!.rows, 'dAbpS', 200, 300), artDia: w(R.i!.rows, 'dAbpD', 200, 300), artFlag: String(R.i!.rows.find((r) => r.t === 250)!.dAbpF) }),
  expect: [{ m: 'ecgCprArtefact', event: true, src: 'research/12 DV-23; audit 10: compressions make a large ECG artefact at the compression rate (the reason rhythm checks need pauses)' }, { m: 'artPr', lo: 100, hi: 120, src: 'the arterial line shows each compression' }],
  hand: { verdict: 'IN', why: 'the `cpr` clinical event drives the circulation, pleth, NIBP and capnogram (hemo/pipeline.ts planCompressions) but NOT the ECG: the compression artefact is a separate ECG modifier `artefact.cpr` (l2/ecg/api-types.ts:106–108) that nothing couples to the event (engine.ts and the controller never set it) — one act, two commands; a scenario that starts CPR shows a clean VF trace unless the author also sets the artefact (`ecgCprArtefact` is set from this code reading, not measured)' },
  owner: 'new: engine.ts (couple `cpr` → `artefact.cpr` at the same rate, depth from quality)' });
add({ id: 'DV-23b', tier: 'P2', ctx: 'X-A ventilated, MODELED', state: 'VF', intv: 'CPR q 0.8 at 110/min: the SpO2 tile and its pulse rate', sys: 'DEV',
  arms: { i: V([VF, cpr(120, 0.8, 110)], 300, XA, { dt: 1 }) },
  measure: (R) => { const r = R.i!.rows.filter((x) => (x.t as number) > 180); return m({ spo2QuestionablePct: r1((100 * r.filter((x) => x.dSpo2F === 'questionable').length) / r.length), spo2Shown: w(R.i!.rows, 'dSpo2', 180, 300), pr: w(R.i!.rows, 'dPr', 180, 300), prFlag: String(r[10]!.dPrF) }); },
  expect: [{ m: 'spo2QuestionablePct', lo: 80, hi: 100, src: 'audit 10 A10-A4c (FU-5): the SpO2 tile shows "?" during CPR' }, { m: 'pr', lo: 100, hi: 120, src: 'research/12 DV-23: PR = compression rate' }],
  owner: 'FU-5 (pleth quality)' });
