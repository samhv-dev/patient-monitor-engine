# RESUME — how to pick this build up after a usage cap, a crash, or a new session

*Source of truth for resumption. Updated by the orchestrator at every gate. Last update: 2026-09-27 23:38 (FU-3 MERGED; FU-4 plan writer; respiratory + monitor-fidelity audits running; V.1 + 8b READY; 3/4 slots).*

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
| 8b release + IIFE embed | plan FIXED 23:16 (3,749 lines, 43 unique blocks; licence texts in every dist; fresh validate report in Task 12) — READY; executor after FU-3 + FU-4 + V.1 merge; Ali: Q1 npm?, Q2 @pme scope, Q3 Pages, Q5 Zenodo DOI, Q8 1.0.0 vs rc.1 | versions 1.0.0, IIFE build + ventilator-sim embed, TypeDoc, guides, physiology overview, README/CITATION/CONTRIBUTING, NOTICES audit, release workflow; orchestrator tags v1.0.0 after 7e + FU-3 + V.1 merge | R50 review → executor after V.1 lands |
| FU-4 integration polish (R53) | AUDIT DONE (`../research/08-physiology-integration-audit.md`, 72 scenarios: nothing arrests; propofol ΔMAP −10 % healthy vs −16 % tamponade; gaps G1–G15); PLAN WRITER running since 21:57 (`docs/plans/fu-4-integration-polish.md`, builds on FU-3's branch) | then plan writer from the audit: state-dependent drug effects (propofol in tamponade → collapse), low-flow arrest pathway, tamponade–PEEP–anaesthetic coupling, scripted clinical scenario suite; forced-air set temperature; shots comments; test-slow split | audit → plan → R50 review → executor after FU-3 lands; v1.0 waits for it |
| Audits (R53) | respiratory/airway audit → `../research/09-respiratory-integration-audit.md`; monitor-fidelity audit → `../research/10-monitor-fidelity-audit.md` (both running, read-only) | feed FU-4's review or an FU-5 plan | orchestrator reads, then plan |
| V.1 ventilator follow-up | plan FIXED 23:13 (2,695 lines, 68 unique blocks; FiO2 0.21 oedema stays it.fails +0.7) — READY; executor after FU-4 merges | G7b rulings 4+5+13: absolute lungState + link profiles carry lungConditions + retire interim link shunt/recruit; ventilator sees pPtx/pleural pressure; regenerate stage-v-lung-pathology-data.md; oedema link test → SpO2/PCWP; tension-ptx plateau calibration row | R50 review → fixer if needed → executor when a slot frees |
| 8 validation/release | not started | waits for all | write plan |

## The resume rule (for a human or a scheduled session)
A stage is STALLED if all three hold: (a) its plan on its branch has unticked `- [ ]` tasks, (b) the branch's last commit is older than 2 hours (`git log -1 --format=%cI origin/<branch>`), (c) its PR is not merged. A stalled stage is resumed by dispatching ONE fresh Opus executor with the brief template below, pointed at the first unticked task. Never run two executors on the same stage. Never merge a PR from a resumed session: open/update the PR, write the gate note, and stop — the orchestrator (or Ali) inspects the gate and merges (R21).

## Executor brief template

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
