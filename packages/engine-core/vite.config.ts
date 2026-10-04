/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// CI splits the engine tests in two jobs (see .github/workflows/ci.yml): the SLOW set (multi-sim-hour drift runs,
// long clinical scenarios) runs serially in its own job so its long synchronous stretches never starve the Vitest
// worker RPC of the main job ("Timeout calling onTaskUpdate" after Stage 7a/7b raised the per-tick cost).
// PME_TEST_SET=fast excludes the slow set, PME_TEST_SET=slow runs only it (one file at a time); unset = everything.
const SLOW = [
  'test/engine/**/*longrun*.test.ts',
  'test/engine/engine-pipeline.test.ts', // holds the ECG 6 h/24 h drift run
  'test/engine/lung-recruitment.test.ts',
  'test/engine/lung-unilateral.test.ts',
  'test/engine/lung-copd.test.ts',
  'test/engine/resp-coupling.test.ts',
  'test/engine/hemo-nibp.test.ts',
  'test/engine/fidelity-*.test.ts', // FU-5: monitor-fidelity scenarios (up to 45 sim-min each)
  'test/engine/circ-sanity-*.test.ts',
  'test/engine/pk-acceptance-*.test.ts',
  'test/engine/endo-acceptance.test.ts', // Stage 7e: MH, glucose and sepsis scenarios (sim-hours)
  'test/engine/endo-circ-acceptance.test.ts', // Stage 7e: MODELED sepsis warm → cold (2 sim-h)
  'test/engine/blood-stage3-recheck.test.ts', // Stage 7c: four desaturations + a 70 min OLV run
  'test/engine/blood-sanity-*.test.ts', // Stage 7c: 2 h haemorrhage/transfusion and acid–base scenarios
  'test/engine/blood-hyperk.test.ts', // Stage 7c: 30 min succinylcholine/calcium/insulin and salbutamol scenarios
  'test/engine/circ-rate-rule.test.ts', // FU-2: MODELED rhythm-rate scenarios (2–4 sim-min each)
  'test/engine/pacer-sensing.test.ts', // FU-3: MODELED AAI/DDD sensing scenarios (4 sim-min each)
  'test/engine/af-rate-control.test.ts', // FU-2: AF rate control (13–22 sim-min each)
  'test/engine/hr-af-numeric.test.ts', // FU-3: HR numeric vs the true AF rate (11 runs of 400 sim-s)
  'test/engine/neuro-*.test.ts', // Stage 7f: 100 sim-min rocuronium, 24 h maintenance, MODELED drive scenarios
  'test/engine/organs-soak.test.ts', // Stage 7d: 24 h / 6 h organ drift run
  'test/engine/organs-tbi.test.ts', // Stage 7d: check 19 (45 sim-min per mode)
  'test/engine/organs-tbi-treatment.test.ts', // Stage 7d: check 19 treatments (paired 12–42 sim-min runs)
  'test/engine/organs-htn.test.ts', // Stage 7d: check 18 (≈ 70 sim-min)
  'test/engine/organs-renal.test.ts', // Stage 7d: haemorrhage and check 20 (2 sim-h each)
  'test/engine/organs-curves.test.ts', // Stage 7d: curve acceptance (up to 2.5 sim-h)
  'test/engine/circ-manual-ischaemia.test.ts', // FU-3 item 4: the check-18 rig to MAP 65 (9 sim-min)
  'test/engine/circ-manual-cvp-peep.test.ts', // FU-3 item 7: 8 soak-patient runs of 300 sim-s each
  'test/engine/circ-hypoxic-arrest.test.ts', // FU-3 item 16: four 15–20 sim-min asphyxia runs
  'test/engine/resp-bronchodilation.test.ts', // FU-6 R2: eight 30 sim-min bronchospasm arms
  'test/engine/resp-bronchospasm-one.test.ts', // FU-6 R6: four ≤ 22 sim-min bronchospasm runs
  'test/engine/resp-induction.test.ts', // FU-6 R3(a): six 15 sim-min inductions
  'test/engine/resp-obstruction.test.ts', // FU-6 R3(b, c): two 15 sim-min obstruction runs
  'test/engine/resp-pleural-effort.test.ts', // FU-6 R3(b): a 13 sim-min laryngospasm run
  'test/engine/resp-ga-state.test.ts', // FU-6 R4: three apnoea runs of 19 sim-min and a 40 sim-min ventilated run
  'test/engine/resp-vcv-pmax.test.ts', // FU-6 R7: two 10 sim-min near-fatal bronchospasm runs
  'test/engine/resp-drive-fu6.test.ts', // FU-6 R12: a 32 sim-min stimulus run and a 20 sim-min PE run
  'test/engine/resp-trigger.test.ts', // FU-6 R9: three ≤ 7 sim-min ventilator runs
  'test/engine/resp-inspired-co2.test.ts', // FU-6 R8: four 25 sim-min rebreathing runs
  'test/engine/resp-pregnancy.test.ts', // FU-6 R10: a 20 sim-min awake run and a 14 sim-min apnoea run
  'test/engine/blood-anaemia-co.test.ts', // FU-6 R11: four 20 sim-min anaemia runs and two 60 sim-min COHb runs
  'test/engine/lung-hpv-volatile.test.ts', // FU-6 R13: two 40 sim-min OLV runs
  'test/engine/lung-r14.test.ts', // FU-6 R14: two 25 sim-min hypercapnia runs, a 35 sim-min ARDS run, a 20 sim-min induction
  'test/engine/resp-child-baseline.test.ts', // FU-6 R15: two 15 sim-min child runs
  'test/engine/resp-suite.test.ts', // FU-6 Task 18: the RS1–RS15 respiratory suite (≈ 5 sim-h in total)
  'test/engine/circ-lowflow-arrest.test.ts', // FU-4 G1: four 25–30 sim-min haemorrhage/ROSC runs
  'test/engine/blood-k-rhythm.test.ts', // FU-4 G3: hyperkalaemia runs of 2–20 sim-min
  'test/engine/clinical-suite.test.ts', // FU-4 Task 22: the clinical scenario suite (SLOW_A)
  'test/engine/fu9-*.test.ts', // FU-9: blood/fluid/acid–base/renal scenarios, 10–90 sim-min arms (SLOW_C)
  'test/engine/circ-pulsus.test.ts', // FU-4 G6: two 10 sim-min spontaneous-breathing runs
  'test/engine/vagal-events.test.ts', // FU-4 G7: vagal-event runs of 5–10 sim-min
  'test/engine/thermal-warmer.test.ts', // FU-4 item 1: four 60 sim-min warming runs
  'test/engine/tension-ptx.test.ts', // FU-4 F3: three 7–16 sim-min tension-pneumothorax runs
  'test/engine/af-pulse-deficit.test.ts', // FU-4 Task 17: two 320 sim-s AF 150 runs
  'test/engine/fu8-*.test.ts', // FU-8: monitor-in-arrest, agonal, oliguria and negative-volume rigs (SLOW_A: slow-b's margin is 2.4 min)
  'test/engine/fu10-*.test.ts', // FU-10: the endocrine/thermal rigs, placed by CI per-file time (SLOW_A and SLOW_F below; insulin-omission is slow-b)
  'test/engine/resp-mechanics.test.ts', // Stage 7k: nine 5 sim-min mechanics rigs and two 16 sim-min bronchodilator arms (slow-a: slow-b is at 37.6 of 40 min)
  'test/engine/drug-apnoea.test.ts', // FU-7 Task 7: 20–25 sim-min spontaneous drug rigs incl. a 20-seed Bailey population
  'test/engine/cat-reserve-engine.test.ts', // FU-7 Task 9: four 15 sim-min ketamine arms
  'test/engine/stimulus-surge.test.ts', // FU-7 Task 10: ≈ 40 ventilated arms of 10–60 sim-min
  'test/engine/fu7-nmb-one-state.test.ts', // FU-7 Task 14: two 140 sim-min rocuronium arms + four 15 sim-min sux arms
  'test/engine/fu7-volatile.test.ts', // FU-7 Task 15: two 30 sim-min desflurane arms
  'test/engine/drug-layer.test.ts', // FU-7 Tasks 16 + 19: the drug-layer engine cases
  'test/engine/drug-layer-guards.test.ts', // FU-7 Task 19 case 7: the regression guards (split from drug-layer by time)
];
/**
 * FU-4 (D17): CI runs the slow set as two jobs (`slow-a`, `slow-b`) so neither passes ≈ 40 min on the runner; `slow` still
 * runs both locally. SLOW_A: the multi-hour drift files, the engine pipeline, the organ soak and the FU-4 clinical suite;
 * SLOW_B: every other SLOW entry. A new slow file joins SLOW (and, if it is a multi-hour run, SLOW_A).
 */
const SLOW_A = [
  // FU-9 Gate (CI amendment 5, re-split by the CI per-file times of PR #31, run 37135534941): the multi-hour drift runs
  // (1438 s), the engine pipeline (196), the organ soak (207) and FU-8's files (385) — 2226 s ≈ 37 min.
  'test/engine/**/*longrun*.test.ts', 'test/engine/engine-pipeline.test.ts', 'test/engine/organs-soak.test.ts',
  'test/engine/fu8-*.test.ts', // FU-8: its files join slow-a
  'test/engine/fu10-adrenal.test.ts', // FU-10 Gate (after FU-7): 389 s on CI (PR #37 run 37199560174)
];
/**
 * FU-9 Gate (CI amendment 5): slow-a ran 70 min on CI (4191 s of tests) on PRs #29–#31 — FU-6's files had joined it
 * (executor instruction, 2026-09-29: slow-b was near its limit) and Stage 7k added one. Three groups cannot hold the
 * 8 794 s the slow set takes on the CI runner under 40 min each, so a FOURTH group takes the FU-4 clinical suite, FU-6's
 * respiratory files, Stage 7k's mechanics file and vagal-events: 2165 s ≈ 36 min. A new slow file joins SLOW and the
 * group whose CI sum it fits.
 */
const SLOW_D = [
  'test/engine/clinical-suite.test.ts', // FU-4 Task 22 (467 s on CI)
  'test/engine/resp-suite.test.ts', // FU-6 Task 18 (426 s)
  'test/engine/resp-bronchodilation.test.ts',
  'test/engine/resp-bronchospasm-one.test.ts',
  'test/engine/resp-induction.test.ts',
  'test/engine/resp-obstruction.test.ts',
  'test/engine/resp-pleural-effort.test.ts',
  'test/engine/resp-ga-state.test.ts',
  'test/engine/resp-vcv-pmax.test.ts',
  'test/engine/resp-drive-fu6.test.ts',
  'test/engine/resp-trigger.test.ts',
  'test/engine/resp-inspired-co2.test.ts',
  'test/engine/resp-pregnancy.test.ts',
  'test/engine/blood-anaemia-co.test.ts',
  'test/engine/lung-hpv-volatile.test.ts',
  'test/engine/lung-r14.test.ts',
  'test/engine/resp-child-baseline.test.ts',
  'test/engine/resp-mechanics.test.ts', // Stage 7k (58 s)
  'test/engine/vagal-events.test.ts', // FU-4 G7, from slow-b by time (140 s)
];
// FU-4 (R50 review F8): SLOW_B is SLOW minus the other groups, and the difference cannot be taken by STRING comparison —
// the glob 'test/engine/neuro-*.test.ts' is not equal to 'test/engine/**/*longrun*.test.ts' but MATCHES the same 6 h
// neuro long run, so the measured lists were 10 + 35 files for a 44-file union and that run executed in BOTH CI jobs.
// The set difference is therefore made by Vitest's own matcher, with the other groups as an `exclude` on each run.
/**
 * FU-9 (CI amendment 5, R50 ruling R10): slow-c takes FU-9's engine files plus the slow files listed here, chosen by
 * measured per-file time (docs/gates/fu-9.md §2); slow-b is SLOW minus SLOW_A, SLOW_C and SLOW_D by the same matcher.
 * ci.yml's build job prints the four lists and fails on an overlap or a gap. CI sums on PR #31: slow-b 2425 s →
 * 2149 s after this split (vagal-events → slow-d, thermal-warmer → slow-c); slow-c 2120 → 2256 s.
 */
const SLOW_C = [
  'test/engine/fu9-*.test.ts', 'test/engine/pk-acceptance-pd.test.ts', 'test/engine/endo-acceptance.test.ts',
  'test/engine/organs-renal.test.ts', 'test/engine/blood-sanity-acid.test.ts', 'test/engine/pk-acceptance-pk.test.ts',
  'test/engine/thermal-warmer.test.ts', // FU-9 Gate: from slow-b by time (136 s)
];
/**
 * FU-7 gate (finisher, 2026-10-04): FU-7's seven slow files measured 1 578 s on the local slow-a run (drug-layer 1 018 s
 * before its split, drug-apnoea 331, stimulus-surge 144, fu7-nmb-one-state 59, cat-reserve-engine 14, fu7-volatile 12).
 * At the CI/local ratio of the FU-6 files (clinical-suite 467/170 s, resp-suite 426/160 s ≈ 2.7) that is ≈ 4 250 s on the
 * runner, and FU-9's four groups leave ≈ 800 s of room under 40 min — so two more groups, each ≈ 35 min by estimate:
 * slow-e = the regression guards (≈ 1 510 s) + stimulus-surge + the three small files; slow-f = drug-layer (≈ 1 240 s) +
 * drug-apnoea (≈ 890 s). The CI sums of the PR's first run replace these estimates in the gate note.
 */
const SLOW_E = [
  'test/engine/drug-layer-guards.test.ts', 'test/engine/stimulus-surge.test.ts', 'test/engine/fu7-nmb-one-state.test.ts',
  'test/engine/cat-reserve-engine.test.ts', 'test/engine/fu7-volatile.test.ts',
];
/**
 * FU-10 Gate (after the FU-7 merge): FU-10's six files took 2 208 s on CI (PR #37 run 37199560174: thresholds 804,
 * insulin-omission 670, adrenal 389, insulin-dextrose 152, mh-trigger 145, fever 48). Against FU-7's PR CI sums (a 1837,
 * b 1573, c 2295, d 2075, e 2222, f 862 s) the six groups have ≈ 2 050 s of room under 35 min, so the fit is: slow-f +
 * thresholds, insulin-dextrose, mh-trigger, fever (≈ 2 011 s); slow-a + adrenal (≈ 2 226 s); slow-b + insulin-omission
 * (≈ 2 243 s, by the glob). Every group ≤ ≈ 37 min by estimate; the merged PR's first CI run replaces these numbers.
 */
const SLOW_F = [
  'test/engine/drug-layer.test.ts', 'test/engine/drug-apnoea.test.ts',
  'test/engine/fu10-thresholds.test.ts', 'test/engine/fu10-insulin-dextrose.test.ts', 'test/engine/fu10-mh-trigger.test.ts', 'test/engine/fu10-fever.test.ts',
];
const SLOW_B = SLOW.filter((p) => !SLOW_A.includes(p) && !SLOW_C.includes(p) && !SLOW_D.includes(p) && !SLOW_E.includes(p) && !SLOW_F.includes(p));
const set = process.env.PME_TEST_SET;

export default defineConfig({
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  // Stage 7a: every engine now integrates the four-chamber circulation (≈ +60 % CPU per tick); the 5 s default left
  // no margin for the short engine tests on a loaded 2-vCPU runner. Long tests keep their explicit budgets.
  test: {
    testTimeout: 30_000,
    ...(set === 'fast' ? { exclude: ['**/node_modules/**', '**/dist/**', ...SLOW] } : {}),
    ...(set === 'slow' ? { include: SLOW, fileParallelism: false } : {}),
    ...(set === 'slow-a' ? { include: SLOW_A, fileParallelism: false } : {}), // FU-4 (D17)
    // FU-4 (R50 review F8): the groups MUST be disjoint — SLOW_A is excluded here by the same matcher that includes it
    // above, so a file matching a SLOW_A glob (e.g. the 6 h neuro long run) runs in slow-a only, never in both jobs.
    ...(set === 'slow-b' ? { include: SLOW_B, exclude: ['**/node_modules/**', '**/dist/**', ...SLOW_A, ...SLOW_C, ...SLOW_D, ...SLOW_E, ...SLOW_F], fileParallelism: false } : {}),
    ...(set === 'slow-c' ? { include: SLOW_C, exclude: ['**/node_modules/**', '**/dist/**', ...SLOW_A, ...SLOW_D], fileParallelism: false } : {}), // FU-9 (CI amendment 5)
    ...(set === 'slow-d' ? { include: SLOW_D, exclude: ['**/node_modules/**', '**/dist/**', ...SLOW_A, ...SLOW_C], fileParallelism: false } : {}), // FU-9 Gate: the fourth group
    ...(set === 'slow-e' ? { include: SLOW_E, exclude: ['**/node_modules/**', '**/dist/**', ...SLOW_A, ...SLOW_C, ...SLOW_D, ...SLOW_F], fileParallelism: false } : {}), // FU-7 gate
    ...(set === 'slow-f' ? { include: SLOW_F, exclude: ['**/node_modules/**', '**/dist/**', ...SLOW_A, ...SLOW_C, ...SLOW_D, ...SLOW_E], fileParallelism: false } : {}), // FU-7 gate
  },
});
