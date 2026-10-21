# The v1.0.0-rc.3 release day: version bump, tag, release, kits, rehearsal, Persian handouts, Pages, the owner's smoke — Plan

**STATUS: WRITTEN 2026-10-21 (+0330), UNREVIEWED.** Written by the planner (Opus) from the brief
`scratch/briefs/plan-rc3-release-day.md`, on `origin/main` **a8979ec9** (#107, the Windows kit launchers). Source: the rc.2
runbook (`docs/plans/rc2-release-day.md`, REVIEWED-FIXED, run on 2026-10-20; untracked in `repo/`, committed on the
draft PR #97's branch), the prep run's seven plan corrections (`scratch/plans-backup/rc2-release-day-prep.md` §5) and the
rc.2 run report (`scratch/plans-backup/rc2-release-day-run-2026-10-20.md`). Documentation only: no product file was
changed while writing it. Anything not checked against a file or a command while writing is marked **(unverified)**.

**Base and preconditions.**
- rc.2 is tagged on **b39b3d87** (`v1.0.0-rc.2`, annotated, 2026-10-20 00:17; release run 39322222807; Pages
  `gh-pages` = **36e2efd0**, the local branch `gh-pages-rc2`). The rc.2 kit is `_sandbox/pme-kit-release-b39b3d87/`:
  **it is the fallback for the demo** (Wednesday 28 October 2026). The rc.1 kit (`pme-kit-release-3db25a3b/`) is retired
  on this day (moved to `$TD`, never deleted).
- Since the rc.2 tag, main carries (rulings 2026-10-20/21): #85, #87, #93 docs; #92 FX-19; #96 README rc.2 + guard test;
  #94 Debrief nits; #95 hidden-tab pause (E82); #98 FX-23; #99 PR-L lanes; #100 PR-T tiles/header/defaults (O1–O4);
  #101 tick benchmark alone; #102 print font Inter + handout strip; #103 FX-24; #104 PR-G grid; #105 FX-25; #106, #108,
  #109 e2e hardening; #107 Windows launchers. Still to land before the freeze: the owner-words PR (take-home lines,
  README F27, known-deviations rows, kit "Room network" notes; brief `scratch/briefs/exec-owner-words-rc3.md`; number
  unknown when this was written).
- **PR #97** (the rc.2 docs PR, `docs-rc2-release`, head 9ea97ea8) is still a DRAFT: the owner's rc.2 smoke was never
  run. It carries the kit-round script's fix for the close's hang (f3cd04b1, "the close's Return-here click bounded").
  **main does not have that fix** (`kit-round-a.kitround.ts:1617` still clicks the page-wide last "Return here" with no
  time-out). Task 0 Step 2 and Task 4 Step 2 deal with it (E107).

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. The
> orchestrator does every step marked **(orch)**: merge, push the tag, push `gh-pages`. An executor does the rest and
> never tags, merges or pushes `gh-pages` (`RELEASE.md`: "executors never tag").

**Goal.** By Friday 23 October evening, with nothing changed in the product after the Thursday 18:00 freeze except the
version bump, and by Saturday 24 October late morning for the owner's part:
1. `v1.0.0-rc.3` is tagged (annotated) on a commit that is green on `main`.
2. Its GitHub release is a **Pre-release** with 8 assets whose `SHA256SUMS.txt` checks.
3. The classroom kit is rebuilt from the tag and placed in the owner's folders, with a zip for the Windows backup. The
   rc.2 kit (b39b3d87) is kept as the fallback; the rc.1 kit is retired.
4. The 30-minute talk is rehearsed automatically on the new kit in both browsers (kit round **Q2**, the rc.3 run).
5. The three Persian handouts are regenerated from that rehearsal.
6. GitHub Pages serves the tag's build.
7. Saturday morning: the owner's smoke check (≈ 30 min) and his live rehearsal on his Mac; the Windows checklist on the
   room's PC when he gets there.

After the smoke, one docs PR records all of it.

**Architecture (what builds what).**
- `.github/workflows/release.yml` (on a `v*` tag push) rebuilds the tagged commit and publishes the release:
  - it checks the tag equals `v` + `packages/renderer/package.json`'s version, and sets `PME_BUILD` to the 7-character sha;
  - it runs typecheck, notices, licences, size, two e2e files (`iife-smoke`, `vent-embed`), pack-smoke and TypeDoc;
  - its notes are the CHANGELOG section of the version, cut by an `awk` script;
  - `--prerelease` is set for any tag that contains `-`.
- `scripts/showcase/make-bundle.mjs` builds the kit: `vite build --base ./` of `apps/demo`, the relay, the macOS
  `.command` launchers, the Windows `.cmd` launchers (`kit-launchers.mjs`: CRLF, ASCII) and `server/launch.mjs`,
  `VERSION.txt` (now with a "Windows: … untested on Windows at this release" line) and `READ ME FIRST.txt` (now with a
  WINDOWS section and the owner's 10-line checklist). The app's build id is `<8-char sha>[+] <UTC date>`; the engine's
  snapshot key is `1.0.0-rc.3+dev`, so no rc.2 bookmark restores in an rc.3 kit.
- `scripts/showcase/check-relay.mjs` is the relay smoke test: the `.cmd` check, then three runs (bundled relay, relay
  under the launcher's environment, `server/launch.mjs classroom` as `Start Classroom.cmd` runs it), each with a real
  WebSocket frame. It prints "PASS (N of N runs …)"; on macOS #107 measured **4 of 4**.
- `scripts/showcase/kit-round-a.kitround.ts` (config `playwright.kit-round.config.ts`; serves the kit through its own
  `Start Classroom.command`) runs the Q1 test "30-minute talk" (opening and QR, bronchospasm with H21, tamponade with the
  Debrief printed, MH with the 13:03 press, the close) and the A3 test (the tamponade cue-card path, the learner handout).
- `scripts/showcase/rehearsal.showcase.ts` re-takes the six-card screenshots (8 tests × 2 engines).
- `scripts/showcase/debrief-fa.mjs` turns a Debrief JSON into the Persian handout (`--version`, `--fonts`, `--text`).
- Pages is the orphan `gh-pages` branch (legacy build, `/` root): the kit's `app/`, `.nojekyll`, the licence files,
  `README.md`, `VERSION.txt`. Force-pushed by the orchestrator only, with a lease.
- The merge chain is `scratch/rc2-release/merge-one-v2.sh <PR>` (PR checks complete and green → main green
  immediately before → merge → wait for main's run). Exits: 0 merged + main green; 2 main red; 3 PR failed; 4 main red
  after the merge; 5 time-out. An API time-out prints "integer expression expected" once and it keeps polling (#100).

**Spec.**
- The brief: `scratch/briefs/plan-rc3-release-day.md`.
- `RELEASE.md`: Before the tag (items 1–10; item 10 is the Windows line), Tag, After the workflow, If the workflow fails.
- The rulings: `research/00-orchestrator-rulings.md`, 2026-10-20 and 2026-10-21 entries (O1–O4, E94–E105 defaults,
  FX-23/24/25, E82 = pause, the 12:52 entry "freeze Thu 18:00 (product), tag Fri 12:00", the 18:01 snapshot).
- The rc.2 runbook, its prep §5 and its run report (above); `scratch/rc2-release/gate-notes.md` (the rc.2 values).
- `scratch/plans-backup/windows-kit-run.md` (the Windows checklist); `docs/gates/saadat-pr-g/`, `fx23/`, `fx25/` (the screens).

---

## Global Constraints

- **Freeze.** No product change after **Thursday 22 October 18:00 (+0330)**, in any branch, except the version-bump PR
  (Task 0). After the tag, only docs: the docs PR (Task 9) and other post-tag docs, each after main green.
  The kit-round script is test tooling that ships in no kit, so its edits (Task 4 Step 2) are allowed and land in the
  docs PR.
- **Never edit the main checkout** `repo/`. `git fetch`, `git tag` and `git push` of a tag or of `gh-pages` from it are
  fine. Read and build only in the worktrees named here.
- **Shell.**
  - Never a command that waits on stdin: no `gh run watch` without a run id, no `git commit` without `-m`, no
    `git revert` without `--no-edit`, no heredoc (write files with the editor tool). Long runs end with `< /dev/null`.
  - In an agent's Bash tool `grep` may be ugrep, which rejects some BRE: use `grep -E` (prep correction 3).
  - Never an unfiltered `pkill`. To stop the classroom server, close its terminal; the kit-round setup stops its own
    launcher. To stop a hung Playwright run: `pgrep -fl "playwright test"`, then `kill -INT <that pid>`.
  - One e2e or kit-round run at a time on this Mac (`pgrep -fl "playwright test" | grep -v pgrep` first: nothing).
  - Every local Playwright run: `env -u CI` (a `CI` variable anywhere in the environment turns on CI-only skips;
    prep correction 4) and `--reporter=list`.
- **gh** commands name the repository (`-R samhv-dev/patient-monitor-engine`).
- **Variables.** Shell state does not persist between commands: Task 1 Step 1 writes `scratch/rc3-release/env.sh`, and
  every later block starts with `. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh`.
- **Nothing is deleted.** Old kits, PDFs and folders are MOVED to `$TD`
  (`/Users/samhv/Desktop/Claude/_to_delete/rc3-release-day-<date>/`). The rc.2 kit folder
  `_sandbox/pme-kit-release-b39b3d87/` stays where it is: it is the fallback.
- **Words.** "pre-release" every time the version is named; "For education only. Not a medical device and not clinically
  validated"; no claim the product has not earned; future work is "a later release", never "v1.1"; new Persian text only
  with the `persian-writing` skill, and only by the orchestrator (the rc.2 rule: the executor writes none).
- **Downloads.** Task 2 Step 4 downloads the project's own 8 release assets (≈ 8 MB on disk at rc.2) from its GitHub
  release into a new empty folder. Nothing else is downloaded.
- **Commit trailer.** Commits made from this plan end with the trailer the session's attribution rule names.

---

## Decisions this plan makes where the brief or the rulings were silent

1. **One case, not four.** There is no Debrief-B branch this time: `TAG_SHA` is `origin/main` after the bump PR's merge,
   green. If main is not green by **Friday 14:00**, there is no rc.3 tag that day: the demo stays on the rc.2 kit (the
   rollback line, Task 8) and the orchestrator rules on a later tag (E109).
2. **The kit's `READ ME FIRST.txt` gets a 5-line "THIS KIT" block appended after the build** (Task 3 Step 3), once, in
   `$KIT`, before any copy, as at rc.2 (changing the template would be a product change after the freeze).
3. **The rehearsal keeps the name Q2** (the brief) with its own folders: `docs/showcase/kit-round-a/q2-rc3/` (first
   run), `q2-rc3-a3/` (the A3 test), `q2-rc3-rerun/` (Task 8.1). One output folder per run, never in place
   (`KITROUND_TAG` renames only the per-segment JSON/MD). Its write-up is MEASUREMENTS §"Q2 on rc.3" (E112).
4. **The kit-round close fix travels with #97 or by cherry-pick** (Task 4 Step 2): if #97 is merged before the tag, the
   tag's script has it; if not, `git cherry-pick -x f3cd04b1` in the docs worktree. Without it the talk hangs in the
   close on both engines (rc.2 cost ≈ 36 min).
5. **The A3 test runs every time** (at rc.2 only in the B cases): it is the only automated print of the learner handout,
   which rc.3 changes (print font, course strip, take-home lines).
6. **A Windows zip** of the rc.3 kit is made in `$S/pme-kit-release-<SHA8>/` (Task 3 Step 4b): the WINDOWS section starts
   from a zip ("Unblock", "Extract All"). It is not a release asset; macOS `zip` keeps the `.cmd` files byte for byte.
7. **The demo does not depend on the GitHub release.** Kits, rehearsal, Persian and Pages build from the tag. A failed
   release workflow is fixed after the demo; the tag is not moved (a moved tag would no longer name the kits' commit).
8. **Pages follows the demo kit**: the tag normally; if Task 8 moves the demo to the rc.2 kit, `gh-pages-rc2` (36e2efd0)
   is pushed back.
9. **The rc.2 Persian handouts move into the rc.2 fallback folder** (`pme-kit-release-b39b3d87/fa-handouts-rc2/`); the
   rc.2 print set `_sandbox/pme-debrief-rc2/` stays where it is (it is the fallback's), and rc.3's goes to
   `_sandbox/pme-debrief-rc3/`.
10. **The owner's folders are inventoried before any `mv` or `cp`; every placement copy is `cp -n`; his notes are copied
    to `$TD/owner-notes-before-rc3/` before they are edited**, and Task 8 restores them.
11. **A prep run on the frozen candidate on Thursday evening** (Task 0 Step 5): the rc.2 prep run found seven plan
    errors and the rc.2 tag-day run found an eighth (the close's hang). rc.3 changes the whole monitor screen and the
    print, so the talk, the A3 handout and the Persian render are tried once on `FREEZE_SHA` before tag day.

---

## What rc.3 adds: where it is observed, what "pass" looks like

| rc.3 item (PRs) | Observed in | Pass |
|---|---|---|
| **Saadat-like at photo fidelity**: grid layout (#104), lanes (#99), tiles/header/defaults (#100) | Task 4 Step 4 (six `q2-*-monitor-*.png`), Step 6 (six-card shots), smoke items 2–3 | The structure of `docs/gates/saadat-pr-g/after-co2-ventilated-1280x800.png`: two-row header over the waves, ≈ 64 % wave area, six lanes (ECG II labelled, ECG 2 unlabelled, CO₂ filled yellow, IBP1/IBP2 with dotted scale lines, pleth "NORMAL X1"), speed labels at the right of each lane, the PR tile at the top edge, NIBP block + T column, EtCO₂ row, IBP rows, BFI row, full-width bottom strip (%SPO2, PI). Red limits beside the values |
| — blank tiles for unconnected probes (O1) | smoke item 2 (free play); Q2 MH and bronchospasm shots (no CVP line) | Labels with blank values (T2/DT, BFI%/BS%/SQI%/EMG%, IBP1/IBP2 in free play; IBP2 in MH and bronchospasm), not `---`; a blank lane where no sensor is attached is NOT F9 (prep correction 5) |
| — NIBP default AUTO 5 min (O2, E95: Saadat-like and its preset only) | smoke item 2 | The NIBP tile shows "AUTO(5Min)" and a result with its time; Settings with another skin keeps the idle cuff (not checked on the day) |
| — IBP off by default (O3) | smoke item 2 | Free play: IBP1 and IBP2 lanes empty, tiles blank; the showcase cards attach their lines (tamponade: ART + CVP; MH, bronchospasm: ART) |
| — RR until the capnograph is attached (O4, E94) | smoke items 2–3; Q2 bronchospasm shot (the Ventilator view attaches the line) | Free play: a RESP lane and an RR tile (BrPM). After "CO₂ sampling line" on: the lane becomes CO₂ and the tile EtCo2 \| FiCo2 \| AWRR |
| **FX-25** CO₂ lane after attach (#105) | smoke item 3; Q2 bronchospasm shot; Task 4 Step 3b (`fx25-co2-attach.e2e.ts`, macOS WebKit) | The CO₂ lane starts blank at the attach point and fills from there; never a solid yellow block |
| **FX-23** fast-forward UI (#98) | smoke item 5 | During: the double chevron in a blinking amber ring, no clock text beside it, no times on the progress bar, the mute icon alone. After: a banner ≈ 25 % larger, three lines "Fast-forwarded 5 min" / "mm:ss → mm:ss" / the alarms or "No alarms"; no vertical seam marks with time labels on the lanes |
| **FX-24** follower after fast-forward / join (#103) | smoke items 2 and 5 (his phone); Task 4 Step 3b (`fx24-follower-after-fast-forward.e2e.ts`) | The phone's lanes sweep at the cursor (no compressed waves) and its ECG gain does not jump to X4 |
| **Hidden-tab pause** (#95, E82 = pause) | smoke item 6; Task 4 Step 3b (`fx14-pause-while-hidden.e2e.ts`) | Tab hidden ≈ 10 s: the phone shows "(paused)"; back: the toast "Paused while this tab was hidden (…)" and the clock runs again. A session he had paused stays paused |
| **Print font Inter + handout strip** (#102) | Task 4 Step 3c (A3 handout PDF), Q2 tamponade PDF; smoke item 7 | Handout 1 A4 page; tamponade report ≤ 6 pages (rc.2: 6); `pdffonts` lists an Inter face (unverified: the embedded name) ; the strip's labels read (≈ 6.4 pt) and "ART M / NIBP M" do not run into the scale |
| **Tick benchmark alone in CI** (#101) | Task 1 Step 2 | The tag commit's main run: the build job's step "tick benchmark (alone)" is `success` |
| **e2e hardening** (#106, #108, #109; WebKit retries warn-only) | Task 1 Step 2 | Chromium: no retry-only pass (enforced). WebKit: each retry-only line listed in the gate note; a new one goes to `known-deviations.md` in Task 9 |
| **Windows launchers, untested** (#107) | Task 3 Steps 1–2, 4b; smoke item W (the owner's checklist, on the room's PC) | Kit lists `Start Classroom.cmd` and `Start Simulator.cmd`; relay PASS 4 of 4; zip keeps CRLF; the release notes carry "untested on Windows at this release" (RELEASE.md item 10) until all 10 checklist lines are ticked |
| **Take-home lines** in the three cards, Persian drafts unreviewed (owner-words PR) | Task 4 Step 3c (tamponade handout); smoke item 7 (MH handout); Task 5 | The English handout prints the owner's three lines per card (tamponade: "Drainage is the treatment: plan it before the pressure falls."). Persian: see Task 5 Step 1 (the brief says the Persian handout prints blank lines for unreviewed entries: **unverified**, see there) |
| **README / known-deviations** (owner-words PR, #96) | Task 1 Step 3 | README names `1.0.0-rc.3` twice and no other rc (`release-versions` 4/4); the "not yet been tested with a real phone" sentence (F27) is gone; known-deviations rows for #106, #108, #109, `vent-view-new-patient` and E82 exist |

**Rollback line.** If the tag build fails the rehearsal gate or the owner's smoke (Task 7 items 1, 2 or 7), **the rc.2
kit (b39b3d87) is the demo build and Pages stays at (or returns to) rc.2** (36e2efd0). Task 8 says how.

---

## Timeline

```
Thu 22  ≤ 18:00  product freeze: the owner-words PR and any owner-found fix merged; main green → FREEZE_SHA (orch)
        18:00    Task 0: #97 settled (E107); the version-bump PR prepared (executor ≈ 1 h), its CI ≈ 35 min
        18:30    Task 0 Step 5: prep run on FREEZE_SHA (executor, machine exclusive ≈ 1 h)
        ≈ 20:30  (orch) merge the bump PR (merge-one-v2.sh); main CI ≈ 35 min → main green = the rc.3 commit
Fri 23  12:00    Task 1 → Task 2 (orch): tag, release workflow ≈ 5 min, assets
        12:20    Task 3 (executor): kits, relay 4/4, READ ME, placement, zip, embed                ≈ 1 h
        13:20    Task 4: Q2 talk ×2, macOS WebKit e2e, A3, six-card shots                       ≈ 2.5 h
        15:50    Task 5: Persian ≈ 0.5 h → Task 6: Pages ≈ 0.5 h (the push by orch)
        ≈ 17:00  Task 9 Steps 1–3 and 4.1–4.4 in the worktree (no push)
        17:30    the weekly usage allowance resets (rulings 18:15): tag-day work before it must fit the reserve
Sat 24  09:00    Task 7: the owner's smoke check ≈ 30 min, then his live rehearsal ≈ 45 min (his Mac)
        ≈ 11:00  Task 9 Steps 4.5–6: the smoke results in, the docs PR opens (CI ≈ 35–45 min)
Sun 25  ≤ 12:00  Task 9 Step 7: review → merge
≤ Tue 27         the Windows checklist on the room's PC (owner; E111); E14 router test
Wed 28           Demo: the rc.3 kit, the rc.2 kit beside it on the stick
```

A gate failure in Task 4 sends the day to Task 8 (≈ 1 h on Friday: the rc.2 kit is already built and placed). A failure
in the Saturday smoke does the same before noon.

---

## Effort, CI and who does what

| Task | Who | Hours | CI / machine | Owner |
|---|---|---|---|---|
| 0 Freeze record, #97, version-bump PR, prep run | executor + orch (merge) | 1.0 + 1.0 prep | bump PR 1 run + main 1 run ≈ 35 min each; prep ≈ 1 h machine | — |
| 1 Verify the tag commit | orch | 0.25 | install ≈ 3 min, 2 tests ≈ 1 min | — |
| 2 Tag, release workflow, assets, SHA256SUMS, Pre-release | orch | 0.4 | **release.yml 1 run ≈ 5 min** (rc.2: ≈ 5 min) | — |
| 3 Kits, relay, READ ME, placement, zip, embed | executor | 1.0 | build ≈ 4 min, relay ≈ 1–2 min | — |
| 4 Q2 talk (both engines) + macOS WebKit e2e + A3 + six-card shots | executor | 2.5 | machine exclusive ≈ 1.8 h: talk ≈ 10 min × 2, e2e ≈ 6 min, A3 ≈ 8 min, **six cards ≈ 56 min** (prep correction 1: 55.5 min with one worker) | — |
| 5 Persian handouts | executor (+ orch for the Persian paragraph) | 0.5 | ≈ 3 min | — |
| 6 Pages republish | executor (tree) + orch (push) | 0.5 | Pages build ≈ 1–10 min | — |
| 7 Owner's smoke + live rehearsal + Windows checklist | owner (orch guides) | 0.5 | — | ≈ 30 min smoke, ≈ 45 min rehearsal, ≈ 20 min Windows |
| 8 Rollback (only on a failure) | orch + executor | 1.0 | Chromium talk on the rc.2 kit ≈ 15 min | — |
| 9 Docs PR + independent review | executor + reviewer | 2.0 + 0.5 | **2 runs** (PR, then main) ≈ 35–45 min each | — |
| **Total without rollback** | | **≈ 10 h** (orch ≈ 1.5, executor ≈ 8, reviewer 0.5) + owner ≈ 1.5 h | **5 runs** (bump 2, release 1, docs 2) + WebKit re-runs | |

This week CI WebKit needed 2–3 attempts on several runs (rulings 2026-10-21 05:22–14:34): budget one re-run (≈ 35 min)
for each of the 4 CI runs.

---

## Tasks

### Task 0 (executor prepares, orch merges): the freeze, #97, the version bump, the prep run — Thursday 22 October

- [ ] **Step 1 (orch). Record the freeze.** At 18:00 (or when the last product PR's main run is green, whichever is
  later): `git -C $R/repo fetch -q && git -C $R/repo rev-parse origin/main` → `FREEZE_SHA`; its push run must be
  `completed`/`success` (`gh run list -R samhv-dev/patient-monitor-engine --workflow ci --commit <FREEZE_SHA> --event push
  --json status,conclusion`). Write one line in the rulings file: the sha, the run id, the PRs in it since a8979ec9 (the
  owner-words PR expected). From here no product PR merges.
- [ ] **Step 2 (orch). #97 (E107).** Default: mark #97 ready with one line in its body ("the rc.2 owner smoke did not
  run; rc.3's smoke on 24 October supersedes it"), run its review, merge it with `merge-one-v2.sh 97` BEFORE the bump PR
  (docs and test tooling only; it is allowed after the freeze). Then the tag's kit-round script has the close fix.
  If #97 is not merged before the bump PR's merge, Task 4 Step 2 cherry-picks f3cd04b1.
- [ ] **Step 3 (executor). The version-bump PR.** The same 25 files as rc.2's b22d5b33, plus README:

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo && git fetch -q
git worktree add -b release-rc3 ../scratch/wt-release-rc3 origin/main
cd ../scratch/wt-release-rc3 && npx -y pnpm@9.15.9 install --frozen-lockfile --prefer-offline < /dev/null > ../wt-release-rc3.install.log 2>&1; tail -1 ../wt-release-rc3.install.log
git grep -l -E '1\.0\.0-rc\.2' -- packages apps/demo/e2e README.md | xargs sed -i '' 's/1\.0\.0-rc\.2/1.0.0-rc.3/g'
git grep -n -E '1\.0\.0-rc\.2' -- packages apps README.md CITATION.cff | wc -l
git diff --stat | tail -1
```

  Expected: install done; after the `sed`, only `CITATION.cff:version` remains (`1`); the diff is ≈ 26 files (7
  `package.json`, 6 constants, their tests, `engine-core/test/version.test.ts` ×4 lines, two e2e files, the
  `release-versions` comment, README's status line and embed asset name). Then with the editor:
  1. `CITATION.cff`: `version: 1.0.0-rc.3` and `date-released: "2026-10-23"` (E108).
  2. `CHANGELOG.md`: under `## [Unreleased]` (left empty, as at rc.2), insert `## [1.0.0-rc.3] - 2026-10-23` (a hyphen:
     the `release-versions` parser), then the pre-release paragraph modelled on rc.2's ("Third public **pre-release**
     (release candidate) of a teaching simulator. It is for education only: it is not a medical device and it is not
     clinically validated. It is not the final 1.0.0: the calibration pass and the blind realism review have not run.
     The known limitations listed under 1.0.0-rc.2 and 1.0.0-rc.1 still apply, except where this section says
     otherwise."), then every subsection that was under Unreleased (Added, Changed, Fixed), then `### Known
     limitations` with at least:
     - "Windows launchers (`.cmd`): untested on Windows at this release" (RELEASE.md item 10, word for word);
     - the kit is still built from a source checkout, not a release asset (as rc.2);
     - not run: RELEASE.md items 8 and 9 (as rc.2);
     - browser coverage: the WebKit retry rule still warns, until the demo (as rc.2);
     - a hidden instructor tab pauses the session (E82; the proper fix is for a later release) — replacing rc.2's FX-15
       line if the owner-words PR did not already word it;
     - the Persian handout is a script and its take-home lines are unreviewed drafts (only if the owner-words PR ships
       them; else omit);
     - the owner's checks: the rc.3 smoke after the tag, recorded in the gate notes.
     Update the link lines at the bottom: `[Unreleased]: …compare/v1.0.0-rc.3...HEAD` and a new
     `[1.0.0-rc.3]: …compare/v1.0.0-rc.2...v1.0.0-rc.3`.
  3. `docs/roadmap/v1.0-remaining.md:3`: "State on 2026-10-23 (release candidate `1.0.0-rc.3`)".
  4. `.github/workflows/ci.yml:118` and `:134` name "the v1.0.0-rc.2 demo": reword both to "the demo of 28 October"
     (E110; text only).

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/wt-release-rc3
npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/release-versions.test.ts test/docs-honesty.test.ts --reporter=dot < /dev/null
node --experimental-strip-types scripts/model-docs.ts && node --experimental-strip-types scripts/known-misses.ts && git status --short docs/model docs/validation/known-misses.md
npx -y pnpm@9.15.9 typecheck < /dev/null > ../wt-release-rc3.typecheck.log 2>&1; tail -2 ../wt-release-rc3.typecheck.log
awk -v v="1.0.0-rc.3" 'index($0, "## [" v "]") == 1 {on = 1; next} /^## \[/ || /^\[[^]]+\]: / {on = 0} on' CHANGELOG.md | head -4
awk '/^## \[Unreleased\]/{on=1;next} /^## \[/{on=0} on' CHANGELOG.md | grep -c '[^[:space:]]'
```

  Expected: `release-versions` **4 passed** (the README test is the fourth) and `docs-honesty` 7 passed; model docs:
  commit any regenerated page (the house rule: regenerate even for test-only changes); typecheck clean; the notes start
  with a blank line then "Third public **pre-release** …"; `0`. Commit (`chore(release): version 1.0.0-rc.3 in every
  library package; CHANGELOG and CITATION dated 2026-10-23`), push `release-rc3`, open the PR (not draft) titled
  `release: 1.0.0-rc.3 version bump`. **Never merge.**
- [ ] **Step 4 (orch). Merge the bump PR** with `bash $R/scratch/rc2-release/merge-one-v2.sh <PR>` (after #97, Step 2).
  Exit 0 = merged and main green: that merge commit is the rc.3 commit. Exit 4 (main red after the merge): classify
  the failed job (this week's WebKit timing class, or tick-bench), `gh run rerun <id> -R $GHR --failed`, at most twice.
- [ ] **Step 5 (executor). The prep run on `FREEZE_SHA`** (Decision 11; machine exclusive; nothing placed, committed or
  pushed; outputs in `$R/scratch/rc3-release/prep/`):

```bash
mkdir -p /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/prep
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo && git worktree add --detach ../scratch/wt-rc3-prep <FREEZE_SHA>
cd ../scratch/wt-rc3-prep && npx -y pnpm@9.15.9 install --frozen-lockfile --prefer-offline < /dev/null > ../rc3-release/prep/install.log 2>&1
P=/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/prep
node scripts/showcase/make-bundle.mjs "$P/kit" < /dev/null > $P/kit-build.log 2>&1; tail -3 $P/kit-build.log
node scripts/showcase/check-relay.mjs "$P/kit" --json $P/relay.json < /dev/null | tail -1
git fetch -q origin docs-rc2-release && git cherry-pick -x f3cd04b1 2>&1 | tail -1    # only if: grep -c returnClicked scripts/showcase/kit-round-a.kitround.ts prints 0
env -u CI SHOWCASE_KIT="$P/kit" KITROUND_OUTDIR=$P/q2 npx playwright test -c scripts/showcase/playwright.kit-round.config.ts -g "Q1 30-minute talk" --project=chromium --reporter=list < /dev/null > $P/q2-chromium.log 2>&1; tail -4 $P/q2-chromium.log
env -u CI SHOWCASE_KIT="$P/kit" KITROUND_OUTDIR=$P/a3 npx playwright test -c scripts/showcase/playwright.kit-round.config.ts -g "A3 tamponade: the cue card path" --project=chromium --reporter=list < /dev/null > $P/a3.log 2>&1; tail -4 $P/a3.log
node scripts/showcase/debrief-fa.mjs $P/q2/debrief-q1-1-*-chromium.json $P/q2/debrief-q1-2-*-chromium.json $P/q2/debrief-q1-4-*-chromium.json --version 1.0.0-rc.2 --fonts /Users/samhv/.claude/plugins/cache/persian-writing/persian-writing/1.4.0/assets/fonts --text < /dev/null > $P/fa.log 2>&1; cat $P/fa.log
```

  (The cherry-pick is in a detached prep worktree, never pushed. `--version 1.0.0-rc.2` because the candidate still
  says rc.2.) Expected: kit ready; relay **PASS (4 of 4 runs …)** (unverified count on this day; #107 measured 4 of 4);
  talk `1 passed` in ≈ 10 min; A3 `1 passed`; Persian `0 strings without translation` ×3. Look at the three
  `q2-*-monitor-chromium.png` against the table above. **Any surprise is reported to the orchestrator the same evening**
  (a script that no longer reads the new tiles, a new English string the Persian table lacks, a page count): a script
  fix is test tooling (it goes into the docs worktree on Friday); a missing Persian string is added by the orchestrator
  through the skill as `reviewed: false` in a docs PR before the tag. Remove the prep worktree afterwards
  (`git -C $R/repo worktree remove --force $R/scratch/wt-rc3-prep`; regenerable).

### Task 1 (orch): verify the tag commit — Friday 12:00

- [ ] **Step 1. Variables** (`printf`, no heredoc):

```bash
mkdir -p /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo && git fetch -q origin --tags
TAG_SHA=$(git rev-parse origin/main)
printf 'R=%s\nS=%s\nW=%s\nTD=%s\nFREEZE_SHA=%s\nTAG_SHA=%s\nSHA8=%s\nV=v1.0.0-rc.3\nGHR=samhv-dev/patient-monitor-engine\nKIT=%s\nRC2_SHA=b39b3d8774b55ecf0f278e2f977ad865d0820bd0\nRC2_8=b39b3d87\n' \
  /Users/samhv/Desktop/Claude/projects/patient-monitor-engine /Users/samhv/Desktop/Claude/_sandbox \
  /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release \
  "/Users/samhv/Desktop/Claude/_to_delete/rc3-release-day-$(date +%F)" <FREEZE_SHA> "$TAG_SHA" "${TAG_SHA:0:8}" \
  "/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/kit/pme-showcase-kit-${TAG_SHA:0:8}" \
  > /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
cat /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
```

  Expected: twelve lines; `TAG_SHA` is 40 hexadecimal characters, `SHA8` its first 8.
- [ ] **Step 2. Main green on the commit; only the bump (and docs) since the freeze.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
cd $R/repo
git merge-base --is-ancestor "$FREEZE_SHA" "$TAG_SHA" && echo has-freeze
git log --oneline --first-parent "$FREEZE_SHA".."$TAG_SHA"
git diff --stat "$FREEZE_SHA" "$TAG_SHA" -- apps packages scripts .github | tail -1
gh run list -R $GHR --workflow ci --commit "$TAG_SHA" --event push --json databaseId,status,conclusion
gh run view <run id> -R $GHR --json jobs --jq '.jobs[] | select(.name=="build") | .steps[] | select(.name=="tick benchmark (alone)") | .conclusion'
git ls-remote --tags origin "$V*"
```

  Expected: `has-freeze`; the log lists the bump PR's merge (and #97's and any other docs PR's); the diff under
  `apps packages scripts .github` is the version strings (and #97's kit-round lines, if merged) and nothing else; one
  run `completed`/`success`; `success` (#101); no remote tag yet. Record the run id. Then list the retry-only passes:

```bash
gh run view <run id> -R $GHR --log 2>/dev/null | grep -i "passed only on retry" | sort -u | head -20
gh run view <run id> -R $GHR --log 2>/dev/null | grep "e2e (chromium)" | grep -E "fx16-follower-beep-gate|fx24-follower|fx25-co2-attach|fx14-pause" | grep -i -E "passed|✓|flaky|retry" | head -8
```

  Expected: no Chromium line (enforced); WebKit lines go to `$W/gate-notes.md`, and any not already in
  `docs/guides/known-deviations.md` to Task 9. FX-16 passes on the first attempt in `e2e (chromium)` (it skips WebKit
  under `CI`, `fx16-follower-beep-gate.e2e.ts:67`; Task 4 Step 3b runs it on macOS WebKit).
- [ ] **Step 3. The release files on the commit.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
git -C $R/repo show "$TAG_SHA:CHANGELOG.md" | grep -n -E '^## \[(Unreleased|1\.0\.0-rc\.3)\]'
git -C $R/repo show "$TAG_SHA:CHANGELOG.md" | awk '/^## \[Unreleased\]/{on=1;next} /^## \[/{on=0} on' | grep -c '[^[:space:]]'
git -C $R/repo show "$TAG_SHA:CITATION.cff" | grep -E '^(version|date-released):'
git -C $R/repo show "$TAG_SHA:CHANGELOG.md" | awk -v v="1.0.0-rc.3" 'index($0, "## [" v "]") == 1 {on = 1; next} /^## \[/ || /^\[[^]]+\]: / {on = 0} on' > $W/NOTES-preview.md
head -3 $W/NOTES-preview.md; grep -c -E "not clinically validated|untested on Windows at this release" $W/NOTES-preview.md; grep -c -i "v1\.1" $W/NOTES-preview.md
git -C $R/repo show "$TAG_SHA:README.md" | grep -c -E '1\.0\.0-rc\.3'; git -C $R/repo show "$TAG_SHA:README.md" | grep -c "not yet been tested with a real phone"
git -C $R/repo show "$TAG_SHA:docs/guides/known-deviations.md" | grep -c -E "#106|#108|#109|vent-view-new-patient|E82"
```

  Expected: `## [Unreleased]` then `## [1.0.0-rc.3] - 2026-10-23`; `0`; `version: 1.0.0-rc.3` and
  `date-released: "2026-10-23"`; a blank line then "Third public **pre-release** …"; ≥ 2; `0`; ≥ 2 (status line and
  asset name); `0` (F27; **unverified**: depends on the owner-words PR); ≥ 5 (unverified, same). A miss in the last two
  is recorded in the gate note and fixed in Task 9; it is not a reason to hold the tag. A wrong notes body is corrected
  after the workflow with `gh release edit $V -R $GHR --notes-file <corrected NOTES>` (the body only, never an asset).

  **RELEASE.md item 2** (physiology since rc.2): `git -C $R/repo diff --stat "$RC2_SHA" "$TAG_SHA" --
  packages/engine-core/src | tail -1`, and read the changed files. Expected (unverified): only the version and the NIBP
  device events (#100: `mode`, `intervalMin`, the `nibp manual` action), no physiology; then the rc.1 validation report
  (e737de92) still stands, one line in the gate note. If more changed, name the files and say why the report stands or
  that it is older (Task 9's `validation-summary.md` line). Items 1, 3, 4 are above; 5 is re-run by `release.yml`; 8 and
  9 are stated as not run; 10 is the Windows line.
- [ ] **Step 4. Versions on a clean worktree of the commit** (also the kit's build tree):

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
git -C $R/repo worktree add --detach $R/scratch/wt-rc3-tag "$TAG_SHA"
cd $R/scratch/wt-rc3-tag && npx -y pnpm@9.15.9 install --frozen-lockfile --prefer-offline < /dev/null > $W/install-tag.log 2>&1; tail -1 $W/install-tag.log
npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/release-versions.test.ts test/docs-honesty.test.ts --reporter=dot < /dev/null
node -p "require('./packages/renderer/package.json').version"
git status --porcelain --untracked-files=no | wc -l
```

  Expected: install done; `release-versions` **4 passed**, `docs-honesty` 7 passed; `1.0.0-rc.3`; `0`.

### Task 2 (orch): the tag, the release workflow, the assets, the Pre-release flag

- [ ] **Step 1. Tag (annotated) and push.** Plain words, no feature named.

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
cd $R/repo
git tag -a "$V" "$TAG_SHA" -m "patient-monitor-engine $V (pre-release): third release candidate for v1.0. Education only; not a medical device and not clinically validated."
git cat-file -t "$V"; git rev-parse "$V^{commit}"
git push origin "$V"
git ls-remote --tags origin "$V*"
```

  Expected: `tag`; `$TAG_SHA`; `* [new tag] v1.0.0-rc.3 -> v1.0.0-rc.3`; the remote lists `refs/tags/v1.0.0-rc.3` and
  `^{}` = `$TAG_SHA`. Record the push time.
- [ ] **Step 2. The release workflow.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
gh run list -R $GHR --workflow release --commit "$TAG_SHA" --limit 1 --json databaseId,headBranch,status
gh run watch <databaseId> -R $GHR --exit-status --interval 30
```

  Expected: `headBranch` `v1.0.0-rc.3`; exit 0 in ≈ 5 min. An empty list in the first seconds: repeat every 10 s.
  If it fails:
  - **a failed e2e step** (`iife-smoke` or `vent-embed` on WebKit): `gh run rerun <id> -R $GHR --failed`, at most twice
    (the release step is last: nothing is published yet);
  - **any other failure, or a third e2e failure:** no release exists. Do not move the tag, do not change `main`
    (Decision 7). Carry on with Tasks 3–7 and take Task 3 Step 6's local-build path for the embed. Fix after the demo
    (`RELEASE.md` "If the workflow fails").
- [ ] **Step 3. The release page.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
gh release view "$V" -R $GHR --json isPrerelease,isDraft,name,tagName,assets --jq '{isPrerelease,isDraft,name,tagName,n:(.assets|length),assets:[.assets[].name]|sort}'
gh release view "$V" -R $GHR --json body --jq .body | head -4
gh api repos/$GHR/releases/latest --jq .tag_name
```

  Expected: `isPrerelease: true`, `isDraft: false`, `name: "patient-monitor-engine v1.0.0-rc.3"`, `n: 8`; assets
  `LICENSE`, `LICENSES.zip`, `NOTICES.md`, `SHA256SUMS.txt`, `api-reference-v1.0.0-rc.3.zip`, `patient-monitor.iife.js`,
  `patient-monitor.iife.js.map`, `ventilator-monitor-embed-v1.0.0-rc.3.zip`; the body starts with the pre-release
  paragraph; the last command fails with `HTTP 404` (a pre-release is never "Latest"). github.com shows the orange
  **Pre-release** label.
- [ ] **Step 4. SHA256SUMS** (the 8 assets into a new empty folder; if an executor finds `$W/assets` absent, it runs
  this step itself, as on 20 October):

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
mkdir $W/assets && gh release download "$V" -R $GHR -D $W/assets
cd $W/assets && wc -l < SHA256SUMS.txt && shasum -a 256 -c SHA256SUMS.txt
head -c 48 patient-monitor.iife.js; echo
unzip -l "ventilator-monitor-embed-$V.zip" | grep -E ' (LICENSE|NOTICES\.md|LICENSES/Apache-2\.0\.txt|ventilator-monitor\.html)$' | wc -l
unzip -l "api-reference-$V.zip" | grep -c -E ' (NOTICES\.md|TYPEDOC-ASSETS-LICENSE-Apache-2\.0\.txt|lunr-[^ ]*\.txt)$'
```

  Expected: `7`, then 7 lines `: OK`; `/*! patient-monitor-engine 1.0.0-rc.3`; `4`; ≥ 3. Record the run id,
  `publishedAt` and the IIFE size (`wc -c`; rc.2 695,037 B) in `$W/gate-notes.md`.

### Task 3 (executor): the kits, the relay, the READ ME, the owner's folders, the Windows zip, the H22 embed

- [ ] **Step 1. Build the kit from the tag's clean worktree.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
cd $R/scratch/wt-rc3-tag && git rev-parse HEAD && git status --porcelain --untracked-files=no | wc -l
node scripts/showcase/make-bundle.mjs "$KIT" < /dev/null > $W/kit-build.log 2>&1; tail -14 $W/kit-build.log
sed -n '2,3p' "$KIT/VERSION.txt"; grep -c "^Windows:" "$KIT/VERSION.txt"
grep -h -o -E '"[0-9a-f]{8}\+? 20[0-9-]*"' "$KIT"/app/assets/*.js | sort -u
grep -l -E '1\.0\.0-rc\.3' "$KIT"/app/assets/*.js | wc -l
grep -l -E '1\.0\.0-rc\.[12]' "$KIT"/app/assets/*.js | wc -l
ls "$KIT"
```

  Expected: `HEAD` = `$TAG_SHA`, `0`; "Kit ready: …"; `Commit:   <TAG_SHA>` with no "(with uncommitted changes)" and
  `Branch:   HEAD`; `1`; one build id `"<SHA8> <UTC date>"` with no `+` (prep correction 3: the `-E` form); ≥ 1 (rc.2: 3);
  `0` (a non-zero count is judged in Task 4 Step 4: any older rc on screen is F3); the listing includes `Start
  Classroom.cmd`, `Start Simulator.cmd`, `Start Classroom.command`, `Start Simulator.command`, `app`, `server`.
- [ ] **Step 2. The relay smoke test.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
cd $R/scratch/wt-rc3-tag && node scripts/showcase/check-relay.mjs "$KIT" --json $W/relay-$SHA8.json < /dev/null | tail -8
```

  Expected: `ok  Start Classroom.cmd: CRLF, ASCII, runs server\launch.mjs` and the same for `Start Simulator.cmd`, then
  `classroom relay smoke test: PASS (4 of 4 runs; node v…; kit <the $KIT path>)` (the line prints the kit's path,
  whatever its folder is called: prep correction 6). Not a full pass: gate failure F2 (Task 8); do not place the kit.
- [ ] **Step 3. The READ ME block (Decision 2).** With the editor, append to `$KIT/READ ME FIRST.txt`:

  ```

  THIS KIT (added after the build)
     Version 1.0.0-rc.3 (pre-release), build <SHA8> <build date>: the Start screen shows the version; every Debrief page's footer shows the version and the build.
     For education only. Not a medical device and not clinically validated: never use it for patient care.
     Bookmarks and saved sessions from rc.2 kits (pme-showcase-kit-b39b3d87) and older will not restore here: take new ones.
     Keep the rc.2 kit beside this one as the fallback; do not mix the two kits in one classroom.
  ```

- [ ] **Step 4a. Inventory the owner's folders and copy his notes (Decision 10). Before any `mv` or `cp`.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
mkdir -p "$TD"
ls -la "$S/pme-classroom-dryrun" "$S/pme-debrief-dryrun" "$S/pme-debrief-fa" "$S/pme-debrief-rc2" "$S/pme-debrief-rc3" "$S/pme-kit-release-b39b3d87" "$S/pme-kit-release-3db25a3b" "$S/pme-embed-rc1" "$S/pme-embed-rc2" > $W/inventory-before.txt 2>&1; cat $W/inventory-before.txt
grep -c -E "1\.0\.0-rc\.2" "$S/pme-debrief-fa/READ-ME-FIRST.txt" "$S/pme-debrief-dryrun/HOW-TO-CHECK-THE-PRINT.txt" "$S/pme-classroom-dryrun/PRE-FLIGHT.md" 2>&1
mkdir -p "$TD/owner-notes-before-rc3" && cp -p "$S/pme-classroom-dryrun/PRE-FLIGHT.md" "$S/pme-classroom-dryrun/OWN-PHONE-TEST.md" "$S/pme-debrief-dryrun/HOW-TO-CHECK-THE-PRINT.txt" "$S/pme-kit-release-b39b3d87/README.txt" "$S/pme-debrief-fa/READ-ME-FIRST.txt" "$TD/owner-notes-before-rc3/"
ls "$TD/owner-notes-before-rc3"
```

  Expected (as on 21 October): `pme-classroom-dryrun/`: `CLASSROOM.md`, `OWN-PHONE-TEST.md`, `PRE-FLIGHT.md`, `kit/`
  (b39b3d87); `pme-debrief-dryrun/`: `HOW-TO-CHECK-THE-PRINT.txt`, `pme-showcase-kit-b39b3d87/`; `pme-debrief-fa/`: three
  `debrief-fa-*-2026-10-20.pdf`, `READ-ME-FIRST.txt`; `pme-debrief-rc2/`: the tamponade PDF, the handout PDF, two PNGs;
  `pme-debrief-rc3/`: absent; `pme-kit-release-b39b3d87/`: `README.txt`, the kit; `pme-kit-release-3db25a3b/`:
  `README.txt`, `fa-handouts-rc1/`, the kit; `pme-embed-rc1/`, `pme-embed-rc2/`: eight entries each. Anything else: name
  it in `$W/gate-notes.md` and leave it. Five notes copied.
- [ ] **Step 4. Place the kits; retire rc.1 (move, never delete; `cp -n` for every placement copy).**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
mkdir "$S/pme-kit-release-$SHA8" && cp -Rn "$KIT" "$S/pme-kit-release-$SHA8/"
mv "$S/pme-classroom-dryrun/kit" "$TD/pme-classroom-dryrun-kit-$RC2_8" && cp -Rn "$KIT" "$S/pme-classroom-dryrun/kit"
mv "$S/pme-debrief-dryrun/pme-showcase-kit-$RC2_8" "$TD/" && cp -Rn "$KIT" "$S/pme-debrief-dryrun/"
mv "$S/pme-kit-release-3db25a3b" "$TD/" && mv "$S/pme-embed-rc1" "$TD/"
for d in "$S/pme-kit-release-$SHA8/pme-showcase-kit-$SHA8" "$S/pme-classroom-dryrun/kit" "$S/pme-debrief-dryrun/pme-showcase-kit-$SHA8"; do diff -rq "$KIT" "$d" && echo "same: $d"; done
ls "$S/pme-kit-release-$RC2_8"; ls "$TD"
```

  Expected: three `same:` lines; `pme-kit-release-b39b3d87` still holds `README.txt` and its kit (the fallback; never
  moved); `$TD` holds the rc.2 dry-run kits, `pme-kit-release-3db25a3b/` (rc.1 retired, with `fa-handouts-rc1/`),
  `pme-embed-rc1/` and `owner-notes-before-rc3/`.

  Then write, with the editor:
  - **`$S/pme-kit-release-$SHA8/README.txt`**, modelled on `pme-kit-release-b39b3d87/README.txt`: built from
    `<TAG_SHA>` (tag `v1.0.0-rc.3`) on `<date>` by `make-bundle.mjs` from a clean checkout; "THIS IS THE RELEASE BUILD
    for the demo on Wednesday 28 October … Version 1.0.0-rc.3 (pre-release) …"; "bookmarks and saved sessions from the
    rc.2 kit (b39b3d87) and older will not restore in this kit"; the relay line ("PASS, 4 of 4 runs, node …, <date>");
    "Windows: `pme-showcase-kit-<SHA8>.zip` beside this folder is the same kit for the room's PC; its launchers are
    untested on Windows until you tick the checklist in READ ME FIRST.txt (WINDOWS)"; "Rehearsed on this kit (kit round
    Q2 on rc.3, <date>): see SHOWCASE-2-MEASUREMENTS.md" (filled after Task 4); "The rc.2 kit in
    pme-kit-release-b39b3d87 is the fallback: take both on the stick."
  - **First line of `$S/pme-kit-release-$RC2_8/README.txt`** (replace its "FALLBACK" line if it has one): "FALLBACK for
    Wednesday 28 October: the rc.3 kit is pme-kit-release-<SHA8>. Use this kit only if the rc.3 kit fails; its Persian
    handouts are in fa-handouts-rc2/, its print set in ../pme-debrief-rc2/."
  - **`$S/pme-classroom-dryrun/PRE-FLIGHT.md` and `OWN-PHONE-TEST.md`:** the kit sentence → "`kit/` is the rc.3 release
    build from `<SHA8>` (v1.0.0-rc.3, pre-release); relay smoke test PASS 4 of 4 on `<date>`; bookmarks from the rc.2 kit
    will not restore. The rc.2 kit is kept as the fallback in `pme-kit-release-b39b3d87`." Add the screen he will now
    see (the Saadat-like layout, IBP off and RR until the CO₂ line is attached, NIBP AUTO 5 min) where the notes
    describe the screen (unverified: whether they do).
  - **`$S/pme-debrief-dryrun/HOW-TO-CHECK-THE-PRINT.txt`:** rewrite for this kit: the kit path; the footer string with
    `1.0.0-rc.3` and `<SHA8>`; E50 (untick Headers and footers); the verdict words ✓ Observed / ✗ Not observed /
    – Not assessable / ◆ Discuss; free run ≤ 4 pages, tamponade ≤ 6; "Print the learner handout": 1 page, the three
    take-home lines (if the owner-words PR landed), the course strip's labels readable; the comparison PDFs are in
    `_sandbox/pme-debrief-rc3/` (Task 4 Step 5).
- [ ] **Step 4b. The Windows zip (Decision 6).**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
cd "$S/pme-kit-release-$SHA8" && zip -qrX "pme-showcase-kit-$SHA8.zip" "pme-showcase-kit-$SHA8" -x '*.DS_Store'
unzip -l "pme-showcase-kit-$SHA8.zip" | grep -c -E '\.cmd$'
unzip -p "pme-showcase-kit-$SHA8.zip" "pme-showcase-kit-$SHA8/Start Classroom.cmd" | cmp - "$KIT/Start Classroom.cmd" && echo cmd-identical
ls -la "pme-showcase-kit-$SHA8.zip"
```

  Expected: `2`; `cmd-identical`; a zip of a few MB (unverified size). Copy it onto the stick with the two kit folders.
- [ ] **Step 5. The fallback set is complete.** In `$S/pme-kit-release-$RC2_8/pme-showcase-kit-$RC2_8/`:
  `sed -n '2p' VERSION.txt` → `Commit:   b39b3d8774b5…`. Leave it as it is.
- [ ] **Step 6. The H22 embed folder.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
mkdir "$S/pme-embed-rc3" && unzip -q "$W/assets/ventilator-monitor-embed-$V.zip" -d "$S/pme-embed-rc3"
ls "$S/pme-embed-rc3"; head -c 48 "$S/pme-embed-rc3/patient-monitor.iife.js"; echo
```

  Expected: the eight entries of `pme-embed-rc2`, and the rc.3 banner. **No release:** `cd $R/scratch/wt-rc3-tag && npx -y
  pnpm@9.15.9 build < /dev/null > $W/build-embed.log 2>&1 && cp -R apps/demo/dist/embed/. "$S/pme-embed-rc3/"` instead.
  `pme-embed-rc2` stays as the fallback's embed.

### Task 4 (executor): the automated 30-minute rehearsal on the new kit, both browsers (kit round Q2, rc.3)

**One output folder per run, never in place (Decision 3).** `ls` the folder first: it must not exist.

- [ ] **Step 1. The docs worktree** (rehearsal tooling and evidence; it becomes the docs PR's branch):

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
git -C $R/repo worktree add -b docs-rc3-release $R/scratch/wt-rc3-q2 "$TAG_SHA"
cd $R/scratch/wt-rc3-q2 && npx -y pnpm@9.15.9 install --frozen-lockfile --prefer-offline < /dev/null > $W/install-q2.log 2>&1; tail -1 $W/install-q2.log
grep -c "returnClicked" scripts/showcase/kit-round-a.kitround.ts
grep -n -E "fill\('Showcase 2, [0-9]+ October'\)|Kit round Q2 rehearsal on the rc\.[0-9] release build" scripts/showcase/kit-round-a.kitround.ts
```

  Expected: install done; `≥ 1` if #97 is in the tag (the close fix), else `0`; the Run-by fill twice (≈ :1161 in the A3
  test, ≈ :1513 in the Q1 talk) and the Notes line once.
- [ ] **Step 2. The script edits (Decision 4)**, in `wt-rc3-q2` only:
  1. **Only if Step 1 printed `0`:** `git fetch -q origin docs-rc2-release && git cherry-pick -x f3cd04b1` (the close's
     bounded "Return here" click + the talk's Run by "Showcase 2, 28 October"; +5/−3). A conflict: stop and report.
  2. **The Notes line in the Q1 talk:** `'Kit round Q2 rehearsal on the rc.2 release build.'` → `'Kit round Q2
     rehearsal on the rc.3 release build.'` (editor; one line).
  3. **The talk's Run by** must read `Showcase 2, 28 October` (after 1 or #97). The A3 test's `22 October` line is left
     as it is.
  The script's `about.preRelease` regex still names rc.1: it reads `false`. Do not edit it; Step 4 reads the label text.

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
cd $R/scratch/wt-rc3-q2
git diff --stat "$TAG_SHA" -- scripts/showcase/kit-round-a.kitround.ts
env -u CI SHOWCASE_KIT="$KIT" npx playwright test -c scripts/showcase/playwright.kit-round.config.ts -g "Q1 30-minute talk" --list --reporter=list < /dev/null | tail -3
```

  Expected: one file, +1/−1 (with #97 in the tag) or +6/−4 (cherry-pick + Notes); the list prints the talk for
  `[chromium]` and `[webkit]`, "Total: 2 tests". Commit the edit (`test(showcase): kit round Q2 on the rc.3 tag — the
  Notes line names rc.3`) before Step 3, so the evidence commits stay separate.
- [ ] **Step 3. Run the talk, Chromium then WebKit** (machine exclusive; ≈ 10 min each):

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
cd $R/scratch/wt-rc3-q2
ls docs/showcase/kit-round-a/q2-rc3 2>&1 | head -1
env -u CI SHOWCASE_KIT="$KIT" KITROUND_OUTDIR=docs/showcase/kit-round-a/q2-rc3 npx playwright test -c scripts/showcase/playwright.kit-round.config.ts -g "Q1 30-minute talk" --project=chromium --reporter=list < /dev/null > $W/q2-chromium.log 2>&1; tail -4 $W/q2-chromium.log
env -u CI SHOWCASE_KIT="$KIT" KITROUND_OUTDIR=docs/showcase/kit-round-a/q2-rc3 npx playwright test -c scripts/showcase/playwright.kit-round.config.ts -g "Q1 30-minute talk" --project=webkit --reporter=list < /dev/null > $W/q2-webkit.log 2>&1; tail -4 $W/q2-webkit.log
cp -n $W/relay-$SHA8.json docs/showcase/kit-round-a/q2-rc3/
ls docs/showcase/kit-round-a/q2-rc3 | wc -l
```

  Expected: "No such file or directory" first; `1 passed` each (rc.2: 9.4 and 9.7 min); the setup line "kit … served
  at http://127.0.0.1:8760/?relay by Start Classroom.command"; ≈ 34 files (rc.2's `q2-rerun/`): `q1-talk-{chromium,webkit}.json`,
  `q1-{0,1,2,4}-….{json,md}` per engine, `debrief-q1-{1,2,4}-…-{chromium,webkit}.json`, `q1-tamponade-debrief-chromium.pdf`,
  `q1-tamponade-debrief-print-{chromium,webkit}.png`, six `q2-*-monitor-*.png`. **A run with no new file for 15 min
  after the MH Debrief JSON is a hang in the close**: interrupt it (`pgrep -fl "playwright test"`, `kill -INT <pid>`),
  keep the folder as evidence, record it, and go to Task 8.1 (re-run into `q2-rc3-rerun/`).
- [ ] **Step 3b. The local macOS WebKit e2e set** (CI skips or only warns on these; ≈ 6 min; prep correction 4):

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
cd $R/scratch/wt-rc3-tag
env -u CI npx playwright test apps/demo/e2e/fx16-follower-beep-gate.e2e.ts --project=webkit --repeat-each 3 --reporter=list < /dev/null > $W/fx16-webkit.log 2>&1; tail -3 $W/fx16-webkit.log; grep "FX-16" $W/fx16-webkit.log
env -u CI npx playwright test apps/demo/e2e/fx24-follower-after-fast-forward.e2e.ts apps/demo/e2e/fx25-co2-attach.e2e.ts apps/demo/e2e/fx14-pause-while-hidden.e2e.ts --project=webkit --reporter=list < /dev/null > $W/fx-webkit.log 2>&1; tail -4 $W/fx-webkit.log
git status --porcelain --untracked-files=no | wc -l
```

  Expected: FX-16 `3 passed`, none skipped, and three ratio lines `FX-16 webkit: …` (rc.2: 99 %, 100 %, 100 %); the
  three others passed, none skipped (unverified on macOS WebKit at the tag; they pass on CI WebKit after #106/#108);
  `0` (the tag worktree stays clean). A failure is a **NOTE** for the matching smoke item (3, 4, 5 or 6), never a gate
  failure: the owner's hands decide.
- [ ] **Step 3c. The A3 test on the tag kit, both engines (Decision 5; ≈ 8 min):**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
cd $R/scratch/wt-rc3-q2
env -u CI SHOWCASE_KIT="$KIT" KITROUND_OUTDIR=docs/showcase/kit-round-a/q2-rc3-a3 npx playwright test -c scripts/showcase/playwright.kit-round.config.ts -g "A3 tamponade: the cue card path" --reporter=list < /dev/null > $W/q2-a3.log 2>&1; tail -4 $W/q2-a3.log
A=docs/showcase/kit-round-a/q2-rc3-a3; ls $A
pdfinfo $A/a3-tamponade-handout-chromium.pdf | grep Pages
pdftotext $A/a3-tamponade-handout-chromium.pdf - | grep -c -E "Observed|Not observed|Not assessable|Discuss|✓|✗|◆"
pdftotext $A/a3-tamponade-handout-chromium.pdf - | grep -c -F "Drainage is the treatment"
pdffonts $A/a3-tamponade-handout-chromium.pdf | grep -c -i "inter"
node -e 'const fs=require("fs"),d="docs/showcase/kit-round-a/q2-rc3-a3/";for(const f of fs.readdirSync(d).filter(f=>/^a3-tamponade.*\.json$/.test(f))){const r=JSON.parse(fs.readFileSync(d+f,"utf8"));const k=r.debrief?.keyTimes,m=r.debrief?.moments;console.log(f,"| keyTimes",k?JSON.stringify(k):"MISSING","| moments",Array.isArray(m)?m.length:"MISSING","| errors",r.errors.length)}'
```

  Expected: `2 passed` (rc.2: 7.6 min); `Pages: 1`; `0` verdict words; `1` (the owner's line; `0` if the owner-words PR
  did not land: a NOTE); ≥ 1 (Inter embedded; unverified name in `pdffonts`); per engine `keyTimes` present (rc.2:
  recognition 1 min 07 s, first action 7 min 51 s, CPR 3 s, drainage 1 min 30 s, stop CPR 2 s, pulseless ≈ 3 min 07 s;
  a different value is a NOTE), `moments 7`, `errors 0`. **The handout not 1 page, a verdict word on it, or `keyTimes`
  or `moments` missing → F10.**
- [ ] **Step 4. Read the results against the cue cards** (Node, no stdin):

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/wt-rc3-q2
node -e '
const fs=require("fs"),d="docs/showcase/kit-round-a/q2-rc3/";
for (const f of fs.readdirSync(d).filter(f=>/^q1-[0-4]-.*\.json$/.test(f))) {
  const r=JSON.parse(fs.readFileSync(d+f,"utf8"));
  const m=r.measures||{};
  console.log(f,"| kit",r.kit,"| errors",r.errors.length,"| marks",JSON.stringify((r.debrief?.objectives||[]).map(o=>o.mark)),
    "| rows",r.debrief?.timelineRows??"-", m.about?"| about "+JSON.stringify(m.about.start):"", m.qr?"| phones "+m.qr.countAfter:"",
    m.pdf?"| pdf "+JSON.stringify(m.pdf):"", m.debriefFooter?"| footer "+JSON.stringify(m.debriefFooter):"",
    m.h21?"| h21 hold "+m.h21.holdKeptEverySample+" cockpit "+m.h21.cockpitKeptDriving:"", m.e22?"| e22 "+m.e22.earlySignsAt+" call "+m.e22.callAt+" press "+m.e22.pressAt+" <40 "+m.e22.etco2FirstBelow40:"", m.fx12?"| fx12 "+JSON.stringify(m.fx12.returnClicked??null):"");
}'
```

  **Expected per segment, both engines** (rc.2's `q2-rerun/` values; `mark` is `observed` / `not-observed` /
  `not-assessable` / `discuss`):

  | Segment | Expected |
  |---|---|
  | `q1-0-opening-and-qr` | kit = `$SHA8`; errors 0; about contains **"Version 1.0.0-rc.3 (pre-release). For education only. Not a medical device and not clinically validated"**; phones `3 phones following` |
  | `q1-1-bronchospasm-ventilator-view-h21` | marks `["not-assessable","observed","not-assessable"]` (salbutamol ≈ 02:06); h21 hold `true`, cockpit `true`; errors 0 |
  | `q1-2-tamponade-a3-path-and-3-debrief` | marks `["observed","observed","observed","observed","discuss"]`; footer contains `Version 1.0.0-rc.3 (pre-release), build <SHA8>`; Chromium pdf `a4: true`, `pages` 6 (rc.2: 6; over 6 is a NOTE); errors 0 |
  | `q1-4-malignant-hyperthermia-early-call-13-03` | marks `["observed","observed","observed","not-assessable","not-assessable","observed"]`; e22: Early signs ≈ 06:52, call ≈ 07:02, press 13:03–13:04, < 40 at ≈ 07:28; errors 0; fx12 `true` or the close skipped (as rc.2) |

  Then open the six `q2-*-monitor-*.png` (Read tool) against the first rows of "What rc.3 adds" and
  `docs/gates/saadat-pr-g/after-co2-ventilated-1280x800.png`:
  - the Saadat-like grid: two-row header, six lanes at the photo's heights, tile grid, bottom strip;
  - bronchospasm (ventilated by the Ventilator view): a filled yellow capnogram with breaths, never a solid block (FX-25);
    IBP1 drawn; IBP2 lane empty and its tile blank (no CVP line: not F9, prep correction 5);
  - tamponade at 1:00: IBP2 drawn as CVP (blue) with the tile's value; IBP1 ART;
  - MH at Early signs: capnogram filled; IBP2 empty by scenario;
  - unconnected probes' tiles blank, not `---`; no `rc.1` or `rc.2` anywhere.
- [ ] **Step 5. The print PDFs for the owner** (`cp -n` only):

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
Q=$R/scratch/wt-rc3-q2/docs/showcase/kit-round-a/q2-rc3; A=$R/scratch/wt-rc3-q2/docs/showcase/kit-round-a/q2-rc3-a3
mkdir "$S/pme-debrief-rc3"
cp -n "$Q/q1-tamponade-debrief-chromium.pdf" "$S/pme-debrief-rc3/debrief-tamponade-rc3-chromium.pdf"
cp -n "$A/a3-tamponade-handout-chromium.pdf" "$S/pme-debrief-rc3/handout-tamponade-rc3-chromium.pdf"
cp -n "$Q"/q1-tamponade-debrief-print-chromium.png "$Q"/q1-tamponade-debrief-print-webkit.png "$S/pme-debrief-rc3/"
ls -la "$S/pme-debrief-rc3"
```

  Expected: four files; `mkdir` fails loudly if the folder exists (then list it and stop). `pme-debrief-rc2/` is left
  as it is (Decision 9).
- [ ] **Step 6. Re-take the six-card screenshots** (the whole screen changed; ≈ 56 min, prep correction 1):

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
cd $R/scratch/wt-rc3-q2
env -u CI SHOWCASE_KIT="$KIT" SHOWCASE_WORKERS=1 npx playwright test -c scripts/showcase/playwright.showcase.config.ts rehearsal.showcase.ts --reporter=list < /dev/null > $W/q2-six-cards.log 2>&1; tail -4 $W/q2-six-cards.log
git status --short docs/showcase/rehearsal docs/showcase/results | wc -l
git status --short docs/showcase/rehearsal docs/showcase/results | cut -c1-2 | sort | uniq -c
```

  Expected: `16 passed` (8 tests × 2 engines; rc.2: 55.5 min, 64/64 soft checks); changed files ≈ 32–48 (prep
  correction 2): the 16 JPGs and 16 JSONs re-taken, and the 16 `results/run-sheet-*.md` (new if #97 did not land them;
  modified if it did). Older files this run no longer writes (e.g. `severe-tamponade-then-induction-*`,
  `…-vent-first-OLD-4a1cc3f7`) stay as they are; Task 9 says so. Open three (tamponade, MH, anaphylaxis) for the grid
  and lanes as in Step 4. A soft-check failure is a **NOTE** (Q2 is the gate); list each with its observed value.
- [ ] **Step 7. Gate verdict.** `$W/gate-notes.md` §Q2-rc3: every Expected above, **PASS** / **NOTE** / **FAIL**.

  **Gate failures** (any one sends the day to Task 8):
  - F1: kit build fails, `Commit` ≠ `$TAG_SHA`, or the build id has `+`;
  - F2: relay smoke test not a full pass (4 of 4 expected);
  - F3: the Start/About label or the Debrief footer does not read `1.0.0-rc.3 (pre-release)` (the footer with the
    build); or an older rc shows on screen;
  - F4: a Debrief mark differs in KIND from the table; or a Debrief does not open, print (Chromium PDF) or download its
    JSON;
  - F5: phones not `3 phones following` at the QR moment; a phone not `synced` at a segment's end; H21's hold or
    cockpit `false`;
  - F6: a state a card relies on does not come (PEA, ROSC, Early signs, Recovering), or a card button a cue names is
    missing;
  - F7: errors > 0 (page or console);
  - F8: no Chromium tamponade PDF, or not A4 (a page count over 6 is a NOTE);
  - F9: **a lane a card relies on is missing or blank** on a monitor screenshot (prep correction 5: IBP2 in MH and
    bronchospasm is blank by scenario), or the CO₂ lane is a solid block on the ventilated case (FX-25 regressed);
  - F10: Step 3c's handout not 1 page, a verdict word on it, `keyTimes` or `moments` missing.

  **Notes** (record them, update the cards in Task 9, never "fix" them): times within ±10 s sim (±15 s wall) of rc.2's
  Q2; alarms earlier, later, new or gone without changing a card's story; timeline rows ±3; resync counts; load average;
  S12-F2 (AGENTS `---` on phones) and FX-12 ("No scenario") as before; `about.preRelease: false`; a six-card soft-check
  failure; a page count over the limit; the take-home line missing (owner-words PR); Step 3b's results; a hang in the
  close (test tooling).

### Task 5 (executor; the Persian paragraph by orch): the Persian handouts from Q2's Debrief JSONs

Inputs: the three Chromium Debrief JSONs of the set the Task 4 verdict names (`q2-rc3/`, or `q2-rc3-rerun/` after 8.1).

- [ ] **Step 1. Render and check.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
cd $R/scratch/wt-rc3-q2
Q=docs/showcase/kit-round-a/q2-rc3
node scripts/showcase/debrief-fa.mjs $Q/debrief-q1-1-bronchospasm-ventilator-view-h21-chromium.json \
  $Q/debrief-q1-2-tamponade-a3-path-and-3-debrief-chromium.json \
  $Q/debrief-q1-4-malignant-hyperthermia-early-call-13-03-chromium.json --version 1.0.0-rc.3 \
  --fonts /Users/samhv/.claude/plugins/cache/persian-writing/persian-writing/1.4.0/assets/fonts --text < /dev/null > $W/fa.log 2>&1; cat $W/fa.log
for f in $Q/debrief-q1-*-chromium.fa.pdf; do python3 /Users/samhv/.claude/plugins/cache/persian-writing/persian-writing/1.4.0/scripts/verify_pdf.py "$f" --expect-font Vazirmatn > "$f.verify.txt"; echo "$(basename $f): exit $? · unexpected fonts $(grep -c 'unexpected font' "$f.verify.txt") · errors $(grep -c '^ERROR' "$f.verify.txt")"; done
grep -c -E "1\.0\.0-rc\.3" $Q/debrief-q1-*-chromium.fa.txt
grep -c "$SHA8" $Q/debrief-q1-*-chromium.fa.txt
grep -n -i "takehome" scripts/showcase/debrief-fa.mjs | head -3
```

  Expected: three lines `… .fa.pdf: N A4 pages; M table entries used (K unreviewed)`, each followed by **`0 strings
  without translation`**; pages ≈ 6 / 6 / 7 (rc.2; ±1 is a NOTE); **`exit 0 · unexpected fonts 0 · errors 0`** each
  (read the `.verify.txt` files for any WARN); each `.fa.txt` names `1.0.0-rc.3` and the build ≥ 1 time.

  **Take-home lines in Persian.** The brief says the Persian handout prints blank lines for unreviewed entries.
  **(unverified)** On a8979ec9, `debrief-fa.mjs` renders the facilitator Debrief, has no take-home section (`grep`
  prints nothing) and prints every unreviewed table entry in Persian, with a first-page notice that the translation is
  not yet clinically confirmed (`debrief-fa.mjs:423–426`); the blank-lines rule belongs to the English learner handout
  (`views/debrief.ts:288–304`: no `takeHome` → three ruled lines). The last `grep` above shows what the tag's script
  does; READ-ME-FIRST (Step 3) states that, not the brief's wording.

  More than 0 strings without translation, any unexpected font or `ERROR` is a gate failure **for the handouts only**
  (the English Debrief is the reference): no rc.3 Persian set is placed; the missing strings go to the orchestrator (the
  skill, `reviewed: false`, a docs PR, then a re-render); meanwhile the owner's folder says so (Step 3).
- [ ] **Step 2. Place them (inventory first; `cp -n` only).**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
ls -la "$S/pme-debrief-fa"
mkdir -p "$S/pme-kit-release-$RC2_8/fa-handouts-rc2"
mv "$S"/pme-debrief-fa/debrief-fa-*-2026-10-20.pdf "$S/pme-debrief-fa/READ-ME-FIRST.txt" "$S/pme-kit-release-$RC2_8/fa-handouts-rc2/"
cd $R/scratch/wt-rc3-q2/docs/showcase/kit-round-a/q2-rc3
cp -n debrief-q1-1-bronchospasm-ventilator-view-h21-chromium.fa.pdf "$S/pme-debrief-fa/debrief-fa-bronchospasm-$(date +%F).pdf"
cp -n debrief-q1-2-tamponade-a3-path-and-3-debrief-chromium.fa.pdf "$S/pme-debrief-fa/debrief-fa-tamponade-$(date +%F).pdf"
cp -n debrief-q1-4-malignant-hyperthermia-early-call-13-03-chromium.fa.pdf "$S/pme-debrief-fa/debrief-fa-malignant-hyperthermia-$(date +%F).pdf"
ls -la "$S/pme-debrief-fa" "$S/pme-kit-release-$RC2_8/fa-handouts-rc2"
```

  Expected: `pme-debrief-fa/` holds the three rc.3 PDFs; `fa-handouts-rc2/` holds the three rc.2 PDFs and the rc.2
  READ-ME (Decision 9). zsh stops a line on an unmatched glob ("no matches found"): then the rc.2 PDFs were moved
  earlier; find them, record where, and go on.
- [ ] **Step 3. `READ-ME-FIRST.txt`** in `$S/pme-debrief-fa/`. The executor writes the **English** part (as rc.2's,
  with: "the Persian rendering of the Debrief for the three cases of the 30-minute talk, from the rc.3 release build
  (v1.0.0-rc.3, pre-release, kit `<SHA8>`)"; every footer: not a medical device, not clinically validated, version and
  build; one line per case with run time and key times from the Q2 JSONs; pages and "Strings left in English: 0 in
  each"; what Step 1 found about the take-home lines; "the rc.2 handouts are in
  `pme-kit-release-b39b3d87/fa-handouts-rc2/` (the fallback set)"; "Open them in Preview; do not save them from Preview")
  and a bracketed line that the Persian paragraph is to come. **(orch)** writes the Persian paragraph with the
  `persian-writing` skill (formal register; counts and dates in Persian digits; versions, times and clinical values in
  Western digits), drafted to `scratch/owner-review/readme-fa-rc3.md` for the owner, modelled on
  `scratch/owner-review/readme-fa-rc2.md` (itself still awaiting his review).

### Task 6 (executor builds the tree, orch pushes): GitHub Pages from the tag

Only after Task 4 Step 7 shows no gate failure (Decision 8).

- [ ] **Step 1. The orphan tree.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
cd $R/repo && git worktree add --orphan -b gh-pages-rc3 $R/scratch/gh-pages-rc3
cp -R "$KIT/app/." $R/scratch/gh-pages-rc3/
cp $R/scratch/wt-rc3-tag/LICENSE $R/scratch/wt-rc3-tag/NOTICES.md $R/scratch/gh-pages-rc3/ && cp -R $R/scratch/wt-rc3-tag/LICENSES $R/scratch/gh-pages-rc3/
touch $R/scratch/gh-pages-rc3/.nojekyll
```

  Then `README.md` and `VERSION.txt` with the editor: the texts of `scratch/gh-pages-rc2/README.md` and `VERSION.txt`
  with `1.0.0-rc.2` → `1.0.0-rc.3`, `v1.0.0-rc.2` → `v1.0.0-rc.3`, `b39b3d87…` → the full `TAG_SHA` and its subject
  (`git log -1 --format='%H %s' $TAG_SHA`), and the date. Keep both "cannot pair" lines word for word.
- [ ] **Step 2. Check and commit the tree.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
cd $R/scratch/gh-pages-rc3
node $R/scratch/wt-rc3-tag/scripts/showcase/check-subpath.mjs .
grep -c "cannot pair" README.md VERSION.txt; head -1 VERSION.txt
git add -A -- . ':!**/.DS_Store' && git commit -q -m "GitHub Pages: patient-monitor-engine 1.0.0-rc.3 (pre-release), static app built from $SHA8" -m "<the session's commit trailer>"
git rev-list --count HEAD; git ls-files | wc -l; (cd "$KIT/app" && find . -type f ! -name .DS_Store | wc -l); ls LICENSES | wc -l
cd $R/scratch/wt-rc2-prep && node scratch/pages-serve-check.mjs $R/scratch/gh-pages-rc3 < /dev/null
```

  Expected: `root-absolute URLs: 0`; `README.md:1`, `VERSION.txt:1`; `patient-monitor-engine 1.0.0-rc.3 — a PRE-RELEASE
  (release candidate), not a final 1.0.0`; `1` commit; tracked files = the app's file count **+ 5** + the `LICENSES/`
  count (prep correction 7: rc.2 was 70 + 5 + 8 = 83; rc.3 adds at least the Inter font file and `Inter-OFL-1.1.txt`, so
  ≈ 85, **unverified**: read the formula, not a target). The serve check (the rc.2 script; it must run from
  `wt-rc2-prep`, where its `@playwright/test` resolves): the Start label "Version 1.0.0-rc.3 (pre-release). For
  education only. …", no 404, 0 errors, server stopped.
- [ ] **Step 3 (orch). Force-push `gh-pages` only, and check it live.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
cd $R/repo && git push --force-with-lease=gh-pages:36e2efd0012b8ab466dc318f719fe5484269790b origin gh-pages-rc3:gh-pages
GP=$(git -C $R/scratch/gh-pages-rc3 rev-parse HEAD); echo $GP
gh api repos/$GHR/pages/builds/latest --jq '.status + " " + .commit'
curl -s -m 20 "https://samhv-dev.github.io/patient-monitor-engine/VERSION.txt?$GP" | head -1
curl -s -m 20 "https://samhv-dev.github.io/patient-monitor-engine/README.md?$GP" | grep -c "cannot pair phones"
cd $R/scratch/wt-rc3-tag && node -e 'const {chromium}=require("@playwright/test");(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.goto("https://samhv-dev.github.io/patient-monitor-engine/");await p.waitForTimeout(5000);console.log(await p.locator("[data-about]").first().innerText());await b.close();})()'
```

  Expected: `+ 36e2efd0...<GP> gh-pages-rc3 -> gh-pages (forced update)` (the lease refuses if remote `gh-pages` is no
  longer rc.2's 36e2efd0: stop and look); `built <GP>` (repeat every minute, at most 10); `patient-monitor-engine
  1.0.0-rc.3 — a PRE-RELEASE …` and `1`; the Start label "Version 1.0.0-rc.3 (pre-release). …". Record `$GP`. Keep the
  local branch `gh-pages-rc2`: it is the Pages rollback.

### Task 7 (owner, guided by the orch): the smoke check and the live rehearsal, Saturday ≈ 09:00; the Windows checklist

One AskUserQuestion step per item. Budget **≈ 30 min** for the smoke and tell the owner so. He sits at his Mac (Safari
default, Chrome installed), with his own phone, on the Mac's hotspot or the travel router. One line per item: result,
plus anything odd.

| # | ≈ min | Do | Expected |
|---|---|---|---|
| 1 | 1 | Double-click `_sandbox/pme-classroom-dryrun/kit/Start Classroom.command`; Allow "node" if asked | **THE CLASSROOM IS RUNNING**; Safari opens `127.0.0.1:8650/?relay#/`; the Start view reads "Version 1.0.0-rc.3 (pre-release). For education only. Not a medical device and not clinically validated …" |
| 2 | 2 | Monitor view → top edge → **Phones** → scan the QR with the phone → **Close**. Look at both screens (free play) | The phone follows; the sheet says **1 phone following**. The Saadat-like screen as the photo: header, six lanes (ECG II, ECG 2 unlabelled, **RESP**, IBP1 and IBP2 **empty**, pleth), tiles: **RR** (BrPM), NIBP **AUTO(5Min)** with a result and its time, IBP1/IBP2, T2/DT and BFI% fields **blank**, red limits. On the phone: waves sweep at the cursor, no X4 on the ECG |
| 3 | 1.5 | Instructor → **Devices** → Sensors → **CO₂ sampling line** on; watch 15 s | **FX-25:** the third lane becomes CO₂ and starts blank at the attach point, then fills yellow breath by breath (never a solid yellow block); the RR tile becomes EtCo2 \| FiCo2 \| AWRR. Same on the phone |
| 4 | 2 | **Sound on** in the session bar first, Mac volume up. Scenario → Showcase → **Healthy induction** → **Load · All alarms on · ×4**. Phone on **Ring**, volume up, tap **Sound off** (turns sound on). Listen 30 s, tap again | **FX-16:** the phone beeps on every beat with the Mac (≈ 1245 Hz), steady. "No alarm heard" is recorded as such. The second tap silences the phone |
| 5 | 2 | Back to ×1. Session bar → **5 min** fast-forward; watch the Mac, then the phone | **FX-23:** during it the chevron blinks inside an amber ring, no clock beside it, no times on the progress bar, the mute icon without words. After it a larger banner, three lines: "Fast-forwarded 5 min" / "mm:ss → mm:ss" / the alarms or "No alarms"; no vertical seam marks with time labels on the lanes. **FX-24:** the phone's waves are not squeezed and its ECG gain does not jump to X4 |
| 6 | 1 | Switch Safari to another tab for ≈ 10 s, then back | **E82:** meanwhile the phone shows "(paused)"; back: the toast "Paused while this tab was hidden (…)", and the clock runs again |
| 7 | 4 | Load **Malignant hyperthermia**; after ≈ 1 min: **Debrief** → **Print or save as PDF** (untick Headers and footers, E50; Safari: Show Details → Print headers and footers). Then **Print the learner handout**. Then the same address in **Chrome**, print preview | The report alone, A4; verdict words ✓ / ✗ / – (/ ◆); the footer "… Version 1.0.0-rc.3 (pre-release), build <SHA8> …" (every page in Chrome with "Page n of N"; at each block end in Safari, the known limit); the print font looks the same in both browsers. Handout: 1 page, no verdict words, the three MH take-home lines in his words (if the owner-words PR landed; else three blank lines), the course strip's labels readable |
| 8 | 1 | Open `_sandbox/pme-debrief-fa/debrief-fa-tamponade-<date>.pdf` in Preview (read only; do not save) | Right-to-left Persian; the footer names نسخه‌ی 1.0.0-rc.3 (پیش‌انتشار) and the build; the "not yet clinically confirmed" notice on page 1 |
| 9 | 1.5 | Close the black window (Terminate). Double-click `_sandbox/pme-embed-rc3/ventilator-monitor.html` (Safari), Develop → Show JavaScript Console | **H22 on rc.3:** within 20 s the ventilator breathes; HR, SpO₂ > 90, EtCO₂, awRR 14; no console error |
| 10 | 0.5 | Open https://samhv-dev.github.io/patient-monitor-engine/ in Safari | "Version 1.0.0-rc.3 (pre-release) …"; no Phones pairing from Pages (no relay there: expected) |

**Gate items:** 1, 2 and 7 (the kit does not start; the phone cannot follow or a lane or tile area is missing; the
Debrief does not open or print) → Task 8. All others are findings: item 4's day rule is "phones silent, the Mac is the
alarm source"; item 5 or 6 failing gets a presenter's rule ("do not fast-forward with phones following"; "keep the
instructor tab frontmost"); item 3 failing gets "attach the CO₂ line before the talk"; item 8 → the English Debrief is
the reference; item 9 or 10 → noted. A Saadat-like detail he wants changed is a finding for a later release, not a
rollback (the rc.2 kit lacks the whole layout).

**The live rehearsal (≈ 45 min, right after):** the owner runs the 30-minute talk from the run sheet on the same kit
with his phone following. The orchestrator records the time per card, every cue that came late or not at all, and
anything he says he will do differently. A state that does not come, a crash or a Debrief that will not print is a
gate failure (Task 8); everything else is a finding for the run sheet (Task 9 Step 4).

**W — the Windows checklist (on the room's PC, when he gets there; E111):** the 10 lines of the kit's
`READ ME FIRST.txt` (WINDOWS), from the zip of Task 3 Step 4b: Node ≥ 22; unzip after "Unblock" into a path with a
space; Start Simulator (127.0.0.1:8642, no firewall question); closing stops it; Start Classroom ("THE CLASSROOM IS
RUNNING", 127.0.0.1:8650/?relay); firewall Private **and** Public; the address is the PC's Wi-Fi IPv4; his phone
follows; Ctrl+C then Y stops it; a second Start Classroom takes 8651. Pass = all 10 ticked: then the docs say so and
the orchestrator may correct the release body's Windows line (`gh release edit`, body only). Any line failing, with a
photo: Windows is not a backup this time; the demo runs from his Mac as planned. Never a rollback trigger.

**E13 / E14 (before Wednesday):** E13 — `node -v` on the presenting Mac prints v22 or later; both kit folders and the
zip on the stick; Start Classroom once to clear the Gatekeeper and firewall prompts. E14 — the travel router in router
mode (DHCP on, client isolation off; the kit's "Room network" notes if the owner-words PR added them): QR → as many
phones as can be borrowed; record the count, time to "Following", one lock/unlock, ×4 for 2 min.

### Task 8 (orch + executor): rollback, if the rehearsal or the smoke fails on the new kit

**8.1 Classify.** Write the failure (F-number or smoke item, segment, engine, observed value) in `$W/gate-notes.md`.
Re-run the failing segment once into `KITROUND_OUTDIR=docs/showcase/kit-round-a/q2-rc3-rerun` (or
`KITROUND_Q1_STOP=bronchospasm` for card 1 only). Passing on the re-run turns it into a NOTE, both results recorded; Task 5
then reads `q2-rc3-rerun/`. A hang in the close is test tooling, never a product failure.

**8.2 Decide** (orch; the owner is told at once, in one message):

| What failed | The demo kit | Pages | Persian handouts | On main |
|---|---|---|---|---|
| Any gate failure (F1–F10, smoke 1, 2 or 7, a blocking live-rehearsal failure) | **the rc.2 kit** `pme-kit-release-b39b3d87` (kept; nothing to rebuild), back in the owner's folders, his notes restored (commands below) | stays at rc.2, or back: `git push --force-with-lease=gh-pages:<GP> origin gh-pages-rc2:gh-pages` | `fa-handouts-rc2/` back into `pme-debrief-fa/` | nothing before the demo; the defect is a finding for a later release, or an rc.4 if E109 (b) is ruled |
| A Persian failure only (Task 5) | unchanged (rc.3) | unchanged | none of rc.3 placed; the English Debrief is the reference; a READ-ME line says so | the missing strings via the skill, then a re-render |

**The rc.2 row's moves, as commands** (the rc.3 versions to `$TD` first, then the rc.2 ones back; nothing deleted):

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc3-release/env.sh
mkdir -p "$TD/owner-notes-rc3-version" "$TD/pme-debrief-fa-rc3"
mv "$S/pme-classroom-dryrun/kit" "$TD/pme-classroom-dryrun-kit-$SHA8" && cp -Rn "$S/pme-kit-release-$RC2_8/pme-showcase-kit-$RC2_8" "$S/pme-classroom-dryrun/kit"
mv "$S/pme-debrief-dryrun/pme-showcase-kit-$SHA8" "$TD/pme-debrief-dryrun-kit-$SHA8" && cp -Rn "$S/pme-kit-release-$RC2_8/pme-showcase-kit-$RC2_8" "$S/pme-debrief-dryrun/"
mv "$S/pme-classroom-dryrun/PRE-FLIGHT.md" "$S/pme-classroom-dryrun/OWN-PHONE-TEST.md" "$S/pme-debrief-dryrun/HOW-TO-CHECK-THE-PRINT.txt" "$TD/owner-notes-rc3-version/"
cp -p "$S/pme-kit-release-$RC2_8/README.txt" "$TD/owner-notes-rc3-version/README-rc2-with-fallback-line.txt"
cp -p "$TD/owner-notes-before-rc3/PRE-FLIGHT.md" "$TD/owner-notes-before-rc3/OWN-PHONE-TEST.md" "$S/pme-classroom-dryrun/"
cp -p "$TD/owner-notes-before-rc3/HOW-TO-CHECK-THE-PRINT.txt" "$S/pme-debrief-dryrun/"
cp -p "$TD/owner-notes-before-rc3/README.txt" "$S/pme-kit-release-$RC2_8/README.txt"
mv "$S"/pme-debrief-fa/*.pdf "$S/pme-debrief-fa/READ-ME-FIRST.txt" "$TD/pme-debrief-fa-rc3/" 2>/dev/null
cp -pn "$S"/pme-kit-release-$RC2_8/fa-handouts-rc2/* "$S/pme-debrief-fa/"
diff -rq "$S/pme-kit-release-$RC2_8/pme-showcase-kit-$RC2_8" "$S/pme-classroom-dryrun/kit" && echo same-rc2
```

  Expected: `same-rc2`; the four notes are the pre-rc.3 versions (they describe the rc.2 kit); `pme-debrief-fa/` holds
  the rc.2 handouts and READ-ME (copies). The `cp -p … README.txt` is the one deliberate overwrite: it restores the
  owner's own pre-rc.3 text, saved first. Add one line at the top of `$S/pme-kit-release-$SHA8/README.txt`: "NOT FOR
  WEDNESDAY: <F-number or smoke item> failed; present on pme-kit-release-b39b3d87." The rc.2 print set is already in
  `_sandbox/pme-debrief-rc2/`.

What the rc.2 kit lacks, for the presenter: the Saadat-like photo layout (two tile columns, unfilled capnogram, no
header bar; IBP on and the capnogram shown by default; NIBP idle), FX-19 to FX-25 (the fast-forward UI, the follower's
gain after a jump, the CO₂ attach block), the hidden-tab pause (rc.2: in Safari a hidden host tab suspends and phones
lose the session; keep the tab frontmost), the bundled print font and wider handout strip, the take-home lines, and the
Windows launchers. Its run sheet: `git show origin/docs-rc2-release:docs/showcase/SHOWCASE-2-RUN-SHEET.md` (names the
rc.2 kit and 28 October; or `b39b3d87:` for the tag's text). The orchestrator prints that version if rc.2 is chosen.

**8.3 Re-run** on the kit 8.2 chose, before the owner's smoke (or before noon Saturday): for the rc.2 kit, the talk on
Chromium only (≈ 15 min) into `docs/showcase/kit-round-a/q2-rc3-fallback-b39b3d87/`, to confirm it on this Mac today.

### Task 9 (executor; orch merges): the docs PR after the smoke

Branch `docs-rc3-release` in `scratch/wt-rc3-q2` (from `TAG_SHA`; the Task 4 Step 2 commit first). If main moved and
a file conflicts, rebase onto `origin/main` before the push. Docs, evidence and test tooling only.

**Timing.** Steps 1–3 and 4.1–4.4 are written on Friday ≈ 17:00 with **no push**. Steps 4.5–4.7, 5 and 6 follow the
owner's smoke and live rehearsal (Saturday), so the PR records them and its CI runs stay two. Review Saturday
afternoon or Sunday morning; merge by Sunday 25 October 12:00 so the presenter reads the final run sheet three days
before the demo.

- [ ] **Step 1. The plan as run.** This file (`docs/plans/rc3-release-day.md`, committed by its own PR) gets a status
  block "RUN 2026-10-23/24" with the deviations, in the docs PR (`docs(plans): the rc.3 release day as run`).
- [ ] **Step 2. Evidence and gate notes:**
  1. `docs/showcase/kit-round-a/q2-rc3/` (+ `q2-rc3-a3/`, any `-rerun/`, `relay-<SHA8>.json`), the re-taken
     `docs/showcase/rehearsal/*.jpg` and `results/*.json` and `results/run-sheet-*.md` (prep correction 2: say in the
     PR which stale files were left), and one line in `docs/showcase/KIT-GATE.md`: "<date>: `rehearsal/` and `results/`
     re-taken on the rc.3 kit `<SHA8>` (kit round Q2 on rc.3, the Saadat-like photo layout)".
  2. `docs/gates/rc3-release.md` (new), from `$W/gate-notes.md`: the freeze (`FREEZE_SHA`, run id), the bump PR and
     #97's fate; `TAG_SHA`, main's run id, the tick-bench step, the retry-only list; the tag push time; the release run
     id, publishedAt, Pre-release, 8 assets, SHA256SUMS 7/7, IIFE size; the kit `VERSION.txt` lines, the relay result,
     the zip; the owner's folders (what moved where, rc.1 retired); the Q2 table; the macOS WebKit e2e set; the Persian
     results; the Pages commit and live checks; the smoke item by item; the live rehearsal; W, E13, E14 when known; any
     Task 8 action; deviations from this plan; RELEASE.md item 2's line.
  3. `docs/gates/stage-12-real-phone.md` and `docs/gates/stage-8b.md` §11: one "rc.3 smoke check (<date>)" paragraph
     each (items 2, 4, 5 on a real phone; item 9 under H22 "on rc.3"; item 7 under the print check).
- [ ] **Step 3. `docs/showcase/SHOWCASE-2-MEASUREMENTS.md` §"Q2 on rc.3"** (after rc.2's §Q2, same shape): the kit and
  the relay; how it ran; one row per segment, rc.2's Q2 numbers beside rc.3's; H21; S12-F2 and FX-12; the A3 handout
  (pages, take-home line, font); the Persian handouts; the six monitor screenshots; Findings (numbered, from the NOTES);
  Not measured (real Safari, real phones, sound by ear, a real print dialog, Windows: the smoke and W cover these in
  part).
- [ ] **Step 4. Run sheet, cue cards, presenter guide** (only where rc.3 or this run changed a fact):
  1. **The kit key** → `_sandbox/pme-kit-release-<SHA8>/README.txt` (the rc.3 kit); the fallback →
     `pme-kit-release-b39b3d87`; every "b39b3d87 release build" line that means the demo kit is changed.
  2. **The screen**: the lane and tile lines describe the Saadat-like layout (free play: RESP/RR until the CO₂ line is
     attached; IBP off; NIBP AUTO 5 min; blank tiles for unconnected probes); the screenshots' paths
     (`kit-round-a/q2-rc3/q2-*-monitor-*.png`, `rehearsal/*.jpg`).
  3. **Fast-forward**: the banner's three lines; the presenter's rule if smoke item 5 found anything.
  4. **Hidden tab**: "a hidden instructor tab pauses the case and the phones show (paused); the toast on return says how
     long" (E82), replacing rc.2's FX-15 rule.
  5. **FX-16, print, handout**: the owner's results of items 4 and 7 (take-home lines in his words).
  6. **The smoke-check boxes** in the run sheet's checklist ticked with the date, or left open with the finding; W, E13,
     E14 rows.
  7. **Any Q2 NOTE that changes a cue's time or a count**, and the live rehearsal's findings.

  Then search for stale words:

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/wt-rc3-q2
git grep -n -E "b39b3d87 release build|1\.0\.0-rc\.2 \(pre-release\)|24 October|22 October" -- 'docs/showcase/SHOWCASE-2-*.md'
git grep -n -i "v1\.1" -- docs/showcase docs/gates/rc3-release.md
```

  Expected: no line, except where the text quotes rc.2 as history or as the fallback (say so in the PR body).
- [ ] **Step 5. Small items:** `docs/RESUME.md` (the rc.3 state; `RELEASE.md` "After the workflow" 4);
  `docs/guides/known-deviations.md` (any new WebKit retry-only line from Task 1 Step 2, and Step 3b's results if one
  failed); if the tag slipped to another day (E108), `CHANGELOG.md` and `CITATION.cff` dates together, with
  `release-versions` 4/4; `RELEASE.md` item 7 still says "The version label is `1.0.0-rc.1`": one line to say the
  label is the release candidate being tagged (docs only; optional).
- [ ] **Step 6. Checks and PR.**

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/wt-rc3-q2
npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/docs-honesty.test.ts test/release-versions.test.ts < /dev/null
node --experimental-strip-types scripts/model-docs.ts && node --experimental-strip-types scripts/known-misses.ts && git status --short docs/model docs/validation/known-misses.md
git diff --stat origin/main...HEAD -- apps packages | tail -1
git push -u origin docs-rc3-release
gh pr create -R samhv-dev/patient-monitor-engine --base main --head docs-rc3-release --title "docs: the rc.3 release day — gate note, kit round Q2 on rc.3, run-sheet updates, the owner's smoke check" --body-file ../rc3-release/pr-docs.md
```

  Expected: `docs-honesty` 7/7, `release-versions` 4/4; no changed model page; **no line** under `apps packages`; the PR
  is open (not draft) and CI starts. The body lists: the tag and its run; the files by group; the Q2 PASS/NOTE table;
  the smoke and live-rehearsal results; W/E13/E14 status; "no product file changed".
- [ ] **Step 7. Review and merge.** An independent read-only review (≈ 30 min, brief by the orch): every number in the
  gate note and MEASUREMENTS against the `q2-rc3*/` files; the run-sheet lines against Q2 and the smoke; no claim beyond
  the evidence. **(orch)** merges with `merge-one-v2.sh <PR>` when its rollup and main are green.

  Leftovers afterwards: `git worktree remove` for `wt-rc3-tag`, `wt-rc3-q2`, `wt-release-rc3`, `wt-rc3-plan`
  (regenerable; branches stay); `gh-pages-rc2` and `gh-pages-rc3` stay as local branches (Pages history and rollback);
  `wt-rc2-prep` may go once Task 6 Step 2 has run.

---

## For the owner (one paragraph)

On Thursday at 18:00 the product is frozen; that evening the version number becomes 1.0.0-rc.3 and the build is tried
once more. On Friday at 12:00 rc.3 is tagged as a **pre-release** on the last green build; its GitHub release page says
education only, not a medical device, not clinically validated, what is not done, and that the Windows launchers are
untested. Then, from that exact commit: the classroom kit is rebuilt and smoke-tested, placed in your sandbox folders
(with a zip for the Windows PC), and the whole 30-minute talk is rehearsed automatically in Chrome and Safari's engine
with three emulated phones, every Debrief verdict checked against the cue cards and the new monitor screen photographed;
the three Persian handouts are regenerated; GitHub Pages is republished. The rc.2 kit stays beside the new one as the
fallback (take both on the stick); the rc.1 kit is retired. On Saturday at about 09:00 I will guide you through a
check of about 30 minutes, one question per step: start the kit; one phone by QR and a look at the new screen; attach
the CO₂ line; the beep at ×4; a 5-minute fast-forward; hiding the tab; print a Debrief and the learner handout in
Safari and Chrome; one Persian PDF; the ventilator page; the Pages site. Then you rehearse the talk yourself on the
same kit. If something essential fails, you present on the rc.2 kit and I tell you at once.

---

## What remains for the owner

1. **Saturday ≈ 09:00**: the 10-item smoke check (≈ 30 min) and the live rehearsal (≈ 45 min) — Task 7.
2. **On the room's PC** (when? E111): the Windows checklist, 10 lines, from the zip (`READ ME FIRST.txt`, WINDOWS).
3. **E13**: `node -v` on the presenting Mac; both kit folders and the zip on the stick. **E14**: the router test with
   borrowed phones.
4. **Reviews in Persian**: the take-home lines (`scratch/owner-review/takehome-fa-rc3.md`, from the owner-words PR),
   the READ-ME paragraphs (`readme-fa-rc2.md`, `readme-fa-rc3.md`), the 542-row terms file
   (`fa-debrief-terms-review-2026-10-21.md`). Until then the Persian handouts say on page 1 that they are not yet
   confirmed.
5. **The rc.2 smoke** (seven items, 20 October) was never run: it is superseded by item 1 (E107).
6. The deck review (pass 1 sent 21 October; pass 2 after Saturday with rc.3 screenshots).

---

## Questions (E107 onward; each with the default used without an answer)

| ID | Question | Default |
|---|---|---|
| **E107** | PR #97 (the rc.2 docs, draft) waits for an rc.2 smoke that never ran, and holds the kit-round fix for the close's hang. (a) Mark it ready Thursday, say the rc.3 smoke supersedes it, merge it before the bump PR; or (b) close it and fold its evidence into the rc.3 docs PR | **(a)**; if it has not merged before the bump PR, Task 4 Step 2 cherry-picks f3cd04b1 |
| **E108** | Dates: the brief says CHANGELOG and CITATION 2026-10-23; the 18:01 rulings snapshot said "CITATION date 2026-10-24". If the tag slips past Friday, (a) keep 2026-10-23 and correct both in the docs PR, or (b) accept the mismatch | **2026-10-23** (the tag day); on a slip, **(a)** |
| **E109** | If the rehearsal or the smoke fails on rc.3 for a reason outside the tooling: (a) present on the rc.2 kit (loses the Saadat-like layout, FX-19…25, the print font, the Windows launchers), or (b) a hotfix PR and a v1.0.0-rc.4 on Monday 26 (≈ 5 h, 4 CI runs, after the allowance reset) | **(a)**, the brief's rollback line |
| **E110** | `ci.yml` (two lines) says WebKit retries warn "until the v1.0.0-rc.2 demo". Reword to "until the demo of 28 October" in the bump PR? | **yes** (text only) |
| **E111** | When will the owner be at the room's Windows PC? If only on the 28th, a failing line cannot be fixed in time | Windows stays an untested backup; the demo runs from his Mac |
| **E112** | The rc.3 rehearsal is named "Q2" (the brief), in folders `q2-rc3*`. Or rename it Q3? | **Q2, folders `q2-rc3*`** |
| **E113** | The brief says the Persian handout prints blank lines for unreviewed entries; the script on a8979ec9 prints them in Persian under a notice and has no take-home section. Which is intended for the demo? | Report what the tag's script does (Task 5 Step 1); no script change after the freeze |

Still open from before: E13 (presenting Mac), E14 (router test).

---

## Self-review

- **The brief's items.** Timetable (Thu 18:00 freeze; bump PR Thu evening with the version in every place
  `release-versions.test.ts` checks, CITATION 2026-10-23, CHANGELOG cut from Unreleased; Fri 12:00 tag → 8 assets →
  kits (rc.2 fallback, rc.1 retired) → Q2 both browsers → Persian with `--version 1.0.0-rc.3 --fonts <skill fonts>` →
  Pages by the orch → Sat smoke + live rehearsal, Windows checklist at the room's PC): the Timeline and Tasks 0–7. The
  "(orch)" marks: Tasks 0 (merges), 1, 2, 6 Step 3, 8.2, 9 Step 7. Every rc.3 difference with its observing step and
  its pass: the table "What rc.3 adds". The rollback line: under that table and Task 8.
- **The prep run's corrections** (`rc2-release-day-prep.md` §5 lists **seven**; the brief says six; all applied):
  1. six-card run ≈ 56 min, not 20–25: Effort table, Timeline (Task 4 ≈ 2.5 h), Task 4 Step 6;
  2. the six-card run's file list (re-taken + new + `run-sheet-*.md`; stale files stay): Task 4 Step 6, Task 9 Step 2.1;
  3. the build-id grep in `-E` form (ugrep): Task 3 Step 1, Global Constraints;
  4. `env -u CI`, `--repeat-each 3`, the `FX-16 webkit` ratio lines: Task 4 Step 3b; `env -u CI` on every local run;
  5. F9 = "a lane a card relies on": Task 4 Steps 4 and 7, the table's O1 row;
  6. the relay line prints the kit's path: Task 3 Step 2;
  7. Pages tracked count = app + 5 + `LICENSES/` (rc.2 83; rc.3 differs): Task 6 Step 2.
- **From the rc.2 run report:** the close's hang and its fix (Decision 4, Task 4 Steps 2–3, 8.1); `$W/assets` absent →
  the executor downloads (Task 2 Step 4); the executor writes no Persian (Task 5 Step 3); the serve check runs from
  `wt-rc2-prep` (Task 6 Step 2); the "What remains for the owner" list carried forward (items 4–5 above).
- **Not proved here:** Playwright's WebKit is not Safari, emulated phones are not phones, nothing here hears a sound or
  runs Windows; Task 7 covers these in part. Not run while planning: the bump, the tag, the workflow, the downloads, the
  kit build, the rehearsal, Pages. **(unverified)** marks: the relay's "4 of 4" on the day; the NIBP-only engine diff
  since rc.2; the take-home line and F27/known-deviations rows (the owner-words PR was not merged when this was
  written); Inter's name in `pdffonts`; the macOS WebKit results of the FX-24/25/14 e2e; the zip size; the Pages file
  count; the Persian take-home behaviour (E113); whether the owner's notes describe the screen.
