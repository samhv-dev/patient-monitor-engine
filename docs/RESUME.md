# RESUME — how to pick this build up after a usage cap, a crash, or a new session

*Source of truth for resumption. Updated by the orchestrator at every gate. Last update: 2026-09-28 14:54 (after the 11th cap: FU-4 executor resumed at Task 16; FU-5 + FU-6 fixers; FU-7 review; cap 4).*

## Where everything is
- Repo: `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo` (remote `origin` = github.com/samhv-dev/patient-monitor-engine, branch `main`).
- Rulings (binding decisions R1–R28 + gate verdicts): `../research/00-orchestrator-rulings.md` (workspace, not in this repo).
- Spec: `docs/DESIGN-BRIEF.md`. Roadmap: `docs/BUILD-PLAN.md`. Per-stage task plans: `docs/plans/stage-*.md` (writing-plans format, checkboxes ticked as tasks complete). Gate evidence: `docs/gates/stage-*.md`.
- Each executing stage works in its OWN git worktree: `../scratch/wt-stage-<N>/` on branch `stage-<N>-<name>`; the ticked plan is committed in that branch.
- pnpm is not installed: run every pnpm command as `npx -y pnpm@9.15.9 …`. No `timeout` on macOS. Playwright uses installed Chrome: `PW_SYSTEM_CHROME=1`.

## Stage status table (edit at every gate)
| Stage | Branch / PR | State | Next action |
|---|---|---|---|
| 0, 1, 1.1, 6a, 5, 4a, 6b, 2, 3, 4b, 5.1, V, 3.1, FU-1, 7a, 7b, 7g, 7x, FU-2, 7c, 8a, 7f | merged to main | DONE (7a #13; 7b #14; 7g #15; 7x #16; FU-2 #17; 7c #20; 8a #18; 7f #21) | — |
| 7d brain/kidney/liver | MERGED 2026-09-27 19:02 (PR #19, head 9075aff; CI amendment 4: per-minute yields in hemo-longrun + engine-pipeline) | G7d + follow-throughs 1–4 in the rulings file | done |
| 7e endocrine/thermal | MERGED 2026-09-27 20:55 (PR #22, head 1d6f5a7) | G7e + four rulings in the rulings file; child-rig defect handed to V.1; FU-4 list opened | done |
| FU-1 follow-ups | PR #12 merged | DONE (G-FU1) | FU-2 candidates: rhythm in `state` event; saadat 8 s HR averaging mapping |
| FU-3 follow-ups | MERGED 2026-09-27 23:36 (PR #23, head 26f5290) | G-FU3 + seven rulings in the rulings file (t25 ventilated → FU-4; escape-pacemaker hypoxia → FU-4 G7; oracle MODELED) | done |
| Coverage audits (R54) | inventory + glossary (294 entries; 40 % of labels non-clinical) + matrix (837 cells; 201 measured; 636 new in 10 runs; 181 blocked) DONE → `../research/11-…`, `12-…`; run 1 DRUG INTERACTIONS DONE (105 cells: 42 plausible / 53 not / 10 blocked; 37 new gaps → FU-7) → `../research/14-audit-drug-interactions.md`(→ `../research/14-audit-drug-interactions.md`) | next runs: blood/fluids → endocrine/thermal → neuro → renal/hepatic → comorbidity → devices → stimuli → paediatric → obstetric | each run → FU-7+ plan items |
| 7i labs & coagulation (R58) | DEFERRED to v1.1 (R60, Ali) | CBC, chemistry, ABG/VBG, coagulation model, TEG/ROTEM panels, labs UI | plan after FU-6 |
| 7k respiratory mechanics & volumes (R57) | not started | Ppeak/Pplat/PEEP/driving/transpulmonary, compliance/resistance, VD set, FRC/ERV/RV/TLC/VC/IC, FEV1/FVC; Ventilation panel; PFT device later | plan after FU-6 |
| 7j obstetric physiology (R59) | DEFERRED to v1.1 (R60, Ali) | term-pregnancy physiology, fetus + CTG device, uterotonics, pre-eclampsia, PPH, AFE | plan after 7i |
| Stage 9 clinical UI + naming (R55, R56) | PR #29 (head 2bb00d3): polish items 1–5 done; CI `build` FAILED — executor diagnosing; then item 6 (7k panel, glossary keys, timed task 5); merge after green CI; SHOWCASE Tuesday | navigation, IA, tokens, glossary labels everywhere | plan after the benchmark study; Ali tests after this stage |
| 8b release + IIFE embed | plan FIXED 23:16 (3,749 lines, 43 unique blocks; licence texts in every dist; fresh validate report in Task 12) — READY; executor after FU-3 + FU-4 + V.1 merge; Ali: Q1 npm?, Q2 @pme scope, Q3 Pages, Q5 Zenodo DOI, Q8 1.0.0 vs rc.1 | versions 1.0.0, IIFE build + ventilator-sim embed, TypeDoc, guides, physiology overview, README/CITATION/CONTRIBUTING, NOTICES audit, release workflow; orchestrator tags v1.0.0 after 7e + FU-3 + V.1 merge | R50 review → executor after V.1 lands |
| FU-4 integration polish (R53) | MERGED 2026-09-29 15:20 (PR #25, e81e53f) | done — emergent arrest (tamponade PEA, class IV, tension PTX, K, MH hazard), CPR on volume + PEA decay, humoral arm withdrawn in arrest, vagal events, dead-space root, clinical scenario suite; 39 FU-4 it.fails | FU-5 follow-up list F1–F6; calibration queue items
| Audits (R53) | haemodynamic → `../research/08-physiology-integration-audit.md` DONE (→ FU-4); monitor-fidelity → `../research/10-monitor-fidelity-audit.md` DONE (→ FU-5); respiratory → `../research/09-respiratory-integration-audit.md` DONE (R1 → FU-4 G11; R2–R15 → FU-6) | all three audits done | — |
| FU-5 monitor fidelity (parallel with FU-4) | MERGED 2026-09-29 12:40 (PR #24, 16cdf79) | done — SpO2 honesty at low flow, one apnoea one alarm, latched never suppresses, vendor on-delay, NIBP at narrow PP, per-skin tiles | FU-5 follow-ups: PI spike on motion end, CVP −1 row (calibration queue)
| FU-6 respiratory integration | MERGED 2026-09-30 (PR #28, 176f702) | done — bronchodilation, induction apnoea, anaesthetised lungs, capnograph physics, viscosity (fading at low flow), pulseless effort withdrawal | 10-min VF CPR rig needs ventilation (FU-8 Part B); RS1 GA default ventilation → Ali
| FU-7 drug-layer integration (7g) | cloud session at its evidence page/gate (head 722d728, 7 h ago); PR expected | onset curves, one hypnotic/opioid potency output, β-blockade state, stimulus surge, antiarrhythmic/shock probabilities, LAST additive, Mg/Ca/burn unified, second-gas, histamine, inert entries | R50 review → executor after FU-6 merges |
| V.1 ventilator follow-up | MERGED 2026-09-29 15:55 (PR #26, ed530d5; executed in the CLOUD) | G7b rulings 4+5+13: absolute lungState + link profiles carry lungConditions + retire interim link shunt/recruit; ventilator sees pPtx/pleural pressure; regenerate stage-v-lung-pathology-data.md; oedema link test → SpO2/PCWP; tension-ptx plateau calibration row | calibration rows added; open items routed to FU-8 (A22, A28, A29) and 8b
| Stage 7k respiratory mechanics & volumes (R57) | MERGED 2026-10-04 (PR #30, 0eed975) | Ppeak/Pplat/auto-PEEP/ΔP/PL, Cstat/Cdyn/R, VD set + Enghoff, FRC/ERV/RV/TLC/VC/IC, FEV1/FVC model; Ventilation panel; glossary keys | Q-7k-1/2/5/6 for Ali; truth tree 2,075 of 2,100 leaves
| FU-8 follow-ups (loose ends) | Part A MERGED 2026-09-30 (PR #27); Part B ready, after FU-7 (C1 gated on Ali A23) | FU-5 follow-ups F1–F6, A10-E5, R-FU5-9, R-S9-1/2/4/6, review-pack defects (insulin units, route, max dose, amiodarone claim, VT 170 pulse, agonal rate, 12-lead in arrest, oliguria, neonatal profile) | two PRs: Part A (incl. AF fix, arrest state for every pulseless state — FU-7 needs both) before FU-7; Part B after FU-7
| Coverage runs (R54) | DI, CM, BF, DV, RH, ET, SP, NN (research/15, recovered from the session branch) DONE; remaining PD (OB v1.1) | remaining: RH, ET, NN, DV, SP, PD, OB | idle slots / cloud |
| FU-9 blood, fluids & acid–base | Parts A and C: PR #31 open; CI slow-a FAILED (group ≈ 70 min) — executor fixing and re-splitting the slow groups; Part B after FU-7 | BF F1–F11: volume excretion, profile K⁺ → ECG, SvO2 in haemorrhage, citrate SID, renal K⁺, chronic compensation, COP, alkalosis compensation | R50 review → fixer → executor (Part A now / Part B after FU-7) |
| FU-10 endocrine & thermal | plan FIXED and READY 2026-10-04 (2,674 lines; 0 block problems on main with 7k); executor after the showcase and after FU-9 merges (slow-c) | ET E1–E13: MH from its triggers, MH heat O2-limited, neuraxial thermoregulation, cold sympathetic response, DKA/insulin deficiency, hypoglycaemia masking, fever under GA, adrenal/thyroid profiles, etomidate cortisol | R50 review → fixer → executor |
| FU-11 engineering hardening (external review) | 26 findings filed (`../research/16-external-review-chatgpt.md`); a second external browser-integration audit is running; plan to be written when it reports | restore timeline, worker/transport/audio lifecycle, command validation, relay, scenario alternatives, modifier ramps, validation honesty, p99 gate | plan → R50 review → executor BEFORE Stage 9 (packages 3–5) and before 8b (packages 1, 2, 8) |
| 8 validation/release | not started | waits for all | write plan |
| Ali's review pack (questions + capability inventory + parameter tables + 12-lead strips) | pack DELIVERED 2026-09-28 (290 pp) + ADDENDUM DELIVERED 2026-09-30 (31 pp, 55 new questions; urgent A23, F11, D14, E4, E5) | every open Ali item with stable IDs; his answers by ID → rulings | apply his answers by ID as rulings; triage the writer's 20 findings (rulings 22:20)

## After a usage-cap kill
First try `SendMessage` to each stopped agent's id ("the cap has reset; continue exactly where you stopped; confirm the worktree state first") — the harness resumes it with its context intact (worked 2026-09-29 01:25). Only if that fails, relaunch a fresh agent from the pushed state with the brief below.

## The resume rule (for a human or a scheduled session)
A stage is STALLED if all three hold: (a) its plan on its branch has unticked `- [ ]` tasks, (b) the branch's last commit is older than 2 hours (`git log -1 --format=%cI origin/<branch>`), (c) its PR is not merged. A stalled stage is resumed by dispatching ONE fresh Opus executor with the brief template below, pointed at the first unticked task. Never run two executors on the same stage. Never merge a PR from a resumed session: open/update the PR, write the gate note, and stop — the orchestrator (or Ali) inspects the gate and merges (R21).

## Executor brief template

> Never run a command that reads standard input (e.g. a bare `cat > file` without a heredoc) — it hangs forever as an orphaned background task (two such probes had to be stopped by hand, 2026-09-28 and 2026-09-30).

> Local e2e: Playwright's own Chromium 1243 + WebKit 2359 are installed (2026-09-29); run `pnpm test:e2e` as CI does (both projects). `PW_SYSTEM_CHROME=1` is only a fallback if the cache is ever cleared.

> Scratch files under `<scratchpad>/<branch>/` only (the session scratchpad is shared; bare filenames collide). Bound every background wait (≤ 10 min per `until` loop, re-check the process or mtime).

> Never use `git stash` in a worktree of the shared repo (the stash list is shared across worktrees; one executor's pop applied another's stash). Commit work-in-progress to the branch instead.
 (fill <STAGE>, <PLAN>, <BRANCH>, <WORKTREE>)
> You are the executor for Stage <STAGE> of the patient-monitor engine. Execute `<PLAN>` from the FIRST UNTICKED task onward, in order, exactly as written (failing test → run → implement → run → commit with the plan's message ending in `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`), ticking checkboxes in the plan copy inside the branch. Load superpowers:executing-plans first. Work ONLY in the worktree `<WORKTREE>` on branch `<BRANCH>` (if the worktree is missing: `cd repo && git fetch origin && git worktree add <WORKTREE> <BRANCH>`; if the branch is missing on origin, create it from origin/main). Install with `npx -y pnpm@9.15.9 install`. **Push the branch after EVERY task commit** (`git push origin <BRANCH>`) so a cap or crash loses nothing. Never push to main. Respect the partition in ruling R25 (edit only the files the plan assigns to this stage). Any test that runs the engine for more than ~1 sim-minute must yield to the event loop once per sim-minute (see `packages/engine-core/test/engine/engine-pipeline.test.ts`); the CI runner has 2 vCPUs and the Vitest worker RPC times out otherwise. When all tasks are done: run typecheck, `pnpm -r test`, build, check-notices, `PW_SYSTEM_CHROME=1 pnpm test:e2e`; write `docs/gates/stage-<STAGE>.md` with every acceptance number and ≤ 60 KB screenshots; open the PR with `gh pr create` (or update it); do NOT merge. Report: commits, test counts, key numbers, deviations, anything undone.

## Gate procedure (orchestrator)
1. CI green on the PR (`gh pr checks <n>`); if it conflicts with main, merge origin/main into the branch (keep both sides; NOTICES rows keep all IDs) and rerun the gate.
2. Read the gate note; open 4–8 screenshots; compare numbers with the plan's acceptance tests and the brief.
3. Record a `G<N>` verdict in the rulings file; merge with `gh pr merge <n> --merge`; `git pull` main (move any untracked `docs/plans/*.md` copies aside first).
4. Update the table above. Launch the next stage whose dependencies are now on main.

## Wave map
Wave B = Stage 3 ∥ Stage 4b (∥ Stage 5.1 once Ali's list exists). Wave C = Stage 7 (needs 3 + 6b; ships comorbidity, ischaemia, left-heart, brain/kidney, IABP/LVAD/ICD/ECMO parameter tables reviewed by Ali) ∥ ventilator-link demo (R27). Wave D = Stage 8 validation against VitalDB/MGH, Saadat bedside checklist, IIFE embed into the ventilator sim, v1.0.
