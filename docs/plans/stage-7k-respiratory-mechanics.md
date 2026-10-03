# Stage 7k: Respiratory mechanics and lung volumes — per-breath Ppeak/Pplat/PEEPi/ΔP/Cstat/Cdyn/Rinsp, transpulmonary pressure with an oesophageal estimate, the dead-space set with Enghoff VD/VT, FRC/RV/TLC/VC/ERV/IC/CC by age, sex, height and pathology, a forced-expiration model (FEV1, FVC, PEF, FEV1/FVC), and the Ventilation panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> STATUS (2026-09-29): **FIXED 2026-09-29 after the R50 review (APPROVE WITH FIXES: 6 major, 10 minor — all applied;
> orchestrator rulings F1, F3, F4, F5, Q-7k-3/-4/-6 recorded in place) — READY TO EXECUTE, 2119 lines.** Written ON TOP OF FU-6 (untracked plan
> `docs/plans/fu-6-respiratory-integration.md`, READY, not merged) and alongside V.1 (executing). Prototype base:
> `origin/main` `c776524` + V.1's plan blocks + FU-6's plan blocks (re-anchored where FU-4 moved them — Prototype
> results → "Base"). **8 creates + 23 edits apply in task order with 0 errors and reproduce the fixed prototype byte
> for byte** (Self-review); every task's code RAN (Tasks 1–6 PROTOTYPED; Task 7 is the gate). The executor starts AFTER
> FU-6 and FU-7 merge; Task 0 re-verifies every find block on that tree. Patch:
> `scratch/plans-backup/stage-7k-prototype.patch`.

**Goal (R57):** expose and complete the respiratory mechanics and lung-volume set in truth, one owner per quantity,
with glossary labels, and show it in a Ventilation panel ("Respiratory mechanics and volumes") of the 7x console that
Stage 9's Explore view re-presents (R-S9-3). Mechanics are measured PER BREATH the way a clinician measures them:
Ppeak at the end of inspiratory flow, Pplat after an inspiratory hold, PEEPtot after an expiratory hold (both holds
run on a copy of the lung state — measuring never disturbs the patient), ΔP, Cstat, Cdyn, Rinsp, and the
transpulmonary pressure with an oesophageal-pressure ESTIMATE. The dead-space set comes from FU-4's single source
(`physicalDeadSpace()`) plus the lung's alveolar dead space, and VD/VT is Enghoff's (a new mixed-expired PCO2). The
static volumes are ECSC/ERS 1993 predicted values for age, sex and height, changed by the lung's own resolved
pathology; FRC is FU-6's continuous awake → anaesthetised FRC. FEV1, FVC, PEF and FEV1/FVC come from a
forced-expiration model driven by the lung units' resistances and compliances (not a lookup), so a later 7h PFT device
can draw the flow–volume loop from the published parameters.

**Architecture:** two pure modules in the lungs' folder (`l2/lung/breath.ts`: per-breath mechanics, the Pes estimate,
the Enghoff dead-space set; `l2/lung/volumes.ts`: predicted and actual volumes and the forced expiration), wired into
the resp pipeline at the breath boundaries and the 1 Hz gas step; three new truth sub-trees (`resp.mechanics`,
`resp.vd`, `resp.volumes`) paid for by two SKIP_PATH entries; one console group. No existing number moves (the
event stream is byte-identical). One page: "Architecture in one page" below.

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2, Playwright 1.63 (its own Chromium), pnpm 9.15.9 via `npx`. No new
dependencies.

**Spec:** `../research/00-orchestrator-rulings.md` (workspace): **R57** (verbatim in the goal), **R45**, **R50**,
**R51**, **R53**, **R56** (glossary, one label source), **R60** (order FU-4 → V.1 → FU-6 → FU-7 → 7k → Stage 9 → 8b),
CI amendment 4, "FU-6 plan FIXED" (FU-4's `physicalDeadSpace()` is the one dead space), G-FU4 (slow-a/slow-b), "Stage 9
R50 review" (R-S9-3). FU-6's D20 and "Requests → Stage 7k" (`docs/plans/fu-6-respiratory-integration.md`), V.1's
plan (the link's `Measured` readouts and holds), Stage 9's plan (R-S9-3, the Explore section title and timed task 5),
`../research/11-capability-inventory-and-glossary.md` §2.4–2.5, §3 A/A′ and §5.6 (entries 143–177),
`../research/12-coverage-matrix.md` (respiratory cells), `docs/physiology/stage-7-lung-pathology-catalogue.md`.

## Global Constraints

- **R45:** mechanisms, never band changes. No existing band is widened, removed or re-worded to pass. A band a
  mechanism cannot reach stays (or becomes) `it.fails` with the measured number in its title; a pre-declared
  `it.fails` whose band is now met is flipped to `it` (title keeps the old number in a trailing "was …" clause).
  Every new parameter is sourced or `[ENG]` with its fit target named in the code comment. 7k is a READ-OUT stage:
  it changes no existing physiology (no existing test's number may move — Task 0 records the before-numbers and the
  gate re-runs them). **Exception procedure** (only where needed): a named exception id E-7k-n, listed below, its
  commit message names it.
- **R51 + addenda (binding):** 7k reads no drug concentration and adds no PD. Bronchodilation reaches FEV1 only
  through FU-6's `resp.bd` / `SMOOTH_MUSCLE` path (the lung is re-resolved by FU-6 when B moves; 7k reads the resolved
  lung). Chain and advance order (addendum 14 / §7) unchanged.
- **Base and order (R60):** FU-4 → V.1 → FU-6 → FU-7 (FU-5 ∥) → **7k** → Stage 9 → 8b. Branch
  `stage-7k-respiratory-mechanics` from `origin/main` AFTER FU-6 AND FU-7 have merged. Every find block below matches
  EXACTLY ONCE on `origin/main` `c776524` + FU-6's plan applied (the prototype base; each block says when it depends
  on an FU-6 line: "(FU-6)" in its header). **Task 0 re-verifies every block on the real merged tree** with this
  plan's own checker (Task 0 Step 3) and re-anchors any block that no longer matches by its quoted comment, making
  the SAME change; never re-type a line you are not changing; record every re-anchoring in the gate note §8.
- **Files FU-6/FU-7/V.1 touch that 7k also touches (expect re-anchoring):** `l2/resp/pipeline.ts` (FU-6 edits
  `driverCtx`, `gasStep`, `advanceResp`'s mechanics loop, `lungStateEvent`; V.1 adds `pleuralMmHg`), `l2/lung/lung.ts`
  (FU-6 `lungMechStep(…, pLimit)`, V.1 `extraShuntAt`), `src/truth.ts` (FU-4/FU-5/FU-6/FU-7 SKIP_PATH entries — the
  SKIP_PATH line is a FIVE-way union: keep every entry), `apps/demo/src/physiology-console/{organs,meta}.ts` (FU-3's
  7x.1 rows; Stage 9 imports these files and does not edit them).
- **Partition (binding).** Edit ONLY the files each task's **Files** block lists. 7k's own files: `l2/lung/breath.ts`,
  `l2/lung/volumes.ts` (new), `l2/lung/state-event.ts` (the one bedside-FRC function), `l2/resp/pipeline.ts` (wiring),
  `packages/engine-core/vite.config.ts` (one SLOW entry), tests named in the tasks,
  `apps/demo/src/physiology-console/{organs,meta}.ts` + `mechanics-panel.test.ts`, `apps/demo/e2e/stage7k-mechanics.e2e.ts`,
  `docs/gates/stage-7k.md` + `docs/gates/stage-7k/**`, and ONE comment in `l2/lung/params.ts` (the `TLC_ML_KG`/`RV_ML_KG`
  relabel, D17 — no number moves).
  Named exceptions (each commit message names the one it uses): **E-7k-1** (7x: `src/truth.ts`, two SKIP_PATH entries
  — `resp.brk`, 7k's own machinery, and `resp.lung.mp`, the derived unit mechanics — that pay for 7k's 53 leaves;
  the 7x console loses its 30 `resp.lung.mp.*` model-internals rows and `lung-labels.test.ts`'s curated
  `resp.lung.mp.units.3.rIn` row describes a path no longer published (R50 F15); Task 4), **E-7k-2** (7x console tests: `organs.test.ts`'s group count 14 → 15 and `lung-labels.test.ts`'s relabel of
  the model's `resp.lung.peepTot` — labels, not bands; Task 5), **E-7k-3** (Stage 3: `l2/gas/params.ts`, one additive
  export `defaultHeightCm()` — the stature `gasPatient` assumes, so the predicted volumes use the same; Task 3).
  **Never touch:** `l3/**`, the renderer, skins, audio,
  `l2/ecg/**`, `l2/hemo/**`, `l2/circ/**`, `l2/pk/**`, `l2/neuro/**`, `data/lung-pathology.ts` and the other
  `l2/lung/*` files except the `params.ts` comment (7k reads them), `packages/ventilator/**` (V.1's — 7k references the link's `Measured` readouts, it
  does not duplicate them), `pnpm-lock.yaml`, `docs/physiology/**`, `research/**` (the glossary edits go to Stage 9
  as Requests).
- **CI rules (CI amendments 1–4, FU-4 Task 20):**
  - `CI=1` for engine tests; long-run horizons from `test/helpers/longrun.ts`, never hard-coded.
  - Every engine test running more than one sim-minute yields once per sim-MINUTE
    (`await new Promise((r) => setImmediate(r))`) — per minute, not per chunk.
  - New multi-sim-minute files join `SLOW` in `packages/engine-core/vite.config.ts`. **`SLOW_B` is DERIVED**
    (`SLOW.filter((p) => !SLOW_A.includes(p))`). **Orchestrator ruling (7k R50 review, F1): 7k's one slow file,
    `test/engine/resp-mechanics.test.ts`, goes in `SLOW` AND `SLOW_A`** — slow-b ran 37.6 of its 40 min at G-FU4,
    slow-a 17–22 min. The groups stay disjoint by the slow-b job's `exclude: [...SLOW_A]` matcher (FU-4 R50 F8; there
    is no separate disjointness test). The file runs nine rigs once each (the rows share them; 14 s locally) and the
    gate note states its CI wall time.
  - `tick-bench` p50 < 6 ms on CI: 7k's per-tick cost is one max() per mechanics sub-step (Ppeak) and, ONCE PER
    BREATH on a positive-pressure source, a 0.3 s and a 2 s closed hold on a copy (≈ 575 sub-steps of 4 units ≈ 30 µs),
    plus the 1 Hz volume set (one `mechParams` for the patient; the healthy reference τ is cached per IBW, F16). Task 4
    Step 5 re-runs the bench (the standard bench is not ventilated; the R50 reviewer's ventilated 60-fps rig read p50
    0.62–0.70 ms and p99 1.2–2.1 ms on the breath-boundary frames — far under 6 ms).
  - Truth leaf budget: the synthetic 12-drug tree must stay under the 2 100-leaf cap
    (`truth-event.test.ts`); 7k PAYS for its leaves (Task 4, E-7k-1).
  - Playwright: its own Chromium (installed locally); heavy screenshot scripts Chromium only; gate images JPEG ≤ 60 KB.
- **Clinical names (R56):** `../research/11-capability-inventory-and-glossary.md` §5.6 is the single label source.
  Test titles, `console.log` lines, console rows and the gate note use the glossary labels (Ppeak, Pplat, PEEP,
  PEEPtot, PEEPi, ΔP, PL, Pes, Cstat, Cdyn, Raw/Rinsp, VD anat, VD app, VD alv, VD phys, VD/VT, PĒCO₂, FRC, RV, TLC, VC,
  ERV, IC, CC, FVC, FEV₁, FEV₁/FVC, PEF). New entries N1–N7 (unnumbered; Stage 9 numbers them after 294) are proposed in "Requests → Stage 9".
- **Process:** worktree `projects/patient-monitor-engine/scratch/wt-stage-7k` (never the shared checkout); branch
  `stage-7k-respiratory-mechanics`; push after every task's commit (`git push -u origin stage-7k-respiratory-mechanics`
  the first time, `git push` after); never `git stash`; scratch and logs under `<scratchpad>/stage-7k/`; every wait on
  a background process is an `until` loop of ≤ 10 min; `git fetch origin && git merge --no-edit origin/main` before the
  gate (Task 10); the executor opens the PR **"Stage 7k: respiratory mechanics and lung volumes"** in Task 10 and NEVER
  merges it.
- **Commands:** `npx -y pnpm@9.15.9 …`. Engine test: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest
  run <path>`; CI split: `PME_TEST_SET=fast` / `slow-a` / `slow-b` inside `packages/engine-core`. Typecheck:
  `npx -y pnpm@9.15.9 -r typecheck`. Playwright uses its own Chromium (no `PW_SYSTEM_CHROME`).
- Strict TS (`noUncheckedIndexedAccess`, `erasableSyntaxOnly`), `.ts` import extensions, conventional commits. Every
  commit message ends with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (the executor's own model name
  is allowed) and is followed by `git push`. The PR body ends with
  `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## Decisions (made while prototyping; the executor does not revisit them)

- **D1 — Per breath, measured the clinician's way, on a copy.** Ppeak = the highest airway-opening pressure of the
  inspiration (the running max of `lung.mech.paw` over the 62.5 Hz samples of the inspiration; for square-flow VCV it
  is the last inspiratory sample's Paw, and a pressure-limited breath reads Pmax — FU-6 D18); Pplat = the airway
  pressure after a 0.3 s END-INSPIRATORY hold and PEEPtot after a 2 s END-EXPIRATORY hold, both run by the lung
  module's existing `measure.ts` `holdPressure` on a COPY of the unit state at the breath boundary (Arnal 2018; Hess &
  Kacmarek 4e ch. 3). ΔP = Pplat − PEEPtot, Cstat = VT/(Pplat − PEEPtot), Cdyn = VT/(Ppeak − PEEPtot), Rinsp =
  (Ppeak − Pplat)/V̇insp (mean inspiratory flow = VT/Ti: square flow on the internal VCV) — and `null` when the flow was
  not square (R50 F7): a VCV breath held at Pmax (FU-6 D18: bronchospasm at the default Pmax 40 would read 48.3 against
  the true 60.3) or an external (link) PCV/PSV frame. The set PEEP is NOT re-published (R50 F8): it is
  `resp.driver.vent.peep` (glossary #145); 7k keeps it in its machinery for PEEPi only. VT = the volume the lung
  received this breath (FU-6 Request 2: never the set VT). The boundaries are read from the drive the next sample will
  apply (`lungDrive`), so the holds start exactly at end-inspiration / end-expiration. Measuring never disturbs the
  patient (no state is written back; every existing number is unchanged — Prototype "Base unchanged").
- **D2 — No engine hold COMMAND.** R57's condition "hold manoeuvres as commands if the ventilator link lacks them" is
  false: the link has `hold: 'insp' | 'exp'` (`packages/ventilator/src/vent.ts:356`) and V.1 keeps it. The engine's
  truth is "what a hold would read on this breath" (D1), for the internal VCV and the link alike. A real hold on the
  internal VCV (which would change the breath) is not added — logged as a 7h/v1.1 item.
- **D3 — Spontaneous breaths.** `resp.mechanics.kind` is `'spont'` and the positive-pressure fields (Ppeak, Pplat,
  PEEPtot, PEEPi, ΔP, Cstat, Cdyn, Rinsp, V̇insp) are `null` (a truth leaf may be null) — they are not measurable
  without a ventilator. Pes and PL (with Paw 0) and the dead-space set are published for every breath. `kind` and `t`
  are console-internal rows (R50 F8); `vt` is glossary #125 VT.
- **D4 — Oesophageal pressure is an ESTIMATE** (glossary label "Pes (estimate)"), and its reference depends on the
  context (**Orchestrator ruling (7k R50 review), F4**: "the awake healthy PL,ee −7 / Pes 7 is a model error, not a
  presentation issue: a spontaneously breathing lung sits at a POSITIVE transpulmonary pressure at FRC"):
  - **Awake, spontaneous:** Pes = the lung model's own pleural pressure (7a/7b `respPleural`, mmHg → cmH2O): −5.4 at
    FRC (7a's P_PL0 −4 mmHg) and ≈ 4 cmH2O more negative at end-inspiration — West's values (Ppl ≈ −5 at FRC, ≈ −8 at
    end-inspiration; *Respiratory Physiology* ch. 7). Healthy awake adult: Pes −9.4/−5.4, **PL,ee +5.4, PL,ei +9.4**
    (was −7/−3 in the reviewed draft).
  - **Supine and ventilated or anaesthetised** (a positive-pressure source, or gaLvl ≥ 0.5): the supine balloon value,
    Pes = 6.9 cmH2O (lean supine, end-expiration at the relaxation volume; Owens et al. 2012 *Obesity* 20:2354,
    PMC3443522 — seated −3.3) + 0.22 cmH2O per BMI unit above 22.5 (the same study's two means, 6.9 → 9.3 at BMI 33.3)
    [ENG line; applied to children [ENG]] + ΔPpl(t): on a positive-pressure breath the lung model's own chest-wall
    recoil ΣV/Ccw (+ `lp.pPtx`/7a `ext.pPtx`, + a cough's `pMus`), on a spontaneous breath under GA 7a's swing. So
    ΔPes/ΔPaw on a passive breath = Ecw/Ers = Crs/Ccw ≈ 0.27 (as balloons measure it; R50 F16 wording) — not 7a's
    haemodynamic transmission T_IT 0.65, which read PL,ei −1.9 in the first draft. Healthy anaesthetised adult: Pes
    10.8/8.3, PL,ei 3.3, PL,ee −3.3 (supine: Talmor 2008 and Loring 2010 report negative PL,ee in supine anaesthetised
    and ventilated patients).
  PL uses Talmor's direct method (Paw − Pes at the two holds; label "PL (Pes-based, direct)"); EL/Ers is published so
  the elastance-derived PL (Chiumello 2008) is one multiplication away. The glossary normals are stated per context
  (Requests → Stage 9).
- **D5 — ONE dead space.** VD anat + VD app = FU-4's `physicalDeadSpace()` (the pipeline's `deadSpace()`, which adds
  the MANUAL fit only in MANUAL); VD app = `apparatusDeadSpaceMl(weight)` on a mechanical airway (the same helper
  `physicalDeadSpace` adds); VD anat = the rest. VD/VT is ENGHOFF's with the inspired-CO2 correction,
  (PaCO2 − PĒCO2)/(PaCO2 − PICO2), with the mixed-expired PCO2 of the breath from the CO2 the engine eliminates
  (`gas/co2.ts`: V̇CO2,exp = φ·V̇A·e·(PaCO2 − PICO2)/0.863 above the inspired CO2 → **PĒCO2 = PICO2 + φ·e·(1 − VDs/VT)·
  (PaCO2 − PICO2)**, so VD/VT = 1 − φ·e·(1 − VDs/VT)). R50 F6: the reviewed draft dropped PICO2·(1 − VDs/VT) and
  over-read VD/VT by ≈ 0.15 at PICO2 10 (exhausted absorber); a rebreathing row guards it (`breath.test.ts`). VD phys = VD/VT·VT; VD alv = VD phys − VDs (volumetric
  capnography's split; Enghoff VD includes the venous-admixture effect, as the measured one does). No second
  dead-space function is defined (FU-6 blocker F1 honoured).
- **D6 — Two FRCs, two owners, two labels.** The BEDSIDE FRC (supine, awake → anaesthetised; the O2 store) is FU-6's
  `frcNow` × the conditions' `frc` × the aerated share — extracted as ONE function `aeratedFrc()` in
  `l2/lung/state-event.ts`, which `lungState.frcMl` and `resp.volumes.frc` both call (byte-identical refactor). ERV
  and IC are PFT-lab quantities defined against the SEATED FRC (ATS/ERS 2005 lung volumes), so the PFT set carries its
  own `frcSit` (predicted × pathology, label "FRC (seated, PFT)"). Reason, measured: against the engine's supine FRC
  the healthy adult's ERV would be 0.16 L awake and negative under GA (1.40 L < the ECSC RV 1.94 L; against the lung
  model's internal P–V floor, 16 mL/kg = 1.12 L, the GA FRC is consistent — D17, Q-7k-1).
- **D7 — Predicted values.** Adults (≥ 18 y): ECSC/ERS 1993 (Quanjer et al. *Eur Respir J* 1993;6 Suppl 16; the
  lung-volume table as reprinted in Stocks & Quanjer 1995 *Eur Respir J* 8:492 Table 8: TLC 7.99H − 7.08, RV 1.31H +
  0.022A − 1.23, FRC 2.34H + 0.01A − 1.09 (men); 6.60H − 5.79, 1.81H + 0.016A − 2.00, 2.24H + 0.001A − 1.00 (women);
  spirometry FVC 5.76H − 0.026A − 4.34 / 4.43H − 0.026A − 2.89, FEV1 4.30H − 0.029A − 2.49 / 3.95H − 0.025A − 2.60),
  H in m, age 18–25 entered as 25 and > 70 as 70, H clamped to the equations' 1.55–1.95 (men) / 1.45–1.80 (women) m.
  Children (< 18 y): Zapletal (plethysmographic; Stocks & Quanjer 1995 Table 7, the ERS recommendation for 5–18 y):
  TLC 9.96·10⁻³·H^2.5698 / 9.17·10⁻³·H^2.5755, FRC 3.22·10⁻³·H^2.6523 / 3.70·10⁻³·H^2.6149, RV 21.06·10⁻³·H^2.1314 mL
  (H cm), extrapolated below 5 y [ENG]; children's FVC = 0.95·VC and FEV1/FVC 0.90 [ENG]. **16–20 y: the two sets are
  blended linearly by age** (R50 F11: the switch at 18 y jumped TLC +15–24 % at one birthday) [ENG]. PEF predicted:
  ECSC men 6.14H − 0.043A + 0.15, women 5.50H − 0.030A − 1.11 L/s (550 L/min for the reference man); children the
  model's own healthy peak [ENG]. FEV1/FVC predicted = FEV1pred/FVCpred (82.4 % at 40 y), not ECSC's separate ratio
  equation (87.21 − 0.18A = 80.0 %) — stated, not changed. **Orchestrator ruling (7k R50 review), Q-7k-3: ECSC with the
  fixed FEV1/FVC ratio for v1.0; GLI with the lower limit of normal in v1.1.**
- **D8 — Static volumes by pathology.** Actual TLC/RV = predicted × (a) the conditions' aerated fraction (consolidated,
  compressed or collapsed lung holds no gas: pneumothorax, effusion, pneumonia, ARDS), (b) `VOLUME_EFFECTS` — a small
  sourced knot table in 7k's own file for the conditions whose volume change is not an aeration change (COPD, asthma,
  bronchospasm, ILD, chest wall, obesity, pregnancy), (c) respiratory-muscle strength `lp.pMax` (weakness: TLC → 60 %,
  RV → 150 % at no strength [ENG]). Volumes are allowed to be table-driven by R57; FEV1/FVC is not (D9). The ILD
  knots follow the catalogue's own GRADE definitions (FVC 70–80 / 50–70 / < 50 % → TLC 0.75/0.6/0.45) rather than its
  `frc` row (0.85/0.7/0.55), which stays the O2-store FRC multiplier (the prototype with the `frc` row read FVC 92 %
  at "mild", outside the grade's own band). **R50 F13:** the aeration term excludes the atelectasis of the conditions
  whose `atel`/`consol` is GA/supine atelectasis, not a seated volume loss (`VOLUME_EFFECTS.gaAtel`: obesity,
  pregnancy) — obese TLC 86 → 90 % (the knot's own value).
- **D9 — The forced expiration is a model.** Each lung unit empties from TLC toward RV with a forced-expiratory time
  constant τf,u = τf,ref·(Rex,u·Crs,u / (Rex·Crs)healthy)^0.6 (the unit's passive expiratory R·C from the resolved
  lung, the tube excluded, against the same patient's healthy lung; τf,ref = −1/ln(1 − FEV1/FVC predicted), so the
  healthy patient reproduces the reference ratio). FEV1 = Σ VC_u(1 − e^(−1/τf,u)); FVC to the ATS/ERS 2019 end of
  forced expiration (flow < 25 mL/s, or 15 s): the slow units' tail is gas trapping (FVC < VC) and scoops the F–V
  curve. Exponent 0.6 [ENG; fit: the catalogue's COPD grades = GOLD FEV1 ≥ 80 / 50–79 / 30–49 /
  < 30 % with FEV1/FVC < 0.70 — 0.4/0.5/0.6/0.7 were tried: 0.6 meets GOLD 2–4 (55/41/28 %) and misses GOLD 1 (71 %,
  Q-7k-2)]. Bronchodilation reaches FEV1 through FU-6's re-resolved lung (`resp.bd`, `SMOOTH_MUSCLE`) — 7k adds no
  drug term. The (VC_u, τf,u) pairs are published (`resp.volumes.fe`, 8 numbers) so a 7h PFT device redraws the loop:
  V̇(t) = Σ v_u/τ_u·e^(−t/τ_u), V(t) = Σ v_u(1 − e^(−t/τ_u)).
  **PEF (Orchestrator ruling (7k R50 review), F3):** PEF is NOT the curve's t = 0 value (the reviewed draft's Σ v/τ fell
  ≈ twice as fast as FEV1: acute severe asthma PEF 22 % with FEV1 35 % — "life-threatening" on the BTS scale). One
  sourced mechanism: the peak is effort-dependent and wave-speed limited in the CENTRAL airways (Dawson & Elliott 1977
  *J Appl Physiol* 43:498; Mead 1978), so it depends less on peripheral R·C than the rest of the manoeuvre:
  PEF = PEFpred × Σ VC_u·r_u^(−0.3) / FVCpred [ENG exponent; fit: PEF % tracks FEV1 % within ±15 points in acute
  severe asthma and COPD GOLD 2–4 — 0.2/0.3/0.4/0.5 tried]. Result: asthma 1 PEF 39 % (FEV1 35 %; BTS/SIGN 2019 and
  GINA acute severe 33–50 %), COPD GOLD 1–4 72/58/47/35 % (FEV1 71/55/41/28 %), ILD 0.6 62 % (FEV1 62 %). Guard test in
  `volumes.test.ts`. The 7h device draws the rise to PEF and then the effort-independent curve.
- **D10 — Closing capacity** (glossary #176; FU-6 Request 7; gap A24): a readout only, adults only (`null` < 18 y):
  CC = the supine FRC at 44 y and the seated FRC at 66 y (Leblanc, Ruff & Milic-Emili 1970 *J Appl Physiol* 28:448),
  linear in age through the two anchors [ENG], with the supine anchor the patient's healthy awake supine FRC
  (`FRC_AWAKE_ML_KG`·IBW — obesity lowers FRC, not CC). It does NOT drive atelectasis in 7k (that would move every
  existing induction-atelectasis number). **Orchestrator ruling (7k R50 review), Q-7k-4: closing capacity stays a
  published readout in v1.0; airway closure (CC > FRC) as a mechanism is v1.1.**
- **D11 — Pattern** (`resp.volumes.pattern`): obstructive FEV1/FVC < 0.70 (GOLD fixed ratio, ruled for v1.0; the
  ATS/ERS 2022 LLN rule is v1.1), restrictive TLC < 80 % predicted, mixed both, else normal.
- **D12 — Truth budget.** 7k publishes 53 leaves (`resp.mechanics` 17 — no `peep`, F8; `resp.vd` 6; `resp.volumes` 30 —
  with `pred.pef`, F3) and PAYS for
  them (E-7k-1): SKIP_PATH `resp.brk` (7k's own machinery, 12) and `resp.lung.mp` (the unit mechanics — a derived copy
  of `lp` rebuilt at every aeration change; glossary §5.16 rule 5 names "the unit sigmoids" as internals, 30).
  Measured: the synthetic 12-drug tree 2 038 → **2 061** leaves (cap 2 100; without the two entries 2 103 = cut);
  today's real tree 1 321 → 1 344 (both unchanged by the R50 fixes). **R50 F15:** skipping `resp.lung.mp` removes the
  7x console's 30 `resp.lung.mp.*` model-internals rows, and `lung-labels.test.ts`'s curated `resp.lung.mp.units.3.rIn`
  label row now describes a path the engine no longer publishes (the row stays: it tests `metaOf` on a string).
- **D13 — The Ventilation panel is a console GROUP**, "Respiratory mechanics and volumes" (Stage 9's section title,
  verbatim), after "Lungs & gas exchange", fed by the prefixes `resp.mechanics`, `resp.vd`, `resp.volumes`, with
  glossary labels in `meta.ts` CURATED. **R50 F14:** Stage 9's Explore "respiratory" section selects rows by glossary
  §5.6 KEYS (`gloss: ['5.6']`), not by console group — the rows reach it through the key moves in Requests → Stage 9;
  the matching title is cosmetic. The console shows "Pes,ei est." / "Pes,ee est." so the qualifier survives the
  label column (the long "(estimate)" was truncated).
  The model's own `resp.lung.peepTot` (mean alveolar pressure at inspiration start, used by recruitment) is relabelled
  "Mean end-expiratory alveolar pressure" so "PEEPtot" means one thing (the hold reading, glossary #146; R56 one label).
- **D14 — Volumes at 1 Hz, mechanics per breath.** `updateVolumes` runs on the 1 Hz gas step (conditions,
  bronchodilation, gaLvl and aeration move slowly); the forced expiration is closed-form (≈ 300 exponentials); the
  healthy reference τ is cached per IBW (F16).
- **D15 — Pplat and auto-PEEP ARE truth leaves with glossary keys** (orchestrator input 2026-09-29 from the CM
  comorbidity coverage audit, `../research/19-coverage-comorbidity.md` §"7k": its auditor had to compute Pplat and
  auto-PEEP with 7b's internal `holdPressure` on a state copy because neither was on a truth path). Published per
  mechanical breath: **`resp.mechanics.pplat`** (glossary #144 "Pplat"), **`resp.mechanics.peepTot`** (#146
  "PEEPtot") and **`resp.mechanics.peepi`** (#147 "PEEPi (auto-PEEP)"), next to `ppeak` (#143) and `dp` (#148). The
  method is the one the auditor used (a 0.3 s end-inspiratory / 2 s end-expiratory hold on a COPY, `measure.ts`
  `holdPressure`), so CM-02c (obese Pplat, PBW vs TBW VT), CM-07b (COPD auto-PEEP at RR 12/20) and CM-07d (bronchospasm
  on COPD) become black-box cells that read truth. Task 4's engine test asserts Pplat and PEEPi on the healthy and
  bronchospasm rows and logs all three on every ventilated row; the console rows are in Task 5; the glossary key moves are in Requests → Stage 9.
- **D16 — 7k defines no obese patient.** The obese readouts depend on the obesity definition only through inputs 7k
  does not own: the bedside FRC (`gasPatient`'s BMI term × the `obesity` condition's `frc`, via FU-6's `frcNow` and
  `aeratedFrc`) and the profile's weight and height (the BMI in the Pes estimate, D4). FU-8 (follow-ups, being written)
  defines ONE obese patient (lean-weight-based blood volume) and hands the obese apnoea re-tune to FU-6; 7k REFERENCES
  that hand-over and chooses nothing: whatever FU-8/FU-6 make the obese FRC, `resp.volumes.frc` shows it. 7k's own
  obesity inputs are keyed on the `obesity` LUNG CONDITION's severity only (`VOLUME_EFFECTS.obesity`: seated TLC and
  FRC for the PFT set, D8) — definition-free. If FU-8 has merged before 7k, Task 0 Step 4 re-measures the obese rows
  (Task 4's obese test asserts Cstat, Pes,ee and PL,ee — condition- and BMI-driven, not FRC-driven — and the
  prototype's bedside FRC 0.32 L is reported, never asserted).

- **D17 — TLC and RV have ONE owner: 7k's clinical values** (**Orchestrator ruling (7k R50 review), F5**). The
  patient's TLC and RV are `resp.volumes.tlc` / `.rv` (ECSC/Zapletal × pathology, D7–D8). The lung model's
  `TLC_ML_KG` 80 / `RV_ML_KG` 16 (`l2/lung/params.ts`, used by `side.ts` `mechParams`) are relabelled in their comment as
  INTERNAL — the range of the unit P–V sigmoids, not a clinical TLC/RV (Task 3; comment only, no number moves). This
  answers FU-6's Request 4 ("RV/TLC stay constants until 7k"): the constants stay the model's P–V range; the clinical
  TLC/RV are 7k's leaves, and the glossary keys #167/#168 move to them (Requests → Stage 9). Re-basing the sigmoid
  range on ECSC moves every mechanics number (a future 7h P–V loop would otherwise saturate ≈ 1.3 L below the
  published TLC) — Q-7k-6, v1.1.

## Prototype results (before → after; seed 7; MODELED; 5 sim-min; "before" = the closest pre-7k model value)

**Base.** Throwaway worktree at `origin/main` `c776524` (FU-3, FU-4, FU-5 merged) + V.1's plan blocks (71; 5 stale on
the post-FU-4 tree, of which only V.1 Task 2's `pleuralMmHg` line was re-applied by hand — FU-4 had already moved the
CO reference) + FU-6's plan blocks (28 creates, 197 edits applied by `fu-4-verify.py`; the 8 stale ones re-anchored by
hand: the `rs.coRatio` anchor, `deadSpace(rs, l1)`, the SKIP_PATH union, the `pk-bus` rig, the params import, the
`rSys` line, and FU-4's two-argument `physicalDeadSpace(pat, artificialAirway)`) = local commit `b97ebaa`, typecheck
clean. 7k's blocks on it: **8 creates, 21 edits, 0 errors**, and the applied tree equals the prototype byte for byte.
Patches: `scratch/plans-backup/stage-7k-base-v1-fu6.patch` (the base: `c776524` → V.1 + FU-6 applied) and
`scratch/plans-backup/stage-7k-prototype.patch` (7k on that base); the two evidence JPEGs are in
`scratch/plans-backup/stage-7k-prototype-shots/`.

**R50 fix round (2026-09-29).** The fixer rebuilt the prototype on the same base (`b97ebaa`), applied F1–F16 and the
rulings, and re-ran: typecheck clean; `volumes` 13 + `breath` 7 passed; `resp-mechanics` 13 passed (2 `it.fails` as
declared) in 13.9 s; truth real 1 344 / 12-drug 2 061 (unchanged: `peep` −1, `pred.pef` +1); the three-rig hash
unchanged; engine fast set 275 files, 1 227 passed, the same 7 base failures; console 151 passed + V.1's `waterShunt`
row; e2e smoke 1 passed with no files written, `PME_SHOTS=1` 1 passed (shots 34 / 44 KB). The tables below carry the
fixed numbers; changed cells say "was …".

**Base unchanged.** Every event (except `truth`) and the final circulation/gas/lung/blood state of three ventilated
rigs (healthy, COPD GOLD 3, tension pneumothorax 0.8, 240 s) hash identically before and after 7k
(`099129ff4f8db349 581a4dc66f55109c ab43daa08d3831c3` both). Engine fast set: 273 files, 1 207 passed, 7 failed — the
same 7 on the base (all V.1/FU-6 mechanical-application artefacts, Task 0 Step 4). tick-bench (60 s × 3, ventilated):
p50 0.542/0.531/0.526 → 0.551/0.540/0.543 ms. Truth: real tree 1 321 → 1 344 leaves; synthetic 12-drug tree 2 038 →
2 061 (without E-7k-1's two SKIP_PATH entries 2 103: cut at the cap).

### Mechanics per breath (healthy 70 kg male 40 y 175 cm; ETT; VCV 12 × 500, PEEP 5, FiO2 0.5, GA rig of FU-6 `ventRig`)

| patient (rig) | Ppeak | Pplat | PEEPtot / PEEPi | ΔP | Cstat | Cdyn | Rinsp | Pes ei/ee | PL ei/ee | band (source) |
|---|---|---|---|---|---|---|---|---|---|---|
| healthy, GA | — → **17.1** | pInsp 14.1 → **14.2** | 5.1 / 0.1 | — → **9.1** | lungState 55 → **54.7** | — → **41.2** | lungState R 10 → **9.9** | — → **10.8 / 8.3** | — → **3.3 / −3.3** | Ppeak < 30; Pplat < 30 (12–16 typical); ΔP < 15 (Amato 2015; healthy ≈ 8–10); Cstat 50–80 intubated; Rinsp 8–12 with ETT (glossary §5.6; Hess & Kacmarek 4e ch. 3) — **all in** |
| healthy, awake spontaneous | — | — | — | — | — | — | — | — → **−9.4 / −5.4** (swing 4; the model's pleural pressure, F4 ruling) | **+9.4 / +5.4** | West: Ppl ≈ −5 at FRC, ≈ −8 end-inspiration, PL positive — **in** (the reviewed draft read Pes 3/7, PL −3/−7) |
| bronchospasm 1, `pmax 80` (FU-6 D18b) | 44.5 | 26.4 | 16.8 / **11.8** | 9.6 | 51.9 | 18.0 | **60.3** | 14.1 / 11.6 | 12.3 / 5.2 | Ppeak ≥ 40, PEEPi 6–12 (catalogue §2 at 0.8: 6–10), Rinsp 46–60 incl. ETT — **in** |
| bronchospasm 1, default Pmax 40 (console) | 40.0 (= Pmax) | 25.5 | 16.9 / 11.9 | 8.6 | 52 | 20 | **null** (was 48.3; not square flow, F7) | 13.8 / 11.5 | 11.8 / 5.4 | the limit reads Pmax and VT 450 < 500 set (FU-6 D18) |
| ARDS 0.67, VT 420 (6 mL/kg), PEEP 10, RR 18 | 26.4 | 21.9 | 10.2 / 0.2 | 11.8 | **35.3** | 25.6 | 11.9 | 10.9 / 8.8 | 11.0 / **1.4** | Cstat 35 (catalogue §6, Arnal); ΔP ≤ 15; PL,ee 0–10 (Talmor 2008) — **in** |
| obesity 1, BMI 40 (122.5 kg) | 23.2 | 19.3 | 5.0 / 0.0 | 14.3 | **35.2** | 27.7 | 12.8 | 14.6 / 11.7 | 4.7 / **−6.7** | Cstat 24–40 (catalogue §10); PL,ee < 0 at PEEP 5 (Pelosi 1998; Behazin 2010 direction) — **in** |
| COPD GOLD 3, 65 y, VCV 490 × 14 | 24.5 | 15.9 | 8.6 / **3.6** | 7.3 | **67.7** | 30.9 | **25.2** | 12.3 / 9.8 | 3.6 / −1.2 | Cstat 43–75, Rinsp 16–33 (catalogue §5); PEEPi 4–8 at RR 14 (catalogue; R46 6–12 at RR 20) — Cstat, Rinsp **in**; PEEPi **3.6** (lungState 3.7: the lung model's own value, not a 7k measurement — calibration row) |
| ILD 0.6, 60 y, VCV 490 × 14 | 24.8 | 20.4 | 5.0 / 0 | **15.3** | **31.8** | 24.7 | 12.9 | 10.2 / 7.8 | 10.2 / −2.7 | Cstat 32, ΔP 13–15.5 (catalogue §7) — **in** |
| simple pneumothorax 0.3 R | 19.1 | 16.1 | 5.0 / 0 | 11.0 | **45.2** | 35.4 | 10.2 | 10.6 / 8.1 | 5.5 / −3.1 | Crs ×0.82 → 45 (catalogue §15) — **in** |
| 4 y child 16 kg 102 cm, ETT, VCV 17 × 112 | 18.3 | 14.1 | 5.3 / 0.3 | 8.9 | **12.5** (0.78 /kg) | 8.5 | **43.4** | 10.7 / 8.3 | 3.4 / −3.0 | Cstat ≈ 1 mL/cmH2O/kg (glossary child row), Rinsp high with a 4.5–5.0 ETT — **in** |

The hold readings agree with the lung model's internal values they replace on the panel (lungState Cstat 55 vs 54.7,
autoPEEP 11.9 vs 11.8, `lung.pInsp` 26.8 vs Pplat 26.4 — the 0.3 s hold lets the fast and slow units equilibrate).

### Dead-space set (Enghoff) and CO2

| patient | VD anat / app / alv / phys (mL) | VD/VT | PĒCO2 / PaCO2 | band (source) |
|---|---|---|---|---|
| healthy, GA, ETT | lungState 127 → **77 / 50 / 13 / 140** | **0.28** | 25.7 / 35.7 | 0.30–0.45 ventilated (Nunn 8e; glossary #165) — **misses by 0.02** → `it.fails` (Q-7k-5) |
| healthy, awake | 154 → **154 / 0 / 1 / 155** | **0.33** | 26.4 / 39.2 | 0.20–0.35 (glossary) — **in** |
| bronchospasm 1 | 77 / 50 / 138 / 265 | **0.53** | 19.1 / 40.8 | healthy + 0.20 (catalogue §2) — **in** |
| ARDS 0.67 | 77 / 50 / 109 / 236 | **0.57** | 17.3 / 40.1 | 0.57 moderate (catalogue §6, Nuckton 2002) — **exact** |
| COPD GOLD 3 | 77 / 50 / 131 / 258 | **0.52** | — | 0.50 (catalogue §5) — **in** |
| ILD 0.6 | 77 / 50 / 56 / 183 | 0.38 | — | + 0.10 (catalogue §7) — in |
| obesity BMI 40 | 78 / 50 / 2 / 129 | 0.26 | — | — |
| child 4 y | 18 / 8 / 6 / 31 | 0.28 | — | — |

### Volumes: predicted (seated) and actual

| patient | TLC | RV | FRC bedside (supine, now) | FRC seated / ERV / IC | VC / FVC / FEV1 (% pred) | FEV1/FVC | PEF | CC | pattern | band (source) |
|---|---|---|---|---|---|---|---|---|---|---|
| healthy 40 y M 175 cm (pred) | 6.90 L | 1.94 | awake **2.10** → GA **1.40** (FU-6) | 3.41 / 1.46 / 3.50 | 4.96 / 4.69 / 3.87 L (100 / 100 %) | **0.83** | 550 L/min (100 %; was 491 before `pred.pef`, F3) | **1.86** | normal | ECSC: TLC 6.90, RV 1.94, FRC 3.41, FVC 4.70, FEV1 3.88, PEF 551; FRC supine −0.5–1.0 L, GA −0.4–0.5 L (Nunn) |
| healthy 40 y F 165 cm | 5.10 | 1.63 | 1.71 | 2.74 / 1.11 / 2.36 | 3.47 / 3.37 / 2.92 | 0.87 | 100 % | — | normal | ECSC women |
| 4 y boy 102 cm | 1.45 | 0.40 | 0.48 awake / 0.13 GA | 0.68 / 0.28 / 0.76 | 1.04 / 0.98 / 0.89 | 0.91 | 100 % (model) | null | normal | Zapletal TLC 1.45, RV 0.40; preschool FRC(He) 482 mL at 100 cm (Stocks & Quanjer 1995 Table 5) |
| COPD GOLD 1/2/3/4 (65 y) | 100/105/115/125 % | 115/140/175/220 % | 1.68 (GOLD 3, GA) | ERV 0.97/0.71/0.57/0.36 | FEV1 **71**/55/41/28 % | 0.61/0.51/0.40/0.31 | **72/58/47/35 %** (was 208/145/99/63 L/min = 43/30/20/13 % of the 65 y ECSC 486 L/min, F3) | 3.58 | obstructive | GOLD FEV1 ≥ 80/50–79/30–49/< 30 % with < 0.70 — GOLD 2–4 **in**, GOLD 1 **71 %** (Q-7k-2); PEF % within ±15 of FEV1 % — **in** |
| ILD 0.3/0.6/0.9 (60 y) | 75/60/45 % | 75/60/45 % | 0.98 (0.6, GA) | — | FVC 75/60/45 % | 0.80/0.82/0.84 | — | — | restrictive | catalogue grades FVC 70–80 / 50–70 / < 50 % — **in** |
| asthma 1 (acute severe) | 110 % | 200 % | — | ERV 0.54 | FEV1 35 % | 0.39 | **39 %** (was 106 L/min = 19 %, F3) | — | obstructive | FEV1 < 50 % severe (GINA); PEF 33–50 % acute severe (BTS/SIGN 2019) — **in** |
| asthma 0.7 + salbutamol 250 µg | — | — | — | — | FEV1 62 % → +32.7 % (+780 mL) | 0.58 → 0.77 | — | — | — | reversibility ≥ 12 % and ≥ 200 mL (ATS/ERS) — **in**; asthma 0.6: +11.6 % (+348 mL), borderline |
| COPD GOLD 2 + salbutamol | — | — | — | — | +3.0 % (+72 mL) | 0.56 → 0.57 | — | — | — | not significant — **in** |
| obesity BMI 40 | **90 %** (was 86, F13) | 100 % | 0.32 (FU-8's obese definition, D16) | 2.38 / **0.44** / 3.83 | FVC 86 % / FEV1 87 % | 0.84 | 87 % | 1.88 | normal | TLC ≥ 80 %, ERV ≪ (Jones & Nzekwu 2006) — **in**; bedside FRC reported, not asserted (D16) |
| simple pneumothorax 0.3 R | 84 % | 84 % | 1.17 | 2.84 / 1.22 / 2.92 | FVC 83 % | 0.86 | 88 % | 1.86 | normal | TLC − collapsed share (0.55 × 0.3) |
| ARDS 0.67 | 65 % | 65 % | 0.95 | — | FVC 65 % | 0.86 | — | — | restrictive | non-aerated 0.35 (catalogue §6) |

**The FRC finding (Q-7k-1).** Against the ECSC predicted seated FRC (3.41 L) the engine's awake supine FRC (30 mL/kg
IBW = 2.10 L) is 1.3 L lower (textbook seated → supine −0.5 to −1.0 L) and its anaesthetised FRC (20 mL/kg = 1.40 L)
is below the ECSC RV (1.94 L) — though consistent with the lung model's own internal P–V floor (16 mL/kg = 1.12 L,
D17): ERV against the bedside FRC and the clinical RV would read 0.16 L awake and −0.54 L under GA. D6
publishes ERV/IC against the seated PFT FRC, as a lab does, so the panel is right; the O2-store FRC itself is left to
Ali. Measured: re-basing the O2-store FRC to ECSC-derived values (awake supine 2.61 L, GA 2.09 L) moves the
preoxygenated apnoea to SaO2 90 % from **8.1 to 11.8 min** (band 6.5–9.5, Benumof ≈ 8; GA 1.80 L alone: 10.2 min) —
so the engine's lower FRC is compensating for something else in the O2 budget, and 7k does not touch it (R45).

## Architecture in one page

```
advanceResp (62.5 Hz, Stage 3 + 7b)                               l2/lung/breath.ts (pure, 7k)
  ld = lungDrive(rs, t)        inspNext = ld is inspiratory flow     breathMechanics({…}) → Mechanics
  ├─ !inInsp && inspNext → breathStart: PEEPtot = expHold(copy),    pesNow: awake spont → Ppl (West); else pesEstimate (D4)
  │                          Pes,ee, Ppeak := Paw                    deadSpaceSet({…})       (D5, Enghoff)
  ├─ inInsp && !inspNext → breathEnd: Pplat = inspHold(copy),       expHold / inspHold = measure.ts holdPressure
  │                          VT = Σ(v − v0), Pes,ei, EL/Ers
  │                          → rs.mechanics, rs.vd
  ├─ lungMechStep(…)  (FU-6's pLimit)                              l2/lung/volumes.ts (pure, 7k)
  └─ inInsp → brk.pk = max(brk.pk, paw)                            predictedVolumes(age, sex, H)  (D7)
gasStep (10 Hz): every 10th → updateVolumes(rs)                    actualVolumes(pred, lp, specs, aerCond) (D8, D9)
  → rs.volumes = { frc: aeratedFrc(lung, frcNow), frcSit, tlc,    closingCapacity(pred, age, FRCsup) (D10)
     rv, vc, erv, ic, cc, fvc, fev1, ratio, pef, fet, pattern,     pattern(a, pred)                  (D11)
     pred{…}, fe{v[4], tau[4]} }
l2/lung/state-event.ts: aeratedFrc(ls, frcMl)  ← lungState.frcMl and resp.volumes.frc (D6, one bedside FRC)
truth: resp.mechanics.*, resp.vd.*, resp.volumes.* (53 leaves); SKIP resp.brk, resp.lung.mp (D12)
7x console: group "Respiratory mechanics and volumes" ← resp.mechanics | resp.vd | resp.volumes; glossary labels (D13)
Stage 9 Explore (later) re-presents the group; the 7h PFT device (later) draws V̇(t), V(t) from resp.volumes.fe
```

## Requests to other stages

- **Stage 9 — R-S9-3 (answered).** 7k publishes on truth paths, with glossary labels in the 7x console (which Stage 9's
  Explore re-presents): `resp.mechanics.{ppeak, pplat, peepTot, peepi, dp, cstat, cdyn, rinsp, flow, vt, pesEi, pesEe,
  plEi, plEe, elErs}` (+ internal `kind`, `t`), `resp.vd.{anat, app, alv, phys, vdvt, peco2}`, `resp.volumes.{frc,
  frcSit, tlc, rv, vc, erv, ic, cc, fvc, fev1, ratio, pef, fet, pattern, pred.*}`, and the loop data `resp.volumes.fe.{v[4],
  tau[4]}` (the F–V curve is V̇(t) = Σ v_u/τ_u·e^(−t/τ_u) against V(t) = Σ v_u(1 − e^(−t/τ_u)); arrays of ≤ 8 numbers
  survive `pruneTruth`). Explore's "respiratory" section selects rows by §5.6 KEYS (R50 F14), so these key moves are
  what fills it; please reduce that section's placeholder ("…driving and transpulmonary pressure and the full set of
  lung volumes arrive in a coming update") to the loops only — the numbers arrive with 7k. **Glossary edits for Stage
  9's Task 0 Step 5 / Task 2** (research/11 §5.6, keeping every entry number):
  - keys moved: #143 Ppeak → `resp.mechanics.ppeak`; #144 Pplat → `resp.mechanics.pplat` (the model's `resp.lung.pInsp`
    becomes an Engine row "End-inspiratory alveolar pressure (model)"); #146 PEEPtot → `resp.mechanics.peepTot` (the
    model's `resp.lung.peepTot` becomes "Mean end-expiratory alveolar pressure (model)", as the 7x console now labels
    it); #147 PEEPi → `resp.mechanics.peepi` (`ev.lungState.autoPeepCmH2O` stays the link's input, Engine label);
    #148 ΔP → `resp.mechanics.dp`; #149 PL → `resp.mechanics.plEi` / `plEe`, label **"PL (Pes-based, direct)"**
    ("PL,ei", "PL,ee"), with the normals **stated per context (F4 ruling)**: awake spontaneous PL,ee ≈ +5, PL,ei ≈ +8
    (West); supine anaesthetised/ventilated PL,ee −5 … +2, PL,ei < 20–25 (Talmor 2008, Loring 2010); #150 Pes →
    `resp.mechanics.pesEi` / `pesEe` with the label **"Pes (estimate)"**, the Name "Oesophageal pressure ESTIMATE —
    awake and spontaneous: the model's pleural pressure; supine ventilated/anaesthetised: 6.9 cmH2O + 0.22 cmH2O per BMI
    unit above 22.5 + the model's pleural-pressure change — not a balloon measurement" (R57), and the normals per
    context: awake spontaneous Pes,ee ≈ −5, Pes,ei ≈ −8 (West); supine anaesthetised/ventilated Pes,ee ≈ 5–10 (Owens
    2012 lean supine 6.9 ± 2.8; higher with BMI); #151 Cstat → `resp.mechanics.cstat` (+ `ev.lungState.complianceMlPerCmH2O` as "Crs (model)"); #152 Cdyn →
    `resp.mechanics.cdyn`; #155 Raw (Rinsp) → `resp.mechanics.rinsp`; #161 VD anat → `resp.vd.anat`; #162 VD app →
    `resp.vd.app`; #163 VD alv → `resp.vd.alv` (mL; the per-side fraction `lp.side.#.vdAlv` becomes "VD alv fraction
    (model)"); #164 VD phys → `resp.vd.phys`; #165 VD/VT → `resp.vd.vdvt` (Name "Enghoff dead-space fraction"); #166
    FRC → `resp.volumes.frc` (bedside, supine, awake → anaesthetised); #167–#176 RV, TLC, ERV, IC, VC, FVC, FEV₁,
    FEV₁/FVC, PEF, CC → `resp.volumes.{rv, tlc, erv, ic, vc, fvc, fev1, ratio, pef, cc}` — #167/#168 move OFF the
    model constants `RV_ML_KG`/`TLC_ML_KG` (D17: the model's internal P–V range, Engine rows if shown at all); #125
    VT gains `resp.mechanics.vt` (the delivered VT of the last breath, R50 F8); #145 PEEP stays `resp.driver.vent.peep`
    (7k publishes no second PEEP leaf).
  - new entries, **UNNUMBERED** (R50 F2: research/11 already uses 178–294 and Stage 9 never renumbers — Stage 9 Task 0
    Step 5 assigns the next free numbers after 294): **N1** "FRC (seated, PFT)" `resp.volumes.frcSit` mL, normal = ECSC
    predicted; **N2** "PĒCO₂" `resp.vd.peco2` "Mixed-expired CO2 tension" mmHg, normal ≈ 25–30; **N3** "EL/Ers"
    `resp.mechanics.elErs` "Lung share of respiratory-system elastance" ratio, normal ≈ 0.5–0.8 (Chiumello 2008); **N4**
    "V̇insp" `resp.mechanics.flow` "Mean inspiratory flow" L/s; **N5** "FET" `resp.volumes.fet` "Forced expiratory time" s,
    normal < 6 (ATS/ERS 2019); **N6** "Spirometry pattern" `resp.volumes.pattern` (normal / obstructive / restrictive /
    mixed); **N7** the `pred.*` rows "… predicted" (ECSC 1993 adults incl. PEF, Zapletal children; ECSC 16–20 y blend).
- **Future 7h PFT device (v1.1).** Everything a spirometer and a body box report is in truth: the (VC_u, τf,u) pairs
  for the F–V and V–T curves, FVC/FEV1/PEF/FET, TLC/RV/FRC seated with their ECSC/Zapletal predicted values, and the
  pattern. The device adds: effort and technique (a submaximal effort, a slow start, a cough — the model is a perfect
  effort), the ATS/ERS acceptability and repeatability checks, % predicted / z-scores (GLI with the LLN — the v1.1
  ruling on Q-7k-3), the rise from zero to PEF before the effort-independent curve (PEF is published, D9),
  DLCO (the lung's `dl` factor exists), an inspiratory limb (the F–V loop's inspiratory half: flow limited by
  inspiratory muscle strength `lp.pMax`, not modelled by 7k), and a bronchodilator-response report (7k's reversibility
  already emerges through FU-6's smooth-muscle state — prototype asthma +33 %). A REAL hold on the engine's internal
  VCV (D2) belongs there too if Ali wants hold waveforms.
- **V.1 (executing).** (1) 7k does not duplicate the link's `Measured` readouts (PIP, PLAT, autoPEEP, Pmean, VTE, MV,
  Cstat, Raw, P0.1); the engine's truth is the patient's lungs, the link's are the ventilator's measurements of its own
  single compartment — when both are shown, the glossary labels the link's as "(ventilator)". (2) The console's
  `lung-labels.test.ts` lists V.1's new `resp.lung.lp.waterShunt` as an unlabelled leaf (prototype base): please add
  its console row (V.1 Decision 24's "lung-water shunt, PEEP-responsive", %) in V.1's console housekeeping; 7k does not.
  (3) **Declared stale anchor (R50 F10):** the executed V.1 (E-V1-1, b83631e) moved the `gas/params.ts` import line
  of `l2/resp/pipeline.ts` (`coRefLpm`) that 7k's Task 4 Edit 1 anchors on — Task 0 Step 3 re-anchors it; the child
  row is re-measured on the merged main.
  (4) State the link's hold durations in V.1's docs (7k's truth uses 0.3 s inspiratory / 2 s expiratory holds, the
  lung module's `measure.ts` convention).
- **FU-6 (information).** 7k consumes, as FU-6 D20 left them: `frcNow` (bedside FRC), `resp.gaLvl` (via `frcNow`),
  the delivered VT (7k measures it directly from the unit volumes, which equals FU-6's post-Pmax `c.vt`), the VCV Pmax
  (a pressure-limited Ppeak reads Pmax), `respPleural`'s spontaneous swing (the Pes estimate on spontaneous breaths),
  `physicalDeadSpace()` through `deadSpace()`, and `resp.bd` through the re-resolved lung (FEV1 reversibility).
  **FU-6's Request 4 ("RV/TLC stay constants until 7k") is answered by D17:** the clinical TLC/RV are 7k's leaves;
  `TLC_ML_KG`/`RV_ML_KG` stay the lung model's internal P–V range (relabelled; re-basing them is Q-7k-6, v1.1).
- **Coverage audits (`../research/19-coverage-comorbidity.md`, CM).** Answered by D15: Pplat, PEEPtot and PEEPi
  (auto-PEEP) are truth leaves (`resp.mechanics.pplat`, `.peepTot`, `.peepi`, glossary #144/#146/#147), measured
  with the same hold-on-a-copy method the auditor used; the audit's runner can drop its private `holdPressure` probe
  and read truth for CM-02c, CM-07b and CM-07d after 7k merges.
- **FU-8 / FU-6 — the obese patient (D16).** 7k takes FU-8's single obese definition and FU-6's obese apnoea re-tune
  as given; the double-counted obese FRC (formerly Q-7k-6) belongs to that hand-over, not to 7k.
- **FU-7 (information).** 7k reads no drug output. FU-7's SKIP_PATH entries and 7k's share one line (union).
- **7j / v1.1 — closing capacity as a mechanism (Q-7k-4, ruled: v1.1).** 7k publishes CC (D10) but does not make CC > FRC close
  airways; 7j (pregnancy: CC > FRC supine) and the obesity/age atelectasis rows would key on `resp.volumes.cc` vs
  `resp.volumes.frc`.
- **Stage 8b (release).** The physiology overview describes the per-breath hold measurement on a copy, the Pes
  ESTIMATE and its formula, Enghoff VD/VT, the two FRCs (bedside vs seated PFT), ECSC/Zapletal predicted values and
  the forced-expiration model (τf,u = τf,ref·(RC ratio)^0.6).
- **R44 calibration pass (Ali):** Q-7k-1, -2, -5, -6 below and the constants PES_FRC_CMH2O 6.9, PES_BMI_SLOPE 0.22,
  FORCED_TAU_EXP 0.6, PEAK_TAU_EXP 0.3 (F3), the VOLUME_EFFECTS knots, the weakness terms (TLC 60 %, RV 150 % at no strength), HOLD_INSP_S 0.3,
  HOLD_EXP_S 2, the children's FVC 0.95·VC and FEV1/FVC 0.90.

## File map

| File | Owner (exception) | Task | Change |
|---|---|---|---|
| `packages/engine-core/src/l2/lung/volumes.ts` (new) | lungs (7k) | 1 | `predictedVolumes`, `VOLUME_EFFECTS`, `actualVolumes` (forced expiration), `closingCapacity`, `pattern` |
| `packages/engine-core/src/l2/lung/breath.ts` (new) | lungs (7k) | 2 | `breathMechanics`, `pesEstimate`, `expHold`/`inspHold` (measure.ts), `deadSpaceSet` |
| `packages/engine-core/src/l2/lung/state-event.ts` | lungs | 3 | `aeratedFrc()` — the one bedside FRC (byte-identical) |
| `packages/engine-core/src/l2/lung/params.ts` | lungs | 3 | comment: `TLC_ML_KG`/`RV_ML_KG` are the model's internal P–V range (D17) |
| `packages/engine-core/src/l2/gas/params.ts` | Stage 3 (**E-7k-3**) | 3 | `defaultHeightCm()` (additive) |
| `packages/engine-core/src/l2/resp/pipeline.ts` | Stage 3 (7k wiring) | 4 | imports; `RespState.{mechanics, vd, volumes, brk}`; `createBrk`; `breathStart`/`breathEnd`/`updateVolumes`/`pesNow`; two loop hooks; the 1 Hz call |
| `packages/engine-core/src/truth.ts` | 7x (**E-7k-1**) | 4 | SKIP_PATH `resp.brk`, `resp.lung.mp` + comment |
| `packages/engine-core/vite.config.ts` | CI | 4 | `SLOW` and `SLOW_A` += `test/engine/resp-mechanics.test.ts` (→ slow-a, F1 ruling) |
| `packages/engine-core/test/l2/lung/{volumes,breath}.test.ts` (new, fast) | — | 1, 2 | 13 + 7 tests |
| `packages/engine-core/test/engine/resp-mechanics.test.ts` (new, SLOW) | — | 4 | 13 tests (2 `it.fails`), nine shared rigs |
| `apps/demo/src/physiology-console/{organs,meta}.ts` | 7x console | 5 | the group, the prefixes, 43 CURATED rows (no PEEP/Breath rows, F8; short "est." Pes labels, F14), `kind` internal, the `peepTot` relabel |
| `apps/demo/src/physiology-console/{organs,lung-labels}.test.ts` | 7x console (**E-7k-2**) | 5 | 15 groups; the relabelled row |
| `apps/demo/src/physiology-console/mechanics-panel.test.ts` (new) | — | 5 | 11 tests incl. a live engine |
| `apps/demo/e2e/stage7k-mechanics.e2e.ts` (new) | — | 6 | CI smoke; JPEGs only with `PME_SHOTS=1` (F9) |
| `docs/gates/stage-7k.md` (new), `docs/gates/stage-7k/*.jpg` | — | 6, 7 | gate note, two JPEGs |

Not touched: `l2/lung/{lung,mechanics,measure,side,conditions}.ts` (7k reads them), `data/lung-pathology.ts` (the
volume effects live in 7k's own `VOLUME_EFFECTS`, so V.1's generated catalogue table does not move),
`packages/ventilator/**`, `l2/circ/**`, `l3/**`.

---

### Task 0: Base check — FU-6 and FU-7 on main, the worktree, the find blocks, the before-numbers

**Files:** none (the plan is committed in Step 2).

- [ ] **Step 1: Preconditions.** `git -C /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo fetch origin`,
  then `git log --oneline origin/main | grep -E 'FU-6|FU-7|fu-6|fu-7|V\.1|stage-v1'`: the FU-6 merge ("FU-6:
  respiratory integration"), the FU-7 merge ("FU-7: drug layer") and V.1 must all be there. If one is missing, STOP and
  report (R60 order). Then check the three things 7k reads from them:

```bash
grep -n "export function frcNow\|^function frcNow" packages/engine-core/src/l2/resp/pipeline.ts   # FU-6 R4 (private is fine: 7k calls it inside pipeline.ts)
grep -n "export function physicalDeadSpace" packages/engine-core/src/l2/gas/params.ts               # FU-4: THE series dead space
grep -n "pLimit" packages/engine-core/src/l2/lung/lung.ts | head -2                                 # FU-6 R7: the VCV Pmax
grep -n "hold: 'insp' | 'exp'" packages/ventilator/src/types.ts                                    # the link's holds (D2)
```

  If `frcNow` is gone or renamed, STOP and report (D6 reads the continuous awake → anaesthetised FRC). If
  `physicalDeadSpace` moved, follow it (the pipeline's `deadSpace()` is what 7k calls; D5).
- [ ] **Step 2: Worktree, branch, plan.**

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git worktree add ../scratch/wt-stage-7k -b stage-7k-respiratory-mechanics origin/main
cd ../scratch/wt-stage-7k && npx -y pnpm@9.15.9 install --frozen-lockfile
mkdir -p "<scratchpad>/stage-7k"
cp ../../repo/docs/plans/stage-7k-respiratory-mechanics.md docs/plans/
git add docs/plans/stage-7k-respiratory-mechanics.md && git commit -m "docs(7k): respiratory mechanics and lung volumes plan

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push -u origin stage-7k-respiratory-mechanics
```

- [ ] **Step 3: Re-verify every find block on the merged main** (written against `c776524` + V.1 + FU-6 applied). The
  verifier is FU-4's (`scratch/plans-backup/fu-4-verify.py`; it parses this plan's `#### Create` / `#### Modify` /
  `Edit N — find` / `replace with` blocks and applies them in task order):

```bash
V="<scratchpad>/stage-7k/verify"; rm -rf "$V"; mkdir -p "$V"
git archive HEAD | tar -x -C "$V"
python3 ../plans-backup/fu-4-verify.py docs/plans/stage-7k-respiratory-mechanics.md "$V" --dry
```

  Expected on the prototype base: `8 creates, 23 edits, 0 errors` (Self-review). On the merged main every error line
  names a task, a file and the block's first 90 characters: locate the same statement by its quoted comment, make the
  SAME change there when you reach that task, and list it in the gate note §8. Expected re-anchorings: FU-7's
  SKIP_PATH entries (E-FU7-8) on the `src/truth.ts` line — keep the UNION, add 7k's two entries at the end; FU-7's
  `vite.config.ts` SLOW entries after `af-pulse-deficit` — add 7k's entry at the end of `SLOW` (and to `SLOW_A`);
  the `gas/params.ts` import line of `l2/resp/pipeline.ts` — **the EXECUTED V.1 already moved it** (R50 F10: E-V1-1,
  b83631e on `origin/stage-v1-ventilator-followup`, adds `coRefLpm`; the prototype base carried V.1's PLAN blocks, where
  FU-4 had pre-empted that line), and FU-7 may add names too — add 7k's three names (`apparatusDeadSpaceMl`,
  `defaultHeightCm`, `FRC_AWAKE_ML_KG`) to the merged line. Measured by the R50 reviewer on the live V.1 branch: 4
  blocks fail there — the 3 "(FU-6 line)" anchors and this import.
- [ ] **Step 4: Before-numbers** (nothing asserted; the gate note's "before" column):

```bash
cd packages/engine-core
CI=1 PME_TEST_SET=fast npx vitest run > "<scratchpad>/stage-7k/fast-before.log" 2>&1; grep -E "Test Files|Tests " "<scratchpad>/stage-7k/fast-before.log"
grep -E "^ FAIL" "<scratchpad>/stage-7k/fast-before.log" | sort > "<scratchpad>/stage-7k/fast-before-fails.txt"
CI=1 npx vitest run test/engine/truth-event.test.ts 2>&1 | grep -E "leaves"
cd ../validation && npx vitest run test/perf/tick-bench.test.ts 2>&1 | tail -3
```

  Record: the fast-set failure list (7k must add none), the real and 12-drug truth leaf counts (prototype base: 1 321 /
  2 038 — FU-7 adds its own, paid by its own SKIP_PATH), and the tick-bench p50 (prototype base 0.53 ms). The
  prototype base had 7 fast-set failures, ALL from applying V.1's and FU-6's plans mechanically on a post-FU-4 tree
  (their executors fix them): `arrest-etco2`, `lung-circ` COPD RR 26, `lung-state` V.1 pleural, `obstructive-aliases`
  massive PE, `resp-capno-deadspace`, `resp-child-rest` CPR, `v1-lung-seams` lung water; the console's
  `lung-labels.test.ts` also listed V.1's unlabelled `resp.lung.lp.waterShunt` (Requests → V.1). The real merged main
  should have none of them; if it has, they are not 7k's. **Re-measure the child** (R50 F10): V.1's executed E-V1-1 CO
  reference may move the 4 y child's φ and PaCO2 — record the ventilated child's lungState compliance, resistance, dead
  space and PaCO2 on the merged main before 7k's code (the rig of Task 4's child row) as the child's "before".
- [ ] **Step 5: The byte-identity rig.** Save this scratch test (never committed) — it hashes every event and the
  final state of three ventilated rigs, so Task 4 can prove 7k changed no existing number:

```bash
mkdir -p packages/engine-core/test/scratch-7k
cat > packages/engine-core/test/scratch-7k/same.test.ts <<'EOF'
import { it } from 'vitest';
import { createHash } from 'node:crypto';
import { rig6, runTo, ventRig } from '../helpers/fu6.ts';
it('same', async () => {
  const out: string[] = [];
  for (const conds of [[], [{ id: 'copd', severity: 0.75 }], [{ id: 'ptxTension', severity: 0.8, side: 'R' }]]) {
    const e = rig6({ ageY: 40, weightKg: 70, heightCm: 175, sex: 'M', lungConditions: conds as never });
    const h = createHash('sha256');
    e.on((x: { type: string }) => { if (x.type !== 'truth') h.update(JSON.stringify(x)); });
    await ventRig(e, {});
    await runTo(e, 240);
    const st = (e as unknown as { st: Record<string, any> }).st;
    h.update(JSON.stringify([st.hemo.circ?.p, st.resp.co2, st.resp.o2, st.resp.lung.mech, st.blood?.out]));
    out.push(h.digest('hex').slice(0, 16));
  }
  console.log('HASH', out.join(' '));
}, 300000);
EOF
(cd packages/engine-core && CI=1 npx vitest run test/scratch-7k/same.test.ts 2>&1 | grep '^HASH') | tee "<scratchpad>/stage-7k/hash-before.txt"
```

  Keep `test/scratch-7k/` untracked (never `git add` it; delete it in Task 7).

### Task 1: Predicted and actual lung volumes and the forced expiration (lungs; new pure module; PROTOTYPED)

**Files:** Create `packages/engine-core/src/l2/lung/volumes.ts`, `packages/engine-core/test/l2/lung/volumes.test.ts`.

**Why:** D7–D11. Pure functions over the resolved lung (`resolveLung`) — no engine change yet.

- [ ] **Step 1: Write the test** (it fails: the module does not exist).

#### Create `packages/engine-core/test/l2/lung/volumes.test.ts`

```ts
// Stage 7k (R57): predicted volumes (ECSC 1993 adults, Zapletal children), actual volumes by pathology and the
// forced-expiration model (FEV1, FVC, PEF, FEV1/FVC). Pure: resolveLung → actualVolumes, no engine.
import { describe, expect, it } from 'vitest';
import { resolveLung } from '../../../src/l2/lung/conditions.ts';
import { actualVolumes, closingCapacity, pattern, predictedVolumes, type VolPatient } from '../../../src/l2/lung/volumes.ts';
import { gasPatient } from '../../../src/l2/gas/params.ts';
import type { LungConditionSpec } from '../../../src/types-lung.ts';

const MAN: VolPatient & { weightKg: number } = { ageY: 40, sex: 'M', heightCm: 175, weightKg: 70 };
const OLD: VolPatient & { weightKg: number } = { ageY: 65, sex: 'M', heightCm: 175, weightKg: 70 };
function vols(p: VolPatient & { weightKg: number }, specs: LungConditionSpec[]) {
  const { lp } = resolveLung(specs, gasPatient(p).ibwKg);
  const pred = predictedVolumes(p);
  const a = actualVolumes(pred, lp, specs, lp.side.map((s) => 1 - s.atel - s.consol));
  const pct = (x: number, y: number) => Math.round((100 * x) / y);
  console.log(`VOL ${JSON.stringify(specs.map((s) => `${s.id} ${s.severity}`))}: TLC ${pct(a.tlc, pred.tlc)} % RV ${pct(a.rv, pred.rv)} % FRCsit ${Math.round(a.frcSit)} ERV ${Math.round(a.erv)} FVC ${pct(a.fvc, pred.fvc)} % FEV1 ${pct(a.fev1, pred.fev1)} % FEV1/FVC ${a.ratio.toFixed(2)} PEF ${pct(a.pef, pred.pef)} % ${pattern(a, pred)}`);
  return { a, pred, fev1Pct: (100 * a.fev1) / pred.fev1, fvcPct: (100 * a.fvc) / pred.fvc };
}

describe('Stage 7k: predicted volumes', () => {
  it('ECSC 1993, man 40 y 175 cm: TLC 6.90, RV 1.94, FRC 3.41, FVC 4.70, FEV1 3.87 L (Stocks & Quanjer 1995 Table 8)', () => {
    const p = predictedVolumes(MAN);
    expect(p.tlc).toBeCloseTo(6902.5, 0);
    expect(p.rv).toBeCloseTo(1942.5, 0);
    expect(p.frc).toBeCloseTo(3405, 0);
    expect(p.fvc).toBeCloseTo(4700, 0);
    expect(p.fev1).toBeCloseTo(3875, 0);
    expect(p.vc).toBeCloseTo(p.tlc - p.rv, 6);
    expect(p.pef * 0.06).toBeCloseTo(550.5, 0); // ECSC PEF 6.14H − 0.043A + 0.15 L/s = 9.18 L/s
  });
  it('16–20 y: Zapletal and ECSC blend linearly (no step at the 18th birthday, F11)', () => {
    const at = (a: number) => predictedVolumes({ ageY: a, sex: 'M', heightCm: 175 }).tlc;
    expect(at(18)).toBeCloseTo((at(16) + predictedVolumes({ ageY: 25, sex: 'M', heightCm: 175 }).tlc) / 2, 0);
    expect(Math.abs(at(18.01) - at(17.99))).toBeLessThan(10); // ≈ 280 mL/y inside the blend, no 1 L step
  });
  it('ECSC 1993, woman 40 y 165 cm; ages 20–25 enter as 25, > 70 as 70', () => {
    const w = predictedVolumes({ ageY: 40, sex: 'F', heightCm: 165 });
    expect(w.tlc).toBeCloseTo(5100, 0);
    expect(w.rv).toBeCloseTo(1626.5, 0);
    expect(predictedVolumes({ ageY: 21, sex: 'M', heightCm: 175 }).rv).toBe(predictedVolumes({ ageY: 25, sex: 'M', heightCm: 175 }).rv);
    expect(predictedVolumes({ ageY: 85, sex: 'M', heightCm: 175 }).rv).toBe(predictedVolumes({ ageY: 70, sex: 'M', heightCm: 175 }).rv);
  });
  it('Zapletal, boy 4 y 102 cm: TLC ≈ 1.45 L, RV ≈ 0.40 L, FRC ≈ 0.68 L, FEV1/FVC 0.90', () => {
    const c = predictedVolumes({ ageY: 4, sex: 'M', heightCm: 102 });
    expect(c.tlc).toBeGreaterThan(1400);
    expect(c.tlc).toBeLessThan(1500);
    expect(c.rv).toBeGreaterThan(380);
    expect(c.rv).toBeLessThan(420);
    expect(c.frc).toBeGreaterThan(650);
    expect(c.frc).toBeLessThan(720);
    expect(c.ratio).toBe(0.9);
  });
});

describe('Stage 7k: actual volumes and the forced expiration', () => {
  it('a healthy lung reads its predicted values: FVC and FEV1 100 ± 1 %, FEV1/FVC = predicted, normal pattern', () => {
    const r = vols(MAN, []);
    expect(r.a.tlc).toBeCloseTo(r.pred.tlc, 6);
    expect(r.a.rv).toBeCloseTo(r.pred.rv, 6);
    expect(Math.abs(r.fvcPct - 100)).toBeLessThanOrEqual(1);
    expect(Math.abs(r.fev1Pct - 100)).toBeLessThanOrEqual(1);
    expect(r.a.ratio).toBeCloseTo(r.pred.ratio, 2);
    expect(pattern(r.a, r.pred)).toBe('normal');
    expect(r.a.pef / r.pred.pef).toBeCloseTo(1, 2); // PEF 100 % predicted (ECSC 551 L/min)
  });
  it('COPD GOLD 2–4 (severity 0.5/0.75/1): FEV1 50–79 / 30–49 / < 30 % pred, FEV1/FVC < 0.70, obstructive', () => {
    const g2 = vols(OLD, [{ id: 'copd', severity: 0.5 }]);
    const g3 = vols(OLD, [{ id: 'copd', severity: 0.75 }]);
    const g4 = vols(OLD, [{ id: 'copd', severity: 1 }]);
    expect(g2.fev1Pct).toBeGreaterThanOrEqual(50);
    expect(g2.fev1Pct).toBeLessThan(80);
    expect(g3.fev1Pct).toBeGreaterThanOrEqual(30);
    expect(g3.fev1Pct).toBeLessThan(50);
    expect(g4.fev1Pct).toBeLessThan(30);
    for (const g of [g2, g3, g4]) {
      expect(g.a.ratio).toBeLessThan(0.7);
      expect(pattern(g.a, g.pred)).toBe('obstructive');
    }
    expect(g4.a.rv / g4.a.tlc).toBeGreaterThan(0.55); // hyperinflation and gas trapping
    expect(g4.a.fvc).toBeLessThan(0.95 * g4.a.vc); // FVC < VC: the slow units' tail is trapped at the end of the test
  });
  it.fails('COPD GOLD 1 (severity 0.25): FEV1 ≥ 80 % pred with FEV1/FVC < 0.70 — measured 71 % (the catalogue\'s GOLD 1 rawExp 1.5; Q-7k-2)', () => {
    const g1 = vols(OLD, [{ id: 'copd', severity: 0.25 }]);
    expect(g1.a.ratio).toBeLessThan(0.7);
    expect(g1.fev1Pct).toBeGreaterThanOrEqual(80);
  });
  it('ILD grades (0.3/0.6/0.9): FVC 70–80 / 50–70 / < 50 % pred, FEV1/FVC ≥ 0.70, restrictive', () => {
    const [m, mo, e] = [0.3, 0.6, 0.9].map((s) => vols({ ...OLD, ageY: 60 }, [{ id: 'ild', severity: s }]));
    expect(m!.fvcPct).toBeGreaterThanOrEqual(70);
    expect(m!.fvcPct).toBeLessThanOrEqual(80);
    expect(mo!.fvcPct).toBeGreaterThanOrEqual(50);
    expect(mo!.fvcPct).toBeLessThanOrEqual(70);
    expect(e!.fvcPct).toBeLessThan(50);
    for (const g of [m!, mo!, e!]) {
      expect(g.a.ratio).toBeGreaterThanOrEqual(0.7);
      expect(pattern(g.a, g.pred)).toBe('restrictive');
    }
  });
  it('PEF falls with obstruction as FEV1 does (F3): PEF % pred within ±15 points of FEV1 % pred in acute severe asthma and COPD GOLD 2/3; acute severe asthma PEF 33–50 % (BTS/SIGN 2019, GINA)', () => {
    const cases = [vols(MAN, [{ id: 'asthma', severity: 1 }]), vols(OLD, [{ id: 'copd', severity: 0.5 }]), vols(OLD, [{ id: 'copd', severity: 0.75 }])];
    for (const r of cases) expect(Math.abs((100 * r.a.pef) / r.pred.pef - r.fev1Pct)).toBeLessThanOrEqual(15);
    const asthma = cases[0]!;
    expect(asthma.a.pef / asthma.pred.pef).toBeGreaterThanOrEqual(0.33);
    expect(asthma.a.pef / asthma.pred.pef).toBeLessThanOrEqual(0.5);
  });
  it('acute severe asthma (severity 1): FEV1 < 50 % pred, RV > 150 % pred, ERV > 0 (hyperinflated FRC)', () => {
    const r = vols(MAN, [{ id: 'asthma', severity: 1 }]);
    expect(r.fev1Pct).toBeLessThan(50);
    expect(r.a.rv / r.pred.rv).toBeGreaterThan(1.5);
    expect(r.a.erv).toBeGreaterThan(0);
  });
  it('obesity (BMI 40): TLC ≥ 80 % pred (not restrictive), ERV < 50 % of predicted ERV, FEV1/FVC normal', () => {
    const r = vols({ ...MAN, weightKg: 122.5 }, [{ id: 'obesity', severity: 1 }]);
    expect(r.a.tlc / r.pred.tlc).toBeGreaterThanOrEqual(0.8);
    expect(r.a.erv / (r.pred.frc - r.pred.rv)).toBeLessThan(0.5);
    expect(r.a.ratio).toBeGreaterThanOrEqual(0.7);
  });
  it('simple pneumothorax (30 % of the right lung collapsed): TLC and VC fall by the collapsed share (≈ 0.55 × 0.3)', () => {
    const r = vols(MAN, [{ id: 'ptxSimple', severity: 0.3, side: 'R' }]);
    expect(r.a.tlc / r.pred.tlc).toBeCloseTo(1 - 0.55 * 0.3, 2);
  });
  it('closing capacity equals the supine FRC at 44 y and the seated FRC at 66 y (Leblanc 1970)', () => {
    const p = predictedVolumes(MAN);
    expect(closingCapacity(p, 44, 2100)).toBeCloseTo(2100, 6);
    expect(closingCapacity(p, 66, 2100)).toBeCloseTo(p.frc, 6);
  });
});
```

- [ ] **Step 2: Run it — expect a module-not-found failure.** `CI=1 npx vitest run test/l2/lung/volumes.test.ts` (in
  `packages/engine-core`).
- [ ] **Step 3: Create the module.**

#### Create `packages/engine-core/src/l2/lung/volumes.ts`

```ts
// Stage 7k (R57): static lung volumes and the forced expiration. Pure functions; mL and s.
//
// PREDICTED (seated, healthy, the "% predicted" reference a PFT lab prints):
//   adults 18–70 y: ECSC/ERS 1993 (Quanjer et al., Eur Respir J 1993;6 Suppl 16:5 — Table 8 of Stocks & Quanjer,
//     Eur Respir J 1995;8:492, for TLC/RV/FRC; the ECSC spirometry equations for FVC/FEV1), H in metres; age 18–25 is
//     entered as 25 and age > 70 as 70 (the equations' stated range); height is clamped to 1.45–1.95 m.
//   children < 18 y: Zapletal et al. (plethysmographic; the ERS recommendation in Stocks & Quanjer 1995, Table 7),
//     power laws in stature (cm); below the 5 y lower bound they are extrapolated [ENG]. Children's spirometry: FVC =
//     0.95 × VC and FEV1/FVC 0.90 [ENG; preschool FEV1/FVC ≈ 0.9 (GLI-2012 direction)]. 16–20 y: the two sets are
//     BLENDED linearly (the switch at 18 y otherwise jumps TLC +15–24 % at one birthday) [ENG]. v1.0 uses ECSC with the
//     fixed FEV1/FVC ratio (orchestrator ruling on Q-7k-3); GLI with the lower limit of normal is v1.1. FEV1/FVC
//     predicted is FEV1pred/FVCpred (82.4 % at 40 y), not ECSC's separate ratio equation (87.21 − 0.18A = 80.0 %).
//   PEF predicted: ECSC (men 6.14H − 0.043A + 0.15, women 5.50H − 0.030A − 1.11 L/s); children: the model's own
//     healthy peak (FVCpred/τf,ref) [ENG].
// ACTUAL (this patient today) = predicted × the pathology the lung resolves:
//   aeration   — lung that holds no gas (consolidation, compression, collapse: the conditions' atel + consol) scales
//                TLC, RV and VC by the whole-lung aerated fraction;
//   VOLUME_EFFECTS — the conditions whose static-volume change is not an aeration change (hyperinflation and gas
//                trapping in COPD/asthma, parenchymal and chest-wall restriction), severity knots with their source;
//   strength   — respiratory-muscle weakness (lp.pMax < 1: neuromuscular weakness, diaphragm paralysis) lowers TLC and
//                raises RV (the classic restrictive pattern of weakness) [ENG].
// Two FRCs, two owners, two labels: the BEDSIDE FRC (supine, awake → anaesthetised: FU-6's `frcNow` × the conditions'
// `frc` × aeration — the O2 store, not computed here) and the PFT lab's SEATED FRC below (predicted × pathology), which
// ERV (= FRCsit − RV) and IC (= TLC − FRCsit) are defined against, as a lab reports them (ATS/ERS 2005 lung volumes).
//
// THE FORCED EXPIRATION (FEV1, FVC, PEF, FEV1/FVC) — a model, not a lookup. From TLC each lung unit empties toward
// RV with its own forced-expiratory time constant τf,u (the classic "lung as emptying compartments" view of the
// maximal expiratory flow–volume curve: Mead 1978; Pride, Permutt, Riley & Bromberger-Barnea 1967 — flow limited by
// the unit's elastic recoil over its upstream resistance, V̇max ≈ (V − RV)/τf):
//   τf,u = τf,ref × (Rex,u·Crs,u) / (Rex·Crs)healthy        (the unit's expiratory R·C against the same patient's
//                                                             healthy lung — the tube is not in a spirometer)
//   τf,ref = −1 / ln(1 − FEV1/FVC predicted)                   (so the healthy patient reproduces the reference ratio)
//   V_u(t) = VC_u·e^(−t/τf,u);  FEV1 = Σ VC_u(1 − e^(−1/τf,u))
//   FVC = Σ VC_u(1 − e^(−T/τf,u)), T = end of test: total flow < 0.025 L/s or 15 s (ATS/ERS 2019 end-of-forced-
//   expiration criteria) — slow units still holding gas at T is gas trapping (FVC < VC).
// PEF is NOT the curve's t = 0 value: the peak is effort-dependent and wave-speed limited in the CENTRAL airways
// (Dawson & Elliott 1977 J Appl Physiol 43:498; Mead 1978), so it is less sensitive to peripheral resistance than the
// rest of the forced expiration: PEF = PEFpred × Σ VC_u·r_u^(−PEAK_TAU_EXP) / FVCpred, r_u = (Rex,u·Crs,u)/(Rex·Crs)
// healthy — restriction scales it by the forced VC, obstruction by a weaker power of the R·C ratio than FEV1's.
// PEAK_TAU_EXP [ENG; fit: PEF % predicted tracks FEV1 % predicted within ±15 points in acute severe asthma and COPD
// GOLD 2–4 (BTS/SIGN 2019 and GINA grade acute asthma by PEF % of predicted/best: 33–50 % acute severe, < 33 %
// life-threatening)]. The 7h PFT device draws the rise to PEF and then joins the effort-independent curve below.
// Obstruction (raised R, fast/slow heterogeneity: asthma, COPD, bronchospasm) therefore lowers FEV1/FVC and scoops the
// flow–volume curve (the slow units' tail); restriction lowers FVC and FEV1 together and keeps the ratio. The four
// (VC_u, τf,u) pairs are published so a PFT device (7h) redraws the loop: V̇(t) = Σ VC_u/τf,u·e^(−t/τf,u).
import type { LungConditionSpec } from '../../types-lung.ts';
import { conditionData, effectValue, interp } from './conditions.ts';
import type { Knots } from '../../../data/lung-pathology.ts';
import { mechParams, healthyParams, type LungParams } from './side.ts';
import { N_UNITS, SIDE_SHARE } from './params.ts';
import { complianceAt } from './venegas.ts';

export interface VolPatient { ageY: number; sex: 'M' | 'F'; heightCm: number }
export interface Predicted { tlc: number; rv: number; frc: number; vc: number; fvc: number; fev1: number; ratio: number; pef: number }

/** Children below this age use the Zapletal power laws (Stocks & Quanjer 1995 Table 7, 5–18 y). */
export const ADULT_FROM_Y = 18;

/** 16–20 y: Zapletal and ECSC blended linearly by age (F11) [ENG]. */
export const BLEND_FROM_Y = 16;
export const BLEND_TO_Y = 20;

export function predictedVolumes(p: VolPatient): Predicted {
  if (p.ageY > BLEND_FROM_Y && p.ageY < BLEND_TO_Y) {
    const w = (p.ageY - BLEND_FROM_Y) / (BLEND_TO_Y - BLEND_FROM_Y);
    const c = predictedRaw({ ...p, ageY: BLEND_FROM_Y });
    const a = predictedRaw({ ...p, ageY: ADULT_FROM_Y });
    const m = (k: keyof Predicted) => (1 - w) * c[k] + w * a[k];
    return { tlc: m('tlc'), rv: m('rv'), frc: m('frc'), vc: m('vc'), fvc: m('fvc'), fev1: m('fev1'), ratio: m('fev1') / m('fvc'), pef: m('pef') };
  }
  return predictedRaw(p);
}

function predictedRaw(p: VolPatient): Predicted {
  const male = p.sex !== 'F';
  if (p.ageY < ADULT_FROM_Y) {
    const h = Math.max(45, p.heightCm);
    // Zapletal (plethysmography), mL, H in cm — boys / girls
    const tlc = male ? 9.96e-3 * h ** 2.5698 : 9.17e-3 * h ** 2.5755;
    const frc = male ? 3.22e-3 * h ** 2.6523 : 3.7e-3 * h ** 2.6149;
    const rv = 21.06e-3 * h ** 2.1314;
    const vc = tlc - rv;
    const fvc = 0.95 * vc;
    return { tlc, rv, frc, vc, fvc, fev1: 0.9 * fvc, ratio: 0.9, pef: fvc / tauRef(0.9) };
  }
  const a = Math.min(70, Math.max(25, p.ageY));
  const h = Math.min(male ? 1.95 : 1.8, Math.max(male ? 1.55 : 1.45, p.heightCm / 100));
  const L = 1000;
  const tlc = L * (male ? 7.99 * h - 7.08 : 6.6 * h - 5.79);
  const rv = L * (male ? 1.31 * h + 0.022 * a - 1.23 : 1.81 * h + 0.016 * a - 2.0);
  const frc = L * (male ? 2.34 * h + 0.01 * a - 1.09 : 2.24 * h + 0.001 * a - 1.0);
  const fvc = L * (male ? 5.76 * h - 0.026 * a - 4.34 : 4.43 * h - 0.026 * a - 2.89);
  const fev1 = L * (male ? 4.3 * h - 0.029 * a - 2.49 : 3.95 * h - 0.025 * a - 2.6);
  const pef = L * (male ? 6.14 * h - 0.043 * a + 0.15 : 5.5 * h - 0.03 * a - 1.11); // mL/s
  return { tlc, rv, frc, vc: tlc - rv, fvc, fev1, ratio: fev1 / fvc, pef };
}

/**
 * Static-volume effects that are not an aeration change, as multipliers on the predicted TLC and RV at severity knots
 * (piecewise linear, like the catalogue's). Each row cites its source; [ENG] rows name their fit target.
 */
export const VOLUME_EFFECTS: Readonly<Record<string, { tlc?: Knots; rv?: Knots; frc?: Knots; gaAtel?: true; src: string }>> = {
  // hyperinflation and gas trapping: GOLD 1–4 at severity 0.25/0.5/0.75/1
  copd: { tlc: [[0, 1], [0.25, 1.0], [0.5, 1.05], [0.75, 1.15], [1, 1.25]], rv: [[0, 1], [0.25, 1.15], [0.5, 1.4], [0.75, 1.75], [1, 2.2]], frc: [[0, 1], [0.25, 1.05], [0.5, 1.15], [0.75, 1.35], [1, 1.6]], src: 'COPD hyperinflation: TLC > 120 % and RV > 150–250 % pred in severe disease (ATS/ERS 2005 interpretation, Pellegrino; O\'Donnell 2001 AJRCCM 164:770 direction) [ENG knots; fit: GOLD 3–4 RV/TLC > 0.55]' },
  asthma: { tlc: [[0, 1], [0.6, 1], [1, 1.1]], rv: [[0, 1], [0.4, 1.1], [0.6, 1.2], [1, 2.0]], frc: [[0, 1], [0.6, 1.05], [1, 1.3]], src: 'acute severe asthma: RV ≈ 200 % pred (gas trapping; McFadden & Lyons 1968 J Clin Invest 47:1566 direction) [ENG knots]' },
  bronchospasm: { rv: [[0, 1], [1, 1.8]], frc: [[0, 1], [1, 1.25]], src: 'acute bronchospasm traps gas like acute asthma [ENG, the asthma row at the same airway resistance]' },
  // restriction
  ild: { tlc: [[0, 1], [0.3, 0.75], [0.6, 0.6], [0.9, 0.45], [1, 0.45]], rv: [[0, 1], [0.3, 0.75], [0.6, 0.6], [0.9, 0.45], [1, 0.45]], src: "the catalogue's §7 GRADES: FVC 70–80 / 50–70 / < 50 % at severity 0.3/0.6/0.9 → TLC and RV at the band middles 0.75/0.6/0.45 (proportional restriction, RV/TLC preserved) [ENG; the §7 'FRC / TLC' row's 0.85/0.7/0.55 stays the O2-store FRC multiplier]" },
  chestWall: { tlc: [[0, 1], [0.33, 0.85], [0.67, 0.7], [1, 0.5]], src: "catalogue §9 row 'FRC, VC' 0.85/0.7/0.5 (Stoelting 8e ch. 3); RV preserved (RV/TLC rises) [TXT]" },
  obesity: { tlc: [[0, 1], [0.5, 0.97], [1, 0.9]], frc: [[0, 1], [0.5, 0.85], [1, 0.7]], gaAtel: true, src: 'obesity: TLC falls little (≈ 90 % at BMI 40) while ERV falls steeply (Jones & Nzekwu 2006 Chest 130:827) — seated FRC 70 % and ERV ≈ 25–35 % at BMI 40 [ENG knots]' },
  pregnancy: { tlc: [[0, 1], [1, 0.95]], rv: [[0, 1], [0.33, 1], [1, 0.8]], frc: [[0, 1], [0.33, 1], [1, 0.8]], gaAtel: true, src: 'term pregnancy: TLC −0–5 %, RV −20 %, FRC −20 % (Hegewald & Crapo 2011 Clin Chest Med 32:1) [TXT]' },
};

export interface Actual {
  tlc: number; rv: number; vc: number;
  /** Seated FRC (the PFT lab's), ERV and IC relative to it. The bedside (supine, awake → anaesthetised) FRC is the lung's own, not this. */
  frcSit: number; erv: number; ic: number;
  fvc: number; fev1: number; ratio: number; pef: number; fet: number;
  /** Forced-expiration units: VC_u (mL) and τf,u (s) — V̇(t) = Σ v[u]/tau[u]·e^(−t/tau[u]). */
  fe: { v: number[]; tau: number[] };
}

/** Forced-expiratory sensitivity to the unit's passive R·C ratio [ENG; fit: the catalogue's COPD grades = GOLD FEV1 ≥ 80 / 50–79 / 30–49 / < 30 % pred with FEV1/FVC < 0.70, and the ILD grades' FVC bands]. */
export const FORCED_TAU_EXP = 0.6;
/** F3: the peak's weaker dependence on the R·C ratio [ENG; fit as the header says — 0.2/0.3/0.4/0.5 tried: 0.3 puts acute severe asthma at PEF 39 % with FEV1 35 % and COPD GOLD 1–4 at 72/58/47/35 % with FEV1 71/55/41/28 %]. */
export const PEAK_TAU_EXP = 0.3;
/** τf,ref (s) for a predicted FEV1/FVC. */
export function tauRef(ratio: number): number {
  return -1 / Math.log(1 - Math.min(0.95, Math.max(0.3, ratio)));
}
/** ATS/ERS 2019 end of forced expiration: flow < 25 mL/s, or 15 s. */
export const EOFE_FLOW_ML_S = 25;
export const EOFE_MAX_S = 15;

/** Unit expiratory time constant (s) as the lung module defines it: Rex × (unit lung C in series with its chest-wall share). */
function unitTaus(lp: LungParams, aer: number[]): { tau: number[]; share: number[] } {
  const mp = mechParams(lp, aer, [false, false]);
  const tau: number[] = [];
  const share: number[] = [];
  for (let u = 0; u < N_UNITS; u++) {
    const un = mp.units[u]!;
    const c = complianceAt(un.sig, 0);
    const crs = 1 / (1 / Math.max(1e-3, c) + 1 / (lp.ccw * (SIDE_SHARE[u >> 1] as number)));
    tau.push(un.rIn < 1e3 ? un.rEx * crs : Infinity);
    const sp = lp.side[u >> 1]!;
    share.push((SIDE_SHARE[u >> 1] as number) * (aer[u >> 1] as number) * ((u & 1) === 1 ? sp.fSlow : 1 - sp.fSlow));
  }
  return { tau, share };
}

/** The healthy reference unit τ per IBW (F16: cached — it depends on the IBW only). */
const REF_TAU = new Map<number, number>();
function refTau(ibwKg: number): number {
  let t = REF_TAU.get(ibwKg);
  if (t === undefined) { t = unitTaus(healthyParams(ibwKg), [1, 1]).tau[0] as number; if (REF_TAU.size < 64) REF_TAU.set(ibwKg, t); }
  return t;
}
/** Non-aerated share the GA/supine-only conditions (`gaAtel`: induction and supine atelectasis — not a seated PFT loss) add. */
function gaAtelShare(specs: readonly LungConditionSpec[]): number {
  let x = 0;
  for (const s of specs) {
    if (!VOLUME_EFFECTS[s.id]?.gaAtel || !(s.severity > 0)) continue;
    for (const e of conditionData(s.id)?.effects ?? []) if (e.key === 'atel' || e.key === 'consol') x += effectValue(e, Math.min(1, s.severity));
  }
  return x;
}

/**
 * This patient's static volumes and forced expiration now. `frc` = the lung's current FRC (mL, from the resp
 * pipeline); `lp` = the resolved lung; `specs` = the conditions (for VOLUME_EFFECTS); `aerCond` = the conditions'
 * aerated fraction per side (1 − atel − consol, before induction atelectasis).
 */
export function actualVolumes(pred: Predicted, lp: LungParams, specs: readonly LungConditionSpec[], aerCond: number[]): Actual {
  let tlcM = 1;
  let rvM = 1;
  let frcM = 1;
  let frcOwn = false;
  for (const s of specs) {
    const v = VOLUME_EFFECTS[s.id];
    if (!v || !(s.severity > 0)) continue;
    const sev = Math.min(1, s.severity);
    if (v.tlc) tlcM *= interp(v.tlc, sev);
    if (v.rv) rvM *= interp(v.rv, sev);
    if (v.frc) { frcM *= interp(v.frc, sev); frcOwn = true; }
  }
  if (!frcOwn) frcM = lp.frcMult; // conditions without a seated row: the catalogue's own FRC multiplier
  // F13: a seated PFT does not see the GA/supine atelectasis of the obesity and pregnancy rows
  const aerW = Math.min(1, SIDE_SHARE[0] * (aerCond[0] as number) + SIDE_SHARE[1] * (aerCond[1] as number) + gaAtelShare(specs));
  const weak = Math.min(1, Math.max(0, lp.pMax)); // respiratory-muscle strength
  const tlc = pred.tlc * tlcM * aerW * (0.6 + 0.4 * weak); // [ENG] weakness: TLC 60 % at no strength
  const rv = Math.min(tlc * 0.95, pred.rv * rvM * aerW * (1 + 0.5 * (1 - weak))); // [ENG] weakness: RV 150 %
  const vc = Math.max(0, tlc - rv);
  const frcSit = Math.min(tlc, Math.max(rv, pred.frc * frcM * aerW));
  // forced expiration
  const { tau: tauU, share } = unitTaus(lp, aerCond);
  const tauH = refTau(lp.ibwKg);
  const tauF0 = tauRef(pred.ratio);
  const sSum = share.reduce((a, b) => a + b, 0) || 1;
  const vcF = vc * Math.min(1, pred.fvc / Math.max(1, pred.vc)); // the forced VC: dynamic compression of the healthy lung (FVC < VC by the reference equations' own margin)
  const v = share.map((s) => (vcF * s) / sSum);
  const tau = tauU.map((t) => (Number.isFinite(t) ? tauF0 * (t / tauH) ** FORCED_TAU_EXP : 1e3));
  const pef = (pred.pef * v.reduce((a, vu, u) => a + (Number.isFinite(tauU[u] as number) ? vu * ((tauU[u] as number) / tauH) ** -PEAK_TAU_EXP : 0), 0)) / Math.max(1, pred.fvc);
  const flowAt = (t: number) => v.reduce((a, vu, u) => a + (vu / (tau[u] as number)) * Math.exp(-t / (tau[u] as number)), 0);
  let fet = EOFE_MAX_S;
  for (let t = 0.5; t <= EOFE_MAX_S; t += 0.05) if (flowAt(t) < EOFE_FLOW_ML_S) { fet = t; break; }
  const out = (t: number) => v.reduce((a, vu, u) => a + vu * (1 - Math.exp(-t / (tau[u] as number))), 0);
  const fvc = out(fet);
  const fev1 = out(1);
  return {
    tlc, rv, vc, frcSit, erv: frcSit - rv, ic: tlc - frcSit,
    fvc, fev1, ratio: fvc > 0 ? fev1 / fvc : 0, pef, fet,
    fe: { v, tau },
  };
}

/** Closing capacity (mL, supine reference): equals the supine FRC at 44 y and the seated FRC at 66 y (Leblanc,
 * Ruff & Milic-Emili 1970 J Appl Physiol 28:448), linear in age between and beyond [ENG line through the two anchors]. */
export function closingCapacity(pred: Predicted, ageY: number, supineFrcMl: number): number {
  const k = (ageY - 44) / (66 - 44);
  return supineFrcMl + k * (pred.frc - supineFrcMl);
}

/** ATS/ERS 2005 pattern: obstructive FEV1/FVC < 0.70 (GOLD fixed ratio; the LLN is the ERS/ATS 2022 choice — the
 * fixed ratio is the one residents are examined on); restrictive TLC < 80 % predicted; mixed both. */
export function pattern(a: Actual, pred: Predicted): 'normal' | 'obstructive' | 'restrictive' | 'mixed' {
  const obs = a.ratio < 0.7;
  const res = a.tlc < 0.8 * pred.tlc;
  return obs && res ? 'mixed' : obs ? 'obstructive' : res ? 'restrictive' : 'normal';
}
```

- [ ] **Step 4: Run.** `CI=1 npx vitest run test/l2/lung/volumes.test.ts` → **13 passed** (the GOLD 1 row is an
  `it.fails` that fails as declared). Prototype `VOL` lines: healthy TLC / FVC / FEV1 / PEF 100 % (PEF 550 L/min,
  ECSC), ratio 0.83; COPD GOLD 2/3/4 FEV1 55/41/28 %, PEF 58/47/35 %, ratio 0.51/0.40/0.31, RV 140/175/220 %; GOLD 1
  FEV1 71 %, PEF 72 %, ratio 0.61; ILD 0.3/0.6/0.9 FVC 75/60/45 %, ratio 0.80–0.84; acute severe asthma FEV1 35 %,
  PEF 39 % (BTS acute severe 33–50 %), RV 200 %; obesity BMI 40 TLC 90 %, ERV 441 mL (30 % of predicted); simple
  pneumothorax 0.3 R TLC 84 %.
- [ ] **Step 5: Typecheck, commit, push.** `npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck`;
  `git add packages/engine-core/src/l2/lung/volumes.ts packages/engine-core/test/l2/lung/volumes.test.ts`;
  commit `feat(lungs): predicted and actual lung volumes and a forced-expiration model (7k, R57)` with the trailer; push.

### Task 2: Per-breath mechanics, the oesophageal-pressure estimate and the Enghoff dead-space set (lungs; pure; PROTOTYPED)

**Files:** Create `packages/engine-core/src/l2/lung/breath.ts`, `packages/engine-core/test/l2/lung/breath.test.ts`.

**Why:** D1, D3, D4, D5. The holds reuse the lung module's `measure.ts` `holdPressure` (on a copy).

- [ ] **Step 1: Write the test.**

#### Create `packages/engine-core/test/l2/lung/breath.test.ts`

```ts
// Stage 7k (R57): the per-breath arithmetic, the oesophageal-pressure estimate and the Enghoff dead-space set.
import { describe, expect, it } from 'vitest';
import { breathMechanics, deadSpaceSet, pesEstimate, PES_FRC_CMH2O } from '../../../src/l2/lung/breath.ts';

describe('Stage 7k: per-breath mechanics', () => {
  it('square-flow VCV: ΔP = Pplat − PEEPtot, Cstat = VT/ΔP, Cdyn = VT/(Ppeak − PEEPtot), Rinsp = (Ppeak − Pplat)/V̇', () => {
    const m = breathMechanics({ t: 10, mech: true, limited: false, vt: 500, ti: 1, peep: 5, ppeak: 20, pplat: 15, peepTot: 7, pesEi: 9, pesEe: 8, elErs: 0.7 });
    expect(m).toMatchObject({ kind: 'mech', dp: 8, cstat: 62.5, cdyn: 38.5, rinsp: 10, flow: 0.5, peepi: 2, plEi: 6, plEe: -1 });
  });
  it('a spontaneous breath has no hold readings (null) and PL = −Pes', () => {
    const m = breathMechanics({ t: 10, mech: false, limited: false, vt: 480, ti: 1.5, peep: 0, ppeak: 0, pplat: 0, peepTot: 0, pesEi: 3, pesEe: 7, elErs: 0.7 });
    expect(m).toMatchObject({ kind: 'spont', ppeak: null, pplat: null, peepTot: null, peepi: null, dp: null, cstat: null, cdyn: null, rinsp: null, plEi: -3, plEe: -7 });
  });
  it('a breath without square flow (held at Pmax, or an external PCV/PSV frame) has no Rinsp (F7)', () => {
    const m = breathMechanics({ t: 10, mech: true, limited: true, vt: 450, ti: 1, peep: 5, ppeak: 40, pplat: 25, peepTot: 17, pesEi: 14, pesEe: 11, elErs: 0.7 });
    expect(m.rinsp).toBeNull();
    expect(m.cstat).toBeCloseTo(56.3, 1);
  });
  it('Pes estimate (supine, ventilated/anaesthetised): 6.9 cmH2O lean supine at the relaxation volume; 9.3 at BMI 33.3 (Owens 2012 means)', () => {
    expect(pesEstimate(0, 22)).toBeCloseTo(PES_FRC_CMH2O, 6);
    expect(pesEstimate(0, 33.3)).toBeCloseTo(9.3, 1);
    expect(pesEstimate(2.5, 22)).toBeCloseTo(9.4, 6);
  });
});

describe('Stage 7k: dead-space set (Enghoff)', () => {
  it('ideal lung (e 1, φ 1, no rebreathing): VD/VT = VDs/VT, PĒCO2 = PaCO2·(1 − VDs/VT), VD alv 0', () => {
    const d = deadSpaceSet({ vt: 500, vdSeries: 150, vdApp: 50, paco2: 40, pico2: 0, e: 1, phi: 1 });
    expect(d).toEqual({ anat: 100, app: 50, alv: 0, phys: 150, vdvt: 0.3, peco2: 28 });
  });
  it('rebreathing (PICO2 10): PĒCO2 = PICO2 + φe(1 − VDs/VT)(PaCO2 − PICO2) and VD/VT is unchanged by the inspired CO2 (Enghoff with the inspired correction, F6)', () => {
    const d = deadSpaceSet({ vt: 500, vdSeries: 150, vdApp: 50, paco2: 40, pico2: 10, e: 1, phi: 1 });
    expect(d.peco2).toBeCloseTo(31, 6); // 10 + 0.7 × 30
    expect(d.vdvt).toBeCloseTo(0.3, 6);
  });
  it('alveolar dead space and admixture lower e: VD phys > VDs, VD alv = VD phys − VDs', () => {
    const d = deadSpaceSet({ vt: 500, vdSeries: 150, vdApp: 0, paco2: 40, pico2: 0, e: 0.8, phi: 1 });
    expect(d.vdvt).toBeCloseTo(0.44, 2);
    expect(d.alv).toBe(d.phys - 150);
  });
});
```

- [ ] **Step 2: Create the module.**

#### Create `packages/engine-core/src/l2/lung/breath.ts`

```ts
// Stage 7k (R57): per-breath respiratory mechanics, measured the way a clinician measures them (Hess & Kacmarek,
// Essentials of Mechanical Ventilation 4e ch. 3 "Pulmonary mechanics"; Arnal 2018; the lung module's own measure.ts
// method): Ppeak = the airway-opening pressure at the end of inspiratory flow (the highest Paw of the breath); Pplat =
// the airway pressure after an END-INSPIRATORY HOLD; PEEPtot = the airway pressure after an END-EXPIRATORY HOLD;
// PEEPi = PEEPtot − set PEEP; ΔP = Pplat − PEEPtot; Cstat = VT/(Pplat − PEEPtot); Cdyn = VT/(Ppeak − PEEPtot);
// Rinsp = (Ppeak − Pplat)/V̇insp (square-flow volume control). Both holds run on a COPY of the unit state
// (measure.ts `holdPressure`), so measuring never disturbs the patient — the truth is "what a hold would read on
// this breath"; the ventilator link has its own hold buttons (V.1's `Measured.PLAT`/`autoPEEP`), which 7k does not
// duplicate. VT is the volume the lung received (FU-6: a pressure-limited breath delivers less than the set VT).
//
// OESOPHAGEAL PRESSURE IS AN ESTIMATE (glossary: "Pes (estimate)"), not a simulated balloon, and its reference depends
// on the context (orchestrator ruling on the 7k R50 review, F4):
//   AWAKE, SPONTANEOUS (upright-teaching context): Pes = the lung model's own pleural pressure (7a/7b `respPleural`,
//     mmHg → cmH2O): −5.4 cmH2O at FRC (P_PL0 −4 mmHg) falling ≈ 4 cmH2O in a quiet inspiration — West's textbook
//     values (Ppl ≈ −5 at FRC, ≈ −8 at end-inspiration; Respiratory Physiology ch. 7), so PL,ee ≈ +5, as a
//     spontaneously breathing lung at FRC must read (a positive transpulmonary pressure holds it open).
//   SUPINE AND VENTILATED OR ANAESTHETISED (gaLvl ≥ 0.5 or a positive-pressure source): the balloon's supine value,
//     Pes = PES_FRC_CMH2O + PES_BMI_SLOPE·(BMI − 22.5)₊ + ΔPpl(t). PES_FRC_CMH2O 6.9 cmH2O is the supine end-expiratory
//     Pes of lean subjects at the relaxation volume (Owens et al. 2012 Obesity 20:2354, PMC3443522: lean supine
//     6.9 ± 2.8, seated −3.3 — the mediastinal weight and the dependent position); the BMI slope 0.22 cmH2O per kg/m² is
//     the line through the same study's two group means (6.9 at BMI 22.5, 9.3 at 33.3) [ENG line through two means;
//     applied to children too, [ENG], no paediatric balloon data]. ΔPpl(t) on a PASSIVE breath is the lung model's own
//     chest-wall recoil ΣV/Ccw (+ `lp.pPtx`/7a `ext.pPtx`, + a cough's `pMus`), so ΔPes/ΔPaw = Ecw/Ers = Crs/Ccw
//     (≈ 0.27 healthy), as a balloon measures it — NOT 7a's haemodynamic transmission T_IT 0.65, tuned to pulse-
//     pressure variation (R45 (b)); on a spontaneous breath under GA, 7a's pleural swing.
// PL (transpulmonary, "direct" method, Talmor 2008 NEJM 359:2095) = Paw − Pes at the two holds (Paw 0 when
// spontaneous). EL/Ers (the lung's share of the respiratory-system elastance) is published too: the elastance-derived
// PL,ei = Pplat × EL/Ers (Chiumello 2008 AJRCCM 178:346).
import { holdPressure } from './measure.ts';
import type { MechParams, MechState } from './mechanics.ts';

export const PES_FRC_CMH2O = 6.9;
export const PES_BMI_SLOPE = 0.22; // cmH2O per kg/m² above PES_BMI_REF
export const PES_BMI_REF = 22.5;
/** End-inspiratory hold 0.3 s and end-expiratory hold 2 s (the lung module's measure.ts; Arnal 2018). */
export const HOLD_INSP_S = 0.3;
export const HOLD_EXP_S = 2;

export interface Mechanics {
  t: number; // sim time of this breath's end-inspiration
  kind: 'mech' | 'spont';
  vt: number; // mL delivered
  ppeak: number | null;
  pplat: number | null;
  peepTot: number | null;
  peepi: number | null;
  dp: number | null;
  cstat: number | null;
  cdyn: number | null;
  rinsp: number | null; // cmH2O·s/L
  flow: number | null; // L/s, mean inspiratory flow
  pesEi: number;
  pesEe: number;
  plEi: number;
  plEe: number;
  elErs: number;
}

/** Supine balloon estimate (cmH2O, ventilated/anaesthetised): `dPpl` = the pleural-pressure change from the relaxation volume. */
export function pesEstimate(dPpl: number, bmi: number): number {
  return PES_FRC_CMH2O + PES_BMI_SLOPE * Math.max(0, bmi - PES_BMI_REF) + dPpl;
}

/** End-expiratory hold on a copy: PEEPtot (cmH2O). */
export function expHold(mp: MechParams, ms: MechState): number {
  return holdPressure(mp, ms, HOLD_EXP_S, 0);
}
/** End-inspiratory hold on a copy: Pplat (cmH2O). */
export function inspHold(mp: MechParams, ms: MechState): number {
  return holdPressure(mp, ms, HOLD_INSP_S, 0);
}

export interface BreathInputs {
  /** `limited`: the flow was not square (a pressure-limited VCV breath at Pmax, or an external PCV/PSV frame): Rinsp is not measurable (F7). */
  t: number; mech: boolean; limited: boolean; vt: number; ti: number; peep: number;
  ppeak: number; pplat: number; peepTot: number; pesEi: number; pesEe: number; elErs: number;
}
const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;

export function breathMechanics(x: BreathInputs): Mechanics {
  const pawEi = x.mech ? x.pplat : 0;
  const pawEe = x.mech ? x.peepTot : 0;
  const base = { t: r2(x.t), vt: Math.round(x.vt), pesEi: r1(x.pesEi), pesEe: r1(x.pesEe), plEi: r1(pawEi - x.pesEi), plEe: r1(pawEe - x.pesEe), elErs: r2(x.elErs) };
  if (!x.mech) return { ...base, kind: 'spont', ppeak: null, pplat: null, peepTot: null, peepi: null, dp: null, cstat: null, cdyn: null, rinsp: null, flow: null };
  const dp = x.pplat - x.peepTot;
  const flow = x.vt / 1000 / Math.max(0.1, x.ti);
  return {
    ...base, kind: 'mech', ppeak: r1(x.ppeak), pplat: r1(x.pplat), peepTot: r1(x.peepTot), peepi: r1(Math.max(0, x.peepTot - x.peep)),
    dp: r1(dp), cstat: dp > 0.5 ? r1(x.vt / dp) : null, cdyn: x.ppeak - x.peepTot > 0.5 ? r1(x.vt / (x.ppeak - x.peepTot)) : null,
    rinsp: x.limited ? null : r1((x.ppeak - x.pplat) / Math.max(0.01, flow)), flow: r2(flow),
  };
}

export interface DeadSpace { anat: number; app: number; alv: number; phys: number; vdvt: number; peco2: number }
/**
 * The dead-space set of one breath. anat + app = FU-4's `physicalDeadSpace()` (the one series dead space); VD/VT is
 * ENGHOFF's with the inspired-CO2 correction, (PaCO2 − PĒCO2)/(PaCO2 − PICO2). The mixed-expired PCO2 of the breath
 * follows from the CO2 the lung actually eliminates (gas/co2.ts: V̇CO2,exp = φ·V̇A·e·(PaCO2 − PICO2)/0.863 above the
 * inspired CO2): PĒCO2 = PICO2 + φ·e·(1 − VDs/VT)·(PaCO2 − PICO2) — e is the lung's CO2-elimination efficiency
 * (alveolar dead space and venous admixture: the Enghoff dead space includes the shunt effect, as measured Enghoff
 * VD/VT does), so VD/VT = 1 − φ·e·(1 − VDs/VT). VD phys = VD/VT × VT; VD alv = VD phys − VDs (the volumetric-capnography
 * split: Fletcher 1981; Tusman 2012).
 */
export function deadSpaceSet(x: { vt: number; vdSeries: number; vdApp: number; paco2: number; pico2: number; e: number; phi: number }): DeadSpace {
  const vt = Math.max(1, x.vt);
  const pi = Math.max(0, x.pico2);
  const peco2 = pi + x.phi * x.e * Math.max(0, 1 - x.vdSeries / vt) * Math.max(0, x.paco2 - pi);
  const vdvt = x.paco2 - pi > 0.5 ? Math.min(1, Math.max(0, (x.paco2 - peco2) / (x.paco2 - pi))) : 1;
  const phys = vdvt * vt;
  return { anat: Math.round(x.vdSeries - x.vdApp), app: Math.round(x.vdApp), alv: Math.round(Math.max(0, phys - x.vdSeries)), phys: Math.round(phys), vdvt: r2(vdvt), peco2: r1(peco2) };
}
```

- [ ] **Step 3: Run.** `CI=1 npx vitest run test/l2/lung/breath.test.ts` → **7 passed** (incl. the Rinsp-without-square-flow row, F7, and
  the rebreathing row, F6).
- [ ] **Step 4: Commit, push.** `feat(lungs): per-breath mechanics, Pes estimate and Enghoff dead-space set (7k, R57)`.

### Task 3: One bedside FRC function; the default stature (lungs; E-7k-3; byte-identical)

**Files:** Modify `packages/engine-core/src/l2/lung/state-event.ts`, `packages/engine-core/src/l2/lung/params.ts`
(a comment: `TLC_ML_KG`/`RV_ML_KG` are the model's internal P–V range, D17), `packages/engine-core/src/l2/gas/params.ts`
(**E-7k-3**: one additive export).

**Why:** D6 — `lungState.frcMl` and 7k's `resp.volumes.frc` must be ONE computation; D7 — the predicted volumes use
the stature `gasPatient` assumes when the profile has none (a profile without `heightCm`: the console presets).
`SIDE_SHARE` is `[0.45, 0.55]`, so the refactored expression is the same floating-point sum.

#### Modify `packages/engine-core/src/l2/lung/state-event.ts`

Edit 1 — find:

```ts
export function lungStatePayload(
```

replace with:

```ts
/** Stage 7k: THE bedside FRC (mL) — the gas the lungs hold at end-expiration: the patient's FRC (FU-6's awake →
 * anaesthetised `frcNow`) × the conditions' FRC multiplier × the aerated share. lungState and the 7k volume set read it. */
export function aeratedFrc(ls: LungState, frcMl: number): number {
  return frcMl * ls.lp.frcMult * (SIDE_SHARE[0] * (ls.aer[0] as number) + SIDE_SHARE[1] * (ls.aer[1] as number));
}

export function lungStatePayload(
```

Edit 2 — find:

```ts
    frcMl: Math.round(x.frcMl * lp.frcMult * (0.45 * (ls.aer[0] as number) + 0.55 * (ls.aer[1] as number))),
```

replace with:

```ts
    frcMl: Math.round(aeratedFrc(ls, x.frcMl)), // Stage 7k: the one bedside FRC
```

#### Modify `packages/engine-core/src/l2/lung/params.ts`

Edit 1 — find:

```ts
/** TLC and RV, mL/kg IBW (Pulse 4.3.2 standard patient: TLC 80, RV 16; audit 03 §1). */
```

replace with:

```ts
/**
 * TLC and RV, mL/kg IBW (Pulse 4.3.2 standard patient: TLC 80, RV 16; audit 03 §1) — INTERNAL: the range of the unit
 * P–V sigmoids (side.ts `mechParams`), not the patient's clinical TLC/RV. Stage 7k (R50 F5) owns those: `resp.volumes.tlc`
 * and `.rv` (ECSC/Zapletal × pathology). Re-basing this range on them moves every mechanics number (Q-7k-6, v1.1).
 */
```

#### Modify `packages/engine-core/src/l2/gas/params.ts`

Edit 1 — find:

```ts
export interface GasPatient {
```

replace with:

```ts
/** Stage 7k (E-7k-3): the stature gasPatient assumes when the profile gives none (cm) — the 7k predicted volumes use the same. */
export function defaultHeightCm(ageY = 40): number {
  return BY_AGE[ageBand(ageY)].height;
}

export interface GasPatient {
```

- [ ] **Run.** `CI=1 npx vitest run test/engine/lung-state.test.ts test/l2/lung` → unchanged from Task 0 (the V.1
  pleural row and the V.1 lung-water row were red on the prototype base for V.1's reasons; nothing else).
- [ ] **Commit, push.** `refactor(lungs): aeratedFrc — the one bedside FRC; gas: defaultHeightCm (7k, E-7k-3)`.

### Task 4: Wire the measurement into the resp pipeline; truth budget; the engine test (Stage 3 + lungs; E-7k-1; PROTOTYPED)

**Files:** Modify `packages/engine-core/src/l2/resp/pipeline.ts`, `packages/engine-core/src/truth.ts` (**E-7k-1**),
`packages/engine-core/vite.config.ts`; Create `packages/engine-core/test/engine/resp-mechanics.test.ts` (SLOW, in
`SLOW_A` — R50 F1: slow-b ran 37.6 of 40 min at G-FU4).

**Why:** D1 (breath boundaries from the next sample's drive), D6 (volumes at 1 Hz, FRC via `aeratedFrc(frcNow)`), D12
(the leaves are paid for). The measurement writes only 7k's own fields (`mechanics`, `vd`, `volumes`, `brk`).

- [ ] **Step 1: Write the engine test.**

#### Create `packages/engine-core/test/engine/resp-mechanics.test.ts`

```ts
// Stage 7k (R57): the per-breath mechanics, the Pes estimate, the dead-space set and the volume set on the running
// engine, against textbook bands for a healthy 70 kg adult awake and anaesthetised and the catalogue's pathologies.
// Sources per row: Hess & Kacmarek (Essentials of Mechanical Ventilation 4e ch. 3), the lung catalogue's bands
// (`data/lung-pathology.ts` Bands, reference VT 490 × 14, PEEP 5), Owens 2012 (Pes), Nunn 8e / Nuckton 2002 (VD/VT),
// ATS/ERS (reversibility ≥ 12 % and ≥ 200 mL). One yield per sim-minute (runTo).
import { describe, expect, it } from 'vitest';
import { ADULT6, rig6, runTo, send, st6, ventRig } from '../helpers/fu6.ts';
import type { PatientProfile } from '../../src/types.ts';
import type { LungConditionSpec } from '../../src/types-lung.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- read-only test access (fu6.ts pattern)
type Any = any;
type Opts = { patient?: PatientProfile; conds?: LungConditionSpec[]; vent?: Record<string, number> | null; child?: boolean; t?: number };
// one engine run per rig: the rows that read the same rig share it (R50 F1: the file's CI time)
const runs = new Map<string, Promise<{ m: Any; vd: Any; v: Any; ls: Any }>>();
function measure(opts: Opts): Promise<{ m: Any; vd: Any; v: Any; ls: Any }> {
  const k = JSON.stringify(opts);
  if (!runs.has(k)) runs.set(k, run(opts));
  return runs.get(k) as Promise<{ m: Any; vd: Any; v: Any; ls: Any }>;
}
async function run(opts: Opts): Promise<{ m: Any; vd: Any; v: Any; ls: Any }> {
  const e = rig6({ ...(opts.patient ?? ADULT6), lungConditions: opts.conds ?? [] });
  if (opts.child) {
    await runTo(e, 1);
    send(e, { kind: 'airwayDevice', device: 'ett' });
    send(e, { kind: 'ventilation', source: 'ventilator', peep: 5, fio2: 0.5, ...opts.vent });
    send(e, { kind: 'thermal', anaesthesia: 'general' });
    send(e, { kind: 'drug', drugId: 'rocuronium', dose: 1.2, unit: 'mg/kg', route: 'iv' });
    send(e, { kind: 'infusion', drugId: 'propofol', rate: 100, unit: 'mcg/kg/min' });
  } else if (opts.vent) await ventRig(e, opts.vent);
  let ls: Any = {};
  e.on((x: Any) => { if (x.type === 'lungState') ls = { ...ls, ...x }; });
  await runTo(e, opts.t ?? 300);
  const rs = st6(e).resp;
  const r = { m: rs.mechanics, vd: rs.vd, v: rs.volumes, ls };
  const m = r.m;
  console.log(`MECH ${JSON.stringify((opts.conds ?? []).map((c) => `${c.id} ${c.severity}`))} ${m.kind}: VT ${m.vt} Ppeak ${m.ppeak} Pplat ${m.pplat} PEEPtot ${m.peepTot} PEEPi ${m.peepi} ΔP ${m.dp} Cstat ${m.cstat} Cdyn ${m.cdyn} Rinsp ${m.rinsp} Pes ${m.pesEi}/${m.pesEe} PL ${m.plEi}/${m.plEe} | VD ${r.vd.anat}/${r.vd.app}/${r.vd.alv}/${r.vd.phys} VD/VT ${r.vd.vdvt} | FRC ${Math.round(r.v.frc)} CC ${r.v.cc === null ? '–' : Math.round(r.v.cc)}`);
  return r;
}

describe('Stage 7k: mechanics on the running engine (per breath)', { timeout: 300_000 }, () => {
  it('healthy adult under GA on VCV 500 × 12, PEEP 5: Ppeak < 30, Pplat 10–20, PEEPi < 1, ΔP 6–12, Cstat 45–80, Cdyn < Cstat, Rinsp 6–15 (Hess & Kacmarek; glossary §5.6)', async () => {
    const { m, v } = await measure({ vent: {} });
    expect(m.kind).toBe('mech');
    expect(m.ppeak).toBeLessThan(30);
    expect(m.ppeak).toBeGreaterThan(m.pplat);
    expect(m.pplat).toBeGreaterThanOrEqual(10);
    expect(m.pplat).toBeLessThanOrEqual(20);
    expect(m.peepi).toBeLessThan(1);
    expect(m.dp).toBeGreaterThanOrEqual(6);
    expect(m.dp).toBeLessThanOrEqual(12);
    expect(m.cstat).toBeGreaterThanOrEqual(45);
    expect(m.cstat).toBeLessThanOrEqual(80);
    expect(m.cdyn).toBeLessThan(m.cstat);
    expect(m.rinsp).toBeGreaterThanOrEqual(6);
    expect(m.rinsp).toBeLessThanOrEqual(15);
    // FU-6's anaesthetised FRC (20 mL/kg IBW) is the bedside FRC; it falls below the 40 y closing capacity (Leblanc: CC
    // reaches the supine FRC at 44 y) — the teaching point of airway closure under GA
    expect(v.frc).toBeLessThan(v.cc);
  });
  it('healthy adult under GA: Pes,ee 5–12 cmH2O (Owens 2012 lean supine 6.9 ± 2.8 at the relaxation volume, + PEEP), PL,ee −5…+3, PL,ei 0…15', async () => {
    const { m } = await measure({ vent: {} });
    expect(m.pesEe).toBeGreaterThanOrEqual(5);
    expect(m.pesEe).toBeLessThanOrEqual(12);
    expect(m.plEe).toBeGreaterThanOrEqual(-5);
    expect(m.plEe).toBeLessThanOrEqual(3);
    expect(m.plEi).toBeGreaterThan(0);
    expect(m.plEi).toBeLessThan(15);
  });
  it.fails('healthy adult under GA on VCV: Enghoff VD/VT 0.30–0.45 (Nunn 8e: ≈ 0.3 awake, higher under anaesthesia) — measured 0.28 (VD phys 140 mL: FU-4\'s ETT bypass + HEALTHY_VDALV 0.075; Q-7k-5)', async () => {
    const { vd } = await measure({ vent: {} });
    expect(vd.vdvt).toBeGreaterThanOrEqual(0.3);
    expect(vd.vdvt).toBeLessThanOrEqual(0.45);
  });
  it('healthy adult awake, spontaneous: no hold readings (null), VD/VT 0.2–0.35; Pes = the model\'s pleural pressure (West: ≈ −5 at FRC, 3–6 more negative at end-inspiration), so PL,ee ≈ +5 (F4 ruling); the FRC shown is lungState\'s', async () => {
    const { m, vd, v, ls } = await measure({ vent: null });
    expect(m.kind).toBe('spont');
    expect(m.ppeak).toBeNull();
    expect(m.cstat).toBeNull();
    expect(vd.vdvt).toBeGreaterThanOrEqual(0.2);
    expect(vd.vdvt).toBeLessThanOrEqual(0.35);
    expect(m.pesEe).toBeGreaterThanOrEqual(-7);
    expect(m.pesEe).toBeLessThanOrEqual(-3);
    expect(m.pesEe - m.pesEi).toBeGreaterThanOrEqual(3);
    expect(m.pesEe - m.pesEi).toBeLessThanOrEqual(6);
    expect(m.plEe).toBeGreaterThanOrEqual(3);
    expect(m.plEe).toBeLessThanOrEqual(7);
    expect(Math.round(v.frc)).toBe(ls.frcMl); // one bedside FRC (D6): the panel and lungState agree
  });
  it('bronchospasm 1 (Pmax 80, FU-6 D18b): Ppeak ≥ 40, PEEPi 6–12, Rinsp ≥ 40, Cdyn < ½ Cstat, VD/VT ≥ 0.45 (catalogue §2)', async () => {
    const { m, vd } = await measure({ vent: { pmax: 80 }, conds: [{ id: 'bronchospasm', severity: 1 }] });
    expect(m.ppeak).toBeGreaterThanOrEqual(40);
    expect(m.peepi).toBeGreaterThanOrEqual(6);
    expect(m.peepi).toBeLessThanOrEqual(12);
    expect(m.rinsp).toBeGreaterThanOrEqual(40);
    expect(m.cdyn).toBeLessThan(0.5 * m.cstat);
    expect(vd.vdvt).toBeGreaterThanOrEqual(0.45);
  });
  it('moderate ARDS on 6 mL/kg (VT 420, PEEP 10, RR 18): Cstat 30–40 (catalogue 35), ΔP ≤ 15 (Amato 2015), PL,ee 0…+6, VD/VT 0.5–0.65 (Nuckton 2002)', async () => {
    const { m, vd } = await measure({ vent: { vtMl: 420, peep: 10, rr: 18 }, conds: [{ id: 'ards', severity: 0.67 }] });
    expect(m.cstat).toBeGreaterThanOrEqual(30);
    expect(m.cstat).toBeLessThanOrEqual(40);
    expect(m.dp).toBeLessThanOrEqual(15);
    expect(m.plEe).toBeGreaterThanOrEqual(0);
    expect(m.plEe).toBeLessThanOrEqual(6);
    expect(vd.vdvt).toBeGreaterThanOrEqual(0.5);
    expect(vd.vdvt).toBeLessThanOrEqual(0.65);
  });
  it('obesity BMI 40 on PEEP 5: Cstat 24–40 (catalogue §10), Pes,ee ≥ 10, PL,ee < 0 (the obese chest wall closes the dependent lung at PEEP 5)', async () => {
    const { m } = await measure({ patient: { ...ADULT6, weightKg: 122.5 }, vent: {}, conds: [{ id: 'obesity', severity: 1 }] });
    expect(m.cstat).toBeGreaterThanOrEqual(24);
    expect(m.cstat).toBeLessThanOrEqual(40);
    expect(m.pesEe).toBeGreaterThanOrEqual(10);
    expect(m.plEe).toBeLessThan(0);
  });
  it('COPD GOLD 3, 65 y, VCV 490 × 14 (the catalogue\'s reference): Cstat 43–75, Rinsp 16–33 (catalogue §5); FEV1/FVC < 0.70', async () => {
    const { m, v } = await measure({ patient: { ...ADULT6, ageY: 65 }, vent: { vtMl: 490, rr: 14 }, conds: [{ id: 'copd', severity: 0.75 }] });
    expect(m.cstat).toBeGreaterThanOrEqual(43);
    expect(m.cstat).toBeLessThanOrEqual(75);
    expect(m.rinsp).toBeGreaterThanOrEqual(16);
    expect(m.rinsp).toBeLessThanOrEqual(33);
    expect(v.ratio).toBeLessThan(0.7);
  });
  it.fails('COPD GOLD 3, VCV 490 × 14: PEEPi 4–8 (catalogue §5 band at the reference rate) — measured 3.6 (lungState 3.7: the 7b lung\'s own value, not a 7k measurement; R46 calibration row)', async () => {
    const { m } = await measure({ patient: { ...ADULT6, ageY: 65 }, vent: { vtMl: 490, rr: 14 }, conds: [{ id: 'copd', severity: 0.75 }] });
    expect(m.peepi).toBeGreaterThanOrEqual(4);
    expect(m.peepi).toBeLessThanOrEqual(8);
  });
  it('ILD moderate, VT 490: Cstat 28–36 (catalogue 32), ΔP 13–15.5 (catalogue §7), restrictive', async () => {
    const { m, v } = await measure({ patient: { ...ADULT6, ageY: 60 }, vent: { vtMl: 490, rr: 14 }, conds: [{ id: 'ild', severity: 0.6 }] });
    expect(m.cstat).toBeGreaterThanOrEqual(28);
    expect(m.cstat).toBeLessThanOrEqual(36);
    expect(m.dp).toBeGreaterThanOrEqual(13);
    expect(m.dp).toBeLessThanOrEqual(15.5);
    expect(v.pattern).toBe('restrictive');
  });
  it('simple pneumothorax 30 % (right): Cstat falls (catalogue ×0.82 → ≈ 45), TLC ≈ 84 % predicted', async () => {
    const { m, v } = await measure({ vent: {}, conds: [{ id: 'ptxSimple', severity: 0.3, side: 'R' }] });
    expect(m.cstat).toBeGreaterThanOrEqual(40);
    expect(m.cstat).toBeLessThanOrEqual(50);
    expect(v.tlc / v.pred.tlc).toBeCloseTo(0.835, 2);
  });
  it('4 y child (16 kg, ETT, VCV 17 × 112): Cstat 0.6–1.2 mL/cmH2O/kg, Rinsp ≥ 20 (small tube), CC null (< 18 y)', async () => {
    const { m, v } = await measure({ patient: { ageY: 4, sex: 'M', heightCm: 102, weightKg: 16 }, vent: { rr: 17, vtMl: 112 }, child: true });
    expect(m.cstat / 16).toBeGreaterThanOrEqual(0.6);
    expect(m.cstat / 16).toBeLessThanOrEqual(1.2);
    expect(m.rinsp).toBeGreaterThanOrEqual(20);
    expect(v.cc).toBeNull();
  });
});

describe('Stage 7k: spirometry answers the bronchodilator through FU-6\'s one smooth-muscle state', { timeout: 300_000 }, () => {
  const arm = async (id: 'asthma' | 'copd', severity: number) => {
    const e = rig6({ ...ADULT6, lungConditions: [{ id, severity }] });
    await runTo(e, 60);
    const b = { ...st6(e).resp.volumes };
    send(e, { kind: 'drug', drugId: 'salbutamol', dose: 250, unit: 'mcg', route: 'iv' });
    await runTo(e, 960);
    const a = st6(e).resp.volumes;
    console.log(`BD ${id} ${severity}: FEV1 ${Math.round(b.fev1)} → ${Math.round(a.fev1)} (+${(100 * (a.fev1 / b.fev1 - 1)).toFixed(1)} %)`);
    return { pct: 100 * (a.fev1 / b.fev1 - 1), ml: a.fev1 - b.fev1, before: (100 * b.fev1) / b.pred.fev1 };
  };
  // moderate persistent asthma = FEV1 60–80 % predicted (GINA/NAEPP): catalogue severity 0.7 reads 62 %; severity 0.6
  // reads 78 % and reverses +11.6 % (+348 mL) — the borderline mild row, recorded in the gate note, not asserted
  it('moderate asthma (FEV1 60–80 % pred): FEV1 +≥ 12 % and +≥ 200 mL 15 min after salbutamol 250 µg (ATS/ERS reversibility; measured +33 %); COPD GOLD 2: < 12 % (+3 %)', async () => {
    const asthma = await arm('asthma', 0.7);
    expect(asthma.before).toBeGreaterThanOrEqual(60);
    expect(asthma.before).toBeLessThanOrEqual(80);
    expect(asthma.pct).toBeGreaterThanOrEqual(12);
    expect(asthma.ml).toBeGreaterThanOrEqual(200);
    const copd = await arm('copd', 0.5);
    expect(copd.pct).toBeLessThan(12);
  });
});
```

- [ ] **Step 2: Wire.**

#### Modify `packages/engine-core/src/l2/resp/pipeline.ts`

Edit 1 — find:

```ts
import { CI_LPM_PER_KG, CO_REF_LPM, GA_METABOLIC,
```

replace with:

```ts
import { apparatusDeadSpaceMl, CI_LPM_PER_KG, CO_REF_LPM, defaultHeightCm, FRC_AWAKE_ML_KG, GA_METABOLIC,
```

Edit 2 — find:

```ts
import { lungStatePayload } from '../lung/state-event.ts'; // Stage 7b

```

replace with:

```ts
import { aeratedFrc, lungStatePayload } from '../lung/state-event.ts'; // Stage 7b; 7k: aeratedFrc (one bedside FRC)
import { breathMechanics, deadSpaceSet, expHold, inspHold, pesEstimate, type DeadSpace, type Mechanics } from '../lung/breath.ts'; // Stage 7k (R57)
import { actualVolumes, closingCapacity, pattern, predictedVolumes, type Actual, type Predicted } from '../lung/volumes.ts'; // Stage 7k (R57)

```

Edit 3 — find:

```ts
  ptxCeil: number;
  out: EngineEvent[];
}
```

replace with:

```ts
  ptxCeil: number;
  /** Stage 7k (R57): the last breath's mechanics (per breath; `kind` 'spont' leaves the positive-pressure fields null). */
  mechanics?: Mechanics;
  /** Stage 7k: the dead-space set of the last breath (VD anat/app/alv/phys, Enghoff VD/VT, PĒCO2). */
  vd?: DeadSpace;
  /** Stage 7k: static volumes (1 Hz): the bedside FRC, the PFT set (seated) and the forced expiration; `pred` = ECSC/Zapletal. */
  volumes?: Omit<Actual, 'fe'> & { frc: number; cc: number | null; pattern: string; pred: Predicted; fe: Actual['fe'] };
  /** Stage 7k machinery (out of truth, E-7k-1): the running Ppeak, the end-expiratory hold of the breath in progress, the patient constants. */
  brk: { pk: number; peepTot: number; pesEe: number; ageY: number; bmi: number; pred: Predicted };
  out: EngineEvent[];
}
```

Edit 4 — find:

```ts
circPtx: 0, ptxAcc: 0, ptxCeil: 0,
  };
```

replace with:

```ts
circPtx: 0, ptxAcc: 0, ptxCeil: 0,
    brk: createBrk(profile, pat), // Stage 7k (R57)
  };
```

Edit 5 — find:

```ts
  lungStateEvent(rs, t, l1);
  if (rs.gasK % 10 === 0 && rs.gasK > 0) emitSecond(rs, t);
```

replace with:

```ts
  if (rs.gasK % 10 === 0) updateVolumes(rs); // Stage 7k (R57)
  lungStateEvent(rs, t, l1);
  if (rs.gasK % 10 === 0 && rs.gasK > 0) emitSecond(rs, t);
```

Edit 6 — find:

```ts
function emitSecond(rs: RespState, t: number): void {
```

replace with:

```ts
// --- Stage 7k (R57): per-breath mechanics and the volume set ---------------------------------------------------
const mechSource = (rs: RespState) => rs.driver.source === 'ventilator' || rs.driver.source === 'bvm' || rs.driver.source === 'external';
/**
 * Stage 7k: the oesophageal-pressure ESTIMATE (cmH2O; lung/breath.ts, F4 ruling). Awake and spontaneous: the lung
 * model's own pleural pressure (West: ≈ −5 at FRC). Supine and ventilated or anaesthetised: the balloon's supine value
 * + the pleural change from the relaxation volume (the lung's chest-wall recoil on a passive breath, 7a's swing on a
 * spontaneous one).
 */
function pesNow(rs: RespState, t: number): number {
  if (!mechSource(rs) && gaLevel(rs) < 0.5) return respPleural(rs, t) / CMH2O_TO_MMHG;
  const ptx = Math.max(rs.lung.lp.pPtx, rs.circPtx) / CMH2O_TO_MMHG;
  const d = mechSource(rs) ? chestWallPressure(rs.lung.mp, rs.lung.mech) + (rs.lung.mech.pMus ?? 0) + ptx : (respPleural(rs, t) - P_PL0) / CMH2O_TO_MMHG;
  return pesEstimate(d, rs.brk.bmi);
}
/** Stage 7k: the patient constants of the measurement (predicted volumes, BMI for the Pes estimate); height as gasPatient's. */
function createBrk(profile: PatientProfile | undefined, pat: GasPatient): RespState['brk'] {
  const ageY = profile?.ageY ?? 40;
  const heightCm = profile?.heightCm ?? defaultHeightCm(ageY);
  return { pk: 0, peepTot: 0, pesEe: 0, ageY, bmi: pat.weightKg / (heightCm / 100) ** 2, pred: predictedVolumes({ ageY, sex: profile?.sex ?? 'M', heightCm }) };
}
const setPeep = (rs: RespState) => (rs.driver.source === 'ventilator' ? rs.driver.vent.peep : rs.driver.source === 'external' && rs.driver.ext ? rs.driver.ext.peep : 0);
/** End-expiration (the next sample starts an inspiration): the expiratory hold on a copy and the end-expiratory Pes. */
function breathStart(rs: RespState, t: number): void {
  rs.brk.peepTot = mechSource(rs) ? expHold(rs.lung.mp, rs.lung.mech) : 0; // a hold needs a ventilator (D3)
  rs.brk.pesEe = pesNow(rs, t);
  rs.brk.pk = rs.lung.mech.paw;
}
/** End-inspiration (the next sample is not inspiratory flow): Ppeak, the inspiratory hold on a copy, the dead-space set. */
function breathEnd(rs: RespState, l1: L1State, t: number): void {
  const ls = rs.lung;
  const vt = ls.mech.v.reduce((a, v, u) => a + Math.max(0, v - (ls.v0[u] as number)), 0);
  if (!(vt > 5)) return;
  const mech = mechSource(rs) && (cycleAt(rs.driver, t - 1e-3)?.mech ?? true);
  const ppeak = Math.max(rs.brk.pk, ls.mech.paw);
  // F7: Rinsp needs square flow — not a breath held at the VCV Pmax (FU-6 D18), not an external (link) PCV/PSV frame
  const limited = rs.driver.source === 'external' || (rs.driver.source === 'ventilator' && ppeak >= (rs.driver.vent.pmax ?? VCV_PMAX_DEFAULT) - 0.05);
  rs.mechanics = breathMechanics({
    t, mech, limited, vt, ti: t - ls.tInsp, peep: setPeep(rs), ppeak, pplat: mech ? inspHold(ls.mp, ls.mech) : 0, peepTot: rs.brk.peepTot,
    pesEi: pesNow(rs, t), pesEe: rs.brk.pesEe, elErs: 1 - staticCompliance(ls) / ls.mp.ccw,
  });
  const art = mech || rs.driver.airway !== 'patent';
  const vdS = deadSpace(rs, l1);
  rs.vd = deadSpaceSet({ vt, vdSeries: vdS, vdApp: art && mechSource(rs) ? Math.min(vdS, apparatusDeadSpaceMl(rs.pat.weightKg)) : 0, paco2: rs.co2.pf, pico2: rs.driver.fico2, e: ls.co2.e, phi: rs.co2.flow });
}
/** 1 Hz: the static volumes (predicted × the resolved lung) and the forced expiration; the bedside FRC is the lung's. */
function updateVolumes(rs: RespState): void {
  const ls = rs.lung;
  const aerCond = ls.lp.side.map((sp) => Math.max(0.02, 1 - sp.atel - sp.consol));
  const a = actualVolumes(rs.brk.pred, ls.lp, rs.lungSpecs, aerCond);
  const frc = aeratedFrc(ls, frcNow(rs));
  rs.volumes = { ...a, frc, cc: rs.brk.ageY >= 18 ? closingCapacity(rs.brk.pred, rs.brk.ageY, FRC_AWAKE_ML_KG * rs.pat.ibwKg) : null, pattern: pattern(a, rs.brk.pred), pred: rs.brk.pred };
}

function emitSecond(rs: RespState, t: number): void {
```

Edit 7 — find (FU-6 line):

```ts
    const ld = lungDrive(rs, t); // Stage 7b: mechanics at 250 Hz (4 sub-steps per sample)
    const wasInsp = rs.lung.inInsp;
```

replace with:

```ts
    const ld = lungDrive(rs, t); // Stage 7b: mechanics at 250 Hz (4 sub-steps per sample)
    const inspNext = ld.mode === 'flow' && ld.x > 0; // Stage 7k: breath boundaries for the per-breath measurement
    if (!rs.lung.inInsp && inspNext) breathStart(rs, t);
    else if (rs.lung.inInsp && !inspNext) breathEnd(rs, ctx.l1, t);
    const wasInsp = rs.lung.inInsp;
```

Edit 8 — find (FU-6 line):

```ts
    lungMechStep(rs.lung, ld.mode, ld.x, DT, ld.pLimit); // FU-6 R7: the VCV pressure limit

```

replace with:

```ts
    lungMechStep(rs.lung, ld.mode, ld.x, DT, ld.pLimit); // FU-6 R7: the VCV pressure limit
    if (rs.lung.inInsp && rs.lung.mech.paw > rs.brk.pk) rs.brk.pk = rs.lung.mech.paw; // Stage 7k: Ppeak of the breath

```

#### Modify `packages/engine-core/src/truth.ts`

Edit 1 — find (FU-6 line):

```ts
'resp.wakeMmHg']);
```

replace with:

```ts
'resp.wakeMmHg', 'resp.brk', 'resp.lung.mp']);
```

Edit 2 — find:

```ts
/** Paths are only built as deep as the deepest SKIP_PATH entry
```

replace with:

```ts
// Stage 7k (E-7k-1): `resp.brk` is 7k's measurement machinery; `resp.lung.mp` the unit mechanics, a derived copy of
// `resp.lung.lp` rebuilt at every aeration change (glossary §5.16 rule 5: "the unit sigmoids") — together they pay for 7k's
// 53 leaves (resp.mechanics, resp.vd, resp.volumes) under the 2 100-leaf cap.
/** Paths are only built as deep as the deepest SKIP_PATH entry
```

#### Modify `packages/engine-core/vite.config.ts`

Edit 1 — find:

```ts
  'test/engine/af-pulse-deficit.test.ts', // FU-4 Task 17: two 320 sim-s AF 150 runs
];
```

replace with:

```ts
  'test/engine/af-pulse-deficit.test.ts', // FU-4 Task 17: two 320 sim-s AF 150 runs
  'test/engine/resp-mechanics.test.ts', // Stage 7k: nine 5 sim-min mechanics rigs and two 16 sim-min bronchodilator arms (slow-a: slow-b is at 37.6 of 40 min)
];
```

Edit 2 — find:

```ts
'test/engine/clinical-suite.test.ts'];
```

replace with:

```ts
'test/engine/clinical-suite.test.ts', 'test/engine/resp-mechanics.test.ts']; // Stage 7k (R50 F1): slow-b ran 37.6 of its 40 min at G-FU4
```

- [ ] **Step 3: Run.**

```bash
cd packages/engine-core
npx tsc -p tsconfig.json
CI=1 npx vitest run test/engine/resp-mechanics.test.ts test/engine/truth-event.test.ts test/l2/lung
```

  Expected: `resp-mechanics` **13 passed** (the VD/VT row and the COPD PEEPi row are `it.fails` that fail as declared;
  nine rigs, each run once and shared by the rows that read it; wall ≈ 14 s locally),
  `truth-event` 5 passed with `truth 12-drug tree: 2061 leaves` (prototype; FU-7's own entries move it — it must stay
  `truncated: false`). The `MECH` lines (prototype):

```
[] GA VCV      : VT 498 Ppeak 17.1 Pplat 14.2 PEEPtot 5.1 PEEPi 0.1 ΔP 9.1 Cstat 54.7 Cdyn 41.2 Rinsp 9.9 Pes 10.8/8.3 PL 3.3/-3.3 | VD 77/50/13/140 VD/VT 0.28 | FRC 1400 CC 1863
[] awake spont : VT 476 (holds null) Pes -9.4/-5.4 PL 9.4/5.4 | VD 154/0/1/155 VD/VT 0.33 | FRC 2100
bronchospasm 1 : Ppeak 44.5 Pplat 26.4 PEEPtot 16.8 PEEPi 11.8 ΔP 9.6 Cstat 51.9 Cdyn 18 Rinsp 60.3 | VD/VT 0.53
ards 0.67      : VT 416 Ppeak 26.4 Pplat 21.9 PEEPtot 10.2 ΔP 11.8 Cstat 35.3 PL 11/1.4 | VD/VT 0.57 | FRC 952
obesity 1      : Ppeak 23.2 Pplat 19.3 ΔP 14.3 Cstat 35.2 Pes 14.6/11.7 PL 4.7/-6.7 | FRC 322
copd 0.75      : Ppeak 24.5 Pplat 15.9 PEEPtot 8.6 PEEPi 3.6 Cstat 67.7 Rinsp 25.2 | VD/VT 0.52
ild 0.6        : Ppeak 24.8 Pplat 20.4 ΔP 15.3 Cstat 31.8 | VD/VT 0.38
ptxSimple 0.3  : Ppeak 19.1 Pplat 16.1 ΔP 11 Cstat 45.2 | TLC 84 %
child 4 y      : VT 111 Ppeak 18.3 Pplat 14.1 ΔP 8.9 Cstat 12.5 Rinsp 43.4 | VD/VT 0.28 | FRC 128 CC –
BD asthma 0.7  : FEV1 2386 → 3166 (+32.7 %);  BD copd 0.5: 2375 → 2447 (+3.0 %)
```

- [ ] **Step 4: Byte identity.** Re-run Task 0 Step 5's scratch test: the three hashes must equal
  `hash-before.txt` (prototype: `099129ff4f8db349 581a4dc66f55109c ab43daa08d3831c3` before and after). A difference is
  a defect in the wiring (the holds write back, or the `aeratedFrc` sum changed) — fix it, never re-baseline.
- [ ] **Step 5: The fast set and the bench.** `CI=1 PME_TEST_SET=fast npx vitest run` (engine-core): the failure list
  equals `fast-before-fails.txt`. `npx vitest run test/perf/tick-bench.test.ts` (validation): p50 within 5 % of
  Task 0's (prototype 0.53 → 0.54 ms).
- [ ] **Step 6: Commit, push.** `feat(resp): per-breath mechanics, dead-space set and volume set in truth (7k, R57;
  E-7k-1)`.

### Task 5: The Ventilation panel in the 7x console (demo; E-7k-2; PROTOTYPED)

**Files:** Modify `apps/demo/src/physiology-console/organs.ts`, `meta.ts`, `organs.test.ts`, `lung-labels.test.ts`
(**E-7k-2**: the group count and one relabel); Create `apps/demo/src/physiology-console/mechanics-panel.test.ts`.

**Why:** D13. Stage 9's Explore re-presents the console model (its D16) and names the section "Respiratory
mechanics and volumes" — the same title here, so R-S9-3's slot fills. The model's `resp.lung.peepTot` is relabelled
so "PEEPtot" is the hold reading only (R56).

- [ ] **Step 1: Write the test.**

#### Create `apps/demo/src/physiology-console/mechanics-panel.test.ts`

```ts
// Stage 7k (R57): the Ventilation panel — the console group "Respiratory mechanics and volumes" (Stage 9's Explore
// section title) with glossary labels (research/11 §5.6), fed by a running engine on the internal ventilator.
import { describe, expect, it } from 'vitest';
import { createEngine, type Command } from '@pme/engine-core';
import { ConsoleModel } from './model.ts';
import { metaOf } from './meta.ts';
import { GROUPS, groupOf, isInternal } from './organs.ts';

const ev = (event: Record<string, unknown>) => ({ id: `c${Math.random()}`, issuedBy: 'test', type: 'applyEvent', event }) as unknown as Command;

describe('Stage 7k: Ventilation panel', () => {
  it('the group follows "Lungs & gas exchange" and takes resp.mechanics, resp.vd and resp.volumes', () => {
    const ids = GROUPS.map((g) => g.id as string);
    expect(ids.indexOf('mechanics')).toBe(ids.indexOf('lungs') + 1);
    expect(GROUPS.find((g) => g.id === 'mechanics')?.title).toBe('Respiratory mechanics and volumes');
    for (const p of ['resp.mechanics.dp', 'resp.vd.vdvt', 'resp.volumes.fev1', 'resp.volumes.pred.tlc']) expect(groupOf(p), p).toBe('mechanics');
    expect(isInternal('resp.volumes.fe.tau.1')).toBe(true);
    expect(isInternal('resp.mechanics.kind')).toBe(true);
    expect(isInternal('resp.mechanics.t')).toBe(true);
  });
  it.each([
    ['resp.mechanics.ppeak', 'Ppeak', 'cmH₂O', 1], ['resp.mechanics.pplat', 'Pplat', 'cmH₂O', 1], ['resp.mechanics.peepi', 'PEEPi (auto-PEEP)', 'cmH₂O', 1],
    ['resp.mechanics.dp', 'ΔP', 'cmH₂O', 1], ['resp.mechanics.cstat', 'Cstat', 'mL/cmH₂O', 1], ['resp.mechanics.pesEe', 'Pes,ee est.', 'cmH₂O', 1],
    ['resp.vd.vdvt', 'VD/VT', '%', 100], ['resp.volumes.ratio', 'FEV₁/FVC', '%', 100], ['resp.volumes.pef', 'PEF', 'L/min', 0.06],
  ] as const)('%s → "%s" (%s)', (path, label, unit, scale) => expect(metaOf(path)).toMatchObject({ label, unit, scale }));
  it('a ventilated engine fills the panel: ΔP and Cstat rows (Stage 9 timed task 5), every visible leaf labelled', () => {
    const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, heightCm: 175 }, truthHz: 1 });
    const m = new ConsoleModel();
    e.on((x) => void m.ingest(x));
    e.dispatch(ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 }));
    e.advanceTo(30);
    const paths = [...m.cur.keys()].filter((p) => groupOf(p) === 'mechanics' && !isInternal(p));
    const labels = paths.map((p) => metaOf(p).label);
    expect(labels).toEqual(expect.arrayContaining(['ΔP', 'Cstat', 'Ppeak', 'Pplat', 'PEEPtot', 'VD/VT', 'FRC', 'TLC', 'FEV₁/FVC']));
    expect(paths.filter((p) => metaOf(p).rank === Number.POSITIVE_INFINITY)).toEqual([]);
  });
});
```

- [ ] **Step 2: Edit.**

#### Modify `apps/demo/src/physiology-console/organs.ts`

Edit 1 — find:

```ts
  { id: 'lungs', title: 'Lungs & gas exchange' },

```

replace with:

```ts
  { id: 'lungs', title: 'Lungs & gas exchange' },
  { id: 'mechanics', title: 'Respiratory mechanics and volumes' }, // Stage 7k (R57): the Ventilation panel; Stage 9's Explore slot

```

Edit 2 — find:

```ts
  resp: 'lungs', 'ev.lungState': 'lungs', 'ev.breath': 'lungs',

```

replace with:

```ts
  resp: 'lungs', 'ev.lungState': 'lungs', 'ev.breath': 'lungs',
  // Stage 7k (R57): per-breath mechanics, the dead-space set and the volume set
  'resp.mechanics': 'mechanics', 'resp.vd': 'mechanics', 'resp.volumes': 'mechanics',

```

Edit 3 — find:

```ts
  'resp.lungCore', 'resp.lungT', 'resp.lung.nGas', 'resp.lung.tInsp', 'resp.lung.tExp0',

```

replace with:

```ts
  'resp.lungCore', 'resp.lungT', 'resp.lung.nGas', 'resp.lung.tInsp', 'resp.lung.tExp0',
  // Stage 7k: the forced-expiration unit parameters (the PFT device's loop data, not a clinical row)
  'resp.volumes.fe', 'resp.mechanics.kind',

```

#### Modify `apps/demo/src/physiology-console/meta.ts`

Edit 1 — find:

```ts
  // temperature (Stage 3 thermal model)

```

replace with:

```ts
  // Stage 7k (R57): the Ventilation panel "Respiratory mechanics and volumes" — glossary §5.6 labels (research/11)
  ['resp.mechanics.ppeak', 'Ppeak', 'cmH₂O', 1], ['resp.mechanics.pplat', 'Pplat', 'cmH₂O', 1], ['resp.mechanics.peepTot', 'PEEPtot', 'cmH₂O', 1], ['resp.mechanics.peepi', 'PEEPi (auto-PEEP)', 'cmH₂O', 1], ['resp.mechanics.dp', 'ΔP', 'cmH₂O', 1],
  ['resp.mechanics.cstat', 'Cstat', 'mL/cmH₂O', 0], ['resp.mechanics.cdyn', 'Cdyn', 'mL/cmH₂O', 0], ['resp.mechanics.rinsp', 'Rinsp', 'cmH₂O·s/L', 1],
  ['resp.mechanics.vt', 'VT', 'mL', 0], ['resp.mechanics.flow', 'V̇insp', 'L/s', 2],
  ['resp.mechanics.plEi', 'PL,ei', 'cmH₂O', 1], ['resp.mechanics.plEe', 'PL,ee', 'cmH₂O', 1],
  // short Pes labels: the label column must keep "est." visible (R50 F14; glossary "Pes (estimate)")
  ['resp.mechanics.pesEi', 'Pes,ei est.', 'cmH₂O', 1], ['resp.mechanics.pesEe', 'Pes,ee est.', 'cmH₂O', 1], ['resp.mechanics.elErs', 'EL/Ers', '', 2],
  ['resp.vd.anat', 'VD anat', 'mL', 0], ['resp.vd.app', 'VD app', 'mL', 0], ['resp.vd.alv', 'VD alv', 'mL', 0], ['resp.vd.phys', 'VD phys', 'mL', 0],
  ['resp.vd.vdvt', 'VD/VT', '%', 0, 100], ['resp.vd.peco2', 'PĒCO₂', 'mmHg', 1],
  ['resp.volumes.frc', 'FRC', 'mL', 0], ['resp.volumes.tlc', 'TLC', 'mL', 0], ['resp.volumes.rv', 'RV', 'mL', 0], ['resp.volumes.vc', 'VC', 'mL', 0],
  ['resp.volumes.frcSit', 'FRC (seated, PFT)', 'mL', 0], ['resp.volumes.erv', 'ERV', 'mL', 0], ['resp.volumes.ic', 'IC', 'mL', 0], ['resp.volumes.cc', 'CC', 'mL', 0],
  ['resp.volumes.fvc', 'FVC', 'mL', 0], ['resp.volumes.fev1', 'FEV₁', 'mL', 0], ['resp.volumes.ratio', 'FEV₁/FVC', '%', 0, 100], ['resp.volumes.pef', 'PEF', 'L/min', 0, 0.06],
  ['resp.volumes.fet', 'FET', 's', 1], ['resp.volumes.pattern', 'Spirometry pattern', ''],
  ['resp.volumes.pred.tlc', 'TLC predicted', 'mL', 0], ['resp.volumes.pred.rv', 'RV predicted', 'mL', 0], ['resp.volumes.pred.frc', 'FRC (seated) predicted', 'mL', 0],
  ['resp.volumes.pred.vc', 'VC predicted', 'mL', 0], ['resp.volumes.pred.fvc', 'FVC predicted', 'mL', 0], ['resp.volumes.pred.fev1', 'FEV₁ predicted', 'mL', 0],
  ['resp.volumes.pred.ratio', 'FEV₁/FVC predicted', '%', 0, 100], ['resp.volumes.pred.pef', 'PEF predicted', 'L/min', 0, 0.06],
  // temperature (Stage 3 thermal model)

```

Edit 2 — find:

```ts
  ['peepTot', 'Total PEEP', 'cmH₂O', 1],
```

replace with:

```ts
  // Stage 7k (R56): "PEEPtot" is the expiratory-hold reading (resp.mechanics.peepTot, glossary #146); this is the model's mean alveolar value
  ['peepTot', 'Mean end-expiratory alveolar pressure', 'cmH₂O', 1],
```

#### Modify `apps/demo/src/physiology-console/organs.test.ts`

Edit 1 — find:

```ts
  it('has 14 groups ending with other', () => {
    expect(GROUPS).toHaveLength(14);
```

replace with:

```ts
  it('has 15 groups ending with other (Stage 7k: "Respiratory mechanics and volumes")', () => {
    expect(GROUPS).toHaveLength(15);
```

#### Modify `apps/demo/src/physiology-console/lung-labels.test.ts`

Edit 1 — find:

```ts
    ['resp.lung.peepTot', 'Total PEEP', 'cmH₂O', 1],
```

replace with:

```ts
    ['resp.lung.peepTot', 'Mean end-expiratory alveolar pressure', 'cmH₂O', 1], // Stage 7k (R56): PEEPtot is the expiratory-hold reading, resp.mechanics.peepTot
```

- [ ] **Step 3: Run.** `npx vitest run src/physiology-console` (in `apps/demo`) → every file green except any row
  Task 0 recorded as red for another stage (prototype: V.1's `resp.lung.lp.waterShunt` in `lung-labels.test.ts`);
  `mechanics-panel.test.ts` **11 passed** (`kind`, `t` and `fe.*` are internal rows). `npx -y pnpm@9.15.9 -r typecheck` clean.
- [ ] **Step 4: Commit, push.** `feat(console): the Ventilation panel "Respiratory mechanics and volumes" (7k, R57; E-7k-2)`.

### Task 6: Evidence on the live console (demo e2e; Chromium; PROTOTYPED)

**Files:** Create `apps/demo/e2e/stage7k-mechanics.e2e.ts`; the run writes `docs/gates/stage-7k/vcv-healthy.jpg` and
`docs/gates/stage-7k/vcv-bronchospasm.jpg`.

#### Create `apps/demo/e2e/stage7k-mechanics.e2e.ts`

```ts
// Gate 7k evidence on the live 7x console: the Ventilation panel ("Respiratory mechanics and volumes") fills from the
// engine's truth once the internal ventilator runs, and a bronchospasm raises Ppeak, Rinsp and PEEPi on the next
// breaths. JPEG element shots (≤ 60 KB) for docs/gates/stage-7k/. Chromium only (evidence; WebKit fonts change sizes).
// Run: PME_SHOTS=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/stage7k-mechanics.e2e.ts --project=chromium (shots)
import { mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-7k');

test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => vite?.close());

type Hook = { ready: boolean; ui: { model: { t: number } } };
const waitSim = (page: Page, t: number) => page.waitForFunction((t) => (window as unknown as { __pmeConsole: Hook }).__pmeConsole.ui.model.t >= t, t, { timeout: 120_000 });
const simT = (page: Page) => page.evaluate(() => (window as unknown as { __pmeConsole: Hook }).__pmeConsole.ui.model.t);
const num = async (page: Page, path: string) => Number((await page.locator(`tr[data-path="${path}"] .v`).textContent())?.replace(/[^\d.-]/g, ''));
/** JPEGs only with PME_SHOTS=1 (R50 F9: the bytes are not deterministic; CI and `test:e2e` run the smoke only). */
async function shot(page: Page, name: string) {
  if (process.env.PME_SHOTS !== '1') return;
  const path = `${out}/${name}.jpg`;
  await page.locator('details[data-group="mechanics"]').screenshot({ path, type: 'jpeg', quality: 55 });
  expect(statSync(path).size, `${name}.jpg ≤ 60 KB`).toBeLessThanOrEqual(60 * 1024);
}

test('Ventilation panel: VCV fills ΔP/Cstat/Ppeak; bronchospasm raises Ppeak and PEEPi', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'evidence shots are Chromium-only (the 7x precedent)');
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/physiology-console.html`);
  await page.waitForFunction(() => (window as unknown as { __pmeConsole?: Hook }).__pmeConsole?.ready === true);
  await page.selectOption('[data-id="speed"]', '4');
  // collapse the other sections so the panel is in view
  await page.evaluate(() => document.querySelectorAll<HTMLDetailsElement>('details.pc-sec').forEach((d) => { d.open = d.dataset.group === 'mechanics'; }));
  await page.selectOption('[data-f="src"]', 'ventilator');
  await page.click('[data-act="vent"]');
  await waitSim(page, (await simT(page)) + 40);
  const sec = page.locator('details[data-group="mechanics"]');
  await expect(sec).toBeVisible();
  for (const p of ['resp.mechanics.dp', 'resp.mechanics.cstat', 'resp.mechanics.ppeak', 'resp.vd.vdvt', 'resp.volumes.frc', 'resp.volumes.ratio']) await expect(sec.locator(`tr[data-path="${p}"]`)).toBeVisible();
  await expect(sec.locator('tr[data-path="resp.mechanics.dp"] .lbl')).toHaveText(/^ΔP/);
  const ppk0 = await num(page, 'resp.mechanics.ppeak');
  await shot(page, 'vcv-healthy');
  await page.fill('[data-f="lcond"]', 'bronchospasm');
  await page.fill('[data-f="lsev"]', '1');
  await page.click('[data-act="lcond"]');
  await waitSim(page, (await simT(page)) + 60);
  expect(await num(page, 'resp.mechanics.ppeak')).toBeGreaterThan(ppk0 + 10);
  expect(await num(page, 'resp.mechanics.peepi')).toBeGreaterThan(3);
  await shot(page, 'vcv-bronchospasm');
  expect(errors).toEqual([]);
});
```

- [ ] **Run** (repo root; Playwright's own Chromium): the CI smoke `npx -y pnpm@9.15.9 exec playwright test
  apps/demo/e2e/stage7k-mechanics.e2e.ts --project=chromium` → 1 passed, no files written (R50 F9: the JPEG bytes are
  not deterministic); then the shots, `PME_SHOTS=1 npx -y pnpm@9.15.9 exec playwright test
  apps/demo/e2e/stage7k-mechanics.e2e.ts --project=chromium` → 1 passed (prototype 26 s; shots 34 KB and 44 KB).
  Open both JPEGs: the healthy shot shows Ppeak ≈ 17, ΔP ≈ 9, Cstat ≈ 55, FRC 2100 (awake: the console patient is not
  anaesthetised); the bronchospasm shot Ppeak 40.0 (the default Pmax — FU-6 D18), PEEPi ≈ 12, Rinsp ≈ 48, FEV₁/FVC 29 %,
  "obstructive". WebKit skips (the 7x precedent).
- [ ] **Commit, push** the e2e file and the two JPEGs: `test(e2e): 7k Ventilation panel evidence`.

### Task 7: Gate — merge main, full verification, gate note, pull request

**Files:** Create `docs/gates/stage-7k.md` (the template below; the executor fills every `TBD`).

- [ ] **Step 1:** `git fetch origin && git merge --no-edit origin/main`; resolve by keeping both sides (the SKIP_PATH
  line is a union). Re-run Task 4 Steps 3–5 and Task 5 Step 3 on the merged head.
- [ ] **Step 2: Full verification.** `npx -y pnpm@9.15.9 -r typecheck`; engine `CI=1 PME_TEST_SET=fast`, `slow-a`,
  `slow-b` (bounded waits ≤ 10 min per poll; record `resp-mechanics.test.ts`'s wall time in slow-a — it is in `SLOW_A`
  because slow-b was 37.6 of its 40 min at G-FU4, slow-a 17–22 min); `npx -y pnpm@9.15.9 -r test`; the e2e of Task 6. Delete `packages/engine-core/test/scratch-7k/`.
- [ ] **Step 3: The gate note.**

#### Create `docs/gates/stage-7k.md`

```md
# Gate 7k — respiratory mechanics and lung volumes (R57)

Branch `stage-7k-respiratory-mechanics`, PR "Stage 7k: respiratory mechanics and lung volumes". Plan:
`docs/plans/stage-7k-respiratory-mechanics.md`. Every number below is measured on the branch head named in §1; the
executor replaces each `TBD` with the measured value and keeps the plan's prototype value beside it.

## 1. Head and base

- Branch head: TBD (after `git merge origin/main` in Task 7).
- Base: `origin/main` TBD (FU-6 and FU-7 merged — `git log --oneline origin/main | grep -E 'FU-6|FU-7'`).

## 2. What 7k adds (one owner per quantity)

| Truth path | Glossary label | Owner | How |
|---|---|---|---|
| `resp.mechanics.{ppeak,pplat,peepTot,peepi,dp,cstat,cdyn,rinsp,flow,vt}` (+ internal `kind`, `t`) | Ppeak, Pplat, PEEPtot, PEEPi, ΔP, Cstat, Cdyn, Rinsp, V̇insp, VT | 7k (lungs) | per breath; holds on a copy (D1); Rinsp null without square flow (F7); set PEEP stays `resp.driver.vent.peep` |
| `resp.mechanics.{pesEi,pesEe,plEi,plEe,elErs}` | Pes,ei/ee (estimate), PL,ei/ee, EL/Ers | 7k | awake spontaneous: the model's pleural pressure (West); supine ventilated/anaesthetised: 6.9 + 0.22·(BMI − 22.5)₊ + ΔPpl (D4) |
| `resp.vd.{anat,app,alv,phys,vdvt,peco2}` | VD anat, VD app, VD alv, VD phys, VD/VT, PĒCO₂ | 7k on FU-4's `physicalDeadSpace` | Enghoff (D5) |
| `resp.volumes.frc` | FRC | FU-6 `frcNow` via `aeratedFrc` (one function) | D6 |
| `resp.volumes.{frcSit,tlc,rv,vc,erv,ic,cc,fvc,fev1,ratio,pef,fet,pattern,pred.*,fe.*}` | FRC (seated, PFT), TLC, RV, VC, ERV, IC, CC, FVC, FEV₁, FEV₁/FVC, PEF, FET | 7k — the ONE clinical TLC/RV (D17; `TLC_ML_KG`/`RV_ML_KG` are the model's internal P–V range) | D7–D11 |

Not duplicated: the ventilator link's `Measured.PIP/PLAT/autoPEEP/Cstat/Raw` (V.1) stay the ventilator's own readings.

## 3. Prototype vs branch (every readout × every patient)

| patient | readout | prototype | branch | band (source) |
|---|---|---|---|---|
| healthy 70 kg GA VCV 500 × 12 PEEP 5 | Ppeak / Pplat / PEEPtot / ΔP | 17.1 / 14.2 / 5.1 / 9.1 | TBD | < 30 / 10–20 / ≈ PEEP / 6–12 (Hess & Kacmarek) |
| (the full table of the plan's "Prototype results" — one row per patient) | | | | |

## 4. Tests

- Engine fast set: TBD files / TBD passed (before: TBD).
- Engine slow-a (with `resp-mechanics.test.ts`, R50 F1): TBD; the file's wall time on CI: TBD s (prototype 13.9 s locally; slow-a ran 17–22 of 40 min at G-FU4, slow-b 37.6 — not touched). slow-b: TBD.
- `truth-event.test.ts`: synthetic 12-drug tree TBD leaves (prototype 2 061; cap 2 100).
- Demo console tests: TBD; e2e `stage7k-mechanics.e2e.ts` (Chromium): TBD.
- `pnpm -r typecheck`: TBD. tick-bench p50: before TBD ms → after TBD ms (prototype 0.53 → 0.54).
- Byte identity: the event/state hash of the three ventilated rigs is identical before and after 7k (Task 4 Step 5): TBD.

## 5. `it.fails` added by 7k (R45)

- `volumes.test.ts` — COPD GOLD 1 FEV1 ≥ 80 % pred: measured TBD (prototype 71 %; Q-7k-2).
- `resp-mechanics.test.ts` — healthy GA Enghoff VD/VT 0.30–0.45: measured TBD (prototype 0.28; Q-7k-5).
- `resp-mechanics.test.ts` — COPD GOLD 3 PEEPi 4–8 at RR 14: measured TBD (prototype 3.6; the 7b lung's own value, R46 calibration row).

## 6. Calibration queue (R44, Ali)

Ali's: Q-7k-1 (bedside FRC scale vs ECSC), Q-7k-2 (COPD GOLD 1), Q-7k-5 (VD/VT under GA), Q-7k-6 (re-base the model's P–V range on
ECSC, v1.1) — numbers in the plan's "Open questions". Ruled by the orchestrator: ECSC + fixed ratio in v1.0, GLI + LLN in v1.1;
closing capacity a readout in v1.0, a mechanism in v1.1. The obese FRC double count is FU-8's (not listed here).

## 7. Exceptions used

E-7k-1 (`src/truth.ts` SKIP_PATH `resp.brk`, `resp.lung.mp` — the 7x console loses its 30 `resp.lung.mp.*` model-internals rows,
and `lung-labels.test.ts`'s curated `resp.lung.mp.units.3.rIn` label row now describes a path the engine no longer publishes),
E-7k-2 (console label tests), E-7k-3 (`gas/params.ts` `defaultHeightCm`).

## 8. Re-anchoring (Task 0 Step 3)

TBD — every block that did not match exactly once on the merged main, its cause and the adjusted anchor.

## 9. Evidence

- `docs/gates/stage-7k/vcv-healthy.jpg`, `docs/gates/stage-7k/vcv-bronchospasm.jpg` (the console's Ventilation panel; taken with
  `PME_SHOTS=1` — CI runs the smoke only).
```

- [ ] **Step 4: PR.** `gh pr create --title "Stage 7k: respiratory mechanics and lung volumes" --body …` — the body lists
  what 7k adds (the gate note §2 table), the prototype-vs-branch table, the three `it.fails`, E-7k-1..3, Ali's open
  questions Q-7k-1, -2, -5, -6, and ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Never merge.

## Open questions for Ali (the plan does not wait on them; each with the model's numbers and a recommendation)

- **Q-7k-1 — The bedside FRC is ~20–35 % below textbook.** Healthy 70 kg man 40 y 175 cm: engine awake supine FRC 2.10 L
  (30 mL/kg IBW), anaesthetised 1.40 L (20 mL/kg), vs ECSC seated 3.41 L − the supine fall 0.5–1.0 L ≈ 2.4–2.9 L awake
  supine and a further −0.4–0.5 L under GA ≈ 1.9–2.5 L (Nunn; Hedenstierna & Edmark 2010). The GA FRC is below the
  clinical RV 7k publishes (ECSC 1.94 L; impossible for one patient) though above the lung model's own internal P–V
  floor (16 mL/kg = 1.12 L, D17) — the two scales disagree, and D17/Q-7k-6 is the other half of this question. Re-basing the O2 store on ECSC (2.61 / 2.09 L) moves the
  preoxygenated apnoea to SaO2 90 % from 8.1 to 11.8 min (band 6.5–9.5; GA 1.80 L alone: 10.2 min), so the low FRC is
  holding up the desaturation band — something else in the O2 budget (VO2 3.5 mL/kg/min awake × 0.85 under GA, the
  blood O2 store) is compensating. **Recommendation:** keep it for v1.0 (7k shows ERV/IC against the seated PFT FRC, D6,
  so no clinically wrong capacity is displayed); open a v1.1 O2-budget item that raises FRC to ECSC-derived values and
  finds what else makes the engine desaturate slowly, re-measured against Benumof, Patel (child) and the obese row.
- **Q-7k-2 — COPD GOLD 1 reads GOLD 2.** Catalogue severity 0.25 gives FEV1 71 % pred with FEV1/FVC 0.61 (GOLD 1 is
  ≥ 80 %); GOLD 2–4 read 55/41/28 % (in). Cause: the catalogue's GOLD 1 row already sets the expiratory/inspiratory
  resistance ratio to 1.5 (healthy 1.2 → 1.5 in one step) plus R ×1.3. **Recommendation:** accept for v1.0 (`it.fails`
  with the number); in the calibration pass move the GOLD 1 `rawExp` knot to ≈ 1.3 (it only affects PEEPi at high rates,
  where GOLD 1 is rarely a teaching case).
- **Q-7k-3 and Q-7k-4 — RULED by the orchestrator (7k R50 review):** ECSC with the fixed FEV1/FVC ratio for v1.0,
  GLI with the lower limit of normal in v1.1 (D7, D11); closing capacity a published readout in v1.0, airway closure as
  a mechanism in v1.1 (D10). Not Ali's questions any more; listed so the numbering stays stable.
- **Q-7k-5 — VD/VT under GA is at the low edge.** Healthy anaesthetised adult on ETT: Enghoff VD/VT 0.28 (VD phys
  140 mL = VD anat 77 + app 50 + alv 13), band 0.30–0.45 (Nunn 8e; the glossary's "0.3–0.45 ventilated"). Awake 0.33
  (in). The low value comes from FU-4's ETT bypass (−1.1 mL/kg) with a 50 mL apparatus and the healthy alveolar dead
  space 0.075 of VA (HEALTHY_VDALV, fitted to Pa−EtCO2 3 mmHg). **Recommendation:** accept for v1.0 (`it.fails`); in the
  calibration pass raise the anaesthetised alveolar dead space (GA increases VD alv by lowering the non-dependent
  perfusion — Nunn: VD/VT ≈ 0.35 under GA) rather than the apparatus.
- **Q-7k-6 — Re-base the lung model's P–V range on the clinical TLC/RV? (v1.1; R50 F5)** The unit sigmoids span
  `TLC_ML_KG` 80 − `RV_ML_KG` 16 = 64 mL/kg IBW (4.5 L for the reference man: TLC 5.6, RV 1.1 L), while the clinical
  values 7k publishes are ECSC TLC 6.90 / RV 1.94 L (VC 4.96 L — so the ranges' WIDTHS agree within 10 %, their
  positions do not). Today no readout depends on the absolute position (the mechanics are relative to FRC), but a 7h
  P–V loop drawn from the sigmoid would saturate ≈ 1.3 L below the published TLC. **Recommendation:** v1.1, together
  with Q-7k-1 (the FRC scale), since moving the sigmoid's floor moves every Pplat/Cstat number and the O2 store.
  (The former Q-7k-6, obesity counted twice in the bedside FRC, moved to FU-8's obese-patient hand-over by the
  orchestrator's ruling — D16.)

## Self-review

- **Mechanical find-block check (after the R50 fixes, 2026-09-29).** `scratch/plans-backup/fu-4-verify.py` parsed THIS
  plan's blocks and applied them in task order to `git archive` of the prototype base (`c776524` + V.1 + FU-6 =
  `b97ebaa`): **8 creates, 23 edits, 0 errors**; the resulting tree equals the fixed prototype worktree byte for byte for
  all 18 changed/created files (`stage-7k-prototype.patch`, updated; the two JPEGs come from Task 6's `PME_SHOTS=1`
  run). Each of the 23 find texts occurs exactly ONCE on the base. On plain `origin/main` (no FU-6) exactly the three
  blocks marked "(FU-6 line)" fail; on the LIVE V.1 branch a fourth fails — the `gas/params.ts` import line (V.1's
  executed E-V1-1, declared in Task 0 Step 3 and Requests → V.1, R50 F10).
- **R50 review (APPROVE WITH FIXES, 6 major, 10 minor) — every finding applied:** F1 → `SLOW_A` (ruling); F2 → new
  glossary entries unnumbered N1–N7 after 294; F3 → ECSC `pred.pef` + the central-airway peak term + a guard test
  (asthma 1 PEF 39 %, COPD 2/3 58/47 %); F4 → awake Pes = the model's pleural pressure (PL,ee +5.4), supine balloon
  offset only when ventilated/anaesthetised, per-context glossary normals (ruling); F5 → D17, the constants relabelled
  internal, FU-6's request answered, Q-7k-6; F6 → PĒCO2 = PICO2 + φe(1 − VDs/VT)(PaCO2 − PICO2) + rebreathing test;
  F7 → Rinsp null without square flow; F8 → no `peep` leaf, `kind`/`t` internal, VT keyed to #125; F9 → `PME_SHOTS=1`;
  F10 → the stale V.1 import declared, the child re-measured in Task 0; F11 → 16–20 y blend (+ the ratio note); F12 →
  COPD PEEPi 3.6 `it.fails`; F13 → GA/supine atelectasis excluded from the PFT aeration; F14 → D13 corrected, Stage 9
  placeholder Request, "est." labels; F15 → stated in E-7k-1 and the gate note; F16 → wording, cached reference τ,
  FRC asserted equal to lungState, [ENG] on the children's Pes, Q-7k-6 moved. Rulings Q-7k-3/-4 recorded; Q-7k-6
  (obese) moved to FU-8.
- **R57 coverage:** Ppeak ✓, Pplat ✓ (hold), PEEP ✓ (the driver's leaf, not duplicated), PEEPi/auto-PEEP ✓ (hold), ΔP ✓, PL ✓ with an oesophageal
  ESTIMATE ✓ (labelled so), Cstat ✓, Cdyn ✓, resistance ✓ (Rinsp), VD anat/alv/phys ✓ + VD/VT (Enghoff, PĒCO2 added) ✓,
  FRC ✓ (FU-6's), ERV ✓, RV ✓, TLC ✓ (one owner, D17), VC ✓, IC ✓, FEV1/FVC ✓ with obstruction/restriction ✓ (PEF
  consistent with FEV1), in truth ✓ and a
  Ventilation panel ✓; PFT device = 7h later (Requests) ✓. Hold commands: not added — the link has them (D2).
- **One owner each / no duplicates:** FRC (bedside) = FU-6 via one function; seated FRC is a different, labelled
  quantity; the dead space = FU-4's function; the ventilator's `Measured` values untouched; `resp.lung.pInsp/peepTot`
  keep their model roles and are relabelled so the clinical labels point at the measurements only.
- **R45:** no existing test or band changed except two console LABEL tests (E-7k-2: the group count 14 → 15 and one
  relabel); three new `it.fails` carry their numbers (GOLD 1 FEV1 71 %; GA VD/VT 0.28; COPD GOLD 3 PEEPi 3.6); the
  base's event stream is byte-identical after 7k (the three-rig hash, re-run after the fixes).
- **CI:** one new SLOW file in `SLOW_A` (13.9 s locally, ≈ 60 s CI by the 4× rule; slow-b untouched); fast additions
  ≈ 20 ms; tick p50 +2 %; truth 12-drug tree 2 061 < 2 100.
- **Unprototyped:** nothing in Tasks 1–6 (all code ran; the e2e ran in Playwright's Chromium, WebKit skipped by
  design). Task 7's full `slow-a`/`slow-b` runs and the merged-main re-anchoring are the executor's.
- **Risk:** FU-7 may move the SKIP_PATH line, the SLOW list and the params import (Task 0 Step 3 lists them); if FU-7
  adds more than ~35 truth leaves of its own without paying, the 12-drug tree may reach the cap — FU-7's E-FU7-8 pays
  for its fields, and Task 4 Step 3 re-measures.
