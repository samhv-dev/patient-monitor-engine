# RESUME — how to pick this build up after a usage cap, a crash, or a new session

*Source of truth for resumption. Updated by the orchestrator at every gate. Last update: 2026-09-27 02:45 (after the fifth cap cut-off; 7b/7g at PRs #14/#15 gate-passed, CI fixes in flight; 8a stalled on a permission prompt; 7c fixer, 7x and 7d reviewers running).*

## Where everything is
- Repo: `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo` (remote `origin` = github.com/samhv-dev/patient-monitor-engine, branch `main`).
- Rulings (binding decisions R1–R28 + gate verdicts): `../research/00-orchestrator-rulings.md` (workspace, not in this repo).
- Spec: `docs/DESIGN-BRIEF.md`. Roadmap: `docs/BUILD-PLAN.md`. Per-stage task plans: `docs/plans/stage-*.md` (writing-plans format, checkboxes ticked as tasks complete). Gate evidence: `docs/gates/stage-*.md`.
- Each executing stage works in its OWN git worktree: `../scratch/wt-stage-<N>/` on branch `stage-<N>-<name>`; the ticked plan is committed in that branch.
- pnpm is not installed: run every pnpm command as `npx -y pnpm@9.15.9 …`. No `timeout` on macOS. Playwright uses installed Chrome: `PW_SYSTEM_CHROME=1`.

## Stage status table (edit at every gate)
| Stage | Branch / PR | State | Next action |
|---|---|---|---|
| 0, 1, 1.1, 6a, 5, 4a, 6b, 2, 3, 4b, 5.1, V, 3.1, FU-1, 7a | merged to main | DONE (Waves A + B; 7a G7a PR #13) | — |
| 7b lungs | `stage-7b-lungs`, PR #14 (worktree `../scratch/wt-stage-7b`) | gate passed (G7b); CI budget fix pushed by orchestrator (hemo-nibp yields) | merge when CI is green; then 7g merges main |
| 7c blood/acid–base | plan under fix (`docs/plans/stage-7c-blood.md`; R50 review READY WITH FIXES F1–F13; fixer prototyping on 7a+7b+7g) | E-7c-1 partition exception: thread `odc` through 7b's mix-o2 | execute after 7b and 7g merge |
| 7d brain/kidney/liver | plan ready (`docs/plans/stage-7d-organs.md`, R49; R50 review running) | needs FU-2 (NR-7g-5 rhythm-rate rule) before it executes | execute after 7c merges |
| 7e endocrine/thermal | plan ready (`docs/plans/stage-7e-endocrine-thermal.md`, R48; R50 review pending) | patches 7a and 7c | execute after 7a AND 7c merge |
| 7f NMB/depth | plan fixed to R51 (`docs/plans/stage-7f-neuro-depth.md`, 19 tasks) | consumes 7g bus only (R51); observes `stimulus` (add. 12) | execute after 7g merges |
| 7g drug PK/PD | `stage-7g-pkpd`, PR #15 (worktree `../scratch/wt-stage-7g`) | all 26 tasks done, gate passed (G7g); CI red only on a worker-RPC timeout (same NIBP cause) | after #14 merges: merge origin/main into the branch (resolve engine.ts/resp conflicts, keep both), rerun CI, merge |
| FU-1 follow-ups | PR #12 merged | DONE (G-FU1) | FU-2 candidates: rhythm in `state` event; saadat 8 s HR averaging mapping |
| 7x physiology console | plan written (`docs/plans/stage-7x-physiology-console.md`, 9 tasks; R50 review running) | opt-in `truth` event ≤ 2 Hz; new files + 11 engine lines | execute after review, on main after 7b/7g |
| FU-2 engine follow-ups | not started | (1) NR-7g-5 HIGH: rhythm-intrinsic rates must not be overridden by the circulation in MODELED (only sinus-family follows the HR set point); (2) β-agonist unstressed-volume mobilisation (dobutamine CO, NR-7g-2); (3) pressure-dependent arterial compliance (post-PVC, G7a NR-1); (4) rhythm field on the 1 Hz `state` event; (5) saadat 8 s HR averaging mapping | write plan; execute before 7d/7e |
| V.1 ventilator follow-up | not started (G7b rulings 4+5+13) | absolute lungState + link profiles carry lungConditions + retire interim link shunt/recruit; ventilator sees pPtx/pleural pressure; regenerate stage-v-lung-pathology-data.md; oedema link test → SpO2/PCWP | write plan after 7c and 7d land |
| 8a validation harness | `stage-8a-validation` (worktree `../scratch/wt-stage-8a`), 29 boxes unticked | STALLED since 2026-09-26 22:20 on an app permission prompt (`git -C` misread as destructive) — Ali allows the prompt or a fresh executor resumes | resume from first unticked task; merge main before gate |
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
