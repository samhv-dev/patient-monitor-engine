# Stage 8b gate — the v1.0.0-rc.1 release candidate (pre-release)

Branch `stage-8b` (worktree `scratch/wt-stage-8b`), PR #66; plan `docs/plans/stage-8b-release.md` (REBASE-CHECKED
2026-10-13), executed 2026-10-17/18 on `origin/main` `ca0d2dbb`, with `origin/main` `65372000` (kit rounds A3 and C:
showcase documents and one kit script, no physiology) merged before the gate. **No merge and no tag here**: the
orchestrator merges and tags `v1.0.0-rc.1` by `RELEASE.md`. Version label `1.0.0-rc.1`, a **pre-release** — never
"v1.0 released".

## 1. Launch gate (Task 1)

Every launch-gate PR is merged and none is open (`gh pr list`, 2026-10-17): FU-3 #23, FU-4 #25, V.1 #26, FU-11 a–d
#43/#45/#44/#49, FU-7.1 a/b #46/#47 (`fu-7.1-c` never started), Stage 10 #54, Stage 11 #48, Stage 12 #57, Stage 13 #60,
CI reshape #55, FX-1 #58, FX-2 #61, FX-4 #59, FX-7 #56, KR-A1 #64. Gate notes present on `main` (fu-3, fu-4, stage-v1,
fu-11-a…d, fu-7.1-a/b, stage-10…13, stage-12-real-phone, ci-webkit-3).

Find-block check (Task 1 Step 3, the plan's parser): **45 find blocks; 0 problems; 0 package.json (informational)** on
`ca0d2dbb`. Step 3b's re-check is the same tree (nothing moved between the check and the first commit). No block was
re-anchored; every Find/Create of Tasks 2–12 applied with 0 problems (the applier is the same parser in write mode).

Validation report on `main` at launch: commit `7bcf992` (engine 0.0.0), **🟢 96 · 🟡 27 · 🔴 16**, 10 documents not
measurable, queue 43; followed by **274** physiology commits on `main`.

## 2. The IIFE (Tasks 2, 3)

| | raw | gzip -9 | brotli |
|---|---|---|---|
| `main` `ca0d2dbb` (engine twice) | 1,309,853 B | 549,980 B (537.1 KiB, **over** the 400 KB budget) | 277,530 B |
| Stage 8b (engine once, banner) | 693,391 B | 288,894 B | 256,528 B |

`check-size: OK — patient-monitor.iife.js 677.1 KB raw, 282.1 KB gzip -9, 250.5 KB brotli (budget 400.0 KB gzip)`
(headroom 118 KiB; 282.2 KB on the final tree, after Task 13c's two app strings). The file starts with `/*! patient-monitor-engine 1.0.0-rc.1 (@pme/renderer IIFE) | MIT …`, then
`(function __pmeSelf(){`. ECG hook registrations kept: 2 × `onApply.push`, 1 × `onBeat.push`. The build id appears
once in the IIFE (`PME_BUILD=abc1234` test build: one occurrence — the engine ships once).

IIFE smoke from `file://`: Chrome 2/2 and local Playwright WebKit 2/2 (the worker path is asserted wherever
`transferControlToOffscreen` exists). CI: `e2e (webkit)` and `e2e (chromium)` green on the Task 2 push (run
39063721169) and on the Task 4/5 push (run 39065288029, all jobs green); the run with Task 9's CI steps is
run 39066929916 on `e737de92` (all jobs green, incl. the `build` job's new `check-licences`, `check-size`, `pack-smoke` and `docs:api` steps and the `renderer` job's sibling builds and embed artefact).

Renderer unit tests after the worker refactor: 32 files / 110 tests pass; typecheck clean.

## 3. ESM packaging (Task 4)

`release-manifests` diffs: only `version`, `private` (dropped), `description`, `license`, `author`, `repository`,
`sideEffects` (engine-core list, skins/ventilator `false`), `files`, `publishConfig`, the `build` script tail, and
controller's `ws` → `devDependencies`. `pnpm-lock.yaml`: 3 lines (the `ws` move). `finish-dist`: engine-core 144,
controller 26, ventilator 13, renderer 12, audio 9, skins 5 declaration files rewritten. No `.ts'` import specifier is
left in `dist/types` (three hits are comment text, "pd.ts's" etc.); no `reference types="node"`.

`pack-smoke: OK — 6 tarballs carry the licence texts and install; tsc (Bundler, NodeNext, skipLibCheck off), a Node
import and vite build pass` (17.5 s wall). Tarballs: engine-core 1,290,263 B, renderer 1,592,173 B, controller 331,522 B,
skins 230,792 B, ventilator 88,472 B, audio 46,589 B; none carries `dist/assets/`.

Fast set after Task 4: audio 65, skins 191, engine-core 1,430 + 1 skipped, controller 284, ventilator 113, renderer
110, demo 291, validation 125 + 11 skipped — all pass. The validation package's `tick-bench` local p50 bound (< 2 ms)
failed once under `pnpm -r test`'s parallel load (2.47 ms; the test's own comment records 2.67 ms in the same
situation) and passed when the package was re-run alone: a pre-existing timing test, not 8b's. `iife-smoke` and
`vent-link` e2e: 4/4 (Chrome).

## 4. Versions and the build-unique engine key (Task 5, FU-11 A1)

Every library `package.json` and `version` constant says `1.0.0-rc.1` (`release-versions.test.ts`: 3/3 with the
CITATION case). FU-11 A1: `packages/engine-core/src/version.ts` exports `build` (`__PME_ENGINE_BUILD__`, defined by the
engine-core and renderer builds from `PME_BUILD`; `'dev'` everywhere else) and `engineKey = version + '+' + build`.
The engine instance's `version` property is the key (nothing displays it as a release number: the controller stores
it as `hostEngineVersion`, never shown), so `snapshot()`, `restore()` and every `ViewerSync` compare the same key; the
learner/phone follower (`apps/demo/src/app/views/follower.ts`) imports `engineKey`. New test
(`packages/engine-core/test/version.test.ts`): a snapshot whose build differs is refused with "snapshot is from engine
version 1.0.0-rc.1+abc1234, this is 1.0.0-rc.1+dev". No controller fixture needed a change (the `'0.0.0'` snapshot
fixtures are never restored into an engine). Re-run after the change: controller 284, renderer 110, demo 291 tests;
e2e `iife-smoke`, `fu11-follower`, `s12-mobile-learner`, `audit-timeline` 9/9 on Chrome. The release workflow builds
with `PME_BUILD=${GITHUB_SHA::7}`; a release build therefore refuses snapshots from a `dev` build and vice versa (plan
item 9: the showcase kit must be rebuilt from the merged tree if it is to pair with a release build).

## 5. Licences (Tasks 6, 7)

Before the four texts were copied, `check-licences` failed naming exactly them (and the four NOTICES paths) — the
check bites. After: `check-licences: OK (89 packages, 5 shipped, every shipped text in LICENSES/; licences Apache-2.0,
BSD-2-Clause, BSD-3-Clause, BlueOak-1.0.0, ISC, MIT, Python-2.0)` (69 packages before TypeDoc). Shipped: ajv 8.20.0,
fast-deep-equal 3.1.3, json-schema-traverse 1.0.0, require-from-string 2.0.2, fast-uri 3.1.8. `LICENSES/`:
Apache-2.0, ajv-8.20.0, fast-deep-equal-3.1.3, fast-uri-3.1.8, json-schema-traverse-1.0.0, lunr-2.3.9, qrcodegen-MIT,
require-from-string-2.0.2. `check-notices: OK (3 governed files)`. NOTICES row **N-015** (N-014 is the QR generator).

TypeDoc 0.28.20: exit 0, 10.1 s wall, **36 warnings**, all "referenced by … but not included in the documentation"
(types used by public signatures but not exported; informational), 10 module pages, **683 HTML pages, 9.6 MB**,
git-ignored.

## 6. The `file://` ventilator embed (Task 8)

`pme-ventilator-embed.iife.js` **123,759 B raw / 40,348 B gzip** (engine-core's two-file `sideEffects` list: the VF/AF
templates stay out); `ventilator-monitor.html` 13,525 B; `dist/embed/` carries LICENSE, NOTICES.md, LICENSES/ and both
source maps. `embed.ts` mounts as `link-page.ts` does on this tree; it also applies FU-11 H5's monitor-matched VC flow,
as `vent-hamilton.html` does when linked (deviation 3).

e2e (Chrome) 2/2 in 2.4 min: `vent-embed {"s0":98,"s20":99,"s120":92,"c0":37,"c180":47,"simPerWall":3.99}` — SpO2
holds at +20 s and falls 6 points by +120 s after FiO2 0.21 at shunt 0.3; EtCO2 rises 10 mmHg in 180 s at RR 6 (band
≥ +5); awRR reads 6. Local Playwright WebKit: the light test passes, the heavy one is skipped (Chromium-only by
design). CI: run 39066929916 — `e2e (chromium)` 108 passed, 3 skipped in 25.7 min with `vent-embed {"s0":98,"s20":99,"s120":92,"c0":37,"c180":47,"simPerWall":4}`; `e2e (webkit)` 71 passed, 38 skipped, 2 flaky in 15.4 min: the embed's light test passed only on retry #2 (awRR read 15, then 13, when the 30 s default test timeout cut the 80 s of polls short; the test now sets 120 s, same assertions — deviation 8). Screenshots `docs/gates/stage-8b/vent-embed-fio2-21.jpg` 57,170 B and `vent-embed-rr6.jpg`
55,521 B.

**Safari double-click: not done by the executor** (no way to drive real Safari 27.0.1 here); it is owner hand check
**H22** (section 11).

## 7. CI and the release workflow (Task 9)

`ci.yml` only gains lines: `git diff -U0 origin/main -- .github/workflows/ci.yml | grep '^-[^-]'` prints nothing;
`slow-g` occurs 5 times (as on `main`). Jobs parse: `ci.yml build,renderer,e2e,test-slow`, `release.yml release`,
`validation.yml validate`. Release assembly dry run (`GITHUB_REF_NAME=v1.0.0-rc.1`, macOS `shasum`): 7 lines in
`SHA256SUMS.txt`; the embed zip (1,368,142 B) lists LICENSE, NOTICES.md, LICENSES/Apache-2.0.txt and both maps; the
API zip (1,813,283 B) lists LICENSE, NOTICES.md, the TypeDoc Apache text and lunr-2.3.9.txt; `NOTES.md` is the
1.0.0-rc.1 section without the link definitions; the pre-release `case` gives `--prerelease` for `v1.0.0-rc.1` and
nothing for `v1.0.0`.

## 8. Documentation (Tasks 10–13)

- README, CITATION.cff (`version 1.0.0-rc.1`, `date-released 2026-10-17`), CONTRIBUTING, SECURITY, four issue templates.
  README shots: `monitor-philips-like.jpg` 58,631 B, `ventilator-embed.jpg` 57,226 B (the monitor shot's wait was raised
  from 12 to 25 s: at 12 s SpO2 and awRR still read `---`).
- Guides: embedding (MountOptions incl. `audioSilence`, `portrait`, and `layout` marked as declared but not read; the
  handle's Stage 10/FU-11 members; time scale 0.25–8; the `lungState` fields), scenario-authoring (`category`, `story`,
  `objectives` with rules, `durationMin`, `endo`, all 16 event kinds), skin-authoring. `docs-examples` 2/2.
- Physiology overview (400 lines; 36 rhythms, 65 drugs, 56 condition ids, each with a Mode label), validation
  summary, known deviations (151 expected failures + 1 skip, each with where it is tracked; the 5 CI-only WebKit skips;
  the 18 retry-only browser tests; the FU-4 suite; INTERIM stand-ins; datasets). `docs-honesty` 7/7.
- CHANGELOG `## [1.0.0-rc.1] - 2026-10-17` and `RELEASE.md`.

## 9. Validation report regenerated on the release tree (Task 12 Step 0)

`pnpm validate --seeds 11,12` with `PME_PULSE_DIR` set, on commit **`e737de92`** (engine 1.0.0-rc.1), 914 s wall
(datasets: the cache was seeded from the Stage 8a worktree's verified cache, then `datasets:fetch` verified 73 files;
PWDB still 403 from Zenodo). Exit 1 (red rows), the three files written:

> **Summary:** 🟢 96 · 🟡 33 · 🔴 27 graded rows; 1 documents not measurable on this build; calibration queue 60 rows.
> Gating failures: 27.

**More red rows than `main`'s report (16 → 27): not this stage's to fix (R45); the orchestrator is told.** By suite:
morphology 10 (as before), segments 9 (+6: documents now measurable with their profiles), regression 5 (new: the
Stage 8a waveform baselines predate the later physiology; not re-baselined here), oracle 3. One finding for the
calibration pass: every document row that expects the heart rate to change reads the baseline 75 bpm, and the oracle's
haemorrhage HR rise is 0 (Stage 8a: +14). No physiology changed after `e737de92` on this branch.

## 10. Full verification (Task 14)

On the merged tree (`dd547af7` + the vent-embed timeout fix), this Mac (Node 26, system Chrome; another agent may
have shared the machine; heavy suites one at a time):

| Check | Result | Wall |
|---|---|---|
| `pnpm install --frozen-lockfile`, `pnpm typecheck` | clean | |
| Fast set (`PME_TEST_SET=fast pnpm test`) | all pass: audio 65, skins 191, engine-core 1,431 + 1 skipped, controller 284, ventilator 113, renderer 110, validation 141 + 11 skipped, demo 293 | 395 s |
| Slow set (`PME_TEST_SET=slow`, engine-core) | 595 passed, **1 failed**: `organs-soak.test.ts` "24 h at rest" (the 24 h variant runs only locally; CI runs 6 h): hourly UOP drift 0.02194 against < 0.02. **Pre-existing, not 8b**: the same test on a clean `origin/main` `65372000` worktree fails with the identical value 0.021940300843906746 (FU-3's gate note recorded the same file's local 24 h lactate drift). CI's eight `test-slow` groups are green | 5,099 s |
| Showcase set (`PME_TEST_SET=showcase`, demo) | 20 passed (5 files) | 227 s |
| `pnpm build` | clean | |
| `check-notices` · `check-licences` · `check-size` | OK (3 governed files) · OK (89 packages, 5 shipped) · `check-size: OK — patient-monitor.iife.js 677.2 KB raw, 282.2 KB gzip -9, 250.5 KB brotli (budget 400.0 KB gzip)` | |
| `pack-smoke` | OK | 10 s |
| `docs:api` | exit 0, 36 warnings | 10 s |
| Full e2e (`PW_SYSTEM_CHROME=1 pnpm test:e2e`) | **107 passed, 4 skipped, 0 failed, 0 flaky**, incl. `vent-embed {"s0":98,"s20":99,"s120":92,"c0":37,"c180":47,"simPerWall":4.01}` | 14.8 min |
| `vent-embed` on local Playwright WebKit (after the timeout fix) | light test passed (15 s), heavy test skipped by design | |

`git status`: the e2e rewrote only this stage's two gate JPEGs, restored to the committed ones; nothing under
`docs/api` is tracked.

CI on the final push: recorded below once the run completes (section 18).

## 11. Owner items — PENDING-OWNER (not verified; stated as open in the CHANGELOG)

- **Stage 12 gate step 4** — the owner's real phone (H17) and the bronchospasm Ventilator-view hold (H21):
  `docs/gates/stage-12-real-phone.md`.
- **Stage 13 print check** — the Debrief's print preview in Safari and Chrome.
- **H18** fast-forward look in real Safari; **H19** hidden-tab watchdog; **H20** second screen in real Safari within 5 s.
- **H22 (new) — the `file://` embed in real Safari.** Steps: (1) on the merged tree run `npx -y pnpm@9.15.9 install`
  and `npx -y pnpm@9.15.9 build` (or download `ventilator-monitor-embed-v1.0.0-rc.1.zip` from the release and unzip
  it); (2) in Finder open `apps/demo/dist/embed/` and double-click `ventilator-monitor.html` with Safari as the default
  browser (or right-click → Open With → Safari); (3) within 20 s the ventilator (left) breathes and the monitor (right)
  shows HR, SpO2 > 90, EtCO2 and awRR 14; (4) set the ventilator's Oxygen to 21 %: SpO2 holds for about 20–30 s, then
  falls over the next 2 min; (5) set Rate to 6: EtCO2 climbs over minutes and awRR reads 6; (6) Safari → Develop →
  Show JavaScript Console shows no error; record the result and the Safari version (Safari → About Safari) here.
- **Release checklist items 8–9** (`RELEASE.md`): the 600 s tick gate on an idle machine and the busy Ventilator-view
  soak — owner/orchestrator steps before the tag; not run by the executor (shared machine).

## 12. FU-11 hand-overs (Task 13b)

- Tick gate: `RELEASE.md` item 8, `perf:ticks --seconds 600 --budget-ms 6` (Stage 8a's bound; measured 0.53 ms).
- Developer pages: `docs/gates/stage-8b/developer-pages.md` — 23 pages loaded in Chromium; **none retired**; fixed:
  the physiology console keeps the pause across a restart (F24), stage7g's depth tile reads 7f's `neuro.diShown` (F25;
  it said "7f pending" for ever); recorded: `stage6a-viewer.html` throws "no session" when opened without
  `?session=` (for Stage 14).
- Trust limits: in the CHANGELOG's "Known limitations", with "a later release" for FU-11's "v1.1 relay" (Decision 25).
- Soak with a busy Ventilator view: `RELEASE.md` item 9 (not run here).
- Step 5 (`expect: { refused: true }` in `pme-validation` documents): **not needed** — no document on this branch
  expects a refusal.
- Step 6: (a) `FIXED_ALARM_WORDS` (`apps/demo/src/app/alarms.ts`) stays in code: moving it into the glossary needs
  Ali's review of the wording — gap recorded; (b) the `iec-defaults` base skin lists `alwaysOn: []` with provenance
  "brief §3.8" while VF, VT and asystole still alarm on skins that inherit it — the documented list needs a source;
  gap recorded, no data changed.

**Task 13c** (ruled 2026-10-13): the pairing notes (`apps/demo/src/app/pairing.ts`), the Explore labs placeholder and
the Start view's "coming in v1.1" tag no longer promise a version 1.1; the Start view and Settings → About show
"Version 1.0.0-rc.1 (pre-release). For education only. Not a medical device: never use it for patient care." (the
Debrief footer's words; `apps/demo/src/app/about.ts`, test `about.test.ts`).

## 13. Deviations from the plan

1. **Branch `stage-8b`** (the brief's name), not `stage-8b-release`; every push and the PR use it. Accepted by the
   orchestrator.
2. **Commit trailer `Co-Authored-By: Claude Opus 5.5`** (the harness's line; the plan's Global Constraints allow it).
   Accepted.
3. **The embed applies FU-11 H5's monitor-matched VC flow** (as `vent-hamilton.html` does when linked). Accepted.
4. The validation report's commit is `e737de92` (Task 13's CHANGELOG/RELEASE commit, docs only), not Task 11's: the
   dataset download was slow and the plan's order put Task 13 first.
5. Tasks were run in the brief's order: 1–11, 13, 13b, 13c, then 12, then 14. "Failing test first" was observed for
   `check-licences` (the texts) and `docs-honesty`; for the other new unit tests the test and its module were applied
   together from the plan and then run (all green).
6. `stage7g.ts` and `physiology-console/view.ts` were edited (Task 13b "fix"), plus Task 13c's five app files; no
   engine physiology file was touched except `engine-core/src/version.ts`, `index.ts` (exports) and `engine.ts` (the
   key), as FU-11 A1 allows.
7. GitHub Pages: the plan ruled "no Pages at this release" (Q3); the owner later allowed the rc.1 build on Pages after
   the tag. It is `RELEASE.md` "After the workflow" step 5, for the orchestrator after merge and tag; **nothing was
   pushed to `gh-pages`**. The README says the Pages copy cannot pair learners' phones (they need the local kit).

8. `vent-embed.e2e.ts`'s light test gets `test.setTimeout(120_000)`: its own waits add up to 80 s, and on CI WebKit the
   30 s default ended the awRR poll before it settled (passed only on retry #2 in run 39066929916). No assertion changed.

## 14. Later-release items

A built relay bin (Q7; `publishConfig.bin: {}` and `ws` as a devDependency now); the exported default
`stage1Vocabulary(engineVersion = '0.0.0')` (Decision 22); the `PME_VAG_*` environment read in the shipped IIFE, the
stale `stage9-tasks` `test.fail` (now inert: its condition is false) and the FU-11 review leftovers (plan items 5–8:
Stage 14); a DOI (Q5, at 1.0.0).

## 15. Licence items for legal review before the v1.0 tag (brief §10)

| §10 item | Status at this release |
|---|---|
| ECGSYN-derived "MIT" ports | not used: ECGSYN is a forbidden source (brief §8; R6); no file derives from it |
| ODC-By templates bundled in an MIT package (N-050, N-051) | bundled with attribution in NOTICES.md, the IIFE banner and every distribution's `NOTICES.md`; whether ODC-By attribution-by-NOTICES suffices: open, for Ali |
| VitalDB DUA (vitaldb.net) vs the PhysioNet CC BY copy | validation only, the PhysioNet CC BY 4.0 copy; nothing bundled |
| PWDB PDDL on Zenodo | validation only (not fetched: Zenodo 403 in 8a and on 2026-10-17); nothing bundled |
| CapnoBase | excluded (brief §8) |
| MIMIC ODbL share-alike | excluded (brief §8) |
| Apache NOTICE obligations (N-P rows, TypeDoc assets) | `LICENSES/Apache-2.0.txt` and the NOTICES excerpt ship with every artefact (npm `dist/`, embed zip, `LICENSES.zip`, API zip); statement of changes per N-P row |
| PTB-XL licence mismatch (§11 C5) | R6 listed PTB-XL as ODC-By, the PhysioNet page says CC BY 4.0; both allow the use; NOTICES N-052 records CC BY 4.0; report-only comparison, nothing bundled — resolved in the repository's records; a lawyer's confirmation: open, for Ali |

## 16. BUILD-PLAN Stage 8 acceptance (8a + 8b) — never an unmet item as met

1. **V1–V9 pass — NOT MET**: 27 gating rows in the regenerated report (morphology 10: upstroke, notch, PPG↔ABP shape;
   segments 9: the haemorrhage, septic-shock, RV-infarct and VF/sugammadex rows; regression 5; oracle 3: haemorrhage
   HR and MAP, propofol MAP).
2. **Blind realism review — NOT MET**: not run.
3. Performance — partly: 8a's soak, frames and ticks; the iPad and the projector not measured.
4. Size ✓ — 282.2 KB gzip -9 of 400.
5. Embed ✓ — Chrome by e2e (numbers in §6); Safari by hand is H22, open.
6. Licence ✓ — `check-notices`, the extended `check-licences` and §15.

Definition of done: 1 and 8 not met (as acceptance 1–2); 9 — the IIFE and the ESM packages are built and publishable
(publishing: Q1, GitHub release only), and "the ventilator-sim PR has been handed to Ali" is superseded by R35 and the
Q4 ruling (the embed ships in this repository); 10 per §15. Open questions: none — Q1, Q2, Q3, Q5, Q8 ruled by Ali
(2026-10-10), Q4, Q6, Q7 ruled 2026-09-27, Q9 yes; Q3 superseded for Pages after the tag (deviation 7).

## 17. Honesty

`docs/guides/known-deviations.md` lists **151 expected failures and 1 skipped test** (every one with where it is
tracked), the 5 CI-only WebKit skips, 18 retry-only browser tests and all 60 calibration-queue rows. No release page
claims clinical validation, IEC 60601 compliance, FDA/CE status or diagnostic use (`docs-honesty`, 7/7).

## 18. CI on the final code push

Run **39076653954** on `d72eeaf3` (the gate note and plan commits only follow it): **all 12 jobs green** — `build`
(incl. `check-licences`, `check-size`, `pack-smoke`, `docs:api`), `renderer`, `e2e (chromium)`, `e2e (webkit)` and
the eight `test-slow` groups (`slow-a` … `slow-g`, `showcase`).

- `e2e (chromium)`: 108 passed, 3 skipped (25.6 min); `vent-embed {"s0":98,"s20":99,"s120":92,"c0":37,"c180":47,"simPerWall":4}`;
  "e2e tests that passed only on retry": none.
- `e2e (webkit)`: 72 passed, 38 skipped, 1 flaky (14.4 min); passed only on retry:
  `[webkit] scenario-choose-another.e2e.ts:14 the scenario library opened before the first repaint stays open until a
  scenario is loaded (passed on retry #1)` — already on the known-flaky list (known-deviations.md). The embed's light
  test passed first time on WebKit after the timeout fix (and on the merge run 39068579366 before it).

