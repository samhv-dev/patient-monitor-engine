# RESUME — how to pick this build up after a usage cap, a crash, or a new session

*Source of truth for resumption. Updated by the orchestrator at every gate. Last update: 2026-09-27 04:18 (7c executing; 7x CI rerun; FU-2 review + 7e fixer running; 8a stalled on a permission prompt).*

## Where everything is
- Repo: `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo` (remote `origin` = github.com/samhv-dev/patient-monitor-engine, branch `main`).
- Rulings (binding decisions R1–R28 + gate verdicts): `../research/00-orchestrator-rulings.md` (workspace, not in this repo).
- Spec: `docs/DESIGN-BRIEF.md`. Roadmap: `docs/BUILD-PLAN.md`. Per-stage task plans: `docs/plans/stage-*.md` (writing-plans format, checkboxes ticked as tasks complete). Gate evidence: `docs/gates/stage-*.md`.
- Each executing stage works in its OWN git worktree: `../scratch/wt-stage-<N>/` on branch `stage-<N>-<name>`; the ticked plan is committed in that branch.
- pnpm is not installed: run every pnpm command as `npx -y pnpm@9.15.9 …`. No `timeout` on macOS. Playwright uses installed Chrome: `PW_SYSTEM_CHROME=1`.

## Stage status table (edit at every gate)
| Stage | Branch / PR | State | Next action |
|---|---|---|---|
| 0, 1, 1.1, 6a, 5, 4a, 6b, 2, 3, 4b, 5.1, V, 3.1, FU-1, 7a, 7b, 7g | merged to main | DONE (7a PR #13; 7b PR #14; 7g PR #15) | — |
| 7c blood/acid–base | `stage-7c-blood` (plan fixed, 26 tasks; worktree `../scratch/wt-stage-7c`) | executing (7g merged 06:35) | resume from first unticked task |
| 7d brain/kidney/liver | plan fixed to R51 add. 14 (`docs/plans/stage-7d-organs.md`, 24 tasks, verified on 7a+7b+7g; exceptions E-7d-1/2) | 4 known `it.fails`; FU-2 items 6–7 come from it | execute after 7c merges (worktree `../scratch/wt-stage-7d`, branch `stage-7d-organs`) |
| 7e endocrine/thermal | plan under rewrite (`docs/plans/stage-7e-endocrine-thermal.md`; R50 verdict INCOMPLETE — pre-R51; fixer running per addendum 16) | must observe 7g's bus; V0 sign; seam test; bands restored | execute after 7c AND 7d merge |
| 7f NMB/depth | plan fixed to R51 (`docs/plans/stage-7f-neuro-depth.md`, 19 tasks) | consumes 7g bus only (R51); observes `stimulus` (add. 12) | execute after 7g merges |
| FU-1 follow-ups | PR #12 merged | DONE (G-FU1) | FU-2 candidates: rhythm in `state` event; saadat 8 s HR averaging mapping |
| 7x physiology console | `stage-7x-physiology-console`, PR #16 (worktree `../scratch/wt-stage-7x`) | gate passed (G7x), CI green; main (7g) being merged in | merge when CI is green again |
| FU-2 engine follow-ups | plan written (`docs/plans/fu-2-engine-followups.md`, 11 tasks; R50 review running) | items 1–5, 7–9; item 6 goes to the 7d executor; exceptions E-FU2-1..4 approved | execute after review (on main, parallel to 7c); then 7d |
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
