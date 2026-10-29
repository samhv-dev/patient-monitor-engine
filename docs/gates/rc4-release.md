# Gate note: the v1.0.0-rc.4 release day (2026-10-28/29)

*From the workspace gate note `scratch/rc4-release/gate-notes.md`, the orchestrator's rulings log
(`research/00-orchestrator-rulings.md`, from 2026-10-28) and the GitHub runs. Plan:
[`docs/plans/rc4-release-day.md`](../plans/rc4-release-day.md) (its "RUN 2026-10-28/29" block lists the deviations).
Times are UTC unless marked +0330. The owner's smoke check, his live rehearsal, the Windows checklist (W), E13 and
E14 follow from Sunday 1 November: their sections are headed below and left empty until then. Nothing in this note
changed a product file. The version is a **pre-release**: for education only, not a medical device and not clinically
validated.*

## Freeze, bump, dry run (Task 0)

- **Freeze** (owner's ruling, 29 October, early morning +0330: freeze at once; rc.4 tagged as the fallback build; an
  rc.5 from main with Instructor v2 only if green and liked in the Sunday smoke). `FREEZE_SHA` **8e4e8471** = the merge
  of **#163** (`owner-words-rc4`, the owner's card rulings), 2026-10-28 18:32 (22:02 +0330); main's push run
  **40746088523** success.
- **After the freeze**, as ruled: **#165** (docs: the instructor-panel design; 2026-10-28 23:18), **#167** (the MH card's
  story text and its CHANGELOG line; 2026-10-29 07:12), **#166** (the version bump, `release-rc4`; 08:17), **#172**
  (the MH-only talk: run sheet, cue cards, presenter guide and the kit-round talk test; 10:52). Under `apps packages
  scripts .github` between the freeze and the tag: 26 files, +244/−237 (version strings, the kit-round script, the MH
  card's story text, the e2e version strings).
- **The kit-round tooling** came through #128 (24 October) and #172; no separate `test-kitround-rc4` PR.
- **The prep run (Task 0 Step 5) was not run.** The expected values of Task 4 were #172's talk run on kit a88f95a7
  (29 October) and the 28 October A4 run on the owner's card rulings (kit 2c341aa3, `scratch/kitround-owr4/`).
- **Release dry run** `release.yml` (`dry_run=true`) on main 0c4b396f: run **40865772794**, 11:29–11:33, success. 9
  files (the 8 assets, `-v1.0.0-rc.4` in the two zip names, + `NOTES.md`), 7 × `: OK`, the notes open "Fourth public
  **pre-release** …", the IIFE banner `/*! patient-monitor-engine 1.0.0-rc.4`, no rc.4 release yet.

## The tag commit (Task 1)

- `TAG_SHA` **0c4b396f8488d36145c06762bf35ad14385c1cef** = main after #172 (the orchestrator tagged after #172 so that
  the MH-only talk test and run sheet are in the tag; Task 4 expects them). `has-freeze`.
- Main's push run **40860980902** (10:52–11:27): success; `build`, `e2e (chromium)`, `e2e (webkit)`,
  `e2e-quarantine (webkit)` and the slow groups all success. **Retry-only passes:** Chromium `time-control.e2e.ts:30`
  (tagged `@known-flaky`, so the enforced Chromium job stays green); WebKit gating job `saadat-grid-layout.e2e.ts:55`
  (untagged; WebKit warns until the demo of 3 November); WebKit quarantine `debrief.e2e.ts:48`,
  `return-here-restore.e2e.ts:15`, `vent-view-new-patient.e2e.ts:16` (all three recorded before). Rows in
  `docs/guides/known-deviations.md`.
- **Release files on the commit:** `## [Unreleased]` empty, `## [1.0.0-rc.4] - 2026-10-30`; `CITATION.cff`
  `1.0.0-rc.4` / `"2026-10-30"`; the notes (`scratch/rc4-release/NOTES-preview.md`) open with the pre-release paragraph
  and carry both required phrases (`not clinically validated`, `untested on Windows at this release`: 2 lines), no
  named future version; README names 1.0.0-rc.4. **The dates say 30 October; the tag is 29 October** (below,
  "Deviations": corrected on main in this PR).
- **RELEASE.md item 2** (physiology since rc.3: E117, E131, E133): the sentence is in
  `docs/guides/validation-summary.md` ("This report is older than the 1.0.0-rc.4 pre-release tree: it predates the
  physiology changes merged since 1.0.0-rc.1, among them E117 …"). No regenerated report.
- Clean tag worktree `wt-rc4-tag`: install OK, `release-versions` + `docs-honesty` 11 passed, renderer `1.0.0-rc.4`.

## The tag and the release (Task 2)

- Annotated tag **`v1.0.0-rc.4`** (tag object af054d04 → 0c4b396f), pushed **2026-10-29 11:36:12 (15:06 +0330)**.
- Release run **40866665261** (push, `v1.0.0-rc.4`): success, 11:36–11:41. The release "patient-monitor-engine
  v1.0.0-rc.4": **Pre-release**, not draft, published **2026-10-29T11:41:18Z**, 8 assets.
- **Assets** (Task 2 Step 4, run by the executor: `$W/assets` was absent): `SHA256SUMS.txt` 7 lines, **7 × OK**; IIFE
  banner `/*! patient-monitor-engine 1.0.0-rc.4`, **755,807 B** (rc.3 741,613 B); embed zip 4 of 4 named entries;
  api-reference 3. **PASS.**

## The kit (Task 3)

- **Kit** `pme-showcase-kit-0c4b396f` from the clean tag worktree: HEAD = `TAG_SHA`, 0 dirty; "Kit ready";
  `Commit: 0c4b396f…`, `Branch: HEAD`; one `Windows:` line; the app's build id **`"0c4b396f 2026-10-29"`** (no `+`);
  `1.0.0-rc.4` in 4 of the app's scripts, an older rc in none; both `.cmd` and `.command` launchers, `app/`, `server/`,
  `runtime/` empty (as rc.3). **76 app files, 3.2 MB** (rc.3 71, 2.3 MB): the new `engine-bench.worker` (621 KB) and
  the IBM Plex fonts (E125). NOTE, ruled. **PASS.**
- **Relay** (`check-relay.mjs`): both `.cmd` files "CRLF, ASCII, runs server\launch.mjs"; **PASS, 4 of 4 runs, node
  v26.12.1** (`docs/showcase/kit-round-a/q2-rc4/relay-0c4b396f.json`). **PASS.**
- **READ ME FIRST.txt**: the "THIS KIT" block appended after the build.
- **The disclaimer on screen** is now E125's "For educational use only; Not to be used in patient care." (Settings, page
  footers, the Debrief footer); the kit's README and the print how-to quote the screen as it is. NOTE.
- **Windows zip** `pme-showcase-kit-0c4b396f.zip`: 2 `.cmd` entries, both byte-identical to the kit's;
  **1,545,928 B** (rc.3 1,004,390 B: the app growth above, NOTE); sha256
  `9a10df11159d772329f0824e187dd47867e0ca55ecac82689100dc0798aff22a`. Not a release asset.
- **The fallback** `pme-kit-release-fcf99b70`: `VERSION.txt` `Commit: fcf99b706e2c…`, its zip beside it. **PASS.**
- **H22 embed** `_sandbox/pme-embed-rc4/` from the release's `ventilator-monitor-embed-v1.0.0-rc.4.zip`: the eight
  entries of `pme-embed-rc3`, the rc.4 banner, the IIFE identical to the release asset. **PASS.**

**The owner's folders** (inventory first, `scratch/rc4-release/inventory-before.txt`; his five notes copied to
`_to_delete/rc4-release-day-2026-10-29/owner-notes-before-rc4/` first; `cp -n` for every placement; nothing deleted):

| Where (`_sandbox/`) | What |
|---|---|
| `pme-kit-release-0c4b396f/` | the rc.4 kit + `README.txt` (new) + the Windows zip |
| `pme-classroom-dryrun/kit` | the rc.4 kit (the rc.3 one moved out); `PRE-FLIGHT.md`, `OWN-PHONE-TEST.md`: the kit sentence → rc.4 |
| `pme-debrief-dryrun/pme-showcase-kit-0c4b396f` | the rc.4 kit; `HOW-TO-CHECK-THE-PRINT.txt` rewritten for it |
| `pme-debrief-rc4/` (new) | the A4 Chromium PDFs: the MH and haemorrhage Debriefs and learner handouts |
| `pme-debrief-fa/` | the two rc.4 Persian PDFs (2026-10-29) + `READ-ME-FIRST.txt` (the orchestrator's Persian paragraph above the English part) |
| `pme-embed-rc4/` (new) | the release's embed |
| `pme-kit-release-fcf99b70/` | **the rc.3 fallback**, untouched but for its README's first line ("FALLBACK for Tuesday 3 November: the rc.4 kit is pme-kit-release-0c4b396f …") and `fa-handouts-rc3/` (the rc.3 Persian set, moved in) |

Moved to `_to_delete/rc4-release-day-2026-10-29/`: `owner-notes-before-rc4/`, `pme-classroom-dryrun-kit-fcf99b70/`,
`pme-showcase-kit-fcf99b70/` (from `pme-debrief-dryrun`), **`pme-kit-release-b39b3d87/` (rc.2 retired)**,
`pme-debrief-rc2/`, `pme-embed-rc2/`.

## Kit round Q2 on rc.4 (Task 4)

Worktree `scratch/wt-rc4-docs` (branch `docs-rc4-release` at the tag); install OK; `Preoxygenate…` ×2; Run-by
"Live demo, 3 November" (A4). One run at a time on the Mac. Write-up: `docs/showcase/SHOWCASE-2-MEASUREMENTS.md`
§"Q2 on rc.4".

| Step | Result | Verdict |
|---|---|---|
| 3 Talk, Chromium | **1 passed (5.1 min)** (`q2-rc4/`) | PASS |
| 3 Talk, WebKit | **1 passed (5.0 min)**; 16 entries with the relay JSON; 19 stop shots per engine | PASS |
| 3 opening | kit 0c4b396f; Home "Version 1.0.0-rc.4 · pre-release · build 0c4b396f"; `3 phones following`; errors 0 (both) | PASS |
| 3 MH marks | ✓ ✓ ✓ ✓ – ✓ (both) | PASS |
| 3 MH rows (≈ 59–62) | 63 (C) / 60 (W) | NOTE (rows ±3) |
| 3 MH times | early 08:12 / 08:11, call 08:14 / 08:13, normo 13:53 / 13:53, dose 2 19:13 / 19:13 | PASS (≤ 3 s from #172's) |
| 3 stops | 08:12 13:52 19:12 (C) / 08:11 13:51 19:11 (W); `simMovedS` 0, `pausedAtEnd` true, 3 phones synced "(paused)" at each | PASS |
| 3 model tab | 4 GitHub pages, HTTP 200, the instructor page paused (both) | PASS |
| 3 MH activity at the stops | 0.280 / 0.510 / 0.550 (C), 0.280 / 0.520 / 0.550 (W) (#172 0.27 / 0.51 / 0.55) | PASS |
| 3b macOS WebKit e2e (tag worktree) | FX-16 **3 passed** (99 / 100 / 99 %); fx24, fx25, fx14, saadat-instructor-tiles **6 passed**, 0 skipped; worktree clean | PASS |
| 3c A4, both engines | **4 passed (13.8 min)** (`q2-rc4-a4/`); kit 0c4b396f, errors 0 | PASS |
| 3c A4 marks | MH ✓ ✓ ✓ **✓** – ✓; haemorrhage – ✗ **✓** (both engines) | NOTE, ruled (below) |
| 3c A4 MH times | early 08:13 / 08:12, call 08:14 / 08:13, < 40 08:38 / 08:37, normo 13:52 / 13:50, SpO₂ min 99 | NOTE, ruled: 25–36 s earlier than 24 October; equal to the 28 October run on 2c341aa3 |
| 3c A4 haemorrhage | junctional 09:15 / 09:17, PEA 10:26 / 10:28, loss 10:59 / 11:00, asystole 15:35 / 15:35, CPR 15:38 / 15:38, shock 1 → asystole, shock 2 → organised (`pea`), ROSC 20:56 / 20:57 | PASS (≤ 4 s of 24 October; shock outcomes as before) |
| 3c Debrief PDFs (Chromium) | MH **8** A4 pages (7 on 24 October, 8 on 28 October), haemorrhage 8; footer "Version 1.0.0-rc.4 (pre-release), build 0c4b396f 2026-10-29" on 8 of 8 pages each; `PEEP undefined` 0 | PASS (MH pages a NOTE) |
| 3c learner handouts | 1 A4 page each, 0 verdict words, Inter embedded; MH the four take-home lines, haemorrhage three | PASS (F10 no) |
| 4 screenshots | early-signs shots, both engines: no overlapping tile text, capnogram breath by breath, IBP2 empty, EtCo2 / FiCo2 / AWRR apart, SQI% / EMG% apart, EtAA clear, rc.4 only | PASS |
| 5 print PDFs | `_sandbox/pme-debrief-rc4/`, four files | done |

**Gate (Task 4 Step 6):** F1 no · F2 no (4/4) · F3 no · F4 no (ruled) · F5 no · F6 no · F7 no (0 errors) · F8 no (A4) ·
F9 no · F10 no. **No gate failure.**

**The orchestrator's rulings on the notes:** the A4 marks that changed kind (MH objective 4 not-assessable → observed;
haemorrhage objective 3 not-observed → observed) follow the owner's rewritten objectives (#163, 28 October), and the
28 October run on that commit (kit 2c341aa3) has the same mark kinds and MH times to the second: **not F4**. The
earlier MH times: accepted (the same card change). MH rows 63, the app's growth, the zip's size and the disclaimer's
wording: notes only.

**Surprises** (findings, not fixed here; all already in #172's runs): on Explore, Glucose read "102 mmol/L" (the
Debrief's facts 6.6 mmol/L), "Stress response 88.0" on a 0–1 scale, VO₂ 270 (gas page) against 428 mL/min (blood page)
at the same stop, rocuronium "Total 48000 mg, µg" (all four display defects, fixed on main after the tag by #178, for a
later release). At the early-signs stop the monitor shows a red **NIBP SYS TOO LOW** from a cuff reading taken earlier
(87/48 on Chromium, 85/60 on WebKit) while the arterial line reads 107/67: a presenter's note in the run sheet. The
model pages load GitHub `main`, not the tag.

## Persian handouts (Task 5)

- **On the tag's table** (render and check only): MH 8 A4 pages, haemorrhage 8; **11 and 15 strings without
  translation**; unexpected fonts 3 / 2 (Helvetica-Oblique, LucidaGrande: the italic English fallback of the
  untranslated strings). Fails the handouts only.
- **By ruling, with PR #161's table** (26 unreviewed drafts, `origin/docs-fa-handout-strings` fd52a9c1, placed in the
  worktree **uncommitted**; it is not in this branch): MH **8** A4 pages (126 entries used, 124 unreviewed),
  haemorrhage **8** (137, 137); **0 strings without translation** each; `verify_pdf.py --expect-font Vazirmatn` exit 0,
  0 unexpected fonts, 0 errors (haemorrhage: WARN, 3 en/em dashes); `1.0.0-rc.4` and the build on each; `pdffonts`
  Vazirmatn Regular and Bold only. The renders and their `.verify.txt` are in `q2-rc4-a4/`.
- **Placed:** `_sandbox/pme-debrief-fa/debrief-fa-{malignant-hyperthermia,haemorrhage}-2026-10-29.pdf`; only the MH one
  is printed for the day. The rc.3 set moved to `pme-kit-release-fcf99b70/fa-handouts-rc3/`. `READ-ME-FIRST.txt`: the
  orchestrator's Persian paragraph (through the `persian-writing` skill) above the English part, which says the 26
  drafts are from PR #161, unreviewed.
- The Persian handout's footer carries the older disclaimer in Persian ("for education only … not a medical device …
  not clinically validated"); the screen's E125 line has no Persian entry on the tag. PR #161 (head 26874b8c) drafts it;
  a re-render follows the owner's read.

## GitHub Pages (Task 6)

- Orphan tree `gh-pages-rc4` **e1fbdc6724b50f9d4b2f8b7e6cfd9e6fda680c4e** (1 commit): root-absolute URLs 0; "cannot
  pair" 1 + 1; `VERSION.txt` line 1 the rc.4 PRE-RELEASE line; **91 tracked files** = app 76 + 5 + `LICENSES/` 10 (rc.3
  85; new `LICENSES/IBM-Plex-OFL-1.1.txt`).
- Serve check (`scratch/rc4-release/pages-serve-check.log`; the rc.2 script run from `wt-rc4-tag`, since `wt-rc2-prep`
  no longer exists): about "Version 1.0.0-rc.4 · pre-release · build 0c4b396f", the `VERSION.txt` line, README
  cannot-pair 1, 404s none, errors 0.
- **(orch)** pushed to `gh-pages` with the lease (0777a977 → e1fbdc67) 12:20:40; Pages built e1fbdc67 at 12:21; live
  `VERSION.txt` the rc.4 PRE-RELEASE line, README "cannot pair" 1, Home "Version 1.0.0-rc.4 · pre-release · build
  0c4b396f". `gh-pages-rc3` (ceac7b47) stays as the rollback.

**Tasks 0–6 complete ≈ 12:25 on 29 October.**

## The owner's smoke check (Task 7), item by item — after the owner's smoke

## The live rehearsal — after the owner's smoke

## The room dry run: W (Windows), E13, E14 — after the owner's smoke

## Deviations from the plan

1. **The day moved** from Saturday 31 October (freeze) and Sunday 1 November (tag) to 28/29 October, by the owner's
   ruling of 29 October; rc.4 is the fallback build, an rc.5 candidate is rehearsed separately.
2. **The prep run (Task 0 Step 5) was not run**; Task 4's expected values were #172's talk run and the 28 October A4
   run.
3. **`TAG_SHA` is main after #172**, two merges after the bump (#166, then #172), not main right after the bump.
4. **CHANGELOG and `CITATION.cff` on the tag say 2026-10-30; the tag is 2026-10-29.** By the orchestrator's ruling
   main's copies are corrected to 2026-10-29 in this PR, both together (`release-versions` 4/4); the tag's text is not
   rewritten (`docs/guides/known-deviations.md`, "The rc.4 tag's release date").
5. **The Persian handouts** were rendered with PR #161's unreviewed table, uncommitted; the tag's table left 11 / 15
   strings in English.
6. **The Pages serve check** ran from `wt-rc4-tag` (`wt-rc2-prep` gone; R4-Q8).
7. **#117's rc.3 evidence** (Task 9 Step 2) is not folded into this branch yet.
