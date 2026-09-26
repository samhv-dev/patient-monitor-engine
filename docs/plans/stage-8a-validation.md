# Stage 8a: Validation Harness — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One command (`pnpm validate`) that measures the engine against recorded patients (VitalDB, MGH/MF, PWDB, PTB-XL, CUDB/MIT-BIH), runs every sanity, gate and oracle scenario headless as graded segment-validation documents, and writes `docs/validation/report.md` + `report.json` with a calibration queue for Ali's pass (R44). Stage 8a also ships the blind realism-review kit, the Saadat bedside checklist page and the performance gate.

**Architecture:** Everything lives in `@pme/validation` (dev-only, never shipped). Four layers: (1) **datasets** — checksum-verified fetchers into the git-ignored cache, a `.vital` reader, committed manifests that hold only record ids, times and hashes; (2) **metrics** — ONE implementation of every fiducial/metric, applied identically to recorded and generated signals (a `Signals` bundle in, per-beat/per-breath arrays out); (3) **suites** — the morphology suite (recorded window ↔ matched engine run), segment-validation documents (`pme-validation/1`: Stage 6b scenarios + typed targets EqualTo/GreaterThan/LessThan/TrendsTo/Range + 10/30 % grading), waveform regression baselines (2 % per-sample), determinism hashes and the Pulse differential oracle; (4) **reports** — markdown + JSON writer, calibration queue. Browser pieces (review page, bedside checklist, perf page) live in `apps/demo/validation-*.html` and reuse the renderer's `SweepLane` so recorded and synthetic clips go through the same drawing code.

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2, Vite 6.4, **vite-node 3.2.4** (already in the lockfile as Vitest's dependency; added as a devDependency of `@pme/validation` to run harness scripts), Node ≥ 22.12, Playwright 1.63 with system Chrome. No runtime dependencies.

**Spec:** `docs/DESIGN-BRIEF.md` §9 (validation strategy, V1–V9, blind review protocol) and §8 (licence, datasets, NOTICES); `docs/BUILD-PLAN.md` "Stage 8" (validation half; docs/release/embed are Stage 8b); rulings (workspace `../research/00-orchestrator-rulings.md`) R6, R9, R21, R34, R37, R39, R40, R44; `../research/02-open-source-and-academic.md` §D (datasets); `../research/08-pulse-design-audit.md` §1.1 item 1, §2.7, §3 rows N-P01/N-P02; `../research/09-evidence-rulings.md` (bands); `docs/physiology/pulse-parameter-annex.md` §C (expected disagreements D1–D25) and §D (oracle O1–O12); `docs/physiology/stage-7-parameter-tables.md` §2.3 and §7 (sanity scenarios); `../research/06-saadat-alborz-b9.md` §7 (bedside checklist); `docs/gates/stage-*.md` (the numbers to make reproducible).

## Global Constraints

- **Base.** Written and prototyped against `main` at `6eeb6d1` ("docs: 5.1 merged; runbook table for V/7a/7b/3.1"). Stages 3.1, V, 7a, 7b were NOT on main then. If main has moved when you start, run Task 1 step 3 and, where a later "replace" anchor does not match, apply the plan's intent and record it under "Deviations" in `docs/gates/stage-8a.md`. **Never edit `packages/engine-core/**`, `packages/renderer/src/**`, `packages/controller/src/**` or `packages/skins/**`**: when a metric shows a model problem it goes to the calibration queue, not into a fix (R44).
- Paths are relative to the worktree root `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/wt-stage-8a`; run every command from there unless a step says otherwise. pnpm is always `npx -y pnpm@9.15.9` (docs/RESUME.md). No `timeout` on macOS. Playwright on this Mac: `PW_SYSTEM_CHROME=1`.
- **Harness scripts run under `vite-node`**, never `node --experimental-strip-types`: engine-core imports skin JSON without import attributes and plain Node fails with `ERR_IMPORT_ATTRIBUTE_MISSING` (measured while planning). From the repo root: `npx -y pnpm@9.15.9 --filter @pme/validation exec vite-node <file>`; inside `packages/validation`: `npx vite-node <file>`.
- Strict TS with `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, `.ts` import extensions, conventional commits ending with the trailer your session's attribution instructions give. Every constant carries a citation or `[ENG]`.
- **Datasets and licences** (checked on the project pages while planning, 2026-09-26):
  - VitalDB 1.0.0, PhysioNet copy https://physionet.org/content/vitaldb/1.0.0/ — **CC BY 4.0**; files `vital_files/NNNN.vital` (gzip, VitalRecorder format), `clinical_data.csv`, `lab_data.csv`, `track_names.csv`, `SHA256SUMS.txt`. Cite: Lee HC, Park Y, Yoon SB, Yang SM, Park D, Jung CW. VitalDB, a high-fidelity multi-parameter vital signs database in surgical patients. *Sci Data* 9:279 (2022). Only the PhysioNet copy is used (vitaldb.net has its own data-use agreement, R6).
  - MGH/MF Waveform DB 1.0.0 https://physionet.org/content/mghdb/1.0.0/ — **ODC-By 1.0**; WFDB format 212, 360 Hz, signals ECG I/II/V, ART, PAP, CVP, Resp. Imp., CO2 (per-record `.hea`). Cite: Welch J, Ford P, Teplick R, Rubsamen R. The Massachusetts General Hospital-Marquette Foundation Hemodynamic and Electrocardiographic Database. Proc Image Management and Communication (1991).
  - PWDB 0.1.0 https://zenodo.org/records/2633175 (DOI 10.5281/zenodo.2633175) — data **PDDL 1.0** (Zenodo licence field `odc-pddl`); files used: `pwdb_pw_indices.csv` (21.8 MB), `pwdb_onset_times.csv`, `pwdb_haemod_params.csv`; Zenodo gives MD5, not SHA-256. Cite: Charlton PH et al. Modeling arterial pulse waves in healthy aging: a database for in silico evaluation of hemodynamics and pulse wave indexes. *Am J Physiol Heart Circ Physiol* 317:H1062–H1085 (2019). PDDL asks nothing, we attribute anyway.
  - CUDB, MIT-BIH, PTB-XL: exactly as Stage 5 (NOTICES N-050…N-052); Stage 8a adds no bundled data.
  - Raw records NEVER enter git. Committed: manifests (record ids, analysis-window times, SHA-256), derived statistics (medians, quantiles, distributions of our metrics), the report. Clip bundles for the blind review stay in the cache.
  - CapnoBase, MIMIC, PulseDB stay excluded (brief §8).
- **Cache:** `packages/validation/datasets/cache/` (already git-ignored), overridable with `PME_DATASET_CACHE` (absolute path). Pulse oracle files come from `PME_PULSE_DIR` (a directory with `pulse.js`, `pulse.wasm`, `pulse.data` — the spike build in `../research/pulse-spike/web/`); the oracle is skipped, and says so in the report, when it is unset. `pulse.wasm` is never committed (it would need the full Pulse `NOTICE` incl. Eigen/protobuf/abseil, annex §E).
- **NOTICE IDs N-080…N-089 are reserved for Stage 8a** (N-080 VitalDB, N-081 MGH/MF, N-082 PWDB, N-083 Pulse segment-validation method = audit N-P01/N-P02, N-084 Pulse oracle, used at run time only).
- **CI rule (binding).** Unit tests of metrics, grading, readers and writers must be fast (< 5 s per file, no network, no dataset). Anything that downloads data or runs more than ~2 sim-minutes lives behind `pnpm validate` and runs in `.github/workflows/validation.yml` (weekly schedule, `run-validation` PR label, manual dispatch) — never on every push. Any loop that runs the engine for more than one sim-minute yields to the event loop once per sim-minute (docs/RESUME.md).
- **Push after every task commit** (`git push origin stage-8a-validation`); never push to main; the last task opens the PR and does not merge (R21).
- Test commands: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run <path>`. Full: `npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices`.

## Partition (binding)

- **Stage 8a owns:** `packages/validation/**` (except `src/templates/**`, which it only imports), `docs/validation/**`, `docs/gates/stage-8a*`, `apps/demo/validation-*.html`, `apps/demo/src/validation/**`, `apps/demo/e2e/*.soak.ts`, `playwright.validation.config.ts`, `.github/workflows/validation.yml`.
- **Shared files, one hunk each:** root `package.json` (Task 20: one `validate` script), `apps/demo/vite.config.ts` (Tasks 22, 24, 25: one input entry each), `NOTICES.md` (Tasks 3, 18: append rows), `pnpm-lock.yaml` (Task 1).
- **Read-only:** everything else. Stage 8b (docs, v1.0 release, IIFE embed) is a separate plan.

## Decisions this plan makes where the spec was silent or inconsistent

1. **VitalDB is read from `.vital` files.** The PhysioNet copy is not WFDB. `src/datasets/vital.ts` is written clean-room from the published file-format description (VitalRecorder "Vital File Format"; the reader code of `vitalutils`/`vitaldb` is not opened). It parsed case 0001 (21 MB gz, 79 tracks) in 0.31 s.
2. **Case selection is by metadata, verified by tracks.** `clinical_data.csv` has no track list, so 64 candidates are chosen deterministically from metadata strata (radial/femoral line, age band, sex, pre-op ECG, emergency, department); each is downloaded and kept only if it has synchronous `SNUADC/ECG_II`, `SNUADC/ART`, `SNUADC/PLETH` and `Primus/CO2` (+ `Primus/AWP`). The first 40 that pass form the manifest; hypotensive episodes (`Solar8000/ART_MBP` < 65 for ≥ 60 s) are tagged from the numerics after download.
3. **One metric implementation for both sides.** `computeWindowMetrics(signals)` takes the same `Signals` bundle whether the samples come from a recording or from `capture()`; the only side-specific code is how inspiration onsets are found (airway-pressure wave for recordings, `breath` events for the engine).
4. **Capnogram α keeps the Stage 3 convention** (`packages/engine-core/test/helpers/resp.ts`, 25 mmHg/s axis, R39 item 6) with ONE change: the walk back to the start of the upswing uses `<=`, so sample-and-hold recorders (the Dräger Primus in VitalDB updates ≈ 25 Hz inside its 62.5 Hz track) are measurable. Measured while planning: on engine capnograms both versions give identical angles (max difference 0.0000° at EtCO2 38, 30 and in bronchospasm 0.8); with `<` the VitalDB trace yielded no breaths at all.
5. **Matched engine runs.** A recorded window is matched by HR, SBP/DBP (baseline targets), ventilator RR/VT (a `ventilation` event at t = 0), arterial site, and EtCO2 through a `setTarget etco2` dispatched AFTER the ventilation event (measured: an `etco2` baseline target is overridden by the ventilation start; the engine read 39.4 mmHg instead of 30). Engine runs 60 s of warm-up and then the window's length.
6. **Engine ring buffers hold 120 s** (`BUFFER_SECONDS`), so `capture()` copies samples out after every ≤ 20 s chunk.
7. **Grading (R40 borrow #1, method re-implemented from the audit's description; no Pulse code opened).** `errPct` = 0 when a target holds, else the distance to the nearest satisfying value in % of that value. Green = holds (EqualTo/TrendsTo within `tolPct`, default 10 %; an evidence band replaces the 10 % zone, R37/R39); yellow = misses by < 30 %; red = ≥ 30 % or missing. **Red gates `pnpm validate` (exit 1); yellow is reported, not gating.** The calibration queue lists every yellow and red row.
8. **Scenario documents that the current build cannot run are "not measurable", not red.** The segment runner wraps the host's `dispatch`: if the engine rejects a scenario/action command with `not implemented`/`unknown`, the document is listed as not measurable on this build (with the rejected command). This lets the §7 sanity set land before Stage 7's modules merge and become live as 7a–7g land.
9. **Regression baselines**: numerics at 1 Hz and 10 s waveform windows per channel, stored as JSON in `packages/validation/baselines/` (our own engine output, MIT). Waveforms: per-sample limit 2 % of `max(|baseline|, 5 % of the window's peak-to-peak)` [ENG — the floor stops near-zero samples from exploding the relative error]; RMS reported. Numerics: the gate's band. Rebaselining is explicit (`pnpm validate --rebaseline`).
10. **Determinism (V9)**: gating check is "two runs in the same process give identical SHA-256" for every (rhythm, seed); comparison with the committed golden file is informational (any engine change legitimately moves it).
11. **MGH/MF CO2 is uncalibrated** (header gain 1000, no unit). It is normalised so the median plateau reads 38 mmHg [ENG] and its α is report-only; VitalDB's `Primus/CO2` (mmHg) is the graded α reference.
12. **Blind review clips are drawn live by the review page** with the renderer's `SweepLane` from a clip bundle in the cache (recorded and synthetic samples resampled to the engine's rates: ECG 500 Hz, ABP/pleth 125 Hz, CO2 62.5 Hz). No video encoding; nothing recorded leaves the machine; the hidden key sits next to the bundle, not in the page.
13. **Pulse oracle in Node** (not a browser): the spike's `pulse.js` is a web/worker build; Node loads it by requiring it with three shims (`globalThis.WorkerGlobalScope`, `self`, `location`) and a `fetch` that reads local files. Measured while planning: ready in 29 ms, `StandardMale.json` loads, 10 s simulated gives HR 72.0, MAP 95.3, SaO2 0.974, EtCO2 36.2.
14. **Performance soak** is a Playwright file matched only by `playwright.validation.config.ts` (`*.soak.ts`), run by the scheduled workflow; worker tick percentiles are measured in Node on the same engine code (the worker has no timing hook and the partition forbids adding one).

## Prototype results (while planning, 2026-09-26; scratchpad copy of main `6eeb6d1`, dataset cache in the scratchpad, nothing committed)

Real vs engine, 5-minute windows, identical metric code (Tasks 7–8 as written):

| Metric | VitalDB case 0001 (77 y M, left radial, 3000–3300 s, HR 80, 158/66, vent RR 10 / VT 480) | Engine matched to 0001 (seeds 11/12/13) | MGH/MF mgh021 (75 y M, upper GI bleed, NSR 92 per header; 600–900 s, HR 80, ART 78/58) | Engine matched to mgh021 |
|---|---|---|---|---|
| R → radial foot, median (IQR), ms | **160** (156–168) | **159** (158–160) | **155** (154–157) | **159** (158–160) |
| R → dicrotic notch, ms | **506** (494–524), inflection-type in 100 % of beats | **462** (456–468), true minimum in 100 % | **381** (378–381), minimum | **456** (452–462) |
| Notch depth (P_sys − P_notch)/PP | 0.63 | 0.75 | 0.37 | 0.80 |
| Max upstroke dP/dt, mmHg/s | 877 | 1410 | 303 | 344 |
| Capnogram α (25 mmHg/s axis) | **115.7°** (113.1–117.2, n 49) at EtCO2 30 | **109.1°** (109.0–109.2, n 49) at EtCO2 30.5 | 97.0° (CO2 normalised, report-only) | 111.6° at EtCO2 27 (not matched) |

Reading: the R→upstroke delay already agrees (Δ −1 ms VitalDB, +4 ms MGH; V1 ±20 ms). The engine's dicrotic notch is **44 ms early** vs VitalDB and 75 ms late vs a hypovolaemic MGH patient, always a deep true minimum where the radial recordings show a shallow inflection, and the upstroke is 1.6× steeper at matched pressures; recorded beat-to-beat spread (IQR 12–30 ms) is 3–6× the engine's. The VitalDB α (115.7°) lies ABOVE the R39 normal band 100–110°, the engine's (109.1°) inside it: sidestream sampling and the ≈ 25 Hz update smear phase II in the recording — a band-vs-recording question for Ali's calibration pass, not an engine bug. These rows are the first entries of the calibration queue. Other planning measurements: engine α at EtCO2 38 = 105.9°; bronchospasm severity 0.8 = 150.3° on `6eeb6d1` (Stage 3.1's remap to 135° was not merged yet).

- Segment runner on `or-induction-hypotension` (Stage 6b built-in, 420 s, poll 100 ms): states preInduction → induction (30 s, manual trigger) → hypotension (90 s) → profound (161 s); 7 targets, all green; 1.5 s wall.
- The first graded morphology suite (9 windows: VitalDB 1885, 3101, 1341 × 2 + MGH/MF 001–003) is in Task 11; the sanity set in Task 13; gate numbers in Task 14; the Pulse oracle in Task 16; performance in Task 23.
- The finished plan code: `@pme/validation` 83 unit tests + 1 skipped (Pulse test without `PME_PULSE_DIR`) across 26 files, `pnpm typecheck` clean, review and bedside e2e tests pass, a 2-min soak passes (24 tasks).
- Pulse oracle loaded in Node as in decision 13.

## File map

| Path | Responsibility |
|---|---|
| `packages/validation/src/datasets/cache.ts` | Cache directory, env override |
| `…/datasets/sources.ts` | Licence/attribution/NOTICE row per dataset |
| `…/datasets/fetch-zenodo.ts` | Zenodo download with MD5 check |
| `…/datasets/vital.ts` | `.vital` reader |
| `…/datasets/vitaldb.ts` | Candidate selection, case load, window finder |
| `…/datasets/mghdb.ts` | MGH/MF header metadata, channel map, windows |
| `…/datasets/pwdb.ts` | PWDB CSV parse and per-site/age distributions |
| `…/datasets/signals.ts` | `Signals`/`Wave`/`AnalysisWindow` types, recorded-window loader |
| `…/datasets/cli-fetch.ts` | `datasets:fetch` command (manifests → cache) |
| `packages/validation/datasets/manifests/*.json` | Committed manifests (ids, windows, hashes) |
| `…/src/stats.ts`, `src/segments/grade.ts` | Quantiles, KS, Wasserstein, coverage; 10/30 % grading core |
| `…/src/metrics/{ecg,abp,capno,resp-variation,ppg,device,intervals,window-metrics}.ts` | Metrics |
| `…/src/engine/{capture,match}.ts` | Headless engine capture; recorded-window matching |
| `…/src/morphology/{bands,suite}.ts` | Evidence bands; recorded-vs-engine suite |
| `…/src/segments/{types,grade,series,run}.ts` | `pme-validation/1` runner |
| `…/suites/sanity/{or-induction-hypotension.json,sanity-docs.ts}`, `suites/gates/gate-docs.ts` | Segment-validation documents |
| `…/src/regression/{baseline,determinism}.ts`, `packages/validation/baselines/` | 2 % regression; V9 hashes |
| `…/src/oracle/{pulse-node,oracle}.ts` | Pulse differential oracle |
| `…/src/report/{types,write}.ts` | `report.md` + `report.json`, calibration queue |
| `…/src/cli/validate.ts` | `pnpm validate` (entry-only) |
| `…/src/datasets/{manifest,select,cli-fetch}.ts` | Manifests; selection; `datasets:fetch` (entry-only) |
| `…/src/morphology/{bands,suite,intervals-suite}.ts` | Evidence bands; recorded-vs-engine grading; PTB-XL intervals |
| `…/src/review/{types,clips,cli-clips,score,cli-score}.ts` | Blind review bundle and scoring |
| `…/src/bedside/{checklist,apply,cli-apply}.ts` | Saadat checklist data; results → markdown + provenance queue |
| `…/src/perf/{tick-bench,cli-ticks}.ts` | Node tick percentiles |
| `apps/demo/validation-{review,bedside,perf}.html`, `apps/demo/src/validation/*.ts` | Browser pages |
| `apps/demo/e2e/validation-perf.soak.ts`, `playwright.validation.config.ts` | Soak + frame-time gate |
| `.github/workflows/validation.yml` | Scheduled/labelled validation run |
| `docs/validation/{README.md,report.md,report.json,calibration-queue.md}` | Outputs |

---

### Task 1: Worktree, branch, dependencies, baseline

**Files:**
- Create: worktree `../scratch/wt-stage-8a` on branch `stage-8a-validation`
- Modify: `packages/validation/package.json` (dependency `@pme/controller`, devDependency `vite-node`, scripts)
- Modify: `pnpm-lock.yaml`
- Create: `docs/plans/stage-8a-validation.md` (this file, committed onto the branch)

**Interfaces:**
- Consumes: `main` (`6eeb6d1` or later).
- Produces: a worktree where `npx vite-node` runs harness scripts; `@pme/controller/scenario` importable from `@pme/validation`.

- [x] **Step 1: Create the worktree (never work in the shared `repo/` checkout; other stages use it)**

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin
git worktree add ../scratch/wt-stage-8a -b stage-8a-validation origin/main
cd ../scratch/wt-stage-8a
npx -y pnpm@9.15.9 install --frozen-lockfile
```

- [x] **Step 2: Check the base. Expected: both commands print something (the Stage 6b runner and the Stage 5 WFDB reader exist)**

```bash
grep -n "export class ScenarioRunner" packages/controller/src/scenario/runner.ts
grep -n "export function decode212" packages/validation/src/templates/wfdb.ts
git log --oneline -1
```

- [x] **Step 3: See what changed since the prototyped base in the files this plan reads. If this lists anything, skim the hunks; the plan's code only depends on the public shapes named in each task's Interfaces block**

```bash
git diff 6eeb6d1 HEAD --stat -- packages/engine-core/src/types.ts packages/engine-core/src/types-hemo.ts packages/engine-core/src/types-resp.ts packages/engine-core/src/engine.ts packages/controller/src/scenario packages/renderer/src/sweep-lane.ts packages/validation apps/demo/vite.config.ts NOTICES.md
```

- [x] **Step 4: Add the dependencies and scripts. Replace `packages/validation/package.json` with:**

```json
{
  "name": "@pme/validation",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run --passWithNoTests",
    "build": "vite build",
    "templates": "node --experimental-strip-types src/templates/extract-vf.ts datasets/cache ../engine-core/templates/vf-cudb.ts && node --experimental-strip-types src/templates/extract-af.ts datasets/cache ../engine-core/templates/af-mitdb.ts",
    "ptbxl-report": "node --experimental-strip-types src/templates/compare-ptbxl.ts datasets/cache ../../docs/gates/stage-5/ptbxl-normal-comparison.json 20",
    "datasets:fetch": "vite-node src/datasets/cli-fetch.ts",
    "validate": "vite-node src/cli/validate.ts",
    "review:build": "vite-node src/review/cli-clips.ts",
    "review:score": "vite-node src/review/cli-score.ts",
    "bedside:apply": "vite-node src/bedside/cli-apply.ts",
    "perf:ticks": "NODE_OPTIONS=--expose-gc vite-node src/perf/cli-ticks.ts"
  },
  "dependencies": {
    "@pme/controller": "workspace:*",
    "@pme/engine-core": "workspace:*"
  },
  "devDependencies": {
    "vite-node": "3.2.4"
  }
}
```

(`templates` and `ptbxl-report` are Stage 5's scripts, unchanged. The other scripts point at ENTRY-ONLY files created by later tasks (Tasks 6, 18, 20, 22, 23); until then they simply fail with "file not found".)

- [x] **Step 5: Install and check vite-node runs the engine (this is the reason for the dependency). Expected: prints `sinus 500`**

```bash
npx -y pnpm@9.15.9 install
cat > /tmp/pme-8a-probe.ts <<'TS'
import { createEngine } from '@pme/engine-core';
const e = createEngine({ seed: 1 });
e.advanceTo(2);
console.log('sinus', e.sampleRate('ecgII'));
TS
cp /tmp/pme-8a-probe.ts packages/validation/probe.ts
(cd packages/validation && npx vite-node probe.ts)
rm packages/validation/probe.ts
```

- [x] **Step 6: Baseline: everything green before touching anything**

```bash
npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 check-notices
```

- [x] **Step 7: Copy this plan into the worktree and commit**

```bash
cp /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo/docs/plans/stage-8a-validation.md docs/plans/
git add docs/plans/stage-8a-validation.md packages/validation/package.json pnpm-lock.yaml
git commit -m "chore(validation): stage 8a plan; vite-node runner and controller dependency"
git push -u origin stage-8a-validation
```

---

### Task 2: `.vital` reader (VitalDB PhysioNet copy)

**Files:**
- Create: `packages/validation/src/datasets/vital.ts`
- Create: `packages/validation/test/helpers/vital-writer.ts`
- Test: `packages/validation/test/datasets/vital.test.ts`

**Interfaces:**
- Produces: `parseVital(gz: Uint8Array, want?: ReadonlySet<string>): VitalFile`; `waveSlice(f, name, fromS, toS): { fs: number; x: Float64Array }` (gaps NaN); `numbers(f, name, fromS?, toS?): Array<[number, number]>` (t in s after the file's first record); `interface VitalTrack { tid; name ("<device>/<track>"); unit; kind: 'wave'|'number'|'string'; fmt; srate; gain; offset; recs: Array<{ t: number; v: Float32Array }> }`; `interface VitalFile { tracks: Map<string, VitalTrack>; t0: number }`.

- [x] **Step 1: Write the test-only writer `packages/validation/test/helpers/vital-writer.ts`**

```ts
// Test-only writer for the .vital layout the reader understands (so reader tests need no download).
import { gzipSync } from 'node:zlib';

const u8 = (v: number) => Buffer.from([v]);
const u16 = (v: number) => { const b = Buffer.alloc(2); b.writeUInt16LE(v); return b; };
const u32 = (v: number) => { const b = Buffer.alloc(4); b.writeUInt32LE(v); return b; };
const f32 = (v: number) => { const b = Buffer.alloc(4); b.writeFloatLE(v); return b; };
const f64 = (v: number) => { const b = Buffer.alloc(8); b.writeDoubleLE(v); return b; };
const str = (s: string) => Buffer.concat([u32(Buffer.byteLength(s)), Buffer.from(s, 'utf8')]);
const packet = (type: number, body: Buffer) => Buffer.concat([u8(type), u32(body.length), body]);

export interface WTrack { tid: number; name: string; unit: string; kind: 'wave' | 'number'; fmt: 1 | 5; srate: number; gain: number; offset: number; did: number }

export function writeVital(o: { devices: Array<{ did: number; name: string }>; tracks: WTrack[]; recs: Array<{ tid: number; t: number; values: number[] }> }): Uint8Array {
  const header = Buffer.concat([Buffer.from('VITA'), u32(3), u16(10), Buffer.alloc(10)]);
  const parts: Buffer[] = [header];
  for (const d of o.devices) parts.push(packet(9, Buffer.concat([u32(d.did), str('type'), str(d.name), str('port')])));
  for (const t of o.tracks) {
    parts.push(packet(0, Buffer.concat([u16(t.tid), u8(t.kind === 'wave' ? 1 : 2), u8(t.fmt), str(t.name), str(t.unit), f32(0), f32(100), u32(0), f32(t.srate), f64(t.gain), f64(t.offset), u8(0), u32(t.did)])));
  }
  for (const r of o.recs) {
    const tr = o.tracks.find((x) => x.tid === r.tid) as WTrack;
    const vals = tr.fmt === 1 ? Buffer.concat(r.values.map(f32)) : Buffer.concat(r.values.map((v) => { const b = Buffer.alloc(2); b.writeInt16LE(Math.round((v - tr.offset) / tr.gain)); return b; }));
    const body = tr.kind === 'wave' ? Buffer.concat([u16(10), f64(r.t), u16(r.tid), u32(r.values.length), vals]) : Buffer.concat([u16(10), f64(r.t), u16(r.tid), vals]);
    parts.push(packet(1, body));
  }
  return new Uint8Array(gzipSync(Buffer.concat(parts)));
}
```

- [x] **Step 2: Write the failing test `packages/validation/test/datasets/vital.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { numbers, parseVital, waveSlice } from '../../src/datasets/vital.ts';
import { writeVital, type WTrack } from '../helpers/vital-writer.ts';

const ECG: WTrack = { tid: 1, name: 'ECG_II', unit: 'mV', kind: 'wave', fmt: 5, srate: 100, gain: 0.01, offset: 0, did: 7 };
const HR: WTrack = { tid: 2, name: 'HR', unit: '/min', kind: 'number', fmt: 1, srate: 0, gain: 1, offset: 0, did: 8 };

describe('.vital reader', () => {
  const file = writeVital({
    devices: [{ did: 7, name: 'SNUADC' }, { did: 8, name: 'Solar8000' }],
    tracks: [ECG, HR],
    recs: [
      { tid: 1, t: 1000, values: [0.1, 0.2, 0.3, 0.4] },
      { tid: 1, t: 1000.04, values: [0.5, 0.6] },
      { tid: 2, t: 1001, values: [72] },
      { tid: 2, t: 1003, values: [75] },
    ],
  });

  it('names tracks "<device>/<track>" and scales integer samples by gain/offset', () => {
    const f = parseVital(file);
    expect([...f.tracks.keys()].sort()).toEqual(['SNUADC/ECG_II', 'Solar8000/HR']);
    const w = waveSlice(f, 'SNUADC/ECG_II', 0, 0.08);
    expect(w.fs).toBe(100);
    expect(Array.from(w.x, (v) => +v.toFixed(3))).toEqual([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, Number.NaN, Number.NaN]);
  });

  it('returns numeric tracks as [t after the first record, value] pairs', () => {
    const f = parseVital(file);
    expect(numbers(f, 'Solar8000/HR')).toEqual([[1, 72], [3, 75]]);
    expect(numbers(f, 'Solar8000/HR', 2)).toEqual([[3, 75]]);
  });

  it('skips unwanted tracks when a filter is given', () => {
    const f = parseVital(file, new Set(['Solar8000/HR']));
    expect(f.tracks.get('SNUADC/ECG_II')?.recs.length).toBe(0);
    expect(f.tracks.get('Solar8000/HR')?.recs.length).toBe(2);
  });
});
```

- [x] **Step 3: Run it. Expected: FAIL (`Failed to load url ../../src/datasets/vital.ts`)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/datasets/vital.test.ts`

- [x] **Step 4: Write `packages/validation/src/datasets/vital.ts`**

```ts
// Reader for VitalRecorder `.vital` files (the PhysioNet VitalDB 1.0.0 copy, CC BY 4.0), written clean-room from the
// published file-format description (VitalRecorder "Vital File Format" document; the reader code of
// vitalutils/vitaldb was not opened). Layout: gzip → "VITA", u32 format version, u16 header length, header; then
// packets { u8 type, u32 length, payload }. Types used: 9 DEVINFO, 0 TRKINFO, 1 REC. All little-endian.
// TRKINFO: u16 tid, u8 rec_type (1 wave, 2 number, 5 string), u8 rec_fmt (1 f32, 2 f64, 3 i8, 4 u8, 5 i16, 6 u16,
// 7 i32, 8 u32), str name, str unit, f32 min, f32 max, u32 colour, f32 srate, f64 gain, f64 offset, u8 montype,
// u32 device id (str = u32 length + UTF-8). REC: u16 info length, f64 unix time, u16 tid, then (wave) u32 n + n
// samples, (number) one sample. Integer formats are scaled: value = raw·gain + offset.
import { gunzipSync } from 'node:zlib';

export interface VitalTrack {
  tid: number;
  name: string; // "<device>/<track>", e.g. "SNUADC/ECG_II"
  unit: string;
  kind: 'wave' | 'number' | 'string';
  fmt: number;
  srate: number;
  gain: number;
  offset: number;
  /** wave: one entry per REC packet (start time s, values); number: one entry per value */
  recs: Array<{ t: number; v: Float32Array }>;
}
export interface VitalFile {
  tracks: Map<string, VitalTrack>;
  /** Unix time (s) of the earliest record. */
  t0: number;
}

const FMT_BYTES: Record<number, number> = { 1: 4, 2: 8, 3: 1, 4: 1, 5: 2, 6: 2, 7: 4, 8: 4 };

export function parseVital(gz: Uint8Array, want?: ReadonlySet<string>): VitalFile {
  const b = gunzipSync(gz);
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (b.toString('latin1', 0, 4) !== 'VITA') throw new Error('not a vital file');
  let p = 10 + dv.getUint16(8, true);
  const devs = new Map<number, string>();
  const byTid = new Map<number, VitalTrack>();
  const str = (o: number): [string, number] => {
    const n = dv.getUint32(o, true);
    return [b.toString('utf8', o + 4, o + 4 + n), o + 4 + n];
  };
  let t0 = Infinity;
  while (p + 5 <= b.length) {
    const type = dv.getUint8(p);
    const len = dv.getUint32(p + 1, true);
    const s = p + 5;
    const end = s + len;
    p = end;
    if (end > b.length) break;
    if (type === 9) {
      const did = dv.getUint32(s, true);
      const [, o1] = str(s + 4); // device type
      const [name] = str(o1);
      devs.set(did, name);
    } else if (type === 0) {
      const tid = dv.getUint16(s, true);
      const recType = dv.getUint8(s + 2);
      const fmt = dv.getUint8(s + 3);
      let [name, o] = str(s + 4);
      const [unit, o2] = str(o);
      o = o2 + 4 + 4 + 4; // mindisp f32, maxdisp f32, colour u32
      const srate = o + 4 <= end ? dv.getFloat32(o, true) : 0;
      const gain = o + 12 <= end ? dv.getFloat64(o + 4, true) : 1;
      const offset = o + 20 <= end ? dv.getFloat64(o + 12, true) : 0;
      const did = o + 25 <= end ? dv.getUint32(o + 21, true) : 0;
      const dev = devs.get(did);
      if (dev) name = `${dev}/${name}`;
      const kind = recType === 1 ? 'wave' : recType === 2 ? 'number' : 'string';
      byTid.set(tid, { tid, name, unit, kind, fmt, srate, gain, offset, recs: [] });
    } else if (type === 1) {
      const infoLen = dv.getUint16(s, true);
      const t = dv.getFloat64(s + 2, true);
      const tid = dv.getUint16(s + 10, true);
      const tr = byTid.get(tid);
      if (!tr || tr.kind === 'string') continue;
      if (t < t0) t0 = t;
      if (want && !want.has(tr.name)) continue;
      let o = s + 2 + infoLen;
      const n = tr.kind === 'wave' ? dv.getUint32(o, true) : 1;
      if (tr.kind === 'wave') o += 4;
      const v = new Float32Array(n);
      const w = FMT_BYTES[tr.fmt] ?? 4;
      for (let i = 0; i < n; i++, o += w) {
        let x: number;
        switch (tr.fmt) {
          case 1: x = dv.getFloat32(o, true); break;
          case 2: x = dv.getFloat64(o, true); break;
          case 3: x = dv.getInt8(o); break;
          case 4: x = dv.getUint8(o); break;
          case 5: x = dv.getInt16(o, true); break;
          case 6: x = dv.getUint16(o, true); break;
          case 7: x = dv.getInt32(o, true); break;
          default: x = dv.getUint32(o, true);
        }
        v[i] = tr.fmt <= 2 ? x : x * tr.gain + tr.offset;
      }
      tr.recs.push({ t, v });
    }
  }
  const tracks = new Map<string, VitalTrack>();
  for (const tr of byTid.values()) tracks.set(tr.name, tr);
  return { tracks, t0 };
}

/** A wave track as one evenly sampled array from `fromS` to `toS` (seconds after t0); gaps are NaN. */
export function waveSlice(f: VitalFile, name: string, fromS: number, toS: number): { fs: number; x: Float64Array } {
  const tr = f.tracks.get(name);
  if (!tr || tr.kind !== 'wave') throw new Error(`no wave track ${name}`);
  const fs = tr.srate;
  const x = new Float64Array(Math.round((toS - fromS) * fs)).fill(Number.NaN);
  for (const r of tr.recs) {
    const i0 = Math.round((r.t - f.t0 - fromS) * fs);
    for (let i = 0; i < r.v.length; i++) {
      const k = i0 + i;
      if (k >= 0 && k < x.length) x[k] = r.v[i] as number;
    }
  }
  return { fs, x };
}

/** A numeric track as (time s after t0, value) pairs inside [fromS, toS). */
export function numbers(f: VitalFile, name: string, fromS = 0, toS = Infinity): Array<[number, number]> {
  const tr = f.tracks.get(name);
  if (!tr || tr.kind !== 'number') return [];
  const out: Array<[number, number]> = [];
  for (const r of tr.recs) {
    const t = r.t - f.t0;
    if (t >= fromS && t < toS) out.push([t, r.v[0] as number]);
  }
  return out;
}
```

(`t0` is taken over EVERY track's records, before the `want` filter, so filtered and unfiltered reads share one time base.)

- [x] **Step 5: Run the test. Expected: PASS (3 tests)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/datasets/vital.test.ts`

- [x] **Step 6: Commit**

```bash
git add packages/validation/src/datasets/vital.ts packages/validation/test/helpers/vital-writer.ts packages/validation/test/datasets/vital.test.ts
git commit -m "feat(validation): clean-room .vital reader for the PhysioNet VitalDB copy"
git push
```

---

### Task 3: Dataset registry, cache, Zenodo fetcher, NOTICES rows

**Files:**
- Create: `packages/validation/src/datasets/cache.ts`, `packages/validation/src/datasets/sources.ts`, `packages/validation/src/datasets/fetch-zenodo.ts`
- Modify: `NOTICES.md` (append N-080, N-081, N-082)
- Test: `packages/validation/test/datasets/sources.test.ts`

**Interfaces:**
- Consumes: `fetchCached`, `fetchVerified`, `parseSums`, `sha256` from `src/templates/fetch.ts` (Stage 5).
- Produces: `cacheDir(): string`; `type SourceId = 'vitaldb' | 'mghdb' | 'pwdb' | 'cudb' | 'mitdb' | 'ptbxl'`; `SOURCES: Record<SourceId, DatasetSource>` with `{ id, title, version, url, doi, licence, licenceUrl, attribution, notice, redistribution }`; `fetchZenodo(cache: string, record: string, file: string, md5: string): Promise<Uint8Array>`; `md5(buf: Uint8Array): string`.

- [x] **Step 1: Write the failing test `packages/validation/test/datasets/sources.test.ts`**

```ts
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SOURCES } from '../../src/datasets/sources.ts';
import { fetchZenodo, md5 } from '../../src/datasets/fetch-zenodo.ts';
import { cacheDir } from '../../src/datasets/cache.ts';

afterEach(() => vi.unstubAllGlobals());

describe('dataset registry (brief §8, R6)', () => {
  it('every source names its licence, attribution and NOTICES row', () => {
    for (const s of Object.values(SOURCES)) {
      expect(s.licence).toMatch(/CC BY 4.0|ODC-By 1.0|PDDL 1.0/);
      expect(s.attribution.length).toBeGreaterThan(40);
      expect(s.notice).toMatch(/^N-0\d\d$/);
      expect(readFileSync(join(import.meta.dirname, '../../../../NOTICES.md'), 'utf8')).toContain(`| ${s.notice} |`);
    }
  });
  it('the cache honours PME_DATASET_CACHE', () => {
    vi.stubEnv('PME_DATASET_CACHE', '/tmp/x-cache');
    expect(cacheDir()).toBe('/tmp/x-cache');
    vi.unstubAllEnvs();
    expect(cacheDir()).toMatch(/packages\/validation\/datasets\/cache$/);
  });
});

describe('Zenodo fetcher', () => {
  it('downloads once, verifies MD5, then serves the cache', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pme-z-'));
    const body = new TextEncoder().encode('a,b\n1,2\n');
    const f = vi.fn(async (_url: string) => new Response(body));
    vi.stubGlobal('fetch', f);
    const a = await fetchZenodo(dir, '2633175', 'x.csv', md5(body));
    const b = await fetchZenodo(dir, '2633175', 'x.csv', md5(body));
    expect(new TextDecoder().decode(a)).toBe('a,b\n1,2\n');
    expect(b.length).toBe(a.length);
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0]?.[0]).toBe('https://zenodo.org/api/records/2633175/files/x.csv/content');
  });
  it('rejects a checksum mismatch', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pme-z-'));
    vi.stubGlobal('fetch', vi.fn(async () => new Response('tampered')));
    await expect(fetchZenodo(dir, '1', 'y.csv', '0'.repeat(32))).rejects.toThrow(/MD5 mismatch/);
  });
});
```

- [x] **Step 2: Run it. Expected: FAIL (modules missing)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/datasets/sources.test.ts`

- [x] **Step 3: Write `packages/validation/src/datasets/cache.ts`**

```ts
// The git-ignored dataset cache (brief §8: raw records are never committed). PME_DATASET_CACHE overrides it.
import { fileURLToPath } from 'node:url';

export function cacheDir(): string {
  return process.env.PME_DATASET_CACHE ?? fileURLToPath(new URL('../../datasets/cache', import.meta.url));
}
```

- [x] **Step 4: Write `packages/validation/src/datasets/sources.ts`**

```ts
// Every dataset the harness reads, with the licence and attribution the report and NOTICES carry (brief §8, R6).
// Checked on the project pages 2026-09-26. Only derived statistics and manifests (ids, times, hashes) are committed.
export type SourceId = 'vitaldb' | 'mghdb' | 'pwdb' | 'cudb' | 'mitdb' | 'ptbxl';

export interface DatasetSource {
  id: SourceId;
  title: string;
  version: string;
  url: string;
  doi: string;
  licence: 'CC BY 4.0' | 'ODC-By 1.0' | 'PDDL 1.0';
  licenceUrl: string;
  attribution: string;
  notice: string;
  redistribution: string;
}

export const SOURCES: Record<SourceId, DatasetSource> = {
  vitaldb: {
    id: 'vitaldb', title: 'VitalDB (PhysioNet copy)', version: '1.0.0', url: 'https://physionet.org/content/vitaldb/1.0.0/', doi: '10.13026/czw8-9p62',
    licence: 'CC BY 4.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'Lee HC, Park Y, Yoon SB, Yang SM, Park D, Jung CW. VitalDB, a high-fidelity multi-parameter vital signs database in surgical patients. Sci Data 9:279 (2022). Data from the PhysioNet copy, v1.0.0.',
    notice: 'N-080', redistribution: 'Cache only; committed: case ids, window times, SHA-256, derived statistics.',
  },
  mghdb: {
    id: 'mghdb', title: 'MGH/MF Waveform Database', version: '1.0.0', url: 'https://physionet.org/content/mghdb/1.0.0/', doi: '10.13026/C26K5Q',
    licence: 'ODC-By 1.0', licenceUrl: 'https://opendatacommons.org/licenses/by/1-0/',
    attribution: 'Welch J, Ford P, Teplick R, Rubsamen R. The Massachusetts General Hospital-Marquette Foundation Hemodynamic and Electrocardiographic Database -- Comprehensive collection of critical care waveforms. J Clin Monitoring 7(1):96-97 (1991). PhysioNet v1.0.0.',
    notice: 'N-081', redistribution: 'Cache only; committed: record ids, window times, SHA-256, derived statistics.',
  },
  pwdb: {
    id: 'pwdb', title: 'Pulse Wave Database (PWDB)', version: '0.1.0', url: 'https://zenodo.org/records/2633175', doi: '10.5281/zenodo.2633175',
    licence: 'PDDL 1.0', licenceUrl: 'https://opendatacommons.org/licenses/pddl/1-0/',
    attribution: 'Charlton PH, Mariscal Harana J, Vennin S, Li Y, Chowienczyk P, Alastruey J. Modeling arterial pulse waves in healthy aging: a database for in silico evaluation of hemodynamics and pulse wave indexes. Am J Physiol Heart Circ Physiol 317:H1062-H1085 (2019).',
    notice: 'N-082', redistribution: 'Cache only; committed: derived per-site/age statistics.',
  },
  cudb: {
    id: 'cudb', title: 'Creighton University Ventricular Tachyarrhythmia Database', version: '1.0.0', url: 'https://physionet.org/content/cudb/1.0.0/', doi: '10.13026/C2X59M',
    licence: 'ODC-By 1.0', licenceUrl: 'https://opendatacommons.org/licenses/by/1-0/',
    attribution: 'Nolle FM, Badura FK, Catlett JM, Bowser RW, Sketch MH. CREI-GARD, a new concept in computerized arrhythmia monitoring systems. Computers in Cardiology 13:515-518 (1986).',
    notice: 'N-050', redistribution: 'Stage 5 templates (N-050); Stage 8a reads the cache only.',
  },
  mitdb: {
    id: 'mitdb', title: 'MIT-BIH Arrhythmia Database', version: '1.0.0', url: 'https://physionet.org/content/mitdb/1.0.0/', doi: '10.13026/C2F305',
    licence: 'ODC-By 1.0', licenceUrl: 'https://opendatacommons.org/licenses/by/1-0/',
    attribution: 'Moody GB, Mark RG. The impact of the MIT-BIH Arrhythmia Database. IEEE Eng in Med and Biol 20(3):45-50 (2001).',
    notice: 'N-051', redistribution: 'Stage 5 templates (N-051); Stage 8a reads the cache only.',
  },
  ptbxl: {
    id: 'ptbxl', title: 'PTB-XL', version: '1.0.3', url: 'https://physionet.org/content/ptb-xl/1.0.3/', doi: '10.13026/kfzx-aw45',
    licence: 'CC BY 4.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'Wagner P, Strodthoff N, Bousseljot R, Samek W, Schaeffter T. PTB-XL, a large publicly available electrocardiography dataset (version 1.0.3). PhysioNet (2022).',
    notice: 'N-052', redistribution: 'Cache only; committed: derived interval distributions and correlations.',
  },
};
```

(DOIs as shown on the PhysioNet pages on 2026-09-26: VitalDB 10.13026/czw8-9p62 — the page also lists 10.13026/w758-nw21 for the latest version — and MGH/MF 10.13026/C26K5Q. The VitalDB paper is https://doi.org/10.1038/s41597-022-01411-5.)

- [x] **Step 5: Write `packages/validation/src/datasets/fetch-zenodo.ts`**

```ts
// Zenodo files (PWDB) into the cache, checked against the MD5 Zenodo publishes (it has no SHA-256).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const md5 = (buf: Uint8Array): string => createHash('md5').update(buf).digest('hex');

export async function fetchZenodo(cache: string, record: string, file: string, want: string): Promise<Uint8Array> {
  const path = join(cache, `zenodo-${record}`, file);
  let buf: Uint8Array;
  if (existsSync(path)) buf = new Uint8Array(readFileSync(path));
  else {
    const url = `https://zenodo.org/api/records/${record}/files/${file}/content`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
    buf = new Uint8Array(await res.arrayBuffer());
    const got = md5(buf);
    if (got !== want) throw new Error(`zenodo ${record}/${file}: MD5 mismatch (${got} ≠ ${want})`);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, buf);
  }
  return buf;
}
```

- [x] **Step 6: Append three rows to the table in `NOTICES.md` (after the last row, keep one row per line)**

```markdown
| N-080 | VitalDB 1.0.0, PhysioNet copy (validation reference; nothing bundled) | https://physionet.org/content/vitaldb/1.0.0/ | CC BY 4.0 | Downloaded to the git-ignored cache by `packages/validation/src/datasets/cli-fetch.ts` (SHA-256 against the project's SHA256SUMS.txt). Committed: case ids, analysis-window times and hashes (`packages/validation/datasets/manifests/`), and derived statistics in `docs/validation/report.*`. Attribution: "Lee HC, Park Y, Yoon SB, Yang SM, Park D, Jung CW. VitalDB, a high-fidelity multi-parameter vital signs database in surgical patients. Sci Data 9:279 (2022)." | 2026-09-26 |
| N-081 | MGH/MF Waveform Database 1.0.0 (validation reference; nothing bundled) | https://physionet.org/content/mghdb/1.0.0/ | ODC-By 1.0 | As N-080 (cache, manifests, derived statistics). Attribution: "Welch J, Ford P, Teplick R, Rubsamen R. The Massachusetts General Hospital-Marquette Foundation Hemodynamic and Electrocardiographic Database. J Clin Monitoring 7(1):96-97 (1991)." | 2026-09-26 |
| N-082 | Pulse Wave Database (PWDB) 0.1.0 CSV indices (validation reference; nothing bundled) | https://zenodo.org/records/2633175 | PDDL 1.0 | `pwdb_pw_indices.csv`, `pwdb_onset_times.csv`, `pwdb_haemod_params.csv` downloaded to the cache (MD5 from Zenodo); derived per-site/age statistics in the report. Credit: "Charlton PH et al. Am J Physiol Heart Circ Physiol 317:H1062-H1085 (2019)." PulseAnalyse (GPL-3) is not used | 2026-09-26 |
```

- [x] **Step 7: Run the test and check-notices. Expected: PASS (4 tests); `check-notices: OK`**

```bash
npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/datasets/sources.test.ts
npx -y pnpm@9.15.9 check-notices
```

- [x] **Step 8: Commit**

```bash
git add packages/validation/src/datasets/cache.ts packages/validation/src/datasets/sources.ts packages/validation/src/datasets/fetch-zenodo.ts packages/validation/test/datasets/sources.test.ts NOTICES.md
git commit -m "feat(validation): dataset registry with licences, cache override, Zenodo MD5 fetcher; NOTICES N-080..N-082"
git push
```

---

### Task 4: Signals bundle and VitalDB case selection / analysis windows

**Files:**
- Create: `packages/validation/src/datasets/signals.ts`, `packages/validation/src/datasets/csv.ts`, `packages/validation/src/datasets/vitaldb.ts`
- Create: `packages/validation/src/metrics/capno.ts` (moved here from Task 8 because `mghdb.ts` in Task 5 needs it; Task 8 adds its tests)
- Test: `packages/validation/test/datasets/vitaldb.test.ts`

**Interfaces:**
- Consumes: Task 2 (`parseVital`, `waveSlice`, `numbers`, `VitalFile`, `VitalTrack`); Stage 5 `fetchCached`, `fetchVerified`, `parseSums` (`src/templates/fetch.ts`), `csvCells` (`src/templates/compare-ptbxl.ts`).
- Produces: `interface Wave { fs; x: Float64Array }`; `interface Signals { ecg?, abp?, site?, pleth?, co2?, co2Calibrated?, inspirations?: number[], numerics: Record<string, Array<[number, number]>> }`; `interface AnalysisWindow { source: 'vitaldb'|'mghdb'; record; fromS; toS; site; hr; sbp; dbp; etco2: number|null; vent: {rr; vtMl; peep}|null; ageY; sex; tags: string[] }`; `fillGaps(x): number`; `readCsv(text): Array<Record<string,string>>`; `VITALDB`, `WAVES`, `NUMS`, `WANT`; `interface Candidate`; `selectCandidates(csv, n=64): Candidate[]`; `vitaldbSums(cache)`; `loadCase(cache, caseid, sums): Promise<VitalFile>`; `findWindows(f, c, max=2, lenS=300): AnalysisWindow[]`; `inspirationsFromAwp(p, fs): number[]`; `vitaldbSignals(f, w): Signals`; `capnoAngles(x, rate=62.5): CapnoBreath[]` with `CapnoBreath { alpha; riseIII; plateau; slopeIII }`.

Measured while planning: `selectCandidates` on the real `clinical_data.csv` (6,388 cases) gives 64 candidates — 20 femoral, 20 with a non-sinus pre-op ECG (AF, RBBB, 1st-degree block, PVCs …), 26 emergencies — first ids 1885, 4556, 3101, 1341, 0146. On case 0001 `findWindows` returns 2568–2868 s (stable, HR 105, 181/82, EtCO2 32, RR 10, VT 480) and 4248–4548 s (hypotension, HR 58, 96/43); 50 inspirations found from `Primus/AWP` in 300 s at RR 10; the case has no NIBP in those windows. Loading + windowing 0001 takes 5.7 s.

- [x] **Step 1: Write the failing test `packages/validation/test/datasets/vitaldb.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { fillGaps } from '../../src/datasets/signals.ts';
import { findWindows, inspirationsFromAwp, selectCandidates, type Candidate } from '../../src/datasets/vitaldb.ts';
import type { VitalFile, VitalTrack } from '../../src/datasets/vital.ts';

const HEAD = 'caseid,age,sex,ane_type,aline1,opstart,opend,preop_ecg,emop,department';
const row = (id: number, age: number, sex: string, line: string, ecg = 'Normal Sinus Rhythm', ane = 'General', dur = 7200) => `${id},${age},${sex},${ane},${line},100,${100 + dur},${ecg},0,General surgery`;

describe('VitalDB candidate selection (decision 2)', () => {
  const csv = [HEAD,
    row(1, 70, 'M', 'Left radial'), row(2, 71, 'M', 'Right radial'), row(3, 30, 'F', 'Right radial'), row(4, 50, 'F', 'Right femoral'),
    row(5, 66, 'M', 'Left radial', 'Atrial fibrillation'), row(6, 45, 'M', ''), row(7, 16, 'F', 'Right radial'), row(8, 60, 'M', 'Right radial', 'Normal Sinus Rhythm', 'Spinal'),
    row(9, 55, 'F', 'Right radial', 'Normal Sinus Rhythm', 'General', 1800)].join('\n');
  it('keeps adult GA cases with a radial/femoral line and ≥ 60 min of surgery', () => {
    expect(selectCandidates(csv, 99).map((c) => c.caseid).sort()).toEqual(['0001', '0002', '0003', '0004', '0005']);
  });
  it('round-robins over strata before taking a second case from any stratum', () => {
    const first4 = selectCandidates(csv, 4).map((c) => c.caseid);
    expect(first4).not.toContain('0002'); // 0002 shares 0001's stratum (radial, 65+, M, sinus)
    expect(first4).toHaveLength(4);
  });
});

function track(name: string, kind: 'wave' | 'number', srate: number, recs: Array<{ t: number; v: number[] }>): VitalTrack {
  return { tid: 0, name, unit: '', kind, fmt: 1, srate, gain: 1, offset: 0, recs: recs.map((r) => ({ t: r.t, v: Float32Array.from(r.v) })) };
}
function synthCase(): VitalFile {
  const T = 2000;
  const wave = (fs: number, f: (t: number) => number) => [{ t: 0, v: Array.from({ length: T * fs }, (_, i) => f(i / fs)) }];
  const num = (f: (t: number) => number) => Array.from({ length: T / 2 }, (_, i) => ({ t: 2 * i, v: [f(2 * i)] }));
  const map = (t: number) => (t >= 1300 && t < 1450 ? 60 : 85);
  const tracks = new Map<string, VitalTrack>([
    ['SNUADC/ECG_II', track('SNUADC/ECG_II', 'wave', 100, wave(100, () => 0))],
    ['SNUADC/ART', track('SNUADC/ART', 'wave', 100, wave(100, (t) => map(t) + 20 * Math.sin(2 * Math.PI * t)))],
    ['SNUADC/PLETH', track('SNUADC/PLETH', 'wave', 100, wave(100, () => 1))],
    ['Primus/CO2', track('Primus/CO2', 'wave', 62.5, wave(62.5, () => 30))],
    ['Solar8000/HR', track('Solar8000/HR', 'number', 0, num(() => 80))],
    ['Solar8000/ART_SBP', track('Solar8000/ART_SBP', 'number', 0, num((t) => map(t) + 25))],
    ['Solar8000/ART_DBP', track('Solar8000/ART_DBP', 'number', 0, num((t) => map(t) - 15))],
    ['Solar8000/ART_MBP', track('Solar8000/ART_MBP', 'number', 0, num(map))],
    ['Primus/ETCO2', track('Primus/ETCO2', 'number', 0, num(() => 34))],
    ['Primus/SET_RR_IPPV', track('Primus/SET_RR_IPPV', 'number', 0, num(() => 12))],
    ['Primus/SET_TV_L', track('Primus/SET_TV_L', 'number', 0, num(() => 0.5))],
    ['Primus/SET_INTER_PEEP', track('Primus/SET_INTER_PEEP', 'number', 0, num(() => 5))],
  ]);
  return { tracks, t0: 0 };
}
const C: Candidate = { caseid: '0042', ageY: 60, sex: 'F', site: 'radial', preopEcg: 'Normal Sinus Rhythm', emergency: false, department: 'x', opstartS: 0, opendS: 2000 };

describe('VitalDB analysis windows', () => {
  it('prefers one hypotensive window, then the earliest stable one, without overlap', () => {
    const w = findWindows(synthCase(), C);
    expect(w.map((x) => [x.fromS, x.tags[0]])).toEqual([[600, 'stable'], [1080, 'hypotension']]); // 1080–1380 holds 80 s of MAP 60
    expect(w[0]).toMatchObject({ hr: 80, sbp: 110, dbp: 70, etco2: 34, vent: { rr: 12, vtMl: 500, peep: 5 }, site: 'radial' });
  });
});

describe('helpers', () => {
  it('fillGaps interpolates NaN runs and reports the fraction', () => {
    const x = Float64Array.from([1, Number.NaN, Number.NaN, 4, Number.NaN]);
    expect(fillGaps(x)).toBeCloseTo(0.6);
    expect(Array.from(x)).toEqual([1, 2, 3, 4, 4]);
  });
  it('inspirationsFromAwp finds each positive-pressure breath once', () => {
    const fs = 62.5;
    const p = Float64Array.from({ length: 60 * fs }, (_, i) => ((i / fs) % 5 < 1.5 ? 20 : 5));
    expect(inspirationsFromAwp(p, fs).map((t) => Math.round(t))).toEqual([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
  });
});
```

- [x] **Step 2: Run it. Expected: FAIL (modules missing)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/datasets/vitaldb.test.ts`

- [x] **Step 3: Write `packages/validation/src/datasets/signals.ts`**

```ts
// The one signal bundle every metric takes, whether the samples were recorded or generated (decision 3).
export interface Wave {
  fs: number;
  x: Float64Array;
}

export interface Signals {
  /** ECG lead II (mV). */
  ecg?: Wave;
  /** Arterial pressure (mmHg); `site` says where. */
  abp?: Wave;
  site?: 'radial' | 'femoral' | 'unknown';
  pleth?: Wave;
  /** Capnogram in mmHg (MGH/MF: normalised, decision 11). */
  co2?: Wave;
  co2Calibrated?: boolean;
  /** Inspiration onsets (s from the start of the window): from airway pressure (recorded) or breath events (engine). */
  inspirations?: number[];
  /** Device numerics over the window: [t s from window start, value]. Keys: hr, nibpMean, abpMean, etco2, paco2. */
  numerics: Record<string, Array<[number, number]>>;
}

/** A recorded analysis window: where it comes from and what the matched engine run must reproduce. */
export interface AnalysisWindow {
  source: 'vitaldb' | 'mghdb';
  record: string;
  fromS: number;
  toS: number;
  site: 'radial' | 'femoral' | 'unknown';
  hr: number;
  sbp: number;
  dbp: number;
  etco2: number | null;
  vent: { rr: number; vtMl: number; peep: number } | null;
  ageY: number | null;
  sex: 'M' | 'F' | null;
  tags: string[];
}

/** Replace NaN runs by linear interpolation (edges hold the nearest value). Returns the fraction that was NaN. */
export function fillGaps(x: Float64Array): number {
  let bad = 0;
  let last = -1;
  for (let i = 0; i <= x.length; i++) {
    const ok = i < x.length && Number.isFinite(x[i] as number);
    if (i < x.length && !ok) {
      bad++;
      continue;
    }
    const gap = i - last - 1;
    if (gap > 0) {
      const a = last >= 0 ? (x[last] as number) : i < x.length ? (x[i] as number) : 0;
      const b = i < x.length ? (x[i] as number) : a;
      for (let k = 1; k <= gap; k++) x[last + k] = a + ((b - a) * k) / (gap + 1);
    }
    last = i;
  }
  return x.length ? bad / x.length : 1;
}
```

- [x] **Step 4: Write `packages/validation/src/datasets/csv.ts`**

```ts
// Minimal CSV reading for the dataset metadata files (quoted cells, header row → objects).
import { csvCells } from '../templates/compare-ptbxl.ts';

export function readCsv(text: string): Array<Record<string, string>> {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  const head = csvCells(lines[0] ?? '').map((h) => h.trim());
  return lines.slice(1).map((l) => {
    const c = csvCells(l);
    return Object.fromEntries(head.map((h, i) => [h, (c[i] ?? '').trim()]));
  });
}
```

- [x] **Step 5: Write `packages/validation/src/metrics/capno.ts` (the Stage 3 convention, decision 4)**

```ts
// Capnogram angles, the ONE measurement convention for recorded and generated capnograms (R39 item 6, brief §4.4).
// Moved verbatim from packages/engine-core/test/helpers/resp.ts (Stage 3): phase II slope between the 25 % and 75 %
// crossings of the plateau-end value P, phase III slope by regression from the 90 % crossing + 0.2 s to the plateau
// end, α = 180° − atan(s_II/25) + atan(s_III/25) on the 25 mmHg/s axis scale. Input in mmHg.
export interface CapnoBreath { alpha: number; riseIII: number; plateau: number; slopeIII: number }

export function capnoAngles(x: ArrayLike<number>, rate = 62.5): CapnoBreath[] {
  const out: CapnoBreath[] = [];
  let i = 0;
  let hi = -Infinity;
  for (let k = 0; k < x.length; k++) if ((x[k] as number) > hi) hi = x[k] as number;
  const at = (k: number) => x[k] as number;
  const cross = (from: number, lvl: number) => {
    for (let k = from; k < x.length - 1; k++) if (at(k) < lvl && at(k + 1) >= lvl) return k + (lvl - at(k)) / (at(k + 1) - at(k));
    return -1;
  };
  while (i < x.length - 1) {
    const up = cross(i, 0.5 * hi);
    if (up < 0) break;
    let dn = Math.ceil(up);
    while (dn < x.length - 1 && at(dn) >= 0.5 * hi) dn++;
    if (dn >= x.length - 2) break;
    let end = dn;
    for (let k = Math.max(Math.ceil(up), dn - Math.round(0.5 * rate)); k < dn; k++) if (at(k) >= at(end)) end = k;
    let s = Math.floor(up);
    while (s > 0 && at(s - 1) <= at(s)) s--; // `<=`: also walks over sample-and-hold steps (see header)
    const P = at(end);
    const t25 = cross(s, 0.25 * P);
    const t75 = cross(s, 0.75 * P);
    const t90 = cross(s, 0.9 * P);
    const a = Math.ceil(t90 + 0.2 * rate);
    if (t25 > 0 && t75 > t25 && end - a > 10) {
      const sII = (0.5 * P) / ((t75 - t25) / rate);
      let sx = 0, sy = 0, sxx = 0, sxy = 0;
      const n = end - a + 1;
      for (let k = a; k <= end; k++) {
        const tt = k / rate;
        sx += tt; sy += at(k); sxx += tt * tt; sxy += tt * at(k);
      }
      const sIII = (n * sxy - sx * sy) / (n * sxx - sx * sx);
      const deg = (r: number) => (r * 180) / Math.PI;
      out.push({ alpha: 180 - deg(Math.atan(sII / 25)) + deg(Math.atan(sIII / 25)), riseIII: sIII * ((end - a) / rate), plateau: P, slopeIII: sIII });
    }
    i = dn + 1;
  }
  return out;
}
```

- [x] **Step 6: Write `packages/validation/src/datasets/vitaldb.ts`**

```ts
// VitalDB (PhysioNet copy, CC BY 4.0): candidate selection from clinical metadata (decision 2), case loading with
// SHA-256 verification, and the analysis-window finder that turns a case into matched-engine targets.
import { fetchCached, fetchVerified, parseSums } from '../templates/fetch.ts';
import { readCsv } from './csv.ts';
import { fillGaps, type AnalysisWindow, type Signals } from './signals.ts';
import { numbers, parseVital, waveSlice, type VitalFile } from './vital.ts';

export const VITALDB = 'vitaldb/1.0.0';
export const WAVES = { ecg: 'SNUADC/ECG_II', abp: 'SNUADC/ART', pleth: 'SNUADC/PLETH', co2: 'Primus/CO2', awp: 'Primus/AWP' } as const;
export const NUMS = {
  hr: 'Solar8000/HR', sbp: 'Solar8000/ART_SBP', dbp: 'Solar8000/ART_DBP', abpMean: 'Solar8000/ART_MBP', nibpMean: 'Solar8000/NIBP_MBP',
  etco2: 'Primus/ETCO2', rr: 'Primus/SET_RR_IPPV', vt: 'Primus/SET_TV_L', peep: 'Primus/SET_INTER_PEEP',
} as const;
export const WANT = new Set<string>([...Object.values(WAVES), ...Object.values(NUMS)]);

export interface Candidate {
  caseid: string; // zero-padded, e.g. "0001"
  ageY: number;
  sex: 'M' | 'F';
  site: 'radial' | 'femoral';
  preopEcg: string;
  emergency: boolean;
  department: string;
  opstartS: number;
  opendS: number;
}

const band = (a: number) => (a < 40 ? 'A18-39' : a < 65 ? 'A40-64' : 'A65+');

/**
 * Deterministic stratified pick (decision 2): general anaesthesia, adult, arterial line at a radial or femoral site,
 * surgery ≥ 60 min. Strata = site × age band × sex × (pre-op ECG not sinus); round-robin over strata
 * (sorted keys), lowest case id first, until `n`.
 */
export function selectCandidates(clinicalCsv: string, n = 64): Candidate[] {
  const eligible: Candidate[] = [];
  for (const r of readCsv(clinicalCsv)) {
    const line = (r.aline1 ?? '').toLowerCase();
    const site = line.includes('radial') ? 'radial' : line.includes('femoral') ? 'femoral' : null;
    const age = Number(r.age);
    const opstart = Number(r.opstart);
    const opend = Number(r.opend);
    if (!site || r.ane_type !== 'General' || !(age >= 18) || !(opend - opstart >= 3600)) continue;
    if (r.sex !== 'M' && r.sex !== 'F') continue;
    eligible.push({
      caseid: String(r.caseid).padStart(4, '0'), ageY: age, sex: r.sex, site, preopEcg: r.preop_ecg ?? '', emergency: r.emop === '1',
      department: r.department ?? '', opstartS: opstart, opendS: opend,
    });
  }
  const strata = new Map<string, Candidate[]>();
  for (const c of eligible.sort((a, b) => a.caseid.localeCompare(b.caseid))) {
    const k = [c.site, band(c.ageY), c.sex, c.preopEcg === 'Normal Sinus Rhythm' ? 'nsr' : 'ecg'].join('|');
    if (!strata.has(k)) strata.set(k, []);
    strata.get(k)?.push(c);
  }
  const keys = [...strata.keys()].sort();
  const out: Candidate[] = [];
  for (let round = 0; out.length < n; round++) {
    let took = false;
    for (const k of keys) {
      const c = strata.get(k)?.[round];
      if (c && out.length < n) {
        out.push(c);
        took = true;
      }
    }
    if (!took) break;
  }
  return out;
}

export async function vitaldbSums(cache: string): Promise<Map<string, string>> {
  return parseSums(new TextDecoder().decode(await fetchCached(cache, VITALDB, 'SHA256SUMS.txt')));
}

export async function loadCase(cache: string, caseid: string, sums: Map<string, string>): Promise<VitalFile> {
  return parseVital(await fetchVerified(cache, VITALDB, `vital_files/${caseid}.vital`, sums), WANT);
}

const median = (xs: number[]): number => {
  const v = xs.filter(Number.isFinite).sort((a, b) => a - b);
  return v.length ? (v[Math.floor((v.length - 1) / 2)] as number + (v[Math.ceil((v.length - 1) / 2)] as number)) / 2 : Number.NaN;
};
const vals = (p: Array<[number, number]>) => p.map(([, v]) => v);

/** Minimum seconds of ART_MBP < 65 that tag a window `hypotension` [ENG; the usual IOH definition is MAP < 65]. */
export const HYPO_MAP = 65;
export const HYPO_MIN_S = 60;

/**
 * Up to `max` 300 s windows inside [opstart + 600 s, opend − 300 s] where all four waves are ≥ 99 % present, the
 * arterial trace is plausible (MAP 40–150, no flush > 250), the ventilator is in IPPV (SET_RR_IPPV present) and the
 * device HR is stable (IQR ≤ 10). Stepped by 60 s; windows do not overlap; a hypotensive window is preferred once.
 */
export function findWindows(f: VitalFile, c: Candidate, max = 2, lenS = 300): AnalysisWindow[] {
  const out: AnalysisWindow[] = [];
  const endS = c.opendS - lenS;
  const hypoFirst: AnalysisWindow[] = [];
  const plain: AnalysisWindow[] = [];
  for (let a = c.opstartS + 600; a <= endS; a += 60) {
    const b = a + lenS;
    const w: Record<string, Float64Array> = {};
    let ok = true;
    for (const [k, name] of Object.entries({ ecg: WAVES.ecg, abp: WAVES.abp, pleth: WAVES.pleth, co2: WAVES.co2 })) {
      if (!f.tracks.get(name)?.recs.length) return [];
      const x = waveSlice(f, name, a, b).x;
      const nan = x.reduce((s, v) => s + (Number.isFinite(v) ? 0 : 1), 0) / x.length;
      if (nan > 0.01) { ok = false; break; }
      w[k] = x;
    }
    if (!ok) continue;
    const abp = w.abp as Float64Array;
    let mx = -Infinity;
    let sum = 0;
    let n = 0;
    for (const v of abp) if (Number.isFinite(v)) { mx = Math.max(mx, v); sum += v; n++; }
    const map = sum / n;
    if (!(map >= 40 && map <= 150) || mx > 250) continue;
    const rr = median(vals(numbers(f, NUMS.rr, a, b)));
    if (!Number.isFinite(rr)) continue;
    const hr = vals(numbers(f, NUMS.hr, a, b)).sort((x, y) => x - y);
    if (hr.length < 10 || (hr[Math.floor(hr.length * 0.75)] as number) - (hr[Math.floor(hr.length * 0.25)] as number) > 10) continue;
    const mbp = numbers(f, NUMS.abpMean, a, b);
    let run = 0;
    let longest = 0;
    for (let i = 1; i < mbp.length; i++) {
      const [t0, v0] = mbp[i - 1] as [number, number];
      const [t1] = mbp[i] as [number, number];
      run = v0 < HYPO_MAP ? run + (t1 - t0) : 0;
      longest = Math.max(longest, run);
    }
    const hypo = longest >= HYPO_MIN_S;
    const etco2 = median(vals(numbers(f, NUMS.etco2, a, b)));
    const win: AnalysisWindow = {
      source: 'vitaldb', record: c.caseid, fromS: a, toS: b, site: c.site,
      hr: median(hr), sbp: median(vals(numbers(f, NUMS.sbp, a, b))), dbp: median(vals(numbers(f, NUMS.dbp, a, b))),
      etco2: Number.isFinite(etco2) ? etco2 : null,
      vent: { rr, vtMl: 1000 * median(vals(numbers(f, NUMS.vt, a, b))), peep: median(vals(numbers(f, NUMS.peep, a, b))) || 0 },
      ageY: c.ageY, sex: c.sex,
      tags: [hypo ? 'hypotension' : 'stable', ...(c.preopEcg !== 'Normal Sinus Rhythm' ? [`preop:${c.preopEcg}`] : []), c.site],
    };
    if (!Number.isFinite(win.sbp) || !Number.isFinite(win.vent?.vtMl ?? Number.NaN)) continue;
    (hypo ? hypoFirst : plain).push(win);
  }
  const pick = [...hypoFirst.slice(0, 1), ...plain];
  for (const w of pick) {
    if (out.length >= max) break;
    if (out.every((o) => w.fromS >= o.toS || w.toS <= o.fromS)) out.push(w);
  }
  return out.sort((x, y) => x.fromS - y.fromS);
}

/** Inspiration onsets from airway pressure: upward crossings of (min + 30 % of the range) per 20 s block [ENG]. */
export function inspirationsFromAwp(p: Float64Array, fs: number): number[] {
  const out: number[] = [];
  const blk = Math.round(20 * fs);
  for (let b0 = 0; b0 < p.length; b0 += blk) {
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = b0; i < Math.min(p.length, b0 + blk); i++) {
      lo = Math.min(lo, p[i] as number);
      hi = Math.max(hi, p[i] as number);
    }
    const thr = lo + 0.3 * (hi - lo);
    if (hi - lo < 3) continue; // < 3 hPa swing: not ventilated
    for (let i = Math.max(1, b0); i < Math.min(p.length, b0 + blk); i++) {
      if ((p[i - 1] as number) < thr && (p[i] as number) >= thr && (out.length === 0 || i / fs - (out.at(-1) as number) > 1)) out.push(i / fs);
    }
  }
  return out;
}

/** The recorded Signals of one window (times re-based to the window start). */
export function vitaldbSignals(f: VitalFile, w: AnalysisWindow): Signals {
  const wave = (name: string) => {
    const s = waveSlice(f, name, w.fromS, w.toS);
    fillGaps(s.x);
    return s;
  };
  const rebase = (p: Array<[number, number]>): Array<[number, number]> => p.map(([t, v]) => [t - w.fromS, v]);
  const awp = f.tracks.get(WAVES.awp)?.recs.length ? wave(WAVES.awp) : null;
  return {
    ecg: wave(WAVES.ecg), abp: wave(WAVES.abp), site: w.site, pleth: wave(WAVES.pleth), co2: wave(WAVES.co2), co2Calibrated: true,
    ...(awp ? { inspirations: inspirationsFromAwp(awp.x, awp.fs) } : {}),
    numerics: {
      hr: rebase(numbers(f, NUMS.hr, w.fromS, w.toS)),
      abpMean: rebase(numbers(f, NUMS.abpMean, w.fromS, w.toS)),
      nibpMean: rebase(numbers(f, NUMS.nibpMean, w.fromS, w.toS)),
      etco2: rebase(numbers(f, NUMS.etco2, w.fromS, w.toS)),
    },
  };
}
```

- [x] **Step 7: Run the test and typecheck. Expected: PASS (5 tests); no type errors**

```bash
npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/datasets/vitaldb.test.ts
npx -y pnpm@9.15.9 --filter @pme/validation typecheck
```

- [x] **Step 8: Commit**

```bash
git add packages/validation/src/datasets/signals.ts packages/validation/src/datasets/csv.ts packages/validation/src/datasets/vitaldb.ts packages/validation/src/metrics/capno.ts packages/validation/test/datasets/vitaldb.test.ts
git commit -m "feat(validation): signal bundle, VitalDB stratified case selection and analysis windows"
git push
```

---

### Task 5: MGH/MF records and PWDB per-site statistics

**Files:**
- Create: `packages/validation/src/datasets/mghdb.ts`, `packages/validation/src/datasets/pwdb.ts`
- Test: `packages/validation/test/datasets/mghdb-pwdb.test.ts`

**Interfaces:**
- Consumes: Task 4 (`fillGaps`, `Signals`, `readCsv`, `capnoAngles`); Stage 5 `parseHeader`, `decode212`, `WfdbHeader`.
- Produces: `MGHDB`, `MGH_CO2_REF_MMHG = 38`; `interface MghMeta { record; ageY; sex; diagnosis; rhythm; ventilation; channels }`; `mghMeta(heaText): MghMeta`; `mghSignals(h, meta, dat, fromS, toS): Signals`; `PWDB_RECORD = '2633175'`, `PWDB_FILES`; `type PwdbSite`; `interface PwdbStat { site; ageY; n; pttMs: [p10,p50,p90]; sysAfterFootMs: [p10,p50,p90] }`; `pwdbStats(indicesCsv, sites?): PwdbStat[]`.

Measured while planning: mgh021 metadata as in the test; its 600–900 s window decodes to ECG/ABP/CO2 at 360 Hz. PWDB (4,374 subjects, 729 per age): radial PTT p50 84 / 82 / 76 / 72 / 66 / 62 ms at 25–75 y, femoral 120 → 68 ms; about 2 % of subjects carry negative PTTs (failed onsets), dropped. The PWDB MD5s in `PWDB_FILES` were verified on download.

- [x] **Step 1: Write the failing test `packages/validation/test/datasets/mghdb-pwdb.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { mghMeta } from '../../src/datasets/mghdb.ts';
import { pwdbStats } from '../../src/datasets/pwdb.ts';

const HEA = `mgh021 8 360/0.476 1166400 16:47:00 31/05/1991
mgh021.dat 212 288(-287)/mV 12 0 -340 53095 0 ECG lead I
mgh021.dat 212 240(-80)/mV 12 0 -25 17726 0 ECG lead II
mgh021.dat 212 224(-14)/mV 12 0 -61 47853 0 ECG lead V
mgh021.dat 212 16.7(-1431)/mmHg 12 0 -25 23760 0 ART
mgh021.dat 212 34.34(-1643)/mmHg 12 0 -1063 46565 0 PAP
mgh021.dat 212 19.8(-1181)/mmHg 12 0 -1052 43543 0 OFF
mgh021.dat 212 1000 12 0 -65 4256 0 Resp. Imp.
mgh021.dat 212 1000 12 0 908 3418 0 CO2
#<age>: 75 <sex>: M <diagnoses>: Upper GI bleeding
# UNDERLYING RHYTHM:
#   Normal sinus rhythm @ 92 bpm
# MODE OF VENTILATION:
#   Controlled
`;

describe('MGH/MF header metadata', () => {
  it('reads age, sex, diagnosis, rhythm, ventilation and maps channels (OFF is skipped)', () => {
    const m = mghMeta(HEA);
    expect(m).toMatchObject({ record: 'mgh021', ageY: 75, sex: 'M', diagnosis: 'Upper GI bleeding', rhythm: 'Normal sinus rhythm @ 92 bpm', ventilation: 'Controlled' });
    expect(m.channels).toEqual({ ecgI: 0, ecgII: 1, ecgV: 2, abp: 3, pap: 4, resp: 6, co2: 7 });
  });
});

describe('PWDB per-site/age statistics', () => {
  it('gives p10/p50/p90 in ms and drops failed (non-positive) onsets', () => {
    const csv = ['Subject Number, Age, Radial_PTT, Radial_SBP_T', '1,25,0.080,0.110', '2,25,0.090,0.120', '3,25,-0.6,0.100', '4,35,0.070,0.100'].join('\n');
    const s = pwdbStats(csv, ['Radial']);
    expect(s).toEqual([
      { site: 'Radial', ageY: 25, n: 3, pttMs: [80, 90, 90], sysAfterFootMs: [100, 110, 120] },
      { site: 'Radial', ageY: 35, n: 1, pttMs: [70, 70, 70], sysAfterFootMs: [100, 100, 100] },
    ]);
  });
});
```

- [x] **Step 2: Run it. Expected: FAIL (modules missing)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/datasets/mghdb-pwdb.test.ts`

- [x] **Step 3: Write `packages/validation/src/datasets/mghdb.ts`**

```ts
// MGH/MF Waveform Database (ODC-By 1.0): header metadata (age, sex, rhythm, ventilation mode from the # comments),
// the channel map (signal descriptions vary: "ART", "OFF", "Inp."), and recorded windows as Signals.
// CO2 is uncalibrated in the headers (gain 1000, no unit): it is normalised so the median plateau reads 38 mmHg and
// marked co2Calibrated = false (decision 11).
import { capnoAngles } from '../metrics/capno.ts';
import { decode212, parseHeader, type WfdbHeader } from '../templates/wfdb.ts';
import { fillGaps, type Signals } from './signals.ts';

export const MGHDB = 'mghdb/1.0.0';
export const MGH_CO2_REF_MMHG = 38; // [ENG] decision 11

export interface MghMeta {
  record: string;
  ageY: number | null;
  sex: 'M' | 'F' | null;
  diagnosis: string;
  rhythm: string;
  ventilation: string;
  channels: Partial<Record<'ecgI' | 'ecgII' | 'ecgV' | 'abp' | 'pap' | 'cvp' | 'resp' | 'co2', number>>;
}

/** Metadata and channel indices from a .hea text. */
export function mghMeta(heaText: string): MghMeta {
  const h = parseHeader(heaText);
  const lines = heaText.split(/\r?\n/);
  const after = (label: string) => {
    const i = lines.findIndex((l) => l.includes(label));
    return i >= 0 ? (lines[i + 1] ?? '').replace(/^#\s*/, '').trim() : '';
  };
  const m = /<age>:\s*(\d+)\s*<sex>:\s*([MF])\s*<diagnoses>:\s*(.*)$/.exec(lines.find((l) => l.includes('<age>')) ?? '');
  const channels: MghMeta['channels'] = {};
  h.signals.forEach((s, i) => {
    const d = s.description.toUpperCase();
    if (d === 'ECG LEAD I') channels.ecgI = i;
    else if (d === 'ECG LEAD II') channels.ecgII = i;
    else if (d === 'ECG LEAD V') channels.ecgV = i;
    else if (d === 'ART') channels.abp = i;
    else if (d === 'PAP') channels.pap = i;
    else if (d === 'CVP') channels.cvp = i;
    else if (d.startsWith('RESP')) channels.resp = i;
    else if (d === 'CO2') channels.co2 = i;
  });
  return {
    record: h.record, ageY: m ? Number(m[1]) : null, sex: (m?.[2] as 'M' | 'F' | undefined) ?? null, diagnosis: m?.[3]?.trim() ?? '',
    rhythm: after('UNDERLYING RHYTHM'), ventilation: after('MODE OF VENTILATION'), channels,
  };
}

/** Physical-unit window [fromS, toS) of every mapped channel, decoded once per record. */
export function mghSignals(h: WfdbHeader, meta: MghMeta, dat: Uint8Array, fromS: number, toS: number): Signals {
  const sig = decode212(dat, h.nSignals);
  const phys = (i: number | undefined) => {
    if (i === undefined) return undefined;
    const s = h.signals[i];
    const raw = sig[i];
    if (!s || !raw) return undefined;
    const a = Math.round(fromS * h.fs);
    const b = Math.round(toS * h.fs);
    // samples at the ADC limits (−2048 / 2047) are invalid in format 212
    const x = Float64Array.from(raw.subarray(a, b), (v) => (v <= -2048 || v >= 2047 ? Number.NaN : (v - s.baseline) / s.gain));
    fillGaps(x);
    return { fs: h.fs, x };
  };
  const co2raw = phys(meta.channels.co2);
  let co2: Signals['co2'];
  if (co2raw) {
    const sorted = Array.from(co2raw.x).sort((p, q) => p - q);
    const base = sorted[Math.floor(0.02 * sorted.length)] ?? 0;
    const zeroed = Float64Array.from(co2raw.x, (v) => v - base);
    const plateaus = capnoAngles(zeroed, h.fs).map((b) => b.plateau).sort((p, q) => p - q);
    const pl = plateaus[Math.floor(plateaus.length / 2)];
    if (pl && pl > 0) co2 = { fs: h.fs, x: Float64Array.from(zeroed, (v) => (v * MGH_CO2_REF_MMHG) / pl) };
  }
  const ecg = phys(meta.channels.ecgII);
  const abp = phys(meta.channels.abp);
  return { ...(ecg ? { ecg } : {}), ...(abp ? { abp } : {}), site: 'unknown', ...(co2 ? { co2, co2Calibrated: false } : {}), numerics: {} };
}
```

- [x] **Step 4: Write `packages/validation/src/datasets/pwdb.ts`**

```ts
// PWDB (PDDL 1.0) virtual-subject indices: per-site, per-age distributions of the timing metrics we also measure.
// Columns (pwdb_pw_indices.csv, header cells carry a leading space): "<Site>_PTT" (s, foot of the site's pressure
// wave after the aortic-root foot), "<Site>_SBP_T" (s, systolic peak after the site's foot), "<Site>_PPGdic_T"
// (s, dicrotic notch of the site's PPG after its foot), "Age".
import { readCsv } from './csv.ts';

export const PWDB_RECORD = '2633175';
export const PWDB_FILES = {
  indices: { file: 'pwdb_pw_indices.csv', md5: 'e713ed5a817ad821d3a2a5fc91e12c85' },
  onsets: { file: 'pwdb_onset_times.csv', md5: '1103ddc3852d6f2164b981582fad8d23' },
  haemod: { file: 'pwdb_haemod_params.csv', md5: 'd0f525c8659383daeb7b9f7206bab142' },
} as const;

export type PwdbSite = 'Radial' | 'Femoral' | 'Brachial' | 'Digital';
export interface PwdbStat { site: PwdbSite; ageY: number; n: number; pttMs: [number, number, number]; sysAfterFootMs: [number, number, number] }

const q = (v: number[], p: number) => v[Math.min(v.length - 1, Math.max(0, Math.round(p * (v.length - 1))))] as number;

/** [p10, p50, p90] per site and age band (25…75 y in 10-year steps) in ms. */
export function pwdbStats(indicesCsv: string, sites: PwdbSite[] = ['Radial', 'Femoral']): PwdbStat[] {
  const rows = readCsv(indicesCsv);
  const out: PwdbStat[] = [];
  const ages = [...new Set(rows.map((r) => Number(r.Age)))].filter(Number.isFinite).sort((a, b) => a - b);
  for (const site of sites) {
    for (const age of ages) {
      const sel = rows.filter((r) => Number(r.Age) === age);
      // non-positive times mark subjects whose onset detection failed in PWDB; they are dropped [ENG]
      const col = (k: string) => sel.map((r) => 1000 * Number(r[k])).filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
      const ptt = col(`${site}_PTT`);
      const sys = col(`${site}_SBP_T`);
      if (!ptt.length) continue;
      out.push({ site, ageY: age, n: sel.length, pttMs: [q(ptt, 0.1), q(ptt, 0.5), q(ptt, 0.9)], sysAfterFootMs: [q(sys, 0.1), q(sys, 0.5), q(sys, 0.9)] });
    }
  }
  return out;
}
```

- [x] **Step 5: Run the test. Expected: PASS (2 tests)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/datasets/mghdb-pwdb.test.ts`

- [x] **Step 6: Commit**

```bash
git add packages/validation/src/datasets/mghdb.ts packages/validation/src/datasets/pwdb.ts packages/validation/test/datasets/mghdb-pwdb.test.ts
git commit -m "feat(validation): MGH/MF metadata and windows (CO2 normalised), PWDB per-site/age timing statistics"
git push
```

---

### Task 6: Manifests and the `datasets:fetch` command (downloads, ≈ 1 GB)

**Files:**
- Create: `packages/validation/src/datasets/manifest.ts`, `packages/validation/src/datasets/select.ts`, `packages/validation/src/datasets/cli-fetch.ts`
- Create (generated, committed): `packages/validation/datasets/manifests/vitaldb.json`, `packages/validation/datasets/manifests/mghdb.json`
- Test: `packages/validation/test/datasets/manifest.test.ts`

**Interfaces:**
- Consumes: Tasks 2–5; Stage 5 `fetchCached`, `fetchVerified`, `parseSums`, `sha256`, `parseHeader`, `decode212`.
- Produces: `interface Manifest { schema: 'pme-dataset-manifest/1'; source; createdAt; selection; files: Record<path, sha256>; windows: AnalysisWindow[]; rejected }`; `readManifest(source): Manifest | null`; `writeManifest(m)`; `manifestPath(source)`; `selectVitaldb(cache, limit)`, `selectMghdb(cache, limit)`, `fetchAll(cache): Promise<number>`; `VITALDB_TARGET = 40`, `MGH_TARGET = 16`, `MGH_WINDOW = [600, 900]`.

CLI modules are ENTRY-ONLY (no "am I main" guard): under vite-node, `process.argv[1]` is vite-node's own path, so a guard never fires (measured while planning). Library code lives in `select.ts`.

Measured while planning: `--select mghdb --limit 3` picked mgh001 (third-degree block), mgh002 (sinus), mgh003 (sinus tachycardia) in ≈ 1 min; VitalDB case files are 3–44 MB each and download at ≈ 0.2–1 MB/s from PhysioNet, so the full VitalDB selection (up to 64 candidates) takes 30–90 min — run it once, in the background, and commit the manifest.

- [ ] **Step 1: Write the failing test `packages/validation/test/datasets/manifest.test.ts`**

```ts
// The committed manifests hold ids, times and hashes only (brief §8), and enough to match an engine run.
import { describe, expect, it } from 'vitest';
import { readManifest } from '../../src/datasets/manifest.ts';

describe.each(['vitaldb', 'mghdb'] as const)('%s manifest', (source) => {
  const m = readManifest(source);
  it('exists and lists hashed files', () => {
    expect(m).not.toBeNull();
    for (const h of Object.values(m?.files ?? {})) expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
  it('every window carries matching targets and a known record', () => {
    for (const w of m?.windows ?? []) {
      expect(w.toS - w.fromS).toBe(300);
      expect(w.sbp).toBeGreaterThan(w.dbp);
      expect(Object.keys(m?.files ?? {}).some((f) => f.includes(w.record))).toBe(true);
    }
  });
  it('contains no sample data (small file)', () => {
    expect(JSON.stringify(m).length).toBeLessThan(200_000);
  });
});
```

- [ ] **Step 2: Run it. Expected: FAIL (no module `manifest.ts`)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/datasets/manifest.test.ts`

- [ ] **Step 3: Write `packages/validation/src/datasets/manifest.ts`**

```ts
// Committed manifests: which records and windows the harness uses, with the SHA-256 of each downloaded file.
// Nothing recorded is in them (brief §8): ids, times, hashes and the matching targets only.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { AnalysisWindow } from './signals.ts';

export interface Manifest {
  schema: 'pme-dataset-manifest/1';
  source: 'vitaldb' | 'mghdb';
  createdAt: string;
  selection: string;
  files: Record<string, string>; // path inside the project → sha256
  windows: AnalysisWindow[];
  rejected: Array<{ record: string; reason: string }>;
}

export const manifestPath = (source: Manifest['source']): string => fileURLToPath(new URL(`../../datasets/manifests/${source}.json`, import.meta.url));

export function readManifest(source: Manifest['source']): Manifest | null {
  const p = manifestPath(source);
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as Manifest) : null;
}

export function writeManifest(m: Manifest): void {
  writeFileSync(manifestPath(m.source), `${JSON.stringify(m, null, 1)}\n`);
}
```

- [ ] **Step 4: Write `packages/validation/src/datasets/select.ts`**

```ts
// Manifest building (decision 2) and manifest-driven download. The command line is src/datasets/cli-fetch.ts.
import { fetchZenodo } from './fetch-zenodo.ts';
import { readManifest, type Manifest } from './manifest.ts';
import { MGHDB, mghMeta } from './mghdb.ts';
import { PWDB_FILES, PWDB_RECORD } from './pwdb.ts';
import type { AnalysisWindow } from './signals.ts';
import { fetchCached, fetchVerified, parseSums, sha256 } from '../templates/fetch.ts';
import { decode212, parseHeader } from '../templates/wfdb.ts';
import { findWindows, loadCase, selectCandidates, VITALDB, vitaldbSums } from './vitaldb.ts';

export const VITALDB_TARGET = 40;
export const MGH_TARGET = 16;
/** MGH/MF window: 600–900 s (after set-up artefacts, inside every record's ≥ 40 min) [ENG]. */
export const MGH_WINDOW: [number, number] = [600, 900];

export async function selectVitaldb(cache: string, limit: number): Promise<Manifest> {
  const td = new TextDecoder();
  const sums = await vitaldbSums(cache);
  const clinical = td.decode(await fetchVerified(cache, VITALDB, 'clinical_data.csv', sums));
  const files: Record<string, string> = { 'clinical_data.csv': sums.get('clinical_data.csv') ?? '' };
  const windows: AnalysisWindow[] = [];
  const rejected: Manifest['rejected'] = [];
  const cands = selectCandidates(clinical, 64);
  for (const c of cands) {
    if (new Set(windows.map((w) => w.record)).size >= Math.min(limit, VITALDB_TARGET)) break;
    const f = await loadCase(cache, c.caseid, sums);
    const ws = findWindows(f, c);
    process.stdout.write(`${c.caseid}: ${ws.length} window(s)\n`);
    if (ws.length === 0) {
      rejected.push({ record: c.caseid, reason: 'no window with ECG II + ART + PLETH + CO2 ≥ 99 % present, plausible ART, IPPV, stable HR' });
      continue;
    }
    files[`vital_files/${c.caseid}.vital`] = sums.get(`vital_files/${c.caseid}.vital`) ?? '';
    windows.push(...ws);
  }
  return { schema: 'pme-dataset-manifest/1', source: 'vitaldb', createdAt: new Date().toISOString(), selection: 'selectCandidates(clinical_data.csv, 64) → first cases with findWindows() ≥ 1 (plan Task 4/6, decision 2)', files, windows, rejected };
}

export async function selectMghdb(cache: string, limit: number): Promise<Manifest> {
  const td = new TextDecoder();
  const sums = parseSums(td.decode(await fetchCached(cache, MGHDB, 'SHA256SUMS.txt')));
  const records = td.decode(await fetchCached(cache, MGHDB, 'RECORDS')).split(/\s+/).filter(Boolean);
  const files: Record<string, string> = {};
  const windows: AnalysisWindow[] = [];
  const rejected: Manifest['rejected'] = [];
  const seenRhythm = new Map<string, number>();
  for (const rec of records) {
    if (windows.length >= Math.min(limit, MGH_TARGET)) break;
    const heaText = td.decode(await fetchVerified(cache, MGHDB, `${rec}.hea`, sums));
    const m = mghMeta(heaText);
    const kind = m.rhythm.toLowerCase().split(/\s+(with|@)\s+/)[0] ?? '';
    if (m.channels.abp === undefined || m.channels.co2 === undefined || m.channels.ecgII === undefined) {
      rejected.push({ record: rec, reason: 'no ART, CO2 or ECG II channel' });
      continue;
    }
    if ((seenRhythm.get(kind) ?? 0) >= 3) continue; // at most 3 per underlying rhythm → diversity [ENG]
    const h = parseHeader(heaText);
    const dat = await fetchVerified(cache, MGHDB, `${rec}.dat`, sums);
    const [a, b] = MGH_WINDOW;
    const abp = decode212(dat, h.nSignals)[m.channels.abp]?.subarray(a * h.fs, b * h.fs);
    const s = h.signals[m.channels.abp];
    if (!abp || !s) continue;
    const mmHg = Array.from(abp, (v) => (v - s.baseline) / s.gain).sort((p, q) => p - q);
    const sbp = mmHg[Math.floor(0.95 * mmHg.length)] as number;
    const dbp = mmHg[Math.floor(0.05 * mmHg.length)] as number;
    if (!(sbp > 60 && sbp < 250 && dbp > 20 && sbp - dbp > 10)) {
      rejected.push({ record: rec, reason: `implausible ART in ${a}–${b} s (${sbp.toFixed(0)}/${dbp.toFixed(0)})` });
      continue;
    }
    seenRhythm.set(kind, (seenRhythm.get(kind) ?? 0) + 1);
    const hrm = /@\s*(\d+)\s*bpm/.exec(m.rhythm);
    files[`${rec}.hea`] = sums.get(`${rec}.hea`) ?? '';
    files[`${rec}.dat`] = sums.get(`${rec}.dat`) ?? '';
    windows.push({
      source: 'mghdb', record: rec, fromS: a, toS: b, site: 'unknown', hr: hrm ? Number(hrm[1]) : Number.NaN, sbp: Math.round(sbp), dbp: Math.round(dbp),
      etco2: null, vent: /controlled|intermittent/i.test(m.ventilation) ? { rr: 12, vtMl: 600, peep: 5 } : null, ageY: m.ageY, sex: m.sex,
      tags: [`rhythm:${kind}`, `vent:${m.ventilation}`, `dx:${m.diagnosis}`],
    });
    process.stdout.write(`${rec}: ${kind}\n`);
  }
  return { schema: 'pme-dataset-manifest/1', source: 'mghdb', createdAt: new Date().toISOString(), selection: `RECORDS in order; ART+CO2+ECG II; ≤ 3 per underlying rhythm; plausible ART in ${MGH_WINDOW.join('–')} s (plan Task 6)`, files, windows, rejected };
}

/** Download everything the manifests list; verify every hash. Returns the number of files checked. */
export async function fetchAll(cache: string): Promise<number> {
  let n = 0;
  for (const src of ['vitaldb', 'mghdb'] as const) {
    const m = readManifest(src);
    if (!m) continue;
    const project = src === 'vitaldb' ? VITALDB : MGHDB;
    for (const [file, want] of Object.entries(m.files)) {
      const got = sha256(await fetchCached(cache, project, file));
      if (got !== want) throw new Error(`${project}/${file}: SHA-256 ${got} ≠ manifest ${want}`);
      n++;
    }
  }
  for (const f of Object.values(PWDB_FILES)) {
    await fetchZenodo(cache, PWDB_RECORD, f.file, f.md5);
    n++;
  }
  return n;
}
```

- [ ] **Step 5: Write `packages/validation/src/datasets/cli-fetch.ts`**

```ts
// `pnpm --filter @pme/validation datasets:fetch [--select vitaldb|mghdb] [--limit N]`
// Without --select: download every file the committed manifests list (and the PWDB CSVs), verifying hashes.
// With --select: rebuild that manifest from metadata (decision 2) — downloads candidates, keeps those that pass.
// Entry-only module (vite-node puts its own path in argv[1], so there is no "am I main" guard anywhere).
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { cacheDir } from './cache.ts';
import { manifestPath, writeManifest } from './manifest.ts';
import { fetchAll, selectMghdb, selectVitaldb } from './select.ts';

const arg = (k: string) => {
  const i = process.argv.indexOf(k);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const cache = cacheDir();
const sel = arg('--select');
const limit = Number(arg('--limit') ?? 999);
if (sel === 'vitaldb' || sel === 'mghdb') {
  const m = sel === 'vitaldb' ? await selectVitaldb(cache, limit) : await selectMghdb(cache, limit);
  mkdirSync(dirname(manifestPath(m.source)), { recursive: true });
  writeManifest(m);
  console.log(`${sel}: ${new Set(m.windows.map((w) => w.record)).size} records, ${m.windows.length} windows, ${m.rejected.length} rejected → ${manifestPath(m.source)}`);
} else {
  console.log(`verified ${await fetchAll(cache)} files in ${cache}`);
}
```

- [ ] **Step 6: Build the manifests (network; MGH/MF ≈ 5–10 min, VitalDB 30–90 min). Run VitalDB in the background and keep going with Task 7 meanwhile; come back for Step 7**

```bash
mkdir -p packages/validation/datasets/manifests
npx -y pnpm@9.15.9 --filter @pme/validation datasets:fetch --select mghdb
nohup npx -y pnpm@9.15.9 --filter @pme/validation datasets:fetch --select vitaldb > /tmp/pme-8a-vitaldb-select.log 2>&1 &
```

Expected (MGH/MF): `mghdb: 16 records, 16 windows, N rejected`. Expected (VitalDB, at the end of the log): `vitaldb: 40 records, 60–80 windows, N rejected`. If fewer than 40 records pass, keep what passed and write the number in the gate note (do not loosen `findWindows`).

- [ ] **Step 7: When both manifests exist, run the test and check the manifests are small. Expected: PASS (6 tests); each file < 200 KB**

```bash
npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/datasets/manifest.test.ts
ls -la packages/validation/datasets/manifests/
```

- [ ] **Step 8: Commit (manifests hold ids, times, hashes and targets only — brief §8)**

```bash
git add packages/validation/src/datasets/manifest.ts packages/validation/src/datasets/select.ts packages/validation/src/datasets/cli-fetch.ts packages/validation/test/datasets/manifest.test.ts packages/validation/datasets/manifests/
git commit -m "feat(validation): dataset manifests (VitalDB 40 cases, MGH/MF 16 records) and the datasets:fetch command"
git push
```

---

### Task 7: Statistics, R detection and arterial fiducials

**Files:**
- Create: `packages/validation/src/stats.ts`, `packages/validation/src/metrics/ecg.ts`, `packages/validation/src/metrics/abp.ts`
- Test: `packages/validation/test/stats.test.ts`, `packages/validation/test/metrics/abp.test.ts`

**Interfaces:**
- Consumes: Stage 5 `bandpassZeroPhase` (`src/templates/dsp.ts`).
- Produces: `quantile(xs, q)`, `median(xs)`, `mean(xs)`, `ksD(a, b)`, `wasserstein1(a, b)`, `coverage(xs, lo, hi)`, `pearson(a, b)`; `detectR(x: Float64Array, fs): number[]` (sample indices); `interface PulseBeat { r; foot; peak; sys; dia; slope; notch?; notchDepth?; notchKind?: 'minimum'|'inflection' }` (times in s); `pulseBeats(x, fs, rS: number[], opts?: { searchMs?: [number, number] }): PulseBeat[]`.

- [x] **Step 1: Write the failing tests**

`packages/validation/test/stats.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { coverage, ksD, pearson, quantile, wasserstein1 } from '../src/stats.ts';

describe('distribution statistics', () => {
  const a = Array.from({ length: 101 }, (_, i) => i);
  it('quantile interpolates and ignores NaN', () => {
    expect(quantile([...a, Number.NaN], 0.5)).toBe(50);
    expect(quantile([0, 10], 0.25)).toBe(2.5);
  });
  it('KS D is 0 for identical and 1 for disjoint samples', () => {
    expect(ksD(a, a)).toBe(0);
    expect(ksD([1, 2, 3], [10, 11])).toBe(1);
  });
  it('Wasserstein-1 of a shifted sample equals the shift', () => {
    expect(wasserstein1(a, a.map((x) => x + 7))).toBeCloseTo(7, 1);
  });
  it('coverage and Pearson', () => {
    expect(coverage(a, 10, 19)).toBeCloseTo(10 / 101);
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
  });
});
```

`packages/validation/test/metrics/abp.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { pulseBeats } from '../../src/metrics/abp.ts';
import { detectR } from '../../src/metrics/ecg.ts';

const FS = 125;
/** Synthetic radial-like pulses: foot at R + delay, linear upstroke 80 ms, exponential fall with a notch dip. */
function pulses(rs: number[], delayS: number, notchAfterPeakS: number, dur: number): Float64Array {
  const x = new Float64Array(Math.round(dur * FS)).fill(70);
  for (const r of rs) {
    const foot = r + delayS;
    for (let i = Math.round(foot * FS); i < x.length && i < Math.round((foot + 0.75) * FS); i++) {
      const t = i / FS - foot;
      let v = t < 0.08 ? 70 + (50 * t) / 0.08 : 70 + 50 * Math.exp(-(t - 0.08) / 0.25);
      const dn = t - (0.08 + notchAfterPeakS);
      v -= 6 * Math.exp(-(dn * dn) / (2 * 0.012 * 0.012));
      x[i] = Math.max(x[i] as number, v);
    }
  }
  return x;
}

describe('arterial fiducials (brief §9 V1/V2)', () => {
  const rs = Array.from({ length: 20 }, (_, i) => 1 + 0.8 * i);
  const x = pulses(rs, 0.16, 0.2, 18);

  it('finds the foot by intersecting tangent within 1 sample of the true onset', () => {
    const b = pulseBeats(x, FS, rs);
    expect(b.length).toBe(20);
    for (const beat of b) expect(Math.abs(beat.foot - beat.r - 0.16)).toBeLessThan(1.5 / FS);
  });

  it('finds the dicrotic notch as a local minimum at peak + 200 ms', () => {
    const b = pulseBeats(x, FS, rs);
    for (const beat of b) {
      expect(beat.notchKind).toBe('minimum');
      expect(Math.abs((beat.notch as number) - (beat.r + 0.16 + 0.08 + 0.2))).toBeLessThan(2 / FS);
      expect(beat.notchDepth).toBeGreaterThan(0.2);
    }
  });

  it('upstroke slope is the steepest dP/dt (≈ 625 mmHg/s here, blunted by the 15 Hz low-pass)', () => {
    const b = pulseBeats(x, FS, rs);
    for (const beat of b) {
      expect(beat.slope).toBeGreaterThan(450);
      expect(beat.slope).toBeLessThan(640);
    }
  });
});

describe('R detection', () => {
  it('finds every R of a spiky 500 Hz train once', () => {
    const fs = 500;
    const x = new Float64Array(10 * fs);
    const rs = [0.5, 1.3, 2.1, 2.9, 3.7, 4.5, 5.3, 6.1, 6.9, 7.7, 8.5, 9.3];
    for (const r of rs) for (let i = -10; i <= 10; i++) x[Math.round(r * fs) + i] = Math.exp(-(i * i) / 18) * 1.2;
    // a broad T wave that must not count
    for (const r of rs) for (let i = -60; i <= 60; i++) { const k = Math.round((r + 0.3) * fs) + i; if (k < x.length) x[k] = (x[k] as number) + 0.3 * Math.exp(-(i * i) / 800); }
    expect(detectR(x, fs).map((i) => +(i / fs).toFixed(3))).toEqual(rs);
  });
});
```

- [x] **Step 2: Run them. Expected: FAIL (modules missing)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/stats.test.ts test/metrics/abp.test.ts`

- [x] **Step 3: Write `packages/validation/src/stats.ts`**

```ts
// Distribution statistics for recorded-vs-generated comparisons (brief §9; decision 7).
export function quantile(xs: ArrayLike<number>, q: number): number {
  const v = Array.from(xs).filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return Number.NaN;
  const k = (v.length - 1) * q;
  const lo = Math.floor(k);
  const hi = Math.ceil(k);
  return (v[lo] as number) + ((v[hi] as number) - (v[lo] as number)) * (k - lo);
}
export const median = (xs: ArrayLike<number>): number => quantile(xs, 0.5);
export const mean = (xs: ArrayLike<number>): number => {
  const v = Array.from(xs).filter(Number.isFinite);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : Number.NaN;
};

/** Two-sample Kolmogorov–Smirnov statistic D (0 = identical empirical CDFs, 1 = disjoint). */
export function ksD(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const x = Array.from(a).filter(Number.isFinite).sort((p, q) => p - q);
  const y = Array.from(b).filter(Number.isFinite).sort((p, q) => p - q);
  if (!x.length || !y.length) return Number.NaN;
  let i = 0;
  let j = 0;
  let d = 0;
  while (i < x.length && j < y.length) {
    const v = Math.min(x[i] as number, y[j] as number);
    while (i < x.length && (x[i] as number) <= v) i++;
    while (j < y.length && (y[j] as number) <= v) j++;
    d = Math.max(d, Math.abs(i / x.length - j / y.length));
  }
  return d;
}

/** 1-Wasserstein (earth mover's) distance between two empirical distributions, in the data's units. */
export function wasserstein1(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const x = Array.from(a).filter(Number.isFinite).sort((p, q) => p - q);
  const y = Array.from(b).filter(Number.isFinite).sort((p, q) => p - q);
  if (!x.length || !y.length) return Number.NaN;
  const n = 200; // quantile grid [ENG]
  let s = 0;
  for (let k = 0; k < n; k++) {
    const q = (k + 0.5) / n;
    s += Math.abs(quantile(x, q) - quantile(y, q));
  }
  return s / n;
}

/** Fraction of `xs` inside [lo, hi] (interval coverage). */
export function coverage(xs: ArrayLike<number>, lo: number, hi: number): number {
  const v = Array.from(xs).filter(Number.isFinite);
  return v.length ? v.filter((x) => x >= lo && x <= hi).length / v.length : Number.NaN;
}

export function pearson(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const n = Math.min(a.length, b.length);
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i] as number;
    mb += b[i] as number;
  }
  ma /= n;
  mb /= n;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let i = 0; i < n; i++) {
    const da = (a[i] as number) - ma;
    const db = (b[i] as number) - mb;
    sab += da * db;
    saa += da * da;
    sbb += db * db;
  }
  return sab / Math.sqrt(saa * sbb);
}
```

- [x] **Step 4: Write `packages/validation/src/metrics/ecg.ts`**

```ts
// R-peak detection for metric fiducials, identical for recorded and generated ECG (brief §9 V1–V3).
// Band-pass 5–15 Hz (zero phase), rectify, threshold at 45 % of the 98th-percentile amplitude of each 10 s block,
// 250 ms refractory, then refine to the extreme of the unfiltered signal within ±40 ms [ENG].
import { quantile } from '../stats.ts';
import { bandpassZeroPhase } from '../templates/dsp.ts';

export function detectR(x: Float64Array, fs: number): number[] {
  const clean = Float64Array.from(x, (v) => (Number.isFinite(v) ? v : 0));
  const f = bandpassZeroPhase(clean, fs, 5, 15);
  const a = Float64Array.from(f, Math.abs);
  const block = Math.round(10 * fs);
  const thr = new Float64Array(a.length);
  for (let b = 0; b < a.length; b += block) {
    const t = 0.45 * quantile(a.subarray(b, Math.min(a.length, b + block)), 0.98);
    thr.fill(t, b, Math.min(a.length, b + block));
  }
  const out: number[] = [];
  const refr = Math.round(0.25 * fs);
  const w = Math.round(0.04 * fs);
  for (let i = 1; i < a.length - 1; i++) {
    const v = a[i] as number;
    if (v < (thr[i] as number) || v < (a[i - 1] as number) || v < (a[i + 1] as number)) continue;
    // polarity of the dominant deflection in this window decides whether R is a max or a min of the raw signal
    let best = i;
    const sign = (f[i] as number) >= 0 ? 1 : -1;
    for (let k = Math.max(0, i - w); k <= Math.min(x.length - 1, i + w); k++) if (sign * (clean[k] as number) > sign * (clean[best] as number)) best = k;
    const last = out[out.length - 1];
    if (last !== undefined && best - last < refr) {
      if (Math.abs(clean[best] as number) > Math.abs(clean[last] as number)) out[out.length - 1] = best;
      continue;
    }
    out.push(best);
  }
  return out;
}
```

- [x] **Step 5: Write `packages/validation/src/metrics/abp.ts`**

```ts
// Arterial (and pleth) beat fiducials, identical for recorded and generated pulses (brief §9 V1–V3):
// - foot: intersecting tangent — the tangent at the maximum first derivative meets the horizontal through the
//   pre-upstroke minimum (research 03 §2.1; the standard PWV foot);
// - upstroke slope: that maximum dP/dt (mmHg/s, after a 15 Hz zero-phase low-pass) [ENG];
// - dicrotic notch: the first local minimum of the pressure after the systolic peak; when the notch is only an
//   inflection (common at the radial site) the maximum of d²P/dt² in the same window is used — flagged `inflection`.
//   Window: peak + 60 ms … peak + min(0.5·RR, 450 ms) [ENG];
// - notch depth: (P_peak − P_notch)/(P_peak − P_dia), 0 = no notch, 1 = back to diastolic [ENG].

export interface PulseBeat {
  r: number; // R index (s)
  foot: number; // s
  peak: number; // s
  sys: number;
  dia: number;
  slope: number; // units/s
  notch?: number; // s
  notchDepth?: number;
  notchKind?: 'minimum' | 'inflection';
}

function lowpass(x: Float64Array, fs: number, fc: number): Float64Array {
  // zero-phase first-order low-pass (forward + backward)
  const a = Math.exp((-2 * Math.PI * fc) / fs);
  const run = (v: Float64Array) => {
    const o = new Float64Array(v.length);
    let y = v[0] as number;
    for (let i = 0; i < v.length; i++) {
      y = a * y + (1 - a) * (v[i] as number);
      o[i] = y;
    }
    return o;
  };
  return run(run(x).reverse()).reverse();
}

/** One beat per R peak (sample times in s of the ECG `rS`); `x` at `fs` covers the same time base (t = i/fs). */
export function pulseBeats(x: Float64Array, fs: number, rS: number[], opts: { searchMs?: [number, number] } = {}): PulseBeat[] {
  const [s0, s1] = opts.searchMs ?? [40, 500];
  const clean = Float64Array.from(x, (v) => (Number.isFinite(v) ? v : Number.NaN));
  if (clean.some((v) => Number.isNaN(v))) {
    let last = 0;
    for (let i = 0; i < clean.length; i++) if (Number.isNaN(clean[i] as number)) clean[i] = last; else last = clean[i] as number;
  }
  const y = lowpass(clean, fs, 15);
  const d = new Float64Array(y.length);
  for (let i = 1; i < y.length - 1; i++) d[i] = (((y[i + 1] as number) - (y[i - 1] as number)) * fs) / 2;
  const out: PulseBeat[] = [];
  for (let j = 0; j < rS.length; j++) {
    const r = rS[j] as number;
    const rr = j + 1 < rS.length ? (rS[j + 1] as number) - r : j > 0 ? r - (rS[j - 1] as number) : 0.8;
    const a = Math.round((r + s0 / 1000) * fs);
    const b = Math.min(y.length - 2, Math.round((r + Math.min(s1 / 1000, 0.9 * rr)) * fs));
    if (a < 2 || b <= a + 2) continue;
    let im = a;
    for (let i = a; i <= b; i++) if ((d[i] as number) > (d[im] as number)) im = i;
    if ((d[im] as number) <= 0) continue;
    let i0 = im; // pre-upstroke minimum: walk back while falling
    while (i0 > a - Math.round(0.1 * fs) && i0 > 1 && (y[i0 - 1] as number) <= (y[i0] as number)) i0--;
    const dia = y[i0] as number;
    const foot = im / fs - ((y[im] as number) - dia) / (d[im] as number);
    let ip = im;
    const pk = Math.min(y.length - 1, im + Math.round(0.3 * fs));
    for (let i = im; i <= pk; i++) if ((y[i] as number) > (y[ip] as number)) ip = i;
    const beat: PulseBeat = { r, foot, peak: ip / fs, sys: y[ip] as number, dia, slope: d[im] as number };
    const n0 = ip + Math.round(0.06 * fs);
    const n1 = Math.min(y.length - 2, ip + Math.round(Math.min(0.5 * rr, 0.45) * fs));
    let notch = -1;
    for (let i = n0; i < n1; i++) if ((d[i] as number) <= 0 && (d[i + 1] as number) > 0) { notch = i; break; }
    let kind: 'minimum' | 'inflection' = 'minimum';
    if (notch < 0 && n1 > n0 + 2) {
      kind = 'inflection';
      let best = -Infinity;
      for (let i = n0 + 1; i < n1; i++) {
        const dd = (d[i + 1] as number) - (d[i - 1] as number);
        if (dd > best) { best = dd; notch = i; }
      }
    }
    if (notch > 0) {
      beat.notch = notch / fs;
      beat.notchKind = kind;
      beat.notchDepth = (beat.sys - (y[notch] as number)) / Math.max(1e-9, beat.sys - dia);
    }
    out.push(beat);
  }
  return out;
}
```

- [x] **Step 6: Run the tests. Expected: PASS (8 tests)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/stats.test.ts test/metrics/abp.test.ts`

- [x] **Step 7: Commit**

```bash
git add packages/validation/src/stats.ts packages/validation/src/metrics/ecg.ts packages/validation/src/metrics/abp.ts packages/validation/test/stats.test.ts packages/validation/test/metrics/abp.test.ts
git commit -m "feat(validation): KS/Wasserstein/coverage statistics, R detection, arterial foot/notch/slope fiducials"
git push
```

---

### Task 8: Capnogram α tests, respiratory variation (PPV/SPV vs airway phase), PPG ↔ ABP, device metrics

**Files:**
- Create: `packages/validation/src/metrics/resp-variation.ts`, `packages/validation/src/metrics/ppg.ts`, `packages/validation/src/metrics/device.ts`
- Test: `packages/validation/test/metrics/capno.test.ts`, `packages/validation/test/metrics/resp-ppg-device.test.ts`

**Interfaces:**
- Consumes: Task 4 `capnoAngles`, `Wave`; Task 7 `pulseBeats`, `PulseBeat`, `median`, `pearson`.
- Produces: `interface RespVariation { ppvPct; spvMmHg; ppMaxPhase; breaths }`; `respVariation(beats, inspirations): RespVariation`; `interface PpgAbp { delayMs: number[]; shapeR; countRatio }`; `ppgAbp(abp: Wave, pleth: Wave, rS, abpBeats?): PpgAbp`; `hrAveragingError(displayed: Array<[t, hr]>, rS): number[]`; `nibpVsAbp(nibpMean: Array<[t, map]>, beats): number[]`; `paEtGap(paco2: Array<[t, v]>, etco2: Array<[t, v]>): number[]`.

Planning note on PPG: VitalDB `SNUADC/PLETH` is the patient monitor's analogue output. Measured on four windows its foot follows the radial foot by **396–497 ms** with a shape r of **0.95–0.99** — far beyond the 20–100 ms physiology (research 03 §3.1), i.e. the recording includes the monitor's processing latency. The recorded PPG delay is therefore report-only; the engine's delay (102–112 ms measured) is graded against the literature band (Task 11).

- [x] **Step 1: Write the failing tests**

`packages/validation/test/metrics/capno.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { capnoAngles } from '../../src/metrics/capno.ts';

/** Trapezoid capnogram at `fs`: 0 baseline, phase II at sII mmHg/s to 36, phase III rising sIII mmHg/s for 2 s, drop. */
function trapezoid(fs: number, sII: number, sIII: number, breaths = 5, hold = 1): Float64Array {
  const x: number[] = [];
  for (let b = 0; b < breaths; b++) {
    for (let i = 0; i < 2 * fs; i++) x.push(0);
    for (let v = 0; v < 36; v += sII / fs) x.push(v);
    for (let i = 0; i < 2 * fs; i++) x.push(36 + (sIII * i) / fs);
  }
  for (let i = 0; i < 2 * fs; i++) x.push(0);
  // sample-and-hold every `hold` samples (hold 1 = smooth)
  return Float64Array.from(x, (_, i) => x[i - (i % hold)] as number);
}

const expected = (sII: number, sIII: number) => 180 - (Math.atan(sII / 25) * 180) / Math.PI + (Math.atan(sIII / 25) * 180) / Math.PI;

describe('capnogram α (R39 item 6: one convention for recorded and generated)', () => {
  it('recovers α of a synthetic trapezoid within 1°', () => {
    const a = capnoAngles(trapezoid(62.5, 90, 1));
    expect(a.length).toBe(5);
    for (const b of a) expect(b.alpha).toBeCloseTo(expected(90, 1), 0);
  });

  it('measures sample-and-hold recorders (VitalDB Primus ≈ 25 Hz inside 62.5 Hz) within 3° of the smooth trace', () => {
    const smooth = capnoAngles(trapezoid(62.5, 60, 1.5));
    const held = capnoAngles(trapezoid(62.5, 60, 1.5, 5, 3));
    expect(held.length).toBe(smooth.length);
    for (let i = 0; i < held.length; i++) expect(Math.abs(held[i]!.alpha - smooth[i]!.alpha)).toBeLessThan(3);
  });

  it('works at 360 Hz (MGH/MF)', () => {
    const a = capnoAngles(trapezoid(360, 90, 1), 360);
    expect(a.length).toBe(5);
    expect(a[2]!.alpha).toBeCloseTo(expected(90, 1), 0);
  });
});
```

`packages/validation/test/metrics/resp-ppg-device.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { PulseBeat } from '../../src/metrics/abp.ts';
import { hrAveragingError, nibpVsAbp, paEtGap } from '../../src/metrics/device.ts';
import { ppgAbp } from '../../src/metrics/ppg.ts';
import { respVariation } from '../../src/metrics/resp-variation.ts';

const beat = (t: number, sys: number, dia: number): PulseBeat => ({ r: t - 0.2, foot: t - 0.1, peak: t, sys, dia, slope: 800 });

describe('respiratory variation (PPV/SPV against the ventilator cycle)', () => {
  it('PP 40 → 50 within each 5 s breath gives PPV 22 %, SPV 10, PPmax early', () => {
    const beats: PulseBeat[] = [];
    for (let b = 0; b < 6; b++) for (let k = 0; k < 5; k++) beats.push(beat(b * 5 + k + 0.5, k === 1 ? 130 : 120, 80));
    const r = respVariation(beats, [0, 5, 10, 15, 20, 25, 30]);
    expect(r.breaths).toBe(6);
    expect(r.ppvPct).toBeCloseTo(22.2, 1);
    expect(r.spvMmHg).toBe(10);
    expect(r.ppMaxPhase).toBeCloseTo(0.3, 5);
  });
});

describe('PPG ↔ ABP', () => {
  it('measures the pleth delay after the arterial foot and a high shape r for the same pulse shape', () => {
    const fs = 125;
    const pulse = (delay: number) => Float64Array.from({ length: 20 * fs }, (_, i) => {
      const t = ((i / fs) - delay) % 1;
      return t < 0 || t > 0.8 ? 0 : t < 0.1 ? t * 10 : Math.exp(-(t - 0.1) / 0.2);
    });
    const rS = Array.from({ length: 19 }, (_, i) => i + 0.5);
    const r = ppgAbp({ fs, x: pulse(0.65) }, { fs, x: pulse(0.72) }, rS);
    expect(Math.abs(Math.round(r.delayMs.reduce((a, b) => a + b, 0) / r.delayMs.length) - 70)).toBeLessThanOrEqual(8);
    expect(r.shapeR).toBeGreaterThan(0.95);
    expect(r.countRatio).toBeGreaterThan(0.9);
  });
});

describe('device metrics', () => {
  it('HR averaging error against 12 RR; NIBP minus 40 s invasive MAP; Pa–Et gap', () => {
    const rS = Array.from({ length: 30 }, (_, i) => i * 0.75); // 80 bpm
    expect(hrAveragingError([[20, 82]], rS)).toEqual([2]);
    const beats = Array.from({ length: 60 }, (_, i) => beat(i, 120, 60)); // MAP 80
    expect(nibpVsAbp([[50, 85]], beats)).toEqual([5]);
    expect(paEtGap([[300, 42]], [[200, 35], [250, 36], [290, 37]])).toEqual([6]);
  });
});
```

- [x] **Step 2: Run them. Expected: capno PASS (the module exists since Task 4), the other file FAIL (modules missing)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/metrics/capno.test.ts test/metrics/resp-ppg-device.test.ts`

- [x] **Step 3: Write `packages/validation/src/metrics/resp-variation.ts`**

```ts
// Respiratory variation of the arterial pulse against the ventilator cycle (brief §9 metrics list; research 03 §2.4):
// per breath (inspiration onset to the next), PPV = (PPmax − PPmin) / mean(PPmax, PPmin) · 100 and SPV = SBPmax −
// SBPmin; phase = (time of the PPmax beat − inspiration onset) / breath length, 0…1. Positive-pressure ventilation puts
// PPmax early in the cycle (inspiration) — the reversed-pulsus sign. Median over breaths with ≥ 3 beats [ENG].
import type { PulseBeat } from './abp.ts';
import { median } from '../stats.ts';

export interface RespVariation { ppvPct: number; spvMmHg: number; ppMaxPhase: number; breaths: number }

export function respVariation(beats: PulseBeat[], inspirations: number[]): RespVariation {
  const ppv: number[] = [];
  const spv: number[] = [];
  const phase: number[] = [];
  for (let i = 0; i + 1 < inspirations.length; i++) {
    const a = inspirations[i] as number;
    const b = inspirations[i + 1] as number;
    const inB = beats.filter((x) => x.peak >= a && x.peak < b);
    if (inB.length < 3) continue;
    const pp = inB.map((x) => x.sys - x.dia);
    const hi = Math.max(...pp);
    const lo = Math.min(...pp);
    ppv.push((100 * (hi - lo)) / ((hi + lo) / 2));
    spv.push(Math.max(...inB.map((x) => x.sys)) - Math.min(...inB.map((x) => x.sys)));
    phase.push(((inB[pp.indexOf(hi)] as PulseBeat).peak - a) / (b - a));
  }
  return { ppvPct: median(ppv), spvMmHg: median(spv), ppMaxPhase: median(phase), breaths: ppv.length };
}
```

- [x] **Step 4: Write `packages/validation/src/metrics/ppg.ts`**

```ts
// PPG ↔ ABP correspondence (brief §9 V3). Pleth feet are searched AFTER each arterial foot (pulseBeats with the
// arterial feet as the trigger times), so the delay is pleth foot − arterial foot of the same ejection even when the
// finger pulse arrives after the next R (common at HR > 100 under GA; measured on VitalDB while planning).
// Shape: Pearson r of the two median beats, each aligned on its own foot, 0 … 0.8·median beat interval, min–max
// normalised. Count ratio: pleth pulses / arterial pulses (1 in sinus; < 1 when beats do not reach the finger).
import { pulseBeats, type PulseBeat } from './abp.ts';
import { median, pearson } from '../stats.ts';
import type { Wave } from '../datasets/signals.ts';

export interface PpgAbp { delayMs: number[]; shapeR: number; countRatio: number }

function medianBeat(w: Wave, feet: number[], spanS: number, fsOut = 125): Float64Array {
  const n = Math.max(2, Math.round(spanS * fsOut));
  const cols: number[][] = Array.from({ length: n }, () => []);
  for (const f of feet) {
    for (let k = 0; k < n; k++) {
      const i = Math.round((f + k / fsOut) * w.fs);
      if (i >= 0 && i < w.x.length) (cols[k] as number[]).push(w.x[i] as number);
    }
  }
  const m = Float64Array.from(cols, (c) => median(c));
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of m) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  return Float64Array.from(m, (v) => (v - lo) / Math.max(1e-9, hi - lo));
}

export function ppgAbp(abp: Wave, pleth: Wave, rS: number[], abpBeats?: PulseBeat[]): PpgAbp {
  const a = abpBeats ?? pulseBeats(abp.x, abp.fs, rS);
  const aFeet = a.map((b) => b.foot);
  const p = pulseBeats(pleth.x, pleth.fs, aFeet, { searchMs: [10, 700] });
  const delayMs = p.map((b) => 1000 * (b.foot - b.r)).filter((d) => d > 0 && d < 500);
  const ibi = median(aFeet.slice(1).map((t, i) => t - (aFeet[i] as number)));
  const span = 0.8 * (Number.isFinite(ibi) ? ibi : 0.8);
  const inner = (xs: number[]) => xs.slice(1, -1);
  return { delayMs, shapeR: pearson(medianBeat(abp, inner(aFeet), span), medianBeat(pleth, inner(p.map((b) => b.foot)), span)), countRatio: p.length / Math.max(1, a.length) };
}
```

- [x] **Step 5: Write `packages/validation/src/metrics/device.ts`**

```ts
// Device-behaviour metrics computed identically on recorded numerics and engine `measurement` events:
// - HR averaging: the displayed HR vs the HR of the last 12 R-R intervals ending at the display time
//   (IEC-style, brief §6.1) — error distribution in bpm;
// - NIBP vs ABP: each NIBP MAP minus the invasive MAP averaged over the 40 s before it (the cuff cycle) [ENG];
// - EtCO2 − PaCO2: each arterial PaCO2 lab value against the median EtCO2 of the 120 s before it (recorded only;
//   the engine has no public PaCO2 until Stage 7c, the report says so).
import { median } from '../stats.ts';
import type { PulseBeat } from './abp.ts';

export function hrAveragingError(displayed: Array<[number, number]>, rS: number[]): number[] {
  const out: number[] = [];
  for (const [t, hr] of displayed) {
    const past = rS.filter((r) => r <= t);
    if (past.length < 13) continue;
    const rr = past.slice(-13);
    const mean = (rr[12] as number - (rr[0] as number)) / 12;
    out.push(hr - 60 / mean);
  }
  return out;
}

export function nibpVsAbp(nibpMean: Array<[number, number]>, beats: PulseBeat[]): number[] {
  const out: number[] = [];
  for (const [t, map] of nibpMean) {
    const w = beats.filter((b) => b.peak >= t - 40 && b.peak < t);
    if (w.length < 10) continue;
    out.push(map - median(w.map((b) => b.dia + (b.sys - b.dia) / 3)));
  }
  return out;
}

export function paEtGap(paco2: Array<[number, number]>, etco2: Array<[number, number]>): number[] {
  const out: number[] = [];
  for (const [t, pa] of paco2) {
    const et = etco2.filter(([s]) => s >= t - 120 && s <= t).map(([, v]) => v);
    if (et.length >= 3) out.push(pa - median(et));
  }
  return out;
}
```

- [x] **Step 6: Run the tests. Expected: PASS (6 tests)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/metrics/capno.test.ts test/metrics/resp-ppg-device.test.ts`

- [x] **Step 7: Commit**

```bash
git add packages/validation/src/metrics/resp-variation.ts packages/validation/src/metrics/ppg.ts packages/validation/src/metrics/device.ts packages/validation/test/metrics/capno.test.ts packages/validation/test/metrics/resp-ppg-device.test.ts
git commit -m "feat(validation): PPV/SPV against the ventilator cycle, PPG-ABP delay/shape/count, HR averaging, NIBP-ABP, Pa-Et gap"
git push
```

---

### Task 9: ECG intervals on the 12-lead capture vs PTB-XL

**Files:**
- Create: `packages/validation/src/metrics/intervals.ts`
- Test: `packages/validation/test/metrics/intervals.test.ts`

**Interfaces:**
- Consumes: Stage 5 `medianBeat` (`src/templates/compare-ptbxl.ts`), `bandpassZeroPhase`; Task 7 `detectR`, `median`.
- Produces: `interface Intervals { prMs; qrsMs; qtMs; qtcMs; rrS }`; `intervalsOf(x: Float64Array, fs = 500): Intervals | null`.

Measured while planning on the engine's `capture12()` lead II (seed 3, 40 s): HR 60 → PR 220, QRS 62, QT 375, QTcF 376 ms; HR 75 → 214 / 52 / 351 / 379; HR 100 → 204 / 62 / 316 / 375. Absolute values are method-dependent (a 15 % slope threshold places QRS onset late and P onset early); they are only ever compared with PTB-XL measured by this same function (Task 11), never with textbook numbers. Without the 0.5–40 Hz band-pass the diagnostic-filter noise made QRS read 164–260 ms — the filter is required.

- [x] **Step 1: Write the failing test `packages/validation/test/metrics/intervals.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { intervalsOf } from '../../src/metrics/intervals.ts';

/** Synthetic lead II at 500 Hz: P (Gaussian), QRS (sharp biphasic), T (asymmetric Gaussian); RR 1 s. */
function ecg(pr: number, qrs: number, qt: number): Float64Array {
  const fs = 500;
  const x = new Float64Array(12 * fs);
  const g = (t: number, c: number, s: number, a: number) => a * Math.exp(-((t - c) ** 2) / (2 * s * s));
  for (let i = 0; i < x.length; i++) {
    const t = (i / fs) % 1;
    const q = 0.5; // QRS onset in each second
    let v = g(t, q - pr + 0.045, 0.018, 0.15); // P: onset ≈ centre − 2.5σ
    v += g(t, q + qrs / 2, qrs / 6, 1.2) - g(t, q + qrs * 0.85, qrs / 10, 0.25);
    v += t < q + qt - 0.07 ? g(t, q + qt - 0.07, 0.06, 0.3) : g(t, q + qt - 0.07, 0.03, 0.3);
    x[i] = v;
  }
  return x;
}

describe('ECG intervals on the median beat (brief §9 V5)', () => {
  it('recovers PR, QRS and QT of a synthetic beat within 20 ms', () => {
    const r = intervalsOf(ecg(0.16, 0.09, 0.4));
    expect(r).not.toBeNull();
    expect(Math.abs((r?.prMs ?? 0) - 160)).toBeLessThan(20);
    expect(Math.abs((r?.qrsMs ?? 0) - 90)).toBeLessThan(20);
    expect(Math.abs((r?.qtMs ?? 0) - 400)).toBeLessThan(20);
    expect(r?.rrS).toBeCloseTo(1, 2);
  });
  it('orders a long-QT beat after a normal one', () => {
    expect((intervalsOf(ecg(0.16, 0.09, 0.5))?.qtMs ?? 0) - (intervalsOf(ecg(0.16, 0.09, 0.4))?.qtMs ?? 0)).toBeGreaterThan(70);
  });
});
```

- [x] **Step 2: Run it. Expected: FAIL (module missing)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/metrics/intervals.test.ts`

- [x] **Step 3: Write `packages/validation/src/metrics/intervals.ts`**

```ts
// ECG intervals on a lead-II median beat (brief §9 V5), one method for PTB-XL and for the engine's 12-lead capture:
// - the lead is band-passed 0.5–40 Hz (zero phase, as Stage 5's PTB-XL comparison), then the median beat is taken
//   250 ms before to 450 ms after R (Stage 5's medianBeat, R from detectR);
// - baseline = median of the 250–200 ms pre-R segment (PR/TP region) [ENG];
// - QRS onset/offset: first/last sample within ±150 ms of R where |dV/dt| exceeds 15 % of its peak inside that
//   window [ENG]; P onset: the same rule on the 250–60 ms pre-QRS window with 25 % of that window's slope peak;
//   T end: tangent at the steepest descent after the T peak (or ascent for negative T) meets the baseline
//   (tangent method, Lepeschkin–Surawicz).
// PR = QRS onset − P onset; QRS = offset − onset; QT = T end − QRS onset; QTc Fridericia = QT / RR^(1/3).
import { medianBeat } from '../templates/compare-ptbxl.ts';
import { bandpassZeroPhase } from '../templates/dsp.ts';
import { median } from '../stats.ts';
import { detectR } from './ecg.ts';

export const PRE = 125; // samples at 500 Hz (compare-ptbxl.ts)
export interface Intervals { prMs: number; qrsMs: number; qtMs: number; qtcMs: number; rrS: number }

export function intervalsOf(x: Float64Array, fs = 500): Intervals | null {
  if (fs !== 500) throw new Error('intervalsOf expects 500 Hz');
  const peaks = detectR(x, fs);
  if (peaks.length < 4) return null;
  const rrS = median(peaks.slice(1).map((p, i) => (p - (peaks[i] as number)) / fs));
  const b = medianBeat(bandpassZeroPhase(x, fs, 0.5, 40), peaks);
  const base = median(Array.from(b.subarray(0, 25)));
  const y = Float64Array.from(b, (v) => v - base);
  const d = new Float64Array(y.length);
  for (let i = 1; i < y.length - 1; i++) d[i] = ((y[i + 1] as number) - (y[i - 1] as number)) / 2;
  const R = PRE;
  const w = 75; // ±150 ms
  let dmax = 0;
  for (let i = R - w; i <= R + w; i++) dmax = Math.max(dmax, Math.abs(d[i] as number));
  let on = R;
  for (let i = R - w; i < R; i++) if (Math.abs(d[i] as number) > 0.15 * dmax) { on = i; break; }
  let off = R;
  for (let i = R + w; i > R; i--) if (Math.abs(d[i] as number) > 0.15 * dmax) { off = i; break; }
  // P onset
  let pmax = 0;
  for (let i = Math.max(1, on - 125); i < on - 30; i++) pmax = Math.max(pmax, Math.abs(d[i] as number));
  let pOn = Number.NaN;
  for (let i = Math.max(1, on - 125); i < on - 30; i++) if (Math.abs(d[i] as number) > 0.25 * pmax) { pOn = i; break; }
  // T end by tangent
  let tp = off + 20;
  for (let i = off + 20; i < y.length - 2; i++) if (Math.abs(y[i] as number) > Math.abs(y[tp] as number)) tp = i;
  const sign = (y[tp] as number) >= 0 ? 1 : -1;
  let ts = tp;
  for (let i = tp; i < y.length - 2; i++) if (sign * (d[i] as number) < sign * (d[ts] as number)) ts = i;
  const slope = d[ts] as number;
  const tEnd = Math.abs(slope) > 1e-9 ? ts - (y[ts] as number) / slope : Number.NaN;
  const ms = (n: number) => (n * 1000) / fs;
  const qtMs = ms(tEnd - on);
  return { prMs: ms(on - pOn), qrsMs: ms(off - on), qtMs, qtcMs: qtMs / Math.cbrt(rrS), rrS };
}
```

- [x] **Step 4: Run the test. Expected: PASS (2 tests)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/metrics/intervals.test.ts`

- [x] **Step 5: Commit**

```bash
git add packages/validation/src/metrics/intervals.ts packages/validation/test/metrics/intervals.test.ts
git commit -m "feat(validation): PR/QRS/QT on a lead II median beat, one method for PTB-XL and the engine capture"
git push
```

---

### Task 10: Headless capture, matched engine runs, per-window metrics

**Files:**
- Create: `packages/validation/src/engine/capture.ts`, `packages/validation/src/engine/match.ts`, `packages/validation/src/metrics/window-metrics.ts`
- Modify: `packages/validation/src/datasets/vitaldb.ts` (add `newReadings`, use it for NIBP — shown in full in Task 4's final text below)
- Test: `packages/validation/test/engine/capture-match.test.ts`

**Interfaces:**
- Consumes: `createEngine`, `ChannelId`, `Command`, `EngineEvent`, `EngineOptions`, `MonitorEngine`, `NumericId` from `@pme/engine-core`; Tasks 4, 7, 8.
- Produces: `interface Capture { engine; events; channels: Partial<Record<ChannelId, Wave>>; fromS; toS }`; `cmd(body)`, `clinical(event)`; `capture({ engine, script?, channels, fromS, toS }): Promise<Capture>`; `WARMUP_S = 180`; `numericSeries(ev, id, fromS, toS)`; `matchedRun(w: AnalysisWindow, seed): Promise<{ signals: Signals; cap: Capture }>`; `interface WindowMetrics { hr; beats; rToFootMs; footToPeakMs; rToNotchMs; notchDepth; notchMinimumFrac; upstrokeSlope; sys; dia; alpha; slopeIII; plateau; co2Calibrated; resp: RespVariation | null; ppgDelayMs; ppgShapeR; ppgCountRatio; hrErr; nibpMinusAbp }`; `computeWindowMetrics(s: Signals): WindowMetrics`.

Planning notes: the engine keeps 120 s per channel, so `capture` drains after every ≤ 20 s chunk (decision 6). With a 60 s warm-up the EtCO2 target had not settled (engine 36–38 mmHg for targets 30–33); 180 s fixes most windows (0001: 33.9 for 32) but not all (0001 hypotensive window: 37.0 for 30) — the report prints the achieved EtCO2 beside every α row. VitalDB's `Solar8000/NIBP_MBP` repeats the last reading every 2 s; without `newReadings` the NIBP bias counted each cuff reading ≈ 150 times.

- [x] **Step 1: Add `newReadings` to `packages/validation/src/datasets/vitaldb.ts`. Insert above `/** The recorded Signals of one window …`:**

```ts
/** Solar8000 repeats the last NIBP reading every 2 s: keep only the points where the value changes (a new cuff cycle). */
export function newReadings(p: Array<[number, number]>): Array<[number, number]> {
  return p.filter(([, v], i) => i === 0 || v !== (p[i - 1] as [number, number])[1]);
}
```

and in `vitaldbSignals` replace the `nibpMean:` line with:

```ts
      nibpMean: rebase(newReadings(numbers(f, NUMS.nibpMean, w.fromS - 600, w.toS))).filter(([t]) => t >= 0),
```

(the 600 s look-back finds the reading that was current when the window opened, so the first new one inside it is recognised). Append to `packages/validation/test/datasets/vitaldb.test.ts`:

```ts

describe('newReadings', () => {
  it('drops the 2 s repeats of the last NIBP value', async () => {
    const { newReadings } = await import('../../src/datasets/vitaldb.ts');
    expect(newReadings([[0, 80], [2, 80], [4, 80], [300, 76], [302, 76]])).toEqual([[0, 80], [300, 76]]);
  });
});
```

- [x] **Step 2: Write the failing test `packages/validation/test/engine/capture-match.test.ts`**

```ts
import { createEngine } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { capture, clinical } from '../../src/engine/capture.ts';
import { matchedRun, WARMUP_S } from '../../src/engine/match.ts';
import { computeWindowMetrics } from '../../src/metrics/window-metrics.ts';
import { median } from '../../src/stats.ts';
import type { AnalysisWindow } from '../../src/datasets/signals.ts';

describe('headless capture', { timeout: 60_000 }, () => {
  it('copies samples out in chunks, identical to one read at the end (inside the 120 s ring)', async () => {
    const c = await capture({ engine: { seed: 5, patient: { sensors: { abp: 'connected' } } }, channels: ['ecgII', 'abp'], fromS: 10, toS: 70 });
    const e = createEngine({ seed: 5, patient: { sensors: { abp: 'connected' } } });
    e.advanceTo(70.2);
    const ref = new Float32Array(60 * 125);
    e.readSamples('abp', 10 * 125, ref);
    expect(Array.from(c.channels.abp?.x ?? [])).toEqual(Array.from(ref));
    expect(c.channels.ecgII?.x.length).toBe(60 * 500);
  });
  it('captures beyond the ring length and dispatches scripted commands on time', async () => {
    const c = await capture({ engine: { seed: 5, patient: { sensors: { co2: 'on' } } }, script: [{ t: 5, cmd: clinical({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500 }) }], channels: ['co2'], fromS: 0, toS: 150 });
    expect(c.channels.co2?.x.length).toBe(150 * 62.5);
    expect(c.events.some((e) => e.type === 'breath' && e.t > 5 && e.t < 11)).toBe(true);
  });
});

describe('matched engine run (decision 5)', { timeout: 60_000 }, () => {
  it('lands on the window HR, pressures and EtCO2 and measures like a recording', async () => {
    const w: AnalysisWindow = { source: 'vitaldb', record: 'test', fromS: 0, toS: 30, site: 'radial', hr: 80, sbp: 130, dbp: 70, etco2: 32, vent: { rr: 10, vtMl: 480, peep: 5 }, ageY: 60, sex: 'F', tags: [] };
    const { signals, cap } = await matchedRun(w, 11);
    expect(cap.fromS).toBe(WARMUP_S);
    const m = computeWindowMetrics(signals);
    expect(Math.abs(m.hr - 80)).toBeLessThan(3);
    expect(Math.abs(median(m.sys) - 130)).toBeLessThan(8);
    expect(Math.abs(median(m.dia) - 70)).toBeLessThan(8);
    expect(signals.inspirations?.length).toBe(5);
    expect(Math.abs(median(m.plateau) - 32)).toBeLessThan(4);
  });
});
```

- [x] **Step 3: Run it. Expected: FAIL (modules missing)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/engine/capture-match.test.ts test/datasets/vitaldb.test.ts`

- [x] **Step 4: Write `packages/validation/src/engine/capture.ts`**

```ts
// Headless engine capture for the harness: run @pme/engine-core in Node with a fixed seed and scripted commands,
// return the requested channels at their native rates plus every event. Yields to the event loop once per
// sim-minute (the CI rule from docs/RESUME.md) so long captures never starve a Vitest worker.
import { createEngine, type ChannelId, type Command, type EngineEvent, type EngineOptions, type MonitorEngine } from '@pme/engine-core';

export interface Capture {
  engine: MonitorEngine;
  events: EngineEvent[];
  /** Channel samples for sim time [fromS, toS), at `rate` Hz. */
  channels: Partial<Record<ChannelId, { fs: number; x: Float64Array }>>;
  fromS: number;
  toS: number;
}

let n = 0;
export const cmd = (body: Record<string, unknown>): Command => ({ id: `v${++n}`, issuedBy: 'validation', ...body }) as Command;
export const clinical = (event: Record<string, unknown>): Command => cmd({ type: 'applyEvent', event });

export async function capture(o: {
  engine: EngineOptions;
  /** Commands dispatched at sim time t (s). */
  script?: Array<{ t: number; cmd: Command }>;
  channels: ChannelId[];
  fromS: number;
  toS: number;
}): Promise<Capture> {
  const engine = createEngine(o.engine);
  const events: EngineEvent[] = [];
  engine.on((e) => events.push(e));
  const script = [...(o.script ?? [])].sort((a, b) => a.t - b.t);
  const channels: Capture['channels'] = {};
  for (const ch of o.channels) {
    const fs = engine.sampleRate(ch);
    channels[ch] = { fs, x: new Float64Array(Math.round((o.toS - o.fromS) * fs)) };
  }
  // The engine keeps 120 s per channel (BUFFER_SECONDS), so samples are copied out after every ≤ 20 s chunk.
  const LOOKAHEAD_S = 0.2;
  let read = o.fromS;
  const drain = (upTo: number) => {
    const to = Math.min(o.toS, upTo);
    if (to <= read) return;
    for (const ch of o.channels) {
      const c = channels[ch] as { fs: number; x: Float64Array };
      const i0 = Math.round((read - o.fromS) * c.fs);
      const i1 = Math.round((to - o.fromS) * c.fs);
      const buf = new Float32Array(i1 - i0);
      engine.readSamples(ch, Math.round(o.fromS * c.fs) + i0, buf);
      c.x.set(buf, i0);
    }
    read = to;
  };
  let k = 0;
  let t = 0;
  let sinceYield = 0;
  while (t < o.toS + LOOKAHEAD_S) {
    const next = Math.min(o.toS + LOOKAHEAD_S, t + 20, script[k]?.t ?? Infinity);
    engine.advanceTo(next);
    sinceYield += next - t;
    t = next;
    while (k < script.length && (script[k] as { t: number }).t <= t + 1e-9) engine.dispatch((script[k++] as { cmd: Command }).cmd);
    drain(t - LOOKAHEAD_S);
    if (sinceYield >= 60) {
      sinceYield = 0;
      await new Promise<void>((r) => setImmediate(r));
    }
  }
  return { engine, events, channels, fromS: o.fromS, toS: o.toS };
}
```

- [x] **Step 5: Write `packages/validation/src/engine/match.ts`**

```ts
// An engine run matched to a recorded analysis window (decision 5): same HR, SBP/DBP, arterial site, ventilator
// RR/VT/PEEP (ventilation event at t = 0), EtCO2 (setTarget AFTER the ventilation event — an etco2 baseline target is
// overridden by the ventilation start, measured while planning), NIBP auto every minute, 180 s warm-up.
import type { EngineEvent, NumericId } from '@pme/engine-core';
import type { AnalysisWindow, Signals } from '../datasets/signals.ts';
import { capture, clinical, cmd, type Capture } from './capture.ts';

export const WARMUP_S = 180; // the etco2 calibration settles in ≈ 2–3 min (planning: 36 vs target 33 after 60 s)

export function numericSeries(ev: EngineEvent[], id: NumericId, fromS: number, toS: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const e of ev) {
    if (e.type !== 'measurement' || e.t < fromS || e.t >= toS) continue;
    const m = e.values[id];
    if (m && m.value !== null && m.flag === 'valid') out.push([e.t - fromS, m.value]);
  }
  return out;
}

export async function matchedRun(w: AnalysisWindow, seed: number): Promise<{ signals: Signals; cap: Capture }> {
  const len = w.toS - w.fromS;
  const site = w.site === 'femoral' ? 'femoral' : 'leftRadial';
  const script = [
    { t: 0, cmd: cmd({ type: 'attachSensor', sensor: 'abp', state: 'connected', site }) },
    { t: 0, cmd: cmd({ type: 'device', action: { device: 'nibp', action: 'auto', intervalMin: 1 } }) },
  ];
  if (w.vent) script.push({ t: 0, cmd: clinical({ kind: 'ventilation', source: 'ventilator', rr: w.vent.rr, vtMl: w.vent.vtMl, peep: w.vent.peep, fio2: 0.5 }) });
  if (w.etco2 !== null) script.push({ t: 1, cmd: cmd({ type: 'setTarget', variable: 'etco2', value: Math.round(w.etco2) }) });
  const cap = await capture({
    engine: {
      seed,
      patient: {
        ...(w.ageY !== null ? { ageY: w.ageY } : {}), ...(w.sex !== null ? { sex: w.sex } : {}),
        baseline: { hr: Math.round(w.hr), sbp: Math.round(w.sbp), dbp: Math.round(w.dbp) },
        sensors: { ecg: 'on', abp: 'connected', spo2: 'on', nibp: 'on', co2: 'on' },
      },
    },
    script, channels: ['ecgII', 'abp', 'pleth', 'co2'], fromS: WARMUP_S, toS: WARMUP_S + len,
  });
  const ch = cap.channels;
  const inspirations = cap.events.filter((e) => e.type === 'breath' && e.t >= WARMUP_S && e.t < WARMUP_S + len).map((e) => (e as { t: number }).t - WARMUP_S);
  const num = (id: NumericId) => numericSeries(cap.events, id, WARMUP_S, WARMUP_S + len);
  return {
    cap,
    signals: {
      ...(ch.ecgII ? { ecg: ch.ecgII } : {}), ...(ch.abp ? { abp: ch.abp } : {}), site: w.site, ...(ch.pleth ? { pleth: ch.pleth } : {}),
      ...(ch.co2 ? { co2: ch.co2 } : {}), co2Calibrated: true, inspirations,
      numerics: { hr: num('hr'), abpMean: num('abpMean'), nibpMean: num('nibpMean'), etco2: num('etco2') },
    },
  };
}
```

- [x] **Step 6: Write `packages/validation/src/metrics/window-metrics.ts`**

```ts
// All morphology/device metrics of one analysis window, from one Signals bundle — recorded or generated (decision 3).
import type { Signals } from '../datasets/signals.ts';
import { pulseBeats, type PulseBeat } from './abp.ts';
import { capnoAngles } from './capno.ts';
import { hrAveragingError, nibpVsAbp } from './device.ts';
import { detectR } from './ecg.ts';
import { ppgAbp } from './ppg.ts';
import { respVariation, type RespVariation } from './resp-variation.ts';

export interface WindowMetrics {
  hr: number;
  beats: number;
  rToFootMs: number[];
  footToPeakMs: number[];
  rToNotchMs: number[];
  notchDepth: number[];
  notchMinimumFrac: number;
  upstrokeSlope: number[];
  sys: number[];
  dia: number[];
  alpha: number[];
  slopeIII: number[];
  plateau: number[];
  co2Calibrated: boolean;
  resp: RespVariation | null;
  ppgDelayMs: number[];
  ppgShapeR: number;
  ppgCountRatio: number;
  hrErr: number[];
  nibpMinusAbp: number[];
}

export function computeWindowMetrics(s: Signals): WindowMetrics {
  const rS = s.ecg ? detectR(s.ecg.x, s.ecg.fs).map((i) => i / (s.ecg as { fs: number }).fs) : [];
  const beats: PulseBeat[] = s.abp ? pulseBeats(s.abp.x, s.abp.fs, rS) : [];
  const ok = beats.filter((b) => b.foot - b.r > 0 && b.foot - b.r < 0.4);
  const withNotch = ok.filter((b) => b.notch !== undefined);
  const breaths = s.co2 ? capnoAngles(s.co2.x, s.co2.fs) : [];
  const ppg = s.abp && s.pleth && rS.length > 4 ? ppgAbp(s.abp, s.pleth, rS, beats) : null;
  const rr = rS.slice(1).map((t, i) => t - (rS[i] as number)).sort((a, b) => a - b);
  return {
    hr: rr.length ? 60 / (rr[Math.floor(rr.length / 2)] as number) : Number.NaN,
    beats: ok.length,
    rToFootMs: ok.map((b) => 1000 * (b.foot - b.r)),
    footToPeakMs: ok.map((b) => 1000 * (b.peak - b.foot)),
    rToNotchMs: withNotch.map((b) => 1000 * ((b.notch as number) - b.r)),
    notchDepth: withNotch.map((b) => b.notchDepth as number),
    notchMinimumFrac: ok.length ? ok.filter((b) => b.notchKind === 'minimum').length / ok.length : Number.NaN,
    upstrokeSlope: ok.map((b) => b.slope),
    sys: ok.map((b) => b.sys),
    dia: ok.map((b) => b.dia),
    alpha: breaths.map((b) => b.alpha),
    slopeIII: breaths.map((b) => b.slopeIII),
    plateau: breaths.map((b) => b.plateau),
    co2Calibrated: s.co2Calibrated ?? false,
    resp: s.inspirations && s.inspirations.length > 3 ? respVariation(ok, s.inspirations) : null,
    ppgDelayMs: ppg?.delayMs ?? [],
    ppgShapeR: ppg?.shapeR ?? Number.NaN,
    ppgCountRatio: ppg?.countRatio ?? Number.NaN,
    hrErr: hrAveragingError(s.numerics.hr ?? [], rS),
    nibpMinusAbp: nibpVsAbp(s.numerics.nibpMean ?? [], ok),
  };
}
```

- [x] **Step 7: Run the tests. Expected: PASS (3 + 6 tests, ≈ 2 s)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/engine/capture-match.test.ts test/datasets/vitaldb.test.ts`

- [x] **Step 8: Commit**

```bash
git add packages/validation/src/engine packages/validation/src/metrics/window-metrics.ts packages/validation/src/datasets/vitaldb.ts packages/validation/test/engine packages/validation/test/datasets/vitaldb.test.ts
git commit -m "feat(validation): headless chunked capture, matched engine runs, per-window metric bundle"
git push
```

---

### Task 11: Morphology suite — evidence bands, recorded-vs-engine grading, PTB-XL intervals

**Files:**
- Create: `packages/validation/src/morphology/bands.ts`, `packages/validation/src/morphology/suite.ts`, `packages/validation/src/morphology/intervals-suite.ts`
- Create: `packages/validation/src/segments/types.ts`, `packages/validation/src/segments/grade.ts` (the R40 grader; the suite reuses it so both suites grade identically — Task 12 adds the runner that uses them too)
- Test: `packages/validation/test/morphology/suite.test.ts`, `packages/validation/test/segments/grade.test.ts`

**Interfaces:**
- Consumes: Tasks 6 (`readManifest`), 4–5 (loaders), 9 (`intervalsOf`), 10 (`matchedRun`, `computeWindowMetrics`).
- Produces: `interface MetricBand { id; metric; unit; kind: 'absolute'|'deltaToRecorded'|'ratioToRecorded'; min; max; source }`; `BANDS`; `HR_BINS`; `hrBin(hr)`; `interface MorphRow { band; metric; group; recorded: Dist|null; engine: Dist; ks; w1; engineStat; expected; grade; errPct; source }`; `interface WindowPair { window; recorded; engine; wallMs }`; `series(m, metric)`; `gradeBand(band, pairs, group): MorphRow | null`; `measurePairs(o: SuiteOptions): Promise<WindowPair[]>`; `gradePairs(pairs, fills?): MorphRow[]`; `ptbxlIntervals(cache, n=100)`, `engineIntervals(seeds?)`, `intervalFills(ref)`; segments: `type Grade = 'green'|'yellow'|'red'`, `Target`, `Segment`, `ValidationDoc`, `TargetResult`, `gradeTarget(t, measured, ctx): { errPct; grade; pass; expected }`, `GREEN_PCT = 10`, `YELLOW_PCT = 30`, `resolveRef`.

**Measured while planning** (3 VitalDB cases × 2 windows — 1885, 3101, 1341 — plus MGH/MF mgh001–003; seed 11; 9 windows in 80 s; this IS the shape of the first report):

| Band | Group | Recorded median [IQR] | Engine median [IQR] | Expected | Grade |
|---|---|---|---|---|---|
| V1 R→foot | HR 70–90 | 160 [155–165] ms | 158 [157–159] | 140–180 | green |
| V1 R→foot | HR 90–110 | 157 [145–166] | 150 [149–152] | 137–177 | green |
| V2 R→notch | HR 70–90 | 466 [442–524] | 458 [452–462] | 446–486 | green |
| V2 R→notch | HR 90–110 | 464 [371–492] | 412 [406–418] | 444–484 | **yellow** (−52 ms) |
| V2 notch depth | all | 0.67 [0.47–0.81] | 0.83 [0.80–0.86] | 0.52–0.82 | yellow |
| V2 true-minimum share | all | 0.21 | 1.00 | −0.09–0.51 | **red** |
| Upstroke dP/dt ratio | all | 795 mmHg/s | 915 | ×0.7–1.3 | green |
| PWDB foot→peak | all | 84 ms | 80 [77–84] | 94–140 (PWDB radial p10–p90) | yellow |
| V3 PPG delay | all | 398 (device latency) | 98 [94–106] | 20–100 | green (edge) |
| V3 PPG/ABP shape r | all | 0.94 | 0.76 | ≥ 0.8 | yellow |
| V4 α | VitalDB | 108 [106–112]° | 106 [102–106]° | 100–110 | green |
| PPV (matched ventilator) | VitalDB | 8.8 % | 16 % | 5.8–11.8 | **red** |
| SPV | VitalDB | 6.8 mmHg | 16 | 3.8–9.8 | **red** |
| HR averaging |err| | all | 2.1 bpm (recorded monitor) | 0.3 | 0–2 | green |
| NIBP − ABP MAP | all | −11 mmHg (recorded, before the repeat fix) | +0.6 | ±5 | green |

PTB-XL (100 NORM records, lead II, same `intervalsOf`) p10/p50/p90 vs engine (HR 60/75/90/100 × 3 seeds): PR 140/176/216 vs 208/214/222 ms (engine at the p90 edge); QRS 44/54/76 vs 50/62/64; QT 314/346/387 vs 316/342/374; QTcF 339/366/396 vs 374/378/380. Readings: the engine's respiratory variation is ≈ 2× the recordings' at matched ventilator settings; its dicrotic notch is always a deep true minimum (recordings: a shallow inflection in ≈ 80 % of radial beats); its PPG pulse is less arterial-shaped than the finger's; its PR (P-onset) sits late. All are calibration-queue items, not harness bugs.

- [x] **Step 1: Write the failing tests**

`packages/validation/test/segments/grade.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { gradeTarget } from '../../src/segments/grade.ts';
import type { Target } from '../../src/segments/types.ts';

const ctx = { segValue: (id: string) => (id === 'base' ? 80 : Number.NaN) };
const T = (t: Partial<Target> & Pick<Target, 'type'>): Target => ({ id: 'x', series: 'state:hr', reduce: 'mean', source: 'test', ...t }) as Target;

describe('R40 grading: green < 10 %, yellow 10–30 %, red ≥ 30 %; a band replaces the green zone', () => {
  it('EqualTo', () => {
    expect(gradeTarget(T({ type: 'EqualTo', value: 100 }), 108, ctx).grade).toBe('green');
    expect(gradeTarget(T({ type: 'EqualTo', value: 100 }), 115, ctx).grade).toBe('yellow');
    expect(gradeTarget(T({ type: 'EqualTo', value: 100 }), 131, ctx)).toMatchObject({ grade: 'red', pass: false });
  });
  it('Range: inside is green whatever its width; outside graded by distance to the nearer edge', () => {
    expect(gradeTarget(T({ type: 'Range', min: 100, max: 110 }), 104, ctx)).toMatchObject({ grade: 'green', errPct: 0 });
    expect(gradeTarget(T({ type: 'Range', min: 100, max: 110 }), 115.7, ctx).grade).toBe('yellow');
    expect(gradeTarget(T({ type: 'Range', min: 100, max: 110 }), 60, ctx).grade).toBe('red');
  });
  it('GreaterThan / LessThan, including a reference to another segment × factor', () => {
    expect(gradeTarget(T({ type: 'GreaterThan', value: { segment: 'base', factor: 1.3 } }), 110, ctx).grade).toBe('green');
    expect(gradeTarget(T({ type: 'GreaterThan', value: { segment: 'base', factor: 1.3 } }), 100, ctx).grade).toBe('yellow');
    expect(gradeTarget(T({ type: 'LessThan', value: 20 }), 30, ctx).grade).toBe('red');
  });
  it('TrendsTo needs the end closer than the start and within tolPct', () => {
    expect(gradeTarget(T({ type: 'TrendsTo', value: 122 }), 120, { ...ctx, firstMeasured: 80 }).grade).toBe('green');
    expect(gradeTarget(T({ type: 'TrendsTo', value: 122 }), 70, { ...ctx, firstMeasured: 80 }).grade).toBe('red');
  });
  it('a missing measurement is red', () => {
    expect(gradeTarget(T({ type: 'EqualTo', value: 1 }), Number.NaN, ctx)).toMatchObject({ grade: 'red', pass: false });
  });
});
```

`packages/validation/test/morphology/suite.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BANDS, hrBin } from '../../src/morphology/bands.ts';
import { gradeBand, gradePairs, type WindowPair } from '../../src/morphology/suite.ts';
import type { WindowMetrics } from '../../src/metrics/window-metrics.ts';
import type { AnalysisWindow } from '../../src/datasets/signals.ts';

const M = (o: Partial<WindowMetrics>): WindowMetrics => ({
  hr: 80, beats: 3, rToFootMs: [], footToPeakMs: [], rToNotchMs: [], notchDepth: [], notchMinimumFrac: 1, upstrokeSlope: [], sys: [], dia: [],
  alpha: [], slopeIII: [], plateau: [], co2Calibrated: true, resp: null, ppgDelayMs: [], ppgShapeR: Number.NaN, ppgCountRatio: Number.NaN, hrErr: [], nibpMinusAbp: [], ...o,
});
const W: AnalysisWindow = { source: 'vitaldb', record: 'x', fromS: 0, toS: 300, site: 'radial', hr: 80, sbp: 120, dbp: 70, etco2: 35, vent: null, ageY: 50, sex: 'M', tags: [] };
const pair = (rec: Partial<WindowMetrics>, eng: Partial<WindowMetrics>): WindowPair => ({ window: W, recorded: M(rec), engine: M(eng), wallMs: 0 });
const band = (id: string) => BANDS.find((b) => b.id === id) as (typeof BANDS)[number];

describe('morphology grading (R40 grades on evidence bands)', () => {
  it('V1 is graded against the recorded median ± 20 ms', () => {
    expect(gradeBand(band('V1'), [pair({ rToFootMs: [160, 162, 158] }, { rToFootMs: [170, 171, 169] })], 'HR 70–90')?.grade).toBe('green');
    expect(gradeBand(band('V1'), [pair({ rToFootMs: [160, 162, 158] }, { rToFootMs: [190, 191, 189] })], 'HR 70–90')?.grade).toBe('yellow');
  });
  it('absolute bands ignore the recording (V4 α 100–110°)', () => {
    const r = gradeBand(band('V4'), [pair({ alpha: [116, 115] }, { alpha: [105, 106] })], 'all');
    expect(r).toMatchObject({ grade: 'green', expected: '100–110' });
    expect(r?.recorded?.median).toBe(115.5);
  });
  it('ratio bands (upstroke ×0.7–1.3): ×1.5 misses by 15 % → yellow', () => {
    expect(gradeBand(band('upstroke'), [pair({ upstrokeSlope: [800] }, { upstrokeSlope: [1200] })], 'all')?.grade).toBe('yellow');
  });
  it('MGH/MF α is not compared (uncalibrated CO2, decision 11); bands without limits are skipped until filled', () => {
    const p = { ...pair({ alpha: [97], co2Calibrated: false }, { alpha: [106] }), window: { ...W, source: 'mghdb' as const } };
    expect(gradeBand(band('V4-rec'), [p], 'mghdb')).toBeNull();
    expect(gradeBand(band('pwdb-rise'), [pair({ footToPeakMs: [80] }, { footToPeakMs: [80] })], 'all')).toBeNull();
    expect(gradePairs([pair({ footToPeakMs: [100] }, { footToPeakMs: [80] })], { 'pwdb-rise': { min: 94, max: 140 } }).find((r) => r.band === 'pwdb-rise')?.grade).toBe('yellow');
  });
  it('V1/V2 rows are per HR bin', () => {
    expect(hrBin(58)).toBe('HR 50–70');
    const rows = gradePairs([pair({ rToFootMs: [160] }, { rToFootMs: [161] })]);
    expect(rows.filter((r) => r.band === 'V1').map((r) => r.group)).toEqual(['HR 70–90']);
  });
});
```

- [x] **Step 2: Run them. Expected: FAIL (modules missing)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/segments/grade.test.ts test/morphology/suite.test.ts`

- [x] **Step 3: Write `packages/validation/src/segments/types.ts`**

```ts
// `pme-validation/1` — segment validation documents (R40 borrow #1; method after Pulse's segment validation,
// re-implemented, no code copied — NOTICES N-P01/N-P02). A document runs one `pme-scenario/1` scenario headless,
// cuts the run into time segments and checks typed targets on any series the run produced.
import type { DocCommand } from '@pme/controller/scenario';

/** `state:<StateVar>` (1 Hz truth; derived `state:map`, `state:pp`), `numeric:<NumericId>` (displayed, valid only),
 *  `breath:etco2True` (per breath), `alarm:<id>` (1 raised / 0 otherwise), `scenario` (entry into `stateId`),
 *  `event:<type>` (one point per event). */
export type SeriesRef = string;
/** firstTBelow/firstTAbove: seconds after the segment start until the series first crosses `threshold`. */
export type Reduce = 'mean' | 'min' | 'max' | 'first' | 'last' | 'firstT' | 'count' | 'firstTBelow' | 'firstTAbove';
export type Ref = number | { segment: string; factor?: number; offset?: number };

export type Target = {
  id: string;
  series: SeriesRef;
  reduce: Reduce;
  /** Evidence row this target encodes (tables §7 check, gate acceptance, R39 item…). Printed in the report. */
  source: string;
  /** For `scenario`: the state whose entry time is measured. */
  stateId?: string;
  /** For firstTBelow / firstTAbove. */
  threshold?: number;
} & (
  | { type: 'EqualTo'; value: Ref; tolPct?: number }
  | { type: 'GreaterThan'; value: Ref }
  | { type: 'LessThan'; value: Ref }
  | { type: 'Range'; min: Ref; max: Ref }
  /** The segment's last 10 % approaches `value` (closer than the first 10 %) and ends within tolPct (default 10). */
  | { type: 'TrendsTo'; value: Ref; tolPct?: number }
);

export interface Segment {
  id: string;
  fromS: number;
  toS: number;
  targets: Target[];
}

export interface ValidationDoc {
  schema: 'pme-validation/1';
  id: string;
  title: string;
  /** A built-in scenario id (packages/controller/scenarios) or an inline pme-scenario/1 document. */
  scenario: string | Record<string, unknown>;
  seed?: number;
  durationS: number;
  /** Timed actions on top of the scenario: commands (as in a scenario document) or manual transition triggers. */
  actions?: Array<{ t: number; command?: DocCommand; trigger?: string }>;
  segments: Segment[];
  /** Informational: the stages whose modules the document needs (e.g. ["7a", "7g"]). */
  requires?: string[];
}

export type Grade = 'green' | 'yellow' | 'red';
export interface TargetResult {
  doc: string;
  segment: string;
  target: string;
  type: Target['type'];
  series: string;
  source: string;
  measured: number;
  expected: string;
  errPct: number;
  grade: Grade;
  pass: boolean;
}

/** A command the engine refused because a later stage owns it: the whole document is "not measurable" (decision 8). */
export interface Unsupported { t: number; type: string; reason: string }
```

- [x] **Step 4: Write `packages/validation/src/segments/grade.ts`**

```ts
// Target grading (R40 borrow #1). errPct = 0 when the target holds, else the distance to the nearest satisfying
// value as a percentage of that value's magnitude. Grades: green = target holds (for EqualTo/TrendsTo: within
// tolPct, default 10 %); yellow = misses by < 30 %; red = misses by ≥ 30 % (or the measurement is missing).
// An evidence band (Range) replaces the 10 % green zone: the band IS the tolerance (R37/R39).
// Gating: red fails `pnpm validate`; yellow is reported and goes to the calibration queue, as red does.
import type { Grade, Ref, Target } from './types.ts';

export const YELLOW_PCT = 30;
export const GREEN_PCT = 10;

export function resolveRef(r: Ref, segValue: (segment: string) => number): number {
  if (typeof r === 'number') return r;
  return segValue(r.segment) * (r.factor ?? 1) + (r.offset ?? 0);
}

const rel = (d: number, ref: number) => (100 * Math.abs(d)) / Math.max(Math.abs(ref), 1e-9);

export function gradeTarget(t: Target, measured: number, ctx: { segValue: (segment: string) => number; firstMeasured?: number }): { errPct: number; grade: Grade; pass: boolean; expected: string } {
  const R = (r: Ref) => resolveRef(r, ctx.segValue);
  let err: number;
  let holds: boolean;
  let expected: string;
  switch (t.type) {
    case 'EqualTo': {
      const v = R(t.value);
      err = rel(measured - v, v);
      holds = err <= (t.tolPct ?? GREEN_PCT);
      expected = `= ${fmt(v)} ±${t.tolPct ?? GREEN_PCT} %`;
      break;
    }
    case 'GreaterThan': {
      const v = R(t.value);
      holds = measured > v;
      err = holds ? 0 : rel(v - measured, v);
      expected = `> ${fmt(v)}`;
      break;
    }
    case 'LessThan': {
      const v = R(t.value);
      holds = measured < v;
      err = holds ? 0 : rel(measured - v, v);
      expected = `< ${fmt(v)}`;
      break;
    }
    case 'Range': {
      const lo = R(t.min);
      const hi = R(t.max);
      holds = measured >= lo && measured <= hi;
      err = holds ? 0 : measured < lo ? rel(lo - measured, lo) : rel(measured - hi, hi);
      expected = `${fmt(lo)}–${fmt(hi)}`;
      break;
    }
    case 'TrendsTo': {
      const v = R(t.value);
      const start = ctx.firstMeasured ?? Number.NaN;
      const closer = !(Math.abs(measured - v) > Math.abs(start - v));
      err = rel(measured - v, v);
      holds = closer && err <= (t.tolPct ?? GREEN_PCT);
      if (!closer) err = Math.max(err, YELLOW_PCT); // moving away is never better than yellow
      expected = `→ ${fmt(v)} ±${t.tolPct ?? GREEN_PCT} %`;
      break;
    }
  }
  if (!Number.isFinite(measured)) return { errPct: Number.POSITIVE_INFINITY, grade: 'red', pass: false, expected };
  const grade: Grade = holds ? 'green' : err < YELLOW_PCT ? 'yellow' : 'red';
  return { errPct: holds ? 0 : err, grade, pass: grade !== 'red', expected };
}

const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2));
```

- [x] **Step 5: Write `packages/validation/src/morphology/bands.ts`**

```ts
// Pass criteria for the recorded-vs-engine morphology suite. Evidence bands first (R37/R39: the band IS the test);
// where the brief gives a rule relative to the recording (V1/V2 "±20 ms of the VitalDB median"), the band is built
// around the recorded statistic at run time. [ENG] rows are engineering tolerances awaiting Ali's calibration pass.
export type BandKind = 'absolute' | 'deltaToRecorded' | 'ratioToRecorded';

export interface MetricBand {
  id: string;
  metric: string;
  unit: string;
  kind: BandKind;
  min: number;
  max: number;
  source: string;
}

export const BANDS: MetricBand[] = [
  { id: 'V1', metric: 'rToFootMs', unit: 'ms', kind: 'deltaToRecorded', min: -20, max: 20, source: 'brief §9 V1: median within ±20 ms of the VitalDB median per HR bin [ENG]' },
  { id: 'V1-lit', metric: 'rToFootMs', unit: 'ms', kind: 'absolute', min: 150, max: 220, source: 'research 03 §2.1: R → radial upstroke 150–220 ms' },
  { id: 'V2', metric: 'rToNotchMs', unit: 'ms', kind: 'deltaToRecorded', min: -20, max: 20, source: 'brief §9 V2: ±20 ms' },
  { id: 'V2-depth', metric: 'notchDepth', unit: '', kind: 'deltaToRecorded', min: -0.15, max: 0.15, source: '[ENG] notch depth within ±0.15 of the recording' },
  { id: 'V2-kind', metric: 'notchMinimumFrac', unit: '', kind: 'deltaToRecorded', min: -0.3, max: 0.3, source: '[ENG] share of beats with a true notch minimum within ±0.3 of the recording' },
  { id: 'upstroke', metric: 'upstrokeSlope', unit: '×', kind: 'ratioToRecorded', min: 0.7, max: 1.3, source: '[ENG] max dP/dt within ×0.7–1.3 of the recording at matched pressures' },
  { id: 'pwdb-rise', metric: 'footToPeakMs', unit: 'ms', kind: 'absolute', min: Number.NaN, max: Number.NaN, source: 'PWDB radial foot→systolic peak p10–p90 at the patient age (filled at run time)' },
  { id: 'V3-delay', metric: 'ppgDelayMs', unit: 'ms', kind: 'absolute', min: 20, max: 100, source: 'brief §9 V3 / research 03 §3.1: PPG foot − ABP foot 20–100 ms (recorded VitalDB delay is device-latency-contaminated, report only)' },
  { id: 'V3-shape', metric: 'ppgShapeR', unit: 'r', kind: 'absolute', min: 0.8, max: 1, source: 'brief §9 V3: r ≥ 0.8 [ENG]' },
  { id: 'V3-count', metric: 'ppgCountRatio', unit: '', kind: 'absolute', min: 0.98, max: 1.02, source: 'brief §9 V3: PR = HR in sinus' },
  { id: 'V4', metric: 'alpha', unit: '°', kind: 'absolute', min: 100, max: 110, source: 'R39 item 6: normal α 105° (100–110) on the 25 mmHg/s axis' },
  { id: 'V4-rec', metric: 'alpha', unit: '°', kind: 'deltaToRecorded', min: -5, max: 5, source: '[ENG] α within ±5° of the VitalDB (sidestream, Primus) recording' },
  { id: 'PPV', metric: 'ppvPct', unit: '% points', kind: 'deltaToRecorded', min: -3, max: 3, source: '[ENG] PPV within ±3 points of the recording at matched ventilator settings' },
  { id: 'SPV', metric: 'spvMmHg', unit: 'mmHg', kind: 'deltaToRecorded', min: -3, max: 3, source: '[ENG] SPV within ±3 mmHg of the recording' },
  { id: 'HR-avg', metric: 'hrErrAbs', unit: 'bpm', kind: 'absolute', min: 0, max: 2, source: 'brief §6.1: displayed HR within 2 bpm of the 12-RR average at steady state [ENG]' },
  { id: 'NIBP-bias', metric: 'nibpMinusAbp', unit: 'mmHg', kind: 'absolute', min: -5, max: 5, source: 'Stage 2 acceptance 9 / ISO 81060-2 style: bias ≤ 5 mmHg' },
  { id: 'V5-QTc', metric: 'qtcMs', unit: 'ms', kind: 'absolute', min: Number.NaN, max: Number.NaN, source: 'PTB-XL NORM p10–p90 by the same method (filled at run time)' },
  { id: 'V5-PR', metric: 'prMs', unit: 'ms', kind: 'absolute', min: Number.NaN, max: Number.NaN, source: 'PTB-XL NORM p10–p90 by the same method (filled at run time)' },
  { id: 'V5-QRS', metric: 'qrsMs', unit: 'ms', kind: 'absolute', min: Number.NaN, max: Number.NaN, source: 'PTB-XL NORM p10–p90 by the same method (filled at run time)' },
];

/** HR bins of brief §9 V1. */
export const HR_BINS: Array<[number, number]> = [[50, 70], [70, 90], [90, 110]];
export const hrBin = (hr: number): string => {
  const b = HR_BINS.find(([lo, hi]) => hr >= lo && hr < hi);
  return b ? `HR ${b[0]}–${b[1]}` : 'HR other';
};
```

- [x] **Step 6: Write `packages/validation/src/morphology/suite.ts`**

```ts
// The recorded-vs-engine morphology suite (brief §9 V1–V5): every manifest window is measured twice with the SAME
// code — once on the recording, once on a matched engine run — then per metric and HR bin the two distributions are
// compared (median, IQR, KS D, Wasserstein-1) and the engine's statistic is graded against the band (R40 grading).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseHeader } from '../templates/wfdb.ts';
import { matchedRun } from '../engine/match.ts';
import { readManifest } from '../datasets/manifest.ts';
import { MGHDB, mghMeta, mghSignals } from '../datasets/mghdb.ts';
import type { AnalysisWindow, Signals } from '../datasets/signals.ts';
import { loadCase, vitaldbSignals, vitaldbSums } from '../datasets/vitaldb.ts';
import type { VitalFile } from '../datasets/vital.ts';
import { computeWindowMetrics, type WindowMetrics } from '../metrics/window-metrics.ts';
import { gradeTarget } from '../segments/grade.ts';
import type { Grade } from '../segments/types.ts';
import { ksD, median, quantile, wasserstein1 } from '../stats.ts';
import { BANDS, hrBin, type MetricBand } from './bands.ts';

export interface Dist { n: number; median: number; p25: number; p75: number }
export interface MorphRow {
  band: string;
  metric: string;
  group: string;
  recorded: Dist | null;
  engine: Dist;
  ks: number;
  w1: number;
  engineStat: number;
  expected: string;
  grade: Grade;
  errPct: number;
  source: string;
}
export interface WindowPair { window: AnalysisWindow; recorded: WindowMetrics; engine: WindowMetrics; wallMs: number }

const dist = (xs: number[]): Dist => ({ n: xs.filter(Number.isFinite).length, median: median(xs), p25: quantile(xs, 0.25), p75: quantile(xs, 0.75) });

/** Per-window scalar or per-beat series of a metric (per-window scalars become one-element arrays). */
export function series(m: WindowMetrics, metric: string): number[] {
  switch (metric) {
    case 'ppvPct': return m.resp ? [m.resp.ppvPct] : [];
    case 'spvMmHg': return m.resp ? [m.resp.spvMmHg] : [];
    case 'ppgShapeR': return [m.ppgShapeR];
    case 'ppgCountRatio': return [m.ppgCountRatio];
    case 'notchMinimumFrac': return [m.notchMinimumFrac];
    case 'hrErrAbs': return m.hrErr.map(Math.abs);
    case 'alpha': return m.co2Calibrated ? m.alpha : [];
    default: return ((m as unknown as Record<string, number[]>)[metric] ?? []).slice();
  }
}

/**
 * Grade one band over a group of window pairs. absolute: the engine median must lie in [min, max]; deltaToRecorded:
 * in [recorded median + min, recorded median + max]; ratioToRecorded: engine/recorded in [min, max]. errPct and the
 * green/yellow/red grade come from the segment grader (R40), so both suites grade identically.
 */
export function gradeBand(band: MetricBand, pairs: WindowPair[], group: string): MorphRow | null {
  const rec = pairs.flatMap((p) => series(p.recorded, band.metric));
  const eng = pairs.flatMap((p) => series(p.engine, band.metric));
  if (!eng.some(Number.isFinite) || !Number.isFinite(band.min) || !Number.isFinite(band.max)) return null;
  const e = median(eng);
  const r = median(rec);
  if (band.kind !== 'absolute' && !Number.isFinite(r)) return null;
  const stat = band.kind === 'ratioToRecorded' ? e / r : e;
  const [min, max] = band.kind === 'deltaToRecorded' ? [r + band.min, r + band.max] : [band.min, band.max];
  const g = gradeTarget({ id: band.id, series: band.metric, reduce: 'mean', source: band.source, type: 'Range', min, max }, stat, { segValue: () => Number.NaN });
  return {
    band: band.id, metric: band.metric, group, recorded: rec.length ? dist(rec) : null, engine: dist(eng), ks: ksD(rec, eng), w1: wasserstein1(rec, eng),
    engineStat: stat, expected: g.expected, grade: g.grade, errPct: g.errPct, source: band.source,
  };
}

export interface SuiteOptions {
  cache: string;
  seeds?: number[];
  maxWindows?: number;
  onProgress?: (msg: string) => void;
  /** Extra per-band limits filled at run time (PWDB rise times, PTB-XL intervals). */
  fills?: Record<string, { min: number; max: number }>;
}

export async function measurePairs(o: SuiteOptions): Promise<WindowPair[]> {
  const pairs: WindowPair[] = [];
  const seeds = o.seeds ?? [11];
  const vit = readManifest('vitaldb');
  const mgh = readManifest('mghdb');
  const windows = [...(vit?.windows ?? []), ...(mgh?.windows ?? [])].slice(0, o.maxWindows ?? Infinity);
  const sums = vit ? await vitaldbSums(o.cache) : new Map<string, string>();
  let caseId = '';
  let caseFile: VitalFile | null = null;
  for (const w of windows) {
    const t0 = performance.now();
    let rec: Signals;
    if (w.source === 'vitaldb') {
      if (caseId !== w.record || !caseFile) {
        caseFile = await loadCase(o.cache, w.record, sums);
        caseId = w.record;
      }
      rec = vitaldbSignals(caseFile, w);
    } else {
      const hea = readFileSync(join(o.cache, MGHDB, `${w.record}.hea`), 'latin1');
      rec = mghSignals(parseHeader(hea), mghMeta(hea), new Uint8Array(readFileSync(join(o.cache, MGHDB, `${w.record}.dat`))), w.fromS, w.toS);
    }
    const recorded = computeWindowMetrics(rec);
    // MGH windows carry the header's HR; the recorded ECG's is better for matching
    const target: AnalysisWindow = w.source === 'mghdb' ? { ...w, hr: Math.round(recorded.hr), sbp: Math.round(median(recorded.sys)), dbp: Math.round(median(recorded.dia)) } : w;
    for (const seed of seeds) {
      const engine = computeWindowMetrics((await matchedRun(target, seed)).signals);
      pairs.push({ window: target, recorded, engine, wallMs: performance.now() - t0 });
    }
    o.onProgress?.(`${w.source} ${w.record} ${w.fromS}–${w.toS}: ${(performance.now() - t0).toFixed(0)} ms`);
  }
  return pairs;
}

export function gradePairs(pairs: WindowPair[], fills: SuiteOptions['fills'] = {}): MorphRow[] {
  const rows: MorphRow[] = [];
  const groups = new Map<string, WindowPair[]>();
  for (const p of pairs) {
    for (const g of ['all', `${p.window.source}`, hrBin(p.recorded.hr)]) {
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)?.push(p);
    }
  }
  for (const b0 of BANDS) {
    const b = fills[b0.id] ? { ...b0, ...fills[b0.id] } : b0;
    // V1/V2 are graded per HR bin (brief §9); the rest over all windows, with per-source rows for information
    const gs = b.id === 'V1' || b.id === 'V2' ? [...groups.keys()].filter((g) => g.startsWith('HR ')) : ['all', 'vitaldb', 'mghdb'];
    for (const g of gs) {
      const r = gradeBand(b, groups.get(g) ?? [], g);
      if (r) rows.push(r);
    }
  }
  return rows;
}
```

- [x] **Step 7: Write `packages/validation/src/morphology/intervals-suite.ts`**

```ts
// V5: ECG intervals of PTB-XL NORM records (CC BY 4.0) vs the engine's 12-lead capture, one method (intervalsOf).
// PTB-XL: the first `n` records with "'NORM': 100.0" in scp_codes (Stage 5's selection), lead II at 500 Hz.
// Engine: capture12() lead II after 40 s at HR 60/75/90/100, seeds 1–3.
import { createEngine, capture12 } from '@pme/engine-core';
import { fetchCached } from '../templates/fetch.ts';
import { csvCells } from '../templates/compare-ptbxl.ts';
import { decode16, parseHeader } from '../templates/wfdb.ts';
import { intervalsOf, type Intervals } from '../metrics/intervals.ts';
import { quantile } from '../stats.ts';

const PROJECT = 'ptb-xl/1.0.3';
export const ENGINE_HRS = [60, 75, 90, 100];

export async function ptbxlIntervals(cache: string, n = 100): Promise<Intervals[]> {
  const td = new TextDecoder();
  const csv = td.decode(await fetchCached(cache, PROJECT, 'ptbxl_database.csv')).split(/\r?\n/);
  const head = csvCells(csv[0] as string);
  const iScp = head.indexOf('scp_codes');
  const iHr = head.indexOf('filename_hr');
  const out: Intervals[] = [];
  for (const line of csv.slice(1)) {
    if (out.length >= n) break;
    const c = csvCells(line);
    if (!(c[iScp] ?? '').includes("'NORM': 100.0")) continue;
    const f = c[iHr] as string;
    const h = parseHeader(td.decode(await fetchCached(cache, PROJECT, `${f}.hea`)));
    const sig = decode16(await fetchCached(cache, PROJECT, `${f}.dat`), h.nSignals)[1];
    const s = h.signals[1];
    if (!sig || !s) continue;
    const r = intervalsOf(Float64Array.from(sig, (v) => (v - s.baseline) / s.gain), h.fs);
    if (r && Number.isFinite(r.qtMs) && Number.isFinite(r.prMs)) out.push(r);
  }
  return out;
}

export function engineIntervals(seeds = [1, 2, 3]): Intervals[] {
  const out: Intervals[] = [];
  for (const hr of ENGINE_HRS) {
    for (const seed of seeds) {
      const e = createEngine({ seed, patient: { baseline: { hr } } });
      e.advanceTo(40);
      const r = intervalsOf(Float64Array.from(capture12(e).leads.ecgII));
      if (r) out.push(r);
    }
  }
  return out;
}

/** p10–p90 of each interval in the reference: the V5 bands (bands.ts fills). */
export function intervalFills(ref: Intervals[]): Record<string, { min: number; max: number }> {
  const b = (k: keyof Intervals) => ({ min: quantile(ref.map((r) => r[k]), 0.1), max: quantile(ref.map((r) => r[k]), 0.9) });
  return { 'V5-QTc': b('qtcMs'), 'V5-PR': b('prMs'), 'V5-QRS': b('qrsMs') };
}
```

- [x] **Step 8: Run the tests. Expected: PASS (5 + 5 tests)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/segments/grade.test.ts test/morphology/suite.test.ts`

- [x] **Step 9: Smoke-run the suite on the first two manifest windows (needs Task 6's cache). Expected: two progress lines and ≥ 20 graded rows, no exception**

```bash
cat > packages/validation/smoke-morph.ts <<'TS'
import { cacheDir } from './src/datasets/cache.ts';
import { gradePairs, measurePairs } from './src/morphology/suite.ts';
const pairs = await measurePairs({ cache: cacheDir(), maxWindows: 2, onProgress: console.log });
for (const r of gradePairs(pairs)) console.log(r.grade, r.band, r.group, r.engine.median.toFixed(1), r.expected);
TS
(cd packages/validation && npx vite-node smoke-morph.ts)
rm packages/validation/smoke-morph.ts
```

- [x] **Step 10: Commit**

```bash
git add packages/validation/src/morphology packages/validation/src/segments/types.ts packages/validation/src/segments/grade.ts packages/validation/test/morphology packages/validation/test/segments/grade.test.ts
git commit -m "feat(validation): morphology suite graded on evidence bands (V1-V5), PTB-XL interval reference, R40 grader"
git push
```

---

### Task 12: Segment-validation runner (`pme-validation/1`)

**Files:**
- Create: `packages/validation/src/segments/series.ts`, `packages/validation/src/segments/run.ts`, `packages/validation/suites/sanity/or-induction-hypotension.json`
- Modify: `packages/validation/src/segments/types.ts` (already final in Task 11: `Reduce` incl. `firstTBelow`/`firstTAbove`, `threshold`, `requires`, `Unsupported`)
- Test: `packages/validation/test/segments/run.test.ts`

**Interfaces:**
- Consumes: `ScenarioDriver`, `validateScenario`, `BUILTIN_SCENARIOS`, `DocCommand` from `@pme/controller/scenario`; `createEngine`, `Command`, `EngineEvent`; Task 11 `gradeTarget`, types.
- Produces: `class SeriesStore { series; states; push; onEvent; onScenario; reduce(name, reduce, from, to, stateId?, threshold?) }` (series names: `state:<var>` incl. derived `state:map`, `state:pp`; `numeric:<id>`; `alarm:<id>`; `event:<type>`; `scenario`); `POLL_S = 0.1`; `LATER_STAGE`; `interface DocRun { doc; measurable; unsupported; results; store; wallMs; notes }`; `runValidationDoc(doc): Promise<DocRun>`.

Measured while planning: the Stage 6b built-in `or-induction-hypotension` runs 420 s in 1.5 s (states preInduction → induction 30 s → hypotension 90 s → profound 161 s), 7 targets all green. Throughput ≈ 26 ms per simulated second with the 100 ms poll.

- [x] **Step 1: Write the document `packages/validation/suites/sanity/or-induction-hypotension.json`**

```json
{
  "schema": "pme-validation/1",
  "id": "or-induction-hypotension",
  "title": "Post-induction hypotension (Stage 6b built-in) — HR story",
  "scenario": "or-induction-hypotension",
  "seed": 5,
  "durationS": 420,
  "actions": [ { "t": 30, "trigger": "induce" } ],
  "segments": [
    { "id": "awake", "fromS": 10, "toS": 30, "targets": [
      { "id": "hr-baseline", "series": "state:hr", "reduce": "mean", "type": "EqualTo", "value": 78, "source": "scenario patient.baseline.hr 78" },
      { "id": "displayed-hr", "series": "numeric:hr", "reduce": "mean", "type": "Range", "min": 75, "max": 81, "source": "brief §6.1: displayed HR within 3 bpm of truth at steady state [ENG]" }
    ] },
    { "id": "induced", "fromS": 30, "toS": 90, "targets": [
      { "id": "enters-induction", "series": "scenario", "stateId": "induction", "reduce": "firstT", "type": "LessThan", "value": 1, "source": "manual Induce acts on the same poll (6b driver)" }
    ] },
    { "id": "hypotension", "fromS": 90, "toS": 200, "targets": [
      { "id": "enters-hypotension", "series": "scenario", "stateId": "hypotension", "reduce": "firstT", "type": "Range", "min": 0, "max": 2, "source": "scenario: afterS 60 after induction (t = 90 s)" },
      { "id": "hr-rises", "series": "state:hr", "reduce": "last", "type": "TrendsTo", "value": 122, "tolPct": 10, "source": "scenario: hr → 122 over 90 s, sigmoid" },
      { "id": "hr-above-awake", "series": "state:hr", "reduce": "max", "type": "GreaterThan", "value": { "segment": "awake", "factor": 1.3 }, "source": "reflex tachycardia ≥ 30 % above awake [ENG]" }
    ] },
    { "id": "profound", "fromS": 150, "toS": 420, "targets": [
      { "id": "enters-profound", "series": "scenario", "stateId": "profound", "reduce": "firstT", "type": "LessThan", "value": 120, "source": "scenario: HR ≥ 115 for 20 s → profound" }
    ] }
  ]
}
```

- [x] **Step 2: Write the failing test `packages/validation/test/segments/run.test.ts`**

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runValidationDoc } from '../../src/segments/run.ts';
import type { ValidationDoc } from '../../src/segments/types.ts';

describe('segment runner on the Stage 6b induction scenario', { timeout: 120_000 }, () => {
  it('drives the scenario headless and grades every target', async () => {
    const doc = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../suites/sanity/or-induction-hypotension.json'), 'utf8')) as ValidationDoc;
    const r = await runValidationDoc(doc);
    expect(r.store.states.map(([, s]) => s)).toEqual(['preInduction', 'induction', 'hypotension', 'profound']);
    expect(r.results.length).toBe(7);
    expect(r.results.filter((x) => x.grade !== 'green')).toEqual([]);
  });
});
```

- [x] **Step 3: Run it. Expected: FAIL (module `run.ts` missing)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/segments/run.test.ts`

- [x] **Step 4: Write `packages/validation/src/segments/series.ts`**

```ts
// Series recorded during a validation run, and the per-segment reductions of brief §9 / R40.
import type { EngineEvent } from '@pme/engine-core';
import type { Reduce } from './types.ts';

export type Point = [t: number, v: number];

export class SeriesStore {
  readonly series = new Map<string, Point[]>();
  /** Scenario state entries: [t, stateId]. */
  readonly states: Array<[number, string]> = [];

  push(name: string, t: number, v: number): void {
    let s = this.series.get(name);
    if (!s) this.series.set(name, (s = []));
    s.push([t, v]);
  }

  onEvent(e: EngineEvent): void {
    if (e.type === 'state') {
      for (const [k, v] of Object.entries(e.values)) if (typeof v === 'number') this.push(`state:${k}`, e.t, v);
      const { sbp, dbp } = e.values;
      if (sbp !== undefined && dbp !== undefined) {
        this.push('state:map', e.t, dbp + (sbp - dbp) / 3); // derived: brief §4.2 MAP ≈ DBP + PP/3
        this.push('state:pp', e.t, sbp - dbp);
      }
    }
    if (e.type === 'measurement') for (const [k, m] of Object.entries(e.values)) if (m && m.value !== null) this.push(`numeric:${k}`, e.t, m.value);
    if (e.type === 'alarm') this.push(`alarm:${e.id}`, e.t, e.state === 'raised' ? 1 : 0);
    if ('t' in e) this.push(`event:${e.type}`, e.t, 1);
  }

  onScenario(t: number, stateId: string): void {
    this.states.push([t, stateId]);
  }

  /** Reduce `name` over [from, to). firstT is seconds after `from`; count counts points. NaN when empty. */
  reduce(name: string, reduce: Reduce, from: number, to: number, stateId?: string, threshold?: number): number {
    if (name === 'scenario') {
      // firstT: time the scenario first ENTERS stateId inside the window
      const hit = this.states.find(([t, s]) => s === stateId && t >= from && t < to);
      return reduce === 'firstT' ? (hit ? hit[0] - from : Number.NaN) : hit ? 1 : 0;
    }
    const pts = (this.series.get(name) ?? []).filter(([t]) => t >= from && t < to);
    if (reduce === 'count') return pts.length;
    if (reduce === 'firstTBelow' || reduce === 'firstTAbove') {
      const thr = threshold ?? Number.NaN;
      const p = pts.find(([, v]) => (reduce === 'firstTBelow' ? v < thr : v > thr));
      return p ? p[0] - from : Number.NaN;
    }
    if (reduce === 'firstT') {
      const p = name.startsWith('alarm:') ? pts.find(([, v]) => v === 1) : pts[0];
      return p ? p[0] - from : Number.NaN;
    }
    if (pts.length === 0) return Number.NaN;
    const vs = pts.map(([, v]) => v);
    switch (reduce) {
      case 'mean': return vs.reduce((a, b) => a + b, 0) / vs.length;
      case 'min': return Math.min(...vs);
      case 'max': return Math.max(...vs);
      case 'first': return vs[0] as number;
      default: return vs[vs.length - 1] as number; // 'last'
    }
  }
}
```

- [x] **Step 5: Write `packages/validation/src/segments/run.ts`**

```ts
// Headless runner: one pme-validation/1 document → the scenario driven through Stage 6b's ScenarioDriver on a
// bare engine (no renderer), the series recorded, every target graded (R40). Commands the engine refuses because a
// later stage owns them ("arrives in Stage 7", "not implemented") make the document NOT MEASURABLE on this build
// (decision 8): it is listed, not graded, and does not gate.
import { createEngine, type Command, type EngineEvent } from '@pme/engine-core';
import { BUILTIN_SCENARIOS, ScenarioDriver, validateScenario } from '@pme/controller/scenario';
import { gradeTarget } from './grade.ts';
import { SeriesStore } from './series.ts';
import type { TargetResult, Unsupported, ValidationDoc } from './types.ts';

/** The driver is polled every POLL_S of sim time (a 60 fps host polls every ≈ 17 ms; 100 ms keeps runs fast) [ENG]. */
export const POLL_S = 0.1;
export const LATER_STAGE = /arrives in Stage|not implemented/i;

export interface DocRun {
  doc: ValidationDoc;
  measurable: boolean;
  unsupported: Unsupported[];
  results: TargetResult[];
  store: SeriesStore;
  wallMs: number;
  notes: string[];
}

export async function runValidationDoc(doc: ValidationDoc): Promise<DocRun> {
  const t0 = performance.now();
  const raw = typeof doc.scenario === 'string' ? BUILTIN_SCENARIOS[doc.scenario] : doc.scenario;
  if (raw === undefined) throw new Error(`${doc.id}: no built-in scenario ${String(doc.scenario)}`);
  const v = validateScenario(raw);
  if (!v.ok) throw new Error(`${doc.id}: invalid scenario: ${v.errors.join('; ')}`);
  // The body (age, size, sex, age band, baseline) is fixed when the engine is created — a scenario's setup batch only
  // sends rhythm, targets and sensors (Stage 6b runner.start), so the host builds its engine from `patient` first
  // (measured while planning: without this a 4-year-old desaturated like a room-air adult, 47 s instead of ≈ 160 s).
  const p = v.doc.patient ?? {};
  const engine = createEngine({
    seed: doc.seed ?? 1,
    patient: { ...(p.ageY !== undefined ? { ageY: p.ageY } : {}), ...(p.weightKg !== undefined ? { weightKg: p.weightKg } : {}), ...(p.heightCm !== undefined ? { heightCm: p.heightCm } : {}), ...(p.sex ? { sex: p.sex } : {}), ...(p.baseline ? { baseline: p.baseline } : {}) },
    device: { ...(p.ageBand ? { ageBand: p.ageBand } : {}), ...(v.doc.device?.skin ? { skin: v.doc.device.skin } : {}) },
  });
  const store = new SeriesStore();
  const unsupported: Unsupported[] = [];
  const listeners = new Set<(e: EngineEvent) => void>();
  engine.on((e) => {
    store.onEvent(e);
    for (const l of listeners) l(e);
  });
  const dispatch = (c: Command) => {
    const r = engine.dispatch(c);
    if (!r.accepted && LATER_STAGE.test(r.reason ?? '')) unsupported.push({ t: engine.now().simT, type: c.type === 'applyEvent' ? `applyEvent ${(c.event as { kind: string }).kind}` : c.type, reason: r.reason ?? '' });
    return r;
  };
  const driver = new ScenarioDriver({
    target: {
      dispatch,
      snapshot: () => engine.snapshot(),
      restore: (s) => engine.restore(s),
      on: (fn) => {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      now: () => engine.now(),
      time: () => {},
    },
    publish: (e) => store.onScenario(e.t, e.stateId),
  });
  const loaded = driver.load(v.doc);
  if (!loaded.ok) throw new Error(`${doc.id}: ${loaded.reason}`);
  const actions = [...(doc.actions ?? [])].sort((a, b) => a.t - b.t);
  let k = 0;
  const steps = Math.round(doc.durationS / POLL_S);
  for (let n = 1; n <= steps; n++) {
    const t = Math.round(n * POLL_S * 1000) / 1000;
    engine.advanceTo(t);
    while (k < actions.length && (actions[k] as { t: number }).t <= t + 1e-9) {
      const a = actions[k++] as NonNullable<ValidationDoc['actions']>[number];
      if (a.trigger) await driver.hook({ type: 'scenario', action: 'trigger', target: a.trigger, id: `val-${k}`, issuedBy: 'validation' } as never);
      if (a.command) driver.host.dispatch({ ...(a.command as object), id: `val-${k}`, issuedBy: 'validation' } as never);
    }
    driver.poll();
    if (unsupported.length > 0) break; // not measurable on this build: no point running on
    if (n % 600 === 0) await new Promise<void>((r) => setImmediate(r)); // yield once per sim-minute (CI rule)
  }
  driver.close();
  const segs = new Map(doc.segments.map((s) => [s.id, s]));
  const results: TargetResult[] = [];
  for (const s of doc.segments) {
    for (const tg of s.targets) {
      const measured = store.reduce(tg.series, tg.reduce, s.fromS, s.toS, tg.stateId, tg.threshold);
      const segValue = (id: string) => {
        const o = segs.get(id);
        if (!o) throw new Error(`${doc.id}: no segment ${id}`);
        return store.reduce(tg.series, tg.reduce, o.fromS, o.toS, tg.stateId, tg.threshold);
      };
      const span = s.toS - s.fromS;
      const firstMeasured = tg.type === 'TrendsTo' ? store.reduce(tg.series, 'mean', s.fromS, s.fromS + 0.1 * span) : undefined;
      const m = tg.type === 'TrendsTo' ? store.reduce(tg.series, 'mean', s.toS - 0.1 * span, s.toS) : measured;
      const g = gradeTarget(tg, m, { segValue, ...(firstMeasured !== undefined ? { firstMeasured } : {}) });
      results.push({ doc: doc.id, segment: s.id, target: tg.id, type: tg.type, series: tg.series, source: tg.source, measured: m, ...g });
    }
  }
  const measurable = unsupported.length === 0;
  return { doc, measurable, unsupported, results: measurable ? results : [], store, wallMs: performance.now() - t0, notes: [...driver.notes] };
}
```

- [x] **Step 6: Run the test. Expected: PASS (1 test, ≈ 2 s)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/segments/run.test.ts`

- [x] **Step 7: Commit**

```bash
git add packages/validation/src/segments/series.ts packages/validation/src/segments/run.ts packages/validation/suites/sanity/or-induction-hypotension.json packages/validation/test/segments/run.test.ts
git commit -m "feat(validation): headless segment-validation runner over Stage 6b scenarios (EqualTo/GreaterThan/LessThan/TrendsTo/Range)"
git push
```

---

### Task 13: The sanity set as documents (brief §4.9 V8 + tables §7 checks 10–25)

**Files:**
- Create: `packages/validation/suites/sanity/sanity-docs.ts`
- Test: `packages/validation/test/segments/sanity-docs.test.ts`

**Interfaces:**
- Consumes: Task 11/12 types; `validateScenario`, `DocCommand`.
- Produces: `SANITY_DOCS: ValidationDoc[]` (30 documents).

Measured on `6eeb6d1` (Stage 7 not merged; whole set 216 s wall): s1–s4 and every MODELED row (t10–t20, t22, t25) stop at once as **not measurable** ("MODELED mode arrives in Stage 7"). Graded: s6 preoxygenated **505 s** to SaO2 90 % (390–570, green; gate 3: 501 s); room air true **36 s** (35–60, green at the edge) and displayed **59 s** (45–90, green); s7 child **161 s** (130–190, green; Patel 160); s8 first breath after 60 s disconnection **+11.7 mmHg** (48.6 vs 36.9; +9–15, green); s9 VF: displayed ABP < 20 after **6 s** (≤ 20, green), EtCO2 < 5 after **18 s** (≤ 30, green); t21 MH EtCO2 at 10 min **76.5** (51–69, **yellow**: rises faster than the tables' 40 → 60) and still rising at 20 min (green); t23 term pregnancy **374 s** (150–240, **red** — no pregnancy physiology before 7b); t24 Edmark apnoea at FiO2 1.0/0.8/0.6 **505 / 383 / 265 s** vs 411 / 303 / 213 ±20 % (all **yellow**, 5–10 % beyond the band — no absorption atelectasis before 7b). Rows 23/24 turning red/yellow is the intended calibration signal, not a harness bug. Two planning bugs this measurement caught and the code above already fixes: the scenario setup batch does not carry the body (age/size/baseline), so `runValidationDoc` builds the engine from `patient` (a 4-year-old otherwise desaturated in 47 s like a room-air adult); and Stage 3's first-breath check measures the breath's own EtCO2 (`breath:etco2True`), not the averaged numeric.

- [x] **Step 1: Write the failing test `packages/validation/test/segments/sanity-docs.test.ts`**

```ts
import { validateScenario } from '@pme/controller/scenario';
import { describe, expect, it } from 'vitest';
import { SANITY_DOCS } from '../../suites/sanity/sanity-docs.ts';

describe('sanity documents (brief §4.9 + tables §7)', () => {
  it('cover checks 1–4, 6–9 and 10–25 with unique ids', () => {
    const ids = SANITY_DOCS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const k of ['s1', 's2', 's3', 's4', 's6', 's7', 's8', 's9', ...Array.from({ length: 16 }, (_, i) => `t${i + 10}`)]) expect(ids.some((i) => i.startsWith(`${k}-`) || i.startsWith(k))).toBe(true);
  });
  it('every inline scenario passes the pme-scenario/1 schema', () => {
    for (const d of SANITY_DOCS) {
      const v = validateScenario(d.scenario);
      expect(v.ok ? [] : v.errors, d.id).toEqual([]);
    }
  });
  it('every target sits inside the run and names its source', () => {
    for (const d of SANITY_DOCS) for (const s of d.segments) {
      expect(s.toS).toBeLessThanOrEqual(d.durationS);
      for (const t of s.targets) expect(t.source.length).toBeGreaterThan(5);
    }
  });
});
```

- [x] **Step 2: Run it. Expected: FAIL (module missing)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/segments/sanity-docs.test.ts`

- [x] **Step 3: Write `packages/validation/suites/sanity/sanity-docs.ts`**

```ts
// The physiology sanity set as pme-validation/1 documents (brief §4.9 checks 1–9 = V8; tables
// docs/physiology/stage-7-parameter-tables.md §7 checks 10–25; R39 bands). Built by helpers so each row reads as
// its source sentence. Checks that need Stage 7 modules (drugs, bleeding, conditions, MODELED mode) are NOT
// MEASURABLE on a build without them (the engine refuses the command, decision 8) and become live as 7a–7g merge.
// Default tolerance for a stated change is ±15 % (tables §7 header) [ENG]; stated ranges are used as Range targets.
import type { DocCommand } from '@pme/controller/scenario';
import type { Segment, Target, ValidationDoc } from '../../src/segments/types.ts';

type Ev = Record<string, unknown>;
const ev = (event: Ev): DocCommand => ({ type: 'applyEvent', event } as DocCommand);
const at = (t: number, command: DocCommand) => ({ t, command });
const ADULT = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175, ageBand: 'adult' as const };
const SENSORS = { ecg: 'on', spo2: 'on', abp: 'connected', co2: 'on' };

function doc(o: {
  id: string; title: string; source: string; durationS: number; requires?: string[];
  mode?: 'manual' | 'modeled'; patient?: Record<string, unknown>; baseline?: Record<string, number>;
  actions: Array<{ t: number; command: DocCommand }>; segments: Segment[];
}): ValidationDoc {
  // Stage 7 profile fields (conditions, pregnancyWeeks) are not in pme-scenario/1 yet: they travel in `notes` until
  // the R22 profile schema lands, and the document says which stages it needs.
  const { conditions, pregnancyWeeks, ...patient } = (o.patient ?? {}) as Record<string, unknown>;
  const profile = [conditions ? `conditions ${JSON.stringify(conditions)}` : '', pregnancyWeeks ? `pregnancy ${String(pregnancyWeeks)} weeks` : ''].filter(Boolean).join('; ');
  return {
    schema: 'pme-validation/1', id: o.id, title: o.title, seed: 1, durationS: o.durationS,
    ...(o.requires ? { requires: o.requires } : {}),
    scenario: {
      schema: 'pme-scenario/1', id: `val-${o.id}`, title: o.title, ...(o.mode ? { mode: o.mode } : {}), ...(profile ? { notes: `R22 profile: ${profile}` } : {}),
      patient: { ...ADULT, sensors: SENSORS, baseline: { hr: 75, sbp: 120, dbp: 70, ...o.baseline }, ...patient },
      initialState: 'run', states: [{ id: 'run', notes: o.source }],
    },
    actions: o.actions,
    segments: o.segments,
  };
}
const seg = (id: string, fromS: number, toS: number, ...targets: Target[]): Segment => ({ id, fromS, toS, targets });
const rng = (id: string, series: string, reduce: Target['reduce'], min: number | { segment: string; factor?: number; offset?: number }, max: number | { segment: string; factor?: number; offset?: number }, source: string, extra: Partial<Target> = {}): Target => ({ id, series, reduce, type: 'Range', min, max, source, ...extra }) as Target;
const gt = (id: string, series: string, reduce: Target['reduce'], value: number | { segment: string; factor?: number; offset?: number }, source: string): Target => ({ id, series, reduce, type: 'GreaterThan', value, source });
const lt = (id: string, series: string, reduce: Target['reduce'], value: number | { segment: string; factor?: number; offset?: number }, source: string): Target => ({ id, series, reduce, type: 'LessThan', value, source });
const base = (id = 'base', fromS = 30, toS = 60) => seg(id, fromS, toS, rng('steady-map', 'state:map', 'mean', 60, 110, 'baseline MAP physiological [ENG]'));

const S = 'brief §4.9';
const T7 = 'tables §7';

export const SANITY_DOCS: ValidationDoc[] = [
  // --- brief §4.9 (V8) ---------------------------------------------------------------------------------------
  doc({
    id: 's1-phenylephrine', title: 'Phenylephrine 100 µg', source: `${S} check 1`, durationS: 180, mode: 'modeled', requires: ['7a', '7g'],
    actions: [at(60, ev({ kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg' }))],
    segments: [base(), seg('peak', 90, 120,
      rng('map-rise', 'state:map', 'max', { segment: 'base', offset: 15 }, { segment: 'base', offset: 25 }, `${S} 1: MAP +15–25 within 30–60 s`),
      rng('hr-fall', 'state:hr', 'min', { segment: 'base', offset: -15 }, { segment: 'base', offset: -5 }, `${S} 1: reflex HR −5–15`))],
  }),
  doc({
    id: 's2-class2-haemorrhage', title: 'ATLS class II haemorrhage (1000 mL / 10 min)', source: `${S} check 2; R45(b)`, durationS: 900, mode: 'modeled', requires: ['7a', '7c'],
    actions: [at(60, ev({ kind: 'bleed', volumeMl: 1000, overS: 600 }))],
    segments: [seg('base', 30, 60, rng('pp0', 'state:pp', 'mean', 30, 70, 'baseline PP [ENG]')),
      seg('class2', 660, 900,
        rng('hr', 'state:hr', 'mean', 100, 120, `${S} 2: HR 100–120`),
        rng('sbp-held', 'state:sbp', 'mean', { segment: 'base', factor: 0.9 }, { segment: 'base', factor: 1.05 }, `${S} 2: SBP near normal (R45 b)`),
        lt('pp-narrow', 'state:pp', 'mean', { segment: 'base', factor: 0.9 }, `${S} 2: PP narrowed`))],
  }),
  doc({
    id: 's3-propofol-induction', title: 'Propofol 2 mg/kg induction', source: `${S} check 3`, durationS: 240, mode: 'modeled', requires: ['7g'],
    actions: [at(60, ev({ kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg' }))],
    segments: [base(), seg('2min', 175, 185,
      { id: 'map-70pct', series: 'state:map', reduce: 'mean', type: 'EqualTo', value: { segment: 'base', factor: 0.7 }, tolPct: 15, source: `${S} 3: MAP ≈ 70 % of baseline at 2 min` },
      lt('hr-little', 'state:hr', 'mean', { segment: 'base', factor: 1.1 }, `${S} 3: little HR rise`))],
  }),
  ...([['I', 700, [60, 100], null], ['III', 1750, [120, 140], 90], ['IV', 2250, [140, 180], 90]] as const).map(([cls, ml, hr, sbpMax]) => doc({
    id: `s4-class-${cls.toLowerCase()}`, title: `ATLS class ${cls} haemorrhage (${ml} mL / 10 min)`, source: `${S} check 4`, durationS: 900, mode: 'modeled', requires: ['7a', '7c'],
    actions: [at(60, ev({ kind: 'bleed', volumeMl: ml, overS: 600 }))],
    segments: [seg('late', 660, 900,
      rng('hr', 'state:hr', 'mean', hr[0], hr[1], `${S} 4 / ATLS class ${cls}: HR ${hr[0]}–${hr[1]}`),
      ...(sbpMax !== null ? [lt('sbp', 'state:sbp', 'mean', sbpMax + (cls === 'III' ? 10 : 0), `${S} 4 / ATLS class ${cls}: SBP decreased`)] : []),
      ...(cls === 'IV' ? [lt('pp', 'state:pp', 'mean', 25, `${S} 4: class IV PP < 25`)] : []))],
  })),
  doc({
    id: 's6-apnoea-preoxygenated', title: 'Apnoea after preoxygenation, 70 kg', source: `${S} check 6; Stage 3 acceptance 5`, durationS: 900,
    actions: [at(0, ev({ kind: 'thermal', anaesthesia: 'general' })), at(0, ev({ kind: 'preoxygenate', fio2: 1, durationS: 180 })), at(180, ev({ kind: 'airway', state: 'apnoea' }))],
    segments: [seg('apnoea', 180, 900, rng('t90', 'state:spo2', 'firstTBelow', 390, 570, `${S} 6: SaO2 90 % at 8 ± 1.5 min (Benumof)`, { threshold: 90 }))],
  }),
  doc({
    id: 's6-apnoea-room-air', title: 'Apnoea on room air, 70 kg', source: 'R39 item 1', durationS: 300,
    actions: [at(0, ev({ kind: 'thermal', anaesthesia: 'general' })), at(60, ev({ kind: 'airway', state: 'apnoea' }))],
    segments: [seg('apnoea', 60, 300,
      rng('true-t90', 'state:spo2', 'firstTBelow', 35, 60, 'R39-1: true SaO2 90 % at 45 s (35–60)', { threshold: 90 }),
      rng('shown-t90', 'numeric:spo2', 'firstTBelow', 45, 90, 'R39-1: displayed SpO2 90 % at 60 s (45–90)', { threshold: 90 }))],
  }),
  doc({
    id: 's7-apnoea-child', title: 'Apnoea after preoxygenation, 4 y 16 kg', source: `${S} check 7 (Patel)`, durationS: 600,
    patient: { ageY: 4, weightKg: 16, heightCm: 102, ageBand: 'paediatric' }, baseline: { hr: 100, sbp: 100, dbp: 60, rr: 24, vt: 130 },
    actions: [at(0, ev({ kind: 'thermal', anaesthesia: 'general' })), at(0, ev({ kind: 'preoxygenate', fio2: 1, durationS: 180 })), at(180, ev({ kind: 'airway', state: 'apnoea' }))],
    segments: [seg('apnoea', 180, 600, rng('t90', 'state:spo2', 'firstTBelow', 130, 190, `${S} 7: 160 ± 30 s`, { threshold: 90 }))],
  }),
  doc({
    id: 's8-co2-apnoea-first-breath', title: 'First breath after 60 s disconnection', source: `${S} check 8; Stage 3 acceptance 4 (resp-airway.test.ts)`, durationS: 200,
    actions: [at(0, ev({ kind: 'thermal', anaesthesia: 'general' })), at(0, ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 })), at(1, { type: 'setTarget', variable: 'etco2', value: 37 } as DocCommand),
      at(120, ev({ kind: 'airway', state: 'disconnected' })), at(180, ev({ kind: 'airway', state: 'patent' }))],
    segments: [seg('before', 100, 120, rng('et0', 'breath:etco2True', 'mean', 30, 45, 'normocapnia [ENG]')),
      seg('after', 180, 192, rng('first', 'breath:etco2True', 'max', { segment: 'before', offset: 9 }, { segment: 'before', offset: 15 }, 'Stage 3 acc. 4: first breath +9 to +15 mmHg'))],
  }),
  doc({
    id: 's9-witnessed-vf', title: 'Witnessed VF, no CPR', source: `${S} check 9 (research 03 §8.8 A); Stage 3 gate`, durationS: 180,
    actions: [at(0, ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 })), at(60, { type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' } as DocCommand)],
    segments: [seg('base', 30, 60, rng('et0', 'numeric:etco2', 'mean', 30, 45, 'normocapnia [ENG]')),
      seg('arrest', 60, 180,
        rng('abp-flat', 'numeric:abpSys', 'firstTBelow', 0, 20, 'Stage 2 acc. 6: pulseless → flat (displayed ABP < 20) within 20 s', { threshold: 20 }),
        rng('etco2-gone', 'numeric:etco2', 'firstTBelow', 0, 30, 'Stage 3: EtCO2 < 5 within 30 s', { threshold: 5 }))],
  }),
  // --- tables §7 checks 10–25 (Stage 7) -----------------------------------------------------------------------
  doc({
    id: 't10-as-cad-propofol', title: 'AS + CAD + HTN, propofol 1.5 mg/kg', source: `${T7} 10`, durationS: 360, mode: 'modeled', requires: ['7a', '7g'],
    patient: { ageY: 75, conditions: ['aorticStenosis', 'cad3v', 'htn'] }, baseline: { sbp: 150, dbp: 80 },
    actions: [at(60, ev({ kind: 'drug', drugId: 'propofol', dose: 1.5, unit: 'mg/kg' })), at(210, ev({ kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg' }))],
    segments: [base(), seg('2min', 175, 185, rng('map', 'state:map', 'mean', 60, 65, `${T7} 10: MAP 103 → 60–65 at 2 min`)),
      seg('rescue', 210, 300, gt('map-rescued', 'state:map', 'max', 85, `${T7} 10: phenylephrine → MAP ≥ 85 within 90 s`))],
  }),
  doc({
    id: 't11-chronic-mr-fluid', title: 'Chronic MR + 1.5 L crystalloid', source: `${T7} 11`, durationS: 2700, mode: 'modeled', requires: ['7a', '7b', '7c'],
    patient: { conditions: ['mitralRegurgitationChronic'] },
    actions: [at(60, ev({ kind: 'fluid', fluid: 'crystalloid', volumeMl: 1500, overS: 1800 }))],
    segments: [seg('late', 1200, 1560, gt('pawp', 'state:pawp', 'mean', 25, `${T7} 11: PCWP 15 → > 25 by 15–25 min`)),
      seg('oedema', 1800, 2400, rng('spo2', 'state:spo2', 'mean', 89, 92, `${T7} 11: SpO2 96 → 89–92`))],
  }),
  doc({
    id: 't12-massive-pe', title: 'Massive PE (φ 0.6), ventilated', source: `${T7} 12`, durationS: 300, mode: 'modeled', requires: ['7a', '7b'],
    actions: [at(0, ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 1, peep: 5 })), at(120, ev({ kind: 'condition', id: 'pe', severity: 0.6 }))],
    segments: [seg('base', 90, 120, rng('et0', 'numeric:etco2', 'mean', 30, 45, 'normocapnia [ENG]')),
      seg('pe', 120, 140, rng('etco2', 'numeric:etco2', 'min', 20, 25, `${T7} 12: EtCO2 35 → 20–25 within 3 breaths`)),
      seg('pe-late', 180, 300, rng('papm', 'state:papSys', 'max', 30, 45, `${T7} 12: mPAP 30–40, never > 45 (systolic proxy) [ENG]`), rng('spo2', 'state:spo2', 'min', 85, 92, `${T7} 12: SpO2 85–92 on FiO2 1`))],
  }),
  doc({
    id: 't13-tension-ptx', title: 'Tension pneumothorax, ventilated', source: `${T7} 13`, durationS: 480, mode: 'modeled', requires: ['7a', '7b'],
    actions: [at(0, ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 })), at(60, ev({ kind: 'condition', id: 'tensionPtx', severity: 1 }))],
    segments: [base(), seg('3min', 230, 250, lt('sbp', 'state:sbp', 'mean', 90, `${T7} 13: SBP < 90 by 3 min`), rng('cvp', 'state:cvp', 'mean', { segment: 'base', offset: 5 }, { segment: 'base', offset: 15 }, `${T7} 13: CVP +5–15`))],
  }),
  doc({
    id: 't14-tamponade', title: 'Tamponade (20 mL/min into the pericardium)', source: `${T7} 14`, durationS: 720, mode: 'modeled', requires: ['7a'],
    actions: [at(60, ev({ kind: 'condition', id: 'tamponade', severity: 1 }))],
    segments: [seg('equalised', 540, 720, rng('cvp', 'state:cvp', 'mean', 15, 20, `${T7} 14: CVP ≈ PAD ≈ PCWP 15–20`), rng('pawp', 'state:pawp', 'mean', 15, 20, `${T7} 14`))],
  }),
  doc({
    id: 't15-rv-infarct', title: 'RV infarct (inferior STEMI, Ees_RV ×0.35)', source: `${T7} 15`, durationS: 300, mode: 'modeled', requires: ['7a'],
    patient: { conditions: ['rvInfarct'] },
    actions: [],
    segments: [seg('rest', 120, 300, rng('cvp', 'state:cvp', 'mean', 14, 18, `${T7} 15: CVP 14–18`), rng('pawp', 'state:pawp', 'mean', 8, 12, `${T7} 15: PCWP 8–12`), rng('map', 'state:map', 'mean', 60, 70, `${T7} 15: MAP 60–70`))],
  }),
  doc({
    id: 't16-septic-shock-warm', title: 'Septic shock, warm phase', source: `${T7} 16`, durationS: 600, mode: 'modeled', requires: ['7f'],
    patient: { conditions: ['sepsisWarm'] }, actions: [],
    segments: [seg('warm', 300, 600, rng('map', 'state:map', 'mean', 55, 60, `${T7} 16: MAP 55–60`), rng('hr', 'state:hr', 'mean', 115, 130, `${T7} 16: HR 115–130`))],
  }),
  doc({
    id: 't17a-class3-no-bb', title: 'Class III haemorrhage (35 %), no β-blocker', source: `${T7} 17a`, durationS: 1800, mode: 'modeled', requires: ['7a', '7c'],
    actions: [at(60, ev({ kind: 'bleed', volumeMl: 1750, overS: 600 }))],
    segments: [seg('late', 900, 1800, rng('hr', 'state:hr', 'mean', 120, 140, `${T7} 17a: HR 120–140`), rng('sbp', 'state:sbp', 'mean', 80, 90, `${T7} 17a: SBP 80–90`), rng('pp', 'state:pp', 'mean', 20, 25, `${T7} 17a: PP 20–25`))],
  }),
  doc({
    id: 't17b-class3-bb', title: 'Class III haemorrhage, chronic β-blocker', source: `${T7} 17b`, durationS: 1800, mode: 'modeled', requires: ['7a', '7c', '7g'],
    patient: { conditions: ['betaBlockerChronic'] },
    actions: [at(60, ev({ kind: 'bleed', volumeMl: 1750, overS: 600 }))],
    segments: [seg('late', 900, 1800, rng('hr', 'state:hr', 'mean', 80, 95, `${T7} 17b: HR 80–95`), rng('sbp', 'state:sbp', 'mean', 65, 80, `${T7} 17b: SBP 65–80`))],
  }),
  doc({
    id: 't18-htn-hypocapnia-cbf', title: 'Hypertensive 75 y at MAP 65, PaCO2 40 → 25', source: `${T7} 18`, durationS: 600, mode: 'modeled', requires: ['7d'],
    patient: { ageY: 75, conditions: ['htn'] }, actions: [at(120, ev({ kind: 'ventilation', source: 'ventilator', rr: 24, vtMl: 600, fio2: 0.5, peep: 5 }))],
    segments: [seg('hypocapnia', 400, 600, rng('etco2', 'numeric:etco2', 'mean', 20, 28, `${T7} 18: hyperventilation to PaCO2 ≈ 25 (EtCO2 proxy) [ENG]`))],
  }),
  doc({
    id: 't19-tbi-haematoma', title: 'TBI, expanding haematoma', source: `${T7} 19`, durationS: 1800, mode: 'modeled', requires: ['7d'],
    patient: { conditions: ['tbiHaematoma'] }, actions: [],
    segments: [seg('cushing', 1200, 1800, lt('hr', 'state:hr', 'min', 60, `${T7} 19: HR 80 → 45–55 at CPP < 40`))],
  }),
  doc({
    id: 't20-low-flow-oliguria', title: 'Low-flow oliguria, dobutamine', source: `${T7} 20`, durationS: 3600, mode: 'modeled', requires: ['7d', '7g'],
    patient: { conditions: ['hfref'] }, actions: [at(600, ev({ kind: 'drug', drugId: 'dobutamine', dose: 5, unit: 'mcg/kg/min' }))],
    segments: [seg('on-dobutamine', 1800, 3600, rng('map', 'state:map', 'mean', 68, 76, `${T7} 20: MAP 72 on dobutamine`))],
  }),
  doc({
    id: 't21-mh', title: 'Malignant hyperthermia, fixed ventilation', source: `${T7} 21; Stage 3 gate (EtCO2 38 → 124 in 30 min)`, durationS: 1500,
    actions: [at(0, ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 })), at(300, ev({ kind: 'condition', id: 'mh', severity: 1 }))],
    segments: [seg('base', 240, 300, rng('et0', 'numeric:etco2', 'mean', 30, 45, 'normocapnia [ENG]')),
      seg('10min', 870, 930, rng('etco2', 'numeric:etco2', 'mean', 51, 69, `${T7} 21: EtCO2 40 → 60 by 10 min (±15 %)`)),
      seg('20min', 1400, 1500, gt('rising', 'numeric:etco2', 'mean', { segment: '10min', offset: 15 }, `${T7} 21: keeps rising 3–5 mmHg/min`))],
  }),
  doc({
    id: 't22-term-spinal', title: 'Term pregnancy, spinal, supine', source: `${T7} 22`, durationS: 600, mode: 'modeled', requires: ['7a', '7f'],
    patient: { ageY: 30, sex: 'F', pregnancyWeeks: 39 }, baseline: { sbp: 125, dbp: 75 },
    actions: [at(60, ev({ kind: 'neuraxial', level: 'T4' }))],
    segments: [seg('3-5min', 240, 360, rng('map', 'state:map', 'mean', 60, 65, `${T7} 22: MAP 90 → 60–65 in 3–5 min`))],
  }),
  doc({
    id: 't23-term-apnoea', title: 'Term pregnancy, GA apnoea after preoxygenation', source: `${T7} 23`, durationS: 600, requires: ['7b'],
    patient: { ageY: 30, sex: 'F', weightKg: 80, heightCm: 165, pregnancyWeeks: 39 },
    actions: [at(0, ev({ kind: 'thermal', anaesthesia: 'general' })), at(0, ev({ kind: 'preoxygenate', fio2: 1, durationS: 180 })), at(180, ev({ kind: 'airway', state: 'apnoea' }))],
    segments: [seg('apnoea', 180, 600, rng('t90', 'state:spo2', 'firstTBelow', 150, 240, `${T7} 23: SpO2 90 % at 2.5–4 min`, { threshold: 90 }))],
  }),
  ...([[1.0, 411], [0.8, 303], [0.6, 213]] as const).map(([fio2, s]) => doc({
    id: `t24-edmark-fio2-${fio2}`, title: `Induction atelectasis: apnoea after FiO2 ${fio2}`, source: `${T7} 24 (Edmark)`, durationS: 900, requires: ['7b'],
    actions: [at(0, ev({ kind: 'thermal', anaesthesia: 'general' })), at(0, ev({ kind: 'preoxygenate', fio2, durationS: 180 })), at(180, ev({ kind: 'airway', state: 'apnoea' }))],
    segments: [seg('apnoea', 180, 900, rng('t90', 'state:spo2', 'firstTBelow', Math.round(0.8 * s), Math.round(1.2 * s), `${T7} 24: ${s} s ±20 %`, { threshold: 90 }))],
  })),
  doc({
    id: 't25-rocuronium-sugammadex', title: 'Rocuronium 0.6 mg/kg → sugammadex 2 mg/kg at T2', source: `${T7} 25`, durationS: 2400, mode: 'modeled', requires: ['7f', '7g'],
    actions: [at(60, ev({ kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg' })), at(1800, ev({ kind: 'drug', drugId: 'sugammadex', dose: 2, unit: 'mg/kg' }))],
    segments: [seg('recovery', 1800, 2400, rng('rr-back', 'state:rr', 'firstTAbove', 60, 240, `${T7} 25: spontaneous effort returns within ≈ 2.2 min of sugammadex [ENG]`, { threshold: 4 }))],
  }),
];
```

- [x] **Step 4: Run the test. Expected: PASS (3 tests, < 1 s — schema only, no engine run)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/segments/sanity-docs.test.ts`

- [x] **Step 5: Run the whole set once (≈ 3–4 min) and paste the output into the commit body. Expected: every MODELED row `n/m …arrives in Stage 7`; s6/s7/s8/s9/t21 graded**

```bash
cat > packages/validation/smoke-sanity.ts <<'TS'
import { SANITY_DOCS } from './suites/sanity/sanity-docs.ts';
import { runValidationDoc } from './src/segments/run.ts';
for (const d of SANITY_DOCS) {
  const r = await runValidationDoc(d);
  if (!r.measurable) { console.log(`n/m    ${d.id}: ${r.unsupported[0]?.type} — ${r.unsupported[0]?.reason}`); continue; }
  for (const x of r.results) console.log(`${x.grade.padEnd(6)} ${d.id}/${x.segment}/${x.target}: ${x.measured.toFixed(1)} (${x.expected})`);
}
TS
(cd packages/validation && npx vite-node smoke-sanity.ts | tee /tmp/pme-8a-sanity.txt)
rm packages/validation/smoke-sanity.ts
```

- [x] **Step 6: Commit**

```bash
git add packages/validation/suites/sanity/sanity-docs.ts packages/validation/test/segments/sanity-docs.test.ts
git commit -m "feat(validation): brief §4.9 and tables §7 sanity checks as segment-validation documents" -m "$(cat /tmp/pme-8a-sanity.txt)"
git push
```

---

### Task 14: Gate numbers as regression documents

**Files:**
- Create: `packages/validation/suites/gates/gate-docs.ts`
- Test: `packages/validation/test/segments/gate-docs.test.ts`

**Interfaces:**
- Consumes: Task 12 runner, Task 11 types.
- Produces: `GATE_DOCS: ValidationDoc[]` (7 documents; seed 42).

Measured on `6eeb6d1`: g2 displayed ABP 121.2/80.6 then 91.9/51.4 after the ramp (gate 2: 120.8/80.8 and 91.2/52.2; green); g3 awRR 14.00, impedance RR 14.00 (green); g3 PEEP 5 → 15: MAP 101.5 → 86.3 (a 15.2 drop; gate 3 said 97 → 83 at baseline 120/80 — the document now checks the DROP, 14 ± 3, green); disconnection → `apnoea-co2` 19.4 s after the event (15–22, green); asystole alarm 9.68 s on saadat-like and 3.68 s on philips-like (gate 4b: 10 s / 4 s ±1, green); CPR EtCO2 20.6 mmHg at the default quality (R39-2 ≈ 20; green). Whole set ≈ 40 s.

Stage 3.1 changed defaults on its branch (CPR quality, per-skin sidestream delay); the `g3-cpr-etco2` document is tagged `requires: ['3.1']` and the executor re-measures every row after merging main (Task 24) — a moved row goes to the calibration queue with both numbers, never silently re-banded.

- [x] **Step 1: Write the failing test `packages/validation/test/segments/gate-docs.test.ts`**

```ts
import { validateScenario } from '@pme/controller/scenario';
import { describe, expect, it } from 'vitest';
import { GATE_DOCS } from '../../suites/gates/gate-docs.ts';
import { runValidationDoc } from '../../src/segments/run.ts';

describe('gate regression documents', () => {
  it('validate against pme-scenario/1', () => {
    for (const d of GATE_DOCS) expect(validateScenario(d.scenario).ok, d.id).toBe(true);
  });
  it('the asystole alarm delay on philips-like is 4 ± 1 s', { timeout: 60_000 }, async () => {
    const r = await runValidationDoc(GATE_DOCS.find((d) => d.id === 'g4b-asystole-philips-like')!);
    expect(r.results.map((x) => x.grade)).toEqual(['green']);
  });
});
```

- [x] **Step 2: Run it. Expected: FAIL (module missing)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/segments/gate-docs.test.ts`

- [x] **Step 3: Write `packages/validation/suites/gates/gate-docs.ts`**

```ts
// Gate numbers as regression documents (R40 borrow #1: "band rules for numerics"). Each target is one number a
// merged gate note recorded (docs/gates/stage-*.md), with the band that gate accepted. They make those numbers a
// command (`pnpm validate`) instead of a scratch test re-run by hand.
import type { DocCommand } from '@pme/controller/scenario';
import type { Segment, Target, ValidationDoc } from '../../src/segments/types.ts';

const ev = (event: Record<string, unknown>): DocCommand => ({ type: 'applyEvent', event } as DocCommand);
const c = (body: Record<string, unknown>): DocCommand => body as DocCommand;
const ADULT = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175 };
const range = (id: string, series: string, reduce: Target['reduce'], min: number, max: number, source: string, extra: Partial<Target> = {}): Target => ({ id, series, reduce, type: 'Range', min, max, source, ...extra }) as Target;
const seg = (id: string, fromS: number, toS: number, ...targets: Target[]): Segment => ({ id, fromS, toS, targets });

function gate(o: { id: string; title: string; durationS: number; skin?: string; baseline?: Record<string, number>; sensors?: Record<string, string>; rhythm?: string; actions: Array<{ t: number; command: DocCommand }>; segments: Segment[]; requires?: string[] }): ValidationDoc {
  return {
    schema: 'pme-validation/1', id: o.id, title: o.title, seed: 42, durationS: o.durationS, ...(o.requires ? { requires: o.requires } : {}),
    scenario: {
      schema: 'pme-scenario/1', id: `gate-${o.id}`, title: o.title, ...(o.skin ? { device: { skin: o.skin } } : {}),
      patient: { ...ADULT, baseline: { hr: 75, sbp: 120, dbp: 80, ...o.baseline }, sensors: { ecg: 'on', spo2: 'on', abp: 'connected', co2: 'on', ...o.sensors }, ...(o.rhythm ? { rhythm: { id: o.rhythm } } : {}) },
      initialState: 'run', states: [{ id: 'run' }],
    },
    actions: o.actions, segments: o.segments,
  };
}

export const GATE_DOCS: ValidationDoc[] = [
  gate({
    id: 'g2-displayed-abp', title: 'Stage 2: displayed ABP follows targets 120/80 and a ramp to 90/50', durationS: 110,
    actions: [{ t: 60, command: c({ type: 'setTarget', variable: 'sbp', value: 90, ramp: { durationS: 5 } }) }, { t: 60, command: c({ type: 'setTarget', variable: 'dbp', value: 50, ramp: { durationS: 5 } }) }],
    segments: [
      seg('steady', 30, 60, range('sys', 'numeric:abpSys', 'mean', 117, 124, 'gate 2 acc. 1: 120.8 (±3)'), range('dia', 'numeric:abpDia', 'mean', 77, 84, 'gate 2 acc. 1: 80.8 (±3)')),
      seg('after-ramp', 75, 110, range('sys', 'numeric:abpSys', 'mean', 88, 94, 'gate 2 acc. 3: 91.2 (±3)'), range('dia', 'numeric:abpDia', 'mean', 49, 55, 'gate 2 acc. 3: 52.2 (±3)')),
    ],
  }),
  gate({
    id: 'g3-rr-three-ways', title: 'Stage 3: RR from capnograph and impedance at ventilator 14/min', durationS: 120,
    actions: [{ t: 0, command: ev({ kind: 'ventilation', source: 'ventilator', rr: 14, vtMl: 500, fio2: 0.5, peep: 5 }) }],
    segments: [seg('steady', 60, 120, range('awrr', 'numeric:awrr', 'mean', 13.5, 14.5, 'gate 3: awRR 14.0'), range('rr', 'numeric:rr', 'mean', 13, 15, 'gate 3: impedance RR 14.0'))],
  }),
  gate({
    id: 'g3-peep-map', title: 'Stage 3: PEEP 5 → 15 lowers MAP by ≈ 14 mmHg (MANUAL coupling)', durationS: 240, baseline: { sbp: 130, dbp: 80 },
    actions: [{ t: 0, command: ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 }) }, { t: 120, command: ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 15 }) }],
    segments: [seg('peep5', 90, 120, range('map', 'numeric:abpMean', 'mean', 94, 104, 'gate 3: MAP ≈ 97 at PEEP 5 (displayed radial mean) [ENG band]')),
      seg('peep15', 200, 240, { id: 'drop', series: 'numeric:abpMean', reduce: 'mean', type: 'Range', min: { segment: 'peep5', offset: -17 }, max: { segment: 'peep5', offset: -11 }, source: 'gate 3: PEEP 5 → 15 drops MAP by 14 (97 → 83) ± 3' })],
  }),
  gate({
    id: 'g3-disconnect-apnoea-alarm', title: 'Stage 3/4b: disconnection → apnoea-co2 alarm', durationS: 120,
    actions: [{ t: 0, command: ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 }) }, { t: 60, command: ev({ kind: 'airway', state: 'disconnected' }) }],
    segments: [seg('disconnected', 60, 120, range('alarm', 'alarm:apnoea-co2', 'firstT', 15, 22, 'gate 3 acc. 3: raised 16.9 s after the event = 20 ± 1 s after the last breath (breath phase adds ≤ 5 s)'))],
  }),
  ...([['saadat-like', 10], ['philips-like', 4]] as const).map(([skin, s]) => gate({
    id: `g4b-asystole-${skin}`, title: `Stage 4b: asystole alarm delay on ${skin}`, durationS: 60, skin,
    actions: [{ t: 30, command: c({ type: 'setRhythm', rhythm: 'asystole', when: 'now' }) }],
    segments: [seg('arrest', 30, 60, range('delay', 'alarm:ASYSTOLE', 'firstT', s - 1, s + 1.5, `gate 4b: asystole ${s} s on ${skin} (alarm delays ±1 s, brief §9 V7)`))],
  })),
  gate({
    id: 'g3-cpr-etco2', title: 'CPR EtCO2 at the default learner quality (R39 item 2)', durationS: 240, requires: ['3.1'],
    actions: [{ t: 30, command: c({ type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' }) }, { t: 40, command: ev({ kind: 'cpr', active: true, rate: 110 }) }],
    segments: [seg('cpr', 120, 240, range('etco2', 'numeric:etco2', 'mean', 17, 23, 'R39-2: default quality 0.8 → ≈ 20 mmHg'))],
  }),
];
```

- [x] **Step 4: Run the test. Expected: PASS (2 tests)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/segments/gate-docs.test.ts`

- [x] **Step 5: Commit**

```bash
git add packages/validation/suites/gates/gate-docs.ts packages/validation/test/segments/gate-docs.test.ts
git commit -m "feat(validation): gate 2/3/4b numbers as band-graded regression documents"
git push
```

---

### Task 15: Waveform regression baselines (2 % per sample) and V9 determinism

**Files:**
- Create: `packages/validation/src/regression/baseline.ts`, `packages/validation/src/regression/determinism.ts`
- Create (generated, committed): `packages/validation/baselines/waveforms.json` (≈ 113 KB), `packages/validation/baselines/determinism.json`
- Test: `packages/validation/test/regression/regression.test.ts`

**Interfaces:**
- Consumes: Task 10 `capture`, `clinical`, `cmd`; `RHYTHM_IDS`.
- Produces: `REL_LIMIT = 0.02`, `FLOOR_FRAC_PP = 0.05`, `WINDOW`, `CASES: BaselineCase[]`, `generate(c)`, `interface WaveCompare { case; channel; n; failed; maxRelErr; rms; grade }`, `compareWave(caseId, channel, base, now)`, `readBaseline()`, `writeBaseline(b)`, `runRegression({ rebaseline? }): Promise<WaveCompare[]>`; `hashRun(rhythm, seed, seconds=60)`, `interface DeterminismResult { runs; nonDeterministic; goldenChanged; hashes }`, `runDeterminism(seeds=[1,2,3], rhythms=RHYTHM_IDS)`, `writeGolden(h)`.

Measured while planning: the 5 cases write a 113 KB baseline in 0.6 s; comparing a regenerated run gives 13/13 channels green; determinism over all 36 rhythms × 3 seeds = 216 runs in 21 s, 0 non-deterministic.

- [x] **Step 1: Write the failing test `packages/validation/test/regression/regression.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { compareWave, CASES, generate } from '../../src/regression/baseline.ts';
import { hashRun } from '../../src/regression/determinism.ts';

describe('2 % per-sample waveform regression (R40, decision 9)', () => {
  const base = [0, 0.5, 1, 0.5, 0, -0.2];
  it('identical → green; a 1.5 % change → green; a 3 % change on one sample of six → red', () => {
    expect(compareWave('c', 'x', base, base).grade).toBe('green');
    expect(compareWave('c', 'x', base, base.map((v) => v * 1.015)).grade).toBe('green');
    expect(compareWave('c', 'x', base, [0, 0.5, 1.03, 0.5, 0, -0.2])).toMatchObject({ failed: 1, grade: 'red' });
  });
  it('near-zero samples use the 5 %-of-peak-to-peak floor', () => {
    expect(compareWave('c', 'x', base, [0.001, 0.5, 1, 0.5, 0.001, -0.2]).failed).toBe(0);
  });
  it('a regenerated case equals itself', { timeout: 30_000 }, async () => {
    const c = CASES[0]!;
    const a = await generate(c);
    const b = await generate(c);
    for (const ch of c.channels) expect(compareWave(c.id, ch, a[ch]!, b[ch]!).grade).toBe('green');
  });
});

describe('V9 determinism', () => {
  it('same rhythm and seed → same hash; another seed → another hash', { timeout: 30_000 }, async () => {
    const a = await hashRun('sinus', 7, 10);
    expect(await hashRun('sinus', 7, 10)).toBe(a);
    expect(await hashRun('sinus', 8, 10)).not.toBe(a);
  });
});
```

- [x] **Step 2: Run it. Expected: FAIL (modules missing)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/regression/regression.test.ts`

- [x] **Step 3: Write `packages/validation/src/regression/baseline.ts`**

```ts
// Waveform regression baselines (R40 borrow #1, audit N-P02): fixed scenarios, 5 s windows per channel, compared
// sample by sample with a 2 % limit. The limit's floor (5 % of the window's peak-to-peak) stops samples near zero
// from turning into huge relative errors [ENG, decision 9]. Baselines are our own engine output (MIT), JSON.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ChannelId, Command } from '@pme/engine-core';
import { capture, clinical, cmd } from '../engine/capture.ts';
import type { Grade } from '../segments/types.ts';

export const REL_LIMIT = 0.02;
export const FLOOR_FRAC_PP = 0.05;
export const WINDOW: [number, number] = [40, 45];

export interface BaselineCase { id: string; seed: number; patient: Record<string, unknown>; script: Array<{ t: number; cmd: Command }>; channels: ChannelId[] }
export const CASES: BaselineCase[] = [
  { id: 'sinus-75', seed: 42, patient: { baseline: { hr: 75 }, sensors: { abp: 'connected', spo2: 'on', co2: 'on' } }, script: [{ t: 0, cmd: clinical({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 }) }], channels: ['ecgII', 'V5', 'abp', 'pleth', 'co2'] },
  { id: 'afib-110', seed: 42, patient: { baseline: { hr: 110 }, rhythm: { id: 'afib' }, sensors: { abp: 'connected', spo2: 'on' } }, script: [], channels: ['ecgII', 'abp', 'pleth'] },
  { id: 'vf-coarse', seed: 42, patient: { rhythm: { id: 'vfCoarse' }, sensors: { abp: 'connected' } }, script: [], channels: ['ecgII', 'abp'] },
  { id: 'bronchospasm', seed: 42, patient: { sensors: { co2: 'on' } }, script: [{ t: 0, cmd: clinical({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 }) }, { t: 5, cmd: clinical({ kind: 'airway', state: 'bronchospasm', severity: 0.8 }) }], channels: ['co2'] },
  { id: 'hypovolaemia-ppv', seed: 42, patient: { sensors: { abp: 'connected', spo2: 'on', co2: 'on' } }, script: [{ t: 0, cmd: clinical({ kind: 'ventilation', source: 'ventilator', rr: 15, vtMl: 500, fio2: 0.5, peep: 5 }) }, { t: 1, cmd: cmd({ type: 'setTarget', variable: 'volumeStatus', value: 0.3 }) }], channels: ['abp', 'pleth'] },
];

export type Baseline = Record<string, Record<string, number[]>>; // case → channel → samples (4 decimals)
export const baselinePath = (): string => fileURLToPath(new URL('../../baselines/waveforms.json', import.meta.url));

export async function generate(c: BaselineCase): Promise<Record<string, number[]>> {
  const cap = await capture({ engine: { seed: c.seed, patient: c.patient }, script: c.script, channels: c.channels, fromS: WINDOW[0], toS: WINDOW[1] });
  return Object.fromEntries(c.channels.map((ch) => [ch, Array.from(cap.channels[ch]?.x ?? [], (v) => Math.round(v * 1e4) / 1e4)]));
}

export interface WaveCompare { case: string; channel: string; n: number; failed: number; maxRelErr: number; rms: number; grade: Grade }

/** Per-sample 2 % comparison; green = every sample within, yellow ≤ 1 % of samples outside, else red. */
export function compareWave(caseId: string, channel: string, base: number[], now: ArrayLike<number>): WaveCompare {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of base) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const floor = FLOOR_FRAC_PP * (hi - lo);
  let failed = 0;
  let maxRel = 0;
  let ss = 0;
  const n = Math.min(base.length, now.length);
  for (let i = 0; i < n; i++) {
    const b = base[i] as number;
    const d = Math.abs((now[i] as number) - b);
    const den = Math.max(Math.abs(b), floor, 1e-10);
    if (d > REL_LIMIT * den) failed++;
    maxRel = Math.max(maxRel, d / den);
    ss += d * d;
  }
  if (base.length !== now.length) failed += Math.abs(base.length - now.length);
  const grade: Grade = failed === 0 ? 'green' : failed <= 0.01 * n ? 'yellow' : 'red';
  return { case: caseId, channel, n, failed, maxRelErr: maxRel, rms: Math.sqrt(ss / Math.max(1, n)), grade };
}

export function readBaseline(): Baseline | null {
  return existsSync(baselinePath()) ? (JSON.parse(readFileSync(baselinePath(), 'utf8')) as Baseline) : null;
}
export function writeBaseline(b: Baseline): void {
  writeFileSync(baselinePath(), `${JSON.stringify(b)}\n`);
}

/** Compare every case with the committed baseline; with `rebaseline` (or no baseline yet) write it and return []. */
export async function runRegression(opts: { rebaseline?: boolean } = {}): Promise<WaveCompare[]> {
  const cur: Baseline = {};
  for (const c of CASES) cur[c.id] = await generate(c);
  const base = readBaseline();
  if (!base || opts.rebaseline) {
    writeBaseline(cur);
    return [];
  }
  const out: WaveCompare[] = [];
  for (const c of CASES) for (const ch of c.channels) out.push(compareWave(c.id, ch, base[c.id]?.[ch] ?? [], cur[c.id]?.[ch] ?? []));
  return out;
}
```

- [x] **Step 4: Write `packages/validation/src/regression/determinism.ts`**

```ts
// V9 determinism (brief §9): SHA-256 of the sample buffers for rhythms × seeds × 60 s. Gating: two runs in one
// process are byte-identical (decision 10). The committed golden file is compared for information only (any engine
// change legitimately moves it). Default 3 seeds per rhythm (≈ 20–40 s); `--full` runs the brief's 40.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { RHYTHM_IDS, type ChannelId, type RhythmId } from '@pme/engine-core';
import { capture } from '../engine/capture.ts';

export const CHANNELS: ChannelId[] = ['ecgII', 'abp', 'pleth'];
export const goldenPath = (): string => fileURLToPath(new URL('../../baselines/determinism.json', import.meta.url));

export async function hashRun(rhythm: RhythmId, seed: number, seconds = 60): Promise<string> {
  const cap = await capture({ engine: { seed, patient: { rhythm: { id: rhythm }, sensors: { abp: 'connected', spo2: 'on' } } }, channels: CHANNELS, fromS: 0, toS: seconds });
  const h = createHash('sha256');
  for (const ch of CHANNELS) h.update(new Uint8Array(Float32Array.from(cap.channels[ch]?.x ?? []).buffer));
  return h.digest('hex');
}

export interface DeterminismResult { runs: number; nonDeterministic: string[]; goldenChanged: string[]; hashes: Record<string, string> }

export async function runDeterminism(seeds: number[] = [1, 2, 3], rhythms: readonly RhythmId[] = RHYTHM_IDS): Promise<DeterminismResult> {
  const hashes: Record<string, string> = {};
  const bad: string[] = [];
  for (const r of rhythms) {
    for (const s of seeds) {
      const a = await hashRun(r, s);
      const b = await hashRun(r, s);
      hashes[`${r}/${s}`] = a;
      if (a !== b) bad.push(`${r}/${s}`);
    }
  }
  const golden: Record<string, string> = existsSync(goldenPath()) ? JSON.parse(readFileSync(goldenPath(), 'utf8')) : {};
  const changed = Object.keys(hashes).filter((k) => golden[k] !== undefined && golden[k] !== hashes[k]);
  return { runs: Object.keys(hashes).length * 2, nonDeterministic: bad, goldenChanged: changed, hashes };
}

export function writeGolden(h: Record<string, string>): void {
  writeFileSync(goldenPath(), `${JSON.stringify(h, null, 1)}\n`);
}
```

- [x] **Step 5: Run the test. Expected: PASS (4 tests)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/regression/regression.test.ts`

- [x] **Step 6: Generate and commit the first baselines. Expected: `waveforms.json` ≈ 110–120 KB; `nondet []`**

```bash
mkdir -p packages/validation/baselines
cat > packages/validation/gen-baselines.ts <<'TS'
import { runRegression } from './src/regression/baseline.ts';
import { runDeterminism, writeGolden } from './src/regression/determinism.ts';
await runRegression({ rebaseline: true });
const d = await runDeterminism();
writeGolden(d.hashes);
console.log('runs', d.runs, 'nondet', d.nonDeterministic);
TS
(cd packages/validation && npx vite-node gen-baselines.ts)
rm packages/validation/gen-baselines.ts
ls -la packages/validation/baselines/
```

- [x] **Step 7: Commit**

```bash
git add packages/validation/src/regression packages/validation/test/regression packages/validation/baselines
git commit -m "feat(validation): 2 % per-sample waveform regression baselines and V9 determinism hashes"
git push
```

---

### Task 16: Pulse differential oracle (Node)

**Files:**
- Create: `packages/validation/src/oracle/pulse-node.ts`, `packages/validation/src/oracle/oracle.ts`
- Modify: `NOTICES.md` (append N-083, N-084)
- Test: `packages/validation/test/oracle/oracle.test.ts`

**Interfaces:**
- Consumes: Task 12 `runValidationDoc`; `DocCommand`.
- Produces: `PULSE_REQUESTS`, `type PulseRequest`, `interface PulseOracle { buildHash; step(n); pull(); act(json) }`, `pulseDir(): string | null` (from `PME_PULSE_DIR`), `loadPulse(dir)`; `interface OracleScenario`, `ORACLE` (O1, O2, O4, O-VF), `ORACLE_BACKLOG`, `interface OracleRow`, `judge(c, ours, pulse)`, `oursDoc(s)`, `runOracle(s, pulse | null)`.

Measured while planning (`PME_PULSE_DIR=../research/pulse-spike/web`, wasm SHA-256 `a3be71ad…`): Pulse ready in ≈ 30 ms in Node, 10 min of O1 in 81 s wall (both engines). **O1 baseline:** HR 72.0 vs 71.1 (green), SaO2 96.9 vs 97.5 (green), EtCO2 36.6 vs 36.7 (green), MAP 87.3 vs 95.4 (yellow: our state MAP is DBP + PP/3 of 114/74 while Pulse integrates its waveform), RR 15.0 vs 12.2 (yellow), CVP 6.0 vs 4.7 (yellow). **O-VF:** Pulse's pH reaches **10.58** at 30 min — D1 reproduced, graded green as an expected disagreement; our side has no public pH until 7c. O2/O4 are not measurable on our side before 7a/7c/7g. Our state SBP/DBP keep their MANUAL targets through an arrest (flag `override`), so VF MAP is compared on the DISPLAYED mean.

- [x] **Step 1: Write the failing test `packages/validation/test/oracle/oracle.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { judge, ORACLE, runOracle, type Compare } from '../../src/oracle/oracle.ts';
import { loadPulse, pulseDir } from '../../src/oracle/pulse-node.ts';

const C = (expect: Compare['expect'], tolPct = 10): Compare => ({ id: 'x', ours: 'state:hr', pulse: 'HeartRate(1/min)', atS: 10, metric: 'abs', tolPct, expect });

describe('oracle comparator (annex §C)', () => {
  it('agree within tolerance → green, within 30 % → yellow, beyond → red', () => {
    expect(judge(C({ kind: 'agree' }), 75, 72).grade).toBe('green');
    expect(judge(C({ kind: 'agree' }), 90, 72).grade).toBe('yellow');
    expect(judge(C({ kind: 'agree' }), 120, 72).grade).toBe('red');
  });
  it('expect-differ stays green while Pulse is still wrong and turns yellow when Pulse changes', () => {
    const d1: Compare['expect'] = { kind: 'expect-differ', id: 'D1', op: '>', value: 7.45 };
    expect(judge(C(d1), Number.NaN, 10.59)).toMatchObject({ grade: 'green', note: 'known Pulse disagreement D1' });
    expect(judge(C(d1), 7.0, 7.1).grade).toBe('yellow');
  });
  it('our side not measurable → rows are n/m and never gate', { timeout: 60_000 }, async () => {
    const r = await runOracle(ORACLE.find((s) => s.id === 'O4')!, null);
    expect(r.oursMeasurable).toBe(false);
    expect(r.rows.every((x) => x.expected === 'n/m' && x.grade === 'green')).toBe(true);
  });
  it.skipIf(!pulseDir())('Pulse loads in Node and StandardMale sits at HR 72, MAP ≈ 95 (needs PME_PULSE_DIR)', { timeout: 60_000 }, async () => {
    const p = await loadPulse(pulseDir() as string);
    p.step(500);
    const d = p.pull();
    expect(d['HeartRate(1/min)']).toBeCloseTo(72, 0);
    expect(d['MeanArterialPressure(mmHg)']).toBeGreaterThan(90);
  });
});
```

- [x] **Step 2: Run it. Expected: FAIL (modules missing)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/oracle/oracle.test.ts`

- [x] **Step 3: Write `packages/validation/src/oracle/pulse-node.ts`**

```ts
// The Pulse Physiology Engine 4.3.2 wasm build (research/pulse-spike/web, Apache-2.0, Kitware) loaded in Node as a
// differential-test ORACLE (R34). Run time only: pulse.js/pulse.wasm/pulse.data come from PME_PULSE_DIR and are
// never committed or bundled (annex §E). The build is web/worker-only, so Node gets three shims and a fetch that
// reads local files (decision 13). The data package holds /bench/drm.json (the 45 data requests below, in order)
// and /states/StandardMale.json (pre-stabilised). One engine per scenario.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

/** research/pulse-spike/bench/drm_names.json, in PullData order (value i+1; value 0 is sim time). */
export const PULSE_REQUESTS = [
  'HeartRate(1/min)', 'ArterialPressure(mmHg)', 'SystolicArterialPressure(mmHg)', 'DiastolicArterialPressure(mmHg)', 'MeanArterialPressure(mmHg)',
  'CardiacOutput(L/min)', 'HeartStrokeVolume(mL)', 'SystemicVascularResistance(mmHg_s/mL)', 'CentralVenousPressure(mmHg)', 'MeanCentralVenousPressure(mmHg)',
  'PulmonaryArterialPressure(mmHg)', 'PulmonarySystolicArterialPressure(mmHg)', 'PulmonaryDiastolicArterialPressure(mmHg)', 'PulmonaryCapillariesWedgePressure(mmHg)',
  'OxygenSaturation', 'PulseOximetry', 'ArterialOxygenPressure(mmHg)', 'ArterialCarbonDioxidePressure(mmHg)', 'EndTidalCarbonDioxidePressure(mmHg)',
  'RespirationRate(1/min)', 'TidalVolume(mL)', 'TotalLungVolume(mL)', 'CoreTemperature(degC)', 'IntracranialPressure(mmHg)', 'CerebralPerfusionPressure(mmHg)',
  'CerebralBloodFlow(mL/min)', 'UrineProductionRate(mL/min)', 'BloodPH', 'BloodVolume(mL)', 'Hematocrit', 'BaseExcess(mmol/L)', 'PeripheralPerfusionIndex',
  'SedationLevel', 'NeuromuscularBlockLevel', 'AirwayPressure(cmH2O)', 'Carina-CarbonDioxide-PartialPressure(mmHg)', 'ECG-Lead3ElectricPotential(mV)',
  'Lactate-BloodConcentration(mg/dL)', 'Potassium-BloodConcentration(mg/dL)', 'Sodium-BloodConcentration(mg/dL)', 'Calcium-BloodConcentration(mg/dL)',
  'Bicarbonate-BloodConcentration(mg/dL)', 'Glucose-BloodConcentration(mg/dL)', 'Hemoglobin-BloodConcentration(g/dL)', 'Propofol-PlasmaConcentration(ug/mL)',
] as const;
export type PulseRequest = (typeof PULSE_REQUESTS)[number];

export interface PulseOracle {
  /** SHA-256 of pulse.wasm (every oracle record carries it, spike §3.7). */
  buildHash: string;
  /** Advance n × 20 ms. */
  step(n: number): void;
  pull(): Record<PulseRequest | 't', number>;
  /** Process one action document ({"AnyAction":[…]}, the act_*.json shape); false when Pulse rejects it. */
  act(json: string): boolean;
}

export function pulseDir(): string | null {
  const d = process.env.PME_PULSE_DIR;
  return d && ['pulse.wasm', 'pulse.js', 'pulse.data'].every((f) => existsSync(join(d, f))) ? d : null;
}

type Cwrap = (name: string, ret: string | null, args: string[]) => (...a: unknown[]) => unknown;
interface PulseModule { cwrap: Cwrap; HEAPF64: Float64Array; FS: { readFile(p: string, o: { encoding: 'utf8' }): string } }

export async function loadPulse(dir: string): Promise<PulseOracle> {
  const g = globalThis as Record<string, unknown>;
  g.WorkerGlobalScope ??= class {};
  g.self ??= globalThis;
  g.location ??= { href: `file://${dir}/`, pathname: `${dir}/` };
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (u: string | URL | Request, o?: RequestInit) =>
    typeof u === 'string' && !/^https?:/.test(u) ? new Response(readFileSync(u.replace(/^file:\/\//, ''))) : realFetch(u, o)) as typeof fetch;
  const wasm = readFileSync(join(dir, 'pulse.wasm'));
  const createPulse = createRequire(import.meta.url)(join(dir, 'pulse.js')) as (m: Record<string, unknown>) => Promise<PulseModule>;
  const M = await createPulse({ wasmBinary: wasm, locateFile: (f: string) => join(dir, f), print: () => {}, printErr: () => {} });
  globalThis.fetch = realFetch;
  M.cwrap('PulseInitialize', null, [])();
  const e = M.cwrap('Allocate', 'number', ['number', 'string'])(0, '/') as number;
  const drm = M.FS.readFile('/bench/drm.json', { encoding: 'utf8' });
  if (!M.cwrap('SerializeFromFile', 'boolean', ['number', 'string', 'string', 'number'])(e, '/states/StandardMale.json', drm, 0)) throw new Error('Pulse: StandardMale state did not load');
  const stepFn = M.cwrap('AdvanceTimeStep', 'boolean', ['number']);
  const pullFn = M.cwrap('PullData', 'number', ['number']);
  const actFn = M.cwrap('ProcessActions', 'boolean', ['number', 'string', 'number']);
  return {
    buildHash: createHash('sha256').update(wasm).digest('hex'),
    step: (n) => { for (let i = 0; i < n; i++) stepFn(e); },
    pull: () => {
      const p = (pullFn(e) as number) >> 3;
      const out: Record<string, number> = { t: M.HEAPF64[p] as number };
      PULSE_REQUESTS.forEach((k, i) => { out[k] = M.HEAPF64[p + 1 + i] as number; });
      return out as Record<PulseRequest | 't', number>;
    },
    act: (json) => Boolean(actFn(e, json, 0)),
  };
}
```

- [x] **Step 4: Write `packages/validation/src/oracle/oracle.ts`**

```ts
// Pulse differential oracle (R34; docs/physiology/pulse-parameter-annex.md §C–§D). Identical scenarios run in Pulse
// (JSON actions) and in our engine (a pme-validation/1 document through the segment runner); truth values are
// compared within tolerances. Known Pulse errors are EXPECTED DISAGREEMENTS: the comparator asserts Pulse is still
// on the wrong side, so a future Pulse fix is noticed (annex §C "expect-differ").
// Patient: our adult set to Pulse's StandardMale (44 y, M, 77.1 kg, 180 cm, HR 72, BP 114/73.5; annex §D).
import type { DocCommand } from '@pme/controller/scenario';
import { runValidationDoc } from '../segments/run.ts';
import type { Grade, ValidationDoc } from '../segments/types.ts';
import type { PulseOracle, PulseRequest } from './pulse-node.ts';

export type Expect = { kind: 'agree' } | { kind: 'expect-differ'; id: string; op: '>' | '<'; value: number } | { kind: 'exclude'; id: string };
export interface Compare { id: string; ours: string; pulse: PulseRequest; pulseScale?: number; atS: number; metric: 'abs' | 'delta'; tolPct: number; expect: Expect }
export interface OracleScenario {
  id: string;
  title: string;
  durationS: number;
  pulseActions: Array<{ t: number; json: string }>;
  ours: { actions: Array<{ t: number; command: DocCommand }>; requires?: string[] };
  compare: Compare[];
}

const STANDARD_MALE = { ageY: 44, sex: 'M' as const, weightKg: 77.1, heightCm: 180, baseline: { hr: 72, sbp: 114, dbp: 74 }, sensors: { ecg: 'on', spo2: 'on', abp: 'connected', co2: 'on' } };
const ev = (event: Record<string, unknown>): DocCommand => ({ type: 'applyEvent', event } as DocCommand);
const agree: Expect = { kind: 'agree' };

export const ORACLE: OracleScenario[] = [
  {
    id: 'O1', title: 'Baseline, 10 min (StandardMale)', durationS: 600, pulseActions: [], ours: { actions: [] },
    compare: [
      { id: 'hr', ours: 'state:hr', pulse: 'HeartRate(1/min)', atS: 590, metric: 'abs', tolPct: 5, expect: agree },
      { id: 'map', ours: 'state:map', pulse: 'MeanArterialPressure(mmHg)', atS: 590, metric: 'abs', tolPct: 5, expect: agree },
      { id: 'sao2', ours: 'state:spo2', pulse: 'OxygenSaturation', pulseScale: 100, atS: 590, metric: 'abs', tolPct: 10, expect: agree },
      { id: 'etco2', ours: 'state:etco2', pulse: 'EndTidalCarbonDioxidePressure(mmHg)', atS: 590, metric: 'abs', tolPct: 10, expect: agree },
      { id: 'rr', ours: 'state:rr', pulse: 'RespirationRate(1/min)', atS: 590, metric: 'abs', tolPct: 10, expect: agree },
      { id: 'cvp', ours: 'state:cvp', pulse: 'MeanCentralVenousPressure(mmHg)', atS: 590, metric: 'abs', tolPct: 10, expect: agree },
    ],
  },
  {
    id: 'O2', title: 'Haemorrhage (Pulse RightLeg severity 0.8; ours 1100 mL over 10 min), observe 30 min', durationS: 1800,
    pulseActions: [{ t: 0, json: '{"AnyAction":[{"PatientAction":{"Hemorrhage":{"Compartment":"RightLeg","Severity":{"Scalar0To1":{"Value":0.8}}}}}]}' }],
    ours: { actions: [{ t: 0, command: ev({ kind: 'bleed', volumeMl: 1100, overS: 600 }) }], requires: ['7a', '7c'] },
    compare: [
      { id: 'hr-delta', ours: 'state:hr', pulse: 'HeartRate(1/min)', atS: 600, metric: 'delta', tolPct: 20, expect: agree },
      { id: 'map-delta', ours: 'state:map', pulse: 'MeanArterialPressure(mmHg)', atS: 600, metric: 'delta', tolPct: 20, expect: agree },
      { id: 'lactate', ours: 'state:lactate', pulse: 'Lactate-BloodConcentration(mg/dL)', atS: 1800, metric: 'abs', tolPct: 20, expect: { kind: 'expect-differ', id: 'D2', op: '<', value: 27 } },
    ],
  },
  {
    id: 'O4', title: 'Propofol bolus (Pulse 150 mg; ours 2 mg/kg)', durationS: 900,
    pulseActions: [{ t: 60, json: '{"AnyAction":[{"PatientAction":{"SubstanceBolus":{"AdministrationRoute":"Intravenous","Substance":"Propofol","Concentration":{"ScalarMassPerVolume":{"Value":10.0,"Unit":"mg/mL"}},"Dose":{"ScalarVolume":{"Value":15.0,"Unit":"mL"}}}}}]}' }],
    ours: { actions: [{ t: 60, command: ev({ kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg' }) }], requires: ['7g'] },
    compare: [
      { id: 'map-delta', ours: 'state:map', pulse: 'MeanArterialPressure(mmHg)', atS: 180, metric: 'delta', tolPct: 15, expect: agree },
      { id: 'hr-150s', ours: 'state:hr', pulse: 'HeartRate(1/min)', atS: 210, metric: 'abs', tolPct: 10, expect: { kind: 'expect-differ', id: 'D8', op: '<', value: 58 } },
    ],
  },
  {
    id: 'O-VF', title: 'Untreated VF, 30 min (guard rail + D1)', durationS: 1800,
    pulseActions: [{ t: 0, json: '{"AnyAction":[{"PatientAction":{"Arrhythmia":{"Rhythm":"CoarseVentricularFibrillation"}}}]}' }],
    ours: { actions: [{ t: 0, command: { type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' } as DocCommand }] },
    compare: [
      // MANUAL truth keeps the SBP/DBP targets through an arrest (flag 'override'); the displayed mean is what falls
      { id: 'map-60s', ours: 'numeric:abpMean', pulse: 'MeanArterialPressure(mmHg)', atS: 60, metric: 'abs', tolPct: 50, expect: agree },
      { id: 'ph-30min', ours: 'state:ph', pulse: 'BloodPH', atS: 1790, metric: 'abs', tolPct: 2, expect: { kind: 'expect-differ', id: 'D1', op: '>', value: 7.45 } },
    ],
  },
];

/** O3, O5–O12 (annex §D): added when our 7c–7g modules land and each Pulse action JSON is verified in this harness. */
export const ORACLE_BACKLOG = ['O3 crystalloid 1 L', 'O5 norepinephrine 0.1 µg/kg/min', 'O6 apnoea after FiO2 1.0', 'O7 PEEP 5 → 15 (PCV)', 'O8 FiO2 1.0 for 60 min', 'O9 hypothermia 33 °C', 'O10 glucose/insulin', 'O11 renal MAP 60', 'O12 hepatic clearance in haemorrhage'];

export interface OracleRow { scenario: string; id: string; ours: number; pulse: number; expected: string; grade: Grade; note: string }

/** agree: |ours − pulse| within tolPct of |pulse| → green, < 30 % → yellow, else red.
 *  expect-differ: green while Pulse is still on the wrong side (op value), yellow ("Pulse changed") otherwise. */
export function judge(c: Compare, ours: number, pulse: number): { grade: Grade; expected: string; note: string } {
  if (c.expect.kind === 'exclude') return { grade: 'green', expected: 'excluded', note: c.expect.id };
  if (c.expect.kind === 'expect-differ') {
    const still = c.expect.op === '>' ? pulse > c.expect.value : pulse < c.expect.value;
    return { grade: still ? 'green' : 'yellow', expected: `Pulse ${c.expect.op} ${c.expect.value} (${c.expect.id})`, note: still ? `known Pulse disagreement ${c.expect.id}` : `Pulse no longer shows ${c.expect.id}: re-check the annex row` };
  }
  if (!Number.isFinite(ours) || !Number.isFinite(pulse)) return { grade: 'red', expected: `±${c.tolPct} %`, note: 'missing value' };
  const err = (100 * Math.abs(ours - pulse)) / Math.max(Math.abs(pulse), 1e-9);
  return { grade: err <= c.tolPct ? 'green' : err < 30 ? 'yellow' : 'red', expected: `±${c.tolPct} % of Pulse`, note: `${err.toFixed(1)} %` };
}

export function oursDoc(s: OracleScenario): ValidationDoc {
  return {
    schema: 'pme-validation/1', id: `oracle-${s.id}`, title: s.title, seed: 1, durationS: s.durationS, ...(s.ours.requires ? { requires: s.ours.requires } : {}),
    scenario: { schema: 'pme-scenario/1', id: `oracle-${s.id}`, title: s.title, patient: STANDARD_MALE, initialState: 'run', states: [{ id: 'run' }] },
    actions: s.ours.actions, segments: [],
  };
}

/** Run one scenario on both engines. Our side not measurable → rows say so and grade green (not gating). */
export async function runOracle(s: OracleScenario, pulse: PulseOracle | null): Promise<{ rows: OracleRow[]; oursMeasurable: boolean }> {
  const r = await runValidationDoc(oursDoc(s));
  const at = (series: string, t: number) => {
    const pts = (r.store.series.get(series) ?? []).filter(([x]) => Math.abs(x - t) <= 5);
    return pts.length ? pts.reduce((a, [, v]) => a + v, 0) / pts.length : Number.NaN;
  };
  const pulseAt = new Map<number, Record<string, number>>();
  if (pulse) {
    const times = [...new Set([0, ...s.compare.map((c) => c.atS)])].sort((a, b) => a - b);
    const acts = [...s.pulseActions].sort((a, b) => a.t - b.t);
    let now = 0;
    let k = 0;
    for (const t of times) {
      while (k < acts.length && (acts[k] as { t: number }).t <= t) {
        const a = acts[k++] as { t: number; json: string };
        pulse.step(Math.round((a.t - now) / 0.02));
        now = a.t;
        if (!pulse.act(a.json)) throw new Error(`${s.id}: Pulse rejected ${a.json}`);
      }
      pulse.step(Math.round((t - now) / 0.02));
      now = t;
      pulseAt.set(t, pulse.pull());
    }
  }
  const rows: OracleRow[] = [];
  for (const c of s.compare) {
    const p0 = (pulseAt.get(0)?.[c.pulse] ?? Number.NaN) * (c.pulseScale ?? 1);
    const p1 = (pulseAt.get(c.atS)?.[c.pulse] ?? Number.NaN) * (c.pulseScale ?? 1);
    const ours = c.metric === 'delta' ? at(c.ours, c.atS) - at(c.ours, 5) : at(c.ours, c.atS);
    const pv = c.metric === 'delta' ? p1 - p0 : p1;
    if (!r.measurable) rows.push({ scenario: s.id, id: c.id, ours: Number.NaN, pulse: pv, expected: 'n/m', grade: 'green', note: `ours not measurable: ${r.unsupported[0]?.reason ?? ''}` });
    else if (!pulse) rows.push({ scenario: s.id, id: c.id, ours, pulse: Number.NaN, expected: 'skipped', grade: 'green', note: 'PME_PULSE_DIR not set' });
    else rows.push({ scenario: s.id, id: c.id, ours, pulse: pv, ...judge(c, ours, pv) });
  }
  return { rows, oursMeasurable: r.measurable };
}
```

- [x] **Step 5: Append two rows to `NOTICES.md`**

```markdown
| N-083 | Segment-validation method: target types EqualTo/GreaterThan/LessThan/TrendsTo/Range, 10/30 % grading, 2 % per-sample regression limit (audit N-P01/N-P02) | https://gitlab.kitware.com/physiology/engine (Pulse 4.3.2, `src/python/pulse/pipelines/validation/segment_validation.py`, `ValidationTool.java`, `csv_compare.py`) | Apache-2.0 (method only) | Method re-implemented in TypeScript in `packages/validation/src/segments/` and `src/regression/`; no code copied. Credit: Pulse Physiology Engine, Kitware, Inc. and Contributors | 2026-09-26 |
| N-084 | Pulse Physiology Engine 4.3.2 wasm as a differential-test oracle (run time only, never committed or distributed) | https://gitlab.kitware.com/physiology/engine | Apache-2.0 | `packages/validation/src/oracle/pulse-node.ts` loads a local build from `PME_PULSE_DIR`; if `pulse.wasm` is ever committed or shipped, carry Pulse's full `NOTICE` (Kitware, BioGears/ARA, Eigen, protobuf, abseil) and `LICENSE` (annex §E) | 2026-09-26 |
```

- [x] **Step 6: Run the test without and with the oracle build. Expected: 3 passed + 1 skipped; then 4 passed**

```bash
npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/oracle/oracle.test.ts
PME_PULSE_DIR=/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/research/pulse-spike/web npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/oracle/oracle.test.ts
npx -y pnpm@9.15.9 check-notices
```

- [x] **Step 7: Commit**

```bash
git add packages/validation/src/oracle packages/validation/test/oracle NOTICES.md
git commit -m "feat(validation): Pulse 4.3.2 wasm differential oracle in Node with expected-disagreement rules (R34); NOTICES N-083/N-084"
git push
```

---

### Task 17: Report writer and calibration queue

**Files:**
- Create: `packages/validation/src/report/types.ts`, `packages/validation/src/report/write.ts`
- Test: `packages/validation/test/report/write.test.ts`

**Interfaces:**
- Consumes: `MorphRow` (Task 11), `TargetResult`/`Unsupported`/`Grade` (Tasks 11–12), `WaveCompare`/`DeterminismResult` (Task 15), `OracleRow` (Task 16), `SourceId` (Task 3).
- Produces: `interface DocSummary`, `interface Report` (`schema: 'pme-validation-report/1'`), `interface QueueItem`; `calibrationQueue(r): QueueItem[]` (every yellow/red row, reds first); `gatingFailures(r): string[]` (reds + non-determinism); `renderMarkdown(r): string`; `renderQueue(q): string[]`.

- [x] **Step 1: Write the failing test `packages/validation/test/report/write.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { calibrationQueue, gatingFailures, renderMarkdown } from '../../src/report/write.ts';
import type { Report } from '../../src/report/types.ts';

const R: Report = {
  schema: 'pme-validation-report/1', createdAt: '2026-09-26T00:00:00Z', commit: 'abc1234', engineVersion: '0.0.0',
  options: { suites: ['morphology', 'sanity'], seeds: [11], maxWindows: null },
  datasets: [{ id: 'vitaldb', title: 'VitalDB (PhysioNet copy)', licence: 'CC BY 4.0', attribution: 'Lee HC et al. Sci Data 9:279 (2022).', windows: 2 }],
  morphology: [
    { band: 'V1', metric: 'rToFootMs', group: 'HR 70–90', recorded: { n: 400, median: 160, p25: 155, p75: 165 }, engine: { n: 400, median: 158, p25: 157, p75: 159 }, ks: 0.42, w1: 9.7, engineStat: 158, expected: '140–180', grade: 'green', errPct: 0, source: 'brief §9 V1' },
    { band: 'PPV', metric: 'ppvPct', group: 'all', recorded: { n: 6, median: 8.8, p25: 5, p75: 10 }, engine: { n: 6, median: 16, p25: 14, p75: 18 }, ks: 0.67, w1: 7, engineStat: 16, expected: '5.8–11.8', grade: 'red', errPct: 35, source: '[ENG]' },
  ],
  intervals: { ptbxl: 100, engine: 12 },
  segments: {
    docs: [{ id: 's1-phenylephrine', title: 'Phenylephrine', suite: 'sanity', measurable: false, unsupported: [{ t: 0, type: 'setMode', reason: 'MODELED mode arrives in Stage 7' }], requires: ['7a'], wallMs: 3 }],
    results: [{ doc: 't21-mh', segment: '10min', target: 'etco2', type: 'Range', series: 'numeric:etco2', source: 'tables §7 21', measured: 76.5, expected: '51.0–69.0', errPct: 10.9, grade: 'yellow', pass: true }],
  },
  regression: [{ case: 'sinus-75', channel: 'abp', n: 625, failed: 0, maxRelErr: 0, rms: 0, grade: 'green' }],
  determinism: { runs: 216, nonDeterministic: [], goldenChanged: [] },
  oracle: { buildHash: 'a3be71adfd49aaaaaaaa', rows: [{ scenario: 'O-VF', id: 'ph-30min', ours: Number.NaN, pulse: 10.58, expected: 'Pulse > 7.45 (D1)', grade: 'green', note: 'known Pulse disagreement D1' }], backlog: ['O3'] },
  wallS: 1234,
};

describe('report writer', () => {
  it('queues every yellow and red row, reds first', () => {
    expect(calibrationQueue(R).map((q) => [q.grade, q.suite, q.id])).toEqual([['red', 'morphology', 'PPV · all'], ['yellow', 'segments', 't21-mh/10min/etco2']]);
  });
  it('red rows and non-determinism gate; yellow does not', () => {
    expect(gatingFailures(R)).toEqual(['morphology PPV · all']);
    expect(gatingFailures({ ...R, morphology: [], determinism: { runs: 2, nonDeterministic: ['sinus/1'], goldenChanged: [] } })).toEqual(['determinism: sinus/1']);
  });
  it('renders every section, attribution and the not-measurable list', () => {
    const md = renderMarkdown(R);
    for (const s of ['# Validation report', '## Datasets and attribution', 'Lee HC et al.', '## Morphology', '| 🔴 | PPV | all |', '### Not measurable on this build', 'MODELED mode arrives in Stage 7', '## Waveform regression', '## Determinism (V9)', '## Pulse oracle', 'known Pulse disagreement D1', '## Calibration queue (R44)', 'Ali: decision']) expect(md).toContain(s);
  });
});
```

- [x] **Step 2: Run it. Expected: FAIL (modules missing)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/report/write.test.ts`

- [x] **Step 3: Write `packages/validation/src/report/types.ts`**

```ts
// The report of one `pnpm validate` run (docs/validation/report.json); report.md is rendered from it.
import type { SourceId } from '../datasets/sources.ts';
import type { MorphRow } from '../morphology/suite.ts';
import type { OracleRow } from '../oracle/oracle.ts';
import type { WaveCompare } from '../regression/baseline.ts';
import type { DeterminismResult } from '../regression/determinism.ts';
import type { Grade, TargetResult, Unsupported } from '../segments/types.ts';

export interface DocSummary { id: string; title: string; suite: 'sanity' | 'gates'; measurable: boolean; unsupported: Unsupported[]; requires: string[]; wallMs: number }

export interface Report {
  schema: 'pme-validation-report/1';
  createdAt: string;
  commit: string;
  engineVersion: string;
  options: { suites: string[]; seeds: number[]; maxWindows: number | null };
  datasets: Array<{ id: SourceId; title: string; licence: string; attribution: string; windows: number }>;
  morphology: MorphRow[];
  intervals: { ptbxl: number; engine: number } | null;
  segments: { docs: DocSummary[]; results: TargetResult[] };
  regression: WaveCompare[];
  determinism: Omit<DeterminismResult, 'hashes'> | null;
  oracle: { buildHash: string | null; rows: OracleRow[]; backlog: string[] };
  wallS: number;
}

/** One calibration-queue entry: every yellow or red row, whatever suite it came from (R44). */
export interface QueueItem { suite: string; id: string; measured: string; expected: string; grade: Exclude<Grade, 'green'>; source: string }
```

- [x] **Step 4: Write `packages/validation/src/report/write.ts`**

```ts
// report.md + report.json + calibration-queue.md (brief §9; R40 grades; R44: the calibration queue lists every row
// that fell outside its band, for Ali's calibration pass). Pure functions of the Report; the CLI writes the files.
import type { Grade } from '../segments/types.ts';
import type { QueueItem, Report } from './types.ts';

const f = (x: number | null | undefined, d = 1): string => (x === null || x === undefined || !Number.isFinite(x) ? '—' : Math.abs(x) >= 100 ? x.toFixed(0) : x.toFixed(d));
const dot: Record<Grade, string> = { green: '🟢', yellow: '🟡', red: '🔴' };
const count = (gs: Grade[]) => ({ green: gs.filter((g) => g === 'green').length, yellow: gs.filter((g) => g === 'yellow').length, red: gs.filter((g) => g === 'red').length });

export function calibrationQueue(r: Report): QueueItem[] {
  const q: QueueItem[] = [];
  for (const m of r.morphology) if (m.grade !== 'green') q.push({ suite: 'morphology', id: `${m.band} · ${m.group}`, measured: `engine ${f(m.engine.median)} vs recorded ${f(m.recorded?.median)}`, expected: m.expected, grade: m.grade, source: m.source });
  for (const t of r.segments.results) if (t.grade !== 'green') q.push({ suite: 'segments', id: `${t.doc}/${t.segment}/${t.target}`, measured: f(t.measured), expected: t.expected, grade: t.grade, source: t.source });
  for (const w of r.regression) if (w.grade !== 'green') q.push({ suite: 'regression', id: `${w.case}/${w.channel}`, measured: `${w.failed}/${w.n} samples > 2 %`, expected: 'all samples within 2 %', grade: w.grade, source: 'R40 (audit N-P02)' });
  for (const o of r.oracle.rows) if (o.grade !== 'green') q.push({ suite: 'oracle', id: `${o.scenario}/${o.id}`, measured: `ours ${f(o.ours, 2)} · Pulse ${f(o.pulse, 2)}`, expected: o.expected, grade: o.grade, source: o.note });
  return q.sort((a, b) => (a.grade === b.grade ? a.suite.localeCompare(b.suite) : a.grade === 'red' ? -1 : 1));
}

export function gatingFailures(r: Report): string[] {
  const out: string[] = [];
  for (const q of calibrationQueue(r)) if (q.grade === 'red') out.push(`${q.suite} ${q.id}`);
  if (r.determinism && r.determinism.nonDeterministic.length) out.push(`determinism: ${r.determinism.nonDeterministic.join(', ')}`);
  return out;
}

export function renderMarkdown(r: Report): string {
  const q = calibrationQueue(r);
  const all = [...r.morphology.map((m) => m.grade), ...r.segments.results.map((t) => t.grade), ...r.regression.map((w) => w.grade), ...r.oracle.rows.map((o) => o.grade)];
  const c = count(all);
  const nm = r.segments.docs.filter((d) => !d.measurable);
  const L: string[] = [];
  L.push('# Validation report', '');
  L.push(`Generated ${r.createdAt} by \`pnpm validate\` on commit \`${r.commit}\` (engine ${r.engineVersion}); ${f(r.wallS, 0)} s wall. Suites: ${r.options.suites.join(', ')}; seeds ${r.options.seeds.join(', ')}.`, '');
  L.push(`**Summary:** ${dot.green} ${c.green} · ${dot.yellow} ${c.yellow} · ${dot.red} ${c.red} graded rows; ${nm.length} documents not measurable on this build; calibration queue ${q.length} rows. Gating failures: ${gatingFailures(r).length || 'none'}.`, '');
  L.push('Grades (R40): 🟢 inside the evidence band (or within 10 % of a point target); 🟡 misses by < 30 %; 🔴 misses by ≥ 30 % or not measured. Red gates the run; yellow is reported and queued for calibration (R44).', '');
  L.push('## Datasets and attribution', '', '| Dataset | Licence | Windows | Attribution |', '|---|---|---|---|');
  for (const d of r.datasets) L.push(`| ${d.title} | ${d.licence} | ${d.windows} | ${d.attribution} |`);
  L.push('', 'Raw records stay in the git-ignored cache; this report holds derived statistics only (brief §8).', '');
  L.push('## Morphology: recorded vs engine (brief §9 V1–V5)', '', 'Same metric code on both sides; engine runs matched to each recorded window (HR, BP, site, ventilator, EtCO2).', '');
  L.push('| | Band | Group | Recorded median [IQR] (n) | Engine median [IQR] (n) | KS D | W1 | Expected | Source |', '|---|---|---|---|---|---|---|---|---|');
  for (const m of r.morphology) L.push(`| ${dot[m.grade]} | ${m.band} | ${m.group} | ${m.recorded ? `${f(m.recorded.median)} [${f(m.recorded.p25)}–${f(m.recorded.p75)}] (${m.recorded.n})` : '—'} | ${f(m.engine.median)} [${f(m.engine.p25)}–${f(m.engine.p75)}] (${m.engine.n}) | ${f(m.ks, 2)} | ${f(m.w1)} | ${m.expected} | ${m.source} |`);
  if (r.intervals) L.push('', `V5 interval bands come from ${r.intervals.ptbxl} PTB-XL NORM records measured with the engine's method; ${r.intervals.engine} engine captures.`);
  L.push('', '## Segment validation: sanity checks and gate numbers', '', '| | Document / segment / target | Measured | Expected | Source |', '|---|---|---|---|---|');
  for (const t of r.segments.results) L.push(`| ${dot[t.grade]} | ${t.doc} / ${t.segment} / ${t.target} | ${f(t.measured)} | ${t.expected} | ${t.source} |`);
  if (nm.length) {
    L.push('', '### Not measurable on this build (decision 8)', '', '| Document | Needs | Refused command |', '|---|---|---|');
    for (const d of nm) L.push(`| ${d.id} — ${d.title} | ${d.requires.join(', ') || '—'} | ${d.unsupported[0]?.type ?? ''}: ${d.unsupported[0]?.reason ?? ''} |`);
  }
  L.push('', '## Waveform regression (2 % per sample)', '', '| | Case / channel | Samples outside | Max rel. error | RMS |', '|---|---|---|---|---|');
  for (const w of r.regression) L.push(`| ${dot[w.grade]} | ${w.case} / ${w.channel} | ${w.failed}/${w.n} | ${f(100 * w.maxRelErr, 2)} % | ${w.rms.toExponential(2)} |`);
  if (!r.regression.length) L.push('| — | baselines written this run | | | |');
  if (r.determinism) L.push('', `## Determinism (V9)`, '', `${r.determinism.runs} runs; non-deterministic: ${r.determinism.nonDeterministic.join(', ') || 'none'}; changed vs the committed golden file (informational): ${r.determinism.goldenChanged.length}.`);
  L.push('', '## Pulse oracle (R34; annex §C/§D)', '', `Build: ${r.oracle.buildHash ? `\`${r.oracle.buildHash.slice(0, 16)}…\`` : 'not run (set PME_PULSE_DIR)'}.`, '', '| | Scenario / check | Ours | Pulse | Expected | Note |', '|---|---|---|---|---|---|');
  for (const o of r.oracle.rows) L.push(`| ${dot[o.grade]} | ${o.scenario} / ${o.id} | ${f(o.ours, 2)} | ${f(o.pulse, 2)} | ${o.expected} | ${o.note} |`);
  L.push('', `Backlog: ${r.oracle.backlog.join('; ')}.`);
  L.push('', '## Calibration queue (R44)', '', `${q.length} rows outside their band — the input to Ali's calibration pass. Also written to \`calibration-queue.md\`.`, '');
  L.push(...renderQueue(q));
  return `${L.join('\n')}\n`;
}

export function renderQueue(q: QueueItem[]): string[] {
  const L = ['| | Suite | Row | Measured | Expected | Source | Ali: decision |', '|---|---|---|---|---|---|---|'];
  for (const x of q) L.push(`| ${dot[x.grade]} | ${x.suite} | ${x.id} | ${x.measured} | ${x.expected} | ${x.source} | |`);
  return L;
}
```

- [x] **Step 5: Run the test. Expected: PASS (3 tests)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/report/write.test.ts`

- [x] **Step 6: Commit**

```bash
git add packages/validation/src/report packages/validation/test/report
git commit -m "feat(validation): report.md/json writer with R40 grades and the R44 calibration queue"
git push
```

---

### Task 18: `pnpm validate` and the docs/validation folder

**Files:**
- Create: `packages/validation/src/cli/validate.ts`, `docs/validation/README.md`
- Modify: root `package.json` (one script line)

**Interfaces:**
- Consumes: everything above.
- Produces: `pnpm validate [--suites …] [--quick] [--seeds …] [--max-windows N] [--rebaseline] [--full] [--out dir]` → `docs/validation/{report.md,report.json,calibration-queue.md}`; exit 1 on any red row or non-determinism.

Measured while planning: `--suites gates,regression,determinism --quick` finishes in 11 s with 12 green rows and writes all three files. Budget for the full run on this Mac: morphology ≈ 9 s per window × 70–90 windows (≈ 12–15 min), sanity ≈ 4 min, gates 40 s, determinism 21 s, oracle ≈ 10 min with Pulse — ≈ 30 min; CI's 2 vCPUs ≈ 2×.

- [x] **Step 1: Write `packages/validation/src/cli/validate.ts`**

```ts
// `pnpm validate` (root) → docs/validation/report.md, report.json, calibration-queue.md. Entry-only module.
// Flags: --suites morphology,intervals,sanity,gates,regression,determinism,oracle (default: all)
//        --quick (4 recorded windows, 30 PTB-XL records, 1 determinism seed)  --seeds 11,12  --max-windows N  --full (40 seeds)
//        --rebaseline (rewrite waveform baselines + golden hashes)  --out <dir> (default docs/validation)
// Exit 1 when any red row or a non-deterministic run exists (yellow never fails the run; R40).
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { version as engineVersion } from '@pme/engine-core';
import { cacheDir } from '../datasets/cache.ts';
import { readManifest } from '../datasets/manifest.ts';
import { pwdbStats, PWDB_FILES, PWDB_RECORD } from '../datasets/pwdb.ts';
import { SOURCES } from '../datasets/sources.ts';
import { fetchZenodo } from '../datasets/fetch-zenodo.ts';
import { engineIntervals, intervalFills, ptbxlIntervals } from '../morphology/intervals-suite.ts';
import { gradePairs, measurePairs } from '../morphology/suite.ts';
import { loadPulse, pulseDir } from '../oracle/pulse-node.ts';
import { ORACLE, ORACLE_BACKLOG, runOracle, type OracleRow } from '../oracle/oracle.ts';
import { runRegression } from '../regression/baseline.ts';
import { runDeterminism, writeGolden } from '../regression/determinism.ts';
import { runValidationDoc } from '../segments/run.ts';
import type { ValidationDoc } from '../segments/types.ts';
import { calibrationQueue, gatingFailures, renderMarkdown, renderQueue } from '../report/write.ts';
import type { DocSummary, Report } from '../report/types.ts';
import { GATE_DOCS } from '../../suites/gates/gate-docs.ts';
import { SANITY_DOCS } from '../../suites/sanity/sanity-docs.ts';
import induction from '../../suites/sanity/or-induction-hypotension.json';

const ALL = ['morphology', 'intervals', 'sanity', 'gates', 'regression', 'determinism', 'oracle'];
const arg = (k: string) => {
  const i = process.argv.indexOf(k);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const has = (k: string) => process.argv.includes(k);
const quick = has('--quick');
const suites = (arg('--suites') ?? ALL.join(',')).split(',');
const seeds = (arg('--seeds') ?? '11').split(',').map(Number);
const maxWindows = arg('--max-windows') ? Number(arg('--max-windows')) : quick ? 4 : null;
const repoRoot = resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const outDir = resolve(repoRoot, arg('--out') ?? 'docs/validation');
const log = (m: string) => process.stderr.write(`${m}\n`);
const t0 = performance.now();
const cache = cacheDir();
const on = (s: string) => suites.includes(s);

const fills: Record<string, { min: number; max: number }> = {};
let intervals: Report['intervals'] = null;
let engIv: ReturnType<typeof engineIntervals> = [];
if (on('intervals')) {
  const ref = await ptbxlIntervals(cache, quick ? 30 : 100);
  engIv = engineIntervals();
  Object.assign(fills, intervalFills(ref));
  intervals = { ptbxl: ref.length, engine: engIv.length };
}
let morphology: Report['morphology'] = [];
if (on('morphology')) {
  const pw = pwdbStats(new TextDecoder().decode(await fetchZenodo(cache, PWDB_RECORD, PWDB_FILES.indices.file, PWDB_FILES.indices.md5)), ['Radial']);
  fills['pwdb-rise'] = { min: Math.min(...pw.map((p) => p.sysAfterFootMs[0])), max: Math.max(...pw.map((p) => p.sysAfterFootMs[2])) };
  const pairs = await measurePairs({ cache, seeds, onProgress: log, ...(maxWindows !== null ? { maxWindows } : {}) });
  if (on('intervals')) {
    // engine intervals join the morphology table as one pseudo-window (V5 bands are absolute: PTB-XL p10–p90)
    const eng = engIv;
    const nan = Number.NaN;
    const blank = { hr: nan, beats: 0, rToFootMs: [], footToPeakMs: [], rToNotchMs: [], notchDepth: [], notchMinimumFrac: nan, upstrokeSlope: [], sys: [], dia: [], alpha: [], slopeIII: [], plateau: [], co2Calibrated: false, resp: null, ppgDelayMs: [], ppgShapeR: nan, ppgCountRatio: nan, hrErr: [], nibpMinusAbp: [] };
    const iv = { ...blank, qtcMs: eng.map((e) => e.qtcMs), prMs: eng.map((e) => e.prMs), qrsMs: eng.map((e) => e.qrsMs) };
    const w = { source: 'vitaldb' as const, record: 'capture12', fromS: 0, toS: 10, site: 'unknown' as const, hr: nan, sbp: nan, dbp: nan, etco2: null, vent: null, ageY: null, sex: null, tags: [] };
    pairs.push({ window: w, recorded: blank, engine: iv as never, wallMs: 0 });
  }
  morphology = gradePairs(pairs, fills);
}

const docs: Array<{ suite: 'sanity' | 'gates'; doc: ValidationDoc }> = [
  ...(on('sanity') ? [induction as unknown as ValidationDoc, ...SANITY_DOCS].map((doc) => ({ suite: 'sanity' as const, doc })) : []),
  ...(on('gates') ? GATE_DOCS.map((doc) => ({ suite: 'gates' as const, doc })) : []),
];
const summaries: DocSummary[] = [];
const results: Report['segments']['results'] = [];
for (const { suite, doc } of docs) {
  const r = await runValidationDoc(doc);
  summaries.push({ id: doc.id, title: doc.title, suite, measurable: r.measurable, unsupported: r.unsupported, requires: doc.requires ?? [], wallMs: r.wallMs });
  results.push(...r.results);
  log(`${suite} ${doc.id}: ${r.measurable ? `${r.results.length} targets` : 'not measurable'} (${(r.wallMs / 1000).toFixed(1)} s)`);
}

const regression = on('regression') ? await runRegression({ rebaseline: has('--rebaseline') }) : [];
let determinism: Report['determinism'] = null;
if (on('determinism')) {
  const d = await runDeterminism(has('--full') ? Array.from({ length: 40 }, (_, i) => i + 1) : quick ? [1] : [1, 2, 3]);
  if (has('--rebaseline')) writeGolden(d.hashes);
  determinism = { runs: d.runs, nonDeterministic: d.nonDeterministic, goldenChanged: d.goldenChanged };
}
const oracle: Report['oracle'] = { buildHash: null, rows: [] as OracleRow[], backlog: ORACLE_BACKLOG };
if (on('oracle')) {
  const dir = pulseDir();
  for (const s of ORACLE) {
    const p = dir ? await loadPulse(dir) : null;
    if (p) oracle.buildHash = p.buildHash;
    oracle.rows.push(...(await runOracle(s, p)).rows);
    log(`oracle ${s.id}${dir ? '' : ' (Pulse skipped: PME_PULSE_DIR unset)'}`);
  }
}

const windows = (src: 'vitaldb' | 'mghdb') => readManifest(src)?.windows.length ?? 0;
let commit = 'unknown';
try {
  commit = execSync('git rev-parse --short HEAD', { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch { /* not a git checkout */ }
const report: Report = {
  schema: 'pme-validation-report/1', createdAt: new Date().toISOString(), commit, engineVersion,
  options: { suites, seeds, maxWindows },
  datasets: [
    { ...pick('vitaldb'), windows: windows('vitaldb') }, { ...pick('mghdb'), windows: windows('mghdb') },
    { ...pick('pwdb'), windows: 0 }, { ...pick('ptbxl'), windows: intervals?.ptbxl ?? 0 },
  ],
  morphology, intervals, segments: { docs: summaries, results }, regression, determinism, oracle,
  wallS: (performance.now() - t0) / 1000,
};
function pick(id: 'vitaldb' | 'mghdb' | 'pwdb' | 'ptbxl') {
  const s = SOURCES[id];
  return { id, title: s.title, licence: s.licence, attribution: s.attribution };
}
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'report.json'), `${JSON.stringify(report, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? null : v), 1)}\n`);
writeFileSync(join(outDir, 'report.md'), renderMarkdown(report));
writeFileSync(join(outDir, 'calibration-queue.md'), `# Calibration queue (R44)\n\nFrom \`pnpm validate\` at ${report.createdAt}, commit \`${commit}\`. Every row outside its band; fill the last column during the calibration pass.\n\n${renderQueue(calibrationQueue(report)).join('\n')}\n`);
const fail = gatingFailures(report);
log(`report: ${join(outDir, 'report.md')} — ${calibrationQueue(report).length} queued, ${fail.length} gating`);
process.exit(fail.length ? 1 : 0);
```

- [x] **Step 2: Add the root script. In `package.json` (root), in `"scripts"`, after `"test:e2e": "playwright test",` add:**

```json
    "validate": "pnpm --filter @pme/validation validate",
```

- [x] **Step 3: Write `docs/validation/README.md`** (the four-backtick fence is only the plan's wrapper)

````markdown
# Validation (Stage 8a)

`pnpm validate` measures the engine against recorded patients and against its own evidence bands, and writes three
files here:

| File | What |
|---|---|
| `report.md` | Every graded row: morphology (recorded vs matched engine, brief §9 V1–V5), sanity and gate documents (segment validation), waveform regression (2 % per sample), determinism (V9), the Pulse oracle, datasets and attribution. |
| `report.json` | The same, machine-readable (`pme-validation-report/1`). |
| `calibration-queue.md` | Every yellow or red row — the input to Ali's calibration pass (R44), with an empty "decision" column. |

Grades (R40, after Pulse's segment validation, method only): 🟢 inside the evidence band (or within 10 % of a point
target); 🟡 misses by less than 30 %; 🔴 misses by 30 % or more, or was not measured. Red fails the run; yellow never
does. Documents whose commands the current engine refuses ("arrives in Stage 7") are listed as *not measurable*.

## Commands (from the repo root)

```bash
npx -y pnpm@9.15.9 --filter @pme/validation datasets:fetch        # download what the manifests list (≈ 1 GB, cached)
npx -y pnpm@9.15.9 validate                                        # everything (≈ 30–60 min)
npx -y pnpm@9.15.9 validate --quick                                # 4 recorded windows, fewer seeds (≈ 5 min)
npx -y pnpm@9.15.9 validate --suites sanity,gates                  # a subset
PME_PULSE_DIR=../research/pulse-spike/web npx -y pnpm@9.15.9 validate --suites oracle
npx -y pnpm@9.15.9 validate --rebaseline                           # rewrite waveform baselines + golden hashes (review the diff!)
```

`PME_DATASET_CACHE` moves the cache (default `packages/validation/datasets/cache/`, git-ignored). Raw records never
enter git; only manifests (ids, window times, hashes) and derived statistics do (brief §8).

## Datasets and licences

VitalDB 1.0.0, PhysioNet copy (CC BY 4.0) · MGH/MF Waveform DB 1.0.0 (ODC-By 1.0) · PWDB 0.1.0 (PDDL 1.0) · PTB-XL
1.0.3 (CC BY 4.0) · CUDB and MIT-BIH (ODC-By 1.0, Stage 5 templates). Attribution text: `NOTICES.md` N-050…N-052,
N-080…N-084 and the report's dataset table.

## CI

`.github/workflows/validation.yml` runs weekly, on manual dispatch, and on a pull request carrying the
`run-validation` label — never on every push (it is long). The unit tests of the metrics run in the normal CI.

## Human reviews

- Blind realism review (brief §9): `validation-review.html` — see `docs/validation/review/README.md`.
- Saadat bedside checklist (research/06 §7): `validation-bedside.html` — results in `docs/validation/bedside/`.
- Performance: `validation-perf.html` and the soak (`playwright.validation.config.ts`); iPad numbers are manual.
````

- [x] **Step 4: Typecheck and a quick run. Expected: typecheck clean; the run prints one line per document and `report: …/report.md — 0 queued, 0 gating`, exit 0**

```bash
npx -y pnpm@9.15.9 --filter @pme/validation typecheck
npx -y pnpm@9.15.9 validate --suites gates,regression,determinism --quick --out /tmp/pme-8a-val
head -20 /tmp/pme-8a-val/report.md
```

- [x] **Step 5: Commit**

```bash
git add packages/validation/src/cli/validate.ts docs/validation/README.md package.json
git commit -m "feat(validation): pnpm validate writes docs/validation/report.md, report.json and the calibration queue"
git push
```

---

### Task 19: Scheduled/labelled validation workflow

**Files:**
- Create: `.github/workflows/validation.yml`

**Interfaces:**
- Consumes: Task 18 (`pnpm validate`), Task 6 (`datasets:fetch`, manifests as the cache key), Task 23 (`playwright.validation.config.ts`; the workflow's last step fails until Task 23 lands — create the file now, it is only run by schedule/label).
- Produces: a workflow that never runs on plain pushes.

- [x] **Step 1: Write `.github/workflows/validation.yml`**

```yaml
name: validation

# Long (30–60 min): never on every push. Weekly, on demand, or when a PR carries the `run-validation` label.
on:
  schedule:
    - cron: '0 2 * * 1'
  workflow_dispatch:
    inputs:
      args:
        description: 'extra flags for pnpm validate (e.g. --quick)'
        required: false
        default: ''
  pull_request:
    types: [labeled, synchronize]

jobs:
  validate:
    if: github.event_name != 'pull_request' || contains(github.event.pull_request.labels.*.name, 'run-validation')
    runs-on: ubuntu-latest
    timeout-minutes: 180
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: actions/cache@v4
        with:
          path: packages/validation/datasets/cache
          key: datasets-${{ hashFiles('packages/validation/datasets/manifests/*.json') }}
      - run: pnpm --filter @pme/validation datasets:fetch
      - run: pnpm validate ${{ github.event.inputs.args }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: validation-report
          path: docs/validation/
          if-no-files-found: error
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: soak-and-perf
          path: docs/validation/perf/
          if-no-files-found: ignore
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm exec playwright test -c playwright.validation.config.ts
```

- [x] **Step 2: Check the YAML parses and that the push CI is untouched. Expected: `ok`, and `ci.yml` unchanged**

```bash
node -e "const y=require('node:fs').readFileSync('.github/workflows/validation.yml','utf8'); if(!/schedule:/.test(y)||/\n  push:/.test(y)) throw new Error('bad triggers'); console.log('ok')"
git diff --stat origin/main -- .github/workflows/ci.yml
```

- [x] **Step 3: Create the label once (needs `gh` auth; skip if it exists)**

```bash
gh label create run-validation --description "Run the long validation workflow on this PR" --color 0E8A16 || true
```

- [x] **Step 4: Commit**

```bash
git add .github/workflows/validation.yml
git commit -m "ci(validation): weekly / manual / run-validation-label workflow; datasets cached by manifest hash"
git push
```

---

### Task 20: Blind review kit — clip bundle and scoring

**Files:**
- Create: `packages/validation/src/review/types.ts`, `packages/validation/src/review/clips.ts`, `packages/validation/src/review/cli-clips.ts`, `packages/validation/src/review/score.ts`, `packages/validation/src/review/cli-score.ts`
- Modify: `packages/validation/package.json` (scripts `review:build` → `src/review/cli-clips.ts`, `review:score` → `src/review/cli-score.ts`, `bedside:apply` → `src/bedside/cli-apply.ts`; Task 1's list named library files — entry-only CLIs are separate, see Task 6)
- Test: `packages/validation/test/review/review.test.ts`

**Interfaces:**
- Consumes: Tasks 4–6 (loaders, manifests), 10 (`matchedRun`), Stage 5 `bandpassZeroPhase`, `resample`.
- Produces: `ReviewChannel`, `ReviewClip`, `ReviewBundle` (`pme-review-bundle/1`), `KeyEntry`, `ReviewKey` (`pme-review-key/1`), `Answer`, `ReviewAnswers` (`pme-review-answers/1`); `CLIP_S = 10`, `toClip(w, ch, id)`, `shuffle(xs, rnd?)`, `buildBundle(cache, perChannel = 20, seed = 101)`; `ChannelScore`, `scoreReview(bundle, key, answers)`, `scoreMarkdown(answers, scores)`.

Design (decision 12, brief §9): N = 20 real + 20 synthetic clips per channel (ECG II, ABP, pleth, CO2), synthetic ones from engine runs matched to the same windows, all resampled to the engine's rates, recorded ECG band-passed 0.5–40 Hz like the monitor filter; MGH/MF CO2 is excluded (uncalibrated). The bundle and its key stay in the cache (they contain recorded samples); only the scored results are committed. A second clinician gets the same `bundle.json` and a fresh page session — the page shuffles per rater.

- [x] **Step 1: Write the failing test `packages/validation/test/review/review.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { shuffle, toClip } from '../../src/review/clips.ts';
import { scoreMarkdown, scoreReview } from '../../src/review/score.ts';
import type { ReviewAnswers, ReviewBundle, ReviewKey } from '../../src/review/types.ts';

describe('clip preparation', () => {
  it('cuts 10 s from the middle at the engine rate (360 → 500 Hz ECG, band-passed)', () => {
    const w = { fs: 360, x: Float64Array.from({ length: 300 * 360 }, (_, i) => Math.sin((2 * Math.PI * i) / 360)) };
    const c = toClip(w, 'ecgII', 'abcd');
    expect(c).toMatchObject({ id: 'abcd', fs: 500, unit: 'mV', range: null });
    expect(c.x.length).toBe(5000);
  });
  it('shuffle keeps every element', () => {
    expect(shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('scoring (brief §9 step 4)', () => {
  const ids = Array.from({ length: 20 }, (_, i) => `c${i}`);
  const bundle: ReviewBundle = { schema: 'pme-review-bundle/1', session: 's1', createdAt: '', clips: ids.map((id) => ({ id, channel: 'abp', fs: 125, unit: 'mmHg', range: [0, 150], x: [] })) };
  const key: ReviewKey = { schema: 'pme-review-key/1', session: 's1', entries: Object.fromEntries(ids.map((id, i) => [id, { kind: i % 2 ? 'synthetic' : 'real', source: 'vitaldb', record: 'x', fromS: 0 }])) };
  it('chance-level guessing with high synthetic ratings passes', () => {
    const ans: ReviewAnswers = { schema: 'pme-review-answers/1', session: 's1', rater: 'Ali', startedAt: 'a', finishedAt: 'b', answers: ids.map((id, i) => ({ id, guess: i % 4 < 2 ? 'real' : 'synthetic', realism: 4, comment: i === 3 ? 'notch too deep' : '', order: i })) };
    const [s] = scoreReview(bundle, key, ans);
    expect(s).toMatchObject({ channel: 'abp', n: 20, accuracy: 0.5, realismReal: 4, realismSynthetic: 4, gap: 0, pass: { accuracy: true, synthetic: true, gap: true } });
    expect(s?.pBinomial).toBeCloseTo(1, 5);
    expect(scoreMarkdown(ans, [s!])).toContain('`c3`: notch too deep');
  });
  it('perfect identification fails and is significant', () => {
    const ans: ReviewAnswers = { schema: 'pme-review-answers/1', session: 's1', rater: 'Ali', startedAt: 'a', finishedAt: 'b', answers: ids.map((id, i) => ({ id, guess: i % 2 ? 'synthetic' : 'real', realism: i % 2 ? 2 : 5, comment: '', order: i })) };
    const [s] = scoreReview(bundle, key, ans);
    expect(s).toMatchObject({ accuracy: 1, realismSynthetic: 2, gap: 3, pass: { accuracy: false, synthetic: false, gap: false } });
    expect(s?.pBinomial).toBeLessThan(0.001);
  });
});
```

- [x] **Step 2: Run it. Expected: FAIL (modules missing)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/review/review.test.ts`

- [x] **Step 3: Write `packages/validation/src/review/types.ts`**

```ts
// Blind realism review (brief §9 "Realism review protocol"): bundle → page → answers → score.
export type ReviewChannel = 'ecgII' | 'abp' | 'pleth' | 'co2';
export interface ReviewClip { id: string; channel: ReviewChannel; fs: number; unit: string; range: [number, number] | null; x: number[] }
export interface ReviewBundle { schema: 'pme-review-bundle/1'; session: string; createdAt: string; clips: ReviewClip[] }
export interface KeyEntry { kind: 'real' | 'synthetic'; source: string; record: string; fromS: number; seed?: number }
export interface ReviewKey { schema: 'pme-review-key/1'; session: string; entries: Record<string, KeyEntry> }
export interface Answer { id: string; guess: 'real' | 'synthetic'; realism: 1 | 2 | 3 | 4 | 5; comment: string; order: number }
export interface ReviewAnswers { schema: 'pme-review-answers/1'; session: string; rater: string; startedAt: string; finishedAt: string; answers: Answer[] }
```

- [x] **Step 4: Write `packages/validation/src/review/clips.ts`**

```ts
// Build a blind-review bundle (brief §9 step 1–2): per channel N real 10 s segments (VitalDB, MGH/MF manifest
// windows) and N synthetic ones from engine runs matched to the same windows, all resampled to the engine's rates
// and passed through the monitor's ECG band (0.5–40 Hz) so only the signal differs; the page draws them with the
// renderer's SweepLane. Clip ids are random; the key (real/synthetic, source) is written NEXT TO the bundle in the
// cache — never committed, never shown to the rater. Recorded samples stay in the cache (brief §8).
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseHeader } from '../templates/wfdb.ts';
import { bandpassZeroPhase, resample } from '../templates/dsp.ts';
import { matchedRun } from '../engine/match.ts';
import { readManifest } from '../datasets/manifest.ts';
import { MGHDB, mghMeta, mghSignals } from '../datasets/mghdb.ts';
import type { AnalysisWindow, Signals, Wave } from '../datasets/signals.ts';
import { loadCase, vitaldbSignals, vitaldbSums } from '../datasets/vitaldb.ts';
import type { ReviewBundle, ReviewChannel, ReviewClip, ReviewKey } from './types.ts';

export const CLIP_S = 10;
const RATE: Record<ReviewChannel, number> = { ecgII: 500, abp: 125, pleth: 125, co2: 62.5 };
const UNIT: Record<ReviewChannel, string> = { ecgII: 'mV', abp: 'mmHg', pleth: '', co2: 'mmHg' };
const RANGE: Record<ReviewChannel, [number, number] | null> = { ecgII: null, abp: [0, 150], pleth: null, co2: [0, 50] };

const pickWave = (s: Signals, ch: ReviewChannel): Wave | undefined => (ch === 'ecgII' ? s.ecg : ch === 'abp' ? s.abp : ch === 'pleth' ? s.pleth : s.co2);

/** A 10 s clip from the middle of a window, at the engine rate, ECG band-passed like the monitor filter. */
export function toClip(w: Wave, ch: ReviewChannel, id: string): ReviewClip {
  const mid = w.x.length / w.fs / 2;
  const a = Math.round((mid - CLIP_S / 2) * w.fs);
  let x: Float64Array = w.x.slice(Math.max(0, a), Math.max(0, a) + Math.round(CLIP_S * w.fs));
  if (ch === 'ecgII') x = bandpassZeroPhase(x, w.fs, 0.5, 40);
  if (w.fs !== RATE[ch]) x = resample(x, w.fs, RATE[ch]);
  return { id, channel: ch, fs: RATE[ch], unit: UNIT[ch], range: RANGE[ch], x: Array.from(x, (v) => Math.round(v * 1000) / 1000) };
}

export function shuffle<T>(xs: T[], rnd: () => number = Math.random): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

export async function buildBundle(cache: string, perChannel = 20, seed = 101): Promise<{ bundle: ReviewBundle; key: ReviewKey }> {
  const session = `r${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomBytes(2).toString('hex')}`;
  const windows: AnalysisWindow[] = [...(readManifest('vitaldb')?.windows ?? []), ...(readManifest('mghdb')?.windows ?? [])];
  const sums = await vitaldbSums(cache);
  const clips: ReviewClip[] = [];
  const key: ReviewKey = { schema: 'pme-review-key/1', session, entries: {} };
  const count: Record<ReviewChannel, number> = { ecgII: 0, abp: 0, pleth: 0, co2: 0 };
  for (const w of windows) {
    if (Object.values(count).every((n) => n >= perChannel)) break;
    let rec: Signals;
    if (w.source === 'vitaldb') rec = vitaldbSignals(await loadCase(cache, w.record, sums), w);
    else {
      const hea = readFileSync(join(cache, MGHDB, `${w.record}.hea`), 'latin1');
      rec = mghSignals(parseHeader(hea), mghMeta(hea), new Uint8Array(readFileSync(join(cache, MGHDB, `${w.record}.dat`))), w.fromS, w.toS);
    }
    const syn = (await matchedRun(w, seed)).signals;
    for (const ch of ['ecgII', 'abp', 'pleth', 'co2'] as const) {
      const r = pickWave(rec, ch);
      const s = pickWave(syn, ch);
      if (!r || !s || count[ch] >= perChannel || (ch === 'co2' && rec.co2Calibrated === false)) continue;
      const idR = randomBytes(4).toString('hex');
      const idS = randomBytes(4).toString('hex');
      clips.push(toClip(r, ch, idR), toClip(s, ch, idS));
      key.entries[idR] = { kind: 'real', source: w.source, record: w.record, fromS: w.fromS };
      key.entries[idS] = { kind: 'synthetic', source: w.source, record: w.record, fromS: w.fromS, seed };
      count[ch]++;
    }
  }
  return { bundle: { schema: 'pme-review-bundle/1', session, createdAt: new Date().toISOString(), clips: shuffle(clips) }, key };
}
```

- [x] **Step 5: Write `packages/validation/src/review/cli-clips.ts`**

```ts
// Entry-only: pnpm --filter @pme/validation review:build [--per-channel 20]
// Writes <cache>/review/<session>/bundle.json (open it in validation-review.html) and key.json (keep it away from raters).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cacheDir } from '../datasets/cache.ts';
import { buildBundle } from './clips.ts';

const i = process.argv.indexOf('--per-channel');
const n = i >= 0 ? Number(process.argv[i + 1]) : 20;
const { bundle, key } = await buildBundle(cacheDir(), n);
const dir = join(cacheDir(), 'review', bundle.session);
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'bundle.json'), JSON.stringify(bundle));
writeFileSync(join(dir, 'key.json'), JSON.stringify(key, null, 1));
console.log(`${bundle.clips.length} clips → ${join(dir, 'bundle.json')} (key: key.json, do not share)`);
```

- [x] **Step 6: Write `packages/validation/src/review/score.ts`**

```ts
// Scoring of one rater's blind review (brief §9 step 4): per channel, identification accuracy (chance 50 %; pass
// ≤ 60 %), mean realism of synthetic clips (pass ≥ 4.0) and the real − synthetic gap (pass ≤ 0.5 [ENG]), with an
// exact two-sided binomial p for "accuracy ≠ 50 %". Entry: `pnpm --filter @pme/validation review:score --key K
// --answers A [--out docs/validation/review]` writes <session>-<rater>.md/.json (derived numbers only).
import type { ReviewAnswers, ReviewChannel, ReviewKey, ReviewBundle } from './types.ts';

export interface ChannelScore { channel: ReviewChannel; n: number; accuracy: number; pBinomial: number; realismReal: number; realismSynthetic: number; gap: number; pass: { accuracy: boolean; synthetic: boolean; gap: boolean } }

function binom(k: number, n: number): number {
  let lg = 0;
  for (let i = 1; i <= n; i++) lg += Math.log(i);
  const lf = (m: number) => { let s = 0; for (let i = 2; i <= m; i++) s += Math.log(i); return s; };
  let p = 0;
  const pk = Math.exp(lg - lf(k) - lf(n - k) - n * Math.LN2);
  for (let j = 0; j <= n; j++) {
    const pj = Math.exp(lg - lf(j) - lf(n - j) - n * Math.LN2);
    if (pj <= pk + 1e-12) p += pj;
  }
  return Math.min(1, p);
}

export function scoreReview(bundle: ReviewBundle, key: ReviewKey, ans: ReviewAnswers): ChannelScore[] {
  if (key.session !== ans.session || bundle.session !== key.session) throw new Error('bundle, key and answers come from different sessions');
  const byId = new Map(bundle.clips.map((c) => [c.id, c]));
  const out: ChannelScore[] = [];
  for (const channel of ['ecgII', 'abp', 'pleth', 'co2'] as const) {
    const a = ans.answers.filter((x) => byId.get(x.id)?.channel === channel);
    if (!a.length) continue;
    const correct = a.filter((x) => key.entries[x.id]?.kind === x.guess).length;
    const mean = (kind: 'real' | 'synthetic') => {
      const r = a.filter((x) => key.entries[x.id]?.kind === kind).map((x) => x.realism);
      return r.length ? r.reduce((p, q) => p + q, 0) / r.length : Number.NaN;
    };
    const accuracy = correct / a.length;
    const rr = mean('real');
    const rs = mean('synthetic');
    out.push({ channel, n: a.length, accuracy, pBinomial: binom(correct, a.length), realismReal: rr, realismSynthetic: rs, gap: rr - rs, pass: { accuracy: accuracy <= 0.6, synthetic: rs >= 4.0, gap: rr - rs <= 0.5 } });
  }
  return out;
}

export function scoreMarkdown(ans: ReviewAnswers, s: ChannelScore[]): string {
  const f = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : '—');
  const ok = (b: boolean) => (b ? 'pass' : '**fail**');
  const L = [`# Blind realism review — ${ans.rater}, session ${ans.session}`, '', `${ans.startedAt} → ${ans.finishedAt}. Pass (brief §9): identification ≤ 60 % per channel (chance 50 %), mean synthetic realism ≥ 4.0, real − synthetic ≤ 0.5.`, '',
    '| Channel | n | Identified | p (≠ 50 %) | Realism real | Realism synthetic | Gap | Verdict |', '|---|---|---|---|---|---|---|---|'];
  for (const c of s) L.push(`| ${c.channel} | ${c.n} | ${f(100 * c.accuracy, 0)} % | ${f(c.pBinomial, 3)} | ${f(c.realismReal)} | ${f(c.realismSynthetic)} | ${f(c.gap)} | ${ok(c.pass.accuracy)} / ${ok(c.pass.synthetic)} / ${ok(c.pass.gap)} |`);
  const comments = ans.answers.filter((a) => a.comment.trim());
  if (comments.length) L.push('', '## Comments (clip id → comment)', '', ...comments.map((a) => `- \`${a.id}\`: ${a.comment.replace(/\n/g, ' ')}`));
  return `${L.join('\n')}\n`;
}
```

- [x] **Step 7: Write `packages/validation/src/review/cli-score.ts`**

```ts
// Entry-only: pnpm --filter @pme/validation review:score --bundle B --key K --answers A [--out dir]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoreMarkdown, scoreReview } from './score.ts';

const arg = (k: string) => {
  const i = process.argv.indexOf(k);
  if (i < 0 || !process.argv[i + 1]) throw new Error(`missing ${k}`);
  return process.argv[i + 1] as string;
};
const read = (k: string) => JSON.parse(readFileSync(arg(k), 'utf8'));
const ans = read('--answers');
const s = scoreReview(read('--bundle'), read('--key'), ans);
const out = process.argv.includes('--out') ? arg('--out') : resolve(fileURLToPath(new URL('../../../../docs/validation/review', import.meta.url)));
mkdirSync(out, { recursive: true });
const base = join(out, `${ans.session}-${String(ans.rater).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
writeFileSync(`${base}.md`, scoreMarkdown(ans, s));
writeFileSync(`${base}.json`, `${JSON.stringify({ session: ans.session, rater: ans.rater, scores: s }, null, 1)}\n`);
console.log(`${base}.md`);
```

- [x] **Step 8: Point the three scripts in `packages/validation/package.json` at the entry files:**

```json
    "review:build": "vite-node src/review/cli-clips.ts",
    "review:score": "vite-node src/review/cli-score.ts",
    "bedside:apply": "vite-node src/bedside/cli-apply.ts",
```

- [x] **Step 9: Run the test and build one real bundle (needs Task 6's cache). Expected: PASS (4 tests); the build prints `160 clips → …/bundle.json` (fewer if the manifests have fewer windows)**

```bash
npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/review/review.test.ts
npx -y pnpm@9.15.9 --filter @pme/validation review:build --per-channel 20
```

- [x] **Step 10: Commit**

```bash
git add packages/validation/src/review packages/validation/test/review packages/validation/package.json
git commit -m "feat(validation): blind realism review bundle (real vs matched synthetic, hidden key) and scoring"
git push
```

---

### Task 21: Blind review page

**Files:**
- Create: `apps/demo/validation-review.html`, `apps/demo/src/validation/review.ts`, `apps/demo/e2e/validation-review.e2e.ts`, `docs/validation/review/README.md`
- Modify: `apps/demo/vite.config.ts` (one input entry)

**Interfaces:**
- Consumes: `SweepLane`, `WAVE_STYLE`, `scaleFor`, `DEFAULT_PX_PER_MM` from `@pme/renderer` (unchanged); a Task 20 bundle.
- Produces: a static page that saves answers as `pme-review-answers/1` JSON for `review:score`.

Measured while planning: the e2e test (two synthetic clips) passes in 1.6 s on system Chrome; the canvas shows > 50 lit pixels after 0.6 s; no page errors.

- [ ] **Step 1: Add the page to `apps/demo/vite.config.ts`: after the `'stage6b-acls': page('stage6b-acls'),` line add**

```ts
        'validation-review': page('validation-review'), // Stage 8a
```

- [ ] **Step 2: Write the failing e2e test `apps/demo/e2e/validation-review.e2e.ts`**

```ts
// Stage 8a: the blind review page loads a bundle, draws a clip, records two answers and downloads them.
// Run: PW_SYSTEM_CHROME=1 pnpm exec playwright test apps/demo/e2e/validation-review.e2e.ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});
test.afterAll(async () => vite?.close());

const sine = (fs: number, f: number, a: number, o: number) => Array.from({ length: 10 * fs }, (_, i) => o + a * Math.sin((2 * Math.PI * f * i) / fs));
const BUNDLE = {
  schema: 'pme-review-bundle/1', session: 'rtest', createdAt: '',
  clips: [
    { id: 'aaaa', channel: 'abp', fs: 125, unit: 'mmHg', range: [0, 150], x: sine(125, 1.2, 20, 95) },
    { id: 'bbbb', channel: 'ecgII', fs: 500, unit: 'mV', range: null, x: sine(500, 1.2, 0.5, 0) },
  ],
};

test('rate two clips and download the answers', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/validation-review.html`);
  await page.fill('#rater', 'Test Rater');
  await page.setInputFiles('#file', { name: 'bundle.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(BUNDLE)) });
  await expect(page.locator('#status')).toContainText('Clip 1 of 2');
  await page.waitForTimeout(600);
  const inked = await page.evaluate(() => {
    const c = document.getElementById('lane') as HTMLCanvasElement;
    const d = (c.getContext('2d') as CanvasRenderingContext2D).getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if ((d[i] as number) + (d[i + 1] as number) + (d[i + 2] as number) > 150) n++;
    return n;
  });
  expect(inked).toBeGreaterThan(50); // the sweep has drawn a trace
  for (const g of ['real', 'synthetic']) {
    await page.click(`button[data-guess=${g}]`);
    await page.click('button[data-r="4"]');
    await page.click('#next');
  }
  await expect(page.locator('#status')).toContainText('Done: 2 clips rated');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#save')]);
  const answers = JSON.parse(readFileSync((await dl.path()) as string, 'utf8'));
  expect(answers).toMatchObject({ schema: 'pme-review-answers/1', session: 'rtest', rater: 'Test Rater' });
  expect(answers.answers.map((a: { guess: string }) => a.guess)).toEqual(['real', 'synthetic']);
  expect(errors).toEqual([]);
});
```

- [ ] **Step 3: Run it. Expected: FAIL (page missing, 404)**

Run: `PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/validation-review.e2e.ts`

- [ ] **Step 4: Write `apps/demo/validation-review.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Blind realism review</title>
    <style>
      body { background: #111; color: #ddd; font: 15px system-ui, sans-serif; margin: 16px; max-width: 980px; }
      canvas { display: block; width: 940px; height: 220px; background: #000; border: 1px solid #333; }
      .row { display: flex; gap: 14px; align-items: center; margin: 10px 0; flex-wrap: wrap; }
      button { font: inherit; padding: 6px 12px; }
      button[aria-pressed='true'] { background: #2a2; color: #000; }
      textarea { width: 940px; height: 48px; font: inherit; }
      #status { color: #9c9; font: 13px ui-monospace, monospace; }
      .hidden { display: none; }
    </style>
  </head>
  <body>
    <h2>Blind realism review</h2>
    <section id="setup">
      <p>Load the <code>bundle.json</code> you were given (it holds no answers). Each 10 s clip is drawn by the monitor's own sweep renderer. For each: is it a <b>real</b> recording or <b>synthetic</b>, and how realistic does it look (1 = clearly artificial … 5 = indistinguishable from a patient)?</p>
      <div class="row"><label>Your name <input id="rater" /></label><input id="file" type="file" accept="application/json" /></div>
    </section>
    <section id="review" class="hidden">
      <div id="status"></div>
      <canvas id="lane" width="940" height="220"></canvas>
      <div class="row">Source: <button data-guess="real">Real</button><button data-guess="synthetic">Synthetic</button></div>
      <div class="row">Realism: <button data-r="1">1</button><button data-r="2">2</button><button data-r="3">3</button><button data-r="4">4</button><button data-r="5">5</button></div>
      <textarea id="comment" placeholder="Comment (optional): what gave it away?"></textarea>
      <div class="row"><button id="next" disabled>Next clip</button><button id="save">Download answers</button></div>
    </section>
    <script type="module" src="./src/validation/review.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Write `apps/demo/src/validation/review.ts`**

```ts
// Blind realism review page (brief §9 steps 2–3, 6). Loads a bundle (packages/validation review:build), shuffles it
// once per session, draws each clip live with the renderer's SweepLane (25 mm/s; CO2 6.25 mm/s, the skin defaults),
// collects real/synthetic + realism 1–5 + comment, keeps progress in localStorage (per bundle session and rater) and
// downloads the answers JSON for `review:score`. The page never sees the key.
import { DEFAULT_PX_PER_MM, SweepLane, WAVE_STYLE, scaleFor } from '@pme/renderer';

interface Clip { id: string; channel: 'ecgII' | 'abp' | 'pleth' | 'co2'; fs: number; unit: string; range: [number, number] | null; x: number[] }
interface Bundle { schema: 'pme-review-bundle/1'; session: string; clips: Clip[] }
interface Answer { id: string; guess: 'real' | 'synthetic'; realism: 1 | 2 | 3 | 4 | 5; comment: string; order: number }

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('lane');
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
let bundle: Bundle | null = null;
let order: number[] = [];
let k = 0;
let answers: Answer[] = [];
let startedAt = '';
let guess: Answer['guess'] | null = null;
let realism: Answer['realism'] | null = null;
let raf = 0;

const storeKey = () => `pme-review:${bundle?.session}:${$<HTMLInputElement>('rater').value.trim()}`;
function save(): void {
  try { localStorage.setItem(storeKey(), JSON.stringify({ order, k, answers, startedAt })); } catch { /* private mode: progress is not kept */ }
}
function restore(): boolean {
  try {
    const s = JSON.parse(localStorage.getItem(storeKey()) ?? 'null') as { order: number[]; k: number; answers: Answer[]; startedAt: string } | null;
    if (!s) return false;
    ({ order, k, answers, startedAt } = s);
    return true;
  } catch { return false; }
}

function play(c: Clip): void {
  cancelAnimationFrame(raf);
  const dpr = window.devicePixelRatio || 1;
  canvas.width = 940 * dpr;
  canvas.height = 220 * dpr;
  const style = c.channel === 'ecgII' ? { color: '#00ff66', range: null as [number, number] | null, mmPerS: 25 } : { color: WAVE_STYLE[c.channel].color, range: WAVE_STYLE[c.channel].range, mmPerS: WAVE_STYLE[c.channel].mmPerS ?? 25 };
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of c.x) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const [a, b] = c.range ?? style.range ?? (c.channel === 'ecgII' ? [lo - 0.2, hi + 0.2] : [lo - 0.1 * (hi - lo), hi + 0.1 * (hi - lo)]);
  const h = 200;
  const sc = c.channel === 'ecgII' ? { baseline: 0.6, gainMmPerMv: 10 } : scaleFor(a, b, h, DEFAULT_PX_PER_MM);
  const lane = new SweepLane({ x: 10, y: 10, width: 920, height: h, baseline: sc.baseline, rate: c.fs, mmPerS: style.mmPerS, pxPerMm: DEFAULT_PX_PER_MM, gainMmPerMv: sc.gainMmPerMv, color: style.color, background: '#000', lineWidth: 1.8, eraseGapPx: 16 }, dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 940, 220);
  const n = c.x.length;
  const t0 = performance.now();
  // the clip loops; sample index i maps to x[i mod n] so the sweep never runs dry
  const read = (from: number, out: Float32Array) => {
    for (let i = 0; i < out.length; i++) out[i] = c.x[(((from + i) % n) + n) % n] as number;
    return out.length;
  };
  const frame = () => {
    lane.draw(ctx, (performance.now() - t0) / 1000, read);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}

function show(): void {
  if (!bundle) return;
  if (k >= order.length) {
    cancelAnimationFrame(raf);
    $('status').textContent = `Done: ${answers.length} clips rated. Download the answers and send the file back.`;
    $<HTMLButtonElement>('next').disabled = true;
    return;
  }
  const c = bundle.clips[order[k] as number] as Clip;
  guess = null;
  realism = null;
  $<HTMLTextAreaElement>('comment').value = '';
  document.querySelectorAll('button[data-guess],button[data-r]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  $<HTMLButtonElement>('next').disabled = true;
  $('status').textContent = `Clip ${k + 1} of ${order.length} · ${c.channel === 'ecgII' ? 'ECG II' : WAVE_STYLE[c.channel].label} · 10 s, looping`;
  play(c);
}

document.querySelectorAll<HTMLButtonElement>('button[data-guess]').forEach((b) => b.addEventListener('click', () => {
  guess = b.dataset.guess as Answer['guess'];
  document.querySelectorAll('button[data-guess]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  $<HTMLButtonElement>('next').disabled = !(guess && realism);
}));
document.querySelectorAll<HTMLButtonElement>('button[data-r]').forEach((b) => b.addEventListener('click', () => {
  realism = Number(b.dataset.r) as Answer['realism'];
  document.querySelectorAll('button[data-r]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  $<HTMLButtonElement>('next').disabled = !(guess && realism);
}));
$('next').addEventListener('click', () => {
  if (!bundle || !guess || !realism) return;
  const c = bundle.clips[order[k] as number] as Clip;
  answers.push({ id: c.id, guess, realism, comment: $<HTMLTextAreaElement>('comment').value, order: k });
  k++;
  save();
  show();
});
$('save').addEventListener('click', () => {
  if (!bundle) return;
  const out = { schema: 'pme-review-answers/1', session: bundle.session, rater: $<HTMLInputElement>('rater').value.trim(), startedAt, finishedAt: new Date().toISOString(), answers };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' }));
  a.download = `answers-${out.session}-${out.rater.replace(/\W+/g, '-') || 'rater'}.json`;
  a.click();
});
$<HTMLInputElement>('file').addEventListener('change', async (ev) => {
  const f = (ev.target as HTMLInputElement).files?.[0];
  if (!f) return;
  if (!$<HTMLInputElement>('rater').value.trim()) { alert('Enter your name first (it keys your saved progress).'); return; }
  bundle = JSON.parse(await f.text()) as Bundle;
  if (bundle.schema !== 'pme-review-bundle/1') { alert('Not a review bundle'); return; }
  if (!restore()) {
    order = bundle.clips.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j] as number, order[i] as number]; }
    k = 0;
    answers = [];
    startedAt = new Date().toISOString();
  }
  $('setup').classList.add('hidden');
  $('review').classList.remove('hidden');
  (window as unknown as { __pmeReview: unknown }).__pmeReview = { get k() { return k; }, get n() { return order.length; }, answers };
  show();
});
```

- [ ] **Step 6: Write `docs/validation/review/README.md`**

```markdown
# Blind realism review (brief §9)

1. The operator builds a bundle: `npx -y pnpm@9.15.9 --filter @pme/validation review:build --per-channel 20`. It lands in the git-ignored cache as `review/<session>/bundle.json` (clips, no answers) and `key.json` (which clip is real — keep it away from raters).
2. The rater opens `validation-review.html` (`npx -y pnpm@9.15.9 --filter @pme/demo dev`, then `/validation-review.html`), types a name, loads `bundle.json`, rates every clip (real/synthetic, realism 1–5, optional comment) and downloads `answers-<session>-<name>.json`. Progress survives a reload on the same browser.
3. The operator scores: `npx -y pnpm@9.15.9 --filter @pme/validation review:score --bundle <bundle.json> --key <key.json> --answers <answers.json>` → `docs/validation/review/<session>-<name>.md/.json` (numbers and comments only; commit these).
4. Pass (brief §9): identification ≤ 60 % per channel, mean synthetic realism ≥ 4.0, real − synthetic ≤ 0.5. A second clinician repeats step 2 with the same bundle; each rater's file is scored separately.
```

- [ ] **Step 7: Typecheck and run the e2e test. Expected: typecheck clean; 1 passed**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo typecheck
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/validation-review.e2e.ts
```

- [ ] **Step 8: Commit**

```bash
git add apps/demo/validation-review.html apps/demo/src/validation/review.ts apps/demo/e2e/validation-review.e2e.ts apps/demo/vite.config.ts docs/validation/review/README.md
git commit -m "feat(demo): blind realism review page drawing clips with the monitor's SweepLane"
git push
```

---

### Task 22: Saadat bedside checklist page and results → skin provenance

**Files:**
- Create: `packages/validation/src/bedside/checklist.ts`, `packages/validation/src/bedside/apply.ts`, `packages/validation/src/bedside/cli-apply.ts`
- Create: `apps/demo/validation-bedside.html`, `apps/demo/src/validation/bedside.ts`, `apps/demo/e2e/validation-bedside.e2e.ts`
- Modify: `apps/demo/vite.config.ts` (one input entry)
- Test: `packages/validation/test/bedside/bedside.test.ts`

**Interfaces:**
- Consumes: `mountMonitor` (`MonitorHandle.dispatch/on/snapshot/restore/enableSound`) from `@pme/renderer`; the `saadat-like` skin; alarm device actions (`setLimit`, `enable`, `silence`), NIBP `start`.
- Produces: `interface BedsideItem { id; title; atMonitor; engine; demo; measure; skinFields }`, `BEDSIDE` (10 items from research/06 §7: main screen, sweep/erase, L1/L2/L3 alarms, Silence countdown, NIBP cycle, HR 80 → 120, asystole 5 vs 10 s, QRS pitch), `Verdict`, `BedsideResult`, `BedsideResults` (`pme-bedside-results/1`); `provenanceQueue(r)`, `bedsideMarkdown(r)`; `bedside:apply --results <file>` → `docs/validation/bedside/<date>.md/.json`.

The page imports the checklist from `packages/validation/src/bedside/checklist.ts` by relative path (it is plain data with no Node imports; `@pme/validation` is not a demo dependency). Measured while planning: the e2e test finds 10 items, the asystole demo on saadat-like reports `ASYSTOLE after ≈ 10 s` (gate 4b: 10 s), and the downloaded results parse; 13 s.

- [ ] **Step 1: Write the failing test `packages/validation/test/bedside/bedside.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { bedsideMarkdown, provenanceQueue } from '../../src/bedside/apply.ts';
import { BEDSIDE, type BedsideResults } from '../../src/bedside/checklist.ts';

const R: BedsideResults = {
  schema: 'pme-bedside-results/1', device: 'Saadat Alborz B9', firmware: '', observer: 'Ali', date: '2026-10-01', skin: 'saadat-like',
  results: [
    { id: 'asystole-delay', verdict: 'wrong', observed: '5 s', engineMeasured: '9.7 s', note: 'OR default' },
    { id: 'nibp-cycle', verdict: 'matches', observed: '31 s', engineMeasured: '33.9 s', note: '' },
  ],
};

describe('Saadat bedside checklist (research/06 §7)', () => {
  it('covers the checklist, audio and stopwatch items with unique ids', () => {
    const ids = BEDSIDE.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const k of ['main-screen', 'sweep-erase', 'alarm-l1', 'alarm-l2', 'alarm-l3', 'silence', 'nibp-cycle', 'hr-step', 'asystole-delay', 'qrs-pitch']) expect(ids).toContain(k);
  });
  it('a wrong item queues its skin fields with the observation as the proposed source', () => {
    expect(provenanceQueue(R)).toEqual([{ field: 'arrhythmia.asystoleS', item: 'asystole-delay', verdict: 'wrong', observed: '5 s', engine: '9.7 s' }]);
    const md = bedsideMarkdown(R);
    expect(md).toContain('| Asystole delay: 5 s or 10 s? | wrong | 5 s | 9.7 s | OR default |');
    expect(md).toContain('`arrhythmia.asystoleS`');
    expect(md).toContain('| Factory main screen (P1) | not-checked |');
  });
});
```

- [ ] **Step 2: Run it. Expected: FAIL (modules missing)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/bedside/bedside.test.ts`

- [ ] **Step 3: Write `packages/validation/src/bedside/checklist.ts`**

```ts
// The Saadat Alborz B9 bedside checklist (research/06 §7 "Photo checklist", "Audio", "Behaviour stopwatch") as data:
// each item says what to do at the real monitor, how the engine page demonstrates the same behaviour on the
// `saadat-like` skin, what the engine measures, and which skin field a delta would change (skin provenance).
// Shared by the checklist page (apps/demo) and `bedside:apply` so both speak the same item ids.
export interface BedsideItem {
  id: string;
  title: string;
  atMonitor: string;
  engine: string;
  /** Commands the page dispatches for the demonstration (JSON-safe; id/issuedBy added by the page). */
  demo: Array<Record<string, unknown>>;
  /** What the page measures from engine events: 'alarm:<ID>' (s from the demo start to raised), 'nibp' (cycle s),
   *  'hr>=<v>' (s until the displayed HR reaches v), or 'visual' (nothing measurable: compare by eye/ear). */
  measure: string;
  /** Skin fields (packages/skins/src/data/skins/saadat-like.json) whose provenance a delta updates. */
  skinFields: string[];
}

export const BEDSIDE: BedsideItem[] = [
  { id: 'main-screen', title: 'Factory main screen (P1)', atMonitor: 'Setup → LOAD DEFAULT, photograph P1 straight on.', engine: 'The saadat-like P1 layout with the default lanes and tiles.', demo: [], measure: 'visual', skinFields: ['layout', 'colors', 'tiles'] },
  { id: 'sweep-erase', title: 'Sweep and erase bar', atMonitor: '240 fps slow-motion clip (≈ 3 s) of the ECG lane.', engine: 'Erase-gap width and cursor line of the sweep.', demo: [], measure: 'visual', skinFields: ['render.eraseGapPx', 'render.cursorLine'] },
  { id: 'alarm-l1', title: 'Level-1 alarm (asystole): sound, lamp, message', atMonitor: 'Asystole on the simulator; record 40 s of audio at 30 cm; film lamp and message bar.', engine: 'Asystole → ASYSTOLE level 1 after the skin delay; burst pattern and lamp flash.', demo: [{ type: 'setRhythm', rhythm: 'asystole', when: 'now' }], measure: 'alarm:ASYSTOLE', skinFields: ['arrhythmia.asystoleS', 'alarmAudio.level1', 'lamp.level1'] },
  { id: 'alarm-l2', title: 'Level-2 alarm (HR high): sound, lamp, message', atMonitor: 'Set the HR high limit below the HR, alarm level 2.', engine: 'HR limit 60–100 enabled, HR 130 → HR_HIGH.', demo: [{ type: 'device', action: { device: 'alarm', action: 'setLimit', param: 'HR', low: 50, high: 100 } }, { type: 'device', action: { device: 'alarm', action: 'enable', param: 'HR' } }, { type: 'setTarget', variable: 'hr', value: 130, ramp: { durationS: 5 } }], measure: 'alarm:HR_HIGH', skinFields: ['alarmAudio.level2', 'lamp.level2', 'alarmDelays.HR'] },
  { id: 'alarm-l3', title: 'Level-3 technical alarm (SpO2 probe off)', atMonitor: 'Unplug the SpO2 probe.', engine: 'SpO2 sensor off → technical alarm, level 3.', demo: [{ type: 'attachSensor', sensor: 'spo2', state: 'off' }], measure: 'visual', skinFields: ['alarmAudio.level3', 'lamp.level3', 'technical.spo2Off'] },
  { id: 'silence', title: 'Silence: countdown and flashing numeric', atMonitor: 'Raise the L1 alarm, press Silence; film the header icon and the numeric.', engine: 'Asystole, then Silence → 120 s visual countdown (G4b).', demo: [{ type: 'setRhythm', rhythm: 'asystole', when: 'now' }, { type: 'device', action: { device: 'alarm', action: 'silence' }, afterS: 12 }], measure: 'visual', skinFields: ['silence.durationS', 'silence.countdownIcon'] },
  { id: 'nibp-cycle', title: 'NIBP cycle duration', atMonitor: 'Stopwatch one adult NIBP measurement (press to result) at HR ≈ 75.', engine: 'NIBP start → done.', demo: [{ type: 'device', action: { device: 'nibp', action: 'start' } }], measure: 'nibp', skinFields: ['nibp.inflateMmHg', 'nibp.stepMmHg'] },
  { id: 'hr-step', title: 'HR averaging: 80 → 120', atMonitor: 'Simulator HR 80 → 120; stopwatch until the display reads 120 (8 s average).', engine: 'HR target 80 → 120 in one step; displayed HR reaches 118.', demo: [{ type: 'setTarget', variable: 'hr', value: 80 }, { type: 'setTarget', variable: 'hr', value: 120, afterS: 20 }], measure: 'hr>=118', skinFields: ['hr.averaging'] },
  { id: 'asystole-delay', title: 'Asystole delay: 5 s or 10 s?', atMonitor: 'Lead-off-with-asystole on the simulator; stopwatch to the alarm.', engine: 'Asystole → ASYSTOLE (skin asystoleS).', demo: [{ type: 'setRhythm', rhythm: 'asystole', when: 'now' }], measure: 'alarm:ASYSTOLE', skinFields: ['arrhythmia.asystoleS'] },
  { id: 'qrs-pitch', title: 'QRS beep pitch with SpO2 falling', atMonitor: 'Record the QRS beep at volume 3 while SpO2 falls.', engine: 'SpO2 98 → 85 over 30 s; the QRS tone follows the displayed SpO2.', demo: [{ type: 'setTarget', variable: 'spo2', value: 85, ramp: { durationS: 30 } }], measure: 'visual', skinFields: ['audio.qrsPitch'] },
];

export type Verdict = 'matches' | 'close' | 'wrong' | 'not-checked';
export interface BedsideResult { id: string; verdict: Verdict; observed: string; engineMeasured: string; note: string }
export interface BedsideResults { schema: 'pme-bedside-results/1'; device: string; firmware: string; observer: string; date: string; skin: 'saadat-like'; results: BedsideResult[] }
```

- [ ] **Step 4: Write `packages/validation/src/bedside/apply.ts`**

```ts
// Bedside results (the checklist page's download) → docs/validation/bedside/<date>.md with a verdict table and the
// skin-provenance queue: every 'close'/'wrong' item lists the saadat-like skin fields to revisit, with Ali's
// observation as the proposed source (tag "observed", research/06 §7).
import { BEDSIDE, type BedsideResults } from './checklist.ts';

export interface ProvenanceUpdate { field: string; item: string; verdict: string; observed: string; engine: string }

export function provenanceQueue(r: BedsideResults): ProvenanceUpdate[] {
  const out: ProvenanceUpdate[] = [];
  for (const x of r.results) {
    if (x.verdict !== 'close' && x.verdict !== 'wrong') continue;
    const item = BEDSIDE.find((b) => b.id === x.id);
    for (const field of item?.skinFields ?? []) out.push({ field, item: x.id, verdict: x.verdict, observed: x.observed, engine: x.engineMeasured });
  }
  return out;
}

export function bedsideMarkdown(r: BedsideResults): string {
  const L = [`# Saadat bedside check — ${r.date}`, '', `Device: ${r.device} (firmware ${r.firmware || 'not recorded'}); observer: ${r.observer}; engine skin: ${r.skin}. Screens only, no patient identifiers (R12).`, '',
    '| Item | Verdict | At the monitor | Engine | Note |', '|---|---|---|---|---|'];
  for (const b of BEDSIDE) {
    const x = r.results.find((y) => y.id === b.id);
    L.push(`| ${b.title} | ${x?.verdict ?? 'not-checked'} | ${x?.observed ?? ''} | ${x?.engineMeasured ?? ''} | ${x?.note ?? ''} |`);
  }
  const q = provenanceQueue(r);
  L.push('', '## Skin provenance queue', '', q.length ? '| Skin field | From item | Verdict | Observed (proposed source) | Engine now |' : 'Nothing to update: every checked item matches.');
  if (q.length) {
    L.push('|---|---|---|---|---|');
    for (const u of q) L.push(`| \`${u.field}\` | ${u.item} | ${u.verdict} | ${u.observed} | ${u.engine} |`);
  }
  return `${L.join('\n')}\n`;
}
```

- [ ] **Step 5: Write `packages/validation/src/bedside/cli-apply.ts`**

```ts
// Entry-only: pnpm --filter @pme/validation bedside:apply --results <bedside-results.json>
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bedsideMarkdown } from './apply.ts';
import type { BedsideResults } from './checklist.ts';

const i = process.argv.indexOf('--results');
if (i < 0 || !process.argv[i + 1]) throw new Error('usage: bedside:apply --results <file.json>');
const r = JSON.parse(readFileSync(process.argv[i + 1] as string, 'utf8')) as BedsideResults;
if (r.schema !== 'pme-bedside-results/1') throw new Error('not a bedside results file');
const dir = fileURLToPath(new URL('../../../../docs/validation/bedside', import.meta.url));
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, `${r.date}.json`), `${JSON.stringify(r, null, 1)}\n`);
writeFileSync(join(dir, `${r.date}.md`), bedsideMarkdown(r));
console.log(join(dir, `${r.date}.md`));
```

- [ ] **Step 6: Run the unit test. Expected: PASS (2 tests)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/bedside/bedside.test.ts`

- [ ] **Step 7: Add the page to `apps/demo/vite.config.ts` after the `'validation-review'` line:**

```ts
        'validation-bedside': page('validation-bedside'), // Stage 8a
```

- [ ] **Step 8: Write the failing e2e test `apps/demo/e2e/validation-bedside.e2e.ts`**

```ts
// Stage 8a: the bedside checklist page lists every item, plays the asystole demo on the saadat-like skin and
// measures the alarm delay (gate 4b: 10 s), then downloads a results file bedside:apply accepts.
// Run: PW_SYSTEM_CHROME=1 pnpm exec playwright test apps/demo/e2e/validation-bedside.e2e.ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});
test.afterAll(async () => vite?.close());

test('asystole demo measures the saadat-like delay; results download', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${base}/validation-bedside.html`);
  await expect(page.locator('.item')).toHaveCount(10);
  const item = page.locator('[data-item="asystole-delay"]');
  await page.waitForTimeout(2000); // the start snapshot is taken 1.5 s after load
  await item.locator('.run').click();
  await expect(item.locator('.measured')).toHaveValue(/ASYSTOLE after \d+\.\d s/, { timeout: 40_000 });
  const s = Number(/after (\d+\.\d)/.exec(await item.locator('.measured').inputValue())?.[1]);
  expect(s).toBeGreaterThanOrEqual(9);
  expect(s).toBeLessThanOrEqual(12);
  await item.locator('.observed').fill('5 s');
  await item.locator('.verdict').selectOption('wrong');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#save')]);
  const r = JSON.parse(readFileSync((await dl.path()) as string, 'utf8'));
  expect(r.schema).toBe('pme-bedside-results/1');
  expect(r.results.find((x: { id: string }) => x.id === 'asystole-delay')).toMatchObject({ verdict: 'wrong', observed: '5 s' });
  expect(errors).toEqual([]);
});
```

- [ ] **Step 9: Write `apps/demo/validation-bedside.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Saadat bedside checklist</title>
    <style>
      body { background: #111; color: #ddd; font: 14px system-ui, sans-serif; margin: 12px; }
      #monitor { height: 520px; max-width: 1180px; border: 1px solid #333; }
      .meta { display: flex; gap: 12px; flex-wrap: wrap; margin: 10px 0; }
      .item { border: 1px solid #333; padding: 8px 10px; margin: 8px 0; max-width: 1160px; }
      .item h3 { margin: 0 0 4px; font-size: 15px; }
      .item p { margin: 2px 0; color: #aaa; }
      .item .row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-top: 6px; }
      input, select, button { font: inherit; }
      input.wide { width: 320px; }
    </style>
  </head>
  <body>
    <div id="monitor"></div>
    <div class="meta">
      <label>Device <input id="device" value="Saadat Alborz B9" /></label>
      <label>Firmware <input id="firmware" /></label>
      <label>Observer <input id="observer" /></label>
      <label>Date <input id="date" type="date" /></label>
      <button id="sound">Enable sound</button>
      <button id="save">Download results</button>
    </div>
    <p>Each item: do the step at the real monitor, press <b>Run engine demo</b> to see the engine do the same on the saadat-like skin, then record what the monitor did and your verdict. Screens only, no patient identifiers (R12).</p>
    <div id="items"></div>
    <script type="module" src="./src/validation/bedside.ts"></script>
  </body>
</html>
```

- [ ] **Step 10: Write `apps/demo/src/validation/bedside.ts`**

```ts
// Saadat bedside checklist page (research/06 §7; BUILD-PLAN Stage 8 "Saadat screens as a capture source"). The engine
// runs the saadat-like skin; each item restores the start snapshot, plays its demo and measures what the engine did;
// Ali records the real monitor's behaviour and a verdict; the results JSON feeds `bedside:apply` (skin provenance).
import type { Command, EngineEvent } from '@pme/engine-core';
import { mountMonitor } from '@pme/renderer';
import { BEDSIDE, type BedsideItem, type BedsideResult, type BedsideResults, type Verdict } from '../../../../packages/validation/src/bedside/checklist.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const pm = mountMonitor($('monitor'), {
  skin: 'saadat-like',
  engine: { seed: 7, patient: { baseline: { hr: 75, sbp: 120, dbp: 75 }, sensors: { ecg: 'on', spo2: 'on', nibp: 'on', co2: 'on' } } },
});
const STORE = 'pme-bedside-results';
let simT = 0;
pm.on((e) => { if ('t' in e) simT = Math.max(simT, e.t); });
const start = new Promise<Awaited<ReturnType<typeof pm.snapshot>>>((res) => setTimeout(() => res(pm.snapshot()), 1500));
const results = new Map<string, BedsideResult>();
try {
  const saved = JSON.parse(localStorage.getItem(STORE) ?? 'null') as BedsideResults | null;
  for (const r of saved?.results ?? []) results.set(r.id, r);
} catch { /* no storage: start empty */ }
$<HTMLInputElement>('date').value = new Date().toISOString().slice(0, 10);

let n = 0;
const send = (body: Record<string, unknown>) => pm.dispatch({ id: `bedside-${++n}`, issuedBy: 'bedside', ...body } as Command);

/** Run an item's demo from the start snapshot; resolve with a text of what the engine measured. */
async function runDemo(item: BedsideItem): Promise<string> {
  await pm.restore(await start);
  await new Promise((r) => setTimeout(r, 300));
  const t0 = simT;
  const events: EngineEvent[] = [];
  const off = pm.on((e) => events.push(e));
  let stepT = t0;
  for (const c of item.demo) {
    const { afterS, ...cmd } = c as { afterS?: number } & Record<string, unknown>;
    if (afterS) await new Promise((r) => setTimeout(r, afterS * 1000));
    if (afterS) stepT = simT;
    await send(cmd);
  }
  const deadline = performance.now() + 90_000;
  const found = (): string | null => {
    const m = item.measure;
    if (m.startsWith('alarm:')) {
      const a = events.find((e) => e.type === 'alarm' && e.id === m.slice(6) && e.state === 'raised');
      return a && 't' in a ? `${m.slice(6)} after ${(a.t - t0).toFixed(1)} s` : null;
    }
    if (m === 'nibp') {
      const s = events.find((e) => e.type === 'nibp' && e.phase === 'inflating');
      const d = events.find((e) => e.type === 'nibp' && (e.phase === 'done' || e.phase === 'failed'));
      return s && d && 't' in s && 't' in d ? `cycle ${(d.t - s.t).toFixed(1)} s` : null;
    }
    if (m.startsWith('hr>=')) {
      const v = Number(m.slice(4));
      const h = events.find((e) => e.type === 'measurement' && e.t > stepT && (e.values.hr?.value ?? 0) >= v);
      return h && 't' in h ? `HR ≥ ${v} after ${(h.t - stepT).toFixed(1)} s` : null;
    }
    return 'see screen';
  };
  for (;;) {
    const f = found();
    if (f || performance.now() > deadline) { off(); return f ?? 'not seen within 90 s'; }
    await new Promise((r) => setTimeout(r, 250));
  }
}

function persist(): BedsideResults {
  const r: BedsideResults = {
    schema: 'pme-bedside-results/1', device: $<HTMLInputElement>('device').value, firmware: $<HTMLInputElement>('firmware').value,
    observer: $<HTMLInputElement>('observer').value, date: $<HTMLInputElement>('date').value, skin: 'saadat-like', results: [...results.values()],
  };
  try { localStorage.setItem(STORE, JSON.stringify(r)); } catch { /* not kept */ }
  return r;
}

for (const item of BEDSIDE) {
  const r = results.get(item.id) ?? { id: item.id, verdict: 'not-checked' as Verdict, observed: '', engineMeasured: '', note: '' };
  results.set(item.id, r);
  const el = document.createElement('div');
  el.className = 'item';
  el.dataset.item = item.id;
  el.innerHTML = `<h3></h3><p class="mon"></p><p class="eng"></p><div class="row">
    <button class="run">Run engine demo</button><label>Engine: <input class="measured wide" /></label></div><div class="row">
    <label>Monitor did: <input class="observed wide" /></label>
    <select class="verdict"><option>not-checked</option><option>matches</option><option>close</option><option>wrong</option></select>
    <label>Note <input class="note wide" /></label></div>`;
  (el.querySelector('h3') as HTMLElement).textContent = item.title;
  (el.querySelector('.mon') as HTMLElement).textContent = `At the monitor: ${item.atMonitor}`;
  (el.querySelector('.eng') as HTMLElement).textContent = `Engine: ${item.engine}`;
  const q = <T extends HTMLElement>(s: string) => el.querySelector(s) as T;
  q<HTMLInputElement>('.measured').value = r.engineMeasured;
  q<HTMLInputElement>('.observed').value = r.observed;
  q<HTMLSelectElement>('.verdict').value = r.verdict;
  q<HTMLInputElement>('.note').value = r.note;
  const sync = () => {
    Object.assign(r, { engineMeasured: q<HTMLInputElement>('.measured').value, observed: q<HTMLInputElement>('.observed').value, verdict: q<HTMLSelectElement>('.verdict').value as Verdict, note: q<HTMLInputElement>('.note').value });
    persist();
  };
  el.addEventListener('input', sync);
  el.addEventListener('change', sync);
  q<HTMLButtonElement>('.run').addEventListener('click', async () => {
    q<HTMLButtonElement>('.run').disabled = true;
    q<HTMLInputElement>('.measured').value = 'running…';
    q<HTMLInputElement>('.measured').value = await runDemo(item);
    q<HTMLButtonElement>('.run').disabled = false;
    sync();
  });
  $('items').append(el);
}
$('sound').addEventListener('click', () => void pm.enableSound());
$('save').addEventListener('click', () => {
  const r = persist();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(r, null, 1)], { type: 'application/json' }));
  a.download = `bedside-${r.date}.json`;
  a.click();
});
(window as unknown as { __pmeBedside: unknown }).__pmeBedside = { pm, results };
```

- [ ] **Step 11: Typecheck and run the e2e test. Expected: clean; 1 passed (≈ 15 s)**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo typecheck
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/validation-bedside.e2e.ts
```

- [ ] **Step 12: Commit**

```bash
git add packages/validation/src/bedside packages/validation/test/bedside apps/demo/validation-bedside.html apps/demo/src/validation/bedside.ts apps/demo/e2e/validation-bedside.e2e.ts apps/demo/vite.config.ts
git commit -m "feat(validation): Saadat bedside checklist page (engine demo per item) and results → skin provenance queue"
git push
```

---

### Task 23: Performance gate — tick percentiles, frame-time histograms, 60-min soak

**Files:**
- Create: `packages/validation/src/perf/tick-bench.ts`, `packages/validation/src/perf/cli-ticks.ts`, `packages/validation/test/perf/tick-bench.test.ts`
- Create: `apps/demo/validation-perf.html`, `apps/demo/src/validation/perf.ts`, `apps/demo/e2e/validation-perf.soak.ts`, `playwright.validation.config.ts`, `docs/validation/perf/README.md`
- Modify: `apps/demo/vite.config.ts` (one input entry); `packages/validation/package.json` (`perf:ticks` → `NODE_OPTIONS=--expose-gc vite-node src/perf/cli-ticks.ts`)

**Interfaces:**
- Consumes: `createEngine`; `mountMonitor` (`fps`, `worker: 'off'`, `renderPath`, `on`).
- Produces: `TickStats`, `tickBench(simSeconds = 60, seed = 3)`; `docs/validation/perf/ticks.json`, `docs/validation/perf/soak-<date>.json`; `window.__pmePerf` on the perf page.

Measured while planning (M3 Mac, system Chrome): Node tick cost for an 8-channel monitor over 120 s: p50 **0.35 ms**, p95 0.41, p99 **0.58**, max 1.15 ms (budget: worker ≤ 6 ms per frame); heap +5.6 MB over 120 s with forced GC (trend store and event log filling — the soak decides). Browser, worker path: 60 fps p50/p95/p99 16.7/16.8/16.8 ms, 0 frames ≥ 20 ms over 60 s; `fps=30` keeps the 16.7 ms rAF (the renderer skips alternate frames internally), 0 long frames. A 2-min soak on the main-thread path: heap 5.34 → 6.14 → 5.49 MB, sim time 120.02 s (×1 held), raised alarms `ART_D_LOW`, `EtCO2_LOW` only (the default limits against this patient), no apnoea. The 60-min run is the gate number (scheduled workflow or by hand).

- [ ] **Step 1: Write the failing test `packages/validation/test/perf/tick-bench.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { tickBench } from '../../src/perf/tick-bench.ts';

describe('worker tick cost (Node, same engine code)', () => {
  it('10 s of ticks: p50 well under the 6 ms frame budget', { timeout: 30_000 }, async () => {
    const s = await tickBench(10);
    expect(s.ticks).toBe(500);
    expect(s.p50).toBeLessThan(2);
    expect(s.p99).toBeLessThan(20); // loose here (CI noise); the gate reads perf:ticks over 600 s
  });
});
```

- [ ] **Step 2: Run it. Expected: FAIL (module missing)**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/perf/tick-bench.test.ts`

- [ ] **Step 3: Write `packages/validation/src/perf/tick-bench.ts`**

```ts
// Worker tick-time percentiles, measured in Node on the same engine code the worker runs (decision 14: the worker
// has no timing hook and Stage 8a may not add one). One `advanceTo` per 20 ms tick with every channel produced
// (8-lane monitor: ECG II/V5/aVR, ABP, pleth, CVP, CO2, resp) — the worker's steady-state cost per tick. BUILD-PLAN
// Stage 8 budget: worker ≤ 6 ms per frame (≈ one tick at 60 fps), so p99 per tick must stay well under 6 ms.
import { createEngine } from '@pme/engine-core';
import { quantile } from '../stats.ts';

/** heapGrowthMb is NaN unless Node runs with --expose-gc (the perf:ticks script sets it): without a forced GC it measures garbage. */
export interface TickStats { ticks: number; p50: number; p95: number; p99: number; max: number; heapGrowthMb: number }

export async function tickBench(simSeconds = 60, seed = 3): Promise<TickStats> {
  const e = createEngine({ seed, patient: { sensors: { ecg: 'on', spo2: 'on', abp: 'connected', cvp: 'connected', co2: 'on' } } });
  e.dispatch({ id: 'vent', issuedBy: 'perf', type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 } } as never);
  const out = new Float32Array(64);
  const ms: number[] = [];
  e.advanceTo(10); // warm-up (JIT, first NIBP/breath state)
  const gc = (globalThis as { gc?: () => void }).gc;
  gc?.();
  const heap0 = process.memoryUsage().heapUsed;
  const n = Math.round(simSeconds * 50);
  for (let i = 1; i <= n; i++) {
    const a = performance.now();
    e.advanceTo(10 + i * 0.02);
    for (const ch of ['ecgII', 'V5', 'aVR', 'abp', 'pleth', 'cvp', 'co2', 'resp'] as const) e.readSamples(ch, Math.max(0, e.latestSampleIndex(ch) - 63), out);
    ms.push(performance.now() - a);
    if (i % 3000 === 0) await new Promise<void>((r) => setImmediate(r));
  }
  gc?.();
  return { ticks: n, p50: quantile(ms, 0.5), p95: quantile(ms, 0.95), p99: quantile(ms, 0.99), max: Math.max(...ms), heapGrowthMb: gc ? (process.memoryUsage().heapUsed - heap0) / 1048576 : Number.NaN };
}
```

- [ ] **Step 4: Write `packages/validation/src/perf/cli-ticks.ts` and set the `perf:ticks` script to `"NODE_OPTIONS=--expose-gc vite-node src/perf/cli-ticks.ts"`**

```ts
// Entry-only: pnpm --filter @pme/validation perf:ticks [--seconds 600] → docs/validation/perf/ticks.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tickBench } from './tick-bench.ts';

const i = process.argv.indexOf('--seconds');
const s = await tickBench(i >= 0 ? Number(process.argv[i + 1]) : 600);
const dir = fileURLToPath(new URL('../../../../docs/validation/perf', import.meta.url));
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'ticks.json'), `${JSON.stringify({ node: process.version, platform: `${process.platform}-${process.arch}`, date: new Date().toISOString(), ...s }, null, 1)}\n`);
console.log(JSON.stringify(s));
```

- [ ] **Step 5: Run the test and the 600 s bench. Expected: PASS; `ticks.json` with p99 < 6 ms**

```bash
npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/perf/tick-bench.test.ts
npx -y pnpm@9.15.9 --filter @pme/validation perf:ticks --seconds 600
```

- [ ] **Step 6: Add the page to `apps/demo/vite.config.ts` after the `'validation-bedside'` line:**

```ts
        'validation-perf': page('validation-perf'), // Stage 8a
```

- [ ] **Step 7: Write `apps/demo/validation-perf.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Performance gate</title>
    <style>
      body { background: #000; color: #ccc; font: 13px ui-monospace, monospace; margin: 8px; }
      #monitor { height: 700px; max-width: 1280px; border: 1px solid #333; }
      #stats { white-space: pre; color: #8f8; margin-top: 6px; }
    </style>
  </head>
  <body>
    <div id="monitor"></div>
    <div id="stats"></div>
    <script type="module" src="./src/validation/perf.ts"></script>
  </body>
</html>
```

- [ ] **Step 8: Write `apps/demo/src/validation/perf.ts`**

```ts
// Performance gate page (BUILD-PLAN Stage 8 "Performance"): an 8-lane monitor (ECG II, V5, aVR, ABP, pleth, CVP, CO2,
// resp) with a ventilated patient. Query: ?fps=60|30, ?worker=off (main-thread engine: its heap is then the page's,
// which the soak measures), ?scale=1. Exposes window.__pmePerf: rAF frame intervals, alarm log, sim time. The same
// page is the manual iPad check (open it on the iPad, read the stats line after 2 min).
import type { Command, EngineEvent } from '@pme/engine-core';
import { mountMonitor } from '@pme/renderer';

const q = new URLSearchParams(location.search);
const fps = q.get('fps') === '30' ? 30 : 60;
const pm = mountMonitor(document.getElementById('monitor') as HTMLElement, {
  engine: { seed: 11, patient: { baseline: { hr: 78, sbp: 124, dbp: 72 }, sensors: { ecg: 'on', spo2: 'on', abp: 'connected', cvp: 'connected', co2: 'on', nibp: 'on' } } },
  lanes: ['ecgII', 'V5', 'aVR'],
  waves: ['abp', 'pleth', 'cvp', 'co2', 'resp'],
  nibp: true,
  temp: true,
  fps,
  worker: q.get('worker') === 'off' ? 'off' : 'auto',
});
const cmds: Array<Record<string, unknown>> = [
  { type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 } },
  { type: 'device', action: { device: 'nibp', action: 'auto', intervalMin: 3 } },
];
cmds.forEach((c, i) => void pm.dispatch({ id: `perf-${i}`, issuedBy: 'perf', ...c } as Command));
if (q.get('scale')) pm.setTimeScale(Number(q.get('scale')));

const frames: number[] = [];
const alarms: Array<{ t: number; id: string; state: string }> = [];
let simT = 0;
pm.on((e: EngineEvent) => {
  if ('t' in e) simT = Math.max(simT, e.t);
  if (e.type === 'alarm') alarms.push({ t: e.t, id: e.id, state: e.state });
});
let last = performance.now();
const tick = (now: number) => {
  frames.push(now - last);
  last = now;
  if (frames.length > 200_000) frames.splice(0, 100_000);
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
const stats = document.getElementById('stats') as HTMLElement;
setInterval(() => {
  const f = frames.slice(-600).sort((a, b) => a - b);
  const p = (x: number) => (f[Math.floor(x * (f.length - 1))] ?? 0).toFixed(1);
  void pm.renderPath.then((rp) => {
    stats.textContent = `path ${rp} · target ${fps} fps · frame ms p50 ${p(0.5)} p95 ${p(0.95)} p99 ${p(0.99)} · sim ${simT.toFixed(0)} s · alarms ${alarms.filter((a) => a.state === 'raised').length}`;
  });
}, 1000);
(window as unknown as { __pmePerf: unknown }).__pmePerf = { frames, alarms, get simT() { return simT; }, fps, renderPath: pm.renderPath };
```

- [ ] **Step 9: Write `playwright.validation.config.ts` (repo root)**

```ts
import { defineConfig, devices } from '@playwright/test';

// Stage 8a long runs (soak, frame-time histograms): only `*.soak.ts`, only from the validation workflow or by hand.
// PME_SOAK_MIN sets the soak length (default 60). PW_SYSTEM_CHROME=1 uses the installed Chrome.
export default defineConfig({
  testDir: 'apps/demo/e2e',
  testMatch: '*.soak.ts',
  reporter: 'list',
  timeout: 0,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], ...(process.env.PW_SYSTEM_CHROME ? { channel: 'chrome' } : {}), launchOptions: { args: ['--js-flags=--expose-gc', '--enable-precise-memory-info'] } } }],
});
```

- [ ] **Step 10: Write `apps/demo/e2e/validation-perf.soak.ts`**

```ts
// Stage 8a performance gate (BUILD-PLAN Stage 8): (1) frame-time histograms at 60 and 30 fps on the worker path;
// (2) soak: PME_SOAK_MIN (default 60) sim-minutes at ×1 on the main-thread path (so the engine's heap is the page's),
// heap after a forced GC sampled every minute, growth from minute 5 to the end ≤ 5 MB; no apnoea alarm for a steady
// ventilated patient (the GV-obs "APNEA" flake watch). Writes docs/validation/perf/soak-<date>.json.
// Run: PW_SYSTEM_CHROME=1 PME_SOAK_MIN=5 pnpm exec playwright test -c playwright.validation.config.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/validation/perf');
const record: Record<string, unknown> = { date: new Date().toISOString() };
test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => {
  writeFileSync(resolve(out, `soak-${String(record.date).slice(0, 10)}.json`), `${JSON.stringify(record, null, 1)}\n`);
  await vite?.close();
});

type W = { __pmePerf: { frames: number[]; alarms: Array<{ t: number; id: string; state: string }>; simT: number } };
const perf = <T>(p: Page, fn: (w: W) => T) => p.evaluate(`(${fn.toString()})(window)`) as Promise<T>;
const hist = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const q = (x: number) => +(s[Math.floor(x * (s.length - 1))] ?? 0).toFixed(2);
  const bins: Record<string, number> = { '<17': 0, '17-20': 0, '20-34': 0, '34-50': 0, '>=50': 0 };
  for (const v of xs) bins[v < 17 ? '<17' : v < 20 ? '17-20' : v < 34 ? '20-34' : v < 50 ? '34-50' : '>=50']! += 1;
  return { n: xs.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), bins };
};

for (const fps of [60, 30] as const) {
  test(`frame-time histogram at ${fps} fps (worker path)`, async ({ page }) => {
    await page.setViewportSize({ width: 1300, height: 760 });
    await page.goto(`${base}/validation-perf.html?fps=${fps}`);
    await page.waitForFunction(() => '__pmePerf' in window);
    await page.waitForTimeout(5000);
    await perf(page, (w) => w.__pmePerf.frames.splice(0));
    await page.waitForTimeout(60_000);
    const h = hist(await perf(page, (w) => w.__pmePerf.frames.slice()));
    record[`frames${fps}`] = h;
    expect(h.p95).toBeLessThan((1000 / fps) * 1.5); // [ENG] p95 frame interval within 1.5× the target period
  });
}

test('soak: heap growth ≤ 5 MB, no spurious apnoea alarm', async ({ page }) => {
  const minutes = Number(process.env.PME_SOAK_MIN ?? 60);
  await page.setViewportSize({ width: 1300, height: 760 });
  await page.goto(`${base}/validation-perf.html?fps=60&worker=off`);
  await page.waitForFunction(() => '__pmePerf' in window);
  const cdp = await page.context().newCDPSession(page);
  const heap = async () => {
    await cdp.send('HeapProfiler.collectGarbage');
    return ((await cdp.send('Runtime.getHeapUsage')) as { usedSize: number }).usedSize / 1048576;
  };
  const samples: Array<[number, number]> = [];
  for (let m = 0; m <= minutes; m++) {
    samples.push([m, +(await heap()).toFixed(2)]);
    await perf(page, (w) => w.__pmePerf.frames.splice(0));
    if (m < minutes) await page.waitForTimeout(60_000);
  }
  const from = samples[Math.min(5, samples.length - 1)]?.[1] ?? 0;
  const growth = (samples.at(-1)?.[1] ?? 0) - from;
  const alarms = await perf(page, (w) => w.__pmePerf.alarms.filter((a) => a.state === 'raised'));
  const simT = await perf(page, (w) => w.__pmePerf.simT);
  record.soak = { minutes, simT, heapMb: samples, growthMbFromMinute5: +growth.toFixed(2), alarms };
  expect(simT).toBeGreaterThan(minutes * 60 * 0.95); // ×1 real time held
  expect(growth).toBeLessThanOrEqual(5);
  expect(alarms.filter((a) => a.id.startsWith('apnoea'))).toEqual([]);
});
```

- [ ] **Step 11: Write `docs/validation/perf/README.md`**

```markdown
# Performance gate (BUILD-PLAN Stage 8)

| Check | How | Budget |
|---|---|---|
| Worker tick time | `npx -y pnpm@9.15.9 --filter @pme/validation perf:ticks --seconds 600` → `ticks.json` (Node, same engine code) | p99 ≪ 6 ms per frame |
| Frame times 60 / 30 fps | `PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test -c playwright.validation.config.ts` → `soak-<date>.json` `frames60`, `frames30` | p95 < 1.5 × frame period |
| Soak 60 min at ×1 | same run (`PME_SOAK_MIN`, default 60) on the main-thread path → `soak` | heap growth ≤ 5 MB from minute 5; sim time ≥ 95 % of wall; no apnoea alarm |
| Determinism | `pnpm validate --suites determinism` (V9) | identical hashes |
| iPad (A14+), manual | Serve the demo on the LAN (`npx -y pnpm@9.15.9 --filter @pme/demo dev --host`), open `/validation-perf.html` on the iPad, wait 2 min, photograph the stats line (render path, frame p50/p95/p99), repeat with `?fps=30`. Record the numbers in the gate note. | 8 lanes at 60 fps; worker ≤ 6 ms, main ≤ 4 ms |
| Projector PC, 30 fps | `/validation-perf.html?fps=30` on the projector machine; same stats line | no frame ≥ 50 ms |
```

- [ ] **Step 12: Typecheck, then a short soak to prove the harness (5 min). Expected: 3 passed; `docs/validation/perf/soak-<date>.json` written**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo typecheck
PW_SYSTEM_CHROME=1 PME_SOAK_MIN=5 npx -y pnpm@9.15.9 exec playwright test -c playwright.validation.config.ts
```

- [ ] **Step 13: Commit (the short-soak JSON is not the gate number; do not commit it — the 60-min run in Task 24 is)**

```bash
rm -f docs/validation/perf/soak-*.json
git add packages/validation/src/perf packages/validation/test/perf packages/validation/package.json apps/demo/validation-perf.html apps/demo/src/validation/perf.ts apps/demo/e2e/validation-perf.soak.ts apps/demo/vite.config.ts playwright.validation.config.ts docs/validation/perf/README.md docs/validation/perf/ticks.json
git commit -m "feat(validation): performance gate — Node tick percentiles, 60/30 fps frame histograms, 60-min heap soak"
git push
```

---

### Task 24: Merge main, the first full run, the 60-minute soak, gate note, PR

**Files:**
- Create: `docs/validation/report.md`, `docs/validation/report.json`, `docs/validation/calibration-queue.md`, `docs/validation/perf/soak-<date>.json`, `docs/gates/stage-8a.md`
- Modify (regenerated, only if Step 2 says so): `packages/validation/baselines/*.json`

**Interfaces:**
- Consumes: every task above.
- Produces: the gate evidence and PR. Does NOT merge (R21: the orchestrator inspects and merges).

- [ ] **Step 1: Bring the branch up to date with main (Stages 3.1, V, 7a–7g may have merged since `6eeb6d1`). Keep both sides of any conflict; `NOTICES.md` keeps every ID**

```bash
git fetch origin
git merge origin/main
npx -y pnpm@9.15.9 install
npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 check-notices
```

- [ ] **Step 2: Re-check the regression baselines against the merged engine. Expected on a main with new physiology: some rows red. Do NOT silently rebaseline: list every red channel in the gate note with the stage that moved it, then rebaseline and commit the new files in their own commit**

```bash
npx -y pnpm@9.15.9 validate --suites regression,determinism --out /tmp/pme-8a-reg || true
grep -E "🔴|🟡" /tmp/pme-8a-reg/report.md || echo "baselines unchanged"
npx -y pnpm@9.15.9 validate --suites regression,determinism --rebaseline --out /tmp/pme-8a-reg
git add packages/validation/baselines
git commit -m "chore(validation): rebaseline waveforms and golden hashes after merging main" || true
```

- [ ] **Step 3: The first full run with the oracle (≈ 30–45 min on the Mac). Every command from the worktree root**

```bash
npx -y pnpm@9.15.9 --filter @pme/validation datasets:fetch
PME_PULSE_DIR=/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/research/pulse-spike/web npx -y pnpm@9.15.9 validate --seeds 11,12 2>&1 | tee /tmp/pme-8a-validate.log
tail -3 /tmp/pme-8a-validate.log
```

Expected: `report: …/docs/validation/report.md — N queued, M gating`. A non-zero exit is EXPECTED on the first run (the planning prototype already showed red rows: PPV/SPV, notch kind). Red rows are the calibration queue's content, not harness failures — do not loosen any band. Harness failures (exceptions, NaN rows that should have data, a suite that produced nothing) are fixed before continuing.

- [ ] **Step 4: The 60-minute soak and frame histograms (≈ 65 min), plus the 600 s tick bench**

```bash
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test -c playwright.validation.config.ts
npx -y pnpm@9.15.9 --filter @pme/validation perf:ticks --seconds 600
```

- [ ] **Step 5: Full clean-state check (the CI rule: no dataset needed by the unit tests). Expected: exit 0 everywhere; `@pme/validation` unit tests < 60 s in total**

```bash
npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 test:e2e
```

- [ ] **Step 6: Write `docs/gates/stage-8a.md`** — the gate note, in the house format of `docs/gates/stage-3.md`: gate question ("Does the harness measure what the brief §9 asks, identically on recorded and generated signals, and does its report hand Ali a calibration queue he can act on?"); a table with every number: dataset counts (VitalDB cases/windows, MGH/MF records, PWDB subjects, PTB-XL records), each morphology row (recorded vs engine median, KS, W1, grade), the sanity and gate documents (graded / not measurable, with the refusing command), regression (channels red after the merge and why), determinism runs, oracle rows with the wasm hash, soak (heap per minute, growth, sim-time ratio, alarms), frame histograms, tick percentiles; the calibration-queue count by suite; the review kit and bedside page status ("ready; Ali to run at the gate" — the blind review and bedside check are HUMAN steps, not executor steps); deviations from this plan; partition statement (no file under `packages/engine-core`, `packages/renderer/src`, `packages/controller/src`, `packages/skins` changed: `git diff --stat origin/main -- packages/engine-core packages/renderer/src packages/controller/src packages/skins` prints nothing); licence statement (no raw record committed: `git ls-files | grep -Ei '\.(vital|dat|hea|atr)$'` prints nothing).

- [ ] **Step 7: Commit the report, gate note and plan ticks; push**

```bash
git add docs/validation docs/gates/stage-8a.md docs/plans/stage-8a-validation.md
git commit -m "docs(validation): first full validation report, calibration queue, stage 8a gate evidence"
git push
```

- [ ] **Step 8: Open the PR (do not merge). The body lists the gate numbers' headline, the calibration-queue size, the human steps left for Ali (blind review, bedside check, iPad perf) and ends with the attribution line**

```bash
gh pr create --base main --head stage-8a-validation --title "Stage 8a: validation harness (datasets, morphology metrics, segment validation, Pulse oracle, review kit, bedside checklist, perf gate)" --body "$(cat <<'BODY'
Implements docs/plans/stage-8a-validation.md (24 tasks). Gate evidence: docs/gates/stage-8a.md. Report: docs/validation/report.md; calibration queue: docs/validation/calibration-queue.md (R44).

- Datasets (VitalDB CC BY 4.0, MGH/MF ODC-By, PWDB PDDL, PTB-XL CC BY 4.0) fetched into the git-ignored cache by manifest; only ids, window times, hashes and derived statistics are committed (NOTICES N-080…N-084).
- One metric implementation for recorded and generated signals; R40 grading (green/yellow/red at 10/30 %), evidence bands as pass criteria.
- `pnpm validate` → report.md/json + calibration queue; long runs gated behind the weekly/`run-validation` workflow.
- Human steps for the gate: blind realism review (validation-review.html), Saadat bedside check (validation-bedside.html), iPad perf reading.

Sources consulted: VitalRecorder file-format description; PhysioNet header/signal docs; Pulse audit research/08 (method only, no code opened).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

---

## Self-review (planning)

**Spec coverage** (task brief → tasks):
1. Dataset layer with checksums, licences, attribution — VitalDB selection by metadata with synchronous ECG II/ART/PLETH/CO2 (Tasks 2, 4, 6), MGH/MF (5, 6), PWDB (3, 5), CUDB/MIT-BIH/PTB-XL reuse Stage 5 (3, 11); NOTICES N-080…N-084 (3, 16); nothing redistributed (Global Constraints, 24 step 6).
2. Morphology metrics — R→upstroke (7), notch timing/depth (7), upstroke slope (7), PPV/SPV vs airway phase (8), PPG/ABP delay/shape/count (8), α and phase III slope in the Stage 3.1 convention (4, 8), EtCO2–PaCO2 (8: recorded side; engine side waits for a public PaCO2, reported), QRS/QT/PR vs PTB-XL (9, 11), HR averaging vs recorded numerics (8), NIBP vs ABP (8, 10); identical code on both sides (10: `computeWindowMetrics`); KS/Wasserstein/coverage + bands + 10/30 % grades (7, 11).
3. Segment runner — types EqualTo/GreaterThan/LessThan/TrendsTo/Range over time windows on numerics/events (11, 12); sanity scenarios brief §4.9 + tables §7 (13); gate numbers with band rules (14); 2 % per-sample waveform baselines (15); Pulse oracle with expected disagreements (16); `pnpm validate` → report.md + JSON (17, 18); CI on schedule/label (19).
4. Blind review kit — matched real vs synthetic clips through OUR renderer, hidden key, per-rater shuffle, 1–5 + real/synthetic, scoring (accuracy, rating gap, binomial p), second clinician supported (20, 21).
5. Saadat bedside checklist page + results file feeding skin provenance (22).
6. Performance — 60-min soak with ≤ 5 MB growth, 60/30 fps histograms, worker tick percentiles, iPad manual note, determinism (15, 23, 24).
7. Report template with per-metric tables, grades and a calibration queue (17), first real report (24).
Branch/worktree/push-per-task/PR (1, every task, 24). 24 tasks (target 20–28).

**Placeholder scan:** every code step carries the full file; Task 24 step 6 describes a document whose numbers only exist after the run (that is the gate note, as in every stage). No "TBD".

**Type consistency:** `WindowMetrics` fields (Task 10) are the ones `series()` (Task 11) and the validate CLI's pseudo-window (Task 18) use; `Target.threshold`/`Reduce` (Task 11) match `SeriesStore.reduce(…, threshold)` (Task 12); `DocRun.measurable/unsupported` (Task 12) feed `DocSummary` (Task 17) and `runOracle` (Task 16); `ReviewBundle`/`ReviewAnswers` schemas (Task 20) match what the page writes (Task 21, verified by its e2e test); `BedsideResults` (Task 22) is what the page downloads (verified by its e2e test).

**Known limits, stated for the executor and the gate:** the engine has one arterial waveform site (femoral windows are compared against a radial-shaped engine pulse — expect V1/V2 deltas on femoral rows; recorded site is in every row's group); VitalDB PLETH carries monitor latency (report-only); MGH/MF CO2 is uncalibrated (α report-only); MODELED-mode documents are not measurable until Stage 7 merges — they turn live without edits.

**Rebuild note:** the session scratchpad holding the prototype was wiped once mid-planning. Tasks 1–13 were re-materialised from this file into a fresh copy of `6eeb6d1`, and every task's tests were re-run there: `@pme/validation` 83 passed + 1 skipped (the oracle test without `PME_PULSE_DIR`), `pnpm typecheck` clean, the review/bedside e2e tests and a 2-min soak passed. The real-data numbers in Tasks 4, 6, 8, 11, 13 come from the first scratch (VitalDB 0001/1885/3101/1341, MGH/MF 001–003/021, PWDB, 100 PTB-XL records) before the wipe.
