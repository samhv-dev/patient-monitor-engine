# Stage 5: Full Rhythm Library, Recorded Templates, Artefacts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every v1 rhythm (36 ids), PEA on any organised rhythm, implanted and transcutaneous pacing with markers and faults, the full modifier set (ectopy patterns, ST territories with emergent reciprocity, BBB/axis/LVH/voltage, K⁺ staging, hypothermia, long QT, Brugada, digoxin, alternans, overrides, per-patient individuality), the VF and AF-f-wave recorded-texture hybrids built from CUDB/MIT-BIH, and the full ECG artefact model (wander, mains, EMG/shiver, motion, lead-off, CPR, defibrillation, diathermy) — each with numeric tests — plus a `stage5.html` gallery/playground and strip screenshots.

**Architecture:** The Stage 1(.1) rhythm engine is split into small modules around a core planner (`rhythm-engine.ts`) with registries: atrial handlers (`atria.ts`, `atria-ectopic.ts`), focus handlers (`foci*.ts`), extra planner clocks (pacing, TCP, VF bookkeeping, lead-off), late-bound hooks (`HOOKS` in `rhythm-state.ts`, so feature modules never import the core), a morphology pipeline (`morphology/*`: pure stages on each beat's Gaussian-kernel list) and a generation seam (`ecg-gen.ts`: continuous VCG sources and per-lead front-end stages) that engine.ts calls in exactly two places. Chaotic signals are hybrids (brief §11 C1): recorded Int16 textures time-warped to a parametric dominant frequency under a parametric envelope, with an AR(2) fallback. Dataset tooling lives in `@pme/validation` (dev-only), writes NOTICE-ID'd TS modules into `packages/engine-core/templates/`.

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2, Vite 6.4, Node ≥ 22.12 (`--experimental-strip-types` for scripts), Playwright 1.63 with system Chrome for screenshots. No new dependencies.

**Spec:** `docs/DESIGN-BRIEF.md` §4.1 (ECG model, rhythm engine, special generators), §4.8 (k_rhythm), §5 (rhythm library, modifiers, artefacts, template provenance), §6.5 (pacer/shock artefact behaviour), §7.2–7.3 (command and event shapes), §8 (licence, NOTICES, datasets), §11 C1/C2. `docs/BUILD-PLAN.md` "Stage 5" (scope, demo, acceptance tests 1–10, gate question). Physiology: `../research/03-waveform-physiology-reference.md` §1 and §11. Datasets: `../research/02-open-source-and-academic.md` §D. Rulings: `../research/00-orchestrator-rulings.md` (R1–R20).

## Global Constraints

- **Base.** This plan was written and verified (every task applied in order, with its tests run) against Stage 1.1's branch tip `d0ebed2` (`stage-1.1-gate-fixes`: PR60 = 160 ms per R16, AV-node ERP, AF rate calibration, continuous flutter sawtooth per R18, T end = T peak + 2σ_fall, wide complexes 1.63×, cyrb53 vendored as NOTICES N-006). It must be executed on a `main` that contains Stage 1.1. Task 1 checks this. If a later commit changed a file this plan edits, an "In `file`, replace …" anchor may not match: open `git diff d0ebed2 origin/main -- <file>`, apply the plan's intent to the new text, and record it under "Deviations" in the gate document.
- Paths are relative to the Stage 5 worktree root (`/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/wt-stage-5`); run every command from there. pnpm is always `npx -y pnpm@9.15.9` (docs/gates/stage-1.md).
- Stage 0/1 constraints still apply: strict TS with `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `erasableSyntaxOnly` (no enums, no parameter properties), `.ts` import extensions, conventional commits, the commit trailer your session's attribution instructions give (Stages 0–1 used `Co-Authored-By: …`).
- No runtime dependencies in `@pme/engine-core`. Every physiological or engineering constant carries a comment citing the brief/research section, or `[ENG]`.
- **Clean room (R6, brief §8).** Do not open ECGSYN (any language), NeuroKit2's ECGSYN port, the PhysioNet ECG/PPG simulator, the WFDB library sources, Python Anesthesia Simulator, or any GPL/unlicensed repo. The WFDB readers are written from PhysioNet's format documents only: header(5) https://physionet.org/physiotools/wag/header-5.htm, signal(5) …/signal-5.htm, annot(5) …/annot-5.htm.
- **Datasets and licences (verified on the PhysioNet project pages, 2026-09-24).** CUDB v1.0.0 https://physionet.org/content/cudb/1.0.0/ — Open Data Commons Attribution License v1.0, DOI 10.13026/C2X59M, cite Nolle FM et al., CREI-GARD, Computers in Cardiology 13:515-518 (1986). MIT-BIH Arrhythmia v1.0.0 https://physionet.org/content/mitdb/1.0.0/ — ODC-By 1.0, DOI 10.13026/C2F305, cite Moody GB, Mark RG, IEEE Eng Med Biol 20(3):45-50 (2001). PTB-XL v1.0.3 https://physionet.org/content/ptb-xl/1.0.3/ — CC BY 4.0, DOI 10.13026/kfzx-aw45, cite Wagner P et al. (2022). Files are fetched from `https://physionet.org/files/<project>/<version>/…` and checked against that project's `SHA256SUMS.txt` (CUDB, MIT-BIH). Raw records never enter git: the cache is `packages/validation/datasets/cache/` (already in `.gitignore`).
- **Bundled templates.** ODC-By allows redistribution of derived data with attribution, so the extracted VF/AF textures are committed as TypeScript modules (`packages/engine-core/templates/*.ts`, ≈ 65 KB + 44 KB: base64 Int16, 500 Hz, unit RMS × 4096). Their first line is `// NOTICE-ID: N-0xx`, followed by source, licence, citation and the list of changes; the matching `NOTICES.md` row is added in the same commit (`pnpm check-notices` enforces it). A TS module rather than a binary file keeps the IIFE single-file and lets Node, Vitest and Vite import it without loaders.
- **NOTICE IDs N-050…N-059 are reserved for Stage 5** (N-050 CUDB VF, N-051 MIT-BIH AF, N-052 PTB-XL report). Stages 2 and 6a add NOTICES rows concurrently from N-007 upward; separate blocks avoid a collision.
- Test commands: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run <path>` (same with `@pme/validation`). Full: `npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices`.

## Parallel-work rules (binding)

Stages 2 (haemodynamics) and 6a (controllers) run at the same time on their own branches.

- **Stage 5 owns:** `packages/engine-core/src/l2/ecg/**`, `packages/engine-core/templates/**`, `packages/engine-core/src/modifiers.ts`, `packages/engine-core/src/util/dsp.ts`, `packages/validation/src/templates/**` and its tests, `apps/demo/stage5.html`, `apps/demo/src/{stage5,strip,stage5-catalogue}.ts`, `apps/demo/scripts/stage5-shots.ts`, `docs/gates/stage-5*`.
- **Do not touch** `l1/**`, `l2/hemo/**`, `l2/pleth/**`, `l3/**`, `packages/renderer/**`, `packages/audio/**`, `packages/controller/**`, other demo pages.
- **Shared files, minimal and isolated hunks only (expect trivial merge conflicts, list them in the PR):** `engine.ts` — Task 4 only (7 hunks: two imports, the removed `MOD_KEYS`, the `generateVcg` call, the lane and detection projections, the `setModifiers` validate and apply cases); `types.ts` — Task 3 (the rhythm/modifier types become a re-export block; three EngineEvent variants copied verbatim from brief §7.3: `rhythmSegment`, `marker`, `alarm`) and Task 4 (`setModifiers.modifiers: ModifiersPatch`); `index.ts` — Task 24 (one export line); `NOTICES.md` — Tasks 15 and 25 (append rows); `apps/demo/vite.config.ts` — Task 26 (one input entry); `test/engine/engine-commands.test.ts` — Task 4 (two expectations that named Stage 5 features as "not implemented").
- **Contract with Stage 2 (and Stage 4):** beat events keep `{ type: 'beat', t, seq, origin, template, qrsMs, qtMs, prMs?, mech: { perfused, kSV, svMl, lvetMs } }`. `mech.perfused === false ⇔ mech.kSV === 0`, and that is how PEA (`RhythmOpts.pulseless: true` on any rhythm), VF, agonal beats and too-early PVCs reach the haemodynamics. PVC beats keep `template: 'pvc'` whatever their focus. Paced beats have `origin: 'paced'`, template `'pacedV'`. Pace pulses are `marker` events (`kind: 'paceSpike'`, `data: { chamber: 1 (atrial) | 2 (ventricular), captured, tcp, mA? }`). Stage 4's devices drive the ECG through modifiers this stage defines: `tcp` (pacer), `artefact.shock` (defibrillator), `artefact.cpr` (CPR), `epinephrineAtS` (drug), `k`/`tempC` (until L1 exposes them).

## Decisions this plan makes where the spec was silent or inconsistent

1. **No engine.ts growth per feature.** Everything new is reached through two seams (`generateEcg` for continuous VCG sources, `ecgFrontEnd` for per-lead effects) and the rhythm table, so later ECG work never edits engine.ts again.
2. **Rhythm ids:** the brief §5 list plus `mat` (task scope; research 03 §1.5 row "MAT" is implied by "multifocal"). Mobitz II variants are three ids: `avb2Mobitz2` (n:n−1, `groupSize`), `avb2to1`, `avbHighGrade` (`ratio` 3 or 4). Pacing faults are `RhythmOpts.pacer.fault`, not separate ids. PEA is `RhythmOpts.pulseless` (brief §5).
3. **VF amplitude A** is the peak-to-peak-equivalent 2√2·RMS in lead II (so the coarse/fine split at 0.2 mV and the A0 0.6–1.0 mV range are testable); vfCoarse starts at A0 = 0.8 mV, vfFine starts as if decayed to 0.15 mV. CPR slows the amplitude clock by τ_noCPR/τ_CPR = 7/17.5 and adds a 0.75 Hz boost with a 30 s lag; epinephrine is a sin² bump (+30% A, +0.5 Hz, 180 s). The asystole hazard uses the `outcome` PRNG stream (seeded once per episode).
4. **VF texture source is CUDB only.** MIT-BIH contains ventricular flutter (record 207) but no annotated VF; it supplies the AF f-wave textures instead (records 201–222, QRST cancellation by mean-beat subtraction). Selection is deterministic (windows listed in Task 15).
5. **PTB-XL refit is not done** (ruling R17 fixes lead ratios "as implemented"); Task 25 records per-lead correlations only.
6. **ST reciprocity is emergent:** one injury vector per territory, projected through Dower/Einthoven; `reciprocal` is therefore always "auto".
7. **Lead-off** flattens every lane and the detection lead and emits `alarm { category: 'technical', id: 'ecgLeadsOff', text: 'ECG LEADS OFF' }` on change. Stage 4's alarm manager may re-map priority/text.
8. **Pace spikes are markers, not samples** (research 03 §1.7); the TCP pad artefact (20–40 ms blunt deflection) is in the samples.
9. **Shock recovery:** rail ±5 mV for 50–500 ms (energy-scaled), then a 1–3 mV offset decaying with τ 0.5–1.0 s per lead (hash of lead and shock time), so the baseline is back within 5 s (brief §6.5) and every lead differs.
10. **Individuality** defaults to `morphologyVariation = 0`, so textbook morphology and every Stage 1 test value stay unchanged unless a scenario asks for variation.
11. **Engine-level `vocabulary()` and `commandApplied`** (BUILD-PLAN Stage 5 bullets) need engine.ts/MonitorEngine changes that belong to Stage 6's owner; this stage ships `ecgVocabulary()` for it.
12. **Blind rhythm check** is supported by the demo (30 random unlabelled strips with a reveal); Ali performs it at the gate.

## Prototype results (while planning, 2026-09-24; all in the planning scratchpad, nothing committed)

- VF texture: 6 CUDB windows pass the filters (organisation 0.68–0.72, f_dom 4.4–5.9 Hz). Time-warped playback over 11 min, 5 seeds: dominant frequency within ±0.3 Hz of f_dom(t) at 0/4/10 min; unit RMS kept across crossfades. Least-organised windows were rejected — their spectra were bimodal or dominated by < 2.5 Hz content and the warp missed by up to 3 Hz.
- ST territories on the VCG at 2 mm: anterior V2 +0.17 / V3 +0.20 mV with III −0.12, aVF −0.10; inferior III +0.20, aVF +0.17, II +0.14 with aVL −0.13.
- Dataset scripts: every URL above resolved (HTTP 200); SHA-256 verified for all CUDB and MIT-BIH files used; AF extraction yields 4 clean windows (f-wave RMS 0.016–0.028 mV, 5.1–6.6 Hz, peak/RMS < 3.2). PTB-XL: 10 NORM records gave mean per-lead r 0.20 (aVL) to 0.90 (V5/V6).
- The finished code: 236 engine-core tests, 16 validation tests, all packages typecheck, `check-notices: OK (3 governed files)`, 70 strip screenshots 6–29 KB each.

## File map

| Path | Responsibility |
|---|---|
| `packages/engine-core/src/l2/ecg/api-types.ts` | Public ECG types (RhythmId, RhythmOpts, Modifiers, specs) |
| `…/l2/ecg/modifier-schema.ts`, `src/modifiers.ts` | Defaults, merge, validation |
| `…/l2/ecg/rhythms.ts` | 36-row rhythm table |
| `…/l2/ecg/rhythm-state.ts` | State, PendingV, FWave, ctx, HOOKS |
| `…/l2/ecg/rhythm-engine.ts` | Planner core: apply, activate, escape, planUntil, extra clocks |
| `…/l2/ecg/atria.ts`, `atria-ectopic.ts` | Atrial modes, AV-node conduction (`conductP`, `conductAt`), AF junction |
| `…/l2/ecg/foci.ts`, `foci-junctional.ts`, `foci-ventricular.ts` | Focus registry and handlers |
| `…/l2/ecg/ectopy.ts` | PVC/PAC/PJC |
| `…/l2/ecg/mech.ts` | k_rhythm, PEA |
| `…/l2/ecg/beat-templates.ts` | Stage 5 QRS-T templates, fiducial, rotation |
| `…/l2/ecg/pacing.ts`, `tcp.ts` | Implanted pacing, TCP |
| `…/l2/ecg/texture.ts`, `arrest/vf.ts`, `af-texture.ts` | Texture player, VF hybrid, AF texture |
| `…/l2/ecg/morphology/{index,ops,st,conduction,electrolytes,individuality}.ts` | Morphology pipeline |
| `…/l2/ecg/artefacts/{body,front-end,lead-off}.ts` | Artefacts |
| `…/l2/ecg/ecg-gen.ts` | Generation seam |
| `…/l2/ecg/vocabulary.ts` | ecgVocabulary() |
| `packages/engine-core/src/util/dsp.ts` | FFT/Welch/dominant frequency |
| `packages/engine-core/templates/{vf-cudb,af-mitdb}.ts` | Generated, NOTICE-ID'd templates |
| `packages/validation/src/templates/*` | WFDB readers, fetch, extraction, PTB-XL report |
| `apps/demo/{stage5.html,src/stage5.ts,src/strip.ts,src/stage5-catalogue.ts,scripts/stage5-shots.ts}` | Demo and screenshots |
| `docs/gates/stage-5.md`, `docs/gates/stage-5/` | Gate evidence |

---

### Task 1: Worktree, branch and baseline

Create the Stage 5 branch in its own git worktree (three stages run in parallel on this repo), install, and record the baseline.

**Files:**
- Create: worktree `../scratch/wt-stage-5` (git-ignored by the workspace, Tier C) on branch `stage-5-rhythm-library`
- Create: `docs/plans/stage-5-rhythm-library.md` (this file, committed onto the branch)

**Interfaces:**
- Consumes: `main` with Stage 1.1 merged.
- Produces: a clean worktree where every later command runs.

- [x] **Step 1: Create the worktree from `main` (never work in the shared `repo/` checkout — Stage 2 and Stage 6a use it concurrently)**

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin
git worktree add ../scratch/wt-stage-5 -b stage-5-rhythm-library origin/main
cd ../scratch/wt-stage-5
npx -y pnpm@9.15.9 install --frozen-lockfile
```

- [x] **Step 2: Check that `main` contains Stage 1.1 (the plan is verified against its tip `d0ebed2`). Expected: both greps print a line. If either prints nothing, Stage 1.1 is not merged yet: stop and report back instead of continuing**

```bash
grep -n "DEFAULT_PR60_MS = 160" packages/engine-core/src/l2/ecg/intervals.ts
grep -n "AV_NODE_ERP_S = 0.25" packages/engine-core/src/l2/ecg/rhythm-engine.ts
git log --oneline -3
```

- [x] **Step 3: See what changed on `main` since the verified base in the files this plan edits in place (not the ones it creates). If this lists anything, read those hunks now; when a later "replace" anchor does not match, apply the plan's intent to the new text and note it in the gate document**

```bash
git diff d0ebed2 HEAD --stat -- packages/engine-core/src/engine.ts packages/engine-core/src/types.ts packages/engine-core/src/index.ts packages/engine-core/src/l2/ecg/rhythm-engine.ts packages/engine-core/src/l2/ecg/rhythms.ts packages/engine-core/src/l2/ecg/kernels.ts packages/engine-core/src/l2/ecg/templates.ts packages/engine-core/src/l2/ecg/generator.ts packages/engine-core/test/engine/engine-commands.test.ts apps/demo/vite.config.ts packages/validation/package.json
```

- [x] **Step 4: `rhythm-engine.ts`, `rhythms.ts` and `modifiers.ts` are REPLACED by Task 3 (their Stage 1.1 behaviour — AV-node ERP, AF rate calibration, continuous flutter, focus reset on capture, finite-time guard — is already carried into the new modules). If the diff above shows later changes to them, port those changes into the new `atria.ts` / `rhythm-engine.ts` / `rhythms.ts` by hand after Task 3.**

- [x] **Step 5: Baseline: everything green before touching anything**

```bash
npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 check-notices
```

- [x] **Step 6: Copy this plan into the worktree (it was written into the shared checkout as an untracked file) and commit it**

```bash
cp /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo/docs/plans/stage-5-rhythm-library.md docs/plans/
git add docs/plans/stage-5-rhythm-library.md
git commit -m "docs(plan): stage 5 rhythm library plan"
```

---

### Task 2: Wave codes and Stage 5 beat templates

New kernel wave codes (delta, ST, J, artefact) and every new QRS-T template: WPW (delta wave), aberrant (RBBB-shaped), RV-paced, two extra PVC foci, agonal; a generic R-peak fiducial and a frontal-plane rotation.

**Files:**
- Modify: `packages/engine-core/src/l2/ecg/kernels.ts` (WAVE codes, qrsSpanMs counts DELTA)
- Create: `packages/engine-core/src/l2/ecg/beat-templates.ts`
- Test: `packages/engine-core/test/l2/ecg/s5/beat-templates.test.ts`

**Interfaces:**
- Consumes: Stage 1 `kernels.ts` (`kernel`, `K_STRIDE`, `qrsSpanMs`), `templates.ts` (`narrowKernels`, `templateKernels`, `VEC`, `T_END_AFTER_PEAK_S`, `WIDE_QT_EXTRA_MS`, `TemplateId`).
- Produces: `WAVE.DELTA = 8, WAVE.ST = 9, WAVE.J = 10, WAVE.ART = 11`; `type BeatTemplateId = TemplateId | 'wpw' | 'aberrant' | 'pacedV' | 'pvc2' | 'pvc3' | 'agonal'`; `beatKernels(id, qtMs, scale = 1, pre = 1): number[]`; `wpwKernels(qtMs, scale?, pre?)`; `fiducialOf(k): number` (s); `beatQrsMs(id, pre?)`; `rotateZ(k, rad): number[]` (in place); constants `RBBB_RPRIME_VEC`, `WPW_PR_MS = 100`, `DELTA_S = 0.035`.

- [x] **Step 1: Write the failing test**

Create or replace `packages/engine-core/test/l2/ecg/s5/beat-templates.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { beatKernels, beatQrsMs, fiducialOf, rotateZ, type BeatTemplateId } from '../../../../src/l2/ecg/beat-templates.ts';
import { K_STRIDE, WAVE, qrsSpanMs } from '../../../../src/l2/ecg/kernels.ts';
import { projectLead } from '../../../../src/l2/ecg/vcg.ts';

const rVec = (id: BeatTemplateId) => {
  const k = beatKernels(id, 400);
  const i = k.findIndex((_, j) => j % K_STRIDE === 6 && k[j] === WAVE.R) - 6;
  return [k[i + 3]!, k[i + 4]!, k[i + 5]!] as const;
};

describe('Stage 5 beat templates', () => {
  it('QRS widths: wpw 110–130, aberrant 125–145, pacedV 140–180, pvc2/pvc3 120–200, agonal ≥ 200 ms', () => {
    expect(beatQrsMs('wpw')).toBeGreaterThanOrEqual(110);
    expect(beatQrsMs('wpw')).toBeLessThanOrEqual(130);
    expect(beatQrsMs('aberrant')).toBeGreaterThanOrEqual(125);
    expect(beatQrsMs('aberrant')).toBeLessThanOrEqual(145);
    expect(beatQrsMs('pacedV')).toBeGreaterThanOrEqual(140);
    expect(beatQrsMs('pacedV')).toBeLessThanOrEqual(180);
    for (const id of ['pvc2', 'pvc3'] as const) {
      expect(beatQrsMs(id)).toBeGreaterThanOrEqual(120);
      expect(beatQrsMs(id)).toBeLessThanOrEqual(200);
    }
    expect(beatQrsMs('agonal')).toBeGreaterThanOrEqual(200);
    expect(beatQrsMs('wpw', 0.4)).toBeLessThan(beatQrsMs('wpw', 1.8));
    expect(qrsSpanMs(beatKernels('narrow', 400))).toBe(beatQrsMs('narrow'));
  });

  it('paced QRS has a superior axis (negative in II, positive in I, QS in V1); PVC foci point different ways', () => {
    const p = rVec('pacedV');
    expect(projectLead('ecgII', ...p)).toBeLessThan(-0.5);
    expect(projectLead('ecgI', ...p)).toBeGreaterThan(0.5);
    expect(projectLead('V1', ...p)).toBeLessThan(-0.5);
    expect(projectLead('V1', ...rVec('pvc2'))).toBeGreaterThan(0.5);
    expect(projectLead('ecgII', ...rVec('pvc3'))).toBeLessThan(-0.5);
    expect(projectLead('ecgII', ...rVec('wide'))).toBeGreaterThan(0.5);
  });

  it('fiducialOf is the τ of the largest R; rotateZ keeps vector norms', () => {
    expect(fiducialOf(beatKernels('narrow', 400))).toBeCloseTo(0.04, 9);
    expect(fiducialOf(beatKernels('wpw', 400))).toBeCloseTo(0.075, 9);
    const k = beatKernels('wide', 400);
    const n0 = Math.hypot(k[3]!, k[4]!, k[5]!);
    rotateZ(k, 1.1);
    expect(Math.hypot(k[3]!, k[4]!, k[5]!)).toBeCloseTo(n0, 12);
  });
});
```


- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s5/beat-templates.test.ts`

Expected: FAIL — cannot resolve `../../../../src/l2/ecg/beat-templates.ts`.

- [x] **Step 3: Implement**

In `packages/engine-core/src/l2/ecg/kernels.ts`, replace:

```ts
export const WAVE = { P: 0, Q: 1, R: 2, S: 3, T: 4, U: 5, F: 6, RETRO_P: 7 } as const;
```

with:

```ts
export const WAVE = { P: 0, Q: 1, R: 2, S: 3, T: 4, U: 5, F: 6, RETRO_P: 7, DELTA: 8, ST: 9, J: 10, ART: 11 } as const;
```

In `packages/engine-core/src/l2/ecg/kernels.ts`, replace:

```ts
/** QRS span of a kernel list: from the earliest Q/R/S τ − 2.5σ to the latest τ + 2.5σ, in ms [ENG]. */
```

with:

```ts
/** QRS span of a kernel list: from the earliest Q/R/S/delta τ − 2.5σ to the latest τ + 2.5σ, in ms [ENG]. */
```

In `packages/engine-core/src/l2/ecg/kernels.ts`, replace:

```ts
    if (w !== WAVE.Q && w !== WAVE.R && w !== WAVE.S) continue;
```

with:

```ts
    if (w !== WAVE.Q && w !== WAVE.R && w !== WAVE.S && w !== WAVE.DELTA) continue;
```

Create or replace `packages/engine-core/src/l2/ecg/beat-templates.ts` with exactly:

```ts
// Stage 5 beat templates, layered on the Stage 1 ones in templates.ts (which stays untouched).
// Vectors are VCG (X, Y, Z) in mV through the Dower rows (vcg.ts). Values are [ENG] unless cited; the lead
// projections quoted in comments are what the numbers produce and what the tests check.
import { K_STRIDE, WAVE, kernel, qrsSpanMs } from './kernels.ts';
import { narrowKernels, templateKernels, tEndAfterPeakS, WIDE_QT_EXTRA_MS, VEC, type TemplateId } from './templates.ts';
import type { Vec3 } from './vcg.ts';

export type BeatTemplateId = TemplateId | 'wpw' | 'aberrant' | 'pacedV' | 'pvc2' | 'pvc3' | 'agonal';

/** RBBB terminal R′ (V1 +0.51 mV, I −0.25 mV) at τ 85 ms, σ 16 ms → QRS ≈ 133 ms (brief §5 RBBB 133). */
export const RBBB_RPRIME_VEC: Vec3 = [-0.35, 0.05, -0.35];
/** PR (P onset → delta onset) for pre-excited conduction (research 03 §1.5: PR < 120 ms). */
export const WPW_PR_MS = 100;
/** Delta wave: 35 ms of slurred upstroke at full pre-excitation (research 03 §1.5: 30–60 ms). */
export const DELTA_S = 0.035;

/** RV-apical paced QRS: superior axis (II −0.83), I +0.81, QS in V1 (−1.15), QRS 150 ms (research 03 §1.7: 140–180). */
const PACED_VEC: Readonly<Record<'R' | 'S' | 'T', Vec3>> = {
  R: [0.9, -0.9, 0.6],
  S: [-0.15, 0.1, -0.1],
  T: [-0.35, 0.3, -0.25],
};
/** Second and third PVC foci (multifocal PVCs, research 03 §1.5): LV origin (RBBB-like, V1 +1.28) and superior axis (II −1.05). */
const PVC_FOCI: Readonly<Record<'pvc2' | 'pvc3', Readonly<Record<'R' | 'S' | 'T', Vec3>>>> = {
  pvc2: { R: [-0.5, 1.2, -0.9], S: [0.2, -0.3, 0.2], T: [0.25, -0.4, 0.35] },
  pvc3: { R: [0.8, -1.1, 0.5], S: [-0.2, 0.3, -0.1], T: [-0.3, 0.45, -0.2] },
};
/** Agonal complex: very wide (≈ 300 ms), low, bizarre (research 03 §1.5 "Agonal"). */
const AGONAL_VEC: Readonly<Record<'R' | 'S' | 'T', Vec3>> = {
  R: [0.45, 0.7, 0.4],
  S: [-0.2, -0.3, -0.15],
  T: [-0.2, -0.25, -0.15],
};

function wideFrom(v: Readonly<Record<'R' | 'S' | 'T', Vec3>>, qtMs: number, scale: number, r: [number, number], s: [number, number], tSig: [number, number]): number[] {
  const qt = (qtMs + WIDE_QT_EXTRA_MS) / 1000;
  return [
    ...kernel(r[0], r[1], r[1], v.R, WAVE.R, scale),
    ...kernel(s[0], s[1], s[1], v.S, WAVE.S, scale),
    ...kernel(qt - tEndAfterPeakS(tSig[1]), tSig[0], tSig[1], v.T, WAVE.T, scale),
  ];
}

/** Pre-excited QRS-T: a delta kernel from QRS onset, then the narrow complex shifted by DELTA_S·pre. pre 0.4–1.8. */
export function wpwKernels(qtMs: number, scale = 1, pre = 1): number[] {
  const d = DELTA_S * pre;
  const k = narrowKernels(qtMs, scale);
  for (let i = 0; i < k.length; i += K_STRIDE) {
    k[i] = (k[i] as number) + d;
    if (k[i + 6] === WAVE.T) for (let j = 3; j < 6; j++) k[i + j] = (k[i + j] as number) * (1 - 0.3 * Math.min(1, pre)); // secondary ST-T [ENG]
  }
  k.push(...kernel(d, d / 2.5, 0.012, VEC.R, WAVE.DELTA, 0.25 * scale * Math.min(1.5, pre)));
  return k;
}

/** Beat kernels relative to QRS onset. `pre` is used by 'wpw' only. */
export function beatKernels(id: BeatTemplateId, qtMs: number, scale = 1, pre = 1): number[] {
  switch (id) {
    case 'wpw':
      return wpwKernels(qtMs, scale, pre);
    case 'aberrant':
      return [...narrowKernels(qtMs, scale), ...kernel(0.085, 0.016, 0.016, RBBB_RPRIME_VEC, WAVE.S, scale)];
    case 'pacedV':
      return wideFrom(PACED_VEC, qtMs, scale, [0.055, 0.022], [0.115, 0.014], [0.07, 0.045]);
    case 'pvc2':
    case 'pvc3':
      return wideFrom(PVC_FOCI[id], qtMs, scale, [0.05, 0.022], [0.11, 0.02], [0.06, 0.04]);
    case 'agonal':
      return wideFrom(AGONAL_VEC, qtMs + 80, scale, [0.1, 0.045], [0.2, 0.035], [0.09, 0.07]);
    default:
      return templateKernels(id, qtMs, scale);
  }
}

/** R-peak offset from QRS onset (s): τ of the R kernel with the largest vector amplitude. */
export function fiducialOf(k: readonly number[]): number {
  let best = -1;
  let tau = 0.04;
  for (let i = 0; i < k.length; i += K_STRIDE) {
    if (k[i + 6] !== WAVE.R) continue;
    const a = Math.hypot(k[i + 3] as number, k[i + 4] as number, k[i + 5] as number);
    if (a > best) {
      best = a;
      tau = k[i] as number;
    }
  }
  return tau;
}

/** T peak of a kernel list (τ of the first T kernel, s from QRS onset); 0.3 s if there is none. */
export function tPeakS(k: readonly number[]): number {
  for (let i = 0; i < k.length; i += K_STRIDE) if (k[i + 6] === WAVE.T) return k[i] as number;
  return 0.3;
}

/** QRS width of a template as drawn (ms). */
export function beatQrsMs(id: BeatTemplateId, pre = 1): number {
  return qrsSpanMs(beatKernels(id, 400, 1, pre));
}

/** Rotate every kernel vector about the VCG Z axis (the X–Y, i.e. frontal, plane) by rad, in place. */
export function rotateZ(k: number[], rad: number): number[] {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  for (let i = 0; i < k.length; i += K_STRIDE) {
    const x = k[i + 3] as number;
    const y = k[i + 4] as number;
    k[i + 3] = c * x - s * y;
    k[i + 4] = s * x + c * y;
  }
  return k;
}
```


- [x] **Step 4: Run the tests and the type check**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg`

Expected: PASS (no failures; the Stage 1 tests keep passing).

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/ecg/beat-templates.ts packages/engine-core/src/l2/ecg/kernels.ts packages/engine-core/test/l2/ecg/s5/beat-templates.test.ts
git commit -m "feat(ecg): stage 5 beat templates (wpw, aberrant, paced, pvc foci, agonal) and wave codes"
```

---

### Task 3: Public types, rhythm table v2 and the rhythm-engine refactor (Stage 1.1 parity)

Every v1 rhythm id and modifier type becomes public; the rhythm table lists all 36 rhythms; the Stage 1 rhythm engine is split into small modules with registries (atrial handlers, focus handlers, extra clocks, hooks, morphology stages) that later tasks fill. Behaviour is unchanged, including Stage 1.1's AV-node ERP, AF rate calibration, continuous flutter wave, focus reset on capture and finite-time guard: the whole existing suite must still pass.

**Files:**
- Create: `packages/engine-core/src/l2/ecg/api-types.ts`, `packages/engine-core/src/l2/ecg/modifier-schema.ts`, `packages/engine-core/src/l2/ecg/rhythm-state.ts`, `packages/engine-core/src/l2/ecg/atria.ts`, `packages/engine-core/src/l2/ecg/foci.ts`, `packages/engine-core/src/l2/ecg/ectopy.ts`, `packages/engine-core/src/l2/ecg/mech.ts`, `packages/engine-core/src/l2/ecg/morphology/index.ts`
- Replace: `packages/engine-core/src/l2/ecg/rhythms.ts`, `packages/engine-core/src/l2/ecg/rhythm-engine.ts`, `packages/engine-core/src/modifiers.ts`
- Modify: `packages/engine-core/src/types.ts` (re-export the ECG types; three EngineEvent variants from brief §7.3)
- Test: `packages/engine-core/test/l2/ecg/s5/modifiers.test.ts` (new) and the whole existing suite

**Interfaces:**
- Consumes: Task 2 (`BeatTemplateId`, `beatKernels`, `fiducialOf`, `rotateZ`, `WPW_PR_MS`).
- Produces (exact names used by every later task): in `api-types.ts` — `RhythmId` (36 ids), `RhythmGroup`, `RhythmOpts` (adds `pulseless`, `pauseS`, `pauseEveryS`, `retroP`, `twistBeats`, `vfAmplitudeMv`, `autoAsystole`, `pacer`), `PacerOpts`, `PacerFault`, `PvcSpec`/`PvcPattern`, `PacSpec`, `PjcSpec`, `StSpec`/`StTerritory`, `TcpSpec`, `CprSpec`, `ShockSpec`, `BurstSpec`, `ArtefactSpec`, `BbbKind`, `Modifiers`, `ModifiersPatch`. `modifiers.ts` — `defaultArtefact()`, `defaultModifiers()`, `mergeModifiers(base, patch)`, re-export `validateModifiers(patch): string | undefined`. `rhythm-state.ts` — `NEVER`, `PendingV` (adds `scale?`, `twistRad?`, `pre?`), `FWave` (adds `seed?`), `RhythmState` (adds `atria.lastT`, `atria.pac`, `focusN`, `startT`, `focusAxis`, `ectopyCount`), `RhythmCtx`, `clamp`, `def`, `rhythmRate`, `pushPending`, `HOOKS { activate, apply, onP[], onBeat[], onApply[] }`. `rhythms.ts` — `RhythmDef` (adds `group`, `continuous`, `pacing`, `conductedTemplate`, `atrialDefaultBpm`), `RHYTHMS`, `RHYTHM_IDS`. `atria.ts` — `atrialRate`, `flutterRatio`, `afThresholdMv`, `afRefractoryS(hr, minRefractoryS?)`, `junctionSpontT`, `fireJunction`, `conductP(st, rate, ctx): number | null`, `ATRIAL_HANDLERS`, `onAtrial`, `AVB1_DEFAULT_PR_MS`. `foci.ts` — `FOCUS_HANDLERS`, `onFocus`, `VT_JITTER_S`. `ectopy.ts` — `prevailingRR`, `afterSupraBeat(st, p, t, ctx, qtMs?)`. `mech.ts` — `fFill`, `kRhythm` (PEA: `opts.pulseless` → 0), `BASE_SV_ML`. `morphology/index.ts` — `BeatInfo`, `MorphStage`, `MORPH_STAGES`, `applyMorphology`, `PStage`, `P_STAGES`, `applyPMorphology`, `PrTerm`, `PR_TERMS`, `prDeltaMs`. `rhythm-engine.ts` — `createRhythmState`, `applyRhythm`, `activateVentricle`, `escapeRate`, `isWide`, `planUntil`, `ClockSource`, re-exports `NEVER`, `FWave`, `PendingV`, `RhythmCtx`, `RhythmState`, `afRefractoryS`, `afThresholdMv`, `atrialRate`.
- Contract kept for engine.ts and Stage 2: beat events keep `{ type, t, seq, origin, template, qrsMs, qtMs, prMs?, mech: { perfused, kSV, svMl, lvetMs } }`; PVC beats keep `template: 'pvc'` whatever their focus.

- [x] **Step 1: Write the failing test**

Create or replace `packages/engine-core/test/l2/ecg/s5/modifiers.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { defaultModifiers, mergeModifiers, validateModifiers } from '../../../../src/modifiers.ts';

describe('Stage 5 modifiers: defaults, merge, validation', () => {
  it('defaults keep Stage 1 behaviour (only white noise on, textbook morphology)', () => {
    const d = defaultModifiers();
    expect(d).toMatchObject({ pvc: null, rsa: 0.67, hrvScale: 1, qtc: 400, bbb: 'none', k: 4.2, tempC: 37, morphologyVariation: 0 });
    expect(d.artefact).toEqual({ noise: 1, wander: 0, mains: 0, emg: 0, shiver: 0, motion: 0, leadOff: false, electrosurgery: null, cpr: null, shock: null });
  });

  it('merge: top-level keys replace; artefact merges key by key; overrides replace as a whole', () => {
    const a = mergeModifiers(defaultModifiers(), { k: 6.5, artefact: { mains: 0.4 }, overrides: { qtMs: 450 } });
    const b = mergeModifiers(a, { artefact: { emg: 0.2 }, overrides: { prMs: 220 } });
    expect(b.k).toBe(6.5);
    expect(b.artefact).toMatchObject({ noise: 1, mains: 0.4, emg: 0.2 });
    expect(b.overrides).toEqual({ prMs: 220 });
  });

  it('validation: accepts in-range patches and names the first bad field', () => {
    expect(validateModifiers({ st: { territory: 'inferior', mm: 2 }, bbb: 'lbbb', k: 7, artefact: { cpr: { rateCpm: 110, depth: 0.5 } } })).toBeUndefined();
    expect(validateModifiers({ pvc: { pattern: 'couplet', probability: 0.2 } })).toBeUndefined();
    expect(validateModifiers({ bogus: 1 } as never)).toMatch(/unknown modifiers: bogus/);
    expect(validateModifiers({ pvc: { pattern: 'quad' as never, probability: 0.1 } })).toMatch(/pvc.pattern/);
    expect(validateModifiers({ st: { territory: 'anterior', mm: 9 } })).toMatch(/st.mm/);
    expect(validateModifiers({ k: 12 })).toMatch(/k must be/);
    expect(validateModifiers({ artefact: { mains: 2 } })).toMatch(/artefact.mains/);
    expect(validateModifiers({ artefact: { nope: 1 } as never })).toMatch(/unknown artefact keys/);
    expect(validateModifiers({ tcp: { mode: 'demand', ratePpm: 70, mA: 250, thresholdMa: 70 } })).toMatch(/tcp.mA/);
  });
});
```


- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s5/modifiers.test.ts`

Expected: FAIL — `mergeModifiers` / `validateModifiers` are not exported from `src/modifiers.ts`.

- [x] **Step 3: Implement**

Create or replace `packages/engine-core/src/l2/ecg/api-types.ts` with exactly:

```ts
// Public ECG vocabulary (brief §5 rhythm library + modifiers, §7.2 setRhythm/setModifiers). types.ts re-exports
// everything here, so the public surface stays `import { … } from '@pme/engine-core'`. Stage 5 owns this file.
import type { SimSeconds } from '../../types.ts';

/** Every v1 rhythm (brief §5 table, plus `mat`, research 03 §1.5 "MAT"). */
export type RhythmId =
  | 'sinus' | 'sinusBrady' | 'sinusTachy' | 'sinusArrhythmia' | 'sinusPause'
  | 'atrialTach' | 'mat' | 'afib' | 'aflutter'
  | 'svtAvnrt' | 'svtAvrt' | 'wpwSinus' | 'preexcitedAf' | 'junctionalEscape' | 'junctionalAccel' | 'junctionalTachy'
  | 'avb1' | 'avb2Mobitz1' | 'avb2Mobitz2' | 'avb2to1' | 'avbHighGrade' | 'avb3Narrow' | 'avb3Wide'
  | 'idioventricular' | 'aivr' | 'vtMono' | 'vtPoly' | 'torsades' | 'vfCoarse' | 'vfFine'
  | 'asystole' | 'pWaveAsystole' | 'agonal'
  | 'pacedAAI' | 'pacedVVI' | 'pacedDDD';

export type RhythmGroup = 'sinus' | 'atrial' | 'svt' | 'avBlock' | 'ventricular' | 'arrest' | 'paced';

export type PacerFault = 'none' | 'failureToCapture' | 'failureToSense' | 'oversensing' | 'failureToPace';

/** Implanted-pacemaker settings for pacedAAI / pacedVVI / pacedDDD (brief §5 "Paced"; research 03 §1.7). */
export interface PacerOpts {
  /** Lower rate, ppm. Default: the rhythm's 'hr' target (70). */
  ratePpm?: number;
  /** DDD paced/sensed AV delay, ms (brief §5: 120–200). Default 160. */
  avDelayMs?: number;
  /** Default 'none'. */
  fault?: PacerFault;
  /** Fraction of pacing cycles the fault affects, 0–1. Default 1 for failureToSense, 0.3 otherwise [ENG]. */
  faultRate?: number;
  /** What sits under a VVI/DDD pacemaker: 'none' = complete heart block (default); 'conducted' = sinus conducts. */
  intrinsic?: 'none' | 'conducted';
}

/** Per-rhythm options (brief §7.2 names the type; the fields are this project's). */
export interface RhythmOpts {
  /** aflutter conduction ratio (2, 3, 4 or 'variable' = random 2:1/3:1/4:1 mix); avbHighGrade 3 or 4. */
  ratio?: 2 | 3 | 4 | 'variable';
  /** Atrial rate for aflutter (default 300), for dissociated atria (default 80) and under paced rhythms. */
  atrialRateBpm?: number;
  /** avb1 PR (default 280 ms). */
  prMs?: number;
  /** avb2Mobitz1 / avb2Mobitz2 group size in P waves: 4 → 4:3 (default 4). */
  groupSize?: 3 | 4 | 5 | 6;
  /** Sets the 'hr' target when the rhythm starts (default: the rhythm's default rate). */
  rateBpm?: number;
  /** PEA: every beat has mech.perfused = false and kSV = 0 (brief §5 "PEA = pulseless: true on any organised rhythm"). */
  pulseless?: boolean;
  /** sinusPause: pause length (default 3 s) and how often it happens (default every 12 s) [ENG]. */
  pauseS?: number;
  pauseEveryS?: number;
  /** Junctional rhythms: where the retrograde P sits (default 'before'). */
  retroP?: 'before' | 'hidden' | 'after';
  /** torsades: beats per full twist, 5–20 (default 12). */
  twistBeats?: number;
  /** vfCoarse starting amplitude A0, mV peak-to-peak in II (brief §4.1: 0.6–1.0; default 0.8). */
  vfAmplitudeMv?: number;
  /** VF → asystole hazard 0.02/min and forced at A < 0.05 mV (brief §4.1). Default true. */
  autoAsystole?: boolean;
  /** Paced rhythms only. */
  pacer?: PacerOpts;
}

export type PvcPattern = 'single' | 'bigeminy' | 'trigeminy' | 'couplet' | 'triplet' | 'run';

/** PVC ectopy (brief §5 modifiers; research 03 §1.5). */
export interface PvcSpec {
  /** 'single', 'couplet', 'triplet', 'run': chance per supraventricular beat (0–0.9). Ignored for bigeminy/trigeminy. */
  probability: number;
  pattern: PvcPattern;
  /** 'run' length in PVCs (3–30, default 5: a run ≥ 5 at HR ≥ 100 is the monitor's VT alarm, brief §5). */
  runLength?: number;
  /** ≥ 2 distinct PVC morphologies (research 03 §1.5 "Multifocal PVCs"). */
  multifocal?: boolean;
  /** PVC onset on the preceding T peak (coupling < QT). */
  rOnT?: boolean;
}

/** PACs: premature P′ at 60–85% of PP; resets the SA clock (research 03 §1.5). */
export interface PacSpec {
  probability: number;
  /** P′ not conducted. */
  blocked?: boolean;
  /** Conducted with RBBB-shaped aberrancy. */
  aberrant?: boolean;
}

export interface PjcSpec {
  probability: number;
}

export type StTerritory = 'anterior' | 'septal' | 'lateral' | 'anterolateral' | 'inferior' | 'posterior';
/** STEMI (brief §5): mm = 1–4 (0.1–0.4 mV) in the territory's peak lead; reciprocal change emerges from the VCG. */
export interface StSpec {
  territory: StTerritory;
  mm: number;
}

/** Transcutaneous pacing as seen by the ECG (brief §6.5). Stage 4's pacer device writes this modifier. */
export interface TcpSpec {
  mode: 'demand' | 'fixed';
  ratePpm: number;
  mA: number;
  /** Capture threshold (brief §6.5 default 70 mA). */
  thresholdMa: number;
}

/** CPR compression artefact (brief §4.1, §11 C2). rateCpm 100–120; depth 0–1 → 0.2–2 mV. */
export interface CprSpec {
  rateCpm: number;
  depth: number;
}

/** A defibrillator discharge at sim time atS (brief §6.5 "Shock artefact"). Stage 4's defib writes this. */
export interface ShockSpec {
  atS: SimSeconds;
  energyJ: number;
}

/** A diathermy burst (brief §5: 1–5 s). */
export interface BurstSpec {
  atS: SimSeconds;
  durationS: number;
}

/** Artefact levels (brief §5 "Artefacts"): numbers are 0–1 levels unless stated. */
export interface ArtefactSpec {
  /** Additive white noise: 1 = 0.025 mV SD (Stage 1). */
  noise: number;
  /** Extra baseline wander, 0.05–0.3 mV at 0.1–0.5 Hz. */
  wander: number;
  /** Mains pickup at the device mains frequency + 3rd harmonic, 0.01–0.5 mV. */
  mains: number;
  /** EMG, 20–150 Hz, 0.02–0.2 mV RMS. */
  emg: number;
  /** Shivering: EMG with a 4–8 Hz tremor envelope. */
  shiver: number;
  /** Electrode motion, 0.5–3 Hz, 0.5–5 mV. */
  motion: number;
  /** All ECG electrodes off: flat trace plus a technical alarm event. */
  leadOff: boolean;
  electrosurgery: BurstSpec | null;
  cpr: CprSpec | null;
  shock: ShockSpec | null;
}

export type BbbKind = 'none' | 'rbbb' | 'lbbb';

/** The full modifier set (brief §5 "Modifiers" + "Artefacts"). */
export interface Modifiers {
  pvc: PvcSpec | null;
  pac: PacSpec | null;
  pjc: PjcSpec | null;
  /** RSA depth 0–1 (1 = A_RSA 60 ms at RR 1 s). Default 0.67. */
  rsa: number;
  /** Multiplies every HRV term (0 = HRV off). Default 1. */
  hrvScale: number;
  /** QTc for Fridericia, ms (300–650). Default 400. */
  qtc: number;
  bbb: BbbKind;
  /** Frontal QRS axis target, degrees (−150…180); null = the template's own axis. */
  axisDeg: number | null;
  /** Precordial transition lead, 1.5–5.5; null = the template's own. */
  transitionLead: number | null;
  /** Global voltage scale: 1 = normal, 0.4–0.6 = low voltage. */
  lowVoltage: number;
  lvh: boolean;
  st: StSpec | null;
  /** Diffuse subendocardial ST depression in II/V5, mV (0 or −0.05 … −0.3). */
  ischaemicDepressionMv: number;
  /** T inversion 0–1 (1 = fully inverted T). */
  tInversion: number;
  longQT: boolean;
  brugada1: boolean;
  digoxin: boolean;
  /** Electrical alternans 0 or 0.2–0.4 (fractional QRS/T amplitude drop on alternate beats). */
  alternans: number;
  /** Serum potassium, mmol/L (brief §5 "Electrolytes from state k"; default 4.2). */
  k: number;
  /** Core temperature, °C (drives Osborn J waves; default 37). */
  tempC: number;
  /** Hard overrides of drawn intervals, ms. */
  overrides: { qrsMs?: number; qtMs?: number; prMs?: number };
  /** Stable per-patient morphology fingerprint (brief §5 "Individuality"). */
  patientSeed: number;
  /** 0 = textbook morphology, 1 = full per-patient variation. Default 0. */
  morphologyVariation: number;
  /** Sim time of the last epinephrine dose (VF: +20–40% A, +0.5 Hz for 2–4 min, brief §4.1). */
  epinephrineAtS: SimSeconds | null;
  tcp: TcpSpec | null;
  artefact: ArtefactSpec;
}

/** What `setModifiers` accepts: any subset, with `artefact` and `overrides` merged key by key. */
export type ModifiersPatch = Partial<Omit<Modifiers, 'artefact' | 'overrides'>> & {
  artefact?: Partial<ArtefactSpec>;
  overrides?: Modifiers['overrides'];
};
```

Create or replace `packages/engine-core/src/l2/ecg/modifier-schema.ts` with exactly:

```ts
// setModifiers validation (brief §5 ranges). Returns a human-readable reason, or undefined when the patch is valid.
import type { ModifiersPatch, PvcPattern, StTerritory } from '../../types.ts';

const KEYS = new Set([
  'pvc', 'pac', 'pjc', 'rsa', 'hrvScale', 'qtc', 'bbb', 'axisDeg', 'transitionLead', 'lowVoltage', 'lvh', 'st',
  'ischaemicDepressionMv', 'tInversion', 'longQT', 'brugada1', 'digoxin', 'alternans', 'k', 'tempC', 'overrides',
  'patientSeed', 'morphologyVariation', 'epinephrineAtS', 'tcp', 'artefact',
]);
const ART_KEYS = new Set(['noise', 'wander', 'mains', 'emg', 'shiver', 'motion', 'leadOff', 'electrosurgery', 'cpr', 'shock']);
const PVC_PATTERNS: readonly PvcPattern[] = ['single', 'bigeminy', 'trigeminy', 'couplet', 'triplet', 'run'];
const TERRITORIES: readonly StTerritory[] = ['anterior', 'septal', 'lateral', 'anterolateral', 'inferior', 'posterior'];

const inRange = (v: unknown, lo: number, hi: number) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

export function validateModifiers(m: ModifiersPatch): string | undefined {
  const bad = Object.keys(m).filter((k) => !KEYS.has(k));
  if (bad.length) return `unknown modifiers: ${bad.join(', ')}`;
  if (m.pvc) {
    if (!PVC_PATTERNS.includes(m.pvc.pattern)) return `pvc.pattern must be one of ${PVC_PATTERNS.join(', ')}`;
    if (!inRange(m.pvc.probability, 0, 0.9)) return 'pvc.probability must be 0–0.9';
    if (m.pvc.runLength !== undefined && !inRange(m.pvc.runLength, 3, 30)) return 'pvc.runLength must be 3–30';
  }
  if (m.pac && !inRange(m.pac.probability, 0, 0.9)) return 'pac.probability must be 0–0.9';
  if (m.pjc && !inRange(m.pjc.probability, 0, 0.9)) return 'pjc.probability must be 0–0.9';
  if (m.rsa !== undefined && !inRange(m.rsa, 0, 1)) return 'rsa must be 0–1';
  if (m.hrvScale !== undefined && !inRange(m.hrvScale, 0, 3)) return 'hrvScale must be 0–3';
  if (m.qtc !== undefined && !inRange(m.qtc, 300, 650)) return 'qtc must be 300–650 ms';
  if (m.bbb !== undefined && !['none', 'rbbb', 'lbbb'].includes(m.bbb)) return 'bbb must be none, rbbb or lbbb';
  if (m.axisDeg !== undefined && m.axisDeg !== null && !inRange(m.axisDeg, -150, 180)) return 'axisDeg must be −150…180';
  if (m.transitionLead !== undefined && m.transitionLead !== null && !inRange(m.transitionLead, 1.5, 5.5)) return 'transitionLead must be 1.5–5.5';
  if (m.lowVoltage !== undefined && !inRange(m.lowVoltage, 0.3, 1)) return 'lowVoltage must be 0.3–1';
  if (m.st) {
    if (!TERRITORIES.includes(m.st.territory)) return `st.territory must be one of ${TERRITORIES.join(', ')}`;
    if (!inRange(m.st.mm, 0.5, 4)) return 'st.mm must be 0.5–4';
  }
  if (m.ischaemicDepressionMv !== undefined && !inRange(m.ischaemicDepressionMv, -0.3, 0)) return 'ischaemicDepressionMv must be −0.3…0';
  if (m.tInversion !== undefined && !inRange(m.tInversion, 0, 1)) return 'tInversion must be 0–1';
  if (m.alternans !== undefined && !inRange(m.alternans, 0, 0.5)) return 'alternans must be 0–0.5';
  if (m.k !== undefined && !inRange(m.k, 1.5, 10)) return 'k must be 1.5–10 mmol/L';
  if (m.tempC !== undefined && !inRange(m.tempC, 20, 43)) return 'tempC must be 20–43 °C';
  if (m.overrides) {
    const o = m.overrides;
    if (o.qrsMs !== undefined && !inRange(o.qrsMs, 60, 300)) return 'overrides.qrsMs must be 60–300';
    if (o.qtMs !== undefined && !inRange(o.qtMs, 200, 700)) return 'overrides.qtMs must be 200–700';
    if (o.prMs !== undefined && !inRange(o.prMs, 80, 400)) return 'overrides.prMs must be 80–400';
  }
  if (m.patientSeed !== undefined && !(Number.isInteger(m.patientSeed) && m.patientSeed >= 0)) return 'patientSeed must be a non-negative integer';
  if (m.morphologyVariation !== undefined && !inRange(m.morphologyVariation, 0, 1)) return 'morphologyVariation must be 0–1';
  if (m.epinephrineAtS !== undefined && m.epinephrineAtS !== null && !inRange(m.epinephrineAtS, 0, 1e9)) return 'epinephrineAtS must be a sim time ≥ 0';
  if (m.tcp) {
    if (m.tcp.mode !== 'demand' && m.tcp.mode !== 'fixed') return 'tcp.mode must be demand or fixed';
    if (!inRange(m.tcp.ratePpm, 30, 180)) return 'tcp.ratePpm must be 30–180';
    if (!inRange(m.tcp.mA, 0, 200)) return 'tcp.mA must be 0–200';
    if (!inRange(m.tcp.thresholdMa, 0, 200)) return 'tcp.thresholdMa must be 0–200';
  }
  const a = m.artefact;
  if (a) {
    const badA = Object.keys(a).filter((k) => !ART_KEYS.has(k));
    if (badA.length) return `unknown artefact keys: ${badA.join(', ')}`;
    if (a.noise !== undefined && !inRange(a.noise, 0, 10)) return 'artefact.noise must be 0–10'; // Stage 1.1 range
    for (const k of ['wander', 'mains', 'emg', 'shiver', 'motion'] as const) {
      if (a[k] !== undefined && !inRange(a[k], 0, 1)) return `artefact.${k} must be 0–1`;
    }
    if (a.leadOff !== undefined && typeof a.leadOff !== 'boolean') return 'artefact.leadOff must be boolean';
    if (a.cpr && (!inRange(a.cpr.rateCpm, 60, 160) || !inRange(a.cpr.depth, 0, 1))) return 'artefact.cpr needs rateCpm 60–160 and depth 0–1';
    if (a.shock && (!inRange(a.shock.atS, 0, 1e9) || !inRange(a.shock.energyJ, 1, 400))) return 'artefact.shock needs atS ≥ 0 and energyJ 1–400';
    if (a.electrosurgery && (!inRange(a.electrosurgery.atS, 0, 1e9) || !inRange(a.electrosurgery.durationS, 0.1, 10))) {
      return 'artefact.electrosurgery needs atS ≥ 0 and durationS 0.1–10';
    }
  }
  return undefined;
}
```

Create or replace `packages/engine-core/src/modifiers.ts` with exactly:

```ts
import type { ArtefactSpec, Modifiers, ModifiersPatch } from './types.ts';

/** Default artefact levels: only Stage 1's white noise is on. */
export function defaultArtefact(): ArtefactSpec {
  return { noise: 1, wander: 0, mains: 0, emg: 0, shiver: 0, motion: 0, leadOff: false, electrosurgery: null, cpr: null, shock: null };
}

/** Default modifiers (brief §5 defaults; awake-adult HRV per §4.1; K 4.2 mmol/L and 37 °C are textbook normals [ENG]). */
export function defaultModifiers(): Modifiers {
  return {
    pvc: null, pac: null, pjc: null,
    rsa: 0.67, hrvScale: 1, qtc: 400,
    bbb: 'none', axisDeg: null, transitionLead: null, lowVoltage: 1, lvh: false,
    st: null, ischaemicDepressionMv: 0, tInversion: 0,
    longQT: false, brugada1: false, digoxin: false, alternans: 0,
    k: 4.2, tempC: 37, overrides: {},
    patientSeed: 0, morphologyVariation: 0,
    epinephrineAtS: null, tcp: null,
    artefact: defaultArtefact(),
  };
}

/** Apply a setModifiers patch: top-level keys replace, `artefact` and `overrides` merge key by key. */
export function mergeModifiers(base: Modifiers, patch: ModifiersPatch): Modifiers {
  const { artefact, overrides, ...rest } = patch;
  return {
    ...base,
    ...rest,
    artefact: { ...base.artefact, ...(artefact ?? {}) },
    overrides: overrides === undefined ? base.overrides : { ...overrides },
  };
}

export { validateModifiers } from './l2/ecg/modifier-schema.ts';
```

In `packages/engine-core/src/types.ts`, replace:

```ts
/** Rhythm IDs implemented in Stage 1 (brief §5 lists the full v1 set; Stage 5 adds the rest). */
export type RhythmId =
  | 'sinus' | 'sinusBrady' | 'sinusTachy' | 'afib' | 'aflutter' | 'svtAvnrt' | 'avb1' | 'avb2Mobitz1'
  | 'avb3Narrow' | 'avb3Wide' | 'vtMono' | 'asystole';

/** Per-rhythm options (defined here; the brief names the type but not its fields). */
export interface RhythmOpts {
  /** Flutter conduction ratio (brief §5): 2, 3, 4 or 'variable' (random 2:1/4:1 mix). Default 2. */
  ratio?: 2 | 3 | 4 | 'variable';
  /** Atrial rate for aflutter (default 300) and for the dissociated atria of avb3Narrow/avb3Wide (default 80). */
  atrialRateBpm?: number;
  /** avb1 PR (default 280 ms). */
  prMs?: number;
  /** avb2Mobitz1 group size in P waves: 3 → 3:2 … 6 → 6:5 (default 4 → 4:3). */
  groupSize?: 3 | 4 | 5 | 6;
  /** Sets the 'hr' target when the rhythm starts (default: the rhythm's default rate, see RHYTHMS). */
  rateBpm?: number;
}

/** PVC ectopy (brief §5 modifiers). Stage 1 implements patterns 'single' and 'bigeminy'. */
export interface PvcSpec {
  /** 'single': each sinus beat is followed by a PVC with this probability (0–0.9). Ignored for bigeminy. */
  probability: number;
  pattern: 'single' | 'bigeminy';
}

/** Modifiers subset for Stage 1 (brief §5). Later stages add the rest of the table. */
export interface Modifiers {
  pvc: PvcSpec | null;
  /** RSA depth 0–1 (1 = A_RSA 60 ms at RR 1 s). Default 0.67. */
  rsa: number;
  /** Multiplies every HRV term (0 = HRV off). Default 1. */
  hrvScale: number;
  /** QTc for Fridericia, ms (300–650). Default 400. */
  qtc: number;
  /** Artefact levels. Stage 1 has only additive white noise: 1 = 0.025 mV SD (brief §5 artefacts), 0 = off. */
  artefact: { noise: number };
}
```

with:

```ts
export type {
  ArtefactSpec, BbbKind, BurstSpec, CprSpec, Modifiers, ModifiersPatch, PacerFault, PacerOpts, PacSpec, PjcSpec,
  PvcPattern, PvcSpec, RhythmGroup, RhythmId, RhythmOpts, ShockSpec, StSpec, StTerritory, TcpSpec,
} from './l2/ecg/api-types.ts';
import type { Modifiers, RhythmId, RhythmOpts } from './l2/ecg/api-types.ts';
```

In `packages/engine-core/src/types.ts`, replace:

```ts
  | { type: 'atrial'; t: SimSeconds; kind: 'p' | 'flutter' | 'fib' | 'retrograde' | 'paced'; conducted: boolean }
```

with:

```ts
  | { type: 'atrial'; t: SimSeconds; kind: 'p' | 'flutter' | 'fib' | 'retrograde' | 'paced'; conducted: boolean }
  | { type: 'rhythmSegment'; t: SimSeconds; rhythm: RhythmId; seed: number; templateId?: string }
  | {
      type: 'marker'; t: SimSeconds; kind: 'paceSpike' | 'syncR' | 'shock' | 'chargeStart' | 'chargeReady' | 'disarm';
      data?: Record<string, number | boolean>;
    }
  | {
      type: 'alarm'; t: SimSeconds; id: string; priority: 'high' | 'medium' | 'low'; category: 'physiological' | 'technical';
      state: 'raised' | 'cleared' | 'acked' | 'silenced' | 'paused'; text: string;
    }
```

Create or replace `packages/engine-core/src/l2/ecg/rhythms.ts` with exactly:

```ts
// Rhythm table (brief §5; research 03 §1.5). Each rhythm is a configuration of the two clocks (atria,
// ventricle), the AV node, an optional ventricular/junctional focus, a continuous generator (VF) and an
// optional implanted pacemaker. `hr` (the L1 target) drives the rate named in `rateDrives`.
import type { RhythmGroup, RhythmId } from '../../types.ts';
import type { BeatTemplateId as TemplateId } from './beat-templates.ts';

export type AtrialMode = 'sinus' | 'ectopic' | 'multifocal' | 'flutter' | 'fib' | 'none';
export type AvMode = 'conducted' | 'wenckebach' | 'mobitz2' | 'fixedRatio' | 'dissociated' | 'integrateFire';
export type FocusMode = 'none' | 'vt' | 'svt' | 'avrt' | 'junctional' | 'idioventricular' | 'vtPoly' | 'torsades' | 'agonal';
export type EscapeMode = 'junctional' | 'ventricular' | 'none';
export type PacingMode = 'none' | 'AAI' | 'VVI' | 'DDD';

export interface RhythmDef {
  group: RhythmGroup;
  atria: AtrialMode;
  av: AvMode;
  focus: FocusMode;
  escape: EscapeMode;
  /** 'vf': the continuous VF generator runs (arrest/vf.ts). */
  continuous: 'none' | 'vf';
  pacing: PacingMode;
  /** What the 'hr' target sets. 'pacer' = the pacemaker lower rate. */
  rateDrives: 'sinus' | 'afResponse' | 'focus' | 'escape' | 'pacer' | 'none';
  /** Clamp applied to hr for this rhythm (bpm). */
  rateRange: readonly [number, number];
  /** hr target set when the rhythm starts (RhythmOpts.rateBpm overrides). */
  defaultRateBpm: number;
  /** Template of conducted supraventricular beats. */
  conductedTemplate: TemplateId;
  /** Template of the escape beats (when escape ≠ none). */
  escapeTemplate: TemplateId;
  /** Backup escape rate for rhythms whose escape is not the primary pacemaker (bpm). */
  backupEscapeBpm: number;
  /** Default rate of atria that are not driven by 'hr' (dissociated, paced, pWaveAsystole) (bpm). */
  atrialDefaultBpm: number;
}

const BACKUP_JUNCTIONAL_BPM = 40; // [ENG] junctional escape 40–60 (brief §5); low end so Wenckebach pauses stay visible
const DISSOCIATED_ATRIAL_BPM = 80; // [ENG] (Stage 1 default)

type Row = Omit<RhythmDef, 'continuous' | 'pacing' | 'conductedTemplate' | 'atrialDefaultBpm' | 'escapeTemplate' | 'backupEscapeBpm'> &
  Partial<Pick<RhythmDef, 'continuous' | 'pacing' | 'conductedTemplate' | 'atrialDefaultBpm' | 'escapeTemplate' | 'backupEscapeBpm'>>;
function row(r: Row): RhythmDef {
  return {
    continuous: 'none',
    pacing: 'none',
    conductedTemplate: 'narrow',
    atrialDefaultBpm: DISSOCIATED_ATRIAL_BPM,
    escapeTemplate: 'narrow',
    backupEscapeBpm: 0,
    ...r,
  };
}
const J = BACKUP_JUNCTIONAL_BPM;

export const RHYTHMS: Readonly<Record<RhythmId, RhythmDef>> = {
  // --- sinus ------------------------------------------------------------------------------------
  sinus: row({ group: 'sinus', atria: 'sinus', av: 'conducted', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [20, 250], defaultRateBpm: 75, backupEscapeBpm: J }),
  // sinusBrady backup escape 30/min [ENG]: below the junctional 40–60 (brief §5) so it cannot pre-empt a slow sinus down to 31/min
  sinusBrady: row({ group: 'sinus', atria: 'sinus', av: 'conducted', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [20, 59], defaultRateBpm: 45, backupEscapeBpm: 30 }),
  sinusTachy: row({ group: 'sinus', atria: 'sinus', av: 'conducted', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [101, 220], defaultRateBpm: 120, backupEscapeBpm: J }),
  sinusArrhythmia: row({ group: 'sinus', atria: 'sinus', av: 'conducted', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [50, 100], defaultRateBpm: 70, backupEscapeBpm: 30 }),
  // backup escape 15/min so a 3 s arrest stays visible [ENG]
  sinusPause: row({ group: 'sinus', atria: 'sinus', av: 'conducted', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [50, 100], defaultRateBpm: 70, backupEscapeBpm: 15 }),
  // --- atrial -----------------------------------------------------------------------------------
  atrialTach: row({ group: 'atrial', atria: 'ectopic', av: 'conducted', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [150, 250], defaultRateBpm: 170, backupEscapeBpm: J }),
  mat: row({ group: 'atrial', atria: 'multifocal', av: 'conducted', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [100, 150], defaultRateBpm: 120, backupEscapeBpm: J }),
  afib: row({ group: 'atrial', atria: 'fib', av: 'integrateFire', focus: 'none', escape: 'none', rateDrives: 'afResponse', rateRange: [40, 180], defaultRateBpm: 100 }),
  aflutter: row({ group: 'atrial', atria: 'flutter', av: 'fixedRatio', focus: 'none', escape: 'junctional', rateDrives: 'none', rateRange: [0, 400], defaultRateBpm: 150, backupEscapeBpm: J }),
  // --- SVT family -------------------------------------------------------------------------------
  svtAvnrt: row({ group: 'svt', atria: 'none', av: 'dissociated', focus: 'svt', escape: 'none', rateDrives: 'focus', rateRange: [140, 280], defaultRateBpm: 180 }),
  svtAvrt: row({ group: 'svt', atria: 'none', av: 'dissociated', focus: 'avrt', escape: 'none', rateDrives: 'focus', rateRange: [150, 250], defaultRateBpm: 190 }),
  wpwSinus: row({ group: 'svt', atria: 'sinus', av: 'conducted', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [40, 150], defaultRateBpm: 75, conductedTemplate: 'wpw', backupEscapeBpm: J }),
  preexcitedAf: row({ group: 'svt', atria: 'fib', av: 'integrateFire', focus: 'none', escape: 'none', rateDrives: 'afResponse', rateRange: [120, 280], defaultRateBpm: 200, conductedTemplate: 'wpw' }),
  junctionalEscape: row({ group: 'svt', atria: 'none', av: 'dissociated', focus: 'junctional', escape: 'none', rateDrives: 'focus', rateRange: [40, 60], defaultRateBpm: 50 }),
  junctionalAccel: row({ group: 'svt', atria: 'none', av: 'dissociated', focus: 'junctional', escape: 'none', rateDrives: 'focus', rateRange: [61, 100], defaultRateBpm: 80 }),
  junctionalTachy: row({ group: 'svt', atria: 'none', av: 'dissociated', focus: 'junctional', escape: 'none', rateDrives: 'focus', rateRange: [101, 180], defaultRateBpm: 120 }),
  // --- AV blocks --------------------------------------------------------------------------------
  avb1: row({ group: 'avBlock', atria: 'sinus', av: 'conducted', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [30, 150], defaultRateBpm: 70, backupEscapeBpm: J }),
  avb2Mobitz1: row({ group: 'avBlock', atria: 'sinus', av: 'wenckebach', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [40, 130], defaultRateBpm: 75, backupEscapeBpm: J }),
  avb2Mobitz2: row({ group: 'avBlock', atria: 'sinus', av: 'mobitz2', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [40, 130], defaultRateBpm: 75, backupEscapeBpm: 30 }),
  avb2to1: row({ group: 'avBlock', atria: 'sinus', av: 'mobitz2', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [50, 150], defaultRateBpm: 80, backupEscapeBpm: 25 }),
  // 3:1 at 100 → ventricle 33/min, 4:1 → 25/min; escape backup 20/min (3 s) stays behind both [ENG]
  avbHighGrade: row({ group: 'avBlock', atria: 'sinus', av: 'mobitz2', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [60, 150], defaultRateBpm: 100, backupEscapeBpm: 20 }),
  avb3Narrow: row({ group: 'avBlock', atria: 'sinus', av: 'dissociated', focus: 'none', escape: 'junctional', rateDrives: 'escape', rateRange: [40, 60], defaultRateBpm: 45 }),
  avb3Wide: row({ group: 'avBlock', atria: 'sinus', av: 'dissociated', focus: 'none', escape: 'ventricular', rateDrives: 'escape', rateRange: [20, 40], defaultRateBpm: 32, escapeTemplate: 'wide' }),
  // --- ventricular ------------------------------------------------------------------------------
  idioventricular: row({ group: 'ventricular', atria: 'none', av: 'dissociated', focus: 'idioventricular', escape: 'none', rateDrives: 'focus', rateRange: [20, 40], defaultRateBpm: 35 }),
  aivr: row({ group: 'ventricular', atria: 'sinus', av: 'dissociated', focus: 'idioventricular', escape: 'none', rateDrives: 'focus', rateRange: [41, 120], defaultRateBpm: 75, atrialDefaultBpm: 60 }),
  vtMono: row({ group: 'ventricular', atria: 'sinus', av: 'conducted', focus: 'vt', escape: 'none', rateDrives: 'focus', rateRange: [120, 250], defaultRateBpm: 170 }),
  vtPoly: row({ group: 'ventricular', atria: 'none', av: 'dissociated', focus: 'vtPoly', escape: 'none', rateDrives: 'focus', rateRange: [150, 300], defaultRateBpm: 220 }),
  torsades: row({ group: 'ventricular', atria: 'none', av: 'dissociated', focus: 'torsades', escape: 'none', rateDrives: 'focus', rateRange: [200, 250], defaultRateBpm: 230 }),
  vfCoarse: row({ group: 'ventricular', atria: 'none', av: 'dissociated', focus: 'none', escape: 'none', continuous: 'vf', rateDrives: 'none', rateRange: [0, 0], defaultRateBpm: 0 }),
  vfFine: row({ group: 'ventricular', atria: 'none', av: 'dissociated', focus: 'none', escape: 'none', continuous: 'vf', rateDrives: 'none', rateRange: [0, 0], defaultRateBpm: 0 }),
  // --- arrest -----------------------------------------------------------------------------------
  asystole: row({ group: 'arrest', atria: 'none', av: 'dissociated', focus: 'none', escape: 'none', rateDrives: 'none', rateRange: [0, 0], defaultRateBpm: 0 }),
  pWaveAsystole: row({ group: 'arrest', atria: 'sinus', av: 'dissociated', focus: 'none', escape: 'none', rateDrives: 'none', rateRange: [0, 0], defaultRateBpm: 0, atrialDefaultBpm: 50 }),
  agonal: row({ group: 'arrest', atria: 'none', av: 'dissociated', focus: 'agonal', escape: 'none', rateDrives: 'focus', rateRange: [4, 20], defaultRateBpm: 12 }),
  // --- paced (underlying: sinus atria; pacing.ts decides conduction) ------------------------------
  pacedAAI: row({ group: 'paced', atria: 'sinus', av: 'conducted', focus: 'none', escape: 'junctional', pacing: 'AAI', rateDrives: 'pacer', rateRange: [30, 180], defaultRateBpm: 70, atrialDefaultBpm: 45, backupEscapeBpm: 30 }),
  pacedVVI: row({ group: 'paced', atria: 'sinus', av: 'dissociated', focus: 'none', escape: 'ventricular', pacing: 'VVI', rateDrives: 'pacer', rateRange: [30, 180], defaultRateBpm: 70, atrialDefaultBpm: 80, escapeTemplate: 'wide', backupEscapeBpm: 25 }),
  pacedDDD: row({ group: 'paced', atria: 'sinus', av: 'dissociated', focus: 'none', escape: 'ventricular', pacing: 'DDD', rateDrives: 'pacer', rateRange: [30, 180], defaultRateBpm: 70, atrialDefaultBpm: 50, escapeTemplate: 'wide', backupEscapeBpm: 25 }),
};

export const RHYTHM_IDS = Object.keys(RHYTHMS) as RhythmId[];

/** Dissociated atria (CHB, VT) run at their own rate (RhythmOpts.atrialRateBpm, default 80) [ENG]. */
export const DEFAULT_DISSOCIATED_ATRIAL_BPM = DISSOCIATED_ATRIAL_BPM;
/** Flutter atrial rate default (brief §5: 250–350). */
export const DEFAULT_FLUTTER_ATRIAL_BPM = 300;
```

Create or replace `packages/engine-core/src/l2/ecg/rhythm-state.ts` with exactly:

```ts
// Rhythm-engine state and shared helpers (brief §4.1 "Rhythm engine"). All state is plain JSON-safe data so the
// engine can structuredClone it every tick (look-ahead) and snapshot it.
import type { Sfc32State, StreamName } from '../../rng/sfc32.ts';
import type { BeatOrigin, EngineEvent, Modifiers, RhythmId, RhythmOpts } from '../../types.ts';
import type { EcgEvent } from './kernels.ts';
import type { HrvPhase } from './hrv.ts';
import type { BeatTemplateId } from './beat-templates.ts';
import { RHYTHMS, type RhythmDef } from './rhythms.ts';

/** JSON-safe stand-in for ±Infinity. */
export const NEVER = 1e12;

export interface PendingV {
  t: number;
  origin: BeatOrigin;
  template: BeatTemplateId;
  prMs: number | null;
  pvc: boolean;
  coupling: number; // PVC coupling as a fraction of the prevailing RR (0 for non-PVC)
  /** Primary pacemakers that set their own timing (foci, AF junction, PVC runs) skip the refractory check. */
  bypass: boolean;
  /** Amplitude scale (signed) replacing the default; torsades/agonal use it. */
  scale?: number;
  /** Frontal-plane rotation of the QRS-T vectors, radians (polymorphic VT / torsades). */
  twistRad?: number;
  /** Pre-excitation fraction for the 'wpw' template (0.4–1.8). */
  pre?: number;
}

/** A continuous atrial wave: Σ a_i·sin(2π·f_i·s + ph_i) along the VCG direction `dir`, between start and end. */
export interface FWave {
  kind: 'fib' | 'flutter';
  start: number;
  end: number;
  /** Sinusoids (Stage 1.1); empty for an AF wave played from the recorded texture (af-texture.ts). */
  f: number[];
  ph: number[];
  a: number[];
  dir: [number, number, number];
  /** Flutter only: the atrial rate it was built for (bpm). */
  rateBpm?: number;
  /** AF texture seed (af-texture.ts). */
  seed?: number;
}

export interface RhythmState {
  id: RhythmId;
  opts: RhythmOpts;
  respectRefractory: boolean;
  planT: number;
  atria: { nextT: number; groupPos: number; groupRatio: number; lastT: number; pac: { blocked: boolean; aberrant: boolean } | null };
  junction: { refUntil: number; v: number; vT: number };
  pending: PendingV[];
  focusNextT: number;
  /** Focus beat counter since the focus started (torsades twist, agonal decay, polymorphic walk). */
  focusN: number;
  /** Time the current rhythm started (applyRhythm). */
  startT: number;
  /** Polymorphic VT axis random walk (radians). */
  focusAxis: number;
  escapeNextT: number;
  refractoryUntil: number;
  /** The AV node conducts no P before this time (AV_NODE_ERP_S after the last conducted P). */
  avRefUntil: number;
  /** Was the last ventricular activation a conducted supraventricular beat (not a PVC/escape/focus beat)? */
  lastConducted: boolean;
  lastVT: number;
  lastSupraT: number;
  lastWasPvc: boolean;
  /** Supraventricular beats since the last PVC (ectopy pattern counter). */
  ectopyCount: number;
  /** Active and recently ended atrial waves (the generator may still need an ended one for unrendered samples). */
  fwaves: FWave[];
  events: EcgEvent[];
  records: EngineEvent[];
  beatSeq: number;
  pendingSwitch: { id: RhythmId; opts: RhythmOpts; respectRefractory: boolean } | null;
}

export interface RhythmCtx {
  /** The L1 'hr' target at time t (bpm, unclamped). */
  hrAt(t: number): number;
  mods: Modifiers;
  rng: Record<StreamName, Sfc32State>;
  hrv: HrvPhase;
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

export function def(st: RhythmState): RhythmDef {
  return RHYTHMS[st.id];
}

/** The rate this rhythm's primary clock runs at, at time t (bpm). */
export function rhythmRate(st: RhythmState, t: number, ctx: RhythmCtx): number {
  const d = RHYTHMS[st.id];
  return clamp(ctx.hrAt(t), d.rateRange[0], d.rateRange[1]);
}

export function pushPending(st: RhythmState, p: PendingV): void {
  let i = st.pending.length;
  while (i > 0 && (st.pending[i - 1] as PendingV).t > p.t) i--;
  st.pending.splice(i, 0, p);
}

export type SenseHook = (st: RhythmState, t: number, ctx: RhythmCtx) => void;
export type BeatHook = (st: RhythmState, p: PendingV, ctx: RhythmCtx) => void;
export type ApplyHook = (st: RhythmState, prev: RhythmId, t0: number, ctx: RhythmCtx) => void;

/**
 * Late-bound hooks so feature modules (pacing, VF, ectopy) never import rhythm-engine.ts (no import cycles):
 * activate / apply = rhythm-engine's activateVentricle / applyRhythm; onP runs after every sinus/ectopic P wave;
 * onBeat runs after every activated ventricular beat; onApply runs at the end of every applyRhythm.
 */
export const HOOKS: {
  activate: (st: RhythmState, p: PendingV, ctx: RhythmCtx) => boolean;
  apply: (st: RhythmState, id: RhythmId, opts: RhythmOpts, at: number, respectRefractory: boolean, ctx: RhythmCtx) => void;
  onP: SenseHook[];
  onBeat: BeatHook[];
  onApply: ApplyHook[];
} = {
  activate: () => false,
  apply: () => undefined,
  onP: [],
  onBeat: [],
  onApply: [],
};
```

Create or replace `packages/engine-core/src/l2/ecg/mech.ts` with exactly:

```ts
// Beat → mechanical output k_rhythm (brief §4.8 table; research 03 §8.2–8.3). The `mech` field of every beat event is
// the contract with Stage 2's haemodynamics: perfused === false ⇔ kSV === 0 (PEA, VF, dropped/too-early beats).
import { lvetMs } from './intervals.ts';
import { RHYTHMS } from './rhythms.ts';
import type { PendingV, RhythmState } from './rhythm-state.ts';

const PVC_NO_EJECTION_BELOW = 0.45; // no ejection at coupling < ~45% of RR (brief §4.8)
export const BASE_SV_ML = 70; // placeholder SV until the Stage 2 haemodynamic core [ENG]

export function fFill(rr: number): number {
  // f_fill(RR) = 1 − exp(−max(0, RR − t_sys)/τ_fill), t_sys = LVET + 0.08 s, τ_fill 0.18 s,
  // normalised to 1 at RR 1 s (brief §4.8; research 03 §8.2)
  const f = (x: number) => 1 - Math.exp(-Math.max(0, x - (Math.max(150, lvetMs(60 / x)) / 1000 + 0.08)) / 0.18);
  return f(rr) / f(1);
}

/** Stroke-volume factor k_rhythm for one beat (brief §4.8 table). */
export function kRhythm(st: RhythmState, p: PendingV, rr: number): number {
  const d = RHYTHMS[st.id];
  if (st.opts.pulseless) return 0; // PEA (brief §5)
  let k: number;
  if (p.pvc) k = p.coupling < PVC_NO_EJECTION_BELOW ? 0 : 0.3; // PVC 0–0.6
  else if (p.origin === 'paced') k = 0.9; // paced 0.85–1.0 (research 03 §1.5)
  else if (p.origin === 'ventricular') {
    const hr = 60 / rr;
    if (d.focus === 'vt') k = hr <= 150 ? 0.6 : hr >= 200 ? 0.2 : 0.6 - (0.4 * (hr - 150)) / 50; // VT 0.4–0.6 / 0–0.3
    else if (d.focus === 'torsades' || d.focus === 'vtPoly') k = 0.1; // torsades 0–0.2
    else if (d.focus === 'agonal') k = 0;
    else if (d.focus === 'idioventricular') k = 0.7; // idioventricular / AIVR 0.6–0.8
    else k = rr >= 1.5 ? 1.4 : 0.7; // CHB escape ≤40/min: SV × 1.3–1.5
  } else if (p.origin === 'junctional') k = d.focus === 'svt' || d.focus === 'avrt' ? 0.85 * fFill(rr) : 0.85; // junctional 0.8–0.9
  else if (d.atria === 'fib') k = 0.8 * fFill(rr); // AF 0.75–0.85 × f_fill
  else if (d.atria === 'flutter') k = 0.85; // flutter 0.8–0.9
  else k = 1.0; // sinus, atrial, AAI/DDD
  if (st.lastWasPvc && !p.pvc) k *= 1.2; // beat after a PVC 1.1–1.3
  return Math.max(0, k);
}
```

Create or replace `packages/engine-core/src/l2/ecg/morphology/index.ts` with exactly:

```ts
// Morphology pipeline: modifiers applied to one beat's kernel list (brief §5 "Modifiers"). Each stage is a pure
// function (kernels, info, mods) → kernels. Later tasks append stages to MORPH_STAGES.
import type { Modifiers } from '../../../types.ts';
import type { BeatTemplateId } from '../beat-templates.ts';

export interface BeatInfo {
  template: BeatTemplateId;
  /** Supraventricular (conducted/junctional/atrial-origin) beat: BBB, WPW-type changes apply. */
  supra: boolean;
  qtMs: number;
  seq: number;
}

export type MorphStage = (k: number[], info: BeatInfo, mods: Modifiers) => number[];

export const MORPH_STAGES: MorphStage[] = [];

export function applyMorphology(k: number[], info: BeatInfo, mods: Modifiers): number[] {
  let out = k;
  for (const stage of MORPH_STAGES) out = stage(out, info, mods);
  return out;
}

/** P-wave modifiers (hyperkalaemia flattening, low voltage, individuality). Later tasks append stages. */
export type PStage = (k: number[], mods: Modifiers) => number[];
export const P_STAGES: PStage[] = [];

export function applyPMorphology(k: number[], mods: Modifiers): number[] {
  let out = k;
  for (const stage of P_STAGES) out = stage(out, mods);
  return out;
}

/** PR additions from modifiers (ms). Later tasks append terms. */
export type PrTerm = (mods: Modifiers) => number;
export const PR_TERMS: PrTerm[] = [];

export function prDeltaMs(mods: Modifiers): number {
  let d = 0;
  for (const f of PR_TERMS) d += f(mods);
  return d;
}
```

Create or replace `packages/engine-core/src/l2/ecg/atria.ts` with exactly:

```ts
// Atrial clock handlers (brief §4.1 "Rhythm engine": atria × AV node; research 03 §1.5).
import { uniform, type Sfc32State } from '../../rng/sfc32.ts';
import { prMs } from './intervals.ts';
import { makeEvent } from './kernels.ts';
import { sinusRR } from './hrv.ts';
import { DEFAULT_FLUTTER_ATRIAL_BPM, RHYTHMS, type AtrialMode, type RhythmDef } from './rhythms.ts';
import { pWaveKernels } from './templates.ts';
import { WPW_PR_MS } from './beat-templates.ts';
import { HOOKS, NEVER, pushPending, rhythmRate, type RhythmCtx, type RhythmState } from './rhythm-state.ts';
import { applyPMorphology, prDeltaMs } from './morphology/index.ts';

// --- constants (sources in comments) -------------------------------------------------------------
const MOBITZ1_DELTA_S = 0.1; // Δ 60–120 ms [03 §1.5]
const MOBITZ1_R = 0.5; // r = 0.5 [03 §1.5]
export const AVB1_DEFAULT_PR_MS = 280; // PR > 200 ms (brief §5) [ENG value]
const FLUTTER_FR_S = 0.26; // F-wave → QRS conduction time [ENG]
const AF_IMPULSE_MEAN_S = 0.2; // atrial impulses, Poisson at 5/s [03 §1.5, Lian 2007]
const AF_IMPULSE_MIN_S = 0.05; // truncation of the Poisson process [ENG]
const AF_DV_MV = 15; // each impulse raises the junction potential by 15 mV [03 §1.5]
const AF_SLOPE_MV_S = 30; // phase-4 depolarisation 30 mV/s [03 §1.5]
/**
 * Rate control [ENG, calibrated by simulation in Stage 1 Task 9]. For a target ventricular rate hr (RR = 60/hr):
 *   threshold θ = AF_THETA_K · RR²; mean wait W ≈ θ / (slope + ΔV·impulseRate); refractory τ_R = RR − W.
 */
const AF_THETA_K = 80;
const AF_DRIVE_MV_S = AF_SLOPE_MV_S + AF_DV_MV / AF_IMPULSE_MEAN_S;
const AF_RATE_CORRECTION = 0.95;
const AF_AV_S = 0.06; // junction → QRS onset [ENG]
const AF_MIN_REFRACTORY_S = 0.25; // RR_min 0.25–0.30 s (brief §4.1 AF fallback) [ENG]
/**
 * AV-node effective refractory period, P to P (Stage 1.1 review H1: "≈250–300 ms"; the low end, so 1:1 conduction
 * holds up to 240/min) [ENG]. Supraventricular impulses are filtered HERE, not by ventricular refractoriness.
 */
export const AV_NODE_ERP_S = 0.25;
/**
 * AF rate calibration (Stage 1.1 review M1) [ENG]: pairs [target bpm, command bpm] — the command fed to the
 * threshold/refractory formulas that yields the target mean ventricular rate (simulated, 600 s × seeds 11–13).
 */
const AF_RATE_CAL: ReadonlyArray<readonly [number, number]> = [
  [20, 30], [40, 45.1], [50, 51.8], [60, 59.1], [70, 68.8], [80, 79.1], [90, 89.0], [100, 101.5], [110, 110.1],
  [120, 116.6], [130, 124.9], [140, 141.3], [150, 160.5], [160, 189.1], [170, 230.8], [180, 274.0],
];

export function atrialRate(st: RhythmState, d: RhythmDef, t: number, ctx: RhythmCtx): number {
  if (d.atria === 'flutter') return st.opts.atrialRateBpm ?? DEFAULT_FLUTTER_ATRIAL_BPM;
  if (d.rateDrives === 'sinus') return rhythmRate(st, t, ctx);
  return st.opts.atrialRateBpm ?? d.atrialDefaultBpm;
}

export function flutterRatio(st: RhythmState, s: Sfc32State): number {
  const r = st.opts.ratio ?? 2;
  if (r === 'variable') return uniform(s) < 0.5 ? 2 : 4;
  return r;
}

/** The command (bpm) that makes the AF junction's mean rate equal `hr` (piecewise-linear in AF_RATE_CAL). */
export function afCommandBpm(hr: number): number {
  const t = AF_RATE_CAL;
  if (hr <= (t[0] as readonly [number, number])[0]) return (t[0] as readonly [number, number])[1];
  for (let i = 1; i < t.length; i++) {
    const [x1, y1] = t[i] as readonly [number, number];
    if (hr <= x1) {
      const [x0, y0] = t[i - 1] as readonly [number, number];
      return y0 + ((hr - x0) * (y1 - y0)) / (x1 - x0);
    }
  }
  return (t[t.length - 1] as readonly [number, number])[1];
}

/** AF junction threshold (mV above reset) for a target ventricular rate `hr`. */
export function afThresholdMv(hr: number): number {
  const rr = (60 * AF_RATE_CORRECTION) / afCommandBpm(hr);
  return AF_THETA_K * rr * rr;
}

/** AF junction refractory period that gives a mean ventricular rate of `hr`. */
export function afRefractoryS(hr: number, minRefractoryS = AF_MIN_REFRACTORY_S): number {
  const rr = (60 * AF_RATE_CORRECTION) / afCommandBpm(hr);
  return Math.max(minRefractoryS, rr - (AF_THETA_K * rr * rr) / AF_DRIVE_MV_S);
}

export function junctionSpontT(st: RhythmState, ctx: RhythmCtx): number {
  const j = st.junction;
  return Math.max(j.vT, j.refUntil) + (afThresholdMv(rhythmRate(st, j.vT, ctx)) - j.v) / AF_SLOPE_MV_S;
}

export function fireJunction(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const d = RHYTHMS[st.id];
  pushPending(st, { t: t + AF_AV_S, origin: 'atrial', template: d.conductedTemplate, prMs: null, pvc: false, coupling: 0, bypass: true });
  const ref = t + afRefractoryS(rhythmRate(st, t, ctx));
  st.junction = { refUntil: ref, v: 0, vT: ref };
}

/** One AF atrial impulse reaching the junction (Lian 2007 integrate-and-fire, research 03 §1.5). */
function junctionImpulse(st: RhythmState, t: number, ctx: RhythmCtx): boolean {
  const j = st.junction;
  if (t < j.refUntil) return false; // concealed
  const v = j.v + AF_SLOPE_MV_S * (t - Math.max(j.vT, j.refUntil)) + AF_DV_MV;
  if (v >= afThresholdMv(rhythmRate(st, t, ctx))) {
    fireJunction(st, t, ctx);
    return true;
  }
  st.junction = { refUntil: j.refUntil, v, vT: t };
  return false;
}

function onFib(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const conducted = junctionImpulse(st, t, ctx);
  st.records.push({ type: 'atrial', t, kind: 'fib', conducted });
  st.atria.nextT = t + AF_IMPULSE_MIN_S - (AF_IMPULSE_MEAN_S - AF_IMPULSE_MIN_S) * Math.log(1 - uniform(ctx.rng.conduction));
}

function onFlutter(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const d = RHYTHMS[st.id];
  // The F wave itself is the continuous sawtooth in st.fwaves (Stage 1.1, ruling R18); this event only drives conduction.
  const conducted = st.atria.groupPos === 0;
  st.atria.groupPos++;
  if (st.atria.groupPos >= st.atria.groupRatio) {
    st.atria.groupPos = 0;
    st.atria.groupRatio = flutterRatio(st, ctx.rng.conduction);
  }
  if (conducted) pushPending(st, { t: t + FLUTTER_FR_S, origin: 'atrial', template: d.conductedTemplate, prMs: FLUTTER_FR_S * 1000, pvc: false, coupling: 0, bypass: false });
  st.records.push({ type: 'atrial', t, kind: 'flutter', conducted });
  st.atria.nextT = t + 60 / atrialRate(st, d, t, ctx);
}

/**
 * AV-node decision for a P wave at time t (brief §4.1 "AV-node sub-models"). Returns the PR in ms, or null when
 * the P is not conducted. Advances the group counter for Wenckebach / Mobitz II / fixed-ratio blocks.
 */
export function conductP(st: RhythmState, rate: number, ctx: RhythmCtx): number | null {
  const d = RHYTHMS[st.id];
  const basePr = (): number => {
    if (st.opts.prMs !== undefined) return st.opts.prMs;
    if (ctx.mods.overrides.prMs !== undefined) return ctx.mods.overrides.prMs;
    if (st.id === 'avb1') return AVB1_DEFAULT_PR_MS;
    if (d.conductedTemplate === 'wpw') return WPW_PR_MS;
    return prMs(rate) + prDeltaMs(ctx.mods);
  };
  // Paced rhythms with conduction underneath (PacerOpts.intrinsic = 'conducted') conduct every P.
  if (d.pacing !== 'none' && st.opts.pacer?.intrinsic === 'conducted') return basePr();
  switch (d.av) {
    case 'conducted':
      return basePr();
    case 'wenckebach': {
      const n = st.opts.groupSize ?? 4;
      const pos = st.atria.groupPos;
      st.atria.groupPos = (pos + 1) % n;
      if (pos >= n - 1) return null;
      // PR_n = PR_1 + Δ·(1 − r^(n−1))/(1 − r)  (brief §4.1), n = pos + 1
      return basePr() + 1000 * MOBITZ1_DELTA_S * ((1 - MOBITZ1_R ** pos) / (1 - MOBITZ1_R));
    }
    default:
      return null;
  }
}

/**
 * conductP plus the AV-node and ventricular gates (Stage 1.1): a P inside the AV node's refractory period is
 * blocked (review H1); after an ectopic beat (PVC, escape) a P whose QRS would land in the ventricle's refractory
 * period is concealed (brief §4.1). A conducted P restarts the AV-node refractory period.
 */
export function conductAt(st: RhythmState, t: number, rate: number, ctx: RhythmCtx): number | null {
  let pr = conductP(st, rate, ctx);
  if (pr !== null) {
    if (t < st.avRefUntil) pr = null;
    else if (st.respectRefractory && !st.lastConducted && t + pr / 1000 < st.refractoryUntil) pr = null;
  }
  if (pr !== null) st.avRefUntil = t + AV_NODE_ERP_S;
  return pr;
}

function onSinus(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const d = RHYTHMS[st.id];
  const rate = atrialRate(st, d, t, ctx);
  st.events.push(makeEvent(t, applyPMorphology(pWaveKernels(), ctx.mods)));
  const pr = conductAt(st, t, rate, ctx);
  if (pr !== null) pushPending(st, { t: t + pr / 1000, origin: 'sinus', template: d.conductedTemplate, prMs: pr, pvc: false, coupling: 0, bypass: false });
  st.records.push({ type: 'atrial', t, kind: 'p', conducted: pr !== null });
  st.atria.lastT = t;
  st.atria.nextT = t + sinusRR(60 / rate, t, ctx.hrv, ctx.mods, ctx.rng.hrv);
  for (const h of HOOKS.onP) h(st, t, ctx);
}

export type AtrialHandler = (st: RhythmState, t: number, ctx: RhythmCtx) => void;

/** One handler per atrial mode. Later tasks add 'ectopic' and 'multifocal'. */
export const ATRIAL_HANDLERS: Partial<Record<AtrialMode, AtrialHandler>> = {
  sinus: onSinus,
  flutter: onFlutter,
  fib: onFib,
};

export function onAtrial(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const h = ATRIAL_HANDLERS[RHYTHMS[st.id].atria];
  if (h) h(st, t, ctx);
  else st.atria.nextT = NEVER;
}
```

Create or replace `packages/engine-core/src/l2/ecg/foci.ts` with exactly:

```ts
// Ventricular / junctional focus handlers (brief §4.1 "ventricle.focus"; research 03 §1.5). A focus is a primary
// pacemaker: it schedules its own beats (bypassing the refractory check) and its next firing time.
import { uniform } from '../../rng/sfc32.ts';
import { RHYTHMS, type FocusMode } from './rhythms.ts';
import { pushPending, rhythmRate, type RhythmCtx, type RhythmState } from './rhythm-state.ts';

export const VT_JITTER_S = 0.004; // ±4 ms cycle-length jitter [ENG]

function onVt(st: RhythmState, t: number, ctx: RhythmCtx): void {
  pushPending(st, { t, origin: 'ventricular', template: 'wide', prMs: null, pvc: false, coupling: 0, bypass: true, scale: 0.9 });
  st.focusNextT = t + 60 / rhythmRate(st, t, ctx) + VT_JITTER_S * (2 * uniform(ctx.rng.ectopy) - 1);
}

function onAvnrt(st: RhythmState, t: number, ctx: RhythmCtx): void {
  pushPending(st, { t, origin: 'junctional', template: 'narrowRetroP', prMs: null, pvc: false, coupling: 0, bypass: true });
  st.records.push({ type: 'atrial', t: t + 0.07, kind: 'retrograde', conducted: false });
  st.focusNextT = t + 60 / rhythmRate(st, t, ctx) + VT_JITTER_S * (2 * uniform(ctx.rng.ectopy) - 1);
}

export type FocusHandler = (st: RhythmState, t: number, ctx: RhythmCtx) => void;

/** One handler per focus mode. Later tasks add junctional, avrt, idioventricular, vtPoly, torsades, agonal. */
export const FOCUS_HANDLERS: Partial<Record<FocusMode, FocusHandler>> = {
  vt: onVt,
  svt: onAvnrt,
};

export function onFocus(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const h = FOCUS_HANDLERS[RHYTHMS[st.id].focus];
  st.focusN++;
  if (h) h(st, t, ctx);
  else st.focusNextT = 1e12;
}
```

Create or replace `packages/engine-core/src/l2/ecg/ectopy.ts` with exactly:

```ts
// Ectopy drawn per supraventricular beat (brief §4.1 "per sinus beat: draw ectopy"). This is the Stage 1 PVC
// behaviour (single, bigeminy) moved out of the rhythm engine; Task 7 replaces this file with the full set.
import { uniform } from '../../rng/sfc32.ts';
import { RHYTHMS } from './rhythms.ts';
import { atrialRate } from './atria.ts';
import { pushPending, rhythmRate, type PendingV, type RhythmCtx, type RhythmState } from './rhythm-state.ts';

const PVC_COUPLING_MIN = 0.55; // PVC coupling 40–80% of RR (brief §5); drawn 55–65% [ENG]
const PVC_COUPLING_SPAN = 0.1;

/** The prevailing supraventricular RR (s) at time t. */
export function prevailingRR(st: RhythmState, t: number, ctx: RhythmCtx): number {
  const d = RHYTHMS[st.id];
  return 60 / Math.max(20, atrialRate(st, d, t, ctx) || rhythmRate(st, t, ctx) || 60);
}

/** Called after every activated supraventricular beat p (QRS onset t; T peak tPeakS after onset, used by Task 7). */
export function afterSupraBeat(st: RhythmState, _p: PendingV, t: number, ctx: RhythmCtx, _tPeakS = 0.3): void {
  const pvc = ctx.mods.pvc;
  if (!pvc) return;
  const fire = pvc.pattern === 'bigeminy' || uniform(ctx.rng.ectopy) < pvc.probability;
  if (!fire) return;
  const rr = prevailingRR(st, t, ctx);
  const frac = PVC_COUPLING_MIN + PVC_COUPLING_SPAN * uniform(ctx.rng.ectopy);
  // Never inside the refractory period of the beat that triggered it: 5 ms after it ends at the earliest [ENG]
  const tp = Math.max(t + frac * rr, st.refractoryUntil + 0.005);
  pushPending(st, { t: tp, origin: 'ventricular', template: 'wide', prMs: null, pvc: true, coupling: (tp - t) / rr, bypass: false });
}
```

Create or replace `packages/engine-core/src/l2/ecg/rhythm-engine.ts` with exactly:

```ts
// Rhythm engine (brief §4.1 "Rhythm engine", §4.8 k_rhythm; research 03 §1.5). Separate atrial and
// ventricular clocks with an AV-node state machine, after Squiggler's atria × cadence × ventricle layering.
// It is a discrete-event planner: planUntil(T) processes every internal event up to T and appends kernel
// events (for the sample generator) and beat/atrial records (for the event stream). Atrial modes live in
// atria.ts, foci in foci.ts, ectopy in ectopy.ts, k_rhythm in mech.ts, morphology modifiers in morphology/.
import { normal } from '../../rng/sfc32.ts';
import type { BeatOrigin, EngineEvent, RhythmId, RhythmOpts } from '../../types.ts';
import { lvetMs, qtFridericiaMs } from './intervals.ts';
import { makeEvent, qrsSpanMs } from './kernels.ts';
import { respSin } from './hrv.ts';
import { FLUTTER_DIR, FWAVE_DIR, flutterHarmonics, kernelQtMs } from './templates.ts';
import { beatKernels, fiducialOf, rotateZ, tPeakS, type BeatTemplateId } from './beat-templates.ts';
import { RHYTHMS, type RhythmDef } from './rhythms.ts';
import { afterSupraBeat } from './ectopy.ts';
import { atrialRate, fireJunction, flutterRatio, junctionSpontT, onAtrial } from './atria.ts';
import { onFocus } from './foci.ts';
import { BASE_SV_ML, kRhythm } from './mech.ts';
import { applyMorphology } from './morphology/index.ts';
import { HOOKS, NEVER, clamp, rhythmRate, type FWave, type PendingV, type RhythmCtx, type RhythmState } from './rhythm-state.ts';
import { uniform, type Sfc32State } from '../../rng/sfc32.ts';

export { NEVER, type FWave, type PendingV, type RhythmCtx, type RhythmState } from './rhythm-state.ts';
export { afCommandBpm, afRefractoryS, afThresholdMv } from './atria.ts';

const ESCAPE_JITTER_SD_S = 0.01; // [ENG]
const LONG_QT_QTC_MS = 520; // long QT: QTc 480–600 (research 03 §1.6) [ENG value]
const REFRACTORY_QT_FRACTION = 0.8; // refractoryUntil = t + QRS + 0.8·QT (brief §4.1) [ENG]
const QRS_AMP_RESP_MOD = 0.08; // respiration modulates R by ±5–15% (brief §4.1)
const WIDE_TEMPLATES: ReadonlySet<BeatTemplateId> = new Set(['wide', 'pacedV', 'pvc2', 'pvc3', 'agonal']);

export function isWide(t: BeatTemplateId): boolean {
  return WIDE_TEMPLATES.has(t);
}

export function createRhythmState(id: RhythmId, opts: RhythmOpts, t0: number, ctx: RhythmCtx): RhythmState {
  const st: RhythmState = {
    id: 'asystole',
    opts: {},
    respectRefractory: true,
    planT: t0,
    atria: { nextT: NEVER, groupPos: 0, groupRatio: 2, lastT: -NEVER, pac: null },
    junction: { refUntil: t0, v: 0, vT: t0 },
    pending: [],
    focusNextT: NEVER,
    focusN: 0,
    startT: t0,
    focusAxis: 0,
    escapeNextT: NEVER,
    refractoryUntil: -NEVER,
    avRefUntil: -NEVER,
    lastConducted: false,
    lastVT: -NEVER,
    lastSupraT: -NEVER,
    lastWasPvc: false,
    ectopyCount: 0,
    fwaves: [],
    events: [],
    records: [],
    beatSeq: 0,
    pendingSwitch: null,
  };
  applyRhythm(st, id, opts, t0, true, ctx);
  return st;
}

export function escapeRate(st: RhythmState, d: RhythmDef, t: number, ctx: RhythmCtx): number {
  if (d.escape === 'none') return 0;
  return d.rateDrives === 'escape' ? rhythmRate(st, t, ctx) : d.backupEscapeBpm;
}

function drawFWave(t0: number, s: Sfc32State): FWave {
  // 3 random-phase sinusoids at 5–9 Hz, 0.03–0.05 mV each (brief §4.1: 2–4 at 5–9 Hz, 0.02–0.15 mV) [ENG]
  const f: number[] = [];
  const ph: number[] = [];
  const a: number[] = [];
  for (let i = 0; i < 3; i++) {
    f.push(5 + 4 * uniform(s));
    ph.push(2 * Math.PI * uniform(s));
    a.push(0.03 + 0.02 * uniform(s));
  }
  return { kind: 'fib', start: t0, end: NEVER, f, ph, a, dir: [...FWAVE_DIR] };
}

/** End every open atrial wave of this kind at t. */
function endFWaves(st: RhythmState, kind: FWave['kind'], t: number): void {
  for (const fw of st.fwaves) if (fw.kind === kind && fw.end >= NEVER) fw.end = t;
}

/**
 * Switch rhythm at time `at` (clamped to the planning frontier, so already-planned beats are kept).
 * Called by createRhythmState, by the engine's setRhythm, and by a deferred 'nextBeat' switch.
 */
export function applyRhythm(st: RhythmState, id: RhythmId, opts: RhythmOpts, at: number, respectRefractory: boolean, ctx: RhythmCtx): void {
  const prev = RHYTHMS[st.id];
  const d = RHYTHMS[id];
  const t0 = Math.max(at, st.planT);
  const wasFib = prev.atria === 'fib';
  st.id = id;
  st.opts = { ...opts };
  st.respectRefractory = respectRefractory;
  st.pendingSwitch = null;

  // Atria. A new sinus rhythm's first P comes 100 ms after the switch (so it is never inside the switch tick) [ENG];
  // flutter/AF atria start at once.
  if (d.atria === 'none') st.atria.nextT = NEVER;
  else if (d.atria !== prev.atria || st.atria.nextT >= NEVER) st.atria.nextT = t0 + (d.atria === 'sinus' ? 0.1 : 0);
  st.atria.groupPos = 0;
  st.atria.groupRatio = d.atria === 'flutter' ? flutterRatio(st, ctx.rng.conduction) : 2;
  st.atria.pac = null;

  // AF: f-waves and the integrate-and-fire junction
  if (d.atria === 'fib' && !wasFib) {
    const fw = drawFWave(t0, ctx.rng.conduction);
    st.fwaves.push(fw);
    st.junction = { refUntil: t0, v: 0, vT: t0 };
  }
  if (d.atria !== 'fib' && wasFib) endFWaves(st, 'fib', t0);

  // Flutter: a continuous sawtooth phase-locked to the F events (ruling R18); rebuilt only if the rate changes
  if (d.atria === 'flutter') {
    const rate = atrialRate(st, d, t0, ctx);
    const open = st.fwaves.find((fw) => fw.kind === 'flutter' && fw.end >= NEVER);
    if (!open || open.rateBpm !== rate) {
      const anchor = st.atria.nextT;
      endFWaves(st, 'flutter', anchor);
      st.fwaves.push({ kind: 'flutter', start: anchor, end: NEVER, ...flutterHarmonics(anchor, rate), dir: [...FLUTTER_DIR], rateBpm: rate });
    }
  } else endFWaves(st, 'flutter', t0);

  // Ventricular / junctional focus. The first focus beat fires 50 ms after the switch, or 10 ms after the ventricle
  // recovers [ENG].
  st.focusNextT = d.focus === 'none' ? NEVER : Math.max(t0 + 0.05, st.refractoryUntil + 0.01);
  st.focusN = 0;
  st.startT = t0;

  // Escape timer
  const er = escapeRate(st, d, t0, ctx);
  st.escapeNextT = er > 0 ? Math.max(t0, st.lastVT) + 60 / er : NEVER;
  const prevId = prevIdOf(prev);
  for (const h of HOOKS.onApply) h(st, prevId, t0, ctx);
}

function prevIdOf(d: RhythmDef): RhythmId {
  return (Object.keys(RHYTHMS) as RhythmId[]).find((k) => RHYTHMS[k] === d) ?? 'asystole';
}

/** A beat conducted from the atria (sinus P, flutter F, AF junction, PAC) rather than a ventricular or junctional pacemaker. */
function isConducted(p: PendingV): boolean {
  return !p.pvc && (p.origin === 'sinus' || p.origin === 'atrial');
}

/** Activate the ventricles for pending beat p. Returns false when the beat is concealed (refractory). */
export function activateVentricle(st: RhythmState, p: PendingV, ctx: RhythmCtx): boolean {
  const t = p.t;
  // Concealed if the ventricle is refractory (brief §4.1). Primary pacemakers (p.bypass) are exempt: foci, the AF
  // junction and PVC runs set their own cycle [ENG]. A conducted beat after a conducted beat is exempt too: the AV
  // node (AV_NODE_ERP_S in atria.ts) limits supraventricular conduction (Stage 1.1, review H1).
  const afterConducted = isConducted(p) && st.lastConducted;
  if (st.respectRefractory && !p.bypass && !afterConducted && t < st.refractoryUntil) return false;
  const d = RHYTHMS[st.id];
  const rate = rhythmRate(st, t, ctx);
  const rr = st.lastVT > -NEVER / 2 ? t - st.lastVT : 60 / Math.max(30, rate || 60);
  const qtc = ctx.mods.longQT ? Math.max(ctx.mods.qtc, LONG_QT_QTC_MS) : ctx.mods.qtc;
  const qtBase = ctx.mods.overrides.qtMs ?? qtFridericiaMs(clamp(rr, 0.25, 2), qtc);
  const wide = isWide(p.template);
  const scale = p.scale ?? (wide ? 1 : 1 + QRS_AMP_RESP_MOD * respSin(t, ctx.hrv));
  const supra = !p.pvc && !wide && p.origin !== 'ventricular' && p.origin !== 'paced';
  const raw = beatKernels(p.template, qtBase, scale, p.pre ?? 1);
  if (p.twistRad) rotateZ(raw, p.twistRad);
  const k = applyMorphology(raw, { template: p.template, supra, qtMs: qtBase, seq: st.beatSeq }, ctx.mods);
  st.events.push(makeEvent(t, k));
  const qrsMs = qrsSpanMs(k);
  const qtDrawn = kernelQtMs(k);
  const kSV = kRhythm(st, p, rr);
  const beat: EngineEvent = {
    type: 'beat',
    t: t + fiducialOf(k),
    seq: st.beatSeq++,
    origin: p.origin,
    template: p.pvc ? 'pvc' : p.template,
    qrsMs,
    qtMs: Math.round(qtDrawn),
    mech: { perfused: kSV > 0, kSV, svMl: Math.round(BASE_SV_ML * kSV), lvetMs: Math.round(Math.max(150, lvetMs(60 / rr))) },
  };
  if (p.prMs !== null) beat.prMs = Math.round(p.prMs);
  st.records.push(beat);
  st.refractoryUntil = t + qrsMs / 1000 + (REFRACTORY_QT_FRACTION * qtDrawn) / 1000;
  st.lastVT = t;
  // A beat that is not the focus's own (a sinus capture during VT) depolarises the ventricle and resets the focus,
  // so the focus cannot fire 15–40 ms later on top of it (Stage 1.1, review M2) [ENG].
  if (d.focus !== 'none' && !p.bypass) st.focusNextT = t + 60 / rate;
  const er = escapeRate(st, d, t, ctx);
  st.escapeNextT = er > 0 ? t + 60 / er + (d.rateDrives === 'escape' ? ESCAPE_JITTER_SD_S * ctx.mods.hrvScale * normal(ctx.rng.hrv) : 0) : NEVER;

  if (supra) {
    st.lastSupraT = t;
    afterSupraBeat(st, p, t, ctx, tPeakS(k));
  }
  st.lastWasPvc = p.pvc;
  st.lastConducted = isConducted(p);
  for (const h of HOOKS.onBeat) h(st, p, ctx);

  if (st.pendingSwitch) {
    const sw = st.pendingSwitch;
    applyRhythm(st, sw.id, sw.opts, t + 0.001, sw.respectRefractory, ctx);
  }
  return true;
}

function onEscape(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const d = RHYTHMS[st.id];
  const origin: BeatOrigin = d.escape === 'ventricular' ? 'ventricular' : 'junctional';
  const ok = activateVentricle(st, { t, origin, template: d.escapeTemplate, prMs: null, pvc: false, coupling: 0, bypass: false }, ctx);
  if (!ok) {
    const er = escapeRate(st, d, t, ctx);
    st.escapeNextT = er > 0 ? Math.max(t, st.refractoryUntil) + 60 / er : NEVER;
  }
}

/** Extra event sources (pacing, TCP, VF bookkeeping, lead-off): the time of their next event and its handler. */
export interface ClockSource {
  next(st: RhythmState, ctx: RhythmCtx): number;
  fire(st: RhythmState, t: number, ctx: RhythmCtx): void;
}
const EXTRA_CLOCKS: ClockSource[] = [];

HOOKS.activate = activateVentricle;
HOOKS.apply = applyRhythm;

/** Process every internal rhythm event with time ≤ T. */
export function planUntil(st: RhythmState, T: number, ctx: RhythmCtx): void {
  for (let guard = 0; guard < 1_000_000; guard++) {
    const d = RHYTHMS[st.id];
    const tA = d.atria === 'none' ? NEVER : st.atria.nextT;
    const tP = st.pending.length > 0 ? (st.pending[0] as PendingV).t : NEVER;
    const tF = d.focus === 'none' ? NEVER : st.focusNextT;
    const tE = d.escape === 'none' ? NEVER : st.escapeNextT;
    const tJ = d.av === 'integrateFire' ? junctionSpontT(st, ctx) : NEVER;
    let tX = NEVER;
    let src: ClockSource | null = null;
    for (const c of EXTRA_CLOCKS) {
      const tc = c.next(st, ctx);
      if (tc < tX) {
        tX = tc;
        src = c;
      }
    }
    const t = Math.min(tA, tP, tF, tE, tJ, tX);
    // A NaN/Infinity rate would otherwise make every clock NaN and spin to the guard on every tick (review M5).
    if (!Number.isFinite(t)) throw new RangeError(`rhythm ${st.id}: next event time is ${t}`);
    if (t > T) break;
    if (t === tA) onAtrial(st, t, ctx);
    else if (t === tJ) fireJunction(st, t, ctx);
    else if (t === tP) activateVentricle(st, st.pending.shift() as PendingV, ctx);
    else if (t === tF) onFocus(st, t, ctx);
    else if (t === tE) onEscape(st, t, ctx);
    else if (src) src.fire(st, t, ctx);
  }
  st.planT = Math.max(st.planT, T);
}

export { atrialRate };
```


- [x] **Step 4: Run the tests and the type check**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck && npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run`

Expected: PASS (no failures; the Stage 1 tests keep passing).

- [x] **Step 5: Expected: every Stage 1 test passes unchanged except `test/engine/engine-commands.test.ts` › "dispatch accepts Stage 1 commands…", which still expects `vfCoarse` to be an unknown rhythm and `bbb` to be rejected — Task 4 updates those two lines together with the engine seam. If anything else fails, the refactor changed behaviour: compare the function you moved with its Stage 1 original in `git show HEAD~1:packages/engine-core/src/l2/ecg/rhythm-engine.ts`.**

- [x] **Step 6: Commit**

```bash
git add packages/engine-core/src/l2/ecg/api-types.ts packages/engine-core/src/l2/ecg/atria.ts packages/engine-core/src/l2/ecg/ectopy.ts packages/engine-core/src/l2/ecg/foci.ts packages/engine-core/src/l2/ecg/mech.ts packages/engine-core/src/l2/ecg/modifier-schema.ts packages/engine-core/src/l2/ecg/morphology/index.ts packages/engine-core/src/l2/ecg/rhythm-engine.ts packages/engine-core/src/l2/ecg/rhythm-state.ts packages/engine-core/src/l2/ecg/rhythms.ts packages/engine-core/src/modifiers.ts packages/engine-core/src/types.ts packages/engine-core/test/l2/ecg/s5/modifiers.test.ts
git commit -m "refactor(ecg): stage 5 types, 36-rhythm table and modular rhythm engine (stage 1 parity)"
```

---

### Task 4: Engine seams: modifier validation/merge, ECG generation hook, per-lead front end

The only engine.ts change in this stage (see "Parallel-work rules"): `setModifiers` validation and merge come from engine-core's ECG modules; sample generation goes through `generateEcg` (Stage 1's `generateVcg` plus registered continuous VCG sources); every lane sample passes through `ecgFrontEnd` (registered per-lead electrode/amplifier stages) before the L3 filter.

**Files:**
- Create: `packages/engine-core/src/l2/ecg/ecg-gen.ts`
- Modify: `packages/engine-core/src/engine.ts` (7 small hunks)
- Modify: `packages/engine-core/src/types.ts` (Command.setModifiers uses `ModifiersPatch`)
- Modify: `packages/engine-core/test/engine/engine-commands.test.ts` (2 lines)
- Test: `packages/engine-core/test/engine/engine-seams.test.ts`

**Interfaces:**
- Consumes: Task 3 (`validateModifiers`, `mergeModifiers`, `RhythmState`).
- Produces: `EcgGenInputs extends GenInputs { mods; st: RhythmState; mainsHz: 50 | 60; artefactRng }`, `VcgSource = (g, n, s, acc: Float64Array) => void`, `VCG_SOURCES: VcgSource[]`, `FrontEndStage = (mods, mainsHz, lead, n, v) => number`, `FRONT_END_STAGES`, `ecgGenInputs(ps, mainsHz)`, `generateEcg(g, from, to, sink)`, `ecgFrontEnd(mods, mainsHz, lead, n, v)`.

- [x] **Step 1: Write the failing test**

Create or replace `packages/engine-core/test/engine/engine-seams.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { Command, EngineEvent } from '../../src/types.ts';

const cmd = (c: Record<string, unknown>, id = 'x'): Command => ({ id, issuedBy: 'test', ...c }) as Command;

describe('engine seams (Stage 5)', () => {
  it('setModifiers accepts every Stage 5 key and merges artefact levels key by key', () => {
    const e = createEngine({ seed: 3 });
    expect(e.dispatch(cmd({ type: 'setModifiers', modifiers: { bbb: 'rbbb', k: 6, artefact: { mains: 0.2 } } })).accepted).toBe(true);
    expect(e.dispatch(cmd({ type: 'setModifiers', modifiers: { artefact: { emg: 0.1 } } })).accepted).toBe(true);
    expect(e.dispatch(cmd({ type: 'setModifiers', modifiers: { tempC: 50 } })).reason).toMatch(/tempC/);
    e.advanceTo(2);
    const st = e.snapshot().state as { st: { mods: { artefact: { noise: number; mains: number; emg: number }; bbb: string } } };
    expect(st.st.mods.artefact).toMatchObject({ noise: 1, mains: 0.2, emg: 0.1 });
    expect(st.st.mods.bbb).toBe('rbbb');
  });

  it('every Stage 5 rhythm id is accepted and produces events without throwing', () => {
    const e = createEngine({ seed: 2 });
    const ev: EngineEvent[] = [];
    e.on((x) => ev.push(x));
    for (const [i, rhythm] of ['torsades', 'vtPoly', 'junctionalTachy', 'avb2to1', 'pacedVVI', 'vfCoarse', 'agonal'].entries()) {
      expect(e.dispatch(cmd({ type: 'setRhythm', rhythm }, `r${i}`)).accepted).toBe(true);
      e.advanceTo(5 * (i + 1));
    }
    expect(ev.filter((x) => x.type === 'measurement').length).toBeGreaterThan(30);
  });
});
```


- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/engine-seams.test.ts`

Expected: FAIL — the engine still rejects `bbb`, `k` and `artefact.mains` ("modifiers not implemented until later stages").

- [x] **Step 3: Implement**

Create or replace `packages/engine-core/src/l2/ecg/ecg-gen.ts` with exactly:

```ts
// Stage 5 ECG generation seam. The engine calls generateEcg (instead of Stage 1's generateVcg directly) and passes
// every lane sample through ecgFrontEnd before the L3 filter. Continuous VCG sources (VF texture, AF f-wave
// texture, CPR, EMG, wander, TCP artefact) register in VCG_SOURCES; per-lead electrode/amplifier effects (mains,
// motion, lead-off, diathermy, defibrillator saturation) register in FRONT_END_STAGES. Artefacts are summed
// BEFORE the L3 monitor filter (brief §3.2, §5).
import type { Sfc32State, StreamName } from '../../rng/sfc32.ts';
import type { LeadId, Modifiers } from '../../types.ts';
import { ECG_RATE, generateVcg, type GenInputs } from './generator.ts';
import type { HrvPhase } from './hrv.ts';
import type { RhythmState } from './rhythm-state.ts';

export interface EcgGenInputs extends GenInputs {
  mods: Modifiers;
  st: RhythmState;
  mainsHz: 50 | 60;
  artefactRng: Sfc32State;
}

/** Adds a continuous contribution for sample n (time s) into acc[0..2] (VCG mV). May mutate state inside g.st. */
export type VcgSource = (g: EcgGenInputs, n: number, s: number, acc: Float64Array) => void;
export const VCG_SOURCES: VcgSource[] = [];

/** Maps one projected lead sample v (mV) to what the amplifier delivers. Must be a pure function of its inputs. */
export type FrontEndStage = (mods: Modifiers, mainsHz: 50 | 60, lead: LeadId, n: number, v: number) => number;
export const FRONT_END_STAGES: FrontEndStage[] = [];

export function ecgGenInputs(
  ps: { rhythm: RhythmState; mods: Modifiers; hrv: HrvPhase; rng: Record<StreamName, Sfc32State> },
  mainsHz: 50 | 60,
): EcgGenInputs {
  return {
    events: ps.rhythm.events,
    fwaves: ps.rhythm.fwaves,
    hrv: ps.hrv,
    noiseLevel: ps.mods.artefact.noise,
    noise: ps.rng.noise,
    mods: ps.mods,
    st: ps.rhythm,
    mainsHz,
    artefactRng: ps.rng.artefact,
  };
}

/** Stage 1's generateVcg plus the registered continuous sources. */
export function generateEcg(g: EcgGenInputs, from: number, to: number, sink: (index: number, x: number, y: number, z: number) => void): void {
  const acc = new Float64Array(3);
  generateVcg(g, from, to, (n, x, y, z) => {
    acc[0] = x;
    acc[1] = y;
    acc[2] = z;
    const s = n / ECG_RATE;
    for (const src of VCG_SOURCES) src(g, n, s, acc);
    sink(n, acc[0] as number, acc[1] as number, acc[2] as number);
  });
}

/** Electrode/amplifier front end for one lead sample. */
export function ecgFrontEnd(mods: Modifiers, mainsHz: 50 | 60, lead: LeadId, n: number, v: number): number {
  let out = v;
  for (const f of FRONT_END_STAGES) out = f(mods, mainsHz, lead, n, out);
  return out;
}
```

In `packages/engine-core/src/types.ts`, replace:

```ts
| { type: 'setModifiers'; modifiers: Partial<Modifiers>; ramp?: Ramp }
```

with:

```ts
| { type: 'setModifiers'; modifiers: ModifiersPatch; ramp?: Ramp }
```

In `packages/engine-core/src/types.ts`, replace:

```ts
import type { Modifiers, RhythmId, RhythmOpts } from './l2/ecg/api-types.ts';
```

with:

```ts
import type { ModifiersPatch, RhythmId, RhythmOpts } from './l2/ecg/api-types.ts';
```

In `packages/engine-core/src/engine.ts`, replace:

```ts
import { ECG_RATE, generateVcg, pruneEvents } from './l2/ecg/generator.ts';
```

with:

```ts
import { ECG_RATE, pruneEvents } from './l2/ecg/generator.ts';
import { ecgFrontEnd, ecgGenInputs, generateEcg } from './l2/ecg/ecg-gen.ts';
```

In `packages/engine-core/src/engine.ts`, replace:

```ts
import { defaultModifiers } from './modifiers.ts';
```

with:

```ts
import { defaultModifiers, mergeModifiers, validateModifiers } from './modifiers.ts';
```

In `packages/engine-core/src/engine.ts`, replace:

```ts
const MOD_KEYS = new Set(['pvc', 'rsa', 'hrvScale', 'qtc', 'artefact']);
```

with:

```ts
(nothing — delete it)
```

In `packages/engine-core/src/engine.ts`, replace:

```ts
    generateVcg(
      { events: ps.rhythm.events, fwaves: ps.rhythm.fwaves, hrv: ps.hrv, noiseLevel: ps.mods.artefact.noise, noise: ps.rng.noise },
      ps.n,
```

with:

```ts
    generateEcg(
      ecgGenInputs(ps, this.mainsHz),
      ps.n,
```

In `packages/engine-core/src/engine.ts`, replace:

```ts
          const v = filterSample(sections, ps.laneFilter[i] as number[], projectLead(ps.lanes[i] as LeadId, x, y, z));
```

with:

```ts
          const lead = ps.lanes[i] as LeadId;
          const v = filterSample(sections, ps.laneFilter[i] as number[], ecgFrontEnd(ps.mods, this.mainsHz, lead, n, projectLead(lead, x, y, z)));
```

In `packages/engine-core/src/engine.ts`, replace:

```ts
        const r = qrsStep(ps.qrs, filterSample(sections, ps.detFilter, projectLead(DETECTION_LEAD, x, y, z)));
```

with:

```ts
        const r = qrsStep(ps.qrs, filterSample(sections, ps.detFilter, ecgFrontEnd(ps.mods, this.mainsHz, DETECTION_LEAD, n, projectLead(DETECTION_LEAD, x, y, z))));
```

In `packages/engine-core/src/engine.ts`, replace:

```ts
        const m = cmd.modifiers;
        const bad = Object.keys(m).filter((k) => !MOD_KEYS.has(k));
        if (bad.length) return `modifiers not implemented until later stages: ${bad.join(', ')}`;
        const p = m.pvc;
        if (p && !(p.pattern === 'single' || p.pattern === 'bigeminy')) return 'pvc.pattern must be single or bigeminy in Stage 1';
        if (p && !(p.probability >= 0 && p.probability <= 0.9)) return 'pvc.probability must be 0–0.9';
        return (
          numReason('rsa', m.rsa, 0, 1) ??
          numReason('hrvScale', m.hrvScale, 0, 3) ??
          numReason('qtc', m.qtc, 300, 650) ??
          numReason('artefact.noise', m.artefact?.noise, 0, 10) ??
          rampReason(cmd.ramp)
        );
```

with:

```ts
        return validateModifiers(cmd.modifiers) ?? rampReason(cmd.ramp);
```

In `packages/engine-core/src/engine.ts`, replace:

```ts
        const m = cmd.modifiers;
        ps.mods = { ...ps.mods, ...m, artefact: { ...ps.mods.artefact, ...(m.artefact ?? {}) } };
        return;
```

with:

```ts
        ps.mods = mergeModifiers(ps.mods, cmd.modifiers);
        return;
```

In `packages/engine-core/test/engine/engine-commands.test.ts`, replace:

```ts
expect(e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse' })).reason).toMatch(/unknown rhythm/);
```

with:

```ts
expect(e.dispatch(cmd({ type: 'setRhythm', rhythm: 'notARhythm' })).reason).toMatch(/unknown rhythm/);
```

In `packages/engine-core/test/engine/engine-commands.test.ts`, replace:

```ts
expect(e.dispatch(cmd({ type: 'setModifiers', modifiers: { bbb: 'lbbb' } })).accepted).toBe(false);
```

with:

```ts
expect(e.dispatch(cmd({ type: 'setModifiers', modifiers: { bogus: 1 } })).reason).toMatch(/unknown modifiers/);
```


- [x] **Step 4: Run the tests and the type check**

Run: `npx -y pnpm@9.15.9 -r typecheck && npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run`

Expected: PASS (no failures; the Stage 1 tests keep passing).

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/engine.ts packages/engine-core/src/l2/ecg/ecg-gen.ts packages/engine-core/src/types.ts packages/engine-core/test/engine/engine-commands.test.ts packages/engine-core/test/engine/engine-seams.test.ts
git commit -m "feat(engine): stage 5 seams — modifier schema, ECG source registry, per-lead front end"
```

---

### Task 5: Stage 5 test helpers; sinus arrhythmia and sinus pause

Shared test helpers for every later task (plan-only runner, sample runner through the real generator and front end, kernel probes, a one-beat morphology probe), then the two remaining sinus rhythms.

**Files:**
- Create: `packages/engine-core/test/helpers/s5.ts`
- Modify: `packages/engine-core/src/l2/ecg/atria.ts` (`nextSinusT`)
- Test: `packages/engine-core/test/l2/ecg/s5/sinus.test.ts`

**Interfaces:**
- Consumes: Tasks 3–4.
- Produces (test helpers): `run5(id, seconds, { hr?, seed?, mods?: ModifiersPatch, rhythmOpts? }) → { st, ctx, mods, beats, atrial, markers, records }`; `samples5(id, seconds, leads, opts & { mainsHz? }) → … & { lead: Record<LeadId, Float64Array> }` (pre-filter lead samples through `generateEcg` + `ecgFrontEnd`, planned 150 ms ahead in 20 ms chunks exactly like the engine); `kernelLead(k, lead, s)`; `eventsWith(st, wave)`; `morphBeat(patch, seq?, template?)`; `mean`, `sd`, `diffs`; types `Beat`, `Atrial`, `Marker`.

- [x] **Step 1: Write the failing test**

Create or replace `packages/engine-core/test/helpers/s5.ts` with exactly:

```ts
// Stage 5 test helpers: run the rhythm engine (and optionally the sample generator) with a modifier patch.
import { defaultModifiers, mergeModifiers } from '../../src/modifiers.ts';
import { createRngState } from '../../src/rng/sfc32.ts';
import { drawHrvPhase } from '../../src/l2/ecg/hrv.ts';
import { createRhythmState, planUntil, type RhythmCtx, type RhythmState } from '../../src/l2/ecg/rhythm-engine.ts';
import { RHYTHMS } from '../../src/l2/ecg/rhythms.ts';
import { ecgFrontEnd, ecgGenInputs, generateEcg } from '../../src/l2/ecg/ecg-gen.ts';
import { pruneEvents } from '../../src/l2/ecg/generator.ts';
import { projectLeads } from '../../src/l2/ecg/vcg.ts';
import { K_STRIDE, WAVE } from '../../src/l2/ecg/kernels.ts';
import { beatKernels } from '../../src/l2/ecg/beat-templates.ts';
import { applyMorphology } from '../../src/l2/ecg/morphology/index.ts';
import { LEAD_IDS, type EngineEvent, type LeadId, type Modifiers, type ModifiersPatch, type RhythmId, type RhythmOpts } from '../../src/types.ts';

export type Beat = Extract<EngineEvent, { type: 'beat' }>;
export type Atrial = Extract<EngineEvent, { type: 'atrial' }>;
export type Marker = Extract<EngineEvent, { type: 'marker' }>;

export interface S5Opts {
  hr?: number;
  seed?: number;
  mods?: ModifiersPatch;
  rhythmOpts?: RhythmOpts;
}

export interface S5Run {
  st: RhythmState;
  ctx: RhythmCtx;
  mods: Modifiers;
  beats: Beat[];
  atrial: Atrial[];
  markers: Marker[];
  records: EngineEvent[];
}

/** Plan `seconds` of rhythm (no samples). HRV and noise stay at their defaults unless the patch changes them. */
export function run5(id: RhythmId, seconds: number, o: S5Opts = {}): S5Run {
  const rng = createRngState(o.seed ?? 1);
  const mods = mergeModifiers(defaultModifiers(), o.mods ?? {});
  const hr = o.hr ?? RHYTHMS[id].defaultRateBpm;
  const ctx: RhythmCtx = { hrAt: () => hr, mods, rng, hrv: drawHrvPhase(rng.hrv) };
  const st = createRhythmState(id, o.rhythmOpts ?? {}, 0, ctx);
  planUntil(st, seconds, ctx);
  const records = st.records;
  return {
    st, ctx, mods, records,
    beats: records.filter((r): r is Beat => r.type === 'beat'),
    atrial: records.filter((r): r is Atrial => r.type === 'atrial'),
    markers: records.filter((r): r is Marker => r.type === 'marker'),
  };
}

/** Plan and generate `seconds` of samples; returns the requested leads (pre-filter, through the front end). */
export function samples5(id: RhythmId, seconds: number, leads: readonly LeadId[], o: S5Opts & { mainsHz?: 50 | 60 } = {}): S5Run & { lead: Record<string, Float64Array> } {
  const rng = createRngState(o.seed ?? 1);
  const mods = mergeModifiers(defaultModifiers(), o.mods ?? {});
  const hr = o.hr ?? RHYTHMS[id].defaultRateBpm;
  const hrv = drawHrvPhase(rng.hrv);
  const ctx: RhythmCtx = { hrAt: () => hr, mods, rng, hrv };
  const st = createRhythmState(id, o.rhythmOpts ?? {}, 0, ctx);
  const n = Math.round(seconds * 500);
  const lead: Record<string, Float64Array> = {};
  for (const l of leads) lead[l] = new Float64Array(n);
  const out = new Float64Array(12);
  const all: EngineEvent[] = [];
  // Generate in 20 ms chunks exactly as the engine does (planning 150 ms ahead of the samples).
  for (let from = 0; from < n; from += 10) {
    const to = Math.min(n - 1, from + 9);
    planUntil(st, to / 500 + 0.15, ctx);
    st.events = pruneEvents(st.events, from / 500);
    all.push(...st.records);
    st.records = [];
    generateEcg(ecgGenInputs({ rhythm: st, mods, hrv, rng }, o.mainsHz ?? 50), from, to, (i, x, y, z) => {
      projectLeads(x, y, z, out);
      for (const l of leads) (lead[l] as Float64Array)[i] = ecgFrontEnd(mods, o.mainsHz ?? 50, l, i, out[LEAD_IDS.indexOf(l)] as number);
    });
  }
  return {
    st, ctx, mods, records: all, lead,
    beats: all.filter((r): r is Beat => r.type === 'beat'),
    atrial: all.filter((r): r is Atrial => r.type === 'atrial'),
    markers: all.filter((r): r is Marker => r.type === 'marker'),
  };
}

/** Lead value of the kernel list k at offset s (seconds from the event time), no noise. */
export function kernelLead(k: readonly number[], lead: LeadId, s: number): number {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < k.length; i += K_STRIDE) {
    const d = s - (k[i] as number);
    const sig = d < 0 ? (k[i + 1] as number) : (k[i + 2] as number);
    const g = Math.exp((-d * d) / (2 * sig * sig));
    x += (k[i + 3] as number) * g;
    y += (k[i + 4] as number) * g;
    z += (k[i + 5] as number) * g;
  }
  const out = new Float64Array(12);
  projectLeads(x, y, z, out);
  return out[LEAD_IDS.indexOf(lead)] as number;
}

/** The kernel lists of events that contain a wave of the given code (e.g. the QRS-T events). */
export function eventsWith(st: RhythmState, wave: number): number[][] {
  return st.events.filter((e) => { for (let i = 0; i < e.k.length; i += K_STRIDE) if (e.k[i + 6] === wave) return true; return false; }).map((e) => e.k);
}

export { WAVE, K_STRIDE };

export function mean(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
export function sd(xs: readonly number[]): number {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, xs.length - 1));
}
export function diffs(xs: readonly number[]): number[] {
  return xs.slice(1).map((x, i) => x - (xs[i] as number));
}

/** T peak (s from QRS onset) of a kernel list: τ of its first T kernel. */
export function tPeakOf(k: readonly number[]): number {
  for (let i = 0; i < k.length; i += K_STRIDE) if (k[i + 6] === WAVE.T) return k[i] as number;
  return Number.NaN;
}

/** One beat's kernels (QRS onset at 0, QT 400 ms) after the morphology pipeline with a modifier patch. */
export function morphBeat(patch: ModifiersPatch, seq = 0, template: 'narrow' | 'wide' = 'narrow'): number[] {
  return applyMorphology(beatKernels(template, 400), { template, supra: template === 'narrow', qtMs: 400, seq }, mergeModifiers(defaultModifiers(), patch));
}
```

Create or replace `packages/engine-core/test/l2/ecg/s5/sinus.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { respSin } from '../../../../src/l2/ecg/hrv.ts';
import { diffs, mean, run5 } from '../../../helpers/s5.ts';

describe('Stage 5 rhythms: sinus', () => {
  it('sinusArrhythmia: phasic PP swing > 120 ms that follows respiration', () => {
    const { atrial, ctx } = run5('sinusArrhythmia', 60, { mods: { hrvScale: 1 } });
    const t = atrial.map((a) => a.t);
    const pp = diffs(t);
    expect(Math.max(...pp) - Math.min(...pp)).toBeGreaterThan(0.12);
    const r = respSin;
    const x = pp.map((_, i) => r(t[i]!, ctx.hrv));
    const mx = mean(x), my = mean(pp);
    const cov = x.reduce((a, xi, i) => a + (xi - mx) * (pp[i]! - my), 0);
    const corr = cov / Math.sqrt(x.reduce((a, xi) => a + (xi - mx) ** 2, 0) * pp.reduce((a, y) => a + (y - my) ** 2, 0));
    expect(corr).toBeGreaterThan(0.7);
  });

  it('sinusPause: a 3 s sinus arrest every ~12 s, not a multiple of PP, no escape inside it', () => {
    const { atrial, beats } = run5('sinusPause', 60, { mods: { hrvScale: 0 } });
    const pp = diffs(atrial.map((a) => a.t));
    const pauses = pp.filter((x) => x > 2);
    expect(pauses.length).toBeGreaterThanOrEqual(4);
    for (const p of pauses) expect(p).toBeCloseTo(3, 6);
    expect(beats.every((b) => b.origin === 'sinus')).toBe(true);
  });
});
```


- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s5/sinus.test.ts`

Expected: FAIL — sinusArrhythmia PP swing < 0.12 s, and sinusPause has no 3 s pause (both still behave as plain sinus).

- [x] **Step 3: Implement**

In `packages/engine-core/src/l2/ecg/atria.ts`, replace:

```ts
function onSinus(
```

with:

```ts
/** sinusArrhythmia: RSA depth at least 2.5 (A_RSA 150 ms at RR 1 s → phasic PP swing > 120 ms, research 03 §1.5) [ENG]. */
const SINUS_ARRHYTHMIA_RSA = 2.5;

/** Next sinus P time after a P at t (HRV, sinus arrhythmia, sinus pause). */
function nextSinusT(st: RhythmState, t: number, rate: number, ctx: RhythmCtx): number {
  const m = st.id === 'sinusArrhythmia'
    ? { rsa: Math.max(ctx.mods.rsa, SINUS_ARRHYTHMIA_RSA), hrvScale: Math.max(1, ctx.mods.hrvScale) }
    : ctx.mods;
  const next = t + sinusRR(60 / rate, t, ctx.hrv, m, ctx.rng.hrv);
  if (st.id === 'sinusPause') {
    const every = st.opts.pauseEveryS ?? 12; // [ENG]
    const k0 = Math.floor((t - st.startT) / every);
    const k1 = Math.floor((next - st.startT) / every);
    if (k1 > k0 && k0 >= 0) return t + (st.opts.pauseS ?? 3); // sinus arrest: not a multiple of PP
  }
  return next;
}

function onSinus(
```

In `packages/engine-core/src/l2/ecg/atria.ts`, replace:

```ts
  st.atria.nextT = t + sinusRR(60 / rate, t, ctx.hrv, ctx.mods, ctx.rng.hrv);
```

with:

```ts
  st.atria.nextT = nextSinusT(st, t, rate, ctx);
```


- [x] **Step 4: Run the tests and the type check**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg`

Expected: PASS (no failures; the Stage 1 tests keep passing).

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/ecg/atria.ts packages/engine-core/test/helpers/s5.ts packages/engine-core/test/l2/ecg/s5/sinus.test.ts
git commit -m "feat(ecg): sinus arrhythmia and sinus pause; stage 5 test helpers"
```

---

### Task 6: Focal atrial tachycardia and MAT

Ectopic atrial clock (one inverted P′, regular) and multifocal atrial tachycardia (three P′ shapes with their own PR, irregular PP).

**Files:**
- Create: `packages/engine-core/src/l2/ecg/atria-ectopic.ts`
- Modify: `packages/engine-core/src/l2/ecg/atria.ts` (register the two handlers)
- Test: `packages/engine-core/test/l2/ecg/s5/atrial.test.ts`

**Interfaces:**
- Consumes: `atrialRate`, `conductP`, `HOOKS`, `applyPMorphology`.
- Produces: `onEctopic`, `onMultifocal`, `ECTOPIC_P_VEC`, `MAT_FOCI` (registered as `ATRIAL_HANDLERS.ectopic/multifocal`).

- [ ] **Step 1: Write the failing test**

Create or replace `packages/engine-core/test/l2/ecg/s5/atrial.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { WAVE, diffs, mean, run5, sd } from '../../../helpers/s5.ts';

describe('Stage 5 rhythms: atrial', () => {
  it('atrialTach: regular 150–250, 1:1, P′ inverted in II', () => {
    const { atrial, beats, st } = run5('atrialTach', 30);
    const rr = diffs(beats.map((b) => b.t));
    expect(60 / mean(rr)).toBeGreaterThanOrEqual(150);
    expect(60 / mean(rr)).toBeLessThanOrEqual(250);
    expect(sd(rr)).toBeLessThan(0.01);
    expect(atrial.every((a) => a.conducted)).toBe(true);
    const p = st.events.find((e) => e.k[6] === WAVE.P)!;
    expect(0.235 * p.k[3]! + 1.066 * p.k[4]! - 0.132 * p.k[5]!).toBeLessThan(-0.05);
  });

  it('mat: ≥ 3 P′ shapes, ≥ 3 PR values, irregular, rate 100–150', () => {
    const { beats, st } = run5('mat', 60);
    const pv = new Set(st.events.filter((e) => e.k[6] === WAVE.P).map((e) => e.k[4]!.toFixed(3)));
    expect(pv.size).toBeGreaterThanOrEqual(3);
    expect(new Set(beats.map((b) => b.prMs)).size).toBeGreaterThanOrEqual(3);
    const rr = diffs(beats.map((b) => b.t));
    expect(sd(rr) / mean(rr)).toBeGreaterThan(0.08);
    expect(60 / mean(rr)).toBeGreaterThanOrEqual(95);
    expect(60 / mean(rr)).toBeLessThanOrEqual(155);
  });
});
```


- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s5/atrial.test.ts`

Expected: FAIL — atrialTach and mat produce no beats (atrial mode not handled).

- [ ] **Step 3: Implement**

Create or replace `packages/engine-core/src/l2/ecg/atria-ectopic.ts` with exactly:

```ts
// Ectopic atrial rhythms (research 03 §1.5): focal atrial tachycardia (one abnormal P′, regular) and multifocal
// atrial tachycardia (≥ 3 P′ shapes, varying PR, irregular PP).
import { normal, uniform } from '../../rng/sfc32.ts';
import { WAVE, kernel, makeEvent } from './kernels.ts';
import { RHYTHMS } from './rhythms.ts';
import { applyPMorphology } from './morphology/index.ts';
import { atrialRate, conductAt } from './atria.ts';
import { HOOKS, pushPending, type RhythmCtx, type RhythmState } from './rhythm-state.ts';
import type { Vec3 } from './vcg.ts';

/** Focal AT P′: low-atrial origin, inverted in II (−0.13 mV) [ENG]. */
export const ECTOPIC_P_VEC: Vec3 = [0.02, -0.12, 0.03];
/** MAT foci: normal-axis, inverted and flat P′ (II +0.15 / −0.13 / +0.05 mV), each with its own PR offset [ENG]. */
export const MAT_FOCI: ReadonlyArray<{ vec: Vec3; prOffsetMs: number }> = [
  { vec: [0.165, 0.105, 0.007], prOffsetMs: 0 },
  { vec: [0.02, -0.12, 0.03], prOffsetMs: -25 },
  { vec: [0.2, 0.02, 0.1], prOffsetMs: 35 },
];
const AT_JITTER_S = 0.003; // focal AT is regular [ENG]
const MAT_RR_CV = 0.15; // "irregular" PP [ENG]

function emitP(st: RhythmState, t: number, vec: Vec3, prOffsetMs: number, rate: number, ctx: RhythmCtx): void {
  const d = RHYTHMS[st.id];
  st.events.push(makeEvent(t, applyPMorphology(kernel(0.045, 0.022, 0.022, vec, WAVE.P), ctx.mods)));
  const pr0 = conductAt(st, t, rate, ctx);
  const pr = pr0 === null ? null : Math.max(90, pr0 + prOffsetMs);
  if (pr !== null) pushPending(st, { t: t + pr / 1000, origin: 'atrial', template: d.conductedTemplate, prMs: pr, pvc: false, coupling: 0, bypass: false });
  st.records.push({ type: 'atrial', t, kind: 'p', conducted: pr !== null });
  st.atria.lastT = t;
  for (const h of HOOKS.onP) h(st, t, ctx);
}

export function onEctopic(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const rate = atrialRate(st, RHYTHMS[st.id], t, ctx);
  emitP(st, t, ECTOPIC_P_VEC, 0, rate, ctx);
  st.atria.nextT = t + 60 / rate + AT_JITTER_S * (2 * uniform(ctx.rng.hrv) - 1);
}

export function onMultifocal(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const rate = atrialRate(st, RHYTHMS[st.id], t, ctx);
  const f = MAT_FOCI[Math.floor(uniform(ctx.rng.ectopy) * MAT_FOCI.length) % MAT_FOCI.length] as (typeof MAT_FOCI)[number];
  emitP(st, t, f.vec, f.prOffsetMs, rate, ctx);
  const rr = (60 / rate) * Math.min(1.5, Math.max(0.6, 1 + MAT_RR_CV * normal(ctx.rng.hrv)));
  st.atria.nextT = t + rr;
}
```

In `packages/engine-core/src/l2/ecg/atria.ts`, replace:

```ts
import { applyPMorphology, prDeltaMs } from './morphology/index.ts';
```

with:

```ts
import { applyPMorphology, prDeltaMs } from './morphology/index.ts';
import { onEctopic, onMultifocal } from './atria-ectopic.ts';
```

In `packages/engine-core/src/l2/ecg/atria.ts`, replace:

```ts
  sinus: onSinus,
```

with:

```ts
  sinus: onSinus,
  ectopic: onEctopic,
  multifocal: onMultifocal,
```


- [ ] **Step 4: Run the tests and the type check**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg`

Expected: PASS (no failures; the Stage 1 tests keep passing).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/ecg/atria-ectopic.ts packages/engine-core/src/l2/ecg/atria.ts packages/engine-core/test/l2/ecg/s5/atrial.test.ts
git commit -m "feat(ecg): focal atrial tachycardia and multifocal atrial tachycardia"
```

---

### Task 7: Ectopy: PVC patterns (trigeminy, couplet, triplet, run, multifocal, R-on-T), PACs, PJCs

The full ectopy modifier set. PACs reset the SA clock (pause less than compensatory) and can be blocked or conducted with RBBB aberrancy; PJCs are premature narrow beats with a retrograde P; PVC runs fire at 160/min.

**Files:**
- Replace: `packages/engine-core/src/l2/ecg/ectopy.ts`
- Modify: `packages/engine-core/src/l2/ecg/atria.ts` (PAC branch in `onSinus`)
- Test: `packages/engine-core/test/l2/ecg/s5/pvc.test.ts`, `packages/engine-core/test/l2/ecg/s5/pac-pjc.test.ts`

**Interfaces:**
- Consumes: `st.atria.lastT`, `st.atria.pac`, `st.ectopyCount`, `T_END_AFTER_PEAK_S`.
- Produces: `afterSupraBeat` with all patterns; `PVC_RUN_RATE_BPM = 160`; `st.atria.pac = { blocked, aberrant }` consumed by `onSinus`.

- [ ] **Step 1: Write the failing test**

Create or replace `packages/engine-core/test/l2/ecg/s5/pvc.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { K_STRIDE, WAVE, run5 } from '../../../helpers/s5.ts';
import { tEndAfterPeakS } from '../../../../src/l2/ecg/templates.ts';

describe('Stage 5 PVC variants', () => {
  it('trigeminy: N N V repeating with a full compensatory pause', () => {
    const { beats } = run5('sinus', 60, { hr: 75, mods: { hrvScale: 0, pvc: { pattern: 'trigeminy', probability: 0 } } });
    const seq = beats.map((b) => (b.template === 'pvc' ? 'V' : 'N')).join('');
    expect(seq.slice(2, 32)).toMatch(/^(NNV)+|^(NVN)+|^(VNN)+/);
    expect(seq.slice(2, 32).match(/V/g)!.length).toBe(10);
  });

  it('couplet / triplet / run: consecutive PVCs at 160/min', () => {
    for (const [pattern, n] of [['couplet', 2], ['triplet', 3], ['run', 6]] as const) {
      const { beats } = run5('sinus', 120, { hr: 70, mods: { hrvScale: 0, pvc: { pattern, probability: 0.2, runLength: 6 } } });
      const seq = beats.map((b) => (b.template === 'pvc' ? 'V' : 'N')).join('');
      const runs = seq.match(/V+/g) ?? [];
      expect(runs.length).toBeGreaterThan(3);
      expect(runs.every((r) => r.length === n)).toBe(true);
      const t = beats.map((b) => b.t);
      for (let i = 1; i < beats.length; i++) if (beats[i]!.template === 'pvc' && beats[i - 1]!.template === 'pvc') expect(t[i]! - t[i - 1]!).toBeCloseTo(60 / 160, 6);
    }
  });

  it('multifocal: ≥ 2 distinct PVC morphologies; all still template "pvc" in the beat event', () => {
    const { beats, st } = run5('sinus', 120, { hr: 70, mods: { pvc: { pattern: 'single', probability: 0.3, multifocal: true } } });
    expect(beats.some((b) => b.template === 'pvc')).toBe(true);
    const vecs = new Set<string>();
    for (const e of st.events) for (let i = 0; i < e.k.length; i += K_STRIDE) if (e.k[i + 6] === WAVE.R && Math.abs(e.k[i + 3]! - 1.521) > 0.01) vecs.add(e.k[i + 4]!.toFixed(2));
    expect(vecs.size).toBeGreaterThanOrEqual(2);
  });

  it('R-on-T: the PVC starts on the preceding T peak (coupling < QT)', () => {
    const { beats } = run5('sinus', 60, { hr: 70, mods: { hrvScale: 0, pvc: { pattern: 'bigeminy', probability: 0, rOnT: true } } });
    for (let i = 1; i < beats.length; i++) {
      const b = beats[i]!;
      if (b.template !== 'pvc') continue;
      const n = beats[i - 1]!;
      const onsetN = n.t - 0.04;
      const onsetV = b.t - 0.05;
      expect(onsetV - onsetN).toBeCloseTo(n.qtMs / 1000 - tEndAfterPeakS(0.03), 2); // narrow T σ_fall 30 ms
      expect(onsetV - onsetN).toBeLessThan(n.qtMs / 1000);
    }
  });
});
```

Create or replace `packages/engine-core/test/l2/ecg/s5/pac-pjc.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { prMs } from '../../../../src/l2/ecg/intervals.ts';
import { diffs, run5 } from '../../../helpers/s5.ts';

describe('Stage 5 ectopy: PACs and PJCs', () => {
  it('PAC: premature P′ at 60–85% of PP resets the SA clock (pause < compensatory); blocked and aberrant variants', () => {
    const { atrial, beats } = run5('sinus', 120, { hr: 60, mods: { hrvScale: 0, pac: { probability: 0.2 } } });
    const t = atrial.map((a) => a.t);
    const pp = diffs(t);
    const early = pp.map((x, i) => [x, i] as const).filter(([x]) => x < 0.9);
    expect(early.length).toBeGreaterThan(5);
    for (const [x, i] of early) {
      expect(x).toBeGreaterThanOrEqual(0.6 - 1e-9);
      expect(x).toBeLessThanOrEqual(0.85 + 1e-9);
      if (i + 1 < pp.length && pp[i + 1]! >= 0.9) {
        expect(pp[i + 1]).toBeCloseTo(1, 6); // SA reset: next PP is a full cycle from the P′
        expect(x + pp[i + 1]!).toBeLessThan(2); // less than compensatory
      }
    }
    expect(beats.some((b) => b.origin === 'atrial' && b.prMs === prMs(60) + 20)).toBe(true);
    const blocked = run5('sinus', 120, { hr: 60, mods: { hrvScale: 0, pac: { probability: 0.2, blocked: true } } });
    expect(blocked.atrial.filter((a) => !a.conducted).length).toBeGreaterThan(5);
    const ab = run5('sinus', 120, { hr: 60, mods: { hrvScale: 0, pac: { probability: 0.2, aberrant: true } } });
    const aberr = ab.beats.filter((b) => b.origin === 'atrial');
    expect(aberr.length).toBeGreaterThan(5);
    expect(aberr.every((b) => b.template === 'aberrant' && b.qrsMs >= 120)).toBe(true);
  });

  it('PJC: premature narrow junctional beats with a retrograde P', () => {
    const { beats } = run5('sinus', 120, { hr: 60, mods: { hrvScale: 0, pjc: { probability: 0.15 } } });
    const j = beats.filter((b) => b.origin === 'junctional');
    expect(j.length).toBeGreaterThan(5);
    expect(j.every((b) => b.qrsMs < 120 && b.template === 'narrowRetroP')).toBe(true);
  });
});
```


- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s5/pvc.test.ts test/l2/ecg/s5/pac-pjc.test.ts`

Expected: FAIL — trigeminy/couplets/runs are treated as single PVCs; no PACs or PJCs appear.

- [ ] **Step 3: Implement**

Create or replace `packages/engine-core/src/l2/ecg/ectopy.ts` with exactly:

```ts
// Ectopy drawn per supraventricular beat (brief §4.1 "per sinus beat: draw ectopy"; brief §5 modifiers;
// research 03 §1.5): PVC patterns (single, bigeminy, trigeminy, couplet, triplet, run, multifocal, R-on-T),
// PACs (SA reset, blocked, aberrant) and PJCs.
import { uniform } from '../../rng/sfc32.ts';
import { RHYTHMS } from './rhythms.ts';
import { atrialRate } from './atria.ts';
import type { BeatTemplateId } from './beat-templates.ts';
import { pushPending, rhythmRate, type PendingV, type RhythmCtx, type RhythmState } from './rhythm-state.ts';

const PVC_COUPLING_MIN = 0.55; // PVC coupling 40–80% of RR (brief §5); drawn 55–65% [ENG]
const PVC_COUPLING_SPAN = 0.1;
export const PVC_RUN_RATE_BPM = 160; // consecutive PVCs "at a VT rate" (research 03 §1.5) [ENG value]
const PVC_FOCI: readonly BeatTemplateId[] = ['wide', 'pvc2', 'pvc3'];
const PAC_COUPLING_MIN = 0.6; // PAC coupling 60–85% of PP (brief §4.1)
const PAC_COUPLING_SPAN = 0.25;
const PJC_COUPLING_MIN = 0.7; // [ENG]
const PJC_COUPLING_SPAN = 0.15;

/** The prevailing supraventricular RR (s) at time t. */
export function prevailingRR(st: RhythmState, t: number, ctx: RhythmCtx): number {
  const d = RHYTHMS[st.id];
  return 60 / Math.max(20, atrialRate(st, d, t, ctx) || rhythmRate(st, t, ctx) || 60);
}

function pvcCount(st: RhythmState, ctx: RhythmCtx): number {
  const pvc = ctx.mods.pvc;
  if (!pvc) return 0;
  st.ectopyCount++;
  switch (pvc.pattern) {
    case 'bigeminy':
      return 1;
    case 'trigeminy':
      return st.ectopyCount >= 2 ? 1 : 0;
    case 'couplet':
      return uniform(ctx.rng.ectopy) < pvc.probability ? 2 : 0;
    case 'triplet':
      return uniform(ctx.rng.ectopy) < pvc.probability ? 3 : 0;
    case 'run':
      return uniform(ctx.rng.ectopy) < pvc.probability ? (pvc.runLength ?? 5) : 0;
    default:
      return uniform(ctx.rng.ectopy) < pvc.probability ? 1 : 0;
  }
}

/** Called after every activated supraventricular beat p (QRS onset t; T peak tPeakS after onset). */
export function afterSupraBeat(st: RhythmState, _p: PendingV, t: number, ctx: RhythmCtx, tPeakS = 0.3): void {
  const pvc = ctx.mods.pvc;
  const n = pvcCount(st, ctx);
  if (pvc && n > 0) {
    st.ectopyCount = 0;
    const rr = prevailingRR(st, t, ctx);
    const frac = PVC_COUPLING_MIN + PVC_COUPLING_SPAN * uniform(ctx.rng.ectopy);
    // R-on-T: the PVC starts on the T peak of this beat (coupling < QT), so it bypasses refractoriness.
    const rOnT = pvc.rOnT === true;
    const tp = rOnT ? t + tPeakS : Math.max(t + frac * rr, st.refractoryUntil + 0.005);
    for (let i = 0; i < n; i++) {
      const template = pvc.multifocal ? (PVC_FOCI[Math.floor(uniform(ctx.rng.ectopy) * PVC_FOCI.length) % PVC_FOCI.length] as BeatTemplateId) : 'wide';
      const ti = tp + (i * 60) / PVC_RUN_RATE_BPM;
      pushPending(st, { t: ti, origin: 'ventricular', template, prMs: null, pvc: true, coupling: (ti - t) / rr, bypass: rOnT || i > 0 });
    }
  }
  const pac = ctx.mods.pac;
  const d = RHYTHMS[st.id];
  if (pac && d.atria === 'sinus' && st.atria.pac === null && uniform(ctx.rng.ectopy) < pac.probability) {
    const pp = prevailingRR(st, t, ctx);
    const tPac = st.atria.lastT + (PAC_COUPLING_MIN + PAC_COUPLING_SPAN * uniform(ctx.rng.ectopy)) * pp;
    if (tPac > t + 0.05 && tPac < st.atria.nextT) {
      st.atria.nextT = tPac;
      st.atria.pac = { blocked: pac.blocked === true, aberrant: pac.aberrant === true };
    }
  }
  const pjc = ctx.mods.pjc;
  if (pjc && uniform(ctx.rng.ectopy) < pjc.probability) {
    const rr = prevailingRR(st, t, ctx);
    const tj = Math.max(t + (PJC_COUPLING_MIN + PJC_COUPLING_SPAN * uniform(ctx.rng.ectopy)) * rr, st.refractoryUntil + 0.005);
    pushPending(st, { t: tj, origin: 'junctional', template: 'narrowRetroP', prMs: null, pvc: false, coupling: 0, bypass: false });
  }
}
```

In `packages/engine-core/src/l2/ecg/atria.ts`, replace:

```ts
import { makeEvent } from './kernels.ts';
```

with:

```ts
import { WAVE, kernel, makeEvent } from './kernels.ts';
```

In `packages/engine-core/src/l2/ecg/atria.ts`, replace:

```ts
function onSinus(
```

with:

```ts
const PAC_P_VEC: readonly [number, number, number] = [0.02, -0.12, 0.03]; // P′ of a different (low-atrial) shape, II −0.13 mV [ENG]
const PAC_EXTRA_PR_MS = 20; // PR′ ≥ normal PR (research 03 §1.5) [ENG value]

function onSinus(
```

In `packages/engine-core/src/l2/ecg/atria.ts`, replace:

```ts
  st.events.push(makeEvent(t, applyPMorphology(pWaveKernels(), ctx.mods)));
  const pr = conductAt(st, t, rate, ctx);
  if (pr !== null) pushPending(st, { t: t + pr / 1000, origin: 'sinus', template: d.conductedTemplate, prMs: pr, pvc: false, coupling: 0, bypass: false });
  st.records.push({ type: 'atrial', t, kind: 'p', conducted: pr !== null });
```

with:

```ts
  const pac = st.atria.pac;
  st.atria.pac = null;
  if (pac) {
    // Premature atrial beat: different P′, PR′ ≥ PR, resets the SA clock (research 03 §1.5).
    st.events.push(makeEvent(t, applyPMorphology(kernel(0.045, 0.022, 0.022, PAC_P_VEC, WAVE.P), ctx.mods)));
    const pr0 = pac.blocked ? null : conductAt(st, t, rate, ctx);
    const pr = pr0 === null ? null : pr0 + PAC_EXTRA_PR_MS;
    if (pr !== null) pushPending(st, { t: t + pr / 1000, origin: 'atrial', template: pac.aberrant ? 'aberrant' : d.conductedTemplate, prMs: pr, pvc: false, coupling: 0, bypass: false });
    st.records.push({ type: 'atrial', t, kind: 'p', conducted: pr !== null });
  } else {
    st.events.push(makeEvent(t, applyPMorphology(pWaveKernels(), ctx.mods)));
    const pr = conductAt(st, t, rate, ctx);
    if (pr !== null) pushPending(st, { t: t + pr / 1000, origin: 'sinus', template: d.conductedTemplate, prMs: pr, pvc: false, coupling: 0, bypass: false });
    st.records.push({ type: 'atrial', t, kind: 'p', conducted: pr !== null });
  }
```


- [ ] **Step 4: Run the tests and the type check**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg`

Expected: PASS (no failures; the Stage 1 tests keep passing).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/ecg/atria.ts packages/engine-core/src/l2/ecg/ectopy.ts packages/engine-core/test/l2/ecg/s5/pac-pjc.test.ts packages/engine-core/test/l2/ecg/s5/pvc.test.ts
git commit -m "feat(ecg): pvc patterns, multifocal and r-on-t pvcs, pacs (blocked, aberrant) and pjcs"
```

---

### Task 8: SVT family: junctional rhythms, AVRT, WPW and pre-excited AF

Junctional escape / accelerated / tachycardia with a retrograde P′ before (default), within or after the QRS; orthodromic AVRT (RP > 70 ms); WPW conduction (PR 100 ms, delta wave); pre-excited AF (varying fusion, RR ≥ 0.2 s).

**Files:**
- Create: `packages/engine-core/src/l2/ecg/foci-junctional.ts`
- Modify: `packages/engine-core/src/l2/ecg/foci.ts` (register), `packages/engine-core/src/l2/ecg/atria.ts` (`fireJunction` pre-excitation)
- Test: `packages/engine-core/test/l2/ecg/s5/svt-junctional.test.ts`

**Interfaces:**
- Consumes: `pushPending`, `rhythmRate`, `WPW_PR_MS` (already used by `conductP`), `beatKernels('wpw', qt, scale, pre)`.
- Produces: `onJunctional`, `onAvrt`, `RETRO_JUNCTIONAL_P_VEC`, `AVRT_RP_ONSET_S`; `PendingV.pre` drawn 0.4–1.8 per pre-excited AF beat.

- [ ] **Step 1: Write the failing test**

Create or replace `packages/engine-core/test/l2/ecg/s5/svt-junctional.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { diffs, mean, run5, sd } from '../../../helpers/s5.ts';
import { beatQrsMs } from '../../../../src/l2/ecg/beat-templates.ts';

describe('Stage 5 rhythms: SVT family and junctional', () => {
  it.each([
    ['junctionalEscape', 40, 60],
    ['junctionalAccel', 60, 100],
    ['junctionalTachy', 100, 180],
  ] as const)('%s: narrow, regular, rate %i–%i, inverted retrograde P 80 ms before the QRS', (id, lo, hi) => {
    const { beats, atrial } = run5(id, 60);
    const rate = 60 / mean(diffs(beats.map((b) => b.t)));
    expect(rate).toBeGreaterThanOrEqual(lo);
    expect(rate).toBeLessThanOrEqual(hi);
    expect(beats.every((b) => b.origin === 'junctional' && b.qrsMs < 120)).toBe(true);
    expect(atrial.every((a) => a.kind === 'retrograde')).toBe(true);
    // P′ onset precedes QRS onset (beat.t − 40 ms) by 80 ms: PR < 120 ms
    for (const b of beats.slice(1)) {
      const p = atrial.filter((a) => a.t <= b.t).at(-1)!;
      expect(b.t - 0.04 - p.t).toBeCloseTo(0.08, 6);
    }
  });

  it("junctional retroP 'after': P′ follows the QRS", () => {
    const { beats, atrial } = run5('junctionalEscape', 30, { rhythmOpts: { retroP: 'after' } });
    const b = beats[3]!;
    const p = atrial.find((a) => a.t > b.t - 0.04)!;
    expect(p.t - (b.t - 0.04)).toBeCloseTo(0.1, 6);
  });

  it('svtAvrt: narrow, regular 150–250, retrograde P with RP > 70 ms (AVNRT RP < 70 ms)', () => {
    const { beats, atrial } = run5('svtAvrt', 30);
    const rr = diffs(beats.map((b) => b.t));
    expect(60 / mean(rr)).toBeGreaterThanOrEqual(150);
    expect(sd(rr)).toBeLessThan(0.01);
    for (const b of beats.slice(0, -1)) {
      const p = atrial.find((a) => a.t > b.t)!;
      expect(p.t - b.t).toBeGreaterThan(0.07);
    }
    const n = run5('svtAvnrt', 30);
    for (const b of n.beats.slice(0, -1)) {
      const p = n.atrial.find((a) => a.t >= b.t - 0.04)!;
      expect(p.t - b.t).toBeLessThan(0.07);
    }
  });

  it('wpwSinus: PR < 120 ms, delta wave, QRS 110–130 ms', () => {
    const { beats } = run5('wpwSinus', 30);
    expect(beats.every((b) => b.prMs! < 120)).toBe(true);
    expect(beats.every((b) => b.qrsMs >= 110 && b.qrsMs <= 130)).toBe(true);
    expect(beatQrsMs('wpw')).toBeGreaterThan(beatQrsMs('narrow') + 20);
  });

  it('preexcitedAf: irregular, fast (junction RR ≥ 0.2 s; R-to-R ≥ 0.15 s with the varying delta), varying QRS width', () => {
    const { beats } = run5('preexcitedAf', 120);
    const rr = diffs(beats.map((b) => b.t));
    expect(Math.min(...rr)).toBeGreaterThanOrEqual(0.15);
    expect(sd(rr) / mean(rr)).toBeGreaterThan(0.12);
    expect(60 / mean(rr)).toBeGreaterThan(150);
    const q = beats.map((b) => b.qrsMs);
    expect(sd(q)).toBeGreaterThan(8);
    expect(Math.max(...q)).toBeGreaterThanOrEqual(130);
  });
});
```


- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s5/svt-junctional.test.ts`

Expected: FAIL — junctional rhythms and AVRT produce no beats; pre-excited AF QRS width does not vary.

- [ ] **Step 3: Implement**

Create or replace `packages/engine-core/src/l2/ecg/foci-junctional.ts` with exactly:

```ts
// Junctional foci (research 03 §1.5): junctional escape / accelerated / tachycardia with a retrograde P′ before,
// within or after the QRS, and orthodromic AVRT (retrograde P′ with RP > 70 ms).
import { uniform } from '../../rng/sfc32.ts';
import { WAVE, kernel, makeEvent } from './kernels.ts';
import { pushPending, rhythmRate, type RhythmCtx, type RhythmState } from './rhythm-state.ts';
import type { Vec3 } from './vcg.ts';

/** Junctional/AVRT retrograde P′: inverted in II (−0.12 mV) (research 03 §1.5) [ENG]. */
export const RETRO_JUNCTIONAL_P_VEC: Vec3 = [-0.03, -0.105, 0.02];
const JUNCTIONAL_PR_S = 0.08; // retrograde P before the QRS: short PR < 120 ms (research 03 §1.5)
const JUNCTIONAL_RP_S = 0.1; // retrograde P after the QRS [ENG]
export const AVRT_RP_ONSET_S = 0.13; // AVRT: P′ onset 130 ms after QRS onset → RP > 70 ms (research 03 §1.5)
const FOCUS_JITTER_S = 0.004; // [ENG]

function retroP(st: RhythmState, t: number): void {
  st.events.push(makeEvent(t, kernel(0.045, 0.022, 0.022, RETRO_JUNCTIONAL_P_VEC, WAVE.RETRO_P)));
  st.records.push({ type: 'atrial', t, kind: 'retrograde', conducted: false });
}

function jitter(ctx: RhythmCtx, s: number): number {
  return s * (2 * uniform(ctx.rng.ectopy) - 1);
}

export function onJunctional(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const where = st.opts.retroP ?? 'before';
  if (where === 'before') {
    retroP(st, t);
    pushPending(st, { t: t + JUNCTIONAL_PR_S, origin: 'junctional', template: 'narrow', prMs: null, pvc: false, coupling: 0, bypass: true });
  } else {
    pushPending(st, { t, origin: 'junctional', template: 'narrow', prMs: null, pvc: false, coupling: 0, bypass: true });
    retroP(st, where === 'hidden' ? t : t + JUNCTIONAL_RP_S);
  }
  st.focusNextT = t + 60 / rhythmRate(st, t, ctx) + jitter(ctx, FOCUS_JITTER_S);
}

export function onAvrt(st: RhythmState, t: number, ctx: RhythmCtx): void {
  pushPending(st, { t, origin: 'junctional', template: 'narrow', prMs: null, pvc: false, coupling: 0, bypass: true });
  retroP(st, t + AVRT_RP_ONSET_S);
  st.focusNextT = t + 60 / rhythmRate(st, t, ctx) + jitter(ctx, FOCUS_JITTER_S);
}
```

In `packages/engine-core/src/l2/ecg/foci.ts`, replace:

```ts
import { pushPending, rhythmRate, type RhythmCtx, type RhythmState } from './rhythm-state.ts';
```

with:

```ts
import { pushPending, rhythmRate, type RhythmCtx, type RhythmState } from './rhythm-state.ts';
import { onAvrt, onJunctional } from './foci-junctional.ts';
```

In `packages/engine-core/src/l2/ecg/foci.ts`, replace:

```ts
  svt: onAvnrt,
```

with:

```ts
  svt: onAvnrt,
  junctional: onJunctional,
  avrt: onAvrt,
```

In `packages/engine-core/src/l2/ecg/atria.ts`, replace:

```ts
export function fireJunction(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const d = RHYTHMS[st.id];
  pushPending(st, { t: t + AF_AV_S, origin: 'atrial', template: d.conductedTemplate, prMs: null, pvc: false, coupling: 0, bypass: true });
  const ref = t + afRefractoryS(rhythmRate(st, t, ctx));
```

with:

```ts
const PREEXCITED_MIN_REFRACTORY_S = 0.2; // accessory pathway: very short RR (research 03 §1.5 "Pre-excited AF") [ENG]

export function fireJunction(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const d = RHYTHMS[st.id];
  const pre = d.conductedTemplate === 'wpw';
  // Pre-excited AF: every beat is a different fusion of pathway and node conduction → varying QRS width [ENG].
  const p = pre ? 0.4 + 1.4 * uniform(ctx.rng.conduction) : 1;
  pushPending(st, { t: t + AF_AV_S, origin: 'atrial', template: d.conductedTemplate, prMs: null, pvc: false, coupling: 0, bypass: true, pre: p });
  const ref = t + afRefractoryS(rhythmRate(st, t, ctx), pre ? PREEXCITED_MIN_REFRACTORY_S : AF_MIN_REFRACTORY_S);
```


- [ ] **Step 4: Run the tests and the type check**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg`

Expected: PASS (no failures; the Stage 1 tests keep passing).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/ecg/atria.ts packages/engine-core/src/l2/ecg/foci-junctional.ts packages/engine-core/src/l2/ecg/foci.ts packages/engine-core/test/l2/ecg/s5/svt-junctional.test.ts
git commit -m "feat(ecg): junctional rhythms with retrograde p, avrt, wpw and pre-excited af"
```

---

### Task 9: Ventricular foci: idioventricular, AIVR, polymorphic VT, torsades, agonal; PEA contract

Wide-complex foci and the arrest rhythms driven by a focus. Also pins the PEA contract Stage 2 consumes: `RhythmOpts.pulseless` makes every beat `mech.perfused = false`, `kSV = 0`, `svMl = 0`.

**Files:**
- Create: `packages/engine-core/src/l2/ecg/foci-ventricular.ts`
- Modify: `packages/engine-core/src/l2/ecg/foci.ts` (register)
- Test: `packages/engine-core/test/l2/ecg/s5/ventricular.test.ts` (includes acceptance 3)

**Interfaces:**
- Consumes: `PendingV.scale`, `PendingV.twistRad` (applied by `activateVentricle` via `rotateZ`), `st.focusN`, `st.focusAxis`, `st.startT`.
- Produces: `onIdioventricular`, `onVtPoly`, `onTorsades`, `onAgonal`.

- [ ] **Step 1: Write the failing test**

Create or replace `packages/engine-core/test/l2/ecg/s5/ventricular.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { projectLead } from '../../../../src/l2/ecg/vcg.ts';
import { K_STRIDE, WAVE, diffs, mean, run5, sd } from '../../../helpers/s5.ts';

/** Signed lead-II amplitude of the largest R kernel of every QRS event, in beat order. */
function rAmpII(st: ReturnType<typeof run5>['st']): number[] {
  const ev = st.events.filter((e) => { for (let i = 0; i < e.k.length; i += K_STRIDE) if (e.k[i + 6] === WAVE.R) return true; return false; }).sort((a, b) => a.t - b.t);
  return ev.map((e) => {
    let best = 0;
    for (let i = 0; i < e.k.length; i += K_STRIDE) {
      if (e.k[i + 6] !== WAVE.R) continue;
      const v = projectLead('ecgII', e.k[i + 3]!, e.k[i + 4]!, e.k[i + 5]!);
      if (Math.abs(v) > Math.abs(best)) best = v;
    }
    return best;
  });
}

describe('Stage 5 rhythms: ventricular and arrest', () => {
  it('idioventricular 20–40 and aivr 40–120: wide, regular, AV dissociation in AIVR', () => {
    const ivr = run5('idioventricular', 120);
    const r1 = 60 / mean(diffs(ivr.beats.map((b) => b.t)));
    expect(r1).toBeGreaterThanOrEqual(20);
    expect(r1).toBeLessThanOrEqual(40);
    expect(ivr.atrial.length).toBe(0);
    expect(ivr.beats.every((b) => b.qrsMs >= 120 && b.mech.kSV === 0.7)).toBe(true);
    const a = run5('aivr', 60);
    const r2 = 60 / mean(diffs(a.beats.map((b) => b.t)));
    expect(r2).toBeGreaterThanOrEqual(40);
    expect(r2).toBeLessThanOrEqual(120);
    expect(a.atrial.length).toBeGreaterThan(40);
    expect(a.atrial.every((p) => !p.conducted)).toBe(true);
    expect(a.beats.every((b) => b.origin === 'ventricular')).toBe(true);
  });

  it('vtPoly: 150–300/min, irregular, beat-to-beat changing QRS amplitude/axis', () => {
    const { beats, st } = run5('vtPoly', 30);
    const rr = diffs(beats.map((b) => b.t));
    expect(60 / mean(rr)).toBeGreaterThanOrEqual(150);
    expect(60 / mean(rr)).toBeLessThanOrEqual(300);
    expect(sd(rr) / mean(rr)).toBeGreaterThan(0.04);
    const a = rAmpII(st);
    expect(sd(a) / mean(a.map(Math.abs))).toBeGreaterThan(0.3);
  });

  it('acceptance 3 — torsades: 200–250/min, twist period 5–20 beats (default 12)', () => {
    for (const twistBeats of [6, 12, 18]) {
      const { beats, st } = run5('torsades', 60, { rhythmOpts: { twistBeats } });
      const rate = 60 / mean(diffs(beats.map((b) => b.t)));
      expect(rate).toBeGreaterThanOrEqual(195);
      expect(rate).toBeLessThanOrEqual(255);
      const a = rAmpII(st);
      const flips: number[] = [];
      for (let i = 1; i < a.length; i++) if (Math.sign(a[i]!) !== Math.sign(a[i - 1]!)) flips.push(i);
      const period = 2 * mean(diffs(flips));
      expect(period).toBeGreaterThanOrEqual(5);
      expect(period).toBeLessThanOrEqual(20);
      expect(Math.abs(period - twistBeats)).toBeLessThan(1.5);
    }
  });

  it('agonal: < 20/min, irregular, very wide (≥ 200 ms), decaying amplitude, no pulse', () => {
    const { beats, st } = run5('agonal', 300);
    const rr = diffs(beats.map((b) => b.t));
    expect(60 / mean(rr)).toBeLessThan(20);
    expect(sd(rr)).toBeGreaterThan(0.5);
    expect(beats.every((b) => b.qrsMs >= 200 && !b.mech.perfused)).toBe(true);
    const a = rAmpII(st).map(Math.abs);
    expect(a.at(-1)!).toBeLessThan(0.5 * a[0]!);
  });

  it('pWaveAsystole: P waves at ~50/min, no QRS', () => {
    const { beats, atrial } = run5('pWaveAsystole', 60);
    expect(beats.length).toBe(0);
    expect(atrial.length).toBeGreaterThanOrEqual(45);
    expect(atrial.length).toBeLessThanOrEqual(55);
  });

  it('PEA contract: pulseless on any organised rhythm → every beat perfused=false, kSV=0, svMl=0', () => {
    for (const id of ['sinus', 'sinusBrady', 'vtMono', 'junctionalEscape', 'avb3Wide'] as const) {
      const { beats } = run5(id, 30, { rhythmOpts: { pulseless: true } });
      expect(beats.length).toBeGreaterThan(5);
      expect(beats.every((b) => b.mech.perfused === false && b.mech.kSV === 0 && b.mech.svMl === 0)).toBe(true);
      const withPulse = run5(id, 30);
      expect(withPulse.beats.every((b) => b.mech.perfused)).toBe(true);
    }
  });
});
```


- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s5/ventricular.test.ts`

Expected: FAIL — idioventricular/vtPoly/torsades/agonal produce no beats.

- [ ] **Step 3: Implement**

Create or replace `packages/engine-core/src/l2/ecg/foci-ventricular.ts` with exactly:

```ts
// Ventricular foci (research 03 §1.5): idioventricular / AIVR, polymorphic VT, torsades de pointes (brief §4.1
// "Torsades: envelope cos(2πt/T_twist), T_twist 5–20 beats") and agonal rhythm.
import { normal, uniform } from '../../rng/sfc32.ts';
import { pushPending, rhythmRate, type RhythmCtx, type RhythmState } from './rhythm-state.ts';

const IVR_JITTER_S = 0.01; // [ENG]
const POLY_RR_CV = 0.08; // polymorphic VT: irregular [ENG]
const POLY_AXIS_STEP_RAD = 0.6; // beat-to-beat axis random walk [ENG]
const TORSADES_RR_CV = 0.05; // [ENG]
const TORSADES_AXIS_RAD = 0.35; // axis wobble ±20° over a twist [ENG]
const AGONAL_RR_MIN_S = 3; // agonal < 20/min, irregular (research 03 §1.5)
const AGONAL_RR_SPAN_S = 4.5;
const AGONAL_DECAY_S = 120; // decaying amplitude [ENG]

function jitter(ctx: RhythmCtx, s: number): number {
  return s * (2 * uniform(ctx.rng.ectopy) - 1);
}

export function onIdioventricular(st: RhythmState, t: number, ctx: RhythmCtx): void {
  pushPending(st, { t, origin: 'ventricular', template: 'wide', prMs: null, pvc: false, coupling: 0, bypass: true });
  st.focusNextT = t + 60 / rhythmRate(st, t, ctx) + jitter(ctx, IVR_JITTER_S);
}

export function onVtPoly(st: RhythmState, t: number, ctx: RhythmCtx): void {
  st.focusAxis += POLY_AXIS_STEP_RAD * normal(ctx.rng.ectopy);
  const scale = 0.6 + 0.6 * uniform(ctx.rng.ectopy);
  pushPending(st, { t, origin: 'ventricular', template: 'wide', prMs: null, pvc: false, coupling: 0, bypass: true, scale, twistRad: st.focusAxis });
  const rr = (60 / rhythmRate(st, t, ctx)) * Math.max(0.7, 1 + POLY_RR_CV * normal(ctx.rng.ectopy));
  st.focusNextT = t + rr;
}

/** Torsades: QRS amplitude and polarity follow cos(2π·n/T_twist) (brief §4.1), T_twist 5–20 beats. */
export function onTorsades(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const n = st.focusN;
  const twist = Math.min(20, Math.max(5, st.opts.twistBeats ?? 12));
  const ph = (2 * Math.PI * n) / twist;
  const scale = 1.1 * Math.cos(ph);
  pushPending(st, { t, origin: 'ventricular', template: 'wide', prMs: null, pvc: false, coupling: 0, bypass: true, scale, twistRad: TORSADES_AXIS_RAD * Math.sin(ph) });
  const rr = (60 / rhythmRate(st, t, ctx)) * Math.max(0.8, 1 + TORSADES_RR_CV * normal(ctx.rng.ectopy));
  st.focusNextT = t + rr;
}

export function onAgonal(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const scale = Math.max(0.25, Math.exp(-(t - st.startT) / AGONAL_DECAY_S));
  pushPending(st, { t, origin: 'ventricular', template: 'agonal', prMs: null, pvc: false, coupling: 0, bypass: true, scale });
  st.focusNextT = t + AGONAL_RR_MIN_S + AGONAL_RR_SPAN_S * uniform(ctx.rng.ectopy);
}
```

In `packages/engine-core/src/l2/ecg/foci.ts`, replace:

```ts
import { onAvrt, onJunctional } from './foci-junctional.ts';
```

with:

```ts
import { onAvrt, onJunctional } from './foci-junctional.ts';
import { onAgonal, onIdioventricular, onTorsades, onVtPoly } from './foci-ventricular.ts';
```

In `packages/engine-core/src/l2/ecg/foci.ts`, replace:

```ts
  avrt: onAvrt,
```

with:

```ts
  avrt: onAvrt,
  idioventricular: onIdioventricular,
  vtPoly: onVtPoly,
  torsades: onTorsades,
  agonal: onAgonal,
```


- [ ] **Step 4: Run the tests and the type check**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg`

Expected: PASS (no failures; the Stage 1 tests keep passing).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/ecg/foci-ventricular.ts packages/engine-core/src/l2/ecg/foci.ts packages/engine-core/test/l2/ecg/s5/ventricular.test.ts
git commit -m "feat(ecg): idioventricular, aivr, polymorphic vt, torsades, agonal; pea contract test"
```

---

### Task 10: AV blocks: Mobitz II, 2:1 and high-grade

Constant-PR blocks (acceptance test 5): Mobitz II n:n−1 (groupSize), fixed 2:1, and high-grade 3:1 / 4:1 (`opts.ratio`).

**Files:**
- Modify: `packages/engine-core/src/l2/ecg/atria.ts` (`conductP` case `mobitz2`)
- Test: `packages/engine-core/test/l2/ecg/s5/avblock.test.ts`

**Interfaces:**
- Consumes: `st.atria.groupPos`, `RhythmOpts.groupSize`, `RhythmOpts.ratio`.
- Produces: AV mode `mobitz2` in `conductP`.

- [ ] **Step 1: Write the failing test**

Create or replace `packages/engine-core/test/l2/ecg/s5/avblock.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { diffs, run5 } from '../../../helpers/s5.ts';

describe('Stage 5 rhythms: Mobitz II, 2:1, high grade (acceptance 5)', () => {
  it('avb2Mobitz2 4:3: constant PR, one sudden drop per group with no PR change before it', () => {
    const { beats, atrial } = run5('avb2Mobitz2', 60, { mods: { hrvScale: 0 } });
    expect(new Set(beats.map((b) => b.prMs)).size).toBe(1);
    const c = atrial.map((a) => a.conducted);
    expect(c.filter((x) => !x).length).toBeGreaterThanOrEqual(15);
    for (let i = 1; i < c.length; i++) expect(!c[i] && !c[i - 1]).toBe(false); // never 2 consecutive drops
  });

  it('avb2to1: every other P conducted, constant PR, ventricular rate = half the atrial rate', () => {
    const { beats, atrial } = run5('avb2to1', 60, { mods: { hrvScale: 0 } });
    atrial.forEach((a, i) => expect(a.conducted).toBe(i % 2 === 0));
    expect(new Set(beats.map((b) => b.prMs)).size).toBe(1);
    expect(60 / (diffs(beats.map((b) => b.t)).reduce((a, b) => a + b, 0) / (beats.length - 1))).toBeCloseTo(40, 0);
  });

  it('avbHighGrade 3:1 and 4:1: ≥ 2 consecutive dropped P, constant PR', () => {
    for (const ratio of [3, 4] as const) {
      const { beats, atrial } = run5('avbHighGrade', 60, { mods: { hrvScale: 0 }, rhythmOpts: { ratio } });
      atrial.forEach((a, i) => expect(a.conducted).toBe(i % ratio === 0));
      expect(new Set(beats.map((b) => b.prMs)).size).toBe(1);
      expect(beats.every((b) => b.origin === 'sinus')).toBe(true);
    }
  });
});
```


- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s5/avblock.test.ts`

Expected: FAIL — every P is blocked (no conduction for AV mode mobitz2).

- [ ] **Step 3: Implement**

In `packages/engine-core/src/l2/ecg/atria.ts`, replace:

```ts
    default:
```

with:

```ts
    case 'mobitz2': {
      // Mobitz II (n:n−1), 2:1 and high-grade (3:1, 4:1): constant PR, sudden non-conducted P (research 03 §1.5).
      const n = st.id === 'avb2to1' ? 2 : st.id === 'avbHighGrade' ? (st.opts.ratio === 4 ? 4 : 3) : (st.opts.groupSize ?? 4);
      const pos = st.atria.groupPos;
      st.atria.groupPos = (pos + 1) % n;
      const conducts = st.id === 'avb2Mobitz2' ? pos < n - 1 : pos === 0;
      return conducts ? basePr() : null;
    }
    default:
```


- [ ] **Step 4: Run the tests and the type check**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg`

Expected: PASS (no failures; the Stage 1 tests keep passing).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/ecg/atria.ts packages/engine-core/test/l2/ecg/s5/avblock.test.ts
git commit -m "feat(ecg): mobitz ii, 2:1 and high-grade av block"
```

---

### Task 11: Implanted pacing: AAI, VVI, DDD and the four faults

A pacemaker clock (extra planner clock) with demand sensing through `HOOKS.onP` / `HOOKS.onBeat`. Pace pulses are `marker` events (`kind: 'paceSpike'`, `data: { chamber: 1 | 2, captured, tcp: false }`), never sampled spikes (research 03 §1.7). Faults: failure to capture, failure to sense (spikes land on T waves), oversensing (pauses with no spikes), failure to pace. Acceptance test 8.

**Files:**
- Create: `packages/engine-core/src/l2/ecg/pacing.ts`
- Modify: `packages/engine-core/src/l2/ecg/rhythm-state.ts` (field `pacer`), `packages/engine-core/src/l2/ecg/rhythm-engine.ts` (import + `EXTRA_CLOCKS`)
- Test: `packages/engine-core/test/l2/ecg/s5/pacing.test.ts` (paced + faults; TCP cases come in Task 12)

**Interfaces:**
- Consumes: `HOOKS`, `conductP`, `atrialRate`, `pWaveKernels`, `applyPMorphology`, template `pacedV`.
- Produces: `pacerClock`, `DEFAULT_AV_DELAY_MS = 160`, `RhythmState.pacer?: { nextA; nextV }`.

- [ ] **Step 1: Write the failing test**

Create or replace `packages/engine-core/test/l2/ecg/s5/pacing.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { diffs, mean, run5, type Beat, type Marker } from '../../../helpers/s5.ts';

const spikes = (m: Marker[], chamber: 1 | 2) => m.filter((x) => x.kind === 'paceSpike' && x.data?.chamber === chamber);

describe('Stage 5 paced rhythms', () => {
  it('pacedVVI (CHB underneath): V spike → wide paced QRS 140–180 ms at the lower rate; P waves march through', () => {
    const { beats, markers, atrial } = run5('pacedVVI', 60);
    const v = spikes(markers, 2);
    const paced = beats.filter((b) => b.origin === 'paced');
    expect(paced.length).toBeGreaterThan(60);
    expect(60 / mean(diffs(paced.map((b) => b.t)))).toBeCloseTo(70, 0);
    expect(paced.every((b) => b.qrsMs >= 140 && b.qrsMs <= 180)).toBe(true);
    for (const b of paced) expect(v.some((s) => b.t - s.t > 0 && b.t - s.t < 0.1)).toBe(true);
    expect(atrial.every((a) => !a.conducted)).toBe(true);
  });

  it('pacedAAI: A spike → P → narrow conducted QRS; intrinsic sinus slower than the pacer', () => {
    const { beats, markers } = run5('pacedAAI', 60);
    const a = spikes(markers, 1);
    expect(a.length).toBeGreaterThan(60);
    expect(spikes(markers, 2).length).toBe(0);
    expect(beats.every((b) => b.qrsMs < 120)).toBe(true);
    expect(60 / mean(diffs(beats.map((b) => b.t)))).toBeCloseTo(70, 0);
  });

  it('pacedDDD: A spike, AV delay 160 ms, V spike, paced QRS (AV sequential)', () => {
    const { beats, markers } = run5('pacedDDD', 60);
    const a = spikes(markers, 1);
    const v = spikes(markers, 2);
    expect(a.length).toBeGreaterThan(60);
    expect(v.length).toBeGreaterThan(60);
    for (const s of v.slice(2, 20)) {
      const prevA = a.filter((x) => x.t < s.t).at(-1)!;
      expect(s.t - prevA.t).toBeCloseTo(0.16, 6);
    }
    expect(beats.filter((b) => b.origin === 'paced').length).toBeGreaterThan(60);
  });

  it('pacedDDD with a faster sinus: atrial tracking (no A spikes, V spike 160 ms after each P)', () => {
    const { markers, atrial } = run5('pacedDDD', 30, { rhythmOpts: { atrialRateBpm: 85 } });
    expect(spikes(markers, 1).length).toBe(0);
    const v = spikes(markers, 2);
    for (const s of v.slice(1)) {
      const p = atrial.filter((x) => x.t < s.t).at(-1)!;
      expect(s.t - p.t).toBeCloseTo(0.16, 6);
    }
  });

  it('demand VVI is inhibited by conducted intrinsic beats faster than the lower rate', () => {
    const { markers, beats } = run5('pacedVVI', 30, { rhythmOpts: { atrialRateBpm: 85, pacer: { intrinsic: 'conducted' } } });
    expect(spikes(markers, 2).length).toBe(0);
    expect(beats.every((b: Beat) => b.origin === 'sinus')).toBe(true);
  });
});

describe('Stage 5 pacing faults (acceptance 8)', () => {
  it('failureToCapture: spikes with no paced QRS after them', () => {
    const { markers, beats } = run5('pacedVVI', 60, { rhythmOpts: { pacer: { fault: 'failureToCapture', faultRate: 1 } } });
    const v = spikes(markers, 2);
    expect(v.length).toBeGreaterThan(40);
    expect(v.every((s) => s.data?.captured === false)).toBe(true);
    expect(beats.filter((b) => b.origin === 'paced').length).toBe(0);
  });

  it('failureToSense: spikes at the programmed rate regardless of intrinsic beats, some on T waves', () => {
    const { markers, beats } = run5('pacedVVI', 120, { rhythmOpts: { atrialRateBpm: 80, pacer: { intrinsic: 'conducted', fault: 'failureToSense', ratePpm: 60 } } });
    const v = spikes(markers, 2);
    const iv = diffs(v.map((s) => s.t));
    expect(Math.max(...iv) - Math.min(...iv)).toBeLessThan(1e-9); // fixed rate: never reset by sensing
    const intrinsic = beats.filter((b) => b.origin === 'sinus');
    const onT = v.filter((s) => intrinsic.some((b) => s.t - (b.t - 0.04) > 0.1 && s.t - (b.t - 0.04) < b.qtMs / 1000));
    expect(onT.length).toBeGreaterThan(5);
  });

  it('oversensing: pauses with no spikes (RR ≈ 2 pacing intervals)', () => {
    const { markers, beats } = run5('pacedVVI', 120, { rhythmOpts: { pacer: { fault: 'oversensing', faultRate: 0.3 } } });
    const rr = diffs(beats.map((b) => b.t));
    const iv = 60 / 70;
    const pauses = rr.map((x, i) => [x, i] as const).filter(([x]) => x > 1.8 * iv);
    expect(pauses.length).toBeGreaterThan(5);
    for (const [, i] of pauses) {
      const t0 = beats[i]!.t;
      const t1 = beats[i + 1]!.t;
      expect(markers.filter((m) => m.t > t0 + 0.05 && m.t < t1 - 0.1).length).toBe(0);
    }
  });

  it('failureToPace: no spike and no complex (pauses), escape backup only', () => {
    const { markers, beats } = run5('pacedVVI', 120, { rhythmOpts: { pacer: { fault: 'failureToPace', faultRate: 1 } } });
    expect(markers.length).toBe(0);
    expect(beats.every((b) => b.origin === 'ventricular')).toBe(true); // wide escape at 25/min
  });
});
```


- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s5/pacing.test.ts`

Expected: FAIL — no paceSpike markers; pacedVVI only shows the 25/min wide escape.

- [ ] **Step 3: Implement**

Create or replace `packages/engine-core/src/l2/ecg/pacing.ts` with exactly:

```ts
// Implanted pacemaker (brief §5 "Paced"; research 03 §1.7): AAI, VVI, DDD with demand sensing and the four
// faults. Pace pulses are MARKER events, not sampled spikes: a 0.5 ms spike cannot be sampled at 500 Hz and
// monitors draw a standard marker instead (research 03 §1.7). Captured beats use the 'pacedV' template.
import { uniform } from '../../rng/sfc32.ts';
import { makeEvent } from './kernels.ts';
import { RHYTHMS } from './rhythms.ts';
import { applyPMorphology } from './morphology/index.ts';
import { atrialRate, conductAt } from './atria.ts';
import { pWaveKernels } from './templates.ts';
import { HOOKS, NEVER, pushPending, rhythmRate, type RhythmCtx, type RhythmState } from './rhythm-state.ts';
import type { PacerFault } from '../../types.ts';

export const DEFAULT_AV_DELAY_MS = 160; // DDD AV delay 120–200 ms (brief §5)
const PACED_P_DELAY_S = 0.01; // atrial capture latency [ENG]

export interface PacerState {
  nextA: number;
  nextV: number;
}

function interval(st: RhythmState, t: number, ctx: RhythmCtx): number {
  return 60 / (st.opts.pacer?.ratePpm ?? rhythmRate(st, t, ctx));
}

function faultHits(st: RhythmState, f: PacerFault, ctx: RhythmCtx): boolean {
  const p = st.opts.pacer;
  if (!p || p.fault !== f) return false;
  const rate = p.faultRate ?? (f === 'failureToSense' ? 1 : 0.3);
  return uniform(ctx.rng.conduction) < rate;
}

function marker(st: RhythmState, t: number, chamber: 1 | 2, captured: boolean): void {
  st.records.push({ type: 'marker', t, kind: 'paceSpike', data: { chamber, captured, tcp: false } });
}

/** Start or stop the pacemaker when a rhythm is applied. */
function onApply(st: RhythmState, _prev: unknown, t0: number, ctx: RhythmCtx): void {
  const mode = RHYTHMS[st.id].pacing;
  if (mode === 'none') {
    st.pacer = undefined;
    return;
  }
  const iv = interval(st, t0, ctx);
  st.pacer = { nextA: mode === 'VVI' ? NEVER : t0 + 0.1, nextV: mode === 'VVI' ? t0 + iv : NEVER };
}

/** Sensed intrinsic P: AAI/DDD inhibit the atrial output; DDD tracks it with a ventricular output after the AV delay. */
function onSensedP(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const pc = st.pacer;
  const mode = RHYTHMS[st.id].pacing;
  if (!pc || mode === 'VVI' || mode === 'none') return;
  if (faultHits(st, 'failureToSense', ctx)) return;
  pc.nextA = t + interval(st, t, ctx);
  if (mode === 'DDD') pc.nextV = t + (st.opts.pacer?.avDelayMs ?? DEFAULT_AV_DELAY_MS) / 1000;
}

/** Sensed intrinsic ventricular beat: VVI/DDD inhibit (reset) the ventricular output. */
function onBeat(st: RhythmState, p: { origin: string }, ctx: RhythmCtx): void {
  const pc = st.pacer;
  const mode = RHYTHMS[st.id].pacing;
  if (!pc || p.origin === 'paced' || mode === 'AAI' || mode === 'none') return;
  if (faultHits(st, 'failureToSense', ctx)) return;
  const t = st.lastVT;
  if (mode === 'VVI') pc.nextV = t + interval(st, t, ctx);
  else {
    pc.nextV = NEVER;
    pc.nextA = Math.max(pc.nextA, t + interval(st, t, ctx) - (st.opts.pacer?.avDelayMs ?? DEFAULT_AV_DELAY_MS) / 1000);
  }
}

function fireA(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const pc = st.pacer as PacerState;
  const d = RHYTHMS[st.id];
  pc.nextA = t + interval(st, t, ctx);
  if (faultHits(st, 'oversensing', ctx) || faultHits(st, 'failureToPace', ctx)) return; // no spike
  const captured = !faultHits(st, 'failureToCapture', ctx);
  marker(st, t, 1, captured);
  if (!captured) return;
  const tp = t + PACED_P_DELAY_S;
  st.events.push(makeEvent(tp, applyPMorphology(pWaveKernels(), ctx.mods)));
  st.records.push({ type: 'atrial', t: tp, kind: 'paced', conducted: d.pacing === 'AAI' });
  st.atria.lastT = tp;
  st.atria.nextT = tp + 60 / Math.max(20, atrialRate(st, d, tp, ctx)); // atrial capture resets the sinus node
  if (d.pacing === 'AAI') {
    const pr = conductAt(st, tp, atrialRate(st, d, tp, ctx), ctx);
    if (pr !== null) pushPending(st, { t: tp + pr / 1000, origin: 'atrial', template: d.conductedTemplate, prMs: pr, pvc: false, coupling: 0, bypass: false });
  } else {
    pc.nextV = t + (st.opts.pacer?.avDelayMs ?? DEFAULT_AV_DELAY_MS) / 1000;
  }
}

function fireV(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const pc = st.pacer as PacerState;
  const mode = RHYTHMS[st.id].pacing;
  pc.nextV = mode === 'VVI' ? t + interval(st, t, ctx) : NEVER;
  if (faultHits(st, 'oversensing', ctx) || faultHits(st, 'failureToPace', ctx)) return;
  const fault = faultHits(st, 'failureToCapture', ctx);
  const refractory = st.respectRefractory && t < st.refractoryUntil;
  const captured = !fault && !refractory;
  marker(st, t, 2, captured);
  if (captured) HOOKS.activate(st, { t, origin: 'paced', template: 'pacedV', prMs: null, pvc: false, coupling: 0, bypass: false }, ctx);
}

export const pacerClock = {
  next(st: RhythmState): number {
    const pc = st.pacer;
    return pc ? Math.min(pc.nextA, pc.nextV) : NEVER;
  },
  fire(st: RhythmState, t: number, ctx: RhythmCtx): void {
    const pc = st.pacer as PacerState;
    if (t === pc.nextA) fireA(st, t, ctx);
    else fireV(st, t, ctx);
  },
};

HOOKS.onApply.push(onApply);
HOOKS.onP.push(onSensedP);
HOOKS.onBeat.push(onBeat);
```

In `packages/engine-core/src/l2/ecg/rhythm-state.ts`, replace:

```ts
  pendingSwitch: { id: RhythmId; opts: RhythmOpts; respectRefractory: boolean } | null;
```

with:

```ts
  pendingSwitch: { id: RhythmId; opts: RhythmOpts; respectRefractory: boolean } | null;
  /** Implanted pacemaker timers (pacing.ts); undefined when the rhythm is not paced. */
  pacer?: { nextA: number; nextV: number } | undefined;
```

In `packages/engine-core/src/l2/ecg/rhythm-engine.ts`, replace:

```ts
import { applyMorphology } from './morphology/index.ts';
```

with:

```ts
import { applyMorphology } from './morphology/index.ts';
import { pacerClock } from './pacing.ts';
```

In `packages/engine-core/src/l2/ecg/rhythm-engine.ts`, replace:

```ts
const EXTRA_CLOCKS: ClockSource[] = [];
```

with:

```ts
const EXTRA_CLOCKS: ClockSource[] = [pacerClock];
```


- [ ] **Step 4: Run the tests and the type check**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg`

Expected: PASS (no failures; the Stage 1 tests keep passing).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/ecg/pacing.ts packages/engine-core/src/l2/ecg/rhythm-engine.ts packages/engine-core/src/l2/ecg/rhythm-state.ts packages/engine-core/test/l2/ecg/s5/pacing.test.ts
git commit -m "feat(ecg): aai/vvi/ddd pacing with pace markers and capture/sense/pace faults"
```

---

### Task 12: Transcutaneous pacing as seen on the ECG

The `tcp` modifier (Stage 4's pacer device will write it): demand or fixed pulses, a 40 ms blunt pad artefact in the samples plus a marker, capture iff mA ≥ threshold and the ventricle is not refractory.

**Files:**
- Create: `packages/engine-core/src/l2/ecg/tcp.ts`
- Modify: `packages/engine-core/src/l2/ecg/rhythm-state.ts` (field `tcpNextT`), `packages/engine-core/src/l2/ecg/rhythm-engine.ts` (import + `EXTRA_CLOCKS`)
- Test: `packages/engine-core/test/l2/ecg/s5/pacing.test.ts` (append the TCP describe block)

**Interfaces:**
- Consumes: `HOOKS.activate`, `WAVE.ART`.
- Produces: `tcpClock`, `TCP_ART_DIR`, `tcpArtefactMv(mA)`; markers `data: { chamber: 2, captured, tcp: true, mA }`.

- [ ] **Step 1: Write the failing test**

Create or replace `packages/engine-core/test/l2/ecg/s5/pacing.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { diffs, mean, run5, type Beat, type Marker } from '../../../helpers/s5.ts';

const spikes = (m: Marker[], chamber: 1 | 2) => m.filter((x) => x.kind === 'paceSpike' && x.data?.chamber === chamber);

describe('Stage 5 paced rhythms', () => {
  it('pacedVVI (CHB underneath): V spike → wide paced QRS 140–180 ms at the lower rate; P waves march through', () => {
    const { beats, markers, atrial } = run5('pacedVVI', 60);
    const v = spikes(markers, 2);
    const paced = beats.filter((b) => b.origin === 'paced');
    expect(paced.length).toBeGreaterThan(60);
    expect(60 / mean(diffs(paced.map((b) => b.t)))).toBeCloseTo(70, 0);
    expect(paced.every((b) => b.qrsMs >= 140 && b.qrsMs <= 180)).toBe(true);
    for (const b of paced) expect(v.some((s) => b.t - s.t > 0 && b.t - s.t < 0.1)).toBe(true);
    expect(atrial.every((a) => !a.conducted)).toBe(true);
  });

  it('pacedAAI: A spike → P → narrow conducted QRS; intrinsic sinus slower than the pacer', () => {
    const { beats, markers } = run5('pacedAAI', 60);
    const a = spikes(markers, 1);
    expect(a.length).toBeGreaterThan(60);
    expect(spikes(markers, 2).length).toBe(0);
    expect(beats.every((b) => b.qrsMs < 120)).toBe(true);
    expect(60 / mean(diffs(beats.map((b) => b.t)))).toBeCloseTo(70, 0);
  });

  it('pacedDDD: A spike, AV delay 160 ms, V spike, paced QRS (AV sequential)', () => {
    const { beats, markers } = run5('pacedDDD', 60);
    const a = spikes(markers, 1);
    const v = spikes(markers, 2);
    expect(a.length).toBeGreaterThan(60);
    expect(v.length).toBeGreaterThan(60);
    for (const s of v.slice(2, 20)) {
      const prevA = a.filter((x) => x.t < s.t).at(-1)!;
      expect(s.t - prevA.t).toBeCloseTo(0.16, 6);
    }
    expect(beats.filter((b) => b.origin === 'paced').length).toBeGreaterThan(60);
  });

  it('pacedDDD with a faster sinus: atrial tracking (no A spikes, V spike 160 ms after each P)', () => {
    const { markers, atrial } = run5('pacedDDD', 30, { rhythmOpts: { atrialRateBpm: 85 } });
    expect(spikes(markers, 1).length).toBe(0);
    const v = spikes(markers, 2);
    for (const s of v.slice(1)) {
      const p = atrial.filter((x) => x.t < s.t).at(-1)!;
      expect(s.t - p.t).toBeCloseTo(0.16, 6);
    }
  });

  it('demand VVI is inhibited by conducted intrinsic beats faster than the lower rate', () => {
    const { markers, beats } = run5('pacedVVI', 30, { rhythmOpts: { atrialRateBpm: 85, pacer: { intrinsic: 'conducted' } } });
    expect(spikes(markers, 2).length).toBe(0);
    expect(beats.every((b: Beat) => b.origin === 'sinus')).toBe(true);
  });
});

describe('Stage 5 pacing faults (acceptance 8)', () => {
  it('failureToCapture: spikes with no paced QRS after them', () => {
    const { markers, beats } = run5('pacedVVI', 60, { rhythmOpts: { pacer: { fault: 'failureToCapture', faultRate: 1 } } });
    const v = spikes(markers, 2);
    expect(v.length).toBeGreaterThan(40);
    expect(v.every((s) => s.data?.captured === false)).toBe(true);
    expect(beats.filter((b) => b.origin === 'paced').length).toBe(0);
  });

  it('failureToSense: spikes at the programmed rate regardless of intrinsic beats, some on T waves', () => {
    const { markers, beats } = run5('pacedVVI', 120, { rhythmOpts: { atrialRateBpm: 80, pacer: { intrinsic: 'conducted', fault: 'failureToSense', ratePpm: 60 } } });
    const v = spikes(markers, 2);
    const iv = diffs(v.map((s) => s.t));
    expect(Math.max(...iv) - Math.min(...iv)).toBeLessThan(1e-9); // fixed rate: never reset by sensing
    const intrinsic = beats.filter((b) => b.origin === 'sinus');
    const onT = v.filter((s) => intrinsic.some((b) => s.t - (b.t - 0.04) > 0.1 && s.t - (b.t - 0.04) < b.qtMs / 1000));
    expect(onT.length).toBeGreaterThan(5);
  });

  it('oversensing: pauses with no spikes (RR ≈ 2 pacing intervals)', () => {
    const { markers, beats } = run5('pacedVVI', 120, { rhythmOpts: { pacer: { fault: 'oversensing', faultRate: 0.3 } } });
    const rr = diffs(beats.map((b) => b.t));
    const iv = 60 / 70;
    const pauses = rr.map((x, i) => [x, i] as const).filter(([x]) => x > 1.8 * iv);
    expect(pauses.length).toBeGreaterThan(5);
    for (const [, i] of pauses) {
      const t0 = beats[i]!.t;
      const t1 = beats[i + 1]!.t;
      expect(markers.filter((m) => m.t > t0 + 0.05 && m.t < t1 - 0.1).length).toBe(0);
    }
  });

  it('failureToPace: no spike and no complex (pauses), escape backup only', () => {
    const { markers, beats } = run5('pacedVVI', 120, { rhythmOpts: { pacer: { fault: 'failureToPace', faultRate: 1 } } });
    expect(markers.length).toBe(0);
    expect(beats.every((b) => b.origin === 'ventricular')).toBe(true); // wide escape at 25/min
  });
});

describe('Stage 5 transcutaneous pacing (modifier tcp)', () => {
  it('captures iff mA ≥ threshold; artefact kernel on every pulse; fixed mode ignores intrinsic beats', () => {
    const below = run5('asystole', 30, { mods: { tcp: { mode: 'fixed', ratePpm: 70, mA: 60, thresholdMa: 70 } } });
    expect(below.markers.length).toBeGreaterThan(30);
    expect(below.beats.length).toBe(0);
    const above = run5('asystole', 30, { mods: { tcp: { mode: 'fixed', ratePpm: 70, mA: 80, thresholdMa: 70 } } });
    expect(above.beats.length).toBe(above.markers.length);
    expect(above.beats.every((b) => b.origin === 'paced' && b.qrsMs >= 140)).toBe(true);
    const demand = run5('sinus', 30, { hr: 80, mods: { tcp: { mode: 'demand', ratePpm: 60, mA: 100, thresholdMa: 70 } } });
    expect(demand.markers.filter((m) => m.t > 2).length).toBe(0); // inhibited once sinus beats are sensed
  });
});
```


- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s5/pacing.test.ts`

Expected: FAIL — "Stage 5 transcutaneous pacing": no markers.

- [ ] **Step 3: Implement**

Create or replace `packages/engine-core/src/l2/ecg/tcp.ts` with exactly:

```ts
// Transcutaneous pacing as seen on the ECG (brief §6.5; research 03 §1.7): a wide, blunt 20–40 ms artefact per
// pulse plus a pace marker; electrical capture (wide QRS, broad T) iff mA ≥ threshold and the ventricle is not
// refractory. Stage 4's pacer device writes Modifiers.tcp; the engine only draws what the pads do.
import { WAVE, kernel, makeEvent } from './kernels.ts';
import { HOOKS, NEVER, type RhythmCtx, type RhythmState } from './rhythm-state.ts';
import type { Vec3 } from './vcg.ts';

/** Pad artefact direction: anterior–posterior pads, large in V leads and II [ENG]. */
export const TCP_ART_DIR: Vec3 = [0.25, 0.6, -0.9];
/** Artefact amplitude (mV along TCP_ART_DIR): 1.5 + 2.5·mA/140, capped at 4 [ENG]. */
export function tcpArtefactMv(mA: number): number {
  return Math.min(4, 1.5 + (2.5 * mA) / 140);
}

export const tcpClock = {
  next(st: RhythmState, ctx: RhythmCtx): number {
    const m = ctx.mods.tcp;
    if (!m) {
      st.tcpNextT = undefined;
      return NEVER;
    }
    if (st.tcpNextT === undefined) st.tcpNextT = st.planT + 0.05;
    return st.tcpNextT;
  },
  fire(st: RhythmState, t: number, ctx: RhythmCtx): void {
    const m = ctx.mods.tcp;
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
    if (captured) HOOKS.activate(st, { t: t + 0.02, origin: 'paced', template: 'pacedV', prMs: null, pvc: false, coupling: 0, bypass: true }, ctx);
  },
};
```

In `packages/engine-core/src/l2/ecg/rhythm-state.ts`, replace:

```ts
  /** Implanted pacemaker timers (pacing.ts); undefined when the rhythm is not paced. */
  pacer?: { nextA: number; nextV: number } | undefined;
```

with:

```ts
  /** Implanted pacemaker timers (pacing.ts); undefined when the rhythm is not paced. */
  pacer?: { nextA: number; nextV: number } | undefined;
  /** Next transcutaneous pulse (tcp.ts); undefined when TCP is off. */
  tcpNextT?: number | undefined;
```

In `packages/engine-core/src/l2/ecg/rhythm-engine.ts`, replace:

```ts
import { pacerClock } from './pacing.ts';
```

with:

```ts
import { pacerClock } from './pacing.ts';
import { tcpClock } from './tcp.ts';
```

In `packages/engine-core/src/l2/ecg/rhythm-engine.ts`, replace:

```ts
const EXTRA_CLOCKS: ClockSource[] = [pacerClock];
```

with:

```ts
const EXTRA_CLOCKS: ClockSource[] = [pacerClock, tcpClock];
```


- [ ] **Step 4: Run the tests and the type check**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg`

Expected: PASS (no failures; the Stage 1 tests keep passing).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/ecg/rhythm-engine.ts packages/engine-core/src/l2/ecg/rhythm-state.ts packages/engine-core/src/l2/ecg/tcp.ts packages/engine-core/test/l2/ecg/s5/pacing.test.ts
git commit -m "feat(ecg): transcutaneous pacing artefact, markers and capture threshold"
```

---

### Task 13: DSP helpers and the recorded-texture player (time-warp, crossfade, AR fallback)

Shared spectral helpers (Welch, dominant frequency) and the engine-side texture machinery of the VF/AF hybrids (brief §11 C1): Int16/base64 template decoding, a phase-accumulator time-warp to any dominant frequency, an equal-power crossfade between segments, and the four-resonator AR(2) fallback with analytic unit-variance normalisation.

**Files:**
- Create: `packages/engine-core/src/util/dsp.ts`, `packages/engine-core/src/l2/ecg/texture.ts`
- Test: `packages/engine-core/test/l2/ecg/s5/texture.test.ts`

**Interfaces:**
- Consumes: `sfc32Next`.
- Produces: `fft`, `welch(x, fs, nfft)`, `dominantHz(x, fs, lo?, hi?, nfft?)`, `rms`, `organisation`, `lowFraction`; `TemplateSet { scale; items: { id; fdomHz; b64 }[] }`, `DecodedTexture`, `decodeTemplates(set)`, `TexState`, `createTex(n, rng)`, `texSample(tex, state, fHz)`, `XFADE_SAMPLES`, `ArState`, `arSample(state, fHz, e[4])`, `AR_MULT`, `AR_WEIGHT`, `AR_BANDWIDTH_HZ`.

- [ ] **Step 1: Write the failing test**

Create or replace `packages/engine-core/test/l2/ecg/s5/texture.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { normal } from '../../../../src/rng/sfc32.ts';
import { dominantHz, rms } from '../../../../src/util/dsp.ts';
import { arSample, createTex, decodeTemplates, texSample, type TemplateSet } from '../../../../src/l2/ecg/texture.ts';

/** A synthetic template set: two unit-RMS 8 s tones at 5 and 6 Hz, Int16 × 4096, base64 (the bundled format). */
function synthetic(): TemplateSet {
  const enc = (f: number) => {
    const i16 = Int16Array.from({ length: 4000 }, (_, i) => Math.round(Math.SQRT2 * Math.sin((2 * Math.PI * f * i) / 500) * 4096));
    return btoa(String.fromCharCode(...new Uint8Array(i16.buffer)));
  };
  return { scale: 4096, items: [{ id: 'a', fdomHz: 5, b64: enc(5) }, { id: 'b', fdomHz: 6, b64: enc(6) }] };
}

describe('recorded-texture player', () => {
  it('decodes Int16/base64 templates to unit RMS', () => {
    const t = decodeTemplates(synthetic());
    expect(t).toHaveLength(2);
    expect(rms(t[0]!.x)).toBeCloseTo(1, 2);
  });

  it('time-warps any template to the requested dominant frequency, across segment crossfades', () => {
    const tex = decodeTemplates(synthetic());
    for (const f of [3.5, 4.5, 7]) {
      const s = createTex(tex.length, [1, 2, 3, 4]);
      const x = Float64Array.from({ length: 500 * 60 }, () => texSample(tex, s, f));
      expect(Math.abs(dominantHz(x, 500) - f)).toBeLessThanOrEqual(0.25);
      expect(rms(x)).toBeGreaterThan(0.8);
    }
  });

  it('AR(2) fallback: unit RMS with its dominant frequency at f_dom', () => {
    const st = { y1: [0, 0, 0, 0], y2: [0, 0, 0, 0] };
    const rng: [number, number, number, number] = [3, 4, 5, 6];
    const x = new Float64Array(500 * 60);
    for (let n = 0; n < x.length; n++) x[n] = arSample(st, 4.5, [normal(rng), normal(rng), normal(rng), normal(rng)]);
    expect(Math.abs(dominantHz(x.subarray(5000), 500) - 4.5)).toBeLessThanOrEqual(0.5);
    expect(rms(x.subarray(5000))).toBeGreaterThan(0.8);
    expect(rms(x.subarray(5000))).toBeLessThan(1.2);
  });
});
```


- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s5/texture.test.ts`

Expected: FAIL — cannot resolve `src/util/dsp.ts` / `src/l2/ecg/texture.ts`.

- [ ] **Step 3: Implement**

Create or replace `packages/engine-core/src/util/dsp.ts` with exactly:

```ts
// Small DSP helpers shared by engine tests and the template-extraction scripts (textbook definitions:
// radix-2 FFT, Welch's averaged periodogram with a Hann window). No imports, so dev scripts can load it directly.

/** In-place radix-2 FFT (re, im of equal power-of-two length). */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i] as number;
      re[i] = re[j] as number;
      re[j] = tr;
      const ti = im[i] as number;
      im[i] = im[j] as number;
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let j = 0; j < len / 2; j++) {
        const wr = Math.cos(ang * j);
        const wi = Math.sin(ang * j);
        const a = i + j;
        const b = a + len / 2;
        const xr = (re[b] as number) * wr - (im[b] as number) * wi;
        const xi = (re[b] as number) * wi + (im[b] as number) * wr;
        re[b] = (re[a] as number) - xr;
        im[b] = (im[a] as number) - xi;
        re[a] = (re[a] as number) + xr;
        im[a] = (im[a] as number) + xi;
      }
    }
  }
}

/** Welch PSD (Hann window, 50% overlap, per-segment mean removed). nfft must be a power of two ≤ x.length. */
export function welch(x: ArrayLike<number>, fs: number, nfft = 1024): { f: Float64Array; p: Float64Array } {
  if (x.length < nfft) throw new RangeError(`welch: need ≥ ${nfft} samples, got ${x.length}`);
  const hop = nfft / 2;
  const w = new Float64Array(nfft);
  for (let i = 0; i < nfft; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (nfft - 1));
  const p = new Float64Array(nfft / 2 + 1);
  const re = new Float64Array(nfft);
  const im = new Float64Array(nfft);
  let segs = 0;
  for (let s = 0; s + nfft <= x.length; s += hop) {
    let m = 0;
    for (let i = 0; i < nfft; i++) m += x[s + i] as number;
    m /= nfft;
    for (let i = 0; i < nfft; i++) {
      re[i] = ((x[s + i] as number) - m) * (w[i] as number);
      im[i] = 0;
    }
    fft(re, im);
    for (let k = 0; k <= nfft / 2; k++) p[k] = (p[k] as number) + (re[k] as number) ** 2 + (im[k] as number) ** 2;
    segs++;
  }
  const f = new Float64Array(nfft / 2 + 1);
  for (let k = 0; k <= nfft / 2; k++) {
    f[k] = (k * fs) / nfft;
    p[k] = (p[k] as number) / segs;
  }
  return { f, p };
}

/** Frequency of the maximum of the 5-bin-smoothed Welch PSD within [lo, hi] Hz. */
export function dominantHz(x: ArrayLike<number>, fs: number, lo = 1, hi = 12, nfft = 2048): number {
  const { f, p } = welch(x, fs, nfft);
  let best = -1;
  let bf = 0;
  for (let k = 0; k < p.length; k++) {
    const fk = f[k] as number;
    if (fk < lo || fk > hi) continue;
    let s = 0;
    for (let j = -2; j <= 2; j++) s += p[Math.min(p.length - 1, Math.max(0, k + j))] as number;
    if (s > best) {
      best = s;
      bf = fk;
    }
  }
  return bf;
}

export function rms(x: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += (x[i] as number) ** 2;
  return Math.sqrt(s / x.length);
}

/** Fraction of [lo, hi] Hz power within ±halfWidth Hz of the dominant frequency (organisation index) [ENG]. */
export function organisation(x: ArrayLike<number>, fs: number, lo = 1, hi = 12, halfWidth = 1, nfft = 2048): number {
  const { f, p } = welch(x, fs, nfft);
  const fd = dominantHz(x, fs, lo, hi, nfft);
  let tot = 0;
  let near = 0;
  for (let k = 0; k < p.length; k++) {
    const fk = f[k] as number;
    if (fk < lo || fk > hi) continue;
    tot += p[k] as number;
    if (Math.abs(fk - fd) <= halfWidth) near += p[k] as number;
  }
  return near / tot;
}

/** Fraction of [lo, hi] Hz power below `below` Hz. */
export function lowFraction(x: ArrayLike<number>, fs: number, below = 2.5, lo = 1, hi = 12, nfft = 2048): number {
  const { f, p } = welch(x, fs, nfft);
  let tot = 0;
  let low = 0;
  for (let k = 0; k < p.length; k++) {
    const fk = f[k] as number;
    if (fk < lo || fk > hi) continue;
    tot += p[k] as number;
    if (fk < below) low += p[k] as number;
  }
  return low / tot;
}
```

Create or replace `packages/engine-core/src/l2/ecg/texture.ts` with exactly:

```ts
// Recorded-texture playback (brief §11 C1): Int16 templates (base64, 500 Hz, unit RMS × scale) are decoded once,
// then played with a phase accumulator whose speed is f_target / f_template (time-warp), with an equal-power
// crossfade into a randomly chosen next segment. State is JSON-safe.
import { sfc32Next, type Sfc32State } from '../../rng/sfc32.ts';

export interface TemplateSet {
  scale: number;
  items: ReadonlyArray<{ id: string; fdomHz: number; b64: string }>;
}
export interface DecodedTexture {
  id: string;
  fdomHz: number;
  x: Float32Array;
}

const cache = new WeakMap<TemplateSet, DecodedTexture[]>();

export function decodeTemplates(set: TemplateSet): DecodedTexture[] {
  let d = cache.get(set);
  if (!d) {
    d = set.items.map((t) => {
      const bin = atob(t.b64);
      const x = new Float32Array(bin.length / 2);
      for (let i = 0; i < x.length; i++) {
        let v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8);
        if (v >= 32768) v -= 65536;
        x[i] = v / set.scale;
      }
      return { id: t.id, fdomHz: t.fdomHz, x };
    });
    cache.set(set, d);
  }
  return d;
}

export const XFADE_SAMPLES = 250; // 0.5 s equal-power crossfade [ENG]

export interface TexState {
  seg: number;
  pos: number;
  next: number;
  npos: number;
  fade: number;
  rng: Sfc32State;
}

export function createTex(n: number, rng: Sfc32State): TexState {
  return { seg: sfc32Next(rng) % n, pos: sfc32Next(rng) % 1000, next: -1, npos: 0, fade: 0, rng };
}

function at(x: Float32Array, p: number): number {
  const i = Math.floor(p);
  const f = p - i;
  const a = x[Math.min(i, x.length - 1)] as number;
  const b = x[Math.min(i + 1, x.length - 1)] as number;
  return a + (b - a) * f;
}

/** One 500 Hz output sample of unit-RMS texture whose dominant frequency is fHz. */
export function texSample(tex: readonly DecodedTexture[], s: TexState, fHz: number): number {
  const cur = tex[s.seg] as DecodedTexture;
  const speed = fHz / cur.fdomHz;
  let v = at(cur.x, s.pos);
  s.pos += speed;
  if (s.next < 0 && s.pos > cur.x.length - XFADE_SAMPLES * speed - 2) {
    let n = sfc32Next(s.rng) % tex.length;
    if (n === s.seg && tex.length > 1) n = (n + 1) % tex.length;
    s.next = n;
    s.npos = sfc32Next(s.rng) % 500;
    s.fade = 0;
  }
  if (s.next >= 0) {
    const nx = tex[s.next] as DecodedTexture;
    const w = s.fade / XFADE_SAMPLES;
    v = v * Math.cos((w * Math.PI) / 2) + at(nx.x, s.npos) * Math.sin((w * Math.PI) / 2);
    s.npos += fHz / nx.fdomHz;
    s.fade++;
    if (s.fade >= XFADE_SAMPLES) {
      s.seg = s.next;
      s.pos = s.npos;
      s.next = -1;
    }
  }
  return v;
}

// --- AR(2) resonator fallback (brief §4.1: four resonators at f_dom·{0.8, 1, 1.25, 1.6}, 1–2 Hz bandwidth) ---
export const AR_MULT = [0.8, 1, 1.25, 1.6] as const;
export const AR_WEIGHT = [0.4, 1, 0.5, 0.25] as const; // [ENG]
export const AR_BANDWIDTH_HZ = 1.5;

export interface ArState {
  y1: number[];
  y2: number[];
}

/** One 500 Hz sample of the AR fallback with unit RMS. e: four independent N(0,1) draws. */
export function arSample(s: ArState, fHz: number, e: readonly number[]): number {
  const r = Math.exp((-Math.PI * AR_BANDWIDTH_HZ) / 500);
  const a2 = -r * r;
  let out = 0;
  let wsum = 0;
  for (let k = 0; k < 4; k++) {
    const a1 = 2 * r * Math.cos((2 * Math.PI * fHz * (AR_MULT[k] as number)) / 500);
    // stationary variance of y = a1·y1 + a2·y2 + e (unit-variance e): (1 − a2) / ((1 + a2)((1 − a2)² − a1²))
    const varY = (1 - a2) / ((1 + a2) * ((1 - a2) ** 2 - a1 * a1));
    const y = a1 * (s.y1[k] as number) + a2 * (s.y2[k] as number) + (e[k] as number);
    s.y2[k] = s.y1[k] as number;
    s.y1[k] = y;
    out += ((AR_WEIGHT[k] as number) * y) / Math.sqrt(varY);
    wsum += (AR_WEIGHT[k] as number) ** 2;
  }
  return out / Math.sqrt(wsum);
}
```


- [ ] **Step 4: Run the tests and the type check**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg`

Expected: PASS (no failures; the Stage 1 tests keep passing).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/ecg/texture.ts packages/engine-core/src/util/dsp.ts packages/engine-core/test/l2/ecg/s5/texture.test.ts
git commit -m "feat(ecg): dsp helpers and recorded-texture player with ar(2) fallback"
```

---

### Task 14: WFDB readers, verified PhysioNet fetch, extraction DSP

Dev-only dataset tooling in `@pme/validation`, written from PhysioNet's format documentation (header(5), signal(5), annot(5) at https://physionet.org/physiotools/wag/) — no WFDB library code. Downloads land in the git-ignored `packages/validation/datasets/cache/` and are checked against each project's `SHA256SUMS.txt`.

**Files:**
- Create: `packages/validation/src/templates/wfdb.ts`, `fetch.ts`, `dsp.ts`, `template-module.ts`
- Test: `packages/validation/test/templates/wfdb.test.ts`

**Interfaces:**
- Consumes: `engine-core/src/util/dsp.ts` (relative import; the scripts must not import the engine-core index, which imports the template modules they generate).
- Produces: `parseHeader`, `decode212`, `decode16`, `parseAnnotations`, `ANN { RHYTHM: 28, VFON: 32, VFOFF: 33, NOISE: 14 }`; `PHYSIONET`, `fetchCached(cache, project, file)`, `parseSums`, `sha256`, `fetchVerified(cache, project, file, sums)`; `highpassZeroPhase`, `bandpassZeroPhase`, `resample(x, fsIn, fsOut)`, `toInt16Base64(x, scale)`; `writeTemplateModule(path, { noticeId, attribution, generator, constName, scaleName, scale, items })`.

- [ ] **Step 1: Write the failing test**

Create or replace `packages/validation/test/templates/wfdb.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { ANN, decode16, decode212, parseAnnotations, parseHeader } from '../../src/templates/wfdb.ts';
import { parseSums, sha256 } from '../../src/templates/fetch.ts';
import { resample, toInt16Base64 } from '../../src/templates/dsp.ts';
import { dominantHz, rms } from '../../../engine-core/src/util/dsp.ts';
import { decodeTemplates } from '../../../engine-core/src/l2/ecg/texture.ts';

describe('WFDB readers (header(5), signal(5), annot(5))', () => {
  it('parses a CUDB header and a PTB-XL header', () => {
    const cu = parseHeader('cu01 1 250 127232\ncu01.dat 212 400 12 0 -109 -28468 0 ECG\n');
    expect(cu).toMatchObject({ record: 'cu01', nSignals: 1, fs: 250, nSamples: 127232 });
    expect(cu.signals[0]).toMatchObject({ format: 212, gain: 400, baseline: 0, description: 'ECG' });
    const px = parseHeader('00001_hr 12 500 5000\n00001_hr.dat 16 1000.0(0)/mV 16 0 -115 13047 0 I\n' + '00001_hr.dat 16 1000.0(0)/mV 16 0 -50 11561 0 II\n'.repeat(11));
    expect(px.signals).toHaveLength(12);
    expect(px.signals[0]).toMatchObject({ format: 16, gain: 1000, baseline: 0 });
  });

  it('decodes format 212 (12-bit two’s complement, 3 bytes per pair) and format 16', () => {
    // 1 = 0x001 and −2 = 0xFFE → 0x01, 0xF0, 0xFE; 2047 = 0x7FF and −2048 = 0x800 → 0xFF, 0x87, 0x00
    const one = decode212(Uint8Array.from([0x01, 0xf0, 0xfe, 0xff, 0x87, 0x00]), 1)[0]!;
    expect([...one]).toEqual([1, -2, 2047, -2048]);
    const two = decode212(Uint8Array.from([0x01, 0xf0, 0xfe, 0xff, 0x87, 0x00]), 2);
    expect([...two[0]!]).toEqual([1, 2047]);
    expect([...two[1]!]).toEqual([-2, -2048]);
    const s16 = decode16(Uint8Array.from([0x10, 0x00, 0xff, 0xff, 0x00, 0x80, 0xff, 0x7f]), 2);
    expect([...s16[0]!]).toEqual([16, -32768]);
    expect([...s16[1]!]).toEqual([-1, 32767]);
  });

  it('parses MIT-format annotations with AUX, NUM/CHN and SKIP', () => {
    const w = (a: number, i: number) => [(a << 10 | i) & 0xff, ((a << 10) | i) >> 8];
    const aux = [...'(AFIB'].map((c) => c.charCodeAt(0));
    const bytes = [
      ...w(1, 10), // N at 10
      ...w(ANN.RHYTHM, 5), ...w(63, aux.length), ...aux, 0, // rhythm at 15 with aux "(AFIB" (odd length → pad)
      ...w(62, 1), // CHN (ignored)
      ...w(59, 0), 0x01, 0x00, 0x00, 0x00, // SKIP 65536 (high word 1, low word 0)
      ...w(ANN.VFON, 4), // at 15 + 65536 + 4
      0, 0,
    ];
    const ann = parseAnnotations(Uint8Array.from(bytes));
    expect(ann.map((a) => [a.sample, a.code, a.aux])).toEqual([[10, 1, ''], [15, ANN.RHYTHM, '(AFIB'], [65555, ANN.VFON, '']]);
  });

  it('SHA256SUMS parsing and hashing', () => {
    const m = parseSums('abc123  cu01.dat\nDEF  records500/00000/00001_hr.hea\n');
    expect(m.get('cu01.dat')).toBe('abc123');
    expect(m.get('records500/00000/00001_hr.hea')).toBe('def');
    expect(sha256(new TextEncoder().encode('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('extraction DSP and the template format', () => {
  it('resampling 360 → 500 Hz keeps frequency and amplitude', () => {
    const x = Float64Array.from({ length: 360 * 10 }, (_, i) => Math.sin((2 * Math.PI * 6 * i) / 360));
    const y = resample(x, 360, 500);
    expect(y.length).toBe(5000);
    expect(dominantHz(y, 500, 1, 20)).toBeCloseTo(6, 0);
    expect(rms(y.subarray(100, 4900))).toBeCloseTo(Math.SQRT1_2, 2);
  });

  it('Int16/base64 round-trips through the engine decoder', () => {
    const x = Float64Array.from({ length: 1000 }, (_, i) => Math.sin(i / 7) * 1.3);
    const [d] = decodeTemplates({ scale: 4096, items: [{ id: 't', fdomHz: 5, b64: toInt16Base64(x, 4096) }] });
    for (let i = 0; i < x.length; i++) expect(d!.x[i]).toBeCloseTo(x[i]!, 3);
  });

});
```


- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/templates/wfdb.test.ts`

Expected: FAIL — cannot resolve `../../src/templates/wfdb.ts`.

- [ ] **Step 3: Implement**

Create or replace `packages/validation/src/templates/wfdb.ts` with exactly:

```ts
// Minimal WFDB readers, written clean-room from PhysioNet's format documentation (header(5), signal(5),
// annot(5): https://physionet.org/physiotools/wag/). No WFDB library code consulted.

export interface WfdbSignal { file: string; format: number; gain: number; baseline: number; description: string }
export interface WfdbHeader { record: string; nSignals: number; fs: number; nSamples: number; signals: WfdbSignal[] }

/** Parse a .hea text (record line + one line per signal). Comment lines (#) are skipped. */
export function parseHeader(text: string): WfdbHeader {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '' && !l.startsWith('#'));
  const rec = (lines[0] ?? '').trim().split(/\s+/);
  const nSignals = Number(rec[1]);
  const fs = parseFloat((rec[2] ?? '250').split('/')[0] as string);
  const nSamples = Number(rec[3] ?? 0);
  const signals: WfdbSignal[] = [];
  for (let i = 1; i <= nSignals; i++) {
    const f = (lines[i] ?? '').trim().split(/\s+/);
    const fmt = parseInt(f[1] ?? '0', 10);
    // gain field: "400" or "1000.0(0)/mV" → gain, optional (baseline), optional /units
    const g = /^([\d.]+)(?:\(([-\d]+)\))?/.exec(f[2] ?? '200');
    const gain = g && Number(g[1]) > 0 ? Number(g[1]) : 200;
    const adcZero = Number(f[4] ?? 0);
    const baseline = g && g[2] !== undefined ? Number(g[2]) : adcZero;
    signals.push({ file: f[0] as string, format: fmt, gain, baseline, description: f.slice(8).join(' ') });
  }
  return { record: rec[0] as string, nSignals, fs, nSamples, signals };
}

/** Decode format 212 (two 12-bit two's-complement samples per 3 bytes), interleaved over nSignals. */
export function decode212(buf: Uint8Array, nSignals: number): Int16Array[] {
  const total = Math.floor((buf.length * 2) / 3);
  const flat = new Int16Array(total);
  let k = 0;
  for (let i = 0; i + 2 < buf.length; i += 3) {
    const b0 = buf[i] as number, b1 = buf[i + 1] as number, b2 = buf[i + 2] as number;
    let s0 = b0 | ((b1 & 0x0f) << 8);
    let s1 = b2 | ((b1 & 0xf0) << 4);
    if (s0 > 2047) s0 -= 4096;
    if (s1 > 2047) s1 -= 4096;
    flat[k++] = s0;
    flat[k++] = s1;
  }
  return deinterleave(flat.subarray(0, k), nSignals);
}

/** Decode format 16 (16-bit little-endian two's complement), interleaved over nSignals. */
export function decode16(buf: Uint8Array, nSignals: number): Int16Array[] {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const flat = new Int16Array(Math.floor(buf.length / 2));
  for (let i = 0; i < flat.length; i++) flat[i] = dv.getInt16(2 * i, true);
  return deinterleave(flat, nSignals);
}

function deinterleave(flat: Int16Array, n: number): Int16Array[] {
  const len = Math.floor(flat.length / n);
  const out = Array.from({ length: n }, () => new Int16Array(len));
  for (let i = 0; i < len; i++) for (let s = 0; s < n; s++) (out[s] as Int16Array)[i] = flat[i * n + s] as number;
  return out;
}

export interface Annotation { sample: number; code: number; aux: string }

/** Parse an MIT-format annotation file (annot(5)). */
export function parseAnnotations(buf: Uint8Array): Annotation[] {
  const out: Annotation[] = [];
  let t = 0;
  let i = 0;
  while (i + 1 < buf.length) {
    const w = (buf[i] as number) | ((buf[i + 1] as number) << 8);
    i += 2;
    const a = w >> 10;
    const n = w & 0x3ff;
    if (a === 0 && n === 0) break;
    if (a === 59) { // SKIP: PDP-11 long (high word first, each word little-endian)
      const hi = (buf[i] as number) | ((buf[i + 1] as number) << 8);
      const lo = (buf[i + 2] as number) | ((buf[i + 3] as number) << 8);
      t += ((hi << 16) | lo) | 0;
      i += 4;
      continue;
    }
    if (a === 60 || a === 61 || a === 62) continue; // NUM / SUB / CHN
    if (a === 63) { // AUX for the previous annotation
      const s = new TextDecoder('latin1').decode(buf.subarray(i, i + n)).replace(/\0+$/, '');
      const last = out[out.length - 1];
      if (last) last.aux = s;
      i += n + (n & 1);
      continue;
    }
    t += n;
    out.push({ sample: t, code: a, aux: '' });
  }
  return out;
}

/** Annotation codes used here (ecgcodes.h values as documented in annot(5)/ecgcodes). */
export const ANN = { RHYTHM: 28, VFON: 32, VFOFF: 33, NOISE: 14 } as const;
```

Create or replace `packages/validation/src/templates/fetch.ts` with exactly:

```ts
// Download PhysioNet files into a git-ignored cache and verify them against the project's SHA256SUMS.txt.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const PHYSIONET = 'https://physionet.org/files';

export async function fetchCached(cacheDir: string, project: string, file: string): Promise<Uint8Array> {
  const path = join(cacheDir, project, file);
  if (existsSync(path)) return new Uint8Array(readFileSync(path));
  const url = `${PHYSIONET}/${project}/${file}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buf);
  return buf;
}

/** Parse SHA256SUMS.txt ("<hex>  <path>" per line). */
export function parseSums(text: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const [h, p] = line.trim().split(/\s+/);
    if (h && p) m.set(p, h.toLowerCase());
  }
  return m;
}

export function sha256(buf: Uint8Array): string {
  return createHash('sha256').update(buf).digest('hex');
}

export async function fetchVerified(cacheDir: string, project: string, file: string, sums: Map<string, string>): Promise<Uint8Array> {
  const buf = await fetchCached(cacheDir, project, file);
  const want = sums.get(file);
  if (!want) throw new Error(`${project}/${file}: not listed in SHA256SUMS.txt`);
  const got = sha256(buf);
  if (got !== want) throw new Error(`${project}/${file}: SHA-256 mismatch (${got} ≠ ${want})`);
  return buf;
}
```

Create or replace `packages/validation/src/templates/dsp.ts` with exactly:

```ts
// Extraction-only DSP (filters, resampling). Spectral helpers come from engine-core so the template metadata
// (fdomHz) is measured with exactly the estimator the engine's tests use.
export { dominantHz, lowFraction, organisation, rms, welch } from '../../../engine-core/src/util/dsp.ts';

/** Zero-phase first-order high-pass (forward + backward), cut-off fc. */
export function highpassZeroPhase(x: Float64Array, fs: number, fc: number): Float64Array {
  const a = Math.exp((-2 * Math.PI * fc) / fs);
  const run = (v: Float64Array) => {
    const o = new Float64Array(v.length);
    let py = 0;
    let px = v[0] as number;
    for (let i = 0; i < v.length; i++) {
      const y = a * (py + (v[i] as number) - px);
      o[i] = y;
      py = y;
      px = v[i] as number;
    }
    return o;
  };
  return run(run(x).reverse()).reverse();
}

/** Zero-phase band-pass: first-order high-pass (flo) then first-order low-pass (fhi), each forward + backward. */
export function bandpassZeroPhase(x: Float64Array, fs: number, flo: number, fhi: number): Float64Array {
  const hp = highpassZeroPhase(x, fs, flo);
  const a = Math.exp((-2 * Math.PI * fhi) / fs);
  const lp = (v: Float64Array) => {
    const o = new Float64Array(v.length);
    let y = v[0] as number;
    for (let i = 0; i < v.length; i++) {
      y = a * y + (1 - a) * (v[i] as number);
      o[i] = y;
    }
    return o;
  };
  return lp(lp(hp).reverse()).reverse();
}

/** Resample fsIn → fsOut with a Hann-windowed sinc interpolator (±16 input samples, anti-aliased) [ENG]. */
export function resample(x: Float64Array, fsIn: number, fsOut: number): Float64Array {
  const n = Math.floor((x.length * fsOut) / fsIn);
  const out = new Float64Array(n);
  const H = 16;
  const cut = Math.min(1, fsOut / fsIn);
  for (let i = 0; i < n; i++) {
    const t = (i * fsIn) / fsOut;
    const c = Math.floor(t);
    let acc = 0;
    let wsum = 0;
    for (let j = c - H + 1; j <= c + H; j++) {
      if (j < 0 || j >= x.length) continue;
      const d = t - j;
      const sinc = d === 0 ? 1 : Math.sin(Math.PI * d * cut) / (Math.PI * d * cut);
      const w = 0.5 + 0.5 * Math.cos((Math.PI * d) / H);
      acc += (x[j] as number) * sinc * w;
      wsum += sinc * w;
    }
    out[i] = acc / wsum;
  }
  return out;
}

/** Quantise a unit-RMS signal to Int16 (× scale) and base64-encode it little-endian. */
export function toInt16Base64(x: Float64Array, scale: number): string {
  const i16 = Int16Array.from(x, (v) => Math.max(-32767, Math.min(32767, Math.round(v * scale))));
  const bytes = new Uint8Array(i16.buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i] as number);
  return btoa(bin);
}
```

Create or replace `packages/validation/src/templates/template-module.ts` with exactly:

```ts
// Writes a generated template module under packages/engine-core/templates/ (brief §8: first line NOTICE-ID).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export interface TemplateItem {
  id: string;
  fdomHz: number;
  b64: string;
}

export function writeTemplateModule(path: string, o: { noticeId: string; attribution: string[]; generator: string; constName: string; scaleName: string; scale: number; items: TemplateItem[] }): void {
  const lines = [
    `// NOTICE-ID: ${o.noticeId}`,
    ...o.attribution.map((l) => `// ${l}`),
    `// Generated by ${o.generator} — do not edit. Int16 little-endian, 500 Hz, unit RMS × ${o.scale}, base64.`,
    `export const ${o.scaleName} = ${o.scale};`,
    `export const ${o.constName}: ReadonlyArray<{ id: string; fdomHz: number; b64: string }> = [`,
    ...o.items.map((t) => `  { id: '${t.id}', fdomHz: ${t.fdomHz.toFixed(3)}, b64: '${t.b64}' },`),
    '];',
    '',
  ];
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, lines.join('\n'));
}
```


- [ ] **Step 4: Run the tests and the type check**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation typecheck && npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run`

Expected: PASS (no failures; the Stage 1 tests keep passing).

- [ ] **Step 5: Commit**

```bash
git add packages/validation/src/templates/dsp.ts packages/validation/src/templates/fetch.ts packages/validation/src/templates/template-module.ts packages/validation/src/templates/wfdb.ts packages/validation/test/templates/wfdb.test.ts
git commit -m "feat(validation): wfdb readers, verified physionet fetch, extraction dsp"
```

---

### Task 15: Extract and bundle the VF (CUDB) and AF f-wave (MIT-BIH) templates, with NOTICES

Run the two extraction scripts against PhysioNet, commit the generated Int16 template modules under `packages/engine-core/templates/` (first line `// NOTICE-ID: N-050` / `N-051`, then the attribution text), add the NOTICES rows in the same commit (brief §8), and pin provenance with a test (acceptance 9).

**Files:**
- Create: `packages/validation/src/templates/extract-vf.ts`, `extract-af.ts`
- Generate: `packages/engine-core/templates/vf-cudb.ts`, `packages/engine-core/templates/af-mitdb.ts`
- Modify: `NOTICES.md` (rows N-050, N-051), `packages/validation/package.json` (scripts `templates`, `ptbxl-report`)
- Test: `packages/validation/test/templates/bundled.test.ts`

**Interfaces:**
- Consumes: Task 14.
- Produces: `VF_TEMPLATES`/`VF_SCALE` (6 × 8 s, 500 Hz, unit RMS × 4096) and `AF_TEMPLATES`/`AF_SCALE` (4 × 8 s); `extractVf(cache)`, `extractAf(cache)`, `VF_ATTRIBUTION`, `AF_ATTRIBUTION`.

- [ ] **Step 1: Write the failing test**

Create or replace `packages/validation/test/templates/bundled.test.ts` with exactly:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { VF_SCALE, VF_TEMPLATES } from '../../../engine-core/templates/vf-cudb.ts';
import { AF_SCALE, AF_TEMPLATES } from '../../../engine-core/templates/af-mitdb.ts';
import { decodeTemplates } from '../../../engine-core/src/l2/ecg/texture.ts';
import { dominantHz, rms } from '../../../engine-core/src/util/dsp.ts';
import { noticeIds } from '../../../../scripts/check-notices.ts';

const root = resolve(import.meta.dirname, '../../../..');

describe('bundled templates (acceptance 9: provenance)', () => {
  it.each([
    ['vf-cudb.ts', 'N-050', 6, VF_SCALE, VF_TEMPLATES, [3.5, 7]],
    ['af-mitdb.ts', 'N-051', 4, AF_SCALE, AF_TEMPLATES, [4, 9]],
  ] as const)('%s: NOTICE-ID row exists, attribution present, unit RMS at 500 Hz, dominant frequency in band', (file, id, n, scale, items, band) => {
    const text = readFileSync(resolve(root, 'packages/engine-core/templates', file), 'utf8');
    expect(text.split('\n')[0]).toBe(`// NOTICE-ID: ${id}`);
    expect(text).toContain('Open Data Commons Attribution License v1.0');
    expect(noticeIds(readFileSync(resolve(root, 'NOTICES.md'), 'utf8')).has(id)).toBe(true);
    expect(items).toHaveLength(n);
    for (const t of decodeTemplates({ scale, items })) {
      expect(t.x.length).toBe(4000); // 8 s at 500 Hz
      expect(rms(t.x)).toBeCloseTo(1, 2);
      const f = dominantHz(t.x, 500, 1, 12);
      expect(f).toBeGreaterThanOrEqual(band[0]);
      expect(f).toBeLessThanOrEqual(band[1]);
      expect(Math.abs(f - t.fdomHz)).toBeLessThan(0.3);
    }
  });
});
```


- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/templates/bundled.test.ts`

Expected: FAIL — cannot resolve `engine-core/templates/vf-cudb.ts`.

- [ ] **Step 3: Implement**

Create or replace `packages/validation/src/templates/extract-vf.ts` with exactly:

```ts
// VF texture templates from the Creighton University Ventricular Tachyarrhythmia Database (CUDB, ODC-By 1.0).
// For every '[' … ']' episode (annotation codes VFON/VFOFF), non-overlapping 8 s windows starting 2 s after onset
// are kept when they carry no noise annotation, never touch the ±2000-unit ADC limit, have a dominant frequency of
// 3.5–7 Hz, an organisation index (power within ±1 Hz of the peak) of 0.45–0.72 and < 12% of power below 2.5 Hz.
// The most organised window per record is kept, then the 6 most organised records. Each window is high-passed at
// 0.7 Hz (zero phase), resampled 250 → 500 Hz, scaled to unit RMS and quantised to Int16 (× 4096).
// Usage: node --experimental-strip-types packages/validation/src/templates/extract-vf.ts [cacheDir] [outFile]
import { fetchCached, fetchVerified, parseSums } from './fetch.ts';
import { ANN, decode212, parseAnnotations, parseHeader } from './wfdb.ts';
import { dominantHz, highpassZeroPhase, lowFraction, organisation, resample, rms, toInt16Base64 } from './dsp.ts';
import { writeTemplateModule, type TemplateItem } from './template-module.ts';

export const VF_ATTRIBUTION = [
  'Source: Creighton University Ventricular Tachyarrhythmia Database v1.0.0 (CUDB), https://physionet.org/content/cudb/1.0.0/ (DOI 10.13026/C2X59M).',
  'Licence: Open Data Commons Attribution License v1.0 (https://opendatacommons.org/licenses/by/1-0/).',
  'Cite: Nolle FM, Badura FK, Catlett JM, Bowser RW, Sketch MH. CREI-GARD, a new concept in computerized arrhythmia monitoring systems. Computers in Cardiology 13:515-518 (1986).',
  'Changes: 8 s VF windows high-passed (0.7 Hz), resampled 250 -> 500 Hz, normalised to unit RMS, quantised to Int16.',
];

const PROJECT = 'cudb/1.0.0';
const WIN_S = 8;
const SCALE = 4096;

export async function extractVf(cache: string): Promise<TemplateItem[]> {
  const td = new TextDecoder();
  const sums = parseSums(td.decode(await fetchCached(cache, PROJECT, 'SHA256SUMS.txt')));
  const cands: Array<{ rec: string; startS: number; fdom: number; org: number; x: Float64Array }> = [];
  for (let r = 1; r <= 35; r++) {
    const rec = `cu${String(r).padStart(2, '0')}`;
    const h = parseHeader(td.decode(await fetchVerified(cache, PROJECT, `${rec}.hea`, sums)));
    const ann = parseAnnotations(await fetchVerified(cache, PROJECT, `${rec}.atr`, sums));
    const sig = decode212(await fetchVerified(cache, PROJECT, `${rec}.dat`, sums), h.nSignals)[0] as Int16Array;
    const s0 = h.signals[0]!;
    const noise = ann.filter((a) => a.code === ANN.NOISE).map((a) => a.sample);
    const eps: Array<[number, number]> = [];
    let on = -1;
    for (const a of ann) {
      if (a.code === ANN.VFON) on = a.sample;
      if (a.code === ANN.VFOFF && on >= 0) {
        eps.push([on, a.sample]);
        on = -1;
      }
    }
    if (on >= 0) eps.push([on, sig.length]);
    for (const [a, b] of eps) {
      for (let s = a + 2 * h.fs; s + WIN_S * h.fs <= b; s += WIN_S * h.fs) {
        const e = s + WIN_S * h.fs;
        if (noise.some((t) => t >= s - h.fs && t <= e)) continue;
        const raw = sig.subarray(s, e);
        if (raw.some((v) => Math.abs(v) >= 2000)) continue;
        const mv = Float64Array.from(raw, (v) => (v - s0.baseline) / s0.gain);
        const x = resample(highpassZeroPhase(mv, h.fs, 0.7), h.fs, 500);
        const fd = dominantHz(x, 500);
        const org = organisation(x, 500);
        if (fd < 3.5 || fd > 7 || org < 0.45 || org > 0.72 || lowFraction(x, 500) > 0.12 || rms(x) < 0.05) continue;
        cands.push({ rec, startS: s / h.fs, fdom: fd, org, x });
      }
    }
  }
  const best = new Map<string, (typeof cands)[number]>();
  for (const c of cands) {
    const b = best.get(c.rec);
    if (!b || c.org > b.org) best.set(c.rec, c);
  }
  return [...best.values()]
    .sort((p, q) => q.org - p.org)
    .slice(0, 6)
    .map((c) => {
      const k = 1 / rms(c.x);
      return { id: `${c.rec}@${c.startS.toFixed(1)}s`, fdomHz: c.fdom, b64: toInt16Base64(c.x.map((v) => v * k), SCALE) };
    });
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.filename === (await import('node:path')).resolve(process.argv[1]);
if (invokedDirectly) {
  const cache = process.argv[2] ?? 'packages/validation/datasets/cache';
  const out = process.argv[3] ?? 'packages/engine-core/templates/vf-cudb.ts';
  const items = await extractVf(cache);
  for (const i of items) console.log(`vf ${i.id} fdom ${i.fdomHz.toFixed(2)} Hz`);
  writeTemplateModule(out, { noticeId: 'N-050', attribution: VF_ATTRIBUTION, generator: 'packages/validation/src/templates/extract-vf.ts', constName: 'VF_TEMPLATES', scaleName: 'VF_SCALE', scale: SCALE, items });
}
```

Create or replace `packages/validation/src/templates/extract-af.ts` with exactly:

```ts
// AF f-wave textures from the MIT-BIH Arrhythmia Database (ODC-By 1.0). In '(AFIB' rhythm intervals of records
// 201, 202, 203, 210, 219, 221, 222 (MLII, 360 Hz): band-pass 0.5–40 Hz, subtract an amplitude-matched mean
// beat (R − 250 ms … R + 450 ms, 50 ms tapers) at every normal beat (QRST cancellation), band-pass the residual
// 3–15 Hz, then keep 8 s windows with only normal beats, no noise annotation, dominant 4–9 Hz, RMS 0.015–0.2 mV
// and peak < 5 × RMS (no QRS residue). The cleanest window (lowest peak/RMS) per record, first 4 records;
// resampled 360 → 500 Hz, unit RMS, Int16 (× 4096).
// Usage: node --experimental-strip-types packages/validation/src/templates/extract-af.ts [cacheDir] [outFile]
import { fetchCached, fetchVerified, parseSums } from './fetch.ts';
import { ANN, decode212, parseAnnotations, parseHeader } from './wfdb.ts';
import { bandpassZeroPhase, dominantHz, resample, rms, toInt16Base64 } from './dsp.ts';
import { writeTemplateModule, type TemplateItem } from './template-module.ts';

export const AF_ATTRIBUTION = [
  'Source: MIT-BIH Arrhythmia Database v1.0.0, https://physionet.org/content/mitdb/1.0.0/ (DOI 10.13026/C2F305).',
  'Licence: Open Data Commons Attribution License v1.0 (https://opendatacommons.org/licenses/by/1-0/).',
  'Cite: Moody GB, Mark RG. The impact of the MIT-BIH Arrhythmia Database. IEEE Eng in Med and Biol 20(3):45-50 (May-June 2001). (PMID: 11446209)',
  'Changes: 8 s AF windows, QRST cancelled by mean-beat subtraction, band-passed 3-15 Hz, resampled 360 -> 500 Hz, unit RMS, Int16.',
];

const PROJECT = 'mitdb/1.0.0';
const RECORDS = ['201', '202', '203', '210', '219', '221', '222'];
const WIN_S = 8;
const PRE_S = 0.25;
const POST_S = 0.45;
const SCALE = 4096;

export async function extractAf(cache: string): Promise<TemplateItem[]> {
  const td = new TextDecoder();
  const sums = parseSums(td.decode(await fetchCached(cache, PROJECT, 'SHA256SUMS.txt')));
  const cands: Array<{ rec: string; startS: number; fdom: number; x: Float64Array; resid: number }> = [];
  for (const rec of RECORDS) {
    const h = parseHeader(td.decode(await fetchVerified(cache, PROJECT, `${rec}.hea`, sums)));
    const ann = parseAnnotations(await fetchVerified(cache, PROJECT, `${rec}.atr`, sums));
    const sig = decode212(await fetchVerified(cache, PROJECT, `${rec}.dat`, sums), h.nSignals)[0] as Int16Array;
    const s0 = h.signals[0]!;
    const fs = h.fs;
    const x = bandpassZeroPhase(Float64Array.from(sig, (v) => (v - s0.baseline) / s0.gain), fs, 0.5, 40);
    const af: Array<[number, number]> = [];
    let cur = '';
    let start = 0;
    for (const a of ann) {
      if (a.code !== ANN.RHYTHM) continue;
      if (cur === '(AFIB') af.push([start, a.sample]);
      cur = a.aux;
      start = a.sample;
    }
    if (cur === '(AFIB') af.push([start, x.length]);
    const beats = ann.filter((a) => a.code >= 1 && a.code <= 13);
    const pre = Math.round(PRE_S * fs);
    const post = Math.round(POST_S * fs);
    for (const [a, b] of af) {
      const inAf = beats.filter((q) => q.sample - pre >= a && q.sample + post < b);
      const normal = inAf.filter((q) => q.code === 1);
      if (normal.length < 20) continue;
      const tpl = new Float64Array(pre + post);
      for (const q of normal) for (let i = 0; i < tpl.length; i++) tpl[i] = (tpl[i] as number) + (x[q.sample - pre + i] as number) / normal.length;
      const res = Float64Array.from(x);
      const taper = 0.05 * fs;
      for (const q of normal) {
        let num = 0;
        let den = 0;
        for (let i = 0; i < tpl.length; i++) {
          num += (x[q.sample - pre + i] as number) * (tpl[i] as number);
          den += (tpl[i] as number) ** 2;
        }
        const g = num / den;
        for (let i = 0; i < tpl.length; i++) {
          const e = Math.min(1, i / taper, (tpl.length - 1 - i) / taper);
          res[q.sample - pre + i] = (res[q.sample - pre + i] as number) - g * (tpl[i] as number) * e;
        }
      }
      const f = bandpassZeroPhase(res, fs, 3, 15);
      for (let s = a + fs; s + WIN_S * fs <= b; s += WIN_S * fs) {
        const e = s + WIN_S * fs;
        if (inAf.filter((q) => q.sample >= s - post && q.sample <= e + pre).some((q) => q.code !== 1)) continue;
        if (ann.some((q) => q.code === ANN.NOISE && q.sample >= s && q.sample <= e)) continue;
        const w = Float64Array.from(f.subarray(s, e));
        const fd = dominantHz(resample(w, fs, 500), 500, 3, 12);
        const r = rms(w);
        let pk = 0;
        for (const v of w) pk = Math.max(pk, Math.abs(v));
        if (fd < 4 || fd > 9 || r < 0.015 || r > 0.2 || pk > 5 * r) continue;
        cands.push({ rec, startS: s / fs, fdom: fd, x: w, resid: pk / r });
      }
    }
  }
  const best = new Map<string, (typeof cands)[number]>();
  for (const c of cands) {
    const b = best.get(c.rec);
    if (!b || c.resid < b.resid) best.set(c.rec, c);
  }
  return [...best.values()].slice(0, 4).map((c) => {
    const up = resample(c.x, 360, 500);
    const k = 1 / rms(up);
    return { id: `${c.rec}@${c.startS.toFixed(1)}s`, fdomHz: c.fdom, b64: toInt16Base64(up.map((v) => v * k), SCALE) };
  });
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.filename === (await import('node:path')).resolve(process.argv[1]);
if (invokedDirectly) {
  const cache = process.argv[2] ?? 'packages/validation/datasets/cache';
  const out = process.argv[3] ?? 'packages/engine-core/templates/af-mitdb.ts';
  const items = await extractAf(cache);
  for (const i of items) console.log(`af ${i.id} fdom ${i.fdomHz.toFixed(2)} Hz`);
  writeTemplateModule(out, { noticeId: 'N-051', attribution: AF_ATTRIBUTION, generator: 'packages/validation/src/templates/extract-af.ts', constName: 'AF_TEMPLATES', scaleName: 'AF_SCALE', scale: SCALE, items });
}
```

In `packages/validation/package.json`, replace:

```json
    "build": "vite build"
  },
```

with:

```json
    "build": "vite build",
    "templates": "node --experimental-strip-types src/templates/extract-vf.ts datasets/cache ../engine-core/templates/vf-cudb.ts && node --experimental-strip-types src/templates/extract-af.ts datasets/cache ../engine-core/templates/af-mitdb.ts",
    "ptbxl-report": "node --experimental-strip-types src/templates/compare-ptbxl.ts datasets/cache ../../docs/gates/stage-5/ptbxl-normal-comparison.json 20"
  },
```

Run (from the worktree root):

```bash
npx -y pnpm@9.15.9 --filter @pme/validation templates
```

Expected output (the same windows every time: the selection is deterministic given PhysioNet's files; the first run downloads ≈ 7 MB of CUDB and ≈ 15 MB of MIT-BIH into the git-ignored cache):

```
vf cu21@327.9s fdom 5.13 Hz
vf cu07@200.0s fdom 5.37 Hz
vf cu11@413.2s fdom 5.37 Hz
vf cu33@407.0s fdom 5.86 Hz
vf cu16@256.8s fdom 4.39 Hz
vf cu10@462.5s fdom 5.37 Hz
af 201@1645.5s fdom 5.62 Hz
af 202@1414.9s fdom 6.59 Hz
af 203@1373.0s fdom 5.13 Hz
af 210@1241.6s fdom 6.59 Hz
```

Append these rows to the table in `NOTICES.md` (IDs from the reserved N-050…N-059 block, see Global Constraints):

```md
| N-050 | VF texture templates `packages/engine-core/templates/vf-cudb.ts` (6 × 8 s, from records cu07, cu10, cu11, cu16, cu21, cu33) | https://physionet.org/content/cudb/1.0.0/ (DOI 10.13026/C2X59M) | ODC-By 1.0 | Recorded template, bundled. Attribution: "Creighton University Ventricular Tachyarrhythmia Database (CUDB), v1.0.0, PhysioNet. Nolle FM, Badura FK, Catlett JM, Bowser RW, Sketch MH. CREI-GARD, a new concept in computerized arrhythmia monitoring systems. Computers in Cardiology 13:515-518 (1986)." Changes: windows high-passed 0.7 Hz, resampled 250→500 Hz, unit RMS, Int16. Generated by `packages/validation/src/templates/extract-vf.ts` | 2026-09-24 |
| N-051 | AF f-wave templates `packages/engine-core/templates/af-mitdb.ts` (4 × 8 s, from records 201, 202, 203, 210) | https://physionet.org/content/mitdb/1.0.0/ (DOI 10.13026/C2F305) | ODC-By 1.0 | Recorded template, bundled. Attribution: "MIT-BIH Arrhythmia Database, v1.0.0, PhysioNet. Moody GB, Mark RG. The impact of the MIT-BIH Arrhythmia Database. IEEE Eng in Med and Biol 20(3):45-50 (May-June 2001)." Changes: QRST cancelled (mean-beat subtraction), band-passed 3–15 Hz, resampled 360→500 Hz, unit RMS, Int16. Generated by `packages/validation/src/templates/extract-af.ts` | 2026-09-24 |
```


- [ ] **Step 4: Run the tests and the type check**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run && npx -y pnpm@9.15.9 check-notices`

Expected: PASS (no failures; the Stage 1 tests keep passing).

- [ ] **Step 5: Commit**

```bash
git add NOTICES.md packages/validation/package.json packages/validation/src/templates/extract-af.ts packages/validation/src/templates/extract-vf.ts packages/validation/test/templates/bundled.test.ts packages/engine-core/templates/vf-cudb.ts packages/engine-core/templates/af-mitdb.ts
git commit -m "feat(templates): cudb vf and mit-bih af f-wave textures with notices (n-050, n-051)"
```

---

### Task 16: VF hybrid generator: time-warped texture, amplitude envelope, CPR, epinephrine, coarse→fine, asystole

Brief §4.1/§11 C1 end to end (acceptance test 2). The VCG source integrates t_noCPR and t_eff sample by sample (CPR slows decay, adds a 0.75 Hz boost; epinephrine adds a sin² bump of +30% A and +0.5 Hz over 180 s), plays the CUDB texture time-warped to f_dom(t), and raises flags; a planner clock turns them into a `vfFine` rhythmSegment at 0.2 mV and a switch to asystole (hazard 0.02/min; forced below 0.05 mV; `opts.autoAsystole: false` disables both).

**Files:**
- Create: `packages/engine-core/src/l2/ecg/arrest/vf.ts`
- Modify: `packages/engine-core/src/l2/ecg/rhythm-state.ts` (import + field `vf`), `packages/engine-core/src/l2/ecg/rhythm-engine.ts` (import + `EXTRA_CLOCKS`), `packages/engine-core/src/l2/ecg/ecg-gen.ts` (import + `VCG_SOURCES`)
- Test: `packages/engine-core/test/l2/ecg/s5/vf.test.ts`

**Interfaces:**
- Consumes: Tasks 13 and 15, `HOOKS.onApply`, `HOOKS.apply`, `rng.outcome` (four draws seed the episode).
- Produces: `VfState`, `vfSource`, `vfClock`, `epiBump`, `vfFreqHz`, `vfAmplitudeMv`, constants `F0_HZ, F_DROP_HZ, F_TAU_S, TAU_A_S (420 s), TAU_A_CPR_S (1050 s), CPR_BOOST_HZ, EPI_*, A0_MV (0.8), FINE_MV (0.2), ASYSTOLE_MV (0.05), HAZARD_PER_S`; events `rhythmSegment { rhythm: 'vfCoarse' | 'vfFine' | 'asystole', seed, templateId: 'vf-cudb' }`. Amplitude A is the peak-to-peak-equivalent 2√2·RMS in lead II.

- [ ] **Step 1: Write the failing test**

Create or replace `packages/engine-core/test/l2/ecg/s5/vf.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { dominantHz, rms } from '../../../../src/util/dsp.ts';
import { samples5 } from '../../../helpers/s5.ts';

const fExpected = (tMin: number) => 5.5 - 1.5 * (1 - Math.exp(-tMin / 8));
const W = 20; // analysis window, s
const win = (x: Float64Array, t0: number) => x.subarray(t0 * 500, (t0 + W) * 500);
/** Remove < ~1 Hz content (respiratory wander) with a centred 0.5 s moving average before measuring amplitude. */
function hp(x: Float64Array): Float64Array {
  const h = 125;
  const out = new Float64Array(x.length);
  let acc = 0;
  for (let i = 0; i < Math.min(x.length, 2 * h + 1); i++) acc += x[i]!;
  for (let i = 0; i < x.length; i++) {
    if (i > h && i + h < x.length) acc += x[i + h]! - x[i - h - 1]!;
    out[i] = x[i]! - acc / (2 * h + 1);
  }
  return out;
}
const ampMv = (x: Float64Array, t0: number) => 2 * Math.SQRT2 * rms(hp(win(x, t0)));

/** Least-squares slope of ln(A) against t → τ (s). */
function tauFit(x: Float64Array, fromS: number, toS: number): number {
  const ts: number[] = [];
  const ys: number[] = [];
  for (let t = fromS; t + W <= toS; t += 30) {
    ts.push(t + W / 2);
    ys.push(Math.log(ampMv(x, t)));
  }
  const mt = ts.reduce((a, b) => a + b, 0) / ts.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0, den = 0;
  ts.forEach((t, i) => { num += (t - mt) * (ys[i]! - my); den += (t - mt) ** 2; });
  return -1 / (num / den);
}

describe('VF hybrid generator (acceptance 2)', () => {
  const quiet = { artefact: { noise: 0 } };

  it('dominant frequency 4–6 Hz at onset and follows f_dom(t) within ±0.5 Hz at 4 and 10 min', () => {
    const r = samples5('vfCoarse', 10 * 60 + W + 1, ['ecgII'], { mods: quiet, rhythmOpts: { autoAsystole: false } });
    const x = r.lead.ecgII!;
    const f0 = dominantHz(win(x, 0), 500);
    expect(f0).toBeGreaterThanOrEqual(4);
    expect(f0).toBeLessThanOrEqual(6);
    for (const tMin of [4, 10]) expect(Math.abs(dominantHz(win(x, tMin * 60), 500) - fExpected(tMin + W / 120))).toBeLessThanOrEqual(0.5);
    expect(r.records.find((e) => e.type === 'rhythmSegment')).toMatchObject({ rhythm: 'vfCoarse', t: 0 });
  });

  it('amplitude decays with τ = 7 min ± 20% without CPR and ≥ 15 min with CPR; coarse→fine at 0.2 mV', () => {
    const r = samples5('vfCoarse', 10 * 60 + W, ['ecgII'], { mods: quiet, rhythmOpts: { autoAsystole: false } });
    const tau = tauFit(r.lead.ecgII!, 0, 10 * 60 + W);
    expect(tau / 420).toBeGreaterThan(0.8);
    expect(tau / 420).toBeLessThan(1.2);
    expect(ampMv(r.lead.ecgII!, 0)).toBeGreaterThan(0.6);
    const fine = r.records.find((e): e is Extract<typeof e, { type: 'rhythmSegment' }> => e.type === 'rhythmSegment' && e.rhythm === 'vfFine')!;
    expect(fine.t).toBeCloseTo(420 * Math.log(0.8 / 0.2), -1); // 582 s ± 5 s
    const c = samples5('vfCoarse', 10 * 60 + W, ['ecgII'], { mods: { artefact: { noise: 0, cpr: { rateCpm: 110, depth: 0 } } }, rhythmOpts: { autoAsystole: false } });
    const tauCpr = tauFit(c.lead.ecgII!, 60, 10 * 60 + W);
    expect(tauCpr).toBeGreaterThan(15 * 60 * 0.8);
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

  it('VF → asystole: forced when A < 0.05 mV (vfFine from 0.15 mV reaches it at ≈ 7.7 min)', () => {
    const r = samples5('vfFine', 9 * 60, ['ecgII'], { mods: quiet });
    const segs = r.records.filter((e): e is Extract<typeof e, { type: 'rhythmSegment' }> => e.type === 'rhythmSegment');
    const asy = segs.find((e) => e.rhythm === 'asystole')!;
    expect(asy).toBeDefined();
    expect(asy.t).toBeLessThanOrEqual(420 * Math.log(0.15 / 0.05) + 1);
    expect(r.st.id).toBe('asystole');
    const after = r.lead.ecgII!.subarray(Math.round((asy.t + 1) * 500));
    const d = after.slice(1).map((v, i) => v - after[i]!);
    expect(rms(d)).toBeLessThan(1e-3); // only the slow respiratory wander is left
  });

});
```


- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s5/vf.test.ts`

Expected: FAIL — lead II is flat during vfCoarse (no VCG source).

- [ ] **Step 3: Implement**

Create or replace `packages/engine-core/src/l2/ecg/arrest/vf.ts` with exactly:

```ts
// VF hybrid generator (brief §4.1 "Special generators", §11 C1; research 03 §1.8):
//   f_dom(t) = 5.5 − 1.5·(1 − e^(−t_noCPR/8 min)) Hz (+ CPR boost 0.75 Hz, + epinephrine 0.5 Hz)
//   A(t)     = A0·e^(−t_eff/τ_A), τ_A 7 min without CPR, 17.5 min with CPR (t_eff runs slower during CPR)
//   VF(t)    = A(t)/(2√2) · texture(f_dom(t)) along a slowly rotating VCG direction
// A is the peak-to-peak-equivalent amplitude in lead II (2√2·RMS). Recorded CUDB texture is time-warped to
// f_dom(t); without templates the AR(2) resonator bank is used. Coarse → fine at 0.2 mV; asystole hazard
// 0.02/min, forced below 0.05 mV. The generator integrates the clocks sample by sample (so CPR/epinephrine
// modifiers act immediately) and raises flags; the planner (vfClock) turns flags into rhythm changes.
import { normal, sfc32Next, type Sfc32State } from '../../../rng/sfc32.ts';
import type { Modifiers } from '../../../types.ts';
import { VF_SCALE, VF_TEMPLATES } from '../../../../templates/vf-cudb.ts';
import { arSample, createTex, decodeTemplates, texSample, type ArState, type TexState } from '../texture.ts';
import { HOOKS, NEVER, type RhythmCtx, type RhythmState } from '../rhythm-state.ts';
import { RHYTHMS } from '../rhythms.ts';
import type { EcgGenInputs } from '../ecg-gen.ts';

export const F0_HZ = 5.5; // brief §4.1
export const F_DROP_HZ = 1.5;
export const F_TAU_S = 8 * 60;
export const TAU_A_S = 7 * 60; // τ_A 6–8 min without CPR
export const TAU_A_CPR_S = 17.5 * 60; // 15–20 min with CPR
export const CPR_BOOST_HZ = 0.75; // CPR adds 0.5–1 Hz
const CPR_BOOST_TAU_S = 30; // [ENG]
export const EPI_A_GAIN = 0.3; // +20–40% A
export const EPI_F_HZ = 0.5; // +0.5 Hz
export const EPI_S = 180; // 2–4 min
export const A0_MV = 0.8; // 0.6–1.0 mV coarse
export const FINE_MV = 0.2; // coarse/fine split
export const ASYSTOLE_MV = 0.05;
export const HAZARD_PER_S = 0.02 / 60;
const FINE_START_MV = 0.15; // vfFine starts here [ENG]
/** VF VCG direction (lead II gain ≈ 1) plus a slow rotation of ±15% [ENG]. */
const VF_DIR = [0.25, 0.85, -0.3] as const;
const VF_ROT = [0.35, -0.1, 0.5] as const;
const ROT_PERIOD_S = 20; // slow rotation, one period per 20 s analysis window [ENG]
const TWO_SQRT2 = 2 * Math.SQRT2;

const TEX = VF_TEMPLATES.length > 0 ? decodeTemplates({ scale: VF_SCALE, items: VF_TEMPLATES }) : [];

export interface VfState {
  start: number;
  end: number;
  a0: number;
  tNoCpr: number;
  tEff: number;
  boost: number;
  rng: Sfc32State;
  tex: TexState | null;
  ar: ArState;
  fine: boolean;
  fineAt: number | null;
  asystoleAt: number | null;
  announcedFine: boolean;
}

/** Epinephrine bump b ∈ [0, 1]: sin² over EPI_S seconds, peak 1 at EPI_S/2 [ENG]. */
export function epiBump(mods: Modifiers, s: number): number {
  const e = mods.epinephrineAtS;
  if (e === null || s < e || s > e + EPI_S) return 0;
  return Math.sin((Math.PI * (s - e)) / EPI_S) ** 2;
}

export function vfFreqHz(v: VfState, mods: Modifiers, s: number): number {
  return F0_HZ - F_DROP_HZ * (1 - Math.exp(-v.tNoCpr / F_TAU_S)) + v.boost + EPI_F_HZ * epiBump(mods, s);
}

export function vfAmplitudeMv(v: VfState, mods: Modifiers, s: number): number {
  return v.a0 * Math.exp(-v.tEff / TAU_A_S) * (1 + EPI_A_GAIN * epiBump(mods, s));
}

function onApply(st: RhythmState, _prev: unknown, t0: number, ctx: RhythmCtx): void {
  const d = RHYTHMS[st.id];
  if (d.continuous !== 'vf') {
    if (st.vf && st.vf.end >= NEVER) st.vf.end = t0;
    return;
  }
  if (st.vf && st.vf.end >= NEVER) return; // coarse ↔ fine switch keeps the running episode
  const rng: Sfc32State = [sfc32Next(ctx.rng.outcome), sfc32Next(ctx.rng.outcome), sfc32Next(ctx.rng.outcome), sfc32Next(ctx.rng.outcome)];
  const a0 = st.opts.vfAmplitudeMv ?? A0_MV;
  // vfFine starts as if VF had decayed from A0 to 0.15 mV without CPR.
  const t = st.id === 'vfFine' ? TAU_A_S * Math.log(a0 / FINE_START_MV) : 0;
  st.vf = {
    start: t0, end: NEVER, a0, tNoCpr: t, tEff: t, boost: 0, rng,
    tex: TEX.length > 0 ? createTex(TEX.length, [rng[0], rng[1] ^ 0x9e37, rng[2], rng[3]]) : null,
    ar: { y1: [0, 0, 0, 0], y2: [0, 0, 0, 0] },
    fine: st.id === 'vfFine', fineAt: null, asystoleAt: null, announcedFine: st.id === 'vfFine',
  };
  st.records.push({ type: 'rhythmSegment', t: t0, rhythm: st.id, seed: rng[0], ...(TEX.length > 0 ? { templateId: 'vf-cudb' } : {}) });
}

/** VCG source: one VF sample. */
export function vfSource(g: EcgGenInputs, n: number, s: number, acc: Float64Array): void {
  const v = g.st.vf;
  if (!v || s < v.start || s >= v.end) return;
  const dt = 1 / 500;
  const cpr = g.mods.artefact.cpr !== null;
  if (cpr) v.tEff += (dt * TAU_A_S) / TAU_A_CPR_S;
  else {
    v.tEff += dt;
    v.tNoCpr += dt;
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
      v.fine = true;
      v.fineAt = s;
    }
    const auto = g.st.opts.autoAsystole !== false;
    if (auto && v.asystoleAt === null && (a < ASYSTOLE_MV || sfc32Next(v.rng) / 4294967296 < HAZARD_PER_S)) v.asystoleAt = s;
  }
}

/** Planner clock: announces coarse → fine and performs VF → asystole. */
export const vfClock = {
  next(st: RhythmState): number {
    const v = st.vf;
    if (!v || v.end < NEVER) return NEVER;
    const a = v.fineAt !== null && !v.announcedFine ? v.fineAt : NEVER;
    const b = v.asystoleAt ?? NEVER;
    return Math.min(a, b);
  },
  fire(st: RhythmState, t: number, ctx: RhythmCtx): void {
    const v = st.vf as VfState;
    if (v.fineAt !== null && !v.announcedFine && t === v.fineAt) {
      v.announcedFine = true;
      st.id = 'vfFine';
      st.records.push({ type: 'rhythmSegment', t, rhythm: 'vfFine', seed: v.rng[0] });
      return;
    }
    v.asystoleAt = null;
    HOOKS.apply(st, 'asystole', {}, t, true, ctx);
    st.records.push({ type: 'rhythmSegment', t: st.planT, rhythm: 'asystole', seed: 0 });
  },
};

HOOKS.onApply.push(onApply);
```

In `packages/engine-core/src/l2/ecg/rhythm-state.ts`, replace:

```ts
  /** Next transcutaneous pulse (tcp.ts); undefined when TCP is off. */
  tcpNextT?: number | undefined;
```

with:

```ts
  /** Next transcutaneous pulse (tcp.ts); undefined when TCP is off. */
  tcpNextT?: number | undefined;
  /** Running VF episode (arrest/vf.ts). */
  vf?: VfState | undefined;
```

In `packages/engine-core/src/l2/ecg/rhythm-state.ts`, replace:

```ts
import { RHYTHMS, type RhythmDef } from './rhythms.ts';
```

with:

```ts
import { RHYTHMS, type RhythmDef } from './rhythms.ts';
import type { VfState } from './arrest/vf.ts';
```

In `packages/engine-core/src/l2/ecg/rhythm-engine.ts`, replace:

```ts
import { tcpClock } from './tcp.ts';
```

with:

```ts
import { tcpClock } from './tcp.ts';
import { vfClock } from './arrest/vf.ts';
```

In `packages/engine-core/src/l2/ecg/rhythm-engine.ts`, replace:

```ts
const EXTRA_CLOCKS: ClockSource[] = [pacerClock, tcpClock];
```

with:

```ts
const EXTRA_CLOCKS: ClockSource[] = [pacerClock, tcpClock, vfClock];
```

In `packages/engine-core/src/l2/ecg/ecg-gen.ts`, replace:

```ts
import type { RhythmState } from './rhythm-state.ts';
```

with:

```ts
import type { RhythmState } from './rhythm-state.ts';
import { vfSource } from './arrest/vf.ts';
```

In `packages/engine-core/src/l2/ecg/ecg-gen.ts`, replace:

```ts
export const VCG_SOURCES: VcgSource[] = [];
```

with:

```ts
export const VCG_SOURCES: VcgSource[] = [vfSource];
```


- [ ] **Step 4: Run the tests and the type check**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg`

Expected: PASS (no failures; the Stage 1 tests keep passing).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/ecg/arrest/vf.ts packages/engine-core/src/l2/ecg/ecg-gen.ts packages/engine-core/src/l2/ecg/rhythm-engine.ts packages/engine-core/src/l2/ecg/rhythm-state.ts packages/engine-core/test/l2/ecg/s5/vf.test.ts
git commit -m "feat(ecg): vf hybrid generator (cudb texture, f_dom and amplitude evolution, cpr, epinephrine, asystole)"
```

---

### Task 17: AF f-waves from the recorded MIT-BIH texture

When AF templates are bundled, `drawFWave` returns an empty sinusoid list plus a seed and the new VCG source plays the texture as a stateless function of time (7.5 s blocks chosen by hash, 0.5 s crossfades), RMS 0.03 mV in II. Without templates the Stage 1 sinusoids remain the fallback.

**Files:**
- Create: `packages/engine-core/src/l2/ecg/af-texture.ts`
- Modify: `packages/engine-core/src/l2/ecg/rhythm-engine.ts` (`drawFWave`, rhythmSegment on AF start, imports), `packages/engine-core/src/l2/ecg/ecg-gen.ts` (import + `VCG_SOURCES`)
- Test: `packages/engine-core/test/l2/ecg/s5/af-texture.test.ts`

**Interfaces:**
- Consumes: Tasks 13 and 15, `hash53`, `FWAVE_DIR`.
- Produces: `afTemplatesAvailable()`, `afTexture(seed, u)`, `afSource`, `F_RMS_MV = 0.03`.

- [ ] **Step 1: Write the failing test**

Create or replace `packages/engine-core/test/l2/ecg/s5/af-texture.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { dominantHz, rms } from '../../../../src/util/dsp.ts';
import { afTemplatesAvailable, afTexture } from '../../../../src/l2/ecg/af-texture.ts';
import { samples5 } from '../../../helpers/s5.ts';

describe('AF f-wave texture', () => {
  it('uses the recorded texture: empty sinusoid list, one rhythmSegment with the template id', () => {
    expect(afTemplatesAvailable()).toBe(true);
    const r = samples5('afib', 10, ['ecgII'], { mods: { artefact: { noise: 0 } } });
    expect(r.st.fwaves.find((f) => f.kind === 'fib')!.f).toHaveLength(0);
    const seg = r.records.filter((e) => e.type === 'rhythmSegment');
    expect(seg).toHaveLength(1);
    expect(seg[0]).toMatchObject({ rhythm: 'afib', templateId: 'af-mitdb' });
  });

  it('texture is unit RMS with its dominant frequency at 4–9 Hz and no jumps at block joins', () => {
    const x = Float64Array.from({ length: 500 * 60 }, (_, i) => afTexture(12345, i / 500));
    expect(rms(x)).toBeGreaterThan(0.8);
    expect(rms(x)).toBeLessThan(1.2);
    const f = dominantHz(x, 500, 3, 12);
    expect(f).toBeGreaterThanOrEqual(4);
    expect(f).toBeLessThanOrEqual(9);
    let maxStep = 0;
    for (let i = 1; i < x.length; i++) maxStep = Math.max(maxStep, Math.abs(x[i]! - x[i - 1]!));
    expect(maxStep).toBeLessThan(1.5); // crossfaded joins: no discontinuity bigger than the texture's own slope
  });

  it('f-wave amplitude between QRS complexes: RMS 0.02–0.06 mV in II', () => {
    const r = samples5('afib', 60, ['ecgII'], { hr: 40, mods: { artefact: { noise: 0 }, rsa: 0 } });
    const x = r.lead.ecgII!;
    const ts = r.beats.map((b) => b.t);
    const vals: number[] = [];
    for (let i = 0; i + 1 < ts.length; i++) {
      const piece = x.subarray(Math.round((ts[i]! + 0.5) * 500), Math.round((ts[i + 1]! - 0.1) * 500));
      const m = piece.reduce((p, v) => p + v, 0) / Math.max(1, piece.length);
      for (const v of piece) vals.push(v - m);
    }
    const a = rms(vals);
    expect(a).toBeGreaterThan(0.02);
    expect(a).toBeLessThan(0.06);
  });
});
```


- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s5/af-texture.test.ts`

Expected: FAIL — cannot resolve `src/l2/ecg/af-texture.ts`.

- [ ] **Step 3: Implement**

Create or replace `packages/engine-core/src/l2/ecg/af-texture.ts` with exactly:

```ts
// AF f-wave texture (brief §4.1 "AF f-waves: templates, with a fallback of 2–4 random-phase sinusoids"; §11 C1).
// Recorded MIT-BIH f-wave segments (QRST-cancelled, unit RMS) are played back at their own rate as a stateless
// function of time: 8 s blocks, each block's segment chosen by a hash of (episode seed, block index), with a 0.5 s
// equal-power crossfade between blocks. Amplitude: RMS F_RMS_MV in lead II along FWAVE_DIR.
import { AF_SCALE, AF_TEMPLATES } from '../../../templates/af-mitdb.ts';
import { hash53 } from '../../rng/sfc32.ts';
import { decodeTemplates } from './texture.ts';
import { FWAVE_DIR } from './templates.ts';
import { FWAVE_FADE_S } from './generator.ts';
import type { EcgGenInputs } from './ecg-gen.ts';

export const F_RMS_MV = 0.03; // f-waves 0.02–0.15 mV (brief §4.1): RMS 0.03 ≈ 0.08 mV peak-to-peak [ENG]
const BLOCK_S = 7.5; // shorter than an 8 s template so every block fits [ENG]
const XFADE_S = 0.5;
const TEX = AF_TEMPLATES.length > 0 ? decodeTemplates({ scale: AF_SCALE, items: AF_TEMPLATES }) : [];
const DIR_II = 0.235 * FWAVE_DIR[0] + 1.066 * FWAVE_DIR[1] - 0.132 * FWAVE_DIR[2];

export function afTemplatesAvailable(): boolean {
  return TEX.length > 0;
}

function blockValue(seed: number, block: number, tIn: number): number {
  const [h] = hash53(`af${block}`, seed);
  const tex = TEX[h % TEX.length]!;
  const i = Math.min(tex.x.length - 2, tIn * 500);
  const i0 = Math.floor(i);
  return (tex.x[i0] as number) + ((tex.x[i0 + 1] as number) - (tex.x[i0] as number)) * (i - i0);
}

/** Unit-RMS f-wave texture at time u (s since the AF episode started). */
export function afTexture(seed: number, u: number): number {
  const b = Math.floor(u / BLOCK_S);
  const tIn = u - b * BLOCK_S;
  const v = blockValue(seed, b, tIn);
  if (tIn >= XFADE_S || b === 0) return v;
  const w = tIn / XFADE_S;
  return v * Math.sin((w * Math.PI) / 2) + blockValue(seed, b - 1, tIn + BLOCK_S) * Math.cos((w * Math.PI) / 2);
}

/** VCG source: AF waves in texture mode (kind 'fib', empty sinusoid list), with the generator's fade in/out. */
export function afSource(g: EcgGenInputs, _n: number, s: number, acc: Float64Array): void {
  if (TEX.length === 0) return;
  for (const fw of g.st.fwaves) {
    if (fw.kind !== 'fib' || fw.f.length > 0 || s < fw.start || s > fw.end) continue;
    const fade = Math.min(1, (s - fw.start) / FWAVE_FADE_S, (fw.end - s) / FWAVE_FADE_S);
    addF(acc, fade * (F_RMS_MV / DIR_II) * afTexture(fw.seed ?? 0, s - fw.start));
  }
}

function addF(acc: Float64Array, k: number): void {
  acc[0] = (acc[0] as number) + k * FWAVE_DIR[0];
  acc[1] = (acc[1] as number) + k * FWAVE_DIR[1];
  acc[2] = (acc[2] as number) + k * FWAVE_DIR[2];
}
```

In `packages/engine-core/src/l2/ecg/rhythm-engine.ts`, replace:

```ts
import { uniform, type Sfc32State } from '../../rng/sfc32.ts';
```

with:

```ts
import { sfc32Next, uniform, type Sfc32State } from '../../rng/sfc32.ts';
import { afTemplatesAvailable } from './af-texture.ts';
```

In `packages/engine-core/src/l2/ecg/rhythm-engine.ts`, replace:

```ts
function drawFWave(t0: number, s: Sfc32State): FWave {
  // 3 random-phase sinusoids at 5–9 Hz, 0.03–0.05 mV each (brief §4.1: 2–4 at 5–9 Hz, 0.02–0.15 mV) [ENG]
```

with:

```ts
function drawFWave(t0: number, s: Sfc32State): FWave {
  // Recorded MIT-BIH texture when templates are bundled (brief §11 C1) ...
  if (afTemplatesAvailable()) return { kind: 'fib', start: t0, end: NEVER, f: [], ph: [], a: [], dir: [...FWAVE_DIR], seed: sfc32Next(s) };
  // ... else 3 random-phase sinusoids at 5–9 Hz, 0.03–0.05 mV each (brief §4.1: 2–4 at 5–9 Hz, 0.02–0.15 mV) [ENG]
```

In `packages/engine-core/src/l2/ecg/rhythm-engine.ts`, replace:

```ts
    st.junction = { refUntil: t0, v: 0, vT: t0 };
```

with:

```ts
    st.junction = { refUntil: t0, v: 0, vT: t0 };
    if (fw.seed !== undefined) st.records.push({ type: 'rhythmSegment', t: t0, rhythm: id, seed: fw.seed, templateId: 'af-mitdb' });
```

In `packages/engine-core/src/l2/ecg/ecg-gen.ts`, replace:

```ts
import { vfSource } from './arrest/vf.ts';
```

with:

```ts
import { vfSource } from './arrest/vf.ts';
import { afSource } from './af-texture.ts';
```

In `packages/engine-core/src/l2/ecg/ecg-gen.ts`, replace:

```ts
export const VCG_SOURCES: VcgSource[] = [vfSource];
```

with:

```ts
export const VCG_SOURCES: VcgSource[] = [vfSource, afSource];
```


- [ ] **Step 4: Run the tests and the type check**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg`

Expected: PASS (no failures; the Stage 1 tests keep passing).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/ecg/af-texture.ts packages/engine-core/src/l2/ecg/ecg-gen.ts packages/engine-core/src/l2/ecg/rhythm-engine.ts packages/engine-core/test/l2/ecg/s5/af-texture.test.ts
git commit -m "feat(ecg): af f-waves from recorded mit-bih texture"
```

---

### Task 18: Morphology: kernel ops and the ST/T family (STEMI territories with reciprocity, ischaemia, T inversion, long QT, Brugada, digoxin)

The first morphology stages. A STEMI is ONE injury vector per territory added as an ST kernel (J point → T); reciprocal depression is not programmed, it emerges from the Dower/Einthoven projection (acceptance test 6). The kernel is sized so ST at J+60 ms equals ±mm·0.1 mV in the territory's measuring lead.

**Files:**
- Create: `packages/engine-core/src/l2/ecg/morphology/ops.ts`, `packages/engine-core/src/l2/ecg/morphology/st.ts`
- Modify: `packages/engine-core/src/l2/ecg/morphology/index.ts` (import + `MORPH_STAGES`)
- Test: `packages/engine-core/test/l2/ecg/s5/morph-st.test.ts`

**Interfaces:**
- Consumes: `DOWER`, `WAVE`, `K_STRIDE`, `T_END_AFTER_PEAK_S`, `morphBeat` helper.
- Produces: ops `QRS_WAVES`, `isWave`, `scaleWaves`, `stretchQrs`, `jPointS`, `qrsOnsetS`, `mainT`, `leadOf`, `addShaped(k, tau, sRise, sFall, dir, lead, mv, atS, wave)`, `rotateY`, `rotateZSel`, `netArea`, `frontalAxisDeg`; stages `stStage`, `ischaemiaStage`, `tInversionStage`, `longQtStage`, `brugadaStage`, `digoxinStage`; tables `ST_TERRITORIES`, `ISCHAEMIA_DIR`, `BRUGADA_DIR`.

- [ ] **Step 1: Write the failing test**

Create or replace `packages/engine-core/test/l2/ecg/s5/morph-st.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { jPointS } from '../../../../src/l2/ecg/morphology/ops.ts';
import { K_STRIDE, WAVE } from '../../../../src/l2/ecg/kernels.ts';
import { kernelQtMs } from '../../../../src/l2/ecg/templates.ts';
import { ST_TERRITORIES } from '../../../../src/l2/ecg/morphology/st.ts';
import { kernelLead, morphBeat, run5, tPeakOf } from '../../../helpers/s5.ts';
import type { LeadId } from '../../../../src/types.ts';


const base = morphBeat({});
const J = jPointS(base);
const beat = morphBeat;
const st60 = (k: number[], lead: LeadId) => kernelLead(k, lead, J + 0.06) - kernelLead(base, lead, J + 0.06);

describe('ST/T modifiers (acceptance 6)', () => {
  it('anterior STEMI 2 mm: V2–V3 +0.1–0.4 mV, reciprocal depression in III/aVF', () => {
    const k = beat({ st: { territory: 'anterior', mm: 2 } });
    for (const l of ['V2', 'V3'] as const) {
      expect(st60(k, l)).toBeGreaterThanOrEqual(0.1);
      expect(st60(k, l)).toBeLessThanOrEqual(0.4);
    }
    expect(st60(k, 'ecgIII')).toBeLessThan(-0.05);
    expect(st60(k, 'aVF')).toBeLessThan(-0.05);
  });

  it('inferior STEMI: II/III/aVF up, aVL and I down', () => {
    const k = beat({ st: { territory: 'inferior', mm: 2 } });
    for (const l of ['ecgII', 'ecgIII', 'aVF'] as const) expect(st60(k, l)).toBeGreaterThan(0.1);
    expect(st60(k, 'aVL')).toBeLessThan(-0.05);
    expect(st60(k, 'ecgI')).toBeLessThan(0);
  });

  it.each(Object.keys(ST_TERRITORIES))('%s: ST(J+60) in the measuring lead = ±mm·0.1 mV', (territory) => {
    const t = ST_TERRITORIES[territory as keyof typeof ST_TERRITORIES];
    for (const mm of [1, 2.5, 4]) expect(st60(beat({ st: { territory: territory as never, mm } }), t.lead)).toBeCloseTo(t.sign * mm * 0.1, 3);
  });

  it('ischaemic depression −0.2 mV in II, V5 depressed, aVR elevated', () => {
    const k = beat({ ischaemicDepressionMv: -0.2 });
    expect(st60(k, 'ecgII')).toBeCloseTo(-0.2, 3);
    expect(st60(k, 'V5')).toBeLessThan(-0.1);
    expect(st60(k, 'aVR')).toBeGreaterThan(0.05);
  });

  it('T inversion 1: T peak negative in II; Brugada: coved V1–V2 ≥ 0.2 mV into a negative T; digoxin: scooped ST, short QT, flat T', () => {
    const tPeak = tPeakOf(base);
    expect(kernelLead(beat({ tInversion: 1 }), 'ecgII', tPeak)).toBeLessThan(-0.2);
    const b = beat({ brugada1: true });
    for (const l of ['V1', 'V2'] as const) {
      expect(kernelLead(b, l, J + 0.01) - kernelLead(base, l, J + 0.01)).toBeGreaterThanOrEqual(0.2);
      expect(kernelLead(b, l, tPeak)).toBeLessThan(0);
    }
    expect(Math.abs(kernelLead(b, 'V5', J + 0.01) - kernelLead(base, 'V5', J + 0.01))).toBeLessThan(0.08);
    const d = beat({ digoxin: true });
    expect(kernelLead(d, 'ecgII', J + 0.09) - kernelLead(base, 'ecgII', J + 0.09)).toBeLessThan(-0.05);
    expect(kernelQtMs(d)).toBeLessThan(0.92 * kernelQtMs(base));
  });

  it('long QT: QTc ≥ 520 and a notched (two-kernel) T', () => {
    const { beats, st } = run5('sinus', 10, { hr: 60, mods: { hrvScale: 0, longQT: true } });
    expect(beats.at(-1)!.qtMs).toBeGreaterThanOrEqual(515);
    const tKernels = st.events.at(-1)!.k.filter((_, i) => i % K_STRIDE === 6).filter((w) => w === WAVE.T);
    expect(tKernels.length).toBe(2);
  });
});
```


- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s5/morph-st.test.ts`

Expected: FAIL — cannot resolve `morphology/ops.ts`.

- [ ] **Step 3: Implement**

Create or replace `packages/engine-core/src/l2/ecg/morphology/ops.ts` with exactly:

```ts
// Kernel-list helpers for the morphology stages. Kernel layout (kernels.ts): [τ, σRise, σFall, ax, ay, az, wave].
import { K_STRIDE, WAVE } from '../kernels.ts';
import { DOWER, type Vec3 } from '../vcg.ts';
import type { LeadId } from '../../../types.ts';

export const QRS_WAVES: ReadonlySet<number> = new Set([WAVE.Q, WAVE.R, WAVE.S, WAVE.DELTA]);

export function isWave(k: readonly number[], i: number, waves: ReadonlySet<number> | number): boolean {
  const w = k[i + 6] as number;
  return typeof waves === 'number' ? w === waves : waves.has(w);
}

/** Multiply the vectors of the selected waves by f. */
export function scaleWaves(k: number[], waves: ReadonlySet<number> | number, f: number): number[] {
  for (let i = 0; i < k.length; i += K_STRIDE) if (isWave(k, i, waves)) for (let j = 3; j < 6; j++) k[i + j] = (k[i + j] as number) * f;
  return k;
}

/** Stretch the QRS in time about its onset (τ and σ × f). T/U stay where they are (the ST segment absorbs it). */
export function stretchQrs(k: number[], f: number): number[] {
  for (let i = 0; i < k.length; i += K_STRIDE) {
    if (!isWave(k, i, QRS_WAVES)) continue;
    k[i] = (k[i] as number) * f;
    k[i + 1] = (k[i + 1] as number) * f;
    k[i + 2] = (k[i + 2] as number) * f;
  }
  return k;
}

/** End of the QRS (J point), s from onset: latest QRS τ + 2.5σ. */
export function jPointS(k: readonly number[]): number {
  let hi = 0;
  for (let i = 0; i < k.length; i += K_STRIDE) if (isWave(k, i, QRS_WAVES)) hi = Math.max(hi, (k[i] as number) + 2.5 * (k[i + 2] as number));
  return hi;
}

/** Start of the QRS, s from onset: earliest QRS τ − 2.5σ (can be slightly negative). */
export function qrsOnsetS(k: readonly number[]): number {
  let lo = Infinity;
  for (let i = 0; i < k.length; i += K_STRIDE) if (isWave(k, i, QRS_WAVES)) lo = Math.min(lo, (k[i] as number) - 2.5 * (k[i + 1] as number));
  return lo;
}

/** Index of the first (main) T kernel, or −1. */
export function mainT(k: readonly number[]): number {
  for (let i = 0; i < k.length; i += K_STRIDE) if (k[i + 6] === WAVE.T) return i;
  return -1;
}

/** Projection of a VCG vector onto a lead (Dower rows + Einthoven/Goldberger). */
export function leadOf(v: Vec3, lead: LeadId): number {
  const d = (r: Vec3) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2];
  const I = d(DOWER.ecgI);
  const II = d(DOWER.ecgII);
  switch (lead) {
    case 'ecgIII': return II - I;
    case 'aVR': return -(I + II) / 2;
    case 'aVL': return I - II / 2;
    case 'aVF': return II - I / 2;
    default: return d(DOWER[lead]);
  }
}

/** Add one kernel whose value at `atS` (s from onset) projects to `mv` in `lead` along direction `dir`. */
export function addShaped(k: number[], tau: number, sRise: number, sFall: number, dir: Vec3, lead: LeadId, mv: number, atS: number, wave: number): number[] {
  const d = atS - tau;
  const s = d < 0 ? sRise : sFall;
  const g = Math.exp((-d * d) / (2 * s * s));
  const a = mv / (leadOf(dir, lead) * g);
  k.push(tau, sRise, sFall, dir[0] * a, dir[1] * a, dir[2] * a, wave);
  return k;
}

/** Rotate the selected kernels' vectors about the Y axis (the X–Z, horizontal plane) by rad. */
export function rotateY(k: number[], rad: number, waves: ReadonlySet<number>): number[] {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  for (let i = 0; i < k.length; i += K_STRIDE) {
    if (!isWave(k, i, waves)) continue;
    const x = k[i + 3] as number;
    const z = k[i + 5] as number;
    k[i + 3] = c * x + s * z;
    k[i + 5] = -s * x + c * z;
  }
  return k;
}

/** Rotate the selected kernels' vectors about the Z axis (frontal plane) by rad. */
export function rotateZSel(k: number[], rad: number, waves: ReadonlySet<number>): number[] {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  for (let i = 0; i < k.length; i += K_STRIDE) {
    if (!isWave(k, i, waves)) continue;
    const x = k[i + 3] as number;
    const y = k[i + 4] as number;
    k[i + 3] = c * x - s * y;
    k[i + 4] = s * x + c * y;
  }
  return k;
}

/** Net area (mV·s) of the selected waves in a lead: Σ a_lead · σ̄ · √(2π). */
export function netArea(k: readonly number[], lead: LeadId, waves: ReadonlySet<number>): number {
  let a = 0;
  for (let i = 0; i < k.length; i += K_STRIDE) {
    if (!isWave(k, i, waves)) continue;
    const v = leadOf([k[i + 3] as number, k[i + 4] as number, k[i + 5] as number], lead);
    a += v * (((k[i + 1] as number) + (k[i + 2] as number)) / 2) * Math.sqrt(2 * Math.PI);
  }
  return a;
}

/** Frontal QRS axis in degrees from the net QRS areas in I and aVF. */
export function frontalAxisDeg(k: readonly number[]): number {
  return (Math.atan2(netArea(k, 'aVF', QRS_WAVES), netArea(k, 'ecgI', QRS_WAVES)) * 180) / Math.PI;
}
```

Create or replace `packages/engine-core/src/l2/ecg/morphology/st.ts` with exactly:

```ts
// ST/T modifiers (brief §5; research 03 §1.6): STEMI by territory (reciprocal change emerges from the VCG
// projection), diffuse ischaemic depression, T inversion, long-QT T shape, Brugada type 1, digoxin effect.
import { WAVE, K_STRIDE } from '../kernels.ts';
import { kernelQtMs } from '../templates.ts';
import type { LeadId, StTerritory } from '../../../types.ts';
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
export const ISCHAEMIA_DIR: Vec3 = [-0.6, -0.8, 0.25];
/** Brugada: coved elevation in the right precordial leads (V1 0.98, V2 1.40, V3 1.20, V4 0.49, V5 −0.01, I −0.15 per unit) [ENG]. */
export const BRUGADA_DIR: Vec3 = [-0.1, 0.1, -1];
const MEASURE_AFTER_J_S = 0.06; // ST measured at J + 60 ms (research 03 §1.6)

function qtS(k: readonly number[]): number {
  const q = kernelQtMs(k);
  return Number.isFinite(q) ? q / 1000 : 0.4;
}

/** STEMI: an ST kernel rising at the J point and fading into the T, sized so ST(J+60) = ±mm·0.1 mV in the lead. */
export const stStage: MorphStage = (k, _info, mods) => {
  if (!mods.st) return k;
  const ter = ST_TERRITORIES[mods.st.territory];
  const j = jPointS(k);
  const sFall = Math.max(0.04, (qtS(k) - j) / 3);
  return addShaped(k, j + 0.02, 0.01, sFall, ter.dir, ter.lead, ter.sign * mods.st.mm * 0.1, j + MEASURE_AFTER_J_S, WAVE.ST);
};

export const ischaemiaStage: MorphStage = (k, _info, mods) => {
  if (mods.ischaemicDepressionMv === 0) return k;
  const j = jPointS(k);
  return addShaped(k, j + 0.04, 0.015, 0.08, ISCHAEMIA_DIR, 'ecgII', mods.ischaemicDepressionMv, j + MEASURE_AFTER_J_S, WAVE.ST);
};

export const tInversionStage: MorphStage = (k, _info, mods) => (mods.tInversion > 0 ? scaleWaves(k, WAVE.T, 1 - 2 * mods.tInversion) : k);

/** Long QT: broad (σ ×1.3) and notched (second hump 60 ms later, 35%) T (research 03 §1.6). */
export const longQtStage: MorphStage = (k, _info, mods) => {
  if (!mods.longQT) return k;
  const t = mainT(k);
  if (t < 0) return k;
  k[t + 1] = (k[t + 1] as number) * 1.3;
  k[t + 2] = (k[t + 2] as number) * 1.3;
  k.push((k[t] as number) + 0.06, 0.03, 0.04, (k[t + 3] as number) * 0.35, (k[t + 4] as number) * 0.35, (k[t + 5] as number) * 0.35, WAVE.T);
  return k;
};

/** Brugada type 1: coved ST ≥ 0.2 mV in V1–V2 descending into an inverted T (research 03 §1.6). */
export const brugadaStage: MorphStage = (k, _info, mods) => {
  if (!mods.brugada1) return k;
  const j = jPointS(k);
  const t = mainT(k);
  addShaped(k, j + 0.01, 0.006, 0.07, BRUGADA_DIR, 'V2', 0.35, j + 0.01, WAVE.ST);
  if (t >= 0) addShaped(k, k[t] as number, 0.04, 0.04, BRUGADA_DIR, 'V2', -0.3, k[t] as number, WAVE.T);
  return k;
};

/** Digoxin: scooped ST depression (kernel −0.12 mV in II), flat T (×0.5), T/U 15% earlier → short QT (research 03 §1.6) [ENG values]. */
export const digoxinStage: MorphStage = (k, _info, mods) => {
  if (!mods.digoxin) return k;
  const t = mainT(k);
  if (t < 0) return k;
  const tDir: Vec3 = [k[t + 3] as number, k[t + 4] as number, k[t + 5] as number];
  for (let i = 0; i < k.length; i += K_STRIDE) if (k[i + 6] === WAVE.T || k[i + 6] === WAVE.U) k[i] = (k[i] as number) * 0.85;
  scaleWaves(k, WAVE.T, 0.5);
  const j = jPointS(k);
  return addShaped(k, j + 0.09, 0.05, 0.05, [-tDir[0], -tDir[1], -tDir[2]], 'ecgII', -0.12, j + 0.09, WAVE.ST);
};
```

In `packages/engine-core/src/l2/ecg/morphology/index.ts`, replace:

```ts
import type { BeatTemplateId } from '../beat-templates.ts';
```

with:

```ts
import type { BeatTemplateId } from '../beat-templates.ts';
import { brugadaStage, digoxinStage, ischaemiaStage, longQtStage, stStage, tInversionStage } from './st.ts';
```

In `packages/engine-core/src/l2/ecg/morphology/index.ts`, replace:

```ts
export const MORPH_STAGES: MorphStage[] = [];
```

with:

```ts
/** Order matters: fingerprint → timing (overrides, K, temperature) → conduction/axis/voltage → ST/T → alternans. */
export const MORPH_STAGES: MorphStage[] = [
  longQtStage,
  digoxinStage,
  tInversionStage,
  stStage,
  ischaemiaStage,
  brugadaStage,
];
```


- [ ] **Step 4: Run the tests and the type check**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg`

Expected: PASS (no failures; the Stage 1 tests keep passing).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/ecg/morphology/index.ts packages/engine-core/src/l2/ecg/morphology/ops.ts packages/engine-core/src/l2/ecg/morphology/st.ts packages/engine-core/test/l2/ecg/s5/morph-st.test.ts
git commit -m "feat(ecg): st territories with emergent reciprocity, ischaemia, t inversion, long qt, brugada, digoxin"
```

---

### Task 19: Morphology: bundle-branch block, axis, transition, LVH, low voltage, QRS override, alternans

Conduction and voltage stages (supraventricular beats only, except low voltage and alternans).

**Files:**
- Create: `packages/engine-core/src/l2/ecg/morphology/conduction.ts`
- Modify: `packages/engine-core/src/l2/ecg/morphology/index.ts` (import + `MORPH_STAGES`)
- Test: `packages/engine-core/test/l2/ecg/s5/morph-conduction.test.ts`

**Interfaces:**
- Consumes: Task 18 ops, `RBBB_RPRIME_VEC`.
- Produces: `bbbStage`, `axisStage` (5° grid search + ternary refinement: the axis-vs-rotation map is monotone but steep near 0°), `transitionStage` (`DEFAULT_TRANSITION = 3.5`), `lvhStage`, `qrsOverrideStage`, `lowVoltageStage`, `alternansStage`.

- [ ] **Step 1: Write the failing test**

Create or replace `packages/engine-core/test/l2/ecg/s5/morph-conduction.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { beatKernels } from '../../../../src/l2/ecg/beat-templates.ts';
import { frontalAxisDeg, netArea, QRS_WAVES } from '../../../../src/l2/ecg/morphology/ops.ts';
import { K_STRIDE, WAVE, qrsSpanMs } from '../../../../src/l2/ecg/kernels.ts';
import { kernelQtMs } from '../../../../src/l2/ecg/templates.ts';
import { kernelLead, morphBeat, run5, tPeakOf } from '../../../helpers/s5.ts';


const base = morphBeat({});
const beat = morphBeat;

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

  it.each([-60, -30, 0, 45, 90, 120, 170])('axisDeg %i → measured frontal axis within ±5°', (a) => {
    expect(Math.abs(frontalAxisDeg(beat({ axisDeg: a })) - a)).toBeLessThanOrEqual(5);
  });

  it('transitionLead 2 → earlier R/S transition than 5', () => {
    const tr = (k: number[]) => (['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const).findIndex((l) => netArea(k, l, QRS_WAVES) > 0);
    expect(tr(beat({ transitionLead: 2 }))).toBeLessThan(tr(beat({ transitionLead: 5 })));
  });

  it('low voltage 0.5 halves R in II; LVH Sokolow–Lyon S(V1)+R(V5) ≥ 3.5 mV; alternans 0.3 on odd beats', () => {
    const rII = (k: number[]) => Math.max(...[0.03, 0.04, 0.05].map((s) => kernelLead(k, 'ecgII', s)));
    expect(rII(beat({ lowVoltage: 0.5 })) / rII(base)).toBeCloseTo(0.5, 2);
    const lvh = beat({ lvh: true });
    const sv1 = -Math.min(...Array.from({ length: 50 }, (_, i) => kernelLead(lvh, 'V1', i / 500)));
    const rv5 = Math.max(...Array.from({ length: 50 }, (_, i) => kernelLead(lvh, 'V5', i / 500)));
    expect(sv1 + rv5).toBeGreaterThanOrEqual(3.5);
    expect(rII(beat({ alternans: 0.3 }, 1)) / rII(base)).toBeCloseTo(0.7, 2);
    expect(rII(beat({ alternans: 0.3 }, 2)) / rII(base)).toBeCloseTo(1, 6);
  });

  it('overrides: qrsMs, qtMs and prMs are drawn as requested', () => {
    expect(qrsSpanMs(beat({ overrides: { qrsMs: 140 } }))).toBeCloseTo(140, 0);
    const { beats } = run5('sinus', 10, { hr: 70, mods: { hrvScale: 0, overrides: { qtMs: 480, prMs: 240 } } });
    expect(beats.every((b) => b.qtMs === 480 && b.prMs === 240)).toBe(true);
  });
});
```


- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s5/morph-conduction.test.ts`

Expected: FAIL — cannot resolve `morphology/conduction.ts`… or QRS width unchanged by bbb.

- [ ] **Step 3: Implement**

Create or replace `packages/engine-core/src/l2/ecg/morphology/conduction.ts` with exactly:

```ts
// Conduction and voltage modifiers (brief §5; research 03 §1.5–1.6): bundle-branch block, axis, precordial
// transition, low voltage, LVH, QRS override and electrical alternans.
import { WAVE } from '../kernels.ts';
import { RBBB_RPRIME_VEC } from '../beat-templates.ts';
import type { Vec3 } from '../vcg.ts';
import type { BeatInfo, MorphStage } from './index.ts';
import { QRS_WAVES, frontalAxisDeg, isWave, jPointS, mainT, qrsOnsetS, rotateY, rotateZSel, scaleWaves, stretchQrs } from './ops.ts';
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
  // LBBB: drop Q/R/S, add two leftward R kernels (notch), discordant T
  const out: number[] = [];
  let rScale = 1;
  for (let i = 0; i < k.length; i += K_STRIDE) {
    if (isWave(k, i, QRS_WAVES)) {
      if (k[i + 6] === WAVE.R) rScale = Math.hypot(k[i + 3] as number, k[i + 4] as number, k[i + 5] as number) / 1.68;
      continue;
    }
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
};

/**
 * Rotate QRS and T in the frontal plane so the measured frontal axis (net QRS area in I and aVF) equals
 * mods.axisDeg. The axis-vs-rotation map is monotone but strongly non-linear (the limb leads are not orthogonal
 * in VCG space), so: a 5° grid search, then a ternary refinement of |error|.
 */
export const axisStage: MorphStage = (k, info, mods) => {
  const target = mods.axisDeg;
  if (target === null || !info.supra) return k;
  const wrap = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;
  const err = (deg: number) => {
    const c = k.slice();
    rotateZSel(c, (deg * Math.PI) / 180, QRS_T);
    return Math.abs(wrap(target - frontalAxisDeg(c)));
  };
  let best = 0;
  let bestErr = Infinity;
  for (let d = -180; d < 180; d += 5) {
    const e = err(d);
    if (e < bestErr) {
      bestErr = e;
      best = d;
    }
  }
  let lo = best - 5;
  let hi = best + 5;
  for (let i = 0; i < 24; i++) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;
    if (err(m1) < err(m2)) hi = m2;
    else lo = m1;
  }
  return rotateZSel(k, (((lo + hi) / 2) * Math.PI) / 180, QRS_T);
};

/** Default precordial transition of the Stage 1 template (V3–V4) and the horizontal rotation per lead [ENG]. */
export const DEFAULT_TRANSITION = 3.5;
const DEG_PER_LEAD = 14;
export const transitionStage: MorphStage = (k, info, mods) => {
  if (mods.transitionLead === null || !info.supra) return k;
  // A negative rotation about Y (as rotateY defines it) turns the QRS vector anteriorly → earlier transition.
  return rotateY(k, (-(mods.transitionLead - DEFAULT_TRANSITION) * DEG_PER_LEAD * Math.PI) / 180, QRS_T);
};

/** LVH: R leftward (X) ×1.7, S posterior (Z) ×2 → Sokolow–Lyon ≥ 3.5 mV; lateral strain T [ENG]. */
export const lvhStage: MorphStage = (k, info, mods) => {
  if (!mods.lvh || !info.supra) return k;
  for (let i = 0; i < k.length; i += K_STRIDE) {
    if (k[i + 6] === WAVE.R) k[i + 3] = (k[i + 3] as number) * 1.7;
    if (k[i + 6] === WAVE.S) k[i + 5] = (k[i + 5] as number) * 2;
  }
  const t = mainT(k);
  if (t >= 0) k[t + 3] = -0.6 * (k[t + 3] as number); // strain: T inverted in I/V5–V6
  return k;
};

export const qrsOverrideStage: MorphStage = (k, info, mods) => {
  const want = mods.overrides.qrsMs;
  if (want === undefined || !info.supra) return k;
  return stretchQrs(k, want / (1000 * (jPointS(k) - qrsOnsetS(k))));
};

export const lowVoltageStage: MorphStage = (k, _info, mods) => (mods.lowVoltage === 1 ? k : scaleWaves(k, new Set([WAVE.Q, WAVE.R, WAVE.S, WAVE.DELTA, WAVE.T, WAVE.U]), mods.lowVoltage));

export const alternansStage: MorphStage = (k, info: BeatInfo, mods) => (mods.alternans > 0 && info.seq % 2 === 1 ? scaleWaves(k, QRS_T, 1 - mods.alternans) : k);
```

In `packages/engine-core/src/l2/ecg/morphology/index.ts`, replace:

```ts
import type { BeatTemplateId } from '../beat-templates.ts';
```

with:

```ts
import type { BeatTemplateId } from '../beat-templates.ts';
import { alternansStage, axisStage, bbbStage, lowVoltageStage, lvhStage, qrsOverrideStage, transitionStage } from './conduction.ts';
```

In `packages/engine-core/src/l2/ecg/morphology/index.ts`, replace:

```ts
/** Order matters: fingerprint → timing (overrides, K, temperature) → conduction/axis/voltage → ST/T → alternans. */
export const MORPH_STAGES: MorphStage[] = [
  longQtStage,
  digoxinStage,
  tInversionStage,
  stStage,
  ischaemiaStage,
  brugadaStage,
];
```

with:

```ts
/** Order matters: fingerprint → timing (overrides, K, temperature) → conduction/axis/voltage → ST/T → alternans. */
export const MORPH_STAGES: MorphStage[] = [
  qrsOverrideStage,
  bbbStage,
  axisStage,
  transitionStage,
  lvhStage,
  lowVoltageStage,
  longQtStage,
  digoxinStage,
  tInversionStage,
  stStage,
  ischaemiaStage,
  brugadaStage,
  alternansStage,
];
```


- [ ] **Step 4: Run the tests and the type check**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg`

Expected: PASS (no failures; the Stage 1 tests keep passing).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/ecg/morphology/conduction.ts packages/engine-core/src/l2/ecg/morphology/index.ts packages/engine-core/test/l2/ecg/s5/morph-conduction.test.ts
git commit -m "feat(ecg): bbb, axis, transition, lvh, low voltage, qrs override, alternans"
```

---

### Task 20: Morphology: potassium staging, hypokalaemia U waves, hypothermia (Osborn J)

Acceptance test 7: raising K from 5 to 8.5 gives peaked T → PR↑ → QRS↑ → sine wave in that order. P flattening and PR prolongation act through the P-wave stages and PR terms that `onSinus`/`conductP` already call.

**Files:**
- Create: `packages/engine-core/src/l2/ecg/morphology/electrolytes.ts`
- Modify: `packages/engine-core/src/l2/ecg/morphology/index.ts` (import, `MORPH_STAGES`, `P_STAGES`, `PR_TERMS`)
- Test: `packages/engine-core/test/l2/ecg/s5/morph-electrolytes.test.ts`

**Interfaces:**
- Consumes: Task 18 ops and `ISCHAEMIA_DIR`.
- Produces: `hyperK(k) → { s1, s2, s3, s4 }`, `hypoK(k)`, `coldness(tempC)`, `OSBORN_DIR`, `potassiumStage`, `temperatureStage`, `pPotassiumStage` (also applies `lowVoltage` to P), `prPotassium`, `prTemperature`.

- [ ] **Step 1: Write the failing test**

Create or replace `packages/engine-core/test/l2/ecg/s5/morph-electrolytes.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { jPointS, leadOf } from '../../../../src/l2/ecg/morphology/ops.ts';
import { K_STRIDE, WAVE, qrsSpanMs } from '../../../../src/l2/ecg/kernels.ts';
import { kernelQtMs } from '../../../../src/l2/ecg/templates.ts';
import { kernelLead, morphBeat, run5, tPeakOf } from '../../../helpers/s5.ts';


const base = morphBeat({});
const J = jPointS(base);
const beat = morphBeat;

describe('electrolytes and temperature', () => {
  it('acceptance 7 — hyperK from 5 to 8.5: peaked T → PR↑ → QRS↑ → sine wave, in that order', () => {
    const tAmp = (k: number[]) => kernelLead(k, 'ecgII', tPeakOf(k));
    const pr = (K: number) => run5('sinus', 5, { hr: 70, mods: { hrvScale: 0, k: K } }).beats.at(-1)!.prMs!;
    // Sine wave: no ST segment left — the T peak sits within 60 ms of the (widened) QRS end.
    const sine = (k: number[]) => tPeakOf(k) - jPointS(k);
    const b0 = { t: tAmp(base), pr: pr(4.2), qrs: qrsSpanMs(base) };
    const first: Record<string, number> = {};
    for (let K = 5; K <= 8.5 + 1e-9; K += 0.1) {
      const k = beat({ k: K });
      const hit = {
        t: tAmp(k) >= 1.3 * b0.t,
        pr: pr(K) >= b0.pr + 10,
        qrs: qrsSpanMs(k) >= 1.15 * b0.qrs,
        sine: sine(k) <= 0.06,
      };
      for (const [n, v] of Object.entries(hit)) if (v && first[n] === undefined) first[n] = K;
    }
    expect(first.t!).toBeLessThan(first.pr!);
    expect(first.pr!).toBeLessThan(first.qrs!);
    expect(first.qrs!).toBeLessThan(first.sine!);
    expect(first.sine!).toBeLessThanOrEqual(8.5);
  });

  it('hypoK 2.5: U wave ≥ 0.1 mV and taller than T in II and V2', () => {
    const k = beat({ k: 2.5 });
    const uAt = kernelQtMs(k) / 1000 + 0.07;
    const tAt = tPeakOf(k);
    for (const l of ['ecgII', 'V2'] as const) {
      expect(kernelLead(k, l, uAt)).toBeGreaterThanOrEqual(0.1);
      expect(kernelLead(k, l, uAt)).toBeGreaterThan(kernelLead(k, l, tAt));
    }
  });

  it('hypothermia 28 °C: Osborn J 0.4 mV, largest in V3–V4; none at 36 °C', () => {
    const jOf = (k: number[]) => {
      for (let i = 0; i < k.length; i += K_STRIDE) if (k[i + 6] === WAVE.J) return [k[i + 3]!, k[i + 4]!, k[i + 5]!] as const;
      return null;
    };
    expect(jOf(beat({ tempC: 36 }))).toBeNull();
    const v = jOf(beat({ tempC: 28 }))!;
    expect(leadOf(v, 'V3')).toBeCloseTo(0.4, 3);
    for (const l of ['ecgII', 'V1', 'V6', 'ecgI'] as const) expect(leadOf(v, l)).toBeLessThan(leadOf(v, 'V4') + 1e-9);
  });
});
```


- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s5/morph-electrolytes.test.ts`

Expected: FAIL — cannot resolve `morphology/electrolytes.ts`.

- [ ] **Step 3: Implement**

Create or replace `packages/engine-core/src/l2/ecg/morphology/electrolytes.ts` with exactly:

```ts
// Potassium and temperature (brief §5 "Electrolytes from state k", "Temperature"; research 03 §1.6).
// HyperK ordering: K 5.5–6.5 peaked T (σ −40%, a ×2.5) → 6.5–7.5 P flattens, PR +40 ms → ≥ 7 QRS +20–100% →
// > 8 sine wave (QRS merges into T). HypoK: U up to 0.28 mV, T flattening, slight ST depression.
// Hypothermia: Osborn J at the J point (σ 12/20 ms), largest in V3–V4, 0.4 mV at 28 °C; QRS/QT/PR prolonged.
import { WAVE, K_STRIDE } from '../kernels.ts';
import type { Modifiers } from '../../../types.ts';
import type { Vec3 } from '../vcg.ts';
import type { MorphStage, PStage, PrTerm } from './index.ts';
import { ISCHAEMIA_DIR } from './st.ts';
import { addShaped, jPointS, mainT, scaleWaves, stretchQrs } from './ops.ts';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const hyperK = (k: number) => ({
  s1: clamp01((k - 5.5) / 1), // peaked T
  s2: clamp01((k - 6.5) / 1), // P flattening, PR↑
  s3: clamp01((k - 7) / 1.5), // QRS widening
  s4: clamp01((k - 8) / 1), // sine wave
});
export const hypoK = (k: number) => clamp01((3.5 - k) / 1.5);
export const coldness = (tempC: number) => clamp01((34 - tempC) / 6);
/** Osborn direction: V3 1.48, V4 1.16, II 0.60 per unit [ENG]. */
export const OSBORN_DIR: Vec3 = [0.55, 0.35, -0.75];

export const potassiumStage: MorphStage = (k, _info, mods) => {
  const { s1, s3, s4 } = hyperK(mods.k);
  const lo = hypoK(mods.k);
  const t = mainT(k);
  if (s1 > 0 && t >= 0) {
    k[t + 1] = (k[t + 1] as number) * (1 - 0.4 * s1);
    k[t + 2] = (k[t + 2] as number) * (1 - 0.4 * s1);
    for (let j = 3; j < 6; j++) k[t + j] = (k[t + j] as number) * (1 + 1.5 * s1);
  }
  if (s3 > 0 || s4 > 0) stretchQrs(k, 1 + s3 + s4);
  if (s4 > 0 && t >= 0) {
    k[t] = (k[t] as number) - 0.2 * s4; // T pulled into the widened QRS: the ST segment disappears [ENG]
    k[t + 1] = (k[t + 1] as number) * (1 + 3 * s4);
  }
  if (lo > 0) {
    scaleWaves(k, WAVE.U, 1 + 8.3 * lo);
    scaleWaves(k, WAVE.T, 1 - 0.6 * lo);
    const j = jPointS(k);
    addShaped(k, j + 0.04, 0.015, 0.08, ISCHAEMIA_DIR, 'ecgII', -0.05 * lo, j + 0.06, WAVE.ST);
  }
  return k;
};

export const temperatureStage: MorphStage = (k, _info, mods) => {
  const cold = Math.max(0, 37 - mods.tempC);
  if (cold === 0) return k;
  stretchQrs(k, 1 + 0.015 * cold);
  for (let i = 0; i < k.length; i += K_STRIDE) if (k[i + 6] === WAVE.T || k[i + 6] === WAVE.U) k[i] = (k[i] as number) * (1 + 0.02 * cold);
  const c = coldness(mods.tempC);
  if (c > 0) {
    const j = jPointS(k);
    addShaped(k, j - 0.005, 0.012, 0.02, OSBORN_DIR, 'V3', 0.4 * c, j - 0.005, WAVE.J);
  }
  return k;
};

/** P flattening with hyperkalaemia (P lost from K ≈ 7.8) and low voltage. */
export const pPotassiumStage: PStage = (k, mods: Modifiers) => {
  const { s2 } = hyperK(mods.k);
  const f = mods.k >= 7.8 ? 0 : 1 - 0.8 * s2;
  for (let i = 0; i < k.length; i += K_STRIDE) {
    k[i + 2] = (k[i + 2] as number) * (1 + 0.5 * s2);
    for (let j = 3; j < 6; j++) k[i + j] = (k[i + j] as number) * f * mods.lowVoltage;
  }
  return k;
};

export const prPotassium: PrTerm = (mods) => 40 * hyperK(mods.k).s2;
export const prTemperature: PrTerm = (mods) => 3 * Math.max(0, 35 - mods.tempC);
```

In `packages/engine-core/src/l2/ecg/morphology/index.ts`, replace:

```ts
import { alternansStage, axisStage, bbbStage, lowVoltageStage, lvhStage, qrsOverrideStage, transitionStage } from './conduction.ts';
```

with:

```ts
import { alternansStage, axisStage, bbbStage, lowVoltageStage, lvhStage, qrsOverrideStage, transitionStage } from './conduction.ts';
import { pPotassiumStage, potassiumStage, prPotassium, prTemperature, temperatureStage } from './electrolytes.ts';
```

In `packages/engine-core/src/l2/ecg/morphology/index.ts`, replace:

```ts
/** Order matters: fingerprint → timing (overrides, K, temperature) → conduction/axis/voltage → ST/T → alternans. */
export const MORPH_STAGES: MorphStage[] = [
  qrsOverrideStage,
  bbbStage,
  axisStage,
  transitionStage,
  lvhStage,
  lowVoltageStage,
  longQtStage,
  digoxinStage,
  tInversionStage,
  stStage,
  ischaemiaStage,
  brugadaStage,
  alternansStage,
];
```

with:

```ts
/** Order matters: fingerprint → timing (overrides, K, temperature) → conduction/axis/voltage → ST/T → alternans. */
export const MORPH_STAGES: MorphStage[] = [
  qrsOverrideStage,
  potassiumStage,
  temperatureStage,
  bbbStage,
  axisStage,
  transitionStage,
  lvhStage,
  lowVoltageStage,
  longQtStage,
  digoxinStage,
  tInversionStage,
  stStage,
  ischaemiaStage,
  brugadaStage,
  alternansStage,
];
```

In `packages/engine-core/src/l2/ecg/morphology/index.ts`, replace:

```ts
export const P_STAGES: PStage[] = [];
```

with:

```ts
export const P_STAGES: PStage[] = [pPotassiumStage];
```

In `packages/engine-core/src/l2/ecg/morphology/index.ts`, replace:

```ts
export const PR_TERMS: PrTerm[] = [];
```

with:

```ts
export const PR_TERMS: PrTerm[] = [prPotassium, prTemperature];
```


- [ ] **Step 4: Run the tests and the type check**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg`

Expected: PASS (no failures; the Stage 1 tests keep passing).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/ecg/morphology/electrolytes.ts packages/engine-core/src/l2/ecg/morphology/index.ts packages/engine-core/test/l2/ecg/s5/morph-electrolytes.test.ts
git commit -m "feat(ecg): hyperkalaemia staging, hypokalaemia u waves, osborn j waves"
```

---

### Task 21: Individuality: patientSeed and morphologyVariation

A stable per-patient fingerprint (acceptance test 10): per-wave rotations, amplitude scales, T timing and QRS width derived from `patientSeed` alone (a private PRNG copy, so no engine stream moves). `morphologyVariation = 0` (default) leaves the textbook beat untouched.

**Files:**
- Create: `packages/engine-core/src/l2/ecg/morphology/individuality.ts`
- Modify: `packages/engine-core/src/l2/ecg/morphology/index.ts` (import, `MORPH_STAGES`, `P_STAGES`)
- Test: `packages/engine-core/test/l2/ecg/s5/morph-individuality.test.ts`

**Interfaces:**
- Consumes: `createRngState`, ops.
- Produces: `fingerprint(seed)`, `individualityStage`, `pIndividualityStage`.

- [ ] **Step 1: Write the failing test**

Create or replace `packages/engine-core/test/l2/ecg/s5/morph-individuality.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { QRS_WAVES } from '../../../../src/l2/ecg/morphology/ops.ts';
import { K_STRIDE } from '../../../../src/l2/ecg/kernels.ts';
import { kernelLead, morphBeat, run5 } from '../../../helpers/s5.ts';


const base = morphBeat({});
const beat = morphBeat;

describe('individuality (acceptance 10)', () => {
  const lead2 = (k: number[]) => Array.from({ length: 300 }, (_, i) => kernelLead(k, 'ecgII', i / 500 - 0.1));
  const corr = (a: number[], b: number[]) => {
    const ma = a.reduce((p, v) => p + v, 0) / a.length;
    const mb = b.reduce((p, v) => p + v, 0) / b.length;
    let n = 0, da = 0, db = 0;
    a.forEach((v, i) => { n += (v - ma) * (b[i]! - mb); da += (v - ma) ** 2; db += (b[i]! - mb) ** 2; });
    return n / Math.sqrt(da * db);
  };

  it('same patientSeed → identical morphology across rhythm steps; different seeds differ (r < 0.99)', () => {
    const p = (seed: number) => beat({ patientSeed: seed, morphologyVariation: 1 });
    expect(p(7)).toEqual(p(7));
    const a = run5('sinus', 8, { hr: 60, mods: { hrvScale: 0, patientSeed: 7, morphologyVariation: 1 } });
    const b = run5('sinusBrady', 8, { hr: 60, mods: { hrvScale: 0, patientSeed: 7, morphologyVariation: 1 } });
    // QRS timing and vector directions (amplitude varies with respiration, so compare unit vectors)
    const shape = (k: number[]) => {
      const out: number[] = [];
      for (let i = 0; i < k.length; i += K_STRIDE) {
        if (!QRS_WAVES.has(k[i + 6]!)) continue;
        const n = Math.hypot(k[i + 3]!, k[i + 4]!, k[i + 5]!);
        out.push(k[i]!, k[i + 1]!, k[i + 2]!, k[i + 3]! / n, k[i + 4]! / n, k[i + 5]! / n);
      }
      return out.map((v) => v.toFixed(9));
    };
    expect(shape(a.st.events.at(-1)!.k)).toEqual(shape(b.st.events.at(-1)!.k));
    for (const [s1, s2] of [[1, 2], [3, 4], [5, 6]]) expect(corr(lead2(p(s1!)), lead2(p(s2!)))).toBeLessThan(0.99);
    expect(beat({ patientSeed: 99, morphologyVariation: 0 })).toEqual(base);
  });
});
```


- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s5/morph-individuality.test.ts`

Expected: FAIL — cannot resolve… / different seeds give identical beats.

- [ ] **Step 3: Implement**

Create or replace `packages/engine-core/src/l2/ecg/morphology/individuality.ts` with exactly:

```ts
// Per-patient morphology fingerprint (brief §5 "Individuality: patientSeed, morphologyVariation"; research 04 §5).
// A stable function of patientSeed: per-wave frontal/horizontal rotations (±20°·mv), amplitude scales (±25%·mv),
// T timing (±25 ms·mv) and QRS width (±10%·mv). mv = 0 leaves the textbook morphology untouched.
import { createRngState, uniform } from '../../../rng/sfc32.ts';
import { K_STRIDE, WAVE } from '../kernels.ts';
import type { Modifiers } from '../../../types.ts';
import type { MorphStage, PStage } from './index.ts';
import { stretchQrs } from './ops.ts';

interface Fingerprint {
  rotZ: number[]; // per wave code 0..5 (P Q R S T U), radians at mv = 1
  rotY: number[];
  amp: number[];
  tShiftS: number;
  qrsF: number;
}

const cache = new Map<number, Fingerprint>();

export function fingerprint(seed: number): Fingerprint {
  let f = cache.get(seed);
  if (!f) {
    const s = createRngState(seed).scenario; // a private copy: never touches the engine's streams
    const u = () => 2 * uniform(s) - 1;
    const deg = Math.PI / 180;
    f = {
      rotZ: Array.from({ length: 6 }, () => 20 * deg * u()),
      rotY: Array.from({ length: 6 }, () => 20 * deg * u()),
      amp: Array.from({ length: 6 }, () => 0.25 * u()),
      tShiftS: 0.025 * u(),
      qrsF: 0.1 * u(),
    };
    cache.set(seed, f);
  }
  return f;
}

function perturb(k: number[], fp: Fingerprint, mv: number): void {
  for (let i = 0; i < k.length; i += K_STRIDE) {
    const w = k[i + 6] as number;
    const c = w === WAVE.DELTA ? WAVE.R : w;
    if (c > WAVE.U) continue;
    const az = (fp.rotZ[c] as number) * mv;
    const ay = (fp.rotY[c] as number) * mv;
    let x = k[i + 3] as number;
    let y = k[i + 4] as number;
    let z = k[i + 5] as number;
    [x, y] = [Math.cos(az) * x - Math.sin(az) * y, Math.sin(az) * x + Math.cos(az) * y];
    [x, z] = [Math.cos(ay) * x + Math.sin(ay) * z, -Math.sin(ay) * x + Math.cos(ay) * z];
    const a = 1 + (fp.amp[c] as number) * mv;
    k[i + 3] = x * a;
    k[i + 4] = y * a;
    k[i + 5] = z * a;
    if (w === WAVE.T || w === WAVE.U) k[i] = (k[i] as number) + fp.tShiftS * mv;
  }
}

export const individualityStage: MorphStage = (k, _info, mods) => {
  const mv = mods.morphologyVariation;
  if (mv === 0) return k;
  const fp = fingerprint(mods.patientSeed);
  perturb(k, fp, mv);
  return stretchQrs(k, 1 + fp.qrsF * mv);
};

export const pIndividualityStage: PStage = (k, mods: Modifiers) => {
  if (mods.morphologyVariation === 0) return k;
  perturb(k, fingerprint(mods.patientSeed), mods.morphologyVariation);
  return k;
};
```

In `packages/engine-core/src/l2/ecg/morphology/index.ts`, replace:

```ts
import { pPotassiumStage, potassiumStage, prPotassium, prTemperature, temperatureStage } from './electrolytes.ts';
```

with:

```ts
import { pPotassiumStage, potassiumStage, prPotassium, prTemperature, temperatureStage } from './electrolytes.ts';
import { individualityStage, pIndividualityStage } from './individuality.ts';
```

In `packages/engine-core/src/l2/ecg/morphology/index.ts`, replace:

```ts
/** Order matters: fingerprint → timing (overrides, K, temperature) → conduction/axis/voltage → ST/T → alternans. */
export const MORPH_STAGES: MorphStage[] = [
  qrsOverrideStage,
  potassiumStage,
  temperatureStage,
  bbbStage,
  axisStage,
  transitionStage,
  lvhStage,
  lowVoltageStage,
  longQtStage,
  digoxinStage,
  tInversionStage,
  stStage,
  ischaemiaStage,
  brugadaStage,
  alternansStage,
];
```

with:

```ts
/** Order matters: fingerprint → timing (overrides, K, temperature) → conduction/axis/voltage → ST/T → alternans. */
export const MORPH_STAGES: MorphStage[] = [
  individualityStage,
  qrsOverrideStage,
  potassiumStage,
  temperatureStage,
  bbbStage,
  axisStage,
  transitionStage,
  lvhStage,
  lowVoltageStage,
  longQtStage,
  digoxinStage,
  tInversionStage,
  stStage,
  ischaemiaStage,
  brugadaStage,
  alternansStage,
];
```

In `packages/engine-core/src/l2/ecg/morphology/index.ts`, replace:

```ts
export const P_STAGES: PStage[] = [pPotassiumStage];
```

with:

```ts
export const P_STAGES: PStage[] = [pIndividualityStage, pPotassiumStage];
```


- [ ] **Step 4: Run the tests and the type check**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg`

Expected: PASS (no failures; the Stage 1 tests keep passing).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/ecg/morphology/index.ts packages/engine-core/src/l2/ecg/morphology/individuality.ts packages/engine-core/test/l2/ecg/s5/morph-individuality.test.ts
git commit -m "feat(ecg): per-patient morphology fingerprint"
```

---

### Task 22: Body artefacts: wander, EMG/shivering, CPR compression artefact

VCG-level artefacts summed before projection and before the L3 filter. CPR is the parametric harmonic model (brief §11 C2) with a bounded per-compression rate walk (±5%) so the h = 1…8 spectral lines survive (acceptance test 4); depth 0–1 maps to a 2√2·RMS of 0.2–2 mV. EMG draws come from the `artefact` stream only while a level is > 0, so Stage 1 hashes are unchanged.

**Files:**
- Create: `packages/engine-core/src/l2/ecg/artefacts/body.ts`
- Modify: `packages/engine-core/src/l2/ecg/rhythm-state.ts` (import + field `art`), `packages/engine-core/src/l2/ecg/ecg-gen.ts` (import + `VCG_SOURCES`)
- Test: `packages/engine-core/test/l2/ecg/s5/artefacts.test.ts` (body part; Task 23 replaces the file with the full version)

**Interfaces:**
- Consumes: `EcgGenInputs.artefactRng`, `WANDER_DIR`.
- Produces: `ArtState`, `createArtState`, `bodyArtefactSource`, `CPR_DIR`, `WANDER_MAX_MV`, `EMG_MAX_RMS_MV`, `CPR_HARMONICS`.

- [ ] **Step 1: Write the failing test**

Create or replace `packages/engine-core/test/l2/ecg/s5/artefacts.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { dominantHz, rms, welch } from '../../../../src/util/dsp.ts';
import { samples5 } from '../../../helpers/s5.ts';

const off = { noise: 0 };
const peakNear = (x: Float64Array, f0: number, tol: number, nfft = 4096) => {
  const { f, p } = welch(x, 500, nfft);
  let best = 0;
  let bf = 0;
  for (let k = 0; k < p.length; k++) if (Math.abs(f[k]! - f0) <= tol && p[k]! > best) { best = p[k]!; bf = f[k]!; }
  const band = Array.from(p).filter((_, k) => f[k]! >= 0.5 && f[k]! <= 20).sort((a, b) => a - b);
  return { f: bf, ratio: best / band[Math.floor(band.length / 2)]! };
};

describe('body artefacts (VCG)', () => {
  it('acceptance 4 — CPR artefact: fundamental at the compression rate and lines at h·f_c for h = 1…8', () => {
    for (const rateCpm of [100, 120]) {
      const r = samples5('asystole', 40, ['ecgII'], { mods: { artefact: { ...off, cpr: { rateCpm, depth: 0.5 } } } });
      const x = r.lead.ecgII!.subarray(5000);
      const fc = rateCpm / 60;
      expect(Math.abs(dominantHz(x, 500, 0.5, 3, 4096) - fc)).toBeLessThanOrEqual(0.05 * fc);
      for (let h = 1; h <= 8; h++) expect(peakNear(x, h * fc, 0.06 * h * fc).ratio).toBeGreaterThan(5);
      const a = rms(x) * 2 * Math.SQRT2;
      expect(a / 1.1).toBeGreaterThan(0.85); // depth 0.5 → 0.2 + 1.8·0.5 = 1.1 mV
      expect(a / 1.1).toBeLessThan(1.2);
    }
  });

  it('EMG 0.02–0.2 mV RMS (level 0.1 → 1), band 20–150 Hz; shiver has a 4–8 Hz envelope; wander 0.1–0.5 Hz', () => {
    const emg = samples5('asystole', 20, ['ecgII'], { mods: { artefact: { ...off, emg: 1 } } }).lead.ecgII!;
    const hp = emg.map((v, i) => (i > 0 ? v - emg[i - 1]! : 0)); // first difference: removes the slow respiratory wander
    expect(rms(hp)).toBeGreaterThan(0.1);
    const lo = samples5('asystole', 20, ['ecgII'], { mods: { artefact: { ...off, emg: 0.1 } } }).lead.ecgII!;
    expect(rms(lo.map((v, i) => (i > 0 ? v - lo[i - 1]! : 0))) / rms(hp)).toBeCloseTo(0.1, 1);
    const shiver = samples5('asystole', 20, ['ecgII'], { mods: { artefact: { ...off, shiver: 1 } } }).lead.ecgII!;
    const e = shiver.map((v, i) => (i > 0 ? Math.abs(v - shiver[i - 1]!) : 0));
    expect(dominantHz(e, 500, 2, 10, 4096)).toBeCloseTo(6, 0);
    const w = samples5('asystole', 60, ['ecgII'], { mods: { rsa: 0, artefact: { ...off, wander: 1 } } }).lead.ecgII!;
    const fw = dominantHz(w, 500, 0.05, 1, 8192);
    expect(fw).toBeGreaterThanOrEqual(0.1);
    expect(fw).toBeLessThanOrEqual(0.5);
  });
});
```


- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s5/artefacts.test.ts`

Expected: FAIL — no CPR lines / no EMG (no body artefact source).

- [ ] **Step 3: Implement**

Create or replace `packages/engine-core/src/l2/ecg/artefacts/body.ts` with exactly:

```ts
// Body-surface artefacts summed into the VCG before projection and before the L3 filter (brief §5 "Artefacts";
// research 03 §1.10–1.11): extra baseline wander, EMG/shivering, CPR compression artefact (parametric, brief §11 C2).
import { normal, uniform } from '../../../rng/sfc32.ts';
import type { EcgGenInputs } from '../ecg-gen.ts';
import type { Vec3 } from '../vcg.ts';
import { WANDER_DIR } from '../templates.ts';

/** EMG direction (II gain ≈ 1) and CPR direction (II gain ≈ 1.05) [ENG]. */
const EMG_DIR: Vec3 = [0.5, 0.8, 0.4];
export const CPR_DIR: Vec3 = [0.1, 0.9, -0.5];
export const WANDER_MAX_MV = 0.3; // 0.05–0.3 mV at 0.1–0.5 Hz
export const EMG_MAX_RMS_MV = 0.2; // 0.02–0.2 mV RMS
const EMG_HP_HZ = 20; // 20–150 Hz band
const EMG_LP_HZ = 150;
/** Gain that makes the first-order 20–150 Hz band-pass of unit white noise unit-RMS at 500 Hz (measured) [ENG]. */
const EMG_NORM = 1.63;
const SHIVER_HZ = 6; // tremor envelope 4–8 Hz
export const CPR_HARMONICS = 8; // Σ_{h=1..8} A_h·e^(−0.3(h−1))·sin(2πh·f_c·t + φ_h)
const CPR_DECAY = 0.3;
const CPR_JITTER = 0.05; // ±5%
const CPR_STEP = 0.004; // per-compression random-walk step (fraction of f_c) [ENG]
/** Σ_h e^(−0.6(h−1)): harmonic power, so that depth maps to the peak-to-peak-equivalent 2√2·RMS [ENG]. */
const CPR_POWER = Array.from({ length: CPR_HARMONICS }, (_, h) => Math.exp(-2 * CPR_DECAY * h)).reduce((a, b) => a + b, 0);

export interface ArtState {
  hp: number[];
  lp: number[];
  px: number[];
  cprPh: number;
  cprF: number;
}

export function createArtState(): ArtState {
  return { hp: [0, 0, 0], lp: [0, 0, 0], px: [0, 0, 0], cprPh: 0, cprF: 0 };
}

const aHp = Math.exp((-2 * Math.PI * EMG_HP_HZ) / 500);
const aLp = Math.exp((-2 * Math.PI * EMG_LP_HZ) / 500);

export function bodyArtefactSource(g: EcgGenInputs, _n: number, s: number, acc: Float64Array): void {
  const a = g.mods.artefact;
  const st = g.st;
  if (a.wander > 0) {
    const w = a.wander * WANDER_MAX_MV * (0.6 * Math.sin(2 * Math.PI * 0.18 * s + 0.7) + 0.4 * Math.sin(2 * Math.PI * 0.37 * s + 2.1));
    for (let j = 0; j < 3; j++) acc[j] = (acc[j] as number) + w * (WANDER_DIR[j] as number);
  }
  const emg = Math.max(a.emg, a.shiver);
  if (emg > 0) {
    const art = (st.art ??= createArtState());
    const env = a.shiver > a.emg ? 0.5 + 0.5 * Math.sin(2 * Math.PI * SHIVER_HZ * s) : 1;
    for (let j = 0; j < 3; j++) {
      const x = normal(g.artefactRng);
      const h = aHp * ((art.hp[j] as number) + x - (art.px[j] as number));
      art.px[j] = x;
      art.hp[j] = h;
      const l = aLp * (art.lp[j] as number) + (1 - aLp) * h;
      art.lp[j] = l;
      acc[j] = (acc[j] as number) + emg * EMG_MAX_RMS_MV * EMG_NORM * env * l * (EMG_DIR[j] as number);
    }
  }
  const cpr = a.cpr;
  if (cpr) {
    const art = (st.art ??= createArtState());
    const fc = cpr.rateCpm / 60;
    if (art.cprF === 0) art.cprF = fc;
    const prev = art.cprPh;
    art.cprPh += (2 * Math.PI * art.cprF) / 500;
    if (Math.floor(art.cprPh / (2 * Math.PI)) > Math.floor(prev / (2 * Math.PI))) {
      // new compression: bounded random walk of the rate, ±5% of f_c
      const next = art.cprF + CPR_STEP * fc * (2 * uniform(g.artefactRng) - 1);
      art.cprF = Math.min(fc * (1 + CPR_JITTER), Math.max(fc * (1 - CPR_JITTER), next));
    }
    const a1 = (0.2 + 1.8 * cpr.depth) / (2 * Math.sqrt(CPR_POWER)); // 2√2·RMS = 0.2–2 mV (brief §4.1)
    let v = 0;
    for (let h = 1; h <= CPR_HARMONICS; h++) v += a1 * Math.exp(-CPR_DECAY * (h - 1)) * Math.sin(h * art.cprPh + 0.9 * h);
    for (let j = 0; j < 3; j++) acc[j] = (acc[j] as number) + v * (CPR_DIR[j] as number) / 1.05;
  } else if (st.art) st.art.cprF = 0;
}
```

In `packages/engine-core/src/l2/ecg/rhythm-state.ts`, replace:

```ts
  /** Running VF episode (arrest/vf.ts). */
  vf?: VfState | undefined;
```

with:

```ts
  /** Running VF episode (arrest/vf.ts). */
  vf?: VfState | undefined;
  /** Body-artefact filter/phase state (artefacts/body.ts). */
  art?: ArtState | undefined;
```

In `packages/engine-core/src/l2/ecg/rhythm-state.ts`, replace:

```ts
import type { VfState } from './arrest/vf.ts';
```

with:

```ts
import type { VfState } from './arrest/vf.ts';
import type { ArtState } from './artefacts/body.ts';
```

In `packages/engine-core/src/l2/ecg/ecg-gen.ts`, replace:

```ts
import { afSource } from './af-texture.ts';
```

with:

```ts
import { afSource } from './af-texture.ts';
import { bodyArtefactSource } from './artefacts/body.ts';
```

In `packages/engine-core/src/l2/ecg/ecg-gen.ts`, replace:

```ts
export const VCG_SOURCES: VcgSource[] = [vfSource, afSource];
```

with:

```ts
export const VCG_SOURCES: VcgSource[] = [vfSource, afSource, bodyArtefactSource];
```


- [ ] **Step 4: Run the tests and the type check**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg`

Expected: PASS (no failures; the Stage 1 tests keep passing).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/ecg/artefacts/body.ts packages/engine-core/src/l2/ecg/ecg-gen.ts packages/engine-core/src/l2/ecg/rhythm-state.ts packages/engine-core/test/l2/ecg/s5/artefacts.test.ts
git commit -m "feat(ecg): baseline wander, emg/shivering and parametric cpr artefact"
```

---

### Task 23: Front-end artefacts: mains, motion, diathermy, defibrillator saturation/recovery, lead-off (+ technical alarm), rail clip

Per-lead electrode/amplifier effects as pure functions of (modifiers, lead, sample index): lead-specific constants come from hashes, so every lead recovers differently after a shock and the look-ahead pass is bit-identical to the committed pass. Leads-off flattens every lane and the planner emits an `alarm` event (`category: 'technical'`, id `ecgLeadsOff`) on each change.

**Files:**
- Create: `packages/engine-core/src/l2/ecg/artefacts/front-end.ts`, `packages/engine-core/src/l2/ecg/artefacts/lead-off.ts`
- Modify: `packages/engine-core/src/l2/ecg/rhythm-state.ts` (field `leadOff`), `packages/engine-core/src/l2/ecg/rhythm-engine.ts` (import + `EXTRA_CLOCKS`), `packages/engine-core/src/l2/ecg/ecg-gen.ts` (import + `FRONT_END_STAGES`)
- Test: `packages/engine-core/test/l2/ecg/s5/artefacts.test.ts` (full version)

**Interfaces:**
- Consumes: `hash53`, `NEVER`.
- Produces: `RAIL_MV = 5`, `MAINS_MAX_MV`, `MOTION_MAX_MV`, `mainsStage`, `motionStage`, `diathermyStage`, `shockResponse(lead, atS, energyJ) → { satS, sign, offsetMv, tauS }`, `shockStage`, `leadOffStage`, `railStage`, `leadOffClock`, `LEADS_OFF_ALARM_ID`.

- [ ] **Step 1: Write the failing test**

Create or replace `packages/engine-core/test/l2/ecg/s5/artefacts.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { dominantHz, rms, welch } from '../../../../src/util/dsp.ts';
import { RAIL_MV, shockResponse } from '../../../../src/l2/ecg/artefacts/front-end.ts';
import { samples5 } from '../../../helpers/s5.ts';
import type { LeadId } from '../../../../src/types.ts';

const off = { noise: 0 };
const peakNear = (x: Float64Array, f0: number, tol: number, nfft = 4096) => {
  const { f, p } = welch(x, 500, nfft);
  let best = 0;
  let bf = 0;
  for (let k = 0; k < p.length; k++) if (Math.abs(f[k]! - f0) <= tol && p[k]! > best) { best = p[k]!; bf = f[k]!; }
  const band = Array.from(p).filter((_, k) => f[k]! >= 0.5 && f[k]! <= 20).sort((a, b) => a - b);
  return { f: bf, ratio: best / band[Math.floor(band.length / 2)]! };
};

describe('body artefacts (VCG)', () => {
  it('acceptance 4 — CPR artefact: fundamental at the compression rate and lines at h·f_c for h = 1…8', () => {
    for (const rateCpm of [100, 120]) {
      const r = samples5('asystole', 40, ['ecgII'], { mods: { artefact: { ...off, cpr: { rateCpm, depth: 0.5 } } } });
      const x = r.lead.ecgII!.subarray(5000);
      const fc = rateCpm / 60;
      expect(Math.abs(dominantHz(x, 500, 0.5, 3, 4096) - fc)).toBeLessThanOrEqual(0.05 * fc);
      for (let h = 1; h <= 8; h++) expect(peakNear(x, h * fc, 0.06 * h * fc).ratio).toBeGreaterThan(5);
      const a = rms(x) * 2 * Math.SQRT2;
      expect(a / 1.1).toBeGreaterThan(0.85); // depth 0.5 → 0.2 + 1.8·0.5 = 1.1 mV
      expect(a / 1.1).toBeLessThan(1.2);
    }
  });

  it('EMG 0.02–0.2 mV RMS (level 0.1 → 1), band 20–150 Hz; shiver has a 4–8 Hz envelope; wander 0.1–0.5 Hz', () => {
    const emg = samples5('asystole', 20, ['ecgII'], { mods: { artefact: { ...off, emg: 1 } } }).lead.ecgII!;
    const hp = emg.map((v, i) => (i > 0 ? v - emg[i - 1]! : 0)); // first difference: removes the slow respiratory wander
    expect(rms(hp)).toBeGreaterThan(0.1);
    const lo = samples5('asystole', 20, ['ecgII'], { mods: { artefact: { ...off, emg: 0.1 } } }).lead.ecgII!;
    expect(rms(lo.map((v, i) => (i > 0 ? v - lo[i - 1]! : 0))) / rms(hp)).toBeCloseTo(0.1, 1);
    const shiver = samples5('asystole', 20, ['ecgII'], { mods: { artefact: { ...off, shiver: 1 } } }).lead.ecgII!;
    const e = shiver.map((v, i) => (i > 0 ? Math.abs(v - shiver[i - 1]!) : 0));
    expect(dominantHz(e, 500, 2, 10, 4096)).toBeCloseTo(6, 0);
    const w = samples5('asystole', 60, ['ecgII'], { mods: { rsa: 0, artefact: { ...off, wander: 1 } } }).lead.ecgII!;
    const fw = dominantHz(w, 500, 0.05, 1, 8192);
    expect(fw).toBeGreaterThanOrEqual(0.1);
    expect(fw).toBeLessThanOrEqual(0.5);
  });
});

describe('front-end artefacts (per lead)', () => {
  it('mains: spectral peak at 50 Hz (or 60 Hz) with a 3rd harmonic, amplitude ≤ 0.5 mV, differing by lead', () => {
    for (const mainsHz of [50, 60] as const) {
      const r = samples5('sinus', 10, ['ecgII', 'V1'], { mainsHz, mods: { artefact: { ...off, mains: 1 } } });
      expect(dominantHz(r.lead.ecgII!, 500, 30, 240, 2048)).toBeCloseTo(mainsHz, 0);
      expect(peakNear(r.lead.ecgII!, 3 * mainsHz > 250 ? 500 - 3 * mainsHz : 3 * mainsHz, 1, 2048).ratio).toBeGreaterThan(5);
    }
    const r = samples5('asystole', 4, ['ecgII', 'V1'], { mods: { rsa: 0, artefact: { ...off, mains: 1 } } });
    expect(Math.max(...r.lead.ecgII!.map(Math.abs))).toBeLessThanOrEqual(0.5 * 1.4 * 1.3 + 0.1);
    expect(rms(r.lead.ecgII!)).not.toBeCloseTo(rms(r.lead.V1!), 2);
  });

  it('lead-off: every lead flat, technical alarm raised then cleared', () => {
    const r = samples5('sinus', 6, ['ecgII', 'V5'], { mods: { artefact: { leadOff: true } } });
    expect(Math.max(...r.lead.ecgII!.map(Math.abs))).toBe(0);
    const al = r.records.filter((e) => e.type === 'alarm');
    expect(al[0]).toMatchObject({ id: 'ecgLeadsOff', category: 'technical', state: 'raised' });
  });

  it('shock: rail saturation 50–500 ms, per-lead different recovery, baseline back (< 0.05 mV offset) within 5 s', () => {
    const leads: LeadId[] = ['ecgI', 'ecgII', 'ecgIII', 'V1', 'V5'];
    const r = samples5('asystole', 10, leads, { mods: { rsa: 0, artefact: { ...off, shock: { atS: 2, energyJ: 200 } } } });
    const resp = leads.map((l) => shockResponse(l, 2, 200));
    for (const [i, l] of leads.entries()) {
      const x = r.lead[l]!;
      const sat = resp[i]!.satS;
      expect(sat).toBeGreaterThanOrEqual(0.05);
      expect(sat).toBeLessThanOrEqual(0.5);
      expect(Math.abs(x[Math.round((2 + sat / 2) * 500)]!)).toBe(RAIL_MV);
      const base = samples5('asystole', 10, [l], { mods: { rsa: 0, artefact: off } }).lead[l]!;
      expect(Math.abs(x[Math.round(7 * 500)]! - base[Math.round(7 * 500)]!)).toBeLessThan(0.05);
    }
    expect(new Set(resp.map((q) => q.tauS.toFixed(3))).size).toBeGreaterThan(2);
  });

  it('electrosurgery: saturating broadband burst for its duration only', () => {
    const r = samples5('sinus', 6, ['ecgII'], { mods: { artefact: { ...off, electrosurgery: { atS: 2, durationS: 2 } } } });
    const x = r.lead.ecgII!;
    expect(rms(x.subarray(2.1 * 500, 3.9 * 500))).toBeGreaterThan(2);
    expect(rms(x.subarray(4.2 * 500, 5.8 * 500))).toBeLessThan(0.6);
  });
});
```


- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s5/artefacts.test.ts`

Expected: FAIL — "front-end artefacts": no 50 Hz peak, leads never flat, no rail.

- [ ] **Step 3: Implement**

Create or replace `packages/engine-core/src/l2/ecg/artefacts/front-end.ts` with exactly:

```ts
// Electrode / amplifier front end, per lead (brief §5 "Artefacts", §6.5 "Shock artefact"; research 03 §1.9,
// §1.11). Pure functions of (modifiers, lead, sample index): deterministic, snapshot-free and identical in the
// committed pass and the look-ahead pass. Lead-specific constants come from a hash of the lead name.
import { hash53 } from '../../../rng/sfc32.ts';
import type { LeadId, Modifiers } from '../../../types.ts';

export const RAIL_MV = 5; // amplifier saturation [ENG]
export const MAINS_MAX_MV = 0.5; // 0.01–0.5 mV
const MAINS_H3 = 0.3; // 3rd harmonic relative amplitude [ENG]
export const MOTION_MAX_MV = 3; // 0.5–5 mV
const DIATHERMY_MV = 8; // broadband, saturating [ENG]
const SHOCK_SAT_MIN_S = 0.05; // rail for 50–500 ms, longer at higher energy
const SHOCK_SAT_SPAN_S = 0.45;
const SHOCK_TAU_MIN_S = 0.5; // recovery τ 0.5–1.0 s so the baseline is back < 5 s (brief §6.5)
const SHOCK_TAU_SPAN_S = 0.5;
const SHOCK_OFFSET_MIN_MV = 1; // post-saturation offset step 1–3 mV [ENG]
const SHOCK_OFFSET_SPAN_MV = 2;

/** Four uniform [0,1) numbers fixed per lead (and optionally per event), from a hash. */
function leadRand(lead: LeadId, salt: number): [number, number, number, number] {
  const [a, b] = hash53(lead, salt);
  const [c, d] = hash53(`${lead}#`, salt ^ 0x5bd1e995);
  return [a / 4294967296, b / 4294967296, c / 4294967296, d / 4294967296];
}

/** Deterministic zero-mean noise in [−1, 1] per (lead, sample). */
function hashNoise(lead: LeadId, n: number): number {
  const [a, b] = hash53(lead, n);
  return (a / 4294967296 + b / 4294967296 - 1);
}

export function mainsStage(mods: Modifiers, mainsHz: 50 | 60, lead: LeadId, n: number, v: number): number {
  const lvl = mods.artefact.mains;
  if (lvl <= 0) return v;
  const [g, ph] = leadRand(lead, 1);
  const a = lvl * MAINS_MAX_MV * (0.6 + 0.8 * g);
  const s = n / 500;
  return v + a * (Math.sin(2 * Math.PI * mainsHz * s + 2 * Math.PI * ph) + MAINS_H3 * Math.sin(2 * Math.PI * 3 * mainsHz * s + 4 * Math.PI * ph));
}

export function motionStage(mods: Modifiers, _mainsHz: 50 | 60, lead: LeadId, n: number, v: number): number {
  const lvl = mods.artefact.motion;
  if (lvl <= 0) return v;
  const [r1, r2, r3, r4] = leadRand(lead, 2);
  const s = n / 500;
  const env = Math.max(0, Math.sin(2 * Math.PI * 0.07 * s + 2 * Math.PI * r4)) ** 2; // intermittent bursts [ENG]
  const m = 0.5 * Math.sin(2 * Math.PI * 0.6 * (0.8 + 0.4 * r1) * s) + 0.3 * Math.sin(2 * Math.PI * 1.3 * (0.8 + 0.4 * r2) * s + 1) + 0.2 * Math.sin(2 * Math.PI * 2.4 * (0.8 + 0.4 * r3) * s + 2);
  return v + lvl * MOTION_MAX_MV * env * m * 2;
}

export function diathermyStage(mods: Modifiers, _mainsHz: 50 | 60, lead: LeadId, n: number, v: number): number {
  const b = mods.artefact.electrosurgery;
  const s = n / 500;
  if (!b || s < b.atS || s > b.atS + b.durationS) return v;
  return v + DIATHERMY_MV * hashNoise(lead, n);
}

/** Per-lead shock response: saturation time, rail sign, offset (mV) and recovery τ (s). */
export function shockResponse(lead: LeadId, atS: number, energyJ: number): { satS: number; sign: number; offsetMv: number; tauS: number } {
  const [r1, r2, r3, r4] = leadRand(lead, Math.round(atS * 1000));
  return {
    satS: SHOCK_SAT_MIN_S + SHOCK_SAT_SPAN_S * Math.min(1, energyJ / 360) * (0.7 + 0.3 * r1),
    sign: r2 < 0.5 ? -1 : 1,
    offsetMv: (r3 < 0.5 ? -1 : 1) * (SHOCK_OFFSET_MIN_MV + SHOCK_OFFSET_SPAN_MV * r3),
    tauS: SHOCK_TAU_MIN_S + SHOCK_TAU_SPAN_S * r4,
  };
}

export function shockStage(mods: Modifiers, _mainsHz: 50 | 60, lead: LeadId, n: number, v: number): number {
  const sh = mods.artefact.shock;
  const s = n / 500;
  if (!sh || s < sh.atS) return v;
  const r = shockResponse(lead, sh.atS, sh.energyJ);
  const dt = s - sh.atS;
  if (dt < r.satS) return r.sign * RAIL_MV;
  return v + r.offsetMv * Math.exp(-(dt - r.satS) / r.tauS);
}

export function leadOffStage(mods: Modifiers, _mainsHz: 50 | 60, _lead: LeadId, _n: number, v: number): number {
  return mods.artefact.leadOff ? 0 : v;
}

export function railStage(_mods: Modifiers, _mainsHz: 50 | 60, _lead: LeadId, _n: number, v: number): number {
  return Math.min(RAIL_MV, Math.max(-RAIL_MV, v));
}
```

Create or replace `packages/engine-core/src/l2/ecg/artefacts/lead-off.ts` with exactly:

```ts
// Lead-off technical flag (brief §5 "leadContact"; research 03 §1.8: leads off is a technical INOP with a flat
// trace, not asystole). The planner emits an 'alarm' event (category 'technical') when the flag changes; Stage 4's
// alarm manager owns presentation (priority/tones) and may re-map it.
import { NEVER, type RhythmCtx, type RhythmState } from '../rhythm-state.ts';

export const LEADS_OFF_ALARM_ID = 'ecgLeadsOff';

export const leadOffClock = {
  next(st: RhythmState, ctx: RhythmCtx): number {
    return ctx.mods.artefact.leadOff !== (st.leadOff ?? false) ? st.planT : NEVER;
  },
  fire(st: RhythmState, t: number, ctx: RhythmCtx): void {
    const off = ctx.mods.artefact.leadOff;
    st.leadOff = off;
    st.records.push({ type: 'alarm', t, id: LEADS_OFF_ALARM_ID, priority: 'medium', category: 'technical', state: off ? 'raised' : 'cleared', text: 'ECG LEADS OFF' });
  },
};
```

In `packages/engine-core/src/l2/ecg/rhythm-state.ts`, replace:

```ts
  /** Body-artefact filter/phase state (artefacts/body.ts). */
  art?: ArtState | undefined;
```

with:

```ts
  /** Body-artefact filter/phase state (artefacts/body.ts). */
  art?: ArtState | undefined;
  /** Last lead-off flag the planner announced (artefacts/lead-off.ts). */
  leadOff?: boolean | undefined;
```

In `packages/engine-core/src/l2/ecg/rhythm-engine.ts`, replace:

```ts
import { vfClock } from './arrest/vf.ts';
```

with:

```ts
import { vfClock } from './arrest/vf.ts';
import { leadOffClock } from './artefacts/lead-off.ts';
```

In `packages/engine-core/src/l2/ecg/rhythm-engine.ts`, replace:

```ts
const EXTRA_CLOCKS: ClockSource[] = [pacerClock, tcpClock, vfClock];
```

with:

```ts
const EXTRA_CLOCKS: ClockSource[] = [pacerClock, tcpClock, vfClock, leadOffClock];
```

In `packages/engine-core/src/l2/ecg/ecg-gen.ts`, replace:

```ts
import { bodyArtefactSource } from './artefacts/body.ts';
```

with:

```ts
import { bodyArtefactSource } from './artefacts/body.ts';
import { diathermyStage, leadOffStage, mainsStage, motionStage, railStage, shockStage } from './artefacts/front-end.ts';
```

In `packages/engine-core/src/l2/ecg/ecg-gen.ts`, replace:

```ts
export const FRONT_END_STAGES: FrontEndStage[] = [];
```

with:

```ts
/** Order: pickup (mains, motion, diathermy) → defibrillator → lead-off → rail clip. */
export const FRONT_END_STAGES: FrontEndStage[] = [mainsStage, motionStage, diathermyStage, shockStage, leadOffStage, railStage];
```


- [ ] **Step 4: Run the tests and the type check**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg`

Expected: PASS (no failures; the Stage 1 tests keep passing).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/ecg/artefacts/front-end.ts packages/engine-core/src/l2/ecg/artefacts/lead-off.ts packages/engine-core/src/l2/ecg/ecg-gen.ts packages/engine-core/src/l2/ecg/rhythm-engine.ts packages/engine-core/src/l2/ecg/rhythm-state.ts packages/engine-core/test/l2/ecg/s5/artefacts.test.ts
git commit -m "feat(ecg): mains, motion, diathermy, shock saturation with per-lead recovery, lead-off alarm"
```

---

### Task 24: ECG vocabulary, public exports, library-wide acceptance and determinism

Acceptance test 1 (every rhythm's rate and regularity over 40 seeds), the engine-level integration check through `dispatch`, and a determinism hash over a script that crosses VT, VF, CPR, a shock, DDD pacing and modifiers.

**Files:**
- Create: `packages/engine-core/src/l2/ecg/vocabulary.ts`
- Modify: `packages/engine-core/src/index.ts`
- Test: `packages/engine-core/test/l2/ecg/s5/library.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: `ecgVocabulary(): EcgVocabulary { rhythms[{ id, group, rateRange, defaultRateBpm, rateDrives }], groups, modifiers, artefacts }`; index exports `mergeModifiers`, `validateModifiers`, `ecgVocabulary`, `EcgVocabulary`, `dominantHz`, `rms`, `welch`. The engine-level `vocabulary()` and `commandApplied` (brief §7.1/§7.3) stay with whoever owns engine.ts next (Stage 6) — they consume `ecgVocabulary()`.

- [ ] **Step 1: Write the failing test**

Create or replace `packages/engine-core/test/l2/ecg/s5/library.test.ts` with exactly:

```ts
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../../../src/engine.ts';
import { ecgVocabulary } from '../../../../src/l2/ecg/vocabulary.ts';
import { RHYTHMS, RHYTHM_IDS } from '../../../../src/l2/ecg/rhythms.ts';
import { diffs, mean, run5, sd } from '../../../helpers/s5.ts';
import type { Command, RhythmId } from '../../../../src/types.ts';

/** Expected ventricular rate range (bpm) and max RR coefficient of variation per rhythm, at its default rate. */
const EXPECT: Record<RhythmId, { rate: [number, number]; cvMax: number } | 'none'> = {
  sinus: { rate: [60, 100], cvMax: 0.12 }, sinusBrady: { rate: [35, 59], cvMax: 0.12 }, sinusTachy: { rate: [101, 220], cvMax: 0.12 },
  sinusArrhythmia: { rate: [55, 90], cvMax: 0.35 }, sinusPause: { rate: [45, 80], cvMax: 0.6 },
  atrialTach: { rate: [150, 250], cvMax: 0.03 }, mat: { rate: [95, 155], cvMax: 0.3 }, afib: { rate: [85, 115], cvMax: 0.35 },
  aflutter: { rate: [140, 160], cvMax: 0.03 },
  svtAvnrt: { rate: [140, 280], cvMax: 0.03 }, svtAvrt: { rate: [150, 250], cvMax: 0.03 }, wpwSinus: { rate: [60, 100], cvMax: 0.12 },
  preexcitedAf: { rate: [160, 280], cvMax: 0.45 }, junctionalEscape: { rate: [40, 60], cvMax: 0.03 }, junctionalAccel: { rate: [60, 100], cvMax: 0.03 },
  junctionalTachy: { rate: [100, 180], cvMax: 0.03 },
  avb1: { rate: [60, 80], cvMax: 0.12 }, avb2Mobitz1: { rate: [45, 75], cvMax: 0.4 }, avb2Mobitz2: { rate: [45, 70], cvMax: 0.4 },
  avb2to1: { rate: [35, 45], cvMax: 0.12 }, avbHighGrade: { rate: [28, 38], cvMax: 0.12 }, avb3Narrow: { rate: [40, 60], cvMax: 0.05 },
  avb3Wide: { rate: [20, 40], cvMax: 0.05 },
  idioventricular: { rate: [20, 40], cvMax: 0.05 }, aivr: { rate: [40, 120], cvMax: 0.05 }, vtMono: { rate: [120, 250], cvMax: 0.03 },
  vtPoly: { rate: [150, 300], cvMax: 0.2 }, torsades: { rate: [195, 255], cvMax: 0.12 },
  vfCoarse: 'none', vfFine: 'none', asystole: 'none', pWaveAsystole: 'none',
  agonal: { rate: [4, 20], cvMax: 0.5 },
  pacedAAI: { rate: [65, 75], cvMax: 0.03 }, pacedVVI: { rate: [65, 75], cvMax: 0.03 }, pacedDDD: { rate: [65, 75], cvMax: 0.03 },
};

describe('rhythm library (acceptance 1)', () => {
  it('every RhythmId has a table row, a vocabulary entry and an expectation', () => {
    const v = ecgVocabulary();
    expect(RHYTHM_IDS).toHaveLength(36);
    expect(v.rhythms.map((r) => r.id).sort()).toEqual([...RHYTHM_IDS].sort());
    for (const id of RHYTHM_IDS) {
      expect(EXPECT[id]).toBeDefined();
      expect(v.groups).toContain(RHYTHMS[id].group);
    }
  });

  it.each(RHYTHM_IDS)('%s: rate and regularity within the brief §5 range over 40 seeds', (id) => {
    const e = EXPECT[id];
    for (let seed = 1; seed <= 40; seed++) {
      const { beats } = run5(id, id === 'agonal' ? 240 : 60, { seed, rhythmOpts: { autoAsystole: false } });
      if (e === 'none') {
        expect(beats.length).toBe(0);
        continue;
      }
      const rr = diffs(beats.slice(1).map((b) => b.t));
      const rate = 60 / mean(rr);
      expect(rate, `${id} seed ${seed}`).toBeGreaterThanOrEqual(e.rate[0]);
      expect(rate, `${id} seed ${seed}`).toBeLessThanOrEqual(e.rate[1]);
      expect(sd(rr) / mean(rr), `${id} seed ${seed}`).toBeLessThanOrEqual(e.cvMax);
    }
  });
});

describe('engine integration', () => {
  const cmd = (c: Record<string, unknown>, id: string): Command => ({ id, issuedBy: 'test', ...c }) as Command;

  it('accepts every Stage 5 modifier and rhythm through dispatch, and rejects out-of-range values', () => {
    const e = createEngine({ seed: 1 });
    expect(e.dispatch(cmd({ type: 'setRhythm', rhythm: 'torsades' }, 'a')).accepted).toBe(true);
    expect(e.dispatch(cmd({ type: 'setModifiers', modifiers: { st: { territory: 'inferior', mm: 2 }, bbb: 'lbbb', k: 6.8, artefact: { mains: 0.3 } } }, 'b')).accepted).toBe(true);
    expect(e.dispatch(cmd({ type: 'setModifiers', modifiers: { k: 12 } }, 'c')).reason).toMatch(/k must be/);
    expect(e.dispatch(cmd({ type: 'setModifiers', modifiers: { artefact: { cpr: { rateCpm: 300, depth: 1 } } } }, 'd')).accepted).toBe(false);
  });

  it('determinism: same seed and script → identical SHA-256 over 60 s of ecgII through VF, CPR, shock and pacing', () => {
    const script: Array<[number, Record<string, unknown>]> = [
      [5, { type: 'setRhythm', rhythm: 'vtMono' }],
      [12, { type: 'setRhythm', rhythm: 'vfCoarse' }],
      [20, { type: 'setModifiers', modifiers: { artefact: { cpr: { rateCpm: 110, depth: 0.6 } } } }],
      [35, { type: 'setModifiers', modifiers: { artefact: { cpr: null, shock: { atS: 35.5, energyJ: 200 } } } }],
      [38, { type: 'setRhythm', rhythm: 'pacedDDD' }],
      [48, { type: 'setModifiers', modifiers: { st: { territory: 'anterior', mm: 3 }, artefact: { mains: 0.2, emg: 0.3 } } }],
    ];
    const hashRun = (seed: number) => {
      const e = createEngine({ seed });
      const h = createHash('sha256');
      let from = 0;
      const out = new Float32Array(600);
      for (let t = 0.5; t <= 60 + 1e-9; t += 0.5) {
        for (const [at, c] of script) if (Math.abs(at - t) < 1e-9) e.dispatch(cmd(c, `c${at}`));
        e.advanceTo(t);
        const to = Math.round(t * 500);
        const n = e.readSamples('ecgII', from, out.subarray(0, to - from + 1));
        h.update(Buffer.from(out.buffer, 0, n * 4));
        from = to + 1;
      }
      return h.digest('hex');
    };
    expect(hashRun(42)).toBe(hashRun(42));
    expect(hashRun(42)).not.toBe(hashRun(43));
  });
});
```


- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s5/library.test.ts`

Expected: FAIL — cannot resolve `src/l2/ecg/vocabulary.ts`.

- [ ] **Step 3: Implement**

Create or replace `packages/engine-core/src/l2/ecg/vocabulary.ts` with exactly:

```ts
// ECG vocabulary (brief §7.1 `vocabulary()`: bounds, normals, enums, constraints). The engine-level vocabulary()
// (Stage 6) merges this with the other layers; controllers build their rhythm/modifier menus from it.
import type { RhythmGroup, RhythmId } from '../../types.ts';
import { RHYTHMS } from './rhythms.ts';
import { defaultModifiers } from '../../modifiers.ts';

export interface EcgVocabulary {
  rhythms: Array<{ id: RhythmId; group: RhythmGroup; rateRange: readonly [number, number]; defaultRateBpm: number; rateDrives: string }>;
  groups: RhythmGroup[];
  modifiers: Record<string, { min?: number; max?: number; enum?: readonly (string | number)[]; default: unknown }>;
  artefacts: Record<string, { min?: number; max?: number; default: unknown }>;
}

export function ecgVocabulary(): EcgVocabulary {
  const d = defaultModifiers();
  const ids = Object.keys(RHYTHMS) as RhythmId[];
  return {
    rhythms: ids.map((id) => ({ id, group: RHYTHMS[id].group, rateRange: RHYTHMS[id].rateRange, defaultRateBpm: RHYTHMS[id].defaultRateBpm, rateDrives: RHYTHMS[id].rateDrives })),
    groups: ['sinus', 'atrial', 'svt', 'avBlock', 'ventricular', 'arrest', 'paced'],
    modifiers: {
      pvc: { enum: ['single', 'bigeminy', 'trigeminy', 'couplet', 'triplet', 'run'], default: d.pvc },
      pac: { min: 0, max: 0.9, default: d.pac },
      pjc: { min: 0, max: 0.9, default: d.pjc },
      rsa: { min: 0, max: 1, default: d.rsa },
      hrvScale: { min: 0, max: 3, default: d.hrvScale },
      qtc: { min: 300, max: 650, default: d.qtc },
      bbb: { enum: ['none', 'rbbb', 'lbbb'], default: d.bbb },
      axisDeg: { min: -150, max: 180, default: d.axisDeg },
      transitionLead: { min: 1.5, max: 5.5, default: d.transitionLead },
      lowVoltage: { min: 0.3, max: 1, default: d.lowVoltage },
      lvh: { enum: [0, 1], default: d.lvh },
      st: { enum: ['anterior', 'septal', 'lateral', 'anterolateral', 'inferior', 'posterior'], min: 0.5, max: 4, default: d.st },
      ischaemicDepressionMv: { min: -0.3, max: 0, default: d.ischaemicDepressionMv },
      tInversion: { min: 0, max: 1, default: d.tInversion },
      longQT: { enum: [0, 1], default: d.longQT },
      brugada1: { enum: [0, 1], default: d.brugada1 },
      digoxin: { enum: [0, 1], default: d.digoxin },
      alternans: { min: 0, max: 0.5, default: d.alternans },
      k: { min: 1.5, max: 10, default: d.k },
      tempC: { min: 20, max: 43, default: d.tempC },
      patientSeed: { min: 0, default: d.patientSeed },
      morphologyVariation: { min: 0, max: 1, default: d.morphologyVariation },
      epinephrineAtS: { min: 0, default: d.epinephrineAtS },
      tcp: { min: 0, max: 200, default: d.tcp },
    },
    artefacts: {
      noise: { min: 0, max: 1, default: d.artefact.noise },
      wander: { min: 0, max: 1, default: d.artefact.wander },
      mains: { min: 0, max: 1, default: d.artefact.mains },
      emg: { min: 0, max: 1, default: d.artefact.emg },
      shiver: { min: 0, max: 1, default: d.artefact.shiver },
      motion: { min: 0, max: 1, default: d.artefact.motion },
      leadOff: { default: d.artefact.leadOff },
      electrosurgery: { default: d.artefact.electrosurgery },
      cpr: { min: 60, max: 160, default: d.artefact.cpr },
      shock: { min: 1, max: 400, default: d.artefact.shock },
    },
  };
}
```

In `packages/engine-core/src/index.ts`, replace:

```ts
export { defaultModifiers } from './modifiers.ts';
```

with:

```ts
export { defaultModifiers, mergeModifiers, validateModifiers } from './modifiers.ts';
export { ecgVocabulary, type EcgVocabulary } from './l2/ecg/vocabulary.ts';
export { dominantHz, rms, welch } from './util/dsp.ts';
```


- [ ] **Step 4: Run the tests and the type check**

Run: `npx -y pnpm@9.15.9 -r typecheck && npx -y pnpm@9.15.9 test`

Expected: PASS (no failures; the Stage 1 tests keep passing).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/index.ts packages/engine-core/src/l2/ecg/vocabulary.ts packages/engine-core/test/l2/ecg/s5/library.test.ts
git commit -m "feat(ecg): ecg vocabulary, exports, 40-seed library acceptance and determinism hash"
```

---

### Task 25: PTB-XL normal-beat comparison (report only, ruling R17)

BUILD-PLAN asked for a PTB-XL refit of the default vectors; ruling R17 fixes the lead ratios "as implemented", so this task only measures and records. The script downloads the first 20 `NORM 100` records (CC BY 4.0), builds per-lead median beats, correlates them with the engine's normal beat and writes `docs/gates/stage-5/ptbxl-normal-comparison.json`. Nothing is bundled; the NOTICES row records the use.

**Files:**
- Create: `packages/validation/src/templates/compare-ptbxl.ts`
- Generate: `docs/gates/stage-5/ptbxl-normal-comparison.json`
- Modify: `NOTICES.md` (row N-052)
- Test: `packages/validation/test/templates/compare-ptbxl.test.ts`

**Interfaces:**
- Consumes: Task 14, `narrowKernels`, `projectLeads`.
- Produces: `csvCells`, `rPeaks`, `medianBeat`, `engineBeat(qtMs)`, `comparePtbxl(cache, n)`.

- [ ] **Step 1: Write the failing test**

Create or replace `packages/validation/test/templates/compare-ptbxl.test.ts` with exactly:

```ts
import { describe, expect, it } from 'vitest';
import { csvCells, engineBeat, medianBeat } from '../../src/templates/compare-ptbxl.ts';

describe('PTB-XL comparison helpers', () => {
  it('CSV cells honour quotes; median beat is the per-sample median', () => {
    expect(csvCells('1,"{\'NORM\': 100.0, \'SR\': 0.0}",records500/00000/00001_hr')).toEqual(['1', "{'NORM': 100.0, 'SR': 0.0}", 'records500/00000/00001_hr']);
    const x = Float64Array.from({ length: 2000 }, (_, i) => (i % 500 === 200 ? 1 : 0));
    const m = medianBeat(x, [200, 700, 1200]);
    expect(m[125]).toBe(1);
    expect(m[124]).toBe(0);
  });

  it('the engine beat puts its R peak at the alignment point in lead II', () => {
    const ii = engineBeat(400)[1]!;
    let best = 0;
    for (let i = 1; i < ii.length; i++) if (ii[i]! > ii[best]!) best = i;
    expect(best).toBe(125);
  });
});
```


- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/templates/compare-ptbxl.test.ts`

Expected: FAIL — cannot resolve `compare-ptbxl.ts`.

- [ ] **Step 3: Implement**

Create or replace `packages/validation/src/templates/compare-ptbxl.ts` with exactly:

```ts
// Report-only comparison of the engine's normal beat with PTB-XL normal median beats (CC BY 4.0). Ruling R17
// fixes the lead ratios "as implemented", so nothing is refitted: the per-lead correlations are written to
// docs/gates/stage-5/ptbxl-normal-comparison.json for the gate review and for Stage 8's validation harness.
// Usage: node --experimental-strip-types packages/validation/src/templates/compare-ptbxl.ts [cacheDir] [outJson] [n]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fetchCached } from './fetch.ts';
import { decode16, parseHeader } from './wfdb.ts';
import { bandpassZeroPhase } from './dsp.ts';
import { narrowKernels } from '../../../engine-core/src/l2/ecg/templates.ts';
import { projectLeads } from '../../../engine-core/src/l2/ecg/vcg.ts';
import { K_STRIDE } from '../../../engine-core/src/l2/ecg/kernels.ts';

const PROJECT = 'ptb-xl/1.0.3';
const LEADS = ['I', 'II', 'III', 'AVR', 'AVL', 'AVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
const PRE = 125; // 250 ms before R at 500 Hz
const POST = 225; // 450 ms after R

/** Split one CSV line, honouring double quotes. */
export function csvCells(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/** R peaks on lead II: 5–15 Hz band-pass, 50% of the record's maximum, 250 ms refractory [ENG]. */
export function rPeaks(x: Float64Array, fs: number): number[] {
  const f = bandpassZeroPhase(x, fs, 5, 15);
  let mx = 0;
  for (const v of f) mx = Math.max(mx, Math.abs(v));
  const out: number[] = [];
  for (let i = 1; i < f.length - 1; i++) {
    const v = Math.abs(f[i] as number);
    if (v > 0.5 * mx && v >= Math.abs(f[i - 1] as number) && v >= Math.abs(f[i + 1] as number) && (out.length === 0 || i - (out.at(-1) as number) > 0.25 * fs)) out.push(i);
  }
  return out;
}

export function medianBeat(x: Float64Array, peaks: number[]): Float64Array {
  const ok = peaks.filter((p) => p - PRE >= 0 && p + POST < x.length);
  const out = new Float64Array(PRE + POST);
  for (let i = 0; i < out.length; i++) {
    const v = ok.map((p) => x[p - PRE + i] as number).sort((a, b) => a - b);
    out[i] = v[Math.floor(v.length / 2)] as number;
  }
  return out;
}

function corr(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < a.length; i++) {
    ma += a[i] as number;
    mb += b[i] as number;
  }
  ma /= a.length;
  mb /= b.length;
  let n = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    n += ((a[i] as number) - ma) * ((b[i] as number) - mb);
    da += ((a[i] as number) - ma) ** 2;
    db += ((b[i] as number) - mb) ** 2;
  }
  return n / Math.sqrt(da * db);
}

/** The engine's 12-lead normal beat around R (R = kernel τ 40 ms), for a given QT. */
export function engineBeat(qtMs: number): Float64Array[] {
  const k = narrowKernels(qtMs);
  const leads = Array.from({ length: 12 }, () => new Float64Array(PRE + POST));
  const out = new Float64Array(12);
  for (let i = 0; i < PRE + POST; i++) {
    const s = 0.04 + (i - PRE) / 500;
    let x = 0;
    let y = 0;
    let z = 0;
    for (let j = 0; j < k.length; j += K_STRIDE) {
      const d = s - (k[j] as number);
      const sg = d < 0 ? (k[j + 1] as number) : (k[j + 2] as number);
      const g = Math.exp((-d * d) / (2 * sg * sg));
      x += (k[j + 3] as number) * g;
      y += (k[j + 4] as number) * g;
      z += (k[j + 5] as number) * g;
    }
    projectLeads(x, y, z, out);
    for (let l = 0; l < 12; l++) (leads[l] as Float64Array)[i] = out[l] as number;
  }
  return leads;
}

export async function comparePtbxl(cache: string, n: number): Promise<{ records: string[]; meanR: Record<string, number> }> {
  const csv = new TextDecoder().decode(await fetchCached(cache, PROJECT, 'ptbxl_database.csv')).split(/\r?\n/);
  const head = csvCells(csv[0] as string);
  const iScp = head.indexOf('scp_codes');
  const iHr = head.indexOf('filename_hr');
  const files: string[] = [];
  for (const line of csv.slice(1)) {
    const c = csvCells(line);
    if ((c[iScp] ?? '').includes("'NORM': 100.0")) files.push(c[iHr] as string);
    if (files.length >= n) break;
  }
  const sums: Record<string, number[]> = Object.fromEntries(LEADS.map((l) => [l, []]));
  for (const f of files) {
    const h = parseHeader(new TextDecoder().decode(await fetchCached(cache, PROJECT, `${f}.hea`)));
    const sig = decode16(await fetchCached(cache, PROJECT, `${f}.dat`), h.nSignals);
    const mv = sig.map((s, i) => Float64Array.from(s, (v) => (v - h.signals[i]!.baseline) / h.signals[i]!.gain));
    const ii = mv[1] as Float64Array;
    const peaks = rPeaks(ii, h.fs);
    const rr = (peaks.at(-1)! - peaks[0]!) / (peaks.length - 1) / h.fs;
    const ours = engineBeat(400 * Math.cbrt(rr));
    LEADS.forEach((l, i) => sums[l]!.push(corr(medianBeat(bandpassZeroPhase(mv[i] as Float64Array, h.fs, 0.5, 40), peaks), ours[i] as Float64Array)));
  }
  const meanR = Object.fromEntries(LEADS.map((l) => [l, Number((sums[l]!.reduce((a, b) => a + b, 0) / sums[l]!.length).toFixed(3))]));
  return { records: files, meanR };
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.filename === (await import('node:path')).resolve(process.argv[1]);
if (invokedDirectly) {
  const cache = process.argv[2] ?? 'packages/validation/datasets/cache';
  const out = process.argv[3] ?? 'docs/gates/stage-5/ptbxl-normal-comparison.json';
  const r = await comparePtbxl(cache, Number(process.argv[4] ?? 20));
  console.log(JSON.stringify(r.meanR));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ source: 'PTB-XL 1.0.3 (CC BY 4.0), NORM 100', ruling: 'R17: report only, no refit', ...r }, null, 2) + '\n');
}
```

Run (from the worktree root):

```bash
npx -y pnpm@9.15.9 --filter @pme/validation ptbxl-report
```

Expected output:

```
{"I":0.74,"II":0.86,"III":0.29,"AVR":0.85,"AVL":0.20,"AVF":0.71,"V1":0.83,"V2":0.74,"V3":0.67,"V4":0.85,"V5":0.90,"V6":0.90}   (approximate: measured with 10 records while planning)
```

Append these rows to the table in `NOTICES.md` (IDs from the reserved N-050…N-059 block, see Global Constraints):

```md
| N-052 | PTB-XL normal ECGs (report-only comparison; nothing bundled) | https://physionet.org/content/ptb-xl/1.0.3/ (DOI 10.13026/kfzx-aw45) | CC BY 4.0 | Downloaded to the git-ignored cache by `packages/validation/src/templates/compare-ptbxl.ts`; derived per-lead correlations written to `docs/gates/stage-5/ptbxl-normal-comparison.json`. Attribution: "Wagner P, Strodthoff N, Bousseljot R, Samek W, Schaeffter T. PTB-XL, a large publicly available electrocardiography dataset (version 1.0.3). PhysioNet (2022)." | 2026-09-24 |
```


- [ ] **Step 4: Run the tests and the type check**

Run: `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run && npx -y pnpm@9.15.9 check-notices`

Expected: PASS (no failures; the Stage 1 tests keep passing).

- [ ] **Step 5: Commit**

```bash
git add NOTICES.md packages/validation/src/templates/compare-ptbxl.ts packages/validation/test/templates/compare-ptbxl.test.ts docs/gates/stage-5/ptbxl-normal-comparison.json
git commit -m "feat(validation): ptb-xl normal median-beat comparison report (r17: no refit)"
```

---

### Task 26: Demo: stage5.html — rhythm gallery, modifier playground, ACLS sequencer, blind check

BUILD-PLAN Stage 5 demo. A live two-lane monitor (the Stage 1 `mountMonitor`) with every rhythm, PEA, ectopy, ST, conduction, pattern, electrolyte/temperature, axis, artefact, CPR/shock/diathermy/epinephrine/leads-off/TCP control; an ACLS strip sequencer (sinus → VT → VF coarse → CPR → shock → asystole → ROSC); a gallery of 10 s two-lead strips rendered offline from a headless engine (pace markers drawn as ticks), filterable by group; a blind mode that shows 30 random unlabelled strips with a reveal button. `?strip=<key>` renders one labelled strip only (used by Task 27).

**Files:**
- Create: `apps/demo/stage5.html`, `apps/demo/src/stage5.ts`, `apps/demo/src/strip.ts`, `apps/demo/src/stage5-catalogue.ts`
- Modify: `apps/demo/vite.config.ts` (add the page to the build input)

**Interfaces:**
- Consumes: `createEngine`, `ecgVocabulary`, `mountMonitor` (Stage 1), marker events.
- Produces: `renderStrip(canvas, spec, label | null)`, `StripSpec`, `STRIP_S = 10`, `CATALOGUE: CatalogueItem[]` (70 items: every rhythm id plus modifier/artefact showcases).

- [ ] **Step 1: Implement**

Create or replace `apps/demo/src/strip.ts` with exactly:

```ts
// Offline 10 s two-lead strips for the Stage 5 gallery: an engine is run headlessly in the page, samples are read
// from its lane buffers (monitor-filtered, as displayed) and drawn on a 25 mm/s, 10 mm/mV grid. Pace markers
// (EngineEvent 'marker' kind 'paceSpike') are drawn as vertical ticks, as a monitor does (research 03 §1.7).
import { createEngine, type Command, type EngineEvent, type LeadId, type ModifiersPatch, type RhythmId, type RhythmOpts } from '@pme/engine-core';

export interface StripSpec {
  rhythm: RhythmId;
  opts?: RhythmOpts;
  mods?: ModifiersPatch;
  leads?: [LeadId, LeadId];
  seed?: number;
  /** Seconds of sim time to run before the 10 s window starts (lets HRV/filters settle; VF evolves). */
  warmupS?: number;
}

export const STRIP_S = 10;
const PX_PER_S = 100; // 4 px per mm at 25 mm/s
const PX_PER_MV = 40; // 10 mm/mV
const LANE_H = 150;

export function renderStrip(canvas: HTMLCanvasElement, spec: StripSpec, label: string | null): void {
  const leads = spec.leads ?? ['ecgII', 'V1'];
  const e = createEngine({ seed: spec.seed ?? 7, patient: { rhythm: { id: spec.rhythm, ...(spec.opts ? { opts: spec.opts } : {}) } } });
  let n = 0;
  const send = (c: Record<string, unknown>) => e.dispatch({ id: `s${++n}`, issuedBy: 'strip', ...c } as Command);
  send({ type: 'device', action: { device: 'ecg', action: 'lead', value: leads[0], lane: 0 } });
  send({ type: 'device', action: { device: 'ecg', action: 'lead', value: leads[1], lane: 1 } });
  if (spec.mods) send({ type: 'setModifiers', modifiers: spec.mods });
  const markers: number[] = [];
  e.on((ev: EngineEvent) => {
    if (ev.type === 'marker' && ev.kind === 'paceSpike') markers.push(ev.t);
  }, ['marker']);
  const t0 = spec.warmupS ?? 4;
  e.advanceTo(t0 + STRIP_S + 0.2);
  const w = STRIP_S * PX_PER_S;
  canvas.width = w;
  canvas.height = 2 * LANE_H;
  const g = canvas.getContext('2d') as CanvasRenderingContext2D;
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, 2 * LANE_H);
  g.strokeStyle = '#1d2a1d';
  g.lineWidth = 1;
  for (let x = 0; x <= w; x += 20) {
    g.beginPath();
    g.moveTo(x + 0.5, 0);
    g.lineTo(x + 0.5, 2 * LANE_H);
    g.stroke();
  }
  for (let y = 0; y <= 2 * LANE_H; y += 20) {
    g.beginPath();
    g.moveTo(0, y + 0.5);
    g.lineTo(w, y + 0.5);
    g.stroke();
  }
  const buf = new Float32Array(STRIP_S * 500);
  leads.forEach((lead, li) => {
    const got = e.readSamples(lead, Math.round(t0 * 500), buf);
    const mid = li * LANE_H + LANE_H / 2;
    g.strokeStyle = '#3f3';
    g.lineWidth = 1.5;
    g.beginPath();
    for (let i = 0; i < got; i++) {
      const x = (i / 500) * PX_PER_S;
      const y = mid - Math.max(-LANE_H / 2, Math.min(LANE_H / 2, (buf[i] as number) * PX_PER_MV));
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    g.fillStyle = '#9c9';
    g.font = '13px system-ui, sans-serif';
    g.fillText(lead.replace('ecg', ''), 6, li * LANE_H + 16);
    g.strokeStyle = '#fff';
    for (const t of markers) {
      if (t < t0 || t > t0 + STRIP_S) continue;
      const x = Math.round((t - t0) * PX_PER_S) + 0.5;
      g.beginPath();
      g.moveTo(x, mid - 30);
      g.lineTo(x, mid - 10);
      g.stroke();
    }
  });
  if (label) {
    g.fillStyle = '#fff';
    g.font = 'bold 15px system-ui, sans-serif';
    g.fillText(label, w - 8 - g.measureText(label).width, 18);
  }
}
```

Create or replace `apps/demo/src/stage5-catalogue.ts` with exactly:

```ts
// Every v1 rhythm (and the modifier showcases) as gallery strips: id → spec + label + group.
import type { RhythmGroup } from '@pme/engine-core';
import type { StripSpec } from './strip.ts';

export interface CatalogueItem {
  key: string;
  label: string;
  group: RhythmGroup | 'modifier' | 'artefact';
  spec: StripSpec;
}

const r = (key: string, label: string, group: CatalogueItem['group'], spec: StripSpec): CatalogueItem => ({ key, label, group, spec });

export const CATALOGUE: CatalogueItem[] = [
  r('sinus', 'Sinus rhythm', 'sinus', { rhythm: 'sinus' }),
  r('sinusBrady', 'Sinus bradycardia', 'sinus', { rhythm: 'sinusBrady' }),
  r('sinusTachy', 'Sinus tachycardia', 'sinus', { rhythm: 'sinusTachy' }),
  r('sinusArrhythmia', 'Sinus arrhythmia', 'sinus', { rhythm: 'sinusArrhythmia' }),
  r('sinusPause', 'Sinus pause', 'sinus', { rhythm: 'sinusPause', warmupS: 8 }),
  r('atrialTach', 'Atrial tachycardia', 'atrial', { rhythm: 'atrialTach' }),
  r('mat', 'Multifocal atrial tachycardia', 'atrial', { rhythm: 'mat' }),
  r('afib', 'Atrial fibrillation', 'atrial', { rhythm: 'afib' }),
  r('aflutter2', 'Atrial flutter 2:1', 'atrial', { rhythm: 'aflutter', opts: { ratio: 2 } }),
  r('aflutter4', 'Atrial flutter 4:1', 'atrial', { rhythm: 'aflutter', opts: { ratio: 4 } }),
  r('aflutterVar', 'Atrial flutter, variable block', 'atrial', { rhythm: 'aflutter', opts: { ratio: 'variable' } }),
  r('pac', 'Sinus with PACs', 'atrial', { rhythm: 'sinus', mods: { pac: { probability: 0.25 } } }),
  r('pacAberrant', 'PACs with aberrancy', 'atrial', { rhythm: 'sinus', mods: { pac: { probability: 0.25, aberrant: true } } }),
  r('svtAvnrt', 'SVT (AVNRT)', 'svt', { rhythm: 'svtAvnrt' }),
  r('svtAvrt', 'SVT (orthodromic AVRT)', 'svt', { rhythm: 'svtAvrt' }),
  r('wpwSinus', 'WPW (sinus, delta wave)', 'svt', { rhythm: 'wpwSinus' }),
  r('preexcitedAf', 'Pre-excited AF', 'svt', { rhythm: 'preexcitedAf' }),
  r('junctionalEscape', 'Junctional escape', 'svt', { rhythm: 'junctionalEscape' }),
  r('junctionalAccel', 'Accelerated junctional', 'svt', { rhythm: 'junctionalAccel' }),
  r('junctionalTachy', 'Junctional tachycardia', 'svt', { rhythm: 'junctionalTachy' }),
  r('avb1', '1st-degree AV block', 'avBlock', { rhythm: 'avb1' }),
  r('avb2Mobitz1', '2nd-degree Mobitz I', 'avBlock', { rhythm: 'avb2Mobitz1' }),
  r('avb2Mobitz2', '2nd-degree Mobitz II', 'avBlock', { rhythm: 'avb2Mobitz2' }),
  r('avb2to1', '2:1 AV block', 'avBlock', { rhythm: 'avb2to1' }),
  r('avbHighGrade', 'High-grade AV block (3:1)', 'avBlock', { rhythm: 'avbHighGrade' }),
  r('avb3Narrow', 'CHB, narrow escape', 'avBlock', { rhythm: 'avb3Narrow' }),
  r('avb3Wide', 'CHB, wide escape', 'avBlock', { rhythm: 'avb3Wide' }),
  r('idioventricular', 'Idioventricular rhythm', 'ventricular', { rhythm: 'idioventricular' }),
  r('aivr', 'AIVR', 'ventricular', { rhythm: 'aivr' }),
  r('pvcBigeminy', 'PVC bigeminy', 'ventricular', { rhythm: 'sinus', mods: { pvc: { pattern: 'bigeminy', probability: 0 } } }),
  r('pvcTrigeminy', 'PVC trigeminy', 'ventricular', { rhythm: 'sinus', mods: { pvc: { pattern: 'trigeminy', probability: 0 } } }),
  r('pvcCouplet', 'PVC couplets', 'ventricular', { rhythm: 'sinus', mods: { pvc: { pattern: 'couplet', probability: 0.25 } } }),
  r('pvcMultifocal', 'Multifocal PVCs', 'ventricular', { rhythm: 'sinus', mods: { pvc: { pattern: 'single', probability: 0.3, multifocal: true } } }),
  r('pvcRonT', 'R-on-T PVCs', 'ventricular', { rhythm: 'sinus', mods: { pvc: { pattern: 'trigeminy', probability: 0, rOnT: true } } }),
  r('vtMono', 'Monomorphic VT', 'ventricular', { rhythm: 'vtMono' }),
  r('vtPoly', 'Polymorphic VT', 'ventricular', { rhythm: 'vtPoly' }),
  r('torsades', 'Torsades de pointes', 'ventricular', { rhythm: 'torsades', mods: { longQT: true } }),
  r('vfCoarse', 'VF (coarse)', 'ventricular', { rhythm: 'vfCoarse', opts: { autoAsystole: false } }),
  r('vfFine', 'VF (fine)', 'ventricular', { rhythm: 'vfFine', opts: { autoAsystole: false } }),
  r('asystole', 'Asystole', 'arrest', { rhythm: 'asystole' }),
  r('pWaveAsystole', 'P-wave asystole', 'arrest', { rhythm: 'pWaveAsystole' }),
  r('agonal', 'Agonal rhythm', 'arrest', { rhythm: 'agonal', warmupS: 2 }),
  r('pea', 'PEA (sinus, pulseless)', 'arrest', { rhythm: 'sinus', opts: { pulseless: true } }),
  r('pacedAAI', 'Paced AAI', 'paced', { rhythm: 'pacedAAI' }),
  r('pacedVVI', 'Paced VVI', 'paced', { rhythm: 'pacedVVI' }),
  r('pacedDDD', 'Paced DDD', 'paced', { rhythm: 'pacedDDD' }),
  r('failureToCapture', 'VVI failure to capture', 'paced', { rhythm: 'pacedVVI', opts: { pacer: { fault: 'failureToCapture', faultRate: 0.5 } } }),
  r('failureToSense', 'VVI failure to sense', 'paced', { rhythm: 'pacedVVI', opts: { atrialRateBpm: 80, pacer: { intrinsic: 'conducted', fault: 'failureToSense', ratePpm: 60 } } }),
  r('oversensing', 'VVI oversensing', 'paced', { rhythm: 'pacedVVI', opts: { pacer: { fault: 'oversensing', faultRate: 0.3 } } }),
  r('tcpCapture', 'Transcutaneous pacing, capture', 'paced', { rhythm: 'asystole', mods: { tcp: { mode: 'fixed', ratePpm: 70, mA: 90, thresholdMa: 70 } } }),
  r('stemiAnterior', 'Anterior STEMI (V1/V3)', 'modifier', { rhythm: 'sinus', mods: { st: { territory: 'anterior', mm: 3 } }, leads: ['V3', 'ecgIII'] }),
  r('stemiInferior', 'Inferior STEMI (II/aVL)', 'modifier', { rhythm: 'sinus', mods: { st: { territory: 'inferior', mm: 3 } }, leads: ['ecgII', 'aVL'] }),
  r('lbbb', 'LBBB', 'modifier', { rhythm: 'sinus', mods: { bbb: 'lbbb' }, leads: ['V1', 'V6'] }),
  r('rbbb', 'RBBB', 'modifier', { rhythm: 'sinus', mods: { bbb: 'rbbb' }, leads: ['V1', 'V6'] }),
  r('hyperK', 'Hyperkalaemia K 7.2', 'modifier', { rhythm: 'sinus', mods: { k: 7.2 } }),
  r('hyperKsine', 'Hyperkalaemia K 8.5 (sine wave)', 'modifier', { rhythm: 'sinus', mods: { k: 8.5 } }),
  r('hypoK', 'Hypokalaemia K 2.5 (U waves)', 'modifier', { rhythm: 'sinus', mods: { k: 2.5 }, leads: ['ecgII', 'V2'] }),
  r('osborn', 'Hypothermia 28 °C (Osborn J)', 'modifier', { rhythm: 'sinusBrady', mods: { tempC: 28 }, leads: ['ecgII', 'V3'] }),
  r('brugada', 'Brugada type 1', 'modifier', { rhythm: 'sinus', mods: { brugada1: true }, leads: ['V1', 'V2'] }),
  r('digoxin', 'Digoxin effect', 'modifier', { rhythm: 'sinus', mods: { digoxin: true } }),
  r('longQT', 'Long QT', 'modifier', { rhythm: 'sinus', mods: { longQT: true } }),
  r('alternans', 'Electrical alternans', 'modifier', { rhythm: 'sinusTachy', mods: { alternans: 0.35, lowVoltage: 0.6 } }),
  r('lvh', 'LVH', 'modifier', { rhythm: 'sinus', mods: { lvh: true }, leads: ['V1', 'V5'] }),
  r('mains', '50 Hz mains interference', 'artefact', { rhythm: 'sinus', mods: { artefact: { mains: 0.3 } } }),
  r('shiver', 'Shivering artefact', 'artefact', { rhythm: 'sinus', mods: { artefact: { shiver: 0.7 } } }),
  r('motion', 'Motion artefact', 'artefact', { rhythm: 'sinus', mods: { artefact: { motion: 0.5 } } }),
  r('cpr', 'VF with CPR artefact', 'artefact', { rhythm: 'vfCoarse', opts: { autoAsystole: false }, mods: { artefact: { cpr: { rateCpm: 110, depth: 0.6 } } } }),
  r('shock', 'Shock artefact (200 J) on VF', 'artefact', { rhythm: 'vfCoarse', opts: { autoAsystole: false }, mods: { artefact: { shock: { atS: 6, energyJ: 200 } } } }),
  r('diathermy', 'Electrosurgery burst', 'artefact', { rhythm: 'sinus', mods: { artefact: { electrosurgery: { atS: 7, durationS: 3 } } } }),
  r('leadOff', 'Leads off (flat, technical)', 'artefact', { rhythm: 'sinus', mods: { artefact: { leadOff: true } } }),
];
```

Create or replace `apps/demo/stage5.html` with exactly:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stage 5: rhythm library</title>
    <style>
      body { background: #000; color: #ccc; font: 14px system-ui, sans-serif; margin: 12px; }
      h2 { font-size: 15px; color: #9c9; margin: 18px 0 6px; }
      #monitor { height: 360px; max-width: 1240px; border: 1px solid #333; }
      .bar { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; margin: 10px 0; max-width: 1240px; }
      .bar label { display: inline-flex; gap: 6px; align-items: center; }
      button, select, input { font: inherit; }
      button[aria-pressed='true'] { background: #2a2; color: #000; }
      #gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(520px, 1fr)); gap: 10px; }
      #gallery canvas, #single canvas { width: 100%; max-width: 1000px; border: 1px solid #222; }
      #answers { white-space: pre; font: 13px ui-monospace, monospace; color: #8f8; }
      .hidden { display: none; }
    </style>
  </head>
  <body>
    <div id="single" class="hidden"><canvas id="strip"></canvas></div>
    <div id="app">
      <div id="monitor"></div>
      <div class="bar" id="live"></div>
      <div class="bar" id="mods"></div>
      <div class="bar">
        <button id="acls">Run ACLS strip</button> <span id="aclsState"></span>
        <label>Gallery group <select id="group"></select></label>
        <button id="blind">Blind check (30 strips)</button> <button id="reveal" class="hidden">Reveal answers</button>
      </div>
      <div id="answers"></div>
      <div id="gallery"></div>
    </div>
    <script type="module" src="./src/stage5.ts"></script>
  </body>
</html>
```

Create or replace `apps/demo/src/stage5.ts` with exactly:

```ts
import { ecgVocabulary, type Command, type EngineEvent, type ModifiersPatch, type RhythmId } from '@pme/engine-core';
import { mountMonitor } from '@pme/renderer';
import { CATALOGUE, type CatalogueItem } from './stage5-catalogue.ts';
import { renderStrip } from './strip.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const params = new URLSearchParams(location.search);

// --- Screenshot mode: ?strip=<catalogue key> renders one labelled strip and nothing else --------------------
const stripKey = params.get('strip');
if (stripKey !== null) {
  const item = CATALOGUE.find((c) => c.key === stripKey);
  $('app').classList.add('hidden');
  $('single').classList.remove('hidden');
  if (item) renderStrip($<HTMLCanvasElement>('strip'), item.spec, item.label);
  document.body.dataset.ready = item ? 'yes' : 'unknown-strip';
} else {
  startApp();
}

function startApp(): void {
  // --- Live monitor + rhythm / modifier playground ------------------------------------------------------
  const pm = mountMonitor($('monitor'), { skin: 'philips-like', engine: { seed: 5 }, lanes: ['ecgII', 'V1'] });
  let n = 0;
  let simNow = 0;
  pm.on((e: EngineEvent) => {
    if ('t' in e && typeof e.t === 'number') simNow = Math.max(simNow, e.t);
  });
  const send = (c: Record<string, unknown>) =>
    pm.dispatch({ id: `s5-${++n}`, issuedBy: 'stage5', ...c } as Command).then((r) => {
      if (!r.accepted) console.warn('rejected', c, r.reason);
      return r;
    });
  const mods = (m: ModifiersPatch) => void send({ type: 'setModifiers', modifiers: m });

  const live = $('live');
  const vocab = ecgVocabulary();
  const rhythmSel = document.createElement('select');
  for (const g of vocab.groups) {
    const og = document.createElement('optgroup');
    og.label = g;
    for (const r of vocab.rhythms.filter((x) => x.group === g)) og.append(new Option(r.id, r.id));
    rhythmSel.append(og);
  }
  rhythmSel.value = 'sinus';
  rhythmSel.addEventListener('change', () => void send({ type: 'setRhythm', rhythm: rhythmSel.value as RhythmId, when: 'now' }));
  const pea = document.createElement('input');
  pea.type = 'checkbox';
  pea.addEventListener('change', () => void send({ type: 'setRhythm', rhythm: rhythmSel.value as RhythmId, opts: { pulseless: pea.checked }, when: 'now' }));
  const hr = document.createElement('input');
  hr.type = 'number';
  hr.value = '75';
  hr.addEventListener('change', () => void send({ type: 'setTarget', variable: 'hr', value: Number(hr.value) }));
  live.append(label('Rhythm', rhythmSel), label('PEA (pulseless)', pea), label('HR target', hr));

  const m = $('mods');
  const sel = (name: string, options: Array<[string, ModifiersPatch]>) => {
    const s = document.createElement('select');
    options.forEach(([l], i) => s.add(new Option(l, String(i))));
    s.addEventListener('change', () => mods(options[Number(s.value)]![1]));
    m.append(label(name, s));
  };
  const range = (name: string, min: number, max: number, step: number, value: number, to: (v: number) => ModifiersPatch) => {
    const r = document.createElement('input');
    r.type = 'range';
    Object.assign(r, { min: String(min), max: String(max), step: String(step), value: String(value) });
    const out = document.createElement('span');
    out.textContent = String(value);
    r.addEventListener('input', () => (out.textContent = r.value));
    r.addEventListener('change', () => mods(to(Number(r.value))));
    m.append(label(name, r, out));
  };
  sel('Ectopy', [
    ['none', { pvc: null, pac: null, pjc: null }],
    ['PVC bigeminy', { pvc: { pattern: 'bigeminy', probability: 0 } }],
    ['PVC trigeminy', { pvc: { pattern: 'trigeminy', probability: 0 } }],
    ['PVC couplets', { pvc: { pattern: 'couplet', probability: 0.2 } }],
    ['PVC runs of 5', { pvc: { pattern: 'run', probability: 0.1, runLength: 5 } }],
    ['multifocal PVCs', { pvc: { pattern: 'single', probability: 0.3, multifocal: true } }],
    ['R-on-T', { pvc: { pattern: 'trigeminy', probability: 0, rOnT: true } }],
    ['PACs', { pac: { probability: 0.2 } }],
    ['blocked PACs', { pac: { probability: 0.2, blocked: true } }],
    ['aberrant PACs', { pac: { probability: 0.2, aberrant: true } }],
    ['PJCs', { pjc: { probability: 0.15 } }],
  ]);
  sel('ST', [
    ['none', { st: null, ischaemicDepressionMv: 0 }],
    ...(['anterior', 'septal', 'lateral', 'anterolateral', 'inferior', 'posterior'] as const).map((t): [string, ModifiersPatch] => [`STEMI ${t} 3 mm`, { st: { territory: t, mm: 3 } }]),
    ['ischaemic depression −0.2', { ischaemicDepressionMv: -0.2 }],
  ]);
  sel('Conduction', [['none', { bbb: 'none' }], ['RBBB', { bbb: 'rbbb' }], ['LBBB', { bbb: 'lbbb' }]]);
  sel('Pattern', [
    ['none', { brugada1: false, digoxin: false, longQT: false, lvh: false, alternans: 0, tInversion: 0 }],
    ['Brugada 1', { brugada1: true }],
    ['digoxin', { digoxin: true }],
    ['long QT', { longQT: true }],
    ['LVH', { lvh: true }],
    ['alternans', { alternans: 0.35 }],
    ['T inversion', { tInversion: 1 }],
  ]);
  range('K⁺', 2, 9, 0.1, 4.2, (v) => ({ k: v }));
  range('Temp °C', 26, 38, 0.5, 37, (v) => ({ tempC: v }));
  range('Axis °', -90, 180, 15, 60, (v) => ({ axisDeg: v }));
  range('Low voltage', 0.4, 1, 0.1, 1, (v) => ({ lowVoltage: v }));
  range('Mains', 0, 1, 0.1, 0, (v) => ({ artefact: { mains: v } }));
  range('EMG', 0, 1, 0.1, 0, (v) => ({ artefact: { emg: v } }));
  range('Shiver', 0, 1, 0.1, 0, (v) => ({ artefact: { shiver: v } }));
  range('Motion', 0, 1, 0.1, 0, (v) => ({ artefact: { motion: v } }));
  range('Wander', 0, 1, 0.1, 0, (v) => ({ artefact: { wander: v } }));
  range('Morph. variation', 0, 1, 0.1, 0, (v) => ({ morphologyVariation: v, patientSeed: 11 }));
  const button = (text: string, on: () => void) => {
    const b = document.createElement('button');
    b.textContent = text;
    b.addEventListener('click', on);
    m.append(b);
    return b;
  };
  let cpr = false;
  const cprBtn = button('CPR', () => {
    cpr = !cpr;
    cprBtn.setAttribute('aria-pressed', String(cpr));
    mods({ artefact: { cpr: cpr ? { rateCpm: 110, depth: 0.6 } : null } });
  });
  button('Shock 200 J', () => mods({ artefact: { shock: { atS: simNow + 0.3, energyJ: 200 } } }));
  button('Diathermy 3 s', () => mods({ artefact: { electrosurgery: { atS: simNow + 0.3, durationS: 3 } } }));
  button('Epinephrine', () => mods({ epinephrineAtS: simNow }));
  let leadsOff = false;
  const loBtn = button('Leads off', () => {
    leadsOff = !leadsOff;
    loBtn.setAttribute('aria-pressed', String(leadsOff));
    mods({ artefact: { leadOff: leadsOff } });
  });
  let tcp = false;
  const tcpBtn = button('TCP 70/min 90 mA', () => {
    tcp = !tcp;
    tcpBtn.setAttribute('aria-pressed', String(tcp));
    mods({ tcp: tcp ? { mode: 'demand', ratePpm: 70, mA: 90, thresholdMa: 70 } : null });
  });

  // --- ACLS strip sequencer (BUILD-PLAN Stage 5 demo): sinus → VT → VF coarse → CPR → shock → asystole → ROSC --
  const steps: Array<[number, string, () => void]> = [
    [0, 'sinus', () => void send({ type: 'setRhythm', rhythm: 'sinus', when: 'now' })],
    [8, 'VT', () => void send({ type: 'setRhythm', rhythm: 'vtMono', when: 'now' })],
    [16, 'VF coarse', () => void send({ type: 'setRhythm', rhythm: 'vfCoarse', opts: { autoAsystole: false }, when: 'now' })],
    [26, 'CPR', () => mods({ artefact: { cpr: { rateCpm: 110, depth: 0.6 } } })],
    [40, 'shock', () => mods({ artefact: { cpr: null, shock: { atS: simNow + 0.2, energyJ: 200 } } })],
    [41, 'asystole', () => void send({ type: 'setRhythm', rhythm: 'asystole', when: 'now' })],
    [50, 'ROSC', () => void send({ type: 'setRhythm', rhythm: 'sinusTachy', opts: { rateBpm: 105 }, when: 'now' })],
  ];
  $('acls').addEventListener('click', () => {
    const t0 = performance.now();
    for (const [at, name, fn] of steps)
      setTimeout(() => {
        $('aclsState').textContent = `${name} (+${Math.round((performance.now() - t0) / 1000)} s)`;
        fn();
      }, at * 1000);
  });

  // --- Gallery (filterable by group) and blind check ------------------------------------------------------
  const groupSel = $<HTMLSelectElement>('group');
  const groups = ['all', ...new Set(CATALOGUE.map((c) => c.group))];
  groups.forEach((g) => groupSel.add(new Option(g, g)));
  const gallery = $('gallery');
  const show = (items: CatalogueItem[], labelled: boolean) => {
    gallery.replaceChildren();
    for (const it of items) {
      const c = document.createElement('canvas');
      gallery.append(c);
      renderStrip(c, it.spec, labelled ? it.label : null);
    }
  };
  groupSel.addEventListener('change', () => {
    $('answers').textContent = '';
    show(groupSel.value === 'all' ? CATALOGUE : CATALOGUE.filter((c) => c.group === groupSel.value), true);
  });
  $('blind').addEventListener('click', () => {
    const pool = CATALOGUE.filter((c) => c.group !== 'modifier' && c.group !== 'artefact');
    const pick = Array.from({ length: 30 }, () => pool[Math.floor(Math.random() * pool.length)]!);
    show(pick.map((p, i) => ({ ...p, spec: { ...p.spec, seed: 100 + i } })), false);
    $('answers').textContent = 'Name each strip (1–30, left to right, top to bottom), then press Reveal.';
    const rev = $('reveal');
    rev.classList.remove('hidden');
    rev.onclick = () => ($('answers').textContent = pick.map((p, i) => `${i + 1}. ${p.label}`).join('\n'));
  });
  show(CATALOGUE.filter((c) => c.group === 'sinus'), true);
  groupSel.value = 'sinus';
}

function label(text: string, ...els: HTMLElement[]): HTMLLabelElement {
  const l = document.createElement('label');
  l.append(text, ...els);
  return l;
}
```

In `apps/demo/vite.config.ts`, replace:

```ts
input: { index: page('index'), stage0: page('stage0'), stage1: page('stage1') },
```

with:

```ts
input: { index: page('index'), stage0: page('stage0'), stage1: page('stage1'), stage5: page('stage5') },
```


- [ ] **Step 2: Run the tests and the type check**

Run: `npx -y pnpm@9.15.9 --filter @pme/demo typecheck && npx -y pnpm@9.15.9 --filter @pme/demo build`

Expected: PASS (no failures; the Stage 1 tests keep passing).

- [ ] **Step 3: Open it: `npx -y pnpm@9.15.9 --filter @pme/demo dev`, then http://localhost:5173/stage5.html. Expected: the monitor sweeps sinus in II and V1; the gallery shows five labelled sinus strips; choosing "paced" shows spike ticks before paced complexes; "Run ACLS strip" walks through the seven steps in ~50 s (the step name is shown next to the button). Stop the dev server.**

- [ ] **Step 4: Commit**

```bash
git add apps/demo/src/stage5-catalogue.ts apps/demo/src/stage5.ts apps/demo/src/strip.ts apps/demo/stage5.html apps/demo/vite.config.ts
git commit -m "feat(demo): stage5 rhythm gallery, modifier playground, acls sequencer and blind check"
```

---

### Task 27: Screenshots of every strip and the Gate 5 evidence document

One PNG per catalogue item (70), headless system Google Chrome (docs/gates/stage-1.md: the Playwright CDN is unreachable here, `channel: 'chrome'` works), each ≤ 50 KB — the script fails otherwise.

**Files:**
- Create: `apps/demo/scripts/stage5-shots.ts`
- Generate: `docs/gates/stage-5/*.png`
- Create: `docs/gates/stage-5.md`

**Interfaces:**
- Consumes: Task 26 (`?strip=` mode, `CATALOGUE`), Vite `createServer`, `@playwright/test` `chromium`.
- Produces: gate evidence.

- [ ] **Step 1: Implement**

Create or replace `apps/demo/scripts/stage5-shots.ts` with exactly:

```ts
// Gate 5 evidence: one PNG per catalogue strip (every rhythm + modifier/artefact showcases), taken in headless
// system Google Chrome (docs/gates/stage-1.md: the Playwright browser CDN is not reachable here), each ≤ 50 KB.
// Usage (repo root): node --experimental-strip-types apps/demo/scripts/stage5-shots.ts [outDir]
import { mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { CATALOGUE } from '../src/stage5-catalogue.ts';

const MAX_BYTES = 50 * 1024;
const out = resolve(process.argv[2] ?? 'docs/gates/stage-5');
mkdirSync(out, { recursive: true });
const server = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 5205, strictPort: true }, logLevel: 'warn' });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1040, height: 340 }, deviceScaleFactor: 1 });
const failures: string[] = [];
try {
  for (const item of CATALOGUE) {
    await page.goto(`http://localhost:5205/stage5.html?strip=${item.key}`);
    await page.waitForFunction(() => document.body.dataset.ready !== undefined, undefined, { timeout: 60_000 });
    const file = resolve(out, `${item.key}.png`);
    await page.locator('#strip').screenshot({ path: file });
    const bytes = statSync(file).size;
    console.log(`${item.key.padEnd(18)} ${String(bytes).padStart(6)} B  ${item.label}`);
    if (bytes > MAX_BYTES) failures.push(`${item.key}: ${bytes} B > ${MAX_BYTES}`);
  }
} finally {
  await browser.close();
  await server.close();
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`${CATALOGUE.length} strips written to ${out}`);
```

Run (from the worktree root):

```bash
node --experimental-strip-types apps/demo/scripts/stage5-shots.ts
```

Expected output:

```
sinus               1xxxx B  Sinus rhythm
…                   (70 lines, all ≤ 51200 B; while planning the largest was diathermy at 29 KB)
70 strips written to …/docs/gates/stage-5
```

Create or replace `docs/gates/stage-5.md` with exactly:

```md
# Gate 5 — Full rhythm library, templates and artefacts (date: YYYY-MM-DD of the run)

Gate question: "Can Ali identify every rhythm as intended, and does VF/torsades texture look recorded rather than synthetic?"

Stage 1.x baseline this branch started from: `<commit>`, `DEFAULT_PR60_MS = <value>` (from Task 1 Step 2).

| Check | Result |
|---|---|
| Clean clone typecheck/test/build/check-notices | `<exit code, test totals per package, check-notices line>` (Task 28 Step 1) |
| Acceptance 1–10 | table below |
| Strip screenshots (70, each ≤ 50 KB) | `stage-5/*.png`, largest `<name, bytes>` (Task 27 output) |
| PTB-XL comparison (report only, R17) | `stage-5/ptbxl-normal-comparison.json`: mean r per lead `<paste>` |
| Blind rhythm check (Ali, 30 strips, ≥ 27/30) | pending Ali — `stage5.html` → "Blind check (30 strips)" |
| Realism review of VF/torsades texture | pending Ali/orchestrator — strips `vfCoarse.png`, `vfFine.png`, `torsades.png`, `cpr.png` |

## Acceptance tests (BUILD-PLAN Stage 5)

| # | Test (file › name) | Measured |
|---|---|---|
| 1 | `s5/library.test.ts` › rate and regularity over 40 seeds | pass/fail per rhythm (36 rows in the Vitest output) |
| 2 | `s5/vf.test.ts` (4 cases) | f_dom at 0/4/10 min; τ without / with CPR; vfFine at `<t>` s; epinephrine ratio `<x>` and Δf `<y>` |
| 3 | `s5/ventricular.test.ts` › torsades | twist period for 6/12/18 beats |
| 4 | `s5/artefacts.test.ts` › CPR | f_c error; the 8 line/median ratios |
| 5 | `s5/avblock.test.ts` | PR set size 1; drops per minute |
| 6 | `s5/morph-st.test.ts` › anterior | ΔST V2, V3, III, aVF (mV) |
| 7 | `s5/morph-electrolytes.test.ts` › hyperK | first K for T / PR / QRS / sine |
| 8 | `s5/pacing.test.ts` › faults | spikes on T; pauses without spikes |
| 9 | `validation/test/templates/bundled.test.ts` + `pnpm check-notices` | N-050, N-051 present |
| 10 | `s5/morph-individuality.test.ts` | r for seed pairs (1,2), (3,4), (5,6) |

## Deviations from the plan

(List every change you had to make to a plan step, with the reason and the commit.)

## Needs a ruling

- NOTICE IDs N-050…N-052 were taken from a reserved block (Stages 2 and 6a add rows concurrently).
- engine.ts was touched in Task 4 only (6 hunks); `types.ts` gained 3 EngineEvent variants and the `ModifiersPatch` command type.
```


- [ ] **Step 2: Look at every PNG before committing (macOS: `open docs/gates/stage-5/*.png`). For each, the label must match what you see (e.g. `pacedDDD`: two ticks per complex; `torsades`: amplitude waxing/waning with polarity flips; `stemiInferior`: ST up in II, down in aVL). Fill the gate document: run `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/s5 --reporter=verbose` and copy the numbers the acceptance table asks for (add `console.log` temporarily if a value is not printed, and remove it before committing).**

- [ ] **Step 3: Commit**

```bash
git add apps/demo/scripts/stage5-shots.ts docs/gates/stage-5.md docs/gates/stage-5
git commit -m "docs(gates): stage 5 strip screenshots and gate evidence"
```

---

### Task 28: Verify before the gate, then open the pull request

Clean-clone rehearsal, clean-room check, push, PR (ruling R20: every stage lands on its own branch and PR; Ali speaks the merge — do not merge).

**Files:**
- No source changes unless a check fails.

**Interfaces:**
- Consumes: everything.
- Produces: the PR.

- [ ] **Step 1: Clean-clone rehearsal**

```bash
rm -rf /tmp/pme-s5-ci && git clone --branch stage-5-rhythm-library "$(pwd)" /tmp/pme-s5-ci && cd /tmp/pme-s5-ci
npx -y pnpm@9.15.9 install --frozen-lockfile && npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices
cd - && rm -rf /tmp/pme-s5-ci
```

- [ ] **Step 2: Expected: exit code 0; `check-notices: OK (3 governed files)` (cyrb53 from Stage 1.1 plus the two templates). Record the test totals in `docs/gates/stage-5.md`.**

- [ ] **Step 3: Hygiene checks. Expected: no output from the first command; the second lists exactly the two template modules**

```bash
grep -rn "VERIFY" packages/engine-core/src || true
git ls-files packages/engine-core/templates
```

- [ ] **Step 4: Add a "Sources consulted" section to `docs/gates/stage-5.md` (brief §8: every PR records them): the design brief, research 00/02/03, PhysioNet format docs header(5)/signal(5)/annot(5), the CUDB/MIT-BIH/PTB-XL project pages and licences (ODC-By 1.0, CC BY 4.0). State that no ECGSYN, NeuroKit2-ECGSYN, WFDB-library or other GPL/unlicensed code was opened.**

- [ ] **Step 5: Commit the gate numbers if you changed the document, then push and open the PR (do not merge)**

```bash
git add docs/gates/stage-5.md && git commit -m "docs(gates): stage 5 measured values" || true
git push -u origin stage-5-rhythm-library
gh pr create --base main --head stage-5-rhythm-library --title "Stage 5: full rhythm library, recorded VF/AF templates, artefacts" --body-file docs/gates/stage-5.md
```

- [ ] **Step 6: If your session instructions require an attribution line in PR descriptions, append it to the body with `gh pr edit --body-file`. Report the PR URL. Leave the worktree in place until Ali merges; afterwards `git worktree remove ../scratch/wt-stage-5`.**

---


## Acceptance-test index (BUILD-PLAN Stage 5 → where it lives)

| # | BUILD-PLAN acceptance test | Test |
|---|---|---|
| 1 | Rate/regularity of every rhythm, 40 seeds | Task 24 `s5/library.test.ts` |
| 2 | VF f_dom 4–6 Hz, follows f_dom(t) ±0.5 Hz at 4/10 min; τ ±20%, slower with CPR; coarse/fine at 0.2 mV; epinephrine bump | Task 16 `s5/vf.test.ts` (+ AR fallback in Task 13) |
| 3 | Torsades envelope period 5–20 beats | Task 9 `s5/ventricular.test.ts` |
| 4 | CPR lines at h·f_c, h = 1–8 | Task 22/23 `s5/artefacts.test.ts` |
| 5 | Mobitz II and 2:1: constant PR, drops without PR change | Task 10 `s5/avblock.test.ts` |
| 6 | Anterior STEMI: V2–V3 +0.1–0.4 mV, reciprocal III/aVF | Task 18 `s5/morph-st.test.ts` |
| 7 | HyperK 5 → 8.5: peaked T → PR↑ → QRS↑ → sine | Task 20 `s5/morph-electrolytes.test.ts` |
| 8 | Failure to sense: spikes on T; oversensing: pauses without spikes | Task 11 `s5/pacing.test.ts` |
| 9 | Every template has a NOTICE-ID present in NOTICES.md | Task 15 `validation/test/templates/bundled.test.ts` + `pnpm check-notices` |
| 10 | Same patientSeed identical; different seeds r < 0.99 | Task 21 `s5/morph-individuality.test.ts` |
| — | Artefacts: mains peak, EMG level/band, shiver envelope, wander band, lead-off + alarm, shock rail/recovery per lead, diathermy | Tasks 22–23 |
| — | Determinism hash through VT/VF/CPR/shock/DDD/modifiers | Task 24 |
| — | Every rhythm screenshot ≤ 50 KB | Task 27 |

## Self-review (done while writing)

- **Spec coverage.** Brief §5 rhythm table: all ids in `RHYTHMS` (Task 3) with behaviour and a test (Tasks 5–12, 16, 24). Modifiers table: ectopy (7), rsa/hrvScale (Stage 1), bbb/axis/transition/lowVoltage/lvh (19), st/ischaemicDepression/tInversion (18), qtc/longQT/brugada1/digoxin/alternans (18, 19), electrolytes (20), temperature (20), individuality (21). Artefact table: wander/emg/shiver/cpr (22), mains/motion/leadContact/electrosurgery/shock (23), tcp (12), noise (Stage 1). Template provenance (15, 25). BUILD-PLAN Stage 5 demo: gallery, group filter, modifier playground, ACLS sequencer (26); blind check support (26). `vocabulary()`/`commandApplied`: deliberately deferred to Stage 6 with `ecgVocabulary()` provided (Decision 11). Dower [VERIFY]: already confirmed in research 03 §11 item 6; PTB-XL refit replaced by a report (Decision 5, R17).
- **Placeholders.** None in code steps; the gate document (Task 27) is filled from measured output by design.
- **Type consistency.** Names in each task's Interfaces block were checked against the code by applying every task in order to a copy of `d0ebed2` and running its tests (all 28 tasks; the resulting tree is byte-identical to the reference implementation).
