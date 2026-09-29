# FU-4: Integration polish — sympatholysis, emergent arrest, hyperkalaemia, obstructive shock, vagal events, clinical scenario suite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> STATUS (2026-09-27, plan writer): NOT YET REVIEWED (R50 review pending). Written from the measured integration audit
> `research/08-physiology-integration-audit.md` (R53). BASE: prototyped on `origin/main` `7a181b5` merged LOCALLY with
> `origin/fu-3-followups` `dd887be`; FU-3 then merged (PR #23, `eab2371`, head `26f5290` — the branch moved by docs
> only), and every find block was re-checked mechanically on `origin/main` **`341b031`**: 19 creates, 144 edits, 0 errors
> (Self-review). The G-FU3 rulings the orchestrator added while this plan was written are in (Tasks 3, 13, 19, 21).
> PROTOTYPED (code run, numbers measured; the prototype patch is `scratch/plans-backup/fu-4-prototype.patch`): Tasks
> 1–7 (the audit runner; G2 sympathetic output + set-point reset; G4 continuous MAP/CPP; G1 coronary myocardial state,
> RV balance, the arrest state machine and ROSC; G3 potassium), Task 8's measured flips, Task 15 (G11 MODELED dead
> space) and the hazard half of Task 16; the clinical suite (Task 22) was run on that prototype. Every other task (or
> step) is marked **UNPROTOTYPED**: it carries exact find blocks and the intended code, but its bands are targets under
> R45 — the executor prototypes first, and a band the mechanism misses stays (or becomes) `it.fails` with the measured
> number in its title.

**Goal:** make the organ stages physically LINKED before Ali tests again (R53). An anaesthetic suppresses the
sympathetic OUTPUT that holds preload-dependent patients up (tamponade, hypovolaemia, PE: collapse, not a −10 % dip);
low flow, hypoxia, potassium and cold end in an emergent arrest (PEA, VF or asystole) through ONE myocardial state
that FU-3's asphyxial path joins; the arrest and CPR read their own pressures (no last-beat values); hyperkalaemia
acts on the pump and the rhythm; obstructive shock has one command per disease and a shape; vagal events exist; and a
16-scenario clinical suite plus a screenshot set is what the orchestrator inspects before Ali is asked to test.

**Architecture:** Two new mechanisms and one new module, the rest are edits in their owners' files. (1) 7g's PD gains
two circulation targets — `symp` (× on the delivered central sympathetic output, applied AFTER the baroreflex
saturation) and `setF` (× on the baroreflex set point) — that 7a's `stepBaro` applies; the anaesthetic rows (propofol,
sevoflurane, isoflurane) carry them. (2) 7a's coronary step becomes the myocardial state of an arrest state machine:
`kIsch` is the FLOW share (no floor in MODELED), `cor.hyp` stays FU-3's O2-content share, a new `kIschRv` gives the RV
its own balance, the demand has basal and excitation–contraction shares, CPP is taken on the absolute LV
end-diastolic pressure, and with no beat to read the step uses a continuous relaxation-phase CPP (CPR included). The
new module `l2/circ/arrest.ts` declares the arrest (flow share ≤ 0.1, or no flow in either mode, or a K / cold hazard),
draws the onset rhythm with a risk-weighted VF share, and returns a pulse (ROSC) once CPR has held CPP ≥ 15 mmHg with
a recovered myocardium. FU-3's hypoxic declaration (`hypoxic-arrest.ts`) is kept and reaches the same state. The rest:
continuous MAP for 7d/7e, absolute K to the ECG, K on contractility and the sinus node, obstructive-shock aliases,
a vagal PD channel, flow-dependent propofol distribution, MODELED dead space, shivering cut-off, arrest EtCO2 kinetics,
and the AF pulse deficit, a settable forced-air temperature, the CI split and the scenario suite.

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2, Playwright 1.63 (system Chrome), pnpm 9.15.9 via `npx`, Node ≥ 22.15
for the audit script (`module.registerHooks`). No new dependencies.

**Spec:** `../research/00-orchestrator-rulings.md` (workspace): **R45**, **R51** + addenda 8, 12, 13, 14, 18, **R53**,
"FU-4 list opened", "Ali's first playground finding", "Integration audit delivered", **CI amendments 1–4**, **E-FU3-9**,
**E-FU3-10**, the G7e rulings (q2, q4, the 60-min split note) and the orchestrator's V.1-review note to this plan
(2026-09-27, see "Requests to other stages") and the G-FU3 rulings on FU-4's scope (2026-09-27: the monitor must show
the hypoxic bradycardia, the post-arrest monitor-HR mean with a 1 bpm tolerance, 7d's CBF after a PEA, t25 ventilated
plus a `t25-apnoea` stress document, the latched APNEA alarm and the organ-soak lactate drift; oracle mode MODELED). Audit: `../research/08-physiology-integration-audit.md` (gap numbers
G1–G15, scenario ids A1…X1, §5 test list, §6 suite, §7 questions) and `../research/08-audit-scripts/`. FU-3 plan:
`docs/plans/fu-3-followups.md` (Task 3 volatile `gvHr`, Task 4 `man.kIschRef`, Task 5 `cor.hyp`/E-FU3-8/9/10).

**Gap numbering.** Task titles carry the audit's gap numbers (G1–G15) and the FU-4 list's item numbers (items 1–3 of
"FU-4 list opened": warmer, `stage7e-shots.mjs` comments, CI split). G9 (MANUAL) is decided inside Tasks 4 and 6
(Decision D6, Q9); G13 (baroreflex resetting) has no task (D18, Q8); G15 (ephedrine/fentanyl/adrenaline sizes) is the
R44 calibration pass except the opioid vagal part (Task 12).

## Global Constraints

- **R45:** mechanisms, never band changes. No existing band is widened, removed or re-worded to pass. A band a mechanism
  cannot reach stays (or becomes) `it.fails` with the measured number in its title; a pre-declared `it.fails` whose band
  is now met is flipped to `it` (its title keeps the old measured number in a trailing "was …" clause). Every changed
  parameter is sourced or `[ENG]` with its fit target named in the code comment. In this plan the pre-declared flips
  are: circ-sanity-1 propofol (Task 2), `pk-bus` VA > 3 L/min (Task 15), FU-3's "final HR ≤ 130" (Task 6, re-measure);
  the R23 pair in circ-sanity-2 stays `it.fails` with new numbers (Task 2). The audit's third flip (`neuro-circ`
  sevoflurane) was already made by FU-3 Task 3.
- **R51 + addenda (binding):** only 7g touches PK/PD (`l2/pk/**`); 7a applies what 7g publishes (`ext.drug`). Canonical
  names (addendum 14) are unchanged; the two new `DrugEffect` fields are `symp` and `setF`; the new circulation state
  is `hemo.circ.{mapNow, cppAcc, arrest, noFlowS, saF}`, `hemo.circ.cor.{cpp, kIschRv, rv0}`,
  `hemo.circ.ext.{kEcg, tempC, vFluidRate, cbfRel, endoHumDV0Frac}`, `hemo.circ.arrest.{rate0, rateNow}` and
  `resp.{ptxAcc, ptxCeil}`; the new `DrugEffect` fields are `symp`, `setF`, `vagalMs` and `muscBlock`, and 7e publishes
  `h.hum` with `humSvrF`/`humDV0Frac`. *Orchestrator ruling (FU-4 review), 2026-09-28 (review F18): `saF` and
  `vFluidRate` were missing from this list; the rest are the new tasks' (6b, 11b, 2, 6).*
  Chain order (addendum 14 / §7) is unchanged: device → pk (7g) → neuro (7f) → organs (7d) → blood (7c) → endo (7e) →
  Stage 3 → hemo; advance order pk → resp/lung → blood → endo → organs → hemo. The new aliases of Task 11 are applied
  BEFORE the chain in `engine.ts` `apply()` and never change the order. `stimulus` keeps ONE shape (addendum 12): Task 12
  adds an optional `site` field, 7e still consumes the event, 7a only observes it.
- **Base:** branch `fu-4-integration-polish` from `origin/main` AFTER FU-3 merges (R53 release order FU-3 → FU-4 → V.1
  → 8b). Worktree `projects/patient-monitor-engine/scratch/wt-fu-4` (R25: never the shared checkout). Push after every
  commit (`git push -u origin fu-4-integration-polish` the first time, `git push` after). Never push to `main`; never
  merge; the executor opens the PR in Task 24 and stops.
- **FU-3 anchors this plan edits (re-anchor by content if FU-3 moved them before merging):** `coronary.ts`
  `TAU_HYP_S = 150` and the `stepCoronary(… o2Rel = 1)` signature; `model.ts` `G_SA`, `K_HYP_MIN`, the `kHyp`/`hypF`
  lines and `man.kIschRef`; `hemo/pipeline.ts` the `emitSecond` coronary block (`hyp0`, the pulseless hold, the
  `hypoxicArrestRequest` call); `engine.ts` the `requestRhythm` callback (E-FU3-8); `hypoxic-arrest.ts` exports.
- **Merging main while other stages land (R51 §7).** *Orchestrator ruling (FU-4 review), 2026-09-28 (review F9): the
  earlier sentence "no other stage edits the engine while FU-4 runs" was wrong.* **FU-5 "monitor fidelity" lands IN
  PARALLEL** with FU-4: it owns `l3/**`, the renderer, the skins, the audio AND the L2 signal-quality lines of
  `l2/hemo/pipeline.ts` (pleth amplitude/PI, SpO2 validity) as its own exceptions, and it may also touch
  `packages/engine-core/vite.config.ts`, `.github/workflows/ci.yml` and `apps/demo/vite.config.ts`. The order is
  FU-4 → V.1 → FU-6 → 8b with FU-5 merged whenever its gate passes. Therefore:
  - Run `git fetch origin && git merge origin/main` **before every task that edits `l2/hemo/pipeline.ts` (Tasks 3, 4, 6,
    9), `packages/engine-core/vite.config.ts` or `.github/workflows/ci.yml` (Task 20), or `apps/demo/vite.config.ts`
    (Task 23)**, before the `engine.ts` edits of Tasks 11, 12, 13, 14 and 16, and in Task 24.
  - **After a merge that brings FU-5 in, re-run the clinical suite (Task 22) and `pnpm run audit:physiology`** and
    record any moved number in the gate note. FU-4 never edits the pleth/SpO2-validity lines; if a find block in
    `hemo/pipeline.ts` has moved, re-anchor by its quoted comment.
  - Task 24 Step 1 stops for V.1, **FU-6** or 8b having landed (not only V.1 and 8b).
  - If a find block no longer matches byte for byte, locate the same statement by its quoted comment and make the same
    change; never re-type a line you are not changing.
- **Partition (binding).** Edit ONLY the files each task's **Files** block lists. Owners touched (with the exception
  that allows it):
  - 7a `l2/circ/{baroreflex,coronary,model,drugs,conditions,pleural,params}.ts`, new `l2/circ/{arrest,aliases}.ts`,
    `l2/hemo/{pipeline,params}.ts`. *Orchestrator ruling (FU-4 review), 2026-09-28 (review F18): `pleural.ts`,
    `aliases.ts` (new, Task 11) and — for the CPR constants of Task 6b — `l2/circ/params.ts` and `l2/hemo/params.ts`
    (**E-FU4-15**) were edited by the tasks but missing from this list.*
  - 7g `l2/pk/{combine,row,pipeline,hooks}.ts`, `l2/pk/data/{rows-anaesthetic,rows-cardiovascular}.ts`.
  - 7e `l2/endo/{adapters,pipeline,core,hormones,effects,params}.ts` and `packages/engine-core/src/types-neuro.ts`
    (Task 12's stimulus observer, Task 2's humoral arm). *Orchestrator ruling (FU-4 review), 2026-09-28 (review F18):
    `endo/pipeline.ts` and `types-neuro.ts` were in the file map only.*
  - 7c `l2/blood/{circ-adapter,pipeline}.ts` (**E-FU4-1**: the K term and the absolute ECG K are 7c's; 7a only reads
    `ext.kEcg`).
  - 7d `l2/organs/inputs.ts`, 7e `l2/endo/adapters.ts` (**E-FU4-2**: one MAP source line each).
  - 7e thermal `l2/thermal/{thresholds,environment,heat}.ts` and Stage 3 `l2/resp/pipeline.ts` (**E-FU4-5**, Tasks 15,
    16, 18: the MODELED dead space, the shivering cut-off, the warmer's air temperature).
  - 7b data `data/lung-pathology.ts` (**E-FU4-4**, Task 11: the PE row's PVR key moves to 7a's single source).
  - Stage 3 gas `l2/gas/params.ts` (one constant, Task 17, under E-FU4-5). (E-FU4-6 — L3 SpO2 — is withdrawn: FU-5.)
  - 7x `src/truth.ts` (**E-FU4-3**: two SKIP_PATH entries) and `apps/demo/src/physiology-console/meta.ts` (Task 19).
    *Orchestrator ruling (FU-4 review), 2026-09-28 (review F18): this line said `organs.ts`; Task 19 edits `meta.ts`.*
  - `packages/engine-core/src/engine.ts` (**E-FU4-7**, all FIVE edits: the `tempC` write, the alias pre-step (Task 11),
    the stimulus/vagal observer and the `rhythmRequest` call's `outcome` stream + `hold` flag (Task 12), the
    `automaticityAt` accessor (Task 13) and the `coRefLpm` pkCtx line (Task 14)). *Orchestrator ruling (FU-4 review),
    2026-09-28 (review F18): E-FU4-7 listed three of the five.*
  - `packages/engine-core/src/types-circ.ts`/`types.ts` only where a task says so; `packages/engine-core/vite.config.ts`
    (SLOW groups); `.github/workflows/ci.yml` (Task 20); root `package.json` (the `audit:physiology` script) and
    `.gitignore` (its output folder); `scripts/audit-physiology/**` (new); `apps/demo/{fu4.html,src/fu4.ts,
    scripts/fu4-shots.mjs,scripts/stage7e-shots.mjs,vite.config.ts,e2e/fu4.e2e.ts}`.
  - Tests: the new files named in the tasks; edits to existing tests only where a task names them (flips, titles).
  - Gate: `docs/gates/fu-4.md`, `docs/gates/fu-4/**`, this plan (ticks).
  - **Never touch:** `l2/ecg/**` **except E-FU4-11** (Task 13a's escape-timer reset and the `automaticityAt`
    accessor) — every other rhythm change goes through the existing `requestRhythm`/7g hook paths; `l2/lung/**`
    **except E-FU4-16** (Task 11b's tension accumulation: `l2/lung/params.ts`, and Task 11 edits the catalogue DATA
    file `data/lung-pathology.ts`); `l2/neuro/**`; everything FU-5 owns (`l3/**`, the renderer, skins, audio, the pleth
    amplitude / SpO2-validity lines of `l2/hemo/pipeline.ts`); `pnpm-lock.yaml`; `docs/physiology/**`.
    *Orchestrator ruling (FU-4 review), 2026-09-28 (review F18 and rulings 1/5): the two contradictory `l2/ecg/**`
    clauses are merged into one, and `l2/lung/**` now carries E-FU4-16.*
- **Exceptions — ALL APPROVED BY THE ORCHESTRATOR 2026-09-28** (the R50 review tabled a recommendation per item; the
  orchestrator adopted the table, three items widened or conditional, plus three new ones). Each task restates the one
  it uses; declared-but-unused exceptions are listed as unused in the gate note.
  - **E-FU4-1** 7c `circ-adapter.ts`/`pipeline.ts`: the K term, `ext.kEcg`, absolute ECG K — *approved by the
    orchestrator 2026-09-28*.
  - **E-FU4-2** one MAP source line each in 7d `organs/inputs.ts` and 7e `endo/adapters.ts` — *approved by the
    orchestrator 2026-09-28, **WIDENED** for Task 2's humoral arm: 7e `endo/{hormones,effects,params,adapters}.ts` and
    the `ext.endoHumDV0Frac`/`humSvrF` seam (review F2).*
  - **E-FU4-3** 7x `truth.ts` SKIP_PATH (`acc`, `cppAcc`) — *approved by the orchestrator 2026-09-28*.
  - **E-FU4-4** the 7b catalogue `pe` row loses `pvr` — *approved by the orchestrator 2026-09-28, **EXTENDED** to that
    row's shunt/V·Q keys if Task 11's Step 1 measurement names them (review F6).*
  - **E-FU4-5** Stage 3 `resp/pipeline.ts`, the thermal files, `gas/params.ts` — *approved by the orchestrator
    2026-09-28, **WIDENED** for the R1 dead-space ROOT (Task 15): the t = 0 EtCO2 calibration block, `deadSpace()`, the
    ETT bypass credit and the per-profile derivation of L1's `rr`/`vt`/`etco2` defaults (review F4).*
  - **E-FU4-6** withdrawn (FU-5 owns L3 SpO2).
  - **E-FU4-7** `packages/engine-core/src/engine.ts` — *approved by the orchestrator 2026-09-28 **after listing all five
    edits*** (tempC, the alias pre-step, the stimulus/vagal observer with the `rhythmRequest` `outcome`-stream and
    `hold` arguments, `automaticityAt`, `coRefLpm`).
  - **E-FU4-8** the 7d check-19 MODELED rig's ventilator RR re-derived after G11 (Task 15; bands untouched) —
    *approved by the orchestrator 2026-09-28; **re-derive AGAIN** after Task 15's R1 root, because 12 × 500 then sits
    near PaCO2 38–42.*
  - **E-FU4-9** title/flip edits of 7e's sepsis `it.fails` (Task 8; bodies unchanged) — *approved by the orchestrator
    2026-09-28*.
  - **E-FU4-10** a test-only `coLpm` pin in 7g's Eleveld-equality rig if G10 moves it (Task 14) — *approved by the
    orchestrator 2026-09-28 (precedent E-7e-2, R51 addendum 15 #4)*.
  - **E-FU4-11** Stage 5 `rhythm-state.ts`/`rhythm-engine.ts`, one optional context accessor and one factor (Task 13) —
    *approved by the orchestrator 2026-09-28, **WIDENED** to "the escape timer restarts on every conducted ventricular
    beat" (Task 13a, review F7).*
  - **E-FU4-12** 8a's document data `sanity-docs.ts` (Task 21) — *approved by the orchestrator 2026-09-28*.
  - **E-FU4-13** withdrawn (FU-5).
  - **E-FU4-14** the organ-soak lactate term wherever it lives (Task 19) — *approved by the orchestrator 2026-09-28
    **CONDITIONALLY**: the executor names the file in the gate note BEFORE editing it, and the edit is 7c/7d chemistry
    only.*
  - **E-FU4-15 (new)** `l2/hemo/params.ts` and `l2/circ/params.ts`: the CPR constants and the compression's shape
    (Task 6b) — *added and approved by the orchestrator 2026-09-28 (ruling 3 / review F1).*
  - **E-FU4-16 (new)** 7b `l2/lung/params.ts` and the `RespState` tension accumulation (Task 11b) — *added and approved
    by the orchestrator 2026-09-28 (ruling 1 / review F3); the V.1 request list is updated.*
  - **E-FU4-17 (new)** 7f `neuro-spont.test.ts`'s REFERENCE resting pattern re-derived after the dead-space root
    (Task 15), criterion unchanged — *added and approved by the orchestrator 2026-09-28 (ruling 4 / review F4).*
  - **E-FU4-18 (new)** Stage 5 `l2/ecg/rhythm-engine.ts` (with E-FU4-11): a non-finite scheduled time is loud in tests
    and clamped in the demo, no behaviour change when every value is finite (Task 18g) — *added 2026-09-28 on FU-6's
    Request 3, which measured a 7 kg infant crashing the engine at 240 s.*
- **CI rules (CI amendments 1–4, restated):**
  - `CI=1` for engine tests (6 h long-run horizon); long-run horizons from `test/helpers/longrun.ts`, never hard-coded.
  - Every engine test running more than one sim-minute yields once per sim-MINUTE
    (`await new Promise((r) => setImmediate(r))`) — CI amendment 4: per minute, not per chunk.
  - Slow files go in the SLOW groups of `packages/engine-core/vite.config.ts` (Task 20 splits SLOW into `SLOW_A` /
    `SLOW_B`; every new multi-sim-minute file of this plan joins the group the task names).
  - `tick-bench` (validation) must stay p50 < 6 ms on CI; the arrest machinery runs at 1 Hz and the per-2-ms additions are
    two accumulations (Task 3) and one max/sum (Task 5) — Task 24 re-runs the bench.
  - R36: package-level sweeps over the 32-row lung catalogue keep their explicit 900 s budget.
  - Heavy evidence e2e and screenshot scripts run Chromium only (system Chrome, `PW_SYSTEM_CHROME=1`); gate PNGs
    ≤ 60 KB each (re-take at `deviceScaleFactor: 0.7` or quantise if larger, and record it).
  - Never `git stash` (the stash is shared across worktrees). Scratch and logs under `<scratchpad>/fu-4-integration-polish/`.
  - Bounded waits: every wait on a background process is an `until` loop of ≤ 10 min that re-checks the process.
  - Push after every task's commit. The executor opens the PR (Task 24) and NEVER merges.
- **Commands:** pnpm is not on PATH: `npx -y pnpm@9.15.9 …`. Engine test: `CI=1 npx -y pnpm@9.15.9 --filter
  @pme/engine-core exec vitest run <path>`; the CI split locally: `PME_TEST_SET=fast` / `slow` / (after Task 20)
  `slow-a` / `slow-b` inside `packages/engine-core`. The audit (after Task 1): `npx -y pnpm@9.15.9 run
  audit:physiology [prefix…]` from the repo root. Playwright: `PW_SYSTEM_CHROME=1`.
- Strict TS (`noUncheckedIndexedAccess`, `erasableSyntaxOnly`), `.ts` import extensions, conventional commits. Every
  commit message ends with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and is followed by `git push`.
  The PR title is **"FU-4: integration polish — sympatholysis, emergent arrest, hyperkalaemia, obstructive shock,
  clinical scenario suite"** and its body ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.


## Decisions (made while prototyping; the executor does not revisit them)

- **D1 — G2, anaesthetic sympatholysis is a suppression of the delivered OUTPUT, plus a set-point reset (Task 2).**
  7a's `stepBaro` multiplies every sympathetic effector term (HR arm, SVR, contractility, venous V0 recruitment, venous
  compliance; arterial AND cardiopulmonary limbs) by `outF` AFTER its `SYMP_SAT` clamp, and takes the error against
  `set × setF`. 7g publishes `fx.symp` (= `outF`) and `fx.setF` from two new PD targets. A gain scale (today's
  `gSymp × gv`) cannot reproduce the clinical state-dependence: the error grows until the output is restored, and a
  saturated reflex (tamponade `es` 10 → 23) is untouched by it; an output suppression lowers the ceiling itself, so a
  patient held up by a saturated reflex loses the most — state-dependence emerges from the mechanism, not from
  per-condition multipliers. Rows: propofol `symp` Emax −1.0, EC50 1.0 µg/mL, Hill 2 (Ce 3 µg/mL → output × 0.10;
  Ce 1.5 → × 0.31) and `setF` Emax −0.15 on the same curve; sevoflurane and isoflurane `symp` −0.5/MAC and `setF`
  −0.1/MAC (linear, combine floor 0.05); desflurane none (its sympathetic surge above 1 MAC is 7g's `surge` term);
  every existing term (`svr`, `ees`, `v0Frac`, `gv`, `gvHr`) is kept — T6.3 sized them on the combined MAP fall and the
  what-if (audit W5) showed that they plus a removed output land in band. Sources: direction and near-abolition of
  MSNA at induction — Ebert TJ et al., Anesthesiology 1992;76:725–733 [P]; propofol's MSNA inhibition and baroreflex
  resetting — Sellgren J et al., Anesthesiology 1994;80:534–544 [P]; dose-dependent MSNA inhibition, vasodilation mainly
  by sympathoinhibition — Robinson BJ et al., Anesthesiology 1997;86:64–72 [P], Ebert TJ, Anesthesiology 2005;103:20–24
  [P]; sevoflurane lowers SNA with MAP and no HR change — Ebert TJ, Muzi M, Lopatka CW, Anesthesiology 1995;83:88–95
  [P]. Sizes [ENG], fit targets: healthy 2 mg/kg MAP −25 to −40 % (Miller ch. 21 p. 519; the row's own `onset` string)
  with HR change ≤ ±10, sevoflurane 0.65 MAC −10 to −20 %. The explicit-tone refactor the audit sketched (intrinsic ×
  tone) is NOT done: it would re-stabilise every profile and move Stage 2/7a bands for no gain the prototype needed. The
  A11 rule ("no drug moves the set point", `drugs.ts:5`) is revisited for anaesthetics only (Sellgren 1994).
- **D2 — G1, one myocardial state: `kIsch` is the FLOW share, `cor.hyp` the O2-CONTENT share (Task 4).** R23's
  `kIsch` target used the total deficit (flow × content); FU-3 added `hyp` for the content share. With the floor gone
  the total would count hypoxaemia twice, so `kIsch` now follows `flow/demand` and `hyp` stays FU-3's
  `δ·(1 − o2Rel)`. MODELED: no floor (`K_ISCH_MIN` 0) — a myocardium without coronary flow stops contracting within
  about a minute (Tennant R, Wiggers CJ, Am J Physiol 1935;112:351–361 [P]); the R23 floor 0.2 kept audit B7 at MAP 13
  and SV 2 mL for 15 min. The demand gains a basal share (0.15) and an excitation–contraction share paid per beat (0.2,
  × HR × √contractility) — the unloaded-contraction MVO2 of the PVA–MVO2 relation (Suga H, Physiol Rev 1990;70:247–277
  [P]; Gibbs CL, Physiol Rev 1978 [TXT]) [ENG split]; without them a heart at HR 186 and LVSP 25 needed 40 % of its
  resting O2 and class IV haemorrhage never became ischaemic (audit C4, kIsch 0.46). CPP is taken on the ABSOLUTE LV
  end-diastolic pressure (`lvedp` is transmural; 7a's aorta is extrathoracic, so PEEP and tension PTX lowered CPP
  without the coronary step seeing it). With no beat to read (pulseless rhythm, or none for 3 s) the step reads the
  continuous relaxation-phase CPP (Task 3), perfuses for the CPR relaxation fraction, uses `DEMAND_ARREST` 0.35 (basal
  + E–C) and loses contractility with τ 120 s instead of 20 s — the "electrical phase" of the three-phase model
  (Weisfeldt ML, Becker LB, JAMA 2002;288:3035–3038 [P]): a shock after ≤ 2 min of VF finds a heart that can beat, one
  after 4 min finds kIsch ≈ 0.13 and re-arrests as PEA. The RV gets its own balance (Task 5, D4).
- **D3 — FU-3's asphyxial window is kept by re-fitting FU-3's own [ENG] constant (Task 4).** With the floor gone the
  flow share collapses once the hypoxic heart becomes hypotensive: FU-3's rig arrested at +4.50 min after SaO2 < 60 %
  (band 5–14). `TAU_HYP_S` was fitted [ENG] to that window WITH the floor holding the heart at kIsch 0.2 for ≈ 3 min
  (base: CPP −4 to −9 mmHg while "beating"); re-fitted to the same sourced window: 150 → **260 s** → HR < 40 at +3.43
  min (≤ 6), PEA at **+5.62 min** (5–14), post-arrest window and E-FU3-10 unchanged, reversal 7.0 s. Scan: 150 → 4.50,
  220 → 4.82, 260 → 5.62, 300 → 5.43, 360 → 6.12 (post-arrest HR check misses by 0.2/min at 360). Band unchanged (R45).
  **Orchestrator ruling (FU-4 review), 2026-09-28 (review F13): accepted as a sourced [ENG] re-fit, with three explicit
  steps that are part of Tasks 4, 13, 18d and 24 and must be ticked there.** (i) **Re-run the scan** after Task 13
  (the escape work), after Task 18d (the dead-space root — it moves every ventilated PaCO2 and therefore the hypoxic
  course) and after Task 12, and once more at the gate. (ii) **Choose a value in the MIDDLE of the passing plateau, not
  the first value inside the band** — the scan is non-monotonic (260 → 5.62 but 300 → 5.43), and 260 sits only 0.62 min
  inside 5–14, so a small shift from another task can push it out. (iii) **Record the chosen value's margin to both band
  edges in the gate note.** If the plateau has moved, re-fit and say so; do not keep 260 because it was chosen first.
- **D4 — G5, the RV coronary balance (Task 5).** The RV is perfused through systole and diastole: supply =
  CFR·(MAP − mean RV pressure − P_ZF)/(rest − P_ZF), demand = basal + E–C + work share × (RVSP/RVSP₀); its own
  `kIschRv` (τ as the LV) multiplies RV contractility (MODELED; MANUAL 1). The resting reference is captured from the
  first beat the step reads (the stabilised reference has no RV pressures). Hypoxaemia reaches both ventricles through
  FU-3's `kHyp` (already on all four chambers) — the audit's "CaO2 in the supply" half of G5 is FU-3's and is not
  duplicated. Arrest when either ventricle's flow share ≤ 0.1.
- **D5 — the arrest state machine (Task 6).** `l2/circ/arrest.ts`, one 1 Hz step in `emitSecond` for BOTH modes:
  declare when `min(kIsch, kIschRv) ≤ 0.1` (contractility ≤ 10 % — FU-3's `HYP_ARREST` analogue), or when the
  continuous MAP < 25 mmHg (P_ZF + 10) for 60 s (no flow), or on a hazard (K, cold; D7, D14). FU-3's
  `hypoxicArrestRequest` still runs first in MODELED (unchanged), and both paths record `circ.arrest = {cause, t, from,
  roscS}` and go through the same `requestRhythm` (E-FU3-8). Onset rhythm: one draw on the `outcome` stream —
  VF share = min(0.6, 0.1 × (1 + 2·catecholamine inotropy + 0.5·(K − 6)⁺ + 0.25·(32 − T)⁺)) [ENG around FU-3's
  `P_VF_ONSET` 0.1], asystole FU-3's 2/30 [P], else the organised rhythm continues pulseless (PEA). Draws happen only
  when an arrest is declared or a hazard is non-zero, so every other run keeps its streams untouched. Pre-arrest
  bradycardia: the ischaemic sinus node slows below kIsch 0.5 (`G_SA_ISCH` 1.2 per unit [ENG]), added to FU-3's
  `hypF` (MODELED). ROSC: an engine-declared organised arrest regains its pulse once CPP ≥ 15 mmHg (Paradis CF et al.,
  JAMA 1990;263:1106–1113 [P]) AND `kIsch·(1 − hyp) ≥ 0.4` [ENG] have held 60 s [ENG]; VF needs Stage 4b's shock (its
  outcome table unchanged) and a shock into an unrecovered myocardium re-arrests through the flow-share rule; asystole
  stays (Q3). FU-3's pulseless `cor.hyp` hold now applies only without CPR (CPR reperfuses).
- **D6 — MANUAL (G9) keeps R23's coronary balance and arrests by NO FLOW (Tasks 4, 6).** MANUAL's contractility is its
  set-and-hold tracker's control variable. In the check-18 rig (75 y HTN, 90/52 under GA) the tracker parks an ischaemic
  ventricle at kIsch 0.2, LVEDP 46, CPP ≈ 0 while displaying MAP 65 (FU-3 item 4 defect 1, Q-FU3-4a open). A floorless
  MANUAL spiral arrested that picture (measured: mapLow 24.9, organs-htn check 18 red), so MANUAL keeps the floor 0.2,
  the transmural CPP and R23's demand, and reaches the SAME arrest state through the no-flow rule (MAP < 25 for 60 s:
  audit L-C4 bleed 2.5 L → PEA at 635 s). Everything else of G1 (no-beat CPP, ROSC, onset draw, hazards) is shared.
  Revisit when Q-FU3-4a is ruled (Q9).
- **D7 — G3, potassium (Task 7).** The ECG receives ABSOLUTE K when blood owns it: `bloodEcgTargets` subtracts 7c's
  `NORMAL.k` 4.2 (= the `Modifiers` default) instead of the profile's own set point (audit: profile K 8.5 drew
  `mods.k` 4.2). The membrane-effective K (`kEcg`, calcium-stabilised by 7c's existing `caMem`) reaches 7a as
  `ext.kEcg` and acts three ways: contractility × max(0.3, 1 − 0.2·(kEcg − 8)⁺) [ENG] inside 7c's `kChem`; sinus-node
  depression −0.12 per mmol/L above 7 [ENG]; an arrest hazard (kEcg − 8.5)⁺/120 s⁻¹, VF or asystole 50:50 [ENG]. Calcium
  (via `caMem`), insulin–dextrose, salbutamol and bicarbonate (via 7c's K shift) reverse it through the same variable.
  Thresholds follow the morphology Stage 5.1 already draws (sine wave complete at 8.5) and ERC 2021 "hyperkalaemia
  ≥ 6.5 severe; arrhythmias and arrest" [TXT]; confirm with Ali (Q5).
- **D8 — G4, the arrest reads its own state (Task 3).** A continuous MAP (`circ.mapNow`, τ 2 s at the 10 Hz control
  step, both modes) replaces the last beat for 7d (`organs/inputs.ts`) and 7e (`endo/adapters.ts`); a 2 ms
  accumulation of the relaxation-phase aortic − RA pressure (`circ.cppAcc`, Paradis's CPP) feeds the coronary no-beat
  branch; the `circ` event's `cpp` is the value the coronary step used. `hemo.circ.acc` (the in-progress beat
  accumulator) and `hemo.circ.cppAcc` leave the truth tree (7x's leaf cap: 2 100 leaves reached otherwise).
- **D9 — G6 obstructive shock (Tasks 9–11, UNPROTOTYPED).** ONE PE event and ONE PVR source: `condition pe` stays the
  canonical event; `lungCondition pe` is an alias of it; the PVR comes from 7a's φ mapping only (`PE_VASO` 1.0, the
  calibrated H5 rig: severity 0.75 → PVR × 4.0) and the catalogue row's `pvr` key is removed; the lung row keeps dead
  space, shunt and resistance. ONE tension-pneumothorax pressure source: 7b's per-side `lp.pPtx` (unchanged name and
  place — V.1 reads it); `condition tensionPtx` becomes an alias of `lungCondition ptxTension` (side R unless given) and
  7a no longer writes `ext.pPtx` (kept at 0 for scenarios that poke it). Tamponade gains an accumulation rate and a
  drain; pulsus paradoxus is measured first and then given the smaller of two mechanisms (Task 10).
- **D10 — G7 vagal events (Task 12, UNPROTOTYPED).** A `vagalMs` PD target (RR increment, additive, 7g) and a
  `muscarinic` occupancy (atropine, glycopyrrolate) that blocks it and the vagal baroreflex limb; opioid boluses,
  neostigmine without an anticholinergic and a second succinylcholine dose (7g hook) produce it; the `stimulus` event
  gains an optional `site` (`laryngoscopy`, `oculocardiac`, `peritoneal`) that 7a observes as a transient vagal RR
  increment; empty-ventricle (Bezold–Jarisch) bradycardia below LVEDV 35 % of rest. MODELED only (MANUAL: the
  instructor owns the rate).
- **D11 — G8 terminal systemic states (Task 8).** No new trigger for sepsis or anaphylaxis: they arrest through D5
  (prototype: anaphylaxis severity 1 → PEA at 6 min). MH gets a hyperthermia hazard above 42 °C core [ENG, Q6] that
  joins K's. The warm-sepsis CO 7–9 row stays Q-7e-7 (calibration pass); three of its `it.fails` now meet their bands
  (Task 8 flips them).
- **D12 — G10 flow-dependent propofol distribution (Task 14, UNPROTOTYPED).** For rows flagged `flowDist` (propofol,
  thiopental): V1 × blood-volume ratio and k12/k13 × CO ratio, quantised to 5 % (cache), from `pkCtx.coLpm` and 7c's
  `bvRel`. Targets: 30 % haemorrhage → propofol peak Ce ≥ 1.3× healthy (Johnson KB et al., Anesthesiology
  2003;99:409–420 [P, numbers to extract]; Kazama T et al., Anesthesiology 2002;97:1156–1161 [P]).
- **D13 — G11 MODELED dead space (Task 15).** The mechanism is the MANUAL EtCO2 fit (`co2.vdExtraMl` 61 mL, made at t =
  0 for the resting spontaneous pattern) carried into MODELED mechanical ventilation: VD 154 + 50 + 61 = 265 mL, VD/VT
  0.53 at 12 × 500, VA 2.82, PaCO2 60 by 60 min. MODELED PPV now uses anatomical + apparatus only (VA 3.55, PaCO2 48.5
  at 60 min); spontaneous MODELED breathing keeps the fit (its drive's set point was calibrated with it — excluding it
  there broke two 7f bands by < 1 %). The remaining gap to PaCO2 40 is the anatomical dead space with an ETT (≈ 1
  mL/kg instead of 2.2 mL/kg IBW) — Stage 3/V.1's re-derivation (Requests). One rig compensated the old value and is
  re-derived under **E-FU4-8** (organs-tbi check 19, MODELED: RR 18 → the RR that restores its PaCO2 38–42 premise).
- **D14 — G12 hypothermia (Task 16).** Shivering fades between 32 and 30 °C core (Danzl DF, Pozos RS, NEJM
  1994;331:1756–1760 [TXT]: shivering stops in moderate hypothermia) [ENG span]; VF hazard below 28 °C
  (28 − T)⁺/600 s⁻¹ (ERC 2021 hypothermia: VF risk below 28–30 °C, handling) [ENG]; AF below 32 °C is left to Ali (Q11).
- **D15 — G4 (b) arrest EtCO2 kinetics (Task 17, UNPROTOTYPED; orchestrator update 2026-09-28).** `LOW_FLOW_TAU_S`
  5 → 40 s: after VF the EtCO2 falls over 1–2 min to ≈ 5–10 mmHg, not within 20 s [ENG fit]. The AF pulse deficit (44 %
  non-ejecting beats at 150/min vs ≈ 10–20 %) is investigated before any change. The audit's G14 (pulse-oximeter
  dropout) moved to FU-5 with L3 (Requests).
- **D16 — item 1, forced air (Task 18, UNPROTOTYPED).** `thermal { warming: true, warmAirC?: 32 | 38 | 43 }` sets the
  blanket's air temperature (Bair Hugger low/medium/high); heat ∝ (T_air − T_periphery) already self-limits; default
  43 keeps every 7e number.
- **D17 — CI split (Task 20).** `SLOW` becomes `SLOW_A` (the `*longrun*` files, `engine-pipeline`, `organs-soak`, the
  FU-4 clinical suite) and `SLOW_B` (the rest); `PME_TEST_SET=slow` still runs both; CI runs `slow-a`/`slow-b` as a
  matrix. Local wall (this prototype): 1 242 s for the whole slow set → ≈ 620 s each before the suite is added.
- **D18 — G13 baroreflex resetting is not changed.** Acute resetting in 7 min (Pulse-derived, N-P16) erodes shock
  compensation; there is no textbook number that overrides it and the arrest machinery now bounds the shock states
  that exposed it. Q8 for Ali.
- **Decided from Ali's twelve questions where the textbook answer is unambiguous (each "confirm with Ali"):** Q1 healthy
  induction target MAP −25 to −40 %, HR unchanged (Miller ch. 21 p. 519) — prototype −31 %, +3/min; Q3 (part) CPP
  ≥ 15 mmHg is necessary for ROSC (Paradis 1990) and exsanguination/obstruction arrests are predominantly PEA
  (onset draw: VF 0.1 base); Q7 Ring–Messmer grade IV IS arrest — severity 1 is profound shock that arrests
  emergently within minutes (prototype 6 min); Q9 (minimum) MANUAL arrests through the same state (D6); Q10 fix the
  mechanism, not the preset (D13); Q11 (part) shivering stops around 30–32 °C and VF risk rises below 28 °C (D14).

### Decisions added by the R50 review and the orchestrator's rulings (Tasks 18a–18g)

Each of these is an **Orchestrator ruling (FU-4 review), 2026-09-28**; the executor does not revisit them, and the
number beside each is the prototype's measurement, not a target to tune towards.

- **D19 — CPR generates pressure from VOLUME, and the arrest reflex fails with the brainstem (ruling 3, Task 18a).** The
  compression is scaled by intrathoracic stressed volume ÷ `V_CPR_REF_FRAC` × blood volume (0.08); the delivered
  sympathetic output is × `brainstemOutF(cbfRel)` (full at 0.9, zero at 0.2 — E-FU3-10's signal); the release is
  incomplete (`CPR_RELEASE_RESIDUAL` 0.65 on the venous side) and the atria are a **Starling resistor while compressions
  run**, so the catheter reads the intrathoracic pressure; VF's demand is `DEMAND_VF` 0.75, not `DEMAND_ARREST` 0.35.
  `CPR_CARDIAC_MMHG`/`CPR_THORACIC_MMHG` 35 → **24**. Result: CPP **23.8** (Paradis 15–25), RA relaxation **18.0**,
  **no pulse from CPR alone after exsanguination**. Four parts, because the measurement named four terms — none of them
  is optional.
- **D20 — an untreated PEA decays; effective CPR suspends the decay (ruling 7, Task 18b).** Rate ∝ `kIsch·(1 − hyp)`
  down to 18/min, then `agonal` below `PEA_IDIO_M` 0.04, then asystole as a hazard with a 420 s mean; reversible from
  `agonal` back to `a.from`. `arrest` carries `rate0`/`rateNow`.
- **D21 — a tension pneumothorax fills through a ONE-WAY VALVE and the catalogue value is a CEILING (ruling 1, Task
  18c).** `lp.pPtx` keeps its name, place and unit and delivers `ptxAcc`. **There is exactly one brake** — the valve
  itself (air stops crossing at the peak alveolar pressure), which is why the pressure a tension pneumothorax reaches is
  bounded by the airway pressure; adding a second (pressure–volume) brake reached only 16 of 25 mmHg in 24 min. PEA at
  **8.9 min** on PPV (band 3–10), no PEA in 24 min spontaneously.
- **D22 — the EtCO2 → dead-space calibration belongs to MANUAL, and an artificial airway REPLACES the airway it bypasses
  (ruling 4 / FU-6's R1, Task 18d).** MODELED takes the resting PaCO2 from the patient (`pat.paco2Rest` 40; pregnancy 31
  under R10); `ETT_BYPASS_ML_PER_KG` 1.1, floored at 30 % of the anatomical value. Spontaneous patients land at exactly
  2.2 mL/kg IBW, ventilated adults at 1.8–2.0. The "7f break" was the old calibration's artefact, so `neuro-spont` is
  re-referenced (E-FU4-17) with its criterion intact.
- **D23 — haemorrhage has a HUMORAL arm that anaesthesia does not suppress, and `PROPOFOL_SYMP` is NOT re-fitted
  (ruling 2, Task 18e).** `h.hum` from baroreceptor unloading (hyperbolic, EC50 30 mmHg, τ on 150 s / off 600 s) drives
  `humSvrF` (0.32) and `humDV0Frac` (0.30) **outside `alpha()`** and into 7a's ONE shared unstressed reservoir. Class III
  + 2 mg/kg: **nadir 28.7, no arrest** (was PEA +80 s); the cost is the healthy band at **−24 %** (target −25 to −40),
  which stays `it.fails` with its number because the two sourced targets pull against each other (Ali's Q1). The cause
  of the old collapse is named: `outF` × `dV0` returned the reflex's whole ≈ 840 mL recruitment at induction.
- **D24 — the vagal events failed because a field was DROPPED, not because a dose was small (review F10, Task 18f).**
  `model.ts`'s 7g → 7a merge did not copy `vagalMs`; `bolusTimes` was recorded for gamma rows only; an
  engine-initiated rhythm was never rate-held. No PD constant changed. The repeat-sux response is a **seeded draw**
  (0.35 adult / 0.7 child), never deterministic. Measured: fentanyl 10 µg/kg **74 → 48**, neostigmine alone **74 → 46**,
  both abolished by an anticholinergic given first.
- **D25 — Task 13 splits, and its expected value was wrong (ruling 5, review F7).** 13a (the escape reset) lands before
  13b (the depression), in its own commit. With sinus 30 and an intact 40/min junctional focus the monitor shows
  **40 QRS/min** with AV dissociation — not 30, not 50, never the sum.
- **D26 — a non-finite derived time is loud in tests and clamped in the demo (FU-6's Request 3, Task 18g, E-FU4-18).**
  A physiological dead end must never kill the engine for an operator, and must never pass silently in CI. Every clamp
  that fires is reported in the gate note as an upstream bug.
- **D27 — the physiology suite asserts TRUTH, not the display (review F9).** S9 and every other physiological assertion
  read `resp.o2.sao2` / `blood.out`, never `num.spo2.shown`: once FU-5 makes SpO2 invalid at low perfusion, a
  `null → −1` would satisfy "SpO2 < 90" and the test would pass on a monitor dropout. Displayed values stay in a
  separate column, for the screenshots only.


## Prototype results (before → after; seed 7 unless stated)

**Base.** Prototyped in `<scratchpad>/fu-4/wt`: `origin/main` `7a181b5` merged locally with `origin/fu-3-followups`
`dd887be` (commit `57beb89`, never pushed). FU-3 then merged as PR #23 (`eab2371`, head `26f5290`; `origin/main` is
`84fc9af`): `git diff 57beb89 84fc9af -- packages apps scripts package.json .gitignore .github` is EMPTY (the branch moved
by docs only), so every find block below was re-checked mechanically against `84fc9af` (see Self-review). The
prototype is `scratch/plans-backup/fu-4-prototype.patch` (1 974 lines: 15 source files, 8 new test files, the audit
scripts); the plan's code equals it except comments, Task 8's hyperthermic term and the UNPROTOTYPED tasks.

**Suites on the prototype (Tasks 2–7, 15, the flips not yet applied):** typecheck clean · fast set 250 files / 1 109
passed / 1 skipped / 1 failed = `pk-bus` "VA > 3" `it.fails` now passing (flip, Task 15) · slow set 41 files / 183 tests:
177 passed; the 6 others are the 5 pre-declared flips (circ-sanity-1 propofol; FU-3 final HR; three 7e sepsis rows)
and the one rig that compensated the old dead space (organs-tbi check 19 MODELED, E-FU4-8: RR 15 restores the premise)
· `tick-bench` p50 0.52 ms (base 0.50–0.63 ms, same machine, 3 runs each) · the new files: `test/l2/circ/{sympathetic-output,
coronary-arrest,rv-coronary,arrest}.test.ts` 21 tests, `circ-arrest-state` 2, `circ-lowflow-arrest` 4, `blood-k-rhythm` 3 —
all green.

**G2 — the propofol state-dependence matrix (`pnpm run audit:physiology`; control-subtracted; audit §K):**

| operating point | before ΔMAP (min MAP) | after ΔMAP (min MAP) | ΔHR before → after | arrest after |
|---|---|---|---|---|
| healthy 40 y | −10 % (86) | **−31 % (67)** | +17 → **+3** | no |
| 80 y hypertensive | −11 % (109) | **−30 % (86)** | +12 → 0 | no |
| AS + CAD + HTN 75 y | −11 % (105) | **−30 % (82)** | +12 → 0 | no |
| HFrEF 60 y | −10 % (78) | −28 % (62) | +14 → +3 | no |
| tamponade 1 (250 mL) | −16 % (73) | **−83 % (15)** | +3 → −57 | **PEA at +190 s** |
| hypovolaemia −1.5 L | −25 % (60) | **−96 % (4)** | +7 → −74 | **PEA at +95 s** |
| massive PE (φ 0.8) | −16 % (67) | −82 % (13) | −1 → −26 | PEA at +55 s |
| septic shock (warm) | −15 % (66) | −88 % (9) | 0 → −104 | PEA at +180 s |
| MANUAL healthy / hypovolaemia | −21 % / −30 % | −21 % / −30 % (unchanged: no reflex in MANUAL) | 0 / +4 | no |

Sevoflurane 2 % dial (0.65 MAC at 20 min): −6 % / HR +16 → −12.5 % / +2; 3 % dial (≈ 1 MAC): −21 % / −1 (S2).
Propofol 1 mg/kg healthy: −6 % → −19 %. Tamponade + 1 mg/kg: MAP 79 → 57, no arrest (S4b).

**G1 — Ali's case (audit B7: tamponade 1 at 60 s → propofol 2 mg/kg at 660 s → 1 mg/kg at 900 → PEEP 15 at 1 200 →
sevoflurane 2 % at 1 500 → bleed 2 L at 2 100):** before — MAP 89 → 76 → 70 → 69 → 67 → 13, HR 187 sinus, SpO2 98–99 %
for 15 min, never pulseless. After (Tasks 2–7):

| t (s) | event | HR | MAP | CO | CPP | kIsch LV / RV | rhythm |
|---|---|---|---|---|---|---|---|
| 60 → 120 | tamponade 1: compensation | 74 → 111 | 96 → 73 → 92 | 2.95 → 3.20 | 40 → 64 | 1.00 / 1.00 | sinus |
| 660 | propofol 2 mg/kg into the compensated state (CVP 17) | 106 | 89 | 3.21 | 60 | 1.00 / 1.00 | sinus |
| 720 | +1 min | 89 | 51 | 2.65 | 35 | 1.00 / 1.00 | sinus |
| 780 | +2 min | 89 | 44 | 2.47 | 29 | 0.86 / 0.85 | sinus |
| 820 | +2.7 min | 91 | 35 | 1.68 | 19 | 0.45 / 0.40 | sinus |
| 840 | +3 min — pre-arrest bradycardia | 64 | 21 | 0.54 | 5 | 0.17 / 0.15 | sinus |
| **≈ 850** | **PEA — 3.2 min after the first dose** (organised sinus 49 → 46/min, no ejection; SpO2 99 → `--`) | 49 | 15 | 0 | 2 | 0.10 / 0.10 | sinus, pulseless |

The later steps (second propofol dose, PEEP, sevoflurane, the bleed) are never reached alive — Ali's R53 statement
("even a moderate propofol dose can cause collapse and arrest") is what the model now does. Without Task 5 (RV balance)
the same run fell to MAP 44 and arrested only at the second dose (PEA at 1 055 s, 2.6 min after it).

**G1 — the arrest table (all 79 audit scenarios; before: only X1's commanded VF and FU-3's I1 PEA at 1 065 s):**
class IV haemorrhage PEA 695 s (MAP < 30 at 645 s; HR peak 184 → 91 at the arrest) · hypovolaemia + propofol PEA
+95 s · tamponade chain B6 PEA 1 195 s (after the second 1 mg/kg) · tamponade + propofol 4 mg/kg PEA +110 s · massive
PE alone PEA 1 425 s (23 min); + PEEP 15 PEA 1 015 s; + propofol PEA +55 s · tension PTX (7b) PEA 120 s; (7a) 695 s
(after PEEP 15) · anaphylaxis 1 PEA 300 s (+ PEEP 15: 275 s) · septic shock warm + propofol PEA +180 s (alone: no
arrest in 40 min) · K 9.5 profile VF 65 s · burns + sux VF 525 s (+225 s) · apnoea (I1) asystole 870 s · MANUAL bleed
2.5 L PEA 640 s (no-flow route; before: MAP 10–16 for 35 min) · MANUAL tamponade chain: no arrest (MAP ≥ 37; MANUAL keeps
R23) · healthy/elderly/AS + CAD/HFrEF inductions, class I–III haemorrhage, sevoflurane, PEEP, pressors, vagal and
thermal rows: no arrest · MH (F4): no arrest (Task 8 adds the hyperthermic hazard).

**G1 — ROSC probe:** exsanguination PEA at 695 s; CPR q 1 + 2 L balanced + adrenaline 1 mg at 760 s → pulse at 850 s
(90 s; CPR CPP 47–57), MAP 84 at 935 s; CPR alone → pulse at 850 s too (the CPR model's CPP is generous — Q13).

**G3:** K 8.5 profile `mods.k` 4.2 → 8.5, HR 74 → 64, kLv 0.92 · K 9.5 profile → VF 62–65 s · burns + sux → VF at
+221–225 s, asystole by 1 200 s · CaCl2 1 g first → no arrest in 15 min · 7c's `blood-hyperk` sanity (K 7.7 at 4 min,
QRS 93 → 126 → 93 ms with Ca) unchanged.

**G4:** VF: continuous MAP 96 → 17–19, the `circ` event's CPP 79 → **1.9** (max), brain CBF 1.0 → **0.00**; CPR q 1:
CPP **42.8–46.3** (continuous), CBF 0.58; MANUAL check 18 unchanged (mapLow 64.28 vs 64.39, CBF 0.667 vs 0.666,
hypocapnia 0.377 vs 0.377, recovery MAP 86.85 vs 86.57 — its `it.fails` stays).

**G5:** see the matrix (PE rows, tamponade); `circ-sanity-2` H5/H7/H8 green (measured at 2 min).

**D3 — FU-3's asphyxia with the floor gone (`circ-hypoxic-arrest`, seed 16):** TAU_HYP_S 150 → PEA +4.50 min (band 5–14:
fail); 220 → +4.82; **260 → +5.62** (HR < 40 at +3.43, post-arrest window, E-FU3-10 and the 7.0 s reversal green; final
HR 74.4 → FU-3's `it.fails` flips); 300 → +5.43; 360 → +6.12 (the post-arrest monitor-HR mean misses by 0.2/min).
G_SA_ISCH 0 and D_BASAL/D_EC 0 each leave +4.50/+4.57: the floor removal itself moved it.

**G11 (`probe-va`):** VA / PaCO2 at 60 min — 12 × 500: 2.82 / 60 → **3.55 / 48.5**; 14 × 500: → 4.14 / 41.8; 12 × 600:
→ 4.75 / 36.6. Excluding the fit in spontaneous MODELED breathing too broke `neuro-spont` (RR 10.5 % vs 10 %, Winter's
PaCO2 28.45 vs > 28.5) — hence mechanical ventilation only. 7e's sepsis rig moved INTO three bands (warm HR 131 → 118,
MAP 61 → 56; cold SVR 1507 → 1444).

**Clinical suite (Task 22 file on the prototype):** S1 ✓ (0.69, ΔHR +3), S1b 0.84 (`it.fails`), S2 ✓ (−21 %), S4a ✓
(+195 s), S4b MAP 57 (`it.fails`), S5 ΔMAP 4 vs 1 (`it.fails`), S6a ✓, S6b 1.17 (Task 14), S8 (`it.fails`, Q14), S9
(Task 11), S10 ✓ (+240 s), S10b ✓, S13 CPP 43–46 (`it.fails`, Q13), S14 ✓ (−31 %, ΔHR 0), S16 (Task 8).

### Prototype results for Tasks 18a–18f (the review's mechanism fixes, 2026-09-28)

**Base for these numbers:** a throwaway worktree of `origin/main` `4f4ce06` with **Tasks 0–18 applied by
`fu-4-verify.py`** (19 creates, 217 edits, 0 errors), then the six mechanisms added; `tsc --noEmit` clean on
`engine-core` with everything applied; seed 7; measured with `scripts/audit-physiology` probes and
`pnpm run audit:physiology`. The full logs and the probe sources are in the scratch handed to the executor.

**18a — CPR: the measurement that named the terms (relaxation vs compression phase split at 10 ms), BEFORE the fix:**

| rig | relax Ao | relax RA | relax Ao−RA | compr Ao mean/peak | engine `cor.cpp` | kIsch |
|---|---|---|---|---|---|---|
| VF + CPR q 1.0, 70 s (before adrenaline) | 47.7 | 1.8 | 45.9 | 71.8 / 89.5 | 46.3 | 0.95 |
| VF + CPR q 1.0, 90 s after adrenaline 1 mg | 54.0 | 2.5 | 51.6 | 77.6 / 94.0 | 52.0 | 0.99 |
| VF + CPR q 1.0, 4 min | 53.5 | 2.4 | 51.1 | 77.2 / 93.8 | 51.6 | **1.00** |
| exsanguination (3 L) PEA + CPR alone, 100 s | 74.3 | **−15.8** | 90.1 | 98.4 / 125.1 | 57.9 | 0.70 |

The RA relaxation pressure is 1.8–2.5 where Paradis measured 15–25; and on the exsanguinated rig the compression drove
**RV volume to −165.9 mL** and the systemic venous reservoir to **−626 mL** while generating 74 mmHg of aortic pressure
out of an empty thorax. `Rsys` sat at ×1.57 of base before adrenaline and ×2.68 after, `es` saturated throughout.

**18a — the fit sweep (VF + CPR, 4 min): card=thor / release residual / quality → Ao_rel / RA_rel / CoPP / kIsch / MAP / cbfRel / Rsys÷base / CO**

| card=thor | resid | q | Ao_rel | RA_rel | CoPP | kIsch | MAP | cbf | Rsys/b | CO |
|---|---|---|---|---|---|---|---|---|---|---|
| 35 | 0.35 | 0.8 | 49.8 | 15.7 | 34.5 | 1.00 | 60.2 | 0.76 | 1.49 | 1.7 |
| 28 | 0.50 | 0.8 | 44.4 | 18.0 | 26.8 | 1.00 | 52.9 | 0.61 | 1.36 | 1.6 |
| 24 | 0.50 | 0.8 | 38.2 | 14.0 | 24.9 | 0.99 | 45.5 | 0.48 | 1.25 | 1.4 |
| **24** | **0.65** | **0.8** | **41.6** | **19.5** | **22.6** | 0.92 | 49.0 | 0.53 | 1.29 | 1.5 |
| 24 | 0.65 | 1.0 | 51.4 | 28.8 | 22.5 | 0.95 | 60.5 | 0.68 | 1.41 | 1.8 |
| 20 | 0.35 | 0.8 | 28.7 | 7.6 | 21.5 | 0.89 | 34.6 | 0.22 | 1.04 | 1.1 |

The brainstem arm is visible in the sweep: as `cbfRel` falls 0.76 → 0.22 the reflex withdraws and `Rsys ÷ base` falls
1.49 → 1.04 — the loop converges instead of sitting at its ceiling for the whole resuscitation.

**18a — after, at the chosen constants (24/24, residual 0.65, `DEMAND_VF` 0.75), standard-quality CPR q 0.8:**

| point | relax Ao | relax RA | CoPP | kIsch | Rsys÷base | cbfRel |
|---|---|---|---|---|---|---|
| VF + CPR, 70 s, before adrenaline | 40.2 | 18.0 | **23.8** | **0.56** | 1.22 | 0.45 |
| + 90 s after adrenaline 1 mg | 51.2 | 22.4 | 30.0 | 0.88 | 2.53 | 0.65 |
| + 4 min | 51.2 | 22.7 | 29.3 | 0.96 | 2.48 | 0.71 |
| + 10 min | 48.1 | 22.0 | 27.4 | 0.90 | 1.98 | 0.77 |
| exsanguination PEA + CPR alone, 100 s | 1.6 | −0.7 | **3.1** | 0.00 | 1.11 | 0.00 |
| exsanguination PEA + CPR alone, 10 min | 1.6 | −0.7 | **3.1** | 0.00 | 1.12 | 0.00 |

- **CoPP 23.8 at standard-quality CPR, inside Paradis's 15–25, with RA relaxation 18.0 inside Paradis's 15–25. S13
  passes.**
- **CPR alone after full exsanguination: no pulse in 10 min** (own SV 0, kIsch 0.00) — the ruling's requirement.
- **CPR + 2 L + adrenaline 1 mg: ROSC (own SV > 20 mL) at 220 s** after CPR starts, with the 2 L given over 300 s (so
  only ≈ 1.2 L is in at 3 min): the existing "pulse within 3 min" assertion needs **4 min**, or a faster bolus.
- **Residual, recorded not fitted away:** with adrenaline the CoPP reaches 30 (above the band — adrenaline raising CPP is
  Paradis's own finding) and `kIsch` climbs back to 0.88 / 0.96 / 0.90 at 90 s / 4 min / 10 min. The "kIsch stays < 0.9
  for 10 min of VF with CPR" test is met on **CPR alone** (0.56) and is marginal with adrenaline (0.90) — assert it on
  CPR alone and record the adrenaline number.

**18b — the PEA decay (exsanguination PEA, seed 7):** untreated — PEA (pulseless sinus) at 525 s → rate to 18 →
**idioventricular (`agonal`) at +110 s → asystole at +260 s**; with effective CPR + 2 L + adrenaline (CoPP 29, m → 1.00)
— **no decay at all through 30 min**. Before: "sinus" PEA 84 → 30/min in 5 min then **flat at 30/min for 20 min**, never
asystole. Incidental finding: CPR started at the MOMENT of arrest in a still-bleeding patient (2.3 of 3 L out) DOES
restore a pulse — the volume factor is still large — so 18a's "no pulse" test specifies FULL exsanguination, which it
does.

**18c — the tension pneumothorax (seed 7):** PPV (VCV 12 × 600, PEEP 5) — pPtx 15.7 at +60 s, plateau **20.2 mmHg**,
MAP 79 → 59, CVP 21 → 25, CO 2.3 → 1.3, SpO2 85 → 54, EtCO2 23 → 17, **PEA at +535 s (8.9 min)**; spontaneous, no airway
device — pPtx 15.1 at +60 s, plateau 19.3, MAP holds 87–95, CO 3.7 → 2.8, SpO2 82 → 67, **no PEA in 24 min**;
decompressed at +240 s (pPtx 19.4, MAP 58.6) — **MAP 64.4 at +5 s and 82.2 at +10 s** (S8's "≥ 65 within 1 min" met in
10 s). On this rig the peak alveolar pressure is 25.9 cmH2O, so the pressure plateaus at ≈ 20 mmHg and the catalogue's 25
is never reached: it is an upper clamp, not the delivered value.

**18d — the dead-space table:** see Task 18d (man 12 × 500 PaCO2 60 → **38.5**; woman 12 × 400 **103 → 42.7**, pH 7.06 →
7.375; child 4 y spontaneous 49–52 → 37.6; spontaneous patients exactly 2.2 mL/kg IBW). `pk-bus`'s VA flip holds with
room to spare (4.5 L/min at 12 × 500).

**18e — the four-patient propofol table and the shock rows:** see Task 18e (healthy −24 %, 80 y HTN −22 %, AS + CAD
−22 %, HFrEF −22 %, no arrests; severe tamponade −81 % with PEA at 780 s; Ali's B7 arrest at 780 s with lactate 12.3;
class III control MAP 81.3; **class III + propofol nadir 28.7, NO arrest** where it was PEA at +80 s; MANUAL class III +
propofol MAP 35.5).

**The integrated `pnpm run audit:physiology` on the fully applied tree (79 scenarios, ≈ 5 min wall, 2026-09-28).** These
are the numbers the gate note's "after" column takes, and they differ slightly from the per-rig probes above because
every mechanism is now in at once (Task 14's distribution included):

| state | pre MAP | ΔMAP % | at t+ | ΔHR | min MAP | arrest |
|---|---|---|---|---|---|---|
| healthy 40 y | 96 | **−23 %** | 70 s | +1 | 74 | no |
| 80 y hypertensive | 121 | −20 % | 80 s | −1 | 97 | no |
| AS + CAD + HTN 75 y | 117 | −20 % | 80 s | −2 | 93 | no |
| HFrEF 60 y | 87 | −21 % | 70 s | +2 | 69 | no |
| severe tamponade (250 mL) | 89 | −80 % | 135 s | −59 | 18 | **PEA at +120 s** |
| **hypovolaemia −1.5 L (class III)** | 84 | **−64 %** | 55 s | −28 | **31** | **NO ARREST** (was PEA +80 s) |
| massive PE (φ 0.8) | 79 | −80 % | 80 s | −37 | 16 | PEA at +60 s |
| tension pneumothorax (7b, R) | — | — | — | — | — | already arrested before the dose (below) |
| septic shock, warm | 86 | −39 % | 85 s | −47 | 52 | no |
| MANUAL healthy | 107 | −20 % | 195 s | 0 | 85 | no |
| MANUAL hypovolaemia | 53 | −35 % | 210 s | +4 | 36 | no |

**Ali's tamponade timeline (B7), after:** 660 s propofol 2 mg/kg into the compensated tamponade (MAP 90, HR 102, CVP 17,
CO 3.19) → +60 s **MAP 46**, HR 81, CO 2.49, CoPP 28, kIsch 0.90 → +120 s **MAP 20, CO 0.23, CoPP 3, kIsch 0.11,
pulseless** → **PEA at 780 s (2 min after the dose)** → +60 s MAP 19, CO 0, EtCO2 4 → **+120 s the rhythm is `agonal`**
(the new decay, EtCO2 1, pH 7.33, lactate 1.9). The later steps are never reached alive, which is Ali's R53 statement.

**The class III + propofol course (C1), after:** bleed 1 500 mL over 600 s → compensated at 900 s (MAP 84, HR 116,
CO 3.00, lactate 2.1) → propofol 2 mg/kg at 960 s → **nadir MAP 30.3 at ≈ +60 s** (CO 2.00, kIsch 0.96) → **recovers to
35 at +120 s, 41 at +240 s, 46 at +9 min**, lactate 2.4 → 3.8, **no arrest and no pulseless beat at any point**. The
humoral arm's τ is visible in the recovery.

**The CPR CoPP (X1: commanded VF at 300 s, CPR q 1 from 330 s, adrenaline 1 mg at 450 s), after:** CoPP **24** at 360 s
and **26** at 420 s (CPR alone, kIsch 0.67), **34** at 480 s and 32 at 600 s after adrenaline (kIsch 0.81 → 0.97), **29 at
900 s** (10 min, kIsch 0.88–0.97), with the CPR MAP 47–65 and CO 1.0–1.8 L/min. Before the fix the same rig read
**CoPP 46 → 52 with kIsch 1.00**.

**The tension pneumothorax time to PEA (E1 and E2 — identical, so Task 11's alias holds), after:** onset at 60 s →
+60 s MAP 80, CVP 19.5, CO 2.26, SpO2 86 → +240 s MAP 61, CVP 22.1, CO 1.25, SpO2 65, EtCO2 15 → +420 s MAP 61, CO 1.19,
SpO2 56 → **arrest at 550 s = 8.2 min after onset** (asystole, cause `lowFlow`; the step model arrested at 120 s, 60 s
after onset). Inside the ruling's 3–10 min.

**Other arrests that moved in the integrated run (the executor compares against Task 6 Step 8's table):** tamponade +
1 mg/kg now arrests at 915 s (S4b's arrest side changes — re-check its `it.fails` wording); tamponade + 4 mg/kg 745 s;
class IV haemorrhage 595 s (MANUAL 640 s); PE + propofol + PEEP 720 s; anaphylaxis 275 s; MH VF at 2 785 s (46.4 min);
K 9.5 VF 65 s; burns + sux VF 525 s; **the apnoea rig (I1) now arrests at 1 350 s with the rhythm `agonal`** — the PEA
decay is visible end-to-end. Healthy, elderly, AS + CAD, HFrEF, class I–III haemorrhage, sevoflurane, PEEP, pressors,
the vagal rows, cooling and warm sepsis: no arrest.

**18f — the vagal events:** see Task 18f (fentanyl 10 µg/kg **74 → 48**, abolished by glycopyrrolate; remifentanil
3 µg/kg 74 → 52; neostigmine 0.05 mg/kg alone **74 → 46**, blunted to 62 by glycopyrrolate; the repeat-sux draw fires on
1 of 3 seeds in both the adult and the child rig and 0 of 3 after atropine; atropine's own +27 unchanged). The measured
concentration scale, for the record: fentanyl 10 µg/kg peaks at Ce **13.3 ng/mL**, remifentanil 3 µg/kg at **12.3**,
neostigmine 0.05 mg/kg at **1.0**; the 4 y child reaches only **3.06** for the same per-kg fentanyl dose.


## Requests to other stages

- **Stage V.1 (ventilator follow-up; lands AFTER FU-4, R53 — orchestrator note 2026-09-27):**
  1. V.1 re-anchors on FU-4. FU-4's final names it will meet: `condition pe` is the ONE PE event (`lungCondition pe`
     is its alias, both give identical state); the ONE PE PVR source is 7a's φ mapping (`circ/conditions.ts`
     `PE_MAX_FRAC` 0.8, `PE_VASO` 1.0 — severity 0.75 → PVR × 4.0, 1 → × 9.0; the catalogue row
     `data/lung-pathology.ts` `pe` loses its `pvr` key, so its data doc regenerates); the ONE tension-pneumothorax
     pressure source is 7b's per-side **`lp.pPtx` — unchanged in name, place and unit (mmHg)**; `condition tensionPtx`
     is an alias of `lungCondition ptxTension` and 7a's `ext.pPtx` is no longer written (it stays in the type, 0).
     The ventilator-link massive-PE profile (lung `pe` only) therefore gets the obstructive picture through the alias.
  2. **Dead space overlap (G11, Task 15 — REPLACED by the root fix, Task 18d).** *Orchestrator ruling (FU-4 review),
     2026-09-28 (FU-6's R1 ruled to FU-4 / review F4):* FU-4 now owns the ROOT, so the items this section left to V.1 are
     FU-4's and are **done in Task 18d**: the MANUAL EtCO2 calibration no longer runs in MODELED at all (not merely for
     mechanical ventilation), the resting PaCO2 comes from the patient (`pat.paco2Rest`), and an artificial airway
     REPLACES ≈ 1.1 mL/kg IBW of anatomical dead space with the apparatus volume (`ETT_BYPASS_ML_PER_KG`). Measured
     after: man 12 × 500 PaCO2 38.5, woman 12 × 400 PaCO2 42.7 (was 103), child 4 y spontaneous 37.6.
     **What V.1 must know:** `deadSpace(rs, l1)` takes L1 for the mode, `RespState` gains `ptxAcc`/`ptxCeil` (Task 18c)
     and `lp.pPtx` now carries an ACCUMULATED pressure that rises over minutes toward the catalogue ceiling — V.1's
     `pleuralCmH2O` reader is unchanged but its numbers move, and a V.1 test that assumed the instantaneous 25 mmHg must
     be re-derived. Also remaining for V.1: the paediatric low-dead-space apparatus branch if Task 18d's Step 2 left it
     as a question, and the Stage 3/7b EtCO2 tests calibrated at 12 × 500.
  2b. **FU-6's Request 3 back to FU-4 (2026-09-28), accepted:** a **7 kg infant on an ETT with volume control crashed the
     engine at 240 s** (`"rhythm sinus: next event time is NaN"`) because the MANUAL calibration gave it ≈ 400 mL of dead
     space and PaCO2 climbed until a derived value went non-finite. FU-4 answers with **Task 18d Step 2b** (a named
     infant test: PaCO2 35–45, no NaN over 30 min, at the patient's own defaults) and **Task 18g** (a non-finite
     scheduled time is loud in tests, clamped with one warning in the demo — E-FU4-18). FU-6 inherits the guard and
     should report any clamp it sees.
  3. **Anaphylaxis in MANUAL:** FU-4 does NOT make 7e's haemodynamics act in MANUAL (Q9 open), so V.1's anaphylaxis
     stand-in stays; if Ali rules for MANUAL physiology later, that is a request V.1 can take up.
  4. The 7x console labels (Task 19) are unit rules by field suffix, so V.1's new `pleuralCmH2O` fields get cmH₂O
     without another console edit.
- **FU-6 (respiratory integration) — ONE dead-space function (orchestrator ruling from the FU-6 review, 2026-09-28,
  binding on Tasks 15/18d).** FU-4 EXPORTS the physical series dead space from the gas module and every engine consumer
  uses it (gas exchange through `resp/pipeline.ts` `deadSpace()`, the capnogram's washout, the console's "VD" label);
  FU-6's capnogram physics calls it instead of computing its own (the review measured FU-6's 204 mL against FU-4's
  127 mL for the 70 kg ventilated rig). Signature and contract (landed in Task 18d, `l2/gas/params.ts`):
  ```ts
  /** Physical series dead space (mL) for this patient and airway: anatomical 2.2 mL/kg IBW, minus the extrathoracic
   *  share an artificial airway bypasses (ETT_BYPASS_ML_PER_KG × IBW, floored at 30 % of the anatomical value), plus
   *  the airway device's apparatus volume — never the MANUAL EtCO2 fit, never alveolar dead space. */
  export function physicalDeadSpace(pat: Pick<GasPatient, 'deadSpaceMl' | 'ibwKg' | 'weightKg'>, artificialAirway: boolean): number
  ```
  `resp/pipeline.ts`'s gas-exchange dead space is `physicalDeadSpace(rs.pat, mech) + fit` (the fit is the MANUAL
  calibration only; 0 in MODELED after Task 18d).
- **FU-5 (monitor fidelity; parallel; orchestrator update 2026-09-28):** FU-5 owns L3, the renderer, skins, audio and
  the L2 signal-quality lines (the pleth amplitude in `l2/hemo/pipeline.ts` — the `addPlethPulse(… op.sv / svRef …)`
  line — SpO2 validity and PI). FU-4 therefore does NOT touch `l3/spo2/**`: the audit's G14 (SpO2 98–99 % at MAP 13;
  "0 %" instead of `--` at SaO2 0) and the latched "APNEA (RESP)" alarm on philips-like while the ventilator breathes
  (G-FU3 ruling 5) are FU-5's. What FU-4 hands over: the arrest now happens (pulseless → no pleth feet), so the
  near-arrest window where the oximeter must drop out is short but real (Ali's case: MAP 21 at 840 s, SpO2 still 99).
  FU-4 and FU-5 both edit `l2/hemo/pipeline.ts` — different lines (FU-4: `emitSecond`'s coronary/arrest block, the
  state event, the tamponade condition fields); whichever lands second re-merges main.
- **Stage 8b (release):** the physiology overview must describe (a) the sympathetic-output model (`symp`, `setF`),
  (b) the arrest state machine (triggers, onset draw, ROSC, MANUAL no-flow), (c) `pnpm run audit:physiology` as the
  integration check to rerun before a release; the CI matrix split (Task 20) is what the release workflow inherits.
- **R44 calibration pass (Ali):** ~~CPR relaxation-phase CPP 42–52 mmHg at quality 1 against Paradis's 15–25 — a
  calibration item (Q13)~~ **— withdrawn: Orchestrator ruling (FU-4 review), 2026-09-28 (ruling 3) made this a
  MECHANISM task (Task 18a), not a calibration item. `CPR_CARDIAC_MMHG`/`CPR_THORACIC_MMHG` are 24, the compression acts
  on volume, the reflex withdraws with brainstem perfusion, and the measured CPP is 23.8 with RA relaxation 18.0.** What
  remains for Ali on CPR: whether adrenaline should push CPP to 30 (above the band — Paradis's own finding), and the
  asystole-under-CPR proportions (Q3). Still calibration items: the warm-sepsis CO row
  (Q-7e-7); ephedrine/adrenaline HR sizes (G15); the S-suite bands marked "proposal".
- **FU-3 (executing):** if FU-3's branch changes `TAU_HYP_S`, `hypoxicArrestRequest` or the `emitSecond` coronary block
  before it merges, FU-4 Task 4/6 re-anchor by comment and re-run D3's scan.

## Architecture in one page

**The sympathetic-output model (Task 2).** 7g → `fx.symp`, `fx.setF` → 7a `control()` → `stepBaro(…, {outF, setF})`:

```
            error e = set·setF − MAP_lp  (delay, LPF → e_s, e_v; resetting compares with set·setF)
 vagal:     RR += −G_v·e_v                                   (gain × gv, unchanged)
 sympathetic, each factor:  1 + outF · clamp_±0.6( gain × gv × e_s [+ cardiopulmonary e_cp] )
            HR arm (× gvHr), SVR, Emax, venous V0 recruitment, venous compliance
 outF = fx.symp = Π over classes max(0.05, 1 + E):  propofol E = −Ce²/(Ce² + 1.0²);  sevo/iso E = −0.5·MAC
```

A healthy patient's reflex is barely engaged (e_s ≈ 1): he loses the direct terms (T6.3) and little else — MAP −31 %.
Tamponade (e_s 10–23, near saturation) and hypovolaemia (e_s 14–66) lose the saturated output they live on — MAP
−51 % and −96 % (arrest). The state-dependence is the saturation ceiling moving, not a per-condition multiplier.

**The arrest state machine (Tasks 3–7).** Stepped at 1 Hz in `emitSecond`, MODELED and MANUAL:

```
 2 ms (model.ts)      cppAcc += Ao − RA outside compressions;  beat acc: rvsp, rvMean, pItEd;  mapNow (10 Hz, τ 2 s)
 1 Hz (pipeline.ts)   noBeat = pulseless ∨ VF/asystole ∨ no beat for 3 s
   coronary.ts        LV: supply = CFR·(CPP_abs − 15)/(CPP0 − 15)·(DTF/DTF0)      [noBeat: CPP = cppAcc mean, DTF = CPR relax]
                           demand = 0.15 + 0.2·HR·√E + 0.65·RPP·√E·EDV^⅓          [noBeat: 0.35]
                           kIsch → max(floor, 1 − 1.5·(1 − supply/demand))  τ↓ 20 s (noBeat 120 s), τ↑ 60 s
                           hyp (FU-3) → δ·(1 − SaO2/0.97), τ↑ 260 s
                      RV (MODELED): supply from MAP − RV mean; demand from RVSP → kIschRv
                      floor: MODELED 0, MANUAL 0.2 (R23)
   model.ts (10 Hz)   kLv ×= kIsch·kHyp·kChem;  kRv ×= kIschRv·kHyp·kChem;  sinus × (1 − 1.5·hyp − 1.2·(0.5 − kIsch)⁺ − 0.12·(K − 7)⁺)
   arrest.ts          BEATING ──[FU-3: hyp ≥ 0.9 (MODELED)]──────────────┐
                        │ ──[min(kIsch, kIschRv) ≤ 0.1]─────────────────┤
                        │ ──[MAP_now < 25 for 60 s  (MANUAL's route)]───┼──► draw: VF (0.1 × risk, ≤ 0.6) │ asystole 2/30 │ PEA
                        │ ──[hazard: K > 8.5, T < 28, T > 42 (Task 8)]──┘          (circ.arrest = {cause, t, from})
                      ARRESTED (PEA) ──[CPP ≥ 15 ∧ kIsch·(1 − hyp) ≥ 0.4, held 60 s]──► same organised rhythm, pulse back
                      ARRESTED (VF)  ── shock (Stage 4b table) ──► sinus ── if kIsch ≤ 0.1 ──► PEA again
                      ARRESTED (asystole): stays (Q3)
   engine.ts          requestRhythm(id, opts) — FU-3's E-FU3-8 callback, the only rhythm switch
```

Consumers that read the arrest state: the `circ` event (`cpp` = the coronary step's), 7d's brain/kidney and 7e's
baroreceptor input (`mapNow`), FU-3's E-FU3-9 arterial hold and E-FU3-10 brainstem gate (unchanged), the monitor
(pulseless → no pulse, ABP flat, SpO2 `--`).


## File map

| File | Owner | Tasks | Change |
|---|---|---|---|
| `scripts/audit-physiology/*` (new), `package.json`, `.gitignore` | tooling | 1 | the audit as `pnpm run audit:physiology` |
| `packages/engine-core/src/l2/pk/{row,combine}.ts` | 7g | 2, 12, 13 | PD targets `symp`, `setF`, `vagalMs`, `muscarinic`; `flowDist` row flag |
| `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts` | 7g | 2, 12, 14 | propofol/sevoflurane/isoflurane sympatholysis; opioid vagal rows; propofol `flowDist` |
| `packages/engine-core/src/l2/pk/data/rows-cardiovascular.ts`, `l2/pk/hooks.ts` | 7g | 12 | neostigmine/atropine/glycopyrrolate rows; repeat succinylcholine hook |
| `packages/engine-core/src/l2/pk/pipeline.ts` | 7g | 14 | `DrugInst.dist`, `distFactor`, `params()` |
| `packages/engine-core/src/l2/circ/drugs.ts` | 7a | 2, 12 | `DrugEffect.symp`, `.setF`, `.vagalMs?`, `.muscBlock?` |
| `packages/engine-core/src/l2/circ/baroreflex.ts` | 7a | 2 | `outF` after saturation; error and resetting against `set × setF` |
| `packages/engine-core/src/l2/circ/coronary.ts` | 7a | 4, 5 | flow share without a floor (MODELED), R23 in MANUAL, absolute CPP, basal/E–C demand, no-beat branch, `TAU_HYP_S` 260, RV balance, `NO_BEAT_RHYTHMS` |
| `packages/engine-core/src/l2/circ/arrest.ts` (new) | 7a | 6, 8 | the arrest state machine (declaration, onset draw, hazards, ROSC) |
| `packages/engine-core/src/l2/circ/model.ts` | 7a | 2–6, 9, 12, 13 | `mapNow`, `cppAcc`, `arrest`, `noFlowS`, `saF`; `pItEd`, `rvsp`, `rvMean` on beats; `ext.kEcg`, `ext.tempC`, `ext.vFluidRate`; pre-arrest bradycardia; RV ischaemia on `kRv`; the vagal terms |
| `packages/engine-core/src/l2/circ/{conditions,pleural}.ts`, new `aliases.ts` | 7a | 9, 10, 11 | tamponade volume/rate; the swing grows with the breath; one PE / one tension-PTX event |
| `packages/engine-core/src/l2/hemo/pipeline.ts` | 7a | 3, 4, 6, 9 | the state event's SBP in arrest; the no-beat coronary input; the `circ` event CPP; the arrest block; tamponade fields |
| `packages/engine-core/src/types-circ.ts` | 7a | 9 | tamponade fields on the condition event |
| `packages/engine-core/src/l2/blood/{circ-adapter,pipeline}.ts` | 7c (E-FU4-1) | 7 | K on contractility; `ext.kEcg`; absolute ECG K |
| `packages/engine-core/src/l2/organs/inputs.ts`, `l2/endo/adapters.ts` | 7d/7e (E-FU4-2) | 3 | MAP from `circ.mapNow` |
| `packages/engine-core/src/l2/endo/pipeline.ts`, `types-neuro.ts` | 7e/7f types (E-FU4-7) | 12 | `stimulus.site` |
| `packages/engine-core/src/truth.ts` | 7x (E-FU4-3) | 3 | two SKIP_PATH entries |
| `packages/engine-core/src/l2/resp/pipeline.ts`, `types-resp.ts` | Stage 3 (E-FU4-5) | 15, 18 | MODELED ventilation drops the MANUAL fit; `thermal.warmAirC` |
| `packages/engine-core/src/l2/thermal/{params,thresholds,environment,heat}.ts` | 7e (E-FU4-5) | 16, 18 | shivering cut-off; blanket air temperature |
| `packages/engine-core/src/l2/gas/params.ts` | Stage 3 (E-FU4-5) | 17 | arrest EtCO2 time constant |
| `packages/engine-core/src/l2/ecg/{rhythm-state,rhythm-engine}.ts` | Stage 5 (E-FU4-11) | 13 | `automaticityAt` × backup escape rate |
| `packages/engine-core/src/engine.ts` | engine (E-FU4-7) | 11, 12, 13, 16 | the alias pre-step; the stimulus observer; `automaticityAt`; `ext.tempC` |
| `packages/engine-core/data/lung-pathology.ts` | 7b data (E-FU4-4) | 11 | the PE row's PVR key removed |
| `packages/engine-core/vite.config.ts`, `.github/workflows/ci.yml` | CI | 6, 7, 10, 12, 18, 20 | SLOW entries; `SLOW_A`/`SLOW_B`; the matrix |
| `packages/validation/suites/sanity/sanity-docs.ts` | 8a (E-FU4-12) | 21 | t25 ventilated; `t25-apnoea` |
| `apps/demo/{fu4.html,src/fu4.ts,scripts/fu4-shots.mjs,e2e/fu4.e2e.ts,vite.config.ts}` | demo | 23 | evidence page, shots, smoke |
| `apps/demo/scripts/stage7e-shots.mjs`, `apps/demo/src/physiology-console/meta.ts` | demo / 7x | 19 | two comments; `lp.pPtx` unit |
| Tests (new): `test/l2/circ/{sympathetic-output,coronary-arrest,rv-coronary,arrest,tamponade-dynamics}.test.ts`, `test/l2/pk/flow-distribution.test.ts`, `test/l2/thermal/shiver-cutoff.test.ts`, `test/engine/{arrest-etco2,circ-arrest-state,circ-lowflow-arrest,blood-k-rhythm,circ-pulsus,obstructive-aliases,vagal-events,thermal-warmer,clinical-suite}.test.ts` | — | 2–22 | |
| Tests (edited): `circ-sanity-1`, `circ-hypoxic-arrest`, `endo-circ-acceptance`, `pk-bus`, `organs-tbi` | — | 2, 6, 8, 13, 15 | flips (R45), FU-3's 1 bpm tolerance, a rig RR |
| **Phase 2 (Tasks 18a–18g), added by the R50 review — sources** | | | |
| `packages/engine-core/src/l2/circ/{params,circuit,profile,stabilise}.ts` | 7a (E-FU4-15) | 18a | CPR constants 24/24, `V_CPR_REF_FRAC`, `CPR_RELEASE_RESIDUAL`; `vCprRef`; the volume factor, the release residual and the Starling-resistor atria; the `cprRelease` seam |
| `packages/engine-core/src/l2/circ/baroreflex.ts` (again) | 7a | 18a | `brainstemOutF`, `CBF_REFLEX_FULL/ZERO`, `BaroGains.brainF` |
| `packages/engine-core/src/l2/circ/coronary.ts` (again) | 7a | 18a | `DEMAND_VF` 0.75, `VF_RHYTHMS`, `NoBeat.vf` |
| `packages/engine-core/src/l2/organs/effects.ts` | 7d (E-FU4-2) | 18a | one line: publish `ext.cbfRel` |
| `packages/engine-core/src/l2/circ/arrest.ts` (again) | 7a | 18b | `peaDecayStep` + its constants; `roscStep` accepts the idioventricular phase back |
| `packages/engine-core/src/l2/lung/params.ts` | 7b (E-FU4-16) | 18c | `PTX_VALVE_PER_CMH2O_S`, `PTX_DRAIN_TAU_S` |
| `packages/engine-core/src/l2/resp/pipeline.ts` (again) | Stage 3 / 7b (E-FU4-5, E-FU4-16) | 18c, 18d | `ptxAcc`/`ptxCeil` + `ptxStep()`; the MANUAL-only calibration, the patient's `paco2Rest`, the ETT bypass credit |
| `packages/engine-core/src/l2/gas/params.ts` (again) | Stage 3 (E-FU4-5) | 18d | `PACO2_REST_MMHG`, `ETT_BYPASS_ML_PER_KG`, `GasPatient.paco2Rest` |
| `packages/engine-core/src/l2/endo/{params,hormones,effects,core,adapters}.ts` | 7e (E-FU4-2 widened) | 18e | the humoral arm `h.hum`, `humSvrF`/`humDV0Frac` outside `alpha()`, `mapSetMmHg` in, `ext.endoHumDV0Frac` out |
| `packages/engine-core/src/l2/circ/model.ts` (again) | 7a | 18a, 18b, 18e, 18f | `ext.cbfRel`/`endoHumDV0Frac`; `brainF`; `cprRelease`; `arrest.rate0/rateNow`; the ONE shared reservoir; the dropped `de.vagalMs` and the SA-node term |
| `packages/engine-core/src/l2/hemo/pipeline.ts` (again) | 7a (E-FU4-15) | 18a, 18b | `cprRelease`, `vf` into the coronary step, `rate0`, the decay call |
| `packages/engine-core/src/l2/pk/{hooks,pipeline}.ts`, `l2/pk/data/{rows-anaesthetic,rows-cardiovascular}.ts` (again) | 7g | 18f | the seeded repeat-sux draw; every bolus time recorded; the opioid/neostigmine/anticholinergic rows |
| `packages/engine-core/src/engine.ts` (again) | engine (E-FU4-7) | 18f | the `outcome` stream and `hold` on the hook's request |
| `packages/engine-core/src/l2/ecg/rhythm-engine.ts` (again) | Stage 5 (E-FU4-18) | 18g | a non-finite scheduled time: loud in tests, clamped in the demo |
| Tests (new, Phase 2): `test/engine/{tension-ptx,vent-infant}.test.ts`, `test/l2/ecg/nan-guard.test.ts` | — | 18c, 18d, 18g | |
| Tests (edited, Phase 2): `test/l2/circ/{arrest,circuit}.test.ts`, `test/l2/endo/hormones.test.ts`, `test/engine/{neuro-spont,clinical-suite,circ-lowflow-arrest}.test.ts` | — | 18a–18e (E-FU4-17) | the new literals and seams; S8/S13 flip; S3 joins `it.fails` |
| Gate: `docs/gates/fu-4.md`, `docs/gates/fu-4/**` | — | 1, 23, 24 | audit before/after, shots, note |


### Task 0: Base check — FU-3 on main, the worktree, the before-numbers

**Files:** none (a check).

- [x] **Step 1: FU-3 has merged.** `git -C <repo> fetch origin && git -C <repo> log --oneline -1 origin/main` must show
  FU-3's merge ("Merge pull request … fu-3-followups"). If it has not merged, STOP and report (this plan's anchors are
  FU-3's lines).
- [x] **Step 2: Worktree and branch.**

```bash
git -C <repo> worktree add -b fu-4-integration-polish <repo>/../scratch/wt-fu-4 origin/main
cd <repo>/../scratch/wt-fu-4 && npx -y pnpm@9.15.9 install --frozen-lockfile
mkdir -p <scratchpad>/fu-4-integration-polish
```

- [x] **Step 3: FU-3 anchors present** (each must print at least one line):

```bash
grep -n "export const TAU_HYP_S = 150;" packages/engine-core/src/l2/circ/coronary.ts
grep -n "export function hypoxicArrestRequest" packages/engine-core/src/l2/circ/hypoxic-arrest.ts
grep -n "if (pulseless) c.cor.hyp = Math.max(hyp0, c.cor.hyp);" packages/engine-core/src/l2/hemo/pipeline.ts
grep -n "requestRhythm: (id, opts) => {" packages/engine-core/src/engine.ts
grep -n "kIschRef: 1 }" packages/engine-core/src/l2/circ/model.ts
```

- [x] **Step 4: Baseline suites** (record the counts and the `it.fails` list — `grep -rn "it.fails" packages apps` — in
  `<scratchpad>/fu-4-integration-polish/base.txt`; the plan writer's base had 41 slow files / 183 tests):

```bash
cd packages/engine-core
CI=1 PME_TEST_SET=fast npx vitest run > <scratchpad>/fu-4-integration-polish/base-fast.log 2>&1
CI=1 PME_TEST_SET=slow npx vitest run > <scratchpad>/fu-4-integration-polish/base-slow.log 2>&1
```

(Each is > 10 min on a loaded machine: start them in the background and wait with `until` loops of ≤ 10 min that
re-check the process.)


### Task 1: The audit runner in the repo — `pnpm run audit:physiology` (item 10; PROTOTYPED)

**Files:**
- Create: `scripts/audit-physiology/{hooks.mjs,runner.ts,scenarios.ts,report.ts,cli.ts,whatif.ts,probe-va.ts,probe-k.ts}`
  (ported from `research/08-audit-scripts/`: engine path `../../packages/engine-core/src/index.ts`, output folder
  `$PME_AUDIT_OUT` default `<repo>/.audit-physiology`, the runner's CPP column reads the coronary step's `cor.cpp` once
  Task 4 lands (falls back to the last beat before), new columns `kIschRv` and `cause`, and `report.ts` joining the
  audit's `summarize.ts`/`matrix.ts` plus an arrest table)
- Modify: root `package.json` (one script), `.gitignore` (the output folder)

**Why (brief item 10):** "so future stages rerun it". Every task below re-measures with it; the gate stores its output.
**Prototype:** the ported runner ran all 79 scenarios on the prototype tree in ≈ 7 min wall (M-series, Node 26), wrote
`results/*.json`, and printed the matrix and the arrest table quoted in "Prototype results".

- [x] **Step 1: Create the files** (exact contents below).

#### Create `scripts/audit-physiology/hooks.mjs`

```js
import { registerHooks } from 'node:module';
registerHooks({
  load(url, ctx, next) {
    if (url.endsWith('.json')) return next(url, { ...ctx, importAttributes: { ...ctx.importAttributes, type: 'json' } });
    return next(url, ctx);
  },
});
```

#### Create `scripts/audit-physiology/runner.ts`

```ts
// Physiology integration audit (research/08-physiology-integration-audit.md, FU-4 Task 1): ONE scenario runner.
// Creates an engine (seed fixed), dispatches a scripted timeline, samples the physiology every 5 s (truth read from the
// engine's committed pipeline state, read-only), prints a compact table plus extremes, and writes
// <out>/results/<name>.json. Output folder: PME_AUDIT_OUT, default <repo>/.audit-physiology (git-ignored).
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
export const OUT = process.env.PME_AUDIT_OUT ?? join(HERE, '../../.audit-physiology');
const ENGINE = process.env.PME_ENGINE ?? join(HERE, '../../packages/engine-core/src/index.ts');
const { createEngine } = (await import(ENGINE)) as typeof import('../../packages/engine-core/src/index.ts');

export type Body = Record<string, unknown> & { type: string };
export type Step = [number, Body | ((e: any) => void), string?]; // t (s), command body or a state poke (audit seam), label
export interface Scenario {
  name: string; title: string; mode: 'modeled' | 'manual'; patient?: Record<string, unknown>;
  steps: Step[]; tEnd: number; printEvery?: number; truthHz?: number;
}

const ev = (event: Record<string, unknown>): Body => ({ type: 'applyEvent', event });
export const A = {
  drug: (drugId: string, dose: number, unit: string) => ev({ kind: 'drug', drugId, dose, unit, route: 'iv' }),
  infusion: (drugId: string, rate: number, unit: string) => ev({ kind: 'infusion', drugId, rate, unit }),
  vap: (agent: string, dialPct: number, fgfLpm = 2) => ev({ kind: 'vaporiser', agent, dialPct, fgfLpm, n2oFrac: 0 }),
  bleed: (volumeMl: number, overS: number) => ev({ kind: 'bleed', volumeMl, overS }),
  fluid: (fluid: string, volumeMl: number, overS: number) => ev({ kind: 'fluid', fluid, volumeMl, overS }),
  cond: (id: string, severity: number, extra: Record<string, unknown> = {}) => ev({ kind: 'condition', id, severity, ...extra }),
  lung: (id: string, severity: number, side?: 'L' | 'R') => ev(side ? { kind: 'lungCondition', id, severity, side } : { kind: 'lungCondition', id, severity }),
  vent: (peep = 5, fio2 = 0.5, rr = 12, vtMl = 600) => ev({ kind: 'ventilation', source: 'ventilator', rr, vtMl, peep, fio2 }),
  ventOff: () => ev({ kind: 'ventilation', source: 'none' }),
  ett: () => ev({ kind: 'airwayDevice', device: 'ett' }),
  transfusion: (product: string, units: number, overS: number, storageDays = 35) => ev({ kind: 'transfusion', product, units, overS, storageDays, warmed: true }),
  cpr: (active: boolean, quality = 1) => ev({ kind: 'cpr', active, rate: 110, quality }),
  mode: (mode: 'manual' | 'modeled'): Body => ({ type: 'setMode', mode }),
};
/** Standard ventilated start: ETT + ventilator VCV 12 × 600 mL (PaCO2 ≈ 42 on main; 12 × 500 drifts to PaCO2 60 — audit finding), PEEP 5, FiO2 0.5 at t = 1 s. */
export const VENTED: Step[] = [[1, A.ett()], [1, A.vent(5, 0.5)]];

const SENSORS = { abp: 'connected', cvp: 'connected', pap: 'connected', spo2: 'on' };
const PULSELESS = new Set(['vfCoarse', 'vfFine', 'vf', 'asystole', 'pea', 'pwaveAsystole', 'pWaveAsystole', 'torsades']);
const r1 = (x: number) => Math.round(x * 10) / 10;

export interface Row {
  t: number; rhythm: string; pulseless: boolean; noEject: boolean; hr: number; sbp: number; dbp: number; map: number; cvp: number;
  pawp: number; co: number; sv: number; svr: number; pmsf: number; lvedv: number; lvedp: number; cpp: number; sd: number; kIsch: number; kIschRv: number; cause: string;
  ppeRi: number; dSbp: number; spo2: number; sao2: number; pao2: number; etco2: number; paco2: number; ph: number; lact: number; k: number; iCa: number;
  hb: number; temp: number; cbf: number; icp: number; uop: number; epi: number; ne: number; baroEs: number; baroSet: number; kLv: number;
  propCe: number; mac: number; drugSvr: number; drugEes: number; drugV0: number; drugGv: number; manEes: number; manR: number; rr: number; ve: number;
}

function sample(e: any, t: number, last: { hr: number }): Row {
  const st = e.st;
  const hs = st.hemo;
  const c = hs.circ;
  const bs = c.beats.filter((b: any) => b.t > t - 6);
  const avg = (k: string) => (bs.length ? bs.reduce((a: number, b: any) => a + b[k], 0) / bs.length : NaN);
  const noEject = t - c.lastEjT > 3;
  const mapNow = bs.length ? avg('map') : (c.s[0] as number);
  const ce = hs.out.length ? null : null;
  void ce;
  const lb = c.beats[c.beats.length - 1];
  const fx = st.pk.fx ?? {};
  const spo2 = st.resp.num.spo2.shown;
  return {
    t, rhythm: st.rhythm.id, pulseless: PULSELESS.has(st.rhythm.id) || st.rhythm.opts?.pulseless === true, noEject,
    hr: last.hr, sbp: bs.length ? avg('sbp') : NaN, dbp: bs.length ? avg('dbp') : NaN, map: mapNow, cvp: hs.num.cvpAvg ?? hs.circOut.pRa, pawp: hs.circOut.pPv,
    co: noEject ? 0 : c.qFwd * 0.06, sv: bs.length ? avg('sv') : 0, svr: c.p.rSys, pmsf: ((c.s[4] as number) - c.p.v0Sv) / c.p.cSv,
    lvedv: lb?.lvedv ?? NaN, lvedp: lb?.lvedp ?? NaN, cpp: c.cor.cpp ?? (lb ? lb.aoDia - lb.lvedp : NaN), sd: c.cor.ratio, kIsch: c.cor.kIsch, kIschRv: c.cor.kIschRv ?? 1, cause: c.arrest?.cause ?? '', ppeRi: hs.circOut.pPeri, dSbp: bs.length > 2 ? Math.max(...bs.map((b: any) => b.sbp)) - Math.min(...bs.map((b: any) => b.sbp)) : NaN,
    spo2, sao2: st.resp.o2.sa * 100, pao2: st.resp.o2.pao2, etco2: st.resp.etco2, paco2: st.resp.co2.pf, ph: st.blood.core.ab.ph,
    lact: st.blood.out.lactate, k: st.blood.out.k, iCa: st.blood.out.iCa, hb: st.blood.out.hb, temp: st.resp.temp.tc,
    cbf: st.organs.brain.cbfRel, icp: st.organs.brain.icp, uop: st.organs.renal.uopMlMin * 60, epi: st.endo.core.out.epiPgMl, ne: st.endo.core.out.nePgMl,
    baroEs: c.baro.es, baroSet: c.baro.set, kLv: c.kLv, propCe: st.pk.bus.cns.propCe ?? 0, mac: st.pk.bus.cns.macBrain ?? 0,
    drugSvr: fx.svr ?? 1, drugEes: fx.ees ?? 1, drugV0: fx.v0Frac ?? 0, drugGv: fx.gv ?? 1, manEes: c.man.eesF, manR: c.man.rSys ?? c.base.rSys,
    rr: st.resp.driver.source, ve: st.resp.vaLpm,
  } as unknown as Row;
}

export async function run(sc: Scenario, quiet = false): Promise<{ rows: Row[]; log: string[] }> {
  const patient = { ageY: 40, sex: 'M', weightKg: 70, ...(sc.patient ?? {}), sensors: SENSORS };
  const e: any = createEngine({ seed: 7, mode: sc.mode, patient: patient as never });
  const last = { hr: NaN };
  e.on((x: any) => { if (x.type === 'measurement' && x.values.hr?.value != null) last.hr = x.values.hr.value; }, ['measurement']);
  const log: string[] = [];
  let n = 0;
  const pending = [...sc.steps].sort((a, b) => a[0] - b[0]);
  const rows: Row[] = [];
  const DT = 5;
  for (let t = DT; t <= sc.tEnd + 1e-9; t += DT) {
    while (pending.length && (pending[0] as Step)[0] < t) {
      const [ts, body, label] = pending.shift() as Step;
      e.advanceTo(Math.max(e.now().simT, ts));
      if (typeof body === 'function') { body(e); log.push(`${ts}s poke ${label ?? ''}`); continue; }
      const r = e.dispatch({ id: `a${++n}`, issuedBy: 'audit', ...body });
      const d = JSON.stringify((body as any).event ?? body);
      log.push(`${ts}s ${label ?? ''} ${d} ${r.accepted ? 'OK' : 'REJECTED: ' + r.reason}`);
      if (!r.accepted && !quiet) console.log(`!! ${sc.name}: rejected ${d}: ${r.reason}`);
    }
    e.advanceTo(t);
    rows.push(sample(e, t, last));
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  return { rows, log };
}

const COLS: [keyof Row, string, number][] = [
  ['t', 't(s)', 0], ['rhythm', 'rhythm', 0], ['hr', 'HR', 0], ['sbp', 'SBP', 0], ['dbp', 'DBP', 0], ['map', 'MAP', 0], ['cvp', 'CVP', 1], ['pawp', 'PAWP', 1],
  ['co', 'CO', 2], ['sv', 'SV', 0], ['svr', 'Rsys', 3], ['pmsf', 'Pmsf', 1], ['lvedv', 'EDV', 0], ['cpp', 'CPP', 0], ['kIsch', 'kIsc', 2], ['dSbp', 'dSBP', 0],
  ['spo2', 'SpO2', 0], ['etco2', 'EtCO2', 0], ['paco2', 'PaCO2', 0], ['ph', 'pH', 2], ['lact', 'Lac', 1], ['k', 'K', 1], ['temp', 'T', 1], ['cbf', 'CBF', 2], ['uop', 'UOP', 0],
  ['ne', 'NE', 0], ['baroEs', 'es', 0], ['kLv', 'kLv', 2], ['propCe', 'Cprop', 1], ['mac', 'MAC', 2],
];
export function table(sc: Scenario, rows: Row[], every = sc.printEvery ?? 60): string {
  const fmt = (v: unknown, d: number) => (typeof v === 'number' ? (Number.isFinite(v) ? v.toFixed(d) : '–') : String(v).slice(0, 8));
  const lines = [COLS.map(([, h]) => h).join('\t')];
  const marks = new Set(sc.steps.map((s) => s[0]));
  for (const r of rows) {
    const nearMark = [...marks].some((m) => r.t > m && r.t <= m + 5) || [...marks].some((m) => r.t <= m && r.t > m - 5);
    if (r.t % every === 0 || nearMark) lines.push(COLS.map(([k, , d]) => fmt(r[k], d)).join('\t') + (r.noEject ? '\tNO-EJECT' : '') + (r.pulseless ? '\tPULSELESS' : ''));
  }
  return lines.join('\n');
}
export function extremes(rows: Row[], t0 = 0, t1 = Infinity) {
  const w = rows.filter((r) => r.t > t0 && r.t <= t1);
  const mn = (k: keyof Row) => Math.min(...w.map((r) => r[k] as number).filter(Number.isFinite));
  const mx = (k: keyof Row) => Math.max(...w.map((r) => r[k] as number).filter(Number.isFinite));
  return {
    mapMin: r1(mn('map')), sbpMin: r1(mn('sbp')), hrMax: r1(mx('hr')), hrMin: r1(mn('hr')), coMin: r1(mn('co') * 100) / 100, cppMin: r1(mn('cpp')),
    kIschMin: Math.round(mn('kIsch') * 100) / 100, spo2Min: r1(mn('spo2')), lactMax: r1(mx('lact')), phMin: Math.round(mn('ph') * 100) / 100,
    anyNoEject: w.some((r) => r.noEject), anyPulseless: w.some((r) => r.pulseless), rhythms: [...new Set(w.map((r) => r.rhythm))].join(','),
  };
}
/** Mean of a field over (t0, t1]. */
export function at(rows: Row[], k: keyof Row, t0: number, t1: number): number {
  const w = rows.filter((r) => r.t > t0 && r.t <= t1).map((r) => r[k] as number).filter(Number.isFinite);
  return w.length ? r1(w.reduce((a, b) => a + b, 0) / w.length) : NaN;
}
export function save(sc: Scenario, rows: Row[], log: string[]): void {
  mkdirSync(join(OUT, 'results'), { recursive: true });
  writeFileSync(join(OUT, 'results', `${sc.name}.json`), JSON.stringify({ scenario: { ...sc, steps: sc.steps.map((s) => [s[0], typeof s[1] === 'function' ? `poke:${s[2]}` : s[1], s[2]]) }, log, rows }, null, 0));
}
```

#### Create `scripts/audit-physiology/scenarios.ts`

```ts
// FU-4 integration audit scenarios (research/08-physiology-integration-audit.md). Every scenario starts intubated and
// ventilated (ETT, VCV 12 × 600 mL, PEEP 5, FiO2 0.5) at t = 1 s unless it says otherwise, so propofol's 7f airway
// obstruction and hypoxic confounders stay out of the haemodynamic cells; interventions start at t = 300 s (baseline)
// unless stated. Adult 40 y 70 kg M, seed 7.
import { A, VENTED, type Scenario, type Step } from './runner.ts';

const T0 = 300;
const S = (name: string, title: string, steps: Step[], tEnd: number, extra: Partial<Scenario> = {}): Scenario =>
  ({ name, title, mode: 'modeled', steps: [...VENTED, ...steps], tEnd, printEvery: 60, ...extra });
const tamp = (t: number, s = 1): Step => [t, A.cond('tamponade', s), `tamponade ${s}`];
const prop = (t: number, mgkg: number): Step => [t, A.drug('propofol', mgkg, 'mg/kg'), `propofol ${mgkg} mg/kg`];
const peep = (t: number, p: number): Step => [t, A.vent(p, 0.5), `PEEP ${p}`];
const sevo = (t: number, pct = 2): Step => [t, A.vap('sevoflurane', pct, 2), `sevoflurane ${pct} %`];
const bleed = (t: number, ml: number, overS: number): Step => [t, A.bleed(ml, overS), `bleed ${ml} mL / ${overS} s`];
/** Core temperature ramp through 7e's test seam `pinCoreTemp` (no command cools a patient to 28 °C in minutes). */
const coolRamp = (t0: number, from: number, to: number, minutes: number): Step[] =>
  Array.from({ length: minutes + 1 }, (_, i) => [t0 + 60 * i, (e: any) => { e.st.resp.temp.pinCoreTemp = from + ((to - from) * i) / minutes; }, `core → ${(from + ((to - from) * i) / minutes).toFixed(1)} °C`] as Step);

export const SCENARIOS: Scenario[] = [
  // ---- A: healthy adult, single interventions --------------------------------------------------------------------
  S('A0-control', 'Healthy, ventilated, no intervention (control for every A/K delta)', [], 1500),
  S('A0b-vt500', 'Healthy on VCV 12 × 500 mL (the demo-style setting): PaCO2 drift, 60 min', [[2, A.vent(5, 0.5, 12, 500), 'VCV 12 × 500']], 3600, { printEvery: 300 }),
  S('A0c-spont', 'Healthy, spontaneous breathing, no airway device (control)', [], 900, { steps: [] }),
  S('A1-propofol2', 'Healthy: propofol 2 mg/kg', [prop(T0, 2)], 1200),
  S('A1b-propofol1', 'Healthy: propofol 1 mg/kg', [prop(T0, 1)], 1200),
  S('A2-sevo2', 'Healthy: sevoflurane 2 % dial, FGF 2 L/min, 20 min', [sevo(T0)], T0 + 1200),
  S('A3-peep15', 'Healthy: PEEP 5 → 15', [peep(T0, 15)], 1200),
  S('A4-bleed500', 'Healthy: bleed 500 mL over 5 min', [bleed(T0, 500, 300)], 1500),
  S('A5-bleed1500', 'Healthy: bleed 1500 mL over 10 min', [bleed(T0, 1500, 600)], 1800),
  S('A6-phenylephrine', 'Healthy: phenylephrine 100 µg', [[T0, A.drug('phenylephrine', 100, 'mcg'), 'phenylephrine 100 µg']], 1200),
  S('A7-ephedrine', 'Healthy: ephedrine 10 mg', [[T0, A.drug('ephedrine', 10, 'mg'), 'ephedrine 10 mg']], 1200),
  S('A8-adrenaline', 'Healthy: adrenaline 100 µg', [[T0, A.drug('epinephrine', 100, 'mcg'), 'epinephrine 100 µg']], 1200),
  S('A9-atropine', 'Healthy: atropine 0.5 mg', [[T0, A.drug('atropine', 0.5, 'mg'), 'atropine 0.5 mg']], 1200),

  // ---- B: severe tamponade ----------------------------------------------------------------------------------------
  S('B0-tamp', 'Tamponade severity 1 alone (control)', [tamp(60)], 2700),
  S('B0s-tamp-spont', 'Tamponade 1, spontaneous breathing, no ventilator (pulsus paradoxus check)', [tamp(60)], 900, { steps: [tamp(60)] }),
  S('B1-tamp-prop1', 'Tamponade 1, +10 min propofol 1 mg/kg', [tamp(60), prop(660, 1)], 1500),
  S('B2-tamp-prop2', 'Tamponade 1, +10 min propofol 2 mg/kg', [tamp(60), prop(660, 2)], 1500),
  S('B3-tamp-peep10', 'Tamponade 1, +10 min PEEP 10', [tamp(60), peep(660, 10)], 1500),
  S('B3b-tamp-peep15', 'Tamponade 1, +10 min PEEP 15', [tamp(60), peep(660, 15)], 1500),
  S('B4-tamp-sevo', 'Tamponade 1, +10 min sevoflurane 2 %', [tamp(60), sevo(660)], 1860),
  S('B5-tamp-bleed1000', 'Tamponade 1, +10 min bleed 1 L over 5 min', [tamp(60), bleed(660, 1000, 300)], 1800),
  S('B6-chain', 'Tamponade 1 → propofol 1 → propofol 1 more (2 total) → PEEP 10 → sevo 2 % → bleed 1 L', [
    tamp(60), prop(660, 1), prop(960, 1), peep(1260, 10), sevo(1560), bleed(2160, 1000, 300)], 3060),
  S('B7-ali', "Ali's playground case: tamponade 1, propofol 2 + 1 mg/kg, PEEP 15, sevo 2 %, bleed 2 L", [
    tamp(60), prop(660, 2), prop(900, 1), peep(1200, 15), sevo(1500), bleed(2100, 2000, 300)], 3000),
  S('B8-tamp08-prop2', 'Tamponade 0.8 (H7 volume, 200 mL), +10 min propofol 2 mg/kg', [tamp(60, 0.8), prop(660, 2)], 1500),

  // ---- C: hypovolaemia --------------------------------------------------------------------------------------------
  S('C0-bleed1500-ctl', 'Bleed 1.5 L over 10 min, no drug (control)', [bleed(60, 1500, 600)], 1800),
  S('C1-bleed-prop2', 'Bleed 1.5 L over 10 min, +5 min propofol 2 mg/kg', [bleed(60, 1500, 600), prop(960, 2)], 1800),
  S('C2-bleed-sevo', 'Bleed 1.5 L over 10 min, +5 min sevoflurane 2 %', [bleed(60, 1500, 600), sevo(960)], 2160),
  S('C3-bleed-neuraxial', 'Bleed 1.5 L, +5 min thermal anaesthesia=neuraxial (the only "neuraxial" switch in the engine)', [bleed(60, 1500, 600), [960, { type: 'applyEvent', event: { kind: 'thermal', anaesthesia: 'neuraxial' } }, 'thermal neuraxial']], 1800),
  S('C4-bleed2500', 'Bleed 2.5 L over 10 min (class IV, 50 %), no drug', [bleed(60, 2500, 600)], 2400),

  // ---- D: massive PE ----------------------------------------------------------------------------------------------
  S('D0-pe', 'PE severity 1 (φ 0.8) alone', [[60, A.cond('pe', 1), 'PE 1']], 1800),
  S('D1-pe-prop-peep', 'PE 1, +10 min propofol 2 mg/kg, +5 min PEEP 15', [[60, A.cond('pe', 1), 'PE 1'], prop(660, 2), peep(960, 15)], 1800),
  S('D2-pe-peep15', 'PE 1, +10 min PEEP 15', [[60, A.cond('pe', 1), 'PE 1'], peep(660, 15)], 1500),
  S('D3-pe-both', 'PE via BOTH the circulation condition and 7b lungCondition pe (sev 1)', [[60, A.cond('pe', 1), 'PE 1'], [60, A.lung('pe', 1), 'lung PE 1']], 1200),

  // ---- E: tension pneumothorax ------------------------------------------------------------------------------------
  S('E1-ptx-lung', 'Tension PTX (7b lungCondition ptxTension 1, R) 10 min, then PEEP 15', [[60, A.lung('ptxTension', 1, 'R'), 'ptxTension R 1'], peep(660, 15)], 1500),
  S('E2-ptx-circ', 'Tension PTX (7a condition tensionPtx 1) 10 min, then PEEP 15', [[60, A.cond('tensionPtx', 1), 'tensionPtx 1'], peep(660, 15)], 1500),

  // ---- F: sepsis, anaphylaxis, MH ---------------------------------------------------------------------------------
  S('F0-sepsis', 'Septic shock warm (severity 1, ramp 600 s), control', [[60, A.cond('sepsis', 1, { phase: 'warm' }), 'sepsis 1 warm']], 2400),
  S('F1-sepsis-prop2', 'Septic shock warm, +20 min propofol 2 mg/kg', [[60, A.cond('sepsis', 1, { phase: 'warm' }), 'sepsis 1 warm'], prop(1260, 2)], 2400),
  S('F2-anaph', 'Anaphylaxis severity 1 untreated', [[60, A.cond('anaphylaxis', 1), 'anaphylaxis 1']], 1500),
  S('F3-anaph-peep', 'Anaphylaxis 1, +3 min PEEP 15', [[60, A.cond('anaphylaxis', 1), 'anaphylaxis 1'], peep(240, 15)], 1500),
  S('F4-mh', 'MH (condition mh 1) under sevoflurane 2 %, untreated 45 min', [sevo(60), [120, A.cond('mh', 1), 'MH 1']], 120 + 2700 + 300, { printEvery: 300 }),

  // ---- G: electrolytes, temperature -------------------------------------------------------------------------------
  S('G1-k75', 'Hyperkalaemia K 7.5 (profile)', [], 900, { patient: { blood: { k: 7.5 } } }),
  S('G2-k85', 'Hyperkalaemia K 8.5 (profile)', [], 900, { patient: { blood: { k: 8.5 } } }),
  S('G2b-k95', 'Hyperkalaemia K 9.5 (profile)', [], 900, { patient: { blood: { k: 9.5 } } }),
  S('G3-mtp', 'Bleed 2.5 L then 10 u RBC (35 d) over 10 min, no calcium', [bleed(60, 2500, 600), [720, A.transfusion('rbc', 10, 600, 35), 'RBC 10 u']], 2400),
  S('G3b-sux-burns', 'Burns 1 (profile), succinylcholine 1.5 mg/kg', [[T0, A.drug('succinylcholine', 1.5, 'mg/kg'), 'sux 1.5 mg/kg']], 1500, { patient: { blood: { burns: 1 } } }),
  S('G4-cool28', 'Core cooled 36.8 → 28 °C over 30 min (test seam), held 15 min', coolRamp(T0, 36.8, 28, 30), T0 + 2700, { printEvery: 300 }),

  S('G4b-cool28-gaNmb', 'As G4 under propofol 100 µg/kg/min + rocuronium 0.6 mg/kg (no shivering)', [[T0 - 60, A.infusion('propofol', 100, 'mcg/kg/min'), 'propofol 100 µg/kg/min'], [T0 - 60, A.drug('rocuronium', 0.6, 'mg/kg'), 'roc 0.6 mg/kg'], ...coolRamp(T0, 36.8, 28, 30)], T0 + 2700, { printEvery: 300 }),
  // ---- H: vagal -----------------------------------------------------------------------------------------------------
  S('H1-fent10', 'Fentanyl 10 µg/kg bolus, no atropine', [[T0, A.drug('fentanyl', 10, 'mcg/kg'), 'fentanyl 10 µg/kg']], 1200),
  S('H1b-remi3', 'Remifentanil 3 µg/kg bolus, no atropine', [[T0, A.drug('remifentanil', 3, 'mcg/kg'), 'remifentanil 3 µg/kg']], 1200),
  S('H2-sux-repeat', 'Succinylcholine 1.5 mg/kg, repeat 1 mg/kg at +5 min', [[T0, A.drug('succinylcholine', 1.5, 'mg/kg'), 'sux 1.5 mg/kg'], [T0 + 300, A.drug('succinylcholine', 1, 'mg/kg'), 'sux 1 mg/kg']], 1200),
  S('H3-neo', 'Neostigmine 0.05 mg/kg, no glycopyrrolate', [[T0, A.drug('neostigmine', 0.05, 'mg/kg'), 'neostigmine 0.05 mg/kg']], 1500),

  // ---- I: apnoea ----------------------------------------------------------------------------------------------------
  S('I1-apnoea', 'Propofol 2 + rocuronium 0.6 mg/kg, ventilator OFF (spontaneous start, no airway support), 15 min', [
    [T0, A.ventOff(), 'ventilation none'], prop(T0, 2), [T0, A.drug('rocuronium', 0.6, 'mg/kg'), 'rocuronium 0.6 mg/kg']], T0 + 1200),

  // ---- J: overdose --------------------------------------------------------------------------------------------------
  S('J1-od-healthy', 'Propofol 4 mg/kg + remifentanil 2 µg/kg, healthy 40 y', [prop(T0, 4), [T0, A.drug('remifentanil', 2, 'mcg/kg'), 'remi 2 µg/kg']], 1500),
  S('J2-od-80htn', 'Propofol 4 mg/kg + remifentanil 2 µg/kg, 80 y hypertensive', [prop(T0, 4), [T0, A.drug('remifentanil', 2, 'mcg/kg'), 'remi 2 µg/kg']], 1500, { patient: { ageY: 80, weightKg: 70, conditions: [{ id: 'htn' }] } }),
  S('J3-80htn-prop2', 'Propofol 2 mg/kg, 80 y hypertensive', [prop(T0, 2)], 1500, { patient: { ageY: 80, weightKg: 70, conditions: [{ id: 'htn' }] } }),
  S('J4-80htn-ctl', '80 y hypertensive control', [], 1500, { patient: { ageY: 80, weightKg: 70, conditions: [{ id: 'htn' }] } }),

  // ---- K: controls needed for the propofol state-dependence matrix ---------------------------------------------------
  S('K-pe-prop2', 'PE 1, +10 min propofol 2 mg/kg (no PEEP)', [[60, A.cond('pe', 1), 'PE 1'], prop(660, 2)], 1500),
  S('K-ptx-prop2', 'Tension PTX lung 1 R, +10 min propofol 2 mg/kg', [[60, A.lung('ptxTension', 1, 'R'), 'ptxTension R 1'], prop(660, 2)], 1500),
  S('K-ptx-ctl', 'Tension PTX lung 1 R control', [[60, A.lung('ptxTension', 1, 'R'), 'ptxTension R 1']], 1500),
  S('K-80htn-bleed-prop', '80 y HTN, bleed 1 L, +5 min propofol 2', [bleed(60, 1000, 600), prop(960, 2)], 1800, { patient: { ageY: 80, weightKg: 70, conditions: [{ id: 'htn' }] } }),
  S('K-hfref-prop2', 'HFrEF 60 y 80 kg, propofol 2 mg/kg', [prop(T0, 2)], 1500, { patient: { ageY: 60, weightKg: 80, conditions: [{ id: 'hfref' }] } }),
  S('K-hfref-ctl', 'HFrEF control', [], 1500, { patient: { ageY: 60, weightKg: 80, conditions: [{ id: 'hfref' }] } }),
  S('K-ascad-prop2', 'AS + CAD + HTN 75 y, propofol 2 mg/kg', [prop(T0, 2)], 1500, { patient: { ageY: 75, weightKg: 75, conditions: [{ id: 'htn' }, { id: 'as', grade: 'severe' }, { id: 'cad', grade: 'severe' }] } }),
  S('K-ascad-ctl', 'AS + CAD + HTN control', [], 1500, { patient: { ageY: 75, weightKg: 75, conditions: [{ id: 'htn' }, { id: 'as', grade: 'severe' }, { id: 'cad', grade: 'severe' }] } }),

  // ---- L: MANUAL mode -----------------------------------------------------------------------------------------------
  S('L-B0-tamp', 'MANUAL: tamponade 1 alone', [tamp(60)], 1500, { mode: 'manual' }),
  S('L-B6-chain', 'MANUAL: the B6 chain', [tamp(60), prop(660, 1), prop(960, 1), peep(1260, 10), sevo(1560), bleed(2160, 1000, 300)], 3060, { mode: 'manual' }),
  S('L-C0-bleed', 'MANUAL: bleed 1.5 L', [bleed(60, 1500, 600)], 1800, { mode: 'manual' }),
  S('L-C1-bleed-prop2', 'MANUAL: bleed 1.5 L, +5 min propofol 2 mg/kg', [bleed(60, 1500, 600), prop(960, 2)], 1800, { mode: 'manual' }),
  S('L-A1-prop2', 'MANUAL: healthy propofol 2 mg/kg', [prop(T0, 2)], 1200, { mode: 'manual' }),
  S('L-C4-bleed2500', 'MANUAL: bleed 2.5 L', [bleed(60, 2500, 600)], 2400, { mode: 'manual' }),
];

// ---- extra probes (added after the first pass) ------------------------------------------------------------------------
SCENARIOS.push(
  // Ali's case exactly as B7 but with the propofol boluses doubled (does ANY dose collapse tamponade?)
  S('B9-tamp-prop4', 'Tamponade 1, +10 min propofol 4 mg/kg', [tamp(60), prop(660, 4)], 1500),
  // Commanded arrest + CPR: CPP and EtCO2 with CPR, adrenaline; is ROSC emergent?
  S('X1-vf-cpr', 'Commanded VF at 300 s, CPR from 330 s, adrenaline 1 mg at 450 s', [
    [T0, { type: 'setRhythm', rhythm: 'vfCoarse' }, 'VF'], [T0 + 30, A.cpr(true), 'CPR'], [T0 + 150, A.drug('epinephrine', 1, 'mg'), 'adrenaline 1 mg']], T0 + 600, { printEvery: 30 }),
);
```

#### Create `scripts/audit-physiology/report.ts`

```ts
// Physiology integration audit — reports over <out>/results/*.json (FU-4 Task 1): the per-step summary, the propofol
// state-dependence matrix (audit §K: each propofol run minus its no-drug control at the same sim time) and the arrest
// table (time, onset rhythm and cause of every emergent arrest, the first MAP < 30 and the lowest HR in the minute
// before). Run alone: `node --experimental-strip-types scripts/audit-physiology/report.ts [summary|matrix|arrests] [prefix…]`.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUT } from './runner.ts';

type Row = Record<string, number | string | boolean>;
interface Result { scenario: { name: string; title: string; mode: string; tEnd: number; steps: [number, unknown, string?][] }; rows: Row[] }
const RES = join(OUT, 'results');
const load = (n: string): Result => JSON.parse(readFileSync(join(RES, `${n}.json`), 'utf8')) as Result;
const names = (sel: readonly string[]) => (existsSync(RES) ? readdirSync(RES) : []).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).filter((n) => !sel.length || sel.some((p) => n.startsWith(p))).sort();
const f = (x: unknown, d = 0) => (typeof x === 'number' && Number.isFinite(x) ? x.toFixed(d) : '–');
const n = (r: Row, k: string) => r[k] as number;
const mean = (rows: Row[], k: string) => {
  const v = rows.map((r) => n(r, k)).filter(Number.isFinite);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
};

/** Per scripted step: the 30 s mean before it, the MAP nadir before the next step, the window's end. */
export function summary(sel: readonly string[] = []): string {
  const out: string[] = [];
  const pick = (r: Row) => `HR ${f(r.hr)} ${f(r.sbp)}/${f(r.dbp)} (${f(r.map)}) CVP ${f(r.cvp, 1)} CO ${f(r.co, 2)} SV ${f(r.sv)} CPP ${f(r.cpp)} kI ${f(r.kIsch, 2)}/${f(r.kIschRv, 2)} SpO2 ${f(r.spo2)} EtCO2 ${f(r.etco2)} PaCO2 ${f(r.paco2)} pH ${f(r.ph, 2)} Lac ${f(r.lact, 1)} K ${f(r.k, 1)} T ${f(r.temp, 1)} CBF ${f(r.cbf, 2)} es ${f(r.baroEs)} set ${f(r.baroSet)} ${String(r.rhythm)}${r.noEject ? ' NO-EJECT' : ''}${r.pulseless ? ' PULSELESS' : ''}`;
  for (const name of names(sel)) {
    const d = load(name);
    const steps = d.scenario.steps.filter((s) => s[0] > 1);
    const times = [...new Set(steps.map((s) => s[0]))].sort((a, b) => a - b);
    out.push(`\n## ${name} — ${d.scenario.title} [${d.scenario.mode}]`);
    times.forEach((t, i) => {
      const t1 = times[i + 1] ?? d.scenario.tEnd;
      const win = d.rows.filter((r) => n(r, 't') > t && n(r, 't') <= t1);
      if (!win.length) return;
      const pre = d.rows.filter((r) => n(r, 't') > t - 30 && n(r, 't') <= t);
      const nad = win.reduce((a, b) => ((Number.isFinite(n(b, 'map')) ? n(b, 'map') : 1e9) < (Number.isFinite(n(a, 'map')) ? n(a, 'map') : 1e9) ? b : a));
      out.push(`  @${t}s ${steps.filter((s) => s[0] === t).map((s) => s[2] ?? '').join(' + ')}`);
      if (pre.length) out.push(`    pre   MAP ${f(mean(pre, 'map'))} HR ${f(mean(pre, 'hr'))} CO ${f(mean(pre, 'co'), 2)}`);
      out.push(`    nadir t=${f(nad.t)} ${pick(nad)}`);
      out.push(`    end   t=${t1} ${pick(win[win.length - 1] as Row)}`);
    });
  }
  return out.join('\n');
}

/** Audit §K: propofol 2 mg/kg minus its no-drug control (or the pre-dose mean) over the 10 min after the dose. */
export const PAIRS: [string, string, string | null, number][] = [
  ['healthy 40 y', 'A1-propofol2', 'A0-control', 300],
  ['80 y hypertensive', 'J3-80htn-prop2', 'J4-80htn-ctl', 300],
  ['AS + CAD + HTN 75 y', 'K-ascad-prop2', 'K-ascad-ctl', 300],
  ['HFrEF 60 y', 'K-hfref-prop2', 'K-hfref-ctl', 300],
  ['tamponade 1 (250 mL)', 'B2-tamp-prop2', 'B0-tamp', 660],
  ['hypovolaemia (−1.5 L)', 'C1-bleed-prop2', 'C0-bleed1500-ctl', 960],
  ['massive PE (φ 0.8)', 'K-pe-prop2', 'D0-pe', 660],
  ['tension PTX (7b, R)', 'K-ptx-prop2', 'K-ptx-ctl', 660],
  ['septic shock warm', 'F1-sepsis-prop2', 'F0-sepsis', 1260],
  ['MANUAL healthy (vs pre-dose)', 'L-A1-prop2', null, 300],
  ['MANUAL hypovolaemia', 'L-C1-bleed-prop2', 'L-C0-bleed', 960],
];
export function matrix(): string {
  const out = ['| state | pre MAP | pre HR | pre CO | ΔMAP nadir | ΔMAP % | at t+ | ΔHR | ΔCO | min MAP | arrest |', '|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const [label, run, ctl, t0] of PAIRS) {
    if (!existsSync(join(RES, `${run}.json`)) || (ctl && !existsSync(join(RES, `${ctl}.json`)))) continue;
    const a = load(run).rows;
    const c = ctl ? load(ctl).rows : null;
    const pre = a.filter((r) => n(r, 't') > t0 - 30 && n(r, 't') <= t0);
    const base = { map: mean(pre, 'map'), hr: mean(pre, 'hr'), co: mean(pre, 'co') };
    let best = { d: Infinity, t: 0, dhr: 0, dco: 0, map: 0, ref: 1 };
    for (const r of a.filter((x) => n(x, 't') > t0 && n(x, 't') <= t0 + 600)) {
      const w = a.filter((x) => Math.abs(n(x, 't') - n(r, 't')) <= 10); // ±10 s against the ventilator/beat jitter
      const wc = c ? c.filter((x) => Math.abs(n(x, 't') - n(r, 't')) <= 10) : null;
      const ref = { map: wc ? mean(wc, 'map') : base.map, hr: wc ? mean(wc, 'hr') : base.hr, co: wc ? mean(wc, 'co') : base.co };
      const d = mean(w, 'map') - ref.map;
      if (d < best.d) best = { d, t: n(r, 't') - t0, dhr: mean(w, 'hr') - ref.hr, dco: mean(w, 'co') - ref.co, map: mean(w, 'map'), ref: ref.map };
    }
    const arrest = a.find((r) => n(r, 't') > t0 && r.pulseless === true);
    out.push(`| ${label} | ${f(base.map)} | ${f(base.hr)} | ${f(base.co, 2)} | ${f(best.d, 1)} | ${f((100 * best.d) / best.ref)} % | ${best.t} s | ${f(best.dhr)} | ${f(best.dco, 2)} | ${f(best.map)} | ${arrest ? `t+${n(arrest, 't') - t0} s ${String(arrest.rhythm)}` : 'no'} |`);
  }
  return out.join('\n');
}

/** Every scenario: the first pulseless sample (rhythm, cause), the first MAP < 30, the lowest HR in the minute before. */
export function arrests(sel: readonly string[] = []): string {
  const out = ['| scenario | arrest at | rhythm | cause | first MAP < 30 | min HR, last min before | steps |', '|---|---|---|---|---|---|---|'];
  for (const name of names(sel)) {
    const d = load(name);
    const a = d.rows.find((r) => r.pulseless === true);
    const pre = a ? d.rows.filter((r) => n(r, 't') < n(a, 't')) : d.rows;
    const low = pre.find((r) => n(r, 'map') < 30);
    const hrs = pre.filter((r) => a && n(r, 't') >= n(a, 't') - 60).map((r) => n(r, 'hr')).filter(Number.isFinite);
    const steps = d.scenario.steps.filter((s) => s[0] > 1 && !String(s[2] ?? '').startsWith('core →')).map((s) => `${s[0]} s ${s[2] ?? ''}`).join('; ');
    out.push(`| ${name} | ${a ? `${f(a.t)} s` : '–'} | ${a ? String(a.rhythm) + (String(a.rhythm).startsWith('sinus') ? ' (PEA)' : '') : '–'} | ${a ? String(a.cause || '') : ''} | ${low ? `${f(low.t)} s` : '–'} | ${hrs.length ? f(Math.min(...hrs)) : '–'} | ${steps} |`);
  }
  return out.join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [what = 'arrests', ...sel] = process.argv.slice(2);
  console.log(what === 'summary' ? summary(sel) : what === 'matrix' ? matrix() : arrests(sel));
}
```

#### Create `scripts/audit-physiology/cli.ts`

```ts
// Physiology integration audit (research/08-physiology-integration-audit.md; FU-4 Task 1). From the repo root:
//   npx -y pnpm@9.15.9 run audit:physiology              → every scenario (≈ 5–8 min), then the matrix and the arrest table
//   npx -y pnpm@9.15.9 run audit:physiology B7 C4 X1     → the named scenarios / prefixes only, then the arrest table
// Raw per-scenario JSON goes to $PME_AUDIT_OUT (default <repo>/.audit-physiology/results, git-ignored); tables print to
// stdout. PME_ENGINE=<path to engine-core/src/index.ts> audits another tree. Each scenario yields once per sim-minute.
// Node ≥ 22.15 (module.registerHooks in hooks.mjs: engine-core imports skin JSON without an import attribute).
import { SCENARIOS } from './scenarios.ts';
import { extremes, run, save, table } from './runner.ts';
import { arrests, matrix } from './report.ts';

const sel = process.argv.slice(2);
const all = sel.length === 0 || sel.includes('all');
const pick = SCENARIOS.filter((s) => all || sel.some((p) => s.name === p || s.name.startsWith(p)));
for (const sc of pick) {
  const t0 = Date.now();
  const { rows, log } = await run(sc);
  save(sc, rows, log);
  console.log(`\n=== ${sc.name} — ${sc.title} (${sc.mode}) [${((Date.now() - t0) / 1000).toFixed(1)} s wall]`);
  console.log(log.filter((l) => !l.includes('airwayDevice') && !l.startsWith('1s')).join('\n'));
  console.log(table(sc, rows));
  const firstT = Math.min(...sc.steps.map((s) => s[0]).filter((t) => t > 1), sc.tEnd);
  console.log('extremes after first intervention:', JSON.stringify(extremes(rows, firstT, sc.tEnd)));
}
if (all) console.log(`\n## Propofol state-dependence (audit §K)\n${matrix()}`);
console.log(`\n## Arrests\n${arrests(all ? [] : sel)}`);
```

#### Create `scripts/audit-physiology/whatif.ts`

```ts
// What-if probes (NOT engine behaviour): the sympathetic reflex output removed through a state poke on the committed
// pipeline state (e.st.hemo.circ.prof.gSymp = 0: the arterial AND cardiopulmonary sympathetic limbs), to measure how
// much of each shock state's pressure is held up by reflex sympathetic tone — the quantity propofol's central
// sympatholysis removes clinically. Scratch-only; the engine source is untouched.
import { run, save, A, VENTED, type Scenario, type Step } from './runner.ts';
const noSymp = (t: number): Step => [t, (e: any) => { e.st.hemo.circ.prof.gSymp = 0; }, 'what-if: gSymp = 0'];
const prop = (t: number, mgkg: number): Step => [t, A.drug('propofol', mgkg, 'mg/kg'), `propofol ${mgkg} mg/kg`];
const S = (name: string, title: string, steps: Step[], tEnd: number): Scenario => ({ name, title, mode: 'modeled', steps: [...VENTED, ...steps], tEnd, printEvery: 60 });
const W: Scenario[] = [
  S('W1-healthy-nosymp', 'WHAT-IF healthy: sympathetic reflex output removed at 300 s', [noSymp(300)], 900),
  S('W2-tamp-nosymp', 'WHAT-IF tamponade 1: sympathetic reflex output removed at 660 s', [[60, A.cond('tamponade', 1), 'tamponade 1'], noSymp(660)], 1260),
  S('W3-tamp-nosymp-prop2', 'WHAT-IF tamponade 1: sympathetic removed + propofol 2 mg/kg at 660 s', [[60, A.cond('tamponade', 1), 'tamponade 1'], noSymp(660), prop(660, 2)], 1260),
  S('W4-bleed-nosymp-prop2', 'WHAT-IF bleed 1.5 L: sympathetic removed + propofol 2 mg/kg at 960 s', [[60, A.bleed(1500, 600), 'bleed 1.5 L'], noSymp(960), prop(960, 2)], 1560),
  S('W5-healthy-nosymp-prop2', 'WHAT-IF healthy: sympathetic removed + propofol 2 mg/kg at 300 s', [noSymp(300), prop(300, 2)], 900),
];
for (const sc of W) {
  const { rows, log } = await run(sc);
  save(sc, rows, log);
  const t0 = Math.max(...sc.steps.map((s) => s[0]));
  const pre = rows.filter((r) => r.t > t0 - 30 && r.t <= t0);
  const post = rows.filter((r) => r.t > t0 && r.t <= t0 + 600);
  const nad = post.reduce((a, b) => (b.map < a.map ? b : a));
  const mean = (w: any[], k: string) => (w.reduce((s, r) => s + r[k], 0) / w.length).toFixed(1);
  console.log(`${sc.name}: pre MAP ${mean(pre, 'map')} HR ${mean(pre, 'hr')} CO ${mean(pre, 'co')} → nadir MAP ${nad.map.toFixed(1)} (t+${nad.t - t0} s) HR ${nad.hr} CO ${nad.co.toFixed(2)} CPP ${nad.cpp.toFixed(0)} kIsch ${nad.kIsch.toFixed(2)} ${nad.rhythm}; end MAP ${mean(post.slice(-6), 'map')}`);
}
```

#### Create `scripts/audit-physiology/probe-va.ts`

```ts
const { createEngine } = await import(process.env.PME_ENGINE ?? new URL('../../packages/engine-core/src/index.ts', import.meta.url).href);
for (const vent of [null, { rr: 12, vtMl: 500 }, { rr: 14, vtMl: 500 }, { rr: 12, vtMl: 600 }]) {
  const e: any = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70 } as any });
  if (vent) {
    e.dispatch({ id: 'a', issuedBy: 'x', type: 'applyEvent', event: { kind: 'airwayDevice', device: 'ett' } });
    e.dispatch({ id: 'b', issuedBy: 'x', type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', peep: 5, fio2: 0.5, ...vent } });
  }
  const out: string[] = [];
  for (let t = 60; t <= 3600; t += 60) {
    e.advanceTo(t);
    if (t % 600 === 0) { const r = e.st.resp; out.push(`t${t} VA ${r.vaLpm.toFixed(2)} PaCO2 ${r.co2.pf.toFixed(1)} EtCO2 ${r.etco2.toFixed(1)} vdExtra ${r.co2.vdExtraMl?.toFixed(0)} T ${r.temp.tc.toFixed(2)} vo2F ${e.st.endo.core.out.vo2F}`); }
    await new Promise((r) => setImmediate(r));
  }
  console.log(JSON.stringify(vent), '\n ', out.join('\n  '));
}
```

#### Create `scripts/audit-physiology/probe-k.ts`

```ts
const { createEngine } = await import(process.env.PME_ENGINE ?? new URL('../../packages/engine-core/src/index.ts', import.meta.url).href);
for (const k of [4.2, 8.5, 9.5]) {
  const e: any = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, blood: { k } } as any });
  e.advanceTo(120);
  console.log(`profile K ${k}: blood.out.k ${e.st.blood.out.k.toFixed(2)} kEcg ${e.st.blood.out.kEcg.toFixed(2)} mods.k ${e.st.mods.k} set.k ${e.st.blood.core.so.set?.k} kChem ${e.st.hemo.circ.ext.kChem}`);
}
// burns + sux
const e: any = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, blood: { burns: 1 } } as any });
e.advanceTo(60);
e.dispatch({ id: 'a', issuedBy: 'x', type: 'applyEvent', event: { kind: 'drug', drugId: 'succinylcholine', dose: 1.5, unit: 'mg/kg', route: 'iv' } });
for (const t of [120, 240, 360]) { e.advanceTo(t); console.log(`sux burns t${t}: K ${e.st.blood.out.k.toFixed(2)} mods.k ${e.st.mods.k.toFixed(2)} rhythm ${e.st.rhythm.id} kChem ${e.st.hemo.circ.ext.kChem.toFixed(2)}`); }
```

- [x] **Step 2: The script and the ignore rule.**

#### Modify `package.json`

Edit 1 — find:

```json
    "check-notices": "node --experimental-strip-types scripts/check-notices.ts",
```

replace with:

```json
    "check-notices": "node --experimental-strip-types scripts/check-notices.ts",
    "audit:physiology": "node --experimental-strip-types --import ./scripts/audit-physiology/hooks.mjs scripts/audit-physiology/cli.ts",
```

#### Modify `.gitignore`

Edit 1 — find:

```text
packages/validation/datasets/cache/
```

replace with:

```text
packages/validation/datasets/cache/
.audit-physiology/
```

- [x] **Step 3: Run the BEFORE audit** (≈ 7 min; background + `until` loop) and keep its report:

```bash
PME_AUDIT_OUT=<scratchpad>/fu-4-integration-polish/audit-before npx -y pnpm@9.15.9 run audit:physiology \
  > <scratchpad>/fu-4-integration-polish/audit-before.txt 2>&1
mkdir -p docs/gates/fu-4 && sed -n '/^## Propofol/,$p' <scratchpad>/fu-4-integration-polish/audit-before.txt > docs/gates/fu-4/audit-before.md
```

Expected (identical to the audit on 9f864b3 — FU-3 does not move these rows): healthy propofol −10 % / HR +17,
tamponade −16 %, hypovolaemia −25 %, and no row in the arrest table except `X1-vf-cpr` (commanded VF) and `I1-apnoea`
(FU-3's asphyxial PEA at 1 065 s).

- [x] **Step 4: Commit and push.**

```bash
git add scripts/audit-physiology package.json .gitignore docs/gates/fu-4/audit-before.md
git commit -m "chore(audit): the physiology integration audit as \`pnpm run audit:physiology\` (FU-4 item 10)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push -u origin fu-4-integration-polish
```


### Task 2: G2 — anaesthetic sympatholysis suppresses the sympathetic OUTPUT and resets the set point (7g PD + 7a baroreflex; PROTOTYPED)

**Files:**
- Modify (7g): `packages/engine-core/src/l2/pk/row.ts` (two `PdTarget`s), `packages/engine-core/src/l2/pk/combine.ts`
  (`NEUTRAL_FX`, `FX_TARGETS`), `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts` (four PD constants; the
  propofol, sevoflurane and isoflurane rows)
- Modify (7a): `packages/engine-core/src/l2/circ/drugs.ts` (`DrugEffect.symp`, `.setF`), `packages/engine-core/src/l2/circ/baroreflex.ts`
  (`BaroGains.outF`, `.setF`; the error and the resetting against `set × setF`; every sympathetic output × `outF` after
  its clamp), `packages/engine-core/src/l2/circ/model.ts` (the `d7` merge line and the `stepBaro(` call — R51 §6:
  7g edited this line first; FU-3 did not touch it)
- Modify (test, pre-declared flip): `packages/engine-core/test/engine/circ-sanity-1.test.ts`
- Create: `packages/engine-core/test/l2/circ/sympathetic-output.test.ts`

**Interfaces:** Produces `DrugEffect.symp`, `DrugEffect.setF` (7a type; 7g's `fx` and 7a's own `drugEffect()` default
them to 1), `PdTarget` `'symp' | 'setF'`, `BaroGains.outF?`, `BaroGains.setF?`, exports `PROPOFOL_SYMP`,
`PROPOFOL_SETF`, `VOLATILE_SYMP`, `VOLATILE_SETF` (rows-anaesthetic.ts). Consumes nothing new.

**Why (audit G2, K matrix, W probes):** propofol and the volatiles only scaled the baroreflex GAIN (`gSymp × gv`); the
error grows until the output returns (tamponade `es` 10 → 23), so propofol's ΔMAP was −10 % healthy and only −16 % in
tamponade, CO never fell, HR rose +17. Mechanism, sizes and sources: Decision D1.

**Prototype (seed 7, the audit rig; `pnpm run audit:physiology`, control-subtracted matrix) before → after:** healthy
2 mg/kg −10 % / HR +17 → **−31 % / +3** (nadir MAP 66 at +3 min; 1 mg/kg −19 %) · 80 y HTN −11 % → **−30 %** · AS + CAD
−11 % → **−30 %** · HFrEF −10 % → **−28 %** · tamponade 1 −16 % → **−51 % (MAP 44), then PEA at +3.2 min once Tasks 4–6
are in** · hypovolaemia −1.5 L −25 % → **−73 % (MAP 22) → PEA at +95 s (with Tasks 4–6)** · massive PE −16 % → −43 % ·
sevoflurane 2 % dial (0.65 MAC at 20 min) −6 % / HR +16 → **−12.5 % / +2** · phenylephrine, class II and β-blocked
haemorrhage unchanged (no anaesthetic). circ-sanity-1 (seed 11, VT 500 rig): MAP ratio 0.913 / HR +16.6 → **0.72 / +3.0**
(band 0.60–0.80, < +15): the pre-declared `it.fails` passes. circ-sanity-2 R23 pair: still `it.fails` (AS + CAD 1.5 mg/kg
spontaneously breathing through an SGA: 155/85 → 126/72, kIsch 1.00, S/D 1.16 — the R23 spiral needs DBP ≈ 45; NR-2
stands). neuro-circ (FU-3's R-7f-9 flip) stays green.

- [x] **Step 1: Write the failing unit test** `packages/engine-core/test/l2/circ/sympathetic-output.test.ts`:

#### Create `packages/engine-core/test/l2/circ/sympathetic-output.test.ts`

```ts
// FU-4 G2 (Task 2): anaesthetic sympatholysis is a suppression of the delivered sympathetic OUTPUT (after the reflex
// saturation) plus a set-point reset — 7g computes `symp`/`setF`, 7a's stepBaro applies them. A gain scale lets the error
// grow until the output returns; an output factor lowers the ceiling, so a saturated reflex loses the most.
import { describe, expect, it } from 'vitest';
import { createBaro, stepBaro, SYMP_SAT, type BaroGains } from '../../../src/l2/circ/baroreflex.ts';
import { combine } from '../../../src/l2/pk/combine.ts';
import { DRUGS } from '../../../src/l2/pk/data/drugs.ts';
import type { DrugRow } from '../../../src/l2/pk/row.ts';

const G: BaroGains = { gVagal: 15, gSymp: 1, betaBlock: 0, weightScale: 1, pinnedSet: false };
/** Hold MAP at `map` against a set point of 95 for 120 s (the sympathetic LPF settles) and return the last output. */
function settle(map: number, g: BaroGains) {
  const b = createBaro(95);
  let o = stepBaro(b, map, g);
  for (let i = 0; i < 1200; i++) o = stepBaro(b, map, g);
  return { o, b };
}

describe('FU-4 G2: sympathetic output suppression and resetting (baroreflex)', () => {
  it('outF 1 and setF 1 are bit-identical to the absent fields', () => {
    const a = settle(70, G).o;
    const b = settle(70, { ...G, outF: 1, setF: 1 }).o;
    expect(b).toEqual(a);
  });
  it('a saturated reflex keeps its output under a gain scale but loses it under an output factor', () => {
    const full = settle(40, G).o; // error 55 mmHg: SVR arm saturated
    expect(full.svrF - 1).toBeCloseTo(SYMP_SAT, 6);
    const gain = settle(40, { ...G, gSymp: 0.72 }).o; // the pre-FU-4 anaesthetic path: gSymp × gv (0.72 at propofol's nadir)
    expect(gain.svrF - 1).toBeCloseTo(SYMP_SAT, 6); // still saturated
    const out = settle(40, { ...G, outF: 0.1 }).o;
    expect(out.svrF - 1).toBeCloseTo(0.1 * SYMP_SAT, 6);
    expect(out.dV0).toBeCloseTo(0.1 * full.dV0, 6);
  });
  it('setF lowers the pressure the error is taken against (a reset reflex fires less at the same MAP)', () => {
    const reset = settle(80, { ...G, setF: 0.85 });
    const plain = settle(80, G);
    expect(reset.b.es).toBeLessThan(0.1 * plain.b.es + 1e-9); // set 95 × 0.85 ≈ 81 vs MAP 80
  });
  it('7g: propofol Ce 3 µg/mL → output × 0.10 and set point × 0.865; sevoflurane 0.65 MAC → output × 0.675; no drug → 1', () => {
    const ctx = { ph: 7.4, betaBlockC: 0, vasoResp: 1, ageY: 40, macBrain: 0 };
    const prop = combine([{ row: DRUGS.propofol as DrugRow, c: 3 }], ctx).fx;
    expect(prop.symp).toBeCloseTo(0.1, 3);
    expect(prop.setF).toBeCloseTo(1 - 0.15 * 0.9, 3);
    const sevo = combine([{ row: DRUGS.sevoflurane as DrugRow, c: 0.65 }], { ...ctx, macBrain: 0.65 }).fx;
    expect(sevo.symp).toBeCloseTo(1 - 0.5 * 0.65, 3);
    const none = combine([], ctx).fx;
    expect([none.symp, none.setF]).toEqual([1, 1]);
  });
});
```

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/sympathetic-output.test.ts` —
expected FAIL (no `outF`/`setF`, `fx.symp` undefined).

- [x] **Step 2: 7g — the two PD targets.**

#### Modify `packages/engine-core/src/l2/pk/row.ts`

Edit 1 — find:

```ts
  | 'hr' | 'ees' | 'svr' | 'v0Frac' | 'pvr' | 'gv' | 'gvHr' // → 7a DrugEffect
```

replace with:

```ts
  | 'hr' | 'ees' | 'svr' | 'v0Frac' | 'pvr' | 'gv' | 'gvHr' | 'symp' | 'setF' // → 7a DrugEffect (FU-4 G2: symp, setF)
```

#### Modify `packages/engine-core/src/l2/pk/combine.ts`

Edit 1 — find:

```ts
export const NEUTRAL_FX: DrugEffect = { hr: 1, ees: 1, svr: 1, v0Frac: 0, pvr: 1, gv: 1, gvHr: 1 };
const FX_TARGETS = ['hr', 'ees', 'svr', 'pvr', 'gv', 'gvHr'] as const;
```

replace with:

```ts
export const NEUTRAL_FX: DrugEffect = { hr: 1, ees: 1, svr: 1, v0Frac: 0, pvr: 1, gv: 1, gvHr: 1, symp: 1, setF: 1 };
const FX_TARGETS = ['hr', 'ees', 'svr', 'pvr', 'gv', 'gvHr', 'symp', 'setF'] as const; // FU-4 G2: symp, setF
```

#### Modify `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts`

Edit 1 — find:

```ts
const VOLATILE_GVHR: PdEffect = { target: 'gvHr', emax: -1, ec50: 1, linear: true };
```

replace with:

```ts
const VOLATILE_GVHR: PdEffect = { target: 'gvHr', emax: -1, ec50: 1, linear: true };
/**
 * FU-4 G2: central sympatholysis — × on the DELIVERED sympathetic output (7a stepBaro `outF`, after the reflex
 * saturation). Propofol near-abolishes MSNA at induction and inhibits it dose-dependently (Ebert 1992, Anesthesiology
 * 76:725; Sellgren 1994, 80:534; Robinson 1997, 86:64; Ebert 2005, 103:20) [P direction]; size [ENG], fit targets:
 * healthy 2 mg/kg MAP −25 to −40 % with HR ±10 (M10 ch. 21 p. 519) — Ce 3 µg/mL leaves 10 % of the output, Ce 1.5
 * leaves 31 %. The set point resets toward lower pressure with it (Sellgren 1994) [ENG size −15 % at full effect].
 */
export const PROPOFOL_SYMP: PdEffect = { target: 'symp', emax: -1, ec50: 1.0, hill: 2 };
export const PROPOFOL_SETF: PdEffect = { target: 'setF', emax: -0.15, ec50: 1.0, hill: 2 };
/** FU-4 G2: sevoflurane/isoflurane lower SNA with MAP and no HR change (Ebert, Muzi & Lopatka 1995, Anesthesiology 83:88) [ENG size, fit: 0.65 MAC MAP −10 to −20 %]. */
export const VOLATILE_SYMP: PdEffect = { target: 'symp', emax: -0.5, ec50: 1, linear: true };
export const VOLATILE_SETF: PdEffect = { target: 'setF', emax: -0.1, ec50: 1, linear: true };
```

Edit 2 — find:

```ts
      { target: 'gv', emax: -0.6, ec50: 3.5 }, { target: 'gvHr', emax: -0.7, ec50: 3.5 },
    ],
```

replace with:

```ts
      { target: 'gv', emax: -0.6, ec50: 3.5 }, { target: 'gvHr', emax: -0.7, ec50: 3.5 },
      PROPOFOL_SYMP, PROPOFOL_SETF, // FU-4 G2
    ],
```

Edit 3 — find (sevoflurane row):

```ts
      { target: 'gv', emax: -0.3, ec50: 1, linear: true }, VOLATILE_GVHR, { target: 'bronchodilation', emax: 1, ec50: 0.5 }, { target: 'hpvInhibit', emax: 0.2, ec50: 1, linear: true },
    ],
```

replace with:

```ts
      { target: 'gv', emax: -0.3, ec50: 1, linear: true }, VOLATILE_GVHR, { target: 'bronchodilation', emax: 1, ec50: 0.5 }, { target: 'hpvInhibit', emax: 0.2, ec50: 1, linear: true },
      VOLATILE_SYMP, VOLATILE_SETF, // FU-4 G2
    ],
```

Edit 4 — find (isoflurane row):

```ts
      { target: 'v0Frac', emax: 0.03, ec50: 1, linear: true }, { target: 'gv', emax: -0.3, ec50: 1, linear: true }, VOLATILE_GVHR, { target: 'bronchodilation', emax: 1, ec50: 0.5 },
    ],
```

replace with:

```ts
      { target: 'v0Frac', emax: 0.03, ec50: 1, linear: true }, { target: 'gv', emax: -0.3, ec50: 1, linear: true }, VOLATILE_GVHR, { target: 'bronchodilation', emax: 1, ec50: 0.5 },
      VOLATILE_SYMP, VOLATILE_SETF, // FU-4 G2
    ],
```

- [x] **Step 3: 7a — the effect type and its default.**

#### Modify `packages/engine-core/src/l2/circ/drugs.ts`

Edit 1 — find:

```ts
  gvHr: number; // × on the sympathetic HR arm only (propofol depresses the baroreflex HR response most: Cullen 1987)
}
```

replace with:

```ts
  gvHr: number; // × on the sympathetic HR arm only (propofol depresses the baroreflex HR response most: Cullen 1987)
  /**
   * FU-4 G2: × on the central sympathetic OUTPUT (arterial and cardiopulmonary limbs, applied after the reflex
   * saturation): anaesthetic sympatholysis (MSNA suppression), 1 = none. Unlike a gain scale, it lowers the ceiling of
   * what the reflex can deliver, so a patient held up by a saturated reflex loses most (state-dependence).
   */
  symp: number;
  /** FU-4 G2: × on the baroreflex set point (anaesthetic resetting to a lower pressure), 1 = none. */
  setF: number;
}
```

Edit 2 — find:

```ts
  peak: Omit<DrugEffect, 'gv' | 'gvHr'> & { gv?: number; gvHr?: number }; // relative change at the peak of the reference dose (× − 1 or + frac)
```

replace with:

```ts
  peak: Omit<DrugEffect, 'gv' | 'gvHr' | 'symp' | 'setF'> & { gv?: number; gvHr?: number }; // relative change at the peak of the reference dose (× − 1 or + frac)
```

Edit 3 — find:

```ts
  const e: DrugEffect = { hr: 1, ees: 1, svr: 1, v0Frac: 0, pvr: 1, gv: 1, gvHr: 1 };
```

replace with:

```ts
  const e: DrugEffect = { hr: 1, ees: 1, svr: 1, v0Frac: 0, pvr: 1, gv: 1, gvHr: 1, symp: 1, setF: 1 };
```

(The A11 sentence in this file's header stays true for the 7a Bateman rows; the anaesthetic reset is 7g's `setF`.)

- [x] **Step 4: 7a — the baroreflex applies them.**

#### Modify `packages/engine-core/src/l2/circ/baroreflex.ts`

Edit 1 — find:

```ts
  hrGain?: number; // × on the sympathetic HR arm only (drug depression of the chronotropic reflex)
}
```

replace with:

```ts
  hrGain?: number; // × on the sympathetic HR arm only (drug depression of the chronotropic reflex)
  /** FU-4 G2: × on the delivered sympathetic output (both limbs), after saturation — central sympatholysis (1 = none). */
  outF?: number;
  /** FU-4 G2: × on the set point the error is taken against (anaesthetic resetting; 1 = none). */
  setF?: number;
}
```

Edit 2 — find:

```ts
  b.mapLp += (map - b.mapLp) * (1 - Math.exp(-BARO_DT / MAP_TAU_S));
  const e = b.set - b.mapLp;
```

replace with:

```ts
  b.mapLp += (map - b.mapLp) * (1 - Math.exp(-BARO_DT / MAP_TAU_S));
  const set = b.set * (g.setF ?? 1); // FU-4 G2: an anaesthetic resets the reflex to a lower pressure (Sellgren 1994)
  const e = set - b.mapLp;
```

Edit 3 — find:

```ts
  if (!g.pinnedSet && Math.abs(b.mapLp - b.set) > RESET_FRAC * b.set) {
    b.offT += BARO_DT;
    if (b.offT >= RESET_HOLD_S) {
      b.set += RESET_GAIN * (b.mapLp - b.set);
```

replace with:

```ts
  if (!g.pinnedSet && Math.abs(b.mapLp - set) > RESET_FRAC * set) {
    b.offT += BARO_DT;
    if (b.offT >= RESET_HOLD_S) {
      b.set += RESET_GAIN * (b.mapLp - set);
```

Edit 4 — find:

```ts
  const scp = g.gSymp * (ecp < 0 ? SYMP_WITHDRAW : 1);
  return {
    rrMs: Math.min(VAGAL_MAX_MS, Math.max(-VAGAL_WITHDRAW_MS, -VAGAL_STEADY * g.gVagal * b.ev)),
    hrF: 1 + clampSat(G_HS * g.gSymp * (g.hrGain ?? 1) * (b.es < 0 ? SYMP_WITHDRAW_HR : 1) * beta * b.es),
    svrF: 1 + clampSat(G_R * s * b.es + G_CP_R * scp * ecp),
    eesF: 1 + clampSat(G_C * s * betaC * b.es),
    dV0: Math.max(-V0_RECRUIT_MAX_ML_KG * 70 * g.weightScale, -G_V * g.weightScale * s * Math.min(40, Math.max(-40, b.es)) - G_CP_V * g.weightScale * scp * ecp),
    cSvF: 1 - clampSat(G_CSV * s * b.es) * 0.5,
  };
```

replace with:

```ts
  const scp = g.gSymp * (ecp < 0 ? SYMP_WITHDRAW : 1);
  const o = g.outF ?? 1; // FU-4 G2: the delivered sympathetic output, after each factor's saturation
  return {
    rrMs: Math.min(VAGAL_MAX_MS, Math.max(-VAGAL_WITHDRAW_MS, -VAGAL_STEADY * g.gVagal * b.ev)),
    hrF: 1 + o * clampSat(G_HS * g.gSymp * (g.hrGain ?? 1) * (b.es < 0 ? SYMP_WITHDRAW_HR : 1) * beta * b.es),
    svrF: 1 + o * clampSat(G_R * s * b.es + G_CP_R * scp * ecp),
    eesF: 1 + o * clampSat(G_C * s * betaC * b.es),
    dV0: o * Math.max(-V0_RECRUIT_MAX_ML_KG * 70 * g.weightScale, -G_V * g.weightScale * s * Math.min(40, Math.max(-40, b.es)) - G_CP_V * g.weightScale * scp * ecp),
    cSvF: 1 - o * clampSat(G_CSV * s * b.es) * 0.5,
  };
```

#### Modify `packages/engine-core/src/l2/circ/model.ts`

Edit 1 — find:

```ts
    de.hr *= d7.hr; de.ees *= d7.ees; de.svr *= d7.svr; de.v0Frac += d7.v0Frac; de.pvr *= d7.pvr; de.gv *= d7.gv; de.gvHr *= d7.gvHr;
```

replace with:

```ts
    de.hr *= d7.hr; de.ees *= d7.ees; de.svr *= d7.svr; de.v0Frac += d7.v0Frac; de.pvr *= d7.pvr; de.gv *= d7.gv; de.gvHr *= d7.gvHr;
    de.symp *= d7.symp ?? 1; de.setF *= d7.setF ?? 1; // FU-4 G2
```

Edit 2 — find:

```ts
hrGain: de.gvHr, weightScale: w, pinnedSet: m.mapSetPinned }, raTm)
```

replace with:

```ts
hrGain: de.gvHr, weightScale: w, pinnedSet: m.mapSetPinned, outF: de.symp, setF: de.setF }, raTm)
```

- [x] **Step 5: Run the unit test** (PASS) and the circulation siblings:

```bash
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ test/l2/pk test/engine/circ-sanity-1.test.ts test/engine/circ-sanity-2.test.ts test/engine/neuro-circ.test.ts
```

Expected: `test/l2/circ` and `test/l2/pk` green; circ-sanity-1's propofol `it.fails` now FAILS as an expected failure
(its body passes: "propofol MAP ratio 0.72 dHR 3.0"); circ-sanity-2 unchanged; neuro-circ green.

- [x] **Step 6: Flip the pre-declared test.**

#### Modify `packages/engine-core/test/engine/circ-sanity-1.test.ts`

Edit 1 — find:

```ts
  // Stage 7g Task 20 (R45: band kept, it.fails, gate note): propofol now runs on the Eleveld Ce with T6.3's
  // E = Ce/(Ce + 3.5). Measured MAP ratio 0.913, HR +16.6 at 2 min (nadir 0.910 at the 3 min Ce peak). No re-fit inside
  // the permitted T6.3 ranges meets the band: gvHr −0.8 / SVR −0.55 / EC50 2.5 (the corner) gives 0.867 with HR +19.6;
  // gvHr −0.8 alone 0.913 / +15.3. With the Schnider ke0 the ratio is 0.838 / +18.6. The 7a Bateman fit used E ≈ 0.9 at
  // the peak; T6.3 gives E ≈ 0.44 at Ce 2.75. Needs a ruling (Q57 / calibration pass).
  it.fails('propofol 2 mg/kg: MAP ≈ 70 % of baseline at 2 min (60–80 %) with little HR rise (< +15)', async () => {
```

replace with:

```ts
  // Stage 7g Task 20 measured MAP ratio 0.913, HR +16.6 (it.fails, Q57): T6.3's terms only scaled the baroreflex gain.
  // FU-4 G2 (Task 2): propofol suppresses the delivered sympathetic output and resets the set point (7g `symp`/`setF`) —
  // measured 0.72 / +3.0. The band is unchanged (R45).
  it('propofol 2 mg/kg: MAP ≈ 70 % of baseline at 2 min (60–80 %) with little HR rise (< +15) — was 0.913 / +16.6 before FU-4', async () => {
```

- [x] **Step 7: Audit re-measure** — `PME_AUDIT_OUT=<scratchpad>/fu-4-integration-polish/audit-t2 npx -y pnpm@9.15.9 run
  audit:physiology A1 A2 B0 B2 C0 C1 J3 J4 K-ascad K-hfref D0 K-pe A0` → the matrix rows above (before Tasks 4–6 the
  tamponade/hypovolaemia rows show the MAP falls without the arrests).

- [x] **Step 8: Commit and push.**

```bash
git add packages/engine-core/src/l2/pk packages/engine-core/src/l2/circ/{drugs,baroreflex,model}.ts packages/engine-core/test/l2/circ/sympathetic-output.test.ts packages/engine-core/test/engine/circ-sanity-1.test.ts
git commit -m "feat(circ,pk): anaesthetic sympatholysis suppresses the sympathetic OUTPUT and resets the set point (FU-4 G2) — healthy propofol −31 %, tamponade −51 %, hypovolaemia −73 %

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```


### Task 3: G4 — the arrest reads its own pressures: continuous MAP and CPP accumulation (7a; 7d/7e readers E-FU4-2; truth E-FU4-3; PROTOTYPED)

**Files:**
- Modify (7a): `packages/engine-core/src/l2/circ/model.ts` (`MAP_NOW_TAU_S`; state `cppAcc`, `mapNow`; the 10 Hz
  `mapNow` update in `control()`; the 2 ms relaxation-phase accumulation in `stepCircModel`)
- Modify (**E-FU4-2**): `packages/engine-core/src/l2/organs/inputs.ts` (7d: `map` from `circ.mapNow`),
  `packages/engine-core/src/l2/endo/adapters.ts` (7e: `mapOf` from `circ.mapNow`) — one MAP source each
- Modify (**E-FU4-3**, 7x): `packages/engine-core/src/truth.ts` — `hemo.circ.acc` (the in-progress beat accumulator,
  bookkeeping the 7x console already marks internal) and `hemo.circ.cppAcc` leave the truth tree; without it the "future
  tree" of `truth-event.test.ts` hits the 2 100-leaf cap (`truncated: true`) once Tasks 3–6 add their leaves
- Create: `packages/engine-core/test/engine/circ-arrest-state.test.ts` (1 test here; Task 4 adds the CPP test)

**Interfaces:** Produces `CircModelState.mapNow: number` (mmHg, τ 2 s, both modes), `CircModelState.cppAcc: { sum;
n }` (reset by the 1 Hz coronary step, Task 4), export `MAP_NOW_TAU_S`. 7d/7e read `circ.mapNow` duck-typed with
their old fallbacks.

**Why (audit G4, X1):** in VF the coronary model, 7d's CBF, the `circ` event's CPP and 7e's MAP all read the last
beat before the arrest (`coronary.ts:40`, `organs/inputs.ts:146`, `endo/adapters.ts:60`, `hemo/pipeline.ts:423`):
CPP 79, CBF 1.0, UOP 84 mL/h in VF. `mapSum/mapN` already accumulate the radial pressure at 2 ms for the control step;
`mapNow` low-passes it at 10 Hz in both modes (the baroreflex's own `mapLp` runs in MODELED only). The relaxation-phase
aortic − RA pressure (outside compressions; the whole cycle without CPR) is Paradis's CPP.

**Prototype (seed 7, VF at 60 s, CPR q 1 from 120 s):** continuous MAP rest 96 → VF 19–20 → CPR 47–53 (was the last
beat's 96 for 7d/7e); brain CBF rel 1.0 → **< 0.2 in VF** (was 1.00–1.49) → > 0.2 under CPR; check-18 (MANUAL) numbers
unchanged to 3 decimals (mapLow 64.28 vs 64.39, CBF 0.667 vs 0.666 — the organs' MAP source moved from the beat mean to
the 2 s time mean); `truth-event` future tree back under the cap.

- [x] **Step 1: Write the failing test.**

#### Create `packages/engine-core/test/engine/circ-arrest-state.test.ts`

```ts
// FU-4 G4 (Tasks 3–4): during VF and CPR the physiology reads the ARREST state, never the last beat — the continuous MAP
// (`circ.mapNow`) that 7d and 7e read falls with no flow, the brain's CBF collapses in VF and returns with compressions,
// and (Task 4) the `circ` event's CPP is the continuous relaxation-phase CPP (was the last beat's 79 throughout VF).
// Commanded VF at 60 s, CPR (quality 1) from 120 s, MODELED, seed 7.
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type EngineEvent } from '../../src/index.ts';

let n = 0;
const cmd = (c: Record<string, unknown>) => ({ id: `as${++n}`, issuedBy: 'test', ...c }) as unknown as Command;
type St = { hemo: { circ: { mapNow: number } }; organs: { brain: { cbfRel: number } } };
type Circ = Extract<EngineEvent, { type: 'circ' }>;

async function vfCpr() {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: { abp: 'connected' } } });
  const circ: Circ[] = [];
  e.on((x) => circ.push(x as Circ), ['circ']);
  e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse', atTick: 60 * 50 }));
  e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 1 }, atTick: 120 * 50 }));
  const st = () => (e as unknown as { st: St }).st;
  const cbf: Record<number, number> = {};
  const map: Record<number, number> = {};
  for (let t = 10; t <= 240; t += 10) {
    e.advanceTo(t);
    cbf[t] = st().organs.brain.cbfRel;
    map[t] = st().hemo.circ.mapNow;
  }
  const cpp = (a: number, b: number) => circ.filter((c) => c.t > a && c.t <= b).map((c) => c.cpp);
  return { cbf, map, cpp };
}

describe('FU-4 G4: the arrest reads its own pressures', () => {
  it('VF: the continuous MAP and the brain CBF collapse; CPR brings CBF back above 20 %', async () => {
    const r = await vfCpr();
    console.log(`MAP rest ${r.map[50]?.toFixed(0)} VF ${r.map[110]?.toFixed(0)} CPR ${r.map[240]?.toFixed(0)}; CBF VF ${r.cbf[110]?.toFixed(2)} CPR ${r.cbf[240]?.toFixed(2)}`);
    expect(r.map[110]).toBeLessThan(30);
    expect(r.cbf[110]).toBeLessThan(0.2);
    expect(r.cbf[240]).toBeGreaterThan(0.2);
  }, 120_000);
});
```

Run it: expected FAIL (`mapNow` undefined; CBF 1.0 in VF).

- [x] **Step 2: 7a — the continuous MAP and the CPP accumulator.**

#### Modify `packages/engine-core/src/l2/circ/model.ts`

Edit 1 — find:

```ts
/** FU-3 item 16: floor of the hypoxic contractility factor 1 − cor.hyp (anoxic myocardium stops ejecting) [ENG]. */
export const K_HYP_MIN = 0.02;
```

replace with:

```ts
/** FU-3 item 16: floor of the hypoxic contractility factor 1 − cor.hyp (anoxic myocardium stops ejecting) [ENG]. */
export const K_HYP_MIN = 0.02;
/** FU-4 G4: the continuous MAP's averaging time constant (7d, 7e and the arrest's no-flow rule read it) [ENG]. */
export const MAP_NOW_TAU_S = 2;
```

Edit 2 — find:

```ts
  cor: CoronaryState; // R23 coronary supply/demand (stepped at 1 Hz by the pipeline)
```

replace with:

```ts
  cor: CoronaryState; // R23 coronary supply/demand (stepped at 1 Hz by the pipeline)
  /** FU-4 G4: sum and count of the relaxation-phase aortic − RA pressure since the coronary step last read it (2 ms). */
  cppAcc: { sum: number; n: number };
  /** FU-4 G4: mean radial pressure, low-passed (τ 2 s) at the 10 Hz control step in both modes — beats or none. */
  mapNow: number;
```

Edit 3 — find:

```ts
ref: st.ref, cor: createCoronary(st.ref), chemo: { sao2: 0.97, paco2: 40 },
```

replace with:

```ts
ref: st.ref, cor: createCoronary(st.ref), cppAcc: { sum: 0, n: 0 }, mapNow: st.ref.map, chemo: { sao2: 0.97, paco2: 40 },
```

Edit 4 — find:

```ts
  const map = m.mapN > 0 ? m.mapSum / m.mapN : m.baro.mapLp;
```

replace with:

```ts
  const map = m.mapN > 0 ? m.mapSum / m.mapN : m.baro.mapLp;
  m.mapNow += (map - m.mapNow) * (1 - Math.exp(-CTL_DT / MAP_NOW_TAU_S)); // FU-4 G4
```

Edit 5 — find:

```ts
    m.qFwd += (Math.max(0, o.qAv) + o.qVad - m.qFwd) * (L_H / CO_TAU_S);
```

replace with:

```ts
    m.qFwd += (Math.max(0, o.qAv) + o.qVad - m.qFwd) * (L_H / CO_TAU_S);
    if (env.cprCardiac(m.t) <= 0) {
      m.cppAcc.sum += o.pAo - o.pRa; // FU-4 G4: the coronary driving pressure outside compressions (Paradis 1990)
      m.cppAcc.n++;
    }
```

(Without CPR `cprCardiac` returns 0 at once; the accumulator is read and reset by Task 4's coronary step — until then it
only grows, bounded by a double's range for years of sim time.)

- [x] **Step 3: 7d and 7e read it (E-FU4-2).**

#### Modify `packages/engine-core/src/l2/organs/inputs.ts`

Edit 1 — find:

```ts
    map: site.map,
```

replace with:

```ts
    map: (hs as unknown as { circ?: { mapNow?: number } }).circ?.mapNow ?? site.map, // FU-4 G4: the circulation's current MAP (no beat during an arrest)
```

#### Modify `packages/engine-core/src/l2/endo/adapters.ts`

Edit 1 — find:

```ts
  const beats = circOf(ctx)?.beats;
  const last = beats && beats.length ? beats[beats.length - 1] : undefined;
  if (last) return last.map;
```

replace with:

```ts
  const c = circOf(ctx) as { beats?: { map: number }[]; mapNow?: number } | undefined;
  if (c && typeof c.mapNow === 'number') return c.mapNow; // FU-4 G4: the current MAP, beats or none
  const beats = c?.beats;
  const last = beats && beats.length ? beats[beats.length - 1] : undefined;
  if (last) return last.map;
```

- [x] **Step 4: 7x's truth tree (E-FU4-3).**

#### Modify `packages/engine-core/src/truth.ts`

Edit 1 — find:

```ts
const SKIP_PATH = new Set(['dev.alarms.profile', 'hemo.circ.prof', 'hemo.circ.base', 'hemo.circ.ref', 'endo.core.x', 'endo.core.profile', 'resp.temp.env']); // Stage 7e: its input copy, profile and heat calibration
```

replace with:

```ts
const SKIP_PATH = new Set(['dev.alarms.profile', 'hemo.circ.prof', 'hemo.circ.base', 'hemo.circ.ref', 'endo.core.x', 'endo.core.profile', 'resp.temp.env', 'hemo.circ.acc', 'hemo.circ.cppAcc']); // Stage 7e: its input copy, profile and heat calibration; FU-4 (E-FU4-3): the in-progress beat and CPP accumulators
```

- [x] **Step 5b (UNPROTOTYPED): the `state` event's MODELED SBP/DBP during an arrest.** `emitSecond` reports the last
  site beat's SBP/DBP as MODELED truth — in VF or PEA that is the beat before the arrest (the controllers' BP and 8a's
  `state:sbp` series). With no ejection for > 3 s (`isArrested`, which the `overrides()` flags already use) report the
  circuit's continuous MAP for both.

#### Modify `packages/engine-core/src/l2/hemo/pipeline.ts`

Edit 1 — find:

```ts
    values.sbp = hs.lastSite.sbp;
    values.dbp = hs.lastSite.dbp;
```

replace with:

```ts
    const flat = isArrested(hs, t); // FU-4 G4: no ejection for > 3 s — the pressure is the equalised circuit's, not the last beat's
    values.sbp = flat ? hs.circ.mapNow : hs.lastSite.sbp;
    values.dbp = flat ? hs.circ.mapNow : hs.lastSite.dbp;
```

  Run `test/engine/hemo-vf.test.ts`, `test/engine/circ-arrest.test.ts`, `test/engine/state-rhythm.test.ts` and
  `packages/controller` tests; a sibling that pinned the stale value is reported, not re-tuned.

- [x] **Step 5: Run** the new test (PASS), then the siblings that read these values:

```bash
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-arrest-state.test.ts test/engine/truth-event.test.ts test/l2/organs test/l2/endo test/engine/organs-htn.test.ts test/engine/organs-tbi.test.ts test/engine/endo-circ-acceptance.test.ts test/engine/organs-renal.test.ts
cd apps/demo && npx vitest run src/physiology-console && cd ../..
```

Expected: all green, with the numbers recorded by the gate (check 18: mapLow 64.3, CBF 0.667, hypocapnia 0.377).

- [x] **Step 6: Commit and push.**

```bash
git add packages/engine-core/src/l2/circ/model.ts packages/engine-core/src/l2/hemo/pipeline.ts packages/engine-core/src/l2/organs/inputs.ts packages/engine-core/src/l2/endo/adapters.ts packages/engine-core/src/truth.ts packages/engine-core/test/engine/circ-arrest-state.test.ts
git commit -m "feat(circ): the arrest reads its own pressures — continuous MAP for 7d/7e and a relaxation-phase CPP accumulator (FU-4 G4)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```


### Task 4: G1 (part 1) — the coronary step becomes the myocardial state: flow share without a floor, absolute CPP, basal demand, the no-beat branch (7a; FU-3's `TAU_HYP_S` re-fit; PROTOTYPED)

**Files:**
- Modify (7a): `packages/engine-core/src/l2/circ/coronary.ts` (constants, `NoBeat`, `NO_BEAT_RHYTHMS`, `cpp` state,
  `stepCoronary(…, noBeat?, modeled = true)`), `packages/engine-core/src/l2/circ/model.ts` (`CircBeat.pItEd`,
  `BeatAcc.pItEd`), `packages/engine-core/src/l2/hemo/pipeline.ts` (the `emitSecond` coronary block; the `circ` event's
  `cpp`)
- Modify (FU-3's constant — the re-fit is D3; its test and band are untouched): `TAU_HYP_S` in `coronary.ts`
- Modify (test): `packages/engine-core/test/engine/circ-arrest-state.test.ts` (Task 3's file: the CPP test)
- Create: `packages/engine-core/test/l2/circ/coronary-arrest.test.ts`

**Interfaces:** `stepCoronary(c, beats, cfr, dt, hr, o2Rel = 1, noBeat?: NoBeat, modeled = true)` — existing callers
(FU-3's unit tests) keep their positional arguments; `CoronaryState.cpp`; `CircBeat.pItEd?`; exports `K_ISCH_MIN`,
`K_ISCH_MIN_MANUAL`, `TAU_ISCH_ARREST_S`, `DEMAND_ARREST`, `D_BASAL`, `D_EC`, `NoBeat`, `NO_BEAT_RHYTHMS`.

**Why (audit G1, G4, B7, C4, E1):** `coronary.ts:52` floors kIsch at 0.2 (B7: MAP 13 and SV 2 mL for 15 min, E1: CO 0
with "sinus 182"); the demand scales with pressure work only (C4: HR 186 at LVSP 25 needed 40 % of resting O2, kIsch
0.46); CPP used the transmural LVEDP against an extrathoracic aorta (PEEP and tension PTX invisible); with no beat the
step returned early. Mechanism, sources and the MANUAL rule: Decisions D2, D3, D6.

**Prototype (with Tasks 2, 3, 5, 6):** unit numbers in the test file; engine: class IV haemorrhage kIsch 0.46 (floor
never reached) → through 0.1 → PEA at 695 s (MAP < 30 at 645 s); tension PTX 7b severity 1: CPP 32 (abs basis 6) →
PEA at +60 s; check-18 (MANUAL) unchanged (R23 balance); FU-3's asphyxia: TAU_HYP_S 150 → +4.50 min (band 5–14) →
**260 → +5.62 min**, HR < 40 at +3.43, post-arrest window, E-FU3-10 and the 7.0 s reversal unchanged; FU-3's "final HR
≤ 130" `it.fails` now passes (74.4; flipped in Task 6).

- [x] **Step 1: Write the failing unit test.**

#### Create `packages/engine-core/test/l2/circ/coronary-arrest.test.ts`

```ts
// FU-4 G1/G4 (Task 4): the coronary step as the myocardial state of the arrest machine — the flow share has no floor in
// MODELED (R23's 0.2 stays in MANUAL), CPP is taken on the absolute LV end-diastolic pressure, the demand keeps basal
// and excitation–contraction shares, and with no beat to read it uses the continuous CPP and loses contractility slowly.
import { describe, expect, it } from 'vitest';
import { createCoronary, D_BASAL, D_EC, K_ISCH_MIN_MANUAL, stepCoronary, TAU_ISCH_ARREST_S } from '../../../src/l2/circ/coronary.ts';
import type { CircBeat } from '../../../src/l2/circ/model.ts';

const ref = { hr: 70, sbp: 120, dbp: 80, map: 93, cvp: 5, lvedv: 125, lvedp: 9, lvsp: 118, sv: 80, co: 5.6, pcwp: 7 };
const beat = (o: Partial<CircBeat> = {}): CircBeat => ({
  t: 0, sbp: 120, dbp: 80, map: 93, aoSys: 115, aoDia: 80, sv: 80, svRv: 80, lvedv: 125, lvesv: 50, lvedp: 9, lvsp: 118,
  avOpen: 0.08, avClose: 0.37, dur: 60 / 70, pItEd: -4, ...o,
});
/** Class IV haemorrhage at the audit's C4 nadir: DBP 20, HR 186, LVSP 25, LVEDV 30. */
const shock = beat({ aoDia: 20, dbp: 20, map: 22, lvsp: 25, lvedv: 30, lvedp: 1, avClose: 0.2 });

describe('FU-4 G1: coronary myocardial state', () => {
  it('rest is unchanged: ratio ≈ CFR, kIsch 1 (the absolute basis cancels at the resting pleural pressure)', () => {
    const c = createCoronary(ref);
    for (let i = 0; i < 60; i++) stepCoronary(c, [beat()], 3.5, 1, 70);
    expect(c.ratio).toBeCloseTo(3.5, 1);
    expect(c.kIsch).toBe(1);
  });
  it('MODELED: class IV shock drives kIsch through 0.1 within 90 s (no floor); MANUAL (R23 balance) parks at 0.2', () => {
    const m = createCoronary(ref);
    const n = createCoronary(ref);
    let tCross = -1;
    for (let i = 1; i <= 180; i++) {
      stepCoronary(m, [shock], 3.5, 1, 186);
      stepCoronary(n, [shock], 3.5, 1, 186, 1, undefined, false);
      if (tCross < 0 && m.kIsch <= 0.1) tCross = i;
    }
    expect(tCross).toBeGreaterThan(0);
    expect(tCross).toBeLessThanOrEqual(90);
    expect(n.kIsch).toBeCloseTo(K_ISCH_MIN_MANUAL, 2);
  });
  it('the basal and E–C shares make a fast, empty, low-pressure heart ischaemic (demand ≥ 0.35 of rest)', () => {
    const c = createCoronary(ref);
    stepCoronary(c, [shock], 3.5, 1, 186);
    expect(D_BASAL + D_EC).toBeCloseTo(0.35, 6);
    expect(c.ratio).toBeLessThan(0.5);
  });
  it('PEEP/tension PTX: the pleural pressure at end-diastole lowers CPP one for one (absolute LVEDP)', () => {
    const a = createCoronary(ref);
    const b = createCoronary(ref);
    stepCoronary(a, [beat({ aoDia: 45, dbp: 45 })], 3.5, 1, 90);
    stepCoronary(b, [beat({ aoDia: 45, dbp: 45, pItEd: 16 })], 3.5, 1, 90);
    expect(a.cpp - b.cpp).toBeCloseTo(20, 6);
  });
  it('no beat: the continuous CPP is used, demand DEMAND_ARREST, and the loss runs at τ TAU_ISCH_ARREST_S', () => {
    const c = createCoronary(ref);
    for (let i = 0; i < TAU_ISCH_ARREST_S; i++) stepCoronary(c, [beat()], 3.5, 1, 70, 1, { cpp: 3, dtf: 1 });
    expect(c.cpp).toBe(3);
    expect(c.kIsch).toBeGreaterThan(0.36); // e^−1 of the way to 0
    expect(c.kIsch).toBeLessThan(0.38);
    // CPR relaxation CPP 30 over half the cycle recovers it (supply > DEMAND_ARREST)
    for (let i = 0; i < 180; i++) stepCoronary(c, [], 3.5, 1, 70, 1, { cpp: 30, dtf: 0.5 });
    expect(c.ratio).toBeGreaterThan(1); // supply > DEMAND_ARREST
    expect(c.kIsch).toBeGreaterThan(0.9);
  });
});
```

- [x] **Step 2: The coronary step.**

#### Modify `packages/engine-core/src/l2/circ/coronary.ts`

Edit 1 — find:

```ts
import type { CircBeat } from './model.ts';
import type { Stabilised } from './stabilise.ts';
```

replace with:

```ts
import type { CircBeat } from './model.ts';
import type { Stabilised } from './stabilise.ts';
import { P_PL0 } from './params.ts'; // FU-4 G1: the resting pleural pressure (absolute CPP basis)
```

Edit 2 — find:

```ts
 * (dogs, DeBehnke 1995) after the airway is occluded on room air].
 */
export const TAU_HYP_S = 150;
```

replace with:

```ts
 * (dogs, DeBehnke 1995) after the airway is occluded on room air]. FU-4 (D3): re-fitted 150 → 260 s to the same window
 * once the R23 floor (0.2) no longer held the hypoxic, hypotensive heart up for ≈ 3 min (arrest +4.50 → +5.62 min).
 */
export const TAU_HYP_S = 260;
/**
 * FU-4 G1: floor of the ischaemic contractility factor in MODELED. The R23 floor 0.2 kept a no-flow heart beating at a
 * fifth of its contractility for ever (audit B7: MAP 13, SV 2 mL for 15 min); a myocardium without coronary flow stops
 * contracting within about a minute (Tennant & Wiggers 1935 [P]) — the floor is gone.
 */
export const K_ISCH_MIN = 0;
/**
 * FU-4 G1 (D6): MANUAL keeps R23's balance (floor 0.2, transmural CPP, pressure-work demand). Its set-and-hold tracker
 * can hold an instructor pair with an ischaemic ventricle (FU-3 item 4 defect 1: the check-18 rig at 90/52 parks at
 * kIsch 0.2 with LVEDP 46 — CPP ≈ 0 while the displayed MAP is 65), so a floorless spiral there would arrest a picture
 * the instructor set; MANUAL arrests by NO FLOW instead (arrest.ts MAP_NO_FLOW). Revisit with Q-FU3-4a.
 */
export const K_ISCH_MIN_MANUAL = 0.2;
/**
 * FU-4 G1: time constant of the contractile loss while the heart is NOT beating (pulseless rhythm or no ejection): the
 * no-flow myocardium keeps its capacity to resume through the "electrical phase" of VF, ≈ 4 min (Weisfeldt & Becker
 * 2002, three-phase model [P]), so the loss is slower than the beating ischaemic heart's τ_down 20 s [ENG: τ 120 s puts
 * kIsch at 0.13 after 4 min of no flow, below the arrest threshold — a shock then gives PEA, the circulatory phase].
 */
export const TAU_ISCH_ARREST_S = 120;
/**
 * FU-4 G1: myocardial O2 demand has a basal share (the arrested, non-beating heart: ≈ 15 % of the working MVO2) and an
 * excitation–contraction share paid per beat whatever the load (the unloaded-contraction MVO2 of the PVA–MVO2
 * relation: Suga 1990, Physiol Rev 70:247; Gibbs 1978) [P ranges, ENG split]; only the rest scales with pressure work.
 * Without them a heart at HR 186 and LVSP 25 needed 40 % of its resting O2 and never became ischaemic (audit C4).
 */
export const D_BASAL = 0.15;
export const D_EC = 0.2;
/** FU-4 G1: myocardial O2 demand of a non-ejecting heart relative to rest (basal + E–C: VF, PEA, asystole under CPR) [ENG]. */
export const DEMAND_ARREST = D_BASAL + D_EC;
/** FU-4 G1/G4: rhythms with no mechanical systole (the pulseless flag marks PEA on organised rhythms). */
export const NO_BEAT_RHYTHMS: ReadonlySet<string> = new Set(['asystole', 'pWaveAsystole', 'vfCoarse', 'vfFine', 'vtPoly', 'torsades', 'agonal']);
/** FU-4 G1/G4: what the coronary step uses when the heart is not beating: the continuous CPP (Paradis's relaxation-phase
 * aortic − right-atrial pressure, model.ts `cppAcc`) and the fraction of the cycle it perfuses (CPR relaxation, or 1). */
export interface NoBeat {
  cpp: number;
  dtf: number;
}
```

Edit 3 — find:

```ts
  hyp: number; // FU-3 item 16: the hypoxic share of the deficit, filtered as kIsch (0–1; MODELED only, 0 in MANUAL)
}
```

replace with:

```ts
  hyp: number; // FU-3 item 16: the hypoxic share of the deficit, filtered as kIsch (0–1; MODELED only, 0 in MANUAL)
  cpp: number; // FU-4 G4: the CPP the last step used (last beat's aortic diastolic − LVEDP, or the continuous no-beat value)
}
```

Edit 4 — find:

```ts
  return { ref, dtf0: (rr - tsys) / rr, ratio: 1, delta: 0, kIsch: 1, ischT: 0, stMv: 0, eesF: 1, hyp: 0 };
```

replace with:

```ts
  return { ref, dtf0: (rr - tsys) / rr, ratio: 1, delta: 0, kIsch: 1, ischT: 0, stMv: 0, eesF: 1, hyp: 0, cpp: ref.dbp - ref.lvedp };
```

Edit 5 — find:

```ts
 * offset (Guyton & Hall, coronary circulation [TXT]); 1 = the flow-only supply of R23.
 */
export function stepCoronary(c: CoronaryState, beats: readonly CircBeat[], cfr: number, dt: number, hr: number, o2Rel = 1): void {
  const b = beats[beats.length - 1];
  if (!b) return;
  const r = c.ref;
  const rr = 60 / Math.max(20, hr);
  const tsys = b.avClose > 0 ? b.avClose + IVR_S : 0.6 * rr;
  const dtf = Math.max(0.05, (rr - tsys) / rr);
  const cpp = b.aoDia - b.lvedp;
  const cpp0 = r.dbp - r.lvedp;
  const flow = cfr * Math.max(0, (cpp - P_ZF) / Math.max(5, cpp0 - P_ZF)) * (dtf / c.dtf0);
  const demand = (hr / r.hr) * (Math.max(20, b.lvsp) / r.lvsp) * Math.sqrt(Math.max(0.1, c.eesF)) * Math.cbrt(Math.max(10, b.lvedv) / r.lvedv);
  c.ratio = (flow * o2Rel) / Math.max(0.05, demand);
```

replace with:

```ts
 * offset (Guyton & Hall, coronary circulation [TXT]); 1 = the flow-only supply of R23. FU-4: `noBeat` (no beat to
 * read) supplies the continuous CPP and the perfused fraction of the cycle; `modeled` false keeps R23's balance (D6).
 */
export function stepCoronary(c: CoronaryState, beats: readonly CircBeat[], cfr: number, dt: number, hr: number, o2Rel = 1, noBeat?: NoBeat, modeled = true): void {
  const b = beats[beats.length - 1];
  if (!b && !noBeat) return;
  const r = c.ref;
  // FU-4 G1 (MODELED): CPP on the absolute LV end-diastolic pressure; MANUAL keeps R23's balance (K_ISCH_MIN_MANUAL)
  const pl0 = modeled ? P_PL0 : 0;
  const cpp0 = r.dbp - r.lvedp - pl0;
  let cpp: number;
  let dtf: number;
  let demand: number;
  if (noBeat || !b) {
    // FU-4 G4: no beat to read — the arrest's own pressures (CPR relaxation phase, or the equalised circuit)
    cpp = noBeat?.cpp ?? 0;
    dtf = noBeat?.dtf ?? 1;
    demand = DEMAND_ARREST;
  } else {
    const rr = 60 / Math.max(20, hr);
    const tsys = b.avClose > 0 ? b.avClose + IVR_S : 0.6 * rr;
    dtf = Math.max(0.05, (rr - tsys) / rr);
    cpp = b.aoDia - b.lvedp - (modeled ? (b.pItEd ?? P_PL0) : 0); // FU-4 G1: aortic − ABSOLUTE LV end-diastolic pressure (PEEP, tension PTX raise it)
    const hrR = hr / r.hr;
    const ee = Math.sqrt(Math.max(0.1, c.eesF));
    const work = hrR * (Math.max(20, b.lvsp) / r.lvsp) * ee * Math.cbrt(Math.max(10, b.lvedv) / r.lvedv);
    demand = modeled ? D_BASAL + D_EC * hrR * ee + (1 - D_BASAL - D_EC) * work : work; // FU-4 G1: + basal, E–C shares
  }
  c.cpp = cpp;
  const flow = cfr * Math.max(0, (cpp - P_ZF) / Math.max(5, cpp0 - P_ZF)) * (dtf / c.dtf0);
  c.ratio = (flow * o2Rel) / Math.max(0.05, demand);
```

Edit 6 — find:

```ts
  const target = Math.max(0.2, 1 - G_ISCH * c.delta);
  const tau = target < c.kIsch ? TAU_ISCH_DOWN_S : TAU_ISCH_UP_S;
```

replace with:

```ts
  // FU-4 G1: kIsch carries the FLOW share of the deficit (the O2-content share is hyp's, FU-3); no floor in MODELED
  const dIsch = Math.max(0, 1 - flow / Math.max(0.05, demand));
  const target = Math.max(modeled ? K_ISCH_MIN : K_ISCH_MIN_MANUAL, 1 - G_ISCH * dIsch);
  const tau = target < c.kIsch ? (noBeat ? TAU_ISCH_ARREST_S : TAU_ISCH_DOWN_S) : TAU_ISCH_UP_S;
```

- [x] **Step 3: The beat records the pleural pressure at end-diastole.**

#### Modify `packages/engine-core/src/l2/circ/model.ts`

Edit 1 — find:

```ts
  origin?: string; // rhythm-engine origin of the beat (sinus, ventricular, paced, …)
}

interface BeatAcc {
  t: number; sbp: number; dbp: number; sum: number; n: number; aoS: number; aoD: number; sv: number; svRv: number;
  edv: number; esv: number; edp: number; lvsp: number; open: number; close: number; prevQ: number; origin?: string;
}
```

replace with:

```ts
  origin?: string; // rhythm-engine origin of the beat (sinus, ventricular, paced, …)
  pItEd?: number; // FU-4 G1: intrathoracic pressure at end-diastole (LVEDP above is transmural)
}

interface BeatAcc {
  t: number; sbp: number; dbp: number; sum: number; n: number; aoS: number; aoD: number; sv: number; svRv: number;
  edv: number; esv: number; edp: number; lvsp: number; open: number; close: number; prevQ: number; origin?: string; pItEd: number;
}
```

Edit 2 — find:

```ts
    lvedp: a.edp, lvsp: a.lvsp, avOpen: a.open, avClose: a.close, dur: t - a.t, origin: a.origin,
  });
```

replace with:

```ts
    lvedp: a.edp, lvsp: a.lvsp, avOpen: a.open, avClose: a.close, dur: t - a.t, origin: a.origin, pItEd: a.pItEd,
  });
```

Edit 3 — find:

```ts
const newAcc = (t: number, edv: number, edp: number): BeatAcc => ({
  t, sbp: -Infinity, dbp: Infinity, sum: 0, n: 0, aoS: -Infinity, aoD: Infinity, sv: 0, svRv: 0, edv, esv: edv, edp, lvsp: -Infinity, open: -1, close: -1, prevQ: 0,
});
```

replace with:

```ts
const newAcc = (t: number, edv: number, edp: number, pItEd: number): BeatAcc => ({
  t, sbp: -Infinity, dbp: Infinity, sum: 0, n: 0, aoS: -Infinity, aoD: Infinity, sv: 0, svRv: 0, edv, esv: edv, edp, lvsp: -Infinity, open: -1, close: -1, prevQ: 0, pItEd,
});
```

Edit 4 — find:

```ts
      m.acc = newAcc(next.t0, m.s[S.VLV] as number, o.pLv - o.pIt);
```

replace with:

```ts
      m.acc = newAcc(next.t0, m.s[S.VLV] as number, o.pLv - o.pIt, o.pIt);
```

- [x] **Step 4: The pipeline feeds the no-beat branch and publishes the step's CPP.**

#### Modify `packages/engine-core/src/l2/hemo/pipeline.ts`

Edit 1 — find:

```ts
import { SAO2_REF, stepCoronary, stPatchOf } from '../circ/coronary.ts'; // Stage 7a (FU-3 item 16: SAO2_REF)
```

replace with:

```ts
import { NO_BEAT_RHYTHMS, SAO2_REF, stepCoronary, stPatchOf } from '../circ/coronary.ts'; // Stage 7a (FU-3 item 16: SAO2_REF; FU-4 G4: NO_BEAT_RHYTHMS)
```

Edit 2 — find:

```ts
  const hyp0 = c.cor.hyp;
  stepCoronary(c.cor, c.beats, c.prof.cfr, 1, 60 / Math.max(0.2, hs.lastRR), ctx.l1.mode === 'modeled' ? Math.min(1, c.chemo.sao2 / SAO2_REF) : 1); // FU-3 item 16: O2 content in the supply (MODELED)
  // FU-3 item 16 (R50 review finding 1): a pulseless heart is not reperfused, so its hypoxic depression (and the
  // SA-node depression it drives) is held, never unwound, while the rhythm is pulseless
  if (pulseless) c.cor.hyp = Math.max(hyp0, c.cor.hyp);
```

replace with:

```ts
  const hyp0 = c.cor.hyp;
  // FU-4 G4: with no beat to read (pulseless rhythm, or no beat for 3 s) the coronary step reads the arrest's own
  // pressures — the relaxation-phase aortic − RA pressure accumulated at 2 ms (CPR's CPP, Paradis 1990)
  const lb0 = c.beats[c.beats.length - 1];
  const noBeat = pulseless || NO_BEAT_RHYTHMS.has(ctx.rhythm.id) || !lb0 || t - lb0.t > 3;
  const cppCont = c.cppAcc.n > 0 ? c.cppAcc.sum / c.cppAcc.n : 0;
  c.cppAcc = { sum: 0, n: 0 };
  stepCoronary(c.cor, c.beats, c.prof.cfr, 1, 60 / Math.max(0.2, hs.lastRR), ctx.l1.mode === 'modeled' ? Math.min(1, c.chemo.sao2 / SAO2_REF) : 1, noBeat ? { cpp: cppCont, dtf: hs.cpr.active ? 1 - CPR_DUTY : 1 } : undefined, ctx.l1.mode === 'modeled'); // FU-3 item 16: O2 content in the supply (MODELED); FU-4 G1/G4: the no-beat CPP, MODELED balance
  // FU-3 item 16 (R50 review finding 1): a pulseless heart is not reperfused, so its hypoxic depression (and the
  // SA-node depression it drives) is held, never unwound, while the rhythm is pulseless (FU-4 G1: unless CPR perfuses it)
  if (pulseless && !hs.cpr.active) c.cor.hyp = Math.max(hyp0, c.cor.hyp);
```

Edit 3 — find:

```ts
    cpp: lb ? lb.aoDia - lb.lvedp : 0, supplyDemand: c.cor.ratio, kIsch: c.cor.kIsch,
```

replace with:

```ts
    cpp: c.cor.cpp, supplyDemand: c.cor.ratio, kIsch: c.cor.kIsch, // FU-4 G4: the CPP the coronary step used
```

- [x] **Step 5: The CPP test** (appended to Task 3's file).

#### Modify `packages/engine-core/test/engine/circ-arrest-state.test.ts`

Edit 1 — find:

```ts
    expect(r.cbf[240]).toBeGreaterThan(0.2);
  }, 120_000);
});
```

replace with:

```ts
    expect(r.cbf[240]).toBeGreaterThan(0.2);
  }, 120_000);
  it('Task 4: the circ event CPP is the continuous one — < 10 mmHg in VF (was 79), ≥ 15 during compressions (Paradis 1990)', async () => {
    const r = await vfCpr();
    const vf = r.cpp(90, 120);
    const cpr = r.cpp(150, 240);
    console.log(`CPP rest ${r.cpp(30, 60).at(-1)?.toFixed(0)}, VF max ${Math.max(...vf).toFixed(1)}, CPR ${Math.min(...cpr).toFixed(1)}–${Math.max(...cpr).toFixed(1)}`);
    expect(Math.max(...vf)).toBeLessThan(10);
    expect(Math.min(...cpr)).toBeGreaterThanOrEqual(15);
  }, 120_000);
});
```

- [x] **Step 6: Run** the unit test, `test/l2/circ`, the arrest-state test, FU-3's engine test and the R23 pair:

```bash
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ test/engine/circ-arrest-state.test.ts test/engine/circ-hypoxic-arrest.test.ts test/engine/circ-sanity-2.test.ts test/engine/circ-manual-ischaemia.test.ts test/engine/organs-htn.test.ts
```

Expected: green except FU-3's "final HR ≤ 130" `it.fails`, which now passes its body (74.4) — flipped in Task 6
Step 6 (until then it reports as a failing expected-failure: that is the signal, not a regression). If FU-3's
asphyxial arrest lands outside 5–14 min, re-run D3's scan (150/220/260/300/360) and record it; never move the band.

- [x] **Step 7: Commit and push.**

```bash
git add packages/engine-core/src/l2/circ/{coronary,model}.ts packages/engine-core/src/l2/hemo/pipeline.ts packages/engine-core/test/l2/circ/coronary-arrest.test.ts packages/engine-core/test/engine/circ-arrest-state.test.ts
git commit -m "feat(circ): the coronary step as the myocardial state — flow share without a floor (MODELED), absolute CPP, basal demand, the no-beat branch; TAU_HYP_S re-fit to FU-3's window (FU-4 G1, G4)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```


### Task 5: G5 — the right ventricle gets its own coronary balance (7a; PROTOTYPED)

**Files:**
- Modify (7a): `packages/engine-core/src/l2/circ/coronary.ts` (`kIschRv`, `rv0`, the RV block), `packages/engine-core/src/l2/circ/model.ts`
  (`CircBeat.rvsp`/`rvMean`, the beat accumulator, the `m.kRv` line — MODELED only)
- Create: `packages/engine-core/test/l2/circ/rv-coronary.test.ts`

**Interfaces:** `CoronaryState.kIschRv: number` (1 in MANUAL), `CoronaryState.rv0: { perf; rvsp } | null`,
`CircBeat.rvsp?`, `CircBeat.rvMean?` (absolute mmHg). Task 6's declaration reads `min(kIsch, kIschRv)`.

**Why (audit G5, D0, K-pe):** `model.ts:220` builds `m.kRv` with no ischaemia term; the RV-ischaemia spiral of massive
PE, RV infarction and a PH crisis cannot happen (PE: CVP 9, no spiral; propofol in PE −16 %). Mechanism: D4.

**Prototype (with Tasks 2–4, 6):** massive PE (`pe` 1) alone: compensated for ≈ 20 min then PEA at 1 425 s (23 min)
(before: MAP 75–84 indefinitely) · PE + propofol 2 mg/kg: PEA 55 s after the dose (before: −16 %) · PE + PEEP 15: PEA
at 1 015 s · tamponade 1 + propofol 2 mg/kg: PEA at +190 s (both flow shares fall together — LV/RV 0.86/0.85 at +2 min,
0.17/0.15 at +3 min: the RV's perfusion pressure MAP − RV mean shrinks with RV diastolic ≈ CVP 17; without this task
the same dose reached MAP 44 and did not arrest) · healthy/AS + CAD/HFrEF propofol: no
arrest, `kIschRv` 1.00 · MANUAL untouched.

- [x] **Step 1: Write the failing unit test.**

#### Create `packages/engine-core/test/l2/circ/rv-coronary.test.ts`

```ts
// FU-4 G5 (Task 5): the RV's own coronary balance — perfused through systole and diastole (MAP − RV mean pressure),
// demand from RV pressure work; `kIschRv` multiplies RV contractility (MODELED only).
import { describe, expect, it } from 'vitest';
import { createCoronary, stepCoronary } from '../../../src/l2/circ/coronary.ts';
import type { CircBeat } from '../../../src/l2/circ/model.ts';

const ref = { hr: 70, sbp: 120, dbp: 80, map: 93, cvp: 5, lvedv: 125, lvedp: 9, lvsp: 118, sv: 80, co: 5.6, pcwp: 7 };
const beat = (o: Partial<CircBeat> = {}): CircBeat => ({
  t: 0, sbp: 120, dbp: 80, map: 93, aoSys: 115, aoDia: 80, sv: 80, svRv: 80, lvedv: 125, lvesv: 50, lvedp: 9, lvsp: 118,
  avOpen: 0.08, avClose: 0.37, dur: 60 / 70, pItEd: -4, rvsp: 25, rvMean: 10, ...o,
});

describe('FU-4 G5: RV coronary balance', () => {
  it('the first beat is the reference; at rest kIschRv stays 1', () => {
    const c = createCoronary(ref);
    for (let i = 0; i < 60; i++) stepCoronary(c, [beat()], 3.5, 1, 70);
    expect(c.rv0).toEqual({ perf: 83, rvsp: 25 });
    expect(c.kIschRv).toBe(1);
  });
  it('massive PE shape (RVSP 60, RV mean 32, MAP 55, HR 130): RV ischaemia while the LV is still perfused', () => {
    const c = createCoronary(ref);
    stepCoronary(c, [beat()], 3.5, 1, 70);
    const pe = beat({ map: 55, aoDia: 48, dbp: 48, lvsp: 70, lvedv: 70, lvedp: 6, avClose: 0.25, rvsp: 60, rvMean: 32 });
    for (let i = 0; i < 120; i++) stepCoronary(c, [pe], 3.5, 1, 130);
    expect(c.kIschRv).toBeLessThan(0.5);
    expect(c.kIsch).toBeGreaterThan(0.9);
  });
  it('MANUAL (modeled = false) never moves kIschRv', () => {
    const c = createCoronary(ref);
    for (let i = 0; i < 120; i++) stepCoronary(c, [beat({ map: 55, rvsp: 60, rvMean: 32 })], 3.5, 1, 130, 1, undefined, false);
    expect(c.kIschRv).toBe(1);
    expect(c.rv0).toBeNull();
  });
});
```

- [x] **Step 2: The RV balance.**

#### Modify `packages/engine-core/src/l2/circ/coronary.ts`

Edit 1 — find:

```ts
  cpp: number; // FU-4 G4: the CPP the last step used (last beat's aortic diastolic − LVEDP, or the continuous no-beat value)
}
```

replace with:

```ts
  cpp: number; // FU-4 G4: the CPP the last step used (last beat's aortic diastolic − LVEDP, or the continuous no-beat value)
  /** FU-4 G5: the RV's flow-share contractility factor (MODELED; 1 in MANUAL) and its resting reference (captured once). */
  kIschRv: number;
  rv0: { perf: number; rvsp: number } | null;
}
```

Edit 2 — find:

```ts
eesF: 1, hyp: 0, cpp: ref.dbp - ref.lvedp };
```

replace with:

```ts
eesF: 1, hyp: 0, cpp: ref.dbp - ref.lvedp, kIschRv: 1, rv0: null };
```

Edit 3 — find:

```ts
  const tau = target < c.kIsch ? (noBeat ? TAU_ISCH_ARREST_S : TAU_ISCH_DOWN_S) : TAU_ISCH_UP_S;
  c.kIsch += (target - c.kIsch) * (1 - Math.exp(-dt / tau));
  if (c.kIsch > 0.9995) c.kIsch = 1;
```

replace with:

```ts
  const tau = target < c.kIsch ? (noBeat ? TAU_ISCH_ARREST_S : TAU_ISCH_DOWN_S) : TAU_ISCH_UP_S;
  c.kIsch += (target - c.kIsch) * (1 - Math.exp(-dt / tau));
  if (c.kIsch > 0.9995) c.kIsch = 1;
  // FU-4 G5 (MODELED): the RV is perfused through systole AND diastole, driven by aortic mean − RV mean pressure; its
  // demand follows RV pressure work (massive PE, RV infarct, PH crisis: the RV ischaemia spiral). The stabilised
  // reference has no RV pressures: the first beat read is the resting reference [ENG].
  if (modeled && b && !noBeat && b.rvsp !== undefined && b.rvMean !== undefined && Number.isFinite(b.rvsp)) {
    const perf = b.map - b.rvMean;
    c.rv0 ??= { perf, rvsp: b.rvsp };
    const hrR = hr / r.hr;
    const flowRv = cfr * Math.max(0, (perf - P_ZF) / Math.max(5, c.rv0.perf - P_ZF));
    const demRv = D_BASAL + D_EC * hrR + (1 - D_BASAL - D_EC) * hrR * (Math.max(5, b.rvsp) / Math.max(5, c.rv0.rvsp));
    const tRv = Math.max(K_ISCH_MIN, 1 - G_ISCH * Math.max(0, 1 - flowRv / Math.max(0.05, demRv)));
    c.kIschRv += (tRv - c.kIschRv) * (1 - Math.exp(-dt / (tRv < c.kIschRv ? TAU_ISCH_DOWN_S : TAU_ISCH_UP_S)));
    if (c.kIschRv > 0.9995) c.kIschRv = 1;
  }
```

#### Modify `packages/engine-core/src/l2/circ/model.ts`

Edit 1 — find:

```ts
  pItEd?: number; // FU-4 G1: intrathoracic pressure at end-diastole (LVEDP above is transmural)
}
```

replace with:

```ts
  pItEd?: number; // FU-4 G1: intrathoracic pressure at end-diastole (LVEDP above is transmural)
  rvsp?: number; // FU-4 G5: RV peak pressure, mmHg (absolute)
  rvMean?: number; // FU-4 G5: RV mean pressure over the beat, mmHg (absolute) — the RV's intramural back-pressure
}
```

Edit 2 — find:

```ts
open: number; close: number; prevQ: number; origin?: string; pItEd: number;
}
```

replace with:

```ts
open: number; close: number; prevQ: number; origin?: string; pItEd: number;
  rvsp: number; rvSum: number; // FU-4 G5
}
```

Edit 3 — find:

```ts
dur: t - a.t, origin: a.origin, pItEd: a.pItEd,
  });
```

replace with:

```ts
dur: t - a.t, origin: a.origin, pItEd: a.pItEd,
    rvsp: a.rvsp, rvMean: a.rvSum / a.n, // FU-4 G5
  });
```

Edit 4 — find:

```ts
open: -1, close: -1, prevQ: 0, pItEd,
});
```

replace with:

```ts
open: -1, close: -1, prevQ: 0, pItEd, rvsp: -Infinity, rvSum: 0,
});
```

Edit 5 — find:

```ts
      if (o.pLv > a.lvsp) a.lvsp = o.pLv;
```

replace with:

```ts
      if (o.pLv > a.lvsp) a.lvsp = o.pLv;
      if (o.pRv > a.rvsp) a.rvsp = o.pRv; // FU-4 G5
      a.rvSum += o.pRv;
```

Edit 6 — find:

```ts
  m.kRv = b.eesF * de.ees * m.ext.kRv * man.eesRvF * betaBlunt(x.endoEesF ?? 1, x.betaBlockAdd ?? 0) * kc * kHyp; // Stage 7g: β-blockade blunts the surge
```

replace with:

```ts
  m.kRv = b.eesF * de.ees * m.ext.kRv * man.eesRvF * betaBlunt(x.endoEesF ?? 1, x.betaBlockAdd ?? 0) * kc * kHyp * (env.modeled ? m.cor.kIschRv : 1); // Stage 7g: β-blockade blunts the surge; FU-4 G5: RV ischaemia (MODELED)
```

- [x] **Step 3: Run** `test/l2/circ` and the circulation engine siblings (`circ-sanity-2` H5/H7/H8 must stay green —
  they measure at 2 min, before the RV spiral of a massive PE develops):

```bash
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ test/engine/circ-sanity-2.test.ts test/engine/lung-circ.test.ts test/engine/circ-modeled.test.ts
```

- [x] **Step 4: Commit and push.**

```bash
git add packages/engine-core/src/l2/circ/{coronary,model}.ts packages/engine-core/test/l2/circ/rv-coronary.test.ts
git commit -m "feat(circ): the RV's own coronary balance — MAP − RV mean pressure against RV pressure work (FU-4 G5)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```


### Task 6: G1 (part 2) + G9 — the arrest state machine: declaration, onset rhythm, pre-arrest bradycardia, ROSC, MODELED and MANUAL (7a; PROTOTYPED)

**Files:**
- Create (7a): `packages/engine-core/src/l2/circ/arrest.ts`
- Modify (7a): `packages/engine-core/src/l2/circ/model.ts` (`ext.kEcg`, `ext.tempC` types; state `arrest`, `noFlowS`;
  `K_BRADY`, `G_SA_ISCH`, `G_SA_K`; the sinus-rate factor `hypF`), `packages/engine-core/src/l2/hemo/pipeline.ts` (the
  `emitSecond` arrest block for BOTH modes, through FU-3's `requestRhythm`, E-FU3-8 — no `engine.ts` change)
- Modify (FU-3 test, pre-declared flip): `packages/engine-core/test/engine/circ-hypoxic-arrest.test.ts`
- Create: `packages/engine-core/test/l2/circ/arrest.test.ts`, `packages/engine-core/test/engine/circ-lowflow-arrest.test.ts`
  (4 runs of 25–30 sim-min → SLOW; `SLOW_B` after Task 20)
- Modify: `packages/engine-core/vite.config.ts` (one SLOW entry)

**Interfaces:** Produces `CircModelState.arrest: { cause; t; from; roscS } | null`, `CircModelState.noFlowS`, the
optional `ext.kEcg` (written by 7c in Task 7) and `ext.tempC` (written by the engine in Task 16); exports of
`arrest.ts` (`arrestStep`, `roscStep`, `onsetRhythm`, `vfShare`, `riskOf`, the constants). Consumes FU-3's
`hypoxicArrestRequest`, `P_VF_ONSET`, `P_ASYSTOLE_ONSET` and `HemoCtx.requestRhythm` (E-FU3-8), Task 4's
`NO_BEAT_RHYTHMS`, Task 3's `mapNow`.

**Why (audit G1, G7 pre-arrest bradycardia, G9, headline 1):** nothing arrests on main — only commanded rhythms and 7g's
hooks change the rhythm; MANUAL insults run unopposed at MAP 10–16 for 35 min (L-C4). Mechanism: D5, D6.

**Prototype (seed 7; `pnpm run audit:physiology`; the arrest table in "Prototype results"):** Ali's case B7 PEA at
850 s — 3.2 min after propofol 2 mg/kg, HR 105 → 57 before it, the bleed never needed · class IV haemorrhage PEA at
695 s (MAP < 30 at 645 s; HR peak 184 → 91) · MANUAL bleed 2.5 L PEA at 640 s (no-flow route) · tension PTX (7b) PEA
at 120 s, (7a) at 695 s · anaphylaxis 1 PEA at 300 s · FU-3's asphyxia +5.62 min (with Task 4's re-fit) · healthy,
elderly, AS + CAD, HFrEF inductions: none · ROSC probe: PEA at 695 s, CPR + 2 L + adrenaline 1 mg at 760 s → pulse at
850 s, MAP 84 at 935 s; CPR alone → pulse at 850 s too (the CPR model's CPP 42–52 is generous: Q13) · the four-test
engine file green; FU-3's "final HR ≤ 130" body passes (74.4).

- [x] **Step 1: Write the failing tests.**

#### Create `packages/engine-core/test/l2/circ/arrest.test.ts`

```ts
// FU-4 G1/G3/G12 (Task 6): the arrest state machine's decisions — declaration (flow share, no flow, hazards), the onset
// draw (taken only when needed), and ROSC of an engine-declared organised arrest.
import { describe, expect, it } from 'vitest';
import { arrestStep, CPP_ROSC, K_ISCH_ARREST, MAP_NO_FLOW, M_ROSC, NO_FLOW_S, ROSC_HOLD_S, roscStep, vfShare } from '../../../src/l2/circ/arrest.ts';
import { P_ASYSTOLE_ONSET, P_VF_ONSET } from '../../../src/l2/circ/hypoxic-arrest.ts';
import { createCircModel } from '../../../src/l2/circ/model.ts';

const counter = (x = 0.5) => {
  const d = { n: 0, u: () => { d.n++; return x; } };
  return d;
};

describe('FU-4: arrest declaration', () => {
  it('a perfused heart with normal K and temperature takes no draw and requests nothing', () => {
    const m = createCircModel();
    const d = counter();
    for (let i = 0; i < 120; i++) expect(arrestStep(m, 'sinus', false, 75, d.u, 1)).toBeNull();
    expect(d.n).toBe(0);
  });
  it('flow share ≤ K_ISCH_ARREST (LV or RV): PEA on the running organised rhythm at its rate', () => {
    const m = createCircModel();
    m.cor.kIsch = K_ISCH_ARREST;
    expect(arrestStep(m, 'sinusTachy', false, 131.6, counter(0.9).u, 1)).toEqual({ id: 'sinusTachy', opts: { pulseless: true, rateBpm: 132 }, cause: 'lowFlow' });
    const r = createCircModel();
    r.cor.kIschRv = 0.05;
    expect(arrestStep(r, 'afib', false, 120, counter(0.9).u, 1)?.opts.pulseless).toBe(true);
  });
  it(`no flow: MAP below ${MAP_NO_FLOW} for ${NO_FLOW_S} s declares (MANUAL's route, kIsch floored at 0.2)`, () => {
    const m = createCircModel();
    m.mapNow = MAP_NO_FLOW - 1;
    m.cor.kIsch = 0.2;
    let req = null;
    let s = 0;
    for (; s < 120 && !req; s++) req = arrestStep(m, 'sinus', false, 80, counter(0.9).u, 1);
    expect(s).toBe(NO_FLOW_S);
  });
  it('onset draw: VF share 0.1 at no risk, rising with K, cold and catecholamines (capped 0.6); asystole 2/30', () => {
    expect(vfShare({ kEcg: 4.2, tempC: 37, cat: 0 })).toBeCloseTo(P_VF_ONSET, 9);
    expect(vfShare({ kEcg: 8, tempC: 37, cat: 0 })).toBeCloseTo(0.2, 9);
    expect(vfShare({ kEcg: 4.2, tempC: 37, cat: 10 })).toBe(0.6);
    const m = createCircModel();
    m.cor.kIsch = 0;
    expect(arrestStep(m, 'sinus', false, 60, counter(P_VF_ONSET - 1e-3).u, 1)?.id).toBe('vfCoarse');
    expect(arrestStep(m, 'sinus', false, 60, counter(P_VF_ONSET + P_ASYSTOLE_ONSET - 1e-3).u, 1)?.id).toBe('asystole');
  });
  it('hazards: K 9.5 (membrane-effective) and core 26 °C draw each second; VF or asystole', () => {
    const m = createCircModel();
    m.ext.kEcg = 9.5;
    const d = counter(0);
    expect(arrestStep(m, 'sinus', false, 70, d.u, 1)?.cause).toBe('hyperkalaemia');
    const c = createCircModel();
    c.ext.tempC = 26;
    expect(arrestStep(c, 'sinusBrady', false, 40, counter(0).u, 1)).toEqual({ id: 'vfCoarse', opts: {}, cause: 'hypothermia' });
  });
  it('no second declaration while pulseless or in VF/asystole', () => {
    const m = createCircModel();
    m.cor.kIsch = 0;
    expect(arrestStep(m, 'sinus', true, 40, counter().u, 1)).toBeNull();
    expect(arrestStep(m, 'vfCoarse', false, 0, counter().u, 1)).toBeNull();
  });
});

describe('FU-4: ROSC of an engine-declared PEA', () => {
  it(`needs CPP ≥ ${CPP_ROSC} and kIsch·(1 − hyp) ≥ ${M_ROSC} held ${ROSC_HOLD_S} s; then the same rhythm with a pulse`, () => {
    const m = createCircModel();
    m.arrest = { cause: 'lowFlow', t: 0, from: 'sinus', roscS: 0 };
    m.cor.kIsch = 0.5;
    expect(roscStep(m, 'sinus', true, CPP_ROSC - 1, 1)).toBeNull();
    let back = null;
    let s = 0;
    for (; s < 120 && !back; s++) back = roscStep(m, 'sinus', true, 25, 1);
    expect(s).toBe(ROSC_HOLD_S);
    expect(back).toEqual({ id: 'sinus', opts: {} });
    expect(m.arrest).toBeNull();
  });
  it('VF waits for a shock; a pulse returned another way clears the record', () => {
    const m = createCircModel();
    m.arrest = { cause: 'hyperkalaemia', t: 0, from: 'sinus', roscS: 0 };
    m.cor.kIsch = 1;
    for (let i = 0; i < 120; i++) expect(roscStep(m, 'vfCoarse', false, 40, 1)).toBeNull();
    expect(roscStep(m, 'sinus', false, 40, 1)).toBeNull();
    expect(m.arrest).toBeNull();
  });
});
```

#### Create `packages/engine-core/test/engine/circ-lowflow-arrest.test.ts`

```ts
// FU-4 G1/G4/G9 (Tasks 3, 4, 6): emergent low-flow arrest through the myocardial state, in MODELED and MANUAL, the
// arrest reading its own pressures, and ROSC through CPR. Rig: adult 40 y 70 kg, ETT + VCV 12 × 600 / PEEP 5 / FiO2 0.5
// (the audit's rig), seed 7. Bands (R45 targets; sources in the plan's Decisions D2, D5, D6):
//   class IV haemorrhage (2.5 L in 10 min, untreated): PEA/asystole/VF within 15 min of the first MAP < 30 (ATLS class
//     IV; audit §6 S7), the heart rate falling to ≤ 60 % of its tachycardic peak before the arrest (terminal bradycardia);
//   the same in MANUAL: an arrest within 5 min of the first MAP < 25 (the no-flow route, D6);
//   CPR from 60 s after the arrest with 2 L fluid and adrenaline 1 mg: the `circ` event's CPP during compressions is the
//     continuous relaxation-phase value (≥ 15 mmHg, Paradis 1990) — not the last beat's — and a pulse returns within
//     3 min of the first compression;
//   the healthy control: no arrest and no pulseless second in 25 min.
// Multi-sim-minute runs, one yield per sim-minute (CI amendment 4): SLOW_A (Task 19).
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type EngineEvent } from '../../src/index.ts';

type Body = Record<string, unknown>;
let n = 0;
const cmd = (c: Body) => ({ id: `lf${++n}`, issuedBy: 'test', ...c }) as unknown as Command;
const ev = (event: Body) => cmd({ type: 'applyEvent', event });
type St = { rhythm: { id: string; opts: { pulseless?: boolean } }; hemo: { circ: { mapNow: number; arrest: { cause: string } | null; cor: { cpp: number; kIsch: number } } } };
const stOf = (e: ReturnType<typeof createEngine>) => (e as unknown as { st: St }).st;
const pulseless = (s: St) => s.rhythm.opts.pulseless === true || ['asystole', 'vfCoarse', 'vfFine'].includes(s.rhythm.id);

interface Course { tArrest?: number; rhythm?: string; cause?: string; tMap30?: number; tMap25?: number; hrPeak: number; hrAtArrest?: number; tPulseBack?: number; cprCpp: number[]; pulselessS: number }
async function run(mode: 'modeled' | 'manual', opts: { bleedMl?: number; cprAfterS?: number; endS: number }): Promise<Course> {
  const e = createEngine({ seed: 7, mode, patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: { abp: 'connected', cvp: 'connected', spo2: 'on' } } });
  const c: Course = { hrPeak: 0, cprCpp: [], pulselessS: 0 };
  let hr = 75;
  e.on((x: EngineEvent) => {
    if (x.type === 'measurement' && x.values.hr?.value != null) hr = x.values.hr.value;
    if (x.type === 'circ' && c.tPulseBack === undefined && c.tArrest !== undefined && opts.cprAfterS !== undefined && x.t > c.tArrest + opts.cprAfterS + 5) c.cprCpp.push(x.cpp);
  });
  e.dispatch(ev({ kind: 'airwayDevice', device: 'ett' }));
  e.dispatch(ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 }));
  if (opts.bleedMl) e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'bleed', volumeMl: opts.bleedMl, overS: 600 }, atTick: 60 * 50 }));
  for (let t = 1; t <= opts.endS; t++) {
    e.advanceTo(t);
    const s = stOf(e);
    const map = s.hemo.circ.mapNow;
    if (c.tArrest === undefined) {
      c.hrPeak = Math.max(c.hrPeak, hr);
      if (c.tMap30 === undefined && map < 30) c.tMap30 = t;
      if (c.tMap25 === undefined && map < 25) c.tMap25 = t;
      if (pulseless(s)) {
        c.tArrest = t;
        c.rhythm = s.rhythm.id;
        c.cause = s.hemo.circ.arrest?.cause;
        c.hrAtArrest = hr;
        if (opts.cprAfterS !== undefined) {
          const at = Math.round((t + opts.cprAfterS) * 50);
          e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 1 }, atTick: at }));
          e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'fluid', fluid: 'balanced', volumeMl: 2000, overS: 180 }, atTick: at }));
          e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'drug', drugId: 'epinephrine', dose: 1, unit: 'mg', route: 'iv' }, atTick: at }));
        }
      }
    } else if (c.tPulseBack === undefined && !pulseless(s)) {
      c.tPulseBack = t;
      e.dispatch(ev({ kind: 'cpr', active: false }));
    }
    if (pulseless(s)) c.pulselessS++;
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  console.log(`${mode} bleed ${opts.bleedMl ?? 0}: ${JSON.stringify({ ...c, cprCpp: c.cprCpp.length ? [Math.min(...c.cprCpp), Math.max(...c.cprCpp)] : [] })}`);
  return c;
}

describe('FU-4: emergent low-flow arrest and ROSC', () => {
  it('healthy control, 25 min ventilated: never pulseless', async () => {
    const c = await run('modeled', { endS: 1500 });
    expect(c.pulselessS).toBe(0);
  }, 300_000);
  it('class IV haemorrhage (MODELED): arrest within 15 min of MAP < 30, HR at the arrest ≤ 60 % of its peak', async () => {
    const c = await run('modeled', { bleedMl: 2500, endS: 1800 });
    expect(c.tMap30).toBeDefined();
    expect(c.tArrest).toBeDefined();
    expect((c.tArrest as number) - (c.tMap30 as number)).toBeLessThanOrEqual(900);
    expect(c.cause).toBe('lowFlow');
    expect(c.hrAtArrest as number).toBeLessThanOrEqual(0.6 * c.hrPeak);
  }, 300_000);
  it('class IV haemorrhage (MANUAL): the no-flow route arrests within 5 min of MAP < 25', async () => {
    const c = await run('manual', { bleedMl: 2500, endS: 1500 });
    expect(c.tMap25).toBeDefined();
    expect(c.tArrest).toBeDefined();
    expect((c.tArrest as number) - (c.tMap25 as number)).toBeLessThanOrEqual(300);
  }, 300_000);
  it('ROSC: CPR + 2 L + adrenaline 60 s after the arrest — continuous CPR CPP ≥ 15, a pulse within 3 min', async () => {
    const c = await run('modeled', { bleedMl: 2500, cprAfterS: 60, endS: 1500 });
    expect(c.tArrest).toBeDefined();
    expect(c.cprCpp.length).toBeGreaterThan(10);
    expect(Math.min(...c.cprCpp)).toBeGreaterThanOrEqual(15);
    expect(c.tPulseBack).toBeDefined();
    expect((c.tPulseBack as number) - ((c.tArrest as number) + 60)).toBeLessThanOrEqual(180);
  }, 300_000);
});
```

- [x] **Step 2: The state machine.**

#### Create `packages/engine-core/src/l2/circ/arrest.ts`

```ts
// FU-4 G1/G3/G12: the emergent arrest state machine (MODELED and MANUAL alike). FU-3's hypoxic path (hypoxic-arrest.ts)
// declares an asphyxial arrest from the O2-content share of the myocardial deficit (cor.hyp); this module adds
//   (1) the LOW-FLOW arrest: the flow share of either ventricle (cor.kIsch, cor.kIschRv; no floor in MODELED since FU-4)
//       falls to K_ISCH_ARREST — the heart can no longer eject; or NO FLOW (continuous MAP < MAP_NO_FLOW for NO_FLOW_S),
//       the only route MANUAL can reach (its kIsch keeps R23's floor, coronary.ts K_ISCH_MIN_MANUAL). Onset rhythm: one
//       seeded draw — VF with a share rising with catecholamines, K and cold, asystole, else PEA on the running rhythm;
//   (2) the HAZARDS of a beating heart: hyperkalaemic sine wave → VF/asystole above K_HAZARD (the membrane-effective K,
//       so calcium delays it), and hypothermic VF below T_HAZARD;
//   (3) ROSC of an engine-declared organised arrest: once CPR (or the recovered circulation) has held the continuous
//       CPP ≥ CPP_ROSC (Paradis 1990) and the myocardium's state kIsch·(1 − hyp) ≥ M_ROSC for ROSC_HOLD_S, the
//       organised rhythm regains its pulse. VF needs a shock (Stage 4b's defibrillator, its outcome table unchanged);
//       a shock into an unrecovered myocardium re-arrests through (1) — the circulatory/metabolic phases of the
//       three-phase model (Weisfeldt & Becker 2002). Asystole stays (Q3).
// Every draw uses the engine's `outcome` stream and is taken only when a hazard is non-zero or an arrest is declared,
// so runs without them keep every stream untouched.
import type { RhythmId, RhythmOpts } from '../../types.ts';
import { NO_BEAT_RHYTHMS } from './coronary.ts';
import { P_ASYSTOLE_ONSET, P_VF_ONSET } from './hypoxic-arrest.ts';
import type { CircModelState } from './model.ts';

/** Contractility (flow share) at which the ischaemic heart no longer ejects: ≤ 10 % of rest — FU-3's HYP_ARREST analogue [ENG]. */
export const K_ISCH_ARREST = 0.1;
/**
 * No flow: a continuous MAP below this for NO_FLOW_S declares the arrest whatever the myocardial state says — the
 * diastolic pressure is then below the coronary zero-flow pressure P_ZF 15 (coronary.ts) [ENG: P_ZF + 10].
 */
export const MAP_NO_FLOW = 25;
export const NO_FLOW_S = 60;
/** Myocardial state kIsch·(1 − hyp) a resuscitated heart needs before an organised rhythm regains a pulse [ENG]. */
export const M_ROSC = 0.4;
/** Paradis 1990 (JAMA 263:1106): no ROSC below a CPR coronary perfusion pressure of 15 mmHg [P]. */
export const CPP_ROSC = 15;
/** How long the ROSC conditions must hold [ENG]. */
export const ROSC_HOLD_S = 60;
/** Hyperkalaemic arrest hazard above this membrane-effective K, per mmol/L above it: 1/K_HAZARD_S per second [ENG; Q5]. */
export const K_HAZARD = 8.5;
export const K_HAZARD_S = 120;
/** Hypothermic VF hazard below this core temperature, per °C below it: 1/T_HAZARD_S per second (ERC 2021: VF risk < 28 °C) [ENG]. */
export const T_HAZARD = 28;
export const T_HAZARD_S = 600;
/** VF share multipliers at an arrest's onset: per unit catecholamine inotropy, per mmol/L K above 6, per °C below 32 [ENG]. */
export const VF_CAT = 2;
export const VF_K = 0.5;
export const VF_T = 0.25;
export const VF_MAX = 0.6;

export interface ArrestRisk {
  kEcg: number;
  tempC: number;
  cat: number; // catecholamine inotropy above 1 (endogenous surge × drugs)
}
export type ArrestRequest = { id: RhythmId; opts: RhythmOpts; cause: string };

export function riskOf(m: CircModelState): ArrestRisk {
  const x = m.ext;
  return { kEcg: x.kEcg ?? 4.2, tempC: x.tempC ?? 37, cat: Math.max(0, (x.endoEesF ?? 1) - 1) + Math.max(0, (x.drug?.ees ?? 1) - 1) };
}

export function vfShare(r: ArrestRisk): number {
  return Math.min(VF_MAX, P_VF_ONSET * (1 + VF_CAT * r.cat + VF_K * Math.max(0, r.kEcg - 6) + VF_T * Math.max(0, 32 - r.tempC)));
}

/** The onset rhythm: VF (share by risk), asystole (FU-3's 2/30), else the organised rhythm continues pulseless (PEA). */
export function onsetRhythm(x: number, from: string, rate: number, pVf: number, cause: string): ArrestRequest {
  if (x < pVf) return { id: 'vfCoarse', opts: {}, cause };
  if (x < pVf + P_ASYSTOLE_ONSET) return { id: 'asystole', opts: {}, cause };
  return { id: from as RhythmId, opts: { pulseless: true, rateBpm: Math.round(Math.max(20, rate)) }, cause };
}

/** One step of dt seconds (1 Hz): an arrest to declare, or null. `u` draws one uniform from the outcome stream. */
export function arrestStep(m: CircModelState, rhythmId: string, pulseless: boolean, hrNow: number, u: () => number, dt: number): ArrestRequest | null {
  if (pulseless || NO_BEAT_RHYTHMS.has(rhythmId)) {
    m.noFlowS = 0;
    return null;
  }
  const r = riskOf(m);
  m.noFlowS = m.mapNow < MAP_NO_FLOW ? m.noFlowS + dt : 0;
  if (Math.min(m.cor.kIsch, m.cor.kIschRv) <= K_ISCH_ARREST || m.noFlowS >= NO_FLOW_S) return onsetRhythm(u(), rhythmId, hrNow, vfShare(r), 'lowFlow');
  const lamK = Math.max(0, r.kEcg - K_HAZARD) / K_HAZARD_S;
  const lamT = Math.max(0, T_HAZARD - r.tempC) / T_HAZARD_S;
  const lam = (lamK + lamT) * dt;
  if (lam <= 0) return null;
  if (u() >= lam) return null;
  if (u() * (lamK + lamT) < lamK) return { id: u() < 0.5 ? 'vfCoarse' : 'asystole', opts: {}, cause: 'hyperkalaemia' };
  return { id: 'vfCoarse', opts: {}, cause: 'hypothermia' };
}

/** ROSC of an engine-declared organised arrest (PEA): the rhythm it came from, with a pulse, or null. */
export function roscStep(m: CircModelState, rhythmId: string, pulseless: boolean, cpp: number, dt: number): { id: RhythmId; opts: RhythmOpts } | null {
  const a = m.arrest;
  if (!a) return null;
  if (!pulseless && !NO_BEAT_RHYTHMS.has(rhythmId)) {
    m.arrest = null; // a pulse returned another way (shock, instructor)
    return null;
  }
  if (NO_BEAT_RHYTHMS.has(rhythmId)) return null; // VF needs a shock; asystole stays (Q3)
  const ok = cpp >= CPP_ROSC && m.cor.kIsch * (1 - m.cor.hyp) >= M_ROSC;
  a.roscS = ok ? a.roscS + dt : 0;
  if (a.roscS < ROSC_HOLD_S) return null;
  m.arrest = null;
  return { id: rhythmId as RhythmId, opts: {} };
}
```

- [x] **Step 3: 7a state, types and the pre-arrest bradycardia.**

#### Modify `packages/engine-core/src/l2/circ/model.ts`

Edit 1 — find:

```ts
/** FU-4 G4: the continuous MAP's averaging time constant (7d, 7e and the arrest's no-flow rule read it) [ENG]. */
export const MAP_NOW_TAU_S = 2;
```

replace with:

```ts
/** FU-4 G4: the continuous MAP's averaging time constant (7d, 7e and the arrest's no-flow rule read it) [ENG]. */
export const MAP_NOW_TAU_S = 2;
/** FU-4 G1/G7: the ischaemic SA node slows once the LV flow share falls below K_BRADY (pre-arrest, "terminal" bradycardia
 * of decompensating shock) by G_SA_ISCH per unit of kIsch below it [ENG: HR at the arrest ≤ 60 % of its shock peak]. */
export const K_BRADY = 0.5;
export const G_SA_ISCH = 1.2;
/** FU-4 G3: sinus-rate depression per mmol/L of the membrane-effective K above 7 (hyperkalaemic sinus bradycardia) [ENG]. */
export const G_SA_K = 0.12;
```

Edit 2 — find:

```ts
  /** FU-4 G4: mean radial pressure, low-passed (τ 2 s) at the 10 Hz control step in both modes — beats or none. */
  mapNow: number;
```

replace with:

```ts
  /** FU-4 G4: mean radial pressure, low-passed (τ 2 s) at the 10 Hz control step in both modes — beats or none. */
  mapNow: number;
  /** FU-4 G1: the arrest this model declared (cause, time, the organised rhythm it came from), null while beating. */
  arrest: { cause: string; t: number; from: string; roscS: number } | null;
  noFlowS: number; // FU-4 G1: seconds the continuous MAP has been below arrest.ts MAP_NO_FLOW
```

Edit 3 — find:

```ts
    kChem?: number; // 7c: blood-chemistry contractility multiplier (K, Ca, pH) on all four chambers, default 1
```

replace with:

```ts
    kChem?: number; // 7c: blood-chemistry contractility multiplier (K, Ca, pH) on all four chambers, default 1
    kEcg?: number; // FU-4 G3 (7c): the membrane-effective K (calcium-stabilised), mmol/L — sinus node and the arrest hazard
    tempC?: number; // FU-4 G12 (engine, from Stage 3/7e): core temperature for the hypothermic VF hazard
```

Edit 4 — find:

```ts
cppAcc: { sum: 0, n: 0 }, mapNow: st.ref.map, chemo: { sao2: 0.97, paco2: 40 },
```

replace with:

```ts
cppAcc: { sum: 0, n: 0 }, mapNow: st.ref.map, arrest: null, noFlowS: 0, chemo: { sao2: 0.97, paco2: 40 },
```

Edit 5 — find:

```ts
  const hypF = env.modeled ? Math.max(0.05, 1 - G_SA * m.cor.hyp) : 1; // FU-3 item 16: hypoxic SA-node depression
```

replace with:

```ts
  const kSa = Math.max(0, K_BRADY - m.ext.kIsch) * G_SA_ISCH + Math.max(0, (x.kEcg ?? 4) - 7) * G_SA_K; // FU-4 G1/G3
  const hypF = env.modeled ? Math.max(0.05, 1 - G_SA * m.cor.hyp - kSa) : 1; // FU-3 item 16: hypoxic SA-node depression (FU-4: + ischaemic, K)
```

- [x] **Step 4: The pipeline runs it in both modes.**

#### Modify `packages/engine-core/src/l2/hemo/pipeline.ts`

Edit 1 — find:

```ts
import { hypoxicArrestRequest } from '../circ/hypoxic-arrest.ts'; // FU-3 item 16
```

replace with:

```ts
import { hypoxicArrestRequest } from '../circ/hypoxic-arrest.ts'; // FU-3 item 16
import { arrestStep, roscStep } from '../circ/arrest.ts'; // FU-4 G1
```

Edit 2 — find:

```ts
  if (ctx.l1.mode === 'modeled' && ctx.requestRhythm) {
    const req = hypoxicArrestRequest(c, ctx.rhythm.id, pulseless, rampValue(ctx.hr, t), () => uniform(ctx.rng.outcome)); // FU-3 item 16
    if (req) ctx.requestRhythm(req.id, req.opts);
  }
```

replace with:

```ts
  if (ctx.requestRhythm) {
    // FU-4 G1 (D5, D6): FU-3's hypoxic declaration first (MODELED), then the low-flow / no-flow / hazard declaration
    // (both modes); an engine-declared PEA regains its pulse through roscStep. One requestRhythm path (E-FU3-8).
    const u = () => uniform(ctx.rng.outcome);
    const hrNow = rampValue(ctx.hr, t);
    const hx = ctx.l1.mode === 'modeled' ? hypoxicArrestRequest(c, ctx.rhythm.id, pulseless, hrNow, u) : null; // FU-3 item 16
    const req = hx ? { ...hx, cause: 'hypoxia' } : arrestStep(c, ctx.rhythm.id, pulseless, hrNow, u, 1);
    if (req) {
      c.arrest = { cause: req.cause, t, from: ctx.rhythm.id, roscS: 0 };
      ctx.requestRhythm(req.id, req.opts);
    } else {
      const back = roscStep(c, ctx.rhythm.id, pulseless, cppCont, 1);
      if (back) ctx.requestRhythm(back.id, back.opts);
    }
  }
```

(FU-3's "MANUAL never calls it" in `hypoxic-arrest.ts`'s header stays true for the hypoxic path; the MANUAL route
added here is the no-flow rule. In MANUAL the engine-initiated rhythm reaches the controllers as FU-2 made 7g's do.)

- [x] **Step 5: SLOW entry.**

#### Modify `packages/engine-core/vite.config.ts`

Edit 1 — find:

```ts
  'test/engine/circ-hypoxic-arrest.test.ts', // FU-3 item 16: four 15–20 sim-min asphyxia runs
```

replace with:

```ts
  'test/engine/circ-hypoxic-arrest.test.ts', // FU-3 item 16: four 15–20 sim-min asphyxia runs
  'test/engine/circ-lowflow-arrest.test.ts', // FU-4 G1: four 25–30 sim-min haemorrhage/ROSC runs
```

- [x] **Step 6: Flip FU-3's pre-declared test** (its band is met now that the bleed-free reoxygenated heart is not
  held at the R23 floor: measured final HR 74.4).

#### Modify `packages/engine-core/test/engine/circ-hypoxic-arrest.test.ts`

Edit 1 — find:

```ts
  // R45 (executor, FU-3 Task 15, after merging Stage 7e): the [ENG] "no runaway rebound" bound was met before 7e
  // (final HR 126) and is missed on main + 7e (final HR 132.1: 7e's endocrine stress response to the asphyxia adds to
  // the sinus rate after the reoxygenation). The criterion is unchanged; it is kept apart so the reversal time, the
  // no-arrest and the HR ≥ 60 assertions above stay enforced (the R-5 reasoning).
  it.fails('after the FiO2 1 reversal the final HR is ≤ 130 [ENG] — measured 132.1 on main + 7e (126 before 7e)', async () => {
```

replace with:

```ts
  // R45 (executor, FU-3 Task 15, after merging Stage 7e): the [ENG] "no runaway rebound" bound was met before 7e
  // (final HR 126) and missed on main + 7e (132.1). FU-4 (Tasks 4–6): met again — 74.4. The criterion is unchanged;
  // it is kept apart so the reversal time, the no-arrest and the HR ≥ 60 assertions above stay enforced (R-5).
  it('after the FiO2 1 reversal the final HR is ≤ 130 [ENG] — was 132.1 on main + 7e, 74.4 with FU-4', async () => {
```

- [x] **Step 7: Run** the unit test, the engine file (≈ 3 min), FU-3's file, the defibrillator/CPR/VF siblings:

```bash
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ test/engine/circ-lowflow-arrest.test.ts test/engine/circ-hypoxic-arrest.test.ts test/engine/defib-engine.test.ts test/engine/hemo-vf.test.ts test/engine/circ-arrest.test.ts test/engine/cpr-etco2.test.ts test/engine/device-determinism.test.ts test/l2/ecg/s5/library.test.ts
```

Expected: green. The engine file logs the four courses (prototype: control 0 pulseless s; MODELED arrest 695 s,
MAP < 30 at 645 s, HR 91 of peak 184; MANUAL arrest 640 s, MAP < 25 at 575–600 s; ROSC 90 s after the first
compression, CPR CPP 42–53).

- [x] **Step 8: Audit** — `npx -y pnpm@9.15.9 run audit:physiology` (all, ≈ 7 min) and compare its arrest table with
  "Prototype results"; a row that differs by more than 60 s or changes its onset rhythm is reported, not tuned.

- [x] **Step 9: Commit and push.**

```bash
git add packages/engine-core/src/l2/circ/{arrest,model}.ts packages/engine-core/src/l2/hemo/pipeline.ts packages/engine-core/vite.config.ts packages/engine-core/test/l2/circ/arrest.test.ts packages/engine-core/test/engine/circ-lowflow-arrest.test.ts packages/engine-core/test/engine/circ-hypoxic-arrest.test.ts
git commit -m "feat(circ): the emergent arrest state machine — low flow, no flow (MANUAL), hazards, onset draw, pre-arrest bradycardia, ROSC (FU-4 G1, G9)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```


### Task 7: G3 — hyperkalaemia acts: absolute K on the ECG, contractility, the sinus node, the arrest hazard (7c, E-FU4-1; PROTOTYPED)

**Files:**
- Modify (7c, **E-FU4-1**): `packages/engine-core/src/l2/blood/circ-adapter.ts` (`chemistryContractility(ph, iCa,
  kEcg)` + two constants), `packages/engine-core/src/l2/blood/pipeline.ts` (the `kChem` call, the `ext.kEcg` write,
  `bloodEcgTargets` on absolute K)
- Create: `packages/engine-core/test/engine/blood-k-rhythm.test.ts` (runs of 2–20 sim-min → SLOW; `SLOW_B` after Task 20)
- Modify: `packages/engine-core/vite.config.ts` (one SLOW entry)

**Interfaces:** `chemistryContractility(ph, iCa, kEcg = 4.2)`; exports `K_CONTRACT`, `K_CONTRACT_SLOPE`; 7c writes
`hemo.circ.ext.kEcg` every blood step when the circuit exists. Task 6 already reads it (sinus node, hazard, VF share).

**Why (audit G3; G1–G3b):** K 9.8 after succinylcholine in burns left HR 74, MAP 95 and sinus rhythm; `circ-adapter.ts:61`
has no K term; `pipeline.ts:210` pushes K − the PROFILE's K, so a K 8.5 patient draws a normal ECG (`mods.k` 4.2).
Mechanism and thresholds: D7 (Q5).

**Prototype (seed 7):** K 8.5 profile: `mods.k` 4.2 → **8.5**, HR 73 → **64**, kLv 0.92 · K 9.5 profile: VF at **65 s**
(hazard), asystole by 15 min · burns + sux 1.5 mg/kg at 300 s: K peak 10.7, VF at **525 s** (225 s after the dose),
asystole by 1 200 s · CaCl2 1 g at 240 s then sux: **no arrest** in 15 min (kEcg held below 8.5 by `caMem`) · the
Stage 5 electrolyte morphology tests (`setModifiers k`) and 7c's K tests unchanged.

- [x] **Step 1: Write the failing test.**

#### Create `packages/engine-core/test/engine/blood-k-rhythm.test.ts`

```ts
// FU-4 G3 (Task 7): hyperkalaemia acts on the ECG from the ABSOLUTE K, on the sinus node and contractility, and ends in
// VF/asystole; calcium stabilises the membrane (7c's caMem) and prevents it. Bands (R45 targets, D7, Q5):
//   a K 8.5 profile draws its ECG: Modifiers.k within 0.3 of 8.5 (the Stage 5.1 sine-wave threshold), HR ≤ 90 % of the
//     K 4.2 control;
//   a K 9.5 profile arrests (VF or asystole) within 5 min;
//   burns + succinylcholine 1.5 mg/kg: VF/asystole within 5 min of the dose (Miller, neuromuscular blockers; audit S11);
//   CaCl2 1 g 60 s before the same dose: no arrest in 15 min.
// Engine runs of 5–20 sim-min, one yield per sim-minute: SLOW_B (Task 19).
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type PatientProfile } from '../../src/index.ts';

let n = 0;
const ev = (event: Record<string, unknown>, atS: number) => ({ id: `kr${++n}`, issuedBy: 'test', type: 'applyEvent', event, atTick: Math.round(atS * 50) }) as unknown as Command;
type St = { rhythm: { id: string; opts: { pulseless?: boolean } }; mods: { k: number }; hemo: { circ: { arrest: { cause: string } | null } } };
const stOf = (e: ReturnType<typeof createEngine>) => (e as unknown as { st: St }).st;

async function course(blood: PatientProfile['blood'], script: [number, Record<string, unknown>][], endS: number) {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, ...(blood ? { blood } : {}) } });
  let hr = 75;
  e.on((x) => { if (x.type === 'measurement' && x.values.hr?.value != null) hr = x.values.hr.value; }, ['measurement']);
  e.dispatch(ev({ kind: 'airwayDevice', device: 'ett' }, 0));
  e.dispatch(ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 }, 0));
  for (const [t, x] of script) e.dispatch(ev(x, t));
  let tArrest: number | undefined;
  let cause: string | undefined;
  let hr120 = NaN;
  let k120 = NaN;
  for (let t = 1; t <= endS; t++) {
    e.advanceTo(t);
    const s = stOf(e);
    if (t === 120) { hr120 = hr; k120 = s.mods.k; }
    if (tArrest === undefined && (s.rhythm.opts.pulseless === true || ['vfCoarse', 'vfFine', 'asystole'].includes(s.rhythm.id))) {
      tArrest = t;
      cause = s.hemo.circ.arrest?.cause;
    }
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  return { tArrest, cause, hr120, k120 };
}

describe('FU-4 G3: hyperkalaemia on the ECG, the pump and the rhythm', () => {
  it('K 8.5 profile: the ECG draws K 8.5 (absolute), the sinus rate slows', async () => {
    const ctl = await course(undefined, [], 130);
    const k = await course({ k: 8.5 }, [], 130);
    console.log(`K 8.5: mods.k ${k.k120.toFixed(2)} HR ${k.hr120} vs ${ctl.hr120}`);
    expect(Math.abs(k.k120 - 8.5)).toBeLessThanOrEqual(0.3);
    expect(k.hr120).toBeLessThanOrEqual(0.9 * ctl.hr120);
  }, 120_000);
  it('K 9.5 profile: VF or asystole within 5 min', async () => {
    const r = await course({ k: 9.5 }, [], 300);
    console.log(`K 9.5: arrest ${r.tArrest} s (${r.cause})`);
    expect(r.tArrest).toBeLessThanOrEqual(300);
    expect(r.cause).toBe('hyperkalaemia');
  }, 120_000);
  it('burns + succinylcholine 1.5 mg/kg: arrest within 5 min of the dose; CaCl2 1 g first prevents it for 15 min', async () => {
    const sux = { kind: 'drug', drugId: 'succinylcholine', dose: 1.5, unit: 'mg/kg', route: 'iv' };
    const a = await course({ burns: 1 }, [[300, sux]], 900);
    const b = await course({ burns: 1 }, [[240, { kind: 'drug', drugId: 'calciumChloride', dose: 1, unit: 'g', route: 'iv' }], [300, sux]], 1200);
    console.log(`burns + sux: arrest ${a.tArrest} s (${a.cause}); with CaCl2: ${b.tArrest ?? 'none'}`);
    expect((a.tArrest as number) - 300).toBeLessThanOrEqual(300);
    expect(b.tArrest).toBeUndefined();
  }, 300_000);
});
```

- [x] **Step 2: 7c.**

#### Modify `packages/engine-core/src/l2/blood/circ-adapter.ts`

Edit 1 — find:

```ts
export function chemistryContractility(ph: number, iCa: number): number {
  const acid = ph < 7.2 ? Math.max(0.3, 1 - 1.5 * (7.2 - ph)) : 1;
  return acid * Math.min(1, (iCa / 1.1) ** 1.5);
}
```

replace with:

```ts
export function chemistryContractility(ph: number, iCa: number, kEcg = 4.2): number {
  const acid = ph < 7.2 ? Math.max(0.3, 1 - 1.5 * (7.2 - ph)) : 1;
  const kF = kEcg > K_CONTRACT ? Math.max(0.3, 1 - K_CONTRACT_SLOPE * (kEcg - K_CONTRACT)) : 1; // FU-4 G3
  return acid * Math.min(1, (iCa / 1.1) ** 1.5) * kF;
}
/** FU-4 G3: severe hyperkalaemia depresses contractility above K_CONTRACT (membrane-effective), −20 %/mmol/L [ENG, Q5]. */
export const K_CONTRACT = 8;
export const K_CONTRACT_SLOPE = 0.2;
```

#### Modify `packages/engine-core/src/l2/blood/pipeline.ts`

Edit 1 — find:

```ts
    const kChem = chemistryContractility(c.ab.ph, c.out.iCa);
    if (circ) {
      pushCircVolume(circ, bloodMl(c.fl) - bv0, BLOOD_DT_S);
      bs.circNetMl += bloodMl(c.fl) - bv0;
      setCircChemistry(circ, kChem);
```

replace with:

```ts
    const kChem = chemistryContractility(c.ab.ph, c.out.iCa, c.out.kEcg); // FU-4 G3: + K
    if (circ) {
      pushCircVolume(circ, bloodMl(c.fl) - bv0, BLOOD_DT_S);
      bs.circNetMl += bloodMl(c.fl) - bv0;
      setCircChemistry(circ, kChem);
      circ.ext.kEcg = c.out.kEcg; // FU-4 G3: the membrane-effective K for the sinus node and the arrest hazard (7a arrest.ts)
```

Edit 2 — find:

```ts
  return { k: bs.core.out.kEcg - bs.core.so.set.k, qtc: qtcDeltaCa(bs.core.out.iCa) };
```

replace with:

```ts
  return { k: bs.core.out.kEcg - NORMAL.k, qtc: qtcDeltaCa(bs.core.out.iCa) }; // FU-4 G3: absolute K (NORMAL.k = the Modifiers default 4.2) — a hyperkalaemic profile draws its ECG
```

#### Modify `packages/engine-core/vite.config.ts`

Edit 1 — find:

```ts
  'test/engine/circ-lowflow-arrest.test.ts', // FU-4 G1: four 25–30 sim-min haemorrhage/ROSC runs
```

replace with:

```ts
  'test/engine/circ-lowflow-arrest.test.ts', // FU-4 G1: four 25–30 sim-min haemorrhage/ROSC runs
  'test/engine/blood-k-rhythm.test.ts', // FU-4 G3: hyperkalaemia runs of 2–20 sim-min
```

- [x] **Step 3: Run** the new test and 7c's/Stage 5's K siblings:

```bash
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/blood-k-rhythm.test.ts test/engine/blood-hyperk.test.ts test/engine/blood-ecg.test.ts test/l2/blood test/l2/ecg
```

Expected: green (prototype numbers above). `blood-ecg.test.ts` pins deltas from a NORMAL-K profile — unchanged.

- [x] **Step 4: Commit and push.**

```bash
git add packages/engine-core/src/l2/blood/{circ-adapter,pipeline}.ts packages/engine-core/vite.config.ts packages/engine-core/test/engine/blood-k-rhythm.test.ts
git commit -m "feat(blood,circ): hyperkalaemia acts — absolute K on the ECG, contractility, the sinus node and a VF/asystole hazard; calcium prevents it (FU-4 G3)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```


### Task 8: G8 — terminal systemic states end in an arrest; MH's hyperthermic hazard; the sepsis rows that are now in band (7a; hazard UNPROTOTYPED, flips measured)

**Files:**
- Modify (7a): `packages/engine-core/src/l2/circ/arrest.ts` (the hyperthermia term of the hazard)
- Modify (7e tests, pre-declared flips — E-FU4-9: title/flip edits of another stage's `it.fails`, criteria untouched):
  `packages/engine-core/test/engine/endo-circ-acceptance.test.ts`
- Tests for the terminal states themselves are the scenario suite's S10 (anaphylaxis) and S16 (MH) in Task 20.

**Why (audit G8; F0–F4):** septic shock, grade IV anaphylaxis (MAP 25 for 24 min) and untreated MH (43.1 °C, pH 6.62,
K 7.4, MAP 110) never arrested. Sepsis and anaphylaxis now arrest through D5 with no new trigger (prototype: anaphylaxis
1 → PEA at 300 s; septic shock warm + propofol 2 mg/kg → PEA at +180 s; septic shock alone: no arrest in 40 min, MAP
56–66). MH needs one more term: hyperthermia above 42 °C makes the myocardium arrhythmic (VF) [TXT: Miller, MH chapter
— untreated fulminant MH dies of hyperkalaemic/hyperthermic VF; ENG size, Q6].

**Measured (Tasks 2–7 in):** 7e's MODELED sepsis rig (`endo-circ-acceptance`): warm MAP 61 → **56**, HR 131 → **118**,
CO 5.0 → 4.9, SVR 861 → 792; cold SVR 1507 → **1444**, CO 3.8. Three `it.fails` meet their bands (warm HR 115–130,
warm MAP 55–60, cold SVR 1200–1500); warm CO 7–9 and warm SVR 500–700 stay `it.fails` (the vasoplegia-with-high-output
mechanism is Q-7e-7's, calibration pass). The cause is the combination (G2 does not act — no anaesthetic; G11's
lower PaCO2 removes the hypercapnic pressor term; G1's demand shares) — recorded, not tuned.

- [x] **Step 1: The hyperthermic hazard (UNPROTOTYPED — measure S16 after it; if MH does not arrest before 43 °C /
  pH 6.6 within the S16 window, S16 becomes `it.fails` with the numbers).**

#### Modify `packages/engine-core/src/l2/circ/arrest.ts`

Edit 1 — find:

```ts
export const T_HAZARD = 28;
export const T_HAZARD_S = 600;
```

replace with:

```ts
export const T_HAZARD = 28;
export const T_HAZARD_S = 600;
/** FU-4 G8: hyperthermic VF hazard above this core temperature, per °C above it: 1/T_HOT_S per second (untreated MH:
 * VF with hyperkalaemia and hyperthermia — Miller, MH chapter [TXT]) [ENG; Q6]. */
export const T_HOT = 42;
export const T_HOT_S = 300;
```

Edit 2 — find:

```ts
  const lamT = Math.max(0, T_HAZARD - r.tempC) / T_HAZARD_S;
```

replace with:

```ts
  const lamT = Math.max(0, T_HAZARD - r.tempC) / T_HAZARD_S + Math.max(0, r.tempC - T_HOT) / T_HOT_S; // FU-4 G12 cold, G8 hot
```

Edit 3 — find:

```ts
  return { id: 'vfCoarse', opts: {}, cause: 'hypothermia' };
```

replace with:

```ts
  return { id: 'vfCoarse', opts: {}, cause: r.tempC > T_HOT ? 'hyperthermia' : 'hypothermia' };
```

- [x] **Step 2: Flip the three sepsis rows that are now in band; re-title the two that stay.**

#### Modify `packages/engine-core/test/engine/endo-circ-acceptance.test.ts`

Edit 1 — find:

```ts
  it.fails('warm HR 115–130 (measured 131; Q-7e-7)', () => {
```

replace with:

```ts
  it('warm HR 115–130 — was 131 before FU-4, 118 with it (Q-7e-7)', () => {
```

Edit 2 — find:

```ts
  it.fails('warm MAP 55–60 (measured 61; Q-7e-7)', () => {
```

replace with:

```ts
  it('warm MAP 55–60 — was 61 before FU-4, 56 with it (Q-7e-7)', () => {
```

Edit 3 — find:

```ts
  it.fails('warm CO 7–9 L/min (measured 5.0; Q-7e-7)', () => {
```

replace with:

```ts
  it.fails('warm CO 7–9 L/min (measured 5.0; 4.9 with FU-4; Q-7e-7)', () => {
```

Edit 4 — find:

```ts
  it.fails('warm SVR 500–700 dyn·s/cm⁵ (measured 861; Q-7e-7)', () => {
```

replace with:

```ts
  it.fails('warm SVR 500–700 dyn·s/cm⁵ (measured 861; 792 with FU-4; Q-7e-7)', () => {
```

Edit 5 — find:

```ts
  it.fails('cold SVR 1200–1500 dyn·s/cm⁵ (measured 1507; Q-7e-7)', () => {
```

replace with:

```ts
  it('cold SVR 1200–1500 dyn·s/cm⁵ — was 1507 before FU-4, 1444 with it (Q-7e-7)', () => {
```

- [x] **Step 3: Run** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/arrest.test.ts
  test/engine/endo-circ-acceptance.test.ts test/engine/endo-acceptance.test.ts` (≈ 3 min): green; the log line reads
  "sepsis warm: MAP 56 HR 118 CO 4.9 SVR 792; cold: MAP 75 HR 74 CO 3.8 SVR 1444" (± 1). If a flipped row misses by
  the executor's run, restore its `it.fails` with the new number (R45) and report.
- [x] **Step 4: Commit and push.**

```bash
git add packages/engine-core/src/l2/circ/arrest.ts packages/engine-core/test/engine/endo-circ-acceptance.test.ts
git commit -m "feat(circ): hyperthermic VF hazard for untreated MH; three septic-shock rows now in band (FU-4 G8)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```


### Task 9: G6 (a) — tamponade as a pericardial volume that accumulates and drains (7a; UNPROTOTYPED)

**Files:**
- Modify (7a): `packages/engine-core/src/l2/circ/conditions.ts` (`TAMPONADE_MAX_ML`; the tamponade case takes an optional
  `volumeMl` and `rateMlPerMin`), `packages/engine-core/src/l2/circ/model.ts` (`ext.vFluidRate`; the 10 Hz
  accumulation), `packages/engine-core/src/l2/hemo/pipeline.ts` (validation of the two fields; the apply passes them),
  `packages/engine-core/src/types-circ.ts` (the event's two optional fields)
- Create: `packages/engine-core/test/l2/circ/tamponade-dynamics.test.ts`

**Why (audit G6(c)):** `conditions.ts:21` sets a static `vFluid = 250 mL × severity`; there is no accumulation (the
post-cardiotomy or traumatic bleed into the pericardium) and no drain (pericardiocentesis, where removing 50 mL from a
tight pericardium restores much of the output — the steep pericardial pressure–volume curve; Spodick DH, NEJM
2003;349:684–690 [P]). Mechanism: the pericardial fluid volume is a state; `condition tamponade { severity, volumeMl?,
rateMlPerMin? }` — `volumeMl` (0–500) replaces 250·severity, `rateMlPerMin` (−200…200; negative = drainage) integrates
at the 10 Hz control step, bounded 0–`TAMPONADE_MAX_ML` 500 [ENG: beyond the acute 150–250 mL of Q29 the pericardium's
own reserve is gone; the arrest machinery ends the course before the bound]. Severity-only commands keep today's
numbers exactly.

**Targets (R45, UNPROTOTYPED):** accumulation 20 mL/min from 0: compensated tachycardia, then decompensation and PEA
before 500 mL (emergent through Tasks 4–6; record the volume at the arrest); from a decompensated 360 mL tamponade (MAP 47 in the unit rig; 300 mL still compensates at 81),
draining 50 mL raises MAP by ≥ 15 mmHg within 1 min (Spodick 2003: small drainage, large effect). Missed → `it.fails`
with the numbers.

- [x] **Step 1: Write the test** (unit rig on the circulation; `advance()` steps the model at 2 ms like the Stage 2
  pipeline does; the MODELED environment of `RESTING_ENV` keeps the reflexes on).

#### Create `packages/engine-core/test/l2/circ/tamponade-dynamics.test.ts`

```ts
// FU-4 G6 (Task 9): tamponade as a pericardial fluid volume that accumulates and drains. Targets (R45; Spodick 2003):
// severity-only commands unchanged; accumulation raises CVP ≈ PAWP and lowers CO; draining 50 mL from a 360 mL
// tamponade at MAP < 60 raises MAP ≥ 15 mmHg within 1 min.
import { describe, expect, it } from 'vitest';
import { createOut } from '../../../src/l2/circ/circuit.ts';
import { applyCircCondition, TAMPONADE_MAX_ML, TAMPONADE_ML } from '../../../src/l2/circ/conditions.ts';
import { circOnBeat, createCircModel, RESTING_ENV, stepCircModel, type CircModelState } from '../../../src/l2/circ/model.ts';

/** Beat at the model's own requested rate for `s` seconds; returns the mean radial pressure of the last 5 s. */
function advance(m: CircModelState, s: number): number {
  const o = createOut();
  const t1 = m.t + s;
  let next = m.t;
  let sum = 0;
  let n = 0;
  while (m.t < t1 - 1e-9) {
    if (m.t >= next) {
      circOnBeat(m, next, m.hrModel, 'sinus', true);
      next += 60 / m.hrModel;
    }
    stepCircModel(m, Math.min(t1, m.t + 0.02), RESTING_ENV, o);
    if (m.t > t1 - 5) { sum += o.pRad; n++; }
  }
  return sum / Math.max(1, n);
}

describe('FU-4 G6: tamponade dynamics', () => {
  it('severity only: the same static 250 mL × severity as before', () => {
    const m = createCircModel();
    applyCircCondition(m, 'tamponade', 0.8);
    expect(m.ext.vFluid).toBe(TAMPONADE_ML * 0.8);
    expect(m.ext.vFluidRate ?? 0).toBe(0);
  });
  it('accumulates at rateMlPerMin, bounded by TAMPONADE_MAX_ML; a negative rate drains to 0', () => {
    const m = createCircModel();
    applyCircCondition(m, 'tamponade', 0, { rateMlPerMin: 60 });
    advance(m, 60);
    expect(m.ext.vFluid).toBeGreaterThan(55);
    expect(m.ext.vFluid).toBeLessThan(65);
    applyCircCondition(m, 'tamponade', 1, { volumeMl: 490, rateMlPerMin: 60 });
    advance(m, 30);
    expect(m.ext.vFluid).toBe(TAMPONADE_MAX_ML);
    applyCircCondition(m, 'tamponade', 1, { rateMlPerMin: -200 });
    advance(m, 180);
    expect(m.ext.vFluid).toBe(0);
  });
  it('draining 50 mL from a decompensated 360 mL tamponade raises MAP ≥ 15 mmHg within 1 min (Spodick 2003; prototype 47 → 77)', () => {
    const m = createCircModel();
    applyCircCondition(m, 'tamponade', 1, { volumeMl: 360 });
    const before = advance(m, 120);
    applyCircCondition(m, 'tamponade', 1, { volumeMl: 310 });
    const after = advance(m, 60);
    console.log(`tamponade 360 → 310 mL: MAP ${before.toFixed(0)} → ${after.toFixed(0)}`);
    expect(before).toBeLessThan(60);
    expect(after - before).toBeGreaterThanOrEqual(15);
  });
});
```

- [x] **Step 2: The state and its integration.**

#### Modify `packages/engine-core/src/l2/circ/conditions.ts`

Edit 1 — find:

```ts
export const TAMPONADE_ML = 250;
```

replace with:

```ts
export const TAMPONADE_ML = 250;
/** FU-4 G6: the most pericardial fluid the accumulation integrates to [ENG: beyond Q29's acute 150–250 mL]. */
export const TAMPONADE_MAX_ML = 500;
/** FU-4 G6: optional fields of the tamponade condition — an absolute volume and an accumulation (− drainage) rate. */
export interface TamponadeOpts {
  volumeMl?: number;
  rateMlPerMin?: number;
}
```

Edit 2 — find:

```ts
export function applyCircCondition(m: CircModelState, id: CircConditionId, severity: number): void {
  const s = Math.min(1, Math.max(0, severity));
  switch (id) {
    case 'tamponade':
      m.ext.vFluid = TAMPONADE_ML * s;
      return;
```

replace with:

```ts
export function applyCircCondition(m: CircModelState, id: CircConditionId, severity: number, opts: TamponadeOpts = {}): void {
  const s = Math.min(1, Math.max(0, severity));
  switch (id) {
    case 'tamponade':
      // FU-4 G6: an absolute volume (else 250 mL × severity, unchanged) and an optional accumulation/drainage rate
      m.ext.vFluid = opts.volumeMl !== undefined ? Math.min(TAMPONADE_MAX_ML, Math.max(0, opts.volumeMl)) : TAMPONADE_ML * s;
      m.ext.vFluidRate = (opts.rateMlPerMin ?? 0) / 60;
      return;
```

#### Modify `packages/engine-core/src/l2/circ/model.ts`

Edit 1 — find:

```ts
    kLv: number; kRv: number; pvr: number; vFluid: number; pPtx: number; kIsch: number;
```

replace with:

```ts
    kLv: number; kRv: number; pvr: number; vFluid: number; pPtx: number; kIsch: number;
    vFluidRate?: number; // FU-4 G6: pericardial fluid accumulation (+) or drainage (−), mL/s (conditions.ts)
```

Edit 2 — find:

```ts
  p.vFluid = base.vFluid + m.ext.vFluid;
```

replace with:

```ts
  if (m.ext.vFluidRate) m.ext.vFluid = Math.min(TAMPONADE_MAX_ML, Math.max(0, m.ext.vFluid + m.ext.vFluidRate * CTL_DT)); // FU-4 G6
  p.vFluid = base.vFluid + m.ext.vFluid;
```

Edit 3 — find:

```ts
import { createCoronary, G_ISCH, type CoronaryState } from './coronary.ts';
```

replace with:

```ts
import { createCoronary, G_ISCH, type CoronaryState } from './coronary.ts';
import { TAMPONADE_MAX_ML } from './conditions.ts'; // FU-4 G6 (type-only cycle: conditions.ts imports model.ts types only)
```

#### Modify `packages/engine-core/src/l2/hemo/pipeline.ts`

Edit 1 — find:

```ts
      if (ev.kind === 'condition') {
        const c = cmd.event as { id: string; severity: number };
        if (!(CIRC_CONDITIONS as readonly string[]).includes(c.id)) return null;
        return Number.isFinite(c.severity) && c.severity >= 0 && c.severity <= 1 ? undefined : 'severity must be 0–1';
      }
```

replace with:

```ts
      if (ev.kind === 'condition') {
        const c = cmd.event as { id: string; severity: number; volumeMl?: number; rateMlPerMin?: number };
        if (!(CIRC_CONDITIONS as readonly string[]).includes(c.id)) return null;
        if (c.volumeMl !== undefined && !(Number.isFinite(c.volumeMl) && c.volumeMl >= 0 && c.volumeMl <= 500)) return 'volumeMl must be 0–500'; // FU-4 G6
        if (c.rateMlPerMin !== undefined && !(Number.isFinite(c.rateMlPerMin) && c.rateMlPerMin >= -200 && c.rateMlPerMin <= 200)) return 'rateMlPerMin must be −200…200';
        return Number.isFinite(c.severity) && c.severity >= 0 && c.severity <= 1 ? undefined : 'severity must be 0–1';
      }
```

Edit 2 — find:

```ts
        const c = ev as unknown as { id: CircConditionId; severity: number };
        applyCircCondition(hs.circ, c.id, c.severity);
```

replace with:

```ts
        const c = ev as unknown as { id: CircConditionId; severity: number; volumeMl?: number; rateMlPerMin?: number };
        applyCircCondition(hs.circ, c.id, c.severity, { ...(c.volumeMl !== undefined ? { volumeMl: c.volumeMl } : {}), ...(c.rateMlPerMin !== undefined ? { rateMlPerMin: c.rateMlPerMin } : {}) }); // FU-4 G6
```

#### Modify `packages/engine-core/src/types-circ.ts`

Edit 1 — find:

```ts
  | { kind: 'condition'; id: 'tamponade' | 'pe' | 'tensionPtx' | 'rvInfarct'; severity: number };
```

replace with:

```ts
  | { kind: 'condition'; id: 'tamponade' | 'pe' | 'tensionPtx' | 'rvInfarct'; severity: number; volumeMl?: number; rateMlPerMin?: number }; // FU-4 G6: tamponade volume / accumulation
```

- [x] **Step 3: Run** the test and `test/l2/circ`, `test/engine/circ-sanity-2.test.ts` (H7 unchanged). If `model.ts` →
  `conditions.ts` creates an import cycle at runtime (conditions.ts imports `CircModelState` as a TYPE only, so it should
  not), move `TAMPONADE_MAX_ML` into `params.ts` and import it from there in both files.
- [x] **Step 4: Commit and push** (`feat(circ): tamponade accumulates and drains (FU-4 G6)`, trailer as always).

### Task 10: G6 (b) — pulsus paradoxus: measure, then the swing that grows with the breath (7a pleural; UNPROTOTYPED)

**Files:**
- Modify (7a): `packages/engine-core/src/l2/circ/pleural.ts` (the spontaneous swing scales with the breath's size)
- Create: `packages/engine-core/test/engine/circ-pulsus.test.ts` (2 runs of 10 sim-min → SLOW_B)
- Modify: `packages/engine-core/vite.config.ts` (one SLOW entry)

**Why (audit G6(d), B0s):** a spontaneously breathing severe tamponade shows a 3 mmHg beat-to-beat SBP swing (normal 2);
tamponade gives 10–20 mmHg (pulsus paradoxus > 10 mmHg; Spodick 2003 [P]). The circuit already has ventricular
interdependence through the shared pericardium (`circuit.ts`: `ext = pit + ct + peri`, pericardial volume = LV + RV +
fluid). The spontaneous pleural swing is a fixed 4 cmH2O × ΔV/VT (`pleural.ts:21`) whatever the breath's size, so
a larger, dyspnoeic breath never swings more. Step 1 measures which half is short.

- [x] **Step 1: Measure** (a probe, not committed): B0s (`pnpm run audit:physiology B0s`) plus the same run with the
  swing poked to 8 and 12 cmH2O (edit `SPONT_SWING_CMH2O` locally, revert). Record the SBP swing (`dSbp` column), the
  RV and LV end-diastolic volume swing. If 8 cmH2O already gives ≥ 10 mmHg, the interdependence is right and the swing
  is the defect → Step 2. If not, the interdependence is short: stop, record, and leave S3 as `it.fails` (Q2 for Ali).

**Orchestrator ruling (FU-4 review), 2026-09-28 (review F11): the probe's two outcomes now have named destinations, and
S3 is counted.** The review measured the applied tree: tamponade, spontaneous breathing, **SBP swing 3–4 mmHg,
unchanged** — because this task scales the swing by the breath's size and *nothing makes the tamponade patient breathe
bigger* (the respiratory drive does not see low CO, and `l2/neuro/**` is outside FU-4's partition).
- If 8 cmH2O gives ≥ 10 mmHg, the missing piece is the **tamponade patient's inspiratory effort**. Route it to FU-6's
  drive work (its R3) with the measured numbers, or land it here under a **declared exception for one 7f drive input**
  (low CO / lactate → effort). Do not leave it implicit.
- If it does not, the **interdependence is short**, and the named candidate is the inspiratory rise of systemic venous
  return into the RV inside a fixed pericardial volume: the RA and RV must see the pleural swing while the extrathoracic
  veins do not. Record the measurement either way.
- **In both cases S3 joins the suite's `it.fails` list with its number** — the review found S3 missing from the "six
  `it.fails`" count, so the count becomes SEVEN (S1b, S3, S4b, S5, S8, S9, S13) minus whatever Tasks 18a/18c flip
  (S8 and S13 flip, so the landed list is S1b, S3, S4b, S5, S9 until Task 11's step fixes S9).
- [x] **Step 2: The swing scales with the breath** — ΔV over the patient's resting tidal volume (7 mL/kg × effective
  weight, the Stage 3 resting pattern [ENG]) instead of over the breath's own VT, so a resting breath keeps 4 cmH2O and
  a 1.5× breath swings 6.

#### Modify `packages/engine-core/src/l2/circ/pleural.ts`

Edit 1 — find:

```ts
export function pleuralPressureMmHg(d: DriverState, t: number, complianceMl: number): number {
```

replace with:

```ts
/** FU-4 G6 (Task 10): the resting spontaneous tidal volume the 4 cmH2O swing belongs to, mL/kg [ENG, Stage 3's pattern]. */
export const SPONT_VT_REF_ML_KG = 7;
export function pleuralPressureMmHg(d: DriverState, t: number, complianceMl: number, weightKg = 70): number {
```

Edit 2 — find:

```ts
  return P_PL0 - SPONT_SWING_CMH2O * (dv / Math.max(1, c.vt)) * CMH2O_TO_MMHG;
```

replace with:

```ts
  // FU-4 G6: a bigger breath swings more (ΔV over the RESTING tidal volume, not over this breath's own VT)
  return P_PL0 - SPONT_SWING_CMH2O * (dv / Math.max(1, SPONT_VT_REF_ML_KG * weightKg)) * CMH2O_TO_MMHG;
```

(`respPleural` in `l2/resp/pipeline.ts` calls it with three arguments — the 70 kg default reproduces the adult; the
executor passes `rs.pat.effKg` there under **E-FU4-5** if Step 3 shows the child rigs need it.)

#### Modify `packages/engine-core/vite.config.ts`

Edit 1 — find:

```ts
  'test/engine/blood-k-rhythm.test.ts', // FU-4 G3: hyperkalaemia runs of 2–20 sim-min
```

replace with:

```ts
  'test/engine/blood-k-rhythm.test.ts', // FU-4 G3: hyperkalaemia runs of 2–20 sim-min
  'test/engine/circ-pulsus.test.ts', // FU-4 G6: two 10 sim-min spontaneous-breathing runs
```

- [x] **Step 3: The test** — severe tamponade (severity 1), MODELED, spontaneous breathing (no ventilator), 10 min:
  beat-to-beat SBP max − min over each breath ≥ 10 mmHg (pulsus paradoxus, Spodick 2003) in the last 2 min; the
  healthy control < 5 mmHg. Write it as the audit runner's `dSbp` over 6 s windows (`circ-pulsus.test.ts`, one yield per
  sim-minute, SLOW_B). If ≥ 10 is not reached: `it.fails` with the number, S3 likewise, Q2.
- [x] **Step 4: Run** `test/l2/circ`, the new test, `test/engine/resp-*.test.ts`, `test/engine/neuro-spont.test.ts`,
  `test/engine/lung-*.test.ts` (spontaneous breathing shapes the pleural input of every MODELED run); commit and push
  (`feat(circ): the spontaneous pleural swing grows with the breath — pulsus paradoxus in tamponade (FU-4 G6)`).

### Task 11: G6 (c) — one PE event with one PVR source; one tension-pneumothorax pressure source (engine aliases, 7a, 7b data; UNPROTOTYPED)

**Files:**
- Create (7a): `packages/engine-core/src/l2/circ/aliases.ts`
- Modify: `packages/engine-core/src/engine.ts` (**E-FU4-7**: the alias pre-step at the top of `apply()`),
  `packages/engine-core/src/l2/circ/conditions.ts` (`tensionPtx` no longer writes `ext.pPtx`; header),
  `packages/engine-core/data/lung-pathology.ts` (**E-FU4-4**: the `pe` row's `pvr` key removed — 7a's φ mapping is the
  one PVR source)
- Create: `packages/engine-core/test/engine/obstructive-aliases.test.ts`

**Why (audit G6(e), D0/D3/E1/E2; orchestrator note on the V.1 review):** `condition pe` sets only PVR (SpO2 99 %,
EtCO2 36); `lungCondition pe` sets dead space, shunt AND its own PVR (× 3.25 at severity 1, tables' vasoconstriction
0.5); sending both is PVR ≈ × 13–29; the ventilator-link massive-PE profile sends only the lung PE and shows no
obstructive picture. Two tension PTX conditions disagree (7a 20 mmHg on the whole pleura, MAP 55–61; 7b 25 mmHg on
one side with lung collapse, MAP 33). Decision D9: ONE PE event (`condition pe`; `lungCondition pe` is its alias),
ONE PVR source (7a's φ mapping, `PE_VASO` 1.0 — the calibrated H5 rig), ONE tension-PTX pressure source (7b's per-side
`lp.pPtx`, name, place and unit unchanged — V.1 reads it three times).

**Orchestrator ruling (FU-4 review), 2026-09-28 (ruling 2 / review F6): the one-command PE picture is a TASK, not an
open question, and it is a measure-then-mechanism step inside this task.** Q15 is closed. The alias works — applied-tree
D0 and D3 are identical — but one command does not produce a massive PE: at 5 min **SpO2 97 at FiO2 0.5, CVP 10.9,
MAP 80, HR 131**, EtCO2 34 → 17 ✓, and PEA only at 23 min. Massive PE is by definition sustained SBP < 90.
- **Step 1a — measure, before changing anything:** PVR, RVEDV and RVEF, CVP, shunt fraction, SvO2 and the RV flow share
  `kIschRv` at 1, 5 and 10 min of `condition pe 1`. Paste the table into the gate note.
- **Step 1b — add only the mechanism the measurement names:**
  - (a) the hypoxaemia comes from low-V̇/Q̇ units in the NON-embolised lung plus a low SvO2 at low CO. Check whether 7b's
    PE row shunt at severity 1 is sourced (tables §18) and fix the DATA ROW under **E-FU4-4 extended** — never a
    multiplier;
  - (b) RV dilatation raising CVP: the RV EDPVR and interdependence. Check that `kIschRv`'s demand uses RV WALL STRESS
    (RVSP × RVEDV^⅓, as the LV does) rather than RVSP alone — Task 5's spiral takes 23 min, which is the symptom;
  - (c) the hypotension: severity 1 must reach SBP < 90 sustained.
- **The SpO2 band goes to Ali, and is not assumed here:** "SpO2 < 90 at FiO2 0.5" needs a ≈ 30 % shunt and may be
  stricter than the clinic. The plan proposes **"SpO2 ≤ 92 at FiO2 0.5 (≤ 88 on air)"** as a NEW band (not a widened
  existing one — R45) and records it as Ali's question; **CVP ≥ 15 and MAP < 65 stand unchanged**. Until Ali answers, S9
  asserts the CVP, MAP and EtCO2 sides as `it` and the SpO2 side as `it.fails` with the measured number.
- **S9 asserts physiology on TRUTH, not on the display** (review F9): read `resp.o2.sao2` (or `blood.out`), never
  `num.spo2.shown`, because once FU-5 makes SpO2 invalid at low perfusion a `null → −1` would satisfy "SpO2 < 90" and
  the assertion would pass on a monitor dropout. Keep a separate displayed-value column for the screenshots only.

**Targets (R45, UNPROTOTYPED):** `condition pe 1` and `lungCondition pe 1` give identical state (PVR, VD_alv, shunt) and
S9's picture (the bands above, with the SpO2 side per Ali); `condition tensionPtx 1` and
`lungCondition ptxTension 1` (side R) give identical state (pleural 25 mmHg on the right, collapse); circ-sanity-2 H5
(`condition pe 0.75`: mPAP 30–45, CO −10 %) and the lung-circ PE/PTX tests stay green; 8a's sanity document t12 (PE)
is re-run and reported (its EtCO2 row may move — dead space now joins it).

- [x] **Step 1: The alias map.**

#### Create `packages/engine-core/src/l2/circ/aliases.ts`

```ts
// FU-4 G6 (Task 11, D9): one disease, one command. The engine applies an obstructive-shock event to BOTH owners before
// its normal chain: the circulation (7a: PVR by the φ mapping — the one PE PVR source) and the lungs (7b: dead space,
// shunt, resistance; the per-side pleural pressure — the one tension-PTX source, `lp.pPtx`). Whichever spelling the
// scenario, the console or the ventilator link uses, the patient gets the same state.
import type { Command } from '../../types.ts';

export interface AliasPair {
  circ: Command | null; // the Stage 2/7a condition to apply (null: none)
  lung: Command; // the Stage 3/7b lung condition to apply
}

const withEvent = (cmd: Command, event: Record<string, unknown>): Command => ({ ...(cmd as object), event } as unknown as Command);

/** The pair an event expands to, or null when it is not an aliased obstructive-shock event. */
export function obstructiveAlias(cmd: Command): AliasPair | null {
  if (cmd.type !== 'applyEvent') return null;
  const ev = cmd.event as { kind: string; id?: string; severity?: number; side?: 'L' | 'R' };
  const s = ev.severity ?? 1;
  if (ev.kind === 'condition' && ev.id === 'pe') return { circ: cmd, lung: withEvent(cmd, { kind: 'lungCondition', id: 'pe', severity: s }) };
  if (ev.kind === 'lungCondition' && ev.id === 'pe') return { circ: withEvent(cmd, { kind: 'condition', id: 'pe', severity: s }), lung: cmd };
  if (ev.kind === 'condition' && ev.id === 'tensionPtx') return { circ: null, lung: withEvent(cmd, { kind: 'lungCondition', id: 'ptxTension', severity: s, side: ev.side ?? 'R' }) };
  return null;
}
```

- [x] **Step 2: The engine applies both, before the chain (E-FU4-7).** Run `git fetch origin && git merge origin/main`
  first (R51 §7).

#### Modify `packages/engine-core/src/engine.ts`

Edit 1 — find:

```ts
    if (applyPkCommand(ps.pk, cmd, simT)) return; // Stage 7g: consumes every drug/infusion/tci/vaporiser event (R51 §3)
```

replace with:

```ts
    const alias = obstructiveAlias(cmd); // FU-4 G6 (Task 11): one PE event, one tension-PTX source — both owners, before the chain
    if (alias) {
      applyRespCommand(ps.resp, ps.l1, alias.lung, simT);
      this.syncRespBuffers();
      if (alias.circ) {
        applyHemoCommand(ps.hemo, ps.l1, alias.circ, simT, setHr, ps.rng);
        this.syncHemoBuffers();
      }
      return;
    }
    if (applyPkCommand(ps.pk, cmd, simT)) return; // Stage 7g: consumes every drug/infusion/tci/vaporiser event (R51 §3)
```

Edit 2 — find:

```ts
import { createHookState, rhythmRequest, type RhythmHookState } from './l2/pk/hooks.ts'; // Stage 7g
```

replace with:

```ts
import { createHookState, rhythmRequest, type RhythmHookState } from './l2/pk/hooks.ts'; // Stage 7g
import { obstructiveAlias } from './l2/circ/aliases.ts'; // FU-4 G6 (Task 11)
```

(Validation is unchanged: each spelling is validated by its own stage before `apply`; the alias carries the same
severity. The alias pre-step sits after the device layer and before 7g — neither consumes these events.)

- [x] **Step 3: 7a stops writing its own pleural pressure; the catalogue's PE row stops writing PVR.**

#### Modify `packages/engine-core/src/l2/circ/conditions.ts`

Edit 1 — find:

```ts
//   tensionPtx  pPtx = 20 mmHg × severity added to the pleural pressure (one side; 5–25 mmHg, Q28)
```

replace with:

```ts
//   tensionPtx  FU-4 G6: an alias of 7b's lungCondition ptxTension (engine aliases.ts) — the lungs' per-side pPtx is the
//               one pleural source; `ext.pPtx` is no longer written (it stays 0 unless a test pokes it)
```

Edit 2 — find:

```ts
    case 'tensionPtx':
      m.ext.pPtx = PTX_MMHG * s;
      return;
```

replace with:

```ts
    case 'tensionPtx':
      void PTX_MMHG; // FU-4 G6: the engine routes this condition to 7b (aliases.ts); 7a keeps no second pleural source
      return;
```

#### Modify `packages/engine-core/data/lung-pathology.ts`

Edit 1 — find:

```ts
      { key: 'pvr', op: 'mul', v: [[0, 1], [0.33, 1.375], [0.67, 1.808], [1, 3.25]], src: "§18 row 'Obstruction fraction' φ 0.2/0.35/0.6 via main §2.2 PVR×1/(1−φ)×(1+0.5φ) [ENG]; §33: ×3–5 high risk", tag: 'P', q: 'Q27' },
```

replace with:

```ts
      // FU-4 G6 (Task 11, D9): the PE's PVR has ONE source — 7a's φ mapping (circ/conditions.ts, PE_VASO 1.0), applied by the
      // engine alias for either spelling of the PE event; this row keeps the gas-exchange and mechanics keys
```

- [x] **Step 4: The test** (`obstructive-aliases.test.ts`, engine, 3 sim-min runs: fast set): the two PE spellings at
  severity 1 → identical `hemo.circ.ext.pvr`, `resp.lung.lp` dead space/shunt fields (read the state with `e.st`), and
  the tension spellings → identical `resp.lung.lp.pPtx` and `hemo.circ.ext.pPtx` 0; S9's picture after 3 min.
- [x] **Step 5: Run** the new test, `test/l2/circ/conditions.test.ts` (unchanged: it calls `applyCircCondition` directly),
  `test/engine/circ-events.test.ts` (its tensionPtx dispatch is still accepted), `test/engine/lung-*.test.ts`,
  `test/engine/circ-sanity-2.test.ts`, `packages/ventilator` tests (the link profiles), and regenerate the lung data doc
  the way Stage 7b's README says (`docs/…/stage-v-lung-pathology-data.md` is V.1's — do NOT regenerate it here; note it
  in the gate). Commit and push (`feat(engine): one PE event and one tension-pneumothorax source (FU-4 G6)`).

### Task 12: G7 — vagal events and pre-arrest bradycardia (7g PD, 7g hook, 7a; UNPROTOTYPED)

**Files:**
- Modify (7g): `packages/engine-core/src/l2/pk/row.ts` (targets `vagalMs`, `muscarinic`), `packages/engine-core/src/l2/pk/combine.ts`
  (`muscarinic` occupancy; `fx.vagalMs` additive; `fx.muscBlock`), `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts`
  (opioid rows), `packages/engine-core/src/l2/pk/data/rows-cardiovascular.ts` (neostigmine, atropine, glycopyrrolate),
  `packages/engine-core/src/l2/pk/hooks.ts` (the second succinylcholine dose)
- Modify (7a): `packages/engine-core/src/l2/circ/drugs.ts` (`DrugEffect.vagalMs`, `.muscBlock`), `packages/engine-core/src/l2/circ/model.ts`
  (the vagal RR term, atropine's block of the vagal limb, the stimulus vagal event, Bezold–Jarisch)
- Modify (**E-FU4-7**): `packages/engine-core/src/engine.ts` — the `stimulus` event's optional `site` is observed by 7a
  before 7e consumes it; `packages/engine-core/src/l2/endo/pipeline.ts` validation of `site` (7e owns the event; R51
  addendum 12: one shape, one optional field added); `packages/engine-core/src/types-neuro.ts` (`StimulusEvent.site?`)
- Create: `packages/engine-core/test/engine/vagal-events.test.ts` (runs of 5–10 sim-min → SLOW_B)

**Why (audit G7, H1–H3, C4):** fentanyl 10 µg/kg −5/min, remifentanil 3 µg/kg −5/min (a rate-set-point multiplier the
reflex undoes), a second succinylcholine dose nothing, no oculocardiac/peritoneal-traction reflex, and HR pinned at
the age maximum in every shock (the pre-arrest bradycardia is Task 6's). Mechanism D10. Sources: opioid bradycardia is
vagal and atropine-reversible (Miller ch. 22 [TXT]); the second dose of succinylcholine ≈ 5 min after the first causes
sinus bradycardia, junctional rhythm or asystole (Miller, neuromuscular blockers [TXT]); oculocardiac reflex —
bradycardia and asystole on traction, abolished by atropine (Miller, ophthalmic anaesthesia [TXT]); the paradoxical
bradycardia of severe haemorrhage (Barcroft H, Edholm OG 1945; Secher NH et al., Clin Physiol 1984 [P]).

**Targets (R45, UNPROTOTYPED; S15 bands):** remifentanil 1 µg/kg bolus HR −15 to −30 % at 1–3 min, reversed by atropine
0.5 mg; neostigmine 0.05 mg/kg without glycopyrrolate HR −25 to −40 % (today −25 % at 15 min: onset faster); a second
succinylcholine dose at +5 min → junctional escape 40–50/min or a sinus pause for ≈ 60 s, none with atropine first;
oculocardiac stimulus → HR −20 % or a pause while it lasts, none after atropine; class IV haemorrhage HR falls below
100 before the arrest (with Task 6's `K_BRADY`: prototype 91). Every PD number [ENG]; `it.fails` with numbers if missed.

- [x] **Step 1: 7g — the targets and the occupancy.**

#### Modify `packages/engine-core/src/l2/pk/row.ts`

Edit 1 — find:

```ts
  | 'hr' | 'ees' | 'svr' | 'v0Frac' | 'pvr' | 'gv' | 'gvHr' | 'symp' | 'setF' // → 7a DrugEffect (FU-4 G2: symp, setF)
  | 'betaBlock' | 'avNode' | 'bronchodilation'
```

replace with:

```ts
  | 'hr' | 'ees' | 'svr' | 'v0Frac' | 'pvr' | 'gv' | 'gvHr' | 'symp' | 'setF' // → 7a DrugEffect (FU-4 G2: symp, setF)
  | 'vagalMs' | 'muscarinic' // FU-4 G7: vagal RR increment (ms, additive) and muscarinic block (occupancy 0–1)
  | 'betaBlock' | 'avNode' | 'bronchodilation'
```

#### Modify `packages/engine-core/src/l2/pk/combine.ts`

Edit 1 — find:

```ts
export const NEUTRAL_FX: DrugEffect = { hr: 1, ees: 1, svr: 1, v0Frac: 0, pvr: 1, gv: 1, gvHr: 1, symp: 1, setF: 1 };
```

replace with:

```ts
export const NEUTRAL_FX: DrugEffect = { hr: 1, ees: 1, svr: 1, v0Frac: 0, pvr: 1, gv: 1, gvHr: 1, symp: 1, setF: 1, vagalMs: 0, muscBlock: 0 };
```

Edit 2 — find:

```ts
const OCCUPANCY: readonly PdTarget[] = ['betaBlock', 'avNode'];
```

replace with:

```ts
const OCCUPANCY: readonly PdTarget[] = ['betaBlock', 'avNode', 'muscarinic']; // FU-4 G7: muscarinic block (atropine, glycopyrrolate)
```

Edit 3 — find:

```ts
  const occ: Record<string, number> = { betaBlock: 0, avNode: 0 };
```

replace with:

```ts
  const occ: Record<string, number> = { betaBlock: 0, avNode: 0, muscarinic: 0 };
```

Edit 4 — find:

```ts
    } else if (target === 'v0Frac') fx.v0Frac += E;
```

replace with:

```ts
    } else if (target === 'v0Frac') fx.v0Frac += E;
    else if (target === 'vagalMs') fx.vagalMs = (fx.vagalMs ?? 0) + E; // FU-4 G7: additive RR increment (ms)
```

Edit 5 — find:

```ts
  bus.avNodeBlock = occ.avNode as number;
```

replace with:

```ts
  bus.avNodeBlock = occ.avNode as number;
  fx.muscBlock = occ.muscarinic as number; // FU-4 G7
  fx.vagalMs = (fx.vagalMs ?? 0) * (1 - fx.muscBlock); // an anticholinergic blocks every vagal RR increment at the SA node
```

#### Modify `packages/engine-core/src/l2/circ/drugs.ts`

Edit 1 — find:

```ts
  /** FU-4 G2: × on the baroreflex set point (anaesthetic resetting to a lower pressure), 1 = none. */
  setF: number;
}
```

replace with:

```ts
  /** FU-4 G2: × on the baroreflex set point (anaesthetic resetting to a lower pressure), 1 = none. */
  setF: number;
  /** FU-4 G7: vagal RR increment, ms (opioids, anticholinesterases), already × (1 − muscBlock); 0 = none. */
  vagalMs?: number;
  /** FU-4 G7: muscarinic block 0–1 (atropine, glycopyrrolate): removes the vagal limb and every vagal event. */
  muscBlock?: number;
}
```

- [x] **Step 2: The rows** (sizes [ENG], fit targets in S15): fentanyl `{ target: 'vagalMs', emax: 350, ec50: 4, hill: 2 }`,
  remifentanil `ec50: 6`, sufentanil `ec50: 0.5`; neostigmine `{ target: 'vagalMs', emax: 450, ec50: 1 }`; atropine
  `{ target: 'muscarinic', emax: 0.95, ec50: 0.4 }`, glycopyrrolate `{ target: 'muscarinic', emax: 0.9, ec50: 0.5 }` —
  appended to each row's `pd` array (the executor writes the edits against the rows' current text; each row's `pd:` line
  is unique by its drug id).
- [x] **Step 3: 7a applies them; the stimulus vagal event; Bezold–Jarisch.** In `control()` (MODELED only):
  `rr += ((de.vagalMs ?? 0) + vagalEvent(m) + bj(m)) / 1000`, the vagal baroreflex gain × (1 − `muscBlock`), where
  `vagalEvent` is the stimulus-driven increment (`m.vagalStim = { until, ms }`, 600 ms × intensity for oculocardiac and
  peritoneal traction, 300 ms for laryngoscopy [ENG]) × (1 − `muscBlock`), and `bj` = 800 ms × max(0, 0.35 − LVEDV/ref)/0.35
  (the empty-ventricle reflex below 35 % of the resting EDV [ENG]). The engine observes `stimulus` with a `site` before
  7e consumes it (`circVagalStimulus(ps.hemo.circ, site, intensity, simT)`); 7e validates `site ∈ {laryngoscopy,
  oculocardiac, peritoneal}`.
- [x] **Step 4: The second succinylcholine dose** (7g hook): `RhythmHookState.sux = { n, lastT, until, from }`; a
  succinylcholine entry in `pk.bus.doses` within 600 s of the previous one and `muscBlock < 0.5` returns
  `junctionalEscape` at 45/min for 60 s, then the rhythm it came from.
- [x] **Step 5: Tests** (`vagal-events.test.ts`): the S15 bands above; atropine first abolishes each. Run the pk and
  circ siblings (`pk-acceptance-*`, `neuro-*`, `circ-sanity-1` phenylephrine band and class II haemorrhage must stay
  green — the BJ threshold is below class III's EDV). Commit and push (`feat(pk,circ): vagal events — opioids,
  neostigmine, repeat succinylcholine, oculocardiac and peritoneal traction; atropine blocks them (FU-4 G7)`).

#### Modify `packages/engine-core/vite.config.ts`

Edit 1 — find:

```ts
  'test/engine/circ-pulsus.test.ts', // FU-4 G6: two 10 sim-min spontaneous-breathing runs
```

replace with:

```ts
  'test/engine/circ-pulsus.test.ts', // FU-4 G6: two 10 sim-min spontaneous-breathing runs
  'test/engine/vagal-events.test.ts', // FU-4 G7: vagal-event runs of 5–10 sim-min
```

(Steps 2–4's rows, `control()` terms and the hook carry no find blocks: they are written against the tree at execution
time — each anchor named above is unique; every line added is new code.)



### Task 13: G7 (b) — the monitor shows the bradycardia: escape pacemakers are depressed by the hypoxic/ischaemic myocardium; FU-3's monitor-HR criterion with a 1 bpm tolerance (G-FU3 rulings 1 and 3; Stage 5 E-FU4-11; UNPROTOTYPED)

**Files:**
- Modify (Stage 5, **E-FU4-11**: two lines): `packages/engine-core/src/l2/ecg/rhythm-state.ts` (`RhythmCtx.automaticityAt?`),
  `packages/engine-core/src/l2/ecg/rhythm-engine.ts` (`escapeRate` × it)
- Modify (7a): `packages/engine-core/src/l2/circ/model.ts` (`saF`, the sinus-node factor, published for the escape foci)
- Modify (**E-FU4-7**): `packages/engine-core/src/engine.ts` (`rhythmCtx` passes it)
- Modify (FU-3 test — G-FU3 ruling 1): `packages/engine-core/test/engine/circ-hypoxic-arrest.test.ts` (the monitor-HR
  mean criterion with a 1 bpm tolerance; a new monitor-HR bradycardia assertion)
- Modify (test — G-FU3 ruling 3): `packages/engine-core/test/engine/circ-lowflow-arrest.test.ts` (7d's CBF after a PEA)

**Why (G-FU3 ruling 1):** the monitor never reads HR < 40 while the hypoxic sinus state is 30: Stage 5's backup escape
(junctional 40/min, `rhythm-engine.ts` `escapeRate` → `d.backupEscapeBpm`) takes over at its fixed rate. Hypoxia and
ischaemia depress every pacemaker, subsidiary ones included (the asphyxial ECG slows to an idioventricular rhythm
before PEA — Varvarousi 2015 [P]; Guyton & Hall [TXT]). Mechanism: 7a's sinus-node factor (`hypF`, MODELED: FU-3's
hypoxic term + Task 6's ischaemic and K terms) is published as `circ.saF`; the rhythm engine multiplies every backup
escape rate by it through an optional context accessor (absent = 1: Stage 5 unchanged). **G-FU3 ruling 3:** 7d's
`organs.brain.cbfRel` stayed 0.49–0.63 after a PEA arrest because it read held pressures; Task 3's `mapNow` feeds 7d, and
this task asserts it (ICP and PbtO2 follow from the same MAP).

**Orchestrator update (2026-09-28, `research/10-monitor-fidelity-audit.md`):** the monitor's 58/min over a "sinus 30"
is 50 QRS/min because Stage 5's junctional backup escape is never RESET by the conducted beats — it fires on its own
40/min clock between them. The fix therefore has two parts: (i) every conducted (sinus) ventricular beat restarts the
escape timer (`rhythm-engine.ts`, where `st.escapeNextT` is scheduled after a beat — the `escapeNextT = er > 0 ? …`
lines at the beat and at the rhythm switch; the executor adds the restart where a conducted beat is emitted, under the
same E-FU4-11, with a Stage 5 unit test: sinus 30 → 30 QRS/min, sinus 30 with a 40/min escape and no conduction → 40);
(ii) the depression below. **Measured with (ii) alone (this plan applied in full on the prototype):** FU-3's asphyxia
rig no longer arrested within its window (HR < 40 at +2.77 min, "arrest none") — two FU-3 bands red. So (ii) MUST NOT
land before (i), and the executor finds why a depressed escape removed the arrest (candidate: with the escape reset
missing, the depressed escape and the sinus beats interleave so the coronary step's `hr`/beat record changes the
deficit; check `cor.hyp` and `kIsch` against the prototype's course) — if FU-3's bands cannot be kept, land (i) only
and record (ii) as a question.

**Orchestrator ruling (FU-4 review), 2026-09-28 (ruling 5 / review F7): this task SPLITS, the ordering becomes an
explicit step, and the expected value in the update above is WRONG.**
- **Task 13a — the escape reset (Stage 5, E-FU4-11 widened to "the escape timer restarts on every conducted ventricular
  beat").** It lands FIRST, on its own, with its own commit. Stage 5 unit tests, with the corrected expectations:
  - sinus 30 + an intact 40/min junctional focus → **40 QRS/min** (an escape RHYTHM with AV dissociation), **not 30 and
    not 50**. With the sinus interval (2.0 s) longer than the escape interval (1.5 s) the reset escape fires first every
    cycle — the "sinus 30 → 30 QRS/min" expectation written above is not the physiology and must not be asserted;
  - sinus 50 + a 40/min focus → **50** (every escape is reset by a conducted beat);
  - **never the sum** (the 58/min the monitor audit measured).
- **Task 13b — the depression** (the mechanism below, which is right: hypoxia and ischaemia depress subsidiary
  pacemakers, which is how the asphyxial ECG slows to an idioventricular rhythm). **Its Step 1 re-runs FU-3's file after
  13a.** If FU-3's bands fail, 13b is recorded as a question and NOT landed — the writer's own fallback, now a
  checkbox, not a judgement call made under time pressure.
- The two commits are separate so that a revert of 13b leaves 13a in place.

**Targets (R45, UNPROTOTYPED):** FU-3's asphyxia rig — the MONITOR's HR numeric < 45 for ≥ 30 s before the arrest (today 58
while the state reads 30); every FU-3 band unchanged (the post-arrest monitor-HR mean now within +1 bpm of the minute
before — G-FU3 ruling 1); class IV haemorrhage — `organs.brain.cbfRel` < 0.2 within 60 s of the PEA (ruling 3); and the
13a unit values above (40 / 50 / never the sum).

- [x] **Step 1: Stage 5's hook (E-FU4-11).**

#### Modify `packages/engine-core/src/l2/ecg/rhythm-state.ts`

Edit 1 — find:

```ts
  pacerLowerAt?(t: number): number;
  mods: Modifiers;
```

replace with:

```ts
  pacerLowerAt?(t: number): number;
  /** FU-4 (G-FU3 ruling 1): the circulation's pacemaker automaticity 0–1 (hypoxic/ischaemic depression) — × every backup
   * escape rate; absent = 1. */
  automaticityAt?(t: number): number;
  mods: Modifiers;
```

#### Modify `packages/engine-core/src/l2/ecg/rhythm-engine.ts`

Edit 1 — find:

```ts
  return d.rateDrives === 'escape' ? rhythmRate(st, t, ctx) : d.backupEscapeBpm;
```

replace with:

```ts
  return d.rateDrives === 'escape' ? rhythmRate(st, t, ctx) : d.backupEscapeBpm * (ctx.automaticityAt?.(t) ?? 1); // FU-4: depressed escape foci
```

- [x] **Step 2: 7a publishes the factor; the engine passes it.**

#### Modify `packages/engine-core/src/l2/circ/model.ts`

Edit 1 — find:

```ts
  noFlowS: number; // FU-4 G1: seconds the continuous MAP has been below arrest.ts MAP_NO_FLOW
```

replace with:

```ts
  noFlowS: number; // FU-4 G1: seconds the continuous MAP has been below arrest.ts MAP_NO_FLOW
  saF: number; // FU-4 (G-FU3 ruling 1): the sinus-node factor of the last control step (MODELED; 1 in MANUAL) — the escape foci follow it
```

Edit 2 — find:

```ts
arrest: null, noFlowS: 0, chemo: { sao2: 0.97, paco2: 40 },
```

replace with:

```ts
arrest: null, noFlowS: 0, saF: 1, chemo: { sao2: 0.97, paco2: 40 },
```

Edit 3 — find:

```ts
  const hypF = env.modeled ? Math.max(0.05, 1 - G_SA * m.cor.hyp - kSa) : 1; // FU-3 item 16: hypoxic SA-node depression (FU-4: + ischaemic, K)
```

replace with:

```ts
  const hypF = env.modeled ? Math.max(0.05, 1 - G_SA * m.cor.hyp - kSa) : 1; // FU-3 item 16: hypoxic SA-node depression (FU-4: + ischaemic, K)
  m.saF = hypF; // FU-4: every pacemaker, subsidiary ones included, shares the myocardial depression
```

#### Modify `packages/engine-core/src/engine.ts`

Edit 1 — find:

```ts
    pacerLowerAt: (t) => rampValue(ps.hemo.circ.hrSet ?? ps.hr, t), // FU-3 (Q-FU2-10): the held rate is a pacer's lower rate
```

replace with:

```ts
    pacerLowerAt: (t) => rampValue(ps.hemo.circ.hrSet ?? ps.hr, t), // FU-3 (Q-FU2-10): the held rate is a pacer's lower rate
    automaticityAt: () => ps.hemo.circ.saF ?? 1, // FU-4 (G-FU3 ruling 1): hypoxic/ischaemic depression of the escape foci
```

- [x] **Step 3: The FU-3 criteria (ruling 1) and 7d's CBF after the arrest (ruling 3).**

#### Modify `packages/engine-core/test/engine/circ-hypoxic-arrest.test.ts`

Edit 1 — find:

```ts
    expect(mean(w.hrMon)).toBeLessThanOrEqual(mean(c.hrMonBefore)); // the monitor HR does not rise (57.6 vs 57.7)
```

replace with:

```ts
    expect(mean(w.hrMon)).toBeLessThanOrEqual(mean(c.hrMonBefore) + 1); // the monitor HR does not rise (57.6 vs 57.7); 1 bpm tolerance (G-FU3 ruling 1)
    expect(Math.min(...c.hrMonBefore)).toBeLessThan(45); // FU-4 (ruling 1): the monitor SHOWS the bradycardia before the arrest (escape foci depressed; was 58)
```

#### Modify `packages/engine-core/test/engine/circ-lowflow-arrest.test.ts`

Edit 1 — find:

```ts
    expect(c.hrAtArrest as number).toBeLessThanOrEqual(0.6 * c.hrPeak);
```

replace with:

```ts
    expect(c.hrAtArrest as number).toBeLessThanOrEqual(0.6 * c.hrPeak);
    expect(c.cbfAfter).toBeLessThan(0.2); // G-FU3 ruling 3: 7d reads the arrest's pressures (was 0.49–0.63 after a PEA)
```

Edit 2 — find:

```ts
interface Course { tArrest?: number; rhythm?: string; cause?: string; tMap30?: number; tMap25?: number; hrPeak: number; hrAtArrest?: number; tPulseBack?: number; cprCpp: number[]; pulselessS: number }
```

replace with:

```ts
interface Course { tArrest?: number; rhythm?: string; cause?: string; tMap30?: number; tMap25?: number; hrPeak: number; hrAtArrest?: number; tPulseBack?: number; cprCpp: number[]; pulselessS: number; cbfAfter?: number }
```

Edit 3 — find:

```ts
    if (pulseless(s)) c.pulselessS++;
```

replace with:

```ts
    if (pulseless(s)) c.pulselessS++;
    if (c.tArrest !== undefined && t === c.tArrest + 60) c.cbfAfter = (e as unknown as { st: { organs: { brain: { cbfRel: number } } } }).st.organs.brain.cbfRel;
```

- [x] **Step 4: Run** `test/l2/ecg`, the Stage 5 library and device tests (Stage 5 rhythms with no circulation context are
  unchanged: the accessor is absent → 1), FU-3's file and the low-flow file:

```bash
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg test/engine/circ-hypoxic-arrest.test.ts test/engine/circ-lowflow-arrest.test.ts test/engine/defib-engine.test.ts test/engine/pacer-engine.test.ts test/engine/pacer-sensing.test.ts test/engine/state-rhythm.test.ts
```

  If an FU-3 band moves, record it and do not tune (R45); if the monitor still does not show < 45, the escape is not the
  only floor — find the other one (the HR numeric's own averaging on a 30/min rhythm) and report it.
- [x] **Step 5: Commit and push** (`feat(circ,ecg): hypoxic/ischaemic myocardium depresses the escape foci — the monitor shows the pre-arrest bradycardia (FU-4, G-FU3 rulings 1 and 3)`).


### Task 14: G10 — propofol's distribution follows cardiac output (7g; UNPROTOTYPED)

**Files:**
- Modify (7g): `packages/engine-core/src/l2/pk/row.ts` (`DrugRow.flowDist?`), `packages/engine-core/src/l2/pk/pipeline.ts`
  (`DrugInst.dist?`, `distFactor`, `params()`), `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts` (propofol `flowDist: true`)
- Create: `packages/engine-core/test/l2/pk/flow-distribution.test.ts`

**Why (audit G10, C1):** the propofol peak Ce hardly depends on flow (CO 5.3: 3.05; CO 3.1: 3.46; CO 0.38: 3.66); `pkCtx.coLpm`
reaches only the volatile model. Low cardiac output shrinks the initial distribution volume and slows the fast
intercompartmental exchange, so a bolus peaks higher (Kazama T et al., Anesthesiology 2002;97:1156 [P]; Johnson KB et
al., Anesthesiology 2003;99:409 — porcine haemorrhage: higher concentrations and a left-shifted potency [P; the
executor extracts the numbers into the test header]). Mechanism D12: with CO ratio q = CO/(0.075 L/min/kg × W),
quantised to 5 % in 0.3–1.5, V1' = V1·(0.5 + 0.5q), CL2' = CL2·q, CL3' = CL3·q, CL1 unchanged (the hepatic-flow term is
7g's `clFactor` already) — i.e. k10' = k10/vF, k12' = k12·q/vF, k13' = k13·q/vF, k21' = k21·q, k31' = k31·q.

**Target (R45; S6b):** 30 % haemorrhage (CO ≈ 3.1) → propofol 2 mg/kg peak Ce ≥ 1.3× the healthy value; healthy
unchanged (q exactly 1 at rest). **Measured (the plan applied in full, first version dividing by 0.075 L/min/kg):**
S6b ratio **2.01**; but the resting engine's q was not 1 (Ce 3.18 vs the standalone 2.996), which failed 7g's
"Eleveld in the engine equals the standalone model to 1e-9" and 7f's `neuro-engine` depth test (52 vs < 52) — hence
the divisor above is the circulation's own resting output (`coRefLpm`), which makes q = 1 at rest by construction;
re-measured with the fix: `neuro-engine` green again; the Eleveld-equality test still differs (Ce 3.28 vs 2.996)
because propofol's own CO fall now raises its Ce — the mechanism, not a PK error: that rig's property is equality
UNDER PINNED CONDITIONS (it already pins hepatic flow and, E-7e-6, temperature), so it gets a test-only CO pin
(**E-FU4-10**: e.g. `ps.pk.pinCoRel = 1` read by `distFactor`, or the rig's `pkCtx` override) and a second assertion
that documents the unpinned value. Re-measure S6b after the fix (if 2.01 is too strong against Johnson 2003's numbers,
the V1 share 0.5 is the [ENG] knob, recorded).

**Orchestrator ruling (FU-4 review), 2026-09-28 (review F12): four corrections to this task.**
1. **The CO reference must be the SETTLED resting one, not `circ.ref.co`.** `coRefLpm: circ.ref.co` repeats exactly what
   R51 addendum 15 #5 corrected for `hbfRel`: rigs sit −9 %…+10 % from `ref.co`, and the ventilated audit rig rests at
   CO 4.95–5.29, so `q` quantises to **0.90–0.95 at rest** and propofol's distribution changes in every healthy
   ventilated induction. Divide by the same settled resting reference 7c uses for `hbfRel`, or better, read a `coRel`
   published beside `hbfRel` by **7c, its owner**. State which was chosen in the gate note.
2. **Extract Johnson 2003 (and Kazama 2002) into the test header BEFORE choosing the V1 share**, then add the upper
   bound the paper supports: S6b currently asserts ≥ 1.3 with **no ceiling** while the plan gives 2.01, and in the class
   III + propofol rig Ce reaches 6.7 — about 2× the healthy peak, which is what compounds F2 (Task 18e).
3. **Delay the effect-site onset at low cardiac output** (circulation time — the audit's G10 named it too). Without it
   the collapse in the shock rows is too EARLY, whatever its depth: the applied tree killed the class III patient at a
   Ce of 3.5, before the drug had peaked.
4. **Task 18e (the humoral arm and the G2 re-fit) runs AFTER this task** and re-measures the whole propofol matrix with
   `distFactor` in. Keep **E-FU4-10**.

#### Modify `packages/engine-core/src/l2/pk/row.ts`

Edit 1 — find:

```ts
  elim?: { hepatic?: number; highExtraction?: boolean; renal?: number };
```

replace with:

```ts
  elim?: { hepatic?: number; highExtraction?: boolean; renal?: number };
  /** FU-4 G10: the central volume and the fast distribution follow cardiac output (propofol; Kazama 2002). */
  flowDist?: boolean;
```

#### Modify `packages/engine-core/src/l2/pk/pipeline.ts`

Edit 1 — find:

```ts
  factor: number; // clearance factor the params were built with (quantised)
```

replace with:

```ts
  factor: number; // clearance factor the params were built with (quantised)
  dist?: number; // FU-4 G10: cardiac-output ratio the distribution was built with (quantised; rows with flowDist)
```

Edit 2 — find:

```ts
function params(pk: PkState, row: DrugRow, inst: DrugInst): PkParams | null {
  const b = baseParams(pk, row, inst);
  return b ? { ...b, k10: b.k10 * inst.factor } : null;
}
```

replace with:

```ts
/** FU-4 G10: cardiac output ÷ the patient's own resting output (the circulation's stabilised reference; else 0.075
 * L/min/kg), quantised to 5 % in 0.3–1.5 (cache hits) — exactly 1 at rest, so a resting engine keeps 7g's model. */
export function distFactor(ctx: PkCtx, weightKg: number): number {
  const q = ctx.coLpm / (ctx.coRefLpm ?? 0.075 * weightKg);
  return Math.round(Math.min(1.5, Math.max(0.3, q)) * 20) / 20;
}

function params(pk: PkState, row: DrugRow, inst: DrugInst): PkParams | null {
  const b = baseParams(pk, row, inst);
  if (!b) return null;
  const q = inst.dist ?? 1;
  if (q === 1) return { ...b, k10: b.k10 * inst.factor };
  const vF = 0.5 + 0.5 * q; // FU-4 G10: V1 × vF, CL2/CL3 × q, CL1 unchanged (D12)
  return { ...b, v1: b.v1 * vF, k10: (b.k10 * inst.factor) / vF, k12: (b.k12 * q) / vF, k13: (b.k13 * q) / vF, k21: b.k21 * q, k31: b.k31 * q };
}
```

Edit 3 — find:

```ts
  coLpm: number; vaLpm: number; frcL: number; tempC: number; ph: number;
```

replace with:

```ts
  coLpm: number; vaLpm: number; frcL: number; tempC: number; ph: number;
  coRefLpm?: number; // FU-4 G10: the circulation's resting output (the reference distFactor divides by)
```

Edit 4 — find:

```ts
      const f = clFactor(row, ctx);
      if (f !== d.factor) d.factor = f;
```

replace with:

```ts
      const f = clFactor(row, ctx);
      if (f !== d.factor) d.factor = f;
      if (row.flowDist) d.dist = distFactor(ctx, pk.patient.weightKg); // FU-4 G10
```

#### Modify `packages/engine-core/src/engine.ts`

Edit 1 — find:

```ts
      coLpm: circ ? circCardiacOutput(circ) : NEUTRAL_PK_CTX.coLpm,
```

replace with:

```ts
      coLpm: circ ? circCardiacOutput(circ) : NEUTRAL_PK_CTX.coLpm,
      ...(circ ? { coRefLpm: circ.ref.co } : {}), // FU-4 G10: the resting output distFactor divides by
```

#### Modify `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts`

Edit 1 — find:

```ts
    elim: { hepatic: 0.6, highExtraction: true },
    // T6.3: E = Ce/(Ce + 3.5): SVR ×(1 − 0.45E), Ees ×(1 − 0.2E), V0 +8 %·E, reflex ×(1 − 0.6E); gvHr −0.7 (7a fit, Cullen 1987) — refitted in Task 20
```

replace with:

```ts
    elim: { hepatic: 0.6, highExtraction: true }, flowDist: true, // FU-4 G10
    // T6.3: E = Ce/(Ce + 3.5): SVR ×(1 − 0.45E), Ees ×(1 − 0.2E), V0 +8 %·E, reflex ×(1 − 0.6E); gvHr −0.7 (7a fit, Cullen 1987) — refitted in Task 20
```

- [x] **Test** (`flow-distribution.test.ts`, unit, on `advancePk` with a `PkCtx` whose `coLpm` is 5.25 vs 3.1): peak Ce
  ratio ≥ 1.3; resting q = 1 exactly; 7g's "Eleveld in the engine equals the standalone model to 1e-9" (E-7e-6 rig)
  must stay green — its rig pins temperature; if its CO is not the reference, pin `coLpm` in that rig too (a test-only
  seam like `pinCoreTemp`, E-FU4-10) and record it. Run `test/l2/pk`, `test/engine/pk-*.test.ts`, the 7f NMB/depth
  tests. Commit and push (`feat(pk): propofol's distribution follows cardiac output (FU-4 G10)`).


### Task 15: G11 — MODELED ventilation drops the MANUAL EtCO2 fit from its dead space (Stage 3, E-FU4-5; PROTOTYPED)

**Files:**
- Modify (Stage 3, **E-FU4-5**): `packages/engine-core/src/l2/resp/pipeline.ts` (`deadSpace(rs, l1?)` and its four call
  sites; `lungStateEvent` passes `l1`)
- Modify (pre-declared flip): `packages/engine-core/test/engine/pk-bus.test.ts`
- Modify (7d rig, **E-FU4-8**: a rig re-derivation, bands untouched): `packages/engine-core/test/engine/organs-tbi.test.ts`

**Why (audit G11, A0b; D13):** 12 × 500 mL settled at VA 2.82 L/min and PaCO2 60, adding a hypercapnic pressor term (up
to +20 % SVR) and CBF × 1.5 to every long ventilated MODELED run. The dead space is anatomical 154 + apparatus 50 +
`co2.vdExtraMl` 61 — the MANUAL EtCO2-target fit made at t = 0 for the spontaneous resting pattern. MODELED mechanical
ventilation now uses anatomical + apparatus; spontaneous breathing keeps the fit (the 7f drive's set point was
calibrated with it: excluding it there broke `neuro-spont` by 0.5 % and 0.05 mmHg — measured, then restricted). The ETT
half of the remaining gap is V.1's (Requests).

**Prototype (seed 7):** 12 × 500 VA 2.82 → **3.55 L/min**, PaCO2 at 60 min 60 → **48.5**; 14 × 500 → 41.8; 12 × 600 →
36.6 · `pk-bus` "VA > 3" `it.fails` passes (3.55) · the one sibling that had compensated the old dead space: `organs-tbi`
check 19 MODELED (RR 18 → PaCO2 35.6, premise 38–42 missed) → RR 15: PaCO2 38.9, ICP 20 at 10.5 min, 40 at 22.9 (bands
10–15 / 20–25); MANUAL keeps RR 18 (its fit is unchanged) · fast set 250 files green except the flip; slow set green
except the pre-declared flips and this rig · `pk-acceptance-pd` (RR 20 rig) and `organs-htn` (MANUAL) unchanged.

#### Modify `packages/engine-core/src/l2/resp/pipeline.ts`

Edit 1 — find:

```ts
function deadSpace(rs: RespState): number {
  const mech = rs.driver.source !== 'spontaneous' && rs.driver.source !== 'none';
  return rs.pat.deadSpaceMl + (mech ? apparatusDeadSpaceMl(rs.pat.weightKg) : 0) + rs.co2.vdExtraMl;
}
```

replace with:

```ts
function deadSpace(rs: RespState, l1?: L1State): number {
  const mech = rs.driver.source !== 'spontaneous' && rs.driver.source !== 'none';
  // FU-4 G11: the MANUAL EtCO2 fit (vdExtraMl, made for the resting pattern at t = 0) is not a MODELED ventilated
  // patient's dead space — it carried 61 mL into every MODELED PPV run (VA 2.82 L/min and PaCO2 60 at 12 × 500)
  const fit = mech && l1?.mode === 'modeled' ? 0 : rs.co2.vdExtraMl;
  return rs.pat.deadSpaceMl + (mech ? apparatusDeadSpaceMl(rs.pat.weightKg) : 0) + fit;
}
```

Edit 2 — find:

```ts
  return (n.rr * Math.max(0, n.vt - deadSpace(rs))) / 1000;
```

replace with:

```ts
  return (n.rr * Math.max(0, n.vt - deadSpace(rs, l1))) / 1000;
```

Edit 3 — find:

```ts
  const va0 = alveolarVentilation(d, t, deadSpace(rs));
```

replace with:

```ts
  const va0 = alveolarVentilation(d, t, deadSpace(rs, l1));
```

Edit 4 — find:

```ts
  const va = alveolarVentilation(d, t, deadSpace(rs));
```

replace with:

```ts
  const va = alveolarVentilation(d, t, deadSpace(rs, l1));
```

Edit 5 — find:

```ts
  lungStateEvent(rs, t);
```

replace with:

```ts
  lungStateEvent(rs, t, l1);
```

Edit 6 — find:

```ts
function lungStateEvent(rs: RespState, t: number): void {
```

replace with:

```ts
function lungStateEvent(rs: RespState, t: number, l1?: L1State): void {
```

Edit 7 — find:

```ts
    deadSpaceMl: deadSpace(rs), frcMl:
```

replace with:

```ts
    deadSpaceMl: deadSpace(rs, l1), frcMl:
```

(The MANUAL calibration block's own `deadSpace(rs) - rs.co2.vdExtraMl` stays: it computes the fit.)

#### Modify `packages/engine-core/test/engine/pk-bus.test.ts`

Edit 1 — find:

```ts
  // R45: band missed, kept as it.fails. Measured 2.818 L/min (constant from 60 s): Stage 3's VT 500 − anatomical 154 −
  // apparatus − its calibrated vdExtraMl 61 at RR 12 → VD/VT 0.53. 7g stores the value, it does not own it (gate note).
  it.fails('Stage 3 alveolar ventilation at VT 500 × 12 exceeds 3 L/min (measured 2.82)', () => {
```

replace with:

```ts
  // Was it.fails at 2.818 L/min: Stage 3's VT 500 − anatomical 154 − apparatus − the MANUAL EtCO2 fit vdExtraMl 61 at RR 12
  // (VD/VT 0.53). FU-4 G11: MODELED mechanical ventilation drops the MANUAL fit — measured 3.55. Band unchanged (R45).
  it('Stage 3 alveolar ventilation at VT 500 × 12 exceeds 3 L/min — was 2.82 before FU-4 G11', () => {
```

#### Modify `packages/engine-core/test/engine/organs-tbi.test.ts`

Edit 1 — find:

```ts
/** Tables §7 check 19 script, run once per mode. RR 18 / VT 500: Stage 3's dead space (VD/VT ≈ 0.53, G7g NR-7g-3)
 *  needs it for PaCO2 ≈ 40 (at RR 12–14 PaCO2 drifted to 46–52 and pulled ICP 20 forward to 7.9–8.7 min: R49). */
```

replace with:

```ts
/** Tables §7 check 19 script, run once per mode. RR 18 / VT 500: Stage 3's dead space (VD/VT ≈ 0.53, G7g NR-7g-3)
 *  needs it for PaCO2 ≈ 40 (at RR 12–14 PaCO2 drifted to 46–52 and pulled ICP 20 forward to 7.9–8.7 min: R49).
 *  FU-4 G11 (E-FU4-8): MODELED ventilation no longer carries the MANUAL EtCO2 fit, so the MODELED rig needs RR 15 for the
 *  same normocapnic premise (RR 18 gave PaCO2 35.6; RR 15 38.9); MANUAL keeps RR 18. Bands untouched. */
```

Edit 2 — find:

```ts
  r.send({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 18, vtMl: 500, fio2: 0.4, peep: 5 } });
  r.send({ type: 'attachSensor', sensor: 'icp', state: 'on' });
```

replace with:

```ts
  r.send({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: mode === 'modeled' ? 15 : 18, vtMl: 500, fio2: 0.4, peep: 5 } });
  r.send({ type: 'attachSensor', sensor: 'icp', state: 'on' });
```

- [x] **Run** `CI=1 … vitest run test/engine/pk-bus.test.ts test/engine/organs-tbi.test.ts test/engine/neuro-spont.test.ts
  test/engine/lung-*.test.ts test/engine/resp-*.test.ts test/engine/pk-acceptance-pd.test.ts`, then the whole slow set
  (≈ 20 min, background): every long MODELED ventilated run moves a little (the hypercapnic pressor term is gone). A band
  that moves out is reported with its numbers (R45), not re-tuned; a rig that compensated the old dead space the way
  check 19 did is re-derived under E-FU4-8 with its old/new RR in the gate note. Then the audit (`pnpm run
  audit:physiology`) — record the matrix again.
- [x] **Commit and push** (`fix(resp): MODELED ventilation drops the MANUAL EtCO2 fit from its dead space — 12 × 500 PaCO2 60 → 48.5 (FU-4 G11)`).

### Task 16: G12 — hypothermia: shivering stops below 30–32 °C; the core temperature reaches the arrest hazard (7e thermal E-FU4-5, engine E-FU4-7; hazard wiring PROTOTYPED, shivering UNPROTOTYPED)

**Files:**
- Modify (7e, **E-FU4-5**): `packages/engine-core/src/l2/thermal/params.ts` (two constants),
  `packages/engine-core/src/l2/thermal/thresholds.ts` (`shiverW` fades out)
- Modify (**E-FU4-7**): `packages/engine-core/src/engine.ts` (`circ.ext.tempC` each pass, beside 7g's writes)
- Create: `packages/engine-core/test/l2/thermal/shiver-cutoff.test.ts`

**Why (audit G12, G4/G4b):** shivering continued to 28 °C (lactate 16.5, PaCO2 115 in an awake cooled patient); nothing
turned deep hypothermia into VF. D14.

**Prototype:** with the `tempC` write, a core pinned at 26 °C (7e's `pinCoreTemp` seam) reaches VF by the hazard
(unit test in Task 6); the audit's G4b ramp stops at 28.0 °C and does not arrest (hazard 0 at 28). Shivering:
UNPROTOTYPED — target (R45): G4 (awake, cooled to 28 °C): shivering heat 0 below 30 °C, lactate at the end < 8 (was 16.5).

#### Modify `packages/engine-core/src/engine.ts`

Edit 1 — find:

```ts
      circ7g.ext.avNodeBlock = ps.pk.bus.avNodeBlock; // FU-2 (AF rate control)
```

replace with:

```ts
      circ7g.ext.avNodeBlock = ps.pk.bus.avNodeBlock; // FU-2 (AF rate control)
      circ7g.ext.tempC = ps.resp.temp.tc; // FU-4 G12: core temperature for the hypothermic (and G8 hyperthermic) arrest hazard
```

#### Modify `packages/engine-core/src/l2/thermal/params.ts`

Edit 1 — find:

```ts
export const SHIVER_SPAN_C = 1.8;
```

replace with:

```ts
export const SHIVER_SPAN_C = 1.8;
/** FU-4 G12: shivering fades out between SHIVER_STOP_C + SHIVER_STOP_SPAN_C and SHIVER_STOP_C core (moderate
 * hypothermia abolishes it: Danzl & Pozos, NEJM 1994;331:1756 [TXT]) [ENG span]. */
export const SHIVER_STOP_C = 30;
export const SHIVER_STOP_SPAN_C = 2;
```

#### Modify `packages/engine-core/src/l2/thermal/thresholds.ts`

Edit 1 — find:

```ts
  SHIVER_MAX_X, SHIVER_SPAN_C, SUMMIT_W_PER_KG075, SWEAT_MAX_W_70, SWEAT_W_PER_C, THR_SHIVER_AWAKE, THR_SHIVER_GA,
```

replace with:

```ts
  SHIVER_MAX_X, SHIVER_SPAN_C, SHIVER_STOP_C, SHIVER_STOP_SPAN_C, SUMMIT_W_PER_KG075, SWEAT_MAX_W_70, SWEAT_W_PER_C, THR_SHIVER_AWAKE, THR_SHIVER_GA,
```

Edit 2 — find:

```ts
  return Math.max(0, summit - m0) * Math.min(1, deficit / SHIVER_SPAN_C) * (1 - Math.min(1, Math.max(0, nmb)));
```

replace with:

```ts
  const stop = Math.min(1, Math.max(0, (tc - SHIVER_STOP_C) / SHIVER_STOP_SPAN_C)); // FU-4 G12: gone below 30 °C
  return Math.max(0, summit - m0) * Math.min(1, deficit / SHIVER_SPAN_C) * (1 - Math.min(1, Math.max(0, nmb))) * stop;
```

- [x] **Test** (`shiver-cutoff.test.ts`, unit on `shiverW`): 33 °C awake → > 0; 31 °C → half of the uncut value; 29.5 °C
  → 0. Run `test/l2/thermal`, `test/engine/endo-*.test.ts` (7e's cold rows stop above 32 °C and are unchanged), the
  audit's G4/G4b. Commit and push (`feat(thermal,circ): shivering stops in moderate hypothermia; core temperature
  reaches the arrest hazard (FU-4 G12)`).

### Task 17: G4 (b) — arrest EtCO2 kinetics; the AF pulse deficit (Stage 3 gas E-FU4-5, 7a; UNPROTOTYPED; replaces the pulse-oximeter item, which moved to FU-5)

**Files:**
- Modify (Stage 3, **E-FU4-5**): `packages/engine-core/src/l2/gas/params.ts` (`LOW_FLOW_TAU_S`)
- Create: `packages/engine-core/test/engine/arrest-etco2.test.ts` (one 5 sim-min run; fast set)
- Investigate (7a, AF): no file change until Step 3 names the mechanism

**Why (orchestrator update 2026-09-28, from `research/10-monitor-fidelity-audit.md`, physiology section):** (a) EtCO2
falls 37 → 1 mmHg within 20 s of VF: the low-flow compression EtCO2 ≈ PaCO2·min(1, CO/CO_ref)^0.6 is reached with
`LOW_FLOW_TAU_S` 5 s ("falls below 5 mmHg within a few breaths"). With no flow and continued ventilation the alveolar
CO2 washes out over breaths while the lungs still hold CO2: an exponential fall over 1–2 min to ≈ 5–10 mmHg is the
expected course [the audit's expectation; the capnography literature on arrest onset, TXT]. (b) AF at 150/min: 44 % of
beats do not eject; the pulse deficit of AF at that rate is ≈ 10–20 % of beats [the audit's reading of the AF
pulse-deficit literature, TXT]. (The pulse-oximeter dropout at MAP 13 — the audit's G14 — is FU-5's: see Requests.)

- [x] **Step 1: the EtCO2 time constant** — τ 5 → 40 s [ENG, fit: VF on the ventilated audit rig without CPR, EtCO2 at
  60 s 10–20 mmHg and at 120 s 3–10]. CPR's steady values (`cpr-etco2`, R39-2) must not move (they are steady states).

#### Modify `packages/engine-core/src/l2/gas/params.ts`

Edit 1 — find:

```ts
export const LOW_FLOW_TAU_S = 5; // "falls below 5 mmHg within a few breaths" after arrest [ENG]
```

replace with:

```ts
/** FU-4 G4 (orchestrator 2026-09-28): the arrest EtCO2 falls over 1–2 min to ≈ 5–10 mmHg, not within seconds — τ 40 s
 * [ENG, fit: 10–20 mmHg at 60 s and 3–10 at 120 s after VF without CPR on the ventilated audit rig] (was 5 s). */
export const LOW_FLOW_TAU_S = 40;
```

- [x] **Step 2: the test** (`arrest-etco2.test.ts`): ventilated rig (ETT, 12 × 600), commanded VF at 60 s, no CPR:
  EtCO2 at +60 s in 10–20 and at +120 s in 3–10; with CPR q 0.8 from +30 s the R39-2 steady 17–23 by +2 min.
  Run `test/engine/cpr-etco2.test.ts`, `test/engine/resp-capnogram.test.ts`, `test/engine/lung-capno.test.ts`, FU-3's
  asphyxia file (its CO2-trace assertions are post-arrest) — a band that moves is reported (R45).
- [x] **Step 3: the AF pulse deficit (investigate first).** Measure on MODELED AF at 150/min (`setRhythm afib`, 5 min):
  the share of beats with `avOpen < 0`, their preceding RR, and the LV EDV of the non-ejecting beats. The candidate
  mechanism is the short-RR beat's filling (7a's beat-to-beat Frank–Starling with the Stage 2 minimum-opening rule) —
  compare the non-ejecting share with the pulse-deficit literature (≈ 10–20 % at 150); change the mechanism only with a
  source (e.g. the restitution of contractility after a short RR — the post-extrasystolic `PESP` machinery already in
  `model.ts`), otherwise record it as an `it.fails` ("AF 150: non-ejecting beats ≤ 20 % — measured 44 %") and a
  question for Ali.

**Orchestrator ruling (FU-4 review), 2026-09-28 (ruling 5 / review F14): "investigate, then `it.fails`" is not enough —
this is a task with a target, and `it.fails` needs TWO recorded attempts.**
- Measure the non-ejecting beats' **preceding RR, EDV and LV pressure versus the aortic diastolic pressure** (not just
  the share): that comparison is what says whether the beat fails to open the valve because it is underfilled or
  because it is weak.
- Then **implement beat-to-beat filling**: RR-dependent contractility (restitution after a short RR, potentiation after
  a long one — the PESP machinery is already in `model.ts`) AND check the Stage 2 minimum-opening rule, which may be
  rejecting beats a real ventricle would eject.
- **Target 10–20 % non-ejecting beats at 150/min.**
- `it.fails` **only after two sourced mechanism attempts, each recorded with its measured number** in the gate note.
  One attempt is not a finding.
- [x] **Step 4: Commit and push** (`fix(gas): arrest EtCO2 falls over minutes, not seconds (FU-4 G4)`; plus the AF
  finding).

### Task 18: item 1 — forced-air warming at a set air temperature (7e thermal + Stage 3 command, E-FU4-5; UNPROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/types-resp.ts` (the `thermal` event's `warmAirC?`), `packages/engine-core/src/l2/resp/pipeline.ts`
  (validation and apply), `packages/engine-core/src/l2/thermal/environment.ts` (`forcedAirW(env, tp, airC)`),
  `packages/engine-core/src/l2/thermal/heat.ts` (`ThermalState.warmAirC?`; the warm term)
- Create: `packages/engine-core/test/engine/thermal-warmer.test.ts` (3 × 60 sim-min → SLOW)
- Modify: `packages/engine-core/vite.config.ts` (one SLOW entry)

**Why (G7e ruling 2, FU-4 item 1):** the warmer is a boolean at a fixed 43 °C; model it as a set blanket air temperature
(32 / 38 / 43 °C, the Bair Hugger low/medium/high settings [TXT: device IFU]) with heat ∝ (T_air − T_periphery) — the
formula already self-limits; the default stays 43 so every 7e number is unchanged. No servo.

**Target (R45, UNPROTOTYPED):** GA 60 min warmed at 38 °C ends between the unwarmed and the 43 °C runs (monotone in the set
temperature); 43 °C and absent give identical states.

#### Modify `packages/engine-core/src/types-resp.ts`

Edit 1 — find:

```ts
  | { kind: 'thermal'; anaesthesia?: 'none' | 'general' | 'neuraxial'; warming?: boolean; ambientC?: number };
```

replace with:

```ts
  | { kind: 'thermal'; anaesthesia?: 'none' | 'general' | 'neuraxial'; warming?: boolean; ambientC?: number; warmAirC?: 32 | 38 | 43 }; // FU-4 item 1: blanket air temperature
```

#### Modify `packages/engine-core/src/l2/resp/pipeline.ts`

Edit 1 — find:

```ts
      if (th.anaesthesia !== undefined && !['none', 'general', 'neuraxial'].includes(th.anaesthesia)) return 'anaesthesia must be none, general or neuraxial';
      return num('ambientC', th.ambientC, 5, 40);
```

replace with:

```ts
      if (th.anaesthesia !== undefined && !['none', 'general', 'neuraxial'].includes(th.anaesthesia)) return 'anaesthesia must be none, general or neuraxial';
      if (th.warmAirC !== undefined && ![32, 38, 43].includes(th.warmAirC)) return 'warmAirC must be 32, 38 or 43'; // FU-4 item 1
      return num('ambientC', th.ambientC, 5, 40);
```

Edit 2 — find:

```ts
      if (th.warming !== undefined) rs.temp.warming = th.warming;
```

replace with:

```ts
      if (th.warming !== undefined) rs.temp.warming = th.warming;
      if (th.warmAirC !== undefined) rs.temp.warmAirC = th.warmAirC; // FU-4 item 1
```

#### Modify `packages/engine-core/src/l2/thermal/environment.ts`

Edit 1 — find:

```ts
export function forcedAirW(env: Envelope, tp: number): number {
  return FORCED_AIR_H * env.bsa * FORCED_AIR_AREA * (FORCED_AIR_C - tp);
}
```

replace with:

```ts
export function forcedAirW(env: Envelope, tp: number, airC = FORCED_AIR_C): number {
  return FORCED_AIR_H * env.bsa * FORCED_AIR_AREA * (airC - tp); // FU-4 item 1: the blanket's set air temperature
}
```

#### Modify `packages/engine-core/src/l2/thermal/heat.ts`

Edit 1 — find:

```ts
  warmLag: number; // 0–1 delivered fraction of the forced-air power (first-order, τ FORCED_AIR_TAU_S)
```

replace with:

```ts
  warmLag: number; // 0–1 delivered fraction of the forced-air power (first-order, τ FORCED_AIR_TAU_S)
  warmAirC?: number; // FU-4 item 1: the blanket's set air temperature, °C (absent = FORCED_AIR_C 43)
```

Edit 2 — find:

```ts
    warmW: st.warmLag > 0 ? forcedAirW(env, st.tp) * st.warmLag : 0,
```

replace with:

```ts
    warmW: st.warmLag > 0 ? forcedAirW(env, st.tp, st.warmAirC) * st.warmLag : 0,
```

#### Modify `packages/engine-core/vite.config.ts`

Edit 1 — find:

```ts
  'test/engine/vagal-events.test.ts', // FU-4 G7: vagal-event runs of 5–10 sim-min
```

replace with:

```ts
  'test/engine/vagal-events.test.ts', // FU-4 G7: vagal-event runs of 5–10 sim-min
  'test/engine/thermal-warmer.test.ts', // FU-4 item 1: three 60 sim-min warming runs
```

- [x] **Test** (`thermal-warmer.test.ts`, engine, 3 × 60 sim-min under GA, one yield per sim-minute → SLOW_B): the order
  unwarmed < 38 °C < 43 °C at 60 min; 43 and absent identical. Run `test/l2/thermal`, `test/engine/endo-*.test.ts`,
  `test/engine/neuro-longrun.test.ts` (E-7e-7's warmed rig). Commit and push (`feat(thermal): forced-air warming at a set air temperature (FU-4 item 1)`).

## Phase 2 — the R50 review's mechanism fixes (Tasks 18a–18f)

*Orchestrator ruling (FU-4 review), 2026-09-28.* The R50 review (APPROVE WITH FIXES, 18 findings) and the orchestrator's
rulings add six mechanism tasks. They are placed HERE, after Task 18, for two reasons: their find blocks must apply
after every earlier task's edits to the same files (`circ/model.ts`, `hemo/pipeline.ts`, `resp/pipeline.ts`), and their
physiology depends on the earlier tasks — F5 (the PEA decay) is meaningless until F1 has stopped CPR from always
winning, and F2's re-fit must be measured with Task 14's concentration change already in. They are PROTOTYPED: every
number in their "Prototype results" was measured on a throwaway worktree with Tasks 0–18 applied.

Order inside the phase, which is binding: **18a** CPR mechanics (ruling 3) → **18b** the PEA decay (ruling 7, needs
18a) → **18c** the tension pneumothorax build-up (ruling 1) → **18d** the dead-space root (ruling 4 / FU-6's R1) →
**18e** the humoral arm and the propofol re-fit (ruling 2, after Task 14) → **18f** the vagal events become real code
(review F10).

### Task 18a: CPR coronary perfusion — the compression acts on VOLUME, the two pressures are measured separately, brainstem ischaemia withdraws the reflex (7a, E-FU4-15; ruling 3 / review F1; PROTOTYPED)

**Files:**
- Modify (7a): `packages/engine-core/src/l2/circ/params.ts` (**E-FU4-15**: the CPR constants), `packages/engine-core/src/l2/circ/circuit.ts`
  (`vCprRef`, `cprRelease`, the volume factor, the Starling-resistor atria), `packages/engine-core/src/l2/circ/baroreflex.ts`
  (`brainstemOutF`, `brainF`), `packages/engine-core/src/l2/circ/coronary.ts` (`DEMAND_VF`, `VF_RHYTHMS`, `NoBeat.vf`),
  `packages/engine-core/src/l2/circ/model.ts` (the `cprRelease` seam, `ext.cbfRel`, `brainF`), `packages/engine-core/src/l2/circ/profile.ts`,
  `packages/engine-core/src/l2/circ/stabilise.ts`, `packages/engine-core/src/l2/hemo/pipeline.ts` (**E-FU4-15**)
- Modify (7d, **E-FU4-2** widened): `packages/engine-core/src/l2/organs/effects.ts` (one line: publish `ext.cbfRel`)
- Modify (tests): `packages/engine-core/test/l2/circ/circuit.test.ts` (the new `CircDrive` member),
  `packages/engine-core/test/engine/circ-lowflow-arrest.test.ts` (the CPP upper bound),
  `packages/engine-core/test/engine/clinical-suite.test.ts` (S13 flips to `it`)

**Naming (R56, `research/11-capability-inventory-and-glossary.md`):** the engine field stays `cor.cpp`, but in every
TEST TITLE, scenario name, console label and gate-note row this quantity is the **coronary perfusion pressure = CoPP**;
**CPP** is reserved for the cerebral perfusion pressure. Write "CoPP 23.8 mmHg (Paradis 15–25)".

**Interfaces:** `CircParams.vCprRef: number` (mL), `CircDrive.cprRelease: (t) => number` (mmHg),
`BaroGains.brainF?: number`, `brainstemOutF(cbfRel?)`, `CoronaryState` unchanged, `NoBeat.vf?: boolean`,
`CircModelState.ext.cbfRel?: number` (7d writes it, as `rSysF`).

**Why (ruling 3; review F1).** The applied tree generated a continuous CPP of **46 before adrenaline and 49–52 after**
against Paradis's 15–25, `kIsch` recovered 0.81 → **1.00** within 4 min of CPR (so a shock after 10 min of VF found a
pristine myocardium, defeating D2's three-phase rationale), and **CPR alone restored a pulse after a 3 L
exsanguination**. The measurement named the terms, and it named four, not one:

- (a) The compression was a **volume-independent pressure source** (`cprCardiac`/`cprThoracic` = constant × quality).
  Measured on the exsanguinated rig it drove RV volume to **−165.9 mL** and the systemic venous reservoir to **−626 mL**
  while generating 74 mmHg of aortic pressure out of an empty thorax. A compression displaces blood; its pressure must
  scale with the intrathoracic stressed volume there is to displace.
- (b) The **neural reflex stayed saturated through the arrest** (`Rsys` ×1.57 of base before adrenaline, ×2.68 after,
  `es` saturated the whole time). The vasomotor centre is itself perfused: with no cerebral flow the neural arm fails
  and arrest SVR falls to intrinsic tone × circulating catecholamines. The signal is 7d's `brain.cbfRel`, the same one
  E-FU3-10's respiratory gate uses.
- (c) The **RA relaxation pressure was 1.8–2.5** where Paradis measured 15–25. Two things were missing: the chest does
  not fully recoil (a residual intrathoracic pressure stays on the collapsible venous side through decompression), and
  the thin-walled right heart and great veins are a **Starling resistor** — they collapse rather than hold a negative
  transmural pressure, so what the catheter reads during compressions is the intrathoracic pressure.
- (d) **Fibrillating myocardium is not an arrested one.** VF used `DEMAND_ARREST` (basal + E–C, 0.35), so CPR repaid the
  whole oxygen debt. Every myofibril in VF contracts continuously and asynchronously; its MVO2 stays near the working
  heart's.

Sources: Paradis NA et al., JAMA 1990;263:1106–1113 (coronary perfusion pressure during human CPR: ROSC not seen below
15 mmHg, survivors ≈ 25; RA relaxation pressures 15–25) [P]; the three-phase model (Weisfeldt & Becker, JAMA
2002;288:3035–3038) [P]; incomplete chest recoil and its haemodynamic cost (AHA CPR quality statement, Circulation
2013;128:417–435) [P]; VF MVO2 near the working heart's (Suga H, Physiol Rev 1990;70:247–277; Gibbs CL, Physiol Rev
1978) [TXT]. Sizes [ENG], fit target: **standard-quality CPR CPP inside 15–25 with RA relaxation inside 15–25**, and
CPR alone after exsanguination gives no pulse.

**Prototype results (measured, seed 7; the full sweep is in the Prototype results section).** Step 1's measurement
(relaxation vs compression phase split at 10 ms) and the fit: `CPR_CARDIAC_MMHG`/`CPR_THORACIC_MMHG` 35 → **24**,
`V_CPR_REF_FRAC` 0.08, `CPR_RELEASE_RESIDUAL` 0.65, `DEMAND_VF` 0.75, `CBF_REFLEX_FULL/ZERO` 0.9/0.2. After:
VF + CPR q 0.8 at 70 s — **CPP 23.8, RA relaxation 18.0, `kIsch` 0.56**; after adrenaline 1 mg CPP 30.0 (above the band:
adrenaline raising CPP is Paradis's own finding); **exsanguination PEA + CPR alone: CPP 3.1 and no pulse in 10 min**;
CPR + 2 L + adrenaline: ROSC at 220 s after CPR starts. The brainstem arm is visible in the sweep: as `cbfRel` falls
0.76 → 0.22, `Rsys ÷ base` falls 1.49 → 1.04 — the loop converges instead of sitting at its ceiling.

- [x] **Step 1: measure before changing anything** (the review's Step 1, already done once; re-run it after the edits
  as the after-measurement). `scripts/audit-physiology/zz-probe-cpr.ts`-style probe: advance in 10 ms steps and split
  `circOut.pAo`/`circOut.pRa` by compression vs relaxation phase (`cprPressure(hs.cpr, t) > 0.02`), on two rigs —
  commanded `vfCoarse` + CPR q 0.8, and exsanguinated PEA + CPR alone. Record relaxation Ao, relaxation RA, their
  difference, compression Ao mean/peak, `cor.cpp`, `kIsch`, `Rsys ÷ base`, `es`, `cbfRel`, the chamber volumes and the
  venous reservoir. Paste the table into the gate note. **Do not change a constant before this table exists.**

- [x] **Step 2: the four mechanism parts.**

#### Modify `packages/engine-core/src/l2/circ/params.ts`

Edit 1 — find:

```ts
/** Direct cardiac compression: chamber pressure added per unit quality, mmHg [ENG; plan 60 (not prototyped) → 35 in the
 * engine: 60 gave SBP 95 / DBP 40 / CO 3.5 L/min at quality 0.8; 35/35 gives 73/16 and CO 2.1 (quality 1: 91/21, 2.5)]. */
export const CPR_CARDIAC_MMHG = 35;
/** Thoracic-pump pressure on every intrathoracic compartment and the aortic root per unit quality [ENG; plan 30 → 35]. */
export const CPR_THORACIC_MMHG = 35;

// --- integration ---
```

replace with:

```ts
/** Direct cardiac compression: chamber pressure added per unit quality, mmHg [ENG; plan 60 (not prototyped) → 35 in the
 * engine: 60 gave SBP 95 / DBP 40 / CO 3.5 L/min at quality 0.8; 35/35 gives 73/16 and CO 2.1 (quality 1: 91/21, 2.5)]. */
export const CPR_CARDIAC_MMHG = 24; // FU-4 F1: re-fitted with the volume factor, the release residual and the brainstem withdrawal (was 35)
/** Thoracic-pump pressure on every intrathoracic compartment and the aortic root per unit quality [ENG; plan 30 → 35]. */
export const CPR_THORACIC_MMHG = 24; // FU-4 F1: re-fitted with F1(a)/(c) (was 35)
/**
 * FU-4 F1(a): a compression DISPLACES blood — it is not a pressure source. The pressure it generates scales with the
 * intrathoracic stressed volume it has to displace, so an empty thorax generates none (the exsanguinated heart gets no
 * CPP from compressions alone). Reference stressed intrathoracic volume ≈ 8 % of blood volume (measured resting:
 * adult 382 mL / BV 4 900, woman 370 / 3 900, 4 y child 89 / 1 152) [ENG].
 */
export const V_CPR_REF_FRAC = 0.08;
/**
 * FU-4 F1(c): the chest does not fully recoil between compressions — a residual intrathoracic pressure stays on the
 * collapsible venous side (RA and the pulmonary compartments) through the decompression phase, which is why Paradis
 * 1990 measured RA relaxation pressures of 15–25 mmHg rather than the ≈ 2 mmHg a full release gives. Fraction of the
 * thoracic-pump amplitude retained during release [ENG, fit to Paradis's RA relaxation band].
 */
export const CPR_RELEASE_RESIDUAL = 0.65;

// --- integration ---
```

#### Modify `packages/engine-core/src/l2/circ/profile.ts`

Edit 1 — find:

```ts
  A_LV, A_RV, AVA_REF, BETA_LV, BETA_RV, BV_ML_KG_F, BV_ML_KG_M, C_PA, C_PV, C_SV, EES_LV, EES_RV, EMAX_LA, EMAX_RA, EMIN_LA,
  EMIN_RA, GORLIN_AV, GORLIN_MV, MVA_REF, PERI_A, PERI_LAMBDA, PVR, R_AV, R_MV, R_PV, R_PVLA, R_TV, R_VR, RIGHT_LUNG_FLOW, V0_LA,
  V0_LV, V0_RA, V0_RV, Z_PA,
} from './params.ts';
import { stenosisK } from './valves.ts';
```

replace with:

```ts
  A_LV, A_RV, AVA_REF, BETA_LV, BETA_RV, BV_ML_KG_F, BV_ML_KG_M, C_PA, C_PV, C_SV, EES_LV, EES_RV, EMAX_LA, EMAX_RA, EMIN_LA,
  EMIN_RA, GORLIN_AV, GORLIN_MV, MVA_REF, PERI_A, PERI_LAMBDA, PVR, R_AV, R_MV, R_PV, R_PVLA, R_TV, R_VR, RIGHT_LUNG_FLOW, V0_LA,
  V0_LV, V0_RA, V0_RV, V_CPR_REF_FRAC, Z_PA,
} from './params.ts';
import { stenosisK } from './valves.ts';
```

Edit 2 — find:

```ts
    tv: { r: R_TV / w, k: 0, eroa: 0 }, pv: { r: R_PV / w, k: 0, eroa: 0 }, mv: { r: R_MV / w, k: 0, eroa: 0 }, av: { r: R_AV / w, k: 0, eroa: 0 },
    periA: PERI_A, periLambda: PERI_LAMBDA / w, v0Peri: 0, vFluid: 0,
  };
  const r: ResolvedProfile = {
```

replace with:

```ts
    tv: { r: R_TV / w, k: 0, eroa: 0 }, pv: { r: R_PV / w, k: 0, eroa: 0 }, mv: { r: R_MV / w, k: 0, eroa: 0 }, av: { r: R_AV / w, k: 0, eroa: 0 },
    periA: PERI_A, periLambda: PERI_LAMBDA / w, v0Peri: 0, vFluid: 0,
    vCprRef: V_CPR_REF_FRAC * bvKg * pr.weightKg, // FU-4 F1(a)
  };
  const r: ResolvedProfile = {
```

#### Modify `packages/engine-core/src/l2/circ/circuit.ts`

Edit 1 — find:

```ts
  tv: Valve; pv: Valve; mv: Valve; av: Valve;
  periA: number; periLambda: number; v0Peri: number; vFluid: number;
}
```

replace with:

```ts
  tv: Valve; pv: Valve; mv: Valve; av: Valve;
  periA: number; periLambda: number; v0Peri: number; vFluid: number;
  /** FU-4 F1(a): reference resting intrathoracic stressed volume the compression works against, mL. */
  vCprRef: number;
}
```

Edit 2 — find:

```ts
  cprCardiac: (t: number) => number; // direct compression on the four chambers, mmHg
  cprThoracic: (t: number) => number; // thoracic pump on intrathoracic compartments and the aortic root, mmHg
  qIn: number; // net volume in (+ fluid, − bleed), mL/s, into the systemic veins
  qVad: (lvp: number, aop: number) => number; // LV → aorta device flow (LVAD), mL/s
```

replace with:

```ts
  cprCardiac: (t: number) => number; // direct compression on the four chambers, mmHg
  cprThoracic: (t: number) => number; // thoracic pump on intrathoracic compartments and the aortic root, mmHg
  /** FU-4 F1(c): thoracic pressure retained on the VENOUS side through the release phase, mmHg (0 outside CPR). */
  cprRelease: (t: number) => number;
  qIn: number; // net volume in (+ fluid, − bleed), mL/s, into the systemic veins
  qVad: (lvp: number, aop: number) => number; // LV → aorta device flow (LVAD), mL/s
```

Edit 3 — find:

```ts
  }
  const pit = d.pIt(t);
  const cc = d.cprCardiac(t);
  const ct = d.cprThoracic(t);
  const vlv = s[10] as number;
  const vrv = s[6] as number;
  const peri = Math.max(0, p.periA * (Math.exp(p.periLambda * (vlv + vrv + p.vFluid - p.v0Peri)) - 1));
  const ext = pit + ct + peri; // external pressure on the chambers (thoracic pump acts on everything intrathoracic)
  const dl = vlv - p.v0Lv;
  const dr = vrv - p.v0Rv;
  const pLv = a * p.eesLv * d.kLv * dl + (1 - a) * p.aLv * (Math.exp(p.betaLv * dl) - 1) + ext + cc;
  const pRv = a * p.eesRv * d.kRv * dr + (1 - a) * p.aRv * (Math.exp(p.betaRv * dr) - 1) + ext + cc;
  const pRa = (p.eminRa + aa * (p.emaxRa - p.eminRa)) * ((s[5] as number) - p.v0Ra) + ext + cc;
  const pLa = (p.eminLa + aa * (p.emaxLa - p.eminLa)) * ((s[9] as number) - p.v0La) + ext + cc;
  const pSv = ((s[4] as number) - p.v0Sv) / p.cSv;
  const pPa = (s[7] as number) / p.cPa + pit + ct;
  const pPv = (s[8] as number) / p.cPv + pit + ct;
  const pc = s[0] as number;
  const ql = s[1] as number;
```

replace with:

```ts
  }
  const pit = d.pIt(t);
  const vlv = s[10] as number;
  const vrv = s[6] as number;
  let cc = d.cprCardiac(t);
  let ct = d.cprThoracic(t);
  let cr = 0;
  if (cc > 0 || ct > 0 || (cr = d.cprRelease(t)) > 0) {
    // FU-4 F1(a): a compression displaces blood. The pressure it generates scales with the intrathoracic stressed
    // volume available to displace, so an exsanguinated thorax generates no aortic pressure and no CPP.
    const vStr =
      Math.max(0, vlv - p.v0Lv) + Math.max(0, vrv - p.v0Rv) +
      Math.max(0, (s[5] as number) - p.v0Ra) + Math.max(0, (s[9] as number) - p.v0La) +
      Math.max(0, s[7] as number) + Math.max(0, s[8] as number);
    const f = Math.min(1, vStr / p.vCprRef);
    cc *= f;
    ct *= f;
    cr *= f;
  }
  const peri = Math.max(0, p.periA * (Math.exp(p.periLambda * (vlv + vrv + p.vFluid - p.v0Peri)) - 1));
  // FU-4 F1(c): incomplete chest recoil leaves a residual pressure on the collapsible venous side (RA, pulmonary bed)
  // through the release phase; the stiff pressurised aorta is not held up by it, so the Ao − RA gradient narrows to
  // the Paradis 1990 band instead of the ≈ 46 the full release gave.
  const ext = pit + ct + peri; // external pressure on the chambers (thoracic pump acts on everything intrathoracic)
  const extV = ext + cr; // venous/right-heart side: + the retained release pressure
  const dl = vlv - p.v0Lv;
  const dr = vrv - p.v0Rv;
  const pLv = a * p.eesLv * d.kLv * dl + (1 - a) * p.aLv * (Math.exp(p.betaLv * dl) - 1) + ext + cc;
  const pRv = a * p.eesRv * d.kRv * dr + (1 - a) * p.aRv * (Math.exp(p.betaRv * dr) - 1) + ext + cc;
  // FU-4 F1(c): while the chest is being compressed the thin-walled right heart and great veins are a Starling
  // resistor — they collapse rather than hold a negative transmural pressure, so the MEASURED atrial pressure tracks
  // the intrathoracic pressure (which is what a catheter reads: Paradis 1990's RA relaxation pressure of 15–25, not
  // the ≈ 4 an uncollapsed chamber gives). Outside CPR the transmural pressure is free, as every calibrated CVP rig
  // expects.
  const traRa = (p.eminRa + aa * (p.emaxRa - p.eminRa)) * ((s[5] as number) - p.v0Ra);
  const traLa = (p.eminLa + aa * (p.emaxLa - p.eminLa)) * ((s[9] as number) - p.v0La);
  const pRa = (cr > 0 ? Math.max(0, traRa) : traRa) + extV + cc;
  const pLa = (cr > 0 ? Math.max(0, traLa) : traLa) + extV + cc;
  const pSv = ((s[4] as number) - p.v0Sv) / p.cSv;
  const pPa = (s[7] as number) / p.cPa + pit + ct + cr;
  const pPv = (s[8] as number) / p.cPv + pit + ct + cr;
  const pc = s[0] as number;
  const ql = s[1] as number;
```

#### Modify `packages/engine-core/src/l2/circ/baroreflex.ts`

Edit 1 — find:

```ts
 */
export const K_PP = 0.3;

export interface BaroState {
```

replace with:

```ts
 */
export const K_PP = 0.3;
/**
 * FU-4 F1(b): brainstem perfusion of the vasomotor centre. The neural arm is intact while cerebral flow is at or above
 * `CBF_REFLEX_FULL` of normal and gone once it falls to `CBF_REFLEX_ZERO`; between them it fails linearly. During an
 * arrest the reflex therefore withdraws instead of holding SVR at its ceiling for the whole resuscitation, and the
 * relaxation-phase aortic pressure is set by intrinsic tone plus circulating catecholamines (Paradis 1990's CPP band).
 * Same signal as E-FU3-10's respiratory gate (7d `brain.cbfRel`), which closes at 0.2 [ENG thresholds].
 */
export const CBF_REFLEX_FULL = 0.9;
export const CBF_REFLEX_ZERO = 0.2;
/** FU-4 F1(b): × on the delivered sympathetic output from brainstem perfusion (1 when 7d is absent). */
export function brainstemOutF(cbfRel: number | undefined): number {
  if (cbfRel === undefined || !Number.isFinite(cbfRel)) return 1;
  return Math.min(1, Math.max(0, (cbfRel - CBF_REFLEX_ZERO) / (CBF_REFLEX_FULL - CBF_REFLEX_ZERO)));
}

export interface BaroState {
```

Edit 2 — find:

```ts
  /** FU-4 G2: × on the set point the error is taken against (anaesthetic resetting; 1 = none). */
  setF?: number;
}
```

replace with:

```ts
  /** FU-4 G2: × on the set point the error is taken against (anaesthetic resetting; 1 = none). */
  setF?: number;
  /**
   * FU-4 F1(b): × on the delivered sympathetic output from BRAINSTEM PERFUSION. The vasomotor centre is itself
   * perfused: once cerebral flow collapses the neural arm fails and arrest SVR falls to intrinsic × circulating
   * catecholamines, instead of a reflex that stays saturated through the whole arrest (1 = intact).
   */
  brainF?: number;
}
```

Edit 3 — find:

```ts
  }
  const scp = g.gSymp * (ecp < 0 ? SYMP_WITHDRAW : 1);
  const o = g.outF ?? 1; // FU-4 G2: the delivered sympathetic output, after each factor's saturation
  return {
    rrMs: Math.min(VAGAL_MAX_MS, Math.max(-VAGAL_WITHDRAW_MS, -VAGAL_STEADY * g.gVagal * b.ev)),
```

replace with:

```ts
  }
  const scp = g.gSymp * (ecp < 0 ? SYMP_WITHDRAW : 1);
  const o = (g.outF ?? 1) * (g.brainF ?? 1); // FU-4 G2 + F1(b): the delivered output, after each factor's saturation
  return {
    rrMs: Math.min(VAGAL_MAX_MS, Math.max(-VAGAL_WITHDRAW_MS, -VAGAL_STEADY * g.gVagal * b.ev)),
```

#### Modify `packages/engine-core/src/l2/circ/coronary.ts`

Edit 1 — find:

```ts
export const D_BASAL = 0.15;
export const D_EC = 0.2;
/** FU-4 G1: myocardial O2 demand of a non-ejecting heart relative to rest (basal + E–C: VF, PEA, asystole under CPR) [ENG]. */
export const DEMAND_ARREST = D_BASAL + D_EC;
/** FU-4 G1/G4: rhythms with no mechanical systole (the pulseless flag marks PEA on organised rhythms). */
export const NO_BEAT_RHYTHMS: ReadonlySet<string> = new Set(['asystole', 'pWaveAsystole', 'vfCoarse', 'vfFine', 'vtPoly', 'torsades', 'agonal']);
/** FU-4 G1/G4: what the coronary step uses when the heart is not beating: the continuous CPP (Paradis's relaxation-phase
 * aortic − right-atrial pressure, model.ts `cppAcc`) and the fraction of the cycle it perfuses (CPR relaxation, or 1). */
export interface NoBeat {
  cpp: number;
  dtf: number;
}
```

replace with:

```ts
export const D_BASAL = 0.15;
export const D_EC = 0.2;
/** FU-4 G1: myocardial O2 demand of a non-ejecting heart relative to rest (basal + E–C: PEA, asystole under CPR) [ENG]. */
export const DEMAND_ARREST = D_BASAL + D_EC;
/**
 * FU-4 F1(d): FIBRILLATING myocardium is not an arrested one — every myofibril contracts continuously and
 * asynchronously, so its MVO2 stays near the working heart's rather than at the basal + E–C share. Measured: with
 * `DEMAND_ARREST` for VF too, CPR at CPP 22–29 repaid the whole debt and `kIsch` recovered 0.84 → 1.00 within 4 min,
 * so a shock after 10 min of VF found a pristine myocardium and D2's three-phase rationale did not hold [ENG size;
 * VF MVO2 reported at roughly half to all of the beating heart's: Suga 1990's PVA–MVO2 relation, the unloaded
 * fibrillating preparations of Gibbs 1978].
 */
export const DEMAND_VF = 0.75;
/** FU-4 G1/G4: rhythms with no mechanical systole (the pulseless flag marks PEA on organised rhythms). */
export const NO_BEAT_RHYTHMS: ReadonlySet<string> = new Set(['asystole', 'pWaveAsystole', 'vfCoarse', 'vfFine', 'vtPoly', 'torsades', 'agonal']);
/** FU-4 F1(d): the fibrillating subset of NO_BEAT_RHYTHMS — continuous asynchronous contraction, not an arrested heart. */
export const VF_RHYTHMS: ReadonlySet<string> = new Set(['vfCoarse', 'vfFine', 'vtPoly', 'torsades']);
/** FU-4 G1/G4: what the coronary step uses when the heart is not beating: the continuous CPP (Paradis's relaxation-phase
 * aortic − right-atrial pressure, model.ts `cppAcc`) and the fraction of the cycle it perfuses (CPR relaxation, or 1). */
export interface NoBeat {
  cpp: number;
  dtf: number;
  /** FU-4 F1(d): the non-beating rhythm is ventricular fibrillation (continuous asynchronous contraction). */
  vf?: boolean;
}
```

Edit 2 — find:

```ts
    cpp = noBeat?.cpp ?? 0;
    dtf = noBeat?.dtf ?? 1;
    demand = DEMAND_ARREST;
  } else {
    const rr = 60 / Math.max(20, hr);
```

replace with:

```ts
    cpp = noBeat?.cpp ?? 0;
    dtf = noBeat?.dtf ?? 1;
    demand = noBeat?.vf ? DEMAND_VF : DEMAND_ARREST; // FU-4 F1(d)
  } else {
    const rr = 60 / Math.max(20, hr);
```

#### Modify `packages/engine-core/src/l2/circ/model.ts`

Edit 1 — find:

```ts
// inside the 20 ms tick; everything is plain JSON-safe data (the engine clones it every tick for the look-ahead).
import { activationPeriodS, pruneActivations, type Activation } from './activation.ts';
import { createBaro, K_PP, stepBaro, V0_RECRUIT_MAX_ML_KG, type BaroState } from './baroreflex.ts'; // FU-2 F4: V0_RECRUIT_MAX_ML_KG
import { createOut, evaluate, S, stepCirc, type CircDrive, type CircOut, type CircParams } from './circuit.ts';
import { bolusScale, drugEffect, pruneBoluses, type Bolus, type DrugEffect, type DrugId } from './drugs.ts';
```

replace with:

```ts
// inside the 20 ms tick; everything is plain JSON-safe data (the engine clones it every tick for the look-ahead).
import { activationPeriodS, pruneActivations, type Activation } from './activation.ts';
import { brainstemOutF, createBaro, K_PP, stepBaro, V0_RECRUIT_MAX_ML_KG, type BaroState } from './baroreflex.ts'; // FU-2 F4: V0_RECRUIT_MAX_ML_KG; FU-4 F1(b): brainstemOutF
import { createOut, evaluate, S, stepCirc, type CircDrive, type CircOut, type CircParams } from './circuit.ts';
import { bolusScale, drugEffect, pruneBoluses, type Bolus, type DrugEffect, type DrugId } from './drugs.ts';
```

Edit 2 — find:

```ts
    rSysF?: number; hrF?: number; // R48 (7d, Cushing response): systemic resistance and HR set-point multipliers
    endoHrF?: number; endoSvrF?: number; endoEesF?: number; endoDV0Frac?: number; // R49 (7e endocrine stress response)
    kChem?: number; // 7c: blood-chemistry contractility multiplier (K, Ca, pH) on all four chambers, default 1
    kEcg?: number; // FU-4 G3 (7c): the membrane-effective K (calcium-stabilised), mmol/L — sinus node and the arrest hazard
    tempC?: number; // FU-4 G12 (engine, from Stage 3/7e): core temperature for the hypothermic VF hazard
    drug?: DrugEffect; betaBlockAdd?: number; // Stage 7g: the PK/PD layer's multipliers
```

replace with:

```ts
    rSysF?: number; hrF?: number; // R48 (7d, Cushing response): systemic resistance and HR set-point multipliers
    endoHrF?: number; endoSvrF?: number; endoEesF?: number; endoDV0Frac?: number; // R49 (7e endocrine stress response)
    endoHumDV0Frac?: number; // FU-4 F2(a) (7e): the humoral arm's venous recruitment, fraction of blood volume (− = venoconstriction)
    kChem?: number; // 7c: blood-chemistry contractility multiplier (K, Ca, pH) on all four chambers, default 1
    kEcg?: number; // FU-4 G3 (7c): the membrane-effective K (calcium-stabilised), mmol/L — sinus node and the arrest hazard
    cbfRel?: number; // FU-4 F1(b) (7d): relative cerebral blood flow — the brainstem perfusion of the vasomotor centre
    tempC?: number; // FU-4 G12 (engine, from Stage 3/7e): core temperature for the hypothermic VF hazard
    drug?: DrugEffect; betaBlockAdd?: number; // Stage 7g: the PK/PD layer's multipliers
```

(The same edit declares `endoHumDV0Frac`, which Task 18e writes: one `ext` block, one edit.)

Edit 3 — find:

```ts
  cprCardiac: (t: number) => number;
  cprThoracic: (t: number) => number;
  qVad: (lvp: number, aop: number) => number;
  qAortaSrc: (t: number) => number;
```

replace with:

```ts
  cprCardiac: (t: number) => number;
  cprThoracic: (t: number) => number;
  cprRelease: (t: number) => number;
  qVad: (lvp: number, aop: number) => number;
  qAortaSrc: (t: number) => number;
```

Edit 4 — find:

```ts
const NEUTRAL_MAN = { eesF: 1, rSys: null, dV0: 0, eesRvF: 1, pvr: null, kIschRef: 1 } as const;
const zero = () => 0;
export const RESTING_ENV: CircEnv = { pIt: () => P_PL0, cprCardiac: zero, cprThoracic: zero, qVad: () => 0, qAortaSrc: zero, modeled: true };

/** Chemoreflex → circulation (B §4.9; tables §1.1). Hypoxic HR sign by age band; hypercapnic pressor response. */
```

replace with:

```ts
const NEUTRAL_MAN = { eesF: 1, rSys: null, dV0: 0, eesRvF: 1, pvr: null, kIschRef: 1 } as const;
const zero = () => 0;
export const RESTING_ENV: CircEnv = { pIt: () => P_PL0, cprCardiac: zero, cprThoracic: zero, cprRelease: zero, qVad: () => 0, qAortaSrc: zero, modeled: true };

/** Chemoreflex → circulation (B §4.9; tables §1.1). Hypoxic HR sign by age band; hypercapnic pressor response. */
```

Edit 5 — find:

```ts
    ? stepBaro(m.baro, sensed, { gVagal: m.prof.gVagal * de.gv, gSymp: m.prof.gSymp * de.gv, betaBlock: Math.min(0.95, m.prof.betaBlock + (m.ext.betaBlockAdd ?? 0) * (1 - m.prof.betaBlock)), betaBlockC: Math.min(0.95, m.prof.betaBlockC + (m.ext.betaBlockAdd ?? 0) * (1 - m.prof.betaBlockC)), hrGain: de.gvHr, weightScale: w, pinnedSet: m.mapSetPinned, outF: de.symp, setF: de.setF }, raTm)
```

replace with:

```ts
    ? stepBaro(m.baro, sensed, { gVagal: m.prof.gVagal * de.gv, gSymp: m.prof.gSymp * de.gv, betaBlock: Math.min(0.95, m.prof.betaBlock + (m.ext.betaBlockAdd ?? 0) * (1 - m.prof.betaBlock)), betaBlockC: Math.min(0.95, m.prof.betaBlockC + (m.ext.betaBlockAdd ?? 0) * (1 - m.prof.betaBlockC)), hrGain: de.gvHr, weightScale: w, pinnedSet: m.mapSetPinned, outF: de.symp, setF: de.setF, brainF: brainstemOutF(m.ext.cbfRel) }, raTm)
```

Edit 6 — find:

```ts
  };
  const d: CircDrive = {
    vent: m.vent, atria: m.atria, kLv: m.kLv, kRv: m.kRv, pIt, cprCardiac: env.cprCardiac, cprThoracic: env.cprThoracic,
    qIn: 0, qVad: env.qVad, qAortaSrc: env.qAortaSrc,
  };
```

replace with:

```ts
  };
  const d: CircDrive = {
    vent: m.vent, atria: m.atria, kLv: m.kLv, kRv: m.kRv, pIt, cprCardiac: env.cprCardiac, cprThoracic: env.cprThoracic, cprRelease: env.cprRelease,
    qIn: 0, qVad: env.qVad, qAortaSrc: env.qAortaSrc,
  };
```

#### Modify `packages/engine-core/src/l2/circ/stabilise.ts`

Edit 1 — find:

```ts
  let atria: Activation[] = [];
  const d: CircDrive = {
    vent, atria, kLv: 1, kRv: 1, pIt: () => P_PL0, cprCardiac: zero, cprThoracic: zero, qIn: 0, qVad: () => 0, qAortaSrc: zero,
  };
  const o = createOut();
```

replace with:

```ts
  let atria: Activation[] = [];
  const d: CircDrive = {
    vent, atria, kLv: 1, kRv: 1, pIt: () => P_PL0, cprCardiac: zero, cprThoracic: zero, cprRelease: zero, qIn: 0, qVad: () => 0, qAortaSrc: zero,
  };
  const o = createOut();
```

#### Modify `packages/engine-core/src/l2/organs/effects.ts`

Edit 1 — find:

```ts
    // R51 addendum 14: never test for the key — 7a's ext initialiser omits the optional keys
    ext.rSysF = 1 + CUSH_SVR_GAIN * drive; // the bradycardia is the baroreflex's own answer (Cushing's triad): no hrF
    return;
  }
```

replace with:

```ts
    // R51 addendum 14: never test for the key — 7a's ext initialiser omits the optional keys
    ext.rSysF = 1 + CUSH_SVR_GAIN * drive; // the bradycardia is the baroreflex's own answer (Cushing's triad): no hrF
    ext.cbfRel = b.cbfRel; // FU-4 F1(b): brainstem perfusion — the vasomotor centre's own supply (E-FU3-10's signal)
    return;
  }
```

#### Modify `packages/engine-core/src/l2/hemo/pipeline.ts`

Edit 1 — find:

```ts
import { hypoxicArrestRequest } from '../circ/hypoxic-arrest.ts'; // FU-3 item 16
import { arrestStep, roscStep } from '../circ/arrest.ts'; // FU-4 G1
import { effectiveRateBpm } from '../ecg/rhythms.ts'; // FU-2
import { CPR_CARDIAC_MMHG, CPR_THORACIC_MMHG as CPR_THORACIC_7A, H_S as CIRC_H, P_PL0 } from '../circ/params.ts'; // Stage 7a
```

replace with:

```ts
import { hypoxicArrestRequest } from '../circ/hypoxic-arrest.ts'; // FU-3 item 16
import { arrestStep, peaDecayStep, roscStep } from '../circ/arrest.ts'; // FU-4 G1; F5: peaDecayStep
import { effectiveRateBpm } from '../ecg/rhythms.ts'; // FU-2
import { CPR_CARDIAC_MMHG, CPR_RELEASE_RESIDUAL, CPR_THORACIC_MMHG as CPR_THORACIC_7A, H_S as CIRC_H, P_PL0 } from '../circ/params.ts'; // Stage 7a
```

(`peaDecayStep` is imported here and used by Task 18b: one import line, one edit.)

Edit 2 — find:

```ts
import { NO_BEAT_RHYTHMS, SAO2_REF, stepCoronary, stPatchOf } from '../circ/coronary.ts'; // Stage 7a (FU-3 item 16: SAO2_REF; FU-4 G4: NO_BEAT_RHYTHMS)
```

replace with:

```ts
import { NO_BEAT_RHYTHMS, SAO2_REF, stepCoronary, stPatchOf, VF_RHYTHMS } from '../circ/coronary.ts'; // Stage 7a (FU-3 item 16: SAO2_REF; FU-4 G4: NO_BEAT_RHYTHMS; F1(d): VF_RHYTHMS)
```

Edit 3 — find:

```ts
    pIt: pleuralSource(ctx),
    cprCardiac: (t) => CPR_CARDIAC_MMHG * cprPressure(hs.cpr, t),
    cprThoracic: (t) => CPR_THORACIC_7A * cprPressure(hs.cpr, t), qVad: (lvp, aop) => lvadFlow(hs.lvad, lvp, aop, hs.circ.s[10] as number), qAortaSrc: (t) => iabpFlow(hs.iabp, t), modeled: ctx.l1.mode === 'modeled' };
}
```

replace with:

```ts
    pIt: pleuralSource(ctx),
    cprCardiac: (t) => CPR_CARDIAC_MMHG * cprPressure(hs.cpr, t),
    cprThoracic: (t) => CPR_THORACIC_7A * cprPressure(hs.cpr, t),
    // FU-4 F1(c): incomplete recoil — a residual thoracic pressure on the venous side through the release phase
    cprRelease: (t) => (hs.cpr.active ? CPR_THORACIC_7A * CPR_RELEASE_RESIDUAL * hs.cpr.quality : 0),
    qVad: (lvp, aop) => lvadFlow(hs.lvad, lvp, aop, hs.circ.s[10] as number), qAortaSrc: (t) => iabpFlow(hs.iabp, t), modeled: ctx.l1.mode === 'modeled' };
}
```

Edit 4 — find:

```ts
  const cppCont = c.cppAcc.n > 0 ? c.cppAcc.sum / c.cppAcc.n : 0;
  c.cppAcc = { sum: 0, n: 0 };
  stepCoronary(c.cor, c.beats, c.prof.cfr, 1, 60 / Math.max(0.2, hs.lastRR), ctx.l1.mode === 'modeled' ? Math.min(1, c.chemo.sao2 / SAO2_REF) : 1, noBeat ? { cpp: cppCont, dtf: hs.cpr.active ? 1 - CPR_DUTY : 1 } : undefined, ctx.l1.mode === 'modeled'); // FU-3 item 16: O2 content in the supply (MODELED); FU-4 G1/G4: the no-beat CPP, MODELED balance
  // FU-3 item 16 (R50 review finding 1): a pulseless heart is not reperfused, so its hypoxic depression (and the
  // SA-node depression it drives) is held, never unwound, while the rhythm is pulseless (FU-4 G1: unless CPR perfuses it)
```

replace with:

```ts
  const cppCont = c.cppAcc.n > 0 ? c.cppAcc.sum / c.cppAcc.n : 0;
  c.cppAcc = { sum: 0, n: 0 };
  stepCoronary(c.cor, c.beats, c.prof.cfr, 1, 60 / Math.max(0.2, hs.lastRR), ctx.l1.mode === 'modeled' ? Math.min(1, c.chemo.sao2 / SAO2_REF) : 1, noBeat ? { cpp: cppCont, dtf: hs.cpr.active ? 1 - CPR_DUTY : 1, vf: VF_RHYTHMS.has(ctx.rhythm.id) } : undefined, ctx.l1.mode === 'modeled'); // FU-3 item 16: O2 content in the supply (MODELED); FU-4 G1/G4: the no-beat CPP, MODELED balance
  // FU-3 item 16 (R50 review finding 1): a pulseless heart is not reperfused, so its hypoxic depression (and the
  // SA-node depression it drives) is held, never unwound, while the rhythm is pulseless (FU-4 G1: unless CPR perfuses it)
```

#### Modify `packages/engine-core/test/l2/circ/circuit.test.ts`

Edit 1 — find:

```ts
const zero = () => 0;
function drive(): CircDrive {
  return { vent: [], atria: [], kLv: 1, kRv: 1, pIt: () => P_PL0, cprCardiac: zero, cprThoracic: zero, qIn: 0, qVad: () => 0, qAortaSrc: zero };
}
```

replace with:

```ts
const zero = () => 0;
function drive(): CircDrive {
  return { vent: [], atria: [], kLv: 1, kRv: 1, pIt: () => P_PL0, cprCardiac: zero, cprThoracic: zero, cprRelease: zero, qIn: 0, qVad: () => 0, qAortaSrc: zero };
}
```

- [x] **Step 3: the tests the ruling names.**
  - **S13 (clinical suite) flips to `it`** with the band it already carries, 15–25 (Paradis 1990). This is not a band
    change (R45): the band was already in S13's title; only the `it.fails` marker and the measured number go.
  - **New, clinical suite:** "CPR alone after full exsanguination (3 L, no volume given): NO pulse in 10 min" —
    `own SV` stays 0 and `cor.cpp` < 10. **The rig must be FULL exsanguination**: an incidental prototype finding is
    that CPR started at the moment of arrest in a still-bleeding patient (2.3 of 3 L out) DOES restore a pulse, because
    the volume factor is still large — which is correct physiology, not a defect.
  - **New:** "CPR + 2 L + adrenaline 1 mg: a pulse returns" — measured **220 s** after CPR starts with the 2 L given
    over 300 s, so the existing "within 3 min" wording needs 4 min or a faster bolus. Use 4 min and say why.
  - **New:** "10 min of VF with CPR alone: `kIsch` stays < 0.9" — measured **0.56**. With adrenaline it reaches 0.90 at
    10 min, so the assertion is on CPR alone and the adrenaline number is recorded in the gate note (adrenaline raising
    CPP is Paradis's own finding).
  - **`circ-lowflow-arrest`'s ROSC assertion gains an upper bound of 25** on the CPR CPP (it asserted only ≥ 15, which
    is why the 43–52 error passed).
- [x] **Step 4: re-measure what CPR feeds.** `cpr-etco2` (R39-2) and FU-3's reversal window; the audit's X1 row; the
  `tick-bench` p50 (the volume factor is one sum per 2 ms sub-step only while CPR runs). Record all four in the gate
  note. Run `test/l2/circ`, `test/engine/circ-*`, `test/engine/cpr-*`. Commit and push
  (`fix(circ): CPR compression acts on volume; brainstem withdrawal; Paradis CPP band (FU-4 F1, ruling 3)`).

### Task 18b: the untreated PEA decays — rate, then idioventricular, then asystole; CPR suspends it (7a; ruling 7 / review F5; PROTOTYPED; needs 18a)

**Files:**
- Modify (7a): `packages/engine-core/src/l2/circ/arrest.ts` (the decay step and its constants; `roscStep` accepts the
  idioventricular phase back), `packages/engine-core/src/l2/circ/model.ts` (`arrest.rate0`/`rateNow`),
  `packages/engine-core/src/l2/hemo/pipeline.ts` (the 1 Hz call, through the one `requestRhythm` path — E-FU3-8)
- Modify (tests): `packages/engine-core/test/l2/circ/arrest.test.ts` (the two `arrest` literals; new decay tests)

**Interfaces:** `CircModelState.arrest` gains `rate0` (the rate at onset) and `rateNow`; `peaDecayStep(m, rhythmId,
pulseless, cpp, u, dt): ArrestRequest | null`.

**Why (ruling 7; review F5).** In the applied tree an engine-declared PEA never evolved: measured "sinus" PEA 84 →
30/min over 5 min and then **flat at 30/min for 20 min**, with no idioventricular rhythm and no asystole unless the 2/30
onset draw produced one. Untreated PEA deteriorates; that is the whole reason the ALS algorithm is a clock. The rate
follows the myocardial energy state the ROSC path already uses (`kIsch·(1 − hyp)`), the rhythm then becomes a slow wide
idioventricular one, and asystole follows as a hazard. Effective CPR (CPP ≥ `CPP_ROSC`) suspends it. Sources:
Weisfeldt & Becker 2002 (the three-phase model) [P]; DeBehnke 1995 and Varvarousi 2011/2015 (the asphyxial PEA →
asystole course FU-3 already cites) [P]; ERC 2021 ALS [P]. Thresholds and the hazard mean are [ENG].

**Two defects the first cut exposed** — both are in the code below and must not be "simplified" away:
- `agonal` is in `NO_BEAT_RHYTHMS`, so the decay's own guard stopped the idioventricular phase from ever reaching
  asystole. The `agonal` branch is therefore tested BEFORE that guard.
- `roscStep` refused `agonal` as "VF needs a shock", so a patient who had decayed could never come back. The
  idioventricular phase is reversible: effective CPR returns it to `a.from`, the rhythm it decayed from.

**Prototype results (exsanguination PEA, seed 7).** Untreated: PEA (pulseless sinus) at 525 s → rate to 18 →
**idioventricular (`agonal`) at +110 s → asystole at +260 s**. With effective CPR + 2 L + adrenaline (CPP 29, m → 1.00):
**no decay at all through 30 min**. Constants: `PEA_RATE_M_FULL` 0.4, `PEA_RATE_MIN` 18, `PEA_IDIO_M` **0.04**
(deliberately BELOW `K_ISCH_ARREST` 0.1, so the PEA has a rate-decay phase of its own first), `PEA_IDIO_RATE` 24,
`PEA_ASYSTOLE_MEAN_S` 420.

- [x] **Step 1: the decay step.**

#### Modify `packages/engine-core/src/l2/circ/model.ts`

Edit 1 — find:

```ts
  mapNow: number;
  /** FU-4 G1: the arrest this model declared (cause, time, the organised rhythm it came from), null while beating. */
  arrest: { cause: string; t: number; from: string; roscS: number } | null;
  noFlowS: number; // FU-4 G1: seconds the continuous MAP has been below arrest.ts MAP_NO_FLOW
  saF: number; // FU-4 (G-FU3 ruling 1): the sinus-node factor of the last control step (MODELED; 1 in MANUAL) — the escape foci follow it
```

replace with:

```ts
  mapNow: number;
  /** FU-4 G1: the arrest this model declared (cause, time, the organised rhythm it came from), null while beating. */
  arrest: { cause: string; t: number; from: string; roscS: number; rate0: number; rateNow: number } | null; // FU-4 F5: rate0/rateNow drive the PEA decay
  noFlowS: number; // FU-4 G1: seconds the continuous MAP has been below arrest.ts MAP_NO_FLOW
  saF: number; // FU-4 (G-FU3 ruling 1): the sinus-node factor of the last control step (MODELED; 1 in MANUAL) — the escape foci follow it
```

#### Modify `packages/engine-core/src/l2/circ/arrest.ts`

Edit 1 — find:

```ts
  return { id: 'vfCoarse', opts: {}, cause: r.tempC > T_HOT ? 'hyperthermia' : 'hypothermia' };
}

/** ROSC of an engine-declared organised arrest (PEA): the rhythm it came from, with a pulse, or null. */
export function roscStep(m: CircModelState, rhythmId: string, pulseless: boolean, cpp: number, dt: number): { id: RhythmId; opts: RhythmOpts } | null {
```

replace with:

```ts
  return { id: 'vfCoarse', opts: {}, cause: r.tempC > T_HOT ? 'hyperthermia' : 'hypothermia' };
}

/**
 * FU-4 F5 (ruling 7) — an untreated organised PEA DECAYS. Before this, an engine-declared PEA kept the organised
 * rhythm at its onset rate for ever: measured "sinus" PEA 84 → 30/min over 5 min and then flat at 30/min for 20 min,
 * with no idioventricular phase and no asystole unless the 2/30 onset draw produced one.
 * The course: the rate follows the myocardial energy state `kIsch·(1 − hyp)` (the ROSC variable), then below
 * `PEA_IDIO_M` the rhythm is requested as a slow wide idioventricular/agonal one, and from there asystole arrives as a
 * hazard with a mean of `PEA_ASYSTOLE_MEAN_S` untreated. An effective CPP (≥ `CPP_ROSC`) suspends the whole decay,
 * which is what makes good CPR worth doing.
 * Sources: the three-phase model of cardiac arrest (Weisfeldt ML & Becker LB, JAMA 2002;288:3035–3038); the asphyxial
 * PEA → asystole course FU-3 already cites (DeBehnke DJ et al. 1995; Varvarousi G et al. 2011/2015); ERC 2021 ALS
 * (untreated PEA deteriorates to asystole). Thresholds and the hazard mean are [ENG].
 */
export const PEA_RATE_M_FULL = 0.4; // myocardial state at or above which the PEA keeps its onset rate
export const PEA_RATE_MIN = 18; // slowest organised rate the decay drives the PEA to before the idioventricular phase
export const PEA_IDIO_M = 0.04; // myocardial state below which the rhythm becomes a slow wide idioventricular one (BELOW
// K_ISCH_ARREST 0.1, so the PEA has a rate-decay phase of its own before the idioventricular one)
export const PEA_IDIO_RATE = 24;
export const PEA_ASYSTOLE_MEAN_S = 420; // mean time from the idioventricular phase to asystole, untreated [ENG: 5–10 min]

/**
 * FU-4 F5: one 1 Hz step of the decay of an engine-declared organised PEA. Returns a rhythm request (a slower rate, the
 * idioventricular rhythm, or asystole) or null. It goes through the caller's single `requestRhythm` path (E-FU3-8).
 * `u` draws one uniform from the outcome stream.
 */
export function peaDecayStep(m: CircModelState, rhythmId: string, pulseless: boolean, cpp: number, u: () => number, dt: number): ArrestRequest | null {
  const a = m.arrest;
  if (!a) return null;
  if (cpp >= CPP_ROSC) return null; // effective CPR suspends the decay (the ROSC path handles recovery)
  if (rhythmId === 'agonal') {
    // the idioventricular phase: asystole as a hazard with a mean of PEA_ASYSTOLE_MEAN_S
    return u() < dt / PEA_ASYSTOLE_MEAN_S ? { id: 'asystole', opts: {}, cause: a.cause } : null;
  }
  if (!pulseless || NO_BEAT_RHYTHMS.has(rhythmId)) return null; // VF and asystole are not organised; a pulse ends it
  const ms = m.cor.kIsch * (1 - m.cor.hyp);
  if (ms < PEA_IDIO_M) return { id: 'agonal', opts: { pulseless: true, rateBpm: PEA_IDIO_RATE }, cause: a.cause };
  const want = Math.round(Math.max(PEA_RATE_MIN, a.rate0 * Math.min(1, Math.max(0, ms / PEA_RATE_M_FULL))));
  return want < a.rateNow - 1 ? { id: rhythmId as RhythmId, opts: { pulseless: true, rateBpm: want }, cause: a.cause } : null;
}

/** ROSC of an engine-declared organised arrest (PEA): the rhythm it came from, with a pulse, or null. */
export function roscStep(m: CircModelState, rhythmId: string, pulseless: boolean, cpp: number, dt: number): { id: RhythmId; opts: RhythmOpts } | null {
```

Edit 2 — find:

```ts
    return null;
  }
  if (NO_BEAT_RHYTHMS.has(rhythmId)) return null; // VF needs a shock; asystole stays (Q3)
  const ok = cpp >= CPP_ROSC && m.cor.kIsch * (1 - m.cor.hyp) >= M_ROSC;
  a.roscS = ok ? a.roscS + dt : 0;
  if (a.roscS < ROSC_HOLD_S) return null;
  m.arrest = null;
  return { id: rhythmId as RhythmId, opts: {} };
}
```

replace with:

```ts
    return null;
  }
  // FU-4 F5: the idioventricular phase of the decay is reversible — effective CPR can bring it back to the organised
  // rhythm it decayed FROM. VF still needs a shock and asystole still stays (Q3).
  const idio = rhythmId === 'agonal';
  if (NO_BEAT_RHYTHMS.has(rhythmId) && !idio) return null;
  const ok = cpp >= CPP_ROSC && m.cor.kIsch * (1 - m.cor.hyp) >= M_ROSC;
  a.roscS = ok ? a.roscS + dt : 0;
  if (a.roscS < ROSC_HOLD_S) return null;
  m.arrest = null;
  return { id: (idio ? a.from : rhythmId) as RhythmId, opts: {} };
}
```

#### Modify `packages/engine-core/src/l2/hemo/pipeline.ts`

Edit 1 — find:

```ts
    const req = hx ? { ...hx, cause: 'hypoxia' } : arrestStep(c, ctx.rhythm.id, pulseless, hrNow, u, 1);
    if (req) {
      c.arrest = { cause: req.cause, t, from: ctx.rhythm.id, roscS: 0 };
      ctx.requestRhythm(req.id, req.opts);
    } else {
      const back = roscStep(c, ctx.rhythm.id, pulseless, cppCont, 1);
      if (back) ctx.requestRhythm(back.id, back.opts);
    }
  }
```

replace with:

```ts
    const req = hx ? { ...hx, cause: 'hypoxia' } : arrestStep(c, ctx.rhythm.id, pulseless, hrNow, u, 1);
    if (req) {
      const r0 = req.opts.rateBpm ?? Math.round(Math.max(20, hrNow));
      c.arrest = { cause: req.cause, t, from: ctx.rhythm.id, roscS: 0, rate0: r0, rateNow: r0 };
      ctx.requestRhythm(req.id, req.opts);
    } else {
      const back = roscStep(c, ctx.rhythm.id, pulseless, cppCont, 1);
      if (back) ctx.requestRhythm(back.id, back.opts);
      else {
        // FU-4 F5 (ruling 7): the untreated organised PEA decays — slower, then idioventricular, then asystole
        const dec = peaDecayStep(c, ctx.rhythm.id, pulseless, cppCont, u, 1);
        if (dec) {
          if (c.arrest) c.arrest.rateNow = dec.opts.rateBpm ?? c.arrest.rateNow;
          ctx.requestRhythm(dec.id, dec.opts);
        }
      }
    }
  }
```

#### Modify `packages/engine-core/test/l2/circ/arrest.test.ts`

Edit 1 — find:

```ts
  it(`needs CPP ≥ ${CPP_ROSC} and kIsch·(1 − hyp) ≥ ${M_ROSC} held ${ROSC_HOLD_S} s; then the same rhythm with a pulse`, () => {
    const m = createCircModel();
    m.arrest = { cause: 'lowFlow', t: 0, from: 'sinus', roscS: 0 };
    m.cor.kIsch = 0.5;
    expect(roscStep(m, 'sinus', true, CPP_ROSC - 1, 1)).toBeNull();
```

replace with:

```ts
  it(`needs CPP ≥ ${CPP_ROSC} and kIsch·(1 − hyp) ≥ ${M_ROSC} held ${ROSC_HOLD_S} s; then the same rhythm with a pulse`, () => {
    const m = createCircModel();
    m.arrest = { cause: 'lowFlow', t: 0, from: 'sinus', roscS: 0, rate0: 60, rateNow: 60 };
    m.cor.kIsch = 0.5;
    expect(roscStep(m, 'sinus', true, CPP_ROSC - 1, 1)).toBeNull();
```

Edit 2 — find:

```ts
  it('VF waits for a shock; a pulse returned another way clears the record', () => {
    const m = createCircModel();
    m.arrest = { cause: 'hyperkalaemia', t: 0, from: 'sinus', roscS: 0 };
    m.cor.kIsch = 1;
    for (let i = 0; i < 120; i++) expect(roscStep(m, 'vfCoarse', false, 40, 1)).toBeNull();
```

replace with:

```ts
  it('VF waits for a shock; a pulse returned another way clears the record', () => {
    const m = createCircModel();
    m.arrest = { cause: 'hyperkalaemia', t: 0, from: 'sinus', roscS: 0, rate0: 60, rateNow: 60 };
    m.cor.kIsch = 1;
    for (let i = 0; i < 120; i++) expect(roscStep(m, 'vfCoarse', false, 40, 1)).toBeNull();
```

- [x] **Step 2: the unit tests** (append a `describe('FU-4 F5: the PEA decays')` block to
  `test/l2/circ/arrest.test.ts`, using `createCircModel()` and a fixed `u`): the rate falls with `kIsch·(1 − hyp)` and
  never below `PEA_RATE_MIN`; `ms < PEA_IDIO_M` returns `agonal` with `pulseless: true`; from `agonal`, `u` below
  `dt / PEA_ASYSTOLE_MEAN_S` returns `asystole` and above it returns null; `cpp ≥ CPP_ROSC` returns null at every
  stage; `roscStep` from `agonal` returns `a.from`.
- [x] **Step 3: the engine tests.**
  - `circ-lowflow-arrest`: **"untreated exsanguination PEA reaches asystole within 15 min"** (measured 260 s after the
    idioventricular phase at this seed; the hazard mean is 420 s, so the course is ≈ 2–12 min across seeds) and
    **"with CPR + volume there is no decay before ROSC"**.
  - **The review's third test, "the PEA rate at 5 min < the rate at onset", cannot be asserted on this rig** and must
    not be forced onto it: the whole exsanguination course is over in 4.3 min. It belongs on the SLOWER hypoxic/apnoea
    PEA of `circ-hypoxic-arrest`. Put it there, with the rig named in the title.
- [x] **Step 4: re-measure** FU-3's apnoea course (I1) and the arrest table of the audit; record the new rhythm
  sequence in the gate note. Commit and push (`feat(circ): the untreated PEA decays to asystole (FU-4 F5, ruling 7)`).

### Task 18c: a tension pneumothorax builds per breath through a one-way valve (7b, E-FU4-16; ruling 1 / review F3; PROTOTYPED)

**Files:**
- Modify (7b, **E-FU4-16**): `packages/engine-core/src/l2/lung/params.ts` (the valve and drain constants)
- Modify (Stage 3 / 7b seam, **E-FU4-5** + **E-FU4-16**): `packages/engine-core/src/l2/resp/pipeline.ts`
  (`RespState.ptxAcc`/`ptxCeil`, `ptxStep()`, the ceiling in `applyLungSpecs`, the 250 Hz call)
- Create: `packages/engine-core/test/engine/tension-ptx.test.ts` (SLOW_B; three rigs, one yield per sim-minute)

**Interfaces:** `RespState.ptxAcc: number` (mmHg delivered), `RespState.ptxCeil: number` (the catalogue value, now the
CEILING), `ptxStep(rs, dt)`. **`lp.pPtx` keeps its name, its place and its unit (mmHg)** and now carries `ptxAcc` —
V.1's reader (`pleuralCmH2O`) and 7a's `ext.pPtx` are untouched, which is what the ruling requires.

**Why (ruling 1; review F3).** The catalogue's `set` put the whole 25 mmHg on inside one control step: applied-tree E1
and E2 were identical — onset at 60 s, MAP 35 and SV 4 mL at 120 s, **PEA at 120 s, 60 s after onset**. The orchestrator
ruled that wrong and ruled it a task, not a question: air accumulates through a one-way valve (per breath under PPV, per
gasp spontaneously), the pleural pressure rises over minutes, and obstructive shock and PEA belong at **3–10 min on
PPV**. Sources: the one-way-valve mechanism and the ventilated patient's rapid course (Leigh-Smith S & Harris T, Emerg
Med J 2005;22:8–16, tension pneumothorax — time for a re-think) [P]; ATLS 10th edn (tension pneumothorax: progressive,
decompression is immediate) [TXT]. Rates are [ENG], fit target: PEA 3–10 min after onset on PPV, slower when
spontaneous, decompression restores MAP ≥ 65 within 1 min (the audit's S8).

**An emergent property worth keeping, and the reason there is exactly ONE brake.** The only thing that stops the build-up
is the valve itself: air stops crossing once the pleural pressure reaches the PEAK ALVEOLAR pressure. So the pressure a
tension pneumothorax reaches is *bounded by the airway pressure* — which is exactly why it is a ventilated patient's
emergency. On the audit's VCV 12 × 600 / PEEP 5 the peak alveolar pressure is 25.9 cmH2O and the pleural pressure
plateaus at ≈ 20 mmHg, so the catalogue's 25 (severity 1) is never reached: it is now an upper CLAMP, not the delivered
value. A first cut that ALSO braked with a `(1 − acc/ceiling)` pressure–volume term reached only 16 of 25 mmHg in 24 min
— double-braking. **One brake is right; do not add the second.**

**Prototype results (seed 7):**

| rig | pPtx +60 s | plateau | course |
|---|---|---|---|
| **PPV** (VCV 12 × 600, PEEP 5) | 15.7 | 20.2 mmHg | MAP 79 → 59, CVP 21 → 25, CO 2.3 → 1.3, SpO2 85 → 54, EtCO2 23 → 17, **PEA at +535 s (8.9 min)** |
| spontaneous, no airway device | 15.1 | 19.3 mmHg | MAP holds 87–95, CO 3.7 → 2.8, SpO2 82 → 67, **no PEA in 24 min** |
| PPV, decompressed at +240 s (pPtx 19.4, MAP 58.6) | — | — | **MAP 64.4 at +5 s, 82.2 at +10 s** — S8's "MAP ≥ 65 within 1 min" met in 10 s |

Honest note the executor must keep in the gate note: the *pressure* build-up is nearly as fast spontaneously (the
spontaneous expiratory phase drives the valve too); what is much slower is the **haemodynamic** course, because the
spontaneous patient's venous return is not also being impeded by positive-pressure inspiration. The review's "slower
when spontaneous" holds for the outcome, not for the filling rate.

- [x] **Step 1: the valve.**

#### Modify `packages/engine-core/src/l2/lung/params.ts`

Edit 1 — find:

```ts
export const TAU_II_MAX = 0.3;
export const TAU_EXP_REF = 0.54; // healthy ventilation-weighted expiratory τ (prototype)
```

replace with:

```ts
export const TAU_II_MAX = 0.3;
export const TAU_EXP_REF = 0.54; // healthy ventilation-weighted expiratory τ (prototype)

/**
 * FU-4 F3 (ruling 1) — a TENSION pneumothorax is not a step. Air enters the pleural space through a ONE-WAY VALVE:
 * it flows in whenever the alveolar (or airway) pressure exceeds the pleural pressure and cannot come back out, so the
 * hemithorax pressure climbs breath by breath toward the catalogue ceiling (`ptxTension`'s `pPtx`, 15–25 mmHg at
 * severity 1) — fast on positive-pressure ventilation, much slower on spontaneous gasps, where inspiration is
 * NEGATIVE at the alveolus and only the expiratory phase drives the valve.
 * Before this the catalogue's `set` put the full 25 mmHg on within one control step and the patient was in PEA 60 s
 * after onset, which the orchestrator ruled wrong (obstructive shock and PEA belong at 3–10 min on PPV).
 * `lp.pPtx` keeps its name, place and unit (mmHg) — V.1 reads it.
 */
export const PTX_VALVE_PER_CMH2O_S = 0.12; // mmHg of pleural pressure gained per cmH2O of driving pressure per second [ENG, fit: obstructive shock and PEA 3–10 min after onset on PPV — measured 8.9 min]
export const PTX_DRAIN_TAU_S = 20; // decompression (severity → 0, or a chest drain): τ of the fall [ENG]
```

#### Modify `packages/engine-core/src/l2/resp/pipeline.ts`

Edit 1 — find:

```ts
import { circPtx, circSideFlows, writeCircPvr } from '../lung/circ-link.ts'; // Stage 7b
import { mechParams } from '../lung/side.ts'; // Stage 7b
import { lungStatePayload } from '../lung/state-event.ts'; // Stage 7b
import { LUNG_CONDITION_IDS, type LungClinicalEvent, type LungConditionSpec } from '../../types-lung.ts'; // Stage 7b
```

replace with:

```ts
import { circPtx, circSideFlows, writeCircPvr } from '../lung/circ-link.ts'; // Stage 7b
import { mechParams } from '../lung/side.ts'; // Stage 7b
import { chestWallPressure, unitPressure } from '../lung/mechanics.ts'; // FU-4 F3: the one-way valve's driving pressure
import { PTX_DRAIN_TAU_S, PTX_VALVE_PER_CMH2O_S } from '../lung/params.ts'; // FU-4 F3
import { lungStatePayload } from '../lung/state-event.ts'; // Stage 7b
import { LUNG_CONDITION_IDS, type LungClinicalEvent, type LungConditionSpec } from '../../types-lung.ts'; // Stage 7b
```

Edit 2 — find:

```ts
  recruit: { p: number; until: number } | null; // sustained-inflation manoeuvre in progress
  circPtx: number; // Stage 7b (Task 26): 7a's own ext.pPtx (mmHg), read at 10 Hz, for the max-combined pleural pressure
  out: EngineEvent[];
}
```

replace with:

```ts
  recruit: { p: number; until: number } | null; // sustained-inflation manoeuvre in progress
  circPtx: number; // Stage 7b (Task 26): 7a's own ext.pPtx (mmHg), read at 10 Hz, for the max-combined pleural pressure
  /** FU-4 F3: the tension pneumothorax's ACCUMULATED hemithorax pressure (mmHg) — what `lp.pPtx` delivers. */
  ptxAcc: number;
  /** FU-4 F3: the catalogue ceiling the accumulation climbs toward (mmHg, 0 = no pneumothorax). */
  ptxCeil: number;
  out: EngineEvent[];
}
```

Edit 3 — find:

```ts
    beats: [], beatSeq: -1, shownCo2: 0, lungKey: '', lungCore: '', lungT: -1e12, out: [],
    lung: createLung(resolveLung(profile?.lungConditions ?? [], pat.ibwKg).lp, pat.frcGaMl, 0.14, 140), // Stage 7b
    lungSpecs: [...(profile?.lungConditions ?? [])], rawEvent: 1, mainstemCmd: null, recruit: null, circPtx: 0,
  };
  applyLungSpecs(rs); // Stage 7b: mainstem from the profile's conditions
```

replace with:

```ts
    beats: [], beatSeq: -1, shownCo2: 0, lungKey: '', lungCore: '', lungT: -1e12, out: [],
    lung: createLung(resolveLung(profile?.lungConditions ?? [], pat.ibwKg).lp, pat.frcGaMl, 0.14, 140), // Stage 7b
    lungSpecs: [...(profile?.lungConditions ?? [])], rawEvent: 1, mainstemCmd: null, recruit: null, circPtx: 0, ptxAcc: 0, ptxCeil: 0,
  };
  applyLungSpecs(rs); // Stage 7b: mainstem from the profile's conditions
```

Edit 4 — find:

```ts
  const r = resolveLung(rs.lungSpecs, rs.pat.ibwKg, rs.rawEvent, rs.evlwiExtra ?? 0); // Stage 7c: + lung water
  const ls = rs.lung;
  ls.lp = r.lp;
  ls.mainstem = rs.mainstemCmd ?? (r.blocked.includes('L') ? 'right' : r.blocked.includes('R') ? 'left' : 'both');
```

replace with:

```ts
  const r = resolveLung(rs.lungSpecs, rs.pat.ibwKg, rs.rawEvent, rs.evlwiExtra ?? 0); // Stage 7c: + lung water
  const ls = rs.lung;
  // FU-4 F3: the catalogue value is the CEILING of the one-way-valve build-up, not the pressure itself. `lp.pPtx`
  // keeps its name, place and unit and now delivers the accumulated pressure (0 at onset).
  rs.ptxCeil = r.lp.pPtx;
  r.lp.pPtx = Math.min(rs.ptxAcc, rs.ptxCeil);
  ls.lp = r.lp;
  ls.mainstem = rs.mainstemCmd ?? (r.blocked.includes('L') ? 'right' : r.blocked.includes('R') ? 'left' : 'both');
```

Edit 5 — find:

```ts
  return { mode: 'flow', x: ((c.vt * Math.PI) / (2 * c.ti)) * Math.sin((Math.PI * u) / c.ti) };
}

/** Stage 7a seam: continuous pleural pressure (mmHg) for the circulation (audit R-B). */
export function respPleural(rs: RespState, t: number): number {
```

replace with:

```ts
  return { mode: 'flow', x: ((c.vt * Math.PI) / (2 * c.ti)) * Math.sin((Math.PI * u) / c.ti) };
}

/**
 * FU-4 F3 (ruling 1): one step of the tension pneumothorax's one-way valve. Air crosses while the alveolar pressure
 * exceeds the pleural pressure, and the hemithorax's pressure–volume relation makes the rise slow as it approaches the
 * catalogue ceiling. Under PPV the driving pressure is the whole inspiratory alveolar pressure, so the ceiling is
 * reached in minutes; a spontaneously breathing patient's inspiration is negative at the alveolus and only the
 * expiratory phase drives the valve, so it takes far longer — which is the clinical difference.
 */
export function ptxStep(rs: RespState, dt: number): void {
  const ceil = rs.ptxCeil;
  if (ceil <= 0) {
    if (rs.ptxAcc > 0) rs.ptxAcc = Math.max(0, rs.ptxAcc - (rs.ptxAcc * dt) / PTX_DRAIN_TAU_S);
    rs.lung.lp.pPtx = rs.ptxAcc;
    return;
  }
  const ls = rs.lung;
  const pcw = chestWallPressure(ls.mp, ls.mech);
  let pAlv = -Infinity;
  for (let u = 0; u < ls.mech.v.length; u++) pAlv = Math.max(pAlv, unitPressure(ls.mp, ls.mech, u, pcw));
  const pPl = rs.ptxAcc / CMH2O_TO_MMHG; // the pleural pressure the valve works against, in cmH2O
  const drive = Math.max(0, pAlv - pPl);
  // one brake only: the valve itself. Once the pleural pressure reaches the PEAK alveolar pressure no more air can
  // cross, so the pressure a tension pneumothorax reaches is bounded by the airway pressure — which is why it is a
  // ventilated patient's emergency. The catalogue value is the ceiling that bound is clamped to.
  if (drive > 0) rs.ptxAcc = Math.min(ceil, rs.ptxAcc + PTX_VALVE_PER_CMH2O_S * drive * dt);
  ls.lp.pPtx = rs.ptxAcc;
}

/** Stage 7a seam: continuous pleural pressure (mmHg) for the circulation (audit R-B). */
export function respPleural(rs: RespState, t: number): number {
```

Edit 6 — find:

```ts
    const ld = lungDrive(rs, t); // Stage 7b: mechanics at 250 Hz (4 sub-steps per sample)
    lungMechStep(rs.lung, ld.mode, ld.x, DT);
    while (rs.gasK * GAS_DT_S <= t + 1e-9) {
      gasStep(rs, ctx, rs.gasK * GAS_DT_S);
```

replace with:

```ts
    const ld = lungDrive(rs, t); // Stage 7b: mechanics at 250 Hz (4 sub-steps per sample)
    lungMechStep(rs.lung, ld.mode, ld.x, DT);
    ptxStep(rs, DT); // FU-4 F3: the one-way valve fills the pleural space breath by breath
    while (rs.gasK * GAS_DT_S <= t + 1e-9) {
      gasStep(rs, ctx, rs.gasK * GAS_DT_S);
```

- [x] **Step 2: keep the instantaneous path for scenarios that want a step.** The catalogue row keeps its `pPtx` value
  (now the ceiling) and a scenario that wants the old behaviour sets `rs.ptxAcc` to the ceiling directly (or the row
  carries a `rateMmHgPerMin` lead, as the review asked). Document which of the two the executor chose in the gate note;
  do not remove the option.
- [x] **Step 3: the tests** (`test/engine/tension-ptx.test.ts`; add it to the `SLOW` list in
  `packages/engine-core/vite.config.ts` beside the other FU-4 entries, which puts it in SLOW_B by Task 20's rule — and
  check the file header's group label matches, review F16; one yield per sim-minute): (i) PPV — pPtx rises
  monotonically and PEA arrives between 3 and 10 min after onset; (ii) spontaneous, same severity — no PEA in 15 min and
  the MAP course is slower than (i); (iii) decompression at 4 min — MAP ≥ 65 within 1 min and `lp.pPtx` decays with
  `PTX_DRAIN_TAU_S`. **S8 flips from `it.fails` to `it`** in the clinical suite (the band is unchanged; only the
  measured number in the title goes, with a "was PEA +60 s" clause — R45).
- [x] **Step 4: re-measure and hand on.** The audit's E1/E2 rows; the V.1 request list gains "the ventilator follows the
  accumulated `pPtx` through `pleuralCmH2O`" (V.1 plan l. 121 already anticipates it). Run `test/l2/lung`,
  `test/engine/lung-*`, `test/engine/vent-*`. Commit and push
  (`feat(lung): a tension pneumothorax builds through a one-way valve (FU-4 F3, ruling 1)`).

### Task 18d: the dead-space ROOT — calibrate only in MANUAL, the patient's own resting PaCO2, the ETT replaces the airway it bypasses (Stage 3, E-FU4-5 widened + E-FU4-17; FU-6's R1 ruled to FU-4 / review F4; PROTOTYPED)

**Files:**
- Modify (Stage 3, **E-FU4-5** widened): `packages/engine-core/src/l2/gas/params.ts` (`PACO2_REST_MMHG`,
  `ETT_BYPASS_ML_PER_KG`, `GasPatient.paco2Rest`), `packages/engine-core/src/l2/resp/pipeline.ts` (`deadSpace()`, the
  t = 0 calibration block)
- Modify (tests): `packages/engine-core/test/engine/neuro-spont.test.ts` (**E-FU4-17**: the REFERENCE pattern is
  re-derived; the criterion is unchanged), `packages/engine-core/test/engine/pk-bus.test.ts` (the VA flip — already in
  Task 15), `packages/engine-core/test/engine/organs-tbi.test.ts` (**E-FU4-8**: the rig RR re-derived AGAIN)

**Why (FU-6's R1, ruled to FU-4; review F4).** Task 15 removed the MANUAL EtCO2 fit for MODELED **mechanical**
ventilation only, which patched the adult 12 × 500 case and left the root. What remained:
- the t = 0 MANUAL EtCO2 calibration still ran in MODELED (`pipeline.ts`: `seen.etco2` changes → fit `vdExtraMl` from
  the L1 **adult** defaults RR 15 / VT 500 / EtCO2 36), so spontaneous MODELED women, children and elderly patients kept
  an adult's fit (respiratory audit R1: VD **265 / 329 / 459 / 314 mL**);
- it also set the MODELED drive's set point (`spont.paco2Rest = pf`), so a child's resting PaCO2 came from an adult's
  displayed EtCO2 (measured PaCO2 49–52 with EtCO2 18–19 shown);
- intubation still ADDED 50 mL of apparatus **without removing the upper airway the tube bypasses**, so a ventilated
  woman on 12 × 400 sat at **PaCO2 103 / pH 7.06**;
- switching from spontaneous to the ventilator changed dead space discontinuously (−61 mL in the man, more in the
  woman and child).

**The "7f break" is an artefact of the same calibration, not a physiological conflict** (this is why E-FU4-17 is a
*reference* exception and not a band change): `neuro-spont.test.ts` asserts that the drive holds the MANUAL resting
pattern (RR within 10 %, PaCO2 within 2) — and its reference IS the L1 adult default pattern that the t = 0 fit
enforced. Removing the fit changes VA at that pattern, so the drive moves RR by 10.5 %. The criterion ("the drive holds
the patient's OWN resting pattern") is kept; only the pattern it is measured against is re-derived.

Sources: Nunn's Applied Respiratory Physiology ch. 8 (anatomical dead space ≈ 2.2 mL/kg; ≈ 1.0–1.2 mL/kg of it
extrathoracic; an artificial airway bypasses that part) [TXT]; the apparatus volumes are the existing
`apparatusDeadSpaceMl` [ENG].

- [x] **Step 1: (a) calibrate only in MANUAL and take the resting PaCO2 from the patient; (b) the ETT bypass credit.**

#### Modify `packages/engine-core/src/l2/gas/params.ts`

Edit 1 — find:

```ts

export const ANAT_DEAD_SPACE_ML_PER_KG = 2.2; // brief §4.4
/** Y-piece + HME on a ventilator or BVM: 50 mL adult, 1.5 mL/kg below 33 kg (neonatal circuits) [ENG]. */
export function apparatusDeadSpaceMl(weightKg: number): number {
```

replace with:

```ts

export const ANAT_DEAD_SPACE_ML_PER_KG = 2.2; // brief §4.4
/** FU-4 F4 / R1(a): the healthy resting PaCO2 every profile starts from (pregnancy 31 under R10). */
export const PACO2_REST_MMHG = 40;
/**
 * FU-4 F4 / R1(b): an ETT or SGA BYPASSES the extrathoracic airway, so the apparatus does not simply add to the
 * anatomical dead space — it REPLACES the part of it the tube bypasses. Of the 2.2 mL/kg IBW anatomical dead space,
 * about 1.0–1.2 mL/kg IBW is extrathoracic (mouth, pharynx, larynx: Nunn's Applied Respiratory Physiology ch. 8);
 * an intubated patient loses that and gains the device's internal volume plus the Y-piece and HME.
 * Before this, intubation ADDED 50 mL with no credit for the bypassed upper airway, which is half of why every
 * ventilated patient's dead space was inflated (man 265 mL, woman 329, 4 y child 459).
 */
export const ETT_BYPASS_ML_PER_KG = 1.1;
/** Y-piece + HME on a ventilator or BVM: 50 mL adult, 1.5 mL/kg below 33 kg (neonatal circuits) [ENG]. */
export function apparatusDeadSpaceMl(weightKg: number): number {
```

Edit 2 — find:

```ts
  bloodL: number;
  deadSpaceMl: number; // anatomical
  /** CO2 compartments (mL/mmHg) and exchange (mL/min/mmHg). */
  cf: number;
```

replace with:

```ts
  bloodL: number;
  deadSpaceMl: number; // anatomical
  /**
   * FU-4 F4 / R1(a): the patient's OWN resting arterial CO2 (mmHg). In MODELED this is the drive's set point and the
   * gas compartments' starting point, instead of a value back-calculated from L1's adult EtCO2 default of 36 plus a
   * gradient — which made every MODELED patient, whatever their size, sit at an adult's displayed EtCO2.
   */
  paco2Rest: number;
  /** CO2 compartments (mL/mmHg) and exchange (mL/min/mmHg). */
  cf: number;
```

Edit 3 — find:

```ts
    bloodL: (a.bv * eff) / 1000,
    deadSpaceMl: ANAT_DEAD_SPACE_ML_PER_KG * ibw,
    // anchored on the anaesthetised VCO2 (the apnoea data are from anaesthetised patients)
    cf: CO2_CF_PER_VCO2 * RQ * vo2 * GA_METABOLIC, cs: CO2_CS_PER_VCO2 * RQ * vo2 * GA_METABOLIC, kfs: CO2_KFS_PER_VCO2 * RQ * vo2 * GA_METABOLIC,
```

replace with:

```ts
    bloodL: (a.bv * eff) / 1000,
    deadSpaceMl: ANAT_DEAD_SPACE_ML_PER_KG * ibw,
    paco2Rest: PACO2_REST_MMHG, // FU-4 F4 / R1(a) (pregnancy 31 when R10 lands)
    // anchored on the anaesthetised VCO2 (the apnoea data are from anaesthetised patients)
    cf: CO2_CF_PER_VCO2 * RQ * vo2 * GA_METABOLIC, cs: CO2_CS_PER_VCO2 * RQ * vo2 * GA_METABOLIC, kfs: CO2_KFS_PER_VCO2 * RQ * vo2 * GA_METABOLIC,
```

#### Modify `packages/engine-core/src/l2/resp/pipeline.ts`

Edit 1 — find:

```ts
import { pleuralPressureMmHg } from '../circ/pleural.ts'; // Stage 7a
import { CMH2O_TO_MMHG, P_PL0, T_IT } from '../circ/params.ts'; // Stage 7b (Task 26)
import { HEALTHY } from '../../../data/lung-pathology.ts'; // Stage 7b (Task 26)
import { createCo2State, etco2Mixed, lowFlowFactor, stepCo2, vaForPaco2, type Co2State } from '../gas/co2.ts'; // Stage 7b: etco2Mixed
```

replace with:

```ts
import { pleuralPressureMmHg } from '../circ/pleural.ts'; // Stage 7a
import { CMH2O_TO_MMHG, P_PL0, T_IT } from '../circ/params.ts'; // Stage 7b (Task 26)
import { ETT_BYPASS_ML_PER_KG } from '../gas/params.ts'; // FU-4 F4 / R1(b)
import { HEALTHY } from '../../../data/lung-pathology.ts'; // Stage 7b (Task 26)
import { createCo2State, etco2Mixed, lowFlowFactor, stepCo2, vaForPaco2, type Co2State } from '../gas/co2.ts'; // Stage 7b: etco2Mixed
```

Edit 2 — find:

```ts
function deadSpace(rs: RespState, l1?: L1State): number {
  const mech = rs.driver.source !== 'spontaneous' && rs.driver.source !== 'none';
  // FU-4 G11: the MANUAL EtCO2 fit (vdExtraMl, made for the resting pattern at t = 0) is not a MODELED ventilated
  // patient's dead space — it carried 61 mL into every MODELED PPV run (VA 2.82 L/min and PaCO2 60 at 12 × 500)
  const fit = mech && l1?.mode === 'modeled' ? 0 : rs.co2.vdExtraMl;
  return rs.pat.deadSpaceMl + (mech ? apparatusDeadSpaceMl(rs.pat.weightKg) : 0) + fit;
}
function extraGradient(rs: RespState): number {
```

replace with:

```ts
function deadSpace(rs: RespState, l1?: L1State): number {
  const mech = rs.driver.source !== 'spontaneous' && rs.driver.source !== 'none';
  // FU-4 F4 / R1(a): the EtCO2 → dead-space fit belongs to MANUAL. It is an instructor's calibration of a DISPLAYED
  // number, never a MODELED patient's anatomy, and in MODELED it inflated the dead space of every patient — including
  // spontaneously breathing women, children and the elderly, who kept the adult RR 15 / VT 500 / EtCO2 36 fit
  // (respiratory audit R1: 265 / 329 / 459 mL). G11 had removed it for MODELED + mechanical ventilation only.
  const fit = l1?.mode === 'modeled' ? 0 : rs.co2.vdExtraMl;
  // FU-4 F4 / R1(b): an artificial airway replaces the extrathoracic dead space it bypasses with the apparatus volume
  // (the artificial airway is taken to be present exactly when the apparatus is: the resp module has no airway-device
  // seam of its own, so an intubated but spontaneously breathing patient does not yet get the credit — see the plan)
  const anat = rs.pat.deadSpaceMl - (mech ? ETT_BYPASS_ML_PER_KG * rs.pat.ibwKg : 0);
  return Math.max(0.3 * rs.pat.deadSpaceMl, anat) + (mech ? apparatusDeadSpaceMl(rs.pat.weightKg) : 0) + fit;
}
function extraGradient(rs: RespState): number {
```

Edit 3 — find:

```ts
  rs.circPtx = circPtx(h); // Stage 7b (Task 26)
  // MANUAL etco2 target → physiological dead space that holds it at the current settings (decision 2)
  const etT = l1Target(l1, 'etco2', t);
  if (etT !== rs.seen.etco2) {
    rs.seen.etco2 = etT;
    const n = nominalRate(d, driverCtx(rs, l1, t));
```

replace with:

```ts
  rs.circPtx = circPtx(h); // Stage 7b (Task 26)
  // MANUAL etco2 target → physiological dead space that holds it at the current settings (decision 2)
  // FU-4 F4 / R1(a): calibrate only in MANUAL (or when the instructor changes the target); in MODELED the resting
  // PaCO2 is the PATIENT's set point, not one derived from L1's adult EtCO2 default plus a gradient
  const etT = l1Target(l1, 'etco2', t);
  if (l1.mode === 'modeled') {
    if (rs.seen.etco2 !== etT) {
      rs.seen.etco2 = etT;
      rs.co2.vdExtraMl = 0;
      const rest = rs.pat.paco2Rest;
      if (!Number.isFinite(rs.co2.pf) || rs.co2.pf <= 0) { rs.co2.pf = rest; rs.co2.ps = rest; }
      (rs.spont ??= createSpontDrive()).paco2Rest = rest;
    }
  } else if (etT !== rs.seen.etco2) {
    rs.seen.etco2 = etT;
    const n = nominalRate(d, driverCtx(rs, l1, t));
```

**Prototype results — the audit's dead-space table, re-measured:**

| patient | before (audit R1) | after: anat → −ETT credit → + apparatus = VD | mL/kg IBW | PaCO2 | EtCO2 | pH |
|---|---|---|---|---|---|---|
| man 70 kg, spontaneous | 265 | 154 → 154 → +0 = **154** | 2.2 | 39.1 | 36.0 | 7.41 |
| man 70 kg, vent 12 × 600 | 265 | 154 → 77 → +50 = **127** | 1.8 | 32.0 | 28.5 | 7.48 |
| man 70 kg, vent 12 × 500 | 265 | 154 → 77 → +50 = **127** | 1.8 | **38.5** (was 60) | 34.5 | 7.41 |
| woman 60 kg, spontaneous | 329 | 121 → 121 → +0 = **121** | 2.2 | 38.5 | 33.3 | 7.41 |
| **woman 60 kg, vent 12 × 400** | 329 | 121 → 61 → +50 = **111** | 2.0 | **42.7** (was **103**) | 34.5 | **7.375** (was 7.06) |
| child 4 y 16 kg, spontaneous | 459 | 35 → 35 → +0 = **35** | 2.2 | 37.6 (was 49–52) | 14.7 | 7.38 |
| child 4 y 16 kg, vent 20 × 112 | 459 | 35 → 18 → +24 = **42** | 2.6 | 62 | 22.6 | 7.20 |
| elderly 80 y, spontaneous | 314 | 145 → 145 → +0 = **145** | 2.2 | 38.3 | 35.0 | 7.41 |

The review's expectation "≈ 2.2 mL/kg + apparatus" is met exactly for spontaneous patients; ventilated adults land at
1.8–2.0 mL/kg. `pk-bus`'s "VA at 12 × 500 exceeds 3 L/min" flip holds with room to spare (VA 4.5 L/min, PaCO2 38.5).

- [x] **Step 2: R1(c) — per-patient resting pattern and ventilator defaults.** NOT prototyped (it changes L1's
  `rr`/`vt`/`etco2` defaults, which are Stage 1's), and the measurement above hands the executor two concrete items it
  must settle rather than guess:
  - (i) the man on the default VCV **12 × 600 is now mildly HYPOcapnic** (PaCO2 32, pH 7.48). With an honest dead space
    600 mL is too much for a 70 kg patient: the default must be **7 mL/kg IBW (490 mL)**, with RR chosen for normocapnia
    per profile.
  - (ii) the **4 y child on 7 mL/kg (20 × 112) still sits at PaCO2 62**, because a 24 mL apparatus against a 112 mL tidal
    volume is a third of the breath. Real paediatric circuits use low-dead-space connectors, so `apparatusDeadSpaceMl`
    needs a **paediatric branch** (state the value and its source in the code comment).
  - State explicitly in the gate note which demo and ventilator presets change, and re-run every rig that uses the
    defaults. If L1's defaults cannot be derived per profile without moving Stage 1 bands, land (i) and (ii) as the
    ventilator/demo presets only and record the L1 default change as a question — do NOT widen a Stage 1 band.
- [x] **Step 2b: FU-6's Request 3 — the 7 kg infant that CRASHES the engine (added 2026-09-28).** On today's main a
  **7 kg infant on an ETT with volume control crashes the engine at 240 s** — `"rhythm sinus: next event time is NaN"` —
  because the MANUAL EtCO2 calibration gives that infant ≈ **400 mL** of dead space (an adult's fit on a 7 kg patient),
  so PaCO2 climbs without bound until a downstream term becomes NaN. This task's root fix is what must make that infant
  ventilate normally, so it is a NAMED TEST here and not left to be noticed downstream:
  **`test/engine/vent-infant.test.ts`** (fast set) — 7 kg infant, ETT, volume control at the patient's OWN defaults
  (Step 2's per-profile VT 7 mL/kg IBW and RR for normocapnia, with the paediatric apparatus branch): **PaCO2 35–45 held
  for 30 sim-min, EtCO2 within 5 of PaCO2, and NO NaN in any published numeric** (assert `Number.isFinite` over the
  whole run, not only at the end). Record the infant's VD (anatomical → ETT credit → apparatus) in the gate note beside
  the table above. The guard that makes the failure loud instead of fatal is **Task 18g**.
- [x] **Step 3: the airway seam, named honestly.** The prototype applies the ETT credit exactly when the apparatus is
  present (`mech`), because the resp module has **no airway-device seam of its own** (the device lives on 7f's
  `ns.airway`). An intubated but SPONTANEOUSLY breathing patient therefore does not yet get the credit. The clean fix is
  an `rs.airwayDevice` (or adding `airway` to the `NeuroResp` seam); it is listed here as the task's own follow-up and
  must appear in the gate note as a known limit, not be left silent.
- [x] **Step 4: re-measure everything the dead space moves.** `neuro-spont` (re-reference under **E-FU4-17**, criterion
  unchanged), E-FU4-8's TBI rig RR (AGAIN — 12 × 500 now sits near PaCO2 38–42), `lung-circ`'s OLV `it.fails`,
  `cpr-etco2`, D3's `TAU_HYP_S` scan (Task 4's step), the audit's `probe-va` table with the woman and the ventilated
  child rows added, and every long ventilated run. Run `test/engine/neuro-*`, `test/engine/lung-*`,
  `test/engine/organs-tbi.test.ts`, `test/engine/pk-bus.test.ts`, `test/l2/gas`, `test/l2/resp`. Commit and push
  (`fix(resp): dead space at the root — MANUAL-only calibration, patient PaCO2, ETT bypass credit (FU-4 F4, R1)`).

### Task 18e: the HUMORAL arm of haemorrhage compensation, which propofol does not suppress — and the G2 re-fit against two sourced targets (7e E-FU4-2 widened, 7a; ruling 2 / review F2; PROTOTYPED; run AFTER Task 14)

**Files:**
- Modify (7e, **E-FU4-2** widened): `packages/engine-core/src/l2/endo/params.ts` (the arm's constants),
  `packages/engine-core/src/l2/endo/hormones.ts` (`h.hum` and its drive), `packages/engine-core/src/l2/endo/effects.ts`
  (`humSvrF`, `humDV0Frac`, published OUTSIDE `alpha()`), `packages/engine-core/src/l2/endo/core.ts` (the `EndoInputs`
  set-point input and the two outputs), `packages/engine-core/src/l2/endo/adapters.ts` (`mapSetMmHg` in,
  `ext.endoHumDV0Frac` out)
- Modify (7a): `packages/engine-core/src/l2/circ/model.ts` (the ONE shared unstressed-volume reservoir)
- Modify (tests): `packages/engine-core/test/l2/endo/hormones.test.ts` (the `REST` input), the clinical suite's S6a

**Why (ruling 2; review F2's verdict, with sources).** The applied tree put class III haemorrhage + propofol 2 mg/kg into
**PEA at +80 s** (MAP 82 → 14 at +60 s, CO 0.8), at a propofol Ce of only 3.5 — the patient died before the drug even
peaked (a healthy induction's nadir is at +190 s). The literature says profound hypotension, not near-certain arrest:
INTUBE (Russotto V et al., JAMA 2021;325:1164–1172) found peri-intubation cardiovascular instability in 42.6 % of
critically ill patients and **cardiac arrest in 3.1 %**; Heffner AC et al. (Resuscitation 2013;84:1500–1504) ≈ 4 %, with
pre-intubation hypotension the main risk factor. Expected picture: MAP falls 40–60 % to ≈ 35–50 over 1–3 min; arrest is
possible if uncorrected or with a further insult, not the rule.

**The cause was a missing mechanism, not an oversized multiplier — and the measurement named which term.** In this engine
the arterial baroreflex output was the ONLY compensation for blood loss (7e's `symp` is driven by nociception,
conditions, MH and hypoglycaemia, not by baroreceptor unloading, and there was no vasopressin or angiotensin arm), so
propofol's `outF` × 0.1 at Ce 3 removed ≈ 100 % of it. Worse, `outF` multiplies `dV0` — the reflex's venous recruitment —
so induction **returned the reflex's whole ≈ 840 mL of recruited unstressed volume at once**: an acute 840 mL bleed on
top of the haemorrhage, at the moment of induction. That, and not the arteriolar term, is why the patient arrested in
80 s. Physiologically, haemorrhage is compensated by a neural arm AND a humoral one — vasopressin, angiotensin II and
adrenal catecholamines, acting over minutes (Schadt JC & Ludbrook J, Am J Physiol 1991;260:H305–H318) — and an
anaesthetic suppresses only the neural arm. The RAAS/AVP dependence of anaesthetised blood pressure is the
ARB/ACE-inhibitor post-induction hypotension literature (Brabant SM et al., Anesth Analg 1999;89:1388–1392). Sellgren
1994, which D1 cites for the reset, describes a baroreflex RESET that still operates — not an abolished output.

**Three design points that are load-bearing** (a "simplification" of any of them re-breaks the case):
- `humSvrF` and `humDV0Frac` are published **outside** `alpha()`: V1/AT1 vasoconstriction is not scaled by catecholamine
  responsiveness, which is exactly why vasopressin still works in vasoplegia.
- 7a folds `endoHumDV0Frac` into the **same capped unstressed reservoir** as the baroreflex and the β-agonists (FU-2 F4).
  That is what lets it hold volume when the neural arm is suppressed without over-compensating an undrugged patient,
  whose reservoir the reflex has already spent.
- The drive is **hyperbolic in unloading, not a threshold**: a patient who has been bleeding for fifteen minutes already
  carries AVP and angiotensin when you induce them. A threshold/sigmoid form left the compensated class III patient with
  almost no humoral tone before induction, and since the arm's own τ is minutes it could not catch the crash — measured,
  it still arrested at +75 s.

**The re-fit, and what it cost (recorded, not fitted away).** `PROPOFOL_SYMP` is **unchanged** (emax −1, ec50 1.0,
hill 2): the re-fit's answer is that the suppression was never the error; the missing compensation was. Fitted:
`HUM_EC50_MMHG` 30, `HUM_SVR` 0.32, `HUM_V0` 0.30, τ on 150 s / off 600 s. `HUM_SVR` 0.55 (the first try) **blunted
Ali's tamponade collapse away** (tamponade + 2 mg/kg −53 %, no arrest, B7 pushed out to 2 235 s); 0.32 keeps it.

**Prototype results — the four-patient table and the shock rows, re-measured (control-subtracted, `mapMin` after the dose):**

| state | before (applied tree) | after | outcome |
|---|---|---|---|
| healthy | −32 % | MAP 73.1 (base 95.9) **−24 %** | no arrest |
| 80 y hypertensive | −31 % | MAP 95.6 (base 122.0) **−22 %** | no arrest |
| AS + CAD | −31 % | MAP 91.8 (base 117.4) **−22 %** | no arrest |
| HFrEF | −29 % | MAP 67.9 (base 86.8) **−22 %** | no arrest |
| severe tamponade | −84 %, PEA +135 s | MAP 17.8 (base 95.9) **−81 %** | **PEA 780 s** (the collapse is kept) |
| **Ali's case (B7)** | PEA 795 s | MAP 6.1 | **arrest 780 s**, lactate 12.3 |
| class III control (C0) | MAP 82 | MAP 81.3 | no arrest (ATLS picture kept) |
| **class III + propofol (C1)** | **MAP 14 at +60 s, PEA +80 s** | **MAP nadir 28.7, NO ARREST** | survives ≥ 5 min |
| MANUAL class III + propofol | — | MAP 35.5 | no arrest |

- **The new sourced target is met:** class III + 2 mg/kg no longer arrests. The nadir 28.7 sits **1.3 mmHg below** the
  30–50 target's lower edge.
- **The cost:** the healthy band (−25 to −40 %, M10 ch. 21 p. 519) is now missed at **−24 %**, and the other three
  healthy-ish rows sit at −22 %. Making the suppression more potent does not recover it (ec50 1.0 → 0.85 → 0.75 moved
  healthy by < 1 point: the term saturates); the nadir is set by the humoral compensation. A stronger arm (`HUM_SVR`
  0.35 / `HUM_V0` 0.34) puts the class III nadir inside 30–50 (32.1) and takes healthy to −23 %. **The two sourced
  targets pull against each other**, so S1b and S6a's percentage side stay `it.fails` with these numbers and go to Ali
  as Q1. Do not fit one by breaking the other, and do not widen either band (R45).

- [x] **Step 1: the arm.**

#### Modify `packages/engine-core/src/l2/endo/params.ts`

Edit 1 — find:

```ts
 */
export const EPI_EXO_PG_PER_RATE_EQ = 1e6 / 68.66;
```

replace with:

```ts
 */
export const EPI_EXO_PG_PER_RATE_EQ = 1e6 / 68.66;

/**
 * FU-4 F2(a) — the HUMORAL arm of haemorrhage compensation (vasopressin / angiotensin II / adrenal), which an
 * anaesthetic does NOT suppress. Before this the arterial baroreflex output was the engine's only compensation for
 * blood loss, so propofol's `outF` removed ≈ 100 % of it and class III haemorrhage + 2 mg/kg arrested at +80 s.
 * Schadt JC & Ludbrook J, Am J Physiol 1991;260:H305–H318 (the phases of the response to simple haemorrhage in
 * conscious animals: an early neural phase, then a humoral phase over minutes carried by AVP and angiotensin II).
 * The RAAS/AVP dependence of anaesthetised blood pressure is the ARB/ACE-inhibitor post-induction hypotension
 * literature (Brabant SM et al., Anesth Analg 1999;89:1388–1392).
 * Driven by baroreceptor UNLOADING (the fall of mean pressure below the patient's set point), not by nociception.
 */
export const HUM_ON_TAU_S = 150; // rise τ (Schadt & Ludbrook's humoral phase: minutes) [ENG within 120–300]
export const HUM_OFF_TAU_S = 600; // decay τ — AVP and angiotensin outlast the stimulus [ENG]
/**
 * Saturating (hyperbolic) in unloading: drive = u / (u + EC50), u = the fall of mean pressure below the set point.
 * The form matters. A patient who has been bleeding for fifteen minutes ALREADY carries vasopressin and angiotensin
 * when you induce them, and that pre-existing tone is what the anaesthetic cannot take away; a threshold/sigmoid form
 * that left the compensated class III patient with almost no humoral tone before induction could not catch the crash
 * afterwards, because the arm's own τ is minutes (measured: it arrested at +75 s either way). The healthy patient
 * starts at zero unloading, so the same curve gives them very little.
 */
export const HUM_EC50_MMHG = 30; // half-maximal humoral drive [ENG, fit: class III keeps its ATLS picture and does not arrest on 2 mg/kg]
export const HUM_MAX = 1; // saturation of the arm
export const HUM_SVR = 0.32; // × systemic resistance at full effect (AVP V1 + AT1) [ENG; 0.55 blunted Ali's tamponade collapse away]
export const HUM_V0 = 0.30; // fraction of blood volume held in the SHARED unstressed reservoir at full effect [ENG; the term that keeps the bleeding patient alive through induction]
```

#### Modify `packages/engine-core/src/l2/endo/hormones.ts`

Edit 1 — find:

```ts
//   cort  cortisol (nmol/L): toward 400·(1 + 2.75·surgical drive) with τ 1.5 h (> 1500 by 4–6 h after incision).
import {
  CORT_BASAL, CORT_GAIN, CORT_TAU_S, DRIVE_HYPERCAPNIA_PER_MMHG, DRIVE_HYPOGLY_PER_MGDL, DRIVE_HYPOTENSION_PER_MMHG,
  DRIVE_HYPOXIA_PER_SAT, EPI_ADRENAL_GAIN, EPI_BASAL_PG_ML, EPI_CL_ML_MIN_KG, EPI_VD_L_KG, HYPO_EPI_THRESHOLD_MGDL,
```

replace with:

```ts
//   cort  cortisol (nmol/L): toward 400·(1 + 2.75·surgical drive) with τ 1.5 h (> 1500 by 4–6 h after incision).
import {
  HUM_EC50_MMHG, HUM_MAX, HUM_OFF_TAU_S, HUM_ON_TAU_S,
  CORT_BASAL, CORT_GAIN, CORT_TAU_S, DRIVE_HYPERCAPNIA_PER_MMHG, DRIVE_HYPOGLY_PER_MGDL, DRIVE_HYPOTENSION_PER_MMHG,
  DRIVE_HYPOXIA_PER_SAT, EPI_ADRENAL_GAIN, EPI_BASAL_PG_ML, EPI_CL_ML_MIN_KG, EPI_VD_L_KG, HYPO_EPI_THRESHOLD_MGDL,
```

Edit 2 — find:

```ts
export interface HormoneState {
  symp: number;
  epi: number; // endogenous plasma epinephrine, pg/mL
  epiExo: number; // exogenous (7g) plasma-equivalent epinephrine, pg/mL — β2 and metabolic effects only
```

replace with:

```ts
export interface HormoneState {
  symp: number;
  /** FU-4 F2(a): the humoral vasoconstrictor arm (AVP + angiotensin II), 0–1. Propofol does not suppress it. */
  hum: number;
  epi: number; // endogenous plasma epinephrine, pg/mL
  epiExo: number; // exogenous (7g) plasma-equivalent epinephrine, pg/mL — β2 and metabolic effects only
```

Edit 3 — find:

```ts
  cortResponse: number; // 1 normal, 0.5 adrenal insufficiency / etomidate (tables)
  epiExoPgMl: number; // 7g's epinephrine as plasma pg/mL (0 without 7g)
}

export function createHormones(): HormoneState {
  return { symp: 0, epi: EPI_BASAL_PG_ML, epiExo: 0, ne: NE_BASAL_PG_ML, cort: CORT_BASAL, cortDrive: 0 };
}
```

replace with:

```ts
  cortResponse: number; // 1 normal, 0.5 adrenal insufficiency / etomidate (tables)
  epiExoPgMl: number; // 7g's epinephrine as plasma pg/mL (0 without 7g)
  mapSetMmHg: number; // FU-4 F2(a): the patient's own mean-pressure set point — the humoral arm's unloading reference
}

export function createHormones(): HormoneState {
  return { symp: 0, hum: 0, epi: EPI_BASAL_PG_ML, epiExo: 0, ne: NE_BASAL_PG_ML, cort: CORT_BASAL, cortDrive: 0 };
}
```

Edit 4 — find:

```ts
  const tau = target > h.symp ? SYMP_ON_TAU_S : SYMP_OFF_TAU_S;
  h.symp += (target - h.symp) * (1 - Math.exp(-dtS / tau));
  const kE = EPI_CL_ML_MIN_KG / (EPI_VD_L_KG * 1000) / 60; // /s
  const kN = NE_CL_ML_MIN_KG / (NE_VD_L_KG * 1000) / 60;
```

replace with:

```ts
  const tau = target > h.symp ? SYMP_ON_TAU_S : SYMP_OFF_TAU_S;
  h.symp += (target - h.symp) * (1 - Math.exp(-dtS / tau));
  // FU-4 F2(a): the humoral arm follows baroreceptor UNLOADING with a minutes time constant and is not suppressed by
  // an anaesthetic (Schadt & Ludbrook 1991). The unloading signal is the fall of mean pressure below the set point.
  const u = Math.max(0, x.mapSetMmHg - x.mapMmHg);
  const hTgt = (HUM_MAX * u) / (u + HUM_EC50_MMHG);
  h.hum += (hTgt - h.hum) * (1 - Math.exp(-dtS / (hTgt > h.hum ? HUM_ON_TAU_S : HUM_OFF_TAU_S)));
  const kE = EPI_CL_ML_MIN_KG / (EPI_VD_L_KG * 1000) / 60; // /s
  const kN = NE_CL_ML_MIN_KG / (NE_VD_L_KG * 1000) / 60;
```

#### Modify `packages/engine-core/src/l2/endo/effects.ts`

Edit 1 — find:

```ts
  CORT_BASAL, CORT_EC50, CORT_EGP_X, CORT_SI_LOSS, CORT_VASO_RESP, EPI_ALPHA_SVR, EPI_BASAL_PG_ML, EPI_BETA1_EES,
  EPI_BETA1_HR, EPI_BETA2_SVR, EPI_EC50_ALPHA, EPI_EC50_BETA1, EPI_EC50_BETA2, EPI_EC50_METAB, EPI_EGP_X, EPI_K_SHIFT,
  EPI_SEC_SUPPRESS, EPI_SI_LOSS, G_SYMP_EES, G_SYMP_HR, G_SYMP_SVR, G_SYMP_V0,
} from './params.ts';
import type { HormoneState } from './hormones.ts';
```

replace with:

```ts
  CORT_BASAL, CORT_EC50, CORT_EGP_X, CORT_SI_LOSS, CORT_VASO_RESP, EPI_ALPHA_SVR, EPI_BASAL_PG_ML, EPI_BETA1_EES,
  EPI_BETA1_HR, EPI_BETA2_SVR, EPI_EC50_ALPHA, EPI_EC50_BETA1, EPI_EC50_BETA2, EPI_EC50_METAB, EPI_EGP_X, EPI_K_SHIFT,
  EPI_SEC_SUPPRESS, EPI_SI_LOSS, G_SYMP_EES, G_SYMP_HR, G_SYMP_SVR, G_SYMP_V0, HUM_SVR, HUM_V0,
} from './params.ts';
import type { HormoneState } from './hormones.ts';
```

Edit 2 — find:

```ts
  bronchoDil: number; // 0–1 β2 bronchodilation of endogenous + exogenous epinephrine
  mastB2: number; // 0–1 β2 mast-cell stabilisation by EXOGENOUS (7g) epinephrine — the anaphylaxis treatment (R51 addendum 16)
}
```

replace with:

```ts
  bronchoDil: number; // 0–1 β2 bronchodilation of endogenous + exogenous epinephrine
  mastB2: number; // 0–1 β2 mast-cell stabilisation by EXOGENOUS (7g) epinephrine — the anaphylaxis treatment (R51 addendum 16)
  /** FU-4 F2(a): × systemic resistance from the HUMORAL arm alone (AVP V1 + AT1), reported separately so the tables'
   * §7 neural bands stay unchanged and so an anaesthetic's `outF` can be seen not to act on it. */
  humSvrF: number;
  /** FU-4 F2(a): + fraction of blood volume recruited by the humoral arm (− = venoconstriction). */
  humDV0Frac: number;
}
```

Edit 3 — find:

```ts
    bronchoDil: hill(all, EPI_EC50_BETA2),
    mastB2: hill(Math.max(0, h.epiExo), EPI_EC50_BETA2),
  };
}
```

replace with:

```ts
    bronchoDil: hill(all, EPI_EC50_BETA2),
    mastB2: hill(Math.max(0, h.epiExo), EPI_EC50_BETA2),
    // FU-4 F2(a): V1/AT1 vasoconstriction is NOT scaled by `vasoResp` (catecholamine responsiveness) — vasopressin
    // keeps working where catecholamines have failed, which is why it is used in vasoplegic shock
    humSvrF: 1 + HUM_SVR * h.hum,
    humDV0Frac: -HUM_V0 * h.hum,
  };
}
```

#### Modify `packages/engine-core/src/l2/endo/core.ts`

Edit 1 — find:

```ts
  antinoc: number;
  mapMmHg: number;
  sao2: number;
  paco2: number;
```

replace with:

```ts
  antinoc: number;
  mapMmHg: number;
  /** FU-4 F2(a): the patient's own mean-pressure set point (7a `baro.set`) — the humoral arm's unloading reference. */
  mapSetMmHg: number;
  sao2: number;
  paco2: number;
```

Edit 2 — find:

```ts

export const NEUTRAL_ENDO_INPUTS: EndoInputs = {
  noxious: 0, antinoc: 0, mapMmHg: 85, sao2: 0.97, paco2: 40, tempC: 36.8, mhActivity: 0, liverF: 1, weightKg: 70, betaBlock: 0, betaBlockC: 0,
  epiExoPgMl: 0, bronchoDilExt: 0, dkaSeverity: 0,
};
```

replace with:

```ts

export const NEUTRAL_ENDO_INPUTS: EndoInputs = {
  noxious: 0, antinoc: 0, mapMmHg: 85, mapSetMmHg: 85, sao2: 0.97, paco2: 40, tempC: 36.8, mhActivity: 0, liverF: 1, weightKg: 70, betaBlock: 0, betaBlockC: 0,
  epiExoPgMl: 0, bronchoDilExt: 0, dkaSeverity: 0,
};
```

Edit 3 — find:

```ts
  eesF: number;
  dV0Frac: number; // + fraction of BLOOD VOLUME moved into the unstressed pool (+ = venodilation); 7a's sign is the opposite
  vo2F: number; // endocrine metabolic rate × (thyroid, conditions): VO2, VCO2 and heat (thermal.extraX)
  setShiftC: number; // fever set point added to the thermal thresholds
```

replace with:

```ts
  eesF: number;
  dV0Frac: number; // + fraction of BLOOD VOLUME moved into the unstressed pool (+ = venodilation); 7a's sign is the opposite
  /** FU-4 F2(a): the HUMORAL arm's venous recruitment, published on its own because it shares 7a's ONE unstressed-volume
   * reservoir with the baroreflex and the β-agonists (FU-2 F4) — added to `dV0Frac` it would double-count the splanchnic
   * bed. − = venoconstriction, as a fraction of blood volume. */
  humDV0Frac: number;
  vo2F: number; // endocrine metabolic rate × (thyroid, conditions): VO2, VCO2 and heat (thermal.extraX)
  setShiftC: number; // fever set point added to the thermal thresholds
```

Edit 4 — find:

```ts
    // ABOVE the endocrine set-point shift (MH, exogenous heat, a MANUAL target) — prototype: counting it twice gave HR 153
    feverHrFExcess: tempHrF(x.tempC - setShiftC),
    svrF: alpha(st.svrF) * th.svrF * cd.svrF,
    eesF: beta(st.eesF) * th.eesF * cd.eesF,
    dV0Frac: st.dV0Frac + cd.dV0Frac,
    vo2F: th.vo2F * cd.vo2F,
    setShiftC,
```

replace with:

```ts
    // ABOVE the endocrine set-point shift (MH, exogenous heat, a MANUAL target) — prototype: counting it twice gave HR 153
    feverHrFExcess: tempHrF(x.tempC - setShiftC),
    svrF: alpha(st.svrF) * th.svrF * cd.svrF * st.humSvrF, // FU-4 F2(a): the humoral arm is outside alpha() (V1/AT1, not catecholamine-responsiveness-scaled)
    eesF: beta(st.eesF) * th.eesF * cd.eesF,
    dV0Frac: st.dV0Frac + cd.dV0Frac,
    humDV0Frac: st.humDV0Frac, // FU-4 F2(a)
    vo2F: th.vo2F * cd.vo2F,
    setShiftC,
```

Edit 5 — find:

```ts
  stepHormones(c.hormones, {
    noxious: x.noxious, antinoc: x.antinoc, extraSymp: cd.extraSymp + hypo + 2 * x.mhActivity,
    glucoseMgDl: g.g, mapMmHg: x.mapMmHg, sao2: x.sao2, paco2: x.paco2,
    cortResponse: c.profile.adrenalInsufficiency ? 0.5 : 1, epiExoPgMl: x.epiExoPgMl,
  }, dtS);
```

replace with:

```ts
  stepHormones(c.hormones, {
    noxious: x.noxious, antinoc: x.antinoc, extraSymp: cd.extraSymp + hypo + 2 * x.mhActivity,
    glucoseMgDl: g.g, mapMmHg: x.mapMmHg, mapSetMmHg: x.mapSetMmHg, sao2: x.sao2, paco2: x.paco2,
    cortResponse: c.profile.adrenalInsufficiency ? 0.5 : 1, epiExoPgMl: x.epiExoPgMl,
  }, dtS);
```

#### Modify `packages/engine-core/src/l2/endo/adapters.ts`

Edit 1 — find:

```ts
  const prof = circOf(ctx)?.prof;
  return {
    noxious: es.noxious, antinoc, mapMmHg: mapOf(ctx, t), sao2: ctx.resp.o2.sa, paco2: ctx.resp.co2.pf, tempC: th.tc,
    mhActivity: mhActivity(th.mh, t),
    liverF: (ctx.ps as { organs?: { liver?: { glucoseF?: number } } }).organs?.liver?.glucoseF ?? 1,
```

replace with:

```ts
  const prof = circOf(ctx)?.prof;
  return {
    noxious: es.noxious, antinoc, mapMmHg: mapOf(ctx, t), mapSetMmHg: ctx.hemo?.circ?.baro?.set ?? 85, sao2: ctx.resp.o2.sa, paco2: ctx.resp.co2.pf, tempC: th.tc,
    mhActivity: mhActivity(th.mh, t),
    liverF: (ctx.ps as { organs?: { liver?: { glucoseF?: number } } }).organs?.liver?.glucoseF ?? 1,
```

Edit 2 — find:

```ts
    const v0 = circ?.base?.v0Sv ?? 0;
    ext.endoDV0Frac = v0 > 0 ? (-o.dV0Frac * bv) / v0 : 0;
    return 1;
  }
```

replace with:

```ts
    const v0 = circ?.base?.v0Sv ?? 0;
    ext.endoDV0Frac = v0 > 0 ? (-o.dV0Frac * bv) / v0 : 0;
    ext.endoHumDV0Frac = o.humDV0Frac; // FU-4 F2(a): fraction of BLOOD VOLUME, into 7a's shared reservoir
    return 1;
  }
```

Edit 3 — find:

```ts
    ext.endoEesF = 1;
    ext.endoDV0Frac = 0;
  }
  return ctx.l1.pinned.includes('hr') ? 1 : endoHr(es, bba, false);
```

replace with:

```ts
    ext.endoEesF = 1;
    ext.endoDV0Frac = 0;
    ext.endoHumDV0Frac = 0;
  }
  return ctx.l1.pinned.includes('hr') ? 1 : endoHr(es, bba, false);
```

#### Modify `packages/engine-core/src/l2/circ/model.ts`

Edit 1 — find:

```ts
  const betaOcc = 1 - (1 - (x.betaBlockAdd ?? 0)) * (1 - m.prof.betaBlockC); // FU-2: as 7g's competitive β shift
  const dv0Beta = betaDV0Ml(x.betaAgonistU ?? 0, betaOcc, m.weightKg); // FU-2 (NR-7g-2)
  const recruit = Math.max(-V0_RECRUIT_MAX_ML_KG * m.weightKg, b.dV0 - dv0Beta); // FU-2 F4: reflex + β share one reservoir
  p.v0Sv = base.v0Sv * (1 - (x.endoDV0Frac ?? 0)) + recruit + de.v0Frac * m.prof.bloodVolumeMl + man.dV0;
  p.cSv = base.cSv * b.cSvF;
```

replace with:

```ts
  const betaOcc = 1 - (1 - (x.betaBlockAdd ?? 0)) * (1 - m.prof.betaBlockC); // FU-2: as 7g's competitive β shift
  const dv0Beta = betaDV0Ml(x.betaAgonistU ?? 0, betaOcc, m.weightKg); // FU-2 (NR-7g-2)
  // FU-2 F4 + FU-4 F2(a): the baroreflex, the β-agonists and the HUMORAL arm all recruit from ONE splanchnic reservoir.
  // Because the humoral arm is not scaled by `outF`, it holds part of that recruited volume when an anaesthetic
  // suppresses the neural arm — which is the difference between "profound hypotension" and "instant PEA" in a bleeding
  // patient (before this, propofol's `outF` returned the reflex's whole ≈ 840 mL recruitment at once, an acute bleed of
  // the same size on top of the haemorrhage).
  const humMl = (m.ext.endoHumDV0Frac ?? 0) * m.prof.bloodVolumeMl; // negative = recruited
  const recruit = Math.max(-V0_RECRUIT_MAX_ML_KG * m.weightKg, Math.min(b.dV0 - dv0Beta, humMl));
  p.v0Sv = base.v0Sv * (1 - (x.endoDV0Frac ?? 0)) + recruit + de.v0Frac * m.prof.bloodVolumeMl + man.dV0;
  p.cSv = base.cSv * b.cSvF;
```

#### Modify `packages/engine-core/test/l2/endo/hormones.test.ts`

Edit 1 — find:

```ts
import { createHormones, stepHormones, type HormoneInputs } from '../../../src/l2/endo/hormones.ts';

const REST: HormoneInputs = { noxious: 0, antinoc: 0, extraSymp: 0, glucoseMgDl: 100, mapMmHg: 85, sao2: 0.97, paco2: 40, cortResponse: 1, epiExoPgMl: 0 };
const NO_BB = { hr: 0, c: 0 };
```

replace with:

```ts
import { createHormones, stepHormones, type HormoneInputs } from '../../../src/l2/endo/hormones.ts';

const REST: HormoneInputs = { noxious: 0, antinoc: 0, extraSymp: 0, glucoseMgDl: 100, mapSetMmHg: 85, mapMmHg: 85, sao2: 0.97, paco2: 40, cortResponse: 1, epiExoPgMl: 0 };
const NO_BB = { hr: 0, c: 0 };
```

- [x] **Step 2: the unit tests** (append to `test/l2/endo/hormones.test.ts`): at rest `h.hum` stays 0; a 25 mmHg
  unloading drives it to ≈ `25/(25+30)` with τ 150 s and decays with τ 600 s; `stressEffects` gives
  `humSvrF = 1 + HUM_SVR·hum` and `humDV0Frac = −HUM_V0·hum`; **the humoral outputs do not change when `vasoResp` falls**
  (the vasoplegia property); `NEUTRAL_ENDO_INPUTS` keeps every existing test's numbers.
- [x] **Step 3: the suite rows.** S6a gains the "arrest is not the rule" side — **"class III haemorrhage + propofol
  2 mg/kg: no PEA within 5 min"** as `it` (met), while its percentage side stays `it.fails` with the measured −24 % /
  nadir 28.7 and a pointer to Q1. Add the MANUAL counterpart row (`MAP 35.5, no arrest`). S1b stays `it.fails` with
  −24 %.
- [x] **Step 4: re-measure after Task 14 (mandatory ordering).** Re-run the whole propofol matrix, Ali's B7 timeline, the
  class III course, the tamponade rows and the sepsis rows, with Task 14's `distFactor` in. Re-run `test/l2/endo`,
  `test/engine/endo-*`, `test/engine/circ-sanity-1.test.ts`, `test/engine/circ-sanity-2.test.ts`. Record the before/after
  matrix in the gate note. Commit and push
  (`feat(endo): the humoral arm of haemorrhage compensation, unsuppressed by anaesthesia (FU-4 F2, ruling 2)`).

### Task 18f: the vagal events become real code — and the reason they did nothing was a dropped field, not a dose (7g rows + hook, 7a, engine E-FU4-7; review F10 / the 2026-09-28 relaunch; PROTOTYPED)

**Files:**
- Modify (7g): `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts` (the three opioid `vagalMs` rows),
  `packages/engine-core/src/l2/pk/data/rows-cardiovascular.ts` (neostigmine's `vagalMs`; atropine's and
  glycopyrrolate's `muscarinic` occupancy), `packages/engine-core/src/l2/pk/hooks.ts` (the seeded repeat-sux draw),
  `packages/engine-core/src/l2/pk/pipeline.ts` (one line: record every bolus time)
- Modify (7a): `packages/engine-core/src/l2/circ/model.ts` (the 7g → 7a merge and the SA-node term)
- Modify (engine, **E-FU4-7**): `packages/engine-core/src/engine.ts` (the `outcome` stream and the `hold` flag on the
  hook's request)
- Create: `packages/engine-core/test/engine/vagal-events.test.ts` (SLOW_B — the file Task 12 named and never wrote)

**Why (review F10, and what the measurement found).** Task 12's rows, `control()` terms, the stimulus observer and the
second-sux hook were **prose only**, and in the applied tree G7 did nothing measurable: fentanyl 10 µg/kg HR 74 → 68,
remifentanil 3 µg/kg 74 → 68, a second succinylcholine dose 73 → 73 — the audit's own "before" numbers.

**The cause was NOT the concentration scale** (an earlier fixer's note said "fentanyl's effect is too weak — its
concentration scale is lower than I assumed" and began a re-fit; that diagnosis was wrong and no constant needed
changing). Measured: fentanyl 10 µg/kg peaks at **Ce 13.3 ng/mL**, remifentanil 3 µg/kg at **12.3**, neostigmine
0.05 mg/kg at **1.0** in its row's units, and with the plan's own emax 420 / ec50 4 the PD layer already delivered
`fx.vagalMs` **323 ms** at the fentanyl peak. **`vagalMs` never reached the circulation:** `model.ts`'s 7g → 7a merge
copies nine fields (`hr`, `ees`, `svr`, `v0Frac`, `pvr`, `gv`, `gvHr`, `symp`, `setF`) and dropped `vagalMs`, so
`de.vagalMs` was always `undefined` and the SA-node term added zero. **Two further defects the measurement exposed:**
- `d.bolusTimes` was pushed only for `gamma` PK rows, so succinylcholine (an `nmb` row) recorded no bolus times at all
  and a repeat-dose hook could never see a second dose.
- an engine-initiated rhythm request is never rate-held (`holdRate(…, false)`) and MODELED drives an escape rhythm's
  rate from the circulation, so a drawn junctional escape ran at 68–106/min instead of 45. The hook's request therefore
  carries an optional `hold`, and this event sets it: for its 60 s the rate is the node's, not the circulation's.

**The second-sux response is a seeded DRAW, not the deterministic response the plan had** (the review's F10 point):
`SUX_REPEAT_P` 0.35 adult, `SUX_REPEAT_P_CHILD` 0.7 under 12 y, window 90–1 200 s, abolished at muscarinic occupancy
≥ 0.5. Succinylcholine and succinylmonocholine sensitise cardiac muscarinic receptors, which is why the first dose
usually does nothing, the second one does, an anticholinergic given first prevents it, and it is commonest in children
(M10 ch. 23) [P direction, ENG size]. **Every EC50's units are now stated in the row comment** (the review's last F10
point): the opioids' in ng/mL of their own effect-site concentration, neostigmine's and the anticholinergics' in the
mg-equivalent Ce their existing rows use.

**Prototype results (modeled, ETT + VCV, monitored HR, seed 7 unless stated):**

| rig | before (review §A) | after |
|---|---|---|
| fentanyl 10 µg/kg, no anticholinergic | 74 → 68 | **74 → 48** |
| fentanyl 10 µg/kg after glycopyrrolate 0.4 mg | — | 74 → **74** (abolished) |
| remifentanil 3 µg/kg | 74 → 68 | **74 → 52** |
| neostigmine 0.05 mg/kg, no glycopyrrolate | 73 → 73 | **74 → 46** |
| neostigmine 0.05 mg/kg after glycopyrrolate 0.4 mg | — | 74 → 62 (blunted, not abolished) |
| repeat sux 1.5 → 1 mg/kg at +5 min, adult, seeds 7/8/9 | 73 → 73 | **45 (`junctionalEscape`, 60 s) / 73 / 73** — fires 1 of 3 |
| repeat sux, 4 y child 16 kg, seeds 7/8/9 | — | **45 / 122 / 122** — fires 1 of 3 |
| repeat sux after atropine 0.5 mg first | — | 74 → 82 (abolished) |
| atropine 0.5 mg (control) | 74 → 101 | 74 → 101 (unchanged) |

Three residuals recorded rather than fitted away: (i) three seeds cannot distinguish 0.35 from 0.7, so the paediatric
probability is asserted as a RATE over ≥ 20 seeds in the unit test, never in the scenario suite; (ii) the 4 y child's
fentanyl Ce is only **3.06 ng/mL** for the same 10 µg/kg (7g's allometric V1), so the child's opioid bradycardia is
SHALLOWER (128 → 90) where children are clinically MORE vagally sensitive — a 7g/paediatric question, not something to
fix with the vagal constant; (iii) glycopyrrolate 0.4 mg blunts rather than abolishes the neostigmine bradycardia
(occupancy < 1 at that dose), which is clinically right, so the "abolished" assertion belongs on the opioid rig.

- [x] **Step 1: the PD rows** (Task 12's `vagalMs`/`muscarinic` targets in `row.ts`/`combine.ts`/`drugs.ts` are already
  landed by Task 12; these are the rows that use them).

#### Modify `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts`

Edit 1 — find:

```ts
export const PROPOFOL_SYMP: PdEffect = { target: 'symp', emax: -1, ec50: 1.0, hill: 2 };
export const PROPOFOL_SETF: PdEffect = { target: 'setF', emax: -0.15, ec50: 1.0, hill: 2 };
/** FU-4 G2: sevoflurane/isoflurane lower SNA with MAP and no HR change (Ebert, Muzi & Lopatka 1995, Anesthesiology 83:88) [ENG size, fit: 0.65 MAC MAP −10 to −20 %]. */
export const VOLATILE_SYMP: PdEffect = { target: 'symp', emax: -0.5, ec50: 1, linear: true };
```

replace with:

```ts
export const PROPOFOL_SYMP: PdEffect = { target: 'symp', emax: -1, ec50: 1.0, hill: 2 };
export const PROPOFOL_SETF: PdEffect = { target: 'setF', emax: -0.15, ec50: 1.0, hill: 2 };
/**
 * FU-4 G7/F10: opioid VAGOTONIA. A large opioid bolus causes bradycardia through a central vagal (nucleus
 * ambiguus/vagal nucleus) mechanism, not through a negative chronotropic action on the node — which is why atropine or
 * glycopyrrolate abolishes it and why it is worse in a patient with high resting vagal tone (M10 ch. 22: opioids cause
 * a centrally mediated bradycardia; Reitan 1978 for fentanyl's vagal mechanism) [P direction, ENG size].
 * Units: `ec50` is the drug's own effect-site concentration in ng/mL, as the other opioid rows use; `emax` is
 * milliseconds added to the cycle length at full effect.
 * Fit target: fentanyl 10 µg/kg → HR into the 40s–50s without an anticholinergic (before: 74 → 68).
 */
export const FENTANYL_VAGAL: PdEffect = { target: 'vagalMs', emax: Number(globalThis.process?.env?.PME_VAG_EMAX ?? 420), ec50: Number(globalThis.process?.env?.PME_VAG_F ?? 4) };
export const REMIFENTANIL_VAGAL: PdEffect = { target: 'vagalMs', emax: Number(globalThis.process?.env?.PME_VAG_EMAX ?? 420), ec50: Number(globalThis.process?.env?.PME_VAG_R ?? 6) };
export const SUFENTANIL_VAGAL: PdEffect = { target: 'vagalMs', emax: 420, ec50: 0.5 };
/** FU-4 G2: sevoflurane/isoflurane lower SNA with MAP and no HR change (Ebert, Muzi & Lopatka 1995, Anesthesiology 83:88) [ENG size, fit: 0.65 MAC MAP −10 to −20 %]. */
export const VOLATILE_SYMP: PdEffect = { target: 'symp', emax: -0.5, ec50: 1, linear: true };
```

(The `PME_VAG_*` env overrides exist so the executor can re-sweep the size without editing the file; they default to the
fitted values and must stay defaulted.)

Edit 2 — find:

```ts
    id: 'fentanyl', name: 'Fentanyl', cls: 'opioid', amountUnit: 'mcg', pk: { kind: 'model', model: 'shafer', ventKe0: FENTANYL_KE0 },
    elim: { hepatic: 1, highExtraction: true },
    pd: [{ target: 'hr', emax: -0.25, ec50: 2 }, { target: 'svr', emax: -0.15, ec50: 2 }, { target: 'v0Frac', emax: 0.03, ec50: 2 }],
    cns: { remiEq: 1.6 }, syringePerMl: 50,
    doses: '1–3 µg/kg analgesia; 5–10 µg/kg blunting; plasma 15–30 ng/mL as sole agent (M10 ch. 22 Table 22.7)',
```

replace with:

```ts
    id: 'fentanyl', name: 'Fentanyl', cls: 'opioid', amountUnit: 'mcg', pk: { kind: 'model', model: 'shafer', ventKe0: FENTANYL_KE0 },
    elim: { hepatic: 1, highExtraction: true },
    pd: [{ target: 'hr', emax: -0.25, ec50: 2 }, { target: 'svr', emax: -0.15, ec50: 2 }, { target: 'v0Frac', emax: 0.03, ec50: 2 }, FENTANYL_VAGAL],
    cns: { remiEq: 1.6 }, syringePerMl: 50,
    doses: '1–3 µg/kg analgesia; 5–10 µg/kg blunting; plasma 15–30 ng/mL as sole agent (M10 ch. 22 Table 22.7)',
```

Edit 3 — find:

```ts
    // vent site ke0 0.92/min: Bouillon 2003 ventilatory ke0 (T5d "ke0 for CO2 0.92/min") [P]; R51 §2
    id: 'remifentanil', name: 'Remifentanil', cls: 'opioid', amountUnit: 'mcg', pk: { kind: 'model', model: 'minto', ventKe0: 0.92 },
    pd: [{ target: 'hr', emax: -0.25, ec50: 3 }, { target: 'svr', emax: -0.15, ec50: 3 }, { target: 'v0Frac', emax: 0.03, ec50: 3 }],
    cns: { remiEq: 1 }, syringePerMl: 50,
    doses: '0.05–0.5 µg/kg/min; TCI Ce 2–8 ng/mL; bolus 0.5–1 µg/kg', onset: 'TTPE ≈ 1.4–1.6 min; CSHT ≈ 3 min, context-independent',
```

replace with:

```ts
    // vent site ke0 0.92/min: Bouillon 2003 ventilatory ke0 (T5d "ke0 for CO2 0.92/min") [P]; R51 §2
    id: 'remifentanil', name: 'Remifentanil', cls: 'opioid', amountUnit: 'mcg', pk: { kind: 'model', model: 'minto', ventKe0: 0.92 },
    pd: [{ target: 'hr', emax: -0.25, ec50: 3 }, { target: 'svr', emax: -0.15, ec50: 3 }, { target: 'v0Frac', emax: 0.03, ec50: 3 }, REMIFENTANIL_VAGAL],
    cns: { remiEq: 1 }, syringePerMl: 50,
    doses: '0.05–0.5 µg/kg/min; TCI Ce 2–8 ng/mL; bolus 0.5–1 µg/kg', onset: 'TTPE ≈ 1.4–1.6 min; CSHT ≈ 3 min, context-independent',
```

Edit 4 — find:

```ts
    id: 'sufentanil', name: 'Sufentanil', cls: 'opioid', amountUnit: 'mcg', pk: { kind: 'model', model: 'gepts', ventKe0: SUFENTANIL_KE0 }, // vent = brain ke0 [ENG]
    elim: { hepatic: 1, highExtraction: true },
    pd: [{ target: 'hr', emax: -0.25, ec50: 0.25 }, { target: 'svr', emax: -0.15, ec50: 0.25 }],
    cns: { remiEq: 12 }, syringePerMl: 5,
    doses: '0.1–0.5 µg/kg; plasma 5–10 ng/mL as sole agent (M10 Table 22.7)', onset: 'TTPE 5.6 min (Shafer & Varvel 1991)',
```

replace with:

```ts
    id: 'sufentanil', name: 'Sufentanil', cls: 'opioid', amountUnit: 'mcg', pk: { kind: 'model', model: 'gepts', ventKe0: SUFENTANIL_KE0 }, // vent = brain ke0 [ENG]
    elim: { hepatic: 1, highExtraction: true },
    pd: [{ target: 'hr', emax: -0.25, ec50: 0.25 }, { target: 'svr', emax: -0.15, ec50: 0.25 }, SUFENTANIL_VAGAL],
    cns: { remiEq: 12 }, syringePerMl: 5,
    doses: '0.1–0.5 µg/kg; plasma 5–10 ng/mL as sole agent (M10 Table 22.7)', onset: 'TTPE 5.6 min (Shafer & Varvel 1991)',
```

#### Modify `packages/engine-core/src/l2/pk/data/rows-cardiovascular.ts`

Edit 1 — find:

```ts
    doses: '2 mg/kg at T2; 4 mg/kg at 1–2 PTC; 16 mg/kg immediate (M10 ch. 24 pp. 728–731)', onset: 'TOFR 0.9 in 2.2 / 2.7 min; 16 mg/kg T1 10 % in 1.2 min (label)', ir: '?', src: `Sgx label; V ${SUGAMMADEX.v1} L/kg`, tag: 'P' },
  { id: 'neostigmine', name: 'Neostigmine', cls: 'anticholinesterase', amountUnit: 'mg', pk: gammaPk(0.05, true, 600, 3600), elim: { renal: 0.5 },
    pd: [{ target: 'achGain', emax: 3, ec50: 1 }, { target: 'hr', emax: -0.5, ec50: 1 }],
    doses: '0.03–0.07 mg/kg, max 5 mg (with glycopyrrolate 0.2 mg per 1 mg)', onset: 'onset 1–3 min, peak ≈ 10 min; ceiling from TOF < 2 (7f; M10 ch. 24 p. 716)', ir: '?', src: 'Neo label; BJAEd 2020; T5d', tag: 'P' },
  { id: 'glycopyrrolate', name: 'Glycopyrrolate', cls: 'anticholinergic', amountUnit: 'mg', pk: gammaPk(0.2, false, 180, 10800),
    pd: [{ target: 'hr', emax: 0.3, ec50: 1 }], doses: '0.2–0.4 mg', onset: 'onset 2–3 min, duration 2–4 h; HR +10–20', ir: '?', src: 'T6.2; brief §4.9', tag: 'TXT' },
  { id: 'atropine', name: 'Atropine', cls: 'anticholinergic', amountUnit: 'mg', pk: gammaPk(0.5, false, 60, 5400),
    pd: [{ target: 'hr', emax: 0.6, ec50: 1 }], doses: '0.5–1 mg (child 0.02 mg/kg); arrest per ALS', onset: 'onset < 1 min, duration 30–60 min; HR +20–40 scaled by vagal tone (T6.2)', ir: '?', src: 'T6.2; R03 §8.6', tag: 'TXT' },
  // --- vasoactives (decision 4: rate-equivalent Ce, EC50 µg/kg/min) ---
  { id: 'phenylephrine', name: 'Phenylephrine', cls: 'alpha1', amountUnit: 'mcg', pk: vaso(0.04, 0.035, 1.2),
```

replace with:

```ts
    doses: '2 mg/kg at T2; 4 mg/kg at 1–2 PTC; 16 mg/kg immediate (M10 ch. 24 pp. 728–731)', onset: 'TOFR 0.9 in 2.2 / 2.7 min; 16 mg/kg T1 10 % in 1.2 min (label)', ir: '?', src: `Sgx label; V ${SUGAMMADEX.v1} L/kg`, tag: 'P' },
  { id: 'neostigmine', name: 'Neostigmine', cls: 'anticholinesterase', amountUnit: 'mg', pk: gammaPk(0.05, true, 600, 3600), elim: { renal: 0.5 },
    // FU-4 G7/F10: neostigmine's bradycardia is muscarinic — the reason it is never given without an
    // anticholinergic. `ec50` is neostigmine's own effect-site concentration in the row's units (mg-equivalent Ce, as
    // its `achGain` row uses); `emax` is ms added to the cycle length at full effect [ENG size, P direction].
    pd: [{ target: 'achGain', emax: 3, ec50: 1 }, { target: 'hr', emax: -0.5, ec50: 1 }, { target: 'vagalMs', emax: 500, ec50: 1 }],
    doses: '0.03–0.07 mg/kg, max 5 mg (with glycopyrrolate 0.2 mg per 1 mg)', onset: 'onset 1–3 min, peak ≈ 10 min; ceiling from TOF < 2 (7f; M10 ch. 24 p. 716)', ir: '?', src: 'Neo label; BJAEd 2020; T5d', tag: 'P' },
  { id: 'glycopyrrolate', name: 'Glycopyrrolate', cls: 'anticholinergic', amountUnit: 'mg', pk: gammaPk(0.2, false, 180, 10800),
    // FU-4 G7/F10: muscarinic occupancy 0–1 — 7g multiplies every `vagalMs` by (1 − occupancy), so an anticholinergic
    // given first abolishes the opioid and neostigmine bradycardias. ec50 in mg-equivalent Ce [ENG].
    pd: [{ target: 'hr', emax: 0.3, ec50: 1 }, { target: 'muscarinic', emax: 1, ec50: 0.35 }], doses: '0.2–0.4 mg', onset: 'onset 2–3 min, duration 2–4 h; HR +10–20', ir: '?', src: 'T6.2; brief §4.9', tag: 'TXT' },
  { id: 'atropine', name: 'Atropine', cls: 'anticholinergic', amountUnit: 'mg', pk: gammaPk(0.5, false, 60, 5400),
    pd: [{ target: 'hr', emax: 0.6, ec50: 1 }, { target: 'muscarinic', emax: 1, ec50: 0.3 }], doses: '0.5–1 mg (child 0.02 mg/kg); arrest per ALS', onset: 'onset < 1 min, duration 30–60 min; HR +20–40 scaled by vagal tone (T6.2)', ir: '?', src: 'T6.2; R03 §8.6', tag: 'TXT' },
  // --- vasoactives (decision 4: rate-equivalent Ce, EC50 µg/kg/min) ---
  { id: 'phenylephrine', name: 'Phenylephrine', cls: 'alpha1', amountUnit: 'mcg', pk: vaso(0.04, 0.035, 1.2),
```

- [x] **Step 2: the dropped field, the missing bolus times and the held rate — the three defects.**

#### Modify `packages/engine-core/src/l2/circ/model.ts`

Edit 1 — find:

```ts
    de.symp *= d7.symp ?? 1; de.setF *= d7.setF ?? 1; // FU-4 G2
  }
```

replace with:

```ts
    de.symp *= d7.symp ?? 1; de.setF *= d7.setF ?? 1; // FU-4 G2
    de.vagalMs = (de.vagalMs ?? 0) + (d7.vagalMs ?? 0); // FU-4 G7/F10: the vagal RR increment is ADDITIVE (ms), already × (1 − muscarinic occupancy) by 7g
  }
```

Edit 2 — find:

```ts
  const hypF = env.modeled ? Math.max(0.05, 1 - G_SA * m.cor.hyp - kSa) : 1; // FU-3 item 16: hypoxic SA-node depression (FU-4: + ischaemic, K)
  m.saF = hypF; // FU-4: every pacemaker, subsidiary ones included, shares the myocardial depression
  const rr = 60 / (m.prof.hrRest * b.hrF * de.hr * ch.hrF * (x.hrF ?? 1) * betaBlunt(x.endoHrF ?? 1, x.betaBlockAdd ?? 0) * hypF) + b.rrMs / 1000; // Stage 7g: β-blockade blunts the surge
  m.hrModel = Math.min(m.prof.hrMax, Math.max(30, 60 / rr));
  m.boluses = pruneBoluses(m.boluses, m.t);
```

replace with:

```ts
  const hypF = env.modeled ? Math.max(0.05, 1 - G_SA * m.cor.hyp - kSa) : 1; // FU-3 item 16: hypoxic SA-node depression (FU-4: + ischaemic, K)
  m.saF = hypF; // FU-4: every pacemaker, subsidiary ones included, shares the myocardial depression
  // FU-4 G7/F10: the drug bus's VAGAL RR increment is additive at the SA node, exactly like the baroreflex's vagal
  // limb (`b.rrMs`) — an opioid bolus or neostigmine lengthens the cycle rather than scaling the rate, which is why an
  // anticholinergic abolishes it (7g already multiplies `vagalMs` by 1 − muscarinic occupancy) and why the bradycardia
  // is deeper in a patient whose rate is already low.
  const rr = 60 / (m.prof.hrRest * b.hrF * de.hr * ch.hrF * (x.hrF ?? 1) * betaBlunt(x.endoHrF ?? 1, x.betaBlockAdd ?? 0) * hypF) + b.rrMs / 1000 + (de.vagalMs ?? 0) / 1000; // Stage 7g: β-blockade blunts the surge
  m.hrModel = Math.min(m.prof.hrMax, Math.max(30, 60 / rr));
  m.boluses = pruneBoluses(m.boluses, m.t);
```

#### Modify `packages/engine-core/src/l2/pk/pipeline.ts`

Edit 1 — find:

```ts
      } else {
        d.total += amt;
        // the engine's committed pk state can trail the command time by < 1 step: the bolus lands on its own grid instant
        if (t > pk.t + 1e-9) pk.due.push({ id: row.id, amt, t });
```

replace with:

```ts
      } else {
        d.total += amt;
        d.bolusTimes.push(t); // FU-4 G7: every bolus is recorded, not only the gamma rows' (the repeat-sux hook reads it)
        // the engine's committed pk state can trail the command time by < 1 step: the bolus lands on its own grid instant
        if (t > pk.t + 1e-9) pk.due.push({ id: row.id, amt, t });
```

#### Modify `packages/engine-core/src/l2/pk/hooks.ts`

Edit 1 — find:

```ts
// applies the request through the rhythm engine's public applyRhythm (Stage 7g never edits l2/ecg/**).
import type { RhythmId, RhythmOpts } from '../../types.ts';
import { concOf, type PkState } from './pipeline.ts';
import { DRUGS } from './data/drugs.ts'; // FU-2 (E-FU2-7)
```

replace with:

```ts
// applies the request through the rhythm engine's public applyRhythm (Stage 7g never edits l2/ecg/**).
import type { RhythmId, RhythmOpts } from '../../types.ts';
import { uniform, type Sfc32State } from '../../rng/sfc32.ts'; // FU-4 G7: the repeat-sux draw is seeded
import { concOf, type PkState } from './pipeline.ts';
import { DRUGS } from './data/drugs.ts'; // FU-2 (E-FU2-7)
```

Edit 2 — find:

```ts
  lastStage: number; // 0 none, 1 brady, 2 VF
  mgDone: boolean;
}

export const createHookState = (): RhythmHookState => ({ aden: { active: false, from: 'sinus', peak: 0 }, lastStage: 0, mgDone: false });

const NODE_DEPENDENT = ['svtAvnrt', 'svtAvrt'];
```

replace with:

```ts
  lastStage: number; // 0 none, 1 brady, 2 VF
  mgDone: boolean;
  /** FU-4 G7/F10: the repeat-succinylcholine bradyarrhythmia — `drawnFor` is the bolus time already drawn for. */
  sux: { drawnFor: number; until: number; from: RhythmId };
}

export const createHookState = (): RhythmHookState => ({ aden: { active: false, from: 'sinus', peak: 0 }, lastStage: 0, mgDone: false, sux: { drawnFor: -1, until: 0, from: 'sinus' } });

/**
 * FU-4 G7/F10: a SECOND succinylcholine dose given a few minutes after the first, without an anticholinergic, can
 * cause a profound muscarinic bradyarrhythmia — junctional escape, sinus arrest or (reported) asystole. Succinylcholine
 * and its metabolite succinylmonocholine sensitise cardiac muscarinic receptors, which is why the first dose usually
 * does nothing and the second one does, why atropine or glycopyrrolate given first prevents it, and why it is
 * commonest in children (M10 ch. 23 "succinylcholine: bradycardia … especially after a second dose and in children").
 * It is a RISK, not a certainty, so it is a seeded draw on the `outcome` stream, not a deterministic response.
 */
export const SUX_REPEAT_P = 0.35; // adult probability per repeat dose [ENG]
export const SUX_REPEAT_P_CHILD = 0.7; // < 12 y [ENG: "much commoner in children"]
export const SUX_REPEAT_MIN_GAP_S = 90; // a second dose inside the same rapid sequence is one dose
export const SUX_REPEAT_MAX_GAP_S = 1200; // beyond 20 min the sensitisation has gone [ENG]
export const SUX_BRADY_RATE_BPM = 45;
export const SUX_BRADY_S = 60;
export const SUX_MUSC_BLOCK_PROTECT = 0.5; // atropine/glycopyrrolate occupancy that abolishes it

const NODE_DEPENDENT = ['svtAvnrt', 'svtAvrt'];
```

Edit 3 — find:

```ts
const adenosineBlock = (pk: PkState) => hill(concOf(pk, 'adenosine'), ADEN_AV.ec50, ADEN_AV.emax, ADEN_AV.hill ?? 1);

export function rhythmRequest(pk: PkState, hs: RhythmHookState, current: { id: RhythmId; pinned: boolean }, t: number): { id: RhythmId; opts: RhythmOpts } | null {
  void t;
  if (current.pinned) return null;
  const block = adenosineBlock(pk); // FU-2 (E-FU2-7): was pk.bus.avNodeBlock
  // adenosine
```

replace with:

```ts
const adenosineBlock = (pk: PkState) => hill(concOf(pk, 'adenosine'), ADEN_AV.ec50, ADEN_AV.emax, ADEN_AV.hill ?? 1);

export function rhythmRequest(pk: PkState, hs: RhythmHookState, current: { id: RhythmId; pinned: boolean }, t: number, outcomeRng?: Sfc32State): { id: RhythmId; opts: RhythmOpts; hold?: boolean } | null {
  if (current.pinned) return null;
  // FU-4 G7/F10: the repeat-succinylcholine bradyarrhythmia (seeded; abolished by an anticholinergic given first)
  const bt = pk.drugs['succinylcholine']?.bolusTimes ?? [];
  if (hs.sux.until > 0) {
    if (t >= hs.sux.until) {
      hs.sux.until = 0;
      return { id: hs.sux.from, opts: {} };
    }
  } else if (bt.length >= 2) {
    const last = bt[bt.length - 1] as number;
    const gap = last - (bt[bt.length - 2] as number);
    if (
      last > hs.sux.drawnFor && gap >= SUX_REPEAT_MIN_GAP_S && gap <= SUX_REPEAT_MAX_GAP_S &&
      (pk.fx.muscBlock ?? 0) < SUX_MUSC_BLOCK_PROTECT && SINUS_GROUP.includes(current.id)
    ) {
      hs.sux.drawnFor = last;
      const p = pk.patient.ageY < 12 ? SUX_REPEAT_P_CHILD : SUX_REPEAT_P;
      if (outcomeRng !== undefined && uniform(outcomeRng) < p) {
        hs.sux.until = t + SUX_BRADY_S;
        hs.sux.from = current.id;
        return { id: 'junctionalEscape', opts: { rateBpm: SUX_BRADY_RATE_BPM }, hold: true }; // the vagal rate is the node's, not the circulation's, for its 60 s
      }
    }
  }
  const block = adenosineBlock(pk); // FU-2 (E-FU2-7): was pk.bus.avNodeBlock
  // adenosine
```

#### Modify `packages/engine-core/src/engine.ts`

Edit 1 — find:

```ts
      circ7g.ext.tempC = ps.resp.temp.tc; // FU-4 G12: core temperature for the hypothermic (and G8 hyperthermic) arrest hazard
    }
    const req7g = rhythmRequest(ps.pk, ps.pkHooks, { id: ps.rhythm.id, pinned: false }, end / ECG_RATE); // Stage 7g
    if (req7g) {
      // exactly as the engine's setRhythm and device paths: the rhythm clock restarts at the new rhythm's rate
      ps.hr = constantRamp(startRate(req7g.id, req7g.opts));
      holdRate(ps, req7g.id, false); // FU-2: an engine-initiated sinus rate belongs to the reflex
      applyRhythm(ps.rhythm, req7g.id, req7g.opts, end / ECG_RATE, true, rhythmCtx(ps));
    }
```

replace with:

```ts
      circ7g.ext.tempC = ps.resp.temp.tc; // FU-4 G12: core temperature for the hypothermic (and G8 hyperthermic) arrest hazard
    }
    const req7g = rhythmRequest(ps.pk, ps.pkHooks, { id: ps.rhythm.id, pinned: false }, end / ECG_RATE, ps.rng.outcome); // Stage 7g (FU-4 G7: the repeat-sux draw uses the `outcome` stream)
    if (req7g) {
      // exactly as the engine's setRhythm and device paths: the rhythm clock restarts at the new rhythm's rate
      ps.hr = constantRamp(startRate(req7g.id, req7g.opts));
      holdRate(ps, req7g.id, req7g.hold ?? false); // FU-2: an engine-initiated sinus rate belongs to the reflex (FU-4 G7: a vagal event's own rate is held)
      applyRhythm(ps.rhythm, req7g.id, req7g.opts, end / ECG_RATE, true, rhythmCtx(ps));
    }
```

- [x] **Step 3: the STIMULUS-driven vagal events stay Task 12's, and are named here so they are not lost.** The code
  above covers the DRUG-driven events (opioid bolus, neostigmine without an anticholinergic, repeat succinylcholine).
  Task 12's remaining prose — 7a's `control()` vagal terms for a surgical stimulus, the stimulus observer with the new
  `site` field, and `circVagalStimulus` — is UNPROTOTYPED and must be written with the same discipline before Task 12 is
  ticked: the anchor is the `const rr = 60 / (` line of `model.ts` (now carrying `de.vagalMs`), the increment is the same
  additive ms term, `circVagalStimulus` is defined in `model.ts` (the review found it undefined), and it must be
  × (1 − muscarinic occupancy) like the drug path so that atropine abolishes a laryngoscopy bradycardia too. Sites and
  sizes are [ENG]; record the measured HR fall per site.
- [x] **Step 4: the tests** (`test/engine/vagal-events.test.ts`, SLOW_B, one yield per sim-minute, clinical titles from
  the glossary in `research/11`): fentanyl 10 µg/kg → HR nadir ≤ 55 and `> 40` (no arrest); the same after
  glycopyrrolate → nadir within 5 of control; remifentanil 3 µg/kg → nadir ≤ 58; neostigmine 0.05 mg/kg alone → nadir
  ≤ 50; **S15: repeat succinylcholine over 3 seeds → ≥ 1 seed shows a junctional escape (`junctionalEscape`) and 0 seeds
  do with atropine first**; a separate unit test over ≥ 20 seeds asserts the paediatric RATE exceeds the adult rate.
  Add the file to SLOW_B in `vite.config.ts` (Task 20's split) — the entry already exists from Task 12's step.
- [x] **Step 5: re-measure and record.** The audit's H1/H1b/H2/H3/A9 rows (the table above), the `tick-bench` p50 (one
  addition per control step), and 7f's NMB tests (`bolusTimes` now records every row's boluses — check nothing else
  reads it; `tachy()` reads it for gamma rows only). Run `test/l2/pk`, `test/engine/pk-*`, `test/engine/neuro-*`,
  `test/engine/circ-sanity-*`. Commit and push
  (`fix(pk): the vagal events reach the circulation — dropped vagalMs, bolus times, held rate (FU-4 G7/F10)`).

### Task 18g: a non-finite time never crashes the engine — loud in tests, clamped in the demo (E-FU4-18; FU-6's Request 3, 2026-09-28; UNPROTOTYPED)

**Files:**
- Modify (Stage 5, **E-FU4-18**): `packages/engine-core/src/l2/ecg/rhythm-engine.ts` (the scheduler that throws
  `"rhythm <id>: next event time is NaN"`) — and any other step that derives a TIME from physiology (the escape timer,
  `startRate`/`effectiveRateBpm` callers, `arrest.ts`'s hazards, `peaDecayStep`'s rate): a rate of 0 or NaN must not
  become a scheduled instant
- Create: `packages/engine-core/test/l2/ecg/nan-guard.test.ts` (fast set)

**Why (FU-6's Request 3).** A physiological dead end — the infant of Task 18d's Step 2b, PaCO2 climbing without bound —
reached the rhythm scheduler as a NaN and **killed the engine mid-run**. A simulator must not die because one derived
number went non-finite: the operator loses the session, and the cause is invisible. But silently swallowing it is worse,
because the physiology bug then never gets found. So the guard is deliberately **asymmetric**:
- **In tests (`process.env.NODE_ENV === 'test'` or `CI`, whichever the repo already uses — match the existing
  convention, do not invent a new flag): THROW/assert with the offending value, its source field and the sim time.** Every
  existing test that would now hit it must be fixed at the physiology, not by relaxing the guard.
- **Everywhere else: clamp to the last finite value (or the rhythm's default rate), keep running, and warn ONCE per
  engine instance** (a `warnedNonFinite` flag, so a 6 h demo does not print 10⁶ lines). The warning names the field.
- The guard is a **detector, not a fix**: every clamp it performs is a bug somewhere upstream, so the gate note lists any
  clamp that fired during the plan's runs, with the rig that produced it.

**Exception:** **E-FU4-18 (new, added 2026-09-28 on FU-6's Request 3)** — `l2/ecg/rhythm-engine.ts` may gain the guard,
alongside E-FU4-11's escape-timer work. No rhythm behaviour changes when every value is finite, and that is the first
test.

- [x] **Step 1: find every place a time is derived from physiology.** Grep for `next event time`, `Number.isNaN`,
  `escapeNextT`, `60 /` in `l2/ecg/**` and `l2/circ/arrest.ts`; list them in the gate note before editing.
- [x] **Step 2: one shared helper** (e.g. `finiteOr(value, fallback, field, t)`) so the behaviour is identical at every
  call site and testable once. It must be branch-free on the hot path (a `Number.isFinite` check per scheduled event is
  free; do not build a logging framework).
- [x] **Step 3: the tests.** (i) with a finite rate, every rhythm's scheduled instants are byte-identical to before the
  guard (a regression fixture, so the guard is provably inert); (ii) an injected NaN rate **throws in the test
  environment** with the field name in the message; (iii) with the test flag off, the same injection clamps, keeps
  stepping for 60 s and warns exactly once.
- [x] **Step 4: run the infant rig of Task 18d Step 2b with the guard's test mode ON** — it must pass without the guard
  ever firing, which is the proof that the dead-space root fix, not the guard, is what saved the infant. Commit and push
  (`fix(ecg): a non-finite scheduled time is loud in tests and clamped in the demo (FU-6 request 3)`).

### Task 19: housekeeping — `stage7e-shots.mjs` comments, console units, the organ-soak lactate drift (item 2; orchestrator note; G-FU3 ruling 5; UNPROTOTYPED)

**Files:**
- Modify: `apps/demo/scripts/stage7e-shots.mjs` (two comments), `apps/demo/src/physiology-console/meta.ts` (`lp.pPtx` unit)
- Investigate, then modify only what the finding names (declare the file in the gate note): the 24 h `organs-soak`
  lactate drift (the APNEA latch moved to FU-5)

- [x] **Step 1: the two wrong comments (G7e ruling 4).**

#### Modify `apps/demo/scripts/stage7e-shots.mjs`

Edit 1 — find:

```js
await scenario('hypo', 3600, 'hypothermia-60min'); // core ≈ 35.5, vasoconstricted, Tp shown
```

replace with:

```js
await scenario('hypo', 3600, 'hypothermia-60min'); // core ≈ 35.5 — above the GA vasoconstriction threshold (34.8 °C), so NOT yet constricted; Tp shown
```

Edit 2 — find:

```js
await scenario('gluc', 3600, 'hypoglycaemia-60min'); // HR ↑, GLU < 3.5 mmol/L (red)
```

replace with:

```js
await scenario('gluc', 3600, 'hypoglycaemia-60min'); // HR ↑, GLU amber below 3.5 mmol/L, red below 3.0
```

- [x] **Step 2: console units (orchestrator note item 3).** `lp.pPtx` is mmHg (7b's catalogue: "pPtx 15–25 mmHg"), not
  cmH₂O. The suffix rules already give V.1's future `…CmH2O` fields cmH₂O and `…MmHg` fields mmHg; at execution, list the
  explicit `LUNG` rows (`grep -n "'lp\.\|'mp\.\|'mech\." apps/demo/src/physiology-console/meta.ts`) against each field's
  unit in its source comment (`packages/engine-core/src/l2/lung/params.ts`, `mechanics.ts`, `types-lung.ts`) and fix
  every mismatch the same way.

#### Modify `apps/demo/src/physiology-console/meta.ts`

Edit 1 — find:

```ts
['lp.pPtx', 'Pneumothorax pressure', 'cmH₂O', 1],
```

replace with:

```ts
['lp.pPtx', 'Pneumothorax pressure', 'mmHg', 1],
```

- [x] **Step 3: the latched "APNEA (RESP)" alarm** — moved to FU-5 (monitor fidelity owns L3 alarms; orchestrator update
  2026-09-28); see Requests.
- [x] **Step 4: the 24 h `organs-soak` lactate drift 0.0271 vs ±0.02 (local 24 h; CI's 6 h passes; predates FU-3).** Run
  the soak locally with lactate logged hourly; decide between a real slow drift (a tiny imbalance in 7c's production vs
  7d's hepatic clearance — find the term and fix it where it lives, E-FU4-14) and a rest-state offset (then pin it: the
  test's own band stays, the finding goes to the gate note). Never widen ±0.02.
- [x] **Step 5: Commit and push** (`chore: stage7e-shots comments, console units, soak lactate (FU-4 item 2, housekeeping)`).


### Task 20: item 3 — `test-slow` split into two file groups (CI; D17)

**Files:** `packages/engine-core/vite.config.ts` (`SLOW_A`/`SLOW_B`, two sets), `.github/workflows/ci.yml` (a matrix)

**Why (G7e note, FU-4 item 3):** `test-slow` ran 56m44s on PR #22 (36 files); FU-3 and this plan add ≈ 8 more multi-minute
files and the clinical suite. Local wall on the prototype: 1 242 s for the whole slow set; the long-run group (`*longrun*`
435 s + `engine-pipeline` 52 + `organs-soak` 53) plus the clinical suite ≈ 750 s; the rest ≈ 700 s → two CI jobs of ≈ 35 min.

#### Modify `packages/engine-core/vite.config.ts`

Edit 1 — find:

```ts
const set = process.env.PME_TEST_SET;
```

replace with:

```ts
/**
 * FU-4 (D17): CI runs the slow set as two jobs (`slow-a`, `slow-b`) so neither passes ≈ 40 min on the runner; `slow` still
 * runs both locally. SLOW_A: the multi-hour drift files, the engine pipeline, the organ soak and the FU-4 clinical suite;
 * SLOW_B: every other SLOW entry. A new slow file joins SLOW (and, if it is a multi-hour run, SLOW_A).
 */
const SLOW_A = ['test/engine/**/*longrun*.test.ts', 'test/engine/engine-pipeline.test.ts', 'test/engine/organs-soak.test.ts', 'test/engine/clinical-suite.test.ts'];
// FU-4 (R50 review F8): SLOW_B is SLOW minus SLOW_A, and the difference cannot be taken by STRING comparison — the
// glob 'test/engine/neuro-*.test.ts' is not equal to 'test/engine/**/*longrun*.test.ts' but MATCHES the same 6 h
// neuro long run, so the measured lists were 10 + 35 files for a 44-file union and that run executed in BOTH CI jobs.
// The set difference is therefore made by Vitest's own matcher, with SLOW_A as an `exclude` on the slow-b run.
const SLOW_B = SLOW.filter((p) => !SLOW_A.includes(p));
const set = process.env.PME_TEST_SET;
```

Edit 2 — find:

```ts
    ...(set === 'slow' ? { include: SLOW, fileParallelism: false } : {}),
```

replace with:

```ts
    ...(set === 'slow' ? { include: SLOW, fileParallelism: false } : {}),
    ...(set === 'slow-a' ? { include: SLOW_A, fileParallelism: false } : {}), // FU-4 (D17)
    // FU-4 (R50 review F8): the groups MUST be disjoint — SLOW_A is excluded here by the same matcher that includes it
    // above, so a file matching a SLOW_A glob (e.g. the 6 h neuro long run) runs in slow-a only, never in both jobs.
    ...(set === 'slow-b' ? { include: SLOW_B, exclude: ['**/node_modules/**', '**/dist/**', ...SLOW_A], fileParallelism: false } : {}),
```

Edit 3 — find:

```ts
  'test/engine/blood-k-rhythm.test.ts', // FU-4 G3: hyperkalaemia runs of 2–20 sim-min
```

replace with:

```ts
  'test/engine/blood-k-rhythm.test.ts', // FU-4 G3: hyperkalaemia runs of 2–20 sim-min
  'test/engine/clinical-suite.test.ts', // FU-4 Task 22: the clinical scenario suite (SLOW_A)
```

(The suite file is created in Task 22; until then the pattern matches nothing, which Vitest accepts.)

#### Modify `.github/workflows/ci.yml`

Edit 1 — find:

```yaml
  test-slow:
    # Multi-sim-hour drift runs and long clinical scenarios of @pme/engine-core, one file at a time (see
    # packages/engine-core/vite.config.ts SLOW). Kept apart from the main job so their long synchronous stretches
    # cannot starve the Vitest worker RPC there.
    runs-on: ubuntu-latest
    timeout-minutes: 90
```

replace with:

```yaml
  test-slow:
    # Multi-sim-hour drift runs and long clinical scenarios of @pme/engine-core, one file at a time (see
    # packages/engine-core/vite.config.ts SLOW). Kept apart from the main job so their long synchronous stretches
    # cannot starve the Vitest worker RPC there. FU-4 (D17): two file groups, one job each.
    strategy:
      fail-fast: false
      matrix:
        group: [slow-a, slow-b]
    name: test-slow (${{ matrix.group }})
    runs-on: ubuntu-latest
    timeout-minutes: 90
```

Edit 2 — find:

```yaml
      - run: pnpm --filter @pme/engine-core test
        env:
          PME_TEST_SET: slow
```

replace with:

```yaml
      - run: pnpm --filter @pme/engine-core test
        env:
          PME_TEST_SET: ${{ matrix.group }}
```

- [x] **GATE, not a check (orchestrator ruling (FU-4 review), 2026-09-28 — review F8).** The local comparison is a
  blocking gate with a printed result, because the first version of this split was NOT disjoint and nobody noticed:
  ```sh
  cd packages/engine-core
  PME_TEST_SET=slow-a npx vitest list --reporter=json 2>/dev/null | ... > /tmp/a.txt   # or plain `npx vitest list`
  PME_TEST_SET=slow-b npx vitest list > /tmp/b.txt
  PME_TEST_SET=slow   npx vitest list > /tmp/ab.txt
  comm -12 <(sort /tmp/a.txt) <(sort /tmp/b.txt)    # MUST print nothing
  wc -l /tmp/a.txt /tmp/b.txt /tmp/ab.txt           # the two counts MUST sum to the third
  ```
  Paste both commands' output into the gate note. The measured pre-fix state was **10 + 35 files for a 44-file union**,
  with `neuro-longrun.test.ts` (the 6 h run) in both jobs.
- [x] **Record each group's CI wall and rebalance BEFORE the gate.** If either group exceeds **40 min** on CI, move
  files between the groups and re-run the disjointness gate. (Estimate: local 1 242 s × the ≈ 2.7 CI/local ratio
  measured on PR #22 ≈ 35 min — and that estimate does NOT yet include this plan's new slow files: `circ-pulsus`,
  `vagal-events`, `thermal-warmer` (3 × 60 sim-min), `tension-ptx` and the clinical suite.) Record the walls in the gate
  note either way.
- [x] If branch protection names the old `test-slow` check, the ORCHESTRATOR updates it (report it in the PR body).
  Commit and push (`ci: split test-slow into two disjoint file groups (FU-4 item 3, review F8)`).

### Task 21: validation t25 is ventilated as clinically done; `t25-apnoea` expects the arrest (8a data; G-FU3 ruling 4; UNPROTOTYPED)

**Files:** `packages/validation/suites/sanity/sanity-docs.ts` (**E-FU4-12**: 8a's document data); if 8a's grader has no
series for the arrest, `packages/validation/src/segments/series.ts` (the smallest reader) under the same exception.

**Why (G-FU3 ruling 4):** t25 (rocuronium → sugammadex) ran never ventilated for 29 min and now arrests (FU-3 Q-FU3-16a);
clinically the patient is ventilated from induction until the reversal, then allowed to breathe. The unventilated
course is a separate stress document that EXPECTS the arrest.

#### Modify `packages/validation/suites/sanity/sanity-docs.ts`

Edit 1 — find:

```ts
    actions: [at(60, ev({ kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg' })), at(1800, ev({ kind: 'drug', drugId: 'sugammadex', dose: 2, unit: 'mg/kg' }))],
    segments: [seg('recovery', 1800, 2400, rng('rr-back', 'state:rr', 'firstTAbove', 60, 240, `${T7} 25: spontaneous effort returns within ≈ 2.2 min of sugammadex [ENG]`, { threshold: 4 }))],
  }),
];
```

replace with:

```ts
    // FU-4 (G-FU3 ruling 4): ventilated from induction as clinically done; spontaneous breathing is allowed back with the reversal
    actions: [at(0, ev({ kind: 'airwayDevice', device: 'ett' })), at(0, ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 })),
      at(60, ev({ kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg' })), at(1800, ev({ kind: 'drug', drugId: 'sugammadex', dose: 2, unit: 'mg/kg' })),
      at(1800, ev({ kind: 'ventilation', source: 'spontaneous' }))],
    segments: [seg('recovery', 1800, 2400, rng('rr-back', 'state:rr', 'firstTAbove', 60, 240, `${T7} 25: spontaneous effort returns within ≈ 2.2 min of sugammadex [ENG]`, { threshold: 4 }))],
  }),
  doc({
    // FU-4 (G-FU3 ruling 4): the stress document — the same paralysis NEVER ventilated must end in an arrest (FU-3 Task 5,
    // FU-4 Tasks 4–6): an unventilated paralysed adult on room air arrests 5–14 min after SaO2 < 60 % (DeBehnke 1995;
    // Varvarousi 2011) — SBP below 30 within 5–20 min of the dose
    id: 't25-apnoea', title: 'Rocuronium 0.6 mg/kg, never ventilated: asphyxial arrest', source: `${T7} 25 (stress); FU-3 item 16`, durationS: 1800, mode: 'modeled', requires: ['7f', '7g'],
    actions: [at(60, ev({ kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg' }))],
    segments: [seg('arrest', 60, 1800, rng('sbp-collapse', 'state:sbp', 'firstTBelow', 300, 1200, 'asphyxial arrest 5–20 min after the dose [P: DeBehnke 1995; Varvarousi 2011]', { threshold: 30 }))],
  }),
];
```

- [x] **Notes for the executor.** `ventilation { source: 'spontaneous' }` must be accepted by Stage 3's validator (check;
  if the spelling differs, use the one `validateRespCommand` accepts). `state:sbp` reads the `state` event, which after
  Task 3 Step 5b carries the circuit's MAP (not the last beat) during an arrest — without that step the collapse would
  never be read. Run `npx -y pnpm@9.15.9 --filter @pme/validation test` and the sanity suite; record both documents'
  graded rows. Commit and push (`test(validation): t25 ventilated as clinically done; t25-apnoea expects the arrest (FU-4, G-FU3 ruling 4)`).

### Task 22: the clinical scenario suite (item 10; S1–S16; SLOW_A; partly PROTOTYPED)

**Files:** Create `packages/engine-core/test/engine/clinical-suite.test.ts` (in `SLOW` and `SLOW_A` since Task 20).

**What:** the audit's §6 suite as scripted engine tests with sources, on the audit rig (ETT, VCV 12 × 600, PEEP 5, FiO2
0.5), each yielding per sim-minute. Scenarios with their own files are mapped in the header (S3 Task 10, S7 Task 6, S11
Task 7, S12 FU-3 + Task 13, S15 Task 12). Adjustments to the audit's list: S4 is split (2 mg/kg must arrest — Ali's R53
statement; 1 mg/kg the audit's MAP/CO proposal), S6 is split (MAP; Ce after Task 14), S10 gains the treated arm (adrenaline
50 µg repeated), S13 asserts the CPR CPP band.

**Prototype (the plan writer ran this file on the Tasks 2–7 + 15 prototype, seed 7, ≈ 60 s wall):** S1 MAP 96 → 66
(0.69), ΔHR +3 ✓ · S1b 0.84 at 15 min (proposal ≥ 0.85) → `it.fails` · S2 3 % sevoflurane 20 min −21 %, ΔHR −1 ✓ ·
S4a tamponade + propofol 2 mg/kg PEA at +195 s ✓ · S4b 1 mg/kg MAP 57, CO −15 % → `it.fails` · S5 PEEP 10 in tamponade
ΔMAP 4 vs healthy 1, CO × 0.89 → `it.fails` (no FU-4 mechanism targets it; Q2) · S6a hypovolaemia + propofol MAP 82 → 4,
PEA ✓ · S6b Ce ratio 1.17 (target of Task 14) · S8 no PEA with 7a's own condition; +60 s once Task 11 routes it to 7b's
instantaneous tension → `it.fails` (Q14) · S9 SpO2 99, EtCO2 34 → 27, CVP 10, MAP 79 (Task 11 target; with the full plan SpO2 96.5, CVP 9, MAP 79, PEA +70 s → `it.fails`, Q15) · S10
anaphylaxis PEA at +240 s ✓ · S10b adrenaline 50 µg every 2 min: no arrest, MAP 108 ✓ · S13 CPR CPP 43–46 → `it.fails`
(Q13) · S14 80 y HTN −31 %, ΔHR 0 ✓ · S16 no arrest without Task 8's hyperthermic hazard; with the full plan applied:
VF (hyperthermia) at 44.4 min ✓ · S6b with the full plan: 2.01 ✓ (Task 14). The file below already carries the six
`it.fails` with those numbers. **Procedure (R45):** after Tasks 8–19, run it; a target
scenario (S6b, S9, S16) that misses becomes `it.fails` with its number; an `it.fails` that now passes is flipped.

**Orchestrator ruling (FU-4 review), 2026-09-28 — this task is re-run AFTER Tasks 18a–18g, and the review's honesty
findings (F15, F16, F9, F11) are landed in it:**
- **The `it.fails` list changes and must be re-counted.** **S8 flips to `it`** (Task 18c: PEA at 8.9 min) and **S13 flips
  to `it`** (Task 18a: CPP 23.8 in Paradis's 15–25, RA relaxation 18.0). **S3 JOINS the list with its number** (review
  F11: the tamponade SBP swing is 3–4 mmHg, unchanged — it was missing from the "six `it.fails`" count). S9's SpO2 side
  stays `it.fails` pending Ali's band (item 15). So the landed list is **S1b (0.84 / −24 %), S3 (swing 3–4 mmHg), S4b
  (MAP 57, CO −15 %), S5 (ΔMAP 4 vs 1, CO × 0.89), S6a's percentage side (−24 %), S9's SpO2 side** — state the count in
  the file header and in the gate note, and never state a count the file does not match.
- **S9 (and every physiological assertion) reads TRUTH, not the display** (D27 / review F9): `resp.o2.sao2` or
  `blood.out`, never `s.resp.num.spo2.shown`. The suite currently reads `spo2: s.resp.num.spo2.shown ?? -1`, and once
  FU-5 makes SpO2 invalid at low perfusion the `null → −1` would **satisfy** "SpO2 < 90" — a physiology test passing on a
  monitor dropout. Keep the displayed value in a separate column for the screenshots only.
- **S16's title promises what its body must assert** (review F16): the title says "core ≤ 44 °C" but the body asserts no
  temperature. Add `expect(tempAtArrest).toBeLessThanOrEqual(44)` from the resp temperature, or delete the clause. A
  title that promises more than the body is exactly what R45 forbids.
- **S2 must assert "no arrest"** (the audit's §6 wording: "no arrest in the healthy counterpart (S1, S2)"). It does not.
- **S6a gains the "arrest is not the rule" side** (Task 18e): "class III haemorrhage + propofol 2 mg/kg: no PEA within
  5 min" as `it` (met: nadir 28.7, no arrest), with the percentage side `it.fails`.
- **The MANUAL rows the audit asked for, added explicitly** (review F16, ruling 6): **"MANUAL tamponade + propofol: no
  engine arrest, MAP ≥ 35"** (measured L-B6, MAP ≥ 37 — which follows from D6, so the design choice becomes visible
  rather than implied), and **"MANUAL target 18/10 → displayed ≥ 60/25 (MAP ≈ 38)"** as `it.fails` with those numbers,
  cross-referenced to Q-FU3-4a and item 21 of the open questions.
- **The SLOW-group labels in the test headers are wrong and must match `vite.config.ts`** (review F16):
  `circ-lowflow-arrest` says "SLOW_A (Task 19)" at its head while Task 6 puts it in SLOW_B, and `blood-k-rhythm` says
  "(Task 19)" where it should say Task 20. Fix both while writing this file, and check every new FU-4 test file's header
  against the config.
- **New rows from the new tasks** (titles use the clinical labels of the glossary, `research/11-capability-inventory-and-glossary.md`):
  CPR alone after exsanguination gives no pulse in 10 min; CPR + 2 L + adrenaline restores a pulse within 4 min; 10 min
  of VF with CPR keeps `kIsch` < 0.9; an untreated PEA reaches asystole within 15 min; a tension pneumothorax on PPV
  reaches PEA in 3–10 min and decompression restores MAP ≥ 65 within 1 min; the repeat-succinylcholine bradyarrhythmia
  over 3 seeds (≥ 1 fires, 0 with atropine first); the 7 kg infant ventilates at PaCO2 35–45 with no non-finite value.

#### Create `packages/engine-core/test/engine/clinical-suite.test.ts`

```ts
// FU-4 clinical scenario suite (plan Task 22; audit §6 S1–S16, adjusted). What the orchestrator inspects BEFORE Ali is
// asked to test again (R53). Rig (audit §1): adult 40 y 70 kg male, seed 7, MODELED unless stated, intubated (ETT) on
// VCV 12 × 600 mL / PEEP 5 / FiO2 0.5 from t = 1 s (removes 7f's propofol airway obstruction as a confounder).
// Bands are the audit's proposals with their sources (Q1–Q12 are Ali's to confirm); R45: a band the mechanism misses is
// `it.fails` with the measured number in its title. Scenarios living in their own files: S3 → circ-pulsus (Task 10),
// S7 → circ-lowflow-arrest (Task 6), S11 → blood-k-rhythm (Task 7), S12 → circ-hypoxic-arrest (FU-3/Task 13),
// S15 → vagal-events (Task 12). Every run yields once per sim-minute (CI amendment 4); SLOW_A.
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type PatientProfile } from '../../src/index.ts';

type Ev = Record<string, unknown>;
type Step = [number, Ev];
interface Row { t: number; map: number; sbp: number; hr: number; co: number; cvp: number; spo2: number; etco2: number; cpp: number; propCe: number; pulseless: boolean; rhythm: string; cause: string }
let n = 0;
const drug = (drugId: string, dose: number, unit: string): Ev => ({ kind: 'drug', drugId, dose, unit, route: 'iv' });
const vent = (peep = 5): Ev => ({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep, fio2: 0.5 });
type St = {
  rhythm: { id: string; opts: { pulseless?: boolean } };
  hemo: { circ: { mapNow: number; beats: { t: number; sbp: number }[]; qFwd: number; lastEjT: number; t: number; arrest: { cause: string } | null; cor: { cpp: number } }; circOut: { pRa: number } };
  resp: { etco2: number; num: { spo2: { shown: number | null } } };
  pk: { bus: { cns: { propCe?: number } } };
};
const ARREST = new Set(['asystole', 'vfCoarse', 'vfFine']);

async function scenario(steps: Step[], tEnd: number, opts: { mode?: 'modeled' | 'manual'; patient?: PatientProfile; ventilated?: boolean } = {}): Promise<Row[]> {
  const e = createEngine({ seed: 7, mode: opts.mode ?? 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, ...(opts.patient ?? {}), sensors: { abp: 'connected', cvp: 'connected', spo2: 'on' } } });
  let hr = 75;
  e.on((x) => { if (x.type === 'measurement' && x.values.hr?.value != null) hr = x.values.hr.value; }, ['measurement']);
  const send = (t: number, event: Ev) => e.dispatch({ id: `cs${++n}`, issuedBy: 'test', type: 'applyEvent', event, atTick: Math.round(t * 50) } as unknown as Command);
  if (opts.ventilated !== false) { send(1, { kind: 'airwayDevice', device: 'ett' }); send(1, vent()); }
  for (const [t, ev] of steps) send(t, ev);
  const rows: Row[] = [];
  for (let t = 5; t <= tEnd; t += 5) {
    e.advanceTo(t);
    const s = (e as unknown as { st: St }).st;
    const c = s.hemo.circ;
    const bs = c.beats.filter((b) => b.t > t - 6);
    rows.push({
      t, map: c.mapNow, sbp: bs.length ? Math.max(...bs.map((b) => b.sbp)) : c.mapNow, hr, co: c.t - c.lastEjT > 3 ? 0 : c.qFwd * 0.06, cvp: s.hemo.circOut.pRa,
      spo2: s.resp.num.spo2.shown ?? -1, etco2: s.resp.etco2, cpp: c.cor.cpp, propCe: s.pk.bus.cns.propCe ?? 0,
      pulseless: s.rhythm.opts.pulseless === true || ARREST.has(s.rhythm.id), rhythm: s.rhythm.id, cause: c.arrest?.cause ?? '',
    });
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  return rows;
}
const win = (rows: Row[], a: number, b: number) => rows.filter((r) => r.t > a && r.t <= b);
const mean = (rows: Row[], k: keyof Row) => rows.reduce((s, r) => s + (r[k] as number), 0) / Math.max(1, rows.length);
const minOf = (rows: Row[], k: keyof Row) => Math.min(...rows.map((r) => r[k] as number));
const arrestAt = (rows: Row[], after = 0) => rows.find((r) => r.t > after && r.pulseless)?.t;
const TAMP = { kind: 'condition', id: 'tamponade', severity: 1 };

describe('FU-4 clinical scenario suite (MODELED, audit rig)', { timeout: 600_000 }, () => {
  let s1: Row[] = [];
  it('S1 healthy, propofol 2 mg/kg: MAP nadir 60–80 % of baseline at 2–5 min, HR change −10…+10, no arrest (Miller ch. 21 p. 519; Q1)', async () => {
    s1 = await scenario([[300, drug('propofol', 2, 'mg/kg')]], 1200);
    const base = mean(win(s1, 270, 300), 'map');
    const nadir = minOf(win(s1, 420, 600), 'map');
    const dHr = mean(win(s1, 420, 480), 'hr') - mean(win(s1, 270, 300), 'hr');
    console.log(`S1: MAP ${base.toFixed(0)} → ${nadir.toFixed(0)} (${(nadir / base).toFixed(2)}), ΔHR ${dHr.toFixed(0)}, 15 min ${(mean(win(s1, 1170, 1200), 'map') / base).toFixed(2)}`);
    expect(nadir / base).toBeGreaterThanOrEqual(0.6);
    expect(nadir / base).toBeLessThanOrEqual(0.8);
    expect(Math.abs(dHr)).toBeLessThanOrEqual(10);
    expect(arrestAt(s1)).toBeUndefined();
  });
  // R45: the audit's recovery proposal is missed by the prototype (0.84 at 15 min) — kept with the number (Q1)
  it.fails('S1b the same run: MAP back to ≥ 85 % of baseline by 15 min (audit S1 proposal; measured 0.84)', () => {
    expect(mean(win(s1, 1170, 1200), 'map') / mean(win(s1, 270, 300), 'map')).toBeGreaterThanOrEqual(0.85);
  });
  it('S2 healthy, sevoflurane to ≈ 1 MAC (3 % dial, 20 min): MAP −15 to −30 %, HR change ≤ +10 (Ebert 1995; Miller inhaled agents)', async () => {
    const r = await scenario([[300, { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 3, fgfLpm: 2, n2oFrac: 0 }]], 1500);
    const base = mean(win(r, 270, 300), 'map');
    const end = mean(win(r, 1440, 1500), 'map');
    const dHr = mean(win(r, 1440, 1500), 'hr') - mean(win(r, 270, 300), 'hr');
    console.log(`S2: MAP ${base.toFixed(0)} → ${end.toFixed(0)} (${((end / base - 1) * 100).toFixed(0)} %), ΔHR ${dHr.toFixed(0)}`);
    expect(end / base - 1).toBeLessThanOrEqual(-0.15);
    expect(end / base - 1).toBeGreaterThanOrEqual(-0.3);
    expect(dHr).toBeLessThanOrEqual(10);
  });
  it("S4a severe tamponade (compensated), propofol 2 mg/kg: collapse and PEA within 10 min (Ali, R53; Barash, pericardial disease)", async () => {
    const r = await scenario([[60, TAMP], [660, drug('propofol', 2, 'mg/kg')]], 1260);
    const pre = mean(win(r, 630, 660), 'map');
    const a = arrestAt(r, 660);
    console.log(`S4a: compensated MAP ${pre.toFixed(0)}, HR ${mean(win(r, 630, 660), 'hr').toFixed(0)}; PEA at +${a !== undefined ? a - 660 : '–'} s`);
    expect(pre).toBeGreaterThanOrEqual(75);
    expect(a).toBeDefined();
    expect((a as number) - 660).toBeLessThanOrEqual(600);
  });
  // R45: the prototype reaches MAP 57 and CO −15 % at 1 mg/kg (2 mg/kg arrests: S4a) — kept with the numbers (Q2)
  it.fails('S4b severe tamponade, propofol 1 mg/kg: MAP < 55 within 3 min and CO −25 % (audit S4 proposal; Q2; measured MAP 57, CO −15 %)', async () => {
    const r = await scenario([[60, TAMP], [660, drug('propofol', 1, 'mg/kg')]], 1260);
    const co0 = mean(win(r, 630, 660), 'co');
    const w = win(r, 660, 840);
    console.log(`S4b: MAP nadir ${minOf(w, 'map').toFixed(0)}, CO ${co0.toFixed(2)} → ${minOf(w, 'co').toFixed(2)}`);
    expect(minOf(w, 'map')).toBeLessThan(55);
    expect(minOf(w, 'co')).toBeLessThanOrEqual(0.75 * co0);
  });
  // R45: no FU-4 mechanism targets it; the prototype gives ΔMAP 4 vs 1 and CO ×0.89 — kept with the numbers (Q2)
  it.fails('S5 severe tamponade, PEEP 5 → 10: CO −20 % and MAP ≥ 10 mmHg more than the same PEEP in a healthy patient (Barash; measured ΔMAP 4 vs 1, CO ×0.89)', async () => {
    const t = await scenario([[60, TAMP], [660, vent(10)]], 1260);
    const h = await scenario([[660, vent(10)]], 1260);
    const dT = mean(win(t, 630, 660), 'map') - minOf(win(t, 660, 1260), 'map');
    const dH = mean(win(h, 630, 660), 'map') - minOf(win(h, 660, 1260), 'map');
    const coF = minOf(win(t, 660, 1260), 'co') / mean(win(t, 630, 660), 'co');
    console.log(`S5: tamponade ΔMAP ${dT.toFixed(0)} (CO ×${coF.toFixed(2)}), healthy ΔMAP ${dH.toFixed(0)}`);
    expect(coF).toBeLessThanOrEqual(0.8);
    expect(dT - dH).toBeGreaterThanOrEqual(10);
  });
  it('S6a hypovolaemia −30 % (1.5 L over 10 min), propofol 2 mg/kg: MAP < 50 (Johnson 2003; ATLS)', async () => {
    const r = await scenario([[60, { kind: 'bleed', volumeMl: 1500, overS: 600 }], [960, drug('propofol', 2, 'mg/kg')]], 1500);
    console.log(`S6a: MAP ${mean(win(r, 930, 960), 'map').toFixed(0)} → ${minOf(win(r, 960, 1500), 'map').toFixed(0)}; arrest ${arrestAt(r, 960) ?? '–'}`);
    expect(minOf(win(r, 960, 1500), 'map')).toBeLessThan(50);
  });
  it('S6b the same: propofol peak Ce ≥ 1.3× the healthy peak (Task 14, G10; Johnson 2003, Kazama 2002)', async () => {
    const h = await scenario([[960, drug('propofol', 2, 'mg/kg')]], 1260);
    const b = await scenario([[60, { kind: 'bleed', volumeMl: 1500, overS: 600 }], [960, drug('propofol', 2, 'mg/kg')]], 1260);
    const ratio = Math.max(...win(b, 960, 1260).map((x) => x.propCe)) / Math.max(...win(h, 960, 1260).map((x) => x.propCe));
    console.log(`S6b: peak Ce ratio ${ratio.toFixed(2)}`);
    expect(ratio).toBeGreaterThanOrEqual(1.3);
  });
  // R45: with Task 11's alias the tension is instantaneous (catalogue severity 1 = 25 mmHg at once) and PEA follows in
  // ≈ 60 s (audit E1 on the prototype: +60 s); the 3–10 min course needs a pressure build-up (Q14)
  it.fails('S8 tension pneumothorax (ventilated, one command), untreated: PEA within 3–10 min (the catalogue row: build-up 2–5 min, PEA ≈ 20–25 mmHg; measured +60 s, Q14)', async () => {
    const r = await scenario([[60, { kind: 'condition', id: 'tensionPtx', severity: 1 }]], 900);
    const a = arrestAt(r, 60);
    console.log(`S8: PEA at +${a !== undefined ? a - 60 : '–'} s`);
    expect(a).toBeDefined();
    expect((a as number) - 60).toBeGreaterThanOrEqual(180);
    expect((a as number) - 60).toBeLessThanOrEqual(600);
  });
  // R45: measured with Task 11's one-command PE (the plan applied in full): EtCO2 34 → 18 ✓ and PEA 70 s after propofol ✓,
  // but SpO2 96.5, CVP 9, MAP 79 — the lung PE row's shunt and 7a's φ mapping do not make the hypoxaemic, RV-failing
  // picture (Q15)
  it.fails('S9 massive PE (one command): SpO2 < 90, EtCO2 −10, CVP ≥ 15, MAP < 65 at 5 min; then propofol 1 mg/kg → PEA within 10 min (ACLS "T"; measured SpO2 96.5, CVP 9, MAP 79)', async () => {
    const r = await scenario([[60, { kind: 'condition', id: 'pe', severity: 1 }], [420, drug('propofol', 1, 'mg/kg')]], 1020);
    const w = win(r, 360, 420);
    const et0 = mean(win(r, 30, 60), 'etco2');
    console.log(`S9: SpO2 ${mean(w, 'spo2').toFixed(0)}, EtCO2 ${et0.toFixed(0)} → ${mean(w, 'etco2').toFixed(0)}, CVP ${mean(w, 'cvp').toFixed(0)}, MAP ${mean(w, 'map').toFixed(0)}; PEA ${arrestAt(r, 420) ?? '–'}`);
    expect(mean(w, 'spo2')).toBeLessThan(90);
    expect(et0 - mean(w, 'etco2')).toBeGreaterThanOrEqual(10);
    expect(mean(w, 'cvp')).toBeGreaterThanOrEqual(15);
    expect(mean(w, 'map')).toBeLessThan(65);
    expect(arrestAt(r, 420)).toBeDefined();
  });
  it('S10 anaphylaxis severity 1 (grade IV), untreated: arrest within 10 min (Ring & Messmer; Q7)', async () => {
    const r = await scenario([[60, { kind: 'condition', id: 'anaphylaxis', severity: 1 }]], 900);
    const a = arrestAt(r, 60);
    console.log(`S10: arrest at +${a !== undefined ? a - 60 : '–'} s`);
    expect(a).toBeDefined();
    expect((a as number) - 60).toBeLessThanOrEqual(600);
  });
  it('S10b anaphylaxis severity 1, adrenaline 50 µg at 2 min and every 2 min: no arrest in 15 min, MAP ≥ 65 at the end (UK Resuscitation Council)', async () => {
    const adr = [120, 240, 360, 480, 600, 720].map((t) => [t, drug('epinephrine', 50, 'mcg')] as Step);
    const r = await scenario([[60, { kind: 'condition', id: 'anaphylaxis', severity: 1 }], ...adr], 960);
    console.log(`S10b: arrest ${arrestAt(r, 60) ?? 'none'}; MAP end ${mean(win(r, 900, 960), 'map').toFixed(0)}`);
    expect(arrestAt(r, 60)).toBeUndefined();
    expect(mean(win(r, 900, 960), 'map')).toBeGreaterThanOrEqual(65);
  });
  // R45: the continuous CPR CPP is now measurable — 43–46 mmHg at quality 1 against Paradis's 15–25 (the CPR pump
  // constants and the missing vasomotor collapse of arrest: calibration, Q13)
  it.fails('S13 VF + CPR (quality 1): the continuous CPR CPP 15–25 mmHg (Paradis 1990; measured 43–46, Q13)', async () => {
    // commanded VF is a setRhythm, not an applyEvent: its own engine
    const eng = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: { abp: 'connected' } } });
    const cpp: number[] = [];
    eng.on((x) => { if (x.type === 'circ' && x.t > 180) cpp.push(x.cpp); }, ['circ']);
    eng.dispatch({ id: `cs${++n}`, issuedBy: 'test', type: 'setRhythm', rhythm: 'vfCoarse', atTick: 60 * 50 } as unknown as Command);
    eng.dispatch({ id: `cs${++n}`, issuedBy: 'test', type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 1 }, atTick: 120 * 50 } as unknown as Command);
    for (let t = 60; t <= 420; t += 60) { eng.advanceTo(t); await new Promise((res) => setImmediate(res)); }
    console.log(`S13: CPR CPP ${Math.min(...cpp).toFixed(0)}–${Math.max(...cpp).toFixed(0)}`);
    expect(Math.min(...cpp)).toBeGreaterThanOrEqual(15);
    expect(Math.max(...cpp)).toBeLessThanOrEqual(25);
  });
  it('S14 80 y hypertensive, propofol 2 mg/kg: MAP −30 to −45 %, HR change ≤ +10 (Reich 2005; Miller geriatrics)', async () => {
    const r = await scenario([[300, drug('propofol', 2, 'mg/kg')]], 900, { patient: { ageY: 80, weightKg: 70, conditions: [{ id: 'htn' }] } as PatientProfile });
    const base = mean(win(r, 270, 300), 'map');
    const nadir = minOf(win(r, 360, 660), 'map');
    const dHr = mean(win(r, 420, 480), 'hr') - mean(win(r, 270, 300), 'hr');
    console.log(`S14: MAP ${base.toFixed(0)} → ${nadir.toFixed(0)} (${((nadir / base - 1) * 100).toFixed(0)} %), ΔHR ${dHr.toFixed(0)}`);
    expect(nadir / base - 1).toBeLessThanOrEqual(-0.3);
    expect(nadir / base - 1).toBeGreaterThanOrEqual(-0.45);
    expect(dHr).toBeLessThanOrEqual(10);
  });
  it('S16 untreated MH under sevoflurane: arrest (VF/asystole) before 60 min, core ≤ 44 °C (MHAUS; Miller, MH; Q6)', async () => {
    const r = await scenario([[60, { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 2, n2oFrac: 0 }], [120, { kind: 'condition', id: 'mh', severity: 1 }]], 3720);
    const a = r.find((x) => x.t > 120 && x.pulseless);
    console.log(`S16: arrest ${a ? `${((a.t - 120) / 60).toFixed(1)} min ${a.rhythm} (${a.cause})` : 'none'}`);
    expect(a).toBeDefined();
    expect(a?.rhythm === 'vfCoarse' || a?.rhythm === 'asystole').toBe(true);
  });
});
```

- [x] **Run** (≈ 8–10 min; background + `until`): `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run
  test/engine/clinical-suite.test.ts > <scratchpad>/fu-4-integration-polish/suite.log 2>&1`; apply the R45 procedure;
  commit and push (`test(engine): the FU-4 clinical scenario suite S1–S16 (item 10)`).

### Task 23: the evidence page and screenshots the orchestrator inspects (item 10; Chromium only; UNPROTOTYPED)

**Files:** Create `apps/demo/fu4.html`, `apps/demo/src/fu4.ts`, `apps/demo/scripts/fu4-shots.mjs`, `apps/demo/e2e/fu4.e2e.ts`;
modify `apps/demo/vite.config.ts` (one page).

**What:** a demo page with seven scripted scenarios on the philips-like skin (monitor with ECG II, ABP, pleth, CO2; an
event log; ×4 speed), following `stage7e.ts`'s pattern (`mountMonitor`, `send()` with `atTick`, a `window.__pmeFu4` hook
with `start`, `simT`, `state()` → `{ rhythm, pulseless, map, cpp, kIsch }` read from the `circ`/`state` events):
1. healthy induction, propofol 2 mg/kg (shot at +3 min: MAP ≈ 66, HR ≈ 76);
2. Ali's case — tamponade 1 → propofol 2 mg/kg at 11 min → (shot at the PEA, ≈ 14 min: organised ECG, flat ABP, no pleth,
   the pulse-oximeter dropout is FU-5's);
3. class IV haemorrhage → PEA (shot 60 s after the arrest), then CPR + 2 L + adrenaline → ROSC (shot);
4. tension pneumothorax (one command) → PEA;
5. burns + succinylcholine → sine wave → VF (shot at the sine wave, K ≈ 9.5; shot in VF);
6. VF + CPR q 1 (shot: compression artefact, CPR CPP on the log);
7. massive PE (one command) → propofol → PEA.

`fu4-shots.mjs` (headless system Chrome, like `stage7e-shots.mjs`) writes ≤ 60 KB PNGs to `docs/gates/fu-4/` (viewport
1280 × 640; re-take at `deviceScaleFactor: 0.7` if a PNG exceeds 60 KB); `fu4.e2e.ts` is a smoke on scenario 2 only
(Chromium only: `test.skip(browserName === 'webkit', 'long ×4 run: Chromium only')`, `test.setTimeout(300_000)`):
the page reaches `pulseless: true` within 16 sim-min and logs no page errors. Vite page entry:

#### Modify `apps/demo/vite.config.ts`

Edit 1 — find:

```ts
        'physiology-console': page('physiology-console'), // Stage 7x
```

replace with:

```ts
        'physiology-console': page('physiology-console'), // Stage 7x
        fu4: page('fu4'), // FU-4 evidence page (Task 23)
```

- [x] Write the page, the script and the e2e (UNPROTOTYPED — the executor writes them against `stage7e.ts`/
  `stage7e-shots.mjs`/`stage7e.e2e.ts`, which they copy in shape); run `PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec
  playwright test apps/demo/e2e/fu4.e2e.ts`; take the shots; inspect each (the orchestrator will); commit and push
  (`feat(demo): FU-4 evidence page, screenshots and smoke (item 10)`).

### Task 24: Gate — full verification, gate note, PR

**Files:** `docs/gates/fu-4.md` (new), `docs/gates/fu-4/**` (shots, `audit-before.md`, `audit-after.md`), this plan (ticks).

- [x] **Step 1:** `git fetch origin && git merge origin/main`. **Orchestrator ruling (FU-4 review), 2026-09-28 (review
  F9):** stop and report if **V.1, FU-6 or 8b** have landed (not only V.1 and 8b) — the order is FU-4 → V.1 → FU-6 → 8b.
  **FU-5 landing is EXPECTED, not a stop:** it runs in parallel and owns L3, the renderer, skins, audio and the L2
  signal-quality lines of `hemo/pipeline.ts`. After a merge that brings FU-5 in, **re-run the clinical suite and
  `audit:physiology`** and record every number that moved in the gate note.
- [x] **Step 2: Full verification** (background + `until` loops of ≤ 10 min):

```bash
npx -y pnpm@9.15.9 typecheck
CI=1 PME_TEST_SET=fast npx -y pnpm@9.15.9 test > <scratchpad>/fu-4-integration-polish/fast.log 2>&1
cd packages/engine-core && CI=1 PME_TEST_SET=slow-a npx vitest run > <scratchpad>/fu-4-integration-polish/slow-a.log 2>&1
CI=1 PME_TEST_SET=slow-b npx vitest run > <scratchpad>/fu-4-integration-polish/slow-b.log 2>&1 && cd ../..
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 test:e2e > <scratchpad>/fu-4-integration-polish/e2e.log 2>&1
npx -y pnpm@9.15.9 --filter @pme/validation test
npx -y pnpm@9.15.9 check-notices
PME_AUDIT_OUT=<scratchpad>/fu-4-integration-polish/audit-after npx -y pnpm@9.15.9 run audit:physiology > <scratchpad>/fu-4-integration-polish/audit-after.txt 2>&1
sed -n '/^## Propofol/,$p' <scratchpad>/fu-4-integration-polish/audit-after.txt > docs/gates/fu-4/audit-after.md
```

  Also: validation `tick-bench` p50 (must stay < 6 ms on CI; record the local value), the R36 sweep (900 s budget) in
  `packages/ventilator`, and a 24 h local `hemo-longrun`/`organs-soak` (LONGRUN_HOURS local) with wall times.
- [x] **Step 3: The gate note** `docs/gates/fu-4.md`, in FU-3's format: (1) what shipped (task, gap, mechanism, files,
  tests); (2) the clinical scenario table — S1…S16 with band, measured value, verdict, source, and the screenshot for the
  scenarios Task 23 shot; (3) the audit matrix and arrest table before → after (`audit-before.md`, `audit-after.md`);
  (4) the `it.fails` list — every `it.fails` in the repo with its number (`grep -rn "it.fails" packages apps`), marking
  FU-4's flips (circ-sanity-1 propofol; `pk-bus` VA; FU-3's final HR; the three sepsis rows) and FU-4's new ones;
  (5) exceptions **E-FU4-1 … E-FU4-18** with file:line, each marked *approved by the orchestrator 2026-09-28* (and
  E-FU4-18 as FU-6's Request 3), with the declared-but-unused ones listed as unused; (6) deviations (every find block
  that had to be re-anchored, every band that moved, every rig re-derived); (7) open questions (the list below, updated
  with the measured numbers, and each of items 13–18 marked RULED with its task); (8) the evidence screenshots, each
  ≤ 60 KB.
- [x] **Step 3b: the two things the gate note must now show (orchestrator ruling (FU-4 review), 2026-09-28, with
  R54/R56).**
  - **The coverage-matrix cells FU-4 fills.** `research/12-coverage-matrix.md` is the standing definition of "linked
    physiology" (R54), and each stage's gate must show its part of it. List, with the measured verdict per cell, the
    cells this stage answers: the circulation × arrest/CPR/defibrillation cells (Tasks 3–6, 18a, 18b), circulation ×
    anaesthetic-induction cells across the patient contexts (Tasks 2, 14, 18e), the obstructive-shock cells (tamponade,
    PE, tension pneumothorax — Tasks 9, 10, 11, 18c), the blood/electrolyte × rhythm cells (Task 7), the
    thermal cells (Tasks 8, 16, 18), the drug × vagal-response cells (Tasks 12, 13, 18f) and the ventilation/dead-space
    cells (Tasks 15, 18d, including the infant). For each: the matrix's expected human response, the measured value, the
    verdict (plausible / too weak / too strong / wrong / missing), and — where it is still wrong — which stage inherits
    it. Cells the audits marked wrong that FU-4 does NOT fix must be named as such, not omitted.
  - **The glossary labels.** `research/11-capability-inventory-and-glossary.md` is the label source (R56). Every new test
    title, scenario name, console label and gate-note row uses its **clinical** name (abbreviation + full name + unit),
    with its collision rulings: cerebral perfusion pressure = **CPP**, coronary = **CoPP** (so the CPR work's numbers are
    CoPP rows, and the cerebral ones stay CPP), SpO2 perfusion index = PI, sinus rhythm is spelled "Sinus", respiratory
    rate = RR and the R–R interval = RRI. State in the gate note which labels this stage introduced.
- [x] **Step 4: Commit, push, open the PR** — title **"FU-4: integration polish — sympatholysis, emergent arrest,
  hyperkalaemia, obstructive shock, clinical scenario suite"**; body: summary per gap, the scenario table, the
  before → after matrix, the `it.fails` flips, the exceptions, the open questions, the CI split note (branch protection
  may name the old `test-slow` check), and the line `🤖 Generated with [Claude Code](https://claude.com/claude-code)`
  at the end. **Never merge.** Report the PR URL.


## Open questions (for the orchestrator / Ali; the plan does not wait on them — numbers are the prototype's)

Ali's twelve (audit §7), with the model's numbers after FU-4 and what the plan decided ("confirm with Ali" = decided in
Decisions from a textbook, Ali may overrule):

1. **Healthy induction** — decided (Miller ch. 21): MAP −25 to −40 %, HR unchanged. After: 2 mg/kg MAP 96 → 66
   (−31 %), HR +3; 1 mg/kg −19 %; recovery to 84 % at 15 min (the audit's ≥ 85 % proposal is `it.fails`, S1b). Confirm.
2. **Tamponade induction** — after: compensated severe tamponade (MAP 89, HR 106, CVP 17, CO 3.2); propofol 2 mg/kg →
   MAP 51 at 1 min, PEA at 3.2 min; 1 mg/kg → MAP 57, no arrest (the audit's 1 mg/kg proposal "MAP < 55, CO −25 %,
   PEA within 10 min" is `it.fails`, S4b). PEEP 10 in the ventilated, un-anaesthetised tamponade: CO −11 % (healthy
   −12 %) — no FU-4 mechanism makes PEEP worse in tamponade than in health (S5 `it.fails`). Q: is 1 mg/kg expected to
   arrest, and should PEEP 10 alone drop CO > 20 %?
3. **Low-flow arrest threshold** — decided in part (Paradis 1990: no ROSC below CPR CPP 15; Tennant–Wiggers: contractile
   failure within about a minute of no flow). The declaration is contractility ≤ 10 % (flow share) or MAP < 25 for 60 s;
   onset VF 10 % × risk, asystole 7 %, else PEA. Q: the PEA/asystole/VF proportions after exsanguination, tamponade and
   tension PTX; whether asystole should convert under CPR + adrenaline (the model keeps asystole).
4. **HR ceiling in shock** — after: class IV haemorrhage HR 184 → 91 before the PEA (pre-arrest bradycardia below kIsch
   0.5); septic shock warm HR 118. Q: is 130–150 the right plateau before decompensation (the age maximum is still
   reachable in compensated shock)?
5. **Hyperkalaemia thresholds** — decided [ENG], confirm: sinus slowing above membrane-effective K 7 (−12 %/mmol/L),
   contractility −20 %/mmol/L above 8, VF/asystole hazard above 8.5 (mean ≈ 2 min at K 9.5); the sine wave is complete
   at 8.5 (Stage 5.1). After: K 9.5 → VF at ≈ 1 min; burns + sux → VF at +3.7 min; CaCl2 first → none.
6. **Untreated MH** — Task 8's hazard above 42 °C (mean 5 min per °C) is [ENG]; S16 measures it. Q: when and how should
   untreated MH arrest (the prototype without it: 43.1 °C, pH 6.62, K 7.4, MAP 110 at 50 min)?
7. **Grade IV anaphylaxis** — decided (Ring & Messmer grade IV = arrest): severity 1 is profound shock that arrests
   emergently (PEA at 4 min); adrenaline 50 µg every 2 min prevents it (MAP 108 — perhaps too high: Q).
8. **Baroreflex resetting** — unchanged (D18): 35 % toward MAP after 7 min off target. Q: hours instead?
9. **MANUAL** — decided the minimum (D6): the same arrest state through the no-flow rule; MANUAL keeps R23's coronary
   balance because its tracker can hold an ischaemic ventricle (FU-3 defect 1, Q-FU3-4a). After: MANUAL bleed 2.5 L →
   PEA at 640 s; MANUAL tamponade chain (MAP ≥ 37) → no arrest. The monitor-fidelity audit adds that the MANUAL
   tracker cannot set a MAP below ≈ 40 (so an instructor cannot dial a peri-arrest pressure directly; the no-flow rule
   is reachable only through insults) — part of Q-FU3-4a. Q: reflex-free MANUAL physiology, the instructor's picture
   held until "lethal", or a MANUAL "patient compensates" switch?
10. **Default ventilation** — decided the mechanism (D13): MODELED PPV drops the MANUAL EtCO2 fit → 12 × 500 PaCO2 48.5
    (was 60). The rest (ETT anatomical dead space) is V.1's. Confirm.
11. **Hypothermia** — decided in part (D14): shivering fades 32 → 30 °C; VF hazard below 28 °C. Q: AF below 32 °C; VF "on
    manipulation" (the model's hazard is time-based only).
12. **Hypovolaemia PK** — after (without Task 14): propofol peak Ce 1.17× healthy at CO 3.1; target 1.3× (S6b) from
    Johnson 2003 — the executor extracts the paper's numbers into Task 14's test header.

**Status of Ali's twelve after the review (Orchestrator ruling (FU-4 review), 2026-09-28):** Q1, Q2, Q3 (the
proportions), Q4, Q5, Q6, Q7, Q8, Q9 (the semantics), Q11 and Q12's paper numbers are **Ali's and are kept as written**
— no mechanism moves on them before he answers. **Q10 is no longer V.1's and is no longer open:** it is FU-4's, ruled,
and landed in Task 18d (the measured table replaces the "12 × 500 PaCO2 48.5" line above: 38.5 with the root fix).
**Q5 gains F17's three gaps** (below). **Q9 gains the MANUAL tracker floor as a test, not a question** (below).

Items 13–18 below were the prototype's open questions. **Six of them are now RULED and are tasks; each keeps its
number, its measurement and a pointer to the task, so nothing is silently dropped:**

13. **CPR coronary perfusion — RULED (ruling 3) → Task 18a.** Was: CPR CPP 43–57 at quality 1 against Paradis's 15–25,
    and CPR alone restored a pulse after exsanguination. Now a mechanism task, **not** a calibration item: measured after,
    **CPP 23.8, RA relaxation 18.0, no pulse from CPR alone in 10 min**. **S13 flips to `it`.** What is still Ali's: the
    CPP 30 that adrenaline produces (above the band — Paradis's own finding) and Q3's asystole-under-CPR proportions.
14. **Tension pneumothorax build-up — RULED (ruling 1) → Task 18c.** Was: 25 mmHg at once and PEA in ≈ 60 s, deferred to
    "V.1's lungs". Now FU-4's, with a one-way valve: **PEA at 8.9 min on PPV**, none in 24 min spontaneously,
    decompression restoring MAP ≥ 65 in 10 s. **S8 flips to `it`.** New exception E-FU4-16; `lp.pPtx` keeps its name.
15. **Massive PE — RULED (ruling 2) → Task 11's measure-then-mechanism step.** Was: SpO2 96.5, CVP 9, MAP 79 at 5 min —
    not a massive PE. Now a task with a measurement first (PVR, RVEDV/RVEF, CVP, shunt, SvO2, `kIschRv` at 1/5/10 min)
    and only the mechanism it names. **One band question stays Ali's and is NOT assumed:** "SpO2 < 90 at FiO2 0.5" needs
    a ≈ 30 % shunt and may be stricter than the clinic — the plan proposes **SpO2 ≤ 92 at FiO2 0.5 (≤ 88 on air)** as a
    NEW band; CVP ≥ 15 and MAP < 65 stand. S9's SpO2 side stays `it.fails` until he answers.
16. **FU-3's asphyxia / `TAU_HYP_S` 150 → 260 s — accepted by the orchestrator as a sourced [ENG] re-fit, WITH
    conditions (review F13).** The scan is non-monotonic (220 → 4.82, 260 → 5.62, 300 → 5.43, 360 → 6.12) and 260 sits
    0.62 min inside the 5–14 band, so: **re-run D3's scan after Tasks 13, 18d and 12, and again at the gate; choose a
    value in the MIDDLE of the passing plateau rather than the first value inside the band; record the chosen value's
    margin in the gate note.** Q-FU3 rulings stand.
17. **The PEA's rate — RULED (ruling 7) → Task 18b.** Was: flat at 30/min for 20 min, no asystole. Now it decays to an
    idioventricular rhythm and then asystole (measured: **+110 s and +260 s** after the rate floor), and effective CPR
    suspends the decay. Ali still owns Q3's onset proportions.
18. **AF pulse deficit — RULED (ruling 5) → Task 17 Step 3 with a target.** 44 % of beats at AF 150 do not eject against
    ≈ 10–20 %. `it.fails` is allowed **only after two sourced mechanism attempts, each recorded with its number**, and
    the measurement must include the non-ejecting beats' preceding RR, EDV and LV vs aortic diastolic pressure.

New questions and items the review added:

19. **The two sourced propofol targets pull against each other (Ali's Q1, from Task 18e).** With the humoral arm,
    class III + 2 mg/kg no longer arrests (nadir 28.7, target 30–50) but healthy induction is **−24 %** against the
    −25 to −40 % band; a stronger arm puts class III in band (32.1) and healthy at −23 %. Making the suppression more
    potent does not help (the term saturates). **S1b and S6a's percentage side stay `it.fails` with these numbers.**
    Q for Ali: which target wins, or is −24 % acceptable for a healthy induction?
20. **Hyperkalaemia, three gaps recorded under Q5 (review F17).** The hazard ignores the **RATE of rise** (acute rises
    are far more arrhythmogenic; renal patients tolerate 7–8); there is **no AV block or slow wide-complex rhythm**
    (`l2/ecg/**` is out of scope); and **one prophylactic 1 g CaCl2 abolishing arrest for 15 min at K 10.7 is
    generous**. Direction and the reversal path are right (burns + sux VF at +3.7 min matches Martyn & Richtsfeld,
    Anesthesiology 2006;104:158–169's 2–5 min). No task now; Ali confirms with Q5.
21. **The MANUAL tracker's MAP ≈ 40 floor (ruling 6) — now a TEST, not only a question.** Task 22 adds, as `it.fails`
    with the numbers: **"MANUAL target 18/10 → displayed ≥ 60/25 (MAP ≈ 38)"** (monitor audit T4: 65/30),
    cross-referenced to Q-FU3-4a. The better fix — lowering the tracker's `CIRC_LIMITS` floors, or adding venous volume
    as a tracker control so a peri-arrest target is reachable and the no-flow rule can fire from an instructor setting —
    depends on Ali's MANUAL semantics (Q9) and is not done here.
22. **A 7 kg infant crashed the engine (FU-6's Request 3, 2026-09-28).** On today's main, an infant on an ETT with volume
    control dies at 240 s with `"rhythm sinus: next event time is NaN"` because the MANUAL calibration gave it ≈ 400 mL
    of dead space. Answered by Task 18d Step 2b (a named infant test) and Task 18g (the guard, E-FU4-18). Not a question
    for Ali — a defect with a test.

## Self-review

- **Coverage of the brief:** G2 (Task 2), G1 (Tasks 4–6; ROSC; MANUAL; FU-3 convergence), G3 (Task 7), G4 (Tasks 3–4 +
  the state event, 7d CBF — ruling 3), G5 (Task 5 + FU-3's `kHyp` for O2 content), G6 (Tasks 9–11: tamponade dynamics,
  pulsus, PEEP measured in S5, one PE event / one PVR source / one tension source per the orchestrator's V.1 note), G7
  (Task 12 vagal events; Task 6 pre-arrest bradycardia; Task 13 the monitor showing it — ruling 1), G8 (Task 8), G9
  (D6), G10 (Task 14), G11 (Task 15), G12 (Task 16), G13 (D18, Q8), G14 (moved to FU-5 — Requests), G15 (calibration; opioids in Task 12); the orchestrator's 2026-09-28
  update (escape reset → Task 13a; arrest EtCO2 kinetics → Task 17; the AF pulse deficit → Task 17 Step 3 with a target;
  the MANUAL MAP floor → a Task 22 `it.fails` row, not only Q9); **the seven FU-4 review rulings and FU-6's R1 and
  Request 3 → Tasks 18a (CPR, ruling 3), 18b (the PEA decay, ruling 7), 18c (the tension build-up, ruling 1), 18d (the
  dead-space root, ruling 4/R1, incl. the 7 kg infant), 18e (the humoral arm and the G2 re-fit, ruling 2), 18f (the vagal
  events, review F10), 18g (the NaN guard, Request 3), plus Task 11's PE measure-then-mechanism step (ruling 2), Task 13's
  split (ruling 5), Task 17's AF target (ruling 5), Task 20's disjointness gate (review F8) and Task 22's MANUAL floor
  row (ruling 6)**;
  FU-4 items 1–3 (Tasks 18, 19, 20); item 10 (Tasks 1, 22, 23); Ali's twelve questions (above); the G-FU3 rulings
  (1 → Task 13, 2 → re-measured: the reversal HR passes and flips in Task 6, check 18's recovery MAP stays `it.fails` at
  86.85, 3 → Task 13 Step 3 and Task 3, 4 → Task 21, 5 → Task 19; oracle mode MODELED — no change needed); the
  orchestrator's V.1 note (Requests; D9; Task 19 Step 2).
- **Find blocks (mechanical check, 2026-09-27):** a script (kept with the backup as `fu-4-verify.py`) applied every
  Create and Modify block of Tasks 0–24, in document order, to a clean archive of `origin/main` **`341b031`** (FU-3
  merged as `eab2371`; later commits are docs only): **19 creates, 144 edits, 0 errors** — every find matched exactly
  once at its point in the sequence. The same application to the worktree typechecks clean (`engine-core`, `apps/demo`,
  `validation`) with EVERY task applied, the unprototyped ones included. Tasks 1–8 and 15 reproduce the prototype's
  source (differences are comments, Task 3 Step 5b and Task 8's hyperthermic term). The suites were then run on the
  fully applied tree — results under "Full-plan run" below.
- **Risk: the floor removal is the biggest behavioural change.** It is MODELED-only (MANUAL keeps R23, D6) and every
  sibling suite was re-run; the only bands it moved are FU-3's asphyxia window (re-fit, D3) and the pre-declared flips.
  Any long MODELED scenario whose coronary deficit now spirals will show as a new arrest in the audit's table — the
  executor compares Task 6 Step 8's table with this plan's and reports differences.
- **Risk: G11 moves every long MODELED ventilated run** (PaCO2 60 → 48.5, the hypercapnic pressor term gone). The full
  slow set was run with it; one rig needed re-deriving (E-FU4-8). V.1 lands after FU-4 and re-merges.
- **Full-plan run (every task applied, the unprototyped ones included, on the prototype base; 2026-09-28):** typecheck
  clean; fast set 250 files — 1 105 passed / 1 skipped / 1 failed (Task 9's drainage test at 300 mL: MAP 81 → 87 — the
  unit rig still compensates at 300 mL; the test now uses 360 → 310 mL: MAP 47 → 77, measured); slow set 44 files /
  205 tests — 200 passed, and every failure is attributed: FU-3's asphyxia (2) ← Task 13's escape depression without
  the escape reset (Task 13 now says so), `pk-acceptance-pk` Eleveld equality and `neuro-engine` depth (52 vs < 52) ←
  Task 14's first resting reference (fixed with `coRefLpm`: `neuro-engine` green again; the Eleveld-equality rig still needs its CO pin, E-FU4-10 — the Ce rise under propofol's own CO fall is the mechanism), S9 ← Task 11 (now `it.fails`, Q15). S6b 2.01 and S16 (VF at
  44.4 min) pass. These are the executor's starting numbers, not guarantees for the corrected tasks.
- **UNPROTOTYPED:** Tasks 9–14, 16 (shivering), 17–19, 21, 23, 18g, Task 3 Step 5b, Task 8's hazard, Task 18d's Step 2
  (the per-profile L1 defaults) and Task 18f's STIMULUS-driven vagal events (all measured once in the full-plan run
  above, except Tasks 17, 19, 21, 23's page and 18g). Each gives its code and its R45 fallback.
- **What was PROSE ONLY and is now real code (Orchestrator ruling (FU-4 review), 2026-09-28 — review §A and F10).** The
  review measured that the earlier claim "every task applied" was not true of seven test files and three task bodies, and
  that **G7 did nothing measurable on the applied tree** (fentanyl 74 → 68, a second sux dose 73 → 73 — the audit's own
  "before" numbers). Honest state now:
  - **Real find/replace blocks, prototyped and measured:** Task 18a (CPR), 18b (the PEA decay), 18c (the tension
    build-up), 18d (the dead-space root), 18e (the humoral arm), 18f (the DRUG-driven vagal events — the rows, the hook,
    the dropped `vagalMs`, the bolus times, the held rate). The mechanical check below covers them.
  - **Still prose, and named as such:** Task 12's `control()` terms for a SURGICAL stimulus, the stimulus observer with
    the new `site` field and `circVagalStimulus` (Task 18f Step 3 gives the anchor and the rule); Task 13(i)'s Stage 5
    reset is a step now (13a) but unprototyped; Task 23's evidence page; Task 18g's guard.
  - **The test files the file map named and nobody wrote** — `flow-distribution`, `shiver-cutoff`, `arrest-etco2`,
    `circ-pulsus`, `obstructive-aliases`, `vagal-events`, `thermal-warmer` — **plus the new `tension-ptx`,
    `vent-infant` and `nan-guard`: writing them is part of their task's tick and the gate note lists each file with its
    test count.** A task is not ticked because its source edits applied.
- **Mechanical check after the review's fixes (2026-09-28):** `fu-4-verify.py` re-applied every Create/Modify block of
  Tasks 0–24 **including Tasks 18a–18f**, in document order, to a clean tree of `origin/main` `4f4ce06`:
  **19 creates, 217 edits, 0 errors**, and `tsc --noEmit` on `engine-core` is clean with every block applied.
- **Not done here (by design):** the explicit-tone baroreflex refactor (D1); AF in hypothermia (Q11); acute resetting
  (Q8); the paediatric opioid sensitivity (Task 18f's residual (ii) — a 7g/PK question); the `rs.airwayDevice` seam that
  would give an intubated but spontaneously breathing patient the ETT dead-space credit (Task 18d Step 3); the RATE-of-rise
  term in the hyperkalaemia hazard and AV block in hyperkalaemia (open question 20, `l2/ecg/**` out of scope).
  ~~a vasomotor collapse in arrest (Q13), a tension-PTX build-up (Q14), the ETT dead space (V.1)~~ — **these three are
  now DONE, in Tasks 18a, 18c and 18d.**
