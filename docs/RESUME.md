# RESUME — how to pick this build up after a usage cap, a crash, or a new session

*Source of truth for resumption. Updated by the orchestrator at every gate. Last update: 2026-09-26 21:20 (7c plan landed, 26 tasks; 7a/7b/FU-1 executing; 8a plan finishing; 7d/7e/7g plans ready).*

## Where everything is
- Repo: `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo` (remote `origin` = github.com/samhv-dev/patient-monitor-engine, branch `main`).
- Rulings (binding decisions R1–R28 + gate verdicts): `../research/00-orchestrator-rulings.md` (workspace, not in this repo).
- Spec: `docs/DESIGN-BRIEF.md`. Roadmap: `docs/BUILD-PLAN.md`. Per-stage task plans: `docs/plans/stage-*.md` (writing-plans format, checkboxes ticked as tasks complete). Gate evidence: `docs/gates/stage-*.md`.
- Each executing stage works in its OWN git worktree: `../scratch/wt-stage-<N>/` on branch `stage-<N>-<name>`; the ticked plan is committed in that branch.
- pnpm is not installed: run every pnpm command as `npx -y pnpm@9.15.9 …`. No `timeout` on macOS. Playwright uses installed Chrome: `PW_SYSTEM_CHROME=1`.

## Stage status table (edit at every gate)
| Stage | Branch / PR | State | Next action |
|---|---|---|---|
| 0, 1, 1.1, 6a, 5, 4a, 6b, 2, 3, 4b, 5.1, V, 3.1 | merged to main | DONE (Waves A + B) | — |
| 7a circulation | `stage-7a-circulation` (plan: `docs/plans/stage-7a-circulation.md`, worktree `../scratch/wt-stage-7a`) | executing (started 2026-09-26 ~13:00) | resume from first unticked task |
| 7b lungs | `stage-7b-lungs` (plan: `docs/plans/stage-7b-lungs.md`, worktree `../scratch/wt-stage-7b`) | executing | resume from first unticked task |
| 7c blood/acid–base | plan ready (`docs/plans/stage-7c-blood.md`, 26 tasks, verified reproducible) | R34 port from Pulse; gate: tests and Pulse oracle never concurrently | execute after 7a merges |
| 7d brain/kidney/liver | plan ready (`docs/plans/stage-7d-organs.md`, R49) | needs 7a ext.rSysF/hrF; brief must add 7c requests (urine output replaces fixed fluid elimination, renal K/Na/Cl/gluconate, liver factor for lactate/citrate) | execute after 7a (ideally 7c) merges |
| 7e endocrine/thermal | plan ready (`docs/plans/stage-7e-endocrine-thermal.md`, R48) | patches 7a and 7c | execute after 7a AND 7c merge |
| 7f NMB/depth | plan on disk (`docs/plans/stage-7f-neuro-depth.md`, completeness unverified) | consumes 7g effect sites | verify plan, execute after 7g |
| 7g drug PK/PD | plan ready (`docs/plans/stage-7g-pkpd.md`, 26 tasks) | conforms to 7f contract | execute after 7a merges |
| FU-1 follow-ups | `fu-1-followups`, PR #12 (worktree `../scratch/wt-fu1`) | all 8 items done, CI pending | gate + merge when CI is green |
| 8a validation harness | `stage-8a-validation` (plan: `docs/plans/stage-8a-validation.md`, 24 tasks, worktree `../scratch/wt-stage-8a`) | executing (started 2026-09-26 21:50) | resume from first unticked task |
| 8 validation/release | not started | waits for all | write plan |

## The resume rule (for a human or a scheduled session)
A stage is STALLED if all three hold: (a) its plan on its branch has unticked `- [ ]` tasks, (b) the branch's last commit is older than 2 hours (`git log -1 --format=%cI origin/<branch>`), (c) its PR is not merged. A stalled stage is resumed by dispatching ONE fresh Opus executor with the brief template below, pointed at the first unticked task. Never run two executors on the same stage. Never merge a PR from a resumed session: open/update the PR, write the gate note, and stop — the orchestrator (or Ali) inspects the gate and merges (R21).

## Executor brief template (fill <STAGE>, <PLAN>, <BRANCH>, <WORKTREE>)
> You are the executor for Stage <STAGE> of the patient-monitor engine. Execute `<PLAN>` from the FIRST UNTICKED task onward, in order, exactly as written (failing test → run → implement → run → commit with the plan's message ending in `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`), ticking checkboxes in the plan copy inside the branch. Load superpowers:executing-plans first. Work ONLY in the worktree `<WORKTREE>` on branch `<BRANCH>` (if the worktree is missing: `cd repo && git fetch origin && git worktree add <WORKTREE> <BRANCH>`; if the branch is missing on origin, create it from origin/main). Install with `npx -y pnpm@9.15.9 install`. **Push the branch after EVERY task commit** (`git push origin <BRANCH>`) so a cap or crash loses nothing. Never push to main. Respect the partition in ruling R25 (edit only the files the plan assigns to this stage). Any test that runs the engine for more than ~1 sim-minute must yield to the event loop once per sim-minute (see `packages/engine-core/test/engine/engine-pipeline.test.ts`); the CI runner has 2 vCPUs and the Vitest worker RPC times out otherwise. When all tasks are done: run typecheck, `pnpm -r test`, build, check-notices, `PW_SYSTEM_CHROME=1 pnpm test:e2e`; write `docs/gates/stage-<STAGE>.md` with every acceptance number and ≤ 60 KB screenshots; open the PR with `gh pr create` (or update it); do NOT merge. Report: commits, test counts, key numbers, deviations, anything undone.

## Gate procedure (orchestrator)
1. CI green on the PR (`gh pr checks <n>`); if it conflicts with main, merge origin/main into the branch (keep both sides; NOTICES rows keep all IDs) and rerun the gate.
2. Read the gate note; open 4–8 screenshots; compare numbers with the plan's acceptance tests and the brief.
3. Record a `G<N>` verdict in the rulings file; merge with `gh pr merge <n> --merge`; `git pull` main (move any untracked `docs/plans/*.md` copies aside first).
4. Update the table above. Launch the next stage whose dependencies are now on main.

## Wave map
Wave B = Stage 3 ∥ Stage 4b (∥ Stage 5.1 once Ali's list exists). Wave C = Stage 7 (needs 3 + 6b; ships comorbidity, ischaemia, left-heart, brain/kidney, IABP/LVAD/ICD/ECMO parameter tables reviewed by Ali) ∥ ventilator-link demo (R27). Wave D = Stage 8 validation against VitalDB/MGH, Saadat bedside checklist, IIFE embed into the ventilator sim, v1.0.
