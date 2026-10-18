# Stage 14: code and documentation clean-up for the release candidate — Implementation Plan

**STATUS: REVIEWED-FIXED 2026-10-11 (R50 review; findings and measurements in
`scratch/plans-backup/stage-14-review.md`; the plan before the fixes is `scratch/plans-backup/stage-14-cleanup.v1-before-r50.md`).
Owner questions 1–13 RULED 2026-10-11 (Question 7: owner to confirm the audit's publication before Task 7 Step 5).
Prototyped on `origin/main` 90c8ca7b (`scratch/wt-stage-14-proto`, removed); re-run end to end by the review with the
fixed tools (`run_all.sh`) on `origin/main` c7d9b51c merged with fu-11-d, stage-10, stage-12 and stage-13 (544bf14d,
the expected launch tree; worktree `scratch/wt-stage-14-review`, removed): same-code, the test lists, the honesty
rule, the link check, the audit drift check and `pnpm typecheck` were green. Executes AFTER the `v1.0.0-rc.1` tag
(Stage 8b merged) and after Stage 10, 11, 12, 13 and FU-11 d have merged (Task 0 launch gate). Untracked plan file;
the tools and the decisions it applies are in `scratch/plans-backup/stage-14-plan-tools/` (checksums in
`SHA256SUMS`); patches: `scratch/plans-backup/stage-14-prototype.patch` (90c8ca7b) and
`scratch/plans-backup/stage-14-prototype-r50.patch` (the merged launch tree, 978 files, +19,009 / −7,220, with
stand-ins of 8b's `scripts/deviations.ts` and `known-deviations.md`).**

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The development history leaves the code and the documentation is organised by the model: no stage, ruling,
review or task ids in source comments, file names or test titles (facts kept, history dropped); one generated
known-miss index that carries the target audit's verdict and proposed band for every band; the leftover demo pages moved under `apps/demo/dev/` or deleted; the shipped engine reads no
environment; the CI slow groups fit a 35-minute job and a retry is no longer a pass; one generated page per model
module under `docs/model/` and a README that points at them — with no change to any behaviour, band or test outcome.

**Architecture:** Every edit is a scripted transformation from the tools folder, applied in the order below, each
followed by a mechanical proof and the test run of its task: comment rewrites keyed on the hash of the exact comment
text with a reviewed decision file (re-basing = re-running: a decision applies only while its comment is unchanged);
a rename map applied by `git mv` with import, path and bare-name rewriting; test titles re-worded through a reviewed
title table; the known-miss index, the model pages and the slow-group lists generated or edited by anchored,
idempotent scripts. Find/replace text appears in this plan only for the README and the three Stage 8b pages
(Task 6), where a script cannot write prose; even those are applied by `post8b_docs.py`.

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2, Playwright 1.63, pnpm 9.15.9 (`npx -y pnpm@9.15.9`), Node ≥ 22.12
with `--experimental-strip-types`, Python 3 (tools only, nothing shipped), GitHub Actions.

**Spec:** `scratch/briefs/plan-stage-14-cleanup.md` (the brief); `docs/roadmap/v2.0/DECISIONS.md` §6 (the owner's
measurement of 2026-10-05: history embedded in the code, documentation organised by process); `docs/roadmap/v1.0-remaining.md`
("Clean-up" row); `docs/plans/stage-8b-release.md` Tasks 10, 12 and 13b (README, `scripts/deviations.ts`,
`docs-honesty.test.ts`, the physiology overview, known deviations, the developer-page review), its Global
Constraints (partition, documentation honesty) and Decision 27. The target audit of the bands, `research/30-target-audit.md` and its CSV twin (209 rows, read on `26e78308`), synthesis `research/30-parts/99-synthesis.md` (outside the repository; orchestrator addition of 2026-10-11: the index carries each row's verdict and proposed band).

---

## Global Constraints

- Paths are relative to `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo`. Work ONLY in the worktree
  `../scratch/wt-stage-14` on branch `stage-14-cleanup`. `T=../plans-backup/stage-14-plan-tools` (relative to the
  worktree root) is the tools folder; never edit a tool in place — if a tool needs a fix, copy the folder, fix, and
  record the change in the gate note.
- **Launch gate (Task 0):** the tag `v1.0.0-rc.1` exists and Stage 8b's PR is merged; `stage-10`, `stage-11`,
  `stage-12`, `stage-13` and `fu-11-d` are merged. If the orchestrator wants this stage earlier, it must say so in the
  launch message; then Task 0 Step 4 builds `hold.txt` and the partition rules below apply.
- **No behaviour change.** No band, constant, physiology, rendering, protocol or test assertion changes, except:
  the two `PME_VAG_*` environment reads become the constants they defaulted to (Task 5a; the defaults are the values
  every test and CI run used); the stale conditional `test.fail` is removed (Task 5b; its condition is false on
  `main`, so it is already a no-op); one slow test moves verbatim to a new file (Task 5c). Proof per task:
  `same-code.ts` (comments only) for Task 1, `compare_lists.py` (the same tests, file for file and name for name,
  through the rename map and the title table) for Tasks 2, 4 and 5.
- **Records keep their names.** `docs/plans/**`, `docs/gates/**`, `docs/review-inputs/**` and `CHANGELOG.md` are the
  project's history and are never rewritten (the rename tool skips them); `docs/BUILD-PLAN.md`, `docs/DESIGN-BRIEF.md`
  and `docs/RESUME.md` are rewritten only where a path they cite moved.
- **Comment scope** (Question 4, RULED 2026-10-11): `packages/*/src/**/*.ts`, `apps/demo/src/**/*.ts` and the
  `*.config.ts` files — the globs `'packages/*/src/**/*.ts' 'packages/*/src/*.ts' 'apps/demo/src/**/*.ts' 'apps/demo/src/*.ts' '*.config.ts'`,
  ALWAYS quoted one per argument (zsh does not split a variable: `$G` would be one pathspec and match nothing). Licence
  and provenance headers (`SPDX-License-Identifier`, `Copyright`, `NOTICES N-…`) are never touched (the Apache-derived
  blood files are checked by `packages/engine-core/test/l2/blood/headers.test.ts`). Test-file (`packages/*/test`,
  `apps/demo/e2e`) and `scripts/` comments are deferred to v2.0 with their count ("Deferred"). The tools never ADD a
  stage, follow-up or ruling id (R50 review: four tools did; fixed).
- **Test titles:** re-worded only through `data/title-decisions.json` / `titles.py` and the explicit table in
  `page_titles.py`. Every measured number, band, unit and source in a title is kept. A known-miss (`it.fails`) title
  keeps its "measured …" part. Titles stay unique per file (checked).
- **Stage 8b's honesty rules stay binding** (its Global Constraints, "Documentation honesty"): no page claims clinical
  validation, IEC 60601 compliance, FDA/CE status or diagnostic use without a negation; `docs-honesty.test.ts` must
  stay green after every task (it reads `README.md`, `docs/guides/*.md` and every expected-failure title).
- **CI rules:** the fast/slow split and the `validate` workflow stay; this stage changes the slow GROUPS (seven →
  nine), adds one e2e report step and re-words the test-slow job's history comment — the only `ci.yml` edits, made by
  `ci/apply_ci_edit.py` (anchored, idempotent).
  Heavy e2e stays Chromium-only. Every committed image stays ≤ 60 KB (none is added).
- **Running the e2e suite rewrites other stages' committed gate screenshots.** Never `git add -A` on the BRANCH;
  stage explicit paths (`git add -- <paths>` from `git status --short`), and before every commit restore every
  modified path under `docs/gates/` (`git checkout -- docs/gates`), except `docs/gates/stage-14*`. (The prototype used
  `git add -A` only in its throwaway worktree.)
- **Process:** push after every task commit (`git push origin stage-14-cleanup`); open the PR as a DRAFT after
  Task 1 so CI (Chromium + WebKit, all slow groups) exercises every later push; mark it ready in Task 7; never push to
  `main`; never merge; never `git stash` (shared across worktrees). Scratch files only under
  `<scratchpad>/stage-14/`. Bound every wait (≤ 10 min per `until` loop; re-check the process or the log's mtime).
  Never run a command that reads standard input (no heredocs; write files with your file tool; add `< /dev/null` to
  `npx`/`vitest`/`playwright` calls run in the background). Stop only processes you started (by PID).
- pnpm is not on PATH: `npx -y pnpm@9.15.9 …`. No `timeout` on macOS. Playwright locally: `PW_SYSTEM_CHROME=1`, project
  name `chrome` (WebKit is not installed locally; CI runs it).
- Commit messages are conventional and end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (use your
  harness's attribution line if it gives a different one). The PR is titled **"Stage 14: clean-up — history out of the
  code, documentation by the model"**; its body ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## Review Focus

1. **A rename that silently moves a test between CI sets.** A fast file renamed into a domain glob of `SLOW`
   (`neuro-*`, `fidelity-*`, `circ-sanity-*`, `pk-acceptance-*`, `blood-sanity-*`, `**/*longrun*`) would run in slow-b
   instead of the fast job, and a stage-family glob (`fu9-*`) would match nothing after the renames. Expected: every
   test runs in the same set as before. Pinned by Task 2 Step 5 (`compare_lists.py` over the fast set, `slow` and
   every group) and by `expand_globs.py` running before `rename.py`.
2. **A comment rewrite that drops a fact** (a number, a citation, a provenance tag, a table locator such as `Q42`, a
   NOTICES row) or changes code. Expected: only history goes. Pinned by `same-code.ts` (Task 1 Step 4; it cannot see a comment's words, by design), by
   `rewrite.py`'s lost-fact guard (a proposal that drops a number becomes class m and needs a reviewed decision), and by
   the review table (Task 1 Step 6) that the reviewer samples, and `inv/lost-facts.tsv` (reviewed decisions that drop a
   number, path or code span — listed for the sample, not refused: value histories legitimately go).
3. **Stage 8b's honesty test after re-worded titles.** `docs-honesty.test.ts` requires every expected-failure title
   verbatim in `docs/guides/known-deviations.md`. Expected: the page follows the titles with its hand-written
   "Tracked in" cells intact. Pinned by Task 2 Step 3 (`update_deviations_page.py`) and the honesty run in Task 2
   Step 6.
4. **A developer-page URL resolved against the wrong page.** Pages that open sibling pages by relative URL
   (`controller-host` → `controller-remote`, `vent-link` → `../vent-hamilton.html`) and the kit's
   `vent-hamilton.html` (it does not move). Expected: every Developer link and every asset it loads answers 200.
   Pinned by Task 4 Step 4 (`demo/check-links.mjs` against a kit-style build) and the targeted e2e files.
5. **A retry that hides a defect.** After Task 5 an e2e test that passes only on a retry fails the CI job unless it
   carries `@known-flaky`. Expected: every test seen passing only on a retry in the harvest window
   (`data/known-flaky.tsv`, refreshed at launch by Task 5 Step 0; 13 tests on c7d9b51c) is tagged and listed in the
   summary; any other flaky test is red; an unreadable report is red. Pinned by Task 5 Step 7 (the step exercised on a
   synthetic report, a real Playwright JSON report and a real CI log) and the PR's CI run.

---

## Decisions this plan makes where the brief was silent

1. **Re-basing is a re-run.** The comment decisions are keyed on `sha1(file + exact comment text)[:12]`; the title
   decisions on `sha1(file + exact title source)[:12]`. On a newer `main`, an unchanged comment or title gets its
   reviewed decision; a changed one is re-classified by the script, and if it lands in class m or c (or is new) the
   executor writes its decision (Task 1 Step 3) — the count of such "unreviewed" entries is printed by `rewrite.py`.
   Titles run BEFORE the renames (Task 2 Step 2) so their keys use the paths the decisions were written for.
2. **Class m.** The brief's three classes are kept, plus m: "(b) whose rewrite the regex rules could not make safely"
   (a history id inside a sentence, a stage name used as a point in time — "since 7f" —, a dropped number). Every m
   and c block has a reviewed decision in `data/comment-decisions.json` (1,148 decisions after the R50 review: the
   prototype's 916 — all 338 m, all 23 c, 555 overrides of a or b proposals — plus 232 written by the R50 review (165 for
   the Question 4 scope and the pending stages' new blocks, 66 for the blocks the old parser missed, 1 sample fix of a
   script proposal), and 7 corrected after the R50 lost-fact sample; titles: 441 = 436 + 5, 3 corrected;
   `data/reviewed-keys.txt` lists every block a reviewer read, so a NEW unread b proposal is counted).
3. **Module names for stage ids** (comments and titles): 7a circulation, 7b lungs, 7c blood, 7d organs, 7e endocrine
   and thermal, 7f neuro, 7g drugs, 7k respiratory mechanics, 7x physiology console, Stage 3 respiratory/gas signals,
   4a skins and audio, 4b device layer, 5 rhythm library, 6a controllers, 6b scenario runner, 8a validation harness,
   9 the clinical app, V the ventilator link.
4. **Stage-family globs become file lists** in `packages/engine-core/vite.config.ts` (`fu8-*`, `fu9-*`, `fu10-*`,
   `fu71-*`) before the renames (`expand_globs.py`), so the group membership survives; `slow-b` stays "SLOW minus the
   others" by string equality, which the expansion keeps exact (proved by Vitest's own lists).
5. **Two pages for the misses** (Question 1, RULED: accepted): `docs/validation/known-misses.md` (new, generated, by module, target /
   measured / source parsed from the titles) and 8b's `docs/guides/known-deviations.md` (the release's honesty page
   with "Tracked in"), linked both ways; both read 8b's one lister. The index also carries the **target audit's
   verdict and proposed band** for every miss (orchestrator addition, 2026-10-11), joined through a TSV generated
   inside the repository (`docs/validation/target-audit.tsv`) from the audit PUBLISHED into
   `docs/validation/target-audit/` (Question 7, RULED, owner to confirm), which names tests by `path:line` on
   `26e78308`; a test change that breaks the join fails the guard, and `python3 scripts/import-audit.py --repo` (with
   one line in `overrides.tsv` per changed test) re-keys it inside the repository.
6. **8b's lister gains two cases** (`patch_deviations.py`): `it.fails.each(…)('title')` (one in
   `fidelity-arrest.test.ts`, three cases, invisible to 8b's patterns and not reported as unreadable) and the tests
   colocated in `apps/demo/src`. 8b's `known-deviations.md` therefore gains the `.fails.each` row in Task 3.
7. **Nine slow groups, packed on the per-file CI maximum** over 14 runs (2026-10-11), not the mean: job speed falls in
   tiers by runner (63 of 98 jobs at ≥ 0.85 of the per-file max), so the max is the normal slow-runner time. 280 min
   of slow tests at the max cannot fit eight 35-min jobs.
8. **"Passed only on retry" fails CI** unless the test is tagged `@known-flaky` (in the test, so the rule survives
   renames and covers every new file); retries stay at 2 so a log still tells a deterministic failure from a flake
   (Question 6, RULED). The tags are data (`data/known-flaky.tsv`: every test seen passing only on a retry in the
   harvest window, with its evidence run, except the vent-view pair), refreshed at launch; an unreadable report fails.
9. **The model pages are generated** by `scripts/model-docs.ts` (state, parameters, relations, data rows, functions,
   files, misses, tests), with three hand-written blocks per page (`purpose`, `equations`, `related`) preserved between
   markers; a Vitest guard fails when a page, the index or the known-miss index is stale, when a test or source file
   has no module, or when a hand marker is malformed.
10. **The README is the one after 8b** (8b Task 10 writes it first): this stage MERGES its changes into it three-way
    (base = 8b's planned README), so whatever 8b filled or changed is kept.

## Measured before and after

| Measure | Owner, 2026-10-05 (`main` 9f239701) | `origin/main` 90c8ca7b | After the prototype |
|---|---|---|---|
| Engine source (`packages/engine-core/src`) | 204 files, 26,194 lines | 205 files, 26,523 lines | 205 files, 26,598 lines (+75: re-wrapped comments; −190 comment lines over all packages) |
| History references in source comments | 2,275 | **2,984 comment lines in 268 files** (`packages/*/src`, TypeScript-parsed comments, the brief's patterns); 2,623 of them in engine-core | **171 lines, all kept on purpose** (licence headers, parameter-table locators `Q42`, "realism review", the D50 dextrose, "R03" = research 03); 0 of class a/b/c/m left |
| Files named after a stage | 189 | **225 files + 7 directories** (`apps/demo/src/stage4a/`, `stage4b/`, `stage6a/`, `stage6b/`, `packages/validation/test/fu11/`, `engine-core/test/l2/ecg/s5/`, `s51/`) | **0** (+18 rows ready for files the unmerged stages add) |
| Test titles naming the history | – | **895 titles in 444 files** (84 of them `it.fails`) + 11 e2e titles naming a page by its stage name | **0** (3 false positives: acceptance rows "7.", "7b." and the D50 dose) |
| Known-miss markers | 222 (= `grep -r fails packages/engine-core/test \| wc -l`: lines, comments included) | 150 `it.fails` + 1 `it.fails.each` (3 cases) + 1 stale conditional `test.fail` | 151 expected failures, all in `docs/validation/known-misses.md` by module (target band recognised 145, measured 140, source 56), **each with its audit verdict** (RIGHT 30, TOO NARROW 28, TOO WIDE 3, MIS-SPECIFIED 62, UNSUPPORTED 28; 0 not audited) and the audit's proposed band; 58 further audited rows (queue, `KNOWN` list, hidden misses) listed; 0 stale |
| README | 23 lines | 23 lines | 8b's README → 138 lines with a "The model" section (Task 6) |
| Demo pages | 28, one of them the app | 28: index + 4 used by the app + 23 others | 23: index + 4 app pages (unchanged paths) + 18 under `apps/demo/dev/`; 5 deleted (no e2e coverage lost) |
| Model documentation | none by module | none | `docs/model/`: 22 pages (21 modules + index), 6,512 lines, 96.5 % generated |
| CI slow groups | – | 7 groups; 253 / 280 min of tests (median / max); longest job 45.8 min | 9 groups, each ≤ 32.5 min at the max (projected from per-file times) |
| IIFE `patient-monitor.iife.js` (no 8b) | – | 1,303,987 B, 548,308 B gzip -9 | 1,303,303 B, 548,050 B gzip -9 (the env reads gone) |

## Prototype results (2026-10-11, `origin/main` 90c8ca7b, system Chrome, Node 26.8, five other agents on the machine)

| Step | Result |
|---|---|
| Task 1 comments | 5,623 comment blocks; 2,984 history-bearing lines → a 264, b 1,983, m 576, c 41, k 120 (blocks a 264, b 1,717, m 338, c 23, k 107); 916 reviewed decisions applied, 0 unreviewed; 256 files changed; `same-code: 256 changed files, 0 with a code change`; typecheck clean; fast suite green (audio 65, skins 191, engine-core 1,419 + 1 skipped, controller 248, ventilator 103, renderer 96, validation 119 + 11 skipped, demo 204); `check-notices: OK` |
| Task 2 titles + renames | 895 titles re-worded (459 as proposed, 436 by reviewed decision); 6 stage-family glob lines expanded; 198 files moved by `git mv` (+18 pending rows skipped: files not on `main` yet); 118 files with rewritten references; 30 residual old names (prose, log prefixes, a screenshot name — listed in `evidence/rename-residuals.txt`); `compare_lists.py`: every set identical (audio, controller, demo, renderer, skins, validation, ventilator, e2e 97, engine-core fast 1,419, slow 596, slow-a…g) except 8 titles whose text cites a renamed path (intended); fast suite green; on a simulated 8b page, `update_deviations_page.py` re-worded 80 title copies and only the newly listed `.fails.each` row was missing (Task 3 adds it) |
| Task 3 index | lister: 152 expected failures (151 after Task 5b), 1 skip, no unreadable title; `import_audit: 209 rows; fails=153, list=11, passing=2, queue=43; status matched=151, not-a-test=56, now-passing=1, unlisted=1` (one override: audit row 110, the conditional `it.fails` in `link-parity.test.ts`); every miss joined to its audit row(s); the drift check fails on a re-keyed title and passes when restored; `known-misses.md` with the two audit columns and the "audited elsewhere" section; the 14 module pages with misses regenerated; guard 5/5 |
| Task 4 pages | 65 files moved, 12 deleted; `vite.config.ts` reads `dev/*.html`; `dev.ts` has no dead link; demo typecheck and build clean; e2e (Chrome): `circulation-page`, `organs-page`, `pacer-overlay-device-tab`, `respiratory-evidence-page`, `app-instructor-tasks` 6 passed / 2 skipped (PME_SHOTS-only); the demo triage agent ran `vent-link`, `scenario-runner-page`, `controller-screens`, `physiology-console`, `skins-page` 9/9 and the kit's link check (203 requests, 0 failed) |
| Task 5 leftovers + CI | env reads gone; stale `test.fail` gone; guards split; JSON reporter; 6 tests tagged (22 tests in 6 files by `--grep @known-flaky`); `PME_TEST_SET` lists: slow 128 files = a 14 + b 20 + c 20 + d 32 + e 12 + f 10 + g 10 + h 3 + i 7, no file in two groups, union = slow; slow test names 596 = 596 (one moved file); fast 325 files unchanged |
| Task 6 model pages | 22 pages; second run changes nothing; `--check` exit 0; `model-docs.test.ts` 5/5; history ids in the generated pages 116 (889 before Task 1 cleaned the comments they quote) |
| Whole pipeline from a clean tree (`run_all.sh`) | identical tree to the step-by-step prototype except one comment path in 8b's lister (rewritten because the file existed before Task 2 — the real order); 865 files changed, +13,253 / −6,114 (with the audit join); patch `stage-14-prototype.patch` (3.3 MB; it contains a stand-in of 8b's `scripts/deviations.ts` recreated from the 8b plan) |
| Final checks on that tree | typecheck, fast suite, build, `check-notices`, targeted e2e: see the gate table filled in Task 7 (the prototype's numbers are in "Prototype final checks" at the end of this plan) |
| R50 review re-run (merged launch tree 544bf14d, fixed tools, `run_all.sh`) | Task 1: 3,840 history-bearing lines in 400 files → blocks a 390, b 2,232, m 440, c 29, k 127; 1,151 decisions applied, 0 unreviewed; 381 files changed, `same-code` 0 with a code change; residue 12 b/m facts. Task 2: 935 titles, 0 m; 222 moved, 122 files with rewritten references, 33 residuals. Task 3: 153 expected failures; audit matched 152, now-passing 1, unmatched 0, unlisted 0; `--repo` re-run identical. Task 4: 65 moved, 12 deleted, 15 titles, 18 page `<title>`s; kit-style build: 18 links, 204 requests, 0 failed. Task 5: 17 edits (13 tags; 18 tagged tests in 11 files); groups 128 = 14+20+20+32+12+10+10+3+7, COVER-OK. Task 6: 22 pages, second run 0 changed. `compare_lists`: only the documented differences. `pnpm typecheck` clean. The split `link-parity.test.ts`: 2 passed, logged values identical to the conditional form. |
| Not prototyped | anything that needs 8b on `main` (the real README, overview and deviations pages, `docs-honesty`, `check-size`, `check-licences`); the full e2e suite and WebKit (CI); the slow engine set (only listed, not run — the files' content does not change except one split); the kit rehearsal; the real CI timing of the nine groups |

## Partition and ordering (brief item 7)

This stage runs after the tag, so in the normal case every stage below has merged and nothing is held. Files this
stage edits that each unmerged branch also edits (from `git diff --name-only origin/main...origin/<branch>` on
2026-10-11, recomputed by the R50 review after stage-11 merged — `ci.yml` is no longer touched by a pending branch;
24 files; the four branches merge into c7d9b51c without a conflict):

| File | Edited by | What this stage does to it |
|---|---|---|
| `apps/demo/e2e/fu11-vent-restore.e2e.ts` | fu-11-d | Task 2: renamed `vent-view-restore.e2e.ts`, title |
| `apps/demo/e2e/stage4b-device.e2e.ts` | stage-10, stage-12, stage-13 | Task 4: renamed `device-layer-page.e2e.ts` |
| `apps/demo/vite.config.ts` | stage-13 | Task 1 comments (config scope); Task 4: inputs from `dev/` |
| `packages/controller/relay/README.md` | stage-12, stage-13 | Task 4: served page URLs |
| `packages/controller/src/protocol.ts` | fu-11-d, stage-10, stage-12, stage-13 | Task 1 comments |
| `packages/controller/src/scenario/driver.ts` | stage-10, stage-12, stage-13 | Task 1 comments |
| `packages/controller/src/scenario/types.ts` | stage-13 | Task 1 comments |
| `packages/controller/src/session/controller-session.ts` | fu-11-d, stage-10, stage-12, stage-13 | Task 1 comments |
| `packages/controller/src/session/host-session.ts` | fu-11-d, stage-10, stage-12, stage-13 | Task 1 comments |
| `packages/controller/src/session/viewer-sync.ts` | stage-10, stage-12, stage-13 | Task 1 comments |
| `packages/engine-core/src/clock/clock.ts` | stage-10, stage-12, stage-13 | Task 1 comments |
| `packages/engine-core/src/engine.ts` | stage-10, stage-12, stage-13 | Task 1 comments |
| `packages/engine-core/src/l3/alarms/manager.ts` | fu-11-d, stage-10, stage-12, stage-13 | Task 1 comments |
| `packages/engine-core/test/engine/engine-commands.test.ts` | stage-10, stage-12, stage-13 | Task 2 titles |
| `packages/renderer/src/alarm-audio.ts` | fu-11-d, stage-10, stage-12, stage-13 | Task 1 comments |
| `packages/renderer/src/device-ui.ts` | stage-12, stage-13 | Task 1 comments |
| `packages/renderer/src/engine.worker.ts` | stage-10, stage-12, stage-13 | Task 1 comments |
| `packages/renderer/src/index.ts` | fu-11-d, stage-10, stage-12, stage-13 | Task 1 comments |
| `packages/renderer/src/monitor-core.ts` | stage-10, stage-12, stage-13 | Task 1 comments |
| `packages/renderer/src/mount.ts` | fu-11-d, stage-10, stage-12, stage-13 | Task 1 comments |
| `packages/renderer/src/protocol.ts` | stage-10, stage-12, stage-13 | Task 1 comments |
| `packages/renderer/src/worker-host.ts` | fu-11-d, stage-10, stage-12, stage-13 | Task 1 comments |
| `packages/renderer/test/alarm-audio.test.ts` | fu-11-d, stage-10, stage-12, stage-13 | Task 2 titles |
| `packages/ventilator/src/link/port.ts` | stage-10, stage-12, stage-13 | Task 1 comments |

Stage 8b's partition (its Global Constraints) that this stage also edits, all after 8b has merged: `README.md`,
`scripts/deviations.ts`, `docs/guides/{physiology-overview,known-deviations}.md` (Task 6, Tasks 2–3), `ci.yml`,
`packages/engine-core/vite.config.ts`, `packages/renderer/src/{engine.worker,worker-host}.ts` (comments only),
`apps/demo/src/app/views/dev.ts` (8b Task 13b may retire pages first: Task 4's script skips absent pages) and
`apps/demo/e2e/iife-smoke.e2e.ts` (a title). The unmerged branches ADD stage-named files (`s10-*`, `s12-*`,
`stage13-debrief.e2e.ts`, `fu11-follower.e2e.ts`, `fu11-mirror.test.ts`, `fu11-relay-mirror.test.ts`,
`scripts/showcase/s10-time.showcase.ts`): their rows are in `data/map-pending.tsv` and apply when the files exist.
Stage 11's `apps/demo/src/app/showcase/s1-mh.slow.test.ts` … `s5-kept.slow.test.ts` take their scenario names
(Question 11, RULED; rows in `data/map-task2.tsv`). With the Question 4 scope every `apps/demo/src` file a branch edits
is also a Task 1 file; this stage runs after the merges, so that changes nothing (Task 0 Step 1).

**Order against Stage 8b's own edits (exact):** 8b writes `README.md` (its Task 10), `docs/guides/known-deviations.md`,
`docs/guides/physiology-overview.md` and `scripts/deviations.ts` (its Task 12) and may retire developer pages (its
Task 13b), all merged before this stage starts. This stage then edits them in this order and no other: Task 2 Step 3
(`known-deviations.md`: the title copies, `update_deviations_page.py`); Task 3 Step 1 (`scripts/deviations.ts`: two
patterns, `patch_deviations.py`); Task 3 Step 2 (`known-deviations.md`: the `.fails.each` row and the link-parity row,
by hand); Task 4 Step 1 (`apply.py` skips the pages 8b retired); Task 5 Step 2 (`known-deviations.md`: the stale
`test.fail` row removed, by hand); Task 6 Step 3 (`post8b_docs.py`: README three-way merge, the overview's headings and
"Details:" lines, the one link line on `known-deviations.md`). 8b's `docs-honesty.test.ts` is never edited
(Question 1).

**If the orchestrator launches before a branch has merged:** Task 0 Step 4 writes the union of that branch's files
into `hold.txt`; `apply_comments.py` and `titles.py` skip held files; `rename.py` neither moves a held file nor
renames a file a held file imports (it still rewrites import lines INSIDE a held file when it imports a moved file —
the branch then re-runs `rename.py` after rebasing, which is a no-op for everything else). Tasks 4–6 are not run until
the hold list is empty.

## File map

| Created / changed | Task | By |
|---|---|---|
| comments in 256 files under `packages/*/src` | 1 | `comments.ts` → `rewrite.py` (+ `data/comment-decisions.json`) → `apply_comments.py` |
| `docs/gates/stage-14/{comment-rewrites.tsv,per-file.tsv,summary.txt,inventory.tsv}` | 1 | `review_table.py` (evidence) |
| titles in 444 test files; `docs/guides/known-deviations.md` title copies | 2 | `titles.py` (+ `data/title-decisions.json`), `update_deviations_page.py` |
| 198 + up to 18 renamed files; references in 118 files; `packages/engine-core/vite.config.ts` (explicit lists) | 2 | `expand_globs.py`, `rename.py` (+ `data/map-task2.tsv`, `data/map-pending.tsv`) |
| `scripts/deviations.ts` (two patterns), `scripts/model-modules.ts`, `scripts/known-misses.ts`, `docs/validation/target-audit.tsv`, `docs/validation/known-misses.md`, one row of `known-deviations.md` | 3 (re-run in 5) | `patch_deviations.py`, copied scripts, `import_audit.py` (+ `research/30-target-audit.csv`, `data/audit-overrides.tsv`), generator |
| 18 pages → `apps/demo/dev/`, 5 deleted; entries under `apps/demo/src/dev/`; `vite.config.ts`, `dev.ts`, URLs; 11 e2e titles | 4 | `demo/apply.py` (+ `data/demo-map.tsv`), `page_titles.py` |
| `rows-anaesthetic.ts`, `app-instructor-tasks.e2e.ts`, `drug-layer-guards{,-csht}.test.ts`, `playwright.config.ts`, 6 e2e files (tags), `packages/engine-core/vite.config.ts`, `ci.yml` | 5 | `task5_edits.py`, `ci_groups.py`, `ci/apply_ci_edit.py` |
| `scripts/model-docs.ts`, `packages/validation/test/model-docs.test.ts`, `docs/model/*.md` (22) | 6 | copied, generator |
| `README.md`, `docs/guides/physiology-overview.md`, `docs/guides/known-deviations.md` (one link) | 6 | `post8b_docs.py` (+ `model/README.stage14.md`) |
| `packages/ventilator/test/link-parity.test.ts` (Question 12 split), `scripts/import-audit.py`, `docs/validation/target-audit/` (the published audit, `overrides.tsv`, carry files) | 3 | `split_link_parity.py`, `publish_audit.py`, `import_audit.py --write-carry` |
| comments in `apps/demo/src` and the `*.config.ts` files (Question 4) | 1 | the same Task 1 tools, extended globs |
| 18 page `<title>`s, the Developer view's heading | 4 | `page_titles.py` |
| `docs/gates/stage-14.md` | 7 | gate note |

---

## Tasks

### Task 0: Launch gate, worktree, branch, tools, baseline

**Files:** none changed.

- [ ] **Step 1: Launch gate.** Stop and report if any check fails.

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin --tags
git tag -l 'v1.0.0-rc.1'                                     # expected: v1.0.0-rc.1
for b in stage-8b-release stage-10 stage-11 stage-12 stage-13 fu-11-d; do
  printf '%s ' "$b"; git merge-base --is-ancestor "origin/$b" origin/main 2>/dev/null && echo merged || echo NOT-MERGED; done
git ls-tree --name-only origin/main scripts/deviations.ts docs/guides/known-deviations.md docs/guides/physiology-overview.md README.md
```

Expected: the tag, six `merged` lines (a branch the orchestrator deleted after merging shows NOT-MERGED: then check
`gh pr list --state merged --search "head:<branch>"` instead) and the four 8b files. A missing 8b file means 8b has
not merged: stop.

- [ ] **Step 1b: The vent-view gate (Question 6 ruling) and the newest CI evidence.** Read the build job of the launch
  `main`'s last push run:

```bash
mkdir -p <scratchpad>/stage-14          # still in repo/, as Step 1
RUN=$(gh run list --branch main --workflow ci.yml --event push --limit 1 --json databaseId --jq '.[0].databaseId')
JOB=$(gh run view "$RUN" --json jobs --jq '.jobs[] | select(.name == "build") | .databaseId')
gh run view "$RUN" --log --job "$JOB" > <scratchpad>/stage-14/build-main.log < /dev/null
grep -E "\[webkit\] › apps/demo/e2e/(fu11-)?vent-(view-)?(restore|speed)\.e2e\.ts" <scratchpad>/stage-14/build-main.log | grep -v "retry #" | cut -c1-200
python3 ../scratch/plans-backup/stage-14-plan-tools/ci/flaky_from_log.py <scratchpad>/stage-14/build-main.log
git grep -n "test.skip(browserName === 'webkit'" -- 'apps/demo/e2e/*vent*restore*' 'apps/demo/e2e/*vent*speed*'
```

Expected: each of `vent-view-restore` / `vent-view-speed` (still `fu11-vent-restore` / `fu11-vent-speed` here) on
WebKit either `✓` on the first attempt, or SKIPPED/tagged with a reason that names the fixer item (the orchestrator's
launch message gives its id). Measured on c7d9b51c (run 38135947061): `vent-speed` ✓ first attempt; `vent-restore`
skipped on WebKit by the FALLBACK ruling (db277194) with the reason "long ×4 sim scenario too slow on headless WebKit"
— no fixer id: if the launch message names the fixer item, Task 5 Step 1 appends ` (fixer item <id>)` to that skip
reason (a string, not an outcome); if it does not, STOP and ask. The `flaky_from_log.py` lines are the tests that
passed only on a retry on that run: each must be in the tools' `data/known-flaky.tsv` (Task 5 Step 0 adds the missing ones);
on c7d9b51c: `fu11-explore-baseline.e2e.ts:23` and `stage9-app.e2e.ts:43` (both in the list since the R50 review).

- [ ] **Step 2: Worktree, branch, install.**

```bash
git worktree add ../scratch/wt-stage-14 -b stage-14-cleanup origin/main
cd ../scratch/wt-stage-14
mkdir -p docs/plans && cp ../../repo/docs/plans/stage-14-cleanup.md docs/plans/stage-14-cleanup.md
npx -y pnpm@9.15.9 install --frozen-lockfile < /dev/null
T=../plans-backup/stage-14-plan-tools
(cd "$T" && shasum -a 256 -c SHA256SUMS | grep -v ': OK$'; echo "checksums done")   # expected: only "checksums done"
mkdir -p <scratchpad>/stage-14
```

- [ ] **Step 3: Baseline test lists and green suite.**

```bash
sh "$T/list-tests.sh" <scratchpad>/stage-14/lists-base
npx -y pnpm@9.15.9 typecheck && PME_TEST_SET=fast npx -y pnpm@9.15.9 test > <scratchpad>/stage-14/base-test.log 2>&1 < /dev/null; tail -3 <scratchpad>/stage-14/base-test.log
```

Expected: 19 list files (`slow-h`/`slow-i` list every engine test before Task 5: unknown sets; `compare_lists.py`
skips them); typecheck clean; the fast suite green. A red test on `main` is recorded in the gate note and
reported, not fixed here.

- [ ] **Step 4: Hold list** (only when the orchestrator launched before a branch merged; otherwise write an empty file).

```bash
: > <scratchpad>/stage-14/hold.txt
# for each branch the orchestrator named as not yet merged:
git diff --name-only origin/main...origin/<branch> >> <scratchpad>/stage-14/hold.txt
```

Then `W=<scratchpad>/stage-14/run; mkdir -p "$W"; cp <scratchpad>/stage-14/hold.txt "$W/hold.txt"`. Every later task
uses `$T` and `$W`.

### Task 1: Comments — inventory, classification, the review table, the rewrite

**Files:** Modify: comments in `packages/*/src/**/*.ts`, `apps/demo/src/**/*.ts` and the `*.config.ts` files (381 files
on the merged launch tree, R50 review). Create:
`docs/gates/stage-14/{comment-rewrites.tsv,per-file.tsv,summary.txt,inventory.tsv,lost-facts.tsv}`.

**Interfaces:**
- Consumes: `$T/comments.ts` (TypeScript-parser comment blocks), `$T/rewrite.py` (classes a/b/m/c/k, proposals,
  `key = sha1(file + "\0" + text)[:12]`), `$T/data/comment-decisions.json` (`{key: {after, note}}`, `"after": ""`
  deletes, `"KEEP"` keeps), `$T/apply_comments.py`, `$T/same-code.ts`, `$T/review_table.py`.
- Produces: `$W/inv/rewrites.json` (one entry per block: key, file, line, cls, before, after, reviewed) used by
  Task 7's gate note.

- [ ] **Step 1: Inventory and classification (read-only).**

```bash
node --experimental-strip-types "$T/comments.ts" 'packages/*/src/**/*.ts' 'packages/*/src/*.ts' 'apps/demo/src/**/*.ts' 'apps/demo/src/*.ts' '*.config.ts' > "$W/blocks.json" < /dev/null
python3 "$T/rewrite.py" "$W/blocks.json" "$W/inv" "$T/data/comment-decisions.json"
```

The globs are quoted, one per argument (Global Constraints). Expected on the merged launch tree (c7d9b51c + fu-11-d,
stage-10, stage-12, stage-13; R50 review, fixed parser): `history-bearing comment lines: 3840 in 400 files; by class
(lines): a=390, b=2525, m=722, c=61, k=142` and `blocks: a=390, b=2232, m=440, c=29, k=127; reviewed decisions applied:
1151; unreviewed m/c: 0; unreviewed new b: 0; reviewed decisions dropping a number/path (lost-facts.tsv): 286`. (The
prototype's 2,984 lines on 90c8ca7b were `packages/*/src` only and missed every comment that follows a comma on its
line — array elements, arguments, object properties: 245 blocks on c7d9b51c, fixed in `comments.ts` by the R50 review.)
If the branches change before they merge, the numbers move and Step 3 decides the new blocks.

- [ ] **Step 2: Read the classes on the launch tree.** The rules (in `rewrite.py`): **a** — the block is history
  only (`// Stage 7e`, `// FU-8 (B1)`) → deleted; **b** — history ids, labels and "(was …)" value histories are
  removed, module ids become module names, the fact stays (`// FU-6 R14: hypercapnic pulmonary vasoconstriction` →
  `// Hypercapnic pulmonary vasoconstriction`); **m** — like b, but the rules could not make the rewrite safely;
  **c** — a known-miss, deviation or stand-in (`INTERIM`) marker → kept and re-worded to the domain; **k** — matched a
  pattern but is not history (a table locator `Q42`, "realism review", a licence header) → unchanged. A b proposal that
  drops a number, a path or a code span is demoted to m by the lost-fact guard.

- [ ] **Step 3: Decision refresh — decide every unreviewed block (bounded).** Re-basing measured by the R50 review:
  on c7d9b51c and on the merged launch tree **0 of the 1,148 comment decisions went stale** (no hash miss); every new
  block of the four pending branches is already decided. If Step 1 prints `unreviewed m/c: N` or `unreviewed new b: M`
  with N + M > 0 (blocks a branch changed after 2026-10-11), list them:

```bash
python3 -c "import json,os; rk=set(open('$T/data/reviewed-keys.txt').read().split()); [print(x['key'], x['file'], x['line'], x['cls'], '\n', x['before'], '\n>>', x['after'], '\n') for x in json.load(open('$W/inv/rewrites.json')) if not x['reviewed'] and (x['cls'] in 'mc' or (x['cls'] in 'ab' and x['key'] not in rk))]"
```

  copy `$T/data/comment-decisions.json` to `$W/comment-decisions.json`, add one entry per m/c key and per WRONG a/b
  proposal (rules: `$T/data/REVIEW-RULES.md` — history vs fact, module names, ≤ 120 columns, comment style kept; the
  regex b proposals were wrong 28 % of the time in the R50 batch: broken grammar after a cut id, left-over ids, a lost
  "×"), and re-run Step 1 with `$W/comment-decisions.json` until both counts are 0 (a b/a block you read and accept:
  add its key to a copy of `reviewed-keys.txt` in `$W` and pass that copy as the tools' `data/reviewed-keys.txt`).
  **Budget: ≤ 2 min per block, at most 2 h; above 60 blocks STOP and report** (a branch changed far more than measured).
  List every decision written here, with its key, in the gate note.

- [ ] **Step 4: Apply, and prove only comments changed.**

```bash
python3 "$T/apply_comments.py" "$W/inv/rewrites.json" "$W/hold.txt"
node --experimental-strip-types "$T/same-code.ts" HEAD 'packages/*/src/**/*.ts' 'packages/*/src/*.ts' 'apps/demo/src/**/*.ts' 'apps/demo/src/*.ts' '*.config.ts' < /dev/null
```

Expected (merged launch tree): `applied blocks: a=390, b=2229, m=439, c=29; files 381; held 0; stale 0` (three b and
one m are KEEP) and `same-code: 381 changed files, 0 with a code change` (exit 0). `same-code.ts` re-prints every changed file with the
TypeScript printer, comments removed, and compares it with `HEAD`: any code difference fails it (R50 review: a
`const` appended after a rewritten comment was caught; it cannot see a comment's words — that is Step 6's sample). `stale N > 0` means a
block's text moved since Step 1: re-run Steps 1 and 4.

- [ ] **Step 5: What is left.**

```bash
node --experimental-strip-types "$T/comments.ts" 'packages/*/src/**/*.ts' 'packages/*/src/*.ts' 'apps/demo/src/**/*.ts' 'apps/demo/src/*.ts' '*.config.ts' > "$W/blocks-after.json" < /dev/null
python3 "$T/rewrite.py" "$W/blocks-after.json" "$W/inv-after"
```

Expected (merged launch tree): `history-bearing comment lines: 214 in 113 files; … a=0, b=7, m=5, c=0, k=202`. The 12
b/m are facts the patterns mistake for history: annex D14 (`blood/params.ts`, `oracle/blood-scenarios.ts` ×2), D50
dextrose (`endo/glucose.ts`), research/20 gap V1 (`hemo/pipeline.ts`), the `R03`/`M10` legends of the drug rows (×2),
D12 (`renal/params.ts`), the oracle O-ids (`oracle/renal-scenarios.ts`), the engine's own message "arrives in Stage 7"
(`segments/run.ts`), the validation `requires: ["7a", "7g"]` example data (`segments/types.ts`), and the gate path the
PTB-XL script writes (`templates/compare-ptbxl.ts`): read them, do not change them. Any other a/b/m/c block means a
decision was not applied: fix and repeat Step 4.

- [ ] **Step 6: The review table (committed evidence).**

```bash
python3 "$T/review_table.py" "$W/inv" docs/gates/stage-14
cp "$W/inv/inventory.tsv" docs/gates/stage-14/inventory.tsv
```

`comment-rewrites.tsv` has one row per history-bearing block (key, file, line, class, decided by: script / review /
kept, before, after; newlines shown as ⏎); `per-file.tsv` the per-file line counts by class; `summary.txt` the
totals; `lost-facts.tsv` the reviewed decisions that drop a number, path or code span (286 on the merged tree: most are
value histories and ids, legitimately gone). The reviewer of this PR samples it (≥ 50 rows of class b decided by
"script", ≥ 20 of m/c, ≥ 30 of `lost-facts.tsv`). **Residual risk, stated:** the R50 review's seeded sample of 155
decisions found 5 that changed meaning or kept/misplaced an id (fixed); extrapolated ≈ 90 such slips remain across the
≈ 3,000 decided blocks and titles — no sampled entry dropped a number, citation, NOTICES row or table locator.

- [ ] **Step 6b: Second read of every judgement-class decision (orchestrator ruling 2026-10-11, after the R50 review).**
  Before Step 7 applies anything, one reviewer agent (Opus) reads EVERY decision of class m and c and every override
  of an a/b proposal in `data/comment-decisions.json` (≈ 950 entries) and every title decision of class m plus every
  override in `data/title-decisions.json`, against the original text and the code around it, and corrects any that
  changes meaning, invents a label, keeps an id or an owner-question marker, or moves a citation onto another clause.
  Budget: 3 hours; at most 2 helper agents, each on a disjoint key range; stop and report if the budget runs out, with
  the ranges done. Output: `evidence/second-read.tsv` (key, verdict ok/fixed, one-line reason for every fix) committed
  with the review table. The PR reviewer's sample in Step 6 remains as the independent control.

- [ ] **Step 7: Tests.**

```bash
npx -y pnpm@9.15.9 typecheck
PME_TEST_SET=fast npx -y pnpm@9.15.9 test > <scratchpad>/stage-14/t1.log 2>&1 < /dev/null; grep -E "Tests  |FAIL" <scratchpad>/stage-14/t1.log
npx -y pnpm@9.15.9 check-notices
npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/docs-honesty.test.ts < /dev/null
```

Expected: clean; the fast suite with the same counts as Task 0 Step 3; `check-notices: OK`; docs-honesty green (it
does not read comments; run it so a red result here is not blamed on a later task).

- [ ] **Step 8: Commit, push, draft PR.**

```bash
git add -- packages apps/demo/src '*.config.ts' docs/gates/stage-14 docs/plans/stage-14-cleanup.md
git status --short | grep -v '^[MADR] ' ; git checkout -- docs/gates 2>/dev/null; git status --short docs/gates
git commit -m "chore(comments): the development history leaves the source comments; the facts stay (Stage 14 Task 1)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push -u origin stage-14-cleanup
gh pr create --draft --title "Stage 14: clean-up — history out of the code, documentation by the model" --body-file <scratchpad>/stage-14/pr-body.md
```

(`pr-body.md`: the Goal paragraph of this plan, the task list as checkboxes, and the attribution line.) The
`git checkout -- docs/gates` must not undo `docs/gates/stage-14/`: it is new and staged, so it is kept.

### Task 2: Test titles and file names

**Files:** Modify: titles in 469 test files (merged launch tree); `packages/engine-core/vite.config.ts` (explicit
lists); `docs/guides/known-deviations.md` (title copies); references in ~122 files. Rename: 222 files on the merged
launch tree (176 map rows + 19 pending rows; directory rows expand).

**Interfaces:**
- Consumes: `$T/titles.py`, `$T/data/title-decisions.json`, `$T/update_deviations_page.py`, `$T/expand_globs.py`,
  `$T/rename.py`, `$T/data/map-task2.tsv`, `$T/data/map-pending.tsv` (`old<TAB>new<TAB>kind<TAB>basis<TAB>notes`),
  `$T/list-tests.sh`, `$T/compare_lists.py`.
- Produces: `$W/titles/titles.json` (before/after per title; read by `compare_lists.py` here and in Tasks 4–5) and
  `$W/map.tsv` (the applied map; read by `ci_groups.py` in Task 5).

- [ ] **Step 1: The rename map is complete.** Every stage-named path on the launch tree must have a row:

```bash
cat "$T/data/map-task2.tsv" > "$W/map.tsv"; tail -n +2 "$T/data/map-pending.tsv" >> "$W/map.tsv"
git ls-files | grep -v -E '^docs/(gates|plans|review-inputs)/' \
  | grep -E '(^|/)[^/]*(stage-?[0-9]|(^|[-_/])fu-?[0-9]|(^|[-_/])s[0-9]+-|(^|[-_/])7[a-z][-_.]|(^|[-_/])8[ab][-_.])[^/]*$|/(s5|s51|stage4a|stage4b|stage6a|stage6b|fu11)/' \
  > "$W/stage-named.txt"
python3 -c "
rows=[l.split('\t')[0] for l in open('$W/map.tsv').read().split('\n')[1:] if l.strip()]
rows+= [l.split('\t')[0] for l in open('$T/data/demo-map.tsv').read().split('\n')[1:] if l.strip()]
miss=[f for f in open('$W/stage-named.txt').read().split() if not any(f==o or f.startswith(o.rstrip('/')+'/') for o in rows)]
print('\n'.join(miss) or 'map covers every stage-named path')"
```

Expected: `map covers every stage-named path` (R50 review: true on the merged launch tree after the rows for the five
showcase tests — Question 11 — and `scripts/showcase/s10-time.showcase.ts` were added). Otherwise add a row per missing file to `$W/map.tsv` (domain name of
what the file tests or does, lowercase-hyphen, no collision — the script below refuses a collision) and list the
additions in the gate note. The demo pages, their entries, their e2e files and their screenshot scripts are in
`data/demo-map.tsv` and move in Task 4, not here.

- [ ] **Step 2: Titles first** (their decision keys use today's paths).

```bash
python3 "$T/titles.py" "$W/titles" "$T/data/title-decisions.json" --apply "$W/hold.txt"
```

Expected (merged launch tree, R50 review): `titles naming the history: 935 in 469 files; b=935, m=0, dup=0; it.fails
among them: 84; applied b; unreviewed new b: 0` — 0 of the 441 title decisions went stale (the 40 titles the pending
branches add are decided). If a branch changes titles before it merges, they appear as `m=N` or `unreviewed new b: N`:
list them (`python3 -c "import json; [print(x['key'], x['file'], x['before'], '>>', x['after']) for x in
json.load(open('$W/titles/titles.json')) if not x['reviewed']]"`), write a decision for every m title and every wrong b
proposal (same rules; keep every number; keep "measured …"), add them to a copy of `title-decisions.json` in `$W`,
re-run until `m=0, dup=0` and the new b are read. Budget: ≤ 2 min per title, STOP and report above 40.

- [ ] **Step 2b: Title ids the rewriter does not see.** Read the engine titles listed in "Deferred" (`(A1)`, `(A5)`,
  `(F2)`, `(F3)`, `(F7)`, `(D2)`, `(D5)`, `(G3)`): an id that `git log -S'<id>' --oneline -- <file> | tail -1` shows came
  with a review or follow-up commit is history — re-word the title by hand in that file and in
  `docs/guides/known-deviations.md` if it is an expected failure, and list it; an acceptance or table id stays. ≤ 30 min.

- [ ] **Step 3: Stage 8b's deviations page follows the titles.**

```bash
python3 "$T/update_deviations_page.py" "$W/titles/titles.json"
```

Expected: `update_deviations_page: N title copies re-worded in docs/guides/known-deviations.md` (prototype on a
simulated 8b page: 80). The "Tracked in" cells are untouched.

- [ ] **Step 4: The stage-family globs, then the renames.**

```bash
python3 "$T/expand_globs.py" "$W/map.tsv"
python3 "$T/rename.py" "$W/map.tsv" "$W/hold.txt" --residuals="$W/rename-residuals.txt"
```

Expected (merged launch tree): `expand_globs: 6 glob lines expanded` (`fu9-*` in SLOW and SLOW_C, `fu8-*` in SLOW and
SLOW_D, `fu10-*`, `fu71-*`), then `rename: 222 moved, 0 deleted, 122 files with rewritten references` and `residual old
names: 33 in 21 files`
(Task 4's demo files account for some; the rest is prose). `rename.py` rewrites, in every tracked text file outside
the records: relative import specifiers (resolved against the referring file); repo- and package-relative paths
(longest suffix first); a bare file name when no other tracked file has it. Read `$W/rename-residuals.txt`: fix by
hand only a reference that is a PATH (`git grep` it); leave prose ("the fu9 tests"), log prefixes and screenshot
output names, and list what you left in the gate note.

- [ ] **Step 5: The same tests, under their new names.**

```bash
sh "$T/list-tests.sh" <scratchpad>/stage-14/lists-t2
python3 "$T/compare_lists.py" <scratchpad>/stage-14/lists-base <scratchpad>/stage-14/lists-t2 "$W/map.tsv" "$W/titles/titles.json"
```

Expected: every line `same`, except lines whose differences are only titles that cite a renamed path (merged launch
tree: 7 in `engine-core-fast` — `s51/stemi.test.ts` → `rhythms/stemi.test.ts` inside five ST titles and one RBBB
title — and 1 in `ventilator`, the catalogue test's describe title). Read each difference; any other missing or extra
test is a failure of this step. (`compare_lists.py` reads Vitest's absolute paths relative to the current worktree;
the prototype's copy stripped only `wt-stage-14-proto/` and reported every renamed file as a difference elsewhere —
fixed by the R50 review. R50 check: a fast file renamed into `neuro-*` shows as 14 missing in `engine-core-fast` and
14 extra in `slow` and `slow-b`.)

- [ ] **Step 6: Tests.**

```bash
npx -y pnpm@9.15.9 typecheck
PME_TEST_SET=fast npx -y pnpm@9.15.9 test > <scratchpad>/stage-14/t2.log 2>&1 < /dev/null; grep -E "Tests  |FAIL" <scratchpad>/stage-14/t2.log
npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/docs-honesty.test.ts < /dev/null
npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/catalogue-md.test.ts < /dev/null
```

Expected: clean; same counts; docs-honesty green except possibly its first case for the `.fails.each` row (8b's
lister does not see it until Task 3 — it then cannot be missing either); the catalogue test green (its generator,
its document `docs/physiology/vent-lung-pathology-data.md` and the test were renamed consistently).

- [ ] **Step 7: Commit and push.**

```bash
git add -A -- packages apps scripts docs/physiology docs/guides docs/DESIGN-BRIEF.md docs/BUILD-PLAN.md docs/RESUME.md docs/roadmap .github playwright*.ts vitest.workspace.ts
git checkout -- docs/gates; git status --short | grep -v '^[MADR] '
git commit -m "chore(names): stage-named files and test titles take domain names (Stage 14 Task 2)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

(`git add -A -- <paths>` stages the renames inside those paths only; nothing under `docs/gates` other than
`stage-14/` may be staged.)

### Task 3: The known-miss index

**Files:** Modify: `scripts/deviations.ts` (two patterns), `packages/ventilator/test/link-parity.test.ts` (the
Question 12 split, structure only), `docs/guides/known-deviations.md` (two rows). Create: `scripts/model-modules.ts`,
`scripts/known-misses.ts`, `scripts/import-audit.py`, `docs/validation/target-audit/{30-target-audit.md,
30-target-audit.csv,99-synthesis.md,overrides.tsv,carry-map.tsv,carry-titles.json}`, `docs/validation/target-audit.tsv`,
`docs/validation/known-misses.md`.

**Interfaces:**
- Consumes: 8b's `listDeviations(root): Deviation[]` (`{ file, title }`) and `testFiles(root)` from
  `scripts/deviations.ts`; the target audit `research/30-target-audit.csv` (outside the repository, 209 rows, read on
  `26e78308`; synthesis `research/30-parts/99-synthesis.md`); `$W/titles/titles.json` and the rename maps (Task 2).
- Produces: `MODULES: ModelModule[]`, `ownerOfTest(file): ModelModule | undefined`, `ownerOfSource(file)` in
  `scripts/model-modules.ts` (used by Task 6); `readAudit(root): AuditRow[]`, `listMisses(root): Miss[]`
  (`Deviation` + `module, target, measured, source, band, audit: AuditRow[]`), `missRows(misses, linkPrefix)` (also
  used by the module pages) and `renderKnownMisses(root): string` in `scripts/known-misses.ts`;
  `docs/validation/target-audit.tsv` (columns `row, kind, status, file, title, verdict, proposed_band,
  proposed_sources, grade, likely_not_a_miss, audit_band, measured`).

**The audit join.** The target audit (2026-10-11) graded every expected-failure band and every calibration-queue row:
RIGHT / TOO NARROW / TOO WIDE / MIS-SPECIFIED / UNSUPPORTED, with a proposed band and its sources. The audit lives
outside the repository and names each test by `path:line` on `26e78308`, before this stage renamed files and re-worded
titles. `import_audit.py` carries every row to the CURRENT test file and title: in `26e78308`'s copy of the file it
takes the test call that starts at or before the audit's line, maps the file through git's rename detection
(`26e78308..HEAD`) and this stage's rename maps, maps the title through the title table, checks that the working
tree's file has that title and whether it is still an expected failure, and writes `docs/validation/target-audit.tsv`
inside the repository (so the index, its guard test and CI never read outside it). `known-misses.ts` joins the TSV on
(file, title): each miss shows its verdict(s) with the audit row number and the audit's proposed band; a section lists
the audited rows that are not in the expected-failure list (43 calibration-queue rows, 11 entries of the lung
signatures' `KNOWN` list, 2 passing tests the audit calls hidden misses, the stale `test.fail` that is no longer one,
and one conditional `(spasm ? it.fails : it)(…)` the lister cannot read). Proposed bands are evidence for owner
rulings; this stage changes no band (R45).

**When the audit changes** (rows added, verdicts revised, a re-audit on a newer commit) **or a test it graded is
re-worded or moved** — after this stage, everything needed is in the repository (Question 7 ruling): the published
audit and its CSV in `docs/validation/target-audit/`, the importer `scripts/import-audit.py`, the carry files this
stage wrote beside the CSV (`carry-map.tsv`, `carry-titles.json`: the rename-map and title-table rows the audit's rows
needed) and `overrides.tsv`. From the repo root:

```bash
python3 scripts/import-audit.py --repo        # = published CSV, commit 26e78308, carry files, overrides → docs/validation/target-audit.tsv
node --experimental-strip-types scripts/known-misses.ts && node --experimental-strip-types scripts/model-docs.ts
```

A test changed later: `known-misses.ts --check` (and `model-docs.test.ts`) fail with "rows N name a test that is not an
expected failure any more: add each row's current file and title to docs/validation/target-audit/overrides.tsv (or fix
the test), then re-run python3 scripts/import-audit.py --repo". The hand override is one line per row:
`<row><TAB><current file><TAB><current title>` appended to `docs/validation/target-audit/overrides.tsv`, then the two
commands above, committed in the same PR (R50 review: exercised — a re-worded audited title failed the check naming
row 163; one override line made it green). A re-audit on a newer commit: replace the published CSV and Markdown, then
`python3 scripts/import-audit.py docs/validation/target-audit/30-target-audit.csv <that commit> docs/validation/target-audit.tsv --overrides docs/validation/target-audit/overrides.tsv`
(no carry files: git's rename detection and that commit's titles already match). The TSV header records the commit.

- [ ] **Step 1: Close the two gaps in 8b's lister; split the conditional expected failure (Question 12).**

```bash
python3 "$T/patch_deviations.py"
python3 "$T/split_link_parity.py"; python3 "$T/split_link_parity.py"     # applied, then already
node --experimental-strip-types scripts/deviations.ts > <scratchpad>/stage-14/deviations.md < /dev/null
npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/link-parity.test.ts < /dev/null   # ≈ 3 min
```

Expected: `patch_deviations: applied, applied, applied`; `split_link_parity: applied (one literal it, one literal
it.fails)`; stderr `deviations: 153 expected failures, 1 skipped; unreadable titles in: none` (merged launch tree,
R50 review; 152 after Task 5 removes the stale `test.fail`). The new rows are
`packages/engine-core/test/engine/fidelity-arrest.test.ts` with the `%s: the CPR window's EtCO2 floor …` title and
`packages/ventilator/test/link-parity.test.ts` with `bronchospasm 1 at 20 min — measured at 30 min PaCO2 59.2 vs 39.6,
VT 238 vs 476 (band 3 mmHg / 10 %): gas within …`. The split's run: `2 passed` (the healthy `it` passes, the
bronchospasm `it.fails` passes because its body fails) — the same outcome as the conditional form (R50 review: both
forms run on the merged tree, identical logged values).

- [ ] **Step 2: Add those two rows to 8b's page.** Copy them from `<scratchpad>/stage-14/deviations.md` into the
  first table of `docs/guides/known-deviations.md`: the `.fails.each` row after the other `fidelity-arrest.test.ts`
  rows, "Tracked in" = the cell of the existing `fidelity-arrest.test.ts` row that tracks the CPR EtCO2 floor (same
  band per skin); the link-parity row after the other `packages/ventilator` rows, "Tracked in" =
  "target audit row 110 (docs/validation/target-audit/30-target-audit.md#row-110)". Then:

```bash
npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/docs-honesty.test.ts < /dev/null
```

Expected: green.

- [ ] **Step 3: The audit, carried into the repository.**

```bash
cp "$T/model/model-modules.ts" "$T/model/known-misses.ts" scripts/ && cp "$T/import_audit.py" scripts/import-audit.py
python3 "$T/publish_audit.py" ../../research "$T/data/audit-overrides.tsv"      # Question 7: RULED, owner to confirm
python3 scripts/import-audit.py ../../research/30-target-audit.csv 26e78308 docs/validation/target-audit.tsv \
  --map "$T/data/map-task2.tsv" --map "$T/data/map-pending.tsv" --map "$T/data/demo-map.tsv" \
  --titles "$W/titles/titles.json" --overrides docs/validation/target-audit/overrides.tsv \
  --write-carry docs/validation/target-audit
cp docs/validation/target-audit.tsv <scratchpad>/stage-14/target-audit.first.tsv
python3 scripts/import-audit.py --repo && cmp <scratchpad>/stage-14/target-audit.first.tsv docs/validation/target-audit.tsv && echo REPO-RERUN-SAME
```

Expected (R50 review, merged launch tree after Tasks 1–2): `publish_audit: docs/validation/target-audit:
30-target-audit.md (209 row anchors), 30-target-audit.csv, 99-synthesis.md, overrides.tsv`; `import_audit: 209 rows;
fails=153, list=11, passing=2, queue=43; status matched=152, not-a-test=56, now-passing=1`, exit 0, twice (the
`--repo` run writes the same rows). `now-passing` is the stale `test.fail` row (audit row 177, a plain pass after Task
5); audit row 110 (the link-parity bronchospasm miss) is `matched` through its override since the split. Measured on
c7d9b51c and on the merged launch tree before this stage: `unmatched` 0. A row that is `unmatched` on the launch tree
stops the script: find the test it graded, append `row<TAB>file<TAB>title` to `docs/validation/target-audit/overrides.tsv`,
re-run, and list the override in the gate note.

- [ ] **Step 4: The index.**

```bash
node --experimental-strip-types scripts/known-misses.ts < /dev/null
node --experimental-strip-types scripts/known-misses.ts --check < /dev/null; echo "exit $?"
```

Expected: `known-misses: 153 misses`, `exit 0` (152 after Task 5). The page groups the misses by the module that owns
the test file (`ownerOfTest`: an explicit list, then the test directory mirroring a source directory, then the first
domain word of the file name — stage tokens are not domain words, so a renamed file is owned and an unrenamed `fu9-x`
is not), and splits each title into target (the band), measured (after "measured") and source (author + year, a
section of a document in the repository, a textbook or guideline); a field it cannot find is written "—", never
guessed. Each row then carries **Audit verdict** ("MIS-SPECIFIED (audit row 17)"; several rows when the audit graded
more than one band of the test) and **Audit's proposed band**; a miss the audit did not grade says "not audited".
Prototype (after Task 5, before the split): parse rates band 145, measured 140, source 56 of 151; all 151 misses carry
a verdict — RIGHT 30, TOO NARROW 28, TOO WIDE 3, MIS-SPECIFIED 62, UNSUPPORTED 28 (a miss can carry several); 0 "not
audited"; 58 audited rows in the "Audited targets that are not in the list above" section. After the split: 152
misses, 57 rows in that section. Each verdict links its audit row (`target-audit/30-target-audit.md#row-N`); the page
says once that the `research/NN` notes the audit cites live in the project's research folder outside the repository.

- [ ] **Step 5: Read the page.** Open `docs/validation/known-misses.md`: every module section has its rows; no row
  says "unowned" or "not audited" (if one does, the audit did not grade that test: say so in the gate note, do not
  invent a verdict); no history id appears in a target cell (`grep -nE "Stage [0-9]|FU-[0-9]|\bR[0-9]{2}\b"` → none
  expected outside quoted source and audit cells). The audit's cells are copied as the audit wrote them (ASCII
  `>=`, `research/NN` pointers: Question 7). No test file is edited in this task (the brief: titles only, and they were
  re-worded in Task 2).

- [ ] **Step 6: The drift check works.** Copy `docs/validation/target-audit.tsv` to `<scratchpad>/stage-14/`, append
  " (changed)" to the title of its first `matched` row, run `node --experimental-strip-types scripts/known-misses.ts
  --check` → it fails with `rows 1 name a test that is not an expected failure any more: add each row's current file and
  title to docs/validation/target-audit/overrides.tsv …`; restore the copy and re-run → exit 0.

- [ ] **Step 7: Commit and push.**

```bash
git add -- scripts/deviations.ts scripts/model-modules.ts scripts/known-misses.ts scripts/import-audit.py packages/ventilator/test/link-parity.test.ts docs/validation/target-audit docs/validation/target-audit.tsv docs/validation/known-misses.md docs/guides/known-deviations.md
git commit -m "docs(validation): one generated index of the known misses, by module (Stage 14 Task 3)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task 4: Developer pages

**Files:** Move 18 pages to `apps/demo/dev/` and their entries under `apps/demo/src/dev/` (65 files on 90c8ca7b),
delete 5 pages with their entries and two screenshot scripts (12 files); modify `apps/demo/vite.config.ts`,
`apps/demo/src/app/views/dev.ts`, the URLs in e2e files, scripts, `packages/controller/relay/README.md` and
`packages/skins/src/data/skins/philips-like.json` (a provenance note citing a moved file); 11 e2e titles.

**The triage** (`demo/pages.tsv`, `demo/notes.md`; 90c8ca7b):

| Class | Pages | Rule |
|---|---|---|
| app (4) — stay at the root | `validation-bedside`, `validation-review` (framed by `views/validate.ts`), `validation-perf` (opened by it), `vent-hamilton` (framed by `views/vent.ts`, fetched by the kit's `check-servers.mjs` and `rehearsal.showcase.ts`, read by 8b's `build-embed.mjs`) | used by the app or the kit |
| a (16) — keep → `dev/` | `fu4` → `arrest-evidence`, `fu6` → `respiratory-evidence`, `fu7` → `drug-evidence`, `physiology-console`, `stage4a-skins` → `skins`, `stage4b-device` → `device-layer`, `stage6a`/`-remote`/`-viewer` → `controller-host`/`-remote`/`-viewer`, `stage6b-acls` → `scenario-runner`, `stage7a` → `circulation`, `stage7d` → `organs`, `stage7e` → `endocrine-thermal`, `stage7f` → `depth-neuromuscular`, `stage7g` → `drug-pkpd`, `vent-link` | an e2e test opens it |
| c (2) — keep → `dev/` (RULED 2026-10-11) | `stage5` → `rhythm-library` (the only rhythm catalogue on ECG paper), `stage7c` → `blood-acid-base` (the only on-screen lab panel / "send ABG") | Question 3 |
| b (5) — delete | `stage0`, `stage1`, `stage2`, `stage3`, `stage7b` | no e2e test, kit or app opens them; superseded by the app's Monitor, Explore and Ventilator views |

Coverage lost by the deletions: **none** (no e2e or unit test exercises them). Behaviour that leaves with them:
stage2's line damping/flush/zero controls (the engine behaviour stays unit-tested), stage3's SpO2-lag plot, stage7b's
five scripted lung demos (the Ventilator view and `vent-link` cover the link).

- [ ] **Step 1: Apply the map** (re-runnable; rows whose source 8b already retired are skipped and listed).

```bash
python3 -I "$T/demo/apply.py" "$(pwd)" "$T/data/demo-map.tsv"
python3 "$T/page_titles.py"
git grep -n -E "(fu[467]|stage[0-7][a-g]?|stage4a-skins|stage4b-device|stage6a(-remote|-viewer)?|stage6b-acls)\.html" -- . ':!docs/gates' ':!docs/plans' ':!docs/review-inputs' ':!docs/BUILD-PLAN.md'
```

Expected: `moved 65 files, deleted 12; skipped absent rows: none` (or the rows 8b retired), `dev.ts links to absent
pages: none`; `page_titles: 15 titles re-worded` (11 page-name titles + the four FU-11 finding ids `(K3)`, `(D5)`,
`(D3)`, `(F03–F05, F09)` the title rewriter does not detect) and `page_titles: 18 page <title>s re-worded; dev.ts
re-worded` (Question 3: the 17 developer pages with a stage label and `vent-hamilton.html` lose "Stage 7a: " / "FU-6: "
/ "(PME Stage V)"; the Developer view's "Build-stage pages" heading becomes "Developer pages" and its "stage 7a" /
"FU-4" notes go); the `git grep` prints nothing. `apply.py` stages only `apps/demo` and the files it edited (never
`git add -A` on the whole tree). `apply.py` steps: `git mv`/`git rm`
per row; relative import specifiers and `<script src>` re-relativised; repo-relative paths in code and config (not
docs); `/<old>.html` URLs in e2e files and scripts, `'<old>.html'` in `dev.ts`; the context-dependent URLs inside page
code from an explicit table (`controller-host` opens `./controller-remote.html` and `./controller-viewer.html`, the
same folder; `vent-link` opens `../vent-hamilton.html`); `vite.config.ts` builds every `dev/*.html` (read from the
folder, so the config never needs editing for a page again); `dev.ts` loses the rows of absent pages.
`page_titles.py` re-words the 11 e2e titles that named a page by its stage name ("stage7a page runs, …" →
"circulation page runs, …"; "R-51-1: TCP pace marks …" → "TCP pace marks …"; "item 5: a host page …" → "a host page …").
`update_deviations_page.py` is NOT re-run (none of the 15 is an expected failure).

- [ ] **Step 2: Gate-shot scripts that 8b left pointing at a retired page.** If 8b's
  `docs/gates/stage-8b/developer-pages.md` retired a page, `git grep` its old and new names in `apps/demo/scripts`;
  a script that only drives a retired page is deleted with a line in the gate note.

- [ ] **Step 3: Build and tests.**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo exec tsc -p tsconfig.json --noEmit < /dev/null
npx -y pnpm@9.15.9 --filter @pme/demo build < /dev/null; ls apps/demo/dist/dev/*.html | wc -l      # 18
npx -y pnpm@9.15.9 --filter @pme/demo test < /dev/null; npx -y pnpm@9.15.9 --filter @pme/skins test < /dev/null
PW_SYSTEM_CHROME=1 npx playwright test apps/demo/e2e/{circulation-page,organs-page,controller-pages,scenario-runner-page,skins-page,vent-link,pacer-overlay-device-tab,physiology-console}.e2e.ts --project=chrome --workers=2 < /dev/null
```

Expected: clean; 18 dev pages built; demo 204 and skins 191 pass; the e2e files pass (PME_SHOTS-only cases skip).

- [ ] **Step 4: The links resolve on a kit-style build.**

```bash
(cd apps/demo && npx vite build --base ./ < /dev/null) && node scripts/showcase/check-subpath.mjs apps/demo/dist
node scripts/showcase/server/serve.mjs apps/demo/dist 4890 <scratchpad>/stage-14/port.txt > <scratchpad>/stage-14/serve.log 2>&1 &
SERVE_PID=$!
until [ -s <scratchpad>/stage-14/port.txt ]; do sleep 1; done     # bounded: the server binds within a second
node "$T/demo/check-links.mjs" "http://127.0.0.1:$(cat <scratchpad>/stage-14/port.txt)" apps/demo/src/app/views/dev.ts apps/demo/dist
kill "$SERVE_PID"
```

Expected: `23 pages; root-absolute URLs: 0`; every Developer link, every `./`/`../` asset of each linked page and
`dev/../vent-hamilton.html` answer 200 (prototype: 18 links, 203 requests, 0 failed). Rebuild normally afterwards
(`npx -y pnpm@9.15.9 --filter @pme/demo build`).

- [ ] **Step 5: The test lists.**

```bash
sh "$T/list-tests.sh" <scratchpad>/stage-14/lists-t4
python3 "$T/compare_lists.py" <scratchpad>/stage-14/lists-base <scratchpad>/stage-14/lists-t4 "$W/map.tsv" "$W/titles/titles.json" "$T/data/demo-map.tsv"
```

Expected: as Task 2 Step 5, and `e2e.json: 106 -> 106` (merged launch tree) with the page renames; the 15 titles of
Step 1 appear as their own differences (read them; nothing else may differ).

- [ ] **Step 6: Commit and push.**

```bash
git add -A -- apps packages/controller/relay/README.md packages/skins/src/data
git checkout -- docs/gates
git commit -m "chore(demo): developer pages under apps/demo/dev/, five superseded pages removed (Stage 14 Task 4)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task 5: Engine environment reads, the stale expected failure, the CI slow groups, retries

> **Orchestrator note 2026-10-18 (after the CI-log rebuild):** the known-flaky list is now 28 tests / 30 active rows in
> `data/known-flaky.tsv` (evidence in `evidence/known-flaky-2026-10-18.md`), not the thirteen this task's text assumes; read
> the counts from the TSV. `task5_edits.py` exits 1 on a MISSING regex and `vent-embed` exists only once Stage 8b is merged, so
> Task 5 runs on a tree that contains the release. `fu11-vent-restore` [Chromium] is tagged by ruling (capacity, two
> retry-passes after FX-1). Step 6b (the second read of the decisions) is DONE: 1,586 read, 81 fixed, SHA256SUMS 329be5a9….


**Files:** Modify: `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts`, `apps/demo/e2e/app-instructor-tasks.e2e.ts`,
`packages/engine-core/test/engine/drug-layer-guards.test.ts`, `playwright.config.ts`, the e2e files of `data/known-flaky.tsv` (11 on the merged launch tree; tags),
`packages/engine-core/vite.config.ts`, `.github/workflows/ci.yml`, `docs/validation/known-misses.md`,
`docs/guides/known-deviations.md` (the stale row). Create: `packages/engine-core/test/engine/drug-layer-guards-csht.test.ts`.

**Measured CI times** (`ci/times.tsv`, `ci/proposal.md`; 14 complete runs 2026-10-10/11 incl. `main` 90c8ca7b run
38114676150; all 98 slow jobs passed):

| Group | Now median / max (min) | After median / max (min) | Moves |
|---|---|---|---|
| slow-a | 38.3 / 39.8 | 31.1 / 32.4 | out: resp-bronchodilation, resp-coupling, organs-htn |
| slow-b | 36.1 / 45.8 | 25.0 / 31.3 | out: insulin omission (712 s), KCl infusion (162 s); resp-suite stays (moving omission alone leaves 34 min) |
| slow-c | 33.7 / 36.4 | 29.9 / 32.3 | out: pk-acceptance-pd |
| slow-d | 35.5 / 38.7 | 29.9 / 32.5 | out: resp-induction, hemo-nibp |
| slow-e | 29.2 / 36.1 | 25.3 / 30.2 | drug-layer-guards split (1,503 s max → 717 s here + 786 s in slow-h); in: the NMB one-state test, resp-coupling |
| slow-f | 43.8 / 45.6 | 31.0 / 32.2 | out: drug-apnoea, the NMB one-state test |
| slow-g | 36.5 / 37.8 | 31.5 / 32.5 | out: insulin–dextrose |
| slow-h (new) | – | 21.8 / 27.7 | guards' context-sensitive offsets 786 s, insulin omission 712 s, KCl 162 s |
| slow-i (new) | – | 27.6 / 29.2 | drug-apnoea 543, insulin–dextrose 309, resp-induction 280, pk-acceptance-pd 244, resp-bronchodilation 216, hemo-nibp 91, organs-htn 44 |

- [ ] **Step 0: The known-flaky list, refreshed (Question 6 ruling).** `$T/data/known-flaky.tsv` holds every e2e test
  seen passing only on a retry in the harvest window (the 14 runs of `ci/e2e_retries.tsv` and c7d9b51c's push run
  38135947061), except `vent-view-restore` / `vent-view-speed` (a real WebKit restore defect: green, or the fixer id —
  Task 0 Step 1b): 13 tests. The six the prototype tagged were not chosen by a stated rule; on c7d9b51c two untagged
  tests passed only on a retry, so with six tags the PR would be red on known flakes. Refresh it from every push run on
  `main` since c7d9b51c and the last runs of the merged branches' PRs:

```bash
cp "$T/data/known-flaky.tsv" "$W/known-flaky.tsv"
for RUN in $(gh run list --workflow ci.yml --created '>=2026-10-11' --limit 30 --json databaseId,headBranch --jq '.[] | select(.headBranch == "main" or .headBranch == "fu-11-d" or (.headBranch | startswith("stage-1"))) | .databaseId'); do
  JOB=$(gh run view "$RUN" --json jobs --jq '.jobs[] | select(.name == "build") | .databaseId'); [ -n "$JOB" ] || continue
  gh run view "$RUN" --log --job "$JOB" > "<scratchpad>/stage-14/build-$RUN.log" < /dev/null 2>/dev/null || continue
  python3 "$T/ci/flaky_from_log.py" "<scratchpad>/stage-14/build-$RUN.log" | sed "s/^/$RUN\t/"
done | sort -u > <scratchpad>/stage-14/flaky-harvest.tsv; cat <scratchpad>/stage-14/flaky-harvest.tsv
```

  For each harvested test not matched by a regex in `$W/known-flaky.tsv` (and not the vent-view pair), append a row:
  `test\('<the title's stable prefix>(?:[^'\\]|\\.)*',<TAB>file:line<TAB>project run<TAB>R50 rule` (the regex must
  END at the title's closing quote and comma — the tag goes after it). List the additions in the gate note. ≤ 30 min.

- [ ] **Step 1: The edits.**

```bash
python3 "$T/task5_edits.py" "$W/known-flaky.tsv"
python3 "$T/ci_groups.py" "$W/map.tsv"
python3 "$T/ci/apply_ci_edit.py" .github/workflows/ci.yml
python3 "$T/task5_edits.py" "$W/known-flaky.tsv" | grep -vc '^already'        # idempotent: 0
```

Expected first run (merged launch tree): seventeen `applied` lines — a. `PME_VAG_*` → constants (`emax: 420, ec50: 4` fentanyl, `emax: 420,
ec50: 6` remifentanil: the defaults every run used); b. the conditional `test.fail(!GLOSSARY.find((e) => e.n ===
148)…)` and its three comment lines and the unused `GLOSSARY` import (entry 148 has had `keys: ["resp.mechanics.dp"]`
since the respiratory-mechanics model merged, so the call was `test.fail(false)`; `docs/gates/stage-9.md` records the
request as done); c. the guards split (the `it('context-sensitive offsets …')` block verbatim into the new file under
the same two describe titles); d. the CI JSON reporter; e. thirteen `@known-flaky` tags (the prototype's six:
`audit-worker` worker-failure cases, `respiratory-evidence-page` bronchospasm, `showcase-clock`,
`iife-transports-snapshot` snapshot/restore/role, `organs-page` check 19, `vent-link`; and seven the R50 review added
from the evidence: `app-one-session` deep link and learner controls, `explore-baseline` ×2, `vent-view-new-patient`,
`sound-toggle`, `return-here-restore`) — the second argument `{ tag: '@known-flaky' }`, titles unchanged. If Task 0
Step 1b got a fixer id for `vent-view-restore`, append ` (fixer item <id>)` to its WebKit skip reason by hand. Then
`ci_groups: nine slow groups written` (it also keeps the group header comment true: "NINE slow groups", "the other
eight") and the ci.yml edit (one `groups=` list for the check step, which also fails when a group is missing from the
matrix; the matrix gains `slow-h, slow-i` after `slow-g`, keeping stage-11's `showcase`; the test-slow job's history
sentence becomes "Nine file groups, one job each, packed on the per-file CI maximum …"; the e2e step below). No tool
writes a stage or ruling id (R50 review: four did).

The e2e step `apply_ci_edit.py` adds after `- run: pnpm test:e2e`:

```yaml
      - name: e2e tests that passed only on retry (fails unless the test is tagged @known-flaky)
        if: ${{ !cancelled() }}
        run: |
          f=playwright-report/e2e.json
          [ -f "$f" ] || { echo "no e2e JSON report"; exit 0; }
          jq -r '.. | objects | select(has("specs")) | .specs[] | . as $s | .tests[] | select(.status == "flaky")
            | "\(if ($s.tags | index("known-flaky")) then "known" else "new" end)\t\($s.file):\($s.line) [\(.projectName)] \($s.title)"' "$f" > "$RUNNER_TEMP/flaky.raw" \
            || { echo "::error title=e2e JSON report::playwright-report/e2e.json could not be read: the retry check cannot run"; exit 1; }
          sort -u "$RUNNER_TEMP/flaky.raw" > "$RUNNER_TEMP/flaky.tsv"
          { echo "### e2e tests that passed only on retry: $(wc -l < "$RUNNER_TEMP/flaky.tsv")"; sed -e 's/^known\t/- (@known-flaky) /' -e 's/^new\t/- **NEW** /' "$RUNNER_TEMP/flaky.tsv"; } >> "$GITHUB_STEP_SUMMARY"
          while IFS="$(printf '\t')" read -r k l; do echo "::warning title=e2e passed only on retry::$l"; done < "$RUNNER_TEMP/flaky.tsv"
          if grep -q '^new' "$RUNNER_TEMP/flaky.tsv"; then echo "::error title=e2e passed only on retry::a test without the @known-flaky tag passed only on retry: a retry is not a pass"; exit 1; fi
```

- [ ] **Step 2: The deviations pages lose the stale row.**

```bash
python3 scripts/import-audit.py --repo                                          # same counts as Task 3 Step 3
node --experimental-strip-types scripts/known-misses.ts < /dev/null            # known-misses: 152 misses
```

and delete the `app-instructor-tasks.e2e.ts` row ("ΔP (driving pressure) is published by …") from the first table of
`docs/guides/known-deviations.md` (the docs-honesty test does not require a row for a call that no longer exists).

- [ ] **Step 3: The groups, by Vitest's own matcher** (exactly what ci.yml checks).

```bash
cd packages/engine-core
for g in slow slow-a slow-b slow-c slow-d slow-e slow-f slow-g slow-h slow-i fast; do PME_TEST_SET=$g npx vitest list --filesOnly < /dev/null | sort > <scratchpad>/stage-14/$g.txt; echo "$g $(wc -l < <scratchpad>/stage-14/$g.txt)"; done
cd <scratchpad>/stage-14 && sort slow-[a-i].txt | uniq -d | wc -l && sort -u slow-[a-i].txt | diff slow.txt - && echo COVER-OK; cd -
```

Expected (90c8ca7b and the merged launch tree, R50 review): slow 128, a 14, b 20, c 20, d 32, e 12, f 10, g 10, h 3,
i 7, fast 325; `0`; `COVER-OK`. At the per-file CI maximum (`ci/times.tsv`, column `max_s` = the maximum of the 14 run
columns, checked row by row) these lists sum to a 32.4, b 31.3, c 32.3, d 32.5, e 30.2, f 32.2, g 32.5, h 27.7,
i 29.2 min.

- [ ] **Step 4: The same tests.**

```bash
cd "$(git rev-parse --show-toplevel)"
sh "$T/list-tests.sh" <scratchpad>/stage-14/lists-t5
python3 "$T/compare_lists.py" <scratchpad>/stage-14/lists-base <scratchpad>/stage-14/lists-t5 "$W/map.tsv" "$W/titles/titles.json" "$T/data/demo-map.tsv"
```

Expected: `engine-core-slow.json: 596 -> 596` with ONE difference: the context-sensitive-offsets test now in
`drug-layer-guards-csht.test.ts` under the same full name; the per-group files differ exactly by the moves in the
table (slow-h/slow-i are not compared: they did not exist before); `validation.json: 119 -> 124` only after Task 6
(the model-docs guard); `ventilator.json` 3 differences (the catalogue describe title and the two titles of the
Question 12 split); everything else as Task 4 Step 5 (R50 review: exactly this on the merged launch tree).

- [ ] **Step 5: Engine and e2e checks.**

```bash
git grep -n "process?.env\|process\.env" -- 'packages/engine-core/src' 'packages/renderer/src' 'packages/audio/src' 'packages/controller/src' 'packages/skins/src' 'packages/ventilator/src'   # expected: nothing
npx -y pnpm@9.15.9 typecheck
npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/pk < /dev/null
PW_SYSTEM_CHROME=1 npx playwright test --list --grep @known-flaky < /dev/null | tail -1     # 18 tests in 11 files (one project locally)
PW_SYSTEM_CHROME=1 npx playwright test apps/demo/e2e/app-instructor-tasks.e2e.ts --project=chrome < /dev/null
```

Expected: no env read; clean; PK unit tests pass; 18 tagged tests in 11 files (merged launch tree; more if Step 0 added
rows); the instructor-tasks test passes as a plain pass.

- [ ] **Step 6: The tsconfig types 8b added for the env read.** 8b's Decision 26 put `"types": ["node",
  "vite/client"]` into the six `tsconfig.build.json` because engine-core read `globalThis.process`. Leave them (other
  packages may read Node types; removing them is not this stage's); record in the gate note that engine-core no
  longer needs them.

- [ ] **Step 7: The CI step on a synthetic report, a real Playwright report and a real CI log.** Extract the step's
  `run:` text from `ci.yml` into `<scratchpad>/stage-14/flaky-step.sh` with `f=` pointing at a report and
  `RUNNER_TEMP`/`GITHUB_STEP_SUMMARY` set to scratch paths, and run it on:
  1. the synthetic report `{"suites":[{"title":"a.e2e.ts","specs":[{"file":"a.e2e.ts","line":3,"title":"x","tags":[],
     "tests":[{"status":"flaky","projectName":"chromium"}]},{"file":"b.e2e.ts","line":4,"title":"y","tags":["known-flaky"],
     "tests":[{"status":"flaky","projectName":"webkit"}]}]}]}` → exit 1 with one NEW line; with the first spec tagged too →
     exit 0;
  2. a truncated copy of it (`{"suites":[{"title":"x","specs":[`) → exit 1 ("could not be read": a broken report is
     never a pass — the prototype's step exited 0 here because `jq … | sort` hid jq's failure);
  3. the real CI log of Task 0 Step 1b, converted: `python3 "$T/ci/flaky_from_log.py" <scratchpad>/stage-14/build-main.log
     --report <scratchpad>/stage-14/real.json "$W/known-flaky.tsv"` → exit 0 with every retried test listed as
     `(@known-flaky)` (R50 review on c7d9b51c's run 38135947061: 2 listed, exit 0; with the prototype's six tags: exit 1,
     2 NEW).
  (R50 review also ran a real Playwright 1.63 JSON report — `retries: 2`, one tagged and one untagged test passing on
  a retry: the report writes `tags: ["known-flaky"]` without the `@`, which is what the step's `index("known-flaky")`
  reads; exit 1 with the untagged one NEW.)

- [ ] **Step 8: Commit and push; read the PR's CI.**

```bash
git add -A -- packages apps playwright.config.ts .github/workflows/ci.yml docs/validation docs/guides/known-deviations.md
git checkout -- docs/gates
git commit -m "ci: nine slow groups on the measured per-file maxima, a retry is not a pass; the engine reads no environment (Stage 14 Task 5)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

On the PR's CI run: every `slow-*` job ≤ 35 min, the check step green, and the e2e step's summary lists the tests
that passed on a retry. The vent-view pair (`vent-view-restore.e2e.ts`,
`vent-view-speed.e2e.ts`; a real WebKit restore defect that retries hid on 90c8ca7b's run 38114676150) is gated in
Task 0 Step 1b (green, or the fixer id): never tag them `@known-flaky`. Any other NEW line on the PR's CI is a test
that passed only on a retry and is not in the list: report it to the orchestrator with the run link; tag it only with
the orchestrator's go-ahead (the rule is that a retry is not a pass), and record it in the gate note.

### Task 6: Documentation by the model, the README

**Files:** Create: `scripts/model-docs.ts`, `packages/validation/test/model-docs.test.ts`, `docs/model/*.md` (22).
Modify: `README.md`, `docs/guides/physiology-overview.md`, `docs/guides/known-deviations.md`.

**Interfaces:**
- Consumes: `MODULES`, `ownerOfTest`, `ownerOfSource` (Task 3), `listMisses` (Task 3).
- Produces: `renderModelDocs(root): Map<path, text>` and the CLI `--check`; the guard test's five cases.

**The module pages** (`docs/model/<id>.md`, one per module, `README.md` the index): `patient-state`, `rhythms-ecg`,
`circulation`, `pressure-waveforms`, `lungs`, `gas-exchange`, `breathing`, `blood`, `organs` (brain, kidney,
liver), `endocrine-thermal`, `neuro` (depth, drive, neuromuscular block), `pharmacology`, `monitor` (device layer),
`alarms`, `defib-pacer`, `ventilator`, `engine-runtime`, `control`, `presentation`, `validation-harness`,
`integration` (the whole-patient scenario suites; owns no source). Each source directory belongs to one module (the
longest matching prefix); every engine and ventilator source file is owned.

Per page — **generated**: a counts line; **state** (every exported `…State` type, field by field, with its comment);
**parameters** (every exported numeric constant: value, unit, source/provenance tag, comment — the unit and source
from the comment or the section header above it); **relations** written as equations in code comments, with links;
**data rows** read at runtime (`STATE_SCHEMA`, drug rows, lung conditions, rhythms, circulation conditions, fluids);
exported functions with their doc comment (and those without one); source files with the first sentence of their
header; **known misses** (the module's rows of Task 3); **tests** (files, counts, expected failures, skips).
**Hand-written**, between `<!-- hand:purpose -->…<!-- /hand:purpose -->`, `hand:equations`, `hand:related`: copied
back verbatim on every run; a missing block is seeded once (purpose from the entry file's header comment, the others
"Not written yet."). Prototype: 6,512 lines, 230 of them hand seeds; 1,025 parameters (unit found 38 %, source 67 %);
727 state fields; 274 relations.

- [ ] **Step 1: Generate.**

```bash
cp "$T/model/model-docs.ts" scripts/ && cp "$T/model/model-docs.test.ts" packages/validation/test/
node --experimental-strip-types scripts/model-docs.ts < /dev/null                 # model-docs: 22 pages, 22 changed
node --experimental-strip-types scripts/model-docs.ts < /dev/null                 # model-docs: 22 pages, 0 changed
npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/model-docs.test.ts < /dev/null   # 5 passed
npx -y pnpm@9.15.9 --filter @pme/validation exec tsc -p tsconfig.json --noEmit < /dev/null
```

- [ ] **Step 2: The hand blocks you can write from the code now.** For `circulation`, `lungs`, `blood`,
  `pharmacology` and `rhythms-ecg`, replace the seeded `purpose` with two or three sentences on what the module
  computes and for whom (the reader is a clinician-educator or an embedding developer), and `equations` with the
  model's governing relations in words, each sentence citing the code (`file.ts`) or a source already cited in that
  code; nothing that is not in the code. ≤ 20 min per page.

- [ ] **Step 2b: Draft the other 16 pages' hand blocks (Question 9, RULED 2026-10-11).** For every other page with a
  seeded `purpose` or "Not written yet." `equations` (`patient-state`, `pressure-waveforms`, `gas-exchange`,
  `breathing`, `organs`, `endocrine-thermal`, `neuro`, `monitor`, `alarms`, `defib-pacer`, `ventilator`,
  `engine-runtime`, `control`, `presentation`, `validation-harness`, `integration`): draft both blocks the same way,
  from the module's source comments and `docs/physiology/*.md` only, and start each block with the line
  `> Draft — owner review pending.` **Time bound: ≤ 10 min per page, 3 h in all; a page not reached keeps its seed and
  is listed in the gate note.** Then re-run Step 1's second line (`0 changed` except the edited pages) and the guard
  test.

- [ ] **Step 3: The README and 8b's two pages.**

```bash
python3 "$T/post8b_docs.py" "$T"
python3 "$T/post8b_docs.py" "$T"        # idempotent: README.md already / … already / … already
npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/docs-honesty.test.ts test/docs-examples.test.ts < /dev/null
grep -rniE "validat|60601|diagnos" README.md docs/model/README.md | head -20
```

Expected: `README.md written`, `docs/guides/physiology-overview.md written`, `docs/guides/known-deviations.md
written`, then three `already` (a README merge conflict stops the script: resolve it by hand, keeping 8b's wording
where 8b deviated from its plan, and list it in the gate note); both tests green; read every grep hit (each is negated or is "the validation
harness"). What the script does:
- `README.md`: a three-way merge (`git merge-file`) of the README as 8b merged it, 8b's PLANNED README
  (`$T/model/README.8b-plan.md`, the base this stage's text was written against) and `$T/model/README.stage14.md`
  (below): what 8b's executor filled (the app's view names) or wrote differently from its plan is kept, this stage's
  changes are applied; a conflict or a remaining `FILL:` stops it. (The prototype REPLACED the README and carried only
  the app bullet over: any other 8b deviation would have been lost silently. R50 review: tested on a simulated 8b
  README with an extra line — kept; second run `already`.)
- `physiology-overview.md`: section headings lose "(Stage 7a)", "(Stage 3, 7b, V, V.1)", "(FU-4)" and "Later
  follow-ups (FU-5 …)" becomes "Later changes"; each organ section gains `Details: [docs/model/<id>.md](…)`.
- `known-deviations.md`: one sentence after the first paragraph linking `../validation/known-misses.md`.

The README this stage ships (`model/README.stage14.md`; diff against 8b's Task 10 text in
`model/README.stage14.diff`): 8b's sections are kept ("What it is", "What it is not" with the owner's known
limitations, the licence section, the roadmap link); "Quick start" becomes **"Embed it"** (the IIFE snippet, an ESM
`mountMonitor` snippet, headless `createEngine`, the ventilator embed); "Build from source" becomes **"Run it"** (with
the two regenerate commands); a new section **"The model"** points at `docs/model/` and says which parts are generated
and checked by a test; the documentation list and "What it is not" link the known-miss index; the hard-coded drug
count is replaced by a link to the pharmacology page. Its text, in full, is the file `model/README.stage14.md`
(138 lines, checksummed in `SHA256SUMS`).

- [ ] **Step 4: Commit and push.**

```bash
git add -- scripts/model-docs.ts packages/validation/test/model-docs.test.ts docs/model README.md docs/guides/physiology-overview.md docs/guides/known-deviations.md
git commit -m "docs: the model documented by module (generated, guarded by a test); README after the release candidate (Stage 14 Task 6)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task 7: Gate — full verification, gate note, PR ready (no merge)

**Files:** Create `docs/gates/stage-14.md`.

- [ ] **Step 1: Local gate** (in the background, bounded waits).

```bash
npx -y pnpm@9.15.9 typecheck \
 && PME_TEST_SET=fast npx -y pnpm@9.15.9 test \
 && npx -y pnpm@9.15.9 build \
 && npx -y pnpm@9.15.9 check-notices && npx -y pnpm@9.15.9 check-licences && npx -y pnpm@9.15.9 check-size \
 && node --experimental-strip-types scripts/model-docs.ts --check && node --experimental-strip-types scripts/known-misses.ts --check \
 && PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 test:e2e
```

Expected: all green (R50 review: `pnpm typecheck` clean on the merged launch tree after Tasks 1–6); `check-size` reports the IIFE ≤ 400 KB gzip -9 and within a few hundred bytes of 8b's figure
(comments are minified away; the env reads go: −258 B gzip on 90c8ca7b without 8b). The slow engine set is run by
CI's nine `slow-*` jobs (its content is unchanged except the split); locally run only `PME_TEST_SET=slow-h` (≈ 25 min
locally under load: the split file and the two moved files) in the background.

- [ ] **Step 2: The kit rehearsal is unchanged.** Follow `docs/showcase/KIT-GATE.md` "Redo the kit on a NEW main"
  with `W` = this worktree instead of a detached `main` (skip `make-videos.mjs`), and compare
  `docs/showcase/results/*.json` with the copies on `main`: every check passes and every number is identical or
  within the run-to-run spread the kit gate note states. Restore `docs/showcase/results/` and `docs/gates/` before
  committing (`git checkout -- docs/showcase docs/gates`): the kit evidence is not this stage's.

- [ ] **Step 3: CI.** The PR's last run: build (Chromium + WebKit e2e, the check step), the nine `slow-*` jobs (each
  ≤ 35 min; record the times), `validate` untouched. The e2e "passed only on retry" step: record its list. If it is
  red only for the two vent-view tests of Task 5 Step 8, state it and leave the decision to the orchestrator.

- [ ] **Step 4: Gate note `docs/gates/stage-14.md`:** launch commit; the before/after table of this plan
  re-measured on the branch (Task 1 Step 1/5 counts, stage-named files 0, titles naming history 0, known misses,
  README lines, pages, model pages, groups); every decision written at execution (Task 1 Step 3, Task 2 Steps 1–2)
  with its key; the rename residuals left and why; the CI times per group; the retry list; the kit comparison; the
  pages of `docs/model/` whose hand blocks are still seeds or drafts; anything held (Task 0 Step 4); the known-flaky
  additions of Task 5 Step 0 and the vent-view gate evidence of Task 0 Step 1b; the PR reviewer's `lost-facts.tsv`
  sample result.

- [ ] **Step 5: Commit, push, PR ready** — only after the owner has confirmed the publication of the target audit
  (Question 7, "RULED, owner to confirm"); without that confirmation, leave the PR as a draft and report.

```bash
git add -- docs/gates/stage-14.md && git commit -m "docs(gate): Stage 14 clean-up

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
gh pr ready
```

Never merge; the orchestrator merges.

---

## Questions for the owner — all RULED 2026-10-11 (orchestrator; R50 review applied them)

1. **Known misses on two pages** (the generated per-module index and 8b's release page with "Tracked in"), linked both
   ways — or merge them? **RULED 2026-10-11: ACCEPTED — two pages linked both ways; 8b's honesty test is not edited.**
2. **One title form for every `it.fails`** (`<scenario>: <band> (<source>) — measured <value>`)? **RULED 2026-10-11:
   YES, but as a separate wording-only follow-up after this stage (FU-12 candidate, see "Deferred"), not in Stage 14.**
3. **Demo pages.** **RULED 2026-10-11: keep `stage5` → `dev/rhythm-library` and `stage7c` → `dev/blood-acid-base`.
   `fu4`: retire it with its e2e only if the app e2e covers the same assertions, otherwise keep it as
   `dev/arrest-evidence` — the R50 review read both: `app-tamponade-propofol.e2e.ts` (was `stage9-events.e2e.ts`)
   asserts SV < 6 mL within 5 sim-min of an immediate propofol dose in the app's default adult, whose SV floor is
   5.2 mL; `fu4.e2e.ts` asserts the fu4 rule (a pulseless rhythm or SV < 5 mL for 5 `circ` events) within 16 sim-min
   after a 10-minute tamponade lead-in on its ventilated rig, the PULSELESS log line and no page errors — NOT the same
   assertions, so `fu4` is KEPT as `dev/arrest-evidence` with its e2e. Delete the five (`stage0–3`, `stage7b`).
   Re-word the pages' `<title>`s and the Developer view's heading ("Developer pages"), same scripts** (Task 4 Step 1,
   `page_titles.py`).
4. **Comment scope.** **RULED 2026-10-11: run the inventory on the extended globs; ≤ 150 blocks → extend to all of
   them; larger → extend to `apps/demo/src` and the config files only and defer test-file comments to v2.0 with the
   count recorded.** Measured by the R50 review (merged launch tree, fixed parser): apps/demo/src + config files 418
   history blocks; `scripts/` 37; test files 863 (1,310 lines in 425 files) → larger than 150: this stage covers
   `packages/*/src`, `apps/demo/src` (its colocated tests included, as the ruling names the directory) and the
   `*.config.ts` files; test-file and `scripts/` comments are deferred (see "Deferred").
5. **Domain names.** **RULED 2026-10-11: `docs/physiology/stage-7-parameter-tables.md` → `docs/physiology/parameter-tables.md`
   (the folder already says physiology). `vent-lung-pathology-data.md`: ACCEPTED. `-page` suffix for developer-page
   e2e files: ACCEPTED. `s5/` + `s51/` → `test/l2/ecg/rhythms/`: ACCEPTED. FU-11 validation tests →
   `packages/validation/test/invalid-results/`: ACCEPTED. Everything else in the maps: ACCEPTED unless the review
   finds a name that misstates content** (the R50 review found none; it added the five showcase rows of Question 11
   and `scripts/showcase/s10-time.showcase.ts` → `time-control.showcase.ts`).
6. **Retries.** **RULED 2026-10-11: keep "passed only on retry fails CI unless `@known-flaky`" with retries 2.
   `vent-view-restore` and `vent-view-speed` on WebKit are a real restore defect already queued as a fixer item before
   this stage; Task 0's launch gate requires them green on main or tagged with the fixer item's id. Do not use
   `retries: 0` per file. PR #49 adds two WebKit-only skips under finding F-49-1 (follower exactness); skips are not
   flakes and need no tag.** (Task 0 Step 1b; the tag list is `data/known-flaky.tsv`, Task 5 Step 0.)
7. **`research/NN` citations.** **RULED 2026-10-11, OWNER TO CONFIRM: publish the target audit
   (`research/30-target-audit.md`, its CSV, `research/30-parts/99-synthesis.md`) into the repository under
   `docs/validation/target-audit/` as part of Task 3, so the index links its evidence row by row. Other `research/NN`
   citations stay as plain text with one sentence on the index page saying the numbered evidence notes live in the
   project's research folder outside the repository.** (Task 3 Step 3, `publish_audit.py`; the owner confirms the
   publication before the PR is marked ready — Task 7 Step 5.)
8. **Nine slow groups.** **RULED 2026-10-11: ACCEPTED.**
9. **`docs/model` granularity, guard, hand blocks.** **RULED 2026-10-11: 21 pages and the fast-set guard ACCEPTED. The
   executor drafts the `purpose` and `equations` hand blocks of the 16 seed pages from the comments and the physiology
   documents, each marked "draft — owner review pending"; budgeted as a step with a time bound** (Task 6 Step 2b).
10. **Value histories in titles and comments.** **RULED 2026-10-11: AGREED** (removed unless the old value explains
    the code, then kept as a reason without the stage name).
11. **Stage 11's showcase tests.** **RULED 2026-10-11: rename to scenario names: YES** (`data/map-task2.tsv`:
    `malignant-hyperthermia`, `stab-wound-tamponade`, `healthy-induction`, `induction-after-premedication`,
    `haemorrhage-anaphylaxis`, each keeping `.slow.test.ts` so the `showcase` set's glob still matches).
12. **The conditional expected failure in `link-parity.test.ts`.** **RULED 2026-10-11: split into a literal `it` and a
    literal `it.fails` with identical assertions; the reviewer confirms no outcome changes. Allowed as a
    structure-only test change.** (Task 3 Step 1, `split_link_parity.py`.) R50 review: the split file ran on the merged
    tree — `healthy` passes, the bronchospasm `it.fails` passes (its body fails), 2 tests, same outcome as the
    conditional form; the logged per-time-point values were identical in both runs.
13. **The audit's proposed bands.** **RULED 2026-10-11: no band changes in this stage (R45). The index shows the
    verdict and proposed band; rulings come in the calibration pass after the rc; a ruled band re-keys the audit by
    re-running `import_audit.py` on the ruling's commit** (in the repository: `python3 scripts/import-audit.py --repo`
    after the ruling's commit, Task 3 "When the audit changes").

## Deferred (recorded, not in this stage)

- **FU-12 candidate — one title form for every `it.fails`** (Question 2): `<scenario>: <band> (<source>) — measured
  <value>`, wording only; lifts the index's parse rates (13 titles without "measured", 94 without a readable source).
- **v2.0 — history in test-file comments** (Question 4): 863 history-bearing blocks (1,310 lines) in 425 files under
  `packages/*/test` and `apps/demo/e2e` (classes a 14, b 518, m 258, c 73; measured on the merged launch tree, fixed
  parser); and in `scripts/`: 37 blocks (75 lines) in 31 files. The same tools run on any glob
  (`comments.ts '<glob>' …`, `same-code.ts HEAD '<glob>' …`).
- **Title ids the rewriter does not detect** (R50 review, L3): engine titles carrying `(A1)`, `(A5)`, `(F2)`, `(F3)`,
  `(F7)`, `(D2)`, `(D5)`, `(G3)` — `fidelity-lowflow`, `baroreflex`, `neuro-engine`, `resp-suite` (2), `breath`,
  `volumes`, `opioids` (2), `alarms/manager` (2). Task 2 Step 2b reads them; an id the executor cannot place as an
  acceptance or table id is left and listed in the gate note.

## What the prototype could not do mechanically

(R50 review, 2026-10-11: the decisions for the pending stages' new blocks and titles, for the Question 4 scope and for
the blocks the old parser missed are now written — 232 comment and 5 title decisions; the "Tracked in" cell of the
link-parity row is given in Task 3 Step 2; the README partition is a merge, not a replacement; the audit join's
override path is concrete and in the repository. What remains judgement at execution: blocks a branch changes after
2026-10-11 (Task 1 Step 3, bounded), the hand blocks (Task 6 Steps 2–2b, bounded), the title ids of Task 2 Step 2b.)

- **The rewrites of 338 m and 23 c comment blocks, 555 corrections of a/b proposals and 436 title re-wordings** needed
  judgement: they were written by four comment reviewers and one title reviewer (model agents) under
  `data/REVIEW-RULES.md` and are applied mechanically from `data/comment-decisions.json` and
  `data/title-decisions.json`. Judgement calls they flagged as uncertain (e.g. `D12`/`D14` kept as annex rows, `Q3`
  dropped as an owner question, "Stage 3's own writes" → "the respiratory signals' own writes", a stale claim in
  `ventilator/link/profiles.ts` about a PE profile's PVR) are in `evidence/` notes and are the reviewer's sample.
- **30 rename residuals** — old names in prose, log prefixes (`[fu5-latched …]`), a screenshot output name and a
  `repo/docs/…` path in the Pulse annex — are left (`evidence/rename-residuals.txt`).
- **Names for new files** added by stages merged after 90c8ca7b beyond the 18 pending rows, and decisions for their new
  history comments and titles (Task 1 Step 3, Task 2 Steps 1–2).
- **The model pages' purpose and equations in words** (seeded from comments), units for 62 % of the parameters (stated
  only in prose), sources for 62 % of the known-miss titles.
- **8b's pages:** the "Tracked in" cell of the new `.fails.each` row, the README's prose, the physiology overview's
  section mapping to model pages (written as a table in `post8b_docs.py`).
- **The audit join for tests the merged stages change** after `26e78308` (an `unmatched` row needs a hand override)
  and the conditional `it.fails` in `link-parity.test.ts` (recorded as `unlisted`).
- **CI times** of the nine groups and the e2e step on a real CI report (only projected and synthetic); the slow engine
  set was listed, not run.

## Prototype final checks (the `run_all.sh` tree, 2026-10-11)

On the tree `run_all.sh` produced from a clean 90c8ca7b (with the recreated 8b lister in place; re-run after the audit join was added — typecheck, the fast suite and `check-notices` green again with the same counts):
`npx -y pnpm@9.15.9 typecheck` clean; `PME_TEST_SET=fast npx -y pnpm@9.15.9 test` green — audio 65, skins 191,
engine-core 1,419 + 1 skipped, controller 248, ventilator 103, renderer 96, validation 124 + 11 skipped (+5: the
model-docs guard), demo 204 (the same counts as on `main`); `npx -y pnpm@9.15.9 build` clean; `check-notices: OK (3
governed files)`; e2e on system Chrome, `app-instructor-tasks`, `organs-page`, `drug-pkpd-page`,
`pacer-overlay-device-tab`, `skins-page`, `controller-pages`: 9 passed, 2 skipped (PME_SHOTS-only and one transport
the file skips locally) in 7.3 min. The slow engine set was listed (Task 5 Step 3), not run. The executor re-measures
everything in Task 7.

## Self-review

1. **Brief coverage:** item 1 → Task 1 (inventory, a/b/c with m, per-file counts, review table, executor applies the
   table); item 2 → Task 2 (rename map with `git mv` and reference rewrites; titles re-worded, numbers kept); item 3 →
   Task 3 (generated index, titles only; plus the orchestrator's addition: each row's audit verdict and proposed band,
   keyed by test file and title, and how the index is regenerated when the audit changes); item 4 → Task 4 (27 non-app pages classified, coverage lost listed, index
   page = `dev.ts` + `vite.config.ts`); item 5 → Task 5 (env constants, stale `test.fail`, guards split, slow-b and
   slow-f rebalanced against 35 min from CI logs, the retries ruling); item 6 → Task 6 (`docs/model/` generated,
   building on 8b's lister; README after 8b, dependency stated); item 7 → "Partition and ordering"; deliverables →
   tasks with scripts and tests, gate (Task 7: suites both browsers via CI, kit rehearsal, `check-notices`, size),
   questions, before/after counts.
2. **Placeholders:** the only open texts are the decisions an executor writes for blocks that do not exist on the
   merged launch tree of 2026-10-11 (bounded by the printed "unreviewed" counts and the budgets of Task 1 Step 3 and
   Task 2 Step 2) and the hand blocks of Task 6 Steps 2–2b (time-bounded).
3. **Names:** `$T`, `$W`, `map.tsv`, `titles.json`, `rewrites.json`, `hold.txt` are used with the same meaning in
   every task; `ownerOfTest`, `MODULES`, `listMisses` match the scripts in `model/`.
4. **Review focus:** each of the five lines is pinned to a step (globs/sets → Task 2 Steps 4–5; lost facts → Task 1
   Steps 4–6; honesty → Task 2 Step 3 and Task 3 Step 2; URLs → Task 4 Step 4; retries → Task 5 Step 7).
