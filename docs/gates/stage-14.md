# Gate note: Stage 14, clean-up (history out of the code, documentation by the model)

Plan: `docs/plans/stage-14-cleanup.md` (REVIEWED-FIXED, R50; second read of the decisions done 2026-10-18: 1,586 read,
81 fixed). Branch `stage-14` from `origin/main` 16b5c93e (PR #72 merged, after the `v1.0.0-rc.1` tag on 3db25a3b). PR
#74. Executor: Claude (Opus), 2026-10-18. Tools: `scratch/plans-backup/stage-14-plan-tools/`; `SHA256SUMS` verified
OK, the file itself hashing `2d40e1d3…` (after the second read and the known-flaky rebuild). The tools were run from a
copy; its differences are in `stage-14/tool-fixes.diff` (see "Tool fixes").

## Launch gate (Task 0)

- `v1.0.0-rc.1` → 3db25a3b; `stage-8b` (PR #66), `stage-10`, `stage-11`, `stage-12`, `stage-13`, `fu-11-d` are
  ancestors of `origin/main` (the plan's `stage-8b-release` is named `stage-8b`); the four 8b files exist. Hold list
  empty.
- Branch name: the plan names the branch `stage-14-cleanup` (`docs/plans/stage-14-cleanup.md:47,326`). The branch
  used is `stage-14`, as the orchestrator's brief says, and it is the PR's head. The worktree is
  `scratch/wt-stage-14`, as the plan says.
- Vent-view gate (Question 6), from the e2e jobs (the e2e now runs in per-browser jobs, not in `build`): on the launch
  commit's push run 39112120136 and on 3db25a3b's 39102881541, `vent-view-speed` [webkit] ✓ on the first attempt;
  `vent-view-restore` [webkit] is skipped on CI by the skip that names its fixer finding, F-FX1-1 (nothing appended).
  Retry-passes on those runs: `scenario-choose-another` (39112120136); `showcase-clock`, `stage13-debrief` [webkit]
  (39102881541). All three are in the known-flaky list.
- Baseline on 16b5c93e: typecheck clean; fast suite green: audio 65, skins 191, engine-core 1,431 + 1 skipped,
  controller 284, ventilator 113, renderer 110, validation 141 + 11 skipped, demo 299.

## Measured before and after (re-measured on the branch)

| Measure | Launch tree 16b5c93e | After this stage |
|---|---|---|
| History references in source comments (Task 1 scope) | 3,872 lines in 410 files; lines a 391, b 2,552, m 726, c 61, k 142; blocks a 391, b 2,257, m 442, c 29, k 127 | 212 lines in 112 files: a 0, b 7, m 5, c 0, k 200 (the 12 b/m are facts, below), as counted by `rewrite.py`'s `DETECT` (`rewrite.py:45`), which misses some history (see below) |
| Files named after a stage (the Task 2 Step 1 pattern) | 291 paths | 0 |
| Test titles naming the history | 939 in 471 files (84 `it.fails`) + 15 e2e page/finding titles + 10 engine titles with review ids | 5: three false positives (acceptance rows "7.", "7b.", the D50 dose), annex D14, and `docs honesty (Stage 8b)` (left, see "Open") |
| Expected failures | 150 `it.fails` + 1 `it.fails.each` + 1 conditional `it.fails` + 1 stale conditional `test.fail` | 152 (151 `it.fails` + 1 `it.fails.each`), all read by the lister and in `docs/validation/known-misses.md` by module |
| Known-miss index | none | 152 misses; target recognised 145, measured 141, source 56; audit verdict on all 152: RIGHT 30, TOO NARROW 28, TOO WIDE 3, MIS-SPECIFIED 63, UNSUPPORTED 28; 0 "not audited"; 57 audited rows elsewhere |
| Engine source (`packages/engine-core/src`) | 205 files, 26,557 lines | 205 files, 26,635 lines (re-wrapped comments) |
| README | 127 lines | 152 lines ("Embed it", "Run it", "The model") |
| Demo pages | 28 at `apps/demo/` | 23: index + 4 app pages (paths unchanged) + 18 in `apps/demo/dev/`; 5 deleted |
| Model documentation | none | `docs/model/`: 22 pages (21 modules + index), 7,215 lines; hand blocks: 5 full, 16 drafts |
| CI slow groups | 7 + showcase | 9 + showcase; CI job times below |
| IIFE `patient-monitor.iife.js` | — | 676.9 KB raw, 282.0 KB gzip -9 (budget 400 KB) |

## Task 1: comments

- `rewrite.py` on the launch tree: 29 blocks were unreviewed (4 m, 25 a/b). That was more than the plan measured,
  because PRs #58–#72 and the release added them, and it was under the 60-block cap. 7 decisions were written and 23
  proposals read and accepted. Every key is in `stage-14/decisions-at-execution.json`:
  - written: `d37900736922` (pairing.ts), `4b92d6e62fe4` (physiology-console/view.ts), `e0d2b9504ffa` (the depth tile,
    `dev/drug-pkpd.ts` after Task 4), `5ff722b71891` (vent/embed.ts), `5c9c0c64f639` (engine-core version.ts),
    `ea5011bf9da6` (renderer vite.config.ts), `d82af3b7d748` (controller scenario/types.ts, re-wrapped to 120 columns);
  - accepted: b14119e5e508, a05bbf695d19, b9cae440708a, 527df3d2a75b, f2e95c2a7fd1, 47a47ab56e85, ca418b363139,
    ec5f4dcb62a9, 4ee8b0b7638d, ad481071297a, 3e47c388ae2c, f0c7cdf2cb32, f5740170c21b, 0a98970d58a2, 064a15bec103,
    d7839de9e984, 0c0d4722db56, c285741c69d8, 36f7acbae34f, 0cfa8debb750, b0952e38e670, 038183b9ad2c, db3368121d90.
- Applied: a 391, b 2,254, m 441, c 29 blocks in 391 files; `same-code: 391 changed files, 0 with a code change`.
- The 12 b/m left are read and kept as facts: annex D14 (`blood/params.ts`, `oracle/blood-scenarios.ts` ×2), the D50
  dextrose, the `R03`/`M10` legends of the drug rows (×2), D12 (`renal/params.ts`), the oracle O-ids, the engine's
  "arrives in Stage 7" message (`segments/run.ts`), the `requires: ["7a", "7g"]` example (`segments/types.ts`), the
  PTB-XL gate path, and the `wired` values `'stage7a'`/`'stage7b'` in `ventilator/pathology/catalogue.ts` (data
  strings in the code; the `research/20 gap V1` row of the plan's list is now class k).
- Evidence: `stage-14/{comment-rewrites.tsv,per-file.tsv,summary.txt,inventory.tsv,lost-facts.tsv}` (281 lost-fact
  rows) and the second read, `stage-14/second-read.tsv` + `second-read-summary.md`.
- **The PR reviewer's sample (Task 7 Step 4; gate review of 2026-10-18, `scratch/plans-backup/stage-14-gate-review.md`,
  read-only, seeded `random.Random` samples):**

  | Sample | Sampled | FAIL |
  |---|---|---|
  | script-decided b rows of `comment-rewrites.tsv` | 50 | 0 |
  | m and c rows | 25 | 1 |
  | `lost-facts.tsv` rows | 30 | 0 |
  | renamed test titles | 30 | 0 |
  | `same-code` files (20 of them also by an independent token-stream check) | 391 | 0 |
  | numbers on the model pages, against the cited declarations | 21 | 0 |

  The one FAIL was fixed here. The rewrite of `l3/nibp/nibp.ts:48` (key `f44b3a1a03e1`, class m) said "neonatal 85 s
  in the skin data", which is false: the skins' `"neo": 85` is the neonatal initial inflation in mmHg, and the 85 s
  neonatal safety deflate is only in the design brief §4.5, not modelled. It now reads "neonatal 85 s (brief §4.5) is
  not modelled" (`decisions-at-execution.json`; `same-code`: 1 file, 0 code changes; `model-docs`: 0 pages changed).
  The reviewer's MINOR items and its other non-blocking notes are queued separately by the orchestrator.
- **What the history count misses.** The 212 lines left come from `rewrite.py`'s `DETECT` regex (`rewrite.py:45`),
  which matches neither `Stage V`, `V.1` nor `E-<x>-<n>` ids, although `data/REVIEW-RULES.md` calls them history. The
  gate review counted, in the Task 1 scope (test files excluded): about 43 lines with `Stage V(.1)`, 14 lines with
  `E-…-n` ids (for example `E-S9-5`, `E-4a-3`), and 12 lines of "7x's" that the inventory classed k. They are left for
  a follow-up decision pass with the same `same-code` proof (see "Open").
- Task 6 changed two more comments, outside the decision file. This follows the public-text rule ("a later release",
  never a next-version number), because the model pages quote these comments: `l2/lung/params.ts` and
  `l2/lung/volumes.ts` now say "a later release" where they named the next minor version. `same-code`: 2 files, 0
  code changes.

## Task 2: titles and file names

- `titles.py`: 939 titles in 471 files, b 939, m 0, dup 0, 84 `it.fails`. 4 new b were unreviewed. 2 decisions were
  written: `20b277356ea4` (showcase-cards, the proposal kept "E22") and `ee797c91f230` (left unchanged, see "Open").
  2 were accepted: `56e52728aa1f`, `93b7a64afc35`.
- Step 2b (title ids the rewriter does not see): all 10 ids came with a follow-up, review or plan-deviation commit, so
  they are history and were removed by hand. They are (A1) `fidelity-lowflow` (FU-5), (F2) `neuro-engine` (a finding
  in the neuro plan), (F2) `resp-suite` RS7c (FU-6), (A5) `baroreflex` (an audit finding), (F7) `breath` and (F3)
  `volumes` (7k review rulings), (D5) and (D2) `opioids` (deviations of the drug plan), and (G3) ×2 `alarms/manager`
  (FU-11, owner ruling). None of them is an expected failure.
- `update_deviations_page.py`: 82 title copies. `expand_globs`: 6 lines. `rename.py`: 222 moved, 127 files with
  rewritten references, 37 residuals in 23 files. One residual was a path and was fixed by hand: the KIT-GATE command
  `npx playwright test s12-mobile-learner` became `mobile-learner`. The rest were left as they are: Task 4's demo
  files, prose ("the fu9 tests", "stage6a-worker on CI"), log prefixes (`[fu5-latched …]`, `issuedBy: 'fu7'`),
  screenshot names, scenario bookmark ids (`target: 'fu11'`), and the Pulse annex's `repo/docs/…` path.
- `compare_lists`: every set the same, except the 7 titles that cite `rhythms/stemi.test.ts`, the catalogue describe
  title, and the 10 Step 2b titles.

## Task 3: the known-miss index

- `patch_deviations`: applied ×3. The split of `link-parity.test.ts`: 2 passed, the same outcome as the conditional
  form. Lister: 153 expected failures, 1 skipped, no unreadable title.
- 8b's page already listed the link-parity bronchospasm row by hand, with a description in place of the title, so its
  row was replaced with the exact title. "Tracked in" became `docs/gates/fu-6.md` §2 + audit row 110. The
  `.fails.each` row was added, tracked in `docs/gates/fu-7.1-b.md` §5 + audit row 181; no existing row tracked the CPR
  EtCO2 floor. The page's count paragraph was updated.
- `publish_audit`: 209 row anchors. `import_audit`: 209 rows; fails 153, list 11, passing 2, queue 43; matched 152,
  not-a-test 56, now-passing 1. `--repo` re-run identical. Drift check: fails on a changed title ("rows 1 …"), passes
  when restored.

## Task 4: developer pages

- `apply.py`: 65 moved, 12 deleted, no absent rows; 8b retired no page (`docs/gates/stage-8b/developer-pages.md`).
  `page_titles`: 15 titles, 18 page `<title>`s, dev.ts.
- Fixed by hand: two guides written by 8b named old pages. `scenario-authoring.md` now says `dev/scenario-runner.html`
  and `skin-authoring.md` says `apps/demo/dev/skins.html`.
- The demo typecheck is clean and 18 dev pages build. A demo-only build first needs the renderer IIFE (8b's embed
  step); `pnpm build` gives it. Demo 319 tests pass, skins 191. Targeted e2e (Chrome): 12 passed, 2 skipped
  (PME_SHOTS). Kit-style build: 23 pages, root-absolute URLs 0, 18 dev.ts links, 223 requests, 0 failed.

## Task 5: environment reads, the stale `test.fail`, CI groups, retries

- `task5_edits`: a (the `PME_VAG_*` constants 420/4/6), b (the stale `test.fail` with its import and comment), c (the
  guards split), and e, the tags. Re-run: 0 not-`already`. **Known-flaky count: 30 tests / 32 active rows** (the
  plan's 13, then 28 / 30 in the 2026-10-18 rebuild; with the two rulings below).
- **Known-flaky additions (Step 0):** the harvest of runs 39084185298, 39085161540, 39086039836, 39087281170,
  39089625691, 39102881541 and 39112120136 found only tests that are already listed. Orchestrator ruling 2026-10-18:
  `vent-view-restore.e2e.ts:42` [chromium] is now TAGGED (class capacity; two retry-passes after FX-1, 38377803966 and
  39065636299). Its WebKit row stays a CI-only skip. The F-FX1-1 class text ("Linux WebKit (WPE, Playwright webkit
  2359) web-process crash: ThreadedCompositor segfault …; covered by retries") is in that row and in the skip row of
  `known-deviations.md`. Orchestrator ruling 2026-10-18, after the PR's CI: `pacer-overlay-device-tab.e2e.ts:34`
  [webkit] "TCP pace marks drawn as overlays on a pacer skin" is TAGGED. Its old title was "R-51-1: TCP pace marks …"
  and its old file `fu1.e2e.ts`. It is in the crash class (the F-FX1-1 Playwright Linux WebKit compositor crash,
  signature "Target page, context or browser has been closed"). The evidence is run 39116455633, commit d3289122. One
  proven platform defect is enough, because the two-occurrence rule does not apply to the crash class. The TSV used,
  with both rulings, is `stage-14/known-flaky.tsv`. The tools folder in `scratch/plans-backup/` is unchanged, since
  its checksums cover it; the row is in the executor's copy and in this TSV.
- `ci_groups`: nine groups. Vitest's own lists: slow 128 = 14 + 20 + 20 + 32 + 12 + 10 + 10 + 3 + 7; 0 in two groups;
  COVER-OK; fast 325. `compare_lists`: slow 596 → 596, with the one moved test (guards → `-csht`) and the 3 Step 2b
  titles.
- The CI step was tested on a synthetic report (one untagged: exit 1, one NEW line; both tagged: exit 0), on a
  truncated report (exit 1, "could not be read") and on the real logs of 39102881541, 39085161540 and 39089625691,
  converted (exit 0, every retry tagged).
- `known-deviations.md`: the stale `test.fail` row is gone. The browser-test file names and titles that Task 4 changed
  were updated by hand: `organs-page`, `respiratory-evidence-page`, `device-layer-page`, `arrest-evidence-page`,
  `endocrine-thermal-page` and `controller-pages`, the titles without (K3)/(D5)/(D3)/(F03–F05, F09), and the
  `app-instructor-tasks` skip at :25. "Its report is not yet in this repository" now links the published audit.
- **One environment read is left in the shipped engine:** `l2/ecg/rhythm-engine.ts` `nonFiniteIsLoud()` reads
  `process.env.NODE_ENV === 'test'`. It makes a non-finite scheduled time throw in tests and clamp elsewhere. It
  predates the plan, and changing it would change test behaviour, so it is not changed here (see "Open").
  **Correction:** the plan's Goal (which the PR body quoted) and the Task 5 commit headline (4948e355, prescribed by
  the plan) both say "the shipped engine reads no environment". That is not true. The two `PME_VAG_*` reads are gone;
  one `NODE_ENV` read remains. The merge commit message should carry this correction; the commit is not rewritten.
- Step 6: 8b's `"types": ["node", "vite/client"]` in the `tsconfig.build.json` files are left. Engine-core needs them
  only for that `NODE_ENV` read.

## Task 6: documentation by the model

- `model-docs`: 22 pages; a second run changes 0; `--check` exit 0; the guard passes 5/5.
- Hand blocks: written from the code for `circulation`, `lungs`, `blood`, `pharmacology` and `rhythms-ecg`; drafts
  ("> Draft — owner review pending.") for the other 16. No page is left as a seed. Writing them showed where the code
  contradicts itself; these need an owner read and are not fixed here:
  - the `T_ACT_PER_SYSTOLE = 2.1` comment cites 1.25 (`l2/circ/params.ts`);
  - `l2/gas/o2.ts`'s header describes Severinghaus/Kelman without pH, but the code calls Dash–Bassingthwaighte
    (`l2/blood/odc.ts`), which includes pH;
  - `l2/blood/oxygen.ts`'s header gives 0.88 − q, but the code uses `REGIONAL_FLOW_FULL = 0.55`;
  - `l2/neuro/drive.ts`'s header still gives the deleted synergy product;
  - `l2/neuro/spont.ts`'s Winter's rule differs slightly from `parameter-tables.md`'s "HCO3 < 22";
  - `l3/defib-pacer/outcome.ts` replaces the brief's 0.3 with 0.1;
  - `l2/pk/gamma.ts` says "in v1".
- `post8b_docs`: the README three-way merge had 2 conflicts, resolved by hand. (1) The drug count gives way to the
  pharmacology page and the model-documentation link, as this stage planned. (2) "What it is not" keeps 8b's
  honesty-reviewed wording (the reference engine, the evidence audit, no SVR sentence, the tested-browsers bullet, the
  ventilator in the affiliation line) and adds the known-miss index and a link to the published audit. Overview
  headings and "Details:" lines are written; one link line is on `known-deviations.md`. docs-honesty and
  docs-examples: 9 passed.
- The model-docs guard got a 120 s describe timeout. It takes ≈ 5 s alone, and it timed out at Vitest's 5 s default
  in the full fast suite on a loaded machine.

## Task 7: verification

- Local, on the final tree: typecheck clean; build clean; `check-notices` OK (3 files); `check-licences` OK (89
  packages, 5 shipped); `check-size` OK (282.0 KB gzip -9); `model-docs --check` and `known-misses --check` exit 0.
- Fast suite: audio 65, skins 191, engine-core 1,431 + 1 skipped, controller 284, ventilator 113, renderer 110, demo
  299 — the same as the baseline. Validation was 146 + 11 skipped (141 + the 5 guard cases) when run alone. In the
  full suite under a load average of ≈ 10, `perf/tick-bench` (p50 3.4 ms > 2) and the guard (5 s timeout, now 120 s)
  failed; both pass alone. CI run 39116455633's build job failed on the same guard timeout (7.0 s on the runner);
  the timeout is in 65665f40.
- `PME_TEST_SET=slow-h` locally: 3 files, 7 passed.
- Full e2e locally (system Chrome): 108 passed, 4 skipped, 0 flaky (14.0 min).
- Kit rehearsal ("Redo the kit on a NEW main", with this worktree; the kit was built into the executor's scratch
  folder, not `_sandbox/pme-showcase`; videos skipped).
  - `make-bundle`, `check-servers` and `check-relay` (PASS, 2 of 2) pass; `check-subpath` gives 23 pages and 0
    root-absolute URLs.
  - The rehearsal and sound runs (3 workers): 17 of 18 passed. WebKit "Anaphylaxis under anaesthesia" failed once:
    "systolic after epinephrine … not within 90 s (latest 58.8)", under a machine load average of about 10. Run alone
    it passed with the same numbers as `main` (11.3 s).
  - The WebKit sub-path run: 2 passed.
  - For the comparison, the same rehearsal was run on a detached `main` 16b5c93e (`scratch/wt-stage-14-main`, kit
    built from it): 16 of 16 passed. 86 of 110 checks give identical values. The 24 that differ are run-to-run timing,
    for example the apnoea alarm at 54.3 s (main) and 55.9–56 s (branch), and the CPR return at 2.9–3 min in both.
    The largest is the bag-mask SpO2 recovery: 31.9 / 32.2 s on main and 27.5 / 27.5 s on the branch, which re-ran
    at 31.5 / 31.4 s on the same kit, so it is within the spread.
  - The `main` copies in `docs/showcase/results/` predate the current rehearsal script (they lack its newer checks),
    so the comparison above is against the fresh `main` run. `docs/showcase` was restored before committing.
- CI, run 39115790453 (Task 5, 4948e355), all green. Job wall times: slow-a 31.7, slow-b 21.6, slow-c 32.8, slow-d
  32.1, slow-e 29.1, slow-f 31.9, slow-g 22.9, slow-h 25.6, slow-i 20.7, showcase 8.7, build 17.8, e2e chromium 27.0,
  e2e webkit 17.4 min. Every slow job is ≤ 35 min. Passed only on retry, all on WebKit and all tagged: `debrief:24`,
  `return-here-restore:15`, `vent-embed:34`.
- CI, run 39116455633 (Task 6, d3289122): e2e (webkit) is red under the new rule. Its NEW line is
  `pacer-overlay-device-tab.e2e.ts:34` [webkit] "TCP pace marks drawn as overlays on a pacer skin": attempt 1 failed
  with "page.evaluate: Target page, context or browser has been closed" (crash class), and retry #1 passed. It was
  reported to the orchestrator, who ruled to tag it (Task 5 above). `vent-view-new-patient` [webkit] also passed only
  on a retry; it is tagged.
- **CI, run 39120754252 (65665f40, the final code commit): all 14 jobs green.** Job wall times: slow-a 16.1, slow-b
  30.3, slow-c 22.9, slow-d 32.2, slow-e 30.0, slow-f 14.9, slow-g 14.2, slow-h 23.1, slow-i 28.6, showcase 13.6,
  build 23.8, e2e chromium 27.0 (109 passed, 3 skipped, 0 flaky), e2e webkit 16.6 min (71 passed, 38 skipped, 3
  flaky). Every slow job is ≤ 35 min in both runs (the times vary with the runner: slow-a 31.7 → 16.1). The retry
  step listed 3 tests, all tagged and all WebKit: `explore-baseline:22`, `return-here-restore:15`,
  `scenario-choose-another:14`. `validate` was untouched.

## Deviations from the plan and tool fixes (in the copy; `stage-14/tool-fixes.diff`)

The plan predates PR #55's per-browser e2e matrix, so its CI edit could not apply as written. The two Task 5
adaptations below were accepted by the orchestrator (2026-10-18).

- Deviation 1, `ci/apply_ci_edit.py`: since PR #55 the e2e runs in per-browser jobs. Each job writes
  `playwright-report-<browser>.json` (`--reporter=list,json`) and already had an echo-only step of the same name, so
  the plan's step would have been skipped and its jq would have read a file that is never written. The rule now
  replaces the echo-only step (with no `continue-on-error`) and reads the job's report. After the gate review, a
  MISSING report also fails the step ("::error … no e2e JSON report (…): the retry check cannot run", exit 1); the
  plan's tool line had exited 0 (`ci/apply_ci_edit.py:35`). It was tested on a missing report (exit 1), the synthetic
  reports (exit 1 / 0), the truncated one (exit 1) and the converted real log (exit 0).
- Deviation 2, `task5_edits.py`: step d is dropped. The CLI reporter overrides the config's, so a config JSON reporter would be
  dead.
- `post8b_docs.py`: a README already resolved by hand counts as "already", so the two 8b pages are still written.
- `model/model-docs.test.ts`: the describe timeout.
- `data/reviewed-keys.txt`, `data/reviewed-title-keys.txt`: the accepted keys above. `compare_lists.py` was run from a
  copy that prints every difference, not the first five.

## Temporary relaxation (2026-10-18, after the merge; PR `ci-webkit-retry-warn`)

Orchestrator ruling of 2026-10-18, time-boxed. On the **webkit** leg of the e2e job, an untagged test that passed only
on a retry now gives a `::warning`; it no longer fails the job. The **chromium** leg still fails (exit 1). On both legs
the step still writes a `::warning` line per retried test and the step summary, and a missing or unreadable JSON report
still fails. The reason is the time left before the demo: the rule turned a different untagged WebKit test red on
almost every run. These were PR #80's `showcase-events-layout.e2e.ts:37` and then `device-layer-page.e2e.ts:72` (run
39149678598, attempts 1 and 2), and PR #82's `device-layer-page.e2e.ts:89` (crash class). Each cost a 45-minute rerun
in a week with no CI slack (freeze Tuesday 20 October, 18:00). The two timing-class tests from run 39149678598 are
recorded, not tagged, in `stage-14/known-flaky.tsv` ("not tagged" section).

**Revert condition:** make the webkit leg exit 1 again after the v1.0.0-rc.2 demo, when Task 0 of the calibration pass
re-harvests the known-flaky list. The workflow comment above the step names this ruling and this condition.

### The known-flaky WebKit quarantine (2026-10-24, PR `ci-stabilise`)

Since 2026-10-24 the tests tagged `@known-flaky` (37 WebKit tests on this tree; `--grep @known-flaky --list`) no longer
run in the gating `e2e (webkit)` job. They run on WebKit in their own job, **`e2e-quarantine (webkit)`**, which is
non-blocking (`continue-on-error: true` on the job and on its test step). Its Playwright JSON report and `test-results/`
are still uploaded (artifact `e2e-report-webkit-known-flaky`), and a step writes the tests' counts into the job
summary: passed first time, passed only on a retry, failed all three attempts, skipped, with one line (and one
`::warning`) for each test retried or failed. The gating `e2e (webkit)` job runs every other test
(`--grep-invert @known-flaky`) with the rule above unchanged (warn-only for an untagged retry-only pass, until it is
reverted). **`e2e (chromium)` still runs every test, tagged or not, and still fails on an untagged retry-only pass: a
retry is not a pass.** No test was changed; the split is two `--grep` flags in `.github/workflows/ci.yml`, and
`playwright.config.ts` is unchanged.

Reason: under load the tagged WebKit tests failed all three attempts several times a day, and each retry costs a test's
full duration again. Run 39980675959 (`saadat-pass-3`, 2026-10-23): `e2e (webkit)` was cancelled by the 60-min job
timeout in its test step (59.5 min) after seven tagged tests had failed 3/3 (the learner controls, the showcase
Debrief, both Explore-baseline tests, the relay restart, "Return here", the vent embed). Runs 39965767381
(`fix-mh-tachy-pulsus`, 2026-10-23) and 40062046742 (`fix-f29-peep-undefined`, 2026-10-24) passed, but with tagged tests
(`return-here-restore`, `vent-view-new-patient`, `showcase-clock`) passing only on a retry. Merges that touched none of
them waited on them.

In the same PR the e2e jobs moved into the official Playwright container (`mcr.microsoft.com/playwright:v<version>-noble`,
the version read from the lockfile in the `renderer` job), so no job runs `playwright install --with-deps`: its apt step
took 20–60 s on most runs but stalled on the runner's Ubuntu mirror for 1941 s, 2004 s and 2411 s on the WebKit leg
(runs 40032500569, 39868678618, 39836946343) and 606–831 s on the Chromium leg (39973898452, 39957752222) between
2026-10-21 and 10-24. `pnpm install` in those jobs has a 5-min step timeout; the job timeout stays 60 min. A follow-up
PR (`ci-release-container`) runs `release.yml`'s browser tests and `validation.yml`'s soak in the same image with
`docker run` (same workspace path, the runner's user), so the tag's release does not depend on the apt mirror either.

**End condition:** the quarantine ends with the known-flaky list itself. When the calibration pass's Task 0
re-harvests the list (or a test's tag is removed after its fix), the test returns to the gating job on its own, since
the split follows the tag. When the list is empty, delete the `known-flaky` matrix row.

## Open (for the orchestrator or the owner)

1. Question 7 (the audit's publication) is confirmed by owner decision E18 = YES, per the orchestrator's launch
   message.
2. `packages/validation/test/docs-honesty.test.ts`'s describe title still says "(Stage 8b)". The orchestrator ruled
   to leave it: the plan never edits that file (Question 1).
3. The kit rehearsal result (above).
4. The `NODE_ENV` read in `rhythm-engine.ts` (above), and the correction of the "reads no environment" wording in the
   merge commit message.
   Also: a follow-up pass over the comment history that `DETECT` misses: `Stage V`/`V.1` (≈ 43 lines), `E-…-n` ids
   (≈ 14) and "7x's" (≈ 12), with decisions and the `same-code` proof.
5. Pre-existing next-version wording outside this stage's decisions: comments in `apps/demo/src/app/{patients,
   scenario-meta}.ts` and `views/{explore,remote}.ts`, the data value `later` in `patients.ts` (not shown: the app
   renders "not in this release"), and docs under `docs/physiology/` and `docs/showcase/i18n/README.md`. This stage
   adds no such wording.
6. Deferred, as the plan states: test-file and `scripts/` comments (v2.0), and one title form for every `it.fails`.
