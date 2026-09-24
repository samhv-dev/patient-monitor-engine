# Stage 4a: Skins as Data and Alarm Sound Profiles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@pme/skins` (JSON Schema, six vendor-"-like" skins with a provenance entry behind every value, two themes, the `iran-icu-as-found` preset and a `resolveSkin(id)` renderer/audio contract) and the `@pme/audio` alarm side (three alarm sound profiles as data, burst generators on the existing look-ahead scheduler, volume curves, pitch maps, device tones), plus a skin preview page with gate screenshots and a rendered-audio timing log.

**Architecture:** Skins are data files validated by an ajv-compiled JSON Schema that is closed at every level (no unknown fields) and required at every level for a resolved skin. Vendor skins are partial files over one `iec-defaults` base (the brief §3.8 "Default (other skins)" column); `saadat-like` is complete on its own and is the reference instance (research 06 §5). `resolveSkin` merges base ← skin ← preset ← theme, applies age-band limit inheritance, and derives `render` and `audio` option blocks that map one-to-one onto what `SweepLane`, `NumericTile`, the engine's ECG filter modes and `@pme/audio` accept on `main` today. Alarm sound profiles live in `@pme/audio` as typed data; an `AlarmSounder` turns "alarm X at level L is active" into uniquely-id'd pulse tones on the existing `ToneScheduler`, so silence/clear cancel pulses already handed to Web Audio. Stage 4a does not wire skins into the live renderer (that is Stage 4b, after Stage 2 lands lanes and tiles); the preview page uses the renderer's `SweepLane` with the `ResolvedSkin.render` contract to prove the mapping.

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2, Vite 6.4, ajv 8.20.0 (MIT, new runtime dependency of `@pme/skins`, imported only from the `@pme/skins/validate` entry), Playwright 1.63 against the installed Google Chrome (`PW_SYSTEM_CHROME=1`), Web Audio `OfflineAudioContext` for the timing log. Node ≥ 22.12.

**Spec:** `docs/DESIGN-BRIEF.md` §3.5 (sweep, gap, gain), §3.6 (audio, beep pitch map), §3.8 (skin schema incl. the Saadat-driven fields), §6.4 and §6.4.1 (alarm model, IEC-style and `saadat` sound profiles), §6.5 (charge/shock tones only), §6.8 (vendor defaults tables), §6.9 (Iranian practice, `iran-icu-as-found`); `docs/BUILD-PLAN.md` "Stage 4" (this plan is **4a** = skins package + alarm sound profiles + audio tone library + skin preview page; **4b** = alarm ENGINE logic, pacer/defib, 12-lead, trends, and renderer layout wiring after Stage 2); `../research/00-orchestrator-rulings.md` R2, R3, R8, R12, R13, R14, R25; `../research/06-saadat-alborz-b9.md` §3–§7 (the draft skin, its tags, the bedside checklist); `../research/05-rendering-ux-integration.md` §2.1–§2.7 (vendor looks and alarm numbers).

## Global Constraints

- **Paths** are relative to the Stage 4a worktree root, `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/wt-stage-4a` (Task 1 creates it: a checkout on branch `stage-4a-skins-audio` from `origin/main`). Run every command from there. Never work in `projects/patient-monitor-engine/repo/` itself (R25).
- **pnpm is not on PATH on this Mac.** Every `pnpm` command is written `npx -y pnpm@9.15.9 …`. Browser checks use the installed Google Chrome: `PW_SYSTEM_CHROME=1 npx playwright test <file>`.
- **Ownership (binding; Stages 2, 5 and 6b run concurrently, R25):** this stage creates or edits ONLY `packages/skins/**`, `packages/audio/src/profiles/**`, `packages/audio/src/alarm-*.ts`, `packages/audio/test/{alarm-*,profiles,pitch-and-device-tones}.test.ts`, one additive block of export lines in `packages/audio/src/index.ts`, `apps/demo/stage4a-skins.html`, `apps/demo/src/stage4a/**`, `apps/demo/e2e/stage4a-skins.e2e.ts`, `apps/demo/package.json` (one dependency), `apps/demo/vite.config.ts` and `apps/demo/index.html` (one line each), `docs/gates/stage-4a*`, `docs/plans/stage-4a-skins-audio.md`, `NOTICES.md` (one row) and `pnpm-lock.yaml`. It does **not** modify `packages/renderer/**`, `packages/engine-core/**` or any existing `packages/audio/src/*.ts` other than the export lines in `index.ts`. `MountOptions.skin?: string` already exists on main, so no renderer edit is needed. If a task seems to need an engine or renderer change, stop and report it; the known requests are listed below and are NOT implemented here.
- **Strict TS as in Stages 0–1:** `strict`, `noUncheckedIndexedAccess`, `erasableSyntaxOnly` (no enums, no parameter properties, no namespaces), `verbatimModuleSyntax` (`import type` for types), `.ts` extensions in relative imports. No framework in browser code.
- **Runtime dependencies:** exactly one new, `ajv` in `@pme/skins`. Before adding it, run `git grep -n '"ajv"' origin/main -- '*/package.json'`: if Stage 6b has already added ajv, use **its** version; otherwise use `8.20.0`. `src/index.ts` must never import `src/validate.ts` (the IIFE bundle stays ajv-free; `@pme/skins/validate` is a separate entry).
- **Skins are "-like" only** (brief §3.8, R13): no logos, trade names beyond the "-like" id and label, or trade dress. `saadat-like` carries no Saadat logo.
- **Provenance is binding:** every leaf value of every shipped skin, base, theme and preset is covered by a `provenance` entry `{ tag, source, note? }`; `tag` ∈ `documented | measured | assumed | unverified | conflict | inferred | eng`; `source` cites `research/0N §x`, `research/00 Rn` or `brief §x` (only tag `eng` may say `ENG` alone). Research 06's own tags are copied verbatim. Vendor tables that were not retrieved (GE, Mindray, ZOLL, LIFEPAK alarm limits) stay `null` and are never invented (brief §6.8).
- **No compliance claims** (R12, brief §11 C7): the default profile is labelled "IEC-style"; `saadat` is "Saadat-like".
- **Commits:** conventional commits, one per task, trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (use your own model's attribution if it differs). Never push to `main`; the last task opens a PR and does not merge (R20/R21).
- **Snapshots:** `packages/skins/test/__snapshots__/resolve.test.ts.snap` grows as skins are added. Run Vitest locally (not with `CI=1`) so new snapshots are written, and commit the `.snap` file in the same task. Never run `-u` to make a failing snapshot pass without reading the diff.
- Every engineering constant carries `[ENG]`, `[assumed]` or a citation.

## Decisions this plan makes where the spec was silent or ambiguous

1. **Profile ids.** Brief §3.8 lists `"traditional" | "iso" | "saadat"`; §6.4 and C7 insist on the label "IEC-style". The id is **`iec-style`** (no `iso` alias); `traditional` (Philips-like) and `saadat` as written.
2. **Where alarm sound timings live.** Brief §3.8 lists `alarms.sound` (pattern, pulseMs, gaps, pitch) as a skin field. To keep one source of truth, the pulse/gap/pitch/repeat data live in `@pme/audio` profile files, and a skin keeps `alarms.soundProfile` plus the overrides vendors actually differ by: `alarms.repeatS` per level (ZOLL-like 15/30/none; Philips ISO red 10, yellow 20), `alarms.lowPulses` (Philips-like 2-pulse INOP), `alarms.volume` and `alarms.silence`. The Saadat pattern `[1,1,1,0,1,1]` becomes `gapsMs [100,100,300,100]` (pulse 150 ms, gap 100, long gap 300, all **[assumed]**).
3. **Levels** are `1 | 2 | 3` (1 = highest) everywhere; `alarms.levelNames` gives the display names (`high/medium/low` or `1/2/3`).
4. **IEC-style high burst geometry:** gaps inside each 5-pulse group are x, x, 2x + t_d, x (100, 100, 350, 100 ms); the "groups 0.6 s apart" of brief §6.4 is read as 600 ms of **silence** between the end of pulse 5 and the start of pulse 6. Onsets are therefore 0, .25, .50, 1.00, 1.25, 2.00, 2.25, 2.50, 3.00, 3.25 s.
5. **Which alarm sounds:** only the highest-priority active alarm (ties: first raised). When the top alarm changes, the old train's not-yet-started pulses are cancelled and the new train starts at once.
6. **timeScale:** alarm bursts keep real-time patterns (brief §3.6): pulse offsets are real seconds × `clock.timeScale` in sim time.
7. **Silence:** IEC-style 90 s audio-only, a new alarm does NOT end it; `saadat` 120 s and any NEW alarm ends it (brief §6.4.1). When a silence runs out, a still-active alarm restarts at the silence's end time. Visual suppression is data for Stage 4b.
8. **IEC-style low priority is not repeated** [ENG] (ZOLL "not repeated"; IEC allows > 15 s). `saadat` L3 repeats every 30 s as documented.
9. **Vendor skins extend one base.** `iec-defaults` is the brief §3.8 "Default (other skins)" column plus §6.4; vendor skins (`philips-like`, `zoll-like`, `mindray-like`, `ge-like`, `lifepak-like`) set `extends: "iec-defaults"` and only what differs. `saadat-like` is a complete file (the reference instance). A skin that overrides a field must source that field in its own provenance (tested), so base provenance never mislabels an override.
10. **ECG gains** are stored as multipliers of 10 mm/mV (×1 = 10 mm/mV) with `gainLabel` saying how the device prints them (`multiplier` "X2", `mm-per-mV`, `cm-per-mV`).
11. **Themes are a transform, not per-skin tables:** `projector-light` and `ecg-grid` set background/foreground/chrome and darken every parameter colour (HSL lightness only, hue kept) to ≥ 4.5:1 on the new background.
12. **Saadat paediatric/neonatal limits** inherit adult values where the manual gives no band (`inherit: "adult"`, tagged **[unverified]**); `resolveSkin` returns `approximateLimits[band]` listing the inherited keys so the UI can mark them (brief §6.8).
13. **CO2 %V limits** are stored as the manual gives them (`EtCO2_pctV`); conversion at barometric pressure is Stage 4b (brief §6.8).
14. **Pages:** saadat-like ships P1–P7 and P10 (`pump`); P8/P9 contents are undocumented and omitted **[unverified]**. The rainbow tile row, SIGMA, OXY-CRG, alarm recall UI and the Alvand variant are out of scope (BUILD-PLAN Stage 4).
15. **No runtime validation inside `resolveSkin`:** shipped data are guaranteed by tests; `@pme/skins/validate` exists for user-supplied skins.
16. **Contrast:** parameter colour vs background ≥ 3:1, label foreground ≥ 4.5:1, alarm-bar text vs its bar ≥ 3:1, for every skin and preset with and without each theme.
17. **Solar date** uses `Intl.DateTimeFormat('en-u-ca-persian-nu-latn')`; the prototype confirmed 25 June 2023 → `1402/04/04`, the date in research 06 F7.
18. **Device tones** (charge ramp, ZOLL-like 50 s + 10 s ready tones, LIFEPAK-like 60 s, shock, NIBP done): cadences documented, pitches **[assumed]**.
19. **Pitch maps:** `nellcor-like` s = 0.1 semitone/% (≈ 5 Hz per % near 100 %; 830.6 Hz at 90 %), `enhanced` s = 0.4 [ENG, inside brief 0.25–0.5], `none` fixed.

## Requests for the orchestrator (not implemented here)

| ID | Owner | Request | Why / what 4a does meanwhile |
|---|---|---|---|
| RR-1 | renderer (Stage 4b) | Replace `monitor-core.ts` `THEME` and the literal `LaneConfig` values with `ResolvedSkin.render`; let `mountMonitor` accept any `resolveSkin` id instead of throwing for non-`philips-like` | Contract in `packages/skins/CONTRACT.md`; the preview page proves it with `SweepLane` |
| RR-2 | renderer | ECG gain AUTO (`LaneRender.autoGain`) | 4a starts AUTO lanes at 10 mm/mV |
| RR-3 | renderer | Optional cursor line in `SweepLane` (`render.cursorLine`) | All shipped skins say `false` |
| RR-4 | renderer | A background painter hook in `SweepLane.reset/clearSpan` so the `ecg-grid` theme's grid survives the erase bar | Preview multiplies the grid in after drawing |
| RR-5 | renderer | `NumericTile` colour/font/glyphs from the skin | Preview builds its own static tiles |
| RR-6 | renderer | `mount.ts` scheduler `play` → `createTonePlayer(...)` so alarm pulses and device tones play, not only `playBeep` | `createTonePlayer` ships and is tested |
| E-4a-1 | engine | ECG filter as a band (skin names beyond monitor 0.5–40 / diagnostic 0.05–150: 0.5–24, 0.05–100, 1–20, 0.5–20, 5–25, 0.05–32, 0.05–25, 0.05–40, 0.5–150) | `render.ecgFilter` gives the nearest engine mode with `exact: false` |
| E-4a-2 | engine | HR `moving-average-seconds` (4/8/16 s, 1 Hz) and the HR-source AUTO chain with PR relabel | `render.hrMethod.engine = null` for saadat-like |
| E-4a-3 | engine / 4b | Alarm events `{id, level, raised/cleared}` for the `AlarmSounder`, and `chargeS` on `charge` tone events | Preview raises alarms by hand |

## File map

| Path | Responsibility |
|---|---|
| `packages/skins/src/types.ts` | Skin / Theme / Preset types, enumerations (colour keys, lanes, tiles, pages, lamps, profiles) |
| `packages/skins/src/schema.ts` | JSON Schemas (skin, skin source, theme, preset) built with small closed-object helpers |
| `packages/skins/src/validate.ts` | ajv validation (`@pme/skins/validate` entry only) |
| `packages/skins/src/merge.ts`, `provenance.ts`, `color.ts`, `calendar.ts` | Deep merge; provenance coverage; WCAG contrast + darken; Gregorian/Solar dates |
| `packages/skins/src/registry.ts` | Imports every JSON file; `SKINS`, `BASES`, `THEMES`, `PRESETS`, id lists |
| `packages/skins/src/resolve.ts` | `resolveSkin` and the `render` / `audio` contract |
| `packages/skins/src/data/{base,skins,themes,presets}/*.json` | The data |
| `packages/skins/CONTRACT.md` | Skin field → renderer/audio option mapping |
| `packages/skins/test/*.test.ts` | Schema, provenance, contrast, resolve (+ snapshots), per-skin, themes, preset |
| `packages/audio/src/profiles/{types,iec-style,saadat,traditional,pitch-maps,device-tones,index}.ts` | Sound profiles, pitch maps and device tones as data |
| `packages/audio/src/alarm-bursts.ts` | Pure burst geometry + volume curve |
| `packages/audio/src/alarm-sounder.ts` | Alarm trains on the look-ahead `ToneScheduler` |
| `packages/audio/src/alarm-voice.ts` | Web Audio voices; `createTonePlayer` |
| `apps/demo/stage4a-skins.html`, `apps/demo/src/stage4a/{preview,screen,sample-waves,timing}.ts` | Preview page |
| `apps/demo/e2e/stage4a-skins.e2e.ts` | Gate screenshots + OfflineAudioContext timing log |
| `docs/gates/stage-4a.md`, `docs/gates/stage-4a/` | Gate note, 11 PNGs, `audio-timing.json` |

## Prototype evidence (scratchpad, before this plan was written)

Every file in this plan was run in a scratch copy of `origin/main` (8e46032): `@pme/skins` 155 tests pass (13 files), `@pme/audio` 58 pass (10 files; the 19 Stage 1 tests unchanged), `@pme/renderer` 26 pass (unchanged); whole-repo `typecheck` and `build` pass (the `@pme/skins` ESM build is 58.6 kB and contains no ajv); the Task 5 state (saadat-like only) was checked separately (35 tests). The Playwright file passes in headless Chrome in 2.7 s. Rendered-audio onsets (OfflineAudioContext, 48 kHz, 1 ms envelope, 10 % threshold) match the data to the millisecond:

| Profile / level | Pulses per burst | Burst intervals (s) | First-burst onsets (s) | Measured pulse width | 10–90 % rise |
|---|---|---|---|---|---|
| iec-style L1 | 10, 10, 10 | 10, 10 | 0.002 .252 .502 1.002 1.252 2.002 2.252 2.502 3.002 3.252 | 146 ms (150) | 11 ms |
| iec-style L2 | 3, 3, 3 | 20, 20 | 0.001 .401 .801 | 198 ms (200) | 12 ms |
| iec-style L3 / Philips-like L3 | 1 / 2 | not repeated | 0.001 / 0.001 .401 | 197 ms | 12 ms |
| iec-style L1 on zoll-like | 10, 10, 10 | 15, 15 | as iec-style L1 | 146 ms | 11 ms |
| saadat L1 | 5, 5, 5 | 10, 10 | 0.002 .252 .502 .952 1.202 | 146 ms (150) | 11 ms |
| saadat L2 / L3 | 3 / 1 | 20 / 30 | 0.002 .252 .502 / 0.002 | 146 ms | 11 ms |
| traditional L1 / L2 | 1 | 1 / 2 | 0.001 | 198 ms | 12–13 ms |

(The measured width is the pulse length minus the parts of the 15 ms ramps below the 10 % threshold.)

---

### Task 1: Worktree, branch, ajv dependency and NOTICES row

**Files:**
- Modify: `packages/skins/package.json`, `NOTICES.md`, `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `origin/main` (8e46032 or later).
- Produces: branch `stage-4a-skins-audio` at `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/wt-stage-4a`; `ajv` installed for `@pme/skins`; the package exports `.` and `./validate`.

- [x] **Step 1: Create the worktree from `origin/main`**

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin
git worktree add ../scratch/wt-stage-4a -b stage-4a-skins-audio origin/main
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/wt-stage-4a
git log --oneline -1
npx -y pnpm@9.15.9 install --frozen-lockfile
```
Expected: `Preparing worktree (new branch 'stage-4a-skins-audio')`, the `origin/main` head, pnpm `Done`. (If the orchestrator already created this worktree, use it.) From here on every command runs in the worktree.

- [x] **Step 2: Check whether Stage 6b already added ajv, then add it**

```bash
git grep -n '"ajv"' origin/main -- '*/package.json' || echo "no ajv on main"
npx -y pnpm@9.15.9 --filter @pme/skins add ajv@8.20.0
```
If the grep printed a version (Stage 6b landed first), use that exact version in the `add` instead of `8.20.0`. Expected: `packages/skins/package.json` gains `"dependencies": { "ajv": "8.20.0" }`.

- [x] **Step 3: Add the `./validate` entry** — in `packages/skins/package.json` replace the `exports` block with:

```json
  "exports": {
    ".": "./src/index.ts",
    "./validate": "./src/validate.ts"
  },
```

- [x] **Step 4: NOTICES row** — append to the table in `NOTICES.md`, using the next free ID (N-010 if main still ends at N-009; if Stages 5/6b took it, the next one; if Stage 6b already has an ajv row, add nothing):

```markdown
| N-010 | ajv 8.20.0 (runtime, `@pme/skins/validate` only) | https://github.com/ajv-validator/ajv | MIT | JSON Schema validation of skins, themes and presets; not imported by the main `@pme/skins` entry or the IIFE | 2026-09-25 |
```

- [x] **Step 5: Verify**

```bash
npx -y pnpm@9.15.9 --filter @pme/skins test
(cd packages/skins && node --input-type=module -e "import('ajv').then((m) => console.log(typeof m.Ajv))")
node --experimental-strip-types scripts/check-notices.ts
```
Expected: `1 passed` (the Stage 0 version test), `function`, `check-notices: OK`.

- [x] **Step 6: Commit**

```bash
git add packages/skins/package.json NOTICES.md pnpm-lock.yaml
git commit -m "chore(skins): ajv dependency behind @pme/skins/validate, NOTICES row" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Deep merge and provenance-coverage helpers

**Files:**
- Create: `packages/skins/src/merge.ts`, `packages/skins/src/provenance.ts`, `packages/skins/src/types.ts` (the whole data model; later tasks only import it)
- Test: `packages/skins/test/merge-provenance.test.ts`

**Interfaces:**
- Produces: `deepMerge<T>(base: T, over: unknown): T` (objects merge, arrays/scalars/null replace, never mutates); `leafPaths(doc, prefix?): string[]`; `coveringKey(prov, path): string | undefined`; `provenanceGaps(doc, prov): { uncovered: string[]; dangling: string[] }`; all types in `types.ts` (`Skin`, `Theme`, `Preset`, `Provenance`, `ProvEntry`, `ProvTag`, `LaneId`, `TileParam`, `Level`, `AgeBand`, `LimitTable`, `LimitBand`, `DeepPartial`, the `*_KEYS/*_IDS` const lists).

- [x] **Step 1: Write the types** (no test of its own; every later test exercises it).

Create `packages/skins/src/types.ts`:

```ts
// Skin data model (brief §3.8; research 06 §5 is the reference instance). A skin is DATA: every field below is
// validated by src/schema.ts, and every leaf value is covered by a `provenance` entry (tag + report/section).
// Levels are numbered 1..3 everywhere (1 = highest); `alarms.levelNames` gives the display names.

export type Hex = string; // '#RRGGBB'
export type Level = 'L1' | 'L2' | 'L3';
export type AgeBand = 'adult' | 'paed' | 'neo';

/** Confidence tags: research 06's own (measured … inferred), brief/research-cited `documented`, and `eng` choices. */
export type ProvTag = 'documented' | 'measured' | 'assumed' | 'unverified' | 'conflict' | 'inferred' | 'eng';
export interface ProvEntry {
  tag: ProvTag;
  /** Where the value comes from: 'research/06 §3.2', 'brief §6.8', … ('ENG' only with tag 'eng'). */
  source: string;
  note?: string;
}
/** Keys are dotted paths into the skin ('colors.IBP3', 'alarms.sound'); an entry covers that path and below. */
export type Provenance = Record<string, ProvEntry>;

export const COLOR_KEYS = [
  'ECG', 'HR', 'ST', 'PVC', 'SpO2', 'PLETH', 'PR', 'PI', 'NIBP', 'ART', 'CVP', 'PAP', 'ICP',
  'IBP1', 'IBP2', 'IBP3', 'IBP4', 'RESP', 'CO2', 'AWRR', 'TEMP', 'BFA', 'AGENTS',
] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];
/** Colour keys every skin must define (the rest are optional). */
export const REQUIRED_COLOR_KEYS = ['ECG', 'HR', 'SpO2', 'PLETH', 'NIBP', 'RESP', 'CO2', 'TEMP'] as const;

export const LANE_IDS = ['ECG1', 'ECG2', 'ECG3', 'PLETH', 'ART', 'CVP', 'PAP', 'IBP1', 'IBP2', 'IBP3', 'IBP4', 'RESP', 'CO2'] as const;
export type LaneId = (typeof LANE_IDS)[number];
export const TILE_PARAMS = ['HR', 'NIBP', 'ART', 'CVP', 'PAP', 'IBP1', 'IBP2', 'IBP3', 'IBP4', 'SpO2', 'TEMP', 'RR', 'CO2', 'ST'] as const;
export type TileParam = (typeof TILE_PARAMS)[number];
export const PAGE_KINDS = ['standard', 'multiEcg', 'dualSpo2', 'ibp', 'bigNumber', 'pump'] as const;
export type PageKind = (typeof PAGE_KINDS)[number];
export const HEADER_ITEMS = ['page', 'bed', 'category', 'alarmState', 'silenceCountdown', 'battery', 'recorder', 'network', 'datetime'] as const;
export type HeaderItem = (typeof HEADER_ITEMS)[number];
export const LAMP_STYLES = ['red-flash', 'yellow-flash', 'yellow-steady', 'cyan-steady', 'off'] as const;
export type LampStyle = (typeof LAMP_STYLES)[number];
export const SOUND_PROFILES = ['iec-style', 'traditional', 'saadat'] as const;
export type SoundProfileId = (typeof SOUND_PROFILES)[number];
export const PITCH_MAPS = ['none', 'nellcor-like', 'enhanced'] as const;
export type PitchMapId = (typeof PITCH_MAPS)[number];

export interface TileSpec {
  param: TileParam;
  size?: 'large' | 'normal';
  /** Secondary values drawn in the tile ('PI', 'PR', 'T2', 'DT', 'EtCO2', 'FiCO2', 'AWRR', 'PPV', 'MEAN'). */
  extras?: string[];
}
export interface PumpPage {
  watermark: string;
  ibpAutoScale: boolean;
  hideScaleNumbers: boolean;
  asystoleMessagePersistsThroughSilence: boolean;
}
export interface PageSpec {
  id: string;
  kind: PageKind;
  label: string;
  /** Lanes on this page; omitted = layout.lanes. */
  lanes?: LaneId[];
  /** multiEcg pages: number of ECG traces (2, 4, 7 or 12 on the B9). */
  ecgTraces?: number;
  /** bigNumber pages: which numerics are drawn large, in order. */
  bigNumbers?: TileParam[];
  pump?: PumpPage;
}
export type Colors = Partial<Record<ColorKey, Hex>>;
export interface SweepChannel {
  options: number[];
  default: number;
}
export interface MessageBarColors {
  bg: Hex;
  fg: Hex;
}
export type LimitPair = [number, number];
/** Values are [low, high], a single threshold (seconds, %V), or null = not published (never invented). */
export type LimitTable = Record<string, LimitPair | number | null>;
export interface LimitBand {
  /** Band inherits every key it does not define from this band (research 06 §5 `_inherit`). */
  inherit?: AgeBand;
  values: LimitTable;
}

export interface Skin {
  schema: 'pme-skin/1';
  kind: 'skin';
  id: string;
  label: string;
  /** Base defaults file this skin is merged over ('iec-defaults'); omitted = the file is complete on its own. */
  extends?: string;
  scheme: 'dark' | 'projector-light' | 'ecg-grid';
  background: Hex;
  foreground: Hex;
  chrome: {
    divider: Hex;
    windowFrame: Hex;
    focusFill: Hex;
    softkeyFrame: Hex;
    pageBox: MessageBarColors;
    patientCategoryColor: Hex;
    grid: { minorMm: number; majorMm: number; minor: Hex; major: Hex } | null;
  };
  font: { stack: string; numericWeight: number; labelCase: 'upper' | 'as-is' };
  colors: Colors;
  colorBinding: 'byLabel' | 'byChannel';
  ecgColorLocked: boolean;
  layout: {
    waveAreaFraction: number;
    lanes: LaneId[];
    tiles: TileSpec[][];
    menuRegion: 'popup' | 'wave-area-bottom';
    header: HeaderItem[];
    messageBars: 'single-under-header' | 'split-technical-physiological';
  };
  pages: PageSpec[];
  defaultPage: string;
  calendar: { default: 'gregorian' | 'solar'; options: Array<'gregorian' | 'solar'>; gregorianFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' };
  language: string;
  sweep: {
    ecg: SweepChannel;
    pleth: SweepChannel;
    ibp: SweepChannel;
    resp: SweepChannel;
    co2: SweepChannel;
    style: 'erase-bar';
    gapPx: number;
    cursorLine: boolean;
    lineWidthPx: number;
  };
  ecg: {
    /** Multipliers of 10 mm/mV (×1 = 10 mm/mV), plus 'AUTO'. */
    gainOptions: Array<number | 'AUTO'>;
    gainDefault: number | 'AUTO';
    gainLabel: 'multiplier' | 'mm-per-mV' | 'cm-per-mV';
    /** Display name → [low Hz, high Hz]. */
    filters: Record<string, LimitPair>;
    filterDefault: string;
    filterLabel: 'letter' | 'name';
    laneLeads: string[];
    cableDefault: '3-wire' | '5-wire' | '10-wire';
    calPulse: { mV: number; ms: number; defaultOn: boolean };
    paceDetectDefault: boolean;
    paceMarker: { style: 'vertical-line' | 'marker-above'; heightMm: number };
    laneLabel: string;
  };
  hr: {
    method: 'trimmed-mean-12rr' | 'mean-12rr' | 'moving-average-seconds';
    windowOptions: number[];
    windowDefault: number | null;
    updateHz: number;
    source: string;
    autoPriority: string[];
    relabelNonEcgAs: string | null;
  };
  spo2: {
    avgOptions: Array<number | string>;
    avgDefault: number;
    sensitivity: string[];
    sensitivityDefault: string;
    plethNormalized: boolean;
    updateHz: number;
  };
  nibp: {
    modeDefault: 'MANUAL' | 'AUTO';
    autoIntervalMin: number | null;
    autoIntervalsMin: number[];
    stat: { count: number; spacingS: number; windowS: number };
    initialInflation: Record<AgeBand, number>;
    nextInflation: 'prevSys+30' | 'prevSys+10';
    doneTone: boolean;
  };
  ibp: {
    filterOptionsHz: number[];
    filterDefaultHz: number;
    gridDefault: boolean;
    scaleLines: 'dotted-upper-mid-lower' | 'none';
    meanOnlyLabels: string[];
    /** Label → [low, mid, high] mmHg. */
    scales: Record<string, [number, number, number]>;
  };
  co2: { unit: 'mmHg' | 'kPa' | '%'; scale: number; scaleUnit: 'mmHg' | '%' };
  alarms: {
    levels: 3;
    levelNames: [string, string, string];
    soundProfile: SoundProfileId;
    /** Per-level repeat override (s); null = not repeated. Omitted levels keep the profile's cadence. */
    repeatS?: Partial<Record<Level, number | null>>;
    /** Pulses in the low-priority burst when the skin differs from its profile (Philips-like INOP: 2). */
    lowPulses?: 1 | 2;
    volume: { min: number; max: number; default: number };
    lamp: { L1: LampStyle; L2: LampStyle; L3: LampStyle; flashHz: { L1: number; L2: number }; duty: number };
    messageBar: { L1: MessageBarColors; L2: MessageBarColors; L3: MessageBarColors; idle: MessageBarColors; acknowledged: MessageBarColors; prefix: 'asterisks' | 'none'; rotate: boolean };
    numericFlash: boolean;
    factoryEnabled: boolean;
    alwaysOn: string[];
    alarmOffIcon: 'crossed-bell-red' | 'bell-off';
    silence: { durationS: number; suppressesVisual: boolean; cancelOnNewAlarm: boolean; headerCountdown: boolean; technicalActsAsAck: boolean };
    pause: { durationS: number } | null;
    latching: boolean;
    delayS: number;
    spo2DelayS: number | null;
    alarmFreezeOption: boolean;
    recall: { count: number; windowS: LimitPair } | null;
  };
  limits: Record<AgeBand, LimitBand | null>;
  arrhythmia: {
    defaultOn: boolean;
    asystoleS: { adult: number; neo: number };
    asystoleAltS: number | null;
    pause: { adultS: number; neoS: number } | { ratio: number };
    vtac: { rate: number; count: number };
    tachy: number | null;
    brady: number | null;
    freqPvcPerMin: number;
  };
  st: { defaultOn: boolean; isoMs: number; stMs: number; updateS: number };
  beep: { source: 'ECG' | 'PLETH' | 'HR_SOURCE'; defaultOn: boolean; volume: { min: number; max: number; default: number }; pitchMap: PitchMapId; baseHz: number };
  syncMarker: 'line' | 'triangle-mid-qrs' | 'r-above' | null;
  defib: {
    energyAdultJ: number;
    energyPaedJ: number;
    aedSequenceJ: number[] | null;
    chargeTimeS: Record<string, number> | null;
    readyTimeoutS: number;
    toneSet: 'zoll-like' | 'lifepak-like';
  } | null;
  pacer: { rateDefault: number; rateRange: LimitPair; mADefault: number; mARange: LimitPair; mAStep: { up: number; down: number }; modeDefault: 'demand' | 'fixed'; pausePct: number | null } | null;
  trend: { style: 'line' | 'filled-area'; hours: number };
  glyphs: { noValue: string; hrUnavailable: string; nibpFail: string; outOfRange: string; ibpPrUnavailable: string };
  provenance: Provenance;
}

/** A theme is applied over any resolved skin (brief §3.8 schemes). */
export interface Theme {
  schema: 'pme-theme/1';
  kind: 'theme';
  id: string;
  label: string;
  scheme: 'projector-light' | 'ecg-grid';
  background: Hex;
  foreground: Hex;
  chrome: Partial<Skin['chrome']>;
  /** Every parameter colour is darkened (HSL lightness only) until it reaches this contrast on `background`. */
  colorTransform: { kind: 'darken-to-contrast'; minRatio: number };
  messageBarIdle: MessageBarColors;
  provenance: Provenance;
}

/** A preset is a named partial skin merged over its base skin (brief §3.8 `presets`, §6.9). */
export interface Preset {
  schema: 'pme-preset/1';
  kind: 'preset';
  id: string;
  label: string;
  base: string;
  /** Partial skin; arrays replace, objects merge. */
  overrides: DeepPartial<Omit<Skin, 'schema' | 'kind' | 'id' | 'label' | 'extends' | 'provenance'>>;
  /** Per-parameter alarm switches the preset turns ON/OFF (the base's factoryEnabled applies to the rest). */
  alarmSwitches?: Record<string, boolean>;
  /** Monitor states the preset starts in that are not skin defaults (research 06 §3.1 F7 'APNEA LIMIT: OFF'). */
  startState?: { apneaLimit?: 'OFF' | number };
  provenance: Provenance;
}

export type DeepPartial<T> = T extends unknown[] ? T : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;
```

- [x] **Step 2: Write the failing test**

Create `packages/skins/test/merge-provenance.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { deepMerge } from '../src/merge.ts';
import { coveringKey, leafPaths, provenanceGaps } from '../src/provenance.ts';

describe('deepMerge', () => {
  it('merges objects key by key; arrays, scalars and null replace', () => {
    const base = { a: { b: 1, c: [1, 2] }, d: 'x', e: { f: 1 } };
    expect(deepMerge(base, { a: { c: [9] }, e: null })).toEqual({ a: { b: 1, c: [9] }, d: 'x', e: null });
  });
  it('never mutates its inputs', () => {
    const base = { a: { b: 1 } };
    const over = { a: { c: 2 } };
    const out = deepMerge(base, over) as { a: Record<string, number> };
    out.a.b = 5;
    expect(base).toEqual({ a: { b: 1 } });
    expect(over).toEqual({ a: { c: 2 } });
  });
});

describe('provenance helpers', () => {
  it('leafPaths treats arrays and nulls as leaves and skips identity fields', () => {
    expect(leafPaths({ id: 'x', provenance: {}, a: [1, 2], b: { c: null, d: 1 } })).toEqual(['a', 'b.c', 'b.d']);
  });
  it('coveringKey is the longest matching prefix', () => {
    const prov = { colors: { tag: 'eng', source: 'ENG' }, 'colors.ECG': { tag: 'measured', source: 'research/06 §3.2' } } as const;
    expect(coveringKey(prov, 'colors.ECG')).toBe('colors.ECG');
    expect(coveringKey(prov, 'colors.SpO2')).toBe('colors');
    expect(coveringKey(prov, 'sweep.gapPx')).toBeUndefined();
  });
  it('provenanceGaps reports uncovered leaves and dangling keys', () => {
    const doc = { a: 1, b: { c: 2 } };
    expect(provenanceGaps(doc, { a: { tag: 'eng', source: 'ENG' }, 'b.x': { tag: 'eng', source: 'ENG' } })).toEqual({ uncovered: ['b.c'], dangling: ['b.x'] });
  });
});
```

- [x] **Step 3: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/skins exec vitest run test/merge-provenance.test.ts`
Expected: FAIL, `Failed to load url ../src/merge.ts` (or "Cannot find module").

- [x] **Step 4: Implement**

Create `packages/skins/src/merge.ts`:

```ts
// Deep merge for skin data: plain objects merge key by key, arrays and scalars (and null) replace.
export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

export function deepMerge<T>(base: T, over: unknown): T {
  if (!isObj(base) || !isObj(over)) return (over === undefined ? structuredClone(base) : structuredClone(over)) as T;
  const out: Record<string, unknown> = structuredClone(base);
  for (const [k, v] of Object.entries(over)) {
    if (v === undefined) continue;
    out[k] = k in out && isObj(out[k]) && isObj(v) ? deepMerge(out[k], v) : structuredClone(v);
  }
  return out as T;
}
```

Create `packages/skins/src/provenance.ts`:

```ts
// Provenance coverage: every leaf value of a skin must be covered by a provenance entry whose key is the leaf's
// dotted path or a prefix of it (so one entry can cover a whole block that shares a source).
import type { Provenance } from './types.ts';

const SKIP = new Set(['schema', 'kind', 'id', 'label', 'extends', 'provenance', 'base']);

/** Dotted paths of every leaf (arrays are leaves: a list of options is one value). */
export function leafPaths(doc: unknown, prefix = ''): string[] {
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) return prefix ? [prefix] : [];
  const out: string[] = [];
  for (const [k, v] of Object.entries(doc)) {
    if (!prefix && SKIP.has(k)) continue;
    out.push(...leafPaths(v, prefix ? `${prefix}.${k}` : k));
  }
  return out;
}

/** The provenance key that covers `path` (longest matching prefix), or undefined. */
export function coveringKey(prov: Provenance, path: string): string | undefined {
  const parts = path.split('.');
  for (let n = parts.length; n > 0; n--) {
    const key = parts.slice(0, n).join('.');
    if (key in prov) return key;
  }
  return undefined;
}

/** Leaves with no covering entry, and entries that point at nothing in the document. */
export function provenanceGaps(doc: Record<string, unknown>, prov: Provenance): { uncovered: string[]; dangling: string[] } {
  const leaves = leafPaths(doc);
  const uncovered = leaves.filter((p) => coveringKey(prov, p) === undefined);
  const dangling = Object.keys(prov).filter((k) => !leaves.some((p) => p === k || p.startsWith(`${k}.`)));
  return { uncovered, dangling };
}
```

- [x] **Step 5: Run the test and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/skins exec vitest run test/merge-provenance.test.ts && npx -y pnpm@9.15.9 --filter @pme/skins typecheck`
Expected: 5 passed; typecheck clean.

- [x] **Step 6: Commit**

```bash
git add packages/skins/src/types.ts packages/skins/src/merge.ts packages/skins/src/provenance.ts packages/skins/test/merge-provenance.test.ts
git commit -m "feat(skins): data model types, deep merge and provenance coverage helpers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Colour helpers (WCAG contrast, darken-to-contrast)

**Files:**
- Create: `packages/skins/src/color.ts`
- Test: `packages/skins/test/color.test.ts`

**Interfaces:**
- Produces: `parseHex(hex): [r,g,b]`, `toHex(rgb): string` (upper-case `#RRGGBB`), `luminance(hex)`, `contrastRatio(a, b)` (1..21), `darkenToContrast(hex, bg, minRatio): string`.

- [x] **Step 1: Write the failing test**

Create `packages/skins/test/color.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { contrastRatio, darkenToContrast, luminance, parseHex, toHex } from '../src/color.ts';

describe('colour helpers', () => {
  it('parse and print #RRGGBB', () => {
    expect(parseHex('#00F0a0')).toEqual([0, 240, 160]);
    expect(toHex([0, 240, 160])).toBe('#00F0A0');
    expect(() => parseHex('#0f0')).toThrow();
  });
  it('WCAG luminance and contrast: black/white 21, same colour 1, #777 on white ≈ 4.48', () => {
    expect(luminance('#FFFFFF')).toBeCloseTo(1, 9);
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#123456', '#123456')).toBeCloseTo(1, 9);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
  });
  it('darkenToContrast keeps the hue, just reaches the ratio, and leaves passing colours alone', () => {
    const d = darkenToContrast('#00FFFF', '#FFFFFF', 4.5);
    expect(contrastRatio(d, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(d, '#FFFFFF')).toBeLessThan(4.7);
    const [r, g, b] = parseHex(d);
    expect(r).toBe(0);
    expect(g).toBe(b);
    expect(darkenToContrast('#000080', '#FFFFFF', 4.5)).toBe('#000080');
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/skins exec vitest run test/color.test.ts`
Expected: FAIL (module not found).

- [x] **Step 3: Implement**

Create `packages/skins/src/color.ts`:

```ts
// Colour helpers: WCAG 2.x relative luminance and contrast ratio, and the theme transform that darkens a colour
// (HSL lightness only, hue and saturation kept) until it reaches a contrast ratio on a light background.

export function parseHex(hex: string): [number, number, number] {
  const m = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/.exec(hex);
  if (!m) throw new Error(`not a #RRGGBB colour: ${hex}`);
  return [parseInt(m[1] as string, 16), parseInt(m[2] as string, 16), parseInt(m[3] as string, 16)];
}

export function toHex(rgb: readonly [number, number, number]): string {
  return `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** WCAG relative luminance of an sRGB colour. */
export function luminance(hex: string): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = parseHex(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio, 1..21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb([h, s, l]: [number, number, number]): [number, number, number] {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    const u = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

/** Darken `hex` (HSL lightness only) until its contrast on `bg` is ≥ minRatio; unchanged if it already is. */
export function darkenToContrast(hex: string, bg: string, minRatio: number): string {
  if (contrastRatio(hex, bg) >= minRatio) return hex.toUpperCase();
  const [h, s, l0] = rgbToHsl(parseHex(hex));
  let lo = 0;
  let hi = l0;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (contrastRatio(toHex(hslToRgb([h, s, mid])), bg) >= minRatio) lo = mid;
    else hi = mid;
  }
  return toHex(hslToRgb([h, s, lo]));
}
```

- [x] **Step 4: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/skins exec vitest run test/color.test.ts`
Expected: 3 passed.

- [x] **Step 5: Commit**

```bash
git add packages/skins/src/color.ts packages/skins/test/color.test.ts
git commit -m "feat(skins): WCAG contrast and hue-preserving darken-to-contrast" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: JSON Schemas and the ajv validator

**Files:**
- Create: `packages/skins/src/schema.ts`, `packages/skins/src/validate.ts`
- Test: `packages/skins/test/schema-unit.test.ts`

**Interfaces:**
- Consumes: the const lists in `types.ts` (Task 2).
- Produces: `obj(req, opt?)`, `partialOf(schema)`, `skinSchema`, `skinSourceSchema`, `themeSchema`, `presetSchema`, `provenanceSchema`, `hex` (in `schema.ts`); `validate(kind: 'skin' | 'skinSource' | 'theme' | 'preset', doc): { ok: boolean; errors: string[] }` (in `validate.ts`; unknown keys are reported as `/<path> must NOT have additional properties (<key>)`).

Notes: ajv runs in `strict` mode with `strictTypes: false` (the `if/then/else` colour rule has no `type`) and `strictRequired: false` (the `then` branch lists `required` keys defined in the outer object). Hex colours must be upper-case `#RRGGBB`. Skin ids must end in `-like`; the base (`iec-defaults`) is validated with the source schema, whose id pattern does not require `-like`.

- [x] **Step 1: Write the failing test**

Create `packages/skins/test/schema-unit.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { obj, partialOf, skinSchema } from '../src/schema.ts';
import { validate } from '../src/validate.ts';

describe('schema helpers', () => {
  it('obj() closes the object and requires every non-optional key', () => {
    expect(obj({ a: { type: 'number' } }, { b: { type: 'string' } })).toEqual({
      type: 'object', properties: { a: { type: 'number' }, b: { type: 'string' } }, required: ['a'], additionalProperties: false,
    });
  });
  it('partialOf() strips every required list, recursively', () => {
    expect(JSON.stringify(partialOf(skinSchema))).not.toContain('"required"');
    expect(JSON.stringify(skinSchema)).toContain('"required"');
  });
});

describe('validate', () => {
  it('reports missing identity fields on an empty skin source', () => {
    const r = validate('skinSource', {});
    expect(r.ok).toBe(false);
    expect(r.errors.join('\n')).toContain("must have required property 'schema'");
  });
  it('refuses unknown top-level keys in a skin source', () => {
    const r = validate('skinSource', { schema: 'pme-skin/1', kind: 'skin', id: 'x-like', label: 'x', provenance: {}, logo: 'saadat.png' });
    expect(r.errors.join('\n')).toContain('(logo)');
  });
  it('refuses a provenance entry with an unknown tag', () => {
    const r = validate('skinSource', { schema: 'pme-skin/1', kind: 'skin', id: 'x-like', label: 'x', provenance: { background: { tag: 'guess', source: 'ENG' } } });
    expect(r.ok).toBe(false);
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/skins exec vitest run test/schema-unit.test.ts`
Expected: FAIL (module not found).

- [x] **Step 3: Implement the schema**

Create `packages/skins/src/schema.ts`:

```ts
// JSON Schemas (draft-07, validated with ajv) for skins, themes and presets (brief §3.8). Built from small helpers
// so the schema and src/types.ts read side by side. Every object is closed (additionalProperties: false) and every
// property is required unless listed in `opt`: a shipped skin can neither miss a field nor carry an unknown one.
import { COLOR_KEYS, HEADER_ITEMS, LAMP_STYLES, LANE_IDS, PAGE_KINDS, PITCH_MAPS, REQUIRED_COLOR_KEYS, SOUND_PROFILES, TILE_PARAMS } from './types.ts';

export type JsonSchema = Record<string, unknown>;

/** Closed object: every key of `req` is required, keys of `opt` are optional. */
export const obj = (req: Record<string, JsonSchema>, opt: Record<string, JsonSchema> = {}): JsonSchema => ({
  type: 'object',
  properties: { ...req, ...opt },
  required: Object.keys(req),
  additionalProperties: false,
});
const str: JsonSchema = { type: 'string', minLength: 1 };
const bool: JsonSchema = { type: 'boolean' };
const num = (minimum?: number, maximum?: number): JsonSchema => ({ type: 'number', ...(minimum !== undefined ? { minimum } : {}), ...(maximum !== undefined ? { maximum } : {}) });
const int = (minimum: number, maximum: number): JsonSchema => ({ type: 'integer', minimum, maximum });
const en = (values: readonly (string | number)[]): JsonSchema => ({ enum: [...values] });
const arr = (items: JsonSchema, minItems = 0): JsonSchema => ({ type: 'array', items, minItems });
const nullable = (s: JsonSchema): JsonSchema => ({ anyOf: [s, { type: 'null' }] });
const pair: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 };
const triple: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 };
export const hex: JsonSchema = { type: 'string', pattern: '^#[0-9A-F]{6}$' };
const record = (value: JsonSchema, keyPattern = '^[A-Za-z0-9_]+$'): JsonSchema => ({
  type: 'object',
  patternProperties: { [keyPattern]: value },
  additionalProperties: false,
});
const barColors = obj({ bg: hex, fg: hex });
const sweepChannel = obj({ options: arr(num(0.5, 100), 1), default: num(0.5, 100) });
const limitValue = { anyOf: [pair, { type: 'number' }, { type: 'null' }] };

export const provenanceSchema: JsonSchema = record(
  obj(
    { tag: en(['documented', 'measured', 'assumed', 'unverified', 'conflict', 'inferred', 'eng']), source: { type: 'string', minLength: 3 } },
    { note: str },
  ),
  '^[A-Za-z0-9_]+(\\.[A-Za-z0-9_]+)*$',
);

const chrome = obj({
  divider: hex,
  windowFrame: hex,
  focusFill: hex,
  softkeyFrame: hex,
  pageBox: barColors,
  patientCategoryColor: hex,
  grid: nullable(obj({ minorMm: num(0.5, 10), majorMm: num(1, 50), minor: hex, major: hex })),
});

const colors: JsonSchema = {
  type: 'object',
  properties: Object.fromEntries(COLOR_KEYS.map((k) => [k, hex])),
  required: [...REQUIRED_COLOR_KEYS],
  additionalProperties: false,
};

const tile = obj({ param: en(TILE_PARAMS) }, { size: en(['large', 'normal']), extras: arr({ type: 'string', pattern: '^[A-Za-z0-9%]+$' }) });
const page = obj(
  { id: { type: 'string', pattern: '^P[0-9]{1,2}$' }, kind: en(PAGE_KINDS), label: str },
  {
    lanes: arr(en(LANE_IDS), 1),
    ecgTraces: int(1, 12),
    bigNumbers: arr(en(TILE_PARAMS), 1),
    pump: obj({ watermark: str, ibpAutoScale: bool, hideScaleNumbers: bool, asystoleMessagePersistsThroughSilence: bool }),
  },
);

const lamp = en(LAMP_STYLES);
const alarms = obj(
  {
    levels: { const: 3 },
    levelNames: { type: 'array', items: str, minItems: 3, maxItems: 3 },
    soundProfile: en(SOUND_PROFILES),
    volume: obj({ min: int(0, 10), max: int(1, 10), default: int(0, 10) }),
    lamp: obj({ L1: lamp, L2: lamp, L3: lamp, flashHz: obj({ L1: num(0.1, 5), L2: num(0.1, 5) }), duty: num(0.2, 0.6) }),
    messageBar: obj({ L1: barColors, L2: barColors, L3: barColors, idle: barColors, acknowledged: barColors, prefix: en(['asterisks', 'none']), rotate: bool }),
    numericFlash: bool,
    factoryEnabled: bool,
    alwaysOn: arr(str),
    alarmOffIcon: en(['crossed-bell-red', 'bell-off']),
    silence: obj({ durationS: num(10, 600), suppressesVisual: bool, cancelOnNewAlarm: bool, headerCountdown: bool, technicalActsAsAck: bool }),
    pause: nullable(obj({ durationS: num(10, 900) })),
    latching: bool,
    delayS: num(0, 30),
    spo2DelayS: nullable(num(0, 60)),
    alarmFreezeOption: bool,
    recall: nullable(obj({ count: int(1, 1000), windowS: pair })),
  },
  { repeatS: obj({}, { L1: nullable(num(1, 60)), L2: nullable(num(1, 60)), L3: nullable(num(1, 60)) }), lowPulses: en([1, 2]) },
);

const limitBand = nullable(obj({ values: record(limitValue) }, { inherit: en(['adult', 'paed', 'neo']) }));

export const skinSchema: JsonSchema = {
  ...obj({
    schema: { const: 'pme-skin/1' },
    kind: { const: 'skin' },
    id: { type: 'string', pattern: '^[a-z0-9]+(-[a-z0-9]+)*-like$' },
    label: str,
    scheme: en(['dark', 'projector-light', 'ecg-grid']),
    background: hex,
    foreground: hex,
    chrome,
    font: obj({ stack: str, numericWeight: int(100, 900), labelCase: en(['upper', 'as-is']) }),
    colors,
    colorBinding: en(['byLabel', 'byChannel']),
    ecgColorLocked: bool,
    layout: obj({
      waveAreaFraction: num(0.3, 0.85),
      lanes: arr(en(LANE_IDS), 1),
      tiles: arr(arr(tile, 1), 1),
      menuRegion: en(['popup', 'wave-area-bottom']),
      header: arr(en(HEADER_ITEMS), 1),
      messageBars: en(['single-under-header', 'split-technical-physiological']),
    }),
    pages: arr(page, 1),
    defaultPage: { type: 'string', pattern: '^P[0-9]{1,2}$' },
    calendar: obj({
      default: en(['gregorian', 'solar']),
      options: arr(en(['gregorian', 'solar']), 1),
      gregorianFormat: en(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']),
    }),
    language: str,
    sweep: obj({
      ecg: sweepChannel, pleth: sweepChannel, ibp: sweepChannel, resp: sweepChannel, co2: sweepChannel,
      style: { const: 'erase-bar' }, gapPx: num(2, 24), cursorLine: bool, lineWidthPx: num(1, 3),
    }),
    ecg: obj({
      gainOptions: arr({ anyOf: [num(0.1, 8), { const: 'AUTO' }] }, 1),
      gainDefault: { anyOf: [num(0.1, 8), { const: 'AUTO' }] },
      gainLabel: en(['multiplier', 'mm-per-mV', 'cm-per-mV']),
      filters: record(pair, '^[A-Z][A-Za-z. ]*$'),
      filterDefault: str,
      filterLabel: en(['letter', 'name']),
      laneLeads: arr(en(['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']), 1),
      cableDefault: en(['3-wire', '5-wire', '10-wire']),
      calPulse: obj({ mV: num(0.1, 2), ms: num(50, 1000), defaultOn: bool }),
      paceDetectDefault: bool,
      paceMarker: obj({ style: en(['vertical-line', 'marker-above']), heightMm: num(1, 20) }),
      laneLabel: str,
    }),
    hr: obj({
      method: en(['trimmed-mean-12rr', 'mean-12rr', 'moving-average-seconds']),
      windowOptions: arr(num(1, 60)),
      windowDefault: nullable(num(1, 60)),
      updateHz: num(0.1, 10),
      source: str,
      autoPriority: arr(str),
      relabelNonEcgAs: nullable(str),
    }),
    spo2: obj({
      avgOptions: arr({ anyOf: [num(1, 30), str] }, 1),
      avgDefault: num(1, 30),
      sensitivity: arr(str, 1),
      sensitivityDefault: str,
      plethNormalized: bool,
      updateHz: num(0.1, 10),
    }),
    nibp: obj({
      modeDefault: en(['MANUAL', 'AUTO']),
      autoIntervalMin: nullable(num(1, 1440)),
      autoIntervalsMin: arr(num(1, 1440), 1),
      stat: obj({ count: int(1, 20), spacingS: num(0, 120), windowS: num(60, 900) }),
      initialInflation: obj({ adult: num(50, 300), paed: num(50, 300), neo: num(40, 200) }),
      nextInflation: en(['prevSys+30', 'prevSys+10']),
      doneTone: bool,
    }),
    ibp: obj({
      filterOptionsHz: arr(num(1, 100), 1),
      filterDefaultHz: num(1, 100),
      gridDefault: bool,
      scaleLines: en(['dotted-upper-mid-lower', 'none']),
      meanOnlyLabels: arr(str),
      scales: record(triple),
    }),
    co2: obj({ unit: en(['mmHg', 'kPa', '%']), scale: num(1, 100), scaleUnit: en(['mmHg', '%']) }),
    alarms,
    limits: obj({ adult: limitBand, paed: limitBand, neo: limitBand }),
    arrhythmia: obj({
      defaultOn: bool,
      asystoleS: obj({ adult: num(1, 20), neo: num(1, 20) }),
      asystoleAltS: nullable(num(1, 20)),
      pause: { anyOf: [obj({ adultS: num(0.5, 10), neoS: num(0.5, 10) }), obj({ ratio: num(1, 5) })] },
      vtac: obj({ rate: num(60, 250), count: int(3, 20) }),
      tachy: nullable(num(60, 300)),
      brady: nullable(num(20, 120)),
      freqPvcPerMin: num(1, 60),
    }),
    st: obj({ defaultOn: bool, isoMs: num(-200, 0), stMs: num(0, 400), updateS: num(1, 60) }),
    beep: obj({
      source: en(['ECG', 'PLETH', 'HR_SOURCE']),
      defaultOn: bool,
      volume: obj({ min: int(0, 10), max: int(1, 10), default: int(0, 10) }),
      pitchMap: en(PITCH_MAPS),
      baseHz: num(150, 2000),
    }),
    syncMarker: nullable(en(['line', 'triangle-mid-qrs', 'r-above'])),
    defib: nullable(
      obj({
        energyAdultJ: num(1, 360),
        energyPaedJ: num(1, 360),
        aedSequenceJ: nullable(arr(num(1, 360), 1)),
        chargeTimeS: nullable(record(num(0.5, 20))),
        readyTimeoutS: num(5, 120),
        toneSet: en(['zoll-like', 'lifepak-like']),
      }),
    ),
    pacer: nullable(
      obj({
        rateDefault: num(30, 180),
        rateRange: pair,
        mADefault: num(0, 200),
        mARange: pair,
        mAStep: obj({ up: num(1, 20), down: num(1, 20) }),
        modeDefault: en(['demand', 'fixed']),
        pausePct: nullable(num(1, 100)),
      }),
    ),
    trend: obj({ style: en(['line', 'filled-area']), hours: num(1, 168) }),
    glyphs: obj({ noValue: str, hrUnavailable: str, nibpFail: str, outOfRange: str, ibpPrUnavailable: str }),
    provenance: provenanceSchema,
  }),
  allOf: [
    {
      if: { properties: { colorBinding: { const: 'byChannel' } } },
      then: { properties: { colors: { required: ['IBP1', 'IBP2', 'IBP3', 'IBP4'] } } },
      else: { properties: { colors: { required: ['ART', 'CVP', 'PAP'] } } },
    },
  ],
};

/** The same schema with every `required` removed (recursively): a skin source file that `extends` a base. */
export function partialOf(schema: JsonSchema): JsonSchema {
  if (Array.isArray(schema)) return schema.map((s) => partialOf(s as JsonSchema)) as unknown as JsonSchema;
  if (schema === null || typeof schema !== 'object') return schema;
  const out: JsonSchema = {};
  for (const [k, v] of Object.entries(schema)) {
    if (k === 'required' || k === 'allOf') continue;
    out[k] = v !== null && typeof v === 'object' ? partialOf(v as JsonSchema) : v;
  }
  return out;
}

/** Skin source files: identity fields required, the rest optional when `extends` names a base. */
export const skinSourceSchema: JsonSchema = {
  ...partialOf(skinSchema),
  properties: {
    ...(partialOf(skinSchema).properties as JsonSchema),
    id: { type: 'string', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' }, // bases ('iec-defaults') are not '-like'
    extends: { type: 'string', pattern: '^[a-z0-9-]+$' },
  },
  required: ['schema', 'kind', 'id', 'label', 'provenance'],
};

export const themeSchema: JsonSchema = obj({
  schema: { const: 'pme-theme/1' },
  kind: { const: 'theme' },
  id: { type: 'string', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' },
  label: str,
  scheme: en(['projector-light', 'ecg-grid']),
  background: hex,
  foreground: hex,
  chrome: partialOf(chrome),
  colorTransform: obj({ kind: { const: 'darken-to-contrast' }, minRatio: num(3, 21) }),
  messageBarIdle: barColors,
  provenance: provenanceSchema,
});

export const presetSchema: JsonSchema = obj(
  {
    schema: { const: 'pme-preset/1' },
    kind: { const: 'preset' },
    id: { type: 'string', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' },
    label: str,
    base: { type: 'string', pattern: '^[a-z0-9-]+-like$' },
    overrides: (() => {
      const p = partialOf(skinSchema);
      const props = { ...(p.properties as Record<string, JsonSchema>) };
      for (const k of ['schema', 'kind', 'id', 'label', 'provenance']) delete props[k];
      return { ...p, properties: props };
    })(),
    provenance: provenanceSchema,
  },
  {
    alarmSwitches: record(bool),
    startState: obj({}, { apneaLimit: { anyOf: [{ const: 'OFF' }, num(10, 60)] } }),
  },
);
```

- [x] **Step 4: Implement the validator**

Create `packages/skins/src/validate.ts`:

```ts
// Runtime validation with ajv (MIT, NOTICES). Kept out of src/index.ts so the renderer/IIFE bundle, which only
// resolves shipped skins, never pulls ajv in: import it as '@pme/skins/validate'.
import { Ajv, type ErrorObject, type ValidateFunction } from 'ajv';
import { presetSchema, skinSchema, skinSourceSchema, themeSchema } from './schema.ts';

const ajv = new Ajv({ allErrors: true, strict: true, strictTypes: false, strictRequired: false });
const compiled: Record<'skin' | 'skinSource' | 'theme' | 'preset', ValidateFunction> = {
  skin: ajv.compile(skinSchema),
  skinSource: ajv.compile(skinSourceSchema),
  theme: ajv.compile(themeSchema),
  preset: ajv.compile(presetSchema),
};

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const fmt = (e: ErrorObject): string =>
  `${e.instancePath || '/'} ${e.message ?? ''}${e.keyword === 'additionalProperties' ? ` (${String((e.params as { additionalProperty?: string }).additionalProperty)})` : ''}`;

export function validate(kind: keyof typeof compiled, doc: unknown): ValidationResult {
  const fn = compiled[kind];
  const ok = fn(doc) as boolean;
  return { ok, errors: ok ? [] : (fn.errors ?? []).map(fmt) };
}
```

- [x] **Step 5: Run the test and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/skins exec vitest run test/schema-unit.test.ts && npx -y pnpm@9.15.9 --filter @pme/skins typecheck`
Expected: 5 passed, no ajv strict-mode error, typecheck clean.

- [x] **Step 6: Commit**

```bash
git add packages/skins/src/schema.ts packages/skins/src/validate.ts packages/skins/test/schema-unit.test.ts
git commit -m "feat(skins): closed JSON Schemas for skins, themes and presets; ajv validator entry" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `saadat-like` skin, registry and `resolveSkin` (the renderer/audio contract)

**Files:**
- Create: `packages/skins/src/data/skins/saadat-like.json`, `packages/skins/src/registry.ts`, `packages/skins/src/resolve.ts`
- Modify: `packages/skins/src/index.ts` (replace)
- Test: `packages/skins/test/schema.test.ts`, `packages/skins/test/provenance.test.ts`, `packages/skins/test/contrast.test.ts`, `packages/skins/test/resolve.test.ts` (+ its snapshot file)

**Interfaces:**
- Consumes: Tasks 2–4.
- Produces: `SKINS`, `BASES`, `THEMES`, `PRESETS`, `SKIN_IDS`, `PRESET_IDS`, `THEME_IDS`, `type SkinSource` (registry); `resolveSkin(id: string, opts?: { theme?: string }): ResolvedSkin`; `mergeSkinSource(id): Skin`; `engineFilterFor(band): { engineMode: 'monitor' | 'diagnostic'; exact: boolean }`; `laneColor(skin, lane)`; `formatLaneLabel(skin, lane, ecgIndex)`; `ENGINE_FILTER_BANDS`; `BASE_GAIN_MM_PER_MV = 10`; types `ResolvedSkin { id, skinId, presetId, themeId, skin, provenance, limits, approximateLimits, preset, render: RenderContract, audio: AudioContract }`, `RenderContract { background, foreground, grid, lineWidth, eraseGapPx, cursorLine, fontStack, numericWeight, lanes: LaneRender[], tileColors, ecgFilter, hrMethod }`, `LaneRender { lane, color, mmPerS, gainMmPerMv, autoGain, label }`, `AudioContract { beep: { enabled, source, baseHz, pitchMap, volume }, alarm: { profile, repeatS, lowPulses, volume, silence } }`.

The skin is research 06 §5's draft mapped onto the schema, with research 06's `[measured]/[assumed]/[unverified]/[conflict]/[inferred]` tags carried into `provenance`. The `resolve.ts` written here already contains the preset and theme code paths (exercised from Tasks 9–10); the registry starts with `saadat-like` only.

- [x] **Step 1: Write the failing tests** (they iterate the registry, so later skins are covered automatically)

Create `packages/skins/test/schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BASES, PRESET_IDS, resolveSkin, SKIN_IDS, SKINS } from '../src/index.ts';
import { validate } from '../src/validate.ts';

const ALL = [...SKIN_IDS, ...PRESET_IDS];

describe('shipped skins against the schema', () => {
  it.each(SKIN_IDS)('%s: the source file validates (no unknown fields)', (id) => {
    expect(validate('skinSource', SKINS[id]).errors).toEqual([]);
  });

  it.each(Object.keys(BASES).length ? Object.keys(BASES) : ['(none)'])('base %s validates as a source file', (id) => {
    if (id === '(none)') return;
    expect(validate('skinSource', BASES[id]).errors).toEqual([]);
  });

  it.each(ALL)('%s: the resolved skin is complete (every required field present)', (id) => {
    expect(validate('skin', resolveSkin(id).skin).errors).toEqual([]);
  });

  it('rejects an unknown field anywhere', () => {
    const s = structuredClone(resolveSkin('saadat-like').skin) as unknown as { alarms: Record<string, unknown> };
    s.alarms.volumeCurve = 'log';
    const r = validate('skin', s);
    expect(r.ok).toBe(false);
    expect(r.errors.join('\n')).toContain('(volumeCurve)');
  });

  it('rejects a missing required field', () => {
    const s = structuredClone(resolveSkin('saadat-like').skin) as unknown as { sweep: Record<string, unknown> };
    delete s.sweep.gapPx;
    expect(validate('skin', s).errors.join('\n')).toContain("must have required property 'gapPx'");
  });

  it('rejects a lower-case or short hex colour', () => {
    const s = structuredClone(resolveSkin('saadat-like').skin);
    s.colors.ECG = '#0f0';
    expect(validate('skin', s).ok).toBe(false);
  });

  it('byChannel skins must colour IBP1-4', () => {
    const sa = structuredClone(resolveSkin('saadat-like').skin);
    delete sa.colors.IBP4;
    expect(validate('skin', sa).ok).toBe(false);
  });

  it.each(ALL)('%s: defaults are members of their option lists', (id) => {
    const { skin } = resolveSkin(id);
    expect(Object.keys(skin.ecg.filters)).toContain(skin.ecg.filterDefault);
    expect(skin.pages.map((p) => p.id)).toContain(skin.defaultPage);
    expect(skin.sweep.ecg.options).toContain(skin.sweep.ecg.default);
    expect(skin.ecg.gainOptions).toContain(skin.ecg.gainDefault);
    expect(skin.alarms.volume.default).toBeGreaterThanOrEqual(skin.alarms.volume.min);
    expect(skin.alarms.volume.default).toBeLessThanOrEqual(skin.alarms.volume.max);
  });
});
```

Create `packages/skins/test/provenance.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BASES, PRESET_IDS, PRESETS, provenanceGaps, resolveSkin, SKIN_IDS, SKINS, THEMES, type Provenance } from '../src/index.ts';

/** A source must cite a report section, a ruling or a brief section; only tag 'eng' may say ENG alone. */
const SOURCE_RE = /(research\/0[0-6] (§\d|R\d)|brief §\d)/;

describe('provenance', () => {
  it.each([...SKIN_IDS, ...PRESET_IDS])('%s: every resolved leaf has a covering entry and no entry dangles', (id) => {
    const r = resolveSkin(id);
    expect(provenanceGaps(r.skin as unknown as Record<string, unknown>, r.provenance)).toEqual({ uncovered: [], dangling: [] });
  });

  it.each(SKIN_IDS)('%s: every field the file itself sets is sourced by the file itself', (id) => {
    const src = SKINS[id] as unknown as Record<string, unknown> & { provenance: Provenance };
    expect(provenanceGaps(src, src.provenance)).toEqual({ uncovered: [], dangling: [] });
  });

  it('every source cites a report or brief section', () => {
    const docs = [...Object.values(SKINS), ...Object.values(BASES), ...Object.values(THEMES), ...Object.values(PRESETS)];
    const bad: string[] = [];
    for (const d of docs) {
      for (const [k, e] of Object.entries(d.provenance)) {
        const ok = e.tag === 'eng' ? e.source.startsWith('ENG') || SOURCE_RE.test(e.source) : SOURCE_RE.test(e.source);
        if (!ok) bad.push(`${d.id} ${k}: ${e.source}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('carries research 06 tags into saadat-like', () => {
    const p = resolveSkin('saadat-like').provenance;
    expect(p['colors.IBP3']?.tag).toBe('conflict');
    expect(p['colors.IBP4']?.tag).toBe('conflict');
    expect(p['alarms.lamp.flashHz']?.tag).toBe('assumed');
    expect(p['sweep.gapPx']?.tag).toBe('inferred');
    expect(p['colors.AGENTS']?.tag).toBe('unverified');
    expect(p['arrhythmia.asystoleS']?.tag).toBe('conflict');
    expect(p['beep.pitchMap']?.tag).toBe('unverified');
    expect(p['limits.neo.inherit']?.tag).toBe('unverified');
  });
});
```

Create `packages/skins/test/contrast.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { contrastRatio, resolveSkin, SKIN_IDS, PRESET_IDS, THEME_IDS } from '../src/index.ts';

const combos = [undefined, ...THEME_IDS].flatMap((theme) => [...SKIN_IDS, ...PRESET_IDS].map((id) => [id, theme ?? '(none)'] as const));

describe('colour contrast (WCAG ratio) of every skin × theme', () => {
  it.each(combos)('%s (theme %s): every parameter colour is ≥ 3:1 on the background', (id, theme) => {
    const { skin } = resolveSkin(id, theme === '(none)' ? {} : { theme });
    const low = Object.entries(skin.colors)
      .map(([k, c]) => [k, +contrastRatio(c as string, skin.background).toFixed(2)] as const)
      .filter(([, r]) => r < 3);
    expect(low).toEqual([]);
  });

  it.each(combos)('%s (theme %s): labels ≥ 4.5:1; alarm-bar text ≥ 3:1 on its bar', (id, theme) => {
    const { skin } = resolveSkin(id, theme === '(none)' ? {} : { theme });
    expect(contrastRatio(skin.foreground, skin.background)).toBeGreaterThanOrEqual(4.5);
    const mb = skin.alarms.messageBar;
    for (const bar of [mb.L1, mb.L2, mb.L3, mb.idle, mb.acknowledged]) expect(contrastRatio(bar.fg, bar.bg)).toBeGreaterThanOrEqual(3);
  });
});
```

Create `packages/skins/test/resolve.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { FILTER_BANDS } from '../../engine-core/src/l3/ecg-filter.ts';
import { ENGINE_FILTER_BANDS, engineFilterFor, PRESET_IDS, resolveSkin, SKIN_IDS, THEME_IDS } from '../src/index.ts';

describe('resolveSkin: saadat-like and the renderer/audio contract', () => {
  it('ENGINE_FILTER_BANDS equals engine-core FILTER_BANDS', () => {
    expect(ENGINE_FILTER_BANDS).toEqual(FILTER_BANDS);
  });

  it('maps filter bands to engine modes, exact only when equal', () => {
    expect(engineFilterFor([0.5, 40])).toEqual({ engineMode: 'monitor', exact: true });
    expect(engineFilterFor([0.05, 150])).toEqual({ engineMode: 'diagnostic', exact: true });
    expect(engineFilterFor([0.5, 24])).toEqual({ engineMode: 'monitor', exact: false });
    expect(engineFilterFor([0.05, 100])).toEqual({ engineMode: 'diagnostic', exact: false });
  });

  it('saadat-like: lanes, gap, filter, HR method, audio', () => {
    const r = resolveSkin('saadat-like');
    expect(r.render.background).toBe('#000000');
    expect(r.render.eraseGapPx).toBe(4);
    expect(r.render.lanes.map((l) => [l.lane, l.color, l.mmPerS])).toEqual([
      ['ECG1', '#00F000', 25], ['PLETH', '#F000F0', 25], ['IBP1', '#E08080', 12.5], ['IBP2', '#B0D0E8', 12.5], ['RESP', '#F0F030', 6],
    ]);
    expect(r.render.lanes[0]).toMatchObject({ gainMmPerMv: 10, autoGain: true, label: 'II  X1  NORMAL' });
    expect(r.render.ecgFilter).toEqual({ name: 'NORMAL', band: [0.5, 40], engineMode: 'monitor', exact: true });
    expect(r.render.hrMethod).toEqual({ skin: 'moving-average-seconds', engine: null });
    expect(r.render.tileColors).toMatchObject({ HR: '#00F000', SpO2: '#F000F0', NIBP: '#F0F0F0', TEMP: '#00F0F0', RR: '#F0F030' });
    expect(r.audio.alarm).toMatchObject({ profile: 'saadat', volume: { min: 1, max: 7, default: 1 }, silence: { durationS: 120, cancelOnNewAlarm: true } });
    expect(r.audio.beep).toMatchObject({ enabled: true, pitchMap: 'none', source: 'HR_SOURCE' });
  });

  it('saadat-like: paed/neo inherit adult HR/SpO2/RR and mark them approximate', () => {
    const r = resolveSkin('saadat-like');
    expect(r.limits.neo?.HR).toEqual([50, 150]);
    expect(r.limits.neo?.NIBP_S).toEqual([40, 90]);
    expect(r.approximateLimits.neo).toContain('HR');
    expect(r.approximateLimits.neo).not.toContain('NIBP_S');
    expect(r.approximateLimits.adult).toEqual([]);
  });

  it('resolving twice gives equal results and never mutates the registry', () => {
    expect(resolveSkin('saadat-like')).toEqual(resolveSkin('saadat-like'));
    resolveSkin('saadat-like').skin.colors.ECG = '#123456';
    expect(resolveSkin('saadat-like').skin.colors.ECG).toBe('#00F000');
  });

  it('unknown ids throw', () => {
    expect(() => resolveSkin('nope-like')).toThrow(/unknown skin/);
    expect(() => resolveSkin('saadat-like', { theme: 'nope' })).toThrow(/unknown theme/);
  });

  it.each([...SKIN_IDS, ...PRESET_IDS].flatMap((id) => ['(none)', ...THEME_IDS].map((t) => [id, t] as const)))('snapshot %s (theme %s)', (id, theme) => {
    const r = resolveSkin(id, theme === '(none)' ? {} : { theme });
    expect({ render: r.render, audio: r.audio, limits: r.limits, approximateLimits: r.approximateLimits }).toMatchSnapshot();
  });
});
```

- [x] **Step 2: Run them to see them fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/skins exec vitest run test/schema.test.ts test/resolve.test.ts`
Expected: FAIL, `resolveSkin` / `SKIN_IDS` not exported from `../src/index.ts`.

- [x] **Step 3: Write the skin**

Create `packages/skins/src/data/skins/saadat-like.json`:

```json
{
  "schema": "pme-skin/1",
  "kind": "skin",
  "id": "saadat-like",
  "label": "Saadat-like (Iranian bedside, B9 family)",
  "scheme": "dark",
  "background": "#000000",
  "foreground": "#F0F0F0",
  "chrome": {
    "divider": "#C8C8C8",
    "windowFrame": "#00F000",
    "focusFill": "#D87090",
    "softkeyFrame": "#F0F000",
    "pageBox": { "bg": "#FFFFFF", "fg": "#000000" },
    "patientCategoryColor": "#F0F000",
    "grid": null
  },
  "font": { "stack": "Arial, 'Liberation Sans', Helvetica, sans-serif", "numericWeight": 400, "labelCase": "upper" },
  "colors": {
    "ECG": "#00F000", "HR": "#00F000", "ST": "#00F000", "PVC": "#00F000",
    "SpO2": "#F000F0", "PLETH": "#F000F0", "PR": "#F000F0", "PI": "#F000F0",
    "NIBP": "#F0F0F0",
    "IBP1": "#E08080", "IBP2": "#B0D0E8", "IBP3": "#E07000", "IBP4": "#008C8C",
    "RESP": "#F0F030", "CO2": "#F0F030", "AWRR": "#F0F030",
    "TEMP": "#00F0F0",
    "BFA": "#F0F0F0",
    "AGENTS": "#F0F030"
  },
  "colorBinding": "byChannel",
  "ecgColorLocked": true,
  "layout": {
    "waveAreaFraction": 0.41,
    "lanes": ["ECG1", "PLETH", "IBP1", "IBP2", "RESP"],
    "tiles": [
      [
        { "param": "HR", "size": "large", "extras": ["PACE", "ST", "PVCs"] },
        { "param": "NIBP", "extras": ["MEAN", "PR"] },
        { "param": "IBP1", "extras": ["MEAN", "PPV"] },
        { "param": "IBP2", "extras": ["MEAN"] }
      ],
      [
        { "param": "SpO2", "extras": ["PI", "PR"] },
        { "param": "TEMP", "extras": ["T2", "DT"] },
        { "param": "RR" }
      ]
    ],
    "menuRegion": "wave-area-bottom",
    "header": ["page", "bed", "category", "alarmState", "silenceCountdown", "battery", "recorder", "network", "datetime"],
    "messageBars": "single-under-header"
  },
  "pages": [
    { "id": "P1", "kind": "standard", "label": "P1" },
    { "id": "P2", "kind": "multiEcg", "label": "P2", "ecgTraces": 2 },
    { "id": "P3", "kind": "multiEcg", "label": "P3", "ecgTraces": 4 },
    { "id": "P4", "kind": "multiEcg", "label": "P4", "ecgTraces": 7 },
    { "id": "P5", "kind": "multiEcg", "label": "P5", "ecgTraces": 12 },
    { "id": "P6", "kind": "dualSpo2", "label": "P6" },
    { "id": "P7", "kind": "ibp", "label": "P7", "lanes": ["ECG1", "IBP1", "IBP2", "IBP3", "IBP4", "PLETH"] },
    {
      "id": "P10", "kind": "pump", "label": "P10",
      "pump": { "watermark": "PUMP", "ibpAutoScale": true, "hideScaleNumbers": true, "asystoleMessagePersistsThroughSilence": true }
    }
  ],
  "defaultPage": "P1",
  "calendar": { "default": "gregorian", "options": ["gregorian", "solar"], "gregorianFormat": "DD/MM/YYYY" },
  "language": "en-only",
  "sweep": {
    "ecg": { "options": [12.5, 25, 50], "default": 25 },
    "pleth": { "options": [12.5, 25], "default": 25 },
    "ibp": { "options": [3, 6, 12.5, 25], "default": 12.5 },
    "resp": { "options": [3, 6, 12.5, 25], "default": 6 },
    "co2": { "options": [3, 6, 12.5, 25], "default": 12.5 },
    "style": "erase-bar",
    "gapPx": 4,
    "cursorLine": false,
    "lineWidthPx": 1.5
  },
  "ecg": {
    "gainOptions": [0.25, 0.5, 1, 2, 4, "AUTO"],
    "gainDefault": "AUTO",
    "gainLabel": "multiplier",
    "filters": { "MONITOR": [0.5, 24], "NORMAL": [0.5, 40], "EXTENDED": [0.05, 100] },
    "filterDefault": "NORMAL",
    "filterLabel": "name",
    "laneLeads": ["II"],
    "cableDefault": "3-wire",
    "calPulse": { "mV": 1, "ms": 500, "defaultOn": false },
    "paceDetectDefault": false,
    "paceMarker": { "style": "vertical-line", "heightMm": 10 },
    "laneLabel": "{lead}  X{gain}  {FILTER}"
  },
  "hr": {
    "method": "moving-average-seconds",
    "windowOptions": [4, 8, 16],
    "windowDefault": 8,
    "updateHz": 1,
    "source": "AUTO",
    "autoPriority": ["ECG", "IBP1", "IBP2", "IBP3", "IBP4", "SpO2"],
    "relabelNonEcgAs": "PR"
  },
  "spo2": {
    "avgOptions": ["2-4", "4-6", 8, 10, 12, 14, 16],
    "avgDefault": 8,
    "sensitivity": ["NORMAL", "MAX", "APOD"],
    "sensitivityDefault": "NORMAL",
    "plethNormalized": true,
    "updateHz": 1
  },
  "nibp": {
    "modeDefault": "MANUAL",
    "autoIntervalMin": null,
    "autoIntervalsMin": [1, 2, 3, 5, 10, 15, 20, 30, 45, 60, 90, 120, 240, 480, 720, 960, 1200, 1440],
    "stat": { "count": 10, "spacingS": 30, "windowS": 300 },
    "initialInflation": { "adult": 150, "paed": 140, "neo": 85 },
    "nextInflation": "prevSys+30",
    "doneTone": false
  },
  "ibp": {
    "filterOptionsHz": [8, 16, 22],
    "filterDefaultHz": 16,
    "gridDefault": false,
    "scaleLines": "dotted-upper-mid-lower",
    "meanOnlyLabels": ["CVP", "LAP", "RAP"],
    "scales": {
      "ART": [40, 120, 200], "IBP": [-20, 90, 200], "PAP": [-10, 35, 80], "CVP": [-10, 10, 30],
      "LAP": [-10, 15, 40], "RAP": [-10, 10, 30], "ICP": [-10, 15, 40]
    }
  },
  "co2": { "unit": "mmHg", "scale": 10, "scaleUnit": "%" },
  "alarms": {
    "levels": 3,
    "levelNames": ["1", "2", "3"],
    "soundProfile": "saadat",
    "volume": { "min": 1, "max": 7, "default": 1 },
    "lamp": { "L1": "red-flash", "L2": "yellow-flash", "L3": "yellow-steady", "flashHz": { "L1": 2.0, "L2": 0.6 }, "duty": 0.5 },
    "messageBar": {
      "L1": { "bg": "#F00000", "fg": "#000000" },
      "L2": { "bg": "#F0F000", "fg": "#000000" },
      "L3": { "bg": "#00D0D0", "fg": "#000000" },
      "idle": { "bg": "#E0E0E0", "fg": "#000000" },
      "acknowledged": { "bg": "#E0E0E0", "fg": "#000000" },
      "prefix": "none",
      "rotate": true
    },
    "numericFlash": true,
    "factoryEnabled": false,
    "alwaysOn": ["ASYSTOLE", "VFIB", "VTAC", "APNEA"],
    "alarmOffIcon": "crossed-bell-red",
    "silence": { "durationS": 120, "suppressesVisual": true, "cancelOnNewAlarm": true, "headerCountdown": true, "technicalActsAsAck": true },
    "pause": null,
    "latching": false,
    "delayS": 1,
    "spo2DelayS": null,
    "alarmFreezeOption": true,
    "recall": { "count": 20, "windowS": [-5, 5] }
  },
  "limits": {
    "adult": {
      "values": {
        "HR": [50, 150], "SpO2": [90, 100],
        "NIBP_S": [90, 160], "NIBP_D": [50, 90], "NIBP_M": [60, 110],
        "ART_S": [80, 150], "ART_D": [50, 100], "ART_M": [60, 115],
        "PAP_S": [5, 40], "PAP_D": [-5, 20], "PAP_M": [0, 30],
        "CVP_M": [-5, 15], "RAP_M": [-5, 15], "LAP_M": [-5, 20], "ICP": [0, 10],
        "RR": [5, 25], "apneaS": 10, "AWRR": [5, 30], "gasApneaS": 20,
        "EtCO2_pctV": [2.6, 6.5], "FiCO2_pctV_high": 1.3,
        "T1": [35, 39], "T2": [36, 40], "dT": [1, 5], "ST_mV": [-0.2, 0.2]
      }
    },
    "paed": { "inherit": "adult", "values": { "NIBP_S": [70, 120], "NIBP_D": [40, 70], "NIBP_M": [50, 90], "ICP": [0, 4], "AWRR": [5, 30] } },
    "neo": { "inherit": "adult", "values": { "NIBP_S": [40, 90], "NIBP_D": [20, 60], "NIBP_M": [25, 70], "ICP": [0, 4], "AWRR": [15, 60] } }
  },
  "arrhythmia": {
    "defaultOn": false,
    "asystoleS": { "adult": 10, "neo": 10 },
    "asystoleAltS": 5,
    "pause": { "ratio": 2.1 },
    "vtac": { "rate": 120, "count": 5 },
    "tachy": 120,
    "brady": 50,
    "freqPvcPerMin": 10
  },
  "st": { "defaultOn": false, "isoMs": -80, "stMs": 110, "updateS": 5 },
  "beep": { "source": "HR_SOURCE", "defaultOn": true, "volume": { "min": 1, "max": 7, "default": 1 }, "pitchMap": "none", "baseHz": 880 },
  "syncMarker": null,
  "defib": null,
  "pacer": null,
  "trend": { "style": "filled-area", "hours": 96 },
  "glyphs": { "noValue": "---", "hrUnavailable": "-?-", "nibpFail": "?", "outOfRange": "--", "ibpPrUnavailable": "---" },
  "provenance": {
    "scheme": { "tag": "measured", "source": "research/06 §3.2 (F1, F4, F5)" },
    "background": { "tag": "measured", "source": "research/06 §3.2; brief §6.8" },
    "foreground": { "tag": "assumed", "source": "research/06 §3.1 F1", "note": "white lane labels; hex not published" },
    "chrome.divider": { "tag": "measured", "source": "research/06 §5; brief §6.8" },
    "chrome.windowFrame": { "tag": "assumed", "source": "research/06 §3.1 F4-F5", "note": "colour name documented, hex = ECG green" },
    "chrome.focusFill": { "tag": "measured", "source": "research/06 §3.1 F4" },
    "chrome.softkeyFrame": { "tag": "assumed", "source": "research/06 §3.1 F5", "note": "yellow outline documented, hex assumed" },
    "chrome.pageBox": { "tag": "documented", "source": "research/06 §3.1 F1" },
    "chrome.patientCategoryColor": { "tag": "documented", "source": "research/06 §3.1 F1; brief §6.8" },
    "chrome.grid": { "tag": "documented", "source": "research/06 §4.1", "note": "IBP grid OFF by default; no ECG grid seen" },
    "font": { "tag": "inferred", "source": "research/06 §3.1 F1; research/06 §3.2", "note": "Arial-like regular; the stack is [ENG]" },
    "colors.ECG": { "tag": "measured", "source": "research/06 §3.2 (M p.308); brief §6.8" },
    "colors.HR": { "tag": "measured", "source": "research/06 §3.2 (M p.308); brief §6.8" },
    "colors.ST": { "tag": "measured", "source": "research/06 §3.2; brief §6.8" },
    "colors.PVC": { "tag": "measured", "source": "research/06 §3.2; brief §6.8" },
    "colors.SpO2": { "tag": "measured", "source": "research/06 §3.2 (M p.309); brief §6.8" },
    "colors.PLETH": { "tag": "measured", "source": "research/06 §3.2 (M p.309); brief §6.8" },
    "colors.PR": { "tag": "measured", "source": "research/06 §3.2; brief §6.8" },
    "colors.PI": { "tag": "measured", "source": "research/06 §3.2; brief §6.8" },
    "colors.NIBP": { "tag": "measured", "source": "research/06 §3.2 (M p.309); brief §6.8" },
    "colors.IBP1": { "tag": "measured", "source": "research/06 §5; brief §6.8", "note": "manual 'LIGHT RED'; screenshot ≈#D08080, draft #E08080" },
    "colors.IBP2": { "tag": "measured", "source": "research/06 §5; brief §6.8", "note": "manual 'LIGHT BLUE'; screenshot ≈#B0D0E0" },
    "colors.IBP3": { "tag": "conflict", "source": "research/06 §3.2; brief §6.8", "note": "name 'DARK ORANGE'; B9 screenshot shows mid blue ≈#3080F0" },
    "colors.IBP4": { "tag": "conflict", "source": "research/06 §3.2; brief §6.8", "note": "name 'DARK CYAN'; screenshot shows white" },
    "colors.RESP": { "tag": "measured", "source": "research/06 §3.2 (M p.309); brief §6.8" },
    "colors.CO2": { "tag": "measured", "source": "research/06 §3.2 (M p.309); brief §6.8" },
    "colors.AWRR": { "tag": "measured", "source": "research/06 §3.2; brief §6.8" },
    "colors.TEMP": { "tag": "measured", "source": "research/06 §3.2 (M p.309); brief §6.8" },
    "colors.BFA": { "tag": "assumed", "source": "research/06 §5; brief §6.8", "note": "from the Alvand screenshot" },
    "colors.AGENTS": { "tag": "unverified", "source": "research/06 §3.2; brief §6.8", "note": "not in the manual" },
    "colorBinding": { "tag": "documented", "source": "research/06 §3.2 (M p.308); brief §3.8" },
    "ecgColorLocked": { "tag": "documented", "source": "research/06 §3.2 (M p.40, 308); brief §3.8" },
    "layout.waveAreaFraction": { "tag": "measured", "source": "research/06 §3.1 F1" },
    "layout.lanes": { "tag": "documented", "source": "research/06 §3.1 F1; research/06 §5" },
    "layout.tiles": { "tag": "documented", "source": "research/06 §3.1 F1; research/06 §3.2" },
    "layout.menuRegion": { "tag": "documented", "source": "research/06 §3.1 F4; brief §3.8" },
    "layout.header": { "tag": "documented", "source": "research/06 §3.1 F1; research/06 §3.2" },
    "layout.messageBars": { "tag": "documented", "source": "research/06 §3.1 F1-F2 (M p.36)" },
    "pages": { "tag": "documented", "source": "research/06 §3.2 (M p.43, 64); research/06 §3.1 F3; brief §6.9", "note": "P8/P9 contents not documented [unverified]; no big-number page on the B9" },
    "defaultPage": { "tag": "eng", "source": "ENG", "note": "factory page not stated" },
    "calendar": { "tag": "documented", "source": "research/06 §3.2 (M p.39, 308); brief §6.9" },
    "language": { "tag": "documented", "source": "research/06 §6; brief §6.9" },
    "sweep.ecg": { "tag": "documented", "source": "research/06 §3.2 (M p.302-306)" },
    "sweep.pleth": { "tag": "documented", "source": "research/06 §3.2 (M p.302-306)" },
    "sweep.ibp": { "tag": "documented", "source": "research/06 §3.2 (M p.302-306)" },
    "sweep.resp": { "tag": "documented", "source": "research/06 §3.2 (M p.302-306)" },
    "sweep.co2": { "tag": "documented", "source": "research/06 §3.2 (M p.302-306)" },
    "sweep.style": { "tag": "inferred", "source": "research/06 §3.1 F7 (S8)" },
    "sweep.gapPx": { "tag": "inferred", "source": "research/06 §3.1 F7 (S8); brief §3.5", "note": "very narrow gap; verify with checklist photo 2" },
    "sweep.cursorLine": { "tag": "inferred", "source": "research/06 §3.1 F7 (S8); brief §3.5" },
    "sweep.lineWidthPx": { "tag": "eng", "source": "brief §3.5 [ENG]" },
    "ecg.gainOptions": { "tag": "documented", "source": "research/06 §3.2 (M p.65, 264, 302)" },
    "ecg.gainDefault": { "tag": "documented", "source": "research/06 §3.2 (M p.302)" },
    "ecg.gainLabel": { "tag": "documented", "source": "research/06 §3.1 F1 ('X4')" },
    "ecg.filters": { "tag": "documented", "source": "research/06 §3.2 (M p.65, 264); brief §3.8" },
    "ecg.filterDefault": { "tag": "documented", "source": "research/06 §3.2; brief §6.8" },
    "ecg.filterLabel": { "tag": "documented", "source": "research/06 §3.1 F1 ('NORMAL')" },
    "ecg.laneLeads": { "tag": "documented", "source": "research/06 §3.2 (M p.63-64, 302)" },
    "ecg.cableDefault": { "tag": "documented", "source": "research/06 §3.2 (M p.302)" },
    "ecg.calPulse": { "tag": "documented", "source": "research/06 §3.2 (M p.264)" },
    "ecg.paceDetectDefault": { "tag": "documented", "source": "research/06 §4.2 (M p.67, 69); brief §6.5" },
    "ecg.paceMarker": { "tag": "documented", "source": "research/06 §4.2 (M p.69); brief §6.5" },
    "ecg.laneLabel": { "tag": "documented", "source": "research/06 §3.2 (M p.38); brief §3.8" },
    "hr": { "tag": "documented", "source": "research/06 §4.1 (M p.65-67); brief §3.8" },
    "spo2": { "tag": "documented", "source": "research/06 §4.1 (M p.108-113, 302)" },
    "nibp.modeDefault": { "tag": "documented", "source": "research/06 §4.1 (M p.128)" },
    "nibp.autoIntervalMin": { "tag": "documented", "source": "research/06 §4.1", "note": "MANUAL mode: no auto interval" },
    "nibp.autoIntervalsMin": { "tag": "documented", "source": "research/06 §4.1 (M p.131)" },
    "nibp.stat": { "tag": "documented", "source": "research/06 §4.1 (M p.131-133); brief §3.8" },
    "nibp.initialInflation": { "tag": "documented", "source": "research/06 §4.1 (M p.266)" },
    "nibp.nextInflation": { "tag": "documented", "source": "research/06 §4.1; brief §3.8" },
    "nibp.doneTone": { "tag": "unverified", "source": "research/06 §4.1", "note": "no NIBP-done tone described" },
    "ibp": { "tag": "documented", "source": "research/06 §3.2 (M p.304-305); research/06 §4.1 (M p.149-161)" },
    "co2.unit": { "tag": "documented", "source": "research/06 §4.1 (M p.270); research/00 R12" },
    "co2.scale": { "tag": "documented", "source": "research/06 §3.2 (M p.305)" },
    "co2.scaleUnit": { "tag": "documented", "source": "research/06 §3.2 (M p.305)" },
    "alarms.levels": { "tag": "documented", "source": "research/06 §4.2 (M p.21, 47); brief §6.4.1" },
    "alarms.levelNames": { "tag": "documented", "source": "research/06 §4.2; brief §6.4.1" },
    "alarms.soundProfile": { "tag": "documented", "source": "brief §6.4.1; research/06 §4.2 (M p.47)" },
    "alarms.volume": { "tag": "documented", "source": "research/06 §4.2 (M p.49, 308); brief §6.4.1" },
    "alarms.lamp.L1": { "tag": "documented", "source": "research/06 §4.2 (M p.47); brief §6.4.1" },
    "alarms.lamp.L2": { "tag": "documented", "source": "research/06 §4.2 (M p.47); brief §6.4.1" },
    "alarms.lamp.L3": { "tag": "documented", "source": "research/06 §4.2 (M p.47); brief §6.4.1" },
    "alarms.lamp.flashHz": { "tag": "assumed", "source": "research/06 §4.2; brief §6.4.1", "note": "not published; IEC-typical 2.0/0.6 Hz" },
    "alarms.lamp.duty": { "tag": "assumed", "source": "brief §6.4 (visual table)" },
    "alarms.messageBar": { "tag": "assumed", "source": "research/06 §5; brief §6.8", "note": "colours per M p.38, 47; hex from the report 06 draft" },
    "alarms.numericFlash": { "tag": "documented", "source": "research/06 §4.2 (M p.47-48)" },
    "alarms.factoryEnabled": { "tag": "documented", "source": "research/06 §4.2 (M p.48, 302-306); brief §6.4.1" },
    "alarms.alwaysOn": { "tag": "documented", "source": "research/06 §4.2 (M p.49, 76, 78, 98); brief §6.4.1" },
    "alarms.alarmOffIcon": { "tag": "documented", "source": "research/06 §3.2 (M p.48, 98)" },
    "alarms.silence": { "tag": "documented", "source": "research/06 §4.2 (M p.38-39, 44, 50); brief §6.4.1" },
    "alarms.pause": { "tag": "documented", "source": "brief §6.4.1; research/06 §4.2", "note": "Audio Pause key has no function" },
    "alarms.latching": { "tag": "unverified", "source": "research/06 §4.2; brief §6.4.1", "note": "manual implies non-latching" },
    "alarms.delayS": { "tag": "documented", "source": "research/06 §4.2 (M p.50)", "note": "'less than 1 s'" },
    "alarms.spo2DelayS": { "tag": "unverified", "source": "research/06 §4.2", "note": "not stated beyond averaging" },
    "alarms.alarmFreezeOption": { "tag": "documented", "source": "research/06 §4.2 (M p.49)", "note": "default not stated [unverified]" },
    "alarms.recall": { "tag": "documented", "source": "research/06 §4.2 (M p.238-239, 276)" },
    "limits.adult": { "tag": "documented", "source": "research/06 §4.3 (M p.302-306); brief §6.8" },
    "limits.paed.inherit": { "tag": "unverified", "source": "research/06 §4.3; brief §6.8", "note": "HR, SpO2, RR, Temp not banded in the manual; adult values inherited and marked approximate" },
    "limits.paed.values": { "tag": "documented", "source": "research/06 §4.3 (M p.302-306)" },
    "limits.neo.inherit": { "tag": "unverified", "source": "research/06 §4.3; brief §6.8", "note": "adult HR 50-150 is clinically wrong for neonates" },
    "limits.neo.values": { "tag": "documented", "source": "research/06 §4.3 (M p.302-306)" },
    "arrhythmia.defaultOn": { "tag": "documented", "source": "research/06 §4.2 (M p.69); brief §6.4.1" },
    "arrhythmia.asystoleS": { "tag": "conflict", "source": "research/06 §4.3 (M p.65, 70, 83); brief §6.4.1", "note": "10 s (ECG chapter) vs 5 s (arrhythmia chapter)" },
    "arrhythmia.asystoleAltS": { "tag": "conflict", "source": "research/06 §4.3 (M p.83); brief §6.4.1" },
    "arrhythmia.pause": { "tag": "documented", "source": "research/06 §4.3" },
    "arrhythmia.vtac": { "tag": "documented", "source": "research/06 §4.3; brief §6.8" },
    "arrhythmia.tachy": { "tag": "documented", "source": "research/06 §4.3" },
    "arrhythmia.brady": { "tag": "documented", "source": "research/06 §4.3" },
    "arrhythmia.freqPvcPerMin": { "tag": "documented", "source": "research/06 §4.3" },
    "st": { "tag": "documented", "source": "research/06 §4.1 (M p.86-92, 266)" },
    "beep.source": { "tag": "documented", "source": "research/06 §4.1 (M p.66-67); brief §3.6" },
    "beep.defaultOn": { "tag": "documented", "source": "research/06 §4.1 (M p.67, 302)", "note": "BEAT VOLUME factory 1" },
    "beep.volume": { "tag": "documented", "source": "research/06 §4.1 (M p.67, 302); brief §3.6" },
    "beep.pitchMap": { "tag": "unverified", "source": "research/06 §4.1; brief §3.6", "note": "SpO2 pitch modulation not documented" },
    "beep.baseHz": { "tag": "assumed", "source": "brief §3.6", "note": "pitch not published" },
    "syncMarker": { "tag": "documented", "source": "brief §6.5; research/06 §4.2 (M p.64, 69)" },
    "defib": { "tag": "documented", "source": "brief §6.5", "note": "the B9 has no defibrillator" },
    "pacer": { "tag": "documented", "source": "brief §6.5", "note": "the B9 has no pacer" },
    "trend.style": { "tag": "documented", "source": "research/06 §3.1 F5 (M p.233)" },
    "trend.hours": { "tag": "documented", "source": "research/06 §5" },
    "glyphs.noValue": { "tag": "assumed", "source": "brief §6.2" },
    "glyphs.hrUnavailable": { "tag": "documented", "source": "research/06 §3.2 (M p.62, 66-67)" },
    "glyphs.nibpFail": { "tag": "documented", "source": "research/06 §3.2 (M p.129)" },
    "glyphs.outOfRange": { "tag": "documented", "source": "research/06 §3.2" },
    "glyphs.ibpPrUnavailable": { "tag": "documented", "source": "research/06 §3.2" }
  }
}
```

- [x] **Step 4: Write the registry (saadat-like only for now)**

Create `packages/skins/src/registry.ts`:

```ts
// Every shipped skin, base, theme and preset (brief §3.8; build order R14: saadat-like → philips-like → zoll-like,
// then mindray-like, ge-like, lifepak-like). JSON imports are typed loosely, so they are cast once here; the
// schema tests are what guarantee the shapes.
import saadatLike from './data/skins/saadat-like.json';
import type { DeepPartial, Preset, Skin, Theme } from './types.ts';

/** A skin file as stored: complete (no `extends`) or a partial over a base. */
export type SkinSource = DeepPartial<Skin> & Pick<Skin, 'schema' | 'kind' | 'id' | 'label' | 'provenance'> & { extends?: string };

export const BASES: Readonly<Record<string, SkinSource>> = {};

export const SKINS: Readonly<Record<string, SkinSource>> = {
  'saadat-like': saadatLike as unknown as SkinSource,
};

export const THEMES: Readonly<Record<string, Theme>> = {};

export const PRESETS: Readonly<Record<string, Preset>> = {};

/** Skin and preset ids in build order, then presets (the demo's switcher order). */
export const SKIN_IDS = Object.keys(SKINS);
export const PRESET_IDS = Object.keys(PRESETS);
export const THEME_IDS = Object.keys(THEMES);
```

- [x] **Step 5: Write `resolve.ts`**

Create `packages/skins/src/resolve.ts`:

```ts
// resolveSkin: the renderer/audio-facing contract (packages/skins/CONTRACT.md). It merges base ← skin ← preset ←
// theme, applies age-band limit inheritance, and derives the option blocks that map onto what the renderer and
// audio packages accept TODAY (LaneConfig, NumericTile colours, ToneScheduler/alarm profiles).
import { darkenToContrast } from './color.ts';
import { deepMerge } from './merge.ts';
import { BASES, PRESETS, SKINS, THEMES } from './registry.ts';
import type { AgeBand, LaneId, Level, LimitTable, PitchMapId, Preset, Provenance, Skin, SoundProfileId, TileParam } from './types.ts';

/** The engine's two ECG filter modes (packages/engine-core/src/l3/ecg-filter.ts FILTER_BANDS; a test keeps them equal). */
export const ENGINE_FILTER_BANDS = { monitor: [0.5, 40], diagnostic: [0.05, 150] } as const;
export type EngineFilterMode = keyof typeof ENGINE_FILTER_BANDS;
/** Base ECG gain the skins' multipliers refer to (×1 = 10 mm/mV, brief §3.5). */
export const BASE_GAIN_MM_PER_MV = 10;

export interface LaneRender {
  lane: LaneId;
  color: string;
  mmPerS: number;
  /** LaneConfig.gainMmPerMv; with autoGain the renderer starts here and rescales (Stage 4b). */
  gainMmPerMv: number;
  autoGain: boolean;
  label: string;
}

export interface RenderContract {
  background: string;
  foreground: string;
  grid: Skin['chrome']['grid'];
  lineWidth: number;
  eraseGapPx: number;
  cursorLine: boolean;
  fontStack: string;
  numericWeight: number;
  lanes: LaneRender[];
  tileColors: Partial<Record<TileParam, string>>;
  ecgFilter: { name: string; band: [number, number]; engineMode: EngineFilterMode; exact: boolean };
  hrMethod: { skin: Skin['hr']['method']; engine: 'dropMaxMin' | 'mean12' | null };
}

export interface AudioContract {
  beep: { enabled: boolean; source: Skin['beep']['source']; baseHz: number; pitchMap: PitchMapId; volume: Skin['beep']['volume'] };
  alarm: {
    profile: SoundProfileId;
    repeatS: Partial<Record<Level, number | null>>;
    lowPulses: 1 | 2 | null;
    volume: Skin['alarms']['volume'];
    silence: { durationS: number; cancelOnNewAlarm: boolean };
  };
}

export interface ResolvedSkin {
  /** The id asked for (a skin or a preset). */
  id: string;
  skinId: string;
  presetId: string | null;
  themeId: string | null;
  skin: Skin;
  provenance: Provenance;
  /** Age-band limits with `inherit` applied (null = not published for that band). */
  limits: Record<AgeBand, LimitTable | null>;
  /** Limit keys a band took from another band (shown as approximate in the UI, brief §6.8). */
  approximateLimits: Record<AgeBand, string[]>;
  preset: Pick<Preset, 'alarmSwitches' | 'startState'> | null;
  render: RenderContract;
  audio: AudioContract;
}

export interface ResolveOptions {
  theme?: string;
}

/** Merge a skin source over its base (if any); provenance merges the same way. */
export function mergeSkinSource(id: string): Skin {
  const src = SKINS[id];
  if (!src) throw new Error(`unknown skin: ${id}`);
  if (!src.extends) return structuredClone(src) as unknown as Skin;
  const base = BASES[src.extends];
  if (!base) throw new Error(`skin ${id} extends unknown base ${src.extends}`);
  const merged = deepMerge(base, src) as unknown as Skin;
  // A skin's own entries win; base entries under a path the skin re-sourced are dropped.
  const prov: Provenance = {};
  for (const [k, v] of Object.entries(base.provenance)) {
    if (!Object.keys(src.provenance).some((s) => k === s || k.startsWith(`${s}.`))) prov[k] = v;
  }
  merged.provenance = { ...prov, ...src.provenance };
  delete (merged as { extends?: string }).extends;
  return merged;
}

function applyPreset(skin: Skin, preset: Preset): Skin {
  const out = deepMerge(skin, preset.overrides);
  for (const [k, v] of Object.entries(preset.provenance)) {
    if (!k.startsWith('overrides.')) continue;
    const path = k.slice('overrides.'.length);
    for (const old of Object.keys(out.provenance)) if (old.startsWith(`${path}.`)) delete out.provenance[old];
    out.provenance[path] = v;
  }
  return out;
}

function applyTheme(skin: Skin, themeId: string): Skin {
  const theme = THEMES[themeId];
  if (!theme) throw new Error(`unknown theme: ${themeId}`);
  const out = deepMerge(skin, { scheme: theme.scheme, background: theme.background, foreground: theme.foreground, chrome: theme.chrome });
  const min = theme.colorTransform.minRatio;
  for (const [k, v] of Object.entries(out.colors)) if (v) (out.colors as Record<string, string>)[k] = darkenToContrast(v, theme.background, min);
  out.alarms.messageBar.idle = { ...theme.messageBarIdle };
  out.alarms.messageBar.acknowledged = { ...theme.messageBarIdle };
  for (const k of Object.keys(out.provenance)) if (k.startsWith('colors.')) delete out.provenance[k];
  out.provenance.colors = { tag: 'eng', source: `ENG: theme ${themeId} darkens the skin colours to ${min}:1` };
  for (const [k, v] of Object.entries(theme.provenance)) if (k !== 'colorTransform') out.provenance[k] = v;
  return out;
}

function resolveLimits(skin: Skin): { limits: ResolvedSkin['limits']; approximate: ResolvedSkin['approximateLimits'] } {
  const limits = { adult: null, paed: null, neo: null } as ResolvedSkin['limits'];
  const approximate: ResolvedSkin['approximateLimits'] = { adult: [], paed: [], neo: [] };
  for (const band of ['adult', 'paed', 'neo'] as const) {
    const b = skin.limits[band];
    if (!b) continue;
    const parent = b.inherit ? skin.limits[b.inherit]?.values ?? {} : {};
    limits[band] = { ...parent, ...b.values };
    approximate[band] = Object.keys(parent).filter((k) => !(k in b.values));
  }
  return { limits, approximate };
}

const sameBand = (a: readonly number[], b: readonly number[]) => a[0] === b[0] && a[1] === b[1];

/** Nearest engine filter mode for a skin band (log distance of the corners); exact when the bands are equal. */
export function engineFilterFor(band: readonly [number, number]): { engineMode: EngineFilterMode; exact: boolean } {
  let best: EngineFilterMode = 'monitor';
  let bestD = Infinity;
  for (const mode of Object.keys(ENGINE_FILTER_BANDS) as EngineFilterMode[]) {
    const ref = ENGINE_FILTER_BANDS[mode];
    if (sameBand(ref, band)) return { engineMode: mode, exact: true };
    const d = Math.abs(Math.log(band[0] / ref[0])) + Math.abs(Math.log(band[1] / ref[1]));
    if (d < bestD) [best, bestD] = [mode, d];
  }
  return { engineMode: best, exact: false };
}

const IBP_LABEL_FALLBACK: Record<string, 'ART' | 'CVP' | 'PAP'> = { IBP1: 'ART', IBP2: 'CVP', IBP3: 'PAP', IBP4: 'CVP' };

export function laneColor(skin: Skin, lane: LaneId): string {
  const c = skin.colors;
  const pick = (...keys: string[]) => keys.map((k) => (c as Record<string, string | undefined>)[k]).find(Boolean) ?? skin.foreground;
  if (lane.startsWith('ECG')) return pick('ECG');
  if (lane.startsWith('IBP')) return pick(lane, IBP_LABEL_FALLBACK[lane] ?? 'ART');
  return pick(lane);
}

const TILE_COLOR_KEY: Record<TileParam, string> = {
  HR: 'HR', NIBP: 'NIBP', ART: 'ART', CVP: 'CVP', PAP: 'PAP', IBP1: 'IBP1', IBP2: 'IBP2', IBP3: 'IBP3', IBP4: 'IBP4',
  SpO2: 'SpO2', TEMP: 'TEMP', RR: 'RESP', CO2: 'CO2', ST: 'ST',
};

function laneSweep(skin: Skin, lane: LaneId): number {
  if (lane.startsWith('ECG')) return skin.sweep.ecg.default;
  if (lane === 'PLETH') return skin.sweep.pleth.default;
  if (lane === 'RESP') return skin.sweep.resp.default;
  if (lane === 'CO2') return skin.sweep.co2.default;
  return skin.sweep.ibp.default;
}

/** Lane label from the skin template: '{lead}  X{gain}  {FILTER}' → 'II  X1  NORMAL'. */
export function formatLaneLabel(skin: Skin, lane: LaneId, ecgIndex: number): string {
  if (!lane.startsWith('ECG')) return lane;
  const lead = skin.ecg.laneLeads[ecgIndex] ?? skin.ecg.laneLeads[0] ?? 'II';
  const g = skin.ecg.gainDefault;
  const gain = g === 'AUTO' ? '1' : String(skin.ecg.gainLabel === 'mm-per-mV' ? g * BASE_GAIN_MM_PER_MV : g);
  const f = skin.ecg.filterDefault;
  return skin.ecg.laneLabel.replace('{lead}', lead).replace('{gain}', gain).replace('{FILTER}', skin.ecg.filterLabel === 'letter' ? f.charAt(0) : f);
}

function renderContract(skin: Skin): RenderContract {
  let ecgIndex = 0;
  const lanes = skin.layout.lanes.map((lane): LaneRender => {
    const isEcg = lane.startsWith('ECG');
    const g = skin.ecg.gainDefault;
    const r: LaneRender = {
      lane,
      color: laneColor(skin, lane),
      mmPerS: laneSweep(skin, lane),
      gainMmPerMv: isEcg && g !== 'AUTO' ? g * BASE_GAIN_MM_PER_MV : BASE_GAIN_MM_PER_MV,
      autoGain: isEcg && g === 'AUTO',
      label: formatLaneLabel(skin, lane, ecgIndex),
    };
    if (isEcg) ecgIndex++;
    return r;
  });
  const band = skin.ecg.filters[skin.ecg.filterDefault];
  if (!band) throw new Error(`skin ${skin.id}: filterDefault ${skin.ecg.filterDefault} is not in ecg.filters`);
  const tileColors: Partial<Record<TileParam, string>> = {};
  for (const col of skin.layout.tiles) for (const t of col) tileColors[t.param] = (skin.colors as Record<string, string | undefined>)[TILE_COLOR_KEY[t.param]] ?? skin.foreground;
  const hrEngine = skin.hr.method === 'trimmed-mean-12rr' ? 'dropMaxMin' : skin.hr.method === 'mean-12rr' ? 'mean12' : null;
  return {
    background: skin.background,
    foreground: skin.foreground,
    grid: skin.chrome.grid,
    lineWidth: skin.sweep.lineWidthPx,
    eraseGapPx: skin.sweep.gapPx,
    cursorLine: skin.sweep.cursorLine,
    fontStack: skin.font.stack,
    numericWeight: skin.font.numericWeight,
    lanes,
    tileColors,
    ecgFilter: { name: skin.ecg.filterDefault, band: [band[0], band[1]], ...engineFilterFor(band) },
    hrMethod: { skin: skin.hr.method, engine: hrEngine },
  };
}

function audioContract(skin: Skin): AudioContract {
  return {
    beep: { enabled: skin.beep.defaultOn, source: skin.beep.source, baseHz: skin.beep.baseHz, pitchMap: skin.beep.pitchMap, volume: { ...skin.beep.volume } },
    alarm: {
      profile: skin.alarms.soundProfile,
      repeatS: { ...(skin.alarms.repeatS ?? {}) },
      lowPulses: skin.alarms.lowPulses ?? null,
      volume: { ...skin.alarms.volume },
      silence: { durationS: skin.alarms.silence.durationS, cancelOnNewAlarm: skin.alarms.silence.cancelOnNewAlarm },
    },
  };
}

/** Resolve a skin or preset id (optionally with a theme) into the complete skin plus the renderer/audio contract. */
export function resolveSkin(id: string, opts: ResolveOptions = {}): ResolvedSkin {
  const preset = PRESETS[id] ?? null;
  const skinId = preset ? preset.base : id;
  let skin = mergeSkinSource(skinId);
  if (preset) skin = applyPreset(skin, preset);
  if (opts.theme) skin = applyTheme(skin, opts.theme);
  const { limits, approximate } = resolveLimits(skin);
  const { provenance } = skin;
  return {
    id,
    skinId,
    presetId: preset ? preset.id : null,
    themeId: opts.theme ?? null,
    skin,
    provenance,
    limits,
    approximateLimits: approximate,
    preset: preset ? { ...(preset.alarmSwitches ? { alarmSwitches: preset.alarmSwitches } : {}), ...(preset.startState ? { startState: preset.startState } : {}) } : null,
    render: renderContract(skin),
    audio: audioContract(skin),
  };
}
```

- [x] **Step 6: Replace `packages/skins/src/index.ts`**

```ts
// @pme/skins: skins as data (brief §3.8). Validation (ajv) lives in '@pme/skins/validate' so renderer bundles stay small.
export const version = '0.0.0';
export * from './types.ts';
export { contrastRatio, darkenToContrast, luminance, parseHex, toHex } from './color.ts';
export { deepMerge } from './merge.ts';
export { coveringKey, leafPaths, provenanceGaps } from './provenance.ts';
export { BASES, PRESETS, PRESET_IDS, SKINS, SKIN_IDS, THEMES, THEME_IDS, type SkinSource } from './registry.ts';
export {
  BASE_GAIN_MM_PER_MV, ENGINE_FILTER_BANDS, engineFilterFor, formatLaneLabel, laneColor, mergeSkinSource, resolveSkin,
  type AudioContract, type EngineFilterMode, type LaneRender, type RenderContract, type ResolveOptions, type ResolvedSkin,
} from './resolve.ts';
```

- [x] **Step 7: Run the whole package and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/skins test && npx -y pnpm@9.15.9 --filter @pme/skins typecheck`
Expected: 8 files, 35 passed; `1 snapshot written`; typecheck clean. If a provenance test fails, the message lists the uncovered leaf or dangling key: fix the JSON, never loosen the test.

- [x] **Step 8: Commit**

```bash
git add packages/skins/src packages/skins/test
git commit -m "feat(skins): saadat-like skin with research 06 provenance; resolveSkin renderer/audio contract" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: `iec-defaults` base and `philips-like`

**Files:**
- Create: `packages/skins/src/data/base/iec-defaults.json`, `packages/skins/src/data/skins/philips-like.json`
- Modify: `packages/skins/src/registry.ts` (replace)
- Test: `packages/skins/test/philips-like.test.ts`

**Interfaces:**
- Consumes: `mergeSkinSource`, `resolveSkin`, `validate` (Tasks 4–5).
- Produces: `BASES['iec-defaults']`, `SKINS['philips-like']`.

The base is brief §3.8's "Default (other skins)" column, §3.5 sweep/gap/gain and §6.4 alarms; it is not a skin (`id` has no `-like`) and has no colours (colours are vendor data). Philips colours are the IntelliVue factory colour **names** (research 05 §2.1) rendered to hex [ENG]; limits are the brief §6.8 Philips factory table.

- [x] **Step 1: Write the failing test**

Create `packages/skins/test/philips-like.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mergeSkinSource, resolveSkin } from '../src/index.ts';
import { validate } from '../src/validate.ts';

describe('philips-like (over iec-defaults)', () => {
  it('inherits the base and overrides what the file sets', () => {
    const s = mergeSkinSource('philips-like');
    expect(s.sweep.gapPx).toBe(16); // base
    expect(s.hr.method).toBe('mean-12rr'); // own
    expect(s.provenance['hr.method']?.source).toContain('Philips-like mean-12rr');
    expect(s.provenance['sweep.gapPx']?.tag).toBe('unverified'); // base entry kept
    expect('extends' in s).toBe(false);
  });

  it('renders Monitor as the letter M at 10 mm/mV; HR is the plain mean of 12', () => {
    const r = resolveSkin('philips-like');
    expect(r.render.lanes[0]).toMatchObject({ lane: 'ECG1', color: '#00FF00', gainMmPerMv: 10, autoGain: false, label: 'II  M' });
    expect(r.render.lanes[1]?.label).toBe('V1  M');
    expect(r.render.hrMethod.engine).toBe('mean12');
    expect(r.render.ecgFilter).toMatchObject({ engineMode: 'monitor', exact: true });
  });

  it('Philips factory limits by age band; unpublished cells stay null', () => {
    const r = resolveSkin('philips-like');
    expect(r.limits.adult?.HR).toEqual([50, 120]);
    expect(r.limits.neo?.SpO2).toEqual([85, 95]);
    expect(r.limits.paed?.RR).toBeNull();
    expect(r.approximateLimits).toEqual({ adult: [], paed: [], neo: [] });
  });

  it('IEC-style alarms: red 10 s, yellow 20 s, 2-pulse INOP, arrhythmia off (OR)', () => {
    const r = resolveSkin('philips-like');
    expect(r.audio.alarm).toMatchObject({ profile: 'iec-style', repeatS: { L1: 10, L2: 20 }, lowPulses: 2 });
    expect(r.skin.arrhythmia.defaultOn).toBe(false);
    expect(r.skin.alarms.messageBar.prefix).toBe('asterisks');
  });

  it('byLabel skins must colour ART/CVP/PAP', () => {
    const ph = structuredClone(resolveSkin('philips-like').skin);
    delete ph.colors.PAP;
    expect(validate('skin', ph).ok).toBe(false);
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/skins exec vitest run test/philips-like.test.ts`
Expected: FAIL, `unknown skin: philips-like`.

- [x] **Step 3: Write the base**

Create `packages/skins/src/data/base/iec-defaults.json`:

```json
{
  "schema": "pme-skin/1",
  "kind": "skin",
  "id": "iec-defaults",
  "label": "IEC-style defaults shared by the vendor skins (not a skin)",
  "scheme": "dark",
  "background": "#000000",
  "foreground": "#FFFFFF",
  "chrome": {
    "divider": "#404040",
    "windowFrame": "#808080",
    "focusFill": "#3060A0",
    "softkeyFrame": "#808080",
    "pageBox": { "bg": "#FFFFFF", "fg": "#000000" },
    "patientCategoryColor": "#FFFFFF",
    "grid": null
  },
  "font": { "stack": "system-ui, 'Helvetica Neue', Arial, sans-serif", "numericWeight": 600, "labelCase": "as-is" },
  "colorBinding": "byLabel",
  "ecgColorLocked": false,
  "layout": {
    "waveAreaFraction": 0.7,
    "lanes": ["ECG1", "ECG2", "ART", "PLETH", "CO2"],
    "tiles": [
      [{ "param": "HR", "size": "large" }, { "param": "ART", "extras": ["MEAN"] }, { "param": "NIBP", "extras": ["MEAN"] }],
      [{ "param": "SpO2", "extras": ["PR"] }, { "param": "CO2", "extras": ["EtCO2", "AWRR"] }, { "param": "TEMP" }]
    ],
    "menuRegion": "popup",
    "header": ["bed", "category", "alarmState", "datetime"],
    "messageBars": "single-under-header"
  },
  "pages": [{ "id": "P1", "kind": "standard", "label": "Main" }],
  "defaultPage": "P1",
  "calendar": { "default": "gregorian", "options": ["gregorian"], "gregorianFormat": "DD/MM/YYYY" },
  "language": "en",
  "sweep": {
    "ecg": { "options": [6.25, 12.5, 25, 50], "default": 25 },
    "pleth": { "options": [6.25, 12.5, 25, 50], "default": 25 },
    "ibp": { "options": [6.25, 12.5, 25, 50], "default": 25 },
    "resp": { "options": [6.25, 12.5, 25, 50], "default": 6.25 },
    "co2": { "options": [6.25, 12.5, 25, 50], "default": 6.25 },
    "style": "erase-bar",
    "gapPx": 16,
    "cursorLine": false,
    "lineWidthPx": 1.75
  },
  "ecg": {
    "gainOptions": [0.125, 0.25, 0.5, 1, 2, 4, "AUTO"],
    "gainDefault": 1,
    "gainLabel": "mm-per-mV",
    "filters": { "Monitor": [0.5, 40], "Diagnostic": [0.05, 150] },
    "filterDefault": "Monitor",
    "filterLabel": "letter",
    "laneLeads": ["II", "V1"],
    "cableDefault": "5-wire",
    "calPulse": { "mV": 1, "ms": 200, "defaultOn": true },
    "paceDetectDefault": false,
    "paceMarker": { "style": "marker-above", "heightMm": 2 },
    "laneLabel": "{lead}  {FILTER}"
  },
  "hr": {
    "method": "trimmed-mean-12rr",
    "windowOptions": [],
    "windowDefault": null,
    "updateHz": 1,
    "source": "ECG",
    "autoPriority": ["ECG", "ART", "SpO2"],
    "relabelNonEcgAs": null
  },
  "spo2": { "avgOptions": [4, 8, 12, 16], "avgDefault": 8, "sensitivity": ["NORMAL"], "sensitivityDefault": "NORMAL", "plethNormalized": true, "updateHz": 1 },
  "nibp": {
    "modeDefault": "AUTO",
    "autoIntervalMin": 15,
    "autoIntervalsMin": [1, 2, 3, 5, 10, 15, 20, 30, 45, 60, 90, 120, 240, 480, 720, 1440],
    "stat": { "count": 10, "spacingS": 0, "windowS": 300 },
    "initialInflation": { "adult": 160, "paed": 140, "neo": 100 },
    "nextInflation": "prevSys+10",
    "doneTone": true
  },
  "ibp": {
    "filterOptionsHz": [12, 40],
    "filterDefaultHz": 12,
    "gridDefault": false,
    "scaleLines": "none",
    "meanOnlyLabels": ["CVP"],
    "scales": { "ART": [0, 75, 150], "CVP": [0, 10, 20], "PAP": [0, 20, 40] }
  },
  "co2": { "unit": "mmHg", "scale": 40, "scaleUnit": "mmHg" },
  "alarms": {
    "levels": 3,
    "levelNames": ["high", "medium", "low"],
    "soundProfile": "iec-style",
    "volume": { "min": 0, "max": 10, "default": 5 },
    "lamp": { "L1": "red-flash", "L2": "yellow-flash", "L3": "cyan-steady", "flashHz": { "L1": 2.0, "L2": 0.6 }, "duty": 0.5 },
    "messageBar": {
      "L1": { "bg": "#FF0000", "fg": "#FFFFFF" },
      "L2": { "bg": "#FFFF00", "fg": "#000000" },
      "L3": { "bg": "#00FFFF", "fg": "#000000" },
      "idle": { "bg": "#000000", "fg": "#FFFFFF" },
      "acknowledged": { "bg": "#404040", "fg": "#FFFFFF" },
      "prefix": "asterisks",
      "rotate": true
    },
    "numericFlash": true,
    "factoryEnabled": true,
    "alwaysOn": [],
    "alarmOffIcon": "bell-off",
    "silence": { "durationS": 90, "suppressesVisual": false, "cancelOnNewAlarm": false, "headerCountdown": true, "technicalActsAsAck": false },
    "pause": { "durationS": 180 },
    "latching": true,
    "delayS": 0,
    "spo2DelayS": 10,
    "alarmFreezeOption": false,
    "recall": null
  },
  "limits": { "adult": null, "paed": null, "neo": null },
  "arrhythmia": {
    "defaultOn": true,
    "asystoleS": { "adult": 4.0, "neo": 3.0 },
    "asystoleAltS": null,
    "pause": { "adultS": 2.0, "neoS": 1.5 },
    "vtac": { "rate": 100, "count": 5 },
    "tachy": null,
    "brady": null,
    "freqPvcPerMin": 10
  },
  "st": { "defaultOn": false, "isoMs": -80, "stMs": 60, "updateS": 5 },
  "beep": { "source": "ECG", "defaultOn": true, "volume": { "min": 0, "max": 10, "default": 3 }, "pitchMap": "nellcor-like", "baseHz": 880 },
  "syncMarker": "line",
  "defib": null,
  "pacer": null,
  "trend": { "style": "line", "hours": 8 },
  "glyphs": { "noValue": "---", "hrUnavailable": "---", "nibpFail": "---", "outOfRange": "---", "ibpPrUnavailable": "---" },
  "provenance": {
    "scheme": { "tag": "documented", "source": "research/05 §2.7; brief §3.8" },
    "background": { "tag": "documented", "source": "research/05 §2.7 (black background)" },
    "foreground": { "tag": "eng", "source": "ENG" },
    "chrome": { "tag": "eng", "source": "brief §3.8 [ENG]", "note": "vendor-neutral chrome" },
    "font": { "tag": "eng", "source": "ENG" },
    "colorBinding": { "tag": "documented", "source": "brief §3.8 (default column); research/05 §2.1" },
    "ecgColorLocked": { "tag": "documented", "source": "brief §3.8 (default column)" },
    "layout": { "tag": "documented", "source": "research/05 §2.7; brief §3.8", "note": "waves left, tiles right; lane/tile choice [ENG]" },
    "pages": { "tag": "documented", "source": "brief §3.8 (default column: one standard page)" },
    "defaultPage": { "tag": "eng", "source": "ENG" },
    "calendar": { "tag": "documented", "source": "brief §3.8 (default column: gregorian only)", "note": "format [ENG]" },
    "language": { "tag": "eng", "source": "ENG" },
    "sweep.ecg": { "tag": "documented", "source": "research/05 §2.2; brief §3.5" },
    "sweep.pleth": { "tag": "documented", "source": "research/05 §2.2; brief §3.5" },
    "sweep.ibp": { "tag": "documented", "source": "research/05 §2.2; brief §3.5" },
    "sweep.resp": { "tag": "documented", "source": "research/05 §2.2; brief §3.5" },
    "sweep.co2": { "tag": "documented", "source": "research/05 §2.2; brief §3.5" },
    "sweep.style": { "tag": "documented", "source": "research/05 §2.7; brief §3.5" },
    "sweep.gapPx": { "tag": "unverified", "source": "brief §3.5", "note": "16 CSS px; no vendor source" },
    "sweep.cursorLine": { "tag": "unverified", "source": "research/05 §2.7; brief §3.8" },
    "sweep.lineWidthPx": { "tag": "eng", "source": "brief §3.5 [ENG]" },
    "ecg.gainOptions": { "tag": "documented", "source": "research/05 §2.2 (Mindray 1.25-40 mm/mV, Auto); brief §3.5" },
    "ecg.gainDefault": { "tag": "documented", "source": "brief §3.5 (10 mm/mV)" },
    "ecg.gainLabel": { "tag": "eng", "source": "ENG" },
    "ecg.filters": { "tag": "documented", "source": "brief §4.1 (engine filter modes); research/05 §2.2" },
    "ecg.filterDefault": { "tag": "documented", "source": "research/05 §2.2" },
    "ecg.filterLabel": { "tag": "documented", "source": "research/05 §2.2 (filter letter under the lead label)" },
    "ecg.laneLeads": { "tag": "documented", "source": "research/05 §2.2 (primary II, secondary V1)" },
    "ecg.cableDefault": { "tag": "eng", "source": "ENG" },
    "ecg.calPulse": { "tag": "documented", "source": "research/05 §2.7 (1 mV calibration bar)", "note": "duration [ENG]" },
    "ecg.paceDetectDefault": { "tag": "eng", "source": "ENG" },
    "ecg.paceMarker": { "tag": "documented", "source": "brief §3.5 (mark 1-2 mm above the trace)" },
    "ecg.laneLabel": { "tag": "documented", "source": "research/05 §2.7; brief §3.8" },
    "hr.method": { "tag": "documented", "source": "research/05 §2.4; brief §3.8" },
    "hr.windowOptions": { "tag": "documented", "source": "brief §3.8 (not used by beat-count methods)" },
    "hr.windowDefault": { "tag": "documented", "source": "brief §3.8" },
    "hr.updateHz": { "tag": "documented", "source": "research/05 §2.4" },
    "hr.source": { "tag": "documented", "source": "brief §3.8 (ECG with fallback, §6.1)" },
    "hr.autoPriority": { "tag": "eng", "source": "brief §6.1 [ENG]" },
    "hr.relabelNonEcgAs": { "tag": "documented", "source": "brief §3.8" },
    "spo2": { "tag": "eng", "source": "research/05 §2.4 [ENG]", "note": "refresh ≤1 s documented; averaging options [ENG]" },
    "nibp.modeDefault": { "tag": "documented", "source": "brief §6.8 (NBP interval 15 min)" },
    "nibp.autoIntervalMin": { "tag": "documented", "source": "brief §6.8" },
    "nibp.autoIntervalsMin": { "tag": "eng", "source": "ENG" },
    "nibp.stat": { "tag": "documented", "source": "brief §3.8 (back-to-back for 300 s)", "note": "count cap [ENG]" },
    "nibp.initialInflation": { "tag": "documented", "source": "research/05 §2.4 (LIFEPAK 160 mmHg)", "note": "paed/neo [ENG]" },
    "nibp.nextInflation": { "tag": "documented", "source": "brief §3.8" },
    "nibp.doneTone": { "tag": "documented", "source": "research/05 §2.4 (Philips 'Done Tone')" },
    "ibp": { "tag": "documented", "source": "research/05 §2.1-2.2 (ABP 150 scale, 12 Hz filter)", "note": "CVP/PAP scales and 40 Hz option [ENG]" },
    "co2": { "tag": "documented", "source": "research/05 §2.2 (scale 40 mmHg); research/00 R12" },
    "alarms.levels": { "tag": "documented", "source": "brief §6.4" },
    "alarms.levelNames": { "tag": "documented", "source": "brief §3.8" },
    "alarms.soundProfile": { "tag": "documented", "source": "brief §6.4 (IEC-style)" },
    "alarms.volume": { "tag": "documented", "source": "brief §6.4 (volume 0-10)", "note": "default [ENG]" },
    "alarms.lamp": { "tag": "documented", "source": "brief §6.4 (visual table); research/05 §2.5" },
    "alarms.messageBar": { "tag": "documented", "source": "brief §6.4; research/05 §2.5", "note": "hex [ENG]; idle/acknowledged [ENG]" },
    "alarms.numericFlash": { "tag": "documented", "source": "research/05 §2.4" },
    "alarms.factoryEnabled": { "tag": "documented", "source": "brief §3.8" },
    "alarms.alwaysOn": { "tag": "documented", "source": "brief §3.8" },
    "alarms.alarmOffIcon": { "tag": "eng", "source": "brief §3.8 [ENG]" },
    "alarms.silence": { "tag": "documented", "source": "brief §6.4 (silence 90 s, audio only)" },
    "alarms.pause": { "tag": "documented", "source": "brief §6.4 (pause 3 min)" },
    "alarms.latching": { "tag": "eng", "source": "brief §6.4 [ENG]" },
    "alarms.delayS": { "tag": "eng", "source": "brief §6.4 [ENG]" },
    "alarms.spo2DelayS": { "tag": "documented", "source": "brief §6.4" },
    "alarms.alarmFreezeOption": { "tag": "documented", "source": "brief §3.8" },
    "alarms.recall": { "tag": "documented", "source": "brief §3.8" },
    "limits": { "tag": "unverified", "source": "brief §6.8", "note": "vendor tables not retrieved are not invented" },
    "arrhythmia.defaultOn": { "tag": "documented", "source": "brief §6.4" },
    "arrhythmia.asystoleS": { "tag": "documented", "source": "brief §6.4; research/05 §2.2" },
    "arrhythmia.asystoleAltS": { "tag": "documented", "source": "brief §6.4" },
    "arrhythmia.pause": { "tag": "documented", "source": "brief §6.4" },
    "arrhythmia.vtac": { "tag": "documented", "source": "brief §6.4" },
    "arrhythmia.tachy": { "tag": "documented", "source": "brief §6.4 (limit-relative, no absolute)" },
    "arrhythmia.brady": { "tag": "documented", "source": "brief §6.4 (limit-relative, no absolute)" },
    "arrhythmia.freqPvcPerMin": { "tag": "documented", "source": "brief §6.4" },
    "st": { "tag": "eng", "source": "ENG" },
    "beep.source": { "tag": "documented", "source": "research/05 §2.5; brief §3.6" },
    "beep.defaultOn": { "tag": "documented", "source": "brief §3.6" },
    "beep.volume": { "tag": "eng", "source": "ENG" },
    "beep.pitchMap": { "tag": "documented", "source": "brief §3.6; research/05 §2.5" },
    "beep.baseHz": { "tag": "documented", "source": "brief §3.6 (880 Hz at 100%)" },
    "syncMarker": { "tag": "documented", "source": "brief §3.5 (Philips-like line)" },
    "defib": { "tag": "documented", "source": "brief §6.5", "note": "bedside monitors carry none" },
    "pacer": { "tag": "documented", "source": "brief §6.5" },
    "trend": { "tag": "documented", "source": "brief §6.7 (8 h, line)" },
    "glyphs": { "tag": "documented", "source": "brief §6.2 (dashes)" }
  }
}
```

- [x] **Step 4: Write the skin**

Create `packages/skins/src/data/skins/philips-like.json`:

```json
{
  "schema": "pme-skin/1",
  "kind": "skin",
  "id": "philips-like",
  "label": "Philips-like (IntelliVue-style, OR configuration)",
  "extends": "iec-defaults",
  "colors": {
    "ECG": "#00FF00", "HR": "#00FF00", "ST": "#00FF00", "PVC": "#00FF00",
    "SpO2": "#00FFFF", "PLETH": "#00FFFF", "PR": "#00FFFF", "PI": "#00FFFF",
    "NIBP": "#FF4040",
    "ART": "#FF4040", "CVP": "#00FFFF", "PAP": "#FFFF00", "ICP": "#FF00FF",
    "RESP": "#FFFF00", "CO2": "#FFFF00", "AWRR": "#FFFF00",
    "TEMP": "#00FF00"
  },
  "ecg": {
    "filters": { "Monitor": [0.5, 40], "Ext. Monitor": [0.5, 150], "Filter": [0.5, 20], "Diag": [0.05, 150] },
    "filterDefault": "Monitor"
  },
  "hr": { "method": "mean-12rr" },
  "alarms": { "repeatS": { "L1": 10, "L2": 20 }, "lowPulses": 2 },
  "limits": {
    "adult": {
      "values": {
        "HR": [50, 120], "SpO2": [90, 100], "SpO2_desat": 80,
        "NIBP_S": [90, 160], "NIBP_M": [60, 110], "NIBP_D": [50, 90],
        "ART_S": [90, 160], "ART_M": [70, 110], "ART_D": [50, 90],
        "CVP_M": [0, 10], "PAP_S": [10, 35], "PAP_M": [0, 20], "PAP_D": [0, 16],
        "RR": [8, 30], "apneaS": 20, "EtCO2": [30, 50], "imCO2_high": 4, "TEMP": [36, 39]
      }
    },
    "paed": {
      "values": {
        "HR": [75, 160], "SpO2": [90, 100], "SpO2_desat": 80,
        "NIBP_S": [70, 120], "NIBP_M": [50, 90], "NIBP_D": [40, 70],
        "ART_S": [70, 120], "ART_M": [50, 90], "ART_D": [40, 70],
        "CVP_M": [0, 4], "PAP_S": [24, 60], "PAP_M": [12, 26], "PAP_D": [-4, 4],
        "RR": null, "apneaS": null, "EtCO2": null, "imCO2_high": null, "TEMP": null
      }
    },
    "neo": {
      "values": {
        "HR": [100, 200], "SpO2": [85, 95], "SpO2_desat": 80,
        "NIBP_S": [40, 90], "NIBP_M": [24, 70], "NIBP_D": [20, 60],
        "ART_S": [55, 90], "ART_M": [35, 70], "ART_D": [20, 60],
        "CVP_M": [0, 4], "PAP_S": [24, 60], "PAP_M": [12, 26], "PAP_D": [-4, 4],
        "RR": [30, 100], "apneaS": 20, "EtCO2": null, "imCO2_high": null, "TEMP": null
      }
    }
  },
  "arrhythmia": { "defaultOn": false },
  "provenance": {
    "colors": { "tag": "documented", "source": "research/05 §2.1 (IntelliVue factory colour names); brief §6.8", "note": "hex values are [ENG] renderings of the colour names; NBP red (magenta in some profiles)" },
    "ecg.filters": { "tag": "documented", "source": "research/05 §2.2 (Philips Monitor/Ext. Monitor/Filter/Diag)" },
    "ecg.filterDefault": { "tag": "documented", "source": "research/05 §2.2; brief §6.8" },
    "hr.method": { "tag": "documented", "source": "brief §3.8 (Philips-like mean-12rr)" },
    "alarms.repeatS": { "tag": "documented", "source": "research/05 §2.5 (ISO red 5/10/15 s, yellow 10/20/30 s); brief §6.4" },
    "alarms.lowPulses": { "tag": "documented", "source": "research/05 §2.5 (INOP: lower tone ×2); brief §6.4" },
    "limits.adult": { "tag": "documented", "source": "brief §6.8 (Philips factory); research/03 §8.10" },
    "limits.paed": { "tag": "documented", "source": "brief §6.8 (Philips factory)", "note": "null = not given in the table" },
    "limits.neo": { "tag": "documented", "source": "brief §6.8 (Philips factory)", "note": "null = not given in the table" },
    "arrhythmia.defaultOn": { "tag": "documented", "source": "brief §6.4 (off on the OR skin); research/03 §1.12" }
  }
}
```

- [x] **Step 5: Replace the registry**

```ts
// Every shipped skin, base, theme and preset (brief §3.8; build order R14: saadat-like → philips-like → zoll-like,
// then mindray-like, ge-like, lifepak-like). JSON imports are typed loosely, so they are cast once here; the
// schema tests are what guarantee the shapes.
import iecDefaults from './data/base/iec-defaults.json';
import philipsLike from './data/skins/philips-like.json';
import saadatLike from './data/skins/saadat-like.json';
import type { DeepPartial, Preset, Skin, Theme } from './types.ts';

/** A skin file as stored: complete (no `extends`) or a partial over a base. */
export type SkinSource = DeepPartial<Skin> & Pick<Skin, 'schema' | 'kind' | 'id' | 'label' | 'provenance'> & { extends?: string };

export const BASES: Readonly<Record<string, SkinSource>> = { 'iec-defaults': iecDefaults as unknown as SkinSource };

export const SKINS: Readonly<Record<string, SkinSource>> = {
  'saadat-like': saadatLike as unknown as SkinSource,
  'philips-like': philipsLike as unknown as SkinSource,
};

export const THEMES: Readonly<Record<string, Theme>> = {};

export const PRESETS: Readonly<Record<string, Preset>> = {};

/** Skin and preset ids in build order, then presets (the demo's switcher order). */
export const SKIN_IDS = Object.keys(SKINS);
export const PRESET_IDS = Object.keys(PRESETS);
export const THEME_IDS = Object.keys(THEMES);
```

- [x] **Step 6: Run the package**

Run: `npx -y pnpm@9.15.9 --filter @pme/skins test && npx -y pnpm@9.15.9 --filter @pme/skins typecheck`
Expected: all pass; new snapshot `snapshot philips-like (theme (none))` written; the schema/provenance/contrast suites now also cover philips-like and the base.

- [x] **Step 7: Commit**

```bash
git add packages/skins/src packages/skins/test
git commit -m "feat(skins): iec-defaults base (brief 3.8 default column) and philips-like" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: `zoll-like`

**Files:**
- Create: `packages/skins/src/data/skins/zoll-like.json`
- Modify: `packages/skins/src/registry.ts` (replace)
- Test: `packages/skins/test/zoll-like.test.ts`

**Interfaces:**
- Produces: `SKINS['zoll-like']` (defib/pacer data, `syncMarker: 'r-above'`, alarm cadence override `repeatS { L1: 15, L2: 30, L3: null }`).

ZOLL colours were not retrieved (research 05 §2.1: user-configurable), so they are conventional and tagged **[assumed]**; ZOLL alarm limits stay `null` (inherited from the base, tagged unverified).

- [ ] **Step 1: Write the failing test**

Create `packages/skins/test/zoll-like.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveSkin } from '../src/index.ts';

describe('zoll-like', () => {
  it('beep off, R marker above the trace, 1 cm/mV, CO2 at 6.25 mm/s', () => {
    const r = resolveSkin('zoll-like');
    expect(r.audio.beep.enabled).toBe(false);
    expect(r.skin.syncMarker).toBe('r-above');
    expect(r.render.lanes.find((l) => l.lane === 'CO2')?.mmPerS).toBe(6.25);
    expect(r.render.lanes[0]).toMatchObject({ gainMmPerMv: 10, label: 'II  M' });
  });

  it('defibrillator 120 J adult / 50 J paediatric; pacer 0–140 mA, +10/−5 steps, demand', () => {
    const r = resolveSkin('zoll-like');
    expect(r.skin.defib).toMatchObject({ energyAdultJ: 120, energyPaedJ: 50, readyTimeoutS: 60, toneSet: 'zoll-like' });
    expect(r.skin.pacer).toMatchObject({ mARange: [0, 140], mAStep: { up: 10, down: 5 }, modeDefault: 'demand' });
  });

  it('alarm cadence: high every 15 s, medium every 30 s, low not repeated; limits not invented', () => {
    const r = resolveSkin('zoll-like');
    expect(r.audio.alarm.repeatS).toEqual({ L1: 15, L2: 30, L3: null });
    expect(r.limits).toEqual({ adult: null, paed: null, neo: null });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/skins exec vitest run test/zoll-like.test.ts`
Expected: FAIL, `unknown skin: zoll-like`.

- [ ] **Step 3: Write the skin**

Create `packages/skins/src/data/skins/zoll-like.json`:

```json
{
  "schema": "pme-skin/1",
  "kind": "skin",
  "id": "zoll-like",
  "label": "ZOLL-like (defibrillator monitor)",
  "extends": "iec-defaults",
  "colors": {
    "ECG": "#00FF00", "HR": "#00FF00",
    "SpO2": "#00FFFF", "PLETH": "#00FFFF", "PR": "#00FFFF",
    "NIBP": "#FFFFFF",
    "ART": "#FF4040", "CVP": "#40A0FF", "PAP": "#FFFF00",
    "RESP": "#FFFFFF", "CO2": "#FFFF00", "AWRR": "#FFFF00",
    "TEMP": "#FFFFFF"
  },
  "layout": {
    "lanes": ["ECG1", "PLETH", "CO2"],
    "tiles": [
      [{ "param": "HR", "size": "large" }, { "param": "NIBP", "extras": ["MEAN"] }],
      [{ "param": "SpO2", "extras": ["PR"] }, { "param": "CO2", "extras": ["EtCO2", "AWRR"] }]
    ]
  },
  "sweep": { "co2": { "options": [3.13, 6.25, 12.5], "default": 6.25 } },
  "ecg": { "gainOptions": [0.125, 0.25, 0.5, 1, 2, 4, "AUTO"], "gainDefault": 1, "gainLabel": "cm-per-mV" },
  "beep": { "defaultOn": false },
  "alarms": { "repeatS": { "L1": 15, "L2": 30, "L3": null } },
  "syncMarker": "r-above",
  "defib": { "energyAdultJ": 120, "energyPaedJ": 50, "aedSequenceJ": null, "chargeTimeS": null, "readyTimeoutS": 60, "toneSet": "zoll-like" },
  "pacer": { "rateDefault": 70, "rateRange": [30, 180], "mADefault": 0, "mARange": [0, 140], "mAStep": { "up": 10, "down": 5 }, "modeDefault": "demand", "pausePct": null },
  "provenance": {
    "colors": { "tag": "assumed", "source": "research/05 §2.1 (ZOLL: user-configurable colour, black background)", "note": "conventional parameter colours; no ZOLL factory table retrieved" },
    "layout.lanes": { "tag": "eng", "source": "ENG" },
    "layout.tiles": { "tag": "eng", "source": "ENG" },
    "sweep.co2": { "tag": "documented", "source": "research/05 §2.2 (ZOLL CO2 3.13/6.25/12.5, default 6.25)" },
    "ecg.gainOptions": { "tag": "documented", "source": "research/05 §2.2 (0.125-4 cm/mV or AUTO)" },
    "ecg.gainDefault": { "tag": "documented", "source": "research/05 §2.2 (1 cm/mV); brief §3.5" },
    "ecg.gainLabel": { "tag": "documented", "source": "research/05 §2.2" },
    "beep.defaultOn": { "tag": "documented", "source": "research/05 §2.5 (HR/PR tone Off); brief §3.6" },
    "alarms.repeatS": { "tag": "documented", "source": "research/05 §2.5 (high every 15 s, medium every 30 s, low not repeated)" },
    "syncMarker": { "tag": "documented", "source": "research/05 §2.6 (R-wave markers above the ECG)" },
    "defib.energyAdultJ": { "tag": "documented", "source": "research/05 §2.6; brief §6.5" },
    "defib.energyPaedJ": { "tag": "documented", "source": "research/05 §2.6; brief §6.5" },
    "defib.aedSequenceJ": { "tag": "documented", "source": "research/05 §2.6", "note": "no escalation sequence given" },
    "defib.chargeTimeS": { "tag": "unverified", "source": "brief §6.5", "note": "ZOLL charge time not given" },
    "defib.readyTimeoutS": { "tag": "documented", "source": "research/05 §2.6 (continuous tone 50 s + higher tone 10 s, then disarm)" },
    "defib.toneSet": { "tag": "documented", "source": "research/05 §2.6" },
    "pacer.rateDefault": { "tag": "assumed", "source": "research/05 §2.6", "note": "ZOLL default rate not given; example shows 80 ppm" },
    "pacer.rateRange": { "tag": "documented", "source": "research/05 §2.6; brief §6.5" },
    "pacer.mADefault": { "tag": "documented", "source": "research/05 §2.6 (0 when paused)" },
    "pacer.mARange": { "tag": "documented", "source": "research/05 §2.6 (10-140 mA); brief §6.5" },
    "pacer.mAStep": { "tag": "documented", "source": "research/05 §2.6 (+10 / -5 mA)" },
    "pacer.modeDefault": { "tag": "documented", "source": "research/05 §2.6 (example 'Demand')" },
    "pacer.pausePct": { "tag": "documented", "source": "research/05 §2.6", "note": "no ZOLL pause mode given" }
  }
}
```

- [ ] **Step 4: Replace the registry**

```ts
// Every shipped skin, base, theme and preset (brief §3.8; build order R14: saadat-like → philips-like → zoll-like,
// then mindray-like, ge-like, lifepak-like). JSON imports are typed loosely, so they are cast once here; the
// schema tests are what guarantee the shapes.
import iecDefaults from './data/base/iec-defaults.json';
import philipsLike from './data/skins/philips-like.json';
import saadatLike from './data/skins/saadat-like.json';
import zollLike from './data/skins/zoll-like.json';
import type { DeepPartial, Preset, Skin, Theme } from './types.ts';

/** A skin file as stored: complete (no `extends`) or a partial over a base. */
export type SkinSource = DeepPartial<Skin> & Pick<Skin, 'schema' | 'kind' | 'id' | 'label' | 'provenance'> & { extends?: string };

export const BASES: Readonly<Record<string, SkinSource>> = { 'iec-defaults': iecDefaults as unknown as SkinSource };

export const SKINS: Readonly<Record<string, SkinSource>> = {
  'saadat-like': saadatLike as unknown as SkinSource,
  'philips-like': philipsLike as unknown as SkinSource,
  'zoll-like': zollLike as unknown as SkinSource,
};

export const THEMES: Readonly<Record<string, Theme>> = {};

export const PRESETS: Readonly<Record<string, Preset>> = {};

/** Skin and preset ids in build order, then presets (the demo's switcher order). */
export const SKIN_IDS = Object.keys(SKINS);
export const PRESET_IDS = Object.keys(PRESETS);
export const THEME_IDS = Object.keys(THEMES);
```

- [ ] **Step 5: Run the package**

Run: `npx -y pnpm@9.15.9 --filter @pme/skins test && npx -y pnpm@9.15.9 --filter @pme/skins typecheck`
Expected: all pass; a zoll-like snapshot written.

- [ ] **Step 6: Commit**

```bash
git add packages/skins/src packages/skins/test
git commit -m "feat(skins): zoll-like (defib/pacer data, 15/30 s alarm cadence, beep off)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: `mindray-like`, `ge-like`, `lifepak-like`

**Files:**
- Create: `packages/skins/src/data/skins/mindray-like.json`, `packages/skins/src/data/skins/ge-like.json`, `packages/skins/src/data/skins/lifepak-like.json`
- Modify: `packages/skins/src/registry.ts` (replace)
- Test: `packages/skins/test/vendors.test.ts`

**Interfaces:**
- Produces: `SKINS['mindray-like' | 'ge-like' | 'lifepak-like']`. `SKIN_IDS` is now the R14 order `saadat-like, philips-like, zoll-like, mindray-like, ge-like, lifepak-like`.

These three may slip to v1.1 under R12; they are small because the base carries the shared defaults. GE, Mindray and LIFEPAK alarm limits are `null` (not retrieved, brief §6.8); ge-like states it explicitly with `unverified` tags.

- [ ] **Step 1: Write the failing test**

Create `packages/skins/test/vendors.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveSkin } from '../src/index.ts';

describe('mindray-like, ge-like, lifepak-like', () => {
  it('mindray-like: Surgical 1–20 Hz is offered (approximate on the engine), pause 2 min, lamp L3 cyan', () => {
    const r = resolveSkin('mindray-like');
    expect(r.skin.ecg.filters.Surgical).toEqual([1, 20]);
    expect(r.skin.alarms.pause).toEqual({ durationS: 120 });
    expect(r.skin.alarms.lamp.L3).toBe('cyan-steady');
  });

  it('ge-like: Monitoring 0.05–32 Hz (50 Hz mains) maps approximately to the engine; limits null and unverified', () => {
    const r = resolveSkin('ge-like');
    expect(r.render.ecgFilter).toMatchObject({ name: 'Monitoring', band: [0.05, 32], exact: false });
    expect(r.skin.limits).toEqual({ adult: null, paed: null, neo: null });
    for (const b of ['adult', 'paed', 'neo']) expect(r.provenance[`limits.${b}`]?.tag).toBe('unverified');
    expect(r.skin.sweep.co2.options).toContain(0.625);
  });

  it('lifepak-like: 200 J, 200-300-360 AED, charge ≤7 s at 200 J, auto-disarm 60 s, triangle sync marker, beep off', () => {
    const r = resolveSkin('lifepak-like');
    expect(r.skin.defib).toMatchObject({ energyAdultJ: 200, aedSequenceJ: [200, 300, 360], chargeTimeS: { '200': 7, '360': 10 }, readyTimeoutS: 60 });
    expect(r.skin.syncMarker).toBe('triangle-mid-qrs');
    expect(r.skin.pacer).toMatchObject({ rateDefault: 60, mADefault: 0, pausePct: 25 });
    expect(r.audio.beep.enabled).toBe(false);
    expect(r.render.lanes.find((l) => l.lane === 'CO2')?.mmPerS).toBe(12.5);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/skins exec vitest run test/vendors.test.ts`
Expected: FAIL, `unknown skin: mindray-like`.

- [ ] **Step 3: Write the three skins**

Create `packages/skins/src/data/skins/mindray-like.json`:

```json
{
  "schema": "pme-skin/1",
  "kind": "skin",
  "id": "mindray-like",
  "label": "Mindray-like (bedside)",
  "extends": "iec-defaults",
  "colors": {
    "ECG": "#00FF00", "HR": "#00FF00", "ST": "#00FF00", "PVC": "#00FF00",
    "SpO2": "#00FFFF", "PLETH": "#00FFFF", "PR": "#00FFFF",
    "NIBP": "#FFFFFF",
    "ART": "#FF4040", "CVP": "#40A0FF", "PAP": "#FFFF00",
    "RESP": "#FFFF00", "CO2": "#FFFF00", "AWRR": "#FFFF00",
    "TEMP": "#FFFFFF"
  },
  "sweep": { "resp": { "options": [3, 6.25, 12.5, 25, 50], "default": 6.25 } },
  "ecg": {
    "filters": { "Diagnostic": [0.05, 150], "Monitor": [0.5, 40], "Surgical": [1, 20], "ST": [0.05, 40] },
    "filterDefault": "Monitor",
    "gainLabel": "mm-per-mV"
  },
  "alarms": { "pause": { "durationS": 120 }, "messageBar": { "L1": { "bg": "#FF0000", "fg": "#FFFFFF" }, "L2": { "bg": "#FFFF00", "fg": "#000000" }, "L3": { "bg": "#00FFFF", "fg": "#000000" } } },
  "provenance": {
    "colors.ECG": { "tag": "documented", "source": "research/05 §2.1 (ECG 'normally green')" },
    "colors.HR": { "tag": "documented", "source": "research/05 §2.1" },
    "colors.ST": { "tag": "documented", "source": "research/05 §2.1 (ST view follows the ECG colour)" },
    "colors.PVC": { "tag": "documented", "source": "research/05 §2.1" },
    "colors.SpO2": { "tag": "assumed", "source": "research/06 §6 (Mindray SpO2 cyan, typical)" },
    "colors.PLETH": { "tag": "assumed", "source": "research/06 §6" },
    "colors.PR": { "tag": "assumed", "source": "research/06 §6" },
    "colors.NIBP": { "tag": "assumed", "source": "research/05 §2.1", "note": "varies by vendor" },
    "colors.ART": { "tag": "assumed", "source": "research/05 §2.1 (ABP red convention)" },
    "colors.CVP": { "tag": "assumed", "source": "research/05 §2.1", "note": "varies" },
    "colors.PAP": { "tag": "assumed", "source": "research/05 §2.1 (PAP yellow convention)" },
    "colors.RESP": { "tag": "assumed", "source": "research/05 §2.1" },
    "colors.CO2": { "tag": "assumed", "source": "research/05 §2.1" },
    "colors.AWRR": { "tag": "assumed", "source": "research/05 §2.1" },
    "colors.TEMP": { "tag": "assumed", "source": "research/05 §2.1", "note": "varies" },
    "sweep.resp": { "tag": "documented", "source": "research/05 §2.2 (Mindray 6.25-50, Resp adds 3 mm/s)" },
    "ecg.filters": { "tag": "documented", "source": "research/05 §2.2 (Mindray Diagnostic/Monitor/Surgical/ST); brief §6.8" },
    "ecg.filterDefault": { "tag": "eng", "source": "ENG", "note": "Mindray default mode not retrieved" },
    "ecg.gainLabel": { "tag": "documented", "source": "research/05 §2.2 (mm/mV steps)" },
    "alarms.pause": { "tag": "documented", "source": "research/06 §6 (Mindray pause 2 min)" },
    "alarms.messageBar": { "tag": "documented", "source": "research/05 §2.4-2.5 (white on red, black on yellow, black on cyan)", "note": "hex [ENG]" }
  }
}
```

Create `packages/skins/src/data/skins/ge-like.json`:

```json
{
  "schema": "pme-skin/1",
  "kind": "skin",
  "id": "ge-like",
  "label": "GE-like (CARESCAPE-style bedside)",
  "extends": "iec-defaults",
  "colors": {
    "ECG": "#00FF00", "HR": "#00FF00",
    "SpO2": "#00FFFF", "PLETH": "#00FFFF", "PR": "#00FFFF",
    "NIBP": "#FFFFFF",
    "ART": "#FF4040", "CVP": "#40A0FF", "PAP": "#FFFF00",
    "RESP": "#FFFF00", "CO2": "#FFFF00", "AWRR": "#FFFF00",
    "TEMP": "#FFFFFF"
  },
  "sweep": { "co2": { "options": [0.625, 6.25, 12.5, 25, 50], "default": 6.25 } },
  "ecg": {
    "gainOptions": [0.5, 1, 2, 4],
    "gainDefault": 1,
    "gainLabel": "multiplier",
    "filters": { "Diagnostic": [0.05, 150], "Monitoring": [0.05, 32], "Moderate": [0.05, 25], "Maximum": [5, 25] },
    "filterDefault": "Monitoring"
  },
  "limits": { "adult": null, "paed": null, "neo": null },
  "provenance": {
    "colors": { "tag": "assumed", "source": "research/05 §2.1 (GE: per-label colours configurable)", "note": "no GE factory colour table retrieved" },
    "sweep.co2": { "tag": "documented", "source": "research/05 §2.2 (GE CO2 0.625-50 mm/s); brief §6.8" },
    "ecg.gainOptions": { "tag": "documented", "source": "research/05 §2.2 (GE size 0.5x, 1x, 2x, 4x)" },
    "ecg.gainDefault": { "tag": "eng", "source": "ENG" },
    "ecg.gainLabel": { "tag": "documented", "source": "research/05 §2.2" },
    "ecg.filters": { "tag": "documented", "source": "research/05 §2.2 (GE; Monitoring 0.05-32 Hz at 50 Hz mains); brief §6.8" },
    "ecg.filterDefault": { "tag": "eng", "source": "research/00 R12 (mains 50 Hz) [ENG]" },
    "limits.adult": { "tag": "unverified", "source": "brief §6.8", "note": "GE table not retrieved; not invented" },
    "limits.paed": { "tag": "unverified", "source": "brief §6.8" },
    "limits.neo": { "tag": "unverified", "source": "brief §6.8" }
  }
}
```

Create `packages/skins/src/data/skins/lifepak-like.json`:

```json
{
  "schema": "pme-skin/1",
  "kind": "skin",
  "id": "lifepak-like",
  "label": "LIFEPAK-like (defibrillator monitor)",
  "extends": "iec-defaults",
  "colors": {
    "ECG": "#00FF00", "HR": "#00FF00",
    "SpO2": "#00FFFF", "PLETH": "#00FFFF", "PR": "#00FFFF",
    "NIBP": "#FFFFFF",
    "ART": "#FF4040", "CVP": "#40A0FF", "PAP": "#FFFF00",
    "RESP": "#FFFFFF", "CO2": "#FFFF00", "AWRR": "#FFFF00",
    "TEMP": "#FFFFFF"
  },
  "layout": {
    "lanes": ["ECG1", "PLETH", "CO2"],
    "tiles": [
      [{ "param": "HR", "size": "large" }, { "param": "NIBP", "extras": ["MEAN"] }],
      [{ "param": "SpO2", "extras": ["PR"] }, { "param": "CO2", "extras": ["EtCO2", "AWRR"] }]
    ]
  },
  "sweep": { "co2": { "options": [12.5, 25], "default": 12.5 } },
  "ecg": { "laneLeads": ["II"] },
  "nibp": { "modeDefault": "MANUAL", "autoIntervalMin": null, "initialInflation": { "adult": 160, "paed": 140, "neo": 100 } },
  "beep": { "defaultOn": false },
  "syncMarker": "triangle-mid-qrs",
  "defib": { "energyAdultJ": 200, "energyPaedJ": 50, "aedSequenceJ": [200, 300, 360], "chargeTimeS": { "200": 7, "360": 10 }, "readyTimeoutS": 60, "toneSet": "lifepak-like" },
  "pacer": { "rateDefault": 60, "rateRange": [30, 180], "mADefault": 0, "mARange": [0, 140], "mAStep": { "up": 10, "down": 10 }, "modeDefault": "demand", "pausePct": 25 },
  "provenance": {
    "colors": { "tag": "assumed", "source": "research/05 §2.1", "note": "conventional parameter colours; no LIFEPAK factory table retrieved" },
    "layout.lanes": { "tag": "eng", "source": "ENG" },
    "layout.tiles": { "tag": "eng", "source": "ENG" },
    "sweep.co2": { "tag": "documented", "source": "research/05 §2.2 (screen CO2 12.5 mm/s); brief §6.8" },
    "ecg.laneLeads": { "tag": "documented", "source": "research/05 §2.2 (channel 1 lead II)" },
    "nibp.modeDefault": { "tag": "documented", "source": "research/05 §2.4 (auto interval OFF by default)" },
    "nibp.autoIntervalMin": { "tag": "documented", "source": "research/05 §2.4" },
    "nibp.initialInflation": { "tag": "documented", "source": "research/05 §2.4 (160 mmHg)", "note": "paed/neo [ENG]" },
    "beep.defaultOn": { "tag": "documented", "source": "research/05 §2.5 (SpO2 tone Off); brief §3.6" },
    "syncMarker": { "tag": "documented", "source": "research/05 §2.6 (triangle near the middle of each QRS)" },
    "defib.energyAdultJ": { "tag": "documented", "source": "research/05 §2.6 (pads 200 J); brief §6.5" },
    "defib.energyPaedJ": { "tag": "assumed", "source": "research/05 §2.6", "note": "LIFEPAK paediatric default not retrieved" },
    "defib.aedSequenceJ": { "tag": "documented", "source": "research/05 §2.6 (200-300-360)" },
    "defib.chargeTimeS": { "tag": "documented", "source": "research/05 §2.6 (200 J ≤7 s, 360 J ≤10 s)" },
    "defib.readyTimeoutS": { "tag": "documented", "source": "research/05 §2.6 (auto-disarm 60 s)" },
    "defib.toneSet": { "tag": "documented", "source": "research/05 §2.6 (ramping charge tone)" },
    "pacer.rateDefault": { "tag": "documented", "source": "research/05 §2.6 (60 ppm)" },
    "pacer.rateRange": { "tag": "assumed", "source": "brief §6.5 (30-180 ppm)", "note": "LIFEPAK range not retrieved" },
    "pacer.mADefault": { "tag": "documented", "source": "research/05 §2.6 (0 mA)" },
    "pacer.mARange": { "tag": "assumed", "source": "brief §6.5 (10-140 mA)" },
    "pacer.mAStep": { "tag": "documented", "source": "research/05 §2.6 (buttons step 10)" },
    "pacer.modeDefault": { "tag": "documented", "source": "research/05 §2.6 (Demand)" },
    "pacer.pausePct": { "tag": "documented", "source": "research/05 §2.6 (PAUSE paces at 25%)" }
  }
}
```

- [ ] **Step 4: Replace the registry**

```ts
// Every shipped skin, base, theme and preset (brief §3.8; build order R14: saadat-like → philips-like → zoll-like,
// then mindray-like, ge-like, lifepak-like). JSON imports are typed loosely, so they are cast once here; the
// schema tests are what guarantee the shapes.
import iecDefaults from './data/base/iec-defaults.json';
import geLike from './data/skins/ge-like.json';
import lifepakLike from './data/skins/lifepak-like.json';
import mindrayLike from './data/skins/mindray-like.json';
import philipsLike from './data/skins/philips-like.json';
import saadatLike from './data/skins/saadat-like.json';
import zollLike from './data/skins/zoll-like.json';
import type { DeepPartial, Preset, Skin, Theme } from './types.ts';

/** A skin file as stored: complete (no `extends`) or a partial over a base. */
export type SkinSource = DeepPartial<Skin> & Pick<Skin, 'schema' | 'kind' | 'id' | 'label' | 'provenance'> & { extends?: string };

export const BASES: Readonly<Record<string, SkinSource>> = { 'iec-defaults': iecDefaults as unknown as SkinSource };

export const SKINS: Readonly<Record<string, SkinSource>> = {
  'saadat-like': saadatLike as unknown as SkinSource,
  'philips-like': philipsLike as unknown as SkinSource,
  'zoll-like': zollLike as unknown as SkinSource,
  'mindray-like': mindrayLike as unknown as SkinSource,
  'ge-like': geLike as unknown as SkinSource,
  'lifepak-like': lifepakLike as unknown as SkinSource,
};

export const THEMES: Readonly<Record<string, Theme>> = {};

export const PRESETS: Readonly<Record<string, Preset>> = {};

/** Skin and preset ids in build order, then presets (the demo's switcher order). */
export const SKIN_IDS = Object.keys(SKINS);
export const PRESET_IDS = Object.keys(PRESETS);
export const THEME_IDS = Object.keys(THEMES);
```

- [ ] **Step 5: Run the package**

Run: `npx -y pnpm@9.15.9 --filter @pme/skins test && npx -y pnpm@9.15.9 --filter @pme/skins typecheck`
Expected: all pass; three snapshots written.

- [ ] **Step 6: Commit**

```bash
git add packages/skins/src packages/skins/test
git commit -m "feat(skins): mindray-like, ge-like (limits null, unverified) and lifepak-like" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Themes `projector-light` and `ecg-grid`

**Files:**
- Create: `packages/skins/src/data/themes/projector-light.json`, `packages/skins/src/data/themes/ecg-grid.json`
- Modify: `packages/skins/src/registry.ts` (replace)
- Test: `packages/skins/test/themes.test.ts`

**Interfaces:**
- Consumes: `applyTheme` inside `resolveSkin` (Task 5), `darkenToContrast` (Task 3).
- Produces: `THEMES`, `THEME_IDS = ['projector-light', 'ecg-grid']`; `resolveSkin(id, { theme })`.

- [ ] **Step 1: Write the failing test**

Create `packages/skins/test/themes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { contrastRatio, provenanceGaps, resolveSkin, SKIN_IDS, THEME_IDS, THEMES, type Provenance } from '../src/index.ts';
import { validate } from '../src/validate.ts';

describe('themes', () => {
  it.each(THEME_IDS)('%s validates and every field is sourced', (id) => {
    expect(validate('theme', THEMES[id]).errors).toEqual([]);
    const t = THEMES[id] as unknown as Record<string, unknown> & { provenance: Provenance };
    expect(provenanceGaps(t, t.provenance)).toEqual({ uncovered: [], dangling: [] });
  });

  it.each(THEME_IDS.flatMap((t) => SKIN_IDS.map((s) => [s, t] as const)))('%s + %s still validates', (s, t) => {
    expect(validate('skin', resolveSkin(s, { theme: t }).skin).errors).toEqual([]);
  });

  it('projector-light: white background, every colour darkened to ≥ 4.5:1, bars grey', () => {
    const r = resolveSkin('saadat-like', { theme: 'projector-light' });
    expect(r.render.background).toBe('#FFFFFF');
    expect(r.themeId).toBe('projector-light');
    for (const c of Object.values(r.skin.colors)) expect(contrastRatio(c as string, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(r.skin.alarms.messageBar.idle).toEqual({ bg: '#E0E0E0', fg: '#000000' });
    expect(r.provenance.colors?.source).toContain('projector-light');
  });

  it('ecg-grid: 1 mm / 5 mm grid on paper', () => {
    expect(resolveSkin('philips-like', { theme: 'ecg-grid' }).render.grid).toMatchObject({ minorMm: 1, majorMm: 5 });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/skins exec vitest run test/themes.test.ts`
Expected: FAIL, `unknown theme: projector-light`.

- [ ] **Step 3: Write the themes**

Create `packages/skins/src/data/themes/projector-light.json`:

```json
{
  "schema": "pme-theme/1",
  "kind": "theme",
  "id": "projector-light",
  "label": "Projector (light background)",
  "scheme": "projector-light",
  "background": "#FFFFFF",
  "foreground": "#000000",
  "chrome": { "divider": "#A0A0A0", "windowFrame": "#404040", "pageBox": { "bg": "#000000", "fg": "#FFFFFF" }, "patientCategoryColor": "#000000", "grid": null },
  "colorTransform": { "kind": "darken-to-contrast", "minRatio": 4.5 },
  "messageBarIdle": { "bg": "#E0E0E0", "fg": "#000000" },
  "provenance": {
    "scheme": { "tag": "documented", "source": "research/05 §2.7 (Infirmary Integrated 'Light' projector scheme); brief §3.8" },
    "background": { "tag": "eng", "source": "ENG" },
    "foreground": { "tag": "eng", "source": "ENG" },
    "chrome": { "tag": "eng", "source": "ENG" },
    "colorTransform": { "tag": "eng", "source": "ENG", "note": "keep hue, darken to WCAG 4.5:1 on white" },
    "messageBarIdle": { "tag": "eng", "source": "ENG" }
  }
}
```

Create `packages/skins/src/data/themes/ecg-grid.json`:

```json
{
  "schema": "pme-theme/1",
  "kind": "theme",
  "id": "ecg-grid",
  "label": "ECG paper grid",
  "scheme": "ecg-grid",
  "background": "#FFF8F4",
  "foreground": "#000000",
  "chrome": {
    "divider": "#C0A0A0", "windowFrame": "#404040", "pageBox": { "bg": "#000000", "fg": "#FFFFFF" }, "patientCategoryColor": "#000000",
    "grid": { "minorMm": 1, "majorMm": 5, "minor": "#F4C8C8", "major": "#E08888" }
  },
  "colorTransform": { "kind": "darken-to-contrast", "minRatio": 4.5 },
  "messageBarIdle": { "bg": "#E0E0E0", "fg": "#000000" },
  "provenance": {
    "scheme": { "tag": "documented", "source": "research/05 §2.7 (Infirmary Integrated 'Grid' scheme); brief §3.8" },
    "background": { "tag": "eng", "source": "ENG", "note": "ECG paper tint" },
    "foreground": { "tag": "eng", "source": "ENG" },
    "chrome.grid": { "tag": "documented", "source": "brief §6.6 (25 mm/s, 10 mm/mV paper: 1 mm minor, 5 mm major)", "note": "grid colours [ENG]" },
    "chrome": { "tag": "eng", "source": "ENG" },
    "colorTransform": { "tag": "eng", "source": "ENG" },
    "messageBarIdle": { "tag": "eng", "source": "ENG" }
  }
}
```

- [ ] **Step 4: Replace the registry**

```ts
// Every shipped skin, base, theme and preset (brief §3.8; build order R14: saadat-like → philips-like → zoll-like,
// then mindray-like, ge-like, lifepak-like). JSON imports are typed loosely, so they are cast once here; the
// schema tests are what guarantee the shapes.
import iecDefaults from './data/base/iec-defaults.json';
import geLike from './data/skins/ge-like.json';
import lifepakLike from './data/skins/lifepak-like.json';
import mindrayLike from './data/skins/mindray-like.json';
import philipsLike from './data/skins/philips-like.json';
import saadatLike from './data/skins/saadat-like.json';
import zollLike from './data/skins/zoll-like.json';
import ecgGrid from './data/themes/ecg-grid.json';
import projectorLight from './data/themes/projector-light.json';
import type { DeepPartial, Preset, Skin, Theme } from './types.ts';

/** A skin file as stored: complete (no `extends`) or a partial over a base. */
export type SkinSource = DeepPartial<Skin> & Pick<Skin, 'schema' | 'kind' | 'id' | 'label' | 'provenance'> & { extends?: string };

export const BASES: Readonly<Record<string, SkinSource>> = { 'iec-defaults': iecDefaults as unknown as SkinSource };

export const SKINS: Readonly<Record<string, SkinSource>> = {
  'saadat-like': saadatLike as unknown as SkinSource,
  'philips-like': philipsLike as unknown as SkinSource,
  'zoll-like': zollLike as unknown as SkinSource,
  'mindray-like': mindrayLike as unknown as SkinSource,
  'ge-like': geLike as unknown as SkinSource,
  'lifepak-like': lifepakLike as unknown as SkinSource,
};

export const THEMES: Readonly<Record<string, Theme>> = {
  'projector-light': projectorLight as unknown as Theme,
  'ecg-grid': ecgGrid as unknown as Theme,
};

export const PRESETS: Readonly<Record<string, Preset>> = {};

/** Skin and preset ids in build order, then presets (the demo's switcher order). */
export const SKIN_IDS = Object.keys(SKINS);
export const PRESET_IDS = Object.keys(PRESETS);
export const THEME_IDS = Object.keys(THEMES);
```

- [ ] **Step 5: Run the package**

Run: `npx -y pnpm@9.15.9 --filter @pme/skins test && npx -y pnpm@9.15.9 --filter @pme/skins typecheck`
Expected: all pass; the contrast suite now runs every skin × {none, projector-light, ecg-grid}; 12 theme snapshots written.

- [ ] **Step 6: Commit**

```bash
git add packages/skins/src packages/skins/test
git commit -m "feat(skins): projector-light and ecg-grid themes (hue-preserving darken to 4.5:1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Preset `iran-icu-as-found` and the Solar calendar

**Files:**
- Create: `packages/skins/src/data/presets/iran-icu-as-found.json`, `packages/skins/src/calendar.ts`
- Modify: `packages/skins/src/registry.ts` (replace), `packages/skins/src/index.ts` (append one line)
- Test: `packages/skins/test/preset.test.ts`

**Interfaces:**
- Produces: `PRESETS['iran-icu-as-found']`, `PRESET_IDS`; `resolveSkin('iran-icu-as-found')` (skinId `saadat-like`, `preset.alarmSwitches`, `preset.startState.apneaLimit = 'OFF'`); `formatDate(d: Date, calendar: 'gregorian' | 'solar', gregorianFormat?): string`.

The preset reproduces brief §6.9 / research 06 §3.1 F7 (one Aparat video, n = 1): MONITOR filter, lead II ×2 on two lanes, HR AVERAGE 16 from ECG, BEAT VOLUME OFF, Solar date, crossed bells on HR and RR, NIBP and SpO2 alarms on, APNEA LIMIT OFF, resp lane at 12.5 mm/s.

- [ ] **Step 1: Write the failing test**

Create `packages/skins/test/preset.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatDate, PRESET_IDS, PRESETS, provenanceGaps, resolveSkin } from '../src/index.ts';
import { validate } from '../src/validate.ts';

describe('preset iran-icu-as-found (brief §6.9)', () => {
  it.each(PRESET_IDS)('%s validates and every override is sourced', (id) => {
    const p = PRESETS[id]!;
    expect(validate('preset', p).errors).toEqual([]);
    const doc = { overrides: p.overrides, alarmSwitches: p.alarmSwitches, startState: p.startState };
    expect(provenanceGaps(doc, p.provenance)).toEqual({ uncovered: [], dangling: [] });
  });

  it('MONITOR filter, lead II ×2 on two lanes, HR 16 s from ECG, beep off, solar date, HR/RR alarms off, APNEA LIMIT OFF', () => {
    const r = resolveSkin('iran-icu-as-found');
    expect(r.skinId).toBe('saadat-like');
    expect(r.presetId).toBe('iran-icu-as-found');
    expect(r.render.ecgFilter).toMatchObject({ name: 'MONITOR', band: [0.5, 24], exact: false });
    expect(r.skin.hr).toMatchObject({ windowDefault: 16, source: 'ECG' });
    expect(r.audio.beep.enabled).toBe(false);
    expect(r.skin.calendar.default).toBe('solar');
    expect(r.render.lanes.map((l) => l.label)).toEqual(['II  X2  MONITOR', 'II  X2  MONITOR', 'PLETH', 'RESP']);
    expect(r.preset).toEqual({ alarmSwitches: { HR: false, RR: false, NIBP: true, SpO2: true }, startState: { apneaLimit: 'OFF' } });
    expect(r.provenance['ecg.filterDefault']?.source).toContain('F7');
  });

  it('the base skin stays factory (the preset does not leak)', () => {
    resolveSkin('iran-icu-as-found');
    expect(resolveSkin('saadat-like').skin.calendar.default).toBe('gregorian');
  });
});

describe('formatDate', () => {
  const d = new Date(Date.UTC(2023, 5, 25));
  it('solar = Jalali YYYY/MM/DD with Latin digits (research 06 F7 shows 1402/04/04)', () => {
    expect(formatDate(d, 'solar')).toBe('1402/04/04');
  });
  it('gregorian formats', () => {
    expect(formatDate(d, 'gregorian', 'DD/MM/YYYY')).toBe('25/06/2023');
    expect(formatDate(d, 'gregorian', 'MM/DD/YYYY')).toBe('06/25/2023');
    expect(formatDate(d, 'gregorian', 'YYYY-MM-DD')).toBe('2023-06-25');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/skins exec vitest run test/preset.test.ts`
Expected: FAIL (`formatDate` not exported / unknown skin `iran-icu-as-found`).

- [ ] **Step 3: Write the preset and the calendar helper**

Create `packages/skins/src/data/presets/iran-icu-as-found.json`:

```json
{
  "schema": "pme-preset/1",
  "kind": "preset",
  "id": "iran-icu-as-found",
  "label": "Saadat-like, Iranian ICU as found",
  "base": "saadat-like",
  "overrides": {
    "layout": { "lanes": ["ECG1", "ECG2", "PLETH", "RESP"] },
    "calendar": { "default": "solar" },
    "ecg": { "laneLeads": ["II", "II"], "gainDefault": 2, "filterDefault": "MONITOR" },
    "hr": { "windowDefault": 16, "source": "ECG" },
    "beep": { "defaultOn": false },
    "sweep": { "resp": { "options": [3, 6, 12.5, 25], "default": 12.5 } }
  },
  "alarmSwitches": { "HR": false, "RR": false, "NIBP": true, "SpO2": true },
  "startState": { "apneaLimit": "OFF" },
  "provenance": {
    "overrides.layout.lanes": { "tag": "documented", "source": "research/06 §3.1 F7 (S8: ECG lanes 1 and 2, pleth, flat resp)" },
    "overrides.calendar.default": { "tag": "documented", "source": "research/06 §3.1 F7 (date 1402/04/04); brief §6.9" },
    "overrides.ecg.laneLeads": { "tag": "documented", "source": "research/06 §3.1 F7 (lead II on two lanes)" },
    "overrides.ecg.gainDefault": { "tag": "documented", "source": "research/06 §3.1 F7 (X2; later X1.25 [unverified])" },
    "overrides.ecg.filterDefault": { "tag": "documented", "source": "research/06 §3.1 F7; brief §6.9" },
    "overrides.hr.windowDefault": { "tag": "documented", "source": "research/06 §3.1 F7 (HR AVERAGE 16); brief §6.9" },
    "overrides.hr.source": { "tag": "documented", "source": "research/06 §3.1 F7 (HR SOURCE ECG)" },
    "overrides.beep.defaultOn": { "tag": "documented", "source": "research/06 §3.1 F7 (BEAT VOLUME OFF); brief §6.9" },
    "overrides.sweep.resp": { "tag": "documented", "source": "research/06 §3.1 F7 ('RA_LA X0.25 12.5 mm/s')" },
    "alarmSwitches": { "tag": "documented", "source": "research/06 §3.1 F7 (crossed bells on HR and RR; NIBP and SpO2 limits shown)", "note": "n = 1 video [S8]" },
    "startState.apneaLimit": { "tag": "documented", "source": "research/06 §3.1 F7 ('APNEA LIMIT: OFF'); brief §6.9" }
  }
}
```

Create `packages/skins/src/calendar.ts`:

```ts
// Header / trend date formatting (brief §3.8 `calendar`; research 06 §5.1 item 13): Gregorian in the skin's
// format, or Solar Hijri (Jalali) as YYYY/MM/DD with Latin digits through Intl's persian calendar.
import type { Skin } from './types.ts';

export function formatDate(d: Date, calendar: 'gregorian' | 'solar', gregorianFormat: Skin['calendar']['gregorianFormat'] = 'DD/MM/YYYY'): string {
  if (calendar === 'solar') {
    const parts = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    return `${get('year')}/${get('month')}/${get('day')}`;
  }
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getUTCFullYear());
  return gregorianFormat === 'MM/DD/YYYY' ? `${mm}/${dd}/${yyyy}` : gregorianFormat === 'YYYY-MM-DD' ? `${yyyy}-${mm}-${dd}` : `${dd}/${mm}/${yyyy}`;
}
```

- [ ] **Step 4: Replace the registry and export `formatDate`**

```ts
// Every shipped skin, base, theme and preset (brief §3.8; build order R14: saadat-like → philips-like → zoll-like,
// then mindray-like, ge-like, lifepak-like). JSON imports are typed loosely, so they are cast once here; the
// schema tests are what guarantee the shapes.
import iecDefaults from './data/base/iec-defaults.json';
import iranIcuAsFound from './data/presets/iran-icu-as-found.json';
import geLike from './data/skins/ge-like.json';
import lifepakLike from './data/skins/lifepak-like.json';
import mindrayLike from './data/skins/mindray-like.json';
import philipsLike from './data/skins/philips-like.json';
import saadatLike from './data/skins/saadat-like.json';
import zollLike from './data/skins/zoll-like.json';
import ecgGrid from './data/themes/ecg-grid.json';
import projectorLight from './data/themes/projector-light.json';
import type { DeepPartial, Preset, Skin, Theme } from './types.ts';

/** A skin file as stored: complete (no `extends`) or a partial over a base. */
export type SkinSource = DeepPartial<Skin> & Pick<Skin, 'schema' | 'kind' | 'id' | 'label' | 'provenance'> & { extends?: string };

export const BASES: Readonly<Record<string, SkinSource>> = { 'iec-defaults': iecDefaults as unknown as SkinSource };

export const SKINS: Readonly<Record<string, SkinSource>> = {
  'saadat-like': saadatLike as unknown as SkinSource,
  'philips-like': philipsLike as unknown as SkinSource,
  'zoll-like': zollLike as unknown as SkinSource,
  'mindray-like': mindrayLike as unknown as SkinSource,
  'ge-like': geLike as unknown as SkinSource,
  'lifepak-like': lifepakLike as unknown as SkinSource,
};

export const THEMES: Readonly<Record<string, Theme>> = {
  'projector-light': projectorLight as unknown as Theme,
  'ecg-grid': ecgGrid as unknown as Theme,
};

export const PRESETS: Readonly<Record<string, Preset>> = {
  'iran-icu-as-found': iranIcuAsFound as unknown as Preset,
};

/** Skin and preset ids in build order, then presets (the demo's switcher order). */
export const SKIN_IDS = Object.keys(SKINS);
export const PRESET_IDS = Object.keys(PRESETS);
export const THEME_IDS = Object.keys(THEMES);
```

Append to `packages/skins/src/index.ts`:

```ts
export { formatDate } from './calendar.ts';
```

- [ ] **Step 5: Run the package, typecheck and build**

Run: `npx -y pnpm@9.15.9 --filter @pme/skins test && npx -y pnpm@9.15.9 --filter @pme/skins typecheck && npx -y pnpm@9.15.9 --filter @pme/skins build && ! grep -q "ajv" packages/skins/dist/index.js && echo "no ajv in the bundle"`
Expected: 13 files, **155 passed**, 21 snapshots in total; build ≈ 58 kB; `no ajv in the bundle`.

- [ ] **Step 6: Commit**

```bash
git add packages/skins/src packages/skins/test
git commit -m "feat(skins): iran-icu-as-found preset and Solar (Jalali) date formatting" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: The contract document

**Files:**
- Create: `packages/skins/CONTRACT.md`

**Interfaces:**
- Consumes: `ResolvedSkin` (Task 5), the audio API names from Tasks 12–16 (written here so Stage 4b has one page to read; the names are fixed by this plan).
- Produces: the field-by-field mapping Stage 4b implements, and the renderer/engine request IDs RR-1…RR-6, E-4a-1…E-4a-3.

- [ ] **Step 1: Write the document**

Create `packages/skins/CONTRACT.md`:

````markdown
# @pme/skins: the renderer and audio contract

Stage 4a ships skins as validated data; Stage 4b wires them into the live monitor. This file is the contract between
the two: `resolveSkin(id, { theme? })` returns a `ResolvedSkin`, and every field below maps onto an option that exists
on `main` **today**, or is listed as a request.

```ts
import { resolveSkin } from '@pme/skins';            // no ajv in this entry
import { validate } from '@pme/skins/validate';       // ajv; for user-supplied skins only
const r = resolveSkin('iran-icu-as-found', { theme: 'projector-light' });
```

Resolution order: base (`iec-defaults`, vendor skins only) ← skin file ← preset overrides ← theme. Arrays replace,
objects merge. `r.provenance` is merged the same way, so every leaf of `r.skin` has a covering
`{ tag, source }` entry (tested).

## Renderer (`r.render`) → what the renderer takes today

| ResolvedSkin field | Today's option | File on main | Notes |
|---|---|---|---|
| `render.background` | `LaneConfig.background`, `THEME.background` | `packages/renderer/src/sweep-lane.ts`, `monitor-core.ts` | THEME is hard-coded (request RR-1) |
| `render.lanes[i].color` | `LaneConfig.color` | `sweep-lane.ts` | byLabel / byChannel already applied |
| `render.lanes[i].mmPerS` | `LaneConfig.mmPerS` | `sweep-lane.ts` | per-lane sweep default |
| `render.lanes[i].gainMmPerMv` | `LaneConfig.gainMmPerMv` | `sweep-lane.ts` | multiplier × 10 mm/mV; AUTO → 10 plus `autoGain: true` (RR-2) |
| `render.lanes[i].label` | lead label text in `drawChrome` | `monitor-core.ts` | from `ecg.laneLabel` (`'II  X1  NORMAL'`, `'II  M'`) |
| `render.lineWidth` | `LaneConfig.lineWidth` | `sweep-lane.ts` | CSS px |
| `render.eraseGapPx` | `LaneConfig.eraseGapPx` | `sweep-lane.ts` | saadat-like 4 [inferred], others 16 |
| `render.cursorLine` | — | — | request RR-3 (all shipped skins say `false`) |
| `render.grid` | — | — | ECG-paper grid (theme `ecg-grid`); `SweepLane` paints solid background (RR-4) |
| `render.fontStack`, `numericWeight` | `NumericTile` inline CSS; `ctx.font` in `drawChrome` | `numerics-dom.ts`, `monitor-core.ts` | RR-5 |
| `render.tileColors[param]` | `TileOptions.color` | `numerics-dom.ts` | HR tile today: `#00ff66` hard-coded |
| `render.ecgFilter.engineMode` | `device ecg filter` command value `'monitor' \| 'diagnostic'` | `engine-core/src/types.ts` `EcgFilterMode` | `exact: false` when the skin's band is not one of the engine's two (E-4a-1) |
| `render.hrMethod.engine` | `HrMethod` `'dropMaxMin' \| 'mean12'` | `engine-core/src/l3/hr.ts` | `null` for `moving-average-seconds` (E-4a-2) |
| `r.skin.ecg.laneLeads` | `CoreOptions.lanes` (`'II'` → `'ecgII'`, `'V1'` → `'V1'`, `'V'` → `'V1'`) | `renderer/src/protocol.ts` | |
| `r.skin.sweep.*.options`, `ecg.gainOptions`, `ecg.filters` | display-settings menus | — | Stage 4b |

`MountOptions.skin?: string` already exists on main (`mount.ts`), and today it throws for anything but
`'philips-like'`. Stage 4b replaces that check with `resolveSkin(opts.skin)`. Stage 4a does not touch it.

## Audio (`r.audio`) → what @pme/audio takes

| ResolvedSkin field | @pme/audio API | Notes |
|---|---|---|
| `audio.alarm.profile` | `getAlarmProfile(id)` → `AlarmSoundProfile` | `'iec-style' \| 'traditional' \| 'saadat'` |
| `audio.alarm.repeatS`, `lowPulses`, `volume`, `silence` | `new AlarmSounder(scheduler, profile, { overrides })` | the skin's cadence overrides (ZOLL-like 15/30/none, Philips-like 2-pulse INOP) |
| `audio.beep.pitchMap`, `baseHz` | `pitchHz(map, spo2, baseHz)` → the `freqHz` of a `qrs`/`pulse` tone | `'none'` = fixed pitch |
| `audio.beep.enabled`, `volume` | whether mount enqueues beep tones; gain | Stage 4b |
| `r.skin.defib.toneSet` | `createTonePlayer(ctx, dest, { profile, toneSet })` | charge / chargeReady / shock / nibpDone |
| (all tone kinds) | `ToneScheduler({ play: createTonePlayer(...) })` | replaces `play: playBeep` in `mount.ts` (RR-6) |

Alarm tone ids are `alarm:<alarmId>:<train>:<burst>:<pulse>`, never reused, so `ToneScheduler.cancel(ids)` stops
pulses already handed to Web Audio.

## Alarm visuals (data only in 4a)

`r.skin.alarms.lamp` (`L1..L3` style plus `flashHz` and `duty`), `messageBar` (`bg`/`fg` per level, idle, acknowledged,
`prefix`, `rotate`), `numericFlash`, `alarmOffIcon`, `factoryEnabled`, `alwaysOn`, `silence.suppressesVisual`,
`silence.headerCountdown`: consumed by the Stage 4b alarm engine and alarm bar. The 4a preview page draws the
bars and lamps from these fields.

## Limits

`r.limits[band]` has inheritance applied. `r.approximateLimits[band]` lists the keys a band took from another band
(saadat-like paediatric and neonatal HR, SpO2, RR and Temp), which the UI must mark approximate (brief §6.8).
A `null` table or cell means "not published" and must never be filled with invented values.
````

- [ ] **Step 2: Check every file and symbol it names exists on this branch or is marked as a request**

Run: `grep -n "LaneConfig\|eraseGapPx\|gainMmPerMv\|THEME\b\|drawChrome\|TileOptions" packages/renderer/src/*.ts | head -20 && grep -n "EcgFilterMode\|HrMethod" packages/engine-core/src/types.ts packages/engine-core/src/l3/hr.ts`
Expected: each renderer/engine name in the table appears in the output.

- [ ] **Step 3: Commit**

```bash
git add packages/skins/CONTRACT.md
git commit -m "docs(skins): renderer/audio contract for Stage 4b" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Alarm sound profiles as data (`iec-style`, `saadat`, `traditional`)

**Files:**
- Create: `packages/audio/src/profiles/types.ts`, `packages/audio/src/profiles/iec-style.ts`, `packages/audio/src/profiles/saadat.ts`, `packages/audio/src/profiles/traditional.ts`, `packages/audio/src/profiles/index.ts`
- Modify: `packages/audio/src/index.ts` (append one line)
- Test: `packages/audio/test/profiles.test.ts`

**Interfaces:**
- Produces: `type AlarmLevel = 1 | 2 | 3`, `type LevelKey = 'L1' | 'L2' | 'L3'`, `levelKey(l)`, `LevelSound { pulseMs, freqHz, gapsMs, repeatS: number | null, levelDb }`, `VolumeCurve { min, max, default, dbPerStep, maxGain }`, `AlarmSoundProfile { id, label, claim, levels, harmonicsDb, rampMs, volume, silence: { durationS, cancelOnNewAlarm }, provenance }`, `ProfileOverrides { repeatS?, lowPulses?, volume?, silence? }` (the skin's `ResolvedSkin.audio.alarm` fits it); `IEC_STYLE`, `SAADAT`, `TRADITIONAL`, `ALARM_PROFILES`, `getAlarmProfile(id)`.

- [ ] **Step 1: Write the failing test**

Create `packages/audio/test/profiles.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ALARM_PROFILES, getAlarmProfile } from '../src/profiles/index.ts';

describe('alarm profiles as data', () => {
  it.each(Object.values(ALARM_PROFILES))('$id: fundamentals in 150–1000 Hz, ≥ 4 harmonics within 15 dB, ramps ≥ 10 ms', (p) => {
    for (const l of Object.values(p.levels)) {
      expect(l.freqHz).toBeGreaterThanOrEqual(150);
      expect(l.freqHz).toBeLessThanOrEqual(1000);
    }
    const top4 = [...p.harmonicsDb].sort((a, b) => b - a).slice(0, 4);
    expect(top4).toHaveLength(4);
    expect((top4[0] as number) - (top4[3] as number)).toBeLessThanOrEqual(15);
    expect(p.rampMs).toBeGreaterThanOrEqual(10);
  });

  it.each(Object.values(ALARM_PROFILES))('$id: priorities are 3–6 dB apart', (p) => {
    expect(p.levels.L1.levelDb - p.levels.L2.levelDb).toBeGreaterThanOrEqual(3);
    expect(p.levels.L1.levelDb - p.levels.L2.levelDb).toBeLessThanOrEqual(6);
    expect(p.levels.L2.levelDb - p.levels.L3.levelDb).toBeGreaterThanOrEqual(3);
    expect(p.levels.L2.levelDb - p.levels.L3.levelDb).toBeLessThanOrEqual(6);
  });

  it.each(Object.values(ALARM_PROFILES))('$id: every provenance source cites a report or brief section', (p) => {
    for (const [k, e] of Object.entries(p.provenance)) expect(e.source, k).toMatch(/(research\/0[0-6] §\d|brief §\d|^ENG)/);
  });

  it('saadat keeps its [assumed] timing and [unverified] pitch tags', () => {
    const p = getAlarmProfile('saadat').provenance;
    expect(p['levels.L1.gapsMs']?.tag).toBe('assumed');
    expect(p['levels.L1.freqHz']?.tag).toBe('unverified');
    expect(p['levels.L3.repeatS']?.tag).toBe('documented');
  });

  it('unknown profile throws', () => {
    expect(() => getAlarmProfile('iso')).toThrow(/unknown alarm sound profile/);
  });

});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/audio exec vitest run test/profiles.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the profile types and data**

Create `packages/audio/src/profiles/types.ts`:

```ts
// Alarm sound profiles as DATA (brief §3.6, §6.4, §6.4.1). A skin names its profile (`alarms.soundProfile`) and may
// override `repeatS` per level and the low-priority pulse count; everything else about the sound lives here.
// Levels are 1..3, 1 = highest (the IEC "high/medium/low" and Saadat "1/2/3" are display names only).

export type AlarmLevel = 1 | 2 | 3;
export type LevelKey = 'L1' | 'L2' | 'L3';
export const levelKey = (l: AlarmLevel): LevelKey => `L${l}` as LevelKey;

export interface ProvEntry {
  tag: 'documented' | 'measured' | 'assumed' | 'unverified' | 'conflict' | 'inferred' | 'eng';
  source: string;
  note?: string;
}

/** One level's burst: `gapsMs[i]` is the silence between pulse i's end and pulse i+1's start (pulses = gaps + 1). */
export interface LevelSound {
  pulseMs: number;
  freqHz: number;
  gapsMs: number[];
  /** Burst-start to burst-start (s); null = sounds once and does not repeat. */
  repeatS: number | null;
  /** Level relative to L1 (dB), so priorities are 3–6 dB apart (brief §6.4). */
  levelDb: number;
}

export interface VolumeCurve {
  min: number;
  max: number;
  default: number;
  /** Loudness change per volume step (dB); the gain at `max` is `maxGain`, step `min` of 0 means silent. */
  dbPerStep: number;
  maxGain: number;
}

export interface AlarmSoundProfile {
  id: 'iec-style' | 'traditional' | 'saadat';
  label: string;
  /** What we claim (and don't): shown in the demo next to the profile. */
  claim: string;
  levels: Record<LevelKey, LevelSound>;
  /** Harmonics 1..n of every pulse, dB relative to the fundamental (brief §6.4 PeriodicWave). */
  harmonicsDb: number[];
  /** Linear attack and release (ms); IEC Amd 1 requires ≥ 10 ms (brief §6.4). */
  rampMs: number;
  volume: VolumeCurve;
  silence: { durationS: number; cancelOnNewAlarm: boolean };
  provenance: Record<string, ProvEntry>;
}

/** Per-skin overrides (skin `alarms.repeatS`, `alarms.lowPulses`, `alarms.volume`, `alarms.silence`). */
export interface ProfileOverrides {
  repeatS?: Partial<Record<LevelKey, number | null>>;
  lowPulses?: 1 | 2 | null;
  volume?: { min: number; max: number; default: number };
  silence?: { durationS: number; cancelOnNewAlarm: boolean };
}
```

Create `packages/audio/src/profiles/iec-style.ts`:

```ts
// `iec-style` profile (brief §6.4 burst table; research 05 §2.5 quoting the IEC 60601-1-8 Table 3/4 ranges via
// US 9,814,817 B2). Values are chosen INSIDE the quoted ranges; the profile is labelled IEC-style and no
// compliance is claimed (R12, brief §11 C7).
import type { AlarmSoundProfile } from './types.ts';

const TD_HIGH = 150; // t_d high, 75–200 ms
const X = 100; // x, 50–125 ms
const GROUP_GAP = 600; // silence between the two 5-pulse groups, 0.35–1.30 s [ENG: measured end-to-start]
const GROUP = [X, X, 2 * X + TD_HIGH, X]; // 3+2 rhythm inside one 5-pulse group

export const IEC_STYLE: AlarmSoundProfile = {
  id: 'iec-style',
  label: 'IEC-style (ISO) bursts',
  claim: 'IEC-style: timings chosen inside the published IEC 60601-1-8 ranges; not a compliance claim.',
  levels: {
    L1: { pulseMs: TD_HIGH, freqHz: 880, gapsMs: [...GROUP, GROUP_GAP, ...GROUP], repeatS: 10, levelDb: 0 },
    L2: { pulseMs: 200, freqHz: 660, gapsMs: [200, 200], repeatS: 20, levelDb: -4 },
    L3: { pulseMs: 200, freqHz: 523, gapsMs: [], repeatS: null, levelDb: -8 },
  },
  harmonicsDb: [0, -3, -6, -9, -12],
  rampMs: 15,
  volume: { min: 0, max: 10, default: 5, dbPerStep: 3, maxGain: 0.5 },
  silence: { durationS: 90, cancelOnNewAlarm: false },
  provenance: {
    'levels.L1': { tag: 'documented', source: 'brief §6.4; research/05 §2.5', note: 't_d 150 (75–200), x 100 (50–125), groups 0.6 s (0.35–1.30), 10 s (2.5–15); 880 Hz [ENG]' },
    'levels.L2': { tag: 'documented', source: 'brief §6.4; research/05 §2.5', note: 't_d 200, y 200 (125–250), 20 s (2.5–30); 660 Hz [ENG]' },
    'levels.L3': { tag: 'documented', source: 'brief §6.4; research/05 §2.5', note: '1 pulse, 200 ms, not repeated (ZOLL); 523 Hz [ENG]' },
    'levels.L2.levelDb': { tag: 'eng', source: 'brief §6.4 (priorities 3–6 dB apart)' },
    'levels.L3.levelDb': { tag: 'eng', source: 'brief §6.4 (priorities 3–6 dB apart)' },
    harmonicsDb: { tag: 'documented', source: 'brief §6.4 (harmonics 1–5 at 0/−3/−6/−9/−12 dB)' },
    rampMs: { tag: 'documented', source: 'brief §6.4 (15 ms; Amd 1 ≥ 10 ms)' },
    volume: { tag: 'documented', source: 'brief §6.4 (volume 0–10)', note: '3 dB/step, default 5 and max gain [ENG]' },
    silence: { tag: 'documented', source: 'brief §6.4 (silence 90 s)' },
  },
};
```

Create `packages/audio/src/profiles/saadat.ts`:

```ts
// `saadat` profile (brief §6.4.1; research 06 §4.2, M p.47, 49): L1 "DO-DO-DO--DO-DO" (one 3+2 group of 5 pulses)
// every 10 s, L2 "DO-DO-DO" every 20 s, L3 "DO" every 30 s (it repeats, unlike IEC low). Pattern and repeat times
// are documented; pulse length, gaps and pitch are NOT published and are [assumed] until Ali's recordings.
import type { AlarmSoundProfile } from './types.ts';

const PULSE = 150; // [assumed]
const GAP = 100; // [assumed]
const LONG_GAP = 300; // the "--" in DO-DO-DO--DO-DO [assumed]
const PITCH = 880; // [assumed]

export const SAADAT: AlarmSoundProfile = {
  id: 'saadat',
  label: 'Saadat-like (B9 family)',
  claim: 'Saadat-like: patterns from the B9 manual; pulse timing and pitch assumed; Saadat claims no IEC 60601-1-8 conformance.',
  levels: {
    L1: { pulseMs: PULSE, freqHz: PITCH, gapsMs: [GAP, GAP, LONG_GAP, GAP], repeatS: 10, levelDb: 0 },
    L2: { pulseMs: PULSE, freqHz: PITCH, gapsMs: [GAP, GAP], repeatS: 20, levelDb: -4 },
    L3: { pulseMs: PULSE, freqHz: PITCH, gapsMs: [], repeatS: 30, levelDb: -8 },
  },
  harmonicsDb: [0, -3, -6, -9, -12],
  rampMs: 15,
  volume: { min: 1, max: 7, default: 1, dbPerStep: 22 / 6, maxGain: 0.5 },
  silence: { durationS: 120, cancelOnNewAlarm: true },
  provenance: {
    'levels.L1.gapsMs': { tag: 'assumed', source: 'brief §6.4.1; research/06 §4.2 (M p.47)', note: 'pattern documented; 100/300 ms gaps assumed' },
    'levels.L1.repeatS': { tag: 'documented', source: 'brief §6.4.1; research/06 §4.2 (M p.47)' },
    'levels.L2.gapsMs': { tag: 'assumed', source: 'brief §6.4.1', note: '3 pulses documented; gaps assumed' },
    'levels.L2.repeatS': { tag: 'documented', source: 'brief §6.4.1; research/06 §4.2 (M p.47)' },
    'levels.L3.gapsMs': { tag: 'documented', source: 'brief §6.4.1 (one pulse)' },
    'levels.L3.repeatS': { tag: 'documented', source: 'brief §6.4.1; research/06 §4.2 (M p.47)' },
    'levels.L1.pulseMs': { tag: 'assumed', source: 'brief §6.4.1' },
    'levels.L2.pulseMs': { tag: 'assumed', source: 'brief §6.4.1' },
    'levels.L3.pulseMs': { tag: 'assumed', source: 'brief §6.4.1' },
    'levels.L1.freqHz': { tag: 'unverified', source: 'brief §6.4.1; research/06 §7', note: 'pitch not published; 880 Hz assumed' },
    'levels.L2.freqHz': { tag: 'unverified', source: 'brief §6.4.1; research/06 §7' },
    'levels.L3.freqHz': { tag: 'unverified', source: 'brief §6.4.1; research/06 §7' },
    'levels.L1.levelDb': { tag: 'assumed', source: 'brief §6.4 (priorities 3–6 dB apart)' },
    'levels.L2.levelDb': { tag: 'assumed', source: 'brief §6.4 (priorities 3–6 dB apart)' },
    'levels.L3.levelDb': { tag: 'assumed', source: 'brief §6.4 (priorities 3–6 dB apart)' },
    harmonicsDb: { tag: 'eng', source: 'brief §6.4.1 (reuse the §6.4 PeriodicWave until recordings)' },
    rampMs: { tag: 'eng', source: 'brief §6.4' },
    'volume.min': { tag: 'documented', source: 'brief §6.4.1; research/06 §4.2 (M p.49, 308)' },
    'volume.max': { tag: 'documented', source: 'brief §6.4.1; research/06 §4.2' },
    'volume.default': { tag: 'documented', source: 'brief §6.4.1 (factory 1)' },
    'volume.dbPerStep': { tag: 'documented', source: 'brief §6.4.1 (47–69 dB(A) at 1 m over 7 steps = 22/6 dB per step)' },
    'volume.maxGain': { tag: 'eng', source: 'ENG' },
    silence: { tag: 'documented', source: 'brief §6.4.1; research/06 §4.2 (M p.38–39, 50)' },
  },
};
```

Create `packages/audio/src/profiles/traditional.ts`:

```ts
// `traditional` profile, Philips-like (research 05 §2.5 [S2]): high = a high-pitched sound once a second, medium =
// a lower-pitched sound every 2 s, INOP tone every 2 s. Pulse lengths and pitches are not published [assumed].
import type { AlarmSoundProfile } from './types.ts';

export const TRADITIONAL: AlarmSoundProfile = {
  id: 'traditional',
  label: 'Traditional (Philips-like)',
  claim: 'Traditional Philips-like cadence from the IntelliVue manual; pulse length and pitch assumed.',
  levels: {
    L1: { pulseMs: 200, freqHz: 988, gapsMs: [], repeatS: 1, levelDb: 0 },
    L2: { pulseMs: 200, freqHz: 660, gapsMs: [], repeatS: 2, levelDb: -4 },
    L3: { pulseMs: 150, freqHz: 523, gapsMs: [], repeatS: 2, levelDb: -8 },
  },
  harmonicsDb: [0, -3, -6, -9, -12],
  rampMs: 15,
  volume: { min: 0, max: 10, default: 5, dbPerStep: 3, maxGain: 0.5 },
  silence: { durationS: 90, cancelOnNewAlarm: false },
  provenance: {
    'levels.L1.repeatS': { tag: 'documented', source: 'research/05 §2.5 (once a second); brief §6.4' },
    'levels.L2.repeatS': { tag: 'documented', source: 'research/05 §2.5 (every 2 s); brief §6.4' },
    'levels.L3.repeatS': { tag: 'documented', source: 'research/05 §2.5 (INOP tone every 2 s)' },
    'levels.L1.gapsMs': { tag: 'documented', source: 'research/05 §2.5 (one sound per repeat)' },
    'levels.L2.gapsMs': { tag: 'documented', source: 'research/05 §2.5' },
    'levels.L3.gapsMs': { tag: 'documented', source: 'research/05 §2.5' },
    'levels.L1.pulseMs': { tag: 'assumed', source: 'research/05 §2.5' },
    'levels.L2.pulseMs': { tag: 'assumed', source: 'research/05 §2.5' },
    'levels.L3.pulseMs': { tag: 'assumed', source: 'research/05 §2.5', note: 'one-star alarms are shorter' },
    'levels.L1.freqHz': { tag: 'assumed', source: 'research/05 §2.5 (high-pitched)' },
    'levels.L2.freqHz': { tag: 'assumed', source: 'research/05 §2.5 (lower-pitched)' },
    'levels.L3.freqHz': { tag: 'assumed', source: 'research/05 §2.5' },
    'levels.L1.levelDb': { tag: 'eng', source: 'brief §6.4' },
    'levels.L2.levelDb': { tag: 'eng', source: 'brief §6.4' },
    'levels.L3.levelDb': { tag: 'eng', source: 'brief §6.4' },
    harmonicsDb: { tag: 'eng', source: 'brief §6.4' },
    rampMs: { tag: 'eng', source: 'brief §6.4' },
    volume: { tag: 'documented', source: 'brief §6.4 (0–10)', note: 'curve [ENG]' },
    silence: { tag: 'documented', source: 'brief §6.4' },
  },
};
```

Create `packages/audio/src/profiles/index.ts`:

```ts
import { IEC_STYLE } from './iec-style.ts';
import { SAADAT } from './saadat.ts';
import { TRADITIONAL } from './traditional.ts';
import type { AlarmSoundProfile } from './types.ts';

export const ALARM_PROFILES: Readonly<Record<AlarmSoundProfile['id'], AlarmSoundProfile>> = {
  'iec-style': IEC_STYLE,
  traditional: TRADITIONAL,
  saadat: SAADAT,
};

export function getAlarmProfile(id: string): AlarmSoundProfile {
  const p = (ALARM_PROFILES as Record<string, AlarmSoundProfile>)[id];
  if (!p) throw new Error(`unknown alarm sound profile: ${id}`);
  return p;
}

export * from './types.ts';
export { IEC_STYLE, SAADAT, TRADITIONAL };
```

- [ ] **Step 4: Export from the package** — append to `packages/audio/src/index.ts`:

```ts
export * from './profiles/index.ts';
```

- [ ] **Step 5: Run the test and the typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/audio exec vitest run test/profiles.test.ts && npx -y pnpm@9.15.9 --filter @pme/audio typecheck`
Expected: 11 passed; typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add packages/audio/src/profiles packages/audio/src/index.ts packages/audio/test/profiles.test.ts
git commit -m "feat(audio): iec-style, saadat and traditional alarm sound profiles as data" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Pulse-tone pitch maps and device tones

**Files:**
- Create: `packages/audio/src/profiles/pitch-maps.ts`, `packages/audio/src/profiles/device-tones.ts`
- Modify: `packages/audio/src/profiles/index.ts` (two export lines)
- Test: `packages/audio/test/pitch-and-device-tones.test.ts`

**Interfaces:**
- Produces: `type PitchMapId = 'none' | 'nellcor-like' | 'enhanced'`, `PITCH_MAPS`, `pitchHz(map, spo2: number | null, baseHz = 880): number | null`; `ToneSegment { startHz, endHz, durMs, gapMs }`, `type ToneSet = 'zoll-like' | 'lifepak-like'`, `chargeTone(set, chargeS)`, `chargeReadyTone(set)`, `SHOCK_TONE`, `NIBP_DONE_TONE`, `DEVICE_TONE_PROVENANCE`, `toneDurationMs(segs)`.

- [ ] **Step 1: Write the failing test**

Create `packages/audio/test/pitch-and-device-tones.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { chargeReadyTone, chargeTone, PITCH_MAPS, pitchHz, toneDurationMs, type PitchMapId } from '../src/profiles/index.ts';

describe('pitch maps', () => {
  it.each(Object.keys(PITCH_MAPS) as PitchMapId[])('%s is monotonic non-decreasing in SpO2 and 880 Hz at 100 %%', (m) => {
    let prev = 0;
    for (let s = 0; s <= 100; s++) {
      const f = pitchHz(m, s) as number;
      expect(f).toBeGreaterThanOrEqual(prev);
      prev = f;
    }
    expect(pitchHz(m, 100)).toBeCloseTo(880, 9);
  });

  it('nellcor-like: ≈ 5 Hz per % near 100 %, 830 Hz ± 1 at 90 % (BUILD-PLAN Stage 3 test 9)', () => {
    expect(880 - (pitchHz('nellcor-like', 99) as number)).toBeCloseTo(5.07, 1);
    expect(pitchHz('nellcor-like', 90)).toBeCloseTo(830.6, 0);
  });

  it('enhanced drops faster than nellcor-like; none is fixed; no SpO2 = no tone', () => {
    expect(pitchHz('enhanced', 85) as number).toBeLessThan(pitchHz('nellcor-like', 85) as number);
    expect(pitchHz('none', 70)).toBe(880);
    expect(pitchHz('nellcor-like', null)).toBeNull();
    expect(pitchHz('nellcor-like', 120)).toBe(880);
  });
});

describe('device tones', () => {
  it('charge tone lasts the charge time (LIFEPAK-like ramp, ZOLL-like pips)', () => {
    expect(toneDurationMs(chargeTone('lifepak-like', 7))).toBe(7000);
    expect(chargeTone('lifepak-like', 7)[0]).toMatchObject({ startHz: 400, endHz: 1000 });
    expect(toneDurationMs(chargeTone('zoll-like', 5))).toBe(5000);
  });

  it('ZOLL-like ready tone: 50 s then a higher tone for 10 s; LIFEPAK-like 60 s', () => {
    const z = chargeReadyTone('zoll-like');
    expect(z.map((s) => s.durMs)).toEqual([50_000, 10_000]);
    expect(z[1]!.startHz).toBeGreaterThan(z[0]!.startHz);
    expect(toneDurationMs(chargeReadyTone('lifepak-like'))).toBe(60_000);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/audio exec vitest run test/pitch-and-device-tones.test.ts`
Expected: FAIL (`pitchHz` is not exported).

- [ ] **Step 3: Implement**

Create `packages/audio/src/profiles/pitch-maps.ts`:

```ts
// Pulse-tone pitch maps (brief §3.6; research 03 §3.6, 05 §2.5): f = baseHz · 2^(−(100 − SpO2)·s/12).
// 'nellcor-like' s = 0.1 semitone/% (≈5 Hz per % near 100 %); 'enhanced' s = 0.4 (inside the brief's 0.25–0.5)
// [ENG]; 'none' = a fixed pitch (saadat-like until Ali's recording settles it).
export type PitchMapId = 'none' | 'nellcor-like' | 'enhanced';

export const PITCH_MAPS: Readonly<Record<PitchMapId, { semitonesPerPct: number }>> = {
  none: { semitonesPerPct: 0 },
  'nellcor-like': { semitonesPerPct: 0.1 },
  enhanced: { semitonesPerPct: 0.4 },
};

/** Beep pitch for a displayed SpO2 (%); null SpO2 (no pulse) = no tone. */
export function pitchHz(map: PitchMapId, spo2: number | null, baseHz = 880): number | null {
  if (spo2 === null || !Number.isFinite(spo2)) return null;
  const s = PITCH_MAPS[map].semitonesPerPct;
  const clamped = Math.min(100, Math.max(0, spo2));
  return baseHz * 2 ** ((-(100 - clamped) * s) / 12);
}
```

Create `packages/audio/src/profiles/device-tones.ts`:

```ts
// Defibrillator charge / charge-ready / shock and NIBP-done tones as data (brief §6.5; research 05 §2.6, §2.4).
// The CADENCES are documented (ZOLL: continuous ready tone 20 or 50 s, then a higher tone 10 s, then disarm;
// LIFEPAK: ramping charge tone, auto-disarm 60 s; Philips NBP "Done Tone"); pitches and lengths are [assumed].

/** A tone is a list of segments played back to back; a segment glides linearly from startHz to endHz. */
export interface ToneSegment {
  startHz: number;
  endHz: number;
  durMs: number;
  /** Silence after this segment (ms). */
  gapMs: number;
}

export type ToneSet = 'zoll-like' | 'lifepak-like';
export type DeviceToneKind = 'charge' | 'chargeReady' | 'shock' | 'nibpDone';

/** Charge tone for a charge lasting `chargeS` seconds. */
export function chargeTone(set: ToneSet, chargeS: number): ToneSegment[] {
  const ms = Math.max(0.2, chargeS) * 1000;
  if (set === 'lifepak-like') return [{ startHz: 400, endHz: 1000, durMs: ms, gapMs: 0 }]; // ramping tone [assumed pitch]
  // ZOLL-like "distinctive charging tone" [assumed]: 100 ms pips every 250 ms at 700 Hz.
  const n = Math.max(1, Math.floor(ms / 250));
  return Array.from({ length: n }, () => ({ startHz: 700, endHz: 700, durMs: 100, gapMs: 150 }));
}

/** Charged-and-ready tone until disarm. ZOLL-like: 50 s continuous, then a higher tone for 10 s. LIFEPAK-like: 60 s. */
export function chargeReadyTone(set: ToneSet): ToneSegment[] {
  if (set === 'zoll-like') {
    return [
      { startHz: 1000, endHz: 1000, durMs: 50_000, gapMs: 0 },
      { startHz: 1300, endHz: 1300, durMs: 10_000, gapMs: 0 },
    ];
  }
  return [{ startHz: 1000, endHz: 1000, durMs: 60_000, gapMs: 0 }];
}

/** Short confirmation when a shock is delivered [assumed]. */
export const SHOCK_TONE: ToneSegment[] = [{ startHz: 1200, endHz: 1200, durMs: 120, gapMs: 0 }];
/** NIBP measurement complete (Philips-like "Done Tone") [assumed pitch and length]. */
export const NIBP_DONE_TONE: ToneSegment[] = [{ startHz: 1047, endHz: 1047, durMs: 150, gapMs: 0 }];

export const DEVICE_TONE_PROVENANCE = {
  chargeTone: { tag: 'assumed', source: 'research/05 §2.6 (LIFEPAK ramping tone; ZOLL distinctive charging tone)' },
  chargeReadyTone: { tag: 'documented', source: 'research/05 §2.6 (ZOLL 50 s + 10 s higher; LIFEPAK auto-disarm 60 s)', note: 'pitches [assumed]' },
  SHOCK_TONE: { tag: 'assumed', source: 'brief §6.5' },
  NIBP_DONE_TONE: { tag: 'assumed', source: 'research/05 §2.4 (Philips Done Tone)' },
} as const;

export const toneDurationMs = (segs: readonly ToneSegment[]): number => segs.reduce((a, s) => a + s.durMs + s.gapMs, 0);
```

Append to `packages/audio/src/profiles/index.ts`:

```ts
export * from './pitch-maps.ts';
export * from './device-tones.ts';
```

- [ ] **Step 4: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/audio exec vitest run test/pitch-and-device-tones.test.ts`
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/audio/src/profiles packages/audio/test/pitch-and-device-tones.test.ts
git commit -m "feat(audio): SpO2 pitch maps (nellcor-like, enhanced, none) and charge/ready/shock/NIBP tones as data" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Burst geometry and the volume curve

**Files:**
- Create: `packages/audio/src/alarm-bursts.ts`
- Modify: `packages/audio/src/index.ts` (append one line)
- Test: `packages/audio/test/alarm-bursts.test.ts`

**Interfaces:**
- Consumes: `AlarmSoundProfile`, `LevelSound`, `ProfileOverrides`, `levelKey` (Task 12).
- Produces: `BurstPulse { offsetS, durS, freqHz }`; `levelSound(profile, level, overrides?): LevelSound` (applies `repeatS` and `lowPulses`); `burstPulses(ls): BurstPulse[]`; `burstDurationS(ls)`; `volumeGain(volume, step)`; `dbToGain(db)`.

- [ ] **Step 1: Write the failing test**

Create `packages/audio/test/alarm-bursts.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { burstDurationS, burstPulses, levelSound, volumeGain } from '../src/alarm-bursts.ts';
import { IEC_STYLE, SAADAT } from '../src/profiles/index.ts';

const diffs = (xs: number[]) => xs.slice(1).map((x, i) => +(x - (xs[i] as number)).toFixed(4));

describe('burst geometry', () => {
  it('iec-style high: 10 pulses, 3+2 rhythm twice, t_d 150, x 100, groups 0.6 s apart', () => {
    const p = burstPulses(levelSound(IEC_STYLE, 1));
    expect(p).toHaveLength(10);
    expect(p.every((x) => x.durS === 0.15 && x.freqHz === 880)).toBe(true);
    expect(diffs(p.map((x) => x.offsetS))).toEqual([0.25, 0.25, 0.5, 0.25, 0.75, 0.25, 0.25, 0.5, 0.25]);
  });

  it('iec-style medium: 3 pulses of 200 ms, y 200 ms; low: 1 pulse (2 with lowPulses 2)', () => {
    expect(diffs(burstPulses(levelSound(IEC_STYLE, 2)).map((x) => x.offsetS))).toEqual([0.4, 0.4]);
    expect(burstPulses(levelSound(IEC_STYLE, 3))).toHaveLength(1);
    expect(burstPulses(levelSound(IEC_STYLE, 3, { lowPulses: 2 })).map((x) => x.offsetS)).toEqual([0, 0.4]);
  });

  it('saadat L1 "DO-DO-DO--DO-DO": 5 pulses, long gap between 3rd and 4th', () => {
    const p = burstPulses(levelSound(SAADAT, 1));
    expect(diffs(p.map((x) => x.offsetS))).toEqual([0.25, 0.25, 0.45, 0.25]);
    expect(burstDurationS(levelSound(SAADAT, 1))).toBeCloseTo(1.35, 9);
  });

  it('medium burst is at least as long per pulse as high (brief §6.4 t_d + y ≥ t_d + x)', () => {
    const hi = IEC_STYLE.levels.L1;
    const me = IEC_STYLE.levels.L2;
    expect(me.pulseMs + (me.gapsMs[0] ?? 0)).toBeGreaterThanOrEqual(hi.pulseMs + (hi.gapsMs[0] ?? 0));
  });
});

describe('volume curve', () => {
  it('saadat 1–7: 22/6 dB per step (47–69 dB(A)), all audible, monotonic', () => {
    const g = [1, 2, 3, 4, 5, 6, 7].map((s) => volumeGain(SAADAT.volume, s));
    expect(g.every((x, i) => i === 0 || x > (g[i - 1] as number))).toBe(true);
    expect(20 * Math.log10((g[6] as number) / (g[0] as number))).toBeCloseTo(22, 9);
    expect(g[6]).toBeCloseTo(0.5, 9);
    expect(volumeGain(SAADAT.volume, 0)).toBeCloseTo(g[0] as number, 12); // clamped to the minimum
  });

  it('iec-style 0–10: 0 is silent, 3 dB per step', () => {
    expect(volumeGain(IEC_STYLE.volume, 0)).toBe(0);
    expect(20 * Math.log10(volumeGain(IEC_STYLE.volume, 10) / volumeGain(IEC_STYLE.volume, 9))).toBeCloseTo(3, 9);
  });

});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/audio exec vitest run test/alarm-bursts.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

Create `packages/audio/src/alarm-bursts.ts`:

```ts
// Pure burst geometry (no Web Audio): where each pulse of one burst starts, for a profile level with the skin's
// overrides applied, and the volume-step → gain curve. Times are REAL seconds (brief §3.6: alarm bursts keep
// real-time patterns when timeScale ≠ 1).
import { levelKey, type AlarmLevel, type AlarmSoundProfile, type LevelSound, type ProfileOverrides } from './profiles/types.ts';

export interface BurstPulse {
  /** Onset relative to the burst start (s). */
  offsetS: number;
  durS: number;
  freqHz: number;
}

/** The level's sound with skin overrides applied (repeat time; the 2-pulse low burst). */
export function levelSound(profile: AlarmSoundProfile, level: AlarmLevel, ov: ProfileOverrides = {}): LevelSound {
  const key = levelKey(level);
  const base = profile.levels[key];
  const out: LevelSound = { ...base, gapsMs: [...base.gapsMs] };
  const rep = ov.repeatS?.[key];
  if (rep !== undefined) out.repeatS = rep;
  if (level === 3 && ov.lowPulses === 2 && out.gapsMs.length === 0) out.gapsMs = [profile.levels.L2.gapsMs[0] ?? 200];
  return out;
}

export function burstPulses(ls: LevelSound): BurstPulse[] {
  const pulses: BurstPulse[] = [];
  let t = 0;
  for (let i = 0; i <= ls.gapsMs.length; i++) {
    pulses.push({ offsetS: t / 1000, durS: ls.pulseMs / 1000, freqHz: ls.freqHz });
    t += ls.pulseMs + (ls.gapsMs[i] ?? 0);
  }
  return pulses;
}

/** First onset to last offset (s). */
export function burstDurationS(ls: LevelSound): number {
  const p = burstPulses(ls);
  const last = p[p.length - 1] as BurstPulse;
  return last.offsetS + last.durS;
}

/** Linear gain for a volume step: maxGain at `max`, dbPerStep less per step below; a step of 0 is silent. */
export function volumeGain(v: AlarmSoundProfile['volume'], step: number): number {
  const s = Math.round(Math.min(v.max, Math.max(v.min, step)));
  if (s <= 0) return 0;
  return v.maxGain * 10 ** ((-(v.max - s) * v.dbPerStep) / 20);
}

/** dB → linear amplitude. */
export const dbToGain = (db: number): number => 10 ** (db / 20);
```

Append to `packages/audio/src/index.ts`:

```ts
export * from './alarm-bursts.ts';
```

- [ ] **Step 4: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/audio exec vitest run test/alarm-bursts.test.ts`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/audio/src/alarm-bursts.ts packages/audio/src/index.ts packages/audio/test/alarm-bursts.test.ts
git commit -m "feat(audio): alarm burst geometry and volume-step gain curve" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: `AlarmSounder` on the look-ahead scheduler

**Files:**
- Create: `packages/audio/src/alarm-sounder.ts`
- Modify: `packages/audio/src/index.ts` (append one line)
- Test: `packages/audio/test/alarm-sounder.test.ts`

**Interfaces:**
- Consumes: `ToneScheduler`, `ToneRequest` (existing `scheduler.ts`, unchanged); Task 14.
- Produces: `AlarmToneRequest extends ToneRequest { kind: 'alarm'; freqHz; durS; gain; level; profile }`; `SounderScheduler { enqueue; cancel; clock: { timeScale } }` (a `ToneScheduler` satisfies it); `class AlarmSounder(sched, profile, { overrides?, volume?, horizonS? })` with `raise(id, level, t)`, `clear(id, t)`, `silenceAll(t, durationS?)`, `endSilence(t)`, `setVolume(step)`, `pump(t)`, `dispose()`, getters `volume`, `silencedUntil`, `sounding`. Pulse ids: `alarm:<alarmId>:<train>:<burst>:<pulse>`.

The tests drive the REAL `ToneScheduler` with a fake audio clock (audio time = sim time / timeScale), stepping 25 ms at a time exactly as the scheduler's timer would, and read what was handed to `play` and what was stopped.

- [ ] **Step 1: Write the failing test**

Create `packages/audio/test/alarm-sounder.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { AlarmSounder, type AlarmToneRequest } from '../src/alarm-sounder.ts';
import { IEC_STYLE, SAADAT, TRADITIONAL, type AlarmSoundProfile, type ProfileOverrides } from '../src/profiles/index.ts';
import { ToneScheduler } from '../src/scheduler.ts';

/** Real ToneScheduler on a fake audio clock: audio time = sim time = now (timeScale k). */
function rig(profile: AlarmSoundProfile, opts: { overrides?: ProfileOverrides; timeScale?: number } = {}) {
  const k = opts.timeScale ?? 1;
  let now = 0; // sim seconds
  const played: Array<{ tone: AlarmToneRequest; when: number }> = [];
  const stopped: string[] = [];
  const sched = new ToneScheduler({
    audioNow: () => now / k,
    perfToAudio: (ms) => ms / 1000,
    outputLatency: () => 0,
    play: (tone, when) => {
      played.push({ tone: tone as AlarmToneRequest, when });
      return { stop: () => stopped.push(tone.id) };
    },
  });
  sched.clock.setAnchor({ simT: 0, perfMs: 0, timeScale: k });
  const s = new AlarmSounder(sched, profile, opts.overrides ? { overrides: opts.overrides } : {});
  /** Advance sim time to t in 25 ms steps, pumping both (as the 25 ms timer would). */
  const run = (t: number) => {
    while (now < t - 1e-9) {
      now = Math.min(t, now + 0.025);
      s.pump(now);
      sched.pump();
    }
  };
  return { s, sched, played, stopped, run, at: (t: number) => (now = t) };
}

const onsets = (p: Array<{ when: number }>) => p.map((x) => +x.when.toFixed(4));
const diffs = (xs: number[]) => xs.slice(1).map((x, i) => +(x - (xs[i] as number)).toFixed(4));
/** Group pulses into bursts: a gap > 1.5 s starts a new burst. */
function bursts(xs: number[]): number[][] {
  const out: number[][] = [];
  for (const x of xs) {
    const cur = out[out.length - 1];
    if (cur && x - (cur[cur.length - 1] as number) < 1.5) cur.push(x);
    else out.push([x]);
  }
  return out;
}

describe('AlarmSounder cadence on a fake audio clock', () => {
  it('iec-style high repeats every 10 s with 10 pulses per burst', () => {
    const r = rig(IEC_STYLE);
    r.s.raise('HR_HIGH', 1, 0);
    r.run(35);
    const b = bursts(onsets(r.played));
    expect(b.map((x) => x.length)).toEqual([10, 10, 10, 10]);
    expect(b.map((x) => x[0])).toEqual([0, 10, 20, 30]);
  });

  it('iec-style medium every 20 s; low sounds once', () => {
    const m = rig(IEC_STYLE);
    m.s.raise('SPO2_LOW', 2, 0);
    m.run(45);
    expect(bursts(onsets(m.played)).map((x) => [x[0], x.length])).toEqual([[0, 3], [20, 3], [40, 3]]);
    const l = rig(IEC_STYLE);
    l.s.raise('LEADS_OFF', 3, 0);
    l.run(60);
    expect(onsets(l.played)).toEqual([0]);
  });

  it('saadat: L1 5 pulses / 10 s, L2 3 / 20 s, L3 1 / 30 s (repeats)', () => {
    for (const [level, every, n] of [[1, 10, 5], [2, 20, 3], [3, 30, 1]] as const) {
      const r = rig(SAADAT);
      r.s.raise('A', level, 0);
      r.run(95);
      const b = bursts(onsets(r.played));
      expect(b.every((x) => x.length === n), `level ${level}`).toBe(true);
      expect(diffs(b.map((x) => x[0] as number)).every((d) => d === every), `level ${level}`).toBe(true);
    }
  });

  it('traditional: high once a second, medium every 2 s', () => {
    const r = rig(TRADITIONAL);
    r.s.raise('A', 1, 0);
    r.run(4.5);
    expect(onsets(r.played)).toEqual([0, 1, 2, 3, 4]);
  });

  it('skin repeat overrides: ZOLL-like high every 15 s, low not repeated', () => {
    const r = rig(IEC_STYLE, { overrides: { repeatS: { L1: 15, L3: null } } });
    r.s.raise('A', 1, 0);
    r.run(35);
    expect(bursts(onsets(r.played)).map((x) => x[0])).toEqual([0, 15, 30]);
  });

  it('only the highest level sounds; clearing it restarts the next one at once', () => {
    const r = rig(SAADAT);
    r.s.raise('LEADS', 3, 0);
    r.run(2);
    r.s.raise('ASYSTOLE', 1, 2);
    expect(r.s.sounding).toBe('ASYSTOLE');
    r.run(15);
    r.s.clear('ASYSTOLE', 15);
    r.run(16);
    const levels = r.played.map((p) => [+p.when.toFixed(3), p.tone.level]);
    expect(levels.filter(([, l]) => l === 1).map(([w]) => w)[0]).toBe(2);
    expect(levels.filter(([w, l]) => l === 3 && (w as number) > 2 && (w as number) < 15)).toEqual([]);
    expect(levels.filter(([, l]) => l === 3).map(([w]) => w)).toEqual([0, 15]);
  });

  it('a cancelled train stops pulses already handed to Web Audio', () => {
    const r = rig(IEC_STYLE);
    r.s.raise('A', 1, 0);
    r.run(0.2); // pulse 2 (t = 0.25) is inside the 100 ms look-ahead: already handed to Web Audio
    expect(r.played.map((p) => p.tone.id)).toEqual(['alarm:A:0:0:0', 'alarm:A:0:0:1']);
    r.s.clear('A', 0.2);
    expect(r.stopped).toEqual(['alarm:A:0:0:1']);
    r.run(12);
    expect(r.played).toHaveLength(2);
  });

  it('saadat silence: 120 s of quiet, then the alarm sounds again; a NEW alarm ends the silence', () => {
    const r = rig(SAADAT);
    r.s.raise('HR', 1, 0);
    r.run(5);
    r.s.silenceAll(5);
    expect(r.s.silencedUntil).toBe(125);
    r.run(130);
    const b = bursts(onsets(r.played)).map((x) => x[0]);
    expect(b).toEqual([0, 125]);
    const n = rig(SAADAT);
    n.s.raise('HR', 1, 0);
    n.run(5);
    n.s.silenceAll(5);
    n.run(50);
    n.s.raise('SPO2', 2, 50);
    n.run(51);
    expect(n.s.silencedUntil).toBeNull();
    expect(bursts(onsets(n.played)).map((x) => x[0])).toEqual([0, 50]);
  });

  it('iec-style silence lasts 90 s and a new alarm does NOT end it', () => {
    const r = rig(IEC_STYLE);
    r.s.raise('HR', 1, 0);
    r.run(1);
    r.s.silenceAll(1);
    r.run(40);
    r.s.raise('SPO2', 2, 40);
    r.run(92);
    expect(bursts(onsets(r.played)).map((x) => x[0])).toEqual([0, 91]);
  });

  it('bursts keep real-time patterns at timeScale 2 (sim spacing doubles, audio spacing unchanged)', () => {
    const r = rig(SAADAT, { timeScale: 2 });
    r.s.raise('A', 1, 0);
    r.run(25);
    const b = bursts(onsets(r.played));
    expect(b.map((x) => x[0])).toEqual([0, 10]); // audio seconds
    expect(diffs(b[0] as number[])).toEqual([0.25, 0.25, 0.45, 0.25]);
    expect(r.played[5]?.tone.t).toBeCloseTo(20, 9); // sim seconds
  });

  it('ids are unique across restarts', () => {
    const r = rig(SAADAT);
    r.s.raise('A', 1, 0);
    r.run(1);
    r.s.clear('A', 1);
    r.s.raise('A', 1, 1);
    r.run(3);
    const ids = r.played.map((p) => p.tone.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe('alarm:A:0:0:0');
  });
});

describe('alarm level loudness', () => {
  it('medium is 4 dB and low 8 dB below high at the same volume step', () => {
    const r = rig(IEC_STYLE);
    r.s.raise('A', 1, 0);
    r.run(0.2);
    const hi = r.played[0]!.tone.gain;
    const m = rig(IEC_STYLE);
    m.s.raise('A', 2, 0);
    m.run(0.2);
    expect(20 * Math.log10(m.played[0]!.tone.gain / hi)).toBeCloseTo(-4, 9);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/audio exec vitest run test/alarm-sounder.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

Create `packages/audio/src/alarm-sounder.ts`:

```ts
// AlarmSounder: turns "alarm X of level L is active" into pulse tones on the existing look-ahead ToneScheduler
// (brief §3.6, §6.4, §6.4.1). Only the highest-priority active alarm sounds (lowest level number; ties: first
// raised). Bursts repeat at the level's repeatS until the alarm clears; a change of the sounding alarm cancels the
// old train's pending pulses and starts the new train at once. Silence cancels pending pulses for durationS; with
// cancelOnNewAlarm (saadat) any NEW alarm ends the silence. Every pulse has a stable, never-reused id
// `alarm:<alarmId>:<train>:<burst>:<pulse>` so a cancel reaches pulses already handed to Web Audio.
// Sim time ↔ real time: pulse offsets are real seconds × clock.timeScale (bursts keep real-time patterns [ENG]).
import { burstPulses, dbToGain, levelSound, volumeGain } from './alarm-bursts.ts';
import type { AlarmLevel, AlarmSoundProfile, ProfileOverrides } from './profiles/types.ts';
import type { ToneRequest } from './scheduler.ts';

export interface AlarmToneRequest extends ToneRequest {
  kind: 'alarm';
  freqHz: number;
  durS: number;
  gain: number;
  level: AlarmLevel;
  profile: AlarmSoundProfile['id'];
}

/** The part of ToneScheduler the sounder needs (a fake in tests). */
export interface SounderScheduler {
  enqueue(tone: ToneRequest): void;
  cancel(ids: readonly string[]): void;
  readonly clock: { readonly timeScale: number };
}

export interface AlarmSounderOptions {
  overrides?: ProfileOverrides;
  /** Volume step; default = the skin's (overrides.volume) or the profile's default. */
  volume?: number;
  /** How far ahead (real seconds) bursts are enqueued. Default 1 s [ENG]: > the scheduler's 100 ms look-ahead. */
  horizonS?: number;
}

interface Active {
  id: string;
  level: AlarmLevel;
  seq: number;
}

interface Train {
  alarmId: string;
  level: AlarmLevel;
  no: number;
  startT: number;
  nextBurst: number;
  nextBurstT: number;
  done: boolean;
}

const PRUNE_AFTER_S = 5;

export class AlarmSounder {
  readonly profile: AlarmSoundProfile;
  private readonly sched: SounderScheduler;
  private readonly ov: ProfileOverrides;
  private readonly horizonS: number;
  private readonly active = new Map<string, Active>();
  private seq = 0;
  private trainNo = 0;
  private train: Train | null = null;
  private pending = new Map<string, number>(); // id → sim t
  private silentUntil: number | null = null;
  private volumeStep: number;

  constructor(sched: SounderScheduler, profile: AlarmSoundProfile, opts: AlarmSounderOptions = {}) {
    this.sched = sched;
    this.profile = profile;
    this.ov = opts.overrides ?? {};
    this.horizonS = opts.horizonS ?? 1;
    this.volumeStep = opts.volume ?? this.ov.volume?.default ?? profile.volume.default;
  }

  get volume(): number {
    return this.volumeStep;
  }

  /** Sim time the current silence ends, or null. */
  get silencedUntil(): number | null {
    return this.silentUntil;
  }

  /** Id of the alarm whose train is sounding (null when none, or while silenced). */
  get sounding(): string | null {
    return this.silentUntil === null ? (this.train?.alarmId ?? null) : null;
  }

  private get silence() {
    return this.ov.silence ?? this.profile.silence;
  }

  private get volumeRange() {
    return { ...this.profile.volume, ...(this.ov.volume ?? {}) };
  }

  setVolume(step: number): void {
    const v = this.volumeRange;
    this.volumeStep = Math.round(Math.min(v.max, Math.max(v.min, step)));
  }

  /** Alarm `id` became active (or changed level) at sim time t. */
  raise(id: string, level: AlarmLevel, t: number): void {
    const prev = this.active.get(id);
    if (prev && prev.level === level) return;
    this.active.set(id, { id, level, seq: prev?.seq ?? this.seq++ });
    if (!prev && this.silentUntil !== null && this.silence.cancelOnNewAlarm) this.silentUntil = null;
    this.retrain(t);
  }

  /** Alarm `id` ended at sim time t. */
  clear(id: string, t: number): void {
    if (!this.active.delete(id)) return;
    this.retrain(t);
  }

  /** Silence all alarm audio from t for durationS real seconds (default: the profile's / skin's silence). */
  silenceAll(t: number, durationS = this.silence.durationS): void {
    this.cancelPending(() => true);
    this.train = null;
    this.silentUntil = t + durationS * this.sched.clock.timeScale;
  }

  /** End a silence early (e.g. Silence pressed again, brief §6.4.1). */
  endSilence(t: number): void {
    if (this.silentUntil === null) return;
    this.silentUntil = null;
    this.retrain(t);
  }

  /** Enqueue every burst that starts before t + horizon. Call it often (every scheduler tick or frame). */
  pump(t: number): void {
    if (this.silentUntil !== null && t >= this.silentUntil) {
      const end = this.silentUntil;
      this.silentUntil = null;
      this.retrain(end);
    }
    for (const [id, pt] of this.pending) if (pt < t - PRUNE_AFTER_S) this.pending.delete(id);
    const tr = this.train;
    if (!tr || this.silentUntil !== null) return;
    const ts = this.sched.clock.timeScale;
    const ls = levelSound(this.profile, tr.level, this.ov);
    const gain = volumeGain(this.volumeRange, this.volumeStep) * dbToGain(ls.levelDb);
    while (!tr.done && tr.nextBurstT <= t + this.horizonS * ts) {
      burstPulses(ls).forEach((p, i) => {
        const req: AlarmToneRequest = {
          t: tr.nextBurstT + p.offsetS * ts,
          id: `alarm:${tr.alarmId}:${tr.no}:${tr.nextBurst}:${i}`,
          kind: 'alarm',
          freqHz: p.freqHz,
          durS: p.durS,
          gain,
          level: tr.level,
          profile: this.profile.id,
        };
        this.pending.set(req.id, req.t);
        this.sched.enqueue(req);
      });
      tr.nextBurst++;
      if (ls.repeatS === null) tr.done = true;
      else tr.nextBurstT = tr.startT + tr.nextBurst * ls.repeatS * ts;
    }
  }

  /** Stop everything (page teardown). */
  dispose(): void {
    this.cancelPending(() => true);
    this.active.clear();
    this.train = null;
  }

  private top(): Active | null {
    let best: Active | null = null;
    for (const a of this.active.values()) if (!best || a.level < best.level || (a.level === best.level && a.seq < best.seq)) best = a;
    return best;
  }

  private retrain(t: number): void {
    const top = this.top();
    const cur = this.train;
    if (cur && top && cur.alarmId === top.id && cur.level === top.level) return;
    if (cur) this.cancelPending((pt, id) => id.startsWith(`alarm:${cur.alarmId}:${cur.no}:`) && pt >= t);
    this.train = top && this.silentUntil === null ? { alarmId: top.id, level: top.level, no: this.trainNo++, startT: t, nextBurst: 0, nextBurstT: t, done: false } : null;
    this.pump(t);
  }

  private cancelPending(match: (t: number, id: string) => boolean): void {
    const ids = [...this.pending].filter(([id, pt]) => match(pt, id)).map(([id]) => id);
    for (const id of ids) this.pending.delete(id);
    if (ids.length > 0) this.sched.cancel(ids);
  }
}
```

Append to `packages/audio/src/index.ts`:

```ts
export * from './alarm-sounder.ts';
```

- [ ] **Step 4: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/audio exec vitest run test/alarm-sounder.test.ts`
Expected: 12 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/audio/src/alarm-sounder.ts packages/audio/src/index.ts packages/audio/test/alarm-sounder.test.ts
git commit -m "feat(audio): AlarmSounder: priority trains, repeat cadence, silence, volume on the look-ahead scheduler" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Web Audio voices and `createTonePlayer`

**Files:**
- Create: `packages/audio/src/alarm-voice.ts`
- Modify: `packages/audio/src/index.ts` (append one line)
- Test: `packages/audio/test/alarm-voice.test.ts`

**Interfaces:**
- Consumes: `playBeep` (existing `tones.ts`), Tasks 12–15.
- Produces: `harmonicTable(harmonicsDb)`, `playAlarmPulse(ctx, dest, when, { freqHz, durS, gain }, harmonicsDb, rampMs): ToneHandle`, `playSegments(ctx, dest, when, segs, gain, harmonicsDb?)`, `DeviceToneRequest`, `TonePlayerOptions { profile, toneSet?, beepGain?, deviceGain? }`, `createTonePlayer(ctx, dest, opts): (tone, when) => ToneHandle | void` (kinds `qrs`, `pulse`, `alarm`, `charge`, `chargeReady`, `shock`, `nibpDone`; anything else plays nothing).

- [ ] **Step 1: Write the failing test**

Create `packages/audio/test/alarm-voice.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createTonePlayer, harmonicTable, playAlarmPulse } from '../src/alarm-voice.ts';
import { IEC_STYLE } from '../src/profiles/index.ts';

/** Minimal Web Audio stand-in that records calls (same idea as tones.test.ts). */
function fakeCtx() {
  const calls: string[] = [];
  const param = (name: string) => ({
    value: 0,
    setValueAtTime: (v: number, t: number) => calls.push(`${name}.set ${v} @${+t.toFixed(4)}`),
    linearRampToValueAtTime: (v: number, t: number) => calls.push(`${name}.ramp ${+v.toFixed(4)} @${+t.toFixed(4)}`),
  });
  const node = (name: string) => ({
    frequency: param(`${name}.freq`),
    gain: param(`${name}.gain`),
    setPeriodicWave: () => calls.push(`${name}.wave`),
    connect(n: unknown) {
      return n;
    },
    disconnect: () => calls.push(`${name}.disconnect`),
    start: (w: number) => calls.push(`${name}.start ${w}`),
    stop: (w: number) => calls.push(`${name}.stop ${+w.toFixed(4)}`),
  });
  const ctx = { createOscillator: () => node('osc'), createGain: () => node('env'), createPeriodicWave: () => ({}) };
  return { ctx: ctx as unknown as BaseAudioContext, calls };
}

describe('alarm voices', () => {
  it('an alarm pulse has 15 ms linear rise and fall at the requested gain', () => {
    const { ctx, calls } = fakeCtx();
    playAlarmPulse(ctx, {} as AudioNode, 2, { freqHz: 880, durS: 0.15, gain: 0.5 }, IEC_STYLE.harmonicsDb, IEC_STYLE.rampMs);
    expect(calls).toContain('env.gain.ramp 0.5 @2.015');
    expect(calls).toContain('env.gain.set 0.5 @2.135');
    expect(calls).toContain('env.gain.ramp 0 @2.15');
    expect(calls).toContain('osc.start 2');
    expect(calls).toContain('osc.wave');
  });

  it('createTonePlayer dispatches by kind; unknown kinds play nothing; handles stop', () => {
    const { ctx, calls } = fakeCtx();
    const play = createTonePlayer(ctx, {} as AudioNode, { profile: IEC_STYLE, toneSet: 'lifepak-like' });
    const h = play({ t: 1, id: 'a', kind: 'alarm', freqHz: 660, durS: 0.2, gain: 0.3 } as never, 1);
    expect(calls).toContain('osc.start 1');
    h?.stop();
    expect(calls).toContain('env.disconnect');
    play({ t: 1, id: 'c', kind: 'charge', chargeS: 7 } as never, 3);
    expect(calls).toContain('osc.freq.ramp 1000 @10'); // LIFEPAK-like ramping charge tone, 400 → 1000 Hz over 7 s
    expect(play({ t: 1, id: 'q', kind: 'qrs', freqHz: 830 }, 4)).toBeDefined();
    expect(play({ t: 1, id: 'x', kind: 'mystery' }, 5)).toBeUndefined();
  });
  it('harmonic table: 0/−3/−6/−9/−12 dB', () => {
    const { imag } = harmonicTable([0, -3, -6, -9, -12]);
    expect(imag[0]).toBe(0);
    expect(imag[1]).toBeCloseTo(1, 6);
    expect(imag[5]).toBeCloseTo(10 ** (-12 / 20), 6);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/audio exec vitest run test/alarm-voice.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

Create `packages/audio/src/alarm-voice.ts`:

```ts
// Web Audio voices for alarm pulses and device tones (brief §6.4: PeriodicWave with harmonics 1–5 at
// 0/−3/−6/−9/−12 dB, 15 ms linear rise and fall). `createTonePlayer` is the `play` function a ToneScheduler
// needs: it plays QRS beeps (existing playBeep), AlarmSounder pulses, and device tones by `kind`.
import { dbToGain } from './alarm-bursts.ts';
import type { AlarmToneRequest } from './alarm-sounder.ts';
import { chargeReadyTone, chargeTone, NIBP_DONE_TONE, SHOCK_TONE, type ToneSegment, type ToneSet } from './profiles/device-tones.ts';
import type { AlarmSoundProfile } from './profiles/types.ts';
import type { ToneHandle, ToneRequest } from './scheduler.ts';
import { playBeep } from './tones.ts';

type Ctx = BaseAudioContext;

/** Real/imag arrays for a PeriodicWave with the given harmonic levels (dB re fundamental). */
export function harmonicTable(harmonicsDb: readonly number[]): { real: Float32Array; imag: Float32Array } {
  const n = harmonicsDb.length + 1;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  harmonicsDb.forEach((db, i) => (imag[i + 1] = dbToGain(db)));
  return { real, imag };
}

function stopper(osc: OscillatorNode, env: GainNode): ToneHandle {
  return {
    stop() {
      env.disconnect();
      try {
        osc.stop(0);
      } catch {
        // already stopped
      }
    },
  };
}

/** One alarm pulse at audio time `when`. */
export function playAlarmPulse(ctx: Ctx, dest: AudioNode, when: number, p: { freqHz: number; durS: number; gain: number }, harmonicsDb: readonly number[], rampMs: number): ToneHandle {
  const osc = ctx.createOscillator();
  const { real, imag } = harmonicTable(harmonicsDb);
  osc.setPeriodicWave(ctx.createPeriodicWave(real, imag, { disableNormalization: false }));
  osc.frequency.value = p.freqHz;
  const env = ctx.createGain();
  const r = Math.min(rampMs / 1000, p.durS / 2);
  env.gain.setValueAtTime(0, when);
  env.gain.linearRampToValueAtTime(p.gain, when + r);
  env.gain.setValueAtTime(p.gain, when + p.durS - r);
  env.gain.linearRampToValueAtTime(0, when + p.durS);
  osc.connect(env).connect(dest);
  osc.start(when);
  osc.stop(when + p.durS + 0.01);
  return stopper(osc, env);
}

/** A device tone (segments back to back, each gliding startHz → endHz) at audio time `when`. */
export function playSegments(ctx: Ctx, dest: AudioNode, when: number, segs: readonly ToneSegment[], gain: number, harmonicsDb: readonly number[] = [0, -6, -12]): ToneHandle {
  const osc = ctx.createOscillator();
  const { real, imag } = harmonicTable(harmonicsDb);
  osc.setPeriodicWave(ctx.createPeriodicWave(real, imag));
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, when);
  let t = when;
  for (const s of segs) {
    const d = s.durMs / 1000;
    const r = Math.min(0.01, d / 2);
    osc.frequency.setValueAtTime(s.startHz, t);
    osc.frequency.linearRampToValueAtTime(s.endHz, t + d);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain, t + r);
    env.gain.setValueAtTime(gain, t + d - r);
    env.gain.linearRampToValueAtTime(0, t + d);
    t += d + s.gapMs / 1000;
  }
  osc.connect(env).connect(dest);
  osc.start(when);
  osc.stop(t + 0.01);
  return stopper(osc, env);
}

export interface TonePlayerOptions {
  profile: AlarmSoundProfile;
  toneSet?: ToneSet;
  beepGain?: number;
  deviceGain?: number;
}

/** A device-tone request (engine `tone` kinds 'charge' | 'chargeReady' | 'shock' | 'nibpDone'). */
export interface DeviceToneRequest extends ToneRequest {
  kind: 'charge' | 'chargeReady' | 'shock' | 'nibpDone';
  /** charge only: how long the charge takes (s). */
  chargeS?: number;
}

/** The ToneScheduler `play` function for every tone kind this package knows. Unknown kinds play nothing. */
export function createTonePlayer(ctx: Ctx, dest: AudioNode, opts: TonePlayerOptions): (tone: ToneRequest, when: number) => ToneHandle | void {
  const set = opts.toneSet ?? 'zoll-like';
  const dg = opts.deviceGain ?? 0.3;
  return (tone, when) => {
    switch (tone.kind) {
      case 'qrs':
      case 'pulse':
        return playBeep(ctx, dest, when, tone.freqHz ?? 880, opts.beepGain ?? 0.25);
      case 'alarm': {
        const a = tone as AlarmToneRequest;
        return playAlarmPulse(ctx, dest, when, a, opts.profile.harmonicsDb, opts.profile.rampMs);
      }
      case 'charge':
        return playSegments(ctx, dest, when, chargeTone(set, (tone as DeviceToneRequest).chargeS ?? 5), dg);
      case 'chargeReady':
        return playSegments(ctx, dest, when, chargeReadyTone(set), dg);
      case 'shock':
        return playSegments(ctx, dest, when, SHOCK_TONE, dg);
      case 'nibpDone':
        return playSegments(ctx, dest, when, NIBP_DONE_TONE, dg);
      default:
        return undefined;
    }
  };
}
```

Append to `packages/audio/src/index.ts`:

```ts
export * from './alarm-voice.ts';
```

- [ ] **Step 4: Run the whole audio package, typecheck and build**

Run: `npx -y pnpm@9.15.9 --filter @pme/audio test && npx -y pnpm@9.15.9 --filter @pme/audio typecheck && npx -y pnpm@9.15.9 --filter @pme/audio build`
Expected: 10 files, **58 passed** (the 19 Stage 1 tests unchanged); typecheck clean; build OK.

- [ ] **Step 5: Commit**

```bash
git add packages/audio/src/alarm-voice.ts packages/audio/src/index.ts packages/audio/test/alarm-voice.test.ts
git commit -m "feat(audio): PeriodicWave alarm voice, device-tone voice and createTonePlayer" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Skin preview page

**Files:**
- Create: `apps/demo/stage4a-skins.html`, `apps/demo/src/stage4a/sample-waves.ts`, `apps/demo/src/stage4a/screen.ts`, `apps/demo/src/stage4a/timing.ts`, `apps/demo/src/stage4a/preview.ts`
- Modify: `apps/demo/package.json` (dependency), `apps/demo/vite.config.ts` (one input), `apps/demo/index.html` (one link), `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `resolveSkin`, `SKIN_IDS`, `PRESET_IDS`, `THEME_IDS`, `formatDate` (skins); `ToneScheduler`, `unlockAudio`, `AlarmSounder`, `getAlarmProfile`, `createTonePlayer`, `playAlarmPulse`, `pitchHz` (audio); `SweepLane`, `DEFAULT_PX_PER_MM` (renderer, read-only); `createEngine` (engine-core, read-only).
- Produces: page `stage4a-skins.html?skin=<id>&theme=<id>&static=1`; `window.__pme4a = { ready, resolved, renderTiming(profileId, level, seconds, skinId?) → Promise<{ onsetsS, durationsS, riseMs }> }`; `measureOnsets(x, sr)`.

The page draws the static skin (header with page box, category colour, crossed bell when alarms are factory-off and the date in the skin's calendar; the idle message bar plus one bar and lamp per level; lanes drawn with `SweepLane` from `ResolvedSkin.render`, ECG from the real engine and the other lanes from labelled sample shapes; tiles from `layout.tiles` in `render.tileColors`). With sound enabled it raises alarms of each level through `AlarmSounder` on a real `ToneScheduler`, silences with a countdown, changes the volume within the skin's range, plays the four device tones and pitch-mapped beeps at SpO2 100/90/80.

- [ ] **Step 1: Add the dependency, the Vite input and the index link**

```bash
npx -y pnpm@9.15.9 --filter @pme/demo add @pme/skins@workspace:*
```
In `apps/demo/vite.config.ts` replace the line

```ts
        stage6a: page('stage6a'), 'stage6a-remote': page('stage6a-remote'), 'stage6a-viewer': page('stage6a-viewer'),
```
with

```ts
        stage6a: page('stage6a'), 'stage6a-remote': page('stage6a-remote'), 'stage6a-viewer': page('stage6a-viewer'),
        'stage4a-skins': page('stage4a-skins'),
```
In `apps/demo/index.html` add, before the Stage 6a list item:

```html
      <li><a href="./stage4a-skins.html">Stage 4a: skin preview and alarm sound profiles</a></li>
```

- [ ] **Step 2: Write the page**

Create `apps/demo/stage4a-skins.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stage 4a: skins and alarm sounds</title>
    <style>
      body { margin: 0; background: #111; color: #ccc; font: 14px system-ui, sans-serif; }
      #controls { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; padding: 8px 12px; background: #1b1b1b; }
      #controls label { display: inline-flex; gap: 6px; align-items: center; }
      button, select, input { font: inherit; }
      #screen { width: 1280px; height: 640px; display: grid; grid-template-rows: 30px 26px 1fr; overflow: hidden; }
      #header, #bar { display: flex; align-items: center; gap: 12px; padding: 0 8px; white-space: nowrap; }
      #body { display: flex; min-height: 0; }
      #waves { position: relative; min-width: 0; }
      #waves canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
      #tiles { flex: 1; display: flex; min-width: 0; }
      .col { flex: 1; display: flex; flex-direction: column; min-width: 0; }
      .tile { flex: 1; position: relative; padding: 4px 8px; line-height: 1; overflow: hidden; }
      .tile.large { flex: 2; }
      .tile .v { font-size: 44px; text-align: right; font-variant-numeric: tabular-nums; }
      .tile.large .v { font-size: 88px; }
      .tile .x { font-size: 12px; opacity: .9; margin-top: 4px; }
      .bell { position: absolute; left: 6px; bottom: 4px; font-size: 13px; }
      .lamp { display: inline-block; width: 14px; height: 14px; border-radius: 50%; vertical-align: middle; }
      #alarmdemo { display: flex; gap: 6px; }
      #alarmdemo span { padding: 2px 8px; }
      #diag { font: 12px ui-monospace, monospace; white-space: pre; padding: 8px 12px; color: #8f8; }
      @keyframes pme-flash { 50% { opacity: 0; } }
    </style>
  </head>
  <body>
    <div id="controls">
      <label>Skin <select id="skin"></select></label>
      <label>Theme <select id="theme"></select></label>
      <button id="sound">Enable sound</button>
      <span id="levels"></span>
      <button id="clear">Clear alarms</button>
      <button id="silence">Silence</button>
      <label>Volume <input id="vol" type="range" /> <span id="volVal"></span></label>
      <span id="devtones"></span>
      <span id="beeps"></span>
    </div>
    <div id="screen"></div>
    <div id="diag"></div>
    <script type="module" src="./src/stage4a/preview.ts"></script>
  </body>
</html>
```

Create `apps/demo/src/stage4a/sample-waves.ts`:

```ts
// Sample SHAPES for the skin preview only (not physiology; Stages 2–3 own the real pleth/IBP/CO2/resp models).
// Each returns a value in 0..1 at time t (s) so a lane can scale it to its height.
import type { LaneId } from '@pme/skins';

const HR_HZ = 75 / 60;
const RR_HZ = 15 / 60;
const frac = (x: number) => x - Math.floor(x);
const bump = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));

export function pulseShape(t: number): number {
  const p = frac(t * HR_HZ);
  return Math.min(1, bump(p, 0.18, 0.08) + 0.35 * bump(p, 0.45, 0.1));
}

export function respShape(t: number): number {
  return 0.5 + 0.45 * Math.sin(2 * Math.PI * RR_HZ * t);
}

export function co2Shape(t: number): number {
  const p = frac(t * RR_HZ);
  if (p < 0.05) return p / 0.05;
  if (p < 0.4) return 0.9 + 0.1 * ((p - 0.05) / 0.35);
  if (p < 0.45) return 1 - (p - 0.4) / 0.05;
  return 0;
}

export function shapeFor(lane: LaneId): ((t: number) => number) | null {
  if (lane.startsWith('ECG')) return null; // ECG comes from the engine
  if (lane === 'RESP') return respShape;
  if (lane === 'CO2') return co2Shape;
  return pulseShape; // PLETH, ART, CVP, PAP, IBP1–4
}

/** Sample rate of the preview shapes: 125 Hz like the engine's pressure/pleth channels (brief §3.5). */
export const SHAPE_RATE = 125;
```

Create `apps/demo/src/stage4a/screen.ts`:

```ts
// Static skin preview: header, message bar with the three alarm-level bars and lamps, lanes drawn with the
// renderer's own SweepLane using ResolvedSkin.render (the Stage 4b contract), and tiles from layout.tiles.
import { createEngine } from '@pme/engine-core';
import { DEFAULT_PX_PER_MM, SweepLane } from '@pme/renderer';
import { formatDate, type ResolvedSkin, type TileParam } from '@pme/skins';
import { SHAPE_RATE, shapeFor } from './sample-waves.ts';

const SAMPLE: Record<TileParam, { v: string; x?: string }> = {
  HR: { v: '75' }, NIBP: { v: '121/82', x: '(98)' }, ART: { v: '120/80', x: '(93)' }, CVP: { v: '(8)' }, PAP: { v: '25/10', x: '(15)' },
  IBP1: { v: '120/80', x: '(93)' }, IBP2: { v: '(8)' }, IBP3: { v: '25/10' }, IBP4: { v: '(12)' },
  SpO2: { v: '97', x: 'PR 75  PI 3.1' }, TEMP: { v: '36.8', x: 'T2 37.4  DT 0.6' }, RR: { v: '15' }, CO2: { v: '36', x: 'FiCO2 0  AWRR 15' }, ST: { v: '0.1' },
};
const LAMP_COLOR: Record<string, string> = { 'red-flash': '#F00000', 'yellow-flash': '#F0F000', 'yellow-steady': '#F0F000', 'cyan-steady': '#00D0D0', off: '#333333' };

export function renderScreen(root: HTMLElement, r: ResolvedSkin, animate: boolean): void {
  const s = r.skin;
  const doc = root.ownerDocument;
  root.innerHTML = '';
  root.style.background = s.background;
  root.style.color = s.foreground;
  root.style.fontFamily = s.font.stack;
  const up = (x: string) => (s.font.labelCase === 'upper' ? x.toUpperCase() : x);

  // Header
  const header = doc.createElement('div');
  header.id = 'header';
  header.style.borderBottom = `1px solid ${s.chrome.divider}`;
  const date = formatDate(new Date(Date.UTC(2023, 5, 25)), s.calendar.default, s.calendar.gregorianFormat);
  header.innerHTML =
    `<span style="background:${s.chrome.pageBox.bg};color:${s.chrome.pageBox.fg};padding:0 6px">${s.defaultPage}</span>` +
    `<span>BED 01</span><span style="color:${s.chrome.patientCategoryColor}">${up('Adult')}</span>` +
    (s.alarms.factoryEnabled ? '' : `<span style="color:#F00000" title="all alarms off">🔕</span>`) +
    `<span style="margin-left:auto">${r.skinId}${r.presetId ? ` · ${r.presetId}` : ''}${r.themeId ? ` · ${r.themeId}` : ''}</span>` +
    `<span>${date}  12:14:05</span>`;

  // Message bar: idle bar plus one sample bar and lamp per level
  const bar = doc.createElement('div');
  bar.id = 'bar';
  const mb = s.alarms.messageBar;
  const pre = (n: number) => (mb.prefix === 'asterisks' ? '*'.repeat(4 - n) : '');
  const lamp = (k: 'L1' | 'L2' | 'L3') => {
    const style = s.alarms.lamp[k];
    const hz = k === 'L3' ? 0 : s.alarms.lamp.flashHz[k];
    const anim = animate && style.endsWith('flash') ? `animation:pme-flash ${1 / hz}s steps(1) infinite` : '';
    return `<span class="lamp" data-lamp="${k}" data-hz="${hz}" style="background:${LAMP_COLOR[style]};${anim}"></span>`;
  };
  bar.innerHTML =
    `<span style="background:${mb.idle.bg};color:${mb.idle.fg};padding:2px 8px">${up('No alarm')}</span>` +
    `<span id="alarmdemo">` +
    (['L1', 'L2', 'L3'] as const)
      .map((k, i) => `${lamp(k)}<span style="background:${mb[k].bg};color:${mb[k].fg}">${pre(i + 1)}${up(`Level ${s.alarms.levelNames[i]}`)}</span>`)
      .join('') +
    `</span>`;

  // Body: waves + tiles
  const body = doc.createElement('div');
  body.id = 'body';
  const waves = doc.createElement('div');
  waves.id = 'waves';
  waves.style.flex = `0 0 ${Math.round(s.layout.waveAreaFraction * 100)}%`;
  waves.style.borderRight = `1px solid ${s.chrome.divider}`;
  const canvas = doc.createElement('canvas');
  waves.append(canvas);
  const tiles = doc.createElement('div');
  tiles.id = 'tiles';
  for (const col of s.layout.tiles) {
    const c = doc.createElement('div');
    c.className = 'col';
    for (const t of col) {
      const el = doc.createElement('div');
      el.className = `tile${t.size === 'large' ? ' large' : ''}`;
      el.dataset.param = t.param;
      el.style.color = r.render.tileColors[t.param] ?? s.foreground;
      el.style.border = `1px solid ${s.chrome.divider}`;
      const smp = SAMPLE[t.param];
      el.innerHTML =
        `<div>${up(t.param === 'RR' ? 'RR' : t.param)}</div><div class="v" style="font-weight:${s.font.numericWeight}">${smp.v}</div>` +
        (smp.x ? `<div class="x">${smp.x}</div>` : '') +
        (s.alarms.factoryEnabled ? '' : `<span class="bell" style="color:#F00000">🔕</span>`);
      c.append(el);
    }
    tiles.append(c);
  }
  body.append(waves, tiles);
  root.append(header, bar, body);
  drawLanes(canvas, waves, r);
}

function drawLanes(canvas: HTMLCanvasElement, box: HTMLElement, r: ResolvedSkin): void {
  const dpr = globalThis.devicePixelRatio || 1;
  const w = box.clientWidth;
  const h = box.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = r.render.background;
  ctx.fillRect(0, 0, w, h);
  const grid = r.render.grid;
  const pxPerMm = DEFAULT_PX_PER_MM;
  const engine = createEngine({ seed: 4 });
  const lanes = r.render.lanes;
  const laneH = h / lanes.length;
  const labelW = 0;
  lanes.forEach((L, i) => {
    const y = i * laneH;
    const shape = shapeFor(L.lane);
    const rate = shape ? SHAPE_RATE : 500;
    const gain = shape ? (laneH * 0.7) / pxPerMm : L.gainMmPerMv; // shapes are 0..1 → 70 % of the lane
    const lane = new SweepLane(
      {
        x: labelW, y, width: w - labelW, height: laneH, baseline: shape ? 0.85 : 0.6, rate, mmPerS: L.mmPerS, pxPerMm,
        gainMmPerMv: gain, color: L.color, background: r.render.background, lineWidth: r.render.lineWidth, eraseGapPx: r.render.eraseGapPx,
      },
      dpr,
    );
    const laneS = (w - labelW) / (L.mmPerS * pxPerMm);
    const t0 = 2; // skip the engine's first beats
    engine.advanceTo(t0 + laneS + 1);
    const read = (from: number, out: Float32Array) => {
      if (!shape) return engine.readSamples('ecgII', from + t0 * 500, out);
      for (let k = 0; k < out.length; k++) out[k] = shape((from + k) / rate);
      return out.length;
    };
    for (let t = 0.02; t < laneS * 0.97; t += 0.02) lane.draw(ctx, t, read);
    ctx.fillStyle = L.color;
    ctx.font = `12px ${r.render.fontStack}`;
    ctx.textBaseline = 'top';
    ctx.fillText(`${L.label}   ${L.mmPerS} mm/s${L.autoGain ? '  AUTO' : ''}`, 6, y + 4);
    if (i > 0) {
      ctx.fillStyle = r.skin.chrome.divider;
      ctx.fillRect(0, y, w, 1);
    }
  });
  // ECG-paper grid last, multiplied in: pink on the paper, invisible under dark traces (lanes paint their own background).
  if (grid) {
    ctx.globalCompositeOperation = 'multiply';
    for (const [mm, color] of [[grid.minorMm, grid.minor], [grid.majorMm, grid.major]] as const) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < w; x += mm * pxPerMm) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y < h; y += mm * pxPerMm) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
```

Create `apps/demo/src/stage4a/timing.ts`:

```ts
// Pulse onset detection on rendered audio (gate evidence): a pulse is a run where |x| stays above 10 % of the peak,
// allowing dips shorter than 2 ms (the waveform's own zero crossings). Returns onsets, durations and the 10–90 %
// rise time of the first pulse.
export interface OnsetReport {
  onsetsS: number[];
  durationsS: number[];
  riseMs: number;
}

export function measureOnsets(x: Float32Array, sr: number): OnsetReport {
  // Envelope: max |x| over 1 ms windows.
  const win = Math.max(1, Math.round(sr / 1000));
  const env: number[] = [];
  for (let i = 0; i < x.length; i += win) {
    let m = 0;
    for (let k = i; k < Math.min(x.length, i + win); k++) m = Math.max(m, Math.abs(x[k] as number));
    env.push(m);
  }
  const peak = Math.max(...env);
  const thr = 0.1 * peak;
  const onsetsS: number[] = [];
  const durationsS: number[] = [];
  let start = -1;
  let below = 0;
  env.forEach((v, i) => {
    if (v >= thr) {
      if (start < 0) start = i;
      below = 0;
    } else if (start >= 0 && ++below > 2) {
      onsetsS.push(start / 1000);
      durationsS.push((i - below + 1 - start) / 1000);
      start = -1;
      below = 0;
    }
  });
  if (start >= 0) {
    onsetsS.push(start / 1000);
    durationsS.push((env.length - start) / 1000);
  }
  let riseMs = 0;
  const first = onsetsS[0];
  if (first !== undefined) {
    const i0 = Math.round(first * 1000);
    const localPeak = Math.max(...env.slice(i0, i0 + 60));
    const a = env.findIndex((v, i) => i >= i0 && v >= 0.1 * localPeak);
    const b = env.findIndex((v, i) => i >= i0 && v >= 0.9 * localPeak);
    riseMs = b - a;
  }
  return { onsetsS, durationsS, riseMs };
}
```

Create `apps/demo/src/stage4a/preview.ts`:

```ts
// Stage 4a preview page: every skin/preset × theme drawn statically, plus each alarm sound profile playable on
// demand through the real look-ahead ToneScheduler and AlarmSounder. `?skin=&theme=&static=1` gives a deterministic
// frame for the gate screenshots; window.__pme4a exposes state and an OfflineAudioContext timing renderer.
import {
  AlarmSounder, createTonePlayer, getAlarmProfile, pitchHz, playAlarmPulse, ToneScheduler, unlockAudio,
  type AlarmLevel, type AlarmToneRequest, type AudioOut, type ToneLogEntry, type ToneRequest,
} from '@pme/audio';
import { PRESET_IDS, resolveSkin, SKIN_IDS, THEME_IDS, type ResolvedSkin } from '@pme/skins';
import { renderScreen } from './screen.ts';
import { measureOnsets, type OnsetReport } from './timing.ts';

const q = new URLSearchParams(location.search);
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const skinSel = $<HTMLSelectElement>('skin');
const themeSel = $<HTMLSelectElement>('theme');
for (const id of [...SKIN_IDS, ...PRESET_IDS]) skinSel.add(new Option(id, id));
themeSel.add(new Option('(skin default)', ''));
for (const id of THEME_IDS) themeSel.add(new Option(id, id));
skinSel.value = q.get('skin') ?? 'saadat-like';
themeSel.value = q.get('theme') ?? '';
const animate = q.get('static') !== '1';

let resolved: ResolvedSkin = resolveSkin(skinSel.value, themeSel.value ? { theme: themeSel.value } : {});
let audio: AudioOut | null = null;
let sched: ToneScheduler | null = null;
let sounder: AlarmSounder | null = null;
const t0 = performance.now();
const simNow = () => (performance.now() - t0) / 1000; // sim time = wall time on this page

function overrides(r: ResolvedSkin) {
  const a = r.audio.alarm;
  return { repeatS: a.repeatS, lowPulses: a.lowPulses, volume: a.volume, silence: a.silence };
}

function buildSounder(): void {
  sounder?.dispose();
  if (!sched) return;
  sounder = new AlarmSounder(sched, getAlarmProfile(resolved.audio.alarm.profile), { overrides: overrides(resolved) });
  syncVolume();
}

function syncVolume(): void {
  const v = resolved.audio.alarm.volume;
  const vol = $<HTMLInputElement>('vol');
  vol.min = String(v.min);
  vol.max = String(v.max);
  vol.value = String(sounder?.volume ?? v.default);
  $('volVal').textContent = vol.value;
}

function render(): void {
  resolved = resolveSkin(skinSel.value, themeSel.value ? { theme: themeSel.value } : {});
  renderScreen($('screen'), resolved, animate);
  const names = resolved.skin.alarms.levelNames;
  $('levels').innerHTML = [1, 2, 3].map((l) => `<button data-level="${l}">Raise ${resolved.audio.alarm.profile} level ${names[l - 1]}</button>`).join(' ');
  buildSounder();
  syncVolume();
  (window as unknown as { __pme4a: object }).__pme4a = api;
  api.ready = true;
}

$('sound').addEventListener('click', async () => {
  if (audio) return;
  audio = await unlockAudio(() => sched?.clear());
  const out = audio;
  sched = new ToneScheduler({
    audioNow: () => out.ctx.currentTime,
    perfToAudio: out.perfToAudio,
    outputLatency: out.outputLatency,
    play: (tone, when) => createTonePlayer(out.ctx, out.master, { profile: getAlarmProfile(resolved.audio.alarm.profile), toneSet: resolved.skin.defib?.toneSet ?? 'zoll-like' })(tone, when),
  });
  sched.clock.setAnchor({ simT: 0, perfMs: t0, timeScale: 1 });
  sched.start();
  buildSounder();
  setInterval(() => sounder?.pump(simNow()), 25);
  $('sound').textContent = 'Sound on';
});

let raised = 0;
$('levels').addEventListener('click', (e) => {
  const lvl = Number((e.target as HTMLElement).dataset.level) as AlarmLevel;
  if (lvl && sounder) sounder.raise(`demo-${lvl}-${raised++}`, lvl, simNow());
});
$('clear').addEventListener('click', () => {
  sounder?.dispose();
  buildSounder();
});
$('silence').addEventListener('click', () => {
  if (!sounder) return;
  if (sounder.silencedUntil === null) sounder.silenceAll(simNow());
  else sounder.endSilence(simNow());
});
$<HTMLInputElement>('vol').addEventListener('input', (e) => {
  sounder?.setVolume(Number((e.target as HTMLInputElement).value));
  $('volVal').textContent = String(sounder?.volume ?? '');
});
$('devtones').innerHTML = ['charge', 'chargeReady', 'shock', 'nibpDone'].map((k) => `<button data-tone="${k}">${k}</button>`).join(' ');
$('devtones').addEventListener('click', (e) => {
  const kind = (e.target as HTMLElement).dataset.tone;
  if (kind && sched) sched.enqueue({ t: simNow() + 0.05, id: `dev-${kind}-${performance.now()}`, kind, ...(kind === 'charge' ? { chargeS: 5 } : {}) } as ToneRequest);
});
$('beeps').innerHTML = [100, 90, 80].map((s) => `<button data-spo2="${s}">Beep SpO2 ${s}</button>`).join(' ');
$('beeps').addEventListener('click', (e) => {
  const spo2 = Number((e.target as HTMLElement).dataset.spo2);
  const f = pitchHz(resolved.audio.beep.pitchMap, spo2, resolved.audio.beep.baseHz);
  if (spo2 && f !== null && sched) sched.enqueue({ t: simNow() + 0.05, id: `beep-${performance.now()}`, kind: 'qrs', freqHz: f });
});
skinSel.addEventListener('change', render);
themeSel.addEventListener('change', render);

setInterval(() => {
  const until = sounder?.silencedUntil;
  const log: readonly ToneLogEntry[] = sched?.log ?? [];
  $('diag').textContent =
    `profile ${resolved.audio.alarm.profile}  sounding ${sounder?.sounding ?? '-'}  ` +
    `${until != null ? `SILENCE ${Math.max(0, Math.ceil(until - simNow()))} s  ` : ''}tones ${log.length}\n` +
    `lane contract: ${resolved.render.lanes.map((l) => `${l.lane} ${l.color} ${l.mmPerS}mm/s`).join(' | ')}\n` +
    `ECG filter ${resolved.render.ecgFilter.name} ${resolved.render.ecgFilter.band.join('–')} Hz → engine '${resolved.render.ecgFilter.engineMode}'${resolved.render.ecgFilter.exact ? '' : ' (approximate)'}`;
}, 250);

/** Render one profile level offline and measure pulse onsets (gate evidence; BUILD-PLAN Stage 4 acceptance 1). */
async function renderTiming(profileId: string, level: AlarmLevel, seconds: number, skinId?: string): Promise<OnsetReport> {
  const sr = 48_000;
  const ctx = new OfflineAudioContext(1, Math.ceil(sr * seconds), sr);
  const profile = getAlarmProfile(profileId);
  const ov = skinId ? overrides(resolveSkin(skinId)) : {};
  const fake = {
    clock: { timeScale: 1 },
    enqueue: (t: ToneRequest) => void playAlarmPulse(ctx, ctx.destination, t.t, t as AlarmToneRequest, profile.harmonicsDb, profile.rampMs),
    cancel: () => undefined,
  };
  const s = new AlarmSounder(fake, profile, { overrides: ov, horizonS: seconds });
  s.raise('offline', level, 0);
  const buf = await ctx.startRendering();
  return measureOnsets(buf.getChannelData(0), sr);
}

const api = { ready: false, get resolved() { return resolved; }, renderTiming };
render();
```

- [ ] **Step 3: Typecheck and build the demo**

Run: `npx -y pnpm@9.15.9 --filter @pme/demo typecheck && npx -y pnpm@9.15.9 --filter @pme/demo build`
Expected: clean; `dist/stage4a-skins.html` is emitted.

- [ ] **Step 4: Look at it**

Run `npx -y pnpm@9.15.9 --filter @pme/demo dev` in your own terminal (not through an agent launcher: memory "browser pane verification recipe"), open `http://localhost:5173/stage4a-skins.html`, switch through every skin and theme, press **Enable sound**, raise each level for `saadat-like` (5 / 3 / 1 pulses), press **Silence** (the diagnostics line counts down from 120), raise a new level during silence (sound resumes at once), then switch to `philips-like` and repeat (silence 90 s, new alarms stay silent). Stop the server.

- [ ] **Step 5: Commit**

```bash
git add apps/demo/stage4a-skins.html apps/demo/src/stage4a apps/demo/package.json apps/demo/vite.config.ts apps/demo/index.html pnpm-lock.yaml
git commit -m "feat(demo): stage4a skin preview page with playable alarm profiles" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: Gate screenshots and the rendered-audio timing log

**Files:**
- Create: `apps/demo/e2e/stage4a-skins.e2e.ts`
- Create (generated): `docs/gates/stage-4a/*.png` (11), `docs/gates/stage-4a/audio-timing.json`

**Interfaces:**
- Consumes: the preview page (Task 17).
- Produces: one PNG per skin / preset / theme combination; `audio-timing.json` (one entry per profile level: pulses per burst, burst intervals, first-burst onsets, measured pulse widths, 10–90 % rise).

The audio test renders each case with `OfflineAudioContext` in the page, detects pulse onsets from the samples, and fails unless every burst has the profile's pulse count, every inter-burst interval is within 5 ms of the data, a non-repeating level sounds once, and the rise time is ≥ 10 ms (BUILD-PLAN Stage 4 acceptance 1–2, for the sound side). Render lengths are chosen so the last burst is complete.

- [ ] **Step 1: Write the test**

Create `apps/demo/e2e/stage4a-skins.e2e.ts`:

```ts
// Gate 4a evidence: one screenshot per skin / preset / theme combination, and an OfflineAudioContext timing log
// of every alarm sound profile level (pulse onsets measured from rendered audio, not from the schedule).
// Run: PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/stage4a-skins.e2e.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-4a');

test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => vite?.close());

const SHOTS: Array<[string, string]> = [
  ['saadat-like', ''], ['iran-icu-as-found', ''], ['philips-like', ''], ['zoll-like', ''], ['mindray-like', ''], ['ge-like', ''], ['lifepak-like', ''],
  ['saadat-like', 'projector-light'], ['philips-like', 'projector-light'], ['philips-like', 'ecg-grid'], ['saadat-like', 'ecg-grid'],
];

async function ready(page: Page) {
  await page.waitForFunction(() => (window as unknown as { __pme4a?: { ready: boolean } }).__pme4a?.ready === true);
}

test('one screenshot per skin, preset and theme', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1300, height: 760 });
  for (const [skin, theme] of SHOTS) {
    await page.goto(`${base}/stage4a-skins.html?skin=${skin}&theme=${theme}&static=1`);
    await ready(page);
    await page.locator('#screen').screenshot({ path: resolve(out, `${skin}${theme ? `--${theme}` : ''}.png`) });
  }
  expect(errors).toEqual([]);
});

type Report = { onsetsS: number[]; durationsS: number[]; riseMs: number };
const CASES: Array<{ profile: string; level: 1 | 2 | 3; seconds: number; skin?: string; pulses: number; repeatS: number | null }> = [
  { profile: 'iec-style', level: 1, seconds: 24, pulses: 10, repeatS: 10 },
  { profile: 'iec-style', level: 2, seconds: 42, pulses: 3, repeatS: 20 },
  { profile: 'iec-style', level: 3, seconds: 20, pulses: 1, repeatS: null },
  { profile: 'iec-style', level: 3, seconds: 20, skin: 'philips-like', pulses: 2, repeatS: null },
  { profile: 'iec-style', level: 1, seconds: 34, skin: 'zoll-like', pulses: 10, repeatS: 15 },
  { profile: 'saadat', level: 1, seconds: 22, pulses: 5, repeatS: 10 },
  { profile: 'saadat', level: 2, seconds: 42, pulses: 3, repeatS: 20 },
  { profile: 'saadat', level: 3, seconds: 62, pulses: 1, repeatS: 30 },
  { profile: 'traditional', level: 1, seconds: 3.5, pulses: 1, repeatS: 1 },
  { profile: 'traditional', level: 2, seconds: 5, pulses: 1, repeatS: 2 },
];

test('alarm profiles: rendered pulse timing matches the data (OfflineAudioContext)', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto(`${base}/stage4a-skins.html?static=1`);
  await ready(page);
  const log: Array<Record<string, unknown>> = [];
  for (const c of CASES) {
    const r = (await page.evaluate(
      ([p, l, s, k]) => (window as unknown as { __pme4a: { renderTiming: (...a: unknown[]) => Promise<Report> } }).__pme4a.renderTiming(p, l, s, k),
      [c.profile, c.level, c.seconds, c.skin] as const,
    )) as Report;
    // Group into bursts (gap > 1.5 s) and compare with the data.
    const bursts: number[][] = [];
    for (const t of r.onsetsS) {
      const cur = bursts[bursts.length - 1];
      if (cur && t - (cur[cur.length - 1] as number) < (c.repeatS !== null && c.repeatS < 1.5 ? 0.5 : 1.5)) cur.push(t);
      else bursts.push([t]);
    }
    const starts = bursts.map((b) => b[0] as number);
    const intervals = starts.slice(1).map((t, i) => t - (starts[i] as number));
    log.push({ ...c, bursts: bursts.length, pulsesPerBurst: bursts.map((b) => b.length), intervalsS: intervals.map((x) => +x.toFixed(4)), firstBurstOnsetsS: bursts[0]?.map((x) => +x.toFixed(4)), pulseDurS: r.durationsS.slice(0, 3).map((x) => +x.toFixed(4)), riseMs: r.riseMs });
    expect(bursts.every((b) => b.length === c.pulses), JSON.stringify(log.at(-1))).toBe(true);
    if (c.repeatS === null) expect(bursts).toHaveLength(1);
    else for (const iv of intervals) expect(Math.abs(iv - c.repeatS)).toBeLessThan(0.005);
    expect(r.riseMs).toBeGreaterThanOrEqual(10);
  }
  writeFileSync(resolve(out, 'audio-timing.json'), `${JSON.stringify(log, null, 1)}\n`);
});
```

- [ ] **Step 2: Run it**

Run: `PW_SYSTEM_CHROME=1 npx playwright test apps/demo/e2e/stage4a-skins.e2e.ts`
Expected: `2 passed`; `docs/gates/stage-4a/` holds 11 PNGs and `audio-timing.json` whose numbers match the "Prototype evidence" table at the top of this plan.

- [ ] **Step 3: Look at every PNG** (open them). Check: saadat-like green ECG / magenta pleth / salmon IBP1 / light-blue IBP2 / yellow resp, grey idle bar, crossed bells in every tile and the header; iran-icu-as-found with two `II  X2  MONITOR` lanes and the date `1402/04/04`; philips-like with `***`, `**`, `*` bars and `II  M`; the projector and grid themes readable on white. Record anything wrong in the gate note instead of silently fixing data.

- [ ] **Step 4: Commit**

```bash
git add apps/demo/e2e/stage4a-skins.e2e.ts docs/gates/stage-4a
git commit -m "test(demo): stage 4a gate screenshots and OfflineAudioContext alarm timing log" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: Gate note and full verification

**Files:**
- Create: `docs/gates/stage-4a.md`

**Interfaces:**
- Consumes: everything above.
- Produces: the gate note the orchestrator reads (R21), including the Saadat not-documented table and Ali's bedside checklist.

- [ ] **Step 1: Run the whole repository**

```bash
npx -y pnpm@9.15.9 -r typecheck
npx -y pnpm@9.15.9 -r test
npx -y pnpm@9.15.9 -r build
node --experimental-strip-types scripts/check-notices.ts
grep -c ajv packages/skins/dist/index.js || true
PW_SYSTEM_CHROME=1 npx playwright test apps/demo/e2e/stage4a-skins.e2e.ts apps/demo/e2e/iife-smoke.e2e.ts
```
Expected: every package green (skins 155, audio 58, renderer, engine-core, controller and validation as on main); build OK; `check-notices: OK`; `0` (no ajv in the skins bundle); Playwright all passed.

- [ ] **Step 2: Print the audio-timing table for the note**

```bash
node -e "const d=require('./docs/gates/stage-4a/audio-timing.json');console.log('| Profile | Level | Skin | Pulses/burst | Intervals (s) | First-burst onsets (s) | Pulse width (s) | Rise (ms) |\n|---|---|---|---|---|---|---|---|');for(const c of d)console.log('|',c.profile,'|',c.level,'|',c.skin??'—','|',c.pulsesPerBurst.join(', '),'|',c.intervalsS.join(', ')||'—','|',c.firstBurstOnsetsS.join(' '),'|',c.pulseDurS.join(', '),'|',c.riseMs,'|')"
```

- [ ] **Step 3: Write the gate note** — create `docs/gates/stage-4a.md` with the content below, replacing every `FILL` with the numbers from Steps 1–2 (the not-documented table is the prototype's output of the saadat-like provenance and the `saadat` profile provenance filtered to tags other than `documented` and `measured`; re-check that it still matches the committed data):

```markdown
# Stage 4a gate: skins as data and alarm sound profiles

*Branch `stage-4a-skins-audio`. Plan: `docs/plans/stage-4a-skins-audio.md`. Contract for Stage 4b: `packages/skins/CONTRACT.md`.*

## What landed

- `@pme/skins`: a closed JSON Schema (ajv, `@pme/skins/validate`), six skins in the R14 order (`saadat-like`, `philips-like`,
  `zoll-like`, `mindray-like`, `ge-like`, `lifepak-like`), the `iec-defaults` base, themes `projector-light` and `ecg-grid`,
  the `iran-icu-as-found` preset, and `resolveSkin(id, { theme })` with the renderer/audio contract.
- `@pme/audio`: alarm sound profiles `iec-style`, `saadat`, `traditional` as data; `AlarmSounder` on the existing
  look-ahead `ToneScheduler`; volume curves; pitch maps `nellcor-like`, `enhanced`, `none`; charge, ready, shock and
  NIBP-done tones; `createTonePlayer`.
- `apps/demo/stage4a-skins.html`: static preview of every skin, preset and theme; every alarm profile playable.

## Evidence

| Check | Result |
|---|---|
| `@pme/skins` tests | FILL: n passed (13 files, 21 snapshots) |
| `@pme/audio` tests | FILL: n passed (10 files) |
| whole-repo typecheck / test / build / check-notices | FILL |
| Playwright `stage4a-skins.e2e.ts` | FILL: 2 passed |
| `@pme/skins` bundle contains ajv | FILL: no |

Screenshots: `docs/gates/stage-4a/*.png` (FILL: list the 11 files). Audio timing: `docs/gates/stage-4a/audio-timing.json`:

FILL: paste the table printed by the one-liner in Task 19 Step 2.

## What Ali checks at the bedside

### Saadat-like values that are not documented

Every row below is a value the skin or the `saadat` sound profile uses that is **not** taken from the Saadat manual
as published. Tags are research 06's. Rows tagged `measured` (hex sampled from the manual's own screenshots, since
Saadat publishes colour names, not hex) are left out here; photo 1 of the checklist confirms them too.

| Field | Value | Tag | Source / note |
|---|---|---|---|
| skin `foreground` | `"#F0F0F0"` | assumed | research/06 §3.1 F1 — white lane labels; hex not published |
| skin `chrome.windowFrame` | `"#00F000"` | assumed | research/06 §3.1 F4-F5 — colour name documented, hex = ECG green |
| skin `chrome.softkeyFrame` | `"#F0F000"` | assumed | research/06 §3.1 F5 — yellow outline documented, hex assumed |
| skin `font` | `{"stack":"Arial, 'Liberation Sans', Helvetica, sans-serif","numericWeight":400,"labelCase":"upper"}` | inferred | research/06 §3.1 F1; research/06 §3.2 — Arial-like regular; the stack is [ENG] |
| skin `colors.IBP3` | `"#E07000"` | conflict | research/06 §3.2; brief §6.8 — name 'DARK ORANGE'; B9 screenshot shows mid blue ≈#3080F0 |
| skin `colors.IBP4` | `"#008C8C"` | conflict | research/06 §3.2; brief §6.8 — name 'DARK CYAN'; screenshot shows white |
| skin `colors.BFA` | `"#F0F0F0"` | assumed | research/06 §5; brief §6.8 — from the Alvand screenshot |
| skin `colors.AGENTS` | `"#F0F030"` | unverified | research/06 §3.2; brief §6.8 — not in the manual |
| skin `defaultPage` | `"P1"` | eng | ENG — factory page not stated |
| skin `sweep.style` | `"erase-bar"` | inferred | research/06 §3.1 F7 (S8) |
| skin `sweep.gapPx` | `4` | inferred | research/06 §3.1 F7 (S8); brief §3.5 — very narrow gap; verify with checklist photo 2 |
| skin `sweep.cursorLine` | `false` | inferred | research/06 §3.1 F7 (S8); brief §3.5 |
| skin `sweep.lineWidthPx` | `1.5` | eng | brief §3.5 [ENG] |
| skin `nibp.doneTone` | `false` | unverified | research/06 §4.1 — no NIBP-done tone described |
| skin `alarms.lamp.flashHz` | `{"L1":2,"L2":0.6}` | assumed | research/06 §4.2; brief §6.4.1 — not published; IEC-typical 2.0/0.6 Hz |
| skin `alarms.lamp.duty` | `0.5` | assumed | brief §6.4 (visual table) |
| skin `alarms.messageBar` | `{"L1":{"bg":"#F00000","fg":"#000000"},"L2":{"bg":"#F0F000","fg":"#000000"},"L3":{"bg":"#00D0D0","fg":"#000000"},"idle":{"bg":"#E0E0E0","fg":"#000000"},"acknowledged":{"bg":"#E0E0E0","fg":"#000000"},"prefix":"none","rotate":true}` | assumed | research/06 §5; brief §6.8 — colours per M p.38, 47; hex from the report 06 draft |
| skin `alarms.latching` | `false` | unverified | research/06 §4.2; brief §6.4.1 — manual implies non-latching |
| skin `alarms.spo2DelayS` | `null` | unverified | research/06 §4.2 — not stated beyond averaging |
| skin `limits.paed.inherit` | `"adult"` | unverified | research/06 §4.3; brief §6.8 — HR, SpO2, RR, Temp not banded in the manual; adult values inherited and marked approximate |
| skin `limits.neo.inherit` | `"adult"` | unverified | research/06 §4.3; brief §6.8 — adult HR 50-150 is clinically wrong for neonates |
| skin `arrhythmia.asystoleS` | `{"adult":10,"neo":10}` | conflict | research/06 §4.3 (M p.65, 70, 83); brief §6.4.1 — 10 s (ECG chapter) vs 5 s (arrhythmia chapter) |
| skin `arrhythmia.asystoleAltS` | `5` | conflict | research/06 §4.3 (M p.83); brief §6.4.1 |
| skin `beep.pitchMap` | `"none"` | unverified | research/06 §4.1; brief §3.6 — SpO2 pitch modulation not documented |
| skin `beep.baseHz` | `880` | assumed | brief §3.6 — pitch not published |
| skin `glyphs.noValue` | `"---"` | assumed | brief §6.2 |
| audio `saadat.levels.L1.gapsMs` | `[100,100,300,100]` | assumed | brief §6.4.1; research/06 §4.2 (M p.47) — pattern documented; 100/300 ms gaps assumed |
| audio `saadat.levels.L2.gapsMs` | `[100,100]` | assumed | brief §6.4.1 — 3 pulses documented; gaps assumed |
| audio `saadat.levels.L1.pulseMs` | `150` | assumed | brief §6.4.1 |
| audio `saadat.levels.L2.pulseMs` | `150` | assumed | brief §6.4.1 |
| audio `saadat.levels.L3.pulseMs` | `150` | assumed | brief §6.4.1 |
| audio `saadat.levels.L1.freqHz` | `880` | unverified | brief §6.4.1; research/06 §7 — pitch not published; 880 Hz assumed |
| audio `saadat.levels.L2.freqHz` | `880` | unverified | brief §6.4.1; research/06 §7 |
| audio `saadat.levels.L3.freqHz` | `880` | unverified | brief §6.4.1; research/06 §7 |
| audio `saadat.levels.L1.levelDb` | `0` | assumed | brief §6.4 (priorities 3–6 dB apart) |
| audio `saadat.levels.L2.levelDb` | `-4` | assumed | brief §6.4 (priorities 3–6 dB apart) |
| audio `saadat.levels.L3.levelDb` | `-8` | assumed | brief §6.4 (priorities 3–6 dB apart) |
| audio `saadat.harmonicsDb` | `[0,-3,-6,-9,-12]` | eng | brief §6.4.1 (reuse the §6.4 PeriodicWave until recordings) |
| audio `saadat.rampMs` | `15` | eng | brief §6.4 |
| audio `saadat.volume.maxGain` | `0.5` | eng | ENG |

### Bedside checklist (research 06 §7)

Before starting: **Setup → LOAD DEFAULT** (ask biomed first), and set the date to Solar. Phone camera, B9 on a
patient simulator or a consenting monitored patient, no patient identifiers on screen.

| # | Capture | Settles (fields above) |
|---|---|---|
| 1 | Factory main screen, P1, straight on and in focus | colours, tile grid, crossed bells (`colors.*`, `layout.*`, `foreground`, `chrome.*`) |
| 2 | Same screen at 1/15 s shutter, or a 240 fps slow-motion clip of ~3 s on the ECG lane | `sweep.gapPx`, `sweep.cursorLine`, `sweep.style` |
| 3 | MODULE COLOR window (Home → Module Setup → Module Color) | `colors.IBP3`, `colors.IBP4` (conflicts), palette names |
| 4 | Each alarm level on screen: HR high limit < HR (L1), then HR level 2, then unplug the SpO2 probe (L3); close-up of bar and lamp | `alarms.messageBar`, `alarms.lamp.*` (and flash rate from a video) |
| 5 | Silence pressed: header countdown icon, what the flashing numeric does | `alarms.silence.*` visuals |
| 6 | Paediatric and neonatal categories after LOAD DEFAULT: HR, SpO2 and Resp alarm windows | `limits.paed.inherit`, `limits.neo.inherit` |
| 7 | P5 (12-lead) and P10 (PUMP) with IBP connected | `pages` |
| 8 | An OR monitor and an ICU monitor **as found**, before touching anything | `iran-icu-as-found`; are alarms on in ORs? |
| Audio | Phone 30 cm away, quiet room: 40 s each of L1, L2, L3; QRS beep at volume 3 while SpO2 falls | `saadat.levels.*.pulseMs/gapsMs/freqHz`, `beep.pitchMap`, `beep.baseHz` |
| Stopwatch | Lead-off-with-asystole-simulator → alarm: 5 s or 10 s? HR 80→120 at 8 s average | `arrhythmia.asystoleS` (conflict) |

When the recordings arrive, the WAVs go to `research/` and the values change in `packages/audio/src/profiles/saadat.ts`
and `packages/skins/src/data/skins/saadat-like.json` with their tags moved to `measured` and the source updated;
the tests then pin the new numbers.

## Requests for Stage 4b and the engine

RR-1 … RR-6 and E-4a-1 … E-4a-3, as listed in the plan and in `packages/skins/CONTRACT.md`.

## Deviations from the plan

FILL: none, or each one with its reason.

```

- [ ] **Step 4: Commit**

```bash
git add docs/gates/stage-4a.md
git commit -m "docs(gates): stage 4a gate note with the Saadat not-documented table and bedside checklist" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: Pull request

**Files:** none.

**Interfaces:**
- Produces: an open PR `stage-4a-skins-audio` → `main` (not merged; R21: the orchestrator merges after inspecting the gate).

- [ ] **Step 1: Rebase check against a moving `main`** (Stages 2, 5 and 6b may have merged)

```bash
git fetch origin
git rebase origin/main
```
If `NOTICES.md` conflicts, keep both rows and renumber this stage's ajv row to the next free ID (if Stage 6b added ajv first, drop this stage's row and use its version). If `pnpm-lock.yaml` conflicts, take `origin/main`'s and run `npx -y pnpm@9.15.9 install`, then commit the lockfile. Re-run Task 19 Step 1 after any rebase that changed files.

- [ ] **Step 2: Push and open the PR**

```bash
git push -u origin stage-4a-skins-audio
gh pr create --base main --head stage-4a-skins-audio --title "Stage 4a: skins as data and alarm sound profiles" --body-file - <<'EOF'
## Stage 4a: skins as data and alarm sound profiles

- `@pme/skins`: closed JSON Schema (ajv behind `@pme/skins/validate`), saadat-like (research 06 provenance), philips-like,
  zoll-like, mindray-like, ge-like, lifepak-like, themes projector-light and ecg-grid, preset iran-icu-as-found,
  `resolveSkin` renderer/audio contract (`packages/skins/CONTRACT.md`).
- `@pme/audio`: iec-style / saadat / traditional alarm sound profiles as data, AlarmSounder on the look-ahead scheduler,
  volume curves, pitch maps, device tones, createTonePlayer.
- `apps/demo/stage4a-skins.html`: preview of every skin/theme/preset with playable alarm profiles.

Gate note: `docs/gates/stage-4a.md` (screenshots, OfflineAudioContext timing log, the Saadat not-documented table and
the bedside checklist). No engine or renderer files changed; requests RR-1…RR-6 and E-4a-1…E-4a-3 are listed there.

### Sources consulted
Brief §3.5, §3.6, §3.8, §6.4, §6.4.1, §6.5, §6.8, §6.9; research 05 §2; research 06 §3–§7; rulings R2, R3, R12–R14, R25.

### NOTICES rows added
ajv (MIT), runtime of `@pme/skins/validate` only.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```
Expected: the PR URL. Do not merge.

---

## Self-review (done while writing this plan)

- **Spec coverage.** Brief §3.8 fields incl. every Saadat-driven row → `types.ts`/`schema.ts` (Tasks 2, 4) and `saadat-like.json` (Task 5); `alarms.sound` deliberately moved to `@pme/audio` (Decision 2). Age-band limit tables → `limits` with `inherit` + `approximateLimits` (Tasks 5, 6). NIBP/SpO2 averaging, HR method/source/priority, filter-name map, calendar, layouts incl. `bigNumber` and `pump` page kinds → schema + saadat-like pages (P10 `pump`) (Tasks 4–5; no shipped skin documents a big-number page, so the kind exists without an instance). Six skins, two themes, one preset → Tasks 5–10. Profiles `iec-style` (§6.4 table), `saadat` (§6.4.1), `traditional` (05 §2.5) → Task 12; Mindray gives no cadence numbers (05 §2.5), so `mindray-like` uses `iec-style`; ZOLL cadence as skin overrides (Task 7). Volume 1–7 and 0–10 curves, lamp flash rates (skin `alarms.lamp.flashHz`), device tones, pitch maps → Tasks 13–14. Stable ids + cancel → Task 15. Tests: schema, unknown/missing fields, provenance completeness, contrast ≥ 3:1, burst timing on a fake clock, silence, volume, pitch monotonicity, snapshots → Tasks 2–16. Preview + screenshots + audio-timing log → Tasks 17–18. Gate note with the unverified table and checklist → Task 19. PR → Task 20.
- **Placeholders.** None in code steps; the only `FILL` markers are in the gate note, for numbers that exist only after the run.
- **Type consistency.** `ResolvedSkin.audio.alarm` (`repeatS`, `lowPulses`, `volume`, `silence`) is passed as `ProfileOverrides` in `preview.ts`; `AlarmToneRequest` fields are what `playAlarmPulse` reads; `SounderScheduler` is satisfied by `ToneScheduler` and by the offline fake in `preview.ts`; `LaneRender` fields map onto `LaneConfig` in `screen.ts`.
