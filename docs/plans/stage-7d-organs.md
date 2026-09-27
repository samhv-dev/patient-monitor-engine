# Stage 7d: Whole-body physiology — brain (ICP/CPP/CBF/PbtO2), kidney (RPP–GFR–UOP, ported from Pulse) and liver/metabolism (lactate, clearance) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the engine a brain, kidneys and a liver where the monitor shows the consequence: an intracranial pressure–volume model (Monro–Kellie with PVI, CSF production/absorption and a finite CSF reserve, mass lesion, oedema, CBV) with CBF pressure autoregulation (plateau per profile, right-shifted in chronic hypertension, impaired in TBI), CO2/O2/temperature reactivity, anaesthetic effects on CMRO2/CBF (from 7g's drug bus and 7f's depth), PbtO2 and SjvO2, a Cushing response (both of the tables' triggers), osmotherapy (7g's mannitol and hypertonic saline, observed on `bus.doses`), head-up posture and herniation; a 125 Hz `icp` waveform (P1/P2/P3 by compliance); a kidney ported from Pulse's renal circuit (RBF, glomerular pressure, GFR, tubuloglomerular feedback plus a myogenic range) with our pressure-natriuresis/stress/effective-volume/PEEP/vasopressor/sepsis/angiotensin/intra-abdominal-pressure terms, UOP, urometer, KDIGO oliguria/AKI state and furosemide (7g's effect-site level); a liver with flow- and temperature-dependent lactate clearance that feeds 7c's clearance seam, a published liver-function factor for 7e and a published GFR factor for 7g's renal drug clearance; ICP/CPP/PbtO2/UOP numerics, alarms, skin tiles and a `stage7d.html` demo (TBI + renal panel).

**Architecture:** Three engine-independent organ models with plain JSON-safe state — `l2/brain/**` (10 Hz), `l2/renal/**` (1 Hz, PORTED from Pulse, Apache headers) and `l2/liver/**` (1 Hz) — driven by one organ pipeline (`l2/organs/pipeline.ts`). The engine calls it in every `advance()` pass after 7g's PK, Stage 3/7b's gas and lungs, 7c's blood and 7e's endocrine step, and immediately before the haemodynamics (R51 addendum 14 order). The pipeline reads every input through `l2/organs/inputs.ts`, an adapter that reads 7a's circulation and Stage 3/7b's gas directly (both on `main`) and DUCK-TYPES the optional modules with neutral fallbacks: 7c's `ps.blood` (`out.albuminGL`, `out.bvRel`, `out.hbfRel`, `out.lactate`), 7g's `ps.pk.bus` (`cns.{cmro2Mult, cbfVaso, propCe, macBrain, ketamineCe}`, `volatiles`, `agents`, `doses`), 7f's `ps.neuro.outputs.cmro2Mult` and 7e's sepsis stage. Outputs: the Cushing surge as L1 `coupled` sbp/dbp plus an HR request in MANUAL and as 7a's `circ.ext.rSysF` in MODELED, ataxic breathing as one optional field on Stage 3's driver, 7c's seams `blood.core.liver` and `blood.core.renal`, the published keys `organs.kidney.gfrRel` (7g) and `organs.liver.glucoseF` (7e), and a 1 Hz `organs` event, `icp` channel, numerics and alarms for L3.

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2, Vite 6.4, Canvas 2D; Playwright (system Chrome) for screenshots; Node ≥ 22.12 (the Pulse oracle, Task 22). No runtime dependencies.

**Spec:** `../research/00-orchestrator-rulings.md` R25 (partition, worktrees), R26 (brain ICP/CPP/CBF/PbtO2, kidney RPP–UOP, liver lactate/drug clearance), R32 (7d scope), R34 (port renal from Pulse: Apache headers, one NOTICES row per ported module; Pulse has NO hepatic model), R37 (weight of evidence), R40 (borrow #7: ICRP-89 flow fractions; Pulse defects D6/D7 never copied), R44 (defaults now; Ali calibrates later), R45 (add the mechanism, never loosen the test; misses stay `it.fails` with their numbers), R48 (7a's `ext.rSysF`/`hrF`, on `main`), R49 (this plan's first review), R50 (review before execution), **R51 + addenda 1–14** (7g owns every drug event and all PK; 7d OBSERVES `bus.doses`; addendum 13/14: canonical cross-stage names, chain order, NOTICES numbering, the MODELED check), gates G7a, G7b, G7g (their NR items: NR-7g-2 dobutamine CO, NR-7g-3 ventilated dead space, NR-7g-5 rhythm rates) and the CI rule amendment (`test/helpers/longrun.ts`); `docs/physiology/stage-7-parameter-tables.md` §1.5 (`htn`, `ckd` rows), §5.1–§5.3, §6.3, §7 checks 17a, 18, 19, 20, §9 Q13, Q37–Q43; `docs/physiology/pulse-parameter-annex.md` §5.1–§5.3, B2 (the 7d porting brief), C (D2, D6, D7, D11, D12, D13, D18, D22), D (O11), E (licence text); `../research/pulse-audit/01-cardiovascular-nervous.md` §2, §6; `../research/08-pulse-design-audit.md` (N-P10, N-P11); plans `docs/plans/stage-7c-blood.md`, `stage-7e-endocrine-thermal.md`, `stage-7f-neuro-depth.md`, `stage-7g-pkpd.md` (their seams, requests and partitions); house style `docs/plans/stage-3-respiratory-gas.md`; runbook `docs/RESUME.md`.

## Global Constraints

- Paths are relative to `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo`. **Work in the worktree** `../scratch/wt-stage-7d` on branch `stage-7d-organs`, created from `origin/main` **after 7c has merged** (execution order R48/R49: 7a, 7b, 7g and 7c first; 7a/7b/7g are REQUIRED — this plan reads 7a's `hemo.circ`, 7b's `staticCompliance(rs.lung)` and 7g's bus). The plan was fixed and prototyped on `origin/stage-7g-pkpd` (`9d3a900`) with `origin/stage-7b-lungs` (`457e98d`) merged locally (7a is inside both). 7c, 7e and 7f may merge before or during this stage: nothing here REQUIRES them (duck typing in `src/l2/organs/inputs.ts`), and every find/replace block in a file another stage also edits quotes the neighbouring comment so it can be located after their merge.
- **Before every task:** `git fetch origin && git merge --no-edit origin/main` in the worktree. If a concurrent stage merged and a find block no longer matches, locate the quoted line by its neighbouring comment and apply the same change; never re-type a line you are not changing. `engine.ts` inserts are placed by CHAIN ORDER (R51 §7, addendum 14), never by literal position: validate/apply device → pk (7g) → neuro (7f) → **organs (7d)** → blood (7c) → endo (7e) → Stage 3 → hemo; advance pk → resp/lung → blood → endo → **organs** → hemo. Re-run the task's tests after the merge.
- **Push after every task commit** (`git push origin stage-7d-organs`). Never push to `main`, never merge (R21: the orchestrator merges). The last task opens the PR with `gh pr create`.
- **CI rule (binding):** every test that runs the engine for more than one simulated minute advances at most one simulated minute per call and yields (`await new Promise((r) => setImmediate(r))`) between minutes (the `organsRig` helper does this), and its `describe` carries `{ timeout: 300_000 }`. Long runs use `test/helpers/longrun.ts` (`LONGRUN_HOURS` = 24 locally, 6 on CI; `expectedIndex(rate, offset)`); the 24 h horizon stays the local gate requirement (record its wall time). Pure model tests (Tasks 3–11) run hours of simulated time in milliseconds and need no yielding. Never run the Pulse oracle (Task 22) concurrently with the full suite (7c gate rule).
- **Partition (R25 spirit):** this stage OWNS `packages/engine-core/src/l2/brain/**`, `src/l2/renal/**`, `src/l2/liver/**`, `src/l2/organs/**`, `src/types-organs.ts`, `test/l2/brain/**`, `test/l2/renal/**`, `test/l2/liver/**`, `test/l2/organs/**`, `test/engine/organs-*.test.ts`, `test/helpers/organs.ts`, `packages/renderer/src/numerics-organs.ts`, `packages/renderer/test/numerics-organs.test.ts`, `packages/skins/test/organs-tiles.test.ts`, `packages/validation/src/oracle/renal-scenarios.ts`, `packages/validation/test/oracle-renal.test.ts`, `apps/demo/stage7d.html`, `apps/demo/src/stage7d.ts`, `apps/demo/scripts/stage7d-shots.mjs`, `apps/demo/e2e/stage7d.e2e.ts`, `docs/gates/stage-7d.md`, `docs/gates/stage-7d/*.png`. It MODIFIES, additively and marked `// Stage 7d`: `src/types.ts` (one import, one line in `ChannelId`, `NumericId`, `Command`, `EngineEvent`), `src/types-hemo.ts` (`SensorId`), `src/engine.ts` (state, constructor rebaseline, restore, chain inserts, flush, buffers, `organsCtx`), `src/index.ts` (one export), `src/l2/resp/driver.ts` (one optional `ataxia` field, Task 13), `src/l3/alarms/profile.ts` (two `LIMIT_KEYS` rows, Task 14), `packages/skins/src/types.ts` + `resolve.ts` + `src/data/skins/{saadat-like,philips-like}.json` (Task 15), `packages/renderer/src/{alarm-view,device-ui}.ts` (Task 15) and `{wave-lanes,skin-plan,index}.ts` (Task 16), `apps/demo/src/stage4a/screen.ts` (`SAMPLE`, Task 15), `apps/demo/vite.config.ts`, `NOTICES.md`. **Additive-merge lines shared with 7f:** `TILE_PARAMS` and `COLOR_KEYS` (`skins/src/types.ts`), `TILE_COLOR_KEY` (`resolve.ts`), `TILE_NUMERICS` (`alarm-view.ts`), `SAMPLE` (`screen.ts`) — on a conflict keep both stages' entries. **Declared exceptions:** **E-7d-1** (R51 addendum 14) — 7g's `src/types-pk.ts` (optional `concentrationPct` on the `drug` event and on `DoseLogEntry`), `src/l2/pk/pipeline.ts` (validate it; copy it into the dose log) and `src/l2/pk/data/rows-other.ts` (the HTS row's name/doses text), Task 17; **E-7d-2** — one line in `packages/controller/src/scenario/driver.ts` (the organ sensors are not scenario sensors, as 7a did for `pv`; without it the grown `SensorId` fails the controller typecheck), Task 1. **Never edit** `src/l2/ecg/**`, `src/l2/hemo/**` (7a's MANUAL tracker findings go to FU-2), `src/l2/circ/**` (`ext.rSysF`/`hrF` are on `main` since R48: no exception), `src/l2/gas/**`, `src/l2/blood/**`, `src/l2/endo/**`, `src/l2/neuro/**`, `docs/physiology/**`.
- Strict TS (`noUncheckedIndexedAccess`, `erasableSyntaxOnly`: no enums, no parameter properties, `verbatimModuleSyntax`), `.ts` import extensions, conventional commits, clean-room: every equation cites the tables row, annex line or paper it implements, or `[ENG]` with the prototype number it was tuned to.
- **Porting rule (R34):** `src/l2/renal/{params,kidney,model}.ts` are PORTED from Pulse 4.3.2's renal circuit and `RenalModel.cpp` — re-expressed, simplified, never copied verbatim — and each starts with the Apache header of annex §E (Task 24 checks it; NOTICES **N-P19**). `src/l2/liver/liver.ts` is OURS (Pulse has no hepatic model) except the 0.255 hepatic flow share, imported from 7a's `ICRP89_FLOW_FRACTIONS_M` (NOTICES N-P10, reused). None of Pulse's audit defects may appear: **no cerebral resistance without autoregulation or CO2 reactivity (D6/D7), no TBI as a pure resistance multiplier, no lactate that only leaves by renal filtration (D2/D22), no clearance without a temperature term (D11), no glucose Tm without splay (D13: not ported here — 7e)**.
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (use your harness's attribution line if it gives a different one; G7b allows the executor's own model name).
- pnpm is not on PATH: `npx -y pnpm@9.15.9 …`. Unit tests: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run <path>`. Full gate: `npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices && PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 test:e2e`.
- All state stays plain JSON-safe data (numbers, arrays, plain objects; no functions, typed arrays, `Infinity` or `NaN` in state): the engine `structuredClone`s it every tick and snapshots travel as JSON.
- **Determinism:** no `Math.random`, no wall clock in L1/L2. The organ models draw no random numbers.
- **CPU budget:** the organ pipeline (brain 10 Hz + kidney/liver 1 Hz + the 125 Hz `icp` samples) must cost ≤ 0.05 ms per 20 ms tick in Node (Task 21 measures; prototype 0.00097 ms).
- **Units (binding):** pressures mmHg, volumes mL, flows mL/min (organ level), time s in state (min only inside rate constants named `_MIN`), CBF/CBV/CMRO2 relative to awake normal (1 = 50 mL/100 g/min, 60 mL, 3.3 mL/100 g/min), UOP mL/min in state and mL/kg/h at the API, lactate mmol/L; 7c's renal seam in mL/h and mmol/h.
- Every `Q<n>` whose default a constant implements is cited beside it (Q13, Q37, Q38, Q39, Q40, Q41, Q42).

---
## Decisions this plan makes where the spec was silent, inconsistent or physically unreachable

1. **CSF buffering is Marmarou absorption with a finite reserve, not the tables' single τ.** Displaced CSF grows at (ICP − ICP0)/Rout (Rout **8** mmHg·min/mL, inside Marmarou's normal 6–10; τ ≈ Rout·PVI/(2.303·ICP) ≈ 8.7 min at ICP 10, tables `tauCsf` 5 min, range 2–15, Q37) and fades as (1 − (d/reserve)²). TBI shrinks the reserve 30 → 10 mL [ENG, **deviation**: the tables' `csfReserve` 20–50 is the normal brain's; check 19's own timeline needs ≈ 11 mL of total compensation — with a reserve of 20 ICP never reached 40 in 30 min, with 12–14 it took 25.7–27.7 min]. Rout 10 gave ICP 20 at 9.1 min; 8 gives 10.8 min (model) and 11.1 min (engine).
2. **Only 40 % of the Grubb CBV change reaches ICP** (`CBV_EFF`, [ENG]): with the whole 60 mL, hyperventilation to PaCO2 30 halved ICP (tables −25–30 %); with 0.4 it gives −26 % (model) and −28 % (engine). Physically the arterial volume fall is partly offset by venous re-expansion as ICP falls.
3. **Autoregulation is a relaxing conductance.** CBF = G·CPP where G relaxes (τ 10 s) toward the conductance that gives the target CBF — a pressure step first moves CBF passively, then autoregulation restores it, and CO2 changes reach CBF within 30 s. Impaired autoregulation (TBI) blends the intact curve with the pressure-passive line CBF ∝ CPP/80 (index 1 → 0.3 at TBI severity 1). ICP ⇄ CBV is solved by a damped 6-iteration fixed point each 100 ms step. The CO2 reference starts at the patient's own PaCO2 (adapted) and re-adapts with τ 8 h.
4. **Cushing has the tables' two triggers** — pre-surge CPP < 40 (MAP LPF τ 120 s, frozen while the surge is on, so the reflex cannot switch itself off) OR ICP within 10 mmHg of the current head MAP — for 30 s → drive (τ on 15 s, off 60 s), ataxic breathing. **MANUAL:** L1 `coupled` sbp/dbp (+1.3·ΔMAP / +0.85·ΔMAP, ΔMAP = 40·drive: the centre of the tables' +30–50 — with 50 the engine read +54 because 7a's waveform MAP sits ≈ 0.45 of the pulse pressure above the diastolic at HR 48) and an HR request × (1 − 0.4·drive) (80 → 48). **MODELED:** 7a's `circ.ext.rSysF = 1 + 1.2·drive` (R48; the check is `ctx.l1.mode === 'modeled' && ext` — never a key-presence test, since 7a's initialiser omits the optional keys); the bradycardia is the baroreflex's answer (Cushing's triad): a direct `hrF` 0.6 on top gave HR 40 and cancelled the rise (+11), so 7d leaves `hrF` at 1.
5. **PbtO2 is sublinear in delivery/demand** (`PBTO2_EXP` 0.75, [ENG]): r = (CBF·CaO2)/(CMRO2·CaO2,normal); PbtO2 = 25·r^0.75·(1 + 0.004·(PaO2 − 100)+) — linear (the tables' formula) gave 9.5 mmHg in check 18 (tables 10–15). SjvO2 = SaO2·(1 − min(0.75, 0.33/r)); `OER0` 0.33 (SjvO2 ≈ 0.65) and `OER_MAX` 0.75 are [ENG] with their rationale in `params.ts`.
6. **Anaesthetic inputs come from the drug layer** (R51 addendum 14): the CMRO2 multiplier is 7f's `neuro.outputs.cmro2Mult`, else 7g's `bus.cns.cmro2Mult`; the direct vasodilation is 7g's `bus.cns.cbfVaso`; "anaesthetised" (kidney stress S, and the GA fallback) is propofol Ce ≥ 1.5, ≥ 0.5 MAC, ketamine ≥ 0.5 × its reference dose, or a drug CMRO2 ≤ 0.85 [ENG]; the liver's volatile term uses `bus.volatiles` sevo + iso + des MAC (N2O excluded). Without a drug effect on the bus, Stage 3's `thermal { anaesthesia: 'general' }` maps to the tables' propofol E 0.6 (CMRO2 ×0.7, INTERIM, marked in code). The tables' per-agent rows (`cmro2Rel`, `vasoDirect`, Matta's net CBF) stay as the unit-tested fallback vocabulary. The old `ext.anaes/alphaExcess/alphaE/sepsis` request and the `brain { anaesthesia }` event are withdrawn.
7. **The kidney is Pulse's circuit collapsed algebraically** (annex B2 "Candidate simplification"): series resistances (both kidneys in parallel), P_gc from the divider, GFR = Kf·(P_gc − P_B − π_gc)+, TGF as a first-order controller (τ 60 s) on R_aff. It is **calibrated on the healthy reference** (MAP 93, CVP 5, CO 0.08 L/min/kg: RBF 17 % of CO via ICRP-89/N-P10) and SETTLED at the start inputs — a profile that starts in shock is oliguric at t = 0 (calibrating on the start state made a GFR-0 start give a set point of 0 and UOP NaN). Bowman pressure 17.1 mmHg [ENG] gives GFR 125 mL/min (180 L/day, tables/annex reference; Pulse's 102 is D12). The R_aff ceiling is Pulse's TGF range × 2 for the **myogenic** response Pulse lacks [ENG]: RBF now holds over RPP 80–185 (tables `rblLL/UL` 80–180; Pulse's range alone let RBF rise 21 % and GFR double at MAP 180). **Intra-abdominal pressure** raises Bowman's pressure to IAP when higher (WSACS filtration gradient MAP − 2·IAP) — otherwise IAP 25 still filtered at RPP 38.
8. **Pressure natriuresis uses Pulse's reabsorption-permeability quadratic as an EXCRETED-FRACTION curve** (EF ∝ (Lp(Pref)/Lp(P))^1.74): exponent 1.74 makes UOP(150)/UOP(100) = 3 (tables U) — but the curve is not the tables' linear U between RPP 40 and 100: at RPP 75 it gives 0.76–0.79 against the line's 0.58 (Task 20 `it.fails`, calibration item). The curve is held above 160 mmHg.
9. **Angiotensin/efferent tone is ADDED** (Pulse has no RAAS: annex B2 stated limits): R_eff × (1 + 3·a), a from RPP below 80 (→ 1 at 40) or effective-volume loss (→ 1 at −20 %); the volume term fades out over RPP 80–110 (renin is suppressed by high perfusion pressure — without it a low-CO, high-MAP state reached GFR 550 mL/min); a follows its target with τ 2 min (an instantaneous term followed 7a's second-to-second CO wobble and swung GFR 27–211). Filtration stops at RPP ≈ 50 (tables `rppZero` 40, range 35–55).
10. **Effective arterial blood volume and a neurohumoral lag drive the volume factor V**: eabv = min(blood volume, (CO/CO0)^0.75) [ENG]; V follows V(eabv) with onset τ 2 min and washout τ 45 min (ADH/aldosterone) [ENG] — the HFrEF low-output state of check 20 is oliguric at normal blood volume (0.114; tables 0.1–0.15) and dobutamine gives 0.233 at 30 min, 0.284 at 60 min (tables 0.2–0.3 within 30–60 min; the instantaneous V gave 0.338). Blood volume is 7c's `out.bvRel`, else 7a's circulating volume ÷ the profile's in MODELED, else the MANUAL `volumeStatus` (0 → −40 %).
11. **KDIGO windows are real time by default** (`timeScale` 1); a `renal { timeScale }` event compresses them for teaching (Q40: 12 → a 30 min window counts as 6 h). The OLIGURIA flag is the rolling 1 h UOP < 0.5 mL/kg/h (compressed likewise).
12. **Lactate: 7c's pool is authoritative when present.** 7d writes the liver FUNCTION `blood.core.liver = liverFn · tempF` (7c multiplies its own `out.hbfRel` — flow is never multiplied in twice) and reports 7c's `out.lactate` in the `organs` event. Hepatic flow is 7c's `out.hbfRel` when present, else CO/CO0 × the splanchnic factor (×0.6 at full sympathetic constriction from volume loss or α-agonists, ×0.8 per MAC volatile). Without 7c the liver runs its own one-compartment pool (basal 1400 mmol/day + 0.03 mmol per mL O2 below DO2crit 6 mL/kg/min) with kLac = 1.4 × (0.6·HBF_rel·liverFn·tempF + 0.3·GFR_rel + 0.1) — hepatic failure scales the LIVER share (×0.3), not the whole kLac (tables-internal conflict: see Deviations, Q41).
13. **Osmotherapy is observed, not owned** (R51 §3, addendum 14): once per engine pass the organs read 7g's `bus.doses` — `mannitol` (amount in mg) acts twice: osmotic brain-water loss (Bateman, τ in 15 min / out 180 min, saturating in mOsm: 0.25 g/kg ≈ 1 g/kg) and osmotic diuresis (14 mL urine per g excreted, plasma t½ 2 h scaled by GFR); `hypertonicSaline` (mL with `concentrationPct` 3 | 7.5 | 23.4, default 3 — exception E-7d-1) acts on the brain only (τ in 7 min, out 240 min); its sodium load is 7c's from the same log entry. Furosemide's diuresis follows 7g's effect-site level (gamma row, ref 20 mg: E = c/(c + 1)); the renal model's own depot remains only for the model-level tests (no 7g).
14. **Herniation** = CPP ≤ 10 for 60 s; a latched flag in v1 (no brainstem-death physiology); reported and alarmed, not modelled further.
15. **Lundberg A/B waves are NOT built** (Q39 open: "v1 or v1.1?"); the waveform has P1/P2/P3 and the respiratory component only.
16. **Commands.** The organs OWN `applyEvent` kinds `brain`, `position`, `renal`, the `condition` ids `tbi | hepaticFailure | aki`, and `attachSensor` sensors `icp | pbto2 | urometer` — **no drug ids**. Their validator runs after 7g's (and 7f's) and before 7c's, 7e's, Stage 3's and Stage 2's, and returns `null` for anything else.
17. **The organs see 4 s means of MAP and CVP** [ENG]: 7a's `hemo.pv` is the instantaneous RA pressure (0–9 mmHg within a cycle) and `lastSite.map` one beat, so the 1 Hz kidney sampled noise.
18. **Published keys** (R51 addenda 13/14): `organs.kidney.gfrRel` (GFR ÷ its set point, 1 Hz; 7g's `pkCtx` reads it — the internal model is `renal`), `organs.liver.glucoseF` (= liver function; 7e multiplies hepatic glucose output by it).

## Prototype results

**Prototype (this revision).** Base: `origin/stage-7g-pkpd` `9d3a900` + `origin/stage-7b-lungs` `457e98d` merged locally (7a inside both), worktree `../scratch/proto-7d`, nothing pushed. Every code block in Tasks 1–23 was run there as written: engine-core typecheck and the whole-repo typecheck/build clean; 7d's model/pipeline tests 53 and organ engine tests 28 (four `it.fails` in all, each recording a known miss with its number); the whole-repo suite with `CI=1` (engine-core 885 passed/2 skipped, controller 196, skins 170, renderer 69, ventilator 88, validation 17); the stage7d e2e smoke (1.0 min); the 24 h soak locally (275 s wall); the Pulse oracle O11 once (334 s). Numbers below are from that run; the engine numbers are what the executor's tests re-measure.

| Check | Model level (pure) | Engine (7a + 7b + 7g) |
|---|---|---|
| Rest (adult) | ICP 10.00, CPP 80, CBF 1.000, PbtO2 25.0, SjvO2 0.65; 24 h no drift | ICP 9.7–9.9; 24 h means: ICP −0.08, hourly UOP +0.4 %, lactate −0.005; icp index 125·t + 12 |
| **Check 19** TBI (PVI 20, ICP0 12, AR 0.3, reserve 10, Rout 8), haematoma 1 mL/min | ICP 20 at **10.8** min, 40 at **23.7** min; Cushing at 28.0 min, ΔMAP +39 at 60 s, HR 80 → 48 | ventilator RR 18/VT 500 (PaCO2 39.5): MANUAL ICP 20 at **11.1**, 40 at **24.5**, CPP < 60 at ICP **25.3**, HR → **48.2**, Cushing ΔMAP **+24** at 60 s (it.fails, 7a tracker) · MODELED ICP 20 at **10.0**, 40 at **22.6**, ΔMAP **+37**, HR 73 → **56** (−24 %) |
| Hyperventilation to PaCO2 30 | −25.8 % (2 min) | RR 30: PaCO2 30 at ≈ 5 min, ICP **−28.2 %** |
| Mannitol 1 g/kg vs control | −25.6 / −31.9 % at 15 / 30 min; 0.25 g/kg −25 % at 35 min | 7g drug event: **−25.2 / −28.2 / −32.2 %** at 15 / 20 / 30 min; UOP 6.0 vs 1.7 mL/kg/h |
| HTS 3 % 250 mL | −26 % at 10 min, −28 % at 60 | 7g drug event (concentrationPct 3): **−25.6 %** at 10 min |
| Head-up 30° | ICP −6.1, CPP −3.1 | ICP **−6.2** |
| **Check 18** 75 y HTN, GA, MAP 65 → PaCO2 25 → recovery | CBF 0.75× / 0.42× / 0.83×, PbtO2 13.0 | MAP 64.7 (CPP 53): **0.62×**; PaCO2 25: **0.376×**, PbtO2 **13.8**; MAP 81 + PaCO2 35: **0.81×** |
| Autoregulation / CO2 / PVI curves | plateau 1 over CPP 60–150; 3 %/mmHg; +9.65 %/mL | CBF/C(PaCO2) = A(CPP) ± 0.01 at CPP 40–142; slope **0.029**/mmHg; +1 mL → **+8.9 %** |
| Kidney rest (70 kg) | RBF 952 (17 % CO), P_gc 57.6, **GFR 125**, FF 0.24, UOP 1.00 awake / 0.60 GA | UOP 1.02–1.07 |
| UOP vs pressure | 0 at MAP ≤ 55 (CVP 5); 0.24 / 0.44 / 0.76 / 1.00 / 1.16 / 1.81 / 3.48 at MAP 65 / 70 / 80 / 93 / 100 / 120 / 150; RBF 952 from MAP 85 to 190 | RPP 97 → 1.21, RPP 144 → 3.44 (ratio 2.85); RBF within 1 % at RPP 97 and 144; IAP 25 at RPP 38 → 0.010 |
| **Check 20** HFrEF (MAP 65, CVP 12, CO 3.5) → dobutamine | **0.114** → **0.233** at 30 min, **0.284** at 60 min | premise not reachable (it.fails): MODELED `hfref` rests at MAP 87, CO 5.6, UOP 0.66 |
| Haemorrhage | class III 0.046, class II 0.305, fluids → 0.53 at 60 min | volumeStatus 0.2: **0.003** + OLIGURIA flag; fluids → **0.69** at 90 min |
| Furosemide 40 mg | depot: peak 7.75 mL/min, 1.18 L/4 h | 7g gamma curve: peak **8.2** mL/min at 15 min, **0.92 L**/4 h |
| Liver | lactate 0.99, kLac 1.40/h, t½ 29.7 min; class III flow 48 min, 33 °C 39 min, failure 51 min | fallback pool 5 → **2.79** at 30 min |
| Pulse O11 (1.1 L bleed, 2 h) | — | resting UOP ours 1.16 vs Pulse 0.38 mL/min (D12); MAP Δ −3.7 vs −1.0; UOP Δ −0.63 vs **+0.33** (Pulse rises: D-R1) |
| CPU (Node, M-series) | — | organ pipeline alone **0.00097 ms** per 20 ms tick (budget 0.05) |

### Deviations from the tables and the annex (for the orchestrator and Ali's R44 calibration pass)

- **TBI CSF reserve 10 mL** (tables `csfReserve` 30, range 20–50) — [ENG]; check 19's timeline needs ≈ 11 mL of total compensation (decision 1, Q37). **Rout 8** is inside Marmarou's normal range; `CBV_EFF` 0.4 [ENG] (decision 2).
- **Check 18 hypocapnic CBF: model 0.42×** at CVP 6 (tables 0.35–0.40) — the pure model's CPP is 59 (ICP ≈ CVP), the tables assume CPP 55 (0.70 × C(25) 0.55 = 0.385). **Through the engine it is in band (0.376×)**: PEEP puts CVP ≈ 12 above ICP as the venous floor (CPP 53). The recovery step is sensitive to that floor: 0.77× at MAP 79, 0.81× at MAP 81.
- **Check 19 MANUAL Cushing ΔMAP +24** at 60 s (tables +30–50): 7a's MANUAL per-beat pressure tracker rings (±20 mmHg, a ≈ 10-beat cycle) at HR 48 with the surged targets; its R-gain 0.15 instead of 0.5 gave +29 (±4) in the prototype. FU-2 item for 7a's owner; `it.fails` until then. MODELED is in band.
- **Check 20 premise unreachable through the engine** (MANUAL `contractility`/`svr` targets do not move 7a's CO; MODELED `hfref` is compensated). Model level carries the check (0.114 → 0.233/0.284, in band). FU-2 request.
- **Mid-curve UOP**: Pulse's quadratic sits above the tables' linear U (0.76–0.79 vs 0.58 at RPP 75) — decision 8.
- **Filtration stops at RPP ≈ 50** (tables `rppZero` 40, range 35–55 — inside the range).
- **Kidney calibrated to GFR 125** (tables/annex 180 L/day; Pulse 102 = D12).
- **Hepatic failure scales the liver share of kLac** (×0.3 → kLac 0.81/h, t½ 51 min), not the whole kLac (the tables' `kLac` row says "×0.3 in liver failure", its clearance-split row scales by organ; whole-kLac ×0.3 gives t½ 99 min, outside the tables' 20–60) — Q41. HBF_rel likewise scales the liver share.
- **Angiotensin, effective-volume, neurohumoral lag, myogenic range and IAP-on-Bowman terms are ours** (decisions 7, 9, 10): Pulse has none of them.
- **O2 reactivity onset PaO2 60** (tables default; the stage brief said "~50" — inside the tables' 50–60 range).
- **7g's `cbfVaso` vs the tables' Matta nets**: with 7g's rows (sevo cbfVaso 0.2/MAC, iso 0.4/MAC linear; CMRO2 Hill 0.5 at 1 MAC) the net CBF at 1.5 MAC is sevo 0.91×, iso 1.12× against the tables' 1.17× / 1.72× (0.5 MAC: 0.92× / 1.00× vs 1.04× / 1.19×). 7d uses the bus as published (one drug source); calibration item for 7g's owner and Ali (raise `cbfVaso` to ≈ sevo 0.55/MAC, iso 1.0/MAC, or accept).

## Requests to other stages

- **R-7D-2 (7c), per R51 addendum 14:** publish `blood.out.albuminGL`, `out.bvRel`, `out.hbfRel` (7c is the only owner of hepatic flow; please fold the tables' splanchnic `hbfFactor` — ×0.6 class III / high-dose α, ×0.8 per MAC — into it, or 7d's fallback factor is lost once 7c is present), `out.lactate`, `core.ab.ph`; keep `core.liver` (7d writes `liverFn · tempF`); take the seam `core.renal = { uopMlH, excretion: { k, na, cl, gluconate } }` (mL/h, mmol/h) INSTEAD of the fixed elimination; expose `out.gluconate` (plasma mmol/L) so the gluconate excretion is not 0; take the hypertonic-saline sodium from `bus.doses[].concentrationPct` (E-7d-1).
- **R-7D-3 (7g):** E-7d-1 is applied by this stage (Task 17). Temperature is counted twice for 7g's hepatic drug clearance once 7c exists: 7g's `pkCtx` reads `blood.core.liver` (which carries 7d's −10 %/°C) as `hepFn` and then applies its own −5 %/°C — 7g's owner decides which one stays. The `cbfVaso` magnitudes (Deviations).
- **R-7D-4 (7f/7e):** 7d reads `ps.neuro.outputs.cmro2Mult` (7f) and `ps.endo.core.cond.sepsis.cur` (7e, stage 0–4 → sepsis 0–1 = (stage − 1)/2 clamped); 7e reads `organs.liver.glucoseF`. No other writes.
- **R-7D-5 (7a owner, FU-2):** (a) the MANUAL per-beat tracker rings at long RR with a surged SVR (`TRACK_ALPHA_R` 0.5 → 0.15 fixed it in the prototype); (b) MANUAL `contractility`/`svr` targets do not change CO (6.4 L/min at an 85/55 target, MAP 55); (c) no low-output HFrEF profile in MODELED (`hfref` severity 1: MAP 87, CO 5.6); (d) the elderly MANUAL tracker abandons pairs (90/52 → 78/50, 108/66 → MAP 105).
- **R-7D-6 (Stage 3 owners):** none required; ventilated tests use RR 18 at VT 500 because of the 0.53 VD/VT (NR-7g-3). The bladder-probe τ "inversely proportional to urine flow" (brief §4.6) can read `ps.organs.renal.uopMlMin` later.
- **Stage 8:** calibration list — CSF reserve/Rout/CBV_EFF (Q37), PbtO2 exponent, SjvO2/OER, P2/P1 mapping (Q39), angiotensin gain/τ, effective-volume exponent, neurohumoral τ, myogenic range, `timeScale` default (Q40), kLac and the failure split (Q41), DO2crit (Q42), 7g `cbfVaso`, Pulse O11 D-R1.

## Architecture in one page

```
engine.advance(ps, end)
  ├─ ECG (Stage 1/5) → rhythm records (beat{t, mech.perfused})
  ├─ advancePk (7g) — bus: cns, volatiles, agents, doses (this pass's boluses)
  ├─ [stepNeuroTo (7f) — neuro.outputs.cmro2Mult]
  ├─ advanceResp (Stage 3 + 7b lungs) — driver.ataxia (7d) jitters spontaneous breaths   PaCO2 rs.co2.pf, PaO2/SaO2 rs.o2, T rs.temp.tc
  ├─ [advanceBlood (7c) — reads blood.core.liver / .renal written by 7d on the previous second]
  ├─ [advanceEndo (7e) — reads organs.liver.glucoseF]
  ├─ advanceOrgans (7d)                         l2/organs/inputs.ts: MAP/CVP (4 s means), CO, gases, T, 7c blood, 7g bus, 7f, 7e
  │     once per pass: bus.doses → osmotherapy (mannitol, HTS) + mannitol diuresis
  │     10 Hz: stepBrain (mechanics.ts ⇄ flow.ts, cushing.ts) → coupled sbp/dbp + HR (MANUAL) | circ.ext.rSysF (MODELED), driver.ataxia
  │     125 Hz: icp samples (wave.ts) from beat records + u(t)   → 'icp' ring buffer (sensor icp on)
  │     1 Hz: stepRenal (kidney.ts, model.ts) · stepLiver (liver.ts) → organs.kidney.gfrRel, liver.glucoseF, blood.core.renal/.liver
  │           `organs` event; measurement {icpMean, cpp, pbto2, uop}
  └─ advanceHemo (Stage 2 / 7a) — reads L1 coupled sbp/dbp (MANUAL) / circ.ext.rSysF (MODELED); 7g's pkCtx reads organs.kidney.gfrRel next pass
validate/apply chain: device → pk (7g) → [neuro (7f)] → organs (7d) → [blood (7c)] → [endo (7e)] → Stage 3 → hemo
```

## File map

| Path | Responsibility |
|---|---|
| `packages/engine-core/src/types-organs.ts` | Stage 7d public types: organ clinical events, sensors, `organs` event, numerics ids |
| `…/src/l2/brain/params.ts` | brain constants (tables §5.1) |
| `…/src/l2/brain/mechanics.ts` | Monro–Kellie ICP(ΔV), elastance, Marmarou CSF displacement |
| `…/src/l2/brain/flow.ts` | autoregulation, CO2/O2 reactivity, the tables' per-agent CMRO2/CBF rows, `BrainDrugs`, Grubb CBV, PbtO2/SjvO2 |
| `…/src/l2/brain/cushing.ts` | Cushing drive (two triggers), ΔMAP, HR factor |
| `…/src/l2/brain/model.ts` | `BrainState`, `brainParams`, `createBrain`, `stepBrain`, osmotherapy, head-up, herniation |
| `…/src/l2/brain/wave.ts` | 125 Hz ICP waveform sample |
| `…/src/l2/renal/params.ts` | renal constants (PORTED, Apache header) |
| `…/src/l2/renal/kidney.ts` | algebraic kidney haemodynamics, TGF/myogenic target, natriuresis curve, angiotensin (PORTED, Apache header) |
| `…/src/l2/renal/model.ts` | `RenalState`, healthy-reference calibration, UOP, diuretics, bladder/urometer, KDIGO (PORTED, Apache header) |
| `…/src/l2/liver/liver.ts` | hepatic flow (7c's or fallback), lactate clearance/pool, liver/glucose factor, failure |
| `…/src/l2/organs/inputs.ts` | adapter: 7a/7b/Stage 3 truths in; 7c blood, 7g bus, 7f neuro, 7e sepsis duck-typed; 7c seam type |
| `…/src/l2/organs/effects.ts` | Cushing surge/bradycardia into L1 `coupled` + HR request (MANUAL) or `circ.ext.rSysF` (MODELED), ataxia |
| `…/src/l2/organs/pipeline.ts` | `OrgansState`, `createOrgansState`, `advanceOrgans`, dose observation, commands, `organs` event, `icp` samples, numerics, published keys |
| `…/src/engine.ts`, `src/types.ts`, `src/types-hemo.ts`, `src/index.ts` | state, chain inserts, flush, buffers, exports |
| `…/src/l2/resp/driver.ts` | optional `ataxia` on `DriverState` (Cushing breathing) |
| `…/src/l3/alarms/profile.ts` | `ICP` and `CPP` limit keys |
| `…/src/types-pk.ts`, `src/l2/pk/pipeline.ts`, `src/l2/pk/data/rows-other.ts` | E-7d-1: hypertonic saline `concentrationPct` (7g's files, additive) |
| `packages/controller/src/scenario/driver.ts` | E-7d-2: organ sensors are not scenario sensors (one line) |
| `packages/skins/src/{types,resolve}.ts`, `src/data/skins/{saadat-like,philips-like}.json` | `ICP` lane, `ICP`/`PbtO2`/`UO` tiles, colours, provenance |
| `packages/renderer/src/numerics-organs.ts` (+ `wave-lanes.ts`, `skin-plan.ts`, `alarm-view.ts`, `device-ui.ts`, `index.ts`) | ICP/CPP/PbtO2/UOP tile formatters, the `icp` lane, tile numerics/units |
| `apps/demo/src/stage4a/screen.ts` | `SAMPLE` entries for the three new tiles |
| `packages/validation/src/oracle/renal-scenarios.ts`, `test/oracle-renal.test.ts` | Pulse oracle O11 |
| `apps/demo/stage7d.html`, `apps/demo/src/stage7d.ts`, `apps/demo/scripts/stage7d-shots.mjs`, `apps/demo/e2e/stage7d.e2e.ts` | demo (TBI + renal panel), e2e smoke, screenshots |
| `docs/gates/stage-7d.md`, `docs/gates/stage-7d/*.png` | gate evidence |

---
## Tasks

### Task 1: Branch, worktree, Stage 7d public types

**Files:**
- Create: `packages/engine-core/src/types-organs.ts`, `packages/engine-core/test/l2/organs/types.test.ts`
- Modify: `packages/engine-core/src/types.ts` (5 additive lines), `packages/engine-core/src/types-hemo.ts` (`SensorId`), `packages/engine-core/src/index.ts`; declared exception E-7d-2: `packages/controller/src/scenario/driver.ts` (one line)

**Interfaces:**
- Produces: `OrganClinicalEvent`, `OrganCommandBody`, `OrganSensorId`, `OrganNumericId`, `OrgansEvent`, `BrainSummary`, `KidneySummary`, `LiverSummary` (below); `ChannelId` gains `'icp'`; `NumericId` gains `'icpMean' | 'cpp' | 'pbto2' | 'uop'`; `SensorId` gains `'icp' | 'pbto2' | 'urometer'`; `PatientProfile.conditions` is 7a's field (`ProfileCondition[]`, on `main`).

- [x] **Step 1: Create the worktree and branch**

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin
git worktree add ../scratch/wt-stage-7d -b stage-7d-organs origin/main
cd ../scratch/wt-stage-7d
ls packages/engine-core/src/l2/circ packages/engine-core/src/l2/lung packages/engine-core/src/l2/pk >/dev/null # 7a, 7b, 7g are required
ls packages/engine-core/src/l2/blood >/dev/null || echo "7c not merged yet: the execution order says wait (R48/R49); report before going on"
cp /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo/docs/plans/stage-7d-organs.md docs/plans/stage-7d-organs.md
npx -y pnpm@9.15.9 install
```

- [x] **Step 2: Write the failing type test** — `packages/engine-core/test/l2/organs/types.test.ts`

```ts
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ChannelId, Command, EngineEvent, NumericId, PatientProfile } from '../../../src/types.ts';
import type { OrgansEvent } from '../../../src/types-organs.ts';

describe('Stage 7d public types', () => {
  it('commands, channel, numerics and event are in the public unions', () => {
    const cmds: Command[] = [
      { id: '1', issuedBy: 't', type: 'applyEvent', event: { kind: 'brain', massRateMlPerMin: 1 } },
      { id: '2', issuedBy: 't', type: 'applyEvent', event: { kind: 'position', headUpDeg: 30 } },
      { id: '3', issuedBy: 't', type: 'applyEvent', event: { kind: 'renal', catheter: 'foley', emptyBag: true } },
      { id: '4', issuedBy: 't', type: 'applyEvent', event: { kind: 'condition', id: 'tbi', severity: 1 } },
      { id: '5', issuedBy: 't', type: 'attachSensor', sensor: 'icp', state: 'on' },
      { id: '6', issuedBy: 't', type: 'applyEvent', event: { kind: 'renal', timeScale: 12 } },
    ];
    expect(cmds).toHaveLength(6);
    expectTypeOf<'icp'>().toMatchTypeOf<ChannelId>();
    expectTypeOf<'icpMean' | 'cpp' | 'pbto2' | 'uop'>().toMatchTypeOf<NumericId>();
    expectTypeOf<OrgansEvent>().toMatchTypeOf<EngineEvent>();
    const p: PatientProfile = { conditions: [{ id: 'htn' }, { id: 'tbi', severity: 1 }] };
    expect(p.conditions).toHaveLength(2);
  });
});
```

- [x] **Step 3: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/organs/types.test.ts`
Expected: FAIL — `Cannot find module '../../../src/types-organs.ts'` (and type errors under `tsc`).

- [x] **Step 4: Create `packages/engine-core/src/types-organs.ts`**

```ts
// Stage 7d public types (R26/R32: brain, kidney, liver), kept in their own file so parallel stages do not collide
// in types.ts. types.ts adds each to its union with one line. Stage 7d owns NO drug ids (R51 §3, addendum 14):
// mannitol, hypertonic saline and furosemide are 7g library rows; the organs observe 7g's `bus.doses`.
import type { SimSeconds } from './types.ts';

/** attachSensor ids Stage 7d implements (state 'on' | 'off'). */
export type OrganSensorId = 'icp' | 'pbto2' | 'urometer';
/** Numerics Stage 7d adds: ICP mean and CPP (mmHg), PbtO2 (mmHg), urine output (mL/h, rolling 60 min). */
export type OrganNumericId = 'icpMean' | 'cpp' | 'pbto2' | 'uop';

/** Brief §7.2 ClinicalEvent members Stage 7d implements (plan decision 16). */
export type OrganClinicalEvent =
  | {
      kind: 'brain';
      /** Mass lesion volume (mL, set) and growth rate (mL/min) — an expanding haematoma. */
      massMl?: number;
      massRateMlPerMin?: number;
      /** Oedema volume, mL (set). */
      oedemaMl?: number;
    }
  | { kind: 'position'; headUpDeg: number }
  | {
      kind: 'renal';
      catheter?: 'foley' | 'none';
      /** Empty the urometer bag (the cumulative total keeps counting). */
      emptyBag?: boolean;
      /** KDIGO window compression for teaching (Q40): 12 → a 30 min window counts as 6 h. */
      timeScale?: number;
      iapMmHg?: number;
    }
  | { kind: 'condition'; id: 'tbi' | 'hepaticFailure' | 'aki'; severity: number };

export type OrganCommandBody = { type: 'applyEvent'; event: OrganClinicalEvent };

export interface BrainSummary {
  icp: number; cpp: number; mapHead: number;
  cbf: number; // relative to 50 mL/100 g/min
  cbvMl: number; cmro2: number; pbto2: number; sjvo2: number; elastance: number;
  paco2: number; // the PaCO2 the brain saw (Stage 3 truth), for the scenario tests
  state: 'normal' | 'raisedIcp' | 'cushing' | 'herniated';
  cushing: number; // drive 0–1
}
export interface KidneySummary {
  rbf: number; gfr: number; gfrRel: number; uopMlKgH: number; uop1hMlKgH: number; cumMl: number; bagMl: number; bladderMl: number;
  oliguria: boolean; akiStage: 0 | 1 | 2 | 3;
}
export interface LiverSummary {
  hbfRel: number; kLacPerH: number; lactate: number; tempF: number; liverFn: number; inr: number;
}
/** 1 Hz organ truth summary (like Stage 7a's `circ`). */
export type OrgansEvent = { type: 'organs'; t: SimSeconds; brain: BrainSummary; kidney: KidneySummary; liver: LiverSummary };
```

- [x] **Step 5: Add the unions** — in `packages/engine-core/src/types.ts` (anchors as on `main` after 7a/7b/7g; 7c/7e/7f add lines beside them — keep theirs):
  - after the line `import type { RespCommandBody, RespEvent } from './types-resp.ts'; // Stage 3` add
    `import type { OrganCommandBody, OrganNumericId, OrgansEvent } from './types-organs.ts'; // Stage 7d`
  - `ChannelId` ends `  | TeachingChannel; // Stage 7a`: change that line to `  | TeachingChannel // Stage 7a` and add the line `  | 'icp'; // Stage 7d` after it (if another stage already moved the `;`, add `  | 'icp' // Stage 7d` before it).
  - `NumericId` ends `| 'nibpSys' | 'nibpDia' | 'nibpMean' | 'etco2' | 'imco2' | 'awrr' | 'rr' | 'tempCore' | 'tempSite' | 'stII' | 'qtc';`: drop that `;` and add the line `  | OrganNumericId; // Stage 7d`.
  - `Command`: add a line `    | OrganCommandBody // Stage 7d (types-organs.ts)` after `    | RespCommandBody // Stage 3 (types-resp.ts)`.
  - `EngineEvent`: add `  | OrgansEvent; // Stage 7d (types-organs.ts)` as the last member (move the `;` off 7g's `  | DrugsEvent; // Stage 7g (types-pk.ts)` line).
  - In `packages/engine-core/src/types-hemo.ts` change `export type SensorId = 'ecg' | 'spo2' | 'nibp' | 'abp' | 'cvp' | 'pap' | 'co2' | 'temp' | 'pv'; // Stage 7a: 'pv' = teaching channels` to `export type SensorId = 'ecg' | 'spo2' | 'nibp' | 'abp' | 'cvp' | 'pap' | 'co2' | 'temp' | 'pv' | 'icp' | 'pbto2' | 'urometer'; // Stage 7a: 'pv' = teaching channels; Stage 7d: icp, pbto2, urometer`.
  - In `packages/engine-core/src/index.ts` add `export type * from './types-organs.ts'; // Stage 7d` after the line `export * from './types-resp.ts'; // Stage 3`.
  - **E-7d-2** — in `packages/controller/src/scenario/driver.ts` (the controller's `protocol.ts` keeps the brief's 8-id `SensorId`, and 7a excluded `pv` the same way), replace
    `      else if (w.type === 'attachSensor' && w.sensor !== 'pv') this.pending.push({ kind: 'sensor', sensor: w.sensor, state: w.state }); // Stage 7a: 'pv' (teaching channels) is not a scenario sensor`
    with
    `      else if (w.type === 'attachSensor' && w.sensor !== 'pv' && w.sensor !== 'icp' && w.sensor !== 'pbto2' && w.sensor !== 'urometer') this.pending.push({ kind: 'sensor', sensor: w.sensor, state: w.state }); // Stage 7a: 'pv' (teaching channels) is not a scenario sensor; Stage 7d: nor are icp/pbto2/urometer (pme-scenario/1 has none)`

- [x] **Step 6: Run the test and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/organs/types.test.ts && npx -y pnpm@9.15.9 typecheck`
Expected: PASS; the whole-repo typecheck is clean (prototype: the controller was the only other consumer that needed a change — E-7d-2). If another exhaustive `switch`/`Record` now fails, add the missing entry returning what its neighbours return, marked `// Stage 7d`, and list it in the gate note.

- [x] **Step 7: Commit and push**

```bash
git add packages/engine-core/src/types-organs.ts packages/engine-core/src/types.ts packages/engine-core/src/types-hemo.ts packages/engine-core/src/index.ts packages/engine-core/test/l2/organs/types.test.ts packages/controller/src/scenario/driver.ts docs/plans/stage-7d-organs.md
git commit -m "feat(organs): Stage 7d public types — brain/position/renal/condition events, icp channel, organ numerics, organs event

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push -u origin stage-7d-organs
```

### Task 2: Organ input adapter (7a circulation, Stage 3/7b gas, duck-typed 7c blood, 7g bus, 7f neuro, 7e sepsis)

**Files:**
- Create: `packages/engine-core/src/l2/organs/inputs.ts`, `packages/engine-core/test/l2/organs/inputs.test.ts`

**Interfaces:**
- Consumes: `HemoState` (`lastSite`, `pv`, `circ`), `cardiacOutput(hs, t)` from `l2/gas/coupling.ts`, `totalVolume(s, p)` from `l2/circ/circuit.ts` and `CircModelState` (7a, read only), `RespState` (`co2.pf`, `o2.pao2`, `o2.sa`, `temp.tc`, `temp.anaesthesia`, `driver`, `lung`), `staticCompliance(rs.lung)` from `l2/lung/lung.ts` (7b), `meanAirwayPressure(d, t, complianceMl)` from `l2/resp/driver.ts`, `l1Value`. Duck-typed (R51 addendum 14 names): `blood.out.{hb, albuminGL, bvRel, hbfRel, lactate, gluconate}`, `blood.core.{liver, renal}`; `pk.bus.cns.{cmro2Mult, cbfVaso, propCe, macBrain, ketamineCe}`, `pk.bus.volatiles.<agent>.macFrac`, `pk.bus.agents.<id>.brain`, `pk.bus.doses[]`; `neuro.outputs.cmro2Mult`; `endo.core.cond.sepsis.cur`.
- Produces:
  - `interface OrganView { map; pp; cvp; coLpm; paco2; pao2; sao2; tempC; hb; albuminGL; bvRel; hbfRel: number | null; lactate: number | null; gluconate; anaesthesia: 'none'|'general'|'neuraxial'; pawExcessCmH2O; drugs: DrugView; circ: boolean; blood: boolean }`
  - `interface DrugView { present; cmro2Mult; cbfVaso; volatileMac; hypnotic; furoCe: number | undefined; alphaNe; sepsis; doses: OrganDose[] }`, `interface OrganDose { agent; amount; amountUnit; concentrationPct?; t }`
  - `interface OrganSources { l1; hemo; resp; blood?; pk?; neuro?; endo? }`, `readOrganView(ctx: OrganSources, t): OrganView`, `readDrugView(src: { pk?; neuro?; endo? }): DrugView`, `alphaExcess(v: OrganView): number`
  - `circExt(hs: HemoState): Record<string, number | undefined> | null` (7a's `ext`)
  - `bloodCore(blood: unknown): { liver?: number; renal?: RenalSeam } | null` and `type RenalSeam = { uopMlH: number; excretion: { k: number; na: number; cl: number; gluconate: number } }` (mL/h, mmol/h — 7c's seam, addendum 14)
  - constants `GA_PROP_CE` 1.5, `GA_MAC` 0.5, `GA_KETAMINE` 0.5, `GA_CMRO2` 0.85, `PE_NE_EQ` 0.1, `ALPHA_E_FULL` 0.3, `ALPHA_NEED_MAP` 75, `ALPHA_EXCESS_MAP` 90 (all [ENG])

- [x] **Step 1: Write the failing test** — `packages/engine-core/test/l2/organs/inputs.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { createL1State, setL1Target } from '../../../src/l1/state.ts';
import { createHemoState } from '../../../src/l2/hemo/pipeline.ts';
import { createRespState } from '../../../src/l2/resp/pipeline.ts';
import { bloodCore, circExt, readDrugView, readOrganView } from '../../../src/l2/organs/inputs.ts';

const base = () => {
  const l1 = createL1State();
  return { l1, hemo: createHemoState(undefined, l1, 75), resp: createRespState(undefined, l1, 1) };
};

describe('organ input adapter', () => {
  it('reads the Stage 2/3/7a/7b truths with physiological defaults; no 7c/7g → neutral', () => {
    const c = base();
    const v = readOrganView(c, 0);
    expect(v.map).toBeGreaterThan(85);
    expect(v.map).toBeLessThan(100);
    expect(v.cvp).toBeGreaterThan(2);
    expect(v.cvp).toBeLessThan(10);
    expect(v.coLpm).toBeGreaterThan(3);
    expect(v.paco2).toBeGreaterThan(35);
    expect(v.sao2).toBeGreaterThan(0.9);
    expect(v.tempC).toBeCloseTo(36.8, 1);
    expect([v.hb, v.albuminGL, v.bvRel, v.hbfRel, v.lactate]).toEqual([14, 42, 1, null, null]);
    expect(v.anaesthesia).toBe('none');
    expect(v.drugs.present).toBe(false);
    expect([v.drugs.cmro2Mult, v.drugs.cbfVaso, v.drugs.furoCe, v.drugs.doses.length]).toEqual([1, 1, undefined, 0]);
    expect(v.blood).toBe(false);
    expect(circExt(c.hemo) === null).toBe(!v.circ);
  });
  it('without 7c, blood volume comes from MANUAL volumeStatus (0 → −40 %)', () => {
    const c = base();
    setL1Target(c.l1, 'volumeStatus', 0, 0);
    expect(readOrganView(c, 1).bvRel).toBeCloseTo(0.6, 9);
  });
  it('without 7c, MODELED blood volume is 7a\'s circulating volume ÷ the profile\'s (≈ 1 at rest)', () => {
    const c = base();
    c.l1.mode = 'modeled';
    expect(readOrganView(c, 0).bvRel).toBeCloseTo(1, 1);
  });
  it('7c present (duck-typed, addendum 14 names): Hb, albuminGL, bvRel, hbfRel, lactate and the core seam', () => {
    const blood = { core: { liver: 1 }, out: { hb: 9, albuminGL: 30, bvRel: 0.8, hbfRel: 0.7, lactate: 3.1, gluconate: 2 } };
    const v = readOrganView({ ...base(), blood }, 0);
    expect([v.blood, v.hb, v.albuminGL, v.bvRel, v.hbfRel, v.lactate, v.gluconate]).toEqual([true, 9, 30, 0.8, 0.7, 3.1, 2]);
    expect(bloodCore(blood)?.liver).toBe(1);
    expect(bloodCore(undefined)).toBeNull();
  });
  it('7g/7f/7e present: CMRO2 (7f wins), cbfVaso, volatile MAC without N2O, hypnotic → GA, furosemide, α load, sepsis, doses', () => {
    const pk = {
      bus: {
        cns: { cmro2Mult: 0.7, cbfVaso: 1.2, propCe: 3, macBrain: 0, ketamineCe: 0 },
        volatiles: { sevoflurane: { macFrac: 0.8 }, n2o: { macFrac: 0.4 } },
        agents: { furosemide: { brain: 1.5 }, norepinephrine: { brain: 0.1 }, phenylephrine: { brain: 1 } },
        doses: [{ agent: 'hypertonicSaline', mgPerKg: null, amount: 250, amountUnit: 'mL', concentrationPct: 3, t: 1 }, { agent: 'bogus' }],
      },
    };
    const d = readDrugView({ pk, neuro: { outputs: { cmro2Mult: 0.6 } }, endo: { core: { cond: { sepsis: { cur: 2 } } } } });
    expect([d.present, d.cmro2Mult, d.cbfVaso, d.volatileMac, d.hypnotic, d.furoCe, d.sepsis]).toEqual([true, 0.6, 1.2, 0.8, true, 1.5, 0.5]);
    expect(d.alphaNe).toBeCloseTo(0.2, 9);
    expect(d.doses).toEqual([{ agent: 'hypertonicSaline', amount: 250, amountUnit: 'mL', concentrationPct: 3, t: 1 }]);
    expect(readDrugView({ pk: { bus: { cns: { cmro2Mult: 1 } } } }).cmro2Mult).toBe(1);
    expect(readOrganView({ ...base(), pk }, 0).anaesthesia).toBe('general'); // drugs raise Stage 3's 'none'
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/organs/inputs.test.ts`
Expected: FAIL — cannot find `src/l2/organs/inputs.ts`.

- [x] **Step 3: Implement `packages/engine-core/src/l2/organs/inputs.ts`**

```ts
// Stage 7d organ input adapter (plan decision 16, R51 addendum 14): everything the brain, kidney and liver read,
// from whichever stage provides it. Stage 7c's blood, 7g's drug bus, 7f's neuro outputs and 7e's sepsis are
// DUCK-TYPED (each with a neutral fallback), so this file compiles and runs whichever of them has merged.
import { l1Value, type L1State } from '../../l1/state.ts';
import { totalVolume } from '../circ/circuit.ts';
import type { CircModelState } from '../circ/model.ts';
import { cardiacOutput } from '../gas/coupling.ts';
import type { HemoState } from '../hemo/pipeline.ts';
import { staticCompliance } from '../lung/lung.ts';
import { meanAirwayPressure } from '../resp/driver.ts';
import type { RespState } from '../resp/pipeline.ts';

export const HB_DEFAULT = 14; // Stage 3 HB_G_DL until 7c
export const ALBUMIN_DEFAULT = 42; // g/L (annex B2 oncotic reference)
export const PAW_REF_CMH2O = 10; // Stage 3: only mean Paw above 10 cmH2O acts (research 03 §8.7)
/** Anaesthetised by drugs (kidney stress S, GA fallback) [ENG]: propofol Ce ≥ 1.5 µg/mL, ≥ 0.5 MAC, ketamine ≥ 0.5 ×
 *  its reference dose, or a drug CMRO2 multiplier ≤ 0.85 (any other hypnotic). */
export const GA_PROP_CE = 1.5;
export const GA_MAC = 0.5;
export const GA_KETAMINE = 0.5;
export const GA_CMRO2 = 0.85;
/** α-agonist load as norepinephrine-equivalent µg/kg/min [ENG]: NE 1, epinephrine 1, phenylephrine 0.1 (≈ 1/10 potency). */
export const PE_NE_EQ = 0.1;
/** Splanchnic constriction 0–1 = NE-eq / 0.3 (tables `hbfFactor` ×0.6 "high-dose α-agonist") [ENG]. */
export const ALPHA_E_FULL = 0.3;
/** "Above need" [ENG]: none of the α-agonist is excess at MAP ≤ 75, all of it at MAP ≥ 90 (tables §5.2 D row). */
export const ALPHA_NEED_MAP = 75;
export const ALPHA_EXCESS_MAP = 90;

export interface OrganView {
  map: number; pp: number; cvp: number; coLpm: number;
  paco2: number; pao2: number; sao2: number; tempC: number;
  hb: number; albuminGL: number; bvRel: number;
  hbfRel: number | null; // 7c's hepatic flow ÷ baseline (null without 7c: the liver computes its fallback)
  lactate: number | null; // 7c's lactate (null without 7c: the liver's fallback pool)
  gluconate: number; // 7c's plasma gluconate, mmol/L (0 until 7c exposes it)
  anaesthesia: 'none' | 'general' | 'neuraxial'; // Stage 3 `thermal`, raised to 'general' by drugs
  pawExcessCmH2O: number;
  drugs: DrugView;
  circ: boolean; blood: boolean;
}
/** 7g's accepted boluses the organs act on (R51 §3: 7d OBSERVES; addendum 14: HTS carries `concentrationPct`). */
export interface OrganDose { agent: string; amount: number; amountUnit: string; concentrationPct?: number; t: number }
export interface DrugView {
  present: boolean; // 7g's bus found
  cmro2Mult: number; // 7f `neuro.outputs.cmro2Mult`, else 7g `bus.cns.cmro2Mult`, else 1
  cbfVaso: number; // 7g `bus.cns.cbfVaso`, else 1
  volatileMac: number; // sevoflurane + isoflurane + desflurane MAC fractions (7g `bus.volatiles`; N2O excluded)
  hypnotic: boolean; // anaesthetised by drugs (GA_* thresholds)
  furoCe: number | undefined; // 7g furosemide level in reference doses (20 mg); undefined without 7g
  alphaNe: number; // α-agonist, NE-eq µg/kg/min
  sepsis: number; // 0–1 from 7e's sepsis stage (1 SIRS → 0, 2 sepsis → 0.5, ≥ 3 septic shock → 1)
  doses: OrganDose[]; // this pass's `bus.doses` (mannitol, hypertonic saline; the rest are ignored)
}
/** 7c's seam 7d fills (R51 addendum 14): urine output and the renal excretion rates, mmol/h. */
export type RenalSeam = { uopMlH: number; excretion: { k: number; na: number; cl: number; gluconate: number } };
type BloodLike = {
  core?: { liver?: number; renal?: RenalSeam };
  out?: { hb?: number; albuminGL?: number; bvRel?: number; hbfRel?: number; lactate?: number; gluconate?: number };
};

const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const obj = (v: unknown): Record<string, unknown> | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

/** Stage 7a's `circ.ext` (multipliers other stages write) when the circulation is present, else null. */
export function circExt(hs: HemoState): Record<string, number | undefined> | null {
  const c = obj((hs as unknown as { circ: unknown }).circ);
  return c ? (obj(c.ext) as Record<string, number | undefined> | null) : null;
}

function bloodOf(blood: unknown): BloodLike | null {
  const b = obj(blood);
  return b && ('core' in b || 'out' in b) ? (b as BloodLike) : null;
}

/** 7c's `core` (where 7d writes `liver` and `renal`), or null. */
export function bloodCore(blood: unknown): BloodLike['core'] | null {
  return bloodOf(blood)?.core ?? null;
}

/** 7g's bus (`ps.pk.bus`), 7f's CMRO2 (`ps.neuro.outputs.cmro2Mult`) and 7e's sepsis (`ps.endo.core.cond.sepsis.cur`). */
export function readDrugView(src: { pk?: unknown; neuro?: unknown; endo?: unknown }): DrugView {
  const bus = obj(obj(src.pk)?.bus);
  const cns = obj(bus?.cns);
  const vol = obj(bus?.volatiles);
  const agents = obj(bus?.agents);
  const ce = (id: string): number => num(obj(agents?.[id])?.brain, 0);
  const mac = (id: string): number => num(obj(vol?.[id])?.macFrac, 0);
  const neuroCmro2 = obj(obj(src.neuro)?.outputs)?.cmro2Mult;
  const cmro2Mult = num(neuroCmro2, num(cns?.cmro2Mult, 1));
  const alphaNe = ce('norepinephrine') + ce('epinephrine') + PE_NE_EQ * ce('phenylephrine');
  const stage = num(obj(obj(obj(obj(src.endo)?.core)?.cond)?.sepsis)?.cur, 0);
  const doses: OrganDose[] = [];
  if (Array.isArray(bus?.doses)) {
    for (const d of bus.doses as unknown[]) {
      const x = obj(d);
      if (!x || typeof x.agent !== 'string' || typeof x.amount !== 'number' || typeof x.amountUnit !== 'string') continue;
      doses.push({ agent: x.agent, amount: x.amount, amountUnit: x.amountUnit, t: num(x.t, 0), ...(typeof x.concentrationPct === 'number' ? { concentrationPct: x.concentrationPct } : {}) });
    }
  }
  return {
    present: bus !== null,
    cmro2Mult,
    cbfVaso: num(cns?.cbfVaso, 1),
    volatileMac: mac('sevoflurane') + mac('isoflurane') + mac('desflurane'),
    hypnotic: num(cns?.propCe, 0) >= GA_PROP_CE || num(cns?.macBrain, 0) >= GA_MAC || num(cns?.ketamineCe, 0) >= GA_KETAMINE || cmro2Mult <= GA_CMRO2,
    furoCe: bus ? ce('furosemide') : undefined,
    alphaNe,
    sepsis: Math.min(1, Math.max(0, (stage - 1) / 2)),
    doses,
  };
}

/** The α-agonist that is "above need" (tables §5.2 D row: renal cost of over-pressing) [ENG]. */
export function alphaExcess(v: OrganView): number {
  return v.drugs.alphaNe * Math.min(1, Math.max(0, (v.map - ALPHA_NEED_MAP) / (ALPHA_EXCESS_MAP - ALPHA_NEED_MAP)));
}

export interface OrganSources { l1: L1State; hemo: HemoState; resp: RespState; blood?: unknown; pk?: unknown; neuro?: unknown; endo?: unknown }

export function readOrganView(ctx: OrganSources, t: number): OrganView {
  const hs = ctx.hemo;
  const rs = ctx.resp;
  const b = bloodOf(ctx.blood);
  const site = hs.lastSite;
  // without 7c: MODELED reads 7a's circulating volume (a 7a `bleed` or `fluid` changes it); MANUAL maps the instructor's
  // volumeStatus 1 → normovolaemic, 0 → −40 % (brief §4.9 "severe hypovolaemia") [ENG]
  const circ = ctx.l1.mode === 'modeled' ? (hs as unknown as { circ?: CircModelState }).circ : undefined;
  const bvFallback = circ
    ? totalVolume(circ.s, circ.p) / circ.prof.bloodVolumeMl
    : 0.6 + 0.4 * Math.min(1, Math.max(0, l1Value(ctx.l1, 'volumeStatus', t)));
  const paw = meanAirwayPressure(rs.driver, t, staticCompliance(rs.lung)); // Stage 7b: the lung module's compliance
  const drugs = readDrugView(ctx);
  const hbf = b?.out?.hbfRel;
  const lac = b?.out?.lactate;
  return {
    map: site.map,
    pp: Math.max(0, site.sbp - site.dbp),
    cvp: hs.pv,
    coLpm: cardiacOutput(hs, t),
    paco2: rs.co2.pf,
    pao2: rs.o2.pao2,
    sao2: rs.o2.sa,
    tempC: rs.temp.tc,
    hb: num(b?.out?.hb, HB_DEFAULT),
    albuminGL: num(b?.out?.albuminGL, ALBUMIN_DEFAULT),
    bvRel: num(b?.out?.bvRel, bvFallback),
    hbfRel: typeof hbf === 'number' && Number.isFinite(hbf) ? hbf : null,
    lactate: typeof lac === 'number' && Number.isFinite(lac) ? lac : null,
    gluconate: num(b?.out?.gluconate, 0),
    anaesthesia: drugs.hypnotic && rs.temp.anaesthesia === 'none' ? 'general' : rs.temp.anaesthesia,
    pawExcessCmH2O: Math.max(0, paw - PAW_REF_CMH2O),
    drugs,
    circ: circExt(hs) !== null,
    blood: b !== null,
  };
}
```

- [x] **Step 4: Run the test**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/organs/inputs.test.ts`
Expected: PASS (5 tests; prototype on 7a + 7b + 7g). If a duck-typed name differs on your base (7c/7e/7f merged with another name than addendum 14's), STOP and report it — the names are binding (R51 addendum 14); do not guess another path.

- [x] **Step 5: Commit and push**

```bash
git add packages/engine-core/src/l2/organs/inputs.ts packages/engine-core/test/l2/organs/inputs.test.ts docs/plans/stage-7d-organs.md
git commit -m "feat(organs): input adapter — 7a/7b truths; 7c blood, 7g bus, 7f CMRO2, 7e sepsis duck-typed with neutral fallbacks

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7d-organs
```

### Task 3: Brain constants and the Monro–Kellie pressure–volume model

**Files:**
- Create: `packages/engine-core/src/l2/brain/params.ts`
- Create: `packages/engine-core/src/l2/brain/mechanics.ts`
- Test: `packages/engine-core/test/l2/brain/mechanics.test.ts`

**Interfaces:**
- Produces: `params.ts` constants (names as below, used by Tasks 4–7, 11); `icpOfVolume(dV, icp0, pvi)`, `volumeOfIcp(icp, icp0, pvi)`, `elastance(icp, pvi)`, `csfDisplacementRate(icp, disp, icp0, rOut, reserve?)` (mL/min).

- [x] **Step 1: Write the failing test** — `packages/engine-core/test/l2/brain/mechanics.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { csfDisplacementRate, elastance, icpOfVolume, volumeOfIcp } from '../../../src/l2/brain/mechanics.ts';

describe('Monro–Kellie mechanics (tables §5.1)', () => {
  it('PVI: +PVI mL multiplies ICP by 10; +1 mL at ICP 10/PVI 25 raises ICP by 9.6 %', () => {
    expect(icpOfVolume(25, 10, 25)).toBeCloseTo(100, 6);
    expect(icpOfVolume(1, 10, 25)).toBeCloseTo(10.965, 3);
    expect(volumeOfIcp(icpOfVolume(7.3, 12, 20), 12, 20)).toBeCloseTo(7.3, 9);
  });
  it('elastance = 2.303·ICP/PVI (0.92 mmHg/mL at 10/25; 4.6 at 40/20)', () => {
    expect(elastance(10, 25)).toBeCloseTo(0.921, 3);
    expect(elastance(40, 20)).toBeCloseTo(4.605, 3);
  });
  it('CSF: no net flow at ICP0, absorption rises with ICP and fades as the reserve is used; refill ≤ production', () => {
    expect(csfDisplacementRate(10, 0, 10, 10)).toBe(0);
    expect(csfDisplacementRate(20, 0, 10, 10)).toBeCloseTo(1, 9);
    expect(csfDisplacementRate(20, 15, 10, 10, 30)).toBeCloseTo(0.75, 9);
    expect(csfDisplacementRate(20, 30, 10, 10, 30)).toBe(0);
    expect(csfDisplacementRate(2, 5, 10, 10)).toBeCloseTo(-0.35, 9);
    expect(csfDisplacementRate(2, 0, 10, 10)).toBe(0);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/brain/mechanics.test.ts`
Expected: FAIL — Cannot find module `src/l2/brain/mechanics.ts`.

- [x] **Step 3: Implement `packages/engine-core/src/l2/brain/params.ts`** (exactly as prototyped)

```ts
// Stage 7d brain constants (tables §5.1; R26). Every number cites its tables row or is [ENG] with the prototype
// number it was tuned to (docs/plans/stage-7d-organs.md "Prototype results"). Q numbers point at tables §9.
export const BRAIN_DT_S = 0.1; // brain step 10 Hz, on the gas grid (brief §3.2)
export const BRAIN_G = 1400; // adult brain mass, g [TXT] (CBF0 50 mL/100 g/min ≈ 700 mL/min)
export const CBF0 = 50; // mL/100 g/min, tables `CBF0` [P] LITFL-CBF
export const CMRO2_0 = 3.3; // mL O2/100 g/min, tables `cmro2_0` [P]
export const ICP0 = 10; // mmHg, tables `ICP0` [TXT]
export const PVI = 25; // mL, tables `pvi` [P] Marmarou (normal 25–30; exhausted < 10–13)
export const CSF_PROD_ML_MIN = 0.35; // CSF formation ≈ 500 mL/day [TXT]
/** Outflow resistance to CSF absorption, mmHg·min/mL (Marmarou; normal 6–10) — sets the CSF buffering τ
 *  ≈ Rout·PVI/(2.303·ICP) ≈ 8.7 min at ICP 10 (tables `tauCsf` 5 min [ENG], range 2–15: Q37). 8, not 10: with 10 the
 *  check-19 haematoma reached ICP 20 at 9.1 min (tables ~10–15); 8 gives 10.8 min and leaves ICP 40 at 23.7 min. */
export const R_OUT = 8;
/** Displaceable CSF, mL (tables `csfReserve` 30, range 20–50; Q37): absorption of extra CSF fades as it is used. */
export const CSF_RESERVE_ML = 30;
export const CBF_LL = 60; // autoregulation lower limit as CPP, mmHg, tables `cbfLL` [P] (Q13)
export const CBF_UL = 150; // upper limit, tables `cbfUL` [P]
export const CPP_ZERO_FLOW = 10; // below LL CBF falls linearly to 0 at CPP 10 (tables A(), [ENG shape])
export const BREAKTHROUGH_PER_MMHG = 0.01; // above UL CBF rises 1 %/mmHg (tables A())
export const CPP_REF = 80; // CPP of the reference state (MAP 90, ICP 10): pressure-passive CBF = CBF0·CPP/80 [ENG]
export const HTN_LL_SHIFT = 15; // chronic HTN: LL +15–20, tables §1.5 `htn` (Q13)
export const HTN_UL_SHIFT = 20; // UL shifts right in HTN (tables §5.1, no number) [ENG]
export const K_CO2 = 0.03; // CBF fraction per mmHg PaCO2, tables `kCO2` [P] (Q38: OpenAnesthesia ~0.04)
export const PACO2_MIN = 20; // reactivity clamped (blunted) below 20 and above 80 mmHg (tables C())
export const PACO2_MAX = 80;
/** Chronic hypocapnia: CSF pH buffering resets the CO2 reference over 6–24 h (tables §5.1 hyperventilation row). */
export const PACO2_ADAPT_TAU_S = 8 * 3600;
export const PAO2_CBF_ONSET = 60; // tables `paO2Cbf` [P] (range 50–60)
export const PAO2_CBF_DOUBLE = 30; // ×2 at PaO2 30 (tables O())
export const TAU_VASC_S = 10; // dynamic autoregulation / CO2 response τ: CBF within 30 s (tables hyperventilation row) [ENG]
export const GRUBB = 0.38; // CBV ∝ CBF^0.38, tables `grubb` [VERIFY]
export const CBV0_ML = 60; // whole-brain CBV ≈ 4.3 mL/100 g [TXT]
/** Fraction of the CBV change that reaches ICP (the rest is offset by venous re-expansion) [ENG]: with 0.4,
 *  PaCO2 40 → 30 lowers ICP by 27 % at ICP 25 / PVI 20 (tables: −25–30 %). */
export const CBV_EFF = 0.4;
export const PBTO2_0 = 25; // mmHg, tables `PbtO2_0` [P]
export const PBTO2_EXP = 0.75; // [ENG] PbtO2 ∝ (delivery/demand)^0.75, not the tables' linear form: linear gave 9.5 in check 18 (tables 10–15)
export const PBTO2_HYPEROXIA = 0.004; // tables PbtO2 formula (1 + 0.004·(PaO2 − 100)+) [ENG]
export const OER0 = 0.33; // [ENG] resting cerebral O2 extraction, chosen so SjvO2 = 0.97·(1 − 0.33) ≈ 0.65 (textbook 55–75 %; tables have no row)
export const OER_MAX = 0.75; // [ENG] extraction ceiling (tables §5.3 `erMax` range 0.6–0.75, top end: the brain extracts more than the body)
export const Q10_BRAIN = 0.07; // CMRO2 −7 %/°C, tables `q10Brain` [P]
export const HB_DEFAULT = 14; // g/dL until 7c's blood exists (Stage 3 HB_G_DL)
export const HEAD_HEIGHT_CM = 25; // tragus above the heart at 90° head-up [ENG]; 30° → 12.5 cm → MAP_head −9.2
/** Venous/CSF volume that leaves the skull at 30° head-up [ENG]: ICP 20 → 14.4 at PVI 20 (tables: −5.6 mmHg). */
export const HEADUP_VOL_ML_30 = 2.9;
export const MMHG_PER_CM_BLOOD = 0.74; // tables MAP_head = MAP − 0.74·h
// Osmotherapy (tables §5.1 mannitol/HTS rows [TXT]; shape [ENG])
export const OSM_K_MOSM = 50; // saturation: 0.25 g/kg (96 mOsm) gives 66 % of 1 g/kg's 88 % (tables "0.25 ≈ 1 g/kg")
export const OSM_VMAX_ML = 4.5; // brain-water loss at the peak of a saturating dose [ENG]: see Prototype results
export const MANNITOL_TAU_IN_MIN = 15; // onset 10–15 min, peak ≈ 40 min (tables 20–60), duration 2–6 h
export const MANNITOL_TAU_OUT_MIN = 180;
export const HTS_TAU_IN_MIN = 7; // onset 5–10 min, longer than mannitol (tables)
export const HTS_TAU_OUT_MIN = 240;
export const MANNITOL_MOSM_PER_G = 1000 / 182.17; // 5.49 mOsm/g
export const NACL_MOSM_PER_G = 2000 / 58.44; // 34.2 mOsm/g
// Cushing (tables §5.1: CPP < 40 for > 30 s → MAP +30–50 over 30–60 s, HR −20–40 %, ataxic breathing [TXT shape, ENG numbers])
export const CUSH_CPP = 40;
export const CUSH_GAP = 10; // second trigger: ICP within 10 mmHg of MAP_head (tables §5.1 Cushing row)
export const CUSH_DELAY_S = 30;
export const CUSH_OFF_S = 30; // CPP ≥ 40 this long (on the pre-surge MAP) ends the response
export const CUSH_TAU_ON_S = 15;
export const CUSH_TAU_OFF_S = 60;
/** mmHg at full drive: the centre of the tables' +30–50 [ENG]. With 50 the MANUAL engine read +54 (the 7a waveform's
 *  area MAP at HR 48 sits ≈ 0.45 of the pulse pressure above the diastolic, not the 1/3 the coupled split assumes). */
export const CUSH_DMAP = 40;
export const CUSH_HR_DROP = 0.4; // HR × (1 − 0.4·drive): 80 → 48
export const MAP_BASE_TAU_S = 120; // pre-surge MAP reference (frozen while the surge is on)
export const HERNIATION_CPP = 10; // CPP ≤ 10 for 60 s → herniation (irreversible in v1) [ENG]
export const HERNIATION_S = 60;
export const ICP_THRESHOLD = 22; // BTF2016 treatment threshold (alarm default, tables)
// TBI condition (severity s ∈ 0–1) [ENG, tables §7 check 19 uses PVI 20, ICP0 12]
export const TBI_PVI_DROP = 5; // pvi 25 → 20
export const TBI_ICP0_RISE = 2; // 10 → 12
export const TBI_AR_LOSS = 0.7; // autoregulation index 1 → 0.3 (impaired, not absent)
/** Swollen brain: the displaceable CSF reserve shrinks 30 → 10 mL at severity 1 [ENG, DEVIATION from the tables'
 *  normal-brain `csfReserve` 20–50]: check 19's own timeline (12 → 20 by 10–15 min → 40 by 20–25 min at 1 mL/min, PVI
 *  20) needs ≈ 11 mL of total compensation; with a reserve of 20 ICP never reached 40 in 30 min, with 12–14 it took
 *  25.7–27.7 min. With 10 (and R_OUT 8): ICP 20 at 10.8 min, 40 at 23.7 min. Q37. */
export const TBI_RESERVE_DROP = 20;
```

- [x] **Step 4: Implement `packages/engine-core/src/l2/brain/mechanics.ts`** (exactly as prototyped)

```ts
// Monro–Kellie craniospinal mechanics (tables §5.1): ICP = ICP0·10^(ΔV/PVI) over the change of intracranial volume
// (mass + oedema + ΔCBV − displaced CSF − osmotic brain-water loss − head-up venous drainage), and Marmarou CSF
// dynamics: production is constant, absorption rises with (ICP − Pss)/Rout, and the displaceable CSF is finite.
import { CSF_PROD_ML_MIN, CSF_RESERVE_ML } from './params.ts';

/** ICP (mmHg) for a volume change ΔV (mL) from the resting state (ICP0, PVI). */
export function icpOfVolume(dV: number, icp0: number, pvi: number): number {
  return icp0 * 10 ** (dV / pvi);
}

/** Volume change (mL) that gives this ICP — the inverse of icpOfVolume. */
export function volumeOfIcp(icp: number, icp0: number, pvi: number): number {
  return pvi * Math.log10(Math.max(1e-3, icp) / icp0);
}

/** Elastance dICP/dV (mmHg/mL) = 2.303·ICP/PVI (tables `pvi` row). */
export function elastance(icp: number, pvi: number): number {
  return (Math.LN10 * icp) / pvi;
}

/**
 * d(displaced CSF)/dt, mL/min. At rest production = absorption (Pss = ICP0 − P·Rout). Above ICP0 the extra
 * absorption (ICP − ICP0)/Rout displaces CSF, fading as the displaceable reserve is used (1 − (d/R)²); below ICP0
 * CSF re-accumulates, never faster than it is produced.
 */
export function csfDisplacementRate(icp: number, disp: number, icp0: number, rOut: number, reserve = CSF_RESERVE_ML): number {
  const extra = (icp - icp0) / rOut;
  if (extra >= 0) return extra * Math.max(0, 1 - (disp / reserve) ** 2);
  return disp > 0 ? Math.max(-CSF_PROD_ML_MIN, extra) : 0;
}
```

- [x] **Step 5: Run the tests and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/brain/mechanics.test.ts && npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck`
Expected: PASS (3 tests; the prototype numbers are quoted in the test comments); typecheck clean.

- [x] **Step 6: Commit and push**

```bash
git add packages/engine-core/src/l2/brain/params.ts packages/engine-core/src/l2/brain/mechanics.ts packages/engine-core/test/l2/brain/mechanics.test.ts docs/plans/stage-7d-organs.md
git commit -m "feat(brain): constants (tables §5.1) and Monro–Kellie ICP with Marmarou CSF displacement

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7d-organs
```

### Task 4: CBF, metabolism and brain oxygen (autoregulation, CO2/O2 reactivity, anaesthetics, Grubb CBV, PbtO2, SjvO2)

**Files:**
- Create: `packages/engine-core/src/l2/brain/flow.ts`
- Test: `packages/engine-core/test/l2/brain/flow.test.ts`

**Interfaces:**
- Consumes: Task 3 constants. Produces: `BrainAnaesthesia` {propofolE, sevoMac, isoMac, ketamineE} and `NO_ANAESTHESIA` (the tables' per-agent vocabulary: fallback and tests), `BrainDrugs` {cmro2Mult, cbfVaso} and `NO_DRUGS` (what the model consumes; Task 11 fills it from 7f/7g), `drugsOf(a): BrainDrugs`, `tempCmro2(tempC)`, `autoregIntact(cpp, ll, ul)`, `autoreg(cpp, ll, ul, ar)`, `co2Factor(paco2, ref?, k?)`, `o2Factor(pao2)`, `cmro2Rel(a, tempC)`, `vasoDirect(a)`, `cbvRel(cbfRel)`, `caO2(hb, sao2, pao2)`, `brainOxygen(r, sao2, pao2) → {pbto2, sjvo2, oer}`.

- [x] **Step 1: Write the failing test** — `packages/engine-core/test/l2/brain/flow.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { autoreg, autoregIntact, brainOxygen, cmro2Rel, co2Factor, NO_ANAESTHESIA, o2Factor, vasoDirect } from '../../../src/l2/brain/flow.ts';

describe('CBF factors (tables §5.1)', () => {
  it('autoregulation: plateau 60–150, linear to 0 at CPP 10, +1 %/mmHg above 150; pressure-passive when ar = 0', () => {
    expect(autoregIntact(60, 60, 150)).toBe(1);
    expect(autoregIntact(150, 60, 150)).toBe(1);
    expect(autoregIntact(35, 60, 150)).toBeCloseTo(0.5, 9);
    expect(autoregIntact(10, 60, 150)).toBe(0);
    expect(autoregIntact(170, 60, 150)).toBeCloseTo(1.2, 9);
    expect(autoreg(40, 60, 150, 0)).toBeCloseTo(0.5, 9); // CPP 40 / 80
    expect(autoreg(55, 75, 170, 1)).toBeCloseTo(45 / 65, 9); // HTN-shifted plateau, tables §7 check 18
  });
  it('CO2 reactivity 3 %/mmHg, clamped below 20 and above 80', () => {
    expect(co2Factor(30)).toBeCloseTo(0.7, 9);
    expect(co2Factor(50)).toBeCloseTo(1.3, 9);
    expect(co2Factor(15)).toBeCloseTo(co2Factor(20), 9);
    expect(co2Factor(90)).toBeCloseTo(co2Factor(80), 9);
  });
  it('O2 reactivity: none above 60, ×2 at 30', () => {
    expect(o2Factor(100)).toBe(1);
    expect(o2Factor(60)).toBe(1);
    expect(o2Factor(30)).toBeCloseTo(2, 9);
  });
  it('anaesthetics: propofol halves CMRO2; iso 1.5 MAC CBF net +72 %; sevo 0.5 MAC +4 %; hypothermia −7 %/°C', () => {
    expect(cmro2Rel({ ...NO_ANAESTHESIA, propofolE: 1 }, 37)).toBeCloseTo(0.5, 9);
    const iso = { ...NO_ANAESTHESIA, isoMac: 1.5 };
    expect(cmro2Rel(iso, 37) * vasoDirect(iso)).toBeCloseTo(1.72, 2);
    const sevo = { ...NO_ANAESTHESIA, sevoMac: 0.5 };
    expect(cmro2Rel(sevo, 37) * vasoDirect(sevo)).toBeCloseTo(1.04, 2);
    expect(cmro2Rel(NO_ANAESTHESIA, 34)).toBeCloseTo(0.79, 9);
  });
  it('brain oxygen: normal PbtO2 25 and SjvO2 ≈ 65 %; halved delivery lowers both', () => {
    const n = brainOxygen(1, 0.97, 100);
    expect(n.pbto2).toBeCloseTo(25, 6);
    expect(n.sjvo2).toBeCloseTo(0.65, 2);
    const h = brainOxygen(0.5, 0.97, 100);
    expect(h.pbto2).toBeCloseTo(14.9, 1);
    expect(h.sjvo2).toBeCloseTo(0.33, 2);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/brain/flow.test.ts`
Expected: FAIL — Cannot find module `src/l2/brain/flow.ts`.

- [x] **Step 3: Implement `packages/engine-core/src/l2/brain/flow.ts`** (exactly as prototyped)

```ts
// Cerebral blood flow, metabolism and brain oxygen (tables §5.1): CBF = CBF0·A(CPP)·C(PaCO2)·O(PaO2)·M, with M the
// flow–metabolism coupling plus the direct vasodilation of volatiles/ketamine (tables "Anaesthetic and treatment
// effects"); CBV follows Grubb; PbtO2 and SjvO2 from the delivery/demand ratio.
import {
  BREAKTHROUGH_PER_MMHG, CPP_REF, CPP_ZERO_FLOW, GRUBB, K_CO2, OER0, OER_MAX, PACO2_MAX, PACO2_MIN, PAO2_CBF_DOUBLE,
  PAO2_CBF_ONSET, PBTO2_0, PBTO2_EXP, PBTO2_HYPEROXIA, Q10_BRAIN,
} from './params.ts';

/**
 * Per-agent anaesthetic state in the tables' terms (§5.1 rows): the INTERIM/fallback input and the unit-test
 * vocabulary. In the engine the drugs arrive as `BrainDrugs` from 7g's bus (and 7f's CMRO2), see organs/inputs.ts.
 */
export interface BrainAnaesthesia {
  propofolE: number; // 0–1 fractional effect, E = Ce/(Ce + C50)
  sevoMac: number;
  isoMac: number;
  ketamineE: number; // 0–1
}
export const NO_ANAESTHESIA: BrainAnaesthesia = { propofolE: 0, sevoMac: 0, isoMac: 0, ketamineE: 0 };
/** What the brain model consumes: the drug CMRO2 multiplier (normothermic) and the direct cerebral vasodilation. */
export interface BrainDrugs {
  cmro2Mult: number; // 1 = none (7f `neuro.outputs.cmro2Mult`, else 7g `bus.cns.cmro2Mult`)
  cbfVaso: number; // 1 = none (7g `bus.cns.cbfVaso`)
}
export const NO_DRUGS: BrainDrugs = { cmro2Mult: 1, cbfVaso: 1 };

/** Pressure autoregulation A(CPP) with intact regulation (tables A(): plateau [LL, UL], linear to 0 at 10, +1 %/mmHg above UL). */
export function autoregIntact(cpp: number, ll: number, ul: number): number {
  if (cpp <= CPP_ZERO_FLOW) return 0;
  if (cpp < ll) return (cpp - CPP_ZERO_FLOW) / (ll - CPP_ZERO_FLOW);
  if (cpp <= ul) return 1;
  return 1 + BREAKTHROUGH_PER_MMHG * (cpp - ul);
}

/** A with an autoregulation index ar (1 intact, 0 pressure-passive: CBF ∝ CPP/CPP_REF). TBI impairs it. */
export function autoreg(cpp: number, ll: number, ul: number, ar: number): number {
  const passive = Math.max(0, cpp) / CPP_REF;
  return ar * autoregIntact(cpp, ll, ul) + (1 - ar) * passive;
}

/** CO2 reactivity C(PaCO2) = 1 + k·(PaCO2 − ref), PaCO2 clamped to 20–80 (tables C()). ref adapts over hours. */
export function co2Factor(paco2: number, ref = 40, k = K_CO2): number {
  const p = Math.min(PACO2_MAX, Math.max(PACO2_MIN, paco2));
  return Math.max(0.1, 1 + k * (p - ref));
}

/** O2 reactivity: 1 above PaO2 60, ×2 at 30, linear (tables O()), floor at PaO2 20. */
export function o2Factor(pao2: number): number {
  const p = Math.max(20, pao2);
  return p >= PAO2_CBF_ONSET ? 1 : 1 + (PAO2_CBF_ONSET - p) / (PAO2_CBF_ONSET - PAO2_CBF_DOUBLE);
}

/** Hypothermia: CMRO2 −7 %/°C below 37 (tables `q10Brain`), floor 0.3. */
export function tempCmro2(tempC: number): number {
  return Math.max(0.3, 1 - Q10_BRAIN * (37 - tempC));
}

/** CMRO2 relative to awake normothermia: propofol ×(1 − 0.5E), sevo ×(1 − 0.25·MAC), iso ×(1 − 0.3·MAC), both floor 0.5;
 *  ketamine ×(1 + 0.1E); temperature −7 %/°C (tables §5.1 rows; Slupe2018, Matta1999, LITFL). */
export function cmro2Rel(a: BrainAnaesthesia, tempC: number): number {
  const vol = Math.max(0.5, (1 - 0.25 * a.sevoMac) * (1 - 0.3 * a.isoMac));
  return (1 - 0.5 * a.propofolE) * vol * (1 + 0.1 * a.ketamineE) * tempCmro2(tempC);
}

/** Net CBF change of a volatile at a MAC (Matta 1999 MCA velocity: sevo +4 % at 0.5, +17 % at 1.5; iso +19 %, +72 %). */
function volatileNet(mac: number, at05: number, at15: number): number {
  if (mac <= 0) return 1;
  return mac <= 0.5 ? 1 + (at05 * mac) / 0.5 : 1 + at05 + (at15 - at05) * (mac - 0.5);
}

/** Direct cerebral vasodilation beyond coupling: the net volatile effect divided by its metabolic share; ketamine +40 % at E 1. */
export function vasoDirect(a: BrainAnaesthesia): number {
  const sevoMet = Math.max(0.5, 1 - 0.25 * a.sevoMac);
  const isoMet = Math.max(0.5, 1 - 0.3 * a.isoMac);
  const sevo = volatileNet(a.sevoMac, 0.04, 0.17) / sevoMet;
  const iso = volatileNet(a.isoMac, 0.19, 0.72) / isoMet;
  return sevo * iso * (1 + 0.4 * a.ketamineE);
}

/** The tables' per-agent rows as the model's drug input (the INTERIM fallback: Stage 3 `thermal` GA without 7g drugs). */
export function drugsOf(a: BrainAnaesthesia): BrainDrugs {
  return { cmro2Mult: cmro2Rel(a, 37), cbfVaso: vasoDirect(a) };
}

/** Grubb: CBV/CBV0 = (CBF/CBF0)^0.38. */
export function cbvRel(cbfRel: number): number {
  return Math.max(0, cbfRel) ** GRUBB;
}

/** Arterial O2 content, mL/dL. */
export function caO2(hb: number, sao2: number, pao2: number): number {
  return 1.34 * hb * sao2 + 0.003 * pao2;
}

/**
 * Brain oxygen from the delivery/demand ratio r = (CBF·CaO2/CMRO2) relative to awake normal: PbtO2 = 25·r^0.75·
 * (1 + 0.004·(PaO2 − 100)+) [ENG]; SjvO2 = SaO2·(1 − OER), OER = 0.33/r capped at 0.75 [ENG] (params.ts).
 */
export function brainOxygen(r: number, sao2: number, pao2: number): { pbto2: number; sjvo2: number; oer: number } {
  const rr = Math.max(0, r);
  const pbto2 = PBTO2_0 * rr ** PBTO2_EXP * (1 + PBTO2_HYPEROXIA * Math.max(0, pao2 - 100));
  const oer = rr > 0 ? Math.min(OER_MAX, OER0 / rr) : OER_MAX;
  return { pbto2, sjvo2: sao2 * (1 - oer), oer };
}
```

- [x] **Step 4: Run the tests and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/brain/flow.test.ts && npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck`
Expected: PASS (5 tests; the prototype numbers are quoted in the test comments); typecheck clean.

- [x] **Step 5: Commit and push**

```bash
git add packages/engine-core/src/l2/brain/flow.ts packages/engine-core/test/l2/brain/flow.test.ts docs/plans/stage-7d-organs.md
git commit -m "feat(brain): CBF autoregulation, CO2/O2 reactivity, the tables' anaesthetic rows and the drug input, Grubb CBV, PbtO2/SjvO2

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7d-organs
```

### Task 5: Cushing response

**Files:**
- Create: `packages/engine-core/src/l2/brain/cushing.ts`
- Test: `packages/engine-core/test/l2/brain/cushing.test.ts`

**Interfaces:**
- Consumes: Task 3 constants `CUSH_*`. Produces: `CushingState` {lowS, okS, active, drive}, `createCushing()`, `stepCushing(c, cppBase, gap, dt)` (gap = MAP_head − ICP now; `Infinity` disables the second trigger), `cushingDMap(c)` (mmHg, 40·drive), `cushingHrFactor(c)`.

- [x] **Step 1: Write the failing test** — `packages/engine-core/test/l2/brain/cushing.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { createCushing, cushingDMap, cushingHrFactor, stepCushing } from '../../../src/l2/brain/cushing.ts';

describe('Cushing response (tables §5.1)', () => {
  it('needs CPP < 40 for 30 s, then MAP +30–50 within 60 s and HR × 0.6 at full drive; ends 30 s after recovery', () => {
    const c = createCushing();
    for (let i = 0; i < 290; i++) stepCushing(c, 35, Infinity, 0.1);
    expect(c.active).toBe(false);
    for (let i = 0; i < 20; i++) stepCushing(c, 35, Infinity, 0.1);
    expect(c.active).toBe(true);
    for (let i = 0; i < 600; i++) stepCushing(c, 35, Infinity, 0.1);
    expect(cushingDMap(c)).toBeGreaterThanOrEqual(30);
    expect(cushingDMap(c)).toBeLessThanOrEqual(50);
    for (let i = 0; i < 1200; i++) stepCushing(c, 25, Infinity, 0.1);
    expect(cushingHrFactor(c)).toBeCloseTo(0.6, 2);
    for (let i = 0; i < 310; i++) stepCushing(c, 60, Infinity, 0.1);
    expect(c.active).toBe(false);
    for (let i = 0; i < 6000; i++) stepCushing(c, 60, Infinity, 0.1);
    expect(c.drive).toBe(0);
  });
  it('second trigger (tables): ICP within 10 mmHg of the head MAP for 30 s → full drive even while the pre-surge CPP is ≥ 40', () => {
    const c = createCushing();
    for (let i = 0; i < 310; i++) stepCushing(c, 45, 8, 0.1);
    expect(c.active).toBe(true);
    for (let i = 0; i < 1200; i++) stepCushing(c, 45, 8, 0.1);
    expect(c.drive).toBeGreaterThan(0.99);
  });
  it('a brief dip does not trigger it', () => {
    const c = createCushing();
    for (let i = 0; i < 200; i++) stepCushing(c, 30, Infinity, 0.1);
    for (let i = 0; i < 10; i++) stepCushing(c, 45, Infinity, 0.1);
    for (let i = 0; i < 200; i++) stepCushing(c, 30, Infinity, 0.1);
    expect(c.active).toBe(false);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/brain/cushing.test.ts`
Expected: FAIL — Cannot find module `src/l2/brain/cushing.ts`.

- [x] **Step 3: Implement `packages/engine-core/src/l2/brain/cushing.ts`** (exactly as prototyped)

```ts
// Cushing response (tables §5.1): brainstem ischaemia when CPP — computed on the PRE-SURGE MAP, so the response
// cannot switch itself off — stays below 40 mmHg, OR the ICP comes within 10 mmHg of the (current) head MAP, for
// > 30 s (the tables' two triggers). Drive 0–1 (onset τ 15 s → MAP +30–50 over 30–60 s), giving ΔMAP = 50·drive
// (sympathetic surge), HR × (1 − 0.4·drive) (vagal) and ataxic breathing = drive.
import { CUSH_CPP, CUSH_DELAY_S, CUSH_DMAP, CUSH_GAP, CUSH_HR_DROP, CUSH_OFF_S, CUSH_TAU_OFF_S, CUSH_TAU_ON_S } from './params.ts';

export interface CushingState {
  lowS: number; // time a trigger (pre-surge CPP < 40, or MAP_head − ICP < 10) has held
  okS: number; // time neither has held
  active: boolean;
  drive: number; // 0–1
}

export const createCushing = (): CushingState => ({ lowS: 0, okS: 0, active: false, drive: 0 });

/** Advance by dt (s) with the pre-surge CPP and the current head-MAP − ICP gap (Infinity: gap trigger unused). */
export function stepCushing(c: CushingState, cppBase: number, gap: number, dt: number): void {
  const gapLow = gap < CUSH_GAP;
  if (cppBase < CUSH_CPP || gapLow) {
    c.lowS += dt;
    c.okS = 0;
  } else {
    c.okS += dt;
    c.lowS = 0;
  }
  if (!c.active && c.lowS >= CUSH_DELAY_S) c.active = true;
  if (c.active && c.okS >= CUSH_OFF_S) c.active = false;
  // full surge at CPP ≤ 31; 70 % at the threshold (tables: MAP +30–50 once triggered) [ENG]
  const target = c.active ? (gapLow ? 1 : Math.min(1, 0.7 + (CUSH_CPP - cppBase) / 30)) : 0;
  const tau = target > c.drive ? CUSH_TAU_ON_S : CUSH_TAU_OFF_S;
  c.drive += (target - c.drive) * (1 - Math.exp(-dt / tau));
  if (c.drive < 1e-4 && target === 0) c.drive = 0;
}

export const cushingDMap = (c: CushingState): number => CUSH_DMAP * c.drive;
export const cushingHrFactor = (c: CushingState): number => 1 - CUSH_HR_DROP * c.drive;
```

- [x] **Step 4: Run the tests and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/brain/cushing.test.ts && npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck`
Expected: PASS (3 tests; the prototype numbers are quoted in the test comments); typecheck clean.

- [x] **Step 5: Commit and push**

```bash
git add packages/engine-core/src/l2/brain/cushing.ts packages/engine-core/test/l2/brain/cushing.test.ts docs/plans/stage-7d-organs.md
git commit -m "feat(brain): Cushing response — pre-surge CPP < 40 or ICP within 10 of MAP for 30 s, MAP +40 at full drive, HR ×0.6, hysteresis

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7d-organs
```

### Task 6: BrainModel step (10 Hz): mass lesion, oedema, CSF, CBV fixed point, head-up, osmotherapy, herniation

**Files:**
- Create: `packages/engine-core/src/l2/brain/model.ts`
- Test: `packages/engine-core/test/l2/brain/model.test.ts`

**Interfaces:**
- Consumes: Tasks 3–5. Produces: `BrainParams`, `BrainInputs` {map, cvp, paco2, pao2, sao2, hb, tempC, drugs: BrainDrugs}, `BrainState` (fields as below; outputs `icp`, `cpp`, `mapHead`, `cbfRel`, `cbv`, `cmro2Rel`, `pbto2`, `sjvo2`, `elast`, `cush`, `herniated`; inputs set by commands: `mass`, `massRate`, `oedema`, `headUpDeg`, `osm`), `brainParams(conditions)`, `createBrain(p, inp)`, `stepBrain(b, inp, dt)`, `osmoticLoss(doses, t)`, `giveOsmotherapy(b, kind, mosm)`, `headUp(deg)`.

- [ ] **Step 1: Write the failing test** — `packages/engine-core/test/l2/brain/model.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { cushingDMap, cushingHrFactor } from '../../../src/l2/brain/cushing.ts';
import { drugsOf, NO_ANAESTHESIA, NO_DRUGS } from '../../../src/l2/brain/flow.ts';
import { brainParams, createBrain, giveOsmotherapy, stepBrain, type BrainInputs, type BrainState } from '../../../src/l2/brain/model.ts';
import { MANNITOL_MOSM_PER_G } from '../../../src/l2/brain/params.ts';

const REST: BrainInputs = { map: 90, cvp: 6, paco2: 40, pao2: 100, sao2: 0.97, hb: 14, tempC: 37, drugs: NO_DRUGS };
function run(b: BrainState, s: number, f: (b: BrainState, inp: BrainInputs, t: number) => void = () => {}): BrainInputs {
  const inp = { ...REST };
  for (let k = 0; k < s * 10; k++) {
    f(b, inp, b.t);
    stepBrain(b, inp, 0.1);
  }
  return inp;
}
const tbi = () => {
  const b = createBrain(brainParams([{ id: 'tbi', severity: 1 }]), REST);
  b.massRate = 1;
  return b;
};

describe('BrainModel', () => {
  it('rests at ICP0 with CBF 1 and PbtO2 25, and does not drift', () => {
    const b = createBrain(brainParams(), REST);
    run(b, 600);
    expect(b.icp).toBeCloseTo(10, 6);
    expect(b.cbfRel).toBeCloseTo(1, 6);
    expect(b.pbto2).toBeCloseTo(25, 1);
  });
  it('tables §7 check 19: expanding haematoma 1 mL/min, PVI 20 — ICP 20 by ~10–15 min, 40 by ~20–25 min, then Cushing', () => {
    const b = tbi();
    let t20 = -1;
    let t40 = -1;
    let tCush = -1;
    run(b, 1800, (x, inp, t) => {
      inp.map = 90 + cushingDMap(x.cush); // MANUAL coupling of the surge (organs/effects.ts does this in the engine, Tasks 11–13)
      if (t20 < 0 && x.icp >= 20) t20 = t;
      if (t40 < 0 && x.icp >= 40) t40 = t;
      if (tCush < 0 && x.cush.drive > 0.05) tCush = t;
    });
    expect(t20 / 60).toBeGreaterThanOrEqual(10); // prototype 10.8 (tables ~10–15)
    expect(t20 / 60).toBeLessThanOrEqual(15);
    expect(t40 / 60).toBeGreaterThanOrEqual(20); // prototype 23.7 (tables ~20–25)
    expect(t40 / 60).toBeLessThanOrEqual(25);
    expect(tCush / 60).toBeGreaterThan(t40 / 60); // CPP < 40 (MAP 90) needs ICP > 50
    expect(b.cush.drive).toBeGreaterThan(0.9);
    expect(90 * cushingHrFactor(b.cush) * (80 / 90)).toBeLessThan(55); // HR 80 → 45–55
  });
  it('Cushing: MAP +30–50 within 30–60 s of onset', () => {
    const b = tbi();
    let onset = -1;
    let dAt60 = 0;
    run(b, 1800, (x, inp, t) => {
      inp.map = 90 + cushingDMap(x.cush);
      if (onset < 0 && x.cush.active) onset = t;
      if (onset > 0 && Math.abs(t - onset - 60) < 0.05) dAt60 = cushingDMap(x.cush);
    });
    expect(dAt60).toBeGreaterThanOrEqual(30);
    expect(dAt60).toBeLessThanOrEqual(50);
  });
  it('hyperventilation PaCO2 40 → 30: ICP −25–30 % within 2 min (haematoma stopped at 15 mL)', () => {
    const b = tbi();
    run(b, 900);
    b.massRate = 0;
    run(b, 600);
    const before = b.icp;
    run(b, 120, (_x, inp) => {
      inp.paco2 = 30;
    });
    const drop = 1 - b.icp / before;
    expect(drop).toBeGreaterThanOrEqual(0.25); // prototype 0.258 (tables −25–30 % in 1–2 min)
    expect(drop).toBeLessThanOrEqual(0.3);
  });
  it('mannitol 1 g/kg: ICP −25 % vs control over 15–30 min', () => {
    const mk = () => {
      const b = tbi();
      run(b, 900);
      b.massRate = 0;
      run(b, 600);
      return b;
    };
    const ctl = mk();
    const man = mk();
    giveOsmotherapy(man, 'mannitol', 70 * MANNITOL_MOSM_PER_G);
    const rel: number[] = [];
    for (const s of [900, 900]) {
      run(ctl, s);
      run(man, s);
      rel.push(1 - man.icp / ctl.icp);
    }
    expect(rel[0]).toBeLessThanOrEqual(0.25 * 1.15); // prototype 0.256 at 15 min: crosses −25 % inside 15–30 min
    expect(rel[1]).toBeGreaterThanOrEqual(0.25 * 0.85); // prototype 0.319 at 30 min
    for (const x of rel) expect(x).toBeLessThanOrEqual(0.4); // tables drug row −20–40 %
  });
  it('head-up 30°: ICP −3 to −8 mmHg, CPP within 5 mmHg', () => {
    const b = tbi();
    run(b, 900);
    b.massRate = 0;
    run(b, 600);
    const icp = b.icp;
    const cpp = b.cpp;
    b.headUpDeg = 30;
    run(b, 120);
    expect(icp - b.icp).toBeGreaterThanOrEqual(3); // prototype 6.1 (tables −5.6, range −3 to −8)
    expect(icp - b.icp).toBeLessThanOrEqual(8);
    expect(Math.abs(b.cpp - cpp)).toBeLessThan(5); // prototype −3.1 ("CPP ≈ unchanged")
  });
  // tables §7 check 18: 75 y HTN (LL 75) under GA, CVP 6, PaO2 100 — CBF vs the anaesthetised baseline
  function check18() {
    const ga = drugsOf({ ...NO_ANAESTHESIA, propofolE: 0.6 }); // CMRO2 ×0.7
    const mk = (map: number, paco2: number): BrainInputs => ({ ...REST, map, paco2, drugs: ga, tempC: 36.5 });
    const b = createBrain(brainParams([{ id: 'htn' }]), mk(100, 40));
    const hold = (inp: BrainInputs, s: number) => {
      for (let k = 0; k < s * 10; k++) stepBrain(b, inp, 0.1);
    };
    hold(mk(100, 40), 120);
    const base = b.cbfRel;
    hold(mk(65, 40), 120);
    const low = b.cbfRel / base;
    hold(mk(65, 25), 180);
    const hypo = b.cbfRel / base;
    const pbto2 = b.pbto2;
    hold(mk(80, 35), 180);
    return { low, hypo, pbto2, recovered: b.cbfRel / base };
  }
  it('check 18: MAP 65 → CBF ≈ 70 % (±15 %); PbtO2 10–15 at PaCO2 25; MAP 80 + PaCO2 35 → > 80 %', () => {
    const n = check18();
    expect(n.low).toBeGreaterThanOrEqual(0.7 * 0.85); // prototype 0.753
    expect(n.low).toBeLessThanOrEqual(0.7 * 1.15);
    expect(n.pbto2).toBeGreaterThanOrEqual(10); // prototype 13.0
    expect(n.pbto2).toBeLessThanOrEqual(15);
    expect(n.recovered).toBeGreaterThan(0.8); // prototype 0.834
  });
  // R45: not widened. Model 0.417 at CVP 6 (CPP 59, ICP ≈ CVP): the tables' 35–40 % is 0.70 × C(25) with CPP 55.
  // Through the engine (PEEP: CVP ≈ 12 is the venous floor, CPP 53) it is 0.376 — in band (Task 18). Deviations.
  it.fails('check 18: PaCO2 25 → CBF 35–40 % of the anaesthetised baseline (model at CVP 6)', () => {
    const n = check18();
    expect(n.hypo).toBeGreaterThanOrEqual(0.35);
    expect(n.hypo).toBeLessThanOrEqual(0.4);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/brain/model.test.ts`
Expected: FAIL — Cannot find module `src/l2/brain/model.ts`.

- [ ] **Step 3: Implement `packages/engine-core/src/l2/brain/model.ts`** (exactly as prototyped)

```ts
// BrainModel (Stage 7d, tables §5.1): plain-data state stepped at 10 Hz from the circulation/gas truths.
// Intracranial volume → ICP (mechanics.ts) ⇄ CPP → CBF (flow.ts, conductance relaxing with τ 10 s) → CBV (Grubb)
// solved by damped fixed-point each step; CSF displacement, mass lesion, oedema, osmotherapy and head-up posture
// change the volume; Cushing (cushing.ts) and herniation are states.
import { createCushing, cushingDMap, stepCushing, type CushingState } from './cushing.ts';
import { autoreg, brainOxygen, caO2, cbvRel, co2Factor, NO_DRUGS, o2Factor, tempCmro2, type BrainDrugs } from './flow.ts';
import { csfDisplacementRate, elastance, icpOfVolume } from './mechanics.ts';
import {
  CBF_LL, CBF_UL, CBV0_ML, CBV_EFF, CPP_REF, CSF_RESERVE_ML, HEAD_HEIGHT_CM, HEADUP_VOL_ML_30, HERNIATION_CPP, HERNIATION_S,
  HTS_TAU_IN_MIN, HTS_TAU_OUT_MIN, HTN_LL_SHIFT, HTN_UL_SHIFT, ICP0, MANNITOL_TAU_IN_MIN, MANNITOL_TAU_OUT_MIN, MAP_BASE_TAU_S,
  MMHG_PER_CM_BLOOD, OSM_K_MOSM, OSM_VMAX_ML, PACO2_ADAPT_TAU_S, PVI, R_OUT, TAU_VASC_S, TBI_AR_LOSS, TBI_ICP0_RISE, TBI_PVI_DROP, TBI_RESERVE_DROP,
} from './params.ts';

export interface BrainParams {
  icp0: number; pvi: number; rOut: number; csfReserve: number; ll: number; ul: number; ar: number;
}
export interface OsmDose { t0: number; mosm: number; tauIn: number; tauOut: number }
export interface BrainInputs {
  map: number; // mmHg, arterial mean at heart level (truth)
  cvp: number; // mmHg
  paco2: number; pao2: number; sao2: number; // mmHg, mmHg, fraction
  hb: number; // g/dL
  tempC: number;
  drugs: BrainDrugs; // anaesthetic CMRO2 multiplier and direct vasodilation (organs/inputs.ts: 7f/7g, or the INTERIM fallback)
}
export interface BrainState {
  t: number;
  p: BrainParams;
  mass: number; massRate: number; // mL, mL/min (a growing haematoma)
  oedema: number; // mL
  csfDisp: number; // mL displaced
  osm: OsmDose[];
  headUpDeg: number;
  g: number; // cerebrovascular conductance, CBF-relative per mmHg CPP
  paco2Ref: number;
  mapBase: number; // pre-surge MAP (LPF, frozen while Cushing is active)
  cush: CushingState;
  lowCppS: number;
  herniated: boolean;
  // outputs (truths)
  icp: number; cpp: number; mapHead: number; cbfRel: number; cbv: number; cmro2Rel: number; pbto2: number; sjvo2: number; elast: number;
}

/** Profile → brain parameters: HTN shifts the plateau right; TBI (severity 0–1) lowers PVI, raises ICP0, impairs AR. */
export function brainParams(conditions: readonly { id: string; severity?: number }[] = []): BrainParams {
  const p: BrainParams = { icp0: ICP0, pvi: PVI, rOut: R_OUT, csfReserve: CSF_RESERVE_ML, ll: CBF_LL, ul: CBF_UL, ar: 1 };
  for (const c of conditions) {
    const s = Math.min(1, Math.max(0, c.severity ?? 1));
    if (c.id === 'htn') {
      p.ll += HTN_LL_SHIFT;
      p.ul += HTN_UL_SHIFT;
    } else if (c.id === 'tbi') {
      p.pvi -= TBI_PVI_DROP * s;
      p.icp0 += TBI_ICP0_RISE * s;
      p.ar = 1 - TBI_AR_LOSS * s;
      p.csfReserve -= TBI_RESERVE_DROP * s;
    }
  }
  return p;
}

export function createBrain(p: BrainParams, inp: BrainInputs): BrainState {
  const b: BrainState = {
    t: 0, p, mass: 0, massRate: 0, oedema: 0, csfDisp: 0, osm: [], headUpDeg: 0, g: 0, paco2Ref: inp.paco2, mapBase: inp.map, // adapted to the patient's own PaCO2
    cush: createCushing(), lowCppS: 0, herniated: false,
    icp: p.icp0, cpp: inp.map - p.icp0, mapHead: inp.map, cbfRel: 1, cbv: CBV0_ML, cmro2Rel: 1, pbto2: 25, sjvo2: 0.65, elast: 0,
  };
  // start at rest: conductance at its target so t = 0 is a steady state
  b.g = targetCbf(b, inp, b.cpp) / Math.max(1, b.cpp);
  solve(b, inp, 0);
  b.mapBase = inp.map;
  return b;
}

function targetCbf(b: BrainState, inp: BrainInputs, cpp: number): number {
  const m = inp.drugs.cmro2Mult * tempCmro2(inp.tempC) * inp.drugs.cbfVaso;
  return autoreg(cpp, b.p.ll, b.p.ul, b.p.ar) * co2Factor(inp.paco2, b.paco2Ref) * o2Factor(inp.pao2) * m;
}

/** Osmotic brain-water loss (mL, ≥ 0) at time t: Bateman shape normalised to its peak × saturation × Vmax. */
export function osmoticLoss(doses: readonly OsmDose[], t: number): number {
  let v = 0;
  for (const d of doses) {
    const m = (t - d.t0) / 60;
    if (m <= 0) continue;
    const tp = (Math.log(d.tauOut / d.tauIn) * d.tauIn * d.tauOut) / (d.tauOut - d.tauIn);
    const peak = Math.exp(-tp / d.tauOut) - Math.exp(-tp / d.tauIn);
    v += ((Math.exp(-m / d.tauOut) - Math.exp(-m / d.tauIn)) / peak) * (d.mosm / (d.mosm + OSM_K_MOSM));
  }
  return OSM_VMAX_ML * v;
}

export function giveOsmotherapy(b: BrainState, kind: 'mannitol' | 'hypertonicSaline', mosm: number): void {
  const m = kind === 'mannitol';
  b.osm.push({ t0: b.t, mosm, tauIn: m ? MANNITOL_TAU_IN_MIN : HTS_TAU_IN_MIN, tauOut: m ? MANNITOL_TAU_OUT_MIN : HTS_TAU_OUT_MIN });
}

/** Head-up posture: tragus height above the heart (cm) and the venous volume drained (mL). */
export function headUp(deg: number): { hCm: number; volMl: number } {
  const s = Math.sin((Math.max(0, Math.min(90, deg)) * Math.PI) / 180);
  return { hCm: HEAD_HEIGHT_CM * s, volMl: (HEADUP_VOL_ML_30 * s) / 0.5 };
}

/** ICP ⇄ CBV fixed point at the current conductance (damped, 6 iterations; converges < 0.01 mmHg in tests). */
function solve(b: BrainState, inp: BrainInputs, dt: number): void {
  const hu = headUp(b.headUpDeg);
  b.mapHead = inp.map - MMHG_PER_CM_BLOOD * hu.hCm;
  const cvpHead = inp.cvp - MMHG_PER_CM_BLOOD * hu.hCm;
  const fixedV = b.mass + b.oedema - b.csfDisp - osmoticLoss(b.osm, b.t) - hu.volMl;
  let icp = b.icp;
  let cbf = b.cbfRel;
  for (let i = 0; i < 6; i++) {
    const cpp = b.mapHead - Math.max(icp, cvpHead);
    cbf = b.g * Math.max(0, cpp);
    const dCbv = CBV_EFF * CBV0_ML * (cbvRel(cbf) - 1);
    const next = Math.min(b.mapHead + 5, icpOfVolume(fixedV + dCbv, b.p.icp0, b.p.pvi));
    icp = i === 0 && dt === 0 ? next : 0.5 * (icp + next);
  }
  b.icp = icp;
  b.cpp = b.mapHead - Math.max(icp, cvpHead);
  b.cbfRel = b.g * Math.max(0, b.cpp);
  b.cbv = CBV0_ML * cbvRel(b.cbfRel);
  b.elast = elastance(icp, b.p.pvi);
}

/** Advance the brain by dt seconds (called every BRAIN_DT_S). */
export function stepBrain(b: BrainState, inp: BrainInputs, dt: number): void {
  b.t += dt;
  b.mass = Math.max(0, b.mass + (b.massRate * dt) / 60);
  b.csfDisp = Math.max(0, b.csfDisp + (csfDisplacementRate(b.icp, b.csfDisp, b.p.icp0, b.p.rOut, b.p.csfReserve) * dt) / 60);
  b.paco2Ref += (inp.paco2 - b.paco2Ref) * (dt / PACO2_ADAPT_TAU_S);
  // conductance relaxes toward the one that gives the target CBF at the current CPP (dynamic autoregulation)
  const gT = targetCbf(b, inp, b.cpp) / Math.max(1, b.cpp);
  b.g += (gT - b.g) * (1 - Math.exp(-dt / TAU_VASC_S));
  solve(b, inp, dt);
  // Cushing on the pre-surge MAP (frozen while active)
  if (b.cush.drive < 0.01) b.mapBase += (inp.map - b.mapBase) * (1 - Math.exp(-dt / MAP_BASE_TAU_S));
  const hu = headUp(b.headUpDeg);
  stepCushing(b.cush, b.mapBase - MMHG_PER_CM_BLOOD * hu.hCm - b.icp, b.mapHead - b.icp, dt);
  b.lowCppS = b.cpp <= HERNIATION_CPP ? b.lowCppS + dt : 0;
  if (b.lowCppS >= HERNIATION_S) b.herniated = true;
  b.cmro2Rel = inp.drugs.cmro2Mult * tempCmro2(inp.tempC);
  const r = (b.cbfRel * caO2(inp.hb, inp.sao2, inp.pao2)) / Math.max(1e-6, b.cmro2Rel * caO2(14, 0.97, 95));
  const o = brainOxygen(r, inp.sao2, inp.pao2);
  b.pbto2 = o.pbto2;
  b.sjvo2 = o.sjvo2;
}

export { cushingDMap, CPP_REF, NO_DRUGS };
```

- [ ] **Step 4: Run the tests and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/brain/model.test.ts && npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck`
Expected: PASS (8 tests, one of them `it.fails`: the model's hypocapnic CBF 0.417 at CVP 6 against the tables' 0.35–0.40 — Deviations; through the engine it is in band, Task 18); typecheck clean.

- [ ] **Step 5: Commit and push**

```bash
git add packages/engine-core/src/l2/brain/model.ts packages/engine-core/test/l2/brain/model.test.ts docs/plans/stage-7d-organs.md
git commit -m "feat(brain): BrainModel — ICP⇄CBV fixed point, dynamic autoregulation, CSF, osmotherapy, head-up, Cushing, herniation (checks 18/19 at model level)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7d-organs
```

### Task 7: ICP waveform generator (125 Hz, P1/P2/P3 by compliance, respiratory component)

**Files:**
- Create: `packages/engine-core/src/l2/brain/wave.ts`
- Test: `packages/engine-core/test/l2/brain/wave.test.ts`

**Interfaces:**
- Produces: `icpSample(icpMean, elast, pp, sinceR, rr, u)`, `p2p1(elast)`, `beatShape`, `beatShapeArea`, constants `P_DELAY_S`, `P_SIGMA_S`, `PULSE_VOL_ML`, `RESP_VOL_ML`.

- [ ] **Step 1: Write the failing test** — `packages/engine-core/test/l2/brain/wave.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { elastance } from '../../../src/l2/brain/mechanics.ts';
import { icpSample, p2p1 } from '../../../src/l2/brain/wave.ts';

function beat(icp: number, pvi: number) {
  const e = elastance(icp, pvi);
  let mx = -1e9;
  let mn = 1e9;
  let sum = 0;
  const v: number[] = [];
  for (let k = 0; k < 100; k++) {
    const x = icpSample(icp, e, 40, k / 125, 0.8, 0.5);
    v.push(x);
    mx = Math.max(mx, x);
    mn = Math.min(mn, x);
    sum += x;
  }
  return { amp: mx - mn, mean: sum / 100, p1: (v[19] as number) - mn, p2: (v[34] as number) - mn };
}

describe('ICP waveform (tables §5.1, Q39)', () => {
  it('pulse amplitude ≈ 0.1·ICP + 0.5 when compliant and rises steeply with elastance; the mean is the ICP', () => {
    const a = beat(10, 25);
    expect(a.amp).toBeCloseTo(1.5, 0);
    expect(a.mean).toBeCloseTo(10, 6);
    expect(beat(40, 20).amp).toBeGreaterThan(6);
  });
  it('P2/P1: 0.8 compliant, 1.0 at ICP 20/PVI 25, > 1 (P2 > P1) from ICP 20/PVI 20, 1.3–1.5 exhausted', () => {
    const r = (icp: number, pvi: number) => {
      const b = beat(icp, pvi);
      return b.p2 / b.p1;
    };
    expect(r(10, 25)).toBeCloseTo(0.8, 1);
    expect(r(20, 25)).toBeCloseTo(1.0, 1);
    expect(r(20, 20)).toBeGreaterThan(1);
    expect(r(40, 20)).toBeGreaterThan(1.3);
    expect(p2p1(10)).toBe(1.4);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/brain/wave.test.ts`
Expected: FAIL — Cannot find module `src/l2/brain/wave.ts`.

- [ ] **Step 3: Implement `packages/engine-core/src/l2/brain/wave.ts`** (exactly as prototyped)

```ts
// ICP waveform (tables §5.1 "ICP waveform", Q39): three Gaussians per perfused beat — P1 percussion (arterial),
// P2 tidal (brain compliance), P3 dicrotic — plus a respiratory component, around the ICP mean. Pulse amplitude
// AMP = elastance × arterial pulse volume (≈ 1.6 mL at PP 40), so AMP ≈ 0.1·ICP + 0.5 when compliant and rises
// steeply as compliance is used; P2/P1 = 0.8 compliant → 1.0 at elastance of ICP 20/PVI 25 → 1.4 exhausted [ENG].
export const P_DELAY_S = [0.15, 0.27, 0.4] as const; // after the R wave: upstroke + 30–60 ms, tidal, post-incisura [ENG]
export const P_SIGMA_S = [0.025, 0.035, 0.04] as const;
export const PULSE_VOL_ML = 1.6; // arterial CBV pulse at PP 40 mmHg [ENG]: AMP 1.47 at ICP 10/PVI 25
export const RESP_VOL_ML = 0.6; // venous volume swing of a reference breath (u swing 1.0) [ENG]: 1–3 mmHg at ICP 20
export const P3_REL = 0.55;

/** P2/P1 ratio vs elastance (mmHg/mL): 0.8 up to 0.92 (ICP 10/PVI 25), 1.0 at 1.84 (ICP 20), 1.4 at ≥ 4. */
export function p2p1(elast: number): number {
  if (elast <= 0.92) return 0.8;
  if (elast <= 1.84) return 0.8 + (0.2 * (elast - 0.92)) / 0.92;
  return Math.min(1.4, 1 + (0.4 * (elast - 1.84)) / (4 - 1.84));
}

/** Unit-peak beat shape at time s after the R wave, and its mean over a beat of length rr (for the zero-mean pulse). */
export function beatShape(s: number, ratio: number): number {
  if (s < 0 || s > 0.8) return 0;
  const g = (i: 0 | 1 | 2) => Math.exp(-0.5 * ((s - P_DELAY_S[i]) / P_SIGMA_S[i]) ** 2);
  const peak = Math.max(1, ratio);
  return (g(0) + ratio * g(1) + P3_REL * g(2)) / peak;
}
const SQ2PI = Math.sqrt(2 * Math.PI);
export function beatShapeArea(ratio: number): number {
  return (SQ2PI * (P_SIGMA_S[0] + ratio * P_SIGMA_S[1] + P3_REL * P_SIGMA_S[2])) / Math.max(1, ratio);
}

/** One sample: mean ICP + pulse (zero mean over the beat) + respiratory swing (u − 0.5 from Stage 3's breath signal). */
export function icpSample(icpMean: number, elast: number, pp: number, sinceR: number, rr: number, u: number): number {
  const ratio = p2p1(elast);
  const amp = elast * PULSE_VOL_ML * Math.max(0, pp / 40);
  const pulse = amp * (beatShape(sinceR, ratio) - beatShapeArea(ratio) / Math.max(0.3, rr));
  return icpMean + pulse + elast * RESP_VOL_ML * (u - 0.5);
}
```

- [ ] **Step 4: Run the tests and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/brain/wave.test.ts && npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck`
Expected: PASS (2 tests; the prototype numbers are quoted in the test comments); typecheck clean.

- [ ] **Step 5: Commit and push**

```bash
git add packages/engine-core/src/l2/brain/wave.ts packages/engine-core/test/l2/brain/wave.test.ts docs/plans/stage-7d-organs.md
git commit -m "feat(brain): ICP waveform — P1/P2/P3 with P2/P1 by elastance, amplitude = elastance × pulse volume, respiratory swing

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7d-organs
```

### Task 8: Kidney constants and the ported Pulse renal haemodynamics (RBF, P_gc, GFR, TGF, natriuresis, angiotensin)

**Files:**
- Create: `packages/engine-core/src/l2/renal/params.ts`
- Create: `packages/engine-core/src/l2/renal/kidney.ts`
- Test: `packages/engine-core/test/l2/renal/kidney.test.ts`

**Interfaces:**
- Produces: renal constants (incl. `RENAL_FLOW_FRAC` = 7a's `ICRP89_FLOW_FRACTIONS_M.kidneys`, `RENAL_REF_*`, `ANG_TAU_S`, `EABV_EXP`, `NH_TAU_*`, `MYOGENIC_MAX`, `FUROSEMIDE_EC50_REF`); `lpReab(p)`, `natriuresis(p, pRef)`, `RenalHaemo` {rbf, pgc, gfr}, `renalHaemo(pa, pv, k, rAff, effF, kfF, albuminGL, pb = P_BOWMAN)`, `tgfTarget(pa, pv, k, effF, kfF, albuminGL, gfrSet, pb = P_BOWMAN)`, `angiotensin(rpp, eabv)`, `effFactor(ang)`.

- [ ] **Step 1: Write the failing test** — `packages/engine-core/test/l2/renal/kidney.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { angiotensin, lpReab, natriuresis, renalHaemo, tgfTarget } from '../../../src/l2/renal/kidney.ts';
import { R_AFF, R_AFF_MAX, R_AFF_MIN } from '../../../src/l2/renal/params.ts';

describe('ported renal haemodynamics (annex B2)', () => {
  it('Pulse topology at rest (k = 0.879 calibrates RBF to 17 % of CO 5.6): RBF 952, P_gc ≈ 57.6, GFR ≈ 125 (180 L/day)', () => {
    const h = renalHaemo(93, 5, 0.879, R_AFF, 1, 1, 42);
    expect(h.rbf).toBeCloseTo(952, -1);
    expect(h.pgc).toBeCloseTo(57.6, 0);
    expect(h.gfr).toBeCloseTo(125, -1);
  });
  it('filtration stops when P_gc < P_Bowman + π; albumin loss raises GFR', () => {
    expect(renalHaemo(55, 5, 0.879, R_AFF, 1, 1, 42).gfr).toBe(0);
    expect(renalHaemo(93, 5, 0.879, R_AFF, 1, 1, 30).gfr).toBeGreaterThan(renalHaemo(93, 5, 0.879, R_AFF, 1, 1, 42).gfr);
    expect(renalHaemo(63, 25, 0.879, R_AFF, 1, 1, 42, 25).gfr).toBe(0); // IAP 25: RPP 38 and Bowman ≈ IAP (WSACS MAP − 2·IAP)
  });
  it('TGF + myogenic target restores the set GFR up to MAP 180 and stays inside the R_aff range', () => {
    const r = tgfTarget(180, 5, 0.879, 1, 1, 42, 125);
    expect(renalHaemo(180, 5, 0.879, r, 1, 1, 42).gfr).toBeCloseTo(125, 0);
    expect(tgfTarget(260, 5, 0.879, 1, 1, 42, 125)).toBe(R_AFF_MAX);
    expect(tgfTarget(50, 5, 0.879, 1, 1, 42, 125)).toBe(R_AFF_MIN);
  });
  it('pressure natriuresis: U(150)/U(100) = 3, U(80)/U(100) ≈ 0.67 (tables U); curve held above 160', () => {
    expect(natriuresis(150, 100)).toBeCloseTo(3, 1);
    expect(natriuresis(80, 100)).toBeCloseTo(0.66, 1);
    expect(lpReab(180)).toBe(lpReab(160));
  });
  it('angiotensin: 0 at RPP 80 and normal volume, 1 at RPP 40 or −20 % effective volume (at RPP ≤ 80)', () => {
    expect(angiotensin(85, 1)).toBe(0);
    expect(angiotensin(40, 1)).toBe(1);
    expect(angiotensin(75, 0.8)).toBeCloseTo(1, 9);
    expect(angiotensin(95, 0.8)).toBeCloseTo(0.5, 9); // the volume term fades over RPP 80–110 (renin suppressed)
    expect(angiotensin(130, 0.5)).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/renal/kidney.test.ts`
Expected: FAIL — Cannot find module `src/l2/renal/kidney.ts`.

- [ ] **Step 3: Implement `packages/engine-core/src/l2/renal/params.ts`** (exactly as prototyped)

```ts
// SPDX-License-Identifier: Apache-2.0
// Portions derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), src/cpp/engine/common/controller/
// SetupCircuitsAndCompartments.cpp (renal circuit, lines 1316–1720), src/cpp/engine/PulseConfiguration.cpp (renal
// configuration, lines 602–615) and src/cpp/engine/common/system/physiology/RenalModel.cpp, Copyright 2018-2025
// Kitware, Inc. and Contributors, itself a fork of BioGears 6.1.1, Copyright 2015 Applied Research Associates, Inc.;
// licensed under the Apache License, Version 2.0; modified: re-expressed in TypeScript and simplified for the monitor
// tick (one algebraic kidney at 1 Hz; see NOTICES N-P19).
//
// Stage 7d kidney constants. Pulse values from docs/physiology/pulse-parameter-annex.md B2 (per kidney, mmHg·min/mL,
// all × Pulse's 1.25 calibration); our additions cite tables §5.2 or are [ENG] with the prototype number.
import { ICRP89_FLOW_FRACTIONS_M } from '../circ/params.ts';

export const RENAL_DT_S = 1; // kidney and liver step at 1 Hz (annex B2 "one algebraic kidney at 1 Hz")
// Pulse per-kidney resistances (annex B2 table), both kidneys in parallel → ÷ 2 where used
export const R_ART = 0.025 * 1.25; // renal artery (male value)
export const R_AFF = 0.0417 * 1.25; // afferent arteriole (TGF-controlled)
export const R_GLOM = 0.0019 * 1.25;
export const R_EFF = 0.0763 * 1.25; // efferent arteriole
export const R_PT = 0.0167 * 1.25; // peritubular capillaries
export const R_RV = 0.0066 * 1.25; // renal vein
/** TGF range for R_aff: Pulse 2.2–11.2 mmHg·s/mL = 0.0367–0.187 mmHg·min/mL (CFG 608–609). The upper bound is
 *  raised by the MYOGENIC response Pulse lacks (afferent constriction to stretch, which with TGF holds RBF over RPP
 *  80–180, tables §5.2 `rblLL/rblUL`) [ENG ×MYOGENIC_MAX]: with Pulse's 11.2 alone RBF rose 21 % and GFR doubled at MAP 180. */
export const R_AFF_MIN = 2.2 / 60;
export const MYOGENIC_MAX = 2;
export const R_AFF_MAX = (11.2 / 60) * MYOGENIC_MAX;
/** TGF time constant: Pulse's 0.001-per-beat damping ≈ 60–90 s (annex B2 "Take") → 60 s. */
export const TGF_TAU_S = 60;
export const KF_PER_KIDNEY = 3.67647 * 2.0; // glomerular Lp·A, mL/min/mmHg (CFG 604–605)
export const PI_GLOM0 = 32; // glomerular oncotic pressure, mmHg (SET 1386–1389) at albumin 42 g/L
export const ALBUMIN0_G_L = 42;
/** Bowman's space pressure [ENG]: calibrated so the resting GFR is 125 mL/min (tables/annex reference 180 L/day;
 *  Pulse gives 147.5 L/day, D12). UOP is calibrated separately (ef0), so this only sets GFR and the filtration fraction. */
export const P_BOWMAN = 17.1;
export const RENAL_FLOW_FRAC = ICRP89_FLOW_FRACTIONS_M.kidneys; // 0.17, both kidneys (ICRP-89 via Pulse SET 315, NOTICES N-P10) — audit borrow #7
/** The healthy reference the kidney is calibrated on (createRenal): MAP 93, CVP 5, CO 0.08 L/min/kg (5.6 L/min at 70 kg). */
export const RENAL_REF_MAP = 93;
export const RENAL_REF_CVP = 5;
export const RENAL_REF_CO_L_KG = 0.08;
/** Pressure natriuresis: Pulse's tubular reabsorption permeability vs renal arterial pressure (PH/Renal 1983–2071),
 *  used here as the excreted FRACTION ∝ (Lp(Pref)/Lp(P))^1.74 — the exponent that makes UOP(150)/UOP(100) = 3
 *  (tables U(): Guyton renal output curve); U(80) then equals the tables' 0.67 exactly [ENG fit]. */
export const LP_A = 2.00943e-6;
export const LP_B = -8.09933e-4;
export const LP_C = 9.37727e-2;
export const NATRIURESIS_EXP = 1.74;
export const UOP0_ML_KG_H = 1.0; // awake, tables `UOP0` [TXT]
export const OLIGURIA_ML_KG_H = 0.5; // KDIGO (tables alarm row, Q40)
export const ANURIA_ML_KG_H = 0.05; // [ENG]
/** Efferent (angiotensin II) tone in low-flow states [ENG; Pulse has no RAAS (annex B2 stated limits)]: R_eff × (1 +
 *  ANG_GAIN·a), a = 0–1 from RPP below 80 and blood volume loss — keeps GFR while RBF falls (filtration fraction ↑). */
export const ANG_GAIN = 3;
/** Angiotensin/efferent response time constant, s [ENG]: an instantaneous term followed 7a's second-to-second CO wobble
 *  (CO 4.9–5.6 in MODELED HFrEF) and swung GFR 27–211 mL/min within seconds; AngII's efferent effect builds over minutes. */
export const ANG_TAU_S = 120;
export const S_GA = 0.6; // surgical stress/ADH under GA, tables `S` [ENG] (0.4–0.8)
export const V_AT_15 = 0.5; // UOP factor at −15 % blood volume (tables V)
export const V_AT_30 = 0.2; // at −30 %
export const EABV_EXP = 0.75; // effective volume = min(BV, (CO/CO0)^0.75) [ENG]: HFrEF (CO 3.5) → V 0.21, UOP 0.114 (tables check 20 0.1–0.15)
/** Neurohumoral (ADH/aldosterone) lag on V [ENG]: onset τ 2 min (ADH release is fast), washout τ 45 min. With an
 *  instantaneous V, dobutamine in check 20 gave 0.338 mL/kg/h at 30 min (tables 0.2–0.3 within 30–60 min); with the
 *  washout: 0.233 at 30 min, 0.284 at 60 min. Recovery after fluids is correspondingly gradual (class III → 0.53 at 60 min). */
export const NH_TAU_ON_S = 120;
export const NH_TAU_OFF_S = 2700;
export const PEEP_PER_10 = 0.9; // × per 10 cmH2O mean-airway-pressure excess (tables PEEP row) [ENG]
export const NE_EXCESS_PER_01 = 0.9; // × per 0.1 µg/kg/min α-agonist above need (tables D row) [ENG]
export const SEPSIS_GFR_LOSS = 0.5; // Kf × (1 − 0.5·sepsis) (efferent dilation / microvascular) [ENG]; 7f writes sepsis
export const AKI_KF_LOSS = 0.8; // condition aki severity 1 → Kf × 0.2 [ENG]
// Diuretics (tables §5.2 has none; label-level [TXT], shape [ENG])
export const FUROSEMIDE_EMAX = 9; // excreted fraction × (1 + 9·E): 40 mg → peak UOP ≈ 7× (≈ 8 mL/min)
export const FUROSEMIDE_ED50_MG = 20; // own-depot path (no 7g): E = plasma mg/(mg + 20)
/** With 7g: E = c/(c + 1), c = 7g's furosemide level in reference doses (row `furosemide`: gamma, ref 20 mg, peak
 *  15 min, 10 % at 2 h) — the same ED50 as 20 mg. 40 mg: peak 8.2 mL/min at 15 min, 0.92 L in 4 h (Task 11 test). */
export const FUROSEMIDE_EC50_REF = 1;
export const FUROSEMIDE_KA_PER_MIN = 0.2; // IV: onset ≈ 5 min, peak ≈ 30 min
export const FUROSEMIDE_KE_PER_MIN = 0.0115; // t½ ≈ 1 h (duration ≈ 2 h)
export const MANNITOL_KE_PER_MIN = Math.LN2 / 120; // plasma t½ ≈ 2 h (renal)
export const MANNITOL_ML_PER_G = 14; // obligate water per g excreted at urine osmolality ≈ 400 mOsm/kg [ENG]
export const BLADDER_CAP_ML = 400; // Pulse PH/Renal 1549 (no catheter: auto-void)
```

- [ ] **Step 4: Implement `packages/engine-core/src/l2/renal/kidney.ts`** (exactly as prototyped)

```ts
// SPDX-License-Identifier: Apache-2.0
// Portions derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), src/cpp/engine/common/system/physiology/
// RenalModel.cpp (glomerular filtration 518–578, tubuloglomerular feedback 1823–1978, reabsorption permeability
// 1983–2071) and SetupCircuitsAndCompartments.cpp (renal circuit 1316–1720), Copyright 2018-2025 Kitware, Inc. and
// Contributors, itself a fork of BioGears 6.1.1, Copyright 2015 Applied Research Associates, Inc.; licensed under the
// Apache License, Version 2.0; modified: the 14-node circuit collapsed to one algebraic kidney (series resistances,
// glomerular pressure from the divider), TGF as a first-order controller on R_aff, the reabsorption quadratic used as
// an excreted-fraction curve, plus ADH/stress, volume, PEEP, vasopressor, sepsis and angiotensin terms Pulse lacks
// (see NOTICES N-P19 and docs/plans/stage-7d-organs.md decisions).
import {
  ALBUMIN0_G_L, ANG_GAIN, KF_PER_KIDNEY, LP_A, LP_B, LP_C, NATRIURESIS_EXP, P_BOWMAN, PI_GLOM0, R_AFF, R_AFF_MAX, R_AFF_MIN, R_ART,
  R_EFF, R_GLOM, R_PT, R_RV,
} from './params.ts';

/** Pulse's tubular reabsorption permeability at renal arterial pressure p (annex B2; minimum at ≈ 200 mmHg). */
export function lpReab(p: number): number {
  const q = Math.min(160, Math.max(20, p)); // above 160 the curve is held (Guyton's plateau region) [ENG]
  return LP_A * q * q + LP_B * q + LP_C;
}

/** Pressure natriuresis: excreted-fraction multiplier relative to pRef (1 at pRef). */
export function natriuresis(p: number, pRef: number): number {
  return (lpReab(pRef) / lpReab(p)) ** NATRIURESIS_EXP;
}

export interface RenalHaemo {
  rbf: number; // mL/min, both kidneys
  pgc: number; // glomerular capillary pressure, mmHg
  gfr: number; // mL/min
}

/**
 * One algebraic kidney (both kidneys in parallel, so resistances ÷ 2): RBF = (Pa − Pv)/ΣR; P_gc from the divider;
 * GFR = Kf·(P_gc − P_B − π_gc)+. `k` scales every resistance (calibration to the resting RBF), `rAff` is the TGF state
 * (per kidney), `effF` the efferent (angiotensin) multiplier, `kfF` the filtration-coefficient multiplier, `pb` Bowman's
 * pressure — raised to the intra-abdominal pressure when that is higher (parenchymal compression: the WSACS filtration
 * gradient MAP − 2·IAP [TXT]; without it IAP 25 still filtered at RPP 38 because it only raised the venous back-pressure).
 */
export function renalHaemo(pa: number, pv: number, k: number, rAff: number, effF: number, kfF: number, albuminGL: number, pb = P_BOWMAN): RenalHaemo {
  const pre = (k * (R_ART + rAff + R_GLOM / 2)) / 2;
  const post = (k * (R_GLOM / 2 + R_EFF * effF + R_PT + R_RV)) / 2;
  const rbf = Math.max(0, pa - pv) / (pre + post);
  const pgc = pv + rbf * post;
  const pi = PI_GLOM0 * (albuminGL / ALBUMIN0_G_L);
  const gfr = Math.max(0, 2 * KF_PER_KIDNEY * kfF * (pgc - pb - pi));
  return { rbf, pgc, gfr };
}

/** The R_aff (per kidney) that would restore GFR to gfrSet at these pressures — TGF's target — clamped to Pulse's range. */
export function tgfTarget(pa: number, pv: number, k: number, effF: number, kfF: number, albuminGL: number, gfrSet: number, pb = P_BOWMAN): number {
  const post = (k * (R_GLOM / 2 + R_EFF * effF + R_PT + R_RV)) / 2;
  const pi = PI_GLOM0 * (albuminGL / ALBUMIN0_G_L);
  const pgcStar = gfrSet / (2 * KF_PER_KIDNEY * kfF) + pb + pi;
  if (pgcStar <= pv + 1e-6 || pa <= pgcStar) return R_AFF_MIN;
  const q = (pgcStar - pv) / post;
  const rAff = (2 * (pa - pgcStar)) / (q * k) - R_ART - R_GLOM / 2;
  return Math.min(R_AFF_MAX, Math.max(R_AFF_MIN, rAff));
}

/** Angiotensin/efferent activation 0–1 [ENG]: RPP below 80 (0 → 1 over 80 → 40) or effective volume loss (1 at −20 %);
 *  the volume term fades out between RPP 80 and 110 — high renal perfusion pressure suppresses renin release (without
 *  it a low-CO, high-MAP state kept the efferent tone on and GFR reached 550 mL/min at MAP 187 in the engine). */
export function angiotensin(rpp: number, eabv: number): number {
  const vol = ((1 - eabv) / 0.2) * Math.min(1, Math.max(0, (110 - rpp) / 30));
  return Math.min(1, Math.max(0, (80 - rpp) / 40, vol));
}
export const effFactor = (ang: number): number => 1 + ANG_GAIN * ang;
export { R_AFF };
```

- [ ] **Step 5: Run the tests and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/renal/kidney.test.ts && npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck`
Expected: PASS (5 tests; the prototype numbers are quoted in the test comments); typecheck clean.

- [ ] **Step 6: Commit and push**

```bash
git add packages/engine-core/src/l2/renal/params.ts packages/engine-core/src/l2/renal/kidney.ts packages/engine-core/test/l2/renal/kidney.test.ts docs/plans/stage-7d-organs.md
git commit -m "feat(renal): Pulse renal circuit collapsed to one algebraic kidney — TGF + myogenic range, glomerular filtration (GFR 125), pressure natriuresis, angiotensin (PORTED, Apache-2.0)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7d-organs
```

### Task 9: Renal model: UOP (stress/ADH, volume, PEEP, vasopressor, sepsis), diuretics, bladder/urometer, KDIGO

**Files:**
- Create: `packages/engine-core/src/l2/renal/model.ts`
- Test: `packages/engine-core/test/l2/renal/model.test.ts`

**Interfaces:**
- Consumes: Task 8. Produces: `RenalInputs` {map, cvp, iap, coLpm, bvRel, albuminGL, anaesthesia, pawExcessCmH2O, alphaExcess, sepsis, furoCe?}, `RenalParams`, `RenalState` (`rbf`, `gfr`, `ang`, `vNh`, `furoE`, `mannitolG`, `uopMlMin`, `cumMl`, `bagMl`, `bladderMl`, `catheter`, `bins`, `akiStage`, `timeScale`, `p.gfrSet`, `p.weightKg`), `volumeFactor(bvRel)`, `eabv(inp, co0)`, `createRenal(inp, weightKg, aki?)` (calibrated on the healthy reference, settled at `inp`), `stepRenal(s, inp, dt)`, `uopOver(s, minutes)` (mL/kg/h), `giveFurosemide(s, mg)`, `giveMannitolRenal(s, g)`.

- [ ] **Step 1: Write the failing test** — `packages/engine-core/test/l2/renal/model.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { renalHaemo } from '../../../src/l2/renal/kidney.ts';
import { createRenal, giveFurosemide, stepRenal, uopOver, volumeFactor, type RenalInputs, type RenalState } from '../../../src/l2/renal/model.ts';

const W = 70;
const BASE: RenalInputs = { map: 93, cvp: 5, iap: 0, coLpm: 5.6, bvRel: 1, albuminGL: 42, anaesthesia: 'none', pawExcessCmH2O: 0, alphaExcess: 0, sepsis: 0 };
const mlKgH = (s: RenalState) => (s.uopMlMin * 60) / W;
function hold(s: RenalState, inp: RenalInputs, secs: number): RenalState {
  for (let i = 0; i < secs; i++) stepRenal(s, inp, 1);
  return s;
}

describe('kidney (Pulse-ported haemodynamics + tables §5.2 output)', () => {
  it('rest: RBF 17 % of CO, P_gc ≈ 58, GFR ≈ 130, UOP 1.0 mL/kg/h awake, 0.6 under GA', () => {
    const s = createRenal(BASE, W);
    expect(s.rbf).toBeCloseTo(952, -1);
    expect(s.pgc).toBeGreaterThan(55);
    expect(s.pgc).toBeLessThan(60);
    expect(s.gfr).toBeCloseTo(125, 0); // tables/annex 180 L/day
    expect(mlKgH(hold(s, BASE, 600))).toBeCloseTo(1.0, 2);
    const ga = { ...BASE, anaesthesia: 'general' as const };
    expect(mlKgH(hold(createRenal(ga, W), ga, 600))).toBeCloseTo(0.6, 2);
  });
  it('UOP–MAP curve (awake, CVP 5, 30 min per step): 0 at RPP ≤ 50, rising through 65–80, 3× at 150', () => {
    const at = (map: number) => mlKgH(hold(createRenal(BASE, W), { ...BASE, map }, 1800));
    expect(at(50)).toBe(0);
    expect(at(65)).toBeGreaterThan(0.15); // prototype 0.24 — [ENG] regression band on Pulse's curve (decision 8); the tables' linear U is Task 20's it.fails
    expect(at(65)).toBeLessThan(0.4);
    expect(at(80)).toBeGreaterThan(0.6); // prototype 0.76
    expect(at(80)).toBeLessThan(0.9);
    expect(at(150) / at(100)).toBeGreaterThanOrEqual(3 * 0.85); // prototype 3.0 (tables U: 3× at 150 vs 100, ±15 %)
    expect(at(150) / at(100)).toBeLessThanOrEqual(3 * 1.15);
    for (const map of [85, 120, 180]) expect(hold(createRenal(BASE, W), { ...BASE, map }, 1800).rbf / 952).toBeGreaterThan(0.97); // plateau RPP 80–180 (tables)
    expect(hold(createRenal(BASE, W), { ...BASE, map: 180 }, 1800).rbf / 952).toBeLessThan(1.03); // TGF + myogenic
  });
  it('tables §7 check 20: HFrEF MAP 65 / CVP 12 / CO 3.5 → UOP 0.1–0.15; dobutamine (MAP 72, CVP 10, CO +30 %) → 0.2–0.3 within 30–60 min', () => {
    const s = hold(createRenal(BASE, W), { ...BASE, map: 65, cvp: 12, coLpm: 3.5 }, 3600);
    expect(mlKgH(s)).toBeGreaterThanOrEqual(0.1);
    expect(mlKgH(s)).toBeLessThanOrEqual(0.15); // prototype 0.114
    const dobu = { ...BASE, map: 72, cvp: 10, coLpm: 4.55 };
    hold(s, dobu, 1800);
    expect(mlKgH(s)).toBeGreaterThanOrEqual(0.2); // prototype 0.233 at 30 min
    expect(mlKgH(s)).toBeLessThanOrEqual(0.3);
    hold(s, dobu, 1800);
    expect(mlKgH(s)).toBeLessThanOrEqual(0.3); // prototype 0.284 at 60 min (neurohumoral washout τ 45 min)
  });
  it('class III haemorrhage → oliguria < 0.3 (tables 17a); fluids restore > 0.5 by 60 min [ENG band: gradual, washout τ 45 min]', () => {
    const s = hold(createRenal(BASE, W), { ...BASE, map: 65, cvp: 2, coLpm: 3.4, bvRel: 0.65 }, 1800);
    expect(mlKgH(s)).toBeLessThan(0.3); // prototype 0.046
    hold(s, { ...BASE, map: 85, cvp: 6, coLpm: 5.2, bvRel: 0.95 }, 3600);
    expect(mlKgH(s)).toBeGreaterThan(0.5); // prototype 0.533 at 60 min (hourly mean 0.36)
    expect(uopOver(s, 60)).toBeLessThan(mlKgH(s)); // still rising
  });
  it('filtration fraction rises in low flow (angiotensin keeps GFR while RBF falls)', () => {
    const s = hold(createRenal(BASE, W), { ...BASE, map: 70, cvp: 5, coLpm: 4 }, 1800);
    const ff = s.gfr / (0.55 * s.rbf);
    expect(ff).toBeGreaterThan(0.25);
    expect(renalHaemo(93, 5, s.p.k, s.rAff, 1, 1, 42).gfr).toBeGreaterThan(0);
  });
  it('furosemide 40 mg IV: peak 6–9 mL/min at 15–30 min, ≈ 1–1.3 L over 4 h', () => {
    const s = createRenal(BASE, W);
    giveFurosemide(s, 40);
    let tot = 0;
    let peak = 0;
    for (let i = 0; i < 4 * 3600; i++) {
      stepRenal(s, BASE, 1);
      tot += s.uopMlMin / 60;
      peak = Math.max(peak, s.uopMlMin);
    }
    expect(peak).toBeGreaterThan(6);
    expect(peak).toBeLessThan(9);
    expect(tot).toBeGreaterThan(900);
    expect(tot).toBeLessThan(1400);
  });
  it('calibrated on the healthy reference, settled at the start: a patient who starts in shock is oliguric at t = 0 (no NaN)', () => {
    const s = createRenal({ ...BASE, map: 55, cvp: 12, coLpm: 3.5 }, W);
    expect(s.p.gfrSet).toBeCloseTo(125, 0);
    expect(s.gfr).toBe(0);
    expect(s.uopMlMin).toBe(0);
    stepRenal(s, { ...BASE, map: 55, cvp: 12, coLpm: 3.5 }, 1);
    expect(Number.isFinite(s.uopMlMin)).toBe(true);
  });
  it('volume factor V: 0.5 at −15 %, 0.2 at −30 %', () => {
    expect(volumeFactor(0.85)).toBeCloseTo(0.5, 9);
    expect(volumeFactor(0.7)).toBeCloseTo(0.2, 9);
  });
  it('KDIGO: 6 h below 0.5 mL/kg/h → stage 1; teaching compression 12× reaches it in 30 min (Q40)', () => {
    const low = { ...BASE, map: 62 };
    const real = hold(createRenal(BASE, W), low, 6 * 3600 + 700);
    expect(real.akiStage).toBe(1);
    const fast = createRenal(BASE, W);
    fast.timeScale = 12;
    hold(fast, low, 1900);
    expect(fast.akiStage).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/renal/model.test.ts`
Expected: FAIL — Cannot find module `src/l2/renal/model.ts`.

- [ ] **Step 3: Implement `packages/engine-core/src/l2/renal/model.ts`** (exactly as prototyped)

```ts
// SPDX-License-Identifier: Apache-2.0
// Portions derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), src/cpp/engine/common/system/physiology/
// RenalModel.cpp (bladder 1549, furosemide TubularPermeabilityChange 1996–1997), Copyright 2018-2025 Kitware, Inc. and
// Contributors, itself a fork of BioGears 6.1.1, Copyright 2015 Applied Research Associates, Inc.; licensed under the
// Apache License, Version 2.0; modified: re-expressed in TypeScript for a 1 Hz algebraic kidney (NOTICES N-P19).
//
// RenalModel (Stage 7d, tables §5.2): the algebraic kidney (kidney.ts) + tubular output → UOP, bladder/urometer,
// cumulative volume, KDIGO-style oliguria/AKI state and the excretion hooks for 7c. Plain JSON-safe state.
import { angiotensin, effFactor, natriuresis, renalHaemo, tgfTarget } from './kidney.ts';
import {
  AKI_KF_LOSS, ALBUMIN0_G_L, ANG_TAU_S, BLADDER_CAP_ML, FUROSEMIDE_EC50_REF, FUROSEMIDE_ED50_MG, FUROSEMIDE_EMAX, FUROSEMIDE_KA_PER_MIN, FUROSEMIDE_KE_PER_MIN,
  EABV_EXP, MANNITOL_KE_PER_MIN, P_BOWMAN, RENAL_REF_CO_L_KG, RENAL_REF_CVP, RENAL_REF_MAP, MANNITOL_ML_PER_G, NE_EXCESS_PER_01, NH_TAU_OFF_S, NH_TAU_ON_S, OLIGURIA_ML_KG_H, PEEP_PER_10, R_AFF, RENAL_FLOW_FRAC, S_GA,
  SEPSIS_GFR_LOSS, TGF_TAU_S, UOP0_ML_KG_H, V_AT_15, V_AT_30,
} from './params.ts';

export interface RenalInputs {
  map: number; // mmHg (renal arterial ≈ aortic mean)
  cvp: number; // mmHg
  iap: number; // intra-abdominal pressure, mmHg (tables `iap` 5)
  coLpm: number; // cardiac output, L/min
  bvRel: number; // blood volume ÷ the profile's (1 = normovolaemic)
  albuminGL: number;
  anaesthesia: 'none' | 'general' | 'neuraxial';
  pawExcessCmH2O: number; // mean airway pressure above 10 cmH2O (0 when not ventilated)
  alphaExcess: number; // α-agonist µg/kg/min above what the MAP needs (7g/7a; 0 until then)
  sepsis: number; // 0–1 (7e's sepsis stage, organs/inputs.ts)
  /** 7g's furosemide effect-site level in reference doses (1 = the peak of 20 mg); absent → the model's own depot (no 7g). */
  furoCe?: number;
}
export interface RenalParams { k: number; pRef: number; ef0: number; weightKg: number; gfrSet: number; aki: number; co0: number }
export interface RenalState {
  t: number;
  p: RenalParams;
  rAff: number;
  furoDepot: number; furoE: number; // mg in the depot; effect 0–1 (Bateman through an effect compartment)
  furoPlasma: number;
  vNh: number; // neurohumoral (ADH/aldosterone) volume factor: follows volumeFactor(eabv) with a fast onset, slow washout
  mannitolG: number; // g in plasma
  rbf: number; pgc: number; gfr: number; uopMlMin: number; ang: number;
  cumMl: number; bladderMl: number; bagMl: number; catheter: 'foley' | 'none';
  bins: number[]; // urine per 10 min, newest last, 24 h (144 bins)
  binAcc: number; binT: number;
  oliguriaS: number; // time the rolling 1 h UOP has been < 0.5 mL/kg/h
  akiStage: 0 | 1 | 2 | 3;
  timeScale: number; // KDIGO windows ÷ timeScale (teaching compression, Q40; 1 = real time)
}

/** Volume factor V (tables §5.2): 1 at normovolaemia, 0.5 at −15 %, 0.2 at −30 %, floor 0.1. */
export function volumeFactor(bvRel: number): number {
  const loss = 1 - bvRel;
  if (loss <= 0) return 1;
  if (loss <= 0.15) return 1 - ((1 - V_AT_15) * loss) / 0.15;
  return Math.max(0.1, V_AT_15 - ((V_AT_15 - V_AT_30) * (loss - 0.15)) / 0.15);
}

/** Effective arterial blood volume (0–1+) [ENG]: the smaller of the blood volume and (CO/CO0)^0.75 — a low-output state
 *  activates the same volume receptors as bleeding (tables §7 check 20: HFrEF oliguria at normal blood volume). The
 *  volume factor V acts through `vNh`, which follows V(eabv) with onset τ 2 min and washout τ 45 min (NH_TAU_*). */
export function eabv(inp: RenalInputs, co0: number): number {
  return Math.min(inp.bvRel, (Math.max(0, inp.coLpm) / Math.max(0.1, co0)) ** EABV_EXP);
}

function pv(inp: RenalInputs): number {
  return Math.max(inp.cvp, inp.iap);
}

/**
 * The kidney is calibrated on the HEALTHY reference (MAP 93, CVP 5, CO 0.08 L/min/kg: tables `UOP0` 1.0 mL/kg/h, RBF
 * 17 % of CO), never on the start state — a profile that starts in shock or HFrEF must start oliguric, not "normal"
 * (a start GFR of 0 also made the set point 0 and UOP NaN) — and then SETTLED at the start inputs (TGF, angiotensin
 * and the neurohumoral factor at their steady state).
 */
export function createRenal(inp: RenalInputs, weightKg: number, aki = 0): RenalState {
  const co0 = RENAL_REF_CO_L_KG * weightKg;
  const rbf0 = RENAL_FLOW_FRAC * co0 * 1000;
  const k0 = renalHaemo(RENAL_REF_MAP, RENAL_REF_CVP, 1, R_AFF, 1, 1, ALBUMIN0_G_L).rbf / rbf0; // Pulse's TuneCircuit idea
  const h0 = renalHaemo(RENAL_REF_MAP, RENAL_REF_CVP, k0, R_AFF, 1, 1, ALBUMIN0_G_L);
  const ef0 = (UOP0_ML_KG_H * weightKg) / 60 / h0.gfr;
  const s: RenalState = {
    t: 0, p: { k: k0, pRef: RENAL_REF_MAP, ef0, weightKg, gfrSet: h0.gfr, aki, co0: Math.max(co0, inp.coLpm) }, rAff: R_AFF, furoDepot: 0, furoE: 0, furoPlasma: 0, mannitolG: 0,
    vNh: 1, rbf: h0.rbf, pgc: h0.pgc, gfr: h0.gfr, uopMlMin: 0, ang: 0, cumMl: 0, bladderMl: 0, bagMl: 0, catheter: 'foley',
    bins: [], binAcc: 0, binT: 0, oliguriaS: 0, akiStage: 0, timeScale: 1,
  };
  // settle at the start inputs: controllers at their targets
  const pvn = pv(inp);
  const ev = eabv(inp, s.p.co0);
  s.ang = angiotensin(inp.map - pvn, ev);
  s.vNh = volumeFactor(ev);
  const kfF = (1 - SEPSIS_GFR_LOSS * inp.sepsis) * (1 - AKI_KF_LOSS * aki);
  const pb = Math.max(P_BOWMAN, inp.iap);
  s.rAff = tgfTarget(inp.map, pvn, k0, effFactor(s.ang), kfF, inp.albuminGL, s.p.gfrSet, pb);
  const h = renalHaemo(inp.map, pvn, k0, s.rAff, effFactor(s.ang), kfF, inp.albuminGL, pb);
  s.rbf = h.rbf;
  s.pgc = h.pgc;
  s.gfr = h.gfr;
  s.uopMlMin = tubularOutput(s, inp);
  return s;
}

function tubularOutput(s: RenalState, inp: RenalInputs): number {
  const stress = inp.anaesthesia === 'general' ? S_GA : 1;
  const peep = PEEP_PER_10 ** (Math.max(0, inp.pawExcessCmH2O) / 10);
  const ne = NE_EXCESS_PER_01 ** (Math.max(0, inp.alphaExcess) / 0.1);
  const fe = s.p.ef0 * natriuresis(inp.map, s.p.pRef) * stress * s.vNh * peep * ne * (1 + FUROSEMIDE_EMAX * s.furoE);
  const mannitol = MANNITOL_ML_PER_G * MANNITOL_KE_PER_MIN * s.mannitolG * Math.min(1, s.gfr / Math.max(1, s.p.gfrSet));
  return Math.min(0.25 * s.gfr, s.gfr * fe) + mannitol;
}

/** Rolling urine output over the last `minutes` (≤ 1440), mL/kg/h. */
export function uopOver(s: RenalState, minutes: number): number {
  const n = Math.max(1, Math.round(minutes / 10));
  const bins = s.bins.slice(-n);
  if (bins.length === 0) return (s.uopMlMin * 60) / s.p.weightKg;
  const mins = bins.length * 10;
  return (bins.reduce((a, b) => a + b, 0) / mins) * (60 / s.p.weightKg);
}

export function stepRenal(s: RenalState, inp: RenalInputs, dt: number): void {
  s.t += dt;
  const pvn = pv(inp);
  const rpp = inp.map - pvn;
  const ev = eabv(inp, s.p.co0);
  s.ang += (angiotensin(rpp, ev) - s.ang) * (1 - Math.exp(-dt / ANG_TAU_S)); // AngII acts over minutes
  const vT = volumeFactor(ev);
  s.vNh += (vT - s.vNh) * (1 - Math.exp(-dt / (vT < s.vNh ? NH_TAU_ON_S : NH_TAU_OFF_S)));
  const effF = effFactor(s.ang);
  const kfF = (1 - SEPSIS_GFR_LOSS * inp.sepsis) * (1 - AKI_KF_LOSS * s.p.aki);
  const pb = Math.max(P_BOWMAN, inp.iap);
  const target = tgfTarget(inp.map, pvn, s.p.k, effF, kfF, inp.albuminGL, s.p.gfrSet, pb);
  s.rAff += (target - s.rAff) * (1 - Math.exp(-dt / TGF_TAU_S));
  const h = renalHaemo(inp.map, pvn, s.p.k, s.rAff, effF, kfF, inp.albuminGL, pb);
  s.rbf = h.rbf;
  s.pgc = h.pgc;
  s.gfr = h.gfr;
  // furosemide: depot → plasma (ka) → elimination (ke); effect E = Cp/(Cp + ED50-equivalent)
  const m = dt / 60;
  const moved = s.furoDepot * (1 - Math.exp(-FUROSEMIDE_KA_PER_MIN * m));
  s.furoDepot -= moved;
  s.furoPlasma = s.furoPlasma * Math.exp(-FUROSEMIDE_KE_PER_MIN * m) + moved;
  s.furoE = inp.furoCe !== undefined ? inp.furoCe / (inp.furoCe + FUROSEMIDE_EC50_REF) : s.furoPlasma / (s.furoPlasma + FUROSEMIDE_ED50_MG);
  s.mannitolG *= Math.exp(-MANNITOL_KE_PER_MIN * m * Math.min(1, s.gfr / Math.max(1, s.p.gfrSet)));
  s.uopMlMin = tubularOutput(s, inp);
  const ml = s.uopMlMin * m;
  s.cumMl += ml;
  if (s.catheter === 'foley') s.bagMl += ml;
  else {
    s.bladderMl += ml;
    if (s.bladderMl >= BLADDER_CAP_ML) s.bladderMl = 0; // auto-void (Pulse)
  }
  s.binAcc += ml;
  s.binT += dt;
  if (s.binT >= 600 - 1e-9) {
    s.bins.push(s.binAcc);
    if (s.bins.length > 144) s.bins.shift();
    s.binAcc = 0;
    s.binT = 0;
  }
  // KDIGO UOP criteria on real (or teaching-compressed) windows (tables alarm row; Q40)
  const hourly = s.bins.length >= Math.max(1, Math.round(6 / s.timeScale)) ? uopOver(s, 60 / s.timeScale) : (s.uopMlMin * 60) / s.p.weightKg;
  s.oliguriaS = hourly < OLIGURIA_ML_KG_H ? s.oliguriaS + dt : 0;
  const hrs = (s.oliguriaS / 3600) * s.timeScale;
  const stage = hrs >= 24 || (hrs >= 12 && hourly < 0.05) ? 3 : hrs >= 12 ? 2 : hrs >= 6 ? 1 : 0;
  if (stage > s.akiStage) s.akiStage = stage;
}

export function giveFurosemide(s: RenalState, mg: number): void {
  s.furoDepot += mg;
}
export function giveMannitolRenal(s: RenalState, g: number): void {
  s.mannitolG += g;
}
```

- [ ] **Step 4: Run the tests and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/renal/model.test.ts && npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck`
Expected: PASS (9 tests; the prototype numbers are quoted in the test comments); typecheck clean.

- [ ] **Step 5: Commit and push**

```bash
git add packages/engine-core/src/l2/renal/model.ts packages/engine-core/test/l2/renal/model.test.ts docs/plans/stage-7d-organs.md
git commit -m "feat(renal): UOP with stress/effective-volume (neurohumoral lag)/PEEP/α/sepsis terms, healthy-reference calibration, furosemide and mannitol, urometer, KDIGO (check 20 and class III at model level)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7d-organs
```

### Task 10: Liver and metabolism: hepatic flow (7c's or fallback), lactate clearance (Cori), temperature, liver/glucose factor, hepatic failure

**Files:**
- Create: `packages/engine-core/src/l2/liver/liver.ts`
- Test: `packages/engine-core/test/l2/liver/liver.test.ts`

**Interfaces:**
- Consumes: 7a's `ICRP89_FLOW_FRACTIONS_M` (`l2/circ/params.ts`, NOTICES N-P10).
- Produces: `LiverInputs` {coLpm, co0Lpm, bvRel, alphaE, volatileMac, tempC, gfrRel, do2MlKgMin, hbfRel?}, `LiverState` {hbfRel, liverFn, tempF, glucoseF, kLacPerH, lactate, inr, failure, weightKg}, `createLiver(weightKg, inp, failure?)`, `stepLiver(s, inp, dt, prodMmolH?)`, `stepLactatePool(l, prod, k, vL, dtS)`, `hbfFactor(inp)`, `lacProdBasal()`, constants `K_LAC0_PER_H`, `HBF_FRAC` (= 0.255). (The well-stirred clearance of the first draft is gone: 7g computes drug clearance from 7c's `hbfRel` and the `blood.core.liver` function 7d writes; N-P11 is therefore not used.)

- [ ] **Step 1: Write the failing test** — `packages/engine-core/test/l2/liver/liver.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { createLiver, HBF_FRAC, stepLactatePool, stepLiver, type LiverInputs } from '../../../src/l2/liver/liver.ts';

const BASE: LiverInputs = { coLpm: 5.6, co0Lpm: 5.6, bvRel: 1, alphaE: 0, volatileMac: 0, tempC: 37, gfrRel: 1, do2MlKgMin: 15 };
function halfLife(inp: LiverInputs, failure = 0): number {
  const l = createLiver(70, inp, failure);
  const ss = 1400 / 24 / (0.6 * 70 * l.kLacPerH);
  l.lactate = 5;
  let t = 0;
  while (l.lactate - ss > (5 - ss) / 2) {
    stepLiver(l, inp, 1);
    t++;
  }
  return t / 60;
}

describe('liver and lactate (tables §5.3)', () => {
  it('rest: lactate 1.0, hepatic flow share 0.255 (ICRP-89, N-P10), kLac 1.4/h, glucose factor 1', () => {
    const l = createLiver(70, BASE);
    expect(l.lactate).toBeCloseTo(0.99, 2);
    expect(HBF_FRAC).toBe(0.255);
    expect(l.hbfRel).toBe(1);
    expect(l.kLacPerH).toBeCloseTo(1.4, 6);
    expect(l.glucoseF).toBe(1);
    expect(createLiver(70, BASE, 1).glucoseF).toBeCloseTo(0.3, 9); // hepatic failure → 7e's EGP × 0.3
  });
  it('lactate clearance t½ ≈ 30 min normal; longer with low hepatic flow, hypothermia and liver failure', () => {
    expect(halfLife(BASE)).toBeCloseTo(29.7, 0);
    expect(halfLife({ ...BASE, coLpm: 3.4, bvRel: 0.65 })).toBeGreaterThan(40); // prototype 48
    expect(halfLife({ ...BASE, tempC: 33 })).toBeGreaterThan(35); // prototype 39
    expect(halfLife(BASE, 1)).toBeGreaterThan(45); // prototype 51
  });
  it('the pool integrates exactly (steady state and exponential approach)', () => {
    expect(stepLactatePool(1, 58.33, 1.4, 42, 1e6)).toBeCloseTo(58.33 / (42 * 1.4), 6);
    expect(stepLactatePool(5, 0, 1.4, 42, 3600)).toBeCloseTo(5 * Math.exp(-1.4), 6);
  });
  it('hepatic flow: 7c\'s hbfRel wins when present (never multiplied twice); the fallback falls with CO and splanchnic constriction', () => {
    expect(createLiver(70, { ...BASE, coLpm: 3.4, bvRel: 0.7 }).hbfRel).toBeCloseTo((3.4 / 5.6) * 0.6, 9);
    expect(createLiver(70, { ...BASE, coLpm: 3.4, bvRel: 0.7, hbfRel: 0.8 }).hbfRel).toBe(0.8);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/liver/liver.test.ts`
Expected: FAIL — Cannot find module `src/l2/liver/liver.ts`.

- [ ] **Step 3: Implement `packages/engine-core/src/l2/liver/liver.ts`** (exactly as prototyped)

```ts
// Stage 7d liver and metabolism (tables §5.3; annex B2 "Hepatic (what exists)"). Pulse has NO hepatic model, so this
// is ours, except the hepatic flow share (ICRP-89 via Pulse, NOTICES N-P10, imported from circ/params.ts). Hepatic
// FLOW is 7c's `blood.out.hbfRel` when 7c is present (R51 addendum 14); the CO-based flow below is the fallback.
// Drug clearance is 7g's (it reads 7c's hbfRel and the liver function 7d writes into `blood.core.liver`).
// Plain JSON-safe state, stepped at 1 Hz.
import { ICRP89_FLOW_FRACTIONS_M } from '../circ/params.ts';

export const HBF_FRAC = ICRP89_FLOW_FRACTIONS_M.liver; // 0.255 of CO (tables `hbfFrac` 0.25, range 0.2–0.3)
export const K_LAC0_PER_H = 1.4; // tables `kLac` [ENG] (t½ ≈ 30 min), Q41
export const LAC_SPLIT = { liver: 0.6, kidney: 0.3, other: 0.1 } as const; // tables clearance split [TXT]
export const LAC_PROD0_MMOL_DAY = 1400; // tables `lacProd0` [TXT] (Pulse 1.3 mol/day)
export const V_LAC_L_KG = 0.6; // tables `vLac` [ENG]
export const CLEAR_TEMP_PER_C = 0.1; // tables `clearTemp` −10 %/°C below 37 [TXT]
/** liver function × (1 − 0.7·severity): the LIVER share of lactate clearance ×0.3 at severity 1 [DEVIATION: tables
 *  `kLac` row says "×0.3 in liver failure" on the whole kLac, its clearance-split row scales by organ; the split row is
 *  applied so failure does not stop renal/other clearance: kLac 1.4 → 0.81/h, t½ 51 min (whole-kLac ×0.3 would be 99 min). Q41] */
export const HEPATIC_FAILURE_LOSS = 0.7;
export const SPLANCHNIC_GAIN = 0.4; // hbfFactor ×0.6 at full sympathetic splanchnic constriction (tables `hbfFactor`)
export const VOLATILE_HBF_PER_MAC = 0.2; // ×0.8 at 1 MAC volatile (tables `hbfFactor`)
export const DO2_CRIT = 6; // mL/kg/min, tables `do2Crit` (Q42) — fallback lactate production only
export const K_ANAER = 0.03; // mmol lactate per mL O2 deficit, tables `kAnaer` (Q41) — fallback only

export interface LiverInputs {
  coLpm: number; co0Lpm: number;
  bvRel: number; // blood volume ÷ baseline (sympathetic splanchnic constriction below 0.9)
  alphaE: number; // 0–1 α-agonist effect (7g); 0 until then
  volatileMac: number;
  tempC: number;
  gfrRel: number; // kidney's GFR ÷ its set point (renal share of lactate clearance)
  hbfRel?: number; // 7c's `blood.out.hbfRel` (7c owns hepatic flow); absent → CO × hbfFactor (fallback)
  do2MlKgMin: number; // global O2 delivery (fallback lactate production when 7c is absent)
}
export interface LiverState {
  t: number;
  weightKg: number;
  failure: number; // 0–1 hepatic failure condition
  hbfRel: number; liverFn: number; tempF: number;
  glucoseF: number; // published for 7e (`organs.liver.glucoseF`): hepatic glucose output factor = liver function
  kLacPerH: number; // whole-body lactate clearance rate constant
  lactate: number; // mmol/L — the FALLBACK pool (7c's pool is authoritative when present)
  inr: number; // coagulopathy placeholder (not used by any model in 7d)
}

export function createLiver(weightKg: number, inp: LiverInputs, failure = 0): LiverState {
  const s: LiverState = {
    t: 0, weightKg, failure, hbfRel: 1, liverFn: 1, tempF: 1, glucoseF: 1, kLacPerH: K_LAC0_PER_H, lactate: 1, inr: 1,
  };
  update(s, inp);
  s.lactate = lactateSteady(s);
  return s;
}

/** Splanchnic/hepatic flow factor: sympathetic constriction with volume loss (full at −30 %) or α-agonists, volatile ×0.8/MAC. */
export function hbfFactor(inp: LiverInputs): number {
  const symp = Math.min(1, Math.max(inp.alphaE, (1 - inp.bvRel) / 0.3));
  return (1 - SPLANCHNIC_GAIN * symp) * Math.max(0.5, 1 - VOLATILE_HBF_PER_MAC * inp.volatileMac);
}

function update(s: LiverState, inp: LiverInputs): void {
  const coRel = Math.max(0, inp.coLpm) / Math.max(0.1, inp.co0Lpm);
  s.hbfRel = inp.hbfRel ?? coRel * hbfFactor(inp);
  s.liverFn = 1 - HEPATIC_FAILURE_LOSS * s.failure;
  s.glucoseF = s.liverFn;
  s.tempF = Math.max(0.3, 1 - CLEAR_TEMP_PER_C * Math.max(0, 37 - inp.tempC));
  const liverPart = LAC_SPLIT.liver * Math.min(1.5, s.hbfRel) * s.liverFn * s.tempF;
  s.kLacPerH = K_LAC0_PER_H * (liverPart + LAC_SPLIT.kidney * Math.min(1.5, inp.gfrRel) + LAC_SPLIT.other);
  s.inr = 1 + 2 * s.failure;
}

/** Basal lactate production, mmol/h. */
export const lacProdBasal = (): number => LAC_PROD0_MMOL_DAY / 24;
function lactateSteady(s: LiverState): number {
  return lacProdBasal() / (V_LAC_L_KG * s.weightKg * s.kLacPerH);
}

/** One-compartment lactate pool (mmol/L): dL/dt = P/V − k·L; exact over dt for constant P and k. */
export function stepLactatePool(l: number, prodMmolH: number, kPerH: number, vL: number, dtS: number): number {
  const ss = prodMmolH / (vL * kPerH);
  return ss + (l - ss) * Math.exp(-(kPerH * dtS) / 3600);
}

/** Step at dt s. `prodMmolH` overrides the fallback production (pass undefined to use basal + global O2 debt). */
export function stepLiver(s: LiverState, inp: LiverInputs, dt: number, prodMmolH?: number): void {
  s.t += dt;
  update(s, inp);
  const debt = Math.max(0, DO2_CRIT - inp.do2MlKgMin) * s.weightKg * 60; // mL O2/h below critical delivery
  const prod = prodMmolH ?? lacProdBasal() + K_ANAER * debt;
  s.lactate = stepLactatePool(s.lactate, prod, s.kLacPerH, V_LAC_L_KG * s.weightKg, dt);
}
```

- [ ] **Step 4: Run the tests and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/liver/liver.test.ts && npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck`
Expected: PASS (4 tests; the prototype numbers are quoted in the test comments); typecheck clean.

- [ ] **Step 5: Commit and push**

```bash
git add packages/engine-core/src/l2/liver/liver.ts packages/engine-core/test/l2/liver/liver.test.ts docs/plans/stage-7d-organs.md
git commit -m "feat(liver): hepatic flow (7c's hbfRel or the CO fallback), lactate clearance t½ 30 min with flow/temperature/failure, liver and glucose factors

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7d-organs
```

### Task 11: Organ pipeline — state, 10 Hz / 125 Hz / 1 Hz steps, commands, `organs` event, numerics, 7c seams, effects

**Files:**
- Create: `packages/engine-core/src/l2/organs/effects.ts`, `packages/engine-core/src/l2/organs/pipeline.ts`
- Test: `packages/engine-core/test/l2/organs/effects.test.ts`, `packages/engine-core/test/l2/organs/pipeline.test.ts`

**Interfaces:**
- Consumes: Tasks 2–10.
- Produces (Task 12 wires these into the engine):
  - `ICP_RATE = 125`, `ORGAN_CHANNELS = ['icp']`, `type OrganChannel`
  - `interface OrgansState { k; m; weightKg; conds; co0; brain; renal; liver; kidney: { gfrRel }; iap; lp: { map, cvp }; sensors: {icp, pbto2, urometer}; beats; num; view; fx: EffectsState; out: EngineEvent[] }` — `kidney.gfrRel` and `liver.glucoseF` are the PUBLISHED keys (7g, 7e)
  - `interface OrgansCtx extends OrganSources { rhythm: RhythmView; hrNow(t): number; setHr(bpm, t): void }` (`OrganSources` from Task 2: l1, hemo, resp, blood?, pk?, neuro?, endo?)
  - `createOrgansState(profile, l1)`, `rebaselineOrgans(os, ctx: OrganSources)`, `advanceOrgans(os, ctx, mEnd, write)` (observes `pk.bus.doses` once per call), `validateOrgansCommand(cmd): string | undefined | null` (null = not ours; never a drug), `applyOrgansCommand(os, cmd, t): boolean`, `organChannelActive(os, ch)`
  - `effects.ts`: `EffectsState`, `createEffects()`, `applyOrganEffects(e, brain, ctx, t)`, `SBP_SHARE` 1.3, `DBP_SHARE` 0.85, `CUSH_SVR_GAIN` 1.2

- [ ] **Step 1: Write the failing effects test** — `packages/engine-core/test/l2/organs/effects.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { createL1State } from '../../../src/l1/state.ts';
import { NO_DRUGS } from '../../../src/l2/brain/flow.ts';
import { brainParams, createBrain } from '../../../src/l2/brain/model.ts';
import { createHemoState } from '../../../src/l2/hemo/pipeline.ts';
import { applyOrganEffects, createEffects } from '../../../src/l2/organs/effects.ts';
import { createRespState } from '../../../src/l2/resp/pipeline.ts';

describe('brain → body effects (decision 4)', () => {
  it('MANUAL: the surge rides on the coupled pressures idempotently, HR follows, and both are undone', () => {
    const l1 = createL1State();
    const hemo = createHemoState(undefined, l1, 80);
    const resp = createRespState(undefined, l1, 1);
    const b = createBrain(brainParams(), { map: 90, cvp: 6, paco2: 40, pao2: 100, sao2: 0.97, hb: 14, tempC: 37, drugs: NO_DRUGS });
    let hr = 80;
    const ctx = { l1, hemo, resp, hrNow: () => hr, setHr: (x: number) => { hr = x; } };
    const e = createEffects();
    b.cush.drive = 1;
    applyOrganEffects(e, b, ctx, 1);
    applyOrganEffects(e, b, ctx, 1.1); // twice: no double counting
    expect(l1.coupled?.sbp).toBeCloseTo(120 + 1.3 * 40, 6); // CUSH_DMAP 40 at full drive
    expect(l1.coupled?.dbp).toBeCloseTo(80 + 0.85 * 40, 6);
    expect(hr).toBeCloseTo(48, 6);
    expect((resp.driver as { ataxia?: number }).ataxia).toBe(1);
    b.cush.drive = 0;
    applyOrganEffects(e, b, ctx, 2);
    expect(l1.coupled?.sbp).toBeUndefined();
    expect(hr).toBe(80);
    expect((resp.driver as { ataxia?: number }).ataxia).toBe(0);
  });
  it('MODELED: the surge goes into 7a\'s circ.ext.rSysF (R48) even though ext has no such key yet (addendum 14); HR is the baroreflex\'s', () => {
    const l1 = createL1State();
    l1.mode = 'modeled';
    const hemo = createHemoState(undefined, l1, 80);
    const resp = createRespState(undefined, l1, 1);
    const b = createBrain(brainParams(), { map: 90, cvp: 6, paco2: 40, pao2: 100, sao2: 0.97, hb: 14, tempC: 37, drugs: NO_DRUGS });
    const ext = hemo.circ.ext;
    expect(ext.rSysF).toBeUndefined(); // 7a's initialiser omits the optional key
    b.cush.drive = 1;
    applyOrganEffects(createEffects(), b, { l1, hemo, resp, hrNow: () => 80, setHr: () => {} }, 1);
    expect(ext.rSysF).toBeCloseTo(2.2, 9);
    expect(ext.hrF).toBeUndefined();
    l1.mode = 'manual';
    b.cush.drive = 0;
    applyOrganEffects(createEffects(), b, { l1, hemo, resp, hrNow: () => 80, setHr: () => {} }, 2);
    expect(ext.rSysF).toBeUndefined(); // neutral again in MANUAL
    expect(l1.coupled?.sbp).toBeUndefined();
  });
});
```

- [ ] **Step 2: Write the failing pipeline test** — `packages/engine-core/test/l2/organs/pipeline.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { createL1State } from '../../../src/l1/state.ts';
import { createHemoState } from '../../../src/l2/hemo/pipeline.ts';
import { advanceOrgans, applyOrgansCommand, createOrgansState, rebaselineOrgans, validateOrgansCommand } from '../../../src/l2/organs/pipeline.ts';
import { createRespState } from '../../../src/l2/resp/pipeline.ts';
import type { Command, EngineEvent } from '../../../src/types.ts';

function setup() {
  const l1 = createL1State();
  const hemo = createHemoState(undefined, l1, 75);
  const resp = createRespState(undefined, l1, 1);
  const os = createOrgansState({ weightKg: 70 }, l1);
  let hr = 75;
  const ctx = { l1, hemo, resp, rhythm: { id: 'sinus', records: [] as EngineEvent[] }, hrNow: () => hr, setHr: (x: number) => { hr = x; } };
  rebaselineOrgans(os, ctx);
  return { os, ctx };
}
const cmd = (body: Record<string, unknown>) => ({ id: 'x', issuedBy: 't', ...body }) as Command;

describe('organ pipeline', () => {
  it('steps at 10 Hz / 1 Hz, writes icp only while the sensor is on, emits organs + measurement each second', () => {
    const { os, ctx } = setup();
    const icp: number[] = [];
    advanceOrgans(os, ctx, 125 * 3, (_ch, _m, v) => icp.push(v));
    expect(icp).toHaveLength(0);
    applyOrgansCommand(os, cmd({ type: 'attachSensor', sensor: 'icp', state: 'on' }), 3);
    advanceOrgans(os, ctx, 125 * 6, (_ch, _m, v) => icp.push(v));
    expect(icp.length).toBe(375);
    const organs = os.out.filter((e) => e.type === 'organs');
    expect(organs.length).toBe(6);
    const last = organs[organs.length - 1] as Extract<EngineEvent, { type: 'organs' }>;
    expect(last.brain.icp).toBeCloseTo(10, 0);
    expect(last.kidney.gfr).toBeGreaterThan(100);
    expect(last.liver.lactate).toBeCloseTo(1, 0);
    expect(os.kidney.gfrRel).toBeCloseTo(1, 2); // published for 7g
    expect(os.liver.glucoseF).toBe(1); // published for 7e
    const meas = os.out.filter((e) => e.type === 'measurement') as Extract<EngineEvent, { type: 'measurement' }>[];
    expect(meas[meas.length - 1]?.values.icpMean?.value).toBeCloseTo(10, 0);
  });
  it('commands: ownership (null for other stages), validation, and effects', () => {
    const { os } = setup();
    expect(validateOrgansCommand(cmd({ type: 'applyEvent', event: { kind: 'airway', state: 'apnoea' } }))).toBeNull();
    for (const drugId of ['propofol', 'mannitol', 'hypertonicSaline', 'furosemide']) {
      expect(validateOrgansCommand(cmd({ type: 'applyEvent', event: { kind: 'drug', drugId, dose: 1, unit: 'mg', route: 'iv' } }))).toBeNull(); // 7g's (R51 §3)
    }
    expect(validateOrgansCommand(cmd({ type: 'applyEvent', event: { kind: 'condition', id: 'mh', severity: 1 } }))).toBeNull();
    expect(validateOrgansCommand(cmd({ type: 'attachSensor', sensor: 'abp', state: 'connected' }))).toBeNull();
    expect(validateOrgansCommand(cmd({ type: 'applyEvent', event: { kind: 'position', headUpDeg: 120 } }))).toMatch(/0–90/);
    expect(validateOrgansCommand(cmd({ type: 'applyEvent', event: { kind: 'renal', timeScale: 50 } }))).toMatch(/1–24/);
    expect(validateOrgansCommand(cmd({ type: 'applyEvent', event: { kind: 'brain', massRateMlPerMin: 1 } }))).toBeUndefined();
    applyOrgansCommand(os, cmd({ type: 'applyEvent', event: { kind: 'brain', massRateMlPerMin: 1, oedemaMl: 5 } }), 1);
    expect(os.brain.massRate).toBe(1);
    expect(os.brain.oedema).toBe(5);
    applyOrgansCommand(os, cmd({ type: 'applyEvent', event: { kind: 'condition', id: 'tbi', severity: 1 } }), 1);
    expect(os.brain.p.pvi).toBe(20);
    applyOrgansCommand(os, cmd({ type: 'applyEvent', event: { kind: 'condition', id: 'hepaticFailure', severity: 1 } }), 1);
    expect(os.liver.failure).toBe(1);
  });
  it('observes 7g\'s bus.doses once per pass: mannitol (mg) → brain + kidney; HTS (mL, concentrationPct) → brain; others ignored', () => {
    const { os, ctx } = setup();
    const doses = [
      { agent: 'mannitol', mgPerKg: 1000, amount: 70_000, amountUnit: 'mg', t: 0.5 },
      { agent: 'hypertonicSaline', mgPerKg: null, amount: 30, amountUnit: 'mL', concentrationPct: 23.4, t: 0.5 },
      { agent: 'propofol', mgPerKg: 2, amount: 140, amountUnit: 'mg', t: 0.5 },
    ];
    const pk = { bus: { doses, cns: { cmro2Mult: 1, cbfVaso: 1 } } };
    advanceOrgans(os, { ...ctx, pk }, 125 * 1, () => {});
    expect(os.brain.osm.map((d) => Math.round(d.mosm))).toEqual([384, 240]); // 70 g × 5.49; 7.02 g NaCl × 34.2
    expect(os.renal.mannitolG).toBeCloseTo(70, 1); // minus 1 s of renal elimination
    pk.bus.doses = []; // 7g clears the log for the next pass
    advanceOrgans(os, { ...ctx, pk }, 125 * 2, () => {});
    expect(os.brain.osm).toHaveLength(2);
  });
  it('furosemide acts through 7g\'s effect-site level (no 7d depot): 1.5 × the 20 mg reference → UOP ×≈7', () => {
    const { os, ctx } = setup();
    const u0 = os.renal.uopMlMin;
    advanceOrgans(os, { ...ctx, pk: { bus: { agents: { furosemide: { brain: 1.5 } } } } }, 125 * 3, () => {});
    expect(os.renal.furoE).toBeCloseTo(0.6, 6);
    expect(os.renal.uopMlMin / u0).toBeGreaterThan(5);
  });
  it('7c present: writes liver function × temperature and the renal seam {uopMlH, excretion mmol/h}; reports 7c\'s lactate', () => {
    const { os, ctx } = setup();
    const blood = { core: { liver: 1 } as Record<string, unknown>, out: { hb: 14, albuminGL: 42, bvRel: 1, hbfRel: 1, lactate: 2.5, gluconate: 1 } };
    advanceOrgans(os, { ...ctx, blood }, 125 * 2, () => {});
    expect(blood.core.liver).toBeCloseTo(os.liver.liverFn * os.liver.tempF, 9);
    const seam = blood.core.renal as { uopMlH: number; excretion: { k: number; na: number; cl: number; gluconate: number } };
    expect(seam.uopMlH).toBeCloseTo(70, -1); // 1 mL/kg/h × 70 kg
    expect(seam.excretion.na).toBeCloseTo((seam.uopMlH / 1000) * 100, 6);
    expect(seam.excretion.gluconate).toBeGreaterThan(5); // GFR 7.5 L/h × 1 mmol/L × 0.9
    const ev = os.out.filter((e) => e.type === 'organs').pop() as Extract<EngineEvent, { type: 'organs' }>;
    expect(ev.liver.lactate).toBe(2.5);
  });
});
```

- [ ] **Step 3: Run both to verify they fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/organs/effects.test.ts test/l2/organs/pipeline.test.ts`
Expected: FAIL — cannot find `src/l2/organs/effects.ts` / `pipeline.ts`.

- [ ] **Step 4: Implement `packages/engine-core/src/l2/organs/effects.ts`**

```ts
// Stage 7d: the brain's effects on the rest of the body (plan decision 4) — the Cushing surge and bradycardia, and
// ataxic breathing. MANUAL: L1 `coupled` sbp/dbp (+1.3/+0.85 × ΔMAP, the widened pulse pressure; MAP = dbp +
// (sbp − dbp)/3 rises by exactly ΔMAP) and an HR request on the instructor's rate. MODELED: 7a's `circ.ext.rSysF` /
// `hrF` (R48; on main since 7a), so the circulation and its baroreflex produce the response.
import { l1Target, type L1State } from '../../l1/state.ts';
import { cushingDMap, cushingHrFactor } from '../brain/cushing.ts';
import type { BrainState } from '../brain/model.ts';
import type { HemoState } from '../hemo/pipeline.ts';
import type { RespState } from '../resp/pipeline.ts';
import { circExt } from './inputs.ts';

export const SBP_SHARE = 1.3;
export const DBP_SHARE = 0.85;
/** MODELED: SVR × (1 + 1.2·drive) [ENG, prototype on 7a+7b+7g, TBI, massMl 28]: MAP 97 → 133 (+36) and HR 73 → 53
 *  (−27 %) from the baroreflex alone (tables: MAP +30–50, HR −20–40 %). Gain 0.8 gave +27; adding a direct HR factor
 *  (ext.hrF = 0.6) on top gave HR 40 and cancelled most of the rise (+11), so 7d leaves `ext.hrF` at 1. */
export const CUSH_SVR_GAIN = 1.2;

export interface EffectsState {
  dMap: number; // ΔMAP last written
  sbp: number | null; // the exact coupled values last written (idempotence against Stage 3's own writes)
  dbp: number | null;
  hrBase: number | null; // the instructor's rate when the surge began
}
export const createEffects = (): EffectsState => ({ dMap: 0, sbp: null, dbp: null, hrBase: null });

export interface EffectsCtx {
  l1: L1State;
  hemo: HemoState;
  resp: RespState;
  hrNow: (t: number) => number;
  setHr: (bpm: number, t: number) => void;
}

export function applyOrganEffects(e: EffectsState, b: BrainState, ctx: EffectsCtx, t: number): void {
  const drive = b.cush.drive;
  (ctx.resp.driver as { ataxia?: number }).ataxia = drive > 0.01 ? drive : 0; // Task 13 adds the field to DriverState
  const ext = circExt(ctx.hemo);
  if (ctx.l1.mode === 'modeled' && ext) {
    // R51 addendum 14: never test for the key — 7a's ext initialiser omits the optional keys
    ext.rSysF = 1 + CUSH_SVR_GAIN * drive; // the bradycardia is the baroreflex's own answer (Cushing's triad): no hrF
    return;
  }
  if (ext && (ext.rSysF !== undefined || ext.hrF !== undefined)) {
    delete ext.rSysF; // back in MANUAL: the MODELED seam is neutral again
    delete ext.hrF;
  }
  const d = cushingDMap(b.cush);
  const c = (ctx.l1.coupled ??= {});
  const baseS = c.sbp !== undefined && c.sbp === e.sbp ? c.sbp - SBP_SHARE * e.dMap : c.sbp;
  const baseD = c.dbp !== undefined && c.dbp === e.dbp ? c.dbp - DBP_SHARE * e.dMap : c.dbp;
  if (d > 0.01) {
    c.sbp = (baseS ?? l1Target(ctx.l1, 'sbp', t)) + SBP_SHARE * d;
    c.dbp = (baseD ?? l1Target(ctx.l1, 'dbp', t)) + DBP_SHARE * d;
    e.sbp = c.sbp;
    e.dbp = c.dbp;
    e.dMap = d;
  } else if (e.dMap > 0) {
    if (baseS === undefined || baseS === l1Target(ctx.l1, 'sbp', t)) delete c.sbp;
    else c.sbp = baseS;
    if (baseD === undefined || baseD === l1Target(ctx.l1, 'dbp', t)) delete c.dbp;
    else c.dbp = baseD;
    e.sbp = null;
    e.dbp = null;
    e.dMap = 0;
  }
  const f = cushingHrFactor(b.cush);
  if (f < 0.995) {
    if (e.hrBase === null) e.hrBase = ctx.hrNow(t);
    const want = e.hrBase * f;
    if (Math.abs(ctx.hrNow(t) - want) > 0.5) ctx.setHr(want, t);
  } else if (e.hrBase !== null) {
    ctx.setHr(e.hrBase, t);
    e.hrBase = null;
  }
}
```

Note: with the default L1 targets (120/80) the effects test expects `c.sbp` 172 (120 + 1.3·40) — `l1Target` reads the ramp, so `createL1State()` defaults apply.

- [ ] **Step 5: Implement `packages/engine-core/src/l2/organs/pipeline.ts`**

```ts
// Stage 7d organ pipeline (plan "Architecture"): one plain-data OrgansState in the engine's PipelineState, advanced
// by the engine right BEFORE the haemodynamics in every pass (after 7g's PK, Stage 3/7b's gas and 7c/7e's inserts),
// so the Cushing surge written into L1 `coupled` reaches the same pass's beats after Stage 3's gas step has refreshed
// its own couplings. 7d owns no drug ids: once per pass it OBSERVES 7g's `bus.doses` (mannitol, hypertonic saline).
//   10 Hz: stepBrain → effects (effects.ts) · 125 Hz: `icp` samples (wave.ts) · 1 Hz: kidney, liver, 7c seams,
//   published `kidney.gfrRel` (7g) and `liver.glucoseF` (7e), `organs` event and measurement {icpMean, cpp, pbto2, uop}.
import { l1Target, type L1State } from '../../l1/state.ts';
import type { Command, EngineEvent, Measured, PatientProfile } from '../../types.ts';
import type { OrgansEvent } from '../../types-organs.ts';
import { caO2, drugsOf, NO_ANAESTHESIA, NO_DRUGS, type BrainDrugs } from '../brain/flow.ts';
import { brainParams, createBrain, giveOsmotherapy, stepBrain, type BrainInputs, type BrainState } from '../brain/model.ts';
import { BRAIN_DT_S, ICP_THRESHOLD, MANNITOL_MOSM_PER_G, NACL_MOSM_PER_G } from '../brain/params.ts';
import { icpSample } from '../brain/wave.ts';
import type { HemoState, RhythmView } from '../hemo/pipeline.ts';
import { createLiver, lacProdBasal, stepLiver, type LiverInputs, type LiverState } from '../liver/liver.ts';
import { createRenal, giveMannitolRenal, stepRenal, uopOver, type RenalInputs, type RenalState } from '../renal/model.ts';
import { OLIGURIA_ML_KG_H, RENAL_REF_CO_L_KG } from '../renal/params.ts';
import { respBreathU, type RespState } from '../resp/pipeline.ts';
import { applyOrganEffects, createEffects, type EffectsState } from './effects.ts';
import { ALPHA_E_FULL, alphaExcess, bloodCore, readDrugView, readOrganView, type OrganDose, type OrganSources, type OrganView, type RenalSeam } from './inputs.ts';

export const ICP_RATE = 125;
export const ORGAN_CHANNELS = ['icp'] as const;
export type OrganChannel = (typeof ORGAN_CHANNELS)[number];
const ICP_MEAN_WINDOW_S = 4; // displayed ICP mean over 4 s [ENG]
const PBTO2_PROBE_TAU_S = 60; // Clark-type probe response [ENG]
/** MAP and CVP the organs see: a 4 s mean [ENG]. 7a's `hemo.pv` is the instantaneous RA pressure (0–9 mmHg within a
 *  cycle in the prototype) and `lastSite.map` one beat, so the 1 Hz kidney sampled noise (GFR 49–187 in MODELED HFrEF). */
const ORGAN_LP_TAU_S = 4;
/** Decision 6: Stage 3 `thermal` general anaesthesia with no hypnotic on 7g's bus ≈ propofol E 0.6 (CMRO2 ×0.7). */
const GA_FALLBACK: BrainDrugs = drugsOf({ ...NO_ANAESTHESIA, propofolE: 0.6 });
const URINE_NA = 100; // mmol/L [ENG] — 7c seam only
const URINE_K = 50; // mmol/L [ENG]
const FUROSEMIDE_NA_BOOST = 0.5; // urine Na × (1 + 0.5·E) [ENG]
const GLUCONATE_EXCRETED = 0.9; // fraction of the filtered gluconate excreted (renal clearance ≈ 0.9·GFR) [ENG]
const MG_PER_G: Record<string, number> = { mg: 1000, g: 1 };
const OWN_CONDITIONS: readonly string[] = ['tbi', 'hepaticFailure', 'aki'];
const OWN_SENSORS: readonly string[] = ['icp', 'pbto2', 'urometer'];

export interface OrgansState {
  k: number; // next 10 Hz step (time k·0.1 s)
  m: number; // next 125 Hz icp sample index
  weightKg: number;
  conds: { id: string; severity?: number }[];
  co0: number;
  brain: BrainState;
  renal: RenalState;
  liver: LiverState; // publishes `liver.glucoseF` (7e reads `organs.liver.glucoseF`)
  kidney: { gfrRel: number }; // PUBLISHED key (7g's pkCtx reads `organs.kidney.gfrRel`); the model is `renal`
  iap: number;
  lp: { map: number; cvp: number }; // ORGAN_LP_TAU_S means
  sensors: { icp: 'on' | 'off'; pbto2: 'on' | 'off'; urometer: 'on' | 'off' };
  beats: number[]; // perfused beat times (s), last 4
  num: { sec: number[]; acc: number; accN: number; pbto2: number };
  view: OrganView | null;
  fx: EffectsState;
  out: EngineEvent[];
}
/** OrganSources (l1, hemo, resp, and the duck-typed blood/pk/neuro/endo) plus the rhythm and the HR hooks. */
export interface OrgansCtx extends OrganSources {
  rhythm: RhythmView;
  hrNow: (t: number) => number;
  setHr: (bpm: number, t: number) => void;
}

/** Brain drug input: 7f/7g when they carry an effect, else the Stage 3 `thermal` GA fallback (decision 6). */
function brainDrugs(v: OrganView): BrainDrugs {
  const d = v.drugs;
  if (d.cmro2Mult !== 1 || d.cbfVaso !== 1) return { cmro2Mult: d.cmro2Mult, cbfVaso: d.cbfVaso };
  return v.anaesthesia === 'general' ? GA_FALLBACK : NO_DRUGS;
}
const brainIn = (v: OrganView): BrainInputs => ({
  map: v.map, cvp: v.cvp, paco2: v.paco2, pao2: v.pao2, sao2: v.sao2, hb: v.hb, tempC: v.tempC, drugs: brainDrugs(v),
});
const renalIn = (os: OrgansState, v: OrganView): RenalInputs => ({
  map: v.map, cvp: v.cvp, iap: os.iap, coLpm: v.coLpm, bvRel: v.bvRel, albuminGL: v.albuminGL, anaesthesia: v.anaesthesia,
  pawExcessCmH2O: v.pawExcessCmH2O, alphaExcess: alphaExcess(v), sepsis: v.drugs.sepsis,
  ...(v.drugs.furoCe !== undefined ? { furoCe: v.drugs.furoCe } : {}),
});
function liverIn(os: OrgansState, v: OrganView): LiverInputs {
  const do2 = (v.coLpm * 10 * caO2(v.hb, v.sao2, v.pao2)) / os.weightKg; // mL O2/kg/min (CaO2 mL/dL × 10 dL/L)
  return {
    coLpm: v.coLpm, co0Lpm: os.co0, bvRel: v.bvRel, alphaE: Math.min(1, v.drugs.alphaNe / ALPHA_E_FULL), volatileMac: v.drugs.volatileMac,
    tempC: v.tempC, gfrRel: os.kidney.gfrRel, do2MlKgMin: do2, ...(v.hbfRel !== null ? { hbfRel: v.hbfRel } : {}),
  };
}

/** Nominal t = 0 view from the L1 targets (replaced by rebaselineOrgans once the pipelines exist). */
function nominalView(l1: L1State, w: number): OrganView {
  const sbp = l1Target(l1, 'sbp', 0);
  const dbp = l1Target(l1, 'dbp', 0);
  return {
    map: dbp + 0.4 * (sbp - dbp), pp: sbp - dbp, cvp: l1Target(l1, 'cvp', 0), coLpm: (5.6 * w) / 70, paco2: 40, pao2: 95, sao2: 0.97,
    tempC: l1Target(l1, 'tempCore', 0), hb: 14, albuminGL: 42, bvRel: 1, hbfRel: null, lactate: null, gluconate: 0, anaesthesia: 'none',
    pawExcessCmH2O: 0, drugs: readDrugView({}), circ: false, blood: false,
  };
}

function build(os: OrgansState, v: OrganView): void {
  const sev = (id: string) => os.conds.find((c) => c.id === id)?.severity ?? (os.conds.some((c) => c.id === id) ? 1 : 0);
  os.co0 = Math.max(RENAL_REF_CO_L_KG * os.weightKg, v.coLpm); // healthy reference: a low-output start is not "normal"
  os.kidney = { gfrRel: 1 };
  os.brain = createBrain(brainParams(os.conds), brainIn(v));
  os.renal = createRenal(renalIn(os, v), os.weightKg, sev('aki'));
  os.liver = createLiver(os.weightKg, liverIn(os, v), sev('hepaticFailure'));
}

export function createOrgansState(profile: PatientProfile | undefined, l1: L1State): OrgansState {
  const w = profile?.weightKg ?? 70;
  const v = nominalView(l1, w);
  const os = {
    k: 0, m: 0, weightKg: w, conds: (profile?.conditions ?? []).map((c) => ({ id: c.id, severity: c.severity })), co0: v.coLpm,
    kidney: { gfrRel: 1 }, iap: 0, lp: { map: v.map, cvp: v.cvp },
    sensors: { icp: 'off', pbto2: 'off', urometer: 'off' }, beats: [], num: { sec: [], acc: 0, accN: 0, pbto2: 25 }, view: null,
    fx: createEffects(), out: [],
  } as unknown as OrgansState; // brain/renal/liver are created by build() on the next line
  build(os, v);
  os.num.pbto2 = os.brain.pbto2;
  return os;
}

/** Recalibrate on the running pipelines' t = 0 truths (the engine calls this once, right after creating its state). */
export function rebaselineOrgans(os: OrgansState, ctx: OrganSources): void {
  const v = readOrganView(ctx, 0);
  os.lp = { map: v.map, cvp: v.cvp };
  os.view = v;
  build(os, v);
  os.num.pbto2 = os.brain.pbto2;
}

export function organChannelActive(os: OrgansState, ch: OrganChannel): boolean {
  return ch === 'icp' && os.sensors.icp === 'on';
}

function collectBeats(os: OrgansState, rhythm: RhythmView, tEnd: number): void {
  const last = os.beats.length > 0 ? (os.beats[os.beats.length - 1] as number) : -1;
  const fresh: number[] = [];
  for (const r of rhythm.records) if (r.type === 'beat' && r.mech.perfused && r.t > last && r.t <= tEnd) fresh.push(r.t);
  fresh.sort((a, b) => a - b);
  os.beats.push(...fresh);
  if (os.beats.length > 4) os.beats.splice(0, os.beats.length - 4);
}

function icpAt(os: OrgansState, rs: RespState, ts: number): number {
  let tb = -1;
  let prev = -1;
  for (let i = os.beats.length - 1; i >= 0; i--) {
    const x = os.beats[i] as number;
    if (x <= ts) {
      tb = x;
      prev = i > 0 ? (os.beats[i - 1] as number) : x - 0.8;
      break;
    }
  }
  const since = tb < 0 ? 10 : ts - tb;
  const rr = tb < 0 ? 0.8 : Math.max(0.3, Math.min(2, tb - prev));
  const pp = since < 2 ? (os.view?.pp ?? 40) : 0; // no beat for 2 s → no arterial pulse in the ICP
  return icpSample(os.brain.icp, os.brain.elast, pp, since, rr, respBreathU(rs, ts));
}

/** 7c's renal seam (R51 addendum 14): urine mL/h and excretion mmol/h (Na, K, Cl from fixed urine concentrations [ENG];
 *  gluconate filtered at GFR × 7c's plasma gluconate, 90 % excreted [ENG]). */
function renalSeam(s: RenalState, gluconate: number): RenalSeam {
  const lH = (s.uopMlMin * 60) / 1000;
  const na = lH * URINE_NA * (1 + FUROSEMIDE_NA_BOOST * s.furoE);
  const k = lH * URINE_K;
  return { uopMlH: s.uopMlMin * 60, excretion: { k, na, cl: 0.9 * (na + k), gluconate: ((s.gfr * 60) / 1000) * gluconate * GLUCONATE_EXCRETED } };
}

/** 7g's accepted boluses (R51 §3: 7d OBSERVES, never consumes): mannitol → brain water and osmotic diuresis; hypertonic
 *  saline → brain water (its sodium load is 7c's, from the same log entry). Other agents are not ours. */
function observeDoses(os: OrgansState, doses: readonly OrganDose[]): void {
  for (const d of doses) {
    if (d.agent === 'mannitol') {
      const g = d.amount / (MG_PER_G[d.amountUnit] ?? 1000);
      giveOsmotherapy(os.brain, 'mannitol', g * MANNITOL_MOSM_PER_G);
      giveMannitolRenal(os.renal, g);
    } else if (d.agent === 'hypertonicSaline' && d.amountUnit === 'mL') {
      giveOsmotherapy(os.brain, 'hypertonicSaline', ((d.amount * (d.concentrationPct ?? 3)) / 100) * NACL_MOSM_PER_G);
    }
  }
}

const meas = (value: number | null, t: number, flag: Measured['flag'] = 'valid'): Measured =>
  value === null ? { value: null, flag: 'invalid', at: t } : { value: Math.round(value * 10) / 10, flag, at: t };

function oneHz(os: OrgansState, ctx: OrgansCtx, v: OrganView, t: number): void {
  stepRenal(os.renal, renalIn(os, v), 1);
  os.kidney.gfrRel = os.renal.gfr / Math.max(1, os.renal.p.gfrSet);
  const core = bloodCore(ctx.blood);
  stepLiver(os.liver, liverIn(os, v), 1, core ? lacProdBasal() : undefined); // with 7c its pool is authoritative (decision 12)
  if (core) {
    core.liver = os.liver.liverFn * os.liver.tempF; // function only: 7c multiplies its own hbfRel (addendum 14)
    core.renal = renalSeam(os.renal, v.gluconate);
  }
  if (os.num.accN > 0) {
    os.num.sec.push(os.num.acc / os.num.accN);
    if (os.num.sec.length > ICP_MEAN_WINDOW_S) os.num.sec.shift();
  }
  os.num.acc = 0;
  os.num.accN = 0;
  os.num.pbto2 += (os.brain.pbto2 - os.num.pbto2) * (1 - Math.exp(-1 / PBTO2_PROBE_TAU_S));
  const icpOn = os.sensors.icp === 'on' && os.num.sec.length > 0;
  const icpMean = icpOn ? os.num.sec.reduce((a, x) => a + x, 0) / os.num.sec.length : null;
  const abpOn = ctx.hemo.lines.abp.sensor !== 'none';
  const uopOn = os.sensors.urometer === 'on';
  os.out.push({
    type: 'measurement', t,
    values: {
      icpMean: meas(icpMean, t),
      cpp: meas(icpMean !== null && abpOn ? v.map - icpMean : null, t),
      pbto2: meas(os.sensors.pbto2 === 'on' ? os.num.pbto2 : null, t),
      uop: meas(uopOn ? uopOver(os.renal, 60) * os.weightKg : null, t, os.renal.bins.length < 1 ? 'questionable' : 'valid'),
    },
  });
  const b = os.brain;
  const ev: OrgansEvent = {
    type: 'organs', t,
    brain: {
      icp: b.icp, cpp: b.cpp, mapHead: b.mapHead, cbf: b.cbfRel, cbvMl: b.cbv, cmro2: b.cmro2Rel, pbto2: b.pbto2, sjvo2: b.sjvo2, elastance: b.elast, paco2: v.paco2,
      state: b.herniated ? 'herniated' : b.cush.active ? 'cushing' : b.icp > ICP_THRESHOLD ? 'raisedIcp' : 'normal', cushing: b.cush.drive,
    },
    kidney: {
      rbf: os.renal.rbf, gfr: os.renal.gfr, gfrRel: os.kidney.gfrRel, uopMlKgH: (os.renal.uopMlMin * 60) / os.weightKg, uop1hMlKgH: uopOver(os.renal, 60),
      cumMl: os.renal.cumMl, bagMl: os.renal.bagMl, bladderMl: os.renal.bladderMl,
      oliguria: uopOver(os.renal, 60 / os.renal.timeScale) < OLIGURIA_ML_KG_H, akiStage: os.renal.akiStage,
    },
    liver: {
      hbfRel: os.liver.hbfRel, kLacPerH: os.liver.kLacPerH, lactate: v.lactate ?? os.liver.lactate, tempF: os.liver.tempF,
      liverFn: os.liver.liverFn, inr: os.liver.inr,
    },
  };
  os.out.push(ev);
}

export function advanceOrgans(os: OrgansState, ctx: OrgansCtx, mEnd: number, write: (ch: OrganChannel, m: number, v: number) => void): void {
  const tEnd = mEnd / ICP_RATE;
  observeDoses(os, readDrugView(ctx).doses); // once per engine pass: 7g lists each accepted bolus for exactly one pass
  while (os.k * BRAIN_DT_S <= tEnd + 1e-9) {
    const t = os.k * BRAIN_DT_S;
    if (os.k > 0) {
      const v = readOrganView(ctx, t);
      const k = 1 - Math.exp(-BRAIN_DT_S / ORGAN_LP_TAU_S);
      os.lp.map += (v.map - os.lp.map) * k;
      os.lp.cvp += (v.cvp - os.lp.cvp) * k;
      v.map = os.lp.map;
      v.cvp = os.lp.cvp;
      os.view = v;
      stepBrain(os.brain, brainIn(v), BRAIN_DT_S);
      applyOrganEffects(os.fx, os.brain, ctx, t);
      if (os.k % 10 === 0) oneHz(os, ctx, v, t);
    }
    os.k++;
  }
  collectBeats(os, ctx.rhythm, tEnd);
  for (; os.m <= mEnd; os.m++) {
    const v = icpAt(os, ctx.resp, os.m / ICP_RATE);
    os.num.acc += v;
    os.num.accN++;
    if (os.sensors.icp === 'on') write('icp', os.m, v);
  }
}

// --- commands -------------------------------------------------------------------------------------------------
const inRange = (name: string, v: unknown, lo: number, hi: number): string | undefined =>
  v === undefined || (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi) ? undefined : `${name} must be ${lo}–${hi}`;

/** undefined = accepted, string = rejected, null = not a Stage 7d command (plan decision 16). */
export function validateOrgansCommand(cmd: Command): string | undefined | null {
  if (cmd.type === 'attachSensor') {
    if (!OWN_SENSORS.includes(cmd.sensor)) return null;
    return cmd.state === 'on' || cmd.state === 'off' ? undefined : `${cmd.sensor} state must be on or off`;
  }
  if (cmd.type !== 'applyEvent') return null;
  const ev = cmd.event as unknown as Record<string, unknown>;
  switch (ev.kind) {
    case 'brain':
      return inRange('massMl', ev.massMl, 0, 200) ?? inRange('massRateMlPerMin', ev.massRateMlPerMin, -5, 10) ?? inRange('oedemaMl', ev.oedemaMl, 0, 100);
    case 'position':
      return typeof ev.headUpDeg === 'number' ? inRange('headUpDeg', ev.headUpDeg, 0, 90) : 'headUpDeg must be 0–90';
    case 'renal':
      if (ev.catheter !== undefined && ev.catheter !== 'foley' && ev.catheter !== 'none') return 'catheter must be foley or none';
      return inRange('timeScale', ev.timeScale, 1, 24) ?? inRange('iapMmHg', ev.iapMmHg, 0, 40);
    case 'condition':
      if (!OWN_CONDITIONS.includes(ev.id as string)) return null;
      return typeof ev.severity === 'number' ? inRange('severity', ev.severity, 0, 1) : 'severity must be 0–1';
    default:
      return null;
  }
}

export function applyOrgansCommand(os: OrgansState, cmd: Command, _t: number): boolean {
  if (validateOrgansCommand(cmd) !== undefined) return false;
  if (cmd.type === 'attachSensor') {
    const s = cmd.sensor as keyof OrgansState['sensors'];
    os.sensors[s] = cmd.state as 'on' | 'off';
    if (s === 'pbto2') os.num.pbto2 = os.brain.pbto2; // teaching: the probe reads at once (a real one needs a run-in) [ENG]
    return true;
  }
  if (cmd.type !== 'applyEvent') return false;
  const ev = cmd.event as unknown as Record<string, unknown>;
  const b = os.brain;
  switch (ev.kind) {
    case 'brain': {
      if (typeof ev.massMl === 'number') b.mass = ev.massMl;
      if (typeof ev.massRateMlPerMin === 'number') b.massRate = ev.massRateMlPerMin;
      if (typeof ev.oedemaMl === 'number') b.oedema = ev.oedemaMl;
      return true;
    }
    case 'position':
      b.headUpDeg = ev.headUpDeg as number;
      return true;
    case 'renal':
      if (ev.catheter === 'foley' || ev.catheter === 'none') os.renal.catheter = ev.catheter;
      if (ev.emptyBag === true) os.renal.bagMl = 0;
      if (typeof ev.timeScale === 'number') os.renal.timeScale = ev.timeScale;
      if (typeof ev.iapMmHg === 'number') os.iap = ev.iapMmHg;
      return true;
    case 'condition': {
      const id = ev.id as string;
      const s = ev.severity as number;
      os.conds = [...os.conds.filter((c) => c.id !== id), { id, severity: s }];
      if (id === 'tbi') b.p = brainParams(os.conds);
      else if (id === 'hepaticFailure') os.liver.failure = s;
      else os.renal.p.aki = s;
      return true;
    }
    default:
      return false;
  }
}
```

- [ ] **Step 6: Run the tests and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/organs && npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck`
Expected: PASS (types 1, inputs 5, effects 2, pipeline 5). `hemo.lines.abp.sensor` is 7a's line state on `main` (`LineState.sensor`); read it, never edit `l2/hemo/**`.

- [ ] **Step 7: Commit and push**

```bash
git add packages/engine-core/src/l2/organs packages/engine-core/test/l2/organs docs/plans/stage-7d-organs.md
git commit -m "feat(organs): organ pipeline — 10 Hz brain, 125 Hz icp, 1 Hz kidney/liver, bus.doses observed, organs event, numerics, commands, Cushing effects, 7c seams, published gfrRel/glucoseF

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7d-organs
```

### Task 12: Engine wiring — state, pass order, flush, commands, `icp` buffer

**Files:**
- Modify: `packages/engine-core/src/engine.ts` (additive, every line marked `// Stage 7d`)
- Create: `packages/engine-core/test/helpers/organs.ts`, `packages/engine-core/test/engine/organs-wiring.test.ts`

**Interfaces:**
- Consumes: Task 11 (`createOrgansState`, `rebaselineOrgans`, `advanceOrgans`, `validateOrgansCommand`, `applyOrgansCommand`, `organChannelActive`, `ICP_RATE`, `OrganChannel`, `OrgansState`).
- Produces: `PipelineState.organs`; engine events `organs` and organ `measurement`s; channel `icp` (125 Hz, only while `attachSensor icp on`); the test helper `organsRig(opts: EngineOptions)` (incl. `mode: 'modeled'`) → `{ e, organs, hr, last(), send(body), run(seconds, each?) }` and `type OrgansRig`, used by Tasks 13 and 14–21.

- [ ] **Step 1: Write the test helper** — `packages/engine-core/test/helpers/organs.ts`

```ts
// Stage 7d engine-test helpers: an engine with the organ event log, a command sender, and a minute-yielding runner
// (CI rule: ≤ 1 simulated minute per call, yield between minutes).
import { createEngine } from '../../src/engine.ts';
import type { Command, EngineEvent, EngineOptions, MonitorEngine, OrgansEvent } from '../../src/index.ts';

export interface OrgansRig {
  e: MonitorEngine;
  organs: OrgansEvent[];
  hr: number[];
  last(): OrgansEvent;
  send(body: Record<string, unknown>): void;
  run(seconds: number, each?: (t: number) => void): Promise<void>;
}

export function organsRig(opts: EngineOptions): OrgansRig {
  const e = createEngine(opts);
  const organs: OrgansEvent[] = [];
  const hr: number[] = [];
  e.on((x: EngineEvent) => {
    if (x.type === 'organs') organs.push(x);
    else if (x.type === 'measurement' && x.values.hr?.value != null) hr.push(x.values.hr.value);
  }, ['organs', 'measurement']);
  let n = 0;
  return {
    e, organs, hr,
    last: () => organs[organs.length - 1] as OrgansEvent,
    send(body) {
      const r = e.dispatch({ id: `o${++n}`, issuedBy: 'test', ...body } as Command);
      if (!r.accepted) throw new Error(`rejected: ${r.reason}`);
      e.step(1);
    },
    async run(seconds, each) {
      const t0 = e.now().simT;
      for (let s = 0; s < seconds; ) {
        const d = Math.min(60, seconds - s);
        e.advanceTo(t0 + s + d);
        s += d;
        each?.(t0 + s);
        await new Promise((r) => setImmediate(r));
      }
    },
  };
}
```

- [ ] **Step 2: Write the failing wiring test** — `packages/engine-core/test/engine/organs-wiring.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { organsRig } from '../helpers/organs.ts';

describe('Stage 7d engine wiring', { timeout: 300_000 }, () => {
  it('organs event at 1 Hz; icp buffer only while the sensor is on; commands owned and rejected correctly', async () => {
    const r = organsRig({ seed: 1, patient: { weightKg: 70 } });
    await r.run(5);
    expect(r.organs.length).toBeGreaterThanOrEqual(5);
    expect(r.e.latestSampleIndex('icp')).toBe(-1);
    r.send({ type: 'attachSensor', sensor: 'icp', state: 'on' });
    await r.run(4);
    expect(r.e.sampleRate('icp')).toBe(125);
    const n = r.e.latestSampleIndex('icp');
    expect(n).toBeGreaterThan(125 * 8);
    const buf = new Float32Array(250);
    r.e.readSamples('icp', n - 249, buf);
    const mean = buf.reduce((a, x) => a + x, 0) / 250;
    expect(mean).toBeGreaterThan(7);
    expect(mean).toBeLessThan(13);
    expect(Math.max(...buf) - Math.min(...buf)).toBeGreaterThan(0.5); // a pulsatile trace
    const bad = r.e.dispatch({ id: 'b', issuedBy: 't', type: 'applyEvent', event: { kind: 'position', headUpDeg: 100 } });
    expect(bad.accepted).toBe(false);
    const other = r.e.dispatch({ id: 'c', issuedBy: 't', type: 'applyEvent', event: { kind: 'airway', state: 'patent' } });
    expect(other.accepted).toBe(true); // Stage 3 still owns its kinds
    r.send({ type: 'attachSensor', sensor: 'icp', state: 'off' });
    expect(r.e.latestSampleIndex('icp')).toBe(-1);
  });
  it('snapshot/restore round-trips the organ state (same ICP afterwards)', async () => {
    const r = organsRig({ seed: 2, patient: { weightKg: 70 } });
    r.send({ type: 'applyEvent', event: { kind: 'brain', massRateMlPerMin: 1 } });
    await r.run(60);
    const snap = r.e.snapshot();
    await r.run(30);
    const icpA = r.last().brain.icp;
    const e2 = createEngine({ seed: 2, patient: { weightKg: 70 } });
    e2.restore(snap);
    let icpB = 0;
    e2.on((x) => {
      if (x.type === 'organs') icpB = x.brain.icp;
    }, ['organs']);
    e2.advanceTo(snap.tick * 0.02 + 30);
    expect(icpB).toBeCloseTo(icpA, 6);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/organs-wiring.test.ts`
Expected: FAIL — no `organs` events (`r.organs.length` is 0).

- [ ] **Step 4: Wire the engine** — edits to `packages/engine-core/src/engine.ts`, every line marked `// Stage 7d`. Inserts are placed by CHAIN ORDER (R51 §7, addendum 14), not by a literal line: 7c/7e/7f may have added their own lines around them since this plan was written — keep theirs, put 7d's where the order says. (Anchors below are `main` after 7a/7b/7g.)

1. After the import line `import { lastCycleBefore } from './l2/resp/driver.ts'; // Stage 5.1 (R-S3-3)` add:
```ts
import { advanceOrgans, applyOrgansCommand, createOrgansState, ICP_RATE, organChannelActive, rebaselineOrgans, validateOrgansCommand, type OrganChannel, type OrgansCtx, type OrgansState } from './l2/organs/pipeline.ts'; // Stage 7d
```
2. In `interface PipelineState`, after `pkHooks: RhythmHookState; // Stage 7g` (and 7c/7e/7f's fields if present) add `  organs: OrgansState; // Stage 7d: brain, kidney, liver`.
3. In the constructor's `this.st = { … }` literal, after `pkHooks: createHookState(), // Stage 7g` add `      organs: createOrgansState(opts.patient, l1), // Stage 7d`, and right after the literal's closing `};` (before `this.syncCo2Sampler(); // R39-5`) add:
```ts
    rebaselineOrgans(this.st.organs, this.organsCtx(this.st)); // Stage 7d: calibrate on the pipelines' t = 0 truths
```
4. In `restore()`, after `data.st.pkHooks ??= createHookState(); // Stage 7g` add (F12: pre-7d snapshots get organs):
```ts
    if (!data.st.organs) {
      data.st.organs = createOrgansState(undefined, data.st.l1); // Stage 7d: pre-7d snapshots
      rebaselineOrgans(data.st.organs, this.organsCtx(data.st));
    }
```
   and after `this.syncRespBuffers(); // Stage 3` (the one before `for (const b of this.bufs.values()) b.clear();`) add `    this.syncOrganBuffers(); // Stage 7d`.
5. Before the method comment `/** Generate samples up to and including absolute ECG index \`end\` for pipeline state \`ps\`. */` add:
```ts
  /** Stage 7d: what the organ pipeline reads (duck-typed 7c/7e/7f/7g state; absent modules are undefined). */
  private organsCtx(ps: PipelineState): OrgansCtx {
    const x = ps as unknown as { blood?: unknown; pk?: unknown; neuro?: unknown; endo?: unknown };
    return {
      l1: ps.l1, hemo: ps.hemo, resp: ps.resp, rhythm: ps.rhythm, blood: x.blood, pk: x.pk, neuro: x.neuro, endo: x.endo,
      hrNow: (t) => rampValue(ps.hr, t),
      setHr: (bpm, t) => {
        ps.hr = retarget(ps.hr, t, bpm, { durationS: 1 });
      },
    };
  }

```
6. In `advance()`: immediately BEFORE the `advanceHemo(` call — i.e. after `const resp = ps.resp; // Stage 3` and after 7c's `advanceBlood` / 7e's `advanceEndo` lines when they exist (advance order pk → resp/lung → blood → endo → **organs** → hemo) — add:
```ts
    advanceOrgans(ps.organs, this.organsCtx(ps), Math.floor(end / 4), (ch, m, v) => this.organWrite(ch, m, v)); // Stage 7d: after pk/resp/blood/endo, before the haemodynamics
```
7. In `flush()`, after `this.st.pk.out = keep(this.st.pk.out); // Stage 7g` (and 7c/7e/7f's `out` lines) add `    this.st.organs.out = keep(this.st.organs.out); // Stage 7d`.
8. In `validate()`: AFTER 7g's two lines `const pkV = validatePkCommand(cmd, this.st.pk); …` / `if (pkV !== null) return pkV;` and after 7f's neuro validator if present, BEFORE 7c's blood, 7e's endo and Stage 3's `const resp = validateRespCommand(cmd);`, add:
```ts
    const organs = validateOrgansCommand(cmd); // Stage 7d: after pk (and 7f's neuro), before blood/endo/Stage 3 — its own ids only (null otherwise)
    if (organs !== null) return organs;
```
9. In `apply()`: AFTER `if (applyPkCommand(ps.pk, cmd, simT)) return; // Stage 7g: …` and 7f's neuro apply if present, BEFORE 7c's/7e's apply and `if (applyRespCommand(…))`, add:
```ts
    if (applyOrgansCommand(ps.organs, cmd, simT)) {
      this.syncOrganBuffers(); // Stage 7d
      return;
    }
```
10. Before the method comment `/** Stage 3: the co2 sensor 'off' has no trace (brief §6.2). */` add:
```ts
  /** Stage 7d: write one 125 Hz icp sample; the buffer is created on the first write. */
  private organWrite(ch: OrganChannel, m: number, v: number): void {
    let b = this.bufs.get(ch);
    if (!b) {
      b = new RingBuffer(ICP_RATE, BUFFER_SECONDS);
      this.bufs.set(ch, b);
    }
    b.write(m, v);
  }

  /** Stage 7d: the icp sensor 'off' has no trace. */
  private syncOrganBuffers(): void {
    if (!organChannelActive(this.st.organs, 'icp')) this.bufs.delete('icp');
  }

```
(The prototype applied edits 1–10 to 7g's branch with 7b merged: `tsc` clean; 7g's `pkCtx` now reads the published `organs.kidney.gfrRel` with no change on its side.)

- [ ] **Step 5: Run the wiring test, then the whole engine-core suite**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/organs-wiring.test.ts && CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core test` (the 6 h horizon; the 24 h runs belong to Task 24's local gate)
Expected: PASS; every pre-existing test still passes (the organ pipeline only READS other stages and writes L1 `coupled` sbp/dbp and the HR only while a Cushing surge is on). If a Stage 2/3 test that counts buffers or events now fails because of the extra `organs`/`measurement` events, filter that test's listener by type rather than changing the engine; list it in the gate note.

- [ ] **Step 6: Commit and push**

```bash
git add packages/engine-core/src/engine.ts packages/engine-core/test/helpers/organs.ts packages/engine-core/test/engine/organs-wiring.test.ts docs/plans/stage-7d-organs.md
git commit -m "feat(engine): wire the organ pipeline before the haemodynamics — organs event, icp channel, organ commands first

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7d-organs
```

### Task 13: Cushing and brain effects back into the circulation and the breathing driver; check 19 through the engine (MANUAL and MODELED)

**Files:**
- Modify: `packages/engine-core/src/l2/resp/driver.ts` (one optional field + two jitter expressions, marked `// Stage 7d`). No `l2/circ/**` edit: `ext.rSysF` is on `main` (R48).
- Test: `packages/engine-core/test/engine/organs-tbi.test.ts`, `packages/engine-core/test/l2/organs/ataxia.test.ts`

**Interfaces:**
- Consumes: `applyOrganEffects` (Task 11) writes `driver.ataxia`, L1 `coupled` sbp/dbp and the HR request (MANUAL), or `circ.ext.rSysF` (MODELED, `ctx.l1.mode === 'modeled' && ext`); `organsRig` (Task 12) with `mode`.
- Produces: `DriverState.ataxia?: number` (0–1): spontaneous breath period and VT jitter × (1 + 7·ataxia) (SD 5 % → 40 %), floor 0.3 instead of 0.7 while ataxic.

- [ ] **Step 1: Write the failing ataxia test** — `packages/engine-core/test/l2/organs/ataxia.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { createDriver, planCycles } from '../../../src/l2/resp/driver.ts';
import { seedStream } from '../../../src/rng/sfc32.ts';

const ctx = { rr: 15, vt: 500, fio2: 0.21, etco2: 36, complianceMl: 50 };
function cv(ataxia: number): number {
  const d = createDriver(seedStream(7, 'resp'));
  (d as { ataxia?: number }).ataxia = ataxia;
  planCycles(d, ctx, 600);
  const p = d.cycles.map((c) => c.ti + c.te);
  const m = p.reduce((a, x) => a + x, 0) / p.length;
  return Math.sqrt(p.reduce((a, x) => a + (x - m) ** 2, 0) / p.length) / m;
}

describe('ataxic breathing (Cushing, tables §5.1)', () => {
  it('breath-period variability: ≈ 5 % normally, > 25 % at ataxia 1', () => {
    expect(cv(0)).toBeLessThan(0.08);
    expect(cv(1)).toBeGreaterThan(0.25);
  });
});
```
(If `seedStream` lives elsewhere on your base, import it from where `src/l2/resp/pipeline.ts` imports it.)

- [ ] **Step 2: Write the engine check-19 test** — `packages/engine-core/test/engine/organs-tbi.test.ts`

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import type { OrgansEvent } from '../../src/index.ts';
import { organsRig } from '../helpers/organs.ts';

const TBI = { weightKg: 70, baseline: { sbp: 110, dbp: 72, hr: 80 }, conditions: [{ id: 'tbi', severity: 1 }], sensors: { abp: 'connected' } };
const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / Math.max(1, xs.length);
type Check19 = { paco2: number; map0: number; hr0: number; t20: number; t40: number; icpAtCpp60: number; dMap: number; hrEnd: number };

/** Tables §7 check 19 script, run once per mode. RR 18 / VT 500: Stage 3's dead space (VD/VT ≈ 0.53, G7g NR-7g-3)
 *  needs it for PaCO2 ≈ 40 (at RR 12–14 PaCO2 drifted to 46–52 and pulled ICP 20 forward to 7.9–8.7 min: R49). */
async function check19(mode: 'manual' | 'modeled'): Promise<Check19> {
  const r = organsRig({ seed: 3, mode, patient: TBI });
  r.send({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 18, vtMl: 500, fio2: 0.4, peep: 5 } });
  r.send({ type: 'attachSensor', sensor: 'icp', state: 'on' });
  await r.run(300);
  const map0 = mean(r.organs.slice(-60).map((o) => o.brain.mapHead));
  const hr0 = mean(r.hr.slice(-30));
  const paco2 = r.last().brain.paco2;
  r.send({ type: 'applyEvent', event: { kind: 'brain', massRateMlPerMin: 1 } });
  const t0 = r.e.now().simT;
  await r.run(40 * 60);
  const after = r.organs.filter((o) => o.t > t0);
  const first = (f: (o: OrgansEvent) => boolean) => after.find(f);
  const min = (o: OrgansEvent | undefined) => Math.round(((o?.t ?? Infinity) - t0) / 6) / 10; // 0.1 min: the tables' "~" at 1 Hz
  const on = first((o) => o.brain.state === 'cushing')?.t ?? Infinity;
  const n = {
    paco2, map0, hr0,
    t20: min(first((o) => o.brain.icp >= 20)),
    t40: min(first((o) => o.brain.icp >= 40)),
    icpAtCpp60: first((o) => o.brain.cpp < 60)?.brain.icp ?? Infinity,
    dMap: mean(after.filter((o) => o.t >= on + 50 && o.t <= on + 70).map((o) => o.brain.mapHead)) - map0, // reached over 30–60 s
    hrEnd: mean(r.hr.slice(-30)),
  };
  console.log(mode, n); // gate-note numbers
  return n;
}

describe('tables §7 check 19 through the engine — MANUAL', { timeout: 300_000 }, () => {
  let n: Check19;
  beforeAll(async () => {
    n = await check19('manual');
  }, 300_000);
  it('normocapnic premise; ICP 20 by 10–15 min, 40 by 20–25; CPP < 60 before ICP 30', () => {
    expect(n.paco2).toBeGreaterThan(38); // prototype 39.5
    expect(n.paco2).toBeLessThan(42);
    expect(n.t20).toBeGreaterThanOrEqual(10); // prototype 11.1
    expect(n.t20).toBeLessThanOrEqual(15);
    expect(n.t40).toBeGreaterThanOrEqual(20); // prototype 24.5
    expect(n.t40).toBeLessThanOrEqual(25);
    expect(n.icpAtCpp60).toBeLessThan(30); // prototype 25.3
  });
  it('Cushing bradycardia: HR 80 → 45–55', () => {
    expect(n.hrEnd).toBeGreaterThanOrEqual(45); // prototype 48.2
    expect(n.hrEnd).toBeLessThanOrEqual(55);
  });
  // R45: NOT widened. Prototype +23 (+18 to +46 beat to beat): 7a's MANUAL per-beat tracker rings at HR 48 with the
  // surged SVR (its steady-state R inverse assumes R·C ≪ RR); TRACK_ALPHA_R 0.15 instead of 0.5 gave +29 (±4) in the
  // prototype. FU-2 item for 7a's owner (l2/hemo is outside 7d's partition); flip to `it` when it lands.
  it.fails('Cushing surge: MAP +30–50 reached over 30–60 s (7a MANUAL tracker ringing, FU-2)', () => {
    expect(n.dMap).toBeGreaterThanOrEqual(30);
    expect(n.dMap).toBeLessThanOrEqual(50);
  });
});

describe('tables §7 check 19 through the engine — MODELED (7a circulation and baroreflex)', { timeout: 300_000 }, () => {
  let n: Check19;
  beforeAll(async () => {
    n = await check19('modeled');
  }, 300_000);
  it('normocapnic premise; ICP 20 by 10–15 min, 40 by 20–25; CPP < 60 as ICP passes MAP − 60', () => {
    expect(n.paco2).toBeGreaterThan(38); // prototype 39.9
    expect(n.paco2).toBeLessThan(42);
    expect(n.t20).toBeGreaterThanOrEqual(10); // prototype 10.0
    expect(n.t20).toBeLessThanOrEqual(15);
    expect(n.t40).toBeGreaterThanOrEqual(20); // prototype 22.6
    expect(n.t40).toBeLessThanOrEqual(25);
    // the tables' "before ICP 30" presumes MAP ≤ 90; the MODELED adult rests at MAP 96 (7a targets 120/80), so the
    // check is the arithmetic itself: CPP crosses 60 when ICP reaches MAP − 60 (prototype ICP 34.6 at MAP 95.7)
    expect(n.icpAtCpp60).toBeLessThan(n.map0 - 58);
  });
  it('Cushing through circ.ext.rSysF: MAP +30–50 over 30–60 s; HR −20–40 % from the baroreflex (Cushing\'s triad)', () => {
    expect(n.dMap).toBeGreaterThanOrEqual(30); // prototype +36.9
    expect(n.dMap).toBeLessThanOrEqual(50);
    expect(n.hrEnd / n.hr0).toBeGreaterThanOrEqual(0.6); // prototype 55.8/73.2 = 0.76
    expect(n.hrEnd / n.hr0).toBeLessThanOrEqual(0.8);
  });
});
```

- [ ] **Step 3: Run both to verify the ataxia test fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/organs/ataxia.test.ts test/engine/organs-tbi.test.ts`
Expected: the ataxia test FAILS (`cv(1)` ≈ 0.05). The TBI file already passes (the effects are Task 11's; the MANUAL surge assertion is an `it.fails`); record what it prints.

- [ ] **Step 4: Add the field to `src/l2/resp/driver.ts`**
  - in `interface DriverState`, after `rng: Sfc32State;` add `ataxia?: number; // Stage 7d: Cushing ataxic breathing 0–1 (organs/effects.ts)`;
  - replace `vt = ctx.vt * Math.max(0.7, 1 + SPONT_JITTER * normal(d.rng));` with
    `vt = ctx.vt * Math.max(d.ataxia ? 0.3 : 0.7, 1 + SPONT_JITTER * (1 + 7 * (d.ataxia ?? 0)) * normal(d.rng)); // Stage 7d: ataxia`
  - replace `period *= Math.max(0.7, 1 + SPONT_JITTER * normal(d.rng));` with
    `period *= Math.max(d.ataxia ? 0.3 : 0.7, 1 + SPONT_JITTER * (1 + 7 * (d.ataxia ?? 0)) * normal(d.rng)); // Stage 7d: ataxia`
  With `ataxia` absent or 0 both expressions are byte-identical to Stage 3's (same draws, same values).

- [ ] **Step 5: Run the tests**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/organs/ataxia.test.ts test/engine/organs-tbi.test.ts`
Expected: PASS (ataxia 1; TBI 5 incl. one `it.fails`). **Prototype (7a + 7b + 7g, ventilator RR 18/VT 500/FiO2 0.4, PaCO2 39.5):** MANUAL — MAP 86, ICP 20 at **11.1 min**, 40 at **24.5**, CPP < 60 at ICP **25.3**, HR → **48.2**, Cushing ΔMAP **+24** at 60 s; MODELED — MAP 96 (7a's adult targets 120/80), ICP 20 at **10.0**, 40 at **22.6**, CPP < 60 at ICP 34.6 (= MAP − 60), ΔMAP **+37**, HR 73 → **56** (−24 %). The two R49 engine findings were diagnosed as mechanisms, not bands:
  - **ICP 20 at 5.4 min** (first draft): the ventilated PaCO2 was 44–52 at RR 12–14 (Stage 3's VD/VT ≈ 0.53, NR-7g-3), so CBF rose; RR 18 holds 39.5 (the test asserts the premise 38–42), plus Rout 8 (decision 1).
  - **Cushing MAP +65 → +111** (first draft): the coupled targets are exact (+1.3/+0.85 × ΔMAP) and Stage 3's `applyPawCoupling` does not rewrite them; two causes: (1) 7a's waveform MAP sits ≈ 0.45 of the pulse pressure above the diastolic at HR 48, so a 50 mmHg target read +54 — ΔMAP at full drive is now 40, the tables' band centre; (2) 7a's MANUAL per-beat tracker rings (a ≈ 10-beat cycle, ±20 mmHg) at HR 48 with the surged SVR because its steady-state R inverse assumes R·C ≪ RR — with `TRACK_ALPHA_R` 0.15 (prototype only; `l2/hemo/**` is not ours) the swing fell to ±4 and ΔMAP reached +29. That is FU-2 (R-7D-5a), so the MANUAL ΔMAP assertion is `it.fails` with its number. In MODELED the direct HR factor was the defect: `ext.hrF` 0.6 on top of `rSysF` gave HR 40 and ΔMAP +11; the baroreflex alone gives the bradycardia (Cushing's triad), so 7d writes `rSysF` only (gain 1.2 inside the 0.5–1.2 allowance: 0.8 gave +27).
  Record the printed numbers in the gate note; if the MANUAL surge passes on your base (FU-2 landed), flip `it.fails` to `it`.

- [ ] **Step 6: Commit and push**

```bash
git add packages/engine-core/src/l2/resp/driver.ts packages/engine-core/test/l2/organs/ataxia.test.ts packages/engine-core/test/engine/organs-tbi.test.ts docs/plans/stage-7d-organs.md
git commit -m "feat(organs): ataxic breathing on the resp driver; check 19 through the engine in MANUAL and MODELED (surge via coupled pressures / circ.ext.rSysF)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7d-organs
```

### Task 14: Alarms — ICP and CPP limit keys

**Files:**
- Modify: `packages/engine-core/src/l3/alarms/profile.ts` (`LIMIT_KEYS`, two rows marked `// Stage 7d`)
- Test: `packages/engine-core/test/engine/organs-alarm.test.ts`

**Interfaces:**
- Consumes: the `icpMean`/`cpp` measurements (Task 11). The skins already carry an `ICP` limit (saadat-like adult 0–10, paediatric/neonatal 0–4: brief §6.8 Appendix 1).
- Produces: alarm ids `ICP_HIGH`, `ICP_LOW`, `CPP_LOW`, `CPP_HIGH` through the existing limit loop (no new alarm code).

- [ ] **Step 1: Write the failing test** — `packages/engine-core/test/engine/organs-alarm.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { LIMIT_KEYS } from '../../src/l3/alarms/profile.ts';
import type { EngineEvent } from '../../src/types.ts';
import { organsRig } from '../helpers/organs.ts';

describe('ICP alarm (brief §6.8 Appendix 1 limits)', { timeout: 300_000 }, () => {
  it('maps ICP/CPP limit keys to the organ numerics', () => {
    expect(LIMIT_KEYS.ICP?.numeric).toBe('icpMean');
    expect(LIMIT_KEYS.CPP?.numeric).toBe('cpp');
  });
  it('ICP 22 on the saadat-like skin (limit 0–10, alarm enabled) raises ICP_HIGH', async () => {
    const r = organsRig({ seed: 1, patient: { weightKg: 70 }, device: { skin: 'saadat-like' } });
    const alarms: EngineEvent[] = [];
    r.e.on((x) => alarms.push(x), ['alarm']);
    r.send({ type: 'attachSensor', sensor: 'icp', state: 'on' });
    r.send({ type: 'device', action: { device: 'alarm', action: 'enable', param: 'ICP', value: true } });
    r.send({ type: 'applyEvent', event: { kind: 'brain', massMl: 12 } });
    await r.run(30);
    console.log(alarms.filter((a) => a.type === 'alarm').map((a) => (a as { id: string }).id));
    expect(alarms.some((a) => a.type === 'alarm' && a.id === 'ICP_HIGH' && a.state === 'raised')).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/organs-alarm.test.ts`
Expected: FAIL — `LIMIT_KEYS.ICP` is undefined.

- [ ] **Step 3: Add the rows** — in `LIMIT_KEYS` after `CVP_M: { numeric: 'cvpMean', label: 'CVP', upper: 'CVP MEAN' },` add

```ts
  ICP: { numeric: 'icpMean', label: 'ICP', upper: 'ICP MEAN' }, // Stage 7d (skins carry ICP limits, brief §6.8)
  CPP: { numeric: 'cpp', label: 'CPP', upper: 'CPP' }, // Stage 7d (no factory limit: inert until a limit is set)
```

- [ ] **Step 4: Run the test**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/organs-alarm.test.ts test/l3`
Expected: PASS, and the existing alarm tests still pass. If the `enable` action takes a different `param` form on your base, use the one `test/l3/alarms/*.test.ts` uses for `CVP_M`.

- [ ] **Step 5: Commit and push**

```bash
git add packages/engine-core/src/l3/alarms/profile.ts packages/engine-core/test/engine/organs-alarm.test.ts docs/plans/stage-7d-organs.md
git commit -m "feat(alarms): ICP and CPP limit keys on the organ numerics

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7d-organs
```

### Task 15: Skins — `ICP` lane, `ICP`/`PbtO2`/`UO` tiles with provenance

**Files:**
- Modify: `packages/skins/src/types.ts` (`LANE_IDS`, `TILE_PARAMS`, `COLOR_KEYS` — `TILE_PARAMS`/`COLOR_KEYS` are also edited by 7f: additive merge), `packages/skins/src/resolve.ts` (`TILE_COLOR_KEY`, also 7f's), `packages/skins/src/data/skins/saadat-like.json`, `packages/skins/src/data/skins/philips-like.json`; and the two other `Record<TileParam, …>` maps the grown union breaks: `packages/renderer/src/alarm-view.ts` (`TILE_NUMERICS`, also 7f's) and `apps/demo/src/stage4a/screen.ts` (`SAMPLE`, also 7f's), plus `packages/renderer/src/device-ui.ts` (`UNIT`, partial: the tile units). `schema.ts` derives its enums from these lists (`en(TILE_PARAMS)`, `en(LANE_IDS)`, `COLOR_KEYS.map`): no edit.
- Test: `packages/skins/test/organs-tiles.test.ts`

**Interfaces:**
- Produces: `LaneId` gains `'ICP'`; `TileParam` gains `'ICP' | 'PbtO2' | 'UO'`; `ColorKey` gains `'PbtO2' | 'UO'` (`ICP` exists); `TILE_COLOR_KEY` maps the three tiles to their colour keys. Every new colour is covered by a provenance entry (saadat-like per key; philips-like's group `colors` entry covers it).

- [ ] **Step 1: Write the failing test** — `packages/skins/test/organs-tiles.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { resolveSkin } from '../src/index.ts';
import { LANE_IDS, TILE_PARAMS } from '../src/types.ts';

describe('Stage 7d skin fields', () => {
  it('ICP lane and ICP/PbtO2/UO tiles exist', () => {
    expect(LANE_IDS).toContain('ICP');
    for (const p of ['ICP', 'PbtO2', 'UO']) expect(TILE_PARAMS).toContain(p);
  });
  it('saadat-like and philips-like colour the new parameters, with provenance', () => {
    for (const id of ['saadat-like', 'philips-like']) {
      const r = resolveSkin(id);
      expect(r.skin.colors.ICP).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(r.skin.colors.PbtO2).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(r.skin.colors.UO).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(r.provenance['colors.PbtO2'] ?? r.provenance.colors).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/skins exec vitest run test/organs-tiles.test.ts`
Expected: FAIL — `LANE_IDS` does not contain `ICP`.

- [ ] **Step 3: Extend the enums and the tile colour map** (each line marked `// Stage 7d`; on a merge conflict with 7f keep both stages' entries):
  - `packages/skins/src/types.ts`: in `COLOR_KEYS`, after the line `  'ECG', 'HR', 'ST', 'PVC', 'SpO2', 'PLETH', 'PR', 'PI', 'NIBP', 'ART', 'CVP', 'PAP', 'ICP',` add the line `  'PbtO2', 'UO', // Stage 7d`; replace `export const LANE_IDS = ['ECG1', 'ECG2', 'ECG3', 'PLETH', 'ART', 'CVP', 'PAP', 'IBP1', 'IBP2', 'IBP3', 'IBP4', 'RESP', 'CO2'] as const;` with `export const LANE_IDS = ['ECG1', 'ECG2', 'ECG3', 'PLETH', 'ART', 'CVP', 'PAP', 'IBP1', 'IBP2', 'IBP3', 'IBP4', 'RESP', 'CO2', 'ICP'] as const; // Stage 7d: ICP`; replace `export const TILE_PARAMS = ['HR', 'NIBP', 'ART', 'CVP', 'PAP', 'IBP1', 'IBP2', 'IBP3', 'IBP4', 'SpO2', 'TEMP', 'RR', 'CO2', 'ST'] as const;` with `export const TILE_PARAMS = ['HR', 'NIBP', 'ART', 'CVP', 'PAP', 'IBP1', 'IBP2', 'IBP3', 'IBP4', 'SpO2', 'TEMP', 'RR', 'CO2', 'ST', 'ICP', 'PbtO2', 'UO'] as const; // Stage 7d: ICP, PbtO2, UO` (7f appends its own two params to the same list).
  - `packages/skins/src/resolve.ts`, `TILE_COLOR_KEY`: after the line `  SpO2: 'SpO2', TEMP: 'TEMP', RR: 'RESP', CO2: 'CO2', ST: 'ST',` add `  ICP: 'ICP', PbtO2: 'PbtO2', UO: 'UO', // Stage 7d`.
  - `apps/demo/src/stage4a/screen.ts`, `SAMPLE`: after the line ending `ST: { v: '0.1' },` add `  ICP: { v: '12', x: 'CPP 78' }, PbtO2: { v: '25' }, UO: { v: '70', x: 'Σ 540 mL' }, // Stage 7d`.
  - `packages/renderer/src/alarm-view.ts`, `TILE_NUMERICS`: after `  ST: { numerics: ['stII'], limits: ['ST_mV'] },` add
    `  ICP: { numerics: ['icpMean', 'cpp'], limits: ['ICP', 'CPP'] }, // Stage 7d`, `  PbtO2: { numerics: ['pbto2'], limits: [] }, // Stage 7d`, `  UO: { numerics: ['uop'], limits: [] }, // Stage 7d` (one line each).
  - `packages/renderer/src/device-ui.ts`, `UNIT`: after the line ending `RR: 'rpm', CO2: 'mmHg', ST: 'mV',` add `  ICP: 'mmHg', PbtO2: 'mmHg', UO: 'mL/h', // Stage 7d`.

- [ ] **Step 4: Colours and provenance** — `packages/skins/src/data/skins/saadat-like.json`: in `"colors"` change the last entry `"AGENTS": "#F0F030"` to `"AGENTS": "#F0F030",` and add the line `    "ICP": "#F0F0F0", "PbtO2": "#00F0F0", "UO": "#F0F000"`; in `"provenance"`, after the `"colors.ECG"` entry, add
```json
    "colors.ICP": { "tag": "eng", "source": "ENG", "note": "Stage 7d: no manual colour for ICP/PbtO2/UO; chosen for contrast (tables §5.1–5.2)" },
    "colors.PbtO2": { "tag": "eng", "source": "ENG", "note": "Stage 7d: no manual colour for ICP/PbtO2/UO; chosen for contrast (tables §5.1–5.2)" },
    "colors.UO": { "tag": "eng", "source": "ENG", "note": "Stage 7d: no manual colour for ICP/PbtO2/UO; chosen for contrast (tables §5.1–5.2)" },
```
  `packages/skins/src/data/skins/philips-like.json`: change `"ICP": "#FF00FF",` to `"ICP": "#FF00FF", "PbtO2": "#00FFFF", "UO": "#FFFF00",` (its group `"colors"` provenance entry covers the new keys). Run the skins contrast test; if a colour fails it, darken/lighten within the same hue.

- [ ] **Step 5: Run the skins suite and the whole typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/skins test && npx -y pnpm@9.15.9 typecheck`
Expected: PASS (prototype: skins 170 tests, no snapshot change; whole-repo typecheck clean).

- [ ] **Step 6: Commit and push**

```bash
git add packages/skins apps/demo/src/stage4a/screen.ts packages/renderer/src/alarm-view.ts packages/renderer/src/device-ui.ts docs/plans/stage-7d-organs.md
git commit -m "feat(skins): ICP lane, ICP/PbtO2/UO tiles, tile colour keys and colours with provenance (Stage 7d)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7d-organs
```

### Task 16: Renderer — `icp` lane and the ICP/CPP/PbtO2/UOP tile formatters

**Files:**
- Create: `packages/renderer/src/numerics-organs.ts`, `packages/renderer/test/numerics-organs.test.ts`
- Modify: `packages/renderer/src/wave-lanes.ts` (`WaveLaneId`, `WAVE_STYLE`), `packages/renderer/src/skin-plan.ts` (`WAVE_CHANNEL`, `IBP_SCALE_KEY`, `WAVE_LANE`), `packages/renderer/src/index.ts` (export). (`TILE_NUMERICS` and `UNIT` were Task 15's.)

**Interfaces:**
- Produces: `WaveLaneId` gains `'icp'` with `WAVE_STYLE.icp = { label: 'ICP', color: '#ffffff', range: [0, 40] }` (125 Hz, 25 mm/s); `formatIcp(icp, cpp) → {main, sub, status}`, `formatPbto2(p) → {main, status}`, `formatUop(uop, cumMl?, weightKg?) → {main, sub, status}` (OLIGURIA below 0.5 mL/kg/h when the weight is given).

- [ ] **Step 1: Write the failing test** — `packages/renderer/test/numerics-organs.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { formatIcp, formatPbto2, formatUop } from '../src/numerics-organs.ts';
import { WAVE_STYLE } from '../src/wave-lanes.ts';

const m = (value: number | null, flag: 'valid' | 'questionable' | 'invalid' = 'valid') => ({ value, flag, at: 0 });

describe('organ tiles', () => {
  it('ICP mean large, CPP below; dashes when invalid; HIGH status above 22', () => {
    expect(formatIcp(m(12.4), m(75.6))).toEqual({ main: '12', sub: 'CPP 76', status: '' });
    expect(formatIcp(m(25), m(55)).status).toBe('ICP HIGH');
    expect(formatIcp(m(null, 'invalid'), undefined)).toEqual({ main: '--', sub: 'CPP --', status: '' });
  });
  it('PbtO2 with the ischaemic flag at ≤ 20 mmHg; UOP in mL/h with oliguria text', () => {
    expect(formatPbto2(m(18.2))).toEqual({ main: '18', status: 'LOW PbtO2' });
    expect(formatUop(m(21), 540).main).toBe('21');
    expect(formatUop(m(21), 540).sub).toBe('Σ 540 mL');
    expect(formatUop(m(21), 540, 70).status).toBe('OLIGURIA');
  });
  it('the icp lane is 0–40 mmHg at 125 Hz', () => {
    expect(WAVE_STYLE.icp.range).toEqual([0, 40]);
    expect(WAVE_STYLE.icp.rate ?? 125).toBe(125);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run test/numerics-organs.test.ts`
Expected: FAIL — cannot find `src/numerics-organs.ts`.

- [ ] **Step 3: Implement** — `packages/renderer/src/numerics-organs.ts`

```ts
// Stage 7d numeric tiles: ICP (mean) with CPP, PbtO2, urine output (mL/h over 60 min, cumulative). Pure formatters
// (Node has no DOM); the tiles reuse PressureTile like Stage 3's (numerics-resp.ts).
import type { Measured } from '@pme/engine-core';

const ok = (x: Measured | undefined): x is Measured & { value: number } => !!x && x.value !== null && x.flag !== 'invalid';
export const ICP_HIGH = 22; // BTF 2016 threshold (tables §5.1)
export const PBTO2_LOW = 20; // BOOST threshold (tables §5.1)
export const OLIGURIA_ML_KG_H = 0.5; // KDIGO (tables §5.2)

export function formatIcp(icp: Measured | undefined, cpp: Measured | undefined): { main: string; sub: string; status: string } {
  return {
    main: ok(icp) ? String(Math.round(icp.value)) : '--',
    sub: `CPP ${ok(cpp) ? Math.round(cpp.value) : '--'}`,
    status: ok(icp) && icp.value > ICP_HIGH ? 'ICP HIGH' : '',
  };
}

export function formatPbto2(p: Measured | undefined): { main: string; status: string } {
  return { main: ok(p) ? String(Math.round(p.value)) : '--', status: ok(p) && p.value <= PBTO2_LOW ? 'LOW PbtO2' : '' };
}

/** UOP in mL/h; `weightKg` (optional) turns on the < 0.5 mL/kg/h OLIGURIA text. */
export function formatUop(uop: Measured | undefined, cumMl?: number, weightKg?: number): { main: string; sub: string; status: string } {
  return {
    main: ok(uop) ? String(Math.round(uop.value)) : '--',
    sub: cumMl === undefined ? '' : `Σ ${Math.round(cumMl)} mL`,
    status: ok(uop) && weightKg !== undefined && uop.value / weightKg < OLIGURIA_ML_KG_H ? 'OLIGURIA' : '',
  };
}
```

Then the maps over the grown unions (each line marked `// Stage 7d`; every one is a `Record<…>` the typecheck enforces):
  - `packages/renderer/src/wave-lanes.ts`: replace `export type WaveLaneId = 'abp' | 'pleth' | 'cvp' | 'pap' | 'co2' | 'resp'; // Stage 3: co2, resp (62.5 Hz)` with `export type WaveLaneId = 'abp' | 'pleth' | 'cvp' | 'pap' | 'co2' | 'resp' | 'icp'; // Stage 3: co2, resp (62.5 Hz); Stage 7d: icp`, and in `WAVE_STYLE` after the `resp: { label: 'RESP', … },` entry add `  icp: { label: 'ICP', color: '#ffffff', range: [0, 40] }, // Stage 7d (brief §6.8 has no ICP colour; skins override)`.
  - `packages/renderer/src/skin-plan.ts`: in `WAVE_CHANNEL` after the line ending `RESP: 'resp', CO2: 'co2',` add `  ICP: 'icp', // Stage 7d`; replace `const IBP_SCALE_KEY: Partial<Record<LaneId, string>> = { ART: 'ART', IBP1: 'ART', CVP: 'CVP', IBP2: 'CVP', PAP: 'PAP', IBP3: 'PAP', IBP4: 'IBP' };` with `const IBP_SCALE_KEY: Partial<Record<LaneId, string>> = { ART: 'ART', IBP1: 'ART', CVP: 'CVP', IBP2: 'CVP', PAP: 'PAP', IBP3: 'PAP', IBP4: 'IBP', ICP: 'ICP' }; // Stage 7d: ICP` (the skins' IBP scale tables carry an `ICP` row); replace `const WAVE_LANE: Record<WaveLaneId, LaneId> = { abp: 'ART', pleth: 'PLETH', cvp: 'CVP', pap: 'PAP', co2: 'CO2', resp: 'RESP' }; // Stage 3: co2, resp` with `const WAVE_LANE: Record<WaveLaneId, LaneId> = { abp: 'ART', pleth: 'PLETH', cvp: 'CVP', pap: 'PAP', co2: 'CO2', resp: 'RESP', icp: 'ICP' }; // Stage 3: co2, resp; Stage 7d: icp`.
  - `packages/renderer/src/index.ts`: after `export { formatEtco2, formatRr, formatSpo2, formatTemp } from './numerics-resp.ts'; // Stage 3` add `export { formatIcp, formatPbto2, formatUop } from './numerics-organs.ts'; // Stage 7d`.

- [ ] **Step 4: Run the renderer suite and typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/renderer test && npx -y pnpm@9.15.9 typecheck`
Expected: PASS (prototype: renderer 69 tests; whole-repo typecheck clean).

- [ ] **Step 5: Commit and push**

```bash
git add packages/renderer docs/plans/stage-7d-organs.md
git commit -m "feat(renderer): icp lane, ICP/CPP, PbtO2, UOP tile formatters, tile numerics and units

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7d-organs
```

### Task 17: Check 19 treatments through the engine — hyperventilation, mannitol and hypertonic saline (7g drug events, E-7d-1), head-up

**Files:**
- Create: `packages/engine-core/test/engine/organs-tbi-treatment.test.ts`
- Modify (declared exception **E-7d-1**, R51 addendum 14; additive, minimal, marked `// Stage 7d E-7d-1`): `packages/engine-core/src/types-pk.ts`, `packages/engine-core/src/l2/pk/pipeline.ts`, `packages/engine-core/src/l2/pk/data/rows-other.ts` (7g's files)

**Interfaces:**
- Consumes: `organsRig` (Task 12); 7g's `drug` event and `bus.doses` (the organ pipeline observes them, Task 11); Stage 3's `ventilation` event.
- Produces: `PkClinicalEvent` `drug` gains `concentrationPct?: number` (hypertonic saline only: 3 | 7.5 | 23.4, default 3); `DoseLogEntry` gains `concentrationPct?: number` — 7c takes the sodium load and 7d the osmotic effect from the same entry.

- [ ] **Step 1: Write the test** — `packages/engine-core/test/engine/organs-tbi-treatment.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { organsRig } from '../helpers/organs.ts';

const TBI = { weightKg: 70, baseline: { sbp: 110, dbp: 72, hr: 80 }, conditions: [{ id: 'tbi', severity: 1 }] };
const VENT = { kind: 'ventilation', source: 'ventilator', vtMl: 500, fio2: 0.4, peep: 5 }; // RR 18 → PaCO2 ≈ 40 (Task 13)
async function atIcp20() {
  const r = organsRig({ seed: 5, patient: TBI });
  r.send({ type: 'applyEvent', event: { ...VENT, rr: 18 } });
  await r.run(120);
  r.send({ type: 'applyEvent', event: { kind: 'brain', massMl: 15 } });
  await r.run(600);
  return r;
}

describe('check 19 treatments through the engine (drugs are 7g events; 7d observes bus.doses)', { timeout: 300_000 }, () => {
  it('hyperventilation: ICP −25–30 % by the time PaCO2 reaches 30', async () => {
    const r = await atIcp20();
    const before = r.last().brain.icp;
    const pc0 = r.last().brain.paco2;
    r.send({ type: 'applyEvent', event: { ...VENT, rr: 30 } }); // RR 24 only reached PaCO2 31.6 in 15 min (Stage 3's CO2 stores)
    let atTarget = -1;
    let tAt = -1;
    const t0 = r.e.now().simT;
    await r.run(900, () => {
      if (atTarget < 0 && r.last().brain.paco2 <= 30) {
        atTarget = r.last().brain.icp;
        tAt = r.e.now().simT - t0;
      }
    });
    const drop = 1 - atTarget / before;
    console.log({ before, pc0, atTarget, tAtS: tAt, drop }); // gate-note numbers
    expect(atTarget).toBeGreaterThan(0); // PaCO2 30 was reached
    expect(drop).toBeGreaterThanOrEqual(0.25); // tables −25–30 %
    expect(drop).toBeLessThanOrEqual(0.3);
  });
  it('mannitol 1 g/kg (7g drug event): ICP −25 % vs a same-seed control over 15–30 min; osmotic diuresis', async () => {
    const ctl = await atIcp20();
    const man = await atIcp20();
    man.send({ type: 'applyEvent', event: { kind: 'drug', drugId: 'mannitol', dose: 1, unit: 'g/kg', route: 'iv' } });
    const rel: number[] = [];
    for (const m of [15, 20, 30]) {
      const s = m * 60 - (rel.length === 0 ? 0 : [15, 20, 30][rel.length - 1]! * 60);
      await ctl.run(s);
      await man.run(s);
      rel.push(1 - man.last().brain.icp / ctl.last().brain.icp);
    }
    console.log({ rel, uopMan: man.last().kidney.uopMlKgH, uopCtl: ctl.last().kidney.uopMlKgH });
    // check 19 "−25 % over 15–30 min": the fall crosses 25 % (±15 %) inside the window; the drug row bounds it at −20–40 %
    expect(rel[0]).toBeLessThanOrEqual(0.25 * 1.15); // prototype 0.252 at 15 min
    expect(rel[2]).toBeGreaterThanOrEqual(0.25 * 0.85); // prototype 0.322 at 30 min
    for (const x of rel) {
      expect(x).toBeGreaterThanOrEqual(0.2);
      expect(x).toBeLessThanOrEqual(0.4);
    }
    expect(man.last().kidney.uopMlKgH).toBeGreaterThan(2 * ctl.last().kidney.uopMlKgH); // osmotic diuresis
  });
  it('hypertonic saline 3 % 250 mL (7g drug event, concentrationPct — E-7d-1): ICP −20–40 % at 10 min', async () => {
    const ctl = await atIcp20();
    const hts = await atIcp20();
    hts.send({ type: 'applyEvent', event: { kind: 'drug', drugId: 'hypertonicSaline', dose: 250, unit: 'mL', route: 'iv', concentrationPct: 3 } });
    await ctl.run(600);
    await hts.run(600);
    const rel = 1 - hts.last().brain.icp / ctl.last().brain.icp;
    console.log({ htsRel10: rel });
    expect(rel).toBeGreaterThanOrEqual(0.2);
    expect(rel).toBeLessThanOrEqual(0.4);
  });
  it('E-7d-1: 7g validates concentrationPct (HTS only: 3, 7.5, 23.4; default 3) and logs it on bus.doses', () => {
    const e = createEngine({ seed: 1, patient: { weightKg: 70 } });
    let n = 0;
    const d = (event: Record<string, unknown>) => e.dispatch({ id: `h${++n}`, issuedBy: 't', type: 'applyEvent', event: { kind: 'drug', route: 'iv', ...event } } as never);
    expect(d({ drugId: 'hypertonicSaline', dose: 30, unit: 'mL', concentrationPct: 5 }).accepted).toBe(false);
    expect(d({ drugId: 'mannitol', dose: 1, unit: 'g/kg', concentrationPct: 3 }).accepted).toBe(false);
    expect(d({ drugId: 'hypertonicSaline', dose: 30, unit: 'mL', concentrationPct: 23.4 }).accepted).toBe(true);
    const osm = (e as unknown as { st: { organs: { brain: { osm: { mosm: number }[] } } } }).st.organs.brain.osm;
    e.step(10);
    expect(osm.map((x) => Math.round(x.mosm))).toEqual([240]); // 30 mL × 23.4 % = 7.02 g NaCl × 34.2 mOsm/g
  });
  it('head-up 30°: ICP −3 to −8 mmHg within 2 min', async () => {
    const r = await atIcp20();
    const before = r.last().brain.icp;
    r.send({ type: 'applyEvent', event: { kind: 'position', headUpDeg: 30 } });
    await r.run(120);
    console.log({ headUp: before - r.last().brain.icp });
    expect(before - r.last().brain.icp).toBeGreaterThanOrEqual(3); // tables −5.6 (−3 to −8)
    expect(before - r.last().brain.icp).toBeLessThanOrEqual(8);
  });
});
```

- [ ] **Step 2: Run it to verify the E-7d-1 tests fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/organs-tbi-treatment.test.ts`
Expected: the `E-7d-1` test FAILS (7g accepts `concentrationPct 5` and logs no percentage, so the organs read 30 mL as 3 %: 31 mOsm, not 240); the hyperventilation, mannitol, 3 % HTS (the default) and head-up tests pass.

- [ ] **Step 3: E-7d-1 in 7g's files** (exactly these three edits; nothing else in `l2/pk/**`):
  - `packages/engine-core/src/types-pk.ts`: replace
    `  | { kind: 'drug'; drugId: string; dose: number; unit: DoseUnit | RateUnit; route: PkRoute; infusion?: boolean; overS?: number }`
    with
    `  | { kind: 'drug'; drugId: string; dose: number; unit: DoseUnit | RateUnit; route: PkRoute; infusion?: boolean; overS?: number; concentrationPct?: number } // concentrationPct: hypertonic saline 3 | 7.5 | 23.4 (default 3) — Stage 7d E-7d-1`
    and replace
    `export interface DoseLogEntry { agent: string; mgPerKg: number | null; amount: number; amountUnit: string; t: SimSeconds }`
    with
    `export interface DoseLogEntry { agent: string; mgPerKg: number | null; amount: number; amountUnit: string; t: SimSeconds; concentrationPct?: number } // Stage 7d E-7d-1: hypertonic saline only (7c Na load, 7d osmotic ICP effect)`
  - `packages/engine-core/src/l2/pk/pipeline.ts`, `validatePkCommand`: after the line `  if (!(Number.isFinite(d.dose) && d.dose >= 0)) return 'dose must be ≥ 0';` add
    `  if (d.concentrationPct !== undefined && (row.id !== 'hypertonicSaline' || ![3, 7.5, 23.4].includes(d.concentrationPct))) return 'concentrationPct is hypertonic saline only: 3, 7.5 or 23.4'; // Stage 7d E-7d-1`;
    in `applyPkCommand`, replace
    `  const logDose = (amount: number) => pk.pending.push({ agent: row.id, mgPerKg: mgPerKgOf(row, amount, w), amount, amountUnit: row.amountUnit, t });`
    with
```ts
  const pct = ev.kind === 'drug' && row.id === 'hypertonicSaline' ? (ev.concentrationPct ?? 3) : undefined; // Stage 7d E-7d-1
  const logDose = (amount: number) => pk.pending.push({ agent: row.id, mgPerKg: mgPerKgOf(row, amount, w), amount, amountUnit: row.amountUnit, t, ...(pct !== undefined ? { concentrationPct: pct } : {}) });
```
  - `packages/engine-core/src/l2/pk/data/rows-other.ts`, the `hypertonicSaline` row: change `name: 'Hypertonic saline 3 %/7.5 %'` to `name: 'Hypertonic saline 3 %/7.5 %/23.4 %'` and `doses: '3 %: 2–5 mL/kg; 7.5 %: 250 mL'` to `doses: '3 %: 2–5 mL/kg; 7.5 %: 250 mL; 23.4 %: 30 mL (event concentrationPct, default 3 — Stage 7d E-7d-1)'`.

- [ ] **Step 4: Run the tests (and 7g's)**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/organs-tbi-treatment.test.ts test/l2/pk test/engine/pk-*.test.ts`
Expected: PASS (7g's own tests unchanged). **Prototype:** hyperventilation RR 30 — PaCO2 30 reached at ≈ 5 min (RR 24 only reached 31.6 in 15 min: Stage 3's CO2 stores), ICP **−28.2 %** there (tables −25–30 %); mannitol 1 g/kg — **−25.2 / −28.2 / −32.2 %** at 15 / 20 / 30 min, UOP 6.0 vs 1.7 mL/kg/h; HTS 3 % 250 mL — **−25.6 %** at 10 min; head-up — **−6.2** mmHg; 23.4 % 30 mL → 240 mOsm on the brain.

- [ ] **Step 5: Commit and push**

```bash
git add packages/engine-core/test/engine/organs-tbi-treatment.test.ts packages/engine-core/src/types-pk.ts packages/engine-core/src/l2/pk/pipeline.ts packages/engine-core/src/l2/pk/data/rows-other.ts docs/plans/stage-7d-organs.md
git commit -m "test(organs): check 19 treatments through the engine; feat(pk): hypertonic saline concentrationPct on the drug event and bus.doses (E-7d-1)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7d-organs
```

### Task 18: Sanity check 18 — hypertensive elderly under GA, hyperventilation, recovery

**Files:**
- Create: `packages/engine-core/test/engine/organs-htn.test.ts`

**Interfaces:**
- Consumes: `organsRig` (Task 12); Stage 3's `thermal` and `ventilation` events; MANUAL `setTarget`.

- [ ] **Step 1: Write the test** — `packages/engine-core/test/engine/organs-htn.test.ts`

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { organsRig } from '../helpers/organs.ts';

const VENT = { kind: 'ventilation', source: 'ventilator', vtMl: 500, fio2: 0.25, peep: 5 }; // FiO2 0.25: PaO2 ≈ 100–130
type Check18 = { base: number; mapLow: number; low: number; hypo: number; pbto2: number; mapRec: number; recovered: number };

async function check18(): Promise<Check18> {
  const r = organsRig({ seed: 4, patient: { ageY: 75, weightKg: 70, conditions: [{ id: 'htn' }], baseline: { sbp: 140, dbp: 80 } } });
  r.send({ type: 'applyEvent', event: { kind: 'thermal', anaesthesia: 'general' } });
  r.send({ type: 'applyEvent', event: { ...VENT, rr: 18 } }); // PaCO2 ≈ 38 (Task 13: Stage 3's dead space)
  await r.run(300);
  const base = r.last().brain.cbf;
  // MANUAL targets that give the scenario's site MAPs in this elderly profile (7a's tracker abandons unreachable
  // SBP/DBP pairs after 60 s): 90/52 → MAP 65, 100/60 → MAP 82
  r.send({ type: 'setTarget', variable: 'sbp', value: 90, ramp: { durationS: 30 } });
  r.send({ type: 'setTarget', variable: 'dbp', value: 52, ramp: { durationS: 30 } });
  await r.run(240);
  const mapLow = r.last().brain.mapHead;
  const low = r.last().brain.cbf / base;
  r.send({ type: 'applyEvent', event: { ...VENT, rr: 40 } });
  let hypo = -1;
  let pbto2 = -1;
  await r.run(1500, () => {
    if (hypo < 0 && r.last().brain.paco2 <= 25) {
      hypo = r.last().brain.cbf / base;
      pbto2 = r.last().brain.pbto2;
    }
  });
  r.send({ type: 'setTarget', variable: 'sbp', value: 100, ramp: { durationS: 30 } });
  r.send({ type: 'setTarget', variable: 'dbp', value: 60, ramp: { durationS: 30 } });
  r.send({ type: 'applyEvent', event: { ...VENT, rr: 14 } });
  let recovered = -1;
  let mapRec = -1;
  await r.run(1800, () => {
    if (recovered < 0 && r.last().brain.paco2 >= 35) {
      recovered = r.last().brain.cbf / base;
      mapRec = r.last().brain.mapHead;
    }
  });
  const n = { base, mapLow, low, hypo, pbto2, mapRec, recovered };
  console.log(n); // gate-note numbers
  return n;
}

describe('tables §7 check 18 through the engine (MANUAL, 75 y HTN, cbfLL 75, GA)', { timeout: 300_000 }, () => {
  let n: Check18;
  beforeAll(async () => {
    n = await check18();
  }, 300_000);
  it('MAP 65 below the right-shifted plateau: CBF ≈ 70 % (±15 %) of the anaesthetised baseline', () => {
    expect(n.mapLow).toBeGreaterThan(62); // premise; prototype 64.7
    expect(n.mapLow).toBeLessThan(68);
    expect(n.low).toBeGreaterThanOrEqual(0.7 * 0.85); // prototype 0.62 (CPP 53: CVP ≈ 12 under PEEP is the venous floor)
    expect(n.low).toBeLessThanOrEqual(0.7 * 1.15);
  });
  it('hypocapnia PaCO2 25: CBF 35–40 % of the anaesthetised baseline; PbtO2 10–15', () => {
    expect(n.hypo).toBeGreaterThanOrEqual(0.35); // prototype 0.376 (the pure model gives 0.417 at CVP 6: see Deviations)
    expect(n.hypo).toBeLessThanOrEqual(0.4);
    expect(n.pbto2).toBeGreaterThanOrEqual(10); // prototype 13.8
    expect(n.pbto2).toBeLessThanOrEqual(15);
  });
  it('restoring PaCO2 35 and MAP ≈ 80: CBF > 80 %', () => {
    expect(n.mapRec).toBeGreaterThan(77); // premise; prototype 81.1 (at 79 CBF was 0.77: CPP 67 with CVP 12, below LL 75)
    expect(n.mapRec).toBeLessThan(84);
    expect(n.recovered).toBeGreaterThan(0.8); // prototype 0.81
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/organs-htn.test.ts`
Expected: PASS (3 tests, ≈ 30 s). **Prototype:** baseline GA CBF 0.66 (MAP 113 at the 140/80 profile); 90/52 → site MAP **64.7**, CPP 53 (CVP ≈ 12 under PEEP is the venous floor), CBF **0.62×**; RR 40 → PaCO2 25 crossed at ≈ 3 min: **0.376×**, PbtO2 **13.8**; 100/60 + RR 14 → PaCO2 35 crossed at MAP **81**: **0.81×**. These bands are the tables' (R45): the pure model's 0.42× hypocapnic value (CVP 6) is in the Deviations, the engine's is inside 0.35–0.40. If the premise assertions (MAP 62–68, 77–84) fail on your base because 7a's MANUAL tracker moved, choose the targets that give those site MAPs and record them — do not move the CBF bands.

- [ ] **Step 3: Commit and push**

```bash
git add packages/engine-core/test/engine/organs-htn.test.ts docs/plans/stage-7d-organs.md
git commit -m "test(organs): check 18 through the engine — HTN autoregulation shift, hypocapnia and recovery under GA

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7d-organs
```

### Task 19: The renal story and check 20 through the engine

**Files:**
- Create: `packages/engine-core/test/engine/organs-renal.test.ts`

**Interfaces:**
- Consumes: `organsRig` (Task 12); MANUAL `setTarget` (`volumeStatus`, `sbp`, `dbp`, `hr`); 7a's `hfref` condition (MODELED); 7g's dobutamine infusion; `cardiacOutput` (read only).

- [ ] **Step 1: Write the test** — `packages/engine-core/test/engine/organs-renal.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { cardiacOutput } from '../../src/l2/gas/coupling.ts';
import type { HemoState } from '../../src/l2/hemo/pipeline.ts';
import { organsRig } from '../helpers/organs.ts';

const hemoOf = (e: unknown) => (e as { st: { hemo: HemoState } }).st.hemo;

describe('kidney through the engine', { timeout: 300_000 }, () => {
  it('MANUAL haemorrhage (volumeStatus 0.2, MAP ≈ 60) → UOP < 0.3 and the OLIGURIA flag (tables 17a); fluids → > 0.5 by 90 min', async () => {
    const r = organsRig({ seed: 6, patient: { weightKg: 70 } });
    r.send({ type: 'attachSensor', sensor: 'urometer', state: 'on' });
    await r.run(600);
    const rest = r.last().kidney.uopMlKgH;
    r.send({ type: 'setTarget', variable: 'volumeStatus', value: 0.2, ramp: { durationS: 600 } });
    r.send({ type: 'setTarget', variable: 'sbp', value: 85, ramp: { durationS: 600 } });
    r.send({ type: 'setTarget', variable: 'dbp', value: 50, ramp: { durationS: 600 } });
    r.send({ type: 'setTarget', variable: 'hr', value: 125, ramp: { durationS: 600 } });
    await r.run(1800);
    const oliguric = r.last().kidney.uopMlKgH;
    const flag = r.last().kidney.oliguria;
    const lacBleed = r.last().liver.lactate;
    r.send({ type: 'setTarget', variable: 'volumeStatus', value: 0.95, ramp: { durationS: 900 } });
    r.send({ type: 'setTarget', variable: 'sbp', value: 118, ramp: { durationS: 900 } });
    r.send({ type: 'setTarget', variable: 'dbp', value: 72, ramp: { durationS: 900 } });
    r.send({ type: 'setTarget', variable: 'hr', value: 85, ramp: { durationS: 900 } });
    await r.run(5400);
    const recovered = r.last().kidney.uopMlKgH;
    console.log({ rest, oliguric, flag, lacBleed, recovered, lactateEnd: r.last().liver.lactate }); // gate-note numbers
    expect(rest).toBeGreaterThan(0.8); // prototype 1.02 (the MANUAL default 120/80 site)
    expect(oliguric).toBeLessThan(0.3); // tables 17a
    expect(flag).toBe(true);
    expect(recovered).toBeGreaterThan(0.5); // [ENG band] neurohumoral washout τ 45 min (Task 9)
  });
  // Tables §7 check 20 premise: MAP 65, CVP 12, CO 3.5 (RPP 53). On this base NEITHER mode reaches it: MANUAL
  // `contractility`/`svr` targets do not move 7a's CO (6.4 L/min at an 85/55 target), and MODELED `hfref` severity 1
  // rests compensated (MAP 87, CVP 8, CO 5.6 → UOP 0.66; dobutamine 5: CO +13 %, UOP 0.84 at 60 min; G7g NR-7g-2).
  // R45: not re-specified. The kidney's check-20 numbers are Task 9's (model level, 0.114 → 0.233/0.284). FU-2 request
  // to 7a's owner for a low-output HFrEF profile; flip to `it` when it lands.
  it.fails('check 20 (MODELED hfref): low-output premise, UOP 0.1–0.15; dobutamine → CO +20–40 %, UOP 0.2–0.3 in 30–60 min', async () => {
    const r = organsRig({ seed: 7, mode: 'modeled', patient: { weightKg: 70, conditions: [{ id: 'hfref', severity: 1 }] } });
    await r.run(3600);
    const co0 = cardiacOutput(hemoOf(r.e), 0);
    const pre = { map: r.last().brain.mapHead, co: co0, uop: r.last().kidney.uopMlKgH };
    r.send({ type: 'applyEvent', event: { kind: 'drug', drugId: 'dobutamine', dose: 5, unit: 'mcg/kg/min', route: 'iv', infusion: true } });
    await r.run(1800);
    const u30 = r.last().kidney.uopMlKgH;
    await r.run(1800);
    const post = { co: cardiacOutput(hemoOf(r.e), 0), u30, u60: r.last().kidney.uopMlKgH };
    console.log({ pre, post });
    expect(pre.map).toBeLessThanOrEqual(70); // premise (prototype 87)
    expect(pre.co).toBeLessThanOrEqual(4); // premise (prototype 5.6)
    expect(pre.uop).toBeGreaterThanOrEqual(0.1);
    expect(pre.uop).toBeLessThanOrEqual(0.15);
    expect(post.co / pre.co).toBeGreaterThanOrEqual(1.2);
    expect(post.u30).toBeGreaterThanOrEqual(0.2);
    expect(post.u60).toBeLessThanOrEqual(0.3);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/organs-renal.test.ts`
Expected: PASS (2 tests, one `it.fails`; ≈ 32 s). **Prototype:** rest UOP 1.02; volumeStatus 0.2 (MAP ≈ 60): **0.003** and the OLIGURIA flag; fluids → **0.69** at 90 min; lactate (fallback pool) 1.27 at the bleed's end. Check 20: MODELED `hfref` severity 1 rests at MAP **87**, CO **5.6**, UOP **0.67**; dobutamine 5 µg/kg/min → CO 6.4, UOP 0.84 at 60 min — the premise is not reachable on this base (Deviations, R-7D-5b/c); the kidney's check-20 numbers are Task 9's. When 7a gains a low-output HFrEF profile, flip the `it.fails` and record the numbers.

- [ ] **Step 3: Commit and push**

```bash
git add packages/engine-core/test/engine/organs-renal.test.ts docs/plans/stage-7d-organs.md
git commit -m "test(organs): haemorrhage oliguria and recovery through the engine; check 20 premise recorded (it.fails until 7a has a low-output HFrEF)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7d-organs
```

### Task 20: Curve acceptance through the engine — autoregulation, CO2 reactivity, PVI per mL, UOP vs RPP, lactate τ

**Files:**
- Create: `packages/engine-core/test/engine/organs-curves.test.ts`

**Interfaces:**
- Consumes: `organsRig` (Task 12), `autoregIntact`/`co2Factor` (Task 4), `ANURIA_ML_KG_H` (Task 8), `OrgansState.lp`/`iap` (Task 11); the `renal { iapMmHg }` event.

- [ ] **Step 1: Write the test** — `packages/engine-core/test/engine/organs-curves.test.ts` (each point ≤ 30 simulated minutes; the rig yields every minute)

```ts
import { describe, expect, it } from 'vitest';
import { autoregIntact, co2Factor } from '../../src/l2/brain/flow.ts';
import type { OrgansState } from '../../src/l2/organs/pipeline.ts';
import { ANURIA_ML_KG_H } from '../../src/l2/renal/params.ts';
import { organsRig, type OrgansRig } from '../helpers/organs.ts';

const organsOf = (r: OrgansRig) => (r.e as unknown as { st: { organs: OrgansState } }).st.organs;
async function holdMap(r: OrgansRig, sbp: number, dbp: number, s: number) {
  r.send({ type: 'setTarget', variable: 'sbp', value: sbp, ramp: { durationS: 20 } });
  r.send({ type: 'setTarget', variable: 'dbp', value: dbp, ramp: { durationS: 20 } });
  await r.run(s);
}
/** Tables §5.2 U(RPP): 0 at ≤ 40, linear to 1 at 100 (then 3× at 150). */
const uTables = (rpp: number) => Math.max(0, Math.min(1, (rpp - 40) / 60));

describe('Stage 7d curves through the engine (MANUAL, awake adult)', { timeout: 300_000 }, () => {
  it('autoregulation (tables A): CBF = A(CPP)·C(PaCO2) at the measured inputs; plateau 1 ± 0.05 over CPP 60–150', async () => {
    const r = organsRig({ seed: 21, patient: { weightKg: 70 } });
    await r.run(120);
    const pts: { cpp: number; a: number }[] = [];
    for (const [s, d] of [[70, 40], [85, 50], [100, 62], [120, 80], [150, 100], [185, 125]] as const) {
      await holdMap(r, s, d, 180);
      const b = r.last().brain;
      pts.push({ cpp: b.cpp, a: b.cbf / co2Factor(b.paco2) });
    }
    console.log(pts); // gate-note numbers
    for (const p of pts) expect(Math.abs(p.a - autoregIntact(p.cpp, 60, 150))).toBeLessThan(0.05);
    const plateau = pts.filter((p) => p.cpp >= 60 && p.cpp <= 150);
    expect(plateau.length).toBeGreaterThanOrEqual(3);
    for (const p of plateau) expect(Math.abs(p.a - 1)).toBeLessThanOrEqual(0.05);
    expect(pts.some((p) => p.cpp < 55)).toBe(true); // the curve's lower limb was visited
  });
  it('CO2 reactivity (tables kCO2 0.03/mmHg ±15 %): regression of CBF on PaCO2 across ventilator steps', async () => {
    const r = organsRig({ seed: 22, patient: { weightKg: 70 } });
    const xs: number[] = [];
    const ys: number[] = [];
    for (const rr of [10, 18, 30]) {
      r.send({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr, vtMl: 500, fio2: 0.3, peep: 5 } });
      await r.run(300, () => {
        xs.push(r.last().brain.paco2);
        ys.push(r.last().brain.cbf);
      });
    }
    const mx = xs.reduce((a, x) => a + x, 0) / xs.length;
    const my = ys.reduce((a, y) => a + y, 0) / ys.length;
    const slope = xs.reduce((a, x, i) => a + (x - mx) * ((ys[i] as number) - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    console.log({ slope, paco2: [Math.min(...xs), Math.max(...xs)] });
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(10);
    expect(slope).toBeGreaterThanOrEqual(0.03 * 0.85);
    expect(slope).toBeLessThanOrEqual(0.03 * 1.15);
  });
  it('PVI (tables pvi 25): +1 mL at rest raises ICP by 9.65 % (±15 %) within 1 s, before CSF moves', async () => {
    const r = organsRig({ seed: 23, patient: { weightKg: 70 } });
    await r.run(60);
    const icp0 = organsOf(r).brain.icp;
    r.send({ type: 'applyEvent', event: { kind: 'brain', massMl: 1 } });
    await r.run(1);
    const rise = organsOf(r).brain.icp / icp0 - 1;
    console.log({ icp0, rise });
    expect(rise).toBeGreaterThanOrEqual(0.0965 * 0.85);
    expect(rise).toBeLessThanOrEqual(0.0965 * 1.15);
  });
  it('UOP vs RPP (tables §5.2 U): UOP0 1.0 ± 15 % at rest, U(150)/U(100) = 3 ± 15 %, RBF flat over RPP 80–180, 0 at RPP ≤ 40', async () => {
    const r = organsRig({ seed: 24, patient: { weightKg: 70 } });
    await r.run(1800);
    const rest = { uop: r.last().kidney.uopMlKgH, rbf: r.last().kidney.rbf };
    const step = async (sbp: number, dbp: number) => {
      await holdMap(r, sbp, dbp, 1800);
      const o = organsOf(r);
      return { uop: r.last().kidney.uopMlKgH, rbf: r.last().kidney.rbf, rpp: o.lp.map - Math.max(o.lp.cvp, o.iap) };
    };
    const lo = await step(128, 86); // RPP ≈ 100
    const hi = await step(180, 122); // RPP ≈ 150
    r.send({ type: 'applyEvent', event: { kind: 'renal', iapMmHg: 25 } }); // abdominal compartment: RPP = MAP − IAP
    const zero = await step(40, 22);
    console.log({ rest, lo, hi, zero }); // gate-note numbers
    expect(rest.uop).toBeGreaterThanOrEqual(0.85);
    expect(rest.uop).toBeLessThanOrEqual(1.15);
    expect(Math.abs(lo.rpp - 100)).toBeLessThan(10); // premises
    expect(Math.abs(hi.rpp - 150)).toBeLessThan(10);
    expect(hi.uop / lo.uop).toBeGreaterThanOrEqual(3 * 0.85);
    expect(hi.uop / lo.uop).toBeLessThanOrEqual(3 * 1.15);
    for (const x of [lo, hi]) expect(Math.abs(x.rbf / rest.rbf - 1)).toBeLessThan(0.05);
    expect(zero.rpp).toBeLessThanOrEqual(40);
    expect(zero.uop).toBeLessThan(ANURIA_ML_KG_H); // anuria (prototype 0.010 at RPP 37.9)
  });
  // Decision 8 deviation (Pulse's reabsorption quadratic, not the tables' linear U): the mid-curve sits above the line.
  it.fails('UOP mid-curve (tables U linear 40 → 100): U(RPP 75) = 0.58 ± 15 % (prototype 0.76, decision 8)', async () => {
    const r = organsRig({ seed: 25, patient: { weightKg: 70 } });
    await holdMap(r, 104, 66, 1800);
    const o = organsOf(r);
    const rpp = o.lp.map - o.lp.cvp;
    console.log({ rpp, uop: r.last().kidney.uopMlKgH, uTables: uTables(rpp) });
    expect(r.last().kidney.uopMlKgH / uTables(rpp)).toBeLessThanOrEqual(1.15);
  });
  it('lactate clearance (tables kLac t½ 20–60 min): the fallback pool from 5 mmol/L is 2.4–3.8 after 30 min (t½ 30 → 3.0)', async () => {
    const r = organsRig({ seed: 26, patient: { weightKg: 70 } });
    await r.run(60);
    organsOf(r).liver.lactate = 5;
    await r.run(1800);
    console.log({ lactate30: r.last().liver.lactate });
    expect(r.last().liver.lactate).toBeGreaterThanOrEqual(2.4);
    expect(r.last().liver.lactate).toBeLessThanOrEqual(3.8);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/organs-curves.test.ts`
Expected: PASS (6 tests, one `it.fails`; ≈ 24 s). **Prototype:** A(CPP) matched within 0.01 at CPP 40/57/67/86/111/142 (plateau 0.98); CO2 slope **0.029**/mmHg over PaCO2 32–49; PVI **+8.9 %** per mL; UOP rest **1.07**, RPP 97 → **1.21**, RPP 144 → **3.44** (ratio 2.85), RBF within 1 %, IAP 25 at MAP 60 (RPP 38) → **0.010**; mid-curve RPP 75 → **0.79** vs the tables' 0.58 (decision 8, `it.fails`); lactate 5 → **2.79** at 30 min. The MANUAL MAP steps are reached through 7a's tracker, so each assertion uses the MEASURED CPP/RPP (and asserts the premise) rather than the target. The Cushing-threshold curve of the first draft is covered by Task 5 (29 s no / 31 s yes, both triggers) and Task 13 (engine onset).

- [ ] **Step 3: Commit and push**

```bash
git add packages/engine-core/test/engine/organs-curves.test.ts docs/plans/stage-7d-organs.md
git commit -m "test(organs): curve acceptance through the engine — autoregulation, CO2 reactivity, PVI, UOP vs RPP, lactate clearance

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7d-organs
```

### Task 21: Determinism, CPU budget, 24 h no-drift

**Files:**
- Create: `packages/engine-core/test/engine/organs-soak.test.ts`

**Interfaces:**
- Consumes: `organsRig` (Task 12), `advanceOrgans`/`OrgansCtx`/`OrgansState` (Task 11), `LONGRUN_HOURS`/`LONGRUN_S`/`expectedIndex` from `test/helpers/longrun.ts` (CI rule amendment).

- [ ] **Step 1: Write the test** — `packages/engine-core/test/engine/organs-soak.test.ts`

```ts
// Stage 7d soak. CI rule: the long-run horizon is test/helpers/longrun.ts (24 h locally, 6 h on the 2-vCPU CI runner).
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { advanceOrgans, type OrgansCtx, type OrgansState } from '../../src/l2/organs/pipeline.ts';
import { expectedIndex, LONGRUN_HOURS, LONGRUN_S } from '../helpers/longrun.ts';
import { organsRig } from '../helpers/organs.ts';

async function hashRun(seed: number): Promise<string> {
  const r = organsRig({ seed, patient: { weightKg: 70, conditions: [{ id: 'tbi', severity: 1 }] } });
  r.send({ type: 'attachSensor', sensor: 'icp', state: 'on' });
  r.send({ type: 'applyEvent', event: { kind: 'brain', massRateMlPerMin: 0.5 } });
  await r.run(300);
  const n = r.e.latestSampleIndex('icp');
  const buf = new Float32Array(125 * 60);
  r.e.readSamples('icp', n - buf.length + 1, buf);
  return createHash('sha256').update(Buffer.from(buf.buffer)).update(JSON.stringify(r.last())).digest('hex');
}

describe('Stage 7d soak', () => {
  it('determinism: same seed → identical icp samples and organ state; another seed differs', { timeout: 300_000 }, async () => {
    expect(await hashRun(11)).toBe(await hashRun(11));
    expect(await hashRun(11)).not.toBe(await hashRun(12));
  });
  it(`${LONGRUN_HOURS} h at rest: no drift of the means (ICP ±0.1, hourly UOP ±2 %, lactate ±0.02); latestSampleIndex(icp) = 125 × t + 12 (24 h locally, 6 h on CI)`, { timeout: 1_800_000 }, async () => {
    const r = organsRig({ seed: 1, patient: { weightKg: 70 } });
    r.send({ type: 'attachSensor', sensor: 'icp', state: 'on' });
    // settle first: 7a's CO rises 5.6 → 6.4 L/min over the first hour, so the fallback lactate pool (τ ≈ 40 min) and the
    // neurohumoral factor (washout τ 45 min) move until ≈ 2 h (prototype: lactate 0.99 → 0.91, UOP 1.02 → 1.05)
    const snap = () => {
      const w = r.organs.slice(-60); // drift is judged on means: one sample moves UOP ≈ 2 %/mmHg of MAP noise
      const m = (f: (o: (typeof w)[number]) => number) => w.reduce((x, o) => x + f(o), 0) / w.length;
      return { icp: m((o) => o.brain.icp), uop: r.last().kidney.uop1hMlKgH, lactate: m((o) => o.liver.lactate) };
    };
    await r.run(7200);
    const a = snap();
    await r.run(LONGRUN_S - 7200 - 0.02); // the send() above stepped one tick
    const b = snap();
    console.log({ a, b }); // gate-note numbers
    expect(Math.abs(b.icp - a.icp)).toBeLessThan(0.1);
    expect(Math.abs(b.uop / a.uop - 1)).toBeLessThan(0.02);
    expect(Math.abs(b.lactate - a.lactate)).toBeLessThan(0.02);
    expect(r.e.latestSampleIndex('icp')).toBe(expectedIndex(125, 12)); // the 100 ms look-ahead at 125 Hz, as abp
  });
  it('CPU: the organ pipeline alone costs ≤ 0.05 ms per 20 ms tick', { timeout: 300_000 }, async () => {
    const r = organsRig({ seed: 1, patient: { weightKg: 70 } });
    r.send({ type: 'attachSensor', sensor: 'icp', state: 'on' });
    await r.run(60);
    const st = (r.e as unknown as { st: OrgansCtx & { organs: OrgansState; hr: unknown } }).st;
    const os = structuredClone(st.organs);
    const ctx: OrgansCtx = { l1: st.l1, hemo: st.hemo, resp: st.resp, rhythm: st.rhythm, hrNow: () => 75, setHr: () => {} };
    let m = os.m;
    const ticks = 30_000;
    const t0 = performance.now();
    for (let i = 0; i < ticks; i++) {
      m += 2.5;
      advanceOrgans(os, ctx, Math.floor(m), () => {});
    }
    const per = (performance.now() - t0) / ticks;
    console.log({ organsPerTickMs: per });
    expect(per).toBeLessThanOrEqual(0.05);
  });
});
```

- [ ] **Step 2: Run it** — locally the 24 h horizon (record the wall time), then as CI does:

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/organs-soak.test.ts && CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/organs-soak.test.ts`
Expected: PASS. **Prototype:** determinism ✓; organ pipeline alone **0.00097 ms**/tick; 24 h locally (275 s wall): means ICP 9.97 → 9.89, hourly UOP 1.074 → 1.079, lactate 0.906 → 0.901; `latestSampleIndex('icp')` = 125·t + 12 (the 100 ms look-ahead, as `abp`). The first 2 h are excluded on purpose: 7a's CO rises 5.6 → 6.4 L/min in the first hour, so the fallback lactate pool (τ ≈ 40 min) and the neurohumoral factor (washout 45 min) settle (0.99 → 0.91, 1.02 → 1.05); single samples are not used for drift (one sample moves UOP ≈ 2 %/mmHg of MAP noise).

- [ ] **Step 3: Commit and push**

```bash
git add packages/engine-core/test/engine/organs-soak.test.ts docs/plans/stage-7d-organs.md
git commit -m "test(organs): determinism, CPU budget, long-run no-drift (24 h locally, 6 h on CI)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7d-organs
```

### Task 22: Pulse oracle O11 (renal response to haemorrhage)

**Files:**
- Create: `packages/validation/src/oracle/renal-scenarios.ts`, `packages/validation/test/oracle-renal.test.ts`

**Interfaces:**
- Consumes: 7a's oracle (`packages/validation/src/oracle/{compare,pulse-runner,scenarios}.ts`: `compareRow`, `loadPulse`, `OracleRow`); Pulse's data requests (`research/pulse-spike/bench/drm_names.json` lists `UrineProductionRate(mL/min)`, not GFR/RBF).
- Produces: `RENAL_ORACLE` (scenario O11), `RenalOracleRow`, `RenalOracleScenario`.

- [ ] **Step 1: Write the scenario** — `packages/validation/src/oracle/renal-scenarios.ts`

```ts
// Pulse oracle O11 (annex §D; tables §5.2): the kidney's response to haemorrhage. Pulse and our engine bleed the same
// 1100 mL over 10 min (O2's action, which runs in the Node shim) and are observed for 2 h. Pulse's data requests carry
// `UrineProductionRate(mL/min)` (no GFR/RBF), so O11 compares urine output and MAP. Annex §D's O11 drives MAP ≈ 60
// with `CardiovascularMechanicsModification` (SVR × 0.55): 7a has no such event and the action is unverified in the
// shim, so that premise (and Pulse's measured `rppZero`) stays open — gate note. Prototype (7a + 7b + 7g, Pulse
// 4.3.2): resting UOP ours 1.16 vs Pulse 0.38 mL/min (D12); MAP Δ at 1 h −3.7 vs −1.0 (both compensate class II);
// UOP Δ −0.63 vs +0.33 at 1 h, −0.63 vs +0.12 at 2 h: Pulse's urine RISES after a bleed (no ADH/RAAS/volume term,
// annex B2 stated limits) — new expected difference D-R1.
import type { OracleRow } from './scenarios.ts';

export interface RenalOracleRow extends Omit<OracleRow, 'channel'> {
  channel: 'uop' | 'map'; // uop in mL/min (ours: organs event uopMlKgH × kg / 60)
  atS: number;
}
export interface RenalOracleScenario {
  id: 'O11';
  durationS: number;
  baselineS: number;
  pulse: { tS: number; json: string }[];
  ours: { tS: number; event: Record<string, unknown> }[];
  rows: RenalOracleRow[];
}
const bleed = (mlPerMin: number) => JSON.stringify({ AnyAction: [{ PatientAction: { Hemorrhage: { Compartment: 'RightLeg', FlowRate: { ScalarVolumePerTime: { Value: mlPerMin, Unit: 'mL/min' } } } } }] });

export const RENAL_ORACLE: RenalOracleScenario = {
  id: 'O11', durationS: 7200, baselineS: 60,
  pulse: [{ tS: 60, json: bleed(110) }, { tS: 660, json: bleed(0) }],
  ours: [{ tS: 60, event: { kind: 'bleed', volumeMl: 1100, overS: 600 } }],
  rows: [
    { channel: 'uop', metric: 'abs', atS: 60, tol: 0.3, expect: 'expect-differ', note: 'D12: Pulse resting UOP 0.38 mL/min vs ours 1.16' },
    { channel: 'map', metric: 'delta', atS: 3600, tol: 3, expect: 'agree', note: 'both compensate class II (±3 mmHg: Pulse Δ ≈ 1)' },
    { channel: 'uop', metric: 'delta', atS: 3600, tol: 0.5, expect: 'expect-differ', note: 'D-R1: Pulse UOP rises after a bleed (no ADH/RAAS/volume term); ours falls (ATLS class II)' },
    { channel: 'uop', metric: 'delta', atS: 7200, tol: 0.5, expect: 'expect-differ', note: 'D-R1' },
  ],
};
```

- [ ] **Step 2: Write the test** — `packages/validation/test/oracle-renal.test.ts` (the data test always runs; the Pulse run is local-only, like O1–O5)

```ts
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { compareRow } from '../src/oracle/compare.ts';
import { loadPulse } from '../src/oracle/pulse-runner.ts';
import { RENAL_ORACLE } from '../src/oracle/renal-scenarios.ts';
import type { OracleRow } from '../src/oracle/scenarios.ts';

const DIR = process.env.PULSE_ORACLE_DIR;
const KG = 77.1; // Pulse StandardMale
const PULSE_KEYS = { uop: 'UrineProductionRate(mL/min)', map: 'MeanArterialPressure(mmHg)' } as const;

describe('O11 scenario data', () => {
  it('rows are well formed (times inside the run, tolerances > 0)', () => {
    for (const r of RENAL_ORACLE.rows) {
      expect(r.atS).toBeGreaterThanOrEqual(RENAL_ORACLE.baselineS);
      expect(r.atS).toBeLessThanOrEqual(RENAL_ORACLE.durationS);
      expect(r.tol).toBeGreaterThan(0);
    }
  });
});

describe.skipIf(!DIR)('Pulse oracle O11 — renal hypotension (set PULSE_ORACLE_DIR=…/research/pulse-spike/web)', () => {
  it('O11', async () => {
    const sc = RENAL_ORACLE;
    const p = await loadPulse(DIR as string, join(DIR as string, '../bench/drm_names.json'));
    const e = createEngine({ seed: 1, mode: 'modeled', patient: { ageY: 44, sex: 'M', weightKg: KG, heightCm: 180, baseline: { hr: 72 } } });
    const ev: EngineEvent[] = [];
    e.on((x) => ev.push(x), ['organs']);
    for (const o of sc.ours) e.dispatch({ id: `o${o.tS}`, issuedBy: 'oracle', type: 'applyEvent', event: o.event as never, atTick: o.tS * 50 });
    const times = [...new Set([sc.baselineS, ...sc.rows.map((r) => r.atS)])].sort((a, b) => a - b);
    const pulseAt: Record<number, Record<string, number>> = {};
    let t = 0;
    const acts = [...sc.pulse];
    for (const at of times) {
      while (t < at) {
        while (acts.length && acts[0]!.tS <= t) p.act(acts.shift()!.json);
        p.step(50);
        t += 1;
        if (t % 60 === 0) await new Promise((r) => setImmediate(r));
      }
      pulseAt[at] = p.read();
      e.advanceTo(at);
    }
    const ours = (at: number, k: keyof typeof PULSE_KEYS) => {
      const w = ev.filter((x) => x.type === 'organs' && x.t <= at && x.t > at - 10) as Extract<EngineEvent, { type: 'organs' }>[];
      const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
      return k === 'uop' ? avg(w.map((x) => (x.kidney.uopMlKgH * KG) / 60)) : avg(w.map((x) => x.brain.mapHead));
    };
    const verdicts: string[] = [];
    for (const row of sc.rows) {
      const k = PULSE_KEYS[row.channel];
      const o = row.metric === 'abs' ? ours(row.atS, row.channel) : ours(row.atS, row.channel) - ours(sc.baselineS, row.channel);
      const pv = row.metric === 'abs' ? pulseAt[row.atS]![k]! : pulseAt[row.atS]![k]! - pulseAt[sc.baselineS]![k]!;
      const verdict = compareRow(o, pv, row as unknown as OracleRow); // compareRow reads tol/expect only
      console.log(`O11 ${row.channel} ${row.metric} @${row.atS}s: ours ${o.toFixed(3)} pulse ${pv.toFixed(3)} → ${verdict}${row.note ? ` (${row.note})` : ''}`);
      verdicts.push(verdict);
    }
    expect(verdicts).not.toContain('fail'); // every row is printed first (a fail is a gate-note finding, not a tuning target)
  }, 3_600_000); // local-only (skipped in CI)
});
```

- [ ] **Step 3: Run it** (never together with the full suite: 7c gate rule)

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/oracle-renal.test.ts && PULSE_ORACLE_DIR=$PWD/../../research/pulse-spike/web npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/oracle-renal.test.ts`
Expected: the data test passes in CI (Pulse skipped); locally with Pulse all four rows pass (≈ 6 min). **Prototype (Pulse 4.3.2):** `uop abs @60 s` ours 1.163 vs Pulse 0.381 mL/min → expect-differ-ok (D12); `map Δ @1 h` −3.73 vs −1.04 → agree (±3); `uop Δ @1 h` −0.627 vs +0.329 → expect-differ-ok; `uop Δ @2 h` −0.630 vs +0.118 → expect-differ-ok (D-R1: Pulse's urine rises after a bleed). Annex §D's MAP-60 premise (`CardiovascularMechanicsModification`, SVR × 0.55) and Pulse's `rppZero` stay open in the gate note: 7a has no equivalent event and the action is unverified in the Node shim.

- [ ] **Step 4: Commit and push**

```bash
git add packages/validation/src/oracle/renal-scenarios.ts packages/validation/test/oracle-renal.test.ts docs/plans/stage-7d-organs.md
git commit -m "test(validation): Pulse oracle O11 — renal response to haemorrhage (D12, D-R1)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7d-organs
```

### Task 23: Demo page `stage7d.html` (TBI + renal panel), e2e smoke and screenshots

**Files:**
- Create: `apps/demo/stage7d.html`, `apps/demo/src/stage7d.ts`, `apps/demo/e2e/stage7d.e2e.ts`, `apps/demo/scripts/stage7d-shots.mjs`
- Modify: `apps/demo/vite.config.ts` (one input line)

**Interfaces:**
- Consumes: `mountMonitor` with `waves: ['abp', 'icp', 'pleth', 'co2']` (Task 16's `icp` lane), `formatIcp`/`formatPbto2`/`formatUop` (Task 16), the engine's `organs` and `measurement` events (every engine event reaches `pm.on`), 7g's `drug`/`infusion`/`tci`/`vaporiser` events.
- Produces: `window.__pme7d = { send, restart(tbi), simT(), organs(), timeScale(k), ready }` for the e2e spec.

- [ ] **Step 1: The e2e spec (failing first)** — `apps/demo/e2e/stage7d.e2e.ts`

```ts
// Stage 7d page: a CI smoke (check 19 starts, the ICP tile reads a rising ICP, no page errors) and, with PME_SHOTS=1,
// the gate screenshots into docs/gates/stage-7d/ (node apps/demo/scripts/stage7d-shots.mjs).
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-7d');

test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});
test.afterAll(async () => vite?.close());

type Organs = { t: number; brain: { icp: number; state: string }; kidney: { uopMlKgH: number; oliguria: boolean } } | null;
type Hook = { send(c: Record<string, unknown>): Promise<{ accepted: boolean }>; restart(tbi?: boolean): void; simT(): number; organs(): Organs; timeScale(k: number): void; ready: boolean };
const simT = (page: Page) => page.evaluate(() => (window as unknown as Record<string, Hook>)['__pme7d']!.simT());
const organs = (page: Page) => page.evaluate(() => (window as unknown as Record<string, Hook>)['__pme7d']!.organs());
const restart = (page: Page, tbi: boolean) => page.evaluate((tbi) => (window as unknown as Record<string, Hook>)['__pme7d']!.restart(tbi), tbi);
const timeScale = (page: Page, k: number) => page.evaluate((k) => (window as unknown as Record<string, Hook>)['__pme7d']!.timeScale(k), k);
const ev = (page: Page, event: Record<string, unknown>) => page.evaluate((e) => (window as unknown as Record<string, Hook>)['__pme7d']!.send({ type: 'applyEvent', event: e }), event);
const waitSim = (page: Page, t: number) => page.waitForFunction((t) => (window as unknown as Record<string, Hook>)['__pme7d']!.simT() >= t, t, { timeout: 600_000 });

async function open(page: Page, errors: string[]) {
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1140, height: 620 });
  await page.goto(`${base}/stage7d.html`);
  await page.waitForFunction(() => (window as unknown as { __pme7d?: { ready: boolean } }).__pme7d?.ready === true);
}

test('stage7d page: check 19 starts, the ICP tile shows a rising ICP, no page errors', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  await open(page, errors);
  await page.click('#check19');
  await waitSim(page, 240); // ×4: ≈ 60 s wall
  const o = await organs(page);
  expect(o!.brain.icp).toBeGreaterThanOrEqual(12);
  expect(Number(await page.locator('#tIcp b').textContent())).toBeGreaterThanOrEqual(12);
  expect(errors).toEqual([]);
});

test('stage7d gate screenshots (PME_SHOTS=1)', async ({ page }) => {
  test.skip(!process.env.PME_SHOTS, 'screenshots only: node apps/demo/scripts/stage7d-shots.mjs');
  test.setTimeout(1_800_000);
  mkdirSync(out, { recursive: true });
  const errors: string[] = [];
  await open(page, errors);
  const shot = async (name: string) => page.screenshot({ path: `${out}/${name}.png`, type: 'png', clip: { x: 0, y: 0, width: 1140, height: 620 }, scale: 'css' });
  const at = async (dt: number) => waitSim(page, (await simT(page)) + dt);
  await timeScale(page, 4);
  await at(60);
  await shot('rest');
  await ev(page, { kind: 'brain', massMl: 15 }); // ICP ≈ 20–25: P2 > P1
  await at(90);
  await shot('icp-25-p2-over-p1');
  await ev(page, { kind: 'drug', drugId: 'mannitol', dose: 1, unit: 'g/kg', route: 'iv' });
  await at(900);
  await shot('after-mannitol-15min');
  await restart(page, true);
  await timeScale(page, 4);
  await ev(page, { kind: 'brain', massMl: 28 }); // CPP < 40 → Cushing
  await at(120);
  expect((await organs(page))!.brain.state).toBe('cushing');
  await shot('cushing');
  await restart(page, false);
  await timeScale(page, 4);
  await page.click('#bleed');
  await at(1200);
  expect((await organs(page))!.kidney.oliguria).toBe(true);
  await shot('oliguria');
  await page.click('#fluids');
  await at(3600);
  await shot('uop-recovery');
  expect(errors).toEqual([]);
});
```

Run: `npx -y pnpm@9.15.9 build && PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/stage7d.e2e.ts` — Expected: FAIL (404: no `stage7d.html`).

- [ ] **Step 2: The page** — `apps/demo/stage7d.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Stage 7d: brain, kidney, liver</title>
  <style>
    body { margin: 0; background: #000; color: #ddd; font: 13px system-ui, sans-serif; display: grid; grid-template-columns: minmax(0, 1fr) 380px; height: 100vh; }
    #monitor { min-height: 0; height: 100vh; }
    aside { padding: 8px 10px; overflow: auto; border-left: 1px solid #333; }
    fieldset { border: 1px solid #333; margin: 0 0 6px; padding: 4px 8px; }
    legend { color: #888; }
    button, select { margin: 2px; font: inherit; }
    button[aria-pressed='true'] { background: #2a2; color: #000; }
    .tile { display: inline-block; min-width: 104px; margin: 2px 6px 2px 0; }
    .tile b { font-size: 28px; font-weight: 500; }
    .tile small { display: block; color: #888; }
    .status { color: #f33; }
    #organs { white-space: pre; font: 11px ui-monospace, monospace; color: #9c9; margin: 4px 0; }
    #trend { background: #050505; border: 1px solid #333; }
  </style>
</head>
<body>
  <div id="monitor"></div>
  <aside>
    <div>
      <span class="tile" id="tIcp"><small>ICP mmHg</small><b>--</b> <span></span><em class="status"></em></span>
      <span class="tile" id="tPbto2"><small>PbtO2 mmHg</small><b>--</b> <em class="status"></em></span>
      <span class="tile" id="tUop"><small>UO mL/h</small><b>--</b> <span></span><em class="status"></em></span>
    </div>
    <canvas id="trend" width="360" height="110" title="last 30 min: ICP (white), CPP (green), UOP mL/kg/h × 20 (yellow)"></canvas>
    <div id="organs"></div>
    <fieldset><legend>Brain (TBI)</legend>
      <button id="restartTbi">TBI profile (restart)</button><button id="restartAdult">Adult (restart)</button><br />
      <button id="bleed1">Haematoma 1 mL/min</button><button id="bleed0">Stop bleeding</button>
      <button id="mass15">Mass 15 mL</button><button id="mass28">Mass 28 mL</button><br />
      <button id="mannitol">Mannitol 1 g/kg</button><button id="hts">HTS 3 % 250 mL</button><br />
      <button id="hyper">Hyperventilate (RR 30)</button><button id="normo">Normoventilate (RR 18)</button><br />
      <button id="headUp">Head-up 30°</button><button id="flat">Flat</button><br />
      <label>Anaesthesia <select id="anaes"><option value="awake">awake</option><option value="propofol">propofol TCI Ce 3</option><option value="sevo">sevoflurane 1.5 MAC</option><option value="iso">isoflurane 1.5 MAC</option><option value="ketamine">ketamine 1.5 mg/kg</option></select></label><br />
      <button id="sIcp" aria-pressed="true">ICP probe</button><button id="sPbto2" aria-pressed="true">PbtO2 probe</button>
      <button id="check19">Check 19 (TBI, 1 mL/min)</button>
    </fieldset>
    <fieldset><legend>Kidney</legend>
      <button id="bleed">Bleed (volumeStatus 0.2, 85/50, HR 125 over 60 s)</button><button id="fluids">Fluids (restore over 5 min)</button><br />
      <button id="furo">Furosemide 40 mg</button><button id="ne">NE 0.1 µg/kg/min</button><button id="neOff">Stop NE</button><button id="map70">MAP 70 (instructor)</button><br />
      <button id="emptyBag">Empty bag</button><button id="kdigo" aria-pressed="false">KDIGO teaching ×12</button><button id="sUro" aria-pressed="true">Urometer</button>
    </fieldset>
    <label>Speed <select id="speed"><option value="1">×1</option><option value="2">×2</option><option value="4">×4</option></select></label>
  </aside>
  <script type="module" src="./src/stage7d.ts"></script>
</body>
</html>
```

- [ ] **Step 3: The script** — `apps/demo/src/stage7d.ts`

```ts
// Stage 7d demo: the monitor with the ICP lane, an organ side panel (ICP/CPP, PbtO2, UOP tiles from the renderer's
// formatters, the organs truth line, a 30 min trend) and the brain/kidney actions. Drugs are 7g events (7d owns none).
import type { Command, EngineEvent, EngineOptions, Measured } from '@pme/engine-core';
import { formatIcp, formatPbto2, formatUop, mountMonitor, type MonitorHandle } from '@pme/renderer';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
type Body = Record<string, unknown>;
type OrgansEv = Extract<EngineEvent, { type: 'organs' }>;
const KG = 70;
const TBI = [{ id: 'tbi', severity: 1 }];

let pm: MonitorHandle | null = null;
let seq = 0;
let simT = 0;
let last: OrgansEv | null = null;
const meas: Partial<Record<'icpMean' | 'cpp' | 'pbto2' | 'uop', Measured>> = {};
const trend: Array<[number, number, number, number]> = []; // t, ICP, CPP, UOP mL/kg/h

async function send(body: Body): Promise<{ accepted: boolean; reason?: string }> {
  if (!pm) return { accepted: false, reason: 'not started' };
  const r = await pm.dispatch({ id: `d${++seq}`, issuedBy: 'stage7d', ...body } as Command);
  if (!r.accepted) console.warn('rejected', body, r.reason);
  return r;
}
const ev = (event: Body) => send({ type: 'applyEvent', event });
const drug = (drugId: string, dose: number, unit: string, extra: Body = {}) => ev({ kind: 'drug', drugId, dose, unit, route: 'iv', ...extra });
const target = (variable: string, value: number, durationS: number) => send({ type: 'setTarget', variable, value, ramp: { durationS } });
const vent = (rr: number) => ev({ kind: 'ventilation', source: 'ventilator', rr, vtMl: 500, fio2: 0.4, peep: 5 }); // RR 18 ≈ PaCO2 40

function start(conditions: { id: string; severity: number }[]): void {
  pm?.destroy();
  $('monitor').innerHTML = '';
  simT = 0;
  last = null;
  trend.length = 0;
  const engine: EngineOptions = { seed: 7, patient: { weightKg: KG, baseline: { sbp: 110, dbp: 72, hr: 80 }, conditions, sensors: { abp: 'connected', spo2: 'on', co2: 'on' } } };
  pm = mountMonitor($('monitor'), { skin: 'philips-like', engine, lanes: ['ecgII'], waves: ['abp', 'icp', 'pleth', 'co2'] });
  pm.on((e) => {
    if (e.type === 'organs') {
      last = e;
      simT = e.t;
      trend.push([e.t, e.brain.icp, e.brain.cpp, e.kidney.uopMlKgH]);
      while (trend.length && (trend[0] as [number, number, number, number])[0] < e.t - 1800) trend.shift();
    } else if (e.type === 'measurement') {
      for (const k of ['icpMean', 'cpp', 'pbto2', 'uop'] as const) if (e.values[k]) meas[k] = e.values[k];
    }
  });
  void vent(18);
  void send({ type: 'attachSensor', sensor: 'icp', state: 'on' });
  void send({ type: 'attachSensor', sensor: 'pbto2', state: 'on' });
  void send({ type: 'attachSensor', sensor: 'urometer', state: 'on' });
  for (const id of ['sIcp', 'sPbto2', 'sUro']) $(id).setAttribute('aria-pressed', 'true');
}

const toggle = (id: string, on: (pressed: boolean) => void) =>
  $(id).addEventListener('click', () => {
    const p = $(id).getAttribute('aria-pressed') !== 'true';
    $(id).setAttribute('aria-pressed', String(p));
    on(p);
  });
const click = (id: string, f: () => unknown) => $(id).addEventListener('click', () => void f());

// Brain
click('restartTbi', () => start(TBI));
click('restartAdult', () => start([]));
click('bleed1', () => ev({ kind: 'brain', massRateMlPerMin: 1 }));
click('bleed0', () => ev({ kind: 'brain', massRateMlPerMin: 0 }));
click('mass15', () => ev({ kind: 'brain', massMl: 15 }));
click('mass28', () => ev({ kind: 'brain', massMl: 28 }));
click('mannitol', () => drug('mannitol', 1, 'g/kg'));
click('hts', () => drug('hypertonicSaline', 250, 'mL', { concentrationPct: 3 }));
click('hyper', () => vent(30));
click('normo', () => vent(18));
click('headUp', () => ev({ kind: 'position', headUpDeg: 30 }));
click('flat', () => ev({ kind: 'position', headUpDeg: 0 }));
$('anaes').addEventListener('change', () => {
  const v = $<HTMLSelectElement>('anaes').value;
  void ev({ kind: 'tci', drugId: 'propofol', mode: 'effect', target: v === 'propofol' ? 3 : 0 });
  void ev({ kind: 'vaporiser', agent: v === 'iso' ? 'isoflurane' : 'sevoflurane', dialPct: v === 'sevo' ? 2.7 : v === 'iso' ? 1.75 : 0, fgfLpm: 2 });
  if (v === 'ketamine') void drug('ketamine', 1.5, 'mg/kg');
});
toggle('sIcp', (p) => void send({ type: 'attachSensor', sensor: 'icp', state: p ? 'on' : 'off' }));
toggle('sPbto2', (p) => void send({ type: 'attachSensor', sensor: 'pbto2', state: p ? 'on' : 'off' }));
click('check19', () => {
  start(TBI);
  pm?.setTimeScale(4);
  $<HTMLSelectElement>('speed').value = '4';
  return ev({ kind: 'brain', massRateMlPerMin: 1 });
});

// Kidney
click('bleed', async () => {
  await target('volumeStatus', 0.2, 60);
  await target('sbp', 85, 60);
  await target('dbp', 50, 60);
  await target('hr', 125, 60);
});
click('fluids', async () => {
  await target('volumeStatus', 0.95, 300);
  await target('sbp', 118, 300);
  await target('dbp', 72, 300);
  await target('hr', 85, 300);
});
click('furo', () => drug('furosemide', 40, 'mg'));
click('ne', () => ev({ kind: 'infusion', drugId: 'norepinephrine', rate: 0.1, unit: 'mcg/kg/min' }));
click('neOff', () => ev({ kind: 'infusion', drugId: 'norepinephrine', rate: 0, unit: 'mcg/kg/min' }));
click('map70', async () => {
  await target('sbp', 95, 60);
  await target('dbp', 58, 60);
});
click('emptyBag', () => ev({ kind: 'renal', emptyBag: true }));
toggle('kdigo', (p) => void ev({ kind: 'renal', timeScale: p ? 12 : 1 }));
toggle('sUro', (p) => void send({ type: 'attachSensor', sensor: 'urometer', state: p ? 'on' : 'off' }));
$('speed').addEventListener('change', () => pm?.setTimeScale(Number($<HTMLSelectElement>('speed').value)));

// Panel
function tile(id: string, f: { main: string; sub?: string; status: string }): void {
  const el = $(id);
  (el.querySelector('b') as HTMLElement).textContent = f.main;
  const sub = el.querySelector('span');
  if (sub) sub.textContent = f.sub ?? '';
  (el.querySelector('em') as HTMLElement).textContent = f.status;
}
const ctx = $<HTMLCanvasElement>('trend').getContext('2d') as CanvasRenderingContext2D;
function drawTrend(): void {
  const W = 360;
  const H = 110;
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, W, H);
  const x = (t: number) => W - ((simT - t) / 1800) * W;
  const y = (v: number) => H - (Math.max(0, Math.min(100, v)) / 100) * H; // 0–100 scale
  const line = (i: 1 | 2 | 3, color: string, k = 1) => {
    ctx.strokeStyle = color;
    ctx.beginPath();
    trend.forEach((p, n) => (n === 0 ? ctx.moveTo(x(p[0]), y(p[i] * k)) : ctx.lineTo(x(p[0]), y(p[i] * k))));
    ctx.stroke();
  };
  line(1, '#fff');
  line(2, '#3c3');
  line(3, '#ff3', 20);
}
setInterval(() => {
  tile('tIcp', formatIcp(meas.icpMean, meas.cpp));
  tile('tPbto2', formatPbto2(meas.pbto2));
  tile('tUop', formatUop(meas.uop, last?.kidney.cumMl, KG));
  drawTrend();
  if (last) {
    const b = last.brain;
    const k = last.kidney;
    $('organs').textContent =
      `t ${last.t.toFixed(0)} s  brain ${b.state}  Cushing ${b.cushing.toFixed(2)}\n` +
      `ICP ${b.icp.toFixed(1)}  CPP ${b.cpp.toFixed(0)}  MAP(head) ${b.mapHead.toFixed(0)}  PaCO2 ${b.paco2.toFixed(1)}\n` +
      `CBF ${(100 * b.cbf).toFixed(0)} %  CMRO2 ${(100 * b.cmro2).toFixed(0)} %  SjvO2 ${(100 * b.sjvo2).toFixed(0)} %  E ${b.elastance.toFixed(2)} mmHg/mL\n` +
      `GFR ${k.gfr.toFixed(0)} mL/min  RBF ${k.rbf.toFixed(0)}  UOP ${k.uopMlKgH.toFixed(2)} mL/kg/h (1 h ${k.uop1hMlKgH.toFixed(2)})\n` +
      `urine Σ ${k.cumMl.toFixed(0)} mL  bag ${k.bagMl.toFixed(0)}  AKI ${k.akiStage}${k.oliguria ? '  OLIGURIA' : ''}\n` +
      `lactate ${last.liver.lactate.toFixed(2)}  kLac ${last.liver.kLacPerH.toFixed(2)}/h  HBF ${(100 * last.liver.hbfRel).toFixed(0)} %`;
  }
}, 500);

start(TBI);
(window as unknown as { __pme7d: unknown }).__pme7d = {
  send, restart: (tbi = true) => start(tbi ? TBI : []), simT: () => simT, organs: () => last, timeScale: (k: number) => pm?.setTimeScale(k), ready: true,
};
```

In `apps/demo/vite.config.ts` after `        stage7g: page('stage7g'), // Stage 7g` add `        stage7d: page('stage7d'), // Stage 7d`.

- [ ] **Step 4: The screenshot runner** — `apps/demo/scripts/stage7d-shots.mjs`

```js
// apps/demo/scripts/stage7d-shots.mjs — Gate 7d screenshots: runs the stage7d e2e spec with PME_SHOTS=1 on headless
// system Chrome (a hidden desktop pane throttles rAF — Gate 1 lesson); the spec writes the PNGs to docs/gates/stage-7d/.
// Usage (repo root): node apps/demo/scripts/stage7d-shots.mjs
import { spawnSync } from 'node:child_process';

const r = spawnSync('npx', ['-y', 'pnpm@9.15.9', 'exec', 'playwright', 'test', 'apps/demo/e2e/stage7d.e2e.ts'], {
  stdio: 'inherit',
  env: { ...process.env, PW_SYSTEM_CHROME: '1', PME_SHOTS: '1' },
});
process.exit(r.status ?? 1);
```

- [ ] **Step 5: Run** — `npx -y pnpm@9.15.9 --filter ./apps/demo typecheck && npx -y pnpm@9.15.9 build && PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/stage7d.e2e.ts`, then `node apps/demo/scripts/stage7d-shots.mjs` (≈ 30 min wall at ×4) and check each PNG ≤ 60 KB (re-save smaller with a tighter clip if not).
Expected: the smoke passes (prototype 1.0 min), the screenshot test is skipped without `PME_SHOTS`; the shots run writes `docs/gates/stage-7d/{rest,icp-25-p2-over-p1,after-mannitol-15min,cushing,oliguria,uop-recovery}.png`. Look at them before the gate note: P2 > P1 on the ICP lane at ICP ≈ 25, MAP up and HR down in `cushing`, the UO tile red in `oliguria`.

- [ ] **Step 6: Commit and push**

```bash
git add apps/demo/stage7d.html apps/demo/src/stage7d.ts apps/demo/e2e/stage7d.e2e.ts apps/demo/scripts/stage7d-shots.mjs apps/demo/vite.config.ts docs/gates/stage-7d docs/plans/stage-7d-organs.md
git commit -m "feat(demo): stage7d — TBI, osmotherapy, hyperventilation, head-up, anaesthesia; renal panel; e2e smoke and gate screenshots

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7d-organs
```

### Task 24: NOTICES rows, Apache headers, gate note, PR

**Files:**
- Modify: `NOTICES.md`; Create: `docs/gates/stage-7d.md`

- [ ] **Step 1: NOTICES** — in the Pulse table (the one headed by N-P06/N-P07/N-P10/N-P16; R51 addendum 14: Pulse-derived rows use `N-P##`, 7d takes **N-P19** onward, dataset rows keep `N-0xx`) add after the last `N-P` row:
```markdown
| N-P19 | Pulse renal circuit collapsed to one algebraic kidney: topology, per-kidney resistances ×1.25, Kf, glomerular oncotic pressure, TGF range and damping, the reabsorption-permeability quadratic (used as an excreted-fraction curve), bladder capacity — `packages/engine-core/src/l2/renal/{params,kidney,model}.ts` | Derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), SetupCircuitsAndCompartments.cpp 1316–1720, PulseConfiguration.cpp 602–615, RenalModel.cpp 518–578, 1549, 1823–2071, Copyright 2018-2025 Kitware, Inc. and Contributors, a fork of BioGears 6.1.1 (Copyright 2015 Applied Research Associates, Inc.); Apache License 2.0 | courtesy | Re-expressed and simplified; Apache headers in the three files; angiotensin, effective-volume, neurohumoral, myogenic, IAP, stress/PEEP/α/sepsis terms are ours | 2026-09-28 |
```
  (Set the date cell to the day you commit.) The hepatic flow share reuses **N-P10** (7a's `ICRP89_FLOW_FRACTIONS_M`, imported, not copied: extend its "How used" cell to `… exposed as constants only; read by 7d (renal 0.17, liver 0.255)`). N-P11 (well-stirred clearance) is not used by 7d (Task 10). The Pulse/BioGears NOTICE paragraph above the table is already present (7a): do not duplicate it.
- [ ] **Step 2: Header check** — `head -12 packages/engine-core/src/l2/renal/*.ts` shows the SPDX + "Portions derived from the Pulse Physiology Engine 4.3.2" header in all three (each header ends with `NOTICES N-P19`); `npx -y pnpm@9.15.9 check-notices` passes.
- [ ] **Step 3: Full gate** — `npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices && PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 test:e2e` (locally: the 24 h horizon; record the wall times). Expected: all pass; the three organ `it.fails` report as expected-failures.
- [ ] **Step 4: Gate note** `docs/gates/stage-7d.md`: every acceptance number from Tasks 3–23 (model and engine) against the prototype values in this plan; the Task 13 diagnosis (PaCO2 premise, the MANUAL waveform/tracker, MODELED `hrF`); every `it.fails` with its number and owner (MANUAL Cushing ΔMAP → FU-2/R-7D-5a; check 20 premise → R-7D-5b/c; mid-curve UOP → decision 8/Stage 8); the deviations list of this plan plus anything new; E-7d-1/E-7d-2 as applied; requests R-7D-2…6 and their status; O11's rows and the open MAP-60 premise; the screenshots (≤ 60 KB each).
- [ ] **Step 5: Commit, push, PR** — tick the plan's checkboxes in the branch copy, then

```bash
git add NOTICES.md docs/gates/stage-7d.md packages/engine-core/src/l2/renal docs/plans/stage-7d-organs.md
git commit -m "docs: Stage 7d NOTICES row N-P19 (N-P10 reused), gate note, plan ticked

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-7d-organs
```

  `gh pr create --base main --head stage-7d-organs --title "Stage 7d: brain (ICP/CPP/CBF/PbtO2), kidney (ported from Pulse), liver/metabolism" --body-file docs/gates/stage-7d.md`. Do NOT merge (R21).

---

## Self-review (done while writing; revised with the R50 fixes F1–F12)

- **Spec coverage.** Brain: Monro–Kellie/PVI (T3), CSF production/absorption (T3), mass/oedema/CBV (T6), autoregulation with HTN shift and TBI impairment (T4, T6), CO2 3 %/mmHg blunted < 20 (T4), O2 below 60 (T4), temperature (T4), CMRO2/CBF from the drug layer and the tables' rows (T2, T4, T11), PbtO2 + SjvO2 (T4), Cushing with both triggers (T5, T11, T13), ICP waveform 125 Hz (T7, T11, T12), mannitol/HTS observed from 7g (T11, T17), head-up (T6, T17), hyperventilation (T6, T17), herniation (T6). Kidney: ported RPP–GFR–UOP with TGF + myogenic range (T8), vasopressors/hypovolaemia/PEEP/sepsis/IAP (T9, T11, T20), healthy-reference calibration (T9), K/Na/Cl/gluconate seam for 7c (T11), AKI 0.5 mL/kg/h (T9), furosemide from 7g's Ce and mannitol (T9, T11), bladder/urometer (T9, T15, T16). Liver: lactate clearance with flow and hypothermia (T10), liver function into 7c's seam (T11), glucose factor for 7e and GFR factor for 7g (T11), hepatic failure + coagulopathy placeholder (T10). Channels/tiles/demo (T12, T14–T16, T23). Tests: checks 18/19/20 (T6, T9, T13, T17–T19), curves (T4, T8, T20), determinism/CPU/long run (T21), oracle O11 (T22). NOTICES (T24).
- **R50 fixes.** F1 chain-order inserts (Global Constraints, T12 Step 4); F2 no drug ids, `bus.doses` observed, `concentrationPct` E-7d-1 (T11, T17); F3 MODELED check `ctx.l1.mode === 'modeled' && ext`, MODELED engine test unconditional, the dead 7a-seam step and its request removed (T11, T13); F4 `organs.kidney.gfrRel`, `organs.liver.glucoseF` (T10, T11); F5 `core.liver = liverFn · tempF`, 7c's `hbfRel` with a fallback (T10, T11); F6 anaesthetic inputs from `pk.bus.cns`/`volatiles`, `neuro.outputs.cmro2Mult`, 7e sepsis (T2, T11); F7 `core.renal = { uopMlH, excretion }`, `out.albuminGL`/`bvRel`, `organs` lactate from `out.lactate` (T2, T11); F8 `SensorId` anchor, `resolve.ts`, `alarm-view.ts`, `skin-plan.ts` edits and the 7f merges (T1, T15, T16); F9 `LONGRUN_HOURS`/`expectedIndex` (T21); F10 concrete commits everywhere, real code for T20, T22, T23; F11 N-P19, N-P10 reused, ICRP-89 imported (T8, T10, T24); F12 stale text (architecture, order, P_BOWMAN 17.1 = GFR 125, restore, `staticCompliance(rs.lung)`, base ref).
- **Placeholders.** None: every code step is the prototype's file; E-7d-1/E-7d-2 and every edit to a shared file are exact find/replace pairs.
- **Type consistency.** `OrgansState`, `OrgansCtx`/`OrganSources`, `OrganView`/`DrugView`, `BrainInputs.drugs`, `RenalState`, `LiverState` field names match between Tasks 2, 6, 9–13 and the engine/demo code; `BrainSummary.paco2` and `KidneySummary.gfrRel` exist from Task 1.
