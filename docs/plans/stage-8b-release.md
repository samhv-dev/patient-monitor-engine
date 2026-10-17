# Stage 8b: the 1.0.0-rc.1 release candidate — packaging, the single-engine IIFE, the file:// ventilator embed, docs and CI — Implementation Plan

**STATUS: REBASE-CHECKED 2026-10-13 against `origin/main` 56f3761f** (read-only check before the freeze; the 43 refreshed find blocks still match, 0 problems; with this check's two new `ci.yml` blocks the plan has **45 find blocks, 0 problems** on 56f3761f; the textual fixes are listed under "Rebase check 2026-10-13" below and in `scratch/plans-backup/stage-8b-rebase-check-2026-10-13.md`; pre-check text: `scratch/plans-backup/stage-8b-release.pre-rebase-2026-10-13.md`). Previous status: **REFRESHED 2026-10-10 against `origin/main` 48864439 (and a simulated freeze tree: 48864439 + the FU-11, FU-7.1 and Stage 10 prototype patches), reviewed and fixed the same day (`scratch/plans-backup/stage-8b-review-2026-10.md`); 3904 lines. Executes AFTER the freeze (Mon 2026-10-19) once FU-11, FU-7.1 and Stage 10 have merged (Task 1 launch gate). Version label `1.0.0-rc.1` (Q8 ruled). The 2026-09-27 text is kept at `scratch/plans-backup/stage-8b-release.2026-09-27.md`.**

The release is a PRE-RELEASE (release candidate), never "v1.0 released" (`docs/roadmap/`; Ali, 2026-10-06: "we should not advertise what we are not"). Wherever this plan says "the release", read "the release candidate `1.0.0-rc.1`".

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the engine releasable as v1.0.0-rc.1 without touching any physiology: every library package at 1.0.0-rc.1 with `exports`/`types` that work for ESM consumers (proved by packing and installing the tarballs into a fresh project); a reproducible single-file IIFE that ships the engine ONCE (worker started from the file's own source) and stays inside the BUILD-PLAN budget of 400 KB gzipped; the Hamilton ventilator and the monitor in one page that opens from `file://` with a Playwright smoke that shows SpO2 falling after FiO2 0.21 at shunt 30 % and EtCO2 rising at RR 6; a TypeDoc API reference; embedding, scenario-authoring and skin-authoring guides; a one-page physiology overview that flags MODELED-only behaviour; a validation summary with an honest known-deviations list regenerated from the gate notes and every `it.fails`; README, CITATION, CONTRIBUTING, SECURITY, issue templates, CHANGELOG, a RELEASE checklist; a dependency-licence audit and an IIFE size guard in CI; and a release workflow that attaches the IIFE, the embed and the API reference to a GitHub **pre-release** when the ORCHESTRATOR pushes the `v1.0.0-rc.1` tag. Nothing is published to npm (Q1), there is no GitHub Pages site (Q3) and no DOI (Q5) at the release candidate.

**Architecture:** No engine, renderer-behaviour or band changes (R45). The only source edits outside docs/build files are (a) `packages/renderer/src/engine.worker.ts`, which becomes a module that starts itself only inside a dedicated worker named `pme-engine` (and the one line in `packages/renderer/src/worker-host.ts` that gives the ESM worker that name), and (b) the version constants. The IIFE is built in a second Vite pass (`--mode iife`) that aliases the `?worker&inline` import to `src/iife-worker.ts`; a small Rollup plugin wraps the minified file in a named function `__pmeSelf`, and the worker is `new Worker(blob("(" + __pmeSelf + ")()"))`. ESM consumers get `dist/` through pnpm's `publishConfig` (the workspace keeps resolving `src/` for tests and the demo), declarations from `tsc --emitDeclarationOnly` with a post-pass that rewrites `./x.ts` specifiers to `./x.js`. The embed is a second IIFE built from the demo (`apps/demo/src/vent/embed.ts`, which reuses the demo's Hamilton UI) plus an HTML file generated from `vent-hamilton.html`; ventilator and monitor talk over an in-page `LinkPort` pair (the Stage V protocol).

**Tech Stack:** TypeScript 5.9 strict, Vite 6.4 (library + IIFE), Vitest 3.2, Playwright 1.63 (system Chrome locally; Chromium + WebKit in CI), TypeDoc 0.28.20 (Apache-2.0, build only), pnpm 9.15.9 (`pnpm pack`, `pnpm licenses list`), GitHub Actions.

**Spec:** `docs/BUILD-PLAN.md` Stage 0 (IIFE requirement) and Stage 8 ("Docs", "Release", "Ventilator-sim embed", acceptance 4–6, Definition of done 9–10); `docs/DESIGN-BRIEF.md` §1 (non-goals), §3.4, §7.1–§7.6 (API, `pme-scenario/1`, embedding contract), §8 (licence and provenance); `docs/gates/stage-8a.md` (what 8a delivered); `../research/00-orchestrator-rulings.md` R6/R12 (MIT, datasets), R10 (ESM + single-file IIFE), R21 (the orchestrator merges), R25 (partition), R27/R35 (the ventilator is forked into this repo; the old project stays as-is), R44/R45 (calibration queue; bands are never loosened), R50 (plan review), **R53** (release order FU-3 → FU-4 → V.1 → 8b; no tag before FU-4), CI amendments 3 and 4.

---

## Global Constraints

- Paths are relative to `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo`. Work ONLY in the worktree `../scratch/wt-stage-8b` on branch `stage-8b-release`.
- **Launch gate (R53 + the SHOWCASE 2 / release-candidate ruling of 2026-10-06, binding):** FU-3, FU-4 and V.1 are on `main` (PRs #26 for V.1; their gate notes `docs/gates/fu-3.md`, `fu-4.md`, `stage-v1.md` are on 48864439). This plan's executor launches only after the **freeze (Mon 2026-10-19)** and only once these have ALL merged to `main`: **FU-11** hardening (branches `fu-11-a`, `fu-11-b`, `fu-11-c`, `fu-11-d`; plan `docs/plans/fu-11-hardening.md`), **FU-7.1** drug and physiology leftovers (branches `fu-7.1-a`, `fu-7.1-b`, and `fu-7.1-c` only if the optional pulsus-paradoxus branch went ahead; plan `docs/plans/fu-7.1-drug-physiology-leftovers.md`) and **Stage 10** time control (plan `docs/plans/stage-10-time-control.md`). Any other stage the orchestrator merges before the freeze is merged by then too; the orchestrator's launch message lists them. **Rebase check 2026-10-13:** the orchestrator ruled (2026-10-10) that the scenarios stage is REQUIRED; on `main` 56f3761f all of these are already merged — FU-11 a–d (#43, #45, #44, #49), FU-7.1 a+b (#46, #47; `fu-7.1-c` was never started, so pulsus paradoxus stays a known limitation), Stage 10 (#54), Stage 11 showcase cards (#48), Stage 12 learners' phones (#57, gate step 4 PENDING-OWNER), Stage 13 debrief (#60, print check PENDING-OWNER), the CI reshape (#55) and the fixer round (FX-1 #58, FX-2 #61, FX-4 #59, FX-7 #56). Stage 14 (clean-up) runs AFTER the rc (its Task 0 needs 8b), so it is NOT a launch-gate item. Task 1 checks this and stops if any is missing. Because those stages land after this plan was refreshed, **Task 1 re-verifies every find block of this plan against `main` at launch** (Step 3) **and once more as the last act before the first commit** (Step 3b) (the script in Task 1 Step 3); a block that no longer matches is re-anchored on its neighbouring comment and the same change applied — never re-type a line you are not changing — and the re-anchoring is listed in the gate note. JSON has no comments: the six library manifests are therefore NOT edited by find blocks but by the field-setting script `scripts/release-manifests.ts` (Task 4 Step 4), which keeps every key a sibling stage added; the remaining one-line `package.json` blocks are reported by the check as informational, and a miss is applied as the same one-line edit on the current line.
- **Before every task:** `git fetch origin && git merge --no-edit origin/main` in the worktree (nothing should be moving after the launch gate; if something did, re-run the task's tests after the merge).
- **Version label (Q8, RULED by Ali 2026-10-06/10: `1.0.0-rc.1`).** This plan writes `1.0.0-rc.1` everywhere it writes the release version (manifests via `scripts/release-manifests.ts`, whose default is `1.0.0-rc.1`, the version constants and their tests, the IIFE smoke and the embed e2e, the CHANGELOG heading, CITATION `version`, `RELEASE.md`'s tag commands and asset names); the tag is `v1.0.0-rc.1` and the GitHub release is flagged pre-release. A later `1.0.0` is a separate, small release PR (re-run `scripts/release-manifests.ts 1.0.0`, the constants, CHANGELOG, CITATION, plus the Zenodo/DOI step that Q5 deferred to it). Never write "v1.0 released" or "first stable release" anywhere.
- **Nothing here changes physiology or a test band (R45).** No file under `packages/engine-core/src/l1/**`, `src/l2/**`, `src/l3/**`, `packages/engine-core/data/**`, `packages/ventilator/src/**` or any existing test's assertions is edited, except the six `version.test.ts` files (0.0.0 → 1.0.0-rc.1) and the IIFE smoke. If a test on `main` fails in the worktree before any 8b change, record it in the gate note and report — do not fix it here.
- **Partition:** this stage OWNS `scripts/{finish-dist,check-size,check-licences,deviations,release-manifests}.ts`, `scripts/pack-smoke.mjs`, the new licence texts `LICENSES/{ajv-8.20.0,fast-deep-equal-3.1.3,json-schema-traverse-1.0.0,require-from-string-2.0.2,lunr-<version>}.txt`, `packages/*/tsconfig.build.json`, `packages/*/typedoc.json`, `typedoc.json`, `packages/renderer/src/iife-worker.ts`, `apps/demo/src/vent/embed.ts`, `apps/demo/vite.embed.config.ts`, `apps/demo/scripts/{build-embed,readme-shots}.mjs`, `apps/demo/e2e/vent-embed.e2e.ts`, `packages/validation/test/{release-versions,release-manifests,finish-dist,check-size,check-licences,docs-examples,docs-honesty}.test.ts`, `.github/workflows/release.yml`, `.github/ISSUE_TEMPLATE/**`, `docs/guides/**`, `docs/images/**`, `docs/gates/stage-8b.md`, `docs/gates/stage-8b/**`, `README.md`, `CHANGELOG.md`, `RELEASE.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CITATION.cff`. It MODIFIES: `packages/renderer/src/engine.worker.ts` (worker entry → guarded `startWorker`), `packages/renderer/src/worker-host.ts` (one line: the ESM worker's name), `packages/renderer/vite.config.ts`, the `package.json` and `vite.config.ts` of `engine-core`, `renderer`, `audio`, `controller`, `skins`, `ventilator`; `packages/validation/package.json` (version only); the six version constants and their `version.test.ts`; `apps/demo/e2e/iife-smoke.e2e.ts`; `apps/demo/package.json` (build script) and `apps/demo/tsconfig.json` (include); root `package.json`, `pnpm-lock.yaml`, `.gitignore`; `.github/workflows/ci.yml` (additive steps only: four in `build`, three in `renderer`, one in `e2e`; rebase check 2026-10-13); `NOTICES.md` (row N-015 — N-014 is the QR code generator since Stage 12 —, and the licence cells of N-010–N-013); `docs/validation/{report.md,report.json,calibration-queue.md}` (ONLY as regenerated by `pnpm validate` in Task 12 Step 0 — never edited by hand; orchestrator ruling Q9). **Never edit** `.github/workflows/validation.yml`, the `test-slow` job, `PME_TEST_SET` handling, `vitest.workspace.ts`, `playwright*.config.ts`, anything under `docs/physiology/**`, any other file under `docs/validation/**`, other stages' gate notes or plans. **Refresh 2026-10-10 additions:** the FU-11 hand-overs also let this stage MODIFY `packages/engine-core/src/version.ts` (the `build` constant) and the engine's snapshot/restore version check (Task 5, FU-11 A1), the renderer and engine-core `vite.config.ts` `define` for the build id (Task 5), the Developer view's page list `apps/demo/src/app/views/dev.ts` and the pages it retires (Task 13b Step 2), and — only as Task 13b Step 6 records — the glossary data file and the iec-defaults skins' `alwaysOn` with a provenance row.
- **CI rules (binding):** the fast/slow split and the `validate` workflow stay exactly as they are (CI amendment 3), and so do the seven slow groups (`slow-a` … `slow-g`), the build job's "slow groups are disjoint and cover SLOW" step and the `test-slow` matrix (CI amendments 5 and 6, FU-9/FU-7/FU-10 gates) — Task 9's two `ci.yml` blocks only ADD steps after `pnpm check-notices` and after the IIFE upload, and the executor diffs `ci.yml` to prove it (Task 9 Step 1); any new test that runs the engine for more than one sim-minute yields per sim-minute (CI amendment 4; none in this plan: the only engine run is the browser e2e); the tick-bench p50 < 6 ms on CI is untouched; heavy e2e is Chromium-only (`test.skip(browserName === 'webkit', …)`, the G7g/FU-1 rule); every committed PNG/JPEG is ≤ 60 KB.
- **Running the e2e suite rewrites other stages' committed gate screenshots** (several e2e tests write into `docs/gates/stage-*/`). Never `git add -A` or `git add docs/gates`: stage explicit paths only, and before every commit restore every modified path outside `docs/gates/stage-8b*` that `git status --short docs/gates` shows (`git checkout -- <path>`; this includes e.g. `docs/gates/stage-8a*`, `docs/gates/stage-v1*`, `docs/gates/fu-*`).
- **Process:** push after every task commit (`git push origin stage-8b-release`); the PR is opened as a DRAFT right after Task 2 so CI (Chromium + WebKit) exercises every later push, and is marked ready in Task 14; never push to `main`; never merge; **never tag** (the `v1.0.0-rc.1` tag is the orchestrator's step in `RELEASE.md`, after the PR merges); never `git stash` (the stash list is shared across worktrees; commit WIP instead). Scratch files only under `<scratchpad>/stage-8b-release/` (the session scratchpad is shared; bare filenames collide). Bound every wait (≤ 10 min per `until` loop or `sleep` chain; re-check the process or the log's mtime).
- Commit messages are conventional and end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (use your harness's attribution line if it gives a different one). The PR is titled **"Stage 8b: 1.0.0-rc.1 release candidate, docs and IIFE embed"** and its body ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- pnpm is not on PATH: `npx -y pnpm@9.15.9 …`. No `timeout` on macOS. Playwright locally: `PW_SYSTEM_CHROME=1` runs system Chrome only. **Rebase check 2026-10-13: Playwright's own Chromium 1243 and WebKit 2359 ARE installed on this Mac** (`~/Library/Caches/ms-playwright`; `docs/RESUME.md`): run the stage's own e2e files (`iife-smoke`, `vent-embed`) ALSO with `npx -y pnpm@9.15.9 exec playwright test <file> --project=webkit` before pushing (CI's WebKit runner is slower and keeps its CI-only skips; real Safari is still checked by hand). **Full gate:** `npx -y pnpm@9.15.9 typecheck && PME_TEST_SET=fast npx -y pnpm@9.15.9 test && PME_TEST_SET=slow npx -y pnpm@9.15.9 --filter @pme/engine-core test && PME_TEST_SET=showcase npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices && npx -y pnpm@9.15.9 check-licences && npx -y pnpm@9.15.9 check-size && PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 test:e2e` (the slow set is what CI's `test-slow` job runs; run it in the background with a bounded wait).
- **Documentation honesty (binding):** no page may claim clinical validation, diagnostic use or IEC 60601 compliance. Numbers about realism come only from `docs/validation/report.md` and `docs/validation/calibration-queue.md` as regenerated on this stage's own tree in Task 12 Step 0 (orchestrator ruling Q9), the gate notes and the `it.fails` titles as they are at execution time. Unmet acceptance items (BUILD-PLAN Stage 8 acceptance 1–2, Definition of done 1 and 8) are stated as unmet, never presented as met. MODELED-only behaviour is labelled as such wherever it is described. The `docs-honesty` test (Task 12) enforces the mechanical part.
- Never open any path containing `ecgsyn` (brief §8 forbidden sources). The PR template's "Sources consulted" field lists the TypeDoc, pnpm and Vite documentation pages you read.

---

## Decisions this plan makes where the spec was silent or unreachable

1. **The IIFE ships the engine once (worker = the file's own source).** On `main` the IIFE carries the engine twice: once for the main-thread fallback and the `createEngine` export, once as the Vite inline worker (a 513 KB string). Measured on `main` 9f864b3: **1,129,884 B raw, 485,085 B gzip -9 (473.7 KiB) — over the BUILD-PLAN budget of 400 KB gzipped (acceptance 4)**. Brotli would hide it (long window), but the budget is stated in gzip. Fix: in the IIFE build only, `./engine.worker.ts?worker&inline` is aliased to `src/iife-worker.ts`, which creates the worker from `(${__pmeSelf})()` — the text of the whole IIFE, wrapped after minification by a 15-line Rollup plugin. `engine.worker.ts` starts itself only when `document` is undefined and the worker's name is `pme-engine` (orchestrator ruling, 8b review: a host that `importScripts`es the IIFE into its OWN worker, e.g. for headless `createEngine`, must not have its `onmessage` taken over); `iife-worker.ts` and the ESM `worker-host.ts` both name the worker `pme-engine`, so in the page, and in any other worker, the same code is inert. Result (with the licence banner): **597,766 B raw, 253,765 B gzip -9 (247.8 KiB), brotli 222.2 KiB**. **Re-measured 2026-10-10 on 48864439:** `main`'s IIFE has grown to **1,290,519 B raw / 544,134 B gzip -9 (531.4 KiB, over budget)**; with this plan **680,626 B raw / 284,562 B gzip -9 (277.9 KiB) / 252,901 B brotli** — within the budget, 122 KiB headroom; Chrome runs the `worker-raf` path from `file://`; the source map stays exact (checked with `source-map-js`). The ESM build keeps Vite's `?worker&inline` (bundlers handle it; unchanged behaviour).
2. **Size guard = gzip -9 of `patient-monitor.iife.js` ≤ 400 × 1024 B**, checked by `pnpm check-size` in CI after `pnpm build`. Headroom 152 KiB on 9f864b3; **122 KiB on 48864439** (277.9 KiB, refresh 2026-10-10) for FU-11, FU-7.1, Stage 10 and 1.x.
3. **ESM packaging keeps the workspace on `src/`.** Every package's `exports` stays `./src/*.ts` in the repo, so typecheck, Vitest and the demo keep working without a build; `publishConfig.exports`/`publishConfig.types` (applied by `pnpm pack`/`pnpm publish`) point consumers at `dist/*.js` and `dist/types/src/*.d.ts`. Declarations come from `tsc -p tsconfig.build.json` (`emitDeclarationOnly`; `paths` map sibling `@pme/*` imports to the siblings' emitted declarations, built first by `pnpm -r build`'s topological order); `scripts/finish-dist.ts` rewrites relative `./x.ts` specifiers in `.d.ts` to `./x.js` (tsc 5.9 does not rewrite declaration specifiers even with `rewriteRelativeImportExtensions`) and copies `LICENSE`, `NOTICES.md` and the whole `LICENSES/` directory into every `dist/` (the engine bundles ODC-By templates and Apache-2.0-derived modules; controller and skins bundle ajv and its MIT/BSD-3 dependencies — every licence text and attribution must travel with every copy, orchestrator ruling 1 of the 8b review). ESM builds externalise sibling `@pme/*` imports (one copy of each package in a consumer's bundle); third-party code (ajv and its dependencies) stays bundled exactly as NOTICES N-010–N-013 describe. Proved by `pnpm pack-smoke`: the six tarballs install into a fresh npm project, a consumer file type-checks under `moduleResolution` **Bundler and NodeNext with `skipLibCheck: false`**, Node imports the packed `@pme/engine-core` and runs it, and Vite bundles the consumer (the Chrome run of that bundle on the `worker-raf` path was a one-off prototype check, not part of the script). `pack-smoke` and `docs:api` also run in CI's build job (Task 9), so a PR that breaks the published shape or TypeDoc fails before merge, not at the tag.
4. **Published set:** `@pme/engine-core`, `@pme/renderer`, `@pme/audio`, `@pme/controller`, `@pme/skins`, `@pme/ventilator` lose `"private": true`; `@pme/validation` (dataset harness) and `@pme/demo` stay private. `@pme/skins` gains a built `./validate` entry (its `exports` already names it; the build had only `index`). `"sideEffects": false` on skins and ventilator, and on engine-core the explicit list `["./src/l2/ecg/pacing.ts", "./src/l2/ecg/arrest/vf.ts"]` — the two modules that register `HOOKS.onApply/onP/onBeat` at top level (`pacing.ts:117–119` (116–118 on 48864439), `vf.ts:184`); with a bare `false` they survive in workspace builds only because `rhythm-engine.ts` happens to import `pacerClock`/`vfClock`, and pacing and VF would vanish silently from the IIFE if either import became type-only (8b review finding 10). Measured with `false`: the embed bundle falls from 261 KB to 122 KB because Rollup can then drop the unused VF/AF templates and PK tables; the embed does not import the rhythm engine, so the list form should keep ≈ 122 KB (re-measured in Task 8). The published engine-core `dist/index.js` is one file, so npm consumers are unaffected. Nothing is published to npm by this stage (Q1, ruled: GitHub release only).
5. **The relay is not published in 1.0.0-rc.1.** `pme-relay` is a `.ts` bin run with `--experimental-strip-types`, and Node refuses to strip types under `node_modules`; the published `@pme/controller` therefore gets `"bin": {}` via `publishConfig`, and `ws` moves to `devDependencies` (the relay keeps working in the repo: `pnpm relay`). A built relay bin is a later-release item (`docs/roadmap/`: there is no v1.1 feature release).
6. **The embed lives in this repo, not in `projects/ventilator-simulator`.** BUILD-PLAN Stage 8 asked for "a separate PR in the ventilator-simulator repo"; R35 later forked the ventilator into `packages/ventilator` (+ the demo's Hamilton UI) and ruled that the old project stays as-is. So the embed is `apps/demo/dist/embed/ventilator-monitor.html` + `patient-monitor.iife.js` + `pme-ventilator-embed.iife.js` (40 KB gzip), generated from `vent-hamilton.html` so the markup has one source, linked in-page by `createLocalPortPair()` (the Stage V message set: frames in, lungState out, the engine as master clock). It is attached to the GitHub release as `ventilator-monitor-embed-v1.0.0-rc.1.zip`. No PR into the old project (Q4, RULED 2026-09-27 22:29: no monitor panel for `projects/ventilator-simulator`); BUILD-PLAN Definition of done 9's "the ventilator-sim PR has been handed to Ali" is superseded by R35 and that ruling, and the gate note says so.
7. **Docs derived from the code, checked by tests.** The physiology overview and the known-deviations page are REGENERATED at execution time (R53) from `main`: `scripts/deviations.ts` lists every `it.fails`/`test.fails` (package tests AND the Playwright e2e) and every literal-titled `it.skip`/`test.skip`/`.todo`; `docs-honesty.test.ts` fails when an `it.fails` or skipped title is missing from `docs/guides/known-deviations.md`, when a `.fails(` has a title it cannot read (a variable or a `${…}` template), when a "Tracked in" cell is empty, when a rhythm, drug or condition id (condition ids read from the code and the scenario schema, not a hand-kept list) has no table row with a mode label (`both`, `MODELED only`, `MANUAL only`, `INTERIM`) in the physiology overview, when a line mentions clinical validation, IEC 60601, FDA, CE marking or diagnosis without a negation, or when a `FILL:` marker is left. The guides' JSON examples are validated by `docs-examples.test.ts` against the real schemas.
8. **TypeDoc output is git-ignored** (`docs/api/`, ≈ 8 MB, 612 pages) and attached to the release as `api-reference-v1.0.0-rc.1.zip`; **Q3 RULED: the zip only, no GitHub Pages deploy at this release** (refresh: 663 pages, 9.3 MB on 48864439). TypeDoc runs in the `packages` strategy with per-package entry points so `@pme/controller/scenario` and `@pme/skins/validate` are documented.
9. **Licence audit without a new dependency:** `pnpm licenses list --json` (all) and `--prod` (shipped). Shipped packages must be MIT/ISC/BSD-2/BSD-3/Apache-2.0/0BSD AND be named with their exact version in `NOTICES.md`; build/test tools may also be BlueOak-1.0.0, Python-2.0 or CC0-1.0. Anything else (GPL, LGPL, AGPL, MPL, SSPL, CC-BY-SA, "Unknown") fails CI.
10. **Versions stay literals** (`export const version = '1.0.0-rc.1'` in six packages), guarded by `release-versions.test.ts` (each constant equals its `package.json`; all library packages share one version). `@pme/demo` stays 0.0.0 (private app).
11. **Release mechanics:** the executor opens the PR and stops. After merge the ORCHESTRATOR follows `RELEASE.md` and pushes the annotated tag `v1.0.0-rc.1`; `.github/workflows/release.yml` rebuilds the tagged commit, re-runs typecheck/build/notices/licences/size, the IIFE and embed e2e (Chromium + WebKit, heavy test Chromium-only), `pack-smoke`, TypeDoc, and creates the GitHub release with the IIFE (+ map), the embed zip (which carries `LICENSE`, `NOTICES.md` and `LICENSES/`), the API zip (with `NOTICES.md` and the TypeDoc/lunr licence texts), `LICENSES.zip`, `SHA256SUMS.txt` covering every other asset, `LICENSE`, `NOTICES.md`, and the CHANGELOG section as notes. The workflow checks the tag equals `v` + the renderer's version, and marks the release **pre-release** whenever the version has a `-` suffix (`gh release create --prerelease`; Q8). Nothing is published to npm (Q1).
12. **CITATION.cff names Ali Mahdavi without an e-mail** (no author e-mail appears anywhere in the repo; the brief says to add one only if present). **Q5 RULED: no DOI at the release candidate**; enabling Zenodo and adding `doi:` is a documented follow-up for the 1.0.0 release (`RELEASE.md` "Later: 1.0.0").

**Rulings from the R50 review of this plan** (review 2026-09-27 22:50, APPROVE WITH FIXES; each recorded as "Orchestrator ruling (8b review), 2026-09-27"):

13. **Licence texts travel with every distribution.** Orchestrator ruling (8b review), 2026-09-27. Every distribution — the IIFE, the embed zip, every npm `dist/`, the release assets — carries `LICENSE`, `NOTICES.md` AND the full `LICENSES/` texts: Apache-2.0 for the N-P Pulse-derived rows, BSD-3-Clause for fast-uri, the MIT notices (with copyright lines) of ajv, fast-deep-equal, json-schema-traverse and require-from-string, and lunr's MIT text for the API zip. `check-licences` requires a text for every shipped package and every `LICENSES/…` path NOTICES names (BUILD-PLAN Stage 8 acceptance 6). The brief §10 "licence items for legal review before the v1.0 tag" get their own section in the gate note (Task 14), rows needing a lawyer marked "open, for Ali" (DoD 10: "resolved or listed").
14. **Validation honesty.** Orchestrator ruling (8b review), 2026-09-27. The report on `main` was generated at `7bcf992` ("engine 0.0.0", 16 red rows, before 7c). Task 12 runs `pnpm validate` on the executor's own tree and commits the fresh `docs/validation/report.{md,json}` and `calibration-queue.md` (Q9: YES, in 8b, not in a separate PR). The validation summary names the report's commit and lists any physiology merged after it; the gate note must not present BUILD-PLAN Stage 8 acceptance 1–2 (or DoD 1 and 8) as met.
15. **Version label is Ali's (Q8).** Orchestrator ruling (8b review), 2026-09-27. The orchestrator recommends tagging `1.0.0-rc.1` until Ali's calibration pass and the blind review have run (R53); Ali decides. The plan writes `1.0.0-rc.1` and switches only on an explicit launch instruction (Global Constraints).
16. **Draft PR right after Task 2.** Orchestrator ruling (8b review), 2026-09-27. WebKit is not installed locally, so the self-source worker is first exercised on WebKit by CI: the PR is opened as a draft after Task 2, CI is checked after Tasks 2, 4 and 8, and Task 14 marks it ready. The executor still never merges.
17. **Embed e2e budgets from the sim span.** Orchestrator ruling (8b review), 2026-09-27. Each wait's timeout is the span in sim-seconds at ×1 real time plus 60 s, the heavy test's timeout is 900 s, and the achieved sim/wall ratio is logged; no band changes (R45).
18. **`docs-honesty` closes every gap** of review finding 5 (e2e expected failures — Playwright's `test.fail(title, …)`, the e2e form of `test.fails` —, literal `it.skip`/`.todo`, unparsable `.fails(` titles, empty "Tracked in", MODELED-only labels, condition ids read from the code, a line-based clinical-claim rule). Orchestrator ruling (8b review), 2026-09-27.
19. **The six library manifests are edited by one field-setting script** (`scripts/release-manifests.ts`, Node strip-types, with a unit test), not by six head-of-file find blocks that break on any key a sibling stage adds. Orchestrator ruling (8b review), 2026-09-27.
20. **The worker start guard keys on the worker name `pme-engine`.** Orchestrator ruling (8b review), 2026-09-27.
21. **Open questions:** Q4, Q6 and Q7 are closed as ruled on 2026-09-27 22:29; Q9 is ruled YES; Q1, Q2, Q3, Q5 and the new Q8 stay open for Ali. *(Superseded 2026-10-10: Ali ruled Q1, Q2, Q3, Q5 and Q8 — Decision 23.)* Orchestrator ruling (8b review), 2026-09-27.
22. **Smaller fixes adopted from the review** (findings 8–16): `pack-smoke` (with a Node runtime import) and `docs:api` in CI; `*.wasm` git-ignored and refused by `check-size`; engine-core's `sideEffects` list; the renderer tarball without its orphan worker map; the embed carries its IIFE's source map; `SHA256SUMS.txt` covers every asset; `release-versions.test.ts` also checks `CITATION.cff`; N-014's date is a `FILL:` marker; the screenshot size caps are asserted; the embedding guide's two corrections; public pages cite only files in the repo. `stage1Vocabulary(engineVersion = '0.0.0')` (`packages/controller/src/vocabulary.ts:79`) is left as it is (its default is data asserted by controller fixtures; review marked it optional) and listed in the gate note as a later-release item.

**Refresh 2026-10-10** (owner decisions closing the open questions, and what re-prototyping on 48864439 changed):

23. **Owner decisions (Ali, recorded by the orchestrator, 2026-10-10).** **Q8** = `1.0.0-rc.1` everywhere (tag `v1.0.0-rc.1`, GitHub pre-release flag ON). **Q1** = GitHub release only: no npm publish; the packages stay publishable and `pack-smoke` stays in CI. **Q2** = not applicable (no publish, so the `@pme` scope question does not arise; the CHANGELOG says the npm names are provisional). **Q3** = the API reference is attached as a zip; no GitHub Pages deploy at this release. **Q5** = no DOI at the release candidate; the Zenodo step is a documented follow-up for 1.0.0. The documentation-honesty rule stays binding.
24. **Known limitations the owner wants stated out loud** (CHANGELOG "Known limitations", the release notes, the README's "What it is not", Task 13): during compensated haemorrhage the systemic vascular resistance FALLS instead of rising; there is no decompensation / reflex-collapse model; there is no sepsis model fit for teaching (the `sepsis` condition id exists from Stage 7e but its course is incomplete — e.g. no fever under general anaesthesia, a recorded known miss — and no sepsis scenario ships); pulsus paradoxus is absent unless FU-7.1 lands it (the executor checks `main`: if the optional `fu-7.1-c` merged with its tests green, drop this line and cite the gate note; otherwise keep it); adults only; for education only, not a medical device.
25. **"v1.1" in this plan means "a later release".** `docs/roadmap/README.md` (2026-10-05): there is no v1.1 feature release — 1.x is maintenance only and new features go to v2.0. The relay bin (Q7), the `stage1Vocabulary` default and the other items this plan once called "v1.1" are listed in the gate note as later-release items without promising a version. (Text quoted verbatim from FU-11's appendix keeps its own "v1.1" wording.)
26. **Declarations build with the workspace's types** (refresh finding): the six `tsconfig.build.json` use `"types": ["node", "vite/client"]`, not `["vite/client"]` alone. Since FU-7 engine-core reads `globalThis.process?.env` (the vagal tuning knobs in `src/l2/pk/data/rows-anaesthetic.ts`), and `tsc -p tsconfig.build.json` failed with TS7017 without the node types. No `/// <reference types="node" />` reaches the emitted `.d.ts` (checked: none), and `pack-smoke` (consumer with `types: []`, `skipLibCheck: false`) passes.
27. **The deviations lister reads Playwright's in-body conditional form** `test.fail(condition, 'reason')` (refresh finding: `apps/demo/e2e/stage9-tasks.e2e.ts:74`) and lists its reason as the title; before the fix `docs-honesty` reported that file as "unreadable" with no way to comply short of editing another stage's test.
28. **The `engine.worker.ts` tail block is re-anchored** on the handler's closing `  }\n};` instead of its whole `catch` body: FU-11 (F06) rewrites that `catch` to answer the failing request's `reqId`, and on the simulated freeze tree (48864439 + FU-11 + FU-7.1 + Stage 10 prototype patches) the old anchor was the only one of 43 blocks to miss. The change is the same; FU-11's `catch` body is kept as it is.
29. **Time scale after Stage 10.** Stage 10 raises the engine's `MAX_TIME_SCALE` from 4 to 8 and adds fast-forward. The embed stays at ≤ ×4 (its e2e budgets are set for ×4, and the ventilator's own loop is not part of Stage 10's ×8 proof); the guides quote `MIN_TIME_SCALE`–`MAX_TIME_SCALE` from `@pme/engine-core` instead of a literal "0.25–4" (Tasks 8 and 11).
30. **The CHANGELOG notes extraction stops at the link definitions** (refresh dry run: the `awk` carried the trailing `[Unreleased]: …` / `[1.0.0-rc.1]: …` lines into `NOTES.md`). Task 9's `awk` also ends the section at a line starting with `[`.

## Prototype results

**Re-measured 2026-10-10 on `origin/main` 48864439** (throwaway worktree `scratch/wt-8b-refresh`, detached; the whole plan applied mechanically by the Task 1 Step 3 parser in write mode, then the command steps: `release-manifests.ts 1.0.0-rc.1`, `pnpm install`, `pnpm add -Dw typedoc@0.28.20`, the five licence-text copies, the N-014 fill; system Chrome; Node 26.8; macOS; five other agents running on the machine, so wall times are loaded):

| Item | Result on 48864439 |
|---|---|
| Find blocks (Task 1 Step 3) | **43 find blocks, 0 problems, 0 informational** on 48864439. On the simulated freeze tree (48864439 + FU-11 + FU-7.1 + Stage 10 prototype patches, all three apply cleanly): 1 problem (`engine.worker.ts` `catch` tail, FU-11 F06) → re-anchored (Decision 28) → 0 |
| IIFE on `main` (double engine) | **1,290,519 B raw · 544,134 B gzip -9 (531.4 KiB) · 275,129 B brotli** — over the 400 KB budget |
| IIFE with the plan (Task 2) | **680,626 B raw · 284,562 B gzip -9 (277.9 KiB) · 252,901 B brotli**; `check-size: OK — patient-monitor.iife.js 664.7 KB raw, 277.9 KB gzip -9, 247.0 KB brotli (budget 400.0 KB gzip)`; banner `patient-monitor-engine 1.0.0-rc.1`; ECG hooks kept (2× `onApply.push`, 1× `onBeat.push`). **Within budget; headroom 122 KiB** |
| Renderer unit tests after the worker refactor | 27 files / 90 tests pass; whole-repo typecheck clean |
| `tsc -p tsconfig.build.json` + `finish-dist` | failed on engine-core with `types: ["vite/client"]` (TS7017, `globalThis.process`) → fixed (Decision 26); then 6 × finish-dist: engine-core 144, controller 26, ventilator 13, renderer 12, audio 9, skins 5 rewritten; no node type reference in any `.d.ts`; full `pnpm build` 37 s |
| `pnpm pack-smoke` | **OK** — six `…-1.0.0-rc.1.tgz` (the prerelease tarball names parse); tsc Bundler and NodeNext with `skipLibCheck: false`, the Node import and `vite build` pass; **no tarball carries `dist/assets/`** (the `!dist/assets` negation works — first run); tarballs: engine-core 1.27 MB, renderer 1.55 MB, controller 309 KB, skins 231 KB, ventilator 83 KB, audio 46 KB; 4 min 13 s wall (npm install under load; 19 s user CPU) |
| `check-licences` | before the texts: fails naming exactly the four missing texts (and the four NOTICES paths) — the check bites; after: **`check-licences: OK (89 packages, 5 shipped, every shipped text in LICENSES/; licences Apache-2.0, BSD-2-Clause, BSD-3-Clause, BlueOak-1.0.0, ISC, MIT, Python-2.0)`** (TypeDoc installed); no new runtime dependency since September |
| TypeDoc 0.28.20 (`pnpm docs:api`) | exit 0, **36 warnings** (all "referenced but not included"), 10 module pages (incl. `_pme_controller.scenario`, `_pme_skins.validate`), **663 HTML pages, 9.3 MB**, git-ignored; 38.5 s user CPU, 3 min 30 s wall under load; lunr 2.3.9 |
| Embed build | `pme-ventilator-embed.iife.js` **122,536 B raw / 39,893 B gzip**; `ventilator-monitor.html` 13,525 B; `dist/embed/` carries LICENSE, NOTICES.md, LICENSES/ and both maps |
| Embed from `file://` (Chrome, e2e) | light test 1/1 (15 s; after the rc version literal); heavy test 1/1 in 2.2 min: **`vent-embed {"s0":99,"s20":99,"s120":92,"c0":34,"c180":42,"simPerWall":4.01}`** (EtCO2 rise +8 vs the band's +5: margin 3 mmHg, was 4); JPEGs 57,301 and 56,102 B |
| IIFE smoke (`file://`, Chrome) | 2/2, `worker-raf` |
| Stage's unit tests | check-size 3, finish-dist 1, release-manifests 2, check-licences 4, release-versions 2 (+1 after Task 13), docs-examples 2 pass; docs-honesty fails as designed until Task 12 (FILL markers; 156 ids without an overview row) |
| `scripts/deviations.ts` | **143 expected failures** (142 `it.fails` in package tests + 1 conditional `test.fail` in `stage9-tasks.e2e.ts`, Decision 27) and **1 literal skip** (`lvad.test.ts` 7h) — was 29 + 1 on d455b50: the known-deviations page is ~5× longer than planned; ids: 36 rhythms, **64 drugs** (was 58), 32 lung conditions, 6 skins |
| Release assembly dry run (`GITHUB_REF_NAME=v1.0.0-rc.1`) | 7 SHA-256 lines; embed zip (1.33 MB) and API zip (1.75 MB) carry LICENSE, NOTICES.md and the licence texts; `NOTES.md` had the trailing link definitions → Decision 30; workflows parse (`ci.yml build,test-slow`, `release.yml release`, `validation.yml validate`) |
| Validation report on `main` | still `7bcf992` (🟢 96 · 🟡 27 · 🔴 16), now **238** physiology commits behind; Task 12 Step 0 regenerates it (not re-run in the refresh: 30–60 min, network) |
| Not re-prototyped in the refresh | `pnpm validate` on the release tree; the full e2e suite (shared machine); CI's WebKit run; the FU-11 A1 build-unique engine version and Task 13b (new text, executed first by the executor); the README shots |

**History** (the 2026-09-27 prototype, kept for comparison):

Throwaway worktree on `origin/main` (first `a36f7a5`, then re-applied on **`9f864b3`**, 7e merged), system Chrome 154, Node 26.8 (engines ≥ 22.12), macOS; nothing pushed; the patches are kept as evidence at `<scratchpad>/stage-8b/proto-8b.patch` (prototype on 9f864b3, with the e2e screenshots) and `<scratchpad>/stage-8b/final-applied-7a181b5.patch` (this plan applied mechanically to 7a181b5).

| Item | Result |
|---|---|
| IIFE on `main` (double engine) | 1,129,884 B raw · **485,085 B gzip -9** (over the 400 KB budget) |
| IIFE with the self-source worker + banner (Task 2) | **597,766 B raw · 253,765 B gzip -9 (247.8 KiB) · 222.2 KiB brotli**; `check-size: OK — … 583.8 KB raw, 247.8 KB gzip -9, 222.2 KB brotli (budget 400.0 KB gzip)`; source map exact (`"worker-raf"` → `engine.worker.ts:32`, `'pme-engine'` → `iife-worker.ts:13`) |
| IIFE smoke from `file://` (Chrome) | 2/2 pass; `renderPath` = **`worker-raf`** (asserted: a worker path whenever `transferControlToOffscreen` exists); version `1.0.0-rc.1` after Task 5. WebKit not run locally (no Playwright WebKit on this Mac): CI runs it |
| Renderer unit tests after the worker refactor | 22 files / 70 tests pass (23 / 71 on 9f864b3); whole-repo typecheck clean |
| ESM `dist/` sizes (unminified) | engine-core 612 KB, renderer 602 KB (inline worker), controller 76 KB + scenario 225 KB (ajv), skins 62 KB + validate 189 KB, ventilator 70 KB, audio 23 KB |
| `tsc --emitDeclarationOnly` (6 packages) | 0.8–2.1 s each; 300 `.d.ts` files; 203 rewritten by `finish-dist` (engine-core 139, controller 25, ventilator 13, renderer 12, audio 9, skins 5) |
| `pnpm pack-smoke` | **OK in 15 s** (31 s while the test suite ran in parallel): 6 tarballs; `tsc` Bundler and NodeNext with `skipLibCheck: false` clean; `vite build` clean; the consumer bundle ran in Chrome (`worker-raf`, HR tile drawn, no errors — a manual prototype step, not part of the script); the R50 reviewer added and verified the Node runtime import of the packed `@pme/engine-core` (`createEngine().advanceTo(2)`) |
| `pnpm licenses list` → `check-licences` | **`check-licences: OK (89 packages, 5 shipped; licences Apache-2.0, BSD-2-Clause, BSD-3-Clause, BlueOak-1.0.0, ISC, MIT, Python-2.0)`** — shipped = ajv 8.20.0, fast-deep-equal 3.1.3, json-schema-traverse 1.0.0, require-from-string 2.0.2, fast-uri 3.1.8 (ws 8.21.3 left the set in Task 4), all named in NOTICES; 2.6 s |
| TypeDoc 0.28.20 (`pnpm docs:api`) | **23.8 s** unloaded (a36f7a5; 54.8 s on 9f864b3 with the test suite running in parallel), exit 0, 10 modules (`@pme/controller` index + scenario, `@pme/skins` index + validate, …), 612 → **650** HTML pages (7e added), 8.2 MB, 35 warnings (types referenced but not exported, e.g. `RhythmDef`, `DrugRow`) — informational; `docs/api` stays git-ignored |
| Embed build | `pme-ventilator-embed.iife.js` **122,247 B raw / 39,723 B gzip** (261 KB before `sideEffects: false`); `ventilator-monitor.html` 13.5 KB |
| Embed from `file://` (Chrome, ×4) | no page or console errors; monitor path `worker-raf`; baseline SpO2 96, EtCO2 39, awRR 14, HR 74. **Shunt 0.3 + FiO2 100 % for 90 s → SpO2 98; FiO2 21 % → 98 at +20 s (lag), 95 at +60 s, 92 at +120 s, 91 at +150 s. RR 14 → 6 (FiO2 40 %) → EtCO2 38 → 44 at +15 s, 47 at +180 s, 48 at +240 s; awRR reads 6.** e2e 2/2 pass in 2.3 min |
| Time scale | the engine clamped `timeScale` to 0.25–4 (brief §3.3; Stage 10 raises the maximum to 8, Decision 29): the embed e2e runs at ×4 |
| Full e2e (Chrome, before the embed test existed) | 28 passed, 1 skipped, 2 failed = `stage6a` relay/rtc page-load timeouts under parallel load; **both pass when the file is re-run alone** (pre-existing flake, not 8b) |
| CHANGELOG section extraction (`awk` in release.yml) | extracts exactly the `## [1.0.0-rc.1]` section |
| **This plan applied mechanically** to a clean `main` 9f864b3 (every Find/Create/Overwrite block in task order by the Task 1 Step 3 parser, plus the `pnpm add`/`pnpm install` steps) | 44 find blocks, 0 problems; typecheck clean; build clean (`finish-dist` ×6, `build-embed`); `check-notices` OK (3 governed files), `check-licences` OK (89/5), `check-size` OK (247.8 KB gzip); `pack-smoke` OK; `docs:api` exit 0. Fast tests: audio 58, skins 171, engine-core 1062 passed / 1 skipped (one run had the `truth event … < 0.2 ms per call` timing test fail while TypeDoc and `pack-smoke` ran in parallel — it passes alone; not 8b's), controller 203, renderer 71, ventilator 88, demo 116; validation 104 passed / 7 skipped with `docs-honesty` failing 3/3 **as designed** until Task 12's `FILL:` markers are filled (a simulated fill — rows from `scripts/deviations.ts`, all ids appended — made the it.fails and FILL checks pass and the id check list exactly the ids left out, so the test logic is right). **Full e2e (system Chrome): 33 passed, 1 skipped, 0 failed in 10.3 min**, incl. `vent-embed` (`{"s0":98,"s20":98,"s120":92,"c0":38,"c180":47}`, 2.0 min) and the IIFE smoke. README shots 53,886 and 56,398 B; gate shots 56,562 and 56,099 B. The slow engine set was not re-run (no engine source changes besides the version constant). **Re-checked on `main` 7a181b5** (latest at writing): 44 find blocks, 0 problems; applied: typecheck, build, `check-size`, the stage's release tests (10) and controller's version tests pass |
| **R50 review** (d455b50) and **fixes** (plan fixer, 2026-09-27, on 5b56a5c and 3f9dd01) | Reviewer re-applied the plan: 247.8 KB gzip, IIFE byte-identical to the prototype, `check-licences` OK (69 packages), `pack-smoke` OK plus a Node runtime import, 10/10 release tests, IIFE smoke 2/2, every guide `dispatch` example accepted by the packed engine. The fixer then re-ran the Task 1 Step 3 parser on the FIXED plan: **43 find blocks, 0 problems, 0 package.json informational** (44 − the six manifest blocks + `worker-host.ts` + three NOTICES licence cells + the CITATION case of `release-versions.test.ts`); ran `scripts/release-manifests.ts` on main after Task 2's renderer block: audio, controller, skins, ventilator **byte-identical** to the six removed find blocks, engine-core and renderer differing ONLY by the intended `sideEffects` list and `!dist/assets`; re-running it changed nothing (idempotent); both release-manifests test cases, the three check-size cases, the four check-licences cases pass under a minimal shim; `scripts/deviations.ts` lists 29 expected failures, 1 skip (`lvad.test.ts` 7h), no unreadable title; the docs-honesty logic passed/failed as designed on stub pages (condition ids read from the code incl. endo/lung/profile ids; empty "Tracked in", a claim line and a `FILL:` each caught). **Not prototyped** (first run is the executor's): the `pme-engine` name guard in a real browser, the `!dist/assets` packlist negation, the tarball licence check, finish-dist's `LICENSES/` copy, the embed e2e's span-based waits, `pnpm validate` on the 8b tree, the CI `pack-smoke`/`docs:api` steps |

## Rebase check 2026-10-13 (read-only, against `origin/main` 56f3761f)

What changed on `main` since the refresh (48864439): FU-11 d, FU-7.1 a+b, Stages 10–13, the CI reshape (#55) and the
fixer round. Checked: the Task 1 Step 3 parser on the extracted 56f3761f tree → **43 find blocks; 0 problems; 0
package.json (informational)** before the fixes, and **45; 0; 0** after them (Task 9 now has four `ci.yml` blocks; applied in
scratch they only add lines, `slow-g` still occurs 5×, and the file parses: jobs `build,renderer,e2e,test-slow`); no Create target exists; every library `package.json` and `pnpm-lock.yaml` unchanged since
48864439 (the release-manifests expectations stand; no new runtime dependency). Fixed in this text (search "rebase check
2026-10-13"): the STATUS check in Task 1 Step 2; NOTICES **N-014 → N-015** (N-014 is the QR code generator since Stage 12,
and `check-notices` rejects duplicate IDs); Task 9's CI blocks for the PR #55 shape (sibling builds and the embed in the
`renderer` job, the embed download in `e2e`); the launch-gate list and regex; Playwright WebKit is installed locally;
CI job names in Tasks 2, 14 and `RELEASE.md`; the showcase test set in the full gate; the FU-11 A1 build-id name
(`__PME_ENGINE_BUILD__`, not Stage 13's `__PME_BUILD__`) and its call sites; counts (65 drugs, 151 + 1 deviations, 56
condition ids, views + `debrief`, `follower`, seven `LICENSES/` texts); a known-deviations section for the five CI-only
WebKit skips; CHANGELOG/README text for Stages 10–13 and the owner-pending items; orchestrator items 8–13. Not
re-measured: IIFE size, pack-smoke, TypeDoc, the embed e2e (nothing was built or run).

## File map

| File | Task | What |
|---|---|---|
| `packages/renderer/src/engine.worker.ts` | 2 | worker entry → `startWorker(scope)`, self-start only in a dedicated worker |
| `packages/renderer/src/iife-worker.ts` | 2 | IIFE-only worker constructor from the file's own source |
| `packages/renderer/src/worker-host.ts` | 2 | one line: the ESM worker is named `pme-engine` (the start guard's key) |
| `packages/renderer/vite.config.ts` | 2, 4 | two modes (`es`, `iife`), self-wrap plugin + licence banner, ESM externals |
| `apps/demo/e2e/iife-smoke.e2e.ts` | 2, 5 | worker-path assertion; version 1.0.0-rc.1 |
| `scripts/check-size.ts`, `packages/validation/test/check-size.test.ts` | 3 | 400 KB gzip budget; no `*.wasm` tracked or in a distribution |
| `packages/*/tsconfig.build.json` (6), `scripts/finish-dist.ts`, `packages/validation/test/finish-dist.test.ts` | 4 | declarations, specifier rewrite, LICENSE/NOTICES/LICENSES into dist |
| `scripts/release-manifests.ts`, `packages/validation/test/release-manifests.test.ts` | 4 | sets the publish fields of the six library manifests, keeping every other key |
| `packages/{engine-core,renderer,audio,controller,skins,ventilator}/package.json` (by the script), `…/vite.config.ts` | 4 | publish metadata, `publishConfig`, externals, skins `validate` entry, controller `bin`/`ws` |
| `scripts/pack-smoke.mjs` | 4 | pack → install → licence files in every tarball → tsc ×2 → Node import → vite build |
| six `version` constants + six `version.test.ts`, `packages/validation/package.json`, `packages/validation/test/release-versions.test.ts` | 5 | 1.0.0-rc.1 |
| `scripts/check-licences.ts`, `packages/validation/test/check-licences.test.ts`, `LICENSES/{ajv,fast-deep-equal,json-schema-traverse,require-from-string}-<v>.txt`, `NOTICES.md` (N-010–N-013 licence cells) | 6 | licence audit; every shipped package's text in `LICENSES/` |
| `typedoc.json`, `packages/*/typedoc.json` (6), `.gitignore` (`docs/api/`, `*.wasm`), `NOTICES.md` (N-015), `LICENSES/lunr-<v>.txt` | 7 | API reference |
| `apps/demo/src/vent/embed.ts`, `apps/demo/vite.embed.config.ts`, `apps/demo/scripts/build-embed.mjs`, `apps/demo/package.json`, `apps/demo/tsconfig.json`, `apps/demo/e2e/vent-embed.e2e.ts` | 8 | file:// ventilator + monitor |
| `.github/workflows/ci.yml`, `.github/workflows/release.yml` | 9 | checks + release |
| `README.md`, `apps/demo/scripts/readme-shots.mjs`, `docs/images/*.jpg`, `CITATION.cff`, `CONTRIBUTING.md`, `SECURITY.md`, `.github/ISSUE_TEMPLATE/*` | 10 | repo hygiene |
| `docs/guides/{embedding,scenario-authoring,skin-authoring}.md`, `packages/validation/test/docs-examples.test.ts` | 11 | guides |
| `docs/validation/{report.md,report.json,calibration-queue.md}` (regenerated by `pnpm validate`, never hand-edited) | 12 | the validation report of the release tree (Q9) |
| `docs/guides/{physiology-overview,validation-summary,known-deviations}.md`, `scripts/deviations.ts`, `packages/validation/test/docs-honesty.test.ts` | 12 | derived docs |
| `CHANGELOG.md`, `RELEASE.md`, `packages/validation/test/release-versions.test.ts` (CITATION checks) | 13 | release notes and checklist |
| `docs/gates/stage-8b.md`, `docs/gates/stage-8b/*.jpg` | 8, 14 | gate evidence, incl. the brief §10 legal-review section |

**Block conventions.** `**Find** in \`path\`:` + fence, then `**Replace with:**` + fence: the find text (between the fences, without the final newline) must occur **exactly once** in the file as it is after the previous tasks' edits (Task 1 Step 3 checks all of them mechanically; a miss in a `package.json` is reported as informational, see Global Constraints). `**Create** \`path\`:` + fence: a new file whose content is the fence body plus a final newline. `**Overwrite** \`path\`:` + fence: replace an existing file entirely (used only for `README.md`).

---

## Tasks
### Task 1: Launch gate, worktree, branch, baseline, find-block check

**Files:** none changed (the plan copy is committed).

- [ ] **Step 1: Launch gate (R53).** All three must be merged; stop and report if any is not:

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin
gh pr list --state merged --limit 100 --json number,title,headRefName,mergedAt \
  --jq '.[] | select(.headRefName | test("^(fu-3|fu-4|stage-v1|fu-11|fu-7\\.1|stage-1[0-3]$|fix-ci-webkit-3|fix-fx)")) | "\(.number) \(.headRefName) \(.mergedAt) \(.title)"'
gh pr list --state open --json number,headRefName --jq '.[] | select(.headRefName | test("^(fu-11|fu-7\\.1|stage-1[0-3]$|fix-fx)")) | "OPEN \(.number) \(.headRefName)"'
git ls-tree --name-only origin/main docs/gates/ | grep -iE 'fu-3|fu-4|v1|fu-11|fu-7\.1|stage-1[0-3]|ci-webkit-3'
```

Expected: merged PRs for FU-3 (#23 `fu-3-followups`), FU-4 (#25 `fu-4-integration-polish`), V.1 (#26 `stage-v1-ventilator-followup`) — already on 48864439 — **and** for `fu-11-a`, `fu-11-b`, `fu-11-c`, `fu-11-d`, `fu-7.1-a`, `fu-7.1-b` (and `fu-7.1-c` if it was started), the Stage 10 branch, and (rebase check 2026-10-13, all merged on 56f3761f) `stage-11` #48, `stage-12` #57, `stage-13` #60, `fix-ci-webkit-3` #55 and the FX branches `fix-fx1-vent-restore` #58, `fix-fx2-follower-queue` #61, `fix-fx4-alarm-pause` #59 (FX-7 was `fix-choose-scenario-repaint` #56), each stage with its gate note on `main` (`stage-10.md`, `stage-11.md`, `stage-12.md` + `stage-12-real-phone.md`, `stage-13.md`, `fu-11-d.md`, `ci-webkit-3.md`); no `OPEN` line for any of them; plus whatever other stage the orchestrator's launch message lists as merged before the freeze (Mon 2026-10-19). If a branch name differs, identify the PR by title; if any is unmerged, STOP and report (this stage starts only after the freeze, on the integrated tree).

Then record (does not block; the result goes in the gate note) which physiology the committed validation report predates:

```bash
R=$(git show origin/main:docs/validation/report.md | sed -n 's/.*on commit `\([0-9a-f]*\)`.*/\1/p' | head -1)
echo "report commit: $R"; git show origin/main:docs/validation/report.md | grep -m1 '^\*\*Summary:\*\*'
git log --oneline "$R"..origin/main -- packages/engine-core/src packages/engine-core/data packages/ventilator/src
```

Expected on the day of writing (checked on `d455b50`): report commit `7bcf992` ("engine 0.0.0", 🟢 96 · 🟡 27 · 🔴 16), followed by 77 physiology commits (7c, 7d, 7e and later; FU-3, FU-4 and V.1 add more). Refresh 2026-10-10 on 48864439: the same report commit, now followed by **238** physiology commits; FU-11, FU-7.1 and Stage 10 add more. Task 12 Step 0 regenerates the report on this stage's tree (orchestrator ruling Q9).

- [ ] **Step 2: Worktree and branch.**

```bash
git worktree add ../scratch/wt-stage-8b -b stage-8b-release origin/main
cd ../scratch/wt-stage-8b
mkdir -p docs/plans && cp ../../repo/docs/plans/stage-8b-release.md docs/plans/stage-8b-release.md   # the REBASE-CHECKED plan (STATUS line starts "REBASE-CHECKED 2026-10-13" or a later check); ../plans-backup/stage-8b-release.md is the OLDER 2026-10-10 text and is EXPECTED to differ (rebase check 2026-10-13) — stop and ask the orchestrator only if the STATUS line is neither REBASE-CHECKED nor a later ruling's (stage-8b-release.2026-09-27.md and plans-backup/stage-8b-release.md are stale copies: never use them)
npx -y pnpm@9.15.9 install --frozen-lockfile
```

- [ ] **Step 3: Verify every find block of this plan against the tree (sequential, in memory, nothing written).** Save the script below as `<scratchpad>/stage-8b-release/check-blocks.py` with your file-writing tool (never a heredoc: no command may read standard input), then run `python3 <scratchpad>/stage-8b-release/check-blocks.py docs/plans/stage-8b-release.md` from the worktree root.

```python
import re, sys, os
plan = open(sys.argv[1]).read().split('\n')
files, bad, info, n, i = {}, [], [], 0, 0
def load(p):
    if p not in files: files[p] = open(p).read() if os.path.exists(p) else None
    return files[p]
def block(i):
    while plan[i].strip() == '': i += 1
    m = re.match(r'^(`{3,})\w*$', plan[i]); assert m, f'no fence at line {i+1}'
    j = i + 1
    while plan[j] != m.group(1): j += 1
    return '\n'.join(plan[i+1:j]), j + 1
while i < len(plan):
    m = re.match(r'^\*\*(Find|Create|Overwrite)\*\* (?:in )?`([^`]+)`:\s*$', plan[i])
    if not m: i += 1; continue
    kind, path = m.groups(); body, i = block(i + 1)
    if kind == 'Find':
        while plan[i].strip() == '': i += 1
        assert plan[i].startswith('**Replace with:**'), f'line {i+1}'
        repl, i = block(i + 1); n += 1
        text = load(path); c = 0 if text is None else text.count(body)
        if c != 1: (info if path.endswith('package.json') else bad).append(f'{path}: found {c}x: {body.splitlines()[0][:90]!r}')
        elif text is not None: files[path] = text.replace(body, repl)
    elif kind == 'Create':
        if load(path) is not None: bad.append(f'{path}: exists (Create)')
        files[path] = body + '\n'
    else:
        if load(path) is None: bad.append(f'{path}: missing (Overwrite)')
        files[path] = body + '\n'
print(f'{n} find blocks; {len(bad)} problems; {len(info)} package.json (informational)'); print('\n'.join(bad + ['info: ' + x for x in info]))
```

Expected (plan written on `main` 9f864b3, fixed on d455b50, refreshed on 48864439 and on the simulated freeze tree, rebase-checked on 56f3761f): `45 find blocks; 0 problems; 0 package.json (informational)` (43 until the rebase check added two `ci.yml` blocks to Task 9). Any problem: re-anchor that block on its neighbouring comment, apply the same change, and list it in the gate note. An informational `package.json` line: the anchor is a single script line — apply the same one-line change on the line as it now reads (never retype sibling keys) and list it in the gate note. The six library manifests are not blocks: `scripts/release-manifests.ts` (Task 4 Step 4) sets their fields. Command-driven edits (`pnpm add`, `pnpm install`, the manifest script) are not blocks and are re-run as written.

- [ ] **Step 3b: Final block re-check after the freeze** (refresh 2026-10-10; binding). The refresh checked the blocks on 48864439 and on a SIMULATED freeze tree (48864439 + the FU-11, FU-7.1 and Stage 10 prototype patches), not on the real merged branches — executors and their gate fixes change files after a prototype. So, as the last act before the Step 5 commit: `git fetch origin && git merge --no-edit origin/main` (nothing should move after the freeze; if something did, say what in the gate note), re-run Step 3 on the merged tree, and re-run the launch gate (Step 1's first command). Expected: `45 find blocks; 0 problems`, every launch-gate branch merged. Files the sibling stages are known to touch near this plan's anchors (watch these first if a block misses): `packages/renderer/src/engine.worker.ts` (FU-11 F06 rewrites the `catch`, Stage 10 adds an `advance` case — the blocks anchor around both), `packages/engine-core/vite.config.ts` (the SLOW list; FU-7.1-a), `packages/renderer/src/index.ts` and `packages/controller/src/index.ts` (export lines), `NOTICES.md`, `apps/demo/e2e/iife-smoke.e2e.ts`. A block that misses is re-anchored by the Step 3 rule and listed in the gate note. Also re-run `node --experimental-strip-types scripts/deviations.ts` after Task 12 exists only if `main` moved (Task 14 Step 1).

- [ ] **Step 4: Baseline.** `npx -y pnpm@9.15.9 build`, then record the IIFE on `main`:

```bash
node -e 'const z=require("zlib"),b=require("fs").readFileSync("packages/renderer/dist/patient-monitor.iife.js");console.log("main IIFE raw",b.length,"gzip-9",z.gzipSync(b,{level:9}).length)'
```

Expected ≈ 1.3 MB raw / ≈ 545 KB gzip (refresh on 48864439: 1,290,519 / 544,134; prototype on 9f864b3: 1,129,884 / 485,085; FU-11, FU-7.1 and Stage 10 add a little). Record it for the gate note.

- [ ] **Step 5: Commit the plan and push.**

```bash
git add docs/plans/stage-8b-release.md
git commit -m "docs: Stage 8b plan (1.0.0-rc.1 release candidate, docs, IIFE embed)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push -u origin stage-8b-release
```

---

### Task 2: The IIFE ships the engine once (worker = its own source), with a licence banner

**Files:**
- Modify: `packages/renderer/src/engine.worker.ts`, `packages/renderer/src/worker-host.ts` (one line), `packages/renderer/vite.config.ts`, `packages/renderer/package.json` (build script), `apps/demo/e2e/iife-smoke.e2e.ts`
- Create: `packages/renderer/src/iife-worker.ts`

- [ ] **Step 1: Make the smoke test demand a worker path** (it fails today only if the self-worker is broken; it is the regression guard for Step 3).

**Find** in `apps/demo/e2e/iife-smoke.e2e.ts`:
```ts
  expect(['worker-raf', 'worker-pump', 'main']).toContain(path);
```
**Replace with:**
```ts
  // Stage 8b: the IIFE's worker is its own source text (src/iife-worker.ts). Where OffscreenCanvas transfer exists the
  // monitor must run in that worker; a silent fall-back to the main thread would hide a broken self-worker.
  const offscreen = await page.evaluate(() => 'transferControlToOffscreen' in HTMLCanvasElement.prototype);
  expect(offscreen ? ['worker-raf', 'worker-pump'] : ['main']).toContain(path);
```

- [ ] **Step 2: The worker entry starts itself only inside our own worker (named `pme-engine`).**

**Find** in `packages/renderer/src/engine.worker.ts`:
```ts
// requestAnimationFrame when it exists, otherwise waits for 'frame' messages from the main thread.
```
**Replace with:**
```ts
// requestAnimationFrame when it exists, otherwise waits for 'frame' messages from the main thread.
// Stage 8b: the file starts itself only inside the worker we create, named 'pme-engine' (the ESM build's
// `?worker&inline` bundle via worker-host.ts, or the IIFE re-running its own source as the worker,
// src/iife-worker.ts). Imported anywhere else — the page, or a host's OWN worker that importScripts the IIFE for a
// headless createEngine — it is inert and never touches that scope's onmessage.
```

**Find** in `packages/renderer/src/engine.worker.ts`:
```ts
const scope = self as unknown as WorkerScope;
```
**Replace with:**
```ts
let scope: WorkerScope; // set by startWorker() (Stage 8b)
```

**Find** in `packages/renderer/src/engine.worker.ts`:
```ts
scope.onmessage = (ev) => {
```
**Replace with:**
```ts
function onMessage(ev: MessageEvent<ToWorker>): void {
```

The handler's closing lines (refresh 2026-10-10: anchored on the closing `  }` / `};` only — FU-11 F06 rewrites the `catch` body above it, which stays exactly as it is on your base; the file has one `  }\n};`):

**Find** in `packages/renderer/src/engine.worker.ts`:
```ts
  }
};
```
**Replace with:**
```ts
  }
}

/** Serve one monitor from this worker scope (Stage 8b). */
export function startWorker(s: WorkerScope): void {
  scope = s;
  scope.onmessage = onMessage;
}

if (typeof document === 'undefined' && (globalThis as { name?: unknown }).name === 'pme-engine') {
  startWorker(globalThis as unknown as WorkerScope);
}
```

(`globalThis`, not `self`: Node has no `self`, and the renderer's unit tests import this file. In a worker `globalThis.name` is the name passed to `new Worker(…, { name })`.)

**Find** in `packages/renderer/src/worker-host.ts`:
```ts
  const worker = new EngineWorker();
```
**Replace with:**
```ts
  const worker = new EngineWorker({ name: 'pme-engine' }); // Stage 8b: engine.worker.ts starts only under this name
```

(Vite's inline-worker wrapper forwards `options.name` to `new Worker`; the IIFE's `iife-worker.ts` ignores the argument and uses the same name.)

**Create** `packages/renderer/src/iife-worker.ts`:
```ts
// IIFE build only (`vite build --mode iife` aliases './engine.worker.ts?worker&inline' to this file). The ESM
// build inlines a second, separate copy of the engine for the worker; the single-file IIFE instead starts its
// worker from ITS OWN source text (the `__pmeSelf` wrapper that vite.config.ts adds after minification), so the
// engine ships once. Inside that worker, engine.worker.ts sees a worker scope and calls startWorker().
import './engine.worker.ts';

declare const __pmeSelf: () => void;

export default class EngineWorker {
  constructor() {
    const url = URL.createObjectURL(new Blob([`(${String(__pmeSelf)})();`], { type: 'text/javascript' }));
    try {
      return new Worker(url, { name: 'pme-engine' });
    } finally {
      URL.revokeObjectURL(url); // what Vite's own inline worker does: the worker has already been created
    }
  }
}
```

- [ ] **Step 3: Two build modes, the self-wrap plugin and the banner.**

**Find** in `packages/renderer/vite.config.ts`:
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'PatientMonitor', // IIFE global: window.PatientMonitor (brief §7.6)
      formats: ['es', 'iife'],
      fileName: (format) => (format === 'iife' ? 'patient-monitor.iife.js' : 'index.js'),
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  // The renderer tests drive a real engine through the sweep (5–8 s budgets); on the loaded CI runner the 5 s default
  // timed out once per run since Stage 7 raised the per-tick cost (G8a CI). Same budget as engine-core.
  test: { testTimeout: 30_000 },
});
```
**Replace with:**
```ts
/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

// Two builds (package.json "build"): the default mode emits the ESM entry dist/index.js (Vite inlines the worker);
// `--mode iife` emits the single-file dist/patient-monitor.iife.js (global PatientMonitor, brief §7.6). Stage 8b: the
// IIFE's worker is the file's OWN source (src/iife-worker.ts), so the engine ships once (544 → 285 KB gzip on 48864439).
const { version } = JSON.parse(readFileSync(resolve(import.meta.dirname, 'package.json'), 'utf8')) as { version: string };
const BANNER =
  `/*! patient-monitor-engine ${version} (@pme/renderer IIFE) | MIT, (c) Ali Mahdavi and contributors | ` +
  'https://github.com/samhv-dev/patient-monitor-engine | bundles ODC-By 1.0 ECG templates (PhysioNet CUDB, MIT-BIH) ' +
  'and code derived from Apache-2.0 sources: see NOTICES.md */';

// After minification, wrap the IIFE in a named function whose source text is the whole file (iife-worker.ts starts
// the worker from `(${__pmeSelf})()`). Banner and wrapper take one line each, so the source map gains two empty
// leading lines, and the sourceMappingURL comment stays last.
const selfWrap: Plugin = {
  name: 'pme-iife-self-wrap',
  generateBundle(_o, bundle) {
    for (const c of Object.values(bundle)) {
      if (c.type !== 'chunk' || !c.fileName.endsWith('.iife.js')) continue;
      const url = /\n\/\/# sourceMappingURL=[^\n]*\n?$/.exec(c.code)?.[0] ?? '';
      c.code = `${BANNER}\n(function __pmeSelf(){\n${c.code.slice(0, c.code.length - url.length)}\nself.PatientMonitor=PatientMonitor;})();${url}`;
      const map = bundle[`${c.fileName}.map`];
      if (map?.type === 'asset' && typeof map.source === 'string') {
        const m = JSON.parse(map.source) as { mappings: string };
        map.source = JSON.stringify({ ...m, mappings: `;;${m.mappings}` });
      }
    }
  },
};

export default defineConfig(({ mode }) => {
  const iife = mode === 'iife';
  return {
    resolve: iife
      ? { alias: [{ find: /^\.\/engine\.worker\.ts\?worker&inline$/, replacement: resolve(import.meta.dirname, 'src/iife-worker.ts') }] }
      : {},
    plugins: iife ? [selfWrap] : [],
    build: {
      lib: {
        entry: 'src/index.ts',
        name: 'PatientMonitor', // IIFE global: window.PatientMonitor (brief §7.6)
        formats: iife ? ['iife'] : ['es'],
        fileName: () => (iife ? 'patient-monitor.iife.js' : 'index.js'),
      },
      outDir: 'dist',
      emptyOutDir: !iife, // the IIFE pass runs second and keeps the ESM output
      sourcemap: true,
      // ESM: sibling @pme packages stay imports (one copy each in a consumer's bundle); the IIFE bundles everything.
      rollupOptions: iife ? {} : { external: [/^@pme\//] },
    },
    // The renderer tests drive a real engine through the sweep (5–8 s budgets); on the loaded CI runner the 5 s default
    // timed out once per run since Stage 7 raised the per-tick cost (G8a CI). Same budget as engine-core.
    test: { testTimeout: 30_000 },
  };
});
```

**Find** in `packages/renderer/package.json`:
```json
    "build": "vite build"
```
**Replace with:**
```json
    "build": "vite build && vite build --mode iife"
```

- [ ] **Step 4: Build, test, measure.**

```bash
npx -y pnpm@9.15.9 --filter @pme/renderer build
head -c 200 packages/renderer/dist/patient-monitor.iife.js; echo
npx -y pnpm@9.15.9 --filter @pme/renderer exec tsc -p tsconfig.json
npx -y pnpm@9.15.9 --filter @pme/renderer test
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/iife-smoke.e2e.ts
node -e 'const z=require("zlib"),b=require("fs").readFileSync("packages/renderer/dist/patient-monitor.iife.js");console.log("raw",b.length,"gzip-9",z.gzipSync(b,{level:9}).length)'
```

Expected: the file starts with the `/*! patient-monitor-engine 0.0.0 (@pme/renderer IIFE) | MIT …` banner line, then `(function __pmeSelf(){`; typecheck clean; renderer tests pass (27 files / 90 tests on 48864439; 32 test files on 56f3761f — the rebase check counted files, not tests; 22 / 70 in the 9f864b3 prototype); smoke 2/2 with `worker-raf`; **≈ 681 KB raw / ≈ 285 KB gzip** (refresh on 48864439 with the banner: 680,626 / 284,562; prototype on 9f864b3: 597,766 / 253,765; FU-11, FU-7.1 and Stage 10 add a little). The source map is exact: in the prototype, `"worker-raf"` in the IIFE mapped back to `src/engine.worker.ts` line 32 and `'pme-engine'` to `src/iife-worker.ts` line 13 (check with `source-map-js`, as in the prototype, if you touch the plugin). The name guard and the `worker-host.ts` line came from the R50 review after the prototype (the reviewer re-checked the mechanism, not a full run): if the smoke reports `main` where OffscreenCanvas exists, or the renderer tests fail, the name is not reaching the worker — stop and report rather than loosening the guard. The ESM worker path (named by `worker-host.ts`) is exercised by the vent-link e2e in Task 4 Step 7.

- [ ] **Step 5: Commit and push.**

```bash
git add packages/renderer/src/engine.worker.ts packages/renderer/src/worker-host.ts packages/renderer/src/iife-worker.ts packages/renderer/vite.config.ts packages/renderer/package.json apps/demo/e2e/iife-smoke.e2e.ts docs/plans/stage-8b-release.md
git commit -m "build(renderer): single-engine IIFE — the worker runs the file's own source; licence banner (544 → 285 KB gzip)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-8b-release
gh pr create --draft --base main --head stage-8b-release --title "Stage 8b: 1.0.0-rc.1 release candidate, docs and IIFE embed" \
  --body "WIP — gate note follows (Task 14). Opened as a draft so CI's WebKit runs the self-source IIFE worker from Task 2 on.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

The draft PR exists so that every later push runs CI (since PR #55: jobs `build`, `renderer`, `e2e (chromium)`, `e2e (webkit)`, `test-slow` ×8; the WebKit e2e runs in its own job on a slow 2-vCPU runner — run the stage's two e2e files locally with `--project=webkit` first, Global Constraints). After this push, and again after the pushes of Tasks 4 and 8, check it with a bounded wait: poll `gh pr checks <n>` about once a minute for at most 10 minutes per wait (no `timeout` on macOS; do not use `--watch`, which does not return on its own), then re-check the run's status and wait again if it is still running. A WebKit-only failure of the IIFE smoke is fixed now, in Task 2, not at the end. Never merge the PR, draft or not.

---

### Task 3: IIFE size budget (`pnpm check-size`)

**Files:** Create `scripts/check-size.ts`, `packages/validation/test/check-size.test.ts`; Modify root `package.json`.

- [ ] **Step 1: Write the failing test.**

**Create** `packages/validation/test/check-size.test.ts`:
```ts
// Stage 8b: the IIFE size budget script (BUILD-PLAN Stage 8 acceptance 4), tested here like check-notices, and its
// guard that no `.wasm` (the local Pulse build, NOTICES N-062/N-084) is committed or lands in a distribution.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkSize, findWasm, GZIP_BUDGET_BYTES, measure } from '../../../scripts/check-size.ts';

describe('scripts/check-size', () => {
  it('measures raw, gzip -9 and brotli sizes', () => {
    const r = measure(new TextEncoder().encode('x'.repeat(10_000)));
    expect(r.raw).toBe(10_000);
    expect(r.gzip).toBeLessThan(200);
    expect(r.brotli).toBeLessThan(200);
  });
  it('enforces 400 KB gzipped', () => {
    expect(GZIP_BUDGET_BYTES).toBe(400 * 1024);
    expect(checkSize({ raw: 1, gzip: GZIP_BUDGET_BYTES, brotli: 1 })).toEqual([]);
    expect(checkSize({ raw: 1, gzip: GZIP_BUDGET_BYTES + 1, brotli: 1 })).toEqual(['patient-monitor.iife.js is 400.0 KB gzipped, over the 400 KB budget']);
  });
  it('finds .wasm files that are tracked or inside a distribution folder, and nothing else', () => {
    const root = mkdtempSync(join(tmpdir(), 'pme-wasm-'));
    try {
      for (const d of ['packages/renderer/dist/assets', 'packages/engine-core/src', 'apps/demo/dist/embed']) mkdirSync(join(root, d), { recursive: true });
      writeFileSync(join(root, 'packages/renderer/dist/assets/a.wasm'), '');
      writeFileSync(join(root, 'apps/demo/dist/embed/b.wasm'), '');
      writeFileSync(join(root, 'packages/engine-core/src/local.wasm'), ''); // untracked, not distributed: not reported
      expect(findWasm(root, ['research/pulse.wasm', 'README.md'])).toEqual([
        'apps/demo/dist/embed/b.wasm',
        'packages/renderer/dist/assets/a.wasm',
        'research/pulse.wasm',
      ]);
      expect(findWasm(root, [])).toHaveLength(2);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
```

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/check-size.test.ts` — Expected: FAIL (cannot find `scripts/check-size.ts`).

- [ ] **Step 2: The script.**

**Create** `scripts/check-size.ts`:
```ts
// IIFE size budget (BUILD-PLAN Stage 8 acceptance 4: "the IIFE is ≤ 400 KB gzipped including templates" [ENG]).
// Measures packages/renderer/dist/patient-monitor.iife.js (build first) at gzip level 9 and fails above the budget.
// Also fails when a `.wasm` file is tracked by git or sits in a distribution folder (packages/*/dist,
// apps/demo/dist/embed): the Pulse wasm is never committed or distributed (NOTICES N-062, N-084).
// Usage: pnpm check-size            (exit 1 over budget, on a .wasm, or when the file is missing)
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';

export const IIFE_PATH = 'packages/renderer/dist/patient-monitor.iife.js';
/** 400 KB = 400 × 1024 bytes, gzip -9. */
export const GZIP_BUDGET_BYTES = 400 * 1024;

export interface SizeReport {
  raw: number;
  gzip: number;
  brotli: number;
}

export function measure(bytes: Uint8Array): SizeReport {
  return { raw: bytes.length, gzip: gzipSync(bytes, { level: 9 }).length, brotli: brotliCompressSync(bytes).length };
}

/** Problems for a size report; empty = within budget. */
export function checkSize(r: SizeReport, budget = GZIP_BUDGET_BYTES): string[] {
  return r.gzip > budget ? [`patient-monitor.iife.js is ${(r.gzip / 1024).toFixed(1)} KB gzipped, over the ${(budget / 1024).toFixed(0)} KB budget`] : [];
}

/** `.wasm` files among the git-tracked paths or under a distribution folder of `root` (repo-relative, sorted). */
export function findWasm(root: string, tracked: string[]): string[] {
  const walk = (d: string): string[] =>
    existsSync(join(root, d)) ? readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)])) : [];
  const pkgs = existsSync(join(root, 'packages')) ? readdirSync(join(root, 'packages')) : [];
  const dist = [...pkgs.map((p) => join('packages', p, 'dist')), join('apps', 'demo', 'dist', 'embed')].flatMap(walk);
  return [...new Set([...tracked, ...dist])].filter((f) => f.endsWith('.wasm')).sort();
}

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(import.meta.filename);
if (invokedDirectly) {
  const root = resolve(import.meta.dirname, '..');
  const tracked = execFileSync('git', ['ls-files', '*.wasm'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
  const wasm = findWasm(root, tracked);
  for (const w of wasm) console.error(`check-size: ${w} — no .wasm may be committed or distributed (NOTICES N-062, N-084)`);
  const file = resolve(root, IIFE_PATH);
  if (!existsSync(file)) {
    console.error(`check-size: ${IIFE_PATH} is missing (run pnpm build first)`);
    process.exit(1);
  }
  const r = measure(readFileSync(file));
  const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;
  const problems = checkSize(r);
  for (const p of problems) console.error(`check-size: ${p}`);
  if (wasm.length > 0) process.exit(1);
  if (problems.length > 0) process.exit(1);
  console.log(`check-size: OK — patient-monitor.iife.js ${kb(r.raw)} raw, ${kb(r.gzip)} gzip -9, ${kb(r.brotli)} brotli (budget ${kb(GZIP_BUDGET_BYTES)} gzip)`);
}
```

**Find** in `package.json`:
```json
    "check-notices": "node --experimental-strip-types scripts/check-notices.ts",
```
**Replace with:**
```json
    "check-notices": "node --experimental-strip-types scripts/check-notices.ts",
    "check-size": "node --experimental-strip-types scripts/check-size.ts",
```

- [ ] **Step 3: Run.** `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/check-size.test.ts` → PASS (3 tests; the `.wasm` case came from the R50 review and was not prototyped). `npx -y pnpm@9.15.9 check-size` → `check-size: OK — patient-monitor.iife.js 664.7 KB raw, 277.9 KB gzip -9, 247.0 KB brotli (budget 400.0 KB gzip)` (refresh on 48864439; 583.8 / 247.8 / 222.2 in the 9f864b3 prototype; yours differs by what FU-11, FU-7.1 and Stage 10 added). The `.wasm` case was first run in the refresh: 3/3 pass. The CI step is added in Task 9.

- [ ] **Step 4: Commit and push.**

```bash
git add scripts/check-size.ts packages/validation/test/check-size.test.ts package.json docs/plans/stage-8b-release.md
git commit -m "build: pnpm check-size — patient-monitor.iife.js ≤ 400 KB gzipped (BUILD-PLAN Stage 8 acceptance 4)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-8b-release
```

---

### Task 4: ESM packaging — declarations, `publishConfig`, externals, `pack-smoke`

**Files:**
- Create: `scripts/finish-dist.ts`, `packages/validation/test/finish-dist.test.ts`, `packages/{engine-core,renderer,audio,controller,skins,ventilator}/tsconfig.build.json`, `scripts/release-manifests.ts`, `packages/validation/test/release-manifests.test.ts`, `scripts/pack-smoke.mjs`
- Modify: the six `package.json` (by `scripts/release-manifests.ts`), five `vite.config.ts` (renderer's was done in Task 2), root `package.json`, `pnpm-lock.yaml` (by `pnpm install`)

- [ ] **Step 1: Failing test for the declaration rewrite.**

**Create** `packages/validation/test/finish-dist.test.ts`:
```ts
// Stage 8b: scripts/finish-dist.ts rewrites relative `.ts` specifiers in emitted declarations (tsc keeps them).
import { describe, expect, it } from 'vitest';
import { rewriteDts } from '../../../scripts/finish-dist.ts';

describe('scripts/finish-dist rewriteDts', () => {
  it('rewrites relative .ts specifiers to .js and leaves package and JSON specifiers alone', () => {
    const src = [
      "export * from './calibration.ts';",
      "export { a, type B } from '../l2/x.ts';",
      'import type { C } from "./c.ts";',
      "export type D = import('./d.ts').D;",
      "import { createEngine } from '@pme/engine-core';",
      "import data from './data.json';",
    ].join('\n');
    expect(rewriteDts(src)).toBe([
      "export * from './calibration.js';",
      "export { a, type B } from '../l2/x.js';",
      'import type { C } from "./c.js";',
      "export type D = import('./d.js').D;",
      "import { createEngine } from '@pme/engine-core';",
      "import data from './data.json';",
    ].join('\n'));
  });
});
```

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/finish-dist.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 2: The finishing script.**

**Create** `scripts/finish-dist.ts`:
```ts
// Finishes a package's dist/ for publishing (run by each library package's "build" after vite and tsc):
// (1) declaration files keep the source's `.ts` import specifiers (tsc 5.9 does not rewrite them in .d.ts), so
//     rewrite relative `./x.ts` specifiers to `./x.js`, which every TypeScript resolution mode maps to x.d.ts;
// (2) copy the MIT LICENSE, NOTICES.md and the whole LICENSES/ directory into dist/, so every published copy
//     carries the licence, the attributions its bundled data needs (ODC-By templates, Apache-2.0-derived files)
//     and the full third-party texts (Apache-2.0; ajv's MIT family; fast-uri's BSD-3-Clause).
// Usage (from a package directory): node --experimental-strip-types ../../scripts/finish-dist.ts
import { copyFileSync, cpSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SPEC_RE = /(from\s+|import\s*\(\s*|import\s+)(['"])(\.{1,2}\/[^'"]+?)\.ts\2/g;

/** Rewrites relative `.ts` specifiers in one declaration file's text. */
export function rewriteDts(text: string): string {
  return text.replace(SPEC_RE, (_m, pre: string, q: string, path: string) => `${pre}${q}${path}.js${q}`);
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(import.meta.filename);
if (invokedDirectly) {
  const pkg = resolve(process.argv[2] ?? '.');
  const root = resolve(import.meta.dirname, '..');
  let n = 0;
  for (const f of walk(join(pkg, 'dist', 'types')).filter((f) => f.endsWith('.d.ts'))) {
    const before = readFileSync(f, 'utf8');
    const after = rewriteDts(before);
    if (after !== before) {
      writeFileSync(f, after);
      n++;
    }
  }
  for (const f of ['LICENSE', 'NOTICES.md']) copyFileSync(join(root, f), join(pkg, 'dist', f));
  cpSync(join(root, 'LICENSES'), join(pkg, 'dist', 'LICENSES'), { recursive: true });
  console.log(`finish-dist: ${n} declaration files rewritten; LICENSE, NOTICES.md and LICENSES/ copied into dist/`);
}
```

Run the test again → PASS (1 test).

- [ ] **Step 3: One `tsconfig.build.json` per library package.** Sibling `@pme/*` imports resolve to the siblings' emitted declarations (`pnpm -r build` builds skins → engine-core → audio/controller → renderer/ventilator in dependency order). `types` lists `node` as every package's own `tsconfig.json` does (Decision 26: engine-core reads `globalThis.process?.env` since FU-7; without it `tsc` fails with TS7017).

**Create** `packages/engine-core/tsconfig.build.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": false,
    "declaration": true,
    "emitDeclarationOnly": true,
    "rootDir": ".",
    "outDir": "dist/types",
    "types": ["node", "vite/client"],
    "paths": {
      "@pme/engine-core": ["../engine-core/dist/types/src/index.d.ts"],
      "@pme/skins": ["../skins/dist/types/src/index.d.ts"],
      "@pme/skins/validate": ["../skins/dist/types/src/validate.d.ts"],
      "@pme/audio": ["../audio/dist/types/src/index.d.ts"],
      "@pme/controller": ["../controller/dist/types/src/index.d.ts"],
      "@pme/controller/scenario": ["../controller/dist/types/src/scenario/index.d.ts"]
    }
  },
  "include": ["src", "data", "templates"]
}
```

**Create** `packages/renderer/tsconfig.build.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": false,
    "declaration": true,
    "emitDeclarationOnly": true,
    "rootDir": ".",
    "outDir": "dist/types",
    "types": ["node", "vite/client"],
    "paths": {
      "@pme/engine-core": ["../engine-core/dist/types/src/index.d.ts"],
      "@pme/skins": ["../skins/dist/types/src/index.d.ts"],
      "@pme/skins/validate": ["../skins/dist/types/src/validate.d.ts"],
      "@pme/audio": ["../audio/dist/types/src/index.d.ts"],
      "@pme/controller": ["../controller/dist/types/src/index.d.ts"],
      "@pme/controller/scenario": ["../controller/dist/types/src/scenario/index.d.ts"]
    }
  },
  "include": ["src"]
}
```

**Create** `packages/audio/tsconfig.build.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": false,
    "declaration": true,
    "emitDeclarationOnly": true,
    "rootDir": ".",
    "outDir": "dist/types",
    "types": ["node", "vite/client"],
    "paths": {
      "@pme/engine-core": ["../engine-core/dist/types/src/index.d.ts"],
      "@pme/skins": ["../skins/dist/types/src/index.d.ts"],
      "@pme/skins/validate": ["../skins/dist/types/src/validate.d.ts"],
      "@pme/audio": ["../audio/dist/types/src/index.d.ts"],
      "@pme/controller": ["../controller/dist/types/src/index.d.ts"],
      "@pme/controller/scenario": ["../controller/dist/types/src/scenario/index.d.ts"]
    }
  },
  "include": ["src"]
}
```

**Create** `packages/controller/tsconfig.build.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": false,
    "declaration": true,
    "emitDeclarationOnly": true,
    "rootDir": ".",
    "outDir": "dist/types",
    "types": ["node", "vite/client"],
    "paths": {
      "@pme/engine-core": ["../engine-core/dist/types/src/index.d.ts"],
      "@pme/skins": ["../skins/dist/types/src/index.d.ts"],
      "@pme/skins/validate": ["../skins/dist/types/src/validate.d.ts"],
      "@pme/audio": ["../audio/dist/types/src/index.d.ts"],
      "@pme/controller": ["../controller/dist/types/src/index.d.ts"],
      "@pme/controller/scenario": ["../controller/dist/types/src/scenario/index.d.ts"]
    }
  },
  "include": ["src"]
}
```

**Create** `packages/skins/tsconfig.build.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": false,
    "declaration": true,
    "emitDeclarationOnly": true,
    "rootDir": ".",
    "outDir": "dist/types",
    "types": ["node", "vite/client"],
    "paths": {
      "@pme/engine-core": ["../engine-core/dist/types/src/index.d.ts"],
      "@pme/skins": ["../skins/dist/types/src/index.d.ts"],
      "@pme/skins/validate": ["../skins/dist/types/src/validate.d.ts"],
      "@pme/audio": ["../audio/dist/types/src/index.d.ts"],
      "@pme/controller": ["../controller/dist/types/src/index.d.ts"],
      "@pme/controller/scenario": ["../controller/dist/types/src/scenario/index.d.ts"]
    }
  },
  "include": ["src"]
}
```

**Create** `packages/ventilator/tsconfig.build.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": false,
    "declaration": true,
    "emitDeclarationOnly": true,
    "rootDir": ".",
    "outDir": "dist/types",
    "types": ["node", "vite/client"],
    "paths": {
      "@pme/engine-core": ["../engine-core/dist/types/src/index.d.ts"],
      "@pme/skins": ["../skins/dist/types/src/index.d.ts"],
      "@pme/skins/validate": ["../skins/dist/types/src/validate.d.ts"],
      "@pme/audio": ["../audio/dist/types/src/index.d.ts"],
      "@pme/controller": ["../controller/dist/types/src/index.d.ts"],
      "@pme/controller/scenario": ["../controller/dist/types/src/scenario/index.d.ts"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Package metadata and `publishConfig`, set by a script** (workspace `exports` stay on `src/`; `pnpm pack`/`publish` swap in the `publishConfig` fields). Orchestrator ruling (8b review), 2026-09-27: the six manifests are NOT edited by find blocks — FU-3, FU-4 or V.1 may have added scripts or dependencies to them, and JSON has no comments to re-anchor on — but by one small field-setting script that keeps every other key and its order. Test first:

**Create** `packages/validation/test/release-manifests.test.ts`:
```ts
// Stage 8b: scripts/release-manifests.ts sets the publish fields of the library manifests and keeps every other key.
import { describe, expect, it } from 'vitest';
import { releaseManifest } from '../../../scripts/release-manifests.ts';

const controller = {
  name: '@pme/controller', version: '0.0.0', private: true, type: 'module',
  exports: { '.': './src/index.ts', './scenario': './src/scenario/index.ts' },
  scripts: { typecheck: 'tsc -p tsconfig.json', build: 'vite build', audit: 'node audit.ts' }, // `audit`: a key a sibling stage added
  dependencies: { '@pme/engine-core': 'workspace:*', ajv: '8.20.0', ws: '8.21.3' },
  devDependencies: { '@types/ws': '8.18.1' },
  bin: { 'pme-relay': './relay/bin.ts' },
  someNewKey: { kept: true },
};

describe('scripts/release-manifests releaseManifest', () => {
  it('drops private, sets the publish fields at fixed places and keeps every other key', () => {
    const r = releaseManifest('controller', controller, '1.0.0-rc.1');
    expect(Object.keys(r)).toEqual(['name', 'version', 'description', 'license', 'author', 'repository', 'type', 'exports', 'files', 'publishConfig', 'scripts', 'dependencies', 'devDependencies', 'bin', 'someNewKey']);
    expect(r.version).toBe('1.0.0-rc.1');
    expect(r.exports).toEqual(controller.exports); // the workspace keeps resolving src/
    expect(r.publishConfig).toMatchObject({ access: 'public', bin: {}, exports: { './scenario': { import: './dist/scenario.js' } } });
    expect(r.scripts).toEqual({ typecheck: 'tsc -p tsconfig.json', build: 'vite build && tsc -p tsconfig.build.json && node --experimental-strip-types ../../scripts/finish-dist.ts', audit: 'node audit.ts' });
    expect(r.dependencies).toEqual({ '@pme/engine-core': 'workspace:*', ajv: '8.20.0' });
    expect(r.devDependencies).toEqual({ '@types/ws': '8.18.1', ws: '8.21.3' });
    expect(r.someNewKey).toEqual({ kept: true });
  });
  it('is idempotent, and gives engine-core its sideEffects list right after "type"', () => {
    const once = releaseManifest('engine-core', { name: '@pme/engine-core', version: '0.0.0', private: true, type: 'module', exports: { '.': './src/index.ts' }, scripts: { build: 'vite build' } }, '1.0.0-rc.1');
    expect(releaseManifest('engine-core', once, '1.0.0-rc.1')).toEqual(once);
    expect(Object.keys(once).indexOf('sideEffects')).toBe(Object.keys(once).indexOf('type') + 1);
    expect(once.sideEffects).toEqual(['./src/l2/ecg/pacing.ts', './src/l2/ecg/arrest/vf.ts']);
  });
});
```

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/release-manifests.test.ts` — Expected: FAIL (module not found).

**Create** `scripts/release-manifests.ts`:
```ts
// Stage 8b: sets the publish fields of the six library manifests (packages/<dir>/package.json) in place and keeps
// every other key, and its order (orchestrator ruling, 8b review: head-of-file find blocks break on any key a sibling
// stage adds, and JSON has no comments to re-anchor on). Idempotent; re-run with another version if Q8 changes it.
// Usage: node --experimental-strip-types scripts/release-manifests.ts [version]     (default 1.0.0-rc.1)
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Json = Record<string, unknown>;
type Entry = string | { types: string; import: string };
interface Release {
  description: string;
  sideEffects?: false | string[];
  exports: Record<string, Entry>;
  files?: string[];
  noBin?: true;
  devOnly?: string[];
}

const BUILD_TAIL = ' && tsc -p tsconfig.build.json && node --experimental-strip-types ../../scripts/finish-dist.ts';
const entry = (dts: string, js: string): Entry => ({ types: `./dist/types/src/${dts}.d.ts`, import: `./dist/${js}.js` });

/** What each published package gets; everything else in its manifest is kept as it is. */
export const RELEASE: Record<string, Release> = {
  'engine-core': {
    description: 'Patient-monitor simulation engine core: rhythm engine, haemodynamics, gas exchange, device layer, MANUAL and MODELED physiology (no DOM).',
    // the two modules that register ECG hooks at top level must survive tree-shaking (8b review finding 10)
    sideEffects: ['./src/l2/ecg/pacing.ts', './src/l2/ecg/arrest/vf.ts'],
    exports: { '.': entry('index', 'index') },
  },
  renderer: {
    description: 'Canvas2D sweep renderer, numerics and mountMonitor() for the patient-monitor engine; also ships the single-file IIFE (window.PatientMonitor).',
    exports: { '.': entry('index', 'index'), './iife': './dist/patient-monitor.iife.js' },
    files: ['dist', '!dist/assets'], // dist/assets holds only the inline worker's orphan source map (1.9 MB)
  },
  audio: {
    description: 'Web Audio QRS beep and IEC-style / traditional / Saadat alarm tones for the patient-monitor engine.',
    exports: { '.': entry('index', 'index') },
  },
  controller: {
    description: 'Command protocol, transports (in-process, postMessage, BroadcastChannel, WebSocket, WebRTC), instructor panel and the pme-scenario/1 runner for the patient-monitor engine.',
    exports: { '.': entry('index', 'index'), './scenario': entry('scenario/index', 'scenario') },
    noBin: true, // the .ts relay bin cannot run from node_modules (Node will not strip types there): a later release (Q7)
    devOnly: ['ws'], // the relay's WebSocket server: needed in the repo only
  },
  skins: {
    description: 'Data-only monitor skins and themes (saadat-like, philips-like, zoll-like, ge-like, mindray-like, lifepak-like) with JSON Schemas and provenance.',
    sideEffects: false,
    exports: { '.': entry('index', 'index'), './validate': entry('validate', 'validate') },
  },
  ventilator: {
    description: "Hamilton-style mechanical ventilator simulation (forked from the author's ventilator simulator) and its two-way link (VentFrame in, lungState out) to the patient-monitor engine.",
    sideEffects: false,
    exports: { '.': entry('index', 'index') },
  },
};

// Each set key goes right after the key it follows in the released layout.
const AFTER: Record<string, string[]> = { version: ['description', 'license', 'author', 'repository'], type: ['sideEffects'], exports: ['files', 'publishConfig'] };

/** The released form of one manifest: `private` dropped, the publish fields set, every other key kept in place. */
export function releaseManifest(dir: string, m: Json, version: string): Json {
  const r = RELEASE[dir];
  if (!r) throw new Error(`release-manifests: unknown package ${dir}`);
  const set: Json = {
    version,
    description: r.description,
    license: 'MIT',
    author: 'Ali Mahdavi',
    repository: { type: 'git', url: 'git+https://github.com/samhv-dev/patient-monitor-engine.git', directory: `packages/${dir}` },
    ...(r.sideEffects === undefined ? {} : { sideEffects: r.sideEffects }),
    files: r.files ?? ['dist'],
    publishConfig: { access: 'public', exports: r.exports, types: './dist/types/src/index.d.ts', ...(r.noBin ? { bin: {} } : {}) },
  };
  const out: Json = {};
  const put = (k: string) => {
    if (k in set) out[k] = set[k];
  };
  for (const [k, v] of Object.entries(m)) {
    if (k === 'private' || (k in set && k !== 'version')) continue;
    if (k === 'version') put(k);
    else out[k] = v;
    for (const a of AFTER[k] ?? []) put(a);
  }
  for (const k of Object.keys(set)) if (!(k in out)) out[k] = set[k]; // an anchor key was missing: append
  const scripts = { ...(out.scripts as Record<string, string> | undefined) };
  if (!scripts.build?.includes('finish-dist.ts')) scripts.build = `${scripts.build ?? 'vite build'}${BUILD_TAIL}`;
  out.scripts = scripts;
  for (const d of r.devOnly ?? []) {
    const deps = { ...(out.dependencies as Record<string, string> | undefined) };
    const v = deps[d];
    if (v === undefined) continue;
    delete deps[d];
    out.dependencies = deps;
    out.devDependencies = { ...(out.devDependencies as Record<string, string> | undefined), [d]: v };
  }
  return out;
}

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(import.meta.filename);
if (invokedDirectly) {
  const version = process.argv[2] ?? '1.0.0-rc.1';
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?$/.test(version)) throw new Error(`release-manifests: bad version ${version}`);
  const root = resolve(import.meta.dirname, '..');
  for (const dir of Object.keys(RELEASE)) {
    const file = resolve(root, 'packages', dir, 'package.json');
    const released = releaseManifest(dir, JSON.parse(readFileSync(file, 'utf8')) as Json, version);
    writeFileSync(file, `${JSON.stringify(released, null, 2)}\n`);
    console.log(`release-manifests: packages/${dir}/package.json → ${version}`);
  }
}
```

Run the test again → PASS (2 tests). Then apply it once:

```bash
node --experimental-strip-types scripts/release-manifests.ts
git diff --stat packages/{engine-core,renderer,audio,controller,skins,ventilator}/package.json
```

Expected: six `release-manifests: … → 1.0.0-rc.1` lines. Each manifest's head then reads exactly as below (from `"name"` down to the end of `"scripts"`; any key FU-3/FU-4/V.1 added stays where it was, e.g. an extra script after `"build"`). The script's output was checked against these six blocks on `main` d455b50 by the plan fixer, and again on 48864439 in the refresh (run with `1.0.0-rc.1`): all six match. Read the six diffs: nothing but these fields (and controller's `ws` move) may change.

Expected head of `packages/engine-core/package.json`:
```json
  "name": "@pme/engine-core",
  "version": "1.0.0-rc.1",
  "description": "Patient-monitor simulation engine core: rhythm engine, haemodynamics, gas exchange, device layer, MANUAL and MODELED physiology (no DOM).",
  "license": "MIT",
  "author": "Ali Mahdavi",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/samhv-dev/patient-monitor-engine.git",
    "directory": "packages/engine-core"
  },
  "type": "module",
  "sideEffects": [
    "./src/l2/ecg/pacing.ts",
    "./src/l2/ecg/arrest/vf.ts"
  ],
  "exports": {
    ".": "./src/index.ts"
  },
  "files": [
    "dist"
  ],
  "publishConfig": {
    "access": "public",
    "exports": {
      ".": {
        "types": "./dist/types/src/index.d.ts",
        "import": "./dist/index.js"
      }
    },
    "types": "./dist/types/src/index.d.ts"
  },
  "scripts": {
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run --passWithNoTests",
    "build": "vite build && tsc -p tsconfig.build.json && node --experimental-strip-types ../../scripts/finish-dist.ts"
  },
```

Expected head of `packages/renderer/package.json` (its `build` got the `--mode iife` pass in Task 2):
```json
  "name": "@pme/renderer",
  "version": "1.0.0-rc.1",
  "description": "Canvas2D sweep renderer, numerics and mountMonitor() for the patient-monitor engine; also ships the single-file IIFE (window.PatientMonitor).",
  "license": "MIT",
  "author": "Ali Mahdavi",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/samhv-dev/patient-monitor-engine.git",
    "directory": "packages/renderer"
  },
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "files": [
    "dist",
    "!dist/assets"
  ],
  "publishConfig": {
    "access": "public",
    "exports": {
      ".": {
        "types": "./dist/types/src/index.d.ts",
        "import": "./dist/index.js"
      },
      "./iife": "./dist/patient-monitor.iife.js"
    },
    "types": "./dist/types/src/index.d.ts"
  },
  "scripts": {
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run --passWithNoTests",
    "build": "vite build && vite build --mode iife && tsc -p tsconfig.build.json && node --experimental-strip-types ../../scripts/finish-dist.ts"
  },
```

Expected `packages/audio/package.json` body (it has no dependencies):
```json
  "name": "@pme/audio",
  "version": "1.0.0-rc.1",
  "description": "Web Audio QRS beep and IEC-style / traditional / Saadat alarm tones for the patient-monitor engine.",
  "license": "MIT",
  "author": "Ali Mahdavi",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/samhv-dev/patient-monitor-engine.git",
    "directory": "packages/audio"
  },
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "files": [
    "dist"
  ],
  "publishConfig": {
    "access": "public",
    "exports": {
      ".": {
        "types": "./dist/types/src/index.d.ts",
        "import": "./dist/index.js"
      }
    },
    "types": "./dist/types/src/index.d.ts"
  },
  "scripts": {
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run --passWithNoTests",
    "build": "vite build && tsc -p tsconfig.build.json && node --experimental-strip-types ../../scripts/finish-dist.ts"
  }
```

Expected head of `packages/controller/package.json` (down to `devDependencies`; `ws` moved to `devDependencies`; the top-level `bin` stays for the repo's `pnpm relay`, `publishConfig.bin: {}` empties it in the tarball):
```json
  "name": "@pme/controller",
  "version": "1.0.0-rc.1",
  "description": "Command protocol, transports (in-process, postMessage, BroadcastChannel, WebSocket, WebRTC), instructor panel and the pme-scenario/1 runner for the patient-monitor engine.",
  "license": "MIT",
  "author": "Ali Mahdavi",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/samhv-dev/patient-monitor-engine.git",
    "directory": "packages/controller"
  },
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./scenario": "./src/scenario/index.ts"
  },
  "files": [
    "dist"
  ],
  "publishConfig": {
    "access": "public",
    "exports": {
      ".": {
        "types": "./dist/types/src/index.d.ts",
        "import": "./dist/index.js"
      },
      "./scenario": {
        "types": "./dist/types/src/scenario/index.d.ts",
        "import": "./dist/scenario.js"
      }
    },
    "types": "./dist/types/src/index.d.ts",
    "bin": {}
  },
  "scripts": {
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run --passWithNoTests",
    "build": "vite build && tsc -p tsconfig.build.json && node --experimental-strip-types ../../scripts/finish-dist.ts",
    "relay": "node --experimental-strip-types --no-warnings relay/bin.ts"
  },
  "dependencies": {
    "@pme/engine-core": "workspace:*",
    "ajv": "8.20.0"
  },
  "devDependencies": {
    "@types/ws": "8.18.1",
    "happy-dom": "20.14.5",
    "ws": "8.21.3"
  },
```

Expected head of `packages/skins/package.json`:
```json
  "name": "@pme/skins",
  "version": "1.0.0-rc.1",
  "description": "Data-only monitor skins and themes (saadat-like, philips-like, zoll-like, ge-like, mindray-like, lifepak-like) with JSON Schemas and provenance.",
  "license": "MIT",
  "author": "Ali Mahdavi",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/samhv-dev/patient-monitor-engine.git",
    "directory": "packages/skins"
  },
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".": "./src/index.ts",
    "./validate": "./src/validate.ts"
  },
  "files": [
    "dist"
  ],
  "publishConfig": {
    "access": "public",
    "exports": {
      ".": {
        "types": "./dist/types/src/index.d.ts",
        "import": "./dist/index.js"
      },
      "./validate": {
        "types": "./dist/types/src/validate.d.ts",
        "import": "./dist/validate.js"
      }
    },
    "types": "./dist/types/src/index.d.ts"
  },
  "scripts": {
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run --passWithNoTests",
    "build": "vite build && tsc -p tsconfig.build.json && node --experimental-strip-types ../../scripts/finish-dist.ts"
  },
```

Expected head of `packages/ventilator/package.json`:
```json
  "name": "@pme/ventilator",
  "version": "1.0.0-rc.1",
  "description": "Hamilton-style mechanical ventilator simulation (forked from the author's ventilator simulator) and its two-way link (VentFrame in, lungState out) to the patient-monitor engine.",
  "license": "MIT",
  "author": "Ali Mahdavi",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/samhv-dev/patient-monitor-engine.git",
    "directory": "packages/ventilator"
  },
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".": "./src/index.ts"
  },
  "files": [
    "dist"
  ],
  "publishConfig": {
    "access": "public",
    "exports": {
      ".": {
        "types": "./dist/types/src/index.d.ts",
        "import": "./dist/index.js"
      }
    },
    "types": "./dist/types/src/index.d.ts"
  },
  "scripts": {
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run --passWithNoTests",
    "build": "vite build && tsc -p tsconfig.build.json && node --experimental-strip-types ../../scripts/finish-dist.ts"
  },
```

- [ ] **Step 5: ESM externals and the skins `validate` entry.**

**Find** in `packages/engine-core/vite.config.ts`:
```ts
    sourcemap: true,
  },
```
**Replace with:**
```ts
    sourcemap: true,
    // Stage 8b: sibling @pme packages stay imports (npm consumers get one copy of each); third-party code stays bundled.
    rollupOptions: { external: [/^@pme\//] },
  },
```

**Find** in `packages/audio/vite.config.ts`:
```ts
    sourcemap: true,
  },
```
**Replace with:**
```ts
    sourcemap: true,
    // Stage 8b: sibling @pme packages stay imports (npm consumers get one copy of each); third-party code stays bundled.
    rollupOptions: { external: [/^@pme\//] },
  },
```

**Find** in `packages/controller/vite.config.ts`:
```ts
    sourcemap: true,
  },
```
**Replace with:**
```ts
    sourcemap: true,
    // Stage 8b: sibling @pme packages stay imports (npm consumers get one copy of each); ajv stays bundled (N-011).
    rollupOptions: { external: [/^@pme\//] },
  },
```

**Find** in `packages/ventilator/vite.config.ts`:
```ts
    sourcemap: true,
  },
```
**Replace with:**
```ts
    sourcemap: true,
    // Stage 8b: sibling @pme packages stay imports (npm consumers get one copy of each); third-party code stays bundled.
    rollupOptions: { external: [/^@pme\//] },
  },
```

**Find** in `packages/skins/vite.config.ts`:
```ts
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
```
**Replace with:**
```ts
    // Stage 8b: two entries, like @pme/controller — the root (no ajv; what the renderer and the IIFE use) and
    // './validate' (ajv, bundled: N-010), which package.json already exports.
    lib: { entry: { index: 'src/index.ts', validate: 'src/validate.ts' }, formats: ['es'] },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: { external: [/^@pme\//] },
  },
```

- [ ] **Step 6: The pack smoke.**

**Create** `scripts/pack-smoke.mjs`:
```js
// Stage 8b: prove the published shape of the six library packages without publishing. Packs each one with
// `pnpm pack` (publishConfig applied: exports → dist, types → dist/types), checks every tarball carries LICENSE,
// NOTICES.md and the LICENSES/ texts (and the renderer no orphan dist/assets map), installs the tarballs into a fresh
// consumer project with npm, type-checks a consumer file under moduleResolution Bundler AND NodeNext with
// skipLibCheck off, imports and runs the packed engine in Node, and bundles the consumer with Vite. Needs
// `pnpm build` first and network access to the npm registry (the consumer installs typescript and vite).
// Usage: pnpm pack-smoke [workDir]
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const work = process.argv[2] ? resolve(process.argv[2]) : mkdtempSync(join(tmpdir(), 'pme-pack-smoke-'));
const PKGS = ['engine-core', 'renderer', 'audio', 'controller', 'skins', 'ventilator'];
const pnpm = process.env.npm_execpath ? [process.execPath, process.env.npm_execpath] : ['pnpm'];
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' });

rmSync(work, { recursive: true, force: true });
const tarballs = join(work, 'tarballs');
const app = join(work, 'consumer');
mkdirSync(tarballs, { recursive: true });
mkdirSync(join(app, 'src'), { recursive: true });
for (const p of PKGS) run(pnpm[0], [...pnpm.slice(1), 'pack', '--pack-destination', tarballs], join(root, 'packages', p));
const tgz = Object.fromEntries(readdirSync(tarballs).map((f) => [`@pme/${f.replace(/^pme-/, '').replace(/-\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?\.tgz$/, '')}`, `file:${join(tarballs, f)}`]));
if (Object.keys(tgz).length !== PKGS.length) throw new Error(`pack-smoke: expected ${PKGS.length} tarballs, got ${Object.keys(tgz).join(', ')}`);
for (const [name, spec] of Object.entries(tgz)) { // licence texts travel with every copy (8b review ruling 1)
  const list = run('tar', ['-tzf', spec.slice('file:'.length)], work).split('\n');
  for (const f of ['package/dist/LICENSE', 'package/dist/NOTICES.md', 'package/dist/LICENSES/Apache-2.0.txt', 'package/dist/LICENSES/fast-uri-3.1.8.txt']) {
    if (!list.includes(f)) throw new Error(`pack-smoke: ${name} tarball lacks ${f}`);
  }
  if (list.some((f) => f.startsWith('package/dist/assets/'))) throw new Error(`pack-smoke: ${name} tarball ships dist/assets (orphan worker map)`);
}
writeFileSync(join(app, 'package.json'), JSON.stringify({
  name: 'pme-pack-smoke', private: true, type: 'module',
  dependencies: tgz, overrides: tgz, // sibling @pme deps resolve to the local tarballs, never the registry
  devDependencies: { typescript: '5.9.3', vite: '6.4.3' },
}, null, 2));
writeFileSync(join(app, 'src', 'main.ts'), `import { mountMonitor, version, type MonitorHandle } from '@pme/renderer';
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { ScenarioRunner, validateScenario } from '@pme/controller/scenario';
import { transports } from '@pme/controller';
import { resolveSkin } from '@pme/skins';
import { validate } from '@pme/skins/validate';
import { createVentDriver } from '@pme/ventilator';
const e = createEngine({ seed: 1 });
e.on((ev: EngineEvent) => void ev);
e.advanceTo(1);
const h: MonitorHandle = mountMonitor(document.getElementById('pm')!, { skin: 'philips-like', engine: { seed: 1 } });
console.log(version, typeof ScenarioRunner, typeof validateScenario, typeof transports, resolveSkin('philips-like').skin.id, typeof validate, typeof createVentDriver, typeof h.dispatch);
`);
const tsconfig = (resolution, module) => JSON.stringify({ compilerOptions: { target: 'ES2022', module, moduleResolution: resolution, strict: true, noEmit: true, skipLibCheck: false, lib: ['ES2022', 'DOM', 'DOM.Iterable'], types: [] }, include: ['src'] });
writeFileSync(join(app, 'tsconfig.json'), tsconfig('Bundler', 'ESNext'));
writeFileSync(join(app, 'tsconfig.nodenext.json'), tsconfig('NodeNext', 'NodeNext'));
writeFileSync(join(app, 'index.html'), '<!doctype html><div id="pm" style="height:300px"></div><script type="module" src="/src/main.ts"></script>\n');
run('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], app);
run('npx', ['tsc', '-p', 'tsconfig.json'], app);
run('npx', ['tsc', '-p', 'tsconfig.nodenext.json'], app);
run('node', ['--input-type=module', '-e', "const m = await import('@pme/engine-core'); m.createEngine({ seed: 1 }).advanceTo(1);"], app); // the packed ESM runs in Node
run('npx', ['vite', 'build', '--logLevel', 'error'], app);
console.log(`pack-smoke: OK — ${PKGS.length} tarballs carry the licence texts and install; tsc (Bundler, NodeNext, skipLibCheck off), a Node import and vite build pass (${work})`);
```

**Find** in `package.json`:
```json
    "check-size": "node --experimental-strip-types scripts/check-size.ts",
```
**Replace with:**
```json
    "check-size": "node --experimental-strip-types scripts/check-size.ts",
    "pack-smoke": "node scripts/pack-smoke.mjs",
```

- [ ] **Step 7: Lockfile, build, verify the published shape.**

```bash
npx -y pnpm@9.15.9 install                      # ws moved to devDependencies: pnpm-lock.yaml changes (commit it)
npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 build
ls packages/*/dist/types/src/index.d.ts packages/skins/dist/validate.js packages/*/dist/LICENSE packages/*/dist/LICENSES/Apache-2.0.txt
grep -rl "\.ts'" packages/{engine-core,renderer,audio,controller,skins,ventilator}/dist/types | head -3   # expect nothing
npx -y pnpm@9.15.9 pack-smoke <scratchpad>/stage-8b-release/pack-smoke
PME_TEST_SET=fast npx -y pnpm@9.15.9 test
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/iife-smoke.e2e.ts apps/demo/e2e/vent-link.e2e.ts
```

Expected: typecheck and build clean (`finish-dist: N declaration files rewritten; LICENSE, NOTICES.md and LICENSES/ copied into dist/` six times; refresh on 48864439: 144 engine-core, 26 controller, 13 ventilator, 12 renderer, 9 audio, 5 skins); six `index.d.ts`, `validate.js`, six `dist/LICENSE` and six `dist/LICENSES/Apache-2.0.txt`; no `.ts'` specifier left in `dist/types`; `grep -rl 'reference types="node"' packages/*/dist/types` prints nothing; `pack-smoke: OK …` (15 s in the 9f864b3 prototype; 4 min 13 s wall in the refresh on a loaded machine, almost all npm install; the tarball licence check, the Node import and the renderer's `!dist/assets` all ran in the refresh and passed: no tarball carries `dist/assets/`. If a later pnpm ignored the negation, set `worker: { rollupOptions: { output: { sourcemap: false } } }` in the renderer's ESM config instead and note it); the fast suite unchanged from `main`; smoke and vent-link e2e pass (the demo still resolves `src/`; vent-link runs the ESM worker named by `worker-host.ts`). If `pack-smoke` fails on a sibling stage's new export, fix the declaration build, not the consumer.

- [ ] **Step 8: Commit and push.**

```bash
git add scripts/finish-dist.ts scripts/pack-smoke.mjs scripts/release-manifests.ts packages/validation/test/finish-dist.test.ts packages/validation/test/release-manifests.test.ts packages/*/tsconfig.build.json \
  packages/{engine-core,renderer,audio,controller,skins,ventilator}/package.json packages/{engine-core,audio,controller,skins,ventilator}/vite.config.ts \
  package.json pnpm-lock.yaml docs/plans/stage-8b-release.md
git commit -m "build: publishable ESM packages — 1.0.0-rc.1 metadata, publishConfig → dist + declarations, @pme externals, skins/validate entry, pack-smoke

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-8b-release
```

Then check CI on the draft PR (bounded, as in Task 2 Step 5): the IIFE smoke on WebKit with the published-shape changes.

---
### Task 5: Version 1.0.0-rc.1 everywhere, checked in one place

**Files:** Create `packages/validation/test/release-versions.test.ts`; Modify the six `version` constants, the six `version.test.ts`, `packages/controller/test/index.test.ts` (its public-API test also asserts the version), `packages/validation/package.json`, `apps/demo/e2e/iife-smoke.e2e.ts`.

> **FU-11 amendment (R50 M2).** The engine's `version` is also the snapshot compatibility key (`engine.restore` and
> the learner monitor refuse a snapshot from another version). Before this task it was the constant `'0.0.0'` in every
> build, so the check never bit. Make it build-unique: `packages/engine-core/src/version.ts` exports
> `version = '1.0.0'` AND `build = '<git short hash>'` (written by the release build; `'dev'` in the workspace), and
> `snapshot()`/`restore()` compare `${version}+${build}` (a `dev` build accepts only `dev`). Test: a snapshot whose
> `engineVersion` differs in the build part is refused with the message naming both.

**Executor note on the FU-11 amendment (refresh 2026-10-10; not prototyped — the amendment's text above is FU-11's, verbatim).** (1) Q8: read `version = '1.0.0-rc.1'` where the amendment says `'1.0.0'`. (2) Do it after Step 4's commit, as a second commit of this task, `feat(engine): build-unique snapshot compatibility key (FU-11 A1)`, with the engine-core and renderer tests and the IIFE smoke re-run before it. (3) Shape, smallest that works: in `version.ts` keep the `export const version = '…';` line exactly as `release-versions.test.ts` reads it, and add `declare const __PME_ENGINE_BUILD__: string | undefined;` + `export const build: string = typeof __PME_ENGINE_BUILD__ === 'string' ? __PME_ENGINE_BUILD__ : 'dev';`. The `define: { __PME_ENGINE_BUILD__: JSON.stringify(process.env.PME_BUILD ?? 'dev') }` goes into the `vite.config.ts` of engine-core and renderer (both builds; Vitest and the demo dev server then see `'dev'`). **Rebase check 2026-10-13: do NOT name it `__PME_BUILD__`** — Stage 13 already defines `__PME_BUILD__` in `apps/demo/vite.config.ts:50` as `"<git sha8>[+] <date>"` for the Debrief footer (`apps/demo/src/app/views/debrief.ts:19–20`), and the demo's Vite applies its `define` to the engine-core source it compiles, so an engine reading `__PME_BUILD__` would get a date-stamped key in every demo build, dev server and demo Vitest run (snapshots refused across days), not `'dev'`, and the release workflow (Task 9) sets `PME_BUILD: ${{ github.sha }}` shortened to 7 characters on its `pnpm build` step; CI and local builds stay `'dev'`. (4) ONE key everywhere: export `engineKey` (= `${version}+${build}`) from `version.ts` (and the package index); the engine's `snapshot()` writes it into `engineVersion` and `restore()` compares against it. Then EVERY other comparison must use the same key, or it refuses every snapshot: find them with `grep -rn "engineVersion" packages/*/src apps/demo/src` (on 56f3761f: `packages/engine-core/src/engine.ts:410` (writes) and `:420` (compares), `packages/controller/src/session/viewer-sync.ts:186` fed by `apps/demo/src/stage6a/viewer.ts:15` with `engine.version` and by the FU-11 d learner/phone follower `apps/demo/src/app/views/follower.ts:37` (`import { version as engineVersion } from '@pme/engine-core'`, used at `:140`) — that import must become `engineKey`; `packages/controller/src/session/controller-session.ts:214` stores the host's `engineVersion`; FU-11 did NOT implement A1: `version.ts` on 56f3761f is still the one line `export const version = '0.0.0';`). Stage 12's phones run the same follower code (re-run `s12-mobile-learner.e2e.ts` on Chromium after the change; on CI WebKit two of its tests are skipped). Simplest: make the engine instance's `version` property return `engineKey` only if nothing displays it as a release number; otherwise change each call site. A learner/remote e2e (FU-11's same-browser second screen) must still pair after the change — run it. (5) Test: a new case in `packages/engine-core/test/version.test.ts` or the engine's snapshot test — a snapshot whose build part differs is refused, the message names both keys. (6) The controller fixtures that carry `engineVersion: '0.0.0'` as DATA stay (see the note after Step 2); if one of them is RESTORED by a test, it now needs the current key — read the failure, change only that fixture's version field, and list it in the gate note. If any of (3)–(5) touches a file outside this stage's partition, STOP and report instead.

- [ ] **Step 1: Failing test.**

**Create** `packages/validation/test/release-versions.test.ts`:
```ts
// Stage 8b: every package's exported `version` constant equals its package.json version (1.0.0-rc.1 at release), and all
// library packages share one version — one number, checked in one place. The constants are read as source text so
// this package does not type-check the renderer's worker import (vite/client types).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pkgs = resolve(import.meta.dirname, '..', '..');
const pkgVersion = (dir: string) => (JSON.parse(readFileSync(resolve(pkgs, dir, 'package.json'), 'utf8')) as { version: string }).version;
const constant = (file: string) => /export const version = '([^']+)';/.exec(readFileSync(resolve(pkgs, file), 'utf8'))?.[1];
const CONSTANTS: Record<string, string> = {
  audio: 'audio/src/index.ts', controller: 'controller/src/index.ts', 'engine-core': 'engine-core/src/version.ts',
  renderer: 'renderer/src/index.ts', skins: 'skins/src/index.ts', validation: 'validation/src/index.ts',
};

describe('release versions', () => {
  it('each version constant matches its package.json', () => {
    for (const [dir, file] of Object.entries(CONSTANTS)) expect(constant(file), file).toBe(pkgVersion(dir));
  });
  it('every library package is at the same version', () => {
    const vs = ['audio', 'controller', 'engine-core', 'renderer', 'skins', 'ventilator', 'validation'].map(pkgVersion);
    expect(new Set(vs).size).toBe(1);
  });
});
```

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/release-versions.test.ts` — Expected: FAIL (constants 0.0.0 vs 1.0.0-rc.1; validation 0.0.0).

- [ ] **Step 2: Bump.** The same one-line edit in six files, then the six tests, then validation's manifest and the IIFE smoke:

**Find** in `packages/engine-core/src/version.ts`:
```ts
export const version = '0.0.0';
```
**Replace with:**
```ts
export const version = '1.0.0-rc.1';
```

**Find** in `packages/audio/src/index.ts`:
```ts
export const version = '0.0.0';
```
**Replace with:**
```ts
export const version = '1.0.0-rc.1';
```

**Find** in `packages/controller/src/index.ts`:
```ts
export const version = '0.0.0';
```
**Replace with:**
```ts
export const version = '1.0.0-rc.1';
```

**Find** in `packages/renderer/src/index.ts`:
```ts
export const version = '0.0.0';
```
**Replace with:**
```ts
export const version = '1.0.0-rc.1';
```

**Find** in `packages/skins/src/index.ts`:
```ts
export const version = '0.0.0';
```
**Replace with:**
```ts
export const version = '1.0.0-rc.1';
```

**Find** in `packages/validation/src/index.ts`:
```ts
export const version = '0.0.0';
```
**Replace with:**
```ts
export const version = '1.0.0-rc.1';
```

**Find** in `packages/engine-core/test/version.test.ts`:
```ts
    expect(version).toBe('0.0.0');
```
**Replace with:**
```ts
    expect(version).toBe('1.0.0-rc.1');
```

**Find** in `packages/audio/test/version.test.ts`:
```ts
    expect(version).toBe('0.0.0');
```
**Replace with:**
```ts
    expect(version).toBe('1.0.0-rc.1');
```

**Find** in `packages/controller/test/version.test.ts`:
```ts
    expect(version).toBe('0.0.0');
```
**Replace with:**
```ts
    expect(version).toBe('1.0.0-rc.1');
```

**Find** in `packages/renderer/test/version.test.ts`:
```ts
    expect(version).toBe('0.0.0');
```
**Replace with:**
```ts
    expect(version).toBe('1.0.0-rc.1');
```

**Find** in `packages/skins/test/version.test.ts`:
```ts
    expect(version).toBe('0.0.0');
```
**Replace with:**
```ts
    expect(version).toBe('1.0.0-rc.1');
```

**Find** in `packages/validation/test/version.test.ts`:
```ts
    expect(version).toBe('0.0.0');
```
**Replace with:**
```ts
    expect(version).toBe('1.0.0-rc.1');
```

**Find** in `packages/controller/test/index.test.ts`:
```ts
    expect(api.version).toBe('0.0.0');
```
**Replace with:**
```ts
    expect(api.version).toBe('1.0.0-rc.1');
```

**Find** in `packages/validation/package.json`:
```json
  "name": "@pme/validation",
  "version": "0.0.0",
```
**Replace with:**
```json
  "name": "@pme/validation",
  "version": "1.0.0-rc.1",
```

**Find** in `apps/demo/e2e/iife-smoke.e2e.ts`:
```ts
  expect(version).toBe('0.0.0');
```
**Replace with:**
```ts
  expect(version).toBe('1.0.0-rc.1');
```

(Leave `'0.0.0'` where it is DATA, not the package version: `stage1Vocabulary(engineVersion = '0.0.0')` and the relay/session snapshot fixtures in `packages/controller` — the exported default is listed in the gate note as a later-release item (Decision 22) — and `docs/validation/report.*`, which Task 12 Step 0's `pnpm validate` run regenerates.)

- [ ] **Step 3: Run.** `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/release-versions.test.ts` → PASS (2); `for p in engine-core audio controller renderer skins validation; do npx -y pnpm@9.15.9 --filter @pme/$p exec vitest run test/version.test.ts; done` → PASS; `npx -y pnpm@9.15.9 --filter @pme/renderer build && PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/iife-smoke.e2e.ts` → 2 passed, and `head -c 60 packages/renderer/dist/patient-monitor.iife.js` shows `patient-monitor-engine 1.0.0-rc.1`.

- [ ] **Step 4: Commit and push.**

```bash
git add packages/*/src/index.ts packages/engine-core/src/version.ts packages/*/test/version.test.ts packages/controller/test/index.test.ts packages/validation/package.json \
  packages/validation/test/release-versions.test.ts apps/demo/e2e/iife-smoke.e2e.ts docs/plans/stage-8b-release.md
git commit -m "chore(release): version 1.0.0-rc.1 in every library package, checked by release-versions.test.ts

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-8b-release
```

---

### Task 6: Dependency licence audit (`pnpm check-licences`)

**Files:** Create `scripts/check-licences.ts`, `packages/validation/test/check-licences.test.ts`, `LICENSES/ajv-8.20.0.txt`, `LICENSES/fast-deep-equal-3.1.3.txt`, `LICENSES/json-schema-traverse-1.0.0.txt`, `LICENSES/require-from-string-2.0.2.txt`; Modify root `package.json`, `NOTICES.md` (licence cells of N-010–N-013).

Orchestrator ruling (8b review), 2026-09-27: every shipped package's licence text is in `LICENSES/` and travels with every distribution (BUILD-PLAN Stage 8 acceptance 6: "every `LICENSES/` text is present"). MIT and BSD-3 require the copyright and permission notice in every copy; ajv, fast-deep-equal, json-schema-traverse and require-from-string are bundled into `@pme/controller/scenario` and `@pme/skins/validate`, and only fast-uri's text was in `LICENSES/`.

- [ ] **Step 1: Failing test.**

**Create** `packages/validation/test/check-licences.test.ts`:
```ts
// Stage 8b: the dependency licence audit (brief §8, R6). Runtime (shipped) packages: permissive licences only, a
// NOTICES.md row naming the exact version AND the licence text in LICENSES/ (BUILD-PLAN Stage 8 acceptance 6);
// every LICENSES/ path NOTICES names must exist; build/test tools: permissive licences.
import { describe, expect, it } from 'vitest';
import { auditLicences, type LicenceReport } from '../../../scripts/check-licences.ts';

const NOTICES = '| N-010 | ajv 8.20.0 (runtime) | x | MIT | y | z |\n| N-012 | fast-uri 3.1.8 | x | BSD-3-Clause (text in `LICENSES/fast-uri-3.1.8.txt`) | y | z |';
const TEXTS = ['Apache-2.0.txt', 'ajv-8.20.0.txt', 'fast-uri-3.1.8.txt', 'left-pad-1.3.0.txt', 'minimatch-10.2.6.txt'];
const pkg = (name: string, v: string, license: string) => ({ name, versions: [v], license });

describe('scripts/check-licences auditLicences', () => {
  it('passes permissive licences with every shipped package named in NOTICES and its text in LICENSES/', () => {
    const prod: LicenceReport = { MIT: [pkg('ajv', '8.20.0', 'MIT')], 'BSD-3-Clause': [pkg('fast-uri', '3.1.8', 'BSD-3-Clause')] };
    const all: LicenceReport = { ...prod, 'Apache-2.0': [pkg('typescript', '5.9.3', 'Apache-2.0')], 'Python-2.0': [pkg('argparse', '2.0.1', 'Python-2.0')] };
    expect(auditLicences(all, prod, NOTICES, TEXTS)).toEqual([]);
  });
  it('fails a copyleft or unknown licence, and a shipped package missing from NOTICES', () => {
    const prod: LicenceReport = { MIT: [pkg('ajv', '8.20.0', 'MIT'), pkg('left-pad', '1.3.0', 'MIT')] };
    const all: LicenceReport = { ...prod, 'GPL-3.0': [pkg('gpl-thing', '1.0.0', 'GPL-3.0')], Unknown: [pkg('mystery', '0.1.0', 'Unknown')] };
    const problems = auditLicences(all, prod, NOTICES, TEXTS);
    expect(problems).toHaveLength(3);
    expect(problems.join('\n')).toMatch(/gpl-thing@1\.0\.0: licence "GPL-3\.0"/);
    expect(problems.join('\n')).toMatch(/mystery@0\.1\.0: licence "Unknown"/);
    expect(problems.join('\n')).toMatch(/left-pad 1\.3\.0: shipped at runtime but not named in NOTICES\.md/);
  });
  it('holds shipped packages to the runtime list (BlueOak is dev-only)', () => {
    const prod: LicenceReport = { 'BlueOak-1.0.0': [pkg('minimatch', '10.2.6', 'BlueOak-1.0.0')] };
    expect(auditLicences(prod, prod, 'minimatch 10.2.6', TEXTS)).toEqual(['minimatch@10.2.6: licence "BlueOak-1.0.0" is not in the runtime allow-list']);
  });
  it('fails a shipped package without its LICENSES/ text, and a LICENSES/ path in NOTICES that does not exist', () => {
    const prod: LicenceReport = { MIT: [pkg('ajv', '8.20.0', 'MIT')], 'Apache-2.0': [pkg('apache-thing', '2.0.0', 'Apache-2.0')] };
    const notices = `${NOTICES}\n| N-098 | apache-thing 2.0.0 | x | Apache-2.0 (text in \`LICENSES/Apache-2.0.txt\`) | y | z |\n| N-099 | gone | x | MIT (text in \`LICENSES/gone-1.0.0.txt\`) | y | z |`;
    expect(auditLicences(prod, prod, notices, ['Apache-2.0.txt', 'fast-uri-3.1.8.txt'])).toEqual([
      'ajv 8.20.0: shipped at runtime but LICENSES/ajv-8.20.0.txt is missing',
      'NOTICES.md names LICENSES/gone-1.0.0.txt, which is missing',
    ]);
  });
});
```

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/check-licences.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 2: The script.**

**Create** `scripts/check-licences.ts`:
```ts
// Licence audit (Stage 8b): every third-party package in the install must carry an allow-listed licence, and
// every package that ships to users (the production dependency closure) must also be named, with its exact
// version, in NOTICES.md and have its licence text in LICENSES/ (`<name>-<version>.txt`, or `Apache-2.0.txt`);
// every LICENSES/ path NOTICES.md names must exist (BUILD-PLAN Stage 8 acceptance 6). Reads
// `pnpm licenses list --json` (pnpm's own report; no extra dependency).
// Usage: pnpm check-licences            (exit 1 on any problem)
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Shipped with the packages or the IIFE: permissive licences only (brief §8, ruling R6). */
export const RUNTIME_ALLOW = ['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD'];
/** Build and test tools, never redistributed: also these permissive licences. */
export const DEV_ALLOW = [...RUNTIME_ALLOW, 'BlueOak-1.0.0', 'Python-2.0', 'CC0-1.0'];

export interface LicenceEntry {
  name: string;
  versions: string[];
  license: string;
}
export type LicenceReport = Record<string, LicenceEntry[]>;

/** Problems in the two reports; an empty list means the audit passes. `licenceFiles`: the file names in LICENSES/. */
export function auditLicences(all: LicenceReport, prod: LicenceReport, noticesMd: string, licenceFiles: string[]): string[] {
  const problems: string[] = [];
  const prodNames = new Set(Object.values(prod).flat().map((p) => p.name));
  for (const [licence, pkgs] of Object.entries(all)) {
    for (const p of pkgs) {
      const allow = prodNames.has(p.name) ? RUNTIME_ALLOW : DEV_ALLOW;
      if (!allow.includes(licence)) problems.push(`${p.name}@${p.versions.join('/')}: licence "${licence}" is not in the ${prodNames.has(p.name) ? 'runtime' : 'dev'} allow-list`);
    }
  }
  for (const pkgs of Object.values(prod)) {
    for (const p of pkgs) {
      for (const v of p.versions) {
        if (!noticesMd.includes(`${p.name} ${v}`)) problems.push(`${p.name} ${v}: shipped at runtime but not named in NOTICES.md`);
      }
    }
  }
  const have = new Set(licenceFiles);
  for (const [licence, pkgs] of Object.entries(prod)) {
    for (const p of pkgs) {
      for (const v of p.versions) {
        const text = licence === 'Apache-2.0' ? 'Apache-2.0.txt' : `${p.name.replace(/^@/, '').replace('/', '__')}-${v}.txt`;
        if (!have.has(text)) problems.push(`${p.name} ${v}: shipped at runtime but LICENSES/${text} is missing`);
      }
    }
  }
  const named = new Set([...noticesMd.matchAll(/LICENSES\/([\w@.+-]+\.txt)/g)].map((m) => m[1] as string));
  for (const f of named) if (!have.has(f)) problems.push(`NOTICES.md names LICENSES/${f}, which is missing`);
  return problems;
}

function pnpmJson(args: string[]): LicenceReport {
  const pnpm = process.env.npm_execpath; // set when run as `pnpm check-licences`
  const out = pnpm
    ? execFileSync(process.execPath, [pnpm, ...args], { encoding: 'utf8', maxBuffer: 64 << 20 })
    : execFileSync('pnpm', args, { encoding: 'utf8', maxBuffer: 64 << 20 });
  return JSON.parse(out) as LicenceReport;
}

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(import.meta.filename);
if (invokedDirectly) {
  const root = resolve(import.meta.dirname, '..');
  const all = pnpmJson(['licenses', 'list', '--json']);
  const prod = pnpmJson(['licenses', 'list', '--json', '--prod']);
  const problems = auditLicences(all, prod, readFileSync(resolve(root, 'NOTICES.md'), 'utf8'), readdirSync(resolve(root, 'LICENSES')));
  if (problems.length > 0) {
    for (const p of problems) console.error(`check-licences: ${p}`);
    process.exit(1);
  }
  const count = (r: LicenceReport) => Object.values(r).flat().length;
  console.log(`check-licences: OK (${count(all)} packages, ${count(prod)} shipped, every shipped text in LICENSES/; licences ${Object.keys(all).sort().join(', ')})`);
}
```

**The four missing texts** (copied verbatim from each installed package's own licence file, which carries its copyright line; never retyped):

```bash
for p in ajv@8.20.0 fast-deep-equal@3.1.3 json-schema-traverse@1.0.0 require-from-string@2.0.2; do
  n=${p%@*}; f=$(ls node_modules/.pnpm/$p/node_modules/$n/ | grep -iE '^licen[cs]e' | head -1)
  if [ -n "$f" ]; then cp "node_modules/.pnpm/$p/node_modules/$n/$f" "LICENSES/$n-${p#*@}.txt" && head -3 "LICENSES/$n-${p#*@}.txt"; else echo "MISSING licence file for $p"; fi
done
ls LICENSES/
```

Expected: four files, each starting with the MIT licence heading and a `Copyright (c) …` line; `LICENSES/` then holds `Apache-2.0.txt`, `ajv-8.20.0.txt`, `fast-deep-equal-3.1.3.txt`, `fast-uri-3.1.8.txt`, `json-schema-traverse-1.0.0.txt`, `qrcodegen-MIT.txt` (Stage 12, already on `main`), `require-from-string-2.0.2.txt`. If a package's directory is not at that path (pnpm layout), find it with `ls -d node_modules/.pnpm/<name>@*`. If FU-3/FU-4/V.1 added a runtime dependency, add its text the same way.

Then point N-010–N-013 at the texts:

**Find** in `NOTICES.md`:
```text
| MIT | JSON Schema validation of skins, themes and presets;
```
**Replace with:**
```text
| MIT (text in `LICENSES/ajv-8.20.0.txt`) | JSON Schema validation of skins, themes and presets;
```

**Find** in `NOTICES.md`:
```text
| MIT | Validates `pme-scenario/1` documents
```
**Replace with:**
```text
| MIT (text in `LICENSES/ajv-8.20.0.txt`) | Validates `pme-scenario/1` documents
```

**Find** in `NOTICES.md`:
```text
| MIT | Used inside ajv; bundled with it where reachable, unmodified |
```
**Replace with:**
```text
| MIT (texts in `LICENSES/fast-deep-equal-3.1.3.txt`, `LICENSES/json-schema-traverse-1.0.0.txt`, `LICENSES/require-from-string-2.0.2.txt`) | Used inside ajv; bundled with it where reachable, unmodified |
```

(N-012 already points at `LICENSES/fast-uri-3.1.8.txt`.)

**Find** in `package.json`:
```json
    "check-notices": "node --experimental-strip-types scripts/check-notices.ts",
```
**Replace with:**
```json
    "check-notices": "node --experimental-strip-types scripts/check-notices.ts",
    "check-licences": "node --experimental-strip-types scripts/check-licences.ts",
```

- [ ] **Step 3: Run.** The unit test → PASS (4; the text checks came from the R50 review and were not prototyped). `npx -y pnpm@9.15.9 check-licences` → `check-licences: OK (N packages, 5 shipped, every shipped text in LICENSES/; licences Apache-2.0, BSD-2-Clause, BSD-3-Clause, BlueOak-1.0.0, ISC, MIT, Python-2.0)` (prototype: 89 packages with TypeDoc installed, 88 without it at this point, 69 on d455b50 per the reviewer; refresh on 48864439: 89 / 5 with TypeDoc, and the pre-copy run failed naming exactly the four texts; shipped = ajv, fast-deep-equal, json-schema-traverse, require-from-string, fast-uri once `ws` is a devDependency). Run it once BEFORE copying the four texts and see it fail naming exactly those four (the test that the check bites), then after. If FU-3/FU-4/V.1 added a runtime dependency, the audit tells you which NOTICES row or text is missing: add them in THIS task (same PR rule, brief §8) and record it in the gate note. `npx -y pnpm@9.15.9 build && ls packages/controller/dist/LICENSES/` → the seven texts (six + `qrcodegen-MIT.txt`, on `main` since Stage 12) (finish-dist copies the directory). The CI step is added in Task 9.

- [ ] **Step 4: Commit and push.**

```bash
git add scripts/check-licences.ts packages/validation/test/check-licences.test.ts package.json NOTICES.md \
  LICENSES/ajv-8.20.0.txt LICENSES/fast-deep-equal-3.1.3.txt LICENSES/json-schema-traverse-1.0.0.txt LICENSES/require-from-string-2.0.2.txt docs/plans/stage-8b-release.md
git commit -m "build: pnpm check-licences — allow-listed dependency licences; shipped packages named in NOTICES.md with their texts in LICENSES/

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-8b-release
```

---

### Task 7: TypeDoc API reference (build-only)

**Files:** Create `typedoc.json`, `packages/{engine-core,renderer,audio,controller,skins,ventilator}/typedoc.json`, `LICENSES/lunr-<version>.txt`; Modify root `package.json` (via `pnpm add` + one script), `pnpm-lock.yaml`, `.gitignore`, `NOTICES.md`.

- [ ] **Step 1: Install (exact version, build only).**

```bash
npx -y pnpm@9.15.9 add -Dw typedoc@0.28.20
```

Expected: root `devDependencies` gains `"typedoc": "0.28.20"` (pnpm re-sorts that block alphabetically; leave it), `pnpm-lock.yaml` gains TypeDoc and its five dependencies (`@gerrit0/mini-shiki`, `lunr`, `markdown-it`, `minimatch`, `yaml`).

- [ ] **Step 2: Configuration.**

**Create** `typedoc.json`:
```json
{
  "$schema": "https://typedoc.org/schema.json",
  "name": "patient-monitor-engine",
  "entryPointStrategy": "packages",
  "entryPoints": [
    "packages/engine-core",
    "packages/renderer",
    "packages/audio",
    "packages/controller",
    "packages/skins",
    "packages/ventilator"
  ],
  "packageOptions": { "excludePrivate": true, "excludeInternal": true },
  "out": "docs/api",
  "readme": "none",
  "includeVersion": false,
  "githubPages": false
}
```

**Create** `packages/engine-core/typedoc.json`:
```json
{ "entryPoints": ["src/index.ts"] }
```

**Create** `packages/renderer/typedoc.json`:
```json
{ "entryPoints": ["src/index.ts"] }
```

**Create** `packages/audio/typedoc.json`:
```json
{ "entryPoints": ["src/index.ts"] }
```

**Create** `packages/controller/typedoc.json`:
```json
{ "entryPoints": ["src/index.ts", "src/scenario/index.ts"] }
```

**Create** `packages/skins/typedoc.json`:
```json
{ "entryPoints": ["src/index.ts", "src/validate.ts"] }
```

**Create** `packages/ventilator/typedoc.json`:
```json
{ "entryPoints": ["src/index.ts"] }
```

**Find** in `package.json`:
```json
    "relay": "pme-relay"
```
**Replace with:**
```json
    "relay": "pme-relay",
    "docs:api": "typedoc"
```

**Find** in `.gitignore`:
```text
packages/validation/datasets/cache/
```
**Replace with:**
```text
packages/validation/datasets/cache/
docs/api/
# the local Pulse build (pulse.wasm) is never committed or distributed (NOTICES N-062, N-084); check-size also refuses it
*.wasm
```

- [ ] **Step 3: NOTICES row and lunr's text** (IDs N-001…N-013 are build/runtime dependencies; **N-014 is TAKEN on `main` since Stage 12** — Project Nayuki's QR code generator, `LICENSES/qrcodegen-MIT.txt` — so this row is **N-015** (rebase check 2026-10-13: free on 56f3761f; `check-notices` fails on a duplicate row ID, `scripts/check-notices.ts:47`); if N-015 is taken too by launch, use the next free `N-01x` and write that ID everywhere this plan says N-015). The generated site redistributes TypeDoc's theme assets (Apache-2.0) and lunr (MIT, bundled into the theme's `main.js`), so the API zip carries `NOTICES.md`, `LICENSES/Apache-2.0.txt` and lunr's text (Task 9). Copy lunr's licence verbatim from the installed package:

```bash
L=$(ls -d node_modules/.pnpm/lunr@*/node_modules/lunr | head -1); V=$(node -p "require('./$L/package.json').version")
cp "$L/LICENSE" "LICENSES/lunr-$V.txt" && head -3 "LICENSES/lunr-$V.txt"   # MIT, with its copyright line
```

In the row below, replace `lunr-<version>` with that file's name (e.g. `lunr-2.3.9`), and the date cell with the day you commit (the `FILL:` marker is checked by `docs-honesty` from Task 12 on).

**Find** in `NOTICES.md`:
```text
| N-060 | Mechanical ventilator simulator v1.9
```
**Replace with:**
```text
| N-015 | TypeDoc 0.28.20 (build only) and its dependencies @gerrit0/mini-shiki, lunr, markdown-it (MIT), minimatch (BlueOak-1.0.0), yaml (ISC) | https://github.com/TypeStrong/typedoc | Apache-2.0 (text in `LICENSES/Apache-2.0.txt`); lunr MIT (text in `LICENSES/lunr-<version>.txt`) | Generates the API reference (`pnpm docs:api` → git-ignored `docs/api/`); the generated site, which embeds TypeDoc's theme assets and lunr, is attached to GitHub releases as `api-reference-v*.zip` together with `NOTICES.md`, `LICENSES/Apache-2.0.txt` and lunr's text; nothing is bundled into the packages or the IIFE | FILL: YYYY-MM-DD |
| N-060 | Mechanical ventilator simulator v1.9
```

(Replace `FILL: YYYY-MM-DD` with the day you commit and `lunr-<version>` with the real file name before committing — `check-licences` fails on a `LICENSES/` path that does not exist.)

- [ ] **Step 4: Build the reference.**

```bash
/usr/bin/time -p npx -y pnpm@9.15.9 docs:api > <scratchpad>/stage-8b-release/typedoc.log 2>&1; echo exit $?
grep -c warning <scratchpad>/stage-8b-release/typedoc.log; ls docs/api/modules; find docs/api -name '*.html' | wc -l; du -sh docs/api
git status --short docs/api | head -1   # must print nothing (git-ignored)
npx -y pnpm@9.15.9 check-notices && npx -y pnpm@9.15.9 check-licences
```

Expected: exit 0 in ≈ 24 s unloaded (prototype 23.8 s; refresh on 48864439: 38.5 s CPU, 3.5 min wall with five other agents running); ≈ 35 warnings (refresh: 36), all "X, defined in …, is referenced by Y but not included in the documentation" (types used by public signatures but not exported — informational, listed in the gate note; do not export engine internals to silence them); `docs/api/modules` lists `_pme_audio.html`, `_pme_controller.index.html`, `_pme_controller.scenario.html`, `_pme_engine-core.html`, `_pme_renderer.html`, `_pme_skins.index.html`, `_pme_skins.validate.html`, `_pme_ventilator.html` (+ the two package pages `_pme_controller.html`, `_pme_skins.html`); ≈ 650 pages (9f864b3; 663 on 48864439), ≈ 8–9.3 MB; nothing to commit under `docs/api`; both checks OK.

- [ ] **Step 5: Commit and push.**

```bash
git add typedoc.json packages/*/typedoc.json package.json pnpm-lock.yaml .gitignore NOTICES.md LICENSES/lunr-*.txt docs/plans/stage-8b-release.md
git commit -m "docs: TypeDoc API reference (build only; pnpm docs:api → git-ignored docs/api), NOTICES N-015

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-8b-release
```

---

### Task 8: The ventilator simulator with the embedded monitor, opened from `file://`

**Files:**
- Create: `apps/demo/src/vent/embed.ts`, `apps/demo/vite.embed.config.ts`, `apps/demo/scripts/build-embed.mjs`, `apps/demo/e2e/vent-embed.e2e.ts`
- Modify: `apps/demo/package.json` (build), `apps/demo/tsconfig.json` (include)

Before starting, read `apps/demo/src/vent/link-page.ts` on `main`: V.1 may have changed how the combined page mounts the monitor and the ventilator (profiles carrying `lungConditions`, absolute `lungState`, the retired interim shunt/recruit). `embed.ts` must mount exactly as `link-page.ts` does after V.1 — the block below mirrors `link-page.ts` as of 9f864b3 (`mountMonitor` with the profile's `patient`, the GA `thermal` event, `attachMonitorToLink`, `createVentDriver(port, profile)`); if V.1 changed any of those calls, copy its new form and note it in the gate note. Typecheck catches signature changes. Refresh 2026-10-10: V.1 has merged, and on 48864439 the block below still mirrors `link-page.ts` (same `mountMonitor` options, GA `thermal` event and `attachMonitorToLink`; typecheck clean; both e2e pass) — FU-11 or Stage 10 may still change the link or `mountMonitor` (e.g. a fast-forward the embed must not offer): compare again on your base.

- [ ] **Step 1: Write the e2e first** (it fails: the page does not exist).

**Create** `apps/demo/e2e/vent-embed.e2e.ts`:
```ts
// Stage 8b: the ventilator-simulator embed (BUILD-PLAN Stage 8 acceptance 5) opened from file:// — no server. The
// page is built by `pnpm build` (apps/demo "build": vite.embed.config.ts + scripts/build-embed.mjs) into
// apps/demo/dist/embed/: the Hamilton ventilator on the left, window.PatientMonitor (the release IIFE) on the right,
// linked in-page (frames in, lungState out).
// Run: pnpm build && PW_SYSTEM_CHROME=1 pnpm exec playwright test apps/demo/e2e/vent-embed.e2e.ts
import { mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

const url = pathToFileURL(resolve(import.meta.dirname, '../dist/embed/ventilator-monitor.html')).href;
const shots = resolve(import.meta.dirname, '../../../docs/gates/stage-8b');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const last = (p: Page, k: string) => p.evaluate((key) => (window as Any).__embed.last[key] as number | undefined, k);
const simT = (p: Page) => p.evaluate(() => (window as Any).__embed.simT() as number);
// Wait until sim time t. The budget comes from the span still to run, assuming only ×1 real time (the page runs two
// engines — the 200 Hz ventilator on the main thread and the monitor in its worker — on a 2-vCPU CI runner that is
// ≈ 4× slower than a Mac for engine work), plus 60 s of slack (orchestrator ruling, 8b review).
const until = async (p: Page, t: number) => {
  const span = Math.max(0, t - (await simT(p)));
  await p.waitForFunction((t) => (window as Any).__embed.simT() >= t, t, { timeout: span * 1000 + 60_000, polling: 250 });
};
const shot = async (p: Page, name: string) => {
  mkdirSync(shots, { recursive: true });
  const path = resolve(shots, `${name}.jpg`);
  for (const quality of [60, 45, 35, 25]) {
    await p.screenshot({ path, type: 'jpeg', quality });
    if (statSync(path).size <= 60_000) break;
  }
  expect(statSync(path).size, `${name}.jpg must be ≤ 60 KB (committed screenshot rule)`).toBeLessThanOrEqual(60_000);
};

test('vent embed: loads from file:// with no errors; the ventilator breathes and the monitor counts its breaths', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.setViewportSize({ width: 1400, height: 800 });
  await page.goto(url);
  expect(await page.evaluate(() => (window as Any).PatientMonitor.version)).toBe('1.0.0-rc.1');
  await page.waitForFunction(() => (window as Any).__embed?.vent.vs.p.breathCount >= 2, null, { timeout: 20_000 });
  await expect.poll(() => last(page, 'awrr'), { timeout: 30_000 }).toBe(14); // vent → engine: the ventilator's 14/min
  await expect.poll(() => last(page, 'spo2'), { timeout: 30_000 }).toBeGreaterThan(90);
  expect(errors).toEqual([]);
});

test('vent embed: FiO2 0.21 at shunt 30 % lowers SpO2 after the §4.3 lag; RR 6 raises EtCO2', async ({ page, browserName }) => {
  // Heavy (≈ 480 sim-s asked at ×4): Chromium only (the G7g/FU-1 rule; headless WebKit cannot hold ×4 on the
  // 2-vCPU runner). 900 s covers the whole run at ×1 real time plus every wait's slack.
  test.skip(browserName === 'webkit', 'long ×4 scenario: Chromium only');
  test.setTimeout(900_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1400, height: 800 });
  await page.goto(url);
  await expect.poll(() => last(page, 'spo2'), { timeout: 30_000 }).toBeGreaterThan(90);
  await page.evaluate(() => {
    const e = (window as Any).__embed;
    e.setSpeed(4); // ×4: the speed this test's budgets are set for (the embed clamps to 0.25–4; Stage 10's ×8 is not used here)
    void e.monitor.dispatch({ id: 'e2e-shunt', issuedBy: 'e2e', type: 'setTarget', variable: 'shunt', value: 0.3 });
    e.setVent({ fio2: 100 });
  });
  const w0 = Date.now(); // for the achieved sim/wall ratio (recorded in the gate note, CI's value too)
  const st0 = await simT(page);
  await until(page, (await simT(page)) + 90);
  const t0 = await simT(page);
  const s0 = (await last(page, 'spo2')) as number;
  await page.evaluate(() => (window as Any).__embed.setVent({ fio2: 21 })); // the ventilator's O2 knob to room air
  await until(page, t0 + 20);
  const s20 = (await last(page, 'spo2')) as number;
  await until(page, t0 + 120);
  const s120 = (await last(page, 'spo2')) as number;
  await shot(page, 'vent-embed-fio2-21');
  // prototype (main 9f864b3, system Chrome): 98 → 98 at +20 s → 92 at +120 s (91 at +150 s); refresh on 48864439: 99 → 99 → 92
  expect(s20).toBeGreaterThanOrEqual(s0 - 1); // the lag: circulation + probe averaging (brief §4.3)
  expect(s120).toBeLessThanOrEqual(s0 - 4);
  await page.evaluate(() => (window as Any).__embed.setVent({ fio2: 40 }));
  await until(page, (await simT(page)) + 60);
  const t1 = await simT(page);
  const c0 = (await last(page, 'etco2')) as number;
  await page.evaluate(() => (window as Any).__embed.setVent({ rate: 6 }));
  await until(page, t1 + 180);
  const c180 = (await last(page, 'etco2')) as number;
  await shot(page, 'vent-embed-rr6');
  // prototype: 38 → 47 mmHg at +180 s (48 at +240 s); refresh on 48864439: 34 → 42; the monitor's awRR reads 6
  expect(c180).toBeGreaterThanOrEqual(c0 + 5);
  expect(await last(page, 'awrr')).toBe(6);
  const simPerWall = Number((((await simT(page)) - st0) / ((Date.now() - w0) / 1000)).toFixed(2));
  console.log(`vent-embed ${JSON.stringify({ s0, s20, s120, c0, c180, simPerWall })}`); // for the gate note
  expect(errors).toEqual([]);
});
```

The waits take their budget from the sim span at ×1 real time (+ 60 s) and the test has 900 s (orchestrator ruling, 8b review: the prototype's 2.3 min on this Mac does not show the CI runner holds ×4 with two engines on the page); the assertions are all in sim time, so no band changed. These two bands are new acceptance tests of THIS stage (BUILD-PLAN acceptance 5: "visibly lowers SpO2 with the §4.3 lag", "RR 6 raises EtCO2 per the kinetics"), set with margin below the prototype. If FU-3/FU-4/V.1 moved the physiology so that a band is missed, do NOT widen it (R45): record the numbers, keep the test as an expected failure — Playwright's `test.fail('<literal title with the measured numbers>', async (…) => …)`, the e2e form of `it.fails` — and report — the cause belongs to the stage that moved it; `scripts/deviations.ts` scans `apps/demo/e2e` too, so the miss must then appear on known-deviations.md (Task 12). If a wait times out on CI, that is the runner's speed, not a band: record `simPerWall` and report; never shorten the sim spans.

- [ ] **Step 2: The embed entry.**

**Create** `apps/demo/src/vent/embed.ts`:
```ts
// The ventilator-simulator embed (BUILD-PLAN Stage 8, Stage 8b): the Hamilton ventilator and the patient monitor
// in ONE page that opens from file:// with no server. The monitor is the release IIFE (window.PatientMonitor, its
// own <script>); this file becomes dist/embed/pme-ventilator-embed.iife.js (vite.embed.config.ts, global
// PmeVentilatorEmbed). Ventilator and monitor talk over an in-page LinkPort pair: the same R27 messages
// vent-link.html sends over BroadcastChannel (frames in, lungState out, the engine as master clock).
import type { MonitorHandle, MountOptions } from '@pme/renderer';
import { attachMonitorToLink, createLocalPortPair, createVentDriver, PROFILES, type ProfileId, type VentConfig, type VentDriver } from '@pme/ventilator';
import { mountHamiltonUi } from './hamilton-ui.ts';

/** The part of window.PatientMonitor the embed needs (structural, so the IIFE is not bundled twice). */
export interface PatientMonitorGlobal {
  version: string;
  mountMonitor(el: HTMLElement, o: MountOptions): MonitorHandle;
}

export interface EmbedOptions {
  /** Element that receives the monitor. */
  monitor: HTMLElement;
  /** Link profile (lung-pathology row id); default 'normal'. */
  profile?: ProfileId;
  /** Monitor skin; default 'philips-like'. */
  skin?: string;
  /** Defaults to window.PatientMonitor. */
  pm?: PatientMonitorGlobal;
}

export interface Embed {
  vent: VentDriver;
  monitor: MonitorHandle;
  /** Latest measured numerics by key (spo2, etco2, hr, abpMean, …), for pages and tests. */
  last: Record<string, number>;
  /** Engine sim time of the newest state event (s). */
  simT(): number;
  /** Change ventilator settings, as a user turning its knobs would (a link `control` message). */
  setVent(patch: Partial<VentConfig>): void;
  /** Time scale for both sides, clamped to 0.25–4: the speeds the embed is tested at (the engine itself allows up to MAX_TIME_SCALE). */
  setSpeed(k: number): void;
  destroy(): void;
}

export function mountEmbed(o: EmbedOptions): Embed {
  const pm = o.pm ?? (globalThis as unknown as { PatientMonitor?: PatientMonitorGlobal }).PatientMonitor;
  if (!pm) throw new Error('window.PatientMonitor is missing: load patient-monitor.iife.js before pme-ventilator-embed.iife.js');
  const id: ProfileId = o.profile && o.profile in PROFILES ? o.profile : 'normal';
  const [ventSide, monitorSide] = createLocalPortPair();
  const monitor = pm.mountMonitor(o.monitor, {
    skin: o.skin ?? 'philips-like',
    engine: { seed: 7, patient: (PROFILES[id] ?? PROFILES.normal)!.patient },
    lanes: ['ecgII'], waves: ['abp', 'cvp', 'pleth', 'co2'], temp: false,
  });
  // a sedated, ventilated patient (as vent-link.html): general-anaesthesia thermal/metabolic state
  void monitor.dispatch({ id: 'embed-ga', issuedBy: 'vent-embed', type: 'applyEvent', event: { kind: 'thermal', anaesthesia: 'general' } });
  const detach = attachMonitorToLink(monitor, monitorSide, (c, r) => console.warn('link command rejected', c.type, r));
  const vent = createVentDriver(ventSide, id);
  const ui = mountHamiltonUi(vent);
  const last: Record<string, number> = {};
  let t = 0;
  const off = monitor.on((e) => {
    if (e.type === 'state') t = e.t;
    if (e.type === 'measurement') for (const [k, v] of Object.entries(e.values)) if (v && v.value !== null) last[k] = v.value;
  });
  return {
    vent, monitor, last,
    simT: () => t,
    setVent: (patch) => monitorSide.post({ v: 1, kind: 'control', patch }),
    setSpeed(k) {
      const s = Math.min(4, Math.max(0.25, k));
      monitor.setTimeScale(s);
      vent.scale = s;
    },
    destroy() {
      off();
      ui.stop();
      detach();
      vent.dispose();
      monitor.destroy();
    },
  };
}
```

**Create** `apps/demo/vite.embed.config.ts`:
```ts
import { defineConfig } from 'vite';

// The ventilator-simulator embed (Stage 8b): src/vent/embed.ts as one classic script, global PmeVentilatorEmbed.
// It needs window.PatientMonitor (packages/renderer/dist/patient-monitor.iife.js) at run time; scripts/build-embed.mjs
// then writes dist/embed/ventilator-monitor.html next to both files. Runs after the page build (which empties dist/).
export default defineConfig({
  build: {
    lib: { entry: 'src/vent/embed.ts', name: 'PmeVentilatorEmbed', formats: ['iife'], fileName: () => 'pme-ventilator-embed.iife.js' },
    outDir: 'dist/embed',
    emptyOutDir: true,
    sourcemap: true,
  },
});
```

**Create** `apps/demo/scripts/build-embed.mjs`:
```js
// Writes dist/embed/ventilator-monitor.html (Stage 8b): vent-hamilton.html's markup and CSS, the monitor on the
// right half, and two classic scripts instead of the Vite module entry, so the folder opens from file:// with no
// server. Copies the release IIFE (with its source map, so its sourceMappingURL resolves) beside it, and LICENSE,
// NOTICES.md and LICENSES/ into the folder, so every copy of the embed carries its licence texts (8b review ruling 1).
// Every anchor must match exactly once, or the build fails.
import { copyFileSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const here = import.meta.dirname;
const out = resolve(here, '../dist/embed');
let html = readFileSync(resolve(here, '../vent-hamilton.html'), 'utf8');
const swap = (find, repl) => {
  const n = html.split(find).length - 1;
  if (n !== 1) throw new Error(`build-embed: anchor found ${n} times: ${find}`);
  html = html.replace(find, repl);
};
swap(/<title>[^<]*<\/title>/.exec(html)?.[0] ?? '<title>', '<title>Ventilator + patient monitor (file:// embed)</title>');
swap('</style>', `/* embed: ventilator on the left half, monitor on the right */
#screen{right:50%}
#sheet,.scrim{right:50%}
#pme-monitor{position:fixed;top:0;right:0;bottom:0;left:50%;background:#000;border-left:1px solid #1d3f7c}
</style>`);
swap('<script type="module" src="./src/vent/hamilton-page.ts"></script>', `<div id="pme-monitor"></div>
<script src="./patient-monitor.iife.js"></script>
<script src="./pme-ventilator-embed.iife.js"></script>
<script>
  // profile from ?profile=<lung-pathology id>; window.__embed is the page's handle (e2e hook)
  var q = new URLSearchParams(location.search);
  window.__embed = PmeVentilatorEmbed.mountEmbed({ monitor: document.getElementById('pme-monitor'), profile: q.get('profile') || 'normal' });
</script>`);
writeFileSync(resolve(out, 'ventilator-monitor.html'), html);
const repo = resolve(here, '../../..');
for (const f of ['patient-monitor.iife.js', 'patient-monitor.iife.js.map']) copyFileSync(resolve(repo, 'packages/renderer/dist', f), resolve(out, f));
for (const f of ['LICENSE', 'NOTICES.md']) copyFileSync(resolve(repo, f), resolve(out, f));
cpSync(resolve(repo, 'LICENSES'), resolve(out, 'LICENSES'), { recursive: true });
console.log('build-embed: dist/embed/ventilator-monitor.html + patient-monitor.iife.js(.map) + LICENSE, NOTICES.md, LICENSES/');
```

**Find** in `apps/demo/package.json`:
```json
    "build": "vite build",
```
**Replace with:**
```json
    "build": "vite build && vite build -c vite.embed.config.ts && node scripts/build-embed.mjs",
```

**Find** in `apps/demo/tsconfig.json`:
```json
  "include": ["src", "e2e", "vite.config.ts"]
```
**Replace with:**
```json
  "include": ["src", "e2e", "vite.config.ts", "vite.embed.config.ts"]
```

- [ ] **Step 3: Build and run.**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo exec tsc -p tsconfig.json
npx -y pnpm@9.15.9 build
ls -la apps/demo/dist/embed/
node -e 'const z=require("zlib"),b=require("fs").readFileSync("apps/demo/dist/embed/pme-ventilator-embed.iife.js");console.log("embed raw",b.length,"gzip",z.gzipSync(b,{level:9}).length)'
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/vent-embed.e2e.ts
ls -la docs/gates/stage-8b/
```

Expected: typecheck clean; `dist/embed/` holds `ventilator-monitor.html` (≈ 13.5 KB), `patient-monitor.iife.js` + `.map`, `pme-ventilator-embed.iife.js` (+ map), `LICENSE`, `NOTICES.md` and `LICENSES/`; embed ≈ 122 KB raw / ≈ 40 KB gzip (it must NOT contain the engine's VF/AF templates: if it is ≈ 260 KB the `sideEffects` settings of Task 4 are missing — engine-core now uses the two-file list, not `false`: record the measured size; if it is well above 122 KB, report it rather than reverting to `false`); `grep -c "onApply.push\|onBeat.push" packages/renderer/dist/patient-monitor.iife.js` still finds the ECG hook registrations (reviewer: 2× `onApply.push`, 1× `onBeat.push`); e2e 2/2 in ≈ 2.3 min with `vent-embed {"s0":99,"s20":99,"s120":92,"c0":34,"c180":42,"simPerWall":4.01}` (refresh on 48864439; `{"s0":98,"s20":98,"s120":92,"c0":38,"c180":47,…}` in the 9f864b3 prototype — the EtCO2 rise margin over the band shrank from 4 to 3 mmHg, so FU-7.1-b's gas changes, e.g. the B3 washout, may move it: a miss is a `test.fail` with numbers, never a wider band) and `simPerWall` ≈ 4 locally; two JPEGs ≤ 60 KB (asserted by the test). **Mandatory:** open `apps/demo/dist/embed/ventilator-monitor.html` by double-click in Safari once (acceptance 5 names Safari and Chrome; WebKit is not installed for Playwright here) and record the result and the Safari version (Safari → About Safari) for the gate note. After the push (Step 4), check CI on the draft PR (bounded, as in Task 2 Step 5): the embed's light test on WebKit.

- [ ] **Step 4: Commit and push.**

```bash
git status --short docs/gates   # restore any other stage's screenshot the e2e rewrote: git checkout -- <path>
git add apps/demo/src/vent/embed.ts apps/demo/vite.embed.config.ts apps/demo/scripts/build-embed.mjs apps/demo/e2e/vent-embed.e2e.ts \
  apps/demo/package.json apps/demo/tsconfig.json docs/gates/stage-8b/*.jpg docs/plans/stage-8b-release.md
git commit -m "feat(demo): the ventilator with the embedded monitor, from file:// (release IIFE + 40 KB embed script), e2e acceptance 5

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-8b-release
```

---

### Task 9: CI checks and the release workflow

**Files:** Modify `.github/workflows/ci.yml` (additive only); Create `.github/workflows/release.yml`.

- [ ] **Step 1: CI.** The build job gains the two checks, the pack smoke and the TypeDoc build (8b review finding 8: a later PR that breaks the published shape or TypeDoc must fail before merge, not at the tag); the `test-slow` job and `validation.yml` are untouched. **Rebase check 2026-10-13 — CI was reshaped by PR #55 (`docs/gates/ci-webkit-3.md`):** the IIFE is now built and uploaded by a separate `renderer` job (`pnpm --filter @pme/renderer build` only), and the browser tests run in a per-browser matrix job `e2e` (`needs: renderer`) that downloads ONLY the IIFE artefact. Two consequences the 2026-10-10 blocks did not handle: (a) after Task 4 the renderer's `build` runs `tsc -p tsconfig.build.json`, whose `paths` point at the SIBLINGS' `dist/types` — in the `renderer` job nothing else is built, so the declaration build would fail (not executed in the check: tsc falls back to the workspace `src/` and errors outside `rootDir`); (b) `vent-embed.e2e.ts` opens `apps/demo/dist/embed/`, which no e2e job has. So the `renderer` job now builds the renderer's workspace dependencies first and, after the IIFE upload, the demo (whose `build` writes the embed, Task 8) and uploads `ventilator-monitor-embed`; each `e2e` job downloads it. All four blocks only ADD lines; `test-slow` keeps its eight groups (`slow-a` … `slow-g` + `showcase`, Stage 11). After applying them, prove it: `git diff -U0 .github/workflows/ci.yml | grep '^-[^-]'` must print nothing (no line removed or changed), and `grep -c 'slow-g' .github/workflows/ci.yml` must print the same number as on `main` (5 on 48864439 and on 56f3761f). Note for CI time: each `e2e (<browser>)` job now also runs `vent-embed.e2e.ts` (≈ 2.2 min at ×4 here; the heavy case is Chromium-only, up to 15 min if the runner holds only ×1; the job's `timeout-minutes: 60` stays), and the `renderer` job grows by the sibling builds and the demo build (≈ 1–2 min), which delays the e2e jobs by that much.

**Find** in `.github/workflows/ci.yml`:
```yaml
      - run: pnpm check-notices
```
**Replace with:**
```yaml
      - run: pnpm check-notices
      - run: pnpm check-licences # Stage 8b: allow-listed licences; shipped packages named in NOTICES with their LICENSES/ texts
      - run: pnpm check-size # Stage 8b: patient-monitor.iife.js ≤ 400 KB gzipped (BUILD-PLAN Stage 8 acceptance 4); no .wasm
      - run: pnpm pack-smoke "$RUNNER_TEMP/pack-smoke" # Stage 8b: the published shape installs, type-checks, runs and bundles (15–30 s)
      - run: pnpm docs:api # Stage 8b: the TypeDoc reference still builds (25–55 s; output git-ignored, not uploaded)
```

In the `renderer` job (rebase check 2026-10-13: the renderer's declaration build needs its siblings' `dist/types`):

**Find** in `.github/workflows/ci.yml`:
```yaml
      - run: pnpm --filter @pme/renderer build
```
**Replace with:**
```yaml
      - run: pnpm --filter "@pme/renderer^..." build # Stage 8b: the renderer's workspace dependencies first (its tsconfig.build.json reads their dist/types)
      - run: pnpm --filter @pme/renderer build
```

Still in the `renderer` job, after the IIFE upload (the demo's `build` copies the IIFE into the embed, Task 8):

**Find** in `.github/workflows/ci.yml`:
```yaml
          path: packages/renderer/dist/patient-monitor.iife.js
          if-no-files-found: error
```
**Replace with:**
```yaml
          path: packages/renderer/dist/patient-monitor.iife.js
          if-no-files-found: error
      - run: pnpm --filter @pme/demo build # Stage 8b: writes apps/demo/dist/embed/ (the file:// ventilator + monitor embed)
      - uses: actions/upload-artifact@v4 # Stage 8b: the file:// ventilator + monitor embed
        with:
          name: ventilator-monitor-embed
          path: apps/demo/dist/embed/
          if-no-files-found: error
```

In the `e2e` matrix job, next to the IIFE download (`vent-embed.e2e.ts` opens `apps/demo/dist/embed/ventilator-monitor.html`):

**Find** in `.github/workflows/ci.yml`:
```yaml
          path: packages/renderer/dist
      - run: pnpm exec playwright install --with-deps ${{ matrix.browser }}
```
**Replace with:**
```yaml
          path: packages/renderer/dist
      - uses: actions/download-artifact@v4 # Stage 8b: the embed for vent-embed.e2e.ts
        with:
          name: ventilator-monitor-embed
          path: apps/demo/dist/embed
      - run: pnpm exec playwright install --with-deps ${{ matrix.browser }}
```

- [ ] **Step 2: Release workflow** (runs only on a `v*` tag, which only the orchestrator pushes).

**Create** `.github/workflows/release.yml`:
```yaml
name: release

# Stage 8b. Runs when the ORCHESTRATOR pushes a `v*` tag on main (RELEASE.md; executors never tag). Rebuilds the
# tagged commit, re-runs the release checks and publishes a GitHub release with the single-file IIFE, the file://
# ventilator + monitor embed and the API reference attached. Tests stay in ci.yml (fast/slow split) and
# validation.yml; this workflow does not replace them.
on:
  push:
    tags: ['v*']

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: The tag matches the package versions
        run: test "$GITHUB_REF_NAME" = "v$(node -p "require('./packages/renderer/package.json').version")"
      - run: pnpm typecheck
      - run: PME_BUILD="${GITHUB_SHA::7}" pnpm build # the build-unique engine key (Task 5, FU-11 A1); CI and local builds say 'dev'
      - run: pnpm check-notices
      - run: pnpm check-licences
      - run: pnpm check-size
      - run: pnpm exec playwright install --with-deps chromium webkit
      - run: pnpm exec playwright test apps/demo/e2e/iife-smoke.e2e.ts apps/demo/e2e/vent-embed.e2e.ts
      - run: pnpm pack-smoke "$RUNNER_TEMP/pack-smoke"
      - run: pnpm docs:api
      - name: Assemble the release assets
        run: |
          set -euo pipefail
          V="$GITHUB_REF_NAME"
          mkdir -p release
          cp packages/renderer/dist/patient-monitor.iife.js packages/renderer/dist/patient-monitor.iife.js.map LICENSE NOTICES.md release/
          zip -qr release/LICENSES.zip LICENSES   # the full third-party texts, beside the standalone IIFE
          # build-embed.mjs already put LICENSE, NOTICES.md and LICENSES/ into the embed folder: refuse a zip without them
          test -f apps/demo/dist/embed/LICENSE && test -f apps/demo/dist/embed/NOTICES.md && test -f apps/demo/dist/embed/LICENSES/Apache-2.0.txt
          (cd apps/demo/dist/embed && zip -qr "../../../../release/ventilator-monitor-embed-$V.zip" .)
          cp LICENSE NOTICES.md docs/api/
          cp LICENSES/Apache-2.0.txt docs/api/TYPEDOC-ASSETS-LICENSE-Apache-2.0.txt
          cp LICENSES/lunr-*.txt docs/api/   # lunr (MIT) is bundled in the theme's main.js
          (cd docs/api && zip -qr "../../release/api-reference-$V.zip" .)
          awk -v v="${V#v}" 'index($0, "## [" v "]") == 1 {on = 1; next} /^## \[/ || /^\[[^]]+\]: / {on = 0} on' CHANGELOG.md > release/NOTES.md
          test -s release/NOTES.md
          (cd release && sha256sum patient-monitor.iife.js patient-monitor.iife.js.map "ventilator-monitor-embed-$V.zip" "api-reference-$V.zip" \
            LICENSES.zip LICENSE NOTICES.md > SHA256SUMS.txt)
      - name: Publish the GitHub release
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          V="$GITHUB_REF_NAME"
          PRE=""; case "$V" in *-*) PRE="--prerelease" ;; esac   # v1.0.0-rc.1 → a GitHub pre-release (Q8)
          gh release create "$V" --verify-tag $PRE --title "patient-monitor-engine $V" --notes-file release/NOTES.md \
            release/patient-monitor.iife.js release/patient-monitor.iife.js.map \
            "release/ventilator-monitor-embed-$V.zip" "release/api-reference-$V.zip" release/LICENSES.zip \
            release/SHA256SUMS.txt release/LICENSE release/NOTICES.md
```

- [ ] **Step 3: Validate the YAML and dry-run the asset assembly locally.**

```bash
Y=$(ls -d node_modules/.pnpm/yaml@*/node_modules/yaml | head -1)   # TypeDoc's dependency; no new install
for f in .github/workflows/*.yml; do node -e "const Y=require('./$Y');const d=Y.parse(require('fs').readFileSync('$f','utf8'));console.log('$f',Object.keys(d.jobs).join(','))"; done
```

Expected: `ci.yml build,renderer,e2e,test-slow` (PR #55 shape; it was `build,test-slow` on 48864439), `release.yml release`, `validation.yml validate`. Then, after Task 13 exists, run the "Assemble the release assets" script body by hand from the worktree root (after `build` and `docs:api`) with `GITHUB_REF_NAME=v1.0.0-rc.1`, writing into `<scratchpad>/stage-8b-release/release-dry/` instead of `release/` (use `shasum -a 256` for `sha256sum` on macOS; the `cp` into `docs/api/` is git-ignored), and check: `NOTES.md` is exactly the `## [1.0.0-rc.1]` section without the trailing `[Unreleased]: …` / `[1.0.0-rc.1]: …` link lines (refresh dry run: the old `awk` kept them — Decision 30); the "Publish" step's `case` gives `--prerelease` for `v1.0.0-rc.1` and nothing for a plain `v1.0.0` (checked in the refresh); `unzip -l` of the embed zip lists `LICENSE`, `NOTICES.md`, `LICENSES/…` and `patient-monitor.iife.js.map`; the API zip lists `LICENSE`, `NOTICES.md`, the Apache text and the lunr text; `SHA256SUMS.txt` has seven lines.

- [ ] **Step 4: Commit and push.**

```bash
git add .github/workflows/ci.yml .github/workflows/release.yml docs/plans/stage-8b-release.md
git commit -m "ci: check-licences, check-size, pack-smoke, docs:api and the embed artefact in CI; release workflow on v* tags (IIFE, embed, API reference, licence texts)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-8b-release
```

(CI runs on pull requests and on `main`: the draft PR opened in Task 2 runs these new steps on this push — check them, bounded, as in Task 2 Step 5. `pack-smoke` needs the npm registry, which the runner has.)

---
### Task 10: README, screenshots, CITATION, CONTRIBUTING, SECURITY, issue templates

Counts quoted below (36 rhythms, 65 drugs, six skins, two themes, one preset) are from `main` 56f3761f (rebase check 2026-10-13; 64 drugs on 48864439, 58 on 9f864b3 — FU-7.1-a added potassium chloride): recount on your branch (`RHYTHM_IDS`, `DRUG_IDS`, `SKIN_IDS`) and correct the text. The README must describe what a visitor meets first since Stage 9 — the one-page clinical app (`apps/demo/index.html`; its views are the files in `apps/demo/src/app/views/`: start, monitor, teach, explore, vent, remote, settings, validate, dev, plus `debrief` (Stage 13) and `follower` (FU-11 d second screen / Stage 12 phone) on 56f3761f — name them as the app labels them on your base) — and the release-candidate status; the build-stage demo pages are "developer pages" (Task 13b decides which remain).

**Files:** Overwrite `README.md`; Create `apps/demo/scripts/readme-shots.mjs`, `docs/images/monitor-philips-like.jpg`, `docs/images/ventilator-embed.jpg` (by the script), `CITATION.cff`, `CONTRIBUTING.md`, `SECURITY.md`, `.github/ISSUE_TEMPLATE/{bug_report.md,realism_report.md,feature_request.md,config.yml}`.

- [ ] **Step 1: README screenshots** (file:// pages only; each ≤ 60 KB).

**Create** `apps/demo/scripts/readme-shots.mjs`:
```js
// README screenshots (Stage 8b), each ≤ 60 KB, from file:// pages only (no dev server): the release IIFE mounted
// with the philips-like skin, and the ventilator + monitor embed. Run after `pnpm build`, from the repo root:
//   node apps/demo/scripts/readme-shots.mjs      (system Chrome)
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const demo = resolve(import.meta.dirname, '..');
const out = resolve(demo, '../../docs/images');
mkdirSync(out, { recursive: true });
const page0 = resolve(demo, 'dist/readme-monitor.html'); // dist/ is git-ignored build output
writeFileSync(page0, `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#000">
<div id="pm" style="height:560px"></div>
<script src="../../../packages/renderer/dist/patient-monitor.iife.js"></script>
<script>PatientMonitor.mountMonitor(document.getElementById('pm'), { skin: 'philips-like', lanes: ['ecgII', 'V5'], waves: ['abp', 'pleth', 'co2'], nibp: true,
  engine: { seed: 3, patient: { ageY: 55, weightKg: 70, heightCm: 175, sex: 'M', sensors: { abp: 'connected', spo2: 'on', co2: 'on', temp: 'on' } } } });</script>`);
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1100, height: 560 } });
const shot = async (name) => {
  const path = resolve(out, `${name}.jpg`);
  for (const quality of [70, 55, 45, 35, 25]) {
    await page.screenshot({ path, type: 'jpeg', quality });
    if (statSync(path).size <= 60_000) break;
  }
  const size = statSync(path).size;
  if (size > 60_000) throw new Error(`readme-shots: ${name}.jpg is ${size} B, over the 60 KB cap for committed images`);
  console.log(name, size, 'bytes');
};
await page.goto(pathToFileURL(page0).href);
await page.waitForTimeout(12_000); // HR/SpO2 averaging windows filled, one NIBP-free sweep drawn
await shot('monitor-philips-like');
await page.setViewportSize({ width: 1400, height: 800 });
await page.goto(pathToFileURL(resolve(demo, 'dist/embed/ventilator-monitor.html')).href);
await page.waitForTimeout(15_000);
await shot('ventilator-embed');
await browser.close();
```

Run: `npx -y pnpm@9.15.9 build && node apps/demo/scripts/readme-shots.mjs` → two lines, each ≤ 60,000 bytes (the script throws above that) (prototype: `monitor-philips-like 53886 bytes`, `ventilator-embed 56398 bytes`). Open both images and check they show a live monitor (ECG, ABP, pleth, CO2, numerics) and the ventilator with the monitor beside it. If a numeric reads `--`, raise the wait, not the quality.

- [ ] **Step 2: README.**

**Overwrite** `README.md`:
````markdown
# patient-monitor-engine

An open-source (MIT) **simulated patient monitor** for web-based teaching simulators: ACLS/BLS, operating-room and
anaesthesia training, and the Hamilton-style ventilator simulator in this repository.

**Status: release candidate `1.0.0-rc.1` — a pre-release, not a final v1.0.** What remains before 1.0.0 and the plan
for v2.0 are in the [roadmap](docs/roadmap/README.md).

![The monitor with the philips-like skin](docs/images/monitor-philips-like.jpg)

## What it is

- **A one-page clinical teaching app** (`apps/demo`, `index.html`): set up a patient, run the monitor, give drugs and
  fluids, explore the physiology and drive the ventilator view, from one page (FILL: the view names as the app labels
  them on your branch). Time runs at up to ×8 with a 2- or 5-minute fast-forward; a learner monitor can follow on a
  second screen in the same browser or on learners' phones over a classroom relay (Node ≥ 22 on the instructor's
  computer; FILL: say "not yet tested on a real phone" if Stage 12 gate step 4 is still PENDING-OWNER); a Debrief
  report prints to PDF.

- **Channels:** ECG (3/5/12-lead), invasive pressures (ABP, CVP, PAP, and ICP where the organ model supplies it),
  NIBP with a real cuff cycle, SpO2 and pleth, EtCO2 and capnogram, temperature, respiratory rate.
- **Two physiology modes over one state:**
  - **MANUAL** — the instructor sets targets and ramps; fixed coupling rules keep the channels consistent.
  - **MODELED** — a lumped, teaching-grade physiology: four-chamber time-varying-elastance circulation, two-compartment
    lungs with gas exchange, blood chemistry, brain/kidney/liver, endocrine and thermal state, pharmacokinetics and
    pharmacodynamics of 65 drugs, a ventilatory drive and neuromuscular block. See
    [the physiology overview](docs/guides/physiology-overview.md) for what is modelled and what is not.
- **Device behaviour, not only waveforms:** numerics are *measured* (averaging, lags, probe states), NIBP cycles,
  IEC-style alarms with sound, pacer and defibrillator, 12-lead capture, trends and an event log.
- **Skins as data:** six monitor looks (`saadat-like`, `philips-like`, `zoll-like`, `ge-like`, `mindray-like`,
  `lifepak-like`) and two themes, validated JSON with a provenance for every value.
- **Control:** a same-screen instructor panel, remote controllers over BroadcastChannel, WebSocket or WebRTC, and a
  scenario runner for `pme-scenario/1` documents.
- **Embeddable:** ES modules, or **one file** — `patient-monitor.iife.js` works from `file://` with no server.

## What it is not

- **Not a medical device** and not for diagnosis, monitoring or treatment of real patients.
- **Not clinically validated.** The realism of the waveforms and the physiology has been *measured* against public
  recordings and published models, and every known miss is listed openly — see the
  [validation summary](docs/guides/validation-summary.md) and the [known deviations](docs/guides/known-deviations.md).
  The MODELED physiology is a teaching model whose calibration is ongoing.
- **Adults only, and not complete.** Among the limits of this release candidate: during compensated haemorrhage the
  systemic vascular resistance falls instead of rising; there is no decompensation or reflex-collapse model; there is
  no sepsis model fit for teaching. The full list is in the [CHANGELOG](CHANGELOG.md) under "Known limitations".
- **Not affiliated with any monitor manufacturer.** The `-like` skins evoke a general look; no logos or trade dress.
  Alarms are "IEC-style"; no IEC 60601-1-8 compliance is claimed.

## Quick start

**One file, from `file://`.** Download `patient-monitor.iife.js` from the
[latest release](https://github.com/samhv-dev/patient-monitor-engine/releases/latest), then:

```html
<div id="pm" style="height: 420px"></div>
<script src="patient-monitor.iife.js"></script>
<script>
  const pm = PatientMonitor.mountMonitor(document.getElementById('pm'), { skin: 'philips-like', engine: { seed: 7 } });
  pm.dispatch({ id: 'c1', issuedBy: 'page', type: 'setRhythm', rhythm: 'afib' });
</script>
```

**ES modules.** Build from source (below) and depend on the workspace packages; the packages are publishable
(`pnpm pack`) but are not on npm at this release candidate. See the [embedding guide](docs/guides/embedding.md).

**The ventilator with the monitor.** The release asset `ventilator-monitor-embed-v1.0.0-rc.1.zip` opens by double-click:
the Hamilton-style ventilator on the left drives the monitor's physiology on the right.

![The ventilator simulator with the embedded monitor](docs/images/ventilator-embed.jpg)

## Build from source

Node ≥ 22.12 and pnpm 9.15.9 (`corepack enable`, or prefix every command with `npx -y pnpm@9.15.9`).

```bash
pnpm install
pnpm typecheck && PME_TEST_SET=fast pnpm test && pnpm build   # the fast set; CONTRIBUTING.md has the slow one
pnpm --filter @pme/demo dev          # the clinical app (and the developer pages), http://localhost:5173
pnpm test:e2e                        # Playwright browser checks
pnpm docs:api                        # TypeDoc API reference → docs/api/
pnpm validate                        # the validation harness (30–60 min; downloads public datasets)
```

## Repository

| Path | What |
|---|---|
| `packages/engine-core` | the engine: rhythm engine, circulation, lungs and gas, blood, organs, drugs, device layer (no DOM) |
| `packages/renderer` | Canvas2D sweep renderer, numerics, `mountMonitor()`; builds `patient-monitor.iife.js` |
| `packages/audio` | QRS beep and alarm tones (Web Audio) |
| `packages/controller` | commands, transports, instructor panel, scenario runner, WebSocket relay |
| `packages/skins` | skins and themes as validated JSON |
| `packages/ventilator` | the ventilator simulation and its two-way link to the engine |
| `packages/validation` | the validation harness, blind-review tool and reports |
| `apps/demo` | demo pages, the ventilator embed and the Playwright tests |
| `docs/` | [design brief](docs/DESIGN-BRIEF.md), [build plan](docs/BUILD-PLAN.md), [guides](docs/guides/), stage plans and gate notes |

## Documentation

- [Embedding guide](docs/guides/embedding.md) — ESM and IIFE, options, commands, events, the ventilator example
- [Scenario authoring](docs/guides/scenario-authoring.md) — `pme-scenario/1`
- [Skin authoring](docs/guides/skin-authoring.md)
- [Physiology overview](docs/guides/physiology-overview.md) — what MANUAL and MODELED do, organ by organ
- [Validation summary](docs/guides/validation-summary.md) and [known deviations](docs/guides/known-deviations.md)
- API reference: `pnpm docs:api`, or `api-reference-<version>.zip` on each release
- [Roadmap](docs/roadmap/README.md) — what remains for 1.0.0 and the v2.0 plan

## Licence, data and citation

The code is [MIT](LICENSE) (© Ali Mahdavi and contributors). The engine bundles short ECG templates derived from
PhysioNet databases under ODC-By 1.0, and some modules are derived from Apache-2.0 sources; every third-party item and
its attribution is listed in [NOTICES.md](NOTICES.md), and the full third-party licence texts are in
[LICENSES/](LICENSES/); both travel with every build and release asset. Validation datasets are
downloaded, never committed. To cite this software, use [CITATION.cff](CITATION.cff).

[Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Changelog](CHANGELOG.md)
````

- [ ] **Step 3: Citation, contributing, security.**

**Create** `CITATION.cff`:
```yaml
cff-version: 1.2.0
message: "If you use this software, please cite it as below."
title: "patient-monitor-engine: an open-source simulated patient monitor for teaching simulators"
type: software
authors:
  - family-names: Mahdavi
    given-names: Ali
version: 1.0.0-rc.1
license: MIT
repository-code: "https://github.com/samhv-dev/patient-monitor-engine"
abstract: >-
  A TypeScript engine and renderer that simulate a bedside patient monitor (ECG, invasive and non-invasive blood
  pressure, SpO2 and pleth, capnography, temperature) for simulation-based medical education, with MANUAL
  (instructor-driven) and MODELED (lumped physiology and pharmacology) modes, device-behaviour realism, data-only
  skins, remote control, a scenario runner and a validation harness. Not a medical device.
keywords:
  - medical simulation
  - patient monitor
  - anaesthesia education
  - physiology model
  - TypeScript
```

(`date-released` is added in Task 13 with the CHANGELOG date. No e-mail: none appears in the repository. No DOI at the release candidate (Q5, ruled): enabling Zenodo and adding `doi:` is a follow-up for 1.0.0.)

**Create** `CONTRIBUTING.md`:
````markdown
# Contributing

Thank you for helping. This project is an educational simulator: correctness of *behaviour* matters more than
features, and every borrowed idea must be traceable.

## Set up

Node ≥ 22.12, pnpm 9.15.9 (`corepack enable`, or `npx -y pnpm@9.15.9 …`).

```bash
pnpm install
pnpm typecheck
PME_TEST_SET=fast pnpm test                       # what CI's build job runs
PME_TEST_SET=slow pnpm --filter @pme/engine-core test   # the multi-sim-hour set (CI's test-slow job)
pnpm build && pnpm check-notices && pnpm check-licences && pnpm check-size
pnpm test:e2e                                      # Playwright; PW_SYSTEM_CHROME=1 uses your installed Chrome
```

## Rules that CI or review enforce

1. **One piece of work per pull request**, described in the PR template (including "Sources consulted").
2. **Never loosen a test band to make it pass.** If the model misses a published band, keep the band, mark the test
   `it.fails` with the measured number in its title, and add a row to
   [docs/guides/known-deviations.md](docs/guides/known-deviations.md) (the `docs-honesty` test checks this). Fix the
   mechanism instead.
3. **Provenance.** Every borrowed code file, data table, template or dependency gets a row in [NOTICES.md](NOTICES.md)
   in the same PR; files under `packages/*/src/vendor/**` and `packages/engine-core/templates/**` start with a
   `NOTICE-ID` header (`pnpm check-notices`). Dependencies must have a permissive licence (`pnpm check-licences`).
4. **Forbidden sources** (brief §8): do not open ECGSYN or its ports, the PhysioNet ECG/PPG arrhythmia simulator, the
   Python Anesthesia Simulator, or any unlicensed repository. Clean-room implementations from papers are welcome;
   cite the paper beside the equation.
5. **Long engine tests yield.** A test that runs the engine for more than one simulated minute advances one simulated
   minute at a time and yields to the event loop between minutes (see `packages/engine-core/test/helpers/`); the CI
   runner has 2 vCPUs.
6. **Heavy browser tests run in Chromium only** (`test.skip(browserName === 'webkit', …)`); committed screenshots are
   ≤ 60 KB.
7. **No clinical claims.** Documentation describes what the model does and how it was measured; it never claims
   clinical validation or suitability for patient care.

## Reporting realism problems

Use the "Clinical realism" issue template: the scenario, the mode (MANUAL or MODELED), what a clinician expects with a
source, and what the monitor showed. Never attach patient data or identifiers.
````

**Create** `SECURITY.md`:
```markdown
# Security policy

## Supported versions

Security fixes are made on the latest release (now the `1.0.0-rc.1` pre-release; then the 1.x line).

## Reporting a vulnerability

Please report privately through GitHub's "Report a vulnerability" (Security → Advisories) on
https://github.com/samhv-dev/patient-monitor-engine. Do not open a public issue. You should receive an answer within
two weeks.

## Scope

In scope: the WebSocket relay (`packages/controller/relay`), the transports that accept messages from other windows or
peers (postMessage, BroadcastChannel, WebSocket, WebRTC) and their role/session checks, the loading and validation of
scenario, skin and snapshot JSON, and the published build artefacts.

Out of scope: clinical accuracy (use the "Clinical realism" issue template instead). This software is a teaching
simulator and is not a medical device; it must never be connected to patients or used for clinical decisions.
```

- [ ] **Step 4: Issue templates.**

**Create** `.github/ISSUE_TEMPLATE/config.yml`:
```yaml
blank_issues_enabled: true
contact_links:
  - name: Security vulnerability
    url: https://github.com/samhv-dev/patient-monitor-engine/security/advisories/new
    about: Report security problems privately (see SECURITY.md), not as an issue.
```

**Create** `.github/ISSUE_TEMPLATE/bug_report.md`:
```markdown
---
name: Bug report
about: Something does not work (build, API, rendering, audio, controller, embed)
labels: bug
---

**What happened**

**What you expected**

**How to reproduce** (commands, page, scenario file, seed; the smallest case you can)

**Environment** (package version or commit, browser and version, OS/device, IIFE or ESM, worker path from `renderPath`)

**Console output or screenshot** (≤ 60 KB)
```

**Create** `.github/ISSUE_TEMPLATE/realism_report.md`:
```markdown
---
name: Clinical realism
about: The monitor or the physiology behaves unlike a real patient or a real monitor
labels: realism
---

**Scenario** (page or `pme-scenario/1` document, seed, patient profile)

**Mode:** MANUAL / MODELED

**What happened on the monitor** (numbers with times; a screenshot ≤ 60 KB helps)

**What a clinician expects, with a source** (guideline, textbook, paper or monitor manual; a range, not one number)

**Is it already listed in docs/guides/known-deviations.md?**

Never attach patient data or identifiers.
```

**Create** `.github/ISSUE_TEMPLATE/feature_request.md`:
```markdown
---
name: Feature request
about: A channel, rhythm, condition, drug, skin, control or embedding need
labels: enhancement
---

**The teaching or integration need** (who uses it, in which scenario)

**What the monitor should show or allow**

**Sources** (papers, manuals or datasets, with their licences if data would be bundled)
```

- [ ] **Step 5: Check and commit.** Fill the README's `FILL:` marker (the clinical app's view names) — `docs-honesty` (Task 12) rejects any left. `ls -la docs/images` (two files ≤ 60,000 B); `npx -y pnpm@9.15.9 exec prettier --version` is NOT needed (no formatter in the repo). Then

```bash
git status --short docs/gates   # restore other stages' screenshots if a run rewrote them
git add README.md CITATION.cff CONTRIBUTING.md SECURITY.md .github/ISSUE_TEMPLATE apps/demo/scripts/readme-shots.mjs docs/images docs/plans/stage-8b-release.md
git commit -m "docs: README rewrite with screenshots, CITATION.cff, CONTRIBUTING, SECURITY, issue templates

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-8b-release
```

---

### Task 11: Embedding, scenario-authoring and skin-authoring guides (examples validated by a test)

**Files:** Create `docs/guides/embedding.md`, `docs/guides/scenario-authoring.md`, `docs/guides/skin-authoring.md`, `packages/validation/test/docs-examples.test.ts`.

- [ ] **Step 1: The example test first** (fails: the guides do not exist).

**Create** `packages/validation/test/docs-examples.test.ts`:
```ts
// Stage 8b: every complete JSON example in the guides is validated against the real schemas, so the guides cannot
// drift from the code. An example is a ```json block directly preceded by an `<!-- example: <schema> -->` line.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateScenario } from '../../controller/src/scenario/index.ts';
import { validate } from '../../skins/src/validate.ts';

const root = resolve(import.meta.dirname, '../../..');
const EXAMPLE_RE = /<!-- example: (pme-scenario\/1|pme-preset\/1|pme-theme\/1) -->\s*\n```json\n([\s\S]*?)\n```/g;
const examples = (file: string) => [...readFileSync(resolve(root, file), 'utf8').matchAll(EXAMPLE_RE)].map((m) => ({ schema: m[1] as string, doc: JSON.parse(m[2] as string) as unknown }));

describe('guide examples validate', () => {
  it('scenario-authoring.md: every pme-scenario/1 example passes validateScenario', () => {
    const ex = examples('docs/guides/scenario-authoring.md');
    expect(ex.length).toBeGreaterThanOrEqual(1);
    for (const e of ex) {
      const r = validateScenario(e.doc);
      expect(r.ok ? [] : r.errors).toEqual([]);
      expect(r.warnings).toEqual([]);
    }
  });
  it('skin-authoring.md: every preset/theme example passes @pme/skins/validate', () => {
    const ex = examples('docs/guides/skin-authoring.md');
    expect(ex.length).toBeGreaterThanOrEqual(1);
    for (const e of ex) {
      const r = validate(e.schema === 'pme-preset/1' ? 'preset' : 'theme', e.doc);
      expect(r.errors).toEqual([]);
    }
  });
});
```

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/docs-examples.test.ts` — Expected: FAIL (ENOENT).

- [ ] **Step 2: The embedding guide.** Before writing, re-read `packages/renderer/src/mount.ts` (`MountOptions`, `MonitorHandle`), `packages/engine-core/src/types.ts` (`Command`, `EngineEvent`, `EngineOptions`), the `LungStateEvent` type (`grep -rn "LungStateEvent" packages/engine-core/src packages/ventilator/src`) and `apps/demo/src/vent/embed.ts` on your branch: if FU-3/FU-4/V.1 — and, since the refresh, FU-7 to FU-11, Stage 9, Stage 10 (the `MIN_TIME_SCALE`/`MAX_TIME_SCALE` constants, fast-forward) and FU-7.1 — added options, commands or events, add them to the tables; the handle and `Limits` quote the time-scale range from those constants (0.25–8 after Stage 10), never a literal from this plan; the worked example's lung-state field list has a `FILL:` marker to be filled from V.1's `LungStateEvent`.

**Create** `docs/guides/embedding.md`:
````markdown
# Embedding the monitor

Two ways in: **ES modules** for applications with a bundler, and **one IIFE file** for static pages, `file://` and
hosts without a build step (brief §7.6). Both run the engine in a Web Worker with an OffscreenCanvas when the browser
allows it and fall back to the main thread otherwise; the audio always runs on the main thread.

## The IIFE (`patient-monitor.iife.js`)

One classic script, no dependencies, works from `file://`. It defines `window.PatientMonitor` with `mountMonitor`,
`createEngine`, `transports`, `version` and the renderer's helpers (the full list is the `@pme/renderer` page of the
API reference).

```html
<div id="pm" style="height: 420px"></div>
<script src="patient-monitor.iife.js"></script>
<script>
  const pm = PatientMonitor.mountMonitor(document.getElementById('pm'), {
    skin: 'saadat-like',
    engine: { seed: 7, mode: 'manual', patient: { ageY: 54, sex: 'M', weightKg: 80 } },
    lanes: ['ecgII'], waves: ['abp', 'pleth', 'co2'], nibp: true,
  });
  pm.renderPath.then((p) => console.log('running on', p)); // 'worker-raf' | 'worker-pump' | 'main'
</script>
```

The worker is created from a `blob:` URL holding the IIFE's own source, so a page with a Content Security Policy needs
`worker-src blob:` (and `script-src` allowing the file). Without a worker the monitor runs on the main thread
(`renderPath` resolves to `'main'`). The file can also be loaded into your own classic worker with `importScripts` to
use `PatientMonitor.createEngine` headless: its monitor worker code starts only inside the worker it creates itself
(named `pme-engine`), so it never touches your worker's messages.

## ES modules

```ts
import { mountMonitor, type MonitorHandle } from '@pme/renderer';
import type { EngineEvent } from '@pme/engine-core';

const pm: MonitorHandle = mountMonitor(document.querySelector('#pm')!, { skin: 'philips-like', engine: { seed: 1 } });
pm.on((e: EngineEvent) => { if (e.type === 'alarm') console.log(e.id, e.priority); });
```

Packages: `@pme/engine-core` (the engine, no DOM — usable headless in Node or a worker via `createEngine`),
`@pme/renderer` (`mountMonitor`), `@pme/audio`, `@pme/controller` (transports, panel; `@pme/controller/scenario` for
the scenario runner, which brings ajv), `@pme/skins` (`@pme/skins/validate` brings ajv), `@pme/ventilator`. Each ships
ES modules only (no `require`) and `.d.ts` files; sibling packages are peers in your bundle, never duplicated on the
main thread; the renderer's worker bundle carries its own copy of the engine.

## Mount options

| Option | Meaning |
|---|---|
| `engine` | `EngineOptions`: `seed` (uint32, determinism), `mode` (`'manual'` default, or `'modeled'`), `patient` (age, sex, weight, height, baseline vitals, sensors, conditions), `device` (`ageBand`, `mainsHz`), `truthHz` (0–2 Hz read-only truth events) |
| `skin`, `theme`, `page` | a skin id (`saadat-like`, `philips-like`, `zoll-like`, `ge-like`, `mindray-like`, `lifepak-like`, or the preset `iran-icu-as-found`), a theme (`projector-light`, `ecg-grid`), a skin page |
| `lanes` | ECG leads on the ECG lanes (`'ecgII'`, `'V5'`, …) |
| `waves` | pressure/pleth/CO2 lanes below the ECG (`'abp'`, `'cvp'`, `'pap'`, `'pleth'`, `'co2'`, …); their tiles appear with them |
| `nibp`, `temp` | show the NIBP and temperature tiles |
| `worker` | `'auto'` (default) or `'off'` (force the main thread) |
| `fps` | `60` (default) or `30` (projectors) |
| `pxPerMm` | screen calibration so 25 mm/s is 25 mm/s (or call `calibrate()`) |
| `role` | `'host'` (default: owns the simulation) or `'viewer'` (a mirror driven by a transport) |

## The handle

`dispatch(cmd)` → `Promise<DispatchResult>` (accepted, tick, reason); `on(fn)` → unsubscribe; `enableSound()` — call
it from a user gesture (browsers block audio until then); `setTimeScale(k)` with `k` in `MIN_TIME_SCALE`–`MAX_TIME_SCALE` (exported by `@pme/engine-core`; FILL: the range on your branch, 0.25–8 after Stage 10); `pause()`,
`resume()`; `setFps()`; `calibrate(pxPerMm)`; `setSkin(id, { theme, page })`; `snapshot()` / `restore(s)` (JSON-safe
`pme-snapshot/1`, for bookmarks and late joiners); `capture12()` (the last 10 s of 12 leads); `trends` (1 Hz for 8 h);
`eventLog` (CSV/JSON export); `renderPath`; `destroy()`.

## Commands

Every command carries an `id` (unique string) and `issuedBy`. Examples:

```js
pm.dispatch({ id: 'r1', issuedBy: 'panel', type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' });
pm.dispatch({ id: 't1', issuedBy: 'panel', type: 'setTarget', variable: 'sbp', value: 80,
  ramp: { durationS: 60, curve: 'sigmoid' } });                                  // MANUAL targets
pm.dispatch({ id: 'd1', issuedBy: 'panel', type: 'applyEvent',
  event: { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' } });
pm.dispatch({ id: 's1', issuedBy: 'panel', type: 'attachSensor', sensor: 'spo2', state: 'off' });
pm.dispatch({ id: 'n1', issuedBy: 'panel', type: 'device', action: { device: 'nibp', action: 'start' } });
```

The full union is `Command` in the API reference (`@pme/engine-core`); `pme-scenario/1` documents use the same
commands. A rejected command resolves with `accepted: false` and a `reason`; nothing throws.

## Events

`pm.on(fn)` receives `beat`, `measurement` (the *measured* numerics, e.g. `values.spo2.value`, which lag and average
like a real monitor), `alarm`, `state` (1 Hz, with sim time `t`), `marker` (pacer spikes, shocks), `tone`, `lungState`
and, with `truthHz`, `truth`. Hosts should read `measurement`, never the truth, when they show numbers to learners.

## Several monitors, remote control

Several `mountMonitor` calls on one page give independent patients. For an instructor on another device, give the
learner's monitor `role: 'host'` and a transport, and the instructor's page the controller panel or `role: 'viewer'`:
`PatientMonitor.transports` (IIFE) or `transports` from `@pme/controller` offers `inProcess`, `postMessage`,
`broadcastChannel`, `websocket` (with the relay: `pnpm relay` in a clone) and `webrtc`. Raw samples never cross the
network; commands go in, events come out.

## Worked example: the ventilator with the monitor (`file://`)

`apps/demo/dist/embed/` (built by `pnpm build`; attached to each release as `ventilator-monitor-embed-v*.zip`) is the
reference embed: `ventilator-monitor.html` loads `patient-monitor.iife.js` and `pme-ventilator-embed.iife.js` as two
classic scripts and calls

```js
window.__embed = PmeVentilatorEmbed.mountEmbed({ monitor: document.getElementById('pme-monitor'), profile: 'normal' });
```

`mountEmbed` (source: `apps/demo/src/vent/embed.ts`) mounts the monitor with the link profile's patient, starts the
Hamilton-style ventilator UI, and joins them with an in-page link: every 20 ms the ventilator sends its airway
pressure, flow, volume, FiO2 and PEEP to the engine (`externalDrive`), and the engine sends back the lung's state
(FILL: the fields of `LungStateEvent` on your branch after V.1 — V.1 retires the link's shunt/recruit and adds
`pleuralCmH2O`; list what the event carries, e.g. compliance, resistance, drive, …) so the ventilator's own waveforms
change with the patient. The engine is the
master clock. Try it: open the page, set FiO2 to 21 % — SpO2 holds for about 20–30 s, then falls; set the rate to 6 —
EtCO2 climbs over minutes (the Playwright test `apps/demo/e2e/vent-embed.e2e.ts` asserts both).

A host with its **own** ventilator physics can skip the link and send frames itself (brief §7.6):

```js
let n = 0;
function onPhysicsStep() {               // the host's 200 Hz loop
  if (++n % 4) return;                   // 200 Hz → 50 Hz
  pm.dispatch({ id: 'v' + n, issuedBy: 'vent', type: 'externalDrive', source: 'ventilator',
    frame: { pawCmH2O: paw, flowLps: flow, volumeMl: volume, fio2: fio2Fraction, peepCmH2O: peep } });
}
```

## Limits

Time scale `MIN_TIME_SCALE`–`MAX_TIME_SCALE` (FILL: the range on your branch; the ventilator embed itself stays at ×4 or less). One patient per engine (several engines per page are fine). Audio needs a user gesture. The
MODELED physiology has known deviations: read [known-deviations.md](known-deviations.md) before building a scenario
that depends on a specific number.
````

- [ ] **Step 3: The scenario-authoring guide.** Re-read `packages/controller/scenarios/pme-scenario-1.schema.json` on your branch first: after FU-3 the `patient` block has a `profile` (`conditions`, `lungConditions`); if FU-4 or a later stage (FU-7 to FU-11, FU-7.1, Stage 10) added fields, event kinds or drug units (e.g. FU-7.1-a's mg/kg presets and potassium chloride), list them.

**Create** `docs/guides/scenario-authoring.md`:
````markdown
# Authoring scenarios (`pme-scenario/1`)

A scenario is a JSON document: a patient, a device skin, and a state machine whose states run commands when entered
and whose transitions fire on time, vitals, learner actions, sensors or instructor buttons (brief §7.4). The JSON
Schema is `packages/controller/scenarios/pme-scenario-1.schema.json`; `validateScenario(doc)` from
`@pme/controller/scenario` checks a document (schema, then references between states) and returns
`{ ok, errors, warnings }`. The built-in scenarios in `packages/controller/scenarios/` are worked examples.

## The document

| Field | Meaning |
|---|---|
| `schema` | always `"pme-scenario/1"` |
| `id`, `title`, `notes` | identifier (`[A-Za-z][A-Za-z0-9_.-]*`), title, instructor notes |
| `seed` | uint32; the same seed and the same learner actions replay the same run |
| `mode` | `"manual"` (targets and ramps you script) or `"modeled"` (the physiology responds by itself) |
| `patient` | `ageY`, `sex`, `weightKg`, `heightCm`, `ageBand`, `baseline` (starting values of state variables: `hr`, `sbp`, `dbp`, `spo2`, `rr`, `etco2`, `tempCore`, …), `rhythm` (`{ "id": "sinus" }`), `sensors` (`ecg`, `spo2`, `nibp`, `abp`, `cvp`, `pap`, `co2`, `temp`: `"on"`, `"off"`, …), `neuro`, `blood`, and `profile` (below) |
| `device` | `skin` (a skin or preset id) and `layout` |
| `initialState`, `states` | the state machine |
| `bookmarks` | named snapshots the instructor can jump to |

### Patient profile (`patient.profile`)

Chronic conditions and lung pathology are fixed when the engine is created and act in MODELED mode:

```jsonc
"profile": {
  "conditions": [ { "id": "as", "grade": "severe" }, { "id": "cad", "grade": "stable" } ],
  "lungConditions": [ { "id": "copd", "severity": 0.6 } ]
}
```

`conditions` ids: `hfref`, `hfpef`, `htn`, `as`, `ar`, `mr`, `ms`, `tr`, `cad`, `betaBlocked`, `rvFailure`, `ph`,
`tbi`, `hepaticFailure`, `aki` (valves and CAD take a `grade`, the others a `severity` 0–1). `lungConditions` ids are
the lung-pathology catalogue (`ards`, `copd`, `asthma`, `pneumonia`, `ptxTension`, `pregnancy`, …; full list in the
schema) with a `severity` 0–1 and, for one-sided conditions, `side`. Acute events — tamponade, massive PE, tension
pneumothorax, sepsis, anaphylaxis, a haemorrhage — are not profile: send them as `applyEvent` commands in a state.

## States and commands

Each state has an `id`, a `label`, optional `notes`, `onEnter`/`onExit` command lists and `transitions`. Commands are
the engine's (`setRhythm`, `setTarget` with a `ramp`, `pin`/`release`, `setFactor`, `setMode`, `setModifiers`,
`applyEvent` with an event `kind` such as `drug`, `fluid`, `bleed`, `airway`, `ventilation`, `cpr`, `defib`,
`condition`, `attachSensor`, `device`). `$comment` is allowed on the document, states, transitions and commands and is
never interpreted.

In **MANUAL** mode you script the numbers: a bleed is `setTarget` on `sbp`/`dbp`/`hr` with ramps. In **MODELED** mode
you apply the cause (`applyEvent` `bleed`, a `drug`, a `condition`) and the physiology produces the numbers — check the
[known deviations](known-deviations.md) before relying on a specific value.

## Transitions

`when` is one trigger or a combination: `{ "afterS": 60 }` (time in the state), `{ "atScenarioS": 300 }`,
`{ "vital": { "var": "spo2", "op": "<", "value": 90, "forS": 10 } }` (on the *measured* value),
`{ "event": { "kind": "drug", "drugId": "atropine" } }` (a learner action; filters such as `minJ`, `minDose`),
`{ "sensor": { "sensor": "spo2", "state": "off" } }`, `{ "manual": { "label": "Induce" } }` (an instructor button),
and `{ "all": [ … ] }` / `{ "any": [ … ] }`. `probability` with an `else` target rolls on the scenario's own random
stream, so a seeded run replays exactly.

## A complete example

<!-- example: pme-scenario/1 -->
```json
{
  "schema": "pme-scenario/1",
  "id": "guide-bradycardia",
  "title": "Guide example: bradycardia with hypotension in PACU, treated with atropine",
  "notes": "62-year-old woman in PACU after a knee arthroscopy. Sinus bradycardia with hypotension at 1 min; atropine restores the rate.",
  "seed": 11,
  "mode": "manual",
  "patient": {
    "ageY": 62, "sex": "F", "weightKg": 70, "heightCm": 165, "ageBand": "adult",
    "baseline": { "hr": 72, "sbp": 124, "dbp": 76, "spo2": 97, "rr": 14 },
    "rhythm": { "id": "sinus" },
    "sensors": { "ecg": "on", "spo2": "on", "nibp": "on" }
  },
  "device": { "skin": "saadat-like" },
  "initialState": "stable",
  "states": [
    {
      "id": "stable", "label": "Stable",
      "onEnter": [ { "type": "device", "action": { "device": "nibp", "action": "auto", "intervalMin": 3 } } ],
      "transitions": [ { "id": "t-brady", "to": "brady", "when": { "afterS": 60 } } ]
    },
    {
      "id": "brady", "label": "Sinus bradycardia, hypotension",
      "onEnter": [
        { "type": "setRhythm", "rhythm": "sinusBrady", "opts": { "rateBpm": 38 }, "when": "nextBeat" },
        { "type": "setTarget", "variable": "sbp", "value": 82, "ramp": { "durationS": 45, "curve": "sigmoid" } },
        { "type": "setTarget", "variable": "dbp", "value": 48, "ramp": { "durationS": 45, "curve": "sigmoid" } }
      ],
      "transitions": [
        { "id": "t-atropine", "label": "Atropine given", "to": "recovering", "when": { "event": { "kind": "drug", "drugId": "atropine" } } },
        { "id": "t-worse", "label": "HR < 35 for 30 s", "to": "worse", "when": { "vital": { "var": "hr", "op": "<", "value": 35, "forS": 30 } } }
      ]
    },
    {
      "id": "worse", "label": "Worsening", "notes": "Instructor: prompt for atropine or pacing.",
      "onEnter": [ { "type": "setRhythm", "rhythm": "sinusBrady", "opts": { "rateBpm": 32 }, "when": "nextBeat" } ],
      "transitions": [ { "id": "t-atropine2", "to": "recovering", "when": { "event": { "kind": "drug", "drugId": "atropine" } } } ]
    },
    {
      "id": "recovering", "label": "Recovering after atropine",
      "onEnter": [
        { "type": "setRhythm", "rhythm": "sinus", "opts": { "rateBpm": 88 }, "when": "nextBeat" },
        { "type": "setTarget", "variable": "sbp", "value": 118, "ramp": { "durationS": 60, "curve": "exp" } },
        { "type": "setTarget", "variable": "dbp", "value": 70, "ramp": { "durationS": 60, "curve": "exp" } }
      ]
    }
  ]
}
```

## Running a scenario

In the demo, `stage6b-acls.html` loads a scenario into the instructor panel. In code, `ScenarioDriver` /
`ScenarioRunner` from `@pme/controller/scenario` run a validated document against a monitor handle or a headless
engine; the run log (`runLog`, `replayRunLog`) replays a session exactly.

## Checklist

- `validateScenario(doc).ok` is true and `warnings` is empty.
- Every state the learner can reach has a way out (or is a deliberate end state).
- MANUAL numbers come from a source you can cite in `notes` or `$comment`; MODELED scenarios name the events, not the
  numbers.
- Mark clinical content that has not been reviewed by a clinician `[draft]` in the title, as the built-ins do.
````

- [ ] **Step 4: The skin-authoring guide.** Re-read `packages/skins/CONTRACT.md`, `src/schema.ts` and `src/registry.ts` first.

**Create** `docs/guides/skin-authoring.md`:
````markdown
# Authoring skins

Skins are **data**: JSON documents validated by JSON Schemas in `@pme/skins`, resolved into what the renderer and the
audio need (`resolveSkin(id, { theme })`). A skin never contains code, logos or vendor trade dress (brief §3.8, R13).

## Kinds

| Kind | Schema | What it is | Where |
|---|---|---|---|
| base | `pme-skin/1` | IEC-style defaults every vendor skin inherits | `packages/skins/src/data/base/` |
| skin | `pme-skin/1` | a monitor look and behaviour (`saadat-like`, `philips-like`, …) | `src/data/skins/` |
| preset | `pme-preset/1` | overrides on one skin (a ward's "as found" setup) | `src/data/presets/` |
| theme | `pme-theme/1` | a colour scheme applied last (`projector-light`, `ecg-grid`) | `src/data/themes/` |

Resolution order: base ← skin ← preset overrides ← theme; objects merge, arrays replace. What each resolved field
drives in the renderer and the audio is the contract in `packages/skins/CONTRACT.md`.

## Provenance is required

Every leaf value carries a provenance entry `{ "tag", "source", "note"? }` — `tag` is one of `documented`,
`measured`, `assumed`, `unverified`, `conflict`, `inferred`, `eng` —, keyed by its path (or a covering parent path). `documented` values cite a manual page or a photo
checklist item; `eng` values are engineering choices and say why. A missing provenance fails the tests. A limit or
table a manual does not publish stays `null` — never invent it; the UI marks inherited limits as approximate.

## The quickest path: a preset

<!-- example: pme-preset/1 -->
```json
{
  "schema": "pme-preset/1",
  "kind": "preset",
  "id": "or-teaching",
  "label": "Philips-like, OR teaching layout",
  "base": "philips-like",
  "overrides": {
    "layout": { "lanes": ["ECG1", "ART", "PLETH", "CO2"] }
  },
  "provenance": {
    "overrides.layout.lanes": { "tag": "eng", "source": "ENG", "note": "teaching layout: ECG, arterial line, pleth, capnogram" }
  }
}
```

Check a document with `validate('preset', doc)` from `@pme/skins/validate` (also `'skin'`, `'skinSource'`,
`'theme'`); it returns `{ ok, errors }`.

## Adding a skin, preset or theme to the library (1.0.0-rc.1)

In this release skins are resolved from the built-in registry; there is no runtime registration API (not planned for 1.x; see `docs/roadmap/`). To
add one:

1. Put the JSON under the matching `packages/skins/src/data/` folder, with provenance for every value.
2. Import and list it in `packages/skins/src/registry.ts` (`SKINS`, `PRESETS` or `THEMES`).
3. Run `pnpm --filter @pme/skins test`: schema validity, provenance coverage, colour contrast on the background and
   the snapshot tests. Update a snapshot only for your new id.
4. Mount it: `mountMonitor(el, { skin: 'or-teaching' })`, and look at it in `apps/demo/stage4a-skins.html`.
5. If the skin reproduces a real device's behaviour (alarm tones, NIBP cycle, limits), cite the manual pages in
   provenance and add a row to `NOTICES.md` for any table you transcribed.

## Colours and contrast

Waveform and numeric colours are checked against the skin's background for contrast; the `projector-light` theme
darkens colours to a minimum contrast of 4.5:1. Keep the conventional colour language (ECG green, arterial red, SpO2
cyan, CO2 yellow) unless the device you model documents otherwise.
````

- [ ] **Step 5: Run and commit.** Fill the embedding guide's `FILL:` markers first (the lung-state fields, and the time-scale range in two places) (from V.1's `LungStateEvent`; Task 12's `docs-honesty` test rejects any marker left). `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/docs-examples.test.ts` → PASS (2 tests). If the scenario example produces a warning after FU-3/FU-4 (e.g. a renamed rhythm option), fix the EXAMPLE, not the validator.

```bash
git add docs/guides/embedding.md docs/guides/scenario-authoring.md docs/guides/skin-authoring.md packages/validation/test/docs-examples.test.ts docs/plans/stage-8b-release.md
git commit -m "docs: embedding, scenario-authoring and skin-authoring guides; their JSON examples validated in CI

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-8b-release
```

---
### Task 12: Physiology overview, validation summary, known deviations — regenerated from `main` (R53), guarded by a test

**Files:** Create `scripts/deviations.ts`, `packages/validation/test/docs-honesty.test.ts`, `docs/guides/physiology-overview.md`, `docs/guides/validation-summary.md`, `docs/guides/known-deviations.md`; Modify (by `pnpm validate` only) `docs/validation/report.md`, `docs/validation/report.json`, `docs/validation/calibration-queue.md`.

These three pages are written NOW, at execution time, from what is on this branch after FU-3, FU-4, V.1 and every stage merged before the freeze (FU-5 to FU-11, 7k, Stage 9, FU-7.1, Stage 10; R53). **Size it before you start (rebase check 2026-10-13):** on 56f3761f the plan's own lister (`scripts/deviations.ts`, run on that tree) prints **151 expected failures + 1 skip** (143 + 1 on 48864439; none unreadable), and the overview needs a Mode-labelled row for 36 rhythms, 65 drugs and 56 condition ids (the docs-honesty reader, run on 56f3761f) — budget a long task, write the tables from `scripts/deviations.ts` and the id lists mechanically, and spend the judgement on the "Tracked in" cells and the mode labels: the code, `docs/gates/*.md` (every stage and FU note, including `docs/gates/fu-4.md`), `docs/validation/{report.md,calibration-queue.md}` as regenerated in Step 0, `docs/validation/{perf/README.md,review/README.md}`, `docs/physiology/stage-7-parameter-tables.md` and the brief §4. Cite only files in this repository (the orchestrator's rulings file is outside the repo and not public). The skeletons below fix the structure and the rules; every `FILL:` marker is replaced by content, and the test fails while one remains. Do not copy numbers from this plan: take them from the documents on the branch.

- [ ] **Step 0: Regenerate the validation report on this tree** (orchestrator ruling, 8b review: Q9 = YES, in 8b). The report on `main` was measured at `7bcf992`, before 7c–7e, FU-3, FU-4 and V.1 (Task 1 Step 1 recorded the list); the release docs must quote a report of the release tree. Run it the way Stage 8a did (`docs/gates/stage-8a.md`: `pnpm validate --seeds 11,12` with `PME_PULSE_DIR` set; 653 s wall there), in the background, with bounded waits:

```bash
npx -y pnpm@9.15.9 --filter @pme/validation datasets:fetch > <scratchpad>/stage-8b-release/datasets.log 2>&1; tail -2 <scratchpad>/stage-8b-release/datasets.log   # 8a: "verified 73 files"; needs the network
PME_PULSE_DIR=/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/research/pulse-spike/web \
  npx -y pnpm@9.15.9 validate --seeds 11,12 > <scratchpad>/stage-8b-release/validate.log 2>&1 &   # background
# wait in bounded steps (≤ 10 min each): check the process and the log's mtime/tail between waits
git status --short docs/validation
head -5 docs/validation/report.md
```

Start it with nothing uncommitted (right after Task 11's commit): the harness records `git rev-parse --short HEAD`, so that commit must be the tree it measured. It exits 1 when rows gate — expected; the three files are written anyway (`report: … N queued, M gating` is the last log line). Expected: `docs/validation/report.md` says `on commit <this branch's HEAD>` and `engine 1.0.0-rc.1` (Task 5 bumped it); its Summary line has new counts — whatever they are, they are the numbers the release docs quote. Commit ONLY `docs/validation/report.md`, `docs/validation/report.json` and `docs/validation/calibration-queue.md` as the harness wrote them (never hand-edit them); restore any other modified path under `docs/validation/` (`git checkout -- <path>`) and note it in the gate note. More red rows than on `main` are NOT this stage's to fix (R45: no band or physiology change here): they go on known-deviations.md and into the gate note, and the orchestrator is told. If the harness cannot run (network, Pulse directory), STOP and report; do not quote the old report as if it were current.

- [ ] **Step 1: The deviations lister.**

**Create** `scripts/deviations.ts`:
```ts
// Known deviations (Stage 8b): every expected failure — `it.fails` / `test.fails` in the package tests, Playwright's
// `test.fail(title, …)` in apps/demo/e2e — is a band the engine does not meet yet (R45: the band is kept, the miss is
// recorded), and every `it.skip` / `test.skip` / `describe.skip` / `.todo` with a LITERAL title is behaviour not
// tested yet (conditional skips such as `test.skip(browserName === 'webkit', …)` or `.skipIf(…)` are not). Lists
// both so docs/guides/known-deviations.md can carry one row per item; packages/validation/test/docs-honesty.test.ts
// fails when a title is missing from that page, or when an expected-failure call has a title this lister cannot
// read (a variable, or a template with `${…}`).
// Usage: node --experimental-strip-types scripts/deviations.ts   (prints two markdown tables' rows)
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

export interface Deviation {
  file: string;
  title: string;
}

const FAILS_RE = /\b(?:it|test)\.fails?\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;
// Playwright's in-body annotation `test.fail(condition, 'reason')`: an expected failure whenever the condition holds;
// the reason is its title (apps/demo/e2e/stage9-tasks.e2e.ts uses it).
const COND_FAIL_RE = /\btest\.fail\(\s*[^'"`\s,][^,]*,\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1\s*\)/g;
const FAILS_CALL_RE = /\b(?:it|test)\.fails?\s*\(/g;
const SKIP_RE = /\b(?:it|test|describe)\.(?:skip|todo)\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === 'node_modules' || e.name === 'dist') return [];
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

/** Test-file text with `//` line comments removed (a comment that mentions `it.fails (…)` is not a test). */
const code = (text: string) => text.replace(/(^|\s)\/\/.*$/gm, '$1');
const titles = (text: string, re: RegExp) =>
  [...code(text).matchAll(re)].filter((m) => !(m[1] === '`' && (m[2] as string).includes('${'))).map((m) => (m[2] as string).replace(/\\(.)/g, '$1'));

/** The expected-failure titles in one test file's text (escapes resolved: `\'` → `'`; `${…}` templates skipped). */
export function failsTitles(text: string): string[] {
  return [...titles(text, FAILS_RE), ...titles(text, COND_FAIL_RE)];
}
/** How many expected-failure calls the file makes, readable title or not. */
export function failsCalls(text: string): number {
  return [...code(text).matchAll(FAILS_CALL_RE)].length;
}
/** The literal titles of skipped / todo tests in one file. */
export function skippedTitles(text: string): string[] {
  return titles(text, SKIP_RE);
}

/** Package unit tests and the Playwright e2e, sorted. */
export function testFiles(root: string): string[] {
  return [...walk(join(root, 'packages')), ...walk(join(root, 'apps', 'demo', 'e2e'))].filter((f) => /\.(test|e2e)\.ts$/.test(f)).sort();
}
const list = (root: string, pick: (text: string) => string[]): Deviation[] =>
  testFiles(root).flatMap((f) => pick(readFileSync(f, 'utf8')).map((title) => ({ file: relative(root, f), title })));

/** Every expected failure (a band missed), by file. */
export function listDeviations(root: string): Deviation[] {
  return list(root, failsTitles);
}
/** Every literal-titled skipped or todo test, by file. */
export function listSkipped(root: string): Deviation[] {
  return list(root, skippedTitles);
}
/** Files with an expected-failure call whose title the lister cannot read. */
export function unreadableFails(root: string): string[] {
  return testFiles(root)
    .filter((f) => {
      const text = readFileSync(f, 'utf8');
      return failsCalls(text) > failsTitles(text).length;
    })
    .map((f) => relative(root, f));
}

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(import.meta.filename);
if (invokedDirectly) {
  const root = resolve(import.meta.dirname, '..');
  const row = (d: Deviation) => `| \`${d.file}\` | ${d.title.replace(/\|/g, '\\|')} | FILL: tracked in |`;
  const fails = listDeviations(root);
  const skipped = listSkipped(root);
  console.log('<!-- Tests that record a miss -->');
  for (const d of fails) console.log(row(d));
  console.log('\n<!-- Tests not run -->');
  for (const d of skipped) console.log(row(d));
  console.error(`deviations: ${fails.length} expected failures, ${skipped.length} skipped; unreadable titles in: ${unreadableFails(root).join(', ') || 'none'}`);
}
```

Run: `node --experimental-strip-types scripts/deviations.ts > <scratchpad>/stage-8b-release/deviations.md` — prints one row per expected failure (29 `it.fails` on `main` d455b50; 143 on 48864439; **151 on 56f3761f** (rebase check 2026-10-13, after FU-11, FU-7.1 and Stages 10–13) — including 1 conditional `test.fail` in `apps/demo/e2e/stage9-tasks.e2e.ts`, Decision 27, which stays because Stage 14 runs after the rc) and one per literal-titled skip (1 on d455b50: `packages/engine-core/test/l2/circ/lvad.test.ts`, "7h: VA-ECMO pulsatility fades with flow fraction …"; V.1 may add e.g. its neonatal profile skip), and on stderr any file whose expected-failure title cannot be read (expected: none — if one appears, give that test a literal title; never exclude the file). Every row's last cell is `FILL: tracked in`: replace it with the gate-note section or calibration-queue row that tracks the item. Keep this output: it is the first two tables of Step 4.

- [ ] **Step 2: The honesty test** (fails until Steps 3–5 exist).

**Create** `packages/validation/test/docs-honesty.test.ts`:
```ts
// Stage 8b: the release documentation stays honest and complete, mechanically (orchestrator ruling, 8b review):
//  - every expected failure (`it.fails`/`test.fails` in the package tests, Playwright `test.fail` in the e2e) and every
//    literal-titled skip appears in docs/guides/known-deviations.md, each row names where it is tracked, and every
//    expected-failure call has a title the lister can read;
//  - the physiology overview has a table row WITH A MODE LABEL for every rhythm, drug and condition id — the
//    condition ids are read from the code and the scenario schema, not from a hand-kept list;
//  - no release page mentions clinical validation, IEC 60601, FDA, CE marking or diagnosis on a line without a
//    negation, and no `FILL:` marker from the Stage 8b plan is left (NOTICES.md included).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listDeviations, listSkipped, unreadableFails } from '../../../scripts/deviations.ts';
import { DRUG_IDS, LUNG_CONDITION_IDS, RHYTHM_IDS } from '../../engine-core/src/index.ts';
import { CIRC_CONDITIONS } from '../../engine-core/src/l2/circ/conditions.ts';

const root = resolve(import.meta.dirname, '../../..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const walk = (d: string): string[] =>
  readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const GUIDES = readdirSync(join(root, 'docs/guides')).filter((f) => f.endsWith('.md')).map((f) => `docs/guides/${f}`);
// CHANGELOG.md and RELEASE.md join the check once Task 13 creates them.
const RELEASE_DOCS = [...GUIDES, 'README.md', 'CHANGELOG.md', 'RELEASE.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CITATION.cff'].filter((f) => existsSync(join(root, f)));
const FILL_DOCS = [...RELEASE_DOCS, 'NOTICES.md']; // N-015's date is a FILL: marker until the executor commits
// A line mentioning one of these must also carry a negation: "Not clinically validated." passes, "clinically validated" fails.
const CLAIM_RE = /clinically[- ]validated|validated for clinical|IEC\s*60601|FDA|CE[- ]mark|diagnos/i;
const NEGATION_RE = /\b(not|no|never|without|nor)\b/i;
// A table cell that starts with a mode label (physiology-overview.md: "Labels on this page").
const MODE_CELL_RE = /\|\s*(both|MODELED only|MANUAL only|INTERIM)\b[^|]*\|/;

const quoted = (union: string) => [...union.matchAll(/'([^']+)'/g)].map((m) => m[1] as string);
/** Every condition id the engine accepts, read from the code and the pme-scenario/1 schema (no hand-kept list). */
function conditionIds(): string[] {
  const ids = new Set<string>([...CIRC_CONDITIONS, ...LUNG_CONDITION_IDS]);
  for (const f of walk('packages/engine-core/src').filter((f) => f.endsWith('.ts'))) {
    const text = read(f);
    // `{ kind: 'condition'; id: 'a' | 'b' … }` event members (types-*.ts) and profile unions (`type ConditionId = 'a' | …`)
    for (const m of text.matchAll(/kind:\s*'condition';\s*id:\s*((?:'[^']+'\s*\|?\s*)+)/g)) for (const id of quoted(m[1] as string)) ids.add(id);
    for (const m of text.matchAll(/export type ConditionId\s*=\s*((?:'[^']+'\s*\|?\s*)+)/g)) for (const id of quoted(m[1] as string)) ids.add(id);
  }
  // pme-scenario/1: the `id` enums under a `conditions` / `lungConditions` property (patient.profile, FU-3)
  const visit = (node: unknown, inConditions: boolean): void => {
    if (Array.isArray(node)) return node.forEach((n) => visit(n, inConditions));
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      const e = (v as { enum?: unknown } | null)?.enum;
      if (inConditions && k === 'id' && Array.isArray(e)) for (const id of e) if (typeof id === 'string') ids.add(id);
      visit(v, inConditions || k === 'conditions' || k === 'lungConditions');
    }
  };
  visit(JSON.parse(read('packages/controller/scenarios/pme-scenario-1.schema.json')), false);
  return [...ids].sort();
}

describe('docs honesty (Stage 8b)', () => {
  const deviationsPage = () => read('docs/guides/known-deviations.md');
  it('every expected failure and every literal-titled skip appears, verbatim, in known-deviations.md', () => {
    const page = deviationsPage().replace(/\\\|/g, '|');
    const missing = [...listDeviations(root), ...listSkipped(root)].filter((d) => !page.includes(d.title)).map((d) => `${d.file}: ${d.title}`);
    expect(missing).toEqual([]);
  });
  it('every expected-failure call has a literal title (no variable, no ${…} template)', () => {
    expect(unreadableFails(root)).toEqual([]);
  });
  it('every row of the two test tables names where it is tracked', () => {
    const rows = deviationsPage().split('\n').filter((l) => /^\|\s*`[^`]+\.(?:test|e2e)\.ts`\s*\|/.test(l));
    expect(rows.length).toBeGreaterThan(0);
    const untracked = rows.filter((l) => {
      const cells = l.split(/(?<!\\)\|/).slice(1, -1);
      return cells.length < 3 || (cells[cells.length - 1] ?? '').trim() === '';
    });
    expect(untracked).toEqual([]);
  });
  it('reads the condition ids from the code (sanity: the known ones are found)', () => {
    expect(conditionIds()).toEqual(expect.arrayContaining(['burns', 'dka', 'mh', 'sepsis', 'thyroidStorm', 'tbi', 'aki', 'hfref', 'as', 'tamponade', 'pe', 'ards']));
  });
  it('the physiology overview has a table row with a mode label for every rhythm, drug and condition id', () => {
    const rows = read('docs/guides/physiology-overview.md').split('\n').filter((l) => l.startsWith('|'));
    const ids = [...new Set<string>([...RHYTHM_IDS, ...DRUG_IDS, ...conditionIds()])];
    expect(ids.filter((id) => !rows.some((r) => r.includes(`\`${id}\``) && MODE_CELL_RE.test(r)))).toEqual([]);
  });
  it('no release page claims clinical validation, IEC 60601 compliance, FDA/CE status or diagnostic use', () => {
    const claims = RELEASE_DOCS.flatMap((f) => read(f).split('\n').filter((l) => CLAIM_RE.test(l) && !NEGATION_RE.test(l)).map((l) => `${f}: ${l.trim()}`));
    expect(claims).toEqual([]);
  });
  it('no FILL: marker is left', () => {
    expect(FILL_DOCS.filter((f) => read(f).includes('FILL:'))).toEqual([]);
  });
});
```

(The claim rule is deliberately blunt: any line that mentions clinical validation, IEC 60601, FDA, CE marking or diagnosis must also say "not", "no", "never", "without" or "nor" — so "Not clinically validated." and "no IEC 60601-1-8 compliance is claimed" pass, and a sentence that needs the word otherwise is reworded, not exempted. Still read every hit of `grep -rniE "validat|60601|diagnos" docs/guides README.md` by eye.)

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/docs-honesty.test.ts` — Expected: FAIL (the three pages do not exist) except the condition-id sanity case, which passes now (7 tests; the R50 additions were not prototyped).

- [ ] **Step 3: The physiology overview.** Start from this skeleton; fill every section from the code and the gate notes on `main`; keep it one page (tables, not prose, for the id lists; ≤ ~450 lines).

**Create** `docs/guides/physiology-overview.md`:
````markdown
# Physiology overview

What the engine simulates, organ by organ, and in which mode. This page is derived from the code and the stage gate
notes on `main` at the v1.0.0-rc.1 release; numbers that measure realism are in the
[validation summary](validation-summary.md), and every known miss is in [known-deviations.md](known-deviations.md).

## Two modes over one state

The engine keeps one patient state (L1), synthesises signals from it (L2) and measures them like a monitor (L3). The
L1 state is driven in one of two modes (brief §4.9):

- **MANUAL** — the instructor sets targets (HR, SBP/DBP, SpO2, EtCO2, RR, temperature, …) with ramps, or pins them;
  fixed coupling rules keep dependent channels consistent (e.g. a rhythm's mechanical output, SpO2 lag after an
  airway loss). Drugs and conditions act only where a MANUAL rule exists for them: FILL: from the gate notes and
  the mode branches in the code (`grep -rn "mode === 'modeled'\|mode === 'manual'" packages/engine-core/src`), the
  drug/condition effects that exist in MANUAL (list them) and that MANUAL otherwise leaves numbers to the instructor.
- **MODELED** — a lumped physiology computes the state: FILL: one paragraph naming the circulation (7a), lungs and gas
  (Stage 3/7b), blood (7c), organs (7d), endocrine/thermal (7e), neuro (7f), PK/PD (7g), the integration work (FU-4),
  and that the instructor can still pin any variable.

**Labels on this page:** **both** = the same behaviour in MANUAL and MODELED; **MODELED only** = emerges only from the
MODELED physiology (in MANUAL the instructor must script it); **MANUAL only** = exists only as a MANUAL rule;
**INTERIM** = a stand-in marked `INTERIM` in the code until a later stage replaces it. Every table of ids on this page
has a **Mode** column whose cell starts with one of these four labels.

<!-- FILL: delete this plan note. The docs-honesty test requires, for EVERY rhythm id, drug id and condition
id the engine accepts (condition ids read from the code and the scenario schema, so conditions FU-4 or V.1 added are
required automatically), a table row containing the id in backticks and a Mode cell starting with a label. Put a
condition in the section of the organ it acts on; the test names every id still without a row. -->

## Device layer (both)

FILL: measured numerics (HR 12-beat averaging, SpO2 averaging and lag, NIBP cuff cycle and timestamps, EtCO2 and
awRR), probe states, alarms (IEC-style and the saadat profile), pacer/defibrillator, 12-lead capture, trends — one
line each with the brief section.

## Rhythms (both)

FILL: a table of all 36 rhythm ids (count on 48864439; recount) — `id` | name | Mode | notes (e.g. PEA on any organised rhythm, recorded VF/AF
textures from CUDB/MIT-BIH, pacing modes); every id in backticks.

## Circulation (Stage 7a)

FILL: four-chamber time-varying elastance, valves, pericardium, Windkessels, baroreflex, coronary supply/demand;
devices (IABP, LVAD, VA-ECMO/CPB); what is MODELED only; the circulation conditions `tamponade`, `pe`, `tensionPtx`,
`rvInfarct` and the profile conditions `hfref`, `hfpef`, `htn`, `as`, `ar`, `mr`, `ms`, `tr`, `cad`, `betaBlocked`,
`rvFailure`, `ph` (plus any FU-4 added) in a table `id` | Mode | effect.

## Lungs, ventilation and gas exchange (Stage 3, 7b, V, V.1)

FILL: two-compartment lungs, V/Q, shunt, dead space, HPV, capnogram phases, O2/CO2 stores and kinetics, the
ventilatory drive; the ventilator link (frames in, lungState out, after V.1); a table of the 32 lung-condition ids (48864439; recount)
(`ards`, `copd`, …) — `id` | Mode | one-line effect.

## Blood, acid–base, electrolytes and fluids (Stage 7c)

FILL: ODC, Stewart acid–base, electrolytes, lactate, haemoglobin and haemorrhage/transfusion, crystalloid kinetics;
conditions `burns`, `dka` in a table `id` | Mode | effect.

## Brain, kidney, liver (Stage 7d)

FILL: ICP/CPP/CBF/PbtO2, Cushing, kidney RPP–GFR–UOP, liver lactate/drug clearance; conditions `tbi`,
`hepaticFailure`, `aki` in a table `id` | Mode | effect.

## Endocrine, thermal and system conditions (Stage 7e)

FILL: stress hormones, glucose, temperature (anaesthesia-induced hypothermia, warming), conditions `mh`, `sepsis`,
`anaphylaxis`, `sirs`, `hypermetabolic`, `thyroidStorm` in a table `id` | Mode | effect.

## Depth of anaesthesia, drive and neuromuscular block (Stage 7f)

FILL: depth index, ventilatory drive, TOF/PTC, reversal; mode labels.

## Drugs (Stage 7g)

FILL: the PK models (Eleveld, Schnider, Marsh, Minto, …) and the effect-site PD; then a table of all 65 drug ids (56f3761f, with FU-7.1-a's potassium chloride — recount) —
`id` | class | Mode | what it does in MODELED | what it does in MANUAL (often "nothing: script the targets") — every
id in backticks.

## Integration and state dependence (FU-4)

FILL: from `docs/gates/fu-4.md`: state-dependent drug effects (e.g. propofol in tamponade or hypovolaemia), the
low-flow arrest pathway, the tamponade–PEEP–anaesthetic coupling, and what the clinical scenario suite showed (link
to the "Clinical scenario suite results" section of known-deviations.md).

## Later follow-ups (FU-5 to FU-11, 7k, FU-7.1, Stage 10)

FILL: one line per stage from its gate note (`docs/gates/fu-5.md` … `fu-9.md`, `fu-8-part-a.md`, `stage-fu-8b.md`,
`stage-fu-9b.md`, `stage-fu-10.md`, the 7k, FU-11, FU-7.1 and Stage 10 notes on your branch): what each changed in
the physiology (respiratory integration, the drug layer, blood/fluids/kidney, endocrine and thermal, resting
sympathetic tone, respiratory mechanics, the release-candidate drug leftovers) or around it (time control: ×8 and
fast-forward), with mode labels where a behaviour is MODELED only.

## Not modelled in this release

FILL: from the brief §1 non-goals and v2 candidates, `docs/roadmap/v1.0-remaining.md` ("Not in v1.0") and the gate
notes: e.g. the autonomic hub and reflex decompensation, multi-patient engines, Pulse as a backend, Lundberg waves, a
runtime skin-registration API, paediatric and obstetric physiology, … — one line each. It must include the owner's
list (Decision 24): haemorrhage SVR falls instead of rising, no decompensation/reflex-collapse model, no sepsis model
fit for teaching, pulsus paradoxus (unless FU-7.1 landed it), adults only.
````

- [ ] **Step 4: Known deviations.** Paste the Step 1 rows into the first two tables and replace each `FILL: tracked in` cell with the gate-note section or calibration-queue row that tracks it (never leave it empty: the test checks). Fill the other sections from `docs/validation/calibration-queue.md` and `docs/validation/report.md` (both as regenerated in Step 0), `docs/gates/fu-4.md` and `grep -rn "INTERIM" packages/*/src`.

**Create** `docs/guides/known-deviations.md`:
````markdown
# Known deviations

The engine is a teaching model, not a validated clinical simulator. This page lists, openly, where it is known to
differ from published physiology, recorded patients or a reference model. Policy (ruling R45): a test band taken from
the literature is never loosened to make the model pass; a miss is kept as an `it.fails` test with the measured
number in its title and appears here until the mechanism is fixed. The calibration pass with a clinician (R44) works
through this list.

Regenerate the first two tables with `node --experimental-strip-types scripts/deviations.ts`; the `docs-honesty` test
fails when an expected failure or a skipped test is missing from this page, or a row does not say where it is tracked.

## Tests that record a miss (`it.fails`, and `test.fail` in the browser tests)

| Test file | Band and measured value (test title, verbatim) | Tracked in |
|---|---|---|
FILL: the first block of rows printed by scripts/deviations.ts, each with its "Tracked in" cell (gate note section or calibration-queue row).

## Tests not run (`it.skip`, `test.skip`, `.todo`)

Behaviour that has a test title but no running test yet: each is a known gap, not a pass.

| Test file | What is not tested yet (test title, verbatim) | Tracked in |
|---|---|---|
FILL: the second block of rows printed by scripts/deviations.ts (e.g. the VA-ECMO pulsatility test marked for Stage 7h), each with its "Tracked in" cell.

## Browser tests skipped on CI WebKit only

Conditional skips are not listed by `scripts/deviations.ts` (by design), but these five were added to keep CI green on
the 2-vCPU Linux WebKit runner and each names a finding; they pass on macOS WebKit and on CI Chromium. FILL: one row
each from `grep -n "webkit' && !!process.env.CI" apps/demo/e2e/*.ts` on your branch, with the finding and the hand
check that covers real Safari — on 56f3761f: `fu11-follower.e2e.ts:16` (whole file; F-49-1/F-49-2, BroadcastChannel
on Playwright Linux WebKit), `s10-time-control.e2e.ts:14` (whole file; S10-F5, the runner holds ≈ ×5.3, not ×8; H18),
`s12-mobile-learner.e2e.ts:58` (test at :52, the QR sheet and a phone following; FX-2; H17) and `:132` (test at :131,
the phone holds while the Ventilator view drives; S12-F1; H21), `fu11-vent-restore.e2e.ts:43` (test at :42; F-FX1-1,
CI Linux WebKit page crash after "Return here").

## Validation harness: rows outside their band

FILL: from `docs/validation/report.md` as regenerated on the release tree (state its commit and date) and `docs/validation/calibration-queue.md`: the
red rows and the headline yellow rows, grouped (e.g. R → radial upstroke and dicrotic notch timing; PPG ↔ ABP shape;
haemorrhage reflex; propofol MAP; massive PE), each with recorded vs engine numbers and the queue item.

## Clinical scenario suite results (FU-4)

FILL: from `docs/gates/fu-4.md`: the scripted clinical scenario suite FU-4 ran (condition × intervention), with the
cells still outside the expected clinical course, and the ones FU-4 fixed. If FU-4's gate note lists none outside the
expected course, say so and give the suite's size.

## Stand-ins marked INTERIM in the code

FILL: `grep -rn "INTERIM" packages/*/src` → one line per stand-in: what it replaces and which later stage owns it.

## Datasets not used or not reachable

FILL: e.g. PWDB (Zenodo returned 403 to the fetcher in Stage 8a: not measured), and the excluded datasets of brief §8
(CapnoBase, MIMIC, PulseDB) — from `docs/gates/stage-8a.md` and the NOTICES rows.
````

- [ ] **Step 5: Validation summary.**

**Create** `docs/guides/validation-summary.md`:
````markdown
# Validation summary

What has been measured, how, and what the measurements do and do not show. The full, regenerated report is
[`docs/validation/report.md`](../validation/report.md) (harness: `pnpm validate`, Stage 8a); the open items are the
[calibration queue](../validation/calibration-queue.md) and [known-deviations.md](known-deviations.md).

## What the harness does

FILL: from `docs/gates/stage-8a.md` and `docs/validation/README.md`: one metric implementation applied to recorded
windows and to engine runs matched to them (HR, BP, site, ventilation); the datasets with licences and window counts
(VitalDB PhysioNet copy CC BY 4.0, MGH/MF ODC-By 1.0, PTB-XL CC BY 4.0; PWDB not fetched); the suites (morphology,
intervals, sanity scenarios, gates, waveform regression, determinism, the Pulse differential oracle); the grading
(green inside the band, yellow < 30 % outside, red ≥ 30 % or not measured, R40).

## The latest run

FILL: the "Summary:" line of `docs/validation/report.md` (regenerated in Task 12 Step 0) verbatim (green/yellow/red
counts, documents not measurable, calibration-queue size), with its commit, date and engine version. Then list, by
name, every stage merged after that commit that changed physiology (`git log --oneline <report-commit>..HEAD --
packages/engine-core/src packages/engine-core/data packages/ventilator/src`); if there are any, write "These numbers
were measured before those changes and have not been re-measured on the v1.0.0-rc.1 tree", otherwise "Measured on the
v1.0.0-rc.1 tree". State plainly that the gating (red) rows mean BUILD-PLAN Stage 8 acceptance 1 ("V1–V9 pass") is not met
at this release, if the report has any.

## Performance and determinism

FILL: from `docs/validation/perf/README.md` and the 8a gate note: soak (heap, sim/wall), frame times, tick p99; the
determinism result; the CI tick-bench budget (p50 < 6 ms).

## Blind realism review

FILL: the state of the blind review (brief §9; the 8a tool is `apps/demo/validation-review.html`): run or not, by whom,
the identification accuracy and realism scores if run. If it has not been run, say "not yet run" and that the
realism-review acceptance (BUILD-PLAN Stage 8 acceptance 2) is therefore not met at this release — do not estimate.

## What this does not show

The measurements compare waveform morphology, timing and a set of scenario responses with public recordings, published
models and a reference physiology engine. They do not show that the simulator is accurate enough for any clinical
purpose, and they do not replace a clinician's review of each teaching scenario. The engine is not a medical device.
````

- [ ] **Step 6: Fill every `FILL:` marker** from the sources named in each. Rules: numbers only from documents in this repository on this branch (cite the file); MODELED-only behaviour labelled; no estimates for things not measured; `it.fails` titles verbatim; unmet acceptance stated as unmet.

- [ ] **Step 7: Run.** `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/docs-honesty.test.ts test/docs-examples.test.ts` → PASS (7 + 2). Expected failure modes and fixes: a missing expected-failure or skipped title → add the row (copy from Step 1's output); an unreadable title → give that test a literal title; an empty "Tracked in" → name the tracker; a missing id or a row without a Mode label → add it to the right table with its label; a claim line → reword with the negation it needs; a `FILL:` left (NOTICES.md's N-015 date included) → fill it. Also `grep -rniE "validat|60601|diagnos" docs/guides README.md` and read each hit.

- [ ] **Step 8: Commit and push.**

```bash
git add scripts/deviations.ts packages/validation/test/docs-honesty.test.ts docs/guides/physiology-overview.md docs/guides/validation-summary.md docs/guides/known-deviations.md \
  docs/validation/report.md docs/validation/report.json docs/validation/calibration-queue.md docs/plans/stage-8b-release.md
git commit -m "docs: validation report regenerated on the release tree; physiology overview (MODELED vs MANUAL), validation summary and known deviations; docs-honesty test

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-8b-release
```

(Task 13 adds `CHANGELOG.md` and `RELEASE.md`; the honesty test checks them from then on, so re-run it after Task 13.)

---

### Task 13: CHANGELOG and the RELEASE checklist

**Files:** Create `CHANGELOG.md`, `RELEASE.md`; Modify `CITATION.cff` (adds `date-released`), `packages/validation/test/release-versions.test.ts` (CITATION checks).

- [ ] **Step 1: CHANGELOG.** Fill the `## [1.0.0-rc.1]` section from the stage list in `docs/RESUME.md` and the gate notes (one bullet per stage, user-facing wording, no internal ticket numbers except in parentheses); the date is the day the PR is opened (the orchestrator may correct it before tagging).

**Create** `CHANGELOG.md`:
````markdown
# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/):
the public API is what the packages export (see the API reference), the `pme-scenario/1`, `pme-snapshot/1`,
`pme-skin/1`, `pme-preset/1` and `pme-theme/1` document formats, and `window.PatientMonitor`.

## [Unreleased]

## [1.0.0-rc.1] - FILL: YYYY-MM-DD

First public **pre-release** (release candidate). It is not the final 1.0.0: the calibration pass and the blind
realism review have not run, and the limits below are known.

### Added

- FILL: one bullet per area, from the gate notes — the ECG rhythm engine (36 rhythms, recorded VF/AF textures) and
  12-lead capture; haemodynamics (ABP, CVP, PAP, NIBP cuff cycle, pleth); respiratory and gas (capnogram, SpO2 chain,
  RR, temperature); the device layer (measured numerics, IEC-style and Saadat alarm sounds, pacer and defibrillator,
  trends, event log); six skins and two themes; controllers and transports, the scenario runner; MODELED physiology
  (circulation, lungs, blood, organs, endocrine/thermal, neuro, PK/PD of 65 drugs — recount) with the FU-1…FU-11 and
  FU-7.1 follow-up work; the one-page clinical app (Stage 9) and time control (×8, fast-forward; Stage 10); the
  Hamilton-style ventilator and its two-way link (V, V.1); the validation harness and the blind-review tool (8a);
  and (rebase check 2026-10-13, all merged before the freeze) the six Showcase scenario cards (Stage 11), a
  second-screen learner monitor in the same browser (FU-11 d), learners' phones following the instructor over a
  classroom relay on the instructor's computer (Stage 12; the relay needs Node ≥ 22), the Debrief report printed to
  PDF (Stage 13), and the fixer round (FX-1 Ventilator view after restore on WebKit, FX-2 commands always answered,
  FX-4 alarm controls follow the skin, FX-7 the scenario library stays open).
- The single-file IIFE `patient-monitor.iife.js` (the engine ships once; ≤ 400 KB gzipped, checked in CI) and the
  `file://` ventilator + monitor embed.
- Publishable ES module packages with type declarations; TypeDoc API reference; embedding, scenario-authoring and
  skin-authoring guides; physiology overview, validation summary and known deviations.
- CI: dependency-licence audit (with every shipped licence text in `LICENSES/`), IIFE size budget, pack smoke and
  TypeDoc build; a release workflow that attaches the IIFE, the embed, the API reference and the licence texts to
  GitHub releases.

### Known limitations

- The MODELED physiology is a teaching model with open calibration items: see
  [docs/guides/known-deviations.md](docs/guides/known-deviations.md). Not a medical device; not clinically validated.
- FILL: the validation state at this release, from `docs/guides/validation-summary.md`: the harness's red (gating)
  row count and the blind realism review's status — e.g. "N validation rows are outside their evidence band and the
  blind realism review has not been run, so the v1.0 acceptance criteria 'V1–V9 pass' and 'realism review' are not met
  yet; see the validation summary."
- During compensated haemorrhage the systemic vascular resistance falls instead of rising (the reflex
  vasoconstriction is not reproduced).
- There is no decompensation or reflex-collapse model: shock does not progress by itself to collapse (the autonomic
  hub and the cardiovascular reflexes are v2.0 work, `docs/roadmap/`).
- No sepsis model fit for teaching: FILL: one sentence from known-deviations.md on what the `sepsis` condition does
  and does not do on your branch (e.g. no fever under general anaesthesia, a recorded known miss); no sepsis scenario
  ships.
- FILL (keep or drop by FU-7.1's outcome, Decision 24): "Pulsus paradoxus is not reproduced (no ventricular
  interdependence)."
- Adults only: no paediatric or obstetric physiology.
- Browser coverage: FILL: the CI-only WebKit skips from known-deviations.md ("Browser tests skipped on CI WebKit
  only"), in one sentence — e.g. "Five browser tests (second screen, time control at ×8, two phone tests, Ventilator
  view restore) are skipped on the Linux WebKit CI runner, which is too slow for them; they pass on macOS WebKit and
  Chromium" — and any test the CI "passed only on retry" step listed on the release commit.
- Not yet checked by hand at this release, unless the gate note records them done (rebase check 2026-10-13: all
  PENDING-OWNER on 56f3761f): FILL: keep only those still open — learners' phones on a real phone (Stage 12 gate
  step 4, hand checks H17 and H21, `docs/gates/stage-12-real-phone.md`), the Debrief's print preview in Safari and
  Chrome (Stage 13), the fast-forward look and the second screen in real Safari (H18, H20), the hidden-tab watchdog
  (H19). Never describe an open item as verified.
- For education only. Not a medical device; never connect it to a patient or use it for clinical decisions.
- The ES module packages are publishable but not on npm at this release candidate (build from source); the `@pme/*`
  package names are provisional until a first npm publish. No DOI yet (planned for 1.0.0).

[Unreleased]: https://github.com/samhv-dev/patient-monitor-engine/compare/v1.0.0-rc.1...HEAD
[1.0.0-rc.1]: https://github.com/samhv-dev/patient-monitor-engine/releases/tag/v1.0.0-rc.1
````

**Find** in `CITATION.cff`:
```yaml
version: 1.0.0-rc.1
```
**Replace with:**
```yaml
version: 1.0.0-rc.1
date-released: "2026-10-01"
```

(Write the same date as the CHANGELOG heading; `2026-10-01` stands for the day you open the PR.) Then make the release-version test hold CITATION to the same version and date (8b review finding 15):

**Find** in `packages/validation/test/release-versions.test.ts`:
```ts
    expect(new Set(vs).size).toBe(1);
  });
});
```
**Replace with:**
```ts
    expect(new Set(vs).size).toBe(1);
  });
  it('CITATION.cff carries the package version and the CHANGELOG release date', () => {
    const root = resolve(pkgs, '..');
    const cff = readFileSync(resolve(root, 'CITATION.cff'), 'utf8');
    const v = pkgVersion('renderer');
    expect(/^version: (.+)$/m.exec(cff)?.[1]).toBe(v);
    const heading = new RegExp(`^## \\[${v.replace(/\./g, '\\.')}\\] - (\\d{4}-\\d{2}-\\d{2})$`, 'm').exec(readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8'));
    expect(heading?.[1], 'CHANGELOG.md has a dated section for this version').toBeDefined();
    expect(/^date-released: "?(\d{4}-\d{2}-\d{2})"?$/m.exec(cff)?.[1]).toBe(heading?.[1]);
  });
});
```

- [ ] **Step 2: RELEASE checklist.**

**Create** `RELEASE.md`:
````markdown
# Releasing

Who does what: the stage executor prepares the release in a pull request and stops. **The orchestrator (or Ali)
merges the PR and pushes the tag.** Pushing a `v*` tag runs `.github/workflows/release.yml`, which rebuilds the tagged
commit and creates the GitHub release with its assets.

## Before the tag (on the merged `main`)

1. `ci` is green on the merge commit: `build`, `renderer`, `e2e (chromium)`, `e2e (webkit)` and all eight `test-slow` groups (`slow-a` … `slow-g`, `showcase`). Read the "e2e tests that passed only on retry" step of both e2e jobs (it never fails the job) and list any line in the release notes' browser-coverage section.
2. `docs/guides/validation-summary.md` quotes the `docs/validation/report.md` of the release tree, or states that it
   is older and why (which physiology changes it predates). To refresh it: run `pnpm validate` on the tree (or the
   `validation` workflow, Actions → validation → Run workflow) and land the regenerated report in a PR before tagging.
3. Versions: every library `package.json` and `version` constant say the release version
   (`pnpm --filter @pme/validation exec vitest run test/release-versions.test.ts`).
4. `CHANGELOG.md` has a `## [x.y.z] - YYYY-MM-DD` section with today's date, and `CITATION.cff` the same
   `version` and `date-released`.
5. Locally: `pnpm install --frozen-lockfile && pnpm build && pnpm check-notices && pnpm check-licences && pnpm check-size
   && pnpm pack-smoke && pnpm docs:api` all pass.
6. `NOTICES.md` is complete (every bundled template, derived file and runtime dependency) and every licence text it
   points to is in `LICENSES/` (`pnpm check-licences` checks both for shipped packages).
7. The version label is `1.0.0-rc.1` (Ali's ruling, Q8 of the Stage 8b plan): a pre-release until the calibration
   pass and the blind review have run. The workflow flags any `v*-*` tag as a GitHub pre-release; check the release
   page says "Pre-release".

## Tag (orchestrator only)

```bash
git checkout main && git pull --ff-only
git tag -a v1.0.0-rc.1 -m "patient-monitor-engine 1.0.0-rc.1"
git push origin v1.0.0-rc.1
gh run watch "$(gh run list --workflow release --limit 1 --json databaseId --jq '.[0].databaseId')"
```

## After the workflow

1. The release page lists `patient-monitor.iife.js` (+ `.map`), `ventilator-monitor-embed-v1.0.0-rc.1.zip` (with
   `LICENSE`, `NOTICES.md` and `LICENSES/` inside), `api-reference-v1.0.0-rc.1.zip` (with `NOTICES.md` and the TypeDoc and
   lunr licence texts inside), `LICENSES.zip`, `SHA256SUMS.txt` (covering every other asset), `LICENSE`, `NOTICES.md`,
   with the CHANGELOG section as notes.
2. Download the embed zip, unzip, open `ventilator-monitor.html` by double-click in Chrome and Safari: the ventilator
   breathes, the monitor shows SpO2 and EtCO2, no console errors.
3. npm: not at this release (Q1, ruled: GitHub release only). The release notes say "ES module packages: build from
   source". If a later release publishes, it is `pnpm -r publish --access public` from the tagged commit by the owner
   of the npm scope (decide the scope first) — pnpm applies each package's `publishConfig`.
4. Update `docs/RESUME.md` and the rulings file.

## Later: 1.0.0 (not at the release candidate)

- DOI (Q5, deferred to 1.0.0): Ali enables the repository in Zenodo's GitHub integration BEFORE pushing the `v1.0.0`
  tag; Zenodo then mints a DOI for that release; add `doi:` to `CITATION.cff` in a small PR afterwards.
- Versions: `node --experimental-strip-types scripts/release-manifests.ts 1.0.0`, the six constants and their tests,
  CHANGELOG, CITATION — `release-versions.test.ts` checks they agree.

## If the workflow fails

Fix on a branch through a PR, merge, then move the tag only if the release was not created:
`git tag -d v1.0.0-rc.1 && git push origin :refs/tags/v1.0.0-rc.1`, and tag the new merge commit. Never rewrite a published
release's assets.
````

- [ ] **Step 3: Run the whole release-doc suite and dry-run the release assembly.**

```bash
npx -y pnpm@9.15.9 --filter @pme/validation test
mkdir -p <scratchpad>/stage-8b-release/release-dry && cd <scratchpad>/stage-8b-release/release-dry
V=v1.0.0-rc.1; awk -v v="${V#v}" 'index($0, "## [" v "]") == 1 {on = 1; next} /^## \[/ || /^\[[^]]+\]: / {on = 0} on' <worktree>/CHANGELOG.md | head -5
cd -
```

Expected: the validation package passes (101 tests on `main` 9f864b3, 7 of them skipped without datasets/`PME_PULSE_DIR`, + this stage's 22 — check-size 3, finish-dist 1, release-manifests 2, release-versions 3, check-licences 4, docs-examples 2, docs-honesty 7 — plus whatever FU-3/FU-4 added); the `awk` prints the start of the 1.0.0-rc.1 section only.

- [ ] **Step 4: Commit and push.**

```bash
git add CHANGELOG.md RELEASE.md CITATION.cff packages/validation/test/release-versions.test.ts docs/plans/stage-8b-release.md
git commit -m "docs: CHANGELOG 1.0.0-rc.1 and the RELEASE checklist (the orchestrator tags)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-8b-release
```

---

### Task 13b: Items FU-11 hands to the release (R50 F8)

**Files:** Modify `RELEASE.md` (from Task 13), `CHANGELOG.md`, `docs/guides/embedding.md` (Task 11's "Limits"), the
Developer view's page list in `apps/demo/src/app/views/dev.ts` (or the file that lists the build-stage pages on your
base); Create `docs/gates/stage-8b/developer-pages.md`.

- [ ] **Step 1 — the tick-cost release gate (FU-11 J5, F10).** In `RELEASE.md`'s checklist, before "tag", add:
  "On an idle machine (nothing else running): `npx -y pnpm@9.15.9 --filter @pme/validation perf:ticks --seconds 600
  --budget-ms <Stage 8a's p99 budget from docs/gates/stage-8a.md>` exits 0. CI does not run it (shared runners)."
- [ ] **Step 2 — the Developer-page review (FU-11 F24, F25).** For every build-stage page reachable from the Developer
  view (physiology console, stage7g, …) record in `docs/gates/stage-8b/developer-pages.md`: keep (it works and says what
  it is), fix (name the defect: the console restart's Pause/Resume and baseline, F24; stage7g's "7f pending" depth
  index, F25), or retire (remove the link and the page). No page that misreports the engine ships in v1.0.
- [ ] **Step 3 — release notes: trust limits (FU-11, rulings Q2/HI03/F07).** In `CHANGELOG.md`'s 1.0.0 "Known
  limits": "Pairing is for a trusted local network: anyone with the room code can act as a controller, and a peer that
  knows the host's id can take over the relay's host slot. A host-issued controller token and a host reconnect key
  come with the v1.1 relay. The relay's drop log has no rate limit (v1.1)."
- [ ] **Step 4 — soak with a busy Ventilator view (FU-11 list; CI WebKit).** Add to `RELEASE.md`: "With the
  Ventilator view open at ×4 and a Remote paired, the Remote shows its first state within 5 s and the host's frame
  p95 stays ≤ 20 ms for 10 min (record both)."
- [ ] **Step 5 — validation documents may declare an expected refusal (FU-11 J3, R50 M9).** Only if a document needs
  it by then: a `expect: { refused: true }` step field in `pme-validation/*` documents that makes a refusal the
  expected outcome; otherwise record "not needed" in the gate note.
- [ ] **Step 6 — R56 data gaps found by FU-11 H3.** (a) The fixed alarm words (`apps/demo/src/app/alarms.ts`
  `FIXED_ALARM_WORDS`) are not glossary data: move them into the glossary file (with Ali's review) or record why not;
  (b) the iec-defaults skins list `alwaysOn: []` while VF, VT and asystole still alarm on them: give them the
  documented list (with a provenance row) or record the gap.
- [ ] **Step 7 — commit:** `git add RELEASE.md CHANGELOG.md docs/gates/stage-8b/developer-pages.md …` and
  `git commit -m "docs(release): FU-11 hand-overs — tick gate, developer pages, trust limits, soak (8b Task 13b)"`.

**Executor notes on Task 13b (refresh 2026-10-10; the task text above is FU-11's appendix A2, verbatim).**

- Order: after Task 13 (its `RELEASE.md` and `CHANGELOG.md` exist), before Task 14. Re-run `docs-honesty` and
  `release-versions` after it (Step 3 adds release-notes text; Step 2 may remove pages).
- Step 1's budget: `docs/gates/stage-8a.md` states the p99 bound as "p99 ≪ 6 ms" (measured 0.53 ms over 600 s). Use
  `--budget-ms 6` unless the orchestrator's launch message gives another number, and write the number into
  `RELEASE.md` (no placeholder). `--budget-ms` exists only after FU-11-c (J5) has merged — the launch gate guarantees it.
- Step 3: this plan's CHANGELOG section is titled "Known limitations" (FU-11 wrote "Known limits"): add the text there.
  "v1.1 relay" is FU-11's wording; per `docs/roadmap/` there is no v1.1 feature release — write "a later release" in
  the CHANGELOG and tell the orchestrator (Decision 25). The text carries none of the `docs-honesty` claim words.
- Step 2: `apps/demo/src/app/views/dev.ts` is the Developer view on 48864439 (it lists the build-stage pages,
  `apps/demo/*.html`). Retiring a page means removing its link and its `.html` + entry files in the same commit, then
  `pnpm --filter @pme/demo exec tsc -p tsconfig.json`, `pnpm build`, and the e2e files that open that page (grep
  `apps/demo/e2e` for its name): an e2e that tests a retired page goes with it, and the gate note lists it. If the
  clean-up stage already retired pages before the freeze, record what is left. Rebase check 2026-10-13: the clean-up (Stage 14, plan `docs/plans/stage-14-cleanup.md`, untracked) runs AFTER the rc and has its own developer-page decisions (orchestrator rulings: keep stage5 and stage7c, fu4 conditional) — prefer "fix" or "keep, record the defect" over "retire" here, and list every retirement for Stage 14 so the two do not collide.
- Step 4 is a manual soak on the integrated tree (both numbers into the gate note); Step 5 is "not needed" unless a
  `pme-validation/*` document on your branch needs it; Step 6 (a)/(b) touch files outside this plan's own partition
  only as the partition note in Global Constraints allows — when in doubt, record the gap instead of editing.

---

### Task 14: Gate — full verification, gate note, PR (no merge, no tag)

**Files:** Create `docs/gates/stage-8b.md`.

- [ ] **Step 1: Re-check the launch gate and merge `main`.** `git fetch origin && git merge --no-edit origin/main`; FU-3, FU-4, V.1, FU-11, FU-7.1 and Stage 10 (and any stage the launch message listed) are on `main` (Task 1 Step 1). If anything new landed after the freeze, re-run Task 1 Step 3's find check for the files this stage touched and the affected tasks' tests. If it changed physiology (`git log --oneline <report-commit>..HEAD -- packages/engine-core/src packages/engine-core/data packages/ventilator/src` is non-empty, where `<report-commit>` is the one `docs/validation/report.md` names), re-run Task 12 Step 0 and update the pages, or make the validation summary name those changes as not re-measured.

- [ ] **Step 2: Full verification** (record every number and wall time; bounded background waits for the slow set and the e2e).

```bash
npx -y pnpm@9.15.9 install --frozen-lockfile
npx -y pnpm@9.15.9 typecheck
PME_TEST_SET=fast npx -y pnpm@9.15.9 test > <scratchpad>/stage-8b-release/fast.log 2>&1
PME_TEST_SET=slow npx -y pnpm@9.15.9 --filter @pme/engine-core test > <scratchpad>/stage-8b-release/slow.log 2>&1   # background, ≤ 10 min per wait
PME_TEST_SET=showcase npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run > <scratchpad>/stage-8b-release/showcase.log 2>&1   # Stage 11's card tests (CI's test-slow `showcase` group; ≈ 3.5 min alone)
npx -y pnpm@9.15.9 build
npx -y pnpm@9.15.9 check-notices && npx -y pnpm@9.15.9 check-licences && npx -y pnpm@9.15.9 check-size
npx -y pnpm@9.15.9 pack-smoke <scratchpad>/stage-8b-release/pack-smoke
npx -y pnpm@9.15.9 docs:api
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 test:e2e > <scratchpad>/stage-8b-release/e2e.log 2>&1   # background
git status --short   # restore every other stage's screenshot the e2e rewrote; nothing under docs/api
```

Expected: typecheck clean; fast and slow sets as on `main` plus this stage's validation tests (the known `it.fails` report as expected failures); build clean; the three checks OK (`check-size` ≈ 278 KB gzip on 48864439 + what FU-11, FU-7.1 and Stage 10 added, ≤ 400); `pack-smoke: OK`; TypeDoc exit 0; e2e all pass except known flakes — the `stage6a` relay/rtc page-load timeouts under parallel load are pre-existing (prototype: 2 failures in the full run, both pass when `apps/demo/e2e/stage6a.e2e.ts` is re-run alone); the retry-only candidates seen on `main` CI (rulings log, 2026-10-11/12: WebKit `fu11-explore-baseline:31`, `fu11-restore:15`, `stage7d:36`, `stage9-app:15`, `scenario-choose-another:14`; Chromium `s10-time-control:30`) are Stage 14's known-flaky list, not this stage's; re-run any failing file alone and record both results.

- [ ] **Step 3: Gate note** `docs/gates/stage-8b.md` with: the launch-gate evidence (FU-3, FU-4, V.1, every FU-11, FU-7.1 and Stage 10 branch, and any other pre-freeze stage: PR numbers and merge commits) and the Step 3b block re-check result; the validation report found on `main` at launch (commit, Summary line, the physiology merges it predated — Task 1 Step 1) and the one regenerated in Task 12 Step 0 (commit, Summary line, wall time); any re-anchored find blocks and informational `package.json` lines; the `release-manifests` diffs (nothing but the publish fields and controller's `ws`); the IIFE before/after (raw, gzip -9, brotli) and the `check-size` line; the IIFE smoke paths (Chrome here; WebKit from CI on the draft PR, with the run links of the checks after Tasks 2, 4 and 8); the ESM package list with `dist` sizes and the `pack-smoke` line; `check-licences` output (package and shipped counts, licence list, the `LICENSES/` files); TypeDoc (time, pages, warnings); the embed sizes (with engine-core's `sideEffects` list), the e2e numbers (`vent-embed {…}` line with `simPerWall`, locally AND from CI's run) and the Safari double-click result with the Safari version; test counts (fast, slow, e2e) with wall times; the two gate JPEGs and the README JPEGs (all ≤ 60 KB); deviations from this plan; the FU-11 hand-overs (Task 5 amendment: the build key and its test; Task 13b: the tick-gate budget, the developer-pages record, the trust-limit text, the soak numbers, Steps 5–6 outcomes); later-release items (a built relay bin, Q7; the exported default `stage1Vocabulary(engineVersion = '0.0.0')`, Decision 22); a short "honesty" paragraph: how many expected failures and skipped tests the known-deviations page lists and that no page claims clinical validation.

  It also carries a section **"Licence items for legal review before the v1.0 tag (brief §10)"** (orchestrator ruling, 8b review; BUILD-PLAN Stage 8 "licence review items (brief §10) closed or documented", Definition of done 10 "resolved or listed") — one row per §10 item with its status and evidence, from the files in this repo (NOTICES.md, the brief §8/§11, the gate notes); rows that need a lawyer say **"open, for Ali"**:

  | §10 item | Status at this release |
  |---|---|
  | ECGSYN-derived "MIT" ports | not used: ECGSYN is a forbidden source (brief §8; R6); no file derives from it |
  | ODC-By templates bundled in an MIT package (N-050, N-051) | bundled with attribution in NOTICES.md, the IIFE banner and every distribution's `NOTICES.md`; whether ODC-By attribution-by-NOTICES suffices: open, for Ali |
  | VitalDB DUA (vitaldb.net) vs the PhysioNet CC BY copy | validation only, the PhysioNet CC BY 4.0 copy; nothing bundled |
  | PWDB PDDL on Zenodo | validation only (not fetched in 8a: 403); nothing bundled |
  | CapnoBase | excluded (brief §8) |
  | MIMIC ODbL share-alike | excluded (brief §8) |
  | Apache NOTICE obligations (N-P rows, TypeDoc assets) | `LICENSES/Apache-2.0.txt` and the NOTICES excerpt ship with every artefact (npm `dist/`, embed zip, `LICENSES.zip`, API zip); statement of changes per N-P row |
  | PTB-XL licence mismatch (§11 C5) | report-only comparison (N-052), nothing bundled; FILL: the mismatch as §11 C5 states it and whether it is resolved, or "open, for Ali" |

  (Fill the table from the repo's documents; add PulseDB/other rows if NOTICES or the brief name more. No `FILL:` may remain in the committed gate note.)

  BUILD-PLAN Stage 8 acceptance, as delivered by 8a + 8b — never present an unmet item as met (orchestrator ruling, 8b review): **(1) and (2) NOT MET at this release**: <red count> gating rows in the regenerated report (list the gating ones) and the blind realism review not run; (3) partly (8a's perf numbers; the iPad not measured); (4) size ✓ with the number; (5) embed ✓ with the numbers (Chrome by e2e, Safari by hand); (6) licence ✓ — `check-notices`, the extended `check-licences` (every shipped text in `LICENSES/`, every `LICENSES/` path NOTICES names present) and the legal-review section above. Definition of done: 1 and 8 not met (as acceptance 1–2); 9 — the IIFE and ESM packages are built and publishable (publishing = Q1), and "the ventilator-sim PR has been handed to Ali" is superseded by R35 and the Q4 ruling (the embed ships in this repo); 10 per the legal-review section. Open questions: none open — Q1, Q2, Q3, Q5, Q8 ruled by Ali (2026-10-10, Decision 23); Q4, Q6, Q7 ruled 2026-09-27; Q9 ruled yes.

- [ ] **Step 4: Commit, push, PR.**

```bash
git add docs/gates/stage-8b.md docs/gates/stage-8b docs/plans/stage-8b-release.md
git commit -m "docs(gates): Stage 8b gate note — IIFE size, embed acceptance, packaging, docs, CI

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin stage-8b-release
{ cat docs/gates/stage-8b.md; printf '\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n'; } > <scratchpad>/stage-8b-release/pr-body.md
gh pr edit stage-8b-release --title "Stage 8b: 1.0.0-rc.1 release candidate, docs and IIFE embed" --body-file <scratchpad>/stage-8b-release/pr-body.md && gh pr ready stage-8b-release
```

(The PR was opened as a draft in Task 2; this finalises its body and marks it ready for review.) Then wait (bounded, as in Task 2 Step 5) for `gh pr checks <n>`: `build`, `renderer`, `e2e (chromium)`, `e2e (webkit)` and the eight `test-slow` groups green (PR #55 shape); copy both e2e jobs' "e2e tests that passed only on retry" output into the gate note. Fix red checks on the branch. **Do NOT merge and do NOT tag** (R21; `RELEASE.md` is the orchestrator's). Report: commits, test counts, the key numbers, deviations, open questions.

---

## Open questions for the orchestrator / Ali

**Status after the refresh (2026-10-10): ALL CLOSED.** Q1, Q2, Q3, Q5 and Q8 ruled by Ali (Decision 23); Q4, Q6 and Q7 ruled 2026-09-27 22:29; Q9 ruled yes (8b review). Each entry keeps its history.

- **Q1 — npm or GitHub-only?** **RULED (Ali, 2026-10-10): GitHub release only.** No npm publish at the release candidate; the packages stay publishable (`publishConfig`, declarations) and `pack-smoke` stays in CI, so publishing later needs no code change. The README and CHANGELOG say "build from source"; `RELEASE.md` "After the workflow" step 3 says so. (History: the reviewer had recommended exactly this.)
- **Q2 — Package scope name.** **RULED: not applicable** (follows from Q1: nothing is published). `@pme/*` stays the workspace name; the CHANGELOG says the npm names are provisional, so a rename before a first publish is not a semver break.
- **Q3 — API reference hosting.** **RULED: attached as a zip** (`api-reference-v1.0.0-rc.1.zip`); no GitHub Pages deploy at this release.
- **Q4 — The old `projects/ventilator-simulator`.** **RULED 2026-09-27 22:29: no** monitor panel for the old project (R35 forked the ventilator into this repo and the old project stays as-is; the embed ships here). The gate note records BUILD-PLAN Definition of done 9's "the ventilator-sim PR has been handed to Ali" as superseded by R35 and this ruling.
- **Q5 — DOI.** **RULED: no DOI at the release candidate.** The Zenodo step is a documented follow-up for 1.0.0 (`RELEASE.md` "Later: 1.0.0": enable the repository in Zenodo before the `v1.0.0` tag, then add `doi:` to `CITATION.cff`).
- **Q6 — IIFE budget going forward.** **RULED 2026-09-27 22:29: keep 400 KB gzip** as the CI limit. Refresh: 277.9 KiB on 48864439, headroom 122 KiB. If a later stage needs more, raise it by ruling, not by editing `check-size.ts` in that stage.
- **Q7 — The relay bin.** **RULED 2026-09-27 22:29: not in this release** (the ruling said "v1.1"; per `docs/roadmap/` there is no v1.1 feature release, so: a later release). Not published in 1.0.0-rc.1 (`publishConfig.bin: {}`, `ws` → devDependencies).
- **Q8 — Version label.** **RULED (Ali, 2026-10-06/10): `1.0.0-rc.1`**, tag `v1.0.0-rc.1`, GitHub pre-release flag ON; the unmet BUILD-PLAN Stage 8 acceptance 1–2 (and Definition of done 1/8) is stated in the CHANGELOG's "Known limitations" and the gate note. Never "v1.0 released".
- **Q9 — A validation report of the release tree.** **RULED YES (8b review, 2026-09-27): in 8b, not in a separate PR** — Task 12 Step 0 runs `pnpm validate` on the executor's own tree and commits the regenerated `docs/validation/report.{md,json}` and `calibration-queue.md`; the validation summary names the report's commit and any physiology merged after it.

**Left for the orchestrator (not blocking the plan; decide before or at launch):**

1. **The launch-gate list.** The plan names FU-11 (a–d), FU-7.1 (a, b, and c if started) and Stage 10. The showcase scenarios, the QR learner monitor and the clean-up stage have no plan yet: the launch message must say which of them merged before the freeze (Task 1 Step 1 stops on any listed branch that is open).
2. **The tick-gate budget** for FU-11's `perf:ticks --budget-ms` in `RELEASE.md` (Task 13b Step 1): the plan uses 6 ms (Stage 8a's stated bound "p99 ≪ 6 ms"; measured 0.53 ms) unless the launch message gives another number.
3. **FU-11's appendix says "v1.1 relay"** (Task 13b Step 3, verbatim). The roadmap has no v1.1; the executor writes "a later release" in the CHANGELOG (Decision 25). Amend FU-11's appendix wording if you want the two documents to agree.
4. **FU-11 A1 (build-unique engine version) is unprototyped** and lands in a release stage after the showcase freeze; it changes when snapshots restore (a `dev` build accepts only `dev`; a release build only its own hash). If the hosted showcase or the learner monitor will run a release build next to a `dev` build, confirm that refusing cross-build snapshots is wanted.
5. **FU-11's review notes handed to 8b without appendix text** (FU-11 plan, "review notes" row: stale README/CONTRACT wording, dist notices, Vitest GHSA-82fw-gwwq-j7x9 (dev-only), unused exports, the retired CVP waveform path). The README is rewritten here (Task 10) and dist notices are covered (Task 4); the CONTRACT wording, the dev-only Vitest advisory, unused exports and the retired CVP path have no task in this plan — route them to the clean-up stage or add them here.
6. **Env-tunable physiology constants in shipped code** (`packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts:54–55` read `globalThis.process?.env.PME_VAG_*`): any page that defines `process.env` can change the fentanyl/remifentanil vagal effect in the released IIFE. Not a physiology change for this stage (R45) — route to FU-7.1 or the clean-up stage before the freeze.
7. **The stale `test.fail` in `apps/demo/e2e/stage9-tasks.e2e.ts:74`** ("ΔP … is published by Stage 7k, not yet merged") — 7k has merged; the clean-up stage should remove the annotation, otherwise known-deviations.md lists it.

**Rebase check 2026-10-13 (against 56f3761f; details in `scratch/plans-backup/stage-8b-rebase-check-2026-10-13.md`):**

8. Items 5–7 above were routed to the clean-up stage (ruling 2026-10-10), and Stage 14 now runs AFTER the rc: the rc therefore ships with the `PME_VAG_*` env read in the IIFE, the stale `stage9-tasks` `test.fail` (listed on known-deviations.md) and the FU-11 review leftovers. Say so in the gate note, or move item 6 (constants only) into this stage by ruling.
9. **FU-11 A1 versus the showcase.** A1 (Task 5 note) changes when snapshots restore and is unprototyped; the phones (Stage 12) and the second screen (FU-11 d) pair through that check. If the 8b PR merges before Thursday 22 Oct, the showcase kit must be rebuilt and rehearsed on it; otherwise the showcase runs the freeze build (on-screen there is no version label, so nothing reads 0.0.0 to the audience — only package metadata does).
10. **Owner-pending items** (Stage 12 gate step 4, Stage 13 print check, H17–H21) must be closed or stated as open in the release notes (Task 13 now has a FILL for it).
11. **App text the docs-honesty test does not scan:** `apps/demo/src/app/pairing.ts:37,46` still promises network pairing "in version 1.1" (the roadmap has no v1.1 feature release) and the app has no "education only, not a medical device" line outside the Debrief's print footer (`debrief.ts:21`). Both are outside this stage's partition — route or rule.
12. **The kit's classroom relay crash KR-A1** (open PR #63, `docs/showcase/kit-round-a/KR-A1-relay-crash.txt`: the bundled `server/relay.mjs` stops on the first ≥ 32-byte frame) is not in the release assets, but the CHANGELOG now names the phones feature: do not tag before it is fixed or the text says the classroom kit is not part of the rc. `docs/showcase/RUN-STEPS.md:1` links `SHOWCASE-2-MEASUREMENTS.md`, which is not on `main`.
13. **Time.** This plan has 15 tasks and no per-task budget; the rebase check estimates ≈ 18–28 executor hours plus CI waits (see the check file). From Monday evening, a reviewed PR before Thursday is unlikely without splitting: run Tasks 1–9 and 13–14 first (the rc mechanics) and let Task 12's three pages (151 rows, 157 ids) be the long pole, or decide that the rc tag follows the showcase.

## Self-review

- **Spec coverage.** BUILD-PLAN Stage 8 minus 8a: TypeDoc (T7), embedding guide (T11), scenario authoring (T11, with FU-3's `patient.profile`), skin authoring (T11), licence review (`NOTICES` N-015, `check-licences` requiring every shipped text in `LICENSES/`, the licence texts in every distribution, T4/T6/T7/T8/T9; the brief §10 legal-review items listed in the gate note, T14), npm-ready packages at 1.0.0-rc.1 (T4/T5; publishing = Q1), GitHub release with the IIFE (T9 + `RELEASE.md`), the ventilator-sim embed from `file://` with FiO2/shunt/RR acceptance (T8), size acceptance 4 (T2/T3), licence acceptance 6 (T6/T9). The brief's extras: physiology overview with MODELED labels (T12), validation summary on a validation report regenerated on the release tree (T12 Step 0, Q9) + known deviations with every expected failure and skip (T12, R53), unmet acceptance 1–2 stated as unmet (T12, T13, T14), README/CITATION/CONTRIBUTING/SECURITY/issue templates (T10), CHANGELOG/RELEASE (T13), release workflow; fast/slow split and `validation.yml` untouched (T9). R53: launch gate, find re-verification at launch (Global Constraints, T1), the FU-4 "Clinical scenario suite results" placeholder (T12), the tag waits for FU-3, FU-4 and V.1 (T1, T14, `RELEASE.md`).
- **R45.** No physiology file, band or existing assertion changes; the two new embed bands are this stage's own acceptance tests, set below the prototype with margin, and a later miss becomes a Playwright `test.fail` with numbers, not a wider band.
- **Placeholders.** Code blocks are the prototype's files, plus the R50 fixes (see Prototype results for what was and was not run). The only `FILL:` markers are in the three regenerated pages (incl. a plan note in the overview and the `FILL: tracked in` cells `deviations.ts` prints), the embedding guide's lung-state field list (from V.1's `LungStateEvent`), NOTICES N-015's date, the CHANGELOG body/date/known limitations (incl. the sepsis sentence and the keep-or-drop pulsus line, refresh), the README's clinical-app view names and the embedding guide's time-scale range (refresh), the CITATION date and the gate note's legal-review table — deliberate (R53: written at execution time), each naming its source; the `docs-honesty` test fails while any remains in the release docs or NOTICES.md, and the gate note must carry none.
- **Find blocks.** Checked mechanically by the Task 1 Step 3 script, in task order: **44 find blocks, 0 problems** on `main` 9f864b3 and again on 7a181b5; the whole plan was then applied to a clean tree and built and tested (see Prototype results). After the R50 fixes: **43 find blocks, 0 problems** on 5b56a5c and 3f9dd01; the six library manifests are set by `scripts/release-manifests.ts` instead (checked against the removed blocks). Blocks in files FU-3 also edits (`packages/engine-core/vite.config.ts`: its SLOW list; `packages/renderer/src/index.ts`: an export line) anchor on lines FU-3 does not touch. **Refresh 2026-10-10:** 43 find blocks, 0 problems on 48864439 and on the simulated freeze tree (after re-anchoring the `engine.worker.ts` tail, Decision 28); the whole refreshed plan was applied to 48864439 and built, packed, documented and e2e-tested (Prototype results). Task 1 Step 3b repeats the check on the real merged tree.
- **Refresh 2026-10-10 summary.** Blocks checked 43 (+ 49 creates and one overwrite, applied in order); repaired 1 (`engine.worker.ts` tail); code changed after re-prototyping in 4 places (the six `tsconfig.build.json` types, `scripts/deviations.ts`, `release.yml`'s notes `awk` and pre-release flag, the embed e2e's version literal via Q8); text updated for Q1/Q2/Q3/Q5/Q8, the launch gate, Step 3b, the FU-11 amendments (Task 5 note, Task 13b), the owner's known limitations, Stage 10's time-scale range and the re-measured numbers.
- **Type consistency.** `EngineWorker` (T2) has the default-export class shape `worker-host.ts` constructs (now with `{ name: 'pme-engine' }`, which Vite's inline-worker type accepts); `startWorker(WorkerScope)`; `measure`/`checkSize`/`GZIP_BUDGET_BYTES`/`findWasm` (T3), `rewriteDts` (T4), `releaseManifest`/`RELEASE` (T4), `auditLicences(all, prod, notices, licenceFiles)`/`LicenceReport` (T6), `listDeviations`/`listSkipped`/`unreadableFails`/`failsTitles` (T12) match their tests; `Embed`/`mountEmbed` (T8) match the e2e's `__embed` use (`last`, `simT`, `setVent`, `setSpeed`, `monitor`, `vent`).
- **Process.** Worktree `../scratch/wt-stage-8b`, branch `stage-8b-release`, push per task, a draft PR from Task 2 on (CI's WebKit sees the self-source worker early; marked ready in Task 14), explicit `git add` paths (e2e rewrites other stages' screenshots), no stash, scratch under `<scratchpad>/stage-8b-release/`, bounded waits, PR titled as required with the Claude Code footer, no merge, no tag.
