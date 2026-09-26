# Gate V — Ventilator fork and the two-way link (date: 2026-09-26)

Gate question: "Does changing the ventilator move the monitor the way it does at the bedside — PEEP lowers BP and raises CVP, FiO2 and PEEP move SpO2 on their own time scales, gas trapping in COPD drops the pressure, and a disconnected circuit alarms on both devices at once?"

Branch `stage-v-ventilator-link`, based on `main` `69731e8` (Stage 4b merged at `d96c8c0`); `origin/main` `f45ba96` (docs only: the clinical lung-pathology catalogue) merged in at Task 21, built from `docs/plans/stage-v-ventilator-link.md` (21 tasks). Rulings applied: R27, R35, R36, R39 §5, R41 (all plan choices accepted incl. C1; file rule for the data table).

| Check | Result |
|---|---|
| typecheck / `pnpm -r test` / build / check-notices / e2e (Task 21, after a clean `install --frozen-lockfile`) | exit 0 ×5. Tests: ventilator **87** (13 files), engine-core **447** (444 on this base + 3 new; the plan's 372 predates Stage 4b), controller 185, skins 159, renderer 61, audio 58, validation 16; build OK (vent-hamilton 32.7 kB JS, vent-link 4.8 kB); `check-notices: OK`; `PW_SYSTEM_CHROME=1 test:e2e` **21 passed** (2.7 min) incl. `vent-link.e2e.ts` 2 |
| Port fidelity (10 traces captured from the original v1.9 in headless Chrome) | capture output identical to the plan's (breaths, PIP, auto-PEEP, VTE for all 10); fixture byte-identical to the prototype's. Max |error| per column (Paw, flow, volume, Pmus, phase, displayed Paw) ≤ 5.0e-4 everywhere = the fixture's 0.001 rounding; phase 0 exactly; breath counts and final numerics equal to 2 dp. Three traces compared up to C1's first trapped-gas VC breath (vc-decel-copd-rr20 3.26 s, scn-breath-stack 1.08 s, vc-spont-variability 3.26 s), the other 7 whole |
| C1 (R41: accepted; flagged for Ali as a change to his original) | Fixture scenario vc-decel-copd-rr20 (Pmax 35): VTE 454.9 / auto-PEEP 8.08 vs v1.9 292.8 / 4.48. COPD RR 20, VT 560, Pmax 60: VTE 561.7 (every breath = VT ± one 5 ms step), auto-PEEP 10.0 at steady state (4.8 → 8.6 → 9.8 → 10.0 over 5/10/20/40 s; the plan's "11.9" is not reproduced). Breath-stacking stacked VT 350.0 (v1.9 104.2). COPD link demonstration **without** C1 (scratch revert): auto-PEEP 2.1 → 4.3, MAP 97.3 → 93.8 (−3.5), VTE 286; **with** C1: MAP −19.8 (below) |
| PEEP 5 → 15 (normal) | CO 4.90 → 4.44 (−9.4 %), MAP 97.09 → 83.62, CVP 5.99 → 8.14 (Stage 3 gate: −9 %, 97 → 83, 6.0 → 8.2) |
| FiO2 0.4 → 1.0 (ARDS moderate, VT 420) | SpO2 89.0 → 94.3 within 3 min (shunt-limited) |
| RR 14 → 22 (VT 500) | EtCO2 37.9 → 34.0 (+2 min) → 31.0 (+10 min) |
| COPD GOLD 3–4, VT 560, RR 10 → 20 | auto-PEEP 2.84 → 9.91, MAP 93.74 → 73.89, CO 4.80 → 4.03, CVP 6.38 → 8.64; back to RR 10: MAP 93.64 |
| ARDS moderate PEEP 5 → 15 → 5 (FiO2 0.6) | SpO2 91 → 98 (recruitment over 1–4 min), CO 4.96 → 4.34 (−12.5 %), MAP 97.27 → 82.65; PEEP 5 again: SpO2 92.91 within 60 s |
| HF (cardiogenic oedema) PEEP 5 → 12 | SpO2 95 → 98, CO 4.95 → 4.50, MAP 97.27 → 85.44 |
| R36 PH crisis (PEEP 15 + RR 8) | EtCO2 37 → 42, CVP 5.99 → 7.88, MAP 97.30 → 85.26 (RV-failure signature waits for 7a) |
| R36 tension pneumothorax (C 38 → 18 + stand-in) | plateau 18.16 → 32.78, SpO2 98 → 91.35, MAP 97.13 → 49.78, CVP 5.99 → 18.04, EtCO2 37 → 30 |
| R36 massive PE (stand-in, ventilation unchanged) | EtCO2 37 → 31, CO 4.87 → 3.60, MAP 97.13 → 54.69, CVP 6.0 → 15.0, plateau 14.11 → 14.11 |
| R36 fibrosis | driving pressure 16.7 at VT 490 → 11.7 at VT 350 × RR 20 |
| Every catalogue row as a link profile | 39 profiles start and run 60 s with no rejected command |
| Disconnection | ventilator alarm "Disconnection on patient side" +0.94 s; capnogram max < 1 mmHg over 124–135 s (from +4 s; sidestream 2.3 s, R39 §5); EtCO2 numeric 37, 37, 0, 0 (0 by +14 s) |
| Determinism | seed 42 ×2 → identical SHA-256 over ventilator Paw/Q/V (3000 ticks, a PEEP/FiO2 step at 30 s) + engine co2/abp/pleth (60 s); seed 43 differs |
| Catalogue (R36) | 39 rows, unique ids, every row ≥ 2 sources; every row's plateau / ΔP / auto-PEEP / peak−plateau inside its band (41 tests); 3 citations spot-checked against the PDFs: Co-Existing 8e pdf 44 "air trapping" True, pdf 38 "high peak airway pressure" True, Miller 10e pdf 1849 "auto-PEEP" True |
| In-process speed | 240 sim-s of ventilator + engine in 6.72 s wall (36 × real time; prototype 60× on an idle machine) |
| Browser clocks (vent-link.html, headless system Chrome, 20 s wall each) | ×1: engine 0.99×, ventilator 1.00×; ×4: engine 3.97×, ventilator 4.00×; lead ventilator − engine 0.02–0.83 s (engine time read from 1 Hz state events, so up to 1 sim-s of the lead is sampling staleness). **×10: the engine stays at its previous speed** — the engine clock accepts 0.25–4 only (`clock.ts`, brief §3.3; `setTimeScale(10)` throws inside the worker), so the ventilator is held by the link's clock limit: 1.00×, lead 0.98–2.31 s (≤ 1.5 s + sampling staleness). The prototype's "×10 holds ×4" is most likely the same clamp seen from a page already at ×4 |

Screenshot timing note: the demonstration shots are taken at settle + 60–180 sim-s at ×4.

## Screenshots (`docs/gates/stage-V/`, all ≤ 60 KB: 48–59 KB)
- **hamilton** — the Hamilton-style cockpit alone on the TypeScript engine: (S)CMV+, VT 500 / 14 / PEEP 5 / O2 40, yellow/green/cyan Paw/flow/volume sweeps with the erase gap; start-up "ExpMinVol low" banner as in v1.9 before two breaths.
- **combined** — vent-link.html at ×4, normal profile: ventilator iframe (14/min, VTE 500, Ppeak 24) beside the philips-like monitor (HR 75, ABP 118/79 (95), SpO2 98, EtCO2 36, CO2 lane following the ventilator's breaths).
- **demo-copd** — COPD GOLD 3–4 at RR 20: ventilator "Intrinsic PEEP" banner, VTE 562, Ppeak 44, volume trace not returning to baseline; monitor ABP 94/63 (75), EtCO2 29 with its low alarm.
- **demo-ards** — ARDS moderate after PEEP 15 / FiO2 60: Ppeak 41, Pmean 21; SpO2 98, ABP 105/70 (84).
- **demo-hf** — cardiogenic oedema at PEEP 12: VTE 478 (Pmax-limited, "High pressure (Pmax)" banner), SpO2 97, ABP 108/72 (86). The monitor also showed a latched "***APNEA" in this capture; two isolated re-runs (hf alone; ards → hf, alarm transitions logged) never raised APNEA — not reproduced, listed below.
- **demo-ph** — PH crisis: PEEP 15, rate 8, EtCO2 40, ABP 108/72 (86).
- **demo-tension** — tension pneumothorax: Ppeak 46, SpO2 92, HR 126, ABP 66/41 (50), EtCO2 30, "CVP" alarm on the monitor.
- **demo-pe** — massive PE: ventilation unchanged (Ppeak 24, VTE 500), HR 120, ABP 69/46 (54) with the ABPd alarm, EtCO2 30.
- **demo-fibrosis** — fibrosis after VT 350 × RR 20: Ppeak 26, same minute volume 7.0 L/min, SpO2 98.

The monitor side of the combined page has no CVP numeric tile (the philips-like tile set shows the CVP waveform only); the page's status line below the fold carries CVP.

## Needs a ruling
1. **Correction C1** — accepted by R41 as its own revertible task (Task 5, commit `08f6e93`); still to be confirmed by Ali as a change to his original.
2. **Catalogue values** — the engine's 39 rows are published as `docs/physiology/stage-v-lung-pathology-data.md` (R41 file rule) for review beside the clinical catalogue `docs/physiology/stage-7-lung-pathology-catalogue.md`; rows marked ENG need Ali's number (neonatal RDS, COVID phenotypes, pregnancy chest wall, stand-in haemodynamics). The orchestrator reconciles data rows ⊂ catalogue after the review.
3. **Stand-ins** (INTERIM, plan decision 8) — shock is SET in MANUAL for PE / tension PTX / anaphylaxis / air embolism until Stage 7a.
4. **Interim recruitment** (INTERIM) — τ 40 s up / 10 s down [ENG] until Stage 7b.
5. **Speed ×10 on vent-link.html** — the engine clock is limited to ×0.25–4 (brief §3.3), so the page's ×10 option leaves the engine at its previous speed (the link's clock limit keeps the ventilator with it). Offer ×1/×2/×4 instead, or lift the engine limit? Left as the plan wrote it.
6. **The unreproduced "***APNEA"** in demo-hf — a 4b alarm latched during one screenshot run; worth a look when the alarm engine and the link run together at ×4 under load.

## Deviations from the plan
1. **Commit trailer** — `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` on every commit, as the executor brief required (the plan text shows the Opus line).
2. **Task 6 count** — engine-core 447 (444 + 3) instead of the plan's 372 + 3: the base now includes Stage 4b.
3. **Task 9, two plan defects** — the `catalogue.ts` block lacked the line `export const LUNG_PATHOLOGIES: readonly LungPathology[] = [` (restored, identical to the plan author's tree); the Task 9 test block already contained Task 10/11's `catalogue coverage` describe, so it was trimmed to the signature describe and Tasks 10 and 11 appended their tests as written (final file identical to the plan author's).
4. **Task 10 commit message** first pushed with a paraphrased subject, then amended to the plan's subject (force-with-lease on this branch only).
5. **Task 18 bug fixed in its own commit (`6aa7c2b`, fix(demo))** — `mount()` in `apps/demo/src/vent/link-page.ts` did not reset `simT` and the numerics when a demonstration remounted the monitor with a new engine; the demo's step then fired on the first measurement event (stale simT ≥ settleS) and the screenshot script's `simT ≥ settle + after` wait returned at once (the first screenshot run's hf/ph/tension/pe/fibrosis frames showed t ≈ 0). The fix resets both; e2e 2/2 before and after; screenshots retaken.
6. **Task 19 (R41 FILE RULE)** — `packages/ventilator/scripts/catalogue-md.ts` writes a standalone `docs/physiology/stage-v-lung-pathology-data.md` (own H1, pointer to the clinical catalogue); nothing is appended to `stage-7-parameter-tables.md`, and `stage-7-lung-pathology-catalogue.md` is not touched. The plan's `grep -c '^| '` expectation of 41 is a miscount — the separator row starts `|---`, so 40 (header + 39 rows) is the correct count.
7. **Task 21 fix-up (own commit `b92d5ac`)** — the first full `pnpm test` failed one test: link-core's "in-process: 14 breaths/min" (one sim-minute of engine + ventilator, no timeout) took 8.6 s against Vitest's 5 s default while `pnpm -r test` ran the packages in parallel (≈ 2 s alone). It now takes the CI budget `{ timeout: 300_000 }`; the full run was repeated and passed. The e2e run rewrites other stages' gate artefacts (`docs/gates/stage-4a/4b/6a/6b`); those working-tree changes were discarded, not committed.
8. **R41 INTERIM markers** — R41 asks for the interim recruitment model and the stand-ins to be marked INTERIM in code: two comment lines (`link/recruit.ts`, `link/profiles.ts` `STAND_INS`) now say so, in their own commit.
9. **Task 17/18 on the 4b base** — no find/replace misses: `apps/demo/package.json`, `vite.config.ts` and `index.html` anchors matched once; renderer's `mountMonitor` options used by the page are unchanged by 4b; every created file is identical to the plan author's tree except the fixes above (and a trailing blank line in `in-process.ts`).

## Partition
- engine-core (`git diff 69731e8 --stat -- packages/engine-core`):
  ```
  packages/engine-core/src/index.ts                  |  1 +
  packages/engine-core/src/l2/resp/driver.ts         |  7 ++--
  packages/engine-core/src/l2/resp/pipeline.ts       |  3 +-
  packages/engine-core/src/types-vent-link.ts        | 17 +++++++++
  .../test/l2/resp/vent-frame-ext.test.ts            | 41 ++++++++++++++++++++++
  5 files changed, 65 insertions(+), 4 deletions(-)
  ```
- Nothing under Stage 4b's or 5.1's paths changed: `git diff 69731e8 --stat -- packages/engine-core/src/l2/ecg packages/engine-core/src/l3 packages/renderer packages/skins` is empty.
- Elsewhere: `apps/demo/{package.json,vite.config.ts,index.html}` one line each (+ two vite inputs), `NOTICES.md` N-060/N-061, `pnpm-lock.yaml`, `docs/physiology/stage-v-lung-pathology-data.md` (new).
