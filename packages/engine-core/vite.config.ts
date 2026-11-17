/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// CI splits the engine tests in two jobs (see .github/workflows/ci.yml): the SLOW set (multi-sim-hour drift runs,
// long clinical scenarios) runs serially in its own job so its long synchronous stretches never starve the Vitest
// worker RPC of the main job ("Timeout calling onTaskUpdate" after the circulation and lungs raised the per-tick cost).
// PME_TEST_SET=fast excludes the slow set, PME_TEST_SET=slow runs only it (one file at a time); unset = everything.
const SLOW = [
  'test/engine/**/*longrun*.test.ts',
  'test/engine/pk-tci-pump-control.test.ts', // pump-rack E2: the long run's control, one 6 h engine run
  'test/engine/engine-pipeline.test.ts', // holds the ECG 6 h/24 h drift run
  'test/engine/lung-recruitment.test.ts',
  'test/engine/lung-unilateral.test.ts',
  'test/engine/lung-copd.test.ts',
  'test/engine/resp-coupling.test.ts',
  'test/engine/hemo-nibp.test.ts',
  'test/engine/fidelity-*.test.ts', // Monitor-fidelity scenarios (up to 45 sim-min each)
  'test/engine/circ-sanity-*.test.ts',
  'test/engine/pk-acceptance-*.test.ts',
  'test/engine/endo-acceptance.test.ts', // MH, glucose and sepsis scenarios (sim-hours)
  'test/engine/endo-circ-acceptance.test.ts', // MODELED sepsis warm → cold (2 sim-h)
  'test/engine/blood-desaturation-recheck.test.ts', // Four desaturations + a 70 min OLV run
  'test/engine/blood-sanity-*.test.ts', // 2 h haemorrhage/transfusion and acid–base scenarios
  'test/engine/blood-hyperk.test.ts', // 30 min succinylcholine/calcium/insulin and salbutamol scenarios
  'test/engine/circ-rate-rule.test.ts', // MODELED rhythm-rate scenarios (2–4 sim-min each)
  'test/engine/pacer-sensing.test.ts', // MODELED AAI/DDD sensing scenarios (4 sim-min each)
  'test/engine/af-rate-control.test.ts', // AF rate control (13–22 sim-min each)
  'test/engine/hr-af-numeric.test.ts', // HR numeric vs the true AF rate (11 runs of 400 sim-s)
  'test/engine/neuro-*.test.ts', // 100 sim-min rocuronium, 24 h maintenance, MODELED drive scenarios
  'test/engine/organs-soak.test.ts', // 24 h / 6 h organ drift run
  'test/engine/organs-tbi.test.ts', // TBI, tables §7 check 19 (45 sim-min per mode)
  'test/engine/organs-tbi-treatment.test.ts', // TBI treatments (paired 12–42 sim-min runs)
  'test/engine/organs-htn.test.ts', // Hypertension under GA, tables §7 check 18 (≈ 70 sim-min)
  'test/engine/organs-renal.test.ts', // Haemorrhage and HFrEF, tables §7 check 20 (2 sim-h each)
  'test/engine/organs-curves.test.ts', // Curve acceptance (up to 2.5 sim-h)
  'test/engine/circ-manual-ischaemia.test.ts', // The hypertension rig of tables §7 check 18 to MAP 65 (9 sim-min)
  'test/engine/circ-manual-cvp-peep.test.ts', // 8 soak-patient runs of 300 sim-s each
  'test/engine/circ-hypoxic-arrest.test.ts', // Four 15–20 sim-min asphyxia runs
  'test/engine/resp-bronchodilation.test.ts', // Eight 30 sim-min bronchospasm arms
  'test/engine/resp-bronchospasm-one.test.ts', // Four ≤ 22 sim-min bronchospasm runs
  'test/engine/resp-induction.test.ts', // Six 15 sim-min inductions
  'test/engine/resp-obstruction.test.ts', // Two 15 sim-min obstruction runs
  'test/engine/resp-pleural-effort.test.ts', // a 13 sim-min laryngospasm run
  'test/engine/resp-ga-state.test.ts', // Three apnoea runs of 19 sim-min and a 40 sim-min ventilated run
  'test/engine/resp-vcv-pmax.test.ts', // Two 10 sim-min near-fatal bronchospasm runs
  'test/engine/resp-drive-nonchemical.test.ts', // a 32 sim-min stimulus run and a 20 sim-min PE run
  'test/engine/resp-trigger.test.ts', // Three ≤ 7 sim-min ventilator runs
  'test/engine/resp-inspired-co2.test.ts', // Four 25 sim-min rebreathing runs
  'test/engine/resp-pregnancy.test.ts', // a 20 sim-min awake run and a 14 sim-min apnoea run
  'test/engine/blood-anaemia-co.test.ts', // Four 20 sim-min anaemia runs and two 60 sim-min COHb runs
  'test/engine/lung-hpv-volatile.test.ts', // Two 40 sim-min OLV runs
  'test/engine/lung-r14.test.ts', // Two 25 sim-min hypercapnia runs, a 35 sim-min ARDS run, a 20 sim-min induction
  'test/engine/resp-child-baseline.test.ts', // Two 15 sim-min child runs
  'test/engine/resp-suite.test.ts', // The RS1–RS15 respiratory suite (≈ 5 sim-h in total)
  'test/engine/circ-lowflow-arrest.test.ts', // Four 25–30 sim-min haemorrhage/ROSC runs
  'test/engine/blood-k-rhythm.test.ts', // Hyperkalaemia runs of 2–20 sim-min
  'test/engine/clinical-suite.test.ts', // The clinical scenario suite
  'test/engine/resp-alkalosis-compensation.test.ts', // blood/fluid/acid–base/renal scenarios, 10–90 sim-min arms
  'test/engine/lung-copd-retainer.test.ts',
  'test/engine/organs-renal-iap.test.ts',
  'test/engine/blood-fluid-kinetics.test.ts',
  'test/engine/blood-septic-leak.test.ts',
  'test/engine/blood-mannitol.test.ts',
  'test/engine/organs-brain-osmolality.test.ts',
  'test/engine/blood-o2-extraction.test.ts',
  'test/engine/organs-renal-kaliuresis.test.ts',
  'test/engine/drug-hypokalaemia-rocuronium.test.ts',
  'test/engine/blood-massive-transfusion.test.ts',
  'test/engine/circ-pulsus.test.ts', // Two 10 sim-min spontaneous-breathing runs
  'test/engine/vagal-events.test.ts', // Vagal-event runs of 5–10 sim-min
  'test/engine/thermal-warmer.test.ts', // Four 60 sim-min warming runs
  'test/engine/tension-ptx.test.ts', // Three 7–16 sim-min tension-pneumothorax runs
  'test/engine/af-pulse-deficit.test.ts', // Two 320 sim-s AF 150 runs
  'test/engine/hr-agonal-qrs.test.ts', // Monitor-in-arrest, agonal, oliguria and negative-volume rigs
  'test/engine/rhythm-agonal-rate.test.ts',
  'test/engine/alarms-limit-text.test.ts',
  'test/engine/circ-body-size.test.ts',
  'test/engine/circ-coronary-supply.test.ts',
  'test/engine/cpr-ecg-artefact.test.ts',
  'test/engine/cpr-cerebral-flow.test.ts',
  'test/engine/cpr-etco2-circulation.test.ts',
  'test/engine/circ-iabp.test.ts',
  'test/engine/circ-lvad-filling.test.ts',
  'test/engine/circ-manual-rosc-ramp.test.ts',
  'test/engine/spo2-motion-recovery.test.ts',
  'test/engine/circ-negative-volume.test.ts',
  'test/engine/organs-oliguria-flag.test.ts',
  'test/engine/lung-pe-profile.test.ts',
  'test/engine/circ-pea-resuscitation.test.ts',
  'test/engine/circ-pulm-hypertension-grade.test.ts',
  'test/engine/pk-propofol-co-reference.test.ts',
  'test/engine/circ-pulseless-arrest.test.ts',
  'test/engine/state-sensor-map.test.ts',
  'test/engine/pacer-tcp-pain.test.ts',
  'test/engine/circ-sympathetic-tone.test.ts',
  'test/engine/endo-adrenal.test.ts', // The endocrine/thermal rigs, placed by CI per-file time
  'test/engine/thermal-fever-ga.test.ts',
  'test/engine/endo-insulin-dextrose.test.ts',
  'test/engine/endo-insulin-omission.test.ts',
  'test/engine/thermal-mh-trigger.test.ts',
  'test/engine/thermal-periop-course.test.ts',
  'test/engine/resp-breath-delivered-vt.test.ts', // The MH 50 min run, the tamponade matrix, the KCl infusion, the COPD start-up, the rocuronium course
  'test/engine/lung-copd-startup.test.ts',
  'test/engine/drug-opioid-induction-synergy.test.ts',
  'test/engine/blood-potassium-chloride.test.ts',
  'test/engine/thermal-mh-haemodynamics.test.ts',
  'test/engine/thermal-mh-arrest-heat.test.ts', // E129: untreated MH to one hour after the hyperthermic arrest (≈ 110 sim-min)
  'test/engine/hemo-nibp-arrest.test.ts',
  'test/engine/resp-rocuronium-apnoea.test.ts',
  'test/engine/circ-tamponade-drainage.test.ts',
  'test/engine/resp-mechanics.test.ts', // Nine 5 sim-min mechanics rigs and two 16 sim-min bronchodilator arms
  'test/engine/drug-apnoea.test.ts', // 20–25 sim-min spontaneous drug rigs incl. a 20-seed Bailey population
  'test/engine/cat-reserve-engine.test.ts', // Four 15 sim-min ketamine arms
  'test/engine/stimulus-surge.test.ts', // ≈ 40 ventilated arms of 10–60 sim-min
  'test/engine/drug-nmb-volatile-sux.test.ts', // Two 140 sim-min rocuronium arms + four 15 sim-min sux arms
  'test/engine/drug-desflurane-surge.test.ts', // Two 30 sim-min desflurane arms
  'test/engine/drug-layer.test.ts', // The drug-layer engine cases
  'test/engine/drug-layer-guards.test.ts', // The drug-layer regression guards (split from drug-layer by time)
  'test/engine/drug-layer-guards-csht.test.ts', // its context-sensitive offsets case (≈ 790 s on CI), split out by time
  'test/l2/pk/interactions-misc.test.ts', // four 8 h interaction arms, 15.2 s alone in the fast set
  'test/engine/eeg-baseline.test.ts', // EEG E0: six baseline runs, 6 420 sim-s sampled every second (≈ 45 s local)
  'test/engine/eeg-cortex.test.ts', // EEG E1/E2 on the engine: eight drug arms, ≈ 9 900 sim-s sampled every 5 s
];
/**
 * TWELVE slow groups, packed longest-first onto the least-loaded group from the measured CI per-file times: the mean of
 * three green runs of 17 November (PR runs 44063071442, 44045161565 and 44022905539; Vitest's per-file duration in each
 * job log), 11678 s of slow tests in all, so that every group is ≈ 16.2 min of tests. ci.yml runs two groups at once
 * on one runner (scripts/ci/lanes.mjs), each in its own Vitest process, so six jobs carry the twelve. The runners differ:
 * the same group took 16.8 and 33.4 min on two runs, so a slow runner still doubles a group. Per file: mean s (max of
 * the three runs). drug-layer.test.ts is one file and sets its group's floor. The longrun files are listed one by one
 * (their glob in SLOW stays, so a new longrun file lands in slow-b). slow-b is SLOW minus the other eleven by Vitest's
 * own matcher, and every group excludes every other, so the groups are disjoint by construction; ci.yml checks it. A new
 * slow file joins SLOW (and so slow-b) or the group whose CI sum it fits.
 */
const SLOW_A = [ // ≈ 977 s mean on CI (16.3 min)
  'test/engine/drug-layer.test.ts', // 804 s (max 809)
  'test/engine/fidelity-lowflow.test.ts', // 57 s (max 74)
  'test/engine/blood-hyperk.test.ts', // 37 s (max 37)
  'test/engine/drug-desflurane-surge.test.ts', // 27 s (max 31)
  'test/engine/circ-pulseless-arrest.test.ts', // 24 s (max 33)
  'test/engine/resp-rocuronium-apnoea.test.ts', // 15 s (max 21)
  'test/engine/circ-pulm-hypertension-grade.test.ts', // 13 s (max 16)
];
// slow-b, the remainder (≈ 973 s mean, 16.2 min): every SLOW file not listed in another group, today
//   thermal-periop-course.test.ts // 574 s (max 631)
//   organs-brain-osmolality.test.ts // 123 s (max 180)
//   neuro-engine.test.ts // 80 s (max 80)
//   drug-hypokalaemia-rocuronium.test.ts // 58 s (max 68)
//   resp-mechanics.test.ts // 41 s (max 46)
//   circ-body-size.test.ts // 32 s (max 38)
//   thermal-mh-haemodynamics.test.ts // 24 s (max 24)
//   circ-sanity-2.test.ts // 19 s (max 22)
//   circ-lvad-filling.test.ts // 14 s (max 14)
//   cpr-cerebral-flow.test.ts // 6 s (max 7)
//   hemo-nibp-arrest.test.ts // 2 s (max 2)
const SLOW_C = [ // ≈ 973 s mean on CI (16.2 min)
  'test/engine/drug-layer-guards-csht.test.ts', // 534 s (max 717)
  'test/engine/neuro-longrun.test.ts', // 126 s (max 153)
  'test/engine/thermal-mh-trigger.test.ts', // 94 s (max 108)
  'test/engine/blood-sanity-haem.test.ts', // 62 s (max 85)
  'test/engine/neuro-acceptance.test.ts', // 43 s (max 44)
  'test/engine/fidelity-nibp.test.ts', // 38 s (max 41)
  'test/engine/hr-af-numeric.test.ts', // 29 s (max 34)
  'test/engine/circ-rate-rule.test.ts', // 21 s (max 28)
  'test/engine/resp-child-baseline.test.ts', // 18 s (max 24)
  'test/engine/resp-breath-delivered-vt.test.ts', // 5 s (max 5)
  'test/engine/hr-agonal-qrs.test.ts', // 3 s (max 4)
];
const SLOW_D = [ // ≈ 975 s mean on CI (16.3 min)
  'test/engine/drug-layer-guards.test.ts', // 485 s (max 570)
  'test/engine/pk-tci-pump-control.test.ts', // 143 s (max 158)
  'test/engine/organs-soak.test.ts', // 120 s (max 129)
  'test/engine/lung-recruitment.test.ts', // 64 s (max 74)
  'test/engine/blood-desaturation-recheck.test.ts', // 52 s (max 56)
  'test/engine/fidelity-resp.test.ts', // 33 s (max 46)
  'test/engine/circ-sanity-1.test.ts', // 28 s (max 33)
  'test/engine/tension-ptx.test.ts', // 23 s (max 30)
  'test/engine/resp-obstruction.test.ts', // 16 s (max 18)
  'test/engine/circ-pea-resuscitation.test.ts', // 11 s (max 13)
];
const SLOW_E = [ // ≈ 973 s mean on CI (16.2 min)
  'test/engine/clinical-suite.test.ts', // 412 s (max 546)
  'test/engine/endo-longrun.test.ts', // 156 s (max 213)
  'test/engine/resp-coupling.test.ts', // 123 s (max 136)
  'test/engine/circ-lowflow-arrest.test.ts', // 82 s (max 107)
  'test/engine/endo-circ-acceptance.test.ts', // 58 s (max 70)
  'test/engine/fidelity-ecg.test.ts', // 42 s (max 50)
  'test/engine/organs-oliguria-flag.test.ts', // 32 s (max 36)
  'test/engine/blood-k-rhythm.test.ts', // 26 s (max 29)
  'test/engine/drug-opioid-induction-synergy.test.ts', // 20 s (max 21)
  'test/l2/pk/interactions-misc.test.ts', // 13 s (max 14)
  'test/engine/resp-pleural-effort.test.ts', // 9 s (max 12)
];
const SLOW_F = [ // ≈ 973 s mean on CI (16.2 min)
  'test/engine/endo-insulin-omission.test.ts', // 376 s (max 377)
  'test/engine/pk-acceptance-pd.test.ts', // 160 s (max 184)
  'test/engine/engine-pipeline.test.ts', // 125 s (max 150)
  'test/engine/organs-curves.test.ts', // 87 s (max 97)
  'test/engine/thermal-fever-ga.test.ts', // 63 s (max 73)
  'test/engine/pk-acceptance-pk.test.ts', // 52 s (max 70)
  'test/engine/cat-reserve-engine.test.ts', // 36 s (max 50)
  'test/engine/circ-sympathetic-tone.test.ts', // 26 s (max 36)
  'test/engine/lung-copd-retainer.test.ts', // 23 s (max 27)
  'test/engine/pk-acceptance-scen.test.ts', // 16 s (max 22)
  'test/engine/pacer-sensing.test.ts', // 9 s (max 10)
];
const SLOW_G = [ // ≈ 972 s mean on CI (16.2 min)
  'test/engine/drug-apnoea.test.ts', // 369 s (max 421)
  'test/engine/resp-bronchodilation.test.ts', // 161 s (max 206)
  'test/engine/blood-sanity-acid.test.ts', // 130 s (max 190)
  'test/engine/organs-tbi-treatment.test.ts', // 89 s (max 130)
  'test/engine/eeg-cortex.test.ts', // 63 s (max 73)
  'test/engine/circ-hypoxic-arrest.test.ts', // 51 s (max 66)
  'test/engine/circ-tamponade-drainage.test.ts', // 35 s (max 40)
  'test/engine/blood-massive-transfusion.test.ts', // 27 s (max 31)
  'test/engine/resp-vcv-pmax.test.ts', // 22 s (max 22)
  'test/engine/af-rate-control.test.ts', // 18 s (max 20)
  'test/engine/circ-manual-ischaemia.test.ts', // 5 s (max 5)
  'test/engine/spo2-motion-recovery.test.ts', // 2 s (max 3)
  'test/engine/state-sensor-map.test.ts', // 0 s (max 0)
];
const SLOW_H = [ // ≈ 973 s mean on CI (16.2 min)
  'test/engine/blood-fluid-kinetics.test.ts', // 336 s (max 488)
  'test/engine/lung-longrun.test.ts', // 169 s (max 245)
  'test/engine/pk-longrun.test.ts', // 142 s (max 144)
  'test/engine/vagal-events.test.ts', // 99 s (max 117)
  'test/engine/lung-r14.test.ts', // 67 s (max 87)
  'test/engine/lung-hpv-volatile.test.ts', // 47 s (max 64)
  'test/engine/fidelity-arrest.test.ts', // 37 s (max 49)
  'test/engine/circ-negative-volume.test.ts', // 28 s (max 28)
  'test/engine/resp-alkalosis-compensation.test.ts', // 22 s (max 26)
  'test/engine/lung-copd.test.ts', // 17 s (max 19)
  'test/engine/circ-pulsus.test.ts', // 9 s (max 11)
];
const SLOW_I = [ // ≈ 972 s mean on CI (16.2 min)
  'test/engine/resp-suite.test.ts', // 330 s (max 438)
  'test/engine/resp-longrun.test.ts', // 175 s (max 237)
  'test/engine/blood-septic-leak.test.ts', // 141 s (max 190)
  'test/engine/blood-potassium-chloride.test.ts', // 117 s (max 156)
  'test/engine/eeg-baseline.test.ts', // 59 s (max 68)
  'test/engine/organs-tbi.test.ts', // 42 s (max 57)
  'test/engine/circ-coronary-supply.test.ts', // 33 s (max 38)
  'test/engine/resp-drive-nonchemical.test.ts', // 27 s (max 36)
  'test/engine/cpr-etco2-circulation.test.ts', // 24 s (max 31)
  'test/engine/blood-o2-extraction.test.ts', // 16 s (max 16)
  'test/engine/alarms-limit-text.test.ts', // 8 s (max 11)
];
const SLOW_J = [ // ≈ 972 s mean on CI (16.2 min)
  'test/engine/stimulus-surge.test.ts', // 325 s (max 381)
  'test/engine/drug-nmb-volatile-sux.test.ts', // 186 s (max 252)
  'test/engine/hemo-longrun.test.ts', // 138 s (max 167)
  'test/engine/thermal-warmer.test.ts', // 96 s (max 132)
  'test/engine/lung-unilateral.test.ts', // 68 s (max 69)
  'test/engine/neuro-spont.test.ts', // 46 s (max 66)
  'test/engine/resp-bronchospasm-one.test.ts', // 37 s (max 48)
  'test/engine/circ-iabp.test.ts', // 31 s (max 35)
  'test/engine/lung-copd-startup.test.ts', // 20 s (max 23)
  'test/engine/circ-manual-cvp-peep.test.ts', // 17 s (max 17)
  'test/engine/af-pulse-deficit.test.ts', // 7 s (max 7)
  'test/engine/cpr-ecg-artefact.test.ts', // 1 s (max 1)
];
const SLOW_K = [ // ≈ 973 s mean on CI (16.2 min)
  'test/engine/endo-adrenal.test.ts', // 279 s (max 395)
  'test/engine/endo-insulin-dextrose.test.ts', // 188 s (max 222)
  'test/engine/organs-renal-kaliuresis.test.ts', // 145 s (max 170)
  'test/engine/thermal-mh-arrest-heat.test.ts', // 120 s (max 165)
  'test/engine/hemo-nibp.test.ts', // 72 s (max 99)
  'test/engine/resp-ga-state.test.ts', // 55 s (max 59)
  'test/engine/organs-renal-iap.test.ts', // 37 s (max 44)
  'test/engine/organs-htn.test.ts', // 30 s (max 41)
  'test/engine/resp-trigger.test.ts', // 20 s (max 23)
  'test/engine/blood-mannitol.test.ts', // 19 s (max 25)
  'test/engine/pk-propofol-co-reference.test.ts', // 4 s (max 4)
  'test/engine/circ-manual-rosc-ramp.test.ts', // 4 s (max 5)
];
const SLOW_L = [ // ≈ 972 s mean on CI (16.2 min)
  'test/engine/endo-acceptance.test.ts', // 245 s (max 298)
  'test/engine/resp-induction.test.ts', // 210 s (max 293)
  'test/engine/organs-renal.test.ts', // 152 s (max 221)
  'test/engine/circ-longrun.test.ts', // 122 s (max 136)
  'test/engine/blood-anaemia-co.test.ts', // 75 s (max 80)
  'test/engine/resp-inspired-co2.test.ts', // 53 s (max 73)
  'test/engine/pacer-tcp-pain.test.ts', // 39 s (max 53)
  'test/engine/neuro-circ.test.ts', // 29 s (max 38)
  'test/engine/fidelity-alarms.test.ts', // 21 s (max 25)
  'test/engine/resp-pregnancy.test.ts', // 18 s (max 20)
  'test/engine/rhythm-agonal-rate.test.ts', // 6 s (max 6)
  'test/engine/lung-pe-profile.test.ts', // 2 s (max 2)
];
const OTHERS = { A: SLOW_A, C: SLOW_C, D: SLOW_D, E: SLOW_E, F: SLOW_F, G: SLOW_G, H: SLOW_H, I: SLOW_I, J: SLOW_J, K: SLOW_K, L: SLOW_L };
const SLOW_B = SLOW.filter((p) => !Object.values(OTHERS).some((g) => g.includes(p)));
const set = process.env.PME_TEST_SET;

export default defineConfig({
  // The build id in the snapshot key (src/version.ts); the release workflow sets PME_BUILD.
  define: { __PME_ENGINE_BUILD__: JSON.stringify(process.env.PME_BUILD ?? 'dev') },
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    // Sibling @pme packages stay imports (npm consumers get one copy of each); third-party code stays bundled.
    rollupOptions: { external: [/^@pme\//] },
  },
  // Every engine now integrates the four-chamber circulation (≈ +60 % CPU per tick); the 5 s default left no margin for
  // the short engine tests on a loaded 2-vCPU runner. Long tests keep their explicit budgets.
  test: {
    testTimeout: 30_000,
    ...(set === 'fast' ? { exclude: ['**/node_modules/**', '**/dist/**', ...SLOW] } : {}),
    ...(set === 'slow' ? { include: SLOW, fileParallelism: false } : {}),
    // Each group excludes every other group by the same matcher (disjoint by construction)
    ...(set && /^slow-[a-l]$/.test(set) ? (() => {
      const own = set.slice(5).toUpperCase() as keyof typeof OTHERS | 'B';
      const groups = { ...OTHERS, B: SLOW_B };
      const other = Object.entries(OTHERS).filter(([k]) => k !== own).flatMap(([, g]) => g);
      return { include: groups[own], exclude: ['**/node_modules/**', '**/dist/**', ...other], fileParallelism: false };
    })() : {}),
  },
});
