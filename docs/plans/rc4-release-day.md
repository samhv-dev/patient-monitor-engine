# The v1.0.0-rc.4 release day: freeze, version bump, release dry run, tag, release, kits, rehearsal, Persian handouts, Pages, the owner's smoke, the room dry run — Plan

**STATUS: WRITTEN 2026-10-24 (+0330), UNREVIEWED. DATES REVISED 2026-10-24 by the owner's ruling:** the demo is
Tuesday 3 November (12 Aban 1405), the freeze Saturday 31 October 12:00, the tag Sunday 1 November; R4-Q2 and R4-Q3
answered; E118 post-demo. By the planner (Opus) from `scratch/briefs/plan-rc4-release-day.md`,
on `origin/main` **a4163165** (#123), from the rc.3 runbook (`docs/plans/rc3-release-day.md`, run 2026-10-23), its run
report (`scratch/plans-backup/rc3-release-day-run-2026-10-23.md`), `scratch/rc3-release/gate-notes.md`, the rulings,
`release.yml` on #125's branch and the A4 records. Documentation only; what was not checked is **(unverified)**.

> **RUN 2026-10-28/29 (the plan as run; Tasks 0–6 complete, Task 7 and the rest of Task 9 after the owner's smoke).**
> Times are UTC from GitHub and the run logs (+0330 in brackets where the owner's day matters). The record is the
> orchestrator's rulings log (`research/00-orchestrator-rulings.md`, from 2026-10-28) and the gate notes
> (`scratch/rc4-release/gate-notes.md`); the repo's copy is [`docs/gates/rc4-release.md`](../gates/rc4-release.md).
> - **The day moved forward.** By the owner's ruling of 29 October (early morning +0330) the freeze came at once and
>   rc.4 was tagged as the **fallback build**, not on Sunday 1 November: an rc.5 from main (Instructor v2, #177, merged
>   after the tag) only if green and liked in the Sunday smoke; the room dry run on Monday 2 November decides which kit
>   is in the room. Saturday's freeze, the 17:30 allowance reset and Sunday's tag slot did not apply.
> - **Task 0.** Steps 1–2: `FREEZE_SHA` **8e4e8471** (#163's merge, 2026-10-28 18:32 [22:02]; main run 40746088523
>   success). After it, as ruled: #165 (docs), #167 (the MH card's story text and its CHANGELOG line), #166 (the bump),
>   #172 (the MH-only talk: run sheet and the kit-round talk test). Step 3: #128 (24 October) and #172 carried the
>   tooling; no separate `test-kitround-rc4` PR. Step 4: the bump PR **#166** merged 2026-10-29 08:17 (CHANGELOG and
>   `CITATION.cff` dated **2026-10-30**, the tag day the ruling then named, not "2026-11-01"). **Step 5, the prep run on
>   `FREEZE_SHA`: not run.** The expected values were instead #172's talk run (kit a88f95a7) and the 28 October run on
>   the owner's card rulings (kit 2c341aa3). Step 6: dry run **40865772794** on 0c4b396f, 11:29–11:33, success (9 files,
>   7 × OK, the rc.4 notes and banner, no rc.4 release yet).
> - **Task 1.** `TAG_SHA` = **0c4b396f** = main after #172 (the orchestrator tagged after #172 so that the MH-only talk
>   test and run sheet are in the tag), not main right after the bump. Main run 40860980902 success (10:52–11:27);
>   retry-only passes in the gate note. Release files on the commit as Step 3 expects, with the dates above.
> - **Task 2.** Annotated tag `v1.0.0-rc.4` pushed **2026-10-29 11:36:12 (15:06 +0330)**; release run 40866665261
>   success (11:36–11:41); the release published 11:41:18, Pre-release, 8 assets. Step 4 run by the executor (7 × OK).
> - **Task 3.** As written (kit build id `"0c4b396f 2026-10-29"`; relay 4 of 4; three `same:`; the Windows zip; the
>   embed). The kit has 76 app files and a 1,545,928-B zip (rc.3 71 and 1,004,390 B): notes, ruled.
> - **Task 4.** As written, on both engines, first time through. The A4 marks changed kind against 24 October (two
>   objectives rewritten by the owner, #163) and the MH times came 25–36 s earlier: both ruled not a gate failure, the
>   28 October run on 2c341aa3 agreeing to the second. No F1–F10.
> - **Task 5.** The tag's Persian table left 11 (MH) and 15 (haemorrhage) strings in English; by ruling the handouts
>   were rendered with PR #161's 26 unreviewed drafts placed **uncommitted** in `wt-rc4-docs` (0 strings without
>   translation each; Vazirmatn only). That table is not in this branch: it stays in #161 for the owner's read.
> - **Task 6.** Tree `gh-pages-rc4` e1fbdc67 (91 files); the serve check ran from `wt-rc4-tag` (`wt-rc2-prep` no longer
>   exists); pushed with the lease 12:20:40, built 12:21. **Tasks 0–6 complete ≈ 12:25 on 29 October.**
> - **Task 7** (the smoke, the live rehearsal, W/E13/E14): not yet run. **Task 8:** not needed. **Task 9:** Steps 1–3,
>   4.1–4.3 and 5 drafted on 29 October on `docs-rc4-release`, no push; #117's rc.3 evidence (Step 2) not folded in
>   yet.

**Base and preconditions.**
- rc.3 is tagged on **fcf99b70** (annotated, 2026-10-23 13:55; release run 39938963544; its Pages build is the local
  branch `gh-pages-rc3`, **ceac7b47**). The rc.3 kit `_sandbox/pme-kit-release-fcf99b70/` (with its zip) **becomes the
  fallback for the demo on Tuesday 3 November 2026** (12 Aban 1405; postponed from 28 October to Wednesday 4 November,
  then moved to Tuesday 3 November by the owner's ruling of 2026-10-24). The rc.2 set (`pme-kit-release-b39b3d87/`
  with `fa-handouts-rc2/`, `pme-debrief-rc2/`, `pme-embed-rc2/`) is retired (moved to `$TD`, never deleted).
- Pages today is **0777a977** (an rc.4 candidate, main 5821c83c, local branch `gh-pages-rc4c`); Task 1 reads the remote
  value on the day and Task 6 leases on it, so an earlier republish by the orchestrator is fine.
- Since the rc.3 tag, main carries: #118 E117 (MH tachycardia; E118 pulsus paradoxus NOT met, evidence only), #119
  Saadat pass 3, #120 the live-demo cards (E119 MH induction sequence, E120 haemorrhage course, E121 oxygen never
  implicit) with kit round A4, #121 F29, #122 CI in the Playwright container + WebKit quarantine, #123 the tamponade
  FAST line. Since then, merged and green on main **2ebd743d**: **#125** (the release in the container + `dry_run`),
  **#128** (the kit-round tooling, Task 0 Step 3), **#124** E121b (oxygen by mask).
- Open before the freeze: the owner's haemorrhage objectives and take-home lines and his rulings on the 13
  clinical-review findings (may change both demo cards; by the freeze); the talk tooling (Decision 4): since 29 October
  the **MH-only talk** (P29: MH with three look-inside stops; the haemorrhage card reserve R5), on main by #172. **E118** (pulsus) is post-demo, not in rc.4 (owner, 24
  October). **#117** is closed (R4-Q2 (b)).
- **The kit-round script on a4163165 could not run the rc.4 talk** (read, not run): the Q1 MH segment pressed "Start
  surgery" 4 min after Load (`kit-round-a.kitround.ts:1538–1540`), but since E119 the card offers it only once
  *intubated* (`showcase-mh.json`). #128 fixed that; #172 rewrites the talk to the programme of 29 October (P29: MH only,
  three look-inside stops; Decision 4). `rehearsal.showcase.ts` (six cards) presses removed buttons too (MH `:195`; haemorrhage "Start CPR, 2 L
  and epinephrine"): not run (Decision 4).

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. The
> orchestrator does every step marked **(orch)**: merge, the release dry run, push the tag, push `gh-pages`. An executor
> never tags, merges or pushes `gh-pages` (`RELEASE.md`: "executors never tag").

**Goal.** By Sunday 1 November afternoon (product unchanged after the Saturday 31 October 12:00 freeze except the
version bump), and by Monday 2 November for the owner's part:
1. `v1.0.0-rc.4` is tagged (annotated) on a commit green on `main`, after a green `release.yml` dry run on it.
2. Its GitHub release is a **Pre-release** with 8 assets whose `SHA256SUMS.txt` checks.
3. The kit is rebuilt from the tag and placed in the owner's folders, with a Windows zip; rc.3 is the fallback.
4. Kit round **Q2 on rc.4**, both browsers: the 30-minute talk (the MH-only programme, P29) plus the cards' paths
   (A4 MH; A4 haemorrhage, the reserve R5).
5. The Persian handouts are regenerated from that rehearsal: the MH one printed for the day, the haemorrhage one
   (reserve R5) kept in the kit.
6. GitHub Pages serves the tag's build.
7. Sunday 1 November evening (or Monday 2 November morning, his choice): the owner's smoke (≈ 35 min) and live
   rehearsal. Monday 2 November: the room dry run.

After the smoke, one docs PR records all of it.

**Architecture (what changed since rc.3; the rest is as rc.3's runbook describes).**
- `release.yml` (#125): the browser tests run in `mcr.microsoft.com/playwright:v<lockfile version>-noble` by `docker
  run`, no `playwright install --with-deps` (≈ 20 of rc.3's 26 min). `workflow_dispatch` with `dry_run` (default true)
  skips the tag check and the publish and uploads `release/` (8 assets + `NOTES.md`) as the artifact `release-dry-run`.
- `ci.yml` (#122): e2e in the container; `e2e (chromium)` all tests, enforced; `e2e (webkit)` all but `@known-flaky`
  (retry-only warns until the demo); `e2e-quarantine (webkit)` the `@known-flaky` set, non-blocking. Main ≈ 35 min.
- `kit-round-a.kitround.ts` has the **A4 tests** "A4 MH (E119)" and "A4 haemorrhage (E120)": each card's course, the
  Debrief and the learner handout printed; outputs `a4-<key>-…-kit-round-<engine>.{json,md}`, `debrief-a4-….json`,
  on Chromium `a4-<key>-{debrief,handout}-chromium.pdf`. A `pme-debrief/2` JSON's own version wins over `--version`.
- Unchanged: `make-bundle.mjs`, `check-relay.mjs`, the orphan `gh-pages` branch, the merge chain
  `scratch/rc2-release/merge-one-v2.sh <PR>` (0 merged + main green; 2 main red; 3 PR failed; 4 red after; 5 time-out).

**Spec.** The brief; `RELEASE.md`; the rulings 2026-10-23/24 (E117–E121b, the 09:10 postponement and scope, the CI
entries, the dates ruling of 24 October: demo Tuesday 3 November, freeze Saturday 31 October 12:00); the rc.3
sources above; `docs/gates/stage-14.md` (the quarantine); the run sheet's §5 and haemorrhage section.

---

## Global Constraints

- **Freeze.** No product change after **Saturday 31 October 12:00 (+0330)** except the version-bump PR. `.github/`
  counts as product: #125 is merged (2ebd743d). After the tag, only docs, each PR after main green. The
  kit-round script is test tooling that ships in no kit: its edits are allowed at any time.
- **Never edit the main checkout** `repo/` (`git fetch`, `git tag`, pushing a tag or `gh-pages` from it are fine).
- **Shell.** Nothing that waits on stdin (`gh run watch` only with a run id, `git commit -m`, no heredoc: the editor
  tool; long runs end with `< /dev/null`); no foreground `sleep`; `grep -E`; no unfiltered `pkill` (`pgrep -fl
  "playwright test"`, `kill -INT <pid>`); one Playwright run at a time on this Mac, each `env -u CI … --reporter=list`;
  `gh` with `-R samhv-dev/patient-monitor-engine`.
- **Variables.** Task 1 Step 1 writes `scratch/rc4-release/env.sh`; later blocks start with
  `. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh`.
- **Nothing is deleted:** MOVED to `$TD` (`/Users/samhv/Desktop/Claude/_to_delete/rc4-release-day-<date>/`).
- **Words.** "pre-release" whenever the version is named; "For education only. Not a medical device and not clinically
  validated"; no unearned claim; "a later release", never "v1.1"; Persian only via the `persian-writing` skill, by
  the orchestrator.
- **Downloads.** Only the project's own, each into a new empty folder: the dry-run artifact, the 8 assets (≈ 8 MB).
- **Usage.** The weekly allowance resets Saturday 31 October 17:30, on freeze day: the bump PR, the prep run, the bump
  merge and the release dry run finish before it. Check usage before each executor launch (R4-Q7).
- **Commit trailer.** Commits made from this plan end with the trailer the session's attribution rule names.

---

## Decisions this plan makes where the brief or the rulings were silent

1. **One case.** `TAG_SHA` = `origin/main` after the bump merge, green, with a green dry run; not green by **Sunday 1
   November 12:00**: no tag that day (R4-Q1).
2. **The dry run is the pre-flight** (Task 0 Step 6): the rc.4 notes cut and asset names on the commit to be tagged. A
   red dry run is fixed by a workflow-only PR before the tag (the release path, not the product), then repeated.
3. **The kit-round edits land before the freeze** in one test-tooling PR (`test-kitround-rc4`, Task 0 Step 3); late:
   Task 0 Step 5 and Task 4 Step 2 cherry-pick it.
4. **Q1 + A4, both engines; Q1 is the MH-only talk.** #172 rewrites the Q1 talk to the owner's programme of
   29 October (P29): opening → MH (E119) with three look-inside stops (Pause, Explore, the model-page tab) → the MH
   Debrief read on screen; the haemorrhage card (E120) is reserve R5, measured by A4 haemorrhage as a reserve check;
   A4's Run by stays `'Live demo, 3 November'`; bronchospasm and tamponade stay out of the talk. A3 is not
   run (A4 prints both demo handouts; the tamponade card changed text only and is not shown at the demo); nor the
   six-card shots (not in the brief; two of their tests press removed buttons; R4-Q6).
5. **Folders** `kit-round-a/q2-rc4/` (talk), `q2-rc4-a4/` (A4), `q2-rc4-rerun/` (8.1), never in place; write-up
   MEASUREMENTS §"Q2 on rc.4".
6. **The expected values are the prep run's** (Task 0 Step 5): the cards may still change before the freeze; the tables
   give the 24 October A4 records and rc.3's Q2 as history. Beyond ±10 s sim: a NOTE; another mark KIND or a missing
   state: a gate failure.
7. **As rc.3:** the "THIS KIT" block; a Windows zip; the demo does not depend on the GitHub release (the tag is never
   moved); Pages follows the demo kit; inventory before any `mv` or `cp`, `cp -n`, the owner's notes copied to
   `$TD/owner-notes-before-rc4/` first and restored by Task 8.
8. **rc.2 is retired whole.** rc.3's Persian set moves into `pme-kit-release-fcf99b70/fa-handouts-rc3/`;
   `pme-debrief-rc3/` and `pme-embed-rc3/` stay. **Persian: the demo's two cases only**, from the A4 Chromium JSONs.
9. **#117 is closed** (R4-Q2 answered (b)); its branch `docs-rc3-release` is an input of the rc.4 docs PR (Task 9
   Step 2).

---

## What rc.4 adds: where it is observed, what "pass" looks like

| rc.4 item (PRs) | Observed in | Pass |
|---|---|---|
| **E119 MH card** (#120) | Task 4 Step 3c (A4 MH); Step 3 (Q1 MH, the MH-only talk with three stops, #172); smoke 7 | States awake → premedicated → preoxygenated → induced → intubated → surgery → earlySigns → triggerOff → … → recovering → normoventilated; marks `["observed","observed","observed","not-assessable","not-assessable","observed"]`; A4 record (kit 52b0390b, C / W): induced 04:05, intubated 05:04 / 05:05, early signs 08:38 / 08:39, call 08:40, EtCO₂ < 40 at 09:14 / 09:15, normo 14:28; PDF A4 **7** pages; handout **1** page with the three MH take-home lines; errors 0 |
| **E117 MH tachycardia** (#118) | A4 and Q1 MH rows; smoke 7 | HR rises before the CO₂ tile leaves its baseline (A4: 71 at surgery, 78–80 at the early signs, fentanyl-blunted); timings within ±10 s of the prep run |
| **E120 haemorrhage card** (#120) | Task 4 Step 3c (A4 haemorrhage, the reserve R5 check; not in the talk since P29); smoke 8 | A4 record (kit 33a6c92b, C / W): junctional 09:19 / 09:17, PEA 10:27 / 10:26, pulse loss 10:59 / 11:00, asystole 15:38 / 15:36, CPR 15:41 / 15:38, pulse check 1 17:39 / 17:37 → VF → shock 1 → **asystole**, pulse check 2 19:46 / 19:45 → VF → shock 2 → **organised** (`pea`), ROSC **20:57**; marks `["not-assessable","not-observed","not-observed"]` while the objectives are drafts (a NOTE); PDF **8** pages; handout **1** page with ruled take-home lines |
| **E121 oxygen never implicit** (#120) | A4 rows | MH with Preoxygenate: SpO₂ minimum 99 induction → tube + 60 s; haemorrhage SpO₂ 96 on room air until its oxygen step |
| **Saadat pass 3** (#119) | Task 4 Step 4 (`q2-mh-monitor-early-signs-*.png` and the stop shots); smoke 2–3 | rc.3's run-report note (1) gone: EtCo2 / FiCo2 / AWRR parts apart (no "mmHg" under FiCo2, AWRR limits off its label), "SQI%" and "EMG%" apart, MH's EtAA tile clear of SQI/EMG; the RR tile set as the EtCo2 part; "°C" in the T column's title row |
| **F29** (#121) | Task 4 Step 3c | `PEEP undefined` 0 times in both A4 Debrief PDFs |
| **Tamponade FAST line** (#123) | Not shown at the demo; still printed by A3 if run | — (A3 is not run, Decision 4) |
| **CI container + quarantine** (#122) | Task 1 Step 2 | `e2e (chromium)`, `e2e (webkit)` success; `e2e-quarantine (webkit)` any (counts recorded) |
| **Release in the container, dry run** (#125) | Task 0 Step 6; Task 2 Step 2 | Each ≈ 7 min, no `playwright install` step; 8 assets |
| **E121b oxygen by mask** (#124) | smoke 11 | A breathing patient's SpO₂ rises; the control is disabled with an airway device or the ventilator (unverified: its words) |
| **E118 pulsus**: post-demo, not in rc.4 (owner, 24 October) | — | The Known limitation stays; tamponade times as rc.3 |

**Rollback line.** If the tag build fails the rehearsal gate or the owner's smoke (Task 7 items 1, 2, 7 or 8), **the rc.3
kit (fcf99b70) is the demo build and Pages returns to rc.3** (ceac7b47). Task 8.

---

## Timeline

```
Sat 24           merged on main 2ebd743d: #125, #128 (tooling), #124 (E121b); #117 closed (R4-Q2 (b));
                 evening: the two-demos tooling PR (`test-kitround-two-demos`; history since P29)
Mon 26–Sat 31   the MH-only talk (P29, #172) merged on main (orch; Decision 4); the A4 "Run by" follow-up if still
                 needed (Task 0 Step 3);
                 Mon 26 02:00 UTC: the weekly `validation` cron run on main (unverified what it writes)
Sat 31  ≤ 12:00  freeze: every rc.4 product PR merged, main green → FREEZE_SHA (orch)
        12:00    Task 0 Step 4: the bump PR (executor ≈ 1 h); its CI ≈ 35 min
        12:30    Task 0 Step 5: prep run on FREEZE_SHA (executor, machine exclusive ≈ 1 h)
        ≈ 14:00  (orch) merge the bump PR; main CI ≈ 35 min → main green = the rc.4 commit
        ≈ 14:45  Task 0 Step 6 (orch): release.yml dry run on main ≈ 7 min; its assets checked
        17:30    the weekly allowance resets: everything above done before it
Sun 1   ≈ 10:00  Task 1 → Task 2 (orch): tag, release ≈ 7 min, assets
        ≈ 10:20  Task 3 (executor): kits, relay, READ ME, placement, zip, embed      ≈ 1 h
        ≈ 11:20  Task 4: Q1 talk ×2, macOS WebKit e2e, A4 ×2 ×2 engines, reading    ≈ 1.5 h
        ≈ 12:50  Task 5: Persian ≈ 0.5 h → Task 6: Pages ≈ 0.5 h (push by orch)
        ≈ 14:00  Task 9 Steps 1–3, 4.1–4.3 (no push)
        evening  Task 7: smoke ≈ 35 min, then the live rehearsal ≈ 45 min (his Mac)
                 (or Monday 2 morning, his choice)
        evening  Task 9 Steps 4.4–6: the PR opens after the smoke (or Monday 2) (CI ≈ 35 min)
Mon 2            the room dry run: Windows checklist (W), router (E14), phones, E13
                 Task 9 Step 7: review → merge (the final run sheet before the demo)
Tue 3            Demo (12 Aban 1405): the rc.4 kit, the rc.3 kit and both zips on the stick
```

A gate failure in Task 4 or in the smoke sends the day to Task 8 (≈ 1 h; the rc.3 kit is already placed).

---

## Effort, CI and who does what

| Task | Who | Hours | CI / machine |
|---|---|---|---|
| 0 Scope, tooling, bump, prep, dry run | executor + orch | 2.5 + 0.5 | 4 runs ≈ 35 min; dry run ≈ 7 min |
| 1–3 Verify, tag, release, kits | orch + executor | 0.5 + 1.0 | release ≈ 7 min (#125); build ≈ 4 min |
| 4 Q1 ×2, macOS WebKit e2e, A4 ×4 | executor | 1.5 | machine ≈ 50 min (A4 ≈ 15 min, unverified: 2 and 5 min of wall per engine on 24 October, plus setup) |
| 5–6 Persian, Pages; 7 smoke, rehearsal, room | executor + orch; owner | 1.0 + 0.5 | owner ≈ 35 + 45 min, room ≈ 1 h |
| 8 Rollback (on a failure); 9 Docs PR + review | orch + executor; reviewer | 1.0; 2.0 + 0.5 | 2 runs ≈ 35 min |
| **Total without rollback** | | **≈ 9 h** + owner ≈ 2.5 h | **≈ 8 runs**, + one re-run each (fx24 failed 3/3 on CI WebKit on 24 October) |

---

## Tasks

### Task 0 (executor prepares, orch merges): before and at the freeze — Monday 26 to Saturday 31 October

- [ ] **Step 1 (orch). Scope.** #125 and #124 (E121b) are merged (2ebd743d, green); #117 is closed (R4-Q2 (b)). Every
  other rc.4 product PR (the owner's card words and clinical rulings) merges by Saturday 31 October 12:00 or waits;
  E118 is post-demo, not in rc.4.
- [ ] **Step 2 (orch). The freeze.** At Saturday 12:00 (or when the last product PR's main run is green, whichever is
  later): `git -C $R/repo fetch -q && git -C $R/repo rev-parse origin/main` → `FREEZE_SHA`; its push run `completed`/`success`
  (`gh run list -R samhv-dev/patient-monitor-engine --workflow ci --commit <FREEZE_SHA> --event push --json
  status,conclusion`). One rulings line: the sha, the run id, the PRs since a4163165.
- [ ] **Step 3 (executor, any day before the bump). The test-tooling PR** (Decision 3):

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo && git fetch -q
git worktree add -b test-kitround-rc4 ../scratch/wt-kitround-rc4 origin/main
cd ../scratch/wt-kitround-rc4 && grep -n -E "M\.untilT\(M\.t0 \+ (240|390)\)|fill\('(Showcase 2|Live demo), [0-9]+ (October|November)'\)|Kit round Q2 rehearsal on the rc" scripts/showcase/kit-round-a.kitround.ts
```

  Expected (a4163165): `:1513`, `:1514`, `:1538`, `:1540`, `:1712` (`:1161`, the A3 test's 22 October, is history).
  With the editor: (1) replace `:1538–1540` (`untilT(+ 240)`, the "Start surgery" press, `untilT(+ 390)`) with the A4
  MH sequence (`:1744–1754`) on `M` — premedicate `+ 30`, preoxygenate `+ 60`, induce `+ 240`, intubate `+ 300`, surgery
  `+ 360`, `untilT(M.t0 + 450)` — and the row `'6:30 ×4: …'` → `'7:30 ×4: …'`; the later fixed times then fall before
  the early signs (≈ 08:38) and `untilT` returns at once, so span 1 follows the cooling and the E22 press comes in
  Recovering, as in A4 (14:28) (unverified until the prep run); (2) `:1513` → `'Showcase 2, 3 November'`, `:1712` →
  `'Live demo, 3 November'`; (3) `:1514` → `'Kit round Q2 rehearsal on the rc.4 release build.'`. (#128 merged this
  step on 24 October with "4 November", now `:1514` and `:1721` on main. The two-demos tooling PR
  (`test-kitround-two-demos`) is history: since P29 the Q1 talk on main is the MH-only talk (#172, Decision 4):
  opening → MH (E119) with three look-inside stops → the MH Debrief read on screen; it fills no Run-by line, and A4's
  stays `'Live demo, 3 November'` (only if it does not, a one-line tooling PR sets it before the freeze). Its test
  title, record names and `--list` count are per #172's body; the haemorrhage card is reserve R5, run by A4 only.)

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/wt-kitround-rc4
npx -y pnpm@9.15.9 install --frozen-lockfile --prefer-offline < /dev/null > ../wt-kitround-rc4.install.log 2>&1; tail -1 ../wt-kitround-rc4.install.log
grep -c -F "Preoxygenate: 100 % O₂ by face mask" scripts/showcase/kit-round-a.kitround.ts; git diff --stat | tail -1
env -u CI SHOWCASE_KIT=/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/kit/pme-showcase-kit-fcf99b70 npx playwright test -c scripts/showcase/playwright.kit-round.config.ts -g "Q1 30-minute talk|A4 (MH|haemorrhage)" --list --reporter=list < /dev/null | tail -2
```

  Expected: `2` (A4 and Q1); one file; "Total: 6 tests" (`--list` only parses). The talk is first run in Step 5.
  Commit (`test(showcase): kit round Q2 on rc.4 — the Q1 talk's MH segment follows the E119 card; Run by 3 November`),
  push, open the PR (not draft), same title. **Never merge**; (orch) merges it before the bump PR.
- [ ] **Step 4 (executor). The version-bump PR** (the file set of rc.3's 695ca78c):

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo && git fetch -q
git worktree add -b release-rc4 ../scratch/wt-release-rc4 origin/main
cd ../scratch/wt-release-rc4 && npx -y pnpm@9.15.9 install --frozen-lockfile --prefer-offline < /dev/null > ../wt-release-rc4.install.log 2>&1; tail -1 ../wt-release-rc4.install.log
git grep -l -E '1\.0\.0-rc\.3' -- packages apps/demo/e2e README.md | xargs sed -i '' 's/1\.0\.0-rc\.3/1.0.0-rc.4/g'
git grep -n -E '1\.0\.0-rc\.3' -- packages apps README.md CITATION.cff | wc -l
git diff --stat | tail -1
```

  Expected: only `CITATION.cff:version` left (`1`); 25 files (on a4163165: packages, constants, their tests,
  `debrief-fa.test.ts`, two e2e files, README's status line and asset name). Then with the editor:
  1. `CITATION.cff`: `version: 1.0.0-rc.4`, `date-released: "2026-11-01"` (tag day).
  2. `CHANGELOG.md`: under `## [Unreleased]` (left empty) insert `## [1.0.0-rc.4] - 2026-11-01`; the paragraph "Fourth
     public **pre-release** (release candidate) of a teaching simulator. It is for education only: it is not a medical
     device and it is not clinically validated. It is not the final 1.0.0: the calibration pass and the blind realism
     review have not run. The known limitations listed under 1.0.0-rc.3, 1.0.0-rc.2 and 1.0.0-rc.1 still apply, except
     where this section says otherwise."; every subsection that was under Unreleased; then `### Known limitations`:
     (1) "Windows launchers (`.cmd`): untested on Windows at this release" (RELEASE.md item 10, word for word) unless the
     owner ticked all 10 lines; (2) pulsus paradoxus in severe tamponade not reproduced (3.4 mmHg against ≥ 10;
     `docs/model/circulation.md`; E118 is post-demo); (3) a hidden instructor tab pauses the session (E82), the fix
     for a later release; (4) the WebKit quarantine: the `@known-flaky` WebKit tests run in a non-blocking CI job
     (`docs/gates/stage-14.md`), a retry-only pass on the gating WebKit job warns until the demo of 3 November, Chromium
     enforces (replaces rc.3's browser line); (5) the haemorrhage card's objectives are drafts with no take-home lines,
     if the owner's words did not land; (6) as rc.3: kit from a source checkout, items 8 and 9 not run, Persian terms
     unreviewed (unless reviewed), the owner's smoke in the gate notes. Links: `[Unreleased]: …compare/v1.0.0-rc.4...HEAD`,
     `[1.0.0-rc.4]: …compare/v1.0.0-rc.3...v1.0.0-rc.4`.
  3. `docs/roadmap/v1.0-remaining.md:3`: "State on 2026-11-01 (release candidate `1.0.0-rc.4`)".
  4. `.github/workflows/ci.yml:173` and `:189`: "until the demo of 28 October" → "3 November" (text only).
  5. **RELEASE.md item 2:** E117 changed physiology (`l2/endo/{core,params}.ts`, `l2/thermal/{mh,params}.ts`):
     one sentence in `docs/guides/validation-summary.md` that `docs/validation/report.md` predates it, citing Monday's
     scheduled `validation` run if one ran, unless a regenerated report landed (R4-Q4).

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/wt-release-rc4
npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/release-versions.test.ts test/docs-honesty.test.ts --reporter=dot < /dev/null
node --experimental-strip-types scripts/model-docs.ts && node --experimental-strip-types scripts/known-misses.ts && git status --short docs/model docs/validation/known-misses.md
npx -y pnpm@9.15.9 typecheck < /dev/null > ../wt-release-rc4.typecheck.log 2>&1; tail -2 ../wt-release-rc4.typecheck.log
awk -v v="1.0.0-rc.4" 'index($0, "## [" v "]") == 1 {on = 1; next} /^## \[/ || /^\[[^]]+\]: / {on = 0} on' CHANGELOG.md | head -4
awk '/^## \[Unreleased\]/{on=1;next} /^## \[/{on=0} on' CHANGELOG.md | grep -c '[^[:space:]]'
```

  Expected: **4** and **7 passed**; any regenerated model page committed; typecheck clean; "Fourth public
  **pre-release** …"; `0`. Commit (`chore(release): version 1.0.0-rc.4 in every library package; CHANGELOG and CITATION
  dated 2026-11-01`), push, PR (not draft) `release: 1.0.0-rc.4 version bump`; **never merge**. (orch) merges with
  `merge-one-v2.sh` after the tooling PR (exit 4: `gh run rerun <id> --failed`, at most twice).
- [ ] **Step 5 (executor). The prep run on `FREEZE_SHA`** (Decision 6; machine exclusive; nothing placed, committed or
  pushed):

```bash
mkdir -p /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/prep
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo && git worktree add --detach ../scratch/wt-rc4-prep <FREEZE_SHA>
cd ../scratch/wt-rc4-prep && npx -y pnpm@9.15.9 install --frozen-lockfile --prefer-offline < /dev/null > ../rc4-release/prep/install.log 2>&1
P=/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/prep
[ "$(grep -c -F 'Preoxygenate: 100 % O₂ by face mask' scripts/showcase/kit-round-a.kitround.ts)" = 1 ] && git fetch -q origin test-kitround-rc4 && git cherry-pick -x origin/test-kitround-rc4 2>&1 | tail -1
node scripts/showcase/make-bundle.mjs "$P/kit" < /dev/null > $P/kit-build.log 2>&1; tail -3 $P/kit-build.log
node scripts/showcase/check-relay.mjs "$P/kit" --json $P/relay.json < /dev/null | tail -1
env -u CI SHOWCASE_KIT="$P/kit" KITROUND_OUTDIR=$P/q2 npx playwright test -c scripts/showcase/playwright.kit-round.config.ts -g "Q1 30-minute talk" --project=chromium --reporter=list < /dev/null > $P/q2-chromium.log 2>&1; tail -4 $P/q2-chromium.log
env -u CI SHOWCASE_KIT="$P/kit" KITROUND_OUTDIR=$P/a4 npx playwright test -c scripts/showcase/playwright.kit-round.config.ts -g "A4 (MH|haemorrhage)" --project=chromium --reporter=list < /dev/null > $P/a4.log 2>&1; tail -4 $P/a4.log
node scripts/showcase/debrief-fa.mjs $P/a4/debrief-a4-mh-*-chromium.json $P/a4/debrief-a4-haemorrhage-*-chromium.json --version 1.0.0-rc.3 --fonts /Users/samhv/.claude/plugins/cache/persian-writing/persian-writing/1.4.0/assets/fonts --text < /dev/null > $P/fa.log 2>&1; cat $P/fa.log
```

  (The cherry-pick runs only if the tooling PR is not in `FREEZE_SHA`; a Notes-line conflict: take the tooling side;
  `--version 1.0.0-rc.3`: the candidate still says rc.3.) Expected: kit ready; relay **4 of 4**; talk `1 passed` ≈ 5 min (the MH-only talk with three stops, #172; it needs the internet for the model-page tab); A4 `2 passed`; `0 strings
  without translation` ×2. The Task 4 Step 4 readers on `$P/q2/` and `$P/a4/` → `$P/expected.txt`: **tag day's expected
  values**. Look at `q2-mh-monitor-early-signs-chromium.png` and the stop shots (written to `$P/q2/` unless `KITROUND_SHOTS` is set). A surprise goes to the orchestrator that afternoon, before 17:30 (a script
  fix: tooling; a missing Persian string: the orchestrator via the skill, `reviewed: false`, a docs PR before the tag).
  Then remove the worktree (`git -C …/repo worktree remove --force …/scratch/wt-rc4-prep`).
- [ ] **Step 6 (orch). The release dry run on main** (Decision 2; after the bump merge, main green; #125 is merged):

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo && git fetch -q && git rev-parse origin/main
gh workflow run release.yml -R samhv-dev/patient-monitor-engine --ref main -f dry_run=true
gh run list -R samhv-dev/patient-monitor-engine --workflow release --event workflow_dispatch --branch main --limit 1 --json databaseId,headSha,status
gh run watch <databaseId> -R samhv-dev/patient-monitor-engine --exit-status --interval 30
D=/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/dryrun; mkdir $D && gh run download <databaseId> -R samhv-dev/patient-monitor-engine -n release-dry-run -D $D
cd $D && ls | sort && shasum -a 256 -c SHA256SUMS.txt && head -3 NOTES.md && head -c 48 patient-monitor.iife.js; echo
gh release list -R samhv-dev/patient-monitor-engine --limit 2
```

  Expected: `headSha` = main's (repeat the list until it shows); exit 0 in ≈ 7 min; 9 files (the 8 assets with
  `-v1.0.0-rc.4` in the two zip names, + `NOTES.md`); 7 × `: OK`; a blank line, "Fourth public **pre-release** …";
  `/*! patient-monitor-engine 1.0.0-rc.4`; no rc.4 release. Record the run id.

### Task 1 (orch): verify the tag commit — Sunday 1 November ≈ 10:00

- [ ] **Step 1. Variables** (`printf`, no heredoc):

```bash
mkdir -p /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo && git fetch -q origin --tags
TAG_SHA=$(git rev-parse origin/main); PAGES_LEASE=$(git ls-remote origin refs/heads/gh-pages | cut -f1)
printf 'R=%s\nS=%s\nW=%s\nTD=%s\nFREEZE_SHA=%s\nTAG_SHA=%s\nSHA8=%s\nV=v1.0.0-rc.4\nGHR=samhv-dev/patient-monitor-engine\nKIT=%s\nRC3_SHA=fcf99b706e2cd16e21d441e1b40b88f679a619f1\nRC3_8=fcf99b70\nRC2_8=b39b3d87\nPAGES_LEASE=%s\n' \
  /Users/samhv/Desktop/Claude/projects/patient-monitor-engine /Users/samhv/Desktop/Claude/_sandbox \
  /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release \
  "/Users/samhv/Desktop/Claude/_to_delete/rc4-release-day-$(date +%F)" <FREEZE_SHA> "$TAG_SHA" "${TAG_SHA:0:8}" \
  "/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/kit/pme-showcase-kit-${TAG_SHA:0:8}" \
  "$PAGES_LEASE" > /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh
cat /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh
```

  Expected: fourteen lines; `TAG_SHA` 40 hex characters, `SHA8` its first 8; `PAGES_LEASE` 40 characters.
- [ ] **Step 2. Main green on the commit; only the bump (and tooling/docs) since the freeze; the dry run on it.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh
cd $R/repo
git merge-base --is-ancestor "$FREEZE_SHA" "$TAG_SHA" && echo has-freeze
git log --oneline --first-parent "$FREEZE_SHA".."$TAG_SHA"
git diff --stat "$FREEZE_SHA" "$TAG_SHA" -- apps packages scripts .github | tail -1
gh run list -R $GHR --workflow ci --commit "$TAG_SHA" --event push --json databaseId,status,conclusion
gh run view <run id> -R $GHR --json jobs --jq '.jobs[] | select(.name | test("^(build|e2e)")) | .name + " " + .conclusion'
gh run view <run id> -R $GHR --json jobs --jq '.jobs[] | select(.name=="build") | .steps[] | select(.name=="tick benchmark (alone)") | .conclusion'
gh run list -R $GHR --workflow release --event workflow_dispatch --commit "$TAG_SHA" --json databaseId,conclusion
gh run view <run id> -R $GHR --log 2>/dev/null | grep -i "passed only on retry" | sort -u | head -20
git ls-remote --tags origin "$V*"
```

  Expected: `has-freeze`; the bump (+ tooling/docs) merges; only version strings, the `ci.yml` comments and the
  kit-round script; `success`; `build`, `e2e (chromium)`, `e2e (webkit)` success, quarantine any (counts to the gate
  note); tick bench `success`; the dry run `success`; no Chromium retry-only line (WebKit's to
  the gate note, new ones to Task 9); no remote tag.
- [ ] **Step 3. The release files on the commit.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh
cd $R/repo
git show "$TAG_SHA:CHANGELOG.md" | grep -n -E '^## \[(Unreleased|1\.0\.0-rc\.4)\]'
git show "$TAG_SHA:CHANGELOG.md" | awk '/^## \[Unreleased\]/{on=1;next} /^## \[/{on=0} on' | grep -c '[^[:space:]]'
git show "$TAG_SHA:CITATION.cff" | grep -E '^(version|date-released):'
git show "$TAG_SHA:CHANGELOG.md" | awk -v v="1.0.0-rc.4" 'index($0, "## [" v "]") == 1 {on = 1; next} /^## \[/ || /^\[[^]]+\]: / {on = 0} on' > $W/NOTES-preview.md
head -3 $W/NOTES-preview.md; grep -c -E "not clinically validated|untested on Windows at this release" $W/NOTES-preview.md; grep -c -i "v1\.1" $W/NOTES-preview.md
git show "$TAG_SHA:README.md" | grep -c -E '1\.0\.0-rc\.4'; git show "$TAG_SHA:README.md" | grep -c -E '1\.0\.0-rc\.[123]'
git diff --stat "$RC3_SHA" "$TAG_SHA" -- packages/engine-core/src | tail -1
git show "$TAG_SHA:docs/guides/validation-summary.md" | grep -n -E "E117|predates" | head -3
```

  Expected: `## [Unreleased]`, `## [1.0.0-rc.4] - 2026-11-01`; `0`; rc.4 / `"2026-11-01"`; "Fourth public
  **pre-release** …"; ≥ 2 (≥ 1 if Windows was ticked); `0`; ≥ 2; `0`; the E117 files (+ `version.ts`); the
  item-2 sentence (a miss: gate note and Task 9, not a hold). A wrong notes body: `gh release edit $V -R $GHR
  --notes-file <file>` (body only). RELEASE.md 1, 3, 4 above; 5 re-run by `release.yml`; 8, 9 not run; 10 the Windows line.
- [ ] **Step 4. A clean worktree of the commit** (the kit's build tree):

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh
git -C $R/repo worktree add --detach $R/scratch/wt-rc4-tag "$TAG_SHA"
cd $R/scratch/wt-rc4-tag && npx -y pnpm@9.15.9 install --frozen-lockfile --prefer-offline < /dev/null > $W/install-tag.log 2>&1; tail -1 $W/install-tag.log
npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/release-versions.test.ts test/docs-honesty.test.ts --reporter=dot < /dev/null
node -p "require('./packages/renderer/package.json').version"; git status --porcelain --untracked-files=no | wc -l
```

  Expected: 4 + 7 passed; `1.0.0-rc.4`; `0`.

### Task 2 (orch): the tag, the release workflow, the assets, the Pre-release flag

- [ ] **Step 1. Tag (annotated) and push.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh
cd $R/repo
git tag -a "$V" "$TAG_SHA" -m "patient-monitor-engine $V (pre-release): fourth release candidate for v1.0. Education only; not a medical device and not clinically validated."
git cat-file -t "$V"; git rev-parse "$V^{commit}"; git push origin "$V"; git ls-remote --tags origin "$V*"
```

  Expected: `tag`; `$TAG_SHA`; `* [new tag] v1.0.0-rc.4 -> v1.0.0-rc.4`; `^{}` = `$TAG_SHA`. Record the push time.
- [ ] **Step 2. The release workflow.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh
gh run list -R $GHR --workflow release --event push --commit "$TAG_SHA" --limit 1 --json databaseId,headBranch,status
gh run watch <databaseId> -R $GHR --exit-status --interval 30
```

  Expected: `headBranch` `v1.0.0-rc.4`; exit 0 in ≈ 7 min (#125's container). A failed
  browser-test step: `gh run rerun <id> -R $GHR --failed`, at most twice; anything else: no release, tag and `main`
  untouched, Tasks 3–7 go on with Task 3 Step 6's local build.
- [ ] **Step 3. The release page.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh
gh release view "$V" -R $GHR --json isPrerelease,isDraft,name,tagName,assets --jq '{isPrerelease,isDraft,name,tagName,n:(.assets|length),assets:[.assets[].name]|sort}'
gh release view "$V" -R $GHR --json body --jq .body | head -4
gh api repos/$GHR/releases/latest --jq .tag_name
```

  Expected: `isPrerelease: true`, `isDraft: false`, `name: "patient-monitor-engine v1.0.0-rc.4"`, `n: 8` (the dry run's
  names without `NOTES.md`); the body starts with the pre-release paragraph; the last fails `HTTP 404`.
- [ ] **Step 4. SHA256SUMS** (an executor that finds `$W/assets` absent runs this itself):

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh
mkdir $W/assets && gh release download "$V" -R $GHR -D $W/assets
cd $W/assets && wc -l < SHA256SUMS.txt && shasum -a 256 -c SHA256SUMS.txt
head -c 48 patient-monitor.iife.js; echo; wc -c < patient-monitor.iife.js
unzip -l "ventilator-monitor-embed-$V.zip" | grep -E ' (LICENSE|NOTICES\.md|LICENSES/Apache-2\.0\.txt|ventilator-monitor\.html)$' | wc -l
unzip -l "api-reference-$V.zip" | grep -c -E ' (NOTICES\.md|TYPEDOC-ASSETS-LICENSE-Apache-2\.0\.txt|lunr-[^ ]*\.txt)$'
```

  Expected: `7`, 7 × `: OK`; `/*! patient-monitor-engine 1.0.0-rc.4`; the size (rc.3 741,613 B); `4`; ≥ 3. Record run
  id, `publishedAt` and size in `$W/gate-notes.md`.

### Task 3 (executor): the kits, the relay, the READ ME, the owner's folders, the Windows zip, the H22 embed

- [ ] **Step 1. Build the kit from the tag's clean worktree.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh
cd $R/scratch/wt-rc4-tag && git rev-parse HEAD && git status --porcelain --untracked-files=no | wc -l
node scripts/showcase/make-bundle.mjs "$KIT" < /dev/null > $W/kit-build.log 2>&1; tail -14 $W/kit-build.log
sed -n '2,3p' "$KIT/VERSION.txt"; grep -c "^Windows:" "$KIT/VERSION.txt"
grep -h -o -E '"[0-9a-f]{8}\+? 20[0-9-]*"' "$KIT"/app/assets/*.js | sort -u
grep -l -E '1\.0\.0-rc\.4' "$KIT"/app/assets/*.js | wc -l; grep -l -E '1\.0\.0-rc\.[123]' "$KIT"/app/assets/*.js | wc -l
ls "$KIT"; find "$KIT/app" -type f ! -name .DS_Store | wc -l
```

  Expected: `$TAG_SHA`, `0`; "Kit ready" (keep the log; a kit the orchestrator prebuilt is verified with these checks);
  `Commit:   <TAG_SHA>` with no "uncommitted", `Branch:   HEAD`; `1`; one build id `"<SHA8> <UTC date>"`, no `+`; ≥ 1;
  `0`; both `.cmd` and `.command`, `app`, `server`; the app's file count (rc.3: 71).
- [ ] **Step 2. The relay smoke test.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh
cd $R/scratch/wt-rc4-tag && node scripts/showcase/check-relay.mjs "$KIT" --json $W/relay-$SHA8.json < /dev/null | tail -8
```

  Expected: both `.cmd` lines "CRLF, ASCII, runs server\launch.mjs", then `classroom relay smoke test: PASS (4 of 4
  runs; node v…; kit <the $KIT path>)`. Anything else: F2 (Task 8); do not place the kit.
- [ ] **Step 3. The READ ME block.** With the editor, append to `$KIT/READ ME FIRST.txt`:

  ```

  THIS KIT (added after the build)
     Version 1.0.0-rc.4 (pre-release), build <SHA8> <build date>: the Start screen shows the version; every Debrief page's footer shows the version and the build.
     For education only. Not a medical device and not clinically validated: never use it for patient care.
     Bookmarks and saved sessions from rc.3 kits (pme-showcase-kit-fcf99b70) and older will not restore here: take new ones.
     Keep the rc.3 kit beside this one as the fallback; do not mix the two kits in one classroom.
  ```

- [ ] **Step 4a. Inventory and copy the owner's notes (Decision 7). Before any `mv` or `cp`.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh
mkdir -p "$TD"
ls -la "$S/pme-classroom-dryrun" "$S/pme-debrief-dryrun" "$S/pme-debrief-fa" "$S/pme-debrief-rc2" "$S/pme-debrief-rc3" "$S/pme-debrief-rc4" "$S/pme-kit-release-b39b3d87" "$S/pme-kit-release-fcf99b70" "$S/pme-embed-rc2" "$S/pme-embed-rc3" > $W/inventory-before.txt 2>&1; cat $W/inventory-before.txt
mkdir -p "$TD/owner-notes-before-rc4" && cp -p "$S/pme-classroom-dryrun/PRE-FLIGHT.md" "$S/pme-classroom-dryrun/OWN-PHONE-TEST.md" "$S/pme-debrief-dryrun/HOW-TO-CHECK-THE-PRINT.txt" "$S/pme-kit-release-fcf99b70/README.txt" "$S/pme-debrief-fa/READ-ME-FIRST.txt" "$TD/owner-notes-before-rc4/"
ls "$TD/owner-notes-before-rc4"
```

  Expected (as on 24 October): classroom-dryrun `CLASSROOM.md`, `OWN-PHONE-TEST.md`, `PRE-FLIGHT.md`, `kit/`;
  debrief-dryrun the HOW-TO and `pme-showcase-kit-fcf99b70/`; debrief-fa three `*-2026-10-23.pdf` + READ-ME; debrief-rc2
  and -rc3 four files each; debrief-rc4 absent; b39b3d87 README, `fa-handouts-rc2/`, kit; fcf99b70 README, kit, zip;
  embed-rc2 and -rc3 eight entries each. Anything else: name it in the gate note, leave it. Five notes copied.
- [ ] **Step 4. Place the kits; retire rc.2 (move, never delete; `cp -n`).**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh
mkdir "$S/pme-kit-release-$SHA8" && cp -Rn "$KIT" "$S/pme-kit-release-$SHA8/"
mv "$S/pme-classroom-dryrun/kit" "$TD/pme-classroom-dryrun-kit-$RC3_8" && cp -Rn "$KIT" "$S/pme-classroom-dryrun/kit"
mv "$S/pme-debrief-dryrun/pme-showcase-kit-$RC3_8" "$TD/" && cp -Rn "$KIT" "$S/pme-debrief-dryrun/"
mv "$S/pme-kit-release-$RC2_8" "$S/pme-debrief-rc2" "$S/pme-embed-rc2" "$TD/"
for d in "$S/pme-kit-release-$SHA8/pme-showcase-kit-$SHA8" "$S/pme-classroom-dryrun/kit" "$S/pme-debrief-dryrun/pme-showcase-kit-$SHA8"; do diff -rq "$KIT" "$d" && echo "same: $d"; done
ls "$S/pme-kit-release-$RC3_8"; ls "$TD"
```

  Expected: three `same:`; `pme-kit-release-fcf99b70` untouched (README, kit, zip); `$TD` holds
  `pme-classroom-dryrun-kit-fcf99b70/`, `pme-showcase-kit-fcf99b70/`, `pme-kit-release-b39b3d87/`, `pme-debrief-rc2/`,
  `pme-embed-rc2/`, `owner-notes-before-rc4/`. Then, with the editor, each modelled on its rc.3 text:
  - **`$S/pme-kit-release-$SHA8/README.txt`**: built from `<TAG_SHA>` (tag `v1.0.0-rc.4`) on `<date>`, clean checkout;
    "THIS IS THE RELEASE BUILD for the demo on Tuesday 3 November … Version 1.0.0-rc.4 (pre-release) …"; rc.3
    bookmarks will not restore; the relay line; the Windows zip line; "Rehearsed on this kit (kit round Q2 on rc.4,
    <date>)" (after Task 4); "The rc.3 kit in pme-kit-release-fcf99b70 is the fallback (older MH and haemorrhage
    cards): take both on the stick."
  - **First line of `$S/pme-kit-release-$RC3_8/README.txt`**: "FALLBACK for Tuesday 3 November: the rc.4 kit is
    pme-kit-release-<SHA8>. Use this kit only if the rc.4 kit fails; its MH and haemorrhage cards are the older ones
    (run sheet: the '22 October' MH section, Reserve R4); Persian handouts in fa-handouts-rc3/, print set in
    ../pme-debrief-rc3/."
  - **`PRE-FLIGHT.md`, `OWN-PHONE-TEST.md`:** the kit sentence → rc.4 from `<SHA8>`, relay 4 of 4 on `<date>`, rc.3
    bookmarks will not restore, the rc.3 fallback, the demo on 3 November; plus "the MH card starts awake: Premedicate,
    Preoxygenate, Induce, Intubate, Start surgery are buttons; oxygen only by a step".
  - **`HOW-TO-CHECK-THE-PRINT.txt`:** kit path; footer `1.0.0-rc.4` + `<SHA8>`; E50; the verdict words; MH 7 pages,
    haemorrhage 8 (the prep run's if different); handouts 1 page (MH three take-home lines, haemorrhage ruled lines);
    the PDFs in `_sandbox/pme-debrief-rc4/`.
- [ ] **Step 4b. The Windows zip.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh
cd "$S/pme-kit-release-$SHA8" && zip -qrX "pme-showcase-kit-$SHA8.zip" "pme-showcase-kit-$SHA8" -x '*.DS_Store'
unzip -l "pme-showcase-kit-$SHA8.zip" | grep -c -E '\.cmd$'
unzip -p "pme-showcase-kit-$SHA8.zip" "pme-showcase-kit-$SHA8/Start Classroom.cmd" | cmp - "$KIT/Start Classroom.cmd" && echo cmd-identical
ls -la "pme-showcase-kit-$SHA8.zip"; shasum -a 256 "pme-showcase-kit-$SHA8.zip"
```

  Expected: `2`; `cmd-identical`; ≈ 1 MB (rc.3 1,004,390 B); record the sha256. **Step 5:** the fallback's
  `VERSION.txt` line 2 reads `Commit:   fcf99b706e2c…` and its zip is beside it; leave both.
- [ ] **Step 6. The H22 embed folder.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh
mkdir "$S/pme-embed-rc4" && unzip -q "$W/assets/ventilator-monitor-embed-$V.zip" -d "$S/pme-embed-rc4"
ls "$S/pme-embed-rc4"; head -c 48 "$S/pme-embed-rc4/patient-monitor.iife.js"; echo
```

  Expected: the eight entries of `pme-embed-rc3`, the rc.4 banner. **No release:** `cd $R/scratch/wt-rc4-tag && npx -y
  pnpm@9.15.9 build < /dev/null > $W/build-embed.log 2>&1 && cp -R apps/demo/dist/embed/. "$S/pme-embed-rc4/"`.

### Task 4 (executor): kit round Q2 on rc.4 — the talk (the MH-only programme, P29) and the cards (MH; the haemorrhage as reserve R5), both browsers

**One output folder per run, never in place (Decision 5).** `ls` the folder first: it must not exist.

- [ ] **Step 1. The docs worktree** (tooling and evidence; the docs PR's branch):

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh
git -C $R/repo worktree add -b docs-rc4-release $R/scratch/wt-rc4-docs "$TAG_SHA"
cd $R/scratch/wt-rc4-docs && npx -y pnpm@9.15.9 install --frozen-lockfile --prefer-offline < /dev/null > $W/install-docs.log 2>&1; tail -1 $W/install-docs.log
grep -c -F "Preoxygenate: 100 % O₂ by face mask" scripts/showcase/kit-round-a.kitround.ts
grep -n -E "fill\('(Showcase 2|Live demo), [0-9]+ (October|November)'\)|Kit round Q2 rehearsal on the rc" scripts/showcase/kit-round-a.kitround.ts
```

  Expected: `2` (#128 is in the tag); 3 November (A4's "Live demo, 3 November"; the MH-only talk fills no Run-by line
  and prints no "Kit round Q2 rehearsal" note). The Q1 talk in the tag is the MH-only programme of 29 October (P29,
  #172): opening → MH (E119) with three look-inside stops (Pause, Explore, the model-page tab) → the MH Debrief read on
  screen. The haemorrhage (E120) is reserve R5: it is not in the talk; A4 haemorrhage (Step 3c) still runs, as a
  reserve check.
- [ ] **Step 2. Not applicable: the MH-only talk is on main (#172).** The cherry-pick from `test-kitround-two-demos`
  no longer applies. If Step 1 shows a date still 4 November: Task 0 Step 3's one-line edits; the prep run's script
  fixes too, committed before Step 3; then `--list` → 1 talk test.
- [ ] **Step 3. The talk (the MH-only programme, P29), Chromium then WebKit** (machine exclusive; ≈ 5 min each on
  Chromium [#172]). The test title in `-g` and the record names are per #172 (below: the current title).
  `KITROUND_SHOTS=$Q/shots` keeps the stop screenshots (Explore and the model pages) out of the records' folder:

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh
cd $R/scratch/wt-rc4-docs && Q=docs/showcase/kit-round-a/q2-rc4; ls $Q 2>&1 | head -1
env -u CI SHOWCASE_KIT="$KIT" KITROUND_OUTDIR=$Q KITROUND_SHOTS=$Q/shots npx playwright test -c scripts/showcase/playwright.kit-round.config.ts -g "Q1 30-minute talk" --project=chromium --reporter=list < /dev/null > $W/q2-chromium.log 2>&1; tail -4 $W/q2-chromium.log
env -u CI SHOWCASE_KIT="$KIT" KITROUND_OUTDIR=$Q KITROUND_SHOTS=$Q/shots npx playwright test -c scripts/showcase/playwright.kit-round.config.ts -g "Q1 30-minute talk" --project=webkit --reporter=list < /dev/null > $W/q2-webkit.log 2>&1; tail -4 $W/q2-webkit.log
cp -n $W/relay-$SHA8.json $Q/; ls $Q | wc -l
```

  Expected: "No such file or directory"; `1 passed` each; "kit … served at http://127.0.0.1:8760/?relay by Start
  Classroom.command"; **≈ 7 records per browser** (`q1-0-opening-and-qr-<b>.{json,md}`,
  `q1-1-malignant-hyperthermia-with-three-look-inside-stops-<b>.{json,md}`, `debrief-q1-1-…-<b>.json`,
  `q1-talk-<b>.json` and the one shot `q2-mh-monitor-early-signs-<b>.png`), so `ls $Q | wc -l` ≈ 16 with the relay
  JSON and `shots/` (19 PNGs per browser in `shots/`: the stops, the model pages, the end, the Debrief on screen).
  No haemorrhage record, no Debrief PDF and no close in the talk (rc.3's six-segment talk wrote ≈ 34). The model-page
  tab loads GitHub pages: the run needs the internet. **No new file for 10 min** after the `q1-0` records: a hang;
  Task 8.1.
- [ ] **Step 3b. The local macOS WebKit e2e set** (≈ 8 min):

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh
cd $R/scratch/wt-rc4-tag
env -u CI npx playwright test apps/demo/e2e/fx16-follower-beep-gate.e2e.ts --project=webkit --repeat-each 3 --reporter=list < /dev/null > $W/fx16-webkit.log 2>&1; tail -3 $W/fx16-webkit.log; grep "FX-16" $W/fx16-webkit.log
env -u CI npx playwright test apps/demo/e2e/fx24-follower-after-fast-forward.e2e.ts apps/demo/e2e/fx25-co2-attach.e2e.ts apps/demo/e2e/fx14-pause-while-hidden.e2e.ts apps/demo/e2e/saadat-instructor-tiles.e2e.ts --project=webkit --reporter=list < /dev/null > $W/fx-webkit.log 2>&1; tail -4 $W/fx-webkit.log
git status --porcelain --untracked-files=no | wc -l
```

  Expected: FX-16 `3 passed`, three ratio lines (rc.3 99/99/100 %); the rest passed, none skipped (`saadat-instructor-
  tiles` new, unverified here); `0`. A failure is a **NOTE** for the matching smoke item, never a gate failure.
- [ ] **Step 3c. The MH card and the haemorrhage reserve (R5), both engines** (≈ 15 min, unverified):

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh
cd $R/scratch/wt-rc4-docs && A=docs/showcase/kit-round-a/q2-rc4-a4; ls $A 2>&1 | head -1
env -u CI SHOWCASE_KIT="$KIT" KITROUND_OUTDIR=$A npx playwright test -c scripts/showcase/playwright.kit-round.config.ts -g "A4 (MH|haemorrhage)" --reporter=list < /dev/null > $W/q2-a4.log 2>&1; tail -4 $W/q2-a4.log
ls $A
for k in mh haemorrhage; do pdfinfo $A/a4-$k-debrief-chromium.pdf | grep Pages; pdfinfo $A/a4-$k-handout-chromium.pdf | grep Pages; pdftotext $A/a4-$k-handout-chromium.pdf - | grep -c -E "Observed|Not observed|Not assessable|Discuss|✓|✗|◆"; pdftotext $A/a4-$k-debrief-chromium.pdf - | grep -c "PEEP undefined"; pdffonts $A/a4-$k-handout-chromium.pdf | grep -c -i "inter"; done
pdftotext $A/a4-mh-handout-chromium.pdf - | grep -c -F "A rising EtCO₂ at the same ventilation"
```

  Expected: "No such file or directory"; `4 passed`; the records, Debrief JSONs, PNGs and four PDFs; MH 7, 1, `0`, `0`,
  ≥ 1; haemorrhage 8, 1, `0`, `0`, ≥ 1 (24 October; the prep run's win); `1`. A handout not 1 page or a verdict word: F10.
- [ ] **Step 4. Read the results** (Node, no stdin). The talk:

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/wt-rc4-docs
node -e '
const fs=require("fs"),d="docs/showcase/kit-round-a/q2-rc4/";
for (const f of fs.readdirSync(d).filter(f=>/^q1-[0-4]-.*\.json$/.test(f))) {
  const r=JSON.parse(fs.readFileSync(d+f,"utf8")); const m=r.measures||{};
  console.log(f,"| kit",r.kit,"| errors",r.errors.length,"| marks",JSON.stringify((r.debrief?.objectives||[]).map(o=>o.mark)),
    "| rows",r.debrief?.timelineRows??"-", m.about?"| about "+JSON.stringify(m.about.start):"", m.qr?"| phones "+m.qr.countAfter:"",
    m.pdf?"| pdf "+JSON.stringify(m.pdf):"", m.debriefFooter?"| footer "+JSON.stringify(m.debriefFooter):"",
    m.h21?"| h21 hold "+m.h21.holdKeptEverySample+" cockpit "+m.h21.cockpitKeptDriving:"", m.mhStops?"| mh early "+m.mhStops.earlySignsAt+" call "+m.mhStops.callAt+" normo "+m.mhStops.normoAt+" dose2 "+m.mhStops.dose2At+" stops "+m.mhStops.stopClocks.join(" "):"");
}'
```

  The record names (and the reader's file filter) are per #172; the rows below name the segments.

  | Segment | Expected, both engines (the prep run's values win) |
  |---|---|
  | opening and QR | kit = `$SHA8`; errors 0; about (Home's line) **"Version 1.0.0-rc.4 · pre-release · build <SHA8>"**; `3 phones following` |
  | malignant hyperthermia (E119) with three stops + the MH Debrief | marks `["observed","observed","observed","observed","not-assessable","observed"]`; rows ≈ 59–62; mh: early ≈ 08:09, call ≈ 08:12, normo ≈ 13:52, dose2 ≈ 19:13, stops ≈ 08:10 13:50 19:11 (kit a88f95a7 on 29 October, #172; the prep run's values win); errors 0. No PDF in the talk (the MH Debrief is read on screen; the PDFs come from Step 3c) |
  | the stops (`q1-talk-<b>.json`) | `stops[].simMovedS` 0 and `pausedAtEnd` true at all three; every phone "(paused)" at each stop's end; Explore numbers at 8:10 / 13:50 / 19:11 within a few units of #172's (MH activity 0.27 / 0.51 / 0.55) |

  The two cards (this reader printed the 24 October records' values quoted in "What rc.4 adds"):

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/wt-rc4-docs
node -e '
const fs=require("fs"),d="docs/showcase/kit-round-a/q2-rc4-a4/";
for (const f of fs.readdirSync(d).filter(f=>/^a4-.*-kit-round-(chromium|webkit)\.json$/.test(f))) {
  const r=JSON.parse(fs.readFileSync(d+f,"utf8")); const m=r.measures||{}; const a=m.a4mh||m.a4haemorrhage||{};
  console.log(f,"| kit",r.kit,"| errors",r.errors.length,"| marks",JSON.stringify((r.debrief?.objectives||[]).map(o=>o.mark)),"| pdf",JSON.stringify(m.pdf),"| handout",JSON.stringify(m.handoutPdf??null),"|",JSON.stringify({early:a.earlySignsAt,call:a.callAt,below40:a.etco2Below40At,normo:a.normoAt,spo2min:a.spo2MinInductionToTube,j:a.junctionalAt,pea:a.peaStateAt,loss:a.pulseLossAt,asy:a.asystoleAt,cpr:a.cprAt,s1:a.shock1,s2:a.shock2,rosc:a.roscAt}));
}'
```

  Expected: four lines, kit `$SHA8`, errors 0, the E119/E120 rows' values (E120 as the reserve check). Open
  `q2-mh-monitor-early-signs-<b>.png` (one per browser) and `$Q/shots/` against the pass-3 row and rc.3's notes (a)–(c) (`scratch/rc3-release/gate-notes.md`): no
  overlapping tile text; capnogram breath by breath; IBP2 empty in MH (not F9); no older rc. One A4 PNG per card.
- [ ] **Step 5. The print PDFs for the owner** (`cp -n` only):

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh
A=$R/scratch/wt-rc4-docs/docs/showcase/kit-round-a/q2-rc4-a4; mkdir "$S/pme-debrief-rc4"
for k in mh haemorrhage; do cp -n "$A/a4-$k-debrief-chromium.pdf" "$S/pme-debrief-rc4/debrief-$k-rc4-chromium.pdf"; cp -n "$A/a4-$k-handout-chromium.pdf" "$S/pme-debrief-rc4/handout-$k-rc4-chromium.pdf"; done
ls -la "$S/pme-debrief-rc4"
```

  Expected: four files (`mkdir` fails loudly if the folder exists: list it and stop).
- [ ] **Step 6. Gate verdict.** `$W/gate-notes.md` §Q2-rc4: every Expected above, **PASS** / **NOTE** / **FAIL**.

  **Gate failures** (any one sends the day to Task 8): **F1** kit build fails, `Commit` ≠ `$TAG_SHA`, or a `+` in the
  build id; **F2** relay not 4 of 4; **F3** the Start/About label or a Debrief footer not `1.0.0-rc.4 (pre-release)`
  (footer with the build), or an older rc on screen; **F4** a mark of another KIND than the prep run's, or a Debrief
  that does not open, print (Chromium PDF) or download its JSON; **F5** not `3 phones following` at the QR moment, a
  phone not `synced` at a segment's end, H21 `false`; **F6** a state a card relies on does not come (tamponade: PEA,
  ROSC; MH: earlySigns, recovering, normoventilated; haemorrhage: junctional, pea, asystole, vf, vf2, rosc), a shock
  outcome other than the prep run's (the cue card tells the room what the shock does), or a button a cue names is
  missing; **F7** errors > 0; **F8** a Chromium Debrief PDF (tamponade, MH, haemorrhage) missing or not A4 (more pages:
  a NOTE); **F9** a lane a card relies on missing or blank, or a solid CO₂ block on the ventilated case; **F10** a
  learner handout not 1 page, or a verdict word on it.

  **Notes** (recorded, never "fixed"): times beyond ±10 s of the prep run; alarm changes that keep the story; rows ±3;
  resyncs; load; S12-F2, FX-12; `about.preRelease: false` (regex names rc.1); the haemorrhage drafts' ✗; Step 3b.

### Task 5 (executor; the Persian paragraph by orch): the Persian handouts: MH (printed for the day) and the haemorrhage reserve (R5, kept in the kit)

Inputs: the two Chromium Debrief JSONs of the set the Task 4 verdict names (`q2-rc4-a4/`, or `q2-rc4-rerun/`).

- [ ] **Step 1. Render and check.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh
cd $R/scratch/wt-rc4-docs && A=docs/showcase/kit-round-a/q2-rc4-a4
node scripts/showcase/debrief-fa.mjs $A/debrief-a4-mh-e119-induction-sequence-and-early-call-kit-round-chromium.json \
  $A/debrief-a4-haemorrhage-e120-course-kit-round-chromium.json --version 1.0.0-rc.4 \
  --fonts /Users/samhv/.claude/plugins/cache/persian-writing/persian-writing/1.4.0/assets/fonts --text < /dev/null > $W/fa.log 2>&1; cat $W/fa.log
for f in $A/debrief-a4-*-chromium.fa.pdf; do python3 /Users/samhv/.claude/plugins/cache/persian-writing/persian-writing/1.4.0/scripts/verify_pdf.py "$f" --expect-font Vazirmatn > "$f.verify.txt"; echo "$(basename $f): exit $? · unexpected fonts $(grep -c 'unexpected font' "$f.verify.txt") · errors $(grep -c '^ERROR' "$f.verify.txt")"; done
grep -c -E "1\.0\.0-rc\.4" $A/debrief-a4-*-chromium.fa.txt; grep -c "$SHA8" $A/debrief-a4-*-chromium.fa.txt
```

  Expected: two lines `… .fa.pdf: N A4 pages; …`, each **`0 strings without translation`**; ≈ 8 / 8 pages (24
  October; ±1 a NOTE); **`exit 0 · unexpected fonts 0 · errors 0`** (read the `.verify.txt` for WARN); `1.0.0-rc.4` and
  the build ≥ 1 each. MH prints its three take-home lines, haemorrhage none (unless his lines landed). A missing string,
  unexpected font or `ERROR` fails **the handouts only**: none placed; the strings to the orchestrator; the READ-ME says so.
- [ ] **Step 2. Place them (inventory first; `cp -n` only).**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh
ls -la "$S/pme-debrief-fa"; mkdir -p "$S/pme-kit-release-$RC3_8/fa-handouts-rc3"
mv "$S"/pme-debrief-fa/debrief-fa-*-2026-10-23.pdf "$S/pme-debrief-fa/READ-ME-FIRST.txt" "$S/pme-kit-release-$RC3_8/fa-handouts-rc3/"
cd $R/scratch/wt-rc4-docs/docs/showcase/kit-round-a/q2-rc4-a4
cp -n debrief-a4-mh-e119-induction-sequence-and-early-call-kit-round-chromium.fa.pdf "$S/pme-debrief-fa/debrief-fa-malignant-hyperthermia-$(date +%F).pdf"
cp -n debrief-a4-haemorrhage-e120-course-kit-round-chromium.fa.pdf "$S/pme-debrief-fa/debrief-fa-haemorrhage-$(date +%F).pdf"
ls -la "$S/pme-debrief-fa" "$S/pme-kit-release-$RC3_8/fa-handouts-rc3"
```

  Expected: two rc.4 PDFs; the rc.3 set in `fa-handouts-rc3/` (zsh "no matches found": find them, record, go on).
- [ ] **Step 3. `READ-ME-FIRST.txt`** in `$S/pme-debrief-fa/`: the executor writes the **English** part as rc.3's (the
  MH case of the 3 November programme and the haemorrhage reserve (R5) from the rc.4 build, kit `<SHA8>`; only the
  MH handout is printed for the day, the haemorrhage one stays in the kit; key times per case; pages, "Strings left in English: 0 in
  each"; the take-home lines; the rc.3 set in `pme-kit-release-fcf99b70/fa-handouts-rc3/`; "do not save them from
  Preview") and a bracketed line for the Persian paragraph, which **(orch)** writes with the `persian-writing` skill
  (formal; Persian digits for counts and dates, ۱۲ آبان ۱۴۰۵; Western digits for versions, times and values) into
  `scratch/owner-review/readme-fa-rc4.md` (rc.3's was deferred to this one: rulings 2026-10-23 15:32).

### Task 6 (executor builds the tree, orch pushes): GitHub Pages from the tag

Only after Task 4 Step 6 shows no gate failure.

- [ ] **Step 1. The orphan tree.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh
cd $R/repo && git worktree add --orphan -b gh-pages-rc4 $R/scratch/gh-pages-rc4
cp -R "$KIT/app/." $R/scratch/gh-pages-rc4/
cp $R/scratch/wt-rc4-tag/LICENSE $R/scratch/wt-rc4-tag/NOTICES.md $R/scratch/gh-pages-rc4/ && cp -R $R/scratch/wt-rc4-tag/LICENSES $R/scratch/gh-pages-rc4/
touch $R/scratch/gh-pages-rc4/.nojekyll
```

  Then `README.md` and `VERSION.txt` with the editor: `scratch/gh-pages-rc3/`'s texts with `1.0.0-rc.3` → `1.0.0-rc.4`,
  `v1.0.0-rc.3` → `v1.0.0-rc.4`, `fcf99b70…` → the full `TAG_SHA` and its subject (`git log -1 --format='%H %s'
  $TAG_SHA`), the date. Keep both "cannot pair" lines word for word.
- [ ] **Step 2. Check and commit the tree.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh
cd $R/scratch/gh-pages-rc4
node $R/scratch/wt-rc4-tag/scripts/showcase/check-subpath.mjs .
grep -c "cannot pair" README.md VERSION.txt; head -1 VERSION.txt
git add -A -- . ':!**/.DS_Store' && git commit -q -m "GitHub Pages: patient-monitor-engine 1.0.0-rc.4 (pre-release), static app built from $SHA8" -m "<the session's commit trailer>"
git rev-list --count HEAD; git ls-files | wc -l; (cd "$KIT/app" && find . -type f ! -name .DS_Store | wc -l); ls LICENSES | wc -l
cd $R/scratch/wt-rc2-prep && node scratch/pages-serve-check.mjs $R/scratch/gh-pages-rc4 < /dev/null
```

  Expected: `root-absolute URLs: 0`; `:1` ×2; the rc.4 PRE-RELEASE line; `1`; tracked = app + 5 + `LICENSES/` (rc.3
  85); the serve check (from `wt-rc2-prep`, R4-Q8): "Version 1.0.0-rc.4 (pre-release). …", no 404, 0 errors.
- [ ] **Step 3 (orch). Force-push `gh-pages` only, and check it live.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh
cd $R/repo && git push --force-with-lease=gh-pages:$PAGES_LEASE origin gh-pages-rc4:gh-pages
GP=$(git -C $R/scratch/gh-pages-rc4 rev-parse HEAD); echo $GP
gh api repos/$GHR/pages/builds/latest --jq '.status + " " + .commit'
curl -s -m 20 "https://samhv-dev.github.io/patient-monitor-engine/VERSION.txt?$GP" | head -1
curl -s -m 20 "https://samhv-dev.github.io/patient-monitor-engine/README.md?$GP" | grep -c "cannot pair phones"
cd $R/scratch/wt-rc4-tag && node -e 'const {chromium}=require("@playwright/test");(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.goto("https://samhv-dev.github.io/patient-monitor-engine/");await p.waitForTimeout(5000);console.log(await p.locator("[data-about]").first().innerText());await b.close();})()'
```

  Expected: `(forced update)` (refused: someone pushed since Task 1; stop); `built <GP>` (every minute, ≤ 10); the rc.4
  line, `1`, the rc.4 label. Record `$GP`; keep `gh-pages-rc3` (rollback) and `gh-pages-rc4c`.

### Task 7 (owner, guided by the orch): the smoke and the live rehearsal, Sunday 1 November evening (or Monday 2 November morning, his choice); the room dry run Monday 2 November

One AskUserQuestion step per item, **≈ 35 min** (tell him); his Mac (Safari, Chrome), his phone, hotspot or router.

| # | ≈ min | Do | Expected |
|---|---|---|---|
| 1 | 1 | Double-click `_sandbox/pme-classroom-dryrun/kit/Start Classroom.command`; Allow "node" if asked | **THE CLASSROOM IS RUNNING**; Safari opens `127.0.0.1:8650/?relay#/`; "Version 1.0.0-rc.4 (pre-release). For education only. Not a medical device and not clinically validated …" |
| 2 | 2 | Monitor view → **Phones** → scan → **Close**; then the Instructor view at the window size he presents with | **1 phone following**. Pass 3: no tile text over another (EtCo2/FiCo2/AWRR, BFI%/BS%/SQI%/EMG%, T column, IBP1, %SpO2); the RR tile in the EtCO₂ tile's face; NIBP AUTO(5Min) with a result. Phone: waves at the cursor, no X4 |
| 3 | 1.5 | Instructor → **Devices** → Sensors → **CO₂ sampling line** on; 15 s | FX-25: the CO₂ lane starts blank and fills breath by breath; the tile becomes EtCo2 \| FiCo2 \| AWRR, parts apart |
| 4 | 2 | **Sound on**, volume up. **Healthy induction** → **Load · All alarms on · ×4**; phone on Ring, tap **Sound off**; 30 s; tap again | FX-16: the phone beeps with the Mac; the second tap silences it ("no alarm heard" recorded as such) |
| 5 | 2 | ×1; **5 min** fast-forward | FX-23 (the amber ring; the three-line banner); FX-24: phone waves not squeezed, no X4 |
| 6 | 1 | Another Safari tab ≈ 10 s, then back | E82: phone "(paused)"; the toast on return; the clock runs |
| 7 | 6 | **Malignant hyperthermia**: Load · All alarms on · ×8; **Premedicate**, **Preoxygenate**, **Induce**, **Intubate**, **Start surgery** (≈ 30 s apart); ×4; at the CO₂ rise the crisis button; **Debrief** → **Print or save as PDF** (untick Headers and footers), **Print the learner handout**; the same in **Chrome** | Each button appears after the one before; SpO₂ ≈ 99 with Preoxygenate; the HR climbs with the CO₂ (E117). Report A4, verdict words, footer "… Version 1.0.0-rc.4 (pre-release), build <SHA8> …"; handout 1 page, no verdict words, the three MH take-home lines |
| 8 | 4 | **Class IV haemorrhage**: Load · All alarms on · ×8; **Oxygen by face mask**, **Intubate and ventilate**; watch to the junctional rhythm and PEA (≈ 11:00 sim); Debrief → **Print the learner handout** | Junctional, then PEA; SpO₂ ≈ 96 on room air before the oxygen step; handout 1 page, ruled take-home lines (unless his lines landed) |
| 9 | 1 | Open the two `_sandbox/pme-debrief-fa/debrief-fa-*-<date>.pdf` in Preview (read only) | Right-to-left Persian; footer نسخه‌ی 1.0.0-rc.4 (پیش‌انتشار) and the build; the page-1 notice (unless the term review landed) |
| 10 | 1.5 | Close the black window (Terminate). Double-click `_sandbox/pme-embed-rc4/ventilator-monitor.html` (Safari), Develop → Show JavaScript Console | H22 on rc.4: breathes within 20 s; HR, SpO₂ > 90, EtCO₂, awRR 14; no console error |
| 11 | 1 | E121b (#124, merged): free play, **oxygen by mask** on the breathing patient; then with the ventilator on | SpO₂ rises; the control disabled with the ventilator (unverified: its words) |
| 12 | 0.5 | https://samhv-dev.github.io/patient-monitor-engine/ in Safari | "Version 1.0.0-rc.4 (pre-release) …"; no phone pairing from Pages (expected) |

**Gate items** 1, 2, 7, 8 → Task 8. The rest are findings: 4 → "phones silent, the Mac is the alarm source"; 5, 6 →
a presenter's rule; 3 → "attach the CO₂ line first"; 9 → the English Debrief is the reference; a wished-for Saadat-like
change → a later release.

**The live rehearsal (≈ 45 min):** his 3 November programme (P29: malignant hyperthermia with three look-inside
stops, the model-page tabs behind Explore; the haemorrhage card is reserve R5, not rehearsed) on the same kit, phone
following; the orchestrator
records times per card, late cues, what he says aloud (the VF is card-inserted) and changes. A missing state, crash or
unprintable Debrief: Task 8; the rest: Task 9 Step 4.

**The room dry run (Monday 2 November; R4-Q5).** **W:** the 10 lines of `READ ME FIRST.txt` (WINDOWS)
on the room's PC or the Windows laptop, from `pme-kit-release-<SHA8>/pme-showcase-kit-<SHA8>.zip` (Node ≥ 22; Unblock,
Extract All into a path with a space; Start Simulator 8642, no firewall question; closing stops it; Start Classroom
8650/?relay; firewall Private and Public; the Wi-Fi IPv4; his phone follows; Ctrl+C, Y stops it; a second one takes
8651). All ticked: the docs say so and the orchestrator may correct the release body's Windows line (`gh release edit`,
body only); a line failing (photo): Windows is no backup, never a rollback. **E14:** the M32 "simulation" open network
(DHCP on, client isolation off, VPN off): QR → as many borrowed phones as possible; count, time to "Following", one
lock/unlock, ×4 for 2 min. **E13:** `node -v` ≥ 22 on the presenting Mac; both kits and zips on the stick; Start
Classroom once (Gatekeeper, firewall). **The model-page tabs (P29; run sheet §1 "The model pages and the Explore
view"):** on the presenting Mac, while it is online, three GitHub tabs in the instructor's window, right of the
instructor tab, left loaded and never reloaded (the kit does not carry `docs/model/`): `…/blob/main/docs/model/endocrine-thermal.md#equations-in-words`,
`…/pharmacology.md` (Cmd-F "dantrolene") and `…/blood.md#equations-in-words`. Results to the rulings file that day; a
cue change is a small docs PR.

### Task 8 (orch + executor): rollback, if the rehearsal or the smoke fails on the new kit

**8.1 Classify** (F-number or smoke item, segment, engine, value) in the gate note; re-run that test once into
`q2-rc4-rerun/`: a pass makes it a NOTE (both recorded; Task 5 then reads the rerun). A hang is tooling.

**8.2 Decide** (orch; the owner is told at once, in one message):

| What failed | The demo kit | Pages | Persian handouts | On main |
|---|---|---|---|---|
| Any gate failure (F1–F10; smoke 1, 2, 7 or 8; a blocking live-rehearsal failure) | **the rc.3 kit** `pme-kit-release-fcf99b70`, back in the owner's folders, his notes restored (below) | `git push --force-with-lease=gh-pages:<GP> origin gh-pages-rc3:gh-pages` | `fa-handouts-rc3/` back into `pme-debrief-fa/` | nothing before the demo; a finding for a later release, or a hotfix rc.5 (R4-Q1) |
| A Persian failure only | unchanged (rc.4) | unchanged | none of rc.4 placed; the English Debrief is the reference | the strings via the skill, a re-render |

**The rc.3 row's moves** (the rc.4 versions to `$TD` first, then rc.3's back; nothing deleted):

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc4-release/env.sh
mkdir -p "$TD/owner-notes-rc4-version" "$TD/pme-debrief-fa-rc4"
mv "$S/pme-classroom-dryrun/kit" "$TD/pme-classroom-dryrun-kit-$SHA8" && cp -Rn "$S/pme-kit-release-$RC3_8/pme-showcase-kit-$RC3_8" "$S/pme-classroom-dryrun/kit"
mv "$S/pme-debrief-dryrun/pme-showcase-kit-$SHA8" "$TD/pme-debrief-dryrun-kit-$SHA8" && cp -Rn "$S/pme-kit-release-$RC3_8/pme-showcase-kit-$RC3_8" "$S/pme-debrief-dryrun/"
mv "$S/pme-classroom-dryrun/PRE-FLIGHT.md" "$S/pme-classroom-dryrun/OWN-PHONE-TEST.md" "$S/pme-debrief-dryrun/HOW-TO-CHECK-THE-PRINT.txt" "$TD/owner-notes-rc4-version/"
cp -p "$S/pme-kit-release-$RC3_8/README.txt" "$TD/owner-notes-rc4-version/README-rc3-with-fallback-line.txt"
cp -p "$TD/owner-notes-before-rc4/PRE-FLIGHT.md" "$TD/owner-notes-before-rc4/OWN-PHONE-TEST.md" "$S/pme-classroom-dryrun/"
cp -p "$TD/owner-notes-before-rc4/HOW-TO-CHECK-THE-PRINT.txt" "$S/pme-debrief-dryrun/"
cp -p "$TD/owner-notes-before-rc4/README.txt" "$S/pme-kit-release-$RC3_8/README.txt"
mv "$S"/pme-debrief-fa/*.pdf "$S/pme-debrief-fa/READ-ME-FIRST.txt" "$TD/pme-debrief-fa-rc4/" 2>/dev/null
cp -pn "$S"/pme-kit-release-$RC3_8/fa-handouts-rc3/* "$S/pme-debrief-fa/"
diff -rq "$S/pme-kit-release-$RC3_8/pme-showcase-kit-$RC3_8" "$S/pme-classroom-dryrun/kit" && echo same-rc3
```

  Expected: `same-rc3`; the four notes are the pre-rc.4 versions (they say 28 October: the orchestrator adds one line
  with the new date); `pme-debrief-fa/` holds the rc.3 handouts. The `cp -p … README.txt` is the one deliberate
  overwrite (the pre-rc.4 text, saved first). Add at the top of `$S/pme-kit-release-$SHA8/README.txt`: "NOT FOR
  TUESDAY 3 NOVEMBER: <F-number or smoke item> failed; present on pme-kit-release-fcf99b70."

**What the rc.3 kit lacks, for the presenter:** the two demo cards as rehearsed — its MH card starts induced, its
haemorrhage card is the old course (CPR at the no-pulse alarm, "Start CPR, 2 L and epinephrine", no junctional, VF or
shocks); E117; E121; pass 3 (tiles collide); F29; the FAST line. Its script: the run sheet's "Case 3 as run on 22
October" and "Reserve R4" (`git show v1.0.0-rc.3:docs/showcase/SHOWCASE-2-RUN-SHEET.md`), printed by the orchestrator.

**8.3 Re-run** on the rc.3 kit before the room dry run on Monday 2 November: the Q1 talk, Chromium (≈ 10 min), with
the **rc.3 tag's** script (the rc.4 one presses buttons rc.3 lacks) from `git -C $R/repo worktree add --detach
$R/scratch/wt-rc3-fallback $RC3_SHA`, into `KITROUND_OUTDIR=$R/scratch/rc4-release/fallback-$RC3_8`.

### Task 9 (executor; orch merges): the docs PR after the smoke

Branch `docs-rc4-release` in `scratch/wt-rc4-docs` (rebase onto `origin/main` before the push on a conflict); docs,
evidence, test tooling only. Steps 1–3 and 4.1–4.3 Sunday 1 November ≈ 14:00, **no push** (rc.3 pushed a draft here
at its brief's request: one extra CI run); the rest after the smoke: the PR opens Sunday evening or Monday; review and
merge **Monday 2 November**.

- [ ] **Step 1. The plan as run:** this file gets a status block "RUN 2026-10-31/11-02" with the deviations
  (`docs(plans): the rc.4 release day as run`).
- [ ] **Step 2. Evidence and gate notes:** (1) `q2-rc4/` (+ `relay-<SHA8>.json`), `q2-rc4-a4/` (+ the Persian
  `.fa.*` and `.verify.txt`), any `-rerun/`; a `docs/showcase/KIT-GATE.md` line: "<date>: kit round Q2 on the rc.4 kit
  `<SHA8>` — the MH-only talk and the two cards (MH; the haemorrhage reserve R5); the six-card shots not re-taken (still the rc.3 kit)"; #117's
  branch `docs-rc3-release` (closed, R4-Q2 (b)): its gate note and Q2-rc3 evidence folded in. (2)
  `docs/gates/rc4-release.md` (new), from `$W/gate-notes.md`, in the order of Tasks 0–8: freeze, PRs, dry run, tag
  commit and its run, release and assets, kit and relay and zip, the owner's folders, the Q2 tables against the prep
  run, macOS WebKit, Persian, Pages, the smoke item by item, the live rehearsal, W/E13/E14, deviations, RELEASE.md item 2.
  (3) `docs/gates/stage-12-real-phone.md` and `stage-8b.md` §11: one "rc.4 smoke check (<date>)" paragraph each.
- [ ] **Step 3. `SHOWCASE-2-MEASUREMENTS.md` §"Q2 on rc.4"** (after §"Q2 on rc.3", same shape): the talk rows beside
  rc.3's, the A4 rows beside 24 October's, the handouts, the Persian, the screenshots against rc.3's notes (a)–(c),
  Findings, Not measured.
- [ ] **Step 4. Run sheet, cue cards, presenter guide** (only where a fact changed): (1) the kit key →
  `pme-kit-release-<SHA8>/README.txt`, the fallback → `pme-kit-release-fcf99b70`, "28 October" or "4 November" →
  "3 November" where it names the demo; (2) §5 MH and the haemorrhage section: rows that moved > 2 s from A4's; (3) the
  screen after pass 3, the screenshots' paths; (4) the programme from the owner's ruling of 29 October (P29: MH only with
  three look-inside stops; the haemorrhage card reserve R5; bronchospasm and tamponade out), nothing invented; (5) smoke items 4, 7, 8 in his words,
  the checklist boxes, the W/E13/E14 rows ("Mon 2" until the room); (6) any NOTE that moves a cue.

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/wt-rc4-docs
git grep -n -E "fcf99b70 release build|1\.0\.0-rc\.3 \(pre-release\)|28 October|4 November" -- 'docs/showcase/SHOWCASE-2-*.md'
git grep -n -i "v1\.1" -- docs/showcase docs/gates/rc4-release.md
```

  Expected: no line, except where the text quotes rc.3 as history or as the fallback (say so in the PR body).
- [ ] **Step 5. Small items:** `docs/RESUME.md` (the rc.4 state); `docs/guides/known-deviations.md` (new WebKit
  retry-only lines; Step 3b failures); `validation-summary.md` if the item-2 sentence was missing; a slipped tag day:
  `CHANGELOG.md` and `CITATION.cff` dates together (`release-versions` 4/4).
- [ ] **Step 6. Checks and PR.**

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/wt-rc4-docs
npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/docs-honesty.test.ts test/release-versions.test.ts < /dev/null
node --experimental-strip-types scripts/model-docs.ts && node --experimental-strip-types scripts/known-misses.ts && git status --short docs/model docs/validation/known-misses.md
git diff --stat origin/main...HEAD -- apps packages | tail -1
git push -u origin docs-rc4-release
gh pr create -R samhv-dev/patient-monitor-engine --base main --head docs-rc4-release --title "docs: the rc.4 release day — gate note, kit round Q2 on rc.4, run-sheet updates, the owner's smoke check" --body-file ../rc4-release/pr-docs.md
```

  Expected: 7/7, 4/4; no model page; **no line** under `apps packages`; the PR open (not draft); the body: the tag and
  run, files by group, the Q2 tables, the smoke and rehearsal, W/E13/E14, "no product file changed".
- [ ] **Step 7. Review and merge.** An independent read-only review (≈ 30 min; every number against the `q2-rc4*/`
  files, no claim beyond the evidence); **(orch)** merges with `merge-one-v2.sh <PR>` on green. Then remove the
  worktrees `wt-rc4-tag`, `wt-rc4-docs`, `wt-release-rc4`, `wt-kitround-rc4`, `wt-rc4-plan`; keep the branches,
  `gh-pages-rc3`, `gh-pages-rc4` and `wt-rc2-prep` (R4-Q8).

---

## For the owner (one paragraph)

Saturday 31 October 12:00 the product is frozen; that afternoon, before the 17:30 allowance reset, it becomes
1.0.0-rc.4 and the release is rehearsed on GitHub without publishing. Sunday 1 November from ≈ 10:00 rc.4 is tagged as
a **pre-release**; from that commit the kit is rebuilt and placed in your folders (with a Windows zip), the talk (MH with
its three look-inside stops) and the two cards (MH; the haemorrhage as the reserve) are rehearsed automatically in both
browsers with three emulated phones, their Persian handouts regenerated (only the MH one printed for the day), Pages republished. The rc.3 kit stays beside it as the fallback; rc.2 is retired. Sunday evening
(or Monday 2 November morning, your choice) a guided check of ≈ 35 minutes (both demo cards' buttons and prints), then
your own rehearsal of the one case, malignant hyperthermia with its three stops; Monday 2 November the room
(Windows, router, phones). The demo is Tuesday 3 November (12 Aban). If something essential fails, you present on the
rc.3 kit, with its older two cards, and I tell you at once.

---

## What remains for the owner

- **By Saturday 31 October 12:00 (the freeze):** the haemorrhage objectives and take-home lines; the 13
  clinical-review rulings. (Ruled 24 October: the demo date, the programme R4-Q3, #117 R4-Q2, E118 post-demo.)
  **Sunday 1 November evening or Monday 2 morning:** smoke and rehearsal. **Monday 2 November:** the room (W, E14,
  E13); the docs PR's review and merge. **Persian
  reviews:** `scratch/owner-review/readme-fa-rc4.md` (and rc.2's), the terms file. **Deck pass 2** (rc.4 shots, video).

---

## Questions (R4-Q1 onward; each with the default used without an answer)

| ID | Question | Default |
|---|---|---|
| **R4-Q1** | Main not green by Sunday 1 November 12:00, or a gate fails for a product reason: (a) tag Monday 2 November by 12:00 (smoke Monday afternoon, beside the room dry run); (b) present on the rc.3 kit with its older cards; (c) a hotfix rc.5 Monday 2 November, the day before the demo | **(a)** for a red main; **(b)** for a product failure after the tag |
| **R4-Q2** | #117 (rc.3 docs, draft; whether the rc.3 smoke ran before the postponement is unverified): (a) ready with "the rc.4 smoke supersedes it", review, merge before the freeze; (b) close it and fold its gate note and Q2-rc3 evidence into the rc.4 docs PR | **ANSWERED (b)** (owner, 2026-10-24): #117 is closed; its branch `docs-rc3-release` is the rc.4 docs PR's input (Task 9 Step 2) |
| **R4-Q3** | The 3 November programme: the run sheet's table still has bronchospasm → tamponade + Debrief → MH; the rulings (2026-10-24 00:40) put haemorrhage in place of tamponade. Which segments, in which order? | **ANSWERED** (owner, 2026-10-24): two live demos only, malignant hyperthermia then class IV haemorrhage; bronchospasm and tamponade are out. Task 9 writes the table from this |
| **R4-Q4** | RELEASE.md item 2 after E117: (a) one sentence that the validation report predates it; (b) a regenerated report (`validation` ≈ 3 h, or Monday's cron run) in a PR before the freeze | **(a)**, citing Monday's run if it ran |
| **R4-Q5** | The room dry run is Monday 2 November (the dates ruling, 2026-10-24): on which Windows machine? | The owner's choice; Windows stays an untested backup until all 10 lines are ticked |
| **R4-Q6** | A3 and the six-card shots are not run at rc.4. Re-take the six-card shots after the demo, with the script updated for the new cards? | **Yes, after the demo** (≈ 56 min + a script PR) |
| **R4-Q7** | The usage reserve for the demo week (1–3 November; the weekly allowance resets Saturday 31 October 17:30, on freeze day, after the dry run): 20 % as for the old demo week, or 10 %? | **20 %** from Sunday 1 November |
| **R4-Q8** | The Pages serve check exists only in `scratch/wt-rc2-prep/scratch/pages-serve-check.mjs`. Move it to `scratch/rc4-release/`? | **No change on tag day**; after the demo |

Still open from before: E13, E14, E111.

---

## Self-review

- **The brief:** every timetable item has its step (Tasks 0–7, Timeline); "(orch)" on Task 0 Steps 1, 2, 6 and the
  merges, Tasks 1, 2, 6.3, 8.2, 9.7. From the rc.3 run: the apt step (#125, the dry run, a 30-min poll without it); the
  prebuilt kit (Task 3 Step 1's checks, log kept); Pages before the tag (lease read on the day); #117 (R4-Q2); the
  deferred Persian paragraph (Task 5 Step 3). Cut: #97, E107–E113, the prep corrections list, rc.2-only history.
- **Checked while writing:** the Q1/A4 script lines and the MH card's states; the A4 reader and the handout and
  `PEEP undefined` checks on the 24 October records; release.yml on #125's branch; the 25 files with rc.3 strings;
  `ci.yml:173/:189`; the test counts; the CHANGELOG links; the `_sandbox` inventory; Pages 0777a977; rc.3's Pages 85 files.
- **(unverified):** the edited Q1 MH segment (first run: the prep run); the A4 run time; `saadat-instructor-tiles` on
  macOS WebKit; the FAST note in the record; E121b's words; Monday's validation run; whether the rc.3 smoke ran; every
  expected time until the prep run.
