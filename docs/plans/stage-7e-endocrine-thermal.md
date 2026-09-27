# Stage 7e: Whole-body physiology — endocrine stress response, glucose–insulin, thyroid, thermoregulation (incl. MH), system conditions and metabolic scaling — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the engine an endocrine and thermal body: a proper heat balance (Pulse-style environment terms with consistent units, forced air, a physical IV-fluid term fed by Stage 7c, respiratory loss) around Stage 3's two-compartment core/periphery model, with anaesthetic-depth-dependent vasoconstriction/shivering/sweating thresholds, fever as a set-point shift, emergence shivering, malignant hyperthermia whose dantrolene response is Stage 7g's drug effect, the hypothermia cascade hooks and VO2/VCO2 scaling; a stress-hormone system (neural sympathetic stress, endogenous plasma epinephrine/norepinephrine with Pulse's basal concentrations and clearance, cortisol) driven by nociception, hypotension, hypoxia, hypercapnia, hypoglycaemia and MH, blunted by anaesthesia and β-blockade (7a's profile, 7g's drugs), acting on HR/SVR/contractility/venous tone, glucose, the endogenous K shift and insulin sensitivity; a Bergman minimal glucose–insulin model with Pulse's insulin secretion line fed by 7g's dextrose/insulin doses and infusions, meals, diabetic profiles and 7c's DKA severity; thyroid profiles and thyroid storm; system conditions (sepsis SIRS → warm → cold, anaphylaxis Ring–Messmer with epinephrine mast-cell stabilisation, SIRS, hypermetabolic) as a shared interface with 7f; a 1 Hz `endo` event (glucose for the labs panel, an instructor-only stress index); and a `stage7e.html` demo (MH crisis with dantrolene, hypothermia under GA with warming, sepsis warm → cold, diabetic hypoglycaemia under GA).

**Architecture:** Two new module trees. `packages/engine-core/src/l2/thermal/**` takes over Stage 3's heat model (`l2/temp/temp.ts` becomes a re-export shim so every Stage 3 importer and test is unchanged): `params.ts`, `thresholds.ts` (pure threshold/effector functions), `environment.ts` (pure radiation/convection/evaporation/respiratory/forced-air/IV terms and the `ivInflow` reader of 7c's lines), `mh.ts` (MH activity; dantrolene's effect arrives from 7g), `heat.ts` (the `ThermalState` superset of Stage 3's `TempState`, 1 Hz step, MANUAL `setCoreTarget`, snapshot upgrade), `metabolic.ts` (VO2/VCO2 factors, the temperature HR term and the hypothermia cascade). `packages/engine-core/src/l2/endo/**` holds `params.ts`, `hormones.ts`, `effects.ts`, `glucose.ts`, `thyroid.ts`, `conditions.ts`, `core.ts` (one engine-independent 1 Hz step → `EndoOut`), `adapters.ts` (duck-typed reads of 7a `hemo.circ`, 7c `blood`, 7d `organs`, 7f `neuro`, 7g `pk`, and the writes into their seams) and `pipeline.ts` (`EndoState`, `advanceEndo`, command hooks, the `endo` event). The engine calls `advanceEndo` in every advance pass after 7c's `advanceBlood` and before 7d's organs and the haemodynamics (R51 addendum 14); the thermal state stays inside Stage 3's `RespState.temp` (the same object, now a `ThermalState`); Stage 3/7c's exported `metabolic(rs, t, gas)` reads the thermal VO2/VCO2 factors and the endocrine rate. The endocrine effects reach the circulation through 7a's existing `circ.ext.endo*` keys in MODELED mode, or an HR factor on the rhythm clock (sinus family only) in MANUAL; 7c through `blood.core.{endoKShift, endoGlucoseMgDl}` and `fl.kfMult`; 7g through `ps.cond.vasoResp`; 7b through its `lungCondition anaphylaxis`; the ECG through temperature/shivering modifier DELTAS (7c decision 9 pattern). 7e owns NO drug ids (R51 §3).

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2, Vite 6.4, Canvas 2D; Playwright (system Chrome) for screenshots. No runtime dependencies.

**Spec:** `../research/00-orchestrator-rulings.md` R32 (7e scope), R34 (port from Pulse where stronger; Apache headers; one NOTICES row per ported module), R37, R39 item 7 (GA temperature course −0.9 °C at 30 min, −1.3 at 60 min, then ≈ −0.4 °C/h; warmed −0.9), R44, **R45** (mechanism, not a looser test; a miss stays `it.fails` with its number), R48 (this plan's first version), R50 (its review: verdict INCOMPLETE, fixes F1–F12 applied here), **R51 §1–§7 and addenda 1–16** (7g owns every drug; `bus.doses`; chain order; canonical names — addendum 16 lists 7e's), G7a, G7b, G7g (incl. NR-7g-5), G7x (the physiology console's `INTERNAL_PREFIXES`/SKIP follow-up), the CI rule amendments 1–2 (`LONGRUN_HOURS`, the SLOW set). `docs/physiology/stage-7-parameter-tables.md` §5c (stress, cortisol, Bergman, thyroid, thresholds awake/GA, shivering, fever, hypothermia stages), §5.3 (`q10`, `clearTemp`, `mh`, `dantrolene`), §5e (sepsis, anaphylaxis, SIRS, hyperthermia), §7 checks 16 and 21, §9 Q41–Q49, Q55–Q56. `docs/physiology/pulse-parameter-annex.md` §5c/§5.3 rows and **B3** (7e porting brief). `../research/pulse-audit/02-drugs-energy-architecture.md` §5. `../research/09-evidence-rulings.md` §7. Sibling plans for names: `docs/plans/stage-7c-blood.md`, `stage-7d-organs.md`, `stage-7f-neuro-depth.md`, `stage-7g-pkpd.md` (merged), `fu-2-engine-followups.md` (`SINUS_FAMILY`). House style `docs/plans/stage-3-respiratory-gas.md`; runbook `docs/RESUME.md`.

## Global Constraints

- Paths are relative to `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo`; run every command from the worktree. **Base: `origin/main` after Stage 7c AND 7d merged** (main then carries 7a, 7b, 7g, 7x, FU-2, 7c, 7d). This plan was prototyped on `origin/main` `06e6481` (7a + 7b + 7g) merged with `origin/stage-7c-blood` (tasks 1–5 at the time) plus the rest of the fixed 7c plan's code built from its text (the 7c plan fixer's prototype), with a local stub of FU-2's `SINUS_FAMILY`; 7d's names come from the fixed 7d plan (7e reads `organs.liver.glucoseF` duck-typed). **Re-verified 2026-09-27 on the real 7c code:** `origin/main` `355b6d7` merged with `origin/stage-7c-blood` `bef0b28` — every anchor this plan names in a shared file (types, index, engine, resp pipeline, 7c `pipeline`/`labs`/`core`, 7g `pk/pipeline`, the SLOW list, the demo config, 7c's cold-unit test, 7x's `organs.ts`/`truth.ts`) occurs exactly once; every name 7e reads from 7c/7g exists (`blood.out.dkaSeverity`, `blood.core.fl.kfMult`, `bus.metabolic.dantroleneE`, `bus.airway.bronchodilation`, `betaBlockAdd`, 7g's read of `ps.cond.vasoResp`); the 7e unit tests of Tasks 2–11 pass 70/70 (thermal 26, endo 38, Stage 3 `test/l2/temp` 6 unchanged). The engine-level numbers in *Prototype results* were measured on the first base (7c built from its plan text) and are re-measured by the executor from Task 12 Step 5 on. **Before every task:** `git fetch origin && git merge --no-edit origin/main`, then re-run the task's tests. **Before every `engine.ts` edit merge `origin/main` again** (R51 §7) and place each insert by the chain order below, not by the literal neighbouring line when a later stage moved it.
- **Chain order (R51 §7, addendum 14):** validate/apply **device → pk (7g) → neuro (7f) → organs (7d) → blood (7c) → endo (7e) → Stage 3 → hemo**; advance per pass **pk → resp/lung → blood → endo → organs → hemo** (7d inserts just before `advanceHemo`; 7e goes after 7c's `advanceBlood`/`pushBloodEcg` and before 7d's line).
- **Branch and PR (R20/R21):** branch `stage-7e-endocrine-thermal` in the worktree `../scratch/wt-stage-7e` (Task 1 creates both from `origin/main`). **Push after every task** (`git push origin stage-7e-endocrine-thermal`). The last task opens the PR with `gh pr create`. Never push to `main`, never merge.
- **CI rule (amendments 1–2):** the CI runner has 2 vCPUs. Any test that runs the engine for more than ~1 simulated minute yields once per simulated minute (`run()` in `test/helpers/resp.ts` does) and sets an explicit timeout. Long-run engine tests use `LONGRUN_HOURS`/`expectedIndex` from `test/helpers/longrun.ts` (24 h locally, 6 h on CI). Multi-sim-hour/long-scenario files join the SLOW list in `packages/engine-core/vite.config.ts` (Tasks 14–15; `*longrun*` is already in it). Any e2e that runs > ~2 min of scenarios skips WebKit with a comment (G7g/G7x).
- **Partition (binding).** This stage OWNS `packages/engine-core/src/l2/thermal/**`, `src/l2/endo/**`, `src/types-endo.ts`, `test/l2/thermal/**`, `test/l2/endo/**`, `test/engine/endo-*.test.ts`, `packages/renderer/src/endo-panel.ts`, `packages/renderer/test/endo-panel.test.ts`, `apps/demo/{stage7e.html,src/stage7e.ts,scripts/stage7e-shots.mjs,e2e/stage7e.e2e.ts}`, `docs/gates/stage-7e*`. Additive one-line edits marked `// Stage 7e`: `src/types.ts`, `src/index.ts`, `src/engine.ts`, `packages/renderer/src/index.ts`, `apps/demo/vite.config.ts`, `apps/demo/index.html`, `packages/engine-core/vite.config.ts` (SLOW), `NOTICES.md`, and (Task 19, 7x follow-up) `apps/demo/src/physiology-console/organs.ts` + the `SKIP_PATH` line of `src/truth.ts`. **Declared exceptions:** **E1** — `src/l2/temp/temp.ts` becomes a re-export shim (Stage 3 file); **E2** — `src/l2/resp/pipeline.ts`: the Stage 3 temperature import, the body of the exported `metabolic(rs, t, gas = 'co2')` (signature and `export` kept: 7c imports it), `o2Inputs`'s `vo2` argument and the ventilation → heat-model lines before `stepTemp`; **E-7e-1** (R51 addendum 16) — 7c's cold-unit line in `src/l2/blood/pipeline.ts` becomes the physical IV heat term (+ one import); **E-7e-2** — 7c's lab-panel glucose placeholder in `src/l2/blood/labs.ts`; **E-7e-3** — one additive term on 7c's `const drug =` K line in `src/l2/blood/core.ts` (the endogenous K shift: "7c takes both", F8); **E-7e-4** — one line in 7g's `setRate` in `src/l2/pk/pipeline.ts` (the ordered rate is recorded for gamma rows too, so `ps.pk.drugs.<id>.rate` carries the insulin/dextrose infusions); **E-7e-5** — re-specifications of other stages' tests that 7e changes for a stated reason (Task 13 Step 6: 7c's cold-unit unit test; any other sibling test only with a stated reason in the gate note). **Never edit** `src/l2/ecg/**`, `src/l2/hemo/**`, `src/l2/circ/**` (7a already multiplies `endoSvrF/endoEesF/endoHrF/endoDV0Frac` and 7g blunts HR/Ees there — 7e writes the keys and touches no line of `model.ts`; FU-2's `dv0Beta` term on the `v0Sv` line is irrelevant to 7e), `packages/skins/**`, `packages/audio/**`, the Stage 3 test files.
- Stage 0–3 constraints apply: strict TS with `noUncheckedIndexedAccess` and `erasableSyntaxOnly` (no enums, no parameter properties); `.ts` import extensions; conventional commits; every equation cites the tables/annex/research section, or `[ENG]` with the prototype number it was tuned to.
- **Porting rule (R34):** `hormones.ts` (Pulse epinephrine/norepinephrine basal concentrations and clearance), `glucose.ts` (Pulse insulin secretion line), `thresholds.ts` and `environment.ts` (Pulse summit shivering, sweat gain, radiation/convection forms) start with the Apache header of annex §E (the exact text is in each file below); every other file is ours (MIT, no header). Two NOTICES rows N-P17/N-P18 (Task 19) with ACCURATE claims (the circuit's heat capacities and the 2/3 core split are Stage 3's, not Pulse's; 7e uses Pulse's basal plasma CONCENTRATIONS, not its release rates). None of the audit's energy defects may appear.
- **Drugs (R51 §1–§3, addendum 16):** 7e owns NO drug ids and validates no `drug`/`infusion` event. Boluses come from `ps.pk.bus.doses` (each listed for exactly one engine pass; 7e observes it every pass): dextrose (7g amount unit mg), insulin (units). Infusions from `ps.pk.drugs.<id>.rate` (amount/min). Dantrolene = `bus.metabolic.dantroleneE`. Exogenous epinephrine = `bus.agents.epinephrine.brain` (rate-equivalent µg/kg/min) → its β2 mast-cell stabilisation and metabolic effects only (never its HR/SVR: 7g's). `bus.metabolic.glucoseDelta` is ignored (7e owns glucose); `bus.metabolic.kShift` is 7g's exogenous K term, which 7c already takes — 7e's K term is ENDOGENOUS only. Fallbacks apply only when `ps.pk` is absent (unit rigs: no doses, dantrolene effect 0).
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (use your harness's attribution line if it gives a different one).
- pnpm is not on PATH: use `npx -y pnpm@9.15.9`. Unit tests: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run <path>`. Full run: `npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices`; e2e `PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 test:e2e`. Run heavy suites ALONE on the machine.
- Rates: endocrine and heat at **1 Hz** on Stage 3's grid; the `endo` event at 1 Hz; dose observation every engine pass. CPU budget: the whole 7e work ≤ **0.05 ms per 20 ms engine tick** (prototype: 4 µs per simulated second = 0.08 µs per tick).
- Every Stage 3 and Stage 3.1 thermal test must stay green UNCHANGED: `test/l2/temp/temp.test.ts` (6) and the thermal tests in `test/engine/resp-coupling.test.ts` (R39-7, MH). They must also stay green after 7f lands: the thermoregulatory depth is max(7f's `thermoDepth`, the Stage 3 `thermal { anaesthesia }` flag's depth).

## Decisions this plan makes where the spec was silent, inconsistent or physically unreachable

1. **Stage 3's heat model is kept as the core and generalised, not replaced.** Its k_cp form under GA is algebraically the new vasomotor form at depth 1 (`k0·(0.5 + 2.5·f)`, `f` = logistic around the vasoconstriction threshold), so redistribution, the linear phase and the plateau are Stage 3's numbers. Awake, the tone at 36.8 °C is fixed at `f = 0.2` (threshold 36.9 °C, width 0.1/ln 4 = 0.072 °C), which reproduces Stage 3's awake conductance — thermoregulation now exists awake (a fever is a set-point shift that produces vasoconstriction and rigors) without moving any Stage 3 number.
2. **The environment is physical but CALIBRATED.** Dry loss = BSA·exposed·(Tp − Ta)/(R_ins + 1/(h_r + h_c)), h_r = 4εσ·0.73·T̄³, h_c = 10.3·v^0.6 (Pulse forms with consistent units, fixing the audit's "area/h" defect); respiratory loss = VE·[ρc·(34 − Ta) + λ·(sat(34) − RH·sat(Ta))] on the CORE; skin insensible evaporation 10 W. The insulation R_ins is solved at creation so the awake patient at 21 °C loses exactly Stage 3's heat at a resting ventilation of 0.1 L/min/kg (the prototype found a fixed 7 L/min mis-calibrated a 16 kg child). Every later change acts through the physical terms.
3. **No Q10 on the heat balance.** Applying 7.5 %/°C to metabolic heat moved the GA plateau to 34.43–34.49 °C (Stage 3 band 34.5–35.5). Q10 stays on VO2/VCO2 (`tempFactor`). Q-7e-1.
4. **Neuraxial uses sedated thresholds** (depth 1): with awake thresholds, shivering at 36.0 °C stops the neuraxial core falling, breaking Stage 3's "no plateau" test. Q-7e-2.
5. **Forced air has a warm-up lag** (τ 30 min): constant power cannot meet both R39-7 (warmed nadir −0.9 °C) and Stage 3's "+0.5–1 °C/h in hour 3". Q-7e-3.
6. **MH heat × 9 (m0 × 8 extra), VO2 × 2.5 / VCO2 × 3, sweating capped at 150 W (draped skin).** With sweating now present under GA, Stage 3's × 5 heat gave < 1 °C per 15 min; × 9 gives core +1.17 °C at 15 min at engine level (tables §7 check 21: +1 °C by 15 min). VCO2 stays × 3 (EtCO2 < 150 mmHg). MH muscle K efflux is an ENDOGENOUS kSet term (+2.2 mmol/L at activity 1; with 7c's acidosis term K 6.0 at 20 min, tables 5.5–6.5). Q-7e-4.
7. **Dantrolene is Stage 7g's drug; 7e maps its effect onto the MH activity (re-fitted to 7g's curve, R51 addendum 16).** 7g publishes `bus.metabolic.dantroleneE` = C/(C + 1), C in 2.5 mg/kg reference doses on a gamma curve (90 % of its peak within 1 min, t10 6 h): 2.5 mg/kg → E ≈ 0.5, 5 → 0.67. The unsuppressed fraction relaxes toward max(0, 1 − 1.6·E) with τ 10 min (tables "VCO2 excess decays τ 10–20 min"): 2.5 mg/kg → floor 0.2, 5 mg/kg → 0 ("repeat to response"). Engine (fixed MV): EtCO2 turns **6.0 min** after the dose (band 5–10 ✓). **HR normal by 15–20 min is NOT met**: with dantrolene + doubled MV the HR is 121 at +20 min because the core is 39.8 °C (fever term × 1.27) and PaCO2 is still high — the tables' "HR normal" assumes active cooling, which 7e does not model; the test stays `it.fails` with the number and is reported (Q-7e-5). A stronger/faster mapping (gain 2) brings the HR only to 106 and moves the EtCO2 turn to 3.5 min (out of band), so it was rejected.
8. **Stress response = a fast NEURAL path + ENDOGENOUS humoral catecholamines + slow cortisol.** `symp` (τ on 25 s / off 180 s) acts on HR/SVR/contractility/venous V0 directly; endogenous epinephrine (Pulse basal 34 pg/mL and clearance over Vd 0.2 L/kg → t½ 2.0 min) adds β1/β2/α effects; cortisol follows surgical stress with τ 1.5 h (> 1500 nmol/L from 4 h: tables "> 1500, peak 4–6 h"; the first version's τ 2.5 h reached only 1465 at 5 h). Neural HR gain 0.18 so the whole stimulus response is +24.8 % (tables +15–25 %). The profile β-blockade is 7a's (`prof.betaBlock` for HR, `prof.betaBlockC` for contractility); drug β-blockade is applied by 7a/7g (`betaBlunt`). Catecholamine responsiveness (`vasoResp`: septic hyporesponsiveness × cortisol's permissive effect) scales the stress EXCESS, not the condition rows.
9. **Fever tachycardia is not a β effect (R51 addendum 16, F4).** `EndoOut.feverHrF` = +12 %/°C above 37.5 °C (tables "+8–10 bpm/°C" = 11–13 % at 75 bpm) and hypothermic bradycardia below 35. MODELED: 7e writes `ext.endoHrF = preBlunt(betaBlunt(stress, b) × feverHrF, b)` with b = 7g's `betaBlockAdd`, so that 7a's own `betaBlunt(endoHrF, b)` yields exactly `betaBlunt(stress, b) × feverHrF` — a β-blocked febrile patient keeps the fever tachycardia. MANUAL: the rhythm-clock factor is `betaBlunt(stress × condition rows, b) × feverHrFExcess` (the conditions' HR rows already contain their fever tachycardia, so only the core above their set-point shift counts: the first prototype counted it twice, HR 153).
10. **Antinociception and depth.** Without 7f, or while 7g has no active agent, the Stage 3 GA flag gives antinociception 0.6 × depth (Q-7e-6); 7f's `ps.neuro.antinoc` is used only while 7g has an agent acting (R51 addendum 16). The thermoregulatory depth is max(7f's `thermoDepth`, the flag's depth).
11. **Glucose: Bergman disposal with Pulse's secretion shape, two slow additions** (insulinopenic hepatic output τ 3 h × up to 3; two-stage gut, 70 % bioavailability). The exogenous part of plasma insulin is tracked (`iExo`) so the K term sees SECRETED insulin only. Counter-regulation below 70 mg/dL. Type 2 = fasting 144 with SI × 0.3; type 1 = β-cell 0 on long-acting basal insulin (130 mg/dL).
12. **DKA is 7c's condition.** 7c consumes `condition { id: 'dka' }` and publishes `blood.out.dkaSeverity` (0–1, R51 addendum 16); 7e reads it (fallback: 7c's ketoacid pool ÷ 25 mmol/L) and turns it into β-cell loss, SI × 0.5 and EGP × 2 → glucose > 250 mg/dL within 2 h. 7e writes nothing back (no ketone drive: the first version's circular `ketoDrive` is gone).
13. **System conditions live in 7e with a shared interface for 7f.** `conditions.ts` exports `ConditionEffects` and `combine()`; sepsis is a CONTINUOUS stage (1 SIRS … 4 cold) smoothed with the event's `rampS`; anaphylaxis is a mediator state (grade = 4 × mediator) whose release EXOGENOUS (7g) epinephrine's β2 effect suppresses (mast-cell stabilisation; endogenous epinephrine does not — it would abort every anaphylaxis). Rows within the tables: warm SVR × 0.4, cold × 1.0, warm HR row 1.3, anaphylaxis III SVR × 0.3 / V0 +20 %. Sepsis's leak multiplier goes to 7c's `fl.kfMult`; 7c's σ is left alone (no tables value). The lactate/erMax/shunt seams of the first version are dropped (R50 F10): 7c's lactate emerges from the O2 demand 7e raises.
14. **Circulation seam (F2/F3).** MODELED (`ctx.l1.mode === 'modeled' && ext`): 7e writes `ext.endoHrF/endoSvrF/endoEesF/endoDV0Frac` — never by testing whether the key exists (7a's initialiser omits optional keys, so an `in` test never fires). 7a's `endoDV0Frac` is a fraction of the base unstressed volume, POSITIVE = venoconstriction; 7e's `dV0Frac` is + fraction of blood volume into the unstressed pool, so `endoDV0Frac = −dV0Frac·BV/base.v0Sv`. In MODELED the conditions' HR rows are NOT applied: their reflex tachycardia emerges from 7a's baroreflex (applying both gave HR 176). MANUAL: the four keys are held neutral (7a's MANUAL tracker would fight them), BP stays the instructor's and only the HR factor acts, on the rhythm clock and only for sinus-family rhythms (FU-2's `SINUS_FAMILY`, NR-7g-5), unless the instructor pinned `hr`. At rest every factor is EXACTLY 1.
15. **Other seams.** 7c: `blood.core.endoKShift` (E-7e-3), `blood.core.endoGlucoseMgDl` (E-7e-2), `fl.kfMult`; 7g: `ps.cond.vasoResp` (mirrors `endo.core.out.vasoResp`); 7b: anaphylaxis bronchospasm drives `lungCondition anaphylaxis` (7b's grades I–V = severity 0.2–1; 7e writes 0.8 × mediator × (1 − 0.6 × β2 bronchodilation incl. 7g's `bus.airway.bronchodilation`), re-resolved at ≥ 0.02 steps); 7d: `organs.liver.glucoseF` × hepatic glucose output, and 7d reads `endo.core.cond.sepsis.cur`.
16. **Commands.** 7e OWNS `applyEvent` kinds `stimulus` (R51 addendum 12: `{ kind: 'stimulus', intensity: 0–2 }`, the one shape — 7f observes it), `meal`, `thermal7e` (exposure, air speed, fluid warmer, HME) and the `condition` ids `sepsis | anaphylaxis | sirs | hypermetabolic | thyroidStorm`. Its validator runs after 7c's and before Stage 3's; it returns `null` for everything else (every drug, `mh`, `dka`). Stage 3's `thermal` event and `mh` condition are unchanged. IV fluids are 7c's `fluid`/`transfusion` events: 7c writes `rs.temp.iv` (E-7e-1), so the first version's `thermal7e { ivMlPerMin, ivTempC }` is gone.
17. **Thyroid storm is hypermetabolism with a moderate set-point shift.** A pure set-point jump (+3.2 °C, first version) produced 30 min of rigors (VO2 × 3.5) and VO2 × 2.1 at 40 °C; with VO2 × 1.4 and set point +1.8 °C the storm reaches core 38.6 °C, VO2 × 1.57 (with Q10), HR × 1.8, SVR × 0.6 at 2 h (tables: T 38.5–41, VO2 × 1.3–1.8, SVR × 0.6, HR 110–150).
18. **Labs.** The 1 Hz `endo` event carries glucose (mg/dL and mmol/L), insulin, total epinephrine, norepinephrine, cortisol, the stress index (instructor-only), MH activity and the thermoregulatory flags. 7c's lab panel reads 7e's glucose (E-7e-2).

## Prototype results

Prototyped in `../scratch/proto-7e` (git worktree of `origin/main` `06e6481` = 7a + 7b + 7g, merged with `origin/stage-7c-blood` and completed with the rest of the fixed 7c plan's code, plus a stub of FU-2's `SINUS_FAMILY`), with every file of this plan byte-identical to the code blocks below. Unit tests of Tasks 2–11 and the re-specified 7c unit test: **78 passing** (thermal 26, Stage 3 `test/l2/temp` 6 unchanged, endo 38, 7c pipeline 8). Engine tests: `endo-wiring` 4, `endo-seams` 5, `endo-acceptance` 6 + 1 `it.fails`, `endo-circ-acceptance` 2 + 5 `it.fails`, `endo-longrun` 3 (6 h CI horizon). Whole engine-core suite with `CI=1`: **974 passed, 1 skipped, 3 failed** — the three are the known items of Task 12 Step 5 on that first base (child desaturation at 7c's band edge; a 7g `it.fails` phenylephrine row that flipped in its then-hypercapnic rig — on the real 7c branch that rig runs at RR 20, normocapnic, and the row is already `it`, so only the desaturation item is expected). Workspace typecheck clean; demo build clean; `stage7e.e2e.ts` passes in system Chrome (2.3 min).

| Check | Result (prototype) | Band |
|---|---|---|
| GA, unwarmed, 70 kg, 21 °C (heat model) | −0.93 °C at 30 min, −1.25 at 60, −0.38 in hour 2 | R39-7 ✓ |
| Forced air from induction | nadir −0.90 °C, hour-3 +0.81 °C/h | R39-7 / Stage 3 ✓ |
| MH at engine level (GA, RR 12 fixed) | EtCO2 40/48/63/84/102 at 0/5/10/15/20 min; core **+1.17 °C at 15 min**; HR 75 → 141 at 20 min; **K 6.0 at 20 min** | §7 21: ≥ 60 by 10 min, +3–5 mmHg/min, +1 °C by 15 min, HR +30–50, K 5.5–6.5 ✓ |
| MH + dantrolene 2.5 mg/kg at 20 min (7g), fixed MV | EtCO2 peak 110 at **+6.0 min** | §7 21: turns 5–10 min ✓ |
| … + MV × 2 at the dose | HR 129/**121** at +15/+20 min, core 39.8 °C | "HR normal by 15–20" ✗ → `it.fails`, Q-7e-5 |
| Stimulus 1.0 awake (MANUAL) | HR **+24.8 %**; onset/offset fractions in band; GA flag halves it | §5c +15–25 % ✓ |
| Cortisol, surgery under GA | > 1500 nmol/L from 4 h | §5c > 1500 at 4–6 h ✓ |
| Glucose through 7g | D50 25 g > 250 at once, < 130 by 60 min; insulin 4 U/h < 70 by 2 h; lab panel = 7e | ✓ |
| Type 1 + insulin 20 U/h under GA | glucose 55 mg/dL, HR 75 → 103 (× 1.37) | [ENG] ≥ × 1.2 ✓ |
| Warm sepsis, MANUAL, awake | HR 120, core 38.76 °C, glucose 167 | §5e HR 110–130 ✓ |
| Warm sepsis, MODELED, GA + ventilator (60 min) | MAP **61**, HR **131**, CO **5.0**, SVR **866** | §7 16: 55–60 / 115–130 / 7–9 / 500–700 ✗ → `it.fails` ×4, Q-7e-7 |
| Cold sepsis (+60 min) | CO **3.8** ✓, SVR **1510** | §7 16: CO 3–4 ✓, SVR 1200–1500 ✗ → `it.fails` |
| Anaphylaxis III, MODELED | MAP 94 → 62 at 10 min; 2 × 100 µg epinephrine (7g) → 101 | ≥ 30 % fall within 10 min (tables onset 1–10 min), ≥ 80 % restored ✓ |
| Thyroid storm (awake, heat model, 2 h) | core 38.6 °C, VO2 × 1.57, HR × 1.80, SVR × 0.60 | §5c 38.5–41 / 1.3–1.8 / 110–150 / × 0.6 ✓ |
| Cold IV (E-7e-1) | 2 unwarmed RBC units ≥ 0.3 °C colder than warmed ones; warmer removes it; 1 unit ≈ 0.24 °C | tables 0.25 °C/unit ✓ |
| 7g dextrose infusion 20 g/h (E-7e-4) | `pk.drugs.dextrose.rate` 333 mg/min; glucose > 115 at 30 min | ✓ |
| Rhythm gate (FU-2) | stimulus scales sinus HR; SVT 180 stays 175–185 | NR-7g-5 ✓ |
| Determinism / CPU / long run | identical hashes; 4 µs per simulated second (0.08 µs per tick); 6 h CI horizon exact, no drift | ✓ |
| Rest | every endocrine/thermal factor exactly 1; Stage 1–3 outputs unchanged | ✓ |

**Deviations and misses (R45, reported, not widened):** Q-7e-5 (MH HR after dantrolene 121 vs "normal"), Q-7e-7 (MODELED septic shock: warm MAP 61/HR 131/CO 5.0/SVR 866, cold SVR 1510 — 7a's baroreflex restores the SVR the vasoplegia removes and nothing raises venous return; see Requests), Q-7e-8 (Stage 3's child desaturation 128 s vs 130–190: 7c already left it at 130 s; 7e's hypoxic catecholamine tachycardia and the heat model's slower redistribution take 1 s each). Calibration items: Q-7e-1 heat Q10; Q-7e-2 awake neuraxial shivering; Q-7e-3 forced-air lag; Q-7e-4 MH heat × 9, sweat cap, K efflux 2.2; Q-7e-6 antinociception fallback 0.6; the [ENG] rows of decision 13.

## Requests to other stages

- **Stage 7a (FU/calibration, Q-7e-7):** (1) scale the baroreflex's arteriolar (SVR) efferent by `ps.cond.vasoResp` (septic vasoplegia blunts the reflex vasoconstriction as it blunts drugs) — without it warm septic MAP rests at 61 and SVR at 866; (2) a venous-return mechanism for hyperdynamic sepsis (reduced resistance to venous return / Pmsf maintenance, tables "Hyperdyn-Pmsf") — CO stays 5.0 instead of 7–9. 7e already writes `endoSvrF/endoEesF/endoHrF/endoDV0Frac`; no new 7a key is needed for (1) if 7a reads `ps.cond`.
- **Stage 7b:** none new — 7e drives the existing `lungCondition anaphylaxis`. Septic ARDS (tables shunt +0.05–0.3) is NOT driven (gap; a 7b `ards` severity from the sepsis stage is a later item).
- **Stage 7c:** publish `blood.out.dkaSeverity` (R51 addendum 16; 7e falls back to the ketoacid pool). Gap for the calibration pass: 7c's Starling form scales only pressure-driven filtration, so the septic/anaphylactic protein leak (tables kfMult 3–10; Fisher 1986: up to 35 % of volume in 10 min) moves no plasma at normal pressures — a permeability term (σ or a leak flow) would carry it.
- **Stage 7d:** `organs.liver.glucoseF` (already in the fixed plan) and `endo.core.cond.sepsis.cur` (7e keeps that path).
- **Stage 7f:** publish `ps.neuro = { antinoc, nmb, thermoDepth }` (7e reads them; antinoc only while 7g has an active agent); read `endo.core.out.neuroglycopenia` and `cascade(th).macF`; observe `stimulus` (addendum 12); import `combine`/`ConditionEffects` from `l2/endo/conditions.ts` for any condition it owns.
- **Stage 7g:** none new beyond E-7e-4 (applied by 7e). Hydrocortisone and thyroid drugs are not in 7g's library: when they are added, 7e reads them from `bus.doses` like dextrose/insulin (gap recorded).
- **Stage 8 (validation):** oracle scenarios O9 (hypothermia to 33 °C under propofol) and O10 (75 g carbohydrate + insulin 10 U) compare against 7e; D11 (Pulse has no anaesthetic thermal effects) is an expected difference.

## File map

| Path | Responsibility |
|---|---|
| `packages/engine-core/src/types-endo.ts` | Stage 7e public types: `stimulus`/conditions/`meal`/`thermal7e` events, `endo` event, `PatientProfile.endo` |
| `…/src/types.ts`, `…/src/index.ts` | one-line union additions and the type export |
| `…/src/l2/thermal/params.ts` | Stage 3 heat constants (unchanged) + thresholds, effectors, MH, the dantrolene mapping |
| `…/src/l2/thermal/thresholds.ts` | depth/set-point thresholds, vasomotor tone, shivering and sweating (PORTED forms, Apache header) |
| `…/src/l2/thermal/environment.ts` | BSA, radiation, convection, respiratory loss, insulation calibration, forced air, IV fluid, `ivInflow` (PORTED forms, Apache header) |
| `…/src/l2/thermal/mh.ts` | MH activity; suppression by 7g's dantrolene effect |
| `…/src/l2/thermal/heat.ts` | `ThermalState`, 1 Hz heat balance, sites, MANUAL target, pre-7e snapshot upgrade |
| `…/src/l2/thermal/metabolic.ts` | VO2/VCO2 factors, `tempHrF`, hypothermia/hyperthermia cascade hooks |
| `…/src/l2/temp/temp.ts` | re-export shim with Stage 3's names (E1) |
| `…/src/l2/endo/params.ts` | endocrine constants |
| `…/src/l2/endo/hormones.ts` | neural stress, endogenous epinephrine/norepinephrine (PORTED basal concentrations/clearance, Apache header), cortisol |
| `…/src/l2/endo/effects.ts` | hormone → HR/SVR/Ees/V0/glucose/K/SI multipliers, β2 bronchodilation and mast-cell terms |
| `…/src/l2/endo/glucose.ts` | Bergman minimal model, Pulse secretion line (Apache header), gut, dextrose/insulin, exogenous-insulin tracking |
| `…/src/l2/endo/thyroid.ts` | thyroid profiles and storm |
| `…/src/l2/endo/conditions.ts` | sepsis, anaphylaxis, SIRS, hypermetabolic; `combine` shared with 7f |
| `…/src/l2/endo/core.ts` | 1 Hz engine-independent step → `EndoOut`; profiles; DKA as an input |
| `…/src/l2/endo/adapters.ts` | reads (7a/7c/7d/7f/7g duck-typed) and writes (circ.ext, blood.core, ps.cond, lung spec, ECG deltas, HR factor) |
| `…/src/l2/endo/pipeline.ts` | `EndoState`, `advanceEndo`, commands, `endo` event |
| `…/src/l2/resp/pipeline.ts` | E2: `metabolic(rs, t, gas)` body, O2 argument, ventilation → heat model |
| `…/src/engine.ts` | additive wiring (state, advance after 7c, writes, flush, validate/apply chain position, restore, rhythm-clock factor) |
| `…/src/l2/blood/{pipeline,labs,core}.ts`, `…/src/l2/pk/pipeline.ts` | E-7e-1..4 (one anchored line each, + one import) |
| `…/test/l2/blood/pipeline.test.ts` | E-7e-5: the cold-unit test re-specified for the physical term |
| `packages/renderer/src/endo-panel.ts` | glucose tile; instructor-only stress block |
| `apps/demo/{stage7e.html,src/stage7e.ts,scripts/stage7e-shots.mjs,e2e/stage7e.e2e.ts}` | demo, gate screenshots, e2e smoke |
| `apps/demo/src/physiology-console/organs.ts`, `…/src/truth.ts` (SKIP_PATH) | 7x follow-up: 7e seam groups and machinery keys |
| `docs/gates/stage-7e.md` | gate evidence |

---
## Tasks

### Task 1: Branch, worktree, Stage 7e public types

**Files:**
- Create: `packages/engine-core/src/types-endo.ts`
- Modify: `packages/engine-core/src/types.ts` (4 additive edits), `packages/engine-core/src/index.ts` (one export line)
- Copy: this plan into the branch (`docs/plans/stage-7e-endocrine-thermal.md`)

**Interfaces:**
- Produces: `StimulusEvent`, `EndoClinicalEvent` (kinds `stimulus`, `condition` with the 7e ids, `meal`, `thermal7e` — no `drug`), `EndoEvent` (`type: 'endo'`), `EndoProfileInput` (`diabetes`, `thyroid`, `adrenalInsufficiency`); `PatientProfile.endo?: EndoProfileInput`; the `Command` union accepts `{ type: 'applyEvent'; event: EndoClinicalEvent }`; `EngineEvent` includes `EndoEvent`.

- [x] **Step 1: Create the worktree and branch**

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin
git log --oneline origin/main | grep -m1 -i "stage-7d\|stage 7d" && git log --oneline origin/main | grep -m1 -i "stage-7c\|stage 7c"   # both must print: 7e starts after 7c AND 7d merged
git worktree add ../scratch/wt-stage-7e -b stage-7e-endocrine-thermal origin/main
cd ../scratch/wt-stage-7e
mkdir -p docs/plans && cp /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo/docs/plans/stage-7e-endocrine-thermal.md docs/plans/
npx -y pnpm@9.15.9 install
ls packages/engine-core/src/l2/circ/rate-rule.ts packages/engine-core/src/l2/blood/pipeline.ts packages/engine-core/src/l2/organs   # FU-2, 7c, 7d present
```
If `rate-rule.ts` (FU-2) is missing, stop and report: Task 12's rhythm-clock gate imports `SINUS_FAMILY` from it.

- [x] **Step 2: Write the failing type test** `packages/engine-core/test/types-endo.test.ts`

```ts
// Stage 7e public types: the union members compile, 7e has no drug event (R51 §3).
import { describe, expectTypeOf, it } from 'vitest';
import type { EndoClinicalEvent, EndoEvent, EngineEvent, PatientProfile } from '../src/index.ts';

describe('Stage 7e types', () => {
  it('events, profile and the engine unions', () => {
    expectTypeOf<EndoClinicalEvent['kind']>().toEqualTypeOf<'stimulus' | 'condition' | 'meal' | 'thermal7e'>();
    expectTypeOf<Extract<EngineEvent, { type: 'endo' }>>().toEqualTypeOf<EndoEvent>();
    expectTypeOf<NonNullable<PatientProfile['endo']>['diabetes']>().toEqualTypeOf<'none' | 'type1' | 'type2' | undefined>();
  });
});
```

- [x] **Step 3: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/types-endo.test.ts --typecheck`
Expected: FAIL — `EndoClinicalEvent` is not exported (`has no exported member`).

- [x] **Step 4: Write the types file** `packages/engine-core/src/types-endo.ts`

If Stage 7f merged first and `types-neuro.ts` already declares a `stimulus` member with `intensity` (R51 addendum 12), do not declare a second one: import it (`import type { StimulusEvent } from './types-neuro.ts'`) instead of the local `StimulusEvent` below and keep the rest of the file.

```ts
// Stage 7e public types (tables §5c/§5e): endocrine/thermal clinical events, the 1 Hz `endo` event and the patient
// profile's endocrine block. Kept in their own file so parallel stages do not collide in types.ts. Stage 7e owns NO
// drug ids (R51 §3): dantrolene, dextrose, insulin and epinephrine are Stage 7g's library rows.
import type { SimSeconds } from './types.ts';

/** The ONE `stimulus` shape (R51 addendum 12): nociception 0 none … 1 incision … 1.5 laryngoscopy/sternotomy … 2 max. 7f observes it. */
export type StimulusEvent = { kind: 'stimulus'; intensity: number };

/** Brief §7.2 ClinicalEvent members Stage 7e implements. */
export type EndoClinicalEvent =
  | StimulusEvent
  | {
      kind: 'condition';
      id: 'sepsis' | 'anaphylaxis' | 'sirs' | 'hypermetabolic' | 'thyroidStorm';
      severity: number; // 0–1
      phase?: 'sirs' | 'sepsis' | 'warm' | 'cold'; // sepsis only (default 'warm')
      rampS?: number; // sepsis transition τ, s (default 600)
    }
  | { kind: 'meal'; carbohydrateG: number }
  | {
      kind: 'thermal7e';
      exposure?: 'draped' | 'exposed' | 'prep';
      airSpeedMs?: number;
      fluidWarmer?: boolean; // every IV line (7c's fluids and blood) enters at 37 °C
      hme?: boolean;
    };

/** 1 Hz endocrine/thermal summary (truth; `stressIndex` is instructor-only). */
export type EndoEvent = {
  type: 'endo';
  t: SimSeconds;
  glucoseMgDl: number;
  glucoseMmolL: number;
  insulinUuMl: number;
  epinephrinePgMl: number; // endogenous + 7g's
  norepinephrinePgMl: number;
  cortisolNmolL: number;
  stressIndex: number;
  mhActivity: number;
  shivering: boolean;
  sweating: boolean;
  vasoconstricted: boolean;
  tempPeriphC: number;
};

/** PatientProfile.endo (optional; defaults: no diabetes, euthyroid, normal adrenals). β-blockade is 7a's profile. */
export interface EndoProfileInput {
  diabetes?: 'none' | 'type1' | 'type2';
  thyroid?: 'normal' | 'hypo' | 'hyper';
  adrenalInsufficiency?: boolean;
}
```

- [x] **Step 5: Add the unions to `packages/engine-core/src/types.ts`** (four edits; each anchor occurs once)

After `import type { RespCommandBody, RespEvent } from './types-resp.ts'; // Stage 3` add:

```ts
import type { EndoClinicalEvent, EndoEvent, EndoProfileInput } from './types-endo.ts'; // Stage 7e
```

In `interface PatientProfile`, after `  sex?: 'M' | 'F'; // Stage 3 (brief §7.4 patient.sex)` add:

```ts
  endo?: EndoProfileInput; // Stage 7e (types-endo.ts)
```

In the `Command` body union, after `    | RespCommandBody // Stage 3 (types-resp.ts)` add:

```ts
    | { type: 'applyEvent'; event: EndoClinicalEvent } // Stage 7e (types-endo.ts)
```

In `export type EngineEvent =`, **append after the last member** (whatever stage added it — on the prototype base it is `  | BloodEvent; // Stage 7c (types-blood.ts)`): remove that line's `;` and add a new last line

```ts
  | EndoEvent; // Stage 7e (types-endo.ts)
```

- [x] **Step 6: Export the types** — in `packages/engine-core/src/index.ts`, after `export * from './types-resp.ts'; // Stage 3` add:

```ts
export type * from './types-endo.ts'; // Stage 7e
```

- [x] **Step 7: Run the type test and the workspace typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/types-endo.test.ts --typecheck && npx -y pnpm@9.15.9 typecheck`
Expected: PASS; clean in every package. If the controller reports a non-exhaustive `applyEvent` switch, add a `default` branch that formats `JSON.stringify(event)` (the Stage 3 exception (b) pattern) and list it in the gate note.

- [x] **Step 8: Commit and push**

```bash
git add docs/plans/stage-7e-endocrine-thermal.md packages/engine-core/src/types-endo.ts packages/engine-core/src/types.ts packages/engine-core/src/index.ts packages/engine-core/test/types-endo.test.ts
git commit -m "feat(engine-core): Stage 7e public types — stimulus/conditions/meal/thermal7e events, endo event, PatientProfile.endo" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7e-endocrine-thermal
```

### Task 2: Thermal constants, thresholds and effectors (`l2/thermal/params.ts`, `thresholds.ts`)

**Files:**
- Create: `packages/engine-core/src/l2/thermal/params.ts`, `packages/engine-core/src/l2/thermal/thresholds.ts`
- Test: `packages/engine-core/test/l2/thermal/thresholds.test.ts`

**Interfaces:**
- Consumes: nothing (pure).
- Produces: every constant in `params.ts` (Stage 3 names unchanged: `HEAT_CAP_J_KG_C`, `CORE_FRACTION`, `M_AWAKE_W_70`, `PERIPH_GRADIENT_C`, `AMBIENT_C`, `GA_KCP`, `GA_M`, `NEURAXIAL_KCP`, `NEURAXIAL_H`, `VASOCONSTRICT_C`, `VASOCONSTRICT_KCP`, `MH_ONSET_S`, `MH_VCO2_FACTOR`, `SENSOR_TAU_S`; new: `THR_*`, `W_VASO_*`, `T_NORMAL`, `SUMMIT_W_PER_KG075`, `SHIVER_SPAN_C`, `SHIVER_MAX_X`, `SWEAT_W_PER_C`, `SWEAT_MAX_W_70`, `EMERGE_TAU_S`, `MH_HEAT_X` (8), `MH_VO2_FACTOR`, `MH_RELAX_TAU_S`, `DANT_GAIN`); `interface Thresholds { vaso; vasoW; shiver; sweat }`, `thresholds(depth: number, setShiftC: number): Thresholds`, `vasoDilation(tc, thr): number`, `shiverW(tc, thr, m0, effKg, nmb): number`, `sweatW(tc, thr, effKg): number`.

- [x] **Step 1: Write the failing test** `packages/engine-core/test/l2/thermal/thresholds.test.ts`

```ts
// Stage 7e thresholds and effectors (tables §5c; annex B3 Pulse shivering/sweat forms).
import { describe, expect, it } from 'vitest';
import { shiverW, sweatW, thresholds, vasoDilation } from '../../../src/l2/thermal/thresholds.ts';

describe('thermoregulatory thresholds', () => {
  it('awake 37.2/36.9/36.0 and GA 38.0/34.8/33.5 (sweat/vaso/shiver); a fever shifts all three', () => {
    const a = thresholds(0, 0);
    expect([a.sweat, a.vaso, a.shiver]).toEqual([37.2, 36.9, 36.0]);
    const g = thresholds(1, 0);
    expect(g.sweat).toBeCloseTo(38.0, 9);
    expect(g.vaso).toBeCloseTo(34.8, 9);
    expect(g.shiver).toBeCloseTo(33.5, 9);
    expect(thresholds(0, 2).shiver).toBeCloseTo(38.0, 9);
  });

  it('awake tone at 36.8 °C is 0.2 dilated (reproduces Stage 3 k0); GA at 36.8 is fully dilated', () => {
    expect(vasoDilation(36.8, thresholds(0, 0))).toBeCloseTo(0.2, 9);
    expect(vasoDilation(36.8, thresholds(1, 0))).toBeGreaterThan(0.999);
    expect(vasoDilation(34.0, thresholds(1, 0))).toBeLessThan(0.001);
  });

  it('shivering: 0 above threshold, linear to the summit over 1.8 °C, capped at × 5, abolished by NMB', () => {
    const thr = thresholds(0, 0);
    expect(shiverW(36.1, thr, 80, 70, 0)).toBe(0);
    const half = shiverW(35.1, thr, 80, 70, 0);
    const full = shiverW(33.0, thr, 80, 70, 0);
    expect(full).toBeCloseTo(4 * 80, 6); // summit 21·70^0.75 = 508 W > 5 × 80 → capped: extra 4 × m0
    expect(half).toBeCloseTo(320 * (0.9 / 1.8), 6);
    expect(shiverW(33.0, thr, 80, 70, 1)).toBe(0);
  });

  it('sweating starts at the threshold (218 W/°C, Pulse) and is capped at 150 W (70 kg)', () => {
    const thr = thresholds(0, 0);
    expect(sweatW(37.2, thr, 70)).toBe(0);
    expect(sweatW(37.4, thr, 70)).toBeCloseTo(43.6, 6);
    expect(sweatW(39, thr, 70)).toBe(150);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/thermal/thresholds.test.ts`
Expected: FAIL — the module under test does not exist yet (`Failed to resolve import`).

- [x] **Step 3: Implement** `packages/engine-core/src/l2/thermal/params.ts`

```ts
// Stage 7e thermoregulation constants (tables §5c; research 09 §7; annex B3). The Stage 3 heat-model constants move
// here unchanged (brief §4.6; research 03 §6) so every Stage 3 number is reproduced at the default conditions;
// the new rows are the thermoregulatory thresholds and effectors and the environment terms (annex B3 "Take").
// Tags: [P] primary source read, [TXT] textbook, [ENG] engineering choice (tuned to the prototype number given).

// --- Stage 3 (unchanged values; the names keep their Stage 3 meaning) --------------------------------------
export const HEAT_CAP_J_KG_C = 3500; // brief §4.6
export const CORE_FRACTION = 2 / 3; // research 03 §6.2
export const M_AWAKE_W_70 = 80; // metabolic heat ~80 W (brief §4.6), scaled by effective weight
export const PERIPH_GRADIENT_C = 4.3; // awake core − periphery at 21 °C ambient [ENG: gives the 1–1.5 °C redistribution]
export const AMBIENT_C = 21; // operating theatre [ENG]
export const GA_KCP = 3; // k_cp × 2–4 once vasodilated (brief §4.6)
export const GA_M = 0.8; // metabolic heat −15–20 % under GA
export const NEURAXIAL_KCP = 1.8; // redistribution 0.5–1 °C, no plateau (research 03 §6.2) [ENG]
export const NEURAXIAL_H = 1.5; // vasodilated skin below the block loses more heat [ENG]
export const VASOCONSTRICT_C = 34.8; // GA vasoconstriction logistic centre (tables 34.5 ± 0.2; plateau 34.6–34.8) [ENG]
export const VASOCONSTRICT_KCP = 0.5; // k_cp × once constricted [ENG]
export const MH_ONSET_S = 900; // MH reaches its full activity over 15 min (tables 5–30 min) [ENG]
export const MH_VCO2_FACTOR = 3; // VCO2 × 3 at activity 1 (tables × 2–5; × 5 passes the 150 mmHg EtCO2 limit) [ENG]
export const SENSOR_TAU_S = 5; // probe time constant < 10 s (research 03 §6.1)

// --- vasomotor tone (Stage 7e) ------------------------------------------------------------------------------
// k_cp = k0·(VASOCONSTRICT_KCP + (GA_KCP − VASOCONSTRICT_KCP)·f), f = 1/(1 + e^{−(Tc − thrVaso)/w}) (0 constricted,
// 1 dilated). Under GA (depth 1) this is exactly Stage 3's formula. Awake, the tone at 36.8 °C must give k0 (Stage 3's
// awake conductance): f = (1 − 0.5)/(3 − 0.5) = 0.2 at 36.8 with the awake threshold 36.9 → w = 0.1/ln 4.
export const THR_VASO_AWAKE = 36.9; // tables §5c awake vasoconstriction threshold [TXT]
export const W_VASO_AWAKE = 0.1 / Math.log(4); // 0.0721 °C [ENG: reproduces Stage 3's awake k0 exactly]
export const W_VASO_GA = 0.1; // Stage 3's logistic width [ENG]
export const T_NORMAL = 36.8; // the default core the thresholds are written for (L1 tempCore default)

// --- shivering and sweating (tables §5c; annex B3 Pulse forms) ---------------------------------------------
export const THR_SHIVER_AWAKE = 36.0; // tables §5c [TXT]; Pulse 36.8 (differs +0.8, annex)
export const THR_SHIVER_GA = 33.5; // tables §5c GA [P] (Sessler: ~1 °C below vasoconstriction)
export const THR_SWEAT_AWAKE = 37.2; // tables §5c [TXT]; Pulse 37.1
export const THR_SWEAT_GA = 38.0; // tables §5c GA [P]
/** Pulse PH/Energy 608–624: summit metabolism 21·W^0.75 W, reached 1.8 °C below the shivering threshold (linear). */
export const SUMMIT_W_PER_KG075 = 21;
export const SHIVER_SPAN_C = 1.8;
/** Tables §5c: shivering VO2 × 2–3 typical, × 5 maximum — the Pulse summit (≈ × 6.3 at 70 kg) is capped here. */
export const SHIVER_MAX_X = 5;
/** Pulse PH/Energy 668–679: sweat evaporative heat 0.25·h_sw = 0.25 × 0.20833 kcal/K/s = 218 W per °C above threshold. */
export const SWEAT_W_PER_C = 218;
/** Evaporation under drapes is limited: cap of the sweat heat loss at 70 kg [ENG: keeps MH ≥ 1 °C per 5–15 min]. */
export const SWEAT_MAX_W_70 = 150;
/** Emergence without 7f: the thermoregulatory depth decays with this τ after `anaesthesia: 'none'` [ENG]. */
export const EMERGE_TAU_S = 600;

// --- MH and dantrolene (tables §5.3, §7 check 21) -----------------------------------------------------------
export const MH_HEAT_X = 8; // muscle heat × m0 added at activity 1: core +1 °C by 15 min of the trigger (tables §7 check 21) [ENG]
export const MH_VO2_FACTOR = 2.5; // VO2 × 2–3 (tables) [TXT]
export const MH_RELAX_TAU_S = 600; // the unsuppressed fraction follows dantrolene with τ 10 min (tables "VCO2 excess decays τ 10–20 min") [ENG]
/**
 * Dantrolene's PK and effect curve are Stage 7g's (R51 §1, addendum 16): `bus.metabolic.dantroleneE` = C/(C + 1) with C
 * in 2.5 mg/kg reference doses (a gamma curve, 90 % of its peak within 1 min, t10 6 h). 7e maps that effect onto the
 * MH activity: the unsuppressed fraction relaxes toward max(0, 1 − DANT_GAIN·E). 2.5 mg/kg (E ≈ 0.5) → floor 0.2,
 * 5 mg/kg (E 0.67) → 0 (tables "repeat to response: average 5 mg/kg") [ENG, fitted in the prototype].
 */
export const DANT_GAIN = 1.6;
```

- [x] **Step 4: Implement** `packages/engine-core/src/l2/thermal/thresholds.ts`

```ts
// SPDX-License-Identifier: Apache-2.0
// Portions derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), src/cpp/engine/common/system/physiology/
// EnergyModel.cpp (summit metabolism 21·W^0.75 reached 1.8 °C below the shivering threshold; sweat gain 0.25·h_sw),
// Copyright 2018-2025 Kitware, Inc. and Contributors, itself a fork of BioGears 6.1.1, Copyright 2015 Applied Research
// Associates, Inc.; licensed under the Apache License, Version 2.0; modified: re-expressed in TypeScript; thresholds,
// anaesthetic depth, set point, NMB and the caps are ours (see NOTICES N-P17).
//
// Thermoregulatory thresholds and effectors (tables §5c; Sessler 2008/2016 via research 09 §7; annex B3 Pulse
// shivering/sweat forms). Pure functions of core temperature, the thermoregulatory DEPTH d (0 awake → 1 typical
// general anaesthesia; > 1 deeper; 7f supplies it, else the `thermal` event), the set-point shift (fever/MANUAL
// target) and neuromuscular block. Anaesthetics widen the interthreshold range: vasoconstriction and shivering
// thresholds fall, the sweating threshold rises (tables: GA sweat 38.0 / vaso 34.5 / shiver 33.5 vs awake 37.2 /
// 36.9 / 36.0). Linear in d between the awake and GA rows, extrapolated for d > 1 (propofol/volatile thresholds fall
// linearly with concentration, Sessler) and clamped to [0, 1.5].
import {
  SHIVER_MAX_X, SHIVER_SPAN_C, SUMMIT_W_PER_KG075, SWEAT_MAX_W_70, SWEAT_W_PER_C, THR_SHIVER_AWAKE, THR_SHIVER_GA,
  THR_SWEAT_AWAKE, THR_SWEAT_GA, THR_VASO_AWAKE, VASOCONSTRICT_C, W_VASO_AWAKE, W_VASO_GA,
} from './params.ts';

export interface Thresholds {
  vaso: number; // logistic centre, °C
  vasoW: number; // logistic width, °C
  shiver: number;
  sweat: number;
}

const lerp = (a: number, b: number, d: number) => a + (b - a) * d;

/** Thresholds at depth d with every threshold shifted by `setShiftC` (fever raises the set point). */
export function thresholds(depth: number, setShiftC: number): Thresholds {
  const d = Math.min(1.5, Math.max(0, depth));
  return {
    vaso: lerp(THR_VASO_AWAKE, VASOCONSTRICT_C, d) + setShiftC,
    vasoW: lerp(W_VASO_AWAKE, W_VASO_GA, Math.min(1, d)),
    shiver: lerp(THR_SHIVER_AWAKE, THR_SHIVER_GA, d) + setShiftC,
    sweat: lerp(THR_SWEAT_AWAKE, THR_SWEAT_GA, d) + setShiftC,
  };
}

/** Vasomotor dilation fraction f (0 = fully constricted, 1 = fully dilated). */
export function vasoDilation(tc: number, thr: Thresholds): number {
  return 1 / (1 + Math.exp(-(tc - thr.vaso) / thr.vasoW));
}

/**
 * Shivering heat, W, on top of the basal m0 (Pulse PH/Energy 617–624 form): linear from the threshold to the summit
 * 21·W^0.75 reached SHIVER_SPAN_C below it; the summit is capped at SHIVER_MAX_X × m0 (tables × 5); neuromuscular
 * block abolishes it (nmb 0–1).
 */
export function shiverW(tc: number, thr: Thresholds, m0: number, effKg: number, nmb: number): number {
  const deficit = thr.shiver - tc;
  if (deficit <= 0) return 0;
  const summit = Math.min(SUMMIT_W_PER_KG075 * effKg ** 0.75, SHIVER_MAX_X * m0);
  return Math.max(0, summit - m0) * Math.min(1, deficit / SHIVER_SPAN_C) * (1 - Math.min(1, Math.max(0, nmb)));
}

/** Sweat evaporative heat loss, W (Pulse PH/Energy 668–679 gain, capped for draped skin [ENG]). */
export function sweatW(tc: number, thr: Thresholds, effKg: number): number {
  const over = tc - thr.sweat;
  return over <= 0 ? 0 : Math.min(SWEAT_MAX_W_70 * (effKg / 70), SWEAT_W_PER_C * over);
}
```

- [x] **Step 5: Run the tests and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/thermal/thresholds.test.ts && npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck`
Expected: PASS (4 tests), typecheck clean.

- [x] **Step 6: Commit and push**

```bash
git add packages/engine-core/test/l2/thermal/thresholds.test.ts packages/engine-core/src/l2/thermal/params.ts packages/engine-core/src/l2/thermal/thresholds.ts
git commit -m "feat(thermal): thermoregulatory thresholds by anaesthetic depth, Pulse summit shivering and sweat forms (tables §5c, annex B3)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7e-endocrine-thermal
```

### Task 3: Environment heat exchange and the IV inflow (`l2/thermal/environment.ts`)

**Files:**
- Create: `packages/engine-core/src/l2/thermal/environment.ts`
- Test: `packages/engine-core/test/l2/thermal/environment.test.ts`

**Interfaces:**
- Consumes: nothing (pure).
- Produces: constants `SIGMA`, `EMISSIVITY`, `F_RAD`, `AIR_SPEED_MS`, `SKIN_EVAP_W_70`, `PREP_EVAP_W_70`, `AIR_J_L_C`, `LATENT_J_MG`, `EXHALED_C`, `ROOM_RH`, `HME_RECOVERY`, `FORCED_AIR_C`, `FORCED_AIR_H`, `FORCED_AIR_TAU_S`, `FORCED_AIR_AREA`, `WATER_J_ML_C`, `STORED_BLOOD_C`; `bsaM2(w, h)`, `radiativeH(tp, ta)`, `convectiveH(airMs)`, `satMgL(tC)`, `interface Ventilation { veLpm; dryGas; hme }`, `respiratoryW(v, ta)`, `interface Envelope { bsa; rIns }`, `dryW(env, tp, ta, airMs, exposed)`, `calibrateInsulation(bsa, tp, ta, airMs, watts)`, `forcedAirW(env, tp)`, `infusionW(mlPerMin, tempC, tc)`, `interface IvFlowLike { rate; until; leftMl?; comp: { citrate? } | null }`, `ivInflow(flows, coldRunning, t, roomC): { mlPerMin; tempC }` (used by E-7e-1 in Task 13).

- [x] **Step 1: Write the failing test** `packages/engine-core/test/l2/thermal/environment.test.ts`

```ts
// Environment heat exchange (annex B3; Pulse forms with consistent units).
import { describe, expect, it } from 'vitest';
import { bsaM2, calibrateInsulation, convectiveH, dryW, infusionW, ivInflow, radiativeH, respiratoryW, satMgL } from '../../../src/l2/thermal/environment.ts';

describe('environment terms', () => {
  it('Du Bois BSA 1.85 m² at 70 kg / 175 cm; h_r ≈ 4.3 and h_c ≈ 3.3 W/m²/°C in a still theatre', () => {
    expect(bsaM2(70, 175)).toBeCloseTo(1.85, 2);
    expect(radiativeH(32.5, 21)).toBeCloseTo(4.25, 1);
    expect(convectiveH(0.15)).toBeCloseTo(3.30, 1);
  });

  it('water vapour: saturated 18.3 mg/L at 21 °C and 37.7 at 34 °C', () => {
    expect(satMgL(21)).toBeCloseTo(18.3, 1);
    expect(satMgL(34)).toBeCloseTo(37.7, 1);
  });

  it('respiratory loss ≈ 10 W awake (7 L/min room air), more with dry gas, halved by an HME', () => {
    const awake = respiratoryW({ veLpm: 7, dryGas: false, hme: false }, 21);
    const dry = respiratoryW({ veLpm: 7, dryGas: true, hme: false }, 21);
    expect(awake).toBeGreaterThan(8);
    expect(awake).toBeLessThan(12);
    expect(dry).toBeGreaterThan(awake);
    expect(respiratoryW({ veLpm: 7, dryGas: true, hme: true }, 21)).toBeCloseTo(dry / 2, 9);
  });

  it('the insulation calibration reproduces the requested dry loss exactly', () => {
    const bsa = bsaM2(70, 175);
    const rIns = calibrateInsulation(bsa, 32.5, 21, 0.15, 60);
    expect(dryW({ bsa, rIns }, 32.5, 21, 0.15, 1)).toBeCloseTo(60, 6);
  });

  it('1 L of 21 °C fluid removes ≈ 66 kJ from a 36.8 °C core; a warmer (37 °C) removes nothing', () => {
    expect(infusionW(1000 / 60, 21, 36.8) * 3600).toBeCloseTo(-66_044, -2);
    expect(infusionW(100, 37, 37)).toBeCloseTo(0, 12);
  });

  it('IV inflow (E-7e-1): crystalloid at room temperature, an unwarmed unit at 4 °C, haemorrhage ignored, finished lines ignored', () => {
    const saline = { rate: 60, until: 1e9, comp: { citrate: 0 } };
    const rbc = { rate: 56, until: 1e9, leftMl: 200, comp: { citrate: 55.7 } };
    const bleed = { rate: 100, until: 1e9, comp: null };
    expect(ivInflow([saline, bleed], false, 10, 21)).toEqual({ mlPerMin: 60, tempC: 21 });
    expect(ivInflow([rbc], true, 10, 21)).toEqual({ mlPerMin: 56, tempC: 4 });
    expect(ivInflow([rbc], false, 10, 21).tempC).toBe(37);
    expect(ivInflow([{ ...rbc, leftMl: 0 }, { ...saline, until: 5 }], true, 10, 21)).toEqual({ mlPerMin: 0, tempC: 21 });
    // one 280 mL unit at 4 °C: ≈ 0.24 °C of a 70 kg core (the tables' 0.25 °C per unit)
    expect((-infusionW(56, 4, 36.8) * 300) / (3500 * 70 * (2 / 3))).toBeCloseTo(0.235, 2);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/thermal/environment.test.ts`
Expected: FAIL — the module under test does not exist yet (`Failed to resolve import`).

- [x] **Step 3: Implement** `packages/engine-core/src/l2/thermal/environment.ts`

```ts
// SPDX-License-Identifier: Apache-2.0
// Portions derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), src/cpp/engine/common/system/environment/
// EnvironmentModel.cpp and physiology/EnergyModel.cpp (radiation 4εσ·0.73·T̄³, convection 10.3·v^0.6, respiratory heat
// loss), Copyright 2018-2025 Kitware, Inc. and Contributors, itself a fork of BioGears 6.1.1, Copyright 2015 Applied
// Research Associates, Inc.; licensed under the Apache License, Version 2.0; modified: re-expressed in TypeScript with
// consistent units (Pulse divides area by h); insulation calibrated to Stage 3; forced air, HME and IV terms ours
// (see NOTICES N-P17).
//
// Heat exchange with the environment (annex B3; Pulse EnvironmentModel forms re-expressed with CONSISTENT units —
// the audit found Pulse's resistances "area/h", dimensionally wrong: research/pulse-audit/02 §5). Every term is a
// power in W. The dry skin loss is radiation + convection through an insulation layer (clothes, blankets, drapes):
//   q_dry = A_exposed·(Tp − Ta)/(R_ins + 1/(h_r + h_c)),  h_r = 4·ε·σ·f_rad·T̄³,  h_c = 10.3·v^0.6 (Pulse)
// The insulation R_ins is CALIBRATED at creation so the awake patient at 21 °C loses exactly Stage 3's heat
// (so every Stage 3 number is reproduced), and every later change (ambient, air speed, exposure, forced air,
// ventilation, cold fluid) acts through the physical terms relative to that calibration.

export const SIGMA = 5.670e-8; // W/m²/K⁴
export const EMISSIVITY = 0.95; // skin [TXT]
export const F_RAD = 0.73; // effective radiating fraction of body area, supine (Pulse) [TXT]
export const AIR_SPEED_MS = 0.15; // theatre air speed at the patient [ENG]; laminar-flow theatre 0.3–0.5
export const SKIN_EVAP_W_70 = 10; // insensible skin evaporation, awake [TXT: ≈ 10–15 W]
export const PREP_EVAP_W_70 = 40; // wet skin prep / open body cavity (tables: large wound 10–30 % of loss) [ENG]
export const AIR_J_L_C = 1.21; // ρ·cp of air, J/L/°C
export const LATENT_J_MG = 2.43; // water latent heat at 30–37 °C, J/mg
export const EXHALED_C = 34; // exhaled gas temperature, saturated [TXT]
export const ROOM_RH = 0.5; // theatre relative humidity [ENG]
export const HME_RECOVERY = 0.5; // heat–moisture exchanger returns half the respiratory loss [TXT]
export const FORCED_AIR_C = 43; // "high" setting [TXT]
export const FORCED_AIR_H = 10; // W/m²/°C air-to-skin under the blanket [ENG: fitted to R39-7 warmed −0.9 °C and +0.5–1 °C/h]
/** The blanket, skin and subcutaneous tissue take time to warm: the delivered power follows on/off with this τ [ENG]. */
export const FORCED_AIR_TAU_S = 1800;
export const FORCED_AIR_AREA = 0.35; // upper-body blanket fraction of the body area [ENG]
export const WATER_J_ML_C = 4.18; // IV fluid heat capacity

/** Du Bois body surface area, m² (Pulse's skin-area formula). */
export function bsaM2(weightKg: number, heightCm: number): number {
  return 0.20247 * weightKg ** 0.425 * (heightCm / 100) ** 0.725;
}

export function radiativeH(tp: number, ta: number): number {
  const tm = (tp + ta) / 2 + 273.15;
  return 4 * EMISSIVITY * SIGMA * F_RAD * tm ** 3;
}

export function convectiveH(airMs: number): number {
  return 10.3 * Math.max(0.05, airMs) ** 0.6;
}

export interface Ventilation {
  veLpm: number; // minute ventilation
  dryGas: boolean; // anaesthesia machine / ventilator gas (0 % RH) instead of room air
  hme: boolean;
}

/** Saturated water vapour content of air, mg/L (cubic fit, 0–40 °C: 18.3 at 21 °C, 37.7 at 34 °C) [TXT]. */
export function satMgL(tC: number): number {
  return 5.018 + 0.32321 * tC + 8.1847e-3 * tC ** 2 + 3.1243e-4 * tC ** 3;
}

/** Respiratory heat loss, W: warming (sensible) and humidifying (latent) the inspired gas. */
export function respiratoryW(v: Ventilation, ta: number): number {
  const inMg = v.dryGas ? 0 : ROOM_RH * satMgL(ta);
  const perL = AIR_J_L_C * (EXHALED_C - ta) + LATENT_J_MG * Math.max(0, satMgL(EXHALED_C) - inMg);
  return (v.veLpm * perL * (v.hme ? 1 - HME_RECOVERY : 1)) / 60;
}

export interface Envelope {
  bsa: number; // m²
  rIns: number; // insulation, m²·°C/W (calibrated)
}

/** Dry (radiative + convective) loss from the periphery at Tp through the insulation, over `exposed` × BSA. */
export function dryW(env: Envelope, tp: number, ta: number, airMs: number, exposed: number): number {
  const h = radiativeH(tp, ta) + convectiveH(airMs);
  return (env.bsa * exposed * (tp - ta)) / (env.rIns + 1 / h);
}

/** Solve the insulation so the dry loss at (tp, ta) equals `watts` (awake calibration). */
export function calibrateInsulation(bsa: number, tp: number, ta: number, airMs: number, watts: number): number {
  const h = radiativeH(tp, ta) + convectiveH(airMs);
  return Math.max(0, (bsa * (tp - ta)) / Math.max(1, watts) - 1 / h);
}

/** Forced-air warming: heat INTO the periphery, W (the covered area's own dry loss is removed by the caller). */
export function forcedAirW(env: Envelope, tp: number): number {
  return FORCED_AIR_H * env.bsa * FORCED_AIR_AREA * (FORCED_AIR_C - tp);
}

/** An IV infusion at `tempC` (warmer: 37) removes heat from the core, W (negative = heat lost). */
export function infusionW(mlPerMin: number, tempC: number, tc: number): number {
  return (-(mlPerMin / 60) * WATER_J_ML_C * (tc - tempC));
}

/** A running IV line as Stage 7c keeps it (duck-typed `blood.core.fl.flows[]`): mL/min, until, volume left, composition. */
export interface IvFlowLike {
  rate: number;
  until: number;
  leftMl?: number;
  comp: { citrate?: number } | null; // null = haemorrhage
}
/** Stored blood products leave the blood bank at ≈ 4 °C [TXT]. */
export const STORED_BLOOD_C = 4;

/**
 * The IV inflow the heat model sees (exception E-7e-1: 7c's pipeline writes it into `rs.temp.iv` every 100 ms instead of
 * its −0.25 °C-per-unit shortcut): every running infusion except haemorrhage; blood-bank (citrated) products at 4 °C
 * while an unwarmed unit is running, else 37 °C (warmed); crystalloids and colloids at room temperature. One unit of
 * RBC (280 mL at 4 °C) then removes 38 kJ ≈ 0.24 °C of a 70 kg core — the tables' 0.25 °C per unit, now physical.
 */
export function ivInflow(flows: readonly IvFlowLike[], coldRunning: boolean, t: number, roomC: number): { mlPerMin: number; tempC: number } {
  let ml = 0;
  let heat = 0;
  for (const f of flows) {
    if (f.comp === null || t >= f.until || (f.leftMl !== undefined && f.leftMl <= 0)) continue;
    const c = (f.comp.citrate ?? 0) > 0 ? (coldRunning ? STORED_BLOOD_C : 37) : roomC;
    ml += f.rate;
    heat += f.rate * c;
  }
  return { mlPerMin: ml, tempC: ml > 0 ? heat / ml : roomC };
}
```

- [x] **Step 4: Run the tests and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/thermal/environment.test.ts && npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck`
Expected: PASS (6 tests), typecheck clean.

- [x] **Step 5: Commit and push**

```bash
git add packages/engine-core/test/l2/thermal/environment.test.ts packages/engine-core/src/l2/thermal/environment.ts
git commit -m "feat(thermal): environment heat exchange with consistent units and the IV inflow of 7c's lines (annex B3)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7e-endocrine-thermal
```

### Task 4: Malignant hyperthermia activity; dantrolene's effect from Stage 7g (`l2/thermal/mh.ts`)

**Files:**
- Create: `packages/engine-core/src/l2/thermal/mh.ts`
- Test: `packages/engine-core/test/l2/thermal/mh.test.ts`

**Interfaces:**
- Consumes: `params.ts` (Task 2); in the test only, 7g's `gammaConc`/`gammaN` (`l2/pk/gamma.ts`) and `hill` (`l2/pk/pd.ts`) to reproduce `bus.metabolic.dantroleneE` exactly as 7g computes it (`l2/pk/combine.ts`: `hill(a.c, 1, 1)`; row `dantrolene` in `l2/pk/data/rows-other.ts`: gamma, ref 2.5 mg/kg, tp 600 s, t10 21 600 s).
- Produces: `interface MhState { severity; t0; s? }` (Stage 3's `{ severity, t0 }` literal still type-checks), `mhActivity(mh: MhState | null, t): number`, `stepMh(mh: MhState | null, dantE: number, dtS: number): void`. No dantrolene PK here (R51 §1).

- [x] **Step 1: Write the failing test** `packages/engine-core/test/l2/thermal/mh.test.ts`

```ts
// MH activity and dantrolene (tables §5.3, §7 check 21). Dantrolene's effect curve is Stage 7g's (R51 §1): the test
// feeds 7g's own row (gamma curve, E = C/(C + 1) in 2.5 mg/kg reference doses) so the fit is the engine's.
import { describe, expect, it } from 'vitest';
import { gammaConc, gammaN } from '../../../src/l2/pk/gamma.ts';
import { hill } from '../../../src/l2/pk/pd.ts';
import { mhActivity, stepMh, type MhState } from '../../../src/l2/thermal/mh.ts';

/** 7g's dantrolene effect `bus.metabolic.dantroleneE` for boluses of `mgKg` at time 0 (rows-other.ts: tp 600 s, t10 6 h). */
const dantE = (mgKg: number, t: number) => hill(gammaConc([{ t: 0, scale: mgKg / 2.5 }], t, 600, gammaN(600, 21_600)), 1, 1);

function course(mgKg: number, seconds: number): MhState {
  const mh: MhState = { severity: 1, t0: -3600 };
  for (let s = 1; s <= seconds; s++) stepMh(mh, dantE(mgKg, s), 1);
  return mh;
}

describe('MH and dantrolene (7g effect curve)', () => {
  it('untreated: Stage 3 ramp — severity × min(1, (t − t0)/900 s); no dantrolene → s stays undefined', () => {
    const mh: MhState = { severity: 1, t0: 600 };
    expect(mhActivity(mh, 600)).toBe(0);
    expect(mhActivity(mh, 1050)).toBeCloseTo(0.5, 9);
    stepMh(mh, 0, 1);
    expect(mh.s).toBeUndefined();
    expect(mhActivity(mh, 5000)).toBe(1);
    expect(mhActivity(null, 5000)).toBe(0);
  });

  it('2.5 mg/kg: activity < 0.7 at 5 min, < 0.4 at 15 min, floor ≈ 0.2 (repeat to response)', () => {
    expect(mhActivity(course(2.5, 300), 0)).toBeLessThan(0.7);
    expect(mhActivity(course(2.5, 900), 0)).toBeLessThan(0.4);
    const late = mhActivity(course(2.5, 3600), 0);
    expect(late).toBeGreaterThan(0.1);
    expect(late).toBeLessThan(0.35);
  });

  it('5 mg/kg suppresses more than 2.5 mg/kg; as 7g’s curve wanes the activity creeps back (recrudescence)', () => {
    expect(mhActivity(course(5, 3600), 0)).toBeLessThan(mhActivity(course(2.5, 3600), 0));
    const mh = course(2.5, 3600);
    const a1 = mhActivity(mh, 0);
    for (let s = 3601; s <= 12 * 3600; s++) stepMh(mh, dantE(2.5, s), 1);
    expect(mhActivity(mh, 0)).toBeGreaterThan(a1 + 0.1);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/thermal/mh.test.ts`
Expected: FAIL — the module under test does not exist yet (`Failed to resolve import`).

- [x] **Step 3: Implement** `packages/engine-core/src/l2/thermal/mh.ts`

```ts
// Malignant hyperthermia (tables §5.3 `mh`, `dantrolene`; §7 check 21; brief §4.6/§4.9). Pulse has no MH (annex §5.3
// "no Pulse equivalent"): this module is ours. The hypermetabolic ACTIVITY of skeletal muscle is
//   a(t) = severity · r(t) · s,   r = min(1, (t − t0)/MH_ONSET_S)   (Stage 3's ramp, unchanged)
// and s (0–1) is the fraction NOT suppressed by dantrolene. Dantrolene's PK is Stage 7g's (R51 §1): the engine passes
// 7g's effect `bus.metabolic.dantroleneE` (0–1) each step and s relaxes toward max(0, 1 − DANT_GAIN·E) with τ
// MH_RELAX_TAU_S (Ca²⁺ re-sequestration and cell recovery take minutes, tables "VCO2 excess decays τ 10–20 min"), so it
// creeps back up as 7g's curve wanes (recrudescence). Without dantrolene s stays undefined and a(t) is exactly Stage
// 3's MH factor ramp.
import { DANT_GAIN, MH_ONSET_S, MH_RELAX_TAU_S } from './params.ts';

export interface MhState {
  severity: number; // 0–1
  t0: number; // trigger time, s
  s?: number; // unsuppressed fraction (absent = 1)
}

/** MH activity 0–1 at time t (Stage 3's ramp × the dantrolene-unsuppressed fraction). */
export function mhActivity(mh: MhState | null, t: number): number {
  if (!mh) return 0;
  const r = Math.min(1, Math.max(0, (t - mh.t0) / MH_ONSET_S));
  return mh.severity * r * (mh.s ?? 1);
}

/** 1 Hz (or any dt ≤ 1 s) update of the suppression state from 7g's dantrolene effect `dantE` (0–1). */
export function stepMh(mh: MhState | null, dantE: number, dtS: number): void {
  if (!mh) return;
  if (!(dantE > 0) && mh.s === undefined) return; // untreated: Stage 3 ramp only
  const target = Math.max(0, 1 - DANT_GAIN * Math.min(1, Math.max(0, dantE)));
  const s = mh.s ?? 1;
  mh.s = target + (s - target) * Math.exp(-dtS / MH_RELAX_TAU_S);
}
```

- [x] **Step 4: Run the tests and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/thermal/mh.test.ts && npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck`
Expected: PASS (3 tests), typecheck clean.

- [x] **Step 5: Commit and push**

```bash
git add packages/engine-core/test/l2/thermal/mh.test.ts packages/engine-core/src/l2/thermal/mh.ts
git commit -m "feat(thermal): MH activity suppressed by Stage 7g's dantrolene effect with a recovery lag (tables §5.3, §7 check 21, R51)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7e-endocrine-thermal
```

### Task 5: Heat balance (`l2/thermal/heat.ts`) and the `l2/temp` shim (Stage 3 tests unchanged)

**Files:**
- Create: `packages/engine-core/src/l2/thermal/heat.ts`, `packages/engine-core/test/l2/thermal/heat.test.ts`
- Replace (exception E1): `packages/engine-core/src/l2/temp/temp.ts` — the whole file becomes the shim below

**Interfaces:**
- Consumes: Tasks 2–4.
- Produces: `SITES`, `AWAKE_VE_L_MIN_KG` (0.1), `type Exposure = 'draped' | 'exposed' | 'prep'`, `interface ThermalOut { vasoF; kcp; metabolicW; shiverW; mhW; sweatW; dryW; respW; evapW; warmW; ivW }`, `interface ThermalState` (Stage 3 fields `tc tp ta capCore capPer k0 h m0 anaesthesia warming mh sites` + `effKg env warmLag depth depthIn setShift feverShift nmb shiverShift airMs exposure vent iv fluidWarmer extraX dantE out`), `createThermal(tCore, effKg, heightCm = 175)`, `currentThresholds(st)`, `stepThermal(st, t, dtS)`, `setCoreTarget(st, tCore)`, `upgradeThermal(st)` (restore of a pre-7e snapshot, Task 12). The shim keeps `createTemp`, `stepTemp`, `mhFactor`, `setCoreTarget`, `MH_VCO2_FACTOR`, `SENSOR_TAU_S`, `TempState` (= `ThermalState`) and adds `MH_MAX_FACTOR` (= 1 + MH_HEAT_X = 9).

Prototype numbers this task reproduces (70 kg, 21 °C, draped): unwarmed GA −0.93 °C at 30 min, −1.25 at 60, hour 2 −0.38; warmed nadir −0.90 °C, hour-3 +0.81 °C/h. **After Step 4, also run** `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/temp test/engine/resp-coupling.test.ts` — Stage 3's six heat tests and the 3.1 R39-7/MH engine tests must pass UNCHANGED.

- [x] **Step 1: Write the failing test** `packages/engine-core/test/l2/thermal/heat.test.ts`

```ts
// Stage 7e heat balance (R39-7 bands, research 09 §7; annex B3). The Stage 3 tests in test/l2/temp stay unchanged.
import { describe, expect, it } from 'vitest';
import { createThermal, setCoreTarget, stepThermal, type ThermalState } from '../../../src/l2/thermal/heat.ts';
import { gammaConc, gammaN } from '../../../src/l2/pk/gamma.ts';
import { hill } from '../../../src/l2/pk/pd.ts';

function run(st: ThermalState, fromS: number, seconds: number): number[] {
  const out: number[] = [];
  for (let s = 1; s <= seconds; s++) {
    stepThermal(st, fromS + s, 1);
    if (s % 60 === 0) out.push(st.tc);
  }
  return out;
}
const ga = () => {
  const st = createThermal(36.8, 70);
  st.anaesthesia = 'general';
  return st;
};

describe('Stage 7e heat balance', { timeout: 60_000 }, () => {
  it('R39-7: unwarmed GA −0.9 °C at 30 min (−0.5 to −1.2), −1.3 at 60 (−1.0 to −1.6), then 0.3–0.6 °C/h', () => {
    const tc = run(ga(), 0, 2 * 3600);
    expect(tc[29]! - 36.8).toBeLessThanOrEqual(-0.5);
    expect(tc[29]! - 36.8).toBeGreaterThanOrEqual(-1.2);
    expect(tc[59]! - 36.8).toBeLessThanOrEqual(-1.0);
    expect(tc[59]! - 36.8).toBeGreaterThanOrEqual(-1.6);
    expect(tc[59]! - tc[119]!).toBeGreaterThanOrEqual(0.3);
    expect(tc[59]! - tc[119]!).toBeLessThanOrEqual(0.6);
  });

  it('R39-7: forced-air warming from induction — first-hour nadir −0.6 to −1.2 °C', () => {
    const st = ga();
    st.warming = true;
    const tc = run(st, 0, 3600);
    const nadir = Math.min(...tc) - 36.8;
    expect(nadir).toBeLessThanOrEqual(-0.6);
    expect(nadir).toBeGreaterThanOrEqual(-1.2);
  });

  it('a colder theatre cools faster; exposure after induction deepens the first-hour fall', () => {
    const cold = ga();
    cold.ta = 18;
    const warm = ga();
    warm.ta = 24;
    expect(run(cold, 0, 3600)[59]!).toBeLessThan(run(warm, 0, 3600)[59]!);
    const ex = ga();
    ex.exposure = 'exposed';
    const d = ga();
    expect(run(ex, 0, 3600)[59]!).toBeLessThan(run(d, 0, 3600)[59]! - 0.15);
  });

  it('2 L of 21 °C crystalloid over 30 min lowers the core 0.4–0.8 °C more than a fluid warmer does', () => {
    const a = ga();
    const b = ga();
    a.iv = { mlPerMin: 2000 / 30, tempC: 21 };
    b.iv = { mlPerMin: 2000 / 30, tempC: 21 };
    b.fluidWarmer = true;
    run(a, 0, 1800);
    run(b, 0, 1800);
    expect(b.tc - a.tc).toBeGreaterThanOrEqual(0.4);
    expect(b.tc - a.tc).toBeLessThanOrEqual(0.8);
  });

  it('emergence from GA at ≈ 35 °C: depth decays (τ 10 min) and shivering starts once the threshold passes the core', () => {
    const st = ga();
    run(st, 0, 7200);
    st.anaesthesia = 'none';
    let shiv = 0;
    for (let s = 1; s <= 1800; s++) {
      stepThermal(st, 7200 + s, 1);
      shiv = Math.max(shiv, st.out.shiverW);
    }
    expect(st.depth).toBeLessThan(0.1);
    expect(shiv).toBeGreaterThan(10);
  });

  it('a raised set point (+2 °C, awake) produces vasoconstriction, shivering and a rise of ≥ 1 °C in 60 min', () => {
    const st = createThermal(36.8, 70);
    st.setShift = 2;
    stepThermal(st, 1, 1);
    expect(st.out.shiverW).toBeGreaterThan(100);
    expect(st.out.vasoF).toBeLessThan(0.01);
    const tc = run(st, 1, 3600);
    expect(tc[59]! - 36.8).toBeGreaterThanOrEqual(1.0);
  });

  it('MH (severity 1): +1 °C per 5–15 min once established; dantrolene at 20 min turns the core around within 30 min', () => {
    const st = ga();
    st.mh = { severity: 1, t0: 0 };
    const tc = run(st, 0, 30 * 60);
    const per = tc[29]! - tc[19]!; // °C in minutes 20 → 30
    expect(per).toBeGreaterThanOrEqual(10 / 15);
    expect(per).toBeLessThanOrEqual(2);
    const t = ga();
    t.mh = { severity: 1, t0: 0 };
    run(t, 0, 20 * 60);
    const after: number[] = []; // 7g's dantrolene effect (2.5 mg/kg at 20 min) arrives as `dantE` every step
    for (let s = 1; s <= 3600; s++) {
      t.dantE = hill(gammaConc([{ t: 0, scale: 1 }], s, 600, gammaN(600, 21_600)), 1, 1);
      stepThermal(t, 1200 + s, 1);
      if (s % 60 === 0) after.push(t.tc);
    }
    const peak = Math.max(...after);
    expect(after.indexOf(peak)).toBeLessThan(30);
    expect(after[59]!).toBeLessThan(peak - 0.3);
  });

  it('MANUAL setCoreTarget is a steady state (24 h drift < 0.01 °C) awake at 38.5 and under GA at 36.0', () => {
    const a = createThermal(36.8, 70);
    setCoreTarget(a, 38.5);
    run(a, 0, 86_400);
    expect(Math.abs(a.tc - 38.5)).toBeLessThan(0.01);
    const g = ga();
    stepThermal(g, 1, 1);
    setCoreTarget(g, 36.0);
    run(g, 1, 3600);
    expect(Math.abs(g.tc - 36.0)).toBeLessThan(0.01);
  });

  it('depth = max(7f thermoDepth, the Stage 3 flag): 0.3 under the GA flag keeps depth 1; 1.3 deepens it; 0.7 alone sedates', () => {
    const a = ga();
    a.depthIn = 0.3;
    stepThermal(a, 1, 1);
    expect(a.depth).toBe(1);
    const b = ga();
    b.depthIn = 1.3;
    stepThermal(b, 1, 1);
    expect(b.depth).toBeCloseTo(1.3, 9);
    const c = createThermal(36.8, 70);
    c.depthIn = 0.7;
    stepThermal(c, 1, 1);
    expect(c.depth).toBeCloseTo(0.7, 9);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/thermal/heat.test.ts`
Expected: FAIL — the module under test does not exist yet (`Failed to resolve import`).

- [x] **Step 3: Implement** `packages/engine-core/src/l2/thermal/heat.ts`

```ts
// Stage 7e heat balance (annex B3 "Take the 2-node core/skin circuit + environment; Fix: GA thresholds, vasomotion as
// a skin-flow factor, drug effects"). Two compartments (core 2/3, periphery 1/3 of the body, 3.5 kJ/kg/°C: Stage 3):
//   Cc·dTc = M − k_cp·(Tc − Tp) − Q_resp + Q_iv
//   Cp·dTp = k_cp·(Tc − Tp) − Q_dry − Q_skinEvap − Q_sweat + Q_forcedAir
//   M = m0·(1 − (1 − GA_M)·min(1, d)) + shivering + MH muscle heat + m0·(extraX − 1)   (extraX: thyroid/sepsis/…)
// k_cp comes from the vasomotor tone around the depth-dependent vasoconstriction threshold (thresholds.ts); under
// GA at depth 1 it is Stage 3's formula exactly, so redistribution, the linear phase and the plateau are Stage 3's.
// The awake patient at 21 °C is calibrated to Stage 3's balance (m0, gradient 4.3 °C) with the respiratory loss now
// on the core and the insulation solved from the environment terms (environment.ts). Stepped at 1 Hz. Plain data.
import type { TempSite } from '../../types-resp.ts';
import {
  bsaM2, calibrateInsulation, dryW, forcedAirW, infusionW, respiratoryW, AIR_SPEED_MS, FORCED_AIR_AREA, FORCED_AIR_TAU_S, PREP_EVAP_W_70,
  SKIN_EVAP_W_70, type Envelope, type Ventilation,
} from './environment.ts';
import { mhActivity, stepMh, type MhState } from './mh.ts';
import {
  AMBIENT_C, CORE_FRACTION, EMERGE_TAU_S, GA_KCP, GA_M, HEAT_CAP_J_KG_C, M_AWAKE_W_70, MH_HEAT_X, NEURAXIAL_H,
  NEURAXIAL_KCP, PERIPH_GRADIENT_C, T_NORMAL, VASOCONSTRICT_KCP,
} from './params.ts';
import { shiverW, sweatW, thresholds, vasoDilation, type Thresholds } from './thresholds.ts';

/** Site lag τ (s) and offset (°C) behind core (brief §4.6 table; Stage 3). */
export const SITES: Readonly<Record<TempSite, { tauS: number; offset: number }>> = {
  oesophageal: { tauS: 45, offset: 0 }, // 0.5–1 min
  nasopharyngeal: { tauS: 120, offset: 0 }, // 1–3 min
  tympanic: { tauS: 120, offset: 0 },
  bladder: { tauS: 720, offset: 0 }, // 5–20 min
  rectal: { tauS: 2400, offset: 0 }, // 20–60 min
  axilla: { tauS: 300, offset: -0.5 }, // 5 min, −0.5 °C
};

/** Awake resting ventilation used for the calibration, 0.1 L/min/kg (7 L/min at 70 kg): scaled so a child's insulation
 * and k0 are calibrated against its own respiratory loss [TXT]. */
export const AWAKE_VE_L_MIN_KG = 0.1;
const awakeVent = (effKg: number): Ventilation => ({ veLpm: AWAKE_VE_L_MIN_KG * effKg, dryGas: false, hme: false });
export type Exposure = 'draped' | 'exposed' | 'prep';
/** Insulation × and extra evaporation per exposure: 'exposed' = uncovered skin (induction, positioning) [ENG]. */
const EXPOSURE: Record<Exposure, { ins: number; area: number; evapX: number }> = {
  draped: { ins: 1, area: 1, evapX: 1 },
  exposed: { ins: 0.15, area: 1, evapX: 1 },
  prep: { ins: 1, area: 1, evapX: 1 + PREP_EVAP_W_70 / SKIN_EVAP_W_70 },
};

export interface ThermalOut {
  vasoF: number; // 0 constricted … 1 dilated
  kcp: number; // W/°C
  metabolicW: number; // basal (GA-reduced) + extra (endocrine) heat
  shiverW: number;
  mhW: number;
  sweatW: number;
  dryW: number;
  respW: number;
  evapW: number;
  warmW: number;
  ivW: number;
}

export interface ThermalState {
  tc: number;
  tp: number;
  ta: number;
  capCore: number; // J/°C
  capPer: number;
  k0: number; // awake k_cp W/°C (Stage 3 meaning)
  h: number; // Stage 3's lumped loss conductance at calibration (kept for reference; not used by the step)
  m0: number; // basal metabolic heat W at the set point
  effKg: number;
  env: Envelope;
  anaesthesia: 'none' | 'general' | 'neuraxial';
  warming: boolean; // forced air
  warmLag: number; // 0–1 delivered fraction of the forced-air power (first-order, τ FORCED_AIR_TAU_S)
  mh: MhState | null;
  sites: Record<TempSite, number>;
  // --- Stage 7e ---
  depth: number; // thermoregulatory depth (0 awake … 1 GA): follows `anaesthesia` unless depthIn is set
  depthIn: number | null; // 7f's `ps.neuro.thermoDepth` (duck-typed seam); the depth is max(depthIn, the `anaesthesia` flag's)
  setShift: number; // °C added to every threshold (MANUAL target)
  feverShift: number; // °C added to every threshold by 7e's endocrine core (sepsis, SIRS, thyroid storm)
  nmb: number; // 0–1 neuromuscular block (7f), abolishes shivering
  shiverShift: number; // °C added to the shivering threshold only (pethidine, opioids: 7f/7g) — negative lowers it
  airMs: number;
  exposure: Exposure;
  vent: Ventilation;
  iv: { mlPerMin: number; tempC: number }; // IV fluid entering the core: 7c writes it every 100 ms (E-7e-1, `ivInflow`)
  fluidWarmer: boolean; // IV fluid warmed to 37 °C
  extraX: number; // endocrine/condition metabolic heat multiplier (1 = none), written by 7e's endo core
  dantE: number; // Stage 7g's dantrolene effect `bus.metabolic.dantroleneE` (0–1), written by 7e's pipeline every pass
  out: ThermalOut;
}

const zeroOut = (): ThermalOut => ({ vasoF: 0, kcp: 0, metabolicW: 0, shiverW: 0, mhW: 0, sweatW: 0, dryW: 0, respW: 0, evapW: 0, warmW: 0, ivW: 0 });

export function createThermal(tCore: number, effKg: number, heightCm = 175): ThermalState {
  const m0 = M_AWAKE_W_70 * (effKg / 70);
  const tp = tCore - PERIPH_GRADIENT_C;
  const sites = {} as Record<TempSite, number>;
  for (const s of Object.keys(SITES) as TempSite[]) sites[s] = tCore;
  const bsa = bsaM2(effKg, heightCm);
  const resp = respiratoryW(awakeVent(effKg), AMBIENT_C);
  const evap = SKIN_EVAP_W_70 * (effKg / 70);
  const st: ThermalState = {
    tc: tCore, tp, ta: AMBIENT_C,
    capCore: HEAT_CAP_J_KG_C * effKg * CORE_FRACTION, capPer: HEAT_CAP_J_KG_C * effKg * (1 - CORE_FRACTION),
    k0: (m0 - resp) / PERIPH_GRADIENT_C, h: m0 / (tp - AMBIENT_C), m0, effKg,
    env: { bsa, rIns: calibrateInsulation(bsa, tp, AMBIENT_C, AIR_SPEED_MS, m0 - resp - evap) },
    anaesthesia: 'none', warming: false, warmLag: 0, mh: null, sites,
    depth: 0, depthIn: null, setShift: tCore - T_NORMAL, feverShift: 0, nmb: 0, shiverShift: 0, airMs: AIR_SPEED_MS, exposure: 'draped',
    vent: awakeVent(effKg), iv: { mlPerMin: 0, tempC: AMBIENT_C }, fluidWarmer: false, extraX: 1, dantE: 0, out: zeroOut(),
  };
  st.out = balance(st, 0);
  return st;
}

/** Current thresholds (depth, set point; the shivering-only shift applied). */
export function currentThresholds(st: ThermalState): Thresholds {
  const thr = thresholds(st.depth, st.setShift + st.feverShift);
  return { ...thr, shiver: thr.shiver + st.shiverShift };
}

function kcp(st: ThermalState, tc: number, thr: Thresholds): { k: number; f: number } {
  if (st.anaesthesia === 'neuraxial') return { k: st.k0 * NEURAXIAL_KCP, f: 1 }; // no vasoconstriction below the block
  const f = vasoDilation(tc, thr);
  return { k: st.k0 * (VASOCONSTRICT_KCP + (GA_KCP - VASOCONSTRICT_KCP) * f), f };
}

function basalW(st: ThermalState): number {
  const ga = st.anaesthesia === 'general' || st.depthIn !== null ? Math.min(1, st.depth) : 0;
  return st.m0 * (1 - (1 - GA_M) * ga);
}

/** All heat flows at the current state (W). */
function balance(st: ThermalState, t: number): ThermalOut {
  const thr = currentThresholds(st);
  const { k, f } = kcp(st, st.tc, thr);
  const ex = EXPOSURE[st.exposure];
  const env = { bsa: st.env.bsa, rIns: st.env.rIns * ex.ins };
  const neur = st.anaesthesia === 'neuraxial' ? NEURAXIAL_H : 1;
  const warmArea = FORCED_AIR_AREA * st.warmLag;
  return {
    vasoF: f, kcp: k,
    metabolicW: basalW(st) + st.m0 * (st.extraX - 1),
    shiverW: shiverW(st.tc, thr, st.m0, st.effKg, st.nmb),
    mhW: st.m0 * MH_HEAT_X * mhActivity(st.mh, t),
    sweatW: sweatW(st.tc, thr, st.effKg),
    dryW: dryW(env, st.tp, st.ta, st.airMs, ex.area * (1 - warmArea)) * neur,
    respW: respiratoryW(st.vent, st.ta),
    evapW: SKIN_EVAP_W_70 * (st.effKg / 70) * ex.evapX,
    warmW: st.warmLag > 0 ? forcedAirW(env, st.tp) * st.warmLag : 0,
    ivW: infusionW(st.iv.mlPerMin, st.fluidWarmer ? 37 : st.iv.tempC, st.tc),
  };
}

/** One step of dtS seconds (≤ 1 s). */
export function stepThermal(st: ThermalState, t: number, dtS: number): void {
  // depth = max(7f's thermoDepth, the Stage 3 `thermal` flag's depth) (R51 addendum 16): a Stage 3 scenario that sets
  // anaesthesia 'general' without drugs keeps its R39-7 course after 7f lands. Neuraxial: the thresholds of a sedated
  // patient (decision 4: Stage 3's "no plateau" keeps shivering out of hour 8).
  const target = Math.max(st.depthIn ?? 0, st.anaesthesia === 'none' ? 0 : 1);
  // induction is fast (drug onset); emergence follows the elimination of the agent (τ EMERGE_TAU_S) [ENG]
  st.depth = target >= st.depth ? target : target + (st.depth - target) * Math.exp(-dtS / EMERGE_TAU_S);
  st.warmLag += ((st.warming ? 1 : 0) - st.warmLag) * (1 - Math.exp(-dtS / FORCED_AIR_TAU_S));
  stepMh(st.mh, st.dantE, dtS);
  const o = balance(st, t);
  st.out = o;
  const flux = o.kcp * (st.tc - st.tp);
  st.tc += ((o.metabolicW + o.shiverW + o.mhW - flux - o.respW + o.ivW) / st.capCore) * dtS;
  st.tp += ((flux - o.dryW - o.evapW - o.sweatW + o.warmW) / st.capPer) * dtS;
  for (const s of Object.keys(SITES) as TempSite[]) {
    const p = SITES[s];
    st.sites[s] += (st.tc + p.offset - st.sites[s]) * (1 - Math.exp(-dtS / p.tauS));
  }
}

/**
 * MANUAL target (Stage 3 plan decision 2): a steady state with core = tCore. The set point moves with it (a fever is
 * a raised set point: every threshold shifts), the periphery is re-solved from the current flows and m0 re-solved so
 * nothing drifts afterwards.
 */
export function setCoreTarget(st: ThermalState, tCore: number): void {
  st.setShift += tCore - st.tc;
  st.tc = tCore;
  const o0 = balance(st, 0);
  // periphery: k(Tc − Tp) = dry(Tp) + evap + sweat − warm → bisection on Tp in [ta, tc]
  let lo = Math.min(st.ta, tCore) - 5;
  let hi = tCore;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    st.tp = mid;
    const o = balance(st, 0);
    const net = o0.kcp * (tCore - mid) - o.dryW - o.evapW - o.sweatW + o.warmW;
    if (net > 0) lo = mid;
    else hi = mid;
  }
  st.tp = (lo + hi) / 2;
  const o = balance(st, 0);
  const need = o.kcp * (tCore - st.tp) + o.respW - o.ivW - o.shiverW - o.mhW - st.m0 * (st.extraX - 1);
  st.m0 = need / (basalW({ ...st, m0: 1 }) || 1);
}

/**
 * Restore of a pre-7e snapshot: its `resp.temp` is Stage 3's TempState (no `env`). Keep Stage 3's live fields and
 * take the 7e fields from a fresh normothermic state of the same body (the set point is the normal one).
 */
export function upgradeThermal(st: ThermalState): ThermalState {
  if ((st as Partial<ThermalState>).env !== undefined) return st;
  const fresh = createThermal(T_NORMAL, (st.m0 / M_AWAKE_W_70) * 70);
  return {
    ...fresh, tc: st.tc, tp: st.tp, ta: st.ta, anaesthesia: st.anaesthesia, warming: st.warming, mh: st.mh, sites: st.sites,
    depth: st.anaesthesia === 'none' ? 0 : 1,
  };
}
```

- [x] **Step 4: Replace** `packages/engine-core/src/l2/temp/temp.ts` (E1)

```ts
// Stage 7e: the Stage 3 heat model now lives in `l2/thermal/**` (tables §5c, annex B3). This file keeps Stage 3's
// public names so its importers (resp pipeline, L3 temperature numerics, the Stage 3 tests) are unchanged.
import { mhActivity } from '../thermal/mh.ts';
import { MH_HEAT_X } from '../thermal/params.ts';
import { createThermal, setCoreTarget, stepThermal, type ThermalState } from '../thermal/heat.ts';

export {
  AMBIENT_C, CORE_FRACTION, GA_KCP, GA_M, HEAT_CAP_J_KG_C, M_AWAKE_W_70, MH_ONSET_S, MH_VCO2_FACTOR, NEURAXIAL_H,
  NEURAXIAL_KCP, PERIPH_GRADIENT_C, SENSOR_TAU_S, VASOCONSTRICT_C, VASOCONSTRICT_KCP,
} from '../thermal/params.ts';
export { SITES, setCoreTarget } from '../thermal/heat.ts';

/** Stage 3 name: MH heat multiplier at activity 1 (heat = m0·(factor − 1)·activity). */
export const MH_MAX_FACTOR = 1 + MH_HEAT_X;
export type TempState = ThermalState;

export function createTemp(tCore: number, effKg: number): TempState {
  return createThermal(tCore, effKg);
}

export function stepTemp(st: TempState, t: number, dtS: number): void {
  stepThermal(st, t, dtS);
}

/** MH multiplier at time t (1 when absent): heat by default, `max` = MH_VCO2_FACTOR for CO2 production. */
export function mhFactor(st: TempState, t: number, max = MH_MAX_FACTOR): number {
  return 1 + (max - 1) * mhActivity(st.mh, t);
}
```

- [x] **Step 5: Run the tests and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/thermal/heat.test.ts test/l2/temp test/engine/resp-coupling.test.ts && npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck`
Expected: PASS (heat 9, temp 6 unchanged, resp-coupling unchanged), typecheck clean.

- [x] **Step 6: Commit and push**

```bash
git add packages/engine-core/test/l2/thermal/heat.test.ts packages/engine-core/src/l2/thermal/heat.ts packages/engine-core/src/l2/temp/temp.ts
git commit -m "feat(thermal): heat balance with vasomotor thresholds, environment, warming lag, IV inflow, emergence, fever set point; l2/temp becomes a shim (R39-7)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7e-endocrine-thermal
```

### Task 6: Metabolic scaling, the temperature HR term and the hypothermia cascade (`l2/thermal/metabolic.ts`)

**Files:**
- Create: `packages/engine-core/src/l2/thermal/metabolic.ts`
- Test: `packages/engine-core/test/l2/thermal/metabolic.test.ts`

**Interfaces:**
- Consumes: `heat.ts`, `mh.ts`, `params.ts`.
- Produces: `interface ThermalMetabolic { vo2F; vco2F; mhActivity }`, `thermalMetabolic(st, t)`, `tempHrF(tc): number` (fever +12 %/°C above 37.5, bradycardia below 35 — NOT a β effect), `interface Cascade { hrF; clearanceF; macF; coagF; stage; shiverLevel }`, `cascade(st)`.

- [x] **Step 1: Write the failing test** `packages/engine-core/test/l2/thermal/metabolic.test.ts`

```ts
// Metabolic scaling and cascade outputs (tables §5c/§5.3).
import { describe, expect, it } from 'vitest';
import { createThermal, stepThermal } from '../../../src/l2/thermal/heat.ts';
import { cascade, thermalMetabolic } from '../../../src/l2/thermal/metabolic.ts';

describe('thermal metabolism and cascade', () => {
  it('at rest every factor is exactly 1 (no drift into Stage 1–3 outputs)', () => {
    const st = createThermal(36.8, 70);
    stepThermal(st, 1, 1);
    expect(thermalMetabolic(st, 1)).toEqual({ vo2F: 1, vco2F: 1, mhActivity: 0 });
    const c = cascade(st);
    expect(c.hrF).toBe(1);
    expect(c.coagF).toBe(1);
    expect(c.stage).toBe(0);
  });

  it('MH at activity 1: VO2 × 2.5, VCO2 × 3', () => {
    const st = createThermal(36.8, 70);
    st.anaesthesia = 'general';
    st.mh = { severity: 1, t0: 0 };
    stepThermal(st, 1, 1);
    const m = thermalMetabolic(st, 900);
    expect(m.vo2F).toBeCloseTo(2.5, 9);
    expect(m.vco2F).toBeCloseTo(3, 9);
  });

  it('shivering raises VO2 in proportion to its heat (× 2–3 at 0.5–1 °C below threshold)', () => {
    const st = createThermal(35.2, 70);
    st.setShift = 0; // thresholds at the normal set point: 0.8 °C below the awake shivering threshold
    stepThermal(st, 1, 1);
    const m = thermalMetabolic(st, 1);
    expect(m.vo2F).toBeGreaterThanOrEqual(2);
    expect(m.vo2F).toBeLessThanOrEqual(3);
  });

  it('hypothermia: clearance −10 %/°C, MAC −5 %/°C, coagulation placeholder and stages; fever HR +12 %/°C above 37.5', () => {
    const st = createThermal(36.8, 70);
    st.tc = 33;
    const c = cascade(st);
    expect(c.clearanceF).toBeCloseTo(0.6, 9);
    expect(c.macF).toBeCloseTo(0.8, 9);
    expect(c.coagF).toBeCloseTo(0.8, 9);
    expect(c.stage).toBe(1);
    st.tc = 30;
    expect(cascade(st).stage).toBe(2);
    st.tc = 39.5;
    expect(cascade(st).hrF).toBeCloseTo(1.24, 9);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/thermal/metabolic.test.ts`
Expected: FAIL — the module under test does not exist yet (`Failed to resolve import`).

- [x] **Step 3: Implement** `packages/engine-core/src/l2/thermal/metabolic.ts`

```ts
// Metabolic scaling and the hypothermia/hyperthermia cascade (tables §5c, §5.3 `q10`, `clearTemp`, `macFactor`;
// ICAR 2016 stages [P]). Pure functions of the thermal state; consumers read them through EndoOut (core.ts):
//   VO2/VCO2: Stage 3's tempFactor (7.5 %/°C ≈ Q10 2, gas/params.ts) stays the temperature term; this module adds
//   shivering (heat ∝ VO2: shiverW/m0) and MH (VO2 × 2.5, VCO2 × 3 at activity 1). Heat Q10 is NOT applied to the
//   heat balance (decision 3: it moved the Stage 3 plateau out of its band).
import { mhActivity } from './mh.ts';
import { MH_VCO2_FACTOR, MH_VO2_FACTOR } from './params.ts';
import type { ThermalState } from './heat.ts';

export interface ThermalMetabolic {
  vo2F: number; // × on VO2 beyond Stage 3's tempFactor and GA factor (shivering, MH)
  vco2F: number;
  mhActivity: number;
}

export function thermalMetabolic(st: ThermalState, t: number): ThermalMetabolic {
  const a = mhActivity(st.mh, t);
  const shiver = st.m0 > 0 ? st.out.shiverW / st.m0 : 0;
  return { vo2F: (1 + shiver) * (1 + (MH_VO2_FACTOR - 1) * a), vco2F: (1 + shiver) * (1 + (MH_VCO2_FACTOR - 1) * a), mhActivity: a };
}

export interface Cascade {
  hrF: number; // fever +8–10 bpm/°C above 37.5; hypothermic bradycardia below 35 [TXT]
  clearanceF: number; // drug clearance × (tables clearTemp −10 %/°C below 37) → 7g
  macF: number; // MAC × (tables −5 %/°C) → 7f
  coagF: number; // coagulation function placeholder (< 35 °C: −10 %/°C) → 7c/7h
  stage: 0 | 1 | 2 | 3 | 4; // 0 normothermic, 1 mild 35–32, 2 moderate 32–28, 3 severe < 28, 4 hyperthermic > 40
  shiverLevel: number; // 0–1 ECG/pleth shivering artefact level (Stage 4b `artefact.shiver`)
}

/**
 * HR × from core temperature: fever +12 %/°C above 37.5 (tables §5c "HR +8–10 /°C" = +11–13 % at 75 bpm) and
 * hypothermic bradycardia below 35 °C [TXT]. Not a β effect: drug β-blockade does not blunt it (R51 addendum 16).
 */
export function tempHrF(t: number): number {
  return t > 37.5 ? 1 + 0.12 * (t - 37.5) : t < 35 ? Math.max(0.4, 1 - 0.07 * (35 - t)) : 1;
}

export function cascade(st: ThermalState): Cascade {
  const t = st.tc;
  const hrF = tempHrF(t);
  const stage = t > 40 ? 4 : t < 28 ? 3 : t < 32 ? 2 : t < 35 ? 1 : 0;
  return {
    hrF,
    clearanceF: Math.min(1.2, Math.max(0.3, 1 - 0.1 * (37 - t))),
    macF: Math.min(1.2, Math.max(0.3, 1 - 0.05 * (37 - t))),
    coagF: t < 35 ? Math.max(0.3, 1 - 0.1 * (35 - t)) : 1,
    stage,
    shiverLevel: st.m0 > 0 ? Math.min(1, st.out.shiverW / (2 * st.m0)) : 0,
  };
}
```

- [x] **Step 4: Run the tests and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/thermal && npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck`
Expected: PASS (thermal 26), typecheck clean.

- [x] **Step 5: Commit and push**

```bash
git add packages/engine-core/test/l2/thermal/metabolic.test.ts packages/engine-core/src/l2/thermal/metabolic.ts
git commit -m "feat(thermal): VO2/VCO2 factors (shivering, MH), the temperature HR term and hypothermia cascade hooks (tables §5c/§5.3)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7e-endocrine-thermal
```

### Task 7: Endocrine constants and stress hormones (`l2/endo/params.ts`, `hormones.ts`, `effects.ts`)

**Files:**
- Create: `packages/engine-core/src/l2/endo/params.ts`, `packages/engine-core/src/l2/endo/hormones.ts`, `packages/engine-core/src/l2/endo/effects.ts`
- Test: `packages/engine-core/test/l2/endo/hormones.test.ts`

**Interfaces:**
- Consumes: nothing outside the files.
- Produces: all `params.ts` constants (incl. `G_SYMP_HR` 0.18, `CORT_TAU_S` 1.5 h, `SYMP_HYPOGLY_PER_MGDL` 0.06, `INS_K_PER_UU`, `MH_K_EFFLUX` 2.2, `EPI_EXO_PG_PER_RATE_EQ`); `interface HormoneState { symp; epi; epiExo; ne; cort; cortDrive }` (`epi` = ENDOGENOUS), `interface HormoneInputs { noxious; antinoc; extraSymp; glucoseMgDl; mapMmHg; sao2; paco2; cortResponse; epiExoPgMl }`, `createHormones()`, `adrenalDrive(h, x)`, `stepHormones(h, x, dtS)`; `interface BetaBlock { hr; c }`, `interface StressEffects { hrF; svrF; eesF; dV0Frac; egpF; siF; secF; kShift; vasoResp; bronchoDil; mastB2 }`, `stressEffects(h, bb: BetaBlock, cortResponse)`.

- [x] **Step 1: Write the failing test** `packages/engine-core/test/l2/endo/hormones.test.ts`

```ts
// Stress hormones and their effects (tables §5c; annex B3 Pulse basal concentrations/clearance).
import { describe, expect, it } from 'vitest';
import { stressEffects } from '../../../src/l2/endo/effects.ts';
import { createHormones, stepHormones, type HormoneInputs } from '../../../src/l2/endo/hormones.ts';

const REST: HormoneInputs = { noxious: 0, antinoc: 0, extraSymp: 0, glucoseMgDl: 100, mapMmHg: 85, sao2: 0.97, paco2: 40, cortResponse: 1, epiExoPgMl: 0 };
const NO_BB = { hr: 0, c: 0 };

function stimulus(antinoc: number): number[] {
  const h = createHormones();
  const hr: number[] = [];
  for (let s = 1; s <= 900; s++) {
    stepHormones(h, { ...REST, noxious: s > 60 && s <= 360 ? 1 : 0, antinoc }, 1);
    hr.push(stressEffects(h, NO_BB, 1).hrF);
  }
  return hr;
}

describe('stress hormones', () => {
  it('at rest: basal epinephrine 34 and norepinephrine 275 pg/mL, cortisol 400 nmol/L, every effect exactly 1', () => {
    const h = createHormones();
    for (let s = 0; s < 3600; s++) stepHormones(h, REST, 1);
    expect(h.epi).toBeCloseTo(34, 9);
    expect(h.ne).toBeCloseTo(275, 9);
    expect(h.cort).toBeCloseTo(400, 9);
    const e = stressEffects(h, NO_BB, 1);
    expect([e.hrF, e.svrF, e.eesF, e.egpF, e.siF, e.secF, e.vasoResp]).toEqual([1, 1, 1, 1, 1, 1, 1]);
    expect(e.kShift).toBeCloseTo(0, 12);
  });

  it('stimulus 1.0 without antinociception: HR +15–25 % (tables §5c), onset τ 20–40 s, offset τ 2–4 min', () => {
    const hr = stimulus(0);
    const top = hr[359]! - 1;
    expect(top).toBeGreaterThanOrEqual(0.15);
    expect(top).toBeLessThanOrEqual(0.25);
    const on = hr.findIndex((v) => v - 1 >= 0.632 * top) + 1 - 60;
    expect(on).toBeGreaterThanOrEqual(20);
    expect(on).toBeLessThanOrEqual(40);
    const off = hr.slice(360).findIndex((v) => v - 1 <= 0.368 * top) + 1;
    expect(off).toBeGreaterThanOrEqual(120);
    expect(off).toBeLessThanOrEqual(240);
  });

  it('general anaesthesia (fallback antinociception 0.6) blunts the response to ≤ half', () => {
    expect(stimulus(0.6)[359]! - 1).toBeLessThanOrEqual(0.5 * (stimulus(0)[359]! - 1));
  });

  it('surgery raises cortisol 400 → > 1500 nmol/L at 4–6 h (tables §5c: > 1500, peak 4–6 h)', () => {
    const h = createHormones();
    const at: number[] = [];
    for (let s = 1; s <= 6 * 3600; s++) {
      stepHormones(h, { ...REST, noxious: 1, antinoc: 0.6 }, 1);
      if (s % 3600 === 0) at.push(h.cort);
    }
    expect(at[3]!).toBeGreaterThan(1500);
    expect(at[5]!).toBeGreaterThan(1500);
  });

  it('endogenous epinephrine clears with t½ ≈ 2 min (Pulse clearance, Vd 0.2 L/kg)', () => {
    const h = createHormones();
    for (let s = 0; s < 1800; s++) stepHormones(h, { ...REST, glucoseMgDl: 50 }, 1);
    const ex0 = h.epi - 34;
    for (let s = 0; s < 120; s++) stepHormones(h, REST, 1);
    expect((h.epi - 34) / ex0).toBeGreaterThan(0.4);
    expect((h.epi - 34) / ex0).toBeLessThan(0.6);
  });

  it('exogenous epinephrine (7g, 728 pg/mL ≈ 0.05 µg/kg/min) adds β2 and metabolic effects but no HR/SVR/Ees/K (7g owns those)', () => {
    const h = createHormones();
    stepHormones(h, { ...REST, epiExoPgMl: 728 }, 1);
    const e = stressEffects(h, NO_BB, 1);
    expect([e.hrF, e.svrF, e.eesF]).toEqual([1, 1, 1]);
    expect(e.kShift).toBeCloseTo(0, 12);
    expect(e.bronchoDil).toBeGreaterThan(0.6);
    expect(e.egpF).toBeGreaterThan(1.3);
  });

  it('hypoglycaemia 50 mg/dL drives epinephrine 10–20× basal; 7a profile β-blockade removes the HR part, keeps the K shift', () => {
    const h = createHormones();
    for (let s = 0; s < 1800; s++) stepHormones(h, { ...REST, glucoseMgDl: 50 }, 1);
    expect(h.epi / 34).toBeGreaterThanOrEqual(10);
    expect(h.epi / 34).toBeLessThanOrEqual(20);
    const free = stressEffects(h, NO_BB, 1);
    const blocked = stressEffects(h, { hr: 1, c: 0.5 }, 1);
    expect(free.hrF).toBeGreaterThan(1.1);
    expect(blocked.hrF).toBe(1);
    expect(blocked.eesF).toBeLessThan(free.eesF);
    expect(blocked.kShift).toBeCloseTo(free.kShift, 12);
    expect(free.kShift).toBeLessThan(-0.3);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo/hormones.test.ts`
Expected: FAIL — the module under test does not exist yet (`Failed to resolve import`).

- [x] **Step 3: Implement** `packages/engine-core/src/l2/endo/params.ts`

```ts
// Stage 7e endocrine/metabolic constants (tables §5c, §5e; annex B3 "Take: insulin secretion line, epi/NE basal
// release and clearance"; Clutter 1980 epinephrine thresholds via the tables' [TXT] rows). Tags as in the tables.

// --- sympathetic stress (tables §5c `noxious`, `sympStress`) ----------------------------------------------------
export const SYMP_ON_TAU_S = 25; // onset τ 20–40 s (tables) [TXT pattern; 25 → measured HR τ ≈ 35 s with the epinephrine part]
export const SYMP_OFF_TAU_S = 180; // offset τ 2–4 min (tables)
export const G_SYMP_HR = 0.18; // neural part of HR +15–25 % at sympStress 1 (tables); with the adrenal epinephrine part: × 1.245 [ENG]
export const G_SYMP_SVR = 0.2; // SVR +15–25 % at sympStress 1 (tables)
export const G_SYMP_EES = 0.15; // contractility [ENG]
export const G_SYMP_V0 = 0.03; // venous unstressed volume −3 % of blood volume at 1 [ENG]
export const SYMP_MAX = 3; // clamp
/** Antinociception when 7f is absent: general anaesthesia alone blunts ≈ 60 % of the noxious response [ENG, Q48]. */
export const ANTINOC_GA_FALLBACK = 0.6;

// --- plasma catecholamines (annex B3: Pulse basal release and clearance) --------------------------------------
export const EPI_BASAL_PG_ML = 34; // Pulse initial 0.034 µg/L [code]
export const NE_BASAL_PG_ML = 275; // Pulse 0.275 µg/L [code]
export const EPI_CL_ML_MIN_KG = 68.66; // Pulse sub:Epinephrine [code]
export const NE_CL_ML_MIN_KG = 55; // Pulse sub:Norepinephrine [code]
export const EPI_VD_L_KG = 0.2; // [ENG]: with Pulse's clearance gives t½ ≈ 2.0 min (literature 2–3 min)
export const NE_VD_L_KG = 0.2; // t½ ≈ 2.5 min
export const EPI_ADRENAL_GAIN = 3; // adrenal release × (1 + 3·drive): surgical stress 2–5× basal [TXT]
export const NE_SPILL_GAIN = 1.5; // NE spillover × (1 + 1.5·symp) [ENG]
// adrenal drives (each adds to the drive; [ENG] slopes, tables "catecholamine surge (hypovolaemia, hypoglycaemia, hypercapnia)")
export const DRIVE_HYPOTENSION_PER_MMHG = 0.1; // below MAP 65: +1 per 10 mmHg
export const DRIVE_HYPOXIA_PER_SAT = 10; // below SaO2 0.85: +1 per 10 %
export const DRIVE_HYPERCAPNIA_PER_MMHG = 0.05; // above PaCO2 50: +1 per 20 mmHg
export const HYPO_EPI_THRESHOLD_MGDL = 65; // counter-regulatory epinephrine threshold 3.6–3.9 mmol/L (ADA) [TXT]
export const DRIVE_HYPOGLY_PER_MGDL = 0.4; // 50 mg/dL → epinephrine ≈ 19× basal (hypoglycaemic clamps: 10–20×) [TXT]
export const SYMP_HYPOGLY_PER_MGDL = 0.06; // neural sympathoadrenal activation: 50 mg/dL → symp 0.9 [ENG: with G_SYMP_HR 0.18 keeps the hypoglycaemic HR ≥ × 1.2]

// --- epinephrine effect curves (Clutter 1980 thresholds: HR 50–100, glycaemia 150–200 pg/mL) [TXT; ENG slopes]
export const EPI_EC50_BETA1 = 800; // pg/mL above basal: HR, contractility
export const EPI_BETA1_HR = 0.5;
export const EPI_BETA1_EES = 0.5;
export const EPI_EC50_BETA2 = 300; // vasodilation (low dose), K shift, glycolysis
export const EPI_BETA2_SVR = -0.15;
export const EPI_EC50_ALPHA = 3000; // vasoconstriction (high dose)
export const EPI_ALPHA_SVR = 1.2;
export const EPI_K_SHIFT = -0.8; // mmol/L at full β2 effect (epinephrine infusion −0.5 to −0.8) [TXT]
export const EPI_EC50_METAB = 400; // glucose output, insulin resistance, insulin secretion suppression
export const EPI_EGP_X = 1.5; // hepatic glucose output × (1 + 1.5·E)
export const EPI_SI_LOSS = 0.5; // SI × (1 − 0.5·E)
export const EPI_SEC_SUPPRESS = 0.6; // insulin secretion × (1 − 0.6·E) (α2) [TXT]

// --- cortisol (tables §5c: 400 → > 1500 nmol/L, peak 4–6 h after incision) -------------------------------------
export const CORT_BASAL = 400; // nmol/L
export const CORT_GAIN = 2.75; // target × (1 + 2.75·drive): drive 1 → 1500
export const CORT_TAU_S = 1.5 * 3600; // τ 1.5 h → > 1500 nmol/L from 4 h, ≈ 95 % of the rise by 4–6 h (tables "peak 4–6 h") [ENG]
export const CORT_EC50 = 400; // nmol/L above basal for its metabolic effects
export const CORT_SI_LOSS = 0.8; // insulin resistance: SI × 0.42 at cortisol 1500 (tables stress SI × 0.3–0.5)
export const CORT_EGP_X = 0.3; // gluconeogenesis
export const CORT_VASO_RESP = 0.3; // vasopressor responsiveness (adrenal insufficiency: ×0.5 of cortisol) [TXT]

// --- glucose–insulin (Bergman minimal model, tables §5c; Pulse secretion line annex B3) --------------------------
export const GB_MGDL = 100; // 5.5 mmol/L
export const SG_PER_MIN = 0.026;
export const SI_PER_MIN_PER_UU = 8.3e-4; // per µU/mL
export const P2_PER_MIN = 0.025;
export const VG_DL_KG = 1.7;
export const IB_UU_ML = 10; // basal insulin ≈ 60 pmol/L [TXT]
export const INS_N_PER_MIN = 0.14; // plasma insulin t½ ≈ 5 min [TXT]
export const VI_ML_KG = 120; // insulin distribution volume [ENG]
/** Pulse PH/Endocrine 119–134: secretion ∝ (5.357·G − 328.56) for G ≥ 80 mg/dL, normalised to the basal rate. */
export const PULSE_SEC_SLOPE = 5.357;
export const PULSE_SEC_INTERCEPT = -328.56;
export const PULSE_SEC_MIN_MGDL = 80;
export const MGDL_PER_MMOL = 18.016;
export const UU_PER_UNIT = 1e6; // 1 U = 1e6 µU
export const HYPO_L1_MGDL = 70; // ADA level 1 (< 3.9)
export const HYPO_L2_MGDL = 54; // level 2 (< 3.0)
export const NEUROGLYCOPENIA_MGDL = 50; // ~2.8 mmol/L
export const GLUCAGON_EGP_PER_MGDL = 0.03; // counter-regulation: EGP × (1 + 0.03 per mg/dL below 70) [ENG]
export const GUT_TAU_S = 45 * 60; // two-stage gut (stomach → intestine), each τ 45 min: Ra peaks ≈ 45 min at ≈ 6 mg/kg/min for 75 g [ENG]
export const GUT_BIOAVAIL = 0.7; // hepatic first-pass uptake ≈ 30 % [TXT]
export const EGP_INSULIN_SUPP = 2; // hepatic output × (1 + 2·insulin deficit fraction): insulinopenia → 400+ mg/dL over hours [ENG]
export const EGP_DEFICIT_TAU_S = 3 * 3600; // the insulinopenic rise of hepatic output builds over hours (glucagon, gluconeogenesis) [ENG]
export const INS_K_PER_UU = -0.03; // SECRETED insulin above basal drives K into cells: −0.3 mmol/L per +10 µU/mL [ENG]; exogenous insulin is 7g's kShift
export const MH_K_EFFLUX = 2.2; // MH muscle K efflux, kSet +3 mmol/L at activity 1 — net of the endogenous-epinephrine β2 uptake and with 7c's acidosis term: K 5.5–6.5 by 20 min (tables §7 21) [ENG]
/**
 * 7g's epinephrine concentration is a RATE EQUIVALENT (µg/kg/min, the infusion that would hold it). Its plasma level is
 * rate/clearance: 1 µg/kg/min ÷ Pulse's 68.66 mL/min/kg = 14 564 pg/mL (0.05 µg/kg/min → 728 pg/mL) [ENG, units].
 */
export const EPI_EXO_PG_PER_RATE_EQ = 1e6 / 68.66;
```

- [x] **Step 4: Implement** `packages/engine-core/src/l2/endo/hormones.ts`

```ts
// SPDX-License-Identifier: Apache-2.0
// Portions derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), src/cpp/engine/common/system/physiology/
// EndocrineModel.cpp and data/Data.xlsx (Substances: Epinephrine, Norepinephrine), Copyright 2018-2025 Kitware, Inc.
// and Contributors, itself a fork of BioGears 6.1.1, Copyright 2015 Applied Research Associates, Inc.; licensed under
// the Apache License, Version 2.0; modified: re-expressed in TypeScript and simplified for the monitor tick (basal
// plasma concentrations and clearance only; the stress, nociception, hypoglycaemia and hypoxia drives are ours: see
// NOTICES N-P18).
//
// Stress hormones (tables §5c; annex B3). Three time scales:
//   symp  neural sympathetic STRESS activity (0–3): noxious × (1 − antinociception) + condition/MH/hypoglycaemia
//         drives; onset τ 25 s, offset τ 3 min (tables: response to laryngoscopy). It acts on the circulation
//         directly (effects.ts) — the baroreflex/chemoreflex stay 7a's, this is the NON-baroreflex stress path.
//   epi   ENDOGENOUS plasma epinephrine (pg/mL): C_ss = basal × (1 + 3·adrenal drive); first-order with Pulse's
//         clearance over Vd 0.2 L/kg (t½ ≈ 2 min). Exogenous epinephrine is Stage 7g's (R51 §1): its plasma-equivalent
//         level arrives as an input (`epiExoPgMl`) and is stored in `epiExo` for the β2/metabolic effects only.
//   ne    NE = basal × (1 + 1.5·symp) spillover (readout; its haemodynamic effect is the `symp` path).
//   cort  cortisol (nmol/L): toward 400·(1 + 2.75·surgical drive) with τ 1.5 h (> 1500 by 4–6 h after incision).
import {
  CORT_BASAL, CORT_GAIN, CORT_TAU_S, DRIVE_HYPERCAPNIA_PER_MMHG, DRIVE_HYPOGLY_PER_MGDL, DRIVE_HYPOTENSION_PER_MMHG,
  DRIVE_HYPOXIA_PER_SAT, EPI_ADRENAL_GAIN, EPI_BASAL_PG_ML, EPI_CL_ML_MIN_KG, EPI_VD_L_KG, HYPO_EPI_THRESHOLD_MGDL,
  NE_BASAL_PG_ML, NE_CL_ML_MIN_KG, NE_SPILL_GAIN, NE_VD_L_KG, SYMP_MAX, SYMP_OFF_TAU_S, SYMP_ON_TAU_S,
} from './params.ts';

export interface HormoneState {
  symp: number;
  epi: number; // endogenous plasma epinephrine, pg/mL
  epiExo: number; // exogenous (7g) plasma-equivalent epinephrine, pg/mL — β2 and metabolic effects only
  ne: number;
  cort: number;
  cortDrive: number; // the slow surgical-stress drive integrated for cortisol
}

/** Inputs of one hormone step (all optional sources resolved by the adapters; neutral values = a resting patient). */
export interface HormoneInputs {
  noxious: number; // 0 none … 1 incision … 1.5 laryngoscopy/sternotomy (tables `noxious`)
  antinoc: number; // 0–1 antinociception (7f; fallback ANTINOC_GA_FALLBACK under GA)
  extraSymp: number; // MH, thyroid storm, sepsis, awareness … (0–3)
  glucoseMgDl: number;
  mapMmHg: number;
  sao2: number; // 0–1
  paco2: number; // mmHg
  cortResponse: number; // 1 normal, 0.5 adrenal insufficiency / etomidate (tables)
  epiExoPgMl: number; // 7g's epinephrine as plasma pg/mL (0 without 7g)
}

export function createHormones(): HormoneState {
  return { symp: 0, epi: EPI_BASAL_PG_ML, epiExo: 0, ne: NE_BASAL_PG_ML, cort: CORT_BASAL, cortDrive: 0 };
}

/** Adrenal (humoral) drive: stress activity plus the metabolic emergencies the baroreflex does not cover. */
export function adrenalDrive(h: HormoneState, x: HormoneInputs): number {
  return (
    h.symp +
    Math.max(0, 65 - x.mapMmHg) * DRIVE_HYPOTENSION_PER_MMHG +
    Math.max(0, 0.85 - x.sao2) * DRIVE_HYPOXIA_PER_SAT +
    Math.max(0, x.paco2 - 50) * DRIVE_HYPERCAPNIA_PER_MMHG +
    Math.max(0, HYPO_EPI_THRESHOLD_MGDL - x.glucoseMgDl) * DRIVE_HYPOGLY_PER_MGDL
  );
}

export function stepHormones(h: HormoneState, x: HormoneInputs, dtS: number): void {
  const target = Math.min(SYMP_MAX, Math.max(0, x.noxious * (1 - Math.min(1, Math.max(0, x.antinoc))) + x.extraSymp));
  const tau = target > h.symp ? SYMP_ON_TAU_S : SYMP_OFF_TAU_S;
  h.symp += (target - h.symp) * (1 - Math.exp(-dtS / tau));
  const kE = EPI_CL_ML_MIN_KG / (EPI_VD_L_KG * 1000) / 60; // /s
  const kN = NE_CL_ML_MIN_KG / (NE_VD_L_KG * 1000) / 60;
  const drive = adrenalDrive(h, x);
  const epiSs = EPI_BASAL_PG_ML * (1 + EPI_ADRENAL_GAIN * drive);
  h.epi = epiSs + (h.epi - epiSs) * Math.exp(-kE * dtS);
  h.epiExo = Math.max(0, x.epiExoPgMl);
  const neSs = NE_BASAL_PG_ML * (1 + NE_SPILL_GAIN * h.symp);
  h.ne = neSs + (h.ne - neSs) * Math.exp(-kN * dtS);
  // cortisol: the drive is surgical stress (noxious, not blunted by anaesthesia — Desborough 2000) + adrenal drive
  h.cortDrive = Math.min(2, x.noxious + 0.3 * drive);
  const cSs = CORT_BASAL * (1 + CORT_GAIN * h.cortDrive * x.cortResponse);
  h.cort = cSs + (h.cort - cSs) * Math.exp(-dtS / CORT_TAU_S);
}
```

- [x] **Step 5: Implement** `packages/engine-core/src/l2/endo/effects.ts`

```ts
// Stress hormone → effect multipliers (tables §5c; Clutter 1980 thresholds [TXT]; slopes [ENG], Q48). Pure.
// Haemodynamic outputs are MULTIPLIERS on the circulation (7a set points), combined multiplicatively with the
// baroreflex and drugs there (audit A11). They come from the NEURAL stress path and the ENDOGENOUS epinephrine only:
// exogenous epinephrine's HR/SVR/contractility are Stage 7g's (R51 §1–2), never applied twice. Exogenous epinephrine
// (7g's plasma-equivalent level) adds only to the β2 bronchodilation/mast-cell term and the metabolic effects.
// The profile β-blockade is Stage 7a's (`prof.betaBlock` HR, `prof.betaBlockC` contractility): it removes the β1 part
// of the neural and humoral HR/contractility effects; β2 effects (vasodilation, K, glycolysis) are kept (cardio-
// selective default). Drug β-blockade (7g's `betaBlockAdd`) is applied by 7a's control step (`betaBlunt`), not here.
// The K shift is ENDOGENOUS only (R51 addendum 16): exogenous β2/insulin K shifts are 7g's `bus.metabolic.kShift`.
import {
  CORT_BASAL, CORT_EC50, CORT_EGP_X, CORT_SI_LOSS, CORT_VASO_RESP, EPI_ALPHA_SVR, EPI_BASAL_PG_ML, EPI_BETA1_EES,
  EPI_BETA1_HR, EPI_BETA2_SVR, EPI_EC50_ALPHA, EPI_EC50_BETA1, EPI_EC50_BETA2, EPI_EC50_METAB, EPI_EGP_X, EPI_K_SHIFT,
  EPI_SEC_SUPPRESS, EPI_SI_LOSS, G_SYMP_EES, G_SYMP_HR, G_SYMP_SVR, G_SYMP_V0,
} from './params.ts';
import type { HormoneState } from './hormones.ts';

export interface StressEffects {
  hrF: number; // × HR set point
  svrF: number; // × systemic resistance
  eesF: number; // × LV/RV contractility
  dV0Frac: number; // + fraction of blood volume moved into the venous unstressed pool (− = venoconstriction)
  egpF: number; // × endogenous (hepatic) glucose production
  siF: number; // × insulin sensitivity
  secF: number; // × insulin secretion
  kShift: number; // mmol/L plasma K set-point shift from ENDOGENOUS epinephrine (β2, into cells)
  vasoResp: number; // × catecholamine/vasopressor responsiveness (cortisol permissive effect)
  bronchoDil: number; // 0–1 β2 bronchodilation of endogenous + exogenous epinephrine
  mastB2: number; // 0–1 β2 mast-cell stabilisation by EXOGENOUS (7g) epinephrine — the anaphylaxis treatment (R51 addendum 16)
}

/** Stage 7a's profile β-blockade: fraction of the β1 chronotropic (`hr`) and inotropic (`c`) response removed. */
export interface BetaBlock {
  hr: number;
  c: number;
}

const hill = (x: number, ec50: number) => (x <= 0 ? 0 : x / (x + ec50));
const keep = (b: number) => 1 - Math.min(1, Math.max(0, b));

export function stressEffects(h: HormoneState, bb: BetaBlock, cortResponse: number): StressEffects {
  const kHr = keep(bb.hr);
  const kC = keep(bb.c);
  const endo = Math.max(0, h.epi - EPI_BASAL_PG_ML); // endogenous excess
  const all = endo + Math.max(0, h.epiExo);
  const b1 = hill(endo, EPI_EC50_BETA1);
  const b2 = hill(endo, EPI_EC50_BETA2);
  const al = hill(endo, EPI_EC50_ALPHA);
  const me = hill(all, EPI_EC50_METAB);
  const co = hill(h.cort - CORT_BASAL, CORT_EC50);
  return {
    hrF: (1 + G_SYMP_HR * h.symp * kHr) * (1 + EPI_BETA1_HR * b1 * kHr),
    svrF: (1 + G_SYMP_SVR * h.symp) * (1 + EPI_BETA2_SVR * b2) * (1 + EPI_ALPHA_SVR * al),
    eesF: (1 + G_SYMP_EES * h.symp * kC) * (1 + EPI_BETA1_EES * b1 * kC),
    dV0Frac: -G_SYMP_V0 * h.symp,
    egpF: (1 + EPI_EGP_X * me) * (1 + CORT_EGP_X * co),
    siF: (1 - EPI_SI_LOSS * me) * (1 - CORT_SI_LOSS * co),
    secF: 1 - EPI_SEC_SUPPRESS * me,
    kShift: EPI_K_SHIFT * b2,
    vasoResp: (1 - CORT_VASO_RESP) + CORT_VASO_RESP * Math.min(1.5, cortResponse * (h.cort / CORT_BASAL)),
    bronchoDil: hill(all, EPI_EC50_BETA2),
    mastB2: hill(Math.max(0, h.epiExo), EPI_EC50_BETA2),
  };
}
```

- [x] **Step 6: Run the tests and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo/hormones.test.ts && npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck`
Expected: PASS (7 tests; prototype: stimulus HR × 1.234 at 5 min, cortisol 999/1307/1465/1546/1588/1609 nmol/L at 1–6 h), typecheck clean.

- [x] **Step 7: Commit and push**

```bash
git add packages/engine-core/test/l2/endo/hormones.test.ts packages/engine-core/src/l2/endo/params.ts packages/engine-core/src/l2/endo/hormones.ts packages/engine-core/src/l2/endo/effects.ts
git commit -m "feat(endo): stress hormones — neural stress, endogenous epinephrine/norepinephrine (Pulse basal concentrations/clearance), cortisol; effect curves with 7a's β-blockade (tables §5c, annex B3)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7e-endocrine-thermal
```

### Task 8: Glucose–insulin minimal model (`l2/endo/glucose.ts`)

**Files:**
- Create: `packages/engine-core/src/l2/endo/glucose.ts`
- Test: `packages/engine-core/test/l2/endo/glucose.test.ts`

**Interfaces:**
- Consumes: `endo/params.ts` (Task 7).
- Produces: `interface GlucoseState { g; x; i; iExo; gb; gutMg; gut2Mg; dexMgMin; insUuMin; basalExoUuMin; egpDef }`, `interface GlucoseInputs { weightKg; egpF; siF; secF; beta; glucagon; dt }`, `createGlucose(gb = 100)`, `counterRegEgp(g)`, `stepGlucose(s, x)`, `dextroseBolus(s, g, w)`, `dextroseInfusion(s, gPerH)`, `meal(s, g)`, `insulinBolus(s, units, w)`, `insulinInfusion(s, unitsPerH)`. The dose functions are called by the 7g dose observer (Task 11), never by a 7e command.

Prototype: 24 h fasting drift 0.000; D50 25 g → 310 → < 130 by 60 min; insulin 7 U IV nadir 38 mg/dL at 23 min; 4 U/h → < 70 by 2 h; 75 g oral peak 178 at 61 min, 137 at 2 h; type 2 peak 243, 223 at 2 h; insulinopenia 140/212/322/410 at 1/2/4/8 h.

- [x] **Step 1: Write the failing test** `packages/engine-core/test/l2/endo/glucose.test.ts`

```ts
// Glucose–insulin (tables §5c Bergman minimal model; annex B3 Pulse secretion line).
import { describe, expect, it } from 'vitest';
import { createGlucose, dextroseBolus, dextroseInfusion, insulinBolus, insulinInfusion, meal, stepGlucose, type GlucoseState } from '../../../src/l2/endo/glucose.ts';

function run(g: GlucoseState, seconds: number, p: { si?: number; beta?: number; glucagon?: number } = {}): number[] {
  const out: number[] = [];
  for (let s = 1; s <= seconds; s++) {
    stepGlucose(g, { weightKg: 70, egpF: 1, siF: p.si ?? 1, secF: 1, beta: p.beta ?? 1, glucagon: p.glucagon ?? 1, dt: 1 });
    if (s % 60 === 0) out.push(g.g);
  }
  return out;
}

describe('glucose–insulin minimal model', { timeout: 60_000 }, () => {
  it('fasting steady state 100 mg/dL / 10 µU/mL holds for 24 h', () => {
    const g = createGlucose();
    run(g, 86_400);
    expect(g.g).toBeCloseTo(100, 6);
    expect(g.i).toBeCloseTo(10, 6);
  });

  it('D50 25 g IV: +200 mg/dL at once, back within 30 mg/dL of baseline by 60 min', () => {
    const g = createGlucose();
    dextroseBolus(g, 25, 70);
    expect(g.g).toBeGreaterThan(290);
    const o = run(g, 3600);
    expect(o[59]!).toBeLessThan(130);
  });

  it('insulin 0.1 U/kg IV (insulin tolerance test): nadir 30–50 mg/dL at 15–35 min, recovery by 2 h', () => {
    const g = createGlucose();
    insulinBolus(g, 7, 70);
    const o = run(g, 3 * 3600);
    const nadir = Math.min(...o);
    const at = o.indexOf(nadir) + 1;
    expect(nadir).toBeGreaterThanOrEqual(30);
    expect(nadir).toBeLessThanOrEqual(55);
    expect(at).toBeGreaterThanOrEqual(15);
    expect(at).toBeLessThanOrEqual(35);
    expect(o[119]!).toBeGreaterThan(80);
    expect(g.i - g.iExo).toBeGreaterThan(0); // the exogenous part is tracked: the secreted part is what drives 7e's K term
    expect(g.iExo).toBeLessThan(g.i);
  });

  it('a dextrose infusion is matched by secretion: 10 g/h raises fasting glucose by 10–40 mg/dL', () => {
    const g = createGlucose();
    dextroseInfusion(g, 10);
    const o = run(g, 3 * 3600);
    expect(o[179]! - 100).toBeGreaterThanOrEqual(10);
    expect(o[179]! - 100).toBeLessThanOrEqual(40);
  });

  it('75 g oral: normal peak 140–200 at 30–90 min, < 140 at 2 h; type 2 (SI × 0.3, 144 fasting) > 200 at 2 h', () => {
    const n = createGlucose();
    meal(n, 75);
    const o = run(n, 3 * 3600);
    const pk = Math.max(...o);
    expect(pk).toBeGreaterThanOrEqual(140);
    expect(pk).toBeLessThanOrEqual(200);
    expect(o.indexOf(pk) + 1).toBeGreaterThanOrEqual(30);
    expect(o.indexOf(pk) + 1).toBeLessThanOrEqual(90);
    expect(o[119]!).toBeLessThan(140);
    const t2 = createGlucose(144);
    run(t2, 600, { si: 0.3 });
    expect(t2.g).toBeCloseTo(144, 3);
    meal(t2, 75);
    expect(run(t2, 7200, { si: 0.3 })[119]!).toBeGreaterThan(200);
  });

  it('insulinopenia (type 1, no insulin): glucose climbs over hours to > 300 mg/dL by 4 h', () => {
    const g = createGlucose();
    const o = run(g, 4 * 3600, { beta: 0 });
    expect(o[59]!).toBeLessThan(200);
    expect(o[239]!).toBeGreaterThan(300);
  });

  it('an insulin infusion of 4 U/h without dextrose takes a non-diabetic below 70 mg/dL within 2 h', () => {
    const g = createGlucose();
    insulinInfusion(g, 4);
    expect(run(g, 7200)[119]!).toBeLessThan(70);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo/glucose.test.ts`
Expected: FAIL — the module under test does not exist yet (`Failed to resolve import`).

- [x] **Step 3: Implement** `packages/engine-core/src/l2/endo/glucose.ts`

```ts
// SPDX-License-Identifier: Apache-2.0
// Portions derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), src/cpp/engine/common/system/physiology/
// EndocrineModel.cpp (insulin synthesis line) and TissueModel.cpp (liver glucose release threshold 85 mg/dL),
// Copyright 2018-2025 Kitware, Inc. and Contributors, itself a fork of BioGears 6.1.1, Copyright 2015 Applied Research
// Associates, Inc.; licensed under the Apache License, Version 2.0; modified: re-expressed in TypeScript; the glucose
// disposal is the Bergman minimal model (ours, tables §5c), not Pulse's (see NOTICES N-P18).
//
// Glucose–insulin (tables §5c; annex B3 "Glucose disposal: ours (Bergman), using Pulse's insulin secretion as I(t)"):
//   dG/dt = −(SG + X)·G + SG·Gb·egp + Ra/VG                    G mg/dL, Ra mg/min (dextrose, gut, counter-regulation)
//   dX/dt = −p2·X + p2·SI·si·(I − Ib)                           remote insulin action (/min)
//   dI/dt = −n·I + (sec(G)·secF·beta + exo)/VI                  I µU/mL; exo insulin µU/min (7g boluses/infusions, basal)
//   dIexo/dt = −n·Iexo + exo/VI                                 the exogenous part, so the SECRETED part I − Iexo is known
//   sec(G) = sec0·(5.357·G − 328.56)/(5.357·Gb − 328.56) for G ≥ 80 mg/dL (Pulse), else 0; sec0 = n·VI·Ib
// `egp` multiplies the endogenous production term SG·Gb (stress, glucagon-like counter-regulation below 70 mg/dL,
// liver function from 7d), `si` the insulin sensitivity (stress, cortisol, type 2), `beta` the β-cell capacity
// (type 1: 0, type 2: 0.6). Integrated with 1 s explicit steps (all τ ≥ 2 min). Plain data.
import {
  EGP_DEFICIT_TAU_S, EGP_INSULIN_SUPP, GB_MGDL, GLUCAGON_EGP_PER_MGDL, GUT_BIOAVAIL, GUT_TAU_S, HYPO_L1_MGDL, IB_UU_ML, INS_N_PER_MIN, P2_PER_MIN, PULSE_SEC_INTERCEPT,
  PULSE_SEC_MIN_MGDL, PULSE_SEC_SLOPE, SG_PER_MIN, SI_PER_MIN_PER_UU, UU_PER_UNIT, VG_DL_KG, VI_ML_KG,
} from './params.ts';

export interface GlucoseState {
  g: number; // mg/dL
  x: number; // /min
  i: number; // µU/mL (total)
  iExo: number; // µU/mL of it from exogenous insulin (7g doses, the type 1 basal insulin)
  gb: number; // basal glucose of this patient (profile: type 2 higher)
  gutMg: number; // carbohydrate in the stomach, mg
  gut2Mg: number; // carbohydrate in the intestine, mg
  dexMgMin: number; // IV dextrose infusion, mg/min
  insUuMin: number; // IV insulin infusion, µU/min
  basalExoUuMin: number; // long-acting basal insulin (type 1 profile), µU/min
  egpDef: number; // slow insulinopenic release of hepatic output (0–1)
}

export interface GlucoseInputs {
  weightKg: number;
  egpF: number; // × endogenous production (stress, liver)
  siF: number; // × SI (stress, cortisol, type 2)
  secF: number; // × secretion (α2 suppression)
  beta: number; // β-cell capacity 0–1
  glucagon: number; // counter-regulatory glucagon response 0–1 (type 1: 0)
  dt: number; // s
}

export function createGlucose(gb = GB_MGDL): GlucoseState {
  return { g: gb, x: 0, i: IB_UU_ML, iExo: 0, gb, gutMg: 0, gut2Mg: 0, dexMgMin: 0, insUuMin: 0, basalExoUuMin: 0, egpDef: 0 };
}

function secRel(g: number, gb: number): number {
  if (g < PULSE_SEC_MIN_MGDL) return 0;
  return (PULSE_SEC_SLOPE * g + PULSE_SEC_INTERCEPT) / (PULSE_SEC_SLOPE * gb + PULSE_SEC_INTERCEPT);
}

/** Glucagon-like counter-regulation below 70 mg/dL (Pulse's liver release threshold is 85: ours starts at ADA L1). */
export function counterRegEgp(g: number): number {
  return 1 + GLUCAGON_EGP_PER_MGDL * Math.max(0, HYPO_L1_MGDL - g);
}

export function stepGlucose(s: GlucoseState, x: GlucoseInputs): void {
  const dtMin = x.dt / 60;
  const vg = VG_DL_KG * x.weightKg; // dL
  const vi = VI_ML_KG * x.weightKg; // mL
  const sec0 = INS_N_PER_MIN * vi * IB_UU_ML; // µU/min that holds Ib at Gb
  const k = 1 - Math.exp(-x.dt / GUT_TAU_S);
  const empty = s.gutMg * k; // stomach → intestine
  const gutRa = s.gut2Mg * k * GUT_BIOAVAIL; // intestine → blood, after first-pass uptake
  s.gutMg -= empty;
  s.gut2Mg += empty - s.gut2Mg * k;
  const ra = s.dexMgMin + gutRa / dtMin; // mg/min
  const deficit = Math.max(0, 1 - s.i / IB_UU_ML); // insulinopenia releases hepatic output, slowly
  s.egpDef += (deficit - s.egpDef) * (1 - Math.exp(-x.dt / EGP_DEFICIT_TAU_S));
  const cr = 1 + (counterRegEgp(s.g) - 1) * x.glucagon;
  const egp = SG_PER_MIN * s.gb * x.egpF * cr * (1 + EGP_INSULIN_SUPP * s.egpDef);
  const dG = -(SG_PER_MIN + s.x) * s.g + egp + ra / vg;
  const dX = -P2_PER_MIN * s.x + P2_PER_MIN * SI_PER_MIN_PER_UU * x.siF * (s.i - IB_UU_ML);
  const sec = sec0 * secRel(s.g, s.gb) * x.secF * x.beta;
  const exo = s.insUuMin + s.basalExoUuMin;
  const dI = -INS_N_PER_MIN * s.i + (sec + exo) / vi;
  const dIexo = -INS_N_PER_MIN * s.iExo + exo / vi;
  s.g = Math.max(10, s.g + dG * dtMin);
  s.x = Math.max(-0.05, s.x + dX * dtMin);
  s.i = Math.max(0, s.i + dI * dtMin);
  s.iExo = Math.min(s.i, Math.max(0, s.iExo + dIexo * dtMin));
}

/** IV dextrose bolus (g) — enters the glucose space at once (D50 25 g). */
export function dextroseBolus(s: GlucoseState, grams: number, weightKg: number): void {
  s.g += (grams * 1000) / (VG_DL_KG * weightKg);
}

/** IV dextrose infusion, g/h (D5 at 100 mL/h = 5 g/h). */
export function dextroseInfusion(s: GlucoseState, gPerH: number): void {
  s.dexMgMin = (Math.max(0, gPerH) * 1000) / 60;
}

/** Oral/enteral carbohydrate (g) into the gut (absorbed with τ GUT_TAU_S). */
export function meal(s: GlucoseState, grams: number): void {
  s.gutMg += Math.max(0, grams) * 1000;
}

/** IV insulin bolus (units) into the insulin space. */
export function insulinBolus(s: GlucoseState, units: number, weightKg: number): void {
  const add = (units * UU_PER_UNIT) / (VI_ML_KG * weightKg);
  s.i += add;
  s.iExo += add;
}

/** IV insulin infusion, units/h. */
export function insulinInfusion(s: GlucoseState, unitsPerH: number): void {
  s.insUuMin = (Math.max(0, unitsPerH) * UU_PER_UNIT) / 60;
}
```

- [x] **Step 4: Run the tests and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo/glucose.test.ts && npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck`
Expected: PASS (7 tests), typecheck clean.

- [x] **Step 5: Commit and push**

```bash
git add packages/engine-core/test/l2/endo/glucose.test.ts packages/engine-core/src/l2/endo/glucose.ts
git commit -m "feat(endo): Bergman minimal glucose–insulin model with Pulse secretion line, gut, insulinopenic hepatic output and exogenous-insulin tracking (tables §5c, annex B3)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7e-endocrine-thermal
```

### Task 9: Thyroid profiles and thyroid storm (`l2/endo/thyroid.ts`) and system conditions (`l2/endo/conditions.ts`)

**Files:**
- Create: `packages/engine-core/src/l2/endo/thyroid.ts`, `packages/engine-core/src/l2/endo/conditions.ts`
- Test: `packages/engine-core/test/l2/endo/conditions.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type ThyroidState`, `interface ThyroidEffects { hrF; eesF; svrF; vo2F; setShiftC; betaSens }`, `thyroidEffects(state, storm)`; `interface ConditionEffects { hrF; svrF; eesF; dV0Frac; kfMult; vo2F; vasoResp; setShiftC; siF; extraSymp }`, `NEUTRAL_CONDITIONS`, `combine(list)` (shared with 7f), `interface ConditionState`, `createConditions()`, `stepConditions(c, mastB2, dtS)`, `conditionEffects(c)`, `SEPSIS_PHASES`, `ANAPH_ON_TAU_S`, `ANAPH_OFF_TAU_S`, `ANAPH_EPI_STABILISE`, `COND_TAU_S`. (No `erMax`, `lactateX`, `rawF`, `shuntAdd`: R50 F10/F12.)

- [x] **Step 1: Write the failing test** `packages/engine-core/test/l2/endo/conditions.test.ts`

```ts
// System conditions (tables §5e) and thyroid (tables §5c).
import { describe, expect, it } from 'vitest';
import { conditionEffects, createConditions, NEUTRAL_CONDITIONS, stepConditions } from '../../../src/l2/endo/conditions.ts';
import { thyroidEffects } from '../../../src/l2/endo/thyroid.ts';

describe('system conditions', () => {
  it('none: neutral bundle', () => {
    expect(conditionEffects(createConditions())).toEqual(NEUTRAL_CONDITIONS);
  });

  it('sepsis warm (stage 3): SVR × 0.4–0.55, kf × 3, lactate ↑, fever; cold (stage 4): Ees × 0.4–0.6, SVR ≥ 1', () => {
    const c = createConditions();
    c.sepsis.target = 3;
    for (let s = 0; s < 3 * 3600; s++) stepConditions(c, 0, 1);
    const w = conditionEffects(c);
    expect(w.svrF).toBeGreaterThanOrEqual(0.4);
    expect(w.svrF).toBeLessThanOrEqual(0.55);
    expect(w.kfMult).toBeCloseTo(3, 2);
    expect(w.setShiftC).toBeGreaterThan(2);
    c.sepsis.target = 4;
    for (let s = 0; s < 3 * 3600; s++) stepConditions(c, 0, 1);
    const k = conditionEffects(c);
    expect(k.eesF).toBeGreaterThanOrEqual(0.4);
    expect(k.eesF).toBeLessThanOrEqual(0.6);
    expect(k.svrF).toBeGreaterThanOrEqual(0.99); // tables cold 1.0–1.2
    expect(k.vasoResp).toBeLessThan(w.vasoResp); // late sepsis: catecholamine resistance deepens (tables vasoResp 0.6 → 0.5)
  });

  it('anaphylaxis grade III (severity 0.75): SVR × 0.3–0.5 with onset τ 1–3 min; epinephrine β2 stabilises mast cells', () => {
    const c = createConditions();
    c.anaph.target = 0.75;
    let t63 = 0;
    for (let s = 1; s <= 900; s++) {
      stepConditions(c, 0, 1);
      if (!t63 && c.anaph.mediator >= 0.632 * 0.75) t63 = s;
    }
    expect(t63).toBeGreaterThanOrEqual(60);
    expect(t63).toBeLessThanOrEqual(180);
    const e = conditionEffects(c);
    expect(e.svrF).toBeGreaterThanOrEqual(0.3);
    expect(e.svrF).toBeLessThanOrEqual(0.5);
    expect(e.kfMult).toBeGreaterThan(5); // capillary leak (tables grade III kf × 8) → 7c's fluid shift and lung water
    for (let s = 0; s < 900; s++) stepConditions(c, 1, 1);
    expect(conditionEffects(c).svrF).toBeGreaterThan(0.75);
  });

  it('thyroid storm row: HR × 1.8 (≈ 135), SVR × 0.6, VO2 × 1.4 (× 1.3–1.8 with the Q10 of its fever), set point +1.8 °C; hypothyroid is the opposite direction', () => {
    const s = thyroidEffects('normal', 1);
    expect(s.hrF).toBeCloseTo(1.8, 9);
    expect(s.svrF).toBeCloseTo(0.6, 9);
    expect(s.vo2F).toBeCloseTo(1.4, 9);
    expect(s.setShiftC).toBeCloseTo(1.8, 9);
    const h = thyroidEffects('hypo', 0);
    expect(h.hrF).toBeLessThan(1);
    expect(h.vo2F).toBeLessThan(1);
    expect(thyroidEffects('hyper', 1).hrF).toBeCloseTo(1.8, 9); // the storm ceiling does not stack on hyper
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo/conditions.test.ts`
Expected: FAIL — the module under test does not exist yet (`Failed to resolve import`).

- [x] **Step 3: Implement** `packages/engine-core/src/l2/endo/thyroid.ts`

```ts
// Thyroid profiles and thyroid storm (tables §5c `hyperthyroid`; Klein 2007 [TXT]). Pulse has no thyroid (annex §5c).
// A profile state (normal / hypo / hyper) sets resting multipliers; the `thyroidStorm` condition (severity 0–1, set
// by the scenario, smoothed in core.ts) adds the storm on top: HR 110–150, Ees × 1.3, SVR × 0.6, VO2 × 1.3–1.8,
// core 38.5–41 °C (set point + heat), β-agonist sensitivity × 1.5. Pure.
export type ThyroidState = 'normal' | 'hypo' | 'hyper';

export interface ThyroidEffects {
  hrF: number;
  eesF: number;
  svrF: number;
  vo2F: number; // also the heat multiplier (BMR)
  setShiftC: number;
  betaSens: number; // × on the β effects of stress (the EXCESS over 1)
}

const ROW: Record<ThyroidState, ThyroidEffects> = {
  normal: { hrF: 1, eesF: 1, svrF: 1, vo2F: 1, setShiftC: 0, betaSens: 1 },
  hyper: { hrF: 1.35, eesF: 1.2, svrF: 0.75, vo2F: 1.3, setShiftC: 0.3, betaSens: 1.3 }, // HR ≈ 100 at rest [TXT]
  hypo: { hrF: 0.8, eesF: 0.85, svrF: 1.2, vo2F: 0.8, setShiftC: -0.4, betaSens: 0.8 }, // [TXT] brady, low BMR, ↑SVR
};
const STORM: ThyroidEffects = { hrF: 1.8, eesF: 1.3, svrF: 0.6, vo2F: 1.4, setShiftC: 1.8, betaSens: 1.5 }; // → HR ≈ 135, VO2 ≈ × 1.55 with Q10, T ≈ 38.7

export function thyroidEffects(state: ThyroidState, storm: number): ThyroidEffects {
  const r = ROW[state];
  const s = Math.min(1, Math.max(0, storm));
  const mix = (a: number, b: number) => a * (1 + (b - 1) * s);
  return {
    hrF: mix(r.hrF, STORM.hrF / Math.max(1, r.hrF)),
    eesF: mix(r.eesF, STORM.eesF),
    svrF: mix(r.svrF, STORM.svrF),
    vo2F: mix(r.vo2F, STORM.vo2F),
    setShiftC: r.setShiftC + STORM.setShiftC * s,
    betaSens: mix(r.betaSens, STORM.betaSens),
  };
}
```

- [x] **Step 4: Implement** `packages/engine-core/src/l2/endo/conditions.ts`

```ts
// System-level conditions (tables §5e; R32 lists them under 7f — 7e implements them and 7f SHARES this interface,
// see "Requests"). Each condition is a bundle of multipliers interpolated from the tables' columns by a CONTINUOUS
// stage/grade, smoothed with its own onset τ so a scenario step produces a physiological transition. The engine never
// hard-codes a trajectory: the scenario sets the target (tables §5e header). Pure data + a 1 Hz smoothing step.
//   sepsis        stage 0 none · 1 SIRS · 2 sepsis · 3 septic shock warm · 4 septic shock cold (τ = rampS, default 600 s)
//   anaphylaxis   grade 0 · 2 (II) · 3 (III) · 4 (IV) Ring–Messmer (onset τ 120 s; mediator release suppressed by
//                 epinephrine's β2 effect — mast-cell stabilisation — so repeated epinephrine resolves it)
//   sirs          severity 0–1 (post-bypass vasoplegia, major surgery day 1)
//   hypermetabolic severity 0–1 (serotonin syndrome, NMS: VO2 × up to 3, heat, HR)
//   thyroidStorm  severity 0–1 (thyroid.ts)

export interface ConditionEffects {
  hrF: number;
  svrF: number;
  eesF: number;
  dV0Frac: number;
  kfMult: number; // capillary filtration × → 7c `blood.core.fl.kfMult` (its lung-water seam carries the leak to 7b)
  vo2F: number; // metabolic rate × (VO2, VCO2, heat); 7c's lactate emerges from the O2 demand it raises
  vasoResp: number; // catecholamine/vasopressor responsiveness × → `ps.cond.vasoResp` (7g's PD reads it)
  setShiftC: number; // fever
  siF: number; // insulin sensitivity ×
  extraSymp: number; // sympathetic stress added (fever, pain, mediators)
}

export const NEUTRAL_CONDITIONS: ConditionEffects = { hrF: 1, svrF: 1, eesF: 1, dV0Frac: 0, kfMult: 1, vo2F: 1, vasoResp: 1, setShiftC: 0, siF: 1, extraSymp: 0 };

type Row = Omit<ConditionEffects, never>;
// tables §5e sepsis columns (HR + → × of 75 bpm; SVR, V0, kf, Ees, VO2, vasoResp, tempSet) [TXT/ENG]; erMax/shunt are not seams (R50 F10)
const SEPSIS: readonly Row[] = [
  NEUTRAL_CONDITIONS,
  { ...NEUTRAL_CONDITIONS, hrF: 1.27, svrF: 0.85, dV0Frac: 0.02, kfMult: 1.5, vo2F: 1.1, setShiftC: 1.5, siF: 0.7, extraSymp: 0.3 },
  { ...NEUTRAL_CONDITIONS, hrF: 1.4, svrF: 0.7, dV0Frac: 0.05, kfMult: 2, vo2F: 1.2, vasoResp: 0.9, setShiftC: 2.2, siF: 0.5, extraSymp: 0.5 },
  { ...NEUTRAL_CONDITIONS, hrF: 1.3, svrF: 0.4, eesF: 0.8, dV0Frac: 0.12, kfMult: 3, vo2F: 1.3, vasoResp: 0.6, setShiftC: 2.4, siF: 0.4, extraSymp: 0.5 },
  { ...NEUTRAL_CONDITIONS, hrF: 1.25, svrF: 1.0, eesF: 0.5, dV0Frac: 0.1, kfMult: 3.5, vo2F: 1.1, vasoResp: 0.5, setShiftC: 0.2, siF: 0.4, extraSymp: 0.7 },
];
// tables §5e anaphylaxis grades 0, (I folded into II), II, III, IV
const ANAPH: readonly Row[] = [
  NEUTRAL_CONDITIONS,
  { ...NEUTRAL_CONDITIONS, hrF: 1.15, svrF: 0.85, dV0Frac: 0.02, kfMult: 1.5 },
  { ...NEUTRAL_CONDITIONS, hrF: 1.33, svrF: 0.7, dV0Frac: 0.05, kfMult: 3, extraSymp: 0.3 },
  { ...NEUTRAL_CONDITIONS, hrF: 1.35, svrF: 0.3, dV0Frac: 0.2, kfMult: 8, extraSymp: 0.5 },
  { ...NEUTRAL_CONDITIONS, hrF: 1.35, svrF: 0.2, eesF: 0.7, dV0Frac: 0.3, kfMult: 10, extraSymp: 0.5 },
];
const SIRS: Row = { ...NEUTRAL_CONDITIONS, hrF: 1.2, svrF: 0.78, kfMult: 1.5, vo2F: 1.15, setShiftC: 1, siF: 0.5, extraSymp: 0.2 };
const HYPERMET: Row = { ...NEUTRAL_CONDITIONS, hrF: 1.3, vo2F: 3, setShiftC: 0, extraSymp: 1 };

function interp(rows: readonly Row[], x: number): Row {
  const c = Math.min(rows.length - 1, Math.max(0, x));
  const i = Math.min(rows.length - 2, Math.floor(c));
  const f = c - i;
  const a = rows[i] as Row;
  const b = rows[i + 1] as Row;
  const out = { ...a };
  for (const k of Object.keys(a) as (keyof Row)[]) out[k] = a[k] + (b[k] - a[k]) * f;
  return out;
}

/** Combine bundles: multipliers multiply, additive terms add (audit #9 "max-combined" for the multipliers). */
export function combine(list: readonly ConditionEffects[]): ConditionEffects {
  const o = { ...NEUTRAL_CONDITIONS };
  for (const c of list) {
    o.hrF *= c.hrF; o.svrF *= c.svrF; o.eesF *= c.eesF; o.kfMult *= c.kfMult; o.vo2F *= c.vo2F; o.vasoResp *= c.vasoResp;
    o.siF *= c.siF;
    o.dV0Frac += c.dV0Frac; o.setShiftC += c.setShiftC; o.extraSymp += c.extraSymp;
  }
  return o;
}

export interface ConditionState {
  sepsis: { target: number; cur: number; tauS: number };
  anaph: { target: number; mediator: number };
  sirs: { target: number; cur: number };
  hypermet: { target: number; cur: number };
  storm: { target: number; cur: number };
}

export const ANAPH_ON_TAU_S = 120; // onset 1–3 min (tables)
export const ANAPH_OFF_TAU_S = 600; // mediators clear over ≈ 10 min once release stops [ENG]
export const ANAPH_EPI_STABILISE = 0.8; // β2 mast-cell stabilisation at full β2 effect [ENG, Q56]
export const COND_TAU_S = 600; // SIRS / hypermetabolic / storm smoothing [ENG]

export function createConditions(): ConditionState {
  return {
    sepsis: { target: 0, cur: 0, tauS: 600 }, anaph: { target: 0, mediator: 0 }, sirs: { target: 0, cur: 0 },
    hypermet: { target: 0, cur: 0 }, storm: { target: 0, cur: 0 },
  };
}

const relax = (cur: number, target: number, tau: number, dt: number) => target + (cur - target) * Math.exp(-dt / tau);

/** 1 Hz step. `beta2` is EXOGENOUS (7g) epinephrine's β2 effect (0–1, effects.ts `mastB2`): it stabilises mast cells. */
export function stepConditions(c: ConditionState, beta2: number, dtS: number): void {
  c.sepsis.cur = relax(c.sepsis.cur, c.sepsis.target, c.sepsis.tauS, dtS);
  const release = c.anaph.target * (1 - ANAPH_EPI_STABILISE * Math.min(1, Math.max(0, beta2)));
  c.anaph.mediator = relax(c.anaph.mediator, release, release > c.anaph.mediator ? ANAPH_ON_TAU_S : ANAPH_OFF_TAU_S, dtS);
  c.sirs.cur = relax(c.sirs.cur, c.sirs.target, COND_TAU_S, dtS);
  c.hypermet.cur = relax(c.hypermet.cur, c.hypermet.target, COND_TAU_S, dtS);
  c.storm.cur = relax(c.storm.cur, c.storm.target, COND_TAU_S, dtS);
}

/** The combined effects of sepsis, anaphylaxis, SIRS and the hypermetabolic state (thyroid storm is thyroid.ts's). */
export function conditionEffects(c: ConditionState): ConditionEffects {
  const scale = (r: Row, s: number): Row => interp([NEUTRAL_CONDITIONS, r], s);
  return combine([
    interp(SEPSIS, c.sepsis.cur),
    interp(ANAPH, c.anaph.mediator * 4), // mediator 0–1 → grade 0–4 (severity 0.5 = II, 0.75 = III, 1 = IV)
    scale(SIRS, c.sirs.cur),
    scale(HYPERMET, c.hypermet.cur),
  ]);
}

/** `condition { id: 'sepsis', phase }` → the stage target (severity 0–1 scales it). */
export const SEPSIS_PHASES = { sirs: 1, sepsis: 2, warm: 3, cold: 4 } as const;
```

- [x] **Step 5: Run the tests and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo/conditions.test.ts && npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck`
Expected: PASS (4 tests), typecheck clean.

- [x] **Step 6: Commit and push**

```bash
git add packages/engine-core/test/l2/endo/conditions.test.ts packages/engine-core/src/l2/endo/thyroid.ts packages/engine-core/src/l2/endo/conditions.ts
git commit -m "feat(endo): thyroid profiles/storm and system conditions — sepsis SIRS→warm→cold, anaphylaxis with exogenous-epinephrine mast-cell stabilisation, SIRS, hypermetabolic (tables §5c, §5e)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7e-endocrine-thermal
```

### Task 10: The 1 Hz endocrine core (`l2/endo/core.ts`) — profiles, hypoglycaemia counter-regulation, 7c's DKA as an input

**Files:**
- Create: `packages/engine-core/src/l2/endo/core.ts`
- Test: `packages/engine-core/test/l2/endo/core.test.ts`

**Interfaces:**
- Consumes: Tasks 6–9 (`tempHrF` from `thermal/metabolic.ts`).
- Produces: `interface EndoProfile { diabetes; thyroid; adrenalInsufficiency }`, `DEFAULT_ENDO_PROFILE`, `glucoseProfile(p)`, `interface EndoInputs { noxious; antinoc; mapMmHg; sao2; paco2; tempC; mhActivity; liverF; weightKg; betaBlock; betaBlockC; epiExoPgMl; bronchoDilExt; dkaSeverity }`, `NEUTRAL_ENDO_INPUTS`, `interface EndoCore { profile; hormones; glucose; cond; x; out }`, `interface EndoOut` (`hrF`, `condHrF`, `feverHrF`, `feverHrFExcess`, `svrF`, `eesF`, `dV0Frac`, `vo2F`, `setShiftC`, `kShift`, `kfMult`, `vasoResp`, `anaphLung`, glucose/insulin/hormones, `symp`, `stressIndex`, `neuroglycopenia`, `stress`, `cond`), `createEndoCore(profile?, weightKg = 70)`, `stepEndoCore(c, x, dtS)`.

- [x] **Step 1: Write the failing test** `packages/engine-core/test/l2/endo/core.test.ts`

```ts
// The 1 Hz endocrine core (EndoOut) — resting identity, sepsis bundle, MH tachycardia, DKA (7c's severity), hypoglycaemia.
import { describe, expect, it } from 'vitest';
import { createEndoCore, NEUTRAL_ENDO_INPUTS, stepEndoCore } from '../../../src/l2/endo/core.ts';
import { insulinInfusion } from '../../../src/l2/endo/glucose.ts';

const X = NEUTRAL_ENDO_INPUTS;
const T1 = { diabetes: 'type1', thyroid: 'normal', adrenalInsufficiency: false } as const;

describe('endocrine core', { timeout: 60_000 }, () => {
  it('rest: every haemodynamic/metabolic multiplier is exactly 1 for 24 h (Stage 1–3 outputs untouched)', () => {
    const c = createEndoCore();
    for (let s = 0; s < 86_400; s++) stepEndoCore(c, X, 1);
    const o = c.out;
    expect([o.hrF, o.feverHrF, o.svrF, o.eesF, o.vo2F, o.kfMult, o.vasoResp]).toEqual([1, 1, 1, 1, 1, 1, 1]);
    expect(o.dV0Frac).toBe(0);
    expect(o.setShiftC).toBe(0);
    expect(o.kShift).toBeCloseTo(0, 12);
    expect(o.anaphLung).toBe(0);
    expect(o.glucoseMgDl).toBeCloseTo(100, 6);
    expect(o.stressIndex).toBe(0);
  });

  it('warm septic shock (MANUAL composite): HR × 1.4–1.7 (the stress path adds to the row), SVR × 0.35–0.6 at 60 min', () => {
    const c = createEndoCore();
    c.cond.sepsis.target = 3;
    for (let s = 0; s < 3600; s++) stepEndoCore(c, X, 1);
    const manualHr = c.out.hrF * c.out.condHrF; // MANUAL composite (MODELED: 7a's reflex supplies the condition's part)
    expect(manualHr).toBeGreaterThanOrEqual(1.4);
    expect(manualHr).toBeLessThanOrEqual(1.7);
    expect(c.out.svrF).toBeGreaterThanOrEqual(0.35);
    expect(c.out.svrF).toBeLessThanOrEqual(0.6);
  });

  it('MH activity 1: HR +30–50 bpm from 75 (× 1.4–1.67) through the sympathoadrenal drive; K efflux +1 mmol/L', () => {
    const c = createEndoCore();
    for (let s = 0; s < 1800; s++) stepEndoCore(c, { ...X, mhActivity: 1 }, 1);
    expect(c.out.hrF).toBeGreaterThanOrEqual(1.4);
    expect(c.out.hrF).toBeLessThanOrEqual(1.67);
    expect(c.out.kShift).toBeGreaterThan(0.5); // efflux minus the endogenous-epinephrine β2 uptake
  });

  it('fever HR is a temperature term apart from the β-mediated hrF: 39 °C → × 1.18 even with full 7a β-blockade', () => {
    const c = createEndoCore();
    stepEndoCore(c, { ...X, tempC: 39, betaBlock: 1, betaBlockC: 1 }, 1);
    expect(c.out.feverHrF).toBeCloseTo(1.18, 9);
    expect(c.out.hrF).toBe(1);
  });

  it('DKA (7c publishes the severity): glucose > 250 mg/dL within 2 h', () => {
    const c = createEndoCore(T1);
    for (let s = 0; s < 2 * 3600; s++) stepEndoCore(c, { ...X, dkaSeverity: 1 }, 1);
    expect(c.out.glucoseMgDl).toBeGreaterThan(250);
  });

  it('type 1 on basal insulin + insulin 20 U/h under GA: glucose < 65 mg/dL and HR × ≥ 1.2; the exogenous insulin adds no 7e K shift', () => {
    const c = createEndoCore(T1);
    insulinInfusion(c.glucose, 20); // the "wrong infusion" (10× a 2 U/h sliding scale)
    let hr = 1;
    let gmin = 999;
    for (let s = 0; s < 3 * 3600; s++) {
      stepEndoCore(c, { ...X, noxious: 0.5, antinoc: 0.6 }, 1);
      hr = Math.max(hr, c.out.hrF);
      gmin = Math.min(gmin, c.out.glucoseMgDl);
    }
    expect(gmin).toBeLessThan(65);
    expect(hr).toBeGreaterThanOrEqual(1.2);
    expect(c.out.kShift - c.out.stress.kShift).toBeCloseTo(0, 9); // insulin term 0: 7g's bus.metabolic.kShift carries it
  });

  it('anaphylaxis grade III → 7b severity 0.6 (its grade III) at the mediator plateau; 7g bronchodilation relieves it', () => {
    const c = createEndoCore();
    c.cond.anaph.target = 0.75;
    for (let s = 0; s < 1800; s++) stepEndoCore(c, X, 1);
    expect(c.out.anaphLung).toBeGreaterThan(0.45); // the endogenous epinephrine surge relieves a little
    expect(c.out.anaphLung).toBeLessThanOrEqual(0.6);
    stepEndoCore(c, { ...X, bronchoDilExt: 1 }, 1);
    expect(c.out.anaphLung).toBeLessThan(0.3);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo/core.test.ts`
Expected: FAIL — the module under test does not exist yet (`Failed to resolve import`).

- [x] **Step 3: Implement** `packages/engine-core/src/l2/endo/core.ts`

```ts
// Stage 7e endocrine/metabolic core: one engine-independent 1 Hz step that combines stress hormones, glucose–insulin,
// thyroid, system conditions and MH/thermal metabolism into EndoOut — the only thing the adapters read. Plain data.
// Drugs are Stage 7g's (R51 §1–3): dextrose/insulin reach the glucose model through the pipeline's dose observer,
// exogenous epinephrine arrives as a plasma-equivalent input, dantrolene acts in the thermal module. DKA is Stage 7c's
// condition: its severity (7c's `blood.out.dkaSeverity`) is an INPUT here, never an output (no ketone drive back).
import { tempHrF } from '../thermal/metabolic.ts';
import { conditionEffects, createConditions, stepConditions, type ConditionEffects, type ConditionState } from './conditions.ts';
import { stressEffects, type StressEffects } from './effects.ts';
import { createGlucose, stepGlucose, type GlucoseState } from './glucose.ts';
import { createHormones, stepHormones, type HormoneState } from './hormones.ts';
import {
  EPI_BASAL_PG_ML, HYPO_EPI_THRESHOLD_MGDL, IB_UU_ML, INS_K_PER_UU, INS_N_PER_MIN, MGDL_PER_MMOL, MH_K_EFFLUX, NEUROGLYCOPENIA_MGDL,
  SYMP_HYPOGLY_PER_MGDL, VI_ML_KG,
} from './params.ts';
import { thyroidEffects, type ThyroidState } from './thyroid.ts';

export interface EndoProfile {
  diabetes: 'none' | 'type1' | 'type2';
  thyroid: ThyroidState;
  adrenalInsufficiency: boolean;
}

export const DEFAULT_ENDO_PROFILE: EndoProfile = { diabetes: 'none', thyroid: 'normal', adrenalInsufficiency: false };

/** Resolved per-profile glucose parameters (tables §5c SI diabetic 1–3e-4 → × 0.3; type 2 fasting ≈ 8 mmol/L). */
export function glucoseProfile(p: EndoProfile): { gb: number; si: number; beta: number; glucagon: number; basalExo: boolean } {
  if (p.diabetes === 'type1') return { gb: 130, si: 1, beta: 0, glucagon: 0, basalExo: true };
  if (p.diabetes === 'type2') return { gb: 144, si: 0.3, beta: 1, glucagon: 1, basalExo: false };
  return { gb: 100, si: 1, beta: 1, glucagon: 1, basalExo: false };
}

export interface EndoInputs {
  noxious: number;
  antinoc: number;
  mapMmHg: number;
  sao2: number;
  paco2: number;
  tempC: number; // core temperature (the fever HR term)
  mhActivity: number; // thermal (0–1)
  liverF: number; // 7d `organs.liver.glucoseF` (1 normal)
  weightKg: number;
  betaBlock: number; // 7a `prof.betaBlock` (HR)
  betaBlockC: number; // 7a `prof.betaBlockC` (contractility)
  epiExoPgMl: number; // 7g epinephrine as plasma pg/mL
  bronchoDilExt: number; // 7g `bus.airway.bronchodilation` (0–1)
  dkaSeverity: number; // 7c (0–1)
}

export const NEUTRAL_ENDO_INPUTS: EndoInputs = {
  noxious: 0, antinoc: 0, mapMmHg: 85, sao2: 0.97, paco2: 40, tempC: 36.8, mhActivity: 0, liverF: 1, weightKg: 70, betaBlock: 0, betaBlockC: 0,
  epiExoPgMl: 0, bronchoDilExt: 0, dkaSeverity: 0,
};

export interface EndoCore {
  profile: EndoProfile;
  hormones: HormoneState;
  glucose: GlucoseState;
  cond: ConditionState;
  x: EndoInputs; // the last inputs (compose reads the β-block, temperature, MH and 7g's bronchodilation from them)
  out: EndoOut;
}

export interface EndoOut {
  hrF: number; // stress × thyroid HR (β-mediated: 7a/7g blunt it)
  condHrF: number; // the conditions' HR rows (tables §5e `hrRest +`): the MANUAL composite of their reflex and fever tachycardia
  feverHrF: number; // core-temperature HR term (NOT β-mediated: applied unblunted, R51 addendum 16) — MODELED
  feverHrFExcess: number; // the same above the endocrine set-point shift (the conditions' fever is in condHrF) — MANUAL
  svrF: number;
  eesF: number;
  dV0Frac: number; // + fraction of BLOOD VOLUME moved into the unstressed pool (+ = venodilation); 7a's sign is the opposite
  vo2F: number; // endocrine metabolic rate × (thyroid, conditions): VO2, VCO2 and heat (thermal.extraX)
  setShiftC: number; // fever set point added to the thermal thresholds
  kShift: number; // mmol/L ENDOGENOUS K set-point shift (endogenous epinephrine β2, secreted insulin, MH efflux) → 7c
  kfMult: number; // → 7c `blood.core.fl.kfMult`
  vasoResp: number; // → `ps.cond.vasoResp` (7g)
  anaphLung: number; // 7b `lungCondition anaphylaxis` severity (0–1; grade/5 relieved by β2 bronchodilation)
  glucoseMgDl: number;
  glucoseMmol: number;
  insulinUuMl: number;
  epiPgMl: number; // total plasma epinephrine (endogenous + 7g's)
  nePgMl: number;
  cortisolNmolL: number;
  symp: number;
  stressIndex: number; // 0–100, instructor only
  neuroglycopenia: number; // 0–1 → 7f BIS/depth
  stress: StressEffects;
  cond: ConditionEffects;
}

export function createEndoCore(profile: EndoProfile = DEFAULT_ENDO_PROFILE, weightKg = 70): EndoCore {
  const gp = glucoseProfile(profile);
  const glucose = createGlucose(gp.gb);
  if (gp.basalExo) {
    glucose.basalExoUuMin = INS_N_PER_MIN * VI_ML_KG * weightKg * IB_UU_ML; // long-acting basal insulin replaces secretion
    glucose.iExo = IB_UU_ML;
  }
  const c: EndoCore = {
    profile, hormones: createHormones(), glucose, cond: createConditions(), x: { ...NEUTRAL_ENDO_INPUTS, weightKg }, out: null as unknown as EndoOut,
  };
  c.out = compose(c);
  return c;
}

/** β2 bronchodilation of endogenous + 7g epinephrine and 7g's other β2 agonists (independent effects combine). */
const orCombine = (a: number, b: number) => 1 - (1 - a) * (1 - Math.min(1, Math.max(0, b)));

function compose(c: EndoCore): EndoOut {
  const p = c.profile;
  const x = c.x;
  const cortResponse = p.adrenalInsufficiency ? 0.5 : 1;
  const st = stressEffects(c.hormones, { hr: x.betaBlock, c: x.betaBlockC }, cortResponse);
  const th = thyroidEffects(p.thyroid, c.cond.storm.cur);
  const cd = conditionEffects(c.cond);
  // catecholamine responsiveness (tables §5e `vasoResp`: septic hyporesponsiveness, cortisol's permissive effect) and the
  // thyroid β sensitivity scale the EXCESS of the stress effects (neural and humoral), not the condition rows
  const vr = st.vasoResp * cd.vasoResp;
  const beta = (v: number) => 1 + (v - 1) * th.betaSens * vr;
  const alpha = (v: number) => 1 + (v - 1) * vr;
  const h = c.hormones;
  const g = c.glucose;
  const setShiftC = th.setShiftC + cd.setShiftC;
  const epiTotal = h.epi + h.epiExo;
  const lg = Math.log2(Math.max(1, epiTotal / EPI_BASAL_PG_ML));
  const bd = orCombine(st.bronchoDil, x.bronchoDilExt);
  return {
    hrF: beta(st.hrF) * th.hrF,
    condHrF: cd.hrF,
    feverHrF: tempHrF(x.tempC),
    // MANUAL: the fever tachycardia of a condition is already in its HR row, so the temperature term sees only the core
    // ABOVE the endocrine set-point shift (MH, exogenous heat, a MANUAL target) — prototype: counting it twice gave HR 153
    feverHrFExcess: tempHrF(x.tempC - setShiftC),
    svrF: alpha(st.svrF) * th.svrF * cd.svrF,
    eesF: beta(st.eesF) * th.eesF * cd.eesF,
    dV0Frac: st.dV0Frac + cd.dV0Frac,
    vo2F: th.vo2F * cd.vo2F,
    setShiftC,
    kShift: st.kShift + INS_K_PER_UU * Math.max(0, g.i - g.iExo - IB_UU_ML) + MH_K_EFFLUX * x.mhActivity,
    kfMult: cd.kfMult,
    vasoResp: vr,
    anaphLung: 0.8 * c.cond.anaph.mediator * (1 - 0.6 * bd), // mediator 0.75 (grade III) → 7b severity 0.6 (its grade III)
    glucoseMgDl: g.g,
    glucoseMmol: g.g / MGDL_PER_MMOL,
    insulinUuMl: g.i,
    epiPgMl: epiTotal,
    nePgMl: h.ne,
    cortisolNmolL: h.cort,
    symp: h.symp,
    stressIndex: Math.round(100 * (1 - Math.exp(-(h.symp + lg / 2) / 1.5))),
    neuroglycopenia: Math.min(1, Math.max(0, (NEUROGLYCOPENIA_MGDL + 10 - g.g) / 30)), // 0 at 60 mg/dL, 1 at 30
    stress: st,
    cond: cd,
  };
}

export function stepEndoCore(c: EndoCore, x: EndoInputs, dtS: number): void {
  c.x = x;
  const g = c.glucose;
  const hypo = Math.max(0, HYPO_EPI_THRESHOLD_MGDL - g.g) * SYMP_HYPOGLY_PER_MGDL;
  const cd = c.out.cond;
  stepHormones(c.hormones, {
    noxious: x.noxious, antinoc: x.antinoc, extraSymp: cd.extraSymp + hypo + 2 * x.mhActivity,
    glucoseMgDl: g.g, mapMmHg: x.mapMmHg, sao2: x.sao2, paco2: x.paco2,
    cortResponse: c.profile.adrenalInsufficiency ? 0.5 : 1, epiExoPgMl: x.epiExoPgMl,
  }, dtS);
  stepConditions(c.cond, c.out.stress.mastB2, dtS);
  const st = stressEffects(c.hormones, { hr: x.betaBlock, c: x.betaBlockC }, c.profile.adrenalInsufficiency ? 0.5 : 1);
  const gp = glucoseProfile(c.profile);
  const dka = Math.min(1, Math.max(0, x.dkaSeverity));
  stepGlucose(g, {
    weightKg: x.weightKg, egpF: st.egpF * x.liverF * (1 + dka), siF: st.siF * gp.si * cd.siF * (1 - 0.5 * dka), secF: st.secF,
    beta: gp.beta * (1 - dka), glucagon: gp.glucagon, dt: dtS,
  });
  c.out = compose(c);
}
```

- [x] **Step 4: Run the tests and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo/core.test.ts && npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck`
Expected: PASS (7 tests), typecheck clean.

- [x] **Step 5: Commit and push**

```bash
git add packages/engine-core/test/l2/endo/core.test.ts packages/engine-core/src/l2/endo/core.ts
git commit -m "feat(endo): 1 Hz endocrine core — profiles, hypoglycaemic sympathoadrenal drive, fever HR apart from the β path, endogenous K term, 7c's DKA as an input" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7e-endocrine-thermal
```

### Task 11: Adapters (`l2/endo/adapters.ts`) and the pipeline (`l2/endo/pipeline.ts`)

**Files:**
- Create: `packages/engine-core/src/l2/endo/adapters.ts`, `packages/engine-core/src/l2/endo/pipeline.ts`
- Test: `packages/engine-core/test/l2/endo/adapters.test.ts`, `packages/engine-core/test/l2/endo/pipeline.test.ts`

**Interfaces:**
- Consumes: Tasks 1–10; `l1Value`/`createL1State` (`l1/state.ts`), `HemoState`, `RespState` and `applyLungSpecs` (`l2/resp/pipeline.ts`, 7b), `betaBlunt` (`l2/pk/pd.ts`, 7g), `Modifiers`/`defaultModifiers`. Names read (R51 addendum 16): `hemo.circ.{beats, ext, prof.betaBlock, prof.betaBlockC, prof.bloodVolumeMl, base.v0Sv}`, `ps.pk.{bus.doses, bus.agents.epinephrine.brain, bus.airway.bronchodilation, bus.metabolic.dantroleneE, bus.volatiles, betaBlockAdd, drugs.<id>.rate}`, `ps.blood.{out.dkaSeverity, core.so.keto, core.fl.{vp, visf, kfMult}}`, `ps.organs.liver.glucoseF`, `ps.neuro.{antinoc, nmb, thermoDepth}`.
- Produces: `interface EndoState { core; k; noxious; weightKg; ecg; kfMult; lungSev; out }`, `interface EndoCtx { l1; hemo; resp; ps }`, `resolveEndoProfile(profile)`, `createEndoState(profile, weightKg)`, `advanceEndo(es, ctx, tEnd)`, `validateEndoCommand(cmd)`, `applyEndoCommand(es, rs, cmd, t)`; adapters `PkLike`, `pkOf(ps)`, `circOf(ctx)`, `pkActive(pk)`, `readEndoInputs(ctx, es, t)`, `observeDoses(es, pk)`, `readInfusions(es, pk)`, `preBlunt(target, b)`, `endoHr(es, betaBlockAdd, modeled)`, `writeCirc(ctx, es): number` (the MANUAL rhythm-clock factor; 1 in MODELED), `writeBlood(ps, es)`, `writeCond(ps, es)`, `writeLung(rs, es)`, `ecgDeltas(es, th, mods)`.

- [ ] **Step 1: Write the failing tests** `packages/engine-core/test/l2/endo/adapters.test.ts`

```ts
// Stage 7e adapters: fallbacks and the duck-typed seams (7a circ.ext, 7c blood.core, 7f neuro, 7d organs, 7g bus).
import { describe, expect, it } from 'vitest';
import { createL1State } from '../../../src/l1/state.ts';
import { defaultModifiers } from '../../../src/modifiers.ts';
import { betaBlunt } from '../../../src/l2/pk/pd.ts';
import { ecgDeltas, observeDoses, pkActive, preBlunt, readEndoInputs, readInfusions, writeBlood, writeCirc, writeCond } from '../../../src/l2/endo/adapters.ts';
import { createEndoState, type EndoCtx } from '../../../src/l2/endo/pipeline.ts';
import { createThermal } from '../../../src/l2/thermal/heat.ts';

function ctx(ps: Record<string, unknown> = {}, hemo: Record<string, unknown> = {}, mode: 'manual' | 'modeled' = 'manual'): EndoCtx {
  const temp = createThermal(36.8, 70);
  const resp = { temp, o2: { sa: 0.97 }, co2: { pf: 40 }, lungSpecs: [] } as unknown as EndoCtx['resp'];
  const l1 = createL1State();
  l1.mode = mode;
  return { l1, hemo: hemo as unknown as EndoCtx['hemo'], resp, ps };
}
const circ = () => ({ ext: {} as Record<string, number>, prof: { betaBlock: 0, betaBlockC: 0, bloodVolumeMl: 5000 }, base: { v0Sv: 2500 }, beats: [{ map: 90 }] });

describe('Stage 7e adapters', () => {
  it('fallbacks: MAP from the L1 truth (120/80 → 93.3) without a circuit, gas truths from Stage 3, antinociception 0 awake, 0.6 under the GA flag', () => {
    const c = ctx();
    const es = createEndoState(undefined, 70);
    const x = readEndoInputs(c, es, 1);
    expect(x.mapMmHg).toBeCloseTo(93.33, 2);
    expect([x.sao2, x.paco2, x.antinoc, x.betaBlock, x.epiExoPgMl, x.dkaSeverity, x.liverF]).toEqual([0.97, 40, 0, 0, 0, 0, 1]);
    c.resp.temp.anaesthesia = 'general';
    c.resp.temp.depth = 1;
    expect(readEndoInputs(c, es, 1).antinoc).toBeCloseTo(0.6, 9);
  });

  it('7f/7d/7a/7c/7g reads: thermoDepth/nmb always; 7f antinoc only while 7g has an active agent; β-block from 7a; DKA from 7c', () => {
    const es = createEndoState(undefined, 70);
    const neuro = { antinoc: 0.9, nmb: 1, thermoDepth: 0.7 };
    const idle = ctx({ neuro, organs: { liver: { glucoseF: 0.5 } }, pk: { bus: { agents: {}, volatiles: {} } } }, { circ: { ...circ(), prof: { betaBlock: 0.5, betaBlockC: 0.25, bloodVolumeMl: 5000 } } });
    const x = readEndoInputs(idle, es, 1);
    expect(x.antinoc).toBe(0); // 7f present but no drug acting: the GA-flag fallback (awake → 0)
    expect([x.liverF, x.betaBlock, x.betaBlockC, x.mapMmHg]).toEqual([0.5, 0.5, 0.25, 90]);
    expect(idle.resp.temp.nmb).toBe(1);
    expect(idle.resp.temp.depthIn).toBe(0.7);
    const busy = ctx({ neuro, pk: { bus: { agents: { epinephrine: { brain: 0.05 } }, airway: { bronchodilation: 0.4 } } }, blood: { out: { dkaSeverity: 0.8 } } });
    const y = readEndoInputs(busy, es, 1);
    expect(y.antinoc).toBe(0.9);
    expect(y.epiExoPgMl).toBeCloseTo(728.2, 1); // 0.05 µg/kg/min rate-equivalent ÷ 68.66 mL/min/kg
    expect(y.bronchoDilExt).toBe(0.4);
    expect(y.dkaSeverity).toBe(0.8);
    expect(pkActive({ bus: { volatiles: { sevoflurane: { macFrac: 1 } } } })).toBe(true);
    const keto = ctx({ blood: { core: { so: { keto: 150 }, fl: { vp: 3000, visf: 12000 } } } });
    expect(readEndoInputs(keto, es, 1).dkaSeverity).toBeCloseTo(0.4, 9); // 10 mmol/L ÷ 25 (fallback when 7c publishes no severity)
  });

  it('7g doses and infusions: dextrose 25 000 mg → +210 mg/dL; insulin units; infusion rates from pk.drugs.<id>.rate', () => {
    const es = createEndoState(undefined, 70);
    observeDoses(es, { bus: { doses: [{ agent: 'dextrose', amount: 25_000, amountUnit: 'mg' }, { agent: 'propofol', amount: 140, amountUnit: 'mg' }] } });
    expect(es.core.glucose.g).toBeCloseTo(100 + 25_000 / (1.7 * 70), 6);
    observeDoses(es, { bus: { doses: [{ agent: 'insulin', amount: 10, amountUnit: 'units' }] } });
    expect(es.core.glucose.iExo).toBeCloseTo(1e7 / (120 * 70), 6);
    readInfusions(es, { drugs: { insulin: { rate: 4 / 60 }, dextrose: { rate: 10_000 / 60 } } });
    expect(es.core.glucose.insUuMin).toBeCloseTo((4 * 1e6) / 60, 6);
    expect(es.core.glucose.dexMgMin).toBeCloseTo(10_000 / 60, 6);
  });

  it('MODELED: circ.ext.endo* written even though 7a’s initialiser omits them; V0 sign/unit per 7a; at rest exactly neutral', () => {
    const es = createEndoState(undefined, 70);
    const cm = circ();
    const c = ctx({}, { circ: cm }, 'modeled');
    expect(writeCirc(c, es)).toBe(1);
    expect(cm.ext).toEqual({ endoHrF: 1, endoSvrF: 1, endoEesF: 1, endoDV0Frac: -0 });
    es.core.out = { ...es.core.out, hrF: 1.6, svrF: 0.5, eesF: 0.9, dV0Frac: 0.12 };
    writeCirc(c, es);
    expect(cm.ext.endoSvrF).toBe(0.5);
    expect(cm.ext.endoDV0Frac).toBeCloseTo((-0.12 * 5000) / 2500, 12); // venodilation = NEGATIVE 7a fraction (V0 × 1.24)
    expect(cm.ext.endoHrF).toBeCloseTo(1.6, 12);
  });

  it('F4: a β-blocked (7g) patient with fever keeps the fever tachycardia: 7a’s betaBlunt(endoHrF) = betaBlunt(stress) × fever', () => {
    const es = createEndoState(undefined, 70);
    es.core.out = { ...es.core.out, hrF: 1.3, feverHrF: 1.18 }; // 39 °C: +12 %/°C above 37.5 (≈ 9 bpm/°C at 75)
    const cm = circ();
    const c = ctx({ pk: { betaBlockAdd: 0.8 } }, { circ: cm }, 'modeled');
    writeCirc(c, es);
    const seen = betaBlunt(cm.ext.endoHrF as number, 0.8); // what 7a's control() applies
    expect(seen).toBeCloseTo(betaBlunt(1.3, 0.8) * 1.18, 12);
    expect(seen / betaBlunt(1.3, 0.8) - 1).toBeGreaterThanOrEqual(0.08 * 1.5); // ≥ +8 %/°C over the 1.5 °C above 37.5
    expect(preBlunt(0.9, 0.8)).toBe(0.9); // ≤ 1 passes through (betaBlunt does not touch it)
  });

  it('MANUAL: 7a keys neutral, the rhythm-clock factor = betaBlunt(stress × condition rows, 7g) × fever above the set point; 1 when hr is pinned', () => {
    const es = createEndoState(undefined, 70);
    es.core.out = { ...es.core.out, hrF: 1.3, condHrF: 1, feverHrF: 1.3, feverHrFExcess: 1.1 }; // MANUAL uses the excess above the set point
    const cm = circ();
    cm.ext.endoHrF = 1.5;
    const c = ctx({ pk: { betaBlockAdd: 0.5 } }, { circ: cm });
    expect(writeCirc(c, es)).toBeCloseTo(1.15 * 1.1, 12);
    expect(cm.ext.endoHrF).toBe(1);
    c.l1.pinned.push('hr');
    expect(writeCirc(c, es)).toBe(1);
  });

  it('7c/7g writes: endoKShift, lab glucose, kfMult only on change; ps.cond.vasoResp', () => {
    const es = createEndoState(undefined, 70);
    expect(writeBlood({}, es)).toBe(false);
    const ps = { blood: { core: { fl: { kfMult: 2 } } as Record<string, unknown> } };
    expect(writeBlood(ps, es)).toBe(true);
    expect(ps.blood.core.endoGlucoseMgDl).toBeCloseTo(100, 6);
    expect(ps.blood.core.endoKShift).toBeCloseTo(0, 12);
    expect((ps.blood.core.fl as { kfMult: number }).kfMult).toBe(2); // another writer's value survives a resting 7e
    es.core.out = { ...es.core.out, kfMult: 3 };
    writeBlood(ps, es);
    expect((ps.blood.core.fl as { kfMult: number }).kfMult).toBe(3);
    const q: { cond?: { vasoResp: number } } = {};
    writeCond(q, es);
    expect(q.cond).toEqual({ vasoResp: 1 });
  });

  it('ECG deltas: nothing at rest; a 3 °C core fall lowers mods.tempC by 3 and keeps an instructor offset', () => {
    const es = createEndoState(undefined, 70);
    const th = createThermal(36.8, 70);
    const m0 = { ...defaultModifiers(), tempC: 36 }; // instructor-set
    expect(ecgDeltas(es, th, m0)).toBe(m0);
    th.tc = 33.8;
    const m1 = ecgDeltas(es, th, m0);
    expect(m1.tempC).toBeCloseTo(33, 9);
    expect(ecgDeltas(es, th, m1)).toBe(m1); // no change → same object
  });
});
```

- [ ] **Step 2: Write the failing tests** `packages/engine-core/test/l2/endo/pipeline.test.ts`

```ts
// Stage 7e pipeline: command validation/application and the 1 Hz endo event (engine-independent).
import { describe, expect, it } from 'vitest';
import type { Command } from '../../../src/types.ts';
import { createL1State } from '../../../src/l1/state.ts';
import { advanceEndo, applyEndoCommand, createEndoState, validateEndoCommand } from '../../../src/l2/endo/pipeline.ts';
import { tempFactor } from '../../../src/l2/gas/params.ts';
import { createThermal, stepThermal } from '../../../src/l2/thermal/heat.ts';
import { thermalMetabolic } from '../../../src/l2/thermal/metabolic.ts';

const ev = (event: Record<string, unknown>) => ({ type: 'applyEvent', event }) as unknown as Command;
function rig(ps: Record<string, unknown> = {}, profile: Record<string, unknown> = { endo: { diabetes: 'type2' } }) {
  const temp = createThermal(36.8, 70);
  const resp = { temp, o2: { sa: 0.97 }, co2: { pf: 40 }, lungSpecs: [] } as never;
  const es = createEndoState(profile as never, 70);
  return { es, resp: resp as { temp: typeof temp }, ctx: { l1: createL1State(), hemo: {} as never, resp, ps } };
}

describe('Stage 7e pipeline', () => {
  it('validates its own commands and returns null for everything else (every drug, mh, dka, airway)', () => {
    expect(validateEndoCommand(ev({ kind: 'stimulus', intensity: 1.5 }))).toBeUndefined();
    expect(validateEndoCommand(ev({ kind: 'stimulus', intensity: 3 }))).toMatch(/intensity/);
    expect(validateEndoCommand(ev({ kind: 'stimulus' }))).toMatch(/required/);
    expect(validateEndoCommand(ev({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'cold' }))).toBeUndefined();
    expect(validateEndoCommand(ev({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'hot' }))).toMatch(/phase/);
    expect(validateEndoCommand(ev({ kind: 'thermal7e', exposure: 'prep', fluidWarmer: true }))).toBeUndefined();
    for (const drugId of ['dantrolene', 'dextrose', 'insulin', 'epinephrine']) {
      expect(validateEndoCommand(ev({ kind: 'drug', drugId, dose: 1, unit: 'mg', route: 'iv' }))).toBeNull(); // 7g's (R51 §3)
    }
    expect(validateEndoCommand(ev({ kind: 'condition', id: 'mh', severity: 1 }))).toBeNull();
    expect(validateEndoCommand(ev({ kind: 'condition', id: 'dka', severity: 1 }))).toBeNull();
    expect(validateEndoCommand(ev({ kind: 'airway', state: 'patent' }))).toBeNull();
  });

  it('profile: type 2 fasting glucose 144 mg/dL in the endo event, 1 Hz', () => {
    const { es, ctx } = rig();
    advanceEndo(es, ctx as never, 5);
    const e = es.out.filter((x) => x.type === 'endo');
    expect(e.map((x) => x.t)).toEqual([1, 2, 3, 4, 5]);
    expect((e[4] as { glucoseMgDl: number }).glucoseMgDl).toBe(144);
  });

  it('applies stimulus, thermal7e and conditions; hands 7g’s dantrolene effect to the heat model every pass', () => {
    const { es, resp, ctx } = rig({ pk: { bus: { metabolic: { dantroleneE: 0.5 } } } });
    const r = resp as never;
    expect(applyEndoCommand(es, r, ev({ kind: 'stimulus', intensity: 1 }), 0)).toBe(true);
    expect(es.noxious).toBe(1);
    expect(applyEndoCommand(es, r, ev({ kind: 'thermal7e', exposure: 'prep', fluidWarmer: true }), 0)).toBe(true);
    expect([resp.temp.exposure, resp.temp.fluidWarmer]).toEqual(['prep', true]);
    expect(applyEndoCommand(es, r, ev({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'cold', rampS: 1200 }), 0)).toBe(true);
    expect(es.core.cond.sepsis).toMatchObject({ target: 4, tauS: 1200 });
    expect(applyEndoCommand(es, r, ev({ kind: 'condition', id: 'dka', severity: 0.8 }), 0)).toBe(false); // 7c's
    advanceEndo(es, ctx as never, 0.5);
    expect(resp.temp.dantE).toBe(0.5);
  });

  it('writes the endocrine heat and fever into the thermal state (thyroid storm → extraX > 1.3, feverShift > 1)', () => {
    const { es, resp, ctx } = rig();
    applyEndoCommand(es, resp as never, ev({ kind: 'condition', id: 'thyroidStorm', severity: 1 }), 0);
    advanceEndo(es, ctx as never, 3600);
    expect(resp.temp.extraX).toBeGreaterThan(1.3);
    expect(resp.temp.feverShift).toBeGreaterThan(1);
  });

  it('thyroid storm with the heat model (awake, 2 h): core 38.5–41 °C, VO2 × 1.3–1.8, HR × 1.47–2.0 (110–150), SVR × 0.55–0.65 (tables §5c)', () => {
    const { es, resp, ctx } = rig({}, {});
    applyEndoCommand(es, resp as never, ev({ kind: 'condition', id: 'thyroidStorm', severity: 1 }), 0);
    for (let s = 1; s <= 7200; s++) {
      stepThermal(resp.temp, s, 1);
      advanceEndo(es, ctx as never, s);
    }
    const o = es.core.out;
    const vo2 = tempFactor(resp.temp.tc) * thermalMetabolic(resp.temp, 7200).vo2F * resp.temp.extraX; // = metabolic(rs, t, 'o2') awake
    expect(resp.temp.tc).toBeGreaterThanOrEqual(38.5);
    expect(resp.temp.tc).toBeLessThanOrEqual(41);
    expect(vo2).toBeGreaterThanOrEqual(1.3);
    expect(vo2).toBeLessThanOrEqual(1.8);
    const hr = o.hrF * o.condHrF * o.feverHrFExcess; // MANUAL composite (the storm row carries its own fever tachycardia)
    expect(hr).toBeGreaterThanOrEqual(110 / 75);
    expect(hr).toBeLessThanOrEqual(2);
    expect(o.svrF).toBeGreaterThanOrEqual(0.55);
    expect(o.svrF).toBeLessThanOrEqual(0.65);
  });
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo/adapters.test.ts test/l2/endo/pipeline.test.ts`
Expected: FAIL — `adapters.ts` / `pipeline.ts` do not exist.

- [ ] **Step 4: Implement** `packages/engine-core/src/l2/endo/adapters.ts`

```ts
// Stage 7e adapters: read the other modules' truths (duck-typed, each with a neutral fallback) and write the
// endocrine/thermal effects back through the seams the other stages own (R51 addendum 16 names).
//   in:  MAP (7a circ beats → the L1 truth), SaO2/PaCO2/core (Stage 3), antinociception/NMB/depth (7f `neuro`; its
//        antinociception only while 7g has an active agent, else the GA-flag fallback), the profile β-blockade
//        (7a `prof.betaBlock/betaBlockC`), 7g's bus (epinephrine Ce, bronchodilation, dantrolene effect, doses,
//        insulin/dextrose infusion rates), 7c's DKA severity, 7d's liver glucose factor.
//   out: MODELED — 7a `circ.ext.endo*` (MANUAL — neutral keys and an HR factor for the rhythm clock); 7c
//        `blood.core.{endoKShift, endoGlucoseMgDl}` and `blood.core.fl.kfMult`; `ps.cond.vasoResp` (7g); 7b's
//        `lungCondition anaphylaxis`; ECG modifier deltas (tempC → Osborn, shivering artefact).
import { l1Value, type L1State } from '../../l1/state.ts';
import type { Modifiers } from '../../types.ts';
import { betaBlunt } from '../pk/pd.ts';
import { applyLungSpecs, type RespState } from '../resp/pipeline.ts';
import { cascade } from '../thermal/metabolic.ts';
import { mhActivity } from '../thermal/mh.ts';
import type { ThermalState } from '../thermal/heat.ts';
import type { EndoInputs } from './core.ts';
import { dextroseBolus, dextroseInfusion, insulinBolus, insulinInfusion } from './glucose.ts';
import { ANTINOC_GA_FALLBACK, EPI_EXO_PG_PER_RATE_EQ } from './params.ts';
import type { EndoCtx, EndoState } from './pipeline.ts';

type Neuro = { antinoc?: number; nmb?: number; thermoDepth?: number };
type DoseLike = { agent: string; amount: number; amountUnit: string };
type Bus = {
  agents?: Record<string, { brain?: number } | undefined>;
  volatiles?: Record<string, { macFrac?: number } | undefined>;
  doses?: DoseLike[];
  airway?: { bronchodilation?: number };
  metabolic?: { dantroleneE?: number };
};
/** Stage 7g's PkState as 7e reads it (R51 §1–3). */
export type PkLike = { bus?: Bus; betaBlockAdd?: number; drugs?: Record<string, { rate?: number } | undefined> };
type Circ = {
  beats?: { map: number }[];
  ext?: Record<string, unknown>;
  prof?: { betaBlock?: number; betaBlockC?: number; bloodVolumeMl?: number };
  base?: { v0Sv?: number };
};
type BloodLike = {
  out?: { dkaSeverity?: number };
  core?: { so?: { keto?: number }; fl?: { vp?: number; visf?: number; kfMult?: number }; endoKShift?: number; endoGlucoseMgDl?: number };
};

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export const pkOf = (ps: object): PkLike | undefined => (ps as { pk?: PkLike }).pk;
export const circOf = (ctx: { hemo: object }): Circ | undefined => (ctx.hemo as { circ?: Circ }).circ;
const bloodOf = (ps: object): BloodLike | undefined => (ps as { blood?: BloodLike }).blood;

/** 7g has an agent acting now (any effect-site concentration or volatile MAC fraction > 0). */
export function pkActive(pk: PkLike | undefined): boolean {
  const b = pk?.bus;
  if (!b) return false;
  for (const a of Object.values(b.agents ?? {})) if ((a?.brain ?? 0) > 0) return true;
  for (const v of Object.values(b.volatiles ?? {})) if ((v?.macFrac ?? 0) > 0) return true;
  return false;
}

function mapOf(ctx: EndoCtx, t: number): number {
  const beats = circOf(ctx)?.beats;
  const last = beats && beats.length ? beats[beats.length - 1] : undefined;
  if (last) return last.map;
  return (l1Value(ctx.l1, 'sbp', t) + 2 * l1Value(ctx.l1, 'dbp', t)) / 3;
}

/** 7c's DKA severity: `blood.out.dkaSeverity` (R51 addendum 16); fallback: 7c's ketoacid pool ÷ 25 mmol/L (its DKA at 1). */
function dkaOf(blood: BloodLike | undefined): number {
  const s = blood?.out?.dkaSeverity;
  if (num(s)) return s;
  const keto = blood?.core?.so?.keto;
  const fl = blood?.core?.fl;
  if (!num(keto) || !fl || !num(fl.vp) || !num(fl.visf)) return 0;
  return Math.min(1, Math.max(0, keto / ((fl.vp + fl.visf) / 1000) / 25));
}

export function readEndoInputs(ctx: EndoCtx, es: EndoState, t: number): EndoInputs {
  const th = ctx.resp.temp;
  const n = (ctx.ps as { neuro?: Neuro }).neuro;
  const pk = pkOf(ctx.ps);
  th.depthIn = num(n?.thermoDepth) ? n.thermoDepth : null;
  th.nmb = num(n?.nmb) ? n.nmb : 0;
  const flag = th.anaesthesia === 'general' ? ANTINOC_GA_FALLBACK * Math.min(1, th.depth) : 0;
  const antinoc = num(n?.antinoc) && pkActive(pk) ? n.antinoc : flag;
  const prof = circOf(ctx)?.prof;
  return {
    noxious: es.noxious, antinoc, mapMmHg: mapOf(ctx, t), sao2: ctx.resp.o2.sa, paco2: ctx.resp.co2.pf, tempC: th.tc,
    mhActivity: mhActivity(th.mh, t),
    liverF: (ctx.ps as { organs?: { liver?: { glucoseF?: number } } }).organs?.liver?.glucoseF ?? 1,
    weightKg: es.weightKg, betaBlock: prof?.betaBlock ?? 0, betaBlockC: prof?.betaBlockC ?? 0,
    epiExoPgMl: (pk?.bus?.agents?.epinephrine?.brain ?? 0) * EPI_EXO_PG_PER_RATE_EQ,
    bronchoDilExt: pk?.bus?.airway?.bronchodilation ?? 0,
    dkaSeverity: dkaOf(bloodOf(ctx.ps)),
  };
}

/**
 * 7g's accepted boluses (`bus.doses`, each listed for exactly one engine pass, R51 §3) → the glucose model: dextrose
 * (7g amount unit mg) and insulin (units). Called once per engine pass. `bus.metabolic.glucoseDelta` is NOT used (7e
 * owns glucose).
 */
export function observeDoses(es: EndoState, pk: PkLike | undefined): void {
  for (const d of pk?.bus?.doses ?? []) {
    if (d.agent === 'dextrose') dextroseBolus(es.core.glucose, d.amountUnit === 'mg' ? d.amount / 1000 : d.amount, es.weightKg);
    else if (d.agent === 'insulin' && d.amountUnit === 'units') insulinBolus(es.core.glucose, d.amount, es.weightKg);
  }
}

/** 7g's running infusions (`ps.pk.drugs.<id>.rate`, amount/min in the row's unit: dextrose mg, insulin units). */
export function readInfusions(es: EndoState, pk: PkLike | undefined): void {
  dextroseInfusion(es.core.glucose, ((pk?.drugs?.dextrose?.rate ?? 0) * 60) / 1000);
  insulinInfusion(es.core.glucose, (pk?.drugs?.insulin?.rate ?? 0) * 60);
}

/**
 * The endoHrF 7a must receive so that its `betaBlunt(endoHrF, b)` equals `target` (fever unblunted, R51 addendum 16).
 * betaBlunt keeps factors ≤ 1 and scales the excess above 1 by (1 − b); this is its inverse.
 */
export function preBlunt(target: number, b: number): number {
  const k = 1 - Math.min(1, Math.max(0, b));
  return target > 1 && k > 1e-6 ? 1 + (target - 1) / k : target;
}

/**
 * HR factor = the β-mediated part blunted by 7g's drug β-blockade × the temperature term (not a β effect, R51
 * addendum 16). MODELED: the stress/thyroid part and the whole fever term — a condition's reflex tachycardia emerges
 * from 7a's baroreflex, so its HR row is not applied. MANUAL (no reflex): the conditions' HR rows (the tables'
 * composite) and the fever above their set-point shift.
 */
export function endoHr(es: EndoState, betaBlockAdd: number, modeled: boolean): number {
  const o = es.core.out;
  return modeled ? betaBlunt(o.hrF, betaBlockAdd) * o.feverHrF : betaBlunt(o.hrF * o.condHrF, betaBlockAdd) * o.feverHrFExcess;
}

/**
 * The circulation seam (R51 addendum 16, F2/F3). MODELED with 7a's circuit: the four `ext.endo*` keys (7a multiplies
 * them in control(); 7g's `betaBlunt` blunts HR/Ees there), and 7a's V0 sign: `endoDV0Frac` is a fraction of the base
 * unstressed volume, POSITIVE = venoconstriction, so 7e's venodilation (+ fraction of blood volume) maps to
 * −dV0Frac·BV/base.v0Sv. Returns 1 (the rhythm clock keeps its rate: 7a drives it). MANUAL: the keys are held
 * neutral (the instructor owns the pressures; 7a's MANUAL tracker would fight them) and the return value is the HR
 * factor for the rhythm clock (1 when the instructor pinned `hr`).
 */
export function writeCirc(ctx: EndoCtx, es: EndoState): number {
  const circ = circOf(ctx);
  const ext = circ?.ext;
  const pk = pkOf(ctx.ps);
  const bba = pk?.betaBlockAdd ?? 0;
  const o = es.core.out;
  if (ctx.l1.mode === 'modeled' && ext) {
    ext.endoHrF = preBlunt(endoHr(es, bba, true), bba);
    ext.endoSvrF = o.svrF;
    ext.endoEesF = o.eesF;
    const bv = circ?.prof?.bloodVolumeMl ?? 0;
    const v0 = circ?.base?.v0Sv ?? 0;
    ext.endoDV0Frac = v0 > 0 ? (-o.dV0Frac * bv) / v0 : 0;
    return 1;
  }
  if (ext && ext.endoHrF !== undefined) {
    ext.endoHrF = 1;
    ext.endoSvrF = 1;
    ext.endoEesF = 1;
    ext.endoDV0Frac = 0;
  }
  return ctx.l1.pinned.includes('hr') ? 1 : endoHr(es, bba, false);
}

/**
 * 7c seams: the ENDOGENOUS K set-point term (`blood.core.endoKShift`, E-7e-3), the glucose for the lab panel
 * (`blood.core.endoGlucoseMgDl`, E-7e-2) and the capillary leak (`blood.core.fl.kfMult`, R51 addendum 16; written
 * only when 7e's value changes, so a resting 7e never overwrites another writer). `fl.sigma` is left to 7c: the
 * tables give no septic/anaphylactic σ, and 7c's Starling form scales only pressure-driven filtration (gap, Requests).
 * False without 7c.
 */
export function writeBlood(ps: object, es: EndoState): boolean {
  const c = bloodOf(ps)?.core;
  if (!c) return false;
  const o = es.core.out;
  c.endoKShift = o.kShift;
  c.endoGlucoseMgDl = o.glucoseMgDl;
  if (c.fl && o.kfMult !== es.kfMult) {
    c.fl.kfMult = o.kfMult;
    es.kfMult = o.kfMult;
  }
  return true;
}

/** 7g reads vasopressor responsiveness at `ps.cond.vasoResp` (R51 addendum 16), mirroring `endo.core.out.vasoResp`. */
export function writeCond(ps: object, es: EndoState): void {
  const p = ps as { cond?: { vasoResp: number } };
  if (p.cond) p.cond.vasoResp = es.core.out.vasoResp;
  else p.cond = { vasoResp: es.core.out.vasoResp };
}

/**
 * Anaphylaxis bronchospasm → 7b's `lungCondition anaphylaxis` (its grades I–V = severity 0.2–1; 7e's grade = 4 ×
 * mediator, relieved by β2 bronchodilation). Re-resolved only when the severity moves by ≥ 0.02 (7b's resolve is
 * not a per-tick operation). The capillary leak reaches the lungs through 7c's lung-water seam (kfMult).
 */
export function writeLung(rs: RespState, es: EndoState): void {
  const sev = Math.round(es.core.out.anaphLung * 100) / 100;
  if (Math.abs(sev - es.lungSev) < 0.02 && !(sev === 0 && es.lungSev > 0)) return;
  es.lungSev = sev;
  const rest = rs.lungSpecs.filter((s) => !(s.id === 'anaphylaxis' && s.side === undefined));
  rs.lungSpecs = sev > 0 ? [...rest, { id: 'anaphylaxis', severity: sev }] : rest;
  applyLungSpecs(rs);
}

/**
 * ECG modifier DELTAS (7c decision 9 pattern): tempC follows the core (Osborn waves below 33 °C, already in the ECG
 * generator) and the shivering artefact the shivering level. K is 7c's (its own deltas).
 */
export function ecgDeltas(es: EndoState, th: ThermalState, mods: Modifiers): Modifiers {
  const c = cascade(th);
  const d = { tempC: th.tc - 36.8 - es.ecg.tempC, shiver: c.shiverLevel - es.ecg.shiver };
  if (Math.abs(d.tempC) < 0.01 && Math.abs(d.shiver) < 0.01) return mods;
  es.ecg = { tempC: es.ecg.tempC + d.tempC, shiver: es.ecg.shiver + d.shiver };
  return {
    ...mods,
    tempC: Math.min(43, Math.max(20, mods.tempC + d.tempC)),
    artefact: { ...mods.artefact, shiver: Math.min(1, Math.max(0, mods.artefact.shiver + d.shiver)) },
  };
}

export type { L1State };
```

- [ ] **Step 5: Implement** `packages/engine-core/src/l2/endo/pipeline.ts`

```ts
// Stage 7e pipeline: the per-pass endocrine/thermal work the engine calls after 7c's `advanceBlood` (R51 addendum 14
// order: pk → resp/lung → blood → endo → organs → hemo). Every pass: observe 7g's accepted doses and hand 7g's
// dantrolene effect to the heat model. 1 Hz steps on Stage 3's temperature grid: read the inputs through adapters.ts,
// step the endocrine core, write the thermal inputs (endocrine heat, fever set point) and emit the `endo` event.
// Commands: `stimulus` (R51 addendum 12: the one shape; 7f observes it), `meal`, `thermal7e` and the 7e `condition`
// ids. 7e owns NO drug ids (R51 §3). Everything is plain JSON-safe data.
import type { L1State } from '../../l1/state.ts';
import type { Command, EngineEvent, PatientProfile } from '../../types.ts';
import type { EndoClinicalEvent } from '../../types-endo.ts';
import type { HemoState } from '../hemo/pipeline.ts';
import type { RespState } from '../resp/pipeline.ts';
import { thermalMetabolic } from '../thermal/metabolic.ts';
import { observeDoses, pkOf, readEndoInputs, readInfusions } from './adapters.ts';
import { SEPSIS_PHASES } from './conditions.ts';
import { createEndoCore, DEFAULT_ENDO_PROFILE, stepEndoCore, type EndoCore, type EndoProfile } from './core.ts';
import { meal } from './glucose.ts';

export interface EndoState {
  core: EndoCore;
  k: number; // next 1 Hz step index (time k s)
  noxious: number;
  weightKg: number;
  ecg: { tempC: number; shiver: number }; // last values pushed as ECG modifier deltas
  kfMult: number; // last capillary-leak multiplier written into 7c
  lungSev: number; // last 7b anaphylaxis severity written
  out: EngineEvent[];
}

export interface EndoCtx {
  l1: L1State;
  hemo: HemoState;
  resp: RespState;
  ps: object; // the engine's PipelineState (duck-typed reads of 7g `pk`, 7c `blood`, 7d `organs`, 7f `neuro`)
}

export function resolveEndoProfile(profile: PatientProfile | undefined): EndoProfile {
  const e = (profile as { endo?: Partial<EndoProfile> } | undefined)?.endo ?? {};
  return { ...DEFAULT_ENDO_PROFILE, ...e };
}

export function createEndoState(profile: PatientProfile | undefined, weightKg: number): EndoState {
  return {
    core: createEndoCore(resolveEndoProfile(profile), weightKg), k: 1, noxious: 0, weightKg, ecg: { tempC: 0, shiver: 0 },
    kfMult: 1, lungSev: 0, out: [],
  };
}

/** Advance to time tEnd (s): this pass's 7g doses at once, then the 1 Hz steps. */
export function advanceEndo(es: EndoState, ctx: EndoCtx, tEnd: number): void {
  const th = ctx.resp.temp;
  const pk = pkOf(ctx.ps);
  observeDoses(es, pk);
  th.dantE = pk?.bus?.metabolic?.dantroleneE ?? 0; // Stage 7g's dantrolene effect → the MH suppression (thermal/mh.ts)
  for (; es.k <= tEnd + 1e-9; es.k++) {
    const t = es.k;
    readInfusions(es, pk);
    stepEndoCore(es.core, readEndoInputs(ctx, es, t), 1);
    const o = es.core.out;
    th.extraX = o.vo2F; // endocrine metabolic heat (thyroid, sepsis, hypermetabolic)
    th.feverShift = o.setShiftC;
    es.out.push({
      type: 'endo', t,
      glucoseMgDl: Math.round(o.glucoseMgDl), glucoseMmolL: Math.round(o.glucoseMmol * 10) / 10,
      insulinUuMl: Math.round(o.insulinUuMl * 10) / 10, epinephrinePgMl: Math.round(o.epiPgMl),
      norepinephrinePgMl: Math.round(o.nePgMl), cortisolNmolL: Math.round(o.cortisolNmolL), stressIndex: o.stressIndex,
      mhActivity: Math.round(thermalMetabolic(th, t).mhActivity * 100) / 100,
      shivering: th.out.shiverW > 1, sweating: th.out.sweatW > 1, vasoconstricted: th.out.vasoF < 0.5,
      tempPeriphC: Math.round(th.tp * 10) / 10,
    });
  }
}

const range = (name: string, v: number | undefined, lo: number, hi: number) =>
  v === undefined || (Number.isFinite(v) && v >= lo && v <= hi) ? undefined : `${name} must be a finite number in ${lo}–${hi}`;
const ENDO_CONDITIONS = ['sepsis', 'anaphylaxis', 'sirs', 'hypermetabolic', 'thyroidStorm'];

/** Validation hook: a reason, undefined (accepted) or null (not a Stage 7e command). Runs BEFORE Stage 3's. */
export function validateEndoCommand(cmd: Command): string | undefined | null {
  if (cmd.type !== 'applyEvent') return null;
  const ev = cmd.event as EndoClinicalEvent | { kind: string; id?: string };
  switch (ev.kind) {
    case 'stimulus': {
      const i = (ev as { intensity?: number }).intensity;
      return i === undefined ? 'intensity is required' : range('intensity', i, 0, 2);
    }
    case 'meal':
      return range('carbohydrateG', (ev as { carbohydrateG: number }).carbohydrateG, 0, 300);
    case 'thermal7e': {
      const e = ev as Extract<EndoClinicalEvent, { kind: 'thermal7e' }>;
      if (e.exposure !== undefined && !['draped', 'exposed', 'prep'].includes(e.exposure)) return 'exposure must be draped, exposed or prep';
      return range('airSpeedMs', e.airSpeedMs, 0, 2);
    }
    case 'condition': {
      const c = ev as { id: string; severity?: number; phase?: string; rampS?: number };
      if (!ENDO_CONDITIONS.includes(c.id)) return null; // Stage 3 (mh), 7a, 7c (burns, dka) …
      if (c.phase !== undefined && !(c.phase in SEPSIS_PHASES)) return 'phase must be sirs, sepsis, warm or cold';
      return range('severity', c.severity, 0, 1) ?? range('rampS', c.rampS, 10, 7200) ?? (c.severity === undefined ? 'severity is required' : undefined);
    }
    default:
      return null;
  }
}

/** Apply hook: true when the command was a Stage 7e command. */
export function applyEndoCommand(es: EndoState, rs: RespState, cmd: Command, t: number): boolean {
  void t;
  if (cmd.type !== 'applyEvent') return false;
  const ev = cmd.event as EndoClinicalEvent | { kind: string };
  const c = es.core;
  switch (ev.kind) {
    case 'stimulus':
      es.noxious = (ev as { intensity: number }).intensity;
      return true;
    case 'meal':
      meal(c.glucose, (ev as { carbohydrateG: number }).carbohydrateG);
      return true;
    case 'thermal7e': {
      const e = ev as Extract<EndoClinicalEvent, { kind: 'thermal7e' }>;
      const th = rs.temp;
      if (e.exposure !== undefined) th.exposure = e.exposure;
      if (e.airSpeedMs !== undefined) th.airMs = e.airSpeedMs;
      if (e.fluidWarmer !== undefined) th.fluidWarmer = e.fluidWarmer;
      if (e.hme !== undefined) th.vent = { ...th.vent, hme: e.hme };
      return true;
    }
    case 'condition': {
      const k = ev as { id: string; severity: number; phase?: keyof typeof SEPSIS_PHASES; rampS?: number };
      if (k.id === 'sepsis') {
        c.cond.sepsis.target = SEPSIS_PHASES[k.phase ?? 'warm'] * k.severity;
        c.cond.sepsis.tauS = k.rampS ?? 600;
      } else if (k.id === 'anaphylaxis') c.cond.anaph.target = k.severity;
      else if (k.id === 'sirs') c.cond.sirs.target = k.severity;
      else if (k.id === 'hypermetabolic') c.cond.hypermet.target = k.severity;
      else if (k.id === 'thyroidStorm') c.cond.storm.target = k.severity;
      else return false;
      return true;
    }
    default:
      return false;
  }
}
```

- [ ] **Step 6: Run the tests and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo && npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck`
Expected: PASS (endo 38: hormones 7, glucose 7, conditions 4, core 7, adapters 8, pipeline 5); typecheck clean.

- [ ] **Step 7: Commit and push**

```bash
git add packages/engine-core/src/l2/endo/adapters.ts packages/engine-core/src/l2/endo/pipeline.ts packages/engine-core/test/l2/endo/adapters.test.ts packages/engine-core/test/l2/endo/pipeline.test.ts
git commit -m "feat(endo): adapters (7a/7c/7d/7f/7g seams per R51 addendum 16, fever unblunted by drug β-blockade) and the 1 Hz pipeline with 7g dose observation, commands and the endo event" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7e-endocrine-thermal
```

### Task 12: Engine wiring and the Stage 3 metabolic seam (E2)

**Files:**
- Modify: `packages/engine-core/src/engine.ts` (additive edits marked `// Stage 7e`), `packages/engine-core/src/l2/resp/pipeline.ts` (exception E2: 4 edits)
- Test: `packages/engine-core/test/engine/endo-wiring.test.ts` (create)

**Interfaces:**
- Consumes: Task 11 (`advanceEndo`, `applyEndoCommand`, `createEndoState`, `validateEndoCommand`, `writeCirc`, `writeBlood`, `writeCond`, `writeLung`, `ecgDeltas`), Task 5 (`upgradeThermal`), Task 6 (`thermalMetabolic`), `gasPatient` (`l2/gas/params.ts`), FU-2's `SINUS_FAMILY` (`l2/circ/rate-rule.ts`), 7c's exported `metabolic(rs, t, gas = 'co2')`.
- Produces: `PipelineState.endo: EndoState`, `PipelineState.endoHrF: number`, `PipelineState.cond: { vasoResp: number }` (7g's `pkCtx` already reads `ps.cond.vasoResp`); the engine emits `endo` events; the pre-7e snapshot upgrade in `restore()`.

- [ ] **Step 1: Merge main, record the baseline**

Run: `git fetch origin && git merge --no-edit origin/main && CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core test 2>&1 | tail -5`
Expected: all pass or the `it.fails` already on main (record "N passed"). Run it ALONE on the machine.

- [ ] **Step 2: Write the failing test** `packages/engine-core/test/engine/endo-wiring.test.ts`

```ts
// Stage 7e engine wiring: neutral at rest, the 1 Hz endo event, the MANUAL rhythm-clock factor only on sinus-family
// rhythms (FU-2 rate rule, NR-7g-5), MODELED → circ.ext.endo*, and restore of a pre-7e snapshot.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent, MonitorEngine, PatientSnapshot } from '../../src/types.ts';
import { ADULT, beatsIn, cmd, ev3, rig3, run } from '../helpers/resp.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const st = (e: MonitorEngine) => (e.snapshot().state as { st: any }).st;
const hrAt = (ev: EngineEvent[], t0: number, t1: number) => {
  const b = beatsIn(ev, t0, t1);
  return (60 * (b.length - 1)) / (b[b.length - 1]!.t - b[0]!.t);
};

describe('Stage 7e engine wiring', { timeout: 300_000 }, () => {
  it('rest: endo event at 1 Hz, every factor neutral (endoHrF 1, circ.ext.endo* absent in MANUAL)', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    await run(e, 10);
    expect(ev.filter((x) => x.type === 'endo').map((x) => (x as { t: number }).t)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const s = st(e);
    expect(s.endoHrF).toBe(1);
    expect(s.hemo.circ.ext.endoHrF).toBeUndefined();
    expect(s.resp.temp.extraX).toBe(1);
  });

  it('MANUAL: a stimulus scales the sinus rate; an SVT keeps its own rate (the factor is gated to the sinus family)', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(ev3({ kind: 'stimulus', intensity: 1 }));
    await run(e, 240);
    expect(st(e).endoHrF).toBeGreaterThan(1.15);
    expect(hrAt(ev, 200, 240)).toBeGreaterThan(1.15 * 75);
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'svtAvnrt', opts: { rateBpm: 180 } }));
    await run(e, 300);
    expect(hrAt(ev, 270, 300)).toBeGreaterThan(175);
    expect(hrAt(ev, 270, 300)).toBeLessThan(185);
  });

  it('MODELED: the endocrine multipliers go to circ.ext (neutral at rest) and the rhythm-clock factor stays 1', async () => {
    const e = createEngine({ seed: 7, mode: 'modeled', patient: ADULT });
    await run(e, 5);
    expect(st(e).hemo.circ.ext).toMatchObject({ endoHrF: 1, endoSvrF: 1, endoEesF: 1 });
    e.dispatch(ev3({ kind: 'stimulus', intensity: 1 }));
    await run(e, 180);
    const s = st(e);
    expect(s.hemo.circ.ext.endoHrF).toBeGreaterThan(1.1);
    expect(s.hemo.circ.ext.endoSvrF).toBeGreaterThan(1.1);
    expect(s.endoHrF).toBe(1);
  });

  it('restore of a pre-7e snapshot (no endo, Stage 3 TempState) upgrades and runs on', async () => {
    const { e } = rig3({ patient: ADULT });
    await run(e, 30);
    const snap = e.snapshot() as PatientSnapshot;
    const old = structuredClone(snap);
    const o = (old.state as { st: Record<string, unknown> }).st;
    delete o.endo;
    delete o.endoHrF;
    delete o.cond;
    const temp = (o.resp as { temp: Record<string, unknown> }).temp;
    for (const k of ['env', 'depth', 'depthIn', 'setShift', 'feverShift', 'nmb', 'shiverShift', 'airMs', 'exposure', 'vent', 'iv', 'fluidWarmer', 'extraX', 'dantE', 'out', 'warmLag', 'effKg']) delete temp[k];
    e.restore(old);
    await run(e, 90);
    const s = st(e);
    expect(Number.isFinite(s.resp.temp.tc)).toBe(true);
    expect(Math.abs(s.resp.temp.tc - 36.8)).toBeLessThan(0.05);
    expect(s.endo.k).toBeGreaterThan(80);
  });
});
```

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/endo-wiring.test.ts`
Expected: FAIL — no `endo` events (`expected [] to deeply equal [1, …, 10]`).

- [ ] **Step 3: `engine.ts` edits** (merge `origin/main` first; each anchor occurs once on the prototype base; place by the chain order when a later stage moved a line)

(a) After `} from './l2/resp/pipeline.ts'; // Stage 3` add (skip the `SINUS_FAMILY` line if FU-2 already imports it into `engine.ts`):
```ts
import { advanceEndo, applyEndoCommand, createEndoState, validateEndoCommand, type EndoState } from './l2/endo/pipeline.ts'; // Stage 7e
import { ecgDeltas, writeBlood, writeCirc, writeCond, writeLung } from './l2/endo/adapters.ts'; // Stage 7e
import { upgradeThermal } from './l2/thermal/heat.ts'; // Stage 7e
import { gasPatient } from './l2/gas/params.ts'; // Stage 7e
import { SINUS_FAMILY } from './l2/circ/rate-rule.ts'; // FU-2's rate rule (NR-7g-5): only the sinus node takes the endocrine HR factor
```
(b) In `interface PipelineState`, after `  resp: RespState; // Stage 3: breathing, gas exchange, SpO2/CO2/RR/temperature (brief §4.3–§4.7)` add:
```ts
  endo: EndoState; // Stage 7e: stress hormones, glucose–insulin, thyroid, conditions (the heat model lives in resp.temp)
  endoHrF: number; // Stage 7e: HR factor on the rhythm clock in MANUAL (1 in MODELED: 7a takes circ.ext.endo*)
  cond: { vasoResp: number }; // Stage 7e → 7g (R51 addendum 16): catecholamine responsiveness, mirrors endo.core.out.vasoResp
```
(c) In `function rhythmCtx(ps: PipelineState)`, the returned `hrAt` becomes the ramp × the endocrine factor for sinus-family rhythms only. On the prototype base the function body is the single line `  return { hrAt: (t) => rampValue(ps.hr, t), mods: ps.mods, rng: ps.rng, hrv: ps.hrv, breath: breathOf(ps) }; // Stage 5.1: breath`; replace it by (if FU-2 changed this function, keep FU-2's lines and multiply its `hrAt` value by `endoF` the same way):
```ts
  // Stage 7e: the endocrine/fever HR factor scales only the sinus node (FU-2 rate rule, NR-7g-5); exactly 1 at rest
  const endoF = SINUS_FAMILY.has(ps.rhythm.id) ? ps.endoHrF : 1;
  return { hrAt: (t) => rampValue(ps.hr, t) * endoF, mods: ps.mods, rng: ps.rng, hrv: ps.hrv, breath: breathOf(ps) }; // Stage 5.1: breath
```
(d) After `      resp: createRespState(opts.patient, l1, this.seed), // Stage 3` add:
```ts
      endo: createEndoState(opts.patient, gasPatient(opts.patient).effKg), // Stage 7e
      endoHrF: 1, // Stage 7e
      cond: { vasoResp: 1 }, // Stage 7e
```
(e) In `restore()`, after `    data.st.pkHooks ??= createHookState(); // Stage 7g` add:
```ts
    data.st.endo ??= createEndoState(undefined, 70); // Stage 7e: pre-7e snapshots
    data.st.endoHrF ??= 1; // Stage 7e
    data.st.cond ??= { vasoResp: 1 }; // Stage 7e
    data.st.resp.temp = upgradeThermal(data.st.resp.temp); // Stage 7e: Stage 3's TempState → ThermalState
```
(f) In `advance()`, AFTER 7c's two lines `advanceBlood(ps.blood, …)` and `    this.pushBloodEcg(ps); // Stage 7c: K / QTc deltas into Modifiers (plan decision 9)`, and BEFORE 7d's `advanceOrgans(…)` line (if present) and `advanceHemo(`, add:
```ts
    const endoCtx = { l1: ps.l1, hemo: ps.hemo, resp: ps.resp, ps }; // Stage 7e: after 7c's blood, before 7d's organs and the haemodynamics
    advanceEndo(ps.endo, endoCtx, Math.floor(end / 8) / RESP_RATE); // Stage 7e (1 Hz steps; 7g's doses every pass)
    ps.endoHrF = writeCirc(endoCtx, ps.endo); // Stage 7e: MODELED → circ.ext.endo*; MANUAL → the rhythm-clock factor
    writeBlood(ps, ps.endo); // Stage 7e → 7c (endogenous K, lab glucose, capillary leak)
    writeCond(ps, ps.endo); // Stage 7e → 7g (ps.cond.vasoResp)
    writeLung(ps.resp, ps.endo); // Stage 7e → 7b (lungCondition anaphylaxis)
    ps.mods = ecgDeltas(ps.endo, ps.resp.temp, ps.mods); // Stage 7e: tempC / shivering deltas
```
(g) In `flush`, after `    this.st.pk.out = keep(this.st.pk.out); // Stage 7g` add `    this.st.endo.out = keep(this.st.endo.out); // Stage 7e`.
(h) In `validate`, immediately before `    const resp = validateRespCommand(cmd); // Stage 3 (before Stage 2: attachSensor co2/temp)` (i.e. after 7g's, 7f's, 7d's and 7c's validators) add:
```ts
    const endo = validateEndoCommand(cmd); // Stage 7e (after 7g/7f/7d/7c, before Stage 3: its condition ids and `stimulus`)
    if (endo !== null) return endo;
```
(i) In `apply`, immediately before `    if (applyRespCommand(ps.resp, ps.l1, cmd, simT)) {` (after 7g's, 7f's, 7d's and 7c's apply lines) add:
```ts
    if (applyEndoCommand(ps.endo, ps.resp, cmd, simT)) return; // Stage 7e (after 7g/7f/7d/7c, before Stage 3)
```

- [ ] **Step 4: resp pipeline edits** (`packages/engine-core/src/l2/resp/pipeline.ts`, exception E2)

(a) Replace the import `import { createTemp, MH_VCO2_FACTOR, mhFactor, setCoreTarget, stepTemp, type TempState } from '../temp/temp.ts';` by:
```ts
import { createTemp, setCoreTarget, stepTemp, type TempState } from '../temp/temp.ts';
import { thermalMetabolic } from '../thermal/metabolic.ts'; // Stage 7e
```
(b) Replace 7c's exported `metabolic` — its doc comment (`Metabolic factor: temperature, MH and general anaesthesia … is ignored until then.`) and its body — keeping the signature `export function metabolic(rs: RespState, t: number, gas: 'o2' | 'co2' = 'co2'): number` and the `export` (7c's blood imports it):
```ts
/**
 * Metabolic factor: temperature, general anaesthesia and (Stage 7e) shivering, MH (VO2 × 2.5 / VCO2 × 3 at activity 1)
 * and the endocrine rate (thyroid, sepsis, hypermetabolic: `temp.extraX`). Stage 7c exports it for the blood's VO2
 * demand; `gas` selects the O2 or CO2 factor (they differ in MH).
 */
export function metabolic(rs: RespState, t: number, gas: 'o2' | 'co2' = 'co2'): number {
  const m = thermalMetabolic(rs.temp, t); // Stage 7e
  return tempFactor(rs.temp.tc) * (gas === 'o2' ? m.vo2F : m.vco2F) * rs.temp.extraX * (rs.temp.anaesthesia === 'general' ? GA_METABOLIC : 1);
}
```
(c) In `o2Inputs`, replace `vo2: rs.pat.vo2 * metabolic(rs, t), shunt:` by `vo2: rs.pat.vo2 * metabolic(rs, t, 'o2'), shunt:`.
(d) In `gasStep`, replace the line `    stepTemp(rs.temp, t, 1);` by:
```ts
    // Stage 7e: the respiratory heat loss follows the actual ventilation; machine gas is dry, an HME is assumed unless
    // `thermal7e { hme: false }` removed it
    const mech = d.source === 'ventilator' || d.source === 'bvm' || d.source === 'external';
    const nv = nominalRate(d, driverCtx(rs, l1, t));
    rs.temp.vent = { veLpm: d.airway === 'apnoea' || d.source === 'none' ? 0 : (nv.rr * nv.vt) / 1000, dryGas: mech, hme: mech ? rs.temp.vent.hme || !rs.temp.vent.dryGas : false };
    stepTemp(rs.temp, t, 1);
```

- [ ] **Step 5: Run the wiring test, then the whole engine-core suite ALONE**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck && npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/endo-wiring.test.ts && CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core test 2>&1 | tail -12`
Expected: `endo-wiring` 4 PASS; the suite = Step 1 + the 7e files, with exactly these known differences (prototype):
- `test/engine/resp-oxygen.test.ts` 5b and `test/engine/blood-stage3-recheck.test.ts` (child desaturation): **128 s** vs the band 130–190 (7c already left it at 130 s; 7e's hypoxic catecholamine tachycardia and the slower GA redistribution of the calibrated heat model take ≈ 1 s each). R45: do NOT widen and do NOT edit these Stage 3/7c tests; record the number in the gate note as ruling request Q-7e-8 and continue.
- `test/engine/pk-acceptance-pd.test.ts`: NO change expected. On the first prototype base its rig ran at RR 12 (PaCO2 → 57) and the "phenylephrine 0.25" `it.fails` flipped with 7e (+18.0 %, 7e's hypercapnic catecholamine drive); the 7c branch fixed the rig to RR 20 (PaCO2 38–39, addendum 15 item 3) and every phenylephrine row is a plain `it` there. If any pk-acceptance-pd row changes state with 7e, stop and report (it would mean 7e's catecholamine drive acts at normocapnia) — do not edit it.
Any OTHER newly failing test beyond its band: stop and report (R45). Every Stage 3 thermal test (`test/l2/temp`, R39-7 and MH in `resp-coupling`) passes unchanged.

- [ ] **Step 6: Commit and push**

```bash
git add packages/engine-core/src/engine.ts packages/engine-core/src/l2/resp/pipeline.ts packages/engine-core/test/engine/endo-wiring.test.ts
git commit -m "feat(engine-core): wire Stage 7e — endo pass after 7c's blood, 7a/7c/7g/7b seams, sinus-gated rhythm-clock factor, commands, endo event, snapshot upgrade, VO2/VCO2 seam (E2)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7e-endocrine-thermal
```

### Task 13: Cross-stage seams into 7c and 7g (E-7e-1 … E-7e-4) and their engine test

**Files:**
- Modify (one anchored line each, R51 addendum 16): `packages/engine-core/src/l2/blood/pipeline.ts` (E-7e-1: the cold-unit line + one import), `packages/engine-core/src/l2/blood/labs.ts` (E-7e-2), `packages/engine-core/src/l2/blood/core.ts` (E-7e-3), `packages/engine-core/src/l2/pk/pipeline.ts` (E-7e-4)
- Modify (E-7e-5): `packages/engine-core/test/l2/blood/pipeline.test.ts` (the cold-unit test, re-specified)
- Test: `packages/engine-core/test/engine/endo-seams.test.ts` (create)

**Interfaces:**
- Consumes: `ivInflow`, `infusionW` (Task 3); `writeBlood` (Task 11) writes `blood.core.endoKShift`/`endoGlucoseMgDl`; `readInfusions` (Task 11) reads `pk.drugs.<id>.rate`.
- Produces: 7c's heat term `rs.temp.iv` every 100 ms; 7c's lab glucose = 7e's; 7c's K set point + 7e's ENDOGENOUS shift; 7g's `DrugInst.rate` = the ordered rate for gamma rows too.

Before editing: `git fetch origin && git merge --no-edit origin/main`. If 7c's executor already added an endogenous seam (`grep -n "endoKShift\|kShiftEndo" packages/engine-core/src/l2/blood/core.ts`) or a lab-glucose seam, or already publishes `rs.temp.iv`, keep 7c's line and use its name in `adapters.ts` instead of repeating the edit; say so in the gate note. The prototype verified each anchor below once on the fixed 7c plan's code.

- [ ] **Step 1: Write the failing test** `packages/engine-core/test/engine/endo-seams.test.ts`

```ts
// Stage 7e cross-stage seams at engine level (R51 addendum 16): 7c endogenous K term, lab glucose and the physical cold
// IV term (E-7e-1..3); 7g's dextrose infusion rate (E-7e-4) and ps.cond.vasoResp; 7b's anaphylaxis lung condition.
import { describe, expect, it } from 'vitest';
import type { MonitorEngine } from '../../src/types.ts';
import type { EngineEvent } from '../../src/types.ts';
import { ADULT, ev3, rig3, run } from '../helpers/resp.ts';

type Labs = Extract<EngineEvent, { type: 'labs' }>;
type Endo = Extract<EngineEvent, { type: 'endo' }>;
const at = <T extends EngineEvent>(ev: EngineEvent[], type: T['type'], t: number) => ev.find((x) => x.type === type && (x as { t: number }).t >= t) as T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const st = (e: MonitorEngine) => (e.snapshot().state as { st: any }).st;

describe('Stage 7e seams (engine)', { timeout: 300_000 }, () => {
  it('rest: every seam neutral — endoKShift 0, cond.vasoResp 1, kfMult 1, no anaphylaxis spec, lab glucose 100', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    await run(e, 30);
    const s = st(e);
    expect(s.blood.core.endoKShift).toBeCloseTo(0, 12);
    expect(s.cond.vasoResp).toBe(1);
    expect(s.blood.core.fl.kfMult).toBe(1);
    expect(s.resp.lungSpecs).toEqual([]);
    expect(s.endoHrF).toBe(1);
    expect(at<Labs>(ev, 'labs', 30).values.glucose).toBe(100);
  });

  it('7g dextrose infusion (E-7e-4) raises glucose and 7c’s lab panel shows 7e’s value (E-7e-2)', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(ev3({ kind: 'infusion', drugId: 'dextrose', rate: 20_000, unit: 'mg/h' })); // 20 g/h
    await run(e, 1800);
    const g = at<Endo>(ev, 'endo', 1800).glucoseMgDl;
    expect(st(e).pk.drugs.dextrose.rate).toBeCloseTo(20_000 / 60, 6);
    expect(g).toBeGreaterThan(115);
    expect(Math.abs(at<Labs>(ev, 'labs', 1800).values.glucose - g)).toBeLessThanOrEqual(1);
  });

  it('MH K efflux reaches 7c’s K through the endogenous term (E-7e-3): K rises ≥ 0.5 mmol/L in 15 min at fixed ventilation', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
    e.dispatch(ev3({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 }));
    await run(e, 120);
    const k0 = at<Labs>(ev, 'labs', 120).values.k;
    e.dispatch(ev3({ kind: 'condition', id: 'mh', severity: 1 }));
    await run(e, 120 + 900);
    expect(st(e).blood.core.endoKShift).toBeGreaterThan(0.3);
    expect(at<Labs>(ev, 'labs', 120 + 900).values.k - k0).toBeGreaterThanOrEqual(0.5);
  });

  it('cold IV (E-7e-1): 2 unwarmed RBC units cool the core ≥ 0.3 °C more than 2 warmed ones; the fluid warmer removes the difference', async () => {
    const core = async (warmed: boolean, warmer: boolean) => {
      const { e } = rig3({ patient: ADULT });
      e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
      if (warmer) e.dispatch(ev3({ kind: 'thermal7e', fluidWarmer: true }));
      await run(e, 60);
      e.dispatch(ev3({ kind: 'transfusion', product: 'rbc', units: 2, overS: 600, warmed }));
      await run(e, 900);
      return st(e).resp.temp.tc as number;
    };
    const cold = await core(false, false);
    const warm = await core(true, false);
    expect(warm - cold).toBeGreaterThanOrEqual(0.3);
    expect(Math.abs((await core(false, true)) - warm)).toBeLessThan(0.02);
  });

  it('sepsis writes ps.cond.vasoResp (7g reads it) and 7c’s kfMult; anaphylaxis drives 7b’s lungCondition anaphylaxis', async () => {
    const { e } = rig3({ patient: ADULT });
    e.dispatch(ev3({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'warm', rampS: 60 }));
    e.dispatch(ev3({ kind: 'condition', id: 'anaphylaxis', severity: 0.75 }));
    await run(e, 900);
    const s = st(e);
    expect(s.cond.vasoResp).toBeLessThan(0.8);
    expect(s.cond.vasoResp).toBeCloseTo(s.endo.core.out.vasoResp, 12);
    expect(s.blood.core.fl.kfMult).toBeGreaterThan(3);
    const a = s.resp.lungSpecs.find((x: { id: string }) => x.id === 'anaphylaxis');
    expect(a.severity).toBeGreaterThan(0.3);
  });
});
```

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/endo-seams.test.ts`
Expected: FAIL — at least the dextrose-infusion test (`pk.drugs.dextrose.rate` is 0: a gamma row, and the lab glucose stays 100) and the cold-IV test (7c's fixed −0.25 °C per unwarmed unit ignores the fluid warmer); the MH K test fails too when the acidosis term alone stays < 0.5 mmol/L.

- [ ] **Step 2: E-7e-1 — 7c's cold-unit line → the physical IV heat term** (`packages/engine-core/src/l2/blood/pipeline.ts`)

After `import { BLOOD_DRUGS, bicarbCo2MlMin, CA_MMOL_PER_G } from './treatments.ts';` add:
```ts
import { ivInflow } from '../thermal/environment.ts'; // Stage 7e (E-7e-1)
```
Replace the line `    for (const u of bs.cold) if (t < u.until) rs.temp.tc -= u.cPerS * BLOOD_DT_S; // unwarmed units (decision 16)` by:
```ts
    rs.temp.iv = ivInflow(c.fl.flows, bs.cold.some((u) => t < u.until), t, rs.temp.ta); // Stage 7e (E-7e-1): IV fluids and unwarmed units as a physical heat term (replaces decision 16's −0.25 °C per unit)
```
(`bs.cold` and its `filter` line stay: they flag that an unwarmed unit is running. `COLD_UNIT_C` becomes unused by the pipeline; leave the constant, 7c owns `params.ts`.)

- [ ] **Step 3: E-7e-2 — the lab-panel glucose** (`packages/engine-core/src/l2/blood/labs.ts`, anchor `glucose: NORMAL.glucoseMgDl`)

Replace `hb: r(o.hb, 1), glucose: NORMAL.glucoseMgDl, ag:` by:
```ts
hb: r(o.hb, 1), glucose: r((bc as { endoGlucoseMgDl?: number }).endoGlucoseMgDl ?? NORMAL.glucoseMgDl, 0), ag:
```

- [ ] **Step 4: E-7e-3 — the endogenous K term** (`packages/engine-core/src/l2/blood/core.ts`)

Replace `  const drug = INSULIN_K_SHIFT * ef.ins + beta;` by:
```ts
  const drug = INSULIN_K_SHIFT * ef.ins + beta + ((bc as { endoKShift?: number }).endoKShift ?? 0); // Stage 7e (E-7e-3): endogenous epinephrine β2, secreted insulin, MH K efflux
```
(One K source per mechanism, R50 F2/F8: `beta` is 7g's exogenous `bus.metabolic.kShift`; 7e's term is endogenous only. The pump-gain factor `1 + K_PUMP_GAIN·|drug|` then also speeds the endogenous shifts.)

- [ ] **Step 5: E-7e-4 — 7g records the ordered rate for gamma rows** (`packages/engine-core/src/l2/pk/pipeline.ts`, inside `const setRate = (amountPerMin: number) => {`)

Replace `    else d.rate = amountPerMin;` by:
```ts
    d.rate = amountPerMin; // Stage 7e (E-7e-4): the ordered rate, gamma rows too (their PK never reads it; 7e reads insulin/dextrose here)
```
(For gamma rows `stepOnce` never reads `d.rate`; the drug panel's `rate` column now shows the ordered rate instead of 0 — a side benefit.)

- [ ] **Step 6: E-7e-5 — re-specify 7c's cold-unit unit test** (`packages/engine-core/test/l2/blood/pipeline.test.ts`)

Add after the last import: `import { infusionW } from '../../../src/l2/thermal/environment.ts'; // Stage 7e (E-7e-1)`. Replace the test `it('an unwarmed unit cools the core by ≈ 0.25 °C', () => { … });` (it read the core after `advanceBlood` alone; the heat now enters through Stage 3's 1 Hz heat step) by:
```ts
  it('an unwarmed unit runs into the heat model at 4 °C: ≈ 0.25 °C of a 70 kg core (Stage 7e E-7e-1: physical IV heat term)', () => {
    const { bs, ctx, rs } = rig();
    applyBloodCommand(bs, ev({ kind: 'transfusion', product: 'rbc', units: 1, overS: 300 }), 0, ctx.resp);
    advanceBlood(bs, ctx, 100);
    expect(rs.temp.iv).toEqual({ mlPerMin: 56, tempC: 4 }); // 280 mL over 300 s
    expect((-infusionW(rs.temp.iv.mlPerMin, rs.temp.iv.tempC, 36.8) * 300) / rs.temp.capCore).toBeCloseTo(0.25, 1); // the heat step integrates it
    advanceBlood(bs, ctx, 301);
    expect(rs.temp.iv.mlPerMin).toBe(0);
  });
```
The property is unchanged (one unit ≈ 0.25 °C of a 70 kg core); only where it is integrated moved. 7c's engine test "massive transfusion … unwarmed units cool the core" (> 1.5 °C) passes unchanged (prototype).

- [ ] **Step 7: Run**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck && npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/endo-seams.test.ts test/l2/blood test/engine/blood-sanity-haem.test.ts test/engine/blood-commands.test.ts test/l2/pk test/engine/pk-acceptance-pk.test.ts`
Expected: PASS (seams 5; every 7c/7g file as before).

- [ ] **Step 8: Commit and push**

```bash
git add packages/engine-core/src/l2/blood/pipeline.ts packages/engine-core/src/l2/blood/labs.ts packages/engine-core/src/l2/blood/core.ts packages/engine-core/src/l2/pk/pipeline.ts packages/engine-core/test/l2/blood/pipeline.test.ts packages/engine-core/test/engine/endo-seams.test.ts
git commit -m "feat(endo): seams into 7c (physical cold-IV term E-7e-1, lab glucose E-7e-2, endogenous K E-7e-3) and 7g (gamma-row infusion rate E-7e-4), R51 addendum 16" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7e-endocrine-thermal
```

### Task 14: Engine acceptance, MANUAL circulation — MH with dantrolene, stress, glucose, hypoglycaemia under GA, septic shock

**Files:**
- Create: `packages/engine-core/test/engine/endo-acceptance.test.ts`
- Modify: `packages/engine-core/vite.config.ts` (the SLOW list, one line)

**Interfaces:**
- Consumes: the wired engine (Tasks 12–13); helpers `rig3`, `ev3`, `run`, `vent`, `numSeries`, `stateSeries`, `beatsIn`, `mean`, `ADULT` (`test/helpers/resp.ts`, Stage 3 — read-only); 7g's `drug`/`infusion` events; 7c's `labs` event.

- [ ] **Step 1: Write the tests** `packages/engine-core/test/engine/endo-acceptance.test.ts`

The bands are the tables' (R45: §7 check 21 for MH, §5c for the stimulus and cortisol, §5e for sepsis); a miss stays `it.fails` with its number. The one `it.fails` below is the prototype's measured miss (Q-7e-5).

```ts
// Stage 7e acceptance at engine level, MANUAL circulation (tables §7 check 21; R39-7; tables §5c stress/glucose;
// §5e sepsis). Drugs are Stage 7g's events (R51 §3); K and the lab glucose are Stage 7c's.
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '../../src/types.ts';
import { ADULT, beatsIn, ev3, mean, numSeries, rig3, stateSeries, vent, run } from '../helpers/resp.ts';

type Endo = Extract<EngineEvent, { type: 'endo' }>;
type Labs = Extract<EngineEvent, { type: 'labs' }>;
const endoAt = (ev: EngineEvent[], t: number) => ev.find((x): x is Endo => x.type === 'endo' && x.t >= t)!;
const labsAt = (ev: EngineEvent[], t: number) => ev.find((x): x is Labs => x.type === 'labs' && x.t >= t)!.values;
const hrAt = (ev: EngineEvent[], t0: number, t1: number) => {
  const b = beatsIn(ev, t0, t1);
  return (60 * (b.length - 1)) / (b[b.length - 1]!.t - b[0]!.t);
};
const drug = (drugId: string, dose: number, unit: string) => ev3({ kind: 'drug', drugId, dose, unit, route: 'iv' });

describe('Stage 7e acceptance (MANUAL)', { timeout: 600_000 }, () => {
  it('MH severity 1 at fixed ventilation (tables §7 check 21): EtCO2 ≥ 60 by 10 min rising 3–5 mmHg/min, core +1 °C by 15 min, HR +30 bpm, K 5.5–6.5 by 20 min', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
    e.dispatch(vent(12));
    await run(e, 300);
    const hr0 = hrAt(ev, 240, 300);
    e.dispatch(ev3({ kind: 'condition', id: 'mh', severity: 1 }));
    await run(e, 300 + 20 * 60);
    const et = (a: number) => mean(numSeries(ev, 'etco2', a - 20, a).map(([, v]) => v));
    const tc = stateSeries(ev, 'tempCore');
    const T = (s: number) => tc.find(([t]) => t >= s)![1];
    console.log(`MH: EtCO2 ${[0, 5, 10, 15, 20].map((m) => et(300 + m * 60).toFixed(0)).join('/')} at 0/5/10/15/20 min; core +${(T(300 + 900) - T(300)).toFixed(2)} °C at 15 min; HR ${hr0.toFixed(0)} → ${hrAt(ev, 300 + 1140, 300 + 1200).toFixed(0)}; K ${labsAt(ev, 300 + 1200).k}`);
    expect(et(300 + 600)).toBeGreaterThanOrEqual(60);
    const slope = (et(300 + 900) - et(300 + 600)) / 5;
    expect(slope).toBeGreaterThanOrEqual(3);
    expect(slope).toBeLessThanOrEqual(5);
    expect(T(300 + 900) - T(300)).toBeGreaterThanOrEqual(1);
    expect(hrAt(ev, 300 + 1140, 300 + 1200) - hr0).toBeGreaterThanOrEqual(30);
    expect(labsAt(ev, 300 + 1200).k).toBeGreaterThanOrEqual(5.5);
    expect(labsAt(ev, 300 + 1200).k).toBeLessThanOrEqual(6.5);
  });

  /** MH severity 1 under GA at RR 12; dantrolene 2.5 mg/kg (7g) at 20 min; `mv`: treatment also doubles MV (RR 24). */
  const mhDantrolene = async (mv: boolean) => {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
    e.dispatch(vent(12));
    await run(e, 300);
    e.dispatch(ev3({ kind: 'condition', id: 'mh', severity: 1 }));
    await run(e, 300 + 20 * 60);
    e.dispatch(drug('dantrolene', 2.5, 'mg/kg'));
    if (mv) e.dispatch(vent(24));
    await run(e, 300 + 45 * 60);
    return ev;
  };
  const t0 = 300 + 20 * 60;

  it('MH + dantrolene 2.5 mg/kg at 20 min (7g), fixed MV: EtCO2 turns 5–10 min after the dose (tables §7 check 21)', async () => {
    const ev = await mhDantrolene(false);
    const et = (a: number) => mean(numSeries(ev, 'etco2', a - 20, a).map(([, v]) => v));
    let peak = t0;
    for (let s = t0; s <= t0 + 25 * 60; s += 30) if (et(s) > et(peak)) peak = s;
    console.log(`dantrolene, fixed MV: EtCO2 peak ${et(peak).toFixed(0)} at +${((peak - t0) / 60).toFixed(1)} min, ${et(t0 + 1500).toFixed(0)} at +25`);
    expect(peak - t0).toBeGreaterThanOrEqual(5 * 60 - 30);
    expect(peak - t0).toBeLessThanOrEqual(10 * 60);
  });

  // R45 miss (prototype: HR 121 at +20 min, core 39.8 °C): the fever term (× 1.27) and the hypercapnic epinephrine keep
  // the HR up; the tables' "HR normal" assumes active cooling, which 7e does not model (Q-7e-5). Not widened.
  it.fails('MH + dantrolene + MV × 2 at 20 min: HR normal (< 100) by 15–20 min after the dose (tables §7 check 21)', async () => {
    const ev = await mhDantrolene(true);
    const hr20 = hrAt(ev, t0 + 1140, t0 + 1200);
    const tc = stateSeries(ev, 'tempCore');
    console.log(`dantrolene + MV×2: HR ${hrAt(ev, t0 - 60, t0).toFixed(0)} → ${hrAt(ev, t0 + 840, t0 + 900).toFixed(0)}/${hr20.toFixed(0)} at +15/+20 min; core ${tc.find(([t]) => t >= t0 + 1200)![1].toFixed(2)}`);
    expect(hr20).toBeLessThan(100);
  });

  it('stress: a stimulus without anaesthesia raises HR +15–25 % (tables §5c) with onset τ 20–40 s and offset τ 2–4 min; the GA flag blunts it', async () => {
    const hrRise = async (ga: boolean) => {
      const { e, ev } = rig3({ patient: ADULT });
      if (ga) e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
      await run(e, 120);
      e.dispatch(ev3({ kind: 'stimulus', intensity: 1 }));
      await run(e, 420);
      e.dispatch(ev3({ kind: 'stimulus', intensity: 0 }));
      await run(e, 900);
      return { base: hrAt(ev, 60, 120), top: hrAt(ev, 380, 420), on: hrAt(ev, 140, 170), off: hrAt(ev, 580, 620) };
    };
    const l = await hrRise(false);
    console.log(`stimulus: HR ${l.base.toFixed(1)} → ${l.top.toFixed(1)} (+${(100 * (l.top / l.base - 1)).toFixed(1)} %)`);
    expect(l.top / l.base - 1).toBeGreaterThanOrEqual(0.15);
    expect(l.top / l.base - 1).toBeLessThanOrEqual(0.25);
    expect((l.on - l.base) / (l.top - l.base)).toBeGreaterThan(0.4); // most of the rise within 20–50 s
    expect((l.off - l.base) / (l.top - l.base)).toBeGreaterThan(0.25); // still elevated 3 min after the stimulus ends
    expect((l.off - l.base) / (l.top - l.base)).toBeLessThan(0.75);
    const g = await hrRise(true);
    expect(g.top / g.base - 1).toBeLessThan(0.5 * (l.top / l.base - 1));
  });

  it('glucose through 7g: dextrose 25 g → > 250 mg/dL at once, < 130 by 60 min; insulin infusion 4 U/h → < 70 by 2 h; 7c’s lab panel shows it', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    await run(e, 60);
    e.dispatch(drug('dextrose', 25, 'g'));
    await run(e, 70);
    expect(endoAt(ev, 62).glucoseMgDl).toBeGreaterThan(250);
    await run(e, 60 + 3600);
    expect(endoAt(ev, 60 + 3600).glucoseMgDl).toBeLessThan(130);
    e.dispatch(ev3({ kind: 'infusion', drugId: 'insulin', rate: 4, unit: 'units/h' }));
    await run(e, 60 + 3600 + 7200);
    const g = endoAt(ev, 60 + 3600 + 7200).glucoseMgDl;
    expect(g).toBeLessThan(70);
    expect(Math.abs(labsAt(ev, 60 + 3600 + 7200).glucose - g)).toBeLessThanOrEqual(2);
  });

  it('diabetic hypoglycaemia under GA: type 1 + insulin 20 U/h → glucose < 65 mg/dL and HR +20 % (the unexplained tachycardia)', async () => {
    const { e, ev } = rig3({ patient: { ...ADULT, endo: { diabetes: 'type1' } } });
    e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
    await run(e, 300);
    const base = hrAt(ev, 240, 300);
    e.dispatch(ev3({ kind: 'infusion', drugId: 'insulin', rate: 20, unit: 'units/h' }));
    await run(e, 300 + 3600);
    console.log(`hypoglycaemia: glucose ${endoAt(ev, 300 + 3600).glucoseMgDl} mg/dL, HR ${base.toFixed(0)} → ${hrAt(ev, 300 + 3540, 300 + 3600).toFixed(0)}`);
    expect(endoAt(ev, 300 + 3600).glucoseMgDl).toBeLessThan(65);
    expect(hrAt(ev, 300 + 3540, 300 + 3600) / base).toBeGreaterThanOrEqual(1.2);
  });

  it('warm septic shock (MANUAL: HR, temperature, glucose): HR 110–130 within 30 min (tables §5e), fever toward 38.5–40 °C, glucose ↑', async () => {
    const { e, ev } = rig3({ patient: ADULT });
    await run(e, 60);
    e.dispatch(ev3({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'warm', rampS: 300 }));
    await run(e, 60 + 3600);
    const hr = hrAt(ev, 60 + 1740, 60 + 1800);
    const tc = stateSeries(ev, 'tempCore');
    console.log(`sepsis MANUAL: HR ${hr.toFixed(0)}, core ${tc[tc.length - 1]![1].toFixed(2)}, glucose ${endoAt(ev, 60 + 3600).glucoseMgDl}`);
    expect(hr).toBeGreaterThanOrEqual(110);
    expect(hr).toBeLessThanOrEqual(130);
    expect(tc[tc.length - 1]![1]).toBeGreaterThan(37.8);
    expect(endoAt(ev, 60 + 3600).glucoseMgDl).toBeGreaterThan(105);
  });
});
```

- [ ] **Step 2: Add the file to the SLOW set** — in `packages/engine-core/vite.config.ts`, after `  'test/engine/pk-acceptance-*.test.ts',` add:

```ts
  'test/engine/endo-acceptance.test.ts', // Stage 7e: MH, glucose and sepsis scenarios (sim-hours)
```

- [ ] **Step 3: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/endo-acceptance.test.ts`
Expected: PASS (6 + 1 expected failure). Prototype console: `MH: EtCO2 40/48/63/84/102 at 0/5/10/15/20 min; core +1.17 °C at 15 min; HR 75 → 141; K 6`; `dantrolene, fixed MV: EtCO2 peak 110 at +6.0 min`; `dantrolene + MV×2: HR 141 → 129/121 at +15/+20 min; core 39.78` (the `it.fails`); `stimulus: HR 75.1 → 93.8 (+24.8 %)`; `hypoglycaemia: glucose 55 mg/dL, HR 75 → 103`; `sepsis MANUAL: HR 120, core 38.76, glucose 167`. If an assertion misses, R45 applies: find the MECHANISM within the tables' ranges, never widen the band; if none exists, turn that `it` into `it.fails` with the measured number and report it. If the `it.fails` starts passing, make it `it` and record the number.

- [ ] **Step 4: Commit and push**

```bash
git add packages/engine-core/test/engine/endo-acceptance.test.ts packages/engine-core/vite.config.ts
git commit -m "test(endo): engine acceptance (MANUAL) — MH EtCO2/core/HR/K, dantrolene via 7g, stress time course, glucose via 7g, hypoglycaemic tachycardia, warm septic shock" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7e-endocrine-thermal
```

### Task 15: Engine acceptance, MODELED circulation — septic shock warm → cold (tables §7 check 16) and anaphylaxis with epinephrine rescue

**Files:**
- Create: `packages/engine-core/test/engine/endo-circ-acceptance.test.ts`
- Modify: `packages/engine-core/vite.config.ts` (the SLOW list, one line)

**Interfaces:**
- Consumes: 7a's MODELED engine (`mode: 'modeled'`), its `circ` 1 Hz event (`co`) and `state` values (`sbp`, `dbp`, `hr`, `cvp`); 7g's `epinephrine` drug event; the circ seam (Task 11 `writeCirc`).

- [ ] **Step 1: Write the tests** `packages/engine-core/test/engine/endo-circ-acceptance.test.ts`

The restored tables §7 check 16 bands (R45: warm MAP 55–60, HR 115–130, CO 7–9, SVR 500–700; cold CO 3–4, SVR 1200–1500), one `it` per band on a shared run. Five are `it.fails` with the prototype's numbers (Q-7e-7): the mechanisms that would reach them are 7a's (Requests), not 7e's. The anaphylaxis window is the tables' "onset 1–10 min after an IV trigger" (the first version's 5 min was an [ENG] choice).

```ts
// Stage 7e × 7a acceptance, MODELED circulation (tables §7 check 16; §5e anaphylaxis). The endocrine multipliers reach
// 7a through circ.ext.endo*; epinephrine is Stage 7g's drug event (its haemodynamics are 7g's, its mast-cell β2 is 7e's).
// The septic patient is anaesthetised and ventilated (the check-16 setting; no febrile rigors against a fixed
// spontaneous ventilation — Stage 3 has no chemoreflex ventilation until 7f). One run per scenario, one `it` per band.
import { beforeAll, describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent } from '../../src/types.ts';
import { ADULT, ev3, run, vent } from '../helpers/resp.ts';

type State = Extract<EngineEvent, { type: 'state' }>;
type Circ = Extract<EngineEvent, { type: 'circ' }>;
const avg = <T extends EngineEvent>(ev: EngineEvent[], type: T['type'], t0: number, t1: number, f: (x: T) => number) => {
  const s = ev.filter((x) => x.type === type && (x as { t: number }).t >= t0 && (x as { t: number }).t < t1) as T[];
  return s.reduce((a, x) => a + f(x), 0) / s.length;
};
/** MAP, HR, CO and the clinical SVR 80·(MAP − CVP)/CO (dyn·s/cm⁵) over [t0, t1). */
function haemo(ev: EngineEvent[], t0: number, t1: number) {
  const map = avg<State>(ev, 'state', t0, t1, (x) => (x.values.sbp! + 2 * x.values.dbp!) / 3);
  const cvp = avg<State>(ev, 'state', t0, t1, (x) => x.values.cvp ?? 0);
  const co = avg<Circ>(ev, 'circ', t0, t1, (x) => x.co);
  return { map, hr: avg<State>(ev, 'state', t0, t1, (x) => x.values.hr!), co, svr: (80 * (map - cvp)) / co };
}
function rig() {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: ADULT });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  return { e, ev };
}

describe('Stage 7e × 7a (MODELED): septic shock warm → cold (tables §7 check 16)', { timeout: 900_000 }, () => {
  let warm = { map: 0, hr: 0, co: 0, svr: 0 };
  let cold = { map: 0, hr: 0, co: 0, svr: 0 };
  beforeAll(async () => {
    const { e, ev } = rig();
    e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
    e.dispatch(vent(12));
    await run(e, 120);
    e.dispatch(ev3({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'warm', rampS: 600 }));
    await run(e, 120 + 3600);
    warm = haemo(ev, 120 + 3480, 120 + 3600);
    e.dispatch(ev3({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'cold', rampS: 1200 }));
    await run(e, 120 + 7200);
    cold = haemo(ev, 120 + 7080, 120 + 7200);
    console.log(`sepsis warm: MAP ${warm.map.toFixed(0)} HR ${warm.hr.toFixed(0)} CO ${warm.co.toFixed(1)} SVR ${warm.svr.toFixed(0)}; cold: MAP ${cold.map.toFixed(0)} HR ${cold.hr.toFixed(0)} CO ${cold.co.toFixed(1)} SVR ${cold.svr.toFixed(0)}`);
  }, 900_000);
  // R45 misses (prototype, Q-7e-7): warm HR 131, MAP 61, CO 5.0, SVR 866; cold SVR 1510. 7a's baroreflex restores the
  // SVR the vasoplegia removed and nothing raises venous return (see Requests: 7a baroreflex × vasoResp, septic RVR).
  it.fails('warm HR 115–130 (prototype 131)', () => {
    expect(warm.hr).toBeGreaterThanOrEqual(115);
    expect(warm.hr).toBeLessThanOrEqual(130);
  });
  it.fails('warm MAP 55–60 (prototype 61)', () => {
    expect(warm.map).toBeGreaterThanOrEqual(55);
    expect(warm.map).toBeLessThanOrEqual(60);
  });
  it.fails('warm CO 7–9 L/min (prototype 5.0)', () => {
    expect(warm.co).toBeGreaterThanOrEqual(7);
    expect(warm.co).toBeLessThanOrEqual(9);
  });
  it.fails('warm SVR 500–700 dyn·s/cm⁵ (prototype 866)', () => {
    expect(warm.svr).toBeGreaterThanOrEqual(500);
    expect(warm.svr).toBeLessThanOrEqual(700);
  });
  it('cold CO 3–4 L/min', () => {
    expect(cold.co).toBeGreaterThanOrEqual(3);
    expect(cold.co).toBeLessThanOrEqual(4);
  });
  it.fails('cold SVR 1200–1500 dyn·s/cm⁵ (prototype 1510)', () => {
    expect(cold.svr).toBeGreaterThanOrEqual(1200);
    expect(cold.svr).toBeLessThanOrEqual(1500);
  });
});

describe('Stage 7e × 7a (MODELED): anaphylaxis grade III (tables §5e)', { timeout: 600_000 }, () => {
  it('MAP falls ≥ 30 % within 10 min of the trigger (tables: onset 1–10 min); epinephrine 100 µg ×2 (7g) restores ≥ 80 % of baseline within 3 min of the second dose', async () => {
    const { e, ev } = rig();
    await run(e, 120);
    const base = haemo(ev, 60, 120).map;
    e.dispatch(ev3({ kind: 'condition', id: 'anaphylaxis', severity: 0.75 }));
    await run(e, 720);
    const low = haemo(ev, 700, 720).map;
    e.dispatch(ev3({ kind: 'drug', drugId: 'epinephrine', dose: 100, unit: 'mcg', route: 'iv' }));
    await run(e, 840);
    e.dispatch(ev3({ kind: 'drug', drugId: 'epinephrine', dose: 100, unit: 'mcg', route: 'iv' }));
    await run(e, 1020);
    const rescued = haemo(ev, 1000, 1020).map;
    console.log(`anaphylaxis: MAP ${base.toFixed(0)} → ${low.toFixed(0)} at 10 min → ${rescued.toFixed(0)} after 2 × 100 µg`);
    expect(low).toBeLessThanOrEqual(0.7 * base);
    expect(rescued).toBeGreaterThanOrEqual(0.8 * base);
  });
});
```

- [ ] **Step 2: Add the file to the SLOW set** — in `packages/engine-core/vite.config.ts`, after the line added in Task 14 add:

```ts
  'test/engine/endo-circ-acceptance.test.ts', // Stage 7e: MODELED sepsis warm → cold (2 sim-h)
```

- [ ] **Step 3: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/endo-circ-acceptance.test.ts`
Expected: PASS (2 + 5 expected failures). Prototype console: `sepsis warm: MAP 61 HR 131 CO 5.0 SVR 866; cold: MAP 79 HR 79 CO 3.8 SVR 1510`; `anaphylaxis: MAP 94 → 62 at 10 min → 101 after 2 × 100 µg`. Mechanisms already tried inside the tables (keep them): warm SVR row 0.4 and cold 1.0 (tables 0.4–0.55 / 1.0–1.2), `vasoResp` scaling the catecholamine EXCESS (decision 8), the conditions' HR rows omitted in MODELED (decision 14; applying them gave HR 176). Before accepting any `it.fails`, try once more within the tables (e.g. warm V0 +10–15 %, extraSymp) and record each attempt's numbers in the gate note; never move a band. If an `it.fails` passes after main moved (e.g. FU-2 or 7a calibration landed), make it `it` and record the number.

- [ ] **Step 4: Commit and push**

```bash
git add packages/engine-core/test/engine/endo-circ-acceptance.test.ts packages/engine-core/vite.config.ts
git commit -m "test(endo): MODELED acceptance — septic shock warm→cold per band (tables §7 check 16; five R45 misses recorded) and anaphylaxis with epinephrine rescue" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7e-endocrine-thermal
```

### Task 16: Determinism, CPU budget and the long run (`LONGRUN_HOURS`)

**Files:**
- Create: `packages/engine-core/test/engine/endo-longrun.test.ts` (matches the SLOW pattern `*longrun*` already in `vite.config.ts`)

**Interfaces:**
- Consumes: `LONGRUN_HOURS`, `expectedIndex` (`test/helpers/longrun.ts`, CI rule amendment); `read62`, `rig3`, `run`, `stateSeries`, `ev3`, `ADULT` (`test/helpers/resp.ts`); `createEndoCore`, `NEUTRAL_ENDO_INPUTS`, `stepEndoCore`, `createThermal`, `stepThermal`.

- [ ] **Step 1: Write the tests** `packages/engine-core/test/engine/endo-longrun.test.ts`

```ts
// Stage 7e: determinism, CPU ≤ 0.05 ms per tick for the 7e work, long-run no-drift (24 h locally, 6 h on CI: the CI
// rule amendment's LONGRUN_HOURS) with per-sim-minute yielding.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createEndoCore, NEUTRAL_ENDO_INPUTS, stepEndoCore } from '../../src/l2/endo/core.ts';
import { createThermal, stepThermal } from '../../src/l2/thermal/heat.ts';
import type { EngineEvent } from '../../src/types.ts';
import { expectedIndex, LONGRUN_HOURS } from '../helpers/longrun.ts';
import { ADULT, ev3, read62, rig3, run, stateSeries } from '../helpers/resp.ts';

describe('Stage 7e long-run', () => {
  it('same seed + script → identical co2 samples and endo events; another seed differs', { timeout: 300_000 }, async () => {
    const go = async (seed: number) => {
      const { e, ev } = rig3({ seed, patient: { ...ADULT, endo: { diabetes: 'type2' } } });
      e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
      e.dispatch(ev3({ kind: 'stimulus', intensity: 1 }));
      e.dispatch(ev3({ kind: 'condition', id: 'sepsis', severity: 0.5, phase: 'warm' }));
      e.dispatch(ev3({ kind: 'drug', drugId: 'dextrose', dose: 10, unit: 'g', route: 'iv' }));
      await run(e, 600);
      const h = createHash('sha256');
      h.update(Buffer.from(read62(e, 'co2', 1, 600).buffer));
      h.update(JSON.stringify(ev.filter((x) => x.type === 'endo')));
      return h.digest('hex');
    };
    expect(await go(11)).toBe(await go(11));
    expect(await go(11)).not.toBe(await go(12));
  });

  it('CPU: one heat step + one endocrine step per simulated second cost ≤ 0.05 ms per 20 ms tick (≤ 2.5 ms per step pair)', () => {
    const th = createThermal(36.8, 70);
    th.anaesthesia = 'general';
    const c = createEndoCore();
    const t0 = performance.now();
    for (let s = 1; s <= 3600; s++) {
      stepThermal(th, s, 1);
      stepEndoCore(c, NEUTRAL_ENDO_INPUTS, 1);
    }
    const perStepPair = (performance.now() - t0) / 3600; // ms
    console.log(`7e CPU: ${(1000 * perStepPair).toFixed(1)} µs per simulated second = ${((1000 * perStepPair) / 50).toFixed(2)} µs per tick`);
    expect(perStepPair / 50).toBeLessThanOrEqual(0.05); // 50 ticks per simulated second
  });

  it(`${LONGRUN_HOURS} h at rest (awake, 21 °C): latestSampleIndex(co2) = 62.5 × t + 6; tempCore, glucose and the stress index do not drift (24 h locally, 6 h on CI)`, { timeout: 1_800_000 }, async () => {
    const { e, ev } = rig3({ patient: ADULT });
    for (let h = 1; h <= LONGRUN_HOURS; h++) await run(e, h * 3600); // run() yields once per simulated minute
    expect(e.latestSampleIndex('co2')).toBe(expectedIndex(62.5, 6));
    const tc = stateSeries(ev, 'tempCore');
    expect(Math.abs(tc[tc.length - 1]![1] - 36.8)).toBeLessThan(0.02);
    const endo = ev.filter((x): x is Extract<EngineEvent, { type: 'endo' }> => x.type === 'endo');
    expect(endo[endo.length - 1]!.t).toBe(LONGRUN_HOURS * 3600);
    expect(Math.abs(endo[endo.length - 1]!.glucoseMgDl - 100)).toBeLessThanOrEqual(1);
    expect(endo[endo.length - 1]!.stressIndex).toBe(0);
  });
});
```

- [ ] **Step 2: Run** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/endo-longrun.test.ts` (6 h), then locally without `CI` (24 h, alone on the machine; record the wall time in the gate note).
Expected: PASS. Prototype: identical hashes; `7e CPU: 4.0 µs per simulated second = 0.08 µs per tick`; 6 h horizon exact, no drift.

- [ ] **Step 3: Commit and push**

```bash
git add packages/engine-core/test/engine/endo-longrun.test.ts
git commit -m "test(endo): determinism, CPU budget, LONGRUN_HOURS no-drift with the co2 sample index" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7e-endocrine-thermal
```

### Task 17: Renderer endo panel (glucose tile; instructor stress block)

**Files:**
- Create: `packages/renderer/src/endo-panel.ts`, `packages/renderer/test/endo-panel.test.ts`
- Modify: `packages/renderer/src/index.ts` (one export line at the end)

**Interfaces:**
- Consumes: `EndoEvent` (Task 1).
- Produces: `mountEndoPanel(host: HTMLElement, opts: { instructor: boolean }): { update(e: EndoEvent): void; destroy(): void }` — glucose (mmol/L and mg/dL, `data-level` amber < 3.9, red < 3.0, amber > 10) and, only when `instructor` is true, the stress index, epinephrine, cortisol, MH activity, peripheral temperature and the shivering/sweating/vasoconstriction flags. Skins never mount it with `instructor: true`.

- [ ] **Step 1: Write the failing test** `packages/renderer/test/endo-panel.test.ts` (the renderer's DOM tests use `happy-dom`, as 7c's `lab-panel.test.ts` does)

```ts
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { mountEndoPanel } from '../src/endo-panel.ts';

const E = { type: 'endo' as const, t: 1, glucoseMgDl: 50, glucoseMmolL: 2.8, insulinUuMl: 30, epinephrinePgMl: 600, norepinephrinePgMl: 400, cortisolNmolL: 900, stressIndex: 72, mhActivity: 0, shivering: false, sweating: true, vasoconstricted: false, tempPeriphC: 33 };

describe('endo panel', () => {
  it('shows glucose with a red level-2 flag; hides the stress index unless instructor', () => {
    const host = document.createElement('div');
    const p = mountEndoPanel(host, { instructor: false });
    p.update(E);
    expect(host.textContent).toContain('2.8');
    expect(host.querySelector('[data-level="red"]')).not.toBeNull();
    expect(host.textContent).not.toContain('72');
    const h2 = document.createElement('div');
    mountEndoPanel(h2, { instructor: true }).update(E);
    expect(h2.textContent).toContain('72');
    p.destroy();
    expect(host.childElementCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run it** — `npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run test/endo-panel.test.ts` — Expected: FAIL (`Failed to resolve import "../src/endo-panel.ts"`).

- [ ] **Step 3: Implement** `packages/renderer/src/endo-panel.ts`

```ts
// Stage 7e endo panel: glucose for everyone; the stress/hormone block for the instructor view only (plan decision 15).
import type { EndoEvent } from '@pme/engine-core';

export function mountEndoPanel(host: HTMLElement, opts: { instructor: boolean }): { update(e: EndoEvent): void; destroy(): void } {
  const root = document.createElement('div');
  root.className = 'pme-endo';
  const glu = document.createElement('div');
  root.append(glu);
  const inst = document.createElement('div');
  if (opts.instructor) root.append(inst);
  host.append(root);
  return {
    update(e) {
      const level = e.glucoseMmolL < 3.0 ? 'red' : e.glucoseMmolL < 3.9 || e.glucoseMmolL > 10 ? 'amber' : 'normal';
      glu.dataset.level = level;
      glu.textContent = `GLU ${e.glucoseMmolL.toFixed(1)} mmol/L (${e.glucoseMgDl} mg/dL)`;
      if (opts.instructor) {
        const flags = [e.shivering && 'shivering', e.sweating && 'sweating', e.vasoconstricted && 'vasoconstricted'].filter(Boolean).join(', ');
        inst.textContent = `stress ${e.stressIndex} · epi ${e.epinephrinePgMl} pg/mL · cortisol ${e.cortisolNmolL} nmol/L · MH ${e.mhActivity} · Tp ${e.tempPeriphC} °C${flags ? ' · ' + flags : ''}`;
      }
    },
    destroy() {
      root.remove();
    },
  };
}
```
and append to `packages/renderer/src/index.ts`:
```ts
export { mountEndoPanel } from './endo-panel.ts'; // Stage 7e
```

- [ ] **Step 4: Run** `npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run test/endo-panel.test.ts && npx -y pnpm@9.15.9 --filter @pme/renderer typecheck` — Expected: PASS.

- [ ] **Step 5: Commit and push**

```bash
git add packages/renderer/src/endo-panel.ts packages/renderer/test/endo-panel.test.ts packages/renderer/src/index.ts
git commit -m "feat(renderer): endo panel — glucose with ADA levels, instructor-only stress index and hormones" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7e-endocrine-thermal
```

### Task 18: Demo `stage7e.html` — MH crisis, hypothermia under GA with warming, sepsis warm → cold, hypoglycaemia under GA

**Files:**
- Create: `apps/demo/stage7e.html`, `apps/demo/src/stage7e.ts`, `apps/demo/scripts/stage7e-shots.mjs`, `apps/demo/e2e/stage7e.e2e.ts`
- Modify: `apps/demo/vite.config.ts` (one input line), `apps/demo/index.html` (one link line)

**Interfaces:**
- Consumes: `mountMonitor`, `mountEndoPanel` (`@pme/renderer`); the engine's `endo` events through `MonitorHandle.on`; 7g's `drug`/`infusion`, 7c's `fluid`, Stage 3's `thermal`/`ventilation`/`condition mh` and 7e's events. Every scripted step is sent with `atTick` so it lands at its simulated time at any speed (0.25–4; GV-obs: no × 10).
- Produces: `window.__pme7e = { start(scenario), send, simT(), endo(), timeScale(k), ready }` for the screenshot script and the e2e.

- [ ] **Step 1: Write the e2e smoke** `apps/demo/e2e/stage7e.e2e.ts` (≈ 2.3 min at × 4: Chromium only, the G7g/G7x rule)

```ts
// Stage 7e page smoke: the MH scenario runs, the endo panel fills from the 1 Hz event, EtCO2/temperature move, the
// dantrolene button is accepted by 7g. ≈ 2.5 min of ×4 simulation: Chromium only (G7g/G7x rule for long e2e runs).
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});
test.afterAll(async () => vite?.close());

type Hook = { simT(): number; endo(): { mhActivity: number; glucoseMgDl: number; epinephrinePgMl: number } | null; ready: boolean };
const hook = (page: Page) => page.evaluate(() => {
  const h = (window as unknown as Record<string, Hook>)['__pme7e']!;
  return { t: h.simT(), endo: h.endo() };
});

test('stage7e page: MH crisis → endo panel, MH activity, epinephrine surge; dantrolene accepted', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'long ×4 run (> 2 min): Chromium only (G7g/G7x)');
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1280, height: 640 });
  await page.goto(`${base}/stage7e.html`);
  await page.waitForFunction(() => (window as unknown as { __pme7e?: Hook }).__pme7e?.ready === true);
  await page.waitForFunction(() => (window as unknown as Record<string, Hook>)['__pme7e']!.simT() >= 60 + 480, undefined, { timeout: 240_000, polling: 1000 });
  const h = await hook(page);
  expect(h.endo!.mhActivity).toBeGreaterThan(0.4);
  expect(h.endo!.epinephrinePgMl).toBeGreaterThan(60);
  await expect(page.locator('.pme-endo')).toContainText('GLU');
  await expect(page.locator('.pme-endo')).toContainText('MH');
  await page.click('#dant');
  await page.waitForTimeout(3000);
  await expect(page.locator('#log')).toContainText('dantrolene');
  expect(errors).toEqual([]);
});
```

Run: `PW_SYSTEM_CHROME=1 npx playwright test apps/demo/e2e/stage7e.e2e.ts` — Expected: FAIL (404 / `__pme7e` never ready).

- [ ] **Step 2: Write** `apps/demo/stage7e.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Stage 7e: endocrine, glucose and thermoregulation</title>
  <style>
    body { margin: 0; background: #000; color: #ddd; font: 13px system-ui, sans-serif; display: grid; grid-template-columns: minmax(0, 1fr) 380px; height: 100vh; }
    #monitor { min-height: 0; height: 100vh; }
    aside { padding: 8px 10px; overflow: auto; border-left: 1px solid #333; }
    fieldset { border: 1px solid #333; margin: 0 0 6px; padding: 4px 8px; }
    legend { color: #888; }
    button, select { margin: 2px; font: inherit; }
    .pme-endo { font: 13px ui-monospace, monospace; margin: 4px 0 8px; }
    .pme-endo [data-level='amber'] { color: #ffbf40; }
    .pme-endo [data-level='red'] { color: #ff5c5c; }
    #log { white-space: pre; font: 11px ui-monospace, monospace; color: #8f8; }
  </style>
</head>
<body>
  <div id="monitor"></div>
  <aside>
    <div id="endo"></div>
    <fieldset><legend>Scenario (restarts the patient)</legend>
      <button id="mh">MH crisis (GA, ventilated)</button>
      <button id="hypo">Hypothermia under GA</button>
      <button id="sepsis">Sepsis warm → cold (MODELED)</button>
      <button id="gluc">Diabetic hypoglycaemia under GA</button>
    </fieldset>
    <fieldset><legend>MH</legend>
      <button id="dant">Dantrolene 2.5 mg/kg</button><button id="mv">Double MV (RR 24)</button>
    </fieldset>
    <fieldset><legend>Temperature</legend>
      <button id="warmOn">Forced air on</button><button id="warmOff">Forced air off</button>
      <button id="cold">2 L crystalloid over 30 min</button><button id="warmer">Fluid warmer</button>
      <button id="emerge">Emerge (anaesthesia off)</button>
    </fieldset>
    <fieldset><legend>Glucose</legend>
      <button id="d50">D50 25 g</button><button id="insStop">Stop insulin</button>
    </fieldset>
    <fieldset><legend>Speed</legend>
      <select id="speed"><option value="1">×1</option><option value="2">×2</option><option value="4" selected>×4</option></select>
    </fieldset>
    <div id="log"></div>
  </aside>
  <script type="module" src="./src/stage7e.ts"></script>
</body>
</html>
```

- [ ] **Step 3: Write** `apps/demo/src/stage7e.ts`

```ts
// Stage 7e demo: MH crisis with dantrolene, hypothermia under GA with warming and cold fluid, sepsis warm → cold
// (MODELED circulation), diabetic hypoglycaemia under GA. The endo panel (instructor view) is fed by the 1 Hz `endo`
// event. Drugs and fluids are Stage 7g's and 7c's events; 7e owns `stimulus`, `thermal7e` and its conditions.
import type { Command, EngineEvent, EngineOptions } from '@pme/engine-core';
import { mountEndoPanel, mountMonitor, type MonitorHandle } from '@pme/renderer';

type Body = Record<string, unknown>;
type Endo = Extract<EngineEvent, { type: 'endo' }>;
type Scenario = 'mh' | 'hypo' | 'sepsis' | 'gluc';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let pm: MonitorHandle | null = null;
let panel: ReturnType<typeof mountEndoPanel> | null = null;
let tMon = 0;
let seq = 0;
let lastEndo: Endo | null = null;
const log: string[] = [];
const note = (s: string) => {
  log.push(`${Math.round(tMon)} s  ${s}`);
  $('log').textContent = log.slice(-14).join('\n');
};

/** Send at the monitor's clock + delayS (atTick: a script step lands at its simulated time whatever the speed). */
async function send(body: Body, delayS = 0): Promise<boolean> {
  if (!pm) return false;
  const r = await pm.dispatch({ id: `e${++seq}`, issuedBy: 'stage7e', ...body, atTick: Math.round((tMon + 0.3 + delayS) * 50) } as Command);
  if (!r.accepted) console.warn('rejected', body, r.reason);
  return r.accepted;
}
const event = (e: Body, delayS = 0) => send({ type: 'applyEvent', event: e }, delayS);
const drug = (drugId: string, dose: number, unit: string) => event({ kind: 'drug', drugId, dose, unit, route: 'iv' });
const vent = (rr = 12) => event({ kind: 'ventilation', source: 'ventilator', rr, vtMl: 500, fio2: 0.5, peep: 5 });

function start(s: Scenario): void {
  pm?.destroy();
  panel?.destroy();
  $('monitor').innerHTML = '';
  tMon = 0;
  lastEndo = null;
  log.length = 0;
  const engine: EngineOptions = {
    seed: 7,
    ...(s === 'sepsis' ? { mode: 'modeled' as const } : {}),
    patient: {
      ageY: 40, sex: 'M', weightKg: 70, heightCm: 175,
      ...(s === 'gluc' ? { endo: { diabetes: 'type1' as const } } : {}),
      sensors: { abp: 'connected', spo2: 'on', co2: 'on', temp: 'on' },
    },
  };
  pm = mountMonitor($('monitor'), { skin: 'philips-like', engine, lanes: ['ecgII'], waves: ['abp', 'pleth', 'co2'], temp: true });
  panel = mountEndoPanel($('endo'), { instructor: true });
  pm.on((x) => {
    const t = (x as { t?: number }).t;
    if (typeof t === 'number' && t > tMon && x.type !== 'tone') tMon = Math.min(t, tMon + 5);
    if (x.type === 'endo') {
      lastEndo = x;
      panel?.update(x);
    }
  });
  pm.setTimeScale(Number($<HTMLSelectElement>('speed').value));
  if (s === 'mh') {
    void event({ kind: 'thermal', anaesthesia: 'general' });
    void vent();
    void event({ kind: 'condition', id: 'mh', severity: 1 }, 60);
    note('GA, ventilator 12 × 500 mL; MH trigger at 60 s — watch EtCO2, HR, temperature');
  } else if (s === 'hypo') {
    void event({ kind: 'thermal', anaesthesia: 'general' });
    void vent();
    void event({ kind: 'thermal7e', exposure: 'exposed' });
    void event({ kind: 'thermal7e', exposure: 'draped' }, 600);
    note('GA, exposed for 10 min then draped: redistribution, then the linear phase');
  } else if (s === 'sepsis') {
    void event({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'warm', rampS: 600 });
    void event({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'cold', rampS: 1200 }, 1800);
    note('septic shock: warm (vasodilated, high CO), cold from 30 min (low CO, high SVR)');
  } else {
    void event({ kind: 'thermal', anaesthesia: 'general' });
    void vent();
    void event({ kind: 'stimulus', intensity: 0.5 });
    void event({ kind: 'infusion', drugId: 'insulin', rate: 20, unit: 'units/h' }, 60);
    note('type 1 diabetic under GA; insulin 20 U/h from 60 s (the wrong infusion) — unexplained tachycardia?');
  }
}

$('mh').onclick = () => start('mh');
$('hypo').onclick = () => start('hypo');
$('sepsis').onclick = () => start('sepsis');
$('gluc').onclick = () => start('gluc');
$('dant').onclick = () => void drug('dantrolene', 2.5, 'mg/kg').then(() => note('dantrolene 2.5 mg/kg'));
$('mv').onclick = () => void vent(24).then(() => note('RR 24: doubling MV only slows the EtCO2 rise'));
$('warmOn').onclick = () => void event({ kind: 'thermal', warming: true }).then(() => note('forced air on (30 min warm-up)'));
$('warmOff').onclick = () => void event({ kind: 'thermal', warming: false });
$('cold').onclick = () => void event({ kind: 'fluid', fluid: 'balanced', volumeMl: 2000, overS: 1800 }).then(() => note('2 L at room temperature over 30 min'));
$('warmer').onclick = () => void event({ kind: 'thermal7e', fluidWarmer: true }).then(() => note('fluid warmer: IV at 37 °C'));
$('emerge').onclick = () => void event({ kind: 'thermal', anaesthesia: 'none' }).then(() => note('emergence: shivering once the threshold passes the core'));
$('d50').onclick = () => void drug('dextrose', 25, 'g').then(() => note('D50 25 g'));
$('insStop').onclick = () => void event({ kind: 'infusion', drugId: 'insulin', rate: 0, unit: 'units/h' });
$('speed').onchange = () => pm?.setTimeScale(Number($<HTMLSelectElement>('speed').value));

start('mh');
(window as unknown as { __pme7e: unknown }).__pme7e = {
  start, send, simT: () => tMon, endo: () => lastEndo, timeScale: (k: number) => pm?.setTimeScale(k), ready: true,
};
```

- [ ] **Step 4: Register the page** — in `apps/demo/vite.config.ts` `build.rollupOptions.input`, after `        stage7g: page('stage7g'), // Stage 7g` add `        stage7e: page('stage7e'), // Stage 7e`; in `apps/demo/index.html`, after the `stage7g.html` list item add:

```html
      <li><a href="./stage7e.html">Stage 7e: endocrine, glucose, thermoregulation — MH, hypothermia, sepsis, hypoglycaemia</a></li>
```

- [ ] **Step 5: Write** `apps/demo/scripts/stage7e-shots.mjs`

```js
// Gate 7e screenshots (headless system Chrome). Usage: (cd apps/demo && npx vite preview --port 4817 --strictPort &) then
//   node apps/demo/scripts/stage7e-shots.mjs http://localhost:4817 docs/gates/stage-7e
// Every scenario runs at ×4 to its teaching moment (≈ 50 min wall in total).
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const [base = 'http://localhost:4817', out = 'docs/gates/stage-7e'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 640 } });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
await p.goto(`${base}/stage7e.html`);
await p.waitForFunction(() => window.__pme7e?.ready === true);
const simT = () => p.evaluate(() => window.__pme7e.simT());
const endo = () => p.evaluate(() => window.__pme7e.endo());
const waitSim = (t) => p.waitForFunction((t) => window.__pme7e.simT() >= t, t, { timeout: 3_600_000, polling: 1000 });
const shot = (name) => p.screenshot({ path: `${out}/${name}.png`, type: 'png' });
async function scenario(id, simS, name) {
  await p.click(`#${id}`);
  await p.waitForTimeout(500);
  await waitSim(simS);
  await shot(name);
  console.log(name, JSON.stringify(await endo()));
}
await scenario('mh', 60 + 20 * 60, 'mh-20min'); // EtCO2 > 100, core > 38.5, HR ↑
await p.click('#dant');
await waitSim((await simT()) + 20 * 60);
await shot('mh-dantrolene-20min'); // EtCO2 falling; HR still ≈ 120 (no active cooling: the it.fails of Q-7e-5)
await scenario('hypo', 3600, 'hypothermia-60min'); // core ≈ 35.5, vasoconstricted, Tp shown
await scenario('sepsis', 3600, 'sepsis-cold'); // cold phase: low CO/ABP, narrow PP
await scenario('gluc', 3600, 'hypoglycaemia-60min'); // HR ↑, GLU < 3.5 mmol/L (red)
if (errors.length) console.error('page errors:', errors);
await b.close();
```

- [ ] **Step 6: Run** `npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 build && PW_SYSTEM_CHROME=1 npx playwright test apps/demo/e2e/stage7e.e2e.ts`, then the screenshots: `(cd apps/demo && npx vite preview --port 4817 --strictPort &) ; node apps/demo/scripts/stage7e-shots.mjs http://localhost:4817 docs/gates/stage-7e` (≈ 50 min wall, alone on the machine). Expected: e2e PASS (prototype 2.3 min); five PNGs, no page errors; open each and check the teaching moment named in the script's comments (prototype `mh-20min`: epinephrine 486 pg/mL, stress index 93, MH activity 1, sweating). Keep each PNG ≤ 200 KB (re-save with a smaller clip if larger).

- [ ] **Step 7: Commit and push**

```bash
git add apps/demo/stage7e.html apps/demo/src/stage7e.ts apps/demo/scripts/stage7e-shots.mjs apps/demo/e2e/stage7e.e2e.ts apps/demo/vite.config.ts apps/demo/index.html docs/gates/stage-7e
git commit -m "feat(demo): stage7e.html — MH crisis with dantrolene, hypothermia under GA with warming and cold fluid, sepsis warm→cold, hypoglycaemia under GA; e2e smoke and gate screenshots" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7e-endocrine-thermal
```

### Task 19: NOTICES rows N-P17/N-P18, Apache headers, and the physiology-console registry (7x follow-up)

**Files:**
- Modify: `NOTICES.md` (two rows in the Pulse table), `apps/demo/src/physiology-console/organs.ts` (two additive blocks), `packages/engine-core/src/truth.ts` (the `SKIP_PATH` line)
- Test: `npx -y pnpm@9.15.9 check-notices`; the console's own tests

- [ ] **Step 1: Check the headers** — `head -7` of `src/l2/thermal/thresholds.ts`, `src/l2/thermal/environment.ts`, `src/l2/endo/hormones.ts`, `src/l2/endo/glucose.ts` must each start with `// SPDX-License-Identifier: Apache-2.0` and the "Portions derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649)" sentence naming the Pulse file. No other 7e file carries it. `LICENSES/Apache-2.0.txt` exists (7a/7c added it; add it from annex §E only if it does not).

- [ ] **Step 2: Add the rows** at the end of the `### Pulse Physiology Engine (Stage 7a onward)` table (6 columns; IDs must not repeat — 7a uses N-P06/07/10/16, 7c N-P08/09/23, 7d N-P19+; 7e takes N-P17 and N-P18). The claims are limited to what the four headed files contain:

```markdown
| N-P17 | Energy/environment forms: summit metabolism 21·W^0.75 reached 1.8 °C below the shivering threshold; sweat evaporative gain 0.25·h_sw (218 W per °C above threshold); radiation h_r = 4εσ·0.73·T̄³; convection h_c = 10.3·v^0.6; respiratory sensible + latent heat loss — `packages/engine-core/src/l2/thermal/{thresholds,environment}.ts` | Derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), src/cpp/engine/common/system/physiology/EnergyModel.cpp and system/environment/EnvironmentModel.cpp, Copyright 2018-2025 Kitware, Inc. and Contributors, a fork of BioGears 6.1.1 (Copyright 2015 Applied Research Associates, Inc.); Apache License 2.0 (`LICENSES/Apache-2.0.txt`) | derived (Apache header in the files) | Forms re-expressed with consistent units (Pulse's environment resistances are "area/h", audit §5); the two-compartment core/periphery model, its 2/3 core split and 3.5 kJ/kg/°C are Stage 3's, not Pulse's 2-node circuit; the insulation is calibrated to Stage 3's awake balance; anaesthetic thresholds, vasomotion, MH, forced air, IV fluid and the summit/sweat caps are ours (annex B3) | 2026-09-27 |
| N-P18 | Endocrine values and forms: basal plasma CONCENTRATIONS of epinephrine 0.034 µg/L (34 pg/mL) and norepinephrine 0.275 µg/L (275 pg/mL) and their clearances 68.66 / 55 mL/min/kg (Substances); the insulin synthesis line 5.357·G − 328.56 for G ≥ 80 mg/dL (shape only, normalised to the basal secretion) — `packages/engine-core/src/l2/endo/{hormones,glucose}.ts` | Derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), EndocrineModel.cpp and data/Data.xlsx (Substances: Epinephrine, Norepinephrine), Copyright 2018-2025 Kitware, Inc. and Contributors, a fork of BioGears 6.1.1; Apache License 2.0 | derived (Apache header in the files) | Pulse's basal RELEASE rates are not used. They are inconsistent for norepinephrine: 0.008974 µg/kg/min ÷ 55 mL/min/kg = 163 pg/mL at steady state against Pulse's own initial plasma 275 pg/mL (epinephrine is consistent: 0.00229 ÷ 68.66 = 33 vs 34 pg/mL); 7e uses the initial plasma value 275 pg/mL as its basal. Stress/nociception/hypoglycaemia/hypoxia drives, cortisol, the Bergman disposal, thyroid and the conditions are ours | 2026-09-27 |
```

- [ ] **Step 3: The physiology console (7x follow-up, one additive commit)** — only if `apps/demo/src/physiology-console/organs.ts` exists on the branch (7x merged); otherwise write "7x absent" in the gate note.

(a) In `organs.ts`'s group map, after the line `  'hemo.circ.ext.endoHrF': 'endocrine', 'hemo.circ.ext.endoSvrF': 'endocrine', 'hemo.circ.ext.endoEesF': 'endocrine', 'hemo.circ.ext.endoDV0Frac': 'endocrine',` add:
```ts
  'blood.core.endoKShift': 'endocrine', 'blood.core.endoGlucoseMgDl': 'endocrine', cond: 'endocrine', // Stage 7e seams (R51 addendum 16)
```
(b) In `INTERNAL_PREFIXES`, after the 7g line `  'pk.drugs.*.x', 'pk.drugs.*.doses', 'pk.drugs.*.bolusTimes', 'pk.bus.doses', 'pk.lastC', 'pk.due', 'pk.pending', 'pk.macPrev',` add:
```ts
  // 7e machinery: ECG-delta and seam bookkeeping, integrator internals, the heat model's calibration and effector state
  'endo.ecg', 'endo.kfMult', 'endo.lungSev', 'endo.core.hormones.cortDrive', 'endo.core.glucose.x', 'endo.core.glucose.gutMg',
  'endo.core.glucose.gut2Mg', 'endo.core.glucose.egpDef', 'endo.core.glucose.basalExoUuMin', 'endo.core.cond.sepsis.tauS',
  'resp.temp.capCore', 'resp.temp.capPer', 'resp.temp.k0', 'resp.temp.h', 'resp.temp.warmLag', 'resp.temp.vent', 'resp.temp.shiverShift',
```
(c) In `packages/engine-core/src/truth.ts`, replace `const SKIP_PATH = new Set(['dev.alarms.profile', 'hemo.circ.prof', 'hemo.circ.base', 'hemo.circ.ref']);` by (keep any entries another stage added):
```ts
const SKIP_PATH = new Set(['dev.alarms.profile', 'hemo.circ.prof', 'hemo.circ.base', 'hemo.circ.ref', 'endo.core.x', 'endo.core.profile', 'resp.temp.env']); // Stage 7e: its input copy, profile and heat calibration
```
(`endo.core.out` and `resp.temp.out` are already hidden by the `out` key of `SKIP_ANY`; the effects stay visible through `hemo.circ.ext.endo*`, `cond.vasoResp`, `blood.core.endo*` and `endo.core.hormones/glucose/cond`.) Prototype (on `origin/stage-7x-physiology-console`): console tests 114 passed, `truth` tests 11 passed, typecheck clean.

- [ ] **Step 4: Run** `npx -y pnpm@9.15.9 check-notices && npx -y pnpm@9.15.9 --filter demo exec vitest run src/physiology-console && npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/truth.test.ts test/engine/truth-event.test.ts` — Expected: pass.

- [ ] **Step 5: Commit and push (two commits)**

```bash
git add NOTICES.md
git commit -m "docs(notices): N-P17 Pulse energy/environment forms, N-P18 Pulse endocrine basal concentrations and insulin line (R34)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git add apps/demo/src/physiology-console/organs.ts packages/engine-core/src/truth.ts
git commit -m "feat(console): Stage 7e seams grouped under Endocrine; 7e machinery keys internal; input copy and heat calibration pruned from truth (7x follow-up)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7e-endocrine-thermal
```

### Task 20: Full verification, gate note and pull request

**Files:**
- Create: `docs/gates/stage-7e.md`
- Modify: `docs/plans/stage-7e-endocrine-thermal.md` (ticks)

- [ ] **Step 1: Merge main, full run** (alone on the machine)

```bash
git fetch origin && git merge --no-edit origin/main
npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices && PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 test:e2e
PME_TEST_SET=fast CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core test 2>&1 | tail -4 && PME_TEST_SET=slow CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core test 2>&1 | tail -4
```
Expected: all green except the recorded items (Q-7e-8 child desaturation if still open; the `it.fails` of Tasks 14–15 count as passing). Record the test counts per package and both CI sets' counts.

- [ ] **Step 2: Write `docs/gates/stage-7e.md`** with exactly these sections, every number measured on the branch (copy the console lines the tests print):

```markdown
# Gate 7e — endocrine, glucose–insulin, thyroid, thermoregulation (MH), system conditions

Branch `stage-7e-endocrine-thermal` at <sha>, merged with origin/main <sha> (7a, 7b, 7g, 7x, FU-2, 7c, 7d). Plan: docs/plans/stage-7e-endocrine-thermal.md.

## Test counts
engine-core <n> passed / <n> expected failures / <n> skipped (fast set <n>, slow set <n>); renderer <n>; demo <n>; e2e <n> (stage7e 2.3 min, Chromium only). Typecheck, build, check-notices: pass. Long run: 24 h locally in <wall time>; 6 h on CI.

## Acceptance numbers (band → measured)
| Check | Band (source) | Measured |
|---|---|---|
| R39-7 GA unwarmed −0.9/−1.3 °C; warmed nadir | tables/R39-7 | … |
| Stage 3/3.1 thermal tests | unchanged | pass |
| MH EtCO2 at 10 min / slope 10–15 min | ≥ 60 / 3–5 mmHg/min (§7 21) | … |
| MH core at 15 min | ≥ +1 °C (§7 21) | … |
| MH HR at 20 min / K at 20 min | +30–50 / 5.5–6.5 (§5.3, §7 21) | … |
| Dantrolene EtCO2 turn (fixed MV) | 5–10 min (§7 21) | … |
| Dantrolene + MV × 2: HR at +20 min | < 100 (§7 21) | … (it.fails, Q-7e-5) |
| Stimulus HR / onset / offset | +15–25 %, 20–40 s, 2–4 min (§5c) | … |
| Cortisol at 4–6 h | > 1500 nmol/L (§5c) | … |
| Glucose D50 / insulin infusion / lab panel | … | … |
| Type 1 + insulin 20 U/h under GA | < 65 mg/dL, HR ≥ × 1.2 [ENG] | … |
| Sepsis MANUAL HR / core / glucose | 110–130 (§5e) | … |
| Sepsis MODELED warm MAP/HR/CO/SVR | 55–60 / 115–130 / 7–9 / 500–700 (§7 16) | … (it.fails per band, Q-7e-7) |
| Sepsis MODELED cold CO/SVR | 3–4 / 1200–1500 (§7 16) | … |
| Anaphylaxis III MAP fall / rescue | ≥ 30 % in 10 min / ≥ 80 % (§5e onset 1–10 min) | … |
| Thyroid storm core/VO2/HR/SVR | 38.5–41 / 1.3–1.8 / 110–150 / × 0.6 (§5c) | … |
| Cold IV, 1 unit | ≈ 0.25 °C (§5b.4) | … |
| Determinism / CPU per tick / long-run index | identical / ≤ 0.05 ms / exact | … |

## Exceptions applied
E1 (temp shim), E2 (resp pipeline: import, metabolic body, O2 argument, ventilation), E-7e-1 (7c cold-unit line → rs.temp.iv), E-7e-2 (7c lab glucose), E-7e-3 (7c endogenous K term), E-7e-4 (7g gamma-row rate), E-7e-5 (the 7c cold-unit unit test re-specified; any other sibling test changed, with its reason — none expected). Any line 7c/7g already provided instead: named here.

## Deviations (R45) and rulings requested
Q-7e-5 MH HR after dantrolene; Q-7e-7 MODELED septic shock (5 bands; the 7a requests); Q-7e-8 Stage 3 child desaturation 128 s (7c edge 130); every other deviation the executor made, with its before/after numbers.

## Calibration items for Ali (R44)
Q-7e-1 heat Q10; Q-7e-2 awake neuraxial shivering; Q-7e-3 forced-air warm-up lag; Q-7e-4 MH heat × 9, sweat cap 150 W, K efflux 2.2; Q-7e-6 antinociception fallback 0.6; the [ENG] rows of decisions 8, 13 and 17; active cooling for MH (not modelled).

## Screenshots
docs/gates/stage-7e/mh-20min.png, mh-dantrolene-20min.png, hypothermia-60min.png, sepsis-cold.png, hypoglycaemia-60min.png — one line each on what it shows.

## Physiology console (7x)
Groups/INTERNAL/SKIP added (Task 19) — or "7x absent".
```

- [ ] **Step 3: Tick every box of this plan in the branch copy, commit, push**

```bash
git add docs/gates/stage-7e.md docs/plans/stage-7e-endocrine-thermal.md
git commit -m "docs(gates): Stage 7e gate note — acceptance numbers, R45 misses and rulings requested, exceptions, screenshots" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7e-endocrine-thermal
```

- [ ] **Step 4: Open the PR** (do NOT merge)

```bash
gh pr create --base main --head stage-7e-endocrine-thermal --title "Stage 7e: endocrine stress response, glucose–insulin, thyroid, thermoregulation (MH), system conditions" --body "$(cat <<'EOF2'
Stage 7e (R32/R34, R51 addendum 16): l2/thermal (heat balance with anaesthetic thresholds, environment, warming, physical IV term, MH with 7g's dantrolene effect, cascade) and l2/endo (stress hormones, Bergman glucose–insulin fed by 7g's doses, thyroid, sepsis/anaphylaxis/SIRS/hypermetabolic, 7a/7b/7c/7d/7f/7g seams, 1 Hz endo event), demo stage7e.html. Exceptions E1, E2, E-7e-1…5. R45 misses recorded as it.fails with numbers (Q-7e-5, Q-7e-7); ruling requested Q-7e-8. Gate note: docs/gates/stage-7e.md. Stage 3/3.1 thermal tests unchanged.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF2
)"
```
Report: commits, test counts, key numbers, the R45 misses with their numbers, anything undone.

## Self-review (plan writer, after the R50 review)

- R50 fixes: F1 (no drug ids; `bus.doses` every pass in `observeDoses`; infusions from `pk.drugs.<id>.rate` with E-7e-4; dantrolene = `bus.metabolic.dantroleneE`, decision 7 re-fitted — the HR band missed and reported; exogenous epinephrine only for β2/mast cells/metabolism; `glucoseDelta` ignored; fallbacks only without `ps.pk`) — Tasks 4, 7, 10, 11, 13. F2 (`ctx.l1.mode === 'modeled' && ext`; no key-existence test; no `control()` edits; MANUAL rhythm clock with `betaBlunt`) — Tasks 11, 12. F3 (`endoDV0Frac = −dV0Frac·BV/base.v0Sv`) — Task 11. F4 (7a's `prof.betaBlock/betaBlockC`; fever unblunted via `preBlunt`, tested) — Tasks 7, 10, 11. F5 (`stimulus` shape) — Task 1. F6 (depth max; antinoc only with active 7g agents) — Tasks 5, 11. F8 (endogenous K only; E-7e-3) — Tasks 10, 13. F9 (7c's `dkaSeverity`, no ketone drive) — Tasks 10, 11. F10 (`ps.cond.vasoResp`, `fl.kfMult`; no erMax/lactateX; σ left to 7c with the reason) — Tasks 9, 11. F11 (E-7e-1) — Tasks 3, 13. F12 (7b `lungCondition anaphylaxis`; septic ARDS recorded as a gap) — Task 11. Anchors (EngineEvent append-last, exported `metabolic`, `glucose: NORMAL.glucoseMgDl`, chain order, merge before `engine.ts` edits) — Tasks 1, 12, 13. R45 bands restored (stimulus 15–25 %, cortisol > 1500 at 4–6 h, sepsis §7 16 per band, thyroid storm, MH +1 °C by 15 min) with mechanisms and `it.fails` numbers. CI (`LONGRUN_HOURS`, SLOW) — Tasks 14–16. 7x registry — Task 19. Orchestrator addition: the rhythm-clock factor is gated to FU-2's `SINUS_FAMILY` (Task 12), and no 7a `model.ts` line is edited (FU-2's `v0Sv` change is irrelevant to 7e).
- Every code step carries the full file or the exact anchored line, byte-identical to the prototype (one exception: the `mh-dantrolene-20min` comment in `stage7e-shots.mjs`, corrected in the plan after the prototype to match Q-7e-5); later tasks use only names produced earlier (checked against the Interfaces blocks).
- Not prototyped end to end: the engine-level tasks (12–18) on the REAL 7c branch (the resume fixer re-checked anchors, names and the unit tests there, but could not re-apply the shared-file edits in the prototype worktree; the executor's Task 12 Step 5 is the first engine run on it), the 24 h local horizon (6 h ran), the full screenshot script's last four scenarios (the first ran in the e2e and the first shot), the 7d/7f interplay (7d not on the prototype base: 7e reads `organs.liver.glucoseF` duck-typed and 7d reads `endo.core.cond.sepsis.cur`; 7f absent: 7e's fallbacks ran).
