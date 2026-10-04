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
  'test/engine/fu10-*.test.ts', // FU-10: the endocrine/thermal rigs, placed by CI per-file time (SLOW_A/C/D/F below; adrenal is slow-b)
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
 * CI amendment 6 (FU-10 gate, orchestrator ruling): SEVEN slow groups, re-packed longest-first from the measured CI
 * per-file times (the mean of FU-7's PR run 37199184387 and FU-10's PR #37 run 37217929016; FU-9 B's two new fu9 files
 * ≈ 80 s each, estimated) so that every group is ≈ 33 min: 13 971 s of slow tests in all. The glob bundles stay whole
 * (the long runs in A, fu8-* in D, fu9-* in C). slow-b is SLOW minus the other six by Vitest's own matcher (FU-4 R50 F8),
 * and every group excludes every other, so the groups are disjoint by construction; ci.yml checks it. A new slow file
 * joins SLOW and the group whose CI sum it fits (docs/gates/stage-fu-10.md §10 has the table).
 */
const SLOW_A = [ // ≈ 2002 s on CI (33.4 min)
  'test/engine/**/*longrun*.test.ts', // 1292 s,
  'test/engine/resp-bronchodilation.test.ts', // 203 s,
  'test/engine/resp-coupling.test.ts', // 147 s,
  'test/engine/lung-unilateral.test.ts', // 93 s,
  'test/engine/resp-ga-state.test.ts', // 71 s,
  'test/engine/lung-hpv-volatile.test.ts', // 57 s,
  'test/engine/cat-reserve-engine.test.ts', // 43 s,
  'test/engine/organs-htn.test.ts', // 34 s,
  'test/engine/resp-trigger.test.ts', // 26 s,
  'test/engine/circ-sanity-2.test.ts', // 19 s,
  'test/engine/pk-acceptance-scen.test.ts', // 16 s
];
const SLOW_C = [ // ≈ 1998 s on CI (33.3 min)
  'test/engine/fu9-*.test.ts', // 1286 s,
  'test/engine/pk-acceptance-pd.test.ts', // 229 s,
  'test/engine/fu10-mh-trigger.test.ts', // 127 s,
  'test/engine/organs-curves.test.ts', // 102 s,
  'test/engine/resp-inspired-co2.test.ts', // 69 s,
  'test/engine/blood-hyperk.test.ts', // 50 s,
  'test/engine/resp-bronchospasm-one.test.ts', // 46 s,
  'test/engine/fidelity-resp.test.ts', // 33 s,
  'test/engine/resp-pregnancy.test.ts', // 25 s,
  'test/engine/circ-sanity-1.test.ts', // 20 s,
  'test/engine/resp-pleural-effort.test.ts', // 12 s
];
const SLOW_D = [ // ≈ 1993 s on CI (33.2 min)
  'test/engine/stimulus-surge.test.ts', // 478 s,
  'test/engine/clinical-suite.test.ts', // 460 s,
  'test/engine/fu8-*.test.ts', // 313 s + FU-8 Part B's three files (≈ 22 s local, ≈ 60 s CI est.: slow-d ≈ 34.2 min),
  'test/engine/resp-induction.test.ts', // 254 s,
  'test/engine/vagal-events.test.ts', // 141 s,
  'test/engine/fu10-fever.test.ts', // 84 s,
  'test/engine/hemo-nibp.test.ts', // 72 s,
  'test/engine/resp-mechanics.test.ts', // 58 s,
  'test/engine/organs-tbi.test.ts', // 46 s,
  'test/engine/resp-drive-fu6.test.ts', // 36 s,
  'test/engine/resp-obstruction.test.ts', // 24 s,
  'test/engine/resp-child-baseline.test.ts', // 22 s,
  'test/engine/circ-manual-ischaemia.test.ts', // 6 s
];
const SLOW_E = [ // ≈ 1998 s on CI (33.3 min)
  'test/engine/drug-layer-guards.test.ts', // 1437 s,
  'test/engine/blood-sanity-acid.test.ts', // 170 s,
  'test/engine/neuro-engine.test.ts', // 107 s,
  'test/engine/lung-r14.test.ts', // 78 s,
  'test/engine/neuro-acceptance.test.ts', // 60 s,
  'test/engine/circ-hypoxic-arrest.test.ts', // 49 s,
  'test/engine/fu7-volatile.test.ts', // 42 s,
  'test/engine/circ-manual-cvp-peep.test.ts', // 23 s,
  'test/engine/af-rate-control.test.ts', // 21 s,
  'test/engine/pacer-sensing.test.ts', // 11 s
];
const SLOW_F = [ // ≈ 1995 s on CI (33.3 min)
  'test/engine/drug-layer.test.ts', // 894 s,
  'test/engine/drug-apnoea.test.ts', // 387 s,
  'test/engine/fu7-nmb-one-state.test.ts', // 231 s,
  'test/engine/thermal-warmer.test.ts', // 132 s,
  'test/engine/organs-tbi-treatment.test.ts', // 93 s,
  'test/engine/blood-sanity-haem.test.ts', // 70 s,
  'test/engine/fidelity-lowflow.test.ts', // 56 s,
  'test/engine/fidelity-ecg.test.ts', // 46 s,
  'test/engine/resp-vcv-pmax.test.ts', // 30 s,
  'test/engine/fidelity-arrest.test.ts', // 27 s,
  'test/engine/circ-rate-rule.test.ts', // 21 s,
  'test/engine/af-pulse-deficit.test.ts', // 8 s
];
const SLOW_G = [ // ≈ 1987 s on CI (33.1 min)
  'test/engine/fu10-thresholds.test.ts', // 751 s,
  'test/engine/fu10-adrenal.test.ts', // 390 s,
  'test/engine/fu10-insulin-dextrose.test.ts', // 274 s,
  'test/engine/engine-pipeline.test.ts', // 175 s,
  'test/engine/blood-anaemia-co.test.ts', // 118 s,
  'test/engine/lung-recruitment.test.ts', // 81 s,
  'test/engine/blood-stage3-recheck.test.ts', // 69 s,
  'test/engine/neuro-spont.test.ts', // 48 s,
  'test/engine/hr-af-numeric.test.ts', // 37 s,
  'test/engine/fidelity-alarms.test.ts', // 23 s,
  'test/engine/lung-copd.test.ts', // 22 s
];
// slow-b (the remainder, ≈ 1998 s): every SLOW file not listed above
const OTHERS = { A: SLOW_A, C: SLOW_C, D: SLOW_D, E: SLOW_E, F: SLOW_F, G: SLOW_G };
const SLOW_B = SLOW.filter((p) => !Object.values(OTHERS).some((g) => g.includes(p)));
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
    // CI amendment 6: each group excludes every other group by the same matcher (disjoint by construction; FU-4 R50 F8)
    ...(set && /^slow-[a-g]$/.test(set) ? (() => {
      const own = set.slice(5).toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
      const groups = { ...OTHERS, B: SLOW_B };
      const other = Object.entries(OTHERS).filter(([k]) => k !== own).flatMap(([, g]) => g);
      return { include: groups[own], exclude: ['**/node_modules/**', '**/dist/**', ...other], fileParallelism: false };
    })() : {}),
  },
});
