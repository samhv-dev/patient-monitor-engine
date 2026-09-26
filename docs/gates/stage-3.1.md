# Stage 3.1 gate: evidence fixes (R39)

*Branch `stage-3.1-evidence-fixes`, base `origin/main` 69731e8 (Stages 0–4b merged). No written plan: six items from R39
(research/00 R39, research/09), each done test-first as one commit. Numbers below were measured on this branch.*

## Items

| # | R39 | What changed | Before → after (measured) | Band |
|---|---|---|---|---|
| 1 | R39-1 | Test only: displayed SpO2 in room-air apnoea (`resp-oxygen` 5c). Test 5b's arterial band moved from R29's provisional 40–90 s to 35–60 s. | True SaO2 < 90 % at **41 s**; displayed < 90 at **63 s**; displayed first falls at **30 s**. No constants changed. | 35–60 / 45–90 / 20–45 s |
| 2 | R39-2 | `cpr.quality` default 1.0 → **0.8** (`CPR_QUALITY_DEFAULT`, hemo state and `cpr` event). Gas exchange sees CPR flow as quality^1.9 below 1 and linear above (`cprFlowFactor`, l2/gas/coupling.ts). The Stage 2 pressure waveforms stay linear in quality. | Mean displayed EtCO2 over minutes 1–10, BVM 10/min: q 0.5 **17.2 → 12.2**; 0.8 **22.7 → 20.4**; 1.0 25.9 → 25.9; 1.2 28.8 → 28.8 mmHg. +10 breaths/min at 0.8: −3.0 → **−2.4** mmHg. | 8–15 / 17–23 / 22–28 / 26–32; −2 to −4.5 |
| 3 | R39-4 | `paceThresholdMa` default 60 → **70 mA** (l1/state.ts); validation 10–200 is unchanged and covers 40–200. The demo's Stage 6b "Pace" action now uses **80 mA** (was 70), about 10 % above threshold, so it shows capture by default. | Default patient: at 65 mA no spike captures; at 70 mA every spike captures. Stage 4b tests still pass (they set 70 or pace at 90/100/140 mA). | capture ≥ 70, none ≤ 65 |
| 4 | R39-5 | Skin schema gains `co2.sidestreamDelayS` (0–10 s) and `co2.riseTimeMs` (20–1000 ms), with a provenance entry per skin. `DeviceProfile.co2Sidestream` carries them. The engine copies them into the capnograph sampler at start, on restore and on every device command (so a runtime skin switch applies). With no skin data the sampler falls back to `SAMPLING`. Mainstream and the neonatal rise are unchanged. | Step response on the sampled waveform (delay = step → 10 %, rise = 10 → 90 %): philips-like **2.30 s / 0.24 s**; saadat-like, zoll-like, lifepak-like **2.60 / 0.20**; mindray-like, ge-like **3.50 / 0.28**. In the engine the mindray-like capnogram lags the philips-like one by **1.2 s**. Before: every skin 2.30 / 0.24. | per research 09 §5 |
| 5 | R39-6 | Shark fin: τ_II now comes from a piecewise-linear severity map `SHARK_TAU_II`. Phase III rises 6 mmHg per unit severity (was 10). Bronchospasm severity now validates to **1.25**, the near-fatal extreme; other airway states stay 0–1. | α (mean of about 7 breaths): sev 0 **109.4 → 105.3°**; 0.5 **134.4 → 124.9°**; 0.8 **150.2 → 135.1°**; 1.0 **157.9 → 144.7°**; 1.25 (new) **156.7°**. | 100–110 / 120–130 / 128–142 / 140–150 / 150–160 |
| 6 | R39-7 | Test only (engine level, default 70 kg adult, `thermal` general at t = 60 s). The `thermal` event's `warming` flag is the forced-air case. | Unwarmed: **−0.97 °C** at 30 min, **−1.28 °C** at 60 min. Warmed: **−0.68 °C** at 60 min. No constants changed. | −0.7 to −1.1 / −1.0 to −1.6 / −0.6 to −1.2 |

**Angle convention (item 5), fixed in the test.** The test uses `capnoAngles` in `packages/engine-core/test/helpers/resp.ts`, on the brief §4.4 axis scale of **25 mmHg/s**:
- Phase II slope: taken between the 25 % and 75 % crossings of the plateau-end value.
- Phase III slope: a regression from the 90 % crossing + 0.2 s to the plateau end.
- α = 180° − atan(s_II/25) + atan(s_III/25).

This is the scale on which the capno.ts comment gets 105° for normal (research 09 §6 asks for that same scale). No Stage 3 test asserted 157°. Test 1 (α ≥ 120° at severity 1) still holds.

## Deviations and notes

- **Item 2 goes beyond "change the default".**
  - With the default change alone, quality 0.8 gave 22.7 mmHg and quality 0.5 gave 17.2 mmHg, against research 09's 12 (8–15). The 0.5 target matters because EtCO2 must cross the < 10 mmHg "improve CPR" threshold at quality ≤ 0.4.
  - The fitted flow curve hits all four research-09 points and leaves quality ≥ 1 exactly as it was.
  - Measurement window: the mean over minutes 1–10 (research 09: "first 10 min"). EtCO2 still climbs within the window. At q 1.0 it goes from 21 at 1 min to 30 at 10 min, because the tissue store builds up (Stage 3 model, unchanged).
- **Item 2, ventilation effect.** It is now −2.4 mmHg per +10 breaths/min, inside the −2 to −4.5 band but under the −3 default. No separate ventilation-rate term was added: it emerges from the CO2 model.
- **Item 3.** The demo e2e comment now cites 70 mA (R39-4). The e2e itself paces at 90 mA and captures.
- **Item 4, zoll-like and lifepak-like.** Both are tagged `assumed` (2.6 s / 200 ms): the skin research does not record which CO2 technology these vendors use.
  - `packages/skins/test/provenance.test.ts` now accepts `research/NN` for any report number, not only 00–06, so research/09 can be cited.
- **Item 5 touches l2/resp.** It is a one-line change in `validateRespCommand` (`packages/engine-core/src/l2/resp/pipeline.ts`): the bronchospasm severity bound goes 1 → 1.25. Stage V's diff to that file (the import and the `externalDrive` frame check) does not overlap it.
  - Item 4's sampler change lives in `l2/co2/capno.ts` and `engine.ts`. No resp driver file was edited.
- **Item 6, warmed case.** −0.68 °C is inside the band, but at its warm edge; research 09's default is −0.9. The constants were kept per R39-7. Moving toward −0.9 would mean weaker warming, and that conflicts with Stage 3's "+0.5–1 °C/h" warming-gain test. This is left for Ali/Stage 7.
- **Stage 5.1 area.** l2/ecg/** was not touched.

## Gate

- `pnpm -r typecheck`: clean.
- `pnpm -r test`: engine-core **460** (main 444, +16), skins **166** (+7), controller 185, renderer 61, audio 58, validation 16. Total **946**, all passing.
- `pnpm build`: all packages built. `pnpm check-notices`: OK.
- `PW_SYSTEM_CHROME=1 pnpm test:e2e`: 19/19 in 3 of 5 full runs on this branch.
  - The first two full runs each failed one test, `stage6b.e2e.ts` "ACLS VF … → ROSC" (`stateId` never reached `rosc` within 5 s after the shock). It passes alone (2/2 with `--repeat-each 2`), and the next three full runs were 19/19.
  - For comparison, `origin/main` (built) gave 19/19 in 2 of 2 full runs.
  - The test clicks Shock after a fixed 8 s wall-clock wait for a 7 s sim-time charge, so under load it can shock before READY. This looks like a timing flake of the test, not a result of these items (none of them touches the defibrillator or the scenario runner). Suggested follow-up: poll for READY before shocking.
