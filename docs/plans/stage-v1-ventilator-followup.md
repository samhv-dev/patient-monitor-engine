# Stage V.1: the ventilator link on the real lungs — absolute lungState, the pleural pressure on the ventilator, the regenerated 7b data table, and the Stage 3 child's resting gases — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish what Stage 7b handed to the ventilator link (G7b rulings 4 + 5 + 13, NR-3, and the orchestrator's ruling on G7e question 3). Every Stage V link profile carries its catalogue row's engine `lungConditions`, the ventilator reads `lungState` as ABSOLUTE values (compliance, inspiratory and expiratory resistance, and a new `pleuralCmH2O`), and the interim link shunt/recruitment model and the 7a PE/tension stand-ins in the profiles are retired — the 7b lungs own shunt, recruitment, dead space, PVR and pleural pressure. The ventilator's single compartment sees the pleural pressure through a mechanism (a lung collapsed at end-expiration by a pleural pressure above PEEP must be re-opened each breath), which brings the tension-pneumothorax reference plateau from 18.8 to 35.6 cmH2O and restores the catalogue's authored plateau/ΔP bands 25–50 / 20–45 (peak − plateau keeps 7b's widened lower bound 9.7; authored 10, measured 9.8 — calibration row). The cardiogenic-oedema link test is re-specified to SpO2 rise + PCWP fall on a profile with 7a's `hfref`, with the lung-water shunt's documented PEEP response (tables §4.5) implemented. `docs/physiology/stage-v-lung-pathology-data.md` is regenerated from the real 7b lungs. And one pre-existing Stage 3/7b defect is fixed as a mechanism: the child rig rested at PaCO2 94 / SaO2 0.36 because the CO-ratio reference was the adult's.

**Architecture:** No new organ and no `engine.ts` edit. Engine side (three named exceptions): Stage 3's CO-ratio reference becomes the patient's own resting flow, except during CPR, whose compression flow is adult-absolute (E-V1-1; bit-identical at effective weight 70 kg, other adults shift — Decision 11); the 7b lung module's `lungState` gains `pleuralCmH2O` and `ventReference` returns it (E-V1-3); the lung-water part of the extra shunt falls with PEEP (E-V1-2). Ventilator side (`packages/ventilator`, owned): `VentConfig.pleural` and a pleural opening pressure in `recoilPressure`; `lungMechanics()` maps one lung (C, R_insp, R_exp, pleural) to the single compartment for BOTH the catalogue rows and every `lungState`; link profiles carry `patient.lungConditions`; `link/recruit.ts` is deleted. Demo side: the combined page's tension and PE demonstrations send the engine's lung conditions.

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2, Vite 6.4, Playwright (system Chrome) for the e2e and the screenshots. No runtime dependencies.

**Spec:** `../research/00-orchestrator-rulings.md` — **G7b (2026-09-26 23:00)** rulings 4+5+13 (lungState absolute, profiles carry `lungConditions`, interim shunt/recruit retired; the single compartment must see 7a's `pPtx`/the lungs' pleural pressure; regenerate the data table; oedema test → SpO2 rise + PCWP fall; ARDS link −3.0 stays `it.fails` until V.1) and 9 (NR-3: massive PE and COPD link items CLOSED — this plan does not reopen them); its calibration-queue entry "tension-ptx ventilator plateau (until V.1)"; G7a NR-3 (oedema profile gets `hfref`); R41 (the interim models and stand-ins are deleted when the physiology lands); R46 (7b recruitment: PEEP alone −20 % shunt); R45; R51 + addenda 13–18; CI rule amendments 1–4; the orchestrator's ruling on G7e question 3 (the child rig, Q-7e-8); R53 (release order FU-3 → FU-4 → V.1 → 8b: FU-4 lands BEFORE V.1); the orchestrator's "V.1 rulings on the writer's questions" (eight rulings) and "V.1 R50 review (2026-09-27 22:51): APPROVE WITH FIXES" (seven rulings), applied in this plan and recorded in Decisions 16–30. Gate notes read: `docs/gates/stage-7b.md` §6, §9 items 4, 5, 9, 10, 13; `docs/gates/stage-V.md`; `docs/gates/stage-7e.md` Q-7e-8; 7d/7f/7g/FU-2 gate notes (no ventilator-link item); `docs/plans/fu-3-followups.md` (item 7's deferred CVP fix edits `link-r27`/`link-r36` — see Requests); `research/08-physiology-integration-audit.md` G6 (FU-4: one PE event, one tension-PTX pressure source).

## Global Constraints

- Paths are relative to `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo`. **Work in the worktree** `../scratch/wt-stage-v1` on branch `stage-v1-ventilator-followup`, created from `origin/main` when the orchestrator launches V.1 (R53 order: after FU-3 and FU-4 have merged). The plan's find blocks were verified against `origin/main` **`7a181b5`** (7a, 7b, 7c, 7d, 7e, 7f, 7g, 7x, 8a, FU-1, FU-2 merged; 7e = PR #22) and re-checked after the V.1 review fixes on `origin/main` `5b56a5c` (same code). Applied in task order, every find block matches exactly once at the moment it is applied; four of them (Task 3's two in `v1-lung-seams.test.ts`, Task 6's two in `pathology/mechanics.ts`) and the Task 5 blocks in `test/pleural.test.ts` match only after the earlier task of this plan that writes their lines (see Self-review). The R50 reviewer also merged `origin/fu-3-followups` (e43b4c0) into main without conflicts and found every block still unique in order.
- **FU-3 and FU-4 merge before V.1 starts (R53; orchestrator ruling (V.1 review) 4).** When the orchestrator launches V.1, `origin/main` already carries FU-3 and FU-4. Task 0 therefore **re-verifies every find block** on that tree before Task 1 (Task 0 Step 4): each block's find text must occur exactly once at the moment it is applied. FU-4 is expected to touch this plan's anchors in two places: FU-3 item 7's CVP fix on `link-r27`/`link-r36` (if FU-4 landed it) and 7b's pleural pressure if FU-4 makes it per side (audit G6). Re-anchor on FU-4's text by the rule below, record every re-anchoring in the gate note §8, and if FU-4 moved `lp.pPtx` to per-side values, read the global pleural pressure as the max over the sides in the three places V.1 reads it (Task 2 `lungStateEvent` `pleuralMmHg`, Task 2 `vent-reference.ts`, and the unchanged `respPleural`).
- **Parallel stages touch the same files.** Stage 7e has just merged: its E2 edits live in `packages/engine-core/src/l2/resp/pipeline.ts`, which Tasks 1 and 2 also edit. FU-3 (its E-FU3-9 edits `l2/lung/lung.ts` and `l2/lung/mix-o2.ts`, its E-FU3-10 `l2/resp/pipeline.ts`; its console rows name 7b's `lp.*`) and FU-4 (written from the integration audit: obstructive shock G6 — PE and tension-PTX condition unification, hemo pipeline) both merge before V.1 starts (R53). **Before every task:** `git fetch origin && git merge --no-edit origin/main`; **before the gate (Task 10) merge `origin/main` again** and keep both sides. `engine.ts` is not edited by this plan; the R51 §7 chain order (validate/apply device → pk (7g) → neuro (7f) → organs (7d) → blood (7c) → endo (7e) → Stage 3 → hemo; advance pk → resp/lung → blood → endo → organs → hemo) is untouched. If a find block no longer matches after a merge, locate the quoted line by its neighbouring comment and apply the same change; never re-type a line you are not changing; record the re-anchoring in the gate note.
- **Partition.** V.1 owns `packages/ventilator/**`, `apps/demo/src/vent/**`, `apps/demo/e2e/vent-link.e2e.ts`, `apps/demo/scripts/vent-shots.mjs`, `docs/physiology/stage-v-lung-pathology-data.md`, `docs/gates/stage-v1.md` + `docs/gates/stage-v1/**`. Named exceptions (each commit message names its exception): **E-V1-1** (Stage 3/7c: `l2/gas/params.ts` `coRefLpm`, the `rs.coRatio` line (with its CPR guard) and one import in `l2/resp/pipeline.ts`, one line and one import in `l2/blood/pipeline.ts` — the 7c `rest.coLp` line of R51 addendum 15 (5); the two Q-7e-8 `it.fails` in `test/engine/resp-oxygen.test.ts` and `test/engine/blood-stage3-recheck.test.ts`); **E-V1-2** (7b: `l2/lung/side.ts` `waterShunt`, `l2/lung/conditions.ts`, `l2/lung/lung.ts` `extraShuntAt`); **E-V1-3** (7b: `types-lung.ts` `pleuralCmH2O`, `l2/lung/state-event.ts`, `l2/lung/vent-reference.ts`, one argument in `l2/resp/pipeline.ts` `lungStateEvent`, a test in `test/engine/lung-state.test.ts`). New engine test files: `test/engine/resp-child-rest.test.ts`, `test/l2/lung/v1-lung-seams.test.ts`. New ventilator test files: `test/pleural.test.ts`, `test/catalogue-md.test.ts`; `packages/ventilator/tsconfig.json` gains `scripts` in its `include` (Task 9).
- **R45 (binding):** mechanisms, never looser bands. A target the mechanism cannot reach stays `it.fails` WITH the measured numbers in its title; no test is deleted or weakened (the one unit test of the retired `link/recruit.ts` goes with the code the ruling retires — Decision 8). Bands this plan changes are restorations to the authored clinical band (tension pneumothorax plateau and ΔP; its peak − plateau keeps 7b's widened lower bound 9.7) — never widenings.
- **R51 + addenda (binding):** the drug layer is 7g's — only 7g touches PK (`ps.pk`, the DrugBus); V.1 touches no drug code. Canonical cross-stage names: `blood.out.*`, `blood.core.*`, `organs.*`, `ps.neuro.*`; 7a's PCWP truth is the `pawp` StateVar (MODELED `values.pawp = hs.circOut.pPv`), which the link tests read as `hemo.circOut.pPv` because the link runs MANUAL (Decision 9). Chain order untouched.
- **CI rules (binding):** every test that advances more than ~1 sim-minute of engine work yields via `await new Promise((r) => setImmediate(r))` at least once per SIM-MINUTE (CI amendment 4 — a per-hour loop cost two CI runs; `run()` in `packages/ventilator/test/helpers.ts` and `test/helpers/resp.ts` already do this). Long horizons come from `packages/engine-core/test/helpers/longrun.ts` (`LONGRUN_HOURS` 24 locally / 6 on CI); this plan adds no multi-hour test and nothing to the SLOW set of `packages/engine-core/vite.config.ts` (`PME_TEST_SET`) — `resp-child-rest` (3 sim-min) and `v1-lung-seams` (pure) are fast-set files. The R36 catalogue sweep (`link-r36` "every catalogue row…", 39 rows × 60 sim-s) keeps its 900 s budget (measured 88 s locally). Tick-bench p50 < 6 ms on CI (the pleural term is two multiplications per 1.25 ms sub-step when `pleural > 0`). Heavy evidence e2e Chromium-only; PNGs/JPEGs ≤ 60 KB (`vent-shots.mjs` already steps the JPEG quality down to fit).
- **Process:** push after every task (`git push origin stage-v1-ventilator-followup`); **never `git stash`** (the stash list is shared across worktrees); scratch files only under `<scratchpad>/stage-v1-ventilator-followup/`; every background wait bounded (≤ 10 min per `until`/poll loop, then re-check the process); the executor opens the PR in Task 10 and **never merges it** (R21). Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (the executor's own model name is allowed, G7b). Every task's commit step that names only a message means: `git add -A && git commit -m "<message>" -m "Co-Authored-By: …" && git push origin stage-v1-ventilator-followup` (Task 1 Step 5 spells it out). The PR body ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- pnpm is not on PATH: `npx -y pnpm@9.15.9 …`. Unit tests: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run <path>`, `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run <path>`. `PRINT=1` makes the link tests print their numbers (`LINK …`, `R36 …` lines) for the gate note.
- Strict TS (`noUncheckedIndexedAccess`, `erasableSyntaxOnly`, `verbatimModuleSyntax`), `.ts` import extensions, conventional commits; every new constant cites its source or is `[ENG]` with the number it produces. All state stays plain JSON-safe data (`VentConfig.pleural` is a number; `LungParams.waterShunt` is a number). Determinism: no `Math.random`, no wall clock.

---
## Decisions this plan makes where the spec was silent, inconsistent or unreachable

1. **How the ventilator "sees" the pleural pressure — an opening pressure, not an offset.** A constant pressure added to the single compartment's recoil changes nothing in volume control once end-expiratory volume has re-equilibrated (plateau stays PEEP + VT/C), and adding it everywhere would count an effusion's or haemothorax's pressure twice (7b already encodes their volume loss in `crs`/`frc`). Mechanism: the lung stays open while the end-expiratory pleural pressure is below the alveolar pressure; with the pleural space above normal by `pleural` (cmH2O), end-expiratory Ppl = P_PL0 + pleural (7a's resting −4 mmHg, Smith 2004 = −5.44 cmH2O). When it exceeds PEEP, the ventilated lung is collapsed at end-expiration and each breath must first raise the alveolar pressure by E = pleural − 5.44 − PEEP before tidal volume enters — added to `recoilPressure` with the original simulator's own airway-closure opening shape (√(V/150 mL), v1.9's default recruited volume). No transmission constant is introduced: E follows from 7a's P_PL0 and the engine's pPtx. Consequences: tension 0.8 (pPtx 20 mmHg = 27.2 cmH2O) at PEEP 5 → E 16.8 → reference plateau **35.6** (band 25–50), ΔP **30.6** (20–45); effusion (1.5 cmH2O) and haemothorax (4.1) at their default severity 0.5 and PEEP ≥ 3 → E = 0 (unchanged); PEEP 15 lowers E by 10 (PEEP holds the lung open against the pleural pressure). **Condition (R50 review finding 6, [ENG], kept deliberately):** E > 0 for any pleural pressure above 5.44 + PEEP, whatever the cause — a haemothorax at severity 1 (3 L: pPtx 6 mmHg = 8.2 cmH2O, `lung-pathology.ts:496`) gives E = 2.76 cmH2O at ZEEP and 0.76 at PEEP 2, on top of 7b's volume-loss `crs`/`atel`. That is the same physics (a pleural space above the alveolar pressure closes the lung at end-expiration) and it is small; passing only gas-pneumothorax pressure would need a second pleural field for no clinical gain. `pleural.test.ts` pins both numbers; gate note §1 states the condition.
2. **The frame's alveolar pressure leaves the opening pressure out.** The engine already adds the pleural pressure to the heart (`respPleural`, max-combined with 7a's `ext.pPtx`); the Stage V frame's `palvCmH2O` feeds 7a's pleural input through T_IT·Palv, so it carries `Palv − E` (otherwise the tension pressure reaches the heart twice). **Small [ENG] residual (R50 review finding 6):** while the lung is collapsed at end-expiration, `P_PL0 + T_IT·PEEP` still reaches the heart (≈ 2.4 mmHg at PEEP 5), although a collapsed lung physically transmits no PEEP. Recorded, not modelled; gate note §9.
3. **The expiratory hold reads set PEEP in tension** (E(V = 0) = 0; the collapsed units are closed off from the airway): auto-PEEP ≈ 0 and ΔP = plateau − PEEP, as clinicians compute it. The catalogue's authored bands (plateau 25–50, ΔP 20–45) are restored; peak − plateau keeps 7b's widening to 9.7 (authored 10; R_insp 9.8 is the tube + airways — tension does not change airway resistance) — so the restoration is partial, stated as such in gate note §7, with a calibration row "tension peak − plateau: 7b's widened 9.7 vs authored 10".
4. **Absolute lungState uses R_exp too.** R_exp > 1.05·R_insp → v1.9's custom flow limitation, `eflK = R_insp/R_exp`, no PEEP stenting — exactly how the catalogue rows are already mapped, now one function (`lungMechanics`) for both. `autoPeepTendency` no longer switches the ventilator's flow limitation (it is the engine's measurement of trapping the ventilator itself causes — circular). COPD GOLD 3–4 at RR 20: auto-PEEP 7.80 → **7.72** (R46 band 6–12), MAP fall 7.4 → **11.2**.
5. **A page's lung patch holds only until the next lungState** (≤ 1 s): the engine owns the lung. The Hamilton drawer's compliance/resistance sliders — and, because every lungState also sets `efl`/`eflK`/`peepStent` (`lungMechanics`), the Expiratory Flow Limitation toggle and the PEEP Stenting slider — are disabled while linked (title "Linked: the patient monitor's lung (lungState)"); stand-alone they work as before. The drawer's `syncBase` comment is corrected (the drawer no longer sets a "lungState base" for C/R).
6. **Profiles carry `patient.lungConditions` from 7b's `VENT_ROW_MAP`** (condition, severity, side). The two severe-ARDS rows also carry `recruitFrac` 0.5 / 0.15 (catalogue §6: VENT_ROW_MAP carries the population mean; the rows are named for the recruiters) — a ventilator-side table, so 7b's data file is not edited. `normal` and `atelectasis` carry none (induction atelectasis is dynamic, VENT_ROW_MAP `null`).
7. **The 7a PE and tension-PTX conditions leave the profiles** (R41: stand-ins are deleted when the physiology lands). **Corrected (orchestrator ruling (V.1 review) 3, 2026-09-27):** the two PE conditions do NOT carry the same PVR. 7a's `pe` 0.75 is **PVR ×4.0** (`circ/conditions.ts`: `PE_MAX_FRAC` 0.8, `PE_VASO` 1.0 → φ 0.6, (1/0.4)·1.6; main's own `profiles.ts:50` comment "φ 0.6: PVR ×4"); the lung `pe` 1 uses the tables' vasoconstriction **peVaso 0.5 [ENG]** (tables:199–200, `lung-pathology.ts:514`) → **PVR ×3.25**, plus dead space and shunt. Sending both multiplied PVR by 4.0 × 3.25 ≈ **×13** (measured: pe-massive profile CO **1.19** L/min). The profile now sends only the lung `pe`: 7a still sees the PE afterload through 7b (`resp/pipeline.ts` → `circ-link.ts` `ext.pvrLung` → `circ/model.ts`), but the profile's PVR falls from ×4.0 to ×3.25 (−19 %) and its CO RISES 5.03 → 5.37 L/min — **the MANUAL massive-PE profile shows no obstructive picture at all.** V.1 does not tune this (R45): one PE event with ONE PVR multiplier and one peVaso value, reconciled with the tables, is FU-4 G6's (Requests); gate note §5 carries the profile's before/after PVR and CO. The lung `ptxTension` pPtx reaches 7a through `respPleural`. `CIRC_CONDITIONS['pe-massive']` stays exported ONLY for the R36 massive-PE test, whose rig (7a `pe` + lung `pe` + MANUAL shunt 0.12) NR-3 closed — it keeps both conditions until FU-4 G6 unifies the PE event, then V.1 re-measures it (Decision 21).
8. **`link/recruit.ts` and its unit test are deleted** (G7b ruling 4: "the interim link shunt/recruit retired"). The test exercised only the deleted curve; the behaviour it stood for is now asserted on the engine's own lungs: `link-core` (no profile ever sends a shunt target), the oedema test (lung-water shunt −33 % with PEEP), the ARDS `it.fails` (recruitment numbers in the title). CONFIRMED by the orchestrator (Decision 20: a test of deleted code is not a weakened band).
9. **Cardiogenic oedema: 7a `hfref` 0.67 on the profile (G7a NR-3), PCWP = 7a's pulmonary venous pressure.** The link runs MANUAL, where the `state` event's `pawp` is the instructor's L1 target; the modelled PCWP is `hemo.circOut.pPv` (what the wedge crossfade shows, `values.pawp` in MODELED). The re-specified test splits: shunt −33 % and PCWP 18.2 → 16.6 **pass** (the shunt fall follows from E-V1-2 by construction — 0.04 × 7 = 28 % of the water part — so it is labelled a mechanism check, not a clinical band); SpO2 ≥ +2 stays `it.fails` with the numbers (98 → 98, SaO2 98.4 → 98.8 at FiO2 0.4: the 7b oedema shunt 0.15 does not desaturate the patient, so there is no room to rise); the FiO2 0.21 variant of Decision 18 is `it.fails` too (SpO2 92.0 → 92.7). Both runs happen in a `beforeAll` so a crash fails the block instead of letting an `it.fails` pass silently. CO is no longer asserted (G7b ruling: PEEP need not lower CO in HFrEF; measured 5.23 → 5.14).
10. **E-V1-2: the lung-water shunt's PEEP response is the data's own rule.** `data/lung-pathology.ts` §13 says "lung-water shunt, PEEP ×(1 − 0.04·PEEP) main §4.5" and the band `peep5to15: 'up'`, but nothing implemented it — the interim link model stood in for it. The PEEP-responsive part (`waterShunt`) is the extra shunt of the rows the data mark "lung-water shunt" (`pulmOedema`, `aspiration`) plus 7c's lung water; it scales by (1 − 0.04·PEEP_total) (≥ 0) wherever the extra shunt is used (the O2 step and `shuntFraction`). The ILD, chest-wall, PE, CF and smoke extra shunts are not flooding and do not move. All 7b lung tests (26 files, incl. the 32-condition catalogue) pass unchanged.
11. **E-V1-1: the CO-ratio reference is the patient's own resting flow.** `rs.coRatio = CO / CO_REF_LPM` divided every patient's 7a cardiac output by the ADULT 5.25 L/min, while gas exchange multiplies it back by `CI_LPM_PER_KG × effKg`. The 16 kg child (7a CO ≈ 1.3 L/min) read coRatio 0.24 — a low-flow state: the capnogram was compressed ×0.42, the MANUAL EtCO2 calibration answered with 70 mL of extra dead space, and the child sat at PaCO2 94, SaO2 0.33–0.46 while the display read EtCO2 36. `coRefLpm(pat) = CI_LPM_PER_KG × effKg` equals 5.25 L/min at 70 kg and makes the gas-exchange flow equal 7a's CO for every size (before: CO × effKg/70 — the patient's weight counted twice, because 7a's CO already scales with the patient). **Bit-identical for effKg = 70 kg** (`0.075*70 === 5.25` in IEEE double; the 70 kg rigs: preoxygenated 485 s, room air 41 s, obese-rig desaturation 169 s — identical). **For other adults the gas-exchange flow is now 7a's CO (it was CO × effKg/70)**: effKg = IBW + 0.4·(w − IBW) (`gas/params.ts:96`), so the pregnancy profile (80 kg F, 165 cm, effKg ≈ 66.2) gets coRef 4.97 instead of 5.25 and the obese 127 kg rig (effKg ≈ 90) ≈ 6.8; for them coRatio, the gas-exchange Q, `siteDelay`, the low-flow factor (when < 1) and the diffusion `k` (when coRatio > 1) all move. The prototype's suites stayed green and the obese desaturation time rounds to the same 169 s, but these patients are NOT bit-identical: Task 10 re-runs FU-3's child and pregnancy validation documents and records the shift. **CPR guard (orchestrator ruling (V.1 review) 2):** `cardiacOutput` returns an ADULT-absolute CPR flow (`SV_REF_ML 70 × CPR_SV_FRAC 0.2 × q × rate`, `gas/coupling.ts:42`, ≈ 1.5 L/min at quality 1, 110/min), so during CPR the reference stays `CO_REF_LPM`: the 16 kg child in CPR keeps coRatio **0.293** (= the adult's 0.293, as before V.1) instead of **1.283** (measured in the V.1 review-fix prototype without the guard: a full-height, normal-flow capnogram during paediatric CPR). That CPR flow should scale with the patient is a FU-4 request. The 7c resting-CO line uses the same reference (its units stay consistent; it keeps the long form, which preserves bit-identity at 70 kg — R51 addendum 15 (5)). Diagnosis alternatives ruled out by measurement: dead space (35 mL = 2.2 mL/kg, correct) and VCO2 (the MANUAL calibration places PaCO2 whatever VCO2 is).
12. **The neonatal row** carries `neonatalRds` like every row, and the ventilator reads its absolute lungState (C 1, R 233 — 7b's adult-frame resistance scaled by 70/3). It is broken before and after V.1 (SpO2 44.5 → 43, MAP 23 → 33 at 90 s): the engine's neonatal frame is R22's (G7b ruling 1). Not fixed here; the R36 "starts cleanly" test passes. Listed as a **known deviation** in gate note §8, waiting for R22 (Decision 19).
13. **The combined page's PE demonstration was broken since 7a** (it sent `STAND_INS['pe-massive']`, emptied when 7a took PE over, plus a MANUAL shunt 0.12 — no PE at all). It now sends the lung `pe` 1: EtCO2 38 → 24.5 at unchanged ventilation, MAP −3.4 (MANUAL) — so its watch string no longer promises "BP ↓" (Decision 7: PE haemodynamics wait for FU-4 G6). The `hf` watch becomes "shunt/SpO2 ↑, PCWP ↓" (G7b rulings 4+5+13: the CO-fall band was wrong) and the `ph` watch loses its stale "when 7a lands". The tension demonstration sends `ptxSimple 0` + `ptxTension 0.8` (plateau 16 → 36, ABP 41/35, SpO2 89 on the page at ×4).
14. **The data-table generator gets a Vite SSR runner** (`scripts/catalogue-md.mjs`): since 7b the catalogue imports `@pme/engine-core`, whose skins JSON imports make the documented `node --experimental-strip-types` command fail on main (`ERR_IMPORT_ATTRIBUTE_MISSING`). The table gains three columns: the row's engine condition, its pleural pressure, and the ventilator's reference run on the generated numbers — and keeps every existing column, including "Auto-PEEP tend.", "Diffusion" and "HPV" (the first prototype had dropped those three; restored per orchestrator ruling (V.1 review) 5). The generator exports `renderCatalogueMd()`; `packages/ventilator/test/catalogue-md.test.ts` fails when the committed table differs from its output (CI guards the "generated copy" of G7b ruling 13), and `scripts` joins the ventilator `tsconfig.json` `include` so the generator is typechecked. The preamble names the regenerate command and says the shunt column is the PEEP-0 value (E-V1-2: cardiogenic oedema's 0.175 is 0.14 in the engine at the reference PEEP 5).
15. **The tension-pneumothorax PROFILE starts compensated** (MANUAL trackers fill the circulation against a pleural pressure present at t = 0: MAP 95, CVP 27 at 90 s) — exactly as before V.1 (MAP 94, CVP 28 with 7a's condition at t = 0.02 s). The acute R36 test (tension applied at 120 s) shows the obstructive shock (MAP 105 → 36). Reported for FU-4 (audit G1/G6), not changed here.

### Orchestrator rulings (V.1 review), 2026-09-27

Sources: `research/00-orchestrator-rulings.md` "V.1 rulings on the writer's questions" (rulings 1–8 and the FU-3 note) and "V.1 R50 review (2026-09-27 22:51): APPROVE WITH FIXES" (rulings 1–7); review `v1-review/review.md` (findings 1–9). Where the two entries differ, the later (R50 review) entry governs. Every item below is applied in the tasks; the plan's former "Open questions" are closed here.

16. **Orchestrator ruling (V.1 review), 2026-09-27 — tension Ppeak +21.6.** The reference Ppeak rises +21.6 over the normal row (45.4 vs 23.8), 1.6 above "Ppeak +10–20". The catalogue §16 "Airway pressure" row carries that band with an [ENG] tag (catalogue:482), but the main tables' H6 (`stage-7-parameter-tables.md:215`) quote the same "+10–20 cmH2O" as **[TXT]** ("[ENG] timing" only): the textbook number outranks the engineering tag, so the band binds. Task 5 adds an `it.fails` in `test/pleural.test.ts` with **21.6** (45.4 vs 23.8) in its title, and the calibration queue gets the row "tension Ppeak vs crs ×0.5": 7b's tension `crs ×0.5` was chosen (`lung-pathology.ts:473`) as a stand-in for this very Ppeak rise before the ventilator could see the pleural pressure, and it now partly overlaps the opening pressure E. Not tuned here (R45). Gate note §7 and §10.
17. **Orchestrator ruling (V.1 review), 2026-09-27 — ARDS link band.** The ARDS link test (+1.5 / 0.0 vs ≥ 5 / > 3) stays `it.fails` with its numbers in the title; the band was fitted to the retired interim curve. Calibration-queue row "ARDS link band: re-derive from 7b's recruitment" — starting point catalogue:226, high recruiter PEEP 5 → 15 shunt −30–50 % [P]. Not a widening.
18. **Orchestrator ruling (V.1 review), 2026-09-27 — oedema SpO2.** FiO2 0.4: `it.fails` (98 → 98). The FiO2 0.21 variant was added and **measured in the V.1 review-fix prototype**: SpO2 **92.0 → 92.7** (+0.7), true SaO2 92.97 → 93.28, lungState shunt 0.15 → 0.10, PCWP 18.2 → 16.5, CO 5.23 → 5.14. The mechanism moves in the right direction but does not reach +2, so under R45 the variant is an `it.fails` with those numbers in its title — not an ordinary test, and never a widened band. The magnitude (0.04/cmH2O [ENG], the oedema shunt size) goes to Ali's calibration queue. The page's `hf` demo stays at FiO2 0.4 (the review made FiO2 0.21 conditional on a visible rise). Gate note §3.
19. **Orchestrator ruling (V.1 review), 2026-09-27 — neonatal profile.** Broken before and after V.1; waits for R22's neonatal frame; a known deviation in gate note §8 (Decision 12).
20. **Orchestrator ruling (V.1 review), 2026-09-27 — `link/recruit.ts`'s unit test.** Deleting it with the retired code is CONFIRMED: a test of deleted code is not a weakened band (Decision 8).
21. **Orchestrator ruling (V.1 review), 2026-09-27 — the closed R36 massive-PE test** keeps both conditions (7a `pe` + lung `pe`) until FU-4 G6 unifies the PE event; then V.1 re-measures it. Because FU-4 lands before V.1 (R53), the executor checks at Task 0: if FU-4 has already changed that rig or the PE event, the test follows FU-4's version (FU-4 owns that edit; V.1 does not reopen NR-3) and Task 7 Step 2 re-measures and records it; otherwise it stays as it is.
22. **Orchestrator ruling (V.1 review), 2026-09-27 — PH crisis EtCO2 +5.0 on the ≥ 5 edge.** An ordinary test with the numbers in its title: Task 7 edits the `it('PH crisis: …')` line of `link-r36.test.ts` to "… (V.1 on the 7b `ph` lungs: +5.0 / +2.1 / −11.1; EtCO2 on the band edge, calibration row)"; calibration-queue row "PH crisis EtCO2 on the band edge (+5.0 vs ≥ 5)". If after a merge EtCO2 falls below +5, the test becomes `it.fails` with the new numbers in its title — never a widened band (R45).
23. **Orchestrator ruling (V.1 review), 2026-09-27 — the anaphylaxis stand-in stays.** 7e's circulation effects act only in MODELED (`l2/endo/adapters.ts:147`, `if (ctx.l1.mode === 'modeled' && ext)`) and the link runs MANUAL (Decision 9): replacing the MANUAL vasoplegia stand-in would remove the haemodynamics from the link profile. And 7e's `writeLung` (`adapters.ts:201`) strips every side-less `anaphylaxis` spec — including the profile's own `lungConditions` entry — when 7e's severity returns to 0. FU-4 request: "anaphylaxis in MANUAL link profiles; `writeLung` must not remove a profile-owned spec".
24. **Orchestrator ruling (V.1 review), 2026-09-27 — console units and labels go to FU-4.** 7x.1 already shipped inside FU-3 (item 12). FU-3's console row labels `lp.pPtx` cmH₂O, but the value is **mmHg** (data §16: 25 at severity 1); the unit fix and the new labels `lp.waterShunt` ("lung-water shunt, PEEP-responsive", fraction) and lungState `pleuralCmH2O` (cmH2O) are FU-4 housekeeping items (Requests).
25. **Orchestrator ruling (V.1 review), 2026-09-27 — E-V1-1 gets the CPR guard; non-70 kg adults shift.** `rs.coRatio = (cardiacOutput(h, t) / (h.cpr.active ? CO_REF_LPM : coRefLpm(rs.pat))) * …` (Task 1; the `CO_REF_LPM` import is kept). `resp-child-rest.test.ts` asserts that a 16 kg child in CPR (quality 1, 110/min) keeps coRatio 0.25–0.33 and equal to the adult's (measured 0.293 / 0.293; 1.283 without the guard). Decision 11 states honestly that adults whose effective weight is not 70 kg (pregnancy, obese rigs) shift. Task 0 and Task 10 run FU-3's validation documents for the non-70 kg patients (`s7-apnoea-child`, 4 y 16 kg; `t23-term-apnoea`, pregnancy 80 kg; `packages/validation/suites/sanity/sanity-docs.ts:91` and `:193` on `origin/fu-3-followups`) — FU-3 must have merged, which R53 guarantees.
26. **Orchestrator ruling (V.1 review), 2026-09-27 — PE text corrected** (Decision 7): ×4.0 (7a, `PE_VASO` 1.0) vs ×3.25 (tables/lung data, peVaso 0.5), both ≈ ×13; the massive-PE profile shows no obstructive picture (CO 5.37). Handed to FU-4 G6 (one PE event, one PVR source).
27. **Orchestrator ruling (V.1 review), 2026-09-27 — FU-4 before V.1.** Under R53 FU-4 lands first, so V.1 re-anchors on FU-4: FU-3 item-7 tests (`link-r27` ARDS/oedema, `link-r36` PH) if FU-4 landed that item, and per-side pleural pressure if FU-4 moves `lp.pPtx` (Global Constraints). The executor merges `origin/main` (with FU-3 and FU-4) before starting and re-verifies every find block (Task 0 Step 4).
28. **Orchestrator ruling (V.1 review), 2026-09-27 — Task 9's generator is guarded and complete.** `scripts` into the ventilator `tsconfig.json` `include`; `test/catalogue-md.test.ts` (CI) checks the committed table equals `renderCatalogueMd()`; the three dropped columns (Auto-PEEP tend., Diffusion, HPV) restored; `grep -c '^| '` = **40** (header + 39 rows; the `|---` separator does not match `'^| '`).
29. **Orchestrator ruling (V.1 review), 2026-09-27 — the lower findings.** Effusion/haemothorax pleural pressure at low PEEP stated and pinned (Decision 1); the T_IT·PEEP residual stated (Decision 2); the EFL toggle and the PEEP-stenting slider disabled while linked, the stale drawer comment corrected (Decision 5); stale watch strings fixed (Decision 13); "authored bands restored" says that peak − plateau keeps 7b's widened 9.7 (Decision 3), with a calibration row.
30. **Orchestrator ruling (V.1 review), 2026-09-27 — test mechanics (review finding 7) and executability (finding 9).** The oedema runs move into a `beforeAll` (a crash fails the block; an `it.fails` can no longer pass on a crash); the oedema shunt assertion is labelled a mechanism check of E-V1-2; Task 7 Step 2's log path, Task 10 Step 3's probe (path, run, columns) and the commit/push of every task are spelled out; E-V1-2's side effect (every ventilated MODELED patient with 7c lung water now gets the PEEP benefit — correct physiology) goes in gate note §9.

## Prototype results

Prototype: throwaway worktree `<scratchpad>/stage-v1/wt` at `origin/main` `a6a3575` (= `7a181b5` for every code file; only `docs/RESUME.md` differs), every block of Tasks 1–9 applied exactly as written below (the plan's per-task file states were regenerated from the prototype and re-applied to a clean `origin/main` export — identical, see Self-review); evidence patch `<scratchpad>/stage-v1/proto-v1.patch`. Seeds: every link rig seed 7 (`createLinkedSim` default); engine rigs seed 7 (`rig3`). Commands: `PRINT=1 npx vitest run` in `packages/ventilator`; `CI=1 npx vitest run` in `packages/engine-core` (fast + slow in one invocation); `PW_SYSTEM_CHROME=1 npx playwright test apps/demo/e2e/vent-link.e2e.ts`; `node apps/demo/scripts/vent-shots.mjs <dir>`. "Before" = `origin/main` with 7e (a6a3575) unless marked (a36f7a5 = main just before 7e merged).

**The tension pneumothorax (G7b ruling 5, calibration row "tension-ptx ventilator plateau (until V.1)")**

| | Before | After V.1 | Band |
|---|---|---|---|
| Catalogue reference run (C 35.4, R 10, VC 490 @ 60 L/min, PEEP 5, pmax 120) | plateau **18.8**, ΔP 13.8, auto-PEEP 0, peak − plateau 9.8 | plateau **35.6**, ΔP **30.6**, auto-PEEP 0.0, peak − plateau 9.8 | 25–50 / 20–45 / 0–1 / 9.7–18 (authored plateau/ΔP bands restored — were widened to 18.7 / 13.7; peak − plateau keeps 7b's 9.7, authored 10). Ppeak 45.4 vs normal 23.8 = +21.6 vs tables H6 +10–20 → `it.fails` (Decision 16) |
| Link profile `pneumothorax-tension` (pmax 60, 90 s) | plateau 18.9 (pmax 35 probe), lungState C 55 (relative) | plateau **36.0**, ΔP **31.0**, PIP 45.9, lungState C 35, `pleuralCmH2O` **27.2** | 25–50 / 20–45 |
| R36 acute: simple → tension at 120 s (before: C 18 patch + 7a tensionPtx + MANUAL shunt 0.3, a36f7a5) | plateau 15.9 → 32.8, SpO2 97 → 91, MAP 105 → 34.5, CVP 9.5 → 21.5 | plateau 16.1 → **36.1**, SpO2 97 → **88.2**, MAP 105.1 → **36.2**, CVP 9.5 → **20.7** | +≥ 10 and 25–50 / −≥ 4 / −≥ 20 / +≥ 5 |
| Effusion 1.5 L / haemothorax 1.5 L / simple PTX reference plateau | 15.8 / 15.8 / 15.8 | 15.8 / 15.8 / 15.8 (E = 0; `pleuralCmH2O` 1.5 / 4.1 / 0) | unchanged |
| Demo page, tension at ×4 (screenshot) | (compliance patch) | Ppeak 46, ABP 41/35 (37), CVP 20, SpO2 89, EtCO2 16 | — |

**The child rig (E-V1-1; 4 y, 16 kg, RR 24, VT 130, no height, room air, GA, MANUAL)**

| | Before | After |
|---|---|---|
| coRatio / low-flow factor | 0.23–0.25 / 0.42 | **0.96–0.99** / 0.99 |
| PaCO2 (Stage 3 fast compartment) at 30 / 60 / 120 / 180 s | 93.8 / 94.2 / 95.6 / 97.5 | **38.4 / 37.8 / 37.6 / 37.8** |
| True SaO2 at 30 / 60 / 120 / 180 s | 0.33 / 0.44 / 0.47 / 0.42 | **0.97 / 0.97 / 0.97 / 0.98** (mean 60–180 s 97.0, min 95.7) |
| MANUAL extra dead space | 70.1 mL | 36.6 mL |
| Preoxygenated child to SaO2 90 % (resp-oxygen 5b-child, blood-stage3-recheck) | 128 s (`it.fails`, Q-7e-8) | **155 s** (Patel 160 ± 31; band 130–190) — both `it.fails` now PASS |
| Adult preox / room air / obese 127 kg | 485 s / 41.0 s / 169 s | 485 s / 41.0 s / 169 s (70 kg rigs bit-identical; the obese rig's effKg ≈ 90 moves its gas-exchange flow, and its time rounds to the same 169 s — Decision 11) |
| The same child in CPR (VF, quality 1, 110/min, 60 s; review-fix prototype) | coRatio 0.293 (adult reference) | **0.293** with the CPR guard (= the adult's 0.293); **1.283** without it (Decision 25) |

**The link demonstrations (R27/R36, `PRINT=1`)**

| Test | Before (a6a3575) | After V.1 | Band | Result |
|---|---|---|---|---|
| PEEP 5 → 15 (normal) | CO 6.08 → 5.65, MAP −13.4, CVP +2.4 | CO 6.04 → 5.55 (−8 %), MAP −14.2, CVP +2.5 | CO −5…−15 %, MAP > 8, CVP 1.5–3.5 | pass |
| FiO2 0.4 → 1.0 (ARDS moderate) | SpO2 91 → 97 | 92 → 98 (+6) | ≥ 4 | pass |
| RR 14 → 22 | EtCO2 39 → 35 → 32 | 39 → 35 → 32 | ≥ 2, keeps falling | pass |
| COPD GOLD 3–4, RR 10 → 20 → 10 | auto-PEEP 7.80, MAP 102.2 → 94.8 | auto-PEEP **7.72**, MAP 102.5 → 91.3 → 102.5 | 6–12, > 3, back > +2 | pass |
| ARDS moderate PEEP 5 → 15 → 5 (FiO2 0.6) | SpO2 93 → 98 → 95 (−3.0: `it.fails`) | SpO2 94.5 → **96.0** → **96.0** | +≥ 5, then −> 3 | `it.fails` (numbers in title) |
| Cardiogenic oedema PEEP 5 → 12 | SpO2 95.8 → 98 (interim shunt), CO 4.65 → 4.66 (`it.fails`) | shunt **0.15 → 0.10**, PCWP **18.2 → 16.6**, SpO2 98 → 98 (SaO2 98.4 → 98.8), CO 5.23 → 5.14 | shunt −≥ 25 % (mechanism check), PCWP falls; SpO2 +≥ 2 | pass; SpO2 `it.fails` |
| Cardiogenic oedema PEEP 5 → 12 at FiO2 0.21 (new, Decision 18; review-fix prototype) | — | SpO2 **92.0 → 92.7**, SaO2 92.97 → 93.28, shunt 0.15 → 0.10, PCWP 18.2 → 16.5, CO 5.23 → 5.14 | SpO2 +≥ 2 | `it.fails` (numbers in title) |
| Disconnection | alarm +0.94 s, EtCO2 0 | identical | ≤ 4.8 s, 0 | pass |
| PH crisis (PEEP 15 + RR 8) | EtCO2 +6.8, CVP +2.2, MAP −12.5 | EtCO2 **+5.0**, CVP +2.1, MAP −11.1 | ≥ 5 / ≥ 1.5 / ≥ 8 | pass (EtCO2 at the edge: numbers in the title + calibration row — Decision 22) |
| Massive PE (R36 rig unchanged, NR-3 closed) | EtCO2 38.0 → 24.6, plateau ±0.2 | 38.3 → 24.6, plateau ±0.05 | ≥ 4, < 0.5 | pass |
| Fibrosis ΔP at VT 490 → VT 350 × 20 | 15.2 → 10.7 | 15.6 → 11.0 | ≥ 15, < 13 | pass |
| Every row starts cleanly (39 × 60 s) | 190 s (loaded machine) | 88 s | 900 s budget | pass |
| vent-link e2e (Hamilton page; linked page + COPD demo) | 2 passed | 2 passed (1.1 min) | — | pass |

**Per-profile lungState (90 s, default settings; before = relative read, the engine had no conditions)** — lungState compliance before was 55 in every adult row; after it is the condition's own: bronchospasm C 55 R 28/43, COPD 3–4 71 / 30/49, ARDS mild/moderate/severe 40/35/31 with shunt 0.23/0.31/0.39 (severe non-recruitable 0.42), fibrosis 32, obesity 33, tension 35 (+ pleural 27.2), OLV 34, endobronchial 34, pregnancy 35. SpO2 moves to the lungs' own: endobronchial 98.5 → 91.3 (7b band 85–93 at 5–10 min), OLV 92.0 → 89.3, COPD 3–4 97.0 → 91.5, ARDS moderate 90.6 → 92.0, oedema 94.4 → 96.5, pe-massive profile EtCO2 36.4 → 39.0 at 90 s (the MANUAL EtCO2 calibration absorbs a dead space present at t = 0; the acute test shows the fall) with CO 5.03 → 5.37 (lung `pe` alone: PVR ×4.0 → ×3.25, so the MANUAL profile shows no obstructive picture — handed to FU-4 G6; 1.19 when both PE conditions were sent, ≈ ×13 — Decision 7). Full table in the gate note (Task 10 re-measures it).

**Suites on the prototype:** engine-core `CI=1` 278 files, **1230 passed**, 1 skipped, 0 errors (fast + slow in one parallel invocation; the first run on a loaded machine timed out three unrelated files at their budgets — each passes alone); ventilator 15 files / **91** passed (88 before: −3 relative/recruit unit tests, +2 absolute, +2 pleural, +1 oedema, +1 tension profile); demo 116; controller 203; renderer 71; validation 94 (+7 skipped); whole-repo `typecheck` clean; vent-link e2e 2 passed; `vent-shots.mjs` 9 JPEGs, each ≤ 58.4 KB.

**Review-fix prototype (2026-09-27, after the orchestrator's V.1 rulings):** THIS plan applied mechanically in task order to a detached worktree at `origin/main` `5b56a5c` (68/68 find blocks unique when applied), the table regenerated with the Task 9 command. Whole-repo `typecheck` clean (the ventilator typecheck now covers `scripts/`). Engine-core `resp-child-rest` 3 + `resp-oxygen` 8 + `blood-stage3-recheck` 3 = 14 passed (`CHILD SaO2 … mean 97.03, min 95.68; PaCO2 37.8`, `CPR coRatio child 0.293, adult 0.293` — 1.283 for the child with the guard removed, `RECHECK child 155.0 s`). Ventilator **16 files / 94 passed** (91 + the FiO2 0.21 oedema `it.fails`, the tension Ppeak `it.fails` — `R36 tension Ppeak rise 21.6 (45.4 vs 23.8)` — and `catalogue-md.test.ts`), 115 s wall with the 39-row sweep at 79 s; PH crisis EtCO2 39.0 → 44.0 (+5.0), CVP +2.1, MAP −11.1; oedema FiO2 0.4 SpO2 98.00 → 98.00, FiO2 0.21 92.00 → 92.71. Demo 116 passed. The Task 0/10 validation-document runs and the e2e were not re-run by the fixer.

## Requests to other stages

R53 orders the stages FU-3 → FU-4 → V.1 → 8b, so FU-3 and FU-4 have merged when V.1 starts: the FU-4 items below are requests for FU-4's plan/executor (or, if FU-4 has already gated, for the orchestrator's next follow-up), and V.1 adapts to whatever FU-4 landed (Global Constraints, Task 0 Step 4).

- **FU-4 (integration polish, R53; audit G6 "PE needs two commands, two tension-PTX models disagree").**
  - **One PE event, ONE PVR source (Decision 7, orchestrator ruling (V.1 review) 3).** Today 7a's `pe` 0.75 is PVR ×4.0 (`PE_VASO` 1.0) and the lung `pe` 1 is ×3.25 (the tables' peVaso 0.5 [ENG]); both together ≈ ×13 (CO 1.19), the lung `pe` alone leaves the MANUAL massive-PE profile at CO 5.37 with no obstructive picture. One PE event must give one PVR multiplier with one peVaso value, reconciled with the tables. V.1's profiles already send ONE event per disease (the lung condition). If FU-4 makes 7a's `pe`/`tensionPtx` aliases of the lung conditions (7a's command → the lung condition, the lung the only PVR source), V.1 stays correct. If FU-4 instead makes the lung `pe` ALSO write 7a's `ext.pvr`, the V.1 profile gets ×13 again — FU-4 must keep a single PVR source. The closed R36 massive-PE rig (7a `pe` + lung `pe`) keeps both conditions until FU-4 unifies the event, then V.1 re-measures it (Decision 21).
  - **Pleural pressure shape.** The audit proposes 7b's per-SIDE pPtx. V.1 reads the global `lp.pPtx` in three places: `lungStateEvent` via `pleuralMmHg` (Task 2), `vent-reference.ts` (Task 2) and `respPleural`. Keep a global `lp.pPtx` (max over the sides) or update those three lines. If FU-4 lands a per-breath tension build-up, the ventilator follows it through `lungState.pleuralCmH2O` (≤ 1 s).
  - **FU-3 item 7 (if FU-4 lands it).** FU-3's gate note §6 item 1 left the `MANUAL_CVP_PAW_FRACTION` fix and the "R36 PH crisis" re-derivation open. If FU-4 lands them, V.1's Task 7 blocks on `link-r27` (ARDS/oedema) and `link-r36` (PH) are re-anchored per the Global Constraints rule and PH crisis is re-measured (Decision 22; FU-3's own measurement was +3.8 — below the band, which would make the PH test an `it.fails` with numbers).
  - **Anaphylaxis in MANUAL link profiles (Decision 23).** 7e's anaphylaxis acts on the circulation only in MODELED (`adapters.ts:147`), and its `writeLung` (`adapters.ts:201`) removes side-less `anaphylaxis` specs including a profile-owned one: "anaphylaxis in MANUAL link profiles; `writeLung` must not remove a profile-owned spec". Until then the R41 vasoplegia stand-in stays.
  - **CPR flow should scale with the patient (Decision 25).** `cardiacOutput` returns an adult-absolute CPR flow (`gas/coupling.ts:42`); V.1 keeps the adult reference during CPR so a child's ratio does not change, but the flow itself should scale.
  - **Console housekeeping (Decision 24).** FU-3's physiology-console row `['lp.pPtx', 'Pneumothorax pressure', 'cmH₂O', 1]` labels 7b's `lp.pPtx`, which is **mmHg** (data §16: 25 at severity 1) — the unit should read mmHg. Label V.1's new fields: 7b's `lp.waterShunt` ("lung-water shunt, PEEP-responsive", fraction) and the lungState `pleuralCmH2O` (cmH2O).
  - V.1's executor re-measures the tension and PE numbers after FU-4 and records any change (Task 7 Step 2, Task 10).
- **8b (release, IIFE + ventilator-sim embed, TypeDoc).** `@pme/ventilator`'s public API changes: `LinkProfile` loses `recruit`, `shunt` and `condition` (the lung is `patient.lungConditions`); `LungLink.ref` → `LungLink.last`; `createRecruit`/`stepRecruit`/`recruitTarget`/`shuntOf`/`RecruitParams`/`recruitOf` are removed; new `lungMechanics`, `lungConditionsOf`, `pleuralOpening`, `PPL_REST_CMH2O`, `PLEURAL_OPEN_ML`, `VentConfig.pleural`, `LungPathology.pleuralCmH2O`. 8b's embed and docs use these names.
- **Calibration queue (Ali, R44):** close "tension-ptx ventilator plateau (until V.1)" with the numbers above; add the rows "tension Ppeak vs crs ×0.5" (+21.6 vs +10–20, Decision 16), "tension peak − plateau: 7b's widened 9.7 vs authored 10" (Decision 3), "ARDS link band: re-derive from 7b's recruitment" (catalogue:226 [P] high recruiter shunt −30–50 %, Decision 17), "cardiogenic-oedema PEEP response: 0.04/cmH2O [ENG] and the oedema shunt size" (SpO2 +0.0 at FiO2 0.4, +0.7 at FiO2 0.21, Decision 18), "PH crisis EtCO2 on the band edge (+5.0 vs ≥ 5)" (Decision 22).

## Architecture in one page

```
engine-core (exceptions)                                    ventilator (owned)
─────────────────────────                                   ──────────────────
gas/params.ts   coRefLpm(pat) = 0.075·effKg  (E-V1-1)       link/profiles.ts  patient.lungConditions ← VENT_ROW_MAP (+ recruitFrac)
resp/pipeline   coRatio = CO / coRefLpm(pat)  (CO_REF_LPM in CPR)         no shunt/recruit, no 7a PE/tension condition
blood/pipeline  rest.coLp in the same units                  link/core.ts      first tick: stand-ins only; then frames
lung/conditions waterShunt (pulmOedema, aspiration, 7c water)
lung/lung.ts    extraShuntAt(lp, peepTot)       (E-V1-2)     lung-input.ts     applyLungState: ABSOLUTE via lungMechanics()
lung/state-event lungState.pleuralCmH2O ─────────(E-V1-3)──▶                   C, R_insp, R_exp → eflK, pleural, effort
   = max(lp.pPtx, 7a ext.pPtx) / 0.7356                      pathology/*       rows: generated C/R/shunt/VD + pleural (ventReference)
lung/vent-reference  pleuralCmH2O                                              mechanicsToVent = lungMechanics(row)
                                                             mechanics.ts      recoil += E·√(V/150), E = pleural − 5.44 − PEEP
respPleural (7b/7a, unchanged): heart sees pPtx ◀── frame.palv = Palv − E (no double count)
apps/demo/src/vent: demos send lungCondition events; Hamilton drawer C/R disabled while linked
docs/physiology/stage-v-lung-pathology-data.md ← node packages/ventilator/scripts/catalogue-md.mjs  (test/catalogue-md.test.ts: committed = generated)
```

## File map

| File | Task | Change |
|---|---|---|
| `packages/engine-core/src/l2/gas/params.ts` | 1 | `coRefLpm()` (E-V1-1) |
| `packages/engine-core/src/l2/resp/pipeline.ts` | 1, 2 | coRatio reference (E-V1-1); `pleuralMmHg` into `lungStatePayload` (E-V1-3) |
| `packages/engine-core/src/l2/blood/pipeline.ts` | 1 | resting-CO reference (E-V1-1) |
| `packages/engine-core/test/engine/resp-child-rest.test.ts` | 1 | new (incl. the CPR-guard test) |
| `packages/engine-core/test/engine/resp-oxygen.test.ts`, `blood-stage3-recheck.test.ts` | 1 | Q-7e-8 `it.fails` → `it` (155 s) |
| `packages/engine-core/src/types-lung.ts`, `l2/lung/state-event.ts`, `l2/lung/vent-reference.ts` | 2 | `pleuralCmH2O` (E-V1-3) |
| `packages/engine-core/test/engine/lung-state.test.ts` | 2 | + pleural test |
| `packages/engine-core/test/l2/lung/v1-lung-seams.test.ts` | 2, 3 | new |
| `packages/engine-core/src/l2/lung/side.ts`, `conditions.ts`, `lung.ts` | 3 | `waterShunt`, `extraShuntAt` (E-V1-2) |
| `packages/ventilator/src/types.ts`, `presets.ts`, `mechanics.ts`, `frame.ts` | 4 | `pleural`, `pleuralOpening`, frame Palv |
| `packages/ventilator/test/pleural.test.ts` | 4, 5 | new; Task 5 adds the tension Ppeak `it.fails` (Decision 16) |
| `packages/ventilator/src/lung-input.ts` | 5 | rewritten: absolute, `lungMechanics` |
| `packages/ventilator/src/pathology/mechanics.ts` | 5, 6 | `mechanicsToVent` via `lungMechanics`; `recruitOf` removed |
| `packages/ventilator/src/pathology/catalogue.ts` | 5 | `pleuralCmH2O`, engine-now wiring, tension bands restored |
| `packages/ventilator/test/lung-recruit.test.ts` → `lung-input.test.ts` | 5 | renamed, rewritten |
| `packages/ventilator/test/ports.test.ts`, `pathology-consistency.test.ts` | 5 | `last`; pleural consistency |
| `packages/ventilator/src/link/profiles.ts`, `link/core.ts`, `index.ts` | 6 | lungConditions, hfref, retirements |
| `packages/ventilator/src/link/recruit.ts` | 6 | deleted |
| `packages/ventilator/test/link-core.test.ts` | 6 | re-specified |
| `packages/ventilator/test/helpers.ts`, `link-r36.test.ts`, `link-r27.test.ts` | 7 | tension, PH title, oedema (FiO2 0.4 + 0.21, `beforeAll`), ARDS title |
| `apps/demo/src/vent/demos.ts`, `link-page.ts`, `hamilton-ui.ts`, `apps/demo/e2e/vent-link.e2e.ts`, `apps/demo/scripts/vent-shots.mjs` | 8 | demos, drawer, e2e hook, shots dir |
| `packages/ventilator/scripts/catalogue-md.ts`, `catalogue-md.mjs`, `docs/physiology/stage-v-lung-pathology-data.md` | 9 | generator + regenerated table |
| `packages/ventilator/tsconfig.json`, `packages/ventilator/test/catalogue-md.test.ts` | 9 | `scripts` typechecked; committed table = generator output (CI) |
| `docs/gates/stage-v1.md`, `docs/gates/stage-v1/*.jpg` | 10 | gate note, screenshots |

---

## Task 0: Worktree, branch, plan, baseline numbers

- [ ] **Step 1: Create the worktree and branch**

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin
git worktree add ../scratch/wt-stage-v1 -b stage-v1-ventilator-followup origin/main
cd ../scratch/wt-stage-v1 && npx -y pnpm@9.15.9 install
mkdir -p "<scratchpad>/stage-v1-ventilator-followup"
```

- [ ] **Step 2: Commit this plan into the branch** — copy `docs/plans/stage-v1-ventilator-followup.md` (untracked on main) into the worktree's `docs/plans/`, `git add` it, commit `docs(v1): Stage V.1 plan` and push.

- [ ] **Step 3: Record the baseline** (numbers for the gate note's "before" column; nothing is asserted):

```bash
cd packages/ventilator && PRINT=1 npx vitest run > "<scratchpad>/stage-v1-ventilator-followup/base-vent.log" 2>&1; grep -E '^LINK|^R36' "<scratchpad>/stage-v1-ventilator-followup/base-vent.log"
```

Expected (origin/main a6a3575 = 7a181b5): 14 files, 88 passed; `R36 ptx tension` plateau 32.8 (compliance patch), `LINK hf peep12` CO 4.66. FU-3 and FU-4 will have merged (R53), so numbers may differ — record them as the "before".

Also record the "before" of FU-3's validation documents for the patients whose effective weight is not 70 kg (Decision 25: E-V1-1 shifts them) — `s7-apnoea-child` (4 y, 16 kg) and `t23-term-apnoea` (pregnancy, 80 kg F 165 cm), defined in `packages/validation/suites/sanity/sanity-docs.ts` (FU-3; `:91` and `:193` on `origin/fu-3-followups`). The sanity suite runs every sanity document (from the worktree root; bounded wait ≤ 10 min per poll; it exits 1 on any red row, which is not an error here):

```bash
npx -y pnpm@9.15.9 validate --suites sanity --out "<scratchpad>/stage-v1-ventilator-followup/validate-base" > "<scratchpad>/stage-v1-ventilator-followup/validate-base.log" 2>&1
grep -E 's7-apnoea-child|t23-term-apnoea' "<scratchpad>/stage-v1-ventilator-followup/validate-base/report.md"
```

- [ ] **Step 4: Re-verify the find blocks on the merged tree (orchestrator ruling (V.1 review) 4)** — `origin/main` now carries FU-3 and FU-4. Write a throwaway checker under `<scratchpad>/stage-v1-ventilator-followup/` (never committed) that parses this plan's `In \`<path>\`, find:` / `replace with:` blocks, `Create` / `Replace the whole of` blocks and the `git mv`/`git rm` lines, applies them in task order to a scratch copy of the worktree (`git worktree add --detach <scratchpad>/stage-v1-ventilator-followup/check origin/main`, removed afterwards with `git worktree remove --force`), and prints, for every find block, how many times its text occurs at the moment it is applied. Every count must be 1. For each block that is not 1: locate the quoted line by its neighbouring comment on FU-4's text, write down the adjusted anchor, and apply that when the task comes (Global Constraints re-anchoring rule); list them for the gate note §8. Also check: (a) has FU-4 changed `lp.pPtx` to per-side values? If so, Task 2's two reads use the max over the sides (Global Constraints); (b) has FU-4 changed the R36 massive-PE rig or the PE event (Decision 21)? If so, Task 7 follows FU-4's version and re-measures it; (c) has FU-4 landed FU-3 item 7 (`link-r27`/`link-r36` CVP fix)? If so, re-anchor Task 7's blocks on FU-4's titles.

## Task 1: E-V1-1 — the child's resting gases (the CO-ratio reference is the patient's own)

**Goal:** the Stage 3 child rests at PaCO2 35–42 and SaO2 ≥ 96 % on room air; every 70 kg adult number is unchanged (other adult weights shift — Decision 11); CPR keeps the adult reference (Decision 25); the two Q-7e-8 `it.fails` start passing and become normal tests.

- [ ] **Step 1: Write the failing tests**

Create `packages/engine-core/test/engine/resp-child-rest.test.ts`:

```ts
// Stage V.1 (E-V1-1; orchestrator ruling on G7e question 3, Q-7e-8): the Stage 3 child rig (4 y, 16 kg, RR 24, VT 130,
// no height) rests at normal gases. The CO-ratio reference was the ADULT 5.25 L/min, so the child's own resting CO
// (≈ 1.3 L/min from 7a) read as a low-flow state (coRatio 0.24): the capnogram was compressed ×0.42, the MANUAL EtCO2
// calibration answered by adding 70 mL of dead space, and the child sat at PaCO2 94 and SaO2 0.33–0.46 on room air
// while the display read EtCO2 36. Expected for that child: PaCO2 35–42 (brief §4.4) and SaO2 ≥ 0.96 at rest.
// During CPR the reference stays the adult CO_REF_LPM: cardiacOutput() returns an ADULT-absolute compression flow
// (orchestrator ruling (V.1 review) 2; without the guard the child in CPR read coRatio 1.28, a normal-flow capnogram).
import { describe, expect, it } from 'vitest';
import { CO_REF_LPM, coRefLpm, gasPatient } from '../../src/l2/gas/params.ts';
import { respOf } from '../helpers/lung.ts';
import { ADULT, cmd, ev3, rig3, run, stateSeries } from '../helpers/resp.ts';

const CHILD = { ageY: 4, weightKg: 16, baseline: { rr: 24, vt: 130 } };

describe('E-V1-1: the CO-ratio reference is the patient\'s own resting flow', { timeout: 300_000 }, () => {
  it('70 kg adult: 5.25 L/min exactly as before (Stage 3 unchanged); 16 kg child: 1.2 L/min', () => {
    expect(coRefLpm(gasPatient(ADULT))).toBeCloseTo(CO_REF_LPM, 9);
    expect(coRefLpm(gasPatient(CHILD))).toBeCloseTo(1.2, 9);
  });
  it('the Stage 3 child at rest on room air under GA: coRatio 0.9–1.2, PaCO2 35–42, true SaO2 ≥ 96 % (mean, 60–180 s)', async () => {
    const { e, ev } = rig3({ patient: CHILD });
    e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
    for (const t of [60, 120, 180]) {
      await run(e, t);
      const rs = respOf(e);
      expect(rs.coRatio, `coRatio at ${t} s`).toBeGreaterThan(0.9);
      expect(rs.coRatio).toBeLessThan(1.2);
      expect(rs.co2.pf, `PaCO2 at ${t} s`).toBeGreaterThanOrEqual(35);
      expect(rs.co2.pf).toBeLessThanOrEqual(42);
    }
    const sa = stateSeries(ev, 'spo2', 60, 180).map(([, v]) => v);
    console.log(`CHILD SaO2 60–180 s: mean ${(sa.reduce((a, b) => a + b, 0) / sa.length).toFixed(2)}, min ${Math.min(...sa).toFixed(2)}; PaCO2 ${respOf(e).co2.pf.toFixed(1)}`);
    expect(sa.reduce((a, b) => a + b, 0) / sa.length).toBeGreaterThanOrEqual(96); // the resting value (the 1 Hz truth ripples ±1 with the breaths)
    expect(Math.min(...sa)).toBeGreaterThan(94);
  });
  it('CPR keeps the adult reference (cardiacOutput returns an adult-absolute compression flow, SV_REF 70 mL × CPR_SV_FRAC): a 16 kg child in CPR (quality 1, 110/min) keeps coRatio ≈ 0.29 as before V.1 — not 1.28', async () => {
    const cpr = async (patient: typeof CHILD | typeof ADULT) => {
      const { e } = rig3({ patient });
      await run(e, 30);
      e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' }));
      e.dispatch(ev3({ kind: 'cpr', active: true, rate: 110, quality: 1 }));
      await run(e, 60);
      return respOf(e).coRatio;
    };
    const child = await cpr(CHILD);
    const adult = await cpr(ADULT);
    console.log(`CPR coRatio child ${child.toFixed(3)}, adult ${adult.toFixed(3)}`);
    expect(child).toBeGreaterThan(0.25);
    expect(child).toBeLessThan(0.33);
    expect(child).toBeCloseTo(adult, 2);
  });
});
```

In `packages/engine-core/test/engine/resp-oxygen.test.ts`, find:

```ts
    expect(obese).toBeLessThanOrEqual(3.7);
  });

  // Stage 7e (E-7e-5, R45, Q-7e-8): the child assertion of 5b moved to its own expected failure. With 7e the child
  // desaturates 2 s earlier (130 s on main): 7e's heat model cools this child ~0.03 °C less in the first minutes
  // (≈ 1 s via tempFactor) and its catecholamine drive acts on this rig's resting hypercapnia (PaCO2 94 at FiO2 0.21,
  // present on main) (≈ 1 s). Band unchanged; calibration item.
  it.fails('5b-child. children 2–5 y 160 ± 30 s: measured 128 s vs 130–190 with Stage 7e (Q-7e-8; 130 s on main)', async () => {
    const child = await desatTime({ ageY: 4, weightKg: 16, baseline: { rr: 24, vt: 130 } }, true);
    expect(child).toBeGreaterThanOrEqual(130);
    expect(child).toBeLessThanOrEqual(190);
```

replace with:

```ts
    expect(obese).toBeLessThanOrEqual(3.7);
  });

  // Stage 7e (E-7e-5, R45, Q-7e-8) had moved the child assertion of 5b to an expected failure (128 s): this rig's child
  // sat at rest at PaCO2 94 and SaO2 0.36 on room air because the CO-ratio reference was the adult 5.25 L/min. Stage V.1
  // (E-V1-1, resp-child-rest.test.ts): the reference is the patient's own resting flow; the child rests at PaCO2 ≈ 38 and
  // desaturates at 155 s (Patel 160 ± 31). Band unchanged.
  it('5b-child. children 2–5 y 160 ± 30 s (155 s with E-V1-1; 128 s on the adult CO reference, Q-7e-8)', async () => {
    const child = await desatTime({ ageY: 4, weightKg: 16, baseline: { rr: 24, vt: 130 } }, true);
    expect(child).toBeGreaterThanOrEqual(130);
    expect(child).toBeLessThanOrEqual(190);
```

In `packages/engine-core/test/engine/blood-stage3-recheck.test.ts`, find:

```ts
    expect(obese / 60).toBeGreaterThanOrEqual(1.7);
    expect(obese / 60).toBeLessThanOrEqual(3.7);
  });
  // Stage 7e (E-7e-5, R45, Q-7e-8): the child assertion moved to its own expected failure (see resp-oxygen 5b-child).
  it.fails('desaturation, child 2–5 y 160 ± 30 s: measured 128 s vs 130–190 with Stage 7e (Q-7e-8; 130 s on main)', async () => {
    const child = await desatTime({ ageY: 4, weightKg: 16, baseline: { rr: 24, vt: 130 } }, true);
    console.log(`RECHECK child ${child.toFixed(1)} s`);
    expect(child).toBeGreaterThanOrEqual(130);
```

replace with:

```ts
    expect(obese / 60).toBeGreaterThanOrEqual(1.7);
    expect(obese / 60).toBeLessThanOrEqual(3.7);
  });
  // Stage 7e (E-7e-5, R45, Q-7e-8) had moved the child assertion to an expected failure (128 s); Stage V.1 (E-V1-1) fixed
  // the child's resting gases (adult CO reference → the patient's own): 155 s (see resp-oxygen 5b-child).
  it('desaturation, child 2–5 y 160 ± 30 s (155 s with E-V1-1; 128 s on the adult CO reference, Q-7e-8)', async () => {
    const child = await desatTime({ ageY: 4, weightKg: 16, baseline: { rr: 24, vt: 130 } }, true);
    console.log(`RECHECK child ${child.toFixed(1)} s`);
    expect(child).toBeGreaterThanOrEqual(130);
```


- [ ] **Step 2: Run the new test to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/resp-child-rest.test.ts`
Expected: FAIL — `coRefLpm` is not exported (then, with only the export, coRatio 0.24 and PaCO2 94).

- [ ] **Step 3: Implement**

In `packages/engine-core/src/l2/gas/params.ts`, find:

```ts
export const BLOOD_VENOUS_FRACTION = 0.75; // venous share of blood volume, the O2 buffer [ENG]
export const CO_REF_LPM = 5.25; // Stage 2's SV_REF 70 mL × 75 bpm: CO ratio reference [ENG]
export const CI_LPM_PER_KG = 0.075; // Q for gas exchange = CO ratio × 0.075 L/min/kg × effective weight [ENG]

export type AgeBand = 'neonate' | 'infant' | 'child' | 'adult' | 'elderly';
export function ageBand(ageY: number): AgeBand {
```

replace with:

```ts
export const BLOOD_VENOUS_FRACTION = 0.75; // venous share of blood volume, the O2 buffer [ENG]
export const CO_REF_LPM = 5.25; // Stage 2's SV_REF 70 mL × 75 bpm: CO ratio reference [ENG]
export const CI_LPM_PER_KG = 0.075; // Q for gas exchange = CO ratio × 0.075 L/min/kg × effective weight [ENG]
/**
 * Stage V.1 (E-V1-1): the CO-ratio reference is the PATIENT's own resting flow, CI_LPM_PER_KG × effective weight
 * (= CO_REF_LPM 5.25 at 70 kg). Dividing a 16 kg child's 1.3 L/min by the adult 5.25 read as a low-flow state.
 */
export function coRefLpm(p: { effKg: number }): number {
  return CI_LPM_PER_KG * p.effKg;
}

export type AgeBand = 'neonate' | 'infant' | 'child' | 'adult' | 'elderly';
export function ageBand(ageY: number): AgeBand {
```

In `packages/engine-core/src/l2/resp/pipeline.ts`, find:

```ts
import { createDelay, delayStep, siteDelay, type DelayLine } from '../gas/delay.ts';
import { o2Steady, solveShunt, type O2Inputs, type O2State } from '../gas/o2.ts';
import { pulseOxApparent, type OdcCtx } from '../blood/odc.ts'; // Stage 7c
import { apparatusDeadSpaceMl, CI_LPM_PER_KG, CO_REF_LPM, GA_METABOLIC, GAS_DT_S, gasPatient, PA_ET_GRADIENT, tempFactor, type GasPatient } from '../gas/params.ts';
import type { HemoState, RhythmView } from '../hemo/pipeline.ts';
import { createTemp, setCoreTarget, stepTemp, type TempState } from '../temp/temp.ts';
import { thermalMetabolic } from '../thermal/metabolic.ts'; // Stage 7e
```

replace with:

```ts
import { createDelay, delayStep, siteDelay, type DelayLine } from '../gas/delay.ts';
import { o2Steady, solveShunt, type O2Inputs, type O2State } from '../gas/o2.ts';
import { pulseOxApparent, type OdcCtx } from '../blood/odc.ts'; // Stage 7c
import { apparatusDeadSpaceMl, CI_LPM_PER_KG, CO_REF_LPM, coRefLpm, GA_METABOLIC, GAS_DT_S, gasPatient, PA_ET_GRADIENT, tempFactor, type GasPatient } from '../gas/params.ts';
import type { HemoState, RhythmView } from '../hemo/pipeline.ts';
import { createTemp, setCoreTarget, stepTemp, type TempState } from '../temp/temp.ts';
import { thermalMetabolic } from '../thermal/metabolic.ts'; // Stage 7e
```

In `packages/engine-core/src/l2/resp/pipeline.ts`, find:

```ts
  const h = ctx.hemo;
  const d = rs.driver;
  checkDrive(d, t);
  rs.coRatio = (cardiacOutput(h, t) / CO_REF_LPM) * (ctx.blood?.coFactor ?? 1); // Stage 7c: blood-volume fallback
  // temperature at 1 Hz; MANUAL tempCore target places the model (plan decision 2)
  if (rs.gasK % 10 === 0) {
    const tc = l1Target(l1, 'tempCore', t);
```

replace with:

```ts
  const h = ctx.hemo;
  const d = rs.driver;
  checkDrive(d, t);
  // V.1 (E-V1-1): the patient's own resting-flow reference; during CPR the adult one, because cardiacOutput() returns
  // an ADULT-absolute compression flow (SV_REF 70 mL × CPR_SV_FRAC) — a child's CPR keeps its low-flow ratio
  rs.coRatio = (cardiacOutput(h, t) / (h.cpr.active ? CO_REF_LPM : coRefLpm(rs.pat))) * (ctx.blood?.coFactor ?? 1); // Stage 7c: blood-volume fallback
  // temperature at 1 Hz; MANUAL tempCore target places the model (plan decision 2)
  if (rs.gasK % 10 === 0) {
    const tc = l1Target(l1, 'tempCore', t);
```

In `packages/engine-core/src/l2/blood/pipeline.ts`, find:

```ts
import type { L1State } from '../../l1/state.ts';
import type { BloodClinicalEvent, BloodDrugId } from '../../types-blood.ts';
import type { Command, EngineEvent, PatientProfile } from '../../types.ts';
import { CI_LPM_PER_KG, CO_REF_LPM, gasPatient } from '../gas/params.ts';
import { applyLungSpecs, metabolic, type BloodView, type RespState } from '../resp/pipeline.ts';
import { applyL1Fallback, chemistryContractility, circOf, lungWaterStep, pulmCapPressure, pushCircVolume, setCircChemistry, volumeCoFactor } from './circ-adapter.ts';
import { createBloodCore, DKA_KETO_MMOL_L, stepBloodCore, type BloodCore, type BloodOut } from './core.ts';
```

replace with:

```ts
import type { L1State } from '../../l1/state.ts';
import type { BloodClinicalEvent, BloodDrugId } from '../../types-blood.ts';
import type { Command, EngineEvent, PatientProfile } from '../../types.ts';
import { CI_LPM_PER_KG, coRefLpm, gasPatient } from '../gas/params.ts';
import { applyLungSpecs, metabolic, type BloodView, type RespState } from '../resp/pipeline.ts';
import { applyL1Fallback, chemistryContractility, circOf, lungWaterStep, pulmCapPressure, pushCircVolume, setCircChemistry, volumeCoFactor } from './circ-adapter.ts';
import { createBloodCore, DKA_KETO_MMOL_L, stepBloodCore, type BloodCore, type BloodOut } from './core.ts';
```

In `packages/engine-core/src/l2/blood/pipeline.ts`, find:

```ts
  // CO0 in the gas model's flow units (coRatio × CI × effKg): the circuit's settled resting CO, starting from 7a's
  // stabilised `ref.co` (fallback) — R51 addendum 15 (5), superseding R50 F4's `ref.co` alone
  const settling = circ?.ref !== undefined && !bs.rest.latched;
  if (circ?.ref && bs.rest.coLp === 0) bs.rest.coLp = (circ.ref.co / CO_REF_LPM) * CI_LPM_PER_KG * rs.pat.effKg;
  if (settling && bus && (bus.active || bus.doses.length > 0)) bs.rest.latched = true;
  const pPv = pulmCapPressure(ctx.hemo);
  while (bs.k * BLOOD_DT_S <= tEnd + 1e-9) {
```

replace with:

```ts
  // CO0 in the gas model's flow units (coRatio × CI × effKg): the circuit's settled resting CO, starting from 7a's
  // stabilised `ref.co` (fallback) — R51 addendum 15 (5), superseding R50 F4's `ref.co` alone
  const settling = circ?.ref !== undefined && !bs.rest.latched;
  if (circ?.ref && bs.rest.coLp === 0) bs.rest.coLp = (circ.ref.co / coRefLpm(rs.pat)) * CI_LPM_PER_KG * rs.pat.effKg; // V.1 (E-V1-1)
  if (settling && bus && (bus.active || bus.doses.length > 0)) bs.rest.latched = true;
  const pPv = pulmCapPressure(ctx.hemo);
  while (bs.k * BLOOD_DT_S <= tEnd + 1e-9) {
```


- [ ] **Step 4: Run**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/resp-child-rest.test.ts test/engine/resp-oxygen.test.ts test/engine/blood-stage3-recheck.test.ts`
Expected: PASS (14 tests). Printed: `CHILD SaO2 60–180 s: mean 97.03, min 95.68; PaCO2 37.8`, `CPR coRatio child 0.293, adult 0.293` (1.283 for the child without the CPR guard), `RECHECK preox 485 s, room 41.0 s, obese 169 s`, `RECHECK child 155.0 s`. If the child's time leaves 130–190 after a merge, the converted tests go back to `it.fails` with the new number in the title and the gate note says why (R45) — do not widen.

- [ ] **Step 5: Commit + push** — `git add -A && git commit -m "fix(resp): the CO-ratio reference is the patient's own resting flow (E-V1-1; the Stage 3 child rests at PaCO2 38, Q-7e-8 passes)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push origin stage-v1-ventilator-followup`

## Task 2: E-V1-3 — lungState and ventReference carry the pleural pressure

**Goal:** the engine tells the ventilator the pleural-space pressure the heart already sees: `lungState.pleuralCmH2O` = max(the lungs' `pPtx`, 7a's `ext.pPtx`) in cmH2O (max-combined exactly as `respPleural` combines them), and `ventReference` returns the condition's own for the catalogue.

- [ ] **Step 1: Write the failing tests**

In `packages/engine-core/test/engine/lung-state.test.ts`, find:

```ts
    expect(s.complianceMlPerCmH2O / two).toBeGreaterThan(0.55);
    expect(s.complianceMlPerCmH2O / two).toBeLessThan(0.7);
  });
});
```

replace with:

```ts
    expect(s.complianceMlPerCmH2O / two).toBeGreaterThan(0.55);
    expect(s.complianceMlPerCmH2O / two).toBeLessThan(0.7);
  });
  it('Stage V.1: pleuralCmH2O is 0 in healthy lungs, 27.2 with the lungs\' ptxTension 0.8 and with 7a\'s own tensionPtx 1 (max-combined, not added)', () => {
    const r = rig3({ patient: { ageY: 40, weightKg: 70, heightCm: 175, sex: 'M' } });
    r.e.dispatch(ev3({ kind: 'ventilation', source: 'ventilator', rr: 14, vtMl: 490, peep: 5, ie: 2, fio2: 0.5 }));
    r.e.advanceTo(20);
    expect(last(r.ev).pleuralCmH2O).toBe(0);
    r.e.dispatch(ev3({ kind: 'lungCondition', id: 'ptxTension', severity: 0.8 }));
    r.e.advanceTo(40);
    expect(last(r.ev).pleuralCmH2O).toBeCloseTo(27.2, 1);
    r.e.dispatch(ev3({ kind: 'condition', id: 'tensionPtx', severity: 1 }));
    r.e.advanceTo(60);
    expect(last(r.ev).pleuralCmH2O).toBeCloseTo(27.2, 1);
    r.e.dispatch(ev3({ kind: 'lungCondition', id: 'ptxTension', severity: 0 }));
    r.e.advanceTo(80);
    expect(last(r.ev).pleuralCmH2O).toBeCloseTo(27.2, 1); // 7a's condition alone
  });
});
```

Create `packages/engine-core/test/l2/lung/v1-lung-seams.test.ts`:

```ts
// Stage V.1 seams in the 7b lung module: the pleural pressure the ventilator must see (ventReference, G7b ruling 5) and
// the lung-water shunt's PEEP response (E-V1-2: tables §4.5 / catalogue §13 "PEEP ×(1 − 0.04·PEEP)").
import { describe, expect, it } from 'vitest';
import { ventReference } from '../../../src/l2/lung/vent-reference.ts';

describe('ventReference carries the pleural-space pressure (cmH2O above normal)', () => {
  it('tension pneumothorax 0.8: pPtx 20 mmHg → 27.2; haemothorax 1.5 L → 4.1; effusion 1.5 L → 1.5; healthy lungs 0', () => {
    expect(ventReference({ id: 'ptxTension', severity: 0.8 }).pleuralCmH2O).toBeCloseTo(27.2, 1);
    expect(ventReference({ id: 'haemothorax', severity: 0.5 }).pleuralCmH2O).toBeCloseTo(4.1, 1);
    expect(ventReference({ id: 'effusion', severity: 0.5 }).pleuralCmH2O).toBeCloseTo(1.5, 1);
    expect(ventReference({ id: 'ards', severity: 0.67 }).pleuralCmH2O).toBe(0);
  });
});
```


- [ ] **Step 2: Run to see them fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/lung/v1-lung-seams.test.ts test/engine/lung-state.test.ts`
Expected: FAIL (`pleuralCmH2O` undefined).

- [ ] **Step 3: Implement**

In `packages/engine-core/src/types-lung.ts`, find:

```ts
  leakFraction: number;
  autoPeepCmH2O: number;
  conditions: LungConditionSpec[];
}
```

replace with:

```ts
  leakFraction: number;
  autoPeepCmH2O: number;
  conditions: LungConditionSpec[];
  /**
   * Stage V.1 (G7b rulings 4+5+13): pressure of the pleural space ABOVE normal, cmH2O — the lungs' own pPtx
   * (pneumothorax, effusion, haemothorax) max-combined with 7a's tension-pneumothorax `ext.pPtx`, as the heart sees
   * it (respPleural). The ventilator's single compartment must re-open the lung against it (packages/ventilator).
   */
  pleuralCmH2O: number;
}
```

In `packages/engine-core/src/l2/lung/state-event.ts`, find:

```ts
import { staticCompliance, shuntFraction, type LungState } from './lung.ts';
import { complianceAt } from './venegas.ts';
import { SIDE_SHARE } from './params.ts';

const r2 = (x: number) => Math.round(x * 100) / 100;
```

replace with:

```ts
import { staticCompliance, shuntFraction, type LungState } from './lung.ts';
import { complianceAt } from './venegas.ts';
import { SIDE_SHARE } from './params.ts';
import { CMH2O_TO_MMHG } from '../gas/params.ts'; // Stage V.1

const r2 = (x: number) => Math.round(x * 100) / 100;
```

In `packages/engine-core/src/l2/lung/state-event.ts`, find:

```ts

export function lungStatePayload(
  ls: LungState,
  x: { deadSpaceMl: number; frcMl: number; effort: number; peep: number; baseShunt: number; specs: LungConditionSpec[] },
): LungStateCore & LungStateExt {
  const lp = ls.lp;
  const gs = lp.side.map((s) => 1 / s.rLung);
```

replace with:

```ts

export function lungStatePayload(
  ls: LungState,
  x: { deadSpaceMl: number; frcMl: number; effort: number; peep: number; baseShunt: number; specs: LungConditionSpec[]; pleuralMmHg: number },
): LungStateCore & LungStateExt {
  const lp = ls.lp;
  const gs = lp.side.map((s) => 1 / s.rLung);
```

In `packages/engine-core/src/l2/lung/state-event.ts`, find:

```ts
    leakFraction: r2(lp.leakFrac),
    autoPeepCmH2O: Math.round(autoPeep * 10) / 10,
    conditions: x.specs.map((s) => ({ ...s })),
  };
}
```

replace with:

```ts
    leakFraction: r2(lp.leakFrac),
    autoPeepCmH2O: Math.round(autoPeep * 10) / 10,
    conditions: x.specs.map((s) => ({ ...s })),
    pleuralCmH2O: Math.round((x.pleuralMmHg / CMH2O_TO_MMHG) * 10) / 10, // Stage V.1
  };
}
```

In `packages/engine-core/src/l2/lung/vent-reference.ts`, find:

```ts
// side's lung compliance and airway count, in series with the whole (shared) chest wall and the tube.
import type { LungConditionSpec } from '../../types-lung.ts';
import { resolveLung } from './conditions.ts';

export interface VentReference {
  crs: number; // static respiratory-system compliance, mL/cmH2O
```

replace with:

```ts
// side's lung compliance and airway count, in series with the whole (shared) chest wall and the tube.
import type { LungConditionSpec } from '../../types-lung.ts';
import { resolveLung } from './conditions.ts';
import { CMH2O_TO_MMHG } from '../gas/params.ts'; // Stage V.1

export interface VentReference {
  crs: number; // static respiratory-system compliance, mL/cmH2O
```

In `packages/engine-core/src/l2/lung/vent-reference.ts`, find:

```ts
  nonAerated: number; // whole-lung non-aerated fraction (volume-weighted)
  extraShunt: number;
  vdAlv: number; // volume-weighted unperfused fraction of alveolar ventilation
}

export function ventReference(spec: LungConditionSpec, pbwKg = 70): VentReference {
```

replace with:

```ts
  nonAerated: number; // whole-lung non-aerated fraction (volume-weighted)
  extraShunt: number;
  vdAlv: number; // volume-weighted unperfused fraction of alveolar ventilation
  pleuralCmH2O: number; // Stage V.1: the condition's pleural-space pressure above normal (lp.pPtx), cmH2O
}

export function ventReference(spec: LungConditionSpec, pbwKg = 70): VentReference {
```

In `packages/engine-core/src/l2/lung/vent-reference.ts`, find:

```ts
  return {
    crs: 1 / (1 / cL + 1 / lp.ccw), rInsp, rExp: rInsp * Math.max(s0.rawExp, s1.rawExp),
    nonAerated: 0.45 * (s0.atel + s0.consol) + 0.55 * (s1.atel + s1.consol), extraShunt: lp.extraShunt,
    vdAlv: 0.45 * s0.vdAlv + 0.55 * s1.vdAlv,
  };
}
```

replace with:

```ts
  return {
    crs: 1 / (1 / cL + 1 / lp.ccw), rInsp, rExp: rInsp * Math.max(s0.rawExp, s1.rawExp),
    nonAerated: 0.45 * (s0.atel + s0.consol) + 0.55 * (s1.atel + s1.consol), extraShunt: lp.extraShunt,
    vdAlv: 0.45 * s0.vdAlv + 0.55 * s1.vdAlv, pleuralCmH2O: Math.round((lp.pPtx / CMH2O_TO_MMHG) * 10) / 10,
  };
}
```

In `packages/engine-core/src/l2/resp/pipeline.ts`, find:

```ts
    deadSpaceMl: deadSpace(rs), frcMl: rs.temp.anaesthesia === 'general' ? rs.pat.frcGaMl : rs.pat.frcMl,
    effort: d.source === 'spontaneous' ? 1 : d.cleft, peep: d.source === 'ventilator' ? d.vent.peep : d.ext ? d.ext.peep : 0,
    baseShunt: Math.min(0.9, rs.shunt + extraShunt(rs)), specs: rs.lungSpecs,
  }); // Stage 7b: absolute + per-lung fields (decision 15)
  const key = JSON.stringify(ev);
  if (key === rs.lungKey) return;
```

replace with:

```ts
    deadSpaceMl: deadSpace(rs), frcMl: rs.temp.anaesthesia === 'general' ? rs.pat.frcGaMl : rs.pat.frcMl,
    effort: d.source === 'spontaneous' ? 1 : d.cleft, peep: d.source === 'ventilator' ? d.vent.peep : d.ext ? d.ext.peep : 0,
    baseShunt: Math.min(0.9, rs.shunt + extraShunt(rs)), specs: rs.lungSpecs,
    pleuralMmHg: Math.max(rs.lung.lp.pPtx, rs.circPtx), // Stage V.1: as respPleural combines them
  }); // Stage 7b: absolute + per-lung fields (decision 15)
  const key = JSON.stringify(ev);
  if (key === rs.lungKey) return;
```


- [ ] **Step 4: Run**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/lung/v1-lung-seams.test.ts test/engine/lung-state.test.ts test/l2/lung && npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck`
Expected: PASS; `ventReference` tension 0.8 → 27.2, haemothorax 0.5 → 4.1, effusion 0.5 → 1.5, ARDS → 0; lungState 0 → 27.2 (lung) → 27.2 (lung + 7a, not 54.4) → 27.2 (7a alone).

- [ ] **Step 5: Commit + push** — `feat(lung): lungState and ventReference carry the pleural-space pressure (E-V1-3, G7b ruling 5)`.

## Task 3: E-V1-2 — the lung-water shunt falls with PEEP (tables §4.5)

**Goal:** implement the data row's documented PEEP response so the retired interim link model is not needed for oedema: the lung-water part of the extra shunt × (1 − 0.04·PEEP_total).

- [ ] **Step 1: Write the failing tests**

In `packages/engine-core/test/l2/lung/v1-lung-seams.test.ts`, find:

```ts
// Stage V.1 seams in the 7b lung module: the pleural pressure the ventilator must see (ventReference, G7b ruling 5) and
// the lung-water shunt's PEEP response (E-V1-2: tables §4.5 / catalogue §13 "PEEP ×(1 − 0.04·PEEP)").
import { describe, expect, it } from 'vitest';
import { ventReference } from '../../../src/l2/lung/vent-reference.ts';

describe('ventReference carries the pleural-space pressure (cmH2O above normal)', () => {
```

replace with:

```ts
// Stage V.1 seams in the 7b lung module: the pleural pressure the ventilator must see (ventReference, G7b ruling 5) and
// the lung-water shunt's PEEP response (E-V1-2: tables §4.5 / catalogue §13 "PEEP ×(1 − 0.04·PEEP)").
import { describe, expect, it } from 'vitest';
import { resolveLung } from '../../../src/l2/lung/conditions.ts';
import { extraShuntAt } from '../../../src/l2/lung/lung.ts';
import { ventReference } from '../../../src/l2/lung/vent-reference.ts';

describe('ventReference carries the pleural-space pressure (cmH2O above normal)', () => {
```

In `packages/engine-core/test/l2/lung/v1-lung-seams.test.ts`, find:

```ts
    expect(ventReference({ id: 'ards', severity: 0.67 }).pleuralCmH2O).toBe(0);
  });
});
```

replace with:

```ts
    expect(ventReference({ id: 'ards', severity: 0.67 }).pleuralCmH2O).toBe(0);
  });
});

describe('E-V1-2: the lung-water part of the extra shunt falls with PEEP ×(1 − 0.04·PEEP)', () => {
  it('pulmonary oedema 1: water shunt 0.175 → 0.14 at PEEP 5, 0.091 at 12, 0 from 25 cmH2O', () => {
    const { lp } = resolveLung([{ id: 'pulmOedema', severity: 1 }], 70);
    expect(lp.waterShunt).toBeCloseTo(0.175, 6);
    expect(extraShuntAt(lp, 0)).toBeCloseTo(0.175, 6);
    expect(extraShuntAt(lp, 5)).toBeCloseTo(0.14, 6);
    expect(extraShuntAt(lp, 12)).toBeCloseTo(0.091, 6);
    expect(extraShuntAt(lp, 30)).toBeCloseTo(0, 6);
  });
  it('aspiration pneumonitis counts (data: "lung-water shunt"); the ILD/chest-wall/PE extra shunts do not move with PEEP', () => {
    expect(resolveLung([{ id: 'aspiration', severity: 1, side: 'R' }], 70).lp.waterShunt).toBeCloseTo(0.2, 6);
    for (const id of ['ild', 'chestWall', 'pe'] as const) {
      const { lp } = resolveLung([{ id, severity: 1 }], 70);
      expect(lp.waterShunt, id).toBe(0);
      expect(extraShuntAt(lp, 15), id).toBeCloseTo(lp.extraShunt, 9);
    }
  });
  it('7c\'s lung water (EVLWI above 10 mL/kg) is water shunt too', () => {
    const { lp } = resolveLung([], 70, 1, 6); // EVLWI 7 + 6 = 13 → +0.09
    expect(lp.waterShunt).toBeCloseTo(0.09, 6);
    expect(extraShuntAt(lp, 10)).toBeCloseTo(0.09 * 0.6, 6);
  });
});
```


- [ ] **Step 2: Run to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/lung/v1-lung-seams.test.ts`
Expected: FAIL (`extraShuntAt` not exported).

- [ ] **Step 3: Implement**

In `packages/engine-core/src/l2/lung/side.ts`, find:

```ts
  ccw: number; // mL/cmH2O
  rTube: number; // cmH2O·s/L
  extraShunt: number; // extrapulmonary / extra true shunt, fraction of CO
  frcMult: number;
  ibwKg: number;
  /** Values the lung module only passes on (7a, 7f): */
```

replace with:

```ts
  ccw: number; // mL/cmH2O
  rTube: number; // cmH2O·s/L
  extraShunt: number; // extrapulmonary / extra true shunt, fraction of CO
  /** Stage V.1 (E-V1-2): the part of extraShunt that is alveolar flooding (lung water) — PEEP relieves it (tables §4.5). */
  waterShunt: number;
  frcMult: number;
  ibwKg: number;
  /** Values the lung module only passes on (7a, 7f): */
```

In `packages/engine-core/src/l2/lung/side.ts`, find:

```ts
    cL: cL * sh, aerRef: 1, rLung: rLungTot / sh, rawExp: 1.2, fSlow: 0, tauSlowS: 0.5, atel: 0, consol: 0,
    pOpen: 40, tauRecS: 2.6, vqLow: 0.02, vdAlv: 0.075, dl: 1, hpv: 0.5, perf: 1,
  }));
  return { side, ccw, rTube: R_TUBE / w, extraShunt: 0, frcMult: 1, ibwKg, pvr: 1, tIt: 0.4, pPtx: 0, leakFrac: 0, co2Slope: 1, pMax: 1 };
}

/**
```

replace with:

```ts
    cL: cL * sh, aerRef: 1, rLung: rLungTot / sh, rawExp: 1.2, fSlow: 0, tauSlowS: 0.5, atel: 0, consol: 0,
    pOpen: 40, tauRecS: 2.6, vqLow: 0.02, vdAlv: 0.075, dl: 1, hpv: 0.5, perf: 1,
  }));
  return { side, ccw, rTube: R_TUBE / w, extraShunt: 0, waterShunt: 0, frcMult: 1, ibwKg, pvr: 1, tIt: 0.4, pPtx: 0, leakFrac: 0, co2Slope: 1, pMax: 1 };
}

/**
```

In `packages/engine-core/src/l2/lung/conditions.ts`, find:

```ts

const GLOBAL: readonly EffectKey[] = ['ccw', 'frc', 'pvr', 'tIt', 'pPtx', 'leakFrac', 'co2Slope', 'pMax', 'extraShunt', 'evlwi'];
const SIDE_ADD: readonly EffectKey[] = ['atel', 'consol', 'vqLow', 'vdAlv'];

export function conditionData(id: string): LungConditionData | undefined {
  return LUNG_CONDITIONS.find((c) => c.id === id);
```

replace with:

```ts

const GLOBAL: readonly EffectKey[] = ['ccw', 'frc', 'pvr', 'tIt', 'pPtx', 'leakFrac', 'co2Slope', 'pMax', 'extraShunt', 'evlwi'];
const SIDE_ADD: readonly EffectKey[] = ['atel', 'consol', 'vqLow', 'vdAlv'];
/** Stage V.1 (E-V1-2): conditions whose extraShunt the data mark "lung-water shunt" (§13 pulmonary oedema, §21 aspiration pneumonitis). */
const WATER_SHUNT_IDS: readonly string[] = ['pulmOedema', 'aspiration'];

export function conditionData(id: string): LungConditionData | undefined {
  return LUNG_CONDITIONS.find((c) => c.id === id);
```

In `packages/engine-core/src/l2/lung/conditions.ts`, find:

```ts
  const sides: Acc[] = [fresh(), fresh()];
  const g = fresh();
  const blocked: LungSide[] = [];
  for (const spec of specs) {
    const d = conditionData(spec.id);
    if (!d || !(spec.severity > 0)) continue;
```

replace with:

```ts
  const sides: Acc[] = [fresh(), fresh()];
  const g = fresh();
  const blocked: LungSide[] = [];
  let waterAdd = 0; // Stage V.1 (E-V1-2)
  for (const spec of specs) {
    const d = conditionData(spec.id);
    if (!d || !(spec.severity > 0)) continue;
```

In `packages/engine-core/src/l2/lung/conditions.ts`, find:

```ts
    const local: Acc[] = [fresh(), fresh()];
    for (const e of d.effects) {
      const v = effectValue(e, s);
      if (GLOBAL.includes(e.key)) { apply(g, e.key, e.op, v); continue; }
      if (!d.sided) { apply(local[0] as Acc, e.key, e.op, v); apply(local[1] as Acc, e.key, e.op, v); }
      else if (e.where === 'affected') apply(local[si] as Acc, e.key, e.op, v);
```

replace with:

```ts
    const local: Acc[] = [fresh(), fresh()];
    for (const e of d.effects) {
      const v = effectValue(e, s);
      if (e.key === 'extraShunt' && e.op === 'add' && WATER_SHUNT_IDS.includes(d.id)) waterAdd += v; // Stage V.1 (E-V1-2)
      if (GLOBAL.includes(e.key)) { apply(g, e.key, e.op, v); continue; }
      if (!d.sided) { apply(local[0] as Acc, e.key, e.op, v); apply(local[1] as Acc, e.key, e.op, v); }
      else if (e.where === 'affected') apply(local[si] as Acc, e.key, e.op, v);
```

In `packages/engine-core/src/l2/lung/conditions.ts`, find:

```ts
  if (whole > 0.7) for (const sp of lp.side) { const f = 0.7 / whole; sp.atel *= f; sp.consol *= f; sp.aerRef = Math.max(0.05, 1 - sp.atel - sp.consol); }
  lp.ccw = ccwH * g.ccw;
  lp.extraShunt = Math.min(0.6, g.extraShunt + water.shunt);
  lp.frcMult = g.frc;
  lp.pvr = g.pvr;
  lp.tIt = g.tIt;
```

replace with:

```ts
  if (whole > 0.7) for (const sp of lp.side) { const f = 0.7 / whole; sp.atel *= f; sp.consol *= f; sp.aerRef = Math.max(0.05, 1 - sp.atel - sp.consol); }
  lp.ccw = ccwH * g.ccw;
  lp.extraShunt = Math.min(0.6, g.extraShunt + water.shunt);
  lp.waterShunt = Math.min(lp.extraShunt, waterAdd + water.shunt); // Stage V.1 (E-V1-2)
  lp.frcMult = g.frc;
  lp.pvr = g.pvr;
  lp.tIt = g.tIt;
```

In `packages/engine-core/src/l2/lung/lung.ts`, find:

```ts
  // plan decision 7: "the CPR kinetics are untouched").
  const qO2 = Math.max(0.05, x.q);
  const qCo2 = Math.max(qO2, x.qRef ?? 0);
  const extra = Math.min(0.6, x.baseShunt + lp.extraShunt);
  const qp = qO2 * (1 - extra);
  const f = x.sideFlow ? x.sideFlow.map((v) => v / Math.max(1e-6, x.sideFlow![0]! + x.sideFlow![1]!)) : ls.perf.f;
  const perfU = [0, 0, 0, 0];
```

replace with:

```ts
  // plan decision 7: "the CPR kinetics are untouched").
  const qO2 = Math.max(0.05, x.q);
  const qCo2 = Math.max(qO2, x.qRef ?? 0);
  const extra = Math.min(0.6, x.baseShunt + extraShuntAt(lp, ls.peepTot)); // Stage V.1 (E-V1-2)
  const qp = qO2 * (1 - extra);
  const f = x.sideFlow ? x.sideFlow.map((v) => v / Math.max(1e-6, x.sideFlow![0]! + x.sideFlow![1]!)) : ls.perf.f;
  const perfU = [0, 0, 0, 0];
```

In `packages/engine-core/src/l2/lung/lung.ts`, find:

```ts
  }, dt);
}

/** True shunt fraction now (for lungState and the `shunt` coupled truth). */
export function shuntFraction(ls: LungState, baseShunt: number): number {
  const extra = Math.min(0.6, baseShunt + ls.lp.extraShunt);
  const f = ls.perf.f;
  return Math.min(0.9, extra + (1 - extra) * ((f[0] as number) * (ls.perf.shunt[0] as number) + (f[1] as number) * (ls.perf.shunt[1] as number)));
}
```

replace with:

```ts
  }, dt);
}

/**
 * Stage V.1 (E-V1-2): the extra shunt at the current total PEEP. Its lung-water part (flooded alveoli: pulmonary
 * oedema, aspiration pneumonitis, 7c's lung water) is relieved by PEEP ×(1 − 0.04·PEEP) (tables §4.5, catalogue §13
 * "PEEP / CPAP response strong"; the data row's own rule, not applied until V.1 retired the link's interim shunt).
 */
export function extraShuntAt(lp: LungParams, peepTot: number): number {
  return lp.extraShunt - lp.waterShunt * Math.min(1, 0.04 * Math.max(0, peepTot));
}

/** True shunt fraction now (for lungState and the `shunt` coupled truth). */
export function shuntFraction(ls: LungState, baseShunt: number): number {
  const extra = Math.min(0.6, baseShunt + extraShuntAt(ls.lp, ls.peepTot));
  const f = ls.perf.f;
  return Math.min(0.9, extra + (1 - extra) * ((f[0] as number) * (ls.perf.shunt[0] as number) + (f[1] as number) * (ls.perf.shunt[1] as number)));
}
```


- [ ] **Step 4: Run the lung suites**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/lung test/engine/lung- test/engine/blood-`
Expected: PASS — prototype: 35 files / 138 tests (every 7b lung test and 7c blood test unchanged, plus the new file); the 32-condition catalogue test keeps the oedema shunt inside 0.10–0.25 at its rig's PEEP 5.

- [ ] **Step 5: Commit + push** — `feat(lung): the lung-water shunt falls with PEEP ×(1 − 0.04·PEEP) (E-V1-2, tables §4.5)`.

## Task 4: The ventilator's single compartment sees the pleural pressure

**Goal:** `VentConfig.pleural` (cmH2O above normal, default 0) and the opening pressure of Decision 1 in `recoilPressure`; the frame's alveolar pressure leaves it out (Decision 2). The v1.9 reference scenarios (pleural 0) stay bit-identical.

- [ ] **Step 1: Write the failing tests**

Create `packages/ventilator/test/pleural.test.ts`:

```ts
// Stage V.1 (G7b ruling 5): the ventilator's single compartment sees the pleural pressure. A tension pneumothorax
// collapses the lung at end-expiration once the pleural pressure passes PEEP; every breath must re-open it first.
import { describe, expect, it } from 'vitest';
import { advanceVent, createVent, pleuralOpening, PPL_REST_CMH2O, toVentFrame } from '../src/index.ts';
import { P_PL0 } from '../../engine-core/src/l2/circ/params.ts';
import { CMH2O_TO_MMHG } from '../../engine-core/src/l2/gas/params.ts';

describe('pleural opening pressure (Stage V.1, G7b ruling 5)', () => {
  it('rests on 7a\'s P_PL0 (−4 mmHg): the lung collapses only when the pleural pressure passes PEEP', () => {
    expect(PPL_REST_CMH2O).toBeCloseTo(-P_PL0 / CMH2O_TO_MMHG, 9);
    const c = createVent({ pleural: 27.2, peep: 5 }).cfg;
    expect(pleuralOpening(c, 0)).toBe(0); // end-expiration: the expiratory hold reads set PEEP
    expect(pleuralOpening(c, 150)).toBeCloseTo(27.2 - PPL_REST_CMH2O - 5, 6);
    expect(pleuralOpening({ ...c, peep: 15 }, 400)).toBeCloseTo(27.2 - PPL_REST_CMH2O - 15, 6);
    expect(pleuralOpening({ ...c, pleural: 4.1 }, 400)).toBe(0); // haemothorax 1.5 L: volume loss only
    // a large haemothorax (severity 1, 3 L: pPtx 6 mmHg = 8.2 cmH2O) passes a LOW PEEP: 2.76 at ZEEP, 0.76 at PEEP 2 [ENG]
    expect(pleuralOpening({ ...c, pleural: 8.2, peep: 0 }, 400)).toBeCloseTo(2.76, 2);
    expect(pleuralOpening({ ...c, pleural: 8.2, peep: 2 }, 400)).toBeCloseTo(0.76, 2);
    expect(pleuralOpening({ ...c, pleural: 0 }, 400)).toBe(0);
  });
  it('VC 490 mL, C 35.5: plateau = PEEP + opening + VT/C, auto-PEEP ≈ 0; the frame leaves the opening out of Palv', () => {
    const vs = createVent({ mode: 'VC', vt: 490, rate: 14, peep: 5, vcFlow: 60, pause: 0.3, flowPattern: 'square', pmax: 120, compliance: 35.5, resistance: 9.8, pleural: 27.2 });
    advanceVent(vs, 60);
    const m = vs.p.measured;
    expect(m.PLAT).toBeCloseTo(5 + (27.2 - PPL_REST_CMH2O - 5) + 490 / 35.5, 0);
    expect(m.autoPEEP).toBeLessThan(0.5);
    // the engine adds the pleural pressure to the heart itself (respPleural): T_IT·Palv must not carry it twice
    const f = toVentFrame(vs, 'VC');
    expect(f.palvCmH2O).toBeCloseTo(vs.p.Palv - pleuralOpening(vs.cfg, vs.p.V), 9);
  });
});
```


- [ ] **Step 2: Run to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/pleural.test.ts`
Expected: FAIL (`pleuralOpening` not exported).

- [ ] **Step 3: Implement**

In `packages/ventilator/src/types.ts`, find:

```ts
  airwayClosure: boolean; openPressure: number; recruitedVol: number; stressIdx: boolean; stressB: number;
  uip: boolean; uipThresh: number; reverseTrig: boolean; entrainRatio: '1:1' | '1:2' | '1:3';
  efl: boolean; eflSeverity: 'mild' | 'moderate' | 'severe' | 'custom'; pcrit: number; eflK: number; peepStent: number;
  cardiac: boolean; hr: number; variability: boolean; varPct: number;
  showPmus: boolean; showP01: boolean; sweepSec: number;
  /** Hamilton-style name shown in the header when several names share one engine mode (HAMILTON_MODES). */
```

replace with:

```ts
  airwayClosure: boolean; openPressure: number; recruitedVol: number; stressIdx: boolean; stressB: number;
  uip: boolean; uipThresh: number; reverseTrig: boolean; entrainRatio: '1:1' | '1:2' | '1:3';
  efl: boolean; eflSeverity: 'mild' | 'moderate' | 'severe' | 'custom'; pcrit: number; eflK: number; peepStent: number;
  /** Stage V.1: pleural-space pressure above normal (cmH2O) from the patient engine's lungState (tension pneumothorax). */
  pleural: number;
  cardiac: boolean; hr: number; variability: boolean; varPct: number;
  showPmus: boolean; showP01: boolean; sweepSec: number;
  /** Hamilton-style name shown in the header when several names share one engine mode (HAMILTON_MODES). */
```

In `packages/ventilator/src/presets.ts`, find:

```ts
  sex: '', height: 170, compliance: 50, resistance: 10, spont: false, spontRate: 16, pmus: 6, responsiveness: 80,
  pmusRise: 0.30, pmusHold: 0.05, pmusDecay: 0.40, riseShape: 'smoothstep', decayShape: 'halfcos', pmusOffset: 0.0,
  airwayClosure: false, openPressure: 0, recruitedVol: 0, stressIdx: false, stressB: 1.0, uip: false, uipThresh: 28,
  reverseTrig: false, entrainRatio: '1:1', efl: false, eflSeverity: 'moderate', pcrit: 6, eflK: 0.35, peepStent: 40,
  cardiac: false, hr: 75, variability: false, varPct: 8, showPmus: false, showP01: false, sweepSec: 12,
  modeLabel: null,
  sigh: false, trc: false, trcPct: 100, apneaTime: 20, backup: true, backupRate: 12,
```

replace with:

```ts
  sex: '', height: 170, compliance: 50, resistance: 10, spont: false, spontRate: 16, pmus: 6, responsiveness: 80,
  pmusRise: 0.30, pmusHold: 0.05, pmusDecay: 0.40, riseShape: 'smoothstep', decayShape: 'halfcos', pmusOffset: 0.0,
  airwayClosure: false, openPressure: 0, recruitedVol: 0, stressIdx: false, stressB: 1.0, uip: false, uipThresh: 28,
  reverseTrig: false, entrainRatio: '1:1', efl: false, eflSeverity: 'moderate', pcrit: 6, eflK: 0.35, peepStent: 40, pleural: 0,
  cardiac: false, hr: 75, variability: false, varPct: 8, showPmus: false, showP01: false, sweepSec: 12,
  modeLabel: null,
  sigh: false, trc: false, trcPct: 100, apneaTime: 20, backup: true, backupRate: 12,
```

In `packages/ventilator/src/mechanics.ts`, find:

```ts
    const f = clamp(v / 700, 0.001, 1.2);
    p *= Math.pow(f, c.stressB - 1);
  }
  return p;
}

const EFL_SEVERITY = { mild: 1.8, moderate: 3.0, severe: 5.0 } as const;
```

replace with:

```ts
    const f = clamp(v / 700, 0.001, 1.2);
    p *= Math.pow(f, c.stressB - 1);
  }
  return p + pleuralOpening(c, v);
}

/** 7a's resting pleural pressure P_PL0 −4 mmHg (Smith 2004) in cmH2O: the lung stays open while Ppl < PEEP. */
export const PPL_REST_CMH2O = 4 / 0.7356;
/** Volume over which a collapsed lung re-opens (v1.9's airway-closure default recruited volume, 150 mL). */
export const PLEURAL_OPEN_ML = 150;
/**
 * Stage V.1 (G7b ruling 5): with the pleural space above normal by `c.pleural`, the end-expiratory pleural pressure
 * (P_PL0 + pleural) exceeds the alveolar pressure (PEEP) by E = pleural − 5.44 − PEEP; the lung is then collapsed at
 * end-expiration and every breath must first raise the alveolar pressure by E (the v1.9 opening shape over 150 mL)
 * before tidal volume enters. E = 0 for every reference scenario (pleural 0) and for an effusion or a haemothorax at
 * their default size once PEEP ≥ 3 (the lung only loses volume); a 3 L haemothorax (8.2 cmH2O) at ZEEP gives E 2.76 —
 * the same physics, kept [ENG] (plan Decision 1). The expiratory hold reads set PEEP: the collapsed units are closed off.
 */
export function pleuralOpening(c: VentConfig, v: number): number {
  const e = c.pleural - PPL_REST_CMH2O - c.peep;
  return c.pleural > 0 && e > 0 ? e * Math.sqrt(clamp(v / PLEURAL_OPEN_ML, 0, 1)) : 0;
}

const EFL_SEVERITY = { mild: 1.8, moderate: 3.0, severe: 5.0 } as const;
```

In `packages/ventilator/src/frame.ts`, find:

```ts
// Pause and inspiratory hold count as inspiration (Ti includes the pause, as a ventilator reports it).
import type { VentFrameExt } from '@pme/engine-core';
import type { VentState } from './types.ts';

/** The R27 frame: Stage 3's VentFrame + Stage V's optional alveolar pressure and mode (engine-core types-vent-link.ts). */
export type LinkFrame = VentFrameExt & { palvCmH2O: number; mode: string };
```

replace with:

```ts
// Pause and inspiratory hold count as inspiration (Ti includes the pause, as a ventilator reports it).
import type { VentFrameExt } from '@pme/engine-core';
import type { VentState } from './types.ts';
import { pleuralOpening } from './mechanics.ts';

/** The R27 frame: Stage 3's VentFrame + Stage V's optional alveolar pressure and mode (engine-core types-vent-link.ts). */
export type LinkFrame = VentFrameExt & { palvCmH2O: number; mode: string };
```

In `packages/ventilator/src/frame.ts`, find:

```ts
  const insp = !open && (vs.hold === 'insp' || (vs.hold === null && p.phase !== 'exp'));
  return {
    pawCmH2O: p.Paw,
    palvCmH2O: open ? 0 : p.Palv,
    flowLps: open ? 0 : p.Q,
    volumeMl: open ? 0 : Math.max(0, p.V - p.breathVstart),
    fio2: vs.cfg.fio2 / 100,
```

replace with:

```ts
  const insp = !open && (vs.hold === 'insp' || (vs.hold === null && p.phase !== 'exp'));
  return {
    pawCmH2O: p.Paw,
    // Stage V.1: without the pleural opening pressure — the engine already adds that pleural pressure to the heart
    // (respPleural), so transmitting it again through T_IT·Palv would count it twice
    palvCmH2O: open ? 0 : p.Palv - pleuralOpening(vs.cfg, p.V),
    flowLps: open ? 0 : p.Q,
    volumeMl: open ? 0 : Math.max(0, p.V - p.breathVstart),
    fio2: vs.cfg.fio2 / 100,
```


- [ ] **Step 4: Run**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/pleural.test.ts test/fidelity.test.ts test/mechanics.test.ts test/vent-corrections.test.ts test/alarms-frame.test.ts`
Expected: PASS (5 files, 22 tests) — the fidelity traces identical (pleural 0 adds exactly 0); plateau 35.6 at C 35.5 / pleural 27.2 / PEEP 5; auto-PEEP < 0.5; haemothorax 8.2 cmH2O → E 2.76 at ZEEP, 0.76 at PEEP 2.

- [ ] **Step 5: Commit + push** — `feat(ventilator): the single compartment re-opens the lung against the pleural pressure (G7b ruling 5)`.

## Task 5: The ventilator reads the 7b lungs — absolute lungState, generated pleural pressure, tension bands restored

**Goal:** one mapping (`lungMechanics`) from a lung (C, R_insp, R_exp, pleural) to the single compartment for both the catalogue rows and every lungState, read ABSOLUTE (Decisions 4, 5); the catalogue rows carry the engine's pleural pressure and 'engine-now' wiring; the tension row's plateau/ΔP bands return to the authored 25–50 / 20–45. (Between this task and Task 7 the link integration files `link-r27`/`link-r36` may be red — profiles still send the interim shunt; do not fix them here.)

- [ ] **Step 1: Write the failing tests**

Run `git mv packages/ventilator/test/lung-recruit.test.ts packages/ventilator/test/lung-input.test.ts`; the next block replaces its content.

Replace the whole of `packages/ventilator/test/lung-input.test.ts` with:

```ts
// engine → vent: lungState is the patient's lung, read as ABSOLUTE values (Stage 7b decision 15; Stage V.1, G7b rulings
// 4+5+13). The pleural opening pressure is pleural.test.ts.
import { describe, expect, it } from 'vitest';
import { applyLungState, createLungLink, createVent, type LungStateEvent } from '../src/index.ts';

const ls = (o: Partial<LungStateEvent>): LungStateEvent => ({ type: 'lungState', t: 0, complianceMlPerCmH2O: 50, resistanceCmH2OPerLps: 10, effort: 0, autoPeepTendency: 0, shunt: 0.04, deadSpaceMl: 215, frcMl: 2100, ...o });

describe('lungState → ventilator lung (absolute)', () => {
  it('takes C and R as they are; R_exp above R_insp is flow limitation with eflK = R_insp/R_exp; the profile lung holds until then', () => {
    const vs = createVent({ compliance: 33, resistance: 13 });
    const ll = createLungLink(vs.cfg);
    expect(ll.last).toBeNull();
    applyLungState(vs, ll, ls({}));
    expect([vs.cfg.compliance, vs.cfg.resistance, vs.cfg.efl, vs.cfg.pleural]).toEqual([50, 10, false, 0]);
    applyLungState(vs, ll, ls({ complianceMlPerCmH2O: 68, resistanceCmH2OPerLps: 25, resistanceExpCmH2OPerLps: 39, autoPeepTendency: 0.8 }));
    expect([vs.cfg.compliance, vs.cfg.resistance, vs.cfg.efl, vs.cfg.eflSeverity, vs.cfg.peepStent]).toEqual([68, 25, true, 'custom', 0]);
    expect(vs.cfg.eflK).toBeCloseTo(25 / 39, 6);
    applyLungState(vs, ll, ls({ complianceMlPerCmH2O: 25, pleuralCmH2O: 27.2 }));
    expect([vs.cfg.compliance, vs.cfg.resistance, vs.cfg.efl, vs.cfg.pleural]).toEqual([25, 10, false, 27.2]);
    expect(ll.last?.complianceMlPerCmH2O).toBe(25);
  });
  it('effort adds patient Pmus (8 cmH2O × effort) only when the profile does not breathe itself', () => {
    const vs = createVent();
    const ll = createLungLink(vs.cfg);
    applyLungState(vs, ll, ls({ effort: 0.5 }));
    expect([vs.cfg.spont, vs.cfg.pmus]).toEqual([true, 4]);
    applyLungState(vs, ll, ls({ effort: 0 }));
    expect(vs.cfg.spont).toBe(false);
  });
});
```

In `packages/ventilator/test/ports.test.ts`, find:

```ts
    const gaps = scheduled.slice(10).map((t, i, a) => (i ? t - (a[i - 1] as number) : 1));
    expect(Math.max(...gaps)).toBe(1); // one frame per engine tick, in order
    expect(d.simT() - e.now().simT).toBeLessThanOrEqual(MAX_AHEAD_TICKS * 0.02 + 0.1);
    expect(d.core.lung.ref).not.toBeNull(); // lungState arrived
  });
});
```

replace with:

```ts
    const gaps = scheduled.slice(10).map((t, i, a) => (i ? t - (a[i - 1] as number) : 1));
    expect(Math.max(...gaps)).toBe(1); // one frame per engine tick, in order
    expect(d.simT() - e.now().simT).toBeLessThanOrEqual(MAX_AHEAD_TICKS * 0.02 + 0.1);
    expect(d.core.lung.last).not.toBeNull(); // lungState arrived
  });
});
```

In `packages/ventilator/test/pathology-consistency.test.ts`, find:

```ts
      const r = ventReference({ id: m.id as never, severity: m.severity, ...(m.side ? { side: m.side } : {}) }, pbw);
      expect(row.complianceMl.value).toBeCloseTo(r.crs, 0);
      expect(row.rInsp.value).toBeCloseTo(r.rInsp, 0);
      expect(row.complianceMl.lo).toBeLessThanOrEqual(row.complianceMl.value);
      expect(row.complianceMl.hi).toBeGreaterThanOrEqual(row.complianceMl.value);
    }
```

replace with:

```ts
      const r = ventReference({ id: m.id as never, severity: m.severity, ...(m.side ? { side: m.side } : {}) }, pbw);
      expect(row.complianceMl.value).toBeCloseTo(r.crs, 0);
      expect(row.rInsp.value).toBeCloseTo(r.rInsp, 0);
      expect(row.pleuralCmH2O).toBe(r.pleuralCmH2O); // Stage V.1: the pleural pressure is generated too
      expect(row.complianceMl.lo).toBeLessThanOrEqual(row.complianceMl.value);
      expect(row.complianceMl.hi).toBeGreaterThanOrEqual(row.complianceMl.value);
    }
```

The tension Ppeak rise (Decision 16; tables H6 [TXT] "Ppeak +10–20" governs) — `pleural.test.ts` is Task 4's file, so these two blocks match after Task 4.

In `packages/ventilator/test/pleural.test.ts`, find:

```ts
import { advanceVent, createVent, pleuralOpening, PPL_REST_CMH2O, toVentFrame } from '../src/index.ts';
```

replace with:

```ts
import { advanceVent, createVent, LUNG_PATHOLOGIES, pleuralOpening, PPL_REST_CMH2O, referenceRun, toVentFrame } from '../src/index.ts';
```

In `packages/ventilator/test/pleural.test.ts`, find:

```ts
    expect(f.palvCmH2O).toBeCloseTo(vs.p.Palv - pleuralOpening(vs.cfg, vs.p.V), 9);
  });
});
```

replace with:

```ts
    expect(f.palvCmH2O).toBeCloseTo(vs.p.Palv - pleuralOpening(vs.cfg, vs.p.V), 9);
  });
});

// Orchestrator ruling (V.1 review 1): tables H6 "Ppeak +10–20" is [TXT] and governs over the catalogue §16 [ENG] tag.
// The opening pressure on top of 7b's tension crs ×0.5 (chosen before the ventilator saw the pleural pressure, as a
// stand-in for this very Ppeak rise) overshoots by 1.6 → calibration-queue row "tension Ppeak vs crs ×0.5" (R45).
describe('tension pneumothorax Ppeak rise (tables H6 [TXT], catalogue §16)', () => {
  it.fails('reference run: Ppeak rises 10–20 cmH2O over the normal row (measured +21.6: 45.4 vs 23.8)', () => {
    const peak = (id: string) => { const { sig } = referenceRun(LUNG_PATHOLOGIES.find((r) => r.id === id)!); return sig.plateau + sig.peakMinusPlateau; };
    const d = peak('pneumothorax-tension') - peak('normal');
    if (process.env.PRINT) console.log(`R36 tension Ppeak rise ${d.toFixed(1)} (${peak('pneumothorax-tension').toFixed(1)} vs ${peak('normal').toFixed(1)})`);
    expect(d).toBeGreaterThanOrEqual(10);
    expect(d).toBeLessThanOrEqual(20);
  });
});
```


- [ ] **Step 2: Run to see them fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/lung-input.test.ts test/pathology-consistency.test.ts`
Expected: FAIL (relative scaling gives 33 not 50; `pleuralCmH2O` undefined on the rows).

- [ ] **Step 3: Implement**

Replace the whole of `packages/ventilator/src/lung-input.ts` with:

```ts
// engine → vent: the R27 `lungState` event IS the patient's lung. Since Stage 7b the event carries ABSOLUTE values
// (7b plan decision 15) and Stage V.1 (G7b rulings 4+5+13) reads them so: compliance, inspiratory and expiratory
// resistance (flow limitation when R_exp > R_insp, expressed as v1.9's custom factor eflK = R_insp/R_exp with no PEEP
// stenting, exactly as the catalogue rows are), and the pleural pressure the lung must be re-opened against each
// breath (tension pneumothorax, mechanics.ts). The profile's `vent` lung — the catalogue row, generated from the
// same engine data — holds until the first lungState arrives, and stays the stand-alone ventilator's lung. `effort`
// drives the patient's Pmus; shunt, dead space and FRC stay engine-side (the Dynamic Lung view shows them).
import type { EngineEvent } from '@pme/engine-core';
import type { VentConfig, VentState } from './types.ts';

export type LungStateEvent = Extract<EngineEvent, { type: 'lungState' }>;
export const LUNG_KEYS = ['compliance', 'resistance', 'efl', 'eflSeverity', 'eflK', 'peepStent', 'pleural', 'spont', 'pmus'] as const;
export type LungBase = Pick<VentConfig, (typeof LUNG_KEYS)[number]>;
export const lungBaseOf = (c: VentConfig): LungBase => ({
  compliance: c.compliance, resistance: c.resistance, efl: c.efl, eflSeverity: c.eflSeverity, eflK: c.eflK, peepStent: c.peepStent,
  pleural: c.pleural, spont: c.spont, pmus: c.pmus,
});

export const EFFORT_PMUS_CMH2O = 8; // effort 1 → Pmus 8 cmH2O [ENG: the v1.9 default spontaneous effort is 6–8]

/** One lung (C, R_insp, R_exp, pleural) → the ventilator's single compartment (catalogue rows and lungState alike). */
export function lungMechanics(m: { compliance: number; rInsp: number; rExp: number; pleural: number }): Partial<VentConfig> {
  const efl = m.rExp > m.rInsp * 1.05;
  return {
    compliance: Math.max(1, m.compliance), resistance: m.rInsp, efl, eflSeverity: efl ? 'custom' : 'moderate',
    eflK: efl ? m.rInsp / m.rExp : 0.35, peepStent: efl ? 0 : 40, pleural: Math.max(0, m.pleural),
  };
}

export interface LungLink {
  /** The lung before the first lungState (the profile's row) and the patient's own effort; a drawer/page patch moves it. */
  base: LungBase;
  /** The last lungState applied (null until the engine has sent one). */
  last: LungStateEvent | null;
}
export const createLungLink = (c: VentConfig): LungLink => ({ base: lungBaseOf(c), last: null });

export function applyLungState(vs: VentState, ll: LungLink, ls: LungStateEvent): void {
  ll.last = ls;
  const c = vs.cfg;
  const b = ll.base;
  Object.assign(c, lungMechanics({
    compliance: ls.complianceMlPerCmH2O, rInsp: ls.resistanceCmH2OPerLps,
    rExp: ls.resistanceExpCmH2OPerLps ?? ls.resistanceCmH2OPerLps, pleural: ls.pleuralCmH2O ?? 0,
  }));
  // effort only ADDS a patient: a profile that breathes keeps its own effort
  c.spont = b.spont || ls.effort > 0.05;
  c.pmus = b.spont ? b.pmus : EFFORT_PMUS_CMH2O * ls.effort;
}
```

In `packages/ventilator/src/pathology/mechanics.ts`, find:

```ts
// with a custom factor (eflK = rInsp/rExp) and no PEEP stenting, so R_exp is exactly the row's value.
import { advanceVent, createVent } from '../vent.ts';
import type { VentConfig, VentState } from '../types.ts';
import type { RecruitParams } from '../link/recruit.ts';
import { REF_SETTINGS, type LungPathology } from './catalogue.ts';

export function mechanicsToVent(row: LungPathology): Partial<VentConfig> {
  const ri = row.rInsp.value;
  const re = row.rExp.value;
  const efl = re > ri * 1.05;
  return {
    compliance: row.complianceMl.value, resistance: ri, airwayClosure: false, uip: false, stressIdx: false,
    efl, eflSeverity: efl ? 'custom' : 'moderate', eflK: efl ? ri / re : 0.35, peepStent: efl ? 0 : 40,
  };
}
```

replace with:

```ts
// with a custom factor (eflK = rInsp/rExp) and no PEEP stenting, so R_exp is exactly the row's value.
import { advanceVent, createVent } from '../vent.ts';
import type { VentConfig, VentState } from '../types.ts';
import { lungMechanics } from '../lung-input.ts';
import type { RecruitParams } from '../link/recruit.ts';
import { REF_SETTINGS, type LungPathology } from './catalogue.ts';

/** The row's lung as the ventilator's single compartment — the same mapping lungState uses (lung-input.ts). */
export function mechanicsToVent(row: LungPathology): Partial<VentConfig> {
  return {
    airwayClosure: false, uip: false, stressIdx: false,
    ...lungMechanics({ compliance: row.complianceMl.value, rInsp: row.rInsp.value, rExp: row.rExp.value, pleural: row.pleuralCmH2O ?? 0 }),
  };
}
```

In `packages/ventilator/src/pathology/catalogue.ts`, find:

```ts
  recruitP50?: number;
  signature: { plateau: Band; drivingPressure: Band; autoPeep: Band; peakMinusPlateau: Band };
  ref?: { vtMl?: number; rr?: number; peep?: number; pbwKg?: number; flowLpm?: number };
  wired: Partial<Record<'mechanics' | 'shunt' | 'deadSpace' | 'diffusion' | 'pvr' | 'hpv', Wired>>;
  monitor: string;
  pitfall: string;
```

replace with:

```ts
  recruitP50?: number;
  signature: { plateau: Band; drivingPressure: Band; autoPeep: Band; peakMinusPlateau: Band };
  ref?: { vtMl?: number; rr?: number; peep?: number; pbwKg?: number; flowLpm?: number };
  /** Stage V.1: pleural-space pressure above normal (cmH2O), generated from the engine's pPtx (ventReference). */
  pleuralCmH2O?: number;
  wired: Partial<Record<'mechanics' | 'shunt' | 'deadSpace' | 'diffusion' | 'pvr' | 'hpv', Wired>>;
  monitor: string;
  pitfall: string;
```

In `packages/ventilator/src/pathology/catalogue.ts`, find:

```ts
    complianceMl: b(18, 10, 25), rInsp: b(14, 10, 18), rExp: b(14, 10, 18), autoPeepTendency: 0,
    shunt: b(0.3, 0.2, 0.45), deadSpaceFraction: b(0.45, 0.35, 0.6), diffusionFactor: 1, pvrMultiplier: b(1.5, 1, 2.5), hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(32, 18.7, 50), drivingPressure: b(27, 13.7, 45), autoPeep: NO_AP, peakMinusPlateau: b(14, 9.7, 18) }, // Stage 7b (Task 27): signature widened to the engine-generated mechanics (gate note) // Stage 7b (Task 27): signature widened to the engine-generated mechanics (gate note) // Stage 7b (Task 27): signature widened to the engine-generated mechanics (gate note)
    wired: { ...W_STD, pvr: 'stage7a' }, monitor: 'Airway pressures climb breath by breath, SpO2 falls, then BP collapses with a high CVP (obstructive shock).',
    pitfall: 'Treated as "hypotension and hypoxaemia" without examining the chest — a framing error; decompress before imaging.',
    sources: [{ field: 'pitfall', src: 'Miller 10e pdf p. 142: "provides supportive care for hypotension and hypoxemia without further evaluation, delaying the diagnosis and treatment of tension pneumothorax."' }, { field: 'signature', src: S_MECH }],
```

replace with:

```ts
    complianceMl: b(18, 10, 25), rInsp: b(14, 10, 18), rExp: b(14, 10, 18), autoPeepTendency: 0,
    shunt: b(0.3, 0.2, 0.45), deadSpaceFraction: b(0.45, 0.35, 0.6), diffusionFactor: 1, pvrMultiplier: b(1.5, 1, 2.5), hpvSensitivity: 1,
    recruitability: 'none',
    // Stage V.1 (G7b ruling 5): plateau and ΔP back to the authored clinical bands — the ventilator now re-opens the lung
    // against the engine's pleural pressure (mechanics.ts pleuralOpening); peak − plateau keeps 7b's widening (R_insp 9.8)
    signature: { plateau: b(32, 25, 50), drivingPressure: b(27, 20, 45), autoPeep: NO_AP, peakMinusPlateau: b(14, 9.7, 18) },
    wired: { ...W_STD, pvr: 'stage7a' }, monitor: 'Airway pressures climb breath by breath, SpO2 falls, then BP collapses with a high CVP (obstructive shock).',
    pitfall: 'Treated as "hypotension and hypoxaemia" without examining the chest — a framing error; decompress before imaging.',
    sources: [{ field: 'pitfall', src: 'Miller 10e pdf p. 142: "provides supportive care for hypotension and hypoxemia without further evaluation, delaying the diagnosis and treatment of tension pneumothorax."' }, { field: 'signature', src: S_MECH }],
```

In `packages/ventilator/src/pathology/catalogue.ts`, find:

```ts
// ventilator-facing text and signature bands. Values are regenerated at load from the engine's own reference run at
// the row's PBW (ventReference: resolved Crs and Rinsp, mainstem block included); bands widen to
// include them. Rows the engine does not map, and the neonatal row (the engine data is adult-frame until R22's
// neonatal profile), keep their authored numbers.
const widen = (bd: Band, v: number): Band => ({ value: v, lo: Math.min(bd.lo, v), hi: Math.max(bd.hi, v) });
export const LUNG_PATHOLOGIES: readonly LungPathology[] = AUTHORED.map((row) => {
  const m = VENT_ROW_MAP[row.id];
```

replace with:

```ts
// ventilator-facing text and signature bands. Values are regenerated at load from the engine's own reference run at
// the row's PBW (ventReference: resolved Crs and Rinsp, mainstem block included); bands widen to
// include them. Rows the engine does not map, and the neonatal row (the engine data is adult-frame until R22's
// neonatal profile), keep their authored numbers. Stage V.1: the pleural pressure is generated too, and the fields the
// link profile's `lungConditions` now put into the engine (shunt, PVR, HPV) are wired 'engine-now'.
const NOW = (w: LungPathology['wired']): LungPathology['wired'] =>
  Object.fromEntries(Object.entries(w).map(([k, v]) => [k, v === 'stage7a' || v === 'stage7b' ? 'engine-now' : v]));
const widen = (bd: Band, v: number): Band => ({ value: v, lo: Math.min(bd.lo, v), hi: Math.max(bd.hi, v) });
export const LUNG_PATHOLOGIES: readonly LungPathology[] = AUTHORED.map((row) => {
  const m = VENT_ROW_MAP[row.id];
```

In `packages/ventilator/src/pathology/catalogue.ts`, find:

```ts
    complianceMl: widen(row.complianceMl, r1(r.crs)), rInsp: widen(row.rInsp, r1(r.rInsp)), rExp: widen(row.rExp, r1(r.rExp)),
    shunt: widen(row.shunt, Math.round((r.nonAerated + r.extraShunt) * 100) / 100),
    deadSpaceFraction: widen(row.deadSpaceFraction, Math.round((0.3 + (r.vdAlv - 0.075)) * 100) / 100),
    wired: { ...row.wired, mechanics: 'vent', deadSpace: 'engine-now', diffusion: 'engine-now' },
  };
});
```

replace with:

```ts
    complianceMl: widen(row.complianceMl, r1(r.crs)), rInsp: widen(row.rInsp, r1(r.rInsp)), rExp: widen(row.rExp, r1(r.rExp)),
    shunt: widen(row.shunt, Math.round((r.nonAerated + r.extraShunt) * 100) / 100),
    deadSpaceFraction: widen(row.deadSpaceFraction, Math.round((0.3 + (r.vdAlv - 0.075)) * 100) / 100),
    pleuralCmH2O: r.pleuralCmH2O,
    wired: { ...NOW(row.wired), mechanics: 'vent', deadSpace: 'engine-now', diffusion: 'engine-now' },
  };
});
```


- [ ] **Step 4: Run**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/lung-input.test.ts test/pathology-consistency.test.ts test/pathology-signature.test.ts test/ports.test.ts test/pleural.test.ts && npx -y pnpm@9.15.9 --filter @pme/ventilator typecheck`
Expected: PASS — `pathology-signature` 41/41 including `pneumothorax-tension` inside the RESTORED plateau/ΔP bands (plateau 35.6 in 25–50, ΔP 30.6 in 20–45; peak − plateau 9.8 in 7b's widened 9.7–18); every other row unchanged (E = 0); `pleural.test.ts` 3 tests, the Ppeak one an `it.fails` holding (`PRINT=1`: `R36 tension Ppeak rise 21.6 (45.4 vs 23.8)`). If the Ppeak rise enters 10–20 after a merge, remove the `.fails` and record the number.

- [ ] **Step 5: Commit + push** — `feat(ventilator): lungState read as absolute mechanics; catalogue rows carry the pleural pressure; tension bands restored (G7b rulings 4+5+13)`.

## Task 6: Profiles carry the engine's lung conditions; the interim shunt/recruitment and the 7a PE/tension stand-ins retire

**Goal:** Decisions 6–9: `patient.lungConditions` from `VENT_ROW_MAP` (+ severe-ARDS `recruitFrac`), cardiogenic oedema gets 7a's `hfref` 0.67, `link/recruit.ts` and the profile `shunt`/`recruit`/`condition` fields are deleted, the first tick sends only the remaining stand-ins (anaphylaxis vasoplegia, air-embolism RV lock — R41 INTERIM, no stage models them yet).

- [ ] **Step 1: Write the failing tests**

In `packages/ventilator/test/link-core.test.ts`, find:

```ts
// Link core: a profile per catalogue row; the first tick sends the profile's shunt/stand-ins and a frame;
// lungState updates the lung; the in-process lockstep link breathes the engine at the ventilator's rate.
import { describe, expect, it } from 'vitest';
import { createLinkCore, createLinkedSim, createVent, linkEvent, linkTick, LUNG_PATHOLOGIES, patchVent, PROFILES } from '../src/index.ts';

describe('link core', () => {
  it('one profile per row; the first tick sends shunt (or recruitment shunt), stand-ins, then a frame each tick', () => {
    expect(Object.keys(PROFILES).sort()).toEqual(LUNG_PATHOLOGIES.map((r) => r.id).sort());
    const pe = createLinkCore(createVent(), PROFILES['pe-massive']!);
    const first = linkTick(pe, 0.02).map((c) => c.type + ('variable' in c ? `:${c.variable}` : ''));
    // Stage 7a: massive PE is the engine's own circulation condition now (R41: the MANUAL-target stand-in is deleted)
    expect(first).toEqual(['setTarget:shunt', 'applyEvent', 'externalDrive']);
    expect(linkTick(pe, 0.02).map((c) => c.type)).toEqual(['externalDrive']);
    const ards = createLinkCore(createVent(), PROFILES['ards-moderate']!);
    // Stage 7b (Task 27): the row's compliance is generated from the engine lung data (ARDS moderate Crs 35, Pulse 35)
    expect(ards.vs.cfg.compliance).toBe(LUNG_PATHOLOGIES.find((r) => r.id === 'ards-moderate')!.complianceMl.value);
    expect(linkTick(ards, 0.02).map((c) => c.type)).toEqual(['externalDrive', 'setTarget']);
  });
  it('lungState moves the lung; a patch to the lung moves the base with it', () => {
    const core = createLinkCore(createVent(), PROFILES.normal!);
    const ev = { type: 'lungState', t: 0, complianceMlPerCmH2O: 50, resistanceCmH2OPerLps: 10, effort: 0, autoPeepTendency: 0, shunt: 0.04, deadSpaceMl: 215, frcMl: 2100 } as const;
    linkEvent(core, ev);
    linkEvent(core, { ...ev, resistanceCmH2OPerLps: 40 });
    expect(core.vs.cfg.resistance).toBe(40);
    patchVent(core, { compliance: 20, resistance: 10 });
    linkEvent(core, { ...ev, resistanceCmH2OPerLps: 40, shunt: 0.1 }); // still bronchospastic: ×4 of the NEW base
    expect([core.vs.cfg.compliance, core.vs.cfg.resistance]).toEqual([20, 40]);
  });
  // One sim-minute of engine + ventilator: ≈ 2 s alone, 8.6 s when `pnpm -r test` runs the packages in parallel —
  // the CI budget (G2) instead of Vitest's 5 s default.
```

replace with:

```ts
// Link core: a profile per catalogue row carrying the row's engine lung conditions (Stage V.1); the first tick sends
// the circulation condition/stand-ins and a frame; lungState IS the lung; the in-process lockstep link breathes the
// engine at the ventilator's rate.
import { describe, expect, it } from 'vitest';
import { createLinkCore, createLinkedSim, createVent, linkEvent, linkTick, LUNG_PATHOLOGIES, patchVent, PROFILES } from '../src/index.ts';

describe('link core', () => {
  it('one profile per row, carrying its engine lung conditions; the first tick sends the remaining stand-ins, then a frame each tick — never a shunt target or a 7a PE/tension condition (V.1)', () => {
    expect(Object.keys(PROFILES).sort()).toEqual(LUNG_PATHOLOGIES.map((r) => r.id).sort());
    expect(PROFILES['ards-moderate']!.patient.lungConditions).toEqual([{ id: 'ards', severity: 0.67 }]);
    expect(PROFILES['ards-severe-recruitable']!.patient.lungConditions).toEqual([{ id: 'ards', severity: 1, recruitFrac: 0.5 }]);
    expect(PROFILES['one-lung-ventilation']!.patient.lungConditions).toEqual([{ id: 'olv', severity: 1, side: 'L' }]);
    expect(PROFILES.normal!.patient.lungConditions).toBeUndefined();
    expect(PROFILES['pe-massive']!.patient.lungConditions).toEqual([{ id: 'pe', severity: 1 }]);
    const ana = createLinkCore(createVent(), PROFILES['anaphylaxis-bronchospasm']!);
    // the vasoplegia stand-in (R41 INTERIM) stays; massive PE and tension send nothing but frames (their lung condition acts)
    expect(linkTick(ana, 0.02).map((c) => c.type + ('variable' in c ? `:${c.variable}` : ''))).toEqual(['setTarget:sbp', 'setTarget:dbp', 'setTarget:cvp', 'setTarget:hr', 'externalDrive']);
    expect(linkTick(ana, 0.02).map((c) => c.type)).toEqual(['externalDrive']);
    for (const id of ['pe-massive', 'pneumothorax-tension']) expect(linkTick(createLinkCore(createVent(), PROFILES[id]!), 0.02).map((c) => c.type), id).toEqual(['externalDrive']);
    const ards = createLinkCore(createVent(), PROFILES['ards-moderate']!);
    // Stage 7b (Task 27): the row's compliance is generated from the engine lung data (ARDS moderate Crs 35, Pulse 35)
    expect(ards.vs.cfg.compliance).toBe(LUNG_PATHOLOGIES.find((r) => r.id === 'ards-moderate')!.complianceMl.value);
    expect(linkTick(ards, 0.02).map((c) => c.type)).toEqual(['externalDrive']);
    for (const p of Object.values(PROFILES)) {
      const core = createLinkCore(createVent(), p);
      const cmds = [...linkTick(core, 0.02), ...linkTick(core, 0.02)];
      expect(cmds.some((c) => ('variable' in c && c.variable === 'shunt') || (c.type === 'applyEvent' && (c as { event: { kind: string } }).event.kind === 'condition')), p.id).toBe(false);
    }
  });
  it('lungState is the lung (absolute); a page patch to the lung holds only until the next lungState', () => {
    const core = createLinkCore(createVent(), PROFILES.normal!);
    const ev = { type: 'lungState', t: 0, complianceMlPerCmH2O: 50, resistanceCmH2OPerLps: 10, effort: 0, autoPeepTendency: 0, shunt: 0.04, deadSpaceMl: 215, frcMl: 2100 } as const;
    linkEvent(core, ev);
    linkEvent(core, { ...ev, resistanceCmH2OPerLps: 40 });
    expect(core.vs.cfg.resistance).toBe(40);
    patchVent(core, { compliance: 20, resistance: 10 });
    expect([core.vs.cfg.compliance, core.vs.cfg.resistance]).toEqual([20, 10]);
    linkEvent(core, { ...ev, resistanceCmH2OPerLps: 40, shunt: 0.1 });
    expect([core.vs.cfg.compliance, core.vs.cfg.resistance]).toEqual([50, 40]);
  });
  // One sim-minute of engine + ventilator: ≈ 2 s alone, 8.6 s when `pnpm -r test` runs the packages in parallel —
  // the CI budget (G2) instead of Vitest's 5 s default.
```


- [ ] **Step 2: Run to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/link-core.test.ts -t "profile|lungState"`
Expected: FAIL (`lungConditions` undefined; a `setTarget shunt` in the first tick).

- [ ] **Step 3: Implement**

In `packages/ventilator/src/link/profiles.ts`, find:

```ts
// Link profiles: one per lung-pathology row (pathology/catalogue.ts). Each has
//  • `patient` — the engine PatientProfile using ONLY fields on main today (ageY, weightKg, heightCm, sex,
//                baseline StateVars, sensors). Obesity reaches the engine's FRC rule; nothing else does yet.
//  • `vent`    — the ventilator's lung (mechanicsToVent) plus the row's reference settings when it has its own
//                (neonate, one-lung ventilation) — the BASE that lungState modulates (lung-input.ts).
//  • `recruit` — the interim PEEP → shunt curve (link/recruit.ts), or null; `shunt` is sent once when null.
//  • `standIn` — engine targets set at link start that STAND IN for Stage 7a physiology the engine lacks
//                (RV failure in massive PE, obstructive shock in tension pneumothorax, vasoplegia in anaphylaxis).
// STAGE 7 TARGETS (R22/R24/R31/R36): pvrMultiplier/hpvSensitivity (7a), dead space/diffusion (7b), and the
// profile mechanics themselves move into lungState; `standIn` is deleted when 7a lands.
import type { PatientProfile, StateVar } from '@pme/engine-core';
import type { VentConfig } from '../types.ts';
import { LUNG_PATHOLOGIES, type LungPathology } from '../pathology/catalogue.ts';
import { mechanicsToVent, recruitOf } from '../pathology/mechanics.ts';
import type { RecruitParams } from './recruit.ts';

export type ProfileId = string;
/** An engine target set over `rampS` seconds; in MANUAL mode pressures are targets, so shock is set, not caused. */
```

replace with:

```ts
// Link profiles: one per lung-pathology row (pathology/catalogue.ts). Each has
//  • `patient` — the engine PatientProfile; since Stage V.1 (G7b rulings 4+5+13) it carries the row's engine
//                `lungConditions` (VENT_ROW_MAP: condition, severity, side, recruitability), so shunt, recruitment,
//                dead space, PVR/HPV and pleural pressure are the 7b lungs' own and lungState is read as absolute.
//  • `vent`    — the ventilator's lung before the first lungState (mechanicsToVent: the row, generated from the
//                same engine data) plus the row's reference settings when it has its own (neonate, OLV).
//  • `standIn` — engine targets set at link start that STAND IN for physiology no stage models yet (vasoplegia in
//                anaphylaxis, RV outflow air lock in air embolism). Massive PE and tension pneumothorax no longer
//                send 7a's circulation condition: the lung conditions carry PVR ×3.25 (7a's `pe` 0.75 was ×4.0 —
//                one PE PVR source is FU-4 G6's) / +20 mmHg pleural (V.1).
import type { LungConditionSpec, PatientProfile, StateVar } from '@pme/engine-core';
import { VENT_ROW_MAP } from '@pme/engine-core';
import type { VentConfig } from '../types.ts';
import { LUNG_PATHOLOGIES, type LungPathology } from '../pathology/catalogue.ts';
import { mechanicsToVent } from '../pathology/mechanics.ts';

export type ProfileId = string;
/** An engine target set over `rampS` seconds; in MANUAL mode pressures are targets, so shock is set, not caused. */
```

In `packages/ventilator/src/link/profiles.ts`, find:

```ts
  group: LungPathology['group'];
  patient: PatientProfile;
  vent: Partial<VentConfig>;
  recruit: RecruitParams | null;
  shunt: number;
  standIn: StandIn[];
  /** Stage 7a: a circulation condition the engine now models (replaces the MANUAL-target stand-in for that row). */
  condition?: CircConditionStandIn;
  /** Fields this row carries that the engine cannot act on yet (shown in the picker tooltip and the gate note). */
  stage7: string;
}
```

replace with:

```ts
  group: LungPathology['group'];
  patient: PatientProfile;
  vent: Partial<VentConfig>;
  standIn: StandIn[];
  /** Fields this row carries that the engine cannot act on yet (shown in the picker tooltip and the gate note). */
  stage7: string;
}
```

In `packages/ventilator/src/link/profiles.ts`, find:

```ts
  pregnancy: { ageY: 30, weightKg: 80, heightCm: 165, sex: 'F', sensors: SENSORS, baseline: { hr: 92 } },
  'neonatal-rds': { ageY: 0.01, weightKg: 3, heightCm: 50, sex: 'M', sensors: SENSORS, baseline: { hr: 150, sbp: 55, dbp: 32 } },
  'copd-gold-3-4': { ...ADULT, ageY: 68, baseline: { volumeStatus: 0.6 } },
  'oedema-cardiogenic': { ...ADULT, ageY: 70, baseline: { volumeStatus: 0.8 } },
};
const shock = (sbp: number, dbp: number, cvp: number, hr: number): StandIn[] =>
  ([['sbp', sbp], ['dbp', dbp], ['cvp', cvp], ['hr', hr]] as const).map(([variable, value]) => ({ variable, value, rampS: 20 }));
/** Stage 7a replaced two stand-ins with its own circulation conditions (R41: "deleted when 7a lands"). */
export interface CircConditionStandIn { id: 'pe' | 'tensionPtx'; severity: number }
export const CIRC_CONDITIONS: Record<string, CircConditionStandIn> = {
  'pe-massive': { id: 'pe', severity: 0.75 }, // φ 0.6: PVR ×4, RV failure → low CO (7a conditions.ts)
  'pneumothorax-tension': { id: 'tensionPtx', severity: 1 }, // +20 mmHg pleural: obstructive shock
};
/** INTERIM (R41; deleted when Stage 7a's right heart consumes pvrMultiplier): Stage 7a/7g stand-ins [ENG] — the haemodynamic picture each condition produces, set as MANUAL targets. */
export const STAND_INS: Record<string, StandIn[]> = {
  'anaphylaxis-bronchospasm': shock(70, 35, 3, 125), // vasoplegia (Stage 7g)
```

replace with:

```ts
  pregnancy: { ageY: 30, weightKg: 80, heightCm: 165, sex: 'F', sensors: SENSORS, baseline: { hr: 92 } },
  'neonatal-rds': { ageY: 0.01, weightKg: 3, heightCm: 50, sex: 'M', sensors: SENSORS, baseline: { hr: 150, sbp: 55, dbp: 32 } },
  'copd-gold-3-4': { ...ADULT, ageY: 68, baseline: { volumeStatus: 0.6 } },
  // Stage V.1 (G7a NR-3 → G7b ruling 4+5+13): cardiogenic oedema is LV failure — 7a's hfref, moderate
  'oedema-cardiogenic': { ...ADULT, ageY: 70, baseline: { volumeStatus: 0.8 }, conditions: [{ id: 'hfref', severity: 0.67 }] },
};
const shock = (sbp: number, dbp: number, cvp: number, hr: number): StandIn[] =>
  ([['sbp', sbp], ['dbp', dbp], ['cvp', cvp], ['hr', hr]] as const).map(([variable, value]) => ({ variable, value, rampS: 20 }));
/**
 * 7a's own circulation condition for massive PE (φ 0.6, PE_VASO 1.0: PVR ×4.0). Stage V.1: NO profile sends it any
 * more — the profile's lung `pe` (severity 1) carries PVR ×3.25 (data §18, the tables' peVaso 0.5 [ENG]) into 7a
 * through the lungs' PVR seam, plus the alveolar dead space; sending both multiplies PVR by 4.0 × 3.25 ≈ 13 (CO 1.19).
 * With the lung `pe` alone the MANUAL profile shows no obstructive picture (CO 5.37): one PE event with one PVR
 * source is FU-4 G6's (V.1 plan Decision 7). Kept for the R36 massive-PE test, whose rig NR-3 closed (it sends both
 * until FU-4 unifies the PE event). Tension pneumothorax: the lungs' `ptxTension` pPtx reaches 7a through respPleural.
 */
export interface CircConditionStandIn { id: 'pe' | 'tensionPtx'; severity: number }
export const CIRC_CONDITIONS: Record<string, CircConditionStandIn> = {
  'pe-massive': { id: 'pe', severity: 0.75 },
};
/** Recruitability of the two severe-ARDS rows (catalogue §6: high recruiter 0.5, low 0.15; VENT_ROW_MAP carries the mean). */
const RECRUIT_FRAC: Record<string, number> = { 'ards-severe-recruitable': 0.5, 'ards-severe-nonrecruitable': 0.15 };
/** The row's engine lung conditions (Stage V.1): none for 'normal' and 'atelectasis' (the induction atelectasis is dynamic). */
export function lungConditionsOf(id: string): LungConditionSpec[] {
  const m = VENT_ROW_MAP[id];
  if (!m) return [];
  const rf = RECRUIT_FRAC[id];
  return [{ id: m.id as LungConditionSpec['id'], severity: m.severity, ...(m.side ? { side: m.side } : {}), ...(rf !== undefined ? { recruitFrac: rf } : {}) }];
}
/** INTERIM (R41; deleted when Stage 7a's right heart consumes pvrMultiplier): Stage 7a/7g stand-ins [ENG] — the haemodynamic picture each condition produces, set as MANUAL targets. */
export const STAND_INS: Record<string, StandIn[]> = {
  'anaphylaxis-bronchospasm': shock(70, 35, 3, 125), // vasoplegia (Stage 7g)
```

In `packages/ventilator/src/link/profiles.ts`, find:

```ts
    ? { ...(ref.vtMl !== undefined ? { vt: ref.vtMl } : {}), ...(ref.rr !== undefined ? { rate: ref.rr } : {}), ...(ref.peep !== undefined ? { peep: ref.peep } : {}), ...(ref.flowLpm !== undefined ? { vcFlow: ref.flowLpm } : {}) }
    : {};
  const later = Object.entries(row.wired).filter(([, w]) => w === 'stage7a' || w === 'stage7b' || w === 'not-modelled').map(([k, w]) => `${k}: ${w}`);
  return {
    id: row.id, label: row.label, group: row.group, patient: PATIENTS[row.id] ?? ADULT,
    vent: { ...mechanicsToVent(row), ...refVent }, recruit: recruitOf(row), shunt: row.shunt.value,
    standIn: STAND_INS[row.id] ?? [], ...(CIRC_CONDITIONS[row.id] ? { condition: CIRC_CONDITIONS[row.id] } : {}), stage7: later.join(', '),
  };
}
```

replace with:

```ts
    ? { ...(ref.vtMl !== undefined ? { vt: ref.vtMl } : {}), ...(ref.rr !== undefined ? { rate: ref.rr } : {}), ...(ref.peep !== undefined ? { peep: ref.peep } : {}), ...(ref.flowLpm !== undefined ? { vcFlow: ref.flowLpm } : {}) }
    : {};
  const later = Object.entries(row.wired).filter(([, w]) => w === 'stage7a' || w === 'stage7b' || w === 'not-modelled').map(([k, w]) => `${k}: ${w}`);
  const lc = lungConditionsOf(row.id);
  return {
    id: row.id, label: row.label, group: row.group, patient: { ...(PATIENTS[row.id] ?? ADULT), ...(lc.length ? { lungConditions: lc } : {}) },
    vent: { ...mechanicsToVent(row), ...refVent },
    standIn: STAND_INS[row.id] ?? [], stage7: later.join(', '),
  };
}
```

In `packages/ventilator/src/link/core.ts`, find:

```ts
// The transport-agnostic half of the R27 link: what the ventilator side sends every 20 ms tick, and what it does
// with the engine's events. Both the in-process link (in-process.ts) and the window link (port.ts) use it.
//   vent → engine: one `externalDrive` VentFrame per tick (50 Hz, the R27 ceiling); at start the profile's shunt
//                  (or the interim recruitment model's, whenever it moves) and its Stage 7 stand-ins; `applyEvent airway disconnected|patent` when the
//                  circuit is opened/closed at the Y-piece (so EtCO2 goes flat at once, Stage 3 M4).
//   engine → vent: `lungState` → applyLungState (lung-input.ts).
import type { Command, EngineEvent } from '@pme/engine-core';
import { applyLungState, createLungLink, LUNG_KEYS, lungBaseOf, type LungLink } from '../lung-input.ts';
import type { VentConfig } from '../types.ts';
import { toVentFrame } from '../frame.ts';
import { modeName } from '../presets.ts';
import type { VentState } from '../types.ts';
import { createRecruit, stepRecruit, type RecruitState } from './recruit.ts';
import type { LinkProfile } from './profiles.ts';

export const LINK_TICK_S = 0.02; // the engine tick; one frame per tick = 50 Hz
```

replace with:

```ts
// The transport-agnostic half of the R27 link: what the ventilator side sends every 20 ms tick, and what it does
// with the engine's events. Both the in-process link (in-process.ts) and the window link (port.ts) use it.
//   vent → engine: one `externalDrive` VentFrame per tick (50 Hz, the R27 ceiling); at start the profile's remaining
//                  stand-ins; `applyEvent airway disconnected|patent` when the circuit is
//                  opened/closed at the Y-piece (so EtCO2 goes flat at once, Stage 3 M4). The lung itself — shunt,
//                  recruitment, pleural pressure — is the engine's (the profile's `lungConditions`, Stage V.1).
//   engine → vent: `lungState` → applyLungState (lung-input.ts), read as absolute values.
import type { Command, EngineEvent } from '@pme/engine-core';
import { applyLungState, createLungLink, LUNG_KEYS, lungBaseOf, type LungLink } from '../lung-input.ts';
import type { VentConfig } from '../types.ts';
import { toVentFrame } from '../frame.ts';
import { modeName } from '../presets.ts';
import type { VentState } from '../types.ts';
import type { LinkProfile } from './profiles.ts';

export const LINK_TICK_S = 0.02; // the engine tick; one frame per tick = 50 Hz
```

In `packages/ventilator/src/link/core.ts`, find:

```ts
  vs: VentState;
  lung: LungLink;
  profile: LinkProfile;
  recruit: RecruitState | null;
  circuitSent: 'connected' | 'disconnected';
  started: boolean;
  seq: number;
```

replace with:

```ts
  vs: VentState;
  lung: LungLink;
  profile: LinkProfile;
  circuitSent: 'connected' | 'disconnected';
  started: boolean;
  seq: number;
```

In `packages/ventilator/src/link/core.ts`, find:

```ts
  Object.assign(vs.cfg, profile.vent);
  return {
    vs, lung: createLungLink(vs.cfg), profile,
    recruit: profile.recruit ? createRecruit(profile.recruit, vs.cfg.peep) : null,
    circuitSent: 'connected', started: false, seq: 0,
  };
}
```

replace with:

```ts
  Object.assign(vs.cfg, profile.vent);
  return {
    vs, lung: createLungLink(vs.cfg), profile,
    circuitSent: 'connected', started: false, seq: 0,
  };
}
```

In `packages/ventilator/src/link/core.ts`, find:

```ts
const mk = (core: LinkCore, body: Record<string, unknown>): Command => ({ id: `vent-${++core.seq}`, issuedBy: 'ventilator', ...body }) as Command;

/** Commands for the engine after the ventilator has advanced to the current tick. */
export function linkTick(core: LinkCore, dt: number): Command[] {
  const vs = core.vs;
  const out: Command[] = [];
  if (!core.started) { // the profile's fixed shunt and Stage 7 stand-ins, once
    core.started = true;
    if (!core.recruit) out.push(mk(core, { type: 'setTarget', variable: 'shunt', value: core.profile.shunt }));
    for (const s of core.profile.standIn) out.push(mk(core, { type: 'setTarget', variable: s.variable, value: s.value, ramp: { durationS: s.rampS } }));
    const cond = core.profile.condition; // Stage 7a: the engine's own circulation condition
    if (cond) out.push(mk(core, { type: 'applyEvent', event: { kind: 'condition', id: cond.id, severity: cond.severity } }));
  }
  if (vs.circuit !== core.circuitSent) {
    core.circuitSent = vs.circuit;
    out.push(mk(core, { type: 'applyEvent', event: { kind: 'airway', state: vs.circuit === 'disconnected' ? 'disconnected' : 'patent' } }));
  }
  out.push(mk(core, { type: 'externalDrive', source: 'ventilator', frame: toVentFrame(vs, modeName(vs.cfg)) }));
  if (core.recruit && core.profile.recruit) {
    const totalPeep = vs.circuit === 'disconnected' ? 0 : vs.cfg.peep + vs.p.measured.autoPEEP;
    const sh = stepRecruit(core.recruit, core.profile.recruit, totalPeep, dt);
    if (sh !== null) out.push(mk(core, { type: 'setTarget', variable: 'shunt', value: sh }));
  }
  return out;
}
```

replace with:

```ts
const mk = (core: LinkCore, body: Record<string, unknown>): Command => ({ id: `vent-${++core.seq}`, issuedBy: 'ventilator', ...body }) as Command;

/** Commands for the engine after the ventilator has advanced to the current tick. */
export function linkTick(core: LinkCore, _dt: number): Command[] {
  const vs = core.vs;
  const out: Command[] = [];
  if (!core.started) { // the profile's remaining stand-ins, once (Stage V.1: the lung, PE and tension are the engine's)
    core.started = true;
    for (const s of core.profile.standIn) out.push(mk(core, { type: 'setTarget', variable: s.variable, value: s.value, ramp: { durationS: s.rampS } }));
  }
  if (vs.circuit !== core.circuitSent) {
    core.circuitSent = vs.circuit;
    out.push(mk(core, { type: 'applyEvent', event: { kind: 'airway', state: vs.circuit === 'disconnected' ? 'disconnected' : 'patent' } }));
  }
  out.push(mk(core, { type: 'externalDrive', source: 'ventilator', frame: toVentFrame(vs, modeName(vs.cfg)) }));
  return out;
}
```

In `packages/ventilator/src/index.ts`, find:

```ts
export * from './alarms.ts';
export * from './frame.ts';
export * from './lung-input.ts';
export * from './link/recruit.ts';
export * from './pathology/catalogue.ts';
export * from './pathology/mechanics.ts';
export * from './link/profiles.ts';
```

replace with:

```ts
export * from './alarms.ts';
export * from './frame.ts';
export * from './lung-input.ts';
export * from './pathology/catalogue.ts';
export * from './pathology/mechanics.ts';
export * from './link/profiles.ts';
```

In `packages/ventilator/src/pathology/mechanics.ts`, find:

```ts
import { advanceVent, createVent } from '../vent.ts';
import type { VentConfig, VentState } from '../types.ts';
import { lungMechanics } from '../lung-input.ts';
import type { RecruitParams } from '../link/recruit.ts';
import { REF_SETTINGS, type LungPathology } from './catalogue.ts';

/** The row's lung as the ventilator's single compartment — the same mapping lungState uses (lung-input.ts). */
```

replace with:

```ts
import { advanceVent, createVent } from '../vent.ts';
import type { VentConfig, VentState } from '../types.ts';
import { lungMechanics } from '../lung-input.ts';
import { REF_SETTINGS, type LungPathology } from './catalogue.ts';

/** The row's lung as the ventilator's single compartment — the same mapping lungState uses (lung-input.ts). */
```

In `packages/ventilator/src/pathology/mechanics.ts`, find:

```ts
    airwayClosure: false, uip: false, stressIdx: false,
    ...lungMechanics({ compliance: row.complianceMl.value, rInsp: row.rInsp.value, rExp: row.rExp.value, pleural: row.pleuralCmH2O ?? 0 }),
  };
}

/** PEEP recruitment for the link (link/recruit.ts): shunt spans the row's band; none when not recruitable. */
export function recruitOf(row: LungPathology): RecruitParams | null {
  if (row.recruitability === 'none' || row.recruitP50 === undefined) return null;
  const k = { high: 2, moderate: 2.5, low: 4 }[row.recruitability];
  return { shuntMax: row.shunt.hi, shuntMin: row.shunt.lo, p50: row.recruitP50, k };
}

export interface Signature { plateau: number; drivingPressure: number; autoPeep: number; peakMinusPlateau: number }
```

replace with:

```ts
    airwayClosure: false, uip: false, stressIdx: false,
    ...lungMechanics({ compliance: row.complianceMl.value, rInsp: row.rInsp.value, rExp: row.rExp.value, pleural: row.pleuralCmH2O ?? 0 }),
  };
}

export interface Signature { plateau: number; drivingPressure: number; autoPeep: number; peakMinusPlateau: number }
```

Run `git rm packages/ventilator/src/link/recruit.ts`.


- [ ] **Step 4: Run**

Run: `npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/link-core.test.ts && npx -y pnpm@9.15.9 typecheck`
Expected: PASS (3 tests); whole-repo typecheck clean (apps/demo's `demos.ts` still imports `STAND_INS` — it exists).

- [ ] **Step 5: Commit + push** — `feat(ventilator): link profiles carry the 7b lung conditions; interim shunt/recruitment and the 7a PE/tension stand-ins retired (G7b ruling 4, R41)`.

## Task 7: The link demonstrations on the real lungs (tension, oedema, ARDS)

**Goal:** re-specify the R36 tension test onto the engine's `ptxTension` and add the tension-profile test that closes the calibration row; put the PH-crisis numbers in its title (Decision 22); re-specify the oedema test per the G7b ruling (Decision 9: the shunt/PCWP test and the SpO2 `it.fails` at FiO2 0.4, plus the FiO2 0.21 variant of Decision 18, all on runs made in a `beforeAll`); put the measured recruitment numbers in the ARDS `it.fails` title.

- [ ] **Step 1: Write the failing tests**

In `packages/ventilator/test/helpers.ts`, find:

```ts
export const truth = (ev: EngineEvent[], v: StateVar, t0: number, t1: number): number[] =>
  ev.flatMap((x) => (x.type === 'state' && x.t >= t0 && x.t <= t1 && x.values[v] !== undefined ? [x.values[v] as number] : []));
export const co = (s: LinkedSim): number => cardiacOutput((s.engine.snapshot().state as { st: { hemo: HemoState } }).st.hemo, s.now());
/** Advance to t one sim-minute at a time, yielding between chunks (CI rule, G2). */
export async function run(s: LinkedSim, t: number): Promise<void> {
  while (s.now() < t - 1e-9) {
```

replace with:

```ts
export const truth = (ev: EngineEvent[], v: StateVar, t0: number, t1: number): number[] =>
  ev.flatMap((x) => (x.type === 'state' && x.t >= t0 && x.t <= t1 && x.values[v] !== undefined ? [x.values[v] as number] : []));
export const co = (s: LinkedSim): number => cardiacOutput((s.engine.snapshot().state as { st: { hemo: HemoState } }).st.hemo, s.now());
/** Stage V.1: PCWP = 7a's pulmonary venous pressure, the `pawp` truth (hemo pipeline: values.pawp = circOut.pPv; wedge = pPv). */
export const pcwp = (s: LinkedSim): number => (s.engine.snapshot().state as { st: { hemo: HemoState } }).st.hemo.circOut.pPv;
/** Stage V.1: the engine's lungState shunt now (the 7b lungs' own, absolute). */
export const lungShunt = (s: LinkedSim): number => (s.events.filter((e) => e.type === 'lungState').at(-1) as { shunt: number } | undefined)?.shunt ?? Number.NaN;
/** Advance to t one sim-minute at a time, yielding between chunks (CI rule, G2). */
export async function run(s: LinkedSim, t: number): Promise<void> {
  while (s.now() < t - 1e-9) {
```

In `packages/ventilator/test/link-r36.test.ts`, find:

```ts
    expect(a.map - b.map).toBeGreaterThanOrEqual(8);
  });

  it('tension pneumothorax: plateau rises ≥ 10 cmH2O, SpO2 falls ≥ 4, MAP falls ≥ 20 with CVP rising ≥ 5', async () => {
    const s = createLinkedSim({ profile: 'pneumothorax-simple', vent: { pmax: 60 } });
    await run(s, 120);
    const a = snap(s, 90, 120);
    s.set({ compliance: 18, resistance: 14 });
    standIn(s, 'pneumothorax-tension');
    s.send({ type: 'setTarget', variable: 'shunt', value: 0.3 });
    await run(s, 240);
    const b = snap(s, 210, 240);
    log('ptx simple', a); log('ptx tension', b);
    expect(b.plat - a.plat).toBeGreaterThanOrEqual(10);
    expect(a.spo2 - b.spo2).toBeGreaterThanOrEqual(4);
    expect(a.map - b.map).toBeGreaterThanOrEqual(20);
    expect(b.cvp - a.cvp).toBeGreaterThanOrEqual(5);
  });

  // NEEDS A RULING NR-3: the PE stand-in is now Stage 7a's own condition (φ 0.6): CO −8 %, EtCO2 unchanged — the EtCO2 fall
```

replace with:

```ts
    expect(a.map - b.map).toBeGreaterThanOrEqual(8);
  });

  // Stage V.1 (G7b rulings 4+5+13): the tension is the engine's own lung condition — ptxTension replaces ptxSimple;
  // its pleural pressure reaches 7a through respPleural and the ventilator through lungState.pleuralCmH2O. The
  // compliance patch, the MANUAL shunt 0.3 and 7a's tensionPtx stand-in are retired.
  it('tension pneumothorax: plateau rises ≥ 10 cmH2O into the catalogue band 25–50, SpO2 falls ≥ 4, MAP falls ≥ 20 with CVP rising ≥ 5', async () => {
    const s = createLinkedSim({ profile: 'pneumothorax-simple', vent: { pmax: 60 } });
    await run(s, 120);
    const a = snap(s, 90, 120);
    s.send({ type: 'applyEvent', event: { kind: 'lungCondition', id: 'ptxSimple', severity: 0 } });
    s.send({ type: 'applyEvent', event: { kind: 'lungCondition', id: 'ptxTension', severity: 0.8 } });
    await run(s, 240);
    const b = snap(s, 210, 240);
    log('ptx simple', a); log('ptx tension', b);
    expect(b.plat - a.plat).toBeGreaterThanOrEqual(10);
    expect(b.plat).toBeGreaterThanOrEqual(25);
    expect(b.plat).toBeLessThanOrEqual(50);
    expect(a.spo2 - b.spo2).toBeGreaterThanOrEqual(4);
    expect(a.map - b.map).toBeGreaterThanOrEqual(20);
    expect(b.cvp - a.cvp).toBeGreaterThanOrEqual(5);
  });

  it('tension-pneumothorax profile (G7b ruling 5, calibration row "tension-ptx ventilator plateau"): plateau 25–50, ΔP 20–45 on the engine\'s lungs', async () => {
    const s = createLinkedSim({ profile: 'pneumothorax-tension', vent: { pmax: 60 } });
    await run(s, 90);
    const m = s.vs.p.measured;
    const ls = [...s.events].reverse().find((e) => e.type === 'lungState') as { pleuralCmH2O?: number } | undefined;
    if (process.env.PRINT) console.log(`R36 tension profile: plat ${m.PLAT.toFixed(1)} ΔP ${(m.PLAT - s.vs.cfg.peep).toFixed(1)} pip ${m.PIP.toFixed(1)} C ${s.vs.cfg.compliance} pleural ${ls?.pleuralCmH2O}`);
    expect(ls?.pleuralCmH2O).toBeCloseTo(27.2, 0);
    expect(m.PLAT).toBeGreaterThanOrEqual(25);
    expect(m.PLAT).toBeLessThanOrEqual(50);
    expect(m.PLAT - s.vs.cfg.peep).toBeGreaterThanOrEqual(20);
    expect(m.PLAT - s.vs.cfg.peep).toBeLessThanOrEqual(45);
  });

  // NEEDS A RULING NR-3: the PE stand-in is now Stage 7a's own condition (φ 0.6): CO −8 %, EtCO2 unchanged — the EtCO2 fall
```

PH crisis (Decision 22): an ordinary test with the measured numbers in its title.

In `packages/ventilator/test/link-r36.test.ts`, find:

```ts
  it('PH crisis: PEEP 15 + RR 8 → EtCO2 rises ≥ 5 mmHg, CVP rises ≥ 1.5, MAP falls ≥ 8 (RV signature waits for 7a)', async () => {
    const s = createLinkedSim({ profile: 'pulmonary-hypertension' });
```

replace with:

```ts
  // Orchestrator ruling (V.1 review) 7: the profile now carries 7b's `ph` lungs on 7a's right heart; EtCO2 +5.0 sits on
  // the band edge (was +6.8) — calibration row. If a merge takes it below +5 → it.fails with the numbers (R45).
  it('PH crisis: PEEP 15 + RR 8 → EtCO2 rises ≥ 5 mmHg, CVP rises ≥ 1.5, MAP falls ≥ 8 (V.1 on the 7b `ph` lungs: +5.0 / +2.1 / −11.1; EtCO2 on the band edge, calibration row)', async () => {
    const s = createLinkedSim({ profile: 'pulmonary-hypertension' });
```

In `packages/ventilator/test/link-r27.test.ts`, find:

```ts
// patient engine within physiological time constants. Numbers printed with PRINT=1 feed docs/gates/stage-V.md.
import { describe, expect, it } from 'vitest';
import { createLinkedSim } from '../src/index.ts';
import { fmt, run, snap } from './helpers.ts';

const log = (tag: string, o: Record<string, number>) => { if (process.env.PRINT) console.log(`LINK ${tag}: ${fmt(o)}`); };
```

replace with:

```ts
// patient engine within physiological time constants. Numbers printed with PRINT=1 feed docs/gates/stage-V.md.
import { beforeAll, describe, expect, it } from 'vitest';
import { createLinkedSim } from '../src/index.ts';
import { fmt, lungShunt, pcwp, run, snap } from './helpers.ts';

const log = (tag: string, o: Record<string, number>) => { if (process.env.PRINT) console.log(`LINK ${tag}: ${fmt(o)}`); };
```

In `packages/ventilator/test/link-r27.test.ts`, find:

```ts

  // NEEDS A RULING (Stage 7b gate note): on main (7a) the SpO2 fall 60 s after PEEP 15 → 5 was 98 → 94.6 (−3.4); with 7b's
  // two O2 stores it is 98 → 95.0 (−3.0), exactly at the band edge (> 3). Main before 7a: −5. it.fails keeps CI green and flags it.
  it.fails('ARDS moderate PEEP 5 → 15 (FiO2 0.6): SpO2 rises ≥ 5 over 1–4 min (recruitment), falls again within 60 s of PEEP 5', async () => {
    const s = createLinkedSim({ profile: 'ards-moderate', vent: { vt: 420, pmax: 45, fio2: 60 } });
    await run(s, 180);
    const a = snap(s, 150, 180);
```

replace with:

```ts

  // NEEDS A RULING (Stage 7b gate note): on main (7a) the SpO2 fall 60 s after PEEP 15 → 5 was 98 → 94.6 (−3.4); with 7b's
  // two O2 stores it is 98 → 95.0 (−3.0), exactly at the band edge (> 3). Main before 7a: −5. it.fails keeps CI green and flags it.
  // Stage V.1 (G7b ruling 4+5+13): the interim link recruitment (logistic PEEP → shunt, τ 40/10 s) is retired; the 7b lungs
  // recruit on their own (R46: PEEP alone −20 % shunt, de-recruitment τ 2 min), so the band — fitted to the interim curve —
  // is further away: SpO2 94.5 → 96.0 at PEEP 15 (+1.5 vs ≥ 5) and 96.0 60 s after PEEP 5 (0 vs > 3). Stays it.fails (R45);
  // calibration row "ARDS link band: re-derive from 7b's recruitment" (orchestrator ruling (V.1 review) 2).
  it.fails('ARDS moderate PEEP 5 → 15 (FiO2 0.6): SpO2 rises ≥ 5 over 1–4 min (recruitment), falls again within 60 s of PEEP 5 (measured +1.5 / 0.0 on the 7b lungs)', async () => {
    const s = createLinkedSim({ profile: 'ards-moderate', vent: { vt: 420, pmax: 45, fio2: 60 } });
    await run(s, 180);
    const a = snap(s, 150, 180);
```

In `packages/ventilator/test/link-r27.test.ts`, find:

```ts
    expect(c.spo2).toBeLessThan(b.spo2 - 3);
  });

  // NEEDS A RULING NR-3 (docs/gates/stage-7a.md): heart–lung interaction is emergent on the Stage 7a circulation
  // (pleural input, T_IT 0.65) instead of Stage 3's MANUAL Paw coupling; measured: COPD auto-PEEP 9.9 → MAP −9.4 (CO −12 %);
  // oedema (70 y, no HF condition in the profile) PEEP 5 → 12: SpO2 +3, CO 4.65 → 4.66. it.fails keeps CI green and flags it.
  // Stage 7b: tried giving the link profile 7a's `hfref` (moderate): PEEP 5 → 12 still leaves CO 5.08 vs 4.99 needed —
  // stays it.fails, deferred (gate note, NR-3)
  it.fails('cardiogenic oedema PEEP 5 → 12: SpO2 rises and CO falls', async () => {
    const s = createLinkedSim({ profile: 'oedema-cardiogenic' });
    await run(s, 180);
    const a = snap(s, 150, 180);
    s.set({ peep: 12 });
    await run(s, 360);
    const b = snap(s, 330, 360);
    log('hf peep5', a); log('hf peep12', b);
    expect(b.spo2 - a.spo2).toBeGreaterThanOrEqual(2);
    expect(b.co).toBeLessThan(0.97 * a.co);
  });

  it('disconnection: capnogram < 1 mmHg within 4 s, EtCO2 numeric 0 within 14 s (10 s peak window after the last breath), ventilator Disconnection alarm within one breath', async () => {
```

replace with:

```ts
    expect(c.spo2).toBeLessThan(b.spo2 - 3);
  });

  // Stage V.1 (G7b ruling 4+5+13, NR-3): re-specified to SpO2 rise + PCWP fall — PEEP need not lower CO in HFrEF (the
  // CO-fall band was wrong). The profile now carries 7a's hfref (moderate) and the 7b lungs' pulmOedema; the rise in
  // oxygenation is the lung-water shunt's own PEEP response (tables §4.5, E-V1-2), PCWP is 7a's pawp truth. The runs
  // happen in beforeAll so that a crash fails the block instead of letting an it.fails pass silently (R50 review).
  // Orchestrator ruling (V.1 review) 3: the FiO2 0.21 variant is measured too; neither reaches +2 (R45: it.fails).
  describe('cardiogenic oedema PEEP 5 → 12 (Stage V.1)', () => {
    type HfSnap = ReturnType<typeof snap> & { pcwp: number; shunt: number };
    const hf = new Map<number, { a: HfSnap; b: HfSnap }>();
    const oedema = async (fio2: number) => {
      const s = createLinkedSim({ profile: 'oedema-cardiogenic', vent: { fio2 } });
      await run(s, 150);
      const pa = pcwp(s);
      await run(s, 180);
      const a = { ...snap(s, 150, 180), pcwp: (pa + pcwp(s)) / 2, shunt: lungShunt(s) };
      s.set({ peep: 12 });
      await run(s, 330);
      const pb = pcwp(s);
      await run(s, 360);
      const b = { ...snap(s, 330, 360), pcwp: (pb + pcwp(s)) / 2, shunt: lungShunt(s) };
      log(`hf${fio2} peep5`, a); log(`hf${fio2} peep12`, b);
      return { a, b };
    };
    beforeAll(async () => {
      hf.set(40, await oedema(40));
      hf.set(21, await oedema(21));
    }, 300_000);
    it('the lung-water shunt falls ≥ 25 % and PCWP falls (FiO2 0.4; the shunt fall is a mechanism check of E-V1-2, not a clinical band)', () => {
      const { a, b } = hf.get(40)!;
      expect(b.shunt).toBeLessThanOrEqual(0.75 * a.shunt);
      expect(b.pcwp).toBeLessThan(a.pcwp);
    });
    it.fails('FiO2 0.4: SpO2 rises ≥ 2 (measured SpO2 98 → 98, SaO2 98.4 → 98.8: the 7b oedema shunt does not desaturate)', () => {
      const { a, b } = hf.get(40)!;
      expect(b.spo2 - a.spo2).toBeGreaterThanOrEqual(2);
    });
    it.fails('room air (FiO2 0.21): SpO2 rises ≥ 2 (measured SpO2 92.0 → 92.7, SaO2 93.0 → 93.3: shunt 0.15 → 0.10 moves SpO2 < 1)', () => {
      const { a, b } = hf.get(21)!;
      expect(b.spo2 - a.spo2).toBeGreaterThanOrEqual(2);
    });
  });

  it('disconnection: capnogram < 1 mmHg within 4 s, EtCO2 numeric 0 within 14 s (10 s peak window after the last breath), ventilator Disconnection alarm within one breath', async () => {
```


- [ ] **Step 2: Run the link suite**

Run: `cd packages/ventilator && PRINT=1 npx vitest run test/link-r27.test.ts test/link-r36.test.ts test/link-core.test.ts test/determinism.test.ts > "<scratchpad>/stage-v1-ventilator-followup/link.log" 2>&1` (bounded wait ≤ 10 min, then poll) and `grep -E '^LINK|^R36|Tests ' "<scratchpad>/stage-v1-ventilator-followup/link.log"`.
Expected (prototype + review-fix prototype): 19 tests pass (3 of them `it.fails` holding: ARDS, oedema SpO2 at FiO2 0.4, oedema SpO2 at FiO2 0.21). `R36 ptx tension: … plat 36.05` (from 16.13), SpO2 97 → 88.2, MAP 105.1 → 36.2, CVP 9.5 → 20.7; `R36 tension profile: plat 36.0 ΔP 31.0 pip 45.9 C 35 pleural 27.2`; `LINK hf40 peep5 … spo2 98.00 sao2 98.37 … pcwp 18.19 shunt 0.15`, `LINK hf40 peep12 … spo2 98.00 sao2 98.79 … pcwp 16.57 shunt 0.10`; `LINK hf21 peep5 … spo2 92.00 sao2 92.97 … pcwp 18.17 shunt 0.15`, `LINK hf21 peep12 … spo2 92.71 sao2 93.28 … pcwp 16.53 shunt 0.10`; `LINK ards peep5 spo2 94.52`, `peep15 96.00`, `back 96.00`; `LINK copd rr20 … autoPeep 7.72`; `R36 ph crisis etco2 44.00` (from 39.00: +5.0, the number in the PH title). If after merging FU-3/FU-4 an `it.fails` starts passing, remove the `.fails` and record the numbers; if the PH crisis EtCO2 rise falls below +5, turn that test into `it.fails` with the new numbers in its title (Decision 22); if any other passing test fails, stop and report (R45) — never widen. Re-measure the R36 massive-PE rig on FU-4's version if FU-4 changed it (Decision 21).

- [ ] **Step 3: Commit + push** — `test(ventilator): tension, oedema and ARDS link demonstrations on the 7b lungs (G7b rulings 4+5+13; NR-3 oedema re-specified)`.

## Task 8: The combined page — demonstrations send the engine's conditions; the drawer defers to lungState

**Goal:** Decisions 5 and 13 on the page: the tension and PE buttons send `applyEvent` lung conditions (a new `LinkDemo.engineEvents`), the Hamilton drawer's C/R sliders, EFL toggle and PEEP-stenting slider are disabled while linked (its stale `syncBase` comment corrected), the `hf`/`ph`/`pe` watch strings say what the engine now shows, the e2e hook reads `lung.last`, and `vent-shots.mjs` takes an output directory.

- [ ] **Step 1: Edit**

In `apps/demo/e2e/vent-link.e2e.ts`, find:

```ts
  // vent → engine: the monitor counts the ventilator's 14/min
  await expect.poll(() => last(page, 'awrr'), { timeout: 30_000 }).toBe(14);
  // engine → vent: lungState arrived
  expect(await vent<boolean>(page, '(v) => v.core.lung.ref !== null')).toBe(true);
  // disconnection: ventilator alarm, then EtCO2 0 on the monitor
  await page.click('#disc');
  // On a slow runner the minute-volume-low alarm can win the banner first; both are valid consequences of a
```

replace with:

```ts
  // vent → engine: the monitor counts the ventilator's 14/min
  await expect.poll(() => last(page, 'awrr'), { timeout: 30_000 }).toBe(14);
  // engine → vent: lungState arrived
  expect(await vent<boolean>(page, '(v) => v.core.lung.last !== null')).toBe(true); // Stage V.1: lungState read as absolute
  // disconnection: ventilator alarm, then EtCO2 0 on the monitor
  await page.click('#disc');
  // On a slow runner the minute-volume-low alarm can win the banner first; both are valid consequences of a
```

In `apps/demo/src/vent/demos.ts`, find:

```ts
// The R27 + R36 demonstrations as data: a profile (lung-pathology row), starting settings, and the step applied
// after `settleS` sim seconds — ventilator settings and, for the vascular events the ventilator cannot cause,
// engine targets (Stage 7a stand-ins). The combined page runs them; the link tests assert the same steps.
import { STAND_INS, type ProfileId, type VentConfig } from '@pme/ventilator';

const withShunt = (id: string, shunt: number): NonNullable<LinkDemo['engineStep']> =>
  [...(STAND_INS[id] ?? []).map((x) => ({ variable: x.variable as 'sbp' | 'dbp' | 'cvp' | 'hr', value: x.value, rampS: x.rampS })), { variable: 'shunt', value: shunt, rampS: 0 }];

export interface LinkDemo {
  id: string;
```

replace with:

```ts
// The R27 + R36 demonstrations as data: a profile (lung-pathology row), starting settings, and the step applied
// after `settleS` sim seconds — ventilator settings and, for the vascular events the ventilator cannot cause,
// engine targets (Stage 7a stand-ins). The combined page runs them; the link tests assert the same steps.
import type { ProfileId, VentConfig } from '@pme/ventilator';

export interface LinkDemo {
  id: string;
```

In `apps/demo/src/vent/demos.ts`, find:

```ts
  step: Partial<VentConfig>;
  /** Engine targets applied with the step (Stage 7a stand-ins: link/profiles.ts STAND_INS). */
  engineStep?: Array<{ variable: 'sbp' | 'dbp' | 'cvp' | 'hr' | 'shunt'; value: number; rampS: number }>;
  settleS: number;
  watch: string;
}
```

replace with:

```ts
  step: Partial<VentConfig>;
  /** Engine targets applied with the step (Stage 7a stand-ins: link/profiles.ts STAND_INS). */
  engineStep?: Array<{ variable: 'sbp' | 'dbp' | 'cvp' | 'hr' | 'shunt'; value: number; rampS: number }>;
  /** Stage V.1: engine `applyEvent` bodies sent with the step (lung and circulation conditions), as the R36 tests send them. */
  engineEvents?: Array<Record<string, unknown>>;
  settleS: number;
  watch: string;
}
```

In `apps/demo/src/vent/demos.ts`, find:

```ts
  { id: 'ards', label: 'ARDS: PEEP 5 → 15', profile: 'ards-moderate', start: { peep: 5, fio2: 60, vt: 420, pmax: 45 }, step: { peep: 15 }, settleS: 90, watch: 'SpO2 ↑ (recruitment), CO ↓' },
  { id: 'hf', label: 'HF oedema: PEEP 5 → 12', profile: 'oedema-cardiogenic', start: { peep: 5, fio2: 40 }, step: { peep: 12 }, settleS: 90, watch: 'SpO2 ↑, CO ↓' },
  { id: 'ph', label: 'PH crisis: PEEP 15 + RR 8', profile: 'pulmonary-hypertension', start: { peep: 5, rate: 14 }, step: { peep: 15, rate: 8 }, settleS: 60, watch: 'hypercapnia + high PEEP: CVP ↑, BP ↓ (RV failure signature when 7a lands)' },
  { id: 'tension', label: 'Tension pneumothorax', profile: 'pneumothorax-simple', start: { pmax: 60 }, step: { compliance: 18, resistance: 14 }, engineStep: withShunt('pneumothorax-tension', 0.3), settleS: 60, watch: 'Ppeak/Pplat climb, SpO2 ↓, BP ↓ with CVP ↑' },
  { id: 'pe', label: 'Massive PE', profile: 'normal', start: {}, step: {}, engineStep: withShunt('pe-massive', 0.12), settleS: 60, watch: 'EtCO2 falls with unchanged ventilation; BP ↓' },
  { id: 'fibrosis', label: 'Fibrosis: VT 490 → 350, RR 20', profile: 'fibrosis-ild', start: { vt: 490, rate: 14 }, step: { vt: 350, rate: 20 }, settleS: 60, watch: 'driving pressure 16 → 12 cmH2O at the same minute ventilation' },
];
```

replace with:

```ts
  { id: 'ards', label: 'ARDS: PEEP 5 → 15', profile: 'ards-moderate', start: { peep: 5, fio2: 60, vt: 420, pmax: 45 }, step: { peep: 15 }, settleS: 90, watch: 'SpO2 ↑ (recruitment), CO ↓' },
  // Stage V.1 (G7b rulings 4+5+13): PEEP need not lower CO in HFrEF — the lung-water shunt falls and PCWP falls
  { id: 'hf', label: 'HF oedema: PEEP 5 → 12', profile: 'oedema-cardiogenic', start: { peep: 5, fio2: 40 }, step: { peep: 12 }, settleS: 90, watch: 'shunt/SpO2 ↑, PCWP ↓' },
  { id: 'ph', label: 'PH crisis: PEEP 15 + RR 8', profile: 'pulmonary-hypertension', start: { peep: 5, rate: 14 }, step: { peep: 15, rate: 8 }, settleS: 60, watch: 'hypercapnia + high PEEP: EtCO2 ↑, CVP ↑, BP ↓ (the 7b ph lungs on the 7a right heart)' },
  // Stage V.1: both are the engine's lung conditions now — the tension's pleural pressure reaches the ventilator and 7a,
  // the PE's PVR ×3.25, alveolar dead space and shunt 0.10 are the data row's (the page had lost 7a's PE condition
  // when 7a moved it out of STAND_INS: its demo sent only a MANUAL shunt 0.12). In MANUAL the PE barely moves BP
  // (MAP −3.4): one PE event with one PVR source is FU-4 G6's.
  { id: 'tension', label: 'Tension pneumothorax', profile: 'pneumothorax-simple', start: { pmax: 60 }, step: {}, engineEvents: [{ kind: 'lungCondition', id: 'ptxSimple', severity: 0 }, { kind: 'lungCondition', id: 'ptxTension', severity: 0.8 }], settleS: 60, watch: 'Ppeak/Pplat climb, SpO2 ↓, BP ↓ with CVP ↑' },
  { id: 'pe', label: 'Massive PE', profile: 'normal', start: {}, step: {}, engineEvents: [{ kind: 'lungCondition', id: 'pe', severity: 1 }], settleS: 60, watch: 'EtCO2 falls with unchanged ventilation (BP barely moves in MANUAL — FU-4 G6)' },
  { id: 'fibrosis', label: 'Fibrosis: VT 490 → 350, RR 20', profile: 'fibrosis-ild', start: { vt: 490, rate: 14 }, step: { vt: 350, rate: 20 }, settleS: 60, watch: 'driving pressure 16 → 12 cmH2O at the same minute ventilation' },
];
```

In `apps/demo/src/vent/link-page.ts`, find:

```ts
  if (pending && simT >= pending.at) {
    post({ patch: pending.demo.step });
    for (const t of pending.demo.engineStep ?? []) void pm?.dispatch({ id: `demo-${t.variable}-${simT}`, issuedBy: 'vent-link', type: 'setTarget', variable: t.variable, value: t.value, ...(t.rampS ? { ramp: { durationS: t.rampS } } : {}) });
    pending = null;
  }
  const f = (k: string, d = 0) => (last[k] === undefined ? '--' : (last[k] as number).toFixed(d));
```

replace with:

```ts
  if (pending && simT >= pending.at) {
    post({ patch: pending.demo.step });
    for (const t of pending.demo.engineStep ?? []) void pm?.dispatch({ id: `demo-${t.variable}-${simT}`, issuedBy: 'vent-link', type: 'setTarget', variable: t.variable, value: t.value, ...(t.rampS ? { ramp: { durationS: t.rampS } } : {}) });
    (pending.demo.engineEvents ?? []).forEach((event, i) => void pm?.dispatch({ id: `demo-ev${i}-${simT}`, issuedBy: 'vent-link', type: 'applyEvent', event } as Parameters<MonitorHandle['dispatch']>[0])); // Stage V.1
    pending = null;
  }
  const f = (k: string, d = 0) => (last[k] === undefined ? '--' : (last[k] as number).toFixed(d));
```

In `apps/demo/src/vent/hamilton-ui.ts`, find:

```ts
      pr.append(b);
    });
    L.append(el('div', { style: 'font-size:12px;color:var(--numlab);margin-bottom:6px' }, 'Presets'), pr);
    L.append(dSld('compliance', 'Compliance', 10, 90, 1, 'ml/cmH₂O', undefined, () => (S.compliance >= 40 ? 'Normal' : S.compliance >= 25 ? 'Reduced' : 'Severely reduced')));
    L.append(dSld('resistance', 'Resistance', 5, 50, 1, 'cmH₂O/l/s', undefined, () => (S.resistance <= 15 ? 'Normal' : S.resistance <= 25 ? 'Elevated' : 'High')));
    const tau = (S.resistance * S.compliance) / 1000;
    L.append(el('div', { class: 'dfld' }, el('div', { class: 'lab' }, el('span', {}, `Time Constant τ: ${tau.toFixed(2)} s`)), el('div', { class: 'status', style: 'color:var(--numlab)' }, `95% equilibration ${(3 * tau).toFixed(2)} s`)));
    L.append(el('div', { class: 'hr' }), dTog('airwayClosure', 'Airway Closure'));
```

replace with:

```ts
      pr.append(b);
    });
    L.append(el('div', { style: 'font-size:12px;color:var(--numlab);margin-bottom:6px' }, 'Presets'), pr);
    // Stage V.1: linked, the monitor's lungState IS the lung (absolute) — a slider edit would last only until the next one
    const linked = d.core.lung.last !== null;
    const lungSld = (f: HTMLElement) => { if (linked) { const i = f.querySelector('input') as HTMLInputElement; i.disabled = true; i.title = 'Linked: the patient monitor’s lung (lungState)'; } return f; };
    L.append(lungSld(dSld('compliance', 'Compliance', 10, 90, 1, 'ml/cmH₂O', undefined, () => (S.compliance >= 40 ? 'Normal' : S.compliance >= 25 ? 'Reduced' : 'Severely reduced'))));
    L.append(lungSld(dSld('resistance', 'Resistance', 5, 50, 1, 'cmH₂O/l/s', undefined, () => (S.resistance <= 15 ? 'Normal' : S.resistance <= 25 ? 'Elevated' : 'High'))));
    const tau = (S.resistance * S.compliance) / 1000;
    L.append(el('div', { class: 'dfld' }, el('div', { class: 'lab' }, el('span', {}, `Time Constant τ: ${tau.toFixed(2)} s`)), el('div', { class: 'status', style: 'color:var(--numlab)' }, `95% equilibration ${(3 * tau).toFixed(2)} s`)));
    L.append(el('div', { class: 'hr' }), dTog('airwayClosure', 'Airway Closure'));
```

In `apps/demo/src/vent/hamilton-ui.ts`, find:

```ts
    R.append(el('h3', {}, 'Advanced'), dTog('efl', 'Expiratory Flow Limitation'));
    if (S.efl) R.append(dSld('pcrit', 'Critical Closing P', 2, 15, 1, 'cmH₂O'), dSld('peepStent', 'PEEP Stenting', 0, 100, 5, '%'));
```

replace with:

```ts
    // Stage V.1: lungState also sets efl/eflK/peepStent (lungMechanics) — disabled while linked, as C and R are
    R.append(el('h3', {}, 'Advanced'), lungSld(dTog('efl', 'Expiratory Flow Limitation')));
    if (S.efl) R.append(dSld('pcrit', 'Critical Closing P', 2, 15, 1, 'cmH₂O'), lungSld(dSld('peepStent', 'PEEP Stenting', 0, 100, 5, '%')));
```

In `apps/demo/src/vent/hamilton-ui.ts`, find:

```ts
  /** The drawer edits the patient's lung: it becomes the lungState base (link/core.ts patchVent). */
```

replace with:

```ts
  /** The drawer edits the lung before the first lungState and the stand-alone lung (link/core.ts patchVent); linked, lungState
   *  overwrites C, R, flow limitation and pleural pressure every second (Stage V.1) — the base keeps the patient's own effort. */
```

In `apps/demo/scripts/vent-shots.mjs`, find:

```js
import { createServer } from 'vite';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, '../../docs/gates/stage-V');
mkdirSync(out, { recursive: true });
const vite = await createServer({ root, configFile: resolve(root, 'vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await vite.listen();
```

replace with:

```js
import { createServer } from 'vite';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, '../../docs/gates', process.argv[2] ?? 'stage-V'); // Stage V.1: `node apps/demo/scripts/vent-shots.mjs stage-v1`
mkdirSync(out, { recursive: true });
const vite = await createServer({ root, configFile: resolve(root, 'vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await vite.listen();
```


- [ ] **Step 2: Run**

Run: `npx -y pnpm@9.15.9 --filter @pme/demo typecheck && npx -y pnpm@9.15.9 --filter @pme/demo test && PW_SYSTEM_CHROME=1 npx playwright test apps/demo/e2e/vent-link.e2e.ts`
Expected: demo 116 passed; e2e 2 passed (1.1 min on system Chrome).

- [ ] **Step 3: Commit + push** — `feat(demo): vent-link demonstrations send the engine's lung conditions; the drawer defers to lungState (V.1)`.

## Task 9: Regenerate `docs/physiology/stage-v-lung-pathology-data.md` from the 7b lungs

**Goal:** G7b ruling 13 / GV-obs: the 39-row data table is a generated copy of the engine data, and CI keeps it one. The generator gains a Vite SSR runner (Decision 14) and three columns (engine condition, pleural pressure, the ventilator's reference run) while keeping every existing column; `scripts/` is typechecked and `test/catalogue-md.test.ts` compares the committed table with the generator (Decision 28).

- [ ] **Step 1: Edit**

Replace the whole of `packages/ventilator/scripts/catalogue-md.ts` with:

```ts
// Prints the engine's lung-pathology data table as docs/physiology/stage-v-lung-pathology-data.md (R36; R41 file rule:
// the clinical review document docs/physiology/stage-7-lung-pathology-catalogue.md is drafted separately and is never
// written by this script; the orchestrator reconciles data rows ⊂ catalogue after Ali's review).
// Stage V.1: the numbers are the 7b lungs' (LUNG_PATHOLOGIES is generated from ventReference), with each row's engine
// condition as the link profile carries it, its pleural pressure, and the ventilator's reference run on those numbers.
// Run (Stage V.1: the catalogue imports @pme/engine-core, whose JSON imports plain `node --experimental-strip-types` cannot
// load, so a Vite SSR runner loads this module): node packages/ventilator/scripts/catalogue-md.mjs > docs/physiology/stage-v-lung-pathology-data.md
// test/catalogue-md.test.ts fails when the committed table differs from this output (CI).
import { LUNG_PATHOLOGIES, REF_SETTINGS, type Band } from '../src/pathology/catalogue.ts';
import { referenceRun } from '../src/pathology/mechanics.ts';
import { lungConditionsOf } from '../src/link/profiles.ts';

const f = (b: Band) => `${b.value} (${b.lo}–${b.hi})`;
const r1 = (x: number) => x.toFixed(1);
export function renderCatalogueMd(): string {
const out: string[] = [
  '# Stage V lung-pathology data (R36, R41; regenerated in Stage V.1 from the Stage 7b lungs) — the 39 rows the ventilator link runs on',
  '',
  'The engine\'s data table, for Ali\'s review alongside the clinical catalogue `docs/physiology/stage-7-lung-pathology-catalogue.md` (§4b), which this file does not replace; the orchestrator reconciles the two (data rows ⊂ catalogue) after the review.',
  '',
  `Generated from \`packages/ventilator/src/pathology/catalogue.ts\` — edit the source, not this table. C, R, shunt, VD/VT and pleural pressure of every mapped row are the Stage 7b lung module's own (\`ventReference\` of the row's engine condition at its PBW, \`packages/engine-core/data/lung-pathology.ts\`; the shunt is the PEEP-0 value — a lung-water shunt falls ×(1 − 0.04·PEEP) in the engine, so cardiogenic oedema's 0.175 is 0.14 at the reference PEEP 5); the neonatal row and the two unmapped rows keep their authored values. Each link profile carries the "Engine condition" as \`patient.lungConditions\`, and the ventilator reads \`lungState\` as absolute values (Stage V.1). Reference: passive intubated adult, PBW ${REF_SETTINGS.pbwKg} kg; VC ${REF_SETTINGS.vtMl} mL, ${REF_SETTINGS.rr}/min, PEEP ${REF_SETTINGS.peep}, ${REF_SETTINGS.flowLpm} L/min, pause ${REF_SETTINGS.pauseS} s. Values: default (band). Regenerate: \`node packages/ventilator/scripts/catalogue-md.mjs > docs/physiology/stage-v-lung-pathology-data.md\` (\`packages/ventilator/test/catalogue-md.test.ts\` checks the committed copy). "Reference run" = the ventilator's own 60 s run on the row (plateau / ΔP / auto-PEEP / peak − plateau, cmH2O). "ENG" in a source = engineering judgement for review.`,
  '',
  '| Condition | Engine condition | C mL/cmH2O | R insp / exp | Auto-PEEP tend. | Pleural cmH2O | Shunt | VD/VT | Diffusion | PVR × | HPV | Recruit. | Plateau / ΔP / P peak−plat (bands) | Reference run | Not acting yet | Sources | Question for Ali |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
];
for (const r of LUNG_PATHOLOGIES) {
  const later = Object.entries(r.wired).filter(([, w]) => w !== 'vent' && w !== 'engine-now').map(([k, w]) => `${k} (${w})`).join(', ');
  const src = r.sources.map((s) => `${s.field}: ${s.src}`).join(' · ').replace(/\|/g, '/');
  const eng = r.sources.some((s) => s.src.startsWith('ENG') || s.src.includes('ENG'));
  const lc = lungConditionsOf(r.id).map((c) => `${c.id} ${c.severity}${c.side ? ` ${c.side}` : ''}${c.recruitFrac !== undefined ? ` (recruit ${c.recruitFrac})` : ''}`).join(', ') || '—';
  const s = referenceRun(r).sig;
  out.push(`| ${r.label} | ${lc} | ${f(r.complianceMl)} | ${f(r.rInsp)} / ${f(r.rExp)} | ${r.autoPeepTendency} | ${r.pleuralCmH2O ?? 0} | ${f(r.shunt)} | ${f(r.deadSpaceFraction)} | ${r.diffusionFactor} | ${f(r.pvrMultiplier)} | ${r.hpvSensitivity} | ${r.recruitability}${r.recruitP50 ? ` (P50 ${r.recruitP50})` : ''} | ${f(r.signature.plateau)} / ${f(r.signature.drivingPressure)} / ${f(r.signature.peakMinusPlateau)} | ${r1(s.plateau)} / ${r1(s.drivingPressure)} / ${r1(s.autoPeep)} / ${r1(s.peakMinusPlateau)} | ${later || '—'} | ${src} | ${eng ? 'ENG values — confirm or correct' : ''}${r.disagreements ? ` Disagreement: ${r.disagreements}` : ''} |`);
}
return out.join('\n');
}
```

Create `packages/ventilator/scripts/catalogue-md.mjs`:

```js
// Stage V.1: prints docs/physiology/stage-v-lung-pathology-data.md — loads catalogue-md.ts through Vite's SSR loader
// (workspace packages, TypeScript and JSON imports resolved as the tests resolve them).
// Run from the repo root: node packages/ventilator/scripts/catalogue-md.mjs > docs/physiology/stage-v-lung-pathology-data.md
import { resolve } from 'node:path';
import { createServer } from 'vite';

const root = resolve(import.meta.dirname, '..');
const vite = await createServer({ root, configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const m = await vite.ssrLoadModule('/scripts/catalogue-md.ts');
  process.stdout.write(`${m.renderCatalogueMd()}\n`);
} finally {
  await vite.close();
}
```

The generator is typechecked (Decision 28).

In `packages/ventilator/tsconfig.json`, find:

```json
  "include": ["src", "test", "vite.config.ts"]
```

replace with:

```json
  "include": ["src", "test", "scripts", "vite.config.ts"]
```

Create `packages/ventilator/test/catalogue-md.test.ts`:

```ts
// Stage V.1 (G7b ruling 13, R50 review): docs/physiology/stage-v-lung-pathology-data.md is a GENERATED copy of the
// catalogue — this fails when the committed table and the generator's output differ.
// Regenerate: node packages/ventilator/scripts/catalogue-md.mjs > docs/physiology/stage-v-lung-pathology-data.md
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderCatalogueMd } from '../scripts/catalogue-md.ts';

describe('stage-v-lung-pathology-data.md is the generator\'s output', () => {
  it('the committed table equals renderCatalogueMd()', () => {
    const md = readFileSync(resolve(import.meta.dirname, '../../../docs/physiology/stage-v-lung-pathology-data.md'), 'utf8');
    expect(md).toBe(`${renderCatalogueMd()}\n`);
  });
});
```


- [ ] **Step 2: Regenerate and check**

```bash
node packages/ventilator/scripts/catalogue-md.mjs > docs/physiology/stage-v-lung-pathology-data.md
grep -c '^| ' docs/physiology/stage-v-lung-pathology-data.md   # 40 (header + 39 rows; the |--- separator does not match '^| ')
grep 'Pneumothorax — tension' docs/physiology/stage-v-lung-pathology-data.md | cut -c1-260
npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/catalogue-md.test.ts && npx -y pnpm@9.15.9 --filter @pme/ventilator typecheck
```

Expected (review-fix prototype): 47 lines, count 40; the tension row reads `| Pneumothorax — tension | ptxTension 0.8 | 35.4 (10–35.4) | 10 (10–18) / 12 (10–18) | 0 | 27.2 | 0.44 (0.2–0.45) | 0.3 (0.3–0.6) | 1 | 1.5 (1–2.5) | 1 | none | 32 (25–50) / 27 (20–45) / 14 (9.7–18) | 35.6 / 30.6 / 0.0 / 9.8 | — | …`; the normal row `| Normal (intubated adult) | — | 55 (45–70) | 10 (8–12) / 10 (8–12) | 0 | 0 | 0.05 (0.02–0.08) | …`; every mapped row's "Not acting yet" is `—` except fields the data mark `not-modelled`; the "Auto-PEEP tend.", "Diffusion" and "HPV" columns are kept. The file is fully regenerated (its pre-7b authored numbers — e.g. tension C 18 — disappear). `catalogue-md.test.ts` passes (≈ 0.1 s) and the typecheck now covers `scripts/`.

- [ ] **Step 3: Commit + push** — `docs(v1): regenerate stage-v-lung-pathology-data.md from the 7b lungs (G7b ruling 13)`.

## Task 10: Gate — full verification, gate note, PR

- [ ] **Step 1: Merge main** — `git fetch origin && git merge --no-edit origin/main` (FU-3, FU-4 and anything else that landed). Resolve conflicts keeping both sides (chain order for any `engine.ts` hunk; NOTICES rows keep all IDs). Re-run Tasks 1, 3 and 7's run steps if the merge touched `l2/resp/pipeline.ts`, `l2/lung/*`, `l2/hemo/*`, `l2/circ/*` or `packages/ventilator`; regenerate the data table (Task 9 Step 2) if it touched `packages/engine-core/data/lung-pathology.ts` or the catalogue (`catalogue-md.test.ts` fails otherwise).

- [ ] **Step 2: Full verification** (every background run logs under `<scratchpad>/stage-v1-ventilator-followup/`; bounded polls):

```bash
npx -y pnpm@9.15.9 typecheck
CI=1 PME_TEST_SET=fast npx -y pnpm@9.15.9 --filter @pme/engine-core test      # CI's main job
CI=1 PME_TEST_SET=slow npx -y pnpm@9.15.9 --filter @pme/engine-core test      # CI's test-slow job (serial)
npx -y pnpm@9.15.9 test                                                       # every package (ventilator incl. the 900 s sweep)
npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 test:e2e                               # full e2e
```

Expected: all green; engine-core ≈ 1231 passed (1230 + the CPR-guard test) + whatever FU-3/FU-4 added; the tick bench p50 < 6 ms; ventilator ≈ 94 (91 + the oedema FiO2 0.21 `it.fails`, the tension Ppeak `it.fails`, `catalogue-md.test.ts`); no new unhandled errors. If the fast/slow split reports a Vitest RPC timeout, find the test that blocks the worker > 60 s (CI amendment 4) — never raise a timeout.

Then re-run FU-3's validation documents for the non-70 kg patients (Decision 25; the "before" is Task 0 Step 3):

```bash
npx -y pnpm@9.15.9 validate --suites sanity --out "<scratchpad>/stage-v1-ventilator-followup/validate-v1" > "<scratchpad>/stage-v1-ventilator-followup/validate-v1.log" 2>&1
grep -E 's7-apnoea-child|t23-term-apnoea' "<scratchpad>/stage-v1-ventilator-followup/validate-base/report.md" "<scratchpad>/stage-v1-ventilator-followup/validate-v1/report.md"
```

Record both rows before/after in gate note §2 (the child's t90 should move toward 155 s inside 130–190; the pregnancy t90 band is 150–240 s). A row that turns red is reported, not tuned (R45); `docs/validation/` is not rewritten by V.1 (the `--out` goes to scratch).

- [ ] **Step 3: Re-measure the per-profile table** — a throwaway probe, never committed: create `packages/ventilator/test/zz-v1-profile-probe.test.ts` that, for every `PROFILES` row, runs `createLinkedSim({ profile: id, vent: { pmax: 60 } })` to 90 s with `run()` from `./helpers.ts` (it yields per sim-minute) and prints one line per row: `PROBE <id> ref plat/ΔP/autoPEEP/peak−plat` (`referenceRun(row).sig`) `| linked plat PIP autoPEEP` (`s.vs.p.measured`) `| lungState C R R_exp shunt pleural` (the last `lungState` event) `| SpO2 EtCO2 MAP CVP` (`snap(s, 60, 90)`) `| CO` (`co(s)`) — plus, for `pe-massive`, the lungs' PVR multiplier (`(s.engine.snapshot().state as { st: { resp: { lung: { lp: { pvr: number } } } } }).st.resp.lung.lp.pvr`) and CO, against the plan's "before" (7a `pe` 0.75: ×4.0, CO 5.03) (gate note §5, Decision 7). Run it with `cd packages/ventilator && PRINT=1 npx vitest run test/zz-v1-profile-probe.test.ts > "<scratchpad>/stage-v1-ventilator-followup/profiles.log" 2>&1` (bounded wait ≤ 10 min), then **delete the file** (`rm packages/ventilator/test/zz-v1-profile-probe.test.ts`; `git status` must not list it) before any commit. Paste the `PROBE` lines into the gate note §5 next to this plan's "before" column (Prototype results, per-profile paragraph).

- [ ] **Step 4: Screenshots** — `node apps/demo/scripts/vent-shots.mjs stage-v1` → `docs/gates/stage-v1/*.jpg` (9 images, each ≤ 60 KB; the script steps the JPEG quality down). Open `demo-tension.jpg` (Ppeak ≈ 46, ABP ≈ 41/35, SpO2 ≈ 89) and `demo-pe.jpg` (EtCO2 ≈ 26 with its alarm) and describe them in the note.

- [ ] **Step 5: Gate note** `docs/gates/stage-v1.md`: gate question ("Does the ventilator link run on the real 7b lungs — absolute lungState, every profile's own lung conditions, the tension plateau in 25–50 from the pleural pressure — with every R27/R36 demonstration in band or `it.fails` with numbers, and does the Stage 3 child rest at normal gases?"); §0 full gate numbers; §1 tension pneumothorax (before/after table; calibration row "tension-ptx ventilator plateau" CLOSED; the opening-pressure condition of Decision 1 — E > 0 for any pleural pressure above 5.44 + PEEP, e.g. a 3 L haemothorax at ZEEP 2.76); §2 child (E-V1-1) with Q-7e-8 closed, the CPR guard (child 0.293 = adult 0.293), the non-70 kg shift stated (Decision 11) and FU-3's `s7-apnoea-child` / `t23-term-apnoea` validation rows before/after; §3 oedema (E-V1-2: FiO2 0.4 and the FiO2 0.21 variant, Decision 18), ARDS; §4 every link test before/after (PH crisis +5.0 on the edge, Decision 22); §5 per-profile table, including the massive-PE profile's PVR ×4.0 → ×3.25 and CO 5.03 → 5.37 with "no obstructive picture — FU-4 G6" (Decision 7); §6 screenshots; §7 `it.fails` list with titles (ARDS link, oedema SpO2 at FiO2 0.4, oedema SpO2 at FiO2 0.21, tension Ppeak +21.6 — plus any inherited) and the partial restoration of the tension bands (plateau/ΔP authored; peak − plateau keeps 7b's widened 9.7); §8 deviations from this plan by task (incl. every re-anchoring after the FU-3/FU-4 merges) and the known deviations (neonatal RDS profile broken before and after V.1, waiting for R22 — Decision 19; the MANUAL massive-PE profile's missing obstructive picture — Decision 7); §9 exceptions E-V1-1/2/3 with files, E-V1-2's side effect (every ventilated MODELED patient with 7c lung water now gets the PEEP benefit — correct physiology) and the T_IT·PEEP residual of Decision 2; §10 the orchestrator rulings applied (Decisions 16–30), the calibration-queue rows added (Requests) and anything still open.

- [ ] **Step 6: Commit, push, PR (never merge)**

```bash
git add docs/gates/stage-v1.md docs/gates/stage-v1 && git commit -m "docs(v1): gate note and screenshots" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push origin stage-v1-ventilator-followup
gh pr create --base main --head stage-v1-ventilator-followup --title "Stage V.1: ventilator link on the real lungs" --body "$(cat <<'BODY'
Stage V.1 (G7b rulings 4+5+13, NR-3 oedema, G7e Q3): absolute lungState with every link profile carrying its 7b lung conditions; interim link shunt/recruitment and the 7a PE/tension stand-ins retired; the ventilator re-opens the lung against the pleural pressure (tension plateau 18.8 → 35.6, authored 25–50 restored); oedema test on SpO2/PCWP with the lung-water shunt's PEEP response (E-V1-2); stage-v-lung-pathology-data.md regenerated from the 7b lungs (CI-checked against its generator); the Stage 3 child rests at PaCO2 38 (E-V1-1 with a CPR guard, Q-7e-8 closed). Gate note: docs/gates/stage-v1.md.

<numbers table from the gate note §0–§4; it.fails list; deviations; open questions>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

Report to the orchestrator: commits, test counts, the numbers table, deviations, open questions. Stop. Do not merge.

## Rulings applied (the former open questions, closed by the orchestrator 2026-09-27)

| # | The writer's question | Orchestrator ruling (V.1 review), 2026-09-27 | Applied in |
|---|---|---|---|
| 1 | Tension Ppeak +21.6 (45.4 vs 23.8) vs "+10–20" | Tables H6 [TXT] governs over the catalogue §16 [ENG] tag → `it.fails` with 21.6 in the title + calibration row "tension Ppeak vs crs ×0.5" | Decision 16; Task 5 (`pleural.test.ts`); Requests (calibration) |
| 2 | ARDS link band (+1.5 / 0.0 vs ≥ 5 / > 3) | Stays `it.fails` with numbers; calibration row "re-derive from 7b's recruitment" (catalogue:226 [P]) — not a widening | Decision 17; Task 7 ARDS title/comment |
| 3 | Oedema SpO2 band (98 → 98 at FiO2 0.4) | `it.fails` at FiO2 0.4, plus an FiO2 0.21 variant as an ordinary test if the mechanism shows there (R45) — measured +0.7 (92.0 → 92.7), so an `it.fails` with those numbers | Decisions 9, 18; Task 7 oedema block |
| 4 | Neonatal RDS profile broken before and after | Known deviation, waits for R22 | Decisions 12, 19; gate note §8 |
| 5 | Delete `link/recruit.ts`'s unit test | CONFIRMED (a test of deleted code is not a weakened band) | Decisions 8, 20 |
| 6 | The closed R36 massive-PE rig (both PE conditions) | Keeps both until FU-4 G6 unifies the PE event, then V.1 re-measures (FU-4 lands first: Task 0 Step 4 checks) | Decisions 7, 21; Task 7 Step 2 |
| 7 | PH crisis EtCO2 +5.0 on the ≥ 5 edge | Ordinary test, numbers in the `link-r36` title, calibration row; below +5 after a merge → `it.fails` with numbers | Decision 22; Task 7 PH block |
| 8 | Anaphylaxis stand-in vs 7e | Keep the stand-in (7e's haemodynamics are MODELED-only; `writeLung` would strip the profile's lung spec); FU-4 request | Decision 23; Requests (FU-4) |
| FU-3 note | Console labels `lp.pPtx` cmH₂O but the value is mmHg | FU-4 housekeeping, with V.1's new labels | Decision 24; Requests (FU-4) |
| R50 2 | E-V1-1 "every adult rig unchanged"; paediatric CPR | CPR guard (`CO_REF_LPM` while CPR is active; child in CPR 0.293, not 1.283); non-70 kg adults shift; Task 10 re-runs FU-3's child and pregnancy documents | Decisions 11, 25; Tasks 0, 1, 10 |
| R50 3 | PE: ×4.0 (7a) vs ×3.25 (lung data), both ≈ ×13 | Decision 7 corrected; no obstructive picture in the MANUAL massive-PE profile (CO 5.37) → FU-4 G6 | Decisions 7, 26; Requests (FU-4); gate note §5 |
| R50 4 | Stage order | FU-4 lands before V.1: re-anchor on FU-4 (item-7 tests, per-side pleural pressure) | Global Constraints; Decision 27; Task 0 Step 4 |
| R50 5 | Task 9 generator | `scripts` typechecked, CI table test, three columns restored, count 40 | Decisions 14, 28; Task 9 |
| R50 7 | Lower findings | Applied | Decisions 1, 2, 3, 5, 13, 29, 30; Tasks 4, 7, 8, 10 |

**Still open** (none blocks the plan): the magnitude of the calibration-queue rows listed under Requests (Ali, R44); FU-4's choice of one canonical PE peVaso (tables 0.5 [ENG] vs 7a's 1.0) and of the pleural-pressure shape; CPR flow scaling with the patient (FU-4).

## Self-review

- **Scope coverage (G7b 4+5+13, NR-3, G7e Q3):** absolute lungState (Task 5), every profile carries `lungConditions` (Task 6, asserted for all 39 rows), interim shunt/recruit retired (Task 6, `link-core` asserts no profile sends shunt or a 7a condition), the single compartment sees the pleural pressure (Tasks 2, 4, 5; tension 18.8 → 35.6 in 25–50), data table regenerated (Task 9), oedema test on SpO2/PCWP (Task 7, with E-V1-2 in Task 3), ARDS `it.fails` re-measured (Task 7), calibration row closed with numbers (Task 10), massive PE and COPD untouched (NR-3), the child rig fixed as a mechanism with its own exception (Task 1, with the CPR guard) and the two Q-7e-8 `it.fails` removed with 155 s recorded. 7d/7f/7g/FU-2 gate notes name no link item; FU-3's item-7 blocks, the console unit/labels, FU-4's G6 (one PE PVR source, pleural shape), anaphylaxis in MANUAL, CPR flow scaling and 8b's embed API are in Requests. Every orchestrator ruling of both V.1 entries is applied (Decisions 16–30, "Rulings applied").
- **Find blocks:** generated from the prototype as per-task file states and verified mechanically: 62 find/replace blocks in 9 tasks (plus 7 create/whole-file blocks, one `git mv`, one `git rm`). 58 of the 62 match exactly once in `origin/main` `7a181b5`; the others `packages/engine-core/test/l2/lung/v1-lung-seams.test.ts` (Task 3), `packages/engine-core/test/l2/lung/v1-lung-seams.test.ts` (Task 3), `packages/ventilator/src/pathology/mechanics.ts` (Task 6), `packages/ventilator/src/pathology/mechanics.ts` (Task 6) match exactly once in the file as the EARLIER task of this plan leaves it (they edit lines that task wrote). Applying every block in task order to a clean `git archive origin/main` export reproduces the prototype tree byte for byte (41 paths: the 39 files the prototype edits or adds, the renamed test's old path and the deleted `link/recruit.ts`) — `build/verify.py` parses THIS markdown, applies it, and diffs `packages/` and `apps/` against the prototype: IDENTICAL, every find unique at the moment it is applied. **After the V.1 review fixes (2026-09-27):** 68 find/replace blocks (the 62 above + two Task 5 blocks in `test/pleural.test.ts`, the Task 7 PH-crisis title, two Task 8 `hamilton-ui.ts` blocks, the Task 9 `tsconfig.json` include) plus 8 create/whole-file blocks (+ `test/catalogue-md.test.ts`), one `git mv`, one `git rm`. A parser applied THIS markdown in task order to a detached worktree at `origin/main` `5b56a5c` (code = `7a181b5`): **68/68 unique at the moment they are applied**; on the untouched main export 62 match exactly once, the two Task 6 `mechanics.ts` blocks match 0 times (they edit Task 5's lines) and four target files do not exist yet (`v1-lung-seams.test.ts` from Task 2, `pleural.test.ts` from Task 4). On that applied tree: whole-repo `typecheck` clean; the generator writes 47 lines, `grep -c '^| '` = 40; engine-core `resp-child-rest` + `resp-oxygen` + `blood-stage3-recheck` 14/14 (child 155.0 s, CPR coRatio child 0.293 = adult 0.293), with `v1-lung-seams` + `lung-state` 22/22; ventilator 16 files / 94 passed; demo 116 passed.
- **R45:** no band widened (tension plateau/ΔP bands restored to authored; peak − plateau keeps 7b's widened 9.7, stated); `it.fails` kept or added with numbers (ARDS, oedema SpO2 at FiO2 0.4 and 0.21, tension Ppeak +21.6); the PH crisis on its band edge carries its numbers in the title; the only deleted test covers deleted code (Decision 8, confirmed — Decision 20). The oedema `it.fails` run in a `beforeAll`, so a crash cannot pass them. **R51:** no PK/drug code touched; canonical names used (`pawp` truth read as `circOut.pPv` in MANUAL, Decision 9). **CI:** no multi-hour test, every link test yields per sim-minute through `run()`, no SLOW-set change, R36 sweep 88 s ≪ 900 s.
- **Risks:** merge drift with FU-3/FU-4 in `resp/pipeline.ts`, `lung.ts`, hemo/circ, `link-r27`/`link-r36` (Task 0 Step 4 re-verifies every block on the merged tree; re-anchor by comment); PH-crisis EtCO2 on its band edge (→ `it.fails` with numbers if it drops); FU-4 condition unification may change the PE/tension numbers and the pleural-pressure shape (re-measured at the gate); E-V1-1 moves every non-70 kg adult's gas exchange (FU-3's pregnancy/child documents re-run at the gate).
