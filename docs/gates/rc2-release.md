# Gate: the v1.0.0-rc.2 release day (2026-10-20)

*Plan: [`docs/plans/rc2-release-day.md`](../plans/rc2-release-day.md) (re-dated 2026-10-20). Evidence:
`docs/showcase/kit-round-a/q2-rerun/`, `q2-a3/`, `q2/`; the write-up of the rehearsal is
[`SHOWCASE-2-MEASUREMENTS.md`](../showcase/SHOWCASE-2-MEASUREMENTS.md) section Q2. The owner's smoke check (Task 7) is
PENDING: this file gets its results before the PR is marked ready.*

## The case

`v1.0.0-rc.2` is an annotated tag on **b39b3d8774b55ecf0f278e2f977ad865d0820bd0** (main, #91), pushed 2026-10-20
00:17 (+0330). The tag commit is `origin/main` itself, with the Debrief part B in it (#88): case **T-B** in spirit, so
no B revert. Plan A of the orchestrator's rulings of 2026-10-20: rc.2 is the baseline, a v1.0.0-rc.3 follows (freeze
Saturday 24 October 18:00, rehearsal-ready Monday 26), and the demo is **Wednesday 28 October 2026**.
`FALLBACK_SHA` = 1b87b7ee (#89, main run 39178568874 green), an ancestor of the tag.

- Main CI on the tag commit: run **39218008576**, all 14 jobs green. The FX-16 e2e passed on its first attempt in
  `e2e (chromium)` (27.3 s). Retry-only passes in that run: `scenario-choose-another.e2e.ts:14` (Chromium) and
  `vent-embed.e2e.ts:34` (WebKit), recorded in `docs/guides/known-deviations.md`.
- Physiology since rc.1 (`RELEASE.md` "Before the tag" item 2): 175 files under `packages/engine-core/src` changed
  (+3754/−3672), nearly all comments (Stage 14). With comments and whitespace removed (TypeScript `transpileModule`),
  4 files differ in code: `version.ts` (1.0.0-rc.2); `l3/spo2/spo2.ts` and `engine.ts` (the beep base pitch 880 →
  1245 Hz, FX-16, audio only); `l2/pk/data/rows-anaesthetic.ts` (the fentanyl and remifentanil vagal effects lose
  their `PME_VAG_*` environment overrides; the values are the former defaults, emax 420, EC50 4 / 6). No physiology
  changed: the rc.1 validation report (`docs/validation/report.md`, e737de92) stands for rc.2.

## The release

- Release workflow run **39322222807**: success; published 2026-10-19T20:52:26Z (00:22 +0330) as a **Pre-release**,
  "patient-monitor-engine v1.0.0-rc.2", 8 assets.
- `SHA256SUMS.txt`: 7 lines, **7/7 OK**. `patient-monitor.iife.js` starts `/*! patient-monitor-engine 1.0.0-rc.2`;
  **695,037 B** (rc.1 693,451 B). The embed zip holds LICENSE, NOTICES.md, LICENSES/Apache-2.0.txt and
  ventilator-monitor.html (4/4); the API zip its 3 notices.
- The notes are the CHANGELOG's `## [1.0.0-rc.2] - 2026-10-20` section; they begin "Second public **pre-release**
  (release candidate) of a teaching simulator. It is for education only: it is not a medical device and it is not
  clinically validated."

## The kit (Task 3)

Built by `node scripts/showcase/make-bundle.mjs` in a clean worktree of the tag:

```
Commit:   b39b3d8774b55ecf0f278e2f977ad865d0820bd0
Branch:   HEAD
Subject:  fix(demo): the pulseless SpO2 footnote names the pleth signal during CPR as compression flow, not oxygenation; Persian entry owner-approved (#91)
```

No "(with uncommitted changes)". Build id `b39b3d87 2026-10-19` (UTC date, no `+`); `1.0.0-rc.2` in 3 asset scripts,
`1.0.0-rc.1` in none. Relay smoke test: **PASS (2 of 2 runs; node v26.12.0)**. `READ ME FIRST.txt` got the
"THIS KIT" block (version and build, education only, rc.1 bookmarks will not restore, keep the rc.1 kit as the
fallback) once, before any copy.

## The owner's folders (what moved where)

Inventory first (it matched the 19 October list; no Debrief-plan G2/G3 output existed). The owner's four notes were
copied to `_to_delete/rc2-release-day-2026-10-20/owner-notes-before-rc2/` before any edit. Nothing was deleted.

| Folder (`_sandbox/`) | Now | Moved out (to `_to_delete/rc2-release-day-2026-10-20/`) |
|---|---|---|
| `pme-kit-release-b39b3d87/` (new) | the rc.2 kit + README.txt | — |
| `pme-kit-release-3db25a3b/` | the rc.1 kit (the fallback), README.txt with a first line "FALLBACK for Wednesday 28 October …", and `fa-handouts-rc1/` (the three rc.1 Persian PDFs and their READ-ME) | — |
| `pme-classroom-dryrun/kit` | the rc.2 kit; PRE-FLIGHT.md and OWN-PHONE-TEST.md name it | the rc.1 kit → `pme-classroom-dryrun-kit-3db25a3b/` |
| `pme-debrief-dryrun/` | `pme-showcase-kit-b39b3d87/`; HOW-TO-CHECK-THE-PRINT.txt rewritten for rc.2 | `pme-showcase-kit-3db25a3b/`; the three cb4fb17e PDFs → `pme-debrief-dryrun-cb4fb17e-pdfs/` |
| `pme-debrief-rc2/` (new) | the Q2 tamponade print PDF (6 pages), the learner handout PDF (1 page), two print-media screenshots | — |
| `pme-debrief-fa/` | `debrief-fa-{bronchospasm,tamponade,malignant-hyperthermia}-2026-10-20.pdf` and a new READ-ME-FIRST.txt (English; the Persian paragraph is still to be written) | the rc.1 set went to `pme-kit-release-3db25a3b/fa-handouts-rc1/` |
| `pme-embed-rc2/` (new) | the release's embed zip, unzipped (8 entries; the IIFE byte-identical to the release asset) | — |
| `pme-embed-rc1/` | unchanged, until the owner's H22 on rc.2 | — |

## The rehearsal, kit round Q2 (Task 4)

| Check | Result |
|---|---|
| First talk run into `q2/` | both engines went through every segment, then hung in the close (the FX-12 probe's "Return here" click on a hidden button, no time-out); interrupted; partial set kept. Script fixed (bounded click), re-run once |
| Talk re-run into `q2-rerun/` | **Chromium 1 passed (9.4 min), WebKit 1 passed (9.7 min)** |
| 0 Opening + QR | rc.2 label · `3 phones following` · errors 0 — PASS |
| 1 Bronchospasm + H21 | – ✓ – (salbutamol 02:06) · H21 hold and cockpit `true` (1 506 contiguous frames) · errors 0 — PASS |
| 2 Tamponade + Debrief | ✓ ✓ ✓ ✓ ◆ (tick 01:05 / 01:06 · CPR 3 s · drainage 1 min 30 s · stop 2 s) · rc.2 footer with the build · Chromium PDF A4, 6 pages · errors 0 — PASS |
| 4 MH, 13:03 | ✓ ✓ ✓ – – ✓ (tick 06:54 · call 10 / 11 s · dantrolene 21 s · ventilation back 13:03 / 13:04) · Early signs 06:52, < 40 at 07:28 / 07:29 · errors 0 — PASS (times: NOTE, within ±10 s) |
| Phones | every phone `synced` at every segment's end; S12-F2 (AGENTS `---`) at the close as in Q1 — PASS / NOTE |
| Six monitor captures | ECG II, ECG II, CO₂, IBP1, IBP2, pleth; IBP2 empty in bronchospasm and MH by scenario — PASS |
| FX-16, macOS WebKit, ×3 | 3 passed, none skipped; phone/host 99 %, 100 %, 100 % — finding (good), not a gate |
| F10, A3 test (`q2-a3/`) | 2 passed; handout 1 page, 0 verdict words; keyTimes present; moments 7; errors 0 — PASS |
| Six-card shots (`rehearsal.showcase.ts`) | 16 passed (55.5 min); 64/64 soft checks; 0 errors — PASS |

**Gate verdict: no F-failure** (F1–F10 all "no"). Notes: the close's hang (test tooling, fixed); MH call 10–11 s;
tamponade WebKit 44 timeline rows; S12-F2 and FX-12 as Q1; `about.preRelease: false` (the script's rc.1 regex).

**Six-card shots (Task 4 Step 6, `rehearsal.showcase.ts`, one worker, `env -u CI`, 01:33–02:28): 16 passed (55.5 min;
27.7 min per engine)**; 64 of 64 soft checks pass, 0 page or console errors. In place (Decision 8): 8 JPGs and 8 JSONs
modified, 8 JPGs and 8 JSONs new (airway-not-secured, fentanyl-midazolam, MH, stab-wound tamponade, each engine), and
16 new `results/run-sheet-*.md`: 48 files, all in this PR. Older files the run no longer writes stay as they are. Lane
order on tamponade (Chromium), MH (WebKit) and anaphylaxis (Chromium): ECG II, ECG II, CO₂, IBP1, IBP2, pleth; IBP2
empty with `---` in MH and anaphylaxis (no CVP line).

## Persian handouts (Task 5)

From the three `q2-rerun/` Chromium Debrief JSONs, `debrief-fa.mjs --version 1.0.0-rc.2 --fonts <Vazirmatn>`:
bronchospasm **6** A4 pages, tamponade **6**, MH **7**; **0 strings without translation** in each;
`verify_pdf.py --expect-font Vazirmatn` exit 0, 0 unexpected fonts, 0 errors, 0 WARN each; `pdffonts`: Vazirmatn
Regular and Bold only. No string was missing from `docs/showcase/i18n/fa-debrief.json`.

## GitHub Pages (Task 6)

The tree is the kit's `app/` (70 files) + `.nojekyll`, LICENSE, NOTICES.md, README.md, VERSION.txt and LICENSES/ (8):
**83 files**, one orphan commit **36e2efd0012b8ab466dc318f719fe5484269790b** on the local branch `gh-pages-rc2`.
`check-subpath.mjs`: root-absolute URLs 0. Served locally under `/patient-monitor-engine/`: the Start label reads
"Version 1.0.0-rc.2 (pre-release). For education only. Not a medical device and not clinically validated: never use it
for patient care."; no 404, 0 errors. The push to `gh-pages` and the live checks are the orchestrator's: PENDING.

## The owner's smoke check (Task 7)

PENDING (Tuesday 20 October evening or Wednesday 21). E13 (the presenting Mac) and E14 (the router test): PENDING.

## Deviations from the plan

1. Dates: the demo is Wednesday 28 October (not Saturday 24); the talk script's Run by reads "Showcase 2, 28 October".
2. Task 2 Step 4 (the asset download and SHA256SUMS) was run by the executor: `$W/assets` did not exist when the embed
   needed it.
3. Task 4 Step 2: PR #90 had already merged the tick, the screenshots and the time-out; only the Run-by date changed.
4. Task 4 Step 3: the first run hung in the close on both engines; the script's FX-12 click was bounded and the talk
   re-run into `q2-rerun/` (Decision 2: never into a folder that holds files). Tasks 5 and the gate read `q2-rerun/`.
5. Task 4 Step 3b ran with `env -u CI … --repeat-each 3` (prep correction 4).
6. Task 5 Step 3: the new READ-ME-FIRST.txt is English only, with a line saying the Persian paragraph is still to be
   written (the executor writes no new Persian text).
7. Task 6's serve check is the prep's `pages-serve-check.mjs` (not in the plan).
8. The docs PR opens as a draft before the smoke check (orchestrator ruling); the smoke results follow.
