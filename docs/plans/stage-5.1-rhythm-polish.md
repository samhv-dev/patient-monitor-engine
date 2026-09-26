# Stage 5.1: Rhythm Morphology Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the rhythm-morphology defects found on the Gate 5 strips (G5-obs: periodic coarse VF, flat V1 in VF and polymorphic VT, weak RBBB, subtle STEMI, weak K 8.5 sine wave and Osborn J, TCP artefact that looks like a QRS), fix TCP demand-pacing rate (R30), give the ECG a pluggable respiratory clock (R-S3-3) and a bounded per-patient fingerprint — each proven by a test that measures the generated waveform — with before/after strips and a gate note.

**Architecture:** All engine changes stay inside `packages/engine-core/src/l2/ecg/**`: the VF generator mixes two independent hopping CUDB texture channels with Ornstein–Uhlenbeck frequency/amplitude jitter; BBB, ST, K⁺, temperature and fingerprint are edits to the existing morphology stages (kernel lists on the 3-axis VCG, projected through the Dower rows); TCP stays a planner clock with its marker event; a `BreathClock` interface replaces the fixed respiratory sinusoid with a bit-identical default. A new test helper (`test/helpers/s51.ts`) measures QRS width by the tangent method, periodicity, spectral bandwidth, lead ratios and ST at J+60 on the waveform.

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2, Vite 6.4, Node ≥ 22.12 (`--experimental-strip-types` for scripts), Playwright 1.63 with system Chrome for strips. No new dependencies.

**Spec:** `../research/00-orchestrator-rulings.md` — G5-obs (the defect list), R17 (lead ratios: V-lead ratios are not a target), R18, R21 (orchestrator merges), R25 (partition, worktrees), R29 item R-S3-3 (ECG RSA reads the breath driver), R30 (demand pacing 68.4 vs 70 ppm, Stage 5.1 fix). `docs/gates/stage-5.md` (per-rhythm numbers; "Observations for Ali"). `docs/DESIGN-BRIEF.md` §3.5 (pace marks are overlays), §4.1, §5, §6.5. `../research/03-waveform-physiology-reference.md` §1.6 (ST, hyperkalaemia, Osborn), §1.7 (pacing), §1.8 (VF). `../research/04-squiggler-and-web-sims.md` §5 (fingerprint). `docs/gates/stage-1.1.md` (tangent-method measurement; CI yielding rule). `docs/plans/stage-5-rhythm-library.md` (house style, Stage 5 decisions).

## Global Constraints

- **Base.** Written and verified against `origin/main` at `2d59ee3` (contains `f88175d`, the Stage 2 merge, and Stage 5). Every task was applied in order on a fresh copy of that tree and its tests run: each new test failed before its implementation step and passed after; the full `pnpm -r typecheck` and `pnpm -r test` passed at the end (engine-core 330 tests; controller 185, skins 155, audio 58, renderer 31, validation 16).
- Paths are relative to the worktree root `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/wt-stage-5.1`; run every command there. pnpm is always `npx -y pnpm@9.15.9`. Test command: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run <paths>`.
- **Push after every task** (`git push`); the last task opens a PR and does NOT merge (R21).
- Strict TS (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `erasableSyntaxOnly`), `.ts` import extensions, conventional commits, the commit trailer your session's attribution instructions give. No runtime dependencies in `@pme/engine-core`. Every constant carries a citation or `[ENG]`.
- **Every acceptance test measures the generated waveform** (continuous kernel waveforms at 2 kHz, or 500 Hz lead samples), never reads a constant back.
- **CI yielding rule (G2):** any test that runs minutes of sim time yields between chunks (`await new Promise<void>((r) => setImmediate(r))`) and declares `{ timeout: 300_000 }`.
- **Clean room (R6):** never open ECGSYN (C/MATLAB/any port — copies sit in the planning scratchpad), NeuroKit2's ECGSYN, or any GPL/unlicensed code. Everything here is written from the brief, research 03/04 and the Dower rows already in `vcg.ts`.
- **Determinism:** same seed + same commands → identical samples. New randomness uses existing private PRNG states (VF episode `rng`, the fingerprint's own `createRngState(seed).scenario` copy); no new engine streams.

## Partition (R25, binding)

- **Stage 5.1 owns:** `packages/engine-core/src/l2/ecg/**`, `packages/engine-core/templates/**`, `packages/engine-core/test/l2/ecg/**`, `packages/engine-core/test/helpers/s51.ts`, `apps/demo/stage5.html`, `apps/demo/src/{stage5,strip,stage5-catalogue}.ts`, `apps/demo/scripts/stage5-shots.ts`, `docs/gates/stage-5.1*`, this plan.
- **Do not touch:** `l2/hemo/**`, `l2/resp/**`, `l2/gas/**`, `l2/co2/**` (Stage 3); `l3/alarms/**`, `l3/defib-pacer/**`, `l3/capture12/**`, `l3/trends/**`, `packages/renderer/**` (Stage 4b); `l3/ecg-filter.ts` and `l3/qrs.ts` (read-only imports in tests are fine).
- **Pace marker:** emitted by `l2/ecg/tcp.ts` (ours, unchanged shape `marker { kind: 'paceSpike', data: { chamber: 2, captured, tcp: true, mA } }`). Drawing it is the renderer's (Stage 4b: `Overlays.push` already maps `data.tcp`) — requests below, no edits.
- **Declared exception (conditional):** Task 11 Step 7 adds 2 imports + 2 marked hunks to `packages/engine-core/src/engine.ts` ONLY if Stage 3 is already on `main`; otherwise it becomes request R-51-2.

## Decisions this plan makes

1. **QRS width is the global 12-lead tangent measurement** (earliest tangent onset → latest tangent offset, near-null leads skipped). On the textbook beat it reads 85 ms; kernel ±2.5σ spans (`qrsSpanMs`, used in beat events) remain the engine's own convention and are not the acceptance number.
2. **ST is measured against the PR segment, through the diagnostic filter, as a paired difference** (same seed with/without the modifier), at J + 60 ms with J from the tangent QRS. `mm` is the MEAN over the territory's index leads. The monitor filter under-reads by ≈ 12 % (a real monitor-mode effect, left as is); the STEMI strips use the diagnostic filter and say so.
3. **VF amplitude definition unchanged** (lead II 2√2·RMS); the two-channel mix is normalised to it, so every Stage 5 VF number (τ, coarse→fine at 582 s, asystole) still holds.
4. **The −3 dB bandwidth estimator has a 1.47 Hz floor** on a pure tone (10 s window, Welch nfft 1024, Hann, 3-bin smoothing). "≥ 1.5 Hz" alone barely separates Stage 5 (min 1.50) from Stage 5.1 (min 1.75), so the test also requires a median ≥ 2.2 Hz (Stage 5 1.78, Stage 5.1 2.71). Autocorrelation is the main periodicity measure (Stage 5 max 0.80 → 0.53).
5. **TCP artefact = a tall short spike + polarisation tail**, not the brief §6.5 "wide blunt 20–40 ms" deflection (G5-obs asked for a large spike; research 03 §1.7 says monitors blank/filter the long pulse). Recorded as a brief deviation.
6. **`pacedV` stays one template** for implanted VVI/DDD and TCP capture (Stage 4b's tests assert `template === 'pacedV'`); it gets broader and lower-slope.
7. **Fingerprint default stays off** (`morphologyVariation = 0`), as Stage 5 decided: Stage 1's fitted amplitudes and textbook tests depend on it.
8. **No changes to `qrsOverrideStage`.** The Stage 5 note "QRS 140 override looks narrower" is real (tangent 128 ms for a 140 ms kernel span) but outside G5-obs; it is listed for Ali (Task 14) rather than changed silently.

## Prototype results (planning scratchpad, 2026-09-25; nothing committed)

| Item | Stage 5 (measured) | Stage 5.1 (prototype) | Test |
|---|---|---|---|
| vfCoarse ACF at dominant period (20 seeds × 4 × 10 s) | max 0.80 | max **0.53**, median 0.28 | < 0.6 |
| vfCoarse −3 dB bandwidth | min 1.50, median 1.78 Hz | min **1.75**, median **2.71** Hz | ≥ 1.5, median ≥ 2.2 |
| vfCoarse V1/II, V5/II (40 seeds) | 0.24–0.36, 0.39–0.47 | **0.41–0.92**, **0.50–0.96** | 0.4–1.0 |
| vtPoly V1/II (40 seeds × 3) | 0.25–1.59 | **0.54–0.92** | 0.4–1.0 |
| RBBB tangent QRS; V1 R′ | 121 ms; 0.50 mV | **148 ms**; **0.80 mV** (r 0.16, S −0.76), V6 S −0.43 | ≥ 130; R′ ≥ 0.6 and ≥ 2 r |
| LBBB tangent QRS; V1 | 135 ms; two troughs | **152 ms**; one trough −1.00, r 0.08; V6 notched, no q/S | ≥ 120; one trough |
| Inferior STEMI 2 mm at J+60 (diag) | II 0.14, III 0.20, aVF 0.17 | II **0.199**, III **0.204**, aVF **0.202**; aVL **−0.104** | 0.2 ± 0.02; recip ≤ −0.05 |
| Other territories 2 mm (index / recip) | one lead each | anterior V2 0.193 V3 0.211 / III −0.075; septal 0.199 0.204 / V6 −0.126; lateral aVL 0.204 V6 0.200 / III −0.237; anterolateral V3 0.195 V5 0.188 / III −0.067; posterior V1 −0.191 V2 −0.212 | same |
| K 8.5 (II) | QRS 224 ms, T/R 0.64, trough −0.17·R | QRS **175 ms**, T/R **1.01**, trough **−0.65·R**, 0 ms flat | ≥ 160; 0.6–1.4; ≤ −0.3·R |
| Osborn J II / V5 at 30 °C | 0.11 (V3-sized) | **0.122 / 0.148**; 32 °C 0.041/0.049, 28 °C 0.204/0.246 | ≥ 0.1, monotone |
| Paced capture QRS; steepest slope vs sinus | 133 ms | **155 ms**; 21 % | ≥ 140; ≤ 40 % |
| TCP demand 70 ppm, no intrinsic beats | 68.4 ppm (R30) | **70 / 60 s** (demand and fixed) | 70 ± 1 |
| TCP spike at 50 mA (raw II / V1; FWHM) | ≈ 40 ms blunt | **2.80 / 2.66 mV; 8 ms**; tail −0.31 mV | ≥ 2 mV; ≤ 12 ms |
| No capture: samples outside [−25, +400] ms | — | **bit-identical**; beats identical | equal |
| RSA vs driver phase (10/min driver) | fixed clock only | r **0.85** (−0.01 vs 15/min clock); default path hash-identical | > 0.7 |
| Fingerprint axis (30 seeds) | ±20° VCG rotations | **−14.2° … +14.3°** measured | ±15° |

Full suite on the prototype: `pnpm -r typecheck` clean; engine-core 330, controller 185 (Stage 6b ACLS scenarios included), skins 155, audio 58, renderer 31, validation 16 — all pass. Strips viewed before/after (vfCoarse, vtPoly, rbbb, lbbb, stemiInferior, hyperKsine, tcpCapture, tcpNoCapture, individualityA).

## Requests to other stages (repeat in the gate note)

| ID | Owner | Request | Meanwhile |
|---|---|---|---|
| R-51-1 | Stage 4b (renderer overlays) | Draw TCP pace marks (`marker.data.tcp === true`) on every lane of a pacer skin, taller than implanted-pacer marks; the sampled spike is now 3–6 mV and narrow, so the overlay must not be mistaken for it (draw 1–2 mm above the lane top, brief §3.5) | The Stage 5 strip draws white ticks |
| R-51-2 | Orchestrator / whoever merges second of Stage 3 and 5.1 | If Stage 3 was not on `main` when Task 11 ran: apply Task 11 Step 7 (engine.ts: `breath: breathOf(ps)` in `rhythmCtx()` and `ecgGenInputs({ ...ps, breath })`, + `test/engine/ecg-breath.test.ts`) | RSA uses the fixed 15/min clock |
| R-51-3 | Stage 4b / L3 owner (`l3/qrs.ts`) | Pace-pulse rejection: during TCP the QRS detector counts pad artefacts — asystole + 50 mA fixed pacing reads HR 70 (true on Stage 5 too; measured while planning). Blank detection for ~60 ms after each `paceSpike` marker, or use 4b's HR dashes | Known false HR during non-capturing TCP |
| R-51-4 | Stage 4b | Their gate note line "demand with capture runs at 68.4 ppm (R-4b-2)" becomes 70 ppm after this merges; their tests use fixed mode, so nothing breaks | — |

## File map

| Path | Responsibility | Task |
|---|---|---|
| `packages/engine-core/test/helpers/s51.ts` | waveform measurements (tangent QRS, ACF, bandwidth, ratios, peaks) | 2 |
| `packages/engine-core/src/l2/ecg/texture.ts` | recorded-texture player; optional hopping | 3 |
| `packages/engine-core/src/l2/ecg/arrest/vf.ts` | VF: two channels, OU jitter | 4 |
| `packages/engine-core/src/l2/ecg/foci-ventricular.ts` | polymorphic VT axis walk | 5 |
| `packages/engine-core/src/l2/ecg/beat-templates.ts` | RBBB R′ vector (6), pacedV widths (9) | 6, 9 |
| `packages/engine-core/src/l2/ecg/morphology/conduction.ts` | BBB stage (6), `solveAxisRad` (12) | 6, 12 |
| `packages/engine-core/src/l2/ecg/morphology/st.ts` | STEMI territories | 7 |
| `packages/engine-core/src/l2/ecg/morphology/electrolytes.ts` | sine wave, Osborn | 8 |
| `packages/engine-core/src/l2/ecg/tcp.ts`, `rhythm-state.ts` | TCP spike, demand fix; `tcpLastPulseT` | 10 |
| `packages/engine-core/src/l2/ecg/breath-clock.ts` (new), `hrv.ts`, `atria.ts`, `rhythm-engine.ts`, `generator.ts`, `ecg-gen.ts`, `rhythm-state.ts` | BreathClock seam | 11 |
| `packages/engine-core/src/l2/ecg/morphology/individuality.ts` | fingerprint | 12 |
| `apps/demo/src/strip.ts`, `apps/demo/scripts/stage5-shots.ts`, `apps/demo/src/stage5-catalogue.ts` | strips | 7, 13 |
| `packages/engine-core/test/l2/ecg/s51/*.test.ts` | Stage 5.1 acceptance tests | 2–12 |
| `docs/gates/stage-5.1.md`, `docs/gates/stage-5.1/*.png` | gate evidence | 1, 13, 15 |

---

### Task 1: Worktree, branch, baseline and the "before" strips

Create the Stage 5.1 branch in its own worktree (Stages 3 and 4b run concurrently on this repo), check the base, record the baseline and park the Stage 5 strips as the "before" half of every pair.

**Files:**
- Create: worktree `../scratch/wt-stage-5.1` on branch `stage-5.1-rhythm-polish`
- Create: `docs/plans/stage-5.1-rhythm-polish.md` (this file, committed onto the branch)
- Create: `docs/gates/stage-5.1/*-before.png` (copies of `docs/gates/stage-5/<key>.png`)

**Interfaces:**
- Consumes: `origin/main` at or after `f88175d` (Stage 5 + Stage 2 merged).
- Produces: a clean worktree where every later command runs; `docs/gates/stage-5.1/` with the before strips.

- [x] **Step 1: Create the worktree from `origin/main` (never work in the shared `repo/` checkout)**

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin
git worktree add ../scratch/wt-stage-5.1 -b stage-5.1-rhythm-polish origin/main
cd ../scratch/wt-stage-5.1
npx -y pnpm@9.15.9 install --frozen-lockfile
```

- [x] **Step 2: Check the base. Expected: `f88175d` is an ancestor (prints `base ok`), and the Stage 5 files this plan edits exist**

```bash
git merge-base --is-ancestor f88175d HEAD && echo "base ok"
ls packages/engine-core/src/l2/ecg/arrest/vf.ts packages/engine-core/src/l2/ecg/tcp.ts packages/engine-core/src/l2/ecg/morphology/individuality.ts
git diff 2d59ee3 HEAD --stat -- packages/engine-core/src/l2/ecg packages/engine-core/test/l2/ecg packages/engine-core/test/helpers apps/demo/src/strip.ts apps/demo/src/stage5-catalogue.ts apps/demo/scripts/stage5-shots.ts
```

The last command lists changes on `main` since the tree this plan was verified against (`2d59ee3`). If it lists anything, read those hunks now; when a later "replace" anchor does not match exactly once, apply the plan's intent to the new text and record it under "Deviations" in the gate note.

- [x] **Step 3: Check whether Stage 3 has merged (decides Task 11 Step 7). Record the answer in your notes**

```bash
git cat-file -e HEAD:packages/engine-core/src/l2/resp/driver.ts && echo "stage 3 merged" || echo "stage 3 not merged"
```

- [x] **Step 4: Baseline — everything green before touching anything**

```bash
npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 check-notices
```

- [x] **Step 5: Copy the Stage 5 strips that this stage changes as the "before" images**

```bash
mkdir -p docs/gates/stage-5.1
for k in vfCoarse vfFine vfEpinephrine cpr shock vtPoly torsades rbbb lbbb pacAberrant stemiInferior stemiAnterior hyperK hyperKsine osborn tcpCapture tcpNoCapture pacedVVI pacedDDD failureToCapture individualityA individualityB; do
  cp docs/gates/stage-5/$k.png docs/gates/stage-5.1/$k-before.png
done
ls docs/gates/stage-5.1 | wc -l   # expected: 22
```

- [x] **Step 6: Copy this plan into the worktree and commit; push the branch**

```bash
cp /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo/docs/plans/stage-5.1-rhythm-polish.md docs/plans/
git add docs/plans/stage-5.1-rhythm-polish.md docs/gates/stage-5.1
git commit -m "docs(plan): stage 5.1 rhythm morphology polish plan; before strips"
git push -u origin stage-5.1-rhythm-polish
```

---

### Task 2: Measurement helpers (tangent QRS, periodicity, bandwidth, lead ratios)

Every Stage 5.1 acceptance number is measured on the generated waveform. This task adds the measuring tools and pins their behaviour on known signals, so later tasks can trust them. No engine code changes.

The methods:
- **QRS duration (global tangent method).** Per lead, on the noise-free continuous waveform at 2 kHz (the same convention as Stage 1.1's tangent QT helper `test/helpers/qt.ts`): the tangent at the steepest point of the first limb whose slope reaches 15 % of the lead's steepest slope meets 0 mV at the onset; the same for the last limb gives the offset. Near-null leads (steepest slope < 30 % of the steepest lead's) are skipped. QRS = earliest onset → latest offset over 12 leads. Window: R fiducial −100 ms to +120 ms. On the textbook beat this reads 85 ms; RBBB 148, LBBB 152, paced 155, wide PVC 144 (planning prototype).
- **Periodicity:** peak normalised autocorrelation for lags 0.8–1.25 × the dominant period, after a 0.5 s moving-average detrend.
- **Bandwidth:** −3 dB width of the Welch PSD (nfft 1024, Hann, 3-bin smoothing, interpolated crossings). Its floor on a pure tone is 1.47 Hz (asserted below), which is why Task 4 also bounds the median.
- **Lead ratio:** detrended RMS ratio.

**Files:**
- Create: `packages/engine-core/test/helpers/s51.ts`
- Test: `packages/engine-core/test/l2/ecg/s51/helpers.test.ts`

**Interfaces:**
- Consumes: `kernelLead`, `morphBeat` (Stage 5 `test/helpers/s5.ts`), `welch`, `rms` (`src/util/dsp.ts`), `fiducialOf` (`beat-templates.ts`).
- Produces: `qrsGlobal(lead: (l: LeadId, t: number) => number, tR: number): { ms, on, off }`, `beatQrs(k, tR)`, `detrend(x)`, `acfAtPeriod(x, fs, fd)`, `spectralPeak(x, fs): { fd, bw }`, `rmsRatio(a, b)`, `without(k, wave)`, `peaks(k, lead, t0, t1, min, sign?)`, re-export `WAVE`.

- [x] **Step 1: Write the helpers**

Create (or replace) `packages/engine-core/test/helpers/s51.ts` with exactly:

```ts
// Stage 5.1 measurement helpers: every acceptance number is measured on the generated waveform (continuous kernel
// waveforms at 2 kHz, or 500 Hz lead samples), never read back from a constant.
import { welch, rms } from '../../src/util/dsp.ts';
import { K_STRIDE, WAVE } from '../../src/l2/ecg/kernels.ts';
import { LEAD_IDS, type LeadId } from '../../src/types.ts';
import { kernelLead } from './s5.ts';

export const FS2K = 2000;
const QRS_PRE_S = 0.1; // search window around the R fiducial
const QRS_POST_S = 0.12;

/**
 * Global QRS duration by the tangent method (ms). Per lead: the tangents at the steepest point of the first and of
 * the last limb whose slope reaches 15 % of that lead's steepest slope meet the isoelectric line (0 mV) at the onset
 * and the offset. Leads whose steepest slope is < 30 % of the steepest lead are skipped (near-null leads, where a T
 * wave outranks the QRS). QRS = earliest onset → latest offset over the 12 leads (the usual global measurement).
 * `lead(l, t)` is the noise-free waveform, t in s relative to the same origin as tR (the R fiducial).
 */
export function qrsGlobal(lead: (l: LeadId, t: number) => number, tR: number): { ms: number; on: number; off: number } {
  const n = Math.round((QRS_PRE_S + QRS_POST_S) * FS2K);
  const tt = (i: number) => tR - QRS_PRE_S + i / FS2K;
  const tr = LEAD_IDS.map((l) => {
    const v = Float64Array.from({ length: n + 1 }, (_, i) => lead(l, tt(i)));
    const s = Float64Array.from({ length: n + 1 }, (_, i) => (i === 0 || i === n ? 0 : ((v[i + 1]! - v[i - 1]!) * FS2K) / 2));
    let peak = 0;
    for (let i = 0; i <= n; i++) peak = Math.max(peak, Math.abs(s[i]!));
    return { v, s, peak };
  });
  const smax = Math.max(...tr.map((x) => x.peak));
  let on = Infinity;
  let off = -Infinity;
  for (const { v, s, peak } of tr) {
    if (peak < 0.3 * smax) continue;
    const th = 0.15 * peak;
    let a = 0;
    while (a < n && Math.abs(s[a]!) < th) a++;
    while (a < n && Math.abs(s[a + 1]!) > Math.abs(s[a]!)) a++;
    let b = n;
    while (b > 0 && Math.abs(s[b]!) < th) b--;
    while (b > 0 && Math.abs(s[b - 1]!) > Math.abs(s[b]!)) b--;
    on = Math.min(on, tt(a) - v[a]! / s[a]!);
    off = Math.max(off, tt(b) - v[b]! / s[b]!);
  }
  return { on, off, ms: (off - on) * 1000 };
}

/** qrsGlobal of one beat's kernel list (QRS onset at 0, R fiducial at `tR`). */
export function beatQrs(k: readonly number[], tR: number): { ms: number; on: number; off: number } {
  return qrsGlobal((l, t) => kernelLead(k, l, t), tR);
}

/** Remove < ~1 Hz content with a centred 0.5 s moving average (as s5/vf.test.ts). */
export function detrend(x: ArrayLike<number>): Float64Array {
  const h = 125;
  const n = x.length;
  const out = new Float64Array(n);
  let acc = 0;
  let lo = 0;
  let hi = -1;
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - h);
    const b = Math.min(n - 1, i + h);
    while (hi < b) acc += x[++hi] as number;
    while (lo < a) acc -= x[lo++] as number;
    out[i] = (x[i] as number) - acc / (b - a + 1);
  }
  return out;
}

/** Peak normalised autocorrelation for lags within 0.8–1.25 dominant periods (1/fd) of the detrended signal. */
export function acfAtPeriod(x0: ArrayLike<number>, fs: number, fd: number): number {
  const x = detrend(x0);
  const n = x.length;
  let e = 0;
  for (let i = 0; i < n; i++) e += x[i]! ** 2;
  let best = -1;
  for (let L = Math.floor((0.8 * fs) / fd); L <= Math.ceil((1.25 * fs) / fd); L++) {
    let s = 0;
    for (let i = 0; i + L < n; i++) s += x[i]! * x[i + L]!;
    best = Math.max(best, s / (n - L) / (e / n));
  }
  return best;
}

/** Dominant frequency (1–12 Hz) and −3 dB bandwidth (Hz) of the Welch PSD (nfft 1024, 3-bin smoothed, crossings interpolated). */
export function spectralPeak(x: ArrayLike<number>, fs: number): { fd: number; bw: number } {
  const { f, p } = welch(detrend(x), fs, 1024);
  const sm = new Float64Array(p.length);
  for (let k = 0; k < p.length; k++) sm[k] = (p[Math.max(0, k - 1)]! + p[k]! + p[Math.min(p.length - 1, k + 1)]!) / 3;
  let pk = 0;
  for (let k = 0; k < p.length; k++) if (f[k]! >= 1 && f[k]! <= 12 && sm[k]! > sm[pk]!) pk = k;
  const half = sm[pk]! / 2;
  let a = pk;
  let b = pk;
  while (a > 0 && sm[a - 1]! >= half) a--;
  while (b < p.length - 1 && sm[b + 1]! >= half) b++;
  const df = f[1]! - f[0]!;
  const lo = a > 0 ? f[a]! - (df * (sm[a]! - half)) / (sm[a]! - sm[a - 1]!) : f[a]!;
  const hi = b < p.length - 1 ? f[b]! + (df * (sm[b]! - half)) / (sm[b]! - sm[b + 1]!) : f[b]!;
  return { fd: f[pk]!, bw: hi - lo };
}

/** RMS of a over RMS of b, both detrended. */
export function rmsRatio(a: ArrayLike<number>, b: ArrayLike<number>): number {
  return rms(detrend(a)) / rms(detrend(b));
}

/** The same kernel list without the kernels of one wave code (to isolate that wave's share of the waveform). */
export function without(k: readonly number[], wave: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < k.length; i += K_STRIDE) if (k[i + 6] !== wave) out.push(...k.slice(i, i + K_STRIDE));
  return out;
}

/** Local maxima (value, time) of lead l over [t0, t1] (2 kHz) whose value exceeds `min`. */
export function peaks(k: readonly number[], l: LeadId, t0: number, t1: number, min: number, sign: 1 | -1 = 1): { t: number; v: number }[] {
  const out: { t: number; v: number }[] = [];
  const at = (t: number) => sign * kernelLead(k, l, t);
  for (let t = t0 + 1 / FS2K; t < t1; t += 1 / FS2K) {
    const v = at(t);
    if (v > min && v >= at(t - 1 / FS2K) && v > at(t + 1 / FS2K)) out.push({ t, v: sign * v });
  }
  return out;
}

export { WAVE };
```

- [x] **Step 2: Write their tests**

Create (or replace) `packages/engine-core/test/l2/ecg/s51/helpers.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { fiducialOf } from '../../../../src/l2/ecg/beat-templates.ts';
import { morphBeat } from '../../../helpers/s5.ts';
import { acfAtPeriod, beatQrs, rmsRatio, spectralPeak } from '../../../helpers/s51.ts';

describe('Stage 5.1 measurement helpers', () => {
  const tone = Float64Array.from({ length: 5000 }, (_, i) => Math.sin((2 * Math.PI * 5 * i) / 500));
  it('a pure 5 Hz tone: dominant 5 Hz, ACF at its period ≈ 1, and the bandwidth estimator\'s own floor (Hann window + 3-bin smoothing) is ≈ 1.47 Hz', () => {
    const { fd, bw } = spectralPeak(tone, 500);
    expect(Math.abs(fd - 5)).toBeLessThanOrEqual(0.5);
    expect(bw).toBeGreaterThan(1.4);
    expect(bw).toBeLessThan(1.55);
    expect(acfAtPeriod(tone, 500, fd)).toBeGreaterThan(0.95);
  });
  it('rmsRatio of a half-scaled copy is 0.5', () => {
    expect(rmsRatio(tone.map((v) => v / 2), tone)).toBeCloseTo(0.5, 6);
  });
  it('tangent QRS of the textbook narrow beat is 80–100 ms', () => {
    const k = morphBeat({});
    const ms = beatQrs(k, fiducialOf(k)).ms;
    expect(ms).toBeGreaterThanOrEqual(80);
    expect(ms).toBeLessThanOrEqual(100);
  });
});
```

- [x] **Step 3: Run them**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s51/helpers.test.ts`
Expected: PASS (3 tests). These pass on the untouched engine: the textbook beat is 80–100 ms by the tangent method.

- [x] **Step 4: Commit and push**

```bash
git add packages/engine-core/test/helpers/s51.ts packages/engine-core/test/l2/ecg/s51/helpers.test.ts
git commit -m "test(ecg): stage 5.1 waveform measurement helpers"
git push
```

---

### Task 3: Recorded-texture hopping

G5-obs: coarse VF "too periodic"; the executor saw the first ~3 s regular. One cause: each 8 s CUDB window plays to its end, and some windows open with a regular run. The texture player gets an optional hop interval: after 1–2.5 s of output it crossfades (0.5 s, equal power, as before) into a random window at a random point in its first 5 s. Without `hopS` the Stage 5 behaviour is unchanged (AF does not use this player).

**Files:**
- Modify: `packages/engine-core/src/l2/ecg/texture.ts`
- Test: `packages/engine-core/test/l2/ecg/s5/texture.test.ts` (append)

**Interfaces:**
- Consumes: nothing new.
- Produces: `createTex(n, rng, hopS: readonly [number, number] | null = null): TexState`; `TexState` gains `left: number`, `hop: [number, number] | null` (JSON-safe).

- [x] **Step 1: Write the failing test**

In `packages/engine-core/test/l2/ecg/s5/texture.test.ts`, replace this block (it occurs exactly once):

```ts
  });
});
```

with:

```ts
  });
});

describe('recorded-texture player: hopping (Stage 5.1)', () => {
  it('with hopS [1, 2.5] the player changes segment every 1–2.5 s (+ 0.5 s crossfade); without it, only at segment ends', () => {
    const tex = decodeTemplates(synthetic());
    const count = (hop: readonly [number, number] | null) => {
      const s = createTex(tex.length, [1, 2, 3, 4], hop);
      let changes = 0;
      let seg = s.seg;
      for (let n = 0; n < 500 * 30; n++) {
        texSample(tex, s, 5);
        if (s.seg !== seg) {
          changes++;
          seg = s.seg;
        }
      }
      return changes;
    };
    const hopped = count([1, 2.5]);
    expect(hopped).toBeGreaterThanOrEqual(30 / 3); // ≥ one hop per 3 s
    expect(hopped).toBeLessThanOrEqual(30 / 1.5 + 1);
    expect(count(null)).toBeLessThanOrEqual(5); // 8 s windows played to their end
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s5/texture.test.ts`
Expected: FAIL in "hopping (Stage 5.1)": `expected 3 to be greater than or equal to 10` (the third argument is ignored, so segments change only at 8 s ends).

- [x] **Step 3: Implement**

In `packages/engine-core/src/l2/ecg/texture.ts`, replace this block (it occurs exactly once):

```ts
  fade: number;
  rng: Sfc32State;
}

export function createTex(n: number, rng: Sfc32State): TexState {
  return { seg: sfc32Next(rng) % n, pos: sfc32Next(rng) % 1000, next: -1, npos: 0, fade: 0, rng };
}

```

with:

```ts
  fade: number;
  rng: Sfc32State;
  /** Stage 5.1: output samples left before hopping to another segment (−1 = play each segment to its end). */
  left: number;
  /** Stage 5.1: hop interval range in output samples [min, max]; null = no hopping (Stage 5 behaviour). */
  hop: [number, number] | null;
}

/** hopS: hop to a random segment every hopS[0]–hopS[1] s of output (Stage 5.1, VF: breaks up long regular runs). */
export function createTex(n: number, rng: Sfc32State, hopS: readonly [number, number] | null = null): TexState {
  const hop: [number, number] | null = hopS ? [Math.round(hopS[0] * 500), Math.round(hopS[1] * 500)] : null;
  const s: TexState = { seg: sfc32Next(rng) % n, pos: sfc32Next(rng) % 1000, next: -1, npos: 0, fade: 0, rng, left: -1, hop };
  if (hop) s.left = drawHop(s);
  return s;
}

function drawHop(s: TexState): number {
  const h = s.hop as [number, number];
  return h[0] + (sfc32Next(s.rng) % (h[1] - h[0] + 1));
}

```

In `packages/engine-core/src/l2/ecg/texture.ts`, replace this block (it occurs exactly once):

```ts
  let v = at(cur.x, s.pos);
  s.pos += speed;
  if (s.next < 0 && s.pos > cur.x.length - XFADE_SAMPLES * speed - 2) {
    let n = sfc32Next(s.rng) % tex.length;
    if (n === s.seg && tex.length > 1) n = (n + 1) % tex.length;
    s.next = n;
    s.npos = sfc32Next(s.rng) % 500;
    s.fade = 0;
  }
```

with:

```ts
  let v = at(cur.x, s.pos);
  s.pos += speed;
  if (s.left > 0) s.left--;
  if (s.next < 0 && (s.left === 0 || s.pos > cur.x.length - XFADE_SAMPLES * speed - 2)) {
    let n = sfc32Next(s.rng) % tex.length;
    if (n === s.seg && tex.length > 1) n = (n + 1) % tex.length;
    s.next = n;
    s.npos = sfc32Next(s.rng) % (s.hop ? 2500 : 500); // Stage 5.1: hops enter anywhere in the first 5 s
    s.fade = 0;
  }
```

In `packages/engine-core/src/l2/ecg/texture.ts`, replace this block (it occurs exactly once):

```ts
      s.pos = s.npos;
      s.next = -1;
    }
  }
```

with:

```ts
      s.pos = s.npos;
      s.next = -1;
      if (s.hop) s.left = drawHop(s);
    }
  }
```

- [x] **Step 4: Run it to see it pass, with the rest of the ECG tests**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg`
Expected: PASS (every file).

- [x] **Step 5: Commit and push**

```bash
git add packages/engine-core/src/l2/ecg/texture.ts packages/engine-core/test/l2/ecg/s5/texture.test.ts
git commit -m "feat(ecg): texture player hops between recorded windows (stage 5.1)"
git push
```

---

### Task 4: Coarse VF: two wandering channels, per-cycle frequency and amplitude jitter

G5-obs: vfCoarse is "a regular oscillation, not chaos" and V1 is nearly flat. Measured on Stage 5 (20 seeds × 4 windows): autocorrelation at the dominant period up to 0.80, −3 dB bandwidth median 1.78 Hz (min 1.50, i.e. the estimator floor), V1/II 0.24–0.36.

Changes (all in `arrest/vf.ts`):
1. **Two independent texture channels** (each its own hopping `TexState`, Task 3) along two VCG directions, `VF_DIR_A` (the Stage 5 inferior direction) and `VF_DIR_B` (anterior-leftward), channel B at 0.9 × A's RMS. The VF vector now wanders in 3-D, so no lead is the null lead of one fixed direction. The Stage 5 slow ±15 % rotation is removed (the two channels replace it). A normalisation keeps lead II's RMS at A/(2√2), so the Stage 5 amplitude definition, the τ fits and the coarse→fine switch are unchanged.
2. **Per-cycle frequency jitter:** the playback speed is multiplied by exp(0.18·z − 0.18²/2), z an Ornstein–Uhlenbeck process (unit SD, τ 0.25 s ≈ 1.4 cycles). Mean speed is preserved, so f_dom(t) still tracks brief §4.1.
3. **Per-channel amplitude jitter:** gains exp(0.35·z − 0.35²) with their own OU processes (τ 0.4 s); E[g²] = 1, so the RMS is preserved.
4. OU draws use `tableNormal` (one sfc32 draw each) on the VF episode's private `rng`; determinism is unchanged (same seed → same samples).

Planning prototype (20 seeds × 4 windows, 10 s each): autocorrelation max **0.53** (median 0.28), bandwidth min **1.75 Hz**, median **2.71 Hz**; V1/II **0.41–0.92**, V5/II **0.50–0.96** (40 seeds). Lead I (0.15–0.41) and V6 (0.22–0.32) stay smaller than II; V2–V4 are 0.8–2.4 × II (large precordial VF is common). Stage 5's existing VF tests (f_dom tracking at 0/4/10 min, τ 7 min ± 20 %, τ with CPR, fine at 582 s, asystole) still pass. The epinephrine Δf is now a noisy single-window estimate (seed 3 alone reads −0.49 Hz), so that test becomes a 6-seed mean (+0.33 Hz, ratio 1.30).

**Files:**
- Modify: `packages/engine-core/src/l2/ecg/arrest/vf.ts`
- Modify: `packages/engine-core/test/l2/ecg/s5/vf.test.ts` (epinephrine case)
- Test: `packages/engine-core/test/l2/ecg/s51/vf-realism.test.ts`

**Interfaces:**
- Consumes: `createTex(n, rng, hopS)` (Task 3), `tableNormal` (`generator.ts`), `spectralPeak`, `acfAtPeriod`, `rmsRatio` (Task 2).
- Produces: exported constants `VF_DIR_A`, `VF_DIR_B`, `VF_B_WEIGHT`, `VF_FREQ_JITTER`, `VF_FREQ_TAU_S`, `VF_AMP_JITTER`, `VF_AMP_TAU_S`, `VF_HOP_S`; `VfState` gains `tex2`, `ou`, `ar2`.

- [x] **Step 1: Write the failing test**

Create (or replace) `packages/engine-core/test/l2/ecg/s51/vf-realism.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { samples5 } from '../../../helpers/s5.ts';
import { acfAtPeriod, rmsRatio, spectralPeak } from '../../../helpers/s51.ts';

// G5-obs: coarse VF looked periodic and was nearly flat in V1. Measured over 20 seeds × four 10 s windows
// (0, 4, 30, 60 s — the strip window is 4–14 s).
describe('Stage 5.1 VF realism', () => {
  it('vfCoarse: no visible periodicity (ACF at the dominant period < 0.6), −3 dB bandwidth ≥ 1.5 Hz in every window and median ≥ 2.2 Hz, V1 and V5 40–100 % of II', { timeout: 300_000 }, async () => {
    let worstAcf = 0;
    const bws: number[] = [];
    const r1: number[] = [];
    const r5: number[] = [];
    for (let seed = 1; seed <= 20; seed++) {
      const r = samples5('vfCoarse', 70, ['ecgII', 'V1', 'V5'], { seed, rhythmOpts: { autoAsystole: false } });
      for (const t0 of [0, 4, 30, 60]) {
        const w = (x: Float64Array) => x.subarray(t0 * 500, (t0 + 10) * 500);
        const II = w(r.lead.ecgII!);
        const { fd, bw } = spectralPeak(II, 500);
        worstAcf = Math.max(worstAcf, acfAtPeriod(II, 500, fd));
        bws.push(bw);
        r1.push(rmsRatio(w(r.lead.V1!), II));
        r5.push(rmsRatio(w(r.lead.V5!), II));
      }
      await new Promise<void>((resolve) => setImmediate(resolve)); // CI yielding rule
    }
    expect(worstAcf).toBeLessThan(0.6);
    // the estimator's floor is 1.47 Hz (helpers.test.ts), so the median carries the discrimination: Stage 5 measured 1.78
    bws.sort((a, b) => a - b);
    expect(bws[0]!).toBeGreaterThanOrEqual(1.5);
    expect(bws[bws.length >> 1]!).toBeGreaterThanOrEqual(2.2);
    for (const x of [...r1, ...r5]) {
      expect(x).toBeGreaterThanOrEqual(0.4);
      expect(x).toBeLessThanOrEqual(1);
    }
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s51/vf-realism.test.ts`
Expected: FAIL: `expected 0.79… to be less than 0.6` (Stage 5 periodicity).

- [x] **Step 3: Implement**

In `packages/engine-core/src/l2/ecg/arrest/vf.ts`, replace this block (it occurs exactly once):

```ts
import { RHYTHMS } from '../rhythms.ts';
import type { EcgGenInputs } from '../ecg-gen.ts';

export const F0_HZ = 5.5; // brief §4.1
```

with:

```ts
import { RHYTHMS } from '../rhythms.ts';
import type { EcgGenInputs } from '../ecg-gen.ts';
import { tableNormal } from '../generator.ts';

export const F0_HZ = 5.5; // brief §4.1
```

In `packages/engine-core/src/l2/ecg/arrest/vf.ts`, replace this block (it occurs exactly once):

```ts
export const HAZARD_PER_S = 0.02 / 60;
const FINE_START_MV = 0.15; // vfFine starts here [ENG]
/** VF VCG direction (lead II gain ≈ 1) plus a slow rotation of ±15% [ENG]. */
const VF_DIR = [0.25, 0.85, -0.3] as const;
const VF_ROT = [0.35, -0.1, 0.5] as const;
const ROT_PERIOD_S = 20; // slow rotation, one period per 20 s analysis window [ENG]
const TWO_SQRT2 = 2 * Math.SQRT2;

const TEX = VF_TEMPLATES.length > 0 ? decodeTemplates({ scale: VF_SCALE, items: VF_TEMPLATES }) : [];
```

with:

```ts
export const HAZARD_PER_S = 0.02 / 60;
const FINE_START_MV = 0.15; // vfFine starts here [ENG]
/**
 * Stage 5.1: two independent texture channels along two VCG directions, so the VF vector wanders in 3-D and no
 * lead is ever the null lead of a single fixed direction (G5-obs: V1 was 24–36 % of II). DIR_A is inferior (II),
 * DIR_B anterior-leftward (V1–V5). Lead gains per unit (A, B): II 1.00/0.12, V1 0.28/0.58, V5 0.44/0.57 [ENG].
 */
export const VF_DIR_A = [0.25, 0.85, -0.3] as const;
export const VF_DIR_B = [0.45, -0.1, -0.9] as const;
export const VF_B_WEIGHT = 0.9; // channel B RMS relative to channel A [ENG; planning prototype, 40 seeds: V1/II 0.41–0.92, V5/II 0.50–0.96]
/** Per-cycle jitter (Ornstein–Uhlenbeck, 500 Hz): log-speed SD and correlation time; log-gain SD and time [ENG]. */
export const VF_FREQ_JITTER = 0.18;
export const VF_FREQ_TAU_S = 0.25;
export const VF_AMP_JITTER = 0.35;
export const VF_AMP_TAU_S = 0.4;
/** Hop to another recorded window every 1–2.5 s (was: play each 8 s window to its end) [ENG]. */
export const VF_HOP_S: readonly [number, number] = [1, 2.5];
const TWO_SQRT2 = 2 * Math.SQRT2;
const DT = 1 / 500;
const dotII = (d: readonly [number, number, number]) => 0.235 * d[0] + 1.066 * d[1] - 0.132 * d[2]; // Dower lead II row
/** Scales the two channels so lead II carries exactly A/(2√2) RMS (unit-RMS channels, independent). */
const II_NORM = 1 / Math.hypot(dotII(VF_DIR_A), VF_B_WEIGHT * dotII(VF_DIR_B));

const TEX = VF_TEMPLATES.length > 0 ? decodeTemplates({ scale: VF_SCALE, items: VF_TEMPLATES }) : [];
```

In `packages/engine-core/src/l2/ecg/arrest/vf.ts`, replace this block (it occurs exactly once):

```ts
  rng: Sfc32State;
  tex: TexState | null;
  ar: ArState;
  fine: boolean;
  fineAt: number | null;
```

with:

```ts
  rng: Sfc32State;
  tex: TexState | null;
  /** Stage 5.1: second texture channel (along VF_DIR_B) and the OU jitter states [log-speed, gainA, gainB]. */
  tex2: TexState | null;
  ou: [number, number, number];
  ar: ArState;
  ar2: ArState;
  fine: boolean;
  fineAt: number | null;
```

In `packages/engine-core/src/l2/ecg/arrest/vf.ts`, replace this block (it occurs exactly once):

```ts
  st.vf = {
    start: t0, end: NEVER, a0, tNoCpr: t, tEff: t, boost: 0, rng,
    tex: TEX.length > 0 ? createTex(TEX.length, [rng[0], rng[1] ^ 0x9e37, rng[2], rng[3]]) : null,
    ar: { y1: [0, 0, 0, 0], y2: [0, 0, 0, 0] },
    fine: st.id === 'vfFine', fineAt: null, asystoleAt: null, announcedFine: st.id === 'vfFine',
  };
```

with:

```ts
  st.vf = {
    start: t0, end: NEVER, a0, tNoCpr: t, tEff: t, boost: 0, rng,
    tex: TEX.length > 0 ? createTex(TEX.length, [rng[0], rng[1] ^ 0x9e37, rng[2], rng[3]], VF_HOP_S) : null,
    tex2: TEX.length > 0 ? createTex(TEX.length, [rng[0] ^ 0x5bd1, rng[1], rng[2] ^ 0x3c6e, rng[3]], VF_HOP_S) : null,
    ou: [0, 0, 0],
    ar: { y1: [0, 0, 0, 0], y2: [0, 0, 0, 0] },
    ar2: { y1: [0, 0, 0, 0], y2: [0, 0, 0, 0] },
    fine: st.id === 'vfFine', fineAt: null, asystoleAt: null, announcedFine: st.id === 'vfFine',
  };
```

In `packages/engine-core/src/l2/ecg/arrest/vf.ts`, replace this block (it occurs exactly once):

```ts
  }
  v.boost += ((cpr ? CPR_BOOST_HZ : 0) - v.boost) * (dt / CPR_BOOST_TAU_S);
  const f = vfFreqHz(v, g.mods, s);
  const a = vfAmplitudeMv(v, g.mods, s);
  const u = v.tex ? texSample(TEX, v.tex, f) : arSample(v.ar, f, [normal(v.rng), normal(v.rng), normal(v.rng), normal(v.rng)]);
  const k = (a / TWO_SQRT2) * u;
  const r = 0.15 * Math.sin((2 * Math.PI * s) / ROT_PERIOD_S + (v.rng[3] % 7));
  acc[0] = (acc[0] as number) + k * (VF_DIR[0] + r * VF_ROT[0]);
  acc[1] = (acc[1] as number) + k * (VF_DIR[1] + r * VF_ROT[1]);
  acc[2] = (acc[2] as number) + k * (VF_DIR[2] + r * VF_ROT[2]);
  if (n % 500 === 0) {
    if (!v.fine && a < FINE_MV) {
```

with:

```ts
  }
  v.boost += ((cpr ? CPR_BOOST_HZ : 0) - v.boost) * (dt / CPR_BOOST_TAU_S);
  // Stage 5.1 jitter: three OU processes (unit stationary SD) → per-cycle speed and per-channel gain.
  const ou = v.ou;
  ou[0] += -ou[0] * (DT / VF_FREQ_TAU_S) + Math.sqrt((2 * DT) / VF_FREQ_TAU_S) * tableNormal(v.rng);
  ou[1] += -ou[1] * (DT / VF_AMP_TAU_S) + Math.sqrt((2 * DT) / VF_AMP_TAU_S) * tableNormal(v.rng);
  ou[2] += -ou[2] * (DT / VF_AMP_TAU_S) + Math.sqrt((2 * DT) / VF_AMP_TAU_S) * tableNormal(v.rng);
  const f = vfFreqHz(v, g.mods, s) * Math.exp(VF_FREQ_JITTER * ou[0] - (VF_FREQ_JITTER * VF_FREQ_JITTER) / 2);
  const a = vfAmplitudeMv(v, g.mods, s);
  // log-normal gains with E[g²] = 1, so lead II keeps A/(2√2) RMS on average
  const gA = Math.exp(VF_AMP_JITTER * ou[1] - VF_AMP_JITTER * VF_AMP_JITTER);
  const gB = Math.exp(VF_AMP_JITTER * ou[2] - VF_AMP_JITTER * VF_AMP_JITTER);
  const uA = v.tex ? texSample(TEX, v.tex, f) : arSample(v.ar, f, [normal(v.rng), normal(v.rng), normal(v.rng), normal(v.rng)]);
  const uB = v.tex2 ? texSample(TEX, v.tex2, f) : arSample(v.ar2, f, [normal(v.rng), normal(v.rng), normal(v.rng), normal(v.rng)]);
  const k = (a / TWO_SQRT2) * II_NORM;
  const kA = k * gA * uA;
  const kB = k * VF_B_WEIGHT * gB * uB;
  acc[0] = (acc[0] as number) + kA * VF_DIR_A[0] + kB * VF_DIR_B[0];
  acc[1] = (acc[1] as number) + kA * VF_DIR_A[1] + kB * VF_DIR_B[1];
  acc[2] = (acc[2] as number) + kA * VF_DIR_A[2] + kB * VF_DIR_B[2];
  if (n % 500 === 0) {
    if (!v.fine && a < FINE_MV) {
```

- [x] **Step 4: Make the epinephrine test a 6-seed mean**

In `packages/engine-core/test/l2/ecg/s5/vf.test.ts`, replace this block (it occurs exactly once):

```ts
  });

  it('epinephrine: +20–40% amplitude and ≈ +0.5 Hz at the peak of the bump (90 s after the dose)', () => {
    const base = samples5('vfCoarse', 240, ['ecgII'], { mods: quiet, rhythmOpts: { autoAsystole: false }, seed: 3 });
    const epi = samples5('vfCoarse', 240, ['ecgII'], { mods: { ...quiet, epinephrineAtS: 120 }, rhythmOpts: { autoAsystole: false }, seed: 3 });
    const t0 = 200; // window 200–220 s straddles the peak at 210 s
    const ratio = ampMv(epi.lead.ecgII!, t0) / ampMv(base.lead.ecgII!, t0);
    expect(ratio).toBeGreaterThan(1.15);
    expect(ratio).toBeLessThan(1.45);
    const df = dominantHz(win(epi.lead.ecgII!, t0), 500) - dominantHz(win(base.lead.ecgII!, t0), 500);
    expect(df).toBeGreaterThan(0.2);
    expect(df).toBeLessThan(0.8);
  });

```

with:

```ts
  });

  it('epinephrine: +20–40% amplitude and ≈ +0.5 Hz at the peak of the bump (90 s after the dose), mean of 6 seeds', { timeout: 300_000 }, async () => {
    // Stage 5.1: per-cycle frequency jitter makes one 20 s window's spectral peak a noisy estimator (±0.5 Hz), so
    // the effect is measured as the mean over six seeds.
    const ratios: number[] = [];
    const dfs: number[] = [];
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const base = samples5('vfCoarse', 240, ['ecgII'], { mods: quiet, rhythmOpts: { autoAsystole: false }, seed });
      const epi = samples5('vfCoarse', 240, ['ecgII'], { mods: { ...quiet, epinephrineAtS: 120 }, rhythmOpts: { autoAsystole: false }, seed });
      const t0 = 200; // window 200–220 s straddles the peak at 210 s
      ratios.push(ampMv(epi.lead.ecgII!, t0) / ampMv(base.lead.ecgII!, t0));
      dfs.push(dominantHz(win(epi.lead.ecgII!, t0), 500) - dominantHz(win(base.lead.ecgII!, t0), 500));
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    const m = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
    expect(m(ratios)).toBeGreaterThan(1.15);
    expect(m(ratios)).toBeLessThan(1.45);
    expect(m(dfs)).toBeGreaterThan(0.2);
    expect(m(dfs)).toBeLessThan(0.8);
  });

```

- [x] **Step 5: Run the VF tests**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s51/vf-realism.test.ts test/l2/ecg/s5/vf.test.ts test/l2/ecg/s5/library.test.ts test/l2/ecg/s5/artefacts.test.ts`
Expected: PASS (all). `library.test.ts` still finds 0 QRS in 40 vfCoarse/vfFine runs.

- [x] **Step 6: Commit and push**

```bash
git add packages/engine-core/src/l2/ecg/arrest/vf.ts packages/engine-core/test/l2/ecg/s51/vf-realism.test.ts packages/engine-core/test/l2/ecg/s5/vf.test.ts
git commit -m "feat(ecg): coarse VF with two wandering channels and per-cycle jitter (G5-obs)"
git push
```

---

### Task 5: Polymorphic VT: a bounded axis walk so V1 never goes flat

Stage 5's executor: "V1 is nearly flat for ~2 s while the axis sweeps perpendicular to V1". Cause: the frontal-plane axis was an unbounded random walk (step 0.6 rad per beat), so it could park for seconds where the QRS vector's V1 projection cancels. Measured on Stage 5 (40 seeds × 3 windows): V1/II **0.25–1.59**.

Fix: a mean-reverting walk, axis ← 0.7·axis + 0.15·N(0,1) (stationary SD 0.21 rad, 12°), and a wider beat-to-beat amplitude spread (0.4–1.4, was 0.6–1.2) so the existing "beat-to-beat changing amplitude/axis" test (SD/mean > 0.3) still holds. Prototype: V1/II **0.54–0.92**.

**Files:**
- Modify: `packages/engine-core/src/l2/ecg/foci-ventricular.ts`
- Test: `packages/engine-core/test/l2/ecg/s51/vtpoly.test.ts`

**Interfaces:**
- Consumes: `rmsRatio` (Task 2).
- Produces: nothing new (constants `POLY_AXIS_STEP_RAD`, `POLY_AXIS_KEEP` are module-private).

- [x] **Step 1: Write the failing test**

Create (or replace) `packages/engine-core/test/l2/ecg/s51/vtpoly.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { samples5 } from '../../../helpers/s5.ts';
import { rmsRatio } from '../../../helpers/s51.ts';

// G5-obs / Stage 5 executor: V1 was nearly flat for ~2 s in polymorphic VT (the axis walk parked perpendicular to V1).
describe('Stage 5.1 polymorphic VT visibility', () => {
  it('vtPoly: V1 40–100 % of II over 40 seeds × three 10 s windows', { timeout: 300_000 }, async () => {
    for (let seed = 1; seed <= 40; seed++) {
      const r = samples5('vtPoly', 64, ['ecgII', 'V1'], { seed, mods: { artefact: { noise: 0 } } });
      for (const t0 of [4, 30, 54]) {
        const w = (x: Float64Array) => x.subarray(t0 * 500, (t0 + 10) * 500);
        const x = rmsRatio(w(r.lead.V1!), w(r.lead.ecgII!));
        expect(x).toBeGreaterThanOrEqual(0.4);
        expect(x).toBeLessThanOrEqual(1);
      }
      if (seed % 10 === 0) await new Promise<void>((resolve) => setImmediate(resolve));
    }
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s51/vtpoly.test.ts`
Expected: FAIL: a V1/II ratio below 0.4 or above 1.

- [x] **Step 3: Implement**

In `packages/engine-core/src/l2/ecg/foci-ventricular.ts`, replace this block (it occurs exactly once):

```ts
const IVR_JITTER_S = 0.01; // [ENG]
const POLY_RR_CV = 0.08; // polymorphic VT: irregular [ENG]
const POLY_AXIS_STEP_RAD = 0.6; // beat-to-beat axis random walk [ENG]
const TORSADES_RR_CV = 0.05; // [ENG]
const TORSADES_AXIS_RAD = 0.35; // axis wobble ±20° over a twist [ENG]
```

with:

```ts
const IVR_JITTER_S = 0.01; // [ENG]
const POLY_RR_CV = 0.08; // polymorphic VT: irregular [ENG]
const POLY_AXIS_STEP_RAD = 0.15; // beat-to-beat axis step, radians [ENG, Stage 5.1: was an unbounded 0.6 walk]
const POLY_AXIS_KEEP = 0.7; // mean reversion per beat: stationary SD 0.25/√(1−0.64) = 0.42 rad (24°) [ENG, Stage 5.1]
const TORSADES_RR_CV = 0.05; // [ENG]
const TORSADES_AXIS_RAD = 0.35; // axis wobble ±20° over a twist [ENG]
```

In `packages/engine-core/src/l2/ecg/foci-ventricular.ts`, replace this block (it occurs exactly once):

```ts

export function onVtPoly(st: RhythmState, t: number, ctx: RhythmCtx): void {
  st.focusAxis += POLY_AXIS_STEP_RAD * normal(ctx.rng.ectopy);
  const scale = 0.6 + 0.6 * uniform(ctx.rng.ectopy);
  pushPending(st, { t, origin: 'ventricular', template: 'wide', prMs: null, pvc: false, coupling: 0, bypass: true, scale, twistRad: st.focusAxis });
  const rr = (60 / rhythmRate(st, t, ctx)) * Math.max(0.7, 1 + POLY_RR_CV * normal(ctx.rng.ectopy));
```

with:

```ts

export function onVtPoly(st: RhythmState, t: number, ctx: RhythmCtx): void {
  // Stage 5.1: a mean-reverting walk, so the axis never parks for seconds perpendicular to V1 (G5-obs: V1 flat ~2 s)
  st.focusAxis = POLY_AXIS_KEEP * st.focusAxis + POLY_AXIS_STEP_RAD * normal(ctx.rng.ectopy);
  const scale = 0.4 + uniform(ctx.rng.ectopy); // Stage 5.1: 0.4–1.4 (was 0.6–1.2) keeps the beat-to-beat amplitude spread with the bounded axis walk
  pushPending(st, { t, origin: 'ventricular', template: 'wide', prMs: null, pvc: false, coupling: 0, bypass: true, scale, twistRad: st.focusAxis });
  const rr = (60 / rhythmRate(st, t, ctx)) * Math.max(0.7, 1 + POLY_RR_CV * normal(ctx.rng.ectopy));
```

- [x] **Step 4: Run it and the ventricular tests**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s51/vtpoly.test.ts test/l2/ecg/s5/ventricular.test.ts test/l2/ecg/s5/library.test.ts`
Expected: PASS.

- [x] **Step 5: Commit and push**

```bash
git add packages/engine-core/src/l2/ecg/foci-ventricular.ts packages/engine-core/test/l2/ecg/s51/vtpoly.test.ts
git commit -m "fix(ecg): polymorphic VT axis walk is mean-reverting; V1 stays visible"
git push
```

---

### Task 6: Bundle-branch block: RBBB rSR′ with a tall broad R′, LBBB broad QS and notched R

G5-obs: "rbbb: V1 needs a clear rSR′ (M pattern) and terminal broad R′; V6 a broad slurred S; QRS ≥ 120 ms on the strip". LBBB (Stage 5 strip): V1 showed a double trough (a W), not a broad QS. Measured on Stage 5 with Task 2's tangent method: RBBB 121 ms with R′ 0.50 mV; LBBB 135 ms, two V1 troughs.

- **RBBB:** the left-ventricular S kernel is halved (the deep S in V1 shrinks), and the terminal R′ moves to τ 100 ms with σ 20/22 ms along `RBBB_RPRIME_VEC` = [−0.33, 0, −0.69], solved on the Dower rows for V1 +0.80, I −0.25, V6 −0.43, II ≈ 0 per unit. The R′ follows the beat's R amplitude (respiration, low voltage). Prototype: QRS **148 ms**, V1 r 0.16 → S −0.76 → R′ **+0.80 mV**, V6 S −0.43 mV. Aberrant PACs (`aberrant` template) use the new R′ vector too.
- **LBBB:** two leftward R kernels 60 ms apart, `LBBB_R1_VEC` (V1 −0.15, V6 +0.70) at 50 ms and `LBBB_R2_VEC` (V1 −1.00, V6 +0.90, posterior) at 110 ms. V6/I show a notched monophasic R; in V1 the first kernel is only a shoulder, so one broad trough. T is discordant to their sum. Prototype: QRS **152 ms**, V1 min −1.00 (r 0.08), V6 two peaks, no q, no S.

**Files:**
- Modify: `packages/engine-core/src/l2/ecg/beat-templates.ts` (`RBBB_RPRIME_VEC`)
- Modify: `packages/engine-core/src/l2/ecg/morphology/conduction.ts` (`bbbStage`; exports `QRS_T` for Task 12)
- Modify: `packages/engine-core/test/l2/ecg/s5/morph-conduction.test.ts` (kernel-span bounds move; morphology is measured in the new test)
- Test: `packages/engine-core/test/l2/ecg/s51/bbb.test.ts`

**Interfaces:**
- Consumes: `beatQrs`, `peaks` (Task 2).
- Produces: `LBBB_R1_VEC`, `LBBB_R2_VEC`, `RBBB_S_SCALE`, `RBBB_RPRIME_TAU_S`, `RBBB_RPRIME_SIGMA_S`, `QRS_T` exported from `morphology/conduction.ts`.

- [x] **Step 1: Write the failing test**

Create (or replace) `packages/engine-core/test/l2/ecg/s51/bbb.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { fiducialOf } from '../../../../src/l2/ecg/beat-templates.ts';
import { kernelLead, morphBeat, tPeakOf } from '../../../helpers/s5.ts';
import { beatQrs, peaks } from '../../../helpers/s51.ts';

describe('Stage 5.1 bundle-branch block morphology (measured on the waveform)', () => {
  it('RBBB: V1 rSR′ (two positive deflections, tall terminal R′ ≥ 0.6 mV and ≥ 2 r, R′ peak ≥ 80 ms after onset), V6 broad S ≥ 40 ms, QRS ≥ 130 ms', () => {
    const k = morphBeat({ bbb: 'rbbb' });
    const q = beatQrs(k, fiducialOf(k));
    expect(q.ms).toBeGreaterThanOrEqual(130);
    const pos = peaks(k, 'V1', q.on, q.off, 0.05);
    expect(pos.length).toBeGreaterThanOrEqual(2);
    expect(pos.at(-1)!.v).toBeGreaterThanOrEqual(0.6);
    expect(pos.at(-1)!.v).toBeGreaterThanOrEqual(2 * pos[0]!.v);
    expect((pos.at(-1)!.t - q.on) * 1000).toBeGreaterThanOrEqual(80);
    let sMs = 0;
    for (let t = fiducialOf(k); t < q.off + 0.02; t += 0.0005) if (kernelLead(k, 'V6', t) < -0.05) sMs += 0.5;
    expect(sMs).toBeGreaterThanOrEqual(40);
  });

  it('LBBB: V1 broad QS/rS (r < 0.1 mV, one trough ≤ −0.5 mV), V6 notched monophasic R (no q, no S, two peaks), discordant T, QRS ≥ 120 ms', () => {
    const k = morphBeat({ bbb: 'lbbb' });
    const q = beatQrs(k, fiducialOf(k));
    expect(q.ms).toBeGreaterThanOrEqual(120);
    const troughs = peaks(k, 'V1', q.on, q.off, 0.3, -1);
    expect(troughs.length).toBe(1);
    expect(troughs[0]!.v).toBeLessThanOrEqual(-0.5);
    const v1Max = Math.max(...Array.from({ length: 400 }, (_, i) => kernelLead(k, 'V1', q.on + ((q.off - q.on) * i) / 400)));
    expect(v1Max).toBeLessThan(0.1);
    const v6 = Array.from({ length: 400 }, (_, i) => kernelLead(k, 'V6', q.on + ((q.off - q.on) * i) / 400));
    expect(Math.min(...v6)).toBeGreaterThan(-0.1);
    const top = Math.max(...v6);
    expect(peaks(k, 'V6', q.on, q.off, 0.5 * top).length).toBe(2);
    const tp = tPeakOf(k);
    expect(kernelLead(k, 'V1', tp)).toBeGreaterThan(0);
    expect(kernelLead(k, 'V6', tp)).toBeLessThan(0);
  });

  it('normal conduction measures 80–100 ms with the same method', () => {
    const k = morphBeat({});
    const ms = beatQrs(k, fiducialOf(k)).ms;
    expect(ms).toBeGreaterThanOrEqual(80);
    expect(ms).toBeLessThanOrEqual(100);
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s51/bbb.test.ts`
Expected: FAIL in RBBB (`expected 121… to be greater than or equal to 130`) and LBBB (`expected 2 to be 1`: two V1 troughs). The normal-conduction case passes.

- [x] **Step 3: Implement**

In `packages/engine-core/src/l2/ecg/beat-templates.ts`, replace this block (it occurs exactly once):

```ts
export type BeatTemplateId = TemplateId | 'wpw' | 'aberrant' | 'pacedV' | 'pvc2' | 'pvc3' | 'agonal';

/** RBBB terminal R′ (V1 +0.51 mV, I −0.25 mV) at τ 85 ms, σ 16 ms → QRS ≈ 133 ms (brief §5 RBBB 133). */
export const RBBB_RPRIME_VEC: Vec3 = [-0.35, 0.05, -0.35];
/** PR (P onset → delta onset) for pre-excited conduction (research 03 §1.5: PR < 120 ms). */
export const WPW_PR_MS = 100;
```

with:

```ts
export type BeatTemplateId = TemplateId | 'wpw' | 'aberrant' | 'pacedV' | 'pvc2' | 'pvc3' | 'agonal';

/** RBBB terminal R′ (Stage 5.1: V1 +0.80, I −0.25, V6 −0.43, II ≈ 0 per unit; solved on the Dower rows) [ENG]. */
export const RBBB_RPRIME_VEC: Vec3 = [-0.33, 0, -0.69];
/** PR (P onset → delta onset) for pre-excited conduction (research 03 §1.5: PR < 120 ms). */
export const WPW_PR_MS = 100;
```

In `packages/engine-core/src/l2/ecg/morphology/conduction.ts`, replace this block (it occurs exactly once):

```ts
import { K_STRIDE } from '../kernels.ts';

/** LBBB: no septal q, broad notched R leftward-posterior (I/V6 +, V1 QS), QRS ≈ 154 ms (brief §5 LBBB 154). */
const LBBB_R_VEC: Vec3 = [1.2, 0.3, 0.8];
const QRS_T: ReadonlySet<number> = new Set([WAVE.Q, WAVE.R, WAVE.S, WAVE.DELTA, WAVE.T]);

export const bbbStage: MorphStage = (k, info, mods) => {
  if (mods.bbb === 'none' || !info.supra) return k;
  if (mods.bbb === 'rbbb') {
    k.push(0.085, 0.016, 0.016, ...RBBB_RPRIME_VEC, WAVE.S); // terminal R′ in V1, broad S in I/V6
    return k;
  }
```

with:

```ts
import { K_STRIDE } from '../kernels.ts';

/**
 * LBBB (Stage 5.1): no septal q; two leftward R kernels 60 ms apart — LBBB_R1 (V1 −0.15, V6 +0.70) then LBBB_R2
 * (V1 −1.00, V6 +0.90, posterior) — so V6/I show a broad notched monophasic R and V1 a broad QS with a slurred
 * downstroke (one trough: the first kernel is only a shoulder there). Vectors solved on the Dower rows [ENG].
 */
export const LBBB_R1_VEC: Vec3 = [0.903, 0.25, -0.301];
export const LBBB_R2_VEC: Vec3 = [0.893, 0.2, 0.623];
/** RBBB (Stage 5.1): the LV's S forces halve and a late broad R′ (τ 100 ms) points right-anterior. */
export const RBBB_S_SCALE = 0.5;
export const RBBB_RPRIME_TAU_S = 0.1;
export const RBBB_RPRIME_SIGMA_S: readonly [number, number] = [0.02, 0.022];
export const QRS_T: ReadonlySet<number> = new Set([WAVE.Q, WAVE.R, WAVE.S, WAVE.DELTA, WAVE.T]);

export const bbbStage: MorphStage = (k, info, mods) => {
  if (mods.bbb === 'none' || !info.supra) return k;
  if (mods.bbb === 'rbbb') {
    let rScale = 1;
    for (let i = 0; i < k.length; i += K_STRIDE) {
      if (k[i + 6] === WAVE.S) for (let j = 3; j < 6; j++) k[i + j] = (k[i + j] as number) * RBBB_S_SCALE;
      if (k[i + 6] === WAVE.R) rScale = Math.hypot(k[i + 3] as number, k[i + 4] as number, k[i + 5] as number) / 1.68;
    }
    // terminal R′ in V1 (rSR′), broad slurred S in I/V6; follows R amplitude (respiration, low voltage) [ENG]
    k.push(RBBB_RPRIME_TAU_S, RBBB_RPRIME_SIGMA_S[0], RBBB_RPRIME_SIGMA_S[1], ...RBBB_RPRIME_VEC.map((v) => v * rScale), WAVE.S);
    return k;
  }
```

In `packages/engine-core/src/l2/ecg/morphology/conduction.ts`, replace this block (it occurs exactly once):

```ts
    out.push(...k.slice(i, i + K_STRIDE));
  }
  out.push(0.045, 0.018, 0.018, ...LBBB_R_VEC.map((v) => v * 0.6 * rScale), WAVE.R);
  out.push(0.104, 0.02, 0.02, ...LBBB_R_VEC.map((v) => v * 0.8 * rScale), WAVE.R);
  const t = mainT(out);
  if (t >= 0) {
    const n = Math.hypot(...LBBB_R_VEC);
    const amp = Math.hypot(out[t + 3] as number, out[t + 4] as number, out[t + 5] as number);
    for (let j = 0; j < 3; j++) out[t + 3 + j] = (-(LBBB_R_VEC[j] as number) / n) * amp;
  }
  return out;
```

with:

```ts
    out.push(...k.slice(i, i + K_STRIDE));
  }
  out.push(0.05, 0.022, 0.022, ...LBBB_R1_VEC.map((v) => v * rScale), WAVE.R);
  out.push(0.11, 0.024, 0.024, ...LBBB_R2_VEC.map((v) => v * rScale), WAVE.R);
  const t = mainT(out);
  if (t >= 0) {
    const sum = [0, 1, 2].map((j) => (LBBB_R1_VEC[j] as number) + (LBBB_R2_VEC[j] as number));
    const n = Math.hypot(...sum);
    const amp = Math.hypot(out[t + 3] as number, out[t + 4] as number, out[t + 5] as number);
    for (let j = 0; j < 3; j++) out[t + 3 + j] = (-(sum[j] as number) / n) * amp; // discordant T
  }
  return out;
```

- [x] **Step 4: Move the Stage 5 kernel-span bounds (RBBB 125–145 → 135–170 ms, LBBB 145–165 → 145–175 ms); the morphology checks now live in `s51/bbb.test.ts`**

In `packages/engine-core/test/l2/ecg/s5/morph-conduction.test.ts`, replace this block (it occurs exactly once):

```ts

describe('conduction, axis and voltage modifiers', () => {
  it('RBBB: QRS 125–145 ms, terminal R′ in V1, broad S in I; LBBB: QRS 145–165 ms, V1 QS, no septal q, discordant T in V6', () => {
    const r = beat({ bbb: 'rbbb' });
    expect(qrsSpanMs(r)).toBeGreaterThanOrEqual(125);
    expect(qrsSpanMs(r)).toBeLessThanOrEqual(145);
    expect(kernelLead(r, 'V1', 0.085)).toBeGreaterThan(0.2);
    expect(kernelLead(r, 'ecgI', 0.085)).toBeLessThan(-0.1);
    const l = beat({ bbb: 'lbbb' });
    expect(qrsSpanMs(l)).toBeGreaterThanOrEqual(145);
    expect(qrsSpanMs(l)).toBeLessThanOrEqual(165);
    expect(kernelLead(l, 'V1', 0.075)).toBeLessThan(-0.5);
    expect(l.filter((_, i) => i % K_STRIDE === 6).includes(WAVE.Q)).toBe(false);
    expect(kernelLead(l, 'V6', tPeakOf(l))).toBeLessThan(0);
    expect(qrsSpanMs(beat({ bbb: 'lbbb' }, 0, 'wide'))).toBe(qrsSpanMs(beatKernels('wide', 400))); // ventricular beats untouched
  });
```

with:

```ts

describe('conduction, axis and voltage modifiers', () => {
  it('RBBB kernel span 135–170 ms, R′ in V1 at 100 ms, S in I; LBBB span 145–175 ms, no septal q; wide beats untouched (morphology measured in s51/bbb.test.ts)', () => {
    const r = beat({ bbb: 'rbbb' });
    expect(qrsSpanMs(r)).toBeGreaterThanOrEqual(135);
    expect(qrsSpanMs(r)).toBeLessThanOrEqual(170);
    expect(kernelLead(r, 'V1', 0.1)).toBeGreaterThan(0.4);
    expect(kernelLead(r, 'ecgI', 0.1)).toBeLessThan(-0.1);
    const l = beat({ bbb: 'lbbb' });
    expect(qrsSpanMs(l)).toBeGreaterThanOrEqual(145);
    expect(qrsSpanMs(l)).toBeLessThanOrEqual(175);
    expect(l.filter((_, i) => i % K_STRIDE === 6).includes(WAVE.Q)).toBe(false);
    expect(qrsSpanMs(beat({ bbb: 'lbbb' }, 0, 'wide'))).toBe(qrsSpanMs(beatKernels('wide', 400))); // ventricular beats untouched
  });
```

- [x] **Step 5: Run the conduction tests**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s51/bbb.test.ts test/l2/ecg/s5/morph-conduction.test.ts test/l2/ecg/s5/beat-templates.test.ts test/l2/ecg/s5/pac-pjc.test.ts`
Expected: PASS.

- [x] **Step 6: Commit and push**

```bash
git add packages/engine-core/src/l2/ecg/beat-templates.ts packages/engine-core/src/l2/ecg/morphology/conduction.ts packages/engine-core/test/l2/ecg/s51/bbb.test.ts packages/engine-core/test/l2/ecg/s5/morph-conduction.test.ts
git commit -m "feat(ecg): RBBB rSR′ with a tall broad R′; LBBB broad QS and notched R (G5-obs)"
git push
```

---

### Task 7: STEMI magnitude: every territory lead reads the set mm at J+60

G5-obs: "elevation in II/III/aVF and reciprocal depression in aVL are too subtle for a 2 mm STEMI — verify the ST offset is applied at 10 mm/mV". Finding: the offset WAS applied at 10 mm/mV, but only in ONE measuring lead per territory (inferior sized in III: II read 0.14 mV at 2 mm, aVF 0.17). The injury vectors are re-solved by weighted least squares on the Dower rows so every INDEX lead of a territory gets the same elevation, and `mm` becomes the mean over the index leads:

| Territory | Index leads (per unit) | Reciprocal (per unit) |
|---|---|---|
| inferior | II 0.99, III 1.01, aVF 1.00 | aVL −0.52 |
| anterior | V2 0.96, V3 1.05 (V4 0.61) | III −0.37, aVF −0.30 |
| septal | V1 0.99, V2 1.01 | V6 −0.62 |
| lateral | aVL 1.06, V6 1.04 (I 0.89, V5 1.20) | III −1.23 |
| anterolateral | V3 0.96, V5 0.93 (V4 1.10) | III −0.33 |
| posterior (depression) | V1 −0.95, V2 −1.05 | — |

Measurement (the new test): on 500 Hz lead samples through the **diagnostic** filter (0.05–150 Hz, the ST-analysis bandwidth), ST = value at J + 60 ms minus the PR level (QRS onset − 20 ms), as the change against the same seed without the modifier; J and onset from Task 2's tangent QRS. Prototype at 2 mm: inferior II 0.199 / III 0.204 / aVF 0.202 with aVL −0.104; anterior V2 0.193 / V3 0.211 with III −0.075, aVF −0.060; septal 0.199/0.204, V6 −0.126; lateral aVL 0.204, V6 0.200, III −0.237; anterolateral V3 0.195, V5 0.188, III −0.067; posterior V1 −0.191, V2 −0.212. The same numbers on the raw leads agree within 0.002 mV. **The MONITOR filter (0.5–40 Hz) under-reads by ≈ 12 %** (inferior II 0.176 at 2 mm) — a real monitor-mode effect — so the STEMI strips switch to the diagnostic filter and say so in their labels. The demo presets already use 3 mm (`apps/demo/src/stage5.ts`, "STEMI <territory> 3 mm"); the new test also checks inferior 3 mm reads 0.3 ± 0.03 mV.

Also fixed: the strip label "Anterior STEMI (V1/V3)" showed V3 and III (Stage 5 gate note, "Label wording").

**Files:**
- Modify: `packages/engine-core/src/l2/ecg/morphology/st.ts` (`ST_TERRITORIES` shape `{ dir, leads, recip, sign }`, `stStage`)
- Modify: `packages/engine-core/test/l2/ecg/s5/morph-st.test.ts` (the per-territory case uses `leads`)
- Modify: `apps/demo/src/stage5-catalogue.ts` (STEMI strips: diagnostic filter, labels)
- Test: `packages/engine-core/test/l2/ecg/s51/stemi.test.ts`

**Interfaces:**
- Consumes: `beatQrs` (Task 2), `designEcgFilter`/`createFilterState`/`filterSample` (`src/l3/ecg-filter.ts`, read-only import), `samples5` (Stage 5 helper).
- Produces: `ST_TERRITORIES: Record<StTerritory, { dir: Vec3; leads: readonly LeadId[]; recip: readonly LeadId[]; sign: 1 | -1 }>` (the `lead` field is gone; nothing outside `st.ts` and its tests read it — check with `grep -rn "ST_TERRITORIES" packages apps`).

- [x] **Step 1: Write the failing test**

Create (or replace) `packages/engine-core/test/l2/ecg/s51/stemi.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { fiducialOf } from '../../../../src/l2/ecg/beat-templates.ts';
import { ST_TERRITORIES } from '../../../../src/l2/ecg/morphology/st.ts';
import { createFilterState, designEcgFilter, filterSample } from '../../../../src/l3/ecg-filter.ts';
import { LEAD_IDS, type LeadId, type StTerritory } from '../../../../src/types.ts';
import { morphBeat, samples5 } from '../../../helpers/s5.ts';
import { beatQrs } from '../../../helpers/s51.ts';

// ST(J+60) is measured the clinical way: lead value at J + 60 ms minus the PR-segment level (QRS onset − 20 ms), on
// 500 Hz lead samples through the DIAGNOSTIC filter (0.05–150 Hz, the ST-analysis bandwidth), as the change against
// the same seed without the modifier (so the normal ST/T level cancels). J and the onset come from the tangent QRS.
const k0 = morphBeat({});
const q0 = beatQrs(k0, fiducialOf(k0));
const J_AFTER_R = q0.off - fiducialOf(k0);
const ON_AFTER_R = q0.on - fiducialOf(k0);
const diag = (x: Float64Array) => {
  const sec = designEcgFilter('diagnostic', 500, 50);
  const s = createFilterState(sec);
  return x.map((v) => filterSample(sec, s, v));
};
const quiet = { artefact: { noise: 0 } };
const base = samples5('sinus', 20, LEAD_IDS, { seed: 1, mods: quiet });

function deltaSt(territory: StTerritory, mm: number): (l: LeadId) => number {
  const r = samples5('sinus', 20, LEAD_IDS, { seed: 1, mods: { ...quiet, st: { territory, mm } } });
  const beats = r.beats.filter((b) => b.t > 12 && b.t < 19);
  return (l) => {
    const a = diag(r.lead[l]!);
    const b = diag(base.lead[l]!);
    const d = beats.map((bt) => {
      const j = Math.round((bt.t + J_AFTER_R + 0.06) * 500);
      const p = Math.round((bt.t + ON_AFTER_R - 0.02) * 500);
      return a[j]! - a[p]! - (b[j]! - b[p]!);
    });
    return d.reduce((s, v) => s + v, 0) / d.length;
  };
}

describe('Stage 5.1 STEMI magnitude (measured at J+60 on the generated leads)', () => {
  it.each(Object.keys(ST_TERRITORIES) as StTerritory[])('%s 2 mm: every index lead 0.2 ± 0.02 mV, reciprocal leads ≤ −0.05 mV', (territory) => {
    const ter = ST_TERRITORIES[territory];
    const st = deltaSt(territory, 2);
    for (const l of ter.leads) expect(Math.abs(st(l) - ter.sign * 0.2)).toBeLessThanOrEqual(0.02);
    for (const l of ter.recip) expect(st(l)).toBeLessThanOrEqual(-0.05);
  });

  it('scales with mm: inferior 3 mm (the demo default) reads 0.3 ± 0.03 mV in II/III/aVF', () => {
    const st = deltaSt('inferior', 3);
    for (const l of ['ecgII', 'ecgIII', 'aVF'] as const) expect(Math.abs(st(l) - 0.3)).toBeLessThanOrEqual(0.03);
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s51/stemi.test.ts`
Expected: FAIL: `ter.leads` is undefined (TypeError) — the Stage 5 table has `lead`, not `leads`.

- [x] **Step 3: Implement**

In `packages/engine-core/src/l2/ecg/morphology/st.ts`, replace this block (it occurs exactly once):

```ts
import type { Vec3 } from '../vcg.ts';
import type { MorphStage } from './index.ts';
import { addShaped, jPointS, mainT, scaleWaves } from './ops.ts';

/**
 * Injury vectors (VCG) and the lead in which `mm` is measured. Chosen so that, at mm = 2 (see the plan's
 * prototype table): anterior V2 +0.17 / V3 +0.20 with III −0.12, aVF −0.10; inferior III +0.20, aVF +0.17,
 * II +0.14 with aVL −0.13, I −0.06; lateral I +0.14, aVL +0.15, V5 +0.20 with III −0.17; septal V1 +0.16,
 * V2 +0.20; anterolateral V3 +0.20, V4 +0.18, I +0.08 with III −0.11; posterior V2 −0.20 (depression) [ENG].
 */
export const ST_TERRITORIES: Readonly<Record<StTerritory, { dir: Vec3; lead: LeadId; sign: 1 | -1 }>> = {
  inferior: { dir: [-0.3, 1, 0.3], lead: 'ecgIII', sign: 1 },
  anterior: { dir: [0.3, -0.75, -1], lead: 'V3', sign: 1 },
  septal: { dir: [-0.35, 0.05, -1], lead: 'V2', sign: 1 },
  lateral: { dir: [1, -0.35, 0.25], lead: 'V5', sign: 1 },
  anterolateral: { dir: [0.9, -0.55, -0.7], lead: 'V3', sign: 1 },
  posterior: { dir: [0, 0.05, 1], lead: 'V2', sign: -1 },
};
/** Diffuse subendocardial ischaemia: depression in II/V5, elevation in aVR [ENG]. */
```

with:

```ts
import type { Vec3 } from '../vcg.ts';
import type { MorphStage } from './index.ts';
import { addShaped, jPointS, leadOf, mainT, scaleWaves } from './ops.ts';

/**
 * Injury vectors (VCG), solved on the Dower rows (Stage 5.1, weighted least squares) so that one unit of the vector
 * projects ≈ 1 in every INDEX lead of the territory and negative in its RECIPROCAL leads. `mm` is the mean ST shift
 * over the index leads at J + 60 ms (1 mm = 0.1 mV at 10 mm/mV). Per unit (index | reciprocal):
 * inferior II 0.99 III 1.01 aVF 1.00 | aVL −0.52; anterior V2 0.96 V3 1.05 | III −0.37 aVF −0.30;
 * septal V1 0.99 V2 1.01 | V6 −0.62; lateral aVL 1.06 V6 1.04 | III −1.23; anterolateral V3 0.96 V5 0.93 (V4 1.10) |
 * III −0.33; posterior (depression) V1 −0.95 V2 −1.05 [ENG].
 */
export const ST_TERRITORIES: Readonly<Record<StTerritory, { dir: Vec3; leads: readonly LeadId[]; recip: readonly LeadId[]; sign: 1 | -1 }>> = {
  inferior: { dir: [0.285, 0.86, -0.024], leads: ['ecgII', 'ecgIII', 'aVF'], recip: ['aVL'], sign: 1 },
  anterior: { dir: [0.176, -0.341, -0.729], leads: ['V2', 'V3'], recip: ['ecgIII', 'aVF'], sign: 1 },
  septal: { dir: [-0.567, 0.178, -0.725], leads: ['V1', 'V2'], recip: ['V6'], sign: 1 },
  lateral: { dir: [1.162, -0.52, 0.498], leads: ['aVL', 'V6'], recip: ['ecgIII'], sign: 1 },
  anterolateral: { dir: [0.813, -0.034, -0.192], leads: ['V3', 'V5'], recip: ['ecgIII'], sign: 1 },
  posterior: { dir: [0.467, 0.023, 0.776], leads: ['V1', 'V2'], recip: [], sign: -1 },
};
/** Diffuse subendocardial ischaemia: depression in II/V5, elevation in aVR [ENG]. */
```

In `packages/engine-core/src/l2/ecg/morphology/st.ts`, replace this block (it occurs exactly once):

```ts
  const j = jPointS(k);
  const sFall = Math.max(0.04, (qtS(k) - j) / 3);
  return addShaped(k, j + 0.02, 0.01, sFall, ter.dir, ter.lead, ter.sign * mods.st.mm * 0.1, j + MEASURE_AFTER_J_S, WAVE.ST);
};

```

with:

```ts
  const j = jPointS(k);
  const sFall = Math.max(0.04, (qtS(k) - j) / 3);
  const tau = j + 0.02;
  const d = MEASURE_AFTER_J_S - 0.02; // J+60 lies on the falling side of the kernel
  const g = Math.exp((-d * d) / (2 * sFall * sFall));
  // one unit of dir projects to `mean` on average over the index leads; size the kernel so that mean is mm·0.1 at J+60
  const mean = ter.leads.reduce((a, l) => a + leadOf(ter.dir, l), 0) / ter.leads.length;
  const c = (ter.sign * mods.st.mm * 0.1) / (mean * g);
  k.push(tau, 0.01, sFall, ter.dir[0] * c, ter.dir[1] * c, ter.dir[2] * c, WAVE.ST);
  return k;
};

```

- [x] **Step 4: Update the Stage 5 per-territory test and the STEMI strips**

In `packages/engine-core/test/l2/ecg/s5/morph-st.test.ts`, replace this block (it occurs exactly once):

```ts
  });

  it.each(Object.keys(ST_TERRITORIES))('%s: ST(J+60) in the measuring lead = ±mm·0.1 mV', (territory) => {
    const t = ST_TERRITORIES[territory as keyof typeof ST_TERRITORIES];
    for (const mm of [1, 2.5, 4]) expect(st60(beat({ st: { territory: territory as never, mm } }), t.lead)).toBeCloseTo(t.sign * mm * 0.1, 3);
  });

```

with:

```ts
  });

  it.each(Object.keys(ST_TERRITORIES))('%s: mean kernel ST(J+60) over the index leads = ±mm·0.1 mV (Stage 5.1; measured on the leads in s51/stemi.test.ts)', (territory) => {
    const t = ST_TERRITORIES[territory as keyof typeof ST_TERRITORIES];
    for (const mm of [1, 2.5, 4]) {
      const k = beat({ st: { territory: territory as never, mm } });
      const mean = t.leads.reduce((a, l) => a + st60(k, l), 0) / t.leads.length;
      expect(mean).toBeCloseTo(t.sign * mm * 0.1, 3);
    }
  });

```

In `apps/demo/src/stage5-catalogue.ts`, replace this block (it occurs exactly once):

```ts
  r('oversensing', 'VVI oversensing', 'paced', { rhythm: 'pacedVVI', opts: { pacer: { fault: 'oversensing', faultRate: 0.3 } } }),
  r('tcpCapture', 'Transcutaneous pacing, capture', 'paced', { rhythm: 'asystole', mods: { tcp: { mode: 'fixed', ratePpm: 70, mA: 90, thresholdMa: 70 } } }),
  r('stemiAnterior', 'Anterior STEMI (V1/V3)', 'modifier', { rhythm: 'sinus', mods: { st: { territory: 'anterior', mm: 3 } }, leads: ['V3', 'ecgIII'] }),
  r('stemiInferior', 'Inferior STEMI (II/aVL)', 'modifier', { rhythm: 'sinus', mods: { st: { territory: 'inferior', mm: 3 } }, leads: ['ecgII', 'aVL'] }),
  r('lbbb', 'LBBB', 'modifier', { rhythm: 'sinus', mods: { bbb: 'lbbb' }, leads: ['V1', 'V6'] }),
  r('rbbb', 'RBBB', 'modifier', { rhythm: 'sinus', mods: { bbb: 'rbbb' }, leads: ['V1', 'V6'] }),
```

with:

```ts
  r('oversensing', 'VVI oversensing', 'paced', { rhythm: 'pacedVVI', opts: { pacer: { fault: 'oversensing', faultRate: 0.3 } } }),
  r('tcpCapture', 'Transcutaneous pacing, capture', 'paced', { rhythm: 'asystole', mods: { tcp: { mode: 'fixed', ratePpm: 70, mA: 90, thresholdMa: 70 } } }),
  r('stemiAnterior', 'Anterior STEMI 3 mm (V3/III, diagnostic filter)', 'modifier', { rhythm: 'sinus', mods: { st: { territory: 'anterior', mm: 3 } }, leads: ['V3', 'ecgIII'], filter: 'diagnostic' }),
  r('stemiInferior', 'Inferior STEMI 3 mm (II/aVL, diagnostic filter)', 'modifier', { rhythm: 'sinus', mods: { st: { territory: 'inferior', mm: 3 } }, leads: ['ecgII', 'aVL'], filter: 'diagnostic' }),
  r('lbbb', 'LBBB', 'modifier', { rhythm: 'sinus', mods: { bbb: 'lbbb' }, leads: ['V1', 'V6'] }),
  r('rbbb', 'RBBB', 'modifier', { rhythm: 'sinus', mods: { bbb: 'rbbb' }, leads: ['V1', 'V6'] }),
```

- [x] **Step 5: Run the ST tests and the demo typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s51/stemi.test.ts test/l2/ecg/s5/morph-st.test.ts && npx -y pnpm@9.15.9 --filter @pme/demo typecheck`
Expected: PASS; typecheck clean.

- [x] **Step 6: Commit and push**

```bash
git add packages/engine-core/src/l2/ecg/morphology/st.ts packages/engine-core/test/l2/ecg/s51/stemi.test.ts packages/engine-core/test/l2/ecg/s5/morph-st.test.ts apps/demo/src/stage5-catalogue.ts
git commit -m "feat(ecg): STEMI territories solved so every index lead reads mm at J+60 (G5-obs)"
git push
```

---

### Task 8: Hyperkalaemia sine wave at K 8.5; Osborn J wave scaled below 33 °C

Stage 5 executor: "K 8.5 sine wave: a wide QRS running into a tall T with no ST segment, not a smooth sinusoid"; "Osborn J at 28 °C present but small". Measured on Stage 5: at K 8.5 the sine stage was only half on (s4 ran from K 8 to 9), T/R 0.64 and the R–T trough only −0.17·R (no oscillation); at K 9 the T vanished (T/R 0.02). Osborn J (from `coldness`, 34 °C → 28 °C) read 0.11 mV in II at 30 °C only through a V3-sized kernel.

- **Sine wave** (research 03 §1.6: "QRS merged with T"): s4 = clamp((K − 7.8)/0.7), complete at K 8.5; QRS stretch 1 + s3 + 0.8·s4; at s4 the R shrinks (×0.65), the S deepens (×3.5), the T moves 80 ms earlier and broadens (σ rise ×2.5, fall ×2). Prototype at K 8.5 (II): QRS **175 ms**, R 0.74 / T 0.75 mV (T/R 1.01), R→T trough **−0.65·R**, 0 ms isoelectric between J and T peak; P amplitude 0 (unchanged: P is lost from K 7.8). K 9 gives the same (clamped).
- **Osborn J:** `osbornV3Mv(T) = min(0.6, 0.1·max(0, 33 − T))` mV in V3 along the Stage 5 direction (II 0.41×, V5 0.49×). Prototype J amplitude (II / V5): 32 °C 0.041/0.049, 31 °C 0.081/0.099, **30 °C 0.122/0.148**, 28 °C 0.204/0.246, capped at 25 °C 0.244/0.296. Research 03 §1.6: "J amplitude ∝ degree of hypothermia", largest in V3–V4. The J amplitude is measured as the waveform minus the same waveform without its J-coded kernels (the J wave's share of the lead).

**Files:**
- Modify: `packages/engine-core/src/l2/ecg/morphology/electrolytes.ts`
- Modify: `packages/engine-core/test/l2/ecg/s5/morph-electrolytes.test.ts` (Osborn 28 °C: 0.4 → 0.5 mV in V3)
- Test: `packages/engine-core/test/l2/ecg/s51/electrolytes.test.ts`

**Interfaces:**
- Consumes: `beatQrs`, `without`, `WAVE` (Task 2); `applyPMorphology`, `pWaveKernels`.
- Produces: `osbornV3Mv(tempC: number): number` exported from `morphology/electrolytes.ts`; `hyperK(k).s4` now saturates at K 8.5.

- [x] **Step 1: Write the failing test**

Create (or replace) `packages/engine-core/test/l2/ecg/s51/electrolytes.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { fiducialOf } from '../../../../src/l2/ecg/beat-templates.ts';
import { kernelLead, morphBeat } from '../../../helpers/s5.ts';
import { beatQrs, without, WAVE } from '../../../helpers/s51.ts';
import { applyPMorphology } from '../../../../src/l2/ecg/morphology/index.ts';
import { pWaveKernels } from '../../../../src/l2/ecg/templates.ts';
import { defaultModifiers, mergeModifiers } from '../../../../src/modifiers.ts';

const ii = (k: number[], t: number) => kernelLead(k, 'ecgII', t);

describe('Stage 5.1 hyperkalaemia sine wave and Osborn J wave (measured)', () => {
  it('K 8.5: QRS ≥ 160 ms, P absent, no isoelectric ST, R–S–T oscillation (trough ≤ −0.3·R, T/R 0.6–1.4)', () => {
    const k = morphBeat({ k: 8.5 });
    const q = beatQrs(k, fiducialOf(k));
    expect(q.ms).toBeGreaterThanOrEqual(160);
    const p = applyPMorphology(pWaveKernels(), mergeModifiers(defaultModifiers(), { k: 8.5 }));
    expect(Math.max(...Array.from({ length: 200 }, (_, i) => Math.abs(ii(p, i / 1000))))).toBeLessThan(0.02);
    let rAt = 0;
    let r = -Infinity;
    for (let t = 0; t < 0.15; t += 0.0005) if (ii(k, t) > r) [r, rAt] = [ii(k, t), t];
    let tAt = 0;
    let tv = -Infinity;
    for (let t = q.off; t < 0.6; t += 0.0005) if (ii(k, t) > tv) [tv, tAt] = [ii(k, t), t];
    let trough = Infinity;
    let flatMs = 0;
    for (let t = rAt; t < tAt; t += 0.0005) trough = Math.min(trough, ii(k, t));
    for (let t = q.off; t < tAt; t += 0.0005) if (Math.abs(ii(k, t)) < 0.05) flatMs += 0.5;
    expect(trough).toBeLessThanOrEqual(-0.3 * r);
    expect(tv / r).toBeGreaterThanOrEqual(0.6);
    expect(tv / r).toBeLessThanOrEqual(1.4);
    expect(flatMs).toBeLessThanOrEqual(10);
  });

  it('Osborn J: none at ≥ 33 °C, ≥ 0.1 mV in II and V5 at 30 °C, growing monotonically below 32 °C', () => {
    const jAmp = (tempC: number, l: 'ecgII' | 'V5') => {
      const k = morphBeat({ tempC });
      const b = without(k, WAVE.J);
      let m = 0;
      for (let t = 0; t < 0.3; t += 0.0005) m = Math.max(m, kernelLead(k, l, t) - kernelLead(b, l, t));
      return m;
    };
    expect(jAmp(33, 'ecgII')).toBe(0);
    for (const l of ['ecgII', 'V5'] as const) {
      expect(jAmp(30, l)).toBeGreaterThanOrEqual(0.1);
      const a = [32, 31, 30, 29, 28].map((t) => jAmp(t, l));
      for (let i = 1; i < a.length; i++) expect(a[i]!).toBeGreaterThan(a[i - 1]!);
    }
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s51/electrolytes.test.ts`
Expected: FAIL in both cases (sine: the R–T trough is only −0.17·R; Osborn: a J wave is present at 33 °C).

- [x] **Step 3: Implement**

In `packages/engine-core/src/l2/ecg/morphology/electrolytes.ts`, replace this block (it occurs exactly once):

```ts
  s2: clamp01((k - 6.5) / 1), // P flattening, PR↑
  s3: clamp01((k - 7) / 1.5), // QRS widening
  s4: clamp01((k - 8) / 1), // sine wave
});
export const hypoK = (k: number) => clamp01((3.5 - k) / 1.5);
export const coldness = (tempC: number) => clamp01((34 - tempC) / 6);
/** Osborn direction: V3 1.48, V4 1.16, II 0.60 per unit [ENG]. */
export const OSBORN_DIR: Vec3 = [0.55, 0.35, -0.75];
```

with:

```ts
  s2: clamp01((k - 6.5) / 1), // P flattening, PR↑
  s3: clamp01((k - 7) / 1.5), // QRS widening
  s4: clamp01((k - 7.8) / 0.7), // sine wave, complete at K 8.5 (Stage 5.1; was 8–9)
});
export const hypoK = (k: number) => clamp01((3.5 - k) / 1.5);
export const coldness = (tempC: number) => clamp01((34 - tempC) / 6);
/** Osborn J amplitude in V3 (mV) (Stage 5.1): appears below 33 °C, +0.1 mV per °C, capped at 0.6 → II ≈ 0.41×, V5 ≈ 0.49× [ENG]. */
export const osbornV3Mv = (tempC: number) => Math.min(0.6, 0.1 * Math.max(0, 33 - tempC));
/** Osborn direction: V3 1.48, V4 1.16, II 0.60 per unit [ENG]. */
export const OSBORN_DIR: Vec3 = [0.55, 0.35, -0.75];
```

In `packages/engine-core/src/l2/ecg/morphology/electrolytes.ts`, replace this block (it occurs exactly once):

```ts
    for (let j = 3; j < 6; j++) k[t + j] = (k[t + j] as number) * (1 + 1.5 * s1);
  }
  if (s3 > 0 || s4 > 0) stretchQrs(k, 1 + s3 + s4);
  if (s4 > 0 && t >= 0) {
    k[t] = (k[t] as number) - 0.2 * s4; // T pulled into the widened QRS: the ST segment disappears [ENG]
    k[t + 1] = (k[t + 1] as number) * (1 + 3 * s4);
  }
  if (lo > 0) {
```

with:

```ts
    for (let j = 3; j < 6; j++) k[t + j] = (k[t + j] as number) * (1 + 1.5 * s1);
  }
  if (s3 > 0 || s4 > 0) stretchQrs(k, 1 + s3 + 0.8 * s4);
  if (s4 > 0 && t >= 0) {
    // Sine wave (Stage 5.1): R shrinks, the T is pulled into the widened QRS and broadened on both limbs, so QRS and
    // T form one continuous oscillation with no isoelectric ST segment [ENG, research 03 §1.6 "QRS merged with T"]
    scaleWaves(k, WAVE.R, 1 - 0.35 * s4);
    scaleWaves(k, WAVE.S, 1 + 2.5 * s4); // a deep broad S: the down-stroke of the sine between R and T
    k[t] = (k[t] as number) - 0.08 * s4;
    k[t + 1] = (k[t + 1] as number) * (1 + 1.5 * s4);
    k[t + 2] = (k[t + 2] as number) * (1 + 1 * s4);
  }
  if (lo > 0) {
```

In `packages/engine-core/src/l2/ecg/morphology/electrolytes.ts`, replace this block (it occurs exactly once):

```ts
  stretchQrs(k, 1 + 0.015 * cold);
  for (let i = 0; i < k.length; i += K_STRIDE) if (k[i + 6] === WAVE.T || k[i + 6] === WAVE.U) k[i] = (k[i] as number) * (1 + 0.02 * cold);
  const c = coldness(mods.tempC);
  if (c > 0) {
    const j = jPointS(k);
    addShaped(k, j - 0.005, 0.012, 0.02, OSBORN_DIR, 'V3', 0.4 * c, j - 0.005, WAVE.J);
  }
  return k;
```

with:

```ts
  stretchQrs(k, 1 + 0.015 * cold);
  for (let i = 0; i < k.length; i += K_STRIDE) if (k[i + 6] === WAVE.T || k[i + 6] === WAVE.U) k[i] = (k[i] as number) * (1 + 0.02 * cold);
  const mv = osbornV3Mv(mods.tempC);
  if (mv > 0) {
    const j = jPointS(k);
    addShaped(k, j - 0.005, 0.012, 0.02, OSBORN_DIR, 'V3', mv, j - 0.005, WAVE.J);
  }
  return k;
```

- [x] **Step 4: Update the Stage 5 Osborn case**

In `packages/engine-core/test/l2/ecg/s5/morph-electrolytes.test.ts`, replace this block (it occurs exactly once):

```ts
  });

  it('hypothermia 28 °C: Osborn J 0.4 mV, largest in V3–V4; none at 36 °C', () => {
    const jOf = (k: number[]) => {
      for (let i = 0; i < k.length; i += K_STRIDE) if (k[i + 6] === WAVE.J) return [k[i + 3]!, k[i + 4]!, k[i + 5]!] as const;
```

with:

```ts
  });

  it('hypothermia 28 °C: Osborn J 0.5 mV in V3 (Stage 5.1: 0.1 mV/°C below 33 °C), largest in V3–V4; none at 36 °C', () => {
    const jOf = (k: number[]) => {
      for (let i = 0; i < k.length; i += K_STRIDE) if (k[i + 6] === WAVE.J) return [k[i + 3]!, k[i + 4]!, k[i + 5]!] as const;
```

In `packages/engine-core/test/l2/ecg/s5/morph-electrolytes.test.ts`, replace this block (it occurs exactly once):

```ts
    expect(jOf(beat({ tempC: 36 }))).toBeNull();
    const v = jOf(beat({ tempC: 28 }))!;
    expect(leadOf(v, 'V3')).toBeCloseTo(0.4, 3);
    for (const l of ['ecgII', 'V1', 'V6', 'ecgI'] as const) expect(leadOf(v, l)).toBeLessThan(leadOf(v, 'V4') + 1e-9);
  });
```

with:

```ts
    expect(jOf(beat({ tempC: 36 }))).toBeNull();
    const v = jOf(beat({ tempC: 28 }))!;
    expect(leadOf(v, 'V3')).toBeCloseTo(0.5, 3);
    for (const l of ['ecgII', 'V1', 'V6', 'ecgI'] as const) expect(leadOf(v, l)).toBeLessThan(leadOf(v, 'V4') + 1e-9);
  });
```

- [x] **Step 5: Run the electrolyte tests**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s51/electrolytes.test.ts test/l2/ecg/s5/morph-electrolytes.test.ts`
Expected: PASS (the Stage 5 ordering test "peaked T → PR↑ → QRS↑ → sine" still holds).

- [x] **Step 6: Commit and push**

```bash
git add packages/engine-core/src/l2/ecg/morphology/electrolytes.ts packages/engine-core/test/l2/ecg/s51/electrolytes.test.ts packages/engine-core/test/l2/ecg/s5/morph-electrolytes.test.ts
git commit -m "feat(ecg): hyperkalaemic sine wave at K 8.5; Osborn J scaled below 33 °C"
git push
```

---

### Task 9: Paced / transcutaneous capture complex: broad and low-slope

G5-obs (executor): the TCP capture "should be a large spike with a broad, low-slope capture complex". Research 03 §1.7: VVI/TCP capture is LBBB-like, 140–180 ms. Measured on Stage 5: the `pacedV` template (used by implanted VVI/DDD and by TCP capture) reads **133 ms** by the tangent method (kernel span 150 ms).

Fix: `pacedV` R kernel τ 60 ms σ 26 ms (was 55/22), S τ 125 ms σ 18 ms (was 115/14). Prototype: tangent QRS **155 ms**, kernel span 175 ms (the Stage 5 beat-template test keeps 140–180; Stage 4b's pacer test checks `qrsMs ≥ 140`), steepest limb in any lead 34 mV/s vs 162 mV/s for a sinus beat (21 %), V1 QS (max +0.15 mV). The template id stays `pacedV` (Stage 4b's tests assert it).

**Files:**
- Modify: `packages/engine-core/src/l2/ecg/beat-templates.ts` (`pacedV` case)
- Test: `packages/engine-core/test/l2/ecg/s51/tcp-capture.test.ts`

**Interfaces:**
- Consumes: `beatQrs` (Task 2).
- Produces: nothing new.

- [x] **Step 1: Write the failing test**

Create (or replace) `packages/engine-core/test/l2/ecg/s51/tcp-capture.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { beatKernels, fiducialOf } from '../../../../src/l2/ecg/beat-templates.ts';
import { LEAD_IDS } from '../../../../src/types.ts';
import { kernelLead, morphBeat } from '../../../helpers/s5.ts';
import { beatQrs } from '../../../helpers/s51.ts';

const maxSlope = (k: number[]) => {
  let m = 0;
  for (const l of LEAD_IDS) for (let t = -0.05; t < 0.3; t += 0.0005) m = Math.max(m, Math.abs(kernelLead(k, l, t + 0.00025) - kernelLead(k, l, t - 0.00025)) / 0.0005);
  return m;
};

describe('Stage 5.1 paced / transcutaneous capture complex (measured)', () => {
  it('capture complex: broad (tangent QRS ≥ 140 ms) and low-slope (steepest limb ≤ 40 % of a sinus beat), LBBB-like QS in V1', () => {
    const k = beatKernels('pacedV', 400);
    expect(beatQrs(k, fiducialOf(k)).ms).toBeGreaterThanOrEqual(140);
    expect(maxSlope(k) / maxSlope(morphBeat({}))).toBeLessThanOrEqual(0.4);
    expect(Math.max(...Array.from({ length: 200 }, (_, i) => kernelLead(k, 'V1', i / 1000)))).toBeLessThan(0.2);
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s51/tcp-capture.test.ts`
Expected: FAIL: `expected 133… to be greater than or equal to 140`.

- [x] **Step 3: Implement**

In `packages/engine-core/src/l2/ecg/beat-templates.ts`, replace this block (it occurs exactly once):

```ts
      return [...narrowKernels(qtMs, scale), ...kernel(0.085, 0.016, 0.016, RBBB_RPRIME_VEC, WAVE.S, scale)];
    case 'pacedV':
      return wideFrom(PACED_VEC, qtMs, scale, [0.055, 0.022], [0.115, 0.014], [0.07, 0.045]);
    case 'pvc2':
    case 'pvc3':
```

with:

```ts
      return [...narrowKernels(qtMs, scale), ...kernel(0.085, 0.016, 0.016, RBBB_RPRIME_VEC, WAVE.S, scale)];
    case 'pacedV':
      return wideFrom(PACED_VEC, qtMs, scale, [0.06, 0.026], [0.125, 0.018], [0.07, 0.045]); // Stage 5.1: broader, lower slope (was R 55/22, S 115/14)
    case 'pvc2':
    case 'pvc3':
```

- [x] **Step 4: Run it with the Stage 5 paced tests**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s51/tcp-capture.test.ts test/l2/ecg/s5/pacing.test.ts test/l2/ecg/s5/beat-templates.test.ts`
Expected: PASS.

- [x] **Step 5: Commit and push**

```bash
git add packages/engine-core/src/l2/ecg/beat-templates.ts packages/engine-core/test/l2/ecg/s51/tcp-capture.test.ts
git commit -m "feat(ecg): broader, lower-slope paced capture complex (≥ 140 ms by tangent)"
git push
```

---

### Task 10: Transcutaneous pacing: spike artefact, marker, demand rate fix (R30)

Three defects:
1. **R30 / R-4b-2:** demand pacing with capture ran at **68.4 ppm** for 70 set. Cause (`tcp.ts`): demand mode inhibits when `t − lastVT < interval`, and `lastVT` includes the pacer's OWN captured beat (spike + 20 ms), so every cycle slipped 20 ms (60/0.877 s = 68.4). Fix: a sensing refractory period — beats within 300 ms after the pacer's own pulse are not sensed (`TCP_SENSE_REFRACTORY_S`); new state `tcpLastPulseT` (JSON-safe). Prototype: demand and fixed both **70 pulses / 60 s**, all captured; sinus 80 still inhibits (0 pulses).
2. **The pad artefact looked like a QRS** (Stage 5: one blunt 40 ms deflection, 1.5–4 mV). It becomes a tall short spike — rise σ 2.5 ms, fall σ 4 ms, amplitude 3 + 3·mA/140 mV (cap 6) along the pad direction — plus a slow opposite-polarity polarisation tail (−12 %, σ 10/90 ms). Prototype at 50 mA: II peak **2.80 mV**, V1 **2.66 mV**, FWHM **8 ms** (raw), tail −0.31 mV; after the monitor filter the spike still peaks at 1.7 mV. Brief §6.5 says "a wide, blunt 20–40 ms deflection"; research 03 §1.7 says the long pulse "saturates or obscures the QRS; monitors blank or filter it" — the spike-plus-tail is that blanked/filtered look, and G5-obs asked for "a large spike". Record in the gate note as a brief deviation.
3. **Marker:** unchanged and already right — every pulse emits `marker { kind: 'paceSpike', data: { chamber: 2, captured, tcp: true, mA } }` from `tcp.ts` (the marker is what monitors draw, brief §3.5; the renderer overlay is Stage 4b's, request R-51-1 below).

No capture (mA < threshold) must leave the rhythm untouched: the test compares a seeded sinus bradycardia with and without sub-threshold pacing — identical beats, and bit-identical samples outside [pulse − 25 ms, pulse + 400 ms].

**Files:**
- Modify: `packages/engine-core/src/l2/ecg/tcp.ts`
- Modify: `packages/engine-core/src/l2/ecg/rhythm-state.ts` (`tcpLastPulseT`)
- Test: `packages/engine-core/test/l2/ecg/s51/tcp.test.ts`

**Interfaces:**
- Consumes: `run5`, `samples5` (Stage 5 helpers).
- Produces: `TCP_SPIKE_SIGMA_S`, `TCP_TAIL`, `TCP_SENSE_REFRACTORY_S`, `tcpArtefactMv(mA)` (new scale) from `tcp.ts`; `RhythmState.tcpLastPulseT?: number`.

- [x] **Step 1: Write the failing test**

Create (or replace) `packages/engine-core/test/l2/ecg/s51/tcp.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { run5, samples5 } from '../../../helpers/s5.ts';

const tcp = (mode: 'demand' | 'fixed', mA: number) => ({ tcp: { mode, ratePpm: 70, mA, thresholdMa: 70 } });

describe('Stage 5.1 transcutaneous pacing (measured)', () => {
  it('R30: demand pacing at 70 ppm with capture delivers 70 ± 1 pulses/min when there are no intrinsic beats; a sinus 80 inhibits it', () => {
    for (const mode of ['demand', 'fixed'] as const) {
      const r = run5('asystole', 62, { mods: tcp(mode, 90) });
      const spikes = r.markers.filter((m) => m.t >= 2 && m.t < 62);
      expect(Math.abs(spikes.length - 70)).toBeLessThanOrEqual(1);
      expect(spikes.every((m) => m.data?.captured === true && m.data?.tcp === true)).toBe(true);
      expect(r.beats.filter((b) => b.origin === 'paced' && b.t >= 2 && b.t < 62).length).toBe(spikes.length);
    }
    expect(run5('sinus', 60, { hr: 80, mods: tcp('demand', 90) }).markers.filter((m) => m.t > 5)).toEqual([]);
  });

  it('pulse artefact: a tall short spike (≥ 2 mV in II and V1 at 50 mA, FWHM ≤ 12 ms) with an opposite-polarity tail', () => {
    const r = samples5('asystole', 12, ['ecgII', 'V1'], { mods: { artefact: { noise: 0 }, ...tcp('fixed', 50) } });
    const s = r.markers.find((m) => m.t > 5)!;
    for (const l of ['ecgII', 'V1'] as const) {
      const x = r.lead[l]!;
      const i0 = Math.round(s.t * 500);
      let pi = i0;
      for (let i = i0 - 5; i < i0 + 25; i++) if (Math.abs(x[i]!) > Math.abs(x[pi]!)) pi = i;
      const pk = x[pi]!;
      let a = pi;
      let b = pi;
      while (Math.abs(x[a - 1]!) >= Math.abs(pk) / 2) a--;
      while (Math.abs(x[b + 1]!) >= Math.abs(pk) / 2) b++;
      expect(Math.abs(pk)).toBeGreaterThanOrEqual(2);
      expect((b - a + 1) * 2).toBeLessThanOrEqual(12);
      let tail = 0;
      for (let i = i0 + 15; i < i0 + 150; i++) tail = Math.min(tail, x[i]! * Math.sign(pk));
      expect(tail).toBeLessThan(-0.1);
    }
  });

  it('no capture: spike only — the underlying rhythm and every sample outside [spike − 25 ms, spike + 400 ms] are unchanged', () => {
    const on = samples5('sinusBrady', 30, ['ecgII'], { seed: 3, mods: tcp('fixed', 50) });
    const off = samples5('sinusBrady', 30, ['ecgII'], { seed: 3 });
    expect(on.markers.length).toBeGreaterThan(30);
    expect(on.markers.every((m) => m.data?.captured === false)).toBe(true);
    expect(on.beats.map((b) => [b.t, b.origin])).toEqual(off.beats.map((b) => [b.t, b.origin]));
    const sp = on.markers.map((m) => m.t);
    for (let i = 0; i < 15000; i++) {
      const t = i / 500;
      if (sp.some((s) => t > s - 0.025 && t < s + 0.4)) continue;
      expect(on.lead.ecgII![i]).toBe(off.lead.ecgII![i]);
    }
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s51/tcp.test.ts`
Expected: FAIL: R30 (`expected 1.6… / 2 to be less than or equal to 1`: 68–69 pulses in demand mode) and the spike shape (FWHM ≈ 40 ms). The no-capture case passes already.

- [x] **Step 3: Implement**

In `packages/engine-core/src/l2/ecg/tcp.ts`, replace this block (it occurs exactly once):

```ts
/** Pad artefact direction: anterior–posterior pads, large in V leads and II [ENG]. */
export const TCP_ART_DIR: Vec3 = [0.25, 0.6, -0.9];
/** Artefact amplitude (mV along TCP_ART_DIR): 1.5 + 2.5·mA/140, capped at 4 [ENG]. */
export function tcpArtefactMv(mA: number): number {
  return Math.min(4, 1.5 + (2.5 * mA) / 140);
}

export const tcpClock = {
```

with:

```ts
/** Pad artefact direction: anterior–posterior pads, large in V leads and II [ENG]. */
export const TCP_ART_DIR: Vec3 = [0.25, 0.6, -0.9];
/** Artefact amplitude (mV along TCP_ART_DIR): 3 + 3·mA/140, capped at 6 [ENG]. */
export function tcpArtefactMv(mA: number): number {
  return Math.min(6, 3 + (3 * mA) / 140); // Stage 5.1: 3–6 mV (was 1.5–4) so the spike towers over any QRS
}
/**
 * Stage 5.1 artefact shape: a tall, short spike (rise σ 2.5 ms, fall σ 4 ms: FWHM ≈ 8 ms) plus a slow
 * opposite-polarity polarisation tail (−12 %, rise σ 10 ms, fall σ 90 ms). The spike reads as an artefact and
 * never as a QRS (G5-obs); the pace MARKER (below) is what monitors draw at the pulse [ENG, research 03 §1.7].
 */
export const TCP_SPIKE_SIGMA_S: readonly [number, number] = [0.0025, 0.004];
export const TCP_TAIL: { tau: number; sigma: readonly [number, number]; frac: number } = { tau: 0.02, sigma: [0.01, 0.09], frac: -0.12 };
/** After its own pulse the pacer ignores the ventricle for this long (so its own captured beat never inhibits it) [ENG]. */
export const TCP_SENSE_REFRACTORY_S = 0.3;

export const tcpClock = {
```

In `packages/engine-core/src/l2/ecg/tcp.ts`, replace this block (it occurs exactly once):

```ts
    if (!m) return;
    const iv = 60 / m.ratePpm;
    // Demand mode: an intrinsic (non-paced) beat within the last interval inhibits the pulse.
    if (m.mode === 'demand' && t - st.lastVT < iv - 1e-9) {
      st.tcpNextT = st.lastVT + iv;
      return;
    }
    st.tcpNextT = t + iv;
    // 40 ms blunt deflection: rise σ 8 ms, fall σ 14 ms, peak 12 ms after the pulse starts [ENG].
    st.events.push(makeEvent(t, kernel(0.012, 0.008, 0.014, TCP_ART_DIR, WAVE.ART, tcpArtefactMv(m.mA) / Math.hypot(...TCP_ART_DIR))));
    const captured = m.mA >= m.thresholdMa && !(t < st.refractoryUntil);
    st.records.push({ type: 'marker', t, kind: 'paceSpike', data: { chamber: 2, captured, tcp: true, mA: m.mA } });
```

with:

```ts
    if (!m) return;
    const iv = 60 / m.ratePpm;
    // Demand mode: a SENSED beat within the last interval inhibits the pulse. Beats inside the pacer's own sensing
    // refractory period after a pulse are not sensed (R-4b-2 / R30: the captured beat used to inhibit the next
    // pulse, so 70 ppm paced at 68.4).
    const sensed = st.lastVT > (st.tcpLastPulseT ?? -NEVER) + TCP_SENSE_REFRACTORY_S ? st.lastVT : -NEVER;
    if (m.mode === 'demand' && t - sensed < iv - 1e-9) {
      st.tcpNextT = sensed + iv;
      return;
    }
    st.tcpNextT = t + iv;
    st.tcpLastPulseT = t;
    const a = tcpArtefactMv(m.mA) / Math.hypot(...TCP_ART_DIR);
    st.events.push(makeEvent(t, [
      ...kernel(0.004, TCP_SPIKE_SIGMA_S[0], TCP_SPIKE_SIGMA_S[1], TCP_ART_DIR, WAVE.ART, a),
      ...kernel(TCP_TAIL.tau, TCP_TAIL.sigma[0], TCP_TAIL.sigma[1], TCP_ART_DIR, WAVE.ART, a * TCP_TAIL.frac),
    ]));
    const captured = m.mA >= m.thresholdMa && !(t < st.refractoryUntil);
    st.records.push({ type: 'marker', t, kind: 'paceSpike', data: { chamber: 2, captured, tcp: true, mA: m.mA } });
```

In `packages/engine-core/src/l2/ecg/rhythm-state.ts`, replace this block (it occurs exactly once):

```ts
  /** Next transcutaneous pulse (tcp.ts); undefined when TCP is off. */
  tcpNextT?: number | undefined;
  /** Running VF episode (arrest/vf.ts). */
  vf?: VfState | undefined;
```

with:

```ts
  /** Next transcutaneous pulse (tcp.ts); undefined when TCP is off. */
  tcpNextT?: number | undefined;
  /** Time of the last transcutaneous pulse (tcp.ts, Stage 5.1: sensing refractory). */
  tcpLastPulseT?: number | undefined;
  /** Running VF episode (arrest/vf.ts). */
  vf?: VfState | undefined;
```

- [x] **Step 4: Run the pacing tests**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s51/tcp.test.ts test/l2/ecg/s51/tcp-capture.test.ts test/l2/ecg/s5/pacing.test.ts test/engine`
Expected: PASS (the engine determinism test runs pacing).

- [x] **Step 5: Commit and push**

```bash
git add packages/engine-core/src/l2/ecg/tcp.ts packages/engine-core/src/l2/ecg/rhythm-state.ts packages/engine-core/test/l2/ecg/s51/tcp.test.ts
git commit -m "fix(ecg): TCP demand rate (R30), spike-shaped pad artefact with polarisation tail"
git push
```

---

### Task 11: BreathClock seam: RSA and wander read the breath driver (R-S3-3)

R29 R-S3-3: "ECG RSA reads the breath driver (Stage 5.1)". Stage 1's `hrv.ts` drives RSA, respiratory baseline wander and QRS amplitude modulation from a fixed 15/min sinusoid. This task adds a `BreathClock` interface (rate + phase) that all three read; the default is exactly the Stage 1 sinusoid (the test proves bit-identical beats and samples), and a breath driver plugs in through `cycleBreathClock`, which takes any `(t) => { seq, t0, ti, te } | undefined` — Stage 3's `lastCycleBefore(driver, t)` fits structurally, so `l2/ecg` never imports Stage 3 files. After the last cycle ends (apnoea) the phase holds and the rate reads 0, so RR and wander stop swinging; before the first cycle the fixed clock is used. Inspiration onset is phase +π/2 (heart slowest at the start of inspiration, fastest half a cycle later [ENG]).

`RhythmCtx.breath?` and `GenInputs.breath?` are optional, and `ecgGenInputs` copies `ps.breath` when present, so the engine needs only the wiring in Step 7 once Stage 3 is on `main`.

Planning prototype: RR vs the driver phase r = **0.85** with a 10/min driver (r −0.01 against the 15/min clock); default path identical to Stage 5 (hash equal); wander dominant 1/6 Hz with the driver and flat to 1e-9 after apnoea starts.

**Files:**
- Create: `packages/engine-core/src/l2/ecg/breath-clock.ts`
- Modify: `packages/engine-core/src/l2/ecg/{hrv,atria,rhythm-engine,generator,ecg-gen,rhythm-state}.ts`
- Test: `packages/engine-core/test/l2/ecg/s51/breath-clock.test.ts`
- Conditional (Step 7, only if Task 1 Step 3 printed "stage 3 merged"): `packages/engine-core/src/engine.ts`, `packages/engine-core/test/engine/ecg-breath.test.ts`

**Interfaces:**
- Consumes: `F_RESP_HZ`, `HrvPhase` (`hrv.ts`). With Stage 3: `lastCycleBefore(d: DriverState, t): Cycle | undefined` (`l2/resp/driver.ts`), `PipelineState.resp.driver`.
- Produces: `interface BreathClock { rateBpm(t): number; phaseRad(t): number }`, `fixedBreathClock(ph: HrvPhase): BreathClock`, `interface BreathCycleLike { seq; t0; ti; te }`, `cycleBreathClock(lastCycleBefore, fallback): BreathClock`; `respSin(t, ph, clock?)`, `sinusRR(meanRR, t, ph, mods, s, clock?)`; `RhythmCtx.breath?`, `GenInputs.breath?`; `ecgGenInputs(ps & { breath? }, mainsHz)`.

- [x] **Step 1: Write the failing test**

Create (or replace) `packages/engine-core/test/l2/ecg/s51/breath-clock.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { defaultModifiers, mergeModifiers } from '../../../../src/modifiers.ts';
import { createRngState } from '../../../../src/rng/sfc32.ts';
import { drawHrvPhase } from '../../../../src/l2/ecg/hrv.ts';
import { createRhythmState, planUntil, type RhythmCtx } from '../../../../src/l2/ecg/rhythm-engine.ts';
import { ecgGenInputs, generateEcg } from '../../../../src/l2/ecg/ecg-gen.ts';
import { projectLead } from '../../../../src/l2/ecg/vcg.ts';
import { cycleBreathClock, fixedBreathClock, type BreathClock } from '../../../../src/l2/ecg/breath-clock.ts';
import { dominantHz } from '../../../../src/util/dsp.ts';

function beatsRR(breath?: BreathClock) {
  const rng = createRngState(5);
  const mods = mergeModifiers(defaultModifiers(), { rsa: 1 });
  const hrv = drawHrvPhase(rng.hrv);
  const ctx: RhythmCtx = { hrAt: () => 60, mods, rng, hrv, ...(breath ? { breath } : {}) };
  const st = createRhythmState('sinus', {}, 0, ctx);
  planUntil(st, 300, ctx);
  const t = st.records.filter((r) => r.type === 'beat').map((r) => r.t);
  return { hrv, t: t.slice(1), rr: t.slice(1).map((x, i) => x - t[i]!) };
}
const corr = (a: number[], b: number[]) => {
  const m = (x: number[]) => x.reduce((p, q) => p + q, 0) / x.length;
  const ma = m(a), mb = m(b);
  let n = 0, da = 0, db = 0;
  a.forEach((v, i) => { n += (v - ma) * (b[i]! - mb); da += (v - ma) ** 2; db += (b[i]! - mb) ** 2; });
  return n / Math.sqrt(da * db);
};
/** Breaths every 6 s (10/min), 2 s inspiration. */
const tenPerMin = (t: number) => (t < 0 ? undefined : { seq: Math.floor(t / 6), t0: Math.floor(t / 6) * 6, ti: 2, te: 4 });

describe('Stage 5.1 BreathClock seam (R-S3-3)', () => {
  it('no clock and the explicit fixed clock give identical beats and samples (Stage 1–5 behaviour unchanged)', () => {
    const d = beatsRR();
    expect(beatsRR(fixedBreathClock(d.hrv)).rr).toEqual(d.rr);
    const hash = (withClock: boolean) => {
      const rng = createRngState(9);
      const mods = defaultModifiers();
      const hrv = drawHrvPhase(rng.hrv);
      const breath = withClock ? fixedBreathClock(hrv) : undefined;
      const ctx: RhythmCtx = { hrAt: () => 75, mods, rng, hrv, ...(breath ? { breath } : {}) };
      const st = createRhythmState('sinus', {}, 0, ctx);
      planUntil(st, 10.2, ctx);
      const h = createHash('sha256');
      generateEcg(ecgGenInputs({ rhythm: st, mods, hrv, rng, ...(breath ? { breath } : {}) }, 50), 0, 4999, (_n, x, y, z) => h.update(String(projectLead('ecgII', x, y, z))));
      return h.digest('hex');
    };
    expect(hash(true)).toBe(hash(false));
  });

  it('RSA follows a pluggable breath driver: RR correlates with the driver phase (r > 0.7) and not with the fixed clock (|r| < 0.2)', () => {
    const d = beatsRR();
    const fixed = fixedBreathClock(d.hrv);
    const slow = cycleBreathClock(tenPerMin, fixed);
    const s = beatsRR(slow);
    const phaseAt = (c: BreathClock, x: { t: number[]; rr: number[] }) => x.t.map((t, i) => Math.sin(c.phaseRad(t - x.rr[i]!)));
    expect(corr(s.rr, phaseAt(slow, s))).toBeGreaterThan(0.7);
    expect(Math.abs(corr(s.rr, phaseAt(fixed, s)))).toBeLessThan(0.2);
    expect(corr(d.rr, phaseAt(fixed, d))).toBeGreaterThan(0.7);
  });

  it('baseline wander follows the driver (dominant 1/6 Hz) and stops swinging in apnoea (phase held, rate 0)', () => {
    const rng = createRngState(2);
    const mods = mergeModifiers(defaultModifiers(), { artefact: { noise: 0 } });
    const hrv = drawHrvPhase(rng.hrv);
    const apnoeaAt = 60;
    const breath = cycleBreathClock((t) => (t >= apnoeaAt ? tenPerMin(apnoeaAt - 1) : tenPerMin(t)), fixedBreathClock(hrv));
    const ctx: RhythmCtx = { hrAt: () => 60, mods, rng, hrv, breath };
    const st = createRhythmState('asystole', {}, 0, ctx);
    planUntil(st, 120.2, ctx);
    const x = new Float64Array(60_000);
    generateEcg(ecgGenInputs({ rhythm: st, mods, hrv, rng, breath }, 50), 0, 59_999, (n, a, b, c) => { x[n] = projectLead('ecgII', a, b, c); });
    expect(dominantHz(x.subarray(0, 30_000), 500, 0.05, 1, 8192)).toBeCloseTo(1 / 6, 1);
    const late = x.subarray(35_000, 60_000);
    expect(Math.max(...late) - Math.min(...late)).toBeLessThan(1e-9);
    expect(breath.rateBpm(30)).toBeCloseTo(10, 6);
    expect(breath.rateBpm(90)).toBe(0);
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s51/breath-clock.test.ts`
Expected: FAIL: cannot resolve `../../../../src/l2/ecg/breath-clock.ts`.

- [x] **Step 3: Create the clock module**

Create (or replace) `packages/engine-core/src/l2/ecg/breath-clock.ts` with exactly:

```ts
// Respiratory clock seam for the ECG (Stage 5.1, ruling R29 item R-S3-3): RSA, respiratory baseline wander and QRS
// amplitude modulation read a BreathClock instead of Stage 1's fixed 15/min sinusoid. The default is that sinusoid,
// bit-identical; a breath driver (Stage 3's, once merged) plugs in through cycleBreathClock without this module
// importing it (structural typing only).
import { F_RESP_HZ, type HrvPhase } from './hrv.ts';

export interface BreathClock {
  /** Breaths per minute at sim time t (0 = no breath in progress: apnoea). */
  rateBpm(t: number): number;
  /** Unwrapped respiratory phase angle at t, radians; the ECG uses sin(phaseRad(t)) (+1 = slowest heart rate). */
  phaseRad(t: number): number;
}

/** Stage 1's fixed 15/min clock: phaseRad = 2π·0.25·t + φ, exactly the expression hrv.ts has always used. */
export function fixedBreathClock(ph: HrvPhase): BreathClock {
  return { rateBpm: () => F_RESP_HZ * 60, phaseRad: (t) => 2 * Math.PI * F_RESP_HZ * t + ph.phi };
}

/** The part of a breath cycle the clock needs (Stage 3's `Cycle` has these fields). */
export interface BreathCycleLike {
  seq: number;
  t0: number;
  ti: number;
  te: number;
}

/**
 * A clock driven by breath cycles: phase advances 2π per cycle (inspiration onset = +π/2, so the heart is slowest at
 * the start of inspiration and fastest half a cycle later [ENG]); after the last cycle ends the phase holds (apnoea:
 * RR and wander stop swinging) and the rate reads 0. Before the first cycle the fallback clock is used.
 */
export function cycleBreathClock(lastCycleBefore: (t: number) => BreathCycleLike | undefined, fallback: BreathClock): BreathClock {
  return {
    rateBpm(t) {
      const c = lastCycleBefore(t);
      if (!c) return fallback.rateBpm(t);
      const T = c.ti + c.te;
      return T > 0 && t - c.t0 <= T ? 60 / T : 0;
    },
    phaseRad(t) {
      const c = lastCycleBefore(t);
      if (!c) return fallback.phaseRad(t);
      const T = Math.max(1e-3, c.ti + c.te);
      return 2 * Math.PI * (c.seq + Math.min(1, (t - c.t0) / T)) + Math.PI / 2;
    },
  };
}
```

- [x] **Step 4: Thread the optional clock through the ECG**

In `packages/engine-core/src/l2/ecg/hrv.ts`, replace this block (it occurs exactly once):

```ts
}

/** Respiratory phase term in [−1, 1] at time t (used for RSA, baseline wander and QRS amplitude modulation). */
export function respSin(t: number, ph: HrvPhase): number {
  return Math.sin(2 * Math.PI * F_RESP_HZ * t + ph.phi);
}

/** Next sinus RR interval (s) for a beat starting at time t. Consumes one normal draw when HRV is on. */
export function sinusRR(meanRR: number, t: number, ph: HrvPhase, mods: Pick<Modifiers, 'rsa' | 'hrvScale'>, s: Sfc32State): number {
  const k = mods.hrvScale;
  if (!(k > 0)) return meanRR;
  const rsa = A_RSA_MAX_S * mods.rsa * meanRR * k * respSin(t, ph);
  const lf = A_LF_S * meanRR * k * Math.sin(2 * Math.PI * 0.1 * t + ph.psi);
  const eps = EPS_SD_S * meanRR * k * normal(s);
```

with:

```ts
}

/**
 * Respiratory phase term in [−1, 1] at time t (used for RSA, baseline wander and QRS amplitude modulation). With a
 * BreathClock (Stage 5.1, breath-clock.ts) it follows the breathing; without one, Stage 1's fixed 15/min clock.
 */
export function respSin(t: number, ph: HrvPhase, clock?: { phaseRad(t: number): number }): number {
  return clock ? Math.sin(clock.phaseRad(t)) : Math.sin(2 * Math.PI * F_RESP_HZ * t + ph.phi);
}

/** Next sinus RR interval (s) for a beat starting at time t. Consumes one normal draw when HRV is on. */
export function sinusRR(meanRR: number, t: number, ph: HrvPhase, mods: Pick<Modifiers, 'rsa' | 'hrvScale'>, s: Sfc32State, clock?: { phaseRad(t: number): number }): number {
  const k = mods.hrvScale;
  if (!(k > 0)) return meanRR;
  const rsa = A_RSA_MAX_S * mods.rsa * meanRR * k * respSin(t, ph, clock);
  const lf = A_LF_S * meanRR * k * Math.sin(2 * Math.PI * 0.1 * t + ph.psi);
  const eps = EPS_SD_S * meanRR * k * normal(s);
```

In `packages/engine-core/src/l2/ecg/atria.ts`, replace this block (it occurs exactly once):

```ts
    ? { rsa: Math.max(ctx.mods.rsa, SINUS_ARRHYTHMIA_RSA), hrvScale: Math.max(1, ctx.mods.hrvScale) }
    : ctx.mods;
  const next = t + sinusRR(60 / rate, t, ctx.hrv, m, ctx.rng.hrv);
  if (st.id === 'sinusPause') {
    const every = st.opts.pauseEveryS ?? 12; // [ENG]
```

with:

```ts
    ? { rsa: Math.max(ctx.mods.rsa, SINUS_ARRHYTHMIA_RSA), hrvScale: Math.max(1, ctx.mods.hrvScale) }
    : ctx.mods;
  const next = t + sinusRR(60 / rate, t, ctx.hrv, m, ctx.rng.hrv, ctx.breath);
  if (st.id === 'sinusPause') {
    const every = st.opts.pauseEveryS ?? 12; // [ENG]
```

In `packages/engine-core/src/l2/ecg/rhythm-engine.ts`, replace this block (it occurs exactly once):

```ts
  const qtBase = ctx.mods.overrides.qtMs ?? qtFridericiaMs(clamp(rr, 0.25, 2), qtc);
  const wide = isWide(p.template);
  const scale = p.scale ?? (wide ? 1 : 1 + QRS_AMP_RESP_MOD * respSin(t, ctx.hrv));
  const supra = !p.pvc && !wide && p.origin !== 'ventricular' && p.origin !== 'paced';
  const raw = beatKernels(p.template, qtBase, scale, p.pre ?? 1);
```

with:

```ts
  const qtBase = ctx.mods.overrides.qtMs ?? qtFridericiaMs(clamp(rr, 0.25, 2), qtc);
  const wide = isWide(p.template);
  const scale = p.scale ?? (wide ? 1 : 1 + QRS_AMP_RESP_MOD * respSin(t, ctx.hrv, ctx.breath));
  const supra = !p.pvc && !wide && p.origin !== 'ventricular' && p.origin !== 'paced';
  const raw = beatKernels(p.template, qtBase, scale, p.pre ?? 1);
```

In `packages/engine-core/src/l2/ecg/generator.ts`, replace this block (it occurs exactly once):

```ts
import { addEventAt, type EcgEvent } from './kernels.ts';
import { respSin, type HrvPhase } from './hrv.ts';
import type { FWave } from './rhythm-engine.ts';
import { WANDER_DIR } from './templates.ts';
```

with:

```ts
import { addEventAt, type EcgEvent } from './kernels.ts';
import { respSin, type HrvPhase } from './hrv.ts';
import type { BreathClock } from './breath-clock.ts';
import type { FWave } from './rhythm-engine.ts';
import { WANDER_DIR } from './templates.ts';
```

In `packages/engine-core/src/l2/ecg/generator.ts`, replace this block (it occurs exactly once):

```ts
  noiseLevel: number; // Modifiers.artefact.noise
  noise: Sfc32State;
}

```

with:

```ts
  noiseLevel: number; // Modifiers.artefact.noise
  noise: Sfc32State;
  /** Stage 5.1 (R-S3-3): respiratory clock for the wander; absent = Stage 1's fixed 15/min clock. */
  breath?: BreathClock | undefined;
}

```

In `packages/engine-core/src/l2/ecg/generator.ts`, replace this block (it occurs exactly once):

```ts
    for (const ev of active) if (s >= ev.start && s <= ev.end) addEventAt(ev, s, acc);
    for (const fw of fws) fwaveAt(fw, s, acc);
    const w = WANDER_MV * respSin(s, g.hrv);
    let x = (acc[0] as number) + w * WANDER_DIR[0];
    let y = (acc[1] as number) + w * WANDER_DIR[1];
```

with:

```ts
    for (const ev of active) if (s >= ev.start && s <= ev.end) addEventAt(ev, s, acc);
    for (const fw of fws) fwaveAt(fw, s, acc);
    const w = WANDER_MV * respSin(s, g.hrv, g.breath);
    let x = (acc[0] as number) + w * WANDER_DIR[0];
    let y = (acc[1] as number) + w * WANDER_DIR[1];
```

In `packages/engine-core/src/l2/ecg/ecg-gen.ts`, replace this block (it occurs exactly once):

```ts
import { ECG_RATE, generateVcg, type GenInputs } from './generator.ts';
import type { HrvPhase } from './hrv.ts';
import type { RhythmState } from './rhythm-state.ts';
import { vfSource } from './arrest/vf.ts';
```

with:

```ts
import { ECG_RATE, generateVcg, type GenInputs } from './generator.ts';
import type { HrvPhase } from './hrv.ts';
import type { BreathClock } from './breath-clock.ts';
import type { RhythmState } from './rhythm-state.ts';
import { vfSource } from './arrest/vf.ts';
```

In `packages/engine-core/src/l2/ecg/ecg-gen.ts`, replace this block (it occurs exactly once):

```ts

export function ecgGenInputs(
  ps: { rhythm: RhythmState; mods: Modifiers; hrv: HrvPhase; rng: Record<StreamName, Sfc32State> },
  mainsHz: 50 | 60,
): EcgGenInputs {
  return {
    events: ps.rhythm.events,
    fwaves: ps.rhythm.fwaves,
```

with:

```ts

export function ecgGenInputs(
  ps: { rhythm: RhythmState; mods: Modifiers; hrv: HrvPhase; rng: Record<StreamName, Sfc32State>; breath?: BreathClock | undefined },
  mainsHz: 50 | 60,
): EcgGenInputs {
  return {
    ...(ps.breath ? { breath: ps.breath } : {}), // Stage 5.1 (R-S3-3)
    events: ps.rhythm.events,
    fwaves: ps.rhythm.fwaves,
```

In `packages/engine-core/src/l2/ecg/rhythm-state.ts`, replace this block (it occurs exactly once):

```ts
import type { EcgEvent } from './kernels.ts';
import type { HrvPhase } from './hrv.ts';
import type { BeatTemplateId } from './beat-templates.ts';
import { RHYTHMS, type RhythmDef } from './rhythms.ts';
```

with:

```ts
import type { EcgEvent } from './kernels.ts';
import type { HrvPhase } from './hrv.ts';
import type { BreathClock } from './breath-clock.ts';
import type { BeatTemplateId } from './beat-templates.ts';
import { RHYTHMS, type RhythmDef } from './rhythms.ts';
```

In `packages/engine-core/src/l2/ecg/rhythm-state.ts`, replace this block (it occurs exactly once):

```ts
  rng: Record<StreamName, Sfc32State>;
  hrv: HrvPhase;
}

```

with:

```ts
  rng: Record<StreamName, Sfc32State>;
  hrv: HrvPhase;
  /** Stage 5.1 (R-S3-3): respiratory clock for RSA and QRS amplitude modulation; absent = fixed 15/min clock. */
  breath?: BreathClock | undefined;
}

```

- [x] **Step 5: Run the new test and every ECG test (RSA/wander tests must be unchanged)**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg test/engine`
Expected: PASS.

- [x] **Step 6: Commit and push**

```bash
git add packages/engine-core/src/l2/ecg/breath-clock.ts packages/engine-core/src/l2/ecg/hrv.ts packages/engine-core/src/l2/ecg/atria.ts packages/engine-core/src/l2/ecg/rhythm-engine.ts packages/engine-core/src/l2/ecg/generator.ts packages/engine-core/src/l2/ecg/ecg-gen.ts packages/engine-core/src/l2/ecg/rhythm-state.ts packages/engine-core/test/l2/ecg/s51/breath-clock.test.ts
git commit -m "feat(ecg): BreathClock seam for RSA, wander and QRS modulation (R-S3-3)"
git push
```

- [x] *(Executed 2026-09-26: Stage 3 IS on main, the wiring passed its own test but moved Stage 2's marginal NIBP-duration test out of band, so it is parked as `docs/gates/stage-5.1/r-51-2-engine-breath.patch` and request R-51-2 — see the gate note, Deviations.)* **Step 7: ONLY if Stage 3 is on `main` (Task 1 Step 3) — wire the driver into the engine. Otherwise skip this step and record request R-51-2 (below) in the gate note**

In `packages/engine-core/src/engine.ts`, add after the last `import` line:

```ts
import { cycleBreathClock, fixedBreathClock, type BreathClock } from './l2/ecg/breath-clock.ts'; // Stage 5.1 (R-S3-3)
import { lastCycleBefore } from './l2/resp/driver.ts'; // Stage 5.1 (R-S3-3)
```

replace this block (it occurs exactly once):

```ts
function rhythmCtx(ps: PipelineState): RhythmCtx {
  return { hrAt: (t) => rampValue(ps.hr, t), mods: ps.mods, rng: ps.rng, hrv: ps.hrv };
}
```

with:

```ts
/** Stage 5.1 (R-S3-3): the ECG's RSA, wander and QRS modulation follow Stage 3's breath driver. */
function breathOf(ps: PipelineState): BreathClock {
  return cycleBreathClock((t) => lastCycleBefore(ps.resp.driver, t), fixedBreathClock(ps.hrv));
}

function rhythmCtx(ps: PipelineState): RhythmCtx {
  return { hrAt: (t) => rampValue(ps.hr, t), mods: ps.mods, rng: ps.rng, hrv: ps.hrv, breath: breathOf(ps) }; // Stage 5.1: breath
}
```

and replace `      ecgGenInputs(ps, this.mainsHz),` (it occurs exactly once, in `advance()`) with `      ecgGenInputs({ ...ps, breath: breathOf(ps) }, this.mainsHz), // Stage 5.1 (R-S3-3)`.

Then create `packages/engine-core/test/engine/ecg-breath.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type EngineEvent } from '../../src/index.ts';

// R-S3-3: with Stage 3 merged, RSA follows the breath driver's cycles (public events only).
describe('Stage 5.1: ECG RSA follows the breath driver', () => {
  it('beat-to-beat RR correlates with the phase of the emitted breaths (r > 0.5)', { timeout: 300_000 }, async () => {
    const e = createEngine({ seed: 5 });
    const ev: EngineEvent[] = [];
    e.on((x) => ev.push(x), ['beat', 'breath']);
    e.dispatch({ id: 'm', issuedBy: 't', type: 'setModifiers', modifiers: { rsa: 1 } } as Command);
    for (let t = 60; t <= 240; t += 60) {
      e.advanceTo(t);
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    const br = ev.filter((x): x is Extract<EngineEvent, { type: 'breath' }> => x.type === 'breath');
    const bt = ev.filter((x) => x.type === 'beat').map((x) => (x as { t: number }).t);
    expect(br.length).toBeGreaterThan(20);
    const phase = (t: number) => {
      let c = br[0]!;
      for (const b of br) if (b.t <= t) c = b;
      return Math.sin(2 * Math.PI * (c.seq + Math.min(1, (t - c.t) / (c.tiS + c.teS))) + Math.PI / 2);
    };
    const rr = bt.slice(1).map((t, i) => t - bt[i]!).slice(20);
    const ph = bt.slice(1).map((t, i) => phase(bt[i]!)).slice(20);
    const m = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
    const ma = m(rr), mb = m(ph);
    let n = 0, da = 0, db = 0;
    rr.forEach((v, i) => { n += (v - ma) * (ph[i]! - mb); da += (v - ma) ** 2; db += (ph[i]! - mb) ** 2; });
    expect(n / Math.sqrt(da * db)).toBeGreaterThan(0.5);
  });
});
```

Run `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine` (expected PASS; the Stage 2/3 determinism tests still compare two runs of the same code, so they hold). If the breath event's fields are not `seq`, `t`, `tiS`, `teS` on your `main`, read `types-resp.ts` and adapt the three names; if `lastCycleBefore` or `ps.resp.driver` are named differently, adapt them and record it under "Deviations". Add `packages/engine-core/src/engine.ts` and the new test to the commit, and note in the gate document that engine.ts received 2 imports + 2 marked hunks (declared exception to the partition, the seam R-S3-3 asked for).

---

### Task 12: Per-patient fingerprint to the Squiggler-style bounds

Brief §5 "Individuality" and research 04 §5 (Squiggler: "every patient drawn has an ECG fingerprint of their own"). Stage 5 shipped a fingerprint (per-wave rotations ±20°, amplitudes ±25 %, QRS width ±10 %, T shift ±25 ms). The Stage 5.1 bounds are: **P, QRS and T amplitude ±10 %, P, QRS and T width ±10 %, frontal QRS axis ±15°** — two patients differ, each patient is stable, determinism kept. The axis is ±15° of MEASURED frontal axis (net QRS area in I and aVF): the VCG-rotation → axis map is non-linear, so the rotation is solved with the same grid + ternary search `axisStage` uses (factored out as `solveAxisRad`, ≈ 0.03 ms per beat). An explicit `axisDeg` modifier still wins (its stage runs later). `morphologyVariation` still defaults to 0: Stage 1's fitted lead-II amplitudes and every textbook-value test depend on it (Stage 5 decision 10); scenarios and the demo opt in.

Planning prototype (30 seeds): axis offsets −14.2° to +14.3°; amplitudes within ±10 % (rotation-invariant |VCG| peaks); pairs (1,2) (3,4) (5,6) (7,8) differ by 0.105 / 0.286 / 0.202 / 0.597 mV somewhere in lead II. Note the Stage 5 test's "r < 0.99" no longer holds for every pair (seeds 3/4 differ mostly in amplitude: r 0.9997 with a 0.29 mV difference), so it becomes "differ by ≥ 0.05 mV".

**Files:**
- Modify: `packages/engine-core/src/l2/ecg/morphology/conduction.ts` (`solveAxisRad` factored out of `axisStage`)
- Replace: `packages/engine-core/src/l2/ecg/morphology/individuality.ts`
- Modify: `packages/engine-core/test/l2/ecg/s5/morph-individuality.test.ts`
- Test: `packages/engine-core/test/l2/ecg/s51/fingerprint.test.ts`

**Interfaces:**
- Consumes: `QRS_T` (Task 6), `frontalAxisDeg`, `rotateZSel`, `stretchQrs`, `QRS_WAVES` (`ops.ts`).
- Produces: `solveAxisRad(k: readonly number[], targetDeg: number): number`; `FP_AMP`, `FP_WIDTH`, `FP_AXIS_DEG`, `interface Fingerprint { amp: {p,qrs,t}; width: {p,qrs,t}; axisDeg }`, `fingerprint(seed)`; `individualityStage`, `pIndividualityStage` keep their names and places in `MORPH_STAGES`/`P_STAGES`.

- [x] **Step 1: Write the failing test**

Create (or replace) `packages/engine-core/test/l2/ecg/s51/fingerprint.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { fiducialOf } from '../../../../src/l2/ecg/beat-templates.ts';
import { frontalAxisDeg } from '../../../../src/l2/ecg/morphology/ops.ts';
import { applyPMorphology } from '../../../../src/l2/ecg/morphology/index.ts';
import { pWaveKernels } from '../../../../src/l2/ecg/templates.ts';
import { defaultModifiers, mergeModifiers } from '../../../../src/modifiers.ts';
import { K_STRIDE } from '../../../../src/l2/ecg/kernels.ts';
import { kernelLead, morphBeat, samples5 } from '../../../helpers/s5.ts';
import { beatQrs, WAVE } from '../../../helpers/s51.ts';

/** Peak spatial magnitude |VCG| of the selected waves (rotation-invariant amplitude), measured at 2 kHz. */
function spatialPeak(k: readonly number[], waves: number[], t0: number, t1: number): number {
  const sel: number[] = [];
  for (let i = 0; i < k.length; i += K_STRIDE) if (waves.includes(k[i + 6] as number)) sel.push(...k.slice(i, i + K_STRIDE));
  let m = 0;
  for (let t = t0; t < t1; t += 0.0005) {
    let x = 0, y = 0, z = 0;
    for (let i = 0; i < sel.length; i += K_STRIDE) {
      const d = t - sel[i]!;
      const s = d < 0 ? sel[i + 1]! : sel[i + 2]!;
      const g = Math.exp((-d * d) / (2 * s * s));
      x += sel[i + 3]! * g; y += sel[i + 4]! * g; z += sel[i + 5]! * g;
    }
    m = Math.max(m, Math.hypot(x, y, z));
  }
  return m;
}
const QRS = [WAVE.Q, WAVE.R, WAVE.S];
const fp = (seed: number) => morphBeat({ patientSeed: seed, morphologyVariation: 1 });
const pOf = (seed: number, mv: number) => applyPMorphology(pWaveKernels(), mergeModifiers(defaultModifiers(), { patientSeed: seed, morphologyVariation: mv }));

describe('Stage 5.1 per-patient fingerprint (Squiggler-style)', () => {
  const base = morphBeat({});
  const baseQrs = beatQrs(base, fiducialOf(base)).ms;
  const seeds = Array.from({ length: 30 }, (_, i) => i + 1);

  it('bounds over 30 patients: P/QRS/T amplitude and QRS width within ±10 %, frontal axis within ±15° of the textbook beat, and the full range is used', () => {
    const ax: number[] = [];
    for (const s of seeds) {
      const k = fp(s);
      const qa = spatialPeak(k, QRS, -0.05, 0.25) / spatialPeak(base, QRS, -0.05, 0.25);
      const ta = spatialPeak(k, [WAVE.T], 0.1, 0.6) / spatialPeak(base, [WAVE.T], 0.1, 0.6);
      const pa = spatialPeak(pOf(s, 1), [WAVE.P], 0, 0.15) / spatialPeak(pOf(s, 0), [WAVE.P], 0, 0.15);
      for (const a of [qa, ta, pa]) expect(Math.abs(a - 1)).toBeLessThanOrEqual(0.1 + 1e-9);
      expect(Math.abs(beatQrs(k, fiducialOf(k)).ms / baseQrs - 1)).toBeLessThanOrEqual(0.1 + 0.01);
      ax.push(frontalAxisDeg(k) - frontalAxisDeg(base));
    }
    expect(Math.max(...ax.map(Math.abs))).toBeLessThanOrEqual(15.5);
    expect(Math.max(...ax) - Math.min(...ax)).toBeGreaterThan(15); // patients really differ in axis
  });

  it('two patients differ visibly (lead II beats differ by ≥ 0.05 mV somewhere), each patient is identical beat to beat and run to run', () => {
    const lead2 = (k: number[]) => Array.from({ length: 300 }, (_, i) => kernelLead(k, 'ecgII', i / 500 - 0.1));
    for (const [a, b] of [[1, 2], [3, 4], [5, 6], [7, 8]] as const) {
      const A = lead2(fp(a));
      const B = lead2(fp(b));
      expect(Math.max(...A.map((v, i) => Math.abs(v - B[i]!)))).toBeGreaterThanOrEqual(0.05);
    }
    expect(fp(7)).toEqual(fp(7));
    const run = () => samples5('sinus', 10, ['ecgII'], { seed: 4, mods: { patientSeed: 7, morphologyVariation: 1 } }).lead.ecgII!;
    expect(Array.from(run())).toEqual(Array.from(run()));
    expect(morphBeat({ patientSeed: 99, morphologyVariation: 0 })).toEqual(base);
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s51/fingerprint.test.ts`
Expected: FAIL in the bounds case (a Stage 5 amplitude or axis beyond ±10 % / ±15°).

- [x] **Step 3: Factor out the axis solver**

In `packages/engine-core/src/l2/ecg/morphology/conduction.ts`, replace this block (it occurs exactly once):

```ts
  const target = mods.axisDeg;
  if (target === null || !info.supra) return k;
  const wrap = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;
  const err = (deg: number) => {
    const c = k.slice();
    rotateZSel(c, (deg * Math.PI) / 180, QRS_T);
    return Math.abs(wrap(target - frontalAxisDeg(c)));
```

with:

```ts
  const target = mods.axisDeg;
  if (target === null || !info.supra) return k;
  return rotateZSel(k, solveAxisRad(k, target), QRS_T);
};

/** The frontal rotation (rad) of QRS and T that makes the measured frontal axis of k equal `target` degrees. */
export function solveAxisRad(k: readonly number[], target: number): number {
  const wrap = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;
  const err = (deg: number) => {
    const c = [...k];
    rotateZSel(c, (deg * Math.PI) / 180, QRS_T);
    return Math.abs(wrap(target - frontalAxisDeg(c)));
```

In `packages/engine-core/src/l2/ecg/morphology/conduction.ts`, replace this block (it occurs exactly once):

```ts
    else lo = m1;
  }
  return rotateZSel(k, (((lo + hi) / 2) * Math.PI) / 180, QRS_T);
};

/** Default precordial transition of the Stage 1 template (V3–V4) and the horizontal rotation per lead [ENG]. */
```

with:

```ts
    else lo = m1;
  }
  return (((lo + hi) / 2) * Math.PI) / 180;
}

/** Default precordial transition of the Stage 1 template (V3–V4) and the horizontal rotation per lead [ENG]. */
```

- [x] **Step 4: Replace the fingerprint**

Create (or replace) `packages/engine-core/src/l2/ecg/morphology/individuality.ts` with exactly:

```ts
// Per-patient morphology fingerprint (brief §5 "Individuality: patientSeed, morphologyVariation"; research 04 §5,
// Squiggler's "every patient drawn has an ECG fingerprint of their own"). Stage 5.1 bounds (at mv = 1): P, QRS and T
// amplitude ±10 %, P, QRS and T width ±10 %, measured frontal QRS axis ±15° from the textbook beat. A stable
// function of patientSeed (its own PRNG copy, never the engine's streams); mv = 0 leaves the textbook beat untouched.
import { createRngState, uniform } from '../../../rng/sfc32.ts';
import { K_STRIDE, WAVE } from '../kernels.ts';
import type { Modifiers } from '../../../types.ts';
import type { MorphStage, PStage } from './index.ts';
import { QRS_T, solveAxisRad } from './conduction.ts';
import { QRS_WAVES, frontalAxisDeg, rotateZSel, stretchQrs } from './ops.ts';

export const FP_AMP = 0.1;
export const FP_WIDTH = 0.1;
export const FP_AXIS_DEG = 15;

export interface Fingerprint {
  amp: { p: number; qrs: number; t: number }; // fractional, in [−FP_AMP, FP_AMP]
  width: { p: number; qrs: number; t: number }; // fractional, in [−FP_WIDTH, FP_WIDTH]
  axisDeg: number; // in [−FP_AXIS_DEG, FP_AXIS_DEG]
}

const cache = new Map<number, Fingerprint>();

export function fingerprint(seed: number): Fingerprint {
  let f = cache.get(seed);
  if (!f) {
    const s = createRngState(seed).scenario; // a private copy: never touches the engine's streams
    const u = () => 2 * uniform(s) - 1;
    f = {
      amp: { p: FP_AMP * u(), qrs: FP_AMP * u(), t: FP_AMP * u() },
      width: { p: FP_WIDTH * u(), qrs: FP_WIDTH * u(), t: FP_WIDTH * u() },
      axisDeg: FP_AXIS_DEG * u(),
    };
    cache.set(seed, f);
  }
  return f;
}

function scaleVec(k: number[], i: number, a: number): void {
  for (let j = 3; j < 6; j++) k[i + j] = (k[i + j] as number) * a;
}

export const individualityStage: MorphStage = (k, _info, mods) => {
  const mv = mods.morphologyVariation;
  if (mv === 0) return k;
  const fp = fingerprint(mods.patientSeed);
  for (let i = 0; i < k.length; i += K_STRIDE) {
    const w = k[i + 6] as number;
    if (QRS_WAVES.has(w)) scaleVec(k, i, 1 + fp.amp.qrs * mv);
    else if (w === WAVE.T || w === WAVE.U) {
      scaleVec(k, i, 1 + fp.amp.t * mv);
      if (w === WAVE.T) {
        k[i + 1] = (k[i + 1] as number) * (1 + fp.width.t * mv);
        k[i + 2] = (k[i + 2] as number) * (1 + fp.width.t * mv);
      }
    }
  }
  stretchQrs(k, 1 + fp.width.qrs * mv);
  // ±15° of MEASURED frontal axis (the VCG-rotation → axis map is non-linear, so solve it as axisStage does; ≈ 0.03 ms)
  return rotateZSel(k, solveAxisRad(k, frontalAxisDeg(k) + fp.axisDeg * mv), QRS_T);
};

export const pIndividualityStage: PStage = (k, mods: Modifiers) => {
  const mv = mods.morphologyVariation;
  if (mv === 0) return k;
  const fp = fingerprint(mods.patientSeed);
  for (let i = 0; i < k.length; i += K_STRIDE) {
    scaleVec(k, i, 1 + fp.amp.p * mv);
    k[i + 1] = (k[i + 1] as number) * (1 + fp.width.p * mv);
    k[i + 2] = (k[i + 2] as number) * (1 + fp.width.p * mv);
  }
  return k;
};
```

- [x] **Step 5: Update the Stage 5 individuality case**

In `packages/engine-core/test/l2/ecg/s5/morph-individuality.test.ts`, replace this block (it occurs exactly once):

```ts
  };

  it('same patientSeed → identical morphology across rhythm steps; different seeds differ (r < 0.99)', () => {
    const p = (seed: number) => beat({ patientSeed: seed, morphologyVariation: 1 });
    expect(p(7)).toEqual(p(7));
```

with:

```ts
  };

  it('same patientSeed → identical morphology across rhythm steps; different seeds differ (Stage 5.1: by ≥ 0.05 mV in II)', () => {
    const p = (seed: number) => beat({ patientSeed: seed, morphologyVariation: 1 });
    expect(p(7)).toEqual(p(7));
```

In `packages/engine-core/test/l2/ecg/s5/morph-individuality.test.ts`, replace this block (it occurs exactly once):

```ts
    };
    expect(shape(a.st.events.at(-1)!.k)).toEqual(shape(b.st.events.at(-1)!.k));
    for (const [s1, s2] of [[1, 2], [3, 4], [5, 6]]) expect(corr(lead2(p(s1!)), lead2(p(s2!)))).toBeLessThan(0.99);
    expect(beat({ patientSeed: 99, morphologyVariation: 0 })).toEqual(base);
  });
```

with:

```ts
    };
    expect(shape(a.st.events.at(-1)!.k)).toEqual(shape(b.st.events.at(-1)!.k));
    for (const [s1, s2] of [[1, 2], [3, 4], [5, 6]]) {
      const a = lead2(p(s1!));
      const b = lead2(p(s2!));
      expect(corr(a, b)).toBeLessThan(0.9999);
      expect(Math.max(...a.map((v, i) => Math.abs(v - b[i]!)))).toBeGreaterThanOrEqual(0.05);
    }
    expect(beat({ patientSeed: 99, morphologyVariation: 0 })).toEqual(base);
  });
```

- [x] **Step 6: Run the morphology tests**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s51/fingerprint.test.ts test/l2/ecg/s5`
Expected: PASS.

- [x] **Step 7: Commit and push**

```bash
git add packages/engine-core/src/l2/ecg/morphology/conduction.ts packages/engine-core/src/l2/ecg/morphology/individuality.ts packages/engine-core/test/l2/ecg/s51/fingerprint.test.ts packages/engine-core/test/l2/ecg/s5/morph-individuality.test.ts
git commit -m "feat(ecg): per-patient fingerprint bounded to ±10 % amplitude/width and ±15° axis"
git push
```

---

### Task 13: Strips: 1 mm grid, selective regeneration, before/after pairs

Regenerate every strip this stage changes as `<key>-after.png` beside the `<key>-before.png` copies from Task 1, and look at every pair. The strip renderer gains a faint 1 mm minor grid (4 px at 25 mm/s), so 1–3 mm ST and J changes can be read off the image (Stage 5 strips had only 5 mm lines). The shots script gains `ONLY` (comma-separated catalogue keys) and `SUFFIX` (file-name suffix) environment variables. Strips stay ≤ 50 KB (prototype: largest `cpr-after.png` 44.6 KB). If one exceeds 50 KB, darken the minor grid colour `#0f170f` → `#0c120c` and rerun; record it.

**Files:**
- Modify: `apps/demo/src/strip.ts`, `apps/demo/scripts/stage5-shots.ts`
- Create: `docs/gates/stage-5.1/<key>-after.png` × 22

**Interfaces:**
- Consumes: every earlier task; `CATALOGUE` (`apps/demo/src/stage5-catalogue.ts`, STEMI entries changed in Task 7).
- Produces: 22 before/after pairs for the gate note (Task 15).

- [x] **Step 1: Minor grid and the ONLY/SUFFIX switches**

In `apps/demo/src/strip.ts`, replace this block (it occurs exactly once):

```ts
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, 2 * LANE_H);
  g.strokeStyle = '#1d2a1d';
  g.lineWidth = 1;
  for (let x = 0; x <= w; x += 20) {
    g.beginPath();
```

with:

```ts
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, 2 * LANE_H);
  // Stage 5.1: faint 1 mm minor grid (4 px) so 1–3 mm ST/J changes can be read off the strip
  g.strokeStyle = '#0f170f';
  g.lineWidth = 1;
  for (let x = 0; x <= w; x += 4) {
    g.beginPath();
    g.moveTo(x + 0.5, 0);
    g.lineTo(x + 0.5, 2 * LANE_H);
    g.stroke();
  }
  for (let y = 0; y <= 2 * LANE_H; y += 4) {
    g.beginPath();
    g.moveTo(0, y + 0.5);
    g.lineTo(w, y + 0.5);
    g.stroke();
  }
  g.strokeStyle = '#1d2a1d';
  for (let x = 0; x <= w; x += 20) {
    g.beginPath();
```

In `apps/demo/scripts/stage5-shots.ts`, replace this block (it occurs exactly once):

```ts
// system Google Chrome (docs/gates/stage-1.md: the Playwright browser CDN is not reachable here), each ≤ 50 KB.
// Usage (repo root): node --experimental-strip-types apps/demo/scripts/stage5-shots.ts [outDir]
import { mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
```

with:

```ts
// system Google Chrome (docs/gates/stage-1.md: the Playwright browser CDN is not reachable here), each ≤ 50 KB.
// Usage (repo root): node --experimental-strip-types apps/demo/scripts/stage5-shots.ts [outDir]
// Stage 5.1: ONLY=key1,key2 limits the run to those catalogue keys; SUFFIX=-after names files <key>-after.png.
import { mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
```

In `apps/demo/scripts/stage5-shots.ts`, replace this block (it occurs exactly once):

```ts
const page = await browser.newPage({ viewport: { width: 1040, height: 340 }, deviceScaleFactor: 1 });
const failures: string[] = [];
try {
  for (const item of CATALOGUE) {
    await page.goto(`http://localhost:5205/stage5.html?strip=${item.key}`);
    await page.waitForFunction(() => document.body.dataset.ready !== undefined, undefined, { timeout: 60_000 });
    const file = resolve(out, `${item.key}.png`);
    await page.locator('#strip').screenshot({ path: file });
    const bytes = statSync(file).size;
```

with:

```ts
const page = await browser.newPage({ viewport: { width: 1040, height: 340 }, deviceScaleFactor: 1 });
const failures: string[] = [];
const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const items = CATALOGUE.filter((c) => only === null || only.has(c.key));
try {
  for (const item of items) {
    await page.goto(`http://localhost:5205/stage5.html?strip=${item.key}`);
    await page.waitForFunction(() => document.body.dataset.ready !== undefined, undefined, { timeout: 60_000 });
    const file = resolve(out, `${item.key}${process.env.SUFFIX ?? ''}.png`);
    await page.locator('#strip').screenshot({ path: file });
    const bytes = statSync(file).size;
```

In `apps/demo/scripts/stage5-shots.ts`, replace this block (it occurs exactly once):

```ts
  process.exit(1);
}
console.log(`${CATALOGUE.length} strips written to ${out}`);
```

with:

```ts
  process.exit(1);
}
console.log(`${items.length} strips written to ${out}`);
```

- [x] **Step 2: Typecheck the demo**

Run: `npx -y pnpm@9.15.9 --filter @pme/demo typecheck`
Expected: clean.

- [x] **Step 3: Check the demo presets use 3 mm for STEMI (brief task: "demo default 3 mm for inferior/anterior presets"). Expected: one line containing `mm: 3`. If it shows another value, change it to 3 in `apps/demo/src/stage5.ts`**

```bash
grep -n "STEMI \${t}" apps/demo/src/stage5.ts
```

- [x] **Step 4: Render the after strips (headless system Chrome, as Stage 5; the script starts its own Vite server on port 5205 — if that port is busy, change the two `5205`s in the script for this run only and revert)**

```bash
ONLY=vfCoarse,vfFine,vfEpinephrine,cpr,shock,vtPoly,torsades,rbbb,lbbb,pacAberrant,stemiInferior,stemiAnterior,hyperK,hyperKsine,osborn,tcpCapture,tcpNoCapture,pacedVVI,pacedDDD,failureToCapture,individualityA,individualityB SUFFIX=-after node --experimental-strip-types apps/demo/scripts/stage5-shots.ts docs/gates/stage-5.1
ls docs/gates/stage-5.1/*-after.png | wc -l   # expected: 22
```

- [x] **Step 5: Look at every pair (open both PNGs of each key). Check, and write one line per key for the gate note: vfCoarse irregular from the first second, visible in V1; vtPoly V1 never flat; rbbb V1 r–S–tall R′, V6 broad S; lbbb V1 one broad trough, V6 notched R; STEMI ST plateau ≈ 3 small boxes in II/III/aVF (inferior) and V3 (anterior) with reciprocal depression in aVL / III; hyperKsine R–deep S–T oscillation with no flat ST; osborn visible J hump in II/V3 at 28 °C; tcpCapture/tcpNoCapture tall narrow spike + tail + white marker, capture complex broad; paced strips broader paced QRS. If a strip does not show what its label says, fix the cause (not the label) or record it for Ali's list (Task 14)**

- [x] **Step 6: Commit and push**

```bash
git add apps/demo/src/strip.ts apps/demo/scripts/stage5-shots.ts docs/gates/stage-5.1
git commit -m "docs(gates): stage 5.1 before/after strips; 1 mm grid"
git push
```

---

### Task 14: Ali's list — apply Ali's strip corrections

- [x] *Executed 2026-09-26: Ali's list is empty — PR #3 has 0 comments and 0 reviews, and `research/00-orchestrator-rulings.md` has no Ali strip items after G5-obs. Gate note says "none received by 2026-09-26"; the executor's own strip observations for Ali are in the gate note.*

**Clearly marked slot.** G5-obs asks Ali to page through the 85 Stage 5 strips on PR #3 and add to the polish list; his review is pending. Before starting this task, read the latest `research/00-orchestrator-rulings.md` (G5-obs and anything after it) and the PR #3 conversation (`gh pr view 3 --comments --repo samhv-dev/patient-monitor-engine`). If Ali's list is still empty, write "Ali's list: none received by <date>" in the gate note and skip to Task 15.

Each item becomes one sub-task, TDD as above, in this template (copy it once per item):

```markdown
#### Item A<n>: <strip key> — <Ali's words, verbatim, in quotes>

**Defect as measured:** <the number on the current strip that shows the defect, measured with test/helpers/s51.ts or a new helper — e.g. "V1 R′ 0.50 mV", "QRS 121 ms by tangent">
**Target:** <the measurable acceptance, e.g. "R′ ≥ 0.6 mV and ≥ 2 r"; cite research 03 § or Ali>
**Files:** <exact paths, all inside packages/engine-core/src/l2/ecg/**, templates/**, apps/demo/src/{stage5,strip,stage5-catalogue}.ts, apps/demo/stage5.html, docs/gates/stage-5.1/** — anything else is another stage's (R25): write a request instead>

- [ ] Step 1: Write the failing test in packages/engine-core/test/l2/ecg/s51/ali-<n>.test.ts (measure the waveform; never read a constant back)
- [ ] Step 2: Run it: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s51/ali-<n>.test.ts` — expected FAIL with <message>
- [ ] Step 3: Implement (smallest change; comment cites Ali + date, [ENG] for chosen constants)
- [ ] Step 4: Run it and `test/l2/ecg` — expected PASS
- [ ] Step 5: `cp docs/gates/stage-5/<key>.png docs/gates/stage-5.1/<key>-before.png` (if not already there) and `ONLY=<key> SUFFIX=-after node --experimental-strip-types apps/demo/scripts/stage5-shots.ts docs/gates/stage-5.1`; look at the pair
- [ ] Step 6: Commit `fix(ecg): <item> (Ali, PR #3 review)` and push
```

Items that are not morphology (a label, a catalogue seed, a missing strip) skip Steps 1–4. Items outside this stage's partition (renderer, alarms, pacer device, skins) go into the gate note's "Requests" table with the owner and a one-line reproduction.

---

### Task 15: Gate note, full verification, pull request

**Files:**
- Create: `docs/gates/stage-5.1.md`

- [ ] **Step 1: Full verification from a clean clone of the pushed branch (the Stage 5 procedure)**

```bash
rm -rf /tmp/pme-51-clean && git clone --branch stage-5.1-rhythm-polish "$(git remote get-url origin)" /tmp/pme-51-clean
cd /tmp/pme-51-clean
npx -y pnpm@9.15.9 install --frozen-lockfile
npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices
cd - && rm -rf /tmp/pme-51-clean
```

Expected: exit 0. Any long engine run added to a test must yield per sim-minute with `{ timeout: 300_000 }` (G2 CI lesson; the Stage 5.1 tests already do).

- [ ] **Step 2: Measure the numbers for the gate note with the tests' own computations (a temporary `test/l2/ecg/s51/zz-measure.test.ts` that prints them with `console.log`; delete it before committing)**: VF worst ACF / min and median bandwidth / V1 and V5 ratio ranges; vtPoly V1/II range; RBBB and LBBB tangent QRS, V1 R′ and S; ST at J+60 per territory index and reciprocal lead at 2 mm (diagnostic filter) and, for inferior, the monitor-filter value; K 8.5 QRS, T/R, trough; Osborn J II/V5 at 32/30/28 °C; paced QRS and slope ratio; TCP pulses per minute (demand and fixed), spike FWHM and amplitude; RSA correlation with the driver; fingerprint axis range.

- [ ] **Step 3: Write `docs/gates/stage-5.1.md` with these sections**, in the Stage 5 gate note's style:
  1. Gate question: "Do the G5-obs strips now show what their labels say, measured and by eye?"
  2. Check table: clean-clone command result; each acceptance item (1–8 of the brief) → test file › name → measured number.
  3. Before/after gallery: for each of the 22 keys, the before and after image side by side (`![before](stage-5.1/<key>-before.png) ![after](stage-5.1/<key>-after.png)`) and the one-line observation from Task 13 Step 5.
  4. Deviations: every anchor that needed adapting (Task 1 Step 2), the TCP artefact vs brief §6.5 wording ("wide, blunt 20–40 ms" → spike + tail), STEMI strips on the diagnostic filter, the bandwidth estimator floor (1.47 Hz), whether Task 11 Step 7 ran.
  5. Ali's list: the items applied (Task 14) or "none received".
  6. Requests to other stages (copy the table from this plan, with status).
  7. Sources consulted and the clean-room statement (no ECGSYN or GPL code opened).

- [ ] **Step 4: Commit, push, open the PR (do not merge — R21: the orchestrator merges after CI and gate inspection)**

```bash
git add docs/gates/stage-5.1.md
git commit -m "docs(gates): stage 5.1 gate evidence"
git push
gh pr create --base main --head stage-5.1-rhythm-polish --title "Stage 5.1: rhythm morphology polish (G5-obs, R30, R-S3-3)" --body-file docs/gates/stage-5.1.md
```

End the PR body with the line your session's attribution instructions give for pull requests. Report the PR URL.

---
