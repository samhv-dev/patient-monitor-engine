# Gate note: the v1.0.0-rc.3 release day (2026-10-23)

*From the workspace gate note `scratch/rc3-release/gate-notes.md` and the executor's run. Plan:
[`docs/plans/rc3-release-day.md`](../plans/rc3-release-day.md). The owner's smoke check, his live rehearsal, the Windows
checklist (W), E13 and E14 follow on Saturday 24 October and later: their sections are marked PENDING until then.
Nothing in this note changed a product file.*

## Freeze, bump, tag (Tasks 0–2, the orchestrator)

- **Freeze** `FREEZE_SHA` **695ca78cb12d** = the merge of the version-bump PR **#113** (`release-rc3`, 2026-10-22). After
  the freeze, owner-approved (option 1, 2026-10-23 00:05): **#114** F28 (phone portrait), **#115** Saadat fidelity
  pass 2, **#116** the rc.3 notes (38 files, +1269/−299 under `apps packages scripts .github`).
- **#97** (the rc.2 docs PR) is still an open draft. The kit-round script's close fix reached the tag through the bump
  PR (88fe8b75: "the close's Return-here click bounded"), so no cherry-pick was needed (Decision 4).
- **Tag commit** `TAG_SHA` **fcf99b706e2cd16e21d441e1b40b88f679a619f1** (#116's merge); main's push run **39868678618**
  success; the build job's "tick benchmark (alone)" success (#101). Retry-only passes: Chromium none (enforced);
  WebKit `return-here-restore.e2e.ts:15` (already in `docs/guides/known-deviations.md`).
- **Release files on the tag:** `## [Unreleased]` empty, `## [1.0.0-rc.3] - 2026-10-23`; `CITATION.cff` 1.0.0-rc.3 /
  2026-10-23; the notes' wording checks 2 / 0 (`v1.1`); README names 1.0.0-rc.3 twice and F27's sentence is gone;
  known-deviations rows 6. Tag worktree: install OK, `release-versions` + `docs-honesty` 11/11, renderer 1.0.0-rc.3,
  clean.
- **RELEASE.md item 2** (physiology since rc.2): `packages/engine-core/src` changed only in `nibp.ts` (the device events
  of #100), `types-hemo.ts` and `version.ts`: no physiology, so the rc.1 validation report (e737de92) still stands.
- **Tag** `v1.0.0-rc.3` (annotated) → fcf99b70, pushed 13:55 +0330. **Release run 39938963544: success** (its
  `playwright install --with-deps` step alone took ≈ 20 min; rc.2's whole run took ≈ 5 min). The release
  "patient-monitor-engine v1.0.0-rc.3": **Pre-release**, not draft, published 2026-10-23T10:50:57Z, 8 assets; the body
  starts with the rc.3 pre-release paragraph; `/releases/latest` 404 (a pre-release is never "Latest").
- **Assets** (Task 2 Step 4, the executor): 8 files, 7.6 MB; `SHA256SUMS.txt` 7 lines, **7 × OK**; IIFE banner
  `/*! patient-monitor-engine 1.0.0-rc.3 …`, **741,613 B** (rc.2 695,037 B); embed zip 4/4 named files; API zip 3.

## The kit (Task 3)

- **Kit** `pme-showcase-kit-fcf99b70`, built by `make-bundle.mjs` from the clean tag worktree at 04:45:23Z
  (verified on the day, not rebuilt): `Commit:   fcf99b706e2cd16e21d441e1b40b88f679a619f1`, no "(with uncommitted
  changes)", `Branch:   HEAD`; one `Windows:` line ("untested on Windows at this release"); the app's build id
  **`"fcf99b70 2026-10-23"`** (no `+`); `1.0.0-rc.3` in 3 of the app's scripts, rc.1/rc.2 in none; 71 app files; both
  `.cmd` and both `.command` launchers, `app/`, `server/`; `runtime/` empty (the Mac's Node is not an official signed
  build: the launchers use the installed Node, then ruby, then perl).
- **Relay** (`check-relay.mjs`): both `.cmd` files "CRLF, ASCII, runs server\launch.mjs"; **PASS (4 of 4 runs; node
  v26.12.1)** (`docs/showcase/kit-round-a/q2-rc3/relay-fcf99b70.json`).
- **READ ME FIRST.txt**: the 5-line "THIS KIT" block appended after the build, before any copy (Decision 2).
- **Windows zip** (Decision 6): `pme-showcase-kit-fcf99b70.zip`, 1,004,390 B, 101 entries; 2 `.cmd` entries, both
  byte-identical to the kit's (cmp); sha256 `81ceddbd0faa712ce4c5dadedd3ae07f7ff325b25a0928bcc5929e59131b081d`. Not a
  release asset.
- **H22 embed**: `_sandbox/pme-embed-rc3/` from the release's `ventilator-monitor-embed-v1.0.0-rc.3.zip` (8 entries, as
  rc.2's; the IIFE identical to the release asset).

**The owner's folders** (inventory first, his notes copied first, `cp -n` for every placement, nothing deleted):

| Where (`_sandbox/`) | What |
|---|---|
| `pme-kit-release-fcf99b70/` | the rc.3 kit + `README.txt` (new) + the Windows zip — **the demo kit** |
| `pme-classroom-dryrun/kit` | the rc.3 kit (the rc.2 one moved out); `PRE-FLIGHT.md`, `OWN-PHONE-TEST.md`: kit sentence → rc.3, the new screen |
| `pme-debrief-dryrun/pme-showcase-kit-fcf99b70` | the rc.3 kit; `HOW-TO-CHECK-THE-PRINT.txt` rewritten for it |
| `pme-debrief-rc3/` (new) | the Q2 tamponade Debrief PDF (6 pp), the A3 learner handout PDF (1 p), two print-view PNGs |
| `pme-debrief-fa/` | the three rc.3 Persian PDFs (2026-10-23) + `READ-ME-FIRST.txt` (English; Persian paragraph to come) |
| `pme-embed-rc3/` (new) | the release's embed |
| `pme-kit-release-b39b3d87/` | **the fallback**, untouched but for its README's first line "FALLBACK for Wednesday 28 October …" and `fa-handouts-rc2/` (the rc.2 Persian set, moved in) |
| `pme-debrief-rc2/`, `pme-embed-rc2/` | unchanged (the fallback's) |

Moved to `_to_delete/rc3-release-day-2026-10-23/`: `owner-notes-before-rc3/` (the five notes as they were),
`pme-classroom-dryrun-kit-b39b3d87/`, `pme-showcase-kit-b39b3d87/` (from `pme-debrief-dryrun`),
**`pme-kit-release-3db25a3b/` (rc.1 retired, with `fa-handouts-rc1/`)**, `pme-embed-rc1/`. Other `_sandbox/pme-*`
folders (`pme-showcase/`, `pme-showcase-docs/`, `pme-showcase-fallback-4a1cc3f7/`) were not touched.

## Kit round Q2 on rc.3 (Task 4)

Worktree `scratch/wt-rc3-docs` (branch `docs-rc3-release` from `origin/main` = the tag commit); one script edit, the
talk's Notes line names rc.3 (+1/−1). One run at a time on the Mac; load average ≈ 2–3.7.

| Step | Result | Verdict |
|---|---|---|
| 3 Talk, Chromium | **1 passed (9.7 min)**, 34 files with the relay JSON (`q2-rc3/`) | PASS |
| 3 Talk, WebKit | **1 passed (9.7 min)**; no hang in the close on either engine | PASS |
| 3b macOS WebKit e2e (tag worktree) | FX-16 **3 passed** (99 %, 99 %, 100 %; 0 dropped); FX-14 pause, FX-24 follower, FX-25 CO₂ attach **3 passed**; none skipped; worktree clean | PASS |
| 3c A3, both engines | **2 passed (7.7 min)**; handout **1 page**, 0 verdict words, the three take-home lines ("Drainage is the treatment: …" ×1), Inter embedded; keyTimes present, moments 7, errors 0 (`q2-rc3-a3/`) | PASS (F10 no) |
| 4 opening | kit fcf99b70; "Version 1.0.0-rc.3 (pre-release). For education only. Not a medical device and not clinically validated: never use it for patient care." (Start and About); `3 phones following`; errors 0 | PASS |
| 4 bronchospasm + H21 | – ✓ – (salbutamol 02:07 / 02:06); H21 hold and cockpit `true`; errors 0 | PASS |
| 4 tamponade + Debrief | ✓ ✓ ✓ ✓ ◆; footer "… Version 1.0.0-rc.3 (pre-release), build fcf99b70 2026-10-23."; Chromium PDF **A4, 6 pages**; PEA 07:49 (pulse lost 07:48), CPR 07:51, drained 09:21, ROSC 10:57 on both; errors 0 | PASS |
| 4 MH early call 13:03 | ✓ ✓ ✓ – – ✓; Early signs 06:52 / 06:51, call 07:02, press 13:03, < 40 at 07:28 / 07:27; FX-12 click `true`; errors 0 | PASS |
| 4 the six monitor PNGs | the Saadat-like grid on all six; CO₂ filled breath by breath (FX-25); tamponade IBP2 = CVP; IBP2 empty by scenario in bronchospasm and MH; no rc.1/rc.2 | PASS (F9 no) |
| 6 six-card shots | **16 passed (55.7 min)**, 64/64 soft checks, 0 errors; 48 files (16 modified, 32 new); 49 older files kept | PASS |

**Gate (Task 4 Step 7):** F1 no · F2 no (4/4) · F3 no · F4 no · F5 no · F6 no · F7 no (0 errors) · F8 no (A4, 6 pp) ·
F9 no · F10 no. **No F-failure: the rc.3 kit is the demo kit.** Notes (recorded, not fixed): see
`SHOWCASE-2-MEASUREMENTS.md` §"Q2 on rc.3", Findings.

## Persian handouts (Task 5)

`debrief-fa.mjs --version 1.0.0-rc.3 --fonts <persian-writing 1.4.0 fonts> --text` on the three Q2 Chromium exports:
bronchospasm **6** A4 pages, tamponade **7**, MH **8** (rc.2: 6 / 6 / 7); **0 strings without translation** in each;
`verify_pdf.py --expect-font Vazirmatn`: exit 0, 0 unexpected fonts, 0 errors, 0 WARN, for each; each names
1.0.0-rc.3 and fcf99b70. The three owner-approved take-home lines (#112, the only reviewed entries each report uses)
print on all three handouts (E113 answered by the tag's script).

## Pages (Task 6, the orchestrator)

`gh-pages` = the tag's build, commit **ceac7b47** (branch `gh-pages-rc3`). `gh-pages-rc2` (36e2efd0) stays as the
rollback.

## The owner's smoke check, live rehearsal, W, E13, E14 (Task 7) — PENDING (Saturday 24 October)
