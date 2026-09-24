# Gate 5 — Full rhythm library, templates and artefacts (date: 2026-09-25)

Gate question: "Can Ali identify every rhythm as intended, and does VF/torsades texture look recorded rather than synthetic?"

Stage 1.x baseline this branch started from: `e8f00f9` (main, merge of PR #2 — contains the plan's verified base `d0ebed2`, checked with `git merge-base --is-ancestor d0ebed2 main`), `DEFAULT_PR60_MS = 160` (from Task 1 Step 2).

| Check | Result |
|---|---|
| Clean clone typecheck/test/build/check-notices | exit 0 (fresh clone of `stage-5-rhythm-library` at `a0c7e9c`, `install --frozen-lockfile`, typecheck, test, build, check-notices): engine-core 237 tests / 39 files, validation 16 / 5, renderer 23 / 6, audio 19 / 5, controller 1 / 1, skins 1 / 1; `check-notices: OK (3 governed files)` |
| Acceptance 1–10 | table below — all pass |
| Strip screenshots (85, each ≤ 50 KB) | `stage-5/*.png` (70 from the plan + 15 coverage additions, see Deviations), largest `diathermy.png` 29085 B; gallery at the end of this document |
| PTB-XL comparison (report only, R17) | `stage-5/ptbxl-normal-comparison.json` (20 NORM 100 records): mean r I 0.74, II 0.89, III 0.48, AVR 0.87, AVL 0.11, AVF 0.80, V1 0.73, V2 0.69, V3 0.71, V4 0.85, V5 0.90, V6 0.91 |
| Blind rhythm check (Ali, 30 strips, ≥ 27/30) | pending Ali — `stage5.html` → "Blind check (30 strips)" |
| Realism review of VF/torsades texture | pending Ali/orchestrator — strips `vfCoarse.png`, `vfFine.png`, `torsades.png`, `cpr.png`, `vfEpinephrine.png` |
| Determinism (`s5/library.test.ts`, 60 s ecgII through VT → VF → CPR → 200 J shock → DDD → STEMI + mains/EMG) | seed 42: `2938a7850696d8929bb0b82cfedf30d87928ab44d428149603204b909e7b9784` (identical on re-run); seed 43: `3e53316091449fdbac6995c9bc6f087b921b4ecdde43b472f718709f0d0bcc47` |

## Acceptance tests (BUILD-PLAN Stage 5)

Numbers measured on this branch with the tests' own computations (a temporary measuring file, removed before committing).

| # | Test (file › name) | Measured |
|---|---|---|
| 1 | `s5/library.test.ts` › rate and regularity over 40 seeds | 36/36 pass; per-rhythm numbers in the table below |
| 2 | `s5/vf.test.ts` (4 cases) | f_dom 0 min 5.371 Hz (f_dom(t) 5.469); 2 min 5.127 Hz (f_dom(t) 5.144); 4 min 4.883 Hz (f_dom(t) 4.891); 6 min 4.639 Hz (f_dom(t) 4.694); 8 min 4.639 Hz (f_dom(t) 4.54); 10 min 4.395 Hz (f_dom(t) 4.421); τ without CPR 417 s (target 420 ± 20 %), with CPR 1210 s (≥ 720); vfFine segment at 583 s (expected 420·ln 4 = 582); epinephrine ratio 1.288 and Δf 0.488 Hz; vfFine → asystole at 462.2 s (≤ 462.4) |
| 3 | `s5/ventricular.test.ts` › torsades | twistBeats 6 → period 6 beats at 232/min; twistBeats 12 → period 12 beats at 232/min; twistBeats 18 → period 18 beats at 232/min |
| 4 | `s5/artefacts.test.ts` › CPR | 100/min: f_c 1.667 Hz measured 1.709 Hz (error 2.5 %, limit 5 %), line/median ratios h1–8 201828, 148056, 63265, 43238, 19406, 12416, 5812, 3525 (limit > 5), 2√2·RMS 1.115 mV (target 1.1); 120/min: f_c 2 Hz measured 1.953 Hz (error 2.3 %, limit 5 %), line/median ratios h1–8 263421, 118476, 71547, 43424, 23211, 11099, 5317, 3258 (limit > 5), 2√2·RMS 1.111 mV (target 1.1) |
| 5 | `s5/avblock.test.ts` | avb2Mobitz2: PR set [154] (size 1), 18 dropped P/min, 57 QRS/min; avb2to1: PR set [152] (size 1), 40 dropped P/min, 40 QRS/min; avbHighGrade ratio 3: PR set [144] (size 1), 66 dropped P/min, 34 QRS/min; avbHighGrade ratio 4: PR set [144] (size 1), 75 dropped P/min, 25 QRS/min |
| 6 | `s5/morph-st.test.ts` › anterior (2 mm) | ΔST at J+60: V2 0.174, V3 0.2, III -0.123, aVF -0.102 mV (inferior 2 mm: III 0.2, aVF 0.17, II 0.14, aVL -0.13 mV) — reciprocity emerges from one vector |
| 7 | `s5/morph-electrolytes.test.ts` › hyperK | first K for peaked T 5.8, PR↑ 6.8, QRS↑ 7.3, sine 8.5 mmol/L (order T < PR < QRS < sine) |
| 8 | `s5/pacing.test.ts` › faults | failure to capture: 50 V spikes/min, 0 paced beats; failure to sense: 42 of 120 spikes on T (2 min); oversensing: 29 pauses > 1.8 intervals without spikes (2 min); failure to pace: 0 spikes, 49 escape beats (2 min) |
| 9 | `validation/test/templates/bundled.test.ts` + `pnpm check-notices` | N-050, N-051 present; `check-notices: OK (3 governed files)` |
| 10 | `s5/morph-individuality.test.ts` | r(lead II beat) seeds 1,2: 0.732, seeds 3,4: 0.831, seeds 5,6: 0.93 (limit < 0.99); same seed identical across rhythm steps |

### Acceptance 1 — every rhythm over 40 seeds (60 s each; agonal 240 s)

| Rhythm | Expected rate (bpm), max RR CV | Measured rate min / mean / max | Max RR CV |
|---|---|---|---|
| `sinus` | 60–100, CV ≤ 0.12 | 74.8 / 75.0 / 75.3 | 0.040 |
| `sinusBrady` | 35–59, CV ≤ 0.12 | 44.8 / 45.0 / 45.2 | 0.041 |
| `sinusTachy` | 101–220, CV ≤ 0.12 | 119.6 / 120.1 / 120.5 | 0.040 |
| `sinusArrhythmia` | 55–90, CV ≤ 0.35 | 70.3 / 70.7 / 71.1 | 0.114 |
| `sinusPause` | 45–80, CV ≤ 0.6 | 59.5 / 59.8 / 60.2 | 0.550 |
| `atrialTach` | 150–250, CV ≤ 0.03 | 169.9 / 170.0 / 170.1 | 0.005 |
| `mat` | 95–155, CV ≤ 0.3 | 115.1 / 119.8 / 123.3 | 0.190 |
| `afib` | 85–115, CV ≤ 0.35 | 94.3 / 99.1 / 103.5 | 0.232 |
| `aflutter` | 140–160, CV ≤ 0.03 | 150.0 / 150.0 / 150.0 | 0.000 |
| `svtAvnrt` | 140–280, CV ≤ 0.03 | 179.8 / 180.0 / 180.3 | 0.008 |
| `svtAvrt` | 150–250, CV ≤ 0.03 | 189.8 / 190.0 / 190.3 | 0.008 |
| `wpwSinus` | 60–100, CV ≤ 0.12 | 74.8 / 75.0 / 75.3 | 0.040 |
| `preexcitedAf` | 160–280, CV ≤ 0.45 | 206.4 / 211.9 / 215.4 | 0.172 |
| `junctionalEscape` | 40–60, CV ≤ 0.03 | 50.0 / 50.0 / 50.0 | 0.002 |
| `junctionalAccel` | 60–100, CV ≤ 0.03 | 79.9 / 80.0 / 80.1 | 0.003 |
| `junctionalTachy` | 100–180, CV ≤ 0.03 | 119.9 / 120.0 / 120.1 | 0.005 |
| `avb1` | 60–80, CV ≤ 0.12 | 69.8 / 70.0 / 70.3 | 0.041 |
| `avb2Mobitz1` | 45–75, CV ≤ 0.4 | 56.3 / 56.5 / 56.7 | 0.260 |
| `avb2Mobitz2` | 45–70, CV ≤ 0.4 | 56.3 / 56.5 / 56.7 | 0.363 |
| `avb2to1` | 35–45, CV ≤ 0.12 | 39.9 / 40.0 / 40.2 | 0.038 |
| `avbHighGrade` | 28–38, CV ≤ 0.12 | 33.2 / 33.4 / 33.5 | 0.033 |
| `avb3Narrow` | 40–60, CV ≤ 0.05 | 44.9 / 45.0 / 45.1 | 0.009 |
| `avb3Wide` | 20–40, CV ≤ 0.05 | 31.9 / 32.0 / 32.0 | 0.007 |
| `idioventricular` | 20–40, CV ≤ 0.05 | 35.0 / 35.0 / 35.0 | 0.004 |
| `aivr` | 40–120, CV ≤ 0.05 | 74.9 / 75.0 / 75.2 | 0.008 |
| `vtMono` | 120–250, CV ≤ 0.03 | 169.9 / 170.0 / 170.2 | 0.007 |
| `vtPoly` | 150–300, CV ≤ 0.2 | 217.0 / 220.0 / 222.1 | 0.089 |
| `torsades` | 195–255, CV ≤ 0.12 | 228.8 / 230.2 / 231.8 | 0.055 |
| `vfCoarse` | no QRS (continuous / arrest) | 0 QRS in 40 runs | — |
| `vfFine` | no QRS (continuous / arrest) | 0 QRS in 40 runs | — |
| `asystole` | no QRS (continuous / arrest) | 0 QRS in 40 runs | — |
| `pWaveAsystole` | no QRS (continuous / arrest) | 0 QRS in 40 runs | — |
| `agonal` | 4–20, CV ≤ 0.5 | 10.4 / 11.4 / 12.4 | 0.272 |
| `pacedAAI` | 65–75, CV ≤ 0.03 | 70.0 / 70.0 / 70.0 | 0.000 |
| `pacedVVI` | 65–75, CV ≤ 0.03 | 70.0 / 70.0 / 70.0 | 0.000 |
| `pacedDDD` | 65–75, CV ≤ 0.03 | 70.0 / 70.0 / 70.0 | 0.000 |

## VF evolution (vfCoarse, seed 1, noise off, autoAsystole off)

| t (min) | dominant frequency (Hz) | f_dom(t) target (Hz) | amplitude 2√2·RMS in II (mV) |
|---|---|---|---|
| 0 | 5.371 | 5.469 | 0.724 |
| 2 | 5.127 | 5.144 | 0.549 |
| 4 | 4.883 | 4.891 | 0.412 |
| 6 | 4.639 | 4.694 | 0.311 |
| 8 | 4.639 | 4.54 | 0.239 |
| 10 | 4.395 | 4.421 | 0.169 |

Onset over seeds 1–5: seed 1 5.371 Hz / 0.724 mV, seed 2 5.371 Hz / 0.742 mV, seed 3 5.371 Hz / 0.752 mV, seed 4 5.371 Hz / 0.751 mV, seed 5 5.615 Hz / 0.731 mV. rhythmSegment events: vfCoarse at 0 s (template vf-cudb), vfFine at 583 s. Spectral resolution is 0.244 Hz (Welch, 2048-point).

## Template provenance

Downloaded from `https://physionet.org/files/<project>/<version>/` on 2026-09-25 into the git-ignored `packages/validation/datasets/cache/`; every file checked against the project's `SHA256SUMS.txt` before use. `npx -y pnpm@9.15.9 --filter @pme/validation templates` printed exactly the plan's expected windows, and the generated modules are byte-identical to the plan author's.

| Template module (NOTICE) | Window id (record@start) | Dominant freq (Hz) | Source / licence | Processing |
|---|---|---|---|---|
| `templates/vf-cudb.ts` (N-050, 65 130 B, sha256 `48dae2cf…`) | `cu21@327.9s` | 5.127 | CUDB v1.0.0, DOI 10.13026/C2X59M, ODC-By 1.0 | high-pass 0.7 Hz, 250→500 Hz, unit RMS, Int16 ×4096, 8 s |
| `templates/vf-cudb.ts` (N-050, 65 130 B, sha256 `48dae2cf…`) | `cu07@200.0s` | 5.371 | CUDB v1.0.0, DOI 10.13026/C2X59M, ODC-By 1.0 | high-pass 0.7 Hz, 250→500 Hz, unit RMS, Int16 ×4096, 8 s |
| `templates/vf-cudb.ts` (N-050, 65 130 B, sha256 `48dae2cf…`) | `cu11@413.2s` | 5.371 | CUDB v1.0.0, DOI 10.13026/C2X59M, ODC-By 1.0 | high-pass 0.7 Hz, 250→500 Hz, unit RMS, Int16 ×4096, 8 s |
| `templates/vf-cudb.ts` (N-050, 65 130 B, sha256 `48dae2cf…`) | `cu33@407.0s` | 5.859 | CUDB v1.0.0, DOI 10.13026/C2X59M, ODC-By 1.0 | high-pass 0.7 Hz, 250→500 Hz, unit RMS, Int16 ×4096, 8 s |
| `templates/vf-cudb.ts` (N-050, 65 130 B, sha256 `48dae2cf…`) | `cu16@256.8s` | 4.395 | CUDB v1.0.0, DOI 10.13026/C2X59M, ODC-By 1.0 | high-pass 0.7 Hz, 250→500 Hz, unit RMS, Int16 ×4096, 8 s |
| `templates/vf-cudb.ts` (N-050, 65 130 B, sha256 `48dae2cf…`) | `cu10@462.5s` | 5.371 | CUDB v1.0.0, DOI 10.13026/C2X59M, ODC-By 1.0 | high-pass 0.7 Hz, 250→500 Hz, unit RMS, Int16 ×4096, 8 s |
| `templates/af-mitdb.ts` (N-051, 43 641 B, sha256 `007ab81a…`) | `201@1645.5s` | 5.615 | MIT-BIH Arrhythmia v1.0.0, DOI 10.13026/C2F305, ODC-By 1.0 | QRST cancelled (mean-beat subtraction), band-pass 3–15 Hz, 360→500 Hz, unit RMS, Int16 ×4096, 8 s |
| `templates/af-mitdb.ts` (N-051, 43 641 B, sha256 `007ab81a…`) | `202@1414.9s` | 6.592 | MIT-BIH Arrhythmia v1.0.0, DOI 10.13026/C2F305, ODC-By 1.0 | QRST cancelled (mean-beat subtraction), band-pass 3–15 Hz, 360→500 Hz, unit RMS, Int16 ×4096, 8 s |
| `templates/af-mitdb.ts` (N-051, 43 641 B, sha256 `007ab81a…`) | `203@1373.0s` | 5.127 | MIT-BIH Arrhythmia v1.0.0, DOI 10.13026/C2F305, ODC-By 1.0 | QRST cancelled (mean-beat subtraction), band-pass 3–15 Hz, 360→500 Hz, unit RMS, Int16 ×4096, 8 s |
| `templates/af-mitdb.ts` (N-051, 43 641 B, sha256 `007ab81a…`) | `210@1241.6s` | 6.592 | MIT-BIH Arrhythmia v1.0.0, DOI 10.13026/C2F305, ODC-By 1.0 | QRST cancelled (mean-beat subtraction), band-pass 3–15 Hz, 360→500 Hz, unit RMS, Int16 ×4096, 8 s |
| — (N-052, report only) | 20 NORM 100 records (`records500/00000/00001_hr` …) | — | PTB-XL v1.0.3, DOI 10.13026/kfzx-aw45, CC BY 4.0 | median beats vs engine beat, per-lead r; nothing bundled |

## Artefact spectra and responses

| Artefact | Measured |
|---|---|
| CPR 100/min, depth 0.5 | fundamental 1.709 Hz (f_c 1.667); lines at 1.709, 3.296, 5.005, 6.592, 8.301, 9.888, 11.597, 13.184 Hz |
| CPR 120/min, depth 0.5 | fundamental 1.953 Hz (f_c 2.0); lines at 1.953, 3.906, 5.981, 7.935, 9.888, 11.841, 13.916, 15.869 Hz |
| Mains 50 / 60 Hz (level 1) | peak 50.049 / 60.059 Hz; 3rd-harmonic line/median 16.15 / 17.97 |
| EMG | first-difference RMS 0.27 mV at level 1; level 0.1 / level 1 ratio 0.1 |
| Shivering | tremor envelope 5.981 Hz (4–8 Hz) |
| Baseline wander | dominant 0.214 Hz (0.1–0.5 Hz) |
| Shock 200 J (per lead) | ecgI rail 264 ms, offset -2.94 mV, τ 0.65 s; ecgII rail 299 ms, offset -2.875 mV, τ 0.638 s; ecgIII rail 263 ms, offset 1.899 mV, τ 0.525 s; V1 rail 277 ms, offset -2.582 mV, τ 0.669 s; V5 rail 235 ms, offset 2.308 mV, τ 0.697 s — baseline within 0.05 mV by 5 s |
| Electrosurgery (2 s burst) | RMS 3.001 mV during, 0.226 mV after |
| Leads off | every lane and the detection lead exactly 0; `alarm { category: technical, id: ecgLeadsOff }` raised then cleared |

## Deviations from the plan

Every plan step was applied verbatim with a script that writes each "Create or replace … with exactly" block and applies each "In `file`, replace … with …" anchor only when it matches exactly once. No anchor failed; no implementation file differs from the plan text. Changes against the plan:

1. **Worktree path / install (Task 1).** Worked in `scratch/wt-stage-5` as planned; installed with `pnpm install` (not `--frozen-lockfile`; the lockfile is unchanged). The base check used `git merge-base --is-ancestor d0ebed2 main` (true; main tip `e8f00f9`).
2. **Base drift (Task 1 Step 3).** Since `d0ebed2`, main changed `templates.ts` only: Stage 1.1 moved the septal Q vector (`VEC.Q` −0.058/−0.033 → −0.0722/−0.15). The plan does not edit that file, so main's value stays. Every Stage 5 test passes with it. It moves the PTB-XL report (next item).
3. **PTB-XL correlations (Task 25)** differ from the plan author's run because of item 2 (this run / plan author's): III 0.48/0.33, aVL 0.11/0.18, aVF 0.80/0.76, V1 0.73/0.84, V3 0.71/0.66, other leads within 0.02. Report only (R17); nothing changed.
4. **Task 5 Step 2** expected both sinus tests to fail before the implementation; only `sinusPause` failed (`sinusArrhythmia` already met its PP-swing bound from the Task 3 table). Implemented as written.
5. **Strips that did not show their label (Task 27 Step 2), fixed in commit `e8da47a`:** `pac` (seed 7's 10 s window held one barely premature PAC) and `pvcMultifocal` (a single PVC, so no multifocality) now use seed 9. The engine checks out (13–27 PACs/min and 16–20 PVCs/min over seeds 7–9); the window was just unlucky. `mains` was a clean trace because the monitor filter (0.5–40 Hz + 50 Hz notch) removes mains entirely, so that strip now uses the diagnostic filter. `StripSpec` gained an optional `filter`.
6. **Screenshot coverage (executor brief: every modifier group).** The plan's 70 strips covered all 36 rhythm ids but not every modifier group. Fifteen strips were appended to the catalogue in commit `e8da47a`, with the 70 left unchanged: `pjc`, `failureToPace`, `tcpNoCapture`, `vfEpinephrine`, `ischaemia`, `tInversion`, `axisLeft`, `axisRight`, `transitionLate`, `lowVoltage`, `overrides`, `individualityA`, `individualityB`, `wander` (diagnostic filter, since the monitor high-pass removes most of it), `emg`. 85 PNGs in total, all ≤ 29.1 KB.
7. **Task 26 Step 3** was checked in headless Chrome against a Vite server on port 5207 (not 5173, which other agents may use). The monitor sweeps II/V1; the "paced" gallery group shows spike ticks; "Run ACLS strip" walked sinus → VT → VF coarse → CPR → shock → asystole → ROSC in 50 s. The only console error is the browser's `/favicon.ico` 404.
8. **Plan steps whose command runs only `vitest` although the step title says "and the type check"** also got `pnpm -r typecheck` after each task (all clean).

## Observations for Ali (from the strip review; not changed)

- **VF coarse** (`vfCoarse.png`): the first ~3 s look regular and near-sinusoidal (ventricular-flutter-like) before the texture turns irregular. Please judge realism, especially for the blind check.
- **Polymorphic VT** (`vtPoly.png`): V1 is nearly flat for ~2 s while the axis sweeps perpendicular to V1, and the first 2 s in II are low-amplitude.
- **K 8.5 "sine wave"** (`hyperKsine.png`): a wide QRS running into a tall T with no ST segment (T peak 29 ms after J), not a smooth sinusoid at strip scale.
- **Osborn J at 28 °C** (`osborn.png`), **2 mm STEMIs** and **−0.2 mV ischaemia**: present but small at 10 mm/mV on a 10 s strip. The monitor filter's 0.5 Hz high-pass also slightly reduces ST deviation.
- **QRS 140 override** (`overrides.png`): the complex looks narrower than 140 ms. Widths are defined as the kernel ±2.5σ span (the Stage 1 convention), and the Gaussian tails are not visible.
- **TCP pad artefact** (`tcpNoCapture.png`, `tcpCapture.png`): the 40 ms pad artefact draws as a tall narrow deflection that can pass for a QRS without capture.
- **Label wording:** the plan's `stemiAnterior` label says "(V1/V3)" but the lanes are V3 and III (reciprocal lead); `stemiInferior` shows II and aVL as labelled.
- **Mains in the live playground:** with the default monitor filter the mains slider shows nothing (correct for a notch-filtered monitor), so a user must switch to the diagnostic filter to see it.
- **Pre-excited AF** reads fast (≈ 210/min) but only mildly irregular at a glance (RR CV ≤ 0.17 over 40 seeds).
- **Junctional escape:** the retrograde P 80 ms before the QRS is small and hard to see at strip scale.

## Merging with main (Stage 6a landed after this branch was cut)

`main` moved to `8e46032` (Stage 6a merged) while this stage was running. This branch is based on `e8f00f9` and was **not** re-based or merged, because a merge breaks a package Stage 5 may not edit:

- **Text conflicts (trivial, as the plan predicted):** `NOTICES.md` (keep both blocks: N-007…N-009 from 6a, then N-050…N-052) and `apps/demo/vite.config.ts` (keep 6a's multi-line `input` and add `stage5: page('stage5')`).
- **Type break after resolving them:** `packages/controller/src/vocabulary.ts:62` declares `const RHYTHM_LABEL: Record<RhythmId, string>` with Stage 1's 12 labels. Stage 5 makes `RhythmId` the full 36-id union, so `@pme/controller` typecheck fails (TS2740: 24 labels missing). The fix belongs to the controller's owner, and either option works: add the 24 labels, or type it `Partial<Record<RhythmId, string>>` (the code already falls back with `RHYTHM_LABEL[id] ?? id`). Better still, derive the labels from `ecgVocabulary()` (exported by this stage). Stage 5's partition forbids editing `packages/controller/**`, and no additive file can fix a type error there, so this is left for the merge.

## Needs a ruling

- How to land this PR on top of Stage 6a (see "Merging with main"): whoever merges needs the one-line `RHYTHM_LABEL` change in `packages/controller/src/vocabulary.ts`.
- NOTICE IDs N-050…N-052 were taken from a reserved block (Stages 2 and 6a add rows concurrently).
- engine.ts was touched in Task 4 only (8 replacements from the plan = 8 hunks at `-U0`: two imports, `MOD_KEYS` removed, the `generateEcg` call, the lane projection, the detection projection, `setModifiers` validate and apply; the plan text says "7 hunks" / "6 hunks" in different places); `types.ts` gained 3 EngineEvent variants and the `ModifiersPatch` command type; `index.ts` one export line.

## Sources consulted

- `docs/plans/stage-5-rhythm-library.md` (executed verbatim). Through it: `docs/DESIGN-BRIEF.md` §4.1, §4.8, §5, §6.5, §7.2–7.3, §8, §11 C1/C2; `docs/BUILD-PLAN.md` Stage 5; `research/00-orchestrator-rulings.md` (R6, R16–R20, R25), `research/02-open-source-and-academic.md` §D, `research/03-waveform-physiology-reference.md` §1 and §11. The physiological constants and their citation comments are the plan's.
- PhysioNet WFDB format documents header(5), signal(5), annot(5) (https://physionet.org/physiotools/wag/), which the plan's readers were written from.
- PhysioNet project pages and licences: CUDB v1.0.0 (ODC-By 1.0, DOI 10.13026/C2X59M), MIT-BIH Arrhythmia v1.0.0 (ODC-By 1.0, DOI 10.13026/C2F305), PTB-XL v1.0.3 (CC BY 4.0, DOI 10.13026/kfzx-aw45). Files fetched from `physionet.org/files/…` and SHA-256-checked.
- The plan author's finished tree (planning scratchpad), used only to compare outputs: engine.ts, the generated template modules and the PTB-XL JSON.
- **Clean room:** no ECGSYN (C, MATLAB or any port; the copies in the planning scratchpad were not opened), no NeuroKit2 ECGSYN, no WFDB library source, no PhysioNet ECG/PPG simulator, no Python Anesthesia Simulator and no other GPL/unlicensed code was opened.

## Strip gallery (every rhythm id and every modifier group)

10 s, 25 mm/s, 10 mm/mV, monitor filter unless the label says otherwise; pace markers drawn as white ticks. Files are named by rhythm id (variants and modifiers by their catalogue key).

### sinus

**`sinus`** — Sinus rhythm (16439 B)

![Sinus rhythm](stage-5/sinus.png)

**`sinusBrady`** — Sinus bradycardia (15877 B)

![Sinus bradycardia](stage-5/sinusBrady.png)

**`sinusTachy`** — Sinus tachycardia (19689 B)

![Sinus tachycardia](stage-5/sinusTachy.png)

**`sinusArrhythmia`** — Sinus arrhythmia (16522 B)

![Sinus arrhythmia](stage-5/sinusArrhythmia.png)

**`sinusPause`** — Sinus pause (15480 B)

![Sinus pause](stage-5/sinusPause.png)

### atrial

**`atrialTach`** — Atrial tachycardia (21018 B)

![Atrial tachycardia](stage-5/atrialTach.png)

**`mat`** — Multifocal atrial tachycardia (20669 B)

![Multifocal atrial tachycardia](stage-5/mat.png)

**`afib`** — Atrial fibrillation (18810 B)

![Atrial fibrillation](stage-5/afib.png)

**`aflutter2`** — Atrial flutter 2:1 (17999 B)

![Atrial flutter 2:1](stage-5/aflutter2.png)

**`aflutter4`** — Atrial flutter 4:1 (16686 B)

![Atrial flutter 4:1](stage-5/aflutter4.png)

**`aflutterVar`** — Atrial flutter, variable block (19288 B)

![Atrial flutter, variable block](stage-5/aflutterVar.png)

**`pac`** — Sinus with PACs (17110 B)

![Sinus with PACs](stage-5/pac.png)

**`pacAberrant`** — PACs with aberrancy (18134 B)

![PACs with aberrancy](stage-5/pacAberrant.png)

**`pjc`** — Sinus with PJCs (16957 B)

![Sinus with PJCs](stage-5/pjc.png)

### svt

**`svtAvnrt`** — SVT (AVNRT) (19998 B)

![SVT (AVNRT)](stage-5/svtAvnrt.png)

**`svtAvrt`** — SVT (orthodromic AVRT) (21693 B)

![SVT (orthodromic AVRT)](stage-5/svtAvrt.png)

**`wpwSinus`** — WPW (sinus, delta wave) (17835 B)

![WPW (sinus, delta wave)](stage-5/wpwSinus.png)

**`preexcitedAf`** — Pre-excited AF (22737 B)

![Pre-excited AF](stage-5/preexcitedAf.png)

**`junctionalEscape`** — Junctional escape (15005 B)

![Junctional escape](stage-5/junctionalEscape.png)

**`junctionalAccel`** — Accelerated junctional (17212 B)

![Accelerated junctional](stage-5/junctionalAccel.png)

**`junctionalTachy`** — Junctional tachycardia (18961 B)

![Junctional tachycardia](stage-5/junctionalTachy.png)

### avBlock

**`avb1`** — 1st-degree AV block (16882 B)

![1st-degree AV block](stage-5/avb1.png)

**`avb2Mobitz1`** — 2nd-degree Mobitz I (16233 B)

![2nd-degree Mobitz I](stage-5/avb2Mobitz1.png)

**`avb2Mobitz2`** — 2nd-degree Mobitz II (16480 B)

![2nd-degree Mobitz II](stage-5/avb2Mobitz2.png)

**`avb2to1`** — 2:1 AV block (14654 B)

![2:1 AV block](stage-5/avb2to1.png)

**`avbHighGrade`** — High-grade AV block (3:1) (15697 B)

![High-grade AV block (3:1)](stage-5/avbHighGrade.png)

**`avb3Narrow`** — CHB, narrow escape (16013 B)

![CHB, narrow escape](stage-5/avb3Narrow.png)

**`avb3Wide`** — CHB, wide escape (18348 B)

![CHB, wide escape](stage-5/avb3Wide.png)

### ventricular

**`idioventricular`** — Idioventricular rhythm (18042 B)

![Idioventricular rhythm](stage-5/idioventricular.png)

**`aivr`** — AIVR (19025 B)

![AIVR](stage-5/aivr.png)

**`pvcBigeminy`** — PVC bigeminy (20132 B)

![PVC bigeminy](stage-5/pvcBigeminy.png)

**`pvcTrigeminy`** — PVC trigeminy (19433 B)

![PVC trigeminy](stage-5/pvcTrigeminy.png)

**`pvcCouplet`** — PVC couplets (18370 B)

![PVC couplets](stage-5/pvcCouplet.png)

**`pvcMultifocal`** — Multifocal PVCs (19212 B)

![Multifocal PVCs](stage-5/pvcMultifocal.png)

**`pvcRonT`** — R-on-T PVCs (20677 B)

![R-on-T PVCs](stage-5/pvcRonT.png)

**`vtMono`** — Monomorphic VT (25432 B)

![Monomorphic VT](stage-5/vtMono.png)

**`vtPoly`** — Polymorphic VT (26434 B)

![Polymorphic VT](stage-5/vtPoly.png)

**`torsades`** — Torsades de pointes (27699 B)

![Torsades de pointes](stage-5/torsades.png)

**`vfCoarse`** — VF (coarse) (21213 B)

![VF (coarse)](stage-5/vfCoarse.png)

**`vfFine`** — VF (fine) (11653 B)

![VF (fine)](stage-5/vfFine.png)

**`vfEpinephrine`** — VF coarse, 90 s after epinephrine (peak effect) (25913 B)

![VF coarse, 90 s after epinephrine (peak effect)](stage-5/vfEpinephrine.png)

### arrest

**`asystole`** — Asystole (9580 B)

![Asystole](stage-5/asystole.png)

**`pWaveAsystole`** — P-wave asystole (11318 B)

![P-wave asystole](stage-5/pWaveAsystole.png)

**`agonal`** — Agonal rhythm (11923 B)

![Agonal rhythm](stage-5/agonal.png)

**`pea`** — PEA (sinus, pulseless) (17360 B)

![PEA (sinus, pulseless)](stage-5/pea.png)

### paced

**`pacedAAI`** — Paced AAI (16020 B)

![Paced AAI](stage-5/pacedAAI.png)

**`pacedVVI`** — Paced VVI (18382 B)

![Paced VVI](stage-5/pacedVVI.png)

**`pacedDDD`** — Paced DDD (18424 B)

![Paced DDD](stage-5/pacedDDD.png)

**`failureToCapture`** — VVI failure to capture (17760 B)

![VVI failure to capture](stage-5/failureToCapture.png)

**`failureToSense`** — VVI failure to sense (19612 B)

![VVI failure to sense](stage-5/failureToSense.png)

**`oversensing`** — VVI oversensing (18306 B)

![VVI oversensing](stage-5/oversensing.png)

**`tcpCapture`** — Transcutaneous pacing, capture (22867 B)

![Transcutaneous pacing, capture](stage-5/tcpCapture.png)

**`failureToPace`** — VVI failure to pace (18597 B)

![VVI failure to pace](stage-5/failureToPace.png)

**`tcpNoCapture`** — Transcutaneous pacing, no capture (50 mA < 70 mA threshold) (20597 B)

![Transcutaneous pacing, no capture (50 mA < 70 mA threshold)](stage-5/tcpNoCapture.png)

### modifier

**`stemiAnterior`** — Anterior STEMI (V1/V3) (19899 B)

![Anterior STEMI (V1/V3)](stage-5/stemiAnterior.png)

**`stemiInferior`** — Inferior STEMI (II/aVL) (16694 B)

![Inferior STEMI (II/aVL)](stage-5/stemiInferior.png)

**`lbbb`** — LBBB (18292 B)

![LBBB](stage-5/lbbb.png)

**`rbbb`** — RBBB (16908 B)

![RBBB](stage-5/rbbb.png)

**`hyperK`** — Hyperkalaemia K 7.2 (18225 B)

![Hyperkalaemia K 7.2](stage-5/hyperK.png)

**`hyperKsine`** — Hyperkalaemia K 8.5 (sine wave) (19952 B)

![Hyperkalaemia K 8.5 (sine wave)](stage-5/hyperKsine.png)

**`hypoK`** — Hypokalaemia K 2.5 (U waves) (19094 B)

![Hypokalaemia K 2.5 (U waves)](stage-5/hypoK.png)

**`osborn`** — Hypothermia 28 °C (Osborn J) (19682 B)

![Hypothermia 28 °C (Osborn J)](stage-5/osborn.png)

**`brugada`** — Brugada type 1 (18889 B)

![Brugada type 1](stage-5/brugada.png)

**`digoxin`** — Digoxin effect (16634 B)

![Digoxin effect](stage-5/digoxin.png)

**`longQT`** — Long QT (15835 B)

![Long QT](stage-5/longQT.png)

**`alternans`** — Electrical alternans (16596 B)

![Electrical alternans](stage-5/alternans.png)

**`lvh`** — LVH (17451 B)

![LVH](stage-5/lvh.png)

**`ischaemia`** — Subendocardial ischaemia (ST −0.2 mV, II/V5) (23123 B)

![Subendocardial ischaemia (ST −0.2 mV, II/V5)](stage-5/ischaemia.png)

**`tInversion`** — T-wave inversion (20458 B)

![T-wave inversion](stage-5/tInversion.png)

**`axisLeft`** — Left axis −45° (I/aVF) (17852 B)

![Left axis −45° (I/aVF)](stage-5/axisLeft.png)

**`axisRight`** — Right axis +120° (I/aVF) (19127 B)

![Right axis +120° (I/aVF)](stage-5/axisRight.png)

**`transitionLate`** — Late precordial transition (V5; V3/V5) (22290 B)

![Late precordial transition (V5; V3/V5)](stage-5/transitionLate.png)

**`lowVoltage`** — Low voltage (×0.5) (14803 B)

![Low voltage (×0.5)](stage-5/lowVoltage.png)

**`overrides`** — Interval overrides (PR 280, QRS 140, QT 520 ms) (20758 B)

![Interval overrides (PR 280, QRS 140, QT 520 ms)](stage-5/overrides.png)

**`individualityA`** — Individuality: patientSeed 3, variation 1 (18384 B)

![Individuality: patientSeed 3, variation 1](stage-5/individualityA.png)

**`individualityB`** — Individuality: patientSeed 4, variation 1 (18791 B)

![Individuality: patientSeed 4, variation 1](stage-5/individualityB.png)

### artefact

**`mains`** — 50 Hz mains interference (diagnostic filter) (26382 B)

![50 Hz mains interference (diagnostic filter)](stage-5/mains.png)

**`shiver`** — Shivering artefact (19907 B)

![Shivering artefact](stage-5/shiver.png)

**`motion`** — Motion artefact (20642 B)

![Motion artefact](stage-5/motion.png)

**`cpr`** — VF with CPR artefact (27061 B)

![VF with CPR artefact](stage-5/cpr.png)

**`shock`** — Shock artefact (200 J) on VF (24590 B)

![Shock artefact (200 J) on VF](stage-5/shock.png)

**`diathermy`** — Electrosurgery burst (29085 B)

![Electrosurgery burst](stage-5/diathermy.png)

**`leadOff`** — Leads off (flat, technical) (6099 B)

![Leads off (flat, technical)](stage-5/leadOff.png)

**`wander`** — Baseline wander (23569 B)

![Baseline wander](stage-5/wander.png)

**`emg`** — EMG (muscle) artefact (23172 B)

![EMG (muscle) artefact](stage-5/emg.png)
