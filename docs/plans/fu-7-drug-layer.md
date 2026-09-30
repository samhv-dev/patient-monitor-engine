# FU-7: Drug-layer integration (onset curves, ONE hypnotic/opioid potency output, chronic β-blockade as occupancy, the stimulus sympathetic surge, antiarrhythmic conversion and shock success, drug interactions) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> STATUS: **FIXED + CM + DV + RH/ET amendments (2026-09-30; 7,181 lines) — READY.**
>
> **RH/ET amendment (third amendment fixer, 2026-09-30).** The renal/hepatic run (`research/13-coverage-renal-hepatic.md`,
> §4 FU-7 rows) and the endocrine/thermal run (`research/14-coverage-endocrine-thermal.md`, §4) were folded in before
> execution:
> - **Task 2 Step 2c.** The fallback-curve rows follow organ function (H9). Only the elimination share of the decline
>   slows, from a sourced t½β on 8 rows. The renal rows cover CKD's ×0.3 through `PkCtx.renal`. Morphine's M6G is
>   recorded as NOT MODELLED.
> - **Step 2d.** Fentanyl gains FU-4 G10's flow-dependent distribution (Egan 1999; FU-8 A28 does not cover it).
> - **Step 2e.** Furosemide was verified against its label: no row change.
> - **Task 18 Step 4a.** It carries the measured diabetic arm. Main's 0.00 is the placeholder row, which Steps 1–1c
>   fix.
> - **Task 10 case 1c.** A new incision arm.
> - **Requests → FU-10.** Hydrocortisone waits for FU-10's basal adrenal deficit, and Task 9's sympathetic seam is
>   shared with E4/E12.
>
> Prototyped on `origin/main` **7954933** (the whole plan applied, RH/ET runners read-only):
> - RH-12d midazolam ×1.00 → **1.17** (band 1.3–2.5, reported);
> - RH-15b fentanyl ×1.19 → **1.40** ✓;
> - RH-07a furosemide onset/peak **90 s / 8.5 min** (label ✓);
> - ET-19 dexamethasone in type 2 0.00 → **+1.83** (band 2–4, `it.fails`; non-diabetic +1.02);
> - ET-16a incision +7.7 → **+19.1** (band 20–30, `it.fails`).
>
> 13 new find/replace pairs, all unique on 7954933. The run also found 13 pre-existing Task 9/10 anchors stale since
> FU-4 18e; they are listed for Task 0. Details: Task 2, Self-review, Find-block verification.
>
> Previous status: **FIXED + CM + DV amendments (2026-09-29; 6,603 lines) — READY.**
>
> **DV amendment (second amendment fixer, 2026-09-29).** The devices coverage run (`research/20-coverage-devices.md`,
> 65 cells on main 3feee6f; §4 "Findings for FU-7") was folded into **Task 12** before execution:
> - **(1)** the base VF termination is re-sourced to the biphasic first-shock literature, 70 → **90 %** (Schneider 2000;
>   van Alem 2003). Termination is kept distinct from ROSC, which stays 10 %. This is Step 0, with Stage 4's table test
>   following it.
> - **(2)** a sourced-direction **temperature** factor on termination below 30 °C, and the CoPP factor gated to the
>   **circulatory phase** (≥ 240 s; Weisfeldt & Becker 2002; Cobb 1999; Wik 2003). The ischaemia-time term already
>   existed.
> - **(3)** cardioversion by **rhythm and energy**: AF / flutter–SVT / monomorphic VT curves replace the flat 80 %.
> - **(4)** CoPP read only from the **continuous** no-beat value.
> - **(5)** a new **Step 7a** measures ROSC end to end, with DV-01c and DV-25a as guards.
> - **(6)** a new **Task 0 Step 6c** checks FU-8 Part A's V1 fix (DV-01b). If it is absent, the `arrestS` arm uses
>   engine-declared arrests only.
> - **(7)** a Task 11 note: `λ_amio_vf = 0` is consistent with every DV cell.
>
> Prototyped on `origin/main` **2c49d87** with the DV runner, read-only:
> - DV-01a termination **95 %**;
> - DV-24a/b termination difference **55** points;
> - DV-06a AF 200 J **87.5 %** vs 20 J **12.5 %**; DV-06b flutter 50 J **95 %**; DV-06c VT **95 %**;
> - end-to-end effective ROSC **7.5 / 0 / 7.5** (early / late without CPR / late with CPR).
>
> All 9 Task 12 find/replace pairs are unique on 2c49d87 (4 new, 5 with changed replacements). Typecheck is clean, and
> `test/l3` + `test/engine/device` pass (163). Details: Task 12, Self-review, Find-block verification.
>
> Previous status: **FIXED + CM amendment (2026-09-29; 6,069 lines) — READY.** The CM comorbidity coverage run
> (`research/19-coverage-comorbidity.md`, 69 cells on main 0fd5397; its §4 "Findings for FU-7") was folded in BEFORE
> execution by the amendment fixer on `origin/main` **66e3052** (FU-3, FU-4 and FU-5 merged): **Task 17** dobutamine is
> measured first and its refit is conditional (CM-06d is **+34.9 %**, already inside 20–45 on the FU-4 tree — the
> pre-FU-4 +17.9 % the refit was sized on is stale) with CM-06d kept as the task's guard, the new nitroprusside row gains
> an HFrEF acceptance arm beside hydralazine's measured SV **+3.5 %** (CM-06e), and the esmolol refit now re-measures
> CM-04d / CM-14c / CM-15b; **Task 10** gains acceptance case 1b, the untreated-hypertension laryngoscopy arm (measured
> ratio **1.19** against Prys-Roberts 1971's ≈ 2×, `it.fails` with its number if unmet, the remainder owned by FU-8
> Part B); **Task 0 Step 6b** is a new precondition check for FU-8 Part A's fast-AF fix (CM-15c) with AF-rig guards in
> **Tasks 11, 12 and 19** if it has not landed; **Task 18** gains a diabetic dexamethasone arm (ET-19); **Tasks 16 and 6**
> carry notes naming the asthma-reactivity (CM-11a) and OSA opioid-sensitivity (CM-12a) seams — notes, not tasks; and
> **Requests → FU-8** states that the resting-sympathetic-tone gap (C1) is FU-8 Part B's with Ali reviewing first, that
> Task 9 adds no resting tone and that **E-FU7-3 is not widened**. The amendment adds no `ts` find block; the code strings
> it touches were re-verified unique on 66e3052 (the dobutamine row's quoted form corrected to the merged tree's).
>
> Previous status: **FIXED (third fixer, 2026-09-28; 5,818 lines) — R50 review APPROVE WITH FIXES, all 21 findings
> and Orchestrator rulings (FU-7 review) 1–6 + R51 addendum 25 applied** (audit: `<scratchpad>/fu-7-fix3/00-audit.md`;
> first and second fixers stopped by usage caps, the third finished). VERIFIED on `origin/main` bab4b72 +
> `origin/fu-4-integration-polish` e3eeb56: **195 find/replace pairs applied in task order — 193 unique, the 2 declared
> FU-6 misses** (Task 1's `audit:respiratory` anchor; Task 6 Step 1b's FU-6 `hvrDep` line); every interface field is a
> real block; **typecheck clean** with no hand edits; `test/l2` + `test/l3` **193 files / 933 passed, 1 skipped**;
> `pnpm run audit:drugs all` on the applied tree (rows in "Find-block verification"). PROTOTYPED: Tasks 2–6, 8, 9, 10
> (incl. addendum 25 and ruling 1's six guard arms) and 18 Steps 1–2; the remaining tasks carry exact code and the R45
> procedure and are labelled **UNPROTOTYPED**. Numbers: "Prototype — second fixer".
>
> **FU-7 executes AFTER FU-6 merges** (R53/R59 revised order: FU-4 → V.1 → FU-6 → FU-7 → 7i/7k/7j → Stage 9 → 8b,
> FU-5 in parallel). Every block in this document is written against `origin/main` **dba7fda**, which carries NONE of
> FU-4, V.1, FU-6 or FU-5. **Task 0 re-verifies every block on the merged main and re-anchors what moved** — the shared
> files are named there.

**Goal:** close the 37 new gaps of `research/14-audit-drug-interactions.md` (coverage run DI, 105 cells on main
3ff2fb0) that no stage owns, under R51 addenda 19–24:

1. **(19) Onset.** Every drug effect rises from zero slope. The fallback effect curve gives 19 of the 26 library rows a
   step onset (naloxone and flumazenil act in 5 s, ketamine causes unconsciousness in 5 s, midazolam reaches 87 % of its
   peak at 30 s, atropine peaks at 30 s). The curve is replaced by a transit chain fitted to the SAME peak time and
   10 % time, so every row keeps its sourced numbers.
2. **(20) ONE hypnotic-potency output and ONE opioid-potency output.** 7g publishes a propofol-equivalent brain Ce and a
   fentanyl-equivalent brain Ce (each with a ventilatory twin); 7f's depth and drive read them instead of four named
   agents, so thiopental, etomidate, ketamine and midazolam cause unconsciousness and apnoea. Ketamine carries a
   dissociative flag (EEG/BIS index almost unchanged, airway reflexes kept, sympathomimetic unless
   catecholamine-depleted). The opioid–benzodiazepine ventilatory interaction moves onto the Greco response surface
   (Bailey 1990: fentanyl 2 µg/kg + midazolam 0.05 mg/kg → SpO₂ < 90 % in 11/12, apnoea in 6/12), fentanyl 5 µg/kg
   stops breathing, and the apnoea flag stops contradicting the breathing.
3. **(21) Chronic β-blockade is receptor occupancy**, not a gain scale: it scales every β-agonist's EC50 and, when
   non-selective, unmasks α (ephedrine, adrenaline reflex bradycardia, β-blocked anaphylaxis with glucagon rescue).
   Indirect sympathomimetics (ephedrine, ketamine) act through 7e's central sympathetic drive, where β-blockade and
   catecholamine depletion reach them.
4. **(22) Laryngoscopy / intubation / surgical stimulus is a sympathetic SURGE** that FU-4's baroreflex does not cancel
   within its time course (+20–30 mmHg, HR +20, 2–5 min), blunted by opioid, lidocaine, labetalol and esmolol.
5. **(23) Antiarrhythmic conversion and shock success are drug- and state-dependent probabilities** (amiodarone,
   lidocaine, procainamide, adenosine; shock success × amiodarone × K⁺ × pH × CPP × arrest duration).
6. **(24) The interaction list:** LAST additive by potency-weighted dose; magnesium, calcium and burn/denervation act
   through ONE state each; the second-gas effect and the desflurane sympathetic surge; sevoflurane–rocuronium
   potentiation re-sized to 25–80 %; histamine release acts (morphine, atracurium, mivacurium → hypotension, flushing,
   bronchospasm through FU-6's smooth-muscle state); the ephedrine tachyphylaxis curve; inotrope and vasodilator sizes
   re-fitted to their labels; the inert rows (dexamethasone, tranexamic acid, ondansetron) act or are removed with a
   note (TXA keeps a hook for 7i's coagulation).

Plus: `pnpm run audit:drugs` in the repo (research/14's scripts adopted as the regression harness), the flipped matrix
cells as engine tests (SLOW set, yields per sim-MINUTE), Chromium-only e2e screenshots ≤ 60 KB for the gate, and Ali's
nine questions decided wherever the textbooks are clear (the rest marked "confirm with Ali").

**Architecture:** no new module crosses a stage boundary. 7g keeps every drug's PK and PD (R51 §1–2): the onset chain,
the two potency outputs, the β-occupancy input, the indirect-sympathomimetic drive, the antiarrhythmic hooks, the
volatile uptake coupling, the LAST sum and the row data all live in `l2/pk/**`. 7f's depth and drive stop naming agents
and read 7g's two published equivalents (duck-typed: a bus without them falls back to the pre-FU-7 per-agent sum).
The surge is 7e's stress path with FU-4's set-point factor; the shock outcome gains a state context that L3 fills from
what 7a/7c/7g already publish. Every new field is plain JSON data (snapshots, look-ahead clone).

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2, Playwright 1.63 (system Chrome), pnpm 9.15.9 via `npx`. No new
dependencies.

**Spec:** `../research/00-orchestrator-rulings.md` (workspace, outside this repo): **R45** (mechanisms, never bands),
**R51 + addenda 8–24** (drug-layer contract; addenda 19–24 are this plan's scope), **R25** (partition, own worktree),
**R50** (review before execution), **R53** (integration polish), **R54** (the coverage matrix is the standing
definition of linked physiology; each gate shows its part), **CI amendments 1–4**. Evidence:
`research/14-audit-drug-interactions.md` (§2 cells, §3 gaps D1–D15, §4 the owners' acceptance cells, §5 Ali's nine
questions), `research/12-coverage-matrix.md` §4.4 (the ledger this plan flips), `research/11-capability-inventory-and-glossary.md`
§5 (the clinical labels used in tests and the console), `docs/gates/stage-7g.md`, `docs/plans/stage-7g-pkpd.md`,
`docs/plans/fu-4-integration-polish.md` (sympathetic output + set-point reset, humoral arm, arrest machine, potassium,
vagal events, flow-dependent PK), `docs/plans/fu-6-respiratory-integration.md` (bronchodilation, the wakefulness term,
the relative apnoea threshold, hvrDep). Parameter tables: `docs/physiology/stage-7-parameter-tables.md` §1.5, §5b, §5d,
§5e, §6.1, §6.2, §6.3, §7.

---

## Global Constraints

- **R45: mechanisms, never band changes.** No existing acceptance band is widened, removed or re-worded to pass. A band
  a mechanism cannot reach stays (or becomes) `it.fails` with the MEASURED NUMBER in its title; a pre-declared
  `it.fails` whose band is now met is flipped to `it` (keeping the old number in a trailing "was …" clause). Every
  changed parameter is sourced or `[ENG]` with its fit target named in the code comment. In this plan the pre-declared
  and expected `it.fails` are listed in "Expected `it.fails` after FU-7" and repeated in each task; the known ones are
  the ephedrine β-blocked ratio (Task 8/9, measured 0.99 against 0.3–0.7 — Ali's Q1), the fentanyl 5 µg/kg apnoea
  duration (Task 7, FU-6-dependent) and the DI-01c haemodynamic synergy (Task 9, FU-4's `symp` rows).
  **A cell of research/14 is NEVER "fixed" by editing the audit's band** — the audit's bands are proposals for Ali; the
  harness adopted in Task 1 keeps them byte for byte, and a cell that stays non-PL is reported in the gate note.
- **R51 + addenda 19–24 (binding).** 7g owns all PK and PD and every drug event (`l2/pk/**`); others read published
  outputs. Canonical names introduced by this plan (the R51 name list for the next stages):
  - `pk.bus.cns.hypPropEq` (µg/mL propofol-equivalent brain Ce — the ONE hypnotic-potency output),
    `pk.bus.cns.hypVentPropEq` (its ventilatory twin), `pk.bus.cns.dissoc` (0–1 dissociative share),
  - `pk.bus.cns.opioidCeFentEq` and `pk.bus.cns.opioidVentFentEq` (ng/mL fentanyl-equivalent — the ONE opioid-potency
    output, brain and ventilatory sites; each a TRUE fentanyl-equivalent at its own site: fentanyl Ce X alone publishes
    X at both), built from `CnsSpec.macRemiEq` (brain, MAC-reduction potency) and `CnsSpec.ventRemiEq` (ventilatory
    potency, remifentanil pinned at 1.0 — Orchestrator ruling (FU-7 review) 4; review F4), antagonist-corrected ONCE in
    7g; `pk.bus.cns.benzoShare` (0–1 benzodiazepine share of `hypVentPropEq`, the per-class ventilatory α — ruling 2),
  - `pk.bus.cns.sympDrive` (0–3: an indirect sympathomimetic's central drive, read by 7e as `extraSymp`),
  - `pk.bus.airway.histamine` (existing; now CONSUMED by 7a and the lung), `pk.bus.rhythm.antiarrhythmicU`
    (0–1 potency-weighted antiarrhythmic occupancy, read by L3's shock outcome),
  - `circ.prof.betaOcc` / `circ.prof.betaNonSel` (7a profile: chronic β-receptor occupancy and selectivity),
  - `circ.ext.surgeF` (7a: the stimulus sympathetic surge's set-point factor — FU-4's `setF` path with the opposite
    sign), `endo.core.hormones.surge` (7e: the NOCICEPTIVE surge state that alone drives it — never `h.symp`,
    Orchestrator ruling (FU-7 review) 1), `endo.core.out.surgeF`, `endo.core.out.surgeCat` (7e: the nociceptive
    CIRCULATING catecholamine release `{ ne, epi }` in 7g's rate-equivalent units — R51 addendum 25; 7g's `PkCtx.endoCat`
    carries it into the adrenergic rows' PD), `endo.core.out.catReserve` (7e: releasable-catecholamine reserve 0–1),
  - `PdTarget` additions: `'sympDrive' | 'antinocAdd' | 'antiarrhythmic' | 'qtc'`; `PdEffect.beta2`;
    `CnsSpec.dissociative` / `CnsSpec.ventShare` / `CnsSpec.macRemiEq` / `CnsSpec.ventRemiEq`; `DrugRow.flowDist` is FU-4's.
    (The earlier draft listed a `'histamineTone'` target; no task adds it — histamine keeps the existing `'histamine'`
    target and `bus.airway.histamine`, Task 16.)
  Chain order is unchanged (device → pk (7g) → neuro (7f) → organs (7d) → blood (7c) → endo (7e) → Stage 3 → hemo;
  advance pk → resp/lung → blood → endo → organs → hemo). `stimulus` keeps ONE shape (addendum 12; FU-4 adds `site`).
- **Base:** branch `fu-7-drug-layer` from `origin/main` AFTER FU-6 merges. Worktree
  `projects/patient-monitor-engine/scratch/wt-fu-7` (R25: never the shared checkout). Push after every task's commit
  (`git push -u origin fu-7-drug-layer` the first time, `git push` after). **Never push to `main`; never merge; never
  `git stash`** (the stash is shared across worktrees). Scratch and logs under `<scratchpad>/fu-7-drug-layer/`.
  Bounded waits: every wait on a background process is an `until` loop of ≤ 10 min that re-checks the process.
  The executor opens the PR in the gate task and STOPS.
- **Task 0 is mandatory (blocks are written against pre-FU-4 main).** Before Task 1 the executor re-verifies every find
  block on the merged main and re-anchors what moved, by the quoted comment or statement — never by re-typing a line it
  is not changing, never by loosening a test. Shared files, with the stage that moved them:
  | File | Moved by | What to expect |
  |---|---|---|
  | `l2/pk/combine.ts` | FU-4 (`symp`, `setF`, `vagalMs`, `muscBlock` in `NEUTRAL_FX`/`FX_TARGETS`/`OCCUPANCY`) | FU-7 has NO `NEUTRAL_FX`/`FX_TARGETS` block; its anchors (`OPIOID_U1`, `let remiEq = 0;`, `bus.cns.opioidCeRemiEq = …`) are untouched by FU-4 (review §A: all blocks unique on f576537 and b675248) |
  | `l2/pk/pipeline.ts` | FU-4 (`dist`, `distFactor`, `params`, `coRefLpm`, `bolusTimes`) | the `combine(actives, …)` call and `siteConc` are the anchors |
  | `l2/pk/row.ts` | FU-4 (`PdTarget` += `symp`/`setF`/`vagalMs`/`muscarinic`, `DrugRow.flowDist`) | append this plan's targets to FU-4's union |
  | `l2/pk/hooks.ts` | FU-4 Task 18f — **planned, NOT landed** on `origin/fu-4-integration-polish` (f576537, b675248: the signature is still `rhythmRequest(pk, hs, current: { id, pinned }, t)` returning `{ id, opts } \| null`). 18f adds `outcomeRng?: Sfc32State` and `hold?` (FU-4 plan Task 18f, `hooks.ts` edit). | Task 11 is written on 18f's signature and carries a NUMBERED fallback (Step 3a–3d) for a tree without it (review F6) |
  | `l2/pk/data/rows-anaesthetic.ts` | FU-4 (`PROPOFOL_SYMP/SETF`, `VOLATILE_SYMP/SETF`, opioid vagal rows, `flowDist`), FU-6 (`VOLATILE_HPV`) | row `pd:` arrays are longer; keep every existing entry |
  | `l2/pk/data/rows-cardiovascular.ts` | FU-4 (neostigmine/atropine/glycopyrrolate vagal + muscarinic rows) | as above |
  | `l2/pk/data/rows-other.ts` | FU-6 (magnesium `bronchodilation`) | as above |
  | `l2/neuro/depth.ts` | nothing (FU-4 never touches `l2/neuro/**`; FU-6 does not edit depth) | blocks should match as written |
  | `l2/neuro/drive.ts` | **FU-6** (`LOC_*`, `HVR_*` incl. `HVR_PROP_C50 = 3 × PROP_VENT_C50` (FU-6 F3b) and the ONE NMB arm `HVR_NMB_EMAX`/`HVR_NMB_TOFR_LO`, `DriveInputs.hypnotic`/`stress`, `NeuroResp.loc`/`pain`/`hvrDep`, the return literal) | Task 6 is written on FU-6's shape: it REPLACES FU-6's `dProp`/`dMid`/`dKet` lines, keeps `loc`, `pain`, `hvrDep`, and edits FU-6's `hvrDep` line in the SAME pass (it reads `dMid`, which Task 6 deletes — review F3; Step 1b's block is FU-6's line, a declared miss on pre-FU-6 main) |
  | `l2/neuro/pipeline.ts` `neuroResp({…})` call | **FU-6** (adds `hypnotic: d.hypnotic`, `stress: d.stress`) | measured stale on FU-6's patch (review §A): re-anchor Task 6 Step 2 on `ns.resp = neuroResp({` and ADD this plan's arguments, keeping FU-6's |
  | `l2/neuro/spont.ts`, `l2/lung/drive.ts` | **FU-6** (central lag, wake term, relative apnoea threshold) | Task 7 reads FU-6's `APNOEA_VE_IN/OUT` and `s.rr === 0` — it must NOT reintroduce an absolute VE threshold |
  | `l2/neuro/pipeline.ts`, `l2/neuro/bus.ts` | FU-6 (`IDLE_RESP`, the `neuroResp({…})` call) | add this plan's inputs to FU-6's call |
  | `engine.ts` | FU-4 (five edits incl. `pkCtx`'s `coRefLpm`, the stimulus/vagal observer, `rhythmRequest(…, ps.rng.outcome)`), FU-6 (the `advanceResp(` context) | Tasks 8, 10, 11, 12 each add ONE line to regions FU-4 touched |
  | `l3/defib-pacer/outcome.ts`, `l3/device-layer.ts` | **FU-5** (`l3/**` is FU-5's) | Task 12 is the ONE exception that edits them (**E-FU7-6**); merge `origin/main` immediately before it |
  | `l2/endo/{core,adapters,effects,params}.ts` | FU-4 (humoral arm `hum`, `humSvrF`, `humDV0Frac`, `mapSetMmHg`) | Tasks 9 and 10 add fields beside FU-4's |
  | `l2/circ/{profile,model,baroreflex}.ts` | FU-4 (`outF`/`setF`/`brainF`, `arrest.ts`, CPR, `vCprRef`) | Tasks 8 and 10 add to FU-4's `stepBaro(` call and profile |
  | `l2/neuro/interactions.ts`, `l2/blood/**` | nothing in FU-4/FU-6 | Task 14's blocks should match as written |
  | `packages/engine-core/vite.config.ts`, `.github/workflows/ci.yml` | FU-4 Task 20 (`SLOW_A`/`SLOW_B` split — not on f576537/b675248, which still carry ONE `SLOW` list; FU-6 R50 ruling 10: `SLOW_B` is DERIVED from `SLOW` by FU-4's filter, not listed), FU-5 | the THREE new slow files join the slow selection by whatever mechanism landed (Task 19 Step 2, review F16) |
  | root `package.json`, `.gitignore` | FU-4 (`audit:physiology`), FU-6 (`audit:respiratory`) | Task 1 inserts `audit:drugs` after `audit:respiratory` |
- **Partition (binding).** Edit ONLY the files each task's **Files** block lists. By owner:
  - **7g (own area):** `l2/pk/{gamma,combine,row,pd,pipeline,hooks,volatile,nmb}.ts`, `l2/pk/data/rows-*.ts`,
    `src/types-pk.ts`.
  - **7f (E-FU7-1):** `l2/neuro/{bus,depth,drive,pipeline,interactions}.ts` — the two potency outputs, the dissociative
    flag, the ventilatory surface, the apnoea flag's one truth, and the Mg/Ca EC50 source. 7f's NMB Hill and TOF model
    are untouched except `interactions.ts`'s multipliers.
  - **7e (E-FU7-2):** `l2/endo/{core,adapters,hormones,effects,params}.ts` — `sympDrug`, `catReserve`, the surge's
    stress term.
  - **7a (E-FU7-3):** `l2/circ/{profile,model}.ts` — `betaOcc`/`betaNonSel`, the histamine venous/SVR terms, the surge
    factor on FU-4's `setF` path. **`l2/circ/baroreflex.ts` is NOT edited** (FU-4 owns `outF`/`setF`/`brainF`).
  - **7c (E-FU7-4):** `l2/blood/{pipeline,core}.ts` — the succinylcholine K⁺ surge reads the nm profile; `blood.out.mg`
    and `iCa` are published for 7f (they exist; the seam is read, not created).
  - **Stage 3 / 7b (E-FU7-5):** `l2/resp/pipeline.ts` and `l2/lung/conditions.ts` — the histamine bronchospasm severity
    ONLY (through FU-6's `SMOOTH_MUSCLE`/`relaxed` path; FU-7 adds a constrictor input, it does not re-implement relief).
  - **L3 (E-FU7-6):** `l3/defib-pacer/outcome.ts` and `l3/device-layer.ts` — the shock-outcome state context, plus (DV
    amendment) the re-sourced `VF_TABLE`, the cardioversion curve and Stage 4's `test/l3/defib-pacer/outcome.test.ts`
    following the table. FU-5 owns
    `l3/**`: merge `origin/main` immediately before Task 12 and re-run FU-5's device tests after.
  - **engine.ts (E-FU7-7):** FOUR one-line additions (the β-occupancy pkCtx lines, the surge observer, the
    antiarrhythmic bus write to L3's host, the shock-context accessor).
  - `src/truth.ts` (**E-FU7-8**: SKIP_PATH entries for the new derived fields) and
    `apps/demo/src/physiology-console/meta.ts` (the drug group's new rows).
  - `scripts/audit-drugs/**` (new, Task 1), root `package.json`, `.gitignore`,
    `packages/engine-core/vite.config.ts` (SLOW_B entries), `apps/demo/{fu7.html,src/fu7.ts,scripts/fu7-shots.mjs,
    e2e/fu7.e2e.ts}` (Task 20).
  - Tests: the new files named in the tasks; edits to existing tests ONLY where a task names them (flips, titles,
    fixtures whose INPUT CONTRACT changed — never a band).
  - Gate: `docs/gates/fu-7.md`, `docs/gates/fu-7/**`, this plan (ticks).
  - **Never touch:** `l2/ecg/**` (every rhythm change goes through the existing `requestRhythm` / 7g hook paths),
    `l2/organs/**`, `l2/thermal/**`, `l2/hemo/pipeline.ts`, the renderer, the skins, the audio, `pnpm-lock.yaml`,
    `docs/physiology/**`, `packages/ventilator/src/**`, `research/**` (the audit is READ; Task 1 copies it).
- **Exceptions (declared here; each restated by the task that uses it; unused ones are reported as unused in the gate
  note). E-FU7-1 … E-FU7-9 APPROVED as tabled and E-FU7-10 ADDED (Orchestrator ruling (FU-7 review) 6, 2026-09-28;
  review "Exceptions"):**
  - **E-FU7-1** 7f `l2/neuro/{bus,depth,drive,pipeline,interactions}.ts`: read 7g's two potency outputs (addendum 20
    puts the ONE-output contract in 7g and the CONSUMPTION in 7f, so 7f must be edited), own the apnoea flag's single
    truth, and take magnesium/calcium from 7c's blood instead of the profile field. **Explicitly includes (review F3/F4,
    rulings 3–4):** FU-6's `hvrDep` line in `drive.ts` (its `dMid` factor removed, its propofol factor read from the ONE
    hypnotic equivalent — Task 6 Step 1b), and the retirement of 7f's own ventilatory opioid sum in `bus.ts` to a
    duck-typed FALLBACK (the drive reads 7g's `opioidVentFentEq` whenever the bus publishes it; `FENT_VENT_POT` becomes
    an alias of 7g's `FENT_VENT_REMI_EQ` — one source; Task 5 Step 1). `drive.ts` also loses its dead `SYNERGY` export
    (review F17).
  - **E-FU7-2** 7e `l2/endo/{core,adapters,hormones,effects,params}.ts`: `sympDrug` (7g's indirect drive) into
    `extraSymp`, the catecholamine reserve, the nociceptive surge state `h.surge`, its set-point factor and — R51
    addendum 25 — its CIRCULATING catecholamine release `out.surgeCat` (Task 10); dexamethasone's exogenous
    glucocorticoid into the cortisol METABOLIC term (Task 18 Step 1b, D12).
  - **E-FU7-3** 7a `l2/circ/{profile,model}.ts`: the profile's β-occupancy fields, the histamine SVR/venous terms and
    the surge factor multiplied into FU-4's `setF`.
  - **E-FU7-4** 7c `l2/blood/{pipeline,core}.ts`: the succinylcholine K⁺ surge reads 7f's nm profile (research/14 D6:
    two commands for one disease disagree).
  - **E-FU7-5** Stage 3 / 7b `l2/resp/pipeline.ts`, `l2/lung/conditions.ts`: a drug-driven bronchoconstriction input
    (histamine) into FU-6's smooth-muscle state.
  - **E-FU7-6** L3 `l3/defib-pacer/outcome.ts`, `l3/device-layer.ts`: the shock outcome's state context (addendum 23
    names shock success as FU-7's). FU-5 owns `l3/**` — coordinate as the table above says. DV amendment
    (research/20 §4): the same exception covers the re-sourced `VF_TABLE`, the cardioversion curve by rhythm and energy,
    and the three assertions of Stage 4's `test/l3/defib-pacer/outcome.test.ts` that follow the table (a re-sourcing
    with the ±2 % tolerance unchanged, not a widening).
  - **E-FU7-7** `packages/engine-core/src/engine.ts`: one-line additions, each named by its task — Task 7 (`spontRr`),
    Task 8 (`betaOcc`/`betaNonSel` in `pkCtx`), Task 10 (`endoCat` in `pkCtx`, addendum 25), Task 11 (the `pulseless`
    flag on the rhythm-hook call; `ps.rng.outcome` only if FU-4's 18f is absent), Task 12 (`shockState`), Task 14
    (`mgMmolL`/`iCaMmolL`, combined with Task 7's statement), Task 16 (`ext.histamine`, the resp ctx `histamine`),
    Task 18 (the `qtcMsAdd` argument of the `bloodEcgTargets(` call).
    (The earlier "four" undercounted; the review's executability pass listed them.)
  - **E-FU7-8** `src/truth.ts` + `apps/demo/src/physiology-console/meta.ts`: the console shows the new outputs.
  - **E-FU7-9** test fixtures whose INPUT CONTRACT changed: `test/helpers/neuro-bus.ts` (a 7g bus fixture must publish
    the potency outputs) and `test/l2/neuro/depth-drive.test.ts`'s `di()` helper. Bands untouched (proved in the
    prototype: after the fixture update all 272 tests of `test/l2/{neuro,pk,endo,circ}` pass).
  - **E-FU7-10** (review F14, ADDED by ruling 6) THREE existing assertions that pinned a constant this plan re-sizes or a
    field list it extends, each keeping its title and its physiological band:
    (a) `test/l2/neuro/interactions.test.ts` "1 MAC volatile: EC50 × 0.67; rocuronium duration +20–45 %" — the divisor
    assertion reads `1/(1 + VOL_NMB_K)` with the old value in a trailing "was × 0.67" clause, and the DURATION band
    (UNCHANGED) splits into its own `it.fails` carrying both measured numbers: +13.4 % in this neuro-only rig against the
    ENGINE cell DI-51's +52.2 % (band 25–80 %, PL) — the rigs differ, see Task 14 Step 4;
    (b) `test/l2/neuro/depth-drive.test.ts` "1 MAC volatile lowers non-depolariser EC50 by ~33 %…" — the same constant,
    same treatment (its bounds 0.62–0.72 become `VOL_NMB_K`-derived, "was 0.62–0.72 for the 0.5 divisor");
    (c) `test/l2/endo/adapters.test.ts` "MODELED: circ.ext.endo* written … at rest exactly neutral" — a `toEqual` over the
    EXACT `ext` key list, which Task 10 extends with `surgeF`; the expected object gains `surgeF: 1` (the neutral value
    the assertion is about: at rest the surge changes nothing).
    Restated in Task 14 Step 4 (a, b) and Task 10 Step 5b (c); listed in the gate note §9.
- **CI rules (amendments 1–4, restated):** `CI=1` for engine tests (6 h long-run horizon); horizons from
  `test/helpers/longrun.ts`, never hard-coded; **every engine test running more than one sim-minute yields once per
  sim-MINUTE** (`await new Promise((r) => setImmediate(r))`) — per minute, not per chunk; the three new slow files join
  the slow selection by the mechanism FU-4 landed (Task 19 Step 2); `tick-bench` (validation) stays p50 < 6 ms on CI
  (this plan's per-step additions in `combine` are a few sums per active agent plus ONE hoisted exponential — review F21
  — and one sum in `siteConc`; addendum 25 adds two pseudo-actives to `combine` only while a surge is present; the gate
  re-runs the bench); `audit:drugs all` takes ≈ 30 min on an idle machine and the gate records its wall time; heavy
  evidence e2e and screenshot scripts run **Chromium only** (system Chrome, `PW_SYSTEM_CHROME=1`), gate PNGs
  **≤ 60 KB each** (re-take at `deviceScaleFactor: 0.7` or quantise, and record it).
- **Commands:** pnpm is not on PATH — `npx -y pnpm@9.15.9 …`. Engine test:
  `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run <path>`; the CI split locally:
  `PME_TEST_SET=fast|slow-a|slow-b` inside `packages/engine-core`. The drug audit (after Task 1):
  `npx -y pnpm@9.15.9 run audit:drugs [cell-id…]` from the repo root. Playwright: `PW_SYSTEM_CHROME=1`.
- Strict TS (`noUncheckedIndexedAccess`, `erasableSyntaxOnly`), `.ts` import extensions, conventional commits. Every
  commit message ends with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and is followed by `git push`.
  The PR title is **"FU-7: drug-layer integration — onset, hypnotic/opioid potency, β-blockade, stimulus surge,
  antiarrhythmics, interactions"** and its body ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

---

## Decisions (made while prototyping; the executor does not revisit them)

**D1 — the onset curve becomes a two-compartment TRANSIT CHAIN, not a Bateman pair (addendum 19).** The audit proposed
the Bateman form `e^{−k_el t} − e^{−k_eo t}`, but that form has a NON-zero initial slope (`C′(0) = k_eo − k_el > 0`),
which is exactly the step onset addendum 19 forbids at the limit of a fast site. Two equal transit compartments into
the effect compartment give `C(t) ∝ e^{−k_e t} − e^{−k_a t}(1 + (k_a − k_e)t)`, with `C(0) = 0` **and `C′(0) = 0`**, the
same mono-exponential tail, and exactly two free parameters — so `k_a`/`k_e` are solved from the row's OWN `tpS` and
`t10S`, the numbers every row already carries with its source. No row's data changes (Task 2). The chain is used only
where the gamma exponent `n < 1` (an infinite initial slope); adenosine (`n` 7.5, `t10/tp` 2) keeps the gamma.
Mechanism, not a band: the peak time and duration are preserved to the digit (`t10` reproduced within 1 s for all 25
rows, table in Task 2).

**D2 — ONE hypnotic-potency output in propofol-equivalent units, ONE opioid-potency output in fentanyl-equivalent units
(addendum 20).** 7g already sums `uHyp = Σ c/hypC50`; the potency output is that sum expressed as the propofol Ce that
would have the same hypnotic effect at this age (`hypPropEq = uHyp · 3.08 µg/mL · e^{−0.00635(age−35)}`, Eleveld's age
term). Reasons for propofol-equivalents rather than a dimensionless `uHyp`: 7f's depth already calibrates BOTH the index
(`ce50Propofol`) and consciousness (`locPropofol`) in propofol ng/mL with different C50s, so one equivalent drives both
scales without inventing a second unit; and the console/glossary show a clinically readable number (research/11 §5).
The opioid twin is a TRUE fentanyl-equivalent at each site (corrected by the second fixer, see D16):
`opioidCeFentEq = 1.25 · Σ c·macRemiEq` (tables §5d: remifentanil 1.2 ≈ fentanyl 1.5 ng/mL for MAC reduction — the ratio
7f's `opioidFentEq()` already uses; fentanyl's MAC potency is `macRemiEq` 0.8, NOT its EEG weight 1.6) and
`opioidVentFentEq = Σ c_vent·ventRemiEq / 0.55` from 7g's separate ventilatory sites (R51 §2), because ventilatory, MAC
and EEG potencies differ (fentanyl 0.55× / 0.8× / 1.6× remifentanil — D-7f-3, tables §5d). The EEG-weighted
`opioidCeRemiEq` stays what it was (7d's `uOpioid`, 7f's index term). 7f keeps its per-agent `ce` fields for the
display and the fallback.

**D3 — the dissociative flag is an EEG WEIGHT, not a separate agent path (addendum 20).** Ketamine joins the hypnotic
equivalent (so it causes unconsciousness), and `CnsSpec.dissociative` marks its share. On the INDEX that share counts
×`KET_EEG_W` = 0.1 [ENG] and still adds the `KET_DI_RISE` paradox: ketamine 1.5 mg/kg gives DI 98 while `conscious`
is false — the processed-EEG monitor reads 60–90 at anaesthetic ketamine doses (Hirota & Lambert 2001; Miller ch. 21).
Airway reflexes are kept because the drive reads the equivalent with `CnsSpec.ventShare` 0.3 for ketamine (minimal
respiratory depression, tables §6.3) and 7f's upper-airway obstruction term is driven by the INDEX, which ketamine
barely lowers. Prototype: `depth-drive` "ketamine raises the index; conscious false" passes unchanged.

**D4 — the ventilatory interaction is a C50 CROSS-SHIFT on a response surface, not a product term, with a PER-CLASS α
(addendum 20; review F2, Orchestrator ruling (FU-7 review) 2).** `syn = 1 − 0.5·dOp·dHyp` (`drive.ts`) is too weak for
Bailey 1990. Each class's ventilatory C50 is divided by `1 + α·u_other`, so a single agent keeps its published
calibration exactly (Nieuwenhuijs 2003: remifentanil 1 ng/mL −28 %, propofol 1 µg/mL −13 %). α is NOT the CNS surface's
`SURFACE_ALPHA` (pd.ts: an [ENG] constant of the hypnotic–opioid **EEG** surface, "within Bouillon 2004" — never sourced
for ventilation). It is per class, in `drive.ts`: **`VENT_ALPHA_BENZO` 1.5** [ENG; fit target Bailey 1990, the
opioid–benzodiazepine ventilatory synergy: SpO₂ < 90 % in 11/12, apnoea in 6/12] and **`VENT_ALPHA_HYP` 0.3** [ENG, low;
Nieuwenhuijs 2003 found the propofol–remifentanil VENTILATORY interaction additive while the BIS interaction was
synergistic] for propofol, thiopental, etomidate, ketamine and the volatiles, weighted by the benzodiazepine share of the
ventilatory equivalent (`cns.benzoShare`, one line in 7g's `combine` loop). Pre-fix prototype with α 1.5 for every class
(DI-03, room air): SpO₂ nadir **93 → 77 %**, VE −70.6 % against −43.5/−13.3 % for the singles; DI-01d propofol +
remifentanil apnoea **260 → 500 s** (the top of 60–600 — the supra-additive TIVA the review flagged). Re-measured with
the per-class α: "Prototype — second fixer".

**D5 — chronic β-blockade gets its OWN occupancy field (addendum 21).** `engine.ts` passed `prof.betaBlockC` (0.5 for
`betaBlocked`) as the receptor occupancy, i.e. a dose ratio of 2, which a 100 µg adrenaline bolus overrides; but that
0.5 is the tables' "baroreflex contractility gain ×0.5". The profile now carries `betaOcc` (0.85 → dose ratio ≈ 6.7,
chronic metoprolol/bisoprolol [ENG]) and `betaNonSel` (propranolol-like). β2 effects are tagged `beta2` on the row
(adrenaline's vasodilator arm, salbutamol) and are occupied only by non-selective blockade — which is how the
unopposed-α picture becomes emergent rather than scripted. The reflex gains keep `betaBlock`/`betaBlockC`.

**D6 — indirect sympathomimetics act through 7e's central drive, not on 7a directly (addenda 20–21; audit D9/D4).**
Ephedrine and ketamine publish `bus.cns.sympDrive`, which 7e adds to `extraSymp`, so their pressor arm passes through
the stress path where (a) `prof.betaBlock/betaBlockC` already removes the β1 share, (b) FU-4's `alpha()`/`vasoResp`
scaling applies, and (c) the new `catReserve` weakens it when catecholamines are depleted. Ketamine keeps its DIRECT
`ees −0.2` (unmasked myocardial depression). Prototype: ketamine MAP rise healthy **+1.5 → +8.7 %** (band 5–25, now PL),
cold sepsis **+1.8 % → −0.5 %** (sign correct: the direct depression is unmasked); ephedrine MAP rise **7.8 → 13.4**
(band 8–25, now PL) and the repeat ratio **0.37 → 0.54** (band 0.4–0.95, now PL). The β-blocked ephedrine RATIO stays
0.99 against 0.3–0.7: with α intact and the reflex buffering the β1 loss, the engine cannot halve the response by a
mechanism — it stays `it.fails` with the number and goes to Ali as Q1 (see "Open questions").

**D7 — the apnoea flag has ONE truth: the chemoreflex's own zero rate (addendum 20).** `drive.ts` computes `apnoea`
from drug depression alone, so DI-89 shows the flag set for 255 s (380 s on the prototype) while spontaneous VE is
8.4 L/min. After FU-6 the MODELED chemoreflex already returns `rr = 0` at its relative threshold
(`APNOEA_VE_IN/OUT` × `ve0`), so FU-7 makes `NeuroResp.apnoea` and the `apnoea` neuro mark READ that state in MODELED
and keep the drug-derived value only in MANUAL (where there is no chemoreflex). Task 7.

**D8 — the surge is 7e's, the blunting is 7g's, and the set point is FU-4's path (addendum 22; R51 addendum 25).** R51
addendum 12 keeps ONE `stimulus` event, 7e's. The sympathetic surge is therefore 7e's stress output — FU-7 does not add a
second stimulus owner. **Addendum 25 (2026-09-28) fixes the mechanism: the surge is CIRCULATING CATECHOLAMINE release
acting directly on vessels and heart PLUS the set-point reset — not the reset alone**, which FU-4's output cap rightly
limits (the first fixer measured +12.8 mmHg after propofol with the reset alone). So FU-7 adds (0) the RELEASE: 7e's
nociceptive state `h.surge` publishes a noradrenaline/adrenaline bolus-equivalent (`out.surgeCat`, 7g rate-equivalent
units), which 7g adds to its OWN adrenergic rows' Loewe sums as two pseudo-actives (circulatory targets only) — so it
acts on SVR, contractility and HR outside the baroreflex's output cap, and β-occupancy (labetalol, esmolol, the
profile) shifts its β EC50s exactly as it shifts an injected catecholamine's; plus (a) the CENTRAL RESET: 7e publishes
`surgeF` (a set-point factor > 1) that 7a multiplies into
FU-4's `setF`, so the baroreflex defends the higher pressure instead of cancelling it within the surge's 2–5 min —
**driven by a SEPARATE NOCICEPTIVE state `h.surge` = noxious·(1 − antinoc) (same τ as `symp`), never by total `h.symp`,
which carries sepsis, anaphylaxis, MH, hypoglycaemia and FU-7's own `sympDrive` (Orchestrator ruling (FU-7 review) 1,
2026-09-28; measured: the `h.symp` variant raised untreated MH's defended set point by 22.9 mmHg and turned DI-57
from PL to TS)** — and
(b) the blunting, each at its own point (addendum 25): opioids blunt the RELEASE (7f's `antinoc` lowers the noxious
input that drives `h.surge`), IV lidocaine blunts the AFFERENT (a new `antinocAdd` airway-reflex term into the same
`antinoc`), β-blockers act at the RECEPTOR (7g's drug and profile occupancy on the adrenergic rows' β entries — no 7e
adapter change). Ownership sentence for the gate note: **"the stimulus event and its nociceptive drive are 7e's (R51
addendum 12); the sympathetic SURGE — its circulating catecholamine release and its set-point reset — is the
consequence 7e publishes, 7g's adrenergic rows act out and 7a defends; every blunting drug is 7g's PD."**

**D9 — conversion and shock success are hazards per second, drawn from the existing `outcome` stream (addendum 23).**
`hooks.ts` gets a per-drug conversion hazard (`P(convert in dt) = 1 − e^{−λ dt}`) with λ from the drug's occupancy and
the rhythm, so a 300 mg amiodarone bolus during VF does not "instantly" convert but raises the shock's success; the
shock outcome multiplies `VF_TABLE.rosc` by state factors (amiodarone/lidocaine occupancy, K⁺, pH, CPP, arrest
duration) and renormalises. All draws use `uniform(ctx.rng.outcome)` — one uniform per event, so replay stays exact
(Stage 4b's rule).

**D10 — LAST is a fractional-threshold SUM (addendum 24; audit D14).** `Math.max` over agents becomes
`Σ cᵢ/thᵢ` fed into one Hill per endpoint (CNS, seizure, CV), which is ASRA 2020's additivity and keeps every
single-agent threshold exactly (a sole agent at its threshold still gives the same effect).

**D11 — one state per mechanism (addendum 24).** Magnesium: 7f's `ec50Multipliers` reads 7c's `blood.out.mg` (the
profile `mgMmolL` becomes the blood BASELINE, one state), so the drug and the profile agree; calcium antagonism enters
as an EC50 multiplier from `blood.out.iCa`. Burn/denervation: 7c's succinylcholine K⁺ surge reads 7f's nm profile
(`burn`, `denervation`) as well as `blood.burns`, so one disease has one K⁺ answer. Histamine: `bus.airway.histamine`
gains consumers (7a SVR + venous capacitance, the lung's smooth-muscle severity) instead of a second mediator state.

**D12 — the inert rows (addendum 24).** Dexamethasone ACTS as a GLUCOCORTICOID on 7e's cortisol metabolic term (a new
`glucocorticoid` PD target → `bus.metabolic.glucocorticoidNmolL` → the `co` Hill of `stressEffects`: +1–2 mmol/L over
1–2 h, Hans 2006; measured +17.7 mg/dL at 1 h). **Third-fixer correction:** the first draft routed it through
`bus.metabolic.glucoseDelta`, which 7e does not read (it observes insulin/dextrose doses), so it would have done nothing.
Ondansetron ACTS on the QTc only (a new `qtc` PD target into 7c's existing QTc delta path, +14 ms measured; no
arrhythmia hazard in v1). Tranexamic acid KEEPS its row and gains a documented hook comment naming 7i's coagulation
(`// 7i: fibrinolysis target — TXA becomes active with R58's coagulation model`), with a quiet test asserting it stays
inert until then: R58 explicitly gives coagulation to 7i, so removing the row would lose the dose log 7i needs.

**D13 — new library rows: glucagon and verapamil only (Ali's Q9).** Glucagon is required by addendum 21 (β-blocked
anaphylaxis / β-blocker overdose rescue: it raises cAMP past the blocked receptor, so it is the ONE drug that restores
inotropy at full β-occupancy) and verapamil by DI-15 (the pre-excited-AF teaching hazard). Nitroprusside is added
because addendum 24 names it in the vasodilator re-fit. Hydrocortisone, heparin and protamine are NOT added: hydro-
cortisone needs 7e's cortisol replacement semantics and heparin/protamine need 7i's coagulation (R58) — both recorded
as requests. Iranian-practice priorities stay Ali's question. (ET amendment: hydrocortisone also waits for a BASAL
adrenal deficit to replace. research/14-coverage E13 measured the `adrenalInsufficiency` profile as nearly inert, and
ET-15b is NE. The row lands with FU-10 — Requests → FU-10 item 1.)

**D14 — no new per-tick state.** The chain adds a cached solve per (tp, t10) pair (a `Map`, 25 entries), the potency
outputs are two sums inside the existing `combine` loop, and the conversion hazards are evaluated on the existing 1 Hz
rhythm-hook path. Prototype: `test/l2/pk` 79 tests unchanged in runtime (884 ms), `tick-bench` re-run at the gate.

**Decisions recorded from the R50 review (Orchestrator ruling (FU-7 review) 1–6, 2026-09-28, and R51 addendum 25; the
executor does not revisit them).** Ruling 1 is D8's `h.surge` (applied by the first fixer).

**D15 — ruling 2: the ventilatory α is per class** (D4 as rewritten): `VENT_ALPHA_BENZO` 1.5 (Bailey) and
`VENT_ALPHA_HYP` 0.3 (Nieuwenhuijs 2003, additive), weighted by `cns.benzoShare`. `SURFACE_ALPHA` stays the EEG
surface's and is no longer imported by `drive.ts`. Task 6.

**D16 — ruling 4 (Q-FU7-2 DECIDED): ONE ventilatory opioid potency, `CnsSpec.ventRemiEq`, remifentanil pinned at 1.0.**
Rows: remifentanil 1.0 (Bouillon 2003, the drive's own `REMI_VENT_C50` 0.92 — so FU-6's single-agent calibration cannot
move), fentanyl `FENT_VENT_REMI_EQ` 0.55 (D-7f-3, the value FU-6 uses — 7f's `FENT_VENT_POT` becomes its alias),
sufentanil 5 [ENG, ≈ 9 × fentanyl's ventilatory weight — the analgesic ratio of M10 ch. 22], morphine 0.8 per 0.1 mg/kg
reference dose [ENG; the row is in reference-dose units, so the review's ng/mL ratio 0.15 does not transfer: fit target
"0.1 mg/kg morphine depresses breathing like its equianalgesic ≈ 1–1.5 µg/kg fentanyl", i.e. ≈ 0.55 × 1.5 ng/mL]. There
is no alfentanil row. 7f's drive reads `opioidVentFentEq` (as remifentanil-equivalents, `× FENT_VENT_POT`) instead of
its own sum, which survives only as the duck-typed fallback. What moves: sufentanil's and morphine's ventilatory weight
(7f used their EEG weights 12 / 1.5 through `otherRemiEq`, at the BRAIN site); no band exists for either (review F4),
so nothing of FU-6's is re-fitted. **Second-fixer correction (found while applying F4):** the brain output as first
written, `1.25 × opioidCeRemiEq`, carried fentanyl's EEG weight 1.6 into 7f's MAC-reduction/antinociception scale, where
7f's own `opioidFentEq()` counts fentanyl at 1.0 — it DOUBLED fentanyl's MAC reduction and blunting (the first fixer's
"fentanyl 3 µg/kg blunts laryngoscopy to 0.06" carried this). `CnsSpec.macRemiEq` (fentanyl 0.8 = 1.2/1.5, tables §5d;
every other row defaults to its `remiEq`, which reproduces 7f's pre-FU-7 sum exactly) makes the brain output equal
7f's `opioidFentEq()` for every opioid. The naloxone division is done ONCE, in 7g (the first fixer found Task 5's reader
dividing 7g's already-antagonised output again, and `ventRemiEq` summing the raw `a.vent`).

**D17 — ruling 3: Task 6 edits FU-6's `hvrDep` in the same pass.** Its `dMid` factor is removed (the benzodiazepine
share is inside the equivalent) and its propofol factor reads the ONE ventilatory equivalent, `hill(hypC/HVR_PROP_C50, 1.5)`,
so thiopental and etomidate depress the hypoxic arm too. `HVR_PROP_C50 = 3 × PROP_VENT_C50` (FU-6 F3b: an ANAESTHETIC C50
≈ 3.5 µg/mL; the review's "PROP_VENT_C50/3" wording is stale) is unchanged, so propofol's own `hvrDep` is unchanged by
construction; FU-6's NMB arm is kept and FU-7 adds none.

**D18 — ruling 5: Task 11 is written on FU-4's 18f signature with a numbered fallback, and conversion needs a
PERFUSING rhythm.** The hook's `current` gains `pulseless?: boolean` (the engine passes `circ.arrest !== null`);
pulseless VT/VF is Task 12's shock path (`λ_amio_vf = 0` stands). New `RhythmHookState` fields are tolerated absent in a
restored snapshot (`hs.conv ??= …`).

**D19 — ruling 6, pharmacology corrections.** (a) **Age:** Task 3's equivalent keeps each row's own `hypC50AgeK`. The
review's premise ("every non-propofol hypnotic is age-blind") holds for the processed-EEG INDEX only: consciousness is
judged against 7f's Schnider LOC scale (`locPropofol`, −46 % from 35 to 80 y), so a row without an age term already needs
0.71 × the dose at 80 y. The sources put the age effect in different places per drug: thiopental and etomidate's lower
elderly dose is PHARMACOKINETIC (smaller initial distribution volume, unchanged brain sensitivity — Homer & Stanski 1985;
Arden 1986), so their `hypC50AgeK` stays 0 and the LOC dose at 80 y is ≈ 0.71 × (target −30 %, M10 ch. 21); midazolam's
is PHARMACODYNAMIC (increased brain sensitivity with age; M10 ch. 21 advises 20–50 % less in the elderly), so it gets
`hypC50AgeK` 0.008 [ENG; fit target LOC dose at 80 y ≈ 0.5 × the 35-y dose] — which also lowers its index dose. Ketamine
stays 0 (no age-sensitivity source). The review's 0.011/0.008 were fitted without the LOC scale and would halve the
thiopental dose. (b) **Onset data:** atropine `tpS` 60 → 150 s (IV peak chronotropic effect 2–4 min, label; the 60 s
was an ONSET time), midazolam `tpS` 180 → 240 s (M10 ch. 21 p. 532: peak effect 3–5 min, t½ke0 2–3 min) — each a
better-sourced datum (R45 permits it; no band moves). (c) **Ketamine** keeps `tpS` 60 s and gets its emergence by
REDISTRIBUTION — see D20. (d) **`uHyp` is antagonist-corrected**
(review F8) so flumazenil moves 7d's surface with the depth index. (e) **Etomidate `ventShare` 0.7** (review F9).
(f) **Atracurium/mivacurium** produce NO block in v1 (review F12) — stated plainly, guarded by a test. (g) **PROCAMIO:**
the amiodarone termination figure is quoted from the paper by the executor before the constant is fixed (review Q10:
the reviewer recalls 38 %, the plan wrote 25 %) — Task 11 Step 3a. (h) **E-FU7-10** declared (review F14).

**D20 — ketamine's emergence is REDISTRIBUTION with its own time course (the first fixer's finding; the orchestrator's
second option pinned as a measurement).** With `tpS` 60 s and `t10S` 900 s one `hypC50` cannot give both LOC in 30–60 s
and emergence in 10–20 min (the first fixer: any `hypC50` that crosses the LOC threshold at ≥ 30 s wakes the patient
early, any that keeps him asleep 10 min crosses it at ≈ 20 s). The mechanism the textbook gives for ketamine's short
anaesthetic is redistribution from a high-flow brain (M10 ch. 21 Table 21.1: distribution half-life 11–16 min;
emergence 10–20 min after 1–2 mg/kg): a fast rise and a SLOW, redistribution-shaped decline. The transit chain has ONE
decay rate, so the correction is the chain's own fit datum: ketamine's `t10S` becomes the redistribution-governed
**2700 s** [10 % of the effect-site peak ≈ 3.3 distribution half-lives (13.5 min) after the 60 s peak; was 900 s, the
row's 10–15 min DURATION read as a 10 % time]. `tpS` stays 60 s (the sourced 1-min peak) and `hypC50` stays 0.8 (peak
≈ 1.9 × the LOC threshold at 40 y). A closed-form scan of the chain (second fixer) shows why BOTH bands cannot be met with
a 60 s peak: LOC at ≥ 30 s needs a threshold ≥ 0.81 of the peak, and a tail that stays above 0.81 of the peak for 10 min
needs `t10S` > 3600 s; every `(t10S, hypC50)` pair with emergence in 10–20 min crosses the LOC threshold at 16–21 s. A
later peak (tpS ≈ 120 s) would meet both, but no source gives ketamine's effect-site peak that late, so it is NOT used.
**The LOC case is therefore pinned as `it.fails` with its number** (the orchestrator's second option) and emergence is
asserted as `it` (numbers in "Prototype — second fixer"). No third parameter is added.

**D21 — R51 addendum 25 (the surge's circulating catecholamines).** D8 as rewritten, Task 10 Step 1b. Fentanyl's
blunting is re-fitted on this model to 0.2–0.7; after D16's correction fentanyl's antinociception is no longer doubled,
which is most of the re-fit.

**D22 — addendum 25 as measured (third fixer, main + FU-4 e3eeb56; "Prototype — second fixer").** ONE fitted size,
`SURGE_NE_GAIN` 0.6, puts the propofol arm at ΔMAP **+27.2** / ΔHR **+17** (20–30 / 12–30, Shribman 1987) and the
fentanyl ratio at **0.23** (0.2–0.7); lidocaine 0.86 ✓. The release is blunted by the OPIOID + lidocaine share of
`antinoc` only (Step 1c — Desborough 2000: a hypnotic does not abolish the humoral stress response), so the surge state
saturates `SURGE_SET_MAX` in both the propofol and the awake arm. The awake arm reads **+36.9**; its band is the task's
own M10 figure (+20–40 mmHg) — the first fixer's 20–30 for that arm had no separate source (the orchestrator may
restore 20–30, and the case becomes `it.fails` "measured +36.9"). Labetalol 10 mg (0.94) and esmolol's MAP (0.99) stay
`it.fails`: the circulating noradrenaline acts through α, and β-occupancy blunts the HR share only (esmolol HR 0.53).
The six guard arms (ruling 1, plus hypoglycaemia) keep `surgeF` 1 and `surgeCat` 0 exactly.

**D23 — FU-6 seam item 5 is FU-7's: the volatile bronchodilation re-fit (Task 17 Step 2).** The three potent volatiles
carry `bronchodilation` Emax 1 at EC50 0.5 MAC, which FU-6's `relaxed()` turns into a near-complete bronchodilator at
0.8 MAC. FU-7 re-fits the EC50 ONLY (one number for the three rows, Emax and Hill unchanged) against "airway resistance
−20–40 % at 1 MAC" (FU-6's item 5), with FU-6's own acceptance case "Ppeak −30 % at 0.79 MAC" as a co-constraint that
FU-7 may not break. UNPROTOTYPED (FU-6's consumer is not on any tree FU-7 can prototype on); if no EC50 meets both, the
rows stay as they are and the item is Ali's (Q12).

---

## Prototype results (before → after)

The prototype tree is `origin/main` **dba7fda** plus Tasks 2–6, 8 and 9 (the diff is
`scratch/plans-backup/fu-7-prototype.patch`, 14 files). Typecheck clean; `test/l2/{neuro,pk,endo,circ}` **55 files /
272 passed, 1 skipped** after the E-FU7-9 fixture updates (before them, 3 tests failed — see Task 5 Step 4). The audit
harness was re-run on the prototype from `research/14-audit-scripts` with `PME_ENGINE` pointed at it (seed 7, the same
rigs; 20 cells re-measured, `out/fu7.json`). **"Before" is research/14's own column on main 3ff2fb0.**

### Addendum 19 — zero-slope onset (Task 2)

`t10/tp` ≥ 8 rows only. **Column semantics (review F19):** "t50 %" is the time the CONCENTRATION shape reaches half its
peak (reproducible from the closed form); `E(5 s)`/`E(30 s)` are the PD EFFECT fractions measured in the engine after the
row's own Hill and the arm–brain transit, so they are lower than the concentration fraction at the same time (e.g.
ketamine's concentration fraction at 5 s is 0.08, its effect 0.02). The first-writer rows below are for the pre-fix
`tpS`/`t10S`; the second fixer's three data corrections (atropine `tpS` 150, midazolam `tpS` 240, ketamine `t10S`
2700 — ruling 6 / D19–D20) are re-measured in "Prototype — second fixer".

| row | tp / t10 (s) | before: E(5 s) · E(30 s) · t50 % | after (chain): E(5 s) · E(30 s) · t50 % | t10 reproduced |
|---|---|---|---|---|
| ketamine | 60 / 900 | 0.73 · 0.96 · **0.8 s** | 0.02 · 0.71 · **17.2 s** | 901 s |
| thiopental | 45 / 900 | 0.83 · 0.99 · 0.2 s | 0.04 · 0.85 · 12.3 s | 900 s |
| etomidate | 60 / 480 | 0.48 · 0.91 · 5.6 s | 0.02 · 0.66 · 19.4 s | 481 s |
| midazolam | 180 / 3600 | 0.69 · 0.87 · 0.6 s | 0.01 · 0.21 · 49.0 s | 3600 s |
| atropine | 60 / 5400 | 0.96 · 0.99 · 0.1 s | 0.06 · 0.83 · 12.7 s | 5400 s |
| glycopyrrolate | 180 / 10800 | 0.90 · 0.96 · 0.1 s | 0.02 · 0.30 · 40.6 s | 10800 s |
| naloxone | 120 / 3600 | 0.82 · 0.94 · 0.1 s | 0.02 · 0.49 · 30.4 s | 3600 s |
| flumazenil | 60 / 3600 | 0.94 · 0.99 · 0.1 s | 0.06 · 0.87 · 13.6 s | 3600 s |
| ephedrine | 270 / 3600 | 0.49 · 0.73 · 5.4 s | 0.01 · 0.13 · 79.1 s | 3601 s |
| amiodarone, salbutamol | 600 / 7200 | 0.36 · 0.58 · 17.6 s | 0.00 · 0.05 · 179 s | 7201 s |
| adenosine (unchanged) | 15 / 30 | n 7.5, already zero-slope | gamma kept | — |

Engine cells (first writer, before the data corrections): **atropine peak 30 → 70 s** (band 10–180), **glycopyrrolate
peak 80 → 140 s** (label 2–3 min ✓), **naloxone reversal 5 → 40 s** (band 30–180: TS → **PL**), **flumazenil DI rise now
+12 points** (was 0 — the antagonist also divides the hypnotic equivalent, Task 3 Step 3), **midazolam DI nadir 70 →
115 s** (band 120–420: 5 s short — the "1.3 s" once written here was stale), **ketamine LOC 5 → 20 s**. After the
second fixer's data corrections: see "Prototype — second fixer" (the midazolam `it.fails` is gone there).

### Addendum 20 — ONE hypnotic and ONE opioid potency output (Tasks 3–6)

| cell | item | band [source] | before | after |
|---|---|---|---|---|
| DI-69 | thiopental 4 mg/kg: unconsciousness | any | **never** | **LOC at +10 s, apnoea at +14 s** |
| DI-69 | thiopental awakening | 240–900 s [M10 Table 21.1] | — (never asleep) | **360 s** ✓ |
| DI-69 | etomidate 0.3 mg/kg: unconsciousness | any | **never** | **LOC at +20 s, apnoea at +21 s** |
| DI-69 | etomidate duration | 150–600 s [M10 p. 541] | — | **195 s** ✓ |
| DI-69 | ketamine LOC | ≥ 30 s (audit §4) | 5 s | 20 s (still early: Task 5 note) |
| DI-69 | propofol LOC / emergence | 20–120 s | 60 / 440 s | 60 / 440 s (unchanged) |
| DI-03 | Bailey pair SpO₂ nadir, room air | 70–89 % [Bailey 1990] | **93 %** | **77 %** ✓ |
| DI-03 | Bailey pair VE vs singles | supra-additive | −48 vs −43.5/−17.1 % | **−70.6 vs −43.5/−13.3 %** ✓ |
| DI-01d | propofol + remifentanil apnoea | 60–600 s | 260 s | 500 s ✓ |
| DI-02 | co-induction DI reduction | ≤ −2 [Short & Chui 1991] | −10 | −8 ✓ |
| DI-77 | opioid MAC reduction | 0.4–0.7 [Lang 1996] | 0.61 | 0.61 (unchanged) ✓ |
| DI-72 | flumazenil DI rise | ≥ +2 [label] | **0** | **+12** ✓ |
| `depth-drive` | ketamine 1500 ng/mL: index > 93 and unconscious | as titled | index > 93, **conscious** | **index 98, unconscious** ✓ (D3) |

### Addendum 21 — β-blockade as occupancy, indirect sympathomimetics (Tasks 8–9)

| cell | item | band [source] | before | after |
|---|---|---|---|---|
| DI-04a | ephedrine 10 mg MAP rise, healthy | 8–25 [T6.2] | 7.8 (TW) | **13.4** ✓ |
| DI-04a | β-blocked / healthy ratio | 0.3–0.7 [T1.5, §7 17b] | 1.12 | **0.99** — stays `it.fails`, Q1 |
| DI-04a | β-blocked HR rise | 0–8 [§7 17b] | 3 | **1** ✓ |
| DI-05 | adrenaline 100 µg: excess pressor under blockade | > +2 % | 3.2 | **2.0** β1-selective; **3.6** with the `betaNonSel` probe |
| DI-05 | reflex bradycardia under non-selective blockade | < 0 [M10 ch. 14] | 0 | **0** in BOTH arms — NOT reached, stays `it.fails`; Task 8 Step 6 investigates the vagal limb |
| DI-41 | adrenaline resistance in β-blocked anaphylaxis | 0.2–0.8 [AAGBI] | 0.94 | **0.93** β1-selective; **0.95** with the probe — NOT reached by occupancy alone; Task 9 Step 6 (glucagon) and Q1 |
| DI-83 | dobutamine ratio under β-blockade | 0.2–0.8 | 0.56 | **0.33** ✓ |
| DI-21 | ketamine MAP rise, catecholamine-replete | 5–25 % [T6.3] | 1.5 (TW) | **8.7 %** ✓ |
| DI-21 | ketamine in the cold (depleted) phase | sign −1 [M10 ch. 21] | **+1.8 % (WR)** | **−0.5 %** (sign ✓; `catReserve` deepens it, Task 9 Step 4) |
| DI-80 | ketamine in class III haemorrhage | −15…+5 % | +2.3 | **−0.1 %** ✓, no arrest |
| DI-57 | ephedrine ×3 repeat ratio | 0.4–0.95 [T6.2] | **0.37 (TS)** | **0.54** ✓ |
| DI-57 | first ephedrine rise | ≥ 5 | 6.4 | 7.9 ✓ |
| DI-60 | dexmedetomidine early pressor | > 0 [T6.3] | −1.8 (MI) | 0.0 (declared missing; Task 17 Step 3 adds the α2B arm) |

**Measured probe (both arms, `prof.betaNonSel` forced true in the prototype, then reverted).** Non-selective occupancy
raises the adrenaline pressor excess 2.0 → 3.6 % (the β2 dilator arm is occupied, so α is unopposed — the MECHANISM
works) but produces **no** reflex bradycardia (`hrMinBB` 0 in both arms) and does not improve the anaphylaxis resistance
ratio (0.93 → 0.95). Reading: the unopposed-α pressure rise is there, but the engine's chronotropic answer to it is
missing because `prof.betaBlock` 0.8 has already flattened the sympathetic HR arm while the VAGAL limb's withdrawal /
activation caps (`SYMP_WITHDRAW_HR` 0.1, `VAGAL_WITHDRAW_MS` 200 in `l2/circ/baroreflex.ts`, 7a/FU-4's file) bound the
response. Task 8 Step 6 measures the vagal limb directly and, if the band needs a baroreflex change, **reports instead
of editing `baroreflex.ts`** (FU-4 owns it) — the test stays `it.fails` with the number and the item goes to Ali as Q1.

### What the prototype did NOT move (and why)

- **DI-89 flag while breathing: 255 → 380 s.** Worse, as expected: the drive is deeper while the MODELED chemoreflex
  still breathes. Task 7 is the fix and it needs FU-6's relative apnoea threshold on the tree.
- **DI-71 fentanyl 5 µg/kg: no apnoea (VE never < 1 L/min), SpO₂ 91.** Same root; Task 7.
- **DI-01c haemodynamic synergy −0.4 %**: FU-4's `symp`/`setF` rows for opioids and benzodiazepines (audit D1's
  follow-on) — a REQUEST to FU-4, not FU-7 work (see "Requests").
- **DI-42 morphine histamine −3.3 %**: Task 16 (not prototyped).

### Prototype — Task 10 (the fixer's REQUIRED prototype, Orchestrator ruling (FU-7 review) 1, 2026-09-28)

Tree: `origin/main` 2360894 + the diff of `origin/fu-4-integration-polish` **b675248** (FU-4 Tasks 0–17 + F1/F3/F5 as
pushed; 18f not yet) + this plan's Tasks 1–9 and Task 10 Steps 1–4 applied as blocks; typecheck clean. Audit cells
from Task 1's harness (seed 7), the laryngoscopy cases from a scratch script on the same rigs. Three arms of the same
tree: **A** = Task 10 as written (`h.surge`), **B** = `ext.surgeF` forced to 1 (= "without Task 10"), **C** = the
variant the review rejected (`surgeF` from `h.symp`).

**Guard cases (Step 5 case 7) — the ruling's point, measured:**

| arm (20 min, no stimulus) | `h.symp` max | A: `surgeF − 1` max, \|Δset\| | C (rejected `h.symp` variant): `surgeF` max, Δset, ΔMAP |
|---|---|---|---|
| septic shock (warm) | 0.5 | 0, 0.0 mmHg | 1.06, +5.7, +4.7 |
| anaphylaxis grade III | 0.5 | 0, 0.0 | 1.06, +5.5, (arrest in both arms) |
| untreated MH | 2.0 | 0, 0.0 | **1.24, +22.9, +7.3** |
| ephedrine 10 mg | 0.78 | 0, 0.0 | 1.093, +8.9, +3.7 |
| ketamine 1.5 mg/kg | 1.03 | 0, 0.0 | 1.124, +11.8, +4.9 |

**Task 9's cells with and without Task 10 (the numbers Tasks 9, 17 and 19 cite; A = B to the digit, because
neither drug reaches `h.surge`):**

| cell | item | A (Task 10) | B (no Task 10) | C (rejected variant) | band |
|---|---|---|---|---|---|
| DI-04a | ephedrine 10 mg MAP rise, healthy | **13.8** | 13.8 | 16.4 | 8–25 ✓ |
| DI-04a | β-blocked / healthy ratio | **0.96** | 0.96 | 0.98 | 0.3–0.7 (`it.fails`, Q1) |
| DI-04a | HR rise β-blocked / healthy | 0 / 4 | 0 / 4 | 1 / 6 | 0–8 ✓ |
| DI-57 | ephedrine ×3: rise 1 / 2 / 3 | 8.2 / 4.2 / 2.0 | same | 12.7 / 3.9 / 1.9 | — |
| DI-57 | repeat ratio (2/1) | **0.51** ✓ PL | 0.51 | **0.31 — TS** (the self-amplification) | 0.4–0.95 |
| DI-21 | ketamine healthy MAP rise | +9.1 % | +9.1 % | +12.6 % | 5–25 % ✓ |
| DI-21 | ketamine, cold septic phase (nadir %) | −0.3 % (sign ✓) | −0.3 % | −0.3 % (rise +7.9) | sign −1 |
| DI-80 | ketamine in class III | −0.1 % ✓, no arrest | same | −0.1 % (rise +15.5) | −15…+5 ✓ |
| DI-05 | adrenaline excess under blockade | 2 % | 2 % | 2 % | > 2 % (β1-selective) |
| DI-41 | β-blocked anaphylaxis resistance ratio | 0.94 | 0.94 | 0.97 | 0.2–0.8 (all four arms arrest on FU-4's tree) |
| DI-08 | laryngoscopy pressor after propofol / labetalol ratio | 12.2 / 0.94 (gain 0.12) | 11.5 / 0.95 | 12.2 / 0.94 | 15–45 / 0.2–0.8 |

The pre-FU-4 prototype numbers quoted in Tasks 8–9 (ephedrine 13.4, ratio 0.99, DI-57 0.54, ketamine +8.7 %, cold
phase −0.5 %) move by ≤ 0.4 mmHg / 0.03 / 0.6 % on FU-4's tree; the executor records the merged-tree numbers.

**The laryngoscopy cases (Step 5 cases 1–5; propofol 2 mg/kg at 240 s, stimulus 1.5 at 300–360 s; ratios to case 1):**

| `SURGE_SET_PER_NOX` | ΔMAP peak | ΔHR peak | at 90 s | set point | fentanyl 3 µg/kg | labetalol 10 mg | esmolol 1 mg/kg (MAP / HR) | lidocaine 1.5 mg/kg |
|---|---|---|---|---|---|---|---|---|
| none (B) | 11.5 | 9 | 84 % | 95.3 | 0.06 | 0.94 | 0.98 / 0.44 | 1.02 |
| 0.12 | 12.2 | 11 | 82 % | → 103.7 | 0.06 | 0.94 | 0.98 / 0.55 | (no antinocAdd) 1.01 |
| **0.25 (chosen)** | **12.8** | **15** | 81 % | → 112.8 | **0.06** | **0.94** | **0.98 / 0.53** | **0.85** (HR 0.80) |
| 0.5 (cap 0.6) | 14.2 | 20 | 78 % | → 130.3 | 0.06 | 0.93 | 0.97 / 0.65 | 0.99 (no antinocAdd) |
| 0.25, AWAKE (no propofol) | **25** | **22** | — | → 119.1 | — | — | — | — |

Reading: the reset is DEFENDED (≥ 78 % of the peak at 90 s — the audit's real complaint is gone), the HR band is met,
and the awake response is in band; after propofol the MAP band is not reached by ANY reasonable gain, because FU-4's
propofol `outF` (−31 % delivered sympathetic output) caps what the reflex can deliver toward the new set point — the
remaining pressor is 7e's direct stress effect (`G_SYMP_*`, which this plan must not raise). β-blockers blunt the HR
share only: with the set point reset, the reflex reaches it through the α limb (labetalol 10 mg's α share is small).
Fentanyl 3 µg/kg abolishes it (0.06): 7f's opioid blunting is stronger than M10's 0.2–0.7. **SUPERSEDED by R51 addendum
25** (the circulating release, Task 10 Steps 1b–1c): the propofol arm reaches +27.2 and fentanyl 0.23 — "Prototype —
second fixer" → "Task 10 under addendum 25". This reset-only table is kept as the record of why addendum 25 was needed.

### Prototype — second fixer (the R50 fixes and R51 addendum 25, re-measured by the third fixer)

The second fixer applied F2–F10, F12–F21, rulings 2–6 and addendum 25 as blocks and measured them, but was stopped by a
usage cap before this section was written; the third fixer re-applied EVERY block of this plan in order and re-measured.
**Tree:** `origin/main` bab4b72 + `origin/fu-4-integration-polish` **e3eeb56** (FU-4 Tasks 0–18d; 18f not landed) +
Tasks 1–19's blocks (178 find/replace pairs: 176 unique, the 2 declared FU-6 misses — Task 1's `audit:respiratory`
anchor, anchored on `audit:physiology` instead, and Task 6 Step 1b's FU-6 `hvrDep` line) + the test files the plan
creates. **Typecheck clean** (all 8 projects) with NO hand-added declarations — the seven interface fields the review
found in prose are real blocks. `test/l2` + `test/l3`: **193 files / 933 passed, 1 skipped.** Audit harness = Task 1's
copy, seed 7, the research/14 rigs (`audit:drugs`, 19 cells). FU-6 is NOT on this tree, so the cells that need FU-6's
relative apnoea threshold (DI-03's apnoea item, DI-71's apnoea) are reported, not judged.

**Addendum 19 with the three data corrections (Task 2 Step 2b; D19b, D20):**

| cell | item | band | first writer (pre-fix data) | after the corrections |
|---|---|---|---|---|
| DI-63 | atropine 0.5 mg peak time | 10–180 s | 70 s (from `tpS` 60, an onset time) | **130 s** ✓ (`tpS` 150, label peak 2–4 min) |
| DI-63 | glycopyrrolate 0.4 mg peak time | 60–600 s | 140 s | **140 s** ✓ (unchanged row) |
| DI-88 | midazolam 0.05 mg/kg depth nadir | 120–420 s | 115 s (`it.fails`) | **190 s ✓ — the `it.fails` is gone** (`tpS` 240) |
| DI-69 | ketamine 1.5 mg/kg LOC | ≥ 30 s (audit §4) | 20 s | **20 s** — pinned `it.fails` (D20) |
| DI-69 | ketamine emergence | 10–20 min (M10 Table 21.1) | not asserted (`t10S` 900: D20's scan — no `hypC50` gave both bands) | **715 s = 11.9 min ✓** (`t10S` 2700, redistribution) |
| DI-71 | naloxone 0.4 mg reversal | 30–180 s | 40 s | **40 s** ✓ (VE recovery 51 %) |
| DI-72 | flumazenil DI rise / consciousness | ≥ +2 / 30–180 s | +12 / — | **+13 ✓ / 5 s (TS)** — see note |

DI-72 note: `conscRecoveredS` 5 s is a RIG artefact, not an onset one: in the audit's rig flumazenil is given 5 s before
the control arm's own emergence would have come within ~80 s (i-arm emergence 722 s vs control 800 s), so a small
antagonism tips a patient who is already at the LOC threshold; the flumazenil curve itself reaches 6 % of its peak at
5 s (Addendum 19 table). Reported in the gate note §5; the audit's band is not touched (R45).

**Addendum 20 (Tasks 3–6: the potency outputs, D16's true fentanyl-equivalents, the per-class ventilatory α):**

| cell | item | band [source] | first writer (α 1.5 for all) | per-class α (0.3 / 1.5) |
|---|---|---|---|---|
| DI-69 | thiopental 4 mg/kg LOC / awakening | — / 240–900 s | +10 s / 360 s | **+10 s / 360 s** ✓ |
| DI-69 | etomidate 0.3 mg/kg LOC / duration | — / 150–600 s | +20 s / 195 s | **+20 s / 195 s** ✓ |
| DI-69 | propofol 2 mg/kg LOC / emergence | 20–120 s | 60 / 440 s | **55 / 490 s** ✓ (FU-4's flow-dependent PK) |
| DI-03 | Bailey pair SpO₂ nadir, room air | 70–89 % [Bailey 1990] | 77 % | **77 %** ✓ (the benzodiazepine arm keeps α 1.5) |
| DI-03 | Bailey pair VE vs the singles | supra-additive | −70.6 vs −43.5 / −13.3 % | **−68.4 vs −40.7 / −16.6 %** ✓ |
| DI-01d | propofol + remifentanil apnoea | 60–600 s | 500 s (top of the band — review F2) | **380 s** ✓ (α 0.3, Nieuwenhuijs) |
| DI-02 | co-induction DI reduction | ≤ −2 | −8 | **−9** ✓ |
| DI-77 | opioid MAC reduction | 0.4–0.7 [Lang 1996] | 0.61 | **0.63** ✓ (D16: fentanyl's MAC weight 0.8, remifentanil unchanged) |
| DI-89 | apnoea flag while breathing | 0 s | 380 s | **0 s** ✓ (Task 7 on FU-4's tree; re-measure on FU-6's) |
| unit | the per-class surface (Task 6 Step 3) | — | — | singles 0.723 / 0.868, product 0.628; propofol pair 0.500, benzodiazepine pair 0.203 |
| engine | LOC dose 80 y / 35 y (Task 3's age test + Task 19 case 2, D19a) | midazolam 0.4–0.6, thiopental/etomidate 0.6–0.8 | — | **midazolam 0.139 → 0.069 mg/kg = 0.50; thiopental 1.53 → 1.08 = 0.71; etomidate 0.114 → 0.082 = 0.71** (bisection, seed 7; equals the analytic ratios) |

**Addendum 21 (Tasks 8–9) re-measured WITH Task 10 under addendum 25 (review F1's "both columns"; the "without" column
is the first fixer's b675248 number, and A = B holds by construction — the guard arms below measure `surgeF` 1 and
`surgeCat` 0 exactly for ephedrine and ketamine):**

| cell | item | band | with Task 10 (add. 25, e3eeb56) | without Task 10 (b675248) |
|---|---|---|---|---|
| DI-04a | ephedrine 10 mg MAP rise, healthy | 8–25 | **12.8** ✓ | 13.8 |
| DI-04a | β-blocked / healthy ratio | 0.3–0.7 | **0.99** (`it.fails`, Q1) | 0.96 |
| DI-04a | HR rise β-blocked / healthy | 0–8 | **1 / 4** ✓ | 0 / 4 |
| DI-57 | ephedrine ×3: rises, ratio 2/1 | 0.4–0.95 | **8.0 / 4.0 / 2.1, 0.50** ✓ | 8.2 / 4.2 / 2.0, 0.51 |
| DI-21 | ketamine healthy MAP rise | 5–25 % | **+8.9 %** (rise 8.9 mmHg) ✓ | +9.1 % |
| DI-21 | ketamine, cold septic phase | sign −1 | **−0.4 %** ✓ | −0.3 % |
| DI-80 | ketamine in class III | −15…+5 % | **−0.1 %** ✓, no arrest | −0.1 % |
| DI-05 | adrenaline 100 µg excess under blockade / reflex bradycardia | > 2 % / < 0 | **1.9 % / 0** (both `it.fails`, Task 8 Step 6) | 2 % / 0 |
| DI-41 | β-blocked anaphylaxis resistance ratio | 0.2–0.8 | **0.96** (every arm arrests on FU-4's tree) | 0.94 |
| DI-83 | dobutamine ratio β-blocked / septic | 0.2–0.8 / 0.3–0.9 | **0.26 / 0.68** ✓ | — |
| DI-51 | rocuronium prolongation at 1.1 MAC | 25–80 % | **+50.5 %** ✓ | +52.2 % (2nd fixer) |

The differences between the two columns are FU-4's commits between b675248 and e3eeb56 (the humoral arm, dead space),
not Task 10.

**Task 10 under addendum 25 (Steps 1–1c; `SURGE_SET_PER_NOX` 0.25, `SURGE_NE_GAIN` 0.6; ratios to the propofol arm;
propofol 2 mg/kg at 240 s, stimulus 1.5 at 300–360 s):**

| arm | ΔMAP peak (at) | ΔHR peak | % of the peak at +90 s | band | verdict |
|---|---|---|---|---|---|
| propofol + laryngoscopy (DI-08 `pressorNoLab`) | **+27.2** (+65 s) | **+17** | 85 % | 20–30 / 12–30 / ≥ 50 % | ✓ ✓ ✓ |
| fentanyl 3 µg/kg first | ratio **0.23** | 0.24 | 71 % | 0.2–0.7 | ✓ |
| labetalol 10 mg first (DI-08 `ratio`) | ratio **0.94** | 0.65 | 86 % | 0.2–0.8 | `it.fails` |
| esmolol 1 mg/kg first | MAP **0.99** | HR **0.53** | 87 % | MAP ≤ 0.9, HR ≤ 0.5; HR < MAP | bounds `it.fails`; order ✓ |
| lidocaine 1.5 mg/kg first | ratio **0.86** | 0.94 | 85 % | 0.4–0.9 | ✓ |
| AWAKE (no hypnotic) | **+36.9** (+60 s) | **+13** | 86 % | 20–40 (M10) / 12–30 | ✓ ✓ |

`SURGE_NE_GAIN` scan (second fixer, the release reading the opioid share): 1.0 → propofol +33.2 (above), fentanyl 0.22;
0.6 → +27.1, 0.20; 0.4 → +23.7, 0.18 (fentanyl below 0.2). 0.6 is the one value with both bands met. Before Step 1c
(release blunted by the TOTAL `antinoc`) every gain gave fentanyl 0.06–0.09.

**Task 18 (the inert rows; the third fixer's correction, D12):** dexamethasone 8 mg through 7e's cortisol metabolic term
raises glucose **+17.7 mg/dL at 1 h, +19.7 at 2 h** (DI-76 band 10–60 ✓) with MAP and HR unchanged (0.0); ondansetron
4 mg adds **+14 ms** QTc at 10–30 min (+8 at 2 h; band 10–20 ✓). Scan: dexamethasone `emax` 600 / 2000 / **4000** →
+8.4 / +14.7 / +17.7 at 1 h; ondansetron `emax` 15 / **30** → +7 / +14 ms.

**Ruling 1's guard arms under addendum 25** (20–60 min, the ventilated rig, no stimulus; A vs the same arm with
`ext.surgeF` forced to 1 after every 5 s advance): `h.symp` max sepsis grade 3 **0.50**, anaphylaxis III **0.50**,
untreated MH **2.00**, ephedrine 10 mg **0.78**, ketamine 1.5 mg/kg **1.05**, hypoglycaemia (insulin 40 U, glucose
nadir 32 mg/dL) **1.99** — and in ALL SIX arms `|surgeF − 1|` max **0**, `surgeCat` max **0 / 0**, |Δ`baro.set`| max
**0.000 mmHg**, |ΔMAP| max **0.000**. Neither the reset nor the circulating release can be reached by a condition's or
a drug's sympathetic activity.

---

## Requests to other stages

- **FU-4 "integration polish" (merges BEFORE this plan; owner of `symp`/`setF`, the humoral arm, the arrest machine,
  potassium, vagal events, flow-dependent PK):**
  1. **Extend the `symp`/`setF` rows to the classes Task 2 of FU-4 leaves alone** (audit D1's follow-on, measured here):
     dexmedetomidine (central sympatholysis is its MAIN effect — HR −1 bpm against −10–20 %, DI-60), thiopental,
     midazolam, desflurane and the opioids (a small central sympatholysis each). Until then DI-01c's
     hypnotic–opioid haemodynamic synergy stays −0.4 % (band: supra-additive) and DI-60 stays MI. FU-7 does NOT add
     `symp` rows: they are FU-4's field and FU-4's re-fit against its own S-suite.
  2. **`baroreflex.ts` stays yours.** Task 8 Step 6 may show that the unopposed-α reflex bradycardia needs a vagal-limb
     change (`SYMP_WITHDRAW_HR`, `VAGAL_WITHDRAW_MS`); FU-7 reports the numbers and does not edit the file.
  3. **The humoral arm's β1 → renin term** (audit D4's "related" paragraph): a β-blocked class III bleed peaks at HR 71
     with SBP 98 (tables 17b: HR 80–95, SBP 65–80). With `hum` in place, add the β1-mediated renin share so chronic
     β-blockade removes part of the angiotensin response. FU-7 supplies the occupancy input (`prof.betaOcc`).
  4. **`riskOf().cat` and the new `drug.ees`**: Task 9 moves ketamine's and ephedrine's pressor arms OFF `drug.ees`/`hr`
     onto 7e's drive, so FU-4's VF-onset share sees a smaller `cat` for those two drugs. Re-measure S13/S9 after the
     FU-7 merge (the gate does it from your suite).
  5. **The laryngoscopy pressor after propofol — RESOLVED inside FU-7 by R51 addendum 25; nothing is asked of FU-4.**
     With the reset alone (first fixer, your b675248) your `outF` (−31 % delivered output after propofol) rightly capped
     the reflex's delivery (ΔMAP +12.8 against 20–30). Addendum 25 adds the surge's CIRCULATING catecholamines, acted out
     by 7g's adrenergic rows outside the reflex: ΔMAP **+27.2**, ΔHR +17 after propofol on your e3eeb56 (third fixer).
     Your `outF`, `setF` path and `baroreflex.ts` are untouched; Task 10 multiplies ONE factor into the `setF` argument of
     your `stepBaro(` call. Re-measure your S-suite laryngoscopy/stimulus rows after the FU-7 merge (the surge now carries
     a noradrenaline-equivalent of ≈ 0.02 µg/kg/min at its peak).
- **FU-6 "respiratory integration" (merges immediately BEFORE this plan):**
  1. **Task 6 and Task 7 are written on your `drive.ts`/`spont.ts` shape** (`loc`, `pain`, `hvrDep`, `APNOEA_VE_IN/OUT`,
     the central lag). FU-7 replaces your `dProp`/`dMid`/`dKet` inputs with 7g's ONE hypnotic equivalent and keeps every
     other term. If your merged names differ, Task 0 re-anchors; if the STRUCTURE differs (e.g. `dHyp` no longer exists),
     the executor stops and reports rather than guessing.
  2. **`bus.airway.bronchodilation` keeps its meaning** (relaxation only). Task 16 adds a CONSTRICTOR input for
     histamine through your `SMOOTH_MUSCLE`/`relaxed` path and does NOT add its id to `bdExempt`, so salbutamol still
     relieves a histamine bronchospasm.
  3. **`hvrDep`'s NMB arm is yours, not FU-7's (seam update from the finished FU-6 plan, binding).** FU-6 adds exactly
     ONE NMB arm to `hvrDep` in `neuro/drive.ts` (Eriksson 1993; Sato & Severinghaus: `HVR_NMB_EMAX` 0.3,
     `HVR_NMB_TOFR_LO` 0.7, multiplied into the `hvrDep` expression). FU-7 adds NO NMB term and keeps yours. Task 6
     Step 1b edits exactly two factors of your `hvrDep` line (Orchestrator ruling (FU-7 review) 3): `(1 − dMid)` is
     removed (the benzodiazepine share is inside the ONE equivalent) and `hill(x.vent.propofol/HVR_PROP_C50, 1.5)`
     reads the equivalent (`hypC`), with your `HVR_PROP_C50 = 3 × PROP_VENT_C50` unchanged — propofol's own `hvrDep`
     is identical by construction; the volatile, opioid and NMB factors are untouched.
  3a. **Residual neuromuscular block while awake** (Eikermann; FU-6's D21) is FU-6's rule. FU-7 does not touch residual
     block.
  3b. **`types-lung.ts`:** FU-6 adds an optional `ageMin` to the `lungCondition` event (E-FU6-9). FU-7 does not edit
     `types-lung.ts`. Task 16's histamine constrictor reads the lung specs as FU-6 leaves them.
  4. Please keep `resp.spont.rr === 0` as the apnoea truth: Task 7 makes 7f's flag read it. Your seam item 7 (the
     seeded induction-apnoea draw) is honoured: Task 7's cases use seed 7 (u 0.737) and the population claims (Bailey's
     6/12) are asserted over a seed set.
  5. **Your seam item 5 is FU-7's (binding):** the volatile `bronchodilation` row (Emax 1 at 0.5 MAC) is 7g's, and FU-7
     re-fits it against "volatiles lower airway resistance ≈ 20–40 %" (Task 17 Step 2, D23) with your "Ppeak −30 % at
     0.79 MAC" case as the co-constraint FU-7 must keep green. FU-6 only reads B.
- **Stage 7e (endocrine/thermal; already merged, so FU-7 edits it under E-FU7-2):** `sympDrug`, `catReserve` and
  `surgeF` are new 7e state. They are additive and neutral without 7g. The surge's own time course stays 7e's
  (`SYMP_ON_TAU_S` 25 s / `SYMP_OFF_TAU_S` 180 s, unchanged).
- **Stage 7e / 7a (stimulus ownership, addendum 22 and D8):** the `stimulus` event stays 7e's ONE shape. FU-7 does not
  add an event, a second intensity scale or a second owner. 7a defends the surge through FU-4's `setF`.
- **Stage 7i "blood chemistry & coagulation" (R58, after this plan):** (1) tranexamic acid's row and dose log stay in
  7g with a hook comment — wire fibrinolysis to it, do not add a second TXA row; (2) heparin and protamine are NOT in
  the library yet (D13): add them as 7g rows when you land, with 7g owning their PK; (3) the DI-74 audit cell is
  designed and waiting with its expected response.
- **Stage 7j "obstetric" (R59):** the uterotonics of DI-75 are yours; 7g will own their PK rows.
- **FU-5 "monitor fidelity" (in parallel, owner of `l3/**`):** Task 12 edits `l3/defib-pacer/outcome.ts` and
  `l3/device-layer.ts` under **E-FU7-6** (addendum 23 gives shock success to FU-7). The state part is additive:
  - `ShockContext` gains seven optional fields (five state fields, plus `tempC` and `rhythmId` from the DV amendment);
  - `outcomeProbabilities` multiplies `VF_TABLE.rosc` by the state factors, renormalising, and the termination by the
    temperature factor.

  **Two changes are NOT additive (DV amendment, research/20):**
  - `VF_TABLE` is re-sourced to `{ persistent 0.1, asystolePea 0.8, rosc 0.1 }` (biphasic 90 % termination, DV-01a);
  - the flat `CARDIOVERSION_SINUS` becomes a per-rhythm energy curve when the rhythm id is known (DV-06a–c).

  Stage 4's `test/l3/defib-pacer/outcome.test.ts` is edited to the new table (Task 12 Step 0; tolerance and seed count
  unchanged). Nothing in the defibrillator UI, the tones or the marks changes. FU-7 merges `origin/main` immediately
  before Task 12 and re-runs the device tests after.
- **Stage 8b "release" (docs):** the glossary rows for the new console fields (propofol-equivalent Ce, fentanyl-equivalent
  Ce, dissociative fraction, β-occupancy, antiarrhythmic occupancy) come from research/11 §5 and are listed in the gate
  note for the doc pass.
- **FU-8 (the engine-defect follow-up; CM amendment 2026-09-29, research/19 findings 6–7 + §3 C1/C3):**
  1. **Part A — the fast-AF end-diastolic-pressure defect (C3) executes BEFORE FU-7** (orchestrator, CM routing
     2026-09-29 10:25). FU-7 does not fix it and does not work around it: **Task 0 Step 6b** checks it on the base
     (CM-15c: a healthy 40 y in AF 150 keeps `kIsch` ≥ 0.9 for 20 min and does not arrest) and, if it has not landed,
     Tasks 11, 12 and 19 guard their AF rigs (window under 5 min + a control-arm `kIsch` ≥ 0.9 precondition).
  2. **Part B — the resting sympathetic tone (C1) is NOT FU-7's; FU-8 owns it, and Ali reviews the mechanism first.**
     research/19 §3 C1: nothing in a chronic-disease profile changes the induction fall, because every sympathetic
     effector is `1 + o·gain·error` and at rest the error is zero — so there is no resting tone for an induction agent to
     remove, and the fall is ≈ −20 % in the healthy adult, the 80 y, untreated hypertension, AS + CAD, HFrEF and severe
     PH alike (CM-01b/03b/05a/06b/13a; FU-4's own S14 `it.fails` is the same gap). research/19 §4 item 6 named FU-7
     **Task 9** as a possible home because Task 9 already builds 7e's central drive with a `catReserve`. **The
     orchestrator has placed it in FU-8 Part B instead, with Ali reviewing the mechanism (a profile-dependent tonic
     share τ of resting SVR, venous tone and contractility) before it is built** — it moves the four-patient induction
     table and FU-4's calibrated rows, which is a bigger blast radius than a drug-layer plan should carry.
     Consequences, binding on this plan:
     - **Task 9 adds no resting tone.** Its `sympDrive`/`catReserve` stay drug-driven: at rest, with no drug, the drive
       contributes exactly what it does today. An executor who finds the four-patient propofol rows unmoved by FU-7 has
       found the expected result, not a bug — it reports the numbers and does not reach for a tonic term.
     - **Task 8's exception is NOT widened.** `E-FU7-3` covers Task 8's β-occupancy edits to `circ/profile.ts` and
       nothing else. research/19 §4 item 7 observes that C1, C4 (the double-counted obesity sizing) and C5 (profiles
       whose stabiliser targets disagree with their reflex set point) land in that same file and suggests folding them
       into the same exception if they were given to FU-7. They were not: all three are FU-8 Part A/B items, so
       `E-FU7-3` keeps its current scope, the file is touched only for β-occupancy, and FU-7 opens no second exception
       for them either.
     - **Task 10 case 1b** (the untreated-hypertension pressor ratio, finding 4) is expected to stay short of
       Prys-Roberts 1971's ≈ 2× for exactly this reason; it is written as a measured `it.fails` naming C1 / FU-8 Part B,
       never met by moving a profile set point or a 7e gain.
  3. **Part A — V1, the inert shock- or instructor-made PEA (DV amendment 2026-09-29, research/20 DV-01b).**
     - FU-8 Part A owns it: every pulseless state enters the arrest state, so `roscStep`, `peaDecayStep` and the
       G-FU4-1 humoral withdrawal apply to it and `circ.arrest.t` exists.
     - FU-7 does not fix it. **Task 0 Step 6c** checks it on the base with DV-01b.
     - If V1 has not landed, Task 12's arrest-clock arm (`arrestS`) is exercised only on ENGINE-DECLARED arrests, and the
       gate note records the gap.
     - Two further items are FU-8 Part A's and FU-7 fits no CoPP constant on those rigs: research/20 V2(a), the IABP
       post-deflation dip in `coronary.ts:142` (the same line as C3); and V3, tamponade CPR.
  4. **The missing-profile family and the notes FU-7 leaves for it:** the `asthma` bronchial-reactivity gain (CM-11a,
     Task 16's note) and an `osa` opioid-sensitivity factor (CM-12a, Task 6's note) have no owner; FU-7 only keeps the
     two seams scalable by one per-profile number each. The profiles themselves (OSA, CKD, diabetic autonomic
     neuropathy, cirrhosis) are with Ali as a v1.0-vs-v1.1 decision (research/19 §3 C10, §8).
- **FU-10 "endocrine and thermal integration" (RH/ET amendment, 2026-09-30).** This plan is not yet written; it will
  be written after the 2026-10-03 reset, off the critical path, and owns research/14-coverage E1–E13. Two items:
  1. **Hydrocortisone waits for FU-10's basal adrenal deficit (ET-15b; D13).** Today the `adrenalInsufficiency` profile
     is nearly inert (E13). Its only effect is `cortResponse` 0.5 (`endo/core.ts`), which halves the stress
     cortisol rise and trims `vasoResp`. ET-15a measured the post-induction MAP as identical to health (73.7 vs 73.7),
     the phenylephrine pressor ratio as 0.79 and `vasoResp` as 0.875. There is no low basal cortisol and no refractory
     hypotension, so a hydrocortisone row would have nothing to reverse. FU-7 adds no row.
     Once FU-10 gives the profile its basal deficit, the row is FU-10's to add as a 7g row (7g owns the PK, R51 §1):
     - a `glucocorticoid` PD target, which Task 18 creates and which already feeds 7e's cortisol metabolic term
       (`cortExoNmolL`), using hydrocortisone's own potency (1, against dexamethasone's 25);
     - the PERMISSIVE vascular share (`vasoResp`), which Task 18 deliberately leaves on endogenous cortisol only. FU-10
       decides whether the exogenous glucocorticoid joins it. The acceptance cell is ET-15b: refractory hypotension
       reverses within 30–60 min of 100 mg IV.
  2. **Task 9's sympathetic-drive seam is shared with FU-10's E4 and E12. It is recorded here and nothing changes.**
     - Task 9 routes 7g's `sympDrive` (ephedrine, ketamine) into 7e's `extraSymp`, scaled by `catReserve`. Task 10's
       `h.surge` reads the nociceptive term only (ruling 1).
     - E4 (cold drives no sympathetic response: VO₂ +59 % with NA/HR/MAP unchanged) and E12 (GA does not mask the
       hypoglycaemic sympathetic response: HR +26 under GA against +16 awake) will add or modulate terms in the same
       `extraSymp` sum and in `h.symp`'s depth dependence.
     - Binding on both plans: a new FU-10 sympathetic source enters `extraSymp` (never `h.surge`, so ruling 1's guard
       arms keep holding). It is multiplied by `catReserve` only if it is a RELEASE (cold-induced noradrenaline
       release is; a hypoglycaemic adrenal response is 7e's own adrenaline, which `catReserve` does not deplete).
     - Task 10's guard arm (f), hypoglycaemia, is FU-10's regression guard for E12. If FU-10 makes GA mask the
       hypoglycaemic response, arm (f)'s `h.symp` falls, and arm (f)'s `surgeF`/`surgeCat` must stay exactly neutral.
     - FU-10 edits `hormones.ts`/`core.ts` after FU-7 merges. It re-anchors on FU-7's `h.surge`/`catReserve` lines and
       does not reorder them.
- **The R44 calibration pass (Ali):** every row this plan re-fits carries `[ENG]` with its fit target; the calibration
  queue additions are listed in the gate task (Task 20 Step 6).

---

## Architecture in one page

```
  device / instructor events                         ONE stimulus event (7e's, addendum 12)
        │                                                    │
        ▼                                                    ▼
  ┌───────────────────────── 7g  l2/pk/**  (owns PK + PD + every drug event) ─────────────────────────┐
  │  gamma.ts     onsetChain(tp, t10) → e^{−k_e t} − e^{−k_a t}(1 + (k_a − k_e)t)   [zero slope, D1]  │
  │  pipeline.ts  siteConc → per-agent Ce (brain, vent, nmj, dia) + the dose log                      │
  │  combine.ts   per target × class × sign Loewe sums, β-occupancy EC50 shift (β1 / β2), and:        │
  │                 cns.hypPropEq      = Σ (c/hypC50) · 3.08 · e^{−0.00635(age−35)}   µg/mL prop-eq   │
  │                 cns.hypVentPropEq  = same, weighted by CnsSpec.ventShare                          │
  │                 cns.dissoc         = dissociative share of hypPropEq                              │
  │                 cns.opioidCeFentEq / opioidVentFentEq = true fent-eq (macRemiEq / ventRemiEq)     │
  │                 cns.sympDrive      = indirect sympathomimetic drive (ephedrine, ketamine)         │
  │                 airway.histamine   (existing) · rhythm.antiarrhythmicU (new)                      │
  │  hooks.ts     rhythm requests: adenosine · Mg/torsades · LAST · NEW conversion hazards            │
  └───────────────────────────────────────────────────────────────────────────────────────────────────┘
        │ fx (DrugEffect)            │ bus.cns / bus.airway / bus.rhythm          │ bus.doses (observers)
        ▼                            ▼                                            ▼
  7a circulation              7f l2/neuro/**                                7c blood · 7e endo
  ├ betaOcc/betaNonSel        ├ depth.ts:  u ← hypPropEq·(1−dis+0.1·dis)     ├ sux K⁺ ← nm profile (D11)
  │   (profile → pkCtx)       │            hypnotic ← hypPropEq (LOC)        ├ Mg/iCa → 7f (one state)
  ├ histamine → SVR, V0       │            eKet    ← dissoc (BIS paradox)    ├ sympDrive → extraSymp
  ├ surgeF × FU-4's setF      ├ drive.ts:  ONE hypnotic ventilatory term,    ├ catReserve (depletion)
  └ (baroreflex untouched)    │            C50 cross-shift, α per class      └ surgeF + surgeCat (add. 25)
                              └ apnoea = the chemoreflex's rr === 0 (D7)
        │
        ▼
  L3 l3/defib-pacer/outcome.ts:  P(rosc) × amiodarone/lidocaine × K⁺ × pH × CPP (circulatory phase) × arrest duration;
                                 termination 90 % (biphasic) × temperature; cardioversion by rhythm × energy (DV)
```

Data flow rules that keep this legible:
1. **One direction.** 7g never reads 7f/7e outputs; the potency outputs are computed from concentrations and the
   patient's age only. 7f/7e/7a/L3 read published values, duck-typed with neutral fallbacks.
2. **One state per mechanism** (D11): magnesium, calcium, burn/denervation, histamine and the catecholamine reserve each
   have exactly one owner and one field.
3. **Every new number is in a row or a named constant**, never inline in a pipeline: the rows carry `src`/`tag`, the
   constants carry the fit target.
4. **Nothing new runs per tick**: the chain solve is cached per (tp, t10); the potency sums ride the existing
   `combine` loop; conversion hazards ride the existing 1 Hz rhythm-hook call.

## File map

| File | Tasks | Owner | Change |
|---|---|---|---|
| `packages/engine-core/src/l2/pk/gamma.ts` | 2 | 7g | `onsetChain`, `chainShape`, `ONSET_N_MIN`; `gammaConc(…, t10S?)` |
| `packages/engine-core/src/l2/pk/pipeline.ts` | 2, 3, 4, 8, 11 | 7g | the chain call in `siteConc`; `vent` into `actives`; `PkCtx.betaOcc/betaNonSel`; the hook call |
| `packages/engine-core/src/types-pk.ts` | 3, 4, 9, 11 | 7g | `cns.{hypPropEq, hypVentPropEq, opioidCeFentEq, opioidVentFentEq, dissoc, sympDrive}`, `rhythm.antiarrhythmicU` |
| `packages/engine-core/src/l2/pk/row.ts` | 3, 8, 9, 11, 16, 18 | 7g | `CnsSpec.{dissociative, ventShare}`, `PdEffect.beta2`, `PdTarget` += `sympDrive`/`histamineTone`/`antiarrhythmic`/`qtc` |
| `packages/engine-core/src/l2/pk/combine.ts` | 3, 4, 8, 9, 11, 13 | 7g | the potency outputs, β1/β2 occupancy, `sympDrive`, `antiarrhythmicU` |
| `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts` | 2, 3, 9, 15, 16, 17 | 7g | midazolam `tpS` 240 and ketamine `t10S` 2700 (Task 2, ruling 6 / D20); ketamine `cns`, thiopental/etomidate `hypC50`, etomidate `ventShare`, midazolam `hypC50AgeK`, opioid `macRemiEq`/`ventRemiEq` (Task 3); morphine histamine; volatile `bronchodilation` re-fit (Task 17, FU-6 seam item 5) |
| `packages/engine-core/src/l2/pk/data/rows-cardiovascular.ts` | 2, 9, 11, 12, 17, 18 | 7g | atropine `tpS` 150 (Task 2, ruling 6); ephedrine indirect arm, antiarrhythmic rows, procainamide/verapamil/glucagon, inotrope sizes, sugammadex hazard |
| `packages/engine-core/src/l2/pk/data/rows-other.ts` | 13, 16, 17, 18 | 7g | LAST thresholds, atracurium/mivacurium, nitroprusside, dexamethasone/ondansetron/TXA |
| `packages/engine-core/src/l2/pk/{hooks,volatile,nmb}.ts`, `l2/pk/pd.ts` | 3, 11, 15 | 7g | `FENT_VENT_REMI_EQ` (pd.ts, one source); conversion hazards; the exported alveolar uptake (second gas); nothing in `nmb.ts` beyond a comment |
| `packages/engine-core/src/l2/neuro/{bus,depth,drive,pipeline}.ts` | 5, 6, 7 | 7f (E-FU7-1) | read the potency outputs; the ventilatory surface; the apnoea truth |
| `packages/engine-core/src/l2/neuro/interactions.ts` | 14 | 7f (E-FU7-1) | Mg from 7c's blood, calcium antagonism, volatile potentiation re-size |
| `packages/engine-core/src/l2/endo/{core,adapters,hormones,effects,params}.ts` | 9, 10, 18 | 7e (E-FU7-2) | `sympDrug`, `catReserve`, `surgeF`, dexamethasone glucose |
| `packages/engine-core/src/l2/circ/{profile,model}.ts` | 8, 10, 16 | 7a (E-FU7-3) | `betaOcc`/`betaNonSel`; `surgeF` into FU-4's `setF`; histamine SVR/V0 |
| `packages/engine-core/src/l2/blood/{pipeline,core}.ts` | 14, 18 | 7c (E-FU7-4) | sux K⁺ from the nm profile; the `qtc` delta from 7g |
| `packages/engine-core/src/l2/resp/pipeline.ts`, `l2/lung/conditions.ts` | 16 | Stage 3 / 7b (E-FU7-5) | the histamine constrictor input |
| `packages/engine-core/src/l3/defib-pacer/outcome.ts`, `src/l3/device-layer.ts` | 12 | L3 (E-FU7-6) | the shock-outcome state context; the re-sourced `VF_TABLE` and the cardioversion curve (DV amendment) |
| `packages/engine-core/test/l3/defib-pacer/outcome.test.ts` | 12 | L3 test (E-FU7-6, DV amendment) | Stage 4's table test follows the re-sourced `VF_TABLE` (three assertions; tolerance unchanged) |
| `packages/engine-core/src/engine.ts` | 7, 8, 10, 11, 12, 14, 16, 18 | Stage 2 (E-FU7-7) | one-line additions, each named by its task (E-FU7-7's list) |
| `packages/engine-core/src/truth.ts`, `apps/demo/src/physiology-console/meta.ts` | 19 | 7x (E-FU7-8) | the new console rows |
| `packages/engine-core/test/helpers/neuro-bus.ts`, `test/l2/neuro/depth-drive.test.ts` | 5 | tests (E-FU7-9) | fixtures publish the potency outputs |
| `packages/engine-core/test/l2/pk/onset-chain.test.ts` | 2 | tests | new |
| `packages/engine-core/test/l2/pk/potency-outputs.test.ts` | 3, 4 | tests | new |
| `packages/engine-core/test/l2/neuro/hypnotic-equivalent.test.ts` | 5, 6 | tests | new |
| `packages/engine-core/test/l2/pk/beta-occupancy.test.ts` | 8 | tests | new |
| `packages/engine-core/test/l2/pk/antiarrhythmic.test.ts`, `test/l3/shock-state.test.ts` | 11, 12 | tests | new |
| `packages/engine-core/test/l2/pk/interactions-misc.test.ts` | 13, 15, 16, 17, 18 | tests | new (LAST sum, second gas, histamine, sizes, inert rows) |
| `packages/engine-core/test/engine/drug-layer.test.ts` | 19 | tests | new engine set (SLOW_B; the flipped matrix cells) |
| `packages/engine-core/test/engine/drug-apnoea.test.ts` | 7, 19 | tests | new (SLOW_B; apnoea truth, Bailey pair, fentanyl 5 µg/kg) |
| `scripts/audit-drugs/**`, root `package.json`, `.gitignore` | 1 | tooling | `pnpm run audit:drugs` |
| `packages/engine-core/vite.config.ts` | 19 | CI | THREE slow files (`drug-layer`, `drug-apnoea`, `stimulus-surge`), by FU-4's mechanism (review F16) |
| `apps/demo/{fu7.html,src/fu7.ts,scripts/fu7-shots.mjs,e2e/fu7.e2e.ts}` | 20 | demo | gate evidence page (Chromium-only) |
| `docs/gates/fu-7.md`, `docs/gates/fu-7/*.png` | 20 | gate | new |

---

### Task 0: Base check and re-verification on the merged main (mandatory; no code change)

**Files:** none (a check; the gate note records the result).

**Why:** every block in this document was written against `origin/main` dba7fda, which carries none of FU-4, V.1, FU-6
or FU-5. The Global Constraints table names the shared files and what each stage moved.

- [x] **Step 1 — the base is complete.** `git fetch origin && git log origin/main --oneline | head -40` must show the
merge commits of **FU-4**, **V.1** and **FU-6**. If FU-6 is not merged, STOP and report (R53 order: FU-7 runs after
FU-6; both touch the drive).
- [x] **Step 2 — branch and worktree.**
```
git -C <repo> fetch origin
git -C <repo> worktree add -b fu-7-drug-layer scratch/wt-fu-7 origin/main
cd scratch/wt-fu-7 && npx -y pnpm@9.15.9 install --frozen-lockfile
npx -y pnpm@9.15.9 -r typecheck            # must be clean BEFORE any edit
```
- [x] **Step 3 — mechanical block check.** Write `<scratchpad>/fu-7-drug-layer/verify.py`: for every ``` ```ts ``` find
block in this document (in task order), assert it appears EXACTLY ONCE in its task's named file; print every miss with
its task and file. Run it in dry mode. For each miss: locate the same statement by its quoted comment or by the
function it is inside, make the SAME change there, and record the re-anchoring in the gate note §8. **Never re-type a
line you are not changing. Never widen a test.** If a miss means the STRUCTURE changed (a function FU-6 deleted, a field
FU-4 renamed), STOP and report with the file and the two versions.
**Insert steps (review F13).** The script also lists every step whose code has NO `find` (a new file, a new row, or a
block placed by prose), with its task and file; the executor ticks each one off by `grep` after applying it and the
gate note §8 records the list. After the second fixer every INTERFACE field that was prose is a real find/replace block
(Task 7 Step 1 `spontRr`, Task 9 Steps 1/4 `sympDrive`/`catReserve`, Task 12 Step 3 `DeviceHost.shockState`, Task 14
Steps 2/3 `NeuroEnv.mgMmolL/iCaMmolL` and `nmUpreg`, Task 15 Step 1 `uptakeLpm`, Task 18 Step 2 `qtc`/`qtcMsAdd`); the
remaining inserts are whole new rows (glucagon, procainamide, verapamil, nitroprusside, atracurium, mivacurium) and new
test files, each named in its task.
- [x] **Step 4 — the three FU-6 structures Task 6 and Task 7 depend on.** Confirm on the merged tree:
`grep -n "LOC_LO\|APNOEA_VE_IN\|hvrDep" packages/engine-core/src/l2/neuro/drive.ts packages/engine-core/src/l2/lung/drive.ts`
returns FU-6's constants, and `grep -n "s.rr === 0\|APNOEA_VE_OUT" packages/engine-core/src/l2/neuro/spont.ts
packages/engine-core/src/l2/lung/drive.ts` shows the relative apnoea threshold. If any is absent, Tasks 6 and 7 stop and
report (they must not reintroduce an absolute VE threshold).
Also run `grep -n "HVR_\|hvrDep\|dMid\|dKet\|dProp" packages/engine-core/src/l2/neuro/drive.ts`. This must show FU-6's
`HVR_*` constants, including the ONE NMB arm `HVR_NMB_EMAX`/`HVR_NMB_TOFR_LO` inside the `hvrDep` expression (binding
seam update from the finished FU-6 plan). **List every consumer of a local that Task 6 deletes, before editing**
(review F3 / ruling 3): on FU-6's tree `dMid` is read by the `hvrDep` line (Task 6 Step 1b edits it in the same pass)
and `SYNERGY` by nothing after Step 1 (deleted, review F17); `grep -rn "SYNERGY\|dMid\|dKet" packages/engine-core/src
packages/engine-core/test` must show no other reader. Task 6 preserves the NMB arm and adds no NMB term of its own.
- [x] **Step 5 — the FU-4 fields Tasks 8–10 build on.**
`grep -n "symp\b\|setF\|outF\|betaBlockAdd" packages/engine-core/src/l2/pk/combine.ts packages/engine-core/src/l2/circ/model.ts`
must show FU-4's `symp`/`setF` in `NEUTRAL_FX`/`FX_TARGETS` and the `stepBaro(` call's `outF`/`setF`. Record the exact
`stepBaro(` line in the gate note: Task 10 appends ONE factor to its `setF` argument. Also record FU-4's `hooks.ts`
signature (`grep -n "export function rhythmRequest" packages/engine-core/src/l2/pk/hooks.ts`): with 18f it carries
`outcomeRng?` and returns `hold?`; without it Task 11 takes its numbered fallback (Step 3a–3d).
- [x] **Step 6 — record the baseline.** `CI=1 PME_TEST_SET=fast npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run`
and `PME_TEST_SET=slow-a`, `slow-b`; `npx -y pnpm@9.15.9 -r typecheck`; save the counts to
`docs/gates/fu-7/baseline.md`. Any RED test on the merged main before FU-7 touches anything is reported, not fixed.
- [x] **Step 6b — the AF precondition: FU-8 Part A's fix must be on the tree (CM amendment 2026-09-29, research/19
finding 5 / gap C3; blocks Tasks 11, 12 and 19's AF rigs, not the rest of the plan).** research/19 §3 C3 found a P1
engine defect: on a short cycle the beat accumulator reads the ventricle's end-diastolic pressure at the moment the next
activation starts, i.e. mid-contraction (`circ/model.ts:396` → `circ/coronary.ts:142`), so in fast AF the coronary
perfusion pressure goes negative, contractility decays and a heart with normal coronaries deteriorates. Measured on main
0fd5397 (CM-15c): a healthy 40 y in AF at 150/min for 20 min loses contractility completely (`kIsch` min 0, mean 0.19)
with mean SV 9.8 mL and mean MAP 44, and does not survive the 20 min; the 70 y arm reaches `kIsch` 0.2; the SAME rate in
sinus rhythm is unaffected (`kIsch` 1.0). **FU-8 Part A owns the fix and executes BEFORE FU-7** (orchestrator, CM
routing 2026-09-29 10:25). Check it:
```
cd research/19-audit-scripts
CM_OUT=<scratchpad>/fu-7-task0/cells.json PME_ENGINE=<wt>/packages/engine-core/src/index.ts ./run.sh cli.ts CM-15c
```
**Pass condition (CM-15c's own quiet band):** `kIschMin40` ≥ 0.9 over the 20 min and neither the 40 y nor the 70 y arm
arrests — a healthy heart in AF 150 keeps its contractility for 20 min [ESC AF 2020: rapid AF in a normal heart causes
symptoms and hypotension, not arrest; CFR 3.5, tables §3]. Record `kIschMin40`, `kIschMean40`, `kIschMin70`,
`negCppSamples40` and both arrest flags in `docs/gates/fu-7/baseline.md` beside the before numbers above.
  - **If the check PASSES:** Tasks 11, 12 and 19 run their AF rigs as written; the gate note §8 states that FU-8 Part A's
    fix was verified on the base and names the commit.
  - **If the check FAILS (FU-8 Part A not landed):** FU-7 does NOT fix it (it is not FU-7's file and not FU-7's task) and
    does NOT stop — instead **every AF rig in Tasks 11, 12 and 19 is GUARDED**: (i) the AF window is kept **under 5
    minutes** of simulated time, measured from the moment the rhythm is set to the last sample the assertion reads, so
    the decay has no time to dominate; (ii) each of those tests asserts in its **control arm** (the same rig with no
    drug and no shock) that `kIsch` stays **≥ 0.9** for the whole window — a precondition assertion, so a failure reads
    as "the rig is unsound" and not as "the drug did nothing"; (iii) the test title carries "(AF rig guarded: C3
    pending)" and the gate note §5 lists every guarded case with its measured control-arm `kIsch`. A guarded rig that
    still cannot hold `kIsch` ≥ 0.9 inside 5 min makes its case an `it.fails` naming C3 / FU-8 Part A — the drug is not
    re-fitted against a failing heart and no band is widened (R45).
- [x] **Step 6c — the arrest-state precondition: FU-8 Part A's V1 fix (DV amendment 2026-09-29, research/20 DV-01b /
gap V1; blocks only Task 12's arrest-clock arm, not the rest of the plan).**

  *What V1 is.* On `origin/main` 3feee6f and 2c49d87, only the engine's own declaration creates `circ.arrest`
  (`hemo/pipeline.ts` `hypoxicArrestRequest` / `arrestStep`). Two kinds of pulseless rhythm therefore never enter the
  arrest state:
  - a PEA made by a SHOCK (`l3/device-layer.ts`, the `pea` outcome's pulseless sinus);
  - any pulseless rhythm the INSTRUCTOR sets.

  For them `roscStep` and `peaDecayStep` return at once. In DV-01b, 11 of 40 shock-made PEAs regained no pulse under
  8 min of CPR at CoPP 27–28 on a myocardium at 1.00. They also have no `arrest.t`, so Task 12's `arrestS` is
  `undefined` for them. FU-8 Part A owns the fix: every pulseless state gets the arrest state (orchestrator, DV routing
  2026-09-29). Check it:
```
cd research/20-audit-scripts
DV_OUT=<scratchpad>/fu-7-task0/dv-cells.json PME_ENGINE=<wt>/packages/engine-core/src/index.ts ./run.sh cli.ts DV-01b
```
  **Pass condition (DV-01b's own expectation):**
  - `peaArrestDeclared` is **true** (a shock-made PEA carries `circ.arrest`);
  - `peaRegains` is **true** (at least one regains a pulse under CPR).

  Record `nPea`, `peaRegainPct`, `peaArrestDeclared` and `peaCppMean` in `docs/gates/fu-7/baseline.md`.
  - **If the check PASSES:** Task 12 runs as written. The gate note §8 names the FU-8 commit, and Step 7a adds DV-01b to
    the end-to-end run.
  - **If the check FAILS (FU-8 Part A not landed, or landed without V1):** FU-7 does NOT fix it and does NOT stop.
    Task 12 then:
    - uses `arrestS` only from an **ENGINE-DECLARED** arrest. The accessor already returns `undefined` without
      `circ.arrest`, so no code changes.
    - builds every whole-engine arm that asserts an arrest-clock effect on an engine-declared arrest: FU-4's
      hyperkalaemic route (profile K⁺ 9.5 → VF ≈ 70 s), its asphyxial route (≈ 410 s), or the complete-bleed low-flow
      route (DV-03, ≈ 555 s). It never uses an instructor-set or shock-made pulseless rhythm.
    - carries "(engine-declared arrest only: V1 pending)" in each such title.
    - records in the gate note §5 that `arrestS` is silently absent for shock- and instructor-made pulseless states
      until FU-8 Part A lands. Those shocks fall back to the VF clock or to no duration factor, which is the pre-FU-7
      behaviour, not a new defect.

    The unit-level `shock-state.test.ts` cases pass `arrestS` directly and are unaffected.
- [x] **Step 7 — commit nothing.** Task 0 has no code. Proceed to Task 1.

---

### Task 1: `pnpm run audit:drugs` — research/14's harness becomes the repo's drug-interaction regression

**Files:**
- Create: `scripts/audit-drugs/{hooks.mjs,runner.ts,spec.ts,grade.ts,regrade.ts,merge.ts,report.ts,ledger.ts,cli.ts,cells-a.ts,cells-b.ts,cells-c.ts,cells-d.ts,cells-e.ts,cells-f.ts,cells-g.ts}`
  (copied verbatim from `../research/14-audit-scripts/`, outside this repo — see Step 1)
- Modify: root `package.json` (one script), `.gitignore` (the output folder)

**Interfaces:**
- Consumes: the engine through `PME_ENGINE` (default `../../packages/engine-core/src/index.ts`, as `audit:physiology`
  and `audit:respiratory` do).
- Produces: `npx -y pnpm@9.15.9 run audit:drugs [cell-id…]`; `$PME_AUDIT_OUT` (default `<repo>/.audit-drugs/`) with
  `cells.json`, `matrix.md`, `ledger.md`.

**Why:** research/14 measured 105 cells and its scripts re-run them in ≈ 28 min on an idle machine. The audit's §4 table
assigns 18 of those cells to 7g/FU-7; the gate must show them moving. Copying the scripts into the repo makes the run a
first-class regression (R54: "for each gate the owner runs the cells and pastes the report rows into its gate note").

- [x] **Step 1 — copy, do not rewrite.** From the repo root:
```
mkdir -p scripts/audit-drugs
cp ../research/14-audit-scripts/*.ts ../research/14-audit-scripts/hooks.mjs scripts/audit-drugs/
```
Do NOT copy `out/` (the run store). Do NOT edit any band, any `expect` entry, any `hand` verdict or any `known` field:
the bands are Ali's proposals (R45). The only edits allowed in this task are Steps 2–3.
- [x] **Step 2 — the engine path and the output folder.** In `scripts/audit-drugs/runner.ts`, find:

```ts
const ENGINE = process.env.PME_ENGINE ?? join(HERE, 'wt/packages/engine-core/src/index.ts');
```

Replace with:

```ts
// FU-7: in-repo default (research/14 ran against a throwaway worktree). PME_ENGINE still overrides it, so the audit can
// be pointed at another commit's worktree for a before/after comparison (gate Task 20).
const ENGINE = process.env.PME_ENGINE ?? join(HERE, '../../packages/engine-core/src/index.ts');
```

In `scripts/audit-drugs/cli.ts`, find:

```ts
const OUT = join(HERE, 'out');
```

Replace with:

```ts
const OUT = process.env.PME_AUDIT_OUT ?? join(HERE, '../../.audit-drugs');
```

and make the same substitution in `report.ts` and `ledger.ts` if they join `'out'` (grep first; keep their existing
file names inside the folder).
- [x] **Step 3 — the script and the ignore.** In the root `package.json`, find (FU-6's line; if FU-6's script is absent,
anchor on `"audit:physiology"` instead and put `audit:drugs` after it):

```json
    "audit:respiratory": "node --experimental-strip-types --import ./scripts/audit-respiratory/hooks.mjs scripts/audit-respiratory/cli.ts",
```

Replace with:

```json
    "audit:respiratory": "node --experimental-strip-types --import ./scripts/audit-respiratory/hooks.mjs scripts/audit-respiratory/cli.ts",
    "audit:drugs": "node --experimental-strip-types --import ./scripts/audit-drugs/hooks.mjs scripts/audit-drugs/cli.ts",
```

In `.gitignore`, add `.audit-drugs/` next to the other audit output folders.
- [ ] **Step 4 — run it on the untouched tree (the "before" column).**
```
npx -y pnpm@9.15.9 run audit:drugs DI-69 DI-71 DI-72 DI-88 DI-63 DI-03 DI-01d DI-89 DI-04a DI-05 DI-41 DI-21 DI-80 DI-57 DI-83 DI-13a DI-61 DI-14c DI-23 DI-19 DI-70 DI-51 DI-25 DI-90 DI-37c DI-42 DI-45 DI-60 DI-76 DI-73
node --experimental-strip-types scripts/audit-drugs/report.ts > docs/gates/fu-7/audit-before.md
```
Expected: the verdicts of research/14 §2 for the FU-4/FU-6-independent cells, and MOVED verdicts for the cells FU-4 and
FU-6 already fixed (DI-01a/b, 46–49, 78, 79, 34, 58, 22, 37a/b, 62, 17, 66, 84, M1–M3 are FU-4's; DI-40 is FU-6's).
Record both in the gate note; a cell whose FU-4/FU-6 fix did NOT land is reported, not fixed here.
- [x] **Step 5 — a typecheck guard.** `npx -y pnpm@9.15.9 -r typecheck` must stay clean (the scripts are outside the
workspace packages; if the root `tsconfig` picks them up, add `scripts/audit-drugs` to its `exclude` exactly as
`scripts/audit-physiology` is handled).
- [ ] **Step 6 — commit.** `git add -A && git commit -m "chore(fu-7): adopt the drug-interaction audit as pnpm run audit:drugs"`
(trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`), then `git push -u origin fu-7-drug-layer`.

---

### Task 2: Zero-slope onset for the 19 fallback-curve rows (addendum 19; 7g; PROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/l2/pk/gamma.ts` (the chain, `ONSET_N_MIN`, `gammaConc`'s optional `t10S`)
- Modify: `packages/engine-core/src/l2/pk/pipeline.ts` (one call site in `siteConc`)
- Modify: `packages/engine-core/src/l2/pk/data/rows-cardiovascular.ts` (atropine `tpS`), `data/rows-anaesthetic.ts`
  (midazolam `tpS`, ketamine `t10S`) — Step 2b, ruling 6
- Modify (RH amendment, Steps 2c–2d): `l2/pk/row.ts` (`elim.t12S`), `l2/pk/pipeline.ts` (`gammaDeclineRate`, the
  import, the gamma step), `data/rows-anaesthetic.ts` (six `elim` lines; fentanyl `flowDist`),
  `data/rows-cardiovascular.ts` (neostigmine and glycopyrrolate `elim`)
- Test: create `packages/engine-core/test/l2/pk/onset-chain.test.ts`
- Test (RH amendment): create `packages/engine-core/test/l2/pk/organ-decline.test.ts`
- Test: `packages/engine-core/test/l2/pk/units-gamma.test.ts` (unchanged — the gamma functions keep their contract)

**Interfaces:**
- Consumes: each `{ kind: 'gamma', tpS, t10S }` row (`l2/pk/row.ts`), unchanged.
- Produces: `onsetChain(tpS, t10S) → { ke, ka, peak }` (cached), `chainShape(dtS, chain)`, `ONSET_N_MIN = 1`, and
  `gammaConc(doses, t, tpS, n, t10S?)` — with `t10S` given and `n < ONSET_N_MIN`, the chain replaces the gamma.

**Why (with the audit's numbers):** `gamma.ts`'s `E(t) = (t/tp)^n·e^{n(1−t/tp)}` solves `n` from `t10/tp`; for the 19
rows with `t10/tp ≥ 8`, `n` falls to 0.03–0.47 and the curve is flat-topped from `t = 0` — naloxone and flumazenil act in
5 s (DI-71, DI-72), ketamine causes unconsciousness in 5 s (DI-69), midazolam reaches 87 % of its peak at 30 s (DI-88),
atropine peaks at 30 s (DI-63). D1 explains why the chain (zero initial slope) replaces the audit's proposed Bateman
pair (non-zero initial slope). Per-drug onset sources, which the rows already carry and the chain now honours:
naloxone/flumazenil 1–2 min (labels), midazolam T½ke0 2–3 min and peak 3–5 min (M10 ch. 21 p. 532), ketamine 30–60 s
(R03 §8.6), thiopental 30 s (M10 Table 21.1), etomidate 30–60 s (M10 p. 541), atropine < 1 min (T6.2),
glycopyrrolate 2–3 min (T6.2), ephedrine ≈ 1 min with peak 4–5 min (label), neostigmine 1–3 min with peak ≈ 10 min
(label), amiodarone/salbutamol/insulin/dextrose/furosemide/hydralazine/labetalol/metoprolol/morphine/dexmedetomidine/
dantrolene/lipid/TXA/ondansetron/dexamethasone as their rows state. Adenosine (n 7.5) keeps the gamma.

**Prototype numbers:** the table in "Prototype results → Addendum 19". Every row's `t10` is reproduced within 1 s and
`E(tp) = 1.000`; `test/l2/pk` 17 files / 79 tests pass unchanged.

- [x] **Step 1 — the chain.** In `packages/engine-core/src/l2/pk/gamma.ts`, find:

```ts
export function gammaConc(doses: readonly GammaDose[], t: number, tpS: number, n: number): number {
  let c = 0;
  for (const d of doses) c += d.scale * gammaShape(t - d.t, tpS, n);
  return c;
}
```

Replace with:

```ts
export function gammaConc(doses: readonly GammaDose[], t: number, tpS: number, n: number, t10S?: number): number {
  let c = 0;
  // FU-7 (R51 addendum 19): a shape with n < 1 rises with an infinite slope (a step onset); such rows use the
  // zero-slope transit chain fitted to the SAME peak time and 10 % time. n ≥ 1 rows keep the gamma (slope 0 at t = 0).
  const chain = t10S !== undefined && n < ONSET_N_MIN ? onsetChain(tpS, t10S) : null;
  for (const d of doses) c += d.scale * (chain ? chainShape(t - d.t, chain) : gammaShape(t - d.t, tpS, n));
  return c;
}

/** Below this gamma exponent the curve's initial slope is infinite (step onset): the transit chain replaces it. */
export const ONSET_N_MIN = 1;

/**
 * FU-7 (R51 addendum 19) zero-slope onset: a dose passes two equal transit compartments (rate ka: injection, mixing,
 * arm–brain circulation) into the effect compartment, which empties at ke (redistribution/elimination):
 *   C(t) ∝ e^{−ke·t} − e^{−ka·t}·(1 + (ka − ke)·t)      (Laplace ka²/((s + ka)²(s + ke)), up to a constant)
 * C(0) = 0 and C′(0) = 0 (no step onset); the tail is mono-exponential. With τ = ke·t and r = ka/ke the shape
 * depends on r only, so r is solved from t10/tp by bisection and ke = τpeak(r)/tp. Normalised to 1 at t = tp.
 */
export interface OnsetChain { ke: number; ka: number; peak: number }

const shapeTau = (tau: number, r: number): number => Math.exp(-tau) - Math.exp(-r * tau) * (1 + (r - 1) * tau);
function tauPeak(r: number): number {
  // dC/dτ = 0: −e^{−τ} + r·e^{−rτ}(1 + (r − 1)τ) − (r − 1)e^{−rτ} = 0 → bisection on (0, 60]
  const g = (x: number) => -Math.exp(-x) + Math.exp(-r * x) * (r * (1 + (r - 1) * x) - (r - 1));
  let lo = 1e-9;
  let hi = 60;
  for (let i = 0; i < 200; i++) {
    const mid = 0.5 * (lo + hi);
    if (g(mid) > 0) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}
function tau10(r: number, tp: number): number {
  const pk = shapeTau(tp, r);
  let lo = tp;
  let hi = tp + 60;
  for (let i = 0; i < 200; i++) {
    const mid = 0.5 * (lo + hi);
    if (shapeTau(mid, r) > 0.1 * pk) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}
const CHAINS = new Map<string, OnsetChain>();
export function onsetChain(tpS: number, t10S: number): OnsetChain {
  const key = `${tpS}|${t10S}`;
  const hit = CHAINS.get(key);
  if (hit) return hit;
  const want = t10S / tpS;
  let lo = 1.001;
  let hi = 1e5;
  for (let i = 0; i < 200; i++) {
    const r = Math.sqrt(lo * hi);
    const tp = tauPeak(r);
    if (tau10(r, tp) / tp < want) lo = r;
    else hi = r;
  }
  const r = Math.sqrt(lo * hi);
  const tp = tauPeak(r);
  const ke = tp / tpS;
  const out = { ke, ka: r * ke, peak: shapeTau(tp, r) };
  CHAINS.set(key, out);
  return out;
}
export function chainShape(dtS: number, c: OnsetChain): number {
  if (dtS <= 0) return 0;
  return shapeTau(c.ke * dtS, c.ka / c.ke) / c.peak;
}
```

- [x] **Step 2 — the one call site.** In `packages/engine-core/src/l2/pk/pipeline.ts`, find:

```ts
      const c = gammaConc(d.doses, t, row.pk.tpS, gammaN(row.pk.tpS, row.pk.t10S)) + d.infC;
```

Replace with:

```ts
      const c = gammaConc(d.doses, t, row.pk.tpS, gammaN(row.pk.tpS, row.pk.t10S), row.pk.t10S) + d.infC; // FU-7 (addendum 19): zero-slope onset
```

(The infusion branch is untouched: `d.infC` already relaxes with `tauOnS`/`tauOffS`, which has zero slope by
construction. The pruning window in `stepOnce` still uses the gamma `n`; it is a bound on when a dose is discarded —
the chain's tail is shorter than that bound for every row, verified in Step 3's last case.)

- [x] **Step 2b — three row data corrections (review F7; Orchestrator ruling (FU-7 review) 6; D19(b), D20).** The chain
honours each row's `tpS`/`t10S` exactly, so a row whose datum was an ONSET time (not the effect peak) or a DURATION (not
the 10 % time) must get its better-sourced datum (R45 permits a better-sourced datum; no band changes). In
`packages/engine-core/src/l2/pk/data/rows-cardiovascular.ts` (atropine), find:

```ts
  { id: 'atropine', name: 'Atropine', cls: 'anticholinergic', amountUnit: 'mg', pk: gammaPk(0.5, false, 60, 5400),
```

Replace with:

```ts
  // FU-7 (review F7, ruling 6): tpS is the PEAK time — IV atropine's peak chronotropic effect is at 2–4 min (label);
  // the 60 s it carried was the ONSET ("< 1 min", T6.2), which the zero-slope chain would have turned into the peak.
  { id: 'atropine', name: 'Atropine', cls: 'anticholinergic', amountUnit: 'mg', pk: gammaPk(0.5, false, 150, 5400),
```

In `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts` (midazolam), find:

```ts
    id: 'midazolam', name: 'Midazolam', cls: 'benzodiazepine', amountUnit: 'mg', pk: gammaPk(0.05, true, 180, 3600, 0.001, 600, 1800),
```

Replace with:

```ts
    // FU-7 (review F7, ruling 6): tpS 240 s — peak effect 3–5 min, t½ke0 2–3 min (M10 ch. 21 p. 532); 180 s sat at the
    // fast edge and put the depth nadir 5 s before the 2–7 min band.
    id: 'midazolam', name: 'Midazolam', cls: 'benzodiazepine', amountUnit: 'mg', pk: gammaPk(0.05, true, 240, 3600, 0.001, 600, 1800),
```

and ketamine, find:

```ts
    id: 'ketamine', name: 'Ketamine', cls: 'ketamine', amountUnit: 'mg', pk: gammaPk(1.5, true, 60, 900, 0.01, 300, 900),
```

Replace with:

```ts
    // FU-7 (D20; the first fixer's finding): t10S 2700 s — the effect falls by REDISTRIBUTION (distribution t½ 11–16 min,
    // M10 ch. 21 Table 21.1; emergence 10–20 min after 1–2 mg/kg), so 10 % of the peak is ≈ 3.3 × 13.5 min after it.
    // The 900 s it carried was the row's 10–15 min DURATION read as a 10 % time. tpS stays the sourced 1-min peak.
    id: 'ketamine', name: 'Ketamine', cls: 'ketamine', amountUnit: 'mg', pk: gammaPk(1.5, true, 60, 2700, 0.01, 300, 900),
```

- [x] **Step 2c — the gamma rows follow liver and kidney function (RH amendment; research/13 H9 and RH-10a/c).**
research/13 RH-12d: in `hepaticFailure` 0.8, midazolam's level at 60 min is **×1.00** of health. `clFactor` is applied
only to compartment rows (`stepOnce`'s `else if (d.x.length)` branch), so hepatic failure, low hepatic flow, renal
failure and hypothermia leave every gamma row unchanged — although most of them already carry an `elim` split. The fix
reuses the chain Step 1 builds. Its tail decays at `ke`, and that decline is mostly REDISTRIBUTION for a single dose
(midazolam's effect falls to 10 % by 60 min; its t½β is 1.7–2.6 h). Only the ELIMINATION share should slow when
clearance falls:
- φ = min(1, (ln 2 / t½β) / ke) is the clearance-governed share of the decline;
- the decline rate becomes g = 1 − φ·(1 − f), where f = `clFactor` (liver function or flow, kidney, temperature,
  exactly as the compartment rows use it);
- each dose past its peak ages at rate g. Its time is moved forward by dt·(1 − g); before the peak nothing changes,
  because onset is distribution.

A row without `elim.t12S` keeps its curve bit-for-bit. So does a row with n ≥ 1 (adenosine), and so does every row in
a neutral context (g is exactly 1). The value is one sourced number per row, the terminal half-life. No new
mechanism: the dose list, the chain and `clFactor` already exist.

Rows given `t12S` are the gamma rows whose clearance is hepatic or renal and whose effect is a plasma-driven effect
curve:

| row | `elim` (unchanged unless noted) | t½β | source | φ (chain ke) |
|---|---|---|---|---|
| midazolam | hepatic 1 | 7,740 s (1.7–2.6 h) | M10 ch. 21 Table 21.1; cirrhosis halves CL (MacGilchrist 1986 Gut 27:190) | 0.129 |
| ketamine | hepatic 0.9 | 9,540 s (2.5–2.8 h) | M10 ch. 21 Table 21.1 | 0.083 |
| etomidate | hepatic 0.8 | 14,760 s (2.9–5.3 h) | M10 ch. 21 Table 21.1 | 0.008 |
| thiopental | hepatic 1 | 43,200 s (7–17 h) | M10 ch. 21 Table 21.1 (the row's own `onset` text) | 0.006 |
| dexmedetomidine | hepatic 1 | 9,000 s (2–3 h) | M10 ch. 21 Table 21.1 (the row's own `onset` text) | 0.201 |
| morphine | hepatic 0.9, renal 0.1 | 9,000 s (1.7–3.3 h) | M10 ch. 22 Table 22.6 [VERIFY range] | 0.431 |
| neostigmine | renal 0.5 | 4,620 s (77 min; 181 in renal failure) | Cronnelly 1979 Anesthesiology 51:222; M10 ch. 24 | 0.181 |
| glycopyrrolate | **renal 0.8 (new)** | 2,880 s (≈ 0.8 h) | ≈ 80 % excreted unchanged; prolonged in uraemia (Kirvelä 1993 BJA 71:437) [VERIFY] | 1.000 |

Rows deliberately left without `t12S`:
- **furosemide.** Its effect site is the tubular lumen, reached by secretion, and renal failure lowers its effect
  rather than prolonging it. Its time course is Step 2e's.
- **atropine, ephedrine, hydralazine, labetalol, metoprolol, amiodarone, salbutamol, insulin, dextrose, dantrolene,
  naloxone, flumazenil, lipid, TXA, ondansetron, dexamethasone.** None has an `elim` split today and no audit cell
  measures them in organ failure. Adding one is a one-line row change with its source (calibration queue, Task 20
  Step 6).
- **the compartment rows** (propofol, fentanyl, remifentanil, sufentanil, the NMBs). They already use `clFactor`.

Two limits are recorded in the gate note. First, a gamma INFUSION's steady state does not rise as 1/f: `infC` relaxes
toward a target that ignores clearance. That is a known v1 limit, listed for the calibration queue and not built.
Second, CKD's "renal drug clearance ×0.3" (tables §1.5 `ckd`) reaches these rows through `PkCtx.renal` (= 7d's
`gfrRel`) as soon as a `ckd` profile sets it. The profile itself is FU-8 Part B / Ali's (research/19 C10). Today's
`aki` 1 proxy keeps `gfrRel` at 0.61 (research/13 H6, RH-10a).

In `packages/engine-core/src/l2/pk/row.ts`, find:

```ts
  elim?: { hepatic?: number; highExtraction?: boolean; renal?: number };
```

Replace with:

```ts
  elim?: { hepatic?: number; highExtraction?: boolean; renal?: number;
    /** FU-7 (research/13 H9), gamma rows only: the TERMINAL elimination half-life, s. The share of the effect curve's
     * decline that clearance governs is min(1, (ln 2 / t12S) / chain ke); the rest is redistribution, which organ
     * function does not change. Absent = the decline is organ-independent (the row keeps its curve). */
    t12S?: number };
```

In `packages/engine-core/src/l2/pk/pipeline.ts`, the import — find:

```ts
import { gammaConc, gammaN, type GammaDose } from './gamma.ts';
```

Replace with:

```ts
import { gammaConc, gammaN, onsetChain, ONSET_N_MIN, type GammaDose } from './gamma.ts';
```

the decline rate (module level, before FU-4's `distFactor` doc comment) — find:

```ts
/** FU-4 G10: cardiac output ÷ the patient's own resting output (the circulation's stabilised reference; else 0.075
```

Replace with:

```ts
/** FU-7 (research/13 H9): the decline-rate multiplier of a gamma row, 1 − φ·(1 − f), φ = min(1, (ln 2/t½β)/ke) — the
 * clearance-governed share of the chain's decline (ke, Task 2); f = clFactor. 1 without `elim.t12S` or a chain. */
export function gammaDeclineRate(row: DrugRow, f: number): number {
  const t12 = row.elim?.t12S;
  if (row.pk.kind !== 'gamma' || !t12 || f === 1 || gammaN(row.pk.tpS, row.pk.t10S) >= ONSET_N_MIN) return 1;
  const phi = Math.min(1, Math.LN2 / t12 / onsetChain(row.pk.tpS, row.pk.t10S).ke);
  return 1 - phi * (1 - f);
}

/** FU-4 G10: cardiac output ÷ the patient's own resting output (the circulation's stabilised reference; else 0.075
```

and the gamma branch of `stepOnce` — find:

```ts
      d.doses = d.doses.filter((x) => t - x.t < tpS * (4 + 12 / Math.sqrt(n))); // pruned when < 1e-4 of peak [ENG bound]
```

Replace with:

```ts
      d.doses = d.doses.filter((x) => t - x.t < tpS * (4 + 12 / Math.sqrt(n))); // pruned when < 1e-4 of peak [ENG bound]
      // FU-7 (research/13 H9): organ function slows the ELIMINATION share of the decline — each dose past its peak ages at
      // rate g (dose time moved forward by dt·(1 − g)); before the peak nothing changes (onset is distribution).
      d.factor = clFactor(row, ctx);
      const g = gammaDeclineRate(row, d.factor);
      if (g !== 1) for (const x of d.doses) if (t - x.t > tpS) x.t += PK_DT_S * (1 - g);
```

(`d.factor` on a gamma row is read by nothing but the panel/cell probes. `params()` runs for compartment rows only.
Setting it makes research/13's `f_<id>` column honest: `fHf` 1 → 0.38 for midazolam.)

The rows. In `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts`, find (ketamine):

```ts
    elim: { hepatic: 0.9 },
```

Replace with:

```ts
    elim: { hepatic: 0.9, t12S: 9540 }, // FU-7 (H9): t½β 2.5–2.8 h (M10 ch. 21 Table 21.1)
```

find (etomidate):

```ts
    elim: { hepatic: 0.8 },
```

Replace with:

```ts
    elim: { hepatic: 0.8, t12S: 14760 }, // FU-7 (H9): t½β 2.9–5.3 h (M10 ch. 21 Table 21.1)
```

find (thiopental):

```ts
    elim: { hepatic: 1 },
    pd: [{ target: 'svr', emax: -0.4, ec50: 1 }, { target: 'ees', emax: -0.3, ec50: 1 }, { target: 'hr', emax: 0.24, ec50: 1 }, { target: 'v0Frac', emax: 0.16, ec50: 1 }, { target: 'gv', emax: -0.8, ec50: 1 }],
```

Replace with:

```ts
    elim: { hepatic: 1, t12S: 43200 }, // FU-7 (H9): t½β 7–17 h (M10 ch. 21 Table 21.1)
    pd: [{ target: 'svr', emax: -0.4, ec50: 1 }, { target: 'ees', emax: -0.3, ec50: 1 }, { target: 'hr', emax: 0.24, ec50: 1 }, { target: 'v0Frac', emax: 0.16, ec50: 1 }, { target: 'gv', emax: -0.8, ec50: 1 }],
```

find (midazolam):

```ts
    elim: { hepatic: 1 },
    pd: [{ target: 'svr', emax: -0.24, ec50: 1 }, { target: 'v0Frac', emax: 0.06, ec50: 1 }, { target: 'gv', emax: -0.4, ec50: 1 }],
```

Replace with:

```ts
    elim: { hepatic: 1, t12S: 7740 }, // FU-7 (H9): t½β 1.7–2.6 h (M10 ch. 21 Table 21.1); cirrhosis halves CL (MacGilchrist 1986)
    pd: [{ target: 'svr', emax: -0.24, ec50: 1 }, { target: 'v0Frac', emax: 0.06, ec50: 1 }, { target: 'gv', emax: -0.4, ec50: 1 }],
```

find (dexmedetomidine):

```ts
    elim: { hepatic: 1 },
    pd: [{ target: 'hr', emax: -0.3, ec50: 1 }, { target: 'svr', emax: -0.3, ec50: 1 }],
```

Replace with:

```ts
    elim: { hepatic: 1, t12S: 9000 }, // FU-7 (H9): t½β 2–3 h (M10 ch. 21 Table 21.1)
    pd: [{ target: 'hr', emax: -0.3, ec50: 1 }, { target: 'svr', emax: -0.3, ec50: 1 }],
```

find (morphine):

```ts
    elim: { hepatic: 0.9, renal: 0.1 },
```

Replace with:

```ts
    elim: { hepatic: 0.9, renal: 0.1, t12S: 9000 }, // FU-7 (H9): t½β 1.7–3.3 h (M10 ch. 22 Table 22.6) [VERIFY]
```

In `packages/engine-core/src/l2/pk/data/rows-cardiovascular.ts`, find (neostigmine):

```ts
  { id: 'neostigmine', name: 'Neostigmine', cls: 'anticholinesterase', amountUnit: 'mg', pk: gammaPk(0.05, true, 600, 3600), elim: { renal: 0.5 },
```

Replace with:

```ts
  // FU-7 (H9): t½β 77 min, 181 min in renal failure (Cronnelly 1979 Anesthesiology 51:222; M10 ch. 24)
  { id: 'neostigmine', name: 'Neostigmine', cls: 'anticholinesterase', amountUnit: 'mg', pk: gammaPk(0.05, true, 600, 3600), elim: { renal: 0.5, t12S: 4620 },
```

find (glycopyrrolate):

```ts
  { id: 'glycopyrrolate', name: 'Glycopyrrolate', cls: 'anticholinergic', amountUnit: 'mg', pk: gammaPk(0.2, false, 180, 10800),
```

Replace with:

```ts
  // FU-7 (H9): ≈ 80 % excreted unchanged in urine, t½β ≈ 0.8 h, prolonged in uraemia (Kirvelä 1993 BJA 71:437) [VERIFY]
  { id: 'glycopyrrolate', name: 'Glycopyrrolate', cls: 'anticholinergic', amountUnit: 'mg', pk: gammaPk(0.2, false, 180, 10800), elim: { renal: 0.8, t12S: 2880 },
```

**Morphine's active metabolites (RH-10c, DI-38) — NOT MODELLED.** M6G, which accumulates in renal failure, would
need a second PK entity that a dose of ANOTHER drug creates. That is a parent → metabolite source term, and 7g has no
such mechanism: a gamma or compartment row is dosed only by its own events. So no metabolite row is added. Morphine's
`renal: 0.1` share plus `t12S` gives the PARENT's small renal slowing only (g 0.97 at `renal` 0.3). The delayed,
prolonged opioid effect of M6G in CKD 4–5 (M10 ch. 22: avoid morphine or reduce the dose) is not reproduced. The gate
note §10 lists it beside DI-38 (NE) as a mechanism for a later drug-layer stage, and the `morphine` row's `onset` text
is unchanged. **Do not** proxy it by raising `renal` on the parent row: that would slow the parent's own decline,
which is the wrong shape (M6G acts late, after the parent has fallen).

- [x] **Step 2d — fentanyl's distribution follows cardiac output (RH amendment; research/13 RH-15b).** Measured first
(`origin/main` 7954933 with Tasks 1–10 and 18 applied, RH runner read-only): class III vs normovolaemic after fentanyl
2 µg/kg gives Ce **×1.10 at 10 min and ×1.19 at 30 min**. The hepatic flow term works (clearance factor 0.40 vs
0.93), but fentanyl has no `flowDist`, so shock neither shrinks its central volume nor slows its distribution.
Egan 1999 (Anesthesiology 91:156, haemorrhagic shock): fentanyl concentrations roughly double because the central
volume AND the central clearance fall.

**FU-8 A28 does not cover it.** A28 corrects the resting-output REFERENCE for non-70 kg patients (the 70 kg adult is
bit-identical); it adds no drug to FU-4 G10's flow-dependent distribution, which is propofol's alone. The smallest
sourced term is therefore FU-4 G10's existing mechanism on one more row, with no new constant: V1 × (0.5 + 0.5q),
CL2/CL3 × q, and the arm–brain lag. In `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts`, find:

```ts
    id: 'fentanyl', name: 'Fentanyl', cls: 'opioid', amountUnit: 'mcg', pk: { kind: 'model', model: 'shafer', ventKe0: FENTANYL_KE0 },
    elim: { hepatic: 1, highExtraction: true },
```

Replace with:

```ts
    id: 'fentanyl', name: 'Fentanyl', cls: 'opioid', amountUnit: 'mcg', pk: { kind: 'model', model: 'shafer', ventKe0: FENTANYL_KE0 },
    // FU-7 (RH amendment, research/13 RH-15b): FU-4 G10's flow-dependent distribution, as propofol — haemorrhagic shock
    // shrinks fentanyl's central volume and clearance and ≈ doubles its concentrations (Egan 1999 Anesthesiology 91:156).
    elim: { hepatic: 1, highExtraction: true }, flowDist: true,
```

Measured on the same tree:
- **RH-15b** Ce **×1.51 at 10 min, ×1.40 at 30 min** (band 1.3–2.0 ✓), peak ×1.54;
- **RH-12e** (hepatic failure; fentanyl is flow-limited, so no change is expected) stays **×1.00** ✓;
- **healthy GA** fentanyl 2 µg/kg: peak Ce 2.679 → 2.710 ng/mL (+1.2 %), 10 min +0.9 %, 30 min +0.8 %. Under GA the
  output ratio is ≈ 1, so Tasks 4, 6 and 10's fentanyl numbers move by ≤ 1 %. The executor re-measures them anyway
  in their own steps.

Remifentanil and sufentanil are left as they are. Remifentanil's shock PK (Johnson 2001) is esterase-cleared and no
audit cell measures sufentanil. Both are listed for the calibration queue.

- [x] **Step 2e — furosemide's onset and peak, verified against the label (RH amendment; research/13 RH-07a).** The
FDA furosemide injection label (e.g. Hospira NDA 018667, 2016) says:
- the onset of diuresis after IV administration is "within 5 minutes";
- the peak effect occurs within the first half hour;
- the diuretic effect lasts about 2 hours.

The row's `tpS` 900 s (15 min) and `t10S` 7,200 s (2 h) already sit inside the label. The defect was the curve:
n 0.47 rises with an infinite slope. RH-07a measured **onset 30 s** and **peak diuresis at 2.5 min** on main.

With Step 1's chain, on the tree above (40 mg, research/13's rig): **onset 90 s** (label ≤ 5 min ✓; RH's band
120–600 s, from research/12's "5–10 min", is missed by 30 s) and **peak diuresis at 8.5 min** (label ≤ 30 min ✓;
RH's band 15–45 min from Miller's "≈ 30 min" ✗). Diuresis peaks BEFORE the effect site (15 min) because 7d's
natriuretic response saturates and research/13 H1's neurohumoral term (`vNh` 0.73 → 0.49) falls as the diuresis
proceeds.

Sensitivity run: `tpS` 1800 gives onset 120 s and peak 15.5 min, inside both RH bands. **It is not adopted.** The
same curve drives the row's venodilation (`v0Frac`), which is sourced to 5–15 min (Dikshit 1973 NEJM 288:1087), and
the label does not require it. Moving the row to fit a urine curve shaped by 7d would be fitting through another
stage's response.

**No row change.** The time-course remainder and the magnitude (+155 mL in 2 h against ≈ 1 L) are H1's (FU-9
amendment). The gate note §5 carries RH-07a's before and after numbers.

- [x] **Step 3 — the test.** Create `packages/engine-core/test/l2/pk/onset-chain.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { chainShape, gammaN, onsetChain, ONSET_N_MIN } from '../../../src/l2/pk/gamma.ts';
import { DRUGS } from '../../../src/l2/pk/data/drugs.ts';

/** FU-7 (addendum 19): every fallback-curve row rises from ZERO slope and keeps its peak time and 10 % time. */
describe('onset chain (R51 addendum 19)', () => {
  const rows = Object.values(DRUGS).filter((r) => r.pk.kind === 'gamma');
  it('the chain has zero value AND zero slope at t = 0, and peaks at 1 exactly at tp', () => {
    const c = onsetChain(60, 900); // ketamine
    expect(chainShape(0, c)).toBe(0);
    expect(chainShape(0.001, c) / 0.001).toBeLessThan(1e-3); // slope → 0
    expect(chainShape(60, c)).toBeCloseTo(1, 6);
    for (const t of [30, 45, 90]) expect(chainShape(t, c)).toBeLessThan(1);
  });
  it('the three corrected rows carry their sourced PEAK / redistribution data (review F7, D20)', () => {
    expect((DRUGS.atropine!.pk as { tpS: number }).tpS).toBe(150);
    expect((DRUGS.midazolam!.pk as { tpS: number }).tpS).toBe(240);
    expect((DRUGS.ketamine!.pk as { t10S: number }).t10S).toBe(2700);
  });
  it('every row with t10/tp ≥ 8 reproduces its own t10 within 2 s and its peak within 0.1 %', () => {
    for (const r of rows) {
      const { tpS, t10S } = r.pk as { tpS: number; t10S: number };
      if (gammaN(tpS, t10S) >= ONSET_N_MIN) continue;
      const c = onsetChain(tpS, t10S);
      expect(chainShape(tpS, c)).toBeCloseTo(1, 3);
      let t10 = Number.NaN;
      for (let t = tpS; t < 30 * t10S; t += 1) if (chainShape(t, c) <= 0.1) { t10 = t; break; }
      expect(Math.abs(t10 - t10S), `${r.id} t10 ${t10} vs ${t10S}`).toBeLessThanOrEqual(2);
    }
  });
  it('the step onset is gone: no row reaches 60 % of its peak within 0.1·tp (research/14 D2 measured 19 that did)', () => {
    for (const r of rows) {
      const { tpS, t10S } = r.pk as { tpS: number; t10S: number };
      const n = gammaN(tpS, t10S);
      if (n >= ONSET_N_MIN) continue; // adenosine: n 7.5, already zero-slope
      expect(chainShape(0.1 * tpS, onsetChain(tpS, t10S)), r.id).toBeLessThan(0.6);
    }
  });
  it('adenosine keeps the gamma (n ≥ 1, its own 15 s peak and 30 s offset)', () => {
    expect(gammaN(15, 30)).toBeGreaterThan(ONSET_N_MIN);
  });
});
```

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/pk/onset-chain.test.ts test/l2/pk`
Expected: 18 files / 84 tests pass (the five new cases plus the unchanged 79; the second fixer's count).
- [x] **Step 3b — the organ-function test (RH amendment, Step 2c).** Create `packages/engine-core/test/l2/pk/organ-decline.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { onsetChain } from '../../../src/l2/pk/gamma.ts';
import { clFactor, gammaDeclineRate, NEUTRAL_PK_CTX } from '../../../src/l2/pk/pipeline.ts';
import { DRUGS } from '../../../src/l2/pk/data/drugs.ts';
import type { DrugRow } from '../../../src/l2/pk/row.ts';

/** FU-7 (research/13 H9, RH amendment): the fallback-curve rows follow liver and kidney function. */
describe('gamma rows follow organ function (research/13 H9)', () => {
  const row = (id: string) => DRUGS[id] as DrugRow;
  const g = (id: string, ctx = NEUTRAL_PK_CTX) => gammaDeclineRate(row(id), clFactor(row(id), ctx));
  it('a neutral context changes no row: every decline rate is exactly 1', () => {
    for (const r of Object.values(DRUGS) as DrugRow[]) expect(gammaDeclineRate(r, clFactor(r, NEUTRAL_PK_CTX)), r.id).toBe(1);
  });
  it('hepatic failure slows only the ELIMINATION share of midazolam\'s decline (redistribution unchanged)', () => {
    const pk = row('midazolam').pk as { tpS: number; t10S: number };
    const phi = Math.LN2 / 7740 / onsetChain(pk.tpS, pk.t10S).ke;
    expect(phi).toBeGreaterThan(0.1);
    expect(phi).toBeLessThan(0.16);
    const ctx = { ...NEUTRAL_PK_CTX, hepFn: 0.36 }; // hepaticFailure 0.8 (RH-12a: core liver 0.36)
    expect(g('midazolam', ctx)).toBeCloseTo(1 - phi * (1 - 0.36), 9);
  });
  it('renal failure (tables §1.5 ckd: renal drug clearance ×0.3) slows the renally cleared rows only', () => {
    const ckd = { ...NEUTRAL_PK_CTX, renal: 0.3 };
    for (const id of ['neostigmine', 'glycopyrrolate', 'morphine']) expect(g(id, ckd), id).toBeLessThan(1);
    expect(g('glycopyrrolate', ckd)).toBeCloseTo(0.44, 2); // φ 1: 0.8 renal share × 0.3 + 0.2
    for (const id of ['midazolam', 'ketamine', 'dexmedetomidine', 'thiopental', 'etomidate']) expect(g(id, ckd), id).toBe(1);
  });
  it('the redistribution-limited induction agents barely move (thiopental, etomidate: φ < 0.01)', () => {
    const ctx = { ...NEUTRAL_PK_CTX, hepFn: 0.36 };
    for (const id of ['thiopental', 'etomidate']) expect(g(id, ctx), id).toBeGreaterThan(0.99);
  });
  it('furosemide keeps its curve (no t12S: its effect site is the tubular lumen, not plasma)', () => {
    expect(row('furosemide').elim?.t12S).toBeUndefined();
    expect(g('furosemide', { ...NEUTRAL_PK_CTX, renal: 0.3, hepFn: 0.36 })).toBe(1);
  });
});
```

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/pk`.

Expected: the 5 new cases pass. Measured by the RH-amendment fixer on `origin/main` 7954933 with Tasks 1–10 and 18
applied: 5 / 5, with `test/l2/pk` + `test/l2/endo` at 29 files / 155 tests, 154 passed. The one failure is Task 10 Step 5b's
`adapters.test.ts` key list, which was not applied on that tree because of the stale anchor that "Find-block
verification → RH/ET amendment" names.
- [ ] **Step 4 — the engine cells.** `npx -y pnpm@9.15.9 run audit:drugs DI-63 DI-71 DI-72 DI-88 DI-69`.
Expected (first writer, before Step 2b): atropine peak 70 s, glycopyrrolate peak 140 s, naloxone reversal 40 s (band
30–180 → **PL**), flumazenil DI rise 0 → +12 after Task 3, midazolam DI nadir 115 s, ketamine LOC 20 s. **With Step 2b
(measured by the third fixer, "Prototype — second fixer"):** atropine peak **130 s** (10–180 ✓), glycopyrrolate 140 s,
naloxone reversal 40 s, midazolam nadir **190 s** (120–420 ✓ — its `it.fails` is gone); ketamine's LOC stays **20 s**
(the pinned `it.fails` of D20) and its emergence is **715 s** (10–20 min ✓).
Record every number; a cell that leaves its band is reported, never re-banded.
**RH amendment — the research/13 cells Steps 2c–2e own.** Run with the RH runner, read-only, writing to the
scratchpad:

```
cd research/13-audit-scripts
RH_OUT=<scratchpad>/fu-7-task2/rh.json PME_ENGINE=<wt>/packages/engine-core/src/index.ts ./run.sh cli.ts RH-12d RH-12e RH-15a RH-15b RH-07a RH-10a
```

Measured by the RH-amendment fixer on `origin/main` 7954933. "Plan" means Tasks 1–10 and 18 applied, with Task 9–10's
stale anchors hand-re-anchored. "Plan + 2c–2d" is this amendment.

| cell | band [source] | main | plan (Step 1 chain, no 2c/2d) | plan + 2c–2d | verdict |
|---|---|---|---|---|---|
| RH-12d midazolam, hepatic failure, level at 60 min | ×1.3–2.5 [MacGilchrist 1986] | ×1.00 (f 1) | ×1.00 | **×1.17** (×1.04 at 20 min; f 0.38) | TW — reported (below) |
| RH-12e fentanyl, hepatic failure (flow-limited) | ×0.85–1.25 [Haberer 1982] | ×1.00 | ×1.00 | **×1.00** | PL (guard) |
| RH-15a propofol, class III | peak ×1.5–2.0 [Johnson 2003] | ×1.73 | — | **×1.73** | PL (guard) |
| RH-15b fentanyl, class III, 30 min | ×1.3–2.0 [Egan 1999] | ×1.19 | ×1.19 | **×1.40** (10 min ×1.51) | PL |
| RH-07a furosemide 40 mg: onset / peak | 120–600 s / 15–45 min | 30 s / 2.5 min | **90 s / 8.5 min** | 90 s / 8.5 min | TW; label ✓ (Step 2e) |
| RH-10a rocuronium, CKD proxy | ×1.3–1.5 | ×1.14 | — | **×1.14** | TW — H6 + missing `ckd` profile (FU-8 B / Ali) |

**RH-12d is reported, not tuned.** The chain's decline for a 0.05 mg/kg bolus is mostly redistribution: its tail t½
is 16.6 min against t½β 2.15 h. So halving or thirding clearance moves the 60-min EFFECT level only ×1.17.
MacGilchrist's "clearance halved, t½ doubled" is a plasma elimination-phase statement. RH's 60-min band is RH's own
reading of it. φ comes from the sourced t½β and is not an adjustable gain. Reaching 1.3 would mean replacing midazolam's
sourced half-life with a fitted one (R45). Recorded in "Expected `it.fails`" as a cell gap and put to Ali (Q15).
- [ ] **Step 5 — commit.** `feat(7g): zero-slope onset for the fallback effect curve (R51 addendum 19)`, push.

---

### Task 3: 7g publishes the ONE hypnotic-potency output (propofol-equivalent Ce) + the dissociative flag (addendum 20; 7g; PROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/types-pk.ts` (`DrugBus['cns']` + `DRUG_BUS_NEUTRAL`)
- Modify: `packages/engine-core/src/l2/pk/row.ts` (`CnsSpec.dissociative`, `CnsSpec.ventShare`)
- Modify: `packages/engine-core/src/l2/pk/combine.ts` (`PROP_HYP_C50_REF`, the sums, the publication; `uHyp`
  antagonised, review F8; the hoisted age factor, F21)
- Modify: `packages/engine-core/src/l2/pk/pd.ts` (`FENT_VENT_REMI_EQ`, D16)
- Modify: `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts` (ketamine `cns`; thiopental and etomidate `hypC50`;
  etomidate `ventShare` (F9); midazolam `hypC50AgeK` (F5/D19a); the four opioid rows' `macRemiEq`/`ventRemiEq` (D16))
- Test: create `packages/engine-core/test/l2/pk/potency-outputs.test.ts` (Tasks 3 and 4 share it)

**Interfaces:**
- Produces on the bus: `cns.hypPropEq` (µg/mL propofol-equivalent brain Ce), `cns.hypVentPropEq` (its ventilatory twin,
  weighted by `CnsSpec.ventShare`), `cns.dissoc` (0–1), `cns.benzoShare` (0–1, review F2), and the two opioid outputs
  (Task 4). `cns.uHyp` keeps its meaning and consumers (7d, the demo) but is now antagonist-corrected (review F8: a
  behaviour change for 7d under flumazenil, listed in the gate note).
- Consumes: each row's `CnsSpec.hypC50` (already there for propofol, thiopental, etomidate, midazolam) and the age.

**Why:** 7f's `depth()` reads four named agents (`neuro/depth.ts:71`, `:80`), so thiopental 4 mg/kg and etomidate
0.3 mg/kg never produce unconsciousness or apnoea although 7g already sums them in `uHyp` (`combine.ts:88`) — DI-69, P1.
Addendum 20 fixes the contract, not the consumer list: ONE output. D2 explains the propofol-equivalent unit, D3 the
dissociative flag.

**Prototype numbers:** thiopental LOC at **+10 s** and awakening at **360 s** (band 240–900), etomidate LOC **+20 s**
and duration **195 s** (band 150–600), apnoea marks at +14 s and +21 s (both were absent); ketamine index 98 with
`conscious` false (D3). Fitted [ENG]: `hypC50` 1 → **0.55** reference doses for thiopental and etomidate (an induction
dose is ≈ 1.8 × the LOC-equivalent), the ONE number this task fits, with the awakening bands as its target.

- [x] **Step 1 — the bus fields.** In `packages/engine-core/src/types-pk.ts`, find:

```ts
    propCe: number; opioidCeRemiEq: number; macBrain: number; ketamineCe: number; benzoCeMidazEq: number; dexmedCe: number;
```

Replace with:

```ts
    propCe: number; opioidCeRemiEq: number; macBrain: number; ketamineCe: number; benzoCeMidazEq: number; dexmedCe: number;
    /** FU-7 (addendum 20): the ONE hypnotic-potency output — propofol-equivalent brain Ce, µg/mL (every row with hypC50). */
    hypPropEq: number;
    /** FU-7 (addendum 20): the same, weighted by CnsSpec.ventShare — the ventilatory drive's hypnotic input. */
    hypVentPropEq: number;
    /** FU-7 (addendum 20): the ONE opioid-potency output — fentanyl-equivalent Ce, ng/mL, at the brain (MAC-reduction
     * potency, `macRemiEq`) and the ventilatory site (`ventRemiEq`); fentanyl Ce X alone publishes X at both. */
    opioidCeFentEq: number; opioidVentFentEq: number;
    /** FU-7 (addendum 20): share of hypPropEq contributed by DISSOCIATIVE agents (ketamine), 0–1. */
    dissoc: number;
    /** FU-7 (review F2, ruling 2): share of hypVentPropEq contributed by BENZODIAZEPINES, 0–1 — the drive's per-class α. */
    benzoShare: number;
```

and find:

```ts
  cns: { propCe: 0, opioidCeRemiEq: 0, macBrain: 0, ketamineCe: 0, benzoCeMidazEq: 0, dexmedCe: 0, uHyp: 0, uOpioid: 0, uSurface: 0, seizure: false, cmro2Mult: 1, cbfVaso: 1 },
```

Replace with:

```ts
  cns: { propCe: 0, opioidCeRemiEq: 0, macBrain: 0, ketamineCe: 0, benzoCeMidazEq: 0, dexmedCe: 0, hypPropEq: 0, hypVentPropEq: 0, opioidCeFentEq: 0, opioidVentFentEq: 0, benzoShare: 0, dissoc: 0, uHyp: 0, uOpioid: 0, uSurface: 0, seizure: false, cmro2Mult: 1, cbfVaso: 1 },
```

- [x] **Step 2 — the row spec.** In `packages/engine-core/src/l2/pk/row.ts`, find:

```ts
  /** FU-2 item 8, volatiles: CMRO2 × max(0.5, 1 − cmro2PerMac·MAC) (tables §5.1 rows; replaces `cmro2`). */
  cmro2PerMac?: number;
```

Replace with:

```ts
  /** FU-2 item 8, volatiles: CMRO2 × max(0.5, 1 − cmro2PerMac·MAC) (tables §5.1 rows; replaces `cmro2`). */
  cmro2PerMac?: number;
  /** FU-7 (addendum 20): a dissociative hypnotic (ketamine) — counted in `dissoc` for 7f's EEG/BIS rise and airway reflexes. */
  dissociative?: boolean;
  /** FU-7 (addendum 20): ventilatory potency relative to this row's hypnotic potency (1 = same; ketamine ≈ 0.3, T6.3). */
  ventShare?: number;
  /** FU-7 (D16; review F4): an opioid's MAC-reduction potency as remifentanil-equivalents per unit Ce, where it differs
   * from the EEG weight `remiEq` (fentanyl 0.8 = remifentanil 1.2 ≈ fentanyl 1.5 ng/mL, tables §5d). Absent = `remiEq`. */
  macRemiEq?: number;
  /** FU-7 (D16; Orchestrator ruling (FU-7 review) 4): an opioid's VENTILATORY potency as remifentanil-equivalents per
   * unit Ce at its ventilatory site (remifentanil 1.0 pinned; fentanyl 0.55, D-7f-3). Absent = `remiEq`. */
  ventRemiEq?: number;
```

- [x] **Step 3 — the sums and the publication.** In `packages/engine-core/src/l2/pk/combine.ts`, find:

```ts
/** Remifentanil-equivalent Ce that halves MAC ≈ 1.2 ng/mL (tables §5d [VERIFY]) → uOpioid unit. */
const OPIOID_U1 = 1.2;
```

Replace with:

```ts
/** Remifentanil-equivalent Ce that halves MAC ≈ 1.2 ng/mL (tables §5d [VERIFY]) → uOpioid unit. */
const OPIOID_U1 = 1.2;
/** FU-7 (addendum 20): propofol's hypnotic C50 at 35 y, µg/mL (Eleveld BIS 2024; the propofol-equivalent unit). */
export const PROP_HYP_C50_REF = 3.08;
/** FU-7 (addendum 20): remifentanil → fentanyl equivalence for the potency output (tables §5d: remi 1.2 ≈ fentanyl 1.5 ng/mL). */
export const FENT_PER_REMI = 1.25;
```

find:

```ts
  let remiEq = 0;
  let midazEq = 0;
  for (const a of actives) {
```

Replace with:

```ts
  let remiEq = 0;
  let midazEq = 0;
  let hypEq = 0; // FU-7 (addendum 20): propofol-equivalent Ce, µg/mL
  let hypEqDis = 0; // its dissociative share
  let hypVentEq = 0; // FU-7: propofol-equivalent for the ventilatory drive (ventShare-weighted)
  let hypVentBenzo = 0; // FU-7 (review F2): its benzodiazepine share — the drive's per-class α
  let macRemiEq = 0; // FU-7 (D16): remifentanil-equivalent at MAC-reduction potency (the brain fentanyl-equivalent)
  let ventRemiEq = 0; // FU-7 (D16): remifentanil-equivalent at the VENTILATORY site and potency (R51 §2; ruling 4)
  // FU-7 (review F21): the Eleveld age factor is loop-invariant — ONE exponential per combine, not one per agent
  const ageF = Math.exp(-ELEVELD_CE50_AGE_K * (ctx.ageY - 35));
  for (const a of actives) {
```

find:

```ts
    if (hypC50 !== undefined) bus.cns.uHyp += a.c / hypC50;
    if (r.cns?.remiEq) remiEq += c * r.cns.remiEq;
```

Replace with:

```ts
    if (hypC50 !== undefined) {
      // FU-7 (review F8): ONE antagonised hypnotic load — `uHyp` and the equivalent are the same sum in different units,
      // so flumazenil moves the response surface 7d reads exactly as it moves the depth index (it used the raw a.c).
      bus.cns.uHyp += c / hypC50;
      // FU-7 (addendum 20): ONE hypnotic-potency output — the propofol Ce with the same hypnotic effect at this age.
      // `hypC50` already carries the row's OWN age term (`hypC50AgeK`, D19a); ageF is propofol's (Eleveld), so
      // propofol's own equivalent IS its Ce at every age. `c` is antagonist-divided (flumazenil), as for every target.
      const eq = (c / hypC50) * PROP_HYP_C50_REF * ageF;
      hypEq += eq;
      hypVentEq += eq * (r.cns?.ventShare ?? 1);
      if (r.cns?.dissociative) hypEqDis += eq;
      if (r.cls === 'benzodiazepine') hypVentBenzo += eq * (r.cns?.ventShare ?? 1);
    }
    if (r.cns?.remiEq) {
      remiEq += c * r.cns.remiEq;
      macRemiEq += c * (r.cns.macRemiEq ?? r.cns.remiEq); // FU-7 (D16): MAC-reduction potency (fentanyl 0.8)
      // FU-7 (D16; the first fixer's finding): the ventilatory site is antagonist-divided ONCE, here, like `c` — naloxone
      // reverses the ventilatory site too; a row without a separate site falls back to the brain Ce.
      const cv = a.vent !== undefined ? a.vent / competitiveEc50(1, antag.get(r.cls) ?? 0) : c;
      ventRemiEq += cv * (r.cns.ventRemiEq ?? r.cns.remiEq);
    }
```

find:

```ts
  bus.cns.opioidCeRemiEq = remiEq;
```

Replace with:

```ts
  bus.cns.opioidCeRemiEq = remiEq;
  // FU-7 (addendum 20): the two potency outputs 7f's depth and drive read
  bus.cns.hypPropEq = hypEq;
  bus.cns.hypVentPropEq = hypVentEq;
  bus.cns.dissoc = hypEq > 0 ? hypEqDis / hypEq : 0;
  bus.cns.benzoShare = hypVentEq > 0 ? hypVentBenzo / hypVentEq : 0; // FU-7 (review F2)
  // FU-7 (D16): TRUE fentanyl-equivalents, antagonist applied once (7f must not divide again): fentanyl Ce X alone
  // publishes X at the brain (MAC potency: 1.25 × 0.8) and at the ventilatory site (÷ its ventilatory weight 0.55).
  bus.cns.opioidCeFentEq = FENT_PER_REMI * macRemiEq;
  bus.cns.opioidVentFentEq = ventRemiEq / FENT_VENT_REMI_EQ;
```

find:

```ts
import { acidosisFactor, competitiveEc50, hill, responseSurface } from './pd.ts';
```

Replace with:

```ts
import { acidosisFactor, competitiveEc50, ELEVELD_CE50_AGE_K, FENT_VENT_REMI_EQ, hill, responseSurface } from './pd.ts';
```

and in `packages/engine-core/src/l2/pk/pd.ts` (the ONE source of fentanyl's ventilatory weight — 7g's rows, 7g's
`combine` and 7f's `FENT_VENT_POT` all read it), find:

```ts
export const ELEVELD_CE50_AGE_K = 0.00635;
```

Replace with:

```ts
export const ELEVELD_CE50_AGE_K = 0.00635;
/** FU-7 (D16; Orchestrator ruling (FU-7 review) 4): fentanyl's VENTILATORY potency relative to remifentanil — 7f's
 * deviation D-7f-3 (Q54: 0.55×, C50 ≈ 1.7 ng/mL; the tables' EEG-derived 1.6× made 1.5 µg/kg apnoeic). ONE source:
 * the fentanyl row's `ventRemiEq`, `combine`'s fentanyl-equivalent and 7f's `FENT_VENT_POT` all read this. */
export const FENT_VENT_REMI_EQ = 0.55;
```

find:

```ts
export interface Active {
  row: DrugRow;
  c: number; // PD concentration (row units): brain/effect-site Ce, rate-equivalent, or the gamma curve
}
```

Replace with:

```ts
export interface Active {
  row: DrugRow;
  c: number; // PD concentration (row units): brain/effect-site Ce, rate-equivalent, or the gamma curve
  vent?: number; // FU-7 (addendum 20): the row's SEPARATE ventilatory effect site (opioids), row units
}
```

- [x] **Step 4 — the ventilatory site reaches `combine`.** In `packages/engine-core/src/l2/pk/pipeline.ts`, find:

```ts
    pk.lastC[d.id] = c;
    actives.push({ row, c });
```

Replace with:

```ts
    pk.lastC[d.id] = c;
    actives.push({ row, c, ...(sc.vent !== undefined ? { vent: sc.vent } : {}) }); // FU-7 (addendum 20): the ventilatory site
```

- [x] **Step 5 — the rows.** In `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts`, ketamine: find

```ts
    pd: [{ target: 'hr', emax: 0.35, ec50: 1 }, { target: 'svr', emax: 0.4, ec50: 1 }, { target: 'ees', emax: -0.2, ec50: 1 }, { target: 'bronchodilation', emax: 1, ec50: 1 }, { target: 'cbfVaso', emax: 0.4, ec50: 1 }],
```

Replace with:

```ts
    pd: [{ target: 'hr', emax: 0.35, ec50: 1 }, { target: 'svr', emax: 0.4, ec50: 1 }, { target: 'ees', emax: -0.2, ec50: 1 }, { target: 'bronchodilation', emax: 1, ec50: 1 }, { target: 'cbfVaso', emax: 0.4, ec50: 1 }],
    // FU-7 (addendum 20): ketamine joins the ONE hypnotic-potency output. hypC50 0.8 reference doses [ENG]: 1.5 mg/kg
    // (c ≈ 1 at the peak) is an induction dose (M10 ch. 21 p. 536: plasma 0.7–2.2 µg/mL for hypnosis), so the
    // propofol-equivalent Ce at the peak ≈ 3.8 µg/mL. `dissociative` keeps the EEG/BIS behaviour and the airway
    // reflexes (D3); `ventShare` 0.3 = minimal respiratory depression (T6.3).
    cns: { hypC50: 0.8, dissociative: true, ventShare: 0.3 },
```

(Task 9 replaces the `hr`/`svr` entries of this same row with the indirect drive; keep this `pd:` line as written here
until then so each task's diff is independent.)

etomidate: find

```ts
    cns: { hypC50: 1, cmro2: 0.4 },
```

Replace with:

```ts
    // FU-7 (addendum 20): hypC50 0.55 reference doses [ENG], fitted to the awakening time (duration 3–5 min after
    // 0.3 mg/kg, M10 ch. 21 p. 541); at hypC50 1 the prototype woke the patient at 90 s. ventShare 0.7 (review F9)
    // [ENG; fit target: apnoea after 0.3 mg/kg is brief or absent, less than an equipotent thiopental/propofol dose —
    // M10 ch. 21 p. 541]. No hypC50AgeK (D19a): the elderly dose reduction is PHARMACOKINETIC (Arden 1986).
    cns: { hypC50: 0.55, cmro2: 0.4, ventShare: 0.7 },
```

thiopental: find

```ts
    cns: { hypC50: 1, cmro2: 0.55 },
```

Replace with:

```ts
    // FU-7 (addendum 20): hypC50 0.55 reference doses [ENG], fitted to awakening 5–10 min after 4 mg/kg by
    // redistribution (M10 ch. 21 Table 21.1); at hypC50 1 the prototype woke the patient at 140 s. No hypC50AgeK
    // (D19a): the elderly need less thiopental because of a smaller initial distribution volume, with UNCHANGED brain
    // sensitivity (Homer & Stanski 1985); 7f's LOC scale already gives ≈ 0.71 × the dose at 80 y.
    cns: { hypC50: 0.55, cmro2: 0.55 },
```

midazolam, find:

```ts
    cns: { midazEq: 1, hypC50: 4 },
```

Replace with:

```ts
    // FU-7 (D19a; review F5): midazolam's age effect IS pharmacodynamic (increased brain sensitivity; M10 ch. 21: reduce
    // the dose 20–50 % in the elderly). hypC50AgeK 0.008 [ENG; fit target: LOC dose at 80 y ≈ 0.5 × the 35-y dose
    // through 7f's Schnider LOC scale — measured in "Prototype — second fixer"].
    cns: { midazEq: 1, hypC50: 4, hypC50AgeK: 0.008 },
```

the opioids (D16; Orchestrator ruling (FU-7 review) 4) — the import, find:

```ts
import { ELEVELD_CE50_AGE_K } from '../pd.ts';
```

Replace with:

```ts
import { ELEVELD_CE50_AGE_K, FENT_VENT_REMI_EQ } from '../pd.ts';
```

fentanyl, find:

```ts
    cns: { remiEq: 1.6 }, syringePerMl: 50,
```

Replace with:

```ts
    // FU-7 (D16): EEG 1.6 (tables §5d), MAC reduction 0.8 (remifentanil 1.2 ≈ fentanyl 1.5 ng/mL, tables §5d — 7f's
    // `opioidFentEq` scale), ventilation 0.55 (D-7f-3; Bouillon 2003: ventilatory C50 ≈ 1.7 vs remifentanil 0.92)
    cns: { remiEq: 1.6, macRemiEq: 0.8, ventRemiEq: FENT_VENT_REMI_EQ }, syringePerMl: 50,
```

remifentanil, find:

```ts
    cns: { remiEq: 1 }, syringePerMl: 50,
```

Replace with:

```ts
    cns: { remiEq: 1, ventRemiEq: 1 }, syringePerMl: 50, // FU-7 (D16, ruling 4): the ventilatory unit, PINNED at 1.0
```

sufentanil, find:

```ts
    cns: { remiEq: 12 }, syringePerMl: 5,
```

Replace with:

```ts
    // FU-7 (D16): ventilatory weight 5 [ENG; ≈ 9 × fentanyl's 0.55 — sufentanil's analgesic potency ratio to fentanyl,
    // M10 ch. 22; no ventilatory C50 source]. MAC weight = remiEq (7f's pre-FU-7 scale, unchanged).
    cns: { remiEq: 12, ventRemiEq: 5 }, syringePerMl: 5,
```

morphine, find:

```ts
    cns: { remiEq: 1.5 },
```

Replace with:

```ts
    // FU-7 (D16): ventilatory weight 0.8 per 0.1 mg/kg reference dose [ENG; the row is in reference-dose units, fit
    // target: breathing depressed like the equianalgesic ≈ 1–1.5 µg/kg fentanyl (0.55 × ≈ 1.5 ng/mL), M10 ch. 22].
    cns: { remiEq: 1.5, ventRemiEq: 0.8 },
```

- [x] **Step 6 — the test (shared with Task 4).** Create `packages/engine-core/test/l2/pk/potency-outputs.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { combine, FENT_PER_REMI, PROP_HYP_C50_REF, type Active } from '../../../src/l2/pk/combine.ts';
import { DRUGS } from '../../../src/l2/pk/data/drugs.ts';
import { FENT_VENT_REMI_EQ } from '../../../src/l2/pk/pd.ts';

const CTX = { ph: 7.4, betaBlockC: 0, vasoResp: 1, ageY: 40, macBrain: 0 };
const act = (id: string, c: number, vent?: number): Active => ({ row: DRUGS[id]!, c, ...(vent !== undefined ? { vent } : {}) });

/** FU-7 (addendum 20): ONE hypnotic-potency output and ONE opioid-potency output. */
describe('potency outputs (R51 addendum 20)', () => {
  it('propofol Ce 3 µg/mL at 40 y is the unit: hypPropEq ≈ 3, dissoc 0', () => {
    const { bus } = combine([act('propofol', 3)], CTX);
    expect(bus.cns.hypPropEq).toBeCloseTo(3, 6);
    expect(bus.cns.dissoc).toBe(0);
  });
  it('thiopental 4 mg/kg (c 1) and etomidate 0.3 mg/kg (c 1) reach an induction-strength equivalent (hypC50 0.55)', () => {
    for (const id of ['thiopental', 'etomidate']) {
      const { bus } = combine([act(id, 1)], CTX);
      expect(bus.cns.hypPropEq, id).toBeGreaterThan(1.6 * PROP_HYP_C50_REF * 0.9);
    }
  });
  it('ketamine is dissociative: its whole share is flagged, and the ventilatory twin is 0.3 of it', () => {
    const { bus } = combine([act('ketamine', 1)], CTX);
    expect(bus.cns.dissoc).toBeCloseTo(1, 6);
    expect(bus.cns.hypVentPropEq / bus.cns.hypPropEq).toBeCloseTo(0.3, 6);
  });
  it('agents ADD in equivalents: propofol 1.5 + midazolam 0.5 ref = the sum of their own equivalents', () => {
    const a = combine([act('propofol', 1.5)], CTX).bus.cns.hypPropEq;
    const b = combine([act('midazolam', 0.5)], CTX).bus.cns.hypPropEq;
    const both = combine([act('propofol', 1.5), act('midazolam', 0.5)], CTX).bus.cns.hypPropEq;
    expect(both).toBeCloseTo(a + b, 9);
    expect(combine([act('propofol', 1.5), act('midazolam', 0.5)], CTX).bus.cns.dissoc).toBe(0);
  });
  it('the unit property: propofol\'s own equivalent IS its Ce at every age (its C50 carries the same age term)', () => {
    for (const age of [20, 40, 80]) expect(combine([act('propofol', 3)], { ...CTX, ageY: age }).bus.cns.hypPropEq).toBeCloseTo(3, 6);
  });
  it('age sensitivity (review F5, D19a): the elderly lose consciousness on less — midazolam by PD, thiopental by the LOC scale', () => {
    // LOC dose ratio 80 y / 35 y = (locPropofol(80)/locPropofol(35)) / (equivalent per unit c at 80 / at 35) — 7f's
    // `hypnotic` is hypPropEq / locPropofol(age). Targets: midazolam ≈ 0.5 (M10 ch. 21: 20–50 % less), thiopental and
    // etomidate 0.6–0.8 (the PK share, Homer & Stanski 1985 / Arden 1986, reaches the same LOC through the scale).
    const loc = (age: number) => Math.max(600, 2350 - 22 * (age - 25)); // 7f depth.ts locPropofol, ng/mL
    const ratio = (id: string) => {
      const e35 = combine([act(id, 1)], { ...CTX, ageY: 35 }).bus.cns.hypPropEq;
      const e80 = combine([act(id, 1)], { ...CTX, ageY: 80 }).bus.cns.hypPropEq;
      return loc(80) / loc(35) / (e80 / e35);
    };
    expect(ratio('midazolam')).toBeGreaterThan(0.4);
    expect(ratio('midazolam')).toBeLessThan(0.6);
    for (const id of ['thiopental', 'etomidate']) {
      expect(ratio(id), id).toBeGreaterThan(0.6);
      expect(ratio(id), id).toBeLessThan(0.8);
    }
  });
  it('flumazenil divides the benzodiazepine share of the equivalent AND of uHyp by the same ratio (DI-72; review F8)', () => {
    const plain = combine([act('midazolam', 1)], CTX).bus.cns;
    const antag = combine([act('midazolam', 1), act('flumazenil', 2)], CTX).bus.cns;
    expect(antag.hypPropEq).toBeLessThan(0.5 * plain.hypPropEq);
    expect(antag.uHyp / plain.uHyp).toBeCloseTo(antag.hypPropEq / plain.hypPropEq, 9);
    expect(antag.uSurface).toBeLessThan(plain.uSurface);
  });
  it('the benzodiazepine share is published for the ventilatory α (review F2)', () => {
    expect(combine([act('midazolam', 1)], CTX).bus.cns.benzoShare).toBeCloseTo(1, 9);
    expect(combine([act('propofol', 2)], CTX).bus.cns.benzoShare).toBe(0);
    const mix = combine([act('propofol', 1), act('midazolam', 1)], CTX).bus.cns;
    expect(mix.benzoShare).toBeGreaterThan(0);
    expect(mix.benzoShare).toBeLessThan(1);
  });
  it('the opioid outputs are TRUE fentanyl-equivalents at each site (D16): fentanyl X alone → X, brain and vent', () => {
    const f = combine([act('fentanyl', 2, 2)], CTX).bus.cns;
    expect(f.opioidCeFentEq).toBeCloseTo(2, 9); // = 7f's pre-FU-7 opioidFentEq(fentanyl 2): the MAC scale is unchanged
    expect(f.opioidVentFentEq).toBeCloseTo(2, 9);
    const r = combine([act('remifentanil', 4, 1)], CTX).bus.cns;
    expect(r.opioidCeFentEq).toBeCloseTo(FENT_PER_REMI * 4, 9); // 7f's REMI_MAC_POT 1.25
    expect(r.opioidVentFentEq * FENT_VENT_REMI_EQ).toBeCloseTo(1, 9); // remifentanil PINNED at 1.0 (ruling 4)
  });
  it('naloxone is applied ONCE, in 7g, at BOTH sites (the first fixer: the vent site was summed raw)', () => {
    const plain = combine([act('fentanyl', 2, 2)], CTX).bus.cns;
    const nal = combine([act('fentanyl', 2, 2), act('naloxone', 1)], CTX).bus;
    const div = nal.antagonist.opioid;
    expect(div).toBeGreaterThan(1);
    expect(nal.cns.opioidCeFentEq).toBeCloseTo(plain.opioidCeFentEq / div, 9);
    expect(nal.cns.opioidVentFentEq).toBeCloseTo(plain.opioidVentFentEq / div, 9);
  });
});
```

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/pk`
Expected: 19 files pass (the second fixer ran `test/l2/pk` green with these fields and the rewritten cases).
- [x] **Step 7 — commit.** `feat(7g): publish ONE hypnotic-potency output with the dissociative flag (R51 addendum 20)`, push.

---

### Task 4: The ONE opioid-potency output (fentanyl-equivalent, brain and ventilatory sites) (addendum 20; 7g; PROTOTYPED)

**Files:** none beyond Task 3 (the fields, the sums, the rows' `macRemiEq`/`ventRemiEq`, `FENT_VENT_REMI_EQ`, the
`pipeline.ts` push) and Task 5 (the reader). This task is the **verification and the per-agent potency audit** that
makes the output defensible.

**Interfaces:** `cns.opioidCeFentEq` = 1.25 × Σ c·`macRemiEq` (brain, MAC-reduction potency: fentanyl 0.8, remifentanil
1, sufentanil 12, morphine 1.5 — every row but fentanyl at its `remiEq`, which is 7f's pre-FU-7 scale exactly);
`cns.opioidVentFentEq` = Σ c_vent·`ventRemiEq` / 0.55 at each row's `vent` site (remifentanil 1.0 pinned, fentanyl 0.55,
sufentanil 5, morphine 0.8). Both antagonist-corrected once, in 7g. The EEG-weighted `cns.opioidCeRemiEq` is unchanged.

**Why:** 7f's depth already builds `opioidFentEq()` from two named agents (`fentanyl + 1.25·remifentanil`), so
sufentanil and morphine never reduce MAC and never blunt a stimulus; the drive builds its own opioid sum in `bus.ts`
with a DIFFERENT potency (`FENT_VENT_POT` 0.55, D-7f-3/Q54). One published output per SITE removes both problems and
keeps the potencies where they belong.

**Q-FU7-2 DECIDED (Orchestrator ruling (FU-7 review) 4; review F4; D16):** the per-row `ventRemiEq` is added now, with
remifentanil pinned at 1.0 so FU-6's single-agent calibration cannot move; 7f's drive reads `opioidVentFentEq` (Task 5
Step 1 converts it to remifentanil-equivalents, `× FENT_VENT_POT`) and 7f's own sum survives only as the duck-typed
fallback. The first draft's EEG-weighted twin (`1.25 × opioidCeRemiEq` at both sites) is gone — it also doubled
fentanyl's MAC reduction and antinociception (D16), which the second fixer measured in Task 10's fentanyl arm.

- [x] **Step 1 — verify the output against the two consumers.** With Task 3 applied, run
`CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/pk/potency-outputs.test.ts test/l2/neuro/pk-bus-contract.test.ts`
Expected: green (the prototype's `pk-bus-contract` 6 tests passed unchanged).
- [x] **Step 2 — the per-agent potency table for the gate note.** Write `<scratchpad>/fu-7-drug-layer/opioid-potency.ts`
(a scratch script, not committed) that prints, for fentanyl 2 µg/kg, remifentanil 1 µg/kg, sufentanil 0.2 µg/kg and
morphine 0.1 mg/kg at their peaks: `agents[id].brain`, `agents[id].vent`, `cns.opioidCeRemiEq`, `cns.opioidCeFentEq`,
`cns.opioidVentFentEq`, and 7f's `readBus().vent.opioid`. Paste the table into the gate note §3. Expected shape: for
fentanyl alone `opioidCeFentEq` = the fentanyl brain Ce and `opioidVentFentEq` = its vent Ce; `readBus().vent.opioid`
equals `opioidVentFentEq × 0.55` for every row, and equals 7f's pre-FU-7 sum for fentanyl and remifentanil (the rows
that move are sufentanil and morphine: their EEG weights 12 / 1.5 at the brain site are replaced by 5 / 0.8 at the
ventilatory site — D16).
- [x] **Step 3 — commit.** `test(7g): verify the opioid-potency output against both consumers (R51 addendum 20)`, push.

---

### Task 5: 7f's depth reads the two potency outputs — thiopental, etomidate, ketamine and midazolam cause unconsciousness (addendum 20; 7f under E-FU7-1; PROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/l2/neuro/bus.ts` (**E-FU7-1**: read the outputs, duck-typed)
- Modify: `packages/engine-core/src/l2/neuro/depth.ts` (**E-FU7-1**: ONE hypnotic term, the dissociative EEG weight)
- Modify: `packages/engine-core/src/l2/neuro/pipeline.ts` (**E-FU7-1**: pass them into `depth()`)
- Modify: `packages/engine-core/test/helpers/neuro-bus.ts` and `test/l2/neuro/depth-drive.test.ts` (**E-FU7-9**: the
  fixtures publish the outputs — an INPUT-CONTRACT change, no band touched)
- Test: create `packages/engine-core/test/l2/neuro/hypnotic-equivalent.test.ts` (shared with Task 6)

**Interfaces:**
- Consumes: `bus.cns.{hypPropEq, hypVentPropEq, opioidCeFentEq, opioidVentFentEq, dissoc}`.
- Produces: `NeuroInputs.{hypPropEq, hypVentPropEq, opioidFentEq, opioidVentFentEq, dissoc, benzoShare}` (each
  `number | undefined` — a bus without them keeps the pre-FU-7 per-agent sum), `NeuroInputs.vent.opioid` from 7g's
  `opioidVentFentEq` (D16), `DepthInputs.{hypPropEq, opioidFentEqIn, dissoc}`, `depth.ts` exports `KET_EEG_W`,
  `MIDAZ_EQ_PROP`, `KET_EQ_PROP` (derived from the rows, review F10); `bus.ts`'s `FENT_VENT_POT` aliases 7g's
  `FENT_VENT_REMI_EQ`.

**Why / prototype numbers:** DI-69 (P1): thiopental and etomidate never lost consciousness; after this task LOC at
+10 s / +20 s, awakening at 360 s / 195 s (bands 240–900 / 150–600 ✓), apnoea marks at +14 s / +21 s. `depth-drive`'s
ketamine case (index > 93 AND unconscious) passes through D3's EEG weight: index **98**, `conscious` false.

- [x] **Step 1 — the reader.** In `packages/engine-core/src/l2/neuro/bus.ts`, find:

```ts
export interface NeuroInputs {
  /** Brain effect-site Ce, ng/mL(-eq), naloxone applied. `remifentanil` also carries the other opioids (sufentanil, morphine) as remifentanil-equivalents. */
  brain: { propofol: number; remifentanil: number; fentanyl: number; midazolam: number; ketamine: number };
```

Replace with:

```ts
export interface NeuroInputs {
  /** Brain effect-site Ce, ng/mL(-eq), naloxone applied. `remifentanil` also carries the other opioids (sufentanil, morphine) as remifentanil-equivalents. */
  brain: { propofol: number; remifentanil: number; fentanyl: number; midazolam: number; ketamine: number };
  /** FU-7 (addendum 20): 7g's ONE hypnotic-potency output — propofol-equivalent brain Ce, ng/mL. `undefined` = a bus
   * that does not publish it (fixtures, an older snapshot): depth/drive then fall back to the per-agent sum. */
  hypPropEq: number | undefined;
  /** FU-7 (addendum 20): its ventilatory twin (ketamine weighted by `ventShare`), ng/mL propofol-equivalent. */
  hypVentPropEq: number | undefined;
  /** FU-7 (addendum 20): 7g's ONE opioid-potency output — fentanyl-equivalent Ce, ng/mL, brain and ventilatory site
   * (naloxone already applied by 7g — never divided again here; the first fixer's finding). */
  opioidFentEq: number | undefined;
  opioidVentFentEq: number | undefined;
  /** FU-7 (addendum 20): the dissociative share of `hypPropEq` (ketamine), 0–1. */
  dissoc: number | undefined;
  /** FU-7 (review F2, ruling 2): the benzodiazepine share of `hypVentPropEq`, 0–1 — the drive's per-class α. */
  benzoShare: number | undefined;
```

find:

```ts
function nmbSite(bus: DrugBus, site: 'nmj' | 'dia'): Record<NmbAgent, number> {
```

Replace with:

```ts
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function nmbSite(bus: DrugBus, site: 'nmj' | 'dia'): Record<NmbAgent, number> {
```

find:

```ts
  return {
    brain: { propofol, remifentanil: remiB + otherRemiEq, fentanyl: fentB, midazolam, ketamine },
```

Replace with:

```ts
  return {
    brain: { propofol, remifentanil: remiB + otherRemiEq, fentanyl: fentB, midazolam, ketamine },
    // FU-7 (addendum 20): 7g's potency outputs, converted to ng/mL (7g publishes propofol-equivalents in µg/mL).
    // Duck-typed: a partial bus leaves them undefined and the depth/drive fallbacks behave exactly as before FU-7.
    // The opioid outputs are NOT divided by `antag`: 7g's combine already applied naloxone to them (the first fixer
    // found a double correction here — naloxone would have acted twice on MAC reduction and blunting).
    hypPropEq: num(bus.cns.hypPropEq) ? 1000 * bus.cns.hypPropEq : undefined,
    hypVentPropEq: num(bus.cns.hypVentPropEq) ? 1000 * bus.cns.hypVentPropEq : undefined,
    opioidFentEq: num(bus.cns.opioidCeFentEq) ? bus.cns.opioidCeFentEq : undefined,
    opioidVentFentEq: num(bus.cns.opioidVentFentEq) ? bus.cns.opioidVentFentEq : undefined,
    dissoc: num(bus.cns.dissoc) ? bus.cns.dissoc : undefined,
    benzoShare: num(bus.cns.benzoShare) ? bus.cns.benzoShare : undefined,
```

and the drive's opioid input (D16; Orchestrator ruling (FU-7 review) 4 — the drive reads 7g's ONE ventilatory output),
find:

```ts
      opioid: (ag.remifentanil?.vent ?? ag.remifentanil?.brain ?? 0) / antag + (FENT_VENT_POT * (ag.fentanyl?.vent ?? ag.fentanyl?.brain ?? 0)) / antag + otherRemiEq,
```

Replace with:

```ts
      // FU-7 (D16; ruling 4): 7g's ONE ventilatory opioid output (a true fentanyl-equivalent → × FENT_VENT_POT =
      // remifentanil-equivalents, the drive's unit). 7f's own per-agent sum is ONLY the duck-typed fallback.
      opioid: num(bus.cns.opioidVentFentEq)
        ? bus.cns.opioidVentFentEq * FENT_VENT_POT
        : (ag.remifentanil?.vent ?? ag.remifentanil?.brain ?? 0) / antag + (FENT_VENT_POT * (ag.fentanyl?.vent ?? ag.fentanyl?.brain ?? 0)) / antag + otherRemiEq,
```

and the constant becomes an alias of 7g's (one source), find:

```ts
export const FENT_VENT_POT = 0.55;
```

Replace with:

```ts
export const FENT_VENT_POT = FENT_VENT_REMI_EQ; // FU-7 (D16): ONE source — 7g's pd.ts carries the value D-7f-3 set (0.55)
```

and its import, find:

```ts
import type { DrugBus } from '../../types-pk.ts';

export type NmbAgent
```

Replace with:

```ts
import type { DrugBus } from '../../types-pk.ts';
import { FENT_VENT_REMI_EQ } from '../pk/pd.ts'; // FU-7 (D16)

export type NmbAgent
```

- [x] **Step 2 — depth.** In `packages/engine-core/src/l2/neuro/depth.ts`, find:

```ts
export const KET_DI_RISE = 15; // index points at full ketamine effect [ENG: "ketamine ↑ DI (paradox)"]
```

Replace with:

```ts
/** FU-7 (addendum 20), the dissociative flag: a dissociative agent's weight on the processed-EEG index — ketamine's BIS
 * stays 60–90 at anaesthetic doses (Hirota & Lambert 2001; M10 ch. 21), so its share of the hypnotic equivalent counts
 * ×0.1 on the INDEX while counting in full for CONSCIOUSNESS [ENG]. */
export const KET_EEG_W = 0.1;
/** FU-7 (review F10): fallback weights when 7g publishes no equivalent (fixtures, an old snapshot) — DERIVED from the
 * rows (ONE source): propofol-equivalent ng/mL per ng/mL of 7f's per-agent Ce = propofol's C50 (ng/mL) ÷ the row's
 * hypnotic C50 in ng/mL (reference doses × bus.ts's ng per reference dose): midazolam 3080/(4·100) = 7.7, ketamine
 * 3080/(0.8·1500) ≈ 2.57. (The first draft hard-coded 3080/300 and 3080/800 — C50s the rows do not carry.) */
export const MIDAZ_EQ_PROP = (1000 * PROP_HYP_C50_REF) / ((DRUGS.midazolam?.cns?.hypC50 ?? 4) * MIDAZ_NG_PER_REF);
export const KET_EQ_PROP = (1000 * PROP_HYP_C50_REF) / ((DRUGS.ketamine?.cns?.hypC50 ?? 0.8) * KET_NG_PER_REF);
export const KET_DI_RISE = 15; // index points at full ketamine effect [ENG: "ketamine ↑ DI (paradox)"]
```

and the imports, find:

```ts
import { FENT_EEG_POT } from './bus.ts';
```

Replace with:

```ts
import { FENT_EEG_POT, KET_NG_PER_REF, MIDAZ_NG_PER_REF } from './bus.ts';
import { PROP_HYP_C50_REF } from '../pk/combine.ts'; // FU-7 (review F10): the fallback weights derive from 7g's rows
import { DRUGS } from '../pk/data/drugs.ts';
```

find:

```ts
export interface DepthInputs {
  ageY: number;
  ce: { propofol: number; remifentanil: number; fentanyl: number; midazolam: number; ketamine: number }; // brain, ng/mL(-eq)
```

Replace with:

```ts
export interface DepthInputs {
  ageY: number;
  ce: { propofol: number; remifentanil: number; fentanyl: number; midazolam: number; ketamine: number }; // brain, ng/mL(-eq)
  /** FU-7 (addendum 20): 7g's propofol-equivalent hypnotic Ce, ng/mL — every hypnotic (propofol, thiopental, etomidate,
   * midazolam, ketamine) in ONE input; it REPLACES the per-agent propofol/midazolam/ketamine terms of u and `hypnotic`. */
  hypPropEq?: number;
  /** FU-7 (addendum 20): 7g's fentanyl-equivalent opioid Ce, ng/mL (all opioids in one output). */
  opioidFentEqIn?: number;
  /** FU-7 (addendum 20): the dissociative share of `hypPropEq` (ketamine) — the EEG/BIS behaviour and kept airway reflexes. */
  dissoc?: number;
```

find:

```ts
  const fe = opioidFentEq(x.ce);
```

Replace with:

```ts
  const fe = x.opioidFentEqIn ?? opioidFentEq(x.ce); // FU-7 (addendum 20): 7g's ONE opioid-potency output
```

find:

```ts
  const u = x.ce.propofol / ce50Propofol(x.ageY) + volU / MAC_DI50 + (OPIOID_W * opEeg) / REMI_EEG_EC50 + x.ce.midazolam / MIDAZ_DI50 + GLYCO_U * glyco;
```

Replace with:

```ts
  // FU-7 (addendum 20): ONE hypnotic term. `hypPropEq` already carries propofol, thiopental, etomidate, midazolam and
  // ketamine at their own hypnotic C50s (7g), so the separate midazolam term goes with it; the fallback keeps the
  // pre-FU-7 sum for a bus that publishes no equivalent.
  const hyp = x.hypPropEq ?? x.ce.propofol + (MIDAZ_EQ_PROP * x.ce.midazolam + KET_EQ_PROP * x.ce.ketamine);
  // the dissociative share counts ×KET_EEG_W on the index only (D3)
  const dis = x.dissoc ?? 0;
  const hypEeg = hyp * (1 - dis + KET_EEG_W * dis);
  const u = hypEeg / ce50Propofol(x.ageY) + volU / MAC_DI50 + (OPIOID_W * opEeg) / REMI_EEG_EC50 + GLYCO_U * glyco;
```

find:

```ts
  const eKet = x.ce.ketamine / (x.ce.ketamine + KET_C50);
```

Replace with:

```ts
  // FU-7 (addendum 20): the dissociation paradox is the dissociative SHARE of the hypnotic equivalent
  const eKet = x.dissoc !== undefined && x.hypPropEq !== undefined
    ? x.dissoc * (hyp / (hyp + 0.5 * ce50Propofol(x.ageY)))
    : x.ce.ketamine / (x.ce.ketamine + KET_C50);
```

find:

```ts
  const hypnotic = x.ce.propofol / locPropofol(x.ageY) + awakeU / (1 - 0.5 * red) + x.ce.midazolam / 150 + x.ce.ketamine / KET_C50 + GLYCO_U * glyco;
```

Replace with:

```ts
  const hypnotic = hyp / locPropofol(x.ageY) + awakeU / (1 - 0.5 * red) + GLYCO_U * glyco; // FU-7: ONE hypnotic term
```

find:

```ts
  const hypEq = macEff + x.ce.propofol / ce50Propofol(x.ageY) / (1 - red); // MAC-equivalents
```

Replace with:

```ts
  const hypEq = macEff + hyp / ce50Propofol(x.ageY) / (1 - red); // MAC-equivalents (FU-7: the hypnotic equivalent)
```

- [x] **Step 3 — the pipeline passes them.** In `packages/engine-core/src/l2/neuro/pipeline.ts`, find:

```ts
  const d = depth({ ageY: ns.ageY, ce: x.brain, macPotent: x.macPotent / macF, macN2o: x.macN2o / macF, t1: tof.t1, stimulus: ns.stim.level, glyco: env.neuroglycopenia ?? 0 });
```

Replace with:

```ts
  const d = depth({ ageY: ns.ageY, ce: x.brain, macPotent: x.macPotent / macF, macN2o: x.macN2o / macF, t1: tof.t1, stimulus: ns.stim.level, glyco: env.neuroglycopenia ?? 0,
    hypPropEq: x.hypPropEq, opioidFentEqIn: x.opioidFentEq, dissoc: x.dissoc }); // FU-7 (addendum 20)
```

- [x] **Step 4 — the fixtures (E-FU7-9; three tests fail without this, and NO band changes).** Measured in the
prototype before the fixture update: `depth-drive` "ketamine raises the index" (a `DepthInputs` built by hand),
`pipeline` "propofol 3 µg/mL → loss of consciousness" and "publishes the 7e fields …" (a `busFixture` that sets
`cns.propCe` but not the equivalent → the reader published 0 and the fallback could not fire). Both fixtures now
compute what 7g always publishes. In `packages/engine-core/test/helpers/neuro-bus.ts`, find:

```ts
export function busFixture(p: BusPatch = {}): DrugBus {
  const b = structuredClone(DRUG_BUS_NEUTRAL);
  Object.assign(b.cns, p.cns ?? {});
```

Replace with:

```ts
export function busFixture(p: BusPatch = {}): DrugBus {
  const b = structuredClone(DRUG_BUS_NEUTRAL);
  Object.assign(b.cns, p.cns ?? {});
  // FU-7 (addendum 20, E-FU7-9): 7g ALWAYS publishes the HYPNOTIC outputs, so a fixture that sets per-agent
  // concentrations must publish them too, at 7g's own hypnotic C50 ratios (review F10: derived, not typed — midazolam
  // 3.08/4 ≈ 0.77 µg/mL propofol-equivalent per reference dose, ketamine 3.08/0.8 = 3.85) and ketamine's `ventShare`.
  const wM = PROP_HYP_C50_REF / (DRUGS.midazolam?.cns?.hypC50 ?? 4);
  const wK = PROP_HYP_C50_REF / (DRUGS.ketamine?.cns?.hypC50 ?? 0.8);
  if (p.cns?.hypPropEq === undefined) b.cns.hypPropEq = b.cns.propCe + wM * b.cns.benzoCeMidazEq + wK * b.cns.ketamineCe;
  if (p.cns?.hypVentPropEq === undefined) b.cns.hypVentPropEq = b.cns.propCe + wM * b.cns.benzoCeMidazEq + 0.3 * wK * b.cns.ketamineCe;
  if (p.cns?.dissoc === undefined) b.cns.dissoc = b.cns.hypPropEq > 0 ? (wK * b.cns.ketamineCe) / b.cns.hypPropEq : 0;
  if (p.cns?.benzoShare === undefined) b.cns.benzoShare = b.cns.hypVentPropEq > 0 ? (wM * b.cns.benzoCeMidazEq) / b.cns.hypVentPropEq : 0;
  // The OPIOID outputs need per-agent sites and potencies a fixture does not carry (D16), so a fixture that does not
  // set them publishes NONE and 7f's duck-typed per-agent fallback reads its `agents` exactly as before FU-7.
  if (p.cns?.opioidCeFentEq === undefined) Reflect.deleteProperty(b.cns, 'opioidCeFentEq');
  if (p.cns?.opioidVentFentEq === undefined) Reflect.deleteProperty(b.cns, 'opioidVentFentEq');
```

with, at the top of the same file, find:

```ts
import { DRUG_BUS_NEUTRAL, type DrugBus } from '../../src/types-pk.ts';
```

Replace with:

```ts
import { PROP_HYP_C50_REF } from '../../src/l2/pk/combine.ts'; // FU-7 (E-FU7-9)
import { DRUGS } from '../../src/l2/pk/data/drugs.ts';
import { DRUG_BUS_NEUTRAL, type DrugBus } from '../../src/types-pk.ts';
```

In `packages/engine-core/test/l2/neuro/depth-drive.test.ts`, find:

```ts
const di = (ce: Partial<typeof C0>, mac: { potent?: number; n2o?: number } = {}, ageY = 40, t1 = 0, stimulus = 0) =>
  depth({ ageY, ce: { ...C0, ...ce }, macPotent: mac.potent ?? 0, macN2o: mac.n2o ?? 0, t1, stimulus });
```

Replace with:

```ts
// FU-7 (addendum 20, E-FU7-9): the hypnotic POTENCY OUTPUT is 7g's; this helper computes it from the per-agent
// concentrations at the ratios 7g's rows carry (review F10: depth.ts's MIDAZ_EQ_PROP / KET_EQ_PROP are derived from them).
const di = (ce: Partial<typeof C0>, mac: { potent?: number; n2o?: number } = {}, ageY = 40, t1 = 0, stimulus = 0) => {
  const c = { ...C0, ...ce };
  const hypPropEq = c.propofol + MIDAZ_EQ_PROP * c.midazolam + KET_EQ_PROP * c.ketamine;
  return depth({ ageY, ce: c, macPotent: mac.potent ?? 0, macN2o: mac.n2o ?? 0, t1, stimulus,
    hypPropEq, dissoc: hypPropEq > 0 ? (KET_EQ_PROP * c.ketamine) / hypPropEq : 0 });
};
```

and that file's import, find:

```ts
import { depth } from '../../../src/l2/neuro/depth.ts';
```

Replace with:

```ts
import { depth, KET_EQ_PROP, MIDAZ_EQ_PROP } from '../../../src/l2/neuro/depth.ts'; // FU-7 (E-FU7-9)
```

No band, title or expectation in either file changes (R45). Run:
`CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/neuro test/l2/pk test/l2/endo test/l2/circ`
Expected (prototype): **55 files / 272 passed, 1 skipped**.
- [x] **Step 5 — the new test.** Create `packages/engine-core/test/l2/neuro/hypnotic-equivalent.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { depth, KET_EEG_W } from '../../../src/l2/neuro/depth.ts';
import { readBus } from '../../../src/l2/neuro/bus.ts';
import { busFixture } from '../../helpers/neuro-bus.ts';

const C0 = { propofol: 0, remifentanil: 0, fentanyl: 0, midazolam: 0, ketamine: 0 };
const d = (hypPropEq: number, dissoc = 0) => depth({ ageY: 40, ce: C0, macPotent: 0, macN2o: 0, t1: 1, stimulus: 0, hypPropEq, dissoc });

/** FU-7 (addendum 20): the depth index and consciousness come from 7g's ONE hypnotic equivalent. */
describe('hypnotic equivalent (R51 addendum 20)', () => {
  it('an induction-strength equivalent from ANY agent gives unconsciousness (DI-69: thiopental and etomidate never did)', () => {
    expect(d(2500).conscious).toBe(false); // 2.5 µg/mL propofol-equivalent > locPropofol(40) = 2020
    expect(d(1200).conscious).toBe(true);
  });
  it('a dissociative equivalent is unconscious with a HIGH index (D3: BIS 60–90 under ketamine)', () => {
    const k = d(3800, 1);
    expect(k.conscious).toBe(false);
    expect(k.diRaw).toBeGreaterThan(80);
    expect(d(3800, 0).diRaw).toBeLessThan(40); // the same equivalent from a non-dissociative agent
    expect(KET_EEG_W).toBeLessThan(0.2);
  });
  it('the reader is duck-typed: a bus without the outputs falls back to the per-agent sum (no NaN)', () => {
    const b = busFixture({ cns: { propCe: 3 } });
    const x = readBus(b);
    expect(Number.isFinite(x.hypPropEq as number)).toBe(true);
    const bare = { ...b, cns: { ...b.cns } } as unknown as Record<string, unknown>;
    delete (bare.cns as Record<string, unknown>).hypPropEq;
    const y = readBus(bare as never);
    expect(y.hypPropEq).toBeUndefined();
    expect(depth({ ageY: 40, ce: { ...C0, propofol: 3000 }, macPotent: 0, macN2o: 0, t1: 1, stimulus: 0, hypPropEq: y.hypPropEq }).conscious).toBe(false);
  });
});
```

- [x] **Step 6 — the engine cell.** `npx -y pnpm@9.15.9 run audit:drugs DI-69 DI-02 DI-77 DI-72`.
Expected (first writer): thiopental LOC +10 s / awakening 360 s; etomidate +20 s / 195 s; ketamine LOC 20 s; propofol
unchanged (60 / 440 s); DI-02 co-induction −8 DI points (PL); DI-77 MAC reduction 0.61 (PL); DI-72 flumazenil +12.
With Task 2 Step 2b and D16/D19 on main + FU-4 e3eeb56 (third fixer, "Prototype — second fixer"): thiopental +10 s /
360 s, etomidate +20 s / 195 s, ketamine LOC 20 s / emergence 715 s, propofol 55 / 490 s, DI-02 −9, DI-77 **0.63**,
DI-72 +13. **Recorded deviation (D20, pinned):**
ketamine's LOC stays earlier than the audit's ≥ 30 s (the 60 s peak cannot give both LOC ≥ 30 s and emergence in
10–20 min); emergence is asserted in band. Report the numbers; do not re-fit `tpS`.
- [x] **Step 7 — commit.** `feat(7f): depth reads 7g's ONE hypnotic and ONE opioid potency output (R51 addendum 20, E-FU7-1)`, push.

---

### Task 6: The ventilatory drive reads the ONE hypnotic equivalent, and the opioid–hypnotic interaction moves onto a per-class response surface (addendum 20; review F2/F3/F17, rulings 2–3; 7f under E-FU7-1; PROTOTYPED on main + FU-4, FU-6's `hvrDep` line written from FU-6's plan)

**Files:**
- Modify: `packages/engine-core/src/l2/neuro/drive.ts` (**E-FU7-1**, incl. FU-6's `hvrDep` line — ruling 3)
- Modify: `packages/engine-core/src/l2/neuro/pipeline.ts` (**E-FU7-1**: two arguments)
- Test: `packages/engine-core/test/l2/neuro/hypnotic-equivalent.test.ts` (extend)

**Interfaces:** `DriveInputs.hypVentPropEq?` (ng/mL propofol-equivalent at the ventilatory site), `DriveInputs.benzoShare?`
(0–1); `VENT_ALPHA_BENZO` 1.5 and `VENT_ALPHA_HYP` 0.3 exported from `drive.ts` (D4/D15 — `SURFACE_ALPHA`, the EEG
surface's [ENG] constant, is NOT imported); `SYNERGY` is deleted (review F17: its only reader is the line this task
replaces).

**Why / prototype numbers (D4, D15):** `syn = 1 − 0.5·dOp·dHyp` is too weak for Bailey 1990 (DI-03: SpO₂ 93 %, no
apnoea; expected SpO₂ < 90 % in 11/12 and apnoea in 6/12) and thiopental/etomidate/midazolam reach the drive only as named
agents. The first writer's single α 1.5 (pre-FU-6 main) gave SpO₂ nadir **93 → 77 %** and propofol + remifentanil
apnoea **260 → 500 s** — supra-additive for TIVA, against Nieuwenhuijs 2003 (review F2). With the per-class α the
benzodiazepine pair keeps α 1.5 and propofol–opioid gets 0.3: numbers in "Prototype — second fixer". A single agent's
calibration is unchanged by construction (α multiplies the OTHER class's units, so `u_other = 0` leaves each C50
exactly as FU-6/Nieuwenhuijs fitted it).

**NOTE — the ventilatory opioid potency this task consumes is what a future OSA profile would scale (CM amendment
2026-09-29, research/19 finding 10; a note, NOT a step and NOT a change to this task's scope).** The one ventilatory
opioid potency output (`CnsSpec.ventRemiEq` → `opioidVentFentEq`, D16) is the single input a patient-level
opioid-sensitivity factor would multiply: obstructive sleep apnoea is taught as an exaggerated ventilatory depression to
the same opioid dose (research/19 CM-12a proposes the `osa` profile's opioid ventilatory C50 ×0.6; DI-43 is the healthy
cell). There is no `osa` profile in the engine today, so CM-12a is NE and FU-7 adds nothing for it — the missing-profile
family (OSA, CKD, diabetic autonomic neuropathy, cirrhosis) is with Ali as a v1.0-vs-v1.1 decision. What matters here is
that the potency stay ONE named output that a profile factor can scale, rather than being folded into per-row C50s: keep
`ventRemiEq` per row and the summation in `combine.ts` as D16 defines them, so a later profile multiplies one number in
one place. Recorded in the gate note §5 in one line; listed under Requests → profile follow-up.

**IMPORTANT — this task runs on FU-6's `drive.ts`.** FU-6 adds `LOC_*`, `HVR_*`, `DriveInputs.hypnotic`/`stress`,
`NeuroResp.loc`/`pain`/`hvrDep` and rewrites the return literal. The Step 1 blocks are written against pre-FU-6 main
(where they match once) and still match once on FU-6's patch (review §A); Step 1b's block IS FU-6's line (a declared
miss on pre-FU-6 main). On the merged tree the executor:
1. applies Step 1's blocks as written (FU-6 does not edit `dOp`'s line or the `dProp`…`syn` block);
2. applies Step 1b in the SAME pass — FU-6's `hvrDep` reads `dMid`, which Step 1 deletes (TS2304 otherwise; review
   F3). Step 1b removes `(1 − dMid)` and makes the propofol factor read `hypC`; FU-6's volatile, opioid and NMB factors
   and `HVR_PROP_C50 = 3 × PROP_VENT_C50` are unchanged, so propofol's own `hvrDep` is identical (ruling 3, D17);
3. re-anchors Step 2 on `ns.resp = neuroResp({` and ADDS this plan's two arguments to FU-6's call (measured stale on
   FU-6's patch), keeping `hypnotic: d.hypnotic` and `stress: d.stress`;
4. keeps `loc`, `pain`, `hvrDep` and every FU-6 output field; FU-7 adds no NMB term;
5. if FU-6's structure makes this impossible (e.g. `dHyp` or `hvrDep` no longer exists), STOPS and reports.

- [x] **Step 1 — the surface.** In `packages/engine-core/src/l2/neuro/drive.ts` (review F17: the dead `SYNERGY` export
is replaced by the two per-class constants, placed with the other constants — no import is added), find:

```ts
export const SYNERGY = 0.5;
```

Replace with:

```ts
/** FU-7 (addendum 20; review F2 / Orchestrator ruling (FU-7 review) 2): the VENTILATORY response-surface α is PER CLASS.
 * Opioid + benzodiazepine is strongly synergistic for breathing — VENT_ALPHA_BENZO [ENG; fit target Bailey 1990:
 * fentanyl 2 µg/kg + midazolam 0.05 mg/kg → SpO2 < 90 % in 11/12, apnoea in 6/12 (DI-03 nadir 70–89 %)]. Opioid +
 * propofol (and the other non-benzodiazepine hypnotics and the volatiles) is close to ADDITIVE for breathing although
 * the BIS interaction is synergistic — VENT_ALPHA_HYP [ENG, low; Nieuwenhuijs 2003]. pd.ts's SURFACE_ALPHA is the EEG
 * surface's [ENG] constant and is NOT reused here. (Replaces SYNERGY 0.5, whose only reader was the old product term.) */
export const VENT_ALPHA_BENZO = 1.5;
export const VENT_ALPHA_HYP = 0.3;
```

find:

```ts
export interface DriveInputs {
  vent: { opioid: number; propofol: number; midazolam: number; ketamine: number }; // ng/mL(-eq), bus.ts
```

Replace with:

```ts
export interface DriveInputs {
  vent: { opioid: number; propofol: number; midazolam: number; ketamine: number }; // ng/mL(-eq), bus.ts
  /** FU-7 (addendum 20): 7g's propofol-equivalent hypnotic Ce at the VENTILATORY site, ng/mL — every hypnotic in ONE
   * input (thiopental and etomidate depress breathing too); replaces the per-agent propofol/midazolam/ketamine terms. */
  hypVentPropEq?: number;
  /** FU-7 (review F2): the benzodiazepine share of `hypVentPropEq` (7g's `cns.benzoShare`), 0–1 — the per-class α. */
  benzoShare?: number;
```

find:

```ts
const hill = (x: number, h: number) => (x > 0 ? x ** h / (1 + x ** h) : 0);
```

Replace with:

```ts
const hill = (x: number, h: number) => (x > 0 ? x ** h / (1 + x ** h) : 0);
/** FU-7 (addendum 20): the ventilatory hypnotic equivalent, or the pre-FU-7 per-agent sum when 7g does not publish it. */
const hypVent = (x: DriveInputs): number => x.hypVentPropEq ?? x.vent.propofol + (PROP_VENT_C50 / MIDAZ_VENT_C50) * x.vent.midazolam + 0.3 * (PROP_VENT_C50 / 2000) * x.vent.ketamine;
/** FU-7 (review F2): the hypnotic class's α on the opioid–hypnotic surface — VENT_ALPHA_BENZO for the benzodiazepine
 * share of the equivalent, VENT_ALPHA_HYP for the rest (7g's benzoShare; the per-agent share as the fallback). */
const alphaHyp = (x: DriveInputs): number => {
  const h = hypVent(x);
  const share = x.benzoShare ?? (h > 0 ? ((PROP_VENT_C50 / MIDAZ_VENT_C50) * x.vent.midazolam) / h : 0);
  return VENT_ALPHA_HYP + (VENT_ALPHA_BENZO - VENT_ALPHA_HYP) * Math.min(1, Math.max(0, share));
};
```

find:

```ts
  const dOp = hill(x.vent.opioid / REMI_VENT_C50, REMI_VENT_H);
```

Replace with:

```ts
  // FU-7 (addendum 20; review F2): the opioid C50 is divided by 1 + α·(the hypnotic units), each class with its own α
  const dOp = hill(x.vent.opioid / (REMI_VENT_C50 / (1 + alphaHyp(x) * (hypVent(x) / PROP_VENT_C50) + VENT_ALPHA_HYP * (x.macVolatile / VOL_VENT_C50))), REMI_VENT_H);
```

find:

```ts
  const dProp = hill(x.vent.propofol / PROP_VENT_C50, 1.5);
  const dVol = hill(x.macVolatile / VOL_VENT_C50, 2);
  const dMid = hill(x.vent.midazolam / MIDAZ_VENT_C50, 1.5);
  const dKet = (0.3 * x.vent.ketamine) / (x.vent.ketamine + 2000);
  const dHyp = 1 - (1 - dProp) * (1 - dVol) * (1 - dMid) * (1 - dKet);
  const syn = 1 - SYNERGY * dOp * dHyp;
```

Replace with:

```ts
  // FU-7 (addendum 20): ONE hypnotic ventilatory term from 7g's equivalent (ketamine already weighted by `ventShare`,
  // etomidate by its 0.7). Each class's C50 is divided by 1 + α·(the OTHER class's units) — a single agent keeps its
  // own calibration (Nieuwenhuijs 2003: remifentanil 1 ng/mL −28 %, propofol 1 µg/mL −13 %); the benzodiazepine pair is
  // supra-additive (Bailey 1990, α 1.5) and propofol–opioid nearly additive (Nieuwenhuijs 2003, α 0.3) — review F2.
  const hypC = hypVent(x);
  const uO = x.vent.opioid / REMI_VENT_C50;
  const dProp = hill(hypC / (PROP_VENT_C50 / (1 + alphaHyp(x) * uO)), 1.5);
  const dVol = hill(x.macVolatile / (VOL_VENT_C50 / (1 + VENT_ALPHA_HYP * uO)), 2);
  const dHyp = 1 - (1 - dProp) * (1 - dVol);
  const syn = 1; // the surface replaces the old product term (SYNERGY deleted, review F17)
```

- [x] **Step 1b — FU-6's `hvrDep` in the same pass (review F3; Orchestrator ruling (FU-7 review) 3; D17).** This block is
FU-6's line (FU-6 plan Task 10, `drive.ts` Edit 4) — a DECLARED MISS on pre-FU-6 main, applied on the merged tree. Find:

```ts
  const hvrDep = 1 - (1 - HVR_VOL_EMAX * hill(x.macVolatile / HVR_VOL_C50, 1)) * (1 - hill(x.vent.propofol / HVR_PROP_C50, 1.5)) * (1 - dOp) * (1 - dMid) * (1 - hvrNmb);
```

Replace with:

```ts
  // FU-7 (ruling 3): the hypnotic factor reads the ONE ventilatory equivalent (thiopental, etomidate and midazolam depress
  // the hypoxic arm too) and dMid is gone (its share is inside hypC). HVR_PROP_C50 = 3 × PROP_VENT_C50 (FU-6 F3b) and the
  // volatile, opioid and NMB factors are FU-6's, unchanged — propofol's own hvrDep is identical by construction.
  const hvrDep = 1 - (1 - HVR_VOL_EMAX * hill(x.macVolatile / HVR_VOL_C50, 1)) * (1 - hill(hypC / HVR_PROP_C50, 1.5)) * (1 - dOp) * (1 - hvrNmb);
```

Then `grep -n "dMid\|dKet\|SYNERGY" packages/engine-core/src/l2/neuro/drive.ts` must print nothing (Task 0 Step 4's
consumer list).

- [x] **Step 2 — the pipeline passes the equivalent and the benzodiazepine share.** In
`packages/engine-core/src/l2/neuro/pipeline.ts`, find:

```ts
  ns.resp = neuroResp({ vent: x.vent, macVolatile: x.macPotent, diaBlock: di.b, tofr: tof.count === 4 ? tof.ratio : 0, di: d.diRaw, naturalAirway: natural, wasApnoeic });
```

Replace with:

```ts
  ns.resp = neuroResp({ vent: x.vent, hypVentPropEq: x.hypVentPropEq, benzoShare: x.benzoShare, macVolatile: x.macPotent, diaBlock: di.b, tofr: tof.count === 4 ? tof.ratio : 0, di: d.diRaw, naturalAirway: natural, wasApnoeic }); // FU-7 (addendum 20)
```

(On the merged tree this call also carries FU-6's `hypnotic: d.hypnotic` and `stress: d.stress` — keep them.)
- [x] **Step 3 — single-agent calibration is unchanged (the test that protects FU-6's fit).** Add to
`test/l2/neuro/hypnotic-equivalent.test.ts`:

```ts
import { neuroResp, VENT_ALPHA_BENZO, VENT_ALPHA_HYP } from '../../../src/l2/neuro/drive.ts';

const V0 = { opioid: 0, propofol: 0, midazolam: 0, ketamine: 0 };
const vent = (v: Partial<typeof V0>, hypVentPropEq?: number) =>
  neuroResp({ vent: { ...V0, ...v }, ...(hypVentPropEq !== undefined ? { hypVentPropEq } : {}), macVolatile: 0, diaBlock: 0, tofr: 1, di: 93, naturalAirway: false, wasApnoeic: false });

describe('ventilatory response surface (R51 addendum 20, D4)', () => {
  it('a single class keeps its published calibration (the surface shift needs the OTHER class)', () => {
    expect(vent({ opioid: 1 }).veRest).toBeCloseTo(vent({ opioid: 1 }, 0).veRest, 9);
    expect(vent({ opioid: 1 }).veRest).toBeGreaterThan(0.6); // Nieuwenhuijs 2003: remifentanil 1 ng/mL ≈ −28 %
    expect(vent({ opioid: 1 }).veRest).toBeLessThan(0.8);
    expect(vent({}, 1000).veRest).toBeGreaterThan(0.8); // propofol 1 µg/mL ≈ −13 %
  });
  it('the BENZODIAZEPINE pair is supra-additive: it depresses more than the product of the singles (Bailey 1990)', () => {
    const a = vent({ opioid: 1 }).veRest;
    const b = vent({ midazolam: 150 }).veRest; // MIDAZ_VENT_C50: the fallback path's benzodiazepine share is 1
    expect(vent({ opioid: 1, midazolam: 150 }).veRest).toBeLessThan(a * b);
  });
  it('a hypnotic reaching the drive ONLY through the equivalent still depresses it (thiopental, etomidate)', () => {
    expect(vent({}, 2500).totalDep).toBeGreaterThan(vent({}, 0).totalDep + 0.3);
  });
  it('the α is per class (review F2): the SAME equivalent is more synergistic with an opioid as a benzodiazepine than as propofol', () => {
    const pair = (share: number) => neuroResp({ vent: { ...V0, opioid: 1 }, hypVentPropEq: 1000, benzoShare: share, macVolatile: 0, diaBlock: 0, tofr: 1, di: 93, naturalAirway: false, wasApnoeic: false }).veRest;
    expect(pair(1)).toBeLessThan(pair(0) - 0.05); // Bailey (α 1.5) vs Nieuwenhuijs (α 0.3)
    expect(VENT_ALPHA_HYP).toBeLessThan(VENT_ALPHA_BENZO);
    // the benzodiazepine pair is FAR below the product of the singles; the propofol pair only just below it
    // (measured on the applied tree: singles 0.723 / 0.868, product 0.628; propofol pair 0.500, benzodiazepine pair 0.203)
    const prod = vent({ opioid: 1 }).veRest * vent({}, 1000).veRest;
    expect(pair(1)).toBeLessThan(0.5 * prod);
    expect(pair(0)).toBeGreaterThan(0.6 * prod);
  });
});
```

- [x] **Step 4 — the cells.** `npx -y pnpm@9.15.9 run audit:drugs DI-03 DI-01d DI-71 DI-89`.
Expected on the merged tree: DI-03 SpO₂ nadir 70–89 % and (with FU-6's relative threshold + Task 7) apnoea true;
DI-01d apnoea 60–600 s; DI-71 and DI-89 move in Task 7. Record every number in the gate note; the per-class α values
on main + FU-4 (pre-FU-6) are the reference: DI-03 **77 %** (VE −68.4 vs −40.7 / −16.6 %), DI-01d **380 s** (the single
α 1.5 gave 500 s).
- [x] **Step 5 — commit.** `feat(7f): the ventilatory drive on 7g's hypnotic equivalent and the Greco surface (R51 addendum 20)`, push.

---

### Task 7: The apnoea flag has one truth — the chemoreflex's own zero rate (addendum 20; 7f under E-FU7-1; UNPROTOTYPED, needs FU-6)

**Files:**
- Modify: `packages/engine-core/src/l2/neuro/drive.ts` (**E-FU7-1**: `DriveInputs.spontRr?`, the flag)
- Modify: `packages/engine-core/src/l2/neuro/pipeline.ts` (**E-FU7-1**: pass the committed spontaneous rate)
- Test: create `packages/engine-core/test/engine/drug-apnoea.test.ts` (SLOW_B; Task 19 adds its matrix cells)

**Interfaces:** `DriveInputs.spontRr?: number` (the MODELED chemoreflex's committed rate, `resp.spont.rr`; `undefined`
in MANUAL and before Stage 3 has run) → `NeuroResp.apnoea` is `spontRr === 0` when the input is present, and the
drug-derived `veRest` threshold otherwise (MANUAL).

**Why / measured:** DI-89 (P1, WR): the flag and the `apnoea` neuro mark are computed from drug depression alone
(`drive.ts` `veRest < APNOEA_IN`), so on main the flag stays set for **255 s** while spontaneous VE is **8.4 L/min**;
on the FU-7 prototype it is **380 s** (the drive is deeper). research/12 §2.1 calls this an inconsistency: one truth is
required. After FU-6 the MODELED chemoreflex returns `rr = 0` at its own relative threshold, which IS the apnoea.

**UNPROTOTYPED — the R45 procedure applies.** The mechanism below is written out in full; on the merged tree the
executor runs Step 4's bands and, if a band is missed, keeps the test as `it.fails` **with the measured number in the
title** and records it in the gate note. It does not widen a band and does not reintroduce an absolute VE threshold.

- [x] **Step 1 — the input.** In `packages/engine-core/src/l2/neuro/drive.ts` (after the field Task 6 added; a real
block, review F13), find:

```ts
  hypVentPropEq?: number;
```

Replace with:

```ts
  hypVentPropEq?: number;
  /** FU-7 (D7): the MODELED chemoreflex's committed spontaneous rate (`resp.spont.rr`, FU-6's relative threshold puts
   * it at 0 for apnoea). Present in MODELED whatever the ventilator is doing (FU-6 evaluates `spont` for the trigger
   * while ventilated); when present it IS the apnoea truth. */
  spontRr?: number;
```

- [x] **Step 2 — the flag.** In `neuroResp`, find the flag computation (pre-FU-6 text; on the merged tree FU-6 may have
moved the `strength` line — re-anchor on `wasApnoeic`):

```ts
  let apnoea = x.wasApnoeic ? veRest < APNOEA_OUT : veRest < APNOEA_IN;
  if (strength < DIAPH_APNOEA) apnoea = true;
```

Replace with:

```ts
  // FU-7 (D7): ONE truth. In MODELED the chemoreflex decides whether the patient breathes (FU-6's relative threshold
  // puts `resp.spont.rr` at 0), so the flag and the `apnoea` neuro mark read it; the drug-derived hysteresis stays for
  // MANUAL, where there is no chemoreflex. research/14 DI-89: the flag was set for 255 s at VE 8.4 L/min.
  let apnoea = x.spontRr !== undefined ? x.spontRr <= 0 : x.wasApnoeic ? veRest < APNOEA_OUT : veRest < APNOEA_IN;
  if (strength < DIAPH_APNOEA) apnoea = true; // no effective breath whatever the drive (diaphragm block)
```

- [x] **Step 3 — the pipeline reads Stage 3's committed rate.** `stepNeuroTo` runs BEFORE `advanceResp` in the chain
(R51 §7), so the value it reads is the previous pass's committed rate — one pass (≤ 8 ms of sim time at the resp grid)
old, which is the same staleness FU-3's `cbfRel` accepted (E-FU3-10). In `packages/engine-core/src/l2/neuro/pipeline.ts`
(`NeuroEnv`; review F13), find:

```ts
  /** Stage 7e `cascade(th).macF` — MAC requirement × (−5 %/°C below 37; tables §5.3); 1 without 7e (request R-7f-8). */
  macF?: number;
}
```

Replace with:

```ts
  /** Stage 7e `cascade(th).macF` — MAC requirement × (−5 %/°C below 37; tables §5.3); 1 without 7e (request R-7f-8). */
  macF?: number;
  /** FU-7 (D7): `resp.spont.rr` as committed by the previous pass (MODELED only — spontaneous OR ventilated; undefined
   * in MANUAL and before the drive has run once). */
  spontRr?: number;
}
```

and the `neuroResp({ … })` call Task 6 Step 2 edited — find:

```ts
naturalAirway: natural, wasApnoeic }); // FU-7 (addendum 20)
```

Replace with:

```ts
naturalAirway: natural, wasApnoeic, spontRr: env.spontRr }); // FU-7 (addendum 20; D7)
```

In `packages/engine-core/src/engine.ts` the `stepNeuroTo(ps.neuro, …, { … })` context gains ONE line (**E-FU7-7**;
Task 14 Step 2 adds its magnesium/calcium line after this one), find:

```ts
      neuroglycopenia: endo7f?.core?.out?.neuroglycopenia ?? 0, macF: endo7f?.cascade?.macF ?? 1,
```

Replace with:

```ts
      neuroglycopenia: endo7f?.core?.out?.neuroglycopenia ?? 0, macF: endo7f?.cascade?.macF ?? 1,
      // FU-7 (D7; review F11): the chemoreflex's committed rate is the respiratory-effort truth WHATEVER the ventilator is
      // doing — the apnoeic patient is the one being ventilated. MODELED only; `rr < 0` = not yet evaluated.
      spontRr: ps.l1.mode === 'modeled' && (ps.resp.spont?.rr ?? -1) >= 0 ? ps.resp.spont?.rr : undefined,
```

(Review F11: the earlier draft read the rate only while `resp.driver.source === 'spontaneous'`, so a ventilated
MODELED patient kept the drug-derived flag and 7e/7b consumers of the mark saw two definitions depending on the driver.)

- [x] **Step 4 — the tests and their bands.** Create `packages/engine-core/test/engine/drug-apnoea.test.ts` with an
engine rig (adult 40 y, 70 kg, no airway device, spontaneous, FiO₂ as each case states), yielding **once per
sim-minute**, in the SLOW_B group:
  1. **"the apnoea flag never contradicts the breathing (DI-89)"** — propofol 2 mg/kg + remifentanil 1 µg/kg at 300 s,
     FiO₂ 0.5, 20 min: assert that at every sample with `neuro.resp.apnoea === true` the committed `resp.spont.rr` is 0
     and `resp.spont.ve < 0.5`; band: **0 s of flag-while-breathing** (research/12 §2.1 IN; measured 255 s on main).
  2. **"fentanyl 5 µg/kg on room air stops breathing (DI-71)"** — apnoea (VE < 1 L/min) for **≥ 60 s** within 5 min,
     SpO₂ nadir **< 90 %** (M10 ch. 22: an apnoeic opioid dose; measured on main: 0 s, SpO₂ 91).
  3. **"naloxone 0.4 mg restores breathing (DI-71)"** — after apnoea, VE recovers ≥ 40 % within **30–180 s**
     (label 1–2 min; the chain gives 40 s).
  4. **"the Bailey pair (DI-03)"** — fentanyl 2 µg/kg + midazolam 0.05 mg/kg on room air: SpO₂ nadir **70–89 %** on
     seed 7, and — a POPULATION claim, asserted over FU-6's 20-seed set (FU-6 seam item 7c) — apnoea (VE < 1 L/min) in
     **≥ 4 of 20** patients (Bailey 1990: SpO₂ < 90 % in 11/12, apnoea in 6/12); the singles: SpO₂ ≥ 93 %.
  5. **"propofol 2 mg/kg alone is briefly apnoeic (seed 7, u 0.737 — FU-6's modal patient)"** — apnoea **10–90 s**
     (FU-6's own band and seed, FU-6 seam item 7a; assert FU-6's number is unchanged by FU-7's surface — a REGRESSION
     guard on FU-6's fit; with α 0.3 for propofol–opioid it cannot move, since no opioid is given).
  5b. **"etomidate's apnoea is shorter than thiopental's at equipotent doses (review F9)"** — etomidate 0.3 mg/kg vs
     thiopental 4 mg/kg, seed 7: apnoea duration etomidate < thiopental (`ventShare` 0.7 vs 1.0; M10 ch. 21 p. 541).
  6. **"a VENTILATED patient's flag is the chemoreflex's too (review F11)"** — the audit's ventilated rig (ETT + VCV
     12 × 600, FiO₂ 0.5), remifentanil 1 µg/kg at 300 s: at every sample `neuro.resp.apnoea === (resp.spont.rr === 0)`
     (0 s of disagreement), the flag is true while the committed rate is 0, and false again once effort returns (the
     trigger is visible: `resp.spont.rr > 0`). Measured before F11's fix: the ventilated arm kept the drug-derived flag.
- [x] **Step 5 — run and record.**
`CI=1 PME_TEST_SET=slow-b npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/drug-apnoea.test.ts`
Any missed band → `it.fails` with the number in the title + a gate-note row. Expected problem areas, named in advance:
case 2 depends on FU-6's `APNOEA_VE_IN` 0.1 × `ve0` and on fentanyl's ventilatory weight `FENT_VENT_REMI_EQ` 0.55
(D16; 7f's `FENT_VENT_POT` aliases it) — if fentanyl 5 µg/kg still breathes, report the VE and the two constants and
leave the test `it.fails`; do NOT change the weight (it is FU-6-calibrated and D-7f-3's declared deviation).
- [x] **Step 6 — commit.** `fix(7f): the apnoea flag is the chemoreflex's own state (research/14 DI-89, D7)`, push.

---

### Task 8: Chronic β-blockade as receptor occupancy, with β1/β2 selectivity (addendum 21; 7g + 7a under E-FU7-3; PROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/l2/circ/profile.ts` (**E-FU7-3**: `betaOcc`, `betaNonSel`)
- Modify: `packages/engine-core/src/l2/pk/row.ts` (`PdEffect.beta2`)
- Modify: `packages/engine-core/src/l2/pk/combine.ts` (`PdContext.betaOccProfile`/`betaNonSel`, the two occupancies)
- Modify: `packages/engine-core/src/l2/pk/pipeline.ts` (`PkCtx.betaOcc`/`betaNonSel`, the `combine` call)
- Modify: `packages/engine-core/src/engine.ts` (**E-FU7-7**: two lines in `pkCtx`)
- Modify: `packages/engine-core/src/l2/pk/data/rows-cardiovascular.ts` (adrenaline's β2 arm), `data/rows-other.ts`
  (salbutamol)
- Test: create `packages/engine-core/test/l2/pk/beta-occupancy.test.ts`

**Interfaces:** `CircProfile.betaOcc` (0–1) and `CircProfile.betaNonSel` (boolean) → `PkCtx.betaOcc`/`betaNonSel` →
`PdContext.betaOccProfile`/`betaNonSel`; `PdEffect.beta2` marks a β2 effect. The reflex keeps `betaBlock`/`betaBlockC`.

**Why / prototype numbers (D5):** `engine.ts` passed `prof.betaBlockC` (0.5) as the receptor occupancy — a dose ratio of
2, which a 100 µg adrenaline bolus overrides; and that 0.5 is the tables' baroreflex-gain number. Measured after this
task: ephedrine MAP rise healthy **7.8 → 13.4** (band 8–25 ✓ — with Task 9's indirect arm), β-blocked HR rise **3 → 1**
(band 0–8 ✓), dobutamine ratio **0.56 → 0.33** (band 0.2–0.8 ✓), adrenaline pressor excess **3.2 → 2.0** selective and
**3.6** with `betaNonSel`. The two items the occupancy alone does NOT reach are the ephedrine ratio (0.99 vs 0.3–0.7)
and the unopposed-α reflex bradycardia (0 in both arms) — Step 6 and Q1.

- [x] **Step 1 — the profile fields.** In `packages/engine-core/src/l2/circ/profile.ts`, find:

```ts
  betaBlock: number; // 0–1 fraction of the reflex β1 chronotropic gain removed (g_hs)
  betaBlockC: number; // 0–1 fraction of the β contractility gain and β-agonist drug response removed (g_c, betaResp)
```

Replace with:

```ts
  betaBlock: number; // 0–1 fraction of the reflex β1 chronotropic gain removed (g_hs)
  betaBlockC: number; // 0–1 fraction of the β contractility gain and β-agonist drug response removed (g_c, betaResp)
  /** FU-7 (addendum 21): chronic β-blockade as RECEPTOR OCCUPANCY (0–1) — the dose-ratio input of 7g's competitive
   * β-agonist EC50 shift, separate from the reflex gains above (which stay the tables' ×0.4 / ×0.5). */
  betaOcc: number;
  /** FU-7 (addendum 21): non-selective blockade (propranolol-like) occupies β2 too — adrenaline's vasodilator arm. */
  betaNonSel: boolean;
```

find:

```ts
    hrMax: 208 - 0.7 * pr.ageY, hrIntrinsic: 118 - 0.57 * pr.ageY, gVagal: b.gv, gSymp: b.gs, cfr: GRADES.cad.none, betaBlock: 0, betaBlockC: 0,
```

Replace with:

```ts
    hrMax: 208 - 0.7 * pr.ageY, hrIntrinsic: 118 - 0.57 * pr.ageY, gVagal: b.gv, gSymp: b.gs, cfr: GRADES.cad.none, betaBlock: 0, betaBlockC: 0, betaOcc: 0, betaNonSel: false,
```

find:

```ts
      r.betaBlock = 0.8 * s;
      r.betaBlockC = 0.5 * s;
```

Replace with:

```ts
      r.betaBlock = 0.8 * s;
      r.betaBlockC = 0.5 * s;
      // FU-7 (addendum 21): chronic metoprolol/bisoprolol — occupancy 0.85 = a dose ratio of ≈ 6.7 on every β-agonist's
      // EC50, which is tables §1.5's "β-agonist ×0.5" read as COMPETITIVE antagonism instead of a gain scale [ENG, Q1].
      // `betaNonSel` stays false (cardioselective is the common case; the scenario/profile may set it — Q1 asks Ali
      // whether the unopposed-α picture should need propranolol).
      r.betaOcc = 0.85 * s;
```

- [x] **Step 2 — the β2 tag.** In `packages/engine-core/src/l2/pk/row.ts`, find:

```ts
  beta?: boolean; // β-mediated: EC50 shifted by β-blocker occupancy (decision 7)
```

Replace with:

```ts
  beta?: boolean; // β-mediated: EC50 shifted by β-blocker occupancy (decision 7)
  /** FU-7 (addendum 21): a β2 effect — occupied only by NON-SELECTIVE blockade (propranolol), not by a β1-selective drug. */
  beta2?: boolean;
```

- [x] **Step 3 — the two occupancies.** In `packages/engine-core/src/l2/pk/combine.ts`, find:

```ts
export interface PdContext {
  ph: number;
  betaBlockC: number; // chronic β-blockade from the 7a profile (0–1)
```

Replace with:

```ts
export interface PdContext {
  ph: number;
  betaBlockC: number; // chronic β-blockade from the 7a profile (0–1)
  /** FU-7 (addendum 21): the profile's β-receptor OCCUPANCY (`prof.betaOcc`) — the competitive dose-ratio input.
   * Absent (an older caller) falls back to `betaBlockC`, i.e. the pre-FU-7 behaviour. */
  betaOccProfile?: number;
  /** FU-7 (addendum 21): the chronic blockade is non-selective (β2 rows are occupied too). */
  betaNonSel?: boolean;
```

find:

```ts
  const betaOcc = 1 - (1 - (occ.betaBlock as number)) * (1 - ctx.betaBlockC);
```

Replace with:

```ts
  // FU-7 (addendum 21): the DRUG occupancy and the PROFILE's own receptor occupancy combine competitively; β2 rows are
  // occupied by a non-selective chronic blocker (and by every β-blocker DRUG row, which v1 does not tag by selectivity).
  const occProfile = ctx.betaOccProfile ?? ctx.betaBlockC;
  const betaOcc = 1 - (1 - (occ.betaBlock as number)) * (1 - occProfile);
  const betaOcc2 = 1 - (1 - (occ.betaBlock as number)) * (1 - (ctx.betaNonSel ? occProfile : 0));
```

find:

```ts
      const ec50 = e.beta ? competitiveEc50(e.ec50, betaOcc) : e.ec50;
```

Replace with:

```ts
      const ec50 = e.beta ? competitiveEc50(e.ec50, e.beta2 ? betaOcc2 : betaOcc) : e.ec50; // FU-7 (addendum 21)
```

- [x] **Step 4 — the context plumbing.** In `packages/engine-core/src/l2/pk/pipeline.ts`, find:

```ts
  hepFlow: number; hepFn: number; renal: number; betaBlockC: number; vasoResp: number;
```

Replace with:

```ts
  hepFlow: number; hepFn: number; renal: number; betaBlockC: number; vasoResp: number;
  /** FU-7 (addendum 21): the 7a profile's β-receptor occupancy and its selectivity. */
  betaOcc?: number; betaNonSel?: boolean;
```

find:

```ts
export const NEUTRAL_PK_CTX: PkCtx = { coLpm: 5, vaLpm: 4.2, frcL: 2.1, tempC: 37, ph: 7.4, hepFlow: 1, hepFn: 1, renal: 1, betaBlockC: 0, vasoResp: 1, hepFnTemp: false };
```

Replace with:

```ts
export const NEUTRAL_PK_CTX: PkCtx = { coLpm: 5, vaLpm: 4.2, frcL: 2.1, tempC: 37, ph: 7.4, hepFlow: 1, hepFn: 1, renal: 1, betaBlockC: 0, vasoResp: 1, hepFnTemp: false, betaOcc: 0, betaNonSel: false };
```

find:

```ts
  const r = combine(actives, { ph: ctx.ph, betaBlockC: ctx.betaBlockC, vasoResp: ctx.vasoResp, ageY: pk.patient.ageY, macBrain });
```

Replace with:

```ts
  const r = combine(actives, { ph: ctx.ph, betaBlockC: ctx.betaBlockC, betaOccProfile: ctx.betaOcc, betaNonSel: ctx.betaNonSel, vasoResp: ctx.vasoResp, ageY: pk.patient.ageY, macBrain }); // FU-7 (addendum 21)
```

In `packages/engine-core/src/engine.ts` (**E-FU7-7**), find:

```ts
      betaBlockC: circ?.prof.betaBlockC ?? 0,
```

Replace with:

```ts
      betaBlockC: circ?.prof.betaBlockC ?? 0,
      betaOcc: circ?.prof.betaOcc ?? 0, // FU-7 (addendum 21): the profile's own β-receptor occupancy
      betaNonSel: circ?.prof.betaNonSel ?? false,
```

- [x] **Step 5 — the β2 rows.** In `packages/engine-core/src/l2/pk/data/rows-cardiovascular.ts` (adrenaline), find:

```ts
      { target: 'svr', emax: -0.1, ec50: 0.02, beta: true, catecholamine: true }, { target: 'svr', emax: 1.2, ec50: 0.2, catecholamine: true },
```

Replace with:

```ts
      // FU-7 (addendum 21): the β2 VASODILATOR arm is β2-tagged, so only NON-SELECTIVE blockade removes it and the α
      // rise goes unopposed (M10 ch. 14; the anaphylaxis/β-blockade teaching case, DI-05/DI-41)
      { target: 'svr', emax: -0.1, ec50: 0.02, beta: true, beta2: true, catecholamine: true }, { target: 'svr', emax: 1.2, ec50: 0.2, catecholamine: true },
```

In `packages/engine-core/src/l2/pk/data/rows-other.ts` (salbutamol), find:

```ts
    pd: [{ target: 'hr', emax: 0.3, ec50: 1, beta: true, catecholamine: true }, { target: 'bronchodilation', emax: 1, ec50: 0.5 }, { target: 'kShift', emax: -0.8, ec50: 1 }],
```

Replace with:

```ts
    // FU-7 (addendum 21): salbutamol is a β2 agonist — a cardioselective blocker does not blunt it (M10 ch. 14)
    pd: [{ target: 'hr', emax: 0.3, ec50: 1, beta: true, beta2: true, catecholamine: true }, { target: 'bronchodilation', emax: 1, ec50: 0.5 }, { target: 'kShift', emax: -0.8, ec50: 1 }],
```

- [x] **Step 6 — the vagal-limb measurement (the item occupancy does NOT reach).** With Steps 1–5 applied, run
`npx -y pnpm@9.15.9 run audit:drugs DI-05 DI-41` twice: once as shipped (β1-selective) and once with a throwaway probe
that sets `r.betaNonSel = true` in the profile (revert the probe afterwards — it is a measurement, not a change).
Prototype result: pressor excess 2.0 → 3.6 %, `hrMinBB` **0 in both arms**, anaphylaxis ratio 0.93 → 0.95. Then measure
the vagal limb directly with a scratch script: MAP and HR against time after adrenaline 100 µg in the β-blocked profile,
plus `circ.baro.ev`, `circ.baro.es` and the delivered `rrMs` — and, for Q1 (review "Open questions" 1), **ΔCO as well
as ΔMAP** for ephedrine 10 mg in BOTH arms (healthy / β-blocked), so the gate shows which limb the missing ×0.5 pressor
ratio lives in (CO coupling vs vascular). Write the numbers into the gate note and, if the reflex
bradycardia needs a change in `l2/circ/baroreflex.ts` (`SYMP_WITHDRAW_HR` 0.1, `VAGAL_WITHDRAW_MS` 200), **report it to
FU-4 — do not edit the file** (Requests → FU-4 item 2). The DI-05 test of Task 19 stays `it.fails` with the number.
- [x] **Step 7 — the unit test.** Create `packages/engine-core/test/l2/pk/beta-occupancy.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { combine, type Active } from '../../../src/l2/pk/combine.ts';
import { DRUGS } from '../../../src/l2/pk/data/drugs.ts';
import { competitiveEc50 } from '../../../src/l2/pk/pd.ts';

const CTX = { ph: 7.4, betaBlockC: 0.5, vasoResp: 1, ageY: 40, macBrain: 0 };
const act = (id: string, c: number): Active => ({ row: DRUGS[id]!, c });
const svr = (fx: { svr: number }) => fx.svr;

/** FU-7 (addendum 21): chronic β-blockade is receptor occupancy with a selectivity. */
describe('β-receptor occupancy (R51 addendum 21)', () => {
  it('occupancy 0.85 is a dose ratio of ≈ 6.7 on a β-mediated EC50 (the tables\' ×0.5 as competition, D5)', () => {
    expect(competitiveEc50(1, 0.85)).toBeCloseTo(1 + 0.85 / 0.15, 6);
  });
  it('a β1-selective profile blunts dobutamine but NOT salbutamol (β2)', () => {
    const free = combine([act('dobutamine', 10)], { ...CTX, betaOccProfile: 0 }).fx.ees - 1;
    const blocked = combine([act('dobutamine', 10)], { ...CTX, betaOccProfile: 0.85 }).fx.ees - 1;
    expect(blocked).toBeLessThan(0.6 * free);
    const sFree = combine([act('salbutamol', 1)], { ...CTX, betaOccProfile: 0 }).fx.hr - 1;
    const sBlocked = combine([act('salbutamol', 1)], { ...CTX, betaOccProfile: 0.85 }).fx.hr - 1;
    expect(sBlocked).toBeCloseTo(sFree, 6);
  });
  it('non-selective blockade also occupies β2: salbutamol IS blunted and adrenaline\'s dilator arm is removed', () => {
    const sel = combine([act('epinephrine', 0.3)], { ...CTX, betaOccProfile: 0.85, betaNonSel: false }).fx;
    const non = combine([act('epinephrine', 0.3)], { ...CTX, betaOccProfile: 0.85, betaNonSel: true }).fx;
    expect(svr(non)).toBeGreaterThan(svr(sel)); // unopposed α
    const sBlocked = combine([act('salbutamol', 1)], { ...CTX, betaOccProfile: 0.85, betaNonSel: true }).fx.hr - 1;
    const sFree = combine([act('salbutamol', 1)], { ...CTX, betaOccProfile: 0 }).fx.hr - 1;
    expect(sBlocked).toBeLessThan(0.6 * sFree);
  });
  it('an older caller without the field keeps the pre-FU-7 behaviour (betaBlockC as the occupancy)', () => {
    const a = combine([act('dobutamine', 10)], CTX).fx.ees;
    const b = combine([act('dobutamine', 10)], { ...CTX, betaOccProfile: 0.5 }).fx.ees;
    expect(a).toBeCloseTo(b, 9);
  });
});
```

- [x] **Step 8 — commit.** `feat(7g): chronic β-blockade as receptor occupancy with β1/β2 selectivity (R51 addendum 21)`, push.

---

### Task 9: Indirect sympathomimetics act through 7e's central drive; the catecholamine reserve; glucagon (addenda 20–21, audit D4/D9; 7g + 7e under E-FU7-2; PROTOTYPED except Steps 4 and 6)

**Files:**
- Modify: `packages/engine-core/src/l2/pk/row.ts` (`PdTarget` += `'sympDrive'`)
- Modify: `packages/engine-core/src/types-pk.ts` (`cns.sympDrive`)
- Modify: `packages/engine-core/src/l2/pk/combine.ts` (publish it)
- Modify: `packages/engine-core/src/l2/pk/data/rows-cardiovascular.ts` (ephedrine; glucagon row in Step 6)
- Modify: `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts` (ketamine)
- Modify: `packages/engine-core/src/l2/endo/{core,adapters,params,hormones}.ts` (**E-FU7-2**: `sympDrug`, `catReserve`)
- Test: extend `packages/engine-core/test/l2/pk/beta-occupancy.test.ts`; create
  `packages/engine-core/test/l2/endo/cat-reserve.test.ts`

**Interfaces:** `PdTarget 'sympDrive'` → `bus.cns.sympDrive` (0–3) → `EndoInputs.sympDrug` → `extraSymp`;
`EndoCore.out.catReserve` (0–1) scales the drug drive inside 7e.

**Why / prototype numbers (D6):** ephedrine's and ketamine's pressor arms multiplied 7a's HR/SVR directly, so
(a) chronic β-blockade could not reach them (DI-04a ratio 1.12) and (b) ketamine's pressor persisted when catecholamines
were exhausted (DI-21, WR: +1.8 % in cold sepsis). Measured after Steps 1–3: ketamine MAP rise healthy **+1.5 → +8.7 %**
(band 5–25 ✓), cold-phase **+1.8 % → −0.5 %** (sign ✓), class III **+2.3 → −0.1 %** (band −15…+5 ✓), ephedrine rise
**7.8 → 13.4** (band 8–25 ✓), repeat ratio **0.37 → 0.54** (band 0.4–0.95 ✓).
**Re-measured WITH Task 10 (review F1; Orchestrator ruling (FU-7 review) 1) on main + FU-4 b675248 — both columns:**
ephedrine rise 13.8 / 13.8 (with / without Task 10), β-blocked ratio 0.96 / 0.96, DI-57 ratio 0.51 / 0.51, ketamine
healthy +9.1 / +9.1 %, cold phase −0.3 / −0.3 %, class III −0.1 / −0.1 % — identical, because `sympDrive` enters
`extraSymp` and never the nociceptive `h.surge` (the rejected `h.symp` variant gave ephedrine 16.4 and DI-57 0.31 — TS).
Table: "Prototype — Task 10". **Re-measured again with Task 10 under R51 addendum 25 (third fixer, main + FU-4 e3eeb56):**
ephedrine rise **12.8**, β-blocked ratio **0.99**, HR rise 1 / 4, DI-57 **8.0 / 4.0 / 2.1, ratio 0.50**, ketamine healthy
**+8.9 %**, cold phase **−0.4 %**, class III **−0.1 %** — the release is `h.surge`'s too, so the guard arms measure
`surgeCat` 0 for ephedrine and ketamine; the small shifts from the b675248 column are FU-4's later commits. Table:
"Prototype — second fixer".

- [x] **Step 1 — the target and the bus field.** In `packages/engine-core/src/l2/pk/row.ts`, find:

```ts
  | 'betaBlock' | 'avNode' | 'bronchodilation' | 'histamine' | 'hpvInhibit' | 'kShift' | 'glucose' | 'cmro2' | 'cbfVaso' | 'achGain';
```

Replace with:

```ts
  | 'betaBlock' | 'avNode' | 'bronchodilation' | 'histamine' | 'hpvInhibit' | 'kShift' | 'glucose' | 'cmro2' | 'cbfVaso' | 'achGain'
  /** FU-7 (addenda 20–21): an INDIRECT sympathomimetic's central drive (ephedrine, ketamine) — added to 7e's
   * `extraSymp`, so β-blockade blunts its β1 share and catecholamine depletion weakens it, instead of multiplying 7a. */
  | 'sympDrive';
```

In `packages/engine-core/src/types-pk.ts`, find:

```ts
    /** FU-7 (addendum 20): share of hypPropEq contributed by DISSOCIATIVE agents (ketamine), 0–1. */
    dissoc: number;
```

Replace with:

```ts
    /** FU-7 (addendum 20): share of hypPropEq contributed by DISSOCIATIVE agents (ketamine), 0–1. */
    dissoc: number;
    /** FU-7 (addenda 20–21): an indirect sympathomimetic's central drive (ephedrine, ketamine) → 7e's `extraSymp`, 0–3. */
    sympDrive: number;
```

and the neutral literal (the one Task 3 edited; a real block, not prose — review F13), find:

```ts
dissoc: 0, uHyp: 0,
```

Replace with:

```ts
dissoc: 0, sympDrive: 0, uHyp: 0,
```

In `packages/engine-core/src/l2/pk/combine.ts`, find:

```ts
  bus.metabolic.kShift = other.kShift ?? 0;
```

Replace with:

```ts
  bus.cns.sympDrive = Math.max(0, other.sympDrive ?? 0); // FU-7 (addenda 20–21): the indirect sympathomimetic drive
  bus.metabolic.kShift = other.kShift ?? 0;
```

- [x] **Step 2 — the two rows.** In `packages/engine-core/src/l2/pk/data/rows-cardiovascular.ts` (ephedrine), find:

```ts
    pd: [{ target: 'hr', emax: 0.24, ec50: 1, beta: true, catecholamine: true }, { target: 'ees', emax: 0.36, ec50: 1, beta: true, catecholamine: true }, { target: 'svr', emax: 0.24, ec50: 1, catecholamine: true }, { target: 'v0Frac', emax: -0.06, ec50: 1 }],
```

Replace with:

```ts
    // FU-7 (addendum 21): ephedrine is an INDIRECT sympathomimetic — most of its effect is released noradrenaline, so it
    // enters 7e's central sympathetic drive (`sympDrive`), where chronic β-blockade removes the β1 share (7e applies
    // `prof.betaBlock/betaBlockC`) and the α share remains; only its small DIRECT α arm stays on 7a.
    // [ENG sizes; fit target: MAP +10–15 % after 10 mg (T6.2) — prototype 13.4 mmHg — and ×0.3–0.7 under β-blockade (Q1)]
    pd: [{ target: 'sympDrive', emax: 1.6, ec50: 1 }, { target: 'svr', emax: 0.08, ec50: 1, catecholamine: true }, { target: 'v0Frac', emax: -0.06, ec50: 1 }],
```

In `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts` (ketamine — the `pd:` line Task 3 left in place), find:

```ts
    pd: [{ target: 'hr', emax: 0.35, ec50: 1 }, { target: 'svr', emax: 0.4, ec50: 1 }, { target: 'ees', emax: -0.2, ec50: 1 }, { target: 'bronchodilation', emax: 1, ec50: 1 }, { target: 'cbfVaso', emax: 0.4, ec50: 1 }],
```

Replace with:

```ts
    // FU-7 (addendum 20 / audit D9): ketamine's pressor effect is INDIRECT (central sympathetic drive), so it is blunted
    // by β-blockade and disappears when catecholamines are depleted (M10 ch. 21: the direct myocardial depression is then
    // unmasked); the DIRECT Ees −0.2 stays. [ENG size; fit target: MAP +15–25 % replete (T6.3) — prototype +8.7 % —
    // and a FALL in the catecholamine-depleted phase — prototype −0.5 %]
    pd: [{ target: 'sympDrive', emax: 2.2, ec50: 1 }, { target: 'ees', emax: -0.2, ec50: 1 }, { target: 'bronchodilation', emax: 1, ec50: 1 }, { target: 'cbfVaso', emax: 0.4, ec50: 1 }],
```

- [x] **Step 3 — 7e reads it.** In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
export interface EndoInputs {
```

Replace with:

```ts
export interface EndoInputs {
  /** FU-7 (addenda 20–21): 7g's indirect-sympathomimetic drive (`pk.bus.cns.sympDrive`), 0–3; 0 without 7g. */
  sympDrug?: number;
```

find:

```ts
    noxious: x.noxious, antinoc: x.antinoc, extraSymp: cd.extraSymp + hypo + 2 * x.mhActivity,
```

Replace with:

```ts
    noxious: x.noxious, antinoc: x.antinoc, extraSymp: cd.extraSymp + hypo + 2 * x.mhActivity + (x.sympDrug ?? 0) * c.out.catReserve, // FU-7 (addenda 20–21)
```

In `packages/engine-core/src/l2/endo/adapters.ts`, find:

```ts
    epiExoPgMl: (pk?.bus?.agents?.epinephrine?.brain ?? 0) * EPI_EXO_PG_PER_RATE_EQ,
```

Replace with:

```ts
    epiExoPgMl: (pk?.bus?.agents?.epinephrine?.brain ?? 0) * EPI_EXO_PG_PER_RATE_EQ,
    sympDrug: (pk?.bus as { cns?: { sympDrive?: number } } | undefined)?.cns?.sympDrive ?? 0, // FU-7 (addenda 20–21)
```

and the neutral inputs (review F13: a block, not prose), find:

```ts
  epiExoPgMl: 0, bronchoDilExt: 0, dkaSeverity: 0,
```

Replace with:

```ts
  epiExoPgMl: 0, bronchoDilExt: 0, dkaSeverity: 0, sympDrug: 0,
```

- [x] **Step 4 — the catecholamine reserve (UNPROTOTYPED as a band; its code ran in the Task 10 prototype, see
"Prototype — Task 10"; the R45 procedure applies).** 7e gains ONE state: the releasable-noradrenaline store an indirect
agent works through. Every edit is a find/replace block (review F13).
  - `packages/engine-core/src/l2/endo/params.ts`, find:
```ts
export const SYMP_MAX = 3; // clamp
```
Replace with:
```ts
export const SYMP_MAX = 3; // clamp
/** FU-7 (audit D9): the releasable catecholamine store an INDIRECT sympathomimetic (ephedrine, ketamine) works through.
 * It falls while the endogenous sympathetic drive is high (prolonged shock: the "cold" phase, reserpine-like depletion)
 * and refills slowly. τ_down 20 min at symp 3, τ_up 2 h, floor 0.2 [ENG; direction: M10 ch. 21 (ketamine's depression is
 * unmasked when catecholamines are exhausted), Levy 2018 (adrenergic hyporesponsiveness in prolonged septic shock)]. */
export const CAT_RESERVE_TAU_DOWN_S = 1200;
export const CAT_RESERVE_TAU_UP_S = 7200;
export const CAT_RESERVE_FLOOR = 0.2;
export const CAT_RESERVE_SYMP_REF = 3;
```
  - `packages/engine-core/src/l2/endo/hormones.ts` — the state, find:
```ts
  cortDrive: number; // the slow surgical-stress drive integrated for cortisol
}
```
Replace with:
```ts
  cortDrive: number; // the slow surgical-stress drive integrated for cortisol
  catReserve: number; // FU-7 (audit D9): releasable catecholamine store, 0–1 (1 = replete)
}
```
the initialiser, find:
```ts
  return { symp: 0, epi: EPI_BASAL_PG_ML, epiExo: 0, ne: NE_BASAL_PG_ML, cort: CORT_BASAL, cortDrive: 0 };
```
Replace with:
```ts
  return { symp: 0, epi: EPI_BASAL_PG_ML, epiExo: 0, ne: NE_BASAL_PG_ML, cort: CORT_BASAL, cortDrive: 0, catReserve: 1 };
```
the step (AFTER `h.symp`), find:
```ts
  h.symp += (target - h.symp) * (1 - Math.exp(-dtS / tau));
```
Replace with:
```ts
  h.symp += (target - h.symp) * (1 - Math.exp(-dtS / tau));
  // FU-7 (audit D9): the releasable store falls with sustained sympathetic drive and refills slowly (`?? 1`: a snapshot
  // written before FU-7 is replete)
  const rTarget = Math.max(CAT_RESERVE_FLOOR, 1 - (1 - CAT_RESERVE_FLOOR) * Math.min(1, h.symp / CAT_RESERVE_SYMP_REF));
  const r0 = h.catReserve ?? 1;
  h.catReserve = r0 + (rTarget - r0) * (1 - Math.exp(-dtS / (rTarget < r0 ? CAT_RESERVE_TAU_DOWN_S : CAT_RESERVE_TAU_UP_S)));
```
and the import list, find:
```ts
  NE_BASAL_PG_ML, NE_CL_ML_MIN_KG, NE_SPILL_GAIN, NE_VD_L_KG, SYMP_MAX, SYMP_OFF_TAU_S, SYMP_ON_TAU_S,
} from './params.ts';
```
Replace with:
```ts
  NE_BASAL_PG_ML, NE_CL_ML_MIN_KG, NE_SPILL_GAIN, NE_VD_L_KG, SYMP_MAX, SYMP_OFF_TAU_S, SYMP_ON_TAU_S,
  CAT_RESERVE_FLOOR, CAT_RESERVE_SYMP_REF, CAT_RESERVE_TAU_DOWN_S, CAT_RESERVE_TAU_UP_S,
} from './params.ts';
```
  - `packages/engine-core/src/l2/endo/core.ts` — publish it (the field Step 3's `extraSymp` line multiplies), find:
```ts
  cortisolNmolL: number;
  symp: number;
```
Replace with:
```ts
  cortisolNmolL: number;
  catReserve: number; // FU-7 (audit D9): 7e's releasable catecholamine store (0–1), scales 7g's indirect drive
  symp: number;
```
and find:
```ts
    symp: h.symp,
```
Replace with:
```ts
    symp: h.symp,
    catReserve: h.catReserve, // FU-7 (audit D9)
```
(Task 10 Step 1 anchors on `    symp: h.symp,` again and on this step's `catReserve: 1` initialiser — the two tasks
run in order.)
  - Test `packages/engine-core/test/l2/endo/cat-reserve.test.ts`: (1) a resting patient keeps `catReserve` 1 for an hour
    (band ≥ 0.98); (2) 30 min at `symp` 2.5 lowers it below 0.45; (3) the same ketamine dose raises MAP less in the
    depleted state — band: the MAP rise falls to **≤ 0.5 ×** the replete rise (the direction the audit asks for; the
    DEPTH of the fall is the calibration item).
  - Engine check: `npx -y pnpm@9.15.9 run audit:drugs DI-21 DI-80 DI-82`. Expected: DI-21 `mapPctSeptic` **negative**
    (prototype −0.5 % without the reserve; with it the fall should deepen — record the number), DI-80 and DI-82 stay PL
    (ketamine in haemorrhage and the KETASED comparison must NOT become unstable: if either leaves its band, the reserve's
    τ_down is too fast — report and keep `it.fails`, do not widen).
- [x] **Step 5 — the unit test.** Add to `test/l2/pk/beta-occupancy.test.ts`:

```ts
  it('ephedrine and ketamine publish a central drive instead of multiplying 7a (audit D4/D9)', () => {
    // one reference dose sits at each row's EC50, so the Hill gives half of Emax (ephedrine 1.6 → 0.8, ketamine 2.2 → 1.1)
    const e = combine([act('ephedrine', 1)], { ...CTX, betaOccProfile: 0 });
    expect(e.bus.cns.sympDrive).toBeGreaterThan(0.5);
    expect(e.fx.hr).toBeCloseTo(1, 6); // no direct chronotropy left on 7a
    const k = combine([act('ketamine', 1)], { ...CTX, betaOccProfile: 0 });
    expect(k.bus.cns.sympDrive).toBeGreaterThan(0.5);
    expect(k.fx.hr).toBeCloseTo(1, 6); // ketamine's chronotropy is indirect too
    expect(k.fx.ees).toBeLessThan(1); // the DIRECT myocardial depression stays
  });
```

- [x] **Step 6 — glucagon (D13; UNPROTOTYPED).** Add ONE row to `data/rows-cardiovascular.ts`, after the β-blocker
rows, because addendum 21 names it as the β-blocked anaphylaxis / β-blocker-overdose rescue: it raises myocardial cAMP
DOWNSTREAM of the β receptor, so its `ees`/`hr` entries carry **no** `beta: true` flag — that is the whole teaching
point.

```ts
  // FU-7 (addendum 21): glucagon — the rescue when β receptors are occupied (β-blocker overdose, β-blocked anaphylaxis):
  // it raises cAMP through the glucagon receptor, DOWNSTREAM of the β receptor, so its entries are NOT `beta`-shifted.
  { id: 'glucagon', name: 'Glucagon', cls: 'metabolic', amountUnit: 'mg', pk: gammaPk(1, false, 420, 3600),
    pd: [{ target: 'hr', emax: 0.2, ec50: 1 }, { target: 'ees', emax: 0.35, ec50: 1 }, { target: 'glucose', emax: 60, ec50: 1 }],
    doses: '1–5 mg IV bolus, then 1–5 mg/h (β-blocker overdose: ACMT/AHA); 1 mg for hypoglycaemia',
    onset: 'onset 1–3 min, peak 5–7 min, duration 15–30 min; nausea and hyperglycaemia are expected',
    ir: '?', src: 'ACMT β-blocker-toxicity guidance; AHA 2010 toxicology (glucagon 3–10 mg); T6.2 sizes [ENG]', tag: 'ENG' },
```

Test in `test/l2/pk/beta-occupancy.test.ts`: at occupancy 0.95, dobutamine's `ees` rise collapses while glucagon's does
not (band: glucagon keeps ≥ 0.9 × its unblocked effect). Engine check: `audit:drugs DI-41` — record whether the
anaphylaxis rescue ratio moves once glucagon is available (the cell itself gives adrenaline only; the gate note states
that the cell needs a NEW arm, which Task 19 adds as an engine test rather than editing the audit's cell).
- [x] **Step 7 — commit.** `feat(7g): indirect sympathomimetics through 7e's central drive, catecholamine reserve, glucagon (R51 addenda 20–21)`, push.

---

### Task 10: The laryngoscopy / surgical stimulus sympathetic surge (addendum 22; 7e under E-FU7-2 + 7a under E-FU7-3; Steps 1–4 PROTOTYPED on origin/main + `origin/fu-4-integration-polish`, Steps 5–6 R45 procedure)

**Files:**
- Modify: `packages/engine-core/src/l2/endo/{params,hormones,core,effects,adapters}.ts` (**E-FU7-2**: the nociceptive
  state `h.surge` and `surgeF`)
- Modify: `packages/engine-core/src/l2/circ/model.ts` (**E-FU7-3**: ONE factor into FU-4's `setF` argument)
- Modify: `packages/engine-core/src/l2/pk/data/rows-other.ts` (lidocaine's airway-reflex blunting)
- Test: create `packages/engine-core/test/engine/stimulus-surge.test.ts` (SLOW_B)

**Ownership (D8, the sentence the gate note must carry):** the `stimulus` event and its nociceptive drive are **7e's**
(R51 addendum 12 — ONE shape; FU-4 adds the optional `site`). The sympathetic SURGE is the consequence **7e publishes**
and **7a defends**; every blunting drug is **7g's** PD. FU-7 adds no event and no second intensity scale.

**Why / measured (audit D8, P1):** laryngoscopy (7e `stimulus` 1.5) after propofol raises MAP by **+6.1 mmHg** and
labetalol changes nothing (ratio 0.98); awake it gives +12. Expected +20–40 mmHg and HR +20–30 within 30–60 s (M10
airway management; tables §5.3). The proven cause is that 7e's stress output multiplies the HR set point and SVR while
the baroreflex sees the pressure rise against an UNCHANGED set point and withdraws tone (`endo/effects.ts:51–52`,
`circ/baroreflex.ts`). The mechanism is the CENTRAL component of the stress response: nociception resets the
baroreflex set point upward, so the reflex defends the higher pressure for the surge's duration.

**PROTOTYPED (Steps 1–4, including addendum 25's Steps 1b–1c) on `origin/main` + `origin/fu-4-integration-polish`
e3eeb56 with Tasks 1–9 applied — numbers in "Prototype — second fixer" → "Task 10 under addendum 25".** The executor
re-runs Step 5's bands on the merged tree and, where one is missed, keeps the test as `it.fails` with the measured number
and reports. **It must not raise 7e's `G_SYMP_*` gains to force the number** (that would break 7e's calibrated
sepsis/MH/hypoglycaemia rows) and must not touch `baroreflex.ts`. **Apply order inside this task:** Step 3's `depth.ts`
`antinoc` line (IV lidocaine) BEFORE Step 1c's `depth.ts` block, which anchors on it (a single forward pass over the
blocks misses Step 1c's first `depth.ts` block; the third fixer's two-pass apply confirmed it is the only such case).

**The surge is NOCICEPTIVE, never total sympathetic activity (Orchestrator ruling (FU-7 review) 1, 2026-09-28 —
the review's BLOCKER F1).** 7e's `h.symp` is `noxious·(1 − antinoc) + extraSymp`, and `extraSymp` carries sepsis
(0.3–0.7), anaphylaxis (0.3–0.5), `2·mhActivity`, hypoglycaemia and — after Task 9 Step 3 — FU-7's own
`sympDrug·catReserve` (ephedrine 1.6, ketamine 2.2). A set-point factor driven by `h.symp` would therefore make the
reflex DEFEND a higher pressure in septic shock, in anaphylaxis while the patient collapses and in untreated MH (up to
×1.24), and would make ephedrine and ketamine partly self-amplifying. A condition's sympathetic activity is not a
nociceptive set-point reset. So 7e keeps a SECOND first-order state `h.surge`, driven ONLY by the nociceptive term
`x.noxious·(1 − antinoc)` with the same `SYMP_ON_TAU_S`/`SYMP_OFF_TAU_S`, and `surgeF` reads `h.surge`. Neither
`extraSymp` nor 7g's `sympDrive` can reach `surgeF` — by construction (they never enter `h.surge`), and Step 5's
guard cases prove it in the engine.

- [x] **Step 1 — the nociceptive surge state and its set-point factor in 7e (PROTOTYPED, see "Prototype — Task 10").**
In `packages/engine-core/src/l2/endo/params.ts`, find:

```ts
export const SYMP_OFF_TAU_S = 180; // offset τ 2–4 min (tables)
```

Replace with:

```ts
export const SYMP_OFF_TAU_S = 180; // offset τ 2–4 min (tables)
/** FU-7 (addendum 22; Orchestrator ruling (FU-7 review) 1): the CENTRAL component of the stress response — NOCICEPTION
 * resets the baroreflex set point upward, so the reflex defends the higher pressure instead of cancelling the surge
 * (audit D8: laryngoscopy after propofol gave +6 mmHg because the set point did not move). The factor reads the
 * nociceptive state `h.surge` ONLY (never `h.symp`, which carries sepsis/anaphylaxis/MH/hypoglycaemia and 7g's
 * `sympDrive`). [ENG; fit target: MAP +20–30 mmHg and HR +12–30 for 2–5 min after laryngoscopy (M10 ch. 44; tables
 * §5.3), with 7e's own onset τ 25 s / offset τ 180 s giving the time course. Prototype (main + FU-4): 0.25 gives awake
 * ΔMAP +25 / ΔHR +22 and, after propofol 2 mg/kg, ΔMAP +12.8 / ΔHR +15 — after propofol FU-4's `outF` caps what the
 * reflex can deliver, so the gain has little MAP leverage there (0.5 → +14.2 only); 0.12 gave +12.2 / +11.] */
export const SURGE_SET_PER_NOX = 0.25;
export const SURGE_SET_MAX = 0.25;
```

In `packages/engine-core/src/l2/endo/hormones.ts`, find:

```ts
export interface HormoneState {
  symp: number;
```

Replace with:

```ts
export interface HormoneState {
  symp: number;
  /** FU-7 (addendum 22; ruling 1): the NOCICEPTIVE share of the stress activity alone — noxious × (1 − antinoc), same
   * onset/offset τ as `symp`, without `extraSymp`. It drives ONLY the set-point factor `surgeF` (effects.ts). */
  surge: number;
```

find (the line as Task 9 Step 4 left it):

```ts
  return { symp: 0, epi: EPI_BASAL_PG_ML, epiExo: 0, ne: NE_BASAL_PG_ML, cort: CORT_BASAL, cortDrive: 0, catReserve: 1 };
```

Replace with:

```ts
  return { symp: 0, surge: 0, epi: EPI_BASAL_PG_ML, epiExo: 0, ne: NE_BASAL_PG_ML, cort: CORT_BASAL, cortDrive: 0, catReserve: 1 };
```

find:

```ts
  h.symp += (target - h.symp) * (1 - Math.exp(-dtS / tau));
```

Replace with:

```ts
  h.symp += (target - h.symp) * (1 - Math.exp(-dtS / tau));
  // FU-7 (addendum 22; Orchestrator ruling (FU-7 review) 1): the nociceptive surge — the SAME first-order law on the
  // nociceptive term only. `?? 0` tolerates a snapshot written before FU-7 (the state is serialised).
  const nox = Math.min(SYMP_MAX, Math.max(0, x.noxious * (1 - Math.min(1, Math.max(0, x.antinoc)))));
  const s0 = h.surge ?? 0;
  h.surge = s0 + (nox - s0) * (1 - Math.exp(-dtS / (nox > s0 ? SYMP_ON_TAU_S : SYMP_OFF_TAU_S)));
```

In `packages/engine-core/src/l2/endo/effects.ts`, find:

```ts
  mastB2: number; // 0–1 β2 mast-cell stabilisation by EXOGENOUS (7g) epinephrine — the anaphylaxis treatment (R51 addendum 16)
}
```

Replace with:

```ts
  mastB2: number; // 0–1 β2 mast-cell stabilisation by EXOGENOUS (7g) epinephrine — the anaphylaxis treatment (R51 addendum 16)
  /** FU-7 (addendum 22; ruling 1): × on the baroreflex SET POINT (1 = none) — the central reset of the NOCICEPTIVE stress
   * response. Reads `h.surge`, never `h.symp`: a condition's sympathetic activity does not reset the set point. */
  surgeF: number;
}
```

find:

```ts
    mastB2: hill(Math.max(0, h.epiExo), EPI_EC50_BETA2),
  };
```

Replace with:

```ts
    mastB2: hill(Math.max(0, h.epiExo), EPI_EC50_BETA2),
    surgeF: 1 + Math.min(SURGE_SET_MAX, SURGE_SET_PER_NOX * Math.max(0, h.surge ?? 0)), // FU-7 (addendum 22; ruling 1)
  };
```

and the import list — find:

```ts
  EPI_SEC_SUPPRESS, EPI_SI_LOSS, G_SYMP_EES, G_SYMP_HR, G_SYMP_SVR, G_SYMP_V0,
} from './params.ts';
```

Replace with:

```ts
  EPI_SEC_SUPPRESS, EPI_SI_LOSS, G_SYMP_EES, G_SYMP_HR, G_SYMP_SVR, G_SYMP_V0, SURGE_SET_MAX, SURGE_SET_PER_NOX,
} from './params.ts';
```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
    symp: h.symp,
```

Replace with:

```ts
    symp: h.symp,
    surgeF: st.surgeF, // FU-7 (addendum 22; ruling 1): the nociceptive set-point factor 7a defends
```

and find:

```ts
  symp: number;
  stressIndex: number; // 0–100, instructor only
```

Replace with:

```ts
  symp: number;
  /** FU-7 (addendum 22; ruling 1): × on 7a's baroreflex set point from the NOCICEPTIVE surge (1 = none). */
  surgeF: number;
  stressIndex: number; // 0–100, instructor only
```

In `packages/engine-core/src/l2/endo/adapters.ts` (`writeCirc`), find:

```ts
    ext.endoDV0Frac = v0 > 0 ? (-o.dV0Frac * bv) / v0 : 0;
    return 1;
```

Replace with:

```ts
    ext.endoDV0Frac = v0 > 0 ? (-o.dV0Frac * bv) / v0 : 0;
    ext.surgeF = o.surgeF; // FU-7 (addendum 22; ruling 1): the nociceptive set-point reset, MODELED only
    return 1;
```

and find:

```ts
    ext.endoDV0Frac = 0;
  }
```

Replace with:

```ts
    ext.endoDV0Frac = 0;
    ext.surgeF = 1; // FU-7: MANUAL holds the set point (the instructor owns the pressures)
  }
```

- [x] **Step 1b — the surge's CIRCULATING catecholamines act through 7g's adrenergic rows (R51 addendum 25; PROTOTYPED
by the second fixer on main + FU-4, "Prototype — second fixer").** The set-point reset alone cannot reach +20–30 mmHg
after propofol, because FU-4's `outF` rightly caps what the reflex can deliver (the first fixer: +12.8). Laryngoscopy
also releases catecholamines into the blood (Shribman 1987; Derbyshire 1983: plasma noradrenaline rises within a minute
and falls back within minutes; adrenaline rises less), and circulating catecholamines act on vessels and heart directly,
outside the reflex. So the NOCICEPTIVE surge state publishes a noradrenaline/adrenaline bolus-equivalent, and 7g acts it
out through its OWN noradrenaline and adrenaline rows — the same receptors, Loewe sums, β-occupancy shift and
acidosis/vasopressor-responsiveness scaling as an injected dose. Sizes, so nothing is counted twice: the ADRENALINE is
exactly the nociceptive share of 7e's own adrenal output (`EPI_BASAL_PG_ML · EPI_ADRENAL_GAIN · h.surge`), REMOVED from
7e's own haemodynamic adrenaline terms and routed to 7g (each molecule acts once; its metabolic effects stay 7e's); the
NORADRENALINE is the nociceptive share of 7e's spillover readout (`NE_BASAL_PG_ML · NE_SPILL_GAIN · h.surge`, which had
no haemodynamic effect of its own) × `SURGE_NE_GAIN` — the ONE fitted size. Only `h.surge` drives it, so sepsis,
anaphylaxis, MH and 7g's `sympDrive` cannot reach it (ruling 1's guard arms cover it). Opioids blunt the RELEASE (lower
`h.surge`), lidocaine the AFFERENT (`antinocAdd`), β-blockers the RECEPTOR (7g's occupancy on the rows' β entries).

In `packages/engine-core/src/l2/endo/params.ts`, find (Step 1's line):

```ts
export const SURGE_SET_MAX = 0.25;
```

Replace with:

```ts
export const SURGE_SET_MAX = 0.25;
/** FU-7 (R51 addendum 25): × on the NOCICEPTIVE share of the noradrenaline spillover readout (NE_BASAL_PG_ML ·
 * NE_SPILL_GAIN · h.surge, pg/mL) that circulates and acts through 7g's noradrenaline row. [ENG; fit target: ΔMAP +20–30
 * mmHg after propofol 2 mg/kg (Shribman 1987; M10 ch. 44) with the set-point reset above, the awake response and
 * ruling 1's guard arms unchanged. Direction: plasma noradrenaline rises within 1 min of laryngoscopy (Shribman 1987;
 * Derbyshire 1983).] MEASURED (second fixer, main + FU-4 + Tasks 1–10): 0.6 gives ΔMAP +27.1 after propofol 2 mg/kg
 * (band 20–30), ΔHR +18 (12–30), 84 % of the peak still present at +90 s, fentanyl-blunted ratio 0.20 and
 * lidocaine 0.85; 1.0 gave +33.2 (above the band), 0.4 gave +23.7 with the fentanyl ratio 0.18 (below 0.2–0.7).
 * Table: "Prototype — second fixer". */
export const SURGE_NE_GAIN = 0.6;
```

In `packages/engine-core/src/l2/endo/effects.ts`, the two new outputs — find (Step 1's field):

```ts
  surgeF: number;
}
```

Replace with:

```ts
  surgeF: number;
  /** FU-7 (R51 addendum 25): the surge's circulating noradrenaline and adrenaline as 7g RATE-EQUIVALENTS (µg/kg/min,
   * Css = rate/CL), acted out by 7g's own adrenergic rows (`PkCtx.endoCat`). 0 without a nociceptive surge. */
  surgeNe: number;
  surgeEpi: number;
}
```

the haemodynamic adrenaline terms (the nociceptive share leaves them — it acts through 7g), find:

```ts
  const b1 = hill(endo, EPI_EC50_BETA1);
  const b2 = hill(endo, EPI_EC50_BETA2);
  const al = hill(endo, EPI_EC50_ALPHA);
```

Replace with:

```ts
  // FU-7 (R51 addendum 25): the NOCICEPTIVE share of the adrenal output acts through 7g's adrenaline row (surgeEpi), so
  // 7e's own haemodynamic terms read the rest — each molecule acts once. The metabolic term (`me`) still reads it all.
  const surge = Math.max(0, h.surge ?? 0);
  const epiSurgePg = EPI_BASAL_PG_ML * EPI_ADRENAL_GAIN * surge;
  const endoH = Math.max(0, endo - epiSurgePg);
  const b1 = hill(endoH, EPI_EC50_BETA1);
  const b2 = hill(endoH, EPI_EC50_BETA2);
  const al = hill(endoH, EPI_EC50_ALPHA);
```

the outputs, find (Step 1's line):

```ts
    surgeF: 1 + Math.min(SURGE_SET_MAX, SURGE_SET_PER_NOX * Math.max(0, h.surge ?? 0)), // FU-7 (addendum 22; ruling 1)
```

Replace with:

```ts
    surgeF: 1 + Math.min(SURGE_SET_MAX, SURGE_SET_PER_NOX * Math.max(0, h.surge ?? 0)), // FU-7 (addendum 22; ruling 1)
    // FU-7 (R51 addendum 25): pg/mL → 7g rate-equivalents (µg/kg/min = pg/mL × CL[mL/kg/min] / 1e6)
    surgeNe: (SURGE_NE_GAIN * NE_BASAL_PG_ML * NE_SPILL_GAIN * surge * NE_CL_ML_MIN_KG) / 1e6,
    surgeEpi: epiSurgePg / EPI_EXO_PG_PER_RATE_EQ,
```

and the imports, find (Step 1's line):

```ts
  EPI_SEC_SUPPRESS, EPI_SI_LOSS, G_SYMP_EES, G_SYMP_HR, G_SYMP_SVR, G_SYMP_V0, SURGE_SET_MAX, SURGE_SET_PER_NOX,
} from './params.ts';
```

Replace with:

```ts
  EPI_SEC_SUPPRESS, EPI_SI_LOSS, G_SYMP_EES, G_SYMP_HR, G_SYMP_SVR, G_SYMP_V0, SURGE_SET_MAX, SURGE_SET_PER_NOX,
  EPI_ADRENAL_GAIN, EPI_EXO_PG_PER_RATE_EQ, NE_BASAL_PG_ML, NE_CL_ML_MIN_KG, NE_SPILL_GAIN, SURGE_NE_GAIN, // FU-7 (addendum 25)
} from './params.ts';
```

In `packages/engine-core/src/l2/endo/core.ts`, publish it — find (Step 1's field):

```ts
  surgeF: number;
  stressIndex: number; // 0–100, instructor only
```

Replace with:

```ts
  surgeF: number;
  /** FU-7 (R51 addendum 25): the nociceptive circulating catecholamines, 7g rate-equivalents — 7g's `PkCtx.endoCat`. */
  surgeCat: { ne: number; epi: number };
  stressIndex: number; // 0–100, instructor only
```

and find (Step 1's line):

```ts
    surgeF: st.surgeF, // FU-7 (addendum 22; ruling 1): the nociceptive set-point factor 7a defends
```

Replace with:

```ts
    surgeF: st.surgeF, // FU-7 (addendum 22; ruling 1): the nociceptive set-point factor 7a defends
    surgeCat: { ne: st.surgeNe, epi: st.surgeEpi }, // FU-7 (R51 addendum 25): acted out by 7g's adrenergic rows
```

In `packages/engine-core/src/l2/pk/pipeline.ts` (7g), the context field — find (Task 8's line):

```ts
  betaOcc?: number; betaNonSel?: boolean;
```

Replace with:

```ts
  betaOcc?: number; betaNonSel?: boolean;
  /** FU-7 (R51 addendum 25): 7e's nociceptive CIRCULATING catecholamines, rate-equivalents of 7g's own rows (MODELED). */
  endoCat?: { ne: number; epi: number };
```

the endogenous rows (module level, circulatory targets only), find:

```ts
export interface PkCtx {
```

Replace with:

```ts
/** FU-7 (R51 addendum 25): endogenous catecholamines act through 7g's OWN adrenergic rows — the same receptors, Loewe
 * sums, β-occupancy shift and acidosis/vasopressor-responsiveness scaling as an injected dose. Circulatory targets only:
 * endogenous adrenaline's metabolic effects stay 7e's (stressEffects), so nothing is counted twice. */
const ENDO_CIRC_TARGETS: readonly PdTarget[] = ['hr', 'ees', 'svr', 'pvr', 'v0Frac'];
const endoRow = (id: string): DrugRow | null => {
  const r = DRUGS[id];
  return r ? { ...r, id: `endo:${id}`, pd: r.pd.filter((e) => ENDO_CIRC_TARGETS.includes(e.target)) } : null;
};
const ENDO_NE = endoRow('norepinephrine');
const ENDO_EPI = endoRow('epinephrine');
function endoCatActives(cat: PkCtx['endoCat']): Active[] {
  const out: Active[] = [];
  if (cat && ENDO_NE && cat.ne > 0) out.push({ row: ENDO_NE, c: cat.ne });
  if (cat && ENDO_EPI && cat.epi > 0) out.push({ row: ENDO_EPI, c: cat.epi });
  return out;
}

export interface PkCtx {
```

its type import, find:

```ts
import type { DrugRow } from './row.ts';
```

Replace with:

```ts
import type { DrugRow, PdTarget } from './row.ts';
```

and the actives, find:

```ts
  const actives: Active[] = [];
```

Replace with:

```ts
  // FU-7 (R51 addendum 25): the surge's circulating catecholamines join the adrenergic rows' PD (never `agents`/`doses`)
  const actives: Active[] = endoCatActives(ctx.endoCat);
```

In `packages/engine-core/src/engine.ts` (**E-FU7-7**), find (Task 8's line):

```ts
      betaNonSel: circ?.prof.betaNonSel ?? false,
```

Replace with:

```ts
      betaNonSel: circ?.prof.betaNonSel ?? false,
      // FU-7 (R51 addendum 25): 7e's nociceptive catecholamine release (its previous 1 Hz pass — 7g runs first in the
      // chain; the surge's 25 s onset τ makes the lag irrelevant). MODELED only: MANUAL's instructor owns the pressures.
      ...(circ ? { endoCat: (ps as unknown as { endo?: { core?: { out?: { surgeCat?: { ne: number; epi: number } } } } }).endo?.core?.out?.surgeCat ?? { ne: 0, epi: 0 } } : {}),
```

- [x] **Step 1c — the RELEASE is blunted by the opioid, not by the hypnotic (R51 addendum 25; PROTOTYPED).** Measured
first without this step: fentanyl 3 µg/kg left only 0.06–0.08 of the response (band 0.2–0.7) whatever the release gain,
because 7f's `antinoc` is dominated by its HYPNOTIC term once the opioid's MAC reduction multiplies into `hypEq`
(propofol 2 mg/kg + fentanyl 3 µg/kg → `antinoc` ≈ 0.94, i.e. the anaesthetic itself abolishes the modelled surge). That
is the wrong physiology for the catecholamine RELEASE: the humoral stress response is NOT abolished by the hypnotic —
laryngoscopy under propofol alone is the classic +20–30 mmHg — while opioids (and IV lidocaine) are what blunt it
(Desborough 2000, "The stress response to trauma and surgery"; Shribman 1987: fentanyl attenuates the catecholamine rise
that follows laryngoscopy; Derbyshire 1983). 7e's own cortisol drive already reads the UNBLUNTED `noxious` for the same
reason (`hormones.ts`). So 7f publishes the OPIOID + lidocaine share of antinociception beside the total, and 7e's
NOCICEPTIVE state reads that share; `stress`, `symp` and every other consumer keep the total `antinoc` unchanged.

In `packages/engine-core/src/l2/neuro/depth.ts` (**E-FU7-1**), find (Task 10 Step 3's line):

```ts
  const antinoc = 1 - (1 - bOp) * (1 - bHyp) * (1 - Math.min(0.6, Math.max(0, x.antinocAdd ?? 0))); // FU-7 (addendum 22): IV lidocaine
```

Replace with:

```ts
  // FU-7 (R51 addendum 25): the OPIOID + lidocaine share alone — the catecholamine RELEASE reads this, because a hypnotic
  // does not abolish the humoral stress response (Desborough 2000) while opioids and IV lidocaine blunt it.
  const antinocOp = 1 - (1 - bOp) * (1 - Math.min(0.6, Math.max(0, x.antinocAdd ?? 0)));
  const antinoc = 1 - (1 - antinocOp) * (1 - bHyp); // the TOTAL blunting, unchanged in value and in every consumer
```

find:

```ts
  antinoc: number; // 0–1 blunting of a noxious stimulus by opioid and hypnotic (7e: noxious × (1 − antinoc))
```

Replace with:

```ts
  antinoc: number; // 0–1 blunting of a noxious stimulus by opioid and hypnotic (7e: noxious × (1 − antinoc))
  antinocOp: number; // FU-7 (R51 addendum 25): the OPIOID + lidocaine share only — 7e's catecholamine release reads this
```

and find:

```ts
  return { diRaw, sr, macFrac, macEff, hypnotic, conscious: hypnotic < 1, stress, antinoc, hypEq, movement };
```

Replace with:

```ts
  return { diRaw, sr, macFrac, macEff, hypnotic, conscious: hypnotic < 1, stress, antinoc, antinocOp, hypEq, movement };
```

In `packages/engine-core/src/l2/neuro/pipeline.ts` (**E-FU7-1**), find:

```ts
  ns.antinoc = ns.outputs.antinoc;
```

Replace with:

```ts
  ns.antinoc = ns.outputs.antinoc;
  ns.antinocOp = d.antinocOp; // FU-7 (R51 addendum 25): 7e reads this for the catecholamine release
```

and the state field, find:

```ts
  /** Read by Stage 7e as ps.neuro.{antinoc, nmb, thermoDepth} (R51 §6; the 7e plan's Requests): mirrors of `outputs`. */
  antinoc: number;
```

Replace with:

```ts
  /** Read by Stage 7e as ps.neuro.{antinoc, nmb, thermoDepth} (R51 §6; the 7e plan's Requests): mirrors of `outputs`. */
  antinoc: number;
  /** FU-7 (R51 addendum 25): the OPIOID + lidocaine share of `antinoc` — 7e's nociceptive surge state reads it. */
  antinocOp: number;
```

and its initialiser, find:

```ts
    antinoc: 0, nmb: 0, thermoDepth: 0,
```

Replace with:

```ts
    antinoc: 0, antinocOp: 0, nmb: 0, thermoDepth: 0, // FU-7 (addendum 25): antinocOp
```

In `packages/engine-core/src/l2/endo/adapters.ts` (**E-FU7-2**), find:

```ts
type Neuro = { antinoc?: number; nmb?: number; thermoDepth?: number };
```

Replace with:

```ts
type Neuro = { antinoc?: number; antinocOp?: number; nmb?: number; thermoDepth?: number }; // FU-7 (addendum 25)
```

and find:

```ts
    noxious: es.noxious, antinoc, mapMmHg: mapOf(ctx, t), sao2: ctx.resp.o2.sa, paco2: ctx.resp.co2.pf, tempC: th.tc,
```

Replace with:

```ts
    noxious: es.noxious, antinoc,
    // FU-7 (R51 addendum 25): the opioid/lidocaine share for the catecholamine RELEASE; without 7f it is the total
    antinocOp: num(n?.antinocOp) && pkActive(pk) ? n.antinocOp : antinoc,
    mapMmHg: mapOf(ctx, t), sao2: ctx.resp.o2.sa, paco2: ctx.resp.co2.pf, tempC: th.tc,
```

In `packages/engine-core/src/l2/endo/core.ts` (**E-FU7-2**), find:

```ts
  noxious: number;
  antinoc: number;
```

Replace with:

```ts
  noxious: number;
  antinoc: number;
  /** FU-7 (R51 addendum 25): the OPIOID + lidocaine share of the antinociception — the nociceptive surge state reads it
   * (a hypnotic does not abolish the humoral stress response, Desborough 2000). Absent = the total. */
  antinocOp?: number;
```

and find (Task 9 Step 3's line):

```ts
    noxious: x.noxious, antinoc: x.antinoc, extraSymp: cd.extraSymp + hypo + 2 * x.mhActivity + (x.sympDrug ?? 0) * c.out.catReserve, // FU-7 (addenda 20–21)
```

Replace with:

```ts
    noxious: x.noxious, antinoc: x.antinoc, antinocOp: x.antinocOp, extraSymp: cd.extraSymp + hypo + 2 * x.mhActivity + (x.sympDrug ?? 0) * c.out.catReserve, // FU-7 (addenda 20–21, 25)
```

In `packages/engine-core/src/l2/endo/hormones.ts` (**E-FU7-2**), find:

```ts
  antinoc: number; // 0–1 antinociception (7f; fallback ANTINOC_GA_FALLBACK under GA)
```

Replace with:

```ts
  antinoc: number; // 0–1 antinociception (7f; fallback ANTINOC_GA_FALLBACK under GA)
  antinocOp?: number; // FU-7 (R51 addendum 25): its OPIOID + lidocaine share — the nociceptive surge state reads this
```

and find (Step 1's line):

```ts
  const nox = Math.min(SYMP_MAX, Math.max(0, x.noxious * (1 - Math.min(1, Math.max(0, x.antinoc)))));
```

Replace with:

```ts
  // FU-7 (R51 addendum 25): the RELEASE is blunted by the opioid and by IV lidocaine, not by the hypnotic
  const nox = Math.min(SYMP_MAX, Math.max(0, x.noxious * (1 - Math.min(1, Math.max(0, x.antinocOp ?? x.antinoc)))));
```

- [x] **Step 2 — 7a defends it (PROTOTYPED).** In `packages/engine-core/src/l2/circ/model.ts`, find (7a's `ext` type):

```ts
    endoHrF?: number; endoSvrF?: number; endoEesF?: number; endoDV0Frac?: number; // R49 (7e endocrine stress response)
```

Replace with:

```ts
    endoHrF?: number; endoSvrF?: number; endoEesF?: number; endoDV0Frac?: number; // R49 (7e endocrine stress response)
    surgeF?: number; // FU-7 (addendum 22; ruling 1): 7e's NOCICEPTIVE set-point factor, multiplied into FU-4's setF
```

and append ONE factor to FU-4's `stepBaro(` call. The find block is **FU-4's line** (it does not exist on pre-FU-4
main — a declared miss there; Task 0 Step 5 records the merged line). Note `x` (`m.ext`) is declared AFTER this
statement in `control()`, so the factor reads `m.ext` directly:

```ts
    ? stepBaro(m.baro, sensed, { gVagal: m.prof.gVagal * de.gv, gSymp: m.prof.gSymp * de.gv, betaBlock: Math.min(0.95, m.prof.betaBlock + (m.ext.betaBlockAdd ?? 0) * (1 - m.prof.betaBlock)), betaBlockC: Math.min(0.95, m.prof.betaBlockC + (m.ext.betaBlockAdd ?? 0) * (1 - m.prof.betaBlockC)), hrGain: de.gvHr, weightScale: w, pinnedSet: m.mapSetPinned, outF: de.symp, setF: de.setF, brainF: brainstemOutF(m.ext.cbfRel) }, raTm)
```

Replace with:

```ts
    ? stepBaro(m.baro, sensed, { gVagal: m.prof.gVagal * de.gv, gSymp: m.prof.gSymp * de.gv, betaBlock: Math.min(0.95, m.prof.betaBlock + (m.ext.betaBlockAdd ?? 0) * (1 - m.prof.betaBlock)), betaBlockC: Math.min(0.95, m.prof.betaBlockC + (m.ext.betaBlockAdd ?? 0) * (1 - m.prof.betaBlockC)), hrGain: de.gvHr, weightScale: w, pinnedSet: m.mapSetPinned, outF: de.symp, setF: de.setF * (m.ext.surgeF ?? 1), brainF: brainstemOutF(m.ext.cbfRel) }, raTm) // FU-7 (addendum 22): the nociceptive surge rides FU-4's set-point path
```

(If FU-4's `setF` is absent on the merged tree the executor STOPS — the surge needs FU-4's path; it must not add a
second set-point mechanism. If FU-4 later adds arguments to this call, re-anchor on `setF: de.setF` and change only
that argument.)
- [x] **Step 3 — the blunting drugs (PROTOTYPED).** Three already act and one is new:
  - **opioids:** 7f's `antinoc` already multiplies 7e's `noxious` (`depth.ts`), so fentanyl 3 µg/kg before laryngoscopy
    lowers `symp`; the nociceptive `surge` reads the OPIOID + lidocaine share `antinocOp` (Step 1c, addendum 25 — a
    hypnotic does not abolish the catecholamine release). No further change; the test asserts the ratio (0.23 measured).
  - **labetalol / esmolol: NO adapter change.** The earlier draft added 7g's drug β-occupancy to 7e's `betaBlock`
    inputs. The prototype showed that this would count it TWICE: 7a already blunts 7e's `endoHrF`/`endoEesF` by the
    drug's occupancy (`betaBlunt(x.endoHrF ?? 1, x.betaBlockAdd ?? 0)` in `circ/model.ts`, with `preBlunt` in
    `writeCirc` keeping the fever term unblunted), and the reflex's own β limb receives `m.ext.betaBlockAdd` in the
    `stepBaro(` call; under addendum 25 the drug's occupancy also shifts the β EC50s of the surge's circulating
    catecholamines (Step 1b, 7g's rows). Measured: esmolol 1 mg/kg removes 47 % of the laryngoscopy HR rise. The MAP
    share is NOT blunted by β-occupancy (labetalol 0.94, esmolol 0.99 — "Prototype — second fixer"): the circulating
    noradrenaline acts through α and the reset set point is reached through the α limb — that is the mechanism's
    answer, and Step 5 records it.
  - **lidocaine (IV, 1.5 mg/kg before laryngoscopy):** its airway-reflex attenuation is a direct fall in the NOXIOUS
    input, not sympatholysis (a negative `sympDrive` would be WRONG: that target is a drive, not a blunting). ONE new
    target `'antinocAdd'` [ENG; source: Lin 2016 meta-analysis — IV lidocaine 1.5 mg/kg attenuates the intubation
    pressor response; tables have no row]. **Declared scope note:** this adds ONE field to 7f's depth beyond addendum
    20's contract, under E-FU7-1, because the blunting list of addendum 22 names lidocaine explicitly. Every edit is a
    block (review F13). `packages/engine-core/src/l2/pk/row.ts`, find (Task 9's line):
```ts
  | 'sympDrive';
```
Replace with:
```ts
  | 'sympDrive'
  /** FU-7 (addendum 22): an ADDED antinociception (IV lidocaine's airway-reflex blunting) → 7f's `antinoc`, 0–0.6. */
  | 'antinocAdd';
```
`packages/engine-core/src/types-pk.ts`, find (Task 9's field):
```ts
    sympDrive: number;
```
Replace with:
```ts
    sympDrive: number;
    /** FU-7 (addendum 22): added antinociception from 7g's PD (IV lidocaine), 0–0.6 → 7f's `antinoc`. */
    antinocAdd: number;
```
and the neutral literal, find:
```ts
sympDrive: 0, uHyp: 0,
```
Replace with:
```ts
sympDrive: 0, antinocAdd: 0, uHyp: 0,
```
`packages/engine-core/src/l2/pk/combine.ts`, find (Task 9's line):
```ts
  bus.cns.sympDrive = Math.max(0, other.sympDrive ?? 0); // FU-7 (addenda 20–21): the indirect sympathomimetic drive
```
Replace with:
```ts
  bus.cns.sympDrive = Math.max(0, other.sympDrive ?? 0); // FU-7 (addenda 20–21): the indirect sympathomimetic drive
  bus.cns.antinocAdd = Math.min(0.6, Math.max(0, other.antinocAdd ?? 0)); // FU-7 (addendum 22): IV lidocaine
```
`packages/engine-core/src/l2/neuro/bus.ts` (E-FU7-1), find (Task 5's field):
```ts
  dissoc: number | undefined;
```
Replace with:
```ts
  dissoc: number | undefined;
  /** FU-7 (addendum 22): 7g's added antinociception (IV lidocaine), 0–0.6; 0 on a bus without it. */
  antinocAdd: number;
```
and find (Task 5's reader line):
```ts
    dissoc: num(bus.cns.dissoc) ? bus.cns.dissoc : undefined,
```
Replace with:
```ts
    dissoc: num(bus.cns.dissoc) ? bus.cns.dissoc : undefined,
    antinocAdd: num(bus.cns.antinocAdd) ? bus.cns.antinocAdd : 0, // FU-7 (addendum 22)
```
`packages/engine-core/src/l2/neuro/depth.ts` (E-FU7-1), find (Task 5's field):
```ts
  dissoc?: number;
```
Replace with:
```ts
  dissoc?: number;
  /** FU-7 (addendum 22): 7g's added antinociception (IV lidocaine), 0–0.6. */
  antinocAdd?: number;
```
and find:
```ts
  const antinoc = 1 - (1 - bOp) * (1 - bHyp);
```
Replace with:
```ts
  const antinoc = 1 - (1 - bOp) * (1 - bHyp) * (1 - Math.min(0.6, Math.max(0, x.antinocAdd ?? 0))); // FU-7 (addendum 22): IV lidocaine
```
`packages/engine-core/src/l2/neuro/pipeline.ts`, find (Task 5's call tail):
```ts
    hypPropEq: x.hypPropEq, opioidFentEqIn: x.opioidFentEq, dissoc: x.dissoc }); // FU-7 (addendum 20)
```
Replace with:
```ts
    hypPropEq: x.hypPropEq, opioidFentEqIn: x.opioidFentEq, dissoc: x.dissoc, antinocAdd: x.antinocAdd }); // FU-7 (addenda 20, 22)
```
`packages/engine-core/src/l2/pk/data/rows-other.ts` (lidocaine), find:
```ts
    pd: [{ target: 'ees', emax: -0.7, ec50: 20, hill: 2 }, { target: 'svr', emax: -0.3, ec50: 20, hill: 2 }],
    doses: 'antiarrhythmic 1–1.5 mg/kg;
```
Replace with:
```ts
    // FU-7 (addendum 22): IV lidocaine blunts the airway-reflex / intubation pressor response (Lin 2016 meta-analysis)
    // — an added antinociception on 7e's noxious input, not a sympatholysis [ENG size: emax 0.35 at 3 µg/mL].
    pd: [{ target: 'ees', emax: -0.7, ec50: 20, hill: 2 }, { target: 'svr', emax: -0.3, ec50: 20, hill: 2 }, { target: 'antinocAdd', emax: 0.35, ec50: 3 }],
    doses: 'antiarrhythmic 1–1.5 mg/kg;
```
- [x] **Step 4 — the stimulus chain check (PROTOTYPED).** Confirm with a scratch script that a `stimulus` intensity 1.5
raises `endo.core.out.surgeF` above 1 within 60 s and back toward 1 after the stimulus ends, and that
`hemo.circ.baro.set × ext.surgeF` follows it. No new event, no second scale (addendum 12). **Prototype (main +
FU-4, propofol 2 mg/kg at 240 s, stimulus 1.5 at 300–360 s):** `surgeF` > 1.01 at +5 s, peak **1.184**; residual
`surgeF − 1` **0.094 / 0.035 / 0.007** at 2 / 5 / 10 min after the stimulus ends (7e's offset τ 180 s — "back to 1
within 5 min" reads as < 0.04); defended set point **95.3 → 112.8 mmHg**, 98.6 at +5 min. Awake (no hypnotic):
peak 1.25 (the cap), 95.3 → 119.1. **Under addendum 25 (third fixer, main + FU-4 e3eeb56, Steps 1–1c):** the surge reads
the opioid share `antinocOp`, so propofol no longer blunts it — `surgeF` > 1.01 within the first second and at the cap
**1.25** in BOTH arms (set point 95.3 → 119.1 × FU-4's `setF`); residual `surgeF − 1` **0.175 / 0.064 / 0.012** at 2 / 5 /
10 min after the stimulus ends (the state saturates the cap, so the 5-min residual is 0.064, not < 0.04 — reported, not a
band); the release peaks at **0.019 µg/kg/min** noradrenaline- and **0.010** adrenaline-equivalent (plasma noradrenaline
403 pg/mL after propofol, 504 awake).
- [x] **Step 5b — the ONE existing assertion Task 10 extends (E-FU7-10 c; review F14's rule applied).**
`test/l2/endo/adapters.test.ts` asserts the EXACT key list 7e writes into `circ.ext` at rest; Step 1 adds `surgeF`. The
title, the case and its meaning are kept — the expected object gains the NEUTRAL value. Find:

```ts
    expect(cm.ext).toEqual({ endoHrF: 1, endoSvrF: 1, endoEesF: 1, endoDV0Frac: -0 });
```

Replace with:

```ts
    expect(cm.ext).toEqual({ endoHrF: 1, endoSvrF: 1, endoEesF: 1, endoDV0Frac: -0, surgeF: 1 }); // FU-7 (E-FU7-10 c): at rest the nociceptive surge changes nothing
```

- [x] **Step 5 — the test and its bands.** Create `packages/engine-core/test/engine/stimulus-surge.test.ts` (SLOW_B,
yields per sim-minute), rig = adult 40 y ventilated (the audit's rig). **The numbers per case are the THIRD fixer's,
measured with the whole of Task 10 under R51 addendum 25 (Steps 1–1c: reset + circulating release + opioid-only release
blunting, `SURGE_SET_PER_NOX` 0.25, `SURGE_NE_GAIN` 0.6) on `origin/main` + `origin/fu-4-integration-polish` e3eeb56 +
Tasks 1–9; the first fixer's reset-only numbers are kept in "Prototype — Task 10" for the record. A case the prototype
missed is written as `it.fails` with its number in the title (R45), and the executor re-measures on the merged tree — if
a band is met there, the case is written as `it`:**
  1. **"laryngoscopy after propofol raises MAP 20–30 mmHg and HR 12–30 for 2–5 min"** — propofol 2 mg/kg at 240 s,
     `stimulus` 1.5 at 300 s for 60 s: ΔMAP peak **20–30 mmHg** [Shribman 1987; M10 ch. 44; tables §5.3], ΔHR peak
     **12–30**, and the surge is still ≥ 50 % of its peak at **90 s** (it is not cancelled within its time course — the
     audit's real complaint). Measured before (research/14, main): **+6.1 mmHg**; on main + FU-4 without Task 10: +11.5 /
     HR +9; reset alone (first fixer): +12.8. **Addendum 25: ΔMAP +27.2 (at +65 s) ✓, ΔHR +17 ✓, 85 % of the peak at
     90 s ✓ — all `it`.** Add an AWAKE arm: stimulus 1.5 without a hypnotic, **ΔMAP 20–40, ΔHR 12–30** [the task's
     own M10 band, "Why" above: +20–40 mmHg]: measured **+36.9 / +13 ✓** → `it`. (The first fixer wrote 20–30 for the
     awake arm without a separate source; the awake arm has no test yet, so the task's sourced +20–40 is its band — not a
     widening. Flagged for the orchestrator: if 20–30 is wanted awake, the case is `it.fails` "measured +36.9".)
  1b. **"the untreated hypertensive's pressor response is exaggerated" (CM amendment, research/19 finding 4 — a NEW
     acceptance arm).** Same rig and timing as case 1, run twice: the `htn` profile at severity 1 (untreated) and the
     healthy adult, propofol 2 mg/kg at 240 s and no opioid, `stimulus` 1.5 at 360 s for 60 s (the CM-03c rig), ΔMAP
     taken against each patient's OWN no-stimulus control arm. Assert the **ratio ΔMAP(untreated HTN) / ΔMAP(healthy)
     is ≥ 1.3** [Prys-Roberts 1971 (BJA 43:531): untreated hypertensives show an exaggerated pressor response to
     laryngoscopy, ≈ 2× the normotensive]; the healthy arm's own +20–30 band is case 1's and is not restated here.
     **Measured on `origin/main` 66e3052 (this fixer, before Task 10 — the CM audit's own cell CM-03c):** ΔMAP
     untreated **+10.8**, healthy **+9.1**, **ratio 1.19** (ΔHR 7 vs 6) — TW, below 1.3. Task 10's surge raises both
     arms; whether it raises the hypertensive's MORE is what this case measures, and the mechanism that would is the
     hypertensive's higher resting sympathetic tone and stiffer arteries — **the tone half is research/19's C1, which
     FU-8 Part B owns (Requests → FU-8 item 2), not FU-7**. So: measure the ratio on the merged tree with Task 10
     applied; **write the case as `it.fails` with the measured ratio in its title** ("untreated HTN / healthy ΔMAP ratio
     ≥ 1.3 (Prys-Roberts 1971): measured <ratio>; the resting-tone half is FU-8 Part B's C1") unless the measurement
     reaches 1.3, in which case it is written as `it`. **Do not** raise 7e's gains, the `htn` profile's set point or
     `SURGE_SET_PER_NOX` to reach it (the first is forbidden by this task's preamble, the second is 7a's profile under
     someone else's ownership, the third is a calibrated constant), and do not widen the 1.3 bound. Step 6 re-runs
     CM-03c so the gate note §5 carries the before (1.19) and after numbers, and the arm's own absolute ΔMAP values are
     reported beside case 1's so an improvement in both with an unchanged ratio is visible rather than hidden.
  1c. **"surgical incision under sevoflurane without opioid raises MAP 20–30 mmHg" (ET amendment; research/14-coverage
     ET-16a — a NEW acceptance arm; the `stimulus` is the incision, not laryngoscopy).** This is ET-16a's rig, in the
     test:
     - the ventilated adult 40 y under sevoflurane GA;
     - `stimulus` 1.0 (incision) at +10 min, HELD;
     - fentanyl 0, 2 or 5 µg/kg 1 min before;
     - ΔMAP is the peak over the first 5 min after the incision, against a no-stimulus control arm at the incision
       time.

     Assertions:
     - **no opioid: ΔMAP 20–30 mmHg.** The source is ET-16a's band: Shribman 1987 via R51 addendum 25. Shribman
       measured laryngoscopy, and the incision-specific magnitude is put to Ali (Q17). Under R45 the band is asserted
       as written.
     - **fentanyl 2 and 5 µg/kg: ΔMAP smaller in dose order** (direction: Desborough 2000).

     Measured before (`origin/main` 7954933, ET runner): **+7.7 mmHg** (ΔHR +6). Adrenaline rises ×2.6 and
     noradrenaline ×1.8 (PL), but the surge acts only through 7e's multipliers, which FU-4's output cap limits.
     **Measured with Tasks 1–10 applied** (the RH/ET-amendment fixer, same base, Task 9–10's stale anchors re-anchored
     by hand; "Find-block verification → RH/ET amendment"):
     - no opioid: **ΔMAP +19.1**, ΔHR +13;
     - fentanyl 2 µg/kg: +6.7;
     - fentanyl 5 µg/kg: −6.8 (ΔHR −22);
     - the catecholamine ratios are unchanged (adrenaline ×2.56, noradrenaline ×1.76).

     So write the no-opioid assertion as **`it.fails` "incision under sevoflurane, no opioid: ΔMAP +20–30 (ET-16a):
     measured +19.1"**, and the dose-order assertion as `it` (19.1 > 6.7 > −6.8). If the merged tree reaches 20, the
     assertion is written as `it`.

     **Do not** raise `SURGE_NE_GAIN` or `SURGE_SET_PER_NOX` to reach it. Both are fitted to case 1, and 0.6 → 1.0 already
     puts case 1 at +33.2, above its band. **Do not** re-scale the `stimulus` intensity (7e's one shape, R51
     addendum 12). The 0.9 mmHg remainder is reported in the gate note §5 with the merged-tree number.
  2. **"fentanyl 3 µg/kg blunts it"** — ratio to case 1 **0.2–0.7** [M10 ch. 22; Shribman 1987]. **Addendum 25: MAP
     0.23 ✓ (HR 0.24)** → `it`. (Reset alone: 0.06 — the hypnotic term of `antinoc` abolished the surge; D16's corrected
     fentanyl MAC weight and Step 1c's opioid-only release blunting are the two fixes.)
  3. **"labetalol 10 mg blunts it"** — ratio **0.2–0.8** [Inada 1989; the audit's DI-08 band]. Measured before: 0.98.
     **Addendum 25: 0.94** (HR 0.65) → `it.fails` "(measured 0.94: the circulating noradrenaline acts through α and the
     reset set point is reached through the α limb; labetalol 10 mg's α share is small)".
  4. **"esmolol 1 mg/kg blunts the HR component more than the MAP component"** — ΔHR ratio ≤ 0.5, ΔMAP ratio ≤ 0.9
     [T6.2; the classic teaching]. **Addendum 25: HR 0.53, MAP 0.99** — the direction holds → `it` for "ΔHR ratio <
     ΔMAP ratio" (0.53 < 0.99) and `it.fails` for the two bounds with the numbers (HR 0.53 is 0.03 over its bound).
  5. **"IV lidocaine 1.5 mg/kg blunts it"** — ratio **0.4–0.9** [Lin 2016]. **Addendum 25: 0.86 ✓** (HR 0.94) → `it`.
  6. **"the surge does not move a resting patient's set point"** — with no stimulus, `baro.set` is within 1 mmHg of its
     value at 300 s over 10 min (a regression guard on FU-4's resetting).
  7. **Guard cases — a CONDITION's or a DRUG's sympathetic activity never resets the set point (Orchestrator ruling
     (FU-7 review) 1).** Each arm runs 20 min (MODELED, the ventilated rig, no stimulus) and asserts that
     `endo.core.out.surgeF` stays exactly 1 (± 1e-9) at every sample — so `hemo.circ.baro.set` follows exactly the
     trajectory it has without FU-7 (the surge is FU-7's ONLY path to the set point) — and that `baro.set` stays within
     **1 mmHg** of the same arm run with `ext.surgeF` forced to 1 (a test-only seam: the arm's engine is stepped with
     `ps.hemo.circ.ext.surgeF` overwritten to 1 after every advance; the measured difference is 0.0 by construction and
     the assertion guards against a future path that bypasses `h.surge`):
     (a) **septic shock, grade 3** (`condition sepsis` severity 1) — `extraSymp` 0.3–0.7;
     (b) **anaphylaxis grade III** (`condition anaphylaxis` grade 3) — the collapse must not be "defended" at a higher
     pressure;
     (c) **untreated MH** (the thermal MH trigger with no dantrolene) — `2·mhActivity` would have been ×1.24;
     (d) **ephedrine 10 mg** and (e) **ketamine 1.5 mg/kg** — 7g's `sympDrive` (Task 9) enters `extraSymp`, never
     `h.surge`, so the indirect sympathomimetics are not self-amplifying;
     (f) **hypoglycaemia** (insulin 40 U IV at 60 s, 60 min; glucose nadir 32 mg/dL) — 7e's hypoglycaemic sympathetic
     term enters `extraSymp` only.
     Under addendum 25 each arm ALSO asserts `endo.core.out.surgeCat` is exactly `{ ne: 0, epi: 0 }` at every sample
     (the circulating release is `h.surge`'s too).
     **Measured (third fixer, addendum 25, main + FU-4 e3eeb56 + Tasks 1–10; 5 s samples, the forced arm stepped with
     `ext.surgeF = 1`):** `h.symp` max sepsis 0.50 / anaphylaxis III 0.50 / MH 2.00 / ephedrine 0.78 / ketamine 1.05 /
     hypoglycaemia 1.99 — and in all six arms `|surgeF − 1|` max **0**, `surgeCat` max **0 / 0**, |Δset| max **0.000
     mmHg**, |ΔMAP| max **0.000** against the forced arm. First fixer (reset only, b675248): the same zeros in arms a–e.
     The `h.symp`-driven variant the review rejected, run by the first fixer: sepsis `surgeF` 1.06 (set +5.7 mmHg, MAP
     +4.7), anaphylaxis III 1.06 (+5.5), untreated MH **1.24 (set +22.9 mmHg, MAP +7.3)**, ephedrine 1.093 (+8.9),
     ketamine 1.124 (+11.8).
- [x] **Step 6 — the audit cell.** `npx -y pnpm@9.15.9 run audit:drugs DI-08 DI-04a DI-57 DI-21 DI-80`. Expected from
the third fixer's addendum-25 prototype: DI-08 (the audit's own rig and bands — see "Prototype — second fixer") with the
labetalol `ratio` still outside 0.2–0.8 → the cell stays non-PL on that item; report both numbers; the cell's verdict is
the worse item (research/12 §2.2), and the gate note names the mechanism (the release and the reset act through α).
DI-04a/57/21/80 must read EXACTLY the Task 9 numbers (the guard of ruling 1: Task 10 does not move them — the guard arms
measure `surgeF` 1 and `surgeCat` 0 exactly for ephedrine and ketamine); any difference is a path from
`sympDrive`/`extraSymp` into `h.surge` and stops the task.
**Also run the CM cell this task owns (CM amendment, finding 4):**
```
cd research/19-audit-scripts
CM_OUT=<scratchpad>/fu-7-task10/cells.json PME_ENGINE=<wt>/packages/engine-core/src/index.ts ./run.sh cli.ts CM-03c
```
Before: `dMapU` 10.8, `dMapA` 9.1, `ratio` 1.19 (TW, on main 66e3052). The gate note §5 records the after numbers for
all three; the cell's `dMapA` item is case 1's band (expected PL after Task 10) and its `ratio` item is case 1b's — if
`ratio` is still under 1.3 the cell stays TW on that item and the note names C1 / FU-8 Part B as the owner of the
remaining gap. The cell is a MEASUREMENT here, never a reason to move a constant.
**Also run the ET cell case 1c mirrors (ET amendment):**
`cd research/14-coverage-et-scripts && ET_OUT=<scratchpad>/fu-7-task10/et.json PME_ENGINE=<wt>/packages/engine-core/src/index.ts ./run.sh cli.ts ET-16a`.
- Before (main 7954933): `dMapF0` 7.69, `dMapF2` 2.14, `dMapF5` −9.36, `epiRatioF0` 2.57, `epiBluntF5` 0.96.
- Amendment prototype: 19.14 / 6.73 / −6.8 / 2.56 / 0.96.

The gate note §5 records the after numbers. The cortisol and glucose items (`cort4hF2` 1501, `dGlu2hF2` 1.28) must
not move by more than 2 %, because the surge adds no cortisol path.
- [x] **Step 7 — commit.** `feat(7e): the stimulus sympathetic surge resets the baroreflex set point (R51 addendum 22)`, push.

---

### Task 11: Antiarrhythmic conversion as a hazard; the accessory-pathway hazard (addendum 23; 7g; UNPROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/l2/pk/hooks.ts` (the conversion hazards; FU-4 changed this file's signature — see
  Task 0)
- Modify: `packages/engine-core/src/l2/pk/data/rows-cardiovascular.ts` (amiodarone/lidocaine `antiarrhythmic` entries;
  procainamide and verapamil rows)
- Modify: `packages/engine-core/src/l2/pk/row.ts` (`PdTarget` += `'antiarrhythmic'`), `combine.ts` (publish
  `bus.rhythm.antiarrhythmicU`), `types-pk.ts` (`rhythm: { antiarrhythmicU: number }`)
- Modify: `packages/engine-core/src/engine.ts` (**E-FU7-7**: the hook call already exists — no new line unless FU-4's
  `outcomeRng` parameter is absent)
- Test: create `packages/engine-core/test/l2/pk/antiarrhythmic.test.ts`

**Interfaces:** `bus.rhythm.antiarrhythmicU` (0–1, potency-weighted occupancy: amiodarone, lidocaine, procainamide) —
read by `hooks.ts` for conversion and by Task 12's shock outcome. The hook keeps FU-4's
`rhythmRequest(pk, hs, current, t, outcomeRng?)` signature and its `{ id, opts, hold? }` return.

**Why / measured (audit D7, P1):** `hooks.ts` has conversion paths for adenosine, LAST and magnesium only, so
amiodarone 300 mg during VF (DI-13a) and lidocaine or amiodarone for stable monomorphic VT (DI-61) never convert
anything, and adenosine in pre-excited AF (DI-14c) cannot accelerate the accessory pathway.

**Sources and the probabilities they set (per drug, as hazards over the drug's clinical window):**
- **amiodarone, stable monomorphic VT:** PROCAMIO (Ortiz 2017) — amiodarone terminated VT in **25 %** at 40 min
  (procainamide 67 %). λ from 0.25 over 40 min → `λ_amio_vt = −ln(0.75)/2400 s⁻¹`.
- **procainamide, stable monomorphic VT:** PROCAMIO **67 %** at 40 min → `λ_proc_vt = −ln(0.33)/2400`.
- **lidocaine, stable monomorphic VT:** ALS/ACLS and Gorgels 1996 (lidocaine ≈ 20 % vs procainamide 80 %) → **20 %** at
  20 min → `λ_lido_vt = −ln(0.8)/1200`.
- **amiodarone, recent-onset AF:** meta-analyses give ≈ **60–70 %** at 24 h but ≈ **25 %** within the first hour
  (Letelier 2003) → `λ_amio_af = −ln(0.75)/3600`.
- **VF during CPR:** amiodarone does NOT convert VF by itself (ARREST 1999, ALPS 2016 — it raises survival to admission
  and shock success, not spontaneous conversion), so **λ_amio_vf = 0**; the drug acts through Task 12's shock success.
  This is the audit's D7 answer and the reason the two tasks are split.
  **DV amendment note (research/20 §4 finding 6, 2026-09-29):** the devices run (65 cells, `origin/main` 3feee6f) is
  consistent with `λ_amio_vf = 0`. No DV cell contradicts it:
  - no DV cell gives an antiarrhythmic in VF and expects conversion without a shock;
  - every VF termination DV measures comes from a shock (DV-01a/b/c, DV-24a/b, DV-25a) or from the FU-4 physiology
    (the K⁺ hazard re-fibrillating a forced rhythm, DV-25a).

  Amiodarone's VF effect stays Task 12's `AA_ROSC_GAIN` on the shock. DI-13a (MI) remains its acceptance cell, and no
  DV cell is added to Task 11. A note only; no code changes.
- Each hazard is scaled by the drug's own occupancy `u = hill(c, ec50)` from its `antiarrhythmic` PD entry, so a
  sub-therapeutic level converts nothing.

- [x] **Step 1 — the occupancy output (real blocks, review F13).** In `packages/engine-core/src/l2/pk/row.ts`, find
(Task 10's line):

```ts
  | 'antinocAdd';
```

Replace with:

```ts
  | 'antinocAdd'
  /** FU-7 (addendum 23): class-weighted antiarrhythmic occupancy 0–1 → `bus.rhythm.antiarrhythmicU`, read by the
   * conversion hooks and by the shock outcome (Task 12). */
  | 'antiarrhythmic';
```

In `packages/engine-core/src/types-pk.ts`, find:

```ts
  avNodeBlock: number; // adenosine/β/Ca-channel AV-nodal effect 0–1
}
```

Replace with:

```ts
  avNodeBlock: number; // adenosine/β/Ca-channel AV-nodal effect 0–1
  /** FU-7 (addendum 23): potency-weighted antiarrhythmic occupancy (amiodarone, lidocaine, procainamide), 0–1. */
  rhythm: { antiarrhythmicU: number };
}
```

and find:

```ts
  avNodeBlock: 0,
};
```

Replace with:

```ts
  avNodeBlock: 0,
  rhythm: { antiarrhythmicU: 0 }, // FU-7 (addendum 23)
};
```

In `packages/engine-core/src/l2/pk/combine.ts`, find:

```ts
  bus.avNodeBlock = occ.avNode as number;
```

Replace with:

```ts
  bus.avNodeBlock = occ.avNode as number;
  bus.rhythm = { antiarrhythmicU: Math.min(1, Math.max(0, other.antiarrhythmic ?? 0)) }; // FU-7 (addendum 23)
```

(The hooks keep their per-drug view through `concOf(pk, id)`, as they already do for adenosine and magnesium.)
- [x] **Step 2 — the rows.** amiodarone (`data/rows-cardiovascular.ts`) gains
`{ target: 'antiarrhythmic', emax: 1, ec50: 1 }` (ec50 = one 150 mg reference dose); lidocaine (`data/rows-other.ts`)
gains `{ target: 'antiarrhythmic', emax: 0.6, ec50: 3 }` (3 µg/mL, the antiarrhythmic plasma range 1.5–5, M10 ch. 25);
a NEW procainamide row:

```ts
  // FU-7 (addendum 23): procainamide — PROCAMIO's comparator (67 % VT termination at 40 min vs amiodarone 25 %), with the
  // hypotension that limits it. Gamma row: peak 10 min after a 10 mg/kg load over 20 min, 10 % at 4 h [label].
  { id: 'procainamide', name: 'Procainamide', cls: 'antiarrhythmic', amountUnit: 'mg', pk: gammaPk(1000, false, 600, 14400),
    pd: [{ target: 'antiarrhythmic', emax: 1, ec50: 1 }, { target: 'svr', emax: -0.25, ec50: 1 }, { target: 'ees', emax: -0.15, ec50: 1 }, { target: 'avNode', emax: 0.2, ec50: 1 }],
    doses: '10 mg/kg IV over 20 min (max 17 mg/kg), stop on hypotension or QRS widening > 50 %',
    onset: 'effect during the infusion, peak ≈ 10 min after it; QRS and QT widen (label)',
    ir: '?', src: 'PROCAMIO (Ortiz 2017); label; sizes [ENG]', tag: 'ENG' },
```

and a NEW verapamil row (DI-15's teaching hazard; D13):

```ts
  // FU-7 (D13, DI-15): verapamil — AV-nodal block with vasodilation; in PRE-EXCITED AF it is the classic hazard
  // (blocking the node favours the accessory pathway: Step 4's rule), and it is contraindicated there (ALS).
  { id: 'verapamil', name: 'Verapamil', cls: 'antiarrhythmic', amountUnit: 'mg', pk: gammaPk(5, false, 300, 7200),
    pd: [{ target: 'avNode', emax: 0.7, ec50: 1 }, { target: 'svr', emax: -0.3, ec50: 1 }, { target: 'ees', emax: -0.2, ec50: 1 }, { target: 'hr', emax: -0.15, ec50: 1 }],
    doses: '2.5–5 mg IV over 2 min, repeat to 20 mg (SVT rate control)', onset: 'onset 1–2 min, peak 3–5 min, 30–60 min',
    ir: '?', src: 'label; T6.2 [TXT]; sizes [ENG]', tag: 'ENG' },
```

- [x] **Step 3 — the conversion hazards, on FU-4's 18f signature with a NUMBERED fallback (review F6; Orchestrator
ruling (FU-7 review) 5; D18).** The blocks below match the signature on `origin/main` AND on
`origin/fu-4-integration-polish` up to b675248 (18f not landed: `rhythmRequest(pk, hs, current, t)` returning
`{ id, opts } | null`), and their replacement IS 18f's signature plus FU-7's `pulseless`:
  - **3a. If FU-4's 18f HAS landed** (Task 0 Step 5 recorded `outcomeRng?`/`hold?` in the signature), the signature find
    below misses: re-anchor on `export function rhythmRequest(` and make the line read exactly as the replacement
    (keep 18f's `outcomeRng?: Sfc32State` and `hold?: boolean`, add `pulseless?: boolean` to `current`); skip the import
    block if 18f already imports `uniform`/`Sfc32State`; the engine block below then re-anchors on 18f's call (which
    already passes `ps.rng.outcome`) and only ADDS `pulseless`.
  - **3b. If 18f has NOT landed,** apply the blocks as written: FU-7 introduces `outcomeRng?` and `hold?` itself (the
    same names and types 18f uses, so a later 18f merge is a no-op on the line) and the engine passes `ps.rng.outcome`
    — the SAME stream `engine.ts` hands the device host (`outcomeRng: ps.rng.outcome`), so replay stays exact.
  - **3c. The call site** is the ONE `rhythmRequest(` call in `engine.ts` (anchor below).
  - **3d. New `RhythmHookState` fields are OPTIONAL** (`conv?`, `preexcited?`) and initialised on first use
    (`hs.conv ??= { lastT: t }`), because the hook state is serialised and a snapshot written before FU-7 lacks them.
  - **PROCAMIO check (ruling 6; review Q10) — before fixing `L_AMIO_VT`:** quote the paper's amiodarone termination
    figure in the constant's comment. The plan's 25 % at 40 min is the writer's reading; the reviewer recalls **38 %**.
    If the paper says 38 %, `L_AMIO_VT = −ln(0.62)/2400` and the Step 5 band becomes the analytic share for 0.38 ± 0.07.
  - **Conversion needs a PERFUSING rhythm (ruling 5):** `current.pulseless === true` (pulseless VT, VF) returns before
    the hazards — that is Task 12's shock path; `λ_amio_vf = 0` stands.

In `packages/engine-core/src/l2/pk/hooks.ts`, the import, find:

```ts
import { hill } from './pd.ts'; // FU-2 (E-FU2-7)
```

Replace with:

```ts
import { hill } from './pd.ts'; // FU-2 (E-FU2-7)
import { uniform, type Sfc32State } from '../../rng/sfc32.ts'; // FU-7 (addendum 23): the `outcome` stream (FU-4 18f's type)
```

the state, find:

```ts
  mgDone: boolean;
}
```

Replace with:

```ts
  mgDone: boolean;
  /** FU-7 (addendum 23): the last conversion-hazard evaluation time (s) — optional: a pre-FU-7 snapshot lacks it (3d). */
  conv?: { lastT: number };
  /** FU-7 (addendum 23 / DI-14c): the accessory-pathway acceleration has fired for this block (reset below 0.3). */
  preexcited?: boolean;
}
```

the signature (3a/3b), find:

```ts
export function rhythmRequest(pk: PkState, hs: RhythmHookState, current: { id: RhythmId; pinned: boolean }, t: number): { id: RhythmId; opts: RhythmOpts } | null {
  void t;
```

Replace with:

```ts
export function rhythmRequest(pk: PkState, hs: RhythmHookState, current: { id: RhythmId; pinned: boolean; pulseless?: boolean }, t: number, outcomeRng?: Sfc32State): { id: RhythmId; opts: RhythmOpts; hold?: boolean } | null {
```

and the hazards, AFTER the adenosine block and BEFORE the LAST block — find:

```ts
  // LAST
  const cv = pk.bus.last.cvE;
```

Replace with:

```ts
  // FU-7 (addendum 23 / DI-14c): AV-nodal block in PRE-EXCITED AF favours the accessory pathway — the rate RISES and VF
  // may follow (ALS; M10 ch. 25). The teaching hazard adenosine, verapamil and diltiazem carry. One VF draw per event
  // at PREEXCITED_VF_P [ENG: the direction is the ALS warning; the size has no source — Q10].
  if (hs.preexcited && pk.bus.avNodeBlock < 0.3) hs.preexcited = false;
  if (current.id === 'preexcitedAf' && pk.bus.avNodeBlock >= 0.5 && !hs.preexcited) {
    hs.preexcited = true;
    if (outcomeRng && uniform(outcomeRng) < PREEXCITED_VF_P) return { id: 'vfCoarse', opts: {}, hold: false };
    return { id: 'preexcitedAf', opts: { rateBpm: 220 }, hold: false };
  }
  // FU-7 (addendum 23): antiarrhythmic conversion as a HAZARD per second, scaled by the drug's own occupancy — ONLY in a
  // PERFUSING rhythm (ruling 5): pulseless VT/VF is Task 12's shock path, and amiodarone does not convert VF by itself
  // (ARREST 1999, ALPS 2016: λ_vf = 0). Sources on the constants below.
  hs.conv ??= { lastT: t }; // 3d: a pre-FU-7 snapshot
  const dt = Math.max(0, t - hs.conv.lastT);
  hs.conv.lastT = t;
  if (dt > 0 && outcomeRng && current.pulseless !== true) {
    const u = (id: string, ec50: number) => hill(concOf(pk, id), ec50, 1);
    const lam = VT_RHYTHMS.includes(current.id)
      ? L_AMIO_VT * u('amiodarone', 1) + L_PROC_VT * u('procainamide', 1) + L_LIDO_VT * u('lidocaine', 3)
      : ATRIAL.includes(current.id)
        ? L_AMIO_AF * u('amiodarone', 1) + L_PROC_VT * 0.5 * u('procainamide', 1)
        : 0;
    if (lam > 0 && uniform(outcomeRng) < 1 - Math.exp(-lam * dt)) return { id: 'sinus', opts: { rateBpm: 80 }, hold: false };
  }
  // LAST
  const cv = pk.bus.last.cvE;
```

with the constants above the function — find:

```ts
export function rhythmRequest(pk: PkState, hs: RhythmHookState, current: { id: RhythmId; pinned: boolean; pulseless?: boolean }, t: number, outcomeRng?: Sfc32State): { id: RhythmId; opts: RhythmOpts; hold?: boolean } | null {
```

Replace with:

```ts
/** FU-7 (addendum 23) conversion hazards, /s, at full occupancy; λ = −ln(1 − p)/T. PROCAMIO (Ortiz 2017): amiodarone
 * and procainamide termination of stable monomorphic VT at 40 min — the executor QUOTES the paper's amiodarone figure
 * here before fixing L_AMIO_VT (25 % as written; 38 % if the paper says so — Step 3's PROCAMIO check); Gorgels 1996:
 * lidocaine ≈ 20 % at 20 min; Letelier 2003: amiodarone ≈ 25 % of recent-onset AF within 1 h. */
export const L_AMIO_VT = -Math.log(0.75) / 2400;
export const L_PROC_VT = -Math.log(0.33) / 2400;
export const L_LIDO_VT = -Math.log(0.8) / 1200;
export const L_AMIO_AF = -Math.log(0.75) / 3600;
/** FU-7 (DI-14c): VF on an AV-nodal block of pre-excited AF, per event [ENG — Q10, R44 calibration]. */
export const PREEXCITED_VF_P = 0.2;
const VT_RHYTHMS: readonly string[] = ['vtMono'];

export function rhythmRequest(pk: PkState, hs: RhythmHookState, current: { id: RhythmId; pinned: boolean; pulseless?: boolean }, t: number, outcomeRng?: Sfc32State): { id: RhythmId; opts: RhythmOpts; hold?: boolean } | null {
```

In `packages/engine-core/src/engine.ts` (**E-FU7-7**; 3c), find:

```ts
    const req7g = rhythmRequest(ps.pk, ps.pkHooks, { id: ps.rhythm.id, pinned: false }, end / ECG_RATE); // Stage 7g
```

Replace with:

```ts
    // FU-7 (addendum 23; ruling 5): the hook needs to know whether the rhythm PERFUSES (the device host's own definition,
    // plus FU-4's arrest state) and the `outcome` stream for its hazards (FU-4 18f passes the same stream)
    const pulseless7g = ps.rhythm.opts.pulseless === true || ((circ7g as { arrest?: unknown } | undefined)?.arrest ?? null) !== null;
    const req7g = rhythmRequest(ps.pk, ps.pkHooks, { id: ps.rhythm.id, pinned: false, pulseless: pulseless7g }, end / ECG_RATE, ps.rng.outcome); // Stage 7g
```

(`circ7g` is the MODELED circulation the preceding lines already use; in MANUAL it is undefined and the rhythm's own
`pulseless` option decides.)
- [x] **Step 5 — the test.** Create `test/l2/pk/antiarrhythmic.test.ts` with a deterministic seed and a pinned
`outcomeRng`: (1) the hazard constants reproduce their trial numbers (`1 − e^{−λ·T}` equals 0.25 / 0.67 / 0.20 / 0.25
to 1e-9); (2) with amiodarone at full occupancy, 200 repeated 1 s evaluations convert VT in **20–35 %** of 200 seeded
runs (PROCAMIO's 25 % at 40 min scaled to the window — assert the empirical share against the analytic one within
±0.07); (3) a sub-therapeutic lidocaine level (0.3 µg/mL) never converts; (4) amiodarone during VF never converts
(λ = 0); (4b) a PULSELESS VT (`current.pulseless: true`) at full amiodarone/procainamide occupancy never converts in 200
seeded runs (ruling 5); (4c) a hook state WITHOUT `conv`/`preexcited` (a pre-FU-7 snapshot) runs without throwing (3d);
(5) pre-excited AF + adenosine raises the rate to ≥ 200 or produces VF (seeded share of VF ≈ `PREEXCITED_VF_P`); (6)
adenosine, magnesium and LAST paths are unchanged (the existing `hooks.test.ts` stays green).
(Step 4 of the first draft — the accessory-pathway hazard — is now inside Step 3's hazards block.)
**AF-rig guard (CM amendment, research/19 finding 5 / gap C3 — read Task 0 Step 6b first).** Cases (5) and any
whole-engine AF arm this task adds run in atrial fibrillation, and until FU-8 Part A's end-diastolic-pressure fix is on
the tree a fast-AF rig deteriorates on its own (CM-15c: a healthy 40 y in AF 150 loses contractility within minutes).
If Task 0 Step 6b reported the check as FAILED: keep every AF window **under 5 minutes** of simulated time, add to each
AF case a **control arm** (same rhythm, no antiarrhythmic, no shock) asserting `kIsch` **≥ 0.9** at every sample of the
window as a precondition, title the case "(AF rig guarded: C3 pending)", and list it with its measured control-arm
`kIsch` in the gate note §5. The conversion shares are never re-fitted to a failing heart: if a guarded control arm
cannot hold 0.9, the case becomes an `it.fails` naming C3 / FU-8 Part A.
- [x] **Step 6 — the cells.** `npx -y pnpm@9.15.9 run audit:drugs DI-61 DI-13a DI-14c DI-15 DI-13b DI-14a DI-14b DI-54`
(DI-15 added, review F20: verapamil + the accessory-pathway rule are the reason verapamil joins — NE → PL).
Expected: DI-61 **MI → PL** (either drug converts a share), DI-14c **MI → PL** (acceleration), DI-13a stays **MI until
Task 12** (the shock term is there, not here — the gate note says so), DI-13b/14a/14b/54 unchanged (regression).
- [x] **Step 7 — commit.** `feat(7g): antiarrhythmic conversion hazards and the pre-excited-AF hazard (R51 addendum 23)`, push.

---

### Task 12: Defibrillation and cardioversion success become state-dependent (addendum 23; L3 under E-FU7-6; outcome-table numbers PROTOTYPED by the DV amendment, the rest UNPROTOTYPED)

> **DV amendment (2026-09-29, research/20 §4 "Findings for FU-7", cells DV-01a/b/c, DV-06a–c, DV-24a/b, DV-25a).**
> Folded in before execution. It changes six things in this task:
> - **(a) the base VF termination** is re-sourced to the biphasic first-shock literature (Step 0);
> - **(b) a temperature factor** is added on termination below 30 °C;
> - **(c) the CoPP factor acts only in the circulatory phase** (the CPR × ischaemia-time interaction);
> - **(d) cardioversion success depends on rhythm and energy** instead of one flat 0.8;
> - **(e) CoPP is read only from the continuous no-beat value**, never from a beat's minimum;
> - **(f) ROSC is measured end to end** (Step 7a), with the arrest-clock arm restricted to engine-declared arrests
>   unless FU-8 Part A's V1 fix is on the base (Task 0 Step 6c).
>
> The table numbers below were prototyped on `origin/main` 2c49d87 (FU-3/4/5 merged) with the DV runner
> (`research/20-audit-scripts/`); see "Prototype — DV amendment" at the end of this task.

**Files:**
- Modify: `packages/engine-core/src/l3/defib-pacer/outcome.ts` (**E-FU7-6**: `VF_TABLE`, `ShockContext` +
  `outcomeProbabilities`, the cardioversion curve)
- Modify: `packages/engine-core/src/l3/device-layer.ts` (**E-FU7-6**: fill the new fields from the host)
- Modify: `packages/engine-core/src/engine.ts` (**E-FU7-7**: ONE accessor on the device host)
- Modify: `packages/engine-core/test/l3/defib-pacer/outcome.test.ts` (**E-FU7-6**, DV amendment: Stage 4's
  outcome-table test follows the re-sourced `VF_TABLE`. This is a re-sourcing of the table, not a widening: the ±2 %
  tolerance and the 10,000 seeds stay.)
- Test: create `packages/engine-core/test/l3/shock-state.test.ts`

**Merge discipline:** FU-5 owns `l3/**`. Run `git fetch origin && git merge origin/main` IMMEDIATELY before this task
and re-run FU-5's device tests (`test/l3/**`, `test/engine/device*.test.ts`) after it.

**Interfaces:** `ShockContext` gains seven OPTIONAL fields:
- `antiarrhythmicU` (0–1, `pk.bus.rhythm.antiarrhythmicU`);
- `kEcg` (mmol/L, 7c's membrane-effective K⁺; FU-4 already publishes it as `circ.ext.kEcg`);
- `ph` (7c);
- `cppMmHg`: FU-4's CONTINUOUS no-beat CoPP, read from `cor.cpp` ONLY while the heart has no beat (DV amendment (e));
- `arrestS`: seconds since the arrest began. `vfDurationS` already carries the VF clock; `arrestS` is the ARREST clock
  FU-4's machine keeps, and it exists only for engine-declared arrests until FU-8 Part A lands (Task 0 Step 6c);
- `tempC` (core temperature, `resp.temp.tc`; DV amendment (b));
- `rhythmId` (the shocked rhythm, from the device host; DV amendment (d)).

Absent state fields give today's STATE-FREE behaviour. The base `VF_TABLE` itself is re-sourced in Step 0, so a
state-free VF shock terminates 90 % instead of 70 %; that is the one deliberate change to the pre-FU-7 numbers.

**Why / measured (audit D7):** `outcomeProbabilities` depends on the rhythm class, the energy, the VF duration and
R-on-T only. During CPR with amiodarone 300 mg on board (DI-13a) nothing changes; a hyperkalaemic or acidotic arrest
shocks as well as a fresh one.

**Why / measured (DV run, research/20 §2.1, §2.3, §2.8; `origin/main` 3feee6f, 40 seeds per arm):**
- DV-01a: the first biphasic shock terminates VF in **65 %** of seeds (table 70 %) at 150 J and at 200 J.
- DV-01c: the ROSC share is 5 % after 8 min of VF with or without 3 min of CPR first.
- DV-24a/b: 28.5 °C terminates 60 %, as 37 °C does, and rewarming to 33 °C changes nothing.
- DV-25a: at K⁺ 9.5 the ROSC share (7.5 %) equals normokalaemia's.
- DV-06a–c: cardioversion is one 0.8 for AF, flutter and VT, at 20 J as at 200 J.

**Sources for each factor (multiplicative on `rosc`, then renormalised against `asystolePea`):**
- **antiarrhythmic:** ALPS (Kudenchuk 2016) and ARREST (Kudenchuk 1999) — amiodarone raises survival to hospital
  admission (44.3 % vs 34.6 %, ARREST) and shock-refractory VF termination; ALPS gives a survival ratio ≈ 1.2–1.3 →
  `×(1 + 0.3·antiarrhythmicU)`.
- **potassium:** severe hyperkalaemia makes defibrillation ineffective until it is treated (UK Renal Association;
  the K⁺ arrest mechanism FU-4 added) → `× clamp(1 − 0.25·(kEcg − 6)⁺, 0.2, 1)`.
- **acidosis:** pH < 7.2 lowers shock success (ALS reversible causes; Weisfeldt's three-phase model) →
  `× clamp(1 − 1.5·(7.2 − pH)⁺, 0.3, 1)`.
- **coronary perfusion pressure:** CPP ≥ 15 mmHg predicts ROSC (Paradis 1990: no ROSC below 15) →
  `× clamp(cppMmHg/20, 0.2, 1.3)` with the ratio capped so good CPR HELPS (Paradis: mean CPP 25 in ROSC vs 8 without).
  **DV amendment (c): only in the circulatory phase.** The factor applies only when the arrest has lasted
  ≥ `CIRCULATORY_PHASE_S` = 240 s. That is `vfDurationS` for VF, else `arrestS`; with neither known the factor is 1.
  - Weisfeldt ML & Becker LB, JAMA 2002;288:3035: in the ELECTRICAL phase (0–4 min) an immediate shock succeeds and
    perfusion before it adds nothing. In the CIRCULATORY phase (4–10 min) perfusion before the shock is what makes it
    succeed.
  - Cobb LA et al., JAMA 1999;281:1182 and Wik L et al., JAMA 2003;289:1389: CPR before the shock improves outcome only
    when the response interval is > 4–5 min.
  - Without the gate, an electrical-phase shock with no CPR (CoPP ≈ 0–5) would lose 80 % of its ROSC share, which
    reverses Weisfeldt's first phase.
  - This is the task's **CPR × ischaemia-time factor** (DV finding 2). The ischaemia-time term alone is already
    present: `VF_DURATION_FACTORS` (the same Weisfeldt source) for VF, and `arrestS` below for a shocked non-VF arrest.
    No third duration term is added.
- **arrest duration:** the three-phase model is already in `VF_DURATION_FACTORS` for VF; `arrestS` extends it to the
  whole arrest, `× clamp(1 − arrestS/1800, 0.2, 1)` [ENG, bounded by the existing table so the two do not double-count:
  the duration factor is applied ONLY when `vfDurationS` is 0, i.e. a non-VF arrest that was shocked].
  - **DV amendment (f):** in practice this arm is reached only by a pulseless VT, polymorphic VT or torsades. The VF
    clock (`device-layer.ts` `VF_RHYTHMS`) covers `vfCoarse`/`vfFine` only, and `outcomeProbabilities` returns
    `unchanged` for the `arrest` class before any factor.
  - `arrestS` exists only when `circ.arrest` does. Today that means an ENGINE-DECLARED arrest; see Task 0 Step 6c for
    instructor- and shock-made pulseless rhythms.
- **base VF termination (DV amendment (a), research/20 DV-01a and §4 finding 2).** `VF_TABLE.persistent` 0.3 (70 %
  termination) is the monophasic-era figure. The biphasic first-shock literature:
  - Schneider T et al., Circulation 2000;102:1780 (ORBIT, 150 J biphasic): **96 %**.
  - van Alem AP et al., Resuscitation 2003;58:17: biphasic **98 %** vs monophasic 69 %.
  - Stiell IG et al., Circulation 2007;115:1511 (BIPHASIC, 200 J first shock): ≈ **88–90 %**.

  These give **85–98 %** [VERIFY exact figures — research/20 §8 Q9]. TERMINATION here means VF removed for ≥ 5 s
  (the trials' definition); it is NOT ROSC:
  - van Alem 2003 found biphasic termination far higher but ROSC and survival no different;
  - the post-shock rhythm is mostly asystole or a non-perfusing organised rhythm, and CPR resumes at once (ERC 2021 ALS).

  The re-sourced table is therefore `{ persistent: 0.1, asystolePea: 0.8, rosc: 0.1 }`: 90 % termination, the
  midpoint of the sourced range. The ROSC share stays at the brief §6.5 value 0.1, and the extra 0.2 of termination
  goes to asystole/PEA. The 50/50 asystole/PEA split (`ASYSTOLE_SHARE`) is unchanged; research/20 §8 Q2 asks Ali
  whether more should land in PEA. This supersedes brief §6.5's `persistent 0.3` row. The gate note §5 names it for
  Ali (research/20 §8 Q2), and Stage 4's test follows it (Step 0).
- **temperature (DV amendment (b), DV-24a/b).** VF below 30 °C is often refractory to shocks:
  - ERC 2021 special circumstances (Lott C et al., Resuscitation 2021;161:152): if three shocks fail below 30 °C,
    delay further attempts until the core is > 30 °C;
  - Danzl DF & Pozos RS, NEJM 1994;331:1756; Brown DJA et al., NEJM 2012;367:1930.

  The factor multiplies the whole TERMINATION (both `rosc` and `asyPea`, the same place as `LOW_ENERGY_TERMINATION`):
  `× clamp(1 − 0.3·(30 − tempC)⁺, 0.2, 1)`.
  - It gives 1 at ≥ 30 °C, 0.55 at 28.5 °C (termination 90 → 49.5 %) and the floor 0.2 below ≈ 27.3 °C.
  - The magnitude is [ENG]: the sources give the direction and the 30 °C threshold, not a rate. It is one named
    constant pair for Ali's calibration pass.
  - The improved defibrillation at 33 °C in swine (Boddicker KA et al., Circulation 2005;111:3195) is NOT modelled.
    The factor is 1 at ≥ 30 °C, and the gate note records the omission.
- **cardioversion by rhythm and energy (DV amendment (d), DV-06a–c).** The flat `CARDIOVERSION_SINUS` 0.8 becomes a
  per-rhythm energy curve `p(E) = pMax / (1 + (E50/E)²)` in biphasic joules:

  | rhythm (`rhythmId`) | pMax | E50 | p at 20 / 50 / 100 / 120 / 150 / 200 J (prototype) | source |
  |---|---|---|---|---|
  | `afib`, `preexcitedAf` | 0.95 | 70 J | 7.2 / 32.1 / 63.8 / 70.9 / 78.0 / 84.6 % | Page RL et al., JACC 2002;39:1956 (biphasic 100 J ≈ 60 %, success rises with energy to ≈ 90 % cumulative); Mittal S et al., Circulation 2000;101:1282; ERC 2021 ALS (start at 120–150 J, escalate) [VERIFY] |
  | `aflutter`, `svtAvnrt`, `svtAvrt` | 0.97 | 12 J | 71.3 / 91.7 / 95.6 / — / — / — % | ERC 2021 ALS (flutter and paroxysmal SVT convert at lower energy, 70–120 J); Neumar RW et al., Circulation 2010;122:S729 (ACLS: 50–100 J usually sufficient); 2014 AHA/ACC/HRS AF guideline (flutter > 90 %) [VERIFY] |
  | `vtMono` (with a pulse) | 0.97 | 20 J | — / 83.6 / 93.3 / 94.4 / — / 96.0 % | Neumar 2010 (monomorphic VT with a pulse: 100 J, > 90 %); ERC 2021 ALS (120–150 J, escalate) [VERIFY] |
  | any other organised tachycardia, or `rhythmId` absent | 0.8 flat | — | 80 % | the pre-FU-7 `CARDIOVERSION_SINUS` [ENG], kept |

  - E50 and the Hill exponent 2 are [ENG] fits to the sourced points.
  - The AF curve puts 120 J at 71 %, just under the pooled 75–90 % band for 120–200 J; 200 J is at 85 %. Recorded, not
    re-fitted: raising 120 J would put 50 J above the sourced 20–30 %.
  - `atrialTach`, `junctionalTachy` and `mat` keep the flat 0.8. For an automatic focus (MAT, focal AT, junctional
    tachycardia) cardioversion is known to be ineffective (2015 ACC/AHA/HRS SVT guideline). That is a new question for
    Ali (Open questions), not a DV finding.
  - The R-on-T branch (`R_ON_T_VF`) is unchanged.
All factors are `[ENG]` COMBINATIONS of sourced directions; each is one named constant with its citation, and the gate
note lists them for Ali's calibration pass.

- [x] **Step 0 — the re-sourced base table (DV amendment (a)).** In `packages/engine-core/src/l3/defib-pacer/outcome.ts`,
find:

```ts
/** VF / pulseless VT shocked at ≥ the skin's first-shock energy (brief §6.5). */
export const VF_TABLE = { persistent: 0.3, asystolePea: 0.6, rosc: 0.1 } as const;
```

Replace with:

```ts
/** VF / pulseless VT shocked at ≥ the skin's first-shock energy. FU-7 (DV amendment, research/20 DV-01a): biphasic
 * first-shock TERMINATION (VF removed ≥ 5 s) is 85–98 % — Schneider 2000 (ORBIT 150 J 96 %), van Alem 2003 (98 %),
 * Stiell 2007 (≈ 88–90 %) [VERIFY] — so persistent 0.1 (90 %, the midpoint), replacing brief §6.5's monophasic-era 0.3.
 * Termination is not ROSC: the ROSC share stays 0.1 (van Alem 2003: higher termination, no more ROSC); the rest of the
 * termination lands in asystole/PEA, where CPR resumes (ERC 2021 ALS). */
export const VF_TABLE = { persistent: 0.1, asystolePea: 0.8, rosc: 0.1 } as const;
```

Then Stage 4's table test follows the table. In `packages/engine-core/test/l3/defib-pacer/outcome.test.ts`, find:

```ts
  it('VF at the default energy: persistent 0.30, asystole/PEA 0.60, ROSC 0.10 — 10,000 seeded shocks within ±2 %', () => {
    const f = freq(VF);
    expect(Math.abs(f.unchanged - 0.3)).toBeLessThan(0.02);
    expect(Math.abs(f.asystole + f.pea - 0.6)).toBeLessThan(0.02);
```

Replace with:

```ts
  // FU-7 (DV amendment): the re-sourced biphasic table — termination 90 % (Schneider 2000; van Alem 2003), ROSC 0.10
  it('VF at the default energy: persistent 0.10, asystole/PEA 0.80, ROSC 0.10 — 10,000 seeded shocks within ±2 %', () => {
    const f = freq(VF);
    expect(Math.abs(f.unchanged - 0.1)).toBeLessThan(0.02);
    expect(Math.abs(f.asystole + f.pea - 0.8)).toBeLessThan(0.02);
```

and find:

```ts
    expect((p5.asystole ?? 0) + (p5.pea ?? 0)).toBeCloseTo(0.65, 10);
    expect(outcomeProbabilities({ ...VF, vfDurationS: 700 }).rosc).toBeCloseTo(0.02, 10);
    const lo = outcomeProbabilities({ ...VF, energyJ: 90 });
    expect(lo.unchanged).toBeCloseTo(0.65, 10);
    const f = freq({ ...VF, energyJ: 90 });
    expect(Math.abs(f.unchanged - 0.65)).toBeLessThan(0.02);
```

Replace with:

```ts
    expect((p5.asystole ?? 0) + (p5.pea ?? 0)).toBeCloseTo(0.85, 10); // FU-7 (DV amendment): 0.8 + 0.1 × (1 − 0.5)
    expect(outcomeProbabilities({ ...VF, vfDurationS: 700 }).rosc).toBeCloseTo(0.02, 10);
    const lo = outcomeProbabilities({ ...VF, energyJ: 90 });
    expect(lo.unchanged).toBeCloseTo(0.55, 10); // FU-7 (DV amendment): 1 − 0.5 × 0.9
    const f = freq({ ...VF, energyJ: 90 });
    expect(Math.abs(f.unchanged - 0.55)).toBeLessThan(0.02);
```

- The ROSC expectations (0.10, 0.05 at 300 s, 0.02 at 700 s) and the cardioversion case (`sinus` 0.8 with no
  `rhythmId`: the flat fallback) are unchanged. The prototype ran the edited file green (4 tests).
- The stale `persistent 0.3` wording in research/20's DV-01a hand note is the audit's own record; FU-7 does not edit
  it. The gate note re-grades DV-01a from the seeded arm (Step 7a).

- [x] **Step 1 — the context.** In `packages/engine-core/src/l3/defib-pacer/outcome.ts`, find:

```ts
export interface ShockContext {
  cls: ShockClass;
  synced: boolean;
  energyJ: number;
  /** The skin's first-shock energy (defib.energyAdultJ). */
  defaultJ: number;
  /** How long VF has run (s), for the three-phase model. */
  vfDurationS: number;
  /** An unsynchronised shock landing within ±40 ms of the last beat's T peak. */
  onTPeak: boolean;
}
```

Replace with:

```ts
export interface ShockContext {
  cls: ShockClass;
  synced: boolean;
  energyJ: number;
  /** The skin's first-shock energy (defib.energyAdultJ). */
  defaultJ: number;
  /** How long VF has run (s), for the three-phase model. */
  vfDurationS: number;
  /** An unsynchronised shock landing within ±40 ms of the last beat's T peak. */
  onTPeak: boolean;
  /** FU-7 (addendum 23): the STATE the shock lands in. Every field is optional — absent = the state-free table.
   *  antiarrhythmicU: 7g's potency-weighted occupancy (amiodarone/lidocaine/procainamide), 0–1;
   *  kEcg: 7c's membrane-effective potassium (mmol/L); ph: arterial pH;
   *  cppMmHg: FU-4's CONTINUOUS no-beat coronary perfusion pressure (never a beat's minimum — DV amendment);
   *  arrestS: seconds since the arrest began (used only when vfDurationS is 0, so the VF table is not double-counted);
   *  tempC: core temperature (°C); rhythmId: the shocked rhythm (the cardioversion curve). */
  antiarrhythmicU?: number;
  kEcg?: number;
  ph?: number;
  cppMmHg?: number;
  arrestS?: number;
  tempC?: number;
  rhythmId?: RhythmId;
}

/** FU-7 (addendum 23) state factors on the ROSC share. Each is [ENG] with its sourced DIRECTION named. */
export const AA_ROSC_GAIN = 0.3; // ARREST 1999 (survival to admission 44.3 % vs 34.6 %), ALPS 2016
export const K_ROSC_PER_MMOL = 0.25; // above 6 mmol/L (UK Renal Association: treat the K before expecting a shock to work)
export const K_ROSC_FLOOR = 0.2;
export const PH_ROSC_PER_UNIT = 1.5; // below pH 7.2 (ALS reversible causes)
export const PH_ROSC_FLOOR = 0.3;
export const CPP_ROSC_REF = 20; // Paradis 1990: no ROSC below CPP 15; mean 25 in ROSC vs 8 without
export const CPP_ROSC_MIN = 0.2;
export const CPP_ROSC_MAX = 1.3;
/** FU-7 (DV amendment): CoPP matters only in the circulatory phase — Weisfeldt & Becker 2002 (0–4 min electrical
 * phase: shock at once), Cobb 1999 / Wik 2003 (CPR first helps only beyond 4–5 min). The same 240 s as VF_DURATION_FACTORS. */
export const CIRCULATORY_PHASE_S = 240;
export const ARREST_ROSC_FULL_S = 1800; // a non-VF arrest's own decay [ENG]
/** FU-7 (DV amendment, research/20 DV-24a/b): VF below 30 °C is often shock-refractory (ERC 2021 special circumstances;
 * Danzl & Pozos 1994; Brown 2012) — termination × (1 − 0.3 per °C below 30), floor 0.2 [ENG magnitude]. */
export const TEMP_SHOCK_C = 30;
export const TEMP_TERM_PER_C = 0.3;
export const TEMP_TERM_FLOOR = 0.2;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** FU-7 (addendum 23): the multiplier on the ROSC share from the state the shock lands in (1 = no information). */
export function shockStateFactor(c: ShockContext): number {
  let f = 1 + AA_ROSC_GAIN * clamp(c.antiarrhythmicU ?? 0, 0, 1);
  if (c.kEcg !== undefined) f *= clamp(1 - K_ROSC_PER_MMOL * Math.max(0, c.kEcg - 6), K_ROSC_FLOOR, 1);
  if (c.ph !== undefined) f *= clamp(1 - PH_ROSC_PER_UNIT * Math.max(0, 7.2 - c.ph), PH_ROSC_FLOOR, 1);
  const phaseS = c.vfDurationS > 0 ? c.vfDurationS : c.arrestS; // FU-7 (DV amendment): the arrest's own clock
  if (c.cppMmHg !== undefined && phaseS !== undefined && phaseS >= CIRCULATORY_PHASE_S) f *= clamp(c.cppMmHg / CPP_ROSC_REF, CPP_ROSC_MIN, CPP_ROSC_MAX);
  if (c.arrestS !== undefined && c.vfDurationS <= 0) f *= clamp(1 - c.arrestS / ARREST_ROSC_FULL_S, 0.2, 1);
  return f;
}

/** FU-7 (DV amendment): the multiplier on the whole TERMINATION (ROSC and asystole/PEA) from core temperature. */
export function temperatureTermination(tempC: number | undefined): number {
  return tempC === undefined ? 1 : clamp(1 - TEMP_TERM_PER_C * Math.max(0, TEMP_SHOCK_C - tempC), TEMP_TERM_FLOOR, 1);
}

/** FU-7 (DV amendment, research/20 DV-06a–c): synchronised cardioversion success by rhythm and biphasic energy,
 * p = pMax / (1 + (E50/E)^2) [ENG fit]. AF: Page 2002, Mittal 2000, ERC 2021 (120–150 J start); flutter and paroxysmal
 * SVT: ERC 2021 (70–120 J), Neumar 2010 (50–100 J), > 90 %; monomorphic VT with a pulse: Neumar 2010 (100 J, > 90 %)
 * [VERIFY]. Any other organised tachycardia, or no rhythm id, keeps the flat CARDIOVERSION_SINUS. */
export const CARDIOVERSION_HILL = 2;
export const CARDIOVERSION_CURVES: Partial<Record<RhythmId, { pMax: number; e50J: number }>> = {
  afib: { pMax: 0.95, e50J: 70 }, preexcitedAf: { pMax: 0.95, e50J: 70 },
  aflutter: { pMax: 0.97, e50J: 12 }, svtAvnrt: { pMax: 0.97, e50J: 12 }, svtAvrt: { pMax: 0.97, e50J: 12 },
  vtMono: { pMax: 0.97, e50J: 20 },
};
export function cardioversionSinus(c: ShockContext): number {
  const k = c.rhythmId === undefined ? undefined : CARDIOVERSION_CURVES[c.rhythmId];
  if (!k) return CARDIOVERSION_SINUS;
  return k.pMax / (1 + (k.e50J / Math.max(1, c.energyJ)) ** CARDIOVERSION_HILL);
}
```

- [x] **Step 2 — the probabilities.** Find:

```ts
    if (c.energyJ < LOW_ENERGY_FRACTION * c.defaultJ) {
      rosc *= LOW_ENERGY_TERMINATION;
      asyPea *= LOW_ENERGY_TERMINATION;
    }
    return { unchanged: 1 - rosc - asyPea, asystole: asyPea * ASYSTOLE_SHARE, pea: asyPea * (1 - ASYSTOLE_SHARE), rosc };
```

Replace with:

```ts
    if (c.energyJ < LOW_ENERGY_FRACTION * c.defaultJ) {
      rosc *= LOW_ENERGY_TERMINATION;
      asyPea *= LOW_ENERGY_TERMINATION;
    }
    // FU-7 (DV amendment): below 30 °C the whole termination falls (the refractory hypothermic VF), like low energy
    const tf = temperatureTermination(c.tempC);
    rosc *= tf;
    asyPea *= tf;
    // FU-7 (addendum 23): the state the shock lands in moves the ROSC share; what it loses (or gains) goes to (or comes
    // from) the asystole/PEA share, so the three outcomes still sum to 1 and `unchanged` keeps its meaning.
    const roscState = Math.min(0.95, rosc * shockStateFactor(c));
    asyPea = Math.max(0, asyPea + (rosc - roscState));
    rosc = roscState;
    return { unchanged: Math.max(0, 1 - rosc - asyPea), asystole: asyPea * ASYSTOLE_SHARE, pea: asyPea * (1 - ASYSTOLE_SHARE), rosc };
```

and (DV amendment (d), the cardioversion curve) find:

```ts
  if (c.cls === 'organisedPulse') return { sinus: CARDIOVERSION_SINUS, unchanged: 1 - CARDIOVERSION_SINUS };
```

Replace with:

```ts
  if (c.cls === 'organisedPulse') {
    const p = cardioversionSinus(c); // FU-7 (DV amendment): by rhythm and energy; the flat 0.8 without a rhythm id
    return { sinus: p, unchanged: 1 - p };
  }
```

- [x] **Step 3 — the device layer fills it.** In `packages/engine-core/src/l3/device-layer.ts`, find:

```ts
    outcome = drawOutcome({ cls, synced, energyJ: d.defib.energyJ, defaultJ: defibSpec(d).energyAdultJ, vfDurationS, onTPeak }, rng);
```

Replace with:

```ts
    // FU-7 (addendum 23, E-FU7-6): the shock's state context, duck-typed from the host (absent = the pre-FU-7 table);
    // the rhythm id selects the cardioversion curve (DV amendment)
    const st = host.shockState?.() ?? {};
    outcome = drawOutcome({ cls, synced, energyJ: d.defib.energyJ, defaultJ: defibSpec(d).energyAdultJ, vfDurationS, onTPeak, rhythmId: host.rhythmId, ...st }, rng);
```

and the field on `DeviceHost` (a real block, review F13), find:

```ts
  setL1(v: StateVar, value: number, ramp?: Ramp): void;
}
```

Replace with:

```ts
  setL1(v: StateVar, value: number, ramp?: Ramp): void;
  /** FU-7 (addendum 23): the state a shock lands in (7g's antiarrhythmic occupancy, 7c's K/pH, 7a's continuous CPP,
   * the arrest clock, the core temperature). Optional: a host that does not provide it keeps the state-free table. */
  shockState?: () => { antiarrhythmicU?: number; kEcg?: number; ph?: number; cppMmHg?: number; arrestS?: number; tempC?: number };
}
```

- [x] **Step 4 — the engine provides it (E-FU7-7).** In `packages/engine-core/src/engine.ts`, in the object the device
host is built from (the one carrying `outcomeRng`, `rhythmId`, `setRhythm`), find:

```ts
      outcomeRng: ps.rng.outcome,
```

Replace with:

```ts
      outcomeRng: ps.rng.outcome,
      shockState: () => ({
        antiarrhythmicU: (ps.pk.bus as { rhythm?: { antiarrhythmicU?: number } }).rhythm?.antiarrhythmicU ?? 0,
        kEcg: (ps as unknown as { blood?: { out?: { kEcg?: number } } }).blood?.out?.kEcg,
        ph: (ps as unknown as { blood?: { core?: { ab?: { ph?: number } } } }).blood?.core?.ab?.ph,
        // DV amendment: the CONTINUOUS no-beat CoPP only (hemo/pipeline.ts `cppCont` → cor.cpp while no beat is read),
        // never a beat's aoDia − LVEDP, which an IABP's post-deflation dip distorts (research/20 DV-13d)
        cppMmHg: (() => {
          const c = (ps.hemo as unknown as { circ?: { cor?: { cpp?: number }; beats?: { t: number }[] } }).circ;
          const lb = c?.beats?.[c.beats.length - 1];
          return ps.rhythm.opts.pulseless === true || !lb || simT - lb.t > 3 ? c?.cor?.cpp : undefined;
        })(),
        arrestS: (() => {
          const a = (ps.hemo as unknown as { circ?: { arrest?: { t?: number } | null } }).circ?.arrest;
          return a && typeof a.t === 'number' ? Math.max(0, simT - a.t) : undefined;
        })(),
        tempC: (ps.resp as { temp?: { tc?: number } }).temp?.tc, // DV amendment: core temperature (FU-4 G12 reads the same)
      }), // FU-7 (addendum 23): every field duck-typed — 7c, 7a/FU-4, 7g and Stage 3 all publish them already
```

- (If FU-4's arrest state is absent, `arrestS` stays undefined and only the VF clock acts. The fallback is deliberate.)
- **Which CoPP (DV amendment (e), research/20 §4 finding 4).** `cor.cpp` holds whichever value the coronary step last
  used (`circ/coronary.ts` `stepCoronary`):
  - with a beat to read, it is `b.aoDia − b.lvedp − pItEd`: the beat's MINIMUM aortic pressure. Under an IABP that
    minimum is the post-deflation dip (DV-13d: 57.7 → 46.1 when augmentation should RAISE it). This is FU-8 Part A's
    C3/V2(a) line.
  - with no beat, it is `cppCont` (`hemo/pipeline.ts` 387–390): the 1-s mean of aortic − RA pressure outside
    compressions (Paradis's relaxation-phase CoPP). That is the continuous value DV-02a measures at 27.

  The guard passes `cor.cpp` only when the heart is not beating: a pulseless rhythm, or no beat for 3 s, which is the
  pipeline's own `noBeat` test less the rhythm-set lookup. Otherwise `cppMmHg` is `undefined`, i.e. no CoPP factor.
  - Every shock that reaches the CoPP factor is in the `vf` class, so the guard costs nothing today. It is what keeps a
    future non-VF use from reading a beat minimum.
  - Two rigs distort even the continuous value, and **no CoPP constant is fitted on either**; the gate note §5 names
    both:
    - **V3, tamponade CPR:** DV-04a reads −12.9, because the CPR pressure sits on a tense pericardium;
    - **V2, a running IABP:** its dip enters `cppCont` while it keeps inflating.

  The prototype (below) typechecked this accessor clean.
- [x] **Step 5 — the test.** Create `packages/engine-core/test/l3/shock-state.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { outcomeProbabilities, shockStateFactor, type ShockContext } from '../../src/l3/defib-pacer/outcome.ts';

const VF: ShockContext = { cls: 'vf', synced: false, energyJ: 200, defaultJ: 200, vfDurationS: 60, onTPeak: false };
const rosc = (c: ShockContext) => outcomeProbabilities(c).rosc ?? 0;

/** FU-7 (addendum 23): shock success depends on the state the shock lands in. */
describe('shock state factor (R51 addendum 23)', () => {
  it('no state information = the pre-FU-7 table exactly', () => {
    expect(shockStateFactor(VF)).toBe(1);
    expect(rosc(VF)).toBeCloseTo(0.1, 9);
  });
  it('amiodarone on board raises the ROSC share (ARREST 1999, ALPS 2016)', () => {
    expect(rosc({ ...VF, antiarrhythmicU: 1 })).toBeGreaterThan(1.2 * rosc(VF));
  });
  it('severe hyperkalaemia and acidaemia lower it, with floors', () => {
    expect(rosc({ ...VF, kEcg: 9 })).toBeLessThan(0.5 * rosc(VF));
    expect(rosc({ ...VF, ph: 6.9 })).toBeLessThan(0.7 * rosc(VF));
    expect(rosc({ ...VF, kEcg: 12, ph: 6.5 })).toBeGreaterThan(0);
  });
  it('in the circulatory phase good CPR (CPP 25) helps and no-flow CPR (CPP 5) nearly abolishes it (Paradis 1990)', () => {
    const late: ShockContext = { ...VF, vfDurationS: 300 }; // DV amendment: CoPP acts from 240 s (Weisfeldt & Becker 2002)
    expect(rosc({ ...late, cppMmHg: 25 })).toBeGreaterThan(rosc(late));
    expect(rosc({ ...late, cppMmHg: 5 })).toBeLessThan(0.4 * rosc(late));
  });
  it('in the electrical phase CoPP does not matter: an immediate shock without CPR keeps its share (Weisfeldt 2002)', () => {
    expect(rosc({ ...VF, cppMmHg: 3 })).toBeCloseTo(rosc(VF), 9);
    expect(rosc({ ...VF, vfDurationS: 0, arrestS: 60, cppMmHg: 3 })).toBeCloseTo(rosc({ ...VF, vfDurationS: 0, arrestS: 60 }), 9);
  });
  it('the outcome probabilities always sum to 1 and none is negative', () => {
    for (const c of [VF, { ...VF, kEcg: 12, ph: 6.5, cppMmHg: 2 }, { ...VF, antiarrhythmicU: 1, cppMmHg: 30 }, { ...VF, vfDurationS: 900 },
      { ...VF, tempC: 24, vfDurationS: 900, cppMmHg: 30, antiarrhythmicU: 1 }, { ...VF, cls: 'organisedPulse' as const, synced: true, rhythmId: 'afib' as const, energyJ: 360 }]) {
      const p = outcomeProbabilities(c);
      const sum = Object.values(p).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 9);
      for (const v of Object.values(p)) expect(v).toBeGreaterThanOrEqual(0);
    }
  });
  it('the arrest clock acts only on a non-VF arrest (no double-counting with the VF table)', () => {
    expect(rosc({ ...VF, arrestS: 1200 })).toBeCloseTo(rosc(VF), 9);
    expect(rosc({ ...VF, vfDurationS: 0, arrestS: 1200 })).toBeLessThan(rosc({ ...VF, vfDurationS: 0 }));
  });
});

/** FU-7 (DV amendment, research/20 §4): termination, temperature and cardioversion by rhythm and energy. */
const term = (c: ShockContext) => 1 - (outcomeProbabilities(c).unchanged ?? 0);
const cv = (rhythmId: ShockContext['rhythmId'], energyJ: number) =>
  outcomeProbabilities({ cls: 'organisedPulse', synced: true, energyJ, defaultJ: 200, vfDurationS: 0, onTPeak: false, rhythmId }).sinus ?? 0;
describe('shock outcome — DV amendment (research/20 DV-01a, DV-24a/b, DV-06a–c)', () => {
  it('the first biphasic shock terminates VF in 85–98 % (Schneider 2000; van Alem 2003) and termination is not ROSC', () => {
    expect(term(VF)).toBeGreaterThanOrEqual(0.85);
    expect(term(VF)).toBeLessThanOrEqual(0.98);
    expect(rosc(VF)).toBeCloseTo(0.1, 9);
  });
  it('below 30 °C VF is shock-refractory; rewarming above 30 °C restores termination (ERC 2021)', () => {
    expect(term({ ...VF, tempC: 37 })).toBeCloseTo(term(VF), 9);
    expect(term({ ...VF, tempC: 33 })).toBeCloseTo(term(VF), 9);
    expect(term(VF) - term({ ...VF, tempC: 28.5 })).toBeGreaterThan(0.2); // DV-24a: diff > 20 points
    expect(term({ ...VF, tempC: 24 })).toBeGreaterThan(0); // the floor: never abolished
  });
  it('flutter and paroxysmal SVT convert at low energy (≥ 90 % at 50 J; ERC 2021, Neumar 2010)', () => {
    expect(cv('aflutter', 50)).toBeGreaterThanOrEqual(0.9);
    expect(cv('svtAvnrt', 50)).toBeGreaterThanOrEqual(0.9);
  });
  it('monomorphic VT with a pulse converts in > 90 % at 100 J (Neumar 2010)', () => {
    expect(cv('vtMono', 100)).toBeGreaterThan(0.9);
  });
  it('AF needs more energy: 75–90 % at 200 J, rare at 20 J (Page 2002: low-energy first shocks ≈ 20–30 %; ERC 2021)', () => {
    expect(cv('afib', 200)).toBeGreaterThanOrEqual(0.75);
    expect(cv('afib', 200)).toBeLessThanOrEqual(0.9);
    expect(cv('afib', 20)).toBeLessThanOrEqual(0.3);
    expect(cv('afib', 200) - cv('afib', 20)).toBeGreaterThan(0.3); // DV-06a energy dependence (direction, tol 30)
  });
  it('no rhythm id keeps the flat pre-FU-7 cardioversion 0.8', () => {
    expect(cv(undefined, 20)).toBeCloseTo(0.8, 9);
  });
});
```

- [x] **Step 6 — sugammadex's missing hazard (DI-45, MI; the same file family).** `rows-cardiovascular.ts`: the
sugammadex row has `pd: []`. Add the recognised (rare) bradycardia as a deterministic PD entry — NOT a random event —
because a teaching simulator must be able to show it on demand, and mark the anaphylaxis as 7e's condition:

```ts
    // FU-7 (DI-45): marked bradycardia is a recognised sugammadex reaction (MHRA/EMA; M10 ch. 24 pp. 728–731). Modelled
    // as a dose-related vagal fall at the high (16 mg/kg) end [ENG: no incidence-vs-dose source exists]; the anaphylaxis
    // is 7e's `condition anaphylaxis`, dispatched by the instructor, not a drug row.
    pd: [{ target: 'hr', emax: -0.25, ec50: 12 }],
```

with a test in `test/l2/pk/interactions-misc.test.ts` (Task 18's file): 4 mg/kg gives < 5 % HR fall, 16 mg/kg gives
15–30 %.
**AF-rig guard (CM amendment, research/19 finding 5 / gap C3 — read Task 0 Step 6b first).** Most of this task is pure
probability arithmetic on `ShockContext` and needs no rhythm at all; that part is unaffected. But every WHOLE-ENGINE arm
in which a SYNCHRONISED shock is delivered to atrial fibrillation (`synced: true`, `cls` the cardioversion classes) runs
in a rig that, before FU-8 Part A's fix, deteriorates on its own (CM-15c, Task 0 Step 6b). If Step 6b reported the check
as FAILED: keep those arms **under 5 minutes** of simulated AF, assert `kIsch` **≥ 0.9** in a no-shock control arm of the
same rig as a precondition, title them "(AF rig guarded: C3 pending)", and list each with its measured control-arm
`kIsch` in the gate note §5. No shock-success probability is re-fitted on an AF rig that fails its precondition — the
case becomes an `it.fails` naming C3 / FU-8 Part A. Prefer the unit-level `ShockContext` form of a case wherever it can
carry the same assertion, since it has no rhythm and therefore no exposure to C3.
(DV amendment: the new cardioversion curve is asserted at unit level in Step 5, which is not exposed to C3. The DV-06a
whole-engine arms shock after **40 s** of AF, inside the 5-minute guard.)
- [x] **Step 7 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l3 test/engine/device`
(FU-5's tests must stay green) and `npx -y pnpm@9.15.9 run audit:drugs DI-13a DI-45`. Expected: DI-13a **MI → PL**
(amiodarone now reaches the outcome) and DI-45 **MI → PL** (the bradycardia exists).
- [ ] **Step 7a — ROSC end to end, and the DV guard cells (DV amendment (f), research/20 §4 finding 5 and §7).**

  *Why.* The physiology already does half the work:
  - a forced organised rhythm after 8 min of untreated VF re-arrests within 20 s (DV-01c, myocardial state 0.02);
  - K⁺ 9.5 re-fibrillates a forced sinus at +80 s (DV-25a).

  The K⁺ and CoPP factors lower the DRAW, and the physiology then lowers the SURVIVAL of a drawn ROSC. What the sources
  describe (Paradis's ROSC; ERC's "ROSC unlikely before calcium") is the product of the two. So a factor is judged,
  and if ever re-fitted, ONLY against the end-to-end number, never against `outcomeProbabilities` alone. Otherwise the
  K⁺ and CoPP effects count twice.

  1. **Effective ROSC** = the share of 40 seeds whose rhythm has a pulse between +30 and +90 s after the shock and keeps
     it through +330 s (the DV `pulseAt` and `sustained` helpers, `research/20-audit-scripts/spec.ts`). The drawn share
     (`outcome(R) === 'rosc'`) is reported beside it.
  2. **Run, read-only, on the FU-7 worktree:**
     `PME_ENGINE=<wt>/packages/engine-core/src/index.ts DV_OUT=<scratchpad>/fu-7-t12/dv.json ./run.sh cli.ts DV-01a DV-01c DV-06a DV-06b DV-06c DV-24a DV-24b DV-25a`
     (plus DV-01b if Task 0 Step 6c passed).
     Then run a 40-seed end-to-end script in `<scratchpad>` that imports `runner.ts` and `spec.ts` read-only, with four
     arms:
     - **early:** VF 60 s → 200 J at 120 s, no CPR;
     - **lateNoCpr:** VF → 200 J at 540 s, no CPR;
     - **lateCpr:** VF, CPR q 0.8 from 360 s, off at 538 s → 200 J at 540 s;
     - **hk:** profile K⁺ 9.5, CPR from 90 s → 200 J at 300 s.

     Nothing in `research/` is edited. The DV amendment's prototype script is the template (see the prototype block
     below).
  3. **Acceptance** (research/20 §7's FU-7 row; each value is the seeded number and the band is the cell's own, never
     widened, R45):

     | cell / arm | item | band [source] | prototype (2c49d87 + this task) | DV baseline (3feee6f) |
     |---|---|---|---|---|
     | DV-01a | term150Pct, term200Pct | 85–99 [Schneider 2000; van Alem 2003] | **95, 95** (exact 90) | 65, 65 (exact 70) |
     | DV-01a | drawn ROSC at 150 J | ≈ 10 (the table's share) | 7.5 | 7.5 |
     | DV-01c | sustEarly / sustLate / sustLateCpr | true / false / true (guard: the table must not change the physiology) [Weisfeldt & Becker 2002] | true / false / true | same |
     | end to end | effective ROSC: early / lateNoCpr / lateCpr | lateCpr > lateNoCpr (CPR raises ROSC in the circulatory phase) [Wik 2003; Paradis 1990] | **7.5 / 0 / 7.5** (drawn 7.5 / 0 / 7.5) | drawn 10 / 5 / 5 by the table |
     | DV-24a | diff (term 37 °C − 28.5 °C) | > 20 [ERC 2021 hypothermia] | **55** (87.5 vs 32.5) | 0 |
     | DV-24b | gain (33 °C − 28.5 °C) | > 20 [ERC 2021] | **55** | 0 |
     | DV-25a | forcedSinusHolds | false (guard) [ERC 2021 hyperkalaemia] | false (refib +80 s) | false |
     | DV-25a | roscHkPct (drawn); effective hk | ≤ 5 [ERC 2021, proposal] | **2.5; 0** | 7.5 |
     | DV-06a | conv200Pct; energyDependence | 75–95; > 30 [Page 2002; Mittal 2000] | **87.5; 75** (120 J 75, 20 J 12.5) | 85; 0 |
     | DV-06b | conv50Pct | 85–100 [ERC 2021; Neumar 2010] | **95** | 85 |
     | DV-06c | convPct | ≥ 85 [Neumar 2010] | **95** | 85 |

  4. **Items the runner cannot see, which are re-graded by hand in the gate note.** The runner's `exact…`/`pRosc…`
     items and DV-01c's `cprRaisesProbability` call `outcomeProbabilities` with NO state fields and no `rhythmId`
     (`cells-a.ts` `P`, `cells-b.ts` `PO`). So:
     - DV-06b/c `exactPct` stay 80 (the flat fallback) by construction;
     - `cprRaisesProbability` stays `false` by construction.

     The gate note re-grades them from the seeded arms, the end-to-end rows above and the Step 5 unit tests. It records
     them as runner limits, not defects, and does not edit `research/`.
  5. **The double-counting rule.** If an end-to-end arm is already in its band with the factor set to 1, the physiology
     produces the effect alone. Then the factor's constant is NOT tightened to move the drawn share. Two cases are
     measured:
     - **lateNoCpr:** effective ROSC is 0 with or without the CoPP penalty. The "without" half is inferred from
       DV-01c's `sustLate` false: the pre-selected organised rhythm in this state re-arrests. The state-free draw of
       5 % re-arrests through the low-flow rule, so the penalty only removes transient ROSC-then-re-arrest events.
     - **hk:** effective ROSC is 0; the K⁺ hazard re-fibrillates.

     Both penalties are kept, because the bands are upper bounds and the draw is what the monitor shows. They must never
     be re-fitted against the drawn share alone. The gate note §5 lists drawn and effective for each arm.
  6. The rigs V2 (IABP) and V3 (tamponade CPR) are excluded from any CoPP fitting (Step 4 note).
- [ ] **Step 8 — commit.** `feat(l3): shock success depends on drugs, potassium, pH, CPP, temperature, rhythm and energy, and the arrest clock; biphasic base termination (R51 addendum 23, research/20, E-FU7-6)`, push.

**Prototype — DV amendment (2026-09-29, throwaway worktree on `origin/main` 2c49d87, removed after).**
- Steps 0–5 were applied as written above, plus the Step 3 `rhythmId` line.
- Typecheck is clean. `test/l3/shock-state.test.ts` (13), `test/l3/defib-pacer/**` (4 files, 28 tests incl. the edited
  outcome test) pass.
- The exact table:

  | shock | termination | ROSC | asystole / PEA |
  |---|---|---|---|
  | VF 60 s, 200 J | 90.0 | 10.0 | 40 / 40 |
  | VF 60 s, 50 J | 45.0 | 5.0 | 20 / 20 |
  | VF 60 s at 28.5 °C | 49.5 | 5.5 | 22 / 22 |
  | VF 60 s at 33 °C | 90.0 | 10.0 | 40 / 40 |
  | VF 60 s, CoPP 5 (electrical phase) | 90.0 | 10.0 | — |
  | VF 480 s, CoPP 3 (no CPR) | 90.0 | 1.0 | — |
  | VF 480 s, CoPP 27 (CPR) | 90.0 | 6.5 | — |
  | VF 480 s, CoPP 14 (poor CPR) | 90.0 | 3.5 | — |
  | VF 230 s, K⁺ 9.47, CoPP 27 | 90.0 | 2.0 | — |
  | VF 230 s, K⁺ 7.41, CoPP 27 | 90.0 | 6.5 | — |

  Cardioversion as in the table under "Sources"; `mat` and no `rhythmId` stay 80.
- The seeded DV cells and end-to-end arms are in Step 7a. DV-24a's seeded 32.5 % at 28.5 °C sits below the exact
  49.5 %: several cold seeds leave VF for asystole before the 300 s shock, which the `arrest` class leaves `unchanged`.
- The "next event time is NaN" warnings in the K⁺ 9.5 rig are pre-existing: the DV baseline's own
  `out/log-full.txt` carries them. They are not from this task.

---

### Task 13: LAST is additive by potency-weighted dose (addendum 24; 7g; UNPROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/l2/pk/pipeline.ts` (the `localAnaesthetic` branch of `stepOnce`)
- Test: create `packages/engine-core/test/l2/pk/interactions-misc.test.ts` (Tasks 13, 15, 16, 17, 18 share it)

**Why / measured (audit D14):** `pk/pipeline.ts` takes `Math.max` over agents, so lidocaine 1.5 mg/kg on top of
bupivacaine 100 mg adds nothing (DI-23: CNS effect 0.9 vs 0.9). ASRA 2020 and Miller ch. 25 treat local-anaesthetic
toxicity as additive between agents — the clinical rule that the doses share one maximum.

- [x] **Step 1 — the fractional-threshold sum.** In `packages/engine-core/src/l2/pk/pipeline.ts`, find:

```ts
    if (row.cls === 'localAnaesthetic') {
      c *= freeF;
      const th = LAST_THRESHOLDS[row.id];
      if (th) {
        cnsE = Math.max(cnsE, hill(c, th.cns, 1, 3));
        cvE = Math.max(cvE, hill(c, th.cv, 1, 3));
        seizure ||= c >= th.seizure;
      }
    }
```

Replace with:

```ts
    if (row.cls === 'localAnaesthetic') {
      c *= freeF;
      const th = LAST_THRESHOLDS[row.id];
      if (th) {
        // FU-7 (addendum 24 / audit D14): local-anaesthetic toxicity is ADDITIVE between agents (ASRA 2020 practice
        // advisory; M10 ch. 25: the doses share one maximum). The fractional sums replace the per-agent maximum, and each
        // is fed to the SAME Hill as before, so a sole agent at its threshold gives exactly the pre-FU-7 effect.
        uCns += c / th.cns;
        uCv += c / th.cv;
        uSeiz += c / th.seizure;
      }
    }
```

and, above the loop, replace the three accumulators' declarations. Find:

```ts
  let cnsE = 0;
  let cvE = 0;
  let seizure = false;
```

Replace with:

```ts
  // FU-7 (addendum 24): potency-weighted fractional sums over the local anaesthetics present (ASRA 2020 additivity)
  let uCns = 0;
  let uCv = 0;
  let uSeiz = 0;
```

and after the loop, before `combine(...)`, find:

```ts
  const r = combine(actives, { ph: ctx.ph, betaBlockC: ctx.betaBlockC, betaOccProfile: ctx.betaOcc, betaNonSel: ctx.betaNonSel, vasoResp: ctx.vasoResp, ageY: pk.patient.ageY, macBrain }); // FU-7 (addendum 21)
```

Replace with:

```ts
  // FU-7 (addendum 24): one Hill per endpoint on the summed fractions (h 3, as each agent had)
  const cnsE = hill(uCns, 1, 1, 3);
  const cvE = hill(uCv, 1, 1, 3);
  const seizure = uSeiz >= 1;
  const r = combine(actives, { ph: ctx.ph, betaBlockC: ctx.betaBlockC, betaOccProfile: ctx.betaOcc, betaNonSel: ctx.betaNonSel, vasoResp: ctx.vasoResp, ageY: pk.patient.ageY, macBrain }); // FU-7 (addendum 21)
```

(The `bus.last = { cnsE, cvE }` and `bus.cns.seizure = seizure` lines below are unchanged. Note for the executor: this
block's find text includes Task 8's edit, so Task 13 MUST run after Task 8.)
- [x] **Step 2 — the test.** In `test/l2/pk/interactions-misc.test.ts` (new file, header comment naming Tasks 13–18):
  1. a sole agent at its CNS threshold gives exactly `hill(1, 1, 1, 3)` = 0.5 (the pre-FU-7 value — a REGRESSION guard);
  2. lidocaine at 0.5 × its threshold PLUS bupivacaine at 0.5 × its threshold gives the same effect as either at 1.0 ×
     (additivity, ASRA 2020);
  3. the seizure flag fires on the SUM (0.6 + 0.6 of two agents' seizure thresholds), not on either alone;
  4. the existing LAST acceptance test (`pk-acceptance-pd.test.ts`, bupivacaine 225 mg → VF; lipid ×0.68) is unchanged.
- [x] **Step 3 — the cells.** `npx -y pnpm@9.15.9 run audit:drugs DI-23 DI-24`. Expected: DI-23 **TW → PL**
(`cnsExcess` > 0), DI-24 unchanged (PL: the lipid sink and the VF course must not move — if they do, the Hill's exponent
was changed, which this task does not do).
- [x] **Step 4 — commit.** `fix(7g): local-anaesthetic toxicity is additive by potency-weighted dose (R51 addendum 24)`, push.

---

### Task 14: One state each for magnesium, calcium and burn/denervation (addendum 24; 7f under E-FU7-1 + 7c under E-FU7-4; UNPROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/l2/neuro/interactions.ts` (**E-FU7-1**: Mg from 7c's blood, calcium antagonism,
  the volatile potentiation re-size)
- Modify: `packages/engine-core/src/l2/neuro/pipeline.ts` (**E-FU7-1**: pass the blood values)
- Modify: `packages/engine-core/src/l2/blood/{pipeline,core,treatments}.ts` (**E-FU7-4**: the ONE Mg state's baseline
  and re-baseline, the succinylcholine K⁺ surge reads the nm profile)
- Modify: `packages/engine-core/src/engine.ts` (**E-FU7-7**: the neuro context's Mg/Ca line; the blood context's
  `neuroProfile`)
- Test: extend `packages/engine-core/test/l2/neuro/interactions.test.ts` (new cases, plus the ONE re-stated assertion of
  **E-FU7-10** — Step 4)

**Why / measured:** DI-90 (IN): magnesium sulfate 60 mg/kg raises 7c's blood Mg to 2.1 mmol/L but prolongs rocuronium by
**+0.5 %**, while the PROFILE Mg 2.5 of DI-25 prolongs it **+39 %** — 7f reads the profile field only
(`neuro/pipeline.ts:186`). DI-25 (MI): calcium does not antagonise the magnesium potentiation (no calcium term exists).
DI-37c (IN): the nm profile `burn`/`denervation` changes rocuronium sensitivity but not the succinylcholine K⁺ rise
(+0.5 vs the expected +3–7 mmol/L), because only `blood.burns` drives 7c's surge. DI-51 (TS): 1 MAC sevoflurane prolongs
rocuronium by **+127 %** against 25–80 % (the [ENG] divisor `1 + 0.5·MAC` acts on a steep Hill).

- [x] **Step 1 — magnesium and calcium from the blood.** In `packages/engine-core/src/l2/neuro/interactions.ts`, find:

```ts
export interface InteractionCtx {
  profile: NmProfile;
  volatileMac: number; // potent volatiles only (brain, age-adjusted, from 7g's bus)
  mgMmolL: number;
  tempC: number; // core temperature
}
```

Replace with:

```ts
export interface InteractionCtx {
  profile: NmProfile;
  volatileMac: number; // potent volatiles only (brain, age-adjusted, from 7g's bus)
  /** FU-7 (addendum 24 / audit D12): 7c's `blood.out.mg` — ONE magnesium state, so the drug and the profile agree
   * (the profile's `mgMmolL` is 7c's BASELINE, not a second state). */
  mgMmolL: number;
  /** FU-7 (addendum 24 / audit D12): 7c's `blood.out.iCa` (mmol/L, normal ≈ 1.15) — calcium antagonises the magnesium
   * potentiation (M10 ch. 24 p. 698); `undefined` without 7c keeps the pre-FU-7 behaviour. */
  iCaMmolL?: number;
  tempC: number; // core temperature
}
```

find:

```ts
export function ec50Multipliers(x: InteractionCtx): Record<NmbAgent, number> {
  const vol = 1 / (1 + 0.5 * Math.max(0, x.volatileMac));
  const mg = 1 / (1 + 0.3 * Math.max(0, x.mgMmolL - 1));
```

Replace with:

```ts
/** FU-7 (addendum 24 / DI-51): the volatile potentiation of a non-depolarising block, as the EC50 divisor 1/(1 + k·MAC).
 * Exported so the two existing assertions that pinned it (E-FU7-10) read the constant instead of a literal. */
export const VOL_NMB_K = 0.18;

export function ec50Multipliers(x: InteractionCtx): Record<NmbAgent, number> {
  // FU-7 (addendum 24 / audit D12, DI-51): the volatile divisor is re-sized against a POTENTIATION-OF-DURATION source
  // instead of an EC50 guess. 1 MAC sevoflurane prolonged the clinical duration +127 % with 0.5 (band 25–80 %).
  // VOL_NMB_K 0.18 [ENG, fit target: DI-51's band 25–80 %, M10 ch. 24 "30–50 % at ≈ 1 MAC"] — MEASURED by the second
  // fixer on the applied tree (main + FU-4 + this plan): the ENGINE cell DI-51 reads +52.2 % (t25 46.7 vs 30.7 min at
  // 1.1 MAC) → PL. The neuro-only unit rig of `interactions.test.ts` reads only +13.4 % for the same constant, because it
  // applies a FIXED EC50 multiplier without the volatile's own PK; the ENGINE cell is the acceptance property and the
  // unit rig's +20–45 % band is carried as an `it.fails` with both numbers (Step 4).
  const vol = 1 / (1 + VOL_NMB_K * Math.max(0, x.volatileMac));
  // magnesium potentiates; calcium antagonises it (M10 ch. 24 p. 698). ONE state each: 7c's blood values.
  const ca = x.iCaMmolL === undefined ? 1 : Math.min(1.6, Math.max(0.7, x.iCaMmolL / 1.15));
  const mg = 1 / (1 + (0.3 * Math.max(0, x.mgMmolL - 1)) / ca);
```

- [x] **Step 2 — the pipeline passes them.** In `packages/engine-core/src/l2/neuro/pipeline.ts`, find:

```ts
  const m = ec50Multipliers({ profile: ns.profile.nm, volatileMac: x.macPotent, mgMmolL: ns.profile.mgMmolL, tempC: env.tempC });
```

Replace with:

```ts
  // FU-7 (addendum 24 / audit D12): ONE magnesium state and ONE calcium state — 7c's blood, with the profile as the
  // baseline when 7c is absent (`env.mgMmolL`/`env.iCaMmolL` are duck-typed in engine.ts's neuro context).
  const m = ec50Multipliers({ profile: ns.profile.nm, volatileMac: x.macPotent, mgMmolL: env.mgMmolL ?? ns.profile.mgMmolL, iCaMmolL: env.iCaMmolL, tempC: env.tempC });
```

The `NeuroEnv` fields (a real block, review F13; after Task 7's field), find:

```ts
   * in MANUAL and before the drive has run once). */
  spontRr?: number;
}
```

Replace with:

```ts
   * in MANUAL and before the drive has run once). */
  spontRr?: number;
  /** FU-7 (addendum 24 / audit D12): 7c's `blood.out.mg` / `blood.out.iCa` (mmol/L) — ONE magnesium and ONE calcium
   * state; undefined without 7c (the profile's mgMmolL is then the fallback). */
  mgMmolL?: number;
  iCaMmolL?: number;
}
```

and in `engine.ts`'s `stepNeuroTo` context (**E-FU7-7**, the statement Task 7 edited — ONE combined edit), find:

```ts
      spontRr: ps.l1.mode === 'modeled' && (ps.resp.spont?.rr ?? -1) >= 0 ? ps.resp.spont?.rr : undefined,
```

Replace with:

```ts
      spontRr: ps.l1.mode === 'modeled' && (ps.resp.spont?.rr ?? -1) >= 0 ? ps.resp.spont?.rr : undefined,
      mgMmolL: ps.blood.out.mg > 0 ? ps.blood.out.mg : undefined, iCaMmolL: ps.blood.out.iCa > 0 ? ps.blood.out.iCa : undefined, // FU-7 (addendum 24): ONE Mg and Ca state (0 before 7c's first step)
```

**The profile's role changes (ONE state), so state it in the gate note.** 7c's plasma Mg IS the state: its baseline
comes from the blood profile or, when absent, the neuro profile's `mgMmolL` (creation), and 7f's runtime `neuroProfile
{ mgMmolL }` event (DI-25's arm) RE-BASELINES 7c's Mg set point instead of setting a second, 7f-only value — the drug
then moves the same state and 7f reads it back. 7f consumes the event (the chain stops there), so 7c observes 7f's
resulting `ns.profile` through its context (**E-FU7-4**). In `packages/engine-core/src/l2/blood/core.ts` (creation), find:

```ts
  const so = createSolutes({ na: b.na ?? NORMAL.na, k: b.k ?? NORMAL.k, cl: b.cl ?? NORMAL.cl, iCa: b.iCa ?? NORMAL.iCa, mg: b.mg ?? NORMAL.mg, lactate: b.lactate ?? NORMAL.lactate }, e0, pat.vLacL, pat.icfMl);
```

Replace with:

```ts
  // FU-7 (addendum 24 / audit D12): ONE magnesium state — a neuro-profile Mg (7f's `neuroProfile.mgMmolL`) is 7c's
  // baseline when the blood profile gives none
  const mg0 = b.mg ?? (profile as { neuro?: { mgMmolL?: number } } | undefined)?.neuro?.mgMmolL ?? NORMAL.mg;
  const so = createSolutes({ na: b.na ?? NORMAL.na, k: b.k ?? NORMAL.k, cl: b.cl ?? NORMAL.cl, iCa: b.iCa ?? NORMAL.iCa, mg: mg0, lactate: b.lactate ?? NORMAL.lactate }, e0, pat.vLacL, pat.icfMl);
```

In `packages/engine-core/src/l2/blood/pipeline.ts`, the context, find:

```ts
  pk?: unknown; // Stage 7g's PkState (duck-typed: `bus.doses`, `bus.metabolic.kShift`); absent → 7c's own drug fallback
}
```

Replace with:

```ts
  pk?: unknown; // Stage 7g's PkState (duck-typed: `bus.doses`, `bus.metabolic.kShift`); absent → 7c's own drug fallback
  /** FU-7 (addendum 24 / audit D6, D12): 7f's neuro profile (duck-typed) — its Mg re-baselines 7c's ONE Mg state and its
   * burn/denervation upregulation reaches the succinylcholine K+ surge. */
  neuroProfile?: { nm: string; mgMmolL: number };
}
```

the state that remembers the last applied profile Mg, find:

```ts
  /** What the engine has already pushed into Modifiers (plan decision 9). */
  ecg: { k: number; qtc: number };
```

Replace with:

```ts
  /** What the engine has already pushed into Modifiers (plan decision 9). */
  ecg: { k: number; qtc: number };
  /** FU-7 (addendum 24): the neuro-profile Mg last applied to the Mg set point (undefined = not yet seen). */
  mgSeen?: number;
```

and the observer at the top of the step, find:

```ts
  if (bus) observeDoses(bs, bus.doses);
```

Replace with:

```ts
  if (bus) observeDoses(bs, bus.doses);
  // FU-7 (addendum 24 / audit D12, D6): ONE Mg state — a CHANGED neuro-profile Mg re-baselines 7c's set point and amount
  // (the first sight only records it: creation already used it); ONE upregulation answer for the sux K+ surge.
  const np = ctx.neuroProfile;
  if (np) {
    if (bs.mgSeen !== undefined && np.mgMmolL !== bs.mgSeen && c.out.mg > 0) {
      c.so.mg *= np.mgMmolL / c.out.mg;
      c.so.set.mg = np.mgMmolL;
    }
    bs.mgSeen = np.mgMmolL;
    c.nmUpreg = np.nm === 'burn' || np.nm === 'denervation' ? 1 : 0;
  }
```

and in `engine.ts`, the blood context (**E-FU7-7**), find:

```ts
    advanceBlood(ps.blood, { resp: ps.resp, hemo: ps.hemo, l1: ps.l1, pk: ps.pk }, Math.floor(end / 8) / RESP_RATE); // Stage 7c: after pk and resp, before hemo
```

Replace with:

```ts
    advanceBlood(ps.blood, { resp: ps.resp, hemo: ps.hemo, l1: ps.l1, pk: ps.pk, neuroProfile: ps.neuro.profile }, Math.floor(end / 8) / RESP_RATE); // Stage 7c: after pk and resp, before hemo (FU-7: 7f's profile, addendum 24)
```
- [x] **Step 3 — the succinylcholine K⁺ surge reads the nm profile (E-FU7-4).** In
the surge is `suxDeltaK(tMin, bc.burns)` in `packages/engine-core/src/l2/blood/treatments.ts` (`peak = 0.5 + 6·burns`),
called once from `l2/blood/core.ts`. ONE new input, ONE call-site change, no second path. In `treatments.ts`, find:

```ts
export function suxDeltaK(tMin: number, burns: number): number {
```

Replace with:

```ts
/** FU-7 (addendum 24 / audit D6, DI-37c): ONE disease, ONE answer. Burns > 48 h, denervation and prolonged
 * immobilisation all upregulate extrajunctional acetylcholine receptors, so 7f's nm profile raises the succinylcholine
 * K+ surge exactly as `blood.burns` does (M10 ch. 24: +3–7 mmol/L; measured before: denervation gave +0.5). The caller
 * passes max(burns, the nm profile's upregulation), so the two commands cannot disagree. */
export function suxDeltaK(tMin: number, burns: number): number {
```

and in `l2/blood/core.ts`, find:

```ts
    else if (d.id === 'succinylcholine') sux += suxDeltaK(tm, bc.burns);
```

Replace with:

```ts
    else if (d.id === 'succinylcholine') sux += suxDeltaK(tm, Math.max(bc.burns, bc.nmUpreg ?? 0)); // FU-7 (addendum 24 / DI-37c)
```

where `bc.nmUpreg` (0–1) is ONE new `BloodCore` field, written by Step 2's observer in `advanceBlood` (1 when 7f's nm
profile is `'burn'` or `'denervation'`). The field (a real block, review F13), find:

```ts
  burns: number;
  liver: number;
```

Replace with:

```ts
  burns: number;
  /** FU-7 (addendum 24 / audit D6): 7f's nm-profile receptor upregulation (burn, denervation), 0–1 — the sux K+ surge. */
  nmUpreg?: number;
  liver: number;
```
- [x] **Step 4 — the tests (and E-FU7-10, restated here — review F14, ruling 6).** The existing 1 MAC case asserts the
implementation constant `EC50 × 0.67` (the old divisor 1/(1 + 0.5)); with 0.18 it is `× 0.85`. That re-statement is an
edit to an existing assertion, so it is declared as **E-FU7-10**: the case keeps its title, asserts the new divisor's
value with the old one in a trailing "was × 0.67" clause, and the ACCEPTANCE property moves to the sourced DURATION
band below (item 3, DI-51's own 25–80 %), which is new and not widened. **Measured by the second fixer on the applied
tree:** DI-51 reads **+52.2 %** (t25 46.7 vs 30.7 min at 1.1 MAC) → item 3 is `it` and the cell is PL; the neuro-only rig
of `interactions.test.ts` reads only **+13.4 %** for the same constant, because it applies a fixed EC50 multiplier without
the volatile's own PK. So the existing case's duration band becomes its own `it.fails` titled with BOTH numbers, the
re-stated divisor assertion stays `it`, and no band is widened. If the merged tree's DI-51 leaves 25–80 %, the executor
re-fits `VOL_NMB_K` inside 0.12–0.3 and records the value.

The two divisor restatements (E-FU7-10 a, b). In `packages/engine-core/test/l2/neuro/interactions.test.ts`, find:

```ts
    const m = ec50Multipliers({ ...N, volatileMac: 1 }).rocuronium;
    expect(m).toBeCloseTo(1 / 1.5, 6);
```

Replace with:

```ts
    // FU-7 (E-FU7-10 a): the divisor is re-sized to VOL_NMB_K (was × 0.67, i.e. 1/(1 + 0.5)). The duration band this case
    // carried moves to the `it.fails` below with both measured numbers; the ENGINE cell DI-51 (+52.2 %) is the acceptance.
    const m = ec50Multipliers({ ...N, volatileMac: 1 }).rocuronium;
    expect(m).toBeCloseTo(1 / (1 + VOL_NMB_K), 6);
```

and the duration band of the same case, which becomes its own declared `it.fails` (E-FU7-10 a; R45: kept, never widened),
find:

```ts
    const ratio = rec25(m) / rec25(1);
    expect(ratio).toBeGreaterThan(1.2);
    expect(ratio).toBeLessThan(1.45);
  });
```

Replace with:

```ts
  });
  // FU-7 (E-FU7-10 a): the band is UNCHANGED and now carries its measured numbers. This neuro-only rig applies a fixed
  // EC50 multiplier without the volatile's own PK, so it reads far less than the engine: DI-51 (1.1 MAC, real PK) is
  // +52.2 % — inside its 25–80 % band and PL — while the rig reads +13.4 %.
  it.fails('1 MAC volatile: rocuronium duration +20–45 % (this rig +13.4 %; engine cell DI-51 +52.2 %, band 25–80 %)', () => {
    const ratio = rec25(ec50Multipliers({ ...N, volatileMac: 1 }).rocuronium) / rec25(1);
    expect(ratio).toBeGreaterThan(1.2);
    expect(ratio).toBeLessThan(1.45);
  });
```

and its import, find:

```ts
import { ec50Multipliers } from '../../../src/l2/neuro/interactions.ts';
import { give, rig } from '../../helpers/neuro.ts';
```

Replace with:

```ts
import { ec50Multipliers, VOL_NMB_K } from '../../../src/l2/neuro/interactions.ts'; // FU-7 (E-FU7-10)
import { give, rig } from '../../helpers/neuro.ts';
```

In `packages/engine-core/test/l2/neuro/depth-drive.test.ts`, find:

```ts
    const v = ec50Multipliers({ ...N, volatileMac: 1 });
    expect(v.rocuronium).toBeGreaterThan(0.62);
    expect(v.rocuronium).toBeLessThan(0.72);
```

Replace with:

```ts
    // FU-7 (E-FU7-10): the same re-sized constant (was 0.62–0.72, the 0.5 divisor's band) — DI-51's duration band is the
    // acceptance property and lives in interactions.test.ts
    const v = ec50Multipliers({ ...N, volatileMac: 1 });
    expect(v.rocuronium).toBeCloseTo(1 / (1 + VOL_NMB_K), 6);
```

and its import (the two lines together — the single import line appears in both files), find:

```ts
import { neuroResp } from '../../../src/l2/neuro/drive.ts';
import { ec50Multipliers } from '../../../src/l2/neuro/interactions.ts';
```

Replace with:

```ts
import { neuroResp } from '../../../src/l2/neuro/drive.ts';
import { ec50Multipliers, VOL_NMB_K } from '../../../src/l2/neuro/interactions.ts'; // FU-7 (E-FU7-10)
```

Then the new cases. Add to `test/l2/neuro/interactions.test.ts`:
  1. blood Mg 2.1 mmol/L prolongs rocuronium exactly as profile Mg 2.1 does (the two paths agree to 1e-9 — DI-90's IN);
  2. iCa 1.6 mmol/L shortens the magnesium-potentiated block (band: ≥ 10 % of the potentiation removed — DI-25's MI);
  3. 1 MAC sevoflurane prolongs the T1 25 % time by **25–80 %** (DI-51's TS band, now the acceptance band);
  4. the nm profile `denervation` raises the succinylcholine ΔK⁺ to **3–7 mmol/L** (DI-37c) and `normal` keeps
     **0.3–0.8** (the existing 7c band — a regression guard).
- [x] **Step 5 — the cells.** `npx -y pnpm@9.15.9 run audit:drugs DI-25 DI-90 DI-37c DI-37d DI-51 DI-50 DI-53`.
Expected: DI-90 **IN → PL**, DI-25 **MI → PL**, DI-37c **IN → PL**, DI-51 **TS → PL**, DI-50/53/37d unchanged.
- [x] **Step 6 — commit.** `fix(7f,7c): one state each for magnesium, calcium and receptor upregulation (R51 addendum 24)`, push.

---

### Task 15: Volatiles — the second-gas effect and the desflurane surge trigger (addendum 24; 7g; UNPROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/l2/pk/volatile.ts` (the shared alveolar uptake)
- Modify: `packages/engine-core/src/l2/pk/pipeline.ts` (the surge trigger; the two `stepVolatile` calls)
- Test: extend `packages/engine-core/test/l2/pk/interactions-misc.test.ts`

**Why / measured:** DI-19 (MI): with 66 % N₂O, sevoflurane's FA/FI at 5 min is **0.70**, the same as in air — the two
agents step independently (`pipeline.ts` calls `stepVolatile` twice, `volatile.ts` updates each FA on its own). DI-70
(TW): a desflurane dial step 3 → 12 % gives HR **+1 bpm** (expected +20–30 % for 2–4 min) because the trigger reads the
BRAIN MAC rising > 0.3 in 60 s, which the vessel-rich-group compartment never does.

**The mechanism, with its source.** The concentration and second-gas effects come from the VOLUME of gas taken up by a
high-concentration agent: as N₂O is absorbed, the remaining alveolar gas is concentrated and an extra inspired volume is
drawn in (Miller ch. 19, uptake and distribution; Epstein 1964 measured the second-gas effect on halothane during 70 %
N₂O). `stepVolatile` ALREADY computes that uptake (`u = q·λb/g·(FA − Fv)`, `Fv` the flow-weighted venous return — review
F18: the first draft re-implemented it with an `s.fv` field that does not exist), so the term is EXPORTED, not written
twice.

- [x] **Step 1 — the shared uptake (one computation, review F18).** In `packages/engine-core/src/l2/pk/volatile.ts`, find:

```ts
export function stepVolatile(s: VolatileState, env: VolatileEnv, dtS: number): void {
  const a = AGENTS[s.agent];
  const w = env.weightKg / 70;
  const dt = dtS / 60;
  const q = env.coLpm;
  const fv = GROUPS.vrg.q * s.vrg + GROUPS.muscle.q * s.muscle + GROUPS.fat.q * s.fat;
  const u = q * a.bg * (s.fa - fv);
```

Replace with:

```ts
/** FU-7 (addendum 24; review F18): the agent's alveolar UPTAKE, L/min of gas — Q̇·λb/g·(FA − Fv) with Fv the
 * flow-weighted mixed-venous tension of the three tissue groups. `stepVolatile` uses it; for N2O at 66 % it is
 * ≈ 0.3–1 L/min in the first minutes, which concentrates the alveolar gas and draws in extra inspired volume — the
 * concentration and second-gas effects (M10 ch. 19; Epstein 1964). For a potent agent it is negligible. */
export function uptakeLpm(s: VolatileState, coLpm: number): number {
  const fv = GROUPS.vrg.q * s.vrg + GROUPS.muscle.q * s.muscle + GROUPS.fat.q * s.fat;
  return coLpm * AGENTS[s.agent].bg * (s.fa - fv);
}

export function stepVolatile(s: VolatileState, env: VolatileEnv, dtS: number): void {
  const a = AGENTS[s.agent];
  const w = env.weightKg / 70;
  const dt = dtS / 60;
  const q = env.coLpm;
  const u = uptakeLpm(s, q); // FU-7 (review F18): the ONE uptake computation
```

and the header comment's v1 note, find:

```ts
// No concentration or second-gas effect (v1 simplification, decision 9).
```

Replace with:

```ts
// FU-7 (addendum 24): the second-gas effect — N2O's uptake (`uptakeLpm`) augments the potent agent's effective
// alveolar ventilation (pipeline.ts); N2O's own concentration effect is not modelled (its FA/FI is unchanged).
```

In `packages/engine-core/src/l2/pk/pipeline.ts`, the import, find:

```ts
import { createVolatile, macForAge, macFraction, stepVolatile, type VolatileAgent, type VolatileState } from './volatile.ts';
```

Replace with:

```ts
import { createVolatile, macForAge, macFraction, stepVolatile, uptakeLpm, type VolatileAgent, type VolatileState } from './volatile.ts';
```

and the two steps, find:

```ts
    stepVolatile(pk.vap.s, env, PK_DT_S);
    stepVolatile(pk.vap.n2o, env, PK_DT_S);
```

Replace with:

```ts
    // FU-7 (addendum 24): the second-gas effect. N2O's uptake augments the potent agent's effective alveolar
    // ventilation (M10 ch. 19; Epstein 1964), so the potent agent is stepped with VA + U_N2O and N2O with VA.
    const uN2o = Math.max(0, uptakeLpm(pk.vap.n2o, env.coLpm));
    stepVolatile(pk.vap.s, { ...env, vaLpm: env.vaLpm + (env.vaLpm > 0 ? uN2o : 0) }, PK_DT_S);
    stepVolatile(pk.vap.n2o, env, PK_DT_S);
```

(In apnoea `vaLpm` is 0 and stays 0: the extra inspired volume needs a breath.) **Declared v1 scope:** N₂O's OWN
concentration effect (its FA/FI rising faster than a low-concentration agent's) is NOT added — `stepVolatile` keeps N₂O
on VA — so Step 3's concentration-effect case is written as `it.fails` with its number if N₂O's FA/FI at 5 min does not
already exceed sevoflurane's 30 % value (it may, from its low λb/g alone); the second-gas case is the target.

- [x] **Step 2 — the desflurane surge trigger.** In `pipeline.ts`, find:

```ts
  if (pk.vap?.agent === 'desflurane' && Math.abs(t - Math.round(t)) < PK_DT_S / 2) {
    pk.macPrev.push(macBrain);
    if (pk.macPrev.length > 60) pk.macPrev.shift();
    if (macBrain > 1 && macBrain - (pk.macPrev[0] as number) > 0.3 && t - pk.desSurgeT > 600) pk.desSurgeT = t;
  }
```

Replace with:

```ts
  if (pk.vap?.agent === 'desflurane' && Math.abs(t - Math.round(t)) < PK_DT_S / 2) {
    // FU-7 (addendum 24 / DI-70): the surge is an AIRWAY-RECEPTOR reflex to the rate of rise of the INSPIRED/end-tidal
    // fraction (Weiskopf 1994: a rapid increase in desflurane concentration, not a brain level, releases catecholamines),
    // so the trigger reads the end-tidal MAC fraction, which a dial step moves within seconds. The brain-MAC trigger
    // never fired: a 3 → 12 % step gave HR +1 bpm.
    const etMac = (100 * pk.vap.s.fa) / macForAge(pk.vap.s.agent, pk.patient.ageY); // END-TIDAL (alveolar) MAC fraction
    pk.macPrev.push(etMac);
    if (pk.macPrev.length > 60) pk.macPrev.shift();
    if (etMac > 1 && etMac - (pk.macPrev[0] as number) > 0.3 && t - pk.desSurgeT > 600) pk.desSurgeT = t;
  }
```

(`macFraction` is the BRAIN (VRG) fraction — `volatile.ts` says so — which is why the old trigger never fired; the
alveolar `fa` over `macForAge` is the end-tidal MAC the gas monitor shows, exactly as `bus.volatiles[…].fet/macAge`.)
- [x] **Step 3 — the tests.** Add to `interactions-misc.test.ts`:
  1. **second gas:** with 66 % N₂O, sevoflurane 2 % reaches a HIGHER FA/FI at 5 min than in air — band **+0.03 to +0.15**
     (Epstein 1964 measured ≈ 10 % higher halothane uptake; M10 ch. 19 calls the effect "small but real") and N₂O's own
     FA/FI is unchanged within 1e-9 (a one-way term);
  2. **concentration effect:** 66 % N₂O reaches FA/FI > its own 30 % value at the same time (the same term);
  3. **desflurane surge:** a dial step 3 → 12 % at FGF 4 L/min fires the surge within **60 s** and the HR rise is
     **8–35 bpm** for **2–4 min** (T6.3); a sevoflurane step does NOT fire it (MAP falls instead — DI-70's PL item);
  4. a step that stays below 1 MAC does not fire it (the trigger's own condition).
- [x] **Step 4 — the cells.** `npx -y pnpm@9.15.9 run audit:drugs DI-19 DI-70 DI-87 DI-18 DI-77`.
Expected: DI-19 **MI → PL**, DI-70 **TW → PL**; DI-87 (emergence order) and DI-18/DI-77 unchanged — if the emergence
times move by more than 10 %, the uptake term is too large: report and re-fit `uptakeLpm`'s scale, do not touch the
emergence bands.
- [x] **Step 5 — commit.** `feat(7g): the second-gas effect and an end-tidal desflurane surge trigger (R51 addendum 24)`, push.

---

### Task 16: Histamine release acts (addendum 24; 7g + 7a under E-FU7-3 + 7b under E-FU7-5; UNPROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts` (morphine's histamine size), `data/rows-cardiovascular.ts`
  (atracurium and mivacurium rows — atracurium does not exist yet: see Step 1)
- Modify: `packages/engine-core/src/l2/circ/model.ts` (**E-FU7-3**: the SVR and venous terms)
- Modify: `packages/engine-core/src/l2/resp/pipeline.ts`, `packages/engine-core/src/l2/lung/conditions.ts`
  (**E-FU7-5**: the constrictor input)
- Test: extend `interactions-misc.test.ts`; extend `test/engine/drug-layer.test.ts` (Task 19)

**Why / measured:** `bus.airway.histamine` is computed and **nothing consumes it** (audit D15). Fast morphine 10 mg gives
MAP **−3.3 %** (DI-42; expected −8 to −25 % through histamine-mediated vasodilation, M10 ch. 22) and no flushing or
bronchospasm anywhere.

**NOTE — this task builds the seam a future ASTHMA reactivity gain would multiply (CM amendment 2026-09-29,
research/19 finding 9; a note, NOT a step of this task and NOT a change to its scope).** The histamine →
bronchoconstriction path Step 1 and the `E-FU7-5` constrictor input create is the one place a bronchial-hyper-reactivity
factor belongs: the asthmatic airway constricts MORE to the same stimulus than the healthy one (research/12 tables §1.5:
bronchospasm on instrumentation 0.02 / 0.1 / 0.2 by reactivity). research/19's CM-11a is **MI** today — the asthma
profile has no reactivity gain, so a histamine releaser and an instrumentation stimulus act on an asthmatic exactly as on
a healthy patient. FU-7 does **not** add that gain (it is the `asthma` profile's, i.e. 7a/7b profile territory, and the
CM run routed the missing-profile family to Ali's v1.0-vs-v1.1 decision). What FU-7 owes it is that the seam be shaped so
a single per-profile factor can scale the constrictor input later without touching any drug row: keep the constrictor
input a **plain scalable input to the condition's reversible share** (`conditions.ts`), not a hard-coded per-drug airway
effect. The gate note §5 records this in one line ("CM-11a: the reactivity gain has no owner; the seam accepts one") and
the follow-up is listed under Requests → FU-8 / profile follow-up so it is not lost.

- [ ] **Step 1 — the releasers.** Morphine already has `{ target: 'histamine', emax: 0.6, ec50: 1 }`. Add the two NMB
releasers, which the library lacks (benzylisoquinolinium agents; cisatracurium is present and must stay clean — it is
the non-releasing one, which is the teaching point):

```ts
  // FU-7 (addendum 24): atracurium — histamine release on a fast bolus (M10 ch. 24: transient hypotension and flushing,
  // dose- and rate-dependent; cisatracurium does not). Hofmann elimination as cisatracurium; potency ED95 0.25 mg/kg.
  { id: 'atracurium', name: 'Atracurium', cls: 'nmb', amountUnit: 'mcg', pk: { kind: 'nmb', agent: 'cisatracurium' },
    pd: [{ target: 'histamine', emax: 0.7, ec50: 400 }],
    doses: '0.5 mg/kg (2×ED95 0.25); infusion 5–10 µg/kg/min', onset: 'max block 2–3 min, duration 20–35 min (label)',
    ir: '?', src: 'label; M10 ch. 24 (histamine release); PK shared with cisatracurium [ENG, Q: its own set]', tag: 'ENG' },
  // FU-7 (addendum 24): mivacurium — the shortest-acting benzylisoquinolinium, the strongest histamine releaser of the
  // three, hydrolysed by plasma cholinesterase (so the cholinesterase phenotypes prolong it as they do succinylcholine).
  { id: 'mivacurium', name: 'Mivacurium', cls: 'nmb', amountUnit: 'mcg', pk: { kind: 'nmb', agent: 'succinylcholine' },
    pd: [{ target: 'histamine', emax: 0.9, ec50: 250 }],
    doses: '0.2 mg/kg (2.5×ED95 0.08); infusion 4–10 µg/kg/min', onset: 'max block 2–3 min, duration 15–20 min (label)',
    ir: '?', src: 'label; M10 ch. 24; PK shared with succinylcholine [ENG, Q: its own set]', tag: 'ENG' },
```

**Declared v1 limitation, stated plainly (review F12; Orchestrator ruling (FU-7 review) 6f).** These two rows model
**histamine release ONLY — they produce NO neuromuscular block.** `pk.drugs` and `bus.agents` are keyed by ROW id and 7f
reads `bus.agents[a]` for the four `NmbAgent` ids only, so the `nmj`/`dia` concentrations these rows publish are consumed
by nothing: a trainee who gives atracurium gets histamine hypotension and a fully mobile patient. The `NmbAgent` union and
7f's Hill are UNCHANGED (that is deliberate: extending them would re-fit 7f's block model, which is not FU-7's). The
`agent:` field selects only the PK parameter set, so there is no cross-contamination of the cisatracurium/succinylcholine
compartments, and mivacurium's plasma-cholinesterase sensitivity comes along correctly. Required with the rows:
  - a guard test (Task 19 case 6): **"atracurium 0.5 mg/kg leaves the TOF unchanged (declared v1 limitation)"**;
  - one line in the gate note §5 AND in the instructor label / row `onset` text, so the rows cannot be mistaken for
    paralysing agents: `onset: '… v1: histamine release only — NO neuromuscular block (7f models four NMB agents)'`;
  - Ali's Q11 (below) asks whether the two rows should instead be DEFERRED until 7f can give them a block.
Verify that `bus.agents` still typechecks and that `nmb.test.ts` is green.
- [ ] **Step 2 — 7a consumes it (E-FU7-3).** In `packages/engine-core/src/l2/circ/model.ts`, in `control()`, after the
`d7` merge, add:

```ts
  // FU-7 (addendum 24 / audit D15): histamine (morphine, atracurium, mivacurium) — vasodilation and venodilation with a
  // reflex tachycardia that EMERGES from the pressure fall. Sizes [ENG; fit target: fast morphine 10 mg lowers SVR
  // 10–20 % (M10 ch. 22) and MAP 8–25 % (T6.3), with HR +3 to +25 (DI-42's PL item)].
  const hist = Math.min(1, Math.max(0, m.ext.histamine ?? 0));
  if (hist > 0) {
    de.svr *= 1 - HIST_SVR * hist;
    de.v0Frac += HIST_V0 * hist;
  }
```

with `export const HIST_SVR = 0.22;` and `export const HIST_V0 = 0.04;` in `l2/circ/params.ts` (7a's constants file) and
`histamine?: number` in the `ext` type. `engine.ts` writes it beside the other 7g→7a lines (**E-FU7-7**, the same
statement that carries `ext.avNodeBlock`): `circ7g.ext.histamine = ps.pk.bus.airway.histamine;`.
- [ ] **Step 3 — the lung consumes it (E-FU7-5).** FU-6's `SMOOTH_MUSCLE`/`relaxed` path relieves a lung condition's
severity with `bus.airway.bronchodilation`; FU-7 adds the CONSTRICTOR direction. In `l2/lung/conditions.ts` add:

```ts
/** FU-7 (addendum 24): a drug-driven bronchospasm severity — histamine release (morphine, atracurium, mivacurium) and
 * anaphylactic mediators act on the SAME smooth muscle FU-6's `relaxed()` relieves, so the drug's contribution is an
 * added SEVERITY on the `bronchospasm` spec, not a second state. 0.35 at full histamine [ENG; direction: M10 ch. 22 /
 * ch. 24 (wheeze and bronchospasm after a fast benzylisoquinolinium or morphine bolus), size has no source]. */
export const HIST_SPASM = 0.35;
```

and in `l2/resp/pipeline.ts`, where FU-6 resolves the lung specs, add the drug severity to the side-less `bronchospasm`
spec (creating it when absent), taking `bronchoDil` into account exactly as FU-6 does — i.e. the drug's spasm is
RELIEVABLE (it must NOT be added to `bdExempt`), so salbutamol reverses it. `RespCtx` gains `histamine?: number`, written
in `engine.ts`'s `advanceResp(` context (**E-FU7-7**, the line FU-6 edited).
- [ ] **Step 4 — the tests.**
  - `interactions-misc.test.ts`: morphine 10 mg gives `bus.airway.histamine` ≥ 0.4 at its peak; cisatracurium gives 0;
    atracurium 0.5 mg/kg gives ≥ 0.4 and mivacurium ≥ 0.5.
  - Task 19's engine test: **"fast morphine 10 mg drops SVR 10–20 % and MAP 8–25 % with HR +3 to +25"** (DI-42's bands),
    **"atracurium 0.5 mg/kg in a patient with bronchospasm worsens Ppeak, and salbutamol reverses it"** (bands from
    FU-6's measured Ppeak 44.0 untreated / 23.3 after salbutamol: assert a rise ≥ 3 cmH₂O and its relief), and
    **"cisatracurium does not"** (the teaching contrast).
- [ ] **Step 5 — the cells.** `npx -y pnpm@9.15.9 run audit:drugs DI-42 DI-40`. Expected: DI-42 **TW → PL**; DI-40
unchanged (FU-6's bronchodilation — a regression guard: the constrictor input must not break the relief path).
- [ ] **Step 6 — commit.** `feat(7g,7a,7b): histamine release acts on vessels and airways (R51 addendum 24)`, push.

---

### Task 17: The ephedrine tachyphylaxis curve and the inotrope / vasodilator sizes re-fitted to their sources (addendum 24; 7g; PARTLY PROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/l2/pk/data/rows-cardiovascular.ts` (ephedrine EC50, dobutamine, milrinone, GTN,
  hydralazine, labetalol, esmolol; nitroprusside — a new row)
- Modify: `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts` (dexmedetomidine's early α2B pressor arm; the
  volatile `bronchodilation` entries of sevoflurane, isoflurane and desflurane — FU-6 seam item 5, binding)
- Test: extend `interactions-misc.test.ts`; `packages/engine-core/test/l2/pk/pk-acceptance-pd.test.ts` (the pre-declared
  dobutamine `it.fails` — flip it ONLY if its band is met)

**Why / measured (audit D15 and D1's dexmedetomidine row):**
- **ephedrine tachyphylaxis too steep (DI-57, TS):** three 10 mg doses gave +6.4 / +2.4 / +0.3 mmHg, ratio 0.37 then 0.05
  against ×0.7 per repeat. Cause: the 0.7 dose scale compounds with a Hill whose EC50 is ONE 10 mg dose, so the summed
  doses saturate. **Prototype result after Task 9's indirect arm: +7.9 / +4.3 / +1.2, ratio 0.54 (band 0.4–0.95 ✓)** —
  the indirect arm moved it into band without touching the EC50. This task therefore only RAISES the EC50 if the
  post-Task-9 measurement leaves the band (Step 1 measures first).
- **dobutamine in low output (DI-12/32, TW):** CO **+17.9 %** against +20–40 % (tables §7 check 20) — measured BEFORE
  FU-4. The known `it.fails` in `test/engine/pk-acceptance-pd.test.ts` is 7g's own.
  **CM amendment (2026-09-29, research/19 finding 1 — the size may already be right):** on `origin/main` WITH FU-4
  merged, the same infusion in the HFrEF profile gives **CO +34.9 %** (CM-06d, inside its 20–45 band, verdict PL;
  re-measured by this fixer on 66e3052 — see the table below). FU-4's humoral/venous work supplied the venous-return
  response the old `it.fails` note blamed (NR-7g-2). So the refit below is **conditional on Step 1a's measurement**:
  if the HFrEF CO rise is in band on the merged tree, the EC50 is NOT changed and CM-06d becomes the guard that the
  rest of the task cannot overshoot it.

| cell | rig | readout | pre-FU-4 (research/14) | on main + FU-4 (this fixer, 66e3052) | band | action |
|---|---|---|---|---|---|---|
| CM-06d | HFrEF 60 y, ventilated, dobutamine 5 µg/kg/min | CO rise | +17.9 % (DI-12/32, TW) | **+34.9 %** (PL; SV +14.6 %, HR +4, MAP +2.1) | 20–45 % [tables §7 check 20 / T6.2] | measure first (Step 1a); refit only if out of band |
| CM-06e | HFrEF 60 y vs 60 y healthy, hydralazine 10 mg | SV rise / MAP fall | — | SV **+3.5 %** (TW, band 8–40), MAP −5.7 % (PL), SVR −15.3 % | SV +8–40 % [Cohn & Franciosa 1977] | the new nitroprusside row's HFrEF acceptance arm (Step 4) |
- **milrinone in RV failure (DI-11, TW):** PVR **−18.9 %** against −20–60 % and CO **+8.3 %** against +10–45 %.
- **GTN in RV infarct (DI-33, TW):** MAP **−13 %** against −20–30 %, fluid response **+3.1** against +5–15 mmHg.
- **esmolol 0.5 mg/kg (DI-07, TW):** HR **−4 bpm** against −10–20 % — the bolus's rate-equivalent Ce never reaches the
  `hr` EC50 of 250 rate-equivalent units.
- **dexmedetomidine (DI-60, MI):** the early pressor phase is declared "not modelled in v1"; HR falls 1 bpm against
  −10–20 %. Its HR/MAP sizes belong to FU-4's `symp` path (Requests → FU-4 item 1); what FU-7 adds is the α2B
  VASOCONSTRICTOR arm of a fast load, which is a peripheral effect and therefore 7g's.

- [ ] **Step 1 — measure first, then fit (the order matters).** With Tasks 8–9 applied, run
`npx -y pnpm@9.15.9 run audit:drugs DI-57 DI-12 DI-32 DI-11 DI-33 DI-07 DI-60 DI-40` and write the numbers into the gate
note as the "after addenda 20–21" column; for the volatile bronchodilation item also run FU-6's `X-bs-sevo` scenario
(`npx -y pnpm@9.15.9 run audit:respiratory X-bs-sevo`) and record `rAw` and Ppeak before/after. Fit ONLY the rows still
outside their bands. Every change below is
`[ENG]` with its fit target in the comment; none changes a test band.
- [ ] **Step 1a — dobutamine is measured on the MERGED tree before anything is fitted (CM amendment, finding 1).** The
DI cells above are pre-FU-4. Run the CM audit's HFrEF inotrope cell as well:
```
cd research/19-audit-scripts
CM_OUT=<scratchpad>/fu-7-task17/cells.json PME_ENGINE=<wt>/packages/engine-core/src/index.ts ./run.sh cli.ts CM-06d
```
Record `coPct` in the gate note beside the two numbers of the table above. **If `coPct` is inside 20–45**: make NO
dobutamine change in Step 2 (the `ec50: 7` row stays), state in the gate note that FU-4 supplied the venous-return
response the old note blamed on NR-7g-2, and keep CM-06d as the task's GUARD cell — Step 5 re-runs it after every other
row of Step 2 is applied and the task fails if `coPct` has left 20–45 (an overshoot is as much a miss as a shortfall).
**If `coPct` is below 20**, apply Step 2's dobutamine bullet as written and report both numbers. Either way the
`it.fails` in `test/engine/pk-acceptance-pd.test.ts` is re-measured in Step 4 on its OWN rig (a healthy patient, not
HFrEF) and flipped only if that rig meets +20 % — CM-06d does not license the flip.
- [ ] **Step 2 — the sizes (apply only what Step 1 requires).**
  - **dobutamine (ONLY if Step 1a measured the HFrEF CO rise below 20 %; skipped entirely at +34.9 %):**
    `{ target: 'ees', emax: 0.8, ec50: 7, beta: true, catecholamine: true }` → `ec50: 5` (the `beta`/`catecholamine`
    flags are on the row on the merged main — `rows-cardiovascular.ts:54` at 66e3052 — and are NOT removed; the earlier
    drafts quoted the row without them, so grep for `emax: 0.8, ec50: 7`, which is unique in `src/`) [label: SBP +10–20, HR +5–15 at 2.5–10
    µg/kg/min; fit target CO +20–40 % at 5 µg/kg/min in a failing ventricle, tables §7 check 20]. If CO still falls
    short, the remaining gap is 7a's venous-return response to inotropy (NR-7g-2) — report it, do not raise `emax`
    past 1.0.
  - **milrinone:** `{ target: 'pvr', emax: -0.5, ec50: 0.5 }` → `emax: -0.6, ec50: 0.4` and
    `{ target: 'ees', emax: 0.6, ec50: 0.5 }` → `ec50: 0.4` [label: SVR −17/−21/−37 % at 0.375/0.5/0.75 µg/kg/min,
    CO +30 % at 0.5].
  - **GTN:** `{ target: 'v0Frac', emax: 0.25, ec50: 1 }` → `emax: 0.32` [label + T6.2: venous capacitance +10–15 % of the
    blood volume at 1 µg/kg/min; the RV-infarct case is preload-dependent, so the venous term is the one that matters].
  - **esmolol:** `{ target: 'hr', emax: -0.35, ec50: 250 }` → `ec50: 150` [label: 0.5 mg/kg over 1 min gives a peak
    effect within 2 min; T6.2 HR −10–20 %]. Keep the `betaBlock` occupancy entry as it is (Task 8 uses it).
    **CM amendment (finding 3 — the refit moves cells that are IN band today).** At the 1 mg/kg dose the CM run
    measures HR −12 bpm in severe CAD (CM-04d, PL, band −30 to −10) and LAP −12.7 mmHg in severe MS (CM-14c, PL); the
    0.5 mg/kg rate-control arm in AF is the TW one (CM-15b, HR −12.9 % against −45 to −15 %, and it ends in the AF
    artefact of finding 4). Lowering the EC50 to 150 makes the 1 mg/kg dose STRONGER, so CM-04d can leave its band
    from the other side. Step 5 therefore re-measures **CM-04d, CM-14c and CM-15b** after the refit and the gate note
    carries the before/after pair for each; if CM-04d leaves −30 to −10, the EC50 is moved back toward 250 until both
    the 0.5 mg/kg band and the 1 mg/kg band hold, and if no single value does, both numbers go to Ali (Q12) with the
    rows left at the value that keeps the SOURCED 0.5 mg/kg band and CM-04d's own band is reported as the cost.
  - **hydralazine / labetalol:** unchanged (DI-59, the healthy onset/offset cell, is PL) — listed here so the gate note
    can say they were checked. **CM amendment (finding 2):** DI-59 is a HEALTHY rig; in HFrEF the same dose raises SV
    only **+3.5 %** against Cohn & Franciosa 1977's +8–40 % while SVR falls −15.3 % and MAP −5.7 % (CM-06e, TW, table
    above). The SVR size is therefore right and the missing SV is the failing ventricle's afterload sensitivity —
    **7a's gap C9, not this row's** (research/19 §3 C9). FU-7 changes no hydralazine number; Step 4 records CM-06e as a
    MEASUREMENT of the vasodilator seam, and Step 5 re-runs it so the gate note can state whether the new nitroprusside
    row behaves better than hydralazine on the same rig.
  - **nitroprusside (new row, D13):**
```ts
  // FU-7 (addendum 24): sodium nitroprusside — the balanced arterial+venous dilator addendum 24 names. Rate-equivalent
  // Ce as the other vasoactives (decision 4). Cyanide toxicity is NOT modelled in v1 (a note for 7i/Ali).
  { id: 'nitroprusside', name: 'Sodium nitroprusside', cls: 'vasodilator', amountUnit: 'mcg', pk: vaso(0.05, 0.3, 1.2),
    pd: [{ target: 'svr', emax: -0.6, ec50: 1 }, { target: 'v0Frac', emax: 0.12, ec50: 1 }, { target: 'pvr', emax: -0.3, ec50: 1 }, { target: 'hpvInhibit', emax: 0.8, ec50: 1 }],
    syringePerMl: 200, doses: '0.3–3 µg/kg/min (max 10 for < 10 min)', onset: 'onset < 30 s, offset 1–2 min (label)',
    ir: '?', src: 'SNP label (immediate onset, MAP falls 30–40 % at 1–3 µg/kg/min); T6.2 [TXT]; sizes [ENG]', tag: 'ENG' },
```
  - **dexmedetomidine's early arm:** add `{ target: 'svr', emax: 0.18, ec50: 0.35 }` with
```ts
    // FU-7 (addendum 24 / DI-60): the BIPHASIC response — a fast load's peripheral α2B vasoconstriction (MAP and SVR
    // rise for 5–10 min) before the central sympatholysis dominates. EC50 0.35 reference doses = the concentration a
    // 1 µg/kg load over 10 min passes through early [ENG; T6.3 "SVR +15 % during a fast load"; the row said "not
    // modelled in v1"]. The LATE fall is FU-4's `symp` row (Requests → FU-4 item 1).
```
  - **the volatile `bronchodilation` entries (FU-6 seam item 5 — FU-6's plan, "Requests → FU-7" item 5: "FU-7 re-fits
    that row"; D23; UNPROTOTYPED, it needs FU-6's consumer on the tree).** Today every potent volatile carries
    `{ target: 'bronchodilation', emax: 1, ec50: 0.5 }` (MAC units), so 0.8 MAC is B ≈ 0.62 — once FU-6's `relaxed()`
    consumes B (`s × (1 − frac·B)`, `frac` the condition's reversible share) a volatile is a near-complete
    bronchodilator, against "volatiles reduce airway resistance by ≈ 20–40 %" (FU-6 item 5; M10 ch. 19/ch. 44:
    sevoflurane ≈ 1 MAC lowers respiratory resistance, less than a β2 agonist in acute bronchospasm). The fit, in this
    order: (1) Step 1 measures, on the merged tree, the airway resistance (`rAw`, not Ppeak — Ppeak includes the elastic
    load) of FU-6's own rig `X-bs-sevo` (bronchospasm 1, sevoflurane 2.5 % at 6 L/min, 10 min, ≈ 0.8 MAC) and of the
    same rig at 1.0 MAC; (2) re-fit the three rows' **EC50 only** (`emax` stays 1, the Hill stays 1, one number for the
    three agents) so the resistance fall at 1 MAC is **20–40 %** [ENG; fit target FU-6 item 5's band] — the starting
    candidate is `ec50: 1.0` (B 0.44 at 0.8 MAC, 0.5 at 1 MAC); (3) the CO-CONSTRAINT is FU-6's own acceptance case
    "sevoflurane toward 1 MAC bronchodilates: Ppeak −30 % by 10 min (MAC 0.79, 40.0 → 25.0)" — FU-7 must not break a
    FU-6 band (R45), so if no EC50 meets BOTH, the rows stay at `ec50: 0.5`, both numbers go to the gate note §5 and
    the item goes to Ali (Q12 below); the executor does NOT edit FU-6's test. Comment on each re-fitted entry:
```ts
      // FU-7 (FU-6 seam item 5; D23): volatile bronchodilation re-fitted — EC50 <value> MAC [ENG; fit target: airway
      // resistance −20–40 % at 1 MAC in FU-6's bronchospasm rig, with FU-6's "Ppeak −30 % at 0.79 MAC" case kept green]
```
- [ ] **Step 3 — ephedrine's EC50, only if Step 1 says so.** If the repeat ratio is still below 0.4:
`{ target: 'sympDrive', emax: 1.6, ec50: 1 }` → `ec50: 2.5` with
```ts
    // FU-7 (addendum 24 / DI-57): the EC50 is several reference doses, so the TACHYPHYLAXIS factor (0.7 per repeat, T6.2)
    // sets the repeat response instead of the Hill's saturation [ENG; fit target: repeat/first 0.4–0.95, prototype 0.54].
```
and re-measure `pk-acceptance-pd.test.ts`'s "third dose ≤ 0.6 × the first" (it passed at 0.49 before; it must still pass).
- [ ] **Step 4 — the tests (review F15: assert only what FU-7 can produce).** In `interactions-misc.test.ts`:
(1) **the dexmedetomidine α2B arm ONLY** — a fast 1 µg/kg load raises SVR early (> 0 within 5–10 min) and that rise
DECAYS as the concentration passes its EC50; the LATE fall is FU-4's `symp` row (Requests → FU-4 item 1), so it is
written as a pre-declared `it.fails` titled with its measured number and the FU-4 request named ("… the crossing to a
FALL needs FU-4's dexmedetomidine `symp` row; measured Δ… at 15 min"), NOT as part of the α2B case. If FU-4's row has
landed by then (grep `rows-anaesthetic.ts` for a dexmedetomidine `symp` entry in Task 0), the two-sign case is written as
`it` instead and the gate note records that FU-4 supplied it. **Order note:** adding the pressor alone makes DI-60 read
"hypertensive"; the gate note §5 states that explicitly with the number, so the half-model is visible rather than silent.
(2) nitroprusside at 1 µg/kg/min lowers SVR 30–50 % and its offset is ≤ 2 min; (3) esmolol 0.5 mg/kg lowers HR 10–20 %
(DI-07's band). In `pk-acceptance-pd.test.ts`: flip the pre-declared dobutamine `it.fails` ONLY if CO reaches +20 % on
its own healthy rig — otherwise keep it with the new number in the title (Step 1a: CM-06d's HFrEF +34.9 % is not that
rig and does not license the flip).
**Step 4a — the nitroprusside HFrEF acceptance arm (CM amendment, finding 2).** The new row does not ship on a healthy
rig alone: add to `interactions-misc.test.ts` an arm on the CM-06e rig (the `hfref` profile, 60 y, ventilated,
nitroprusside 1 µg/kg/min for 20 min) asserting **SV rises ≥ 8 %** [Cohn & Franciosa 1977 (NEJM 297:27): arteriolar
dilators raise SV in the failing ventricle] **while MAP falls ≤ 15 %** [same source: the SV rise offsets the SVR fall].
Measure it BEFORE writing the expectation: the hydralazine twin on this rig gives SV +3.5 % today, so if nitroprusside
lands short too the case is written as **`it.fails` with its measured number in the title and "7a afterload sensitivity
(research/19 C9)" named in it** — the band is never widened and the row's sizes are not raised to force it (R45). The
gate note §5 states both numbers side by side (hydralazine +3.5 %, nitroprusside <measured>) so the orchestrator can see
whether the balanced dilator behaves better than the arteriolar one on the same failing ventricle; that comparison is
the finding's deliverable, not a pass.
- [ ] **Step 5 — the cells.** `npx -y pnpm@9.15.9 run audit:drugs DI-07 DI-11 DI-12 DI-32 DI-33 DI-57 DI-59 DI-60 DI-09 DI-10 DI-40`.
Expected: DI-07 **TW → PL**, DI-11/12/32 improved (PL if 7a's venous response allows — otherwise reported with numbers),
DI-33 **TW → PL**, DI-57 **PL**, DI-60 **MI → PL** on its early item (its HR item stays FU-4's), DI-09/10 unchanged,
DI-40 (FU-6's cell) still PL after the volatile re-fit — a regression guard on the relief path.
**Step 5a — the CM cells this task moves (CM amendment, findings 1–3).** With the CM runner (Step 1a's command,
cells `CM-06d CM-06e CM-04d CM-14c CM-15b`): **CM-06d** must still be inside 20–45 (the guard of finding 1 — an
overshoot fails the task); **CM-06e** re-measured and reported beside the new nitroprusside arm; **CM-04d** (esmolol
1 mg/kg in severe CAD, PL today at HR −12) and **CM-14c** (the same dose in severe MS, PL at LAP −12.7) must still be
in band after the esmolol EC50 refit; **CM-15b** (0.5 mg/kg in AF 150, TW today) re-measured — and it is only
interpretable once finding 4's AF defect has landed, so if FU-8 Part A is not on the tree the cell is reported as
BLOCKED rather than graded (Task 0 Step 6b). Every before/after pair goes to the gate note §5.
- [ ] **Step 6 — commit.** `fix(7g): re-fit the inotrope, vasodilator and tachyphylaxis sizes to their labels (R51 addendum 24)`, push.

---

### Task 18: The inert rows act or are documented; the QTc target (addendum 24; 7g + 7e + 7c; Steps 1–2 PROTOTYPED by the third fixer)

**Files:**
- Modify: `packages/engine-core/src/l2/pk/data/rows-other.ts` (dexamethasone, ondansetron, tranexamic acid)
- Modify: `packages/engine-core/src/l2/pk/row.ts` (`PdTarget` += `'glucocorticoid'`, `'qtc'`), `combine.ts` (publish
  `bus.metabolic.glucocorticoidNmolL`, `bus.qtcMsAdd`), `types-pk.ts`
- Modify: `packages/engine-core/src/l2/endo/{effects,core,adapters}.ts` (**E-FU7-2**: the exogenous glucocorticoid joins
  7e's cortisol METABOLIC term)
- Modify: `packages/engine-core/src/l2/blood/pipeline.ts` (**E-FU7-4**: add 7g's QTc delta to 7c's existing QTc path)
- Modify: `packages/engine-core/src/engine.ts` (**E-FU7-7**: ONE argument on the `bloodEcgTargets(` call)
- Test: extend `interactions-misc.test.ts`

**Why / measured:** DI-76 (MI): dexamethasone 8 mg changes nothing, although its glucose rise is expected (M10 ch. 47;
Hans 2006: +1–2 mmol/L over an hour) — the row is a declared placeholder. Ondansetron's QTc prolongation is declared "not
modelled". DI-73: tranexamic acid takes a dose and has no target, because its endpoint is bleeding (7i, R58).
**Third-fixer correction (D12):** the first draft gave dexamethasone a `glucose` PD target, but 7e does NOT read
`bus.metabolic.glucoseDelta` (`endo/adapters.ts` `observeDoses`: "`bus.metabolic.glucoseDelta` is NOT used (7e owns
glucose)" — insulin and dextrose reach 7e's glucose model as dose observers), so that target would have changed nothing
and DI-76 would have stayed MI. The mechanism is a GLUCOCORTICOID: dexamethasone acts on the SAME metabolic terms as 7e's
endogenous cortisol (insulin resistance `CORT_SI_LOSS`, gluconeogenesis `CORT_EGP_X`), combined with it in ONE Hill, as a
cortisol-equivalent above basal. Its permissive VASCULAR effect (hours) is not modelled in v1 (`vasoResp` keeps reading
endogenous cortisol only), so the case "nothing else moves" holds by construction. Every edit below is a real block.

- [ ] **Step 1 — the two new targets and bus fields (7g).** In `packages/engine-core/src/l2/pk/row.ts`, find (Task 11's
line):

```ts
  | 'antiarrhythmic';
```

Replace with:

```ts
  | 'antiarrhythmic'
  /** FU-7 (addendum 24 / DI-76): an exogenous GLUCOCORTICOID as cortisol-equivalent nmol/L above basal → 7e's cortisol
   * metabolic term (insulin resistance, gluconeogenesis). */
  | 'glucocorticoid'
  /** FU-7 (addendum 24 / DI-76): an added QTc, ms → 7c's ECG QTc delta (`bloodEcgTargets`). */
  | 'qtc';
```

In `packages/engine-core/src/types-pk.ts`, find:

```ts
  metabolic: { kShift: number; glucoseDelta: number; dantroleneE: number };
```

Replace with:

```ts
  /** FU-7 (addendum 24): `glucocorticoidNmolL` = an exogenous glucocorticoid (dexamethasone) as cortisol-equivalent
   * nmol/L above basal, read by 7e's cortisol metabolic term. */
  metabolic: { kShift: number; glucoseDelta: number; dantroleneE: number; glucocorticoidNmolL: number };
```

find:

```ts
  rhythm: { antiarrhythmicU: number };
```

Replace with:

```ts
  rhythm: { antiarrhythmicU: number };
  /** FU-7 (addendum 24 / DI-76): drug-added QTc, ms (ondansetron) — 7c adds it to its ECG QTc delta. */
  qtcMsAdd: number;
```

and the neutral bus — find (the `types-pk.ts` literal; the same text also appears in two plan documents under `docs/`,
which the verifier excludes):

```ts
  metabolic: { kShift: 0, glucoseDelta: 0, dantroleneE: 0 },
```

Replace with:

```ts
  metabolic: { kShift: 0, glucoseDelta: 0, dantroleneE: 0, glucocorticoidNmolL: 0 },
```

find:

```ts
  rhythm: { antiarrhythmicU: 0 }, // FU-7 (addendum 23)
```

Replace with:

```ts
  rhythm: { antiarrhythmicU: 0 }, // FU-7 (addendum 23)
  qtcMsAdd: 0, // FU-7 (addendum 24)
```

In `packages/engine-core/src/l2/pk/combine.ts`, find (Task 11's line):

```ts
  bus.rhythm = { antiarrhythmicU: Math.min(1, Math.max(0, other.antiarrhythmic ?? 0)) }; // FU-7 (addendum 23)
```

Replace with:

```ts
  bus.rhythm = { antiarrhythmicU: Math.min(1, Math.max(0, other.antiarrhythmic ?? 0)) }; // FU-7 (addendum 23)
  bus.metabolic.glucocorticoidNmolL = Math.max(0, other.glucocorticoid ?? 0); // FU-7 (addendum 24): dexamethasone
  bus.qtcMsAdd = Math.max(0, other.qtc ?? 0); // FU-7 (addendum 24): ondansetron
```

- [ ] **Step 1b — 7e reads the glucocorticoid (E-FU7-2).** In `packages/engine-core/src/l2/endo/effects.ts`, find:

```ts
export function stressEffects(h: HormoneState, bb: BetaBlock, cortResponse: number): StressEffects {
```

Replace with:

```ts
/** `cortExo` (FU-7, addendum 24): an exogenous glucocorticoid as cortisol-equivalent nmol/L above basal (7g's
 * dexamethasone) — it joins the METABOLIC cortisol term only; `vasoResp` keeps reading endogenous cortisol. */
export function stressEffects(h: HormoneState, bb: BetaBlock, cortResponse: number, cortExo = 0): StressEffects {
```

find:

```ts
  const co = hill(h.cort - CORT_BASAL, CORT_EC50);
```

Replace with:

```ts
  const co = hill(h.cort + Math.max(0, cortExo) - CORT_BASAL, CORT_EC50); // FU-7 (addendum 24): + exogenous glucocorticoid
```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
  epiExoPgMl: number; // 7g epinephrine as plasma pg/mL
```

Replace with:

```ts
  epiExoPgMl: number; // 7g epinephrine as plasma pg/mL
  /** FU-7 (addendum 24 / DI-76): 7g's exogenous glucocorticoid, cortisol-equivalent nmol/L above basal (0 without 7g). */
  cortExoNmolL?: number;
```

find:

```ts
  const st = stressEffects(c.hormones, { hr: x.betaBlock, c: x.betaBlockC }, c.profile.adrenalInsufficiency ? 0.5 : 1);
```

Replace with:

```ts
  const st = stressEffects(c.hormones, { hr: x.betaBlock, c: x.betaBlockC }, c.profile.adrenalInsufficiency ? 0.5 : 1, x.cortExoNmolL ?? 0); // FU-7 (addendum 24)
```

In `packages/engine-core/src/l2/endo/adapters.ts`, find:

```ts
    epiExoPgMl: (pk?.bus?.agents?.epinephrine?.brain ?? 0) * EPI_EXO_PG_PER_RATE_EQ,
```

Replace with:

```ts
    epiExoPgMl: (pk?.bus?.agents?.epinephrine?.brain ?? 0) * EPI_EXO_PG_PER_RATE_EQ,
    // FU-7 (addendum 24 / DI-76): 7g's exogenous glucocorticoid (dexamethasone), duck-typed
    cortExoNmolL: (pk?.bus as { metabolic?: { glucocorticoidNmolL?: number } } | undefined)?.metabolic?.glucocorticoidNmolL ?? 0,
```

- [ ] **Step 1c — the dexamethasone row.** In `packages/engine-core/src/l2/pk/data/rows-other.ts`, find:

```ts
  { id: 'dexamethasone', name: 'Dexamethasone', cls: 'placeholder', amountUnit: 'mg', pk: gammaPk(8, false, 3600, 86400), pd: [], doses: '4–8 mg', onset: 'no monitor effect in v1 (glucose ↑ is 7e)', ir: '?', src: 'placeholder', tag: 'TXT' },
```

Replace with:

```ts
  // FU-7 (addendum 24 / DI-76; D12): dexamethasone 8 mg raises glucose ≈ 1–2 mmol/L (18–36 mg/dL) over the first hours
  // and more in diabetics (Hans 2006; M10 ch. 47) — a GLUCOCORTICOID acting on 7e's cortisol metabolic term (insulin
  // resistance, gluconeogenesis). emax 4000 → 2000 nmol/L cortisol-equivalent above basal at the 8 mg reference dose
  // (≈ 200 mg hydrocortisone-equivalent, potency 25:1) [ENG; fit target: glucose +10–60 mg/dL within 1 h (DI-76).
  // Measured (third fixer): +17.7 mg/dL at 60 min, +19.7 at 2 h, MAP/HR unchanged; emax 600 gave +8.4, 2000 +14.7].
  { id: 'dexamethasone', name: 'Dexamethasone', cls: 'placeholder', amountUnit: 'mg', pk: gammaPk(8, false, 3600, 86400), pd: [{ target: 'glucocorticoid', emax: 4000, ec50: 1 }], doses: '4–8 mg', onset: 'glucose +1–2 mmol/L over 1–2 h (Hans 2006); anti-emetic and anti-inflammatory effects are not modelled', ir: '?', src: 'Hans 2006; M10 ch. 47; size [ENG]', tag: 'ENG' },
```

- [ ] **Step 2 — ondansetron's QTc.** In `packages/engine-core/src/l2/pk/data/rows-other.ts`, find:

```ts
  { id: 'ondansetron', name: 'Ondansetron', cls: 'placeholder', amountUnit: 'mg', pk: gammaPk(4, false, 600, 14400), pd: [], doses: '4 mg', onset: 'no monitor effect in v1 (QTc prolongation not modelled)', ir: '?', src: 'placeholder', tag: 'TXT' },
```

Replace with:

```ts
  // FU-7 (addendum 24 / DI-76): ondansetron 4–8 mg IV prolongs the QTc ≈ 10–20 ms (FDA 2012 label change; the 32 mg IV
  // dose was withdrawn for this reason). No arrhythmia hazard is added in v1: torsades needs the QT-dependent trigger
  // Stage 5's torsades rhythm provides by instruction. emax 30 → 15 ms at the 4 mg reference dose (the Hill is
  // emax·c/(ec50 + c)) [ENG within the label range; measured (third fixer): +14 ms at 10–30 min, +8 at 2 h; emax 15 gave 7].
  { id: 'ondansetron', name: 'Ondansetron', cls: 'placeholder', amountUnit: 'mg', pk: gammaPk(4, false, 600, 14400), pd: [{ target: 'qtc', emax: 30, ec50: 1 }], doses: '4 mg', onset: 'QTc +10–20 ms (FDA 2012); no arrhythmia hazard in v1', ir: '?', src: 'FDA 2012 label change; size [ENG]', tag: 'ENG' },
```

7c's `bloodEcgTargets` (E-FU7-4) — in `packages/engine-core/src/l2/blood/pipeline.ts`, find:

```ts
export function bloodEcgTargets(bs: BloodState): { k: number; qtc: number } {
```

Replace with:

```ts
/** `qtcAdd` (FU-7, addendum 24): 7g's drug-added QTc, ms (ondansetron), added to the iCa term. */
export function bloodEcgTargets(bs: BloodState, qtcAdd = 0): { k: number; qtc: number } {
```

find (the end of its return statement):

```ts
qtc: qtcDeltaCa(bs.core.out.iCa) };
```

Replace with:

```ts
qtc: qtcDeltaCa(bs.core.out.iCa) + Math.max(0, qtcAdd) };
```

and the ONE call site in `packages/engine-core/src/engine.ts` (**E-FU7-7**), find:

```ts
    const tg = bloodEcgTargets(ps.blood);
```

Replace with:

```ts
    const tg = bloodEcgTargets(ps.blood, (ps.pk.bus as { qtcMsAdd?: number }).qtcMsAdd ?? 0); // FU-7 (addendum 24): ondansetron's QTc
```

- [ ] **Step 3 — tranexamic acid keeps its hook (D12).** Change only the comment and the `onset` text. In
`packages/engine-core/src/l2/pk/data/rows-other.ts`, find:

```ts
  { id: 'tranexamicAcid', name: 'Tranexamic acid', cls: 'placeholder', amountUnit: 'mg', pk: gammaPk(1000, false, 600, 10800), pd: [], doses: '1 g over 10 min, then 1 g over 8 h', onset: 'no monitor effect in v1', ir: '?', src: 'placeholder', tag: 'TXT' },
```

Replace with:

```ts
  // FU-7 (addendum 24 / D12): TXA stays INERT until 7i's coagulation lands (R58). Its dose log (bus.doses) is what 7i
  // will read, so the row must not be removed: 7i adds the fibrinolysis target to THIS row.
  { id: 'tranexamicAcid', name: 'Tranexamic acid', cls: 'placeholder', amountUnit: 'mg', pk: gammaPk(1000, false, 600, 10800), pd: [], doses: '1 g over 10 min, then 1 g over 8 h', onset: 'antifibrinolytic: no monitor effect until 7i models coagulation (R58; CRASH-2 acts through bleeding)', ir: '?', src: 'CRASH-2; placeholder for 7i', tag: 'TXT' },
```

- [ ] **Step 4 — the tests.** In `interactions-misc.test.ts`: (1) dexamethasone 8 mg raises glucose **10–60 mg/dL** within
an hour (DI-76's band) and nothing else moves (HR, MAP quiet within tolerance); (2) ondansetron 4 mg adds **10–20 ms** of
QTc and no rhythm change; (3) tranexamic acid 1 g leaves Hb, MAP and `bvRel` unchanged (a QUIET test that documents the
7i hook, DI-73's PL); (4) sugammadex 16 mg/kg lowers HR 15–30 % and 4 mg/kg < 5 % (Task 12 Step 6).
**Step 4a — the DIABETIC dexamethasone arm (CM amendment, research/19 finding 8; research/12 ET-19).** Case (1) above is
a healthy patient. Add a second arm on the same rig with the engine's own diabetes state — `endo.diabetes: 'type2'` on
the `PatientProfile` (an engine-API field; it is NOT in `pme-scenario/1`, so the arm is written in the test, not as a
scenario, and Task 19 does not need a console row for it) — and assert that **the glucose rise is LARGER than in the
non-diabetic arm on the same 8 mg dose**, with the diabetic peak inside **+2–4 mmol/L (36–72 mg/dL)** over 4–8 h
[research/12 ET-19; PADDI (Corcoran 2021, NEJM 384:1731): dexamethasone raises perioperative glucose more in diabetes;
JBDS 2023 perioperative diabetes]. The comparison assertion (diabetic > non-diabetic) is the case's core and carries
ET-19 as its source; the absolute band is the second assertion. **Measure before writing it:** 7e's diabetic patient
already reaches 11.1 mmol/L under surgical stress alone against 7.6 in health (CM-09c, PL), so the glucose model does
respond to the state — but FU-7 adds only the glucocorticoid term and does not touch 7e's diabetes handling. If the
diabetic arm's peak falls short of +2 mmol/L, the case is written as **`it.fails` with both measured numbers in the
title** and the gate note §5 names 7e's glucose model (research/19 §2.9 CM-09c) as the owner of the remainder; the
comparison assertion stays as `it` if the direction holds. Nothing in 7e is re-tuned to make the band (R45), and the
`glucocorticoid` Emax is not raised for this arm — its fit target is the healthy DI-76 band only.
**ET amendment — measured, and why main reads 0.00 (research/14-coverage ET-19).** ET-19 (type 2, 60 y, GA flag,
ventilated, no surgery, dexamethasone 8 mg vs none) reads **Δglucose 0.00** at 4–8 h on `origin/main` 7954933. The
cause is not diabetic-specific: on main the row is the placeholder (`pd: []`), and 7e observes only insulin and
dextrose doses, so no patient's glucose moves. Steps 1–1c ARE the fix. The glucocorticoid reaches 7e's cortisol
metabolic term, which acts through `CORT_SI_LOSS` (insulin sensitivity) and `CORT_EGP_X` (hepatic output). With
no diabetic-specific code, the same term raises the type 2 patient's glucose more (measured below). No further change
is needed.

Measured by the RH/ET-amendment fixer with Steps 1–1c applied (`origin/main` 7954933 + Tasks 1–10 and 18; ET runner
read-only; probe `<scratchpad>/fu-7-amend3/dexprobe.ts`, same rig as ET-19):

| arm (60 y, same rig) | glu₀ mmol/L | Δ 1 h | Δ 2 h | Δ max 4–8 h |
|---|---|---|---|---|
| type 2 diabetes | 7.99 | +1.48 | +1.82 | **+1.83** |
| non-diabetic | 5.55 | +0.98 (= +17.7 mg/dL, the third fixer's DI-76 number) | +1.09 | **+1.02** |

MAP moves 0 in both arms at 1 h. So case (1) is `it`, and in Step 4a the comparison assertion is **`it`** (1.83 >
1.02). The absolute band is **`it.fails` "diabetic dexamethasone peak +2–4 mmol/L at 4–8 h (PADDI): measured +1.83;
non-diabetic +1.02"**, 0.17 short, with 7e's glucose model (CM-09c) as the owner of the remainder. The Emax stays at 4000.
ET-19's own band carries [VERIFY magnitude] in research/14-coverage. So the gate note also puts the PADDI magnitude to
Ali (Q16) before anyone treats 0.17 mmol/L as a defect.
- [ ] **Step 5 — the cells.** Also run the CM diabetic cell as a regression guard (CM amendment, finding 8):
`cd research/19-audit-scripts && CM_OUT=<scratchpad>/fu-7-task18/cells.json PME_ENGINE=<wt>/packages/engine-core/src/index.ts ./run.sh cli.ts CM-09c`
— it is PL today (diabetic peak 11.1 vs healthy 7.6 mmol/L under surgical stress, no dexamethasone) and must stay PL:
FU-7's glucocorticoid term must not move the stress-response glucose of a patient who received no steroid. Then
`npx -y pnpm@9.15.9 run audit:drugs DI-76 DI-73`. **ET amendment:** also run the ET cell this step owns:
`cd research/14-coverage-et-scripts && ET_OUT=<scratchpad>/fu-7-task18/et.json PME_ENGINE=<wt>/packages/engine-core/src/index.ts ./run.sh cli.ts ET-19`.
Before: 0.00 (main 7954933). The amendment's prototype gave **+1.83** (TW against 2–4), and the gate note §5 carries
both numbers. Expected: DI-76's automatic grade
**PL** (third fixer: glucose +11 mg/dL in the audit's window, HR 0) while its research/14 `hand` note keeps printing MI
(Task 1 forbids editing it — the gate note §3 reports "automatic PL, hand MI stale"), DI-73 **PL** (unchanged, now
with the hook documented).
- [ ] **Step 6 — commit.** `feat(7g): dexamethasone glucose, ondansetron QTc, a documented TXA hook (R51 addendum 24)`, push.

---

### Task 19: The flipped matrix cells as engine tests, the console rows, and the SLOW split (R54; UNPROTOTYPED)

**Files:**
- Test: create `packages/engine-core/test/engine/drug-layer.test.ts` (SLOW_B)
- Test: extend `packages/engine-core/test/engine/drug-apnoea.test.ts` (Task 7) and
  `test/engine/stimulus-surge.test.ts` (Task 10)
- Modify: `packages/engine-core/vite.config.ts` (three `SLOW_B` entries)
- Modify: `packages/engine-core/src/truth.ts` (**E-FU7-8**), `apps/demo/src/physiology-console/meta.ts` (**E-FU7-8**)

**Why:** R54 makes the coverage matrix the standing definition of linked physiology and requires each gate to show its
part. The audit's §4 table names the cells FU-7 owns; this task turns the ones a unit test cannot express into engine
tests with their bands and sources, so a later stage cannot silently undo them.

- [ ] **Step 1 — the engine test file.** Create `packages/engine-core/test/engine/drug-layer.test.ts`: one `describe`
per addendum, rigs as research/14 §1 (adult 40 y, 70 kg, 175 cm, male; ABP/CVP/PAP/SpO₂/CO₂/temp on; "vent" = ETT +
VCV 12 × 600, PEEP 5, FiO₂ 0.5 from t = 1 s; interventions at t = 300 s, or 960 s after a 10-min bleed from 60 s), each
case **yielding once per sim-minute**, every band carrying its source in the title:
  1. **addendum 19:** atropine 0.5 mg peaks at **10–180 s** (DI-63) and glycopyrrolate 0.4 mg at **60–600 s**;
     naloxone 0.4 mg reverses an opioid within **30–180 s** (DI-71).
  2. **addendum 20:** thiopental 4 mg/kg → unconsciousness within **20–60 s** and awakening at **240–900 s** (DI-69);
     etomidate 0.3 mg/kg → **150–600 s** duration; both become apnoeic while unconscious; ketamine 1.5 mg/kg is
     unconscious with a depth index **> 60** (the dissociative paradox, D3) and emerges at **10–20 min** (M10 Table
     21.1; D20 — measured 11.9 min) — its LOC "not faster than 30 s" is the pinned `it.fails` "measured 20 s" (D20);
     midazolam 0.05 mg/kg reaches its depth nadir at **120–420 s** (DI-88; measured 190 s — was an `it.fails` at 115 s
     before Task 2 Step 2b). **The elderly arm (review F5, D19a):** the same patient at 80 y loses consciousness on a
     smaller dose — the smallest bolus (geometric bisection, 9 steps, over 0.01–0.3 mg/kg midazolam / 0.5–5 mg/kg
     thiopental) that sets `neuro.flags.conscious` false within 10 min at 80 y is, for midazolam, **0.4–0.6 ×** the 35-y
     dose (M10 ch. 21: 20–50 % less) and, for thiopental, **0.6–0.8 ×** (the PK share of Homer & Stanski 1985 reached
     through 7f's Schnider LOC scale). **Measured (third fixer, ventilated rig, seed 7):** midazolam 0.139 → 0.069 mg/kg
     (**0.50**), thiopental 1.53 → 1.08 (**0.71**), etomidate 0.114 → 0.082 (**0.71**).
  3. **addendum 21:** ephedrine 10 mg raises MAP **8–25 mmHg** (T6.2); dobutamine 5 µg/kg/min in the β-blocked profile
     reaches **≤ 0.8 ×** the healthy CO rise (DI-83); adrenaline 100 µg under NON-SELECTIVE blockade gives a LARGER
     pressor response than under none (DI-05's PL item) — and the reflex-bradycardia assertion is `it.fails` with the
     measured number (Task 8 Step 6);
     **ephedrine β-blocked ratio 0.3–0.7 is `it.fails` with "measured 0.99" in the title** (Q1; 0.99 on main + FU-4
     e3eeb56 with Task 10, 0.96 on b675248 — the executor titles it with the merged tree's number).
  4. **addendum 22:** Task 10's surge cases (kept in their own file).
  5. **addendum 23:** amiodarone 300 mg during CPR raises the modelled shock success (assert
     `outcomeProbabilities`'s ROSC share through two shocks in a seeded run: **≥ 1.2 ×** the no-drug share, ARREST 1999)
     and lidocaine or amiodarone converts stable VT in **20–35 %** of 200 seeded runs (PROCAMIO).
  6. **addendum 24:** the LAST sum (DI-23), morphine's histamine fall (DI-42), the second-gas rise (DI-19), the
     desflurane surge (DI-70), the Mg/Ca agreement (DI-90/25), denervation + succinylcholine K⁺ **3–7** (DI-37c),
     dexamethasone glucose (DI-76), sugammadex 16 mg/kg bradycardia (DI-45), and the declared v1 limitation as a GUARD
     (review F12, D19f): **"atracurium 0.5 mg/kg leaves the TOF unchanged (declared v1 limitation: histamine release
     only, NO neuromuscular block)"** — TOF count 4 and ratio within 0.02 of baseline for 10 min, while MAP falls.
  7. **regression guards** (the cells that were already PL and must stay so): DI-14a adenosine conversion, DI-54
     magnesium in torsades, DI-24 lipid in LAST, DI-26 the K⁺ treatments, DI-65 MH and dantrolene, DI-67 TCI,
     DI-85/86/68 CSHT (DI-85 added — review F20), DI-87 the emergence order, DI-77 the MAC reduction, DI-50/53 the NMB
     course, and DI-15 (verapamil in pre-excited AF — the cell Tasks 11 and 19 both cite, review F20).
  8. **AF-rig guard (CM amendment, research/19 finding 5 / gap C3 — read Task 0 Step 6b first).** Cases 5 and 7's
     AF cells (DI-13b/DI-14a/DI-15 and any arm this file runs in atrial fibrillation) sit on a rig that deteriorates on
     its own until FU-8 Part A's end-diastolic-pressure fix lands (CM-15c: `kIsch` → 0 in a healthy 40 y at AF 150). If
     Task 0 Step 6b reported the check as FAILED, every AF arm of this file keeps its window **under 5 minutes** of
     simulated time, carries a no-drug **control arm asserting `kIsch` ≥ 0.9** at every sample as a precondition, and is
     titled "(AF rig guarded: C3 pending)"; the gate note §5 lists each with its measured control-arm `kIsch`. A band is
     never re-fitted against a failing heart: a guarded arm that cannot hold 0.9 inside 5 min becomes an `it.fails`
     naming C3 / FU-8 Part A. When Step 6b PASSED, the arms run at their natural length and the gate note says so.
- [ ] **Step 2 — the THREE slow entries, by whatever mechanism FU-4 landed (review F16).** FU-7 adds **three** files
(the file map said "two" — corrected). On `origin/fu-4-integration-polish` (f576537, b675248) `vite.config.ts` still has
ONE `SLOW` list, and the FU-6 R50 ruling 10 says `SLOW_B` is DERIVED from `SLOW` by FU-4's filter rather than listed.
So, in this order:
  1. `grep -n "SLOW" packages/engine-core/vite.config.ts`. **If `SLOW_B` is a LIST,** add the three entries to it;
     **if it is a FILTER over `SLOW`,** add the three to `SLOW` and check the filter puts them in `slow-b` (extend the
     filter only if it does not, and say which in the gate note); **if there is no split,** add them to `SLOW`:
```
  'test/engine/drug-layer.test.ts', // FU-7: the addenda 19–24 matrix cells
  'test/engine/drug-apnoea.test.ts', // FU-7 Task 7: the apnoea truth and the Bailey pair
  'test/engine/stimulus-surge.test.ts', // FU-7 Task 10: the laryngoscopy surge
```
  2. Assert the groups stay DISJOINT and that each new file appears in exactly ONE selection (FU-4's 9th-cap ruling 6:
     `neuro-longrun` was in both), and record the mechanism and the three memberships in the gate note §7.
- [ ] **Step 3 — the console (E-FU7-8).** `src/truth.ts`: add SKIP_PATH entries for the derived fields that would
otherwise appear twice (`pk.bus.cns.hypVentPropEq`, `pk.bus.cns.opioidVentFentEq`). `apps/demo/src/physiology-console/meta.ts`:
add the drug group's new rows with research/11 §5's clinical labels and units — "Propofol-equivalent effect-site
concentration (Ce prop-eq, µg/mL)", "Fentanyl-equivalent effect-site concentration (Ce fent-eq, ng/mL)",
"Dissociative fraction (—)", "β-receptor occupancy (—)", "Antiarrhythmic occupancy (—)", "Central sympathetic drive from
drugs (—)". No layout change (R52's generic discovery already shows unknown paths in "other"; these rows give them their
labels).
- [ ] **Step 4 — run the full set.**
```
CI=1 PME_TEST_SET=fast npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run
CI=1 PME_TEST_SET=slow-a npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run
CI=1 PME_TEST_SET=slow-b npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run
npx -y pnpm@9.15.9 -r typecheck && npx -y pnpm@9.15.9 -r test && npx -y pnpm@9.15.9 build
```
Record every count and every `it.fails` in the gate note. A test that fails for a reason OTHER than a declared
`it.fails` stops the task.
- [ ] **Step 5 — the audit's own regression.**
`npx -y pnpm@9.15.9 run audit:drugs all` (≈ 30 min on an idle machine; run it in the background with a bounded `until`
loop of ≤ 10 min per check), then `node --experimental-strip-types scripts/audit-drugs/report.ts > docs/gates/fu-7/audit-after.md`
and `ledger.ts > docs/gates/fu-7/ledger-after.md`. Diff the verdict counts against `audit-before.md` and paste the table
into the gate note. **Target (from research/14 §4's FU-7/7g/7f/7c rows):** DI-69, 71, 72, 88, 63, 04a, 05, 41, 23, 70,
19, 13a, 15, 61, 14c, 57, 25, 90, 37c, 51, 42, 45, 60, 76, 08, 21, 03, 89, 01d move to PL, except the declared
`it.fails` (DI-15 added by review F20; DI-85 joins case 7's CSHT guards).
- [ ] **Step 6 — commit.** `test(fu-7): the drug-layer matrix cells as engine tests; console rows`, push.

---

### Task 20: Gate — verification, evidence screenshots, the gate note, the pull request

**Files:**
- Create: `docs/gates/fu-7.md`, `docs/gates/fu-7/*.png`, `docs/gates/fu-7/{baseline,audit-before,audit-after,ledger-after}.md`
- Create: `apps/demo/fu7.html`, `apps/demo/src/fu7.ts`, `apps/demo/scripts/fu7-shots.mjs`, `apps/demo/e2e/fu7.e2e.ts`
- Modify: this plan (tick the boxes)

- [ ] **Step 1 — merge main and re-verify.** `git fetch origin && git merge origin/main`. If V.1, FU-5, 7i or Stage 9
have landed since Task 0, re-run Task 0 Step 3's verifier in dry mode, re-run the full test set (Task 19 Step 4) and
`pnpm run audit:drugs` for the 18 owned cells; record every moved number. STOP and report if another stage has taken a
file this plan edits.
- [ ] **Step 2 — the evidence page (Chromium only).** `apps/demo/fu7.html` + `src/fu7.ts`: four panels driven by the
engine, each a screenshot (`deviceScaleFactor: 0.7`, viewport 1280 × 640, **≤ 60 KB each**, quantised if larger and the
fact recorded):
  1. **onset** — the effect curves of naloxone, atropine, midazolam and ketamine over 10 min, before (gamma) and after
     (chain), with the peak and 10 % markers;
  2. **potency** — an induction with thiopental: the propofol-equivalent Ce, the depth index, consciousness and the
     spontaneous rate on one time axis (the DI-69 course);
  3. **β-blockade** — ephedrine and adrenaline in the healthy and the β-blocked profile, MAP and HR, with the occupancy
     shown;
  4. **surge and shock** — laryngoscopy after propofol with and without labetalol (MAP/HR), and the shock-success factor
     against K⁺, pH and CPP.
  `apps/demo/e2e/fu7.e2e.ts` is a smoke test with `test.skip(browserName === 'webkit', …)` and
  `test.setTimeout(300_000)`; the shots script runs with `PW_SYSTEM_CHROME=1`.
- [ ] **Step 3 — the gate note.** `docs/gates/fu-7.md` with:
  §1 what changed, task by task, with the file list;
  §2 the acceptance table: every band, its source, the before value (research/14's column), the after value, the verdict;
  §3 the audit's before/after verdict counts and the moved cells (the tables from Task 19 Step 5), plus Task 4 Step 2's
  opioid-potency table;
  §4 the `it.fails` list with its measured numbers and why each is a mechanism gap, not a band problem;
  §5 the deviations: the ketamine LOC at 20 s (< 30 s; D20 — emergence met), the ephedrine β-blocked ratio (0.99), the
  reflex-bradycardia item, the laryngoscopy surge's labetalol/esmolol bounds (D22), DI-72's 5 s consciousness recovery
  (rig), **"atracurium and mivacurium: histamine release only — NO neuromuscular block in v1"** (one line, verbatim;
  review F12), `uHyp` antagonist-corrected (a behaviour change for 7d under flumazenil, review F8), the volatile
  bronchodilation re-fit and whether FU-6's co-constraint held (D23), the dexmedetomidine half-model (Task 17), and every
  `[ENG]` probability of Tasks 11–12;
  §6 the calibration-queue additions for Ali's R44 pass;
  §7 CI: the three test-set counts, the tick-bench p50, the PNG sizes, the SLOW_B group membership;
  §8 the re-anchorings of Task 0 Step 3 and Task 20 Step 1;
  §9 the exceptions used (E-FU7-1…10, all APPROVED by Orchestrator ruling (FU-7 review) 6) with file:line, and the ones
  declared but unused;
  §10 the open questions (below), marked "confirm with Ali" where the plan decided them from the textbooks.
- [ ] **Step 4 — the matrix ledger.** Update `research/12`'s §4.4 ledger? **No** — `research/**` is outside this repo and
outside the partition. Instead the gate note §3 carries the new verdict column and states that the orchestrator folds it
into research/12 (the audit's own convention: "for each gate the owner pastes the report rows into its gate note").
- [ ] **Step 5 — the PR.**
```
gh pr create --title "FU-7: drug-layer integration — onset, hypnotic/opioid potency, β-blockade, stimulus surge, antiarrhythmics, interactions" --body-file <body>
```
The body: the goal, the task list with its numbers, the acceptance table, the `it.fails` list, the deviations, the open
questions, the CI counts, and the last line `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
**Never merge** (R51/R25; PR-review workflow: Ali speaks the merge).
- [ ] **Step 6 — the calibration queue for the gate note §6.** The rows this plan knowingly leaves for Ali:
ephedrine's β-blocked ratio (0.99 vs 0.3–0.7, Q1); the unopposed-α reflex bradycardia; ketamine's LOC at 20 s (D20);
the catecholamine reserve's τ and floor; the five shock-state factors of Task 12; the conversion hazards'
trial-to-hazard mapping; atracurium/mivacurium PK (and whether they get a block, Q11); the histamine sizes (`HIST_SVR`,
`HIST_V0`, `HIST_SPASM`); the pre-excited-AF VF probability; the surge's `SURGE_SET_PER_NOX` 0.25 / `SURGE_SET_MAX` 0.25 /
`SURGE_NE_GAIN` 0.6 (D22); `antinocAdd` (lidocaine 0.35 at 3 µg/mL); the `hypC50` 0.55 of thiopental/etomidate and 0.8 of
ketamine; midazolam's `hypC50AgeK` 0.008; sufentanil/morphine `ventRemiEq` 5 / 0.8; `VENT_ALPHA_BENZO` 1.5 /
`VENT_ALPHA_HYP` 0.3; etomidate `ventShare` 0.7; and the volatile bronchodilation EC50 (D23).

---

## Expected `it.fails` after FU-7 (R45: kept with their measured numbers, never widened)

| test | band [source] | measured | why it is a mechanism gap |
|---|---|---|---|
| `drug-layer` "ephedrine under chronic β-blockade is ×0.3–0.7" | 0.3–0.7 [T1.5, §7 17b] | **0.99** | with α intact, the β1 loss is buffered by the reflex; halving it needs either a selectivity ruling or a CO-to-MAP coupling change (Q1, FU-4) |
| `drug-layer` "adrenaline under non-selective blockade gives reflex bradycardia" | < 0 [M10 ch. 14] | **0** | the vagal limb's caps live in `baroreflex.ts` (FU-4's file); measured in Task 8 Step 6 and reported |
| `drug-layer` "ketamine's LOC is not faster than 30 s" | ≥ 30 s [audit §4] | **20 s** | D20: with the sourced 60 s peak, LOC ≥ 30 s and emergence in 10–20 min cannot both hold (emergence is met: 11.9 min); a later `tpS` has no source |
| `drug-apnoea` "fentanyl 5 µg/kg on room air stops breathing" | ≥ 60 s apnoea [M10 ch. 22] | **0 s** on main + FU-4 | depends on FU-6's relative threshold and `FENT_VENT_REMI_EQ` 0.55 (D-7f-3/Q54, D16) — re-measured in Task 7 on the merged tree, kept with the number if missed |
| `pk-acceptance-pd` dobutamine CO rise (pre-existing) | +20–40 % [§7 20] | 17.9 % → Task 17 | the remaining gap is 7a's venous return to inotropy (NR-7g-2) |
| `drug-layer` "propofol + remifentanil are more than additive on MAP" (DI-01c) | supra-additive | **−0.4 %** | FU-4's `symp`/`setF` rows for opioids (Requests → FU-4 item 1); FU-7 must not add `symp` rows |
| `stimulus-surge` "labetalol 10 mg blunts it" | 0.2–0.8 [Inada 1989] | **0.94** (add. 25) | the surge's circulating noradrenaline and the reset act through α; labetalol 10 mg's α share is small (D22) |
| `stimulus-surge` "esmolol 1 mg/kg: ΔHR ratio ≤ 0.5, ΔMAP ratio ≤ 0.9" | as titled [T6.2] | **HR 0.53, MAP 0.99** | β1 blockade blunts the HR share only; the order (HR < MAP) is met and asserted as `it` |
| `interactions` "1 MAC volatile … rocuronium duration +20–45 %" (E-FU7-10 a) | +20–45 % | **+13.4 %** in the neuro-only rig (engine DI-51: **+50.5 %**, PL) | the rig applies a fixed EC50 multiplier without the volatile's PK; the engine cell is the acceptance (Task 14 Step 4) |
| `interactions-misc` "dexmedetomidine's late fall" (Task 17 Step 4) | a fall by 15 min | measured at execution | FU-4's dexmedetomidine `symp` row (Requests → FU-4 item 1); `it` if FU-4 has landed it |
| `interactions-misc` "N₂O's concentration effect" (Task 15, conditional) | FA/FI above 30 % N₂O's | measured at execution | N₂O's own concentration effect is not modelled (Task 15 Step 1 comment) |
| `stimulus-surge` "incision under sevoflurane, no opioid: ΔMAP +20–30" (Task 10 case 1c, ET amendment) | 20–30 [ET-16a; Shribman 1987 via add. 25; Q17] | **+19.1** (main: +7.7) | the surge is fitted to laryngoscopy (case 1); no gain is raised for the incision arm; the dose-order assertion is `it` |
| `interactions-misc` "diabetic dexamethasone peak +2–4 mmol/L at 4–8 h" (Task 18 Step 4a, ET amendment) | +2–4 [ET-19; PADDI, VERIFY; Q16] | **+1.83** (non-diabetic +1.02; main 0.00) | the glucocorticoid Emax is fitted to the healthy DI-76 band; the remainder is 7e's glucose model (CM-09c); diabetic > non-diabetic is `it` |

Cell gaps with no repo test (research runners only, reported in the gate note §5, RH amendment):
- **RH-12d**, midazolam in hepatic failure at 60 min: **×1.17** against ×1.3–2.5. Task 2 Step 2c; Q15(a).
- **RH-07a**, furosemide diuresis onset / peak: **90 s / 8.5 min** against RH's 120–600 s / 15–45 min. The label is
  met; the remainder is 7d's H1 (FU-9). Step 2e.

(The midazolam nadir row of the first draft is GONE: Task 2 Step 2b's `tpS` 240 puts DI-88 at 190 s, inside 120–420.)

## Open questions (for the orchestrator / Ali; the plan does not wait on them)

Decided from the textbooks where they were clear; each says what it decided and what to confirm.

1. **Q1 — chronic β-blockade and vasopressors (audit Q1).** DECIDED: occupancy 0.85 (dose ratio ≈ 6.7) for the
   `betaBlocked` profile, β1-selective by default, with `betaNonSel` available for propranolol-like blockade. The
   tables' "ephedrine ×0.5" is NOT reachable as a pressor RATIO by this mechanism (measured 0.99) — **confirm with Ali**
   whether the teaching target is the ×0.5 pressor ratio (which needs a new coupling) or the loss of the chronotropic
   response (which the engine now shows: HR +1 vs +5). Also **confirm with Ali** whether unopposed-α hypertension with
   reflex bradycardia should need NON-SELECTIVE blockade (the plan assumes yes: Miller ch. 14).
2. **Q-FU7-2 — the opioid ventilatory potency. DECIDED (Orchestrator ruling (FU-7 review) 4; D16):** `CnsSpec.ventRemiEq`
   per row with remifentanil PINNED at 1.0 (FU-6's single-agent calibration cannot move), fentanyl 0.55 (D-7f-3, one
   source `FENT_VENT_REMI_EQ`), sufentanil 5 and morphine 0.8 [ENG]; the drive reads 7g's `opioidVentFentEq` and 7f's own
   sum is only the duck-typed fallback. No FU-6 band is re-fitted (none exists for sufentanil/morphine). **Confirm with
   Ali** the two [ENG] weights.
3. **Q3 — laryngoscopy after propofol alone (audit Q3).** DECIDED: +20–30 mmHg and HR +12–30 for 2–5 min (Shribman 1987;
   M10 ch. 44; tables §5.3), reached by R51 addendum 25's mechanism — the nociceptive set-point reset
   (`SURGE_SET_PER_NOX` 0.25, cap 0.25) PLUS the circulating catecholamine release (`SURGE_NE_GAIN` 0.6 [ENG]): measured
   +27.2 / +17 (D22). **Confirm with Ali** (a) whether the elderly response should be smaller (the same factor at every
   age; the tables have no age row) and (b) the AWAKE band: the plan uses the task's M10 +20–40 (measured +36.9); if Ali
   wants 20–30 awake as well, that arm becomes `it.fails`.
4. **Q4 — the onset targets (audit Q4).** DECIDED from the labels: naloxone and flumazenil 1–2 min, midazolam peak
   3–5 min, ketamine LOC 30–60 s. The chain reproduces each row's `tpS`/`t10S`; THREE rows got better-sourced data
   (review F7, ruling 6: atropine `tpS` 150, midazolam `tpS` 240, ketamine `t10S` 2700 — D19b, D20). Left: ketamine LOC
   20 s (the pinned `it.fails`, D20) and DI-72's 5 s consciousness recovery (a rig artefact — "Prototype — second fixer").
5. **Q5 — propofol CSHT (audit Q5).** DECIDED: keep Eleveld (it gives the right emergence times, 7.2 / 8.7 min) and
   teach the short CSHT from it; the 1.15–1.8 band of DI-44 was read off a Marsh-era figure. **Confirm with Ali** (the
   audit already recommends this; no code changes).
6. **Q6 — volatile potentiation of rocuronium (audit Q6).** DECIDED: re-size the divisor to 25–80 % of duration
   (0.18 [ENG], Task 14), because 127 % is outside every source. **Confirm with Ali** that +30–50 % at 1 MAC matches his
   experience.
7. **Q7 — MANUAL and drugs (audit Q7/Q9).** NOT decided: DI-M4 shows esmolol, atropine and ephedrine moving the
   displayed HR by 0 in MANUAL. This plan does not touch MANUAL (it is Ali's Q9 and FU-4's G9 area). If Ali says drugs
   should move the instructor's HR, that is a new task in FU-4's or FU-5's area, not here.
8. **Q8 — sepsis catecholamine responsiveness (audit Q8).** NOT decided (FU-4's G8). FU-7's `catReserve` is a SEPARATE
   mechanism (depletion, not receptor responsiveness) and is sized to the direction only.
9. **Q9 — which missing drugs (audit Q9).** DECIDED: glucagon (addendum 21 needs it), verapamil (DI-15) and
   nitroprusside (addendum 24 names it). NOT added: hydrocortisone (needs 7e's cortisol replacement semantics),
   heparin and protamine (need 7i's coagulation, R58). **Confirm with Ali** the Iranian-practice priorities and whether
   diltiazem should join verapamil.
10. **Q10 — the [ENG] probabilities.** The pre-excited-AF VF probability (0.2 per event) and the shock-state factors of
    Task 12 (the five of addendum 23, plus the DV amendment's temperature factor, the 240 s circulatory-phase gate and
    the cardioversion E50s) have sourced DIRECTIONS and invented sizes. All are routed to the R44 calibration pass
    (review recommendation). PROCAMIO's amiodarone figure is QUOTED from the paper by the executor before `L_AMIO_VT` is fixed
    (25 % as written; 38 % per the reviewer's recollection — Task 11 Step 3, ruling 6g).
11. **Q11 — atracurium and mivacurium.** Added for their histamine release ONLY: they produce **NO neuromuscular block**
    in v1 (review F12, D19f — 7f models four NMB agents; the rows borrow cisatracurium's and succinylcholine's PK sets
    for their plasma course). A guard test and the row text say so. **Confirm with Ali** whether they should be DEFERRED
    until 7f can give them a block (a 7f task with tables §5d), or kept as histamine teaching rows.
12. **Q12 — the volatile bronchodilation size (FU-6 seam item 5; D23).** FU-7 re-fits the EC50 against "resistance
    −20–40 % at 1 MAC" while keeping FU-6's "Ppeak −30 % at 0.79 MAC" case green. If both cannot hold, the rows stay
    and **Ali decides** which teaching target governs.
13. **Q13 — chronic β-blockade as a post-induction hypotension risk (audit Q2, missing from the first draft; review).**
    DECIDED: no separate term — the extra fall, if Ali teaches it, comes from FU-4's output suppression and the
    occupancy of Task 8 (Reich 2005 does not list chronic β-blockade among the predictors). **Confirm with Ali.**
14. **Q14 — shock outcome after the DV run (research/20 §8 Q2 and Q9; Task 12 DV amendment).** DECIDED for
    execution, with four points to **confirm with Ali**:
    (a) **Termination.** The first biphasic shock terminates VF in **90 %** (`VF_TABLE.persistent` 0.1, the midpoint
        of the sourced 85–98 %). This supersedes brief §6.5's 0.3. ROSC stays 10 %, so termination ≠ ROSC.
    (b) **The post-shock split.** The terminated share is split asystole/PEA 50/50 as before (40/40/10 of all shocks).
        research/20 §8 Q2 asks whether more should be PEA.
    (c) **Hypothermia.** The factor is ×0.55 at 28.5 °C and the floor 0.2 below ≈ 27.3 °C [ENG]. The moderate-hypothermia
        benefit at 33 °C (Boddicker 2005, swine) is NOT modelled.
    (d) **Cardioversion.** `atrialTach`, `junctionalTachy` and `mat` keep the flat 0.8. The 2015 ACC/AHA/HRS SVT
        guideline says cardioversion is ineffective for an automatic focus (MAT, focal AT). Should they convert rarely?
    The Page 2002, Mittal 2000, Neumar 2010 and Schneider 2000 figures are quoted from the DV audit's record. The
    Stiell 2007 figure and the 2015 SVT guideline are the amendment fixer's own citations. All are [VERIFY] before they
    become fixed teaching numbers (research/20 §8 Q9).
15. **Q15 — organ failure and the fallback-curve drugs (RH amendment; Task 2 Step 2c).** DECIDED:
    - only the ELIMINATION share of a gamma row's decline follows `clFactor`, with φ taken from each row's sourced
      t½β;
    - morphine's M6G is NOT MODELLED (no parent → metabolite mechanism).

    **Confirm with Ali:**
    (a) midazolam in `hepaticFailure` 0.8 gives ×1.17 at 60 min against RH's ×1.3–2.5. Is a single-dose 60-min
        sedation difference of that size what he teaches? MacGilchrist's halved clearance governs the elimination
        phase.
    (b) should M6G accumulation in CKD be a teaching point worth a metabolite mechanism in v1.1?
    (c) the t½β of morphine and the glycopyrrolate renal data are [VERIFY].
16. **Q16 — dexamethasone in type 2 diabetes (ET amendment; Task 18 Step 4a).** Measured: +1.83 mmol/L at 4–8 h
    against ET-19's +2–4 (PADDI, [VERIFY magnitude]); non-diabetic +1.02. **Confirm with Ali** the teaching magnitude.
    The Emax stays fitted to the healthy DI-76 band.
17. **Q17 — the incision pressor response (ET amendment; Task 10 case 1c).** Under sevoflurane without opioid,
    incision gives ΔMAP +19.1 against ET-16a's +20–30. That band is sourced to Shribman 1987 via addendum 25, and
    Shribman measured LARYNGOSCOPY. **Confirm with Ali** the incision-specific band. MAC-BAR literature is a candidate
    source.

## Self-review

- **Scope.** Every one of the 37 new gaps of research/14 §3 that addenda 19–24 name has a task: D2 → Task 2; D3 → Tasks
  3–5; D10 → Tasks 6–7; D4 → Tasks 8–9; D9 → Task 9; D8 → Task 10; D7 → Tasks 11–12; D14 → Task 13; D12 and D6's
  new part → Task 14; D13 → Task 15; D15's histamine → Task 16; D15's sizes and tachyphylaxis → Task 17; D15's
  placeholders and the QTc → Task 18. D1, D5, D6's FU-4 part and D11 are FU-4's and appear only as Requests. DI-40 is
  FU-6's. The NE cells that need a profile or a state (DI-06 ACEi/ARB, DI-16 transplant, DI-20 N₂O gas spaces, DI-30
  opioid tolerance, DI-35 HOCM, DI-38 active metabolites, DI-43 OSA) are NOT in scope: each needs a new patient-profile
  field or a new physiological state, which belongs to the stage that owns that state — listed in the gate note §10 so
  they are not lost. **This is a deliberate omission and the R50 review should confirm it.**
- **R45.** No band is widened. (DV amendment: Stage 4's `outcome.test.ts` is also edited, in three assertions, to follow
  the RE-SOURCED `VF_TABLE`, with the ±2 % tolerance and 10,000 seeds kept. research/20's DV bands are asserted as
  written. The one runner-side limit, stateless `exact…` items, is re-graded by hand, not by moving a band.)
  Existing test files are touched only by the two fixture updates (E-FU7-9, input
  contracts) and E-FU7-10's three re-statements (the two volatile-divisor assertions, whose duration band keeps its
  number as an `it.fails` carrying both measurements, and `adapters.test.ts`'s exact `ext` key list gaining the NEUTRAL
  `surgeF: 1`). The one band the fixers CHOSE for a not-yet-written case — the awake laryngoscopy arm, +20–40 from the
  task's own M10 source rather than the first fixer's unsourced 20–30 — is flagged in D22 and Q3.
- **R51.** 7g owns every PK/PD change; 7f/7e/7a/7c/7b/L3 edits are each declared as an exception with a reason, and each
  is a CONSUMER of a published output, not a second implementation. The canonical names are listed in Global Constraints.
- **Prototyping.** Addenda 19–21 are prototyped end to end with the audit's own harness; addendum 22 (Task 10, with R51
  addendum 25's circulating release) is prototyped on `origin/main` + FU-4 e3eeb56 with all six guard arms; Task 18's
  inert rows are prototyped (and corrected — D12). Addendum 23 (FU-5's `l3`), the rest of addendum 24 (FU-6's lung
  state) and Tasks 7 (FU-6's apnoea threshold) are exact code with the R45 procedure. Ordering note: Task 10 Step 1c's
  first `depth.ts` block anchors on Step 3's line (stated in the task).
- **Counts (third fixer).** 195 find/replace pairs (193 unique on the prototype base + 2 declared FU-6 misses); new test
  files 7 (`onset-chain`, `potency-outputs`, `hypnotic-equivalent`, `beta-occupancy`, `shock-state`, `antiarrhythmic`,
  `interactions-misc`) + 3 engine files (`drug-layer`, `drug-apnoea`, `stimulus-surge`); exceptions E-FU7-1…10;
  decisions D1–D23; open questions 13; expected `it.fails` 11 (the table below).
- **Risks.** (a) Task 6 depends on FU-6's `drive.ts` shape — Task 0 Step 4 is the guard and the task says STOP rather
  than guess. (b) Task 12 touches FU-5's area — the merge discipline is in the task and in Global Constraints. (c) The
  `hypC50` 0.55 of thiopental/etomidate is ONE fitted number carrying two awakening bands; if either moves after FU-4's
  flow-dependent PK lands, the re-fit is a one-line change with the band as its target. (d) The conversion hazards make
  two cells STOCHASTIC: the tests assert shares over seeded runs, not single outcomes.
- **Numbers.** Every band in this plan is either research/14's own (with its source) or a label/trial value quoted in the
  task. Every `[ENG]` constant names its fit target. The prototype's before/after numbers are measured, not estimated;
  where a probe did not reach a band (the non-selective bradycardia) the plan says so with the number.
- **CM amendment (2026-09-29).** research/19 §4's ten findings are all placed, and the two that change what the plan
  WOULD HAVE DONE were re-measured on `origin/main` 66e3052 with the CM audit's own runner (read-only, throwaway
  worktree, nothing pushed):

| finding | where it landed | measured on 66e3052 | effect on the plan |
|---|---|---|---|
| 1 dobutamine sized on a stale number | Task 17 "Why" table + new Step 1a + Step 2 bullet | CM-06d CO **+34.9 %** (band 20–45, PL) | the EC50 refit is CONDITIONAL and expected to be skipped; CM-06d becomes the task's guard against an overshoot |
| 2 HFrEF vasodilator arm | Task 17 Step 2 (hydralazine bullet) + new Step 4a + Step 5a | CM-06e SV **+3.5 %** (band 8–40, TW), SVR −15.3 %, MAP −5.7 % | hydralazine unchanged (the gap is 7a's C9); nitroprusside gains an HFrEF acceptance arm, `it.fails` with its number if short |
| 3 esmolol refit moves in-band cells | Task 17 Step 2 (esmolol bullet) + Step 5a | CM-04d HR −12 (PL), CM-14c LAP −12.7 (PL), CM-15b HR −12.9 % (TW) | the three are re-measured after the refit; CM-04d can leave its band from the other side |
| 4 untreated-HTN pressor response | Task 10 case **1b** + Step 6 | CM-03c ΔMAP 10.8 / 9.1, **ratio 1.19** (band ≥ 1.3, TW) | a new measured acceptance arm; unmet → `it.fails` naming C1 / FU-8 Part B; no gain, set point or `SURGE_SET_PER_NOX` moved |
| 5 fast-AF engine defect (C3) | **Task 0 Step 6b** + guards in Tasks 11, 12, 19 | CM-15c on main 0fd5397: `kIsch` min 0 / mean 0.19 in a healthy 40 y at AF 150 | FU-8 Part A executes first; if absent, AF windows < 5 min + a control-arm `kIsch` ≥ 0.9 precondition |
| 8 diabetic steroid arm | Task 18 Step 4a + Step 5 | CM-09c diabetic 11.1 vs healthy 7.6 mmol/L under stress (PL) | a second dexamethasone arm (ET-19, +2–4 mmol/L), CM-09c a regression guard |
| 9 asthma reactivity (CM-11a) | Task 16 NOTE | MI (no reactivity gain exists) | a note: keep the constrictor seam scalable by one per-profile factor; no task |
| 10 OSA opioid sensitivity (CM-12a) | Task 6 NOTE | NE (no `osa` profile) | a note: keep `ventRemiEq` ONE named output a profile can scale; no task |
| 6 resting sympathetic tone (C1) | **Requests → FU-8** item 2 | CM-01b/03b/05a/06b/13a all ≈ −20 % on induction | FU-8 Part B owns it, Ali reviews the mechanism first; Task 9 adds no resting tone |
| 7 `circ/profile.ts` exception | **Requests → FU-8** item 2 | — | **E-FU7-3 is NOT widened**; C1/C4/C5 are FU-8's and open no second exception |

  The amendment introduced **no new `ts` find/replace pair**, so the third fixer's 195 pairs (193 unique + 2 declared
  FU-6 misses) stand unchanged; the inline code strings it touches or relies on were re-checked on 66e3052 — the
  dobutamine `ees` entry is unique in `src/` (its quoted form corrected to include the merged tree's
  `beta`/`catecholamine` flags), the esmolol `hr` entry unique, the hydralazine and dexamethasone rows present, the
  `htn`/`hfref` conditions and `endo.diabetes: 'type2'` present, and `ventRemiEq` absent BY DESIGN (Task 4 creates it —
  a declared dependency on an earlier task, not a miss). Every CM cell the amendment names exists exactly once in
  `research/19-audit-scripts/cells-*.ts`.

- **DV amendment (2026-09-29).** research/20 §4's seven FU-7 findings are all placed. Findings 1–3's numbers were
  prototyped on `origin/main` **2c49d87** (FU-3/4/5 merged; engine code as the DV base 3feee6f) in a throwaway worktree
  with the DV runner read-only. Nothing was pushed, and the worktree was removed.

| finding (research/20 §4 / this run's item) | where it landed | measured (prototype vs DV baseline) | effect on the plan |
|---|---|---|---|
| 2 / (1) base termination | Task 12 Step 0 (`VF_TABLE` + Stage 4 test), Sources, Requests → FU-5 | DV-01a term150/200 **95 / 95** (exact 90) vs 65 / 65 (exact 70); ROSC share 10 unchanged | termination re-sourced to the biphasic literature; ROSC ≠ termination kept; Ali Q14(a–b) |
| 1 / (2) temperature | Task 12 Sources + Step 1 `temperatureTermination` + Step 2 | DV-24a diff **55** (87.5 vs 32.5); DV-24b gain **55**; both 0 before | new [ENG] factor below 30 °C, sourced direction; Q14(c) |
| — / (2) CPR × ischaemia time | Task 12 Sources (CoPP bullet) + Step 1 `CIRCULATORY_PHASE_S` | end to end: effective ROSC early / late no CPR / late CPR **7.5 / 0 / 7.5** | the duration term already existed (`VF_DURATION_FACTORS`, `arrestS`); the CoPP factor is gated to ≥ 240 s so an electrical-phase shock is not penalised |
| 3 / (3) cardioversion | Task 12 Sources table + Step 1 curve + Step 2 + Step 3 `rhythmId` | DV-06a 200 J **87.5**, 20 J **12.5**, dependence **75** (was 0); DV-06b 50 J **95**; DV-06c **95** | flat 0.8 → per-rhythm energy curve; other organised rhythms keep 0.8; Q14(d) |
| 4 / (4) which CoPP | Task 12 Interfaces + Step 4 accessor guard + note | typecheck clean; `cor.cpp` read only with no beat (pulseless or no beat for 3 s) | never the beat minimum (DV-13d); V2/V3 rigs excluded from fitting |
| 5 / (5) end to end | Task 12 Step 7a | hk drawn **2.5** / effective **0**; lateNoCpr **0 / 0**; DV-01c and DV-25a guards unchanged | factors judged only end to end; drawn and effective both reported |
| 7 / (6) shock-made PEA (V1) | Task 0 **Step 6c** + Task 12 Sources + Requests → FU-8 item 3 | DV-01b on 3feee6f: `peaArrestDeclared` false | if FU-8 Part A has not landed, the `arrestS` arm is exercised on engine-declared arrests only |
| 6 / (7) amiodarone in VF | Task 11 note | — | `λ_amio_vf = 0` is consistent with every DV cell; no code |

  Blocks: 3 new find/replace pairs (Task 12 Step 0 ×3) and 1 new pair (Step 2's cardioversion line). Five existing
  pairs got a changed replacement: Steps 1, 2, 3 (both) and 4. Their FIND texts are unchanged. Applied in order to
  `origin/main` 2c49d87 ("Find-block verification", DV amendment):
  - all 9 Task 12 pairs are unique;
  - `pnpm -r typecheck` is clean;
  - `test/l3` + `test/engine/device`: **30 files / 163 passed**.

  Counts after the amendment: open questions **14**; expected `it.fails` unchanged (11). The DV runner's `exact…` items
  are runner limits re-graded by hand (Task 12 Step 7a item 4), not `it.fails`.

- **RH/ET amendment (2026-09-30).** research/13 §4 (RH, FU-7 rows) and research/14-coverage §4 (ET) are all placed.
  Items (1), (2), (5) and (6) were prototyped on `origin/main` **7954933** in a throwaway worktree, with the whole plan
  applied (Task 9–10's stale anchors re-anchored by hand) and the RH/ET runners read-only. Nothing was pushed, and the
  worktree was removed.

| item | where it landed | measured (main → prototype) | effect on the plan |
|---|---|---|---|
| (1) H9: gamma rows ignore organ function | Task 2 **Step 2c** (+ Step 3b test, Step 4 cells) | RH-12d midazolam ×**1.00 → 1.17** (band 1.3–2.5, TW); f 1 → 0.38 | `elim.t12S` on 8 rows; only the elimination share φ of the decline slows; neutral context bit-identical; Q15 |
| (1) furosemide onset/peak | Task 2 **Step 2e** (no row change) | RH-07a onset 30 s → **90 s**, peak 2.5 → **8.5 min** (Step 1's chain); `tpS` 1800 would give 120 s / 15.5 min | label verified (≤ 5 min, ≤ 30 min, ≈ 2 h); `tpS` kept for the sourced venodilation; remainder H1 (FU-9) |
| (2) fentanyl flow-dependent distribution | Task 2 **Step 2d** | RH-15b ×**1.19 → 1.40** at 30 min (PL); RH-12e ×1.00 kept; healthy GA +1 % | FU-4 G10's `flowDist` on fentanyl (Egan 1999); A28 does not cover it |
| (3) morphine metabolites | Task 2 Step 2c note; Q15(b) | RH-10c NE | **NOT MODELLED**: 7g has no parent → metabolite source |
| (4) CKD renal clearance ×0.3 | Task 2 Step 2c (renal term) + Step 3b test | glycopyrrolate g 0.44, neostigmine and morphine < 1 at `renal` 0.3; RH-10a ×1.14 unchanged | renal rows follow `PkCtx.renal`; the `ckd` profile is FU-8 B / Ali |
| (5) dexamethasone in type 2 | Task 18 Step 4a + Step 5 | ET-19 **0.00 → +1.83** mmol/L (band 2–4); non-diabetic +1.02 | main's 0 = the placeholder row, fixed by Steps 1–1c; comparison `it`, band `it.fails`; Q16 |
| (6) incision pressor | Task 10 **case 1c** + Step 6 | ET-16a ΔMAP **+7.7 → +19.1** (band 20–30); fentanyl 2/5: +6.7 / −6.8 | `it.fails` "measured +19.1"; no gain raised; Q17 |
| (7) hydrocortisone | D13 note + **Requests → FU-10** item 1 | ET-15b NE; adrenal-insufficiency profile inert (E13) | waits for FU-10's basal deficit; no row |
| (8) Task 9's sympathetic seam | **Requests → FU-10** item 2 | — | recorded; no change |

  Blocks: 13 new `ts` find/replace pairs (all in Task 2), each unique on 7954933. One new test file,
  `organ-decline.test.ts` (5 cases). No existing block changed. Counts: open questions **17**; expected `it.fails`
  **13**, plus 2 research-only cell gaps (RH-12d, RH-07a).
- **Honest limits of the RH/ET prototype.** The base lacks FU-6 and FU-8 Part A. The Task 9–10 blocks were
  re-anchored by hand; the replacements were unchanged. The executor re-measures every number on the merged tree.
  The t½β values for morphine and glycopyrrolate and the incision band carry [VERIFY].

---

## Find-block verification (mechanical)

### RH/ET amendment (2026-09-30) — the new blocks on `origin/main` 7954933

Script: `<scratchpad>/fu-7-amend3/check3.py`. It pairs the plan's blocks as `apply.py` does, keeps the pairs whose
find or replace text is not in the pre-amendment plan, and counts each find text over every `packages/**` `.ts/.mjs/.json`
file of `origin/main` **7954933** (FU-3, FU-4 incl. 18e/18f, FU-5 and V.1 merged; FU-6 and FU-8 Part A not).

**Result: 13 added pairs, 13 unique, 0 ambiguous, 0 misses. None depends on another task's text** (Step 2b's midazolam
and ketamine edits touch the `id` lines, and these anchors are the `elim`/`pd` lines).

| step | find (first line) | file | count |
|---|---|---|---|
| 2c | `elim?: { hepatic?: number; highExtraction?: boolean; renal?: number };` | `l2/pk/row.ts` | 1 |
| 2c | `import { gammaConc, gammaN, type GammaDose } from './gamma.ts';` | `l2/pk/pipeline.ts` | 1 |
| 2c | `/** FU-4 G10: cardiac output ÷ the patient's own resting output (…` | `l2/pk/pipeline.ts` | 1 |
| 2c | `d.doses = d.doses.filter((x) => t - x.t < tpS * (4 + 12 / Math.sqrt(n))); …` | `l2/pk/pipeline.ts` | 1 |
| 2c | `elim: { hepatic: 0.9 },` (ketamine) | `data/rows-anaesthetic.ts` | 1 |
| 2c | `elim: { hepatic: 0.8 },` (etomidate) | `data/rows-anaesthetic.ts` | 1 |
| 2c | `elim: { hepatic: 1 },` + thiopental's `pd:` line | `data/rows-anaesthetic.ts` | 1 |
| 2c | `elim: { hepatic: 1 },` + midazolam's `pd:` line | `data/rows-anaesthetic.ts` | 1 |
| 2c | `elim: { hepatic: 1 },` + dexmedetomidine's `pd:` line | `data/rows-anaesthetic.ts` | 1 |
| 2c | `elim: { hepatic: 0.9, renal: 0.1 },` (morphine) | `data/rows-anaesthetic.ts` | 1 |
| 2c | the neostigmine row's first line | `data/rows-cardiovascular.ts` | 1 |
| 2c | the glycopyrrolate row's first line | `data/rows-cardiovascular.ts` | 1 |
| 2d | the fentanyl `id` line + `elim: { hepatic: 1, highExtraction: true },` | `data/rows-anaesthetic.ts` | 1 |

No amended step adds a `ts` find block to Task 10 or Task 18. Case 1c, Step 4a's numbers and the Requests → FU-10
items are prose, and the ET and RH cells are run from `research/` read-only.

**The whole plan applied to 7954933 in order** (`apply.py`, then `create.py`): **212 pairs, 191 unique, 21
unresolved.** These are the 178 pre-amendment pairs that apply plus the 13 new ones. The 21 unresolved were ALL
unresolved before the amendment too, and none is this amendment's. They are recorded here for Task 0:
- **Task 1 ×3.** The copied `research/14-audit-scripts/` files were not copied in this run, and there is FU-6's
  `audit:respiratory` anchor. Both are declared.
- **Task 6 ×1.** FU-6's `hvrDep` line, declared.
- **Task 11 ×4.** FU-4 18f's `sux` state and `outcomeRng` argument. Task 11 already names the re-anchor.
- **Task 9 ×1 and Task 10 ×12 — NOT declared before this amendment.** FU-4 Task 18e's humoral arm landed on main
  after the third fixer's e3eeb56. It added:
  - `hum: 0` to the hormone initialiser;
  - `humSvrF`/`humDV0Frac` after `mastB2` in `StressEffects` and its return;
  - `HUM_SVR, HUM_V0` to the `effects.ts` import;
  - `endoHumDV0Frac`/`endoHumSvrF` to `writeCirc`'s two branches;
  - `mapSetMmHg` to the `stepHormones` input line;
  - `(1 - (de.muscBlock ?? 0))` on the `stepBaro(` call's `gVagal`.

  The plan's replacements are right. Only the anchors moved. The amendment fixer re-anchored them by hand in the
  throwaway prototype (`<scratchpad>/fu-7-amend3/handfix.py`: 8 edits cover the 12 + 1 blocks, and Task 10 Step 5b's
  test key list stays unapplied). Task 0 Step 5 does the same on the merged tree. On the prototype, `tsc --noEmit` for
  engine-core is clean, and `test/l2/pk` + `test/l2/endo` give 29 files, 155 tests, 154 passed; the one failure is the
  unapplied Step 5b.

### DV amendment (2026-09-29) — Task 12's blocks on `origin/main` 2c49d87

Script: `<scratchpad>/fu-7-amend2/apply12.py`. It pairs each ```` ```ts ```` block in Task 12 with the next block whose
lead-in says "Replace with", counts the find text over every tracked `.ts/.mjs/.json` file (excluding `docs/`), applies
the pairs in document order, and writes Step 5's "Create" file. Base: a clean throwaway worktree of `origin/main`
**2c49d87**; the engine code is identical to the DV base 3feee6f, with FU-3, FU-4 and FU-5 merged.

**Result: 9 pairs, 9 unique, 0 ambiguous, 0 misses.**

| step | find (first line) | file | count |
|---|---|---|---|
| 0 | `/** VF / pulseless VT shocked at ≥ the skin's first-shock energy (brief §6.5). */` | `l3/defib-pacer/outcome.ts` | 1 |
| 0 | `it('VF at the default energy: persistent 0.30, …` | `test/l3/defib-pacer/outcome.test.ts` | 1 |
| 0 | `expect((p5.asystole ?? 0) + (p5.pea ?? 0)).toBeCloseTo(0.65, 10);` | `test/l3/defib-pacer/outcome.test.ts` | 1 |
| 1 | `export interface ShockContext {` | `l3/defib-pacer/outcome.ts` | 1 |
| 2 | `if (c.energyJ < LOW_ENERGY_FRACTION * c.defaultJ) {` (+ the `return`) | `l3/defib-pacer/outcome.ts` | 1 |
| 2 | `if (c.cls === 'organisedPulse') return { sinus: CARDIOVERSION_SINUS, …` | `l3/defib-pacer/outcome.ts` | 1 |
| 3 | `outcome = drawOutcome({ cls, synced, energyJ: …` | `l3/device-layer.ts` | 1 |
| 3 | `setL1(v: StateVar, value: number, ramp?: Ramp): void;` + `}` | `l3/device-layer.ts` | 1 |
| 4 | `outcomeRng: ps.rng.outcome,` | `engine.ts` | 1 |

- Step 6's sugammadex `pd:` block is an insert, unchanged by the amendment.
- On the applied tree, `pnpm -r typecheck` exits 0. `vitest run test/l3 test/engine/device` gives **30 files, 163
  passed**, including `shock-state.test.ts` (13) and the edited Stage 4 `outcome.test.ts` (4).
- The exact probabilities recomputed on the applied tree are identical to the prototype's (Task 12 "Prototype — DV
  amendment").
- Dependencies declared:
  - Task 0 Step 6c (V1, FU-8 Part A) gates only which rigs Step 7a may use for `arrestS`; no block depends on it.
  - FU-5 owns `l3/**`, and Task 12's merge discipline re-verifies these finds after `git merge origin/main`.
  - Task 11's `antiarrhythmicU` bus field is read by Step 4 through a duck-typed cast and needs no block of its own.

### Third fixer (2026-09-28) — the plan as it stands, applied in task order

Script: `<scratchpad>/fu-7-fix3/apply.py` — pairs every code block with the block after it whose lead-in says "Replace
with", applies each pair in document order where the find text occurs EXACTLY ONCE over the tree's `.ts/.mjs/.json/.html`
files (excluding `docs/`), and retries the misses once after the first pass. Base: `origin/main` bab4b72 merged with
`origin/fu-4-integration-polish` **e3eeb56**; Task 1 Step 1's copy of `research/14-audit-scripts/` done first; the
created test files written from their "Create" blocks.

**Result: 195 find/replace pairs. 192 unique in the first pass, 1 more in the retry (Task 10 Step 1c's first
`depth.ts` block, which anchors on Step 3's line — the task says so), 0 ambiguous, 2 unresolved — both DECLARED:**
Task 1 Step 3's `"audit:respiratory"` anchor (FU-6 adds it; anchored on `"audit:physiology"` as the step says) and Task 6
Step 1b's FU-6 `hvrDep` line (a declared miss until FU-6 merges). The seven interface fields the R50 review found in
prose (`DriveInputs.spontRr`, `cns.sympDrive`, `catReserve` ×2, `NeuroEnv.mgMmolL/iCaMmolL`, `BloodCore.nmUpreg`,
`uptakeLpm`, `DeviceHost.shockState`) and Task 18's `qtc`/`qtcMsAdd`/`glucocorticoid` are real blocks: `pnpm -r
typecheck` is clean on the applied tree with NO hand edit. `test/l2` + `test/l3`: 193 files / 933 passed / 1 skipped.
The remaining inserts are whole new rows (glucagon, procainamide, verapamil, nitroprusside, atracurium, mivacurium) and
the Task 17 re-fit comments, each named in its task (Task 0 Step 3 lists them).

**`pnpm run audit:drugs all` on the applied tree (third fixer; seed 7; the verdict column of research/14 §2 on main
3ff2fb0 is "before"):** 105 cells, wall time **41.5 min** of cell time on a machine shared with other agents (the
gate records its own). Verdict counts: research/14 on main **PL 42 · TW 25 · WR 8 · TS 9 · MI 9 · NE 10 · IN 2** →
applied tree **PL 49 · TW 17 · WR 10 · TS 8 · MI 9 · NE 10 · IN 2**. 22 cells changed verdict; the third fixer re-ran
those 22 (plus DI-03/04a/08/63/69/72) on main + FU-4 WITHOUT FU-7 to attribute each change:

| cell | research/14 (main) | main + FU-4 e3eeb56 | + FU-7 (all blocks) | moved by | the number |
|---|---|---|---|---|---|
| DI-21 | WR | WR | **TW** | FU-7 (Task 9) | cold phase +2.0 % → **−0.4 %** (sign right); healthy rise 6.1 → 8.9 mmHg |
| DI-51 | TS | TS | **PL** | FU-7 (Task 14) | rocuronium prolongation at 1.1 MAC → **+50.5 %** (25–80) |
| DI-57 | TS | TS | **PL** | FU-7 (Task 9) | ephedrine ×3: 8.0 / 4.0 / 2.1, ratio **0.50** (0.4–0.95) |
| DI-71 | TS | TS | **PL** | FU-7 (Task 2) | naloxone reversal 5 → **40 s** (30–180); apnoea items wait for FU-6 |
| DI-88 | TS | TS | **PL** | FU-7 (Task 2) | midazolam DI nadir 70 → **190 s** (120–420) |
| DI-89 | WR | WR | **PL** | FU-7 (Task 7) | flag while breathing 250 s → **0 s** |
| DI-01a, 01c, 32, 37a, 46, 47, 66 | TW/WR | PL | PL | FU-4 | — |
| DI-13b, 22, 27, 36, 79 | PL/TW | WR | WR | FU-4 (unchanged by FU-7) | reported to FU-4, not FU-7's |
| DI-49, 67, 78 | TW/PL | TS | TS | FU-4 (unchanged by FU-7) | reported to FU-4 |
| DI-65 | PL | TW | TW | FU-4 (unchanged by FU-7) | reported to FU-4 |

Cells whose NUMBERS moved under FU-7 without a verdict change (the grader keeps the worse item or a stale `hand`
verdict, which Task 1 forbids editing): **DI-69** MI (hand; the automatic grade is PL — thiopental LOC +10 s / awakening
360 s, etomidate +20 s / 195 s, ketamine 20 s / 715 s, propofol 55 / 490 s), **DI-76** MI (hand; automatic PL —
dexamethasone glucose **+11 mg/dL** in the audit's window, HR 0), **DI-08** TW (pressor after propofol **+27.2** PL,
labetalol ratio 0.94 TS), **DI-03** WR (SpO₂ **77 %** PL; the apnoea item needs FU-6), **DI-04a** TS (ratio 0.99, Q1),
**DI-72** TS (flumazenil DI +13 PL; consciousness 5 s — the rig artefact), **DI-63** PL (atropine peak 130 s).

### Plan writer (first draft, superseded above)

Script: `<scratchpad>/fu-7/verify.py` — it extracts every ``` ```ts ``` / ``` ```json ``` block that follows a "find"
instruction and searches the **whole `origin/main` dba7fda tree** (`git show HEAD:<file>` over `git ls-files`, excluding
`docs/`) for an exact match.

**Result: 187 code blocks, 74 find blocks. 0 blocks match more than once. 68 match exactly once. The 6 that do not match
are all expected, and each is named below:**

| plan line | block | why it does not match dba7fda |
|---|---|---|
| 587 | `const ENGINE = … 'wt/packages/engine-core/src/index.ts'` | Task 1 Step 2 edits a file COPIED in Step 1 from `research/14-audit-scripts/` (outside the repo). Verified against the source file instead: matches once there. |
| 601 | `const OUT = join(HERE, 'out');` | same — the copied `cli.ts`. |
| 616 | the `"audit:respiratory"` line of `package.json` | **FU-6 adds it**; dba7fda has only `audit:physiology`. Task 1 Step 3 already says to anchor on `audit:physiology` if FU-6's line is absent. |
| 2026 | `/** FU-7 (addendum 20): share of hypPropEq …` | Task 9 Step 1 anchors on text **Task 3 adds** (sequential dependency, stated in the task). |
| 2710 | `const r = combine(actives, { … betaOccProfile … })` | Task 13 Step 1 anchors on text **Task 8 adds** (stated in the task: "Task 13 MUST run after Task 8"). |
| 3140 | the dexamethasone `pd:` replacement | an INSERT block (Task 18 Step 1 gives the new `pd:` for a row whose current `pd: []` it names in prose), caught by the script's "find" heuristic. |

Every other block — including all of Tasks 2–12's blocks in `l2/pk/**`, `l2/neuro/**`, `l2/circ/**`, `l2/blood/**`,
`l3/**` and `engine.ts` — matches **exactly once** on dba7fda. **Task 0 re-verifies all of them on the merged main**
(FU-4, V.1, FU-6, and FU-5 if it has landed), because FU-4 and FU-6 are known to move
`l2/pk/{combine,pipeline,row,hooks}.ts`, `l2/pk/data/rows-*.ts`, `l2/neuro/{drive,spont,pipeline}.ts`, `engine.ts`,
`l2/circ/{model,baroreflex,profile}.ts`, `l2/endo/**`, `vite.config.ts`, `package.json` and `l3/**`.
