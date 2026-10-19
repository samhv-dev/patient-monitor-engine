# The v1.0.0-rc.2 release day: tag, release, kits, rehearsal, Persian handouts, Pages, the owner's smoke — Plan

**STATUS: REVIEWED-FIXED 2026-10-19 01:40 (+0330).** Written 2026-10-19 ≈ 01:00 by the planner (Opus) from the brief
`scratch/briefs/plan-rc2-release-day.md`. The independent review (`scratch/plans-backup/rc2-release-day-plan-review.md`,
FIX FIRST, 15 fixes) and the orchestrator's rulings on it are applied; v1 is kept as
`scratch/plans-backup/rc2-release-day.v1-before-review.md`. Documentation only: no product file was changed while
writing or fixing it.

**RE-DATED 2026-10-20 (orchestrator rulings, plan A).** `v1.0.0-rc.2` was tagged on **b39b3d87** (`origin/main`, the
Debrief part B in: case T-B in spirit) on **Tuesday 20 October 00:17 (+0330)**, earlier than the 18:00 freeze this plan
assumed. rc.2 is the baseline; a **v1.0.0-rc.3 follows** (freeze **Saturday 24 October 18:00**, rehearsal-ready
**Monday 26 October**). The demo is on **Wednesday 28 October 2026**, not Saturday 24 October. The owner's smoke check
(Task 7) is **Tuesday 20 October evening or Wednesday 21**. Every "Saturday" / "24 October" below that meant the demo
now means Wednesday 28 October. The release-day prep (`scratch/plans-backup/rc2-release-day-prep.md`, on 13ebbb7d)
found seven corrections; they are applied in the steps they concern, each marked *(prep correction N)*. Tasks 0–6 are
marked DONE with the actual times; the run's report is `scratch/plans-backup/rc2-release-day-run-2026-10-20.md`.

**Base and preconditions.**
- Written on `origin/main` cfa2eee1 (#81, FX-16). Re-based by the review on `origin/main` **f4f479d9** (#84 Debrief A
  merged 2026-10-19 00:59, so A-GREEN came on Monday morning). The Debrief plan was read from
  `git show origin/debrief-a:docs/plans/debrief-redesign.md` (1,292 lines; Task V, Task G, G4, G5). Task V sits on the
  LOCAL branch `release-rc2` at **7e79be36** (b22d5b33 V + 7e79be36 the Task 0 notes; rebased on f4f479d9; not pushed
  when this was fixed).
- This plan starts where the Debrief plan stops: at the tag decision (G4 at 16:15–17:30 Tuesday, or G5's Wednesday
  branch). It does not repeat Tasks A, V or B; it uses their outputs: `FALLBACK_SHA` (gate note §A,
  `scratch/debrief-gate-rc2/gate-note.md`), B's head `H` and B's merge commit. **This plan's Task 4 REPLACES the
  Debrief plan's Wednesday rehearsal on the tag** (G5, "the kits are rebuilt from the tag and the automated rehearsal
  (G1, both projects, and the Q1 talk) runs on them"): one rehearsal, one Mac. The Debrief plan's Tuesday G1–G3 on `H`
  still run as written; their G2/G3 outputs are handled in Tasks 4–5 (inventory first, never overwritten).
- **Task 0 is DONE** (7e79be36): the rc.2 notes say pre-release, education only, not a medical device, not clinically
  validated, and what is not done; the roadmap rows are fixed; the R-B brief carries the CHANGELOG line
  (`scratch/briefs/review-debrief-b.md:14`). Task 0 Step 3 remains as a re-check on the tag commit.
- Untracked plan file, like the others in `docs/plans/`. The post-tag docs PR (Task 9) commits it as its first commit.

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. The
> orchestrator does every step marked **(orch)**: choose and push the tag, push `gh-pages`, merge. An executor does
> the rest and never tags, merges or pushes `gh-pages` (`RELEASE.md`: "executors never tag").

**Goal.** By Wednesday 21 October evening, with nothing changed in the product after the freeze:
1. `v1.0.0-rc.2` is tagged (annotated) on a commit that is green on `main`.
2. Its GitHub release is a **Pre-release** with 8 assets whose `SHA256SUMS.txt` checks.
3. The classroom kit is rebuilt from the tag and placed in the owner's folders. The rc.1 release kit is kept as the
   fallback.
4. The 30-minute talk is rehearsed automatically on the new kit in both browsers (kit round **Q2**).
5. The three Persian handouts are regenerated from that rehearsal.
6. GitHub Pages serves the tag's build.
7. The owner has done his smoke check (≈ 20 minutes with the guided questions).

After the tag, one docs PR records all of it.

**Architecture (what builds what).**
- `.github/workflows/release.yml` (on a `v*` tag push) rebuilds the tagged commit and publishes the release:
  - it sets `PME_BUILD` to the 7-character sha;
  - it runs typecheck, notices, licences, size, two e2e files, pack-smoke and TypeDoc;
  - its notes are the CHANGELOG section of the version, cut by an `awk` script;
  - `--prerelease` is set for any tag that contains `-`.
- `scripts/showcase/make-bundle.mjs` builds the kit:
  - `vite build --base ./` of `apps/demo`, plus the relay, the launchers, `VERSION.txt` and `READ ME FIRST.txt`;
  - the app's build id is `<8-char sha>[+] <UTC date>` (`apps/demo/vite.config.ts` `buildId()`, with `+` when the tree
    is dirty);
  - the engine's snapshot key is `1.0.0-rc.2+dev`, because the demo's Vite build never sets `PME_BUILD`. So no rc.1
    bookmark restores in an rc.2 kit.
- `scripts/showcase/check-relay.mjs` is the relay smoke test: 2 runs, a real WebSocket frame each.
- `scripts/showcase/kit-round-a.kitround.ts` (config `playwright.kit-round.config.ts`; it serves the kit through its own
  `Start Classroom.command`) runs the Q1 test "30-minute talk": opening and QR, bronchospasm with H21, tamponade with
  the Debrief printed, MH with the 13:03 press, then the close.
- `scripts/showcase/rehearsal.showcase.ts` re-takes the six showcase-card screenshots.
- `scripts/showcase/debrief-fa.mjs` turns a Debrief JSON into the Persian handout.
- Pages is an orphan `gh-pages` branch (legacy build, `/` root). It holds the kit's `app/`, plus `.nojekyll`, the
  licence files, `README.md` and `VERSION.txt`, and it is force-pushed by the orchestrator only.

**Spec.**
- The brief: `scratch/briefs/plan-rc2-release-day.md`.
- `RELEASE.md`: Before the tag, Tag, After the workflow, If the workflow fails.
- The rulings: `research/00-orchestrator-rulings.md`, the 2026-10-18 entries on the rc.1 tag, Pages and Q1 (the lines
  "TAGGED v1.0.0-rc.1 …", "Pages tree ready …", "Release verified …", "Q1 DONE …").
- Debrief plan Task V, G1–G5.
- `docs/gates/stage-8b.md` §6, §11 and §20.
- `docs/gates/stage-12-real-phone.md`.
- `docs/showcase/SHOWCASE-2-MEASUREMENTS.md` §Q1.
- `scratch/gh-pages-rc1/README.md` and its `VERSION.txt`.
- `_sandbox/pme-kit-release-3db25a3b/README.txt`.

---

## Global Constraints

- **Freeze.** No product change after the freeze, in any branch:
  - no merge to `main` after Tuesday 18:00, except B in the Wednesday branch (E57, G5);
  - after the tag, only docs: in order, the B revert PR (Task 8.3, if needed), the docs PR (Task 9), PR #85 (the
    headless-host note) and other post-tag docs; each after main green.

  The kit-round script is test tooling. It ships in no kit, so its Q2 edits (Task 4 Step 2) are allowed, and they land
  in the docs PR.
- **Never edit the main checkout** `repo/` (it is about 280 commits behind). `git fetch`, `git tag` and `git push` of a
  tag or of `gh-pages` from it are fine: they do not touch its working tree. Read and build only in the worktrees
  named here.
- **Shell.**
  - Never a command that waits on stdin: no `gh run watch` without a run id, no `git commit` without `-m`, no
    `git revert` without `--no-edit`, no heredoc (write files with the editor tool).
  - Never an unfiltered `pkill`. To stop the classroom server, close its terminal; the kit-round setup stops its own
    launcher.
  - One e2e or kit-round run at a time on this Mac.
  - `--reporter=list` on every Playwright run.
- **gh** commands name the repository (`-R samhv-dev/patient-monitor-engine`), so they work from any directory.
- **Variables.** Shell state does not persist between commands, so Task 1 Step 1 writes
  `scratch/rc2-release/env.sh` and every later command block starts with:
  `. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh`
- **Nothing is deleted.** Old kits, PDFs and folders are MOVED to `$TD` (`/Users/samhv/Desktop/Claude/_to_delete/rc2-release-day-<date>/`).
  The rc.1 release kit folder `_sandbox/pme-kit-release-3db25a3b/` stays where it is: it is the fallback.
- **Words.**
  - "pre-release" every time the version is named;
  - "For education only. Not a medical device and not clinically validated";
  - no claim the product has not earned (the owner: "we should not advertise what we are not");
  - future work is "a later release", never "v1.1";
  - new Persian text only with the `persian-writing` skill.
- **Downloads.** Task 2 Step 4 downloads the project's own 8 release assets (≈ 6.6 MB) from its GitHub release into a
  new empty folder. Nothing else is downloaded.

---

## Decisions this plan makes where the brief or the rulings were silent

1. **The kit's `READ ME FIRST.txt` gets a 5-line "THIS KIT" block appended AFTER the build** (Task 3 Step 3). The
   brief asks the READ ME FIRST to name the version, the build and "bookmarks from rc.1 will not restore". Changing the
   template `scripts/showcase/kit/read-me-first.txt` would be a product change after the freeze.
   - The block is appended once, in `$KIT`, before any copy is made, so every copy stays byte-identical.
   - `VERSION.txt`, `app/` and `server/` are untouched.
2. **Q2 is the name of this rehearsal**, its evidence goes to `docs/showcase/kit-round-a/q2/`, and its write-up is
   MEASUREMENTS §Q2. The test inside the script keeps its title "Q1 30-minute talk …", so its files are still named
   `q1-*`. **One output folder per rehearsal run, never in place** (orchestrator ruling on review fix 10):
   `KITROUND_TAG` renames only the per-segment JSON/MD, so every re-run gets its own `KITROUND_OUTDIR` —
   `q2` (the first run), `q2-a3` (the B cases' A3 test, F10), `q2-rerun` (Task 8.1), `q2-fallback-<FALLBACK8>`
   (Task 8.2 row 1). Task 5 reads the set the gate verdict names.
3. **The Q2 script edits are made only where the tagged script lacks them** (Task 4 Step 2):
   - the MH tick at Early signs, which B6 Step 2 would have added;
   - three Monitor-view screenshots, one per talk card;
   - the Run by date (24 October; re-dated to **28 October**, the demo day, on 2026-10-20).

   PR #90 (#90, kit round Q2-pretag) already merged the tick, the three screenshots and the Run by; on the release
   day only the Run by date changed (+1/−1).

   They are made in the docs worktree, never in the kit's worktree: a dirty tree would mark the kit's build `+`.
4. **The release asset is the H22 embed**: the owner double-clicks what users download. If the workflow did not
   publish, the embed comes from `npx -y pnpm@9.15.9 build` in `wt-rc2-tag`.
5. **Pages follows the demo kit**:
   - normally that is the tag;
   - if Task 8 moves the demo to the FALLBACK_SHA kit, Pages is that kit's `app/`;
   - if the demo moves to the rc.1 kit, `gh-pages-rc1` (5bda2c8b, kept locally) is force-pushed back.

   In every case, the room's no-phones fallback shows the same build as the presenter's kit.
6. **The demo does not depend on the GitHub release.** Kits, rehearsal, Persian and Pages build from the tag, not
   from the release assets. A failed release workflow is fixed after the demo, and the tag is not moved before
   the demo (Wednesday 28 October; a fix goes into rc.3 instead) (`RELEASE.md` "If the workflow fails" allows a move only while no release exists, but a moved tag would no
   longer name the kits' commit).
7. **The rc.1 Persian handouts move into the rc.1 fallback folder** (`pme-kit-release-3db25a3b/fa-handouts-rc1/`), not
   to `$TD`. If the demo falls back to rc.1, its handouts are beside it.
8. **The re-taken six-card screenshots replace `docs/showcase/rehearsal/*.jpg` in place**, as every earlier kit round
   did. `KIT-GATE.md` gets one line saying so.
9. **The owner's folders are inventoried before any `mv` or `cp`, and every placement copy is `cp -n`** (orchestrator
   ruling on review fix 8). The Debrief plan's G2 (Persian handouts into `_sandbox/pme-debrief-fa/`) and G3 (print
   PDFs and `HOW-TO-CHECK-THE-PRINT.txt` into `_sandbox/pme-debrief-rc2/`) run on Tuesday afternoon from `H`, before the
   tag. **When B lands (T-B, W-B), G2's and G3's outputs ARE the owner's Persian and print set** (built from B's final
   head, the content of the tag): Tasks 4 Step 5 and 5 Step 2 leave them in place, never overwrite them, and place the
   Q2 renders only as the evidence they are checked against. **In T-F and W-F**, G2/G3's outputs come from a build the
   tag does not contain: they move to `$TD/pme-debrief-fa-G2-<H8>/` and `$TD/pme-debrief-rc2-G3/`, and the Q2 renders
   take their place.
10. **The owner's notes are copied to a dated folder before they are edited** (`$TD/owner-notes-before-rc2/`:
    `PRE-FLIGHT.md`, `OWN-PHONE-TEST.md`, `HOW-TO-CHECK-THE-PRINT.txt`, the rc.1 `README.txt`), and Task 8's rc.1 row
    restores them (orchestrator ruling on review fix 7).

---

## Branches and timeline

The tag commit (`TAG_SHA`) comes from exactly one of four cases. `FALLBACK_SHA` = the Task V merge (A + V), green on
main (the time is in the gate note §A; the merge chain is armed, so V may land on Monday).

| Case | When | Condition (Debrief plan) | `TAG_SHA` | After the tag |
|---|---|---|---|---|
| **T-B** | Tue 17:30 | B merged by 16:30 (G4) AND main CI-6 on the merge `completed`, `success` by 17:30 | B's merge commit = `origin/main` | — |
| **T-F** | Tue 18:00 | anything else on Tuesday, and G5 does not hold | `FALLBACK_SHA` | if B merged (main red or late): the B revert PR (Task 8.3) |
| **W-B** | Wed ≤ 12:00 | G5 held at 17:30; B merged ≤ 10:00; main CI on it green by 11:45 | B's merge commit | — |
| **W-F** | Wed ≤ 12:00 | G5 held but B failed a job, or main is red or not done by 11:45 | `FALLBACK_SHA` | the B revert PR if B merged |

**As run and re-dated (2026-10-20, plan A).** The tag came at Tuesday 00:17, so the "T" branch ran overnight:

```
Tue 20  00:17    Task 1–2 (orch): tag v1.0.0-rc.2 on b39b3d87 (main run 39218008576 green); release run
                 39322222807 published 00:22 (Pre-release, 8 assets)                                   DONE
        00:19    Task 3 (executor): kit, relay 2/2, READ ME, placement, embed (≈ 4 min)              DONE
        00:24    Task 4: Q2 talk — first run hung in the close (FX-12 probe) on both engines; script
                 click bounded; re-run into q2-rerun/ 01:01–01:20 (2 passed); FX-16 3/3; A3 2/2       DONE
        01:30    Task 5: Persian ≈ 1 min                                                              DONE
        01:31    Task 6: Pages tree gh-pages-rc2 (the push by orch)                                   DONE (tree)
        01:33    Task 4 Step 6: six-card shots, 16 passed in 55.5 min (until 02:28)                     DONE
        01:34    Task 9 Steps 1–3 and 4.1–4.4 in wt-rc2-q2; the docs PR opens as a DRAFT (smoke pending)
Tue 20 evening   Task 7: the owner's smoke check, ≈ 20 min (or Wednesday 21)
  or Wed 21      Task 9 Steps 4.5–6: the smoke results in; the draft PR is marked ready; review → merge
Sat 24  18:00    rc.3 freeze (a v1.0.0-rc.3 follows rc.2, the baseline)
Mon 26           rc.3 kits rehearsal-ready
Wed 28           Demo: the release kit, the rc.1 kit beside it on the stick
```

The original timeline, for the record:

```
Tue 20  ≤ 18:00  Task 1 (orch) → Task 2 (orch): tag, release workflow ≈ 5 min, assets
        18:20    Task 3 (executor): kits, relay 2/2, READ ME, placement, embed          ≈ 1 h
        19:20    Task 4: Q2 rehearsal, Chromium then WebKit, then the six-card shots   ≈ 2.5 h (T branches: tonight;
                 if the machine is busy, Wed 09:00)
        21:50    Task 5: Persian ≈ 0.5 h → Task 6: Pages ≈ 0.5 h (the push by orch)
Wed 21  09:00    (T) Task 9 Steps 1–3 and 4.1–4.4 in the worktree (no push)
        12:00    (W) Tasks 1–2; 12:20 Task 3; 13:20 Task 4; 16:00 Task 5; 16:30 Task 6; 17:00 Task 9 Steps 1–3, 4.1–4.4
        19:00    Task 7: the owner's smoke check, ≈ 20 min (both branches)
        ≈ 20:00  Task 9 Steps 4.5–6: the smoke results in, then the docs PR opens (CI ≈ 45 min)
Thu 22  morning  Task 9 Step 7: review → merge by Thu 12:00. Merge order after the tag, each after main green:
                 the B revert PR (if any) → the docs PR → PR #85 (headless-host note) → other post-tag docs
Thu 22–Fri 23    E13 (the presenting Mac), E14 (router test)
Sat 24           Demo (now Wednesday 28 October): the rc.2 kit, the rc.1 kit beside it on the stick
```

A gate failure in Task 4 sends the day to Task 8 (rollback), which costs ≈ 2.5–3 h. In the W branches, that ends
≈ 19:30 Wednesday: the owner's smoke then runs on whatever kit Task 8 chose.

---

## Effort, CI and who does what

| Task | Who | Hours | CI / machine | Owner |
|---|---|---|---|---|
| 0 Pre-tag notes and roadmap — DONE (7e79be36); Step 3 re-check on the tag commit | orch | 0.1 | — | E83, E84 by Tue 12:00 |
| 1 Choose and verify the tag commit | orch | 0.25 | install ≈ 3 min, 2 tests ≈ 1 min | — |
| 2 Tag, release workflow, assets, SHA256SUMS, Pre-release | orch | 0.4 | **release.yml: 1 run ≈ 5 min** (rc.1: 4 min 58 s) | — |
| 3 Kits, relay, READ ME, placement, embed | executor | 1.0 | build ≈ 4 min, relay ≈ 1 min | — |
| 4 Q2 rehearsal (both browsers) + FX-16 WebKit e2e + six-card shots (+ A3 test in B cases) | executor | 2.75 | machine exclusive ≈ 1–1.3 h: talk ≈ 10–12 min × 2, FX-16 ≈ 2 min, shots ≈ 1 h (prep correction 1), A3 ≈ 20 min (B cases) | — |
| 5 Persian handouts | executor | 0.5 | ≈ 3 min | — |
| 6 Pages republish | executor (tree) + orch (push) | 0.5 | Pages legacy build ≈ 1–10 min | — |
| 7 Owner's smoke + E13/E14 | owner (orch guides) | 0.4 | — | ≈ 20 min Wed; E13 10 min; E14 30–60 min |
| 8 Rollback (only on a gate failure) | orch + executor | 2.5–3 | rehearsal again ≈ 1 h; revert PR **2 runs** ≈ 45 min each, no deadline | E86 |
| 9 Docs PR (opens after Task 7, ≈ 20:00 Wed) + independent review | executor + reviewer | 2.0 + 0.5 | **2 runs** (PR, then main) ≈ 45 min each | — |
| **Total without rollback** | | **≈ 8.4 h** (orch ≈ 1.4, executor ≈ 6.5, reviewer 0.5) + owner ≈ 1–1.5 h | **3 runs** (release 1, docs 2); + 2 for a B revert; + ≈ 4 for an rc.3 (E86 b) | |

---

## Tasks

### Task 0 (orch) — DONE 2026-10-19 (7e79be36); Step 3 is a re-check only

**Why it existed.** The release page's body is ONLY the `## [1.0.0-rc.2]` section (`release.yml`'s `awk`). On the
first V commit (7b586812) that section had `### Fixed`, `### Changed` and one Known limitation (FX-15), and none of
"pre-release", "education only", "not a medical device, not clinically validated" or "rc.1's limits still apply".
`docs/roadmap/v1.0-remaining.md:12` also promised "Classroom kit as a release asset — Next release candidate (rc.2)".
**All of it is now on `release-rc2` 7e79be36** (`docs(release): the rc.2 notes say pre-release, education only, and
what is not done`, +21/−5 in `CHANGELOG.md` and `docs/roadmap/v1.0-remaining.md`). Do NOT insert any of it again.

- [x] **Step 1.** The pre-release paragraph under `## [1.0.0-rc.2] - 2026-10-20` (E83, as drafted), and the four
  Known-limitation bullets (the kit not a release asset; `RELEASE.md` items 8 and 9 not run; the temporary WebKit retry
  relaxation; the owner's hand checks ran on rc.1, a shorter smoke check for rc.2): in 7e79be36.
- [x] **Step 2.** The roadmap rows (E84 (a): the kit row "a later release candidate"; "State on 2026-10-20 (release
  candidate `1.0.0-rc.2`)"; licence review closed by the owner; hand checks; clean-up done): in 7e79be36.
- [ ] **Step 3. Re-check (orch), on the tag commit, as part of Task 1 Step 3.** Task 1 Step 3's notes preview must
  contain the paragraph and the four bullets. The extra greps, run there:

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
head -3 $W/NOTES-preview.md
grep -c "not a release asset of this release\|Not run at this release\|Temporary relaxation\|shorter smoke check" $W/NOTES-preview.md
grep -c -i "v1\.1" $W/NOTES-preview.md
git -C $R/repo show "$TAG_SHA:docs/roadmap/v1.0-remaining.md" | grep -c "later release candidate"
```

  Expected: a blank line, then "Second public **pre-release** (release candidate) of a teaching simulator. …"; `4`;
  `0`; ≥ 1. The last Known-limitation bullet must still be true at the tag (the owner's checks of 2026-10-18 ran on
  rc.1; H19 failed). If any of it is no longer true, record it in the gate note; the release body can be corrected by
  `gh release edit` after the workflow (the body only, never an asset).
- [x] **Step 4.** The R-B review brief carries the CHANGELOG line ("B's CHANGELOG lines go under `## [1.0.0-rc.2]`;
  `## [Unreleased]` stays empty"): `scratch/briefs/review-debrief-b.md:14`. Task 1 Step 3 checks it on the tag commit.

### Task 1 (orch): choose the tag commit and verify it — DONE 2026-10-20, before the 00:17 tag (b39b3d87, main run 39218008576)

- [ ] **Step 1. Variables.** Read `FALLBACK_SHA` from the gate note §A (`grep -n FALLBACK_SHA
  scratch/debrief-gate-rc2/gate-note.md`). Pick the case from the table above, and set `TAG_SHA`. Then write the
  variables file (`printf`, no heredoc):

```bash
mkdir -p /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo && git fetch -q origin --tags
TAG_SHA=$(git rev-parse <FALLBACK_SHA or origin/main>)        # the case's commit, full 40 characters
printf 'R=%s\nS=%s\nW=%s\nTD=%s\nFALLBACK_SHA=%s\nTAG_SHA=%s\nSHA8=%s\nV=v1.0.0-rc.2\nGHR=samhv-dev/patient-monitor-engine\nKIT=%s\n' \
  /Users/samhv/Desktop/Claude/projects/patient-monitor-engine /Users/samhv/Desktop/Claude/_sandbox \
  /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release \
  "/Users/samhv/Desktop/Claude/_to_delete/rc2-release-day-$(date +%F)" <FALLBACK_SHA> "$TAG_SHA" "${TAG_SHA:0:8}" \
  "/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/kit/pme-showcase-kit-${TAG_SHA:0:8}" \
  > /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
cat /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
```

  Expected: ten lines; `TAG_SHA` is 40 hexadecimal characters, and `SHA8` is its first 8.
- [ ] **Step 2. Main green on the commit; the tag commit contains A and V; nothing else is on top.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
cd $R/repo
git merge-base --is-ancestor "$FALLBACK_SHA" "$TAG_SHA" && echo has-A-and-V
git log --oneline --first-parent "$TAG_SHA"..origin/main
gh run list -R $GHR --workflow ci --commit "$TAG_SHA" --json databaseId,event,status,conclusion --jq '.[] | select(.event=="push")'
git ls-remote --tags origin "$V*"
```

  Expected:
  - `has-A-and-V`;
  - the log (first parent only) prints nothing (T-B, W-B), or only B's merge (T-F/W-F with B merged; Task 8.3
    reverts it later);
  - one push run, `"status":"completed","conclusion":"success"`;
  - no remote tag yet.

  Record the run id. Then list the WebKit retry-only passes of that run (warn-only until the demo); they go to the
  gate note and, if new, to `known-deviations.md` in Task 9:

```bash
gh run view <run id> -R $GHR --log 2>/dev/null | grep -i "passed only on retry" | sort -u | head -20
gh run view <run id> -R $GHR --log 2>/dev/null | grep "e2e (chromium)" | grep -i "fx16-follower-beep-gate" | grep -i -E "passed|✓|flaky|retry" | head -5
```

  and confirm in that run's `e2e (chromium)` job that `fx16-follower-beep-gate.e2e.ts` passed on the first attempt
  (it is not in the retry-only list). This e2e is the only automated FX-16 check on CI: it skips WebKit under `CI`
  (`fx16-follower-beep-gate.e2e.ts:67`), so Task 4 Step 3b runs it on macOS WebKit locally.

- [ ] **Step 3. The release files on the commit.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
git -C $R/repo show "$TAG_SHA:CHANGELOG.md" | grep -n -E '^## \[(Unreleased|1\.0\.0-rc\.2)\]'
git -C $R/repo show "$TAG_SHA:CHANGELOG.md" | awk '/^## \[Unreleased\]/{on=1;next} /^## \[/{on=0} on' | grep -c '[^[:space:]]'
git -C $R/repo show "$TAG_SHA:CITATION.cff" | grep -E '^(version|date-released):'
git -C $R/repo show "$TAG_SHA:CHANGELOG.md" | awk -v v="1.0.0-rc.2" 'index($0, "## [" v "]") == 1 {on = 1; next} /^## \[/ || /^\[[^]]+\]: / {on = 0} on' > $W/NOTES-preview.md
grep -c "not clinically validated" $W/NOTES-preview.md
```

  Expected:
  - two headings, `## [Unreleased]` then `## [1.0.0-rc.2] - 2026-10-20`;
  - `0` non-blank lines under Unreleased;
  - `version: 1.0.0-rc.2` and `date-released: "2026-10-20"`;
  - the preview is non-empty, and the count is ≥ 1 (Task 0).

  In T-B and W-B, the preview also carries B's lines. A B line under Unreleased is a STOP: the tag goes on that commit
  anyway (nothing can merge), and the orchestrator adds B's lines to the release body by hand after the workflow
  (`gh release edit $V -R $GHR --notes-file <corrected NOTES>`; the body only, not an asset). Record this in the gate
  note.

  In the W branches, the header date stays 2026-10-20 while the tag is dated 21 October (E85). The default is to
  accept it, and Task 9 corrects CHANGELOG and CITATION to 2026-10-21 on `main`.

  Task 0 Step 3's greps run here too.

  **RELEASE.md "Before the tag" item 2** (the validation summary quotes the release tree's report, or says it is
  older and why): record in the gate note whether any physiology changed since 3db25a3b
  (`git -C $R/repo diff --stat 3db25a3b "$TAG_SHA" -- packages/engine-core/src`, read it). If none did, the rc.1
  validation report stands; say so in one line. If some did (FX-16 touched the engine's beep only; Stage 14 rewrote
  comments), name the files and say why the report still stands or that it is older, in the gate note and in the docs
  PR's `validation-summary.md` line if needed. Items 1, 3 and 4 are checked above; item 5 is re-run by `release.yml`;
  items 8 and 9 are stated as not run in the notes.
- [ ] **Step 4. Versions, on a clean worktree of the commit** (also the kit's build tree in Task 3):

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
git -C $R/repo worktree add --detach $R/scratch/wt-rc2-tag "$TAG_SHA"
cd $R/scratch/wt-rc2-tag && npx -y pnpm@9.15.9 install --frozen-lockfile > $W/install-tag.log 2>&1; tail -1 $W/install-tag.log
npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/release-versions.test.ts test/docs-honesty.test.ts --reporter=dot
node -p "require('./packages/renderer/package.json').version"
git status --porcelain --untracked-files=no | wc -l
```

  Expected: install done; `release-versions` 3 passed and `docs-honesty` 7 passed; `1.0.0-rc.2`; `0` (the tree is
  clean).

### Task 2 (orch): the tag, the release workflow, the assets, the Pre-release flag — DONE 2026-10-20 00:17–00:22 (run 39322222807; Step 4 by the executor, SHA256SUMS 7/7)

- [ ] **Step 1. Tag (annotated) and push.** The message is plain: the owner's "we should not advertise what we are
  not". It uses the rc.1 pattern, and names no feature.

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
cd $R/repo
git tag -a "$V" "$TAG_SHA" -m "patient-monitor-engine $V (pre-release): second release candidate for v1.0. Education only; not a medical device and not clinically validated."
git cat-file -t "$V"; git rev-parse "$V^{commit}"
git push origin "$V"
git ls-remote --tags origin "$V*"
```

  Expected: `tag`; the commit is `$TAG_SHA`; `* [new tag] v1.0.0-rc.2 -> v1.0.0-rc.2`; the remote lists
  `refs/tags/v1.0.0-rc.2` and `refs/tags/v1.0.0-rc.2^{}` (= `$TAG_SHA`). Record the local time of the push.
- [ ] **Step 2. The release workflow.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
gh run list -R $GHR --workflow release --commit "$TAG_SHA" --limit 1 --json databaseId,headBranch,status
gh run watch <databaseId> -R $GHR --exit-status --interval 30
```

  Expected: `headBranch` `v1.0.0-rc.2`; the watch ends with exit 0 in about 5 minutes. The list can be empty for the
  first seconds after the push: repeat it (every 10 s) until a run appears, then watch that id.

  If it fails:
  - **A failed e2e step** (`iife-smoke` or `vent-embed` on WebKit; `vent-embed.e2e.ts:34` is known-flaky there):
    `gh run rerun <id> -R $GHR --failed`, at most twice. The release step is the last one, so nothing has been
    published yet.
  - **Any other failure, or a third e2e failure:** no release exists. Do not move the tag and do not change `main`
    (Decision 6). Carry on with Tasks 3–7, which do not need the release, and take Task 3 Step 6's local-build path for
    the embed. Record the run id, and fix it after the demo by `RELEASE.md` "If the workflow fails".
- [ ] **Step 3. The release page.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
gh release view "$V" -R $GHR --json isPrerelease,isDraft,name,tagName,assets --jq '{isPrerelease,isDraft,name,tagName,n:(.assets|length),assets:[.assets[].name]|sort}'
gh release view "$V" -R $GHR --json body --jq .body | head -4
gh api repos/$GHR/releases/latest --jq .tag_name
```

  Expected:
  - `isPrerelease: true`, `isDraft: false`, `name: "patient-monitor-engine v1.0.0-rc.2"`, `n: 8`;
  - the assets: `LICENSE`, `LICENSES.zip`, `NOTICES.md`, `SHA256SUMS.txt`, `api-reference-v1.0.0-rc.2.zip`,
    `patient-monitor.iife.js`, `patient-monitor.iife.js.map`, `ventilator-monitor-embed-v1.0.0-rc.2.zip`;
  - the body starts with the Task 0 paragraph;
  - the last command fails with `HTTP 404`: no full release exists, and a pre-release is never "Latest".

  The release page on github.com shows the orange **Pre-release** label.
- [ ] **Step 4. SHA256SUMS** (downloads the 8 assets, ≈ 6.6 MB, into a new empty folder):

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
mkdir $W/assets && gh release download "$V" -R $GHR -D $W/assets
cd $W/assets && wc -l < SHA256SUMS.txt && shasum -a 256 -c SHA256SUMS.txt
head -c 48 patient-monitor.iife.js; echo
unzip -l "ventilator-monitor-embed-$V.zip" | grep -E ' (LICENSE|NOTICES\.md|LICENSES/Apache-2\.0\.txt|ventilator-monitor\.html)$' | wc -l
unzip -l "api-reference-$V.zip" | grep -c -E ' (NOTICES\.md|TYPEDOC-ASSETS-LICENSE-Apache-2\.0\.txt|lunr-[^ ]*\.txt)$'
```

  Expected:
  - `7`, then 7 lines ending `: OK`;
  - `/*! patient-monitor-engine 1.0.0-rc.2`;
  - `4`;
  - ≥ 3.

  Record the release run id, the published time (`gh release view $V -R $GHR --json publishedAt`) and the IIFE size
  (`wc -c < patient-monitor.iife.js`; rc.1 was 693,451 B) in `$W/gate-notes.md`.

### Task 3 (executor): the kits, the relay smoke test, the READ ME, the owner's folders, the H22 embed — DONE 2026-10-20 00:19–00:23

- [ ] **Step 1. Build the kit from the tag's clean worktree.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
cd $R/scratch/wt-rc2-tag && git rev-parse HEAD && git status --porcelain --untracked-files=no | wc -l
node scripts/showcase/make-bundle.mjs "$KIT" > $W/kit-build.log 2>&1; tail -12 $W/kit-build.log
sed -n '2,3p' "$KIT/VERSION.txt"
grep -h -o -E '"[0-9a-f]{8}\+? 20[0-9-]*"' "$KIT"/app/assets/*.js | sort -u    # -E: an agent shell's ugrep rejects the BRE (prep correction 3)
grep -l '1\.0\.0-rc\.2' "$KIT"/app/assets/*.js | wc -l
grep -l '1\.0\.0-rc\.1' "$KIT"/app/assets/*.js | wc -l
```

  Expected:
  - `HEAD` = `$TAG_SHA`, `0`;
  - "Kit ready: …" and the kit's entries are listed;
  - `Commit:   <TAG_SHA>` with no "(with uncommitted changes)", and `Branch:   HEAD`;
  - one build id `"<SHA8> <today's UTC date>"`, with no `+`;
  - ≥ 1;
  - 0. A non-zero count is listed and judged in Task 4 Step 4 (any `rc.1` on screen is a gate failure).
- [ ] **Step 2. The relay smoke test, 2 of 2.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
cd $R/scratch/wt-rc2-tag && node scripts/showcase/check-relay.mjs "$KIT" --json $W/relay-$SHA8.json | tail -2
```

  Expected: `classroom relay smoke test: PASS (2 of 2 runs; node v26…; kit <the kit path>)` (the line prints the kit's
  path, whatever its folder is called; prep correction 6). If it fails,
  that is a gate failure (Task 8): do not place the kit.
- [ ] **Step 3. The READ ME block (Decision 1).** With the editor, append to `$KIT/READ ME FIRST.txt` (fill in `<SHA8>`
  and the build date from Step 1):

  ```

  THIS KIT (added after the build)
     Version 1.0.0-rc.2 (pre-release), build <SHA8> <build date>: the Start screen shows the version; every Debrief page's footer shows the version and the build.
     For education only. Not a medical device and not clinically validated: never use it for patient care.
     Bookmarks and saved sessions from rc.1 kits (pme-showcase-kit-3db25a3b) and older will not restore here: take new ones.
     Keep the rc.1 kit beside this one as the fallback; do not mix the two kits in one classroom.
  ```

- [ ] **Step 4a. Inventory the owner's folders, and keep copies of his notes (Decisions 9, 10). Before any `mv` or
  `cp`.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
mkdir -p "$TD"
ls -la "$S/pme-classroom-dryrun" "$S/pme-debrief-dryrun" "$S/pme-debrief-fa" "$S/pme-debrief-rc2" "$S/pme-kit-release-3db25a3b" "$S/pme-embed-rc1" > $W/inventory-before.txt 2>&1; cat $W/inventory-before.txt
grep -c "1.0.0-rc.1" "$S/pme-debrief-fa/READ-ME-FIRST.txt" "$S/pme-debrief-dryrun/HOW-TO-CHECK-THE-PRINT.txt" "$S/pme-debrief-rc2/HOW-TO-CHECK-THE-PRINT.txt" 2>&1
mkdir -p "$TD/owner-notes-before-rc2" && cp -p "$S/pme-classroom-dryrun/PRE-FLIGHT.md" "$S/pme-classroom-dryrun/OWN-PHONE-TEST.md" "$S/pme-debrief-dryrun/HOW-TO-CHECK-THE-PRINT.txt" "$S/pme-kit-release-3db25a3b/README.txt" "$TD/owner-notes-before-rc2/"
ls "$TD/owner-notes-before-rc2"
```

  Expected: the inventory lists what is there now. On 19 October it was:
  - `pme-classroom-dryrun/`: `CLASSROOM.md`, `OWN-PHONE-TEST.md`, `PRE-FLIGHT.md`, `kit/` (3db25a3b);
  - `pme-debrief-dryrun/`: `HOW-TO-CHECK-THE-PRINT.txt`, three `debrief-*-cb4fb17e.pdf`, `pme-showcase-kit-3db25a3b/`;
  - `pme-debrief-fa/`: three `debrief-fa-*-2026-10-18.pdf`, `READ-ME-FIRST.txt` (rc.1);
  - `pme-debrief-rc2/`: absent;
  - `pme-kit-release-3db25a3b/`: `README.txt`, the kit;
  - `pme-embed-rc1/`: eight entries.

  **Anything else in `pme-debrief-fa/` or `pme-debrief-rc2/` is the Debrief plan's G2/G3 output** (Tuesday, from
  `H`). Name each such file in `$W/gate-notes.md`; Decision 9 says what happens to it in Tasks 4 Step 5 and 5 Step 2.
  Nothing in those two folders is touched in this task. The `grep -c` shows which READ-ME and HOW-TO files still name
  rc.1. The four notes are copied: `README.txt`, `PRE-FLIGHT.md`, `OWN-PHONE-TEST.md`, `HOW-TO-CHECK-THE-PRINT.txt`.
- [ ] **Step 4. Place the kits (move, never delete; `cp -n` for every placement copy).**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
mkdir "$S/pme-kit-release-$SHA8" && cp -Rn "$KIT" "$S/pme-kit-release-$SHA8/"
mv "$S/pme-classroom-dryrun/kit" "$TD/pme-classroom-dryrun-kit-3db25a3b" && cp -Rn "$KIT" "$S/pme-classroom-dryrun/kit"
mv "$S/pme-debrief-dryrun/pme-showcase-kit-3db25a3b" "$TD/" && cp -Rn "$KIT" "$S/pme-debrief-dryrun/"
mkdir "$TD/pme-debrief-dryrun-cb4fb17e-pdfs" && mv "$S"/pme-debrief-dryrun/debrief-*-cb4fb17e.pdf "$TD/pme-debrief-dryrun-cb4fb17e-pdfs/"
for d in "$S/pme-kit-release-$SHA8/pme-showcase-kit-$SHA8" "$S/pme-classroom-dryrun/kit" "$S/pme-debrief-dryrun/pme-showcase-kit-$SHA8"; do diff -rq "$KIT" "$d" && echo "same: $d"; done
ls "$S/pme-kit-release-3db25a3b"
```

  Expected: three `same:` lines, and `pme-kit-release-3db25a3b` still holds `README.txt` and its kit (the fallback;
  never moved). zsh aborts a line on an unmatched glob: if the `debrief-*-cb4fb17e.pdf` line stops with "no matches
  found", the PDFs were moved earlier: check `$W/inventory-before.txt`, record it, and go on (the `mkdir` before it is
  harmless).

  Then write, with the editor:
  - **`$S/pme-kit-release-$SHA8/README.txt`**, modelled on `pme-kit-release-3db25a3b/README.txt`:
    - built from `<TAG_SHA>` (tag `v1.0.0-rc.2`, case T-B/T-F/W-B/W-F) on `<date>` by `make-bundle.mjs` from a clean
      checkout;
    - "THIS IS THE RELEASE BUILD … Version 1.0.0-rc.2 (pre-release) …";
    - "A release build refuses snapshots made by another build: bookmarks and saved sessions from the rc.1 kit
      (3db25a3b) and older will not restore in this kit. Take new bookmarks here.";
    - the relay line ("PASS, 2 of 2 runs, node …, <date>");
    - "Rehearsed on this kit (kit round Q2, <date>): see SHOWCASE-2-MEASUREMENTS.md section Q2" (filled in after
      Task 4);
    - "The rc.1 kit in pme-kit-release-3db25a3b is the fallback: take both on the stick."
  - **One line at the top of `$S/pme-kit-release-3db25a3b/README.txt`:** "FALLBACK for Wednesday 28 October: the rc.2
    kit is pme-kit-release-<SHA8>. Use this kit only if the rc.2 kit fails; its Persian handouts are in fa-handouts-rc1/."
  - **`$S/pme-classroom-dryrun/PRE-FLIGHT.md` and `OWN-PHONE-TEST.md`:** replace the italic "Kit round Q1 (2026-10-18)
    …" sentence and the STATE line's kit sentence with "`kit/` is the rc.2 release build from `<SHA8>` (v1.0.0-rc.2,
    pre-release); relay smoke test PASS 2 of 2 on `<date>`; bookmarks from the rc.1 kit will not restore. The rc.1 kit
    you checked H17–H22 on is kept as the fallback in `pme-kit-release-3db25a3b`."
  - **`$S/pme-debrief-dryrun/HOW-TO-CHECK-THE-PRINT.txt`:** rewrite it for this kit:
    - the kit path;
    - the footer string with `1.0.0-rc.2` and `<SHA8>`;
    - E50: untick Headers and footers;
    - the verdict words ✓ Observed / ✗ Not observed / – Not assessable / ◆ Discuss;
    - the page counts: free run ≤ 4; tamponade ≤ 6 with A, the measured number with B;
    - with B: the "Print the learner handout" button, 1 page;
    - the comparison PDFs are in `_sandbox/pme-debrief-rc2/` (Task 4 Step 5).

    If Step 4a showed a G3 `HOW-TO-CHECK-THE-PRINT.txt` in `pme-debrief-rc2/`, write the same facts here and leave
    that one as it is (T-B/W-B) or move it with the G3 set (T-F/W-F, Task 4 Step 5).
- [ ] **Step 5. The fallback set is complete.** Make sure `$S/pme-kit-release-3db25a3b/pme-showcase-kit-3db25a3b/`
  opens: run `sed -n '2p' VERSION.txt` there; expected `Commit:   3db25a3b3f1c…`. Leave it as it is.
- [ ] **Step 6. The H22 embed folder.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
mkdir "$S/pme-embed-rc2" && unzip -q "$W/assets/ventilator-monitor-embed-$V.zip" -d "$S/pme-embed-rc2"
ls "$S/pme-embed-rc2"; head -c 48 "$S/pme-embed-rc2/patient-monitor.iife.js"; echo
```

  Expected: `LICENSE LICENSES NOTICES.md patient-monitor.iife.js patient-monitor.iife.js.map pme-ventilator-embed.iife.js
  pme-ventilator-embed.iife.js.map ventilator-monitor.html` (as `pme-embed-rc1`), and the rc.2 banner.

  **No release (Task 2 Step 2 failure path):** run `cd $R/scratch/wt-rc2-tag && npx -y pnpm@9.15.9 build >
  $W/build-embed.log 2>&1 && cp -R apps/demo/dist/embed/. "$S/pme-embed-rc2/"` instead. The banner is the same; the
  engine build is `dev`, which H22 does not show.

  `pme-embed-rc1` stays until the owner's H22 on rc.2 passes (Task 7). Then
  `mv "$S/pme-embed-rc1" "$TD/"`. (`unzip` into a new folder cannot overwrite anything; the `mkdir` fails loudly if
  `pme-embed-rc2` already exists: then list it and stop.)

### Task 4 (executor): the automated 30-minute rehearsal on the new kit, both browsers (kit round Q2) — DONE 2026-10-20 00:24–01:30 (verdict on `q2-rerun/`, no F-failure; Step 6 01:33–02:28, 16 passed)

**This task REPLACES the Debrief plan's Wednesday rehearsal on the tag** (G5: "the kits are rebuilt from the tag and
the automated rehearsal (G1, both projects, and the Q1 talk) runs on them"): one rehearsal, one Mac. The Debrief
plan's Tuesday G1–G3 on `H` are not repeated here, except the A3 test in the B cases (F10, Step 3c).

**One output folder per run, never in place (Decision 2):** the first talk run writes `q2/`; the A3 test (B cases)
`q2-a3/`; a re-run (Task 8.1) `q2-rerun/`; a fallback kit's run (Task 8.2) `q2-fallback-<FALLBACK8>/`. Never point a
second run at a folder that already holds files (`ls` it first: it must not exist).

- [ ] **Step 1. The docs worktree** (rehearsal tooling and evidence; it becomes the docs PR's branch):

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
git -C $R/repo worktree add -b docs-rc2-release $R/scratch/wt-rc2-q2 "$TAG_SHA"
cd $R/scratch/wt-rc2-q2 && npx -y pnpm@9.15.9 install --frozen-lockfile > $W/install-q2.log 2>&1; tail -1 $W/install-q2.log
grep -c "Name malignant hyperthermia\|objective 1 \"Name malignant" scripts/showcase/kit-round-a.kitround.ts
grep -n "await M.row('state Early signs');\|fill('Showcase 2, 22 October')" scripts/showcase/kit-round-a.kitround.ts
```

  Expected: install done. The count is `0` (no B6 Step 2 tick in the script: apply Step 2 in full) or ≥ 1 (B's script
  ticks MH: skip Step 2's first two inserted lines, keep its screenshot line). The MH anchor line exists once (≈ :1522
  on f4f479d9); the Run-by fill exists TWICE (≈ :1150 in the A3 test and ≈ :1491 in the Q1 talk).
- [ ] **Step 2. The Q2 edits to the script (Decision 3)**, with the editor tool, in `wt-rc2-q2` only:
  1. **The MH tick at Early signs (E52, as the cue card).** After the line `    await M.row('state Early signs');` (in
     the Q1 talk, not the `R.row` lines of the older MH tests) insert:

     ```ts
         await page.locator('section[aria-label="Running scenario"] ul[aria-label="Objectives"] input[type=checkbox]').first().check().catch(() => undefined);
         await M.row('Early signs: objective 1 "Name malignant hyperthermia" ticked (E52)');
         await page.locator('.stage').screenshot({ path: join(OUTDIR, `q2-mh-monitor-early-signs-${M.r.browser}.png`) }).catch(() => undefined);
     ```

     The tamponade tick already exists at sim 1:00 ("1:00 CVP on the IBP2 tile; objective 1 ticked"): that is E54's
     "when the cues appear" on the run-sheet path. Leave it as it is. (A double tick, if B's script also ticks, is
     harmless: `.check()` is idempotent.)
  2. **Tamponade screenshot.** After `    await Tm.row('1:00 CVP on the IBP2 tile; objective 1 ticked', { ibp2 });`
     insert:

     ```ts
         await page.locator('.stage').screenshot({ path: join(OUTDIR, `q2-tamponade-monitor-1min-${Tm.r.browser}.png`) }).catch(() => undefined);
     ```

  3. **Bronchospasm screenshot.** After `    await B.row('Instructor → ×1');` insert:

     ```ts
         await page.locator('.stage').screenshot({ path: join(OUTDIR, `q2-bronchospasm-monitor-${B.r.browser}.png`) }).catch(() => undefined);
     ```

  4. **The Run by date, in the Q1 talk only (≈ :1491; the A3 test's ≈ :1150 is left as it is):** change that line's
     `fill('Showcase 2, 22 October')` → `fill('Showcase 2, 24 October')`; on the next line, the Notes text
     `'Kit round Q1 rehearsal on the release build.'` → `'Kit round Q2 rehearsal on the rc.2 release build.'`. The
     string `Showcase 2, 22 October` occurs twice, so select the Q1 talk's line by its neighbour (the Notes line), not
     by a replace-all.

  The script's `about.preRelease` regex still names `rc.1`, so it will read `false`. Do not edit it: Step 4 reads the
  label text itself.

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
cd $R/scratch/wt-rc2-q2
git diff --stat scripts/showcase/kit-round-a.kitround.ts
SHOWCASE_KIT="$KIT" npx playwright test -c scripts/showcase/playwright.kit-round.config.ts -g "Q1 30-minute talk" --list --reporter=list | tail -3
```

  Expected: one file, **+7/−2** lines (edits 1–3 add 3 + 1 + 1; edit 4 changes 2; with B's tick already present,
  +5/−2); the list prints the talk for `[chromium]` and `[webkit]` and "Total: 2 tests" (the file parses; `scripts/` is
  outside `pnpm typecheck`, so a syntax slip would otherwise show only at run time).
- [ ] **Step 3. Run the talk, Chromium then WebKit** (machine exclusive; one at a time; ≈ 10–12 min each):

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
cd $R/scratch/wt-rc2-q2
ls docs/showcase/kit-round-a/q2 2>&1 | head -1       # "No such file or directory": the folder is new
SHOWCASE_KIT="$KIT" KITROUND_OUTDIR=docs/showcase/kit-round-a/q2 npx playwright test -c scripts/showcase/playwright.kit-round.config.ts -g "Q1 30-minute talk" --project=chromium --reporter=list > $W/q2-chromium.log 2>&1; tail -4 $W/q2-chromium.log
SHOWCASE_KIT="$KIT" KITROUND_OUTDIR=docs/showcase/kit-round-a/q2 npx playwright test -c scripts/showcase/playwright.kit-round.config.ts -g "Q1 30-minute talk" --project=webkit --reporter=list > $W/q2-webkit.log 2>&1; tail -4 $W/q2-webkit.log
cp -n $W/relay-$SHA8.json docs/showcase/kit-round-a/q2/
ls docs/showcase/kit-round-a/q2 | wc -l
```

  Expected: `1 passed` each; the kit-round setup line "kit … served at http://127.0.0.1:8760/?relay by Start
  Classroom.command"; ≈ 35–40 files in `q2/`, including:
  - `q1-talk-{chromium,webkit}.json`;
  - `q1-0-…`, `q1-1-…`, `q1-2-…`, `q1-4-….{json,md}` per browser;
  - `debrief-q1-1-…`, `debrief-q1-2-…`, `debrief-q1-4-…-{chromium,webkit}.json`;
  - `q1-tamponade-debrief-chromium.pdf`, `q1-tamponade-debrief-print-{chromium,webkit}.png`;
  - six `q2-*-monitor-*.png`.

  (The Chromium and WebKit runs write different file names, so the second does not overwrite the first; the shared
  `relay-<SHA8>.json` is copied once.)
- [ ] **Step 3b. FX-16 on macOS WebKit** (≈ 2 min; CI skips this e2e on WebKit, `fx16-follower-beep-gate.e2e.ts:67`;
  the skip applies only under `CI`):

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
cd $R/scratch/wt-rc2-tag && env -u CI npx playwright test apps/demo/e2e/fx16-follower-beep-gate.e2e.ts --project=webkit --repeat-each 3 --reporter=list > $W/fx16-webkit.log 2>&1 < /dev/null; tail -4 $W/fx16-webkit.log; grep "FX-16 webkit:" $W/fx16-webkit.log
git -C $R/scratch/wt-rc2-tag status --porcelain --untracked-files=no | wc -l
```

  (prep correction 4: `env -u CI`, since the skip triggers on any `CI` in the environment; `--repeat-each 3` for the
  3× evidence; the ratio is in the log's `FX-16 webkit:` lines, which `tail -4` does not show.)

  Expected: 3 passed, none skipped, each ratio ≥ 90 %; `0` (the tag worktree stays clean; `test-results/` is ignored). A failure is a
  **NOTE** that goes to the owner's smoke item 3 (his ear on a real phone decides). It is not a gate failure.
- [ ] **Step 3c. F10, the B cases only (T-B, W-B): the A3 test on the tag kit, both projects** (≈ 20 min):

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
cd $R/scratch/wt-rc2-q2
SHOWCASE_KIT="$KIT" KITROUND_OUTDIR=docs/showcase/kit-round-a/q2-a3 npx playwright test -c scripts/showcase/playwright.kit-round.config.ts -g "A3 tamponade: the cue card path" --reporter=list > $W/q2-a3.log 2>&1; tail -4 $W/q2-a3.log
ls docs/showcase/kit-round-a/q2-a3
pdfinfo docs/showcase/kit-round-a/q2-a3/a3-tamponade-handout-chromium.pdf | grep Pages
pdftotext docs/showcase/kit-round-a/q2-a3/a3-tamponade-handout-chromium.pdf - | grep -c -E "Observed|Not observed|Not assessable|Discuss|✓|✗|◆"
node -e 'const fs=require("fs"),d="docs/showcase/kit-round-a/q2-a3/";for(const f of fs.readdirSync(d).filter(f=>/^a3-tamponade.*\.json$/.test(f))){const r=JSON.parse(fs.readFileSync(d+f,"utf8"));const k=r.debrief?.keyTimes,m=r.debrief?.moments;console.log(f,"| keyTimes",k?JSON.stringify(k):"MISSING","| moments",Array.isArray(m)?m.length:"MISSING","| errors",r.errors.length)}'
```

  Expected: `2 passed`; `Pages: 1`; `0` verdict words on the handout; for each browser `keyTimes` present (recognition
  ≈ 1 min as recorded, `7 min 51 s` first team action, `3 s`, `1 min 30 s`, `2 s`, pulseless ≈ `3 min 07 s`; a
  difference in a value is a NOTE), `moments 7`, `errors 0`. **Any of: the handout not 1 page, a verdict word on it,
  `keyTimes` or `moments` missing, or not 7 moments → F10 → Task 8.2 row 1 (the FALLBACK_SHA kit).**
- [ ] **Step 4. Read the results against the cue cards.** Run this (Node, no stdin):

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/wt-rc2-q2
node -e '
const fs=require("fs"),d="docs/showcase/kit-round-a/q2/";
for (const f of fs.readdirSync(d).filter(f=>/^q1-[0-4]-.*\.json$/.test(f))) {
  const r=JSON.parse(fs.readFileSync(d+f,"utf8"));
  const m=r.measures||{};
  console.log(f,"| kit",r.kit,"| errors",r.errors.length,"| marks",JSON.stringify((r.debrief?.objectives||[]).map(o=>o.mark)),
    "| rows",r.debrief?.timelineRows??"-", m.about?"| about "+JSON.stringify(m.about.start):"", m.qr?"| phones "+m.qr.countAfter:"",
    m.pdf?"| pdf "+JSON.stringify(m.pdf):"", m.debriefFooter?"| footer "+JSON.stringify(m.debriefFooter):"",
    m.h21?"| h21 hold "+m.h21.holdKeptEverySample+" cockpit "+m.h21.cockpitKeptDriving:"", m.e22?"| e22 "+m.e22.earlySignsAt+" call "+m.e22.callAt+" press "+m.e22.pressAt+" <40 "+m.e22.etco2FirstBelow40:"");
}'
```

  **Expected per segment, both browsers** (Q1's numbers, `SHOWCASE-2-MEASUREMENTS.md` §Q1, with A's marks; `mark`
  values are `observed` / `not-observed` / `not-assessable` / `discuss`):

  | Segment | Expected |
  |---|---|
  | `q1-0-opening-and-qr` | kit = `$SHA8`; errors 0; about text contains **"Version 1.0.0-rc.2 (pre-release). For education only. Not a medical device and not clinically validated"**; phones `3 phones following` |
  | `q1-1-bronchospasm-ventilator-view-h21` | marks `["not-assessable","observed","not-assessable"]` (recognise not ticked · salbutamol ≈ 02:06 · watch); h21 hold `true`, cockpit `true`; errors 0 |
  | `q1-2-tamponade-a3-path-and-3-debrief` | marks `["observed","observed","observed","observed","discuss"]` (the 1:00 tick · CPR 3–4 s · drainage 1 min 30 s · stop CPR 2 s · ◆ the better course); footer contains `Version 1.0.0-rc.2 (pre-release), build <SHA8>`; Chromium pdf `a4: true`, `pages` ≈ 6 (A; R-A measured A3.1 at exactly 6) or B6 Step 3's count (B, 6–7) — a count over that is a NOTE; errors 0 |
  | `q1-4-malignant-hyperthermia-early-call-13-03` | marks `["observed","observed","observed","not-assessable","not-assessable","observed"]` (the Early-signs tick · call ≈ 8–10 s · dantrolene ≈ 21 s · repeat · potassium · ventilation back); e22: Early signs ≈ 06:51–06:52, call ≈ 07:00, press 13:03–13:04, < 40 at ≈ 07:26; errors 0 |

  With B in the tag (T-B, W-B), `r.debrief.keyTimes` and `moments` are also present in the talk's tamponade and MH
  segments (B6 Step 2 reader): MH has a recognition tile with the tick time as recorded (≈ 06:52), not a dash. The
  tamponade's values are checked in Step 3c.

  Then look at the six `q2-*-monitor-*.png` (open them with the Read tool):
  - six lanes, top to bottom: ECG, ECG, CO₂, IBP1 (ART), IBP2 (CVP), pleth (`saadat-like.json` `layout.lanes`);
  - the two ECG lanes both lead II (E70: by design this week);
  - on MH, the capnogram clips flat at the 50 mmHg top while the number reads above 50 (E63, accepted).
- [ ] **Step 5. The print PDFs for the owner (Decision 9).** First the inventory:

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
ls -la "$S/pme-debrief-rc2" 2>&1
```

  - **T-B, W-B, and the folder holds G3's set** (built from `H`): leave every file in it as it is. Copy the Q2 PDF in
    beside it, under a name of its own, as the tag-build check: `cp -n
    $R/scratch/wt-rc2-q2/docs/showcase/kit-round-a/q2/q1-tamponade-debrief-chromium.pdf
    "$S/pme-debrief-rc2/debrief-tamponade-q2-tag-$SHA8-chromium.pdf"`. Compare the page counts (`pdfinfo … | grep
    Pages`, both files): a difference is a NOTE.
  - **T-F, W-F, and the folder holds G3's set** (a build the tag does not contain): `mkdir -p
    "$TD/pme-debrief-rc2-G3" && mv "$S/pme-debrief-rc2/"* "$TD/pme-debrief-rc2-G3/"` (only after the `ls` showed
    files; on an empty folder zsh stops with "no matches found", which is harmless). Then the Q2 set, as below.
  - **The folder is absent or empty (G3 did not run), or after the T-F/W-F move:**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
Q=$R/scratch/wt-rc2-q2/docs/showcase/kit-round-a/q2
mkdir -p "$S/pme-debrief-rc2"
cp -n "$Q/q1-tamponade-debrief-chromium.pdf" "$S/pme-debrief-rc2/debrief-tamponade-rc2-chromium.pdf"
cp -n "$Q"/q1-tamponade-debrief-print-chromium.png "$Q"/q1-tamponade-debrief-print-webkit.png "$S/pme-debrief-rc2/"
ls -la "$S/pme-debrief-rc2"
```

  In the B cases, also `cp -n` the `q2-a3/a3-tamponade-handout-chromium.pdf` if G3 left no handout PDF.
  `HOW-TO-CHECK-THE-PRINT.txt` (Task 3) names whatever ends up in the folder.
- [ ] **Step 6. Re-take the six-card screenshots (the skin's new lane order).**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
cd $R/scratch/wt-rc2-q2
SHOWCASE_KIT="$KIT" SHOWCASE_WORKERS=1 npx playwright test -c scripts/showcase/playwright.showcase.config.ts rehearsal.showcase.ts --reporter=list > $W/q2-six-cards.log 2>&1; tail -4 $W/q2-six-cards.log
git status --short docs/showcase/rehearsal docs/showcase/results | wc -l
```

  Expected: `16 passed` (8 tests × 2 projects), in **≈ 1 h** with one worker, not 20–25 min (prep correction 1: 55.5 min
  on 13ebbb7d). The `git status` count is **≈ 48** (prep correction 2): the modified JPGs and JSONs, plus files not on
  main — new JPGs and JSONs and **16 untracked `results/run-sheet-*.md`**. Keep them all for the docs PR; old files the
  run no longer writes stay as they are. The re-taken `docs/showcase/rehearsal/*-{chromium,webkit}.jpg` and
  `results/*.json` show as modified or new (in place, Decision 8: their history is in git). Open three of them
  (tamponade, MH, anaphylaxis) to confirm the lane order as in Step 4. A soft-check failure here is a **note**, not a
  gate failure: these are smoke checks with wide windows, and Q2 is the gate. List each failure with its observed
  value in the gate note.
- [ ] **Step 7. Gate verdict.** Write `$W/gate-notes.md` §Q2: every Expected line above, with **PASS** / **NOTE** /
  **FAIL**.

  **Gate failures** (any one sends the day to Task 8):
  - F1: kit build fails, `Commit` ≠ `$TAG_SHA`, or the build id has `+`;
  - F2: relay smoke test not 2 of 2;
  - F3: the Start/About label or the Debrief footer does not read `1.0.0-rc.2 (pre-release)` (the footer with the
    build); or `rc.1` shows anywhere on screen;
  - F4: any Debrief mark differs in KIND from the table (✓ ↔ ✗ ↔ – ↔ ◆); or a Debrief does not open, print (Chromium
    PDF) or download its JSON;
  - F5: phones not `3 phones following` at the QR moment; a phone not `synced` at a segment's end; or H21's hold or
    cockpit `false`;
  - F6: a state a card relies on does not come (PEA, ROSC, Early signs, Recovering), or a card button a cue names is
    missing;
  - F7: errors > 0 (page or console);
  - F8: the Chromium tamponade PDF is not A4, or there is no PDF. (A page count over the limit is a NOTE: the rc.1 kit
    printed the same case in 6 pages too; the run sheet is updated in Task 9.)
  - F9: a lane a card relies on is missing or blank on a monitor screenshot (prep correction 5: the IBP2 lane is
    empty by scenario in MH, bronchospasm and anaphylaxis, which connect no CVP line; that is not F9). (A different lane ORDER is a NOTE and a finding against
    the skin: the rc.1 kit has the old order, so rolling back would not help.)
  - F10 (T-B, W-B only): Step 3c's handout, key times or key moments as stated there → Task 8.2 row 1.

  **Findings, not gate failures:** the FX-16 beep (Step 3b and the owner's smoke item 3; the day rule "phones silent,
  the Mac is the alarm source" stands if it fails).

  **Notes** (record them, update the cards in Task 9, never "fix" them):
  - any time within ±10 s of sim (±15 s of wall) of Q1;
  - alarms that come earlier, later, new or gone without changing a card's story;
  - timeline rows ±3 (the MH tick adds one);
  - resync counts;
  - load average;
  - S12-F2 (AGENTS `---` on phones, E20) and FX-12 ("No scenario") as in Q1;
  - `about.preRelease: false` (the regex, Step 2);
  - a six-card soft-check failure (Step 6);
  - a page count over the limit (F8) and a lane-order difference (F9);
  - Step 3b's FX-16 result.

### Task 5 (executor): the Persian handouts from Q2's Debrief JSONs — DONE 2026-10-20 01:30–01:31 (from `q2-rerun/`)

Inputs: the three Chromium Debrief JSONs of the set the Task 4 gate verdict names (`q2/` normally; `q2-rerun/` or
`q2-fallback-<FALLBACK8>/` after Task 8). Set `Q` to that folder below. In the B cases, the Debrief plan's G2 handouts
(from `H`) stay the owner's set (Decision 9); these renders are the tag-build check against them.

- [ ] **Step 1. Render and check.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
cd $R/scratch/wt-rc2-q2
Q=docs/showcase/kit-round-a/q2
node scripts/showcase/debrief-fa.mjs $Q/debrief-q1-1-bronchospasm-ventilator-view-h21-chromium.json \
  $Q/debrief-q1-2-tamponade-a3-path-and-3-debrief-chromium.json \
  $Q/debrief-q1-4-malignant-hyperthermia-early-call-13-03-chromium.json --version 1.0.0-rc.2 --text > $W/fa.log 2>&1; cat $W/fa.log
for f in $Q/debrief-q1-*-chromium.fa.pdf; do python3 /Users/samhv/.claude/plugins/cache/persian-writing/persian-writing/1.4.0/scripts/verify_pdf.py "$f" --expect-font Vazirmatn > "$f.verify.txt"; echo "$(basename $f): exit $? · unexpected fonts $(grep -c 'unexpected font' "$f.verify.txt") · errors $(grep -c '^ERROR' "$f.verify.txt")"; done
grep -c "1.0.0-rc.2" $Q/debrief-q1-*-chromium.fa.txt
grep -c "$SHA8" $Q/debrief-q1-*-chromium.fa.txt
```

  Expected:
  - three lines `… .fa.pdf: N A4 pages; M table entries used (K unreviewed)`, each followed by
    **`0 strings without translation`**;
  - pages ≈ bronchospasm 6, tamponade 6–7, MH 7 (R-A measured `/2` one page longer than rc.1's 5/6/6; ±1 is a note);
  - for each PDF: **`exit 0 · unexpected fonts 0 · errors 0`** (`verify_pdf.py` reports a non-Vazirmatn font as a
    WARN and still exits 0, so the count of `unexpected font` lines is the font check; read the `.verify.txt` files
    for any other WARN and record it);
  - each `.fa.txt` names `1.0.0-rc.2` and the build ≥ 1 time;
  - the MH `.fa.txt` carries the instructor's tick line with the time in Western digits, and the four Persian PEARLS
    prompts once each (E59).

  More than 0 strings without translation, any unexpected font, or any `ERROR` line is a gate failure for the
  handouts only: the English Debrief is the reference. In that case the handouts already in place stay (G2's in the B
  cases; else the rc.1 set, Task 8 table), and the missing strings go to the owner's list.
- [ ] **Step 2. Place them (inventory first, Decision 9; `cp -n` only).**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
ls -la "$S/pme-debrief-fa"
grep -c "1.0.0-rc.1" "$S/pme-debrief-fa/READ-ME-FIRST.txt"
```

  Then, in this order:
  1. **The rc.1 set to the fallback folder.** `mkdir -p "$S/pme-kit-release-3db25a3b/fa-handouts-rc1"`, then
     `mv "$S"/pme-debrief-fa/debrief-fa-*-2026-10-18.pdf "$S/pme-kit-release-3db25a3b/fa-handouts-rc1/"`. If zsh stops
     with "no matches found", the rc.1 PDFs were moved earlier (by G2): find them (`ls "$S/pme-kit-release-3db25a3b"
     /Users/samhv/Desktop/Claude/_to_delete/*/` and G2's report), move them into `fa-handouts-rc1/`, and record where
     they were.
  2. **The rc.1 READ-ME.** Move `"$S/pme-debrief-fa/READ-ME-FIRST.txt"` into `fa-handouts-rc1/` ONLY if the `grep -c`
     above printed ≥ 1 (it still names 1.0.0-rc.1). Otherwise it is G2's: in the B cases leave it in place; in T-F/W-F
     move it to `$TD/pme-debrief-fa-G2-<H8>/`. In both of those cases, find the rc.1 READ-ME (G2's report, or
     `_to_delete/`; the copy in Task 3 Step 4a's inventory shows its date) and move it into `fa-handouts-rc1/` before
     going on.
  3. **G2's handouts** (every `debrief-fa-*.pdf` not dated 2026-10-18):
     - **T-B, W-B:** leave them in place: they are the owner's set. Copy the Q2 renders in beside them under names of
       their own, as the tag-build check: `cp -n "$Q/…-chromium.fa.pdf" "$S/pme-debrief-fa/debrief-fa-<case>-q2-tag-$SHA8.pdf"`
       (three files). Compare the page counts with `pdfinfo`: a difference is a NOTE.
     - **T-F, W-F:** `mkdir -p "$TD/pme-debrief-fa-G2-<H8>" && mv` them there. Then step 4.
  4. **The Q2 renders as the owner's set** (T-F/W-F, or no G2 output):

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
cd $R/scratch/wt-rc2-q2/docs/showcase/kit-round-a/q2
cp -n debrief-q1-1-bronchospasm-ventilator-view-h21-chromium.fa.pdf "$S/pme-debrief-fa/debrief-fa-bronchospasm-$(date +%F).pdf"
cp -n debrief-q1-2-tamponade-a3-path-and-3-debrief-chromium.fa.pdf "$S/pme-debrief-fa/debrief-fa-tamponade-$(date +%F).pdf"
cp -n debrief-q1-4-malignant-hyperthermia-early-call-13-03-chromium.fa.pdf "$S/pme-debrief-fa/debrief-fa-malignant-hyperthermia-$(date +%F).pdf"
ls -la "$S/pme-debrief-fa" "$S/pme-kit-release-3db25a3b/fa-handouts-rc1"
```

  Expected: `pme-debrief-fa/` holds exactly one owner's set of three PDFs (G2's in the B cases, Q2's otherwise) plus,
  in the B cases, the three `-q2-tag-` check copies; `fa-handouts-rc1/` holds the three rc.1 PDFs and the rc.1
  READ-ME. `cp -n` never overwrote anything: if a target name already existed, `ls` shows the older file's date; record
  it and decide by Decision 9 which set is the owner's.

- [ ] **Step 3. `READ-ME-FIRST.txt`** in `$S/pme-debrief-fa/` (in the B cases, if G2 wrote one, keep its text and add
  the tag's sha and the `-q2-tag-` check copies to it; otherwise write it new), Persian first, then English, as the
  rc.1 one. The
  Persian paragraph is written with the `persian-writing` skill (formal register; counts and dates in Persian digits;
  clinical values, versions and times in Western digits). Content, in English:
  - "These three PDFs are the Persian rendering of the Debrief for the three cases of the 30-minute talk, from the rc.2
    release build (v1.0.0-rc.2, pre-release, kit `<SHA8>`)";
  - every footer: not a medical device, not clinically validated, version and build;
  - one line per case, with its run time and key times from the Q2 JSONs: bronchospasm (salbutamol at …), tamponade
    (CPR …, pericardiocentesis …, Pulse back …), MH (the early call ticked at …, crisis …, dantrolene …, ventilation
    back …);
  - the new this week: the verdict words (Observed · Not observed · Not assessable · Discuss) and the talking-points
    box (PEARLS), all marked unreviewed until you read them;
  - pages and "Strings left in English: 0 in each";
  - "the rc.1 handouts are in `pme-kit-release-3db25a3b/fa-handouts-rc1/` (the fallback set)";
  - "Open them in Preview to read or print; do not save them from Preview (Preview rewrites the text layer)".

### Task 6 (executor builds the tree, orch pushes): GitHub Pages from the tag — tree DONE 2026-10-20 01:31–01:33 (`gh-pages-rc2` 36e2efd0, 83 files); Step 3 push: orch

Do this only after Task 4 Step 7 shows no gate failure (Decision 5). Otherwise go to Task 8 first.

- [ ] **Step 1. The orphan tree.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
cd $R/repo && git worktree add --orphan -b gh-pages-rc2 $R/scratch/gh-pages-rc2
cp -R "$KIT/app/." $R/scratch/gh-pages-rc2/
cp $R/scratch/wt-rc2-tag/LICENSE $R/scratch/wt-rc2-tag/NOTICES.md $R/scratch/gh-pages-rc2/ && cp -R $R/scratch/wt-rc2-tag/LICENSES $R/scratch/gh-pages-rc2/
touch $R/scratch/gh-pages-rc2/.nojekyll
```

  Then write `README.md` and `VERSION.txt` with the editor: the texts of `scratch/gh-pages-rc1/README.md` and
  `VERSION.txt`, with `1.0.0-rc.1` → `1.0.0-rc.2`, `v1.0.0-rc.1` → `v1.0.0-rc.2`, `3db25a3b` → `<SHA8>`, the full sha
  and subject from `git log -1 --format='%H %s' $TAG_SHA`, and the date. Keep these lines word for word:
  - "Learners' phones need the classroom relay of the local kit, built from a source checkout with
    `node scripts/showcase/make-bundle.mjs` (Node.js ≥ 22); this static copy on GitHub Pages cannot pair phones."
  - VERSION.txt's "This static copy cannot pair learners' phones: …"
- [ ] **Step 2. Check and commit the tree.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
cd $R/scratch/gh-pages-rc2
node $R/scratch/wt-rc2-tag/scripts/showcase/check-subpath.mjs .
grep -c "cannot pair" README.md VERSION.txt; head -1 VERSION.txt
git add -A -- . ':!**/.DS_Store' && git commit -q -m "GitHub Pages: patient-monitor-engine 1.0.0-rc.2 (pre-release), static app built from $SHA8" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git rev-list --count HEAD; git ls-files | wc -l; (cd "$KIT/app" && find . -type f ! -name .DS_Store | wc -l)
```

  Expected:
  - `root-absolute URLs: 0`;
  - `README.md:1` and `VERSION.txt:1`;
  - `patient-monitor-engine 1.0.0-rc.2 — a PRE-RELEASE (release candidate), not a final 1.0.0`;
  - `1` commit (orphan);
  - the tracked count = the app's file count **+ 5** + the number of files in `LICENSES/` (`.nojekyll`, `LICENSE`,
    `NOTICES.md`, `README.md`, `VERSION.txt` and the `LICENSES/` texts; rc.1 had 82 + 5 + 8 = 95 files; rc.2's app has **70** files, the root `stage*.html` pages gone and the dev pages under
    `dev/`, so the expected count is **83** — prep correction 7).
- [ ] **Step 3 (orch). Force-push `gh-pages` only, and check it live.**

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
cd $R/repo && git push --force-with-lease=gh-pages:5bda2c8b1b0327a054db42f17ff4c8cf912ba0b3 origin gh-pages-rc2:gh-pages
GP=$(git -C $R/scratch/gh-pages-rc2 rev-parse HEAD); echo $GP
gh api repos/$GHR/pages/builds/latest --jq '.status + " " + .commit'
curl -s -m 20 "https://samhv-dev.github.io/patient-monitor-engine/VERSION.txt?$GP" | head -1
curl -s -m 20 "https://samhv-dev.github.io/patient-monitor-engine/README.md?$GP" | grep -c "cannot pair phones"
cd $R/scratch/wt-rc2-tag && node -e 'const {chromium}=require("@playwright/test");(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.goto("https://samhv-dev.github.io/patient-monitor-engine/");await p.waitForTimeout(5000);console.log(await p.locator("[data-about]").first().innerText());await b.close();})()'
```

  Expected:
  - the push shows `+ 5bda2c8b...<GP> gh-pages-rc2 -> gh-pages (forced update)` (the lease refuses the push if
    remote `gh-pages` is no longer rc.1's 5bda2c8b: then stop and look);
  - the builds API reads `built <GP>` (repeat every minute until it does, at most 10 minutes);
  - `patient-monitor-engine 1.0.0-rc.2 — a PRE-RELEASE …` and `1`;
  - the Start label prints "Version 1.0.0-rc.2 (pre-release). For education only. Not a medical device and not
    clinically validated: never use it for patient care."

  Record `$GP` in `$W/gate-notes.md`. Keep the local branch `gh-pages-rc1` (5bda2c8b): it is the Pages rollback
  (`git push --force origin gh-pages-rc1:gh-pages`).

### Task 7 (owner, guided by the orch): the smoke check, Tuesday 20 October evening or Wednesday 21 (≈ 20 min), and E13/E14

One AskUserQuestion step per item, as on 18 October; with one question per item, budget **≈ 20 min** and tell the
owner so (the per-item minutes below are the hands-on time only). The owner sits at his Mac (Safari default, Chrome installed), with
his own phone, and on the Mac's hotspot or the travel router. The orchestrator records one line per item: result, plus
anything odd.

| # | ≈ min | Do | Expected |
|---|---|---|---|
| 1 | 1 | Double-click `_sandbox/pme-classroom-dryrun/kit/Start Classroom.command`; Allow "node" if asked | The black window says **THE CLASSROOM IS RUNNING**; Safari opens `127.0.0.1:8650/?relay#/`; the Start view reads "Version 1.0.0-rc.2 (pre-release). For education only. Not a medical device and not clinically validated …" |
| 2 | 1.5 | Monitor view → top edge → **Phones** → scan the QR with the phone → **Close** | The phone shows the monitor, "Following session …"; the sheet says **1 phone following**. On both screens: six lanes, ECG, ECG (both lead II, E70), CO₂, IBP1, IBP2, pleth |
| 3 | 2 | On the Mac: **Sound on** in the session bar first (a freshly started page is muted until a click), Mac volume up. Instructor → Scenario → Showcase → **Healthy induction** → **Load · All alarms on · ×4**. On the phone: ring/silent switch on **Ring**, volume up, tap **Sound off** (it turns sound on). Listen 30 s, then tap again | **FX-16:** the phone beeps on every beat in step with the Mac, steady, with no stutter, gaps or run-together tone; the beep (≈ 1245 Hz). If an alarm sounds in those 30 s, the beep sounds higher than it; if none sounds, record "no alarm heard" (not a failed comparison). The second tap silences the phone |
| 4 | 3 | After ≈ 1 min: session bar → **Debrief** → **Print or save as PDF**; in the dialog, untick **Headers and footers** (E50; Safari: Show Details → Print headers and footers). Then copy the address into **Chrome**, let the free run go 30 s, Debrief → print preview. With B: also press **Print the learner handout** in one browser | The report alone, A4. Verdict words ✓ Observed / ✗ Not observed / – Not assessable (/ ◆ Discuss). Footer "… Version 1.0.0-rc.2 (pre-release), build <SHA8> …": on every page in Chrome with "Page n of N", and at each block end in Safari (the known limit). Free run ≤ 4 pages. Handout 1 page, no verdict words |
| 5 | 1 | Open `_sandbox/pme-debrief-fa/debrief-fa-tamponade-<date>.pdf` in Preview (read only; do not save) | Right-to-left Persian. The footer on every page names نسخه‌ی 1.0.0-rc.2 (پیش‌انتشار) and the build |
| 6 | 1.5 | Close the black window (Terminate). Double-click `_sandbox/pme-embed-rc2/ventilator-monitor.html` (Safari). Safari → Develop → Show JavaScript Console | **H22 on rc.2:** within 20 s the ventilator breathes, and the monitor shows HR, SpO₂ > 90, EtCO₂ and awRR 14. The console shows no error. (Steps 4–5 of H22, FiO₂ 21 % and Rate 6, only if time is left) |
| 7 | 0.5 | Open https://samhv-dev.github.io/patient-monitor-engine/ in Safari (he hopes to present from Pages, E13) | The Start view reads "Version 1.0.0-rc.2 (pre-release) …"; no Phones pairing is expected from Pages |

If item 1, 2 or 4 fails, that is a gate failure (Task 8). Items 3, 5, 6 and 7 failing are findings: the day rule for
3 is "phones silent, the Mac is the alarm source", as on 18 October (an FX-16 failure is a finding, never a rollback
trigger). Item 4's page count over the limit is a NOTE (F8).

**E13 (before the demo on Wednesday 28 October, on the PRESENTING Mac if it is not this one; ≈ 10 min):**
- Terminal `node -v` prints `v22…` or later; if not, install the LTS from nodejs.org.
- Copy BOTH kit folders onto it (or onto the stick): `_sandbox/pme-kit-release-<SHA8>` and
  `_sandbox/pme-kit-release-3db25a3b`.
- Double-click the rc.2 kit's Start Classroom once, to clear the Gatekeeper and firewall prompts.
- Record the macOS, Safari and Node versions.

**E14 (before the demo, on the network of the day; 30–60 min):**
- The travel router in router mode, with DHCP and client isolation off. The presenting Mac joins it BEFORE Start
  Classroom.
- QR → as many phones as can be borrowed (iPhone and Android).
- Record:
  - the count on the sheet;
  - the time from scan to "Following" for the first and the last phone;
  - one lock/unlock (60 s) → "Following" again in … s;
  - ×4 for 2 min with the phones beeping.
- Expected: every phone follows (the relay allows 60); the sheet's count equals the phones; the Mac's frame rate does
  not visibly drop.
- Any phone that says "this phone cannot reach the instructor's laptop" means isolation is on.

### Task 8 (orch + executor): rollback, if the rehearsal or the smoke check fails on the new kit

**8.1 Classify.** Write the failure (F-number, segment, browser, observed value) in `$W/gate-notes.md` §Q2. Re-run the
one failing segment once, to separate a flake from a defect:
- the talk again in that browser, or `KITROUND_Q1_STOP=bronchospasm` for card 1 only;
- into its own folder, `KITROUND_OUTDIR=docs/showcase/kit-round-a/q2-rerun` (Decision 2; `KITROUND_TAG` renames only
  the per-segment JSON/MD, so a re-run into `q2/` would overwrite the Debrief JSONs, the PDF, the PNGs and
  `q1-talk-*.json`). Task 5 then reads the set the verdict names.

Passing on the re-run turns the failure into a NOTE, with both results recorded.

**8.2 Decide** (orch; the owner is told at once, in one message):

| What failed | The demo kit | Pages | Persian handouts | What is reverted |
|---|---|---|---|---|
| B-only content (key times, key moments, the course strip, the handout), tag = B (T-B, W-B) | **a FALLBACK_SHA kit**: Task 3 Steps 1–4 with `TAG_SHA` replaced by `FALLBACK_SHA` in a new worktree, `KIT=…/pme-showcase-kit-<FALLBACK8>`, its README saying "built from the rc.2 freeze's fallback commit <FALLBACK8> (A + the version bump); the tag v1.0.0-rc.2 is <SHA8> and includes the Debrief part B, which is reverted on main"; then Task 4 again on that kit (≈ 1 h) into `KITROUND_OUTDIR=docs/showcase/kit-round-a/q2-fallback-<FALLBACK8>` | Task 6 from the FALLBACK kit's `app/` | Task 5 from `q2-fallback-<FALLBACK8>/` (in the B cases G2's handouts were built with B: move them to `$TD/pme-debrief-fa-G2-<H8>/` first) | **B, by a PR after the tag (8.3)** |
| Any other gate failure (F1–F7, or smoke items 1, 2, 4), any case | **the rc.1 release kit** `pme-kit-release-3db25a3b` (kept; nothing to rebuild), unless E86 (b) is ruled. Put it back in the owner's folders and restore his notes (commands below) | `git push --force origin gh-pages-rc1:gh-pages` (rc.1) | `fa-handouts-rc1/` back into `pme-debrief-fa/` | nothing on main before the demo (the freeze); the defect becomes a finding for a later release, or the E86 (b) hotfix |
| A Persian failure only (Task 5) | unchanged | unchanged | the rc.1 handouts (`fa-handouts-rc1/`), with a line in READ-ME-FIRST | nothing |

**The rc.1 row's moves, as commands** (the rc.2 versions go to `$TD` first, then the rc.1 ones come back; nothing is
deleted):

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
mkdir -p "$TD/owner-notes-rc2-version" "$TD/pme-debrief-fa-rc2"
mv "$S/pme-classroom-dryrun/kit" "$TD/pme-classroom-dryrun-kit-$SHA8" && cp -Rn "$S/pme-kit-release-3db25a3b/pme-showcase-kit-3db25a3b" "$S/pme-classroom-dryrun/kit"
mv "$S/pme-debrief-dryrun/pme-showcase-kit-$SHA8" "$TD/pme-debrief-dryrun-kit-$SHA8" && cp -Rn "$S/pme-kit-release-3db25a3b/pme-showcase-kit-3db25a3b" "$S/pme-debrief-dryrun/"
mv "$S/pme-classroom-dryrun/PRE-FLIGHT.md" "$S/pme-classroom-dryrun/OWN-PHONE-TEST.md" "$S/pme-debrief-dryrun/HOW-TO-CHECK-THE-PRINT.txt" "$TD/owner-notes-rc2-version/"
cp -p "$S/pme-kit-release-3db25a3b/README.txt" "$TD/owner-notes-rc2-version/README-rc1-with-fallback-line.txt"
cp -p "$TD/owner-notes-before-rc2/PRE-FLIGHT.md" "$TD/owner-notes-before-rc2/OWN-PHONE-TEST.md" "$S/pme-classroom-dryrun/"
cp -p "$TD/owner-notes-before-rc2/HOW-TO-CHECK-THE-PRINT.txt" "$S/pme-debrief-dryrun/"
cp -p "$TD/owner-notes-before-rc2/README.txt" "$S/pme-kit-release-3db25a3b/README.txt"
mv "$S"/pme-debrief-fa/*.pdf "$S/pme-debrief-fa/READ-ME-FIRST.txt" "$TD/pme-debrief-fa-rc2/"
cp -pn "$S"/pme-kit-release-3db25a3b/fa-handouts-rc1/* "$S/pme-debrief-fa/"
diff -rq "$S/pme-kit-release-3db25a3b/pme-showcase-kit-3db25a3b" "$S/pme-classroom-dryrun/kit" && echo same-rc1
```

  Expected: `same-rc1`; the four notes are the pre-rc.2 versions again (they describe the rc.1 kit); `pme-debrief-fa/`
  holds the rc.1 handouts and READ-ME (copies; `fa-handouts-rc1/` keeps its own). The `cp -p … README.txt` is the one
  deliberate overwrite: it restores the owner's own pre-rc.2 text, whose rc.2-day version was saved to `$TD` first.
  Add one line at the top of `$S/pme-kit-release-$SHA8/README.txt`: "NOT FOR SATURDAY: the rehearsal failed (<F-number>);
  present on pme-kit-release-3db25a3b."

What the rc.1 kit lacks, for the presenter to know: the old Debrief look and words, the old lane order and capnogram
scale, the 880 Hz beep (and FX-16's half-beeps on phones at ×4), and FX-13, FX-18 and FX-20. The run sheet's rc.1
lines are in git history (`git show 3db25a3b:docs/showcase/SHOWCASE-2-RUN-SHEET.md`). The orchestrator prints that
version for the presenter if rc.1 is chosen.

**8.3 The B revert PR** (T-F/W-F with B merged, or the first row above). No deadline; it merges before the docs PR.
Run it **after Task 4 Step 7** (or after 8.4), never during a rehearsal: its install and test run would load the Mac
while the kit-round records the load average.

```bash
. /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/rc2-release/env.sh
B_MERGE=<B's merge commit on main>
git -C $R/repo worktree add -b revert-debrief-b $R/scratch/wt-revert-b origin/main
cd $R/scratch/wt-revert-b && git revert -m 1 --no-edit "$B_MERGE"
npx -y pnpm@9.15.9 install --frozen-lockfile > $W/install-revert.log 2>&1
node --experimental-strip-types scripts/model-docs.ts && node --experimental-strip-types scripts/known-misses.ts
git status --short docs/model docs/validation/known-misses.md
git add docs/model docs/validation/known-misses.md && git commit -m "docs(model): regenerate after the B revert"   # only if the status listed files
npx -y pnpm@9.15.9 --filter @pme/validation test -- model-docs
npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run
git diff --stat "$FALLBACK_SHA" HEAD -- apps packages scripts | tail -1
git push -u origin revert-debrief-b
gh pr create -R $GHR --base main --head revert-debrief-b --title "Revert Debrief B (rc.2 was tagged at the fallback commit)" --body-file $W/pr-revert-b.md
```

  Expected:
  - the revert applies cleanly;
  - model-docs: 0 stale pages, 0 orphans;
  - typecheck and demo tests green;
  - the diff against `FALLBACK_SHA` under `apps packages scripts` is empty, or only what merged between them (nothing
    but B is expected).

  The PR body says why (the case and the CI-6 run id), lists the diff stat, and links the gate note. An independent
  read-only review follows (one reviewer, ≈ 20 min: "the revert restores FALLBACK_SHA's tree outside docs"). Then the
  orchestrator merges after its CI and main's CI are green.

**8.4 Re-run** Task 4 (and Tasks 5–6) on whichever kit 8.2 chose, before the owner's smoke check. For the rc.1 kit:
the talk on Chromium only (≈ 15 min), to confirm the kit on this Mac today.

### Task 9 (executor; orch merges): the docs PR after the tag

Branch `docs-rc2-release` in `scratch/wt-rc2-q2` (from `TAG_SHA`). If a B revert merged, rebase onto `origin/main`
first, and re-apply any run-sheet lines the revert took out. Docs and evidence only. The kit-round script's Q2 edits
are test tooling.

**Timing (orchestrator ruling on review fix 12).** Steps 1–3 and 4.1–4.4 are written in the worktree as soon as Task
4–6 results exist (T: Wednesday 09:00; W: Wednesday 17:00), **with no push**. Steps 4.5–4.7, 5 and 6 follow the
owner's smoke check (Task 7), and **the PR opens after it, Wednesday ≈ 20:00**, so it records the smoke results and its
two CI runs stay two. If Task 8 changed the demo kit at Wednesday 19:00, Steps 4.4–4.7 say so before the push. The
review (Step 7) runs Thursday morning; the merge is by Thursday 12:00.

**Re-dated 2026-10-20 (orchestrator ruling).** Steps 1–3 and 4.1–4.4 (with Step 5's `known-deviations.md` rows) were
written on Tuesday 20 from 01:34 (+0330), and the branch was pushed and opened as a **DRAFT** PR titled
`docs(release): v1.0.0-rc.2 tagged — kits, Q2 rehearsal on the tag, Persian handouts, Pages (owner smoke pending)`.
Steps 2.4 and 4.5–4.7 (the smoke results) are added after the owner's check (Tuesday 20 evening or Wednesday 21);
then the PR is marked ready, reviewed and merged.

**Merge order after the tag** (serial; each waits for main green and for its own rollup):
1. the B revert PR (Task 8.3), if any;
2. this docs PR;
3. **PR #85** (the headless-host design note, "merges after the rc.2 tag");
4. other post-tag docs.

- [ ] **Step 1. Commit the plan first:** copy this file to `docs/plans/rc2-release-day.md` →
  `docs(plans): the rc.2 release-day plan`.
- [ ] **Step 2. Evidence and gate notes:**
  1. `docs/showcase/kit-round-a/q2/` (Task 4–5 outputs and `relay-<SHA8>.json`). The re-taken
     `docs/showcase/rehearsal/*.jpg` and `results/*.json`, with one line in `docs/showcase/KIT-GATE.md`: "<date>:
     `rehearsal/` and `results/` re-taken on the rc.2 kit `<SHA8>` (kit round Q2, the new lane order)".
  2. `docs/gates/rc2-release.md` (new), from `$W/gate-notes.md`:
     - the case (T-B/T-F/W-B/W-F) and why;
     - `TAG_SHA` and main's CI run id; the WebKit retry-only list;
     - the tag push time; the release run id, publishedAt, Pre-release, the 8 assets, SHA256SUMS 7/7 OK, and the IIFE
       size;
     - the kit `VERSION.txt` lines and the relay result;
     - the owner's folders (what moved where);
     - the Q2 table (PASS/NOTE/FAIL);
     - the Persian results;
     - the Pages commit and the live checks;
     - the owner's smoke check (item by item);
     - E13/E14 when known;
     - any Task 8 action;
     - deviations from this plan.
  3. `docs/gates/debrief-redesign.md`, from `scratch/debrief-gate-rc2/gate-note.md` (Debrief plan, A9 and G), if B's
     PR did not already land it.
  4. `docs/gates/stage-12-real-phone.md` and `docs/gates/stage-8b.md` §11: one "rc.2 smoke check (<date>)" paragraph
     each:
     - item 2 (one phone) under H17;
     - item 3 (×4 beep, FX-16) as a new row "FX-16 on a real phone";
     - item 6 under H22 "on rc.2";
     - item 4 under the print check.
- [ ] **Step 3. `docs/showcase/SHOWCASE-2-MEASUREMENTS.md` §Q2** (after §Q1, same shape):
  - the kit and the relay;
  - how it ran;
  - one table row per segment, with the Q1 numbers beside the Q2 numbers;
  - H21;
  - S12-F2 and FX-12 unchanged;
  - the MH tick;
  - the Persian handouts (pages, 0 strings in English, Vazirmatn);
  - the six screenshots;
  - Findings (numbered, from the NOTES);
  - Not measured (real Safari, real phones, sound by ear, a real print dialog: the owner's smoke check covers the
    first three in part).
- [ ] **Step 4. Run sheet, cue cards, presenter guide** (only where Q2 or this plan changed a fact; B8's lines, if B
  landed, are kept):
  1. **Cue card 4 (MH)**:
     - the ◆ 6:52 row adds, before the crisis press: "tick **Name malignant hyperthermia** on the Scenario tab as you
       call it (E52)";
     - the "Debrief would say" line becomes: "✓ name MH (Observed by the instructor at ≈ 06:52; **– name MH** if not
       ticked) · ✓ call (≈ 9 s) · ✓ dantrolene (21 s) · – repeat (instructor) · – potassium (never above 5.5) ·
       ventilation back ✓ (pressed 13:03, …)" (R-A note N2: the card lacked the new first objective);
     - the same in `SHOWCASE-2-RUN-SHEET.md` case 3's row at 6:52 and its Debrief line, and in the presenter guide.
  2. **Card 2 / run sheet case 2 at 1:00** (if B8 did not land): "When the cues appear (CVP rising on the IBP2 tile,
     narrow pulse pressure, tachycardia): name it aloud and tick *Name the tamponade* on the Scenario tab (E54)". The
     run sheet's "Name the tamponade within 180 s (no rule): – Not assessable" line becomes "✓ Observed (ticked at
     ≈ 01:01)".
  3. **The lane-order line** (`SHOWCASE-2-RUN-SHEET.md` "Lane order changed in rc.2; screenshots re-taken in the
     Wednesday rehearsal …"): "re-taken on <date> on kit `<SHA8>` (Q2: `kit-round-a/q2/q2-*-monitor-*.png`,
     `rehearsal/*.jpg`); two identical lead-II traces are by design this week (E70; a lead chooser is for a later
     release)".
  4. **The `KIT` source key** → `_sandbox/pme-kit-release-<SHA8>/README.txt` (the rc.2 release kit), and the fallback
     → `pme-kit-release-3db25a3b`. Every "3db25a3b release build" line that now means the demo kit is changed.
  5. **FX-16:** in the sound lines, "the heartbeat beep is ≈ 1245 Hz, higher than the alarm tones; phones beep with
     the Mac at ×4 (fixed in rc.2; the owner heard it on <date>)", or the owner's finding if item 3 failed.
  6. **The smoke-check boxes** in the run sheet's checklist: ticked with the date, or left open with the finding.
     E13/E14 rows filled when known.
  7. **Any Q2 NOTE that changes a cue's time or a count** (rows, pages, alarms).

  Then search for stale words:

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/wt-rc2-q2
git grep -n -E "✓ Met|✗ Not met|one ✗|only ✗|✓ ✓ ✓ ✗|22 October|1\.0\.0-rc\.1 \(pre-release\)" -- 'docs/showcase/SHOWCASE-2-*.md'
git grep -n -i "v1\.1" -- docs/showcase docs/gates/rc2-release.md
```

  Expected: no line, except where the text quotes rc.1 as history (say so in the PR body).
- [ ] **Step 5. Small items:**
  - `docs/RESUME.md`: the rc.2 state (`RELEASE.md` "After the workflow" 4);
  - `docs/guides/known-deviations.md`: any new WebKit retry-only line from Task 1 Step 2;
  - in the W branches, if E85 (a): `CHANGELOG.md` `## [1.0.0-rc.2] - 2026-10-21` and `CITATION.cff`
    `date-released: "2026-10-21"` together, with `release-versions` 3/3.
- [ ] **Step 6. Checks and PR.**

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/wt-rc2-q2
npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/docs-honesty.test.ts test/release-versions.test.ts
node --experimental-strip-types scripts/model-docs.ts && node --experimental-strip-types scripts/known-misses.ts && git status --short docs/model docs/validation/known-misses.md
npx -y pnpm@9.15.9 --filter @pme/validation test -- model-docs
git diff --stat origin/main...HEAD -- apps packages | tail -1
git push -u origin docs-rc2-release
gh pr create -R samhv-dev/patient-monitor-engine --base main --head docs-rc2-release --title "docs: the rc.2 release day — gate note, kit round Q2, run-sheet updates, the owner's smoke check" --body-file ../rc2-release/pr-docs.md
```

  Expected:
  - `docs-honesty` 7/7, `release-versions` 3/3;
  - model-docs prints no changed page (no source changed), and the test passes;
  - **no line** under `apps packages` (docs and `scripts/showcase` only);
  - the PR is open, and CI starts (≈ 45 min).

  The body lists:
  - the case;
  - the files by group;
  - the Q2 PASS/NOTE table;
  - the smoke results;
  - "no product file changed (`git diff --stat` under apps/ and packages/ is empty)".
- [ ] **Step 7. Review and merge.** An independent read-only review (≈ 30 min, brief written by the orch) checks
  three things:
  - every number in §Q2 and in the gate note against the `q2/` files;
  - the run-sheet lines against Q2;
  - no claim beyond the evidence.

  The orchestrator merges when the PR's own rollup is green and main is green (after the B revert PR, if any), then
  watches main's run; PR #85 follows. Target: by Thursday 22 October 12:00, so the presenter reads the final run sheet well
  before the demo (Wednesday 28 October; the rc.3 freeze is Saturday 24 October 18:00).

  Leftovers to remove afterwards:
  - `git worktree remove` for `wt-rc2-tag`, `wt-rc2-q2`, `wt-revert-b` and `wt-plan-rc2day` (regenerable checkouts;
    branches stay);
  - `gh-pages-rc1` and `gh-pages-rc2` stay as local branches (Pages history and rollback).

---

## For the owner (one paragraph)

On release day, rc.2 is tagged as a **pre-release** on the last green build:
- Tuesday 18:00; or Wednesday 12:00 if the Debrief's second part is close (your E57 rule).
- Its GitHub release page says education only, not a medical device, not clinically validated, and what is not done.

Then, from that exact commit:
- the classroom kit is rebuilt, and its relay is smoke-tested;
- the kit is placed in your sandbox folders, with a note that bookmarks from rc.1 will not restore;
- the whole 30-minute talk is rehearsed automatically in Chrome and Safari's engine, with three emulated phones:
  - the tamponade ticked when its cues appear;
  - malignant hyperthermia ticked at Early signs;
  - every Debrief verdict checked against the cue cards;
  - the monitor screenshots re-taken for the new lane order;
- the three Persian handouts are regenerated from that rehearsal;
- GitHub Pages is republished. It still cannot pair phones; phones need the kit.

The old rc.1 kit stays beside the new one as the fallback: take both on the stick. On Tuesday 20 October in the evening (or Wednesday 21),
I will guide you through a check of about 20 minutes (one question per step):
- start the kit;
- one phone by QR;
- turn the Mac's sound on, then listen to the new beep on your phone at ×4 (ring switch on);
- print a Debrief in Safari and Chrome;
- open one Persian PDF;
- double-click the ventilator page;
- open the GitHub Pages site once in Safari.

Before the demo on Wednesday 28 October, please also check `node -v` on the Mac you will present from, and test the travel router with as many
phones as you can borrow. If anything fails, you present on the rc.1 kit (or on rc.2 without the Debrief's second
part), and I tell you at once.

---

## Questions (E83 onward; each with the default used without an answer)

| ID | Question | Default |
|---|---|---|
| **E83** | (Applied as defaulted in 7e79be36; the owner may still change the wording before the tag.) The rc.2 release notes are only the rc.2 section of the CHANGELOG, which named fixes and one limitation. Should they start with the rc.1-style pre-release paragraph (education only, not a medical device, not clinically validated, not the final 1.0.0, rc.1's limits still apply)? Should they add four limitation lines (kit not a release asset; tick gate and soak not run; the temporary WebKit retry relaxation; your hand checks ran on rc.1, with a shorter smoke check for rc.2)? Wording in Task 0 | **YES, as drafted** (Task 0, done in 7e79be36) |
| **E84** | The roadmap promises "Classroom kit as a release asset — rc.2". rc.2 does not ship it. (a) Reword it to "a later release candidate" before the tag; or (b) upload a kit zip by hand to the rc.2 release page after the workflow (macOS launchers; built on this Mac, not by CI) | **(a)** |
| **E85** | In the Wednesday branch, the tag is dated 21 October, but the tagged CHANGELOG and CITATION say 2026-10-20 (Task V wrote them on Monday; nothing may merge before the tag). (a) Accept, and correct both to 2026-10-21 on main in the post-tag docs PR; or (b) leave 2026-10-20 (the planned freeze date) | **(a)** |
| **E86** | If the rehearsal or your smoke check fails on the rc.2 kit for a reason outside the Debrief's part B: (a) present on the rc.1 release kit (old Debrief, old lane order, old beep); or (b) allow one hotfix PR on Thursday and a v1.0.0-rc.3 tag, with the kits, rehearsal, handouts and Pages again (≈ 5 h and 4 CI runs; the freeze moves to Thursday 18:00) | **(a)** |

Still open from before: **E13** (the presenting Mac and its Node), **E14** (the router test): both in Task 7.

---

## Self-review

- **The brief's ten items:**
  1. Task 1 (four cases; ancestry, main-green, CHANGELOG/CITATION and release-versions checks).
  2. Task 2 (annotated tag in the owner's plain wording; the workflow run; 8 assets; SHA256SUMS 7/7; the
     Pre-release flag and "never Latest").
  3. Task 3 (make-bundle from a clean tag worktree; relay 2/2; the READ ME block with version, build and "bookmarks
     from rc.1 will not restore"; placement with `$TD` moves; the rc.1 folder kept; the H22 embed folder).
  4. Task 4 (Q1 script on both browsers, one output folder per run; the MH tick at Early signs; the tamponade tick
     at the cues; the marks table; page counts as notes; the screenshots; FX-16 on macOS WebKit; F1–F10 failures vs
     notes; it replaces the Debrief plan's Wednesday rehearsal).
  5. Task 5 (`debrief-fa.mjs --version 1.0.0-rc.2`; 0 strings without translation; Vazirmatn by `verify_pdf.py`;
     placement and READ-ME-FIRST).
  6. Task 6 (orphan worktree, force-push by the orch only, live VERSION.txt with a cache-busting query, the
     phones-need-the-kit line, the Start label read live).
  7. Task 7 (the seven smoke items with Expected lines, ≈ 20 min; E13; E14).
  8. Task 8 (classify, decide, the B revert PR, the rc.1 kit kept and its limits named).
  9. Task 9 (gate notes, Q2 evidence, MEASUREMENTS §Q2, the run-sheet lines including "– name MH", the hand-check
     results).
  10. The Effort table.
- **Found while planning, outside the brief (now Task 0 and E83–E85):**
  - the rc.2 notes lacked the education-only and not-validated words;
  - the roadmap's rc.2 kit promise;
  - B's CHANGELOG lines must go under `[1.0.0-rc.2]`;
  - the Wednesday date mismatch;
  - the kit-round script's `rc.1` label regex (read around, not edited);
  - its 22-October Run by (edited).
- **What is not proved here:**
  - Playwright's WebKit is not Safari, emulated phones are not phones, and nothing here hears a sound. Task 7 is the
    only check of these, and it is ≈ 20 minutes, not the 18 October set: H18, H19, H20 and H21 are not repeated by hand
    (H21 is covered by Q2; H19 stays failed, with its day rule).
  - The rehearsal.showcase run's 16-passed Expected rests on the six-card checks holding on the new skin. Their
    failure is a note, not a gate.
  - The Persian page counts are R-A's `/2` measurements, not this plan's.
- **The review's 15 fixes are applied** (`scratch/plans-backup/rc2-release-day-plan-review.md`, FIX FIRST), with the
  orchestrator's rulings where it left a choice:
  - 1: E75–E78 → E83–E86 everywhere;
  - 2: Task 0 rewritten as DONE (7e79be36) with a re-check; the base f4f479d9 / 7e79be36; FALLBACK_SHA's time from the
    gate note;
  - 3: `--first-parent` in Task 1 Step 2;
  - 4: the FX-16 e2e checked in the tag's Chromium CI job (Task 1 Step 2) and run on macOS WebKit (Task 4 Step 3b), a
    NOTE;
  - 5: RELEASE.md item 2 in Task 1 Step 3;
  - 6: the THIS KIT block's version/build wording;
  - 7: the owner's four notes copied to `$TD/owner-notes-before-rc2/` (Task 3 Step 4a) and restored by the rc.1 rollback
    row, given as commands (Decision 10);
  - 8: the inventory before any `mv`/`cp`, `cp -n` for placement, and G2/G3's outputs kept as the owner's set in the B
    cases, moved to `$TD` in T-F/W-F (Decision 9; Task 3 Step 4a, Task 4 Step 5, Task 5 Step 2);
  - 9: the font check counts `unexpected font` lines and `ERROR` lines;
  - 10: one output folder per run (Decision 2; Task 4, Task 8);
  - 11: F8 and F9 are NOTES; FX-16 is a finding, out of the rollback row; F10 = the A3 test on the tag kit in the B
    cases → the FALLBACK_SHA kit; Task 4 replaces the Debrief plan's Wednesday rehearsal;
  - 12: the docs PR opens after the smoke check (≈ 20:00 Wednesday); the merge order B revert → docs PR → #85 → other
    post-tag docs; 8.3 runs after Task 4;
  - 13: Pages count "+ 5";
  - 14: the Mac's Sound on in smoke item 3, "no alarm heard" recorded as such; the smoke budget ≈ 20 min; Pages
    opened once (item 7);
  - 15: the Run-by anchor is the Q1 talk's line (≈ :1491); the diff +7/−2.
  Also from the review's answers: the release run list repeated until it appears; `--force-with-lease` on the Pages
  push.
- **Commands not run while planning:** the tag, the push, the workflow, the downloads, the kit build, the rehearsal,
  Pages. Flags were checked against the installed tools: `gh` 2.102.0 has `run list --commit`, `run watch
  --exit-status`, `run rerun --failed` and `release download -D`; `git` 2.54 has `worktree add --orphan`.
