/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// CI splits the engine tests in two jobs (see .github/workflows/ci.yml): the SLOW set (multi-sim-hour drift runs,
// long clinical scenarios) runs serially in its own job so its long synchronous stretches never starve the Vitest
// worker RPC of the main job ("Timeout calling onTaskUpdate" after the circulation and lungs raised the per-tick cost).
// PME_TEST_SET=fast excludes the slow set, PME_TEST_SET=slow runs only it (one file at a time); unset = everything.
const SLOW = [
  'test/engine/**/*longrun*.test.ts',
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
  'test/engine/clinical-suite.test.ts', // The clinical scenario suite (SLOW_A)
  'test/engine/resp-alkalosis-compensation.test.ts', // blood/fluid/acid–base/renal scenarios, 10–90 sim-min arms (SLOW_C)
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
  'test/engine/hr-agonal-qrs.test.ts', // Monitor-in-arrest, agonal, oliguria and negative-volume rigs (SLOW_A: slow-b's margin is 2.4 min)
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
  'test/engine/endo-adrenal.test.ts', // The endocrine/thermal rigs, placed by CI per-file time (SLOW_A/C/D/F below; adrenal is slow-b)
  'test/engine/thermal-fever-ga.test.ts',
  'test/engine/endo-insulin-dextrose.test.ts',
  'test/engine/endo-insulin-omission.test.ts',
  'test/engine/thermal-mh-trigger.test.ts',
  'test/engine/thermal-periop-course.test.ts',
  'test/engine/resp-breath-delivered-vt.test.ts', // The MH 50 min run, the tamponade matrix, the KCl infusion, the COPD start-up, the rocuronium course (slow-b)
  'test/engine/lung-copd-startup.test.ts',
  'test/engine/drug-opioid-induction-synergy.test.ts',
  'test/engine/blood-potassium-chloride.test.ts',
  'test/engine/thermal-mh-haemodynamics.test.ts',
  'test/engine/hemo-nibp-arrest.test.ts',
  'test/engine/resp-rocuronium-apnoea.test.ts',
  'test/engine/circ-tamponade-drainage.test.ts',
  'test/engine/resp-mechanics.test.ts', // Nine 5 sim-min mechanics rigs and two 16 sim-min bronchodilator arms (slow-a: slow-b is at 37.6 of 40 min)
  'test/engine/drug-apnoea.test.ts', // 20–25 sim-min spontaneous drug rigs incl. a 20-seed Bailey population
  'test/engine/cat-reserve-engine.test.ts', // Four 15 sim-min ketamine arms
  'test/engine/stimulus-surge.test.ts', // ≈ 40 ventilated arms of 10–60 sim-min
  'test/engine/drug-nmb-volatile-sux.test.ts', // Two 140 sim-min rocuronium arms + four 15 sim-min sux arms
  'test/engine/drug-desflurane-surge.test.ts', // Two 30 sim-min desflurane arms
  'test/engine/drug-layer.test.ts', // The drug-layer engine cases
  'test/engine/drug-layer-guards.test.ts', // The drug-layer regression guards (split from drug-layer by time)
  'test/l2/pk/interactions-misc.test.ts', // four 8 h interaction arms, 15.2 s alone in the fast set — slow-b (the remainder)
];
/**
 * SEVEN slow groups, re-packed longest-first from the measured CI per-file times (the mean of PR run 37199184387 and
 * PR #37 run 37217929016; two fu9 files ≈ 80 s each, estimated) so that every group is ≈ 33 min: 13 971 s of slow
 * tests in all. The glob bundles stay whole (the long runs in A, fu8-* in D, fu9-* in C). slow-b is SLOW minus the
 * other six by Vitest's own matcher, and every group excludes every other, so the groups are disjoint by construction;
 * ci.yml checks it. A new slow file joins SLOW and the group whose CI sum it fits.
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
  'test/engine/resp-alkalosis-compensation.test.ts', // 1286 s,
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
  'test/engine/pk-acceptance-pd.test.ts', // 229 s,
  'test/engine/thermal-mh-trigger.test.ts', // 127 s,
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
  'test/engine/hr-agonal-qrs.test.ts', // 313 s + three later fu8 files (≈ 22 s local, ≈ 60 s CI est.: slow-d ≈ 34.2 min),
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
  'test/engine/resp-induction.test.ts', // 254 s,
  'test/engine/vagal-events.test.ts', // 141 s,
  'test/engine/thermal-fever-ga.test.ts', // 84 s,
  'test/engine/hemo-nibp.test.ts', // 72 s,
  'test/engine/resp-mechanics.test.ts', // 58 s,
  'test/engine/organs-tbi.test.ts', // 46 s,
  'test/engine/resp-drive-nonchemical.test.ts', // 36 s,
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
  'test/engine/drug-desflurane-surge.test.ts', // 42 s,
  'test/engine/circ-manual-cvp-peep.test.ts', // 23 s,
  'test/engine/af-rate-control.test.ts', // 21 s,
  'test/engine/pacer-sensing.test.ts', // 11 s
];
const SLOW_F = [ // ≈ 1995 s on CI (33.3 min)
  'test/engine/drug-layer.test.ts', // 894 s,
  'test/engine/drug-apnoea.test.ts', // 387 s,
  'test/engine/drug-nmb-volatile-sux.test.ts', // 231 s,
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
  'test/engine/thermal-periop-course.test.ts', // 751 s,
  'test/engine/endo-adrenal.test.ts', // 390 s,
  'test/engine/endo-insulin-dextrose.test.ts', // 274 s,
  'test/engine/engine-pipeline.test.ts', // 175 s,
  'test/engine/blood-anaemia-co.test.ts', // 118 s,
  'test/engine/lung-recruitment.test.ts', // 81 s,
  'test/engine/blood-desaturation-recheck.test.ts', // 69 s,
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
    ...(set && /^slow-[a-g]$/.test(set) ? (() => {
      const own = set.slice(5).toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
      const groups = { ...OTHERS, B: SLOW_B };
      const other = Object.entries(OTHERS).filter(([k]) => k !== own).flatMap(([, g]) => g);
      return { include: groups[own], exclude: ['**/node_modules/**', '**/dist/**', ...other], fileParallelism: false };
    })() : {}),
  },
});
