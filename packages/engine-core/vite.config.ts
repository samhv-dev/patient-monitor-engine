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
  'test/engine/circ-lowflow-arrest.test.ts', // FU-4 G1: four 25–30 sim-min haemorrhage/ROSC runs
  'test/engine/blood-k-rhythm.test.ts', // FU-4 G3: hyperkalaemia runs of 2–20 sim-min
  'test/engine/clinical-suite.test.ts', // FU-4 Task 22: the clinical scenario suite (SLOW_A)
  'test/engine/circ-pulsus.test.ts', // FU-4 G6: two 10 sim-min spontaneous-breathing runs
  'test/engine/vagal-events.test.ts', // FU-4 G7: vagal-event runs of 5–10 sim-min
  'test/engine/thermal-warmer.test.ts', // FU-4 item 1: four 60 sim-min warming runs
  'test/engine/tension-ptx.test.ts', // FU-4 F3: three 7–16 sim-min tension-pneumothorax runs
  'test/engine/af-pulse-deficit.test.ts', // FU-4 Task 17: two 320 sim-s AF 150 runs
];
/**
 * FU-4 (D17): CI runs the slow set as two jobs (`slow-a`, `slow-b`) so neither passes ≈ 40 min on the runner; `slow` still
 * runs both locally. SLOW_A: the multi-hour drift files, the engine pipeline, the organ soak and the FU-4 clinical suite;
 * SLOW_B: every other SLOW entry. A new slow file joins SLOW (and, if it is a multi-hour run, SLOW_A).
 */
const SLOW_A = [
  'test/engine/**/*longrun*.test.ts', 'test/engine/engine-pipeline.test.ts', 'test/engine/organs-soak.test.ts', 'test/engine/clinical-suite.test.ts',
  // FU-6 (executor instruction, 2026-09-29): every new FU-6 slow file joins SLOW_A — slow-b ran within 2.4 min of its
  // 40 min limit at G-FU4 — so each FU-6 entry is listed in SLOW (above) AND here, and the slow-b filter leaves it out.
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
];
// FU-4 (R50 review F8): SLOW_B is SLOW minus SLOW_A, and the difference cannot be taken by STRING comparison — the
// glob 'test/engine/neuro-*.test.ts' is not equal to 'test/engine/**/*longrun*.test.ts' but MATCHES the same 6 h
// neuro long run, so the measured lists were 10 + 35 files for a 44-file union and that run executed in BOTH CI jobs.
// The set difference is therefore made by Vitest's own matcher, with SLOW_A as an `exclude` on the slow-b run.
const SLOW_B = SLOW.filter((p) => !SLOW_A.includes(p));
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
    ...(set === 'slow-b' ? { include: SLOW_B, exclude: ['**/node_modules/**', '**/dist/**', ...SLOW_A], fileParallelism: false } : {}),
  },
});
