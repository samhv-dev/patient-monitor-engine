# RESUME — how to pick this build up after a usage cap, a crash, or a new session

*Source of truth for resumption. Updated by the orchestrator at every gate. Last update: 2026-10-13 (kit round part A, part 2;
main 62e521c3).*

## Where everything is
- Repo: `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo` (remote `origin` = github.com/samhv-dev/patient-monitor-engine, branch `main`).
- Rulings (binding decisions, gate verdicts, the live-agent ids): `../research/00-orchestrator-rulings.md` (workspace, not in this repo). The owner's open decisions: `../research/31-owner-decisions-2026-10-12.md`.
- Spec: `docs/DESIGN-BRIEF.md`. Roadmap: `docs/roadmap/` (v1.0, v1.x, v2.0). Per-stage task plans: `docs/plans/stage-*.md`. Gate evidence: `docs/gates/*.md`.
- Each executing stage works in its OWN git worktree: `../scratch/wt-<name>/` on its own branch; the ticked plan is committed in that branch.
- pnpm is not installed: run every pnpm command as `npx -y pnpm@9.15.9 …`. No `timeout` on macOS. Playwright's own Chromium and WebKit are installed.
- Showcase kits: built with `node scripts/showcase/make-bundle.mjs <dir>`; the current one from main is `_sandbox/pme-kit-main-62e521c3/` (also in `_sandbox/pme-classroom-dryrun/kit/` and `_sandbox/pme-debrief-dryrun/`); smoke-test a kit's classroom relay with `node scripts/showcase/check-relay.mjs <kit>`.

## State on 2026-10-13 (main 62e521c3)

**v1.0 feature work is merged.** Everything up to FU-11 and the five showcase-2 stages is on main:

| Stage | PR | State |
|---|---|---|
| FU-11 d (second-screen follower, alarm pause rule G3) | #49 | merged |
| Stage 10 time control (×8, 2- and 5-min fast-forward) | #54 | merged |
| Stage 11 showcase cards (six Showcase cards + bronchospasm) | #48 | merged |
| Stage 12 learners' phones over the classroom relay | #57 | merged; gate step 4 PENDING-OWNER (H17, H21) |
| Stage 13 Debrief report (print to PDF) | #60 | merged; print check PENDING-OWNER |

**Fixer round** (branches from main), all merged: FX-1 the Ventilator view's cockpit link survives slow WebKit (direct
frame port; #58), FX-2 follower exactness and no silent command hang (#61), FX-4 alarm controls follow the skin (#59),
FX-7 the scenario library stays open (#56). Closed as test fixes: FX-3, FX-5, FX-6. KR-A1 (the kit's bundled classroom
relay died at the first WebSocket frame) fixed by #64; `scripts/showcase/check-relay.mjs` is the kit smoke test.

**CI reshaped** (#55, `docs/gates/ci-webkit-3.md`): one `renderer` job builds the IIFE once; e2e is a per-browser matrix
(`e2e (chromium)`, `e2e (webkit)`) beside the unit and the eight `test-slow` groups; JSON reports are kept as artefacts;
retry-only passes are printed (not failing). CI-only WebKit skips name their finding. Known-flaky candidates for
Stage 14's list are in the rulings log.

**On main since 2026-10-12:** the showcase-2 run sheet and presenter guide (#53; part B of the kit round revises them).
**Open PR:** #63 kit round A part 2 (measurements in `docs/showcase/SHOWCASE-2-MEASUREMENTS.md`).

**Pending with the owner (by id, `../research/31-owner-decisions-2026-10-12.md`):**
- Decisions: **E17** the run sheet vs the Debrief's "not met" objectives; **E18** publish the target audit in the repo;
  **E19** MH called at early signs, adrenaline at ≈ 1:30, the slot length; **E20** the skin on the day (Saadat-style,
  Silence only, or Philips-style with a 120 s pause); still open from earlier: **E13** presenting Mac and Node,
  **E14** network, **E15** phones or Debrief if short, **E16** reflex fix in v1.0, **A48** pulsus paradoxus go/no-go.
- Hand checks: **H17** own phone through the six cards, **H18** fast-forward look in real Safari, **H19** hidden-tab
  watchdog, **H20** second screen in real Safari within 5 s, **H21** bronchospasm with the Ventilator view and a phone
  following; the Stage 13 print preview in Safari and Chrome.

**Dates.** Freeze **2026-10-19**; then **v1.0.0-rc.1** (Stage 8b release, plan refreshed; the on-screen version still
reads 0.0.0 until then). Showcase 2 on **2026-10-22** (slack to the 25th). After the rc: Stage 14 (clean-up; plan
REVIEWED-FIXED), the calibration pass (bands first, `../research/30-parts/`), v1.x maintenance; v2.0 in specification.

**Next actions:** kit round part B (run sheet revision from SHOWCASE-2-MEASUREMENTS.md) once E17–E20 are answered; the
owner's hand checks before the freeze.

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
