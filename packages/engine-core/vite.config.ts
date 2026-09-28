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
  'test/engine/circ-lowflow-arrest.test.ts', // FU-4 G1: four 25–30 sim-min haemorrhage/ROSC runs
  'test/engine/blood-k-rhythm.test.ts', // FU-4 G3: hyperkalaemia runs of 2–20 sim-min
  'test/engine/circ-pulsus.test.ts', // FU-4 G6: two 10 sim-min spontaneous-breathing runs
  'test/engine/vagal-events.test.ts', // FU-4 G7: vagal-event runs of 5–10 sim-min
];
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
  },
});
