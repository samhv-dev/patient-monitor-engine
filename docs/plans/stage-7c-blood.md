# Stage 7c: Whole-body physiology — blood, acid–base, electrolytes, oxygen delivery and fluids — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the engine blood: three fluid compartments (plasma, interstitium, cells) with red-cell mass, crystalloid/colloid/blood kinetics, haemorrhage and transfusion; a Figge/Stewart acid–base with a DYNAMIC strong-ion difference solved by a bounded 1-D pH search every 100 ms; Na/K/Cl/iCa/Mg with transcellular K shifts, and the chemistry of succinylcholine, insulin, salbutamol, calcium, bicarbonate, magnesium and hypertonic saline OBSERVED from Stage 7g's dose log (R51 §3), citrate kinetics and hooks into the ECG (K, QTc), contractility and arrhythmia risk; the Dash–Bassingthwaighte oxygen dissociation curve (pH, PCO2, temperature, 2,3-DPG and CO shifts) replacing Stage 3's Severinghaus/Kelman curve in Stage 3's and Stage 7b's O2 models; CaO2/DO2/VO2/O2ER with a critical-DO2 and a demand-normalised regional-flow threshold driving lactate; the published `ps.blood.out` block and the 7d renal/liver and 7b lung-water seams; a `labs` truth event at 1 Hz and an instructor "send ABG" with a realistic turnaround; Pulse oracle scenarios for haemorrhage, crystalloid, insulin/glucose and bicarbonate; and a `stage7c.html` demo.

**Architecture:** A new `packages/engine-core/src/l2/blood/**` owns the blood. `pipeline.ts` keeps one plain-data `BloodState` in the engine's `PipelineState` and steps it at 10 Hz (`advanceBlood`, called by the engine after Stage 7g's `advancePk` and Stage 3's `advanceResp`, before the haemodynamics). At the start of every pass it OBSERVES 7g's accepted boluses (`ps.pk.bus.doses`, duck-typed) and reads 7g's β2/insulin K shift (`bus.metabolic.kShift`). `fluids.ts` moves water between plasma, interstitium and cells (Landis–Pappenheimer oncotic pressure, a transcapillary conductance fitted to Hahn's τ, lymph return, renal elimination or 7d's urine) and tracks red-cell mass; `solutes.ts` keeps extracellular AMOUNTS (mmol) of Na, K, Cl, Ca, Mg, lactate, other strong anions, metabolisable anions, plasma albumin (g) and phosphate, with a cellular K pool and the transcellular shifts; `acid-base.ts` solves the Figge/Stewart electroneutrality for pH given PaCO2 from Stage 3's CO2 model (bisection bracketed to [6.5, 7.9], ≤ 40 iterations, never an error sink); `odc.ts` is the Dash–Bassingthwaighte curve that Stage 3's `gas/o2.ts` AND 7b's mixing point (`lung/mix-o2.ts`, exception E-7c-1) call with an `OdcCtx` (Hb, pH, DPG, COHb, MetHb) read from the blood; `oxygen.ts` computes DO2/VO2/SvO2 and lactate production/clearance; `circ-adapter.ts` reads Stage 7a's circuit (duck-typed; always present on main) for its resting reference CO and pulmonary venous pressure and writes blood-volume changes (100 ms volume events), the chemistry contractility `ext.kChem` and the lung-water key; `labs.ts` builds the lab panel. Other stages read `ps.blood.out` (hbfRel, albuminGL, bvRel, lactate, hb, cop) and `ps.blood.core` (ab.ph, the 7d seams `liver`/`renal`); events go out through `ps.blood.events`. The ECG hears K and iCa through `Modifiers.k`/`Modifiers.qtc` DELTAS (never overwriting an instructor's `setModifiers`), exactly as Stage 4b's device layer patches modifiers.

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2, Vite 6.4, Canvas 2D; Playwright (system Chrome) for screenshots; Node ≥ 22.12 (the Pulse oracle loads `pulse.wasm` in Node). No runtime dependencies.

**Spec:** `../research/00-orchestrator-rulings.md` R32 (7c scope), R34 (port, don't plug; Apache headers; one NOTICES row per ported module; the wasm oracle), R37 (weight of evidence), R39, R40 (borrows #5 Figge/Stewart with dynamic SID and a bounded 1-D pH search, #6 Dash–Bassingthwaighte with pH/CO terms, #7 ICRP-89 flow fractions; the never-copy defects), R44 (defaults now, Ali calibrates later), R45 (the "add the mechanism, don't loosen the test" rule), R50 (this plan's review, fixes F1–F13), **R51 §1–§7 and addenda 8–14** (7g owns drug events and PK; 7c observes `bus.doses`; chain order; canonical names `blood.out.*`, `blood.core.renal`/`liver`; NOTICES `N-P##` scheme), G7a (7a's calibration queue, `ext` initialiser), G7b (ruling 8: 7c writes the lung EVLWI key; Winter's goes to 7f); `docs/physiology/stage-7-parameter-tables.md` §1.1–1.5 (Hb, blood volume, anaemia, smoker, CKD rows), §2 (`pOedema`), §4.5 (lung water), §5.3 (lactate, critical DO2 rows), §5b.1–5b.4 (every row), §7 checks 16, 17a (and the 7c sanity list in this plan), §9 Q10, Q21, Q22, Q25, Q41, Q42, Q44, Q45, Q46, Q47; `docs/physiology/pulse-parameter-annex.md` §5b.1–§5b.4, §5.3, B1 (the porting brief), C (D1–D3, D10, D14, D18, D20, D22), D (O2, O3, O10 and the comparator rules), E (licence text); `../research/pulse-audit/03-respiratory-gas.md` §4; `../research/pulse-audit/01-cardiovascular-nervous.md` §4, §7; `../research/08-pulse-design-audit.md` §1.1 items 5–7, §2.6, §3 N-P08, N-P09, N-P10, N-P14, §5 A13, A14; `docs/plans/stage-7a-circulation.md` (`hs.circ` `CircModelState`: `t`, `vol[]` of `VolumeEvent {rate mL/s, until}`, `ext` with the optional `kChem`, `ref.co`; `hs.circOut.pPv`), `docs/plans/stage-7b-lungs.md` (`lungGasStep`, `O2LungInputs`, `resolveLung`, the `evlwi` key), `docs/plans/stage-7g-pkpd.md` (`DrugBus`: `doses` `{agent, mgPerKg, amount, amountUnit, t}` listed for one pass, `metabolic.kShift`; library units in `l2/pk/data/rows-*.ts`); house style `docs/plans/stage-3-respiratory-gas.md`; runbook `docs/RESUME.md`.

## Global Constraints

- Paths are relative to `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo`. **Work in the worktree** `../scratch/wt-stage-7c` on branch `stage-7c-blood`, created from `origin/main` **after Stages 7b (PR #14) and 7g have merged** — the base is main with 7a + 7b + 7g. This plan needs both: the ODC reaches SaO2 truth through 7b's mixing point (exception E-7c-1) and the drug chemistry comes from 7g's dose log. If either is not on `origin/main` when you start, stop and tell the orchestrator. The prototype ran on exactly that combination (see "Prototype results").
- **Before every task:** `git fetch origin && git merge --no-edit origin/main` in the worktree, then re-run the task's tests. **Before every edit to `src/engine.ts` (Tasks 15 and 16) merge `origin/main` again** (R51 §7). If a concurrent stage (7f, 7d, 7e) merged and a find block no longer matches, locate the quoted line by its neighbouring comment and apply the same change; never re-type a line you are not changing. Engine inserts follow the R51 chain order, not the literal find text: validate/apply **device → pk (7g) → neuro (7f) → organs (7d) → blood (7c) → endo (7e) → Stage 3 → hemo**; advance per pass **pk → resp/lung → blood → endo → organs → hemo**.
- **Push after every task commit** (`git push origin stage-7c-blood`). Never push to `main`, never merge (R21: the orchestrator merges). The last task opens the PR with `gh pr create`.
- **CI rule (binding):** every test that runs the engine or a blood simulation for more than one simulated minute advances at most one simulated minute per call and yields (`await new Promise((r) => setImmediate(r))`) between minutes, and its `describe` carries `{ timeout: 300_000 }`. The 2-vCPU CI runner's Vitest worker RPC times out otherwise. Long-run tests use `test/helpers/longrun.ts` (`LONGRUN_HOURS`).
- **Partition (R25 spirit):** this stage OWNS `packages/engine-core/src/l2/blood/**`, `src/types-blood.ts`, `test/l2/blood/**`, `test/helpers/blood.ts`, `test/engine/blood-*.test.ts`, `test/l2/resp/blood-view.test.ts`, `test/types-blood.test.ts`, `packages/validation/src/oracle/blood-scenarios.ts`, `packages/validation/src/oracle/pulse-node-shim.ts`, `packages/validation/test/oracle-blood.test.ts`, `packages/renderer/src/lab-panel.ts`, `packages/renderer/test/lab-panel.test.ts`, `apps/demo/stage7c.html`, `apps/demo/src/stage7c.ts`, `apps/demo/scripts/stage7c-shots.mjs`, `docs/gates/stage-7c.md`. It MODIFIES, additively and marked `// Stage 7c`: `src/l2/gas/o2.ts` (the ODC swap, Task 13), `src/l2/resp/pipeline.ts` (Tasks 11 and 14), `src/engine.ts`, `src/types.ts`, `src/index.ts`, `test/l2/gas/o2.test.ts`, `packages/renderer/src/index.ts`, `apps/demo/vite.config.ts`, `apps/demo/index.html`, `NOTICES.md`, `LICENSES/Apache-2.0.txt` (new). **Exception E-7c-1 (declared per R50 F7 and G7b ruling 8; minimal, additive, marked `// Stage 7c (E-7c-1)`):** `src/l2/lung/mix-o2.ts` (an optional `odc` on `O2LungInputs`, passed to its seven `content`/`odc`/`po2ForContent` calls), `src/l2/lung/lung.ts` (an optional `odc` on `GasInputs`, forwarded to `stepO2Lung`), `src/l2/lung/conditions.ts` (a fourth optional `evlwiAdd` parameter of `resolveLung`). **R45 records in sibling tests** (the assertion text and bands are untouched; the `it` becomes `it.fails` with a comment carrying the measured number, Task 15): `test/engine/circ-events.test.ts` (7a), `test/engine/lung-circ.test.ts`, `test/engine/lung-unilateral.test.ts` (7b), `test/engine/pk-acceptance-pd.test.ts`, `test/engine/pk-acceptance-pk.test.ts` (7g). **Never edit** `src/l2/ecg/**`, `src/l2/circ/**`, `src/l2/pk/**`, any other `src/l2/lung/**` file, `src/l3/alarms/**`, skins, `docs/physiology/**`.
- Strict TS (`noUncheckedIndexedAccess`, `erasableSyntaxOnly`: no enums, no parameter properties, `verbatimModuleSyntax`), `.ts` import extensions, conventional commits, clean-room: every equation cites the tables row, annex line or paper it implements, or `[ENG]` with the prototype number it was tuned to.
- **Porting rule (R34):** `odc.ts`, `acid-base.ts` and `fluids.ts` are PORTED from Pulse's published methodology and 4.3.2 source *structure* — re-expressed, simplified, never copied verbatim — and each starts with the Apache header of annex §E (Task 25 checks it). None of the audit's blood defects may appear: **no fixed SID, no hard-coded albumin in the solver, no unbounded pH solve, no "error into bicarbonate", K molar mass 39.098 g/mol (never 31.1), lactate enters the charge balance (never mass only)**; the hypocapnia event (if any) tests PaCO2 (D15).
- **NOTICES (R51 addendum 14):** Pulse-derived rows use the `N-P##` scheme: `acid-base.ts` = **N-P08** and `odc.ts` = **N-P09** (the audit reserved both for exactly these ports), `fluids.ts` = **N-P23** (at plan time the highest reserved id is 7d's N-P19+ block; if N-P23 is taken on `origin/main` when you reach Task 25, take the next free N-P id and change the file header to match — the header test reads the id from the header). ICRP-89 (`HBF_FRAC`) reuses 7a's **N-P10**; the Pulse oracle reuses **N-062**. Dataset/paper rows would take 7c's N-100…N-104 range; 7c adds none.
- Every commit message ends with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (each task's commit step shows the exact command).
- pnpm is not on PATH: `npx -y pnpm@9.15.9 …`. Unit tests: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run <path>`. Full gate: `npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices && PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 test:e2e`.
- All state stays plain JSON-safe data (numbers, arrays, plain objects; no functions, no typed arrays, no `Infinity`/`NaN` in state): the engine `structuredClone`s it every tick and snapshots travel as JSON.
- **Determinism:** no `Math.random`, no wall clock in L1/L2. The blood module draws no random numbers.
- **CPU budget:** the blood module (10 Hz step incl. the pH solve) must cost ≤ 0.1 ms per 20 ms tick in Node (Task 23 measures; prototype figure in "Prototype results").
- **Units (binding):** concentrations mmol/L (albumin g/L, Hb g/dL, lactate mmol/L, glucose mg/dL placeholder), amounts mmol, volumes mL, flows mL/s inside `fluids.ts` and mL/min at the API, pressures mmHg, time s. Molar masses (for any mg ↔ mmol conversion, incl. the oracle's mg/dL): Na 22.990, K 39.098, Cl 35.453, Ca 40.078, Mg 24.305, lactate 89.07, HCO3 61.017, glucose 180.16 g/mol. 7g's dose log is in its library units: succinylcholine mcg, calcium salts mg, NaHCO3 mmol, insulin–dextrose units, magnesium sulfate mg, salbutamol mcg, hypertonic saline mL.
- Every `Q<n>` open question whose default a constant implements is cited in the comment beside it (Q10, Q21, Q22, Q25, Q41, Q42, Q44, Q45, Q46, Q47).
- **Test-first exceptions:** Tasks 12, 17, 18, 19, 20, 21 and 23 are sanity/measurement tasks: their tests are written after the code they measure (Tasks 1–16 build it test-first) and pin the behaviour with the tables' bands. A red run there means fixing the model within the stated levers (R45), never widening a band.

---

## Decisions this plan makes where the spec was silent, inconsistent or physically unreachable

1. **One arterial pool for acid–base, solved every 100 ms from Stage 3's PaCO2.** Pulse solves four unknowns in every vascular compartment; we solve ONE unknown (pH) of the Figge/Stewart balance per step, because PaCO2 comes from Stage 3's CO2 model (open system). The bracket is **[6.5, 7.9]** (audit A13). A root outside it returns the bound with `atBound: true` and the residual; nothing is ever folded into bicarbonate. Prototype: 14 bisection steps to 1e-4 pH in every case; a second solve at 1 Hz with the organic anions (lactate above 1.0, ketoacids) removed gives the "non-organic" pH that drives the K shift (Q45: +0.4 per −0.1 pH for mineral/respiratory acidosis, ≈ 0 for organic).
2. **Hb buffer in the charge balance.** Figge's plasma weak acids alone give only +0.5 mmol/L HCO3 per 10 mmHg PaCO2 (the tables want 0.7–1.2). Adding the Van Slyke ECF-averaged Hb buffer `1.43·(Hb/3)·(pH − 7.4)` — the same term that makes the Van Slyke BE formula's 14.83 — gives **+1.0 per 10 mmHg (40→60)** and keeps BE flat (Δ < 0.3). It also makes haemodilution weaken buffering, as it should. Falling PaCO2 gives 0.127 per mmHg (40 → 30) against the tables' 0.2: the tables' acute-alkalosis figure needs cellular H+ release/alkalosis-driven lactate, which a one-pool Figge balance lacks — recorded as an `it.fails` [ENG] deviation (R50 F13), not a band change.
3. **SID is recomputed from amounts every step** (audit #5): `Na + K + 2·iCa + 2·0.6·Mg − Cl − lactate − ketoacids − acetate − XA`. XA (unmeasured strong anions) is CALIBRATED at start so the profile's HCO3 (default 24.4 at PaCO2 40) holds — so any profile starts exactly at pH 7.398 / BE 0 / AG 11.6 without a fixed SID. Plasma-Lyte's gluconate is added to XA (not metabolised here; its renal excretion is 7d's, via the renal seam's `gluconate`) and its acetate to a metabolised pool (τ 15 min); Ringer's lactate enters the lactate pool and is cleared by the liver like endogenous lactate.
4. **Solutes are AMOUNTS in one extracellular pool** (plasma + interstitium, ions equilibrate across capillaries in minutes); concentrations are amount/ECF. Albumin is a PLASMA amount (g), phosphate an ECF amount, lactate an amount in `vLac` = 0.6 L/kg (+ the ECF change). Bleeding removes the plasma share of every solute at its current concentration; infusions add their composition. This makes 2 L saline give Cl +6.4 and Na +1.9 by arithmetic, not by a rule.
5. **Fluid kinetics are Starling with the oncotic source switched ON, fitted to Hahn** (annex B1 "Fix"): a whole-body `Kf` 2.0 mL/min/mmHg, interstitial compliance 0.02·Visf0 per mmHg, πisf 8 mmHg diluting with ISF volume, lymph gain 2 mL/min/mmHg, elimination 0.03/min on the BLOOD-volume excess (volume receptors; GA ×0.2) until 7d's urine replaces it. Fitted by a 108-point sweep: 1 L over 30 min awake → **51 % intravascular at the end, 16 % 30 min later** (tables 0.5–0.6 / 0.15–0.25), total excess halved 30 min after the end (t½ 30 awake); haemorrhage refill **0.16 mL/kg/min** early (band 0.1–0.5). Plasma albumin below baseline is replenished from the interstitial pool with τ 120 min [ENG]. Colloid is an albumin-equivalent oncotic mass with t½ 150 min (gelatin). Bolus orders carry `leftMl`, so exactly the ordered volume runs whatever the 0.1 s grid phase.
6. **Lactate needs REGIONAL supply dependence to meet tables §7 17a, judged on flow RELATIVE TO DEMAND.** With only the global critical DO2 (6 mL/kg/min, Q42), class III haemorrhage produces no lactate. The mechanism added (R45: mechanism, not a looser test): splanchnic/skin/muscle beds (60 % of VO2) lose flow first when cardiac output falls short of what the current metabolism needs, `q = (CO/CO0)/(VO2demand/VO2rest)`, and become supply-dependent linearly as q falls from 0.88 to 0.55; hepatic clearance falls with (CO/CO0)² (tables `hbfFactor` ×0.6 on top of the CO fall); the global DO2crit term stays for anaemia and arrest. The demand normalisation matters under anaesthesia: GA lowers flow and VO2 together without redistribution (flow–metabolism coupling) — without it a routine propofol/remifentanil TCI in MODELED mode (CO/CO0 ≈ 0.85) crept lactate to 1.49 in an hour. `CO0` is 7a's stabilised resting CO (`circ.ref.co`, R50 F4) in Stage 3's flow units. A FLOW criterion, not a DO2 one: a chronically anaemic patient at Hb 7 and normal CO stays aerobic (van Woerkens: DO2crit reached only near Hb 4). Yield `kAnaer` 0.05 mmol/mL (tables range 0.015–0.06). All [ENG], flagged for Q41/Q42.
7. **Succinylcholine K is an additive plasma pulse, not a mass-balance leak.** The tables' two facts cannot both hold in one first-order mass balance: a K load takes ~30 min to be half taken up, yet the normal sux rise (+0.5) is gone in 10–15 min. The pulse rises linearly to its peak at 4 min (0.5 + 6·burns mmol/L) and decays with τ 5·(1 + 5·burns) min. Insulin and β2 agonists act on the mass balance's K SET POINT only (the earlier unsourced speed-up of the sux pulse's decay is removed, R50 F13): insulin–dextrose −1.0 mmol/L at full effect, 7c's own salbutamol −1.0 (fallback only, decision 18), and because these drugs drive K into cells through Na/K-ATPase, the uptake rate rises by `K_PUMP_GAIN` 1.5 per mmol/L of drug shift (the passive τ 43 min of a K load alone cannot reach the tables' "−0.5 to −1.0 within 30 min") [ENG, fitted]: insulin–dextrose K −0.59 at 30 min, −0.87 at 60 min; salbutamol 10 mg nebulised through 7g −0.54 at 30 min.
8. **Calcium: membrane stabilisation acts on the ECG only.** `kEcg = K − 0.5·E_Ca·max(0, K − 5)` (onset 1–3 min, fading over 30–60 min); plasma K is unchanged (tables row). Ionised Ca is a buffered amount (τ 15 min back to the set point) shifted by pH (−0.05 per +0.1) and chelated by free citrate (0.09 per mmol/L; hepatic clearance τ 5 min × hepatic flow × hepatic function), so rapid transfusion lowers iCa and liver hypoperfusion prolongs it (Q46). The tables' "−0.1 per unit when > 1 unit / 5 min" is read as a steady-state RATE effect: −0.1 per unit-per-5-min of infusion rate [ENG].
9. **ECG hooks are DELTAS on `Modifiers`.** The blood never overwrites `mods.k`/`mods.qtc`: it adds the change of its own K (incl. sux, Ca stabilisation) and of its QTc effect (+10 ms per 0.1 iCa below 1.1; −10 ms per 0.1 above 1.3 [ENG, Q46]) since the last push, as Stage 4b's device layer patches modifiers. An instructor's `setModifiers { k: 7 }` therefore still works, and every Stage 5 ECG test is untouched (the blood's K is constant at baseline).
10. **Stage 7a (always on main) is read by duck typing.** `circ-adapter.ts` looks for `hemo.circ` with a numeric `t`, a `vol` array and an `ext` object: every 100 ms blood-volume change (bleed, infusion, refill, capillary loss, elimination) is pushed as a 100 ms volume event onto 7a's circuit (its `until` sits 1 µs early so float round-off never counts a 51st 2 ms circuit step — without it the prototype removed 500.7 mL for a 500 mL bleed), CO comes from 7a through Stage 3's `cardiacOutput`, and the chemistry multiplier is written into `circ.ext.kChem` UNCONDITIONALLY (7a's `ext` initialiser omits the optional key, R50 F3). `CO0` = `circ.ref.co` converted to Stage 3's flow units (R50 F4). The Stage 2 fallback (`volumeStatus`/`contractility` coupled truths, `coFactor`) now serves only unit rigs without a circuit.
11. **Commands (R51 §3).** Stage 7g validates and CONSUMES every `drug` event; 7c OBSERVES the accepted boluses on `ps.pk.bus.doses` (each listed for exactly one advance pass, so each is observed once) and converts 7g's library units: succinylcholine mcg → the K pulse; calcium chloride/gluconate mg → 6.8/2.3 mmol Ca per g (half ionised) + membrane effect; NaHCO3 mmol → Na and the CO2 load; insulin–dextrose units → its K curve; magnesium sulfate mg → 4.06 mmol Mg per g; hypertonic saline mL (+ 7d's optional `concentrationPct`, default 3 %) → a 15 min NaCl flow (R51 addendum 14). 7c's own drug validator/handler stays ONLY as the fallback for an engine without 7g (unit rigs). The blood OWNS `applyEvent` kinds `fluid`, `bleed`, `transfusion`, `metabolic`, `lab` and the `condition` ids `burns | dka`; its validator runs after 7g's and BEFORE Stage 3's (whose `condition` rejects unknown ids) and returns `null` for anything else. With 7a merged, 7a's own `fluid`/`bleed` handler is unreachable by design: the adapter moves the same volume into 7a's circuit. `fluid` without `fluid:` and 7a's `crystalloid` mean 0.9 % saline; 7a's `colloid` means 4 % gelatin and its `blood` whole blood (R50 F5).
12. **Dyshaemoglobins and the pulse oximeter.** The ODC's saturation is FUNCTIONAL; CaO2 multiplies by (1 − COHb − MetHb). The SpO2 device chain receives the oximeter's APPARENT saturation: COHb reads as O2Hb (`S·(1 − COHb − MetHb) + COHb`), and MetHb pulls the reading toward 85 % (weight min(1, MetHb/0.3)) — research 03 §3.6. An instructor pin on `spo2` bypasses it. The lab panel shows the fractional SaO2, COHb and MetHb (co-oximetry). With COHb = MetHb = 0 the device input is byte-identical to Stage 3's.
13. **The `labs` event (1 Hz truth) and "send ABG".** `labs` carries the whole panel every simulated second. `applyEvent { kind: 'lab', panel: 'abg' | 'vbg', turnaroundS? }` freezes the panel at the draw time and emits `labResult` after the turnaround (default 120 s: point-of-care analyser ≈ 60–90 s plus the walk [ENG]; 30–3600 accepted). VBG uses PvCO2 = PaCO2 + VCO2/(Q·4.5) and the mixed-venous PO2 from SvO2.
14. **Bicarbonate.** 8.4 % NaHCO3: the Na enters the ECF at once (SID ↑ → pH ↑); 25 % of the dose × 22.4 mL appears as extra CO2 production in Stage 3's CO2 model over ≈ 5 min (Bateman, ka 2/min, ke 0.5/min) [ENG]. Prototype, ventilated at fixed settings, against a no-dose control of the same seed: EtCO2 **+5.0 mmHg at 90 s, +1.9 at 15 min**.
15. **Hb and the O2 store.** Stage 3's constant `HB_G_DL` 14 remains only as the no-blood default (`ODC_STAGE3`); with the blood present the profile's Hb (tables §1.1: adult 15 M / 13.5 F) and the live pH/DPG/COHb/MetHb reach every `content`/`odc`/`po2ForContent` call — Stage 3's MANUAL calibration (`o2Steady`/`solveShunt`, via `O2Inputs.odc`) AND 7b's two-store mixing point (via `GasInputs.odc` → `O2LungInputs.odc`, exception E-7c-1), which is where SaO2/PaO2 truth is stepped since 7b.
16. **Cold blood.** An unwarmed unit (`warmed: false`, the default for `transfusion`) lowers core temperature by 0.25 °C per unit as it runs, applied to Stage 3's heat model (tables §5b.4 [VERIFY]; 7e replaces it with a physical IV heat term).
17. **Glucose is a placeholder** (100 mg/dL in the panel; 7e owns it). Insulin–dextrose moves K only.
18. **One K-shift source (R50 F2).** With 7g present, the β2-agonist/insulin/epinephrine K shift is `bus.metabolic.kShift` ALONE (7c's own salbutamol curve is off even if a salbutamol dose is on record); without 7g, 7c's own salbutamol curve. 7c's `insulinDextrose` row carries no 7g PD, so its curve is always 7c's. Never both.
19. **What other stages read (R51 addendum 14).** `ps.blood.out` is the chemistry block (`hbfRel` — 7c is the ONLY owner of hepatic-flow scaling —, `albuminGL`, `bvRel`, `lactate`, `hb`, `cop`, `na`, `k`, `iCa`, …; 7g's `pkCtx` already reads `blood.out.hbfRel`); `ps.blood.core.ab.ph`; the events go to `ps.blood.events` (flushed by the engine). 7d writes `ps.blood.core.liver = liverFn·tempF` (function only): 7c multiplies hepatic FLOW (`hbfRel`) and FUNCTION (`liver`) once each for lactate, citrate and acetate clearance.
20. **7d's renal seam (R51 addendum 14).** `ps.blood.core.renal = { uopMlH, excretion: { k, na, cl, gluconate } }` (mL/h, mmol/h). `null` (the default) = the fixed volume-receptor elimination with isotonic solute loss; once 7d fills it, urine water and each solute leave at the kidney's rates instead.
21. **Lung water (G7b ruling 8).** The blood computes extra lung water W (mL/kg above the conditions' EVLWI) from 7a's pulmonary venous pressure (10 s filter) against the tables' §2 oedema threshold `COP − 2` scaled by the protein reflection coefficient (σ/σ0), times the capillary-leak multiplier `fl.kfMult`, cleared with τ 60 min [ENG, Q25]: `dW/dt = kfMult·max(0, pCap − (σ/σ0·COP − 2))/60 − W/60`. It writes `rs.evlwiExtra` and re-resolves 7b's lung when W moves by ≥ 0.25 mL/kg; 7b's `resolveLung` adds it to the `evlwi` key (E-7c-1), so shunt/compliance/resistance follow the tables' §4.5 rows. Normal PCWP (≈ 9) with COP 22.4 makes none.
22. **`metabolic()` is exported from `resp/pipeline.ts`** with Stage 7e's third argument `gas: 'o2' | 'co2' = 'co2'` (ignored until 7e replaces the body); the blood's VO2 demand calls `metabolic(rs, t, 'o2')` (R50 F8).


## Prototype results

Prototyped twice. First on `main` `9e39b29` (module fits, 108-point fluid sweep, the Pulse oracle in Node). Then — for the R50 fixes — in `../scratch/proto-7c`: a detached worktree of `origin/stage-7g-pkpd` `9d3a900` (which contains main `36097c1` with 7a) with `origin/stage-7b-lungs` `6aff340` merged LOCALLY (two conflicts, `types.ts` imports and `resp/pipeline.ts`'s CO2 step, resolved by keeping both sides; never pushed) — i.e. the 7a + 7b + 7g main this plan executes on. EVERY code block and find/replace block of this plan was applied there and run: `typecheck` clean in all packages; **engine-core 207 files / 891 tests pass, 1 skipped (pre-existing), CI long-run horizon**, including 7c's 23 files / 88 tests and the R45 `it.fails` records of Task 15; `build` (the `stage7c` chunk is emitted) and `check-notices` pass; renderer lab panel 1 test; validation oracle rules 1 test + 4 skipped without the wasm. Not re-run on the new base: the Playwright screenshots, the e2e suite and the four wasm oracle scenarios (their numbers below are from the first prototype; the blood code they exercise changed only in the ways listed under Deviations).

| Check | Result (7a + 7b + 7g base) |
|---|---|
| ODC | P50 26.77 at pH 7.4/PCO2 40/37 °C; pH 7.2 → 31.4, 7.6 → 22.9; 39 °C 29.9; 33 °C 21.4; PCO2 60 27.6; DPG 7 mM 28.5; COHb 0.2 → 22.8 (n 2.48); S(40) 0.747, S(60) 0.898, S(100) 0.972 |
| pH solver | bracket 6.5–7.9 (A13); 14 bisection iterations every call (tolerance 1e-4); bounded and finite for SID −20…200, PCO2 0…400, albumin 0…80 |
| Respiratory compensation (SID 38.1) | rising: +1.0 HCO3 per 10 mmHg (40 → 60), BE flat; falling: 0.127 per mmHg (40 → 30; tables 0.2 → `it.fails`, deviation) |
| Baseline (70 kg man) | BV 4807, plasma 2644, ISF 11356, ICF 28000 mL; pH 7.398, HCO3 24.4, BE 0.0, lactate 1.00, AG 11.6, K 4.20, iCa 1.20, COP 22.4 mmHg; 24 h: no drift |
| 1 L Ringer's lactate over 30 min, awake | intravascular 51 % at the end, 16 % 30 min later; one RBC unit +1.0 g/dL once its volume is shed (4 h) |
| **Class III haemorrhage** 1750 mL over 10 min, ENGINE with 7a | **lactate 3.5 at 30 min** (tables 17a: 3–5), BE −1.6, Hb 14.1, pH 7.24; circuit −1668 mL at 700 s (refill), CO 6.09 → 2.90 L/min, blood bvRel 0.653 |
| + 4 warmed RBC + 1 L RL over 20 min from 40 min | lactate 1.2 at 120 min, Hb 14.6, K 4.4, iCa 1.22 |
| Massive transfusion 10 RBC (35 d) in 30 min vs matched bleed | engine **K 5.9, iCa 1.09**, Hb 17.8, core → 33.97 °C (10 unwarmed units); core-only K 5.88, iCa 1.076 (the rate rule gives 1.033; test ±0.05) |
| 2 L over 30 min under GA, at 60 min | engine saline **Cl 109 (+5), BE −2.0**; Plasma-Lyte Cl 103, BE +0.6; core-only saline Cl +5.4, BE −2.1 (annex D3 +6–8 / −3 to −5 → `it.fails`) |
| DKA 0.8 (ketoacids 20 mmol/L), engine | AG 27, HCO3 8.6, pH 7.09 at a fixed ventilator (Winter's compensation is 7f's) |
| Hyperventilation RR 12 → 24 (GA), engine | pH → 7.51 (≥ +0.1) |
| NaHCO3 50 mmol, engine vs same-seed control | ΔEtCO2 +2.5 / +4.4 / **+5.0** / +4.9 / +4.7 at 30 / 60 / 90 / 120 / 150 s, +1.9 at 15 min |
| Untreated VF 30 min (ventilator on), engine | **lactate 8.6, pH 6.88**, BE −7.3, PaCO2 131 |
| **Succinylcholine in burns (0.5)** through 7g → CaCl2 1 g at 4 min → insulin–dextrose at 7 min, engine | **K 7.7 at 4 min; QRS 93 → 126 ms; → 93 ms after calcium; K 7.2 → 4.3 in 30 min** |
| Insulin–dextrose alone (core) | K −0.59 at 30 min, −0.87 at 60 min (tables −0.6 to −1.0 over 30–60 min) |
| **Salbutamol 10 mg nebulised through 7g** (kShift −0.78), engine vs control | **K 4.28 → 3.74 (−0.54) at 30 min**; unit rig: 7c's own curve −0.71, 7g kShift −0.8 held −0.61, kShift 0 with a salbutamol dose on record 0.00 (never both) |
| COHb 25 % / MetHb 35 % / Hb 7, engine | displayed SpO2 99 while co-oximeter SO2 74.8 %; SpO2 ≈ 85; Hb 7: SaO2 unchanged, DO2 < 55 %, no lactate at normal flow |
| Propofol Ce 4 + remifentanil Ce 4 TCI for 60 min (MODELED, 7g) | lactate 1.22 (hbfRel ≈ 0.7 slows clearance; regional deficit 0 after the demand normalisation — 1.49 before it) |
| Labs | `labs` every simulated second; ABG `labResult` exactly 120 s after the draw with draw-time values; VBG PCO2 +8.5 |
| **Stage 3 desaturation with the blood** (Hb 15, live pH, ODC through 7b's mixing point) | **preoxygenated 485 s, room air 41.0 s (R39-1 35–60), child 130.0 s (band 130–190: at the edge), obese 169 s** |
| **7a suites** (`test/l2/circ`, `test/engine/circ-*`) | all pass except `circ-events` 500 mL bleed: **497.4 mL** (refill 2.6 mL in 65 s) → `it.fails`; class II SBP 118 → 103, HR 109, PP 36 → 21, PPV 18.8 → 19.0 % (pass); class III pass |
| **7b suites** (`test/l2/lung`, `test/engine/lung-*`) | all pass except two OLV tests in hypercapnic rigs (PaCO2 49 → 97 mmHg in 30 min, pH 7.09; 7.01 at 60 min): lung-circ OLV qL share **0.325** (0.302 without 7c); lung-unilateral OLV nadir 88.7 % at **46.6 min** (7.4 without 7c), fL 0.266 → `it.fails`; the Bohr shift raises the blocked lung's alveolar PO2 (60 vs 46 mmHg) and 7b's HPV stimulus is PAO2-only |
| **7g suites** (`test/engine/pk-*`) | all pass except five rows that assumed pH 7.40 and hepatic flow 1: phenylephrine 0.1/0.25/0.5/1.0 µg/kg/min MAP **+8.5/17.4/22.1/24.9 %** (without 7c 13.7/23.4/29.8/34.2; the rig's PaCO2 rises 41 → 57 in 22 min, pH 7.27, 7g's `acidosisFactor` ×0.675) — rows 0.25–1.0 miss, Eleveld engine = standalone **Ce 3.098 vs 2.996** (hbfRel ≈ 0.8), acidosis-through-the-engine SVR-rise ratio **0.601 vs 0.40** at pH 6.85 (concentrations differ: 7c's hbfRel falls with kChem) → `it.fails` |
| CPU | blood step 0.0005–0.0013 ms per 20 ms tick (budget 0.1); determinism: identical `labs` hash for the same seed and script |
| Pulse oracle in Node (first prototype) | the spike's web build loads in Node through the Task 22 shim; StandardMale pH 7.417, BE +1.55, lactate 1.65 mmol/L (D18), K 4.0 true mmol/L (reported 5.0 by Pulse, D14), Hb 14.96, BV 5491 mL; 60 s simulated ≈ 21 s wall |

### Deviations from the tables and the annex (for the orchestrator and Ali's R44 calibration pass)

- **Room-air apnoea, true SaO2 90 % at 41.0 s** (R39-1 band 35–60); preoxygenated 485 s (Stage 3: 501); **child 130.0 s sits on the band's lower edge** (7b alone: 133) — Q34 calibration item already open.
- **Lactate needs a regional-hypoperfusion term** (decision 6): `REGIONAL_FRAC` 0.6 between q = 0.88 and 0.55, q normalised by the VO2 demand, `kAnaer` 0.05 (tables default 0.03), hepatic flow (CO/CO0)² — all [ENG], Q41/Q42.
- **hbfRel at rest = (CO/ref.co)²** follows 7a's running resting CO, which sits −9 % to +10 % from `ref.co` depending on the rig (MODELED + PEEP 5.05 vs 5.54; MANUAL + GA 6.09): hepatic clearance at rest ranges 0.8–1.2 — a 7a calibration item (G7a O1: resting CO vs reference).
- **Class III BE is milder than ATLS teaching** (−1.6 at 30 min in the engine; ATLS "BE −6 to −10"): the lactate rise is offset by the Stewart alkalinising effect of albumin dilution from the refill. Candidate mechanisms: shock-related unmeasured anions or phosphate release. No test asserts ATLS BE.
- **Untreated VF: BE −7.3 at 30 min** (annex D1 "BE ≤ −12"); lactate 8.6 and pH 6.88 are in D1's bands. The D1 oracle row asserts pH and lactate; BE is reported.
- **Saline 2 L misses annex D3** (Cl +5, BE −2.0 vs +6–8 / −3 to −5): albumin dilution offsets the chloride acidosis. Kept as `it.fails` (core and engine) with a passing saline-vs-Plasma-Lyte contrast test.
- **Acute respiratory alkalosis 0.127 mmol/L per mmHg** (tables 0.2): `it.fails`, mechanism candidates cellular H+ release, alkalosis-stimulated glycolysis.
- **Succinylcholine K is not in the K mass balance** (decision 7); burns severity 1 gives +6.5 (tables "+5–7"), so the demo uses severity 0.5 (K ≈ 7.7).
- **Na/K-ATPase gain `K_PUMP_GAIN` 1.5** [ENG] (decision 7) and the drug shifts −1.0 are fitted to the tables' time courses.
- **iCa rule read as a rate effect** (decision 8) [ENG]; engine massive transfusion iCa 1.09 vs the rule's 1.03 (the matched bleed and Ca buffering).
- **P50 shifts use Dash–Bassingthwaighte's isocapnic Bohr coefficient** (Δlog P50/ΔpH ≈ −0.34 vs the textbook −0.48 whole-blood value): the published model, kept as ported.
- **Plasma-Lyte gluconate is left unmetabolised** (decision 3) until 7d's renal seam excretes it.
- **COHb over-reading uses "COHb reads as O2Hb"**, not the tables' regression 1.06·COHb − 2.5 (Q22): the regression's negative offset would make a non-smoker's SpO2 read 2.5 points LOW.
- **Sibling tests recorded as `it.fails` (R45, Task 15):** 7a `circ-events` 500 mL (refill 2.6 mL); 7b OLV ×2 (hypercapnic rigs + Bohr + PAO2-only HPV: candidate mechanism — HPV potentiation by hypercapnia/acidosis and a mixed-venous PO2 term in 7b's stimulus); 7g ×5 (rigs with an uncontrolled PaCO2 rise; tests that assumed hepatic flow 1). They need orchestrator rulings, not 7c tuning.


## Requests to other stages

- **Stage 7a:** `ext.kChem` exists (thank you) — 7c writes it every 100 ms; keep `hs.circ.t`, `hs.circ.vol` (`VolumeEvent {rate mL/s, until}`), `hs.circ.ref.co` and `hs.circOut.pPv`. Calibration item: the running resting CO differs from `ref.co` by −9…+10 % across rigs, which moves every relative-flow consumer (7c's hbfRel, regional lactate). If 7a's O2 oracle scenario still uses the Pulse hemorrhage field `Flow`, Pulse 4.3.2 rejects it (`FlowRate`), and the runner needs 7c's `installPulseNodeShim(dir)` to load the web build in Node.
- **Stage 7b:** 7c reads nothing new from 7b; 7b may read `ps.blood.out.cop` and `ps.blood.core.fl.kfMult` (capillary leak). Exception E-7c-1 adds three optional, additive inputs to `mix-o2.ts`, `lung.ts` and `conditions.ts` (ODC context; `evlwiAdd`). The two OLV tests became `it.fails` (hypercapnic rigs; Bohr shift); candidate 7b mechanism for the calibration pass: HPV potentiation by hypercapnia/acidosis and a mixed-venous PO2 term in `hpvStimulus`.
- **Stage 7d:** fill `ps.blood.core.renal = { uopMlH, excretion: { k, na, cl, gluconate } }` (mL/h, mmol/h; null until then) and `ps.blood.core.liver = liverFn · tempF` (function only; 7c applies hepatic flow `hbfRel` itself); read `ps.blood.out.{hb, albuminGL, bvRel, lactate, hbfRel}`. Mannitol's osmotic load is not observed by 7c (7d owns its ICP effect); add `concentrationPct` to 7g's `DoseLogEntry` for hypertonic saline (7c already reads it, default 3 %).
- **Stage 7e:** glucose (the panel's placeholder: `ps.blood.endo?.glucoseMgDl ?? 100`), endogenous catecholamine/insulin K shift as an ENDOGENOUS kSet term (7g's `bus.metabolic.kShift` stays the only exogenous-drug term, decision 18), MH K/lactate release, `lactateX`, `kfMult`, `erMax`, the IV heat term replacing decision 16's shortcut, the `dka` condition observed; replace `metabolic()`'s body (the `gas` argument is ready).
- **Stage 7f:** spontaneous-breathing compensation of metabolic acidosis (Winter's PaCO2 = 1.5·HCO3 + 8) reads `ps.blood.core.ab.hco3` (G7b ruling 8); sepsis/anaphylaxis/burns set `ps.blood.core.fl.kfMult`/`fl.sigma` (capillary leak, which also feeds the lung-water seam); `patient.blood.burns` drives the sux K rise (7c's, from `bus.doses`).
- **Stage 7g:** the observer contract holds as written (`bus.doses` once per pass, library units). `bus.metabolic.kShift` is used as a steady-state set-point shift; with 7c's pump term salbutamol 10 mg neb gives −0.54 at 30 min (tables −0.5 to −1.0) — the salbutamol row's text "K −1.4 at full effect (7c)" is stale. Five 7g acceptance rows now `it.fails` (see Deviations): they need either normocapnic rigs (GA metabolism or a PaCO2 hold) or bands re-fitted with 7c's pH, and a hepatic-flow-pinned variant of the Eleveld equality test — orchestrator ruling requested.
- **Stage 3 owners:** none required. Note for Stage 8's soak tests: `engine-commands.test.ts`'s per-tick tone tests run within ≈ 1 s of Vitest's 5 s default on a loaded Mac with or without the blood.
- **Stage 8:** add the tables' ATLS BE row, D1's BE ≤ −12, D3's saline BE/Cl and the 0.2 per mmHg alkalosis slope to the calibration list with the candidate mechanisms above.


## Architecture in one page

```
engine.advance(ps, end)
  ├─ ECG (Stage 1/5) — mods.k / mods.qtc include the blood's DELTAS (pushed after the previous pass)
  ├─ advancePk (Stage 7g) ── bus.doses (this pass's accepted boluses), bus.metabolic.kShift
  ├─ advanceResp (Stage 3 + 7b lungs) ── 10 Hz gasStep reads ctx.blood (BloodView: odc{hb,ph,dpg,cohb,methb}, coFactor, co2LoadMlMin)
  │     7b lungGasStep → mix-o2 two O2 stores (Dash–Bassingthwaighte via GasInputs.odc, E-7c-1) · CO2 (+ bicarbonate CO2) · SpO2 chain (apparent sat)
  ├─ advanceBlood (Stage 7c, 10 Hz, same grid)   observes ps.pk.bus.doses/kShift; reads rs.co2.pf, rs.o2.pao2, rs.temp, metabolic(rs,t,'o2')
  │     core.ts: fluids (Starling + lymph + elimination|7d urine + bleed/infusion/transfusion)
  │              → solutes (amounts; K cells/ECF with the pump term; Ca, Mg, citrate, acetate) → O2 delivery → lactate
  │              → acid–base (dynamic SID, bounded pH) → out {Na,K,kEcg,Cl,iCa,Mg,lactate,Hb,albuminGL,AG,osm,COP,hbfRel,bvRel}
  │     pipeline.ts: labs (1 Hz `labs`, delayed `labResult`) → ps.blood.events; view for Stage 3; cold units → rs.temp
  │     circ-adapter.ts: ΔBV → hs.circ.vol (100 ms events), ext.kChem, CO0 = circ.ref.co; pPv + COP → rs.evlwiExtra → 7b resolveLung
  │     engine: ECG deltas (mods.k, mods.qtc) after the pass
  └─ advanceHemo (Stage 7a) — the circuit integrates the blood's volume events; chemistry contractility via ext.kChem
```


## File map

| Path | Responsibility |
|---|---|
| `packages/engine-core/src/types-blood.ts` | Stage 7c public types: blood clinical events (`fluid` incl. 7a's ids, `bleed`, `transfusion`, `drug` fallback, `metabolic`, `lab`, `condition` burns/dka), `labs`/`labResult` events, `PatientProfile.blood` |
| `…/src/l2/blood/params.ts` | constants (molar masses, compartments, fluid compositions incl. hypertonic saline, kinetics), `bloodPatient(profile)` |
| `…/src/l2/blood/odc.ts` | Dash–Bassingthwaighte P50 shifts + Hill curve with CO (PORTED, Apache header, N-P09) |
| `…/src/l2/blood/acid-base.ts` | Figge/Stewart charge balance with dynamic SID, Hb buffer, bounded pH bisection, HCO3/BE/AG (PORTED, Apache header, N-P08) |
| `…/src/l2/blood/fluids.ts` | plasma / interstitium / cells, RBC mass, oncotic pressure, transcapillary flux, lymph, elimination (or 7d's urine), colloid, bleed, refill (PORTED topology, Apache header, N-P23) |
| `…/src/l2/blood/solutes.ts` | ECF solute amounts, cellular K pool, transcellular shifts (pump-rate multiplier), fluid/product composition entry |
| `…/src/l2/blood/treatments.ts` | succinylcholine pulse, insulin–dextrose, salbutamol (fallback), calcium, bicarbonate, the K pump gain |
| `…/src/l2/blood/oxygen.ts` | CaO2, DO2, VO2 supply dependence (global + demand-normalised regional), SvO2, O2ER, lactate production/clearance |
| `…/src/l2/blood/circ-adapter.ts` | 7a duck typing: volume events, `ext.kChem`, `ref.co`; Stage 2 fallback for unit rigs; lung water from `circOut.pPv` |
| `…/src/l2/blood/labs.ts` | lab panel values, `labs` 1 Hz event, delayed `labResult` (send ABG) |
| `…/src/l2/blood/core.ts` | engine-independent 10 Hz step: fluids → solutes → O2/lactate → pH; `createBloodCore`, `stepBloodCore`; `BloodOut`, the 7d `RenalSeam` |
| `…/src/l2/blood/pipeline.ts` | `BloodState` (`out`, `events`), `createBloodState`, `advanceBlood`, the 7g observer (`pkBus`, `observeDoses`), the `BloodView` for Stage 3, command hooks, ECG deltas |
| `…/src/l2/gas/o2.ts` | the ODC swap: `odc`, `content`, `po2ForContent` take an `OdcCtx` (default = Stage 3's patient) |
| `…/src/l2/lung/mix-o2.ts`, `lung.ts`, `conditions.ts` | exception E-7c-1: `O2LungInputs.odc`, `GasInputs.odc`, `resolveLung(…, evlwiAdd)` |
| `…/src/l2/resp/pipeline.ts` | `RespCtx.blood` view → O2 inputs and the lung step, SpO2 dyshaemoglobin reading, `RespState.evlwiExtra`, exported `metabolic(rs, t, gas)` |
| `…/src/engine.ts`, `src/types.ts`, `src/index.ts` | state, command order, flush, ECG deltas, restore guard, exports |
| `packages/renderer/src/lab-panel.ts` | lab/ABG panel DOM widget (demo + skins later) |
| `packages/validation/src/oracle/pulse-node-shim.ts` | lets the spike's WEB wasm run in Node (fetch from disk, poses as a worker) |
| `…/test/helpers/blood.ts` | engine rig, `runTo` (yields per sim-minute), `labsAt`, white-box `st(e)`, `circVolumeMl`, `circCoLpm` |
| `packages/validation/src/oracle/blood-scenarios.ts`, `test/oracle-blood.test.ts` | Pulse oracle: 20 % haemorrhage, 1 L crystalloid, insulin/glucose (stub), bicarbonate |
| `apps/demo/stage7c.html`, `apps/demo/src/stage7c.ts`, `apps/demo/scripts/stage7c-shots.mjs` | demo page and gate screenshots |
| `docs/gates/stage-7c.md` | gate evidence |

---
## Tasks

### Task 1: Branch, worktree, Stage 7c public types

**Files:**
- Create: `packages/engine-core/src/types-blood.ts`, `packages/engine-core/test/types-blood.test.ts`
- Modify: `packages/engine-core/src/types.ts` (4 additive edits), `packages/engine-core/src/index.ts` (1 line)

**Interfaces:**
- Produces: `BloodFluidId` (incl. 7a's `crystalloid`/`colloid`/`blood`), `BloodProductId`, `BloodDrugId`, `BloodClinicalEvent` (`fluid`, `bleed`, `transfusion`, `drug` — the no-7g fallback shape, `metabolic`, `condition` burns/dka, `lab`), `BloodProfile` (`PatientProfile.blood`), `LabPanel`, `BloodEvent` (`labs`, `labResult`), `BloodCommandBody`; `Command` and `EngineEvent` include them; all re-exported from `@pme/engine-core`.

- [x] **Step 1: Create the branch and worktree**

```bash
git fetch origin && git worktree add ../scratch/wt-stage-7c -b stage-7c-blood origin/main
cd ../scratch/wt-stage-7c && npx -y pnpm@9.15.9 install
```

Every later command runs in `../scratch/wt-stage-7c`. Check the base first: `git log --oneline origin/main | head -20` must show the Stage 7b and Stage 7g merges, and `ls packages/engine-core/src/l2/pk packages/engine-core/src/l2/lung/mix-o2.ts` must succeed (else stop and tell the orchestrator — Global Constraints). Copy this plan into the worktree (`cp ../../repo/docs/plans/stage-7c-blood.md docs/plans/` if it is not yet on `main`) and tick it there.

- [x] **Step 2: Write the failing test**

`packages/engine-core/test/types-blood.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { BloodClinicalEvent, Command, EngineEvent, LabPanel, PatientProfile } from '../src/index.ts';

describe('Stage 7c public types', () => {
  it('blood events are Commands, labs are EngineEvents, the profile carries blood chemistry', () => {
    const ev: BloodClinicalEvent = { kind: 'transfusion', product: 'rbc', units: 2, storageDays: 35 };
    const c: Command = { id: 'x', issuedBy: 't', type: 'applyEvent', event: ev };
    const keys: (keyof LabPanel)[] = ['ph', 'pco2', 'po2', 'hco3', 'be', 'lactate', 'na', 'k', 'cl', 'iCa', 'hb', 'glucose'];
    const e: EngineEvent['type'] = 'labResult';
    const p: PatientProfile = { ageY: 40, blood: { hb: 9, cohb: 0.06, burns: 0.5 } };
    expect(c.type).toBe('applyEvent');
    expect(keys).toHaveLength(12);
    expect(e).toBe('labResult');
    expect(p.blood?.hb).toBe(9);
  });
});
```

- [x] **Step 3: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/types-blood.test.ts`
Expected: FAIL (typecheck/transform: `BloodClinicalEvent` is not exported; `blood` is not in `PatientProfile`).

- [x] **Step 4: Implement**

`packages/engine-core/src/types-blood.ts`:

```ts
// Stage 7c public types (tables §5b; plan decisions 11–13), in their own file so parallel stages do not collide in
// types.ts. types.ts adds `BloodCommandBody` and `BloodEvent` to its unions and `blood?: BloodProfile` to PatientProfile.
import type { SimSeconds } from './types.ts';

/**
 * `crystalloid` (Stage 7a's name) and a missing `fluid` both mean 0.9 % saline; 7a's `colloid` means 4 % gelatin and
 * its `blood` means whole blood (plan decision 11).
 */
export type BloodFluidId = 'saline' | 'rl' | 'balanced' | 'albumin5' | 'gelatin' | 'd5w' | 'glycine' | 'crystalloid' | 'colloid' | 'blood';
export type BloodProductId = 'rbc' | 'ffp' | 'platelets' | 'wholeBlood';
export type BloodDrugId =
  | 'succinylcholine' | 'insulinDextrose' | 'salbutamol' | 'calciumChloride' | 'calciumGluconate' | 'sodiumBicarbonate' | 'magnesium';

/**
 * Brief §7.2 ClinicalEvent members Stage 7c implements (volumes mL, rates mL/min, times s). The `drug` member is the
 * FALLBACK shape only: with Stage 7g in the engine every `drug` event is 7g's (`PkClinicalEvent`, R51 §3) and 7c
 * observes the accepted doses on `ps.pk.bus.doses` (plan decision 11).
 */
export type BloodClinicalEvent =
  | { kind: 'fluid'; fluid?: BloodFluidId; volumeMl?: number; overS?: number; rateMlPerMin?: number }
  | { kind: 'bleed'; volumeMl?: number; overS?: number; rateMlPerMin?: number }
  | { kind: 'transfusion'; product: BloodProductId; units: number; overS?: number; storageDays?: number; warmed?: boolean }
  | { kind: 'drug'; drugId: BloodDrugId; dose: number; unit: 'mg' | 'g' | 'mcg' | 'mmol' | 'mmol/kg' | 'mg/kg' | 'units'; route?: 'iv' | 'neb' }
  /** Scenario inputs: ketoacid anions (target mmol/L, reached over overS) and a mineral-acid load (HCl/NH4Cl, mmol). */
  | { kind: 'metabolic'; ketoacidsMmolL?: number; acidMmol?: number; overS?: number }
  | { kind: 'condition'; id: 'burns' | 'dka'; severity: number }
  /** Instructor "send ABG/VBG": the panel is frozen now and returned as `labResult` after the turnaround. */
  | { kind: 'lab'; panel: 'abg' | 'vbg'; turnaroundS?: number };

/** Baseline blood chemistry in the patient profile (defaults: tables §1.1, §5b). `burns` 0–1 (sux sensitivity). */
export interface BloodProfile {
  hb?: number; na?: number; k?: number; cl?: number; iCa?: number; mg?: number; lactate?: number; albuminGL?: number;
  hco3?: number; dpgMmolL?: number; cohb?: number; methb?: number; burns?: number;
}

/** The lab panel (mmHg, mmol/L, g/dL, %; glucose mg/dL is a placeholder until 7e). */
export interface LabPanel {
  ph: number; pco2: number; po2: number; hco3: number; be: number;
  so2: number; cohb: number; methb: number; // co-oximetry, % (so2 fractional)
  lactate: number; na: number; k: number; cl: number; iCa: number; mg: number; hb: number; glucose: number;
  ag: number; osm: number;
}

export type BloodEvent =
  | { type: 'labs'; t: SimSeconds; values: LabPanel }
  | { type: 'labResult'; t: SimSeconds; drawnAt: SimSeconds; panel: 'abg' | 'vbg'; values: LabPanel };

export type BloodCommandBody = { type: 'applyEvent'; event: BloodClinicalEvent };
```

Find (exactly once in `packages/engine-core/src/types.ts`):

```ts
import type { RespCommandBody, RespEvent } from './types-resp.ts'; // Stage 3
```

Replace with:

```ts
import type { RespCommandBody, RespEvent } from './types-resp.ts'; // Stage 3
import type { BloodCommandBody, BloodEvent, BloodProfile } from './types-blood.ts'; // Stage 7c
```

Find (exactly once in `packages/engine-core/src/types.ts`):

```ts
  sex?: 'M' | 'F'; // Stage 3 (brief §7.4 patient.sex)
```

Replace with:

```ts
  sex?: 'M' | 'F'; // Stage 3 (brief §7.4 patient.sex)
  blood?: BloodProfile; // Stage 7c: baseline blood chemistry (tables §1.1, §5b)
```

Find (exactly once in `packages/engine-core/src/types.ts`):

```ts
    | RespCommandBody // Stage 3 (types-resp.ts)
```

Replace with:

```ts
    | RespCommandBody // Stage 3 (types-resp.ts)
    | BloodCommandBody // Stage 7c (types-blood.ts)
```

The `EngineEvent` union ends with the LAST merged stage's member carrying the `;` — on the 7a + 7b + 7g main that is 7g's `DrugsEvent` (7a's `| CircEvent // Stage 7a` sits before it). Append after the last member by content (R50 F6): if a later stage (7f/7d/7e) merged after 7g, move the `;` from ITS member instead.

Find (exactly once in `packages/engine-core/src/types.ts`):

```ts
  | DrugsEvent; // Stage 7g (types-pk.ts)
```

Replace with:

```ts
  | DrugsEvent // Stage 7g (types-pk.ts)
  | BloodEvent; // Stage 7c (types-blood.ts)
```

Find (exactly once in `packages/engine-core/src/index.ts`):

```ts
export * from './types-vent-link.ts'; // Stage V
```

Replace with:

```ts
export * from './types-vent-link.ts'; // Stage V
export * from './types-blood.ts'; // Stage 7c
```

- [x] **Step 5: Run the test and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/types-blood.test.ts` → PASS. Then `npx -y pnpm@9.15.9 typecheck` → exit 0 (the controller's log formatter handles `applyEvent` generically; no change there).

- [x] **Step 6: Commit**

```bash
git add packages/engine-core/src/types-blood.ts packages/engine-core/src/types.ts packages/engine-core/src/index.ts packages/engine-core/test/types-blood.test.ts docs/plans/stage-7c-blood.md
git commit -m "feat(blood): Stage 7c public types (blood events, labs, PatientProfile.blood)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7c-blood
```

### Task 2: Constants, molar masses, fluid compositions and patient scaling

**Files:**
- Create: `packages/engine-core/src/l2/blood/params.ts`, `packages/engine-core/test/l2/blood/params.test.ts`

**Interfaces:**
- Consumes: `PatientProfile` (incl. `blood?: BloodProfile`, Task 1).
- Produces: `BLOOD_DT_S`, `MOLAR_MASS`, `mgdlToMmol`, `NORMAL`, `MG_ION_FRAC`, `MCHC_G_PER_ML`, the fluid-kinetic constants (`KF_ML_MIN_MMHG`, `SIGMA_PROTEIN`, `PC_PER_ML`, `CISF_PER_ML`, `LYMPH_GAIN`, `PI_ISF0`, `K_EL_AWAKE`, `K_EL_GA_FACTOR`, `ALB_RESTORE_TAU_MIN`, `OSM_TAU_MIN`, `OSM0`), the O2/lactate constants (`LACTATE_V_L_PER_KG`, `K_LAC_PER_H`, `K_ANAER`, `DO2_CRIT_ML_KG_MIN`, `ER_MAX`, `REGIONAL_FRAC`, `REGIONAL_FLOW_ON`, `REGIONAL_FLOW_FULL`, `HBF_FRAC`, `HBF_EXP`), `ageBandB`, `BloodPatient`, `bloodPatient(profile)`, `Composition`, `FLUIDS`/`FluidId`, `PRODUCTS`/`ProductId`, `storedK(days)`, `COLD_UNIT_C`, `COLLOID_T12_MIN`, `hypertonicSaline(pct) → Composition`, `MG_MMOL_PER_G` 4.06.

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l2/blood/params.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { bloodPatient, FLUIDS, MOLAR_MASS, PRODUCTS, storedK } from '../../../src/l2/blood/params.ts';

describe('7c constants and patient scaling (tables §1.1–1.3, §5b.4)', () => {
  it('70 kg man: BV 70 mL/kg, Hb 15, TBW 0.6 L/kg; woman 65 mL/kg, Hb 13.5, TBW 0.5; obese BV by Lemmens', () => {
    const m = bloodPatient({ ageY: 40, sex: 'M', weightKg: 70, heightCm: 175 });
    expect(m.bvMl).toBeCloseTo(70 * 70 * Math.min(1, 1 / Math.sqrt(22.86 / 22)), -1);
    expect(m.hb).toBe(15);
    expect(m.plasmaMl + m.isfMl + m.icfMl).toBeCloseTo(42000, -1);
    const f = bloodPatient({ ageY: 40, sex: 'F', weightKg: 60, heightCm: 165 });
    expect(f.hb).toBe(13.5);
    expect(f.icfMl).toBeCloseTo(20000, -1);
    const o = bloodPatient({ ageY: 40, sex: 'M', weightKg: 127, heightCm: 175 });
    expect(o.bvMl / 127).toBeLessThan(55); // BMI 41.5 → 51 mL/kg (tables §1.3: 50–55)
    expect(bloodPatient({ ageY: 40, sex: 'M', weightKg: 70, heightCm: 175, blood: { hb: 9 } }).hb).toBe(9);
    expect(bloodPatient({ ageY: 0.01 }).hb).toBe(17);
  });
  it('molar masses (K 39.098) and compositions', () => {
    expect(MOLAR_MASS.k).toBe(39.098);
    expect(FLUIDS.saline.na - FLUIDS.saline.cl).toBe(0);
    expect(FLUIDS.balanced.na + FLUIDS.balanced.k + 2 * FLUIDS.balanced.mg - FLUIDS.balanced.cl - FLUIDS.balanced.xa).toBe(27); // acetate
    expect(PRODUCTS.rbc.ml * PRODUCTS.rbc.comp.hct).toBeCloseTo(168, 6);
    expect(storedK(35)).toBe(35);
    expect(storedK(60)).toBe(50);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/params.test.ts`
Expected: FAIL: cannot resolve the module under test.

- [x] **Step 3: Implement**

`packages/engine-core/src/l2/blood/params.ts`:

```ts
// Stage 7c constants and patient scaling (tables §1.1–1.5, §5.3, §5b.1–5b.4; annex §5b). Every number cites its
// row, or [ENG] with the prototype number it was tuned to (plan "Prototype results"). Units: mmol/L, g/L albumin,
// g/dL Hb, mL, mmHg, s (see the plan's Global Constraints).
import type { PatientProfile } from '../../types.ts';

export const BLOOD_DT_S = 0.1; // 10 Hz, with Stage 3's gas step (brief §3.2)

/** Molar masses, g/mol (IUPAC). K is 39.098 — Pulse's 31.1 (annex D14) must never appear. */
export const MOLAR_MASS = { na: 22.99, k: 39.098, cl: 35.453, ca: 40.078, mg: 24.305, lactate: 89.07, hco3: 61.017, glucose: 180.16 } as const;
export const mgdlToMmol = (mgdl: number, mm: number): number => (mgdl * 10) / mm;

/** Normal plasma values (tables §5b.1–5b.2; annex §5b rows "same"). */
export const NORMAL = {
  na: 140, k: 4.2, cl: 104, iCa: 1.2, mg: 0.85, lactate: 1.0, albGL: 40, piMmolL: 1.1, hco3: 24.4, paco2: 40,
  dpgMmolL: 4.65, glucoseMgDl: 100, ureaMmolL: 5,
} as const;
/** Ionised share of total Mg for the SID (≈ 0.6 of 0.85 mmol/L) [TXT]. */
export const MG_ION_FRAC = 0.6;

/** Red cells: Hct = Hb·3/100, i.e. MCHC 33.3 g/dL [TXT]. */
export const MCHC_G_PER_ML = 1 / 3;

// --- fluid kinetics (tables §5b.4; annex B1 "tissue fluid branch": vascular → R_t → ECF(C) → lymph) -------------
/**
 * Capillary filtration coefficient, whole body, mL/min/mmHg [ENG, Q47]. Fitted with CISF_PER_ML and K_EL_AWAKE (prototype
 * sweep) to tables §5b.4: 1 L crystalloid over 30 min awake → 51 % intravascular at the end, 16 % 30 min later, total
 * excess halved 30 min after the end; haemorrhage refill 0.16 mL/kg/min early (band 0.1–0.5).
 */
export const KF_ML_MIN_MMHG = 2.0;
/** Reflection coefficient to plasma protein [TXT]. */
export const SIGMA_PROTEIN = 0.9;
/** Capillary hydrostatic change per mL of blood-volume change: half the venous change (C_sys 110 mL/mmHg) [ENG]. */
export const PC_PER_ML = 0.5 / 110;
/** Interstitial compliance, mL/mmHg per mL of baseline ISF volume (≈ 230 mL/mmHg at 11.4 L) [ENG, fitted with Kf]. */
export const CISF_PER_ML = 0.02;
/** Extra lymph flow per mmHg of interstitial pressure rise, mL/min/mmHg [ENG]. */
export const LYMPH_GAIN = 2;
/** Interstitial colloid osmotic pressure at baseline, mmHg [TXT]. */
export const PI_ISF0 = 8;
/**
 * Renal elimination of excess volume, 1/min on the BLOOD-volume excess (plasma is shed): awake 0.03 (total excess t½ ≈ 30 min, fitted), general
 * anaesthesia ×0.2 (t½ ≈ 150 min) — tables `t12El` 30 / 150 [TXT, Q47]. 7d replaces this with its UOP.
 */
export const K_EL_AWAKE = 0.03;
export const K_EL_GA_FACTOR = 0.2;
/** Plasma albumin below its baseline concentration is replenished from the interstitial pool, τ 120 min [ENG]. */
export const ALB_RESTORE_TAU_MIN = 120;
/** Water moves between ISF and cells toward osmotic equilibrium, τ 10 min [ENG]. */
export const OSM_TAU_MIN = 10;
/** ICF effective osmolality at baseline ≈ 2·Na 140 + 10 (glucose, urea) mOsm/kg [TXT]. */
export const OSM0 = 290;

// --- lactate and oxygen (tables §5.3) ------------------------------------------------------------------------------
export const LACTATE_V_L_PER_KG = 0.6; // `vLac` [ENG]
export const K_LAC_PER_H = 1.389; // `kLac` 1400 mmol/day ÷ (1.0 mmol/L · 0.6 L/kg · 70 kg) — t½ 30 min [ENG, Q41]
export const K_ANAER = 0.05; // mmol lactate per mL O2 deficit `kAnaer` (range 0.015–0.06): untreated VF 30 min → 9–10 mmol/L (annex D1 8–12) [ENG, Q41]
export const DO2_CRIT_ML_KG_MIN = 6; // `do2Crit` (4.9–8.2) [TXT, Q42]
export const ER_MAX = 0.7; // `erMax` [TXT]
/**
 * Regional supply dependence [ENG, Q41/Q42]: splanchnic, skin and muscle beds (≈ 60 % of VO2) lose flow first when
 * CARDIAC OUTPUT falls (sympathetic redistribution), so they become supply-dependent as CO/CO0 falls from 0.88 to 0.40
 * — a FLOW criterion, so chronic anaemia at normal flow does not make lactate (its limit is the global DO2crit).
 * Tuned so tables §7 17a (class III: lactate 3–5 by 30 min) holds.
 */
export const REGIONAL_FRAC = 0.6;
export const REGIONAL_FLOW_ON = 0.88;
export const REGIONAL_FLOW_FULL = 0.55;
/** Hepatic blood flow share of CO: ICRP-89 male 0.255 (N-P10; annex §5.3 `hbfFrac` "same"). */
export const HBF_FRAC = 0.255;
/** Splanchnic flow falls faster than CO: hbfRel = (CO/CO0)^2 (tables §5.3 `hbfFactor` ×0.6 on top of CO −40 % in class III) [ENG]. */
export const HBF_EXP = 2;

export type AgeBandB = 'neonate' | 'infant' | 'child' | 'adolescent' | 'adult' | 'elderly';
export function ageBandB(ageY: number): AgeBandB {
  if (ageY < 28 / 365) return 'neonate';
  if (ageY < 1) return 'infant';
  if (ageY < 12) return 'child';
  if (ageY < 18) return 'adolescent';
  return ageY >= 65 ? 'elderly' : 'adult';
}
/** Tables §1.1 blood volume (mL/kg) and Hb (g/dL) by band; §1.2 female values. */
const BAND: Record<AgeBandB, { bvM: number; bvF: number; hbM: number; hbF: number; w: number; h: number }> = {
  neonate: { bvM: 87, bvF: 87, hbM: 17, hbF: 17, w: 3.5, h: 50 },
  infant: { bvM: 78, bvF: 78, hbM: 11.5, hbF: 11.5, w: 7, h: 65 },
  child: { bvM: 72, bvF: 72, hbM: 12.5, hbF: 12.5, w: 16, h: 102 },
  adolescent: { bvM: 70, bvF: 65, hbM: 13.5, hbF: 13, w: 55, h: 165 },
  adult: { bvM: 70, bvF: 65, hbM: 15, hbF: 13.5, w: 70, h: 175 },
  elderly: { bvM: 65, bvF: 60, hbM: 13.5, hbF: 13, w: 70, h: 170 },
};

export interface BloodPatient {
  weightKg: number;
  bvMl: number; // blood volume
  hb: number; // g/dL
  plasmaMl: number;
  isfMl: number;
  icfMl: number;
  vLacL: number;
  vo2Rest: number; // awake mL/min (tables §1.1: 3.5 mL/kg/min adult) — used only when Stage 3 is absent
}

/**
 * Patient scaling. Blood volume by band (tables §1.1) and Lemmens for adults (§1.3: 70/√(BMI/22) mL/kg of actual
 * weight, capped at the band value below BMI 22). TBW 0.6 (M) / 0.5 (F) L/kg; ICF 2/3; ECF 1/3; plasma = BV·(1 − Hct).
 */
export function bloodPatient(p: PatientProfile | undefined): BloodPatient {
  const band = ageBandB(p?.ageY ?? 40);
  const b = BAND[band];
  const female = p?.sex === 'F';
  const w = p?.weightKg ?? b.w;
  const h = p?.heightCm ?? b.h;
  const bmi = w / (h / 100) ** 2;
  let bvKg = female ? b.bvF : b.bvM;
  if ((band === 'adult' || band === 'elderly') && bmi > 22) bvKg = Math.min(bvKg, 70 / Math.sqrt(bmi / 22));
  const bv = bvKg * w;
  const hb = p?.blood?.hb ?? (female ? b.hbF : b.hbM);
  const hct = (hb * 3) / 100;
  const tbw = (female ? 0.5 : 0.6) * w * 1000;
  const ecf = tbw / 3;
  const plasma = bv * (1 - hct);
  return { weightKg: w, bvMl: bv, hb, plasmaMl: plasma, isfMl: Math.max(0.5 * ecf, ecf - plasma), icfMl: (2 * tbw) / 3, vLacL: LACTATE_V_L_PER_KG * w, vo2Rest: 3.5 * w };
}

/** Composition of fluids and blood products, per litre (or per unit where stated). mmol/L unless noted [TXT]. */
export interface Composition {
  na: number; k: number; cl: number; ca: number; mg: number;
  lactate: number; // metabolised to bicarbonate (liver)
  metab: number; // acetate (metabolised to bicarbonate, τ 15 min)
  xa: number; // gluconate: an unmeasured anion here (renal excretion is 7d's) [ENG]
  albGL: number; // true albumin g/L (oncotic AND acid–base)
  colloidGL: number; // synthetic colloid, albumin-equivalent oncotic g/L
  osmOther: number; // non-Na effective osmoles (glycine) mOsm/L
  hct: number; // red-cell volume fraction
  citrate: number; // mmol/L
}
const Z: Composition = { na: 0, k: 0, cl: 0, ca: 0, mg: 0, lactate: 0, metab: 0, xa: 0, albGL: 0, colloidGL: 0, osmOther: 0, hct: 0, citrate: 0 };
export const FLUIDS = {
  saline: { ...Z, na: 154, cl: 154 }, // 0.9 % NaCl
  rl: { ...Z, na: 130, k: 4, cl: 109, ca: 1.35, lactate: 28 }, // Ringer's lactate / Hartmann's
  balanced: { ...Z, na: 140, k: 5, cl: 98, mg: 1.5, metab: 27, xa: 23 }, // Plasma-Lyte 148 (acetate 27, gluconate 23)
  albumin5: { ...Z, na: 145, cl: 100, albGL: 50 }, // 5 % albumin [VERIFY Cl]
  gelatin: { ...Z, na: 154, cl: 120, colloidGL: 35 }, // 4 % succinylated gelatin [ENG oncotic equivalent]
  d5w: { ...Z }, // free water once the glucose is taken up
  glycine: { ...Z, osmOther: 200 }, // 1.5 % glycine irrigant (TURP/hysteroscopy absorption)
} as const satisfies Record<string, Composition>;
export type FluidId = keyof typeof FLUIDS;
/** Hypertonic saline of `pct` % NaCl (3 % → 513 mmol/L Na and Cl; NaCl 58.44 g/mol): observed from 7g's dose log (R51 addendum 14). */
export const hypertonicSaline = (pct: number): Composition => {
  const m = (pct * 10 * 1000) / 58.44;
  return { ...FLUIDS.d5w, na: m, cl: m };
};
/** Magnesium sulfate heptahydrate (246.5 g/mol): mmol Mg per gram [TXT]. */
export const MG_MMOL_PER_G = 4.06;

/** Blood products per UNIT (tables §5b.4): volume mL and contents. Citrate ≈ 3 g (15.6 mmol) per unit [TXT, Q46]. */
export const PRODUCTS = {
  rbc: { ml: 280, comp: { ...Z, na: 150, cl: 150, hct: 0.6, citrate: 15.6 / 0.28 } },
  ffp: { ml: 250, comp: { ...Z, na: 165, k: 4, cl: 75, albGL: 40, citrate: 15.6 / 0.25 } },
  platelets: { ml: 250, comp: { ...Z, na: 150, cl: 100, albGL: 40, citrate: 8 / 0.25 } },
  wholeBlood: { ml: 500, comp: { ...Z, na: 150, k: 4, cl: 100, albGL: 40, hct: 0.4, citrate: 15.6 / 0.5 } },
} as const;
export type ProductId = keyof typeof PRODUCTS;
/** Stored-blood supernatant K ≈ storage days mmol/L (tables `kUnit`, StoredK), in the non-cell volume [TXT]. */
export const storedK = (days: number): number => Math.min(50, Math.max(1, days));
/** Unwarmed unit: −0.25 °C core per unit (tables §5b.4) [VERIFY]. */
export const COLD_UNIT_C = 0.25;
/** Synthetic colloid plasma t½: gelatin 150 min (tables `t12Colloid`) [VERIFY]. */
export const COLLOID_T12_MIN = 150;
```



- [x] **Step 4: Run the test**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/params.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/blood/params.ts packages/engine-core/test/l2/blood/params.test.ts
git commit -m "feat(blood): constants, fluid compositions and patient scaling" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7c-blood
```

### Task 3: Dash–Bassingthwaighte oxygen dissociation curve (ported)

**Files:**
- Create: `packages/engine-core/src/l2/blood/odc.ts`, `packages/engine-core/test/l2/blood/odc.test.ts`

**Interfaces:**
- Produces: `OdcCtx {hb, ph, dpgMmolL, cohb, methb}`, `ODC_DEFAULT`, `p50(ctx, pco2, tempC)`, `hillN(ctx)`, `satDB(po2, pco2, tempC, ctx)` (functional saturation 0–1), `contentDB(po2, pco2, tempC, ctx)` (mL/L), `pulseOxApparent(s, ctx)` (Task 14 uses it).

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l2/blood/odc.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { contentDB, hillN, ODC_DEFAULT, p50, satDB } from '../../../src/l2/blood/odc.ts';

describe('Dash–Bassingthwaighte ODC (tables §5b.3; audit #6/A14)', () => {
  it('P50 is 26.8 mmHg at pH 7.4, PCO2 40, 37 °C, DPG 4.65, no CO; S(P50) = 0.5; Hill n 2.7', () => {
    expect(p50(ODC_DEFAULT, 40, 37)).toBeCloseTo(26.8, 1);
    expect(satDB(p50(ODC_DEFAULT, 40, 37), 40, 37, ODC_DEFAULT)).toBeCloseTo(0.5, 6);
    expect(hillN(ODC_DEFAULT)).toBe(2.7);
    expect(satDB(100, 40, 37, ODC_DEFAULT)).toBeGreaterThan(0.965);
    expect(satDB(60, 40, 37, ODC_DEFAULT)).toBeGreaterThan(0.88);
    expect(satDB(40, 40, 37, ODC_DEFAULT)).toBeCloseTo(0.75, 1);
  });
  it('shifts: acidosis, hypercapnia, fever and 2,3-DPG right; alkalosis, hypothermia and CO left', () => {
    const base = p50(ODC_DEFAULT, 40, 37);
    expect(p50({ ...ODC_DEFAULT, ph: 7.2 }, 40, 37) - base).toBeGreaterThan(4); // Bohr: 31.4
    expect(p50({ ...ODC_DEFAULT, ph: 7.6 }, 40, 37) - base).toBeLessThan(-3.5); // 22.9
    expect(p50(ODC_DEFAULT, 60, 37)).toBeGreaterThan(base);
    expect(p50(ODC_DEFAULT, 40, 39)).toBeCloseTo(29.9, 0);
    expect(p50(ODC_DEFAULT, 40, 33)).toBeCloseTo(21.4, 0);
    expect(p50({ ...ODC_DEFAULT, dpgMmolL: 7 }, 40, 37)).toBeCloseTo(28.5, 0); // tables: +2–5 in chronic anaemia
    expect(p50({ ...ODC_DEFAULT, cohb: 0.2 }, 40, 37)).toBeCloseTo(22.8, 0); // 26.8 − 20·S_CO
    expect(hillN({ ...ODC_DEFAULT, cohb: 0.2 })).toBeCloseTo(2.48, 6);
  });
  it('content: 13.4·Hb·S·(1 − COHb − MetHb) + 0.03·PO2 mL/L', () => {
    const s = satDB(100, 40, 37, ODC_DEFAULT);
    expect(contentDB(100, 40, 37, ODC_DEFAULT)).toBeCloseTo(13.4 * 15 * s + 3, 6);
    expect(contentDB(100, 40, 37, { ...ODC_DEFAULT, cohb: 0.2 })).toBeLessThan(0.82 * contentDB(100, 40, 37, ODC_DEFAULT));
    expect(satDB(0, 40, 37, ODC_DEFAULT)).toBe(0);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/odc.test.ts`
Expected: FAIL: cannot resolve the module under test.

- [x] **Step 3: Implement**

`packages/engine-core/src/l2/blood/odc.ts`:

```ts
// SPDX-License-Identifier: Apache-2.0
// Portions derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), src/cpp/engine/common/system/physiology/
// Saturation.cpp (lines 931–1053), Copyright 2018-2025 Kitware, Inc. and Contributors, itself a fork of BioGears 6.1.1,
// Copyright 2015 Applied Research Associates, Inc.; licensed under the Apache License, Version 2.0; modified:
// re-expressed in TypeScript and simplified for the monitor tick (closed-form Hill curve, no per-compartment Newton
// solve) (see NOTICES N-P09). Primary model: Dash & Bassingthwaighte, Ann Biomed Eng 2004;32:1676 (erratum 2010;
// 38:1683); Dash, Korman & Bassingthwaighte, Eur J Appl Physiol 2016;116:97.
//
// Oxygen dissociation (tables §5b.3 P50 row; audit #6, A14): SHbO2 = x^n/(1 + x^n), x = PO2/P50, with
//   n   = 2.7 − 1.1·S_CO                                   (CO flattens the curve)
//   P50 = (26.8 − 20·S_CO) · Π_k (P50_k / 26.8)            (independent shifts, multiplicative)
//   P50_pH   = 26.765 − 21.279·ΔpH + 8.872·ΔpH²            ΔpH = pH − 7.4
//   P50_PCO2 = 26.80 + 0.0428·ΔPCO2 + 3.64e-5·ΔPCO2²       ΔPCO2 = PCO2 − 40
//   P50_DPG  = 26.8 + 795.63·ΔDPG − 19660.89·ΔDPG²         ΔDPG = [DPG] − 4.65e-3 mol/L
//   P50_T    = 26.8 + 1.4945·ΔT + 0.04335·ΔT² + 0.0007·ΔT³ ΔT = T − 37
// S_CO is the COHb fraction of total Hb. The returned saturation is FUNCTIONAL (HbO2 over Hb available for O2,
// i.e. excluding COHb and MetHb); content multiplies by (1 − COHb − MetHb).

export interface OdcCtx {
  hb: number; // g/dL
  ph: number;
  dpgMmolL: number; // 2,3-DPG, mmol/L red cell (4.65 normal)
  cohb: number; // fraction 0–1
  methb: number; // fraction 0–1
}

export const ODC_DEFAULT: OdcCtx = { hb: 15, ph: 7.4, dpgMmolL: 4.65, cohb: 0, methb: 0 };

/** P50 (mmHg) for the given state. At pH 7.4, PCO2 40, 37 °C, DPG 4.65, no CO: 26.8 (± 0.04). */
export function p50(ctx: OdcCtx, pco2: number, tempC: number): number {
  const dph = ctx.ph - 7.4;
  const dco2 = Math.max(5, pco2) - 40;
  const ddpg = (ctx.dpgMmolL - 4.65) / 1000;
  const dt = tempC - 37;
  const fPh = (26.765 - 21.279 * dph + 8.872 * dph * dph) / 26.8;
  const fCo2 = (26.8 + 0.0428 * dco2 + 3.64e-5 * dco2 * dco2) / 26.8;
  const fDpg = (26.8 + 795.63 * ddpg - 19660.89 * ddpg * ddpg) / 26.8;
  const fT = (26.8 + 1.4945 * dt + 0.04335 * dt * dt + 0.0007 * dt * dt * dt) / 26.8;
  return Math.max(5, (26.8 - 20 * ctx.cohb) * fPh * fCo2 * fDpg * fT);
}

/** Hill coefficient: 2.7 − 1.1·S_CO. */
export function hillN(ctx: OdcCtx): number {
  return 2.7 - 1.1 * ctx.cohb;
}

/** Functional HbO2 saturation 0–1. */
export function satDB(po2: number, pco2: number, tempC: number, ctx: OdcCtx): number {
  if (po2 <= 0) return 0;
  const x = (po2 / p50(ctx, pco2, tempC)) ** hillN(ctx);
  return x / (1 + x);
}

/** O2 content, mL O2 per L blood: 13.4·Hb·S·(1 − COHb − MetHb) + 0.03·PO2 (tables §5b.3 caO2 row, ×10 for per L). */
export function contentDB(po2: number, pco2: number, tempC: number, ctx: OdcCtx): number {
  return 13.4 * ctx.hb * satDB(po2, pco2, tempC, ctx) * Math.max(0, 1 - ctx.cohb - ctx.methb) + 0.03 * Math.max(0, po2);
}

/**
 * What a two-wavelength pulse oximeter reports (0–1) for a functional saturation `s` (plan decision 12; research 03
 * §3.6): COHb reads as O2Hb; MetHb pulls the reading toward 85 % (weight min(1, MetHb/0.3)) [TXT shape, ENG weight].
 * Identity when COHb = MetHb = 0.
 */
export function pulseOxApparent(s: number, ctx: OdcCtx): number {
  if (ctx.cohb === 0 && ctx.methb === 0) return s;
  const a = s * (1 - ctx.cohb - ctx.methb) + ctx.cohb;
  const w = Math.min(1, ctx.methb / 0.3);
  return a * (1 - w) + 0.85 * w;
}
```

The file header is the annex §E Apache header (R34) naming Pulse 4.3.2, commit e8a3649, `Saturation.cpp` 931–1053; Task 25 checks it.

- [x] **Step 4: Run the test**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/odc.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/blood/odc.ts packages/engine-core/test/l2/blood/odc.test.ts
git commit -m "feat(blood): Dash–Bassingthwaighte ODC (ported from Pulse, N-P09)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7c-blood
```

### Task 4: Figge/Stewart acid–base with dynamic SID and a bounded pH search (ported)

**Files:**
- Create: `packages/engine-core/src/l2/blood/acid-base.ts`, `packages/engine-core/test/l2/blood/acid-base.test.ts`

**Interfaces:**
- Produces: `PH_MIN` 6.5, `PH_MAX` 7.9 (audit A13), `CO2_SOL` 0.0307, `Chem {sid, albGL, piMmolL, hb}`, `AcidBase {ph, hco3, be, atot, iter, atBound, residual}`, `hco3Of(ph, pco2)`, `chargeResidual(ph, pco2, chem)`, `baseExcess(ph, hco3)`, `solvePh(pco2, chem)`, `anionGap(na, cl, hco3)`.

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l2/blood/acid-base.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { anionGap, baseExcess, chargeResidual, hco3Of, PH_MAX, PH_MIN, solvePh } from '../../../src/l2/blood/acid-base.ts';

const N = { sid: 38.1, albGL: 40, piMmolL: 1.1, hb: 15 };

describe('Figge/Stewart charge balance, bounded pH search (tables §5b.1; audit #5/A13)', () => {
  it('normal SID gives pH ≈ 7.40, HCO3 ≈ 24.4–25, BE ≈ 0, in ≤ 16 bisection steps with zero residual', () => {
    const a = solvePh(40, N);
    expect(a.ph).toBeGreaterThan(7.38);
    expect(a.ph).toBeLessThan(7.42);
    expect(a.hco3).toBeGreaterThan(24);
    expect(a.hco3).toBeLessThan(25.5);
    expect(Math.abs(a.be)).toBeLessThan(1);
    expect(a.iter).toBeLessThanOrEqual(16);
    expect(a.atBound).toBe(false);
    expect(Math.abs(chargeResidual(a.ph, 40, N))).toBeLessThan(0.01);
  });
  it('acute respiratory compensation: HCO3 +0.7–1.2 per 10 mmHg PaCO2 rise (tables row), BE stays ≈ 0', () => {
    const lo = solvePh(40, N);
    const hi = solvePh(60, N);
    const slope = (hi.hco3 - lo.hco3) / 2;
    expect(slope).toBeGreaterThanOrEqual(0.7);
    expect(slope).toBeLessThanOrEqual(1.2);
    expect(Math.abs(hi.be - lo.be)).toBeLessThan(1);
  });
  it('acute respiratory alkalosis: HCO3 falls 0.12–0.2 per mmHg PaCO2 fall (40 → 30; tables 0.2) — measured, [ENG] deviation', () => {
    const slope = (solvePh(40, N).hco3 - solvePh(30, N).hco3) / 10;
    console.log(`falling-PaCO2 slope ${slope.toFixed(3)} mmol/L per mmHg (tables 0.2)`);
    expect(slope).toBeGreaterThanOrEqual(0.12);
    expect(slope).toBeLessThanOrEqual(0.2);
  });
  // R45: the tables' 0.2 per mmHg needs cellular H+ release/alkalosis-driven lactate, which the one-pool Figge
  // balance does not have (plan deviation list). Kept visible until Ali's calibration pass decides the mechanism.
  it.fails('acute respiratory alkalosis reaches the tables’ 0.2 mmol/L per mmHg (40 → 30)', () => {
    expect((solvePh(40, N).hco3 - solvePh(30, N).hco3) / 10).toBeGreaterThanOrEqual(0.18);
  });
  it('HCO3 is consistent with pH and PCO2 (Henderson–Hasselbalch) within 0.5 mmol/L everywhere', () => {
    for (const pco2 of [10, 20, 40, 80, 120]) for (const sid of [15, 25, 38, 50, 60]) {
      const a = solvePh(pco2, { ...N, sid });
      const hh = 0.03 * pco2 * 10 ** (a.ph - 6.1); // the tables' 0.03 form
      expect(Math.abs(a.hco3 - hh)).toBeLessThan(0.5 + 0.03 * a.hco3); // 0.0307 vs 0.03: 2.3 % by definition
      expect(a.hco3).toBeCloseTo(hco3Of(a.ph, pco2), 9);
    }
  });
  it('pH stays within 6.5–7.9 (audit A13) for ANY inputs; outside the bracket the bound is returned with atBound and the residual — never folded into HCO3', () => {
    for (const pco2 of [0, 5, 40, 150, 400]) for (const sid of [-20, 0, 20, 40, 80, 200]) for (const alb of [0, 40, 80]) {
      const a = solvePh(pco2, { sid, albGL: alb, piMmolL: 1.1, hb: 15 });
      expect(a.ph).toBeGreaterThanOrEqual(PH_MIN);
      expect(a.ph).toBeLessThanOrEqual(PH_MAX);
      expect(Number.isFinite(a.hco3)).toBe(true);
      expect(a.hco3).toBeCloseTo(hco3Of(a.ph, Math.max(1, pco2)), 9);
      if (!a.atBound) expect(a.residual).toBe(0);
    }
    const low = solvePh(40, { ...N, sid: 0 });
    expect(low.atBound).toBe(true);
    expect(low.residual).toBeLessThan(0);
  });
  it('lactate and chloride lower pH 1:1 through SID; albumin dilution raises it (Stewart)', () => {
    const a = solvePh(40, N);
    const lac = solvePh(40, { ...N, sid: N.sid - 5 });
    expect(a.be - lac.be).toBeGreaterThan(4);
    expect(a.be - lac.be).toBeLessThan(5.5);
    expect(solvePh(40, { ...N, albGL: 25 }).ph).toBeGreaterThan(a.ph);
  });
  it('BE (Van Slyke) and anion gap', () => {
    expect(baseExcess(7.4, 24.4)).toBeCloseTo(0, 9);
    expect(anionGap(140, 104, 24.4)).toBeCloseTo(11.6, 9);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/acid-base.test.ts`
Expected: FAIL: cannot resolve the module under test.

- [x] **Step 3: Implement**

`packages/engine-core/src/l2/blood/acid-base.ts`:

```ts
// SPDX-License-Identifier: Apache-2.0
// Portions derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), src/cpp/engine/common/system/physiology/
// Saturation.cpp (lines 60–120) and BloodChemistryModel.cpp (line 217), Copyright 2018-2025 Kitware, Inc. and
// Contributors, itself a fork of BioGears 6.1.1, Copyright 2015 Applied Research Associates, Inc.; licensed under the
// Apache License, Version 2.0; modified: re-expressed in TypeScript for one arterial pool; the strong-ion difference is
// computed every step from Na, K, iCa, Mg, Cl, lactate and other anions (Pulse holds it fixed at 40.5); albumin and
// phosphate come from the blood state (Pulse hard-codes 45 g/L); an Hb buffer term is added; pH is found by a
// BOUNDED bisection with no error sink (see NOTICES N-P08). Primary model: Figge, Mydosh & Fencl, J Lab Clin Med
// 1992;120:713; Van Slyke standard base excess.
//
// Electroneutrality (tables §5b.1, annex B1, audit #5/A13), all mEq/L:
//   f(pH) = SID − HCO3(pH, PCO2) − Alb·(0.123·pH − 0.631) − Pi·(0.309·pH − 0.469) − βHb·(pH − 7.4) = 0
//   HCO3  = 0.0307·PCO2·10^(pH − 6.1)          (plasma CO2 solubility 0.0307 mmol/L/mmHg; blood-gas analyser form)
//   βHb   = 1.43·Hb/3                            (the ECF-averaged Hb buffer of the Van Slyke equation, Hb_ECF ≈ Hb/3)
// f is strictly decreasing in pH, so the root is unique; it is bracketed in [6.5, 7.9] (audit A13: survivable
// extremes incl. untreated cardiac arrest) and bisected to 1e-4 pH. A root outside the bracket returns the bound with `atBound` set and the
// residual reported — the residual is never pushed into bicarbonate (audit never-copy list).

export const PH_MIN = 6.5; // audit A13
export const PH_MAX = 7.9;
export const CO2_SOL = 0.0307; // mmol/L/mmHg
export const PH_TOL = 1e-4;
export const PH_MAX_ITER = 40;

export interface Chem {
  sid: number; // mEq/L (dynamic: see solutes.ts `sidOf`)
  albGL: number; // g/L
  piMmolL: number; // mmol/L
  hb: number; // g/dL (buffer term)
}

export interface AcidBase {
  ph: number;
  hco3: number;
  be: number; // standard base excess (Van Slyke), mmol/L
  atot: number; // weak-acid anions (albumin + phosphate + Hb buffer offset), mEq/L
  iter: number;
  atBound: boolean;
  residual: number; // mEq/L at the returned pH (0 unless atBound)
}

export function hco3Of(ph: number, pco2: number): number {
  return CO2_SOL * pco2 * 10 ** (ph - 6.1);
}

function weakAnions(ph: number, c: Chem): number {
  return c.albGL * (0.123 * ph - 0.631) + c.piMmolL * (0.309 * ph - 0.469) + ((1.43 * c.hb) / 3) * (ph - 7.4);
}

/** The charge-balance residual f(pH) (mEq/L); positive means the pH is too low. */
export function chargeResidual(ph: number, pco2: number, c: Chem): number {
  return c.sid - hco3Of(ph, pco2) - weakAnions(ph, c);
}

/** Standard base excess, Van Slyke (tables §5b.1): 0.93·(HCO3 − 24.4 + 14.83·(pH − 7.4)). */
export function baseExcess(ph: number, hco3: number): number {
  return 0.93 * (hco3 - 24.4 + 14.83 * (ph - 7.4));
}

/** Bounded bisection on pH ∈ [6.5, 7.9]; ≤ 40 iterations (converges in 14 to 1e-4). */
export function solvePh(pco2: number, c: Chem): AcidBase {
  const p = Math.max(1, pco2);
  let lo = PH_MIN;
  let hi = PH_MAX;
  const fLo = chargeResidual(lo, p, c);
  const fHi = chargeResidual(hi, p, c);
  let ph: number;
  let iter = 0;
  let atBound = false;
  if (fLo <= 0) {
    ph = lo;
    atBound = true;
  } else if (fHi >= 0) {
    ph = hi;
    atBound = true;
  } else {
    while (hi - lo > PH_TOL && iter < PH_MAX_ITER) {
      const mid = 0.5 * (lo + hi);
      if (chargeResidual(mid, p, c) > 0) lo = mid;
      else hi = mid;
      iter++;
    }
    ph = 0.5 * (lo + hi);
  }
  const hco3 = hco3Of(ph, p);
  return { ph, hco3, be: baseExcess(ph, hco3), atot: weakAnions(ph, c), iter, atBound, residual: atBound ? chargeResidual(ph, p, c) : 0 };
}

/** Anion gap without K (the blood-gas analyser convention): Na − Cl − HCO3. */
export function anionGap(na: number, cl: number, hco3: number): number {
  return na - cl - hco3;
}
```

Never copy Pulse's defects (audit never-copy list): SID is an INPUT recomputed by the caller every step (Task 6 `sidOf`), albumin and phosphate are inputs, the search is bracketed, and a bracket miss is reported (`atBound`, `residual`) — HCO3 is always `hco3Of(ph, pco2)`, never a residual sink.

- [x] **Step 4: Run the test**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/acid-base.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/blood/acid-base.ts packages/engine-core/test/l2/blood/acid-base.test.ts
git commit -m "feat(blood): Figge/Stewart acid–base, dynamic SID, bounded pH 6.5–7.9 (ported, N-P08)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7c-blood
```

### Task 5: Fluid compartments: plasma, interstitium, cells, red-cell mass (ported topology)

**Files:**
- Create: `packages/engine-core/src/l2/blood/fluids.ts`, `packages/engine-core/test/l2/blood/fluids.test.ts`

**Interfaces:**
- Consumes: Task 2 constants, `BloodPatient`, `Composition`.
- Produces: `Flow {rate (mL/min), until (s; 1e9 = until changed), leftMl? (bolus volume still to run), comp | null}`, `FluidState {vp, visf, vicf, hbG, albG, colloidG, ref, flows, kfMult, sigma, anaesthesia, jFilt, refill}`, `landis(tp)`, `rbcMl`, `bloodMl`, `hbOf`, `albGL`, `ecfMl`, `copPlasma`, `createFluids(pat, albumin)`, `starling(f)`, `stepFluids(f, t, dtS, osmRatio, elimMlMin?) → {bledMl, bledPlasmaMl, elimMl, given[]}` (`elimMlMin` = 7d's urine, replacing the fixed elimination).

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l2/blood/fluids.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { bloodMl, copPlasma, createFluids, hbOf, stepFluids, type FluidState } from '../../../src/l2/blood/fluids.ts';
import { bloodPatient, FLUIDS, PRODUCTS } from '../../../src/l2/blood/params.ts';

const ADULT = bloodPatient({ ageY: 40, sex: 'M', weightKg: 70, heightCm: 175 });
function simulate(f: FluidState, fromS: number, toS: number): void {
  for (let t = fromS; t < toS - 1e-9; t += 0.1) stepFluids(f, t, 0.1, 1);
}

describe('fluid compartments (tables §5b.4; annex B1 tissue branch)', () => {
  it('70 kg man: BV 4.8 L, plasma 2.6 L, ISF 11.4 L, ICF 28 L, Hb 15, COP ≈ 22 mmHg (Landis–Pappenheimer at TP 6.4)', () => {
    const f = createFluids(ADULT, 40);
    expect(bloodMl(f)).toBeCloseTo(4807, -1);
    expect(f.vp).toBeCloseTo(2644, -1);
    expect(f.visf).toBeCloseTo(11356, -1);
    expect(f.vicf).toBeCloseTo(28000, -1);
    expect(hbOf(f)).toBeCloseTo(15, 6);
    expect(copPlasma(f)).toBeCloseTo(22.4, 0);
  });
  it('at rest nothing moves for 24 h (no drift)', () => {
    const f = createFluids(ADULT, 40);
    simulate(f, 0, 86_400);
    expect(Math.abs(f.vp - 2644)).toBeLessThan(1);
    expect(Math.abs(f.visf - 11356)).toBeLessThan(1);
  });
  it('1 L crystalloid over 30 min, awake: 50–60 % intravascular at the end, 15–25 % 30 min later (Hahn, Q47)', () => {
    const f = createFluids(ADULT, 40);
    f.flows.push({ rate: 1000 / 30, until: 1800, comp: FLUIDS.rl });
    simulate(f, 0, 1800);
    const end = (f.vp - f.ref.vp) / 1000;
    simulate(f, 1800, 3600);
    const later = (f.vp - f.ref.vp) / 1000;
    expect(end).toBeGreaterThanOrEqual(0.48);
    expect(end).toBeLessThanOrEqual(0.6);
    expect(later).toBeGreaterThanOrEqual(0.13);
    expect(later).toBeLessThanOrEqual(0.25);
  });
  it('general anaesthesia keeps the fluid (elimination ×0.2): more retained 30 min after the end', () => {
    const run = (ga: boolean) => {
      const f = createFluids(ADULT, 40);
      f.anaesthesia = ga;
      f.flows.push({ rate: 1000 / 30, until: 1800, comp: FLUIDS.rl });
      simulate(f, 0, 3600);
      return f.vp + f.visf - f.ref.vp - f.ref.visf;
    };
    expect(run(true)).toBeGreaterThan(run(false) + 150);
  });
  it('haemorrhage removes whole blood (Hb unchanged at first), then refill 0.1–0.5 mL/kg/min dilutes Hb', () => {
    const f = createFluids(ADULT, 40);
    f.flows.push({ rate: 175, until: 600, comp: null });
    simulate(f, 0, 600);
    expect(bloodMl(f)).toBeLessThan(4807 - 1600);
    expect(hbOf(f)).toBeGreaterThan(14.4); // only the refill during the bleed dilutes
    expect(f.refill / 70).toBeGreaterThanOrEqual(0.1);
    expect(f.refill / 70).toBeLessThanOrEqual(0.5);
    simulate(f, 600, 5400);
    expect(hbOf(f)).toBeLessThan(14.0);
  });
  it('one RBC unit raises Hb by 0.7–1.2 g/dL in a 70 kg adult once the extra volume has been excreted (4 h awake; tables row)', () => {
    const f = createFluids(ADULT, 40);
    f.flows.push({ rate: PRODUCTS.rbc.ml / 10, until: 600, comp: PRODUCTS.rbc.comp });
    simulate(f, 0, 14_400);
    expect(hbOf(f) - 15).toBeGreaterThanOrEqual(0.7);
    expect(hbOf(f) - 15).toBeLessThanOrEqual(1.2);
  });
  it('hypotonic fluid swells the cells (glycine absorption)', () => {
    const f = createFluids(ADULT, 40);
    for (let t = 0; t < 1800; t += 0.1) stepFluids(f, t, 0.1, 290 / 275);
    expect(f.vicf).toBeGreaterThan(28000 + 800);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/fluids.test.ts`
Expected: FAIL: cannot resolve the module under test.

- [x] **Step 3: Implement**

`packages/engine-core/src/l2/blood/fluids.ts`:

```ts
// SPDX-License-Identifier: Apache-2.0
// Portions derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), src/cpp/engine/common/controller/
// SetupCircuitsAndCompartments.cpp (tissue branch, lines 2085–2865) and src/cpp/engine/common/system/physiology/
// RenalModel.cpp (Landis–Pappenheimer relation, lines 1634–1640), Copyright 2018-2025 Kitware, Inc. and Contributors,
// itself a fork of BioGears 6.1.1, Copyright 2015 Applied Research Associates, Inc.; licensed under the Apache License,
// Version 2.0; modified: the per-organ vascular → R_t → extracellular → lymph topology is collapsed to ONE whole-body
// plasma ↔ interstitium exchange with the colloid-osmotic source switched ON (Pulse leaves it at 0) and a lymph
// return (Pulse's is 0), re-expressed in TypeScript and fitted to Hahn's crystalloid kinetics (see NOTICES N-P23).
//
// Compartments (tables §5b.4): plasma Vp, interstitium Visf, cells Vicf (mL); red cells as Hb mass (g, MCHC 1/3 g/mL).
// Starling exchange, plasma → interstitium (mL/min):
//   J = Kf·kfMult·[ΔPc − Pisf − σ·((πp − πp0) − (πisf − πisf0))]      ΔPc = PC_PER_ML·(V_blood − V_blood0)
//   πp = Landis–Pappenheimer(TP), TP = 1.6·(albumin + colloid) g/dL   Pisf = ΔVisf/(C·Visf0)   πisf = πisf0·Visf0/Visf
//   lymph (extra) = LYMPH_GAIN·max(−2, Pisf)                          elimination = kEl·max(0, V_blood − V_blood0)
import { ALB_RESTORE_TAU_MIN, CISF_PER_ML, COLLOID_T12_MIN, K_EL_AWAKE, K_EL_GA_FACTOR, KF_ML_MIN_MMHG, LYMPH_GAIN, MCHC_G_PER_ML, OSM_TAU_MIN, PC_PER_ML, PI_ISF0, SIGMA_PROTEIN, type BloodPatient, type Composition } from './params.ts';

export interface Flow {
  rate: number; // mL/min (whole fluid / whole blood)
  until: number; // sim s (1e9 = until changed)
  /** Volume still to run (bolus orders): delivery stops at exactly the ordered volume whatever the grid phase. */
  leftMl?: number;
  comp: Composition | null; // null = haemorrhage (whole blood out)
}

export interface FluidState {
  vp: number;
  visf: number;
  vicf: number;
  hbG: number; // haemoglobin mass
  albG: number; // plasma albumin mass
  colloidG: number; // synthetic colloid (albumin-equivalent) mass
  ref: { vp: number; visf: number; vicf: number; bv: number; pi0: number; albGL: number };
  flows: Flow[];
  kfMult: number; // capillary leak multiplier (sepsis/anaphylaxis/burns: 7f sets it) — 1 normal
  sigma: number; // protein reflection coefficient (leak lowers it)
  anaesthesia: boolean; // elimination ×0.2 under GA (tables `t12El`)
  // outputs of the last step (mL/min) for tests and the lung-water hook
  jFilt: number;
  refill: number;
}

/** Landis–Pappenheimer colloid osmotic pressure (mmHg) of total protein TP (g/dL): 2.1·TP + 0.16·TP² + 0.009·TP³. */
export function landis(tpGdl: number): number {
  return 2.1 * tpGdl + 0.16 * tpGdl ** 2 + 0.009 * tpGdl ** 3;
}

export const rbcMl = (f: FluidState): number => f.hbG / MCHC_G_PER_ML;
export const bloodMl = (f: FluidState): number => f.vp + rbcMl(f);
export const hbOf = (f: FluidState): number => (100 * f.hbG) / bloodMl(f); // g/dL
export const albGL = (f: FluidState): number => (1000 * f.albG) / f.vp;
export const ecfMl = (f: FluidState): number => f.vp + f.visf;
/** Plasma colloid osmotic pressure (mmHg): TP (g/dL) = 1.6·(albumin + colloid) (annex B1: total protein = 1.6·albumin). */
export function copPlasma(f: FluidState): number {
  return landis((1.6 * 100 * (f.albG + f.colloidG)) / f.vp);
}

export function createFluids(p: BloodPatient, albumin: number): FluidState {
  const albG = (albumin * p.plasmaMl) / 1000;
  const f: FluidState = {
    vp: p.plasmaMl, visf: p.isfMl, vicf: p.icfMl, hbG: (p.hb * p.bvMl) / 100, albG, colloidG: 0,
    ref: { vp: p.plasmaMl, visf: p.isfMl, vicf: p.icfMl, bv: p.bvMl, pi0: 0, albGL: albumin },
    flows: [], kfMult: 1, sigma: SIGMA_PROTEIN, anaesthesia: false, jFilt: 0, refill: 0,
  };
  f.ref.pi0 = copPlasma(f);
  return f;
}

/** Plasma ↔ interstitium exchange J (mL/min, positive = filtration out of plasma) and extra lymph (mL/min). */
export function starling(f: FluidState): { j: number; lymph: number; pisf: number } {
  const dPc = PC_PER_ML * (bloodMl(f) - f.ref.bv);
  const pisf = (f.visf - f.ref.visf) / (CISF_PER_ML * f.ref.visf);
  const dPiP = copPlasma(f) - f.ref.pi0;
  const dPiI = PI_ISF0 * (f.ref.visf / f.visf - 1);
  const j = KF_ML_MIN_MMHG * f.kfMult * (dPc - pisf - f.sigma * (dPiP - dPiI));
  return { j, lymph: LYMPH_GAIN * Math.max(-2, pisf), pisf };
}

/**
 * One step of dtS seconds (Euler; stable for dt ≤ 1 s: the fastest mode has τ ≈ 3 min). `osmRatio` drives the
 * ISF ↔ cell water shift. `elimMlMin` (7d's urine output, request R-7D-2) replaces the volume-receptor elimination
 * when given. Returns the volumes of whole blood lost and fluid given this step (mL) with their compositions, so
 * solutes.ts can move the matching amounts.
 */
export function stepFluids(f: FluidState, t: number, dtS: number, osmRatio: number, elimMlMin?: number): { bledMl: number; bledPlasmaMl: number; elimMl: number; given: { ml: number; comp: Composition }[] } {
  const dtM = dtS / 60;
  let bled = 0;
  let bledPlasma = 0;
  const given: { ml: number; comp: Composition }[] = [];
  for (const fl of f.flows) {
    if (fl.until <= t - 1e-9) continue;
    const ml = fl.leftMl === undefined ? fl.rate * dtM : Math.min(fl.rate * dtM, fl.leftMl);
    if (fl.comp === null) {
      const hct = rbcMl(f) / bloodMl(f);
      const out = Math.min(ml, 0.5 * bloodMl(f));
      if (fl.leftMl !== undefined) fl.leftMl -= out;
      bled += out;
      bledPlasma += out * (1 - hct);
      f.hbG -= (out * hct) * MCHC_G_PER_ML;
      f.albG -= (f.albG / f.vp) * out * (1 - hct);
      f.colloidG -= (f.colloidG / f.vp) * out * (1 - hct);
      f.vp -= out * (1 - hct);
    } else {
      const c = fl.comp;
      if (fl.leftMl !== undefined) fl.leftMl -= ml;
      f.vp += ml * (1 - c.hct);
      f.hbG += ml * c.hct * MCHC_G_PER_ML;
      f.albG += (c.albGL * ml * (1 - c.hct)) / 1000;
      f.colloidG += (c.colloidGL * ml) / 1000;
      given.push({ ml, comp: c });
    }
  }
  f.flows = f.flows.filter((fl) => fl.until > t && (fl.leftMl === undefined || fl.leftMl > 1e-9));
  const s = starling(f);
  const kEl = K_EL_AWAKE * (f.anaesthesia ? K_EL_GA_FACTOR : 1);
  const elim = elimMlMin ?? kEl * Math.max(0, bloodMl(f) - f.ref.bv); // volume receptors sense BLOOD volume (so a transfused unit's plasma is shed)
  f.jFilt = s.j;
  f.refill = Math.max(0, -s.j + s.lymph);
  f.vp += (-s.j + s.lymph - elim) * dtM;
  f.visf += (s.j - s.lymph) * dtM;
  // osmotic water shift ISF ↔ cells: cells swell when ECF osmolality falls (osmRatio = osmIcf/osmEcf > 1)
  const vicfEq = f.ref.vicf * osmRatio;
  const w = ((vicfEq - f.vicf) * dtM) / OSM_TAU_MIN;
  f.vicf += w;
  f.visf -= w;
  f.colloidG *= Math.exp((-Math.LN2 * dtM) / COLLOID_T12_MIN);
  const albDef = (f.ref.albGL * f.vp) / 1000 - f.albG; // g below the baseline concentration
  if (albDef > 0) f.albG += (albDef * dtM) / ALB_RESTORE_TAU_MIN;
  return { bledMl: bled, bledPlasmaMl: bledPlasma, elimMl: elim * dtM, given };
}
```

Constants were fitted by a 108-point sweep (plan decision 5). If a band test misses by a little after a merge, re-check `KF_ML_MIN_MMHG`, `CISF_PER_ML`, `K_EL_AWAKE` against the sweep's winner (2.0 / 0.02 / 0.03) before touching anything else.

- [x] **Step 4: Run the test**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/fluids.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/blood/fluids.ts packages/engine-core/test/l2/blood/fluids.test.ts
git commit -m "feat(blood): plasma/interstitium/cell compartments with Starling exchange (ported topology, N-P23)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7c-blood
```

### Task 6: Solutes: extracellular amounts, cellular K pool, transcellular shifts

**Files:**
- Create: `packages/engine-core/src/l2/blood/solutes.ts`, `packages/engine-core/test/l2/blood/solutes.test.ts`

**Interfaces:**
- Consumes: `NORMAL`, `MG_ION_FRAC`, `OSM0`, `Composition`.
- Produces: `SoluteState` (amounts: na, k, cl, ca, mg, xa, keto, metab, citrate, osmOther, lac, kIcf, pi; `set {k, ca, mg, ph}`), `Conc`, `concOf(s, ecfMl, vLacL, ecf0Ml)`, `sidOf(conc, iCa)`, `osmEcf`, `createSolutes`, `addFluid`, `removePlasma`, `calibrateXa`, `stepSolutes(s, ecfMl, dtS, kSet, clearF, kUptake = 1)` (`clearF` = hepatic flow × function; `kUptake` divides the K τ), `ionisedCa(conc, ph)`, `osmRatio`, the τ constants (`K_TAU_MIN` 43, `CA_TAU_MIN` 15, `MG_TAU_MIN` 60, `CITRATE_TAU_MIN` 5, `METAB_TAU_MIN` 15, `OSM_OTHER_T12_MIN` 85) and `K_CIT` 0.09.

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l2/blood/solutes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { FLUIDS, MOLAR_MASS, mgdlToMmol } from '../../../src/l2/blood/params.ts';
import { addFluid, concOf, createSolutes, ionisedCa, sidOf, stepSolutes } from '../../../src/l2/blood/solutes.ts';

const ECF = 14000;
const make = () => createSolutes({ na: 140, k: 4.2, cl: 104, iCa: 1.2, mg: 0.85, lactate: 1 }, ECF, 42, 28000);

describe('solutes (tables §5b.1–5b.2; annex B1)', () => {
  it('K molar mass is 39.098 g/mol: 15.6 mg/dL of K is 4.0 mmol/L, not Pulse’s 5.0 (annex D14)', () => {
    expect(MOLAR_MASS.k).toBe(39.098);
    expect(mgdlToMmol(15.6, MOLAR_MASS.k)).toBeCloseTo(3.99, 2);
  });
  it('the SID is dynamic: lactate, chloride and sodium all move it', () => {
    const s = make();
    const c = concOf(s, ECF, 42, ECF);
    const sid0 = sidOf(c, 1.2);
    s.lac += 5 * 42;
    expect(sidOf(concOf(s, ECF, 42, ECF), 1.2)).toBeCloseTo(sid0 - 5, 6);
    s.cl += 3 * 14;
    expect(sidOf(concOf(s, ECF, 42, ECF), 1.2)).toBeCloseTo(sid0 - 8, 6);
  });
  it('2 L 0.9 % saline into 14 L ECF: Cl +6.3, Na +1.8, SID (Na − Cl) −4.5', () => {
    const s = make();
    addFluid(s, 2000, FLUIDS.saline);
    const c = concOf(s, ECF + 2000, 42, ECF);
    expect(c.cl - 104).toBeCloseTo(6.25, 1);
    expect(c.na - 140).toBeCloseTo(1.75, 1);
  });
  it('a K load moves 50 % into cells in ≈ 30 min (tables `vK`); cellular K rises by the same amount', () => {
    const s = make();
    s.k += 1 * 14; // +1 mmol/L
    const icf0 = s.kIcf;
    for (let t = 0; t < 1800; t += 0.1) stepSolutes(s, ECF, 0.1, 4.2, 1);
    expect(s.k / 14 - 4.2).toBeGreaterThan(0.45);
    expect(s.k / 14 - 4.2).toBeLessThan(0.55);
    expect(s.kIcf - icf0).toBeCloseTo(14 - (s.k - 4.2 * 14), 6);
  });
  it('ionised Ca: −0.05 per +0.1 pH; citrate chelates (1 unit / 5 min steady state → −0.1, Q46)', () => {
    const s = make();
    const c = concOf(s, ECF, 42, ECF);
    expect(ionisedCa(c, 7.5)).toBeCloseTo(1.2 - 0.05, 2);
    s.citrate = 15.6 * 14 / 14; // ≈ 1.11 mmol/L at the 1 unit / 5 min steady state (15.6 mmol × 5 min τ / 5 min)
    expect(ionisedCa(concOf(s, ECF, 42, ECF), 7.4)).toBeCloseTo(1.1, 1);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/solutes.test.ts`
Expected: FAIL: cannot resolve the module under test.

- [x] **Step 3: Implement**

`packages/engine-core/src/l2/blood/solutes.ts`:

```ts
// Extracellular solutes as AMOUNTS (mmol) so that dilution, infusion and bleeding are mass-conserving; concentrations
// are amount / ECF volume (tables §5b.1–5b.2; annex B1 "Electrolytes: take the initial values … ours: K transcellular
// shift, pH–K, citrate/iCa, Mg"). The strong-ion difference is recomputed from these every step (audit #5: DYNAMIC
// SID), so lactate, saline chloride, ketoacids and sodium bicarbonate all move the pH by construction.
import { MG_ION_FRAC, NORMAL, OSM0, type Composition } from './params.ts';

export interface SoluteState {
  na: number; k: number; cl: number;
  ca: number; // ionised-calcium-equivalent amount (mmol)
  mg: number; // total Mg amount
  xa: number; // unmeasured strong anions (sulphate, urate, …), calibrated so the start is pH 7.40 / HCO3 24.4
  keto: number; // ketoacid anions (DKA input)
  metab: number; // acetate/gluconate awaiting metabolism
  citrate: number; // free citrate (transfusion)
  osmOther: number; // glycine and other non-Na effective osmoles
  lac: number; // lactate amount in its distribution volume
  kIcf: number; // cellular K pool (mmol)
  pi: number; // phosphate amount (mmol; dilutes with the ECF) [ENG]
  set: { k: number; ca: number; mg: number; ph: number }; // homeostatic set points (mmol/L; pH of the K reference)
}

export interface Conc {
  na: number; k: number; cl: number; iCaRaw: number; mg: number; xa: number; keto: number; metab: number;
  citrate: number; osmOther: number; lactate: number; pi: number;
}

export function concOf(s: SoluteState, ecfMl: number, vLacL: number, ecf0Ml: number): Conc {
  const v = ecfMl / 1000;
  return {
    na: s.na / v, k: s.k / v, cl: s.cl / v, iCaRaw: s.ca / v, mg: s.mg / v, xa: s.xa / v, keto: s.keto / v,
    metab: s.metab / v, citrate: s.citrate / v, osmOther: s.osmOther / v, pi: s.pi / v,
    lactate: s.lac / (vLacL + (ecfMl - ecf0Ml) / 1000),
  };
}

/** Apparent SID (mEq/L): Na + K + 2·iCa + 2·Mg_ion − Cl − lactate − keto − metab − XA (tables §5b.1 "Stewart-lite"). */
export function sidOf(c: Conc, iCa: number): number {
  return c.na + c.k + 2 * iCa + 2 * MG_ION_FRAC * c.mg - c.cl - c.lactate - c.keto - c.metab - c.xa;
}

/** Effective ECF osmolality (mOsm/kg): 2·Na + 10 (glucose + urea at normal) + other osmoles. */
export function osmEcf(c: Conc): number {
  return 2 * c.na + 10 + c.osmOther;
}

export function createSolutes(p: { na: number; k: number; cl: number; iCa: number; mg: number; lactate: number }, ecfMl: number, vLacL: number, icfMl: number): SoluteState {
  const v = ecfMl / 1000;
  return {
    na: p.na * v, k: p.k * v, cl: p.cl * v, ca: p.iCa * v, mg: p.mg * v, xa: 0, keto: 0, metab: 0, citrate: 0, osmOther: 0,
    lac: p.lactate * vLacL, kIcf: 140 * (icfMl / 1000), pi: NORMAL.piMmolL * v, set: { k: p.k, ca: p.iCa, mg: p.mg, ph: 7.4 },
  };
}

/** Add `ml` of a fluid/product (its non-cell part carries the solutes; Ca in products is already chelated). */
export function addFluid(s: SoluteState, ml: number, c: Composition): void {
  const l = (ml * (1 - c.hct)) / 1000;
  s.na += c.na * l;
  s.k += c.k * l;
  s.cl += c.cl * l;
  s.ca += 0.5 * c.ca * l; // half of a crystalloid's Ca is ionised once albumin binds it [ENG]
  s.mg += c.mg * l;
  s.lac += c.lactate * l;
  s.metab += c.metab * l;
  s.xa += c.xa * l;
  s.citrate += c.citrate * l;
  s.osmOther += c.osmOther * l;
}

/** Remove the solutes carried by `plasmaMl` of plasma (haemorrhage), at the current ECF concentrations. */
export function removePlasma(s: SoluteState, plasmaMl: number, ecfMl: number, c: Conc): void {
  const f = plasmaMl / ecfMl;
  for (const k of ['na', 'k', 'cl', 'ca', 'mg', 'xa', 'keto', 'metab', 'citrate', 'osmOther', 'pi'] as const) s[k] -= s[k] * f;
  s.lac -= c.lactate * (plasmaMl / 1000);
}

/** Starting XA (mmol) so that the start state has the target SID. */
export function calibrateXa(s: SoluteState, ecfMl: number, sidNow: number, sidTarget: number): void {
  s.xa += (sidNow - sidTarget) * (ecfMl / 1000);
}

/** Homeostasis and first-order kinetics (per step): transcellular K, Ca and Mg buffering, citrate and metabolisable anions. */
export const K_TAU_MIN = 43; // 50 % of a K load into cells in 30 min (tables `vK`) [ENG]
export const CA_TAU_MIN = 15; // ionised Ca returns to its set point (bone/protein buffer, PTH) [ENG, Q46]
export const MG_TAU_MIN = 60; // Mg load distributes into cells/bone [ENG]
export const CITRATE_TAU_MIN = 5; // hepatic citrate clearance at normal hepatic flow (tables `citrateUnit`) [TXT]
export const METAB_TAU_MIN = 15; // acetate/gluconate metabolism to bicarbonate [ENG]
export const OSM_OTHER_T12_MIN = 85; // glycine metabolism [TXT]

/**
 * `clearF` = hepatic flow × function (citrate, acetate); `kUptake` = the Na/K-ATPase rate multiplier (1 at rest;
 * insulin/β2 stimulation raises it, core.ts) that divides the transcellular K time constant.
 */
export function stepSolutes(s: SoluteState, ecfMl: number, dtS: number, kSet: number, clearF: number, kUptake = 1): void {
  const dtM = dtS / 60;
  const v = ecfMl / 1000;
  const jk = ((s.k / v - kSet) * v * dtM * kUptake) / K_TAU_MIN; // mmol into cells
  s.k -= jk;
  s.kIcf += jk;
  s.ca -= ((s.ca / v - s.set.ca) * v * dtM) / CA_TAU_MIN;
  s.mg -= ((s.mg / v - s.set.mg) * v * dtM) / MG_TAU_MIN;
  const liver = Math.max(0.05, clearF);
  s.citrate *= Math.exp((-dtM * liver) / CITRATE_TAU_MIN);
  s.metab *= Math.exp((-dtM * liver) / METAB_TAU_MIN);
  s.osmOther *= Math.exp((-Math.LN2 * dtM) / OSM_OTHER_T12_MIN);
}

/**
 * Ionised calcium (mmol/L): the buffered ionised amount, shifted by pH (−0.05 per +0.1 pH) [TXT] and chelated by free
 * citrate (0.09 mmol/L per mmol/L citrate: 1 RBC unit per 5 min at steady state → −0.1, tables `citrateUnit`) [ENG, Q46].
 */
export const K_CIT = 0.09;
export function ionisedCa(c: Conc, ph: number): number {
  return Math.max(0.3, c.iCaRaw * (1 - 0.42 * (ph - 7.4)) - K_CIT * c.citrate);
}

/** ICF osmolality / ECF osmolality ratio (cells swell when > 1). */
export function osmRatio(c: Conc): number {
  return osmEcf(c) / OSM0;
}
```



- [x] **Step 4: Run the test**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/solutes.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/blood/solutes.ts packages/engine-core/test/l2/blood/solutes.test.ts
git commit -m "feat(blood): solute amounts, cellular K pool and transcellular shifts" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7c-blood
```

### Task 7: Treatments: succinylcholine, insulin–dextrose, salbutamol, calcium, bicarbonate, magnesium

**Files:**
- Create: `packages/engine-core/src/l2/blood/treatments.ts`, `packages/engine-core/test/l2/blood/treatments.test.ts`

**Interfaces:**
- Produces: `BloodDrugId` (same union as Task 1's, re-declared locally), `BLOOD_DRUGS`, `Dose {id, t0, amount}`, `bateman(tMin, ka, ke)`, `suxDeltaK(tMin, burns)`, `insulinEffect`, `salbutamolEffect`, `INSULIN_K_SHIFT` −1.0, `SALBUTAMOL_K_SHIFT` −1.0, `K_PUMP_GAIN` 1.5, `caMembrane`, `CA_MMOL_PER_G`, `BICARB_CO2_FRAC` 0.25, `MMOL_CO2_ML`, `bicarbCo2MlMin(doses, t)`.

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l2/blood/treatments.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { bateman, bicarbCo2MlMin, caMembrane, insulinEffect, salbutamolEffect, suxDeltaK } from '../../../src/l2/blood/treatments.ts';

describe('7c treatment curves (tables §5b.2)', () => {
  it('Bateman curves peak at 1', () => {
    let m = 0;
    for (let t = 0; t < 600; t += 0.5) m = Math.max(m, bateman(t, 1 / 15, 1 / 180));
    expect(m).toBeCloseTo(1, 3);
  });
  it('succinylcholine: +0.5 at 4 min and < 0.15 by 15 min normally; burns severity 1: +6.5 and still > +3 at 20 min', () => {
    expect(suxDeltaK(4, 0)).toBeCloseTo(0.5, 6);
    expect(suxDeltaK(15, 0)).toBeLessThan(0.15);
    expect(suxDeltaK(4, 1)).toBeCloseTo(6.5, 6);
    expect(suxDeltaK(20, 1)).toBeGreaterThan(3);
  });
  it('insulin effect starts within 10–20 min and lasts 4–6 h; salbutamol peaks near 30 min; calcium works in 1–3 min for 30–60 min', () => {
    expect(insulinEffect(15)).toBeGreaterThan(0.3);
    expect(insulinEffect(240)).toBeGreaterThan(0.3); // still a third of the peak at 4 h
    expect(salbutamolEffect(30)).toBeGreaterThan(0.85);
    expect(caMembrane(3)).toBeGreaterThan(0.85);
    expect(caMembrane(60)).toBeLessThan(0.3);
  });
  it('bicarbonate CO2: 25 % of the dose × 22.4 mL, delivered over minutes', () => {
    const d = [{ id: 'sodiumBicarbonate' as const, t0: 0, amount: 50 }];
    let total = 0;
    for (let t = 0; t < 1800; t += 1) total += bicarbCo2MlMin(d, t) / 60;
    expect(total).toBeCloseTo(0.25 * 50 * 22.4, -1);
    expect(bicarbCo2MlMin(d, 60)).toBeGreaterThan(bicarbCo2MlMin(d, 600));
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/treatments.test.ts`
Expected: FAIL: cannot resolve the module under test.

- [x] **Step 3: Implement**

`packages/engine-core/src/l2/blood/treatments.ts`:

```ts
// Drug and product kinetics owned by 7c (tables §5b.2 rows: succinylcholine, insulin–dextrose, salbutamol, calcium,
// citrate; §5b.1 bicarbonate; Mg). Each dose is plain data {id, t0, amount}; effects are closed-form curves of time
// since the dose, so snapshots and the look-ahead clone need nothing else. With Stage 7g in the engine the doses come
// from 7g's `bus.doses` (pipeline.ts `observeDoses`, R51 §3) and the β2/insulin K shift from `bus.metabolic.kShift`;
// 7g declined to replace these shapes (its decision 10: they are mass-balance kinetics).
export type BloodDrugId = 'succinylcholine' | 'insulinDextrose' | 'salbutamol' | 'calciumChloride' | 'calciumGluconate' | 'sodiumBicarbonate' | 'magnesium';
export const BLOOD_DRUGS: readonly BloodDrugId[] = ['succinylcholine', 'insulinDextrose', 'salbutamol', 'calciumChloride', 'calciumGluconate', 'sodiumBicarbonate', 'magnesium'];

export interface Dose {
  id: BloodDrugId;
  t0: number;
  amount: number; // mmol for Ca/HCO3/Mg; units of insulin; mg for sux/salbutamol (only presence matters)
}

/** Bateman curve normalised to a peak of 1 (ka, ke in 1/min). */
export function bateman(tMin: number, ka: number, ke: number): number {
  if (tMin <= 0) return 0;
  const tp = Math.log(ka / ke) / (ka - ke);
  const peak = Math.exp(-ke * tp) - Math.exp(-ka * tp);
  return (Math.exp(-ke * tMin) - Math.exp(-ka * tMin)) / peak;
}

/**
 * Succinylcholine K release (tables: +0.5 normally; burns/denervation/immobilisation > 72 h +5–7) as an additive
 * plasma K pulse: linear rise to the peak at 4 min, then exponential decay τ 5 min (normal: back within ~15 min) or
 * 5·(1 + 5·burns) min [ENG]. Insulin and β2 agonists act on the K set point only (no unsourced second effect on the
 * pulse's decay; R50 review F13).
 */
export function suxDeltaK(tMin: number, burns: number): number {
  if (tMin <= 0) return 0;
  const peak = 0.5 + 6 * burns;
  const tp = 4;
  if (tMin <= tp) return (peak * tMin) / tp;
  return peak * Math.exp(-(tMin - tp) / (5 * (1 + 5 * burns)));
}

/** Insulin–dextrose effect 0–1: onset 10–20 min, peak ≈ 45–60 min, lasts 4–6 h (tables) [TXT shape, ENG rates]. */
export const insulinEffect = (tMin: number): number => bateman(tMin, 1 / 15, 1 / 180);
/** Nebulised salbutamol effect 0–1: peak ≈ 30 min, ≈ 2 h (tables). */
export const salbutamolEffect = (tMin: number): number => bateman(tMin, 1 / 10, 1 / 60);
/**
 * K set-point shifts at full effect (mmol/L) [ENG]: with the pump term below, insulin–dextrose gives K −0.54 at 30 min
 * and −0.87 at 60 min (tables −0.6 to −1.0 over 30–60 min); 7c's own salbutamol (fallback without 7g) −0.7 at 30 min
 * (tables −0.5 to −1.0).
 */
export const INSULIN_K_SHIFT = -1.0;
export const SALBUTAMOL_K_SHIFT = -1.0;
/**
 * Insulin and β2 agonists drive K into cells through Na/K-ATPase: the uptake rate rises by K_PUMP_GAIN per mmol/L of
 * drug-driven set-point shift, so the tables' drug time courses (−0.5 to −1.0 within 30 min) hold, which the passive
 * redistribution τ of a K load (43 min, `vK`) alone cannot reach [ENG, fitted; R50 F13]. 7g's salbutamol kShift −0.8
 * → K −0.55 at 30 min.
 */
export const K_PUMP_GAIN = 1.5;
/** Calcium membrane stabilisation 0–1: ECG effect in 1–3 min, lasting 30–60 min (tables) [TXT shape]. */
export const caMembrane = (tMin: number): number => (tMin <= 0 ? 0 : (1 - Math.exp(-tMin / 1)) * Math.exp(-tMin / 45));
/** Calcium salts: mmol Ca per gram (CaCl2·2H2O 147 g/mol → 6.8; Ca gluconate 430 g/mol → 2.3) [TXT]. */
export const CA_MMOL_PER_G = { calciumChloride: 6.8, calciumGluconate: 2.3 } as const;
/**
 * Sodium bicarbonate: Na enters the ECF at once (SID ↑); a fraction of the dose appears as extra CO2 to exhale,
 * delivered as a Bateman pulse (peak ≈ 1 min) into Stage 3's CO2 production [ENG, tuned: 50 mmol under constant
 * ventilation → EtCO2 +5–8 mmHg peak within 1–3 min, back within ~10 min].
 */
export const BICARB_CO2_FRAC = 0.25;
export const MMOL_CO2_ML = 22.4;
export function bicarbCo2MlMin(doses: readonly Dose[], t: number): number {
  let r = 0;
  for (const d of doses) {
    if (d.id !== 'sodiumBicarbonate') continue;
    const tm = (t - d.t0) / 60;
    if (tm <= 0 || tm > 30) continue;
    // Bateman with ka 1/0.5, ke 1/2 min, integral normalised to 1 → mL/min
    const ka = 2;
    const ke = 0.5;
    const shape = ((ka * ke) / (ka - ke)) * (Math.exp(-ke * tm) - Math.exp(-ka * tm));
    r += BICARB_CO2_FRAC * d.amount * MMOL_CO2_ML * shape;
  }
  return r;
}
```



- [x] **Step 4: Run the test**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/treatments.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/blood/treatments.ts packages/engine-core/test/l2/blood/treatments.test.ts
git commit -m "feat(blood): succinylcholine pulse, insulin/β2 K shifts with the pump term, calcium, bicarbonate" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7c-blood
```

### Task 8: Oxygen delivery, VO2 supply dependence and lactate

**Files:**
- Create: `packages/engine-core/src/l2/blood/oxygen.ts`, `packages/engine-core/test/l2/blood/oxygen.test.ts`

**Interfaces:**
- Consumes: `DO2_CRIT_ML_KG_MIN`, `K_ANAER`, `K_LAC_PER_H`, `NORMAL`, `REGIONAL_*`.
- Produces: `O2Out {cao2, do2, vo2, demand, deficit, er, svo2}`, `o2Delivery(coLpm, co0Lpm, cao2, demand, weightKg, demandRel = 1)` (regional q = CO/CO0 ÷ demandRel), `stepLactate(lacMmol, vLacL, deficit, hbfRel, liver, dtS)`.

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l2/blood/oxygen.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { o2Delivery, stepLactate } from '../../../src/l2/blood/oxygen.ts';

describe('oxygen delivery and lactate (tables §5b.3, §5.3)', () => {
  it('normal DO2 ≈ 1000 mL/min: no deficit, ER ≈ 0.25', () => {
    const d = o2Delivery(5.25, 5.25, 197, 245, 70);
    expect(d.do2).toBeCloseTo(1034, -1);
    expect(d.deficit).toBe(0);
    expect(d.er).toBeCloseTo(0.24, 1);
  });
  it('regional dependence as CO falls below 88 %; global below DO2crit 6 mL/kg/min; anaemia at normal flow only via DO2crit', () => {
    expect(o2Delivery(3.2, 5.25, 195, 245, 70).deficit).toBeGreaterThan(60); // class III flow
    expect(o2Delivery(0, 5.25, 195, 245, 70).deficit).toBe(245);
    expect(o2Delivery(5.25, 5.25, 92, 245, 70).deficit).toBe(0); // Hb 7 at normal CO: DO2 6.9 mL/kg/min
    expect(o2Delivery(5.25, 5.25, 60, 245, 70).deficit).toBeGreaterThan(20); // Hb ≈ 4.5: below DO2crit
  });
  it('lactate is steady at 1.0 with normal flow; t½ ≈ 30 min after a load (Q41)', () => {
    let m = 42;
    for (let t = 0; t < 3600; t += 0.1) m = stepLactate(m, 42, 0, 1, 1, 0.1);
    expect(m / 42).toBeCloseTo(1, 3);
    m = 5 * 42;
    for (let t = 0; t < 1800; t += 0.1) m = stepLactate(m, 42, 0, 1, 1, 0.1);
    expect(m / 42).toBeGreaterThan(2.8);
    expect(m / 42).toBeLessThan(3.2); // 1 + 4·e^(−ln2) = 3
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/oxygen.test.ts`
Expected: FAIL: cannot resolve the module under test.

- [x] **Step 3: Implement**

`packages/engine-core/src/l2/blood/oxygen.ts`:

```ts
// Oxygen delivery and lactate (tables §5b.3 caO2/do2/svo2 rows; §5.3 lactate, critical DO2, erMax, kAnaer rows).
//   CaO2 = 13.4·Hb·SaO2·(1 − COHb − MetHb) + 0.03·PaO2   (mL/L)       DO2 = CO·CaO2 (mL/min)
//   VO2 = demand − deficit;  deficit = max(global, regional)
//     global   = demand·(1 − DO2/DO2crit)                        below DO2crit (6 mL/kg/min) [TXT, Q42]
//     regional = demand·REGIONAL_FRAC·clamp((0.88 − q)/(0.88 − 0.40)),  q = (CO/CO0)/(demand/demand0)   [ENG, Q41/Q42]
//       (flow relative to what the current metabolism needs: under GA flow and VO2 fall together without redistribution)
//   lactate: V·dL/dt = P0 + kAnaer·deficit − kLac·hbfRel·L·V                  (P0 = kLac·L0·V: steady at 1.0)
import { DO2_CRIT_ML_KG_MIN, K_ANAER, K_LAC_PER_H, NORMAL, REGIONAL_FLOW_FULL, REGIONAL_FLOW_ON, REGIONAL_FRAC } from './params.ts';

export interface O2Out {
  cao2: number; // mL/L
  do2: number; // mL/min
  vo2: number; // mL/min (actual)
  demand: number;
  deficit: number;
  er: number; // extraction ratio VO2/DO2
  svo2: number; // 0–1 (mixed venous, from content)
}

export function o2Delivery(coLpm: number, co0Lpm: number, cao2: number, demand: number, weightKg: number, demandRel = 1): Omit<O2Out, 'svo2' | 'cao2'> {
  const do2 = coLpm * cao2;
  const crit = DO2_CRIT_ML_KG_MIN * weightKg;
  const global = do2 < crit ? demand * (1 - do2 / crit) : 0;
  const q = coLpm / Math.max(0.1, co0Lpm) / Math.max(0.3, demandRel);
  const regional = demand * REGIONAL_FRAC * Math.min(1, Math.max(0, (REGIONAL_FLOW_ON - q) / (REGIONAL_FLOW_ON - REGIONAL_FLOW_FULL)));
  const deficit = Math.min(demand, Math.max(global, regional));
  const vo2 = demand - deficit;
  return { do2, vo2, demand, deficit, er: do2 > 0 ? vo2 / do2 : 1 };
}

/** Lactate amount step (mmol in vLac); `liver` is the 7d hook (1 = normal), `hbfRel` hepatic flow / baseline. */
export function stepLactate(lacMmol: number, vLacL: number, deficit: number, hbfRel: number, liver: number, dtS: number): number {
  const k = (K_LAC_PER_H / 60) * Math.max(0, hbfRel) * liver; // 1/min
  const p0 = (K_LAC_PER_H / 60) * NORMAL.lactate * vLacL; // mmol/min
  const conc = lacMmol / vLacL;
  const dm = (p0 + K_ANAER * deficit - k * conc * vLacL) * (dtS / 60);
  return Math.max(0, lacMmol + dm);
}
```



- [x] **Step 4: Run the test**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/oxygen.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/blood/oxygen.ts packages/engine-core/test/l2/blood/oxygen.test.ts
git commit -m "feat(blood): O2 delivery, demand-normalised regional supply dependence and lactate" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7c-blood
```

### Task 9: Core step: fluids → solutes → O2/lactate → pH, with unit-level sanity scenarios

**Files:**
- Create: `packages/engine-core/src/l2/blood/core.ts`, `packages/engine-core/test/l2/blood/core.test.ts`

**Interfaces:**
- Consumes: Tasks 2–8.
- Produces: `BloodInputs {t, coLpm, paco2, pao2, tempC, vo2Demand, demandRel?, kShiftExt?}` (`kShiftExt` = 7g's `bus.metabolic.kShift`: when given, the only β2/insulin-row K shift), `RenalSeam {uopMlH, excretion {k, na, cl, gluconate}}` (mL/h, mmol/h), `BloodOut {na, k, kEcg, cl, iCa, mg, lactate, hb, albGL, albuminGL, ag, osm, cop, hbfRel, bvRel}`, `BloodCore {pat, fl, so, ab, phNonOrg, o2, odc, doses, burns, liver, renal: RenalSeam | null, co0, ecf0, k1Hz, out: BloodOut}`, `createBloodCore(profile, co0Lpm, paco2)`, `stepBloodCore(bc, inputs, dtS)`.

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l2/blood/core.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createBloodCore, stepBloodCore, type BloodCore, type BloodInputs } from '../../../src/l2/blood/core.ts';
import { bloodMl } from '../../../src/l2/blood/fluids.ts';
import { FLUIDS, PRODUCTS, storedK } from '../../../src/l2/blood/params.ts';

const MAN = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175 };
const CO0 = 5.25;
/** Stage 7a-absent fallback used by these unit runs: CO falls with blood volume (pipeline.ts volumeCoFactor). */
const co = (bc: BloodCore) => {
  const loss = 1 - bloodMl(bc.fl) / bc.fl.ref.bv;
  return CO0 * Math.max(0.2, Math.min(1.15, 1 - 1.6 * Math.max(0, loss - 0.1) + 0.6 * Math.max(0, -loss)));
};
function run(bc: BloodCore, from: number, to: number, x: Partial<BloodInputs> = {}, ga = false): void {
  bc.fl.anaesthesia = ga;
  for (let k = Math.round(from * 10); k < Math.round(to * 10); k++) {
    const t = k / 10;
    stepBloodCore(bc, { t, coLpm: x.coLpm ?? co(bc), paco2: x.paco2 ?? 40, pao2: x.pao2 ?? 95, tempC: 37, vo2Demand: x.vo2Demand ?? (ga ? 208 : 245) }, 0.1);
  }
}

describe('blood core step (tables §5b, §7)', { timeout: 300_000 }, () => {
  it('baseline: pH 7.40, HCO3 24.4, BE 0, lactate 1.0, AG 11.6, K 4.20 — and no drift over 24 h', async () => {
    const bc = createBloodCore(MAN, CO0, 40);
    for (let h = 0; h < 24; h++) {
      run(bc, h * 3600, (h + 1) * 3600);
      await new Promise((r) => setImmediate(r));
    }
    expect(bc.ab.ph).toBeCloseTo(7.398, 2);
    expect(bc.ab.hco3).toBeCloseTo(24.4, 1);
    expect(Math.abs(bc.ab.be)).toBeLessThan(0.2);
    expect(bc.out.lactate).toBeCloseTo(1, 2);
    expect(bc.out.ag).toBeCloseTo(11.6, 1);
    expect(bc.out.k).toBeCloseTo(4.2, 2);
  });
  it('17a class III (1750 mL over 10 min): lactate 3–5 at 30 min, BE falling; transfusion clears lactate with t½ < 60 min', () => {
    const bc = createBloodCore(MAN, CO0, 40);
    bc.fl.flows.push({ rate: 175, until: 600, comp: null });
    run(bc, 0, 1800);
    expect(bc.out.lactate).toBeGreaterThanOrEqual(3);
    expect(bc.out.lactate).toBeLessThanOrEqual(5);
    expect(bc.ab.be).toBeLessThan(-1);
    run(bc, 1800, 2400);
    const lac40 = bc.out.lactate;
    const u = PRODUCTS.rbc;
    bc.fl.flows.push({ rate: (4 * u.ml) / 20, until: 3600, comp: { ...u.comp, k: storedK(14) } }, { rate: 50, until: 3600, comp: FLUIDS.rl });
    run(bc, 2400, 7200);
    expect(bc.out.lactate).toBeLessThan(0.5 * lac40);
    expect(bc.out.hb).toBeGreaterThan(13.5);
  });
  it('massive transfusion, 10 units of 35-day blood in 30 min against a matched bleed: K ≥ 5.5; iCa −0.1 per unit-per-5-min of rate (tables citrateUnit, Q46)', () => {
    const bc = createBloodCore(MAN, CO0, 40);
    const u = PRODUCTS.rbc;
    bc.fl.flows.push({ rate: (10 * u.ml) / 30, until: 1800, comp: { ...u.comp, k: storedK(35) } }, { rate: (10 * u.ml) / 30, until: 1800, comp: null });
    run(bc, 0, 1800);
    const rule = 1.2 - 0.1 * (10 / 30) * 5; // 1.67 units per 5 min → −0.17 (the rule read as a steady-state RATE effect [ENG])
    console.log(`core massive: K ${bc.out.k.toFixed(2)} iCa ${bc.out.iCa.toFixed(3)} (rule ${rule.toFixed(3)})`);
    expect(bc.out.k).toBeGreaterThanOrEqual(5.5);
    expect(Math.abs(bc.out.iCa - rule)).toBeLessThanOrEqual(0.05);
  });
  const crystalloid2L = (id: 'saline' | 'balanced') => {
    const bc = createBloodCore(MAN, CO0, 40);
    bc.fl.flows.push({ rate: 2000 / 30, until: 1800, comp: FLUIDS[id] });
    run(bc, 0, 3600, {}, true);
    return bc;
  };
  it('2 L in 30 min (GA): saline acidifies (Cl up, BE down), the same Plasma-Lyte keeps BE ≥ 0 (annex D3 contrast)', () => {
    const s = crystalloid2L('saline');
    const b = crystalloid2L('balanced');
    console.log(`core 2 L @60 min: saline Cl +${(s.out.cl - 104).toFixed(1)} BE ${s.ab.be.toFixed(1)} | Plasma-Lyte Cl ${(b.out.cl - 104).toFixed(1)} BE ${b.ab.be.toFixed(1)}`);
    expect(s.out.cl - 104).toBeGreaterThan(4);
    expect(s.ab.be).toBeLessThan(b.ab.be - 2);
    expect(b.ab.be).toBeGreaterThanOrEqual(0);
  });
  // R45: annex D3 wants Cl +6–8 and BE −3 to −5 at 60 min; albumin dilution (Stewart) offsets the chloride acidosis in
  // this model (plan deviation list). Kept visible for Ali's calibration pass rather than widened.
  it.fails('2 L 0.9 % saline in 30 min (GA): Cl +6–8 and BE −3 to −5 at 60 min (annex D3)', () => {
    const s = crystalloid2L('saline');
    expect(s.out.cl - 104).toBeGreaterThanOrEqual(6);
    expect(s.out.cl - 104).toBeLessThanOrEqual(8);
    expect(s.ab.be).toBeLessThanOrEqual(-3);
    expect(s.ab.be).toBeGreaterThanOrEqual(-5);
  });
  it('7d renal seam (R51 addendum 14): core.renal replaces the fixed elimination — urine water and each solute at its rate', () => {
    const a = createBloodCore(MAN, CO0, 40);
    const b = createBloodCore(MAN, CO0, 40);
    b.renal = { uopMlH: 600, excretion: { k: 6, na: 60, cl: 60, gluconate: 0 } }; // 10 mL/min of urine, Na/Cl 100 mmol/L, K 10
    run(a, 0, 600);
    run(b, 0, 600);
    expect(bloodMl(a.fl) + a.fl.visf).toBeCloseTo(4807 + 11356, -1); // at rest the fixed elimination removes nothing
    expect(bloodMl(a.fl) + a.fl.visf - (bloodMl(b.fl) + b.fl.visf)).toBeGreaterThan(80); // ≈ 100 mL of urine in 10 min
    expect(b.out.k).toBeLessThan(a.out.k - 0.02);
    expect(b.out.na).toBeGreaterThan(a.out.na); // hypotonic urine concentrates Na
  });
  it('DKA input (ketoacids 20 mmol/L) raises the anion gap by ≈ 20; untreated no-flow for 30 min: lactate 8–12, pH ≤ 7.10 (annex D1)', () => {
    const bc = createBloodCore(MAN, CO0, 40);
    bc.so.keto += 20 * 14;
    run(bc, 0, 10, { paco2: 20 });
    expect(bc.out.ag).toBeGreaterThan(28);
    expect(bc.ab.hco3).toBeLessThan(9);
    const vf = createBloodCore(MAN, CO0, 40);
    for (let k = 0; k < 18000; k++) stepBloodCore(vf, { t: k / 10, coLpm: 0, paco2: 40 + Math.min(40, k / 600), pao2: 40, tempC: 37, vo2Demand: 208 }, 0.1);
    expect(vf.out.lactate).toBeGreaterThanOrEqual(8);
    expect(vf.out.lactate).toBeLessThanOrEqual(12);
    expect(vf.ab.ph).toBeLessThanOrEqual(7.1);
    expect(vf.ab.ph).toBeGreaterThanOrEqual(6.8);
  });
  it('succinylcholine in burns (severity 0.5) → K ≈ 7.5–8; CaCl2 1 g narrows the ECG K by up to half the excess over 5; insulin–dextrose lowers K ≥ 1 by 30 min', () => {
    const bc = createBloodCore(MAN, CO0, 40);
    bc.burns = 0.5;
    bc.doses.push({ id: 'succinylcholine', t0: 0, amount: 100 });
    run(bc, 0, 240);
    expect(bc.out.k).toBeGreaterThan(7.4);
    expect(bc.out.k).toBeLessThan(8.2);
    bc.doses.push({ id: 'calciumChloride', t0: 240, amount: 6.8 });
    bc.so.ca += 0.5 * 6.8;
    run(bc, 240, 420);
    expect(bc.out.kEcg).toBeLessThan(bc.out.k - 0.8);
    const k7 = bc.out.k;
    bc.doses.push({ id: 'insulinDextrose', t0: 420, amount: 10 });
    run(bc, 420, 2220);
    expect(k7 - bc.out.k).toBeGreaterThanOrEqual(1);
  });
  it('insulin–dextrose alone: K −0.6 to −1.0 by 60 min (tables row)', () => {
    const bc = createBloodCore(MAN, CO0, 40);
    bc.doses.push({ id: 'insulinDextrose', t0: 0, amount: 10 });
    run(bc, 0, 1800);
    const k30 = bc.out.k;
    run(bc, 1800, 3600);
    console.log(`core insulin–dextrose: K −${(4.2 - k30).toFixed(2)} at 30 min, −${(4.2 - bc.out.k).toFixed(2)} at 60 min`);
    expect(4.2 - bc.out.k).toBeGreaterThanOrEqual(0.6);
    expect(4.2 - bc.out.k).toBeLessThanOrEqual(1.0);
  });
  it('CPU: one 10 Hz step costs ≤ 0.02 ms (budget 0.1 ms per 20 ms tick)', () => {
    const bc = createBloodCore(MAN, CO0, 40);
    const t0 = performance.now();
    run(bc, 0, 3600);
    expect((performance.now() - t0) / 36_000).toBeLessThan(0.02);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/core.test.ts`
Expected: FAIL: cannot resolve the module under test.

- [x] **Step 3: Implement**

`packages/engine-core/src/l2/blood/core.ts`:

```ts
// Stage 7c core step (the part of pipeline.ts that does not touch the engine): fluids → solutes → oxygen/lactate → pH.
import type { PatientProfile } from '../../types.ts';
import { solvePh, anionGap, type AcidBase } from './acid-base.ts';
import { albGL, bloodMl, createFluids, ecfMl, hbOf, stepFluids, copPlasma, type FluidState } from './fluids.ts';
import { contentDB, type OdcCtx } from './odc.ts';
import { o2Delivery, stepLactate, type O2Out } from './oxygen.ts';
import { bloodPatient, HBF_EXP, NORMAL, type BloodPatient } from './params.ts';
import { addFluid, calibrateXa, concOf, createSolutes, ionisedCa, osmEcf, removePlasma, sidOf, stepSolutes, type Conc, type SoluteState } from './solutes.ts';
import { caMembrane, insulinEffect, INSULIN_K_SHIFT, K_PUMP_GAIN, salbutamolEffect, SALBUTAMOL_K_SHIFT, suxDeltaK, type Dose } from './treatments.ts';

export interface BloodInputs {
  t: number;
  coLpm: number;
  paco2: number;
  pao2: number;
  tempC: number;
  vo2Demand: number; // mL/min
  /** VO2 demand ÷ the awake resting VO2 (Stage 3's metabolic factor); default vo2Demand ÷ the profile's 3.5 mL/kg/min. */
  demandRel?: number;
  /**
   * Stage 7g's β2-agonist/insulin/epinephrine K shift (`bus.metabolic.kShift`, mmol/L). Given → it is the ONLY
   * β2/insulin-row shift (7c's own salbutamol curve is off); absent → 7c's own salbutamol curve (fallback, R50 F2).
   * 7c's `insulinDextrose` row carries no 7g PD, so its curve always stays 7c's.
   */
  kShiftExt?: number;
}

/**
 * 7d's kidney (R51 addendum 14: `blood.core.renal = { uopMlH, excretion: { k, na, cl, gluconate } }`, rates per
 * hour). When 7d fills it, urine REPLACES the fixed volume-receptor elimination and its isotonic solute loss; `null`
 * (the default) = the fixed elimination (K_EL_AWAKE, GA ×0.2) until 7d.
 */
export interface RenalSeam {
  uopMlH: number;
  excretion: { k: number; na: number; cl: number; gluconate: number }; // mmol/h (gluconate: Plasma-Lyte's anion, decision 3)
}

/** What other stages read (7g: hbfRel; 7d: hb, albuminGL, bvRel, lactate; 7b: cop). */
export interface BloodOut {
  na: number; k: number; kEcg: number; cl: number; iCa: number; mg: number; lactate: number; hb: number;
  albGL: number; albuminGL: number; // albuminGL = albGL (the name 7d reads)
  ag: number; osm: number; cop: number; hbfRel: number;
  bvRel: number; // blood volume ÷ the profile's (7d)
}

export interface BloodCore {
  pat: BloodPatient;
  fl: FluidState;
  so: SoluteState;
  ab: AcidBase;
  phNonOrg: number;
  o2: O2Out;
  odc: OdcCtx;
  doses: Dose[];
  burns: number;
  liver: number; // 7d writes liverFn·tempF (function only, R51 addendum 14); hepatic FLOW is 7c's hbfRel, applied once
  renal: RenalSeam | null; // 7d fills it (null = fixed elimination)
  co0: number; // reference CO (L/min): 7a's resting reference `circ.ref.co` (pipeline), else CI × weight
  ecf0: number;
  k1Hz: number; // next 1 Hz solve time
  out: BloodOut;
}

export function createBloodCore(profile: PatientProfile | undefined, co0: number, paco2: number): BloodCore {
  const pat = bloodPatient(profile);
  const b = profile?.blood ?? {};
  const fl = createFluids(pat, b.albuminGL ?? NORMAL.albGL);
  const e0 = ecfMl(fl);
  const so = createSolutes({ na: b.na ?? NORMAL.na, k: b.k ?? NORMAL.k, cl: b.cl ?? NORMAL.cl, iCa: b.iCa ?? NORMAL.iCa, mg: b.mg ?? NORMAL.mg, lactate: b.lactate ?? NORMAL.lactate }, e0, pat.vLacL, pat.icfMl);
  const odc: OdcCtx = { hb: pat.hb, ph: 7.4, dpgMmolL: b.dpgMmolL ?? NORMAL.dpgMmolL, cohb: b.cohb ?? 0, methb: b.methb ?? 0 };
  // calibrate the unmeasured anions so the profile's HCO3 (default 24.4) holds at PaCO2 40 (tables §5b.1 normal row)
  const hco3 = b.hco3 ?? NORMAL.hco3;
  const ph0 = 6.1 + Math.log10(hco3 / (0.0307 * NORMAL.paco2));
  const c = concOf(so, e0, pat.vLacL, e0);
  const alb = albGL(fl);
  const sidNeed = hco3 + alb * (0.123 * ph0 - 0.631) + c.pi * (0.309 * ph0 - 0.469) + ((1.43 * pat.hb) / 3) * (ph0 - 7.4);
  calibrateXa(so, e0, sidOf(c, ionisedCa(c, ph0)), sidNeed);
  so.set.ph = ph0;
  return {
    pat, fl, so, ab: solvePh(paco2, { sid: sidNeed, albGL: alb, piMmolL: c.pi, hb: pat.hb }), phNonOrg: ph0,
    o2: { cao2: 0, do2: 0, vo2: 0, demand: 0, deficit: 0, er: 0, svo2: 0.75 }, odc, doses: [], burns: b.burns ?? 0, liver: 1, renal: null,
    co0, ecf0: e0, k1Hz: 0,
    out: { na: 0, k: 0, kEcg: 0, cl: 0, iCa: 0, mg: 0, lactate: 0, hb: 0, albGL: 0, albuminGL: 0, ag: 0, osm: 0, cop: 0, hbfRel: 1, bvRel: 1 },
  };
}

function effects(bc: BloodCore, t: number): { ins: number; salb: number; sux: number; caMem: number } {
  let ins = 0;
  let salb = 0;
  let sux = 0;
  let caMem = 0;
  for (const d of bc.doses) {
    const tm = (t - d.t0) / 60;
    if (d.id === 'insulinDextrose') ins += insulinEffect(tm);
    else if (d.id === 'salbutamol') salb += salbutamolEffect(tm);
    else if (d.id === 'succinylcholine') sux += suxDeltaK(tm, bc.burns);
    else if (d.id === 'calciumChloride' || d.id === 'calciumGluconate') caMem = Math.max(caMem, caMembrane(tm));
  }
  return { ins, salb, sux, caMem };
}

export function stepBloodCore(bc: BloodCore, x: BloodInputs, dtS: number): void {
  const { fl, so, pat } = bc;
  // 1. fluids (water) with bleeding/infusions; solutes follow the volumes
  const c0 = concOf(so, ecfMl(fl), pat.vLacL, bc.ecf0);
  const ecfBefore = ecfMl(fl);
  const rn = bc.renal;
  const r = stepFluids(fl, x.t, dtS, osmEcf(c0) > 0 ? 290 / osmEcf(c0) : 1, rn ? Math.max(0, rn.uopMlH) / 60 : undefined);
  if (r.bledPlasmaMl > 0) removePlasma(so, r.bledPlasmaMl, ecfBefore, c0);
  if (rn) {
    // 7d's urine: each solute at the kidney's own rate (mmol/h)
    const dtH = dtS / 3600;
    so.na = Math.max(0, so.na - rn.excretion.na * dtH);
    so.k = Math.max(0, so.k - rn.excretion.k * dtH);
    so.cl = Math.max(0, so.cl - rn.excretion.cl * dtH);
    so.xa -= rn.excretion.gluconate * dtH;
  } else if (r.elimMl > 0) {
    // eliminated volume leaves as ISOTONIC fluid at the ECF composition (a solute-free loss concentrates Na: the Pulse
    // oracle O3b caught Na +2.0 vs Pulse +0.9 after 1 L saline) [ENG until 7d's urine composition]
    removePlasma(so, r.elimMl, ecfBefore, c0);
  }
  for (const g of r.given) addFluid(so, g.ml, g.comp);
  // 2. homeostasis / transcellular shifts
  const hbfRel = Math.min(1.5, Math.max(0, x.coLpm / bc.co0) ** HBF_EXP);
  const ef = effects(bc, x.t);
  const beta = x.kShiftExt ?? SALBUTAMOL_K_SHIFT * ef.salb; // ONE β2/insulin-row source (R50 F2)
  const drug = INSULIN_K_SHIFT * ef.ins + beta;
  const kSet = so.set.k - 4.0 * (bc.phNonOrg - so.set.ph) + drug; // Q45
  stepSolutes(so, ecfMl(fl), dtS, kSet, hbfRel * bc.liver, 1 + K_PUMP_GAIN * Math.abs(drug)); // flow × function, each once
  // 3. oxygen delivery → lactate
  bc.odc.hb = hbOf(fl);
  bc.odc.ph = bc.ab.ph;
  const cao2 = contentDB(x.pao2, x.paco2, x.tempC, bc.odc);
  const d = o2Delivery(x.coLpm, bc.co0, cao2, x.vo2Demand, pat.weightKg, x.demandRel ?? x.vo2Demand / pat.vo2Rest);
  so.lac = stepLactate(so.lac, pat.vLacL, d.deficit, hbfRel, bc.liver, dtS);
  const cv = Math.max(0, cao2 - d.vo2 / Math.max(0.05, x.coLpm));
  bc.o2 = { ...d, cao2, svo2: Math.min(1, cv / Math.max(1, 13.4 * bc.odc.hb * (1 - bc.odc.cohb - bc.odc.methb))) };
  // 4. acid–base (dynamic SID)
  const c = concOf(so, ecfMl(fl), pat.vLacL, bc.ecf0);
  const iCa = ionisedCa(c, bc.ab.ph);
  const chem = { sid: sidOf(c, iCa), albGL: albGL(fl), piMmolL: c.pi, hb: bc.odc.hb };
  bc.ab = solvePh(x.paco2, chem);
  if (x.t >= bc.k1Hz) {
    bc.k1Hz = x.t + 1;
    // pH without the organic (lactate/keto) excess: drives the K shift only for mineral/respiratory acidosis (Q45)
    const org = Math.max(0, c.lactate - NORMAL.lactate) + c.keto;
    bc.phNonOrg = solvePh(x.paco2, { ...chem, sid: chem.sid + org }).ph;
  }
  const k = c.k + ef.sux;
  bc.out = {
    na: c.na, k, kEcg: k - 0.5 * ef.caMem * Math.max(0, k - 5), cl: c.cl, iCa, mg: c.mg, lactate: c.lactate, hb: bc.odc.hb,
    albGL: chem.albGL, albuminGL: chem.albGL, ag: anionGap(c.na, c.cl, bc.ab.hco3), osm: osmEcf(c), cop: copPlasma(fl), hbfRel,
    bvRel: bloodMl(fl) / fl.ref.bv,
  };
}
export type { Conc };
```

The test uses the same 7a-absent CO fallback as `circ-adapter.ts` (Task 10) written inline, so this task does not depend on Task 10. The 24 h test yields hourly (CI rule).

- [x] **Step 4: Run the test**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/core.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/blood/core.ts packages/engine-core/test/l2/blood/core.test.ts
git commit -m "feat(blood): core 10 Hz step, published out block and the 7d renal seam" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7c-blood
```

### Task 10: Circulation adapter and lung-water seam (Stage 7a duck-typed; Stage 2 fallback for unit rigs)

**Files:**
- Create: `packages/engine-core/src/l2/blood/circ-adapter.ts`, `packages/engine-core/test/l2/blood/circ-adapter.test.ts`

**Interfaces:**
- Consumes: `l1Target`, `L1State` (Stage 2/3 `l1/state.ts`).
- Produces: `CircLike {t, vol[], ext, ref?: {co}}`, `circOf(hemo)`, `pushCircVolume(c, dMl, dtS)` (`until` = `t + dtS − 1 µs`), `setCircChemistry(c, k)` (writes `ext.kChem` unconditionally, R50 F3), `volumeCoFactor(bvRatio)`, `applyL1Fallback(l1, t, bvRatio, kChem)` (unit rigs without a circuit), `chemistryContractility(ph, iCa)`, `pulmCapPressure(hemo)` (7a's `circOut.pPv` or null), `LW_GAIN`, `LW_TAU_MIN`, `lungWaterStep(w, pCap, cop, kfMult, sigmaRel, dtS)`.

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l2/blood/circ-adapter.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createL1State } from '../../../src/l1/state.ts';
import { applyL1Fallback, chemistryContractility, circOf, lungWaterStep, pulmCapPressure, pushCircVolume, setCircChemistry, volumeCoFactor } from '../../../src/l2/blood/circ-adapter.ts';

describe('circulation adapter (plan decision 10)', () => {
  it('finds a Stage 7a CircModelState by duck typing, pushes 100 ms volume events and writes ext.kChem unconditionally', () => {
    expect(circOf({})).toBeNull();
    expect(circOf({ circ: { t: 1 } })).toBeNull();
    // 7a's ext initialiser omits the optional kChem key (R51 addendum 14): 7c must still write it
    const hemo = { circ: { t: 12.3, vol: [] as { rate: number; until: number }[], ext: { kLv: 1 } as Record<string, unknown>, ref: { co: 5.4 } } };
    const c = circOf(hemo);
    expect(c).not.toBeNull();
    expect(c?.ref?.co).toBe(5.4);
    pushCircVolume(c!, -17.5, 0.1);
    expect(hemo.circ.vol).toEqual([{ rate: -175, until: 12.4 - 1e-6 }]);
    setCircChemistry(c!, 0.8);
    expect(hemo.circ.ext.kChem).toBe(0.8);
    setCircChemistry(c!, 1);
    expect(hemo.circ.ext.kChem).toBe(1);
  });
  it('fallback (unit rigs without a circuit): CO factor 1 to 10 % loss, 0.6 at 35 %; volumeStatus and contractility coupled truths', () => {
    expect(volumeCoFactor(0.95)).toBe(1);
    expect(volumeCoFactor(0.65)).toBeCloseTo(0.6, 6);
    const l1 = createL1State();
    applyL1Fallback(l1, 0, 0.8, 1);
    expect(l1.coupled?.volumeStatus).toBeCloseTo(1 - 0.2 / 0.35, 6);
    expect(l1.coupled?.contractility).toBeUndefined();
    applyL1Fallback(l1, 0, 0.8, 0.7);
    expect(l1.coupled?.contractility).toBeCloseTo(0.7, 6);
  });
  it('chemistry → contractility: ×(1 − 1.5·(7.2 − pH)) below 7.2 (Q44), ×(iCa/1.1)^1.5 below 1.1 (Q46)', () => {
    expect(chemistryContractility(7.4, 1.2)).toBe(1);
    expect(chemistryContractility(7.0, 1.2)).toBeCloseTo(0.7, 6);
    expect(chemistryContractility(7.4, 0.9)).toBeCloseTo((0.9 / 1.1) ** 1.5, 6);
  });
  it('lung water (G7b ruling 8): none below COP − 2; +10 mL/kg at steady state 10 mmHg above it; a leak lowers the threshold', () => {
    expect(pulmCapPressure({})).toBeNull();
    expect(pulmCapPressure({ circOut: { pPv: 9 } })).toBe(9);
    const run = (pCap: number, cop: number, kf: number, sig: number, min: number) => {
      let w = 0;
      for (let t = 0; t < min * 60; t += 0.1) w = lungWaterStep(w, pCap, cop, kf, sig, 0.1);
      return w;
    };
    expect(run(9, 22.4, 1, 1, 120)).toBe(0); // normal: pCap 9 < 20.4
    expect(run(30.4, 22.4, 1, 1, 600)).toBeCloseTo(10, 0); // PCWP 30: EVLWI 7 → 17
    expect(run(30.4, 22.4, 1, 1, 60)).toBeGreaterThan(5); // most of it within the hour
    expect(run(12, 22.4, 3, 0.5, 600)).toBeGreaterThan(5); // sepsis leak: oedema at a normal PCWP
    expect(run(12, 12, 1, 1, 600)).toBeGreaterThan(1); // hypoalbuminaemia (COP 12): threshold 10
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/circ-adapter.test.ts`
Expected: FAIL (module missing).

- [x] **Step 3: Implement**

`packages/engine-core/src/l2/blood/circ-adapter.ts`:

```ts
// The blood's contacts with the circulation and the lungs (plan decision 10; G7b ruling 8). Stage 7a's
// CircModelState is read by DUCK TYPING (`hemo.circ` with a numeric `t`, a `vol` array and `ext`), so 7c never
// imports from l2/circ/**; on main `hs.circ` always exists, the Stage 2 fallback serves unit rigs without a circuit.
import { l1Target, type L1State } from '../../l1/state.ts';

/** The part of Stage 7a's CircModelState this adapter touches (`t`, `vol`, `ext`, the resting reference `ref.co`). */
export interface CircLike {
  t: number;
  vol: { rate: number; until: number }[]; // mL/s until sim time
  ext: Record<string, unknown>;
  ref?: { co: number }; // L/min, the stabilised resting reference
}

export function circOf(hemo: unknown): CircLike | null {
  const c = (hemo as { circ?: unknown } | null)?.circ as Partial<CircLike> | undefined;
  return c && typeof c.t === 'number' && Array.isArray(c.vol) && typeof c.ext === 'object' && c.ext !== null ? (c as CircLike) : null;
}

/**
 * 7a present: the blood-volume change of this step (mL) enters the circuit over the next `dtS`. `until` sits 1 µs
 * early so float round-off in the circuit's 2 ms clock never counts a 51st step (the prototype lost 500.7 mL for a
 * 500 mL bleed without it: 7a's circ-events test).
 */
export function pushCircVolume(c: CircLike, dMl: number, dtS: number): void {
  if (Math.abs(dMl) < 1e-9) return;
  c.vol.push({ rate: dMl / dtS, until: c.t + dtS - 1e-6 });
}

/** 7a present: the chemistry contractility multiplier (7a's optional `ext.kChem`, written unconditionally; R50 F3). */
export function setCircChemistry(c: CircLike, k: number): void {
  c.ext.kChem = k;
}

/**
 * 7a ABSENT (unit rigs): cardiac-output factor from blood volume [ENG]: none for the first 10 % loss (compensated),
 * then −16 % per further 10 % (class III, 35 % → 0.6), +6 % per 10 % overload, clamped 0.2–1.15.
 */
export function volumeCoFactor(bvRatio: number): number {
  const loss = 1 - bvRatio;
  return Math.max(0.2, Math.min(1.15, 1 - 1.6 * Math.max(0, loss - 0.1) + 0.6 * Math.max(0, -loss)));
}

/**
 * 7a ABSENT (unit rigs): Stage 2's `volumeStatus` coupled truth = min(current, target × volume factor), factor 1 at
 * BV0 and 0 at 35 % loss [ENG]; `contractility` coupled truth = target × chemistry factor (cleared at 1).
 */
export function applyL1Fallback(l1: L1State, t: number, bvRatio: number, kChem: number): void {
  const c = (l1.coupled ??= {});
  const f = Math.max(0, Math.min(1, 1 - (1 - bvRatio) / 0.35));
  if (f < 0.995) c.volumeStatus = Math.min(c.volumeStatus ?? l1Target(l1, 'volumeStatus', t), l1Target(l1, 'volumeStatus', t) * f);
  if (kChem < 0.995) c.contractility = l1Target(l1, 'contractility', t) * kChem;
  else delete c.contractility;
}

/**
 * Chemistry → contractility (tables §5b.1 Q44, §5b.2 Q46): ×(1 − 1.5·(7.2 − pH)) below pH 7.2 (floor 0.3) and
 * ×min(1, (iCa/1.1)^1.5).
 */
export function chemistryContractility(ph: number, iCa: number): number {
  const acid = ph < 7.2 ? Math.max(0.3, 1 - 1.5 * (7.2 - ph)) : 1;
  return acid * Math.min(1, (iCa / 1.1) ** 1.5);
}

// --- lung water (G7b ruling 8): the blood's COP and capillary leak → 7b's EVLWI key ---------------------------
/** Pulmonary capillary pressure (mmHg): 7a's pulmonary venous pressure `circOut.pPv`, or null without a circuit. */
export function pulmCapPressure(hemo: unknown): number | null {
  const o = (hemo as { circOut?: { pPv?: unknown } } | null)?.circOut;
  return o && typeof o.pPv === 'number' ? o.pPv : null;
}
/** Lung-water filtration, mL/kg/min per mmHg above the oedema threshold [ENG, Q25]: EVLWI +10 mL/kg at steady state for 10 mmHg. */
export const LW_GAIN = 1 / 60;
/** Lung lymph clearance time constant, min [ENG, Q25]. */
export const LW_TAU_MIN = 60;

/**
 * One step of the extra lung water W (mL/kg above the conditions' EVLWI). Threshold = tables §2 `pOedema` (COP − 2,
 * acute), scaled by the protein reflection coefficient σ/σ0 (a leak lowers it); filtration × the capillary-leak
 * multiplier `kfMult`; clearance W/τ.
 */
export function lungWaterStep(w: number, pCap: number, cop: number, kfMult: number, sigmaRel: number, dtS: number): number {
  const excess = Math.max(0, pCap - (sigmaRel * cop - 2));
  const dtM = dtS / 60;
  return Math.max(0, w + (LW_GAIN * kfMult * excess - w / LW_TAU_MIN) * dtM);
}
```

Check 7a's real state shape on your base: `grep -n "vol: VolumeEvent\[\]\|kChem?\|ref: Stabilised" packages/engine-core/src/l2/circ/model.ts` must show `vol` (`VolumeEvent {rate mL/s, until}`), the optional `kChem` in `ext` and `ref`; `grep -n "pPv" packages/engine-core/src/l2/circ/circuit.ts` must show `CircOut.pPv`. If 7a renamed any of them, change ONLY `circOf`/`CircLike`/`pulmCapPressure` to match and note it in the gate note. The lung-water constants are [ENG, Q25]: steady state W = 10 mL/kg for 10 mmHg above the threshold (tables §4.5 then gives shunt +0.21 and compliance ×0.6 at EVLWI 17), most of it within the hour.

- [x] **Step 4: Run the test**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/circ-adapter.test.ts` → PASS.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/blood/circ-adapter.ts packages/engine-core/test/l2/blood/circ-adapter.test.ts
git commit -m "feat(blood): 7a circulation adapter (volume events, kChem, ref CO) and lung-water seam" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7c-blood
```

### Task 11: Pipeline: BloodState, advanceBlood, the Stage 3 view and the commands

**Files:**
- Create: `packages/engine-core/src/l2/blood/pipeline.ts`, `packages/engine-core/src/l2/blood/labs.ts` (the panel builder is needed by the pipeline; its own tests are Task 12), `packages/engine-core/test/l2/blood/pipeline.test.ts`
- Modify: `packages/engine-core/src/l2/resp/pipeline.ts` — ONLY the five edits that declare `BloodView`/`RespCtx.blood`/`RespState.evlwiExtra`, pass the lung water to `resolveLung` and export `metabolic` (Task 14 does the rest); `packages/engine-core/src/l2/lung/conditions.ts` — exception E-7c-1, three edits (`resolveLung`'s optional `evlwiAdd`). The anchors are those of the 7a + 7b + 7g main (7b replaced Stage 3's `stepO2` import and its O2 step; 7g added `vaLpm`).

Find (exactly once in `packages/engine-core/src/l2/resp/pipeline.ts`):

```ts
import { o2Steady, solveShunt, type O2Inputs, type O2State } from '../gas/o2.ts';
```

Replace with:

```ts
import { o2Steady, solveShunt, type O2Inputs, type O2State } from '../gas/o2.ts';
import { pulseOxApparent, type OdcCtx } from '../blood/odc.ts'; // Stage 7c
```

Find (exactly once in `packages/engine-core/src/l2/resp/pipeline.ts`):

```ts
  rhythm: RhythmView;
  hr: RampState;
}
```

Replace with:

```ts
  rhythm: RhythmView;
  hr: RampState;
  /** Stage 7c: what the gas step reads from the blood (absent → Stage 3 behaviour, byte-identical). */
  blood?: BloodView;
}

/** Stage 7c: the blood's ODC context, a CO factor (blood-volume fallback without Stage 7a) and extra CO2 (mL/min). */
export interface BloodView {
  odc: OdcCtx;
  coFactor: number;
  co2LoadMlMin: number;
}
```

Find (exactly once in `packages/engine-core/src/l2/resp/pipeline.ts`):

```ts
  vaLpm?: number; // Stage 7g: alveolar ventilation of the last gas step (volatile uptake)
```

Replace with:

```ts
  vaLpm?: number; // Stage 7g: alveolar ventilation of the last gas step (volatile uptake)
  evlwiExtra?: number; // Stage 7c: lung water from the blood's COP/capillary leak, mL/kg above the conditions' (G7b ruling 8)
```

Find (exactly once in `packages/engine-core/src/l2/resp/pipeline.ts`):

```ts
  const r = resolveLung(rs.lungSpecs, rs.pat.ibwKg, rs.rawEvent);
```

Replace with:

```ts
  const r = resolveLung(rs.lungSpecs, rs.pat.ibwKg, rs.rawEvent, rs.evlwiExtra ?? 0); // Stage 7c: + lung water
```

Find (exactly once in `packages/engine-core/src/l2/resp/pipeline.ts`):

```ts
/** Metabolic factor: temperature, MH and general anaesthesia (brief §4.3, §4.9 conditions). */
function metabolic(rs: RespState, t: number): number {
```

Replace with:

```ts
/**
 * Metabolic factor: temperature, MH and general anaesthesia (brief §4.3, §4.9 conditions). Stage 7c: exported for
 * the blood's VO2 demand; the `gas` argument is Stage 7e's (its plan replaces this body with separate O2/CO2
 * factors) and is ignored until then.
 */
export function metabolic(rs: RespState, t: number, gas: 'o2' | 'co2' = 'co2'): number {
  void gas; // Stage 7c: reserved for Stage 7e
```

(The first edit imports `pulseOxApparent` too; it is used in Task 14. If your lint forbids an unused import in between, move that one name to Task 14.)

Exception E-7c-1 — find (exactly once in `packages/engine-core/src/l2/lung/conditions.ts`):

```ts
 * Resolve condition specs for a patient of `ibwKg`. `rawEvent` = Stage 3 bronchospasm airway multiplier (1 = none).
```

Replace with:

```ts
 * Resolve condition specs for a patient of `ibwKg`. `rawEvent` = Stage 3 bronchospasm airway multiplier (1 = none).
 * `evlwiAdd` = Stage 7c's lung water from the blood (mL/kg above the conditions' EVLWI; G7b ruling 8, E-7c-1).
```

Find (exactly once in `packages/engine-core/src/l2/lung/conditions.ts`):

```ts
export function resolveLung(specs: readonly LungConditionSpec[], ibwKg: number, rawEvent = 1): Resolved {
```

Replace with:

```ts
export function resolveLung(specs: readonly LungConditionSpec[], ibwKg: number, rawEvent = 1, evlwiAdd = 0): Resolved {
```

Find (exactly once in `packages/engine-core/src/l2/lung/conditions.ts`):

```ts
  const ew = Math.max(0, g.evlwi - 7);
  const water = { c: Math.max(0.5, 1 - 0.04 * ew), r: 1 + 0.03 * ew, shunt: 0.03 * Math.max(0, g.evlwi - 10) };
```

Replace with:

```ts
  const ew = Math.max(0, g.evlwi + evlwiAdd - 7); // Stage 7c: + the blood's lung water (E-7c-1)
  const water = { c: Math.max(0.5, 1 - 0.04 * ew), r: 1 + 0.03 * ew, shunt: 0.03 * Math.max(0, g.evlwi + evlwiAdd - 10) };
```

**Interfaces:**
- Consumes: Tasks 2–10; `RespState` (`co2.pf`, `o2.pao2`, `temp.tc`, `temp.anaesthesia`, `pat.vo2/vco2/effKg`, `coRatio`, `evlwiExtra`), `metabolic(rs, t, gas)`, `applyLungSpecs(rs)`, `CI_LPM_PER_KG`, `CO_REF_LPM`, `gasPatient`; 7g's `PkState.bus` (`doses: DoseLogEntry[]` `{agent, mgPerKg, amount, amountUnit, t}`, `metabolic.kShift`) by duck typing.
- Produces: `BloodState {k, core, out: BloodOut, view, labs, cold, keto, ecg, lung {pCap, evlwi}, events: EngineEvent[]}`, `BloodCtx {resp, hemo, l1, pk?}`, `createBloodState(profile)`, `DoseLike`, `pkBus(pk) → {doses, kShift} | null`, `HTS_OVER_MIN` 15, `observeDoses(bs, doses)`, `advanceBlood(bs, ctx, tEnd)` (steps every `k·0.1 ≤ tEnd`), `bloodEcgTargets(bs) → {k: ΔK, qtc: ΔQTc}`, `qtcDeltaCa(iCa)`, `tdpRisk(qtc, mg, k)`, `validateBloodCommand(cmd) → string | undefined | null`, `applyBloodCommand(bs, cmd, t, rs) → boolean`; `BloodView {odc, coFactor, co2LoadMlMin}`, `RespCtx.blood?`, `RespState.evlwiExtra?`, exported `metabolic(rs, t, gas = 'co2')` in `resp/pipeline.ts`; `resolveLung(specs, ibwKg, rawEvent, evlwiAdd = 0)` in `lung/conditions.ts` (E-7c-1); `labPanel(bc, inputs, 'abg' | 'vbg')`, `LAB_TURNAROUND_S` 120, `PendingLab` in `labs.ts`.

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l2/blood/pipeline.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createL1State } from '../../../src/l1/state.ts';
import { advanceBlood, applyBloodCommand, bloodEcgTargets, createBloodState, pkBus, qtcDeltaCa, validateBloodCommand } from '../../../src/l2/blood/pipeline.ts';
import { createRespState } from '../../../src/l2/resp/pipeline.ts';
import type { Command } from '../../../src/types.ts';

const MAN = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175 };
const ev = (event: Record<string, unknown>) => ({ id: 'x', issuedBy: 't', type: 'applyEvent', event }) as Command;
/** A unit rig WITHOUT a circuit or 7g (hemo {}, no pk): the Stage 2 fallback and 7c's own drug path. */
function rig(pk?: unknown) {
  const l1 = createL1State(MAN);
  const rs = createRespState(MAN, l1, 1);
  const bs = createBloodState(MAN);
  return { l1, rs, bs, ctx: { resp: rs, hemo: {}, l1, ...(pk ? { pk } : {}) } };
}
const bv = (bs: ReturnType<typeof createBloodState>) => bs.core.fl.vp + bs.core.fl.hbG * 3;

describe('blood pipeline: commands, view, labs, ECG targets', () => {
  it('validates only its own kinds (null = pass on); 7a’s crystalloid/colloid/blood ids are accepted', () => {
    expect(validateBloodCommand(ev({ kind: 'fluid', fluid: 'rl', volumeMl: 500 }))).toBeUndefined();
    for (const fluid of ['crystalloid', 'colloid', 'blood']) expect(validateBloodCommand(ev({ kind: 'fluid', fluid, volumeMl: 500, overS: 600 }))).toBeUndefined();
    expect(validateBloodCommand(ev({ kind: 'fluid', volumeMl: 0 }))).toMatch(/volumeMl/);
    expect(validateBloodCommand(ev({ kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg' }))).toBeNull();
    expect(validateBloodCommand(ev({ kind: 'drug', drugId: 'magnesium', dose: 2, unit: 'g' }))).toBeUndefined();
    expect(validateBloodCommand(ev({ kind: 'condition', id: 'mh', severity: 1 }))).toBeNull();
    expect(validateBloodCommand(ev({ kind: 'condition', id: 'dka', severity: 2 }))).toMatch(/severity/);
    expect(validateBloodCommand(ev({ kind: 'airway', state: 'patent' }))).toBeNull();
    expect(validateBloodCommand({ id: 'x', issuedBy: 't', type: 'setTarget', variable: 'hr', value: 70 } as Command)).toBeNull();
  });
  it('a 500 mL bleed over 60 s removes exactly 500 mL (minus refill); 7a’s colloid is gelatin', () => {
    const { bs, ctx } = rig();
    advanceBlood(bs, ctx, 5);
    const bv0 = bv(bs);
    expect(applyBloodCommand(bs, ev({ kind: 'bleed', volumeMl: 500, overS: 60 }), 5, ctx.resp)).toBe(true);
    advanceBlood(bs, ctx, 65.05);
    const lost = bv0 - bv(bs);
    expect(bs.core.fl.flows).toHaveLength(0); // the whole 500 mL has run
    expect(lost).toBeGreaterThan(490);
    expect(lost).toBeLessThan(500);
    expect(bs.view.coFactor).toBeGreaterThan(0.98); // ≈ 10 % loss is compensated
    applyBloodCommand(bs, ev({ kind: 'fluid', fluid: 'colloid', volumeMl: 500, overS: 600 }), 66, ctx.resp);
    expect(bs.core.fl.flows[0]?.comp?.colloidGL).toBe(35);
  });
  it('labs every second; a VBG sent with a 60 s turnaround resolves at +60 s with venous values', () => {
    const { bs, ctx } = rig();
    advanceBlood(bs, ctx, 10);
    expect(bs.events.filter((e) => e.type === 'labs')).toHaveLength(10);
    applyBloodCommand(bs, ev({ kind: 'lab', panel: 'vbg', turnaroundS: 60 }), 10, ctx.resp);
    advanceBlood(bs, ctx, 75);
    const r = bs.events.find((e) => e.type === 'labResult');
    expect(r?.type === 'labResult' && r.t).toBe(70);
    if (r?.type === 'labResult') expect(r.values.pco2).toBeGreaterThan(ctx.resp.co2.pf + 2); // venous > arterial
    expect(bs.out.hbfRel).toBeCloseTo(1, 1); // the block 7g/7d read
    expect(bs.out.albuminGL).toBe(bs.out.albGL);
    expect(bs.out.bvRel).toBeCloseTo(1, 3);
  });
  it('ECG targets: sux in burns raises the K delta; low iCa lengthens QTc', () => {
    const { bs, ctx } = rig();
    applyBloodCommand(bs, ev({ kind: 'condition', id: 'burns', severity: 0.5 }), 0, ctx.resp);
    applyBloodCommand(bs, ev({ kind: 'drug', drugId: 'succinylcholine', dose: 100, unit: 'mg' }), 0, ctx.resp);
    advanceBlood(bs, ctx, 240);
    expect(bloodEcgTargets(bs).k).toBeGreaterThan(3);
    expect(qtcDeltaCa(0.9)).toBeCloseTo(20, 6);
    expect(qtcDeltaCa(1.2)).toBe(0);
  });
  it('an unwarmed unit cools the core by ≈ 0.25 °C', () => {
    const { bs, ctx, rs } = rig();
    const t0 = rs.temp.tc;
    applyBloodCommand(bs, ev({ kind: 'transfusion', product: 'rbc', units: 1, overS: 300 }), 0, ctx.resp);
    advanceBlood(bs, ctx, 301);
    expect(t0 - rs.temp.tc).toBeCloseTo(0.25, 2);
  });
});

describe('Stage 7g observer (R51 §3; R50 F1/F2)', () => {
  const bus = (doses: unknown[], kShift = 0) => ({ bus: { doses, metabolic: { kShift } } });
  it('pkBus reads 7g’s bus by duck typing; absent → null (fallback)', () => {
    expect(pkBus(undefined)).toBeNull();
    expect(pkBus({})).toBeNull();
    expect(pkBus(bus([], -0.4))?.kShift).toBe(-0.4);
  });
  it('7g’s logged doses (library units) reach the mass balance once; salbutamol is NOT read from the log', () => {
    const pk = bus([
      { agent: 'succinylcholine', mgPerKg: 1.43, amount: 100_000, amountUnit: 'mcg', t: 0 },
      { agent: 'calciumChloride', mgPerKg: 14.3, amount: 1000, amountUnit: 'mg', t: 0 },
      { agent: 'sodiumBicarbonate', mgPerKg: null, amount: 50, amountUnit: 'mmol', t: 0 },
      { agent: 'magnesium', mgPerKg: 28.6, amount: 2000, amountUnit: 'mg', t: 0 },
      { agent: 'insulinDextrose', mgPerKg: null, amount: 10, amountUnit: 'units', t: 0 },
      { agent: 'salbutamol', mgPerKg: 0.14, amount: 10_000, amountUnit: 'mcg', t: 0 },
      { agent: 'hypertonicSaline', mgPerKg: null, amount: 250, amountUnit: 'mL', t: 0, concentrationPct: 3 },
    ]);
    const { bs, ctx } = rig(pk);
    const na0 = bs.core.so.na;
    const mg0 = bs.core.so.mg;
    advanceBlood(bs, ctx, 0.05);
    expect(bs.core.doses.map((d) => d.id).sort()).toEqual(['calciumChloride', 'insulinDextrose', 'sodiumBicarbonate', 'succinylcholine']);
    expect(bs.core.so.na - na0).toBeCloseTo(50, 1); // + one 0.1 s step of the HTS flow (its sodium runs in over 15 min)
    expect(bs.core.so.mg - mg0).toBeCloseTo(2 * 4.06, 2); // less one 0.1 s step of Mg redistribution
    expect(bs.core.fl.flows[0]?.leftMl).toBeGreaterThan(249); // 250 mL of 3 % NaCl running
    pk.bus.doses = []; // 7g lists each dose for one pass only
    advanceBlood(bs, ctx, 1);
    expect(bs.core.doses).toHaveLength(4);
  });
  it('with 7g, the β2/insulin K shift is bus.metabolic.kShift only; without it, 7c’s own salbutamol curve', () => {
    const own = rig();
    applyBloodCommand(own.bs, ev({ kind: 'drug', drugId: 'salbutamol', dose: 10, unit: 'mg' }), 0, own.ctx.resp);
    advanceBlood(own.bs, own.ctx, 1800);
    const g = rig(bus([], -0.8));
    g.bs.core.doses.push({ id: 'salbutamol', t0: 0, amount: 10 }); // even if present, ignored with 7g
    advanceBlood(g.bs, g.ctx, 1800);
    const none = rig(bus([], 0));
    none.bs.core.doses.push({ id: 'salbutamol', t0: 0, amount: 10 });
    advanceBlood(none.bs, none.ctx, 1800);
    console.log(`salbutamol K at 30 min: own ${own.bs.out.k.toFixed(2)}, 7g kShift −0.8 ${g.bs.out.k.toFixed(2)}, 7g 0 ${none.bs.out.k.toFixed(2)}`);
    const k0 = none.bs.out.k; // never both: with 7g present the 7c salbutamol curve is off (kShift 0 → no fall)
    expect(Math.abs(k0 - 4.2)).toBeLessThan(0.05);
    for (const k of [own.bs.out.k, g.bs.out.k]) {
      expect(k0 - k).toBeGreaterThanOrEqual(0.5); // tables: salbutamol −0.5 to −1.0 over 30 min
      expect(k0 - k).toBeLessThanOrEqual(1.0);
    }
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/pipeline.test.ts`
Expected: FAIL (module missing).

- [x] **Step 3: Implement**

`packages/engine-core/src/l2/blood/labs.ts`:

```ts
// The lab panel (plan decision 13): a 1 Hz `labs` truth event and the instructor's "send ABG/VBG" with a turnaround.
import type { LabPanel } from '../../types-blood.ts';
import { solvePh } from './acid-base.ts';
import type { BloodCore } from './core.ts';
import { albGL } from './fluids.ts';
import { satDB } from './odc.ts';
import { NORMAL } from './params.ts';

export const LAB_TURNAROUND_S = 120; // point-of-care analyser ≈ 60–90 s + the walk [ENG]
const r = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;

export interface LabInputs {
  paco2: number;
  pao2: number;
  tempC: number;
  vco2: number; // mL/min
  coLpm: number;
}

export function labPanel(bc: BloodCore, x: LabInputs, panel: 'abg' | 'vbg'): LabPanel {
  const o = bc.out;
  let ph = bc.ab.ph;
  let hco3 = bc.ab.hco3;
  let be = bc.ab.be;
  let pco2 = x.paco2;
  let po2 = x.pao2;
  let sFunc = satDB(x.pao2, x.paco2, x.tempC, bc.odc);
  if (panel === 'vbg') {
    // PvCO2 − PaCO2 = VCO2/(Q·S), S 4.5 mL/L/mmHg [ENG]; venous PO2 from SvO2 by inverting the curve (bisection)
    pco2 = x.paco2 + x.vco2 / (Math.max(0.3, x.coLpm) * 4.5);
    const a = solvePh(pco2, { sid: bc.ab.hco3 + bc.ab.atot, albGL: albGL(bc.fl), piMmolL: NORMAL.piMmolL, hb: bc.odc.hb });
    ph = a.ph;
    hco3 = a.hco3;
    be = a.be;
    let lo = 1;
    let hi = x.pao2;
    for (let i = 0; i < 30; i++) {
      const mid = 0.5 * (lo + hi);
      if (satDB(mid, pco2, x.tempC, bc.odc) < bc.o2.svo2) lo = mid;
      else hi = mid;
    }
    po2 = 0.5 * (lo + hi);
    sFunc = bc.o2.svo2;
  }
  const dys = bc.odc.cohb + bc.odc.methb;
  return {
    ph: r(ph, 2), pco2: r(pco2, 0), po2: r(po2, 0), hco3: r(hco3, 1), be: r(be, 1),
    so2: r(100 * sFunc * (1 - dys), 1), cohb: r(100 * bc.odc.cohb, 1), methb: r(100 * bc.odc.methb, 1),
    lactate: r(o.lactate, 1), na: r(o.na, 0), k: r(o.k, 1), cl: r(o.cl, 0), iCa: r(o.iCa, 2), mg: r(o.mg, 2),
    hb: r(o.hb, 1), glucose: NORMAL.glucoseMgDl, ag: r(o.ag, 0), osm: r(o.osm, 0),
  };
}

export interface PendingLab {
  drawnAt: number;
  due: number;
  panel: 'abg' | 'vbg';
  values: LabPanel;
}
```

`packages/engine-core/src/l2/blood/pipeline.ts`:

```ts
// Stage 7c pipeline: the engine-facing half of the blood. advanceBlood() runs right after Stage 3's advanceResp on the
// same 10 Hz grid (after Stage 7g's advancePk), OBSERVES 7g's accepted doses (`ps.pk.bus.doses`, R51 §3), steps
// core.ts, publishes the BloodView Stage 3's gas step reads and the `out` block other stages read, emits `labs`
// (1 Hz) and delayed `labResult`, moves blood-volume changes into Stage 7a's circuit, writes the lung-water key for
// 7b, applies cold units to the heat model, and exposes the ECG deltas the engine pushes into Modifiers.
import type { L1State } from '../../l1/state.ts';
import type { BloodClinicalEvent, BloodDrugId } from '../../types-blood.ts';
import type { Command, EngineEvent, PatientProfile } from '../../types.ts';
import { CI_LPM_PER_KG, CO_REF_LPM, gasPatient } from '../gas/params.ts';
import { applyLungSpecs, metabolic, type BloodView, type RespState } from '../resp/pipeline.ts';
import { applyL1Fallback, chemistryContractility, circOf, lungWaterStep, pulmCapPressure, pushCircVolume, setCircChemistry, volumeCoFactor } from './circ-adapter.ts';
import { createBloodCore, stepBloodCore, type BloodCore, type BloodOut } from './core.ts';
import { bloodMl, ecfMl, type Flow } from './fluids.ts';
import { LAB_TURNAROUND_S, labPanel, type LabInputs, type PendingLab } from './labs.ts';
import { BLOOD_DT_S, COLD_UNIT_C, FLUIDS, hypertonicSaline, MG_MMOL_PER_G, NORMAL, PRODUCTS, SIGMA_PROTEIN, storedK, type Composition, type FluidId, type ProductId } from './params.ts';
import { BLOOD_DRUGS, bicarbCo2MlMin, CA_MMOL_PER_G } from './treatments.ts';

export interface BloodState {
  k: number; // next step index (time k·0.1 s)
  core: BloodCore;
  /** = core.out after every step: the block other stages read (7g hbfRel; 7d hb, albuminGL, bvRel, lactate; 7b cop). */
  out: BloodOut;
  view: BloodView;
  labs: PendingLab[];
  /** Cold units running: until (s), °C per s. */
  cold: { until: number; cPerS: number }[];
  /** Ketoacid infusion (mmol/s) until. */
  keto: { rate: number; until: number } | null;
  /** What the engine has already pushed into Modifiers (plan decision 9). */
  ecg: { k: number; qtc: number };
  /** Lung-water seam (G7b ruling 8): filtered pulmonary capillary pressure (mmHg) and the extra EVLWI (mL/kg). */
  lung: { pCap: number; evlwi: number };
  /** Output events (`labs`, `labResult`) waiting for the engine's flush. */
  events: EngineEvent[];
}

export interface BloodCtx {
  resp: RespState;
  hemo: unknown; // HemoState; Stage 7a's `circ`/`circOut` are duck-typed
  l1: L1State;
  pk?: unknown; // Stage 7g's PkState (duck-typed: `bus.doses`, `bus.metabolic.kShift`); absent → 7c's own drug fallback
}

/** Create the blood for a profile. CO0 is re-read from 7a's resting reference every pass (advanceBlood). */
export function createBloodState(profile: PatientProfile | undefined): BloodState {
  const core = createBloodCore(profile, CI_LPM_PER_KG * gasPatient(profile).effKg, NORMAL.paco2);
  return {
    k: 0, core, out: core.out, view: { odc: { ...core.odc }, coFactor: 1, co2LoadMlMin: 0 }, labs: [], cold: [], keto: null,
    ecg: { k: 0, qtc: 0 }, lung: { pCap: 8, evlwi: 0 }, events: [],
  };
}

/** QTc change (ms) from ionised Ca: +10 per 0.1 below 1.1, −10 per 0.1 above 1.3 (tables §5b.2 Q46) [ENG]. */
export function qtcDeltaCa(iCa: number): number {
  return iCa < 1.1 ? (1.1 - iCa) * 100 : iCa > 1.3 ? -(iCa - 1.3) * 100 : 0;
}

/** Torsades-risk hook for 7g/rhythms (0–1): long QTc, low Mg, low K [ENG]. Exposed, not acted on in 7c. */
export function tdpRisk(qtc: number, mg: number, k: number): number {
  const q = Math.max(0, (qtc - 470) / 100);
  return Math.min(1, q * (mg < 0.7 ? 1.5 : 1) * (k < 3 ? 1.5 : 1));
}

function labInputs(rs: RespState, t: number): LabInputs {
  return { paco2: rs.co2.pf, pao2: rs.o2.pao2, tempC: rs.temp.tc, vco2: rs.pat.vco2 * metabolic(rs, t), coLpm: rs.coRatio * CI_LPM_PER_KG * rs.pat.effKg };
}

// --- Stage 7g observer (R51 §3; R50 F1/F2) ------------------------------------------------------------------------
/** The part of 7g's DoseLogEntry 7c reads; `concentrationPct` is 7d's optional field for hypertonic saline (R51 addendum 14). */
export interface DoseLike { agent: string; amount: number; amountUnit: string; t: number; concentrationPct?: number }
interface BusLike { doses: DoseLike[]; kShift: number }

/** 7g's bus (duck-typed), or null when 7g is absent. */
export function pkBus(pk: unknown): BusLike | null {
  const b = (pk as { bus?: { doses?: unknown; metabolic?: { kShift?: unknown } } } | null | undefined)?.bus;
  if (!b || !Array.isArray(b.doses)) return null;
  const k = b.metabolic?.kShift;
  return { doses: b.doses as DoseLike[], kShift: typeof k === 'number' && Number.isFinite(k) ? k : 0 };
}

/** Hypertonic saline runs in over this time when 7g's log gives no duration [ENG]. */
export const HTS_OVER_MIN = 15;

/**
 * Turn 7g's accepted boluses into 7c's mass balance and effect curves, in 7g's library units (sux mcg; calcium salts
 * mg; NaHCO3 mmol; insulin–dextrose units; MgSO4 mg; hypertonic saline mL). Salbutamol, insulin and epinephrine are
 * NOT read here: their K shift arrives once, as `bus.metabolic.kShift` (R50 F2). Each entry is listed for exactly one
 * advance pass, so each dose is observed exactly once.
 */
export function observeDoses(bs: BloodState, doses: readonly DoseLike[]): void {
  const c = bs.core;
  for (const d of doses) {
    const g = d.amountUnit === 'mcg' ? d.amount / 1e6 : d.amountUnit === 'mg' ? d.amount / 1000 : d.amountUnit === 'g' ? d.amount : 0;
    switch (d.agent) {
      case 'succinylcholine':
        c.doses.push({ id: 'succinylcholine', t0: d.t, amount: g * 1000 });
        break;
      case 'insulinDextrose':
        c.doses.push({ id: 'insulinDextrose', t0: d.t, amount: d.amount });
        break;
      case 'calciumChloride':
      case 'calciumGluconate': {
        const mmol = g * CA_MMOL_PER_G[d.agent];
        c.so.ca += 0.5 * mmol; // half ionised once albumin binds it [ENG]
        c.doses.push({ id: d.agent, t0: d.t, amount: mmol });
        break;
      }
      case 'sodiumBicarbonate':
        if (d.amountUnit === 'mmol') {
          c.so.na += d.amount;
          c.doses.push({ id: 'sodiumBicarbonate', t0: d.t, amount: d.amount });
        }
        break;
      case 'magnesium':
        c.so.mg += g * MG_MMOL_PER_G;
        break;
      case 'hypertonicSaline':
        if (d.amountUnit === 'mL') c.fl.flows.push({ rate: d.amount / HTS_OVER_MIN, until: 1e9, leftMl: d.amount, comp: hypertonicSaline(d.concentrationPct ?? 3) });
        break;
      default:
        break;
    }
  }
}

export function advanceBlood(bs: BloodState, ctx: BloodCtx, tEnd: number): void {
  const rs = ctx.resp;
  const circ = circOf(ctx.hemo);
  const bus = pkBus(ctx.pk);
  const c = bs.core;
  if (bus) observeDoses(bs, bus.doses);
  // CO0 in the gas model's flow units (coRatio × CI × effKg): 7a's stabilised resting CO (R50 F4)
  if (circ?.ref) c.co0 = (circ.ref.co / CO_REF_LPM) * CI_LPM_PER_KG * rs.pat.effKg;
  const pPv = pulmCapPressure(ctx.hemo);
  while (bs.k * BLOOD_DT_S <= tEnd + 1e-9) {
    const t = bs.k * BLOOD_DT_S;
    c.fl.anaesthesia = rs.temp.anaesthesia === 'general';
    if (bs.keto && t < bs.keto.until) c.so.keto += bs.keto.rate * BLOOD_DT_S;
    const bv0 = bloodMl(c.fl);
    const coLpm = rs.coRatio * CI_LPM_PER_KG * rs.pat.effKg;
    const mo2 = metabolic(rs, t, 'o2');
    stepBloodCore(c, {
      t, coLpm, paco2: rs.co2.pf, pao2: rs.o2.pao2, tempC: rs.temp.tc, vo2Demand: rs.pat.vo2 * mo2, demandRel: mo2,
      ...(bus ? { kShiftExt: bus.kShift } : {}),
    }, BLOOD_DT_S);
    bs.out = c.out;
    const bvRatio = c.out.bvRel;
    const kChem = chemistryContractility(c.ab.ph, c.out.iCa);
    if (circ) {
      pushCircVolume(circ, bloodMl(c.fl) - bv0, BLOOD_DT_S);
      setCircChemistry(circ, kChem);
    } else applyL1Fallback(ctx.l1, t, bvRatio, kChem);
    for (const u of bs.cold) if (t < u.until) rs.temp.tc -= u.cPerS * BLOOD_DT_S; // unwarmed units (decision 16)
    bs.cold = bs.cold.filter((u) => u.until > t);
    bs.view.odc = { ...c.odc };
    bs.view.coFactor = circ ? 1 : volumeCoFactor(bvRatio);
    bs.view.co2LoadMlMin = bicarbCo2MlMin(c.doses, t);
    c.doses = c.doses.filter((d) => t - d.t0 < 6 * 3600); // every effect is < 1 % after 6 h
    if (pPv !== null) {
      // lung water (G7b ruling 8): 10 s filter on the pulmonary venous pressure; 7b re-resolves at ≥ 0.25 mL/kg change
      bs.lung.pCap += (pPv - bs.lung.pCap) * (BLOOD_DT_S / 10);
      bs.lung.evlwi = lungWaterStep(bs.lung.evlwi, bs.lung.pCap, c.out.cop, c.fl.kfMult, c.fl.sigma / SIGMA_PROTEIN, BLOOD_DT_S);
      if (Math.abs(bs.lung.evlwi - (rs.evlwiExtra ?? 0)) >= 0.25) {
        rs.evlwiExtra = bs.lung.evlwi;
        applyLungSpecs(rs);
      }
    }
    if (bs.k % 10 === 0 && bs.k > 0) {
      bs.events.push({ type: 'labs', t, values: labPanel(c, labInputs(rs, t), 'abg') });
      for (const p of bs.labs) if (p.due <= t) bs.events.push({ type: 'labResult', t: p.due, drawnAt: p.drawnAt, panel: p.panel, values: p.values });
      bs.labs = bs.labs.filter((p) => p.due > t);
    }
    bs.k++;
  }
}

/** ECG targets the engine pushes as deltas: K for Modifiers.k, ΔQTc for Modifiers.qtc. */
export function bloodEcgTargets(bs: BloodState): { k: number; qtc: number } {
  return { k: bs.core.out.kEcg - bs.core.so.set.k, qtc: qtcDeltaCa(bs.core.out.iCa) };
}

// --- commands ----------------------------------------------------------------------------------------------------
const DRUG_UNITS: Record<BloodDrugId, readonly string[]> = {
  succinylcholine: ['mg', 'mg/kg'], insulinDextrose: ['units'], salbutamol: ['mg', 'mcg'], calciumChloride: ['g', 'mg'],
  calciumGluconate: ['g', 'mg'], sodiumBicarbonate: ['mmol', 'mmol/kg'], magnesium: ['g', 'mg'],
};
const num = (name: string, v: number | undefined, lo: number, hi: number) =>
  v === undefined || (Number.isFinite(v) && v >= lo && v <= hi) ? undefined : `${name} must be a finite number in ${lo}–${hi}`;
/** 7a's `crystalloid`/`colloid`/`blood` map to saline / gelatin / whole blood (R50 F5). */
const ALIAS: Record<string, Composition> = { crystalloid: FLUIDS.saline, colloid: FLUIDS.gelatin, blood: { ...PRODUCTS.wholeBlood.comp, k: storedK(14) } };
const FLUID_IDS = [...Object.keys(FLUIDS), ...Object.keys(ALIAS)];

/**
 * Validation hook: a reason, undefined (accepted) or null (not a Stage 7c command). Runs after Stage 7g's (which owns
 * every `drug` event when present — the `drug` case here is the fallback for an engine without 7g) and BEFORE
 * Stage 3's (whose `condition` rejects unknown ids).
 */
export function validateBloodCommand(cmd: Command): string | undefined | null {
  if (cmd.type !== 'applyEvent') return null;
  const ev = cmd.event as BloodClinicalEvent | { kind: string; drugId?: string; id?: string };
  switch (ev.kind) {
    case 'fluid':
    case 'bleed': {
      const f = ev as { fluid?: string; volumeMl?: number; overS?: number; rateMlPerMin?: number };
      if (f.fluid !== undefined && !FLUID_IDS.includes(f.fluid)) return `fluid must be one of ${FLUID_IDS.join(', ')}`;
      if (f.rateMlPerMin !== undefined) return num('rateMlPerMin', f.rateMlPerMin, 0, 2000);
      return f.volumeMl === undefined ? 'volumeMl or rateMlPerMin is required' : num('volumeMl', f.volumeMl, 1, 5000) ?? num('overS', f.overS, 1, 86_400);
    }
    case 'transfusion': {
      const x = ev as Extract<BloodClinicalEvent, { kind: 'transfusion' }>;
      if (!(x.product in PRODUCTS)) return `product must be one of ${Object.keys(PRODUCTS).join(', ')}`;
      return num('units', x.units, 0.5, 20) ?? num('overS', x.overS, 30, 86_400) ?? num('storageDays', x.storageDays, 1, 42) ?? (x.units === undefined ? 'units is required' : undefined);
    }
    case 'drug': {
      const d = ev as { drugId: string; dose: number; unit: string };
      if (!(BLOOD_DRUGS as readonly string[]).includes(d.drugId)) return null;
      if (!(Number.isFinite(d.dose) && d.dose > 0)) return 'dose must be > 0';
      const units = DRUG_UNITS[d.drugId as BloodDrugId];
      return units.includes(d.unit) ? undefined : `${d.drugId} unit must be ${units.join(' or ')}`;
    }
    case 'metabolic': {
      const m = ev as Extract<BloodClinicalEvent, { kind: 'metabolic' }>;
      return num('ketoacidsMmolL', m.ketoacidsMmolL, 0, 40) ?? num('acidMmol', m.acidMmol, 0, 1000) ?? num('overS', m.overS, 1, 86_400);
    }
    case 'condition': {
      const c = ev as { id: string; severity: number };
      if (c.id !== 'burns' && c.id !== 'dka') return null; // Stage 3 (mh), Stage 7a (tamponade, pe, …)
      return c.severity === undefined ? 'severity is required' : num('severity', c.severity, 0, 1);
    }
    case 'lab': {
      const l = ev as Extract<BloodClinicalEvent, { kind: 'lab' }>;
      return l.panel !== 'abg' && l.panel !== 'vbg' ? "panel must be 'abg' or 'vbg'" : num('turnaroundS', l.turnaroundS, 30, 3600);
    }
    default:
      return null;
  }
}

/** Apply hook: true when the command was a Stage 7c command. `t` is the sim time; `rs` for lab snapshots. */
export function applyBloodCommand(bs: BloodState, cmd: Command, t: number, rs: RespState): boolean {
  if (cmd.type !== 'applyEvent') return false;
  const c = bs.core;
  const w = c.pat.weightKg;
  const ev = cmd.event as BloodClinicalEvent | { kind: string };
  switch (ev.kind) {
    case 'fluid':
    case 'bleed': {
      const f = ev as { fluid?: string; volumeMl?: number; overS?: number; rateMlPerMin?: number };
      const comp = ev.kind === 'bleed' ? null : f.fluid === undefined ? FLUIDS.saline : (ALIAS[f.fluid] ?? FLUIDS[f.fluid as FluidId]);
      if (f.rateMlPerMin !== undefined) {
        // an open-ended rate replaces the previous open-ended flow of the same kind; 0 stops it
        c.fl.flows = c.fl.flows.filter((x) => !((x.comp === null) === (comp === null) && x.leftMl === undefined && x.until >= 1e8));
        if (f.rateMlPerMin > 0) c.fl.flows.push({ rate: f.rateMlPerMin, until: 1e9, comp });
      } else {
        const over = f.overS ?? (ev.kind === 'bleed' ? 60 : 600);
        const ml = f.volumeMl as number;
        c.fl.flows.push({ rate: (ml * 60) / over, until: 1e9, leftMl: ml, comp }); // exactly the ordered volume
      }
      return true;
    }
    case 'transfusion': {
      const x = ev as { product: ProductId; units: number; overS?: number; storageDays?: number; warmed?: boolean };
      const p = PRODUCTS[x.product];
      const over = x.overS ?? 600 * x.units; // 10 min per unit unless told
      const comp = { ...p.comp, k: p.comp.hct > 0 ? storedK(x.storageDays ?? 14) : p.comp.k };
      const fl: Flow = { rate: (p.ml * x.units * 60) / over, until: 1e9, leftMl: p.ml * x.units, comp };
      c.fl.flows.push(fl);
      if (x.warmed !== true) bs.cold.push({ until: t + over, cPerS: (COLD_UNIT_C * x.units) / over });
      return true;
    }
    case 'drug': {
      // FALLBACK (no Stage 7g in the engine): with 7g, its validator claims every `drug` event and 7c observes bus.doses
      const d = ev as { drugId: BloodDrugId; dose: number; unit: string };
      if (!(BLOOD_DRUGS as readonly string[]).includes(d.drugId)) return false;
      let amount = d.dose;
      if (d.drugId === 'calciumChloride' || d.drugId === 'calciumGluconate') {
        amount = (d.unit === 'mg' ? d.dose / 1000 : d.dose) * CA_MMOL_PER_G[d.drugId];
        c.so.ca += 0.5 * amount; // half ionised once albumin binds it [ENG]
      } else if (d.drugId === 'sodiumBicarbonate') {
        amount = d.unit === 'mmol/kg' ? d.dose * w : d.dose;
        c.so.na += amount;
      } else if (d.drugId === 'magnesium') {
        amount = (d.unit === 'mg' ? d.dose / 1000 : d.dose) * MG_MMOL_PER_G;
        c.so.mg += amount;
      }
      c.doses.push({ id: d.drugId, t0: t, amount });
      return true;
    }
    case 'metabolic': {
      const m = ev as Extract<BloodClinicalEvent, { kind: 'metabolic' }>;
      const v = ecfMl(c.fl) / 1000;
      if (m.acidMmol) c.so.cl += m.acidMmol; // HCl / NH4Cl: the chloride stays, the H+ is buffered (Stewart)
      if (m.ketoacidsMmolL !== undefined) {
        const over = m.overS ?? 1;
        bs.keto = { rate: (m.ketoacidsMmolL * v - c.so.keto) / over, until: t + over };
      }
      return true;
    }
    case 'condition': {
      const x = ev as { id: string; severity: number };
      if (x.id === 'burns') c.burns = x.severity;
      else if (x.id === 'dka') c.so.keto = 25 * x.severity * (ecfMl(c.fl) / 1000); // established DKA: 25 mmol/L at 1 [ENG]
      else return false;
      return true;
    }
    case 'lab': {
      const l = ev as Extract<BloodClinicalEvent, { kind: 'lab' }>;
      bs.labs.push({ drawnAt: t, due: t + (l.turnaroundS ?? LAB_TURNAROUND_S), panel: l.panel, values: labPanel(c, labInputs(rs, t), l.panel) });
      return true;
    }
    default:
      return false;
  }
}
```

- [x] **Step 4: Run the tests**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood` → PASS (all blood unit tests; the prototype prints `salbutamol K at 30 min: own 3.47, 7g kShift −0.8 3.57, 7g 0 4.18`). `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/resp-engine.test.ts test/l2/lung` → PASS (the resp and lung edits are type-only or default to the old behaviour: `evlwiAdd` 0).

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/blood/pipeline.ts packages/engine-core/src/l2/blood/labs.ts packages/engine-core/test/l2/blood/pipeline.test.ts packages/engine-core/src/l2/resp/pipeline.ts packages/engine-core/src/l2/lung/conditions.ts
git commit -m "feat(blood): pipeline, 7g dose observer, labs; Stage 3 view types and lung-water input (E-7c-1)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7c-blood
```

### Task 12: Labs: the panel, VBG and the send-ABG turnaround (unit level)

**Files:**
- Create: `packages/engine-core/test/l2/blood/labs.test.ts` (the code is `labs.ts` from Task 11)

**Interfaces:**
- Consumes: `labPanel`, `LAB_TURNAROUND_S` (Task 11), `createBloodCore`/`stepBloodCore` (Task 9).
- Produces: the numbers the demo and the gate note quote. Test-after (it pins Task 11's `labs.ts`).

- [x] **Step 1: Write the test**

`packages/engine-core/test/l2/blood/labs.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createBloodCore, stepBloodCore } from '../../../src/l2/blood/core.ts';
import { labPanel, LAB_TURNAROUND_S } from '../../../src/l2/blood/labs.ts';

const MAN = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175 };
const X = { paco2: 40, pao2: 95, tempC: 37, vco2: 200, coLpm: 5.25 };

describe('lab panel (plan decision 13)', () => {
  it('ABG at rest: pH 7.40, PCO2 40, HCO3 24.4, BE 0, AG 12, K 4.2, glucose placeholder 100', () => {
    const bc = createBloodCore(MAN, 5.25, 40);
    stepBloodCore(bc, { t: 0, coLpm: 5.25, paco2: 40, pao2: 95, tempC: 37, vo2Demand: 245 }, 0.1);
    const v = labPanel(bc, X, 'abg');
    expect(v.ph).toBeCloseTo(7.4, 2);
    expect(v.pco2).toBe(40);
    expect(v.hco3).toBeCloseTo(24.4, 1);
    expect(Math.abs(v.be)).toBeLessThanOrEqual(0.1);
    expect(v.ag).toBe(12);
    expect(v.k).toBeCloseTo(4.2, 1);
    expect(v.glucose).toBe(100);
    expect(LAB_TURNAROUND_S).toBe(120);
  });
  it('VBG: higher PCO2 (+ VCO2/(Q·4.5) ≈ 8.5), lower pH, venous PO2 from SvO2', () => {
    const bc = createBloodCore(MAN, 5.25, 40);
    stepBloodCore(bc, { t: 0, coLpm: 5.25, paco2: 40, pao2: 95, tempC: 37, vo2Demand: 245 }, 0.1);
    const a = labPanel(bc, X, 'abg');
    const v = labPanel(bc, X, 'vbg');
    expect(v.pco2 - a.pco2).toBeGreaterThanOrEqual(8);
    expect(v.ph).toBeLessThan(a.ph);
    expect(v.po2).toBeGreaterThan(30);
    expect(v.po2).toBeLessThan(50);
  });
  it('COHb shows on the co-oximeter: SO2 is fractional', () => {
    const bc = createBloodCore({ ...MAN, blood: { cohb: 0.2 } }, 5.25, 40);
    stepBloodCore(bc, { t: 0, coLpm: 5.25, paco2: 40, pao2: 95, tempC: 37, vo2Demand: 245 }, 0.1);
    const v = labPanel(bc, X, 'abg');
    expect(v.cohb).toBe(20);
    expect(v.so2).toBeLessThan(80);
  });
});
```

- [x] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/labs.test.ts`
Expected: PASS (it pins Task 11's `labs.ts`; if a number misses, fix `labs.ts`, not the band: the bands are tables §5b normals).

- [x] **Step 3: Commit**

```bash
git add packages/engine-core/test/l2/blood/labs.test.ts
git commit -m "test(blood): lab panel, VBG and send-ABG turnaround" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7c-blood
```

### Task 13: Stage 3 ODC swap in `gas/o2.ts`

**Files:**
- Modify: `packages/engine-core/src/l2/gas/o2.ts` (the ODC and content now come from `blood/odc.ts`; `O2Inputs.odc?`), `packages/engine-core/test/l2/gas/o2.test.ts` (the Severinghaus assertion becomes the Dash–Bassingthwaighte one)

**Interfaces:**
- Consumes: `satDB`, `contentDB`, `OdcCtx` (Task 3).
- Produces: `ODC_STAGE3` (Hb 14 = the old `HB_G_DL`, pH 7.4, DPG 4.65, no dyshaemoglobin); `odc(po2, tempC?, pco2?, ctx?)`, `content(…, ctx?)`, `po2ForContent(…, ctx?)`; `O2Inputs.odc?: OdcCtx` (absent → `ODC_STAGE3`). Every existing caller keeps compiling.

- [x] **Step 1: Change the unit test first**

In `packages/engine-core/test/l2/gas/o2.test.ts` find:

```ts
  it('Severinghaus ODC: P50 ≈ 26.8 mmHg, 90 % near 58 mmHg; hypothermia shifts it left', () => {
    expect(odc(26.8)).toBeCloseTo(0.5, 2);
    expect(odc(58)).toBeGreaterThan(0.89);
    expect(odc(58)).toBeLessThan(0.91);
```

Replace with:

```ts
  it('Dash–Bassingthwaighte ODC (Stage 7c; was Severinghaus): P50 ≈ 26.8 mmHg, 90 % near 58–61 mmHg; hypothermia shifts it left', () => {
    expect(odc(26.8)).toBeCloseTo(0.5, 2);
    expect(odc(58)).toBeGreaterThan(0.885);
    expect(odc(61)).toBeLessThan(0.91);
```

Add at the end of the same `describe`:

```ts
  it('Stage 7c: the ODC context carries Hb, pH and CO (defaults reproduce Stage 3)', () => {
    expect(content(100)).toBeCloseTo(13.4 * 14 * odc(100) + 3, 6);
    const acid = { hb: 14, ph: 7.2, dpgMmolL: 4.65, cohb: 0, methb: 0 };
    expect(odc(40, 37, 40, acid)).toBeLessThan(odc(40) - 0.05); // Bohr
    expect(content(100, 37, 40, { hb: 7, ph: 7.4, dpgMmolL: 4.65, cohb: 0, methb: 0 })).toBeLessThan(0.52 * content(100));
  });
```

- [x] **Step 2: Run it to verify it fails**

`npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/gas/o2.test.ts` → FAIL (`odc(58)` is 0.891 on Severinghaus but the 4-argument calls do not compile/return the Bohr shift).

- [x] **Step 3: Implement**

Find (exactly once in `packages/engine-core/src/l2/gas/o2.ts`):

```ts
import { BLOOD_VENOUS_FRACTION, HB_G_DL, MASS_FLOW_DEFICIT_ML_MIN, PB_MMHG, PH2O_MMHG, RQ } from './params.ts';
```

Replace with:

```ts
import { BLOOD_VENOUS_FRACTION, HB_G_DL, MASS_FLOW_DEFICIT_ML_MIN, PB_MMHG, PH2O_MMHG, RQ } from './params.ts';
import { contentDB, satDB, type OdcCtx } from '../blood/odc.ts'; // Stage 7c
```

Find (exactly once in `packages/engine-core/src/l2/gas/o2.ts`):

```ts
const O2_CAP = 1.34 * HB_G_DL * 10; // mL O2 per L blood at 100 % saturation
```

Replace with:

```ts
/** Stage 7c: the ODC context when no blood state is present (Stage 3's patient: Hb 14, pH 7.40, no dyshaemoglobin). */
export const ODC_STAGE3: OdcCtx = { hb: HB_G_DL, ph: 7.4, dpgMmolL: 4.65, cohb: 0, methb: 0 };
```

Find (exactly once in `packages/engine-core/src/l2/gas/o2.ts`):

```ts
export function odc(po2: number, tempC = 37, pco2 = 40): number {
  const v = Math.max(0, po2) * 10 ** (0.024 * (37 - tempC) + 0.06 * Math.log10(40 / Math.max(5, pco2)));
  return 1 / (23400 / (v * v * v + 150 * v + 1e-9) + 1);
}
```

Replace with:

```ts
export function odc(po2: number, tempC = 37, pco2 = 40, ctx: OdcCtx = ODC_STAGE3): number {
  return satDB(po2, pco2, tempC, ctx); // Stage 7c: Dash–Bassingthwaighte (N-P09) replaces Severinghaus/Kelman
}
```

Find (exactly once in `packages/engine-core/src/l2/gas/o2.ts`):

```ts
export function content(po2: number, tempC = 37, pco2 = 40): number {
  return O2_CAP * odc(po2, tempC, pco2) + 0.03 * Math.max(0, po2);
}
```

Replace with:

```ts
export function content(po2: number, tempC = 37, pco2 = 40, ctx: OdcCtx = ODC_STAGE3): number {
  return contentDB(po2, pco2, tempC, ctx); // Stage 7c: 13.4·Hb·S·(1 − COHb − MetHb) + 0.03·PO2
}
```

Find (exactly once in `packages/engine-core/src/l2/gas/o2.ts`):

```ts
export function po2ForContent(c: number, tempC = 37, pco2 = 40): number {
```

Replace with:

```ts
export function po2ForContent(c: number, tempC = 37, pco2 = 40, ctx: OdcCtx = ODC_STAGE3): number { // Stage 7c: ctx
```

Find (exactly once in `packages/engine-core/src/l2/gas/o2.ts`):

```ts
    if (content(mid, tempC, pco2) < c) lo = mid;
```

Replace with:

```ts
    if (content(mid, tempC, pco2, ctx) < c) lo = mid;
```

Find (exactly once in `packages/engine-core/src/l2/gas/o2.ts`):

```ts
  bloodL: number;
}
```

Replace with:

```ts
  bloodL: number;
  /** Stage 7c: Hb, pH, DPG, COHb, MetHb from the blood (absent → ODC_STAGE3). */
  odc?: OdcCtx;
}
```

Find (exactly once in `packages/engine-core/src/l2/gas/o2.ts`):

```ts
  const cc = content(fa * PI_DRY, x.tempC, x.paco2);
  const d = x.vo2 / Math.max(0.3, x.qLpm);
  const s = Math.min(0.95, Math.max(0, shunt));
  const ca = cc - (s * d) / (1 - s);
  const pao2 = po2ForContent(ca, x.tempC, x.paco2);
  return { fa, cv: ca - d, sa: odc(pao2, x.tempC, x.paco2), pao2 };
```

Replace with:

```ts
  const k = x.odc ?? ODC_STAGE3; // Stage 7c
  const cc = content(fa * PI_DRY, x.tempC, x.paco2, k);
  const d = x.vo2 / Math.max(0.3, x.qLpm);
  const s = Math.min(0.95, Math.max(0, shunt));
  const ca = cc - (s * d) / (1 - s);
  const pao2 = po2ForContent(ca, x.tempC, x.paco2, k);
  return { fa, cv: ca - d, sa: odc(pao2, x.tempC, x.paco2, k), pao2 };
```

Find (exactly once in `packages/engine-core/src/l2/gas/o2.ts`):

```ts
  const s = Math.min(0.95, Math.max(0, x.shunt));
  const cc = content(st.fa * PI_DRY, x.tempC, x.paco2);
```

Replace with:

```ts
  const s = Math.min(0.95, Math.max(0, x.shunt));
  const k = x.odc ?? ODC_STAGE3; // Stage 7c
  const cc = content(st.fa * PI_DRY, x.tempC, x.paco2, k);
```

Find (exactly once in `packages/engine-core/src/l2/gas/o2.ts`):

```ts
  const caNew = (1 - s) * content(st.fa * PI_DRY, x.tempC, x.paco2) + s * st.cv;
  st.pao2 = po2ForContent(caNew, x.tempC, x.paco2);
  st.sa = odc(st.pao2, x.tempC, x.paco2);
```

Replace with:

```ts
  const caNew = (1 - s) * content(st.fa * PI_DRY, x.tempC, x.paco2, k) + s * st.cv;
  st.pao2 = po2ForContent(caNew, x.tempC, x.paco2, k);
  st.sa = odc(st.pao2, x.tempC, x.paco2, k);
```

(If `HB_G_DL` becomes unused except in `ODC_STAGE3`, that is intended: it stays the no-blood default.)

- [x] **Step 4: Run the gas and Stage 3 oxygen tests**

`npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/gas test/l2/lung test/engine/resp-oxygen.test.ts` → PASS. Note: 7b's `lung/mix-o2.ts` imports `content`/`odc`/`po2ForContent` from `gas/o2.ts`, so from this task on 7b's two O2 stores ALSO use Dash–Bassingthwaighte, with `ODC_STAGE3` (Hb 14, pH 7.40) until Task 14 passes the blood's context. Prototype, ODC swap without the blood view (7a + 7b + 7g base): preoxygenated 492 s, room air 43.0 s, child 134.0 s, obese 169 s (7b alone: child 133 s, G7b).

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/gas/o2.ts packages/engine-core/test/l2/gas/o2.test.ts
git commit -m "feat(gas): Dash–Bassingthwaighte ODC replaces Severinghaus (Stage 7c)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7c-blood
```

### Task 14: Stage 3 and 7b wiring: blood view in the gas step and the lungs' mixing point, SpO2 with dyshaemoglobins, bicarbonate CO2

**Files:**
- Modify: `packages/engine-core/src/l2/resp/pipeline.ts` (the remaining eight edits; all marked `// Stage 7c`), `packages/engine-core/src/l2/lung/mix-o2.ts` and `packages/engine-core/src/l2/lung/lung.ts` (exception E-7c-1: optional `odc` inputs only)
- Create: `packages/engine-core/test/l2/resp/blood-view.test.ts`

**Interfaces:**
- Consumes: `BloodView` (Task 11), `pulseOxApparent` (Task 3).
- Produces: with `ctx.blood` present the gas step uses the blood's ODC context — in Stage 3's MANUAL calibration (`O2Inputs.odc`) AND in 7b's two-store mixing point (`GasInputs.odc` → `O2LungInputs.odc`, exception E-7c-1) —, multiplies CO by `coFactor` (unit-rig fallback), adds `co2LoadMlMin` to VCO2, and feeds the SpO2 chain the oximeter's APPARENT saturation (not when the instructor pins `spo2`). With `ctx.blood` absent every number is byte-identical to the base.

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l2/resp/blood-view.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createL1State } from '../../../src/l1/state.ts';
import { advanceResp, createRespState, type BloodView, type RespCtx } from '../../../src/l2/resp/pipeline.ts';
import { createHemoState } from '../../../src/l2/hemo/pipeline.ts';
import { createEngine } from '../../../src/engine.ts';

const ODC14 = { hb: 14, ph: 7.4, dpgMmolL: 4.65, cohb: 0, methb: 0 };

describe('Stage 3 gas step reads the blood view (Stage 7c)', () => {
  it('a CO factor, extra CO2 and a low Hb change the gas step; no view = Stage 3', () => {
    /** 5 s at the neutral view (the MANUAL EtCO2 calibration at t = 0 must not see the change), then `after` for 60 s. */
    const run = (after?: Partial<BloodView>) => {
      const e = createEngine({ seed: 1 }); // for a rhythm view only
      const ps = (e as unknown as { st: { rhythm: RespCtx['rhythm']; hr: RespCtx['hr'] } }).st;
      const l1 = createL1State();
      const rs = createRespState(undefined, l1, 1);
      const blood: BloodView = { odc: ODC14, coFactor: 1, co2LoadMlMin: 0 };
      const ctx: RespCtx = { l1, hemo: createHemoState(undefined, l1, 75), rhythm: ps.rhythm, hr: ps.hr, ...(after ? { blood } : {}) };
      advanceResp(rs, ctx, Math.round(62.5 * 5), () => {});
      Object.assign(blood, after);
      advanceResp(rs, ctx, Math.round(62.5 * 65), () => {});
      return rs;
    };
    const base = run();
    const same = run({});
    expect(same.co2.pf).toBeCloseTo(base.co2.pf, 9);
    expect(same.o2.sa).toBeCloseTo(base.o2.sa, 9);
    const co2 = run({ co2LoadMlMin: 100 });
    expect(co2.co2.pf).toBeGreaterThan(base.co2.pf + 0.5); // +100 mL/min for 60 s
    const low = run({ coFactor: 0.5 });
    expect(low.coRatio).toBeLessThan(0.6 * base.coRatio + 1e-9);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

`npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/resp/blood-view.test.ts` → FAIL (the view is ignored: the CO2 load and the CO factor change nothing). The test switches the view on 5 s after t = 0 on purpose: Stage 3's MANUAL EtCO2 calibration at t = 0 (which 7b runs after its lung step) would otherwise absorb a CO2 load present from the start by adding ventilation.

- [x] **Step 3: Implement**

Eight edits in `resp/pipeline.ts` (7b replaced Stage 3's single-store O2 step with `lungGasStep`, so the old O2-step anchor of this plan no longer exists: the blood's ODC now reaches SaO2/PaO2 truth through 7b's mixing point, exception E-7c-1) and six in `lung/mix-o2.ts` + `lung/lung.ts`.

Find (exactly once in `packages/engine-core/src/l2/resp/pipeline.ts`):

```ts
function o2Inputs(rs: RespState, l1: L1State, t: number, vaLpm: number): O2Inputs {
```

Replace with:

```ts
function o2Inputs(rs: RespState, l1: L1State, t: number, vaLpm: number, blood?: BloodView): O2Inputs { // Stage 7c: blood
```

Find (exactly once in `packages/engine-core/src/l2/resp/pipeline.ts`):

```ts
    paco2: rs.co2.pf, tempC: rs.temp.tc, frcMl: ga ? rs.pat.frcGaMl : rs.pat.frcMl, bloodL: rs.pat.bloodL,
  };
```

Replace with:

```ts
    paco2: rs.co2.pf, tempC: rs.temp.tc, frcMl: ga ? rs.pat.frcGaMl : rs.pat.frcMl, bloodL: rs.pat.bloodL,
    ...(blood ? { odc: blood.odc } : {}), // Stage 7c
  };
```

Find (exactly once in `packages/engine-core/src/l2/resp/pipeline.ts`):

```ts
  rs.coRatio = cardiacOutput(h, t) / CO_REF_LPM;
```

Replace with:

```ts
  rs.coRatio = (cardiacOutput(h, t) / CO_REF_LPM) * (ctx.blood?.coFactor ?? 1); // Stage 7c: blood-volume fallback
```

Find (exactly once in `packages/engine-core/src/l2/resp/pipeline.ts`):

```ts
  const vco2 = rs.pat.vco2 * metabolic(rs, t);
```

Replace with:

```ts
  const vco2 = rs.pat.vco2 * metabolic(rs, t) + (ctx.blood?.co2LoadMlMin ?? 0); // Stage 7c: bicarbonate CO2
```

Find (exactly once in `packages/engine-core/src/l2/resp/pipeline.ts`):

```ts
  const x = o2Inputs(rs, l1, t, va0);
```

Replace with:

```ts
  const x = o2Inputs(rs, l1, t, va0, ctx.blood); // Stage 7c: blood
```

Find (exactly once in `packages/engine-core/src/l2/resp/pipeline.ts`):

```ts
    qRef: CI_LPM_PER_KG * rs.pat.effKg, // Stage 7b: reference flow for the CO2 mix (low flow stays Stage 3's φ)
```

Replace with:

```ts
    qRef: CI_LPM_PER_KG * rs.pat.effKg, // Stage 7b: reference flow for the CO2 mix (low flow stays Stage 3's φ)
    ...(x.odc ? { odc: x.odc } : {}), // Stage 7c (E-7c-1): the blood's ODC reaches SaO2/PaO2 truth
```

Find (exactly once in `packages/engine-core/src/l2/resp/pipeline.ts`):

```ts
    const x = o2Inputs(rs, l1, t, Math.max(0.3, nominalVa(rs, l1, t)));
```

Replace with:

```ts
    const x = o2Inputs(rs, l1, t, Math.max(0.3, nominalVa(rs, l1, t)), ctx.blood); // Stage 7c
```

Find (exactly once in `packages/engine-core/src/l2/resp/pipeline.ts`):

```ts
  const siteSa = delayStep(rs.delay, sa, siteDelay(
```

Replace with:

```ts
  const shownSa = ctx.blood && !pinned ? pulseOxApparent(sa, ctx.blood.odc) : sa; // Stage 7c: what the oximeter reads (dyshaemoglobins)
  const siteSa = delayStep(rs.delay, shownSa, siteDelay(
```

Exception E-7c-1 — find (exactly once in `packages/engine-core/src/l2/lung/mix-o2.ts`):

```ts
import { content, odc, po2ForContent } from '../gas/o2.ts';
```

Replace with:

```ts
import { content, odc, po2ForContent } from '../gas/o2.ts';
import type { OdcCtx } from '../blood/odc.ts'; // Stage 7c (exception E-7c-1)
```

Find (exactly once in `packages/engine-core/src/l2/lung/mix-o2.ts`):

```ts
  dl: number[]; // diffusion factor per side
  coRatio: number;
}
```

Replace with:

```ts
  dl: number[]; // diffusion factor per side
  coRatio: number;
  /** Stage 7c (E-7c-1): the blood's Hb, pH, 2,3-DPG, COHb, MetHb for every content/ODC call (absent → Stage 3's patient). */
  odc?: OdcCtx;
}
```

Then, in `packages/engine-core/src/l2/lung/mix-o2.ts` ONLY, replace every `x.tempC, x.paco2)` with `x.tempC, x.paco2, x.odc)` — exactly SEVEN occurrences, all arguments of `content`/`po2ForContent`/`odc` (in `endCap` ×3, `faSteady` ×1, `stepO2Lung` ×3; `grep -c "x.tempC, x.paco2)" packages/engine-core/src/l2/lung/mix-o2.ts` prints 7 before and 0 after). `undefined` falls through to the functions' `ODC_STAGE3` default (Task 13).

Find (exactly once in `packages/engine-core/src/l2/lung/lung.ts`):

```ts
import { createO2Lung, stepO2Lung, type O2LungState } from './mix-o2.ts';
```

Replace with:

```ts
import { createO2Lung, stepO2Lung, type O2LungState } from './mix-o2.ts';
import type { OdcCtx } from '../blood/odc.ts'; // Stage 7c (E-7c-1)
```

Find (exactly once in `packages/engine-core/src/l2/lung/lung.ts`):

```ts
  /** Executor addition (Task 14): reference pulmonary flow (L/min, CO_ref); the CO2 mix never sees less. */
  qRef?: number;
}
```

Replace with:

```ts
  /** Executor addition (Task 14): reference pulmonary flow (L/min, CO_ref); the CO2 mix never sees less. */
  qRef?: number;
  /** Stage 7c (E-7c-1): the blood's ODC context, passed to the O2 mixing point (absent → Stage 3's patient). */
  odc?: OdcCtx;
}
```

Find (exactly once in `packages/engine-core/src/l2/lung/lung.ts`):

```ts
    paco2: x.paco2, pA: ls.co2.pA, tempC: x.tempC, frcSide, bloodL: x.bloodL, dl: lp.side.map((s) => s.dl), coRatio: x.coRatio,
  }, dt);
```

Replace with:

```ts
    paco2: x.paco2, pA: ls.co2.pA, tempC: x.tempC, frcSide, bloodL: x.bloodL, dl: lp.side.map((s) => s.dl), coRatio: x.coRatio,
    ...(x.odc ? { odc: x.odc } : {}), // Stage 7c (E-7c-1)
  }, dt);
```

- [x] **Step 4: Run the Stage 3 and 7b suites and the new test**

`npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/resp test/l2/lung test/engine/resp-oxygen.test.ts test/engine/resp-engine.test.ts test/engine/resp-coupling.test.ts` → PASS (no view is passed by the engine yet, so every lung and gas number is the Task 13 one).

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/resp/pipeline.ts packages/engine-core/src/l2/lung/mix-o2.ts packages/engine-core/src/l2/lung/lung.ts packages/engine-core/test/l2/resp/blood-view.test.ts
git commit -m "feat(resp): blood view in the gas step and 7b's mixing point (E-7c-1)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7c-blood
```

### Task 15: Engine wiring: state, command order, flush, advance

**Files:**
- Modify: `packages/engine-core/src/engine.ts` (edits below, all marked `// Stage 7c`); R45 records (`it` → `it.fails` + comment, nothing else): `packages/engine-core/test/engine/circ-events.test.ts`, `packages/engine-core/test/engine/lung-circ.test.ts`, `packages/engine-core/test/engine/lung-unilateral.test.ts`, `packages/engine-core/test/engine/pk-acceptance-pd.test.ts`, `packages/engine-core/test/engine/pk-acceptance-pk.test.ts`
- Create: `packages/engine-core/test/helpers/blood.ts`, `packages/engine-core/test/engine/blood-commands.test.ts`

**Interfaces:**
- Consumes: `advanceBlood`, `applyBloodCommand`, `createBloodState`, `validateBloodCommand` (Task 11).
- Produces: `PipelineState.blood`; the blood validator runs after 7g's (which owns every `drug` event) and BEFORE Stage 3's (so `condition burns|dka` are not rejected by Stage 3, and 7a's conditions fall through); `advanceBlood` runs after `advancePk` and `advanceResp` on the same 62.5 Hz → 10 Hz grid with `ctx.pk = ps.pk`; `blood.events` (`labs`, `labResult`) is flushed like the other outputs; `restore()` fills `blood` for pre-7c snapshots. Test helpers `MAN`, `cmd`, `evB`, `st(e)` (incl. `hemo`, `pk`), `rigB`, `runTo`, `labsAt`, `circVolumeMl`, `circCoLpm`. The R45 `it.fails` records in the 7a/7b/7g tests listed under Step 5.

- [x] **Step 1: Write the helpers and the failing test**

`packages/engine-core/test/helpers/blood.ts`:

```ts
// Stage 7c test helpers: an engine with the adult man, ventilated under GA, and readers for the blood state.
import { createEngine } from '../../src/engine.ts';
import type { BloodState } from '../../src/l2/blood/pipeline.ts';
import { totalVolume } from '../../src/l2/circ/circuit.ts';
import { circCardiacOutput } from '../../src/l2/circ/model.ts';
import type { HemoState } from '../../src/l2/hemo/pipeline.ts';
import type { PkState } from '../../src/l2/pk/pipeline.ts';
import type { RespState } from '../../src/l2/resp/pipeline.ts';
import type { Command, EngineEvent, MonitorEngine, Modifiers, PatientProfile } from '../../src/types.ts';

export const MAN: PatientProfile = { ageY: 40, sex: 'M', weightKg: 70, heightCm: 175 };
let n = 0;
export const cmd = (body: Record<string, unknown>): Command => ({ id: `b${n++}`, issuedBy: 'test', ...body }) as Command;
export const evB = (event: Record<string, unknown>): Command => cmd({ type: 'applyEvent', event });

type Committed = { blood: BloodState; resp: RespState; mods: Modifiers; l1: { coupled?: Record<string, number> }; hemo: HemoState; pk: PkState };
/** White-box view of the committed state (tests only). */
export function st(e: MonitorEngine): Committed {
  return (e as unknown as { st: Committed }).st;
}

/** Stage 7a's whole circulating volume (mL) and its CO (L/min). */
export const circVolumeMl = (e: MonitorEngine): number => totalVolume(st(e).hemo.circ.s, st(e).hemo.circ.p);
export const circCoLpm = (e: MonitorEngine): number => circCardiacOutput(st(e).hemo.circ);

export function rigB(opts: { patient?: PatientProfile; seed?: number; ventilated?: boolean } = {}): { e: MonitorEngine; ev: EngineEvent[] } {
  const e = createEngine({ seed: opts.seed ?? 7, patient: opts.patient ?? MAN });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  if (opts.ventilated !== false) {
    e.dispatch(evB({ kind: 'thermal', anaesthesia: 'general' }));
    e.dispatch(evB({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 }));
  }
  return { e, ev };
}

/** Advance to `tEnd`, one simulated minute per call, yielding between minutes (CI rule). */
export async function runTo(e: MonitorEngine, tEnd: number): Promise<void> {
  for (let t = Math.floor(e.now().simT / 60) * 60 + 60; t < tEnd; t += 60) {
    e.advanceTo(t);
    await new Promise((r) => setImmediate(r));
  }
  e.advanceTo(tEnd);
}

export function labsAt(ev: EngineEvent[], t: number): Extract<EngineEvent, { type: 'labs' }>['values'] {
  const l = ev.filter((x): x is Extract<EngineEvent, { type: 'labs' }> => x.type === 'labs' && x.t <= t + 1e-9);
  const last = l[l.length - 1];
  if (!last) throw new Error(`no labs event before ${t}`);
  return last.values;
}
```

`packages/engine-core/test/engine/blood-commands.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { circCoLpm, circVolumeMl, evB, labsAt, rigB, runTo, st } from '../helpers/blood.ts';

describe('Stage 7c commands and labs (plan decisions 11, 13)', { timeout: 300_000 }, () => {
  it('validates the 7c kinds, leaves drugs to 7g and passes everything else on', () => {
    const { e } = rigB();
    expect(e.dispatch(evB({ kind: 'fluid', fluid: 'saline', volumeMl: 500, overS: 600 })).accepted).toBe(true);
    expect(e.dispatch(evB({ kind: 'fluid', fluid: 'colloid', volumeMl: 500, overS: 600 })).accepted).toBe(true); // 7a's id
    expect(e.dispatch(evB({ kind: 'fluid', fluid: 'lemonade', volumeMl: 500 })).accepted).toBe(false);
    expect(e.dispatch(evB({ kind: 'bleed', rateMlPerMin: 100 })).accepted).toBe(true);
    expect(e.dispatch(evB({ kind: 'transfusion', product: 'rbc', units: 2 })).accepted).toBe(true);
    expect(e.dispatch(evB({ kind: 'drug', drugId: 'calciumChloride', dose: 1, unit: 'g', route: 'iv' })).accepted).toBe(true); // 7g's row
    expect(e.dispatch(evB({ kind: 'drug', drugId: 'calciumChloride', dose: 1, unit: 'units', route: 'iv' })).accepted).toBe(false); // 7g's unit check
    expect(e.dispatch(evB({ kind: 'condition', id: 'burns', severity: 0.5 })).accepted).toBe(true);
    expect(e.dispatch(evB({ kind: 'condition', id: 'mh', severity: 1 })).accepted).toBe(true); // still Stage 3's
    expect(e.dispatch(evB({ kind: 'lab', panel: 'abg' })).accepted).toBe(true);
    expect(e.dispatch(evB({ kind: 'lab', panel: 'csf' })).accepted).toBe(false);
  });
  it('emits `labs` once per second and the ABG 120 s after the draw, frozen at the draw', async () => {
    const { e, ev } = rigB();
    await runTo(e, 30);
    expect(ev.filter((x) => x.type === 'labs' && x.t > 20 && x.t <= 30)).toHaveLength(10);
    const v = labsAt(ev, 30);
    expect(v.ph).toBeGreaterThan(7.3);
    expect(v.ph).toBeLessThan(7.5);
    expect(v.k).toBeCloseTo(4.2, 1);
    e.dispatch(evB({ kind: 'lab', panel: 'abg' }));
    e.dispatch(evB({ kind: 'bleed', volumeMl: 1500, overS: 60 }));
    await runTo(e, 160);
    const r = ev.find((x) => x.type === 'labResult');
    expect(r).toBeDefined();
    if (r?.type !== 'labResult') return;
    expect(r.t - r.drawnAt).toBeCloseTo(120, 0);
    expect(r.values.hb).toBeCloseTo(15, 0); // drawn before the bleed
  });
  it('a bleed moves out of Stage 7a’s circuit (volume and CO fall), kChem is written, no Stage 2 fallback', async () => {
    const { e } = rigB();
    await runTo(e, 20);
    const v0 = circVolumeMl(e);
    const co0 = circCoLpm(e);
    e.dispatch(evB({ kind: 'bleed', volumeMl: 1750, overS: 600 }));
    await runTo(e, 700);
    const s = st(e);
    console.log(`7a present: circuit −${(v0 - circVolumeMl(e)).toFixed(0)} mL, blood bvRel ${s.blood.out.bvRel.toFixed(3)}, CO ${co0.toFixed(2)} → ${circCoLpm(e).toFixed(2)} L/min, CO0 ${s.blood.core.co0.toFixed(2)}`);
    expect(v0 - circVolumeMl(e)).toBeGreaterThan(1500); // the bleed less the refill reached the circuit
    expect(s.blood.out.bvRel).toBeLessThan(0.7);
    expect(circCoLpm(e)).toBeLessThan(0.8 * co0);
    expect(s.blood.view.coFactor).toBe(1); // the circuit carries the CO fall; no Stage 3 fallback factor
    expect(s.hemo.circ.ext.kChem).toBeDefined();
    expect(s.l1.coupled?.volumeStatus).toBeUndefined();
  });
});
```

- [x] **Step 2: Run it to verify it fails**

`npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/blood-commands.test.ts` → FAIL (7a's own handler accepts `fluid: 'lemonade'`, Stage 3 rejects `condition burns`, no `labs` events, no `st(e).blood`).

- [x] **Step 3: Implement** (the ECG push, `pushBloodEcg`, is Task 16; add its call and method there — here apply every edit below EXCEPT the `this.pushBloodEcg(ps);` line inside the advance insert and the `pushBloodEcg` method block)

**First `git fetch origin && git merge --no-edit origin/main`** (R51 §7). Every insert follows the chain order of the Global Constraints: if 7f/7d/7e merged, the blood's validator/apply/advance lines go in their chain position (validate/apply after 7g's pk and any 7f neuro / 7d organs lines, before 7e's endo and Stage 3's; advance after `advanceResp`, before any 7e/7d advance and before `advanceHemo`), not blindly at the literal find text. All edits are additive: no existing line is re-typed except the one `advanceResp(` call, which gains the `blood` field (R51 §7).

Find (exactly once in `packages/engine-core/src/engine.ts`):

```ts
import { spo2PitchHz } from './l3/spo2/spo2.ts'; // Stage 3
```

Replace with:

```ts
import { spo2PitchHz } from './l3/spo2/spo2.ts'; // Stage 3
import { advanceBlood, applyBloodCommand, bloodEcgTargets, createBloodState, validateBloodCommand, type BloodState } from './l2/blood/pipeline.ts'; // Stage 7c
```

Find (exactly once in `packages/engine-core/src/engine.ts`; the single `resp:` line of `PipelineState` — 7g's `pk`/`pkHooks` lines follow it):

```ts
  resp: RespState; // Stage 3: breathing, gas exchange, SpO2/CO2/RR/temperature (brief §4.3–§4.7)
```

Replace with:

```ts
  resp: RespState; // Stage 3: breathing, gas exchange, SpO2/CO2/RR/temperature (brief §4.3–§4.7)
  blood: BloodState; // Stage 7c: fluids, acid–base, electrolytes, O2 delivery, labs
```

Find (exactly once in `packages/engine-core/src/engine.ts`; the `this.st = {` literal — keep the `resp:` line intact, the blood needs nothing from it):

```ts
      resp: createRespState(opts.patient, l1, this.seed), // Stage 3
```

Replace with:

```ts
      resp: createRespState(opts.patient, l1, this.seed), // Stage 3
      blood: createBloodState(opts.patient), // Stage 7c
```

Find (exactly once in `packages/engine-core/src/engine.ts`; `restore()`, after 7g's pre-7g guards — R50 F11):

```ts
    data.st.pkHooks ??= createHookState(); // Stage 7g
```

Replace with:

```ts
    data.st.pkHooks ??= createHookState(); // Stage 7g
    data.st.blood ??= createBloodState(undefined); // Stage 7c: pre-7c snapshots
```

Find (exactly once in `packages/engine-core/src/engine.ts`; the end of the `advanceResp(` statement — insert the `blood` field, then add the two new lines AFTER the statement):

```ts
hr: ps.hr }, Math.floor(end / 8), (ch, m, v) => this.respWrite(ch, m, v)); // Stage 3
```

Replace with:

```ts
hr: ps.hr, blood: ps.blood.view }, Math.floor(end / 8), (ch, m, v) => this.respWrite(ch, m, v)); // Stage 3 (7c: blood view)
    advanceBlood(ps.blood, { resp: ps.resp, hemo: ps.hemo, l1: ps.l1, pk: ps.pk }, Math.floor(end / 8) / RESP_RATE); // Stage 7c: after pk and resp, before hemo
    this.pushBloodEcg(ps); // Stage 7c: K / QTc deltas into Modifiers (plan decision 9)
```

Find (exactly once in `packages/engine-core/src/engine.ts`):

```ts
    this.st.resp.out = keep(this.st.resp.out); // Stage 3
```

Replace with:

```ts
    this.st.resp.out = keep(this.st.resp.out); // Stage 3
    this.st.blood.events = keep(this.st.blood.events); // Stage 7c
```

Find (exactly once in `packages/engine-core/src/engine.ts`; `validate()` — 7g's `validatePkCommand` is already above it and claims every `drug` event):

```ts
    const resp = validateRespCommand(cmd); // Stage 3 (before Stage 2: attachSensor co2/temp)
```

Replace with:

```ts
    const blood = validateBloodCommand(cmd); // Stage 7c (after 7g — which owns `drug` — and before Stage 3, whose `condition` rejects unknown ids)
    if (blood !== null) return blood;
    const resp = validateRespCommand(cmd); // Stage 3 (before Stage 2: attachSensor co2/temp)
```

Find (exactly once in `packages/engine-core/src/engine.ts`; `apply()` — 7g's `applyPkCommand` return is already above it):

```ts
    if (applyRespCommand(ps.resp, ps.l1, cmd, simT)) {
```

Replace with:

```ts
    if (applyBloodCommand(ps.blood, cmd, simT, ps.resp)) return; // Stage 7c
    if (applyRespCommand(ps.resp, ps.l1, cmd, simT)) {
```

- [x] **Step 4: Run the test, then the sibling suites, then the whole engine-core suite**

`npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/blood-commands.test.ts` → PASS. Prototype: `7a present: circuit −1668 mL, blood bvRel 0.653, CO 6.09 → 2.90 L/min, CO0 5.54`.

Then the sibling stages' suites (R50 F5, F7): `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ test/engine/circ- test/l2/lung test/engine/lung- test/engine/pk-`. Expected: everything passes — 7a's class II (SBP 118 → 103, HR 109, PP 36 → 21, PPV 18.8 → 19.0 %) and class III sanity included — EXCEPT exactly these, each moved by real physiology the blood adds (prototype numbers):

| Test (file) | Measured with 7c | Without 7c | Why |
|---|---|---|---|
| `a 500 mL bleed over 60 s removes 500 mL from the circulation` (`test/engine/circ-events.test.ts`, 7a) | 497.4 mL | 500.0 | capillary refill returns 2.6 mL in 65 s (decision 5); the direct volume is exact |
| `OLV: HPV raises the isolated lung's PVR …` (`test/engine/lung-circ.test.ts`, 7b) | qL share 0.325 | 0.302 | the rig is hypercapnic (PaCO2 49 → 97 mmHg in 30 min, pH 7.09): the Bohr shift raises the blocked lung's PAO2 (60 vs 46 mmHg), weakening 7b's PAO2-only HPV stimulus |
| `OLV at FiO2 0.5: SaO2 nadir 88–96 % 4–12 min …` (`test/engine/lung-unilateral.test.ts`, 7b) | nadir 88.7 % at 46.6 min, fL 0.266 | at 7.4 min | same rig class, pH 7.01 at 60 min |
| `phenylephrine ${rate} µg/kg/min: MAP …` rows 0.25/0.5/1.0 (`test/engine/pk-acceptance-pd.test.ts`, 7g) | +17.4/22.1/24.9 % | 23.4/29.8/34.2 | the rig's PaCO2 rises 41 → 57 in 22 min: pH 7.27, 7g's `acidosisFactor` ×0.675 now sees a real pH |
| `acidosis through the engine (7c on main) …` (same file, 7g) | SVR-rise ratio 0.601 at pH 6.85 | (skipped without 7c) | kChem 0.48 lowers CO and 7c's hbfRel, so phenylephrine clearance falls: the test assumed equal concentrations |
| `Eleveld 2 mg/kg in the engine equals the standalone model …` (`test/engine/pk-acceptance-pk.test.ts`, 7g) | Ce 3.098 | 2.996 | 7c's live hbfRel (≈ 0.8 in this MODELED + PEEP rig: CO 5.05 vs 7a's ref 5.54) reaches 7g's high-extraction clearance |

Record each as R45 prescribes — the assertion and its band stay exactly as written, the test becomes `it.fails` with a comment carrying the number — and report them in the gate note as needing orchestrator rulings (Deviations). Apply exactly these edits (if a number you measure differs from the table by more than 10 %, stop and report instead):

Find (exactly once in `packages/engine-core/test/engine/circ-events.test.ts`):

```ts
  it('a 500 mL bleed over 60 s removes 500 mL from the circulation', () => {
```

Replace with:

```ts
  // Stage 7c (R45): the blood's capillary refill returns 2.6 mL during the 65 s (measured 497.4 mL); the direct volume
  // is exact (7c pushes the ordered 500 mL). Kept visible, not widened.
  it.fails('a 500 mL bleed over 60 s removes 500 mL from the circulation', () => {
```

Find (exactly once in `packages/engine-core/test/engine/lung-circ.test.ts`):

```ts
  it('OLV: HPV raises the isolated lung\'s PVR and its measured flow falls to ≤ 30 % of pulmonary flow', async () => {
```

Replace with:

```ts
  // Stage 7c (R45): the rig is hypercapnic (PaCO2 49 → 97 mmHg in 30 min, pH 7.09); the live Bohr shift raises the
  // blocked lung's alveolar PO2 (60 vs 46 mmHg) so the PAO2-only HPV stimulus is weaker: share 0.325 (0.302 without 7c).
  it.fails('OLV: HPV raises the isolated lung\'s PVR and its measured flow falls to ≤ 30 % of pulmonary flow', async () => {
```

Find (exactly once in `packages/engine-core/test/engine/lung-unilateral.test.ts`):

```ts
  it('OLV at FiO2 0.5: SaO2 nadir 88–96 % 4–12 min after isolation, then recovers ≥ 1 % by 60 min; left-lung flow ≤ 0.3', async () => {
```

Replace with:

```ts
  // Stage 7c (R45): hypercapnic rig (pH 7.01 at 60 min) → Bohr shift: nadir 88.7 % at 46.6 min (7.4 min without 7c),
  // end 90.0 %, fL 0.266. The nadir value and fL still hold (7c's Task 17 asserts them). Kept visible, not widened.
  it.fails('OLV at FiO2 0.5: SaO2 nadir 88–96 % 4–12 min after isolation, then recovers ≥ 1 % by 60 min; left-lung flow ≤ 0.3', async () => {
```

Find (exactly once in `packages/engine-core/test/engine/pk-acceptance-pk.test.ts`):

```ts
  it('Eleveld 2 mg/kg in the engine equals the standalone model to 1e-9 (the engine adds no PK error)', async () => {
```

Replace with:

```ts
  // Stage 7c (R45): 7c's live hepatic flow (hbfRel ≈ 0.8 in this ventilated MODELED rig: CO 5.05 vs 7a's ref 5.54) reaches
  // 7g's clearance: Ce 3.098 vs standalone 2.996 at 3 min. Needs a ruling (pin hepFlow in this test, or compare with it).
  it.fails('Eleveld 2 mg/kg in the engine equals the standalone model to 1e-9 (the engine adds no PK error)', async () => {
```

Find (exactly once in `packages/engine-core/test/engine/pk-acceptance-pd.test.ts`):

```ts
  for (const [rate, lo, hi] of PHE)
    it(`phenylephrine ${rate}
```

Replace with:

```ts
  // Stage 7c (R45): this rig is hypercapnic (PaCO2 41 → 57 in 22 min, pH 7.27): 7g's acidosisFactor now sees 7c's pH
  // (×0.675) — MAP +8.5/17.4/22.1/24.9 % (was 13.7/23.4/29.8/34.2 at a pinned pH 7.40). Needs a ruling (normocapnic rig or re-fit).
  for (const [rate, lo, hi] of PHE)
    (rate === 0.1 ? it : it.fails)(`phenylephrine ${rate}
```

Find (exactly once in `packages/engine-core/test/engine/pk-acceptance-pd.test.ts`):

```ts
  it.skipIf(!('blood' in (createEngine({ seed: 1 }).snapshot().state as { st: object }).st))(
    'acidosis through the engine
```

Replace with:

```ts
  // Stage 7c (R45): pH 6.85 → kChem 0.48 → CO and 7c's hbfRel fall → phenylephrine clearance falls, so the SVR-rise ratio
  // is 0.601 against acidosisFactor 0.40: the test assumed equal concentrations. Needs a ruling.
  it.skipIf(!('blood' in (createEngine({ seed: 1 }).snapshot().state as { st: object }).st)).fails(
    'acidosis through the engine
```

Re-run the sibling command above → every file passes (the six records now pass as expected failures). Then the whole suite: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run` → all pass. Prototype (all of this plan applied, CI long-run horizon): **207 files, 891 tests passed, 1 skipped** (pre-existing). **Timing note:** `test/engine/engine-commands.test.ts`'s two per-tick tone tests run close to Vitest's 5 s default on a loaded Mac with OR without the blood. If they time out, run them alone; if they still fail, compare against a main-only run before touching anything — the blood costs ≈ 0.001 ms per tick.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/engine.ts packages/engine-core/test/helpers/blood.ts packages/engine-core/test/engine/blood-commands.test.ts packages/engine-core/test/engine/circ-events.test.ts packages/engine-core/test/engine/lung-circ.test.ts packages/engine-core/test/engine/lung-unilateral.test.ts packages/engine-core/test/engine/pk-acceptance-pd.test.ts packages/engine-core/test/engine/pk-acceptance-pk.test.ts
git commit -m "feat(engine): wire the Stage 7c blood; record six sibling misses as it.fails (R45)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7c-blood
```

### Task 16: ECG, contractility and arrhythmia-risk hooks (K, iCa, Mg, pH)

**Files:**
- Modify: `packages/engine-core/src/engine.ts` (the `pushBloodEcg` call and method withheld in Task 15)
- Create: `packages/engine-core/test/engine/blood-ecg.test.ts`

**Interfaces:**
- Consumes: `bloodEcgTargets` (Task 11), `mergeModifiers`.
- Produces: `Modifiers.k` and `Modifiers.qtc` move by the blood's CHANGES only (plan decision 9); contractility goes to 7a's `ext.kChem` (Task 10/11, already wired in `advanceBlood`); `tdpRisk` is exported for 7g/rhythms (no rhythm is changed by 7c: `l2/ecg/**` is not ours).

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/engine/blood-ecg.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { cmd, evB, MAN, rigB, runTo, st } from '../helpers/blood.ts';

describe('Stage 7c ECG hooks (plan decision 9)', { timeout: 300_000 }, () => {
  it('succinylcholine in a burned patient raises Modifiers.k; calcium lowers the ECG K; insulin lowers plasma K', async () => {
    const { e } = rigB({ patient: { ...MAN, blood: { burns: 0.5 } } });
    await runTo(e, 30);
    expect(st(e).mods.k).toBeCloseTo(4.2, 1);
    e.dispatch(evB({ kind: 'drug', drugId: 'succinylcholine', dose: 100, unit: 'mg', route: 'iv' }));
    await runTo(e, 270);
    const kPeak = st(e).mods.k;
    expect(kPeak).toBeGreaterThan(7.3);
    e.dispatch(evB({ kind: 'drug', drugId: 'calciumChloride', dose: 1, unit: 'g', route: 'iv' }));
    await runTo(e, 450);
    expect(st(e).mods.k).toBeLessThan(st(e).blood.core.out.k - 0.7);
    e.dispatch(evB({ kind: 'drug', drugId: 'insulinDextrose', dose: 10, unit: 'units', route: 'iv' }));
    const k0 = st(e).blood.core.out.k;
    await runTo(e, 2250);
    expect(k0 - st(e).blood.core.out.k).toBeGreaterThanOrEqual(1);
  });
  it('an instructor setModifiers k survives: the blood adds only its own change', async () => {
    const { e } = rigB();
    await runTo(e, 10);
    e.dispatch(cmd({ type: 'setModifiers', modifiers: { k: 7 } }));
    await runTo(e, 60);
    expect(st(e).mods.k).toBeCloseTo(7, 1);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

`npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/blood-ecg.test.ts` → FAIL (`mods.k` stays 4.2).

- [x] **Step 3: Implement**

First `git fetch origin && git merge --no-edit origin/main` (R51 §7: before every `engine.ts` edit). In the `advance` insert of Task 15, add after the `advanceBlood(...)` line:

```ts
    this.pushBloodEcg(ps); // Stage 7c: K / QTc deltas into Modifiers (plan decision 9)
```

and add the method (anchored on the comment of the method that follows it):

Find (exactly once in `packages/engine-core/src/engine.ts`):

```ts
  /** Make the lane buffers match the current lanes (new leads start empty). */
```

Replace with:

```ts
  /**
   * Stage 7c (plan decision 9): push the CHANGE of the blood's ECG K (incl. succinylcholine, calcium stabilisation) and
   * of its iCa QTc effect since the last push into Modifiers — never overwrite an instructor's setModifiers value.
   */
  private pushBloodEcg(ps: PipelineState): void {
    const tg = bloodEcgTargets(ps.blood);
    const a = ps.blood.ecg;
    if (Math.abs(tg.k - a.k) < 0.05 && Math.abs(tg.qtc - a.qtc) < 2) return;
    ps.mods = mergeModifiers(ps.mods, {
      k: Math.min(10, Math.max(1.5, ps.mods.k + tg.k - a.k)),
      qtc: Math.min(650, Math.max(300, ps.mods.qtc + tg.qtc - a.qtc)),
    });
    ps.blood.ecg = tg;
  }

  /** Make the lane buffers match the current lanes (new leads start empty). */
```

- [x] **Step 4: Run the ECG hook test and the Stage 5/5.1 ECG suites**

`npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/blood-ecg.test.ts test/l2/ecg test/engine/engine-pipeline.test.ts` → PASS (at baseline the blood's K is constant, so no Stage 5 test sees a modifier change).

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/engine.ts packages/engine-core/test/engine/blood-ecg.test.ts
git commit -m "feat(engine): blood K and QTc deltas into Modifiers" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7c-blood
```

### Task 17: Stage 3 acceptance re-check after the ODC swap and the blood wiring

**Files:**
- Create: `packages/engine-core/test/engine/blood-stage3-recheck.test.ts`

**Interfaces:**
- Consumes: Stage 3's `test/helpers/resp.ts` (`ADULT`, `desatTime`), the Stage 3/3.1 acceptance suites.
- Produces: the numbers for the gate note's "Stage 3 re-check" table (every G3/G3.1 number re-measured with the blood in the engine).

- [x] **Step 1: Write the test**

`packages/engine-core/test/engine/blood-stage3-recheck.test.ts`:

```ts
// Stage 3 / 3.1 / 7b oxygen numbers with the Stage 7c blood in the engine (Hb 15, live pH/Bohr, Dash–Bassingthwaighte
// through 7b's mixing point — exception E-7c-1).
import { describe, expect, it } from 'vitest';
import { respOf } from '../helpers/lung.ts';
import { ADULT, desatTime, ev3, rig3, stateSeries } from '../helpers/resp.ts';

describe('Stage 3 acceptance re-check with the blood', { timeout: 300_000 }, () => {
  it('desaturation: preoxygenated 8 ± 1.5 min; room air 35–60 s (R39-1); child 160 ± 30 s; obese ≈ 2.7 min', async () => {
    const pre = await desatTime(ADULT, true);
    const room = await desatTime(ADULT, false);
    const child = await desatTime({ ageY: 4, weightKg: 16, baseline: { rr: 24, vt: 130 } }, true);
    const obese = await desatTime({ ageY: 40, weightKg: 127, heightCm: 175, sex: 'M' }, true);
    console.log(`RECHECK preox ${pre.toFixed(0)} s, room ${room.toFixed(1)} s, child ${child.toFixed(1)} s, obese ${obese.toFixed(0)} s`);
    expect(pre / 60).toBeGreaterThanOrEqual(6.5);
    expect(pre / 60).toBeLessThanOrEqual(9.5);
    expect(room).toBeGreaterThanOrEqual(35);
    expect(room).toBeLessThanOrEqual(60);
    expect(child).toBeGreaterThanOrEqual(130);
    expect(child).toBeLessThanOrEqual(190);
    expect(obese / 60).toBeGreaterThanOrEqual(1.7);
    expect(obese / 60).toBeLessThanOrEqual(3.7);
  });
  it('7b OLV at FiO2 0.5 (the assertions that still hold after the Bohr shift; the nadir TIME moved — lung-unilateral it.fails)', async () => {
    const r = rig3({ patient: { ageY: 55, weightKg: 70, heightCm: 175, sex: 'M' } });
    const vent = (vtMl: number) => ev3({ kind: 'ventilation', source: 'ventilator', rr: 14, vtMl, peep: 5, ie: 2, fio2: 0.5 });
    r.e.dispatch(vent(490));
    for (let t = 60; t <= 600; t += 60) { r.e.advanceTo(t); await new Promise((res) => setImmediate(res)); }
    r.e.dispatch(ev3({ kind: 'lungCondition', id: 'olv', severity: 1, side: 'L' }));
    r.e.dispatch(vent(350));
    for (let t = 660; t <= 4200; t += 60) { r.e.advanceTo(t); await new Promise((res) => setImmediate(res)); }
    const sa = stateSeries(r.ev, 'spo2', 600);
    const nadir = sa.reduce((m, p) => (p[1] < m[1] ? p : m), [0, 101] as [number, number]);
    const ph = (r.e as unknown as { st: { blood: { core: { ab: { ph: number } } } } }).st.blood.core.ab.ph;
    console.log(`RECHECK OLV: nadir ${nadir[1].toFixed(1)} % at ${((nadir[0] - 600) / 60).toFixed(1)} min, fL ${respOf(r.e).lung.perf.f[0]!.toFixed(3)}, pH ${ph.toFixed(2)}`);
    expect(nadir[1]).toBeGreaterThan(88);
    expect(nadir[1]).toBeLessThan(96);
    expect(respOf(r.e).lung.perf.f[0]).toBeLessThan(0.3);
  });
});
```

- [x] **Step 2: Run it and every Stage 3 / 3.1 acceptance suite**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/blood-stage3-recheck.test.ts test/engine/resp-oxygen.test.ts test/engine/resp-capnogram.test.ts test/engine/resp-coupling.test.ts test/engine/resp-airway.test.ts test/engine/resp-longrun.test.ts test/engine/stage3-alarms-engine.test.ts test/l2/lung test/engine/lung-` (Stage 3/3.1 AND 7b's suites, R50 F7)
Expected: PASS (7b's two OLV tests pass as the `it.fails` records of Task 15). Prototype, ODC through 7b's mixing point with the blood's Hb 15 and live pH: **preoxygenated 485 s, room air 41.0 s (R39-1 band 35–60), child 130.0 s (band 130–190: ON the lower edge — 7b alone 133 s, the ODC swap alone 134 s; Q34 calibration item), obese 169 s**; `RECHECK OLV: nadir 88.7 % at 46.6 min, fL 0.266, pH 7.01`; the R39-1 displayed-SpO2 test (5c) passes. The capnogram, CO2 kinetics, PPV, RR, temperature and MH numbers do not involve the blood (no bicarbonate given, COHb/MetHb 0, `coFactor` 1) and stay as in `docs/gates/stage-3.md`/`stage-3.1.md`/`stage-7b.md`.

If a band is missed: the only 7c inputs to Stage 3/7b are the ODC context (Hb, pH), `coFactor`, `co2LoadMlMin` and `evlwiExtra` (0 at a normal PCWP). Do NOT retune Stage 3 or 7b; report the number (R45 rule) and check the pH first (`st(e).blood.core.ab.ph` should be 7.35–7.45 at rest). If the child time falls below 130.0 on your base, record it as `it.fails` in THIS file's assertion with the number, as Task 15 does, and report it.

- [x] **Step 3: Commit**

```bash
git add packages/engine-core/test/engine/blood-stage3-recheck.test.ts
git commit -m "test(blood): Stage 3 and 7b oxygen re-check with the blood" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7c-blood
```

### Task 18: Sanity I — class III haemorrhage, transfusion, massive transfusion (engine)

**Files:**
- Create: `packages/engine-core/test/engine/blood-sanity-haem.test.ts`

**Interfaces:**
- Consumes: the engine with the blood (Tasks 1–16), `test/helpers/blood.ts`.
- Produces: tables §7 17a lactate and the massive-transfusion K/iCa numbers through the whole engine. Test-after (sanity task).

- [x] **Step 1: Write the test**

`packages/engine-core/test/engine/blood-sanity-haem.test.ts`:

```ts
// Tables §7 17a and the 7c sanity list: class III haemorrhage, transfusion, massive transfusion (engine; 7a's circuit carries the CO fall).
import { describe, expect, it } from 'vitest';
import { evB, labsAt, rigB, runTo, st } from '../helpers/blood.ts';

describe('7c sanity I — haemorrhage and transfusion', { timeout: 300_000 }, () => {
  it('17a class III (1750 mL over 10 min): lactate 3–5 at 30 min, BE ≤ −1, Hb falls with refill; 4 RBC + 1 L RL clear lactate', async () => {
    const { e, ev } = rigB();
    await runTo(e, 60);
    e.dispatch(evB({ kind: 'bleed', volumeMl: 1750, overS: 600 }));
    await runTo(e, 60 + 1800);
    const at30 = labsAt(ev, 60 + 1800);
    console.log(`17a @30 min: lactate ${at30.lactate} BE ${at30.be} Hb ${at30.hb} pH ${at30.ph}`);
    expect(at30.lactate).toBeGreaterThanOrEqual(3);
    expect(at30.lactate).toBeLessThanOrEqual(5);
    expect(at30.be).toBeLessThanOrEqual(-1);
    await runTo(e, 60 + 2400);
    const lac40 = labsAt(ev, 60 + 2400).lactate;
    e.dispatch(evB({ kind: 'transfusion', product: 'rbc', units: 4, overS: 1200, warmed: true }));
    e.dispatch(evB({ kind: 'fluid', fluid: 'rl', volumeMl: 1000, overS: 1200 }));
    await runTo(e, 60 + 7200);
    const end = labsAt(ev, 60 + 7200);
    console.log(`17a +4 RBC @120 min: lactate ${end.lactate} Hb ${end.hb} K ${end.k} iCa ${end.iCa}`);
    expect(end.lactate).toBeLessThan(0.6 * lac40); // t½ ≈ 35–45 min once flow is restored (Q41)
    expect(end.hb).toBeGreaterThan(13);
  });
  it('massive transfusion: 10 units of 35-day RBC in 30 min against a matched bleed → K ≥ 5.5 and iCa ≤ 1.12; unwarmed units cool the core', async () => {
    const { e, ev } = rigB();
    await runTo(e, 60);
    const t0 = st(e).resp.temp.tc;
    e.dispatch(evB({ kind: 'transfusion', product: 'rbc', units: 10, overS: 1800, storageDays: 35 }));
    e.dispatch(evB({ kind: 'bleed', volumeMl: 2800, overS: 1800 }));
    await runTo(e, 1860);
    const v = labsAt(ev, 1860);
    console.log(`massive: K ${v.k} iCa ${v.iCa} Hb ${v.hb} core ${st(e).resp.temp.tc.toFixed(2)}`);
    expect(v.k).toBeGreaterThanOrEqual(5.5);
    expect(v.iCa).toBeLessThanOrEqual(1.12);
    expect(t0 - st(e).resp.temp.tc).toBeGreaterThan(1.5); // 10 × 0.25 °C less what the heat model restores
  });
});
```

- [x] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/blood-sanity-haem.test.ts`
Expected: PASS. Prototype (7a's circuit carries the CO fall; CO0 = its `ref.co`; demand-normalised regional criterion 0.88 → 0.55): **17a lactate 3.5 at 30 min**, BE −1.6, Hb 14.1, pH 7.24 (the low-flow CO2 retention of Stage 3 adds a respiratory component); after 4 RBC + 1 L RL lactate 1.2 at 120 min, Hb 14.6, K 4.4, iCa 1.22. Massive transfusion: K 5.9, iCa 1.09, Hb 17.8 (RBC-only replacement concentrates Hb — a real teaching point for 1:1:1), core → 33.97 °C with 10 unwarmed units. Re-derivation history (R50 F4): with the old `co0 = 0.075 × kg` the same run gave 3.8; with CO0 = `ref.co` and the flow-only criterion (0.88 → 0.40) 3.8 but a routine MODELED propofol/remifentanil TCI crept to 1.49 in an hour; demand normalisation alone gave 2.9; the full-dependence point 0.55 restores 3.5 while the onset 0.88 keeps an awake MODELED + PEEP patient (CO/CO0 0.91) aerobic. If it misses on your base, the lever is `REGIONAL_FLOW_FULL` (decision 6) within Q41/Q42 — never the onset below the resting CO/CO0 spread (0.91–1.10) — record the values used.

- [x] **Step 3: Commit**

```bash
git add packages/engine-core/test/engine/blood-sanity-haem.test.ts
git commit -m "test(blood): class III haemorrhage, transfusion and massive transfusion" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7c-blood
```

### Task 19: Sanity II — saline vs balanced crystalloid, DKA, hyperventilation, bicarbonate EtCO2 transient, untreated VF

**Files:**
- Create: `packages/engine-core/test/engine/blood-sanity-acid.test.ts`

**Interfaces:**
- Consumes: the engine with the blood; Stage 3's ventilator and CO2 model; Stage 5's `vfCoarse`.
- Produces: annex D1/D3 numbers through the engine; the bicarbonate EtCO2 transient against a same-seed control.

- [x] **Step 1: Write the test**

`packages/engine-core/test/engine/blood-sanity-acid.test.ts`:

```ts
// The 7c sanity list: saline vs balanced crystalloid, DKA, hyperventilation, bicarbonate EtCO2 transient, untreated VF.
import { describe, expect, it } from 'vitest';
import { cmd, evB, labsAt, rigB, runTo, st } from '../helpers/blood.ts';

describe('7c sanity II — acid–base', { timeout: 300_000 }, () => {
  const twoLitres = async (fluid: string) => {
    const { e, ev } = rigB();
    await runTo(e, 60);
    e.dispatch(evB({ kind: 'fluid', fluid, volumeMl: 2000, overS: 1800 }));
    await runTo(e, 3660);
    return labsAt(ev, 3660);
  };
  it('2 L in 30 min under GA: saline acidifies against Plasma-Lyte (Cl up, BE lower by ≥ 2), Plasma-Lyte keeps BE ≥ 0 (annex D3 contrast)', async () => {
    const s = await twoLitres('saline');
    const b = await twoLitres('balanced');
    console.log(`saline Cl ${s.cl} BE ${s.be} | balanced Cl ${b.cl} BE ${b.be}`);
    expect(s.cl - 104).toBeGreaterThan(4);
    expect(s.be).toBeLessThanOrEqual(b.be - 2);
    expect(b.be).toBeGreaterThanOrEqual(0);
  });
  // R45: annex D3 (Cl +6–8, BE −3 to −5 at 60 min) is not reached — albumin dilution offsets the chloride acidosis
  // (plan deviation list; prototype Cl +5, BE −2.0). Visible until Ali's calibration pass.
  it.fails('2 L 0.9 % saline in 30 min under GA: Cl +6–8 and BE −3 to −5 at 60 min (annex D3)', async () => {
    const s = await twoLitres('saline');
    expect(s.cl - 104).toBeGreaterThanOrEqual(6);
    expect(s.cl - 104).toBeLessThanOrEqual(8);
    expect(s.be).toBeLessThanOrEqual(-3);
    expect(s.be).toBeGreaterThanOrEqual(-5);
  });
  it('DKA (condition severity 0.8 → ketoacids 20): AG ≥ 25, HCO3 falls; hyperventilation RR 12 → 24 raises pH ≥ 0.1', async () => {
    const { e, ev } = rigB();
    await runTo(e, 600);
    const base = labsAt(ev, 600);
    e.dispatch(evB({ kind: 'ventilation', source: 'ventilator', rr: 24, vtMl: 500, fio2: 0.5, peep: 5 }));
    await runTo(e, 1200);
    expect(labsAt(ev, 1200).ph - base.ph).toBeGreaterThanOrEqual(0.1);
    e.dispatch(evB({ kind: 'condition', id: 'dka', severity: 0.8 }));
    await runTo(e, 1260);
    const d = labsAt(ev, 1260);
    console.log(`hyperv pH ${labsAt(ev, 1200).ph}; DKA AG ${d.ag} HCO3 ${d.hco3} pH ${d.ph}`);
    expect(d.ag).toBeGreaterThanOrEqual(25);
    expect(d.hco3).toBeLessThan(base.hco3 - 12);
  });
  it('NaHCO3 50 mmol at fixed ventilation: EtCO2 +3–8 mmHg over a no-dose control within 3 min, < half of that by 15 min', async () => {
    const run = async (dose: boolean) => {
      const { e } = rigB({ seed: 11 });
      await runTo(e, 1200);
      if (dose) e.dispatch(evB({ kind: 'drug', drugId: 'sodiumBicarbonate', dose: 50, unit: 'mmol', route: 'iv' }));
      const out: number[] = [];
      for (let t = 1230; t <= 2100; t += 30) {
        await runTo(e, t);
        out.push(st(e).resp.etco2);
      }
      return out;
    };
    const a = await run(true);
    const b = await run(false);
    const d = a.map((x, i) => x - (b[i] as number));
    const peak = Math.max(...d.slice(0, 6));
    console.log(`bicarb ΔEtCO2 by 30 s: ${d.map((x) => x.toFixed(1)).join(' ')}`);
    expect(peak).toBeGreaterThanOrEqual(3);
    expect(peak).toBeLessThanOrEqual(8);
    expect(d[d.length - 1] as number).toBeLessThan(0.5 * peak);
  });
  it('untreated VF 30 min (ventilator on): lactate 8–12, pH ≤ 7.10 and ≥ 6.8 (annex D1)', async () => {
    const { e, ev } = rigB();
    await runTo(e, 60);
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' }));
    await runTo(e, 60 + 1800);
    const v = labsAt(ev, 1860);
    console.log(`VF 30 min: lactate ${v.lactate} pH ${v.ph} BE ${v.be} PaCO2 ${v.pco2}`);
    expect(v.lactate).toBeGreaterThanOrEqual(8);
    expect(v.lactate).toBeLessThanOrEqual(12);
    expect(v.ph).toBeLessThanOrEqual(7.1);
    expect(v.ph).toBeGreaterThanOrEqual(6.8);
  });
});
```

- [x] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/blood-sanity-acid.test.ts`
Expected: PASS, with the annex-D3 saline test passing as an expected failure (`it.fails`, R45: prototype Cl +5, BE −2.0 against D3's +6–8 / −3 to −5 — albumin dilution offsets the chloride acidosis; the contrast test asserts saline BE ≥ 2 below Plasma-Lyte's). Prototype: saline Cl 109 (+5), BE −2.0 vs Plasma-Lyte Cl 103, BE +0.6 at 60 min; hyperventilation RR 12 → 24: pH 7.51; DKA 0.8: AG 27, HCO3 8.6, pH 7.09 (ventilator fixed — Winter's compensation is 7f's); bicarbonate ΔEtCO2 vs control 2.5 / 4.4 / **5.0** / 4.9 / 4.7 at 30 / 60 / 90 / 120 / 150 s, 1.9 at 15 min; untreated VF 30 min: lactate **8.6**, pH **6.88**, BE −7.3, PaCO2 131 (Stage 3's CO2 keeps rising with no pulmonary flow; the bracket is 6.5 now, and a root beyond it is reported `atBound`, never NaN). Test-after (sanity task).

- [x] **Step 3: Commit**

```bash
git add packages/engine-core/test/engine/blood-sanity-acid.test.ts
git commit -m "test(blood): saline vs Plasma-Lyte, DKA, hyperventilation, bicarbonate, untreated VF" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7c-blood
```

### Task 20: Sanity III — succinylcholine hyperkalaemia in burns → ECG → calcium → insulin–dextrose; nebulised salbutamol

**Files:**
- Create: `packages/engine-core/test/engine/blood-hyperk.test.ts`

**Interfaces:**
- Consumes: Stage 5's hyperkalaemia rendering from `Modifiers.k` (QRS widening, peaked T, sine wave at 8.5), Task 16's deltas.
- Produces: the teaching sequence the demo shows, asserted on the `beat` events' `qrsMs`.

- [x] **Step 1: Write the test**

`packages/engine-core/test/engine/blood-hyperk.test.ts`:

```ts
// Task 20: succinylcholine in a burned patient → hyperkalaemic ECG → calcium narrows it → insulin–dextrose lowers K.
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '../../src/types.ts';
import { evB, labsAt, MAN, rigB, runTo, st } from '../helpers/blood.ts';

const qrs = (ev: EngineEvent[], t0: number, t1: number) => {
  const b = ev.filter((x): x is Extract<EngineEvent, { type: 'beat' }> => x.type === 'beat' && x.t >= t0 && x.t < t1);
  return b.reduce((a, x) => a + x.qrsMs, 0) / Math.max(1, b.length);
};

describe('7c sanity III — hyperkalaemia after succinylcholine in burns', { timeout: 300_000 }, () => {
  it('K ≈ 7.5–8 at 4 min with a wider QRS; CaCl2 narrows it within 3 min; insulin–dextrose lowers K ≥ 1 by 30 min', async () => {
    const { e, ev } = rigB({ patient: { ...MAN, blood: { burns: 0.5 } } });
    await runTo(e, 60);
    const q0 = qrs(ev, 30, 60);
    e.dispatch(evB({ kind: 'drug', drugId: 'succinylcholine', dose: 100, unit: 'mg', route: 'iv' }));
    await runTo(e, 300);
    const k4 = labsAt(ev, 300).k;
    const q4 = qrs(ev, 280, 300);
    e.dispatch(evB({ kind: 'drug', drugId: 'calciumChloride', dose: 1, unit: 'g', route: 'iv' }));
    await runTo(e, 480);
    const q7 = qrs(ev, 460, 480);
    e.dispatch(evB({ kind: 'drug', drugId: 'insulinDextrose', dose: 10, unit: 'units', route: 'iv' }));
    const kIns = labsAt(ev, 480).k;
    await runTo(e, 2280);
    console.log(`hyperK: K ${k4} at 4 min, QRS ${q0.toFixed(0)} → ${q4.toFixed(0)} → (Ca) ${q7.toFixed(0)} ms; K ${kIns} → ${labsAt(ev, 2280).k} (insulin, 30 min); mods.k ${st(e).mods.k.toFixed(2)}`);
    expect(k4).toBeGreaterThanOrEqual(7.3);
    expect(k4).toBeLessThanOrEqual(8.3);
    expect(q4).toBeGreaterThan(q0 + 10);
    expect(q7).toBeLessThan(q4);
    expect(kIns - labsAt(ev, 2280).k).toBeGreaterThanOrEqual(1);
  });
  it('nebulised salbutamol 10 mg (7g’s bus.metabolic.kShift, one source): K −0.5 to −1.0 at 30 min against a no-dose control (tables §5b.2)', async () => {
    const k30 = async (dose: boolean) => {
      const { e } = rigB({ seed: 5 });
      await runTo(e, 60);
      if (dose) e.dispatch(evB({ kind: 'drug', drugId: 'salbutamol', dose: 10, unit: 'mg', route: 'neb' }));
      await runTo(e, 60 + 1800);
      return { k: st(e).blood.out.k, kShift: st(e).pk.bus.metabolic.kShift }; // truth (the lab panel rounds to 0.1)
    };
    const d = await k30(true);
    const c = await k30(false);
    console.log(`salbutamol neb 10 mg: K ${c.k.toFixed(2)} → ${d.k.toFixed(2)} at 30 min (7g kShift ${d.kShift.toFixed(2)})`);
    expect(c.k - d.k).toBeGreaterThanOrEqual(0.5);
    expect(c.k - d.k).toBeLessThanOrEqual(1.0);
  });
});
```

- [x] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/blood-hyperk.test.ts`
Expected: PASS. Prototype (every drug through 7g's validator and `bus.doses`): **K 7.7 at 4 min; QRS 93 → 126 ms; CaCl2 → 93 ms within 3 min; insulin–dextrose K 7.2 → 4.3 in 30 min** (the sux pulse decays on its own τ 17.5 min while insulin lowers the set point; tables: insulin −0.6 to −1.0 on its own); **salbutamol 10 mg nebulised: K 4.28 → 3.74 (−0.54) at 30 min** against the no-dose control, 7g's kShift −0.78 (tables −0.5 to −1.0; R50 F13). Test-after (sanity task).

- [x] **Step 3: Commit**

```bash
git add packages/engine-core/test/engine/blood-hyperk.test.ts
git commit -m "test(blood): succinylcholine hyperkalaemia, calcium, insulin and salbutamol" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7c-blood
```

### Task 21: Anaemia, COHb/MetHb: SpO2 unchanged by anaemia, oximeter over-reads COHb, MetHb → 85 %

**Files:**
- Create: `packages/engine-core/test/engine/blood-oxygen.test.ts`

**Interfaces:**
- Consumes: `PatientProfile.blood {hb, cohb, methb}`, `pulseOxApparent` (Task 14), the lab panel.
- Produces: tables §1.5 anaemia row ("SpO2 unchanged, DO2 ↓") and smoker/CO row (Q22) checks.

- [x] **Step 1: Write the test**

`packages/engine-core/test/engine/blood-oxygen.test.ts`:

```ts
// Task 21: anaemia and dyshaemoglobins — SpO2 unchanged by anaemia, over-reads with COHb, drifts to 85 % with MetHb.
import { describe, expect, it } from 'vitest';
import { labsAt, MAN, rigB, runTo, st } from '../helpers/blood.ts';

describe('7c oxygen delivery and the oximeter', { timeout: 300_000 }, () => {
  it('Hb 7: SpO2 truth unchanged, DO2 ≈ half, SvO2 lower', async () => {
    const a = rigB();
    const b = rigB({ patient: { ...MAN, blood: { hb: 7 } } });
    await runTo(a.e, 300);
    await runTo(b.e, 300);
    expect(Math.abs(st(a.e).resp.o2.sa - st(b.e).resp.o2.sa)).toBeLessThan(0.01);
    expect(st(b.e).blood.core.o2.do2).toBeLessThan(0.55 * st(a.e).blood.core.o2.do2);
    expect(st(b.e).blood.core.o2.svo2).toBeLessThan(st(a.e).blood.core.o2.svo2 - 0.1);
  });
  it('COHb 25 %: displayed SpO2 ≥ 94 while the co-oximeter SO2 ≤ 75; MetHb 35 %: SpO2 ≈ 85', async () => {
    const c = rigB({ patient: { ...MAN, blood: { cohb: 0.25 } } });
    await runTo(c.e, 120);
    const sp = c.ev.filter((x) => x.type === 'measurement' && x.values.spo2?.value != null).pop();
    const spo2 = sp?.type === 'measurement' ? (sp.values.spo2?.value as number) : 0;
    const lab = labsAt(c.ev, 120);
    console.log(`COHb 25 %: SpO2 ${spo2}, SO2 ${lab.so2}, COHb ${lab.cohb}`);
    expect(spo2).toBeGreaterThanOrEqual(94);
    expect(lab.so2).toBeLessThanOrEqual(75);
    const m = rigB({ patient: { ...MAN, blood: { methb: 0.35 } } });
    await runTo(m.e, 120);
    const sm = m.ev.filter((x) => x.type === 'measurement' && x.values.spo2?.value != null).pop();
    const spm = sm?.type === 'measurement' ? (sm.values.spo2?.value as number) : 0;
    expect(Math.abs(spm - 85)).toBeLessThanOrEqual(3);
  });
});
```

- [x] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/blood-oxygen.test.ts`
Expected: PASS. Prototype: COHb 25 %: displayed SpO2 99 while the co-oximeter SO2 is 74.8 %; MetHb 35 %: SpO2 ≈ 85; Hb 7: SaO2 unchanged, DO2 < 55 %, SvO2 lower — and NO lactate at normal flow (decision 6: regional dependence is a flow criterion). Test-after (sanity task).

- [x] **Step 3: Commit**

```bash
git add packages/engine-core/test/engine/blood-oxygen.test.ts
git commit -m "test(blood): anaemia, COHb and MetHb on the oximeter" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7c-blood
```

### Task 22: Pulse oracle — haemorrhage 20 %, 1 L crystalloid, insulin/glucose, bicarbonate

**Files:**
- Create: `packages/validation/src/oracle/blood-scenarios.ts`, `packages/validation/src/oracle/pulse-node-shim.ts`, `packages/validation/test/oracle-blood.test.ts`
- Create ONLY IF ABSENT (7a Task 26 creates it; the text below is byte-identical to 7a's so a later merge is a clean add/add): `packages/validation/src/oracle/pulse-runner.ts`

**Interfaces:**
- Consumes: `loadPulse(dir, namesPath)` (`pulse-runner.ts`), the spike's `research/pulse-spike/web/{pulse.js,pulse.wasm,pulse.data}` and `research/pulse-spike/bench/drm_names.json` (outside the repo; never committed).
- Produces: `BLOOD_ORACLE` (O2b 20 % haemorrhage, O3b 1 L saline, O10b insulin — glucose stubbed until 7e, O13b bicarbonate), `PULSE_BLOOD` (Pulse data-request names and unit conversions; K via 39.098 g/mol, D14), `compareBloodRow`, `installPulseNodeShim(dir)` (the spike's `pulse.js` is emscripten's WEB build; the shim poses as a Web Worker and serves the wasm/data from disk through `fetch`, so the oracle runs in Node without a rebuild — verified in the prototype: StandardMale loads, pH 7.417, BE +1.55, lactate 14.66 mg/dL = 1.65 mmol/L (D18), K 15.63 mg/dL = 4.0 true mmol/L (D14), Hb 14.96, BV 5491 mL).

- [ ] **Step 1: The runner (only if `packages/validation/src/oracle/pulse-runner.ts` does not exist — on the 7a + 7b + 7g main it DOES exist (7a's Task 26, same exports `loadPulse(dir, namesPath?)`), so skip this step and use it)**

`packages/validation/src/oracle/pulse-runner.ts`:

```ts
// Pulse 4.3.2 wasm as a DIFFERENTIAL-TEST ORACLE (R34; annex §D). Loads the spike's emscripten build in Node, starts
// from the pre-stabilised StandardMale state, steps at 20 ms, and reads the data requests of bench/drm.json by the
// index order of bench/drm_names.json. Never used to set our defaults (audit §4 "validation circularity").
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface PulseHandle {
  step(n: number): void;
  read(): Record<string, number>;
  act(json: string): boolean;
}

export const DRM_NAMES_FALLBACK = [
  'HeartRate(1/min)', 'ArterialPressure(mmHg)', 'SystolicArterialPressure(mmHg)', 'DiastolicArterialPressure(mmHg)', 'MeanArterialPressure(mmHg)',
  'CardiacOutput(L/min)', 'HeartStrokeVolume(mL)', 'SystemicVascularResistance(mmHg_s/mL)', 'CentralVenousPressure(mmHg)', 'MeanCentralVenousPressure(mmHg)',
  'PulmonaryArterialPressure(mmHg)', 'PulmonarySystolicArterialPressure(mmHg)', 'PulmonaryDiastolicArterialPressure(mmHg)', 'PulmonaryCapillariesWedgePressure(mmHg)',
];

export async function loadPulse(dir: string, namesPath?: string): Promise<PulseHandle> {
  const req = createRequire(import.meta.url);
  const createPulse = req(join(dir, 'pulse.js')) as (o: Record<string, unknown>) => Promise<{
    cwrap: (n: string, r: string | null, a: string[]) => (...x: unknown[]) => unknown;
    FS: { readFile: (p: string, o: { encoding: 'utf8' }) => string };
    HEAPF64: Float64Array;
  }>;
  const M = await createPulse({ locateFile: (f: string) => join(dir, f), print: () => {}, printErr: () => {} });
  const c = (n: string, r: string | null, a: string[]) => M.cwrap(n, r, a);
  c('PulseInitialize', null, [])();
  const drm = M.FS.readFile('/bench/drm.json', { encoding: 'utf8' });
  const e = c('Allocate', 'number', ['number', 'string'])(0, '/') as number;
  c('LogToConsole', null, ['number', 'boolean'])(e, false);
  if (!c('SerializeFromFile', 'boolean', ['number', 'string', 'string', 'number'])(e, '/states/StandardMale.json', drm, 0)) throw new Error('Pulse state load failed');
  const Step = c('AdvanceTimeStep', 'boolean', ['number']);
  const Pull = c('PullData', 'number', ['number']);
  const Act = c('ProcessActions', 'boolean', ['number', 'string', 'number']);
  const names: string[] = namesPath ? (JSON.parse(readFileSync(namesPath, 'utf8')) as string[]) : DRM_NAMES_FALLBACK;
  return {
    step: (n) => {
      for (let i = 0; i < n; i++) Step(e);
    },
    read: () => {
      const p = (Pull(e) as number) >> 3;
      const out: Record<string, number> = { t: M.HEAPF64[p] as number };
      names.forEach((nm, i) => (out[nm] = M.HEAPF64[p + 1 + i] as number));
      return out;
    },
    act: (json) => Act(e, json, 0) as boolean,
  };
}
```

- [ ] **Step 2: The shim, the scenarios and the test**

`packages/validation/src/oracle/pulse-node-shim.ts`:

```ts
// Stage 7c: the spike's pulse.js is emscripten's WEB build (no Node file loading: it fetch()es pulse.wasm and
// pulse.data). This shim lets it run in Node without a rebuild: it poses as a Web Worker and serves files under the
// oracle directory from disk through fetch(). Call once before loadPulse(dir). Prototype: StandardMale loads; 60 s
// of simulation take ≈ 21 s wall on the M-series Mac (so the blood oracle is a LOCAL/nightly run, never CI).
import { readFileSync } from 'node:fs';

export function installPulseNodeShim(dir: string): void {
  const g = globalThis as unknown as Record<string, unknown>;
  g.WorkerGlobalScope ??= function WorkerGlobalScope() {};
  g.self ??= globalThis;
  g.location ??= { href: `file://${dir}/pulse.js`, pathname: `${dir}/pulse.js` };
  const real = globalThis.fetch;
  if ((real as unknown as { pulseShim?: boolean }).pulseShim) return;
  const shim = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const u = String(url);
    if (u.startsWith(dir)) {
      const b = readFileSync(u);
      return new Response(b, { status: 200, headers: { 'content-length': String(b.length) } });
    }
    return real(url, init);
  };
  (shim as unknown as { pulseShim: boolean }).pulseShim = true;
  globalThis.fetch = shim as typeof fetch;
}
```

`packages/validation/src/oracle/blood-scenarios.ts`:

```ts
// Stage 7c Pulse oracle scenarios (annex §D O2, O3, O10 + a bicarbonate bolus), blood-chemistry channels only.
// Expected disagreements are ENCODED (annex §C): a Pulse fix then shows up as a failing `expect-differ` row.
// Compare TRUTH (our `labs` event) with Pulse data requests of bench/drm_names.json; K in mg/L (D14).
export type BloodChannel = 'ph' | 'be' | 'lactate' | 'hb' | 'k' | 'na' | 'bv';
export interface BloodOracleRow {
  channel: BloodChannel;
  metric: 'abs' | 'delta';
  tol: number; // relative, of max(1, |pulse|)
  expect: 'agree' | 'expect-differ' | 'exclude';
  note: string;
}
export interface BloodOracleScenario {
  id: 'O2b' | 'O3b' | 'O10b' | 'O13b';
  baselineS: number;
  compareAtS: number;
  pulse: { tS: number; json: string }[];
  ours: { tS: number; event: Record<string, unknown> }[];
  rows: BloodOracleRow[];
}

/** Pulse data-request names (bench/drm_names.json) for each channel, and the conversion to our units. */
export const PULSE_BLOOD: Record<BloodChannel, { key: string; toOurs: (v: number) => number }> = {
  ph: { key: 'BloodPH', toOurs: (v) => v },
  be: { key: 'BaseExcess(mmol/L)', toOurs: (v) => v },
  lactate: { key: 'Lactate-BloodConcentration(mg/dL)', toOurs: (v) => (v * 10) / 89.07 },
  hb: { key: 'Hemoglobin-BloodConcentration(g/dL)', toOurs: (v) => v },
  k: { key: 'Potassium-BloodConcentration(mg/dL)', toOurs: (v) => (v * 10) / 39.098 }, // TRUE mmol/L (D14: never Pulse's 31.1)
  na: { key: 'Sodium-BloodConcentration(mg/dL)', toOurs: (v) => (v * 10) / 22.99 },
  bv: { key: 'BloodVolume(mL)', toOurs: (v) => v },
};

const act = (a: Record<string, unknown>) => JSON.stringify({ AnyAction: [{ PatientAction: a }] });
// Pulse's CDM field is `FlowRate` (the spike used `Severity`); an unknown field makes ProcessActions return false, which
// the test asserts against — Stage 7a's O2 draft used `Flow` (request to 7a).
const bleed = (mlPerMin: number) => act({ Hemorrhage: { Compartment: 'RightLeg', FlowRate: { ScalarVolumePerTime: { Value: mlPerMin, Unit: 'mL/min' } } } });
const saline = act({ SubstanceCompoundInfusion: { SubstanceCompound: 'Saline', BagVolume: { ScalarVolume: { Value: 1000, Unit: 'mL' } }, Rate: { ScalarVolumePerTime: { Value: 33.3, Unit: 'mL/min' } } } });
const bolus = (sub: string, conc: number, unit: string, ml: number) =>
  act({ SubstanceBolus: { AdministrationRoute: 'Intravenous', Substance: sub, Concentration: { ScalarMassPerVolume: { Value: conc, Unit: unit } }, Dose: { ScalarVolume: { Value: ml, Unit: 'mL' } } } });

export const BLOOD_ORACLE: BloodOracleScenario[] = [
  {
    id: 'O2b', baselineS: 60, compareAtS: 60 + 1800,
    pulse: [{ tS: 60, json: bleed(110) }, { tS: 660, json: bleed(0) }],
    ours: [{ tS: 60, event: { kind: 'bleed', volumeMl: 1100, overS: 600 } }],
    rows: [
      { channel: 'bv', metric: 'delta', tol: 0.25, expect: 'agree', note: '−1100 mL less refill' },
      { channel: 'hb', metric: 'delta', tol: 0.5, expect: 'agree', note: 'refill dilution; small numbers' },
      { channel: 'lactate', metric: 'delta', tol: 0.5, expect: 'expect-differ', note: 'D2: Pulse flat (anaerobic only below tissue PO2 40, renal-only clearance)' },
      { channel: 'ph', metric: 'delta', tol: 0.5, expect: 'exclude', note: 'D1/D3 root cause: fixed SID; reported only' },
    ],
  },
  {
    id: 'O3b', baselineS: 60, compareAtS: 60 + 3600,
    pulse: [{ tS: 60, json: saline }],
    ours: [{ tS: 60, event: { kind: 'fluid', fluid: 'saline', volumeMl: 1000, overS: 1800 } }],
    rows: [
      { channel: 'hb', metric: 'delta', tol: 0.5, expect: 'expect-differ', note: 'D10: Pulse retains ≥ 0.6 of the litre (no oncotic source, no lymph) → larger dilution' },
      { channel: 'be', metric: 'delta', tol: 0.5, expect: 'expect-differ', note: 'D3: Cl is not in Pulse’s SID → ΔBE ≈ 0; ours negative' },
      { channel: 'na', metric: 'delta', tol: 1, expect: 'agree', note: 'both near 0 (saline Na 154)' },
    ],
  },
  {
    id: 'O10b', baselineS: 60, compareAtS: 60 + 3600,
    pulse: [{ tS: 60, json: bolus('Insulin', 100, 'ug/mL', 1) }],
    ours: [{ tS: 60, event: { kind: 'drug', drugId: 'insulinDextrose', dose: 10, unit: 'units' } }],
    rows: [
      { channel: 'k', metric: 'delta', tol: 0.5, expect: 'expect-differ', note: 'Pulse has no transcellular K shift (annex §5b.2): ours −0.6 to −1.0; glucose is 7e’s (stub)' },
    ],
  },
  {
    id: 'O13b', baselineS: 60, compareAtS: 60 + 600,
    pulse: [{ tS: 60, json: bolus('Bicarbonate', 84, 'mg/mL', 50) }],
    ours: [{ tS: 60, event: { kind: 'drug', drugId: 'sodiumBicarbonate', dose: 50, unit: 'mmol' } }],
    rows: [
      { channel: 'ph', metric: 'delta', tol: 0.5, expect: 'exclude', note: 'Pulse bolus of the Bicarbonate substance only (no Na): not comparable; reported' },
      { channel: 'na', metric: 'delta', tol: 0.5, expect: 'exclude', note: 'as above' },
    ],
  },
];

/** agree: |ours − pulse| ≤ tol·max(1, |pulse|); expect-differ: must be OUTSIDE (a Pulse fix is then noticed). */
export function compareBloodRow(ours: number, pulse: number, row: BloodOracleRow): 'agree' | 'expect-differ-ok' | 'excluded' | 'fail' {
  if (row.expect === 'exclude') return 'excluded';
  const inside = Math.abs(ours - pulse) <= row.tol * Math.max(1, Math.abs(pulse));
  if (row.expect === 'agree') return inside ? 'agree' : 'fail';
  return inside ? 'fail' : 'expect-differ-ok';
}
```

`packages/validation/test/oracle-blood.test.ts`:

```ts
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { BLOOD_ORACLE, compareBloodRow, PULSE_BLOOD, type BloodChannel } from '../src/oracle/blood-scenarios.ts';
import { installPulseNodeShim } from '../src/oracle/pulse-node-shim.ts';
import { loadPulse } from '../src/oracle/pulse-runner.ts';

describe('blood oracle rules (always run)', () => {
  it('K is compared in true mmol/L (39.098 g/mol), and expect-differ rows fail when the engines agree', () => {
    expect(PULSE_BLOOD.k.toOurs(15.6)).toBeCloseTo(3.99, 2);
    const row = { channel: 'lactate' as const, metric: 'delta' as const, tol: 0.5, expect: 'expect-differ' as const, note: '' };
    expect(compareBloodRow(3, 0.1, row)).toBe('expect-differ-ok');
    expect(compareBloodRow(0.1, 0.1, row)).toBe('fail');
  });
});

const DIR = process.env.PULSE_ORACLE_DIR;
describe.skipIf(!DIR)('Pulse oracle, blood (annex §D; PULSE_ORACLE_DIR=…/research/pulse-spike/web)', () => {
  for (const sc of BLOOD_ORACLE) {
    it(sc.id, async () => {
      installPulseNodeShim(DIR as string);
      const p = await loadPulse(DIR as string, join(DIR as string, '../bench/drm_names.json'));
      const e = createEngine({ seed: 1, patient: { ageY: 44, sex: 'M', weightKg: 77.1, heightCm: 180, baseline: { hr: 72 } } });
      const ev: EngineEvent[] = [];
      e.on((x) => ev.push(x));
      for (const o of sc.ours) e.dispatch({ id: `o${o.tS}`, issuedBy: 'oracle', type: 'applyEvent', event: o.event as never, atTick: o.tS * 50 });
      const pulseAt: Record<number, Record<string, number>> = {};
      const bvAt: Record<number, number> = {};
      const bvOurs = () => {
        const s = e.snapshot().state as { st: { blood: { core: { fl: { vp: number; hbG: number } } } } };
        return s.st.blood.core.fl.vp + 3 * s.st.blood.core.fl.hbG;
      };
      const acts = [...sc.pulse];
      let t = 0;
      for (const at of [sc.baselineS, sc.compareAtS]) {
        while (t < at) {
          while (acts.length && acts[0]!.tS <= t) {
            const a = acts.shift()!;
            expect(p.act(a.json), `Pulse rejected ${a.json}`).toBe(true);
          }
          p.step(50);
          t += 1;
          if (t % 60 === 0) {
            e.advanceTo(t);
            await new Promise((r) => setImmediate(r));
          }
        }
        pulseAt[at] = p.read();
        e.advanceTo(at);
        bvAt[at] = bvOurs();
      }
      const ours = (at: number, ch: BloodChannel): number => {
        const l = ev.filter((x): x is Extract<EngineEvent, { type: 'labs' }> => x.type === 'labs' && x.t <= at).pop();
        if (!l) return Number.NaN;
        const v = l.values;
        return ch === 'bv' ? (bvAt[at] as number) : v[ch]; // BV is not in the panel: from the snapshot
      };
      for (const row of sc.rows) {
        const pk = PULSE_BLOOD[row.channel];
        const pv = (at: number) => pk.toOurs(pulseAt[at]![pk.key]!);
        const o = row.metric === 'abs' ? ours(sc.compareAtS, row.channel) : ours(sc.compareAtS, row.channel) - ours(sc.baselineS, row.channel);
        const q = row.metric === 'abs' ? pv(sc.compareAtS) : pv(sc.compareAtS) - pv(sc.baselineS);
        const verdict = compareBloodRow(o, q, row);
        console.log(`${sc.id} ${row.channel} ${row.metric}: ours ${o.toFixed(2)} pulse ${q.toFixed(2)} → ${verdict} (${row.note})`);
        expect(verdict).not.toBe('fail');
      }
    }, 3_600_000);
  }
});
```

- [ ] **Step 3: Run without the wasm (CI) and with it (local)**

`npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/oracle-blood.test.ts` → 1 passed (the rules test), 4 skipped.
`PULSE_ORACLE_DIR=/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/research/pulse-spike/web npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/oracle-blood.test.ts` → every row prints `agree`, `expect-differ-ok` or `excluded`. It is SLOW (prototype: 60 s simulated ≈ 21 s wall; the four scenarios ≈ 45–60 min): run it once, in the background, and paste the printed rows into the gate note. A `fail` on an `agree` row is a FINDING for the gate note, not a reason to retune our model (audit §4 "validation circularity"). If Pulse rejects an action (`act` returns false: e.g. no `Bicarbonate` substance bolus in its whitelist), mark that scenario's rows `exclude` with the reason — do not invent a substitute action.

**Oracle result (prototype, 2026-09-26, Pulse 4.3.2 wasm in Node via the shim; ≈ 37 min wall for the four):**

| Row | Ours | Pulse | Verdict |
|---|---|---|---|
| O2b ΔBV (1100 mL over 10 min, at 30 min) | −956 mL | −988 mL | agree |
| O2b ΔHb | −0.50 | −0.36 | agree |
| O2b Δlactate | +0.90 | +0.06 | expect-differ-ok (D2) |
| O2b ΔpH | −0.05 | 0.00 | excluded (D1/D3) |
| O3b ΔHb (1 L saline over 30 min, at 60 min) | −0.70 | −2.48 | expect-differ-ok (D10: Pulse retains far more of the litre) |
| O3b ΔBE | −1.10 | −0.01 | expect-differ-ok (D3) |
| O3b ΔNa | +2.00 → **+0.30 after the fix below** | +0.88 | FAIL → agree |
| O10b ΔK (insulin 10 U, 60 min) | −0.90 | −0.11 | expect-differ-ok (no transcellular K in Pulse) |
| O13b ΔpH / ΔNa (bicarbonate) | −0.03 / −2.00 | 0.00 / +1.63 | excluded (Pulse's `Bicarbonate` bolus has no Na; ours at 10 min is dominated by the CO2 rise and the saline-like dilution of a 50 mL bolus — reported only) |

The O3b Na **fail** was a real 7c defect the oracle caught: elimination removed pure water, so every infusion concentrated Na. `core.ts` now removes the eliminated volume at the ECF composition (isotonic; 7d replaces it with the urine composition): Na +0.30 after 1 L saline (awake and GA), Cl +2.6, BE −1.6 (awake) / −1.1 (GA). The code in Tasks 5 and 9 above already contains the fix; the numbers of the engine sanity tasks were re-measured with it (Tasks 18–21 state them). Pulse's `Hemorrhage` field is `FlowRate` (7a's draft `Flow` is rejected — see Requests).


- [ ] **Step 4: Commit**

```bash
git add packages/validation/src/oracle/blood-scenarios.ts packages/validation/src/oracle/pulse-node-shim.ts packages/validation/test/oracle-blood.test.ts
git commit -m "test(validation): Pulse blood oracle scenarios and the Node shim" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7c-blood
```

### Task 23: CPU budget, determinism, 24 h no-drift

**Files:**
- Create: `packages/engine-core/test/engine/blood-budget.test.ts`

**Interfaces:**
- Consumes: `createBloodState`, `advanceBlood`, the engine.
- Produces: the CPU, determinism and drift rows of the gate note. Test-after (measurement task).

- [x] **Step 1: Write the test**

`packages/engine-core/test/engine/blood-budget.test.ts`:

```ts
// Task 23: CPU budget, determinism and 24 h no-drift with the blood in the engine.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { advanceBlood, createBloodState } from '../../src/l2/blood/pipeline.ts';
import { evB, labsAt, rigB, runTo, st } from '../helpers/blood.ts';

describe('7c budget, determinism, 24 h', { timeout: 300_000 }, () => {
  it('the blood step costs ≤ 0.1 ms per 20 ms tick', () => {
    const { e } = rigB();
    e.advanceTo(10);
    const s = st(e);
    const bs = createBloodState({ ageY: 40, sex: 'M', weightKg: 70, heightCm: 175 });
    const hemo = {};
    const t0 = performance.now();
    advanceBlood(bs, { resp: s.resp, hemo, l1: s.l1 as never }, 3600);
    const perTick = (performance.now() - t0) / (3600 * 50);
    console.log(`blood CPU per tick ${perTick.toFixed(5)} ms`);
    expect(perTick).toBeLessThan(0.1);
  });
  it('same seed + script → identical labs stream; the chemistry hash is stable', async () => {
    const run = async () => {
      const { e, ev } = rigB({ seed: 3 });
      await runTo(e, 60);
      e.dispatch(evB({ kind: 'bleed', volumeMl: 1000, overS: 300 }));
      e.dispatch(evB({ kind: 'drug', drugId: 'sodiumBicarbonate', dose: 50, unit: 'mmol', route: 'iv' }));
      await runTo(e, 600);
      return createHash('sha256').update(JSON.stringify(ev.filter((x) => x.type === 'labs'))).digest('hex');
    };
    expect(await run()).toBe(await run());
  });
  it('24 h at rest (blood stepped against a steady Stage 3 state, yielding hourly): no drift after settling', async () => {
    const { e } = rigB();
    await runTo(e, 600);
    const s = st(e);
    const bs = createBloodState({ ageY: 40, sex: 'M', weightKg: 70, heightCm: 175 });
    advanceBlood(bs, { resp: s.resp, hemo: {}, l1: s.l1 as never }, 600 + 3 * 3600); // settle to THIS PaCO2 (K shift τ 43 min)
    const a = { ...bs.core.out, ph: bs.core.ab.ph, hco3: bs.core.ab.hco3 };
    for (let h = 4; h <= 24; h++) {
      advanceBlood(bs, { resp: s.resp, hemo: {}, l1: s.l1 as never }, 600 + h * 3600);
      await new Promise((r) => setImmediate(r));
    }
    const b = bs.core;
    expect(Math.abs(b.ab.ph - a.ph)).toBeLessThanOrEqual(0.005);
    expect(Math.abs(b.ab.hco3 - a.hco3)).toBeLessThanOrEqual(0.05);
    expect(Math.abs(b.out.k - a.k)).toBeLessThanOrEqual(0.02);
    expect(Math.abs(b.out.na - a.na)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(b.out.lactate - a.lactate)).toBeLessThanOrEqual(0.02);
    expect(Math.abs(b.out.hb - a.hb)).toBeLessThanOrEqual(0.02);
    expect(bs.k).toBe(Math.floor((600 + 24 * 3600) * 10) + 1);
  });
});
```

- [x] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/blood-budget.test.ts`
Expected: PASS. Prototype: blood CPU **0.0005–0.0013 ms per 20 ms tick** (budget 0.1; the pH bisection is 14 iterations + a 1 Hz second solve); identical `labs` hash for the same seed and script; 24 h at a steady PaCO2: no drift in pH (< 0.005), HCO3, K, Na, lactate, Hb. The ENGINE's 24 h run with the blood inside is Stage 3's `test/engine/resp-longrun.test.ts` (it now carries the blood; it must still pass unchanged — an engine-level 24 h blood test exceeded the 300 s CI budget in the prototype, so this task steps the blood directly).

- [x] **Step 3: Commit**

```bash
git add packages/engine-core/test/engine/blood-budget.test.ts
git commit -m "test(blood): CPU budget, determinism and 24 h drift" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7c-blood
```

### Task 24: Lab panel widget and demo page `stage7c.html`

**Files:**
- Create: `packages/renderer/src/lab-panel.ts`, `packages/renderer/test/lab-panel.test.ts`, `apps/demo/stage7c.html`, `apps/demo/src/stage7c.ts`, `apps/demo/scripts/stage7c-shots.mjs`
- Modify: `packages/renderer/src/index.ts` (1 line), `apps/demo/vite.config.ts` (1 line), `apps/demo/index.html` (1 line)

**Interfaces:**
- Consumes: `LabPanel` (Task 1), `mountMonitor` (`pm.on`, `pm.dispatch`, `pm.setTimeScale`), the `labs`/`labResult` events (forwarded from the worker like every engine event).
- Produces: `LAB_ROWS`, `labFlag(row, v)`, `mountLabPanel(el) → update(values, title)`; the demo page with four stories: haemorrhage → ABG at 30 min → 4 unwarmed RBC + 1 L RL → ABG; 2 L saline vs Plasma-Lyte vs Ringer's; succinylcholine in burns (`?burns=1`) → CaCl2 at 4 min → insulin–dextrose at 7 min; NaHCO3 50 mmol (EtCO2 transient).

- [ ] **Step 1: Write the failing widget test**

`packages/renderer/test/lab-panel.test.ts`:

```ts
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { LAB_ROWS, labFlag, mountLabPanel } from '../src/lab-panel.ts';

const V = { ph: 7.21, pco2: 40, po2: 95, hco3: 15.6, be: -11, so2: 97, cohb: 0, methb: 0, lactate: 6.1, na: 140, k: 6.2, cl: 104, iCa: 1.2, mg: 0.85, hb: 12, glucose: 100, ag: 20, osm: 290 };

describe('lab panel widget', () => {
  it('flags values outside the reference range', () => {
    const k = LAB_ROWS.find((r) => r.key === 'k')!;
    expect(labFlag(k, 6.2)).toBe('high');
    expect(labFlag(k, 4.2)).toBe('ok');
    const el = document.createElement('div');
    mountLabPanel(el)(V, 'ABG');
    expect(el.querySelectorAll('tr').length).toBe(LAB_ROWS.length);
    expect(el.querySelector('tr.high')?.textContent).toContain('↑');
    expect(el.textContent).toContain('ABG');
  });
});
```

Run: `npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run test/lab-panel.test.ts` → FAIL (module missing). (If the renderer's vitest config has no happy-dom, check `packages/renderer/package.json` devDependencies: happy-dom is N-009 and used by the controller; add it to the renderer's devDependencies with the same version if missing.)

- [ ] **Step 2: Implement the widget**

`packages/renderer/src/lab-panel.ts`:

```ts
// Stage 7c: the lab / ABG panel (a DOM widget, like numerics-dom.ts). Shows the latest `labs` truth (or a frozen
// `labResult`), each value flagged against its reference range (tables §5b normal rows).
import type { LabPanel } from '@pme/engine-core';

type Row = { key: keyof LabPanel; label: string; unit: string; lo: number; hi: number };
export const LAB_ROWS: readonly Row[] = [
  { key: 'ph', label: 'pH', unit: '', lo: 7.35, hi: 7.45 },
  { key: 'pco2', label: 'PCO2', unit: 'mmHg', lo: 35, hi: 45 },
  { key: 'po2', label: 'PO2', unit: 'mmHg', lo: 80, hi: 500 },
  { key: 'hco3', label: 'HCO3', unit: 'mmol/L', lo: 22, hi: 26 },
  { key: 'be', label: 'BE', unit: 'mmol/L', lo: -2, hi: 2 },
  { key: 'so2', label: 'SO2', unit: '%', lo: 94, hi: 100 },
  { key: 'cohb', label: 'COHb', unit: '%', lo: 0, hi: 3 },
  { key: 'methb', label: 'MetHb', unit: '%', lo: 0, hi: 1.5 },
  { key: 'lactate', label: 'Lactate', unit: 'mmol/L', lo: 0.3, hi: 2 },
  { key: 'na', label: 'Na', unit: 'mmol/L', lo: 135, hi: 145 },
  { key: 'k', label: 'K', unit: 'mmol/L', lo: 3.5, hi: 5 },
  { key: 'cl', label: 'Cl', unit: 'mmol/L', lo: 98, hi: 107 },
  { key: 'iCa', label: 'iCa', unit: 'mmol/L', lo: 1.15, hi: 1.33 },
  { key: 'hb', label: 'Hb', unit: 'g/dL', lo: 12, hi: 17 },
  { key: 'glucose', label: 'Glucose', unit: 'mg/dL', lo: 70, hi: 180 },
  { key: 'ag', label: 'AG', unit: 'mmol/L', lo: 8, hi: 16 },
];

export function labFlag(r: Row, v: number): 'low' | 'high' | 'ok' {
  return v < r.lo ? 'low' : v > r.hi ? 'high' : 'ok';
}

/** Mount a panel into `el`; returns `update(values, title)`. */
export function mountLabPanel(el: HTMLElement): (values: LabPanel, title: string) => void {
  el.classList.add('pme-lab-panel');
  return (values, title) => {
    const rows = LAB_ROWS.map((r) => {
      const v = values[r.key];
      const f = labFlag(r, v);
      const mark = f === 'high' ? ' ↑' : f === 'low' ? ' ↓' : '';
      return `<tr class="${f}"><th>${r.label}</th><td>${v}${mark}</td><td>${r.unit}</td></tr>`;
    }).join('');
    el.innerHTML = `<table><caption>${title}</caption>${rows}</table>`;
  };
}
```

Append to `packages/renderer/src/index.ts`:

```ts
export { LAB_ROWS, labFlag, mountLabPanel } from './lab-panel.ts'; // Stage 7c
```

Run the widget test → PASS.

- [ ] **Step 3: The demo page**

`apps/demo/stage7c.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stage 7c: blood, acid–base and electrolytes</title>
    <style>
      body { background: #000; color: #ccc; font: 14px system-ui, sans-serif; margin: 12px; }
      .wrap { display: flex; gap: 12px; align-items: flex-start; }
      #monitor { height: 600px; width: 900px; border: 1px solid #333; }
      .pme-lab-panel table { border-collapse: collapse; font: 13px ui-monospace, monospace; min-width: 230px; }
      .pme-lab-panel caption { color: #888; text-align: left; padding-bottom: 4px; }
      .pme-lab-panel th { text-align: left; color: #aaa; font-weight: normal; padding: 1px 8px 1px 0; }
      .pme-lab-panel td { padding: 1px 6px; }
      .pme-lab-panel tr.high td, .pme-lab-panel tr.low td { color: #ff5c5c; }
      .controls { display: flex; flex-wrap: wrap; gap: 10px 18px; margin: 10px 0; max-width: 1400px; }
      fieldset { border: 1px solid #333; padding: 6px 10px; }
      legend { color: #888; }
      button, select { font: inherit; }
      #log { font: 13px ui-monospace, monospace; white-space: pre; color: #8f8; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div id="monitor"></div>
      <div id="labs"></div>
      <div id="abg"></div>
    </div>
    <div class="controls">
      <fieldset><legend>Stories</legend>
        <button id="storyBleed">Haemorrhage → transfusion</button>
        <select id="fluid"><option value="saline">0.9 % saline</option><option value="balanced">Plasma-Lyte</option><option value="rl">Ringer's lactate</option></select>
        <button id="storySaline">2 L crystalloid</button>
        <button id="storySux">Sux in burns → Ca → insulin</button>
        <button id="storyBicarb">NaHCO3 50 mmol</button>
      </fieldset>
      <fieldset><legend>Lab</legend><button id="sendAbg">Send ABG</button></fieldset>
      <fieldset><legend>Speed</legend>
        <select id="speed"><option value="1">×1</option><option value="2">×2</option><option value="4">×4</option></select>
      </fieldset>
    </div>
    <div id="log"></div>
    <script type="module" src="./src/stage7c.ts"></script>
  </body>
</html>
```

`apps/demo/src/stage7c.ts`:

```ts
// Stage 7c demo: blood, acid–base, electrolytes and O2 delivery. Monitor + a live lab panel (`labs`, 1 Hz truth) and a
// "send ABG" result panel (`labResult`, 120 s turnaround); four scripted teaching stories (plan Task 24).
import type { Command, EngineEvent } from '@pme/engine-core';
import { mountLabPanel, mountMonitor } from '@pme/renderer';

type CommandBody = Command extends infer C ? (C extends Command ? Omit<C, 'id' | 'issuedBy'> : never) : never;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const params = new URLSearchParams(location.search);
const burns = params.get('burns') === '1';
const pm = mountMonitor($('monitor'), {
  skin: 'philips-like',
  engine: {
    seed: 7,
    patient: { ageY: 40, weightKg: 70, heightCm: 175, sex: 'M', blood: burns ? { burns: 0.5 } : {}, sensors: { abp: 'connected', spo2: 'on', co2: 'on', temp: 'on' } },
  },
  lanes: ['ecgII', 'V5'],
  waves: ['abp', 'pleth', 'co2'],
  temp: true,
});
let n = 0;
const send = (c: CommandBody) =>
  pm.dispatch({ id: `demo-${++n}`, issuedBy: 'stage7c', ...c } as Command).then((r) => {
    if (!r.accepted) console.warn('rejected', c, r.reason);
    return r;
  });
const ev = (event: Record<string, unknown>) => send({ type: 'applyEvent', event } as CommandBody);
const live = mountLabPanel($('labs'));
const abg = mountLabPanel($('abg'));
let simT = 0;
const log: string[] = [];
const note = (s: string) => {
  log.push(`${Math.round(simT)} s  ${s}`);
  $('log').textContent = log.slice(-12).join('\n');
};
pm.on((e: EngineEvent) => {
  if (e.type === 'labs') {
    simT = e.t;
    live(e.values, `Live chemistry (truth) — t ${Math.round(e.t)} s`);
  }
  if (e.type === 'labResult') abg(e.values, `${e.panel.toUpperCase()} drawn at ${Math.round(e.drawnAt)} s, resulted ${Math.round(e.t)} s`);
});
const at = (delayS: number, fn: () => void) => {
  const t0 = simT;
  const h = pm.on((e) => {
    if (e.type === 'labs' && e.t >= t0 + delayS) {
      h();
      fn();
    }
  });
};

// always-available actions
$('sendAbg').addEventListener('click', () => void ev({ kind: 'lab', panel: 'abg' }).then(() => note('ABG sent (result in 2 min)')));
$('speed').addEventListener('change', () => pm.setTimeScale(Number($<HTMLSelectElement>('speed').value)));
const vent = () => ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 });
void ev({ kind: 'thermal', anaesthesia: 'general' });
void vent();

// 1. haemorrhage → transfusion → labs
$('storyBleed').addEventListener('click', () => {
  pm.setTimeScale(4);
  void ev({ kind: 'bleed', volumeMl: 1750, overS: 600 });
  note('class III haemorrhage: 1750 mL over 10 min');
  at(1800, () => {
    void ev({ kind: 'lab', panel: 'abg' });
    note('ABG at 30 min (lactate should be 3–5)');
  });
  at(2400, () => {
    void ev({ kind: 'transfusion', product: 'rbc', units: 4, overS: 1200 });
    void ev({ kind: 'fluid', fluid: 'rl', volumeMl: 1000, overS: 1200 });
    note('4 RBC (unwarmed) + 1 L Ringer’s lactate over 20 min');
  });
  at(6000, () => void ev({ kind: 'lab', panel: 'abg' }));
});
// 2. saline vs balanced
$('storySaline').addEventListener('click', () => {
  pm.setTimeScale(4);
  void ev({ kind: 'fluid', fluid: $<HTMLSelectElement>('fluid').value, volumeMl: 2000, overS: 1800 });
  note(`2 L ${$<HTMLSelectElement>('fluid').value} over 30 min — watch Cl and BE`);
  at(3600, () => void ev({ kind: 'lab', panel: 'abg' }));
});
// 3. hyperkalaemia after succinylcholine in a burned patient (reload with ?burns=1)
$('storySux').addEventListener('click', () => {
  if (!burns) {
    location.search = '?burns=1';
    return;
  }
  void ev({ kind: 'drug', drugId: 'succinylcholine', dose: 100, unit: 'mg', route: 'iv' });
  note('succinylcholine 100 mg (burns): watch the T waves and QRS in II/V5');
  at(240, () => {
    void ev({ kind: 'drug', drugId: 'calciumChloride', dose: 1, unit: 'g', route: 'iv' });
    note('CaCl2 1 g: the ECG narrows within 1–3 min; K unchanged');
  });
  at(420, () => {
    void ev({ kind: 'drug', drugId: 'insulinDextrose', dose: 10, unit: 'units', route: 'iv' });
    note('insulin 10 U + dextrose: K falls over 30–60 min');
  });
});
// 4. bicarbonate EtCO2 transient
$('storyBicarb').addEventListener('click', () => {
  void ev({ kind: 'drug', drugId: 'sodiumBicarbonate', dose: 50, unit: 'mmol', route: 'iv' });
  note('NaHCO3 50 mmol at fixed ventilation: EtCO2 rises ≈ 5 mmHg within 2 min');
});
```

In `apps/demo/vite.config.ts` find `        'vent-link': page('vent-link'), // Stage V` and add below it `        stage7c: page('stage7c'), // Stage 7c`. In `apps/demo/index.html` add below the Stage 3 link:
`      <li><a href="./stage7c.html">Stage 7c: blood, acid–base, electrolytes, O2 delivery (labs, ABG)</a></li>`

- [ ] **Step 4: Screenshots script**

`apps/demo/scripts/stage7c-shots.mjs`:

```js
// Gate 7c screenshots (headless system Chrome). Usage: (cd apps/demo && npx vite preview --port 4817 --strictPort &) then
//   node apps/demo/scripts/stage7c-shots.mjs http://localhost:4817 docs/gates/stage-7c
import { chromium } from '@playwright/test';

const [base = 'http://localhost:4817', out = 'docs/gates/stage-7c'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1420, height: 760 } });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
const wait = (s) => p.waitForTimeout(s * 1000);
const shot = (name) => p.screenshot({ path: `${out}/${name}.png`, clip: { x: 0, y: 0, width: 1420, height: 640 }, type: 'png' });
await p.goto(`${base}/stage7c.html`);
await wait(12);
await shot('baseline');
await p.click('#storyBleed'); // ×4: 30 sim-min ≈ 7.5 min wall
await wait(460);
await shot('haemorrhage-30min'); // live panel: lactate 3–5, BE falling; ABG sent
await wait(160);
await shot('haemorrhage-abg'); // ABG result panel filled
await p.goto(`${base}/stage7c.html?burns=1`);
await wait(12);
await p.click('#storySux');
await wait(240);
await shot('hyperk-sux'); // K ≈ 7.7, wide QRS / peaked T in II and V5
await wait(120);
await shot('hyperk-calcium'); // QRS narrower after CaCl2
await p.goto(`${base}/stage7c.html`);
await wait(12);
await p.selectOption('#fluid', 'saline');
await p.click('#storySaline');
await wait(900); // 60 sim-min at ×4
await shot('saline-2L'); // Cl ↑ BE ↓
if (errors.length) console.error('page errors:', errors);
await b.close();
```

- [ ] **Step 5: Build, run the page, take the screenshots**

`npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 build` → exit 0 (prototype: demo build OK, `stage7c` chunk emitted). Then `(cd apps/demo && npx vite preview --port 4817 --strictPort &)` and `node apps/demo/scripts/stage7c-shots.mjs http://localhost:4817 docs/gates/stage-7c` (≈ 35 min wall; system Chrome headless — never the desktop Browser pane, which throttles rAF). Open each PNG and check: the live panel shows lactate and BE moving; the ABG panel shows the draw time and a 120 s later result time; the ECG in the hyperkalaemia shot is visibly wider/peaked; no page errors. Keep PNGs ≤ 60 KB (crop or reduce the viewport if not).

- [ ] **Step 6: Commit**

```bash
git add packages/renderer/src/lab-panel.ts packages/renderer/test/lab-panel.test.ts packages/renderer/src/index.ts apps/demo/stage7c.html apps/demo/src/stage7c.ts apps/demo/scripts/stage7c-shots.mjs apps/demo/vite.config.ts apps/demo/index.html docs/gates/stage-7c/*.png
git commit -m "feat(demo): lab panel widget and the stage7c demo with gate screenshots" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7c-blood
```

### Task 25: NOTICES rows, Apache headers, licence text

**Files:**
- Modify: `NOTICES.md`
- Create: `LICENSES/Apache-2.0.txt` (absent on the 7a + 7b + 7g main), `packages/engine-core/test/l2/blood/headers.test.ts`

**Interfaces:**
- Produces: one NOTICES row per ported module (R34) in the Pulse-derived table, `N-P##` scheme (R51 addendum 14): **N-P08** Figge/Stewart (`acid-base.ts`), **N-P09** Dash–Bassingthwaighte with the CO coupling as ported (`odc.ts`), **N-P23** tissue-fluid topology + Landis–Pappenheimer (`fluids.ts`). ICRP-89's hepatic share (`params.ts HBF_FRAC`) reuses 7a's **N-P10**; the Pulse oracle reuses **N-062**; the Kitware/BioGears NOTICE paragraph is already there (7a). If N-P23 is taken on `origin/main` when you merge, take the next free N-P id and update `fluids.ts`'s header to match (the header test reads it). No `N-1xx` rows (7c's N-100…N-104 range stays unused: no dataset rows).

- [ ] **Step 1: Header test**

`packages/engine-core/test/l2/blood/headers.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = join(import.meta.dirname, '../../../src/l2/blood');
const NOTICES = readFileSync(join(import.meta.dirname, '../../../../../NOTICES.md'), 'utf8');

describe('R34: ported files carry the Apache header and a NOTICES row', () => {
  for (const f of ['odc.ts', 'acid-base.ts', 'fluids.ts']) {
    it(f, () => {
      const head = readFileSync(join(DIR, f), 'utf8').slice(0, 1500);
      expect(head.startsWith('// SPDX-License-Identifier: Apache-2.0')).toBe(true);
      expect(head).toContain('Pulse Physiology Engine 4.3.2 (commit e8a3649)');
      expect(head).toContain('Kitware, Inc.');
      expect(head).toContain('BioGears 6.1.1');
      const id = /NOTICES (N-P\d{2})/.exec(head)?.[1]; // R51 addendum 14: Pulse-derived rows use N-P##
      expect(id).toBeDefined();
      expect(NOTICES).toMatch(new RegExp(`^\\|\\s*${id}\\s*\\|`, 'm'));
    });
  }
  it('no Pulse molar-mass defect: K is 39.098', () => {
    expect(readFileSync(join(DIR, 'params.ts'), 'utf8')).toContain('k: 39.098');
    for (const f of ['params.ts', 'solutes.ts', 'labs.ts']) expect(readFileSync(join(DIR, f), 'utf8')).not.toMatch(/k:\s*31\.1/);
  });
});
```

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/headers.test.ts` → FAIL (no NOTICES rows yet).

- [ ] **Step 2: NOTICES rows**

Insert these three rows into the Pulse-derived table of `NOTICES.md` (the one headed `| ID | Item | Source | Licence class | How used | Added on |`), directly after the `| N-P16 |` row (7a's; anchor by content):

```md
| N-P08 | Figge/Stewart charge balance (albumin 0.123·pH − 0.631 per g/L, phosphate 0.309·pH − 0.469 per mmol/L) and the base-excess relation — `packages/engine-core/src/l2/blood/acid-base.ts` | Derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), Saturation.cpp 60–120 and BloodChemistryModel.cpp 217, Copyright 2018-2025 Kitware, Inc. and Contributors, a fork of BioGears 6.1.1 (Copyright 2015 Applied Research Associates, Inc.); primary: Figge, Mydosh & Fencl, J Lab Clin Med 1992;120:713; Apache License 2.0 (`LICENSES/Apache-2.0.txt`) | derived (Apache header in the file) | Equation set re-expressed for one arterial pool; SID recomputed every step from Na, K, iCa, Mg, Cl, lactate, ketoacids, acetate and unmeasured anions (Pulse: fixed 40.5); albumin/phosphate from the blood state (Pulse: 45 g/L hard-coded); Hb buffer added; bounded bisection on pH ∈ [6.5, 7.9], no error sink | 2026-09-27 |
| N-P09 | Dash–Bassingthwaighte O2 dissociation with pH, PCO2, temperature and 2,3-DPG shifts and the CO coupling (P50 = 26.8 − 20·S_CO, n = 2.7 − 1.1·S_CO) — `packages/engine-core/src/l2/blood/odc.ts` | Derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), Saturation.cpp 931–1053, Copyright 2018-2025 Kitware, Inc. and Contributors, a fork of BioGears 6.1.1; primary: Dash & Bassingthwaighte, Ann Biomed Eng 2004;32:1676 (erratum 2010;38:1683); Dash, Korman & Bassingthwaighte, Eur J Appl Physiol 2016;116:97; Apache License 2.0 | derived (Apache header in the file) | Closed-form Hill curve replacing Stage 3's Severinghaus/Kelman curve; no per-compartment Newton solve; CO coupling as in Pulse | 2026-09-27 |
| N-P23 | Tissue-fluid topology (vascular → transcapillary resistance → interstitium with compliance → lymph) and the Landis–Pappenheimer oncotic relation — `packages/engine-core/src/l2/blood/fluids.ts` | Derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), SetupCircuitsAndCompartments.cpp 2085–2865 and RenalModel.cpp 1634–1640, Copyright 2018-2025 Kitware, Inc. and Contributors, a fork of BioGears 6.1.1; Apache License 2.0 | derived (Apache header in the file) | Collapsed to one whole-body plasma ↔ interstitium exchange; colloid-osmotic source switched ON and lymph return added (both 0 in Pulse); constants fitted to Hahn's crystalloid kinetics. ICRP-89 hepatic share (`HBF_FRAC` 0.255 in `blood/params.ts`) is N-P10's data, reused | 2026-09-27 |
```
(Replace `2026-09-27` with the commit date. Keep the table's six-column format; `scripts/check-notices.ts` only governs `N-###` rows of vendored files, so the header test below is what enforces these.)

- [ ] **Step 3: Licence text**

On the 7a + 7b + 7g main `LICENSES/` holds only `fast-uri-3.1.8.txt`: `cp node_modules/typescript/LICENSE.txt LICENSES/Apache-2.0.txt` (TypeScript ships the verbatim Apache License 2.0; check the first line reads "Apache License" / "Version 2.0, January 2004"). If another stage added an Apache-2.0 text meanwhile, point the rows at it instead.

- [ ] **Step 4: Run**

`npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/headers.test.ts` → PASS; `npx -y pnpm@9.15.9 check-notices` → OK.

- [ ] **Step 5: Commit**

```bash
git add NOTICES.md LICENSES/Apache-2.0.txt packages/engine-core/test/l2/blood/headers.test.ts
git commit -m "docs(notices): Stage 7c Pulse-derived rows N-P08, N-P09, N-P23 and the Apache-2.0 text" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7c-blood
```

### Task 26: Gate note, plan ticked, PR

**Files:**
- Create: `docs/gates/stage-7c.md`
- Modify: `docs/plans/stage-7c-blood.md` (ticks)

- [ ] **Step 1: Full gate run**

`npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices && PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 test:e2e` → all exit 0. If a Stage 2/5 timing test times out, re-run it alone and compare with a `main`-only run (Task 15 note) before concluding. Do NOT run the full suite while the Pulse oracle (Task 22) is running: in the prototype, a full run in parallel with the oracle failed seven wall-clock-sensitive Stage 1/2/3 tests (rate sweep, NIBP ×2, Clock, two determinism/tone tests) that pass on an idle machine.

- [ ] **Step 2: Write `docs/gates/stage-7c.md`**

Same shape as `docs/gates/stage-3.md`: the gate question ("Does the blood reproduce the tables' acid–base, electrolyte, fluid and O2-delivery behaviour — dynamic SID, bounded pH, lactate in shock, hyperchloraemia, hyperkalaemia with its ECG and treatments — observing 7g's drug doses with one K-shift source, feeding the ODC to 7b's mixing point — without moving any Stage 3/7a/7b/7g acceptance number out of its band except the six recorded ones, within 0.1 ms per tick?"); a Check | Result table with every number printed by Tasks 9, 12, 15, 17–23 (ODC points, solver iterations, respiratory compensation slopes, 1 L crystalloid retention, class III lactate/BE/Hb, transfusion, massive transfusion K/iCa/core temperature, saline vs balanced Cl/BE, DKA AG, hyperventilation pH, bicarbonate ΔEtCO2 curve, untreated VF lactate/pH/BE, hyperkalaemia K/QRS/Ca/insulin, salbutamol K at 30 min, COHb/MetHb SpO2 vs SO2, anaemia DO2, Stage 3/7b desaturation and OLV re-check, CPU per tick, determinism hash, 24 h drift, oracle rows with their D-numbers); a "Sibling tests recorded as `it.fails` (R45)" table (Task 15's six, with the numbers you measured and the ruling each needs); the Deviations list from this plan (still-open ones marked for Ali's R44 pass: Q25, Q41, Q42, Q44, Q45, Q46, Q47, the D3/ATLS/D1 BE items and the 0.2 per mmHg alkalosis slope); the screenshots; "Requests to other stages" (copy the plan's list, updated with what 7d/7e/7f expose if they merged meanwhile).

- [ ] **Step 3: Tick the plan, commit, push, open the PR**

```bash
git add docs/gates/stage-7c.md docs/plans/stage-7c-blood.md
git commit -m "docs: Stage 7c gate note; plan ticked" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7c-blood
gh pr create --base main --head stage-7c-blood --title "Stage 7c: blood — fluids, acid–base (dynamic SID), electrolytes, O2 delivery, labs" --body "$(cat <<'BODY'
Implements docs/plans/stage-7c-blood.md (R32 7c; R34 ports from Pulse 4.3.2 with Apache headers and NOTICES N-P08/N-P09/N-P23; R40 borrows #5, #6, #7; R51: observes 7g's dose log). Gate evidence: docs/gates/stage-7c.md.

- Plasma / interstitium / cell compartments with Starling exchange, oncotic pressure, lymph and elimination fitted to Hahn; haemorrhage, crystalloids, colloid, blood products, cold units.
- Figge/Stewart acid–base with a DYNAMIC SID and a bounded pH bisection (never an error sink); HCO3, BE, AG; Hb buffer.
- Na/K/Cl/iCa/Mg with transcellular K (Na/K-ATPase term), citrate; the drug chemistry (succinylcholine, insulin–dextrose, calcium, bicarbonate, magnesium, hypertonic saline) OBSERVED from 7g's `bus.doses`, the β2/insulin K shift from `bus.metabolic.kShift` only; K and iCa reach the ECG as Modifiers deltas.
- Dash–Bassingthwaighte ODC replaces Severinghaus in Stage 3 and reaches 7b's mixing point (exception E-7c-1); DO2/VO2 with global + demand-normalised regional supply dependence; lactate production/clearance.
- `labs` 1 Hz event and "send ABG/VBG" with a 120 s turnaround; lab panel widget; stage7c.html demo.
- Published `ps.blood.out` (hbfRel, albuminGL, bvRel, lactate, …) and the 7d renal/liver seams; 7a's circuit gets the volume events, `ext.kChem` and CO0 from `ref.co`; lung water → 7b's EVLWI key; Pulse oracle (local, Node shim for the web wasm).
- Six sibling tests recorded as `it.fails` with their numbers (7a ×1, 7b ×2, 7g ×3 incl. the phenylephrine rows) — rulings requested in the gate note.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

Do NOT merge (R21: the orchestrator merges after inspecting the gate).

---

## Self-review (done while writing; redone for the R50 fixes)

- **Scope coverage.** Scope 1 (fluid compartments, crystalloid τ/retention, colloid, blood, haemorrhage, transfusion with Hb/K/citrate/Ca, oncotic pressure → the lung-water seam for 7b, stressed volume → 7a) → Tasks 2, 5, 6, 10, 11. Scope 2 (Dash–Bassingthwaighte with pH/PCO2/T/CO/DPG; Figge/Stewart with dynamic SID; albumin and phosphate as state; bounded 1-D pH search; HCO3/BE/AG; respiratory coupling to Stage 3's PaCO2; lactate from oxygen debt with the liver hook; ketoacids/mineral acid as inputs; saline hyperchloraemia; bicarbonate with the EtCO2 transient) → Tasks 3, 4, 6–9, 11, 13, 14, 19. Scope 3 (Na water balance/TURP via glycine osmoles and the osmotic cell shift; K with transfusion, sux, insulin, salbutamol, acidosis shift, renal seam; ECG and contractility/arrhythmia hooks; iCa with citrate/pH/albumin, QT and contractility; Mg with the TdP hook; K 39.098) → Tasks 2, 5–7, 9–11, 16, 20, 25. Scope 4 (CaO2, DO2, VO2, O2ER, critical DO2, Hb from volume/RBC mass, anaemia/transfusion, COHb/MetHb on the SpO2 display) → Tasks 3, 8, 13, 14, 21. Scope 5 (lab panel, 1 Hz `labs`, send-ABG with turnaround, demo with the four stories) → Tasks 11, 12, 15, 24. Scope 6 (oracle) → Task 22. Scope 7 (sanity; pH within 6.5–7.9 always; determinism; CPU; 24 h; Stage 3/7b re-check) → Tasks 3, 4, 9, 17–23, 25. Headers/NOTICES/licence → Tasks 3–5, 25. Branch/worktree/push/PR → Tasks 1, 26.
- **R50 fixes → where.** F1 (7g owns drugs; observer) decision 11, Task 11 (`pkBus`, `observeDoses`, fallback handler), Tasks 15, 16, 19, 20, 23, 24 dispatch drugs through 7g (`route` given), the Requests; F2 (one K-shift source) decision 18, Tasks 9/11 (`kShiftExt`); F3 (`kChem` unconditional) Task 10; F4 (CO0 from `ref.co`; fallback test; lactate re-derived) decisions 6/10, Tasks 11, 15, 18; F5 (7a ids; 7a suites; write-back timing) decision 11, Tasks 11, 15 (the 1 µs event end, exact bolus volumes, the one `it.fails`); F6 (anchors) Tasks 1, 15; F7 (ODC through 7b, E-7c-1, 7b suites, re-derived desaturation) Global Constraints, decision 15, Tasks 13, 14, 17; F8 (`metabolic(rs, t, 'o2')`) decision 22, Task 11; F9 (`out` block, renal seam, lung water, 7b field names) decisions 19–21, Tasks 9–11, the Requests; F10 (NOTICES ids — superseded by R51 addendum 14: N-P08/N-P09/N-P23) Global Constraints, Tasks 3–5, 25, 26; F11 (restore guard) Task 15; F12 (concrete commits) every task; F13 (pH bracket, salbutamol test, alkalosis slope, D3 bands, iCa rule, sux+insulin double effect removed) decisions 1, 2, 7, 8, Tasks 4, 7, 9, 19, 20. R51 addendum 14 (names, `core.renal` shape, `core.liver` function only, hypertonic saline from the dose log, N-P scheme) decisions 11, 19, 20, Tasks 2, 9, 11, 25.
- **Not covered, by design:** a dedicated TURP scenario test (the glycine composition and the osmotic cell shift are unit-tested in Task 5; the full TURP scenario with the neurological effects needs 7d's brain); Winter's compensation (7f); glucose (7e); renal K/Na handling (7d fills the seam); mannitol's osmotic load (7d's ICP effect; not observed by 7c).
- **Plan reproducibility (checked).** The R50 prototype was built by extracting every created file of this plan into a 7a + 7b + 7g tree and applying every find/replace block; the code blocks now in this file were copied back FROM that tree after the full suite passed (207 files / 891 tests, 1 skipped), so plan text and tested code are identical. Then the plan was REBUILT from its text alone on a fresh worktree of the same base (`../scratch/proto-7c-verify`): 43 created files, all 51 find/replace blocks matched exactly once, plus the prose edits of Tasks 13, 14, 24, 25; the only difference from the prototype was the ORDER of three `types.ts` lines (the plan anchors after the Stage 3 lines); `typecheck` clean, `check-notices` OK, `build` emits `stage7c.html`, and the full engine-core suite gave the same 207 files / 891 passed / 1 skipped with identical printed numbers.
- **Prototype boundary.** Every code block in Tasks 1–25 ran on the 7a + 7b + 7g tree, including the engine wiring and the sibling-test records; un-run on that tree: the Playwright screenshots, the e2e suite and the four wasm oracle scenarios (the oracle's Node loading and its numbers are from the first prototype).
- **Type consistency.** `BloodView` is declared in `resp/pipeline.ts` (Task 11) and consumed by `blood/pipeline.ts` (Task 11) and the gas step (Task 14); `BloodState.events` is `EngineEvent[]` so the engine's `flush` accepts it, and `BloodState.out` is `BloodOut` (Task 9) — the block 7g's `pkCtx` already reads (`blood.out.hbfRel`); `O2Inputs.odc?` (Task 13) is filled by `o2Inputs(…, blood)` and `GasInputs.odc?`/`O2LungInputs.odc?` (Task 14) by `x.odc`; `bloodEcgTargets` (Task 11) returns deltas relative to the profile K (`so.set.k`) and 0 ms, matching the engine's `blood.ecg` start value `{k: 0, qtc: 0}`; `o2Delivery` takes `co0Lpm` and `demandRel` (Task 8) and `core.ts` passes `bc.co0` and `x.demandRel ?? vo2Demand/vo2Rest` (Task 9); `stepSolutes(…, clearF, kUptake)` (Task 6) gets `hbfRel·liver` and `1 + K_PUMP_GAIN·|drug shift|` (Task 9); `resolveLung(…, evlwiAdd)` (Task 11) gets `rs.evlwiExtra` from `applyLungSpecs`, written by `advanceBlood`.
- **Risks left for the executor:** a concurrent 7f/7d/7e merge moves the engine and `types.ts` anchors — the chain order in the Global Constraints decides where the blood lines go; the child desaturation time sits exactly on its band edge (130.0 s); the six sibling `it.fails` records need orchestrator rulings — if a sibling stage fixes its rig meanwhile, its record flips to a "passing `it.fails`" failure: then restore that `it` (the band holds again) and say so in the gate note.
