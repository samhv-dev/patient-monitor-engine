# FU-9: Blood, fluids and acid–base integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> STATUS (2026-09-29, plan writer): WRITTEN, NOT YET REVIEWED (R50 review pending). Base: `origin/main` `76c952e`
> (= FU-3 + FU-4 `e81e53f` + FU-5 `16cdf79` + docs). VERIFIED: every task (Parts A and B) was prototyped in a detached
> scratch worktree on that base (`<scratchpad>/fu-9/wt`, never pushed; patch kept at
> `scratch/plans-backup/fu-9-prototype.patch`); a script applied THIS DOCUMENT's 60 find/replace blocks and 20 creates in
> order to `76c952e` — each find exactly once on `76c952e` and exactly once in the applied state — and reproduced the
> prototype byte for byte (Self-review). Measurement: the coverage-run-BF runner (`research/22-audit-scripts/`, copied to
> scratch, `PME_ENGINE` pointed at the worktree), all 74 cells before and after; `audit:physiology` before and after.
> The orchestrator's DV-25b input (research/20 V11) is answered in D12 (no FU-9 task; measured).

**Goal:** make the blood, fluid and acid–base layer behave as the textbooks say in the states the coverage run BF
(`research/22-coverage-blood-fluids.md`, 74 cells) found wrong, each by the smallest MECHANISM the report proposes, in
the layer that owns it (R51 chain order and canonical names), with every graded cell measured before and after on the
BF runner:

- **F1** the kidney excretes an expanded circulation (7d volume factor above normovolaemia; Hahn's context-sensitive
  retention — awake < GA < class III);
- **F2** a profile's K⁺ reaches the ECG and calcium antagonises it without drawing hypokalaemic morphology;
- **F3** low flow raises O₂ extraction before it cuts VO₂ (SvO₂ falls in haemorrhage; supply dependence only below
  the critical DO₂);
- **F4** septic capillary leak reaches the lung water;
- **F5** citrate is an anion in the strong-ion difference, its clearance does not collapse with (CO/CO₀)², stored
  red cells carry their lactate;
- **F6** renal K⁺ excretion follows plasma K⁺ and loop diuretics;
- **F7** a chronic hypercapnic profile starts with its chronic renal compensation (+3.5 HCO₃ per 10 mmHg);
- **F8** plasma COP from albumin AND globulins; a profile's albumin shows the same anion gap as the same albumin
  reached by dilution;
- **F9** metabolic alkalosis is compensated by hypoventilation;
- **F10** hypokalaemia potentiates non-depolarising block (Part B, after FU-7's `interactions.ts` rewrite);
- **F11** the brain follows plasma osmolality (hyponatraemic swelling).

**Architecture:** no new module; each change sits in its owner's file. 7d (`l2/renal/model.ts`, `l2/organs/pipeline.ts`,
`l2/brain/model.ts`), 7c (`l2/blood/{oxygen,solutes,fluids,core,params,pipeline}.ts`), 7e (`l2/endo/adapters.ts`
`writeBlood` only), 7f (`l2/neuro/spont.ts` `paco2SetPoint` and its call; `l2/neuro/{interactions,pipeline}.ts` in Part
B), and in Part B one engine line and Stage 3's `gasPatient().paco2Rest`. The plan is split by file overlap with the
in-flight plans:

- **Part A — independent, executes now** (after FU-4/FU-5, beside V.1/FU-6/FU-7/FU-8/7k): no file that FU-6's, FU-7's
  or FU-8's plan edits, or only lines those plans do not touch (named per task, with the other plan's blocks checked).
- **Part B — after FU-7 merges (and therefore FU-6):** F10 (`l2/neuro/interactions.ts`, whose `InteractionCtx` and the
  top of `ec50Multipliers` FU-7 Task 14 rewrites — FU-9's blocks avoid those lines but keep the order) and F7
  (`l2/gas/params.ts`, FU-6/7k's area while they are in flight).

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2, Playwright 1.63 (its own Chromium and WebKit are installed
locally), pnpm 9.15.9 via `npx`. No new dependencies.

**Spec:** `../research/00-orchestrator-rulings.md` (workspace, outside this repo): **R44** (Ali's calibration pass is
non-blocking; executors do not tune), **R45** (mechanisms, never band changes; unreachable targets `it.fails` with
numbers), **R51** + addenda 14 and 15 (canonical names: `blood.out.{albuminGL, bvRel, hbfRel, lactate}`, the renal seam
`blood.core.renal`, the engine chain order), **R53/R54** (linked physiology; the coverage matrix is the standing
definition), **R58/R60** (7i labs and coagulation are v1.1: the 17 coagulation NE cells stay out of scope), **G-FU4**
(FU-4's arrest behaviour — must not move), the **CM comorbidity run** (research/19: C7 COPD normocapnic, C11 COP at
albumin 25), **FU-8** (it owns ONE obese-patient definition, I-51, and profile/set-point consistency, I-52 — FU-9
does not redefine them). Sources: `research/22-coverage-blood-fluids.md` (§2 cells, §3 F1–F13, §5 acceptance, §6 Ali's
questions), `research/12-coverage-matrix.md` §5.10, `research/19-coverage-comorbidity.md`. Plans read for scope (so
nothing here duplicates them): FU-6 (`fu-6-respiratory-integration.md`, untracked: owns audit 09 R11 — anaemia → CO,
COHb washout — in its Task 14), FU-7 (`fu-7-drug-layer.md`, untracked: Task 14 routes Mg/iCa from 7c into
`interactions.ts`, no K⁺ term), FU-8 (`fu-8-followups.md`, being written), 7k (`stage-7k-respiratory-mechanics.md`,
untracked: mechanics and volumes only).

---
## Global Constraints

- **R45:** mechanisms, never band changes. No existing acceptance band is widened, removed or re-worded to pass. A band a
  mechanism cannot reach stays (or becomes) `it.fails` with the measured number in its title. A pre-declared `it.fails`
  that a task flips to `it` is named in that task with its before/after numbers. Constants that are not sourced are
  `[ENG]` with the fit target named in the code comment; no executor tunes a constant to pass a band (R44: that is
  Ali's pass). An existing test whose NUMBER moves because the physiology it pinned was the defect is re-pinned only
  where the task names it, with the old and new number and the reason in the test's comment.
- **R51:** canonical names (addendum 14); the engine chain order (validate/apply device → pk (7g) → neuro (7f) → organs
  (7d) → blood (7c) → endo (7e) → Stage 3 → hemo; advance: pk → resp/lung → blood → endo → organs → hemo) is not
  changed. 7c stays the only owner of `hbfRel`; 7d the only writer of `blood.core.renal`; 7e the only writer of
  `blood.core.fl.kfMult` (and, after Task 4, `fl.sigma`).
- **FU-4 arrest behaviour must not move.** The Gate task re-runs `npx -y pnpm@9.15.9 run audit:physiology` (research/08's
  four-patient propofol table, Ali's tamponade case, class III + propofol, the CPR rigs) and the FU-4 engine files
  `test/engine/{circ-lowflow-arrest,clinical-suite,blood-k-rhythm}.test.ts`; every task that touches the blood volume,
  O₂ extraction or K⁺ names its measured effect on them (the "FU-4 check" line in each task).
- **Base and branch:** branch `fu-9-blood-fluids` from `origin/main` (at least `76c952e`). Worktree
  `projects/patient-monitor-engine/scratch/wt-fu-9` (R25: never the shared checkout). Push after every task's commit
  (`git push -u origin fu-9-blood-fluids` the first time, `git push` after). Never push to `main`; never merge (the Gate
  task opens the PR and stops); the PR is never self-merged.
- **Part A / Part B:** execute Part A (Tasks A0–A8) now. Part B (Tasks B0–B2) starts only when FU-7 has merged to main:
  Task B0 is `git fetch origin && git merge origin/main` and re-verifies every Part B find block on the merged tree. If
  FU-7 has not merged when Part A is done, the executor runs the Gate for Part A alone (PR title suffix "(Part A)") and
  Part B becomes a second PR from the same plan.
- **Merging main while other stages land:** before any task that edits `engine.ts`, `l2/neuro/**`, `l2/endo/**`,
  `l2/blood/core.ts`, `l2/blood/params.ts`, `vite.config.ts`, and in the Gate task: `git fetch origin && git merge
  origin/main`. Every edit is a find-and-replace anchored on quoted text that matches EXACTLY ONCE on `origin/main`
  `76c952e`; if a block no longer matches byte for byte (FU-6 edits `l2/blood/{core,params,circ-adapter,pipeline}.ts` and
  `l2/neuro/spont.ts` on OTHER lines — except the ONE `s.paco2Set = paco2SetPoint(…)` line Task A7 shares with FU-6
  Task 13, whose merged form Task A7 gives; FU-7 edits `l2/endo/adapters.ts` `writeCirc` and `l2/blood/core.ts`'s
  `createSolutes` line), locate the same statement by its quoted comment and make the same change; never re-type a line
  you are not changing.
- **CI rules (CI amendments 1–4, restated so the executor needs no other document):**
  - `CI=1` for engine tests. Long-run horizons come from `test/helpers/longrun.ts` (never a hard-coded 24 h or 6 h).
  - Any test that can exceed ≈ 30 s wall (in practice every engine test running more than one sim-minute) yields once
    per SIM-MINUTE (`if (t % 60 === 0) await new Promise((r) => setImmediate(r))`).
  - Slow files go in the `SLOW` list of `packages/engine-core/vite.config.ts`. CI runs the slow set as two DISJOINT
    groups: `SLOW_A` and `SLOW_B` (= SLOW minus SLOW_A). **slow-b ran 37.6 min against its 40 min limit at the FU-4
    gate: every new slow file in this plan joins SLOW_A** (added to both `SLOW` and the `SLOW_A` list); the Gate task
    records both groups' times.
  - Packages that drive a real engine in tests keep the 30 s default budget (amendment 3).
  - Never `git stash` (the stash is shared across worktrees). Scratch and logs under `<scratchpad>/fu-9-blood-fluids/`,
    never bare file names in the repo.
  - Bounded waits: every wait on a background process is an `until` loop of ≤ 10 min that re-checks the PROCESS (not a
    marker line); re-arm it rather than lengthening it.
- **Commands:** pnpm is not on PATH: `npx -y pnpm@9.15.9 …`. No `timeout` on macOS. Engine test:
  `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run <path>` (paths relative to
  `packages/engine-core`). Physiology audit: `npx -y pnpm@9.15.9 run audit:physiology`. **BF runner** (the measurement
  every task quotes; ≈ 40 min for all 74 cells, 1–3 min per cell):
  ```
  cp -R ../research/22-audit-scripts <scratchpad>/fu-9-blood-fluids/bf        # once (the runner lives outside the repo)
  cd <scratchpad>/fu-9-blood-fluids/bf
  PME_ENGINE=<worktree>/packages/engine-core/src/index.ts BF_OUT=out/<task>.json \
    node --import ./hooks.mjs --experimental-strip-types cli.ts BF-02a BF-02b …   # ids or prefixes
  ```
  (`../research` is the workspace folder `projects/patient-monitor-engine/research`, next to `repo/`.)
- Strict TS (`noUncheckedIndexedAccess`, `erasableSyntaxOnly`), `.ts` import extensions, conventional commits. Every
  commit message ends with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (swap in your own
  model name if your harness gives another), and every commit is followed by `git push`. The PR body ends with
  `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- **Never touch** (other plans own them while in flight): `l2/lung/**`, `l2/resp/**`, `l2/gas/**`, `l2/co2/**`,
  `types-lung.ts`, `types-resp.ts` (FU-6/7k/V.1) — except, in Part B, `l2/gas/params.ts`'s `paco2Rest` (Task B2,
  E-FU9-3); `l2/pk/**` (FU-7); `l2/circ/**` (FU-4 merged; FU-6/FU-8 edit it); `l2/neuro/**` except `spont.ts`'s
  `paco2SetPoint`, its header line and its one call line (Task A7) and, in Part B, `interactions.ts`/`pipeline.ts`
  (Task B1); `l2/endo/**` except `adapters.ts`'s import, `BloodLike` type and `writeBlood` (Task A4); `engine.ts` except
  Task B1's one line (E-FU9-2); `packages/ventilator/**`; any UI file; `docs/physiology/**` (the orchestrator's);
  `package.json`, `pnpm-lock.yaml`, `.github/**`.

---
## Finding inventory (every BF gap, and what happens to it)

Decision codes: **task** (a task in this plan), **handed** (to a named plan or owner, reason given), **closed** (already
done on main; the evidence named), **Ali** (waiting on Ali — his decision, the model's numbers given), **7i v1.1**
(R58/R60), **recorded** (a measurement kept for the orchestrator, no action here). "Main" numbers are this writer's
BF-runner measurements on `76c952e` (seed 7; the report's own run was on `776ebb5`, BEFORE FU-4 merged — FU-4 moved
several cells, listed in the second table).

### F1–F11 (the report's §3) and the smaller gaps

| ID | Finding | Cells (verdict on main) | Measured on `76c952e` | Decision |
|---|---|---|---|---|
| F1 | An expanded circulation is never excreted; awake = GA = class III | BF-02a (WR), 02b (WR), 04 (TW), 01a (TW), 01b (TS), 14 (TW), 20b (TS) | RL 1 L/30 min: retention 30 min after the end awake 0.52, GA 0.53 (GA − awake +0.01), class III − GA 0.00; urine +14/+16 mL/h; 1 u RBC Hb +0.546 at 1 h; 5 L saline retained 3352 mL | **task A1** (7d `renal/model.ts` expansion factor) |
| F2 | A profile K⁺ never reached the ECG; calcium then drew hypokalaemia | BF-07a/b (auto PL), 07c (WR: arrhythmia), 08a (TW), 09a (auto PL) | **closed by FU-4 G3** (`bloodEcgTargets` now pushes `kEcg − 4.2`, `blood/pipeline.ts:211`): profile K 6.5/7.5/8.5/2.5 → ECG K 6.5/7.5/8.5/2.5, QRS 124 at 7.5, 260 at 8.5; after CaCl₂ 1 g at K 7.5 the ECG shows 6.34 (not < 3.5). Remaining items are not F2: BF-08a's QRS criterion (−5 ms in 3 min) is read on the ACUTE arm, whose K had fallen to 7.05 (QRS 98) by the dose — see "Recorded" R-3; BF-07c's missing VF/asystole at 8.5 is FU-4 G3's hazard (R-2) | **closed** (FU-4) |
| DV-25b | (orchestrator input, research/20 V11) hyperkalaemia treatment "works late"; contractility said to read plasma K | DV-25b (TW) | profile K 9.5 in VF, CaCl₂ + insulin–dextrose + NaHCO₃ at 100 s: kEcg 9.49 → 8.06 at +60 s → 7.68 at +100 s, contractility `kChem` 0.70 → 1.00 by +100 s (it already reads `kEcg`: `blood/pipeline.ts:178`, FU-4 G3); plasma K −0.28 at 10 min; the time courses are textbook (BF-08a/b/c/d in band) | **closed** for 7c (D12); the forced-rhythm PEA dip is **handed** (R-FU9-1: post-arrest circulation; R-FU9-2: FU-7 Task 12's shock table) |
| F3 | Low flow cuts VO₂ instead of raising extraction: SvO₂ rises in haemorrhage | BF-29b (WR) | 2 L bleed, CO 1.57: SvO₂ 77.8 % (VBG), lactate 3.0; normal-flow arm 85.6 % | **task A2** (7c `oxygen.ts`) |
| F4 | Septic capillary leak makes no lung water | BF-20a (WR), 20b (TS, with F1) | septic (kfMult 2.59) 30 mL/kg: extra EVLWI 0 vs healthy +3.34 mL/kg; PaO₂ +10 (healthy −8); ISF +1.30 L; MAP gain kept 109 % at 60 min | **task A4** (7e `adapters.ts` `writeBlood` writes σ; 7c `fluids.ts` `leakSigma`) |
| F5 | Citrate not an anion in the SID; clearance ∝ (CO/CO₀)²; stored-product acid | BF-05a (TS), 05d (TW) | class IV + 4 L ongoing loss + 10 RBC + 10 FFP in 40 min: iCa nadir **0.30** (the solver's floor) at 1940 s, citrate 10.7 mmol/L; BE nadir −5.6 at lactate **21**, MAP 7, **ARREST at 2430 s** (the iCa floor takes contractility to (0.3/1.1)^1.5 = 0.14) | **task A3** (7c `solutes.ts` `sidOf`, `core.ts` citrate clearance) |
| F6 | Renal K⁺ excretion blind to plasma K⁺ and to diuretics | BF-08d (TW) | furosemide 40 mg at K 7.5: urine +159 mL/h, K −0.002 at 3 h (the seam's K is refilled from 7c's unlimited cellular store) | **task A6** (7d `organs/pipeline.ts` `renalSeam`; 7c `core.ts` K set point on total-body K) |
| F7 | Chronic hypercapnia is built as acute; on main COPD GOLD 3 is now NORMOCAPNIC | BF-16b (TW); CM-07a (research/19 C7) | COPD 0.75 awake: PaCO₂ **39.7** (the report's 45.1 was before FU-4 F4 made `paco2Rest` a fixed 40), HCO₃ 24.35, pH 7.40 | **task B2** (Part B: `l2/gas/params.ts` `paco2Rest` from the COPD grade — tables §1.5 40/40/45/55 — and 7c's chronic HCO₃ at that PaCO₂, tables §5b.1 "+0.35 per mmHg, set by the profile"). CM routed C7 to FU-6, whose plan does not carry it; it lands after FU-6/FU-7 because `l2/gas` is theirs while in flight |
| F8 | COP from 1.6 × albumin; profile albumin hides its anion | BF-22a (TS), 22b (IN); CM-10c (TW) | albumin 20: COP 8.66, oedema threshold PAWP 6.7; AG −0.16 vs normal, BE +0.2 (profile) while dilution to the same albumin lowers AG 3.95 (BF-01a); CM-10c albumin 25: COP 11.5 | **task A5** (7c `fluids.ts` globulins; `core.ts` calibration at normal albumin) |
| F9 | Metabolic alkalosis not compensated | BF-15b (WR) | profile HCO₃ 34: PaCO₂ 38.9, pH 7.55 | **task A7** (7f `spont.ts` `paco2SetPoint` body only) |
| F10 | Hypokalaemia does not potentiate rocuronium | BF-09b (MI) | T1 25 % at 35.7 min at K 2.5 and 4.2 | **task B1** (Part B: `neuro/interactions.ts` after FU-7 Task 14 routes 7c's Mg/iCa into `InteractionCtx`; FU-7 adds no K term — checked) |
| F11 | The brain ignores plasma osmolality | BF-11b (MI) | glycine 3 L: Na 119.5, osm 290 → 275; ΔICP max +0.07 | **task A8** (7d `brain/model.ts` + the organ view's `osm`) |
| F12a | Anaemia → CO; COHb kinetics (audit 09 R11) | BF-18a (WR), 18b (TW), 19 (WR), 32b (MI) | Hb 6.7 awake: HR −2, CO +2.3 %; ANH CO +6.6 %; COHb 30 → 30 % in 60 min on FiO₂ 1 | **handed: FU-6 Task 14** (viscosity → SVR, reflex HR/CO; `cohbWashout`) |
| F12b | K⁺ 8.5 → arrhythmia/arrest (FU-4 G3) | BF-07c (WR), BF-M2 | profile and acute K 8.5 (QRS 260/248): sinus for 15 min, no VF/asystole/block (seed 7) | **Ali** (FU-4 merged; its K hazard fired at 9.5 in 65 s and at burns + sux; whether 8.5 should arrest within 15 min is a calibration question — R-2) |
| F13a | HFrEF + 1.5 L: SpO₂ 96 → 94 (tables 89–92) — lung water → shunt coupling weak | BF-21c (TW) | extra EVLWI +5.6 mL/kg, PAWP 14 → 29, SpO₂ min 94 (MR 90) | **handed: 7b owner** (`l2/lung`, in flight under FU-6/7k; FU-9 never touches `l2/lung`) — for the orchestrator to route |
| F13b | No protein binding: hypoalbuminaemia leaves propofol unchanged | BF-22c (MI) | propofol Ce 3.18 vs 3.18 | **Ali** (7g PK scope; v1.0 vs v1.1) |
| F13c | No alkali-loss (vomiting/NG) event | BF-15a (NE) | the state exists only as a profile HCO₃ | **Ali/orchestrator** (the report routed it to FU-7; FU-7's plan does not carry it — see Open question 6: a one-field extension of 7c's `metabolic` event, if wanted) |
| F13d | Methylene blue absent; MetHb static | BF-23 (NE) | SpO₂ 84 at MetHb 30 % | **Ali** (FU-7 library scope; v1.1) |
| — | Coagulation, TEG/ROTEM, heparin/protamine, TXA PD, DIC, temperature-corrected gases | BF-05e, 24, 25a–e, 26a–d, 27a–c, 28a–b, 31 (NE) | INR 1.00 after ≈ 1.5 BV dilution (7d liver INR only) | **7i v1.1** (R58/R60) |

### Cells FU-4 moved between the report's run (`776ebb5`) and main (`76c952e`) — recorded, not FU-9's

| ID | Cell | Report → main | Note |
|---|---|---|---|
| R-1 | BF-05d / BF-13a class IV rigs | no arrest → **asystole** at 2430 s (BF-05d), 2200/2420 s (BF-13a arms) | FU-4's low-flow arrest now ends the class IV + ongoing-loss rigs; for BF-05d the proximate cause is F5's iCa floor (0.30 → contractility × 0.14): Task A3 removes the arrest (prototype below) |
| R-2 | BF-07c K 8.5 | no arrhythmia (FU-4 pending) → still none in 15 min | FU-4 G3's hazard — Ali question (Open question 7) |
| R-3 | BF-08a calcium QRS | −9 → −5 ms (acute arm, K 7.05 at the dose, QRS 98) | the acute arm's K has fallen from its 7.5 peak by the dose time, so there is little widening to reverse; the profile arm is the discriminating one — measured (`bf/probe-ca.ts`): K 7.5, QRS 124 → **93 ms within 60 s** of CaCl₂ 1 g (kEcg 7.47 → 6.71; control stays 124) — calcium works as taught; no mechanism change, the Gate quotes it |
| R-4 | BF-10a hypomagnesaemia + torsades → MgSO₄ | sinus at 470 s → **asystole at 495 s** | after 165 s of pulseless torsades, 25 s after Mg converted it; reported to the orchestrator (FU-4 arrest/ROSC path), not a blood finding |
| R-5 | BF-16a / 17a / 17c ventilation rigs | PaCO₂ 60 → 45.8 (RR 6), 23.5 → 17.0 (18 × 600) | FU-4's dead-space change moved the rigs' PaCO₂; BF-17c CBF −22 % at PaCO₂ 17 (TW) follows from the brain's PaCO₂ floor, not from blood; recorded |
| R-6 | BF-29a Pv–aCO₂ gap | 17 → 22 (TS, band 6–20) at CO 1.57 (was 2.17) | the same 2 L bleed now drops CO further under FU-4's reflexes; recorded |
| R-7 | BF-08b insulin–dextrose | K −0.93 → −1.01 at 60 min (TS, band −1.0 to −0.6) | 0.01 past the band edge; FU-4/7e epinephrine K shift; recorded |

---
## Decisions (made while prototyping; the executor does not revisit them)

- **D1 — F1 is a multiplicative EXPANSION factor on 7d's excreted fraction, not a change to `volumeFactor`.** First
  prototype: an expansion branch inside `volumeFactor(eabv)` (V > 1 above normovolaemia). It never engaged in the
  ventilated rigs because `eabv = min(bvRel, (CO/CO₀)^0.75)` is capped by the CO term (the GA-ventilated patient sits
  at CO 5.3 against the kidney's healthy reference 5.6, so `eabv` < 1 whatever the volume): BF-04 unchanged (+0.55).
  Atrial stretch/ANP is a VOLUME signal, so the factor reads `bvRel` directly — `× (1 + 90·(bvRel − 1)⁺)`, cap 12 —
  and multiplies the same chain (`ef0 · natriuresis · S_GA · vNh · …`), so general anaesthesia (S_GA 0.6, the lower
  ventilated CO through vNh) and a bled patient (vNh ≪ 1) retain more by construction: Hahn 2010 (Anesthesiology
  113:470), Norberg 2007 (Anesthesiology 107:24), Drobin & Hahn 1999 (Anesthesiology 90:81). `V_EXP_GAIN` 90 is [ENG],
  fitted to ONE target (awake retention 20–30 % 30 min after the end: 0.22); gain 60 gave 0.34. The GA and class III
  differences are consequences, not fits. `volumeFactor`, `vNh` and their taus are untouched (the 7d curves and check 20
  stay bit-identical: `test/l2/renal/model.test.ts` 9/9 unchanged).
- **D2 — F3: the regional term stays the LACTATE source; VO₂ = demand − the global (DO₂crit) deficit only.** The
  report's wording ("regional VO₂ = min(demand, ER_MAX × regional DO₂)") needs a regional flow share the model does not
  have: the existing ramp reaches ZERO regional flow at q 0.55 (it was tuned as a lactate device, tables §7 17a), so
  that form still removes VO₂ at CO 2. The smallest mechanism that meets the brief ("raise extraction before cutting
  VO₂; supply dependence only below critical DO₂" — Cain 1977 J Appl Physiol 42:228; Shibutani 1983 Crit Care Med
  11:640) is to stop subtracting the regional term from VO₂: heterogeneous splanchnic dysoxia makes lactate while the
  other beds extract more. `deficit` keeps its meaning for lactate (17a unchanged: class III 3–5 at 30 min passes);
  no ER_MAX cap (it would bind only above 4.2 mL/kg/min demand and would need a lactate term of its own). 7c's SvO₂ is
  read only by `labs.ts` (VBG) and the truth panel — no circulation or gas code reads it (grep), so F3 cannot move FU-4.
- **D3 — F5: citrate counts 3 mEq/mmol in the SID; its (and acetate's) clearance follows CO/CO₀, not (CO/CO₀)².**
  Stewart/Fencl (citrate³⁻ is a strong anion at plasma pH); Driscoll 1987 (early acidosis, late alkalosis after
  metabolism); Kramer 2003 (Crit Care Med 31:2450: citrate is cleared by liver, muscle and kidney — whole-body flow).
  The report's third item (stored-RBC supernatant lactate "storage days / 2 [VERIFY]") is NOT added: with the first two
  the class IV + MTP cell already reaches BE −10.9 (band ≤ −10) and iCa 0.72 (band 0.6–0.95), the value is unsourced,
  and the product compositions in `params.ts` are [TXT] rows Ali calibrates (R44) — Open question 2. Side effect,
  declared (E-FU9-1): 7c's unit test "iCa −0.1 per unit-per-5-min" (a CHELATION rule) now reads 1.090 vs 1.033 ± 0.05,
  because the same citrate also acidifies and acidosis raises iCa (−0.42 per unit pH); it becomes `it.fails` with both
  numbers and a new test pins the chelation term itself (`K_CIT` per mmol/L at fixed pH).
- **D4 — F4: σ follows the leak, two-pore form `σ = 1 − (1 − σ₀)·kfMult` (floor 0.3), written by 7e with kfMult.**
  Inflammation opens large pores that carry both the extra hydraulic conductance and the protein flux (Rippe &
  Haraldsson 1994 Physiol Rev 74:163), so (1 − σ) scales with the same factor as Kf. No per-grade σ table is invented
  (the report's "0.5–0.7 by grade" is unsourced); kfMult 2.6 → 0.74, 3 → 0.70. 7c already passes σ/σ₀ to
  `lungWaterStep` and σ to `starling()`; the writer is 7e's `writeBlood`, the only kfMult writer (R51 addendum 16).
- **D5 — F8: total protein = albumin + a globulin MASS (24 g/L at normal) + 1.6·colloid; the profile calibration uses the
  NORMAL albumin unless the profile gives HCO₃.** 24 g/L keeps the normal TP 64 g/L = annex B1's 1.6 × 40, so every
  normal-albumin COP is bit-identical (22.35). Globulins dilute with plasma, leave with bleeding, and come in with plasma
  products (`globGL` 24 on FFP/platelets/whole blood). Consequence, declared: albumin 5 % (TP 50 g/L, no globulins) is
  now mildly hypo-oncotic on Landis's TP curve — BF-03a's 60-min volume effect 0.93 → 0.75 (band 0.7–1: still PL); the
  alternative (Nitta's separate albumin/globulin polynomials) would move the normal COP 22.4 → 17.8 and every lung-water
  threshold with it — Open question 4. The profile rule follows the report's first option (the Figge picture) and keeps
  "a given profile HCO₃ is honoured" as the second; the K reference pH is the patient's own resting pH, so K stays 4.2.
- **D6 — F6: renal K⁺ excretion = basal × (K/K_set) × √(UOP/UOP₀) in the seam (below the basal excretion the kidney
  RETAINS the intake's K); 7c's K set point follows the total-body K at 300 mmol per mmol/L.** Distal secretion rises
  with plasma K (Young 1988 Am J Physiol 255:F811) and sublinearly with distal flow (Good & Wright 1979 Am J Physiol
  236:F192); the loop diuretic acts through the flow (no furosemide-K constant). The reference is the PROFILE's K (a
  chronic state is in balance). An oliguric kidney keeps the intake's K with its chloride (`cl = 0.9·(na + k)` with
  k < 0: KCl retained) — the AKI hyperkalaemia; a first prototype clamped this at 0 and the untreated control then lost
  nothing, so furosemide's difference vanished under GA (+0.011). Without the set-point half the whole change is
  invisible: 7c's cells refilled the ECF to `set.k` from an unlimited store (the furosemide cell read −0.002). `kSet`
  now falls 1 mmol/L per `K_TBK_MMOL` 300 mmol of total-body deficit (Sterns 1981 Medicine 60:339: 200–400 mmol per
  mmol/L [TXT, midpoint]); a first prototype used the ECF/ICF ratio (≈ 930 mmol per mmol/L, −0.036). Transcellular drug
  shifts leave the total unchanged, so insulin, salbutamol, succinylcholine and pH shifts are bit-identical in shape.
  Considered and dropped: a loop-diuretic chloride term (urine SID → 0) — it did not change the sign under GA and 7d's
  urine composition is Ali's (Open question 10).
- **D7 — F9: `paco2Set = paco2Rest + 0.7·(HCO₃met − ref)` above ref, cap 55; ref = 24.4 + 0.35·(paco2Rest − 40)⁺;
  HCO₃met = HCO₃ − 0.1·(PaCO₂ − paco2Rest)⁺.** Javaheri & Kazemi 1987 (Am Rev Respir Dis 136:1011) / the Boston rules;
  Brackett 1965 for the acute buffer. The metabolic correction exists because a first prototype read the ACUTE HCO₃ rise
  of a hypercapnia as alkalosis (positive feedback, gain 0.07/mmHg); it acts only ABOVE the resting PaCO₂, so a resting
  patient is exactly unchanged (the audit rigs sit at PaCO₂ 39: a symmetric correction lifted their set point 0.08 mmHg
  at t = 0). The chronic reference makes F7's compensated retainer read as normal (not alkalotic). The call site passes
  `x.paco2` — ONE line that FU-6's Task 13 also edits (it adds `setShift`): whichever lands second re-anchors by
  content; the merged line is given in Task A7.
- **D8 — F11: brain water gains 0.145 mL per mOsm/kg FALL of 7c's effective osmolality, τ = HTS_TAU_IN_MIN.** The gain
  is the osmotherapy calibration's own (OSM_VMAX_ML × the 1 g/kg mannitol saturation ÷ its ECF osmolality rise) — the
  same brain, the same water per mOsm, so the two directions agree without a new fit. Only the FALL is read: a rise from
  hypertonic saline is already the dose-driven term (7d observes the same dose), so reading both would double-count.
  Making both directions one mechanism needs mannitol osmoles in 7c's ECF — Open question 8.
- **D9 — F7 (Part B): the COPD grade sets `gasPatient().paco2Rest` (tables §1.5: 40/40/45/55) and 7c builds the chronic
  compensation on it (tables §5b.1 "+0.35–0.4 per mmHg … set by the profile").** The tables already decided the
  mechanism; FU-4 F4 R1(a) made `paco2Rest` "the patient's OWN resting arterial CO2", and this is its first non-40 use.
  `createBloodState` passes that PaCO₂ to `createBloodCore`, which calibrates at it. Part B because `l2/gas/**` is
  FU-6/7k's while they are in flight (FU-6 adds pregnancy constants to the same file).
- **D10 — F10 (Part B): `hypokalaemiaMult(K) = max(0.7, 1 − 0.15·(3.5 − K)⁺)` on the non-depolarisers' EC50, from 7c's
  plasma K.** Direction: Miller 10e ch. 27; size [ENG] (Open question 9: K 2.5 → EC50 × 0.85 → rocuronium T1 25 %
  35.8 → 46.8 min on the steep Hill). Anchored on lines FU-7 Task 14 does not edit (the `neo` line, `NeuroEnv.tempC`,
  the engine's `tempC:` context line), so the blocks match main AND main + FU-7; Part B only to keep FU-7's
  `interactions.ts` rewrite first (one state per mechanism, R51 addendum 24).
- **D11 — F2 is closed by FU-4 G3.** `bloodEcgTargets` returns `kEcg − NORMAL.k` (absolute, `blood/pipeline.ts:211`) and
  `pushBloodEcg` starts from `ecg.k = 0`, so the first push carries the profile K: measured ECG K 6.5/7.5/8.5/2.5 for
  the four profiles, 6.34 after CaCl₂ at K 7.5. No FU-9 task.
- **D12 — DV-25b (orchestrator input, research/20 V11): no FU-9 task; measured.** Profile K 9.5 in VF, CaCl₂ 1 g +
  insulin 10 U/dextrose + NaHCO₃ 50 mmol at 100 s (`bf/probe-k.ts`): membrane-effective K (kEcg) 9.49 → 8.60 at +30 s,
  8.06 at +60 s, 7.68 at +100 s; contractility `kChem` 0.70 → 0.99 at +60 s → 1.00 at +100 s — it ALREADY reads the
  calcium-stabilised `kEcg` (`blood/pipeline.ts:178`, FU-4 G3), so V11's second claim does not reproduce on main.
  Plasma K 9.49 → 9.40 at +100 s, 9.21 at +10 min: insulin's textbook onset is 10–20 min with −0.6 to −1.0 at 30–60 min
  (UK Renal Association 2023; Allon & Copkney 1990), which BF-08b meets (−0.75 at 30, −1.01 at 60 min) and salbutamol
  BF-08c (−0.74 at 30 min); bicarbonate barely moves a non-acidotic K (BF-08d −0.21, band −0.4–0). So the treatment
  time courses are textbook; what DV-25b grades — a FORCED sinus after the shock dipping into PEA at +100 s and
  regaining a pulse at +185 s — is the post-arrest circulation (FU-4's ischaemic contractility) and the shock-outcome
  table (FU-7 Task 12 adds `kEcg` to it). Handed: see Requests R-FU9-1/2.
- **D13 — FU-4's arrest behaviour: unchanged except rows that are chaotic or septic.** `audit:physiology` (79 scenarios)
  on main and on the prototype (Parts A + B): Ali's tamponade case (B2/B7 PEA 830 s), class III + propofol (C1, no
  arrest), class IV (C4 645 s), the MTP row (G3 645 s), the K rows (G2b 65 s, G3b 525 s), MH (F4 2785 s), apnoea (I1
  910 s), the four-patient propofol table (healthy −23 %, 80 y HTN −21 %, AS + CAD −21 %, HFrEF −21 %) and the
  tamponade/hypovolaemia/PE propofol rows are identical (HFrEF/hypovolaemia/PE differ in the second decimal of CO).
  Moved: massive PE (D0 1775 → 1770 s), PE + PEEP 15 (D2 1350 → 1310 s), tension PTX (K-ptx 670 → 675 s; the matrix's
  PTX row asystole t+10 → t+15 s), anaphylaxis F2's minimum HR 61 → 59 (arrest time 295 s unchanged), and the matrix's
  septic-shock row (pre-dose CO 5.22 → 5.09, nadir at 65 s instead of 85 s, ΔHR −59 → −46, ΔCO −0.30 → −0.70, MAP
  −31.2 → −31.3 %, no arrest in either). Bisected with one task at a time: the septic row is Task A4 (σ 0.7 lets more of
  the septic patient's plasma leave: a slightly lower preload before the dose — the intended physiology); the PE/PTX
  arrest times move ONLY with Task A7, and they move by the same amounts under a set-point perturbation far below any
  physiology — ALK_SLOPE 0.0001 (≈ 10⁻⁵ mmHg for the first second) moves D0 by −5 s and K-ptx by +5 s, ALK_SLOPE 0.01
  moves D2 by −40 s: those three rows are chaotic at that scale (seed-level noise), not an effect of F9. Recorded for
  the orchestrator (R-FU9-4); no mechanism change. The FU-4 engine files (`clinical-suite`, `circ-lowflow-arrest`,
  `circ-hypoxic-arrest`, `blood-k-rhythm`, `fidelity-lowflow`) pass unchanged on the prototype.
---
## Prototype results (BF runner, all 74 cells, seed 7: main `76c952e` → the prototype with Parts A + B)

Part B changes only BF-09b (F10: K < 3.5) and BF-16b (F7: the COPD profile) — by construction every other cell is
identical with Part A alone (F10 is × 1 at K ≥ 3.5; F7 returns PaCO₂ 40 for every non-COPD profile). Quantities are the
runner's own keys (research/22 §2). The engine tests of each task reproduce the same numbers on their own rigs (quoted in
the tasks; small differences come from the runner's sensor set).

| F | cell | quantity: main `76c952e` → prototype (Parts A + B) | expected [research/22] | automatic verdict main → prototype |
|---|---|---|---|---|
| F1 | BF-02a | retAwake30 0.52 → **0.22**; retGA30 0.53 → **0.36**; gaMinusAwake 0.01 → **0.14**; dUopAwake 14 → **325** | retAwake30 0.2–0.3; GA − awake ≥ +0.05 | TS → PL |
| F1 | BF-02b | retHypo30 0.53 → **0.51**; retGA30 0.53 → **0.36**; hypoMinusGA 0 → **0.15** | class III − GA ≥ +0.05 | WR → PL |
| F1 | BF-04 | dHb1h 0.546 → **0.658**; dHb4h 0.547 → **0.744**; dBv1h 191 → **156** | dHb1h 0.7–1.3 | TW → TW |
| F1 | BF-01a | dCl 5.445 → **5.176**; dBE -0.451 → **-0.616**; dAlb -10.574 → **-8.917** | Cl 3–8; BE −4 to −1 | TW → TW |
| F1 | BF-01b | dBE 1.749 → **1.502**; dBEvsSaline 2.2 → **2.12** | BE ≈ 0 ± 1; vs saline ≥ +1 | WR → WR |
| F1 | BF-14 | dBE -3.287 → **-3.05**; dCl 11.39 → **11.186**; retained 3352 → **2496**; dHb -6.162 → **-5.126** | BE −8 to −4; Cl 6–12 | TW → TW |
| F1/F4 | BF-20b | dMapPeak 14.46 → **14.73**; keptFrac 1.09 → **1.02** | peak 3–15; kept ≤ 0.5 | TS → TS |
| F3 | BF-29b | svo2Low 77.8 → **55.8**; svo2Normal 85.6 → **85.7**; lactLow 3.018 → **3.018** | low 30–65; normal 70–85 | TS → TS |
| F4 | BF-20a | dEvlwiSepsis 0 → **0.716**; dEvlwiHealthy 3.343 → **1.6**; dPao2Sepsis 10 → **11** | EVLWI sepsis > 0; PaO₂ ↓ | WR → WR |
| F5 | BF-05a | iCaNadir 0.3 → **0.72**; citratePeak 10.721 → **4.885** | iCa 0.6–0.95 | TS → PL |
| F5 | BF-05d | beNadir -5.6 → **-10.897**; lactPeak 21.062 → **7.345**; phNadir 6.911 → **7.179**; arrest true → **false** | BE ≤ −10; lactate 4–12 | TS → PL |
| F5 | BF-05b | dkPeak 0.69 → **1.34** | K +0.3–2.0 | PL → PL |
| F6 | BF-08d | dKFuro3h -0.002 → **-0.042**; dKBicarb60 -0.169 → **-0.209**; dUopFuro 159 → **156** | furosemide < −0.1 (dirOnly); bicarb −0.4–0 | TW → TW |
| F6 | BF-08b | dK30 -0.739 → **-0.748**; dK60 -1.014 → **-1.034** | K −0.6 to −1.0 at 60 | TS → TS |
| F7 | BF-16b | paco2Copd 39.664 → **44.148**; hco3Copd 24.348 → **26.025**; hco3Per10 1.32 → **3.42** | PaCO₂ +5–15; +3–4.5 per 10 | TW → PL |
| F8 | BF-22a | cop 8.655 → **13.107**; oedemaThreshold 6.7 → **11.1** | COP 11–17 | TS → PL |
| F8 | BF-22b | dAg -0.164 → **-4.862**; dBE 0.197 → **5.667**; dHco3 0.166 → **4.864** | AG −6.5 to −3.5 | TW → PL |
| F8 | BF-03a | effEnd 0.99 → **0.92**; eff60 0.93 → **0.75** | 0.8–1 / 0.7–1 | PL → PL |
| F9 | BF-15b | dPaco2 -0.107 → **6.288**; ph 7.553 → **7.497**; paco2 38.868 → **45.267** | PaCO₂ +5 to +9 | WR → PL |
| F10 | BF-09b | t25LowK 35.7 → **46.5**; t25Normal 35.7 → **35.7**; dMin 0 → **10.8** | longer at K 2.5 (dirOnly) | WR → PL |
| F11 | BF-11b | dIcpMax 0.07 → **0.33**; osm2h 275.283 → **277.839** | ICP ↑ > 1 (dirOnly) | TW → TW |
| reg. | BF-12 | dNa45 6.917 → **7.08** | Na +4–7 | PL → TS |
| reg. | BF-21a | pawpPeakHF 29 → **27** | PAWP 25–40 | PL → PL |
| reg. | BF-21b | evlwiExtraHF 5.633 → **3.42** | EVLWI +3–15 | PL → PL |
| reg. | BF-18b | coPct 2.3 → **-1.4** | R11 (FU-6) | TW → WR |
| reg. | BF-19 | coPct 6.6 → **-3.1**; do2Pct -21.9 → **-27.1** | R11 (FU-6) | TS → WR |

Automatic verdicts over the 74 cells — main: {'PL': 26, 'TW': 11, 'TS': 10, 'WR': 7, 'MI': 1, 'IN': 0, 'NE': 19}; prototype: {'PL': 34, 'TW': 9, 'TS': 6, 'WR': 5, 'MI': 1, 'IN': 0, 'NE': 19}

Notes on the cells that move without being a target:
- **BF-12** (7.5 % saline 250 mL): Na +6.92 → +7.08 against research/12's 4–7 — F1 lets the kidney excrete part of the
  load, and 7d's urine carries Na 100 mmol/L [ENG], so the excreted water concentrates the remaining Na. Not tuned (R44):
  Open question 10 (the urine composition of an expansion diuresis).
- **BF-18a/b, BF-19** (audit 09 R11 — FU-6 Task 14 owns anaemia → CO): the isovolaemic exchange with 5 % albumin now loses
  150 mL of blood volume instead of gaining 233 (D5: 5 % albumin is slightly hypo-oncotic on the Landis TP curve once
  globulins are their own mass), so CO −1.4 % / −3.1 % instead of +2.3 / +6.6 %. FU-6's own R11 test uses a profile Hb, not
  an exchange, and is unaffected; the cells were already off-band (TW/WR) waiting on FU-6. Open question 4.
- **BF-20a healthy arm, BF-21a/b/c** (lung water under a load): the healthy and HFrEF patients now excrete part of the
  load (F1): extra EVLWI healthy +3.34 → +1.60, HFrEF +5.63 → +3.42 (band 3–15, PL), PAWP peak HF 29 → 27 (band 25–40, PL),
  SpO₂ minimum HF 94 → 96 (BF-21c was already TW: R-FU9-3).
- **BF-01a/b, BF-14** (saline chemistry): Cl +5.2 (PL) and +11.2 (PL); BE −0.62 and −3.05 remain TW (Open question 10;
  the annex D3 `it.fails` in 7c's own tests stays).
- **BF-03a** (5 % albumin in class II): volume effect 0.92 at the end, 0.75 at 60 min (was 0.99/0.93; still PL — D5).
- **BF-05b** (stored-blood K): +0.69 → +1.34 (PL, band 0.3–2.0): no longer diluted into an arrested circulation.

---

## File map

| File | Owner | Task | What changes |
|---|---|---|---|
| `packages/engine-core/src/l2/renal/{params,model}.ts` | 7d | A1 | `V_EXP_GAIN`, `V_EXP_MAX`, `expansionFactor`, the `fe` line |
| `packages/engine-core/src/l2/blood/oxygen.ts` | 7c | A2 | VO₂ = demand − global deficit; the regional term stays lactate's |
| `packages/engine-core/src/l2/blood/solutes.ts` | 7c | A3, A6 | `CITRATE_CHARGE` in `sidOf`; `set.kIcf` |
| `packages/engine-core/src/l2/blood/core.ts` | 7c | A3, A5, A6, B2 | citrate/acetate clearance on CO/CO₀; profile-albumin calibration; total-body `kSet`; `CHRONIC_HCO3_PER_MMHG` and the chronic HCO₃ |
| `packages/engine-core/src/l2/blood/fluids.ts` | 7c | A4, A5 | `leakSigma`; globulins (`globG`, `GLOBULIN_GL`, `copPlasma`) |
| `packages/engine-core/src/l2/blood/params.ts` | 7c | A5 | `Composition.globGL` (plasma products 24 g/L) |
| `packages/engine-core/src/l2/blood/pipeline.ts` | 7c | B2 | `createBloodState` passes the patient's resting PaCO₂ |
| `packages/engine-core/src/l2/endo/adapters.ts` | 7e | A4 | `writeBlood` writes σ with kfMult (import, type, comment) |
| `packages/engine-core/src/l2/organs/{inputs,pipeline}.ts` | 7d | A6, A8 | the renal seam's K; the organ view's `osm` → `brainIn` |
| `packages/engine-core/src/l2/brain/{params,model}.ts` | 7d | A8 | `OSM_WATER_ML_PER_MOSM`; `osm0`/`osmWater` in the fixed intracranial volume |
| `packages/engine-core/src/l2/neuro/spont.ts` | 7f | A7 | `paco2SetPoint` (+ constants), the header line, the one call line |
| `packages/engine-core/src/l2/neuro/{interactions,pipeline}.ts` | 7f | B1 | `hypokalaemiaMult`; `NeuroEnv.kMmolL`; the `neo` line |
| `packages/engine-core/src/engine.ts` | engine (**E-FU9-2**) | B1 | `kMmolL` on the `stepNeuroTo` context's first line |
| `packages/engine-core/src/l2/gas/params.ts` | Stage 3 profile (**E-FU9-3**) | B2 | `COPD_PACO2_REST`, `restingPaco2`, the `paco2Rest:` line |
| `packages/engine-core/test/l2/blood/core.test.ts` | 7c (**E-FU9-1**) | A3 | the massive-transfusion `it` split; the iCa rule becomes `it.fails` (1.090 vs 1.033) |
| `packages/engine-core/vite.config.ts` | CI | A1 | `test/engine/fu9-*.test.ts` in SLOW and (one `push` line) SLOW_A |
| Tests (new, fast) | — | A1–A8, B1, B2 | `test/l2/renal/fu9-expansion`, `test/l2/blood/fu9-{oxygen,citrate,leak,albumin,potassium,chronic}`, `test/l2/neuro/fu9-{alkalosis,hypokalaemia}`, `test/l2/brain/fu9-osmolality` (`.test.ts`) |
| Tests (new, SLOW_A) | — | A1–A8, B1, B2 | `test/helpers/fu9.ts`; `test/engine/fu9-{kinetics,oxygen,transfusion,leak,potassium,alkalosis,osmolality,rocuronium,copd}.test.ts` (≈ 11 min wall in total, measured) |
| Gate | — | G | `docs/gates/fu-9.md` |

**Exceptions (declared; for the orchestrator's R50 ruling):**
- **E-FU9-1** (A3): 7c's own unit test `core.test.ts` "massive transfusion … iCa −0.1 per unit-per-5-min" is split: K ≥ 5.5
  stays an `it`; the chelation-rate iCa rule becomes `it.fails` with its measured number (1.090 vs 1.033 ± 0.05) because
  the same citrate now also acidifies (D3). The chelation term itself is pinned by a new test at fixed pH. No band is
  moved.
- **E-FU9-2** (B1): one line of `engine.ts` (the neuro context's `tempC:` line gains `kMmolL`) — the only place 7c's K can
  reach 7f's step; the line FU-7's E-FU7-7 edits is the next one.
- **E-FU9-3** (B2): `l2/gas/params.ts` (Stage 3's patient scaling, FU-6/7k's area while in flight) — the COPD resting
  PaCO₂ is a profile value that `gasPatient().paco2Rest` already owns (FU-4 F4 R1(a)); Part B, after FU-6.

---

## Part A — independent (executes now)

### Task A0: Base check — worktree, branch, the plan, the BF runner and the before-numbers

**Files:** none changed (the plan is committed in Step 2).

- [ ] **Step 1 — the worktree (R25: never the shared checkout).** From `projects/patient-monitor-engine/repo`:

```
git fetch origin
git log --oneline -1 origin/main                     # at least 76c952e (FU-4 e81e53f and FU-5 16cdf79 merged)
git worktree add -b fu-9-blood-fluids ../scratch/wt-fu-9 origin/main
cd ../scratch/wt-fu-9 && npx -y pnpm@9.15.9 install --frozen-lockfile
```

- [ ] **Step 2 — commit the plan** (it is untracked in the shared checkout): copy
  `projects/patient-monitor-engine/repo/docs/plans/fu-9-blood-fluids.md` to the worktree's `docs/plans/`, then

```
git add docs/plans/fu-9-blood-fluids.md && git commit -m "docs(plan): FU-9 blood, fluids and acid–base integration" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push -u origin fu-9-blood-fluids
```

- [ ] **Step 3 — the BF runner and the before-numbers.** The runner lives outside the repo
  (`projects/patient-monitor-engine/research/22-audit-scripts/`):

```
mkdir -p <scratchpad>/fu-9-blood-fluids && cp -R ../../research/22-audit-scripts <scratchpad>/fu-9-blood-fluids/bf
cd <scratchpad>/fu-9-blood-fluids/bf && rm -f out/cells.json
PME_ENGINE=<worktree>/packages/engine-core/src/index.ts BF_OUT=out/before.json \
  node --import ./hooks.mjs --experimental-strip-types cli.ts all > ../bf-before.log     # ≈ 40 min; bounded waits
```

  Expected (main `76c952e`): the "Measured on `76c952e`" column of the inventory — BF-02a retAwake30 0.52, gaMinusAwake
  +0.01; BF-02b 0.00; BF-04 +0.546; BF-05a iCa 0.30, BF-05d BE −5.6 with an arrest; BF-08d −0.002; BF-09b 0.0 min;
  BF-11b +0.07; BF-15b −0.1; BF-16b PaCO₂ 39.7; BF-20a EVLWI 0; BF-22a COP 8.66, BF-22b AG −0.16; BF-29b SvO₂ 77.8.
  A different number means main moved after this plan was written: record it in the gate note, do not tune.
- [ ] **Step 4 — the physiology audit before.** `PME_AUDIT_OUT=<scratchpad>/fu-9-blood-fluids/audit-before npx -y
  pnpm@9.15.9 run audit:physiology > <scratchpad>/fu-9-blood-fluids/audit-before.md` (≈ 6 min). Expected: the arrest table
  of `docs/gates/fu-4/audit-after.md` (B2/B7 830 s, C1 no arrest, C4 645 s, D0 1775 s, D2 1350 s, G2b 65 s, G3 645 s,
  G3b 525 s, K-ptx 670 s).
- [ ] **Step 5 — suites green on the base.** `npx -y pnpm@9.15.9 -r typecheck` and `CI=1 PME_TEST_SET=fast npx -y
  pnpm@9.15.9 --filter @pme/engine-core exec vitest run` → pass (the pk-longrun macOS red of G-FU4 is slow-a, not fast).

### Task A1: F1 — the kidney excretes an expanded circulation (7d `renal/model.ts`; Part A)

**Files:**
- Modify: `packages/engine-core/src/l2/renal/params.ts` (`V_EXP_GAIN`, `V_EXP_MAX`), `packages/engine-core/src/l2/renal/model.ts`
  (`expansionFactor`, the `fe` line of `tubularOutput`)
- Modify: `packages/engine-core/vite.config.ts` (the `fu9-*` SLOW entry and its SLOW_A line — once, for every FU-9 engine file)
- Create: `packages/engine-core/test/helpers/fu9.ts` (the BF runner's rigs for engine tests), `test/l2/renal/fu9-expansion.test.ts`,
  `test/engine/fu9-kinetics.test.ts` (SLOW_A)
- Overlap: none of FU-6/FU-7/FU-8/7k/V.1 edits `l2/renal/**` (FU-8 I-34 edits the oliguria flag in `renal/model.ts`'s
  `stepRenal` KDIGO lines — a different hunk; checked against its current draft). The vite.config anchors are the
  `clinical-suite` SLOW line and the SLOW_B comment, which no other plan edits (7k and FU-8 anchor on the
  `af-pulse-deficit` line and the `SLOW_A` literal).

**Why / measured (main `76c952e`):** research/22 F1. Ringer's 1 L over 30 min: 52 % (awake) and 53 % (GA) of the litre
still intravascular 30 min after the end, class III − GA 0.00, urine +14/+16 mL/h; 1 u RBC Hb +0.546 at 1 h; 5 L saline
leaves 3352 mL in the circulation. Cause: 7d's `volumeFactor` is 1 for any `bvRel ≥ 1` and nothing else in 7d reads an
expansion, while 7d's seam REPLACES 7c's fitted volume-receptor elimination (and its GA × 0.2). Decision D1.

**Prototype numbers (BF runner, seed 7):** see "Prototype results" (BF-02a 0.52 → 0.22 PL; GA − awake +0.14;
class III − GA +0.15; BF-04 +0.66 still TW → `it.fails`). Engine test: retention awake 0.22, GA 0.36, class III 0.51;
1 u RBC +0.66 g/dL at 1 h. Unit: +5 % BV → 5.50 mL/kg/h awake, 3.30 under GA; a normovolaemic kidney 1.00 (unchanged).
**FU-4 check:** `audit:physiology` rows bit-identical with A1 alone (bisected, D13); `clinical-suite`,
`circ-lowflow-arrest`, `organs-renal`, `organs-soak` (6 h: hourly UOP ±2 %) pass.

- [ ] **Step 1 — the tests (they fail: no `expansionFactor`).**

Create `packages/engine-core/test/helpers/fu9.ts`:

```ts
// FU-9 test helpers: the coverage-run-BF rigs (research/22 §1) through the real engine, read-only on the committed state.
import { createEngine } from '../../src/engine.ts';
import type { MonitorEngine, PatientProfile } from '../../src/types.ts';
import { cmd, evB, MAN, st } from './blood.ts';

export type Step = [number, Record<string, unknown>];
/** BF "GA vent": ETT + VCV 12 × 600 mL, PEEP 5, FiO2 0.5 and the Stage 3 GA flag at t = 1 s (MODELED). */
export const GA_VENT: Step[] = [
  [1, { type: 'applyEvent', event: { kind: 'airwayDevice', device: 'ett' } }],
  [1, { type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 } }],
  [1, { type: 'applyEvent', event: { kind: 'thermal', anaesthesia: 'general' } }],
];
export const ev = (event: Record<string, unknown>): Record<string, unknown> => ({ type: 'applyEvent', event });

/** Run a timeline to each sample time; `read` is called at every time in `at` (seconds), yielding once per sim-minute. */
export async function arm<T>(steps: Step[], at: number[], read: (e: MonitorEngine) => T, patient: PatientProfile = MAN): Promise<T[]> {
  const e = createEngine({ seed: 7, mode: 'modeled', patient });
  const todo = [...steps].sort((a, b) => a[0] - b[0]);
  const out: T[] = [];
  for (const tS of [...at].sort((a, b) => a - b)) {
    for (let t = Math.floor(e.now().simT / 60) * 60 + 60; t <= tS; t += 60) {
      while (todo.length && (todo[0] as Step)[0] <= t) {
        const [ts, body] = todo.shift() as Step;
        e.advanceTo(Math.max(e.now().simT, ts));
        const r = e.dispatch(cmd(body));
        if (!r.accepted) throw new Error(`rejected ${JSON.stringify(body)}: ${r.reason}`);
      }
      e.advanceTo(t);
      await new Promise((r) => setImmediate(r));
    }
    while (todo.length && (todo[0] as Step)[0] <= tS) {
      const [ts, body] = todo.shift() as Step;
      e.advanceTo(Math.max(e.now().simT, ts));
      const r = e.dispatch(cmd(body));
      if (!r.accepted) throw new Error(`rejected ${JSON.stringify(body)}: ${r.reason}`);
    }
    e.advanceTo(tS);
    out.push(read(e));
  }
  return out;
}
/** 7c's blood volume (plasma + red cells), mL. */
export const bvMl = (e: MonitorEngine): number => st(e).blood.core.fl.vp + st(e).blood.core.fl.hbG * 3;
export { evB, MAN, st };
```

Create `packages/engine-core/test/l2/renal/fu9-expansion.test.ts`:

```ts
// FU-9 Task A1 (F1): the kidney excretes an EXPANDED circulation (ANP / ADH suppression), through the same chain that
// already carries general anaesthesia (S_GA) and depletion (vNh), so GA and a bled patient retain more.
import { describe, expect, it } from 'vitest';
import { createRenal, expansionFactor, stepRenal, type RenalInputs, type RenalState } from '../../../src/l2/renal/model.ts';
import { V_EXP_MAX } from '../../../src/l2/renal/params.ts';

const W = 70;
const BASE: RenalInputs = { map: 93, cvp: 5, iap: 0, coLpm: 5.6, bvRel: 1, albuminGL: 42, anaesthesia: 'none', pawExcessCmH2O: 0, alphaExcess: 0, sepsis: 0 };
const mlKgH = (s: RenalState) => (s.uopMlMin * 60) / W;
const hold = (inp: RenalInputs, secs: number): RenalState => {
  const s = createRenal({ ...inp, bvRel: 1 }, W);
  for (let i = 0; i < secs; i++) stepRenal(s, inp, 1);
  return s;
};

describe('FU-9 F1: renal excretion of an expanded circulation (Hahn 2010; Norberg 2007; Drobin & Hahn 1999)', () => {
  it('expansionFactor: 1 at and below normovolaemia, 1 + 90 per unit excess, capped', () => {
    expect(expansionFactor(1)).toBe(1);
    expect(expansionFactor(0.8)).toBe(1);
    expect(expansionFactor(1.05)).toBeCloseTo(5.5, 9);
    expect(expansionFactor(1.5)).toBe(V_EXP_MAX);
  });
  it('+5 % blood volume awake: UOP ≈ 5× basal within 10 min; general anaesthesia keeps the S_GA share; a normovolaemic kidney is unchanged', () => {
    const up = { ...BASE, bvRel: 1.05 };
    const awake = mlKgH(hold(up, 600));
    const ga = mlKgH(hold({ ...up, anaesthesia: 'general' }, 600));
    console.log(`FU-9 F1 renal: +5 % BV → ${awake.toFixed(2)} mL/kg/h awake, ${ga.toFixed(2)} under GA`);
    expect(awake).toBeGreaterThan(4.5);
    expect(awake).toBeLessThan(6.5);
    expect(ga / awake).toBeCloseTo(0.6, 2); // S_GA
    expect(mlKgH(hold(BASE, 600))).toBeCloseTo(1.0, 2);
  });
});
```

Create `packages/engine-core/test/engine/fu9-kinetics.test.ts`:

```ts
// FU-9 Task A1 (F1): the kidney excretes an expanded circulation, context-sensitively (research/22 BF-02a/b, BF-04).
// Rigs = the BF runner's: MODELED 40 y 70 kg man; "GA" = ETT + VCV 12 × 600, PEEP 5, FiO2 0.5 + the GA flag; Ringer's
// lactate 1 L over 30 min from 300 s; retention = Δ blood volume against the same timeline without the fluid, ÷ 1000 mL,
// 30 min after the end (3900 s). Class III: 1500 mL over 10 min from 60 s, the fluid at 960 s.
import { describe, expect, it } from 'vitest';
import { arm, bvMl, ev, GA_VENT, st, type Step } from '../helpers/fu9.ts';

const RL: Step = [300, ev({ kind: 'fluid', fluid: 'rl', volumeMl: 1000, overS: 1800 })];
const retention = async (base: Step[], fluid: Step, tRead: number): Promise<number> => {
  const [i] = await arm([...base, fluid], [tRead], bvMl);
  const [c] = await arm(base, [tRead], bvMl);
  return ((i as number) - (c as number)) / 1000;
};

describe('FU-9 F1: crystalloid kinetics are context-sensitive (Hahn 2010; Norberg 2007; Drobin & Hahn 1999)', { timeout: 900_000 }, () => {
  it('RL 1 L / 30 min, awake: 20–30 % intravascular 30 min after the end (was 0.52); GA retains ≥ 0.05 more (was +0.01)', async () => {
    const awake = await retention([], RL, 3900);
    const ga = await retention(GA_VENT, RL, 3900);
    console.log(`FU-9 F1 retention 30 min after the end: awake ${awake.toFixed(2)}, GA ${ga.toFixed(2)}`);
    expect(awake).toBeGreaterThanOrEqual(0.2);
    expect(awake).toBeLessThanOrEqual(0.3);
    expect(ga - awake).toBeGreaterThanOrEqual(0.05);
  });
  it('after class III (1500 mL), the same litre is retained ≥ 0.05 more than in normovolaemic GA (was 0.00)', async () => {
    const bleed: Step = [60, ev({ kind: 'bleed', volumeMl: 1500, overS: 600 })];
    const hypo = await retention([...GA_VENT, bleed], [960, RL[1]], 960 + 3600);
    const ga = await retention(GA_VENT, RL, 3900);
    console.log(`FU-9 F1 class III ${hypo.toFixed(2)} vs GA ${ga.toFixed(2)}`);
    expect(hypo - ga).toBeGreaterThanOrEqual(0.05);
  });
  // R45: Wiesen 1994 / AABB: +1 g/dL per unit (band 0.7–1.3). Under GA the kidney keeps most of the unit's plasma for
  // the first hour (S_GA, the ventilated CO below the renal reference): measured +0.66 at 1 h, +0.74 at 4 h (was +0.55).
  it.fails('1 u RBC over 30 min under GA: Hb +0.7–1.3 g/dL at 1 h after the end — measured +0.66 (FU-9 F1; was +0.55)', async () => {
    const at = [300 + 1800 + 3600];
    const hb = (e: Parameters<typeof bvMl>[0]) => st(e).blood.out.hb;
    const [i] = await arm([...GA_VENT, [300, ev({ kind: 'transfusion', product: 'rbc', units: 1, overS: 1800, warmed: true })]], at, hb);
    const [c] = await arm(GA_VENT, at, hb);
    const d = (i as number) - (c as number);
    console.log(`FU-9 F1 1 u RBC: Hb +${d.toFixed(2)} at 1 h`);
    expect(d).toBeGreaterThanOrEqual(0.7);
  });
});
```

In `packages/engine-core/vite.config.ts`, find:

```ts
  'test/engine/clinical-suite.test.ts', // FU-4 Task 22: the clinical scenario suite (SLOW_A)
```

replace with:

```ts
  'test/engine/clinical-suite.test.ts', // FU-4 Task 22: the clinical scenario suite (SLOW_A)
  'test/engine/fu9-*.test.ts', // FU-9: blood/fluid/acid–base scenarios, 10–90 sim-min arms (SLOW_A, below)
```

find:

```ts
// FU-4 (R50 review F8): SLOW_B is SLOW minus SLOW_A, and the difference cannot be taken by STRING comparison — the
```

replace with:

```ts
SLOW_A.push('test/engine/fu9-*.test.ts'); // FU-9: slow-b ran 37.6 of its 40 min at the FU-4 gate (a separate line: other plans append to the literal)
// FU-4 (R50 review F8): SLOW_B is SLOW minus SLOW_A, and the difference cannot be taken by STRING comparison — the
```


- [ ] **Step 2 — run them; they fail.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/renal/fu9-expansion.test.ts test/engine/fu9-kinetics.test.ts`
  → the unit file fails to import `expansionFactor`; the engine file reads awake 0.52 / GA 0.53 (first `it` FAILS), class
  III − GA 0.00 (FAILS), the RBC `it.fails` passes (+0.55).

- [ ] **Step 3 — implement.**

In `packages/engine-core/src/l2/renal/params.ts`, find:

```ts
export const V_AT_30 = 0.2; // at −30 %
```

replace with:

```ts
export const V_AT_30 = 0.2; // at −30 %
/** FU-9 F1: excreted-fraction gain per unit blood-volume EXPANSION (ANP/ADH suppression) [ENG]: fitted so 1 L of
 *  Ringer's over 30 min, awake, is 20–30 % intravascular 30 min after the end (Hahn 2010; 7c's own fallback t½ 30 min,
 *  tables `t12El`); capped at V_EXP_MAX × (≈ 15 mL/min peak diuresis, Hahn's volunteers). */
export const V_EXP_GAIN = 90;
export const V_EXP_MAX = 12;
```

In `packages/engine-core/src/l2/renal/model.ts`, find:

```ts
  SEPSIS_GFR_LOSS, TGF_TAU_S, UOP0_ML_KG_H, V_AT_15, V_AT_30,
} from './params.ts';
```

replace with:

```ts
  SEPSIS_GFR_LOSS, TGF_TAU_S, UOP0_ML_KG_H, V_AT_15, V_AT_30, V_EXP_GAIN, V_EXP_MAX,
} from './params.ts';
```

find:

```ts
/** Effective arterial blood volume (0–1+) [ENG]: the smaller of the blood volume and (CO/CO0)^0.75 — a low-output state
```

replace with:

```ts
/**
 * FU-9 F1: the expanded circulation is excreted. Atrial stretch (ANP) and ADH suppression raise the excreted fraction
 * with the blood volume ABOVE the profile's (tables §5.2's V covers only depletion): × (1 + V_EXP_GAIN·(bvRel − 1)⁺),
 * capped at V_EXP_MAX. It multiplies the same chain as V, so general anaesthesia (S_GA, lower CO → vNh) and a
 * depleted patient (vNh < 1) retain more — Hahn's context-sensitive volume kinetics (Hahn 2010 Anesthesiology
 * 113:470; Norberg 2007 Anesthesiology 107:24; Drobin & Hahn 1999 Anesthesiology 90:81). 1 at and below normovolaemia.
 */
export function expansionFactor(bvRel: number): number {
  return Math.min(V_EXP_MAX, 1 + V_EXP_GAIN * Math.max(0, bvRel - 1));
}

/** Effective arterial blood volume (0–1+) [ENG]: the smaller of the blood volume and (CO/CO0)^0.75 — a low-output state
```

find:

```ts
  const fe = s.p.ef0 * natriuresis(inp.map, s.p.pRef) * stress * s.vNh * peep * ne * (1 + FUROSEMIDE_EMAX * s.furoE);
```

replace with:

```ts
  const fe = s.p.ef0 * natriuresis(inp.map, s.p.pRef) * stress * s.vNh * expansionFactor(inp.bvRel) * peep * ne * (1 + FUROSEMIDE_EMAX * s.furoE);
```


- [ ] **Step 4 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/renal test/l2/organs test/l2/blood test/engine/fu9-kinetics.test.ts` → all pass
  (renal 16 incl. the 2 new, organs 16, blood 67; kinetics 2 `it` + 1 `it.fails`, ≈ 3–6 min wall). Then
  `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/organs-renal.test.ts test/engine/organs-soak.test.ts test/engine/organs-curves.test.ts` → pass.
- [ ] **Step 5 — BF runner:** `… cli.ts BF-02a BF-02b BF-04 BF-01a BF-01b BF-14 BF-20b BF-21` (A0 Step 3's command with
  `BF_OUT=out/a1.json`) → BF-02a retAwake30 0.22 (PL), gaMinusAwake +0.14 (PL); BF-02b hypoMinusGA +0.15 (PL); BF-04 dHb1h
  0.66 (TW); BF-21a/b still PL (PAWP peak HF 26, EVLWI +3.4 — the awake HFrEF patient now excretes part of the load).
- [ ] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "feat(7d): the kidney excretes an expanded circulation — ANP/ADH expansion factor (FU-9 F1)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

### Task A2: F3 — low flow raises O₂ extraction before VO₂ becomes supply-dependent (7c `oxygen.ts`; Part A)

**Files:**
- Modify: `packages/engine-core/src/l2/blood/oxygen.ts` (header comment, `O2Out.deficit` comment, the `vo2` line)
- Create: `packages/engine-core/test/l2/blood/fu9-oxygen.test.ts`, `test/engine/fu9-oxygen.test.ts` (SLOW_A)
- Overlap: no other plan edits `oxygen.ts`.

**Why / measured (main):** research/22 F3 / BF-29b. 2 L bleed under GA, CO 1.57: SvO₂ 77.8 % (VBG) while lactate
reaches 3.0 — the regional supply-dependence term, a lactate device, was subtracted from VO₂. Decision D2.

**Prototype numbers:** SvO₂ 77.8 → **55.8 %** (band 30–65), control 85.7 %, DO₂ 317 (< DO₂crit 420), VO₂ 146 of 194,
ER 0.46, lactate 3.02 (unchanged). **FU-4 check:** 7c's SvO₂ is read only by the lab panel and the truth tree —
`audit:physiology` bit-identical with A2 alone.

- [ ] **Step 1 — the tests.**

Create `packages/engine-core/test/l2/blood/fu9-oxygen.test.ts`:

```ts
// FU-9 Task A2 (F3): extraction rises before VO2 becomes supply-dependent; the regional term makes lactate only.
import { describe, expect, it } from 'vitest';
import { o2Delivery } from '../../../src/l2/blood/oxygen.ts';

describe('FU-9 F3: O2 extraction before supply dependence (Cain 1977; Vincent & De Backer 2013)', () => {
  it('CO 60 % of rest, DO2 above DO2crit: VO2 = demand (ER rises), the regional LACTATE deficit is still there', () => {
    const d = o2Delivery(3.15, 5.25, 197, 245, 70); // DO2 621 > 420
    expect(d.vo2).toBe(245);
    expect(d.er).toBeCloseTo(245 / 621, 2);
    expect(d.deficit).toBeGreaterThan(60);
  });
  it('below DO2crit VO2 falls in proportion (demand·DO2/DO2crit), so ER stays at demand/DO2crit', () => {
    const d = o2Delivery(1.5, 5.25, 197, 245, 70); // DO2 296 < 420
    expect(d.vo2).toBeCloseTo((245 * 296) / 420, 0);
    expect(d.er).toBeCloseTo(245 / 420, 2);
    expect(o2Delivery(0, 5.25, 197, 245, 70).vo2).toBe(0);
  });
});
```

Create `packages/engine-core/test/engine/fu9-oxygen.test.ts`:

```ts
// FU-9 Task A2 (F3): low flow raises O2 extraction before VO2 becomes supply-dependent (research/22 BF-29b). Rig = the
// BF runner's GA vent (MODELED, 70 kg man); a 2 L bleed over 10 min from 60 s; read at 1200 s against no bleed.
import { describe, expect, it } from 'vitest';
import { arm, ev, GA_VENT, st } from '../helpers/fu9.ts';

describe('FU-9 F3: SvO2 falls with cardiac output in haemorrhage (Rivers 2001; Vincent & De Backer 2013)', { timeout: 300_000 }, () => {
  it('2 L bleed: 7c SvO2 < 65 % while lactate rises (was 77.8 % — the regional term cut VO2 instead); extraction ≥ 0.4', async () => {
    const read = (e: Parameters<typeof st>[0]) => ({ ...st(e).blood.core.o2, lact: st(e).blood.out.lactate });
    const [lo] = await arm([...GA_VENT, [60, ev({ kind: 'bleed', volumeMl: 2000, overS: 600 })]], [1200], read);
    const [n] = await arm(GA_VENT, [1200], read);
    if (!lo || !n) throw new Error('no sample');
    console.log(`FU-9 F3: SvO2 ${(100 * lo.svo2).toFixed(1)} % (control ${(100 * n.svo2).toFixed(1)}), DO2 ${lo.do2.toFixed(0)}, VO2 ${lo.vo2.toFixed(0)}/${lo.demand.toFixed(0)}, ER ${lo.er.toFixed(2)}, lactate ${lo.lact.toFixed(2)} (control ${n.lact.toFixed(2)})`);
    expect(lo.svo2).toBeLessThan(0.65);
    expect(n.svo2).toBeGreaterThan(0.65);
    expect(lo.lact).toBeGreaterThan(n.lact + 1);
    expect(lo.er).toBeGreaterThanOrEqual(0.4); // below DO2crit VO2 is supply-dependent at ER = demand/DO2crit
  });
});
```


- [ ] **Step 2 — run; they fail.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/fu9-oxygen.test.ts test/engine/fu9-oxygen.test.ts` → the unit test
  reads VO₂ 120 (not 245: the regional term removed 125 mL/min) at CO 60 %; the engine test reads SvO₂ 77.8 %.
- [ ] **Step 3 — implement.**

In `packages/engine-core/src/l2/blood/oxygen.ts`, find:

```ts
//   VO2 = demand − deficit;  deficit = max(global, regional)
```

replace with:

```ts
//   VO2 = demand − global: extraction rises first, VO2 becomes supply-dependent only below DO2crit
//     (FU-9 F3: Cain 1977 J Appl Physiol 42:228; Shibutani 1983 Crit Care Med 11:640; Vincent & De Backer 2013 NEJM
//     369:1726 — SvO2 falls with CO in haemorrhage before VO2 does)
//   lactate deficit = max(global, regional)
```

find:

```ts
//       (flow relative to what the current metabolism needs: under GA flow and VO2 fall together without redistribution)
```

replace with:

```ts
//       (flow relative to what the current metabolism needs: under GA flow and VO2 fall together without redistribution)
//       — the regional term is heterogeneous splanchnic dysoxia: it makes lactate but does not lower the whole-body VO2
//       (the other beds extract more), so it is not subtracted from VO2 (FU-9 F3)
```

find:

```ts
  deficit: number;
```

replace with:

```ts
  deficit: number; // the LACTATE deficit (mL O2/min): max(global, regional) — FU-9 F3: VO2 is demand − global only
```

find:

```ts
  const vo2 = demand - deficit;
```

replace with:

```ts
  const vo2 = demand - Math.min(demand, global); // FU-9 F3: extraction rises first; VO2 is supply-dependent only below DO2crit
```


- [ ] **Step 4 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood test/engine/fu9-oxygen.test.ts test/engine/blood-oxygen.test.ts
  test/engine/blood-sanity-haem.test.ts` → pass (17a class III lactate 3–5 at 30 min unchanged: the lactate deficit is the
  same function).
- [ ] **Step 5 — BF runner:** `BF-29a BF-29b BF-18b BF-19` → BF-29b svo2Low 55.8 (PL; svo2Normal 85.7 stays TS 0.7 above
  its 70–85 band — Open question 1), BF-29a gap unchanged.
- [ ] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "fix(7c): VO2 is supply-dependent only below DO2crit; the regional term makes lactate (FU-9 F3)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

### Task A3: F5 — citrate is an anion until it is metabolised; its clearance follows whole-body flow (7c; Part A, E-FU9-1)

**Files:**
- Modify: `packages/engine-core/src/l2/blood/solutes.ts` (`CITRATE_CHARGE`, `sidOf`), `packages/engine-core/src/l2/blood/core.ts`
  (the `stepSolutes` call: `flowRel`)
- Modify: `packages/engine-core/test/l2/blood/core.test.ts` (**E-FU9-1**: the massive-transfusion `it` split — K ≥ 5.5 stays
  `it`; the chelation-rate iCa rule becomes `it.fails` with 1.090 vs 1.033)
- Create: `packages/engine-core/test/l2/blood/fu9-citrate.test.ts`, `test/engine/fu9-transfusion.test.ts` (SLOW_A)
- Overlap: FU-6 (E-FU6-4) inserts `cohbWashout` before `createBloodCore` and a line after `bc.odc.hb = hbOf(fl);`; FU-7
  (E-FU7-4) edits the `createSolutes` line and the sux call — none is on this task's lines (checked: the `stepSolutes`
  line and `sidOf` appear in no other plan).

**Why / measured (main):** research/22 F5 / BF-05a, 05d. Class IV + 4 L ongoing loss + 10 RBC + 10 FFP over 40 min, no
calcium: iCa falls to the solver's floor 0.30 (citrate 10.7 mmol/L: clearance × (CO/CO₀)² → ≈ 0 in shock), which takes
contractility to (0.3/1.1)^1.5 = 0.14 and the patient ARRESTS at 2430 s (FU-4's low-flow pathway); BE −5.6 at lactate
21 — each FFP's Na 165 / Cl 75 alkalinised at once because citrate was not in the SID. Decision D3.

**Prototype numbers:** iCa nadir 0.30 → **0.72** (band 0.6–0.95), citrate peak 4.9; BE nadir −5.6 → **−10.9** (band ≤ −10),
lactate peak 7.5, **no arrest**; unit: 4 FFP in 10 min → BE −2.41 at 10 min, +1.28 at 60 min (early acidosis, late
alkalosis). BF-05b K peak +1.31 (PL). **FU-4 check:** the arrest this task removes is BF-05d's (a citrate artefact); the
`audit:physiology` MTP row G3 (2.5 L bleed + 10 RBC, PEA at 645 s — it arrests before the units act) is unchanged, and
`blood-sanity-haem` (17a, massive transfusion K ≥ 5.5 and iCa ≤ 1.12) passes.

- [ ] **Step 1 — the tests.**

Create `packages/engine-core/test/l2/blood/fu9-citrate.test.ts`:

```ts
// FU-9 Task A3 (F5): citrate is a strong trivalent anion until it is metabolised (Stewart/Fencl; Driscoll 1987).
import { describe, expect, it } from 'vitest';
import { createBloodCore, stepBloodCore } from '../../../src/l2/blood/core.ts';
import { PRODUCTS } from '../../../src/l2/blood/params.ts';
import { CITRATE_CHARGE, concOf, createSolutes, ionisedCa, K_CIT, sidOf } from '../../../src/l2/blood/solutes.ts';

const ECF = 14000;
const MAN = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175 };

describe('FU-9 F5: citrate in the strong-ion difference', () => {
  it('1 mmol/L of free citrate lowers the apparent SID by 3 mEq/L', () => {
    const s = createSolutes({ na: 140, k: 4.2, cl: 104, iCa: 1.2, mg: 0.85, lactate: 1 }, ECF, 42, 28000);
    const c0 = concOf(s, ECF, 42, ECF);
    s.citrate = 14; // 1 mmol/L
    const c1 = concOf(s, ECF, 42, ECF);
    expect(CITRATE_CHARGE).toBe(3);
    expect(sidOf(c0, 1.2) - sidOf(c1, 1.2)).toBeCloseTo(3, 9);
  });
  it('4 FFP in 10 min at normal flow: BE FALLS while the citrate is present, then rises above the start as it is metabolised (early acidosis, late alkalosis)', () => {
    const bc = createBloodCore(MAN, 5.25, 40);
    const u = PRODUCTS.ffp;
    bc.fl.flows.push({ rate: (4 * u.ml) / 10, until: 1e9, leftMl: 4 * u.ml, comp: u.comp });
    const be: number[] = [];
    for (let k = 0; k < 36000; k++) {
      stepBloodCore(bc, { t: k / 10, coLpm: 5.25, paco2: 40, pao2: 95, tempC: 37, vo2Demand: 245 }, 0.1);
      if (k === 6000 || k === 35999) be.push(bc.ab.be);
    }
    console.log(`FU-9 F5: 4 FFP → BE ${be[0]?.toFixed(2)} at 10 min, ${be[1]?.toFixed(2)} at 60 min`);
    expect(be[0]).toBeLessThan(0);
    expect(be[1]).toBeGreaterThan(1);
  });
  it('the chelation term is unchanged: iCa −K_CIT per mmol/L citrate at a fixed pH', () => {
    const s = createSolutes({ na: 140, k: 4.2, cl: 104, iCa: 1.2, mg: 0.85, lactate: 1 }, ECF, 42, 28000);
    const a = ionisedCa(concOf(s, ECF, 42, ECF), 7.4);
    s.citrate = 14;
    expect(a - ionisedCa(concOf(s, ECF, 42, ECF), 7.4)).toBeCloseTo(K_CIT, 9);
  });
});
```

Create `packages/engine-core/test/engine/fu9-transfusion.test.ts`:

```ts
// FU-9 Task A3 (F5): citrate is an anion until it is metabolised and its clearance follows whole-body flow (research/22
// BF-05a, BF-05d). Rig = the BF runner's: GA vent; class IV (2100 mL over 10 min from 60 s), then a further 4 L lost over
// 40 min from 660 s while 10 u RBC (35 d, unwarmed) + 10 u FFP (warmed) run over the same 40 min, no calcium.
import { describe, expect, it } from 'vitest';
import { arm, ev, GA_VENT, st } from '../helpers/fu9.ts';

describe('FU-9 F5: massive transfusion — the citrate load (Driscoll 1987; Giancarelli 2016; ATLS 10e)', { timeout: 600_000 }, () => {
  it('iCa nadir 0.6–0.95 (was 0.30, the floor); BE ≤ −10 with lactate ≥ 4 (was BE −5.6); no arrest (was asystole at 2430 s)', async () => {
    const t0 = 660;
    const at = Array.from({ length: (t0 + 3000) / 30 }, (_, k) => 30 * (k + 1));
    const rows = await arm([...GA_VENT,
      [60, ev({ kind: 'bleed', volumeMl: 2100, overS: 600 })],
      [t0, ev({ kind: 'bleed', volumeMl: 4000, overS: 2400 })],
      [t0, ev({ kind: 'transfusion', product: 'rbc', units: 10, overS: 2400, storageDays: 35, warmed: false })],
      [t0, ev({ kind: 'transfusion', product: 'ffp', units: 10, overS: 2400, warmed: true })],
    ], at, (e) => ({ iCa: st(e).blood.out.iCa, be: st(e).blood.core.ab.be, lact: st(e).blood.out.lactate, pulseless: st(e).hemo.circ.arrest !== null }));
    const iCa = Math.min(...rows.slice(t0 / 30).map((r) => r.iCa));
    const be = Math.min(...rows.map((r) => r.be));
    const lact = Math.max(...rows.map((r) => r.lact));
    console.log(`FU-9 F5: iCa nadir ${iCa.toFixed(2)}, BE nadir ${be.toFixed(1)}, lactate peak ${lact.toFixed(1)}, arrest ${rows.some((r) => r.pulseless)}`);
    expect(iCa).toBeGreaterThanOrEqual(0.6);
    expect(iCa).toBeLessThanOrEqual(0.95);
    expect(be).toBeLessThanOrEqual(-10);
    expect(lact).toBeGreaterThanOrEqual(4);
    expect(rows.some((r) => r.pulseless)).toBe(false);
  });
});
```

In `packages/engine-core/test/l2/blood/core.test.ts`, find:

```ts
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
```

replace with:

```ts
  const massive = () => {
    const bc = createBloodCore(MAN, CO0, 40);
    const u = PRODUCTS.rbc;
    bc.fl.flows.push({ rate: (10 * u.ml) / 30, until: 1800, comp: { ...u.comp, k: storedK(35) } }, { rate: (10 * u.ml) / 30, until: 1800, comp: null });
    run(bc, 0, 1800);
    return bc;
  };
  const rule = 1.2 - 0.1 * (10 / 30) * 5; // 1.67 units per 5 min → −0.17 (the rule read as a steady-state RATE effect [ENG])
  it('massive transfusion, 10 units of 35-day blood in 30 min against a matched bleed: K ≥ 5.5 (tables kUnit)', () => {
    const bc = massive();
    console.log(`core massive: K ${bc.out.k.toFixed(2)} iCa ${bc.out.iCa.toFixed(3)} (rule ${rule.toFixed(3)})`);
    expect(bc.out.k).toBeGreaterThanOrEqual(5.5);
  });
  // R45 (FU-9 F5, E-FU9-1): the citrate rule (tables citrateUnit, Q46) is a CHELATION rate; since citrate is an anion in
  // the SID the same load also acidifies (pH ↓ raises iCa, −0.42 per unit pH), so the whole-blood iCa sits above the
  // chelation-only rule. The chelation term itself is pinned in fu9-citrate.test.ts. Measured 1.090 vs 1.033 ± 0.05.
  it.fails('massive transfusion: iCa −0.1 per unit-per-5-min of rate (tables citrateUnit, Q46) — measured 1.090 vs 1.033 (FU-9 F5)', () => {
    expect(Math.abs(massive().out.iCa - rule)).toBeLessThanOrEqual(0.05);
  });
```


- [ ] **Step 2 — run; they fail.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/fu9-citrate.test.ts test/l2/blood/core.test.ts test/engine/fu9-transfusion.test.ts`
  → `CITRATE_CHARGE` missing (the citrate file does not import); in `core.test.ts` the new `it.fails` is RED before
  Step 3 because on main the chelation rule still holds (1.033 ± 0.05) — pre-declared; the engine test reads iCa 0.30,
  BE −5.6 and an arrest.
- [ ] **Step 3 — implement.**

In `packages/engine-core/src/l2/blood/solutes.ts`, find:

```ts
/** Apparent SID (mEq/L): Na + K + 2·iCa + 2·Mg_ion − Cl − lactate − keto − metab − XA (tables §5b.1 "Stewart-lite"). */
export function sidOf(c: Conc, iCa: number): number {
  return c.na + c.k + 2 * iCa + 2 * MG_ION_FRAC * c.mg - c.cl - c.lactate - c.keto - c.metab - c.xa;
}
```

replace with:

```ts
/**
 * Apparent SID (mEq/L): Na + K + 2·iCa + 2·Mg_ion − Cl − lactate − keto − metab − 3·citrate − XA (tables §5b.1
 * "Stewart-lite"). FU-9 F5: citrate is a strong trivalent anion until it is metabolised (Stewart/Fencl; Driscoll 1987),
 * so a transfused unit's sodium does not alkalinise at once — its metabolism turns it into bicarbonate later.
 */
export const CITRATE_CHARGE = 3;
export function sidOf(c: Conc, iCa: number): number {
  return c.na + c.k + 2 * iCa + 2 * MG_ION_FRAC * c.mg - c.cl - c.lactate - c.keto - c.metab - CITRATE_CHARGE * c.citrate - c.xa;
}
```

In `packages/engine-core/src/l2/blood/core.ts`, find:

```ts
  stepSolutes(so, ecfMl(fl), dtS, kSet, hbfRel * bc.liver, 1 + K_PUMP_GAIN * Math.abs(drug)); // flow × function, each once
```

replace with:

```ts
  // FU-9 F5: citrate and acetate are metabolised by the liver AND by muscle/kidney (Kramer 2003 Crit Care Med 31:2450),
  // so their clearance follows whole-body flow (CO/CO0), not the splanchnic (CO/CO0)² that lactate's hepatic uptake uses
  const flowRel = Math.min(1.5, Math.max(0, x.coLpm / bc.co0));
  stepSolutes(so, ecfMl(fl), dtS, kSet, flowRel * bc.liver, 1 + K_PUMP_GAIN * Math.abs(drug)); // flow × function, each once
```


- [ ] **Step 4 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood test/engine/fu9-transfusion.test.ts test/engine/blood-sanity-haem.test.ts
  test/engine/blood-sanity-acid.test.ts` → pass (core: 11, its `it.fails` measured 1.090).
- [ ] **Step 5 — BF runner:** `BF-05 BF-01 BF-14` → BF-05a PL 0.72, BF-05d PL −10.9 (no arrest), BF-05b PL; BF-01a/b and
  BF-14 unchanged by A3 (no citrate).
- [ ] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "fix(7c): citrate is a strong anion until metabolised; its clearance follows CO/CO0 (FU-9 F5, E-FU9-1)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

### Task A4: F4 — septic capillary leak reaches the lung water (7e `writeBlood` → 7c σ; Part A)

**Files:**
- Modify: `packages/engine-core/src/l2/blood/fluids.ts` (`SIGMA_LEAK_FLOOR`, `leakSigma`), `packages/engine-core/src/l2/endo/adapters.ts`
  (the `leakSigma` import, `BloodLike.core.fl.sigma`, `writeBlood`'s comment and one line)
- Create: `packages/engine-core/test/l2/blood/fu9-leak.test.ts`, `test/engine/fu9-leak.test.ts` (SLOW_A)
- Overlap: FU-7 (E-FU7-2) edits `adapters.ts`'s `writeCirc` and `readEndoInputs` only; FU-8 does not touch `l2/endo/**`
  in Part A. This task's four `adapters.ts` blocks are the import, the `BloodLike` type and `writeBlood` — merge
  origin/main first if FU-7 has landed (Global Constraints).

**Why / measured (main):** research/22 F4 / BF-20a. Warm septic shock (`kfMult` 2.6), 30 mL/kg saline: extra EVLWI 0 vs
+3.34 mL/kg in a healthy patient; PaO₂ +10 (healthy −8). 7e wrote kfMult but never σ, and the lung-water threshold is
σ·COP − 2, so a leak without a high PAWP made no water. Decision D4.

**Prototype numbers:** engine test (60 min after the load): σ 0.70 at kfMult 3.0; ΔEVLWI 0 → **+1.18 mL/kg**; the §5
acceptance "more than healthy and PaO₂ ↓" is NOT met (+1.18 vs +2.57 healthy; PaO₂ +13 vs +5) → `it.fails` with those
numbers (the septic PAWP stays lower, σ 0.70 leaves a threshold ≈ 15 mmHg, and 7b's lung-water → shunt coupling is F13a).
BF-20a dEvlwiSepsis 0 → +0.72 (direction PL, PaO₂ item still WR). **FU-4 check:** the septic-shock row of the propofol
matrix moves (D13, bisected to this task): pre-dose CO 5.22 → 5.09, nadir at 65 s instead of 85 s, MAP −31.3 % (was
−31.2) — no arrest in either; the F0/F1 sepsis rows of the arrest table unchanged.

- [ ] **Step 1 — the tests.**

Create `packages/engine-core/test/l2/blood/fu9-leak.test.ts`:

```ts
// FU-9 Task A4 (F4): the capillary leak 7e writes also lowers the protein reflection coefficient (two-pore theory).
import { describe, expect, it } from 'vitest';
import { leakSigma, SIGMA_LEAK_FLOOR } from '../../../src/l2/blood/fluids.ts';
import { SIGMA_PROTEIN } from '../../../src/l2/blood/params.ts';
import { writeBlood } from '../../../src/l2/endo/adapters.ts';
import { createEndoState } from '../../../src/l2/endo/pipeline.ts';
import { lungWaterStep } from '../../../src/l2/blood/circ-adapter.ts';

describe('FU-9 F4: septic leak → σ → lung water (Rippe & Haraldsson 1994; Sakka 2002)', () => {
  it('leakSigma: 0.9 at kfMult 1, 0.74 at 2.6, 0.7 at 3, floor 0.3', () => {
    expect(leakSigma(1)).toBeCloseTo(SIGMA_PROTEIN, 9);
    expect(leakSigma(2.6)).toBeCloseTo(0.74, 9);
    expect(leakSigma(3)).toBeCloseTo(0.7, 9);
    expect(leakSigma(10)).toBe(SIGMA_LEAK_FLOOR);
  });
  it('7e writes σ with kfMult, only when kfMult changes', () => {
    const es = createEndoState(undefined, 70);
    const ps = { blood: { core: { fl: { kfMult: 1, sigma: SIGMA_PROTEIN } } as Record<string, unknown> } };
    es.core.out = { ...es.core.out, kfMult: 3 };
    writeBlood(ps, es);
    expect((ps.blood.core.fl as { sigma: number }).sigma).toBeCloseTo(0.7, 9);
  });
  it('at PAWP 16 and COP 22 a normal lung makes no water (threshold 20); the septic σ (kfMult 3: threshold 15.1) does', () => {
    let n = 0;
    let s = 0;
    for (let k = 0; k < 36000; k++) {
      n = lungWaterStep(n, 16, 22, 1, 1, 0.1);
      s = lungWaterStep(s, 16, 22, 3, leakSigma(3) / SIGMA_PROTEIN, 0.1);
    }
    expect(n).toBe(0);
    expect(s).toBeGreaterThan(0);
  });
});
```

Create `packages/engine-core/test/engine/fu9-leak.test.ts`:

```ts
// FU-9 Task A4 (F4): septic capillary leak reaches the lung water (research/22 BF-20a). Rig = the BF runner's GA vent;
// 7e warm septic shock (`condition sepsis 1 warm`) at 60 s; 0.9 % saline 30 mL/kg (2100 mL) over 30 min at 1260 s; read
// 60 min after the end (4860 s) against the same sepsis without the fluid.
import { describe, expect, it } from 'vitest';
import { arm, ev, GA_VENT, st, type Step } from '../helpers/fu9.ts';

const SEPSIS: Step = [60, ev({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'warm' })];
const LOAD: Step = [1260, ev({ kind: 'fluid', fluid: 'saline', volumeMl: 2100, overS: 1800 })];
const read = (e: Parameters<typeof st>[0]) => ({ evlwi: st(e).blood.lung.evlwi, pao2: st(e).resp.o2.pao2, sigma: st(e).blood.core.fl.sigma, kf: st(e).blood.core.fl.kfMult });

describe('FU-9 F4: a septic leak makes lung water at a normal PAWP (Sakka 2002; two-pore theory)', { timeout: 600_000 }, () => {
  it('warm septic shock: σ falls with the leak (σ < 0.8) and 30 mL/kg raises extra EVLWI > 0.25 mL/kg (was 0.0)', async () => {
    const [i] = await arm([...GA_VENT, SEPSIS, LOAD], [4860], read);
    const [c] = await arm([...GA_VENT, SEPSIS], [4860], read);
    if (!i || !c) throw new Error('no sample');
    console.log(`FU-9 F4: kfMult ${c.kf.toFixed(2)}, σ ${c.sigma.toFixed(2)}, ΔEVLWI ${(i.evlwi - c.evlwi).toFixed(2)} mL/kg, ΔPaO2 ${(i.pao2 - c.pao2).toFixed(0)}`);
    expect(c.sigma).toBeLessThan(0.8);
    expect(i.evlwi - c.evlwi).toBeGreaterThan(0.25);
  });
  // R45 (research/22 §5 acceptance for 7e → 7c: "EVLWI ↑ and PaO2 ↓ more than healthy"): the septic lung makes water now,
  // but less than the healthy lung under the same load (1.18 vs 2.56 mL/kg: the vasodilated septic patient's PAWP stays
  // lower, and σ 0.70 still leaves a threshold of ≈ 15 mmHg), and PaO2 still RISES +13 (7b's lung-water → shunt coupling,
  // F13a, is weak and the load raises CO/SvO2). Kept visible for Ali (Open question 3: the septic σ).
  it.fails('warm septic shock + 30 mL/kg: extra EVLWI more than healthy and PaO2 falls — measured +1.18 vs +2.57 mL/kg, PaO2 +13 (FU-9 F4)', async () => {
    const [i] = await arm([...GA_VENT, SEPSIS, LOAD], [4860], read);
    const [c] = await arm([...GA_VENT, SEPSIS], [4860], read);
    const [hi] = await arm([...GA_VENT, LOAD], [4860], read);
    const [hc] = await arm(GA_VENT, [4860], read);
    if (!i || !c || !hi || !hc) throw new Error('no sample');
    console.log(`FU-9 F4 vs healthy: ΔEVLWI ${(i.evlwi - c.evlwi).toFixed(2)} vs ${(hi.evlwi - hc.evlwi).toFixed(2)} mL/kg, ΔPaO2 ${(i.pao2 - c.pao2).toFixed(0)} vs ${(hi.pao2 - hc.pao2).toFixed(0)}`);
    expect(i.evlwi - c.evlwi).toBeGreaterThan(hi.evlwi - hc.evlwi);
    expect(i.pao2 - c.pao2).toBeLessThan(-5);
  });
});
```


- [ ] **Step 2 — run; they fail.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/fu9-leak.test.ts test/engine/fu9-leak.test.ts` → `leakSigma` missing;
  engine: σ stays 0.9, ΔEVLWI 0.
- [ ] **Step 3 — implement.**

In `packages/engine-core/src/l2/blood/fluids.ts`, find:

```ts
/** Plasma ↔ interstitium exchange J (mL/min, positive = filtration out of plasma) and extra lymph (mL/min). */
```

replace with:

```ts
/**
 * FU-9 F4: the protein reflection coefficient of a leaky endothelium. Inflammation opens LARGE pores, which carry most of
 * the extra hydraulic conductance and most of the protein flux (two-pore theory: Rippe & Haraldsson 1994 Physiol Rev
 * 74:163), so the non-reflected share (1 − σ) grows with the same factor as Kf: σ = 1 − (1 − σ0)·kfMult, floor
 * SIGMA_LEAK_FLOOR [ENG]. Normal (kfMult 1) → 0.9; warm septic shock (kfMult 2.6) → 0.74; kfMult 3 → 0.7.
 */
export const SIGMA_LEAK_FLOOR = 0.3;
export function leakSigma(kfMult: number): number {
  return Math.max(SIGMA_LEAK_FLOOR, 1 - (1 - SIGMA_PROTEIN) * Math.max(1, kfMult));
}

/** Plasma ↔ interstitium exchange J (mL/min, positive = filtration out of plasma) and extra lymph (mL/min). */
```

In `packages/engine-core/src/l2/endo/adapters.ts`, find:

```ts
import type { Modifiers } from '../../types.ts';
import { betaBlunt } from '../pk/pd.ts';
```

replace with:

```ts
import type { Modifiers } from '../../types.ts';
import { leakSigma } from '../blood/fluids.ts'; // FU-9 F4
import { betaBlunt } from '../pk/pd.ts';
```

find:

```ts
  core?: { so?: { keto?: number }; fl?: { vp?: number; visf?: number; kfMult?: number }; endoKShift?: number; endoGlucoseMgDl?: number };
```

replace with:

```ts
  core?: { so?: { keto?: number }; fl?: { vp?: number; visf?: number; kfMult?: number; sigma?: number }; endoKShift?: number; endoGlucoseMgDl?: number };
```

find:

```ts
 * only when 7e's value changes, so a resting 7e never overwrites another writer). `fl.sigma` is left to 7c: the
 * tables give no septic/anaphylactic σ, and 7c's Starling form scales only pressure-driven filtration (gap, Requests).
 * False without 7c.
```

replace with:

```ts
 * only when 7e's value changes, so a resting 7e never overwrites another writer) and, with it, the protein reflection
 * coefficient `fl.sigma` = 7c's `leakSigma(kfMult)` (FU-9 F4: a leak without a high pulmonary venous pressure now makes
 * lung water). False without 7c.
```

find:

```ts
    c.fl.kfMult = o.kfMult;
    es.kfMult = o.kfMult;
```

replace with:

```ts
    c.fl.kfMult = o.kfMult;
    c.fl.sigma = leakSigma(o.kfMult); // FU-9 F4: the same leak lowers the protein reflection coefficient (lung water, Starling)
    es.kfMult = o.kfMult;
```


- [ ] **Step 4 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood test/l2/endo test/engine/fu9-leak.test.ts test/engine/endo-circ-acceptance.test.ts
  test/engine/endo-acceptance.test.ts` → pass (the leak file: 1 `it` + 1 `it.fails`, ≈ 2 min wall).
- [ ] **Step 5 — BF runner:** `BF-20a BF-20b` → dEvlwiSepsis +0.72 (PL direction), dPao2Sepsis still > 0 (WR, recorded),
  BF-20b keptFrac ≈ 1.0 (TS, Open question 3).
- [ ] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "feat(7e,7c): a capillary leak lowers the protein reflection coefficient with Kf — septic lung water (FU-9 F4)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

### Task A5: F8 — COP from albumin AND globulins; a profile albumin shows its anion gap (7c; Part A)

**Files:**
- Modify: `packages/engine-core/src/l2/blood/fluids.ts` (header, `FluidState.globG`, `GLOBULIN_GL`, `copPlasma`, `createFluids`,
  the bleed and infusion lines), `packages/engine-core/src/l2/blood/params.ts` (`Composition.globGL`, `Z`, three plasma
  products), `packages/engine-core/src/l2/blood/core.ts` (the calibration block of `createBloodCore`)
- Create: `packages/engine-core/test/l2/blood/fu9-albumin.test.ts`
- Overlap: FU-7 (E-FU7-4) edits the `createSolutes` line two lines above this task's `core.ts` block (one unchanged line
  between them); FU-6 edits `params.ts` (`hbRef` on `BloodPatient`) and `core.ts` before the function — other hunks.

**Why / measured (main):** research/22 F8 / BF-22a/b and research/19 CM-10c. Albumin 20: COP 8.66 (total protein taken as
1.6 × albumin, so the globulins fell with it), lung-oedema threshold PAWP 6.7; a PROFILE albumin 20 left AG −0.16 and BE
+0.2 because `createBloodCore` calibrated the unmeasured anions at the profile albumin, while the same albumin reached by
dilution lowers AG ≈ 4 (IN). CM-10c: COP 11.5 at albumin 25. Decision D5.

**Prototype numbers:** COP at albumin 40 22.35 (unchanged), 20 → **13.1** (band 11–17), 25 → 15.2; profile albumin 20:
AG −4.9 (band −6.5 to −3.5), BE +5.4, K 4.20; with a profile HCO₃ 24.4 → HCO₃ 24.4. BF-03a 60-min volume effect
0.93 → 0.75 (still PL — D5, Open question 4). **FU-4 check:** normal-albumin patients bit-identical (COP formula identical
at albumin 40): `audit:physiology` unchanged with A5 alone.

- [ ] **Step 1 — the test.**

Create `packages/engine-core/test/l2/blood/fu9-albumin.test.ts`:

```ts
// FU-9 Task A5 (F8): COP from albumin AND globulins; a profile albumin keeps its weak-acid deficit (Figge).
import { describe, expect, it } from 'vitest';
import { createBloodCore, stepBloodCore } from '../../../src/l2/blood/core.ts';
import { copPlasma, createFluids, GLOBULIN_GL } from '../../../src/l2/blood/fluids.ts';
import { bloodPatient } from '../../../src/l2/blood/params.ts';

const MAN = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175 };
const step = (bc: ReturnType<typeof createBloodCore>) => stepBloodCore(bc, { t: 0, coLpm: 5.25, paco2: 40, pao2: 95, tempC: 37, vo2Demand: 245 }, 0.1);

describe('FU-9 F8: hypoalbuminaemia (Weil 1979; Figge 1998; Fencl 2000)', () => {
  it('COP: 22.4 at albumin 40 (unchanged), 11–17 at albumin 20 (was 8.7), ≈ 15 at albumin 25 (CM-10c, was 11.5)', () => {
    const p = bloodPatient(MAN);
    expect(GLOBULIN_GL).toBe(24);
    expect(copPlasma(createFluids(p, 40))).toBeCloseTo(22.35, 1);
    const c20 = copPlasma(createFluids(p, 20));
    const c25 = copPlasma(createFluids(p, 25));
    console.log(`FU-9 F8 COP: albumin 20 → ${c20.toFixed(1)}, 25 → ${c25.toFixed(1)}`);
    expect(c20).toBeGreaterThanOrEqual(11);
    expect(c20).toBeLessThanOrEqual(17);
    expect(c25).toBeGreaterThan(c20);
  });
  it('profile albumin 20 g/L without a profile HCO3: AG 3.5–6.5 lower than normal and BE > 0 (the dilution picture); with a profile HCO3 it is honoured', () => {
    const n = createBloodCore(MAN, 5.25, 40);
    const a = createBloodCore({ ...MAN, blood: { albuminGL: 20 } }, 5.25, 40);
    const h = createBloodCore({ ...MAN, blood: { albuminGL: 20, hco3: 24.4 } }, 5.25, 40);
    for (const bc of [n, a, h]) step(bc);
    console.log(`FU-9 F8 AG: normal ${n.out.ag.toFixed(1)}, albumin 20 ${a.out.ag.toFixed(1)} (BE ${a.ab.be.toFixed(1)}), with HCO3 24.4 → ${h.ab.hco3.toFixed(1)}`);
    expect(n.out.ag - a.out.ag).toBeGreaterThanOrEqual(3.5);
    expect(n.out.ag - a.out.ag).toBeLessThanOrEqual(6.5);
    expect(a.ab.be).toBeGreaterThan(0);
    expect(h.ab.hco3).toBeCloseTo(24.4, 1);
    expect(a.out.k).toBeCloseTo(4.2, 2); // the K reference is the patient's own resting pH
  });
});
```


- [ ] **Step 2 — run; it fails.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/fu9-albumin.test.ts` → `GLOBULIN_GL` missing (COP 8.7 at albumin 20).
- [ ] **Step 3 — implement.**

In `packages/engine-core/src/l2/blood/fluids.ts`, find:

```ts
//   πp = Landis–Pappenheimer(TP), TP = 1.6·(albumin + colloid) g/dL   Pisf = ΔVisf/(C·Visf0)   πisf = πisf0·Visf0/Visf
```

replace with:

```ts
//   πp = Landis–Pappenheimer(TP), TP = albumin + globulins + 1.6·colloid g/dL (FU-9 F8)   Pisf = ΔVisf/(C·Visf0)   πisf = πisf0·Visf0/Visf
```

find:

```ts
  albG: number; // plasma albumin mass
```

replace with:

```ts
  albG: number; // plasma albumin mass
  globG: number; // plasma globulin mass (g) — FU-9 F8: constant unless bled or given, so it dilutes but never follows albumin
```

find:

```ts
/** Plasma colloid osmotic pressure (mmHg): TP (g/dL) = 1.6·(albumin + colloid) (annex B1: total protein = 1.6·albumin). */
export function copPlasma(f: FluidState): number {
  return landis((1.6 * 100 * (f.albG + f.colloidG)) / f.vp);
}
```

replace with:

```ts
/**
 * Plasma colloid osmotic pressure (mmHg), Landis–Pappenheimer on total protein TP (g/dL) = albumin + globulins +
 * 1.6·colloid. FU-9 F8: the globulins (24 g/L at the normal albumin 40, so the normal TP 64 = annex B1's 1.6·albumin and
 * COP 22.4 are unchanged) are their own mass: hypoalbuminaemia no longer takes a third of the COP with it (albumin
 * 20 g/L → COP 13, Weil 1979 Crit Care Med 7:113: 12–16 mmHg). Synthetic colloid keeps its albumin-equivalent × 1.6.
 */
export const GLOBULIN_GL = 24;
export function copPlasma(f: FluidState): number {
  return landis((100 * (f.albG + f.globG + 1.6 * f.colloidG)) / f.vp);
}
```

find:

```ts
    vp: p.plasmaMl, visf: p.isfMl, vicf: p.icfMl, hbG: (p.hb * p.bvMl) / 100, albG, colloidG: 0,
```

replace with:

```ts
    vp: p.plasmaMl, visf: p.isfMl, vicf: p.icfMl, hbG: (p.hb * p.bvMl) / 100, albG, globG: (GLOBULIN_GL * p.plasmaMl) / 1000, colloidG: 0,
```

find:

```ts
      f.albG -= (f.albG / f.vp) * out * (1 - hct);
```

replace with:

```ts
      f.albG -= (f.albG / f.vp) * out * (1 - hct);
      f.globG -= (f.globG / f.vp) * out * (1 - hct);
```

find:

```ts
      f.albG += (c.albGL * ml * (1 - c.hct)) / 1000;
```

replace with:

```ts
      f.albG += (c.albGL * ml * (1 - c.hct)) / 1000;
      f.globG += (c.globGL * ml * (1 - c.hct)) / 1000;
```

In `packages/engine-core/src/l2/blood/params.ts`, find:

```ts
  albGL: number; // true albumin g/L (oncotic AND acid–base)
```

replace with:

```ts
  albGL: number; // true albumin g/L (oncotic AND acid–base)
  globGL: number; // globulins g/L (oncotic only; plasma products carry the plasma's) — FU-9 F8
```

find:

```ts
const Z: Composition = { na: 0, k: 0, cl: 0, ca: 0, mg: 0, lactate: 0, metab: 0, xa: 0, albGL: 0, colloidGL: 0, osmOther: 0, hct: 0, citrate: 0 };
```

replace with:

```ts
const Z: Composition = { na: 0, k: 0, cl: 0, ca: 0, mg: 0, lactate: 0, metab: 0, xa: 0, albGL: 0, globGL: 0, colloidGL: 0, osmOther: 0, hct: 0, citrate: 0 };
```

find:

```ts
  ffp: { ml: 250, comp: { ...Z, na: 165, k: 4, cl: 75, albGL: 40, citrate: 15.6 / 0.25 } },
  platelets: { ml: 250, comp: { ...Z, na: 150, cl: 100, albGL: 40, citrate: 8 / 0.25 } },
  wholeBlood: { ml: 500, comp: { ...Z, na: 150, k: 4, cl: 100, albGL: 40, hct: 0.4, citrate: 15.6 / 0.5 } },
```

replace with:

```ts
  ffp: { ml: 250, comp: { ...Z, na: 165, k: 4, cl: 75, albGL: 40, globGL: 24, citrate: 15.6 / 0.25 } },
  platelets: { ml: 250, comp: { ...Z, na: 150, cl: 100, albGL: 40, globGL: 24, citrate: 8 / 0.25 } },
  wholeBlood: { ml: 500, comp: { ...Z, na: 150, k: 4, cl: 100, albGL: 40, globGL: 24, hct: 0.4, citrate: 15.6 / 0.5 } },
```

In `packages/engine-core/src/l2/blood/core.ts`, find:

```ts
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
```

replace with:

```ts
  // calibrate the unmeasured anions so the profile's HCO3 (default 24.4) holds at PaCO2 40 (tables §5b.1 normal row).
  // FU-9 F8: without a profile HCO3 the calibration uses the NORMAL albumin, so a profile hypoalbuminaemia keeps its
  // weak-acid deficit — the Figge picture (low AG, mild alkalosis) that the same albumin reached by dilution shows
  // (Figge 1998 Crit Care Med 26:1807; Fencl 2000 AJRCCM 162:2246); a given profile HCO3 is honoured as measured.
  const hco3 = b.hco3 ?? NORMAL.hco3;
  const ph0 = 6.1 + Math.log10(hco3 / (0.0307 * NORMAL.paco2));
  const c = concOf(so, e0, pat.vLacL, e0);
  const alb = albGL(fl);
  const albCal = b.hco3 === undefined ? NORMAL.albGL : alb;
  const sidNeed = hco3 + albCal * (0.123 * ph0 - 0.631) + c.pi * (0.309 * ph0 - 0.469) + ((1.43 * pat.hb) / 3) * (ph0 - 7.4);
  calibrateXa(so, e0, sidOf(c, ionisedCa(c, ph0)), sidNeed);
  const ab = solvePh(paco2, { sid: sidNeed, albGL: alb, piMmolL: c.pi, hb: pat.hb });
  so.set.ph = albCal === alb ? ph0 : ab.ph; // the K reference is the patient's own resting pH
  return {
    pat, fl, so, ab, phNonOrg: so.set.ph,
```


- [ ] **Step 4 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood test/l2/organs test/engine/blood-sanity-acid.test.ts` → pass (`fluids.test.ts`'s
  22.4 at the normal albumin holds).
- [ ] **Step 5 — BF runner:** `BF-22 BF-03 BF-21` → BF-22a PL 13.1, BF-22b PL −4.9, BF-03a/b PL, BF-21a/b PL.
- [ ] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "fix(7c): globulins in the COP; a profile albumin keeps its weak-acid deficit (FU-9 F8)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

### Task A6: F6 — renal K⁺ excretion follows plasma K⁺ and the loop diuretic's flow; the cellular pool is finite (7d + 7c; Part A)

**Files:**
- Modify: `packages/engine-core/src/l2/organs/pipeline.ts` (`renalSeam`'s K, its call in `oneHz`),
  `packages/engine-core/src/l2/organs/inputs.ts` (`BloodLike.core` gains `so.set.k` and `out.k`),
  `packages/engine-core/src/l2/blood/solutes.ts` (`set.kIcf`, `K_TBK_MMOL`), `packages/engine-core/src/l2/blood/core.ts`
  (the import, `kSet`)
- Create: `packages/engine-core/test/l2/blood/fu9-potassium.test.ts`, `test/engine/fu9-potassium.test.ts` (SLOW_A)
- Overlap: none (FU-7's `blood/core.ts` blocks are the `createSolutes` line and the sux call; FU-8 does not edit
  `organs/**` — checked on its current draft).

**Why / measured (main):** research/22 F6 / BF-08d. Furosemide 40 mg at a profile K 7.5: urine +159 mL/h, K −0.002 at
3 h. Two causes: the seam excreted a fixed 50 mmol/L × the urine above basal whatever the plasma K, and 7c's cells refill
the ECF to `set.k` from an unlimited store, so any renal loss is invisible. Decision D6.

**Prototype numbers:** furosemide at K 7.5 under GA: ΔK −0.002 → **−0.042** at 3 h, cellular pool −3.6 mmol (the cells
share the loss); the report's "beyond 0.1" (dirOnly) is not reached → `it.fails` with −0.042 (Open question 5). Unit:
20 mmol lost over 1 h → K −0.10 two hours later (equilibrium −0.067 = 20/300), cells −18.6 mmol. The untreated GA patient
now retains the intake's K (UOP 25 mL/h: −1.6 mmol/h in the seam, +0.005 mmol/L per hour). BF-08b/c/d: see the results
table. **FU-4 check:** `blood-k-rhythm`, `blood-hyperk`, `clinical-suite` pass;
`audit:physiology` K rows (G2b K 9.5 VF 65 s, G3b burns + sux VF 525 s) unchanged.

- [ ] **Step 1 — the tests.**

Create `packages/engine-core/test/l2/blood/fu9-potassium.test.ts`:

```ts
// FU-9 Task A6 (F6): the cellular K pool is finite — a renal K loss lowers plasma K (Sterns: 300 mmol per mmol/L) instead of
// being refilled to the set point.
import { describe, expect, it } from 'vitest';
import { createBloodCore, stepBloodCore } from '../../../src/l2/blood/core.ts';

const MAN = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175 };

describe('FU-9 F6: total-body K (Sterns 1981)', () => {
  it('rest: K stays at the set point; 20 mmol lost in the urine over 1 h lowers K for hours and the cells share the loss', () => {
    const run = (lossMmolH: number) => {
      const bc = createBloodCore(MAN, 5.25, 40);
      const kIcf0 = bc.so.kIcf;
      bc.renal = { uopAboveBasalMlH: 0, excretion: { k: lossMmolH, na: 0, cl: 0, gluconate: 0 } };
      for (let k = 0; k < 3 * 36000; k++) {
        if (k === 36000 && bc.renal) bc.renal.excretion.k = 0; // the loss stops after 1 h; read 2 h later
        stepBloodCore(bc, { t: k / 10, coLpm: 5.25, paco2: 40, pao2: 95, tempC: 37, vo2Demand: 245 }, 0.1);
      }
      return { k: bc.out.k, cells: bc.so.kIcf - kIcf0 };
    };
    const r = run(0);
    const l = run(20);
    console.log(`FU-9 F6: 20 mmol over 1 h, read 2 h later → K ${l.k.toFixed(3)} (rest ${r.k.toFixed(3)}), cells ${l.cells.toFixed(1)} mmol`);
    expect(r.k).toBeCloseTo(4.2, 2);
    expect(l.k).toBeLessThan(r.k - 0.05); // Sterns: 20 mmol ÷ K_TBK_MMOL 300 = −0.067 at equilibrium (measured −0.10 two hours on)
    expect(l.k).toBeGreaterThan(r.k - 0.15);
    expect(l.cells).toBeLessThan(-15); // most of the loss has come out of the cells (before FU-9 they refilled the ECF to set.k)
  });
});
```

Create `packages/engine-core/test/engine/fu9-potassium.test.ts`:

```ts
// FU-9 Task A6 (F6): renal K excretion follows plasma K and the loop diuretic's flow, and a renal loss is not refilled
// from an unlimited cellular store (research/22 BF-08d). Rig = the BF runner's GA vent with a profile K 7.5 (normal pH);
// furosemide 40 mg at 300 s; K 3 h later against the same patient without it.
import { describe, expect, it } from 'vitest';
import { arm, ev, GA_VENT, MAN, st } from '../helpers/fu9.ts';

const HYPERK = { ...MAN, blood: { k: 7.5 } };
const read = (e: Parameters<typeof st>[0]) => ({ k: st(e).blood.out.k, kIcf: st(e).blood.core.so.kIcf });

describe('FU-9 F6: kaliuresis (Young 1988; Good & Wright 1979; UK Renal Association 2023)', { timeout: 600_000 }, () => {
  it('furosemide 40 mg at K 7.5: K lower than the untreated patient at 3 h (was −0.002) and the cells share the loss', async () => {
    const at = [300 + 3 * 3600];
    const [f] = await arm([...GA_VENT, [300, ev({ kind: 'drug', drugId: 'furosemide', dose: 40, unit: 'mg', route: 'iv' })]], at, read, HYPERK);
    const [c] = await arm(GA_VENT, at, read, HYPERK);
    if (!f || !c) throw new Error('no sample');
    console.log(`FU-9 F6: ΔK ${(f.k - c.k).toFixed(3)} at 3 h, cellular pool ${(f.kIcf - c.kIcf).toFixed(1)} mmol`);
    expect(f.k).toBeLessThan(c.k - 0.02);
    expect(f.kIcf).toBeLessThan(c.kIcf);
  });
  // R45 (research/22 BF-08d, dirOnly "beyond 0.1"): the band's size is Ali's (Open question 5). Under GA the diuresis is
  // small (+150 mL/h at the peak), the kaliuresis ≈ 10 mmol against the untreated patient's retention, and 300 mmol of
  // total-body K per mmol/L (Sterns 1981) turns that into −0.04; the alkalotic rig (pH 7.57) also holds K in the cells.
  it.fails('furosemide 40 mg at K 7.5: K ≥ 0.1 lower at 3 h — measured −0.042 (FU-9 F6)', async () => {
    const at = [300 + 3 * 3600];
    const [f] = await arm([...GA_VENT, [300, ev({ kind: 'drug', drugId: 'furosemide', dose: 40, unit: 'mg', route: 'iv' })]], at, read, HYPERK);
    const [c] = await arm(GA_VENT, at, read, HYPERK);
    expect((f?.k ?? 0) - (c?.k ?? 0)).toBeLessThanOrEqual(-0.1);
  });
});
```


- [ ] **Step 2 — run; they fail.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/fu9-potassium.test.ts test/engine/fu9-potassium.test.ts`
  → the unit test's K returns to 4.200 (cells refill); the engine test reads ΔK −0.002.
- [ ] **Step 3 — implement.**

In `packages/engine-core/src/l2/blood/core.ts`, find:

```ts
import { addFluid, calibrateXa, concOf, createSolutes, ionisedCa, osmEcf, removePlasma, sidOf, stepSolutes, type Conc, type SoluteState } from './solutes.ts';
```

replace with:

```ts
import { addFluid, calibrateXa, concOf, createSolutes, ionisedCa, K_TBK_MMOL, osmEcf, removePlasma, sidOf, stepSolutes, type Conc, type SoluteState } from './solutes.ts';
```

In `packages/engine-core/src/l2/blood/solutes.ts`, find:

```ts
  set: { k: number; ca: number; mg: number; ph: number }; // homeostatic set points (mmol/L; pH of the K reference)
```

replace with:

```ts
  set: { k: number; ca: number; mg: number; ph: number; kIcf: number }; // homeostatic set points (mmol/L; pH of the K reference; FU-9 F6: the cellular K pool, mmol)
```

find:

```ts
    lac: p.lactate * vLacL, kIcf: 140 * (icfMl / 1000), pi: NORMAL.piMmolL * v, set: { k: p.k, ca: p.iCa, mg: p.mg, ph: 7.4 },
```

replace with:

```ts
    lac: p.lactate * vLacL, kIcf: 140 * (icfMl / 1000), pi: NORMAL.piMmolL * v, set: { k: p.k, ca: p.iCa, mg: p.mg, ph: 7.4, kIcf: 140 * (icfMl / 1000) },
```

In `packages/engine-core/src/l2/blood/core.ts`, find:

```ts
  const kSet = so.set.k - 4.0 * (bc.phNonOrg - so.set.ph) + drug; // Q45
```

replace with:

```ts
  // Q45; FU-9 F6: the set point follows the total-body K — an external K loss (or gain) is shared by the cells instead of
  // being refilled from an unlimited store: plasma K falls 1 mmol/L per K_TBK_MMOL of total-body deficit (Sterns 1981)
  const kSet = so.set.k + (so.kIcf + so.k - (so.set.kIcf + so.set.k * (bc.ecf0 / 1000))) / K_TBK_MMOL - 4.0 * (bc.phNonOrg - so.set.ph) + drug;
```

In `packages/engine-core/src/l2/blood/solutes.ts`, find:

```ts
export const K_TAU_MIN = 43; // 50 % of a K load into cells in 30 min (tables `vK`) [ENG]
```

replace with:

```ts
export const K_TAU_MIN = 43; // 50 % of a K load into cells in 30 min (tables `vK`) [ENG]
/** FU-9 F6: total-body K per mmol/L of plasma K — a 200–400 mmol deficit lowers plasma K ≈ 1 mmol/L (Sterns RH et al.
 *  Medicine 1981;60:339–354) [TXT, midpoint]; the Na/K-ATPase set point follows it (core.ts kSet). */
export const K_TBK_MMOL = 300;
```

In `packages/engine-core/src/l2/organs/inputs.ts`, find:

```ts
  core?: { liver?: number; renal?: RenalSeam };
```

replace with:

```ts
  core?: { liver?: number; renal?: RenalSeam; so?: { set?: { k?: number } }; out?: { k?: number } }; // FU-9 F6: K and its set point
```

In `packages/engine-core/src/l2/organs/pipeline.ts`, find:

```ts
function renalSeam(s: RenalState, gluconate: number): RenalSeam {
  const lH = Math.max(0, s.uopMlMin * 60 - UOP0_ML_KG_H * s.p.weightKg) / 1000;
  const na = lH * URINE_NA * (1 + FUROSEMIDE_NA_BOOST * s.furoE);
  const k = lH * URINE_K;
```

replace with:

```ts
function renalSeam(s: RenalState, gluconate: number, kRel = 1): RenalSeam {
  const lH = Math.max(0, s.uopMlMin * 60 - UOP0_ML_KG_H * s.p.weightKg) / 1000;
  const na = lH * URINE_NA * (1 + FUROSEMIDE_NA_BOOST * s.furoE);
  // FU-9 F6: distal K secretion follows the plasma K (÷ the patient's own set point: at rest the basal excretion
  // balances the basal intake) and the distal flow, sublinearly (Good & Wright 1979 Am J Physiol 236:F192; Young 1988
  // Am J Physiol 255:F811) — so a loop diuretic's flow and a high K excrete more, and an oliguric kidney RETAINS the
  // intake's K (negative: KCl kept, the AKI hyperkalaemia). Replaces URINE_K × the urine above basal.
  const k0 = (UOP0_ML_KG_H * s.p.weightKg * URINE_K) / 1000; // mmol/h at the basal urine
  const k = k0 * (kRel * Math.sqrt(Math.max(0, s.uopMlMin * 60) / (UOP0_ML_KG_H * s.p.weightKg)) - 1);
```

find:

```ts
    core.renal = renalSeam(os.renal, v.gluconate);
```

replace with:

```ts
    const kSet = core.so?.set?.k;
    const kNow = core.out?.k;
    core.renal = renalSeam(os.renal, v.gluconate, typeof kSet === 'number' && typeof kNow === 'number' && kSet > 0 ? kNow / kSet : 1); // FU-9 F6
```


- [ ] **Step 4 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood test/l2/organs test/l2/renal test/engine/fu9-potassium.test.ts
  test/engine/blood-hyperk.test.ts test/engine/blood-k-rhythm.test.ts test/engine/organs-soak.test.ts` → pass (the soak's
  6 h rest: K unchanged — nothing is retained or lost at rest).
- [ ] **Step 5 — BF runner:** `BF-08 BF-05b BF-17b` → BF-08d dKFuro3h −0.036 (TW, dirOnly), the others in band.
- [ ] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "fix(7d,7c): kaliuresis follows plasma K and distal flow; the cellular K pool is finite (FU-9 F6)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

### Task A7: F9 — metabolic alkalosis is compensated by hypoventilation (7f `spont.ts`; Part A)

**Files:**
- Modify: `packages/engine-core/src/l2/neuro/spont.ts` (header comment line, `paco2SetPoint` and its constants, the ONE
  `s.paco2Set = …` line in `stepSpontDrive`)
- Create: `packages/engine-core/test/l2/neuro/fu9-alkalosis.test.ts`, `test/engine/fu9-alkalosis.test.ts` (SLOW_A)
- Overlap (declared): FU-6 Task 13 edits the same `s.paco2Set = paco2SetPoint(…)` line (it subtracts its pregnancy
  `setShift`). Whichever plan lands second re-anchors by content; the merged line is
  `  s.paco2Set = paco2SetPoint(s.paco2Rest - (x.setShift ?? 0), x.hco3, x.paco2); // FU-6 R10: the pregnancy set point; FU-9 F9: the metabolic HCO3`.
  FU-6's other `spont.ts` blocks (Tasks 4, 5, 10) are on other lines. `l2/neuro/**` is otherwise off-limits (Global
  Constraints).

**Why / measured (main):** research/22 F9 / BF-15b. A profile HCO₃ 34 breathes to PaCO₂ 38.9, pH 7.55: the set point moved
only down (Winter). Decision D7.

**Prototype numbers:** engine test PaCO₂ 39.0 → **45.3** (+6.3; band +5 to +9), pH 7.497, HCO₃ 34.7 (BF-15b +6.3); unit: HCO₃ 34 → set point +6.7,
resting HCO₃ → unchanged, a compensated retainer (45, 26.15) → 45. **FU-4 check:** see D13 — A7 is the only task that moves
any `audit:physiology` row (D0, D2, K-ptx by −5/−40/+5…+10 s), and those rows move by the same amounts under a
1 × 10⁻⁵ mmHg perturbation: chaotic, recorded; `neuro-spont`, `neuro-engine`, `circ-hypoxic-arrest` pass.

- [ ] **Step 1 — the tests.**

Create `packages/engine-core/test/l2/neuro/fu9-alkalosis.test.ts`:

```ts
// FU-9 Task A7 (F9): the chemoreflex set point rises in metabolic alkalosis (0.7 mmHg per mmol/L HCO3, cap 55).
import { describe, expect, it } from 'vitest';
import { ALK_PACO2_MAX, paco2SetPoint } from '../../../src/l2/neuro/spont.ts';

describe('FU-9 F9: respiratory compensation of metabolic alkalosis (Javaheri & Kazemi 1987)', () => {
  it('HCO3 34 → set point +6.7; resting HCO3 24.4 → unchanged; acidosis still Winter; capped at 55', () => {
    expect(paco2SetPoint(40, 34)).toBeCloseTo(40 + 0.7 * (34 - 24.4), 9);
    expect(paco2SetPoint(40, 24.4)).toBe(40);
    expect(paco2SetPoint(40, 15)).toBeCloseTo(30.5, 9);
    expect(paco2SetPoint(40, 60)).toBe(ALK_PACO2_MAX);
  });
  it('a chronic hypercapnic set point (45) with its compensated HCO3 (24.4 + 0.35·5) is not read as alkalosis', () => {
    expect(paco2SetPoint(45, 24.4 + 0.35 * 5)).toBe(45);
  });
});
```

Create `packages/engine-core/test/engine/fu9-alkalosis.test.ts`:

```ts
// FU-9 Task A7 (F9): metabolic alkalosis is compensated by hypoventilation (research/22 BF-15b). Rig = the BF runner's
// awake, spontaneously breathing room-air patient (MODELED) with a profile HCO3 34, read at 30 min against X-A.
import { describe, expect, it } from 'vitest';
import { arm, MAN, st } from '../helpers/fu9.ts';

describe('FU-9 F9: respiratory compensation of metabolic alkalosis (Javaheri 1987; the Boston rules)', { timeout: 300_000 }, () => {
  it('HCO3 34: PaCO2 +5 to +9 above the normal patient (expected +7), pH below 7.55 (was PaCO2 −0.1, pH 7.55)', async () => {
    const read = (e: Parameters<typeof st>[0]) => ({ paco2: st(e).resp.co2.pf, ph: st(e).blood.core.ab.ph, hco3: st(e).blood.core.ab.hco3 });
    const [a] = await arm([], [1800], read, { ...MAN, blood: { hco3: 34 } });
    const [n] = await arm([], [1800], read);
    if (!a || !n) throw new Error('no sample');
    console.log(`FU-9 F9: PaCO2 ${a.paco2.toFixed(1)} vs ${n.paco2.toFixed(1)}, pH ${a.ph.toFixed(3)}, HCO3 ${a.hco3.toFixed(1)}`);
    expect(a.paco2 - n.paco2).toBeGreaterThanOrEqual(5);
    expect(a.paco2 - n.paco2).toBeLessThanOrEqual(9);
    expect(a.ph).toBeLessThan(7.55);
  });
});
```


- [ ] **Step 2 — run; they fail.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/neuro/fu9-alkalosis.test.ts test/engine/fu9-alkalosis.test.ts` →
  `ALK_PACO2_MAX` missing; engine PaCO₂ +(−0.1).
- [ ] **Step 3 — implement** (merge origin/main first; if FU-6 has landed, the last block's find line carries its
  `setShift` — make the same change on the merged line given above).

In `packages/engine-core/src/l2/neuro/spont.ts`, find:

```ts
//     (24 without 7c → no shift): paco2Set = min(paco2Rest, 1.5·HCO3 + 8). Metabolic alkalosis is not compensated (v1).
```

replace with:

```ts
//     (24 without 7c → no shift): paco2Set = min(paco2Rest, 1.5·HCO3 + 8); raised in metabolic alkalosis by 0.7 mmHg per
//     mmol/L of HCO3 above the patient's reference (FU-9 F9: Javaheri & Kazemi 1987 / the Boston rules), capped at 55 mmHg.
```

find:

```ts
/** The chemoreflex set point: the resting PaCO2, lowered to Winter's value in metabolic acidosis only. */
export function paco2SetPoint(paco2Rest: number, hco3: number): number {
  return Math.min(paco2Rest, winterPaco2(hco3));
}
```

replace with:

```ts
/**
 * FU-9 F9: metabolic alkalosis is compensated by hypoventilation — PaCO2 rises 0.7 mmHg per mmol/L HCO3 above normal
 * (Javaheri S, Kazemi H. Am Rev Respir Dis 1987;136:1011; Narins & Emmett 1980 "Boston rules"), rarely beyond 55 mmHg
 * (the hypoxaemic drive limits it). The reference is 7c's normal 24.4 plus the chronic renal compensation the patient's
 * own resting PaCO2 implies (tables §5b.1: +0.35 per mmHg above 40), so a compensated chronic hypercapnic profile is not
 * read as a metabolic alkalosis.
 */
export const ALK_SLOPE = 0.7;
export const ALK_PACO2_MAX = 55;
export const HCO3_REF = 24.4;
export const CHRONIC_HCO3_PER_MMHG = 0.35;
/** Acute CO2 buffering, mmol/L HCO3 per mmHg PaCO2 (Brackett, Cohen & Schwartz 1965 NEJM 272:6; 7c's own BF-16a 0.11–0.15). */
export const ACUTE_HCO3_PER_MMHG = 0.1;
/**
 * The chemoreflex set point: the resting PaCO2, lowered to Winter's value in metabolic acidosis, raised in metabolic
 * alkalosis (FU-9 F9). The alkalosis branch reads the METABOLIC bicarbonate — the measured HCO3 less the acute buffering
 * of a PaCO2 above the resting value (`paco2`, default the resting value) — so an acute hypercapnia (opioids, dead space)
 * is never read as a metabolic alkalosis that would lift the set point further; at rest the set point is unchanged.
 */
export function paco2SetPoint(paco2Rest: number, hco3: number, paco2 = paco2Rest): number {
  const ref = HCO3_REF + CHRONIC_HCO3_PER_MMHG * Math.max(0, paco2Rest - 40);
  const met = hco3 - ACUTE_HCO3_PER_MMHG * Math.max(0, paco2 - paco2Rest);
  if (met > ref) return Math.max(paco2Rest, Math.min(ALK_PACO2_MAX, paco2Rest + ALK_SLOPE * (met - ref)));
  return Math.min(paco2Rest, winterPaco2(hco3));
}
```

find:

```ts
  s.paco2Set = paco2SetPoint(s.paco2Rest, x.hco3);
```

replace with:

```ts
  s.paco2Set = paco2SetPoint(s.paco2Rest, x.hco3, x.paco2); // FU-9 F9: the metabolic HCO3 (acute buffering removed)
```


- [ ] **Step 4 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/neuro test/engine/fu9-alkalosis.test.ts test/engine/neuro-spont.test.ts
  test/engine/circ-hypoxic-arrest.test.ts` → pass.
- [ ] **Step 5 — BF runner:** `BF-15b BF-16 BF-17` → BF-15b PL (+6.3); BF-16a/17 unchanged (ventilated rigs).
- [ ] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "feat(7f): the chemoreflex set point rises in metabolic alkalosis (FU-9 F9)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

### Task A8: F11 — the brain follows a fall in plasma osmolality (7d brain + organ view; Part A)

**Files:**
- Modify: `packages/engine-core/src/l2/brain/params.ts` (`OSM_WATER_ML_PER_MOSM`), `packages/engine-core/src/l2/brain/model.ts`
  (import, `BrainInputs.osm`, `BrainState.osm0/osmWater`, `stepBrain`, `solve`'s fixed volume),
  `packages/engine-core/src/l2/organs/inputs.ts` (`OrganView.osm`, `BloodLike.out.osm`, `readOrganView`),
  `packages/engine-core/src/l2/organs/pipeline.ts` (`brainIn`, `nominalView`)
- Create: `packages/engine-core/test/l2/brain/fu9-osmolality.test.ts`, `test/engine/fu9-osmolality.test.ts` (SLOW_A)
- Overlap: none (A6 edits other lines of `organs/{inputs,pipeline}.ts`; apply in order).

**Why / measured (main):** research/22 F11 / BF-11b. 3 L of 1.5 % glycine: Na 119.5, osmolality 290 → 275, ICP +0.07 —
the brain read only mannitol/HTS doses. Decision D8.

**Prototype numbers:** engine test: brain water +1.73 mL, ΔICP max +0.24 (BF runner +0.33) → the report's dirOnly
"beyond +1 mmHg" is not reached → `it.fails` with +0.24 (Open question 8). Unit: −15 mOsm/kg → +2.15 mL in 30 min, ICP
+0.18; a rise adds nothing; without 7c `osmWater` stays undefined. **FU-4 check:** `organs-tbi-treatment` (mannitol/HTS
−25–29 %) passes; `audit:physiology` unchanged with A8 alone.

- [ ] **Step 1 — the tests.**

Create `packages/engine-core/test/l2/brain/fu9-osmolality.test.ts`:

```ts
// FU-9 Task A8 (F11): brain water follows a FALL in plasma effective osmolality (the osmotherapy calibration's gain).
import { describe, expect, it } from 'vitest';
import { NO_DRUGS } from '../../../src/l2/brain/flow.ts';
import { brainParams, createBrain, stepBrain, type BrainInputs } from '../../../src/l2/brain/model.ts';
import { OSM_WATER_ML_PER_MOSM } from '../../../src/l2/brain/params.ts';

const REST: BrainInputs = { map: 90, cvp: 6, paco2: 40, pao2: 100, sao2: 0.97, hb: 14, tempC: 37, drugs: NO_DRUGS, osm: 290 };
const run = (osm: number, secs: number) => {
  const b = createBrain(brainParams(), REST);
  for (let k = 0; k < 600; k++) stepBrain(b, REST, 0.1);
  const icp0 = b.icp;
  for (let k = 0; k < secs * 10; k++) stepBrain(b, { ...REST, osm }, 0.1);
  return { water: b.osmWater ?? 0, dIcp: b.icp - icp0 };
};

describe('FU-9 F11: hypo-osmolar brain swelling (Hahn 2006; Adrogué & Madias 2000)', () => {
  it('gain = the osmotherapy calibration (0.145 mL per mOsm/kg); −15 mOsm/kg → ≈ 2.2 mL in 30 min and ICP up; a rise adds nothing', () => {
    expect(OSM_WATER_ML_PER_MOSM).toBeCloseTo(0.1454, 3);
    const lo = run(275, 1800);
    console.log(`FU-9 F11 brain: osm −15 → water +${lo.water.toFixed(2)} mL, ICP +${lo.dIcp.toFixed(2)}`);
    expect(lo.water).toBeCloseTo(15 * OSM_WATER_ML_PER_MOSM, 1);
    expect(lo.dIcp).toBeGreaterThan(0);
    expect(run(305, 1800).water).toBe(0);
    const none = createBrain(brainParams(), { ...REST, osm: undefined });
    for (let k = 0; k < 600; k++) stepBrain(none, { ...REST, osm: undefined }, 0.1);
    expect(none.osmWater).toBeUndefined(); // without 7c nothing changes
  });
});
```

Create `packages/engine-core/test/engine/fu9-osmolality.test.ts`:

```ts
// FU-9 Task A8 (F11): the brain follows a fall in plasma osmolality (research/22 BF-11b). Rig = the BF runner's awake
// patient (TURP under spinal): 1.5 % glycine 3 L absorbed over 30 min from 300 s; read over 2.5 h against no absorption.
import { describe, expect, it } from 'vitest';
import { arm, ev, st } from '../helpers/fu9.ts';

describe('FU-9 F11: hypo-osmolar brain swelling (Hahn 2006; Adrogué & Madias 2000)', { timeout: 600_000 }, () => {
  it('glycine 3 L: Na ≈ 120, brain water gained and ICP above the control (was +0.07 max)', async () => {
    const at = Array.from({ length: 30 }, (_, k) => 300 + 300 * (k + 1));
    const read = (e: Parameters<typeof st>[0]) => {
      const o = (st(e) as unknown as { organs: { brain: { icp: number; osmWater?: number } } }).organs.brain;
      return { na: st(e).blood.out.na, osm: st(e).blood.out.osm, icp: o.icp, water: o.osmWater ?? 0 };
    };
    const i = await arm([[300, ev({ kind: 'fluid', fluid: 'glycine', volumeMl: 3000, overS: 1800 })]], at, read);
    const c = await arm([], at, read);
    const dIcp = Math.max(...i.map((r, k) => r.icp - (c[k]?.icp ?? r.icp)));
    const water = Math.max(...i.map((r) => r.water));
    console.log(`FU-9 F11: Na min ${Math.min(...i.map((r) => r.na)).toFixed(1)}, osm min ${Math.min(...i.map((r) => r.osm)).toFixed(1)}, brain water +${water.toFixed(2)} mL, ΔICP max +${dIcp.toFixed(2)}`);
    expect(water).toBeGreaterThan(1);
    expect(dIcp).toBeGreaterThan(0.2);
  });
  // R45 (research/22 BF-11b, dirOnly "beyond 1 mmHg"): the gain is the osmotherapy calibration's (0.145 mL per mOsm/kg);
  // an ideal-osmometer brain (≈ 1.1 L of water) would gain ≈ 55 mL for −15 mOsm/kg. Open question 8.
  it.fails('glycine 3 L: ICP ≥ 1 mmHg above the control — measured +0.24 (FU-9 F11)', async () => {
    const at = Array.from({ length: 30 }, (_, k) => 300 + 300 * (k + 1));
    const icp = (e: Parameters<typeof st>[0]) => (st(e) as unknown as { organs: { brain: { icp: number } } }).organs.brain.icp;
    const i = await arm([[300, ev({ kind: 'fluid', fluid: 'glycine', volumeMl: 3000, overS: 1800 })]], at, icp);
    const c = await arm([], at, icp);
    expect(Math.max(...i.map((v, k) => v - (c[k] ?? v)))).toBeGreaterThanOrEqual(1);
  });
});
```


- [ ] **Step 2 — run; they fail.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/brain/fu9-osmolality.test.ts test/engine/fu9-osmolality.test.ts` →
  `OSM_WATER_ML_PER_MOSM` missing; engine: brain water 0, ΔICP +0.07.
- [ ] **Step 3 — implement.**

In `packages/engine-core/src/l2/brain/params.ts`, find:

```ts
export const NACL_MOSM_PER_G = 2000 / 58.44; // 34.2 mOsm/g
```

replace with:

```ts
export const NACL_MOSM_PER_G = 2000 / 58.44; // 34.2 mOsm/g
/**
 * FU-9 F11: brain water follows a FALL in plasma effective osmolality (7c `blood.out.osm`) — acute hyponatraemia swells
 * the brain (Hahn 2006 BJA 96:8; Adrogué & Madias 2000 NEJM 342:1581). The gain is the osmotherapy calibration's own:
 * OSM_VMAX_ML × the saturation of 1 g/kg mannitol (384 mOsm, 0.885) ÷ its ECF rise (384 mOsm / 14 L = +27.4 mOsm/kg)
 * = 0.145 mL per mOsm/kg [ENG, derived]; it moves with HTS_TAU_IN_MIN (the barrier's water equilibration). Only the fall
 * is read: a rise from hypertonic saline is already the dose-driven osmotherapy term (no double count).
 */
export const OSM_WATER_ML_PER_MOSM = (OSM_VMAX_ML * (384 / (384 + OSM_K_MOSM))) / (384 / 14);
```

In `packages/engine-core/src/l2/brain/model.ts`, find:

```ts
  MMHG_PER_CM_BLOOD, OSM_K_MOSM, OSM_VMAX_ML, PACO2_ADAPT_TAU_S, PVI, R_OUT, TAU_VASC_S, TBI_AR_LOSS, TBI_ICP0_RISE, TBI_PVI_DROP, TBI_RESERVE_DROP,
```

replace with:

```ts
  MMHG_PER_CM_BLOOD, OSM_K_MOSM, OSM_VMAX_ML, OSM_WATER_ML_PER_MOSM, PACO2_ADAPT_TAU_S, PVI, R_OUT, TAU_VASC_S, TBI_AR_LOSS, TBI_ICP0_RISE, TBI_PVI_DROP, TBI_RESERVE_DROP,
```

find:

```ts
  drugs: BrainDrugs; // anaesthetic CMRO2 multiplier and direct vasodilation (organs/inputs.ts: 7f/7g, or the INTERIM fallback)
}
```

replace with:

```ts
  drugs: BrainDrugs; // anaesthetic CMRO2 multiplier and direct vasodilation (organs/inputs.ts: 7f/7g, or the INTERIM fallback)
  osm?: number | null; // FU-9 F11: 7c's plasma effective osmolality, mOsm/kg (absent/null without 7c)
}
```

find:

```ts
  osm: OsmDose[];
```

replace with:

```ts
  osm: OsmDose[];
  osm0?: number; // FU-9 F11: the patient's own resting plasma osmolality (latched on the first reading)
  osmWater?: number; // FU-9 F11: brain water gained from a fall in plasma osmolality, mL
```

find:

```ts
  const fixedV = b.mass + b.oedema - b.csfDisp - osmoticLoss(b.osm, b.t) - hu.volMl;
```

replace with:

```ts
  const fixedV = b.mass + b.oedema - b.csfDisp - osmoticLoss(b.osm, b.t) + (b.osmWater ?? 0) - hu.volMl;
```

find:

```ts
  b.paco2Ref += (inp.paco2 - b.paco2Ref) * (dt / PACO2_ADAPT_TAU_S);
```

replace with:

```ts
  b.paco2Ref += (inp.paco2 - b.paco2Ref) * (dt / PACO2_ADAPT_TAU_S);
  if (typeof inp.osm === 'number' && Number.isFinite(inp.osm) && inp.osm > 0) {
    // FU-9 F11: hypo-osmolar brain swelling (the fall only; osmotherapy's rise is the dose term)
    b.osm0 ??= inp.osm;
    const target = OSM_WATER_ML_PER_MOSM * Math.max(0, b.osm0 - inp.osm);
    b.osmWater = (b.osmWater ?? 0) + (target - (b.osmWater ?? 0)) * (1 - Math.exp(-dt / (HTS_TAU_IN_MIN * 60)));
  }
```

In `packages/engine-core/src/l2/organs/inputs.ts`, find:

```ts
  hb: number; albuminGL: number; bvRel: number;
```

replace with:

```ts
  hb: number; albuminGL: number; bvRel: number;
  osm: number | null; // FU-9 F11: 7c's plasma effective osmolality, mOsm/kg (null without 7c)
```

find:

```ts
  out?: { hb?: number; albuminGL?: number; bvRel?: number; hbfRel?: number; lactate?: number; gluconate?: number };
```

replace with:

```ts
  out?: { hb?: number; albuminGL?: number; bvRel?: number; hbfRel?: number; lactate?: number; gluconate?: number; osm?: number };
```

find:

```ts
    bvRel: num(out?.bvRel, bvFallback),
```

replace with:

```ts
    bvRel: num(out?.bvRel, bvFallback),
    osm: typeof out?.osm === 'number' && Number.isFinite(out.osm) && out.osm > 0 ? out.osm : null, // FU-9 F11
```

In `packages/engine-core/src/l2/organs/pipeline.ts`, find:

```ts
  map: v.map, cvp: v.cvp, paco2: v.paco2, pao2: v.pao2, sao2: v.sao2, hb: v.hb, tempC: v.tempC, drugs: brainDrugs(v),
});
```

replace with:

```ts
  map: v.map, cvp: v.cvp, paco2: v.paco2, pao2: v.pao2, sao2: v.sao2, hb: v.hb, tempC: v.tempC, drugs: brainDrugs(v), osm: v.osm, // FU-9 F11
});
```

find:

```ts
    tempC: l1Target(l1, 'tempCore', 0), hb: 14, albuminGL: 42, bvRel: 1, hbfRel: null, lactate: null, gluconate: 0, anaesthesia: 'none',
```

replace with:

```ts
    tempC: l1Target(l1, 'tempCore', 0), hb: 14, albuminGL: 42, bvRel: 1, osm: null, hbfRel: null, lactate: null, gluconate: 0, anaesthesia: 'none',
```


- [ ] **Step 4 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/brain test/l2/organs test/engine/fu9-osmolality.test.ts test/engine/organs-tbi.test.ts
  test/engine/organs-tbi-treatment.test.ts` → pass.
- [ ] **Step 5 — BF runner:** `BF-11 BF-12` → BF-11b dIcpMax +0.33 (TW, dirOnly), BF-11a PL, BF-12 (see the results
  table: F1 moves it).
- [ ] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "feat(7d): hypo-osmolar brain swelling from 7c plasma osmolality (FU-9 F11)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

## Part B — after FU-7 merges

### Task B0: Part B base — FU-7 merged

- [ ] **Step 1.** `git fetch origin && git log --oneline origin/main | head` — FU-7's merge commit must be on main (and
  therefore FU-6's). If not, stop Part B (Global Constraints: Part A's Gate runs alone).
- [ ] **Step 2.** `git merge origin/main` (no stash; resolve by content).
- [ ] **Step 3 — Part B anchors.** Each must print exactly ONE line (the writer checked all of them on `76c952e` and
  against FU-7's Task 14 / E-FU7-7 blocks):

```
git grep -n -F "  return { rocuronium: nd, vecuronium: nd, cisatracurium: nd, succinylcholine: dep };" -- packages/engine-core/src/l2/neuro/interactions.ts
git grep -n -F "import { ec50Multipliers, type NmProfile } from './interactions.ts';" -- packages/engine-core/src/l2/neuro/pipeline.ts
git grep -n -F "  const neo = neoEc50Mult(x.achGain);" -- packages/engine-core/src/l2/neuro/pipeline.ts
git grep -n -F "      tempC: ps.resp.temp.tc, mechanical: src7f === 'ventilator'" -- packages/engine-core/src/engine.ts
git grep -n -F "export const PACO2_REST_MMHG = 40;" -- packages/engine-core/src/l2/gas/params.ts
git grep -n -F "    paco2Rest: PACO2_REST_MMHG, // FU-4 F4 / R1(a)" -- packages/engine-core/src/l2/gas/params.ts
git grep -n -F "  const core = createBloodCore(profile, CI_LPM_PER_KG * gasPatient(profile).effKg, NORMAL.paco2);" -- packages/engine-core/src/l2/blood/pipeline.ts
git grep -n -F "  const ph0 = 6.1 + Math.log10(hco3 / (0.0307 * NORMAL.paco2));" -- packages/engine-core/src/l2/blood/core.ts
```

  (`NeuroEnv`'s `  tempC: number;\n  mechanical: boolean;` pair is checked by eye.) A miss means FU-6/FU-7 moved the line:
  re-anchor by the quoted statement, never re-type a line you are not changing.

### Task B1: F10 — hypokalaemia potentiates the non-depolarisers (7f `interactions.ts`; Part B)

**Files:**
- Modify: `packages/engine-core/src/l2/neuro/interactions.ts` (`HYPOK_*`, `hypokalaemiaMult`, appended after
  `ec50Multipliers`), `packages/engine-core/src/l2/neuro/pipeline.ts` (import, `NeuroEnv.kMmolL`, the `neo` line),
  `packages/engine-core/src/engine.ts` (the `stepNeuroTo` context's `tempC:` line — **E-FU9-2**)
- Create: `packages/engine-core/test/l2/neuro/fu9-hypokalaemia.test.ts`, `test/engine/fu9-rocuronium.test.ts` (SLOW_A)
- Overlap: FU-7 Task 14 rewrites `InteractionCtx` and the top of `ec50Multipliers`, the `ec50Multipliers(…)` call line and
  adds `mgMmolL/iCaMmolL` to the engine's neuro context on the line AFTER `macF`. This task's blocks are the function's
  last two lines, the import, `NeuroEnv`'s first field pair, the `neo` line and the context's FIRST line — none of FU-7's
  (checked against its Task 14 and E-FU7-7 blocks), so they match main and main + FU-7. Part B only so FU-7's
  one-state-per-mechanism change (R51 addendum 24) lands first.

**Why / measured (main):** research/22 F10 / BF-09b. Rocuronium 0.6 mg/kg: T1 25 % at 35.7 min at K 2.5 and at 4.2. FU-7
routes Mg and iCa from 7c into the NMB PD but no K (checked). Decision D10.

**Prototype numbers:** engine test T1 25 % at 46.8 min (K 2.5) vs 35.8 (K 4.2): +11.0 min (Open question 9: the size is
[ENG]).
**FU-4 check:** K ≥ 3.5 is exactly × 1 (every existing NMB test unchanged: `test/l2/neuro` passes).

- [ ] **Step 0 — merge.** `git fetch origin && git merge origin/main` (Task B0 has done it; re-check `git log --oneline -1 origin/main`).
- [ ] **Step 1 — the tests.**

Create `packages/engine-core/test/l2/neuro/fu9-hypokalaemia.test.ts`:

```ts
// FU-9 Task B1 (F10): hypokalaemia potentiates the non-depolarisers through 7c's plasma K.
import { describe, expect, it } from 'vitest';
import { HYPOK_FLOOR, hypokalaemiaMult } from '../../../src/l2/neuro/interactions.ts';

describe('FU-9 F10: hypokalaemic potentiation of non-depolarising block (Miller 10e ch. 27)', () => {
  it('EC50 × 1 at K ≥ 3.5 and without 7c; × 0.85 at 2.5; floored', () => {
    expect(hypokalaemiaMult(undefined)).toBe(1);
    expect(hypokalaemiaMult(4.2)).toBe(1);
    expect(hypokalaemiaMult(3.5)).toBe(1);
    expect(hypokalaemiaMult(2.5)).toBeCloseTo(0.85, 9);
    expect(hypokalaemiaMult(0.5)).toBe(HYPOK_FLOOR);
  });
});
```

Create `packages/engine-core/test/engine/fu9-rocuronium.test.ts`:

```ts
// FU-9 Task B1 (F10): hypokalaemia prolongs rocuronium (research/22 BF-09b). Rig = the BF runner's GA vent, profile K 2.5
// vs 4.2; rocuronium 0.6 mg/kg at 300 s; the time from the dose to T1 back at 25 % (7f's truth TOF).
import { describe, expect, it } from 'vitest';
import { arm, ev, GA_VENT, MAN, st } from '../helpers/fu9.ts';

const t25 = async (k: number): Promise<number> => {
  const at = Array.from({ length: 360 }, (_, i) => 600 + 10 * i); // 5–65 min after the dose, every 10 s
  const t1 = await arm([...GA_VENT, [300, ev({ kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg', route: 'iv' })]], at,
    (e) => (st(e) as unknown as { neuro: { last: { tof: { t1: number } } } }).neuro.last.tof.t1, { ...MAN, blood: { k } });
  const i = t1.findIndex((v) => v >= 0.25);
  return i < 0 ? Number.POSITIVE_INFINITY : ((at[i] as number) - 300) / 60;
};

describe('FU-9 F10: hypokalaemia prolongs a non-depolarising block', { timeout: 600_000 }, () => {
  it('rocuronium 0.6 mg/kg: T1 25 % later at K 2.5 than at 4.2 by ≥ 1 min (was identical, 35.7 min)', async () => {
    const lo = await t25(2.5);
    const n = await t25(4.2);
    console.log(`FU-9 F10: T1 25 % at ${lo.toFixed(1)} min (K 2.5) vs ${n.toFixed(1)} min (K 4.2)`);
    expect(lo - n).toBeGreaterThanOrEqual(1);
  });
});
```


- [ ] **Step 2 — run; they fail.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/neuro/fu9-hypokalaemia.test.ts test/engine/fu9-rocuronium.test.ts` →
  `hypokalaemiaMult` missing; engine: 35.7 vs 35.7 min.
- [ ] **Step 3 — implement.**

In `packages/engine-core/src/l2/neuro/interactions.ts`, find:

```ts
  return { rocuronium: nd, vecuronium: nd, cisatracurium: nd, succinylcholine: dep };
}
```

replace with:

```ts
  return { rocuronium: nd, vecuronium: nd, cisatracurium: nd, succinylcholine: dep };
}

/**
 * FU-9 F10: hypokalaemia potentiates a non-depolarising block — the hyperpolarised end-plate needs less antagonist to
 * fail (Miller 10e ch. 27, "hypokalaemia enhances non-depolarising block"; Feldman 1963) — read from 7c's plasma K (ONE
 * state, as FU-7 makes Mg and Ca). EC50 × (1 − HYPOK_SLOPE·(HYPOK_K − K)⁺), floor HYPOK_FLOOR [ENG size, Open question 9];
 * 1 at K ≥ 3.5 and without 7c.
 */
export const HYPOK_K = 3.5;
export const HYPOK_SLOPE = 0.15;
export const HYPOK_FLOOR = 0.7;
export function hypokalaemiaMult(kMmolL: number | undefined): number {
  return kMmolL === undefined ? 1 : Math.max(HYPOK_FLOOR, 1 - HYPOK_SLOPE * Math.max(0, HYPOK_K - kMmolL));
}
```

In `packages/engine-core/src/l2/neuro/pipeline.ts`, find:

```ts
import { ec50Multipliers, type NmProfile } from './interactions.ts';
```

replace with:

```ts
import { ec50Multipliers, hypokalaemiaMult, type NmProfile } from './interactions.ts';
```

find:

```ts
  tempC: number;
  mechanical: boolean;
```

replace with:

```ts
  tempC: number;
  /** FU-9 F10: 7c's plasma K (`blood.out.k`, mmol/L); undefined without 7c (no hypokalaemic potentiation). */
  kMmolL?: number;
  mechanical: boolean;
```

find:

```ts
  const neo = neoEc50Mult(x.achGain);
  const mult: Record<NmbAgent, number> = { rocuronium: m.rocuronium * neo, vecuronium: m.vecuronium * neo, cisatracurium: m.cisatracurium * neo, succinylcholine: m.succinylcholine };
```

replace with:

```ts
  const neo = neoEc50Mult(x.achGain) * hypokalaemiaMult(env.kMmolL); // FU-9 F10: hypokalaemia on the non-depolarisers
  const mult: Record<NmbAgent, number> = { rocuronium: m.rocuronium * neo, vecuronium: m.vecuronium * neo, cisatracurium: m.cisatracurium * neo, succinylcholine: m.succinylcholine };
```

In `packages/engine-core/src/engine.ts`, find:

```ts
      tempC: ps.resp.temp.tc, mechanical: src7f === 'ventilator' || src7f === 'external' || src7f === 'bvm',
```

replace with:

```ts
      tempC: ps.resp.temp.tc, kMmolL: ps.blood.out.k > 0 ? ps.blood.out.k : undefined, mechanical: src7f === 'ventilator' || src7f === 'external' || src7f === 'bvm', // FU-9 F10: 7c's K (0 before its first step)
```


- [ ] **Step 4 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/neuro test/engine/fu9-rocuronium.test.ts test/engine/neuro-engine.test.ts` → pass.
- [ ] **Step 5 — BF runner:** `BF-09b` → dMin ≈ +11 (PL direction; the results table has the exact value).
- [ ] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "feat(7f): hypokalaemia potentiates non-depolarising block from 7c plasma K (FU-9 F10, E-FU9-2)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

### Task B2: F7 — a COPD retainer starts hypercapnic with its chronic renal compensation (gas profile + 7c; Part B)

**Files:**
- Modify: `packages/engine-core/src/l2/gas/params.ts` (**E-FU9-3**: `COPD_PACO2_REST`, `restingPaco2`, the `paco2Rest:` line
  of `gasPatient`), `packages/engine-core/src/l2/blood/pipeline.ts` (`createBloodState`), `packages/engine-core/src/l2/blood/core.ts`
  (`CHRONIC_HCO3_PER_MMHG`, the HCO₃/pH₀ lines of `createBloodCore`)
- Create: `packages/engine-core/test/l2/blood/fu9-chronic.test.ts`, `test/engine/fu9-copd.test.ts` (SLOW_A)
- Overlap: FU-6 adds pregnancy constants to `gas/params.ts` (other lines) and routes pregnancy through `setShift`, not
  `paco2Rest`; 7k reads COPD volumes, not PaCO₂. The `paco2Rest:` line and `PACO2_REST_MMHG` appear in no other plan's
  blocks. Part B because `l2/gas/**` is FU-6/7k's while in flight.

**Why / measured (main):** research/22 F7 / BF-16b and research/19 C7 / CM-07a. Since FU-4 F4 (R1(a)) every MODELED patient
rests at PaCO₂ 40, so COPD GOLD 3 is now normocapnic (39.7, HCO₃ 24.35); the report's run (before FU-4) had 45.1 with an
acute-buffer HCO₃ 25.0. CM routed C7 to FU-6, whose plan does not carry it. Decision D9.

**Prototype numbers:** COPD GOLD 3 awake: PaCO₂ **44.1**, HCO₃ 26.02, pH 7.383, +3.41 mmol/L per 10 mmHg (band 3–4.5);
X-A 39.0/24.26 unchanged. **FU-4 check:** no COPD row in `audit:physiology`; `lung-copd`, `resp-coupling` and the 7b COPD
tests to be run (Step 4).

- [ ] **Step 1 — the tests.**

Create `packages/engine-core/test/l2/blood/fu9-chronic.test.ts`:

```ts
// FU-9 Task B2 (F7): a COPD retainer starts at its own resting PaCO2 with its chronic renal compensation.
import { describe, expect, it } from 'vitest';
import { CHRONIC_HCO3_PER_MMHG, createBloodCore } from '../../../src/l2/blood/core.ts';
import { gasPatient, PACO2_REST_MMHG, restingPaco2 } from '../../../src/l2/gas/params.ts';

const MAN = { ageY: 65, sex: 'M' as const, weightKg: 70, heightCm: 175 };
const copd = (severity: number) => ({ ...MAN, lungConditions: [{ id: 'copd' as const, severity }] });

describe('FU-9 F7: chronic hypercapnia (tables §1.5, §5b.1; Brackett 1965)', () => {
  it('resting PaCO2 by GOLD grade 40 / 40 / 45 / 55; a healthy patient 40', () => {
    expect(restingPaco2(MAN)).toBe(PACO2_REST_MMHG);
    expect(restingPaco2(copd(0.25))).toBe(40);
    expect(restingPaco2(copd(0.5))).toBe(40);
    expect(restingPaco2(copd(0.75))).toBeCloseTo(45, 9);
    expect(restingPaco2(copd(1))).toBeCloseTo(55, 9);
    expect(gasPatient(copd(0.75)).paco2Rest).toBeCloseTo(45, 9);
  });
  it('GOLD 3 at PaCO2 45: HCO3 +3.5 per 10 mmHg (26.15), pH ≥ 7.37; a profile HCO3 is honoured', () => {
    const c = createBloodCore(copd(0.75), 5.25, 45);
    expect(CHRONIC_HCO3_PER_MMHG).toBe(0.35);
    expect(c.ab.hco3).toBeCloseTo(24.4 + 0.35 * 5, 1);
    expect(c.ab.ph).toBeGreaterThanOrEqual(7.37);
    expect(createBloodCore({ ...copd(0.75), blood: { hco3: 30 } }, 5.25, 45).ab.hco3).toBeCloseTo(30, 1);
    expect(createBloodCore(MAN, 5.25, 40).ab.hco3).toBeCloseTo(24.4, 2);
  });
});
```

Create `packages/engine-core/test/engine/fu9-copd.test.ts`:

```ts
// FU-9 Task B2 (F7): COPD GOLD 3 is a compensated retainer (research/22 BF-16b; research/19 CM-07a). Rig = the BF runner's
// awake, spontaneously breathing room-air patient (MODELED) with lung `copd` 0.75, read at 30 min against X-A.
import { describe, expect, it } from 'vitest';
import { arm, MAN, st } from '../helpers/fu9.ts';

describe('FU-9 F7: chronic hypercapnia with chronic renal compensation (tables §1.5; Brackett 1965)', { timeout: 300_000 }, () => {
  it('COPD GOLD 3: PaCO2 43–52 (was 39.7), HCO3 +3 to +4.5 per 10 mmHg above X-A (was +1.3), pH 7.35–7.45', async () => {
    const read = (e: Parameters<typeof st>[0]) => ({ paco2: st(e).resp.co2.pf, hco3: st(e).blood.core.ab.hco3, ph: st(e).blood.core.ab.ph });
    const [c] = await arm([], [1800], read, { ...MAN, lungConditions: [{ id: 'copd', severity: 0.75 }] });
    const [n] = await arm([], [1800], read);
    if (!c || !n) throw new Error('no sample');
    const per10 = (10 * (c.hco3 - n.hco3)) / (c.paco2 - n.paco2);
    console.log(`FU-9 F7: COPD PaCO2 ${c.paco2.toFixed(1)} HCO3 ${c.hco3.toFixed(2)} pH ${c.ph.toFixed(3)}; X-A ${n.paco2.toFixed(1)} / ${n.hco3.toFixed(2)} → ${per10.toFixed(2)} per 10 mmHg`);
    expect(c.paco2).toBeGreaterThanOrEqual(43);
    expect(c.paco2).toBeLessThanOrEqual(52);
    expect(per10).toBeGreaterThanOrEqual(3);
    expect(per10).toBeLessThanOrEqual(4.5);
    expect(c.ph).toBeGreaterThanOrEqual(7.35);
    expect(c.ph).toBeLessThanOrEqual(7.45);
  });
});
```


- [ ] **Step 2 — run; they fail.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/fu9-chronic.test.ts test/engine/fu9-copd.test.ts` → `restingPaco2`
  missing; engine PaCO₂ 39.7.
- [ ] **Step 3 — implement.**

In `packages/engine-core/src/l2/gas/params.ts`, find:

```ts
/** FU-4 F4 / R1(a): the healthy resting PaCO2 every profile starts from (pregnancy 31 under R10). */
export const PACO2_REST_MMHG = 40;
```

replace with:

```ts
/** FU-4 F4 / R1(a): the healthy resting PaCO2 every profile starts from (pregnancy 31 under R10). */
export const PACO2_REST_MMHG = 40;
/**
 * FU-9 F7 (research/22 BF-16b, research/19 C7): a chronic retainer's own resting PaCO2 — tables §1.5 COPD `paco2Set`
 * 40 / 40 / 45 / 55 mmHg at GOLD 1–4 (lung `copd` severity 0.25 / 0.5 / 0.75 / 1, linear between) [TXT]. It is the
 * MODELED drive's set point and the gas compartments' start (as PACO2_REST_MMHG is), and 7c builds the profile's chronic
 * renal compensation on it (blood/pipeline.ts createBloodState).
 */
export const COPD_PACO2_REST: readonly (readonly [number, number])[] = [[0.5, 40], [0.75, 45], [1, 55]];
export function restingPaco2(p: PatientProfile | undefined): number {
  const s = Math.min(1, Math.max(0, p?.lungConditions?.find((c) => c.id === 'copd')?.severity ?? 0));
  const k = COPD_PACO2_REST;
  for (let i = 1; i < k.length; i++) {
    const [x0, y0] = k[i - 1] as readonly [number, number];
    const [x1, y1] = k[i] as readonly [number, number];
    if (s <= x1) return s <= x0 ? PACO2_REST_MMHG : y0 + ((s - x0) / (x1 - x0)) * (y1 - y0);
  }
  return (k[k.length - 1] as readonly [number, number])[1];
}
```

find:

```ts
    paco2Rest: PACO2_REST_MMHG, // FU-4 F4 / R1(a) (pregnancy 31 when R10 lands)
```

replace with:

```ts
    paco2Rest: restingPaco2(p), // FU-4 F4 / R1(a) (pregnancy 31 when R10 lands); FU-9 F7: a COPD retainer's own set point
```

In `packages/engine-core/src/l2/blood/pipeline.ts`, find:

```ts
  const core = createBloodCore(profile, CI_LPM_PER_KG * gasPatient(profile).effKg, NORMAL.paco2);
```

replace with:

```ts
  const gp = gasPatient(profile);
  const core = createBloodCore(profile, CI_LPM_PER_KG * gp.effKg, gp.paco2Rest); // FU-9 F7: the patient's own resting PaCO2
```

In `packages/engine-core/src/l2/blood/core.ts`, find:

```ts
  const hco3 = b.hco3 ?? NORMAL.hco3;
  const ph0 = 6.1 + Math.log10(hco3 / (0.0307 * NORMAL.paco2));
```

replace with:

```ts
  // FU-9 F7: a chronic hypercapnic profile (resting PaCO2 above 40) starts with its chronic renal compensation, +0.35
  // mmol/L HCO3 per mmHg (tables §5b.1 "chronic (profile only): +0.35–0.4 per mmHg … set by the profile"; Brackett 1965,
  // Schwartz 1965), calibrated at that PaCO2; a given profile HCO3 is honoured
  const hco3 = b.hco3 ?? NORMAL.hco3 + CHRONIC_HCO3_PER_MMHG * Math.max(0, paco2 - NORMAL.paco2);
  const ph0 = 6.1 + Math.log10(hco3 / (0.0307 * Math.max(NORMAL.paco2, paco2)));
```

find:

```ts
/** Established DKA: ketoacid anions 25 mmol/L at `condition dka` severity 1 [ENG]; the scale of `out.dkaSeverity` (R51 addendum 16). */
```

replace with:

```ts
/** FU-9 F7: chronic renal compensation of a chronic hypercapnia, mmol/L HCO3 per mmHg PaCO2 above 40 (tables §5b.1). */
export const CHRONIC_HCO3_PER_MMHG = 0.35;

/** Established DKA: ketoacid anions 25 mmol/L at `condition dka` severity 1 [ENG]; the scale of `out.dkaSeverity` (R51 addendum 16). */
```


- [ ] **Step 4 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood test/l2/gas test/l2/resp test/l2/lung test/engine/fu9-copd.test.ts
  test/engine/lung-copd.test.ts test/engine/resp-coupling.test.ts` → pass; if a 7b/Stage 3 COPD test pinned a resting
  PaCO₂ of 40 for GOLD 3, it is re-pinned to the tables' 45 with the reason (tables §1.5), never widened.
- [ ] **Step 5 — BF runner:** `BF-16b BF-15b` → BF-16b PL (+3.4 per 10 mmHg); BF-15b unchanged.
- [ ] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "feat(7b-profile,7c): COPD retainers rest at their tables PaCO2 with chronic renal compensation (FU-9 F7, E-FU9-3)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

## Gate

### Task G: Gate — full verification, the BF matrix before → after, the FU-4 check, gate note, pull request

**Files:** Create `docs/gates/fu-9.md`; tick this plan's boxes.

- [ ] **Step 1 — merge.** `git fetch origin && git merge origin/main`, then `npx -y pnpm@9.15.9 install --frozen-lockfile`.
- [ ] **Step 2 — suites** (bounded waits; logs under `<scratchpad>/fu-9-blood-fluids/`):

```
npx -y pnpm@9.15.9 -r typecheck
CI=1 PME_TEST_SET=fast npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run
CI=1 PME_TEST_SET=slow-a npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run     # time it: FU-9 adds ≈ 10 min
CI=1 PME_TEST_SET=slow-b npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run     # time it: FU-9 adds nothing
CI=1 npx -y pnpm@9.15.9 --filter '!@pme/engine-core' -r test
npx -y pnpm@9.15.9 build && CI=1 npx -y pnpm@9.15.9 test:e2e --project=chromium               # no UI change: regression only
```

  Expected: all pass; `it.fails` added by FU-9 (Part A: 5 — kinetics RBC, core iCa rule, leak vs healthy, furosemide
  size, glycine ICP; Part B: 0) hold. `CI=1 PME_TEST_SET=slow-b … vitest list | grep -c fu9` prints 0 (SLOW_A only).
  Record both slow groups' wall times (slow-b was 37.6 of 40 min at the FU-4 gate; FU-9 must leave it unchanged).
- [ ] **Step 3 — the BF matrix after.** In `<scratchpad>/fu-9-blood-fluids/bf`: `PME_ENGINE=<worktree>/packages/engine-core/src/index.ts
  BF_OUT=out/after.json node --import ./hooks.mjs --experimental-strip-types cli.ts all`; then
  `cp out/after.json out/cells.json && node --experimental-strip-types report.ts > out/matrix-after.md` (and the same for
  before.json). Expected: the "Prototype results" table below, cell for cell (seed 7).
- [ ] **Step 4 — FU-4's arrest behaviour.** `PME_AUDIT_OUT=<scratchpad>/fu-9-blood-fluids/audit-after npx -y pnpm@9.15.9
  run audit:physiology > <scratchpad>/fu-9-blood-fluids/audit-after.md`; `diff` the "## Arrests" and "## Propofol" tables
  with Task A0 Step 4. Expected (prototype): identical except D0 1775 → 1770 s, D2 1350 → 1310 s, K-ptx 670 → 675 s
  (chaotic rows, D13), F2's minimum HR 61 → 59, and the propofol matrix's septic-shock row (A4: CO 5.22 → 5.09, nadir
  85 → 65 s, ΔHR −59 → −46, MAP −31.2 → −31.3 %; no arrest) and tension-PTX row (asystole t+10 → t+15 s). Any OTHER
  moved row stops the gate: report it with the task that moves it (`git stash` is forbidden — bisect by reverting single
  commits in a scratch worktree).
- [ ] **Step 5 — gate note `docs/gates/fu-9.md`:** (1) scope and the inventory's decisions; (2) the BF before → after
  table (Step 3) with verdicts; (3) the `it.fails` list with numbers; (4) the audit diff (Step 4) and D13's chaos
  demonstration; (5) suites and slow-group times; (6) exceptions E-FU9-1..3 as applied; (7) the Requests and Open
  questions of this plan, unchanged unless the executor measured a different number.
- [ ] **Step 6 — PR** (never merged by the executor):

```
git add docs/gates/fu-9.md docs/plans/fu-9-blood-fluids.md && git commit -m "docs(gate): FU-9 gate note" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
gh pr create --base main --head fu-9-blood-fluids --title "FU-9: blood, fluids and acid–base integration" --body-file <scratchpad>/fu-9-blood-fluids/pr-body.md
```

  The body summarises the gate note (findings → mechanisms → before/after), lists the `it.fails` and the FU-4 audit diff,
  and ends with the line `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. If Part B has not run, the title
  ends " (Part A)" and the body says Part B waits on FU-7.

---

## Open questions for Ali (the model's numbers and the plan's recommendation; the plan does not wait on them)

1. **SvO₂ at normal flow under GA on FiO₂ 0.5 (BF-29b's normal arm).** 85.7 % against research/12's 70–85 % "under GA".
   The high value is GA's VO₂ (−15 %) plus dissolved O₂ at PaO₂ ≈ 250; F3 does not change it (85.7 before and after).
   *Recommendation:* the band applies to FiO₂ ≤ 0.4; keep the model (no mechanism defect).
2. **Stored-blood acid and the product compositions (F5).** The report proposed adding supernatant lactate (≈ storage
   days / 2 mmol/L [VERIFY]); the plan did not, because citrate in the SID and a flow-linear clearance already give the
   class IV + MTP picture (BE −10.9, lactate 7.5, iCa 0.72) and the value is unsourced. The composition rows themselves
   are not electroneutral once citrate is an anion (RBC: Na 150, Cl 150, citrate 55.7 mmol/L → an apparent SID of −167
   mEq/L; FFP −93 mEq/L), which is why 4 FFP in 10 min dip BE −2.4 before the late alkalosis (+1.3 at 60 min).
   *Recommendation:* in the calibration pass, give the RBC and FFP rows their measured Na/Cl/citrate (SAGM RBC carry far
   less citrate than whole blood); the mechanism stays.
3. **Septic capillary leak (F4) and the transient MAP gain (BF-20b).** With σ = 1 − 0.1·kfMult the septic lung makes
   water (+1.18 mL/kg) but less than a healthy lung under the same 30 mL/kg (+2.57: the septic PAWP stays lower), and the
   MAP gain is still ≈ 100 % of its peak at 60 min (Glassford 2014: it dissipates). *Recommendation:* keep the two-pore
   form (no invented per-grade σ); if you want septic lungs to flood at a normal PAWP, the lever is a lower `σ` floor for
   septic shock (a sourced value is needed) — the MAP persistence is the vasoplegic circulation's, not the blood's.
4. **5 % albumin on the Landis curve (F8).** With the globulins as their own mass, 5 % albumin (TP 50 g/L, no globulins)
   is slightly hypo-oncotic: BF-03a's volume effect at 60 min 0.93 → 0.75 (band 0.7–1, still plausible). Nitta's
   separate albumin/globulin polynomials would keep albumin fully oncotic but move the normal COP 22.4 → 17.8 mmHg and
   every lung-water threshold with it. *Recommendation:* keep Landis (normal physiology bit-identical).
5. **Kaliuresis size (F6, BF-08d, a direction-only cell).** Furosemide 40 mg at K 7.5 under GA: −0.042 mmol/L at 3 h
   (was −0.002): the GA diuresis is small (+150 mL/h at the peak), the kaliuresis ≈ 10 mmol against the untreated
   patient's retention, and 300 mmol of total-body K per mmol/L (Sterns 1981) spreads it. *Recommendation:* band −0.02 to
   −0.10 at 3 h under GA (the `it.fails` "≥ 0.1" then flips to a band test); UK RA 2023 does not use furosemide as an
   acute K-lowering therapy.
6. **An alkali-loss event (BF-15a, NE).** The report routed "vomiting / NG loss" to FU-7; FU-7's plan does not carry it.
   The smallest form is 7c's existing `metabolic` event with a negative `acidMmol` (HCl lost: `so.cl −= mmol`), one
   validator range and one line. *Recommendation:* add it in v1.0 as a one-line FU-9 follow-up if you teach pyloric
   stenosis/NG losses; F9 then compensates it by construction.
7. **K⁺ 8.5 without an arrhythmia (BF-07c, FU-4 G3's hazard).** Profile or acute K 8.5 (QRS 260/248 ms, a sine wave) stays
   in sinus at MAP 92 for 15 min (seed 7); K 9.5 fibrillates at 65 s. Is "K ≥ 8–9: VF/asystole/block" (UK RA 2023, ERC
   2021) expected within 15 min at 8.5? *Recommendation:* calibration question for FU-4's `K_HAZARD` (not FU-9's).
8. **Hyponatraemic brain swelling size (F11).** Na 119.5 (osm −15): brain water +1.7–2.2 mL, ICP +0.24–0.33 mmHg with the
   osmotherapy-consistent gain 0.145 mL per mOsm/kg; an ideal-osmometer brain (≈ 1.1 L of water) would gain ≈ 55 mL.
   *Recommendation:* keep the gain that makes osmotherapy and hypo-osmolality one calibration; if TURP-syndrome CNS signs
   should show on the ICP, the question is the osmotherapy fit itself (7d's OSM_VMAX_ML 4.5 mL).
9. **Hypokalaemic NMB potentiation size (F10).** EC50 × 0.85 at K 2.5 → rocuronium T1 25 % 35.8 → 46.8 min (+31 %) on the
   steep Hill. *Recommendation:* accept the direction; the size is [ENG] (halving
   the slope gives ≈ +15 %).
10. **Saline acidosis magnitude (BF-01a, BF-14; annex D3 `it.fails` in 7c since Stage 7c).** 2 L: Cl +5.2, BE −0.6; 5 L:
    Cl +11.2, BE −3.0 (Scheingraber: ≈ −7). The albumin dilution's Figge alkalosis offsets the chloride (Stewart) and
    7d's urine (Na 100, K 50, Cl 0.9·(Na + K) [ENG]) removes a low-SID fluid. F1 makes the kidney excrete more of the load,
    so both move slightly (BF-14 −3.29 → −3.03; BF-12's hypertonic-saline Na +6.92 → +7.08 against a 4–7 band, because the
    urine Na is 100). *Recommendation:* the calibration pass should decide 7d's urine composition for an expansion
    diuresis (natriuretic: Na ≈ plasma) — that single change is expected to fix BF-12 and part of BF-01a/14.
11. **1 u RBC under GA (F1, BF-04).** Hb +0.66 at 1 h and +0.74 at 4 h (band 0.7–1.3 for an equilibrated awake adult;
    Wiesen 1994). Under GA the kidney keeps most of the unit's plasma for hours (Hahn). *Recommendation:* read the band at
    24 h or awake; the `it.fails` records it.

## Requests (handed to other owners; nothing here is FU-9's to change)

- **R-FU9-1 → the FU-4 follow-up owner (orchestrator to route; FU-8 collects loose ends):** (a) DV-25b — a sinus rhythm
  forced after the shock in treated hyperkalaemia (kEcg 7.4, contractility back to 1.0) dips into PEA at +100 s and
  regains a pulse under CPR at +185 s: post-arrest ischaemic contractility, not the K treatment (D12); (b) BF-10a —
  hypomagnesaemic torsades converted by MgSO₄ at 470 s becomes asystole at 495 s (after 165 s pulseless).
- **R-FU9-2 → FU-7 Task 12:** DV-25a's K-blind shock table is already in its scope (`kEcg` factor); nothing added. The
  hyperkalaemia TREATMENT time courses are 7c curves (insulin, the calcium membrane term) and 7g's `kShift` (salbutamol);
  all measured in band (D12) — no drug-layer request.
- **R-FU9-3 → the 7b owner (FU-6 follow-up):** F13a — lung water barely reaches gas exchange: HFrEF + 1.5 L gives extra
  EVLWI +3.4–5.6 mL/kg and SpO₂ 96 → 94–96 (tables 89–92); septic lung water +1.2 mL/kg with PaO₂ RISING +13.
- **R-FU9-4 → orchestrator:** the massive-PE (D0, D2) and tension-PTX (K-ptx) arrest times are chaotic at the
  10⁻⁵ mmHg level (D13) — a ±40 s move there is noise, for FU-4's "arrest times unchanged" gate criterion and any later
  gate.
- **R-FU9-5 → FU-6 executor:** Task A7 and FU-6 Task 13 edit the same `s.paco2Set = paco2SetPoint(…)` line; the merged
  line is given in Task A7.
- **R-FU9-6 → Stage 9 (glossary, R56):** new engine state keys `blood.core.fl.globG` (plasma globulins, g),
  `blood.core.so.set.kIcf` (cellular K pool at rest, mmol), `organs.brain.osmWater` / `osm0` (brain water from a fall in
  plasma osmolality, mL; resting osmolality) and the exported constants; no display label is added by FU-9.
- **R-FU9-7 → FU-8:** FU-9 does not touch obesity (FU-8 I-51) or profile/set-point consistency (I-52); its F7 sets only the
  COPD grade's resting PaCO₂ from tables §1.5 (a chronic-disease set point, not a haemodynamic target).

## Self-review (plan writer, 2026-09-29)

- **Spec coverage.** F1 → A1; F2 → closed by FU-4 G3 (D11, measured); F3 → A2; F4 → A4; F5 → A3; F6 → A6; F7 → B2;
  F8 → A5; F9 → A7; F10 → B1; F11 → A8; F12 (R11, FU-4 G3) and F13 (7b coupling, protein binding, alkali loss, methylene
  blue) → inventory with owners; the 17 coagulation NE cells → 7i v1.1 (R58/R60); the orchestrator's DV-25b input → D12
  (measured; no FU-9 task; Requests R-FU9-1/2). Every task measured its cells before designing (inventory "main" column)
  and after (results table). No existing band widened; five new `it.fails` carry their numbers (A1 RBC +0.66, A3 iCa rule
  1.090, A4 septic-vs-healthy +1.18/+2.57 and PaO₂ +13, A6 furosemide −0.042, A8 ICP +0.24); one existing test split
  under a declared exception (E-FU9-1).
- **Mechanical find-block check** (`<scratchpad>/fu-9/plan/check_plan.py`, run on this document as written): it parses
  every `find:` / `replace with:` / `Create` block in document order and applies them to `origin/main` `76c952e`:
  **60 find/replace blocks + 20 creates, 0 problems — every find occurs exactly once on `76c952e` and exactly once in the
  applied state at its turn; the applied tree is byte-identical to the prototype worktree (Parts A + B)**. Part B's
  anchors were also checked against FU-7's Task 14 and E-FU7-7 blocks (none of its lines) and are listed in Task B0 for
  the executor's re-check. Declared shared line: Task A7's call line with FU-6 Task 13 (merged form given).
- **Suites on the prototype (A + B):** `-r typecheck` clean; engine fast 275/275 files pass (on a Part-A-only tree the two
  Part B unit files fail by design: they import B's exports); the 29 relevant slow files pass (all nine `fu9-*` engine files, the FU-4
  `clinical-suite`, `circ-lowflow-arrest`, `circ-hypoxic-arrest`, `blood-k-rhythm`, `fidelity-lowflow`, 7c/7d/7e/7f
  acceptance and soak files, `lung-copd`, `resp-coupling`). The whole slow-a/slow-b split was not timed by the writer —
  the Gate times it (FU-9's files are SLOW_A only; `vitest list` confirms 0 in slow-b).
- **FU-4 arrest behaviour:** D13 (audit diff, bisected, chaos demonstrated).
- **Placeholders:** none. `[ENG]` constants introduced: `V_EXP_GAIN` 90 / `V_EXP_MAX` 12 (fit target named),
  `SIGMA_LEAK_FLOOR` 0.3, `HYPOK_SLOPE` 0.15 / `HYPOK_FLOOR` 0.7; `OSM_WATER_ML_PER_MOSM` is derived from 7d's own
  constants; `K_TBK_MMOL` 300 [TXT Sterns midpoint]; `ALK_SLOPE` 0.7 / `ALK_PACO2_MAX` 55 / `CHRONIC_HCO3_PER_MMHG` 0.35 /
  `ACUTE_HCO3_PER_MMHG` 0.1 / `COPD_PACO2_REST` [TXT]. Each is on Ali's list (Open questions) where the size matters.
- **Known limits, stated where they bite:** the saline-acidosis magnitude and 7d's urine composition (Q10), the 5 %
  albumin Landis side effect (Q4), the product compositions under the citrate-as-anion rule (Q2), and the lung-water →
  gas-exchange coupling (R-FU9-3) are left to their owners or Ali, not tuned here (R44).
