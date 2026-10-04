# FU-7 baseline (Task 0 Step 6) — the merged main before FU-7 touched anything

Base: `origin/main` **176f702** (Merge pull request #28, FU-6), merged into `fu-7-drug-layer` as **b004289** (clean
merge; FU-4, V.1, FU-5, FU-8 Part A and FU-6 all on the tree). Cloud container, 4 cores; the runs below shared the
machine with each other and with the Task 1 "before" audit, so wall times are load-inflated.

| check | result | wall |
|---|---|---|
| `pnpm -r typecheck` | clean (8 projects) | 49 s |
| `PME_TEST_SET=fast` | 277 files: **1 failed** / 1,226 passed / 1 skipped | 9 m 57 s |
| `PME_TEST_SET=slow-a` | 45 files / **167 passed** | 139 m (load) |
| `PME_TEST_SET=slow-b` | 45 files / **252 passed** | 117 m (load) |

**The one red fast test (reported, not fixed):** `test/engine/truth-event.test.ts` "costs < 0.2 ms per call …" — a
wall-clock assertion that failed while two audit runners shared the CPU; run alone on the same tree it passes
(`pruneTruth ≈ 0.562 ms per call`; CI asserts 1 ms).

## Step 6b — the AF precondition (FU-8 Part A's fix, research/19 CM-15c): **PASS**

`kIschMin40` **0.90**, `kIschMean40` 0.95, `kIschMin70` 0.90, `kIschSinus150` 1.00, `negCppSamples40` 22, `svMean40`
31.4 mL, `mapMean40` 96.3, `arrest40` **false**, `arrest70` **false** (before, on main 0fd5397: `kIsch` min 0, mean 0.19,
arrest). Tasks 11, 12 and 19 run their AF rigs as written; FU-8 Part A (PR #27, 1496c30 on main) is the fix.

## Step 6c — the arrest-state precondition (FU-8 Part A's V1, research/20 DV-01b): **PASS**

`nPea` **11**, `peaRegainPct` **100**, `peaArrestDeclared` **true**, `peaCppMean` **68.4**, `peaMyoEnd` 1.00
(the runner's `hand` WR note is the stale pre-FU-8 text; the automatic grade is PL). Task 12 runs as written and Step 7a
adds DV-01b to the end-to-end run.

## Task 0 Steps 4–5 (structures FU-7 builds on)

- FU-6: `LOC_LO`, `APNOEA_VE_IN`/`APNOEA_VE_OUT` (relative apnoea threshold, `s.rr === 0` in `neuro/spont.ts`), the
  `HVR_*` constants incl. the ONE NMB arm `HVR_NMB_EMAX`/`HVR_NMB_TOFR_LO` inside `hvrDep`. `dMid` is read only by the
  `hvrDep` line; `SYNERGY` only by the product term Task 6 replaces.
- FU-4: `symp`/`setF` in `NEUTRAL_FX`/`FX_TARGETS`; the `stepBaro(` call (`circ/model.ts:284` on b004289):
  `stepBaro(m.baro, sensed, { gVagal: m.prof.gVagal * de.gv * (1 - (de.muscBlock ?? 0)), gSymp: m.prof.gSymp * de.gv, betaBlock: …, betaBlockC: …, hrGain: de.gvHr, weightScale: w, pinnedSet: m.mapSetPinned, outF: de.symp, setF: de.setF, brainF: brainstemOutF(m.ext.cbfRel) }, raTm)`.
- FU-4 18f **landed**: `rhythmRequest(pk, hs, current: { id; pinned }, t, outcomeRng?: Sfc32State): { id; opts; hold? } | null`
  → Task 11 takes Step 3a (re-anchor on 18f's line), not the numbered fallback.
