# Stage 1: ECG Vertical Slice (rhythm engine + sweep + beep) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A believable single-channel monitor: an event-scheduled VCG ECG with a real rhythm engine (11 rhythms + PVC ectopy), monitor filters, a QRS detector and device HR averaging, drawn by a sim-time sweep renderer in an OffscreenCanvas worker (with fallbacks), with a QRS beep scheduled on the Web Audio clock.

**Architecture:** `@pme/engine-core` (no DOM) holds L1 (the `hr` target ramp), L2 (Gaussian-kernel VCG generator driven by a discrete-event rhythm engine with separate atrial/ventricular clocks and an AV-node state machine) and L3 (IIR monitor filters, Pan–Tompkins-like QRS detector, 12-RR HR averaging). The engine keeps ONE committed, JSON-safe pipeline state; each 20 ms tick it advances that state and then runs a `structuredClone` of it 100 ms ahead (the look-ahead) to fill Float32 ring buffers indexed by absolute sample number and to post QRS `tone` events early; a command changes the committed state, so the next look-ahead pass regenerates everything after "now" and a `toneCancel` revokes stale tones. `@pme/renderer` draws sweep lanes from sim time (min/max decimation per device-pixel column, erase gap, tail re-stroke) inside `MonitorCore`, which runs in a worker (OffscreenCanvas) or on the main thread; `@pme/audio` maps sim time → wall time → audio time and schedules beeps with a 25 ms / 100 ms look-ahead scheduler.

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2, Vite 6.4 (`?worker&inline` for the IIFE's blob worker), Canvas 2D / OffscreenCanvas, Web Audio. No runtime dependencies.

**Spec:** `docs/DESIGN-BRIEF.md` §3 (architecture, tick model, rendering, audio), §4.1 (ECG model, seed kernels, Dower rows, rate rules, HRV, rhythm engine, AV sub-models, measurement chain), §4.8 (`k_rhythm`), §5 (rhythm library, modifiers, artefacts), §6.1 (measured HR), §7.1–7.3 and §7.6 (API names and types), §8 (clean-room/NOTICES). `docs/BUILD-PLAN.md` "Stage 1" (scope, demo, 12 acceptance tests, visual checklist) and "First 3 days" S1.1–S1.12. Physiology reference: `../research/03-waveform-physiology-reference.md` §1 and §11 (verification status). Rulings: `../research/00-orchestrator-rulings.md`.

## Global Constraints

- Stage 0 is merged and its gate passed. Paths are relative to `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo`; run commands from there.
- Everything in Stage 0's Global Constraints still applies (strict TS with `noUncheckedIndexedAccess` and `erasableSyntaxOnly` — no enums, no parameter properties; `.ts` import extensions; commit trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; conventional commits; clean-room list).
- **No runtime dependencies** in `@pme/engine-core`; `@pme/renderer` depends only on `@pme/engine-core` and `@pme/audio` (workspace). No new NOTICES rows are needed in this stage (nothing is borrowed; every equation is cited in a code comment).
- Public names are the brief's exactly (§7): `createEngine`, `MonitorEngine`, `start`, `pause`, `resume`, `setTimeScale`, `step`, `advanceTo`, `now`, `dispatch`, `on`, `readSamples`, `latestSampleIndex`, `sampleRate`, `snapshot`, `restore`; types `Tick`, `SimSeconds`, `ChannelId`, `NumericId`, `StateVar`, `Ramp`, `EngineOptions`, `Command`, `DispatchResult`, `DeviceAction`, `Measured`, `EngineEvent`, `PatientSnapshot`; command types `setTarget`, `setRhythm`, `setModifiers`, `device`; event types `beat`, `atrial`, `measurement`, `tone`, `toneCancel`; rhythm IDs `sinus`, `sinusBrady`, `sinusTachy`, `afib`, `aflutter`, `svtAvnrt`, `avb1`, `avb2Mobitz1`, `avb3Narrow`, `avb3Wide`, `vtMono`, `asystole`; modifier `pvc` with patterns `single`, `bigeminy`; `mountMonitor` and the IIFE global `PatientMonitor = { mountMonitor, createEngine, transports, version }`.
- Rates: ECG/VCG 500 Hz; tick 20 ms (10 ECG samples/tick); look-ahead L = 100 ms (brief §3.3, §11 C6); ring buffers 120 s. Sample `n` belongs to time `n/500`; a tick fills indices up to `floor((simT+L)·500)` inclusive.
- Every physiological or engineering constant carries a comment citing the brief/research section, or `[ENG]` when it is an engineering choice.
- Test commands: `pnpm --filter @pme/engine-core exec vitest run <path>` (and the same with `@pme/renderer` / `@pme/audio`). Full run: `pnpm typecheck && pnpm test && pnpm build`.
- Names this plan defines because the brief leaves them undefined are listed once, in the Interfaces block of the task that creates them, and reused verbatim afterwards (e.g. `RhythmOpts` fields, `Modifiers` Stage 1 fields, `LeadId`, `EcgFilterMode`, `PatientProfile` subset, `MonitorHandle` Stage 1 members, `RenderPath`).

## Decisions this plan makes where the spec was silent or inconsistent

1. **PR60 default = 190 ms** (brief example implies 160). With 160, the P peak at 150 bpm lands 26 ms after T end and acceptance test 3 cannot pass; with 190, PR(150) = 154 ms and the P peak (291 ms after QRS onset) lies inside the preceding T (T end = QT = 295 ms). Nothing is special-cased.
2. **ProSim ratios:** the fitted VCG vectors reproduce lead II's seed amplitudes exactly and I = 70%, III = 30% of II. V1 (24%) and V4 (120%) cannot be met together with I = 70% through the Dower rows for any physiological QRS loop (tested by constrained least squares and by random search); the precordials are instead fitted to a normal R progression (V1 rS, V4/V5 dominant R). The PTB-XL refit in Stage 5 revisits this; Stage 4's "ProSim ratios ±25%" test will need the orchestrator's ruling.
3. **Refractoriness:** `refractoryUntil = t + QRS + 0.8·QT` (brief §4.1) conceals competing activations (conducted P during VT, sinus beat after a PVC). Primary pacemakers that set their own cycle (the VT/AVNRT focus and the AF junction) bypass the check — otherwise VT above ~135/min is impossible.
4. **AF integrate-and-fire calibration** [ENG]: threshold θ = 80·RR² mV, refractory τ = RR − θ/105 (min 0.25 s = RR_min), target RR scaled by 0.95. Simulated: mean rate within ±5% of target 60–150 bpm, RR CV 0.18–0.28, |lag-1 r| < 0.08.
5. **HR while no QRS for ≥ 4 s** reads 0 (Philips adult asystole delay); the "up to 8 RR during PVC runs" rule needs arrhythmia classification and is deferred to Stage 4.
6. **Tone timing:** QRS tone at detected R + 40 ms; the detector reports narrow QRS ≈ 110 ms after R (≤ 120 ms tested), wide ≈ 130–160 ms, so with L = 100 ms narrow-complex tones are posted ≈ 30 ms before they are due.
7. **`DeviceAction` for ECG** keeps the brief's shape; Stage 1 implements `filter` (`'monitor' | 'diagnostic'`) and `lead` (`value: LeadId`, `lane: 0|1|2`); lanes default to `['ecgII','V5']`, and only lane leads (plus `vcgX/Y/Z`) have buffers.
8. **`MonitorHandle.dispatch` returns `Promise<DispatchResult>`** (the engine may live in a worker).

## File map

| Path | Responsibility |
|---|---|
| `packages/engine-core/src/version.ts` | `version` (moved out of `index.ts` to avoid an import cycle) |
| `…/src/buffers/ring.ts` | `RingBuffer` (Float32, absolute index) |
| `…/src/types.ts` | Public types (brief §7 subset) |
| `…/src/modifiers.ts` | `defaultModifiers()` |
| `…/src/l1/ramp.ts` | `hr` target ramps (linear/exp/sigmoid, delay, mid-ramp retarget) |
| `…/src/l2/ecg/{vcg,kernels,intervals,templates,hrv,rhythms,rhythm-engine,generator}.ts` | ECG synthesis |
| `…/src/l3/{ecg-filter,qrs,hr}.ts` | Device measurement chain |
| `…/src/engine.ts` | `createEngine`, tick loop, look-ahead, commands, events, snapshot |
| `…/test/helpers/{rhythm,stats,ecg}.ts` | Test helpers |
| `packages/renderer/src/{ctx,decimate,sweep-lane,protocol,monitor-core,numerics-dom,engine.worker,worker-host,mount,vite-env.d}.ts` | Renderer, worker host, mount |
| `packages/audio/src/{clock-map,scheduler,tones,context}.ts` | Audio |
| `apps/demo/{stage1.html,src/stage1.ts}` | Demo |
| `docs/gates/stage-1.md` | Gate evidence |

---

### Task 1: Ring buffers with absolute sample index

**Files:**
- Create: `packages/engine-core/src/version.ts`, `packages/engine-core/src/buffers/ring.ts`, `packages/engine-core/test/buffers/ring.test.ts`
- Modify: `packages/engine-core/src/index.ts`

**Interfaces:**
- Consumes: Stage 0 engine-core.
- Produces: `version` now lives in `src/version.ts` (index re-exports it). `class RingBuffer { constructor(rate: number, seconds: number); readonly rate; readonly capacity /* ceil(rate·seconds) */; get latest(): number /* -1 when empty */; get oldest(): number; write(index: number, value: number): void /* overwrite allowed; latest never moves back */; at(index: number): number /* NaN if not held */; read(from: number, out: Float32Array): number /* copies from max(from, oldest); returns count */; clear(): void }`.

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/buffers/ring.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { RingBuffer } from '../../src/buffers/ring.ts';

describe('buffers/RingBuffer', () => {
  it('holds rate × seconds samples', () => {
    expect(new RingBuffer(500, 120).capacity).toBe(60_000);
    expect(new RingBuffer(62.5, 120).capacity).toBe(7_500);
  });

  it('reads back by absolute index, across the wrap-around', () => {
    const rb = new RingBuffer(10, 1); // capacity 10
    for (let i = 0; i < 25; i++) rb.write(i, i);
    expect(rb.latest).toBe(24);
    expect(rb.oldest).toBe(15);
    const out = new Float32Array(10);
    expect(rb.read(15, out)).toBe(10);
    expect([...out]).toEqual([15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
    expect(rb.at(14)).toBeNaN();
    expect(rb.at(20)).toBe(20);
  });

  it('clamps reads to the retained window and to latest', () => {
    const rb = new RingBuffer(10, 1);
    for (let i = 0; i < 12; i++) rb.write(i, i);
    const out = new Float32Array(5);
    expect(rb.read(0, out)).toBe(5); // clamped to oldest = 2
    expect(out[0]).toBe(2);
    expect(rb.read(10, out)).toBe(2); // only 10 and 11 exist
    expect(rb.read(50, out)).toBe(0);
  });

  it('overwrites look-ahead samples without moving latest backwards', () => {
    const rb = new RingBuffer(10, 1);
    for (let i = 0; i <= 8; i++) rb.write(i, 1);
    rb.write(6, 99);
    expect(rb.latest).toBe(8);
    expect(rb.at(6)).toBe(99);
  });

  it('keeps exact absolute indexing over 24 h at 500 Hz (43,200,000 samples)', () => {
    const rb = new RingBuffer(500, 120);
    const last = 86_400 * 500 - 1;
    for (let i = last - 70_000; i <= last; i++) rb.write(i, i % 1000);
    expect(rb.latest).toBe(43_199_999);
    expect(rb.oldest).toBe(43_199_999 - 60_000 + 1);
    expect(rb.at(43_199_999)).toBe(999);
    expect(rb.at(43_150_123)).toBe(123);
  });
});
```

- [x] **Step 2: Run to see it fail**

Run: `pnpm --filter @pme/engine-core exec vitest run test/buffers`
Expected: FAIL — cannot load `../../src/buffers/ring.ts`.

- [x] **Step 3: Implement**

`packages/engine-core/src/version.ts`:
```ts
export const version = '0.0.0';
```

`packages/engine-core/src/buffers/ring.ts`:
```ts
// Float32 ring buffer indexed by ABSOLUTE sample index (brief §3.3): sample n belongs to time n / rate.
// Only the most recent `capacity` samples are retained (brief §3.5: 120 s for freeze and scroll-back).

export class RingBuffer {
  readonly rate: number;
  readonly capacity: number;
  private readonly data: Float32Array;
  private _latest = -1;

  constructor(rate: number, seconds: number) {
    this.rate = rate;
    this.capacity = Math.ceil(rate * seconds);
    this.data = new Float32Array(this.capacity);
  }

  /** Absolute index of the newest sample written, or -1 when empty. */
  get latest(): number {
    return this._latest;
  }

  /** Oldest absolute index still held. */
  get oldest(): number {
    return Math.max(0, this._latest - this.capacity + 1);
  }

  /**
   * Write sample `index`. Re-writing an index inside the retained window overwrites it
   * (look-ahead regeneration); `latest` never moves backwards.
   */
  write(index: number, value: number): void {
    if (index < 0 || index <= this._latest - this.capacity) return; // too old: silently dropped
    this.data[index % this.capacity] = value;
    if (index > this._latest) this._latest = index;
  }

  /** Read one sample; NaN when not held. */
  at(index: number): number {
    if (index < this.oldest || index > this._latest) return Number.NaN;
    return this.data[index % this.capacity] as number;
  }

  /**
   * Copy up to out.length samples starting at absolute index max(from, oldest) into `out`.
   * Returns the number copied (0 when nothing at or after `from` is held). out[0] is sample max(from, oldest).
   */
  read(from: number, out: Float32Array): number {
    const start = Math.max(from, this.oldest);
    const end = Math.min(start + out.length - 1, this._latest);
    if (end < start) return 0;
    const n = end - start + 1;
    let src = start % this.capacity;
    for (let i = 0; i < n; i++) {
      out[i] = this.data[src] as number;
      src++;
      if (src === this.capacity) src = 0;
    }
    return n;
  }

  clear(): void {
    this._latest = -1;
    this.data.fill(0);
  }
}
```

`packages/engine-core/src/index.ts`:
```ts
export { version } from './version.ts';
export * from './clock/clock.ts';
export * from './rng/sfc32.ts';
export { RingBuffer } from './buffers/ring.ts';
```

- [x] **Step 4: Run to see it pass**

Run: `pnpm --filter @pme/engine-core exec vitest run && pnpm --filter @pme/engine-core typecheck`
Expected: PASS (ring: 5 tests; all earlier tests still pass).

- [x] **Step 5: Commit**

```bash
git add packages/engine-core
git commit -m "feat(engine-core): Float32 ring buffer with absolute sample index" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Public types, default modifiers, `hr` ramps

**Files:**
- Create: `packages/engine-core/src/types.ts`, `packages/engine-core/src/modifiers.ts`, `packages/engine-core/src/l1/ramp.ts`, `packages/engine-core/test/l1/ramp.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces (`types.ts`, copied from brief §7.1–7.3 and narrowed to Stage 1): `Tick`, `SimSeconds`, `ChannelId`, `NumericId`, `StateVar`, `Ramp`, `LeadId` + `LEAD_IDS` (the 12 lead channels, in order I, II, III, aVR, aVL, aVF, V1–V6), `RhythmId` (12 Stage 1 IDs), `RhythmOpts { ratio?: 2|3|4|'variable'; atrialRateBpm?; prMs?; groupSize?: 3|4|5|6; rateBpm? }`, `PvcSpec { probability: number; pattern: 'single'|'bigeminy' }`, `Modifiers { pvc: PvcSpec|null; rsa: number; hrvScale: number; qtc: number; artefact: { noise: number } }`, `PatientProfile { baseline?: { hr?: number }; rhythm?: { id: RhythmId; opts?: RhythmOpts } }`, `EngineOptions { seed?; mode?; patient?; device?: { skin?; ageBand?; mainsHz?: 50|60 }; lookaheadS? }`, `DeviceAction` (brief shape, ecg member), `EcgFilterMode = 'monitor'|'diagnostic'`, `Command` (setTarget | setRhythm | setModifiers | device), `DispatchResult`, `Measured`, `BeatOrigin`, `EngineEvent` (beat | atrial | measurement | tone | toneCancel), `EngineEventType`, `PatientSnapshot { schema: 'pme-snapshot/1'; engineVersion; seed; tick; state: unknown }`, `MonitorEngine` (Stage 1 members). `modifiers.ts`: `defaultModifiers(): Modifiers` = `{ pvc: null, rsa: 0.67, hrvScale: 1, qtc: 400, artefact: { noise: 1 } }`. `l1/ramp.ts`: `interface RampState { from; to; t0; delayS; durationS; curve }`, `constantRamp(v)`, `rampValue(r, t)`, `retarget(r, t, to, ramp?)`.

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l1/ramp.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { constantRamp, rampValue, retarget } from '../../src/l1/ramp.ts';

describe('l1/ramp', () => {
  it('a zero-duration ramp steps immediately', () => {
    const r = retarget(constantRamp(80), 10, 120);
    expect(rampValue(r, 9.99)).toBe(80);
    expect(rampValue(r, 10.001)).toBe(120);
  });

  it('linear ramp hits the midpoint halfway and the target at the end', () => {
    const r = retarget(constantRamp(60), 0, 120, { durationS: 30 });
    expect(rampValue(r, 15)).toBeCloseTo(90, 9);
    expect(rampValue(r, 30)).toBe(120);
    expect(rampValue(r, 100)).toBe(120);
  });

  it('exp and sigmoid are monotonic and end exactly on target', () => {
    for (const curve of ['exp', 'sigmoid'] as const) {
      const r = retarget(constantRamp(100), 0, 50, { durationS: 10, curve });
      let prev = Infinity;
      for (let t = 0; t <= 10; t += 0.1) {
        const v = rampValue(r, t);
        expect(v).toBeLessThanOrEqual(prev + 1e-12);
        prev = v;
      }
      expect(rampValue(r, 10)).toBeCloseTo(50, 9);
    }
  });

  it('honours delayS and retargets mid-ramp from the current value', () => {
    const r = retarget(constantRamp(60), 0, 120, { durationS: 10, delayS: 5 });
    expect(rampValue(r, 5)).toBe(60);
    expect(rampValue(r, 10)).toBeCloseTo(90, 9);
    const r2 = retarget(r, 10, 60, { durationS: 10 });
    expect(rampValue(r2, 10)).toBeCloseTo(90, 9);
    expect(rampValue(r2, 20)).toBe(60);
  });
});
```

- [x] **Step 2: Run to see it fail**

Run: `pnpm --filter @pme/engine-core exec vitest run test/l1`
Expected: FAIL — cannot load `../../src/l1/ramp.ts`.

- [x] **Step 3: Write the types**

`packages/engine-core/src/types.ts`:
```ts
// Public engine types. Names and shapes are copied from DESIGN-BRIEF §7.1–§7.3.
// Stage 1 implements a SUBSET: the unions below list only what Stage 1 handles. Later stages add
// the remaining Command variants, EngineEvent variants and MonitorEngine members listed in §7.

export type Tick = number; // integer; 1 tick = 20 ms of sim time
export type SimSeconds = number;
export type ChannelId =
  | 'ecgI' | 'ecgII' | 'ecgIII' | 'aVR' | 'aVL' | 'aVF' | 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6'
  | 'vcgX' | 'vcgY' | 'vcgZ' | 'abp' | 'cvp' | 'pap' | 'pleth' | 'co2' | 'resp';
export type NumericId =
  | 'hr' | 'pr' | 'spo2' | 'pi' | 'abpSys' | 'abpDia' | 'abpMean' | 'cvpMean' | 'papSys' | 'papDia' | 'papMean'
  | 'nibpSys' | 'nibpDia' | 'nibpMean' | 'etco2' | 'imco2' | 'awrr' | 'rr' | 'tempCore' | 'tempSite' | 'stII' | 'qtc';
export type StateVar =
  | 'hr' | 'sbp' | 'dbp' | 'cvp' | 'papSys' | 'papDia' | 'pawp' | 'spo2' | 'pi' | 'rr' | 'vt' | 'etco2' | 'fio2'
  | 'shunt' | 'tempCore' | 'contractility' | 'svr' | 'k' | 'qtc' | 'volumeStatus' | 'paceThresholdMa';
export type Ramp = { durationS: number; curve?: 'linear' | 'exp' | 'sigmoid'; delayS?: number };

/** The 12 ECG lead channels (a subset of ChannelId). */
export type LeadId = 'ecgI' | 'ecgII' | 'ecgIII' | 'aVR' | 'aVL' | 'aVF' | 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6';
export const LEAD_IDS: readonly LeadId[] = [
  'ecgI', 'ecgII', 'ecgIII', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6',
];

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

/** Stage 1 subset of the brief's PatientProfile (same shape as the scenario JSON `patient`, §7.4). */
export interface PatientProfile {
  baseline?: { hr?: number };
  rhythm?: { id: RhythmId; opts?: RhythmOpts };
}

export interface EngineOptions {
  seed?: number; // uint32
  mode?: 'manual' | 'modeled'; // default 'manual'; Stage 1 accepts only 'manual'
  patient?: PatientProfile;
  device?: { skin?: string; ageBand?: 'adult' | 'paediatric' | 'neonatal'; mainsHz?: 50 | 60 };
  lookaheadS?: number; // default 0.100; must be a whole number of 20 ms ticks
}

type CommandBase = { id: string; issuedBy: string; atTick?: Tick; stageGroup?: string };

/**
 * Brief §7.2 DeviceAction, ecg member only (Stage 1). Stage 1 implements:
 *   { device:'ecg', action:'filter', value: EcgFilterMode }
 *   { device:'ecg', action:'lead', value: LeadId, lane: 0 | 1 | 2 }
 * 'capture12' and 'arrhythmiaAnalysis' are rejected until Stage 4.
 */
export type DeviceAction = {
  device: 'ecg';
  action: 'filter' | 'lead' | 'capture12' | 'arrhythmiaAnalysis';
  value?: string | boolean;
  lane?: number;
};

export type EcgFilterMode = 'monitor' | 'diagnostic';

export type Command = CommandBase &
  (
    | { type: 'setTarget'; variable: StateVar; value: number; ramp?: Ramp }
    | { type: 'setRhythm'; rhythm: RhythmId; opts?: RhythmOpts; when?: 'now' | 'nextBeat'; respectRefractory?: boolean }
    | { type: 'setModifiers'; modifiers: Partial<Modifiers>; ramp?: Ramp }
    | { type: 'device'; action: DeviceAction }
  );

export type DispatchResult = { accepted: boolean; tick: Tick; reason?: string };

export type Measured = { value: number | null; flag: 'valid' | 'questionable' | 'invalid' | 'stale'; at: SimSeconds };

export type BeatOrigin = 'sinus' | 'atrial' | 'junctional' | 'ventricular' | 'paced' | 'fusion' | 'aberrant';

export type EngineEvent =
  | {
      type: 'beat'; t: SimSeconds; seq: number; origin: BeatOrigin;
      template: string; qrsMs: number; qtMs: number; prMs?: number;
      mech: { perfused: boolean; kSV: number; svMl: number; lvetMs: number };
    }
  | { type: 'atrial'; t: SimSeconds; kind: 'p' | 'flutter' | 'fib' | 'retrograde' | 'paced'; conducted: boolean }
  | { type: 'measurement'; t: SimSeconds; values: Partial<Record<NumericId, Measured>> }
  | {
      type: 'tone'; t: SimSeconds; id: string;
      kind: 'qrs' | 'pulse' | 'alarmBurst' | 'charge' | 'chargeReady' | 'shock' | 'nibpDone';
      freqHz?: number; priority?: 'high' | 'medium' | 'low';
    }
  | { type: 'toneCancel'; after: SimSeconds };

export type EngineEventType = EngineEvent['type'];

/** JSON-safe engine state (brief §7.1 `snapshot()`); Stage 1 carries engine state only. */
export interface PatientSnapshot {
  schema: 'pme-snapshot/1';
  engineVersion: string;
  seed: number;
  tick: Tick;
  state: unknown;
}

/** Stage 1 subset of brief §7.1 MonitorEngine. Stage 2+ adds load, commandLog, vocabulary, setL1Backend. */
export interface MonitorEngine {
  readonly version: string;
  start(): void;
  pause(): void;
  resume(): void;
  setTimeScale(k: number): void;
  step(ticks?: number): void;
  advanceTo(simT: SimSeconds): void;
  now(): { tick: Tick; simT: SimSeconds };
  dispatch(cmd: Command): DispatchResult;
  on(fn: (e: EngineEvent) => void, types?: EngineEventType[]): () => void;
  readSamples(ch: ChannelId, fromIndex: number, out: Float32Array): number;
  latestSampleIndex(ch: ChannelId): number;
  sampleRate(ch: ChannelId): 500 | 125 | 62.5;
  snapshot(): PatientSnapshot;
  restore(s: PatientSnapshot): void;
}
```

`packages/engine-core/src/modifiers.ts`:
```ts
import type { Modifiers } from './types.ts';

/** Default modifiers (brief §5 defaults; awake-adult HRV per §4.1). */
export function defaultModifiers(): Modifiers {
  return { pvc: null, rsa: 0.67, hrvScale: 1, qtc: 400, artefact: { noise: 1 } };
}
```

- [x] **Step 4: Implement the ramps**

`packages/engine-core/src/l1/ramp.ts`:
```ts
// Instructor target ramps (brief §7.1 `Ramp`; curves per BUILD-PLAN Stage 2 scope, used by 'hr' from Stage 1).
import type { Ramp } from '../types.ts';

/** Plain-data ramp state: value goes from `from` (at t0 + delay) to `to` over durationS. */
export interface RampState {
  from: number;
  to: number;
  t0: number;
  delayS: number;
  durationS: number;
  curve: 'linear' | 'exp' | 'sigmoid';
}

export function constantRamp(value: number): RampState {
  return { from: value, to: value, t0: 0, delayS: 0, durationS: 0, curve: 'linear' };
}

/** Shape functions on u ∈ [0,1], each 0 at u=0 and exactly 1 at u=1 [ENG]. */
function shape(curve: RampState['curve'], u: number): number {
  if (curve === 'exp') return (1 - Math.exp(-5 * u)) / (1 - Math.exp(-5));
  if (curve === 'sigmoid') {
    const s = (x: number) => 1 / (1 + Math.exp(-10 * (x - 0.5)));
    return (s(u) - s(0)) / (s(1) - s(0));
  }
  return u;
}

export function rampValue(r: RampState, t: number): number {
  const start = r.t0 + r.delayS;
  if (t <= start) return r.from;
  if (r.durationS <= 0 || t >= start + r.durationS) return r.to;
  return r.from + (r.to - r.from) * shape(r.curve, (t - start) / r.durationS);
}

/** Start a new ramp at time t from the CURRENT value (a mid-ramp retarget never jumps). */
export function retarget(r: RampState, t: number, to: number, ramp?: Ramp): RampState {
  return {
    from: rampValue(r, t),
    to,
    t0: t,
    delayS: ramp?.delayS ?? 0,
    durationS: ramp?.durationS ?? 0,
    curve: ramp?.curve ?? 'linear',
  };
}
```

- [x] **Step 5: Run to see it pass**

Run: `pnpm --filter @pme/engine-core exec vitest run test/l1 && pnpm --filter @pme/engine-core typecheck`
Expected: PASS, 4 tests; typecheck clean.

- [x] **Step 6: Commit**

```bash
git add packages/engine-core
git commit -m "feat(engine-core): public Stage 1 types, default modifiers and hr ramps" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Gaussian kernels and the Dower/Einthoven projection

**Files:**
- Create: `packages/engine-core/src/l2/ecg/vcg.ts`, `packages/engine-core/src/l2/ecg/kernels.ts`, `packages/engine-core/test/l2/ecg/vcg.test.ts`

**Interfaces:**
- Consumes: `LeadId`, `LEAD_IDS` (Task 2); `createRngState`, `normal` (Stage 0).
- Produces: `vcg.ts`: `type Vec3 = readonly [number, number, number]`, `DOWER` (rows for ecgI, ecgII, V1–V6), `projectLead(lead: LeadId, x, y, z): number`, `projectLeads(x, y, z, out: Float64Array /*12*/): Float64Array`. `kernels.ts`: `K_STRIDE = 7` (layout `[tau, sigmaRise, sigmaFall, ax, ay, az, wave]`, seconds and mV), `SUPPORT_SIGMAS = 4`, `WAVE = { P:0, Q:1, R:2, S:3, T:4, U:5, F:6, RETRO_P:7 }`, `type WaveCode`, `kernel(tau, sigmaRise, sigmaFall, a: Vec3-like, wave, scale?): number[]`, `interface EcgEvent { t; start; end; k: number[] }`, `makeEvent(t, k): EcgEvent`, `addEventAt(ev, s, acc: Float64Array): void`, `qrsSpanMs(k): number`.

- [x] **Step 1: Write the failing test (acceptance test 4, part 1: identities at every sample)**

`packages/engine-core/test/l2/ecg/vcg.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { createRngState, normal } from '../../../src/rng/sfc32.ts';
import { projectLead, projectLeads } from '../../../src/l2/ecg/vcg.ts';
import { LEAD_IDS } from '../../../src/types.ts';

describe('l2/ecg/vcg', () => {
  it('Einthoven/Goldberger identities hold to < 1e-6 mV for arbitrary VCG samples (acceptance test 4, part 1)', () => {
    const s = createRngState(4).noise;
    const out = new Float64Array(12);
    for (let i = 0; i < 100_000; i++) {
      const [I, II, III, aVR, aVL, aVF] = projectLeads(3 * normal(s), 3 * normal(s), 3 * normal(s), out) as unknown as number[];
      expect(Math.abs((III as number) - ((II as number) - (I as number)))).toBeLessThan(1e-6);
      expect(Math.abs((aVR as number) + (aVL as number) + (aVF as number))).toBeLessThan(1e-6);
    }
  });

  it('projectLead agrees with projectLeads for every lead', () => {
    const out = new Float64Array(12);
    projectLeads(0.3, -0.7, 0.2, out);
    LEAD_IDS.forEach((lead, i) => expect(projectLead(lead, 0.3, -0.7, 0.2)).toBeCloseTo(out[i] as number, 12));
  });

  it('uses the confirmed Dower row for lead II', () => {
    expect(projectLead('ecgII', 1, 0, 0)).toBe(0.235);
    expect(projectLead('ecgII', 0, 1, 0)).toBe(1.066);
    expect(projectLead('ecgII', 0, 0, 1)).toBe(-0.132);
  });
});
```

- [x] **Step 2: Run to see it fail**

Run: `pnpm --filter @pme/engine-core exec vitest run test/l2/ecg/vcg`
Expected: FAIL — cannot load `vcg.ts`.

- [x] **Step 3: Implement**

`packages/engine-core/src/l2/ecg/vcg.ts`:
```ts
// VCG → 12-lead projection (brief §4.1 "Lead projection"; research 03 §1.2).
// Leads I, II and V1–V6 use the Dower matrix rows (Dower 1980, as published in G. D. Clifford's idowerT.m,
// confirmed 2026-09-24 in research 03 §11 item 6). III, aVR, aVL and aVF come from the exact
// Einthoven/Goldberger identities, so they hold for any VCG.
import type { LeadId } from '../../types.ts';

export type Vec3 = readonly [number, number, number];

/** Dower rows: lead = X·r[0] + Y·r[1] + Z·r[2] (mV). */
export const DOWER: Readonly<Record<'ecgI' | 'ecgII' | 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6', Vec3>> = {
  ecgI: [0.632, -0.235, 0.059],
  ecgII: [0.235, 1.066, -0.132],
  V1: [-0.515, 0.157, -0.917],
  V2: [0.044, 0.164, -1.387],
  V3: [0.882, 0.098, -1.277],
  V4: [1.213, 0.127, -0.601],
  V5: [1.125, 0.127, -0.086],
  V6: [0.831, 0.076, 0.23],
};

function dot(r: Vec3, x: number, y: number, z: number): number {
  return r[0] * x + r[1] * y + r[2] * z;
}

/** One lead from one VCG sample. */
export function projectLead(lead: LeadId, x: number, y: number, z: number): number {
  switch (lead) {
    case 'ecgIII':
      return dot(DOWER.ecgII, x, y, z) - dot(DOWER.ecgI, x, y, z); // III = II − I
    case 'aVR':
      return -(dot(DOWER.ecgI, x, y, z) + dot(DOWER.ecgII, x, y, z)) / 2; // aVR = −(I+II)/2
    case 'aVL':
      return dot(DOWER.ecgI, x, y, z) - dot(DOWER.ecgII, x, y, z) / 2; // aVL = I − II/2
    case 'aVF':
      return dot(DOWER.ecgII, x, y, z) - dot(DOWER.ecgI, x, y, z) / 2; // aVF = II − I/2
    default:
      return dot(DOWER[lead], x, y, z);
  }
}

/** All 12 leads from one VCG sample, in LEAD_IDS order. */
export function projectLeads(x: number, y: number, z: number, out: Float64Array): Float64Array {
  const I = dot(DOWER.ecgI, x, y, z);
  const II = dot(DOWER.ecgII, x, y, z);
  out[0] = I;
  out[1] = II;
  out[2] = II - I;
  out[3] = -(I + II) / 2;
  out[4] = I - II / 2;
  out[5] = II - I / 2;
  out[6] = dot(DOWER.V1, x, y, z);
  out[7] = dot(DOWER.V2, x, y, z);
  out[8] = dot(DOWER.V3, x, y, z);
  out[9] = dot(DOWER.V4, x, y, z);
  out[10] = dot(DOWER.V5, x, y, z);
  out[11] = dot(DOWER.V6, x, y, z);
  return out;
}
```

`packages/engine-core/src/l2/ecg/kernels.ts`:
```ts
// Gaussian wave kernels on a 3-axis VCG (brief §4.1 "Generator"; research 03 §1.3):
//   ECG_axis(t) = Σ_events Σ_waves a_w,axis · exp(−(t − t_event − τ_w)² / (2σ_w²))
// The T wave is two half-Gaussians (rising σ, falling σ) [03 §1.3, ENG].
// Clean-room: written from the equations in the papers/brief, no ECGSYN code consulted.

/** Flat kernel layout, 7 numbers per kernel: [tau, sigmaRise, sigmaFall, ax, ay, az, wave]. Seconds and mV. */
export const K_STRIDE = 7;
/** Kernels contribute nothing beyond ±4σ (exp(−8) ≈ 3.4e-4). */
export const SUPPORT_SIGMAS = 4;

/** Wave codes stored in the 7th slot (used by tests and by QRS-span measurement). */
export const WAVE = { P: 0, Q: 1, R: 2, S: 3, T: 4, U: 5, F: 6, RETRO_P: 7 } as const;
export type WaveCode = (typeof WAVE)[keyof typeof WAVE];

export function kernel(
  tau: number,
  sigmaRise: number,
  sigmaFall: number,
  a: readonly [number, number, number],
  wave: WaveCode,
  scale = 1,
): number[] {
  return [tau, sigmaRise, sigmaFall, a[0] * scale, a[1] * scale, a[2] * scale, wave];
}

/** One scheduled ECG event: absolute time t (s) plus its kernels, with a precomputed support window. */
export interface EcgEvent {
  t: number;
  start: number; // first time any kernel is non-negligible
  end: number; // last time any kernel is non-negligible
  k: number[];
}

export function makeEvent(t: number, k: number[]): EcgEvent {
  let start = Infinity;
  let end = -Infinity;
  for (let i = 0; i < k.length; i += K_STRIDE) {
    const tau = k[i] as number;
    start = Math.min(start, t + tau - SUPPORT_SIGMAS * (k[i + 1] as number));
    end = Math.max(end, t + tau + SUPPORT_SIGMAS * (k[i + 2] as number));
  }
  return { t, start, end, k };
}

/** Add this event's VCG contribution at absolute time s into acc[0..2]. */
export function addEventAt(ev: EcgEvent, s: number, acc: Float64Array): void {
  const k = ev.k;
  for (let i = 0; i < k.length; i += K_STRIDE) {
    const d = s - ev.t - (k[i] as number);
    const sigma = d < 0 ? (k[i + 1] as number) : (k[i + 2] as number);
    if (d > SUPPORT_SIGMAS * sigma || d < -SUPPORT_SIGMAS * sigma) continue;
    const g = Math.exp((-d * d) / (2 * sigma * sigma));
    acc[0] = (acc[0] as number) + (k[i + 3] as number) * g;
    acc[1] = (acc[1] as number) + (k[i + 4] as number) * g;
    acc[2] = (acc[2] as number) + (k[i + 5] as number) * g;
  }
}

/** QRS span of a kernel list: from the earliest Q/R/S τ − 2.5σ to the latest τ + 2.5σ, in ms [ENG]. */
export function qrsSpanMs(k: readonly number[]): number {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < k.length; i += K_STRIDE) {
    const w = k[i + 6];
    if (w !== WAVE.Q && w !== WAVE.R && w !== WAVE.S) continue;
    lo = Math.min(lo, (k[i] as number) - 2.5 * (k[i + 1] as number));
    hi = Math.max(hi, (k[i] as number) + 2.5 * (k[i + 2] as number));
  }
  return Math.round((hi - lo) * 1000);
}
```

- [x] **Step 4: Run to see it pass**

Run: `pnpm --filter @pme/engine-core exec vitest run test/l2/ecg/vcg`
Expected: PASS, 3 tests.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core
git commit -m "feat(ecg): Gaussian VCG kernels and Dower projection with Einthoven identities" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Rate rules (Fridericia QT, PR) and beat templates from the seed table

**Files:**
- Create: `packages/engine-core/src/l2/ecg/intervals.ts`, `packages/engine-core/src/l2/ecg/templates.ts`, `packages/engine-core/test/l2/ecg/intervals.test.ts`, `packages/engine-core/test/l2/ecg/templates.test.ts`

**Interfaces:**
- Consumes: `kernel`, `K_STRIDE`, `WAVE`, `qrsSpanMs` (Task 3); `projectLead`, `Vec3` (Task 3).
- Produces: `intervals.ts`: `qtFridericiaMs(rrS, qtcMs = 400)`, `DEFAULT_PR60_MS = 190`, `prMs(hrBpm, pr60Ms = 190)`, `lvetMs(hrBpm)` (Weissler men). `templates.ts`: `VEC` (P,Q,R,S,T,U vectors), `WIDE_VEC`, `RETRO_P_VEC`, `FLUTTER_VEC`, `FWAVE_DIR`, `WANDER_DIR`, `T_END_AFTER_PEAK_S = 0.11`, `WIDE_QT_EXTRA_MS = 60`, `type TemplateId = 'narrow'|'wide'|'narrowRetroP'`, `pWaveKernels(scale?)`, `flutterKernels()`, `narrowKernels(qtMs, rScale?)`, `wideKernels(qtMs, scale?)`, `templateKernels(id, qtMs, scale?)`, `fiducialS(id)` (0.04 narrow, 0.05 wide; `beat.t` = QRS onset + this), `templateQrsMs(id)`, `kernelQtMs(k)`.

- [x] **Step 1: Write the failing tests**

`packages/engine-core/test/l2/ecg/intervals.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { lvetMs, prMs, qtFridericiaMs } from '../../../src/l2/ecg/intervals.ts';

describe('l2/ecg/intervals', () => {
  it('Fridericia QT matches the brief §4.1 table at 40–200 bpm (±1 ms)', () => {
    const table: Array<[number, number]> = [[40, 458], [60, 400], [80, 363], [100, 337], [120, 317], [150, 295], [180, 277], [200, 268]];
    for (const [hr, qt] of table) expect(Math.abs(qtFridericiaMs(60 / hr) - qt)).toBeLessThanOrEqual(1);
  });

  it('PR rule: PR60 at ≤60 bpm, −0.4 ms/bpm above, floor 110 ms', () => {
    expect(prMs(50)).toBe(190);
    expect(prMs(60)).toBe(190);
    expect(prMs(150)).toBeCloseTo(154, 9);
    expect(prMs(300)).toBe(110);
    expect(prMs(100, 160)).toBeCloseTo(144, 9);
  });

  it('Weissler LVET (men)', () => {
    expect(lvetMs(60)).toBeCloseTo(311, 9);
  });
});
```

`packages/engine-core/test/l2/ecg/templates.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { projectLead } from '../../../src/l2/ecg/vcg.ts';
import { VEC, WIDE_VEC, templateQrsMs, narrowKernels, kernelQtMs } from '../../../src/l2/ecg/templates.ts';
import type { LeadId } from '../../../src/types.ts';

const p = (lead: LeadId, v: readonly [number, number, number]) => projectLead(lead, v[0], v[1], v[2]);

describe('l2/ecg/templates', () => {
  it('lead II reproduces the brief §4.1 seed amplitudes (±0.005 mV)', () => {
    expect(p('ecgII', VEC.P)).toBeCloseTo(0.15, 2);
    expect(p('ecgII', VEC.Q)).toBeCloseTo(-0.08, 2);
    expect(p('ecgII', VEC.R)).toBeCloseTo(1.1, 2);
    expect(p('ecgII', VEC.S)).toBeCloseTo(-0.25, 2);
    expect(p('ecgII', VEC.T)).toBeCloseTo(0.3, 2);
    expect(p('ecgII', VEC.U)).toBeCloseTo(0.03, 2);
  });

  it('QRS peak-to-peak in I and III is 70% and 30% of II (ProSim ratios ±25%)', () => {
    const pp = (lead: LeadId) => {
      const v = [p(lead, VEC.Q), p(lead, VEC.R), p(lead, VEC.S), 0];
      return Math.max(...v) - Math.min(...v);
    };
    const ii = pp('ecgII');
    expect(pp('ecgI') / ii).toBeGreaterThan(0.7 * 0.75);
    expect(pp('ecgI') / ii).toBeLessThan(0.7 * 1.25);
    expect(pp('ecgIII') / ii).toBeGreaterThan(0.3 * 0.75);
    expect(pp('ecgIII') / ii).toBeLessThan(0.3 * 1.25);
  });

  it('precordial morphology: V1 is rS (small r, dominant negative), V5 is dominant positive', () => {
    expect(p('V1', VEC.Q)).toBeGreaterThan(0); // septal r
    expect(p('V1', VEC.R)).toBeLessThan(-Math.abs(p('V1', VEC.Q)));
    expect(p('V5', VEC.R)).toBeGreaterThan(Math.abs(p('V5', VEC.S)));
  });

  it('narrow QRS 70–100 ms, wide QRS 120–200 ms with a discordant T and 1.2–2× amplitude in II', () => {
    expect(templateQrsMs('narrow')).toBeGreaterThanOrEqual(70);
    expect(templateQrsMs('narrow')).toBeLessThanOrEqual(100);
    expect(templateQrsMs('wide')).toBeGreaterThanOrEqual(120);
    expect(templateQrsMs('wide')).toBeLessThanOrEqual(200);
    expect(Math.sign(p('ecgII', WIDE_VEC.T))).toBe(-Math.sign(p('ecgII', WIDE_VEC.R)));
    const ratio = p('ecgII', WIDE_VEC.R) / p('ecgII', VEC.R);
    expect(ratio).toBeGreaterThanOrEqual(1.2);
    expect(ratio).toBeLessThanOrEqual(2);
  });

  it('kernel QT equals the requested QT', () => {
    expect(kernelQtMs(narrowKernels(317))).toBeCloseTo(317, 9);
  });
});
```

- [x] **Step 2: Run to see them fail**

Run: `pnpm --filter @pme/engine-core exec vitest run test/l2/ecg/intervals test/l2/ecg/templates`
Expected: FAIL — cannot load `intervals.ts` / `templates.ts`.

- [x] **Step 3: Implement**

`packages/engine-core/src/l2/ecg/intervals.ts`:
```ts
// Rate rules (brief §4.1 "Rate rules"; research 03 §1.1).

/** Fridericia: QT = QTc · RR^(1/3). QTc default 400 ms gives 458/400/363/317/295/268 ms at 40/60/80/120/150/200 bpm. */
export function qtFridericiaMs(rrS: number, qtcMs = 400): number {
  return qtcMs * Math.cbrt(rrS);
}

/**
 * PR = clamp(PR60 − 0.4·(HR − 60), 110, PR60) ms [03 §1.1, ENG].
 * PR60 default 190 ms [ENG]: with it, at 150 bpm the P peak (RR − PR + 45 ms after QRS onset = 291 ms)
 * falls inside the preceding T wave (T end = QT = 295 ms), so "P on T" emerges from timing alone (brief §4.1).
 */
export const DEFAULT_PR60_MS = 190;
export function prMs(hrBpm: number, pr60Ms = DEFAULT_PR60_MS): number {
  return Math.min(pr60Ms, Math.max(110, pr60Ms - 0.4 * (hrBpm - 60)));
}

/** Weissler LVET for men: 413 − 1.7·HR ms (research 03 §2.1, confirmed §11 item 8). */
export function lvetMs(hrBpm: number): number {
  return 413 - 1.7 * hrBpm;
}
```

`packages/engine-core/src/l2/ecg/templates.ts`:
```ts
// Beat templates built from the brief §4.1 seed table (lead II at 60 bpm, τ from QRS onset):
//   P  τ −PR+45 σ 22 a 0.15 | Q τ 12 σ 8 a −0.08 | R τ 40 σ 10 a 1.1 | S τ 62 σ 9 a −0.25
//   T  τ QT−110 σ 45 rise / 30 fall a 0.30 | U τ QT+70 σ 35 a 0.03
// Each wave's VCG vector (X, Y, Z in mV) was fitted in Stage 1 so that, through the Dower rows (vcg.ts),
// lead II reproduces the seed amplitudes exactly and lead I is 70% / lead III 30% of II (ProSim ratios,
// research 01 §4.16). Z was chosen by least squares against a normal precordial R progression
// (V1 rS, transition V3–V4). The PTB-XL refit is Stage 5.
import { K_STRIDE, WAVE, kernel, qrsSpanMs } from './kernels.ts';
import type { Vec3 } from './vcg.ts';

export const VEC: Readonly<Record<'P' | 'Q' | 'R' | 'S' | 'T' | 'U', Vec3>> = {
  P: [0.165, 0.105, 0.007],
  Q: [-0.097, -0.058, -0.033],
  R: [1.521, 0.708, 0.091],
  S: [-0.319, -0.089, 0.609],
  T: [0.394, 0.181, -0.111],
  U: [0.04, 0.017, -0.016],
};

/** Wide ventricular complex (PVC, VT, ventricular escape) [ENG]: LBBB-like, upright in II, discordant T. */
export const WIDE_VEC: Readonly<Record<'R' | 'S' | 'T', Vec3>> = {
  R: [0.9, 1.3, 0.8],
  S: [-0.3, -0.4, -0.2],
  T: [-0.4, -0.45, -0.3],
};

/** Retrograde P (AVNRT), negative in II, buried at the end of the QRS [ENG, research 03 §1.5]. */
export const RETRO_P_VEC: Vec3 = [-0.05, -0.12, 0.02];

/** Flutter F-wave: sharp negative limb then slow recovery; negative sawtooth in II/III/aVF [ENG, 03 §1.5]. */
export const FLUTTER_VEC: Readonly<Record<'down' | 'up', Vec3>> = {
  down: [-0.03, -0.18, 0.02],
  up: [0.01, 0.07, -0.01],
};

/** AF f-wave VCG direction (lead II gain ≈ 1) [ENG]. */
export const FWAVE_DIR: Vec3 = [0.2, 0.9, -0.35];
/** Respiratory baseline-wander direction (lead II gain ≈ 1) [ENG]. */
export const WANDER_DIR: Vec3 = [0.3, 0.9, 0.2];

/** T end is 110 ms after the T peak (seed table: T peak = QT − 110), so QT = τ_T + 110 ms. */
export const T_END_AFTER_PEAK_S = 0.11;
/** Wide complexes: QT is longer by 60 ms [ENG]. */
export const WIDE_QT_EXTRA_MS = 60;

export type TemplateId = 'narrow' | 'wide' | 'narrowRetroP';

/** P wave kernels relative to P onset (the atrial event time): peak 45 ms after onset. */
export function pWaveKernels(scale = 1): number[] {
  return kernel(0.045, 0.022, 0.022, VEC.P, WAVE.P, scale);
}

/** Flutter wave kernels relative to the flutter event time [ENG]. */
export function flutterKernels(): number[] {
  return [
    ...kernel(0.04, 0.018, 0.018, FLUTTER_VEC.down, WAVE.F),
    ...kernel(0.12, 0.045, 0.045, FLUTTER_VEC.up, WAVE.F),
  ];
}

/** Narrow (supraventricular) QRS-T relative to QRS onset. rScale modulates QRS amplitude (respiration). */
export function narrowKernels(qtMs: number, rScale = 1): number[] {
  const tPeak = qtMs / 1000 - T_END_AFTER_PEAK_S;
  return [
    ...kernel(0.012, 0.008, 0.008, VEC.Q, WAVE.Q, rScale),
    ...kernel(0.04, 0.01, 0.01, VEC.R, WAVE.R, rScale),
    ...kernel(0.062, 0.009, 0.009, VEC.S, WAVE.S, rScale),
    ...kernel(tPeak, 0.045, 0.03, VEC.T, WAVE.T),
    ...kernel(qtMs / 1000 + 0.07, 0.035, 0.035, VEC.U, WAVE.U),
  ];
}

/** Wide ventricular QRS-T relative to QRS onset. qtMs is the supraventricular QT; WIDE_QT_EXTRA_MS is added. */
export function wideKernels(qtMs: number, scale = 1): number[] {
  const qt = (qtMs + WIDE_QT_EXTRA_MS) / 1000;
  return [
    ...kernel(0.05, 0.022, 0.022, WIDE_VEC.R, WAVE.R, scale),
    ...kernel(0.11, 0.02, 0.02, WIDE_VEC.S, WAVE.S, scale),
    ...kernel(qt - T_END_AFTER_PEAK_S, 0.06, 0.04, WIDE_VEC.T, WAVE.T, scale),
  ];
}

export function templateKernels(id: TemplateId, qtMs: number, scale = 1): number[] {
  if (id === 'wide') return wideKernels(qtMs, scale);
  const k = narrowKernels(qtMs, scale);
  if (id === 'narrowRetroP') k.push(...kernel(0.07, 0.02, 0.02, RETRO_P_VEC, WAVE.RETRO_P));
  return k;
}

/** Fiducial (R-peak) offset from QRS onset, seconds. `beat.t` = QRS onset + this. */
export function fiducialS(id: TemplateId): number {
  return id === 'wide' ? 0.05 : 0.04;
}

/** QRS duration of a template, ms (rate-independent, brief §4.1 "QRS width changes by ≤5%"). */
export function templateQrsMs(id: TemplateId): number {
  return qrsSpanMs(templateKernels(id, 400));
}

/** QT of a beat as drawn: T peak τ + 110 ms (for wide templates this includes WIDE_QT_EXTRA_MS). */
export function kernelQtMs(k: readonly number[]): number {
  for (let i = 0; i < k.length; i += K_STRIDE) {
    if (k[i + 6] === WAVE.T) return ((k[i] as number) + T_END_AFTER_PEAK_S) * 1000;
  }
  return Number.NaN;
}
```

- [x] **Step 4: Run to see them pass**

Run: `pnpm --filter @pme/engine-core exec vitest run test/l2/ecg/intervals test/l2/ecg/templates`
Expected: PASS, 3 + 5 tests.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core
git commit -m "feat(ecg): Fridericia QT, PR rule and seed-table beat templates with fitted VCG vectors" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: HRV/RSA, rhythm table and the rhythm engine (sinus family first)

**Files:**
- Create: `packages/engine-core/src/l2/ecg/hrv.ts`, `packages/engine-core/src/l2/ecg/rhythms.ts`, `packages/engine-core/src/l2/ecg/rhythm-engine.ts`, `packages/engine-core/test/helpers/rhythm.ts`, `packages/engine-core/test/l2/ecg/rhythm-sinus.test.ts`

**Interfaces:**
- Consumes: Tasks 2–4; `normal`, `uniform`, `Sfc32State`, `StreamName`, `createRngState` (Stage 0).
- Produces:
  - `hrv.ts`: `F_RESP_HZ = 0.25` (fixed-rate breath clock until Stage 3), `interface HrvPhase { phi; psi }`, `drawHrvPhase(s)`, `respSin(t, ph)`, `sinusRR(meanRR, t, ph, mods, s)`.
  - `rhythms.ts`: `type AtrialMode`, `AvMode = 'conducted'|'wenckebach'|'fixedRatio'|'dissociated'|'integrateFire'`, `FocusMode`, `EscapeMode`, `interface RhythmDef`, `RHYTHMS: Record<RhythmId, RhythmDef>`, `RHYTHM_IDS`, `DEFAULT_DISSOCIATED_ATRIAL_BPM = 80`, `DEFAULT_FLUTTER_ATRIAL_BPM = 300`.
  - `rhythm-engine.ts`: `NEVER = 1e12`, `interface PendingV`, `interface FWave { start; end; f; ph; a }`, `interface RhythmState` (plain data: `id, opts, respectRefractory, planT, atria, junction, pending, focusNextT, escapeNextT, refractoryUntil, lastVT, lastSupraT, lastWasPvc, fwave, events: EcgEvent[], records: EngineEvent[], beatSeq, pendingSwitch`), `interface RhythmCtx { hrAt(t): number; mods: Modifiers; rng: Record<StreamName, Sfc32State>; hrv: HrvPhase }`, `createRhythmState(id, opts, t0, ctx)`, `applyRhythm(st, id, opts, at, respectRefractory, ctx)`, `planUntil(st, T, ctx)`, `rhythmRate(st, t, ctx)`, `afThresholdMv(hr)`, `afRefractoryS(hr)`.
  - Test helper `runRhythm(id, seconds, { hr?, seed?, mods?, rhythmOpts? }): { st, beats, atrial }`, `mean`, `sd`, `diffs`, types `Beat`, `Atrial`.
  - The engine file below implements ALL Stage 1 rhythms and the PVC modifier at once (they share one state machine); Tasks 6–8 add their acceptance tests.

- [x] **Step 1: Write the test helper and the failing tests (acceptance tests 1, 2, 3)**

`packages/engine-core/test/helpers/rhythm.ts`:
```ts
// Test helper: run the rhythm engine alone (no samples) and collect its records.
import { defaultModifiers } from '../../src/modifiers.ts';
import { createRngState } from '../../src/rng/sfc32.ts';
import { drawHrvPhase } from '../../src/l2/ecg/hrv.ts';
import { createRhythmState, planUntil, type RhythmCtx, type RhythmState } from '../../src/l2/ecg/rhythm-engine.ts';
import { RHYTHMS } from '../../src/l2/ecg/rhythms.ts';
import type { EngineEvent, Modifiers, RhythmId, RhythmOpts } from '../../src/types.ts';

export type Beat = Extract<EngineEvent, { type: 'beat' }>;
export type Atrial = Extract<EngineEvent, { type: 'atrial' }>;

export interface RunResult {
  st: RhythmState;
  beats: Beat[];
  atrial: Atrial[];
}

export function runRhythm(
  id: RhythmId,
  seconds: number,
  opts: { hr?: number; seed?: number; mods?: Partial<Modifiers>; rhythmOpts?: RhythmOpts } = {},
): RunResult {
  const rng = createRngState(opts.seed ?? 1);
  const mods = { ...defaultModifiers(), ...opts.mods };
  const hr = opts.hr;
  const ctx: RhythmCtx = { hrAt: () => hr ?? RHYTHMS[id].defaultRateBpm, mods, rng, hrv: drawHrvPhase(rng.hrv) };
  const st = createRhythmState(id, opts.rhythmOpts ?? {}, 0, ctx);
  planUntil(st, seconds, ctx);
  const beats = st.records.filter((r): r is Beat => r.type === 'beat');
  const atrial = st.records.filter((r): r is Atrial => r.type === 'atrial');
  return { st, beats, atrial };
}

export function mean(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function sd(xs: readonly number[]): number {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

export function diffs(xs: readonly number[]): number[] {
  return xs.slice(1).map((x, i) => x - (xs[i] as number));
}
```

`packages/engine-core/test/l2/ecg/rhythm-sinus.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { K_STRIDE, WAVE, type EcgEvent } from '../../../src/l2/ecg/kernels.ts';
import { diffs, mean, runRhythm, sd } from '../../helpers/rhythm.ts';

const hasWave = (e: EcgEvent, w: number) => e.k.some((v, i) => i % K_STRIDE === 6 && v === w);
function waveOf(e: EcgEvent, w: number): { tau: number; sigRise: number } {
  for (let i = 0; i < e.k.length; i += K_STRIDE) if (e.k[i + 6] === w) return { tau: e.k[i]!, sigRise: e.k[i + 1]! };
  throw new Error('wave not found');
}

describe('rhythm engine: sinus family', () => {
  it('acceptance 1: sinus 60 with HRV off has mean RR 1.000 ± 0.002 s over 60 beats', () => {
    const { beats } = runRhythm('sinus', 70, { hr: 60, mods: { hrvScale: 0 } });
    const rr = diffs(beats.map((b) => b.t)).slice(0, 60);
    expect(rr).toHaveLength(60);
    expect(Math.abs(mean(rr) - 1)).toBeLessThanOrEqual(0.002);
  });

  it('acceptance 2: QT at 60/120/150 bpm is 400/317/295 ms ±5 ms, measured from kernel timing', () => {
    for (const [hr, qt] of [[60, 400], [120, 317], [150, 295]] as const) {
      const { st } = runRhythm('sinus', 10, { hr, mods: { hrvScale: 0 } });
      const qrs = st.events.filter((e) => hasWave(e, WAVE.R));
      const steady = qrs[qrs.length - 2]!;
      const qtMeasured = (waveOf(steady, WAVE.T).tau + 0.11) * 1000; // T end = T peak + 110 ms (seed table)
      expect(Math.abs(qtMeasured - qt)).toBeLessThanOrEqual(5);
    }
  });

  it('acceptance 3: at 150 bpm the P-wave peak falls inside the preceding T wave span', () => {
    const { st } = runRhythm('sinus', 10, { hr: 150, mods: { hrvScale: 0 } });
    const pPeaks = st.events.filter((e) => hasWave(e, WAVE.P)).map((e) => e.t + waveOf(e, WAVE.P).tau);
    const qrs = st.events.filter((e) => hasWave(e, WAVE.R));
    let checked = 0;
    for (const ev of qrs.slice(2, -2)) {
      const T = waveOf(ev, WAVE.T);
      const tStart = ev.t + T.tau - 2.5 * T.sigRise; // T onset
      const tEnd = ev.t + T.tau + 0.11; // T end (= QT)
      const p = pPeaks.find((x) => x > ev.t + 0.1 && x < ev.t + 0.4);
      expect(p).toBeDefined();
      expect(p!).toBeGreaterThan(tStart);
      expect(p!).toBeLessThan(tEnd);
      checked++;
    }
    expect(checked).toBeGreaterThan(10);
  });

  it('sinusBrady and sinusTachy default to 45 and 120 bpm; default HRV gives RR SD 10–60 ms', () => {
    const brady = runRhythm('sinusBrady', 120, { mods: { hrvScale: 0 } });
    expect(60 / mean(diffs(brady.beats.map((b) => b.t)))).toBeCloseTo(45, 6);
    const tachy = runRhythm('sinusTachy', 60, { mods: { hrvScale: 0 } });
    expect(60 / mean(diffs(tachy.beats.map((b) => b.t)))).toBeCloseTo(120, 6);
    const withHrv = runRhythm('sinus', 300, { hr: 60 });
    const s = sd(diffs(withHrv.beats.map((b) => b.t)));
    expect(s).toBeGreaterThan(0.01);
    expect(s).toBeLessThan(0.06);
  });

  it('asystole has no beats and no P waves', () => {
    const { beats, atrial } = runRhythm('asystole', 30);
    expect(beats).toHaveLength(0);
    expect(atrial).toHaveLength(0);
  });

  it('sinus beats carry PR, QRS, QT and k_rhythm 1.0 (brief §4.8)', () => {
    const { beats } = runRhythm('sinus', 10, { hr: 75, mods: { hrvScale: 0 } });
    const b = beats[3]!;
    expect(b.origin).toBe('sinus');
    expect(b.prMs).toBe(184);
    expect(b.qrsMs).toBeGreaterThanOrEqual(70);
    expect(b.qrsMs).toBeLessThanOrEqual(100);
    expect(b.qtMs).toBe(371); // 400 · 0.8^(1/3)
    expect(b.mech).toEqual({ perfused: true, kSV: 1, svMl: 70, lvetMs: 286 });
  });
});
```

- [x] **Step 2: Run to see them fail**

Run: `pnpm --filter @pme/engine-core exec vitest run test/l2/ecg/rhythm-sinus`
Expected: FAIL — cannot load `hrv.ts` / `rhythm-engine.ts`.

- [x] **Step 3: Implement HRV and the rhythm table**

`packages/engine-core/src/l2/ecg/hrv.ts`:
```ts
// HRV / RSA (brief §4.1 "HRV"; research 03 §1.4):
//   RR_n = RR_mean + A_RSA·sin(2π·f_resp·t_n + φ) + A_LF·sin(2π·0.1·t_n + ψ) + ε_n
// Awake adult: A_RSA 30–60 ms, A_LF 20–40 ms, ε SD 10–20 ms. Amplitudes here are scaled by RR_mean (s)
// so that tachycardia does not get 60 ms swings [ENG]. Breathing is a FIXED-RATE clock until Stage 3.
import { normal, uniform, type Sfc32State } from '../../rng/sfc32.ts';
import type { Modifiers } from '../../types.ts';

export const F_RESP_HZ = 0.25; // 15 breaths/min [ENG, Stage 1 stand-in for the respiratory driver]
export const A_RSA_MAX_S = 0.06; // rsa = 1 → 60 ms at RR 1 s
export const A_LF_S = 0.03;
export const EPS_SD_S = 0.012;
export const MIN_RR_S = 0.2;

export interface HrvPhase {
  phi: number;
  psi: number;
}

/** Random starting phases for the RSA and LF oscillators, drawn once per engine from the 'hrv' stream. */
export function drawHrvPhase(s: Sfc32State): HrvPhase {
  return { phi: 2 * Math.PI * uniform(s), psi: 2 * Math.PI * uniform(s) };
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
  return Math.max(MIN_RR_S, meanRR + rsa + lf + eps);
}
```

`packages/engine-core/src/l2/ecg/rhythms.ts`:
```ts
// Stage 1 rhythm table (brief §5; research 03 §1.5). Each rhythm is a configuration of the two clocks
// (atria, ventricle) and the AV node. `hr` (the L1 target) drives the rate named in `rateDrives`.
import type { RhythmId } from '../../types.ts';
import type { TemplateId } from './templates.ts';

export type AtrialMode = 'sinus' | 'flutter' | 'fib' | 'none';
export type AvMode = 'conducted' | 'wenckebach' | 'fixedRatio' | 'dissociated' | 'integrateFire';
export type FocusMode = 'none' | 'vt' | 'svt';
export type EscapeMode = 'junctional' | 'ventricular' | 'none';

export interface RhythmDef {
  atria: AtrialMode;
  av: AvMode;
  focus: FocusMode;
  escape: EscapeMode;
  /** What the 'hr' target sets: the SA rate, the ventricular response, the focus rate or the escape rate. */
  rateDrives: 'sinus' | 'afResponse' | 'focus' | 'escape' | 'none';
  /** Clamp applied to hr for this rhythm (bpm). */
  rateRange: readonly [number, number];
  /** hr target set when the rhythm starts (RhythmOpts.rateBpm overrides). */
  defaultRateBpm: number;
  /** Template of the escape beats (when escape ≠ none). */
  escapeTemplate: TemplateId;
  /** Backup escape rate for rhythms whose escape is not the primary pacemaker (bpm). */
  backupEscapeBpm: number;
}

const BACKUP_JUNCTIONAL_BPM = 40; // [ENG] junctional escape 40–60 (brief §5); low end so Wenckebach pauses stay visible

export const RHYTHMS: Readonly<Record<RhythmId, RhythmDef>> = {
  sinus: { atria: 'sinus', av: 'conducted', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [20, 250], defaultRateBpm: 75, escapeTemplate: 'narrow', backupEscapeBpm: BACKUP_JUNCTIONAL_BPM },
  sinusBrady: { atria: 'sinus', av: 'conducted', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [20, 59], defaultRateBpm: 45, escapeTemplate: 'narrow', backupEscapeBpm: 30 },
  sinusTachy: { atria: 'sinus', av: 'conducted', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [101, 220], defaultRateBpm: 120, escapeTemplate: 'narrow', backupEscapeBpm: BACKUP_JUNCTIONAL_BPM },
  afib: { atria: 'fib', av: 'integrateFire', focus: 'none', escape: 'none', rateDrives: 'afResponse', rateRange: [40, 180], defaultRateBpm: 100, escapeTemplate: 'narrow', backupEscapeBpm: 0 },
  aflutter: { atria: 'flutter', av: 'fixedRatio', focus: 'none', escape: 'junctional', rateDrives: 'none', rateRange: [0, 400], defaultRateBpm: 150, escapeTemplate: 'narrow', backupEscapeBpm: BACKUP_JUNCTIONAL_BPM },
  svtAvnrt: { atria: 'none', av: 'dissociated', focus: 'svt', escape: 'none', rateDrives: 'focus', rateRange: [140, 280], defaultRateBpm: 180, escapeTemplate: 'narrow', backupEscapeBpm: 0 },
  avb1: { atria: 'sinus', av: 'conducted', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [30, 150], defaultRateBpm: 70, escapeTemplate: 'narrow', backupEscapeBpm: BACKUP_JUNCTIONAL_BPM },
  avb2Mobitz1: { atria: 'sinus', av: 'wenckebach', focus: 'none', escape: 'junctional', rateDrives: 'sinus', rateRange: [40, 130], defaultRateBpm: 75, escapeTemplate: 'narrow', backupEscapeBpm: BACKUP_JUNCTIONAL_BPM },
  avb3Narrow: { atria: 'sinus', av: 'dissociated', focus: 'none', escape: 'junctional', rateDrives: 'escape', rateRange: [40, 60], defaultRateBpm: 45, escapeTemplate: 'narrow', backupEscapeBpm: 0 },
  avb3Wide: { atria: 'sinus', av: 'dissociated', focus: 'none', escape: 'ventricular', rateDrives: 'escape', rateRange: [20, 40], defaultRateBpm: 32, escapeTemplate: 'wide', backupEscapeBpm: 0 },
  vtMono: { atria: 'sinus', av: 'conducted', focus: 'vt', escape: 'none', rateDrives: 'focus', rateRange: [120, 250], defaultRateBpm: 170, escapeTemplate: 'wide', backupEscapeBpm: 0 },
  asystole: { atria: 'none', av: 'dissociated', focus: 'none', escape: 'none', rateDrives: 'none', rateRange: [0, 0], defaultRateBpm: 0, escapeTemplate: 'narrow', backupEscapeBpm: 0 },
};

export const RHYTHM_IDS = Object.keys(RHYTHMS) as RhythmId[];

/** Dissociated atria (CHB, VT) run at their own rate (RhythmOpts.atrialRateBpm, default 80) [ENG]. */
export const DEFAULT_DISSOCIATED_ATRIAL_BPM = 80;
/** Flutter atrial rate default (brief §5: 250–350). */
export const DEFAULT_FLUTTER_ATRIAL_BPM = 300;
```

- [x] **Step 4: Implement the rhythm engine**

How it works (read before typing): `planUntil(T)` repeatedly picks the earliest of five internal clocks — atrial (`atria.nextT`), pending ventricular activations (`pending[0]`), the VT/AVNRT focus, the escape timer, and the AF junction's spontaneous crossing — handles it, and stops when the earliest is after `T`. Atrial handlers emit P / flutter kernels and decide conduction (AV mode); ventricular activation emits QRS-T kernels, a `beat` record with `k_rhythm` mechanics, sets `refractoryUntil`, resets the escape timer and draws ectopy. A PVC does not touch the SA clock, so the next sinus beat is concealed and the pause is compensatory — this emerges; it is not coded as a rule.

`packages/engine-core/src/l2/ecg/rhythm-engine.ts`:
```ts
// Rhythm engine (brief §4.1 "Rhythm engine", §4.8 k_rhythm; research 03 §1.5). Separate atrial and
// ventricular clocks with an AV-node state machine, after Squiggler's atria × cadence × ventricle layering.
// It is a discrete-event planner: planUntil(T) processes every internal event up to T and appends kernel
// events (for the sample generator) and beat/atrial records (for the event stream). All state is plain
// JSON-safe data so the engine can clone it every tick (look-ahead) and snapshot it.
import { normal, uniform, type Sfc32State, type StreamName } from '../../rng/sfc32.ts';
import type { BeatOrigin, EngineEvent, Modifiers, RhythmId, RhythmOpts } from '../../types.ts';
import { lvetMs, prMs, qtFridericiaMs } from './intervals.ts';
import { makeEvent, type EcgEvent } from './kernels.ts';
import { respSin, sinusRR, type HrvPhase } from './hrv.ts';
import {
  DEFAULT_DISSOCIATED_ATRIAL_BPM,
  DEFAULT_FLUTTER_ATRIAL_BPM,
  RHYTHMS,
  type RhythmDef,
} from './rhythms.ts';
import {
  fiducialS,
  flutterKernels,
  kernelQtMs,
  pWaveKernels,
  templateKernels,
  templateQrsMs,
  type TemplateId,
} from './templates.ts';

/** JSON-safe stand-in for ±Infinity. */
export const NEVER = 1e12;

// --- constants (sources in comments) -------------------------------------------------------------
const MOBITZ1_DELTA_S = 0.1; // Δ 60–120 ms [03 §1.5]
const MOBITZ1_R = 0.5; // r = 0.5 [03 §1.5]
const AVB1_DEFAULT_PR_MS = 280; // PR > 200 ms (brief §5) [ENG value]
const FLUTTER_FR_S = 0.26; // F-wave → QRS conduction time [ENG]
const AF_IMPULSE_MEAN_S = 0.2; // atrial impulses, Poisson at 5/s [03 §1.5, Lian 2007]
const AF_IMPULSE_MIN_S = 0.05; // truncation of the Poisson process [ENG]
const AF_DV_MV = 15; // each impulse raises the junction potential by 15 mV [03 §1.5]
const AF_SLOPE_MV_S = 30; // phase-4 depolarisation 30 mV/s [03 §1.5]
/**
 * Rate control [ENG, calibrated by simulation in Task 9]. For a target ventricular rate hr (RR = 60/hr):
 *   threshold θ = AF_THETA_K · RR²  (so the first-passage spread, ∝ √θ, stays ≈ 0.2·RR → RR CV ≈ 0.2)
 *   mean wait  W ≈ θ / (slope + ΔV·impulseRate) = θ / 105 mV/s
 *   refractory τ_R = RR − W   ("the refractory period is the rate-control knob", brief §4.1)
 */
const AF_THETA_K = 80;
const AF_DRIVE_MV_S = AF_SLOPE_MV_S + AF_DV_MV / AF_IMPULSE_MEAN_S;
/** Simulated mean rate is ~5% below target (impulse truncation, minimum refractoriness); aim 5% high. */
const AF_RATE_CORRECTION = 0.95;
const AF_AV_S = 0.06; // junction → QRS onset [ENG]
const AF_MIN_REFRACTORY_S = 0.25; // RR_min 0.25–0.30 s (brief §4.1 AF fallback) [ENG]
const VT_JITTER_S = 0.004; // ±4 ms cycle-length jitter [ENG]
const ESCAPE_JITTER_SD_S = 0.01; // [ENG]
const PVC_COUPLING_MIN = 0.55; // PVC coupling 40–80% of RR (brief §5); Stage 1 draws 55–65% [ENG]
const PVC_COUPLING_SPAN = 0.1;
const PVC_NO_EJECTION_BELOW = 0.45; // no ejection at coupling < ~45% of RR (brief §4.8)
const REFRACTORY_QT_FRACTION = 0.8; // refractoryUntil = t + QRS + 0.8·QT (brief §4.1) [ENG]
const QRS_AMP_RESP_MOD = 0.08; // respiration modulates R by ±5–15% (brief §4.1)
const BASE_SV_ML = 70; // placeholder SV until the Stage 2 haemodynamic core [ENG]

export interface PendingV {
  t: number;
  origin: BeatOrigin;
  template: TemplateId;
  prMs: number | null;
  pvc: boolean;
  coupling: number; // PVC coupling as a fraction of the prevailing RR (0 for non-PVC)
  /** Primary pacemakers that set their own timing (VT/AVNRT focus, AF junction) skip the refractory check. */
  bypass: boolean;
}

export interface FWave {
  start: number;
  end: number;
  f: number[];
  ph: number[];
  a: number[];
}

export interface RhythmState {
  id: RhythmId;
  opts: RhythmOpts;
  respectRefractory: boolean;
  planT: number;
  atria: { nextT: number; groupPos: number; groupRatio: number };
  junction: { refUntil: number; v: number; vT: number };
  pending: PendingV[];
  focusNextT: number;
  escapeNextT: number;
  refractoryUntil: number;
  lastVT: number;
  lastSupraT: number;
  lastWasPvc: boolean;
  fwave: FWave | null;
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

export function createRhythmState(id: RhythmId, opts: RhythmOpts, t0: number, ctx: RhythmCtx): RhythmState {
  const st: RhythmState = {
    id: 'asystole',
    opts: {},
    respectRefractory: true,
    planT: t0,
    atria: { nextT: NEVER, groupPos: 0, groupRatio: 2 },
    junction: { refUntil: t0, v: 0, vT: t0 },
    pending: [],
    focusNextT: NEVER,
    escapeNextT: NEVER,
    refractoryUntil: -NEVER,
    lastVT: -NEVER,
    lastSupraT: -NEVER,
    lastWasPvc: false,
    fwave: null,
    events: [],
    records: [],
    beatSeq: 0,
    pendingSwitch: null,
  };
  applyRhythm(st, id, opts, t0, true, ctx);
  return st;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

/** The rate this rhythm's primary clock runs at, at time t (bpm). */
export function rhythmRate(st: RhythmState, t: number, ctx: RhythmCtx): number {
  const def = RHYTHMS[st.id];
  return clamp(ctx.hrAt(t), def.rateRange[0], def.rateRange[1]);
}

function atrialRate(st: RhythmState, def: RhythmDef, t: number, ctx: RhythmCtx): number {
  if (def.atria === 'flutter') return st.opts.atrialRateBpm ?? DEFAULT_FLUTTER_ATRIAL_BPM;
  if (def.rateDrives === 'sinus') return rhythmRate(st, t, ctx);
  return st.opts.atrialRateBpm ?? DEFAULT_DISSOCIATED_ATRIAL_BPM;
}

function escapeRate(st: RhythmState, def: RhythmDef, t: number, ctx: RhythmCtx): number {
  if (def.escape === 'none') return 0;
  return def.rateDrives === 'escape' ? rhythmRate(st, t, ctx) : def.backupEscapeBpm;
}

function flutterRatio(st: RhythmState, s: Sfc32State): number {
  const r = st.opts.ratio ?? 2;
  if (r === 'variable') return uniform(s) < 0.5 ? 2 : 4;
  return r;
}

/** AF junction threshold (mV above reset) for a target ventricular rate `hr`. */
export function afThresholdMv(hr: number): number {
  const rr = (60 * AF_RATE_CORRECTION) / hr;
  return AF_THETA_K * rr * rr;
}

/** AF junction refractory period that gives a mean ventricular rate of `hr`. */
export function afRefractoryS(hr: number): number {
  return Math.max(AF_MIN_REFRACTORY_S, (60 * AF_RATE_CORRECTION) / hr - afThresholdMv(hr) / AF_DRIVE_MV_S);
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
  return { start: t0, end: NEVER, f, ph, a };
}

/**
 * Switch rhythm at time `at` (clamped to the planning frontier, so already-planned beats are kept).
 * Called by createRhythmState, by the engine's setRhythm, and by a deferred 'nextBeat' switch.
 */
export function applyRhythm(
  st: RhythmState,
  id: RhythmId,
  opts: RhythmOpts,
  at: number,
  respectRefractory: boolean,
  ctx: RhythmCtx,
): void {
  const prev = RHYTHMS[st.id];
  const def = RHYTHMS[id];
  const t0 = Math.max(at, st.planT);
  const wasFib = st.id === 'afib';
  st.id = id;
  st.opts = { ...opts };
  st.respectRefractory = respectRefractory;
  st.pendingSwitch = null;

  // Atria
  if (def.atria === 'none') st.atria.nextT = NEVER;
  else if (def.atria !== prev.atria || st.atria.nextT >= NEVER) st.atria.nextT = t0 + (def.atria === 'sinus' ? 0.1 : 0);
  st.atria.groupPos = 0;
  st.atria.groupRatio = def.atria === 'flutter' ? flutterRatio(st, ctx.rng.conduction) : 2;

  // AF: f-waves and the integrate-and-fire junction
  if (def.atria === 'fib' && !wasFib) {
    st.fwave = drawFWave(t0, ctx.rng.conduction);
    st.junction = { refUntil: t0, v: 0, vT: t0 };
  }
  if (def.atria !== 'fib' && wasFib && st.fwave) st.fwave.end = t0;

  // Ventricular focus (VT / AVNRT)
  st.focusNextT = def.focus === 'none' ? NEVER : Math.max(t0 + 0.05, st.refractoryUntil + 0.01);

  // Escape timer
  const er = escapeRate(st, def, t0, ctx);
  st.escapeNextT = er > 0 ? Math.max(t0, st.lastVT) + 60 / er : NEVER;
}

function pushPending(st: RhythmState, p: PendingV): void {
  let i = st.pending.length;
  while (i > 0 && (st.pending[i - 1] as PendingV).t > p.t) i--;
  st.pending.splice(i, 0, p);
}

function junctionSpontT(st: RhythmState, ctx: RhythmCtx): number {
  const j = st.junction;
  return Math.max(j.vT, j.refUntil) + (afThresholdMv(rhythmRate(st, j.vT, ctx)) - j.v) / AF_SLOPE_MV_S;
}

function fireJunction(st: RhythmState, t: number, ctx: RhythmCtx): void {
  pushPending(st, { t: t + AF_AV_S, origin: 'atrial', template: 'narrow', prMs: null, pvc: false, coupling: 0, bypass: true });
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

function onAtrial(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const def = RHYTHMS[st.id];
  if (def.atria === 'fib') {
    const conducted = junctionImpulse(st, t, ctx);
    st.records.push({ type: 'atrial', t, kind: 'fib', conducted });
    st.atria.nextT = t + AF_IMPULSE_MIN_S - (AF_IMPULSE_MEAN_S - AF_IMPULSE_MIN_S) * Math.log(1 - uniform(ctx.rng.conduction));
    return;
  }
  if (def.atria === 'flutter') {
    st.events.push(makeEvent(t, flutterKernels()));
    const conducted = st.atria.groupPos === 0;
    st.atria.groupPos++;
    if (st.atria.groupPos >= st.atria.groupRatio) {
      st.atria.groupPos = 0;
      st.atria.groupRatio = flutterRatio(st, ctx.rng.conduction);
    }
    if (conducted) pushPending(st, { t: t + FLUTTER_FR_S, origin: 'atrial', template: 'narrow', prMs: FLUTTER_FR_S * 1000, pvc: false, coupling: 0, bypass: false });
    st.records.push({ type: 'atrial', t, kind: 'flutter', conducted });
    st.atria.nextT = t + 60 / atrialRate(st, def, t, ctx);
    return;
  }
  // Sinus P wave
  const rate = atrialRate(st, def, t, ctx);
  st.events.push(makeEvent(t, pWaveKernels()));
  let pr: number | null = null;
  if (def.av === 'conducted') {
    pr = st.id === 'avb1' ? (st.opts.prMs ?? AVB1_DEFAULT_PR_MS) : prMs(rate);
  } else if (def.av === 'wenckebach') {
    const n = st.opts.groupSize ?? 4;
    const pos = st.atria.groupPos;
    if (pos < n - 1) {
      // PR_n = PR_1 + Δ·(1 − r^(n−1))/(1 − r)  (brief §4.1), n = pos + 1
      pr = prMs(rate) + 1000 * MOBITZ1_DELTA_S * ((1 - MOBITZ1_R ** pos) / (1 - MOBITZ1_R));
    }
    st.atria.groupPos = (pos + 1) % n;
  }
  if (pr !== null) pushPending(st, { t: t + pr / 1000, origin: 'sinus', template: 'narrow', prMs: pr, pvc: false, coupling: 0, bypass: false });
  st.records.push({ type: 'atrial', t, kind: 'p', conducted: pr !== null });
  st.atria.nextT = t + sinusRR(60 / rate, t, ctx.hrv, ctx.mods, ctx.rng.hrv);
}

function fFill(rr: number): number {
  // f_fill(RR) = 1 − exp(−max(0, RR − t_sys)/τ_fill), t_sys = LVET + 0.08 s, τ_fill 0.18 s,
  // normalised to 1 at RR 1 s (brief §4.8; research 03 §8.2)
  const f = (x: number) => 1 - Math.exp(-Math.max(0, x - (Math.max(150, lvetMs(60 / x)) / 1000 + 0.08)) / 0.18);
  return f(rr) / f(1);
}

/** Stroke-volume factor k_rhythm for one beat (brief §4.8 table). */
function kRhythm(st: RhythmState, p: PendingV, rr: number): number {
  let k: number;
  if (p.pvc) k = p.coupling < PVC_NO_EJECTION_BELOW ? 0 : 0.3; // PVC 0–0.6
  else if (p.origin === 'ventricular') {
    const hr = 60 / rr;
    if (RHYTHMS[st.id].focus === 'vt') k = hr <= 150 ? 0.6 : hr >= 200 ? 0.2 : 0.6 - (0.4 * (hr - 150)) / 50; // VT 0.4–0.6 / 0–0.3
    else k = rr >= 1.5 ? 1.4 : 0.7; // CHB escape ≤40/min: SV × 1.3–1.5; idioventricular 0.6–0.8
  } else if (p.origin === 'junctional') k = RHYTHMS[st.id].focus === 'svt' ? 0.85 * fFill(rr) : 0.85; // junctional 0.8–0.9
  else if (st.id === 'afib') k = 0.8 * fFill(rr); // AF 0.75–0.85 × f_fill
  else if (st.id === 'aflutter') k = 0.85; // flutter 0.8–0.9
  else k = 1.0; // sinus
  if (st.lastWasPvc && !p.pvc) k *= 1.2; // beat after a PVC 1.1–1.3
  return Math.max(0, k);
}

function activateVentricle(st: RhythmState, p: PendingV, ctx: RhythmCtx): boolean {
  const t = p.t;
  // Concealed if the ventricle is refractory (brief §4.1). Primary pacemakers (p.bypass) are exempt: the
  // VT/AVNRT focus and the AF junction already set their own cycle length [ENG].
  if (st.respectRefractory && !p.bypass && t < st.refractoryUntil) return false;
  const rate = rhythmRate(st, t, ctx);
  const rr = st.lastVT > -NEVER / 2 ? t - st.lastVT : 60 / Math.max(30, rate || 60);
  const qt = qtFridericiaMs(clamp(rr, 0.25, 2), ctx.mods.qtc);
  const scale = p.template === 'wide' ? (RHYTHMS[st.id].focus === 'vt' ? 0.9 : 1) : 1 + QRS_AMP_RESP_MOD * respSin(t, ctx.hrv);
  const k = templateKernels(p.template, qt, scale);
  st.events.push(makeEvent(t, k));
  const qrsMs = templateQrsMs(p.template);
  const qtDrawn = kernelQtMs(k);
  const kSV = kRhythm(st, p, rr);
  const beat: EngineEvent = {
    type: 'beat',
    t: t + fiducialS(p.template),
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
  const def = RHYTHMS[st.id];
  const er = escapeRate(st, def, t, ctx);
  st.escapeNextT = er > 0 ? t + 60 / er + (def.rateDrives === 'escape' ? ESCAPE_JITTER_SD_S * ctx.mods.hrvScale * normal(ctx.rng.hrv) : 0) : NEVER;

  // Ectopy: decided per supraventricular beat (brief §4.1 "per sinus beat: draw ectopy")
  const supra = !p.pvc && p.template !== 'wide';
  if (supra) st.lastSupraT = t;
  const pvc = ctx.mods.pvc;
  if (supra && pvc) {
    const fire = pvc.pattern === 'bigeminy' || uniform(ctx.rng.ectopy) < pvc.probability;
    if (fire) {
      const rrNow = 60 / Math.max(20, atrialRate(st, def, t, ctx) || rate || 60);
      const frac = PVC_COUPLING_MIN + PVC_COUPLING_SPAN * uniform(ctx.rng.ectopy);
      const tp = Math.max(t + frac * rrNow, st.refractoryUntil + 0.005);
      pushPending(st, { t: tp, origin: 'ventricular', template: 'wide', prMs: null, pvc: true, coupling: (tp - t) / rrNow, bypass: false });
    }
  }
  st.lastWasPvc = p.pvc;

  if (st.pendingSwitch) {
    const sw = st.pendingSwitch;
    applyRhythm(st, sw.id, sw.opts, t + 0.001, sw.respectRefractory, ctx);
  }
  return true;
}

function onFocus(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const def = RHYTHMS[st.id];
  const rate = rhythmRate(st, t, ctx);
  const isVt = def.focus === 'vt';
  const ok = activateVentricle(
    st,
    { t, origin: isVt ? 'ventricular' : 'junctional', template: isVt ? 'wide' : 'narrowRetroP', prMs: null, pvc: false, coupling: 0, bypass: true },
    ctx,
  );
  if (ok && !isVt) st.records.push({ type: 'atrial', t: t + 0.07, kind: 'retrograde', conducted: false });
  const next = t + 60 / rate + VT_JITTER_S * (2 * uniform(ctx.rng.ectopy) - 1);
  st.focusNextT = ok ? next : Math.max(next, st.refractoryUntil + 0.01);
}

function onEscape(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const def = RHYTHMS[st.id];
  const origin: BeatOrigin = def.escape === 'ventricular' ? 'ventricular' : 'junctional';
  const ok = activateVentricle(st, { t, origin, template: def.escapeTemplate, prMs: null, pvc: false, coupling: 0, bypass: false }, ctx);
  if (!ok) {
    const er = escapeRate(st, def, t, ctx);
    st.escapeNextT = er > 0 ? Math.max(t, st.refractoryUntil) + 60 / er : NEVER;
  }
}

/** Process every internal rhythm event with time ≤ T. */
export function planUntil(st: RhythmState, T: number, ctx: RhythmCtx): void {
  for (let guard = 0; guard < 1_000_000; guard++) {
    const def = RHYTHMS[st.id];
    const tA = def.atria === 'none' ? NEVER : st.atria.nextT;
    const tP = st.pending.length > 0 ? (st.pending[0] as PendingV).t : NEVER;
    const tF = def.focus === 'none' ? NEVER : st.focusNextT;
    const tE = def.escape === 'none' ? NEVER : st.escapeNextT;
    const tJ = def.av === 'integrateFire' ? junctionSpontT(st, ctx) : NEVER;
    const t = Math.min(tA, tP, tF, tE, tJ);
    if (t > T) break;
    if (t === tA) onAtrial(st, t, ctx);
    else if (t === tJ) fireJunction(st, t, ctx);
    else if (t === tP) activateVentricle(st, st.pending.shift() as PendingV, ctx);
    else if (t === tF) onFocus(st, t, ctx);
    else onEscape(st, t, ctx);
  }
  st.planT = Math.max(st.planT, T);
}
```

- [x] **Step 5: Run to see them pass**

Run: `pnpm --filter @pme/engine-core exec vitest run test/l2/ecg/rhythm-sinus && pnpm --filter @pme/engine-core typecheck`
Expected: PASS, 6 tests.

- [x] **Step 6: Commit**

```bash
git add packages/engine-core
git commit -m "feat(ecg): rhythm engine with atrial/ventricular clocks, AV node, escape, HRV and k_rhythm" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: AV-block acceptance tests (Mobitz I, complete heart block)

**Files:**
- Create: `packages/engine-core/test/helpers/stats.ts`, `packages/engine-core/test/l2/ecg/rhythm-avblock.test.ts`

**Interfaces:**
- Consumes: `runRhythm`, `mean`, `diffs` (Task 5).
- Produces: `ksUniform(xs): { d; p }` (one-sample KS vs U(0,1), Stephens-corrected asymptotic p), `lag1(xs)`.

These tests exercise code written in Task 5. Run them expecting PASS; a failure is a bug in Task 5's `rhythm-engine.ts` (or in the helper) — fix it there, never by loosening a tolerance from BUILD-PLAN.

- [x] **Step 1: Write the helper and the tests (acceptance tests 5 and 6)**

`packages/engine-core/test/helpers/stats.ts`:
```ts
// Small statistics helpers for rhythm tests (written from textbook definitions).

/** One-sample Kolmogorov–Smirnov test against U(0,1). Returns D and the asymptotic p-value
 *  (Kolmogorov distribution with Stephens' small-sample correction λ = (√n + 0.12 + 0.11/√n)·D). */
export function ksUniform(xs: readonly number[]): { d: number; p: number } {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  let d = 0;
  s.forEach((x, i) => {
    d = Math.max(d, (i + 1) / n - x, x - i / n);
  });
  const sq = Math.sqrt(n);
  const lambda = (sq + 0.12 + 0.11 / sq) * d;
  let p = 0;
  for (let k = 1; k <= 100; k++) p += 2 * (-1) ** (k - 1) * Math.exp(-2 * k * k * lambda * lambda);
  return { d, p: Math.min(1, Math.max(0, p)) };
}

/** Lag-1 autocorrelation coefficient. */
export function lag1(xs: readonly number[]): number {
  const n = xs.length;
  const m = xs.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const d = (xs[i] as number) - m;
    den += d * d;
    if (i > 0) num += d * ((xs[i - 1] as number) - m);
  }
  return num / den;
}
```

`packages/engine-core/test/l2/ecg/rhythm-avblock.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { diffs, mean, runRhythm } from '../../helpers/rhythm.ts';
import { ksUniform } from '../../helpers/stats.ts';

describe('rhythm engine: AV blocks', () => {
  it('avb1: every P conducts with a constant PR of 280 ms', () => {
    const { beats, atrial } = runRhythm('avb1', 30, { mods: { hrvScale: 0 } });
    expect(atrial.every((a) => a.conducted)).toBe(true);
    expect(new Set(beats.map((b) => b.prMs))).toEqual(new Set([280]));
  });

  it('acceptance 5: Mobitz I — decreasing PR increments, one dropped P per group, pause < 2·PP', () => {
    const { beats, atrial } = runRhythm('avb2Mobitz1', 60, { mods: { hrvScale: 0 } }); // 4:3 at 75 bpm
    const pp = mean(diffs(atrial.map((a) => a.t)));
    // Split conducted beats into groups separated by a dropped P.
    const groups: number[][] = [];
    let cur: number[] = [];
    let bi = 0;
    for (const a of atrial) {
      if (a.conducted) {
        const b = beats[bi++];
        if (b) cur.push(b.prMs!);
      } else {
        if (cur.length) groups.push(cur);
        cur = [];
      }
    }
    const full = groups.slice(1).filter((g) => g.length === 3);
    expect(full.length).toBeGreaterThanOrEqual(10);
    for (const g of full) {
      const inc = diffs(g);
      for (let i = 1; i < inc.length; i++) expect(inc[i]!).toBeLessThan(inc[i - 1]!);
      expect(inc.every((x) => x > 0)).toBe(true);
    }
    // exactly one dropped P between consecutive groups
    const dropped = atrial.map((a) => a.conducted);
    for (let i = 1; i < dropped.length; i++) expect(dropped[i] === false && dropped[i - 1] === false).toBe(false);
    // the pause containing the dropped P is shorter than two P–P intervals
    const rr = diffs(beats.map((b) => b.t));
    const pause = Math.max(...rr);
    expect(pause).toBeLessThan(2 * pp);
    expect(beats.every((b) => b.origin === 'sinus')).toBe(true); // no escape beats at 75 bpm
  });

  it('acceptance 6: avb3Narrow — P–QRS interval uniformly spread (KS p > 0.05), ventricular rate 40–60', () => {
    const { beats, atrial } = runRhythm('avb3Narrow', 300, { seed: 6 });
    const pTimes = atrial.map((a) => a.t);
    const phases: number[] = [];
    for (const b of beats) {
      const onset = b.t - 0.04;
      let i = -1;
      for (let j = 0; j < pTimes.length && pTimes[j]! <= onset; j++) i = j;
      if (i < 0 || i + 1 >= pTimes.length) continue;
      phases.push((onset - pTimes[i]!) / (pTimes[i + 1]! - pTimes[i]!));
    }
    expect(phases.length).toBeGreaterThan(100);
    expect(ksUniform(phases).p).toBeGreaterThan(0.05);
    const vRate = 60 / mean(diffs(beats.map((b) => b.t)));
    expect(vRate).toBeGreaterThanOrEqual(40);
    expect(vRate).toBeLessThanOrEqual(60);
    expect(atrial.every((a) => !a.conducted)).toBe(true);
    expect(beats.every((b) => b.origin === 'junctional' && b.qrsMs < 120)).toBe(true);
  });

  it('avb3Wide: ventricular escape 20–40/min with wide QRS', () => {
    const { beats } = runRhythm('avb3Wide', 120);
    const vRate = 60 / mean(diffs(beats.map((b) => b.t)));
    expect(vRate).toBeGreaterThanOrEqual(20);
    expect(vRate).toBeLessThanOrEqual(40);
    expect(beats.every((b) => b.origin === 'ventricular' && b.qrsMs >= 120)).toBe(true);
  });
});
```

- [x] **Step 2: Prove the tests can fail**

Temporarily change `MOBITZ1_R` in `rhythm-engine.ts` from `0.5` to `1.5`, run `pnpm --filter @pme/engine-core exec vitest run test/l2/ecg/rhythm-avblock`, expect the Mobitz test to FAIL (increments grow), then restore `0.5`.

- [x] **Step 3: Run to see them pass**

Run: `pnpm --filter @pme/engine-core exec vitest run test/l2/ecg/rhythm-avblock`
Expected: PASS, 4 tests.

- [x] **Step 4: Commit**

```bash
git add packages/engine-core/test
git commit -m "test(ecg): Mobitz I grouping and complete heart block dissociation (acceptance 5, 6)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: AF, flutter, AVNRT and VT acceptance tests

**Files:**
- Create: `packages/engine-core/test/l2/ecg/rhythm-atrial.test.ts`

**Interfaces:**
- Consumes: `runRhythm`, `mean`, `sd`, `diffs` (Task 5); `lag1` (Task 6); `K_STRIDE`, `WAVE` (Task 3).
- Produces: nothing new.

Same rule as Task 6: expect PASS; fix `rhythm-engine.ts` if not.

- [x] **Step 1: Write the tests (acceptance test 7 plus rate checks)**

`packages/engine-core/test/l2/ecg/rhythm-atrial.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { K_STRIDE, WAVE } from '../../../src/l2/ecg/kernels.ts';
import { diffs, mean, runRhythm, sd } from '../../helpers/rhythm.ts';
import { lag1 } from '../../helpers/stats.ts';

describe('rhythm engine: AF, flutter, AVNRT', () => {
  it('acceptance 7: afib — RR CV 0.15–0.25, |lag-1 autocorrelation| < 0.1, no P kernels', () => {
    const { st, beats, atrial } = runRhythm('afib', 600, { seed: 3 });
    const rr = diffs(beats.map((b) => b.t));
    const cv = sd(rr) / mean(rr);
    expect(cv).toBeGreaterThanOrEqual(0.15);
    expect(cv).toBeLessThanOrEqual(0.25);
    expect(Math.abs(lag1(rr))).toBeLessThan(0.1);
    const pKernels = st.events.flatMap((e) => e.k.filter((v, i) => i % K_STRIDE === 6 && v === WAVE.P));
    expect(pKernels).toHaveLength(0);
    expect(atrial.every((a) => a.kind === 'fib')).toBe(true);
    expect(st.fwave).not.toBeNull();
  });

  it('afib mean ventricular rate follows the hr target within ±10% (60–150 bpm)', () => {
    for (const hr of [60, 100, 150]) {
      const { beats } = runRhythm('afib', 600, { hr, seed: 11 });
      const got = 60 / mean(diffs(beats.map((b) => b.t)));
      expect(Math.abs(got - hr) / hr).toBeLessThan(0.1);
    }
  });

  it('afib beats carry k_rhythm 0.8 × f_fill(RR) and short RRs lose ejection (brief §4.8)', () => {
    const { beats } = runRhythm('afib', 300, { hr: 130, seed: 2 });
    const ks = beats.map((b) => b.mech.kSV);
    expect(Math.max(...ks)).toBeLessThanOrEqual(0.9);
    expect(Math.min(...ks)).toBeLessThan(0.6);
  });

  it('aflutter: atrial 300/min; 2:1 → 150, 4:1 → 75; variable mixes both', () => {
    const two = runRhythm('aflutter', 60, { rhythmOpts: { ratio: 2 } });
    expect(60 / mean(diffs(two.atrial.map((a) => a.t)))).toBeCloseTo(300, 6);
    expect(60 / mean(diffs(two.beats.map((b) => b.t)))).toBeCloseTo(150, 1);
    const four = runRhythm('aflutter', 60, { rhythmOpts: { ratio: 4 } });
    expect(60 / mean(diffs(four.beats.map((b) => b.t)))).toBeCloseTo(75, 1);
    const v = runRhythm('aflutter', 120, { rhythmOpts: { ratio: 'variable' }, seed: 5 });
    const rr = diffs(v.beats.map((b) => b.t)).map((x) => Math.round(x * 10) / 10);
    expect(new Set(rr)).toEqual(new Set([0.4, 0.8]));
    expect(v.atrial.every((a) => a.kind === 'flutter')).toBe(true);
  });

  it('svtAvnrt: regular narrow junctional rhythm at 180 with a retrograde P', () => {
    const { st, beats, atrial } = runRhythm('svtAvnrt', 30);
    const rr = diffs(beats.map((b) => b.t));
    expect(60 / mean(rr)).toBeCloseTo(180, 0);
    expect(sd(rr)).toBeLessThan(0.005);
    expect(beats.every((b) => b.origin === 'junctional' && b.qrsMs < 120)).toBe(true);
    expect(atrial.every((a) => a.kind === 'retrograde')).toBe(true);
    const retro = st.events.flatMap((e) => e.k.filter((v, i) => i % K_STRIDE === 6 && v === WAVE.RETRO_P));
    expect(retro.length).toBeGreaterThan(0);
  });

  it('vtMono: 170/min wide complexes (QRS 140–200 ms) with dissociated P waves', () => {
    const { beats, atrial } = runRhythm('vtMono', 30);
    expect(60 / mean(diffs(beats.map((b) => b.t)))).toBeCloseTo(170, -1);
    expect(beats.every((b) => b.origin === 'ventricular' && b.qrsMs >= 140 && b.qrsMs <= 200)).toBe(true);
    expect(atrial.length).toBeGreaterThan(30); // sinus P waves march through
    expect(beats.every((b) => b.mech.kSV > 0.3 && b.mech.kSV < 0.6)).toBe(true);
  });
});
```

- [x] **Step 2: Prove the AF test can fail**

Temporarily set `AF_THETA_K = 10` in `rhythm-engine.ts`, run the file, expect the AF CV test to FAIL (CV < 0.15), then restore `80`.

- [x] **Step 3: Run to see them pass**

Run: `pnpm --filter @pme/engine-core exec vitest run test/l2/ecg/rhythm-atrial`
Expected: PASS, 6 tests.

- [x] **Step 4: Commit**

```bash
git add packages/engine-core/test
git commit -m "test(ecg): AF irregularity, flutter ratios, AVNRT and VT (acceptance 7)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: PVC modifier acceptance tests

**Files:**
- Create: `packages/engine-core/test/l2/ecg/rhythm-pvc.test.ts`

**Interfaces:**
- Consumes: `runRhythm`, `diffs` (Task 5). `beat.template === 'pvc'` marks PVC beats (Task 5).
- Produces: nothing new.

- [x] **Step 1: Write the tests (acceptance test 8)**

`packages/engine-core/test/l2/ecg/rhythm-pvc.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { diffs, runRhythm } from '../../helpers/rhythm.ts';

describe('rhythm engine: PVC modifier', () => {
  it('acceptance 8: bigeminy — coupling + pause = 2·RR ± 10 ms, PVC QRS 120–200 ms', () => {
    for (const hr of [60, 75, 100]) {
      const { beats } = runRhythm('sinus', 60, { hr, mods: { hrvScale: 0, pvc: { pattern: 'bigeminy', probability: 0 } } });
      const rr = 60 / hr;
      let checked = 0;
      for (let i = 1; i + 1 < beats.length; i++) {
        const b = beats[i]!;
        if (b.template !== 'pvc') continue;
        const prev = beats[i - 1]!;
        const next = beats[i + 1]!;
        expect(prev.template).not.toBe('pvc');
        expect(next.template).not.toBe('pvc');
        // measure on QRS onsets (fiducials differ between narrow 40 ms and wide 50 ms)
        const coupling = b.t - 0.05 - (prev.t - 0.04);
        const pause = next.t - 0.04 - (b.t - 0.05);
        expect(Math.abs(coupling + pause - 2 * rr)).toBeLessThanOrEqual(0.01);
        expect(b.qrsMs).toBeGreaterThanOrEqual(120);
        expect(b.qrsMs).toBeLessThanOrEqual(200);
        checked++;
      }
      expect(checked).toBeGreaterThan(10);
    }
  });

  it('bigeminy alternates N-V-N-V; single PVCs appear at roughly the set probability', () => {
    const big = runRhythm('sinus', 30, { hr: 75, mods: { pvc: { pattern: 'bigeminy', probability: 0 } } });
    const seq = big.beats.slice(2, 12).map((b) => (b.template === 'pvc' ? 'V' : 'N')).join('');
    expect(['NVNVNVNVNV', 'VNVNVNVNVN']).toContain(seq);
    const single = runRhythm('sinus', 600, { hr: 75, seed: 3, mods: { pvc: { pattern: 'single', probability: 0.2 } } });
    const pvcs = single.beats.filter((b) => b.template === 'pvc').length;
    const normals = single.beats.length - pvcs;
    expect(pvcs / normals).toBeGreaterThan(0.15);
    expect(pvcs / normals).toBeLessThan(0.25);
  });

  it('PVC mechanics: early PVCs do not eject; the beat after a PVC is potentiated (brief §4.8)', () => {
    const { beats } = runRhythm('sinus', 60, { hr: 75, mods: { hrvScale: 0, pvc: { pattern: 'bigeminy', probability: 0 } } });
    const i = beats.findIndex((b, j) => j > 2 && b.template === 'pvc');
    expect(beats[i]!.mech.kSV).toBeGreaterThanOrEqual(0);
    expect(beats[i]!.mech.kSV).toBeLessThanOrEqual(0.6);
    expect(beats[i + 1]!.mech.kSV).toBeCloseTo(1.2, 6);
    expect(diffs([beats[i - 1]!.t, beats[i]!.t])[0]).toBeGreaterThan(0.35);
  });
});
```

- [x] **Step 2: Prove the compensatory-pause test can fail**

Temporarily change `REFRACTORY_QT_FRACTION` to `0.1` in `rhythm-engine.ts` (the next sinus beat is then no longer concealed → interpolated PVCs), run the file, expect FAIL, restore `0.8`.

- [x] **Step 3: Run to see them pass**

Run: `pnpm --filter @pme/engine-core exec vitest run test/l2/ecg/rhythm-pvc`
Expected: PASS, 3 tests.

- [x] **Step 4: Commit**

```bash
git add packages/engine-core/test
git commit -m "test(ecg): PVC bigeminy compensatory pause and PVC mechanics (acceptance 8)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: VCG sample generator (kernels + f-waves + wander + noise)

**Files:**
- Create: `packages/engine-core/src/l2/ecg/generator.ts`, `packages/engine-core/test/l2/ecg/generator.test.ts`

**Interfaces:**
- Consumes: `EcgEvent`, `addEventAt` (Task 3); `FWAVE_DIR`, `WANDER_DIR`, `narrowKernels` (Task 4); `respSin`, `HrvPhase` (Task 5); `FWave` (Task 5); `sfc32Next`.
- Produces: `ECG_RATE = 500`, `NOISE_SD_MV = 0.025`, `WANDER_MV = 0.08`, `tableNormal(s)`, `interface GenInputs { events; fwave; hrv; noiseLevel; noise: Sfc32State }`, `pruneEvents(events, t)`, `generateVcg(g, from, to, sink: (index, x, y, z) => void)` (inclusive range).

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l2/ecg/generator.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { createRngState } from '../../../src/rng/sfc32.ts';
import { ECG_RATE, generateVcg, pruneEvents, tableNormal } from '../../../src/l2/ecg/generator.ts';
import { makeEvent } from '../../../src/l2/ecg/kernels.ts';
import { narrowKernels } from '../../../src/l2/ecg/templates.ts';
import { projectLead } from '../../../src/l2/ecg/vcg.ts';

const hrv = { phi: 0, psi: 0 };

describe('l2/ecg/generator', () => {
  it('reproduces the analytic kernel sum: lead II R peak ≈ 1.1 mV at QRS onset + 40 ms', () => {
    const ev = makeEvent(1.0, narrowKernels(400));
    const ii: number[] = [];
    generateVcg({ events: [ev], fwave: null, hrv, noiseLevel: 0, noise: createRngState(1).noise }, 450, 700, (_n, x, y, z) =>
      ii.push(projectLead('ecgII', x, y, z)),
    );
    const peak = Math.max(...ii);
    const at = 450 + ii.indexOf(peak);
    expect(at).toBe(Math.round(1.04 * ECG_RATE));
    // wander adds ≤ 0.08 mV at this phase; the R kernel dominates
    expect(peak).toBeGreaterThan(1.0);
    expect(peak).toBeLessThan(1.25);
  });

  it('noise level 1 gives ≈0.025 mV SD per axis; level 0 gives none', () => {
    const noise = createRngState(9).noise;
    const xs: number[] = [];
    generateVcg({ events: [], fwave: null, hrv, noiseLevel: 1, noise }, 0, 49_999, (_n, x) => xs.push(x));
    // remove the (deterministic) wander by differencing adjacent samples: var(diff) = 2σ²
    const d = xs.slice(1).map((x, i) => x - xs[i]!);
    const sd = Math.sqrt(d.reduce((a, b) => a + b * b, 0) / d.length / 2);
    expect(sd).toBeGreaterThan(0.023);
    expect(sd).toBeLessThan(0.027);
    const q: number[] = [];
    generateVcg({ events: [], fwave: null, hrv, noiseLevel: 0, noise }, 0, 10, (_n, x) => q.push(x));
    expect(new Set(q.map((v) => Math.abs(v) < 0.2)).has(false)).toBe(false);
  });

  it('table noise is ~N(0,1) and deterministic per stream', () => {
    const a = createRngState(3).noise;
    const b = createRngState(3).noise;
    const va = Array.from({ length: 20_000 }, () => tableNormal(a));
    const vb = Array.from({ length: 20_000 }, () => tableNormal(b));
    expect(va).toEqual(vb);
    const m = va.reduce((p, x) => p + x, 0) / va.length;
    expect(Math.abs(m)).toBeLessThan(0.05);
  });

  it('prunes finished events', () => {
    const evs = [makeEvent(0, narrowKernels(400)), makeEvent(5, narrowKernels(400))];
    expect(pruneEvents(evs, 2)).toHaveLength(1);
  });
});
```

- [x] **Step 2: Run to see it fail**

Run: `pnpm --filter @pme/engine-core exec vitest run test/l2/ecg/generator`
Expected: FAIL — cannot load `generator.ts`.

- [x] **Step 3: Implement**

`packages/engine-core/src/l2/ecg/generator.ts`:
```ts
// VCG sample generator at 500 Hz (brief §3.2 L2, §4.1). Sums the scheduled kernel events, AF f-waves,
// respiratory baseline wander and additive white noise (brief §5 artefact table: 0.025 mV SD).
// Artefacts are summed BEFORE the L3 monitor filter (brief §3.2).
import { sfc32Next, type Sfc32State } from '../../rng/sfc32.ts';
import { addEventAt, type EcgEvent } from './kernels.ts';
import { respSin, type HrvPhase } from './hrv.ts';
import type { FWave } from './rhythm-engine.ts';
import { FWAVE_DIR, WANDER_DIR } from './templates.ts';

export const ECG_RATE = 500;
export const NOISE_SD_MV = 0.025; // additive white noise (brief §5; McSharry 2003 example)
export const WANDER_MV = 0.08; // respiratory baseline wander 0.05–0.15 mV at f_resp (brief §4.1)

/** 4096 fixed standard-normal values (sfc32 seed 0x5eed + Box–Muller) so per-sample noise costs one PRNG draw. */
const NOISE_TABLE: Float64Array = (() => {
  const s: Sfc32State = [0x5eed, 0x1234, 0xbeef, 0xcafe];
  for (let i = 0; i < 15; i++) sfc32Next(s);
  const t = new Float64Array(4096);
  for (let i = 0; i < t.length; i++) {
    const u1 = (sfc32Next(s) + 1) / 4294967297;
    const u2 = sfc32Next(s) / 4294967296;
    t[i] = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  return t;
})();

export function tableNormal(s: Sfc32State): number {
  return NOISE_TABLE[sfc32Next(s) >>> 20] as number;
}

export interface GenInputs {
  events: EcgEvent[];
  fwave: FWave | null;
  hrv: HrvPhase;
  noiseLevel: number; // Modifiers.artefact.noise
  noise: Sfc32State;
}

/** Drop events that end before time `t` (they can never contribute again). */
export function pruneEvents(events: EcgEvent[], t: number): EcgEvent[] {
  return events.filter((e) => e.end >= t);
}

/** Generate VCG samples for absolute indices [from, to] (inclusive) and hand each one to `sink`. */
export function generateVcg(
  g: GenInputs,
  from: number,
  to: number,
  sink: (index: number, x: number, y: number, z: number) => void,
): void {
  const t0 = from / ECG_RATE;
  const t1 = to / ECG_RATE;
  const active = g.events.filter((e) => e.start <= t1 && e.end >= t0);
  const acc = new Float64Array(3);
  const sdv = NOISE_SD_MV * g.noiseLevel;
  const fw = g.fwave;
  for (let n = from; n <= to; n++) {
    const s = n / ECG_RATE;
    acc[0] = 0;
    acc[1] = 0;
    acc[2] = 0;
    for (const ev of active) if (s >= ev.start && s <= ev.end) addEventAt(ev, s, acc);
    const w = WANDER_MV * respSin(s, g.hrv);
    let fx = 0;
    if (fw && s >= fw.start && s <= fw.end) {
      for (let i = 0; i < fw.f.length; i++) fx += (fw.a[i] as number) * Math.sin(2 * Math.PI * (fw.f[i] as number) * s + (fw.ph[i] as number));
    }
    let x = (acc[0] as number) + w * WANDER_DIR[0] + fx * FWAVE_DIR[0];
    let y = (acc[1] as number) + w * WANDER_DIR[1] + fx * FWAVE_DIR[1];
    let z = (acc[2] as number) + w * WANDER_DIR[2] + fx * FWAVE_DIR[2];
    if (sdv > 0) {
      x += sdv * tableNormal(g.noise);
      y += sdv * tableNormal(g.noise);
      z += sdv * tableNormal(g.noise);
    }
    sink(n, x, y, z);
  }
}
```

- [x] **Step 4: Run to see it pass**

Run: `pnpm --filter @pme/engine-core exec vitest run test/l2/ecg/generator`
Expected: PASS, 4 tests.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core
git commit -m "feat(ecg): 500 Hz VCG generator with f-waves, respiratory wander and table noise" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: L3 ECG filters (Monitor 0.5–40 Hz + 50 Hz notch, Diagnostic 0.05–150 Hz)

**Files:**
- Create: `packages/engine-core/src/l3/ecg-filter.ts`, `packages/engine-core/test/l3/ecg-filter.test.ts`

**Interfaces:**
- Consumes: `EcgFilterMode` (Task 2).
- Produces: `interface Biquad { b0; b1; b2; a1; a2 }`, `NOTCH_Q = 8`, `lowpass(f0, fs, q?)`, `highpass(f0, fs, q?)`, `notch(f0, fs, q?)`, `FILTER_BANDS`, `designEcgFilter(mode, fs, mainsHz = 50): Biquad[]`, `createFilterState(sections): number[]`, `filterSample(sections, state, x): number`, `magnitudeAt(sections, f, fs): number`, `toDb(m)`.

The design function (RBJ cookbook, bilinear with pre-warping) is the documented design; coefficients are computed at start-up. For reference, at fs = 500 Hz the monitor high-pass (0.5 Hz, Q = 1/√2) has b = [0.995567, −1.991134, 0.995567], a1 = −1.991114, a2 = 0.991154 (values to 6 d.p.; the test checks responses, not these digits).

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l3/ecg-filter.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { createFilterState, designEcgFilter, filterSample, magnitudeAt, toDb } from '../../src/l3/ecg-filter.ts';

const FS = 500;

describe('l3/ecg-filter', () => {
  it('monitor mode: −3 dB (±0.5) at 0.5 and 40 Hz, flat (±0.5 dB) at 5–20 Hz, ≥40 dB down at 50 Hz', () => {
    const f = designEcgFilter('monitor', FS, 50);
    expect(toDb(magnitudeAt(f, 0.5, FS))).toBeCloseTo(-3, 0);
    expect(Math.abs(toDb(magnitudeAt(f, 0.5, FS)) + 3.01)).toBeLessThan(0.5);
    expect(Math.abs(toDb(magnitudeAt(f, 40, FS)) + 3.01)).toBeLessThan(0.5);
    for (const hz of [5, 10, 15, 20]) expect(Math.abs(toDb(magnitudeAt(f, hz, FS)))).toBeLessThan(0.5);
    expect(toDb(magnitudeAt(f, 50, FS))).toBeLessThan(-40);
  });

  it('60 Hz mains moves the notch', () => {
    const f = designEcgFilter('monitor', FS, 60);
    expect(toDb(magnitudeAt(f, 60, FS))).toBeLessThan(-40);
    expect(toDb(magnitudeAt(f, 50, FS))).toBeGreaterThan(-15);
  });

  it('diagnostic mode: −3 dB (±0.5) at 0.05 and 150 Hz, flat at 1–40 Hz, no notch', () => {
    const f = designEcgFilter('diagnostic', FS);
    expect(Math.abs(toDb(magnitudeAt(f, 0.05, FS)) + 3.01)).toBeLessThan(0.5);
    expect(Math.abs(toDb(magnitudeAt(f, 150, FS)) + 3.01)).toBeLessThan(0.5);
    for (const hz of [1, 10, 40]) expect(Math.abs(toDb(magnitudeAt(f, hz, FS)))).toBeLessThan(0.5);
    expect(toDb(magnitudeAt(f, 50, FS))).toBeGreaterThan(-1);
  });

  it('time-domain filtering matches the magnitude response for a 10 Hz sine', () => {
    const f = designEcgFilter('monitor', FS);
    const st = createFilterState(f);
    let peak = 0;
    for (let n = 0; n < 20 * FS; n++) {
      const y = filterSample(f, st, Math.sin((2 * Math.PI * 10 * n) / FS));
      if (n > 15 * FS) peak = Math.max(peak, Math.abs(y));
    }
    expect(peak).toBeCloseTo(magnitudeAt(f, 10, FS), 2);
  });

  it('removes a DC offset (high-pass) in monitor mode', () => {
    const f = designEcgFilter('monitor', FS);
    const st = createFilterState(f);
    let y = 0;
    for (let n = 0; n < 10 * FS; n++) y = filterSample(f, st, 1);
    expect(Math.abs(y)).toBeLessThan(1e-3);
  });
});
```

- [x] **Step 2: Run to see it fail**

Run: `pnpm --filter @pme/engine-core exec vitest run test/l3/ecg-filter`
Expected: FAIL — cannot load `ecg-filter.ts`.

- [x] **Step 3: Implement**

`packages/engine-core/src/l3/ecg-filter.ts`:
```ts
// Monitor ECG filters (brief §4.1 "Measurement chain"; research 03 §1.11, Philips MP2 datasheet):
//   Monitor    0.5–40 Hz  + automatic mains notch (50 Hz default, brief §5 / Ali's decision)
//   Diagnostic 0.05–150 Hz, no notch
// Design function: 2nd-order sections from R. Bristow-Johnson, "Cookbook formulae for audio EQ biquad
// filter coefficients" (bilinear transform with frequency pre-warping, so each Butterworth section is
// exactly −3.01 dB at its corner). Band-pass = Butterworth high-pass (Q = 1/√2) cascaded with a
// Butterworth low-pass (Q = 1/√2). Notch Q = 8 (≈6 Hz wide at 50 Hz) [ENG]. Transposed direct form II.
import type { EcgFilterMode } from '../types.ts';

/** Normalised biquad (a0 = 1): y = b0·x + b1·x₋₁ + b2·x₋₂ − a1·y₋₁ − a2·y₋₂. */
export interface Biquad {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

const BUTTERWORTH_Q = Math.SQRT1_2;
export const NOTCH_Q = 8;

function rbj(kind: 'lp' | 'hp' | 'notch', f0: number, fs: number, q: number): Biquad {
  const w0 = (2 * Math.PI * f0) / fs;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * q);
  const a0 = 1 + alpha;
  let b0: number;
  let b1: number;
  let b2: number;
  if (kind === 'lp') {
    b0 = (1 - cos) / 2;
    b1 = 1 - cos;
    b2 = (1 - cos) / 2;
  } else if (kind === 'hp') {
    b0 = (1 + cos) / 2;
    b1 = -(1 + cos);
    b2 = (1 + cos) / 2;
  } else {
    b0 = 1;
    b1 = -2 * cos;
    b2 = 1;
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: (-2 * cos) / a0, a2: (1 - alpha) / a0 };
}

export const lowpass = (f0: number, fs: number, q = BUTTERWORTH_Q): Biquad => rbj('lp', f0, fs, q);
export const highpass = (f0: number, fs: number, q = BUTTERWORTH_Q): Biquad => rbj('hp', f0, fs, q);
export const notch = (f0: number, fs: number, q = NOTCH_Q): Biquad => rbj('notch', f0, fs, q);

export const FILTER_BANDS: Readonly<Record<EcgFilterMode, readonly [number, number]>> = {
  monitor: [0.5, 40],
  diagnostic: [0.05, 150],
};

/** The section cascade for a mode at sample rate fs. */
export function designEcgFilter(mode: EcgFilterMode, fs: number, mainsHz: 50 | 60 = 50): Biquad[] {
  const [lo, hi] = FILTER_BANDS[mode];
  const sections = [highpass(lo, fs), lowpass(hi, fs)];
  if (mode === 'monitor') sections.push(notch(mainsHz, fs));
  return sections;
}

/** Plain-data filter state: two delay values per section. */
export function createFilterState(sections: readonly Biquad[]): number[] {
  return new Array<number>(sections.length * 2).fill(0);
}

/** Filter one sample through the cascade, updating `state` in place. */
export function filterSample(sections: readonly Biquad[], state: number[], x: number): number {
  let v = x;
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i] as Biquad;
    const z1 = state[2 * i] as number;
    const z2 = state[2 * i + 1] as number;
    const y = s.b0 * v + z1;
    state[2 * i] = s.b1 * v - s.a1 * y + z2;
    state[2 * i + 1] = s.b2 * v - s.a2 * y;
    v = y;
  }
  return v;
}

/** |H(e^{jω})| of the cascade at frequency f (Hz). */
export function magnitudeAt(sections: readonly Biquad[], f: number, fs: number): number {
  const w = (2 * Math.PI * f) / fs;
  const c1 = Math.cos(w);
  const s1 = Math.sin(w);
  const c2 = Math.cos(2 * w);
  const s2 = Math.sin(2 * w);
  let mag = 1;
  for (const s of sections) {
    const nr = s.b0 + s.b1 * c1 + s.b2 * c2;
    const ni = -(s.b1 * s1 + s.b2 * s2);
    const dr = 1 + s.a1 * c1 + s.a2 * c2;
    const di = -(s.a1 * s1 + s.a2 * s2);
    mag *= Math.hypot(nr, ni) / Math.hypot(dr, di);
  }
  return mag;
}

export const toDb = (m: number): number => 20 * Math.log10(m);
```

- [x] **Step 4: Run to see it pass**

Run: `pnpm --filter @pme/engine-core exec vitest run test/l3/ecg-filter`
Expected: PASS, 5 tests.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core
git commit -m "feat(l3): monitor and diagnostic ECG filters with mains notch (RBJ biquads)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: QRS detector on the displayed lead

**Files:**
- Create: `packages/engine-core/src/l3/qrs.ts`, `packages/engine-core/test/helpers/ecg.ts`, `packages/engine-core/test/l3/qrs.test.ts`

**Interfaces:**
- Consumes: Tasks 3–5, 9, 10.
- Produces: `QRS_RATE = 500`, `SPK_FLOOR = 2e-4`, `interface QrsState` (plain data), `createQrsState(startIndex: number)`, `qrsStep(st, x): number` (absolute index of a newly detected R, or −1; must be fed every sample starting at `startIndex`). Helper `detectOn(id, hr, seconds, opts)` and `score(result, seconds)`.

- [x] **Step 1: Write the helper and the failing test**

`packages/engine-core/test/helpers/ecg.ts`:
```ts
// Test helper: synthesise the displayed lead II for a rhythm and run the QRS detector on it.
import { defaultModifiers } from '../../src/modifiers.ts';
import { createRngState } from '../../src/rng/sfc32.ts';
import { drawHrvPhase } from '../../src/l2/ecg/hrv.ts';
import { createRhythmState, planUntil } from '../../src/l2/ecg/rhythm-engine.ts';
import { generateVcg } from '../../src/l2/ecg/generator.ts';
import { projectLead } from '../../src/l2/ecg/vcg.ts';
import { createFilterState, designEcgFilter, filterSample } from '../../src/l3/ecg-filter.ts';
import { createQrsState, qrsStep } from '../../src/l3/qrs.ts';
import type { EcgFilterMode, Modifiers, RhythmId, RhythmOpts } from '../../src/types.ts';

export interface DetectResult {
  beats: number[]; // true R times (beat.t), s
  detections: number[]; // detected R times, s
  latencies: number[]; // detection time − detected R time, s
}

export function detectOn(
  id: RhythmId,
  hr: number,
  seconds: number,
  opts: { mods?: Partial<Modifiers>; rhythmOpts?: RhythmOpts; mode?: EcgFilterMode; seed?: number } = {},
): DetectResult {
  const rng = createRngState(opts.seed ?? 7);
  const mods = { ...defaultModifiers(), ...opts.mods };
  const ctx = { hrAt: () => hr, mods, rng, hrv: drawHrvPhase(rng.hrv) };
  const st = createRhythmState(id, opts.rhythmOpts ?? {}, 0, ctx);
  planUntil(st, seconds + 1, ctx);
  const f = designEcgFilter(opts.mode ?? 'monitor', 500);
  const fs = createFilterState(f);
  const q = createQrsState(0);
  const detections: number[] = [];
  const latencies: number[] = [];
  generateVcg(
    { events: st.events, fwave: st.fwave, hrv: ctx.hrv, noiseLevel: mods.artefact.noise, noise: rng.noise },
    0,
    seconds * 500,
    (n, x, y, z) => {
      const r = qrsStep(q, filterSample(f, fs, projectLead('ecgII', x, y, z)));
      if (r >= 0) {
        detections.push(r / 500);
        latencies.push((n - r) / 500);
      }
    },
  );
  const beats = st.records.filter((r) => r.type === 'beat').map((b) => (b as { t: number }).t);
  return { beats, detections, latencies };
}

/** Match detections to beats within ±60 ms, ignoring the first 2.2 s (learning) and the last 0.3 s. */
export function score(r: DetectResult, seconds: number) {
  const inRange = (t: number) => t > 2.2 && t < seconds - 0.3;
  const beats = r.beats.filter(inRange);
  const dets = r.detections.filter(inRange);
  const errors: number[] = [];
  for (const b of beats) {
    const d = dets.find((x) => Math.abs(x - b) < 0.06);
    if (d !== undefined) errors.push(d - b);
  }
  return { beats: beats.length, tp: errors.length, fp: dets.length - errors.length, errors };
}
```

`packages/engine-core/test/l3/qrs.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { detectOn, score } from '../helpers/ecg.ts';
import type { RhythmId, RhythmOpts } from '../../src/types.ts';

const CASES: Array<[RhythmId, number, RhythmOpts?]> = [
  ['sinus', 60],
  ['sinus', 150],
  ['sinusBrady', 40],
  ['sinusTachy', 200],
  ['afib', 100],
  ['afib', 150],
  ['aflutter', 150, { ratio: 2 }],
  ['aflutter', 75, { ratio: 4 }],
  ['svtAvnrt', 220],
  ['vtMono', 170],
  ['vtMono', 240],
  ['avb3Narrow', 45],
  ['avb3Wide', 32],
  ['avb2Mobitz1', 75],
];

describe('l3/qrs detector on the displayed lead II (monitor filter)', () => {
  for (const [id, hr, ro] of CASES) {
    it(`${id} @ ${hr}: every QRS found, no false detections, R located within 10 ms`, () => {
      const r = detectOn(id, hr, 90, { rhythmOpts: ro ?? {} });
      const s = score(r, 90);
      expect(s.beats).toBeGreaterThan(20);
      expect(s.tp).toBe(s.beats);
      expect(s.fp).toBe(0);
      for (const e of s.errors) expect(Math.abs(e)).toBeLessThanOrEqual(0.01);
    });
  }

  it('PVC bigeminy and random PVCs are all counted', () => {
    for (const pvc of [{ pattern: 'bigeminy', probability: 0 }, { pattern: 'single', probability: 0.3 }] as const) {
      const s = score(detectOn('sinus', 75, 90, { mods: { pvc } }), 90);
      expect(s.tp).toBe(s.beats);
      expect(s.fp).toBe(0);
    }
  });

  it('works in diagnostic mode too', () => {
    const s = score(detectOn('sinus', 75, 60, { mode: 'diagnostic' }), 60);
    expect(s.tp).toBe(s.beats);
    expect(s.fp).toBe(0);
  });

  it('asystole: no detections in 2 minutes of noise and wander', () => {
    expect(detectOn('asystole', 0, 120).detections).toHaveLength(0);
  });

  it('narrow-complex detections arrive ≤ 120 ms after the R (the look-ahead is 100 ms; tones need R + 40 ms)', () => {
    const r = detectOn('sinus', 75, 60);
    const late = r.latencies.slice(3);
    expect(Math.max(...late)).toBeLessThanOrEqual(0.12);
  });
});
```

- [x] **Step 2: Run to see it fail**

Run: `pnpm --filter @pme/engine-core exec vitest run test/l3/qrs`
Expected: FAIL — cannot load `qrs.ts`.

- [x] **Step 3: Implement**

`packages/engine-core/src/l3/qrs.ts`:
```ts
// QRS detector on the DISPLAYED (monitor-filtered) lead (brief §4.1: it never reads the truth list).
// Pan–Tompkins-like, written from the published description (Pan & Tompkins, IEEE TBME 1985):
//   band-pass 5–15 Hz → 5-point derivative → square → 80 ms moving-window integral (MWI)
//   → adaptive threshold THR = NPK + 0.25·(SPK − NPK) with 200 ms refractory.
// A detection is a "hump" of the MWI above THR; it is finalised when the MWI falls below 60% of its hump
// maximum, and the R time is the largest |deflection| of the displayed lead inside the hump window.
// A hump within 600 ms of the last R and under half its size is classed as a T wave.
// All state is plain data (arrays and numbers) so the engine can clone and snapshot it.
import { createFilterState, filterSample, highpass, lowpass, type Biquad } from './ecg-filter.ts';

export const QRS_RATE = 500;
const MWI_N = 40; // 80 ms at 500 Hz
const HIST_N = 128; // displayed-lead history for R localisation (256 ms)
const REFRACTORY_N = 100; // 200 ms
const LEARN_N = 1000; // 2 s learning period
const LOOKBACK_N = 40; // R search starts 80 ms before the hump starts
const HUMP_MAX_N = 100; // a hump longer than 200 ms is closed anyway
const SILENCE_DECAY_N = 750; // after 1.5 s without a QRS, SPK halves each further 1.5 s (search-back stand-in) [ENG]
const T_WINDOW_N = 300; // humps within 600 ms of the last R ... [ENG, after Pan–Tompkins' 360 ms T-wave rule]
const T_RATIO = 0.5; // ... and below half the last QRS hump are T waves, not QRS
const FINAL_FRACTION = 0.6; // a hump is closed when the MWI falls below 60% of its maximum [ENG, latency]
/** Absolute floor for SPK in (mV/sample)² units, far above the MWI of 0.025 mV noise [ENG, see Task 14]. */
export const SPK_FLOOR = 2e-4;

const BP: readonly Biquad[] = [highpass(5, QRS_RATE), lowpass(15, QRS_RATE)];

export interface QrsState {
  bp: number[];
  d: number[]; // last 4 band-passed values (for the 5-point derivative)
  mwiBuf: number[];
  mwiSum: number;
  hist: number[]; // displayed-lead values, ring of HIST_N
  n: number; // absolute index of the NEXT sample
  learnMax: number;
  learnSum: number;
  spk: number;
  npk: number;
  prevMwi: number;
  prevPrevMwi: number;
  inHump: boolean;
  humpStart: number;
  humpMax: number;
  lastR: number; // absolute index of the last detected R, or -1
  lastDetN: number; // absolute index where the last detection was finalised
  lastQrsMax: number; // MWI hump maximum of the last detected QRS
}

export function createQrsState(startIndex: number): QrsState {
  return {
    bp: createFilterState(BP),
    d: [0, 0, 0, 0],
    mwiBuf: new Array<number>(MWI_N).fill(0),
    mwiSum: 0,
    hist: new Array<number>(HIST_N).fill(0),
    n: startIndex,
    learnMax: 0,
    learnSum: 0,
    spk: 0,
    npk: 0,
    prevMwi: 0,
    prevPrevMwi: 0,
    inHump: false,
    humpStart: 0,
    humpMax: 0,
    lastR: -1,
    lastDetN: -1,
    lastQrsMax: 0,
  };
}

function findR(st: QrsState, from: number, to: number): number {
  // R = the largest |x − window mean| inside the hump window (robust to a sloping baseline or an
  // overlapping T wave at high rates) [ENG].
  const lo = Math.max(from, st.n - HIST_N + 1);
  let mean = 0;
  for (let i = lo; i <= to; i++) mean += st.hist[i % HIST_N] as number;
  mean /= to - lo + 1;
  let best = lo;
  let bestAbs = -1;
  for (let i = lo; i <= to; i++) {
    const a = Math.abs((st.hist[i % HIST_N] as number) - mean);
    if (a > bestAbs) {
      bestAbs = a;
      best = i;
    }
  }
  return best;
}

/**
 * Feed one displayed-lead sample (mV). Returns the absolute sample index of a newly detected R peak,
 * or -1. Detections are reported ~60–110 ms after the R peak.
 */
export function qrsStep(st: QrsState, x: number): number {
  const n = st.n;
  st.hist[n % HIST_N] = x;
  const b = filterSample(BP, st.bp, x);
  const d = st.d;
  const deriv = (2 * b + (d[0] as number) - (d[2] as number) - 2 * (d[3] as number)) / 8;
  d[3] = d[2] as number;
  d[2] = d[1] as number;
  d[1] = d[0] as number;
  d[0] = b;
  const e = deriv * deriv;
  const slot = n % MWI_N;
  st.mwiSum += e - (st.mwiBuf[slot] as number);
  st.mwiBuf[slot] = e;
  const mwi = Math.max(0, st.mwiSum / MWI_N);
  st.n = n + 1;

  if (n < LEARN_N) {
    // Learning phase (Pan–Tompkins): SPK = 1/3 of the max, NPK = 1/2 of the mean.
    st.learnMax = Math.max(st.learnMax, mwi);
    st.learnSum += mwi;
    if (n === LEARN_N - 1) {
      st.spk = Math.max(SPK_FLOOR, st.learnMax / 3);
      st.npk = st.learnSum / LEARN_N / 2;
    }
    st.prevPrevMwi = st.prevMwi;
    st.prevMwi = mwi;
    return -1;
  }

  // Search-back stand-in: lower SPK during long silences so a smaller rhythm is re-acquired.
  const since = n - (st.lastDetN < 0 ? LEARN_N : st.lastDetN);
  if (since > 0 && since % SILENCE_DECAY_N === 0) st.spk = Math.max(SPK_FLOOR, st.spk / 2);

  const thr = st.npk + 0.25 * (st.spk - st.npk);
  let detected = -1;
  if (!st.inHump) {
    if (mwi > thr && (st.lastR < 0 || n - st.lastR > REFRACTORY_N)) {
      st.inHump = true;
      st.humpStart = n;
      st.humpMax = mwi;
    } else if (st.prevMwi > mwi && st.prevMwi >= st.prevPrevMwi) {
      st.npk = 0.125 * st.prevMwi + 0.875 * st.npk; // a noise peak
    }
  } else {
    st.humpMax = Math.max(st.humpMax, mwi);
    if (mwi < FINAL_FRACTION * st.humpMax || n - st.humpStart > HUMP_MAX_N) {
      st.inHump = false;
      const tWave = st.lastR >= 0 && st.humpStart - st.lastR < T_WINDOW_N && st.humpMax < T_RATIO * st.lastQrsMax;
      if (tWave) {
        st.npk = 0.125 * st.humpMax + 0.875 * st.npk;
      } else {
        const r = findR(st, st.humpStart - LOOKBACK_N, n);
        st.spk = Math.max(SPK_FLOOR, 0.125 * st.humpMax + 0.875 * st.spk);
        st.lastR = r;
        st.lastDetN = n;
        st.lastQrsMax = st.humpMax;
        detected = r;
      }
    }
  }
  st.prevPrevMwi = st.prevMwi;
  st.prevMwi = mwi;
  return detected;
}
```

- [x] **Step 4: Run to see it pass**

Run: `pnpm --filter @pme/engine-core exec vitest run test/l3/qrs`
Expected: PASS, 18 tests (14 rhythm cases + PVCs + diagnostic + asystole + latency). If a wide-complex case reports false positives, check `findR` uses the window MEAN as baseline (a sloping discordant T otherwise wins).

- [x] **Step 5: Commit**

```bash
git add packages/engine-core
git commit -m "feat(l3): Pan–Tompkins-like QRS detector on the displayed lead" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: HR averaging (last 12 RR, drop max and min, ≤ 1 Hz)

**Files:**
- Create: `packages/engine-core/src/l3/hr.ts`, `packages/engine-core/test/l3/hr.test.ts`

**Interfaces:**
- Consumes: `Measured` (Task 2).
- Produces: `type HrMethod = 'dropMaxMin'|'mean12'`, `HR_WINDOW = 12`, `interface HrState { method; rrs; lastR }`, `createHrState(method = 'dropMaxMin')`, `hrOnQrs(st, tR)`, `hrMeasure(st, t): Measured`. The engine calls `hrMeasure` exactly at whole sim seconds, so updates are ≤ 1 Hz by construction.

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l3/hr.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { createHrState, hrMeasure, hrOnQrs } from '../../src/l3/hr.ts';

function feed(rrs: number[], method: 'dropMaxMin' | 'mean12' = 'dropMaxMin') {
  const st = createHrState(method);
  let t = 10;
  hrOnQrs(st, t);
  for (const rr of rrs) hrOnQrs(st, (t += rr));
  return { st, t };
}

describe('l3/hr', () => {
  it('is invalid until two RR intervals exist', () => {
    const st = createHrState();
    expect(hrMeasure(st, 1).flag).toBe('invalid');
    hrOnQrs(st, 1);
    hrOnQrs(st, 2);
    expect(hrMeasure(st, 2.1).value).toBeNull();
    hrOnQrs(st, 3);
    expect(hrMeasure(st, 3.1)).toEqual({ value: 60, flag: 'valid', at: 3.1 });
  });

  it('drops one max and one min from the last 12 RR (IEC-style)', () => {
    const { st, t } = feed([...Array(10).fill(0.75), 0.3, 1.5]);
    expect(hrMeasure(st, t).value).toBe(80); // 0.3 and 1.5 dropped
    const m = feed([...Array(10).fill(0.75), 0.3, 1.5], 'mean12');
    expect(m.st.rrs).toHaveLength(12);
    expect(hrMeasure(m.st, m.t).value).toBe(Math.round(60 / ((10 * 0.75 + 0.3 + 1.5) / 12)));
  });

  it('keeps only the last 12 RR', () => {
    const { st } = feed([...Array(20).fill(1), ...Array(12).fill(0.5)]);
    expect(st.rrs).toEqual(Array(12).fill(0.5));
  });

  it('uses the last 4 RR when the last 3 are all > 1.2 s', () => {
    const { st, t } = feed([...Array(9).fill(0.75), 1.3, 1.4, 1.5]);
    expect(hrMeasure(st, t).value).toBe(Math.round(60 / ((0.75 + 1.3 + 1.4 + 1.5) / 4)));
  });

  it('reads 0 after 4 s without a QRS; ignores RR < 200 ms', () => {
    const { st, t } = feed(Array(12).fill(1));
    expect(hrMeasure(st, t + 3.9).value).toBe(60);
    expect(hrMeasure(st, t + 4.0).value).toBe(0);
    hrOnQrs(st, t + 0.1);
    expect(st.rrs).toHaveLength(12);
  });
});
```

- [x] **Step 2: Run to see it fail**

Run: `pnpm --filter @pme/engine-core exec vitest run test/l3/hr`
Expected: FAIL — cannot load `hr.ts`.

- [x] **Step 3: Implement**

`packages/engine-core/src/l3/hr.ts`:
```ts
// Device heart rate (brief §6.1 "HR"; research 03 §1.12):
//   average the last 12 RR, dropping the max and the min (IEC-style; the Philips-like skin uses the plain
//   mean of 12); if the last 3 RR are all > 1200 ms use the last 4; update at most once per second.
// Asystole: with no QRS for 4.0 s (Philips adult asystole delay, brief §6.4) the HR reads 0.
// The "up to 8 RR during PVC runs" rule needs arrhythmia classification and arrives in Stage 4.
import type { Measured } from '../types.ts';

export type HrMethod = 'dropMaxMin' | 'mean12';

export const HR_WINDOW = 12;
const SLOW_RR_S = 1.2;
const ASYSTOLE_S = 4.0;
const MIN_RR_S = 0.2; // shorter intervals are double counts and are ignored

export interface HrState {
  method: HrMethod;
  rrs: number[]; // seconds, oldest first, at most HR_WINDOW
  lastR: number; // sim seconds of the last detected R, or -1
}

export function createHrState(method: HrMethod = 'dropMaxMin'): HrState {
  return { method, rrs: [], lastR: -1 };
}

/** Feed one detected R time (sim seconds). */
export function hrOnQrs(st: HrState, tR: number): void {
  if (st.lastR >= 0) {
    const rr = tR - st.lastR;
    if (rr < MIN_RR_S) return;
    st.rrs.push(rr);
    if (st.rrs.length > HR_WINDOW) st.rrs.shift();
  }
  st.lastR = tR;
}

/** The HR numeric at time t (call once per second). */
export function hrMeasure(st: HrState, t: number): Measured {
  if (st.lastR >= 0 && t - st.lastR >= ASYSTOLE_S) return { value: 0, flag: 'valid', at: t };
  const rrs = st.rrs;
  if (rrs.length < 2) return { value: null, flag: 'invalid', at: t };
  const last3 = rrs.slice(-3);
  let sel: number[];
  if (last3.length === 3 && last3.every((rr) => rr > SLOW_RR_S)) sel = rrs.slice(-4);
  else if (st.method === 'dropMaxMin' && rrs.length >= 4) {
    const sorted = [...rrs].sort((a, b) => a - b);
    sel = sorted.slice(1, -1);
  } else sel = rrs;
  const mean = sel.reduce((a, b) => a + b, 0) / sel.length;
  return { value: Math.round(60 / mean), flag: 'valid', at: t };
}
```

- [x] **Step 4: Run to see it pass**

Run: `pnpm --filter @pme/engine-core exec vitest run test/l3/hr`
Expected: PASS, 5 tests.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core
git commit -m "feat(l3): IEC-style 12-RR HR averaging with slow-rate and asystole rules" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13: The engine — ticks, look-ahead, buffers, events

**Files:**
- Create: `packages/engine-core/src/engine.ts`, `packages/engine-core/test/engine/engine-pipeline.test.ts`
- Modify: `packages/engine-core/src/index.ts`

**Interfaces:**
- Consumes: everything in Tasks 1–12; `Clock`, `TICK_MS` (Stage 0).
- Produces: `createEngine(opts?: EngineOptions): MonitorEngine` (all Stage 1 members, see Task 2), `SAMPLES_PER_TICK = 10`, `BUFFER_SECONDS = 120`, `BEEP_DELAY_S = 0.04`, `QRS_TONE_HZ = 880`. Behaviour contract used by the renderer and audio:
  - After construction, samples 0…50 exist (`latestSampleIndex('ecgII') === 50`).
  - `advanceTo(t)` runs ticks up to `floor(t·50)`; only the LAST tick of a call runs the look-ahead (bulk catch-up is cheap: 24 h of sim in ≈ 15 s).
  - `beat`/`atrial`/`measurement` events are emitted when their `t ≤ simT` (never ahead); `tone` events are emitted ahead of time from the look-ahead pass, strictly increasing in `t`; an accepted command emits `{ type:'toneCancel', after: simT }` in the tick it is applied.
  - `readSamples('ecgII'|…)` returns MONITOR-FILTERED lane leads; `vcgX/Y/Z` are unfiltered truth.

- [x] **Step 1: Write the failing test (acceptance tests 4-filtered, 9, 10, 11 + tone timing)**

`packages/engine-core/test/engine/engine-pipeline.test.ts`:
```ts
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { Command, EngineEvent, MonitorEngine } from '../../src/types.ts';

function readAll(e: MonitorEngine, ch: 'ecgII' | 'ecgI' | 'ecgIII' | 'vcgX', from: number, to: number): Float32Array {
  const out = new Float32Array(to - from + 1);
  expect(e.readSamples(ch, from, out)).toBe(out.length);
  return out;
}

function cmd(c: Omit<Command, 'id' | 'issuedBy'> & Record<string, unknown>, id = 'c'): Command {
  return { id, issuedBy: 'test', ...c } as Command;
}

describe('engine pipeline', () => {
  it('fills the look-ahead at creation: latest index = 100 ms × 500 Hz', () => {
    const e = createEngine({ seed: 1 });
    expect(e.now()).toEqual({ tick: 0, simT: 0 });
    expect(e.latestSampleIndex('ecgII')).toBe(50);
    expect(e.latestSampleIndex('vcgX')).toBe(50);
    expect(e.sampleRate('ecgII')).toBe(500);
    expect(e.sampleRate('abp')).toBe(125);
    expect(e.sampleRate('co2')).toBe(62.5);
    expect(e.latestSampleIndex('abp')).toBe(-1);
  });

  it('acceptance 11: no drift — after advanceTo(86400) latestSampleIndex(ecgII) = 43,200,000 + 50', { timeout: 120_000 }, () => {
    const e = createEngine({ seed: 11 });
    e.advanceTo(86_400);
    expect(e.now().tick).toBe(4_320_000);
    expect(e.latestSampleIndex('ecgII')).toBe(43_200_000 + 50);
  });

  it('acceptance 10: determinism — same seed + same commands give an identical SHA-256 over 60 s of ecgII', () => {
    const script: Array<[number, Command]> = [
      [5, cmd({ type: 'setTarget', variable: 'hr', value: 110, ramp: { durationS: 10 } }, 'a')],
      [20, cmd({ type: 'setRhythm', rhythm: 'afib' }, 'b')],
      [35, cmd({ type: 'setModifiers', modifiers: { pvc: { pattern: 'bigeminy', probability: 0 } } }, 'c')],
      [45, cmd({ type: 'device', action: { device: 'ecg', action: 'filter', value: 'diagnostic' } }, 'd')],
    ];
    const hashRun = (seed: number) => {
      const e = createEngine({ seed });
      const h = createHash('sha256');
      let from = 0;
      for (let t = 0.5; t <= 60 + 1e-9; t += 0.5) {
        for (const [at, c] of script) if (Math.abs(at - t) < 1e-9) e.dispatch(c);
        e.advanceTo(t);
        const to = Math.round(t * 500);
        h.update(readAll(e, 'ecgII', from, to));
        from = to + 1;
      }
      return h.digest('hex');
    };
    expect(hashRun(42)).toBe(hashRun(42));
    expect(hashRun(42)).not.toBe(hashRun(43));
  });

  it('acceptance 4 (filtered lanes): with lanes I, II, III the displayed III − (II − I) < 1e-6 mV', () => {
    const e = createEngine({ seed: 4 });
    e.dispatch(cmd({ type: 'device', action: { device: 'ecg', action: 'lead', value: 'ecgI', lane: 0 } }));
    e.dispatch(cmd({ type: 'device', action: { device: 'ecg', action: 'lead', value: 'ecgII', lane: 1 } }));
    e.dispatch(cmd({ type: 'device', action: { device: 'ecg', action: 'lead', value: 'ecgIII', lane: 2 } }));
    e.advanceTo(12);
    const I = readAll(e, 'ecgI', 1000, 5999);
    const II = readAll(e, 'ecgII', 1000, 5999);
    const III = readAll(e, 'ecgIII', 1000, 5999);
    for (let i = 0; i < I.length; i++) expect(Math.abs(III[i]! - (II[i]! - I[i]!))).toBeLessThan(1e-6);
  });

  it('acceptance 9: HR step 80 → 120 reaches 118–122 within 5–11 s and updates at most once per second', () => {
    const e = createEngine({ seed: 9, patient: { baseline: { hr: 80 } } });
    e.dispatch(cmd({ type: 'setModifiers', modifiers: { hrvScale: 0 } }));
    const hr: Array<{ t: number; v: number | null }> = [];
    e.on((ev) => {
      if (ev.type === 'measurement' && ev.values.hr) hr.push({ t: ev.t, v: ev.values.hr.value });
    }, ['measurement']);
    e.advanceTo(30);
    expect(hr[hr.length - 1]!.v).toBe(80);
    e.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 120 }));
    const stepT = 30.02;
    e.advanceTo(60);
    const reached = hr.find((m) => m.t > stepT && m.v !== null && m.v >= 118 && m.v <= 122);
    expect(reached).toBeDefined();
    expect(reached!.t - stepT).toBeGreaterThanOrEqual(5);
    expect(reached!.t - stepT).toBeLessThanOrEqual(11);
    const times = hr.map((m) => m.t);
    for (let i = 1; i < times.length; i++) expect(times[i]! - times[i - 1]!).toBeGreaterThanOrEqual(1 - 1e-9);
  });

  it('emits beat, atrial and measurement events in time order, never ahead of sim time', () => {
    const e = createEngine({ seed: 2 });
    const seen: EngineEvent[] = [];
    e.on((ev) => {
      if (ev.type !== 'tone' && ev.type !== 'toneCancel') {
        expect(ev.t).toBeLessThanOrEqual(e.now().simT + 1e-9);
      }
      seen.push(ev);
    });
    e.advanceTo(10);
    const ts = seen.filter((x) => x.type === 'beat' || x.type === 'atrial').map((x) => (x as { t: number }).t);
    expect(ts.length).toBeGreaterThan(20);
    for (let i = 1; i < ts.length; i++) expect(ts[i]!).toBeGreaterThanOrEqual(ts[i - 1]!);
  });

  it('posts a QRS tone 20–60 ms after each true R, before the tone is due', () => {
    const e = createEngine({ seed: 3 });
    const beats: number[] = [];
    const tones: Array<{ t: number; postedAt: number }> = [];
    e.on((ev) => {
      if (ev.type === 'beat') beats.push(ev.t);
      if (ev.type === 'tone') tones.push({ t: ev.t, postedAt: e.now().simT });
    });
    for (let t = 0; t <= 30; t += 0.02) e.advanceTo(t); // real-time-like ticking, look-ahead on every tick
    const late = tones.filter((x) => x.t > 3);
    expect(late.length).toBeGreaterThan(30);
    for (const tone of late) {
      const r = beats.reduce((best, b) => (Math.abs(b - tone.t) < Math.abs(best - tone.t) ? b : best), -1e9);
      expect(tone.t - r).toBeGreaterThanOrEqual(0.02);
      expect(tone.t - r).toBeLessThanOrEqual(0.06);
      expect(tone.postedAt).toBeLessThan(tone.t);
    }
  });
});
```

- [x] **Step 2: Run to see it fail**

Run: `pnpm --filter @pme/engine-core exec vitest run test/engine`
Expected: FAIL — cannot load `../../src/engine.ts`.

- [x] **Step 3: Implement the engine**

`packages/engine-core/src/engine.ts`:
```ts
// The engine (brief §3.3 tick model, §7.1 API). One committed pipeline state advances with sim time;
// every tick a CLONE of it is run ahead by the look-ahead L (100 ms) to fill the ring buffers and to find
// QRS detections early enough to schedule beeps. A command changes the committed state, so the next
// look-ahead pass regenerates everything after "now" (look-ahead invalidation) and a toneCancel revokes
// tones already posted. All pipeline state is plain JSON-safe data (snapshot/restore, structuredClone).
import { Clock, TICK_MS } from './clock/clock.ts';
import { RingBuffer } from './buffers/ring.ts';
import { constantRamp, rampValue, retarget, type RampState } from './l1/ramp.ts';
import { ECG_RATE, generateVcg, pruneEvents } from './l2/ecg/generator.ts';
import { drawHrvPhase, type HrvPhase } from './l2/ecg/hrv.ts';
import { applyRhythm, createRhythmState, planUntil, type RhythmCtx, type RhythmState } from './l2/ecg/rhythm-engine.ts';
import { DEFAULT_FLUTTER_ATRIAL_BPM, RHYTHMS } from './l2/ecg/rhythms.ts';
import { projectLead } from './l2/ecg/vcg.ts';
import { createFilterState, designEcgFilter, filterSample, type Biquad } from './l3/ecg-filter.ts';
import { createHrState, hrMeasure, hrOnQrs, type HrState } from './l3/hr.ts';
import { createQrsState, qrsStep, type QrsState } from './l3/qrs.ts';
import { defaultModifiers } from './modifiers.ts';
import { createRngState, type Sfc32State, type StreamName } from './rng/sfc32.ts';
import {
  LEAD_IDS,
  type ChannelId,
  type Command,
  type DispatchResult,
  type EcgFilterMode,
  type EngineEvent,
  type EngineEventType,
  type EngineOptions,
  type LeadId,
  type Modifiers,
  type MonitorEngine,
  type PatientSnapshot,
  type RhythmId,
  type RhythmOpts,
  type SimSeconds,
} from './types.ts';
import { version } from './version.ts';

export const SAMPLES_PER_TICK = (ECG_RATE * TICK_MS) / 1000; // 10
export const BUFFER_SECONDS = 120; // brief §3.5
export const BEEP_DELAY_S = 0.04; // tone at detected R + 40 ms: "beep minus R is 20–60 ms" (BUILD-PLAN Stage 1) [ENG]
export const QRS_TONE_HZ = 880; // fixed pitch until SpO2 exists (brief §3.6; Stage 3 adds pitch(SpO2))
const PLAN_LEAD_S = 0.15; // plan rhythm events this far beyond the last generated sample (kernel lead-in)
const DEFAULT_LANES: LeadId[] = ['ecgII', 'V5'];

interface PipelineState {
  n: number; // next ECG sample index to generate
  rng: Record<StreamName, Sfc32State>;
  hr: RampState;
  mods: Modifiers;
  hrv: HrvPhase;
  rhythm: RhythmState;
  filterMode: EcgFilterMode;
  lanes: LeadId[];
  laneFilter: number[][];
  qrs: QrsState;
  hrm: HrState;
  out: EngineEvent[]; // measurement events waiting for their time
  detections: number[]; // R times (s) found during this pass
}

type Listener = { fn: (e: EngineEvent) => void; types: Set<EngineEventType> | null };

const ECG_CHANNELS = new Set<ChannelId>([...LEAD_IDS, 'vcgX', 'vcgY', 'vcgZ']);
const MOD_KEYS = new Set(['pvc', 'rsa', 'hrvScale', 'qtc', 'artefact']);

function rhythmCtx(ps: PipelineState): RhythmCtx {
  return { hrAt: (t) => rampValue(ps.hr, t), mods: ps.mods, rng: ps.rng, hrv: ps.hrv };
}

/** hr truth when a rhythm starts: RhythmOpts.rateBpm, else the rhythm default (flutter: atrial/ratio). */
function startRate(id: RhythmId, opts: RhythmOpts): number {
  if (opts.rateBpm !== undefined) return opts.rateBpm;
  if (id === 'aflutter') {
    const r = opts.ratio ?? 2;
    return (opts.atrialRateBpm ?? DEFAULT_FLUTTER_ATRIAL_BPM) / (r === 'variable' ? 3 : r);
  }
  return RHYTHMS[id].defaultRateBpm;
}

class Engine implements MonitorEngine {
  readonly version = version;
  private readonly seed: number;
  private readonly lookTicks: number;
  private readonly mainsHz: 50 | 60;
  private st: PipelineState;
  private tick = 0;
  private queue: Array<{ cmd: Command; tick: number }> = [];
  private readonly listeners = new Set<Listener>();
  private readonly bufs = new Map<ChannelId, RingBuffer>();
  private lastToneT = -1;
  private toneSeq = 0;
  private readonly clock = new Clock();
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastWall = 0;
  private readonly sections = new Map<EcgFilterMode, Biquad[]>();

  constructor(opts: EngineOptions) {
    if (opts.mode === 'modeled') throw new Error('MODELED mode arrives in Stage 7');
    this.seed = (opts.seed ?? 1) >>> 0;
    const look = opts.lookaheadS ?? 0.1;
    this.lookTicks = Math.round((look * 1000) / TICK_MS);
    if (this.lookTicks < 1 || Math.abs(this.lookTicks * TICK_MS - look * 1000) > 1e-6) {
      throw new RangeError(`lookaheadS must be a positive multiple of 0.020 s, got ${look}`);
    }
    this.mainsHz = opts.device?.mainsHz ?? 50;
    const rng = createRngState(this.seed);
    const rhythmId = opts.patient?.rhythm?.id ?? 'sinus';
    const rhythmOpts = opts.patient?.rhythm?.opts ?? {};
    const hr0 = opts.patient?.baseline?.hr ?? startRate(rhythmId, rhythmOpts);
    const lanes = [...DEFAULT_LANES];
    const hr = constantRamp(hr0);
    const mods = defaultModifiers();
    const hrv = drawHrvPhase(rng.hrv);
    const ctx: RhythmCtx = { hrAt: (t) => rampValue(hr, t), mods, rng, hrv };
    this.st = {
      n: 0,
      rng,
      hr,
      mods,
      hrv,
      rhythm: createRhythmState(rhythmId, rhythmOpts, 0, ctx),
      filterMode: 'monitor',
      lanes,
      laneFilter: lanes.map(() => createFilterState(this.filter('monitor'))),
      qrs: createQrsState(0),
      hrm: createHrState(),
      out: [],
      detections: [],
    };
    for (const ch of ['vcgX', 'vcgY', 'vcgZ', ...lanes] as ChannelId[]) this.bufs.set(ch, new RingBuffer(ECG_RATE, BUFFER_SECONDS));
    this.advance(this.st, 0);
    this.st.detections.length = 0;
    this.speculate();
  }

  // --- lifecycle -------------------------------------------------------------------------------
  start(): void {
    if (this.timer !== null) return;
    this.lastWall = performance.now();
    this.timer = setInterval(() => {
      const now = performance.now();
      const n = this.clock.advance(now - this.lastWall);
      this.lastWall = now;
      this.runTicks(n);
    }, TICK_MS);
  }
  pause(): void {
    this.clock.pause();
  }
  resume(): void {
    this.clock.resume();
    this.lastWall = performance.now();
  }
  setTimeScale(k: number): void {
    this.clock.timeScale = k; // throws RangeError outside 0.25–4
  }
  step(ticks = 1): void {
    if (this.timer !== null && !this.clock.paused) return;
    this.runTicks(Math.max(0, Math.floor(ticks)));
  }
  advanceTo(simT: SimSeconds): void {
    const target = Math.floor(simT * (1000 / TICK_MS) + 1e-6);
    this.runTicks(target - this.tick);
  }
  now(): { tick: number; simT: SimSeconds } {
    return { tick: this.tick, simT: (this.tick * TICK_MS) / 1000 };
  }

  // --- commands and events ---------------------------------------------------------------------
  dispatch(cmd: Command): DispatchResult {
    const reason = this.validate(cmd);
    const tick = Math.max(cmd.atTick ?? this.tick + 1, this.tick + 1);
    if (reason) return { accepted: false, tick: this.tick, reason };
    let i = this.queue.length;
    while (i > 0 && (this.queue[i - 1] as { tick: number }).tick > tick) i--;
    this.queue.splice(i, 0, { cmd, tick });
    return { accepted: true, tick };
  }

  on(fn: (e: EngineEvent) => void, types?: EngineEventType[]): () => void {
    const l: Listener = { fn, types: types ? new Set(types) : null };
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }

  // --- samples ---------------------------------------------------------------------------------
  readSamples(ch: ChannelId, fromIndex: number, out: Float32Array): number {
    return this.bufs.get(ch)?.read(fromIndex, out) ?? 0;
  }
  latestSampleIndex(ch: ChannelId): number {
    return this.bufs.get(ch)?.latest ?? -1;
  }
  sampleRate(ch: ChannelId): 500 | 125 | 62.5 {
    if (ECG_CHANNELS.has(ch)) return 500;
    return ch === 'co2' || ch === 'resp' ? 62.5 : 125;
  }

  // --- snapshot --------------------------------------------------------------------------------
  snapshot(): PatientSnapshot {
    return {
      schema: 'pme-snapshot/1',
      engineVersion: this.version,
      seed: this.seed,
      tick: this.tick,
      state: structuredClone({ st: this.st, queue: this.queue, toneSeq: this.toneSeq }),
    };
  }
  restore(s: PatientSnapshot): void {
    if (s.schema !== 'pme-snapshot/1') throw new Error(`unknown snapshot schema ${String(s.schema)}`);
    const data = structuredClone(s.state) as { st: PipelineState; queue: Array<{ cmd: Command; tick: number }>; toneSeq: number };
    this.st = data.st;
    this.queue = data.queue;
    this.toneSeq = data.toneSeq;
    this.tick = s.tick;
    this.syncLaneBuffers();
    const simT = this.now().simT;
    this.emit({ type: 'toneCancel', after: simT });
    this.lastToneT = simT;
    this.speculate();
  }

  // --- internals -------------------------------------------------------------------------------
  private filter(mode: EcgFilterMode): Biquad[] {
    let f = this.sections.get(mode);
    if (!f) {
      f = designEcgFilter(mode, ECG_RATE, this.mainsHz);
      this.sections.set(mode, f);
    }
    return f;
  }

  private runTicks(n: number): void {
    for (let i = 0; i < n; i++) this.tickOnce(i === n - 1);
  }

  private tickOnce(speculate: boolean): void {
    this.tick++;
    const simT = (this.tick * TICK_MS) / 1000;
    let changed = false;
    while (this.queue.length > 0 && (this.queue[0] as { tick: number }).tick <= this.tick) {
      this.apply((this.queue.shift() as { cmd: Command }).cmd, simT);
      changed = true;
    }
    this.advance(this.st, this.tick * SAMPLES_PER_TICK);
    this.st.detections.length = 0;
    this.flush(simT);
    if (changed) {
      this.emit({ type: 'toneCancel', after: simT });
      this.lastToneT = simT;
    }
    if (speculate) this.speculate();
  }

  /** Run a clone of the committed state L ahead: fills the look-ahead samples and posts QRS tones. */
  private speculate(): void {
    const spec = structuredClone(this.st);
    this.advance(spec, (this.tick + this.lookTicks) * SAMPLES_PER_TICK);
    for (const tR of spec.detections) {
      const t = tR + BEEP_DELAY_S;
      if (t <= this.lastToneT) continue;
      this.lastToneT = t;
      this.emit({ type: 'tone', t, id: `qrs-${++this.toneSeq}`, kind: 'qrs', freqHz: QRS_TONE_HZ });
    }
  }

  /** Generate samples up to and including absolute ECG index `end` for pipeline state `ps`. */
  private advance(ps: PipelineState, end: number): void {
    if (end < ps.n) return;
    const ctx = rhythmCtx(ps);
    planUntil(ps.rhythm, end / ECG_RATE + PLAN_LEAD_S, ctx);
    ps.rhythm.events = pruneEvents(ps.rhythm.events, ps.n / ECG_RATE);
    const sections = this.filter(ps.filterMode);
    const bx = this.bufs.get('vcgX') as RingBuffer;
    const by = this.bufs.get('vcgY') as RingBuffer;
    const bz = this.bufs.get('vcgZ') as RingBuffer;
    const laneBufs = ps.lanes.map((l) => this.bufs.get(l) as RingBuffer);
    generateVcg(
      { events: ps.rhythm.events, fwave: ps.rhythm.fwave, hrv: ps.hrv, noiseLevel: ps.mods.artefact.noise, noise: ps.rng.noise },
      ps.n,
      end,
      (n, x, y, z) => {
        bx.write(n, x);
        by.write(n, y);
        bz.write(n, z);
        for (let i = 0; i < ps.lanes.length; i++) {
          const v = filterSample(sections, ps.laneFilter[i] as number[], projectLead(ps.lanes[i] as LeadId, x, y, z));
          (laneBufs[i] as RingBuffer).write(n, v);
          if (i === 0) {
            const r = qrsStep(ps.qrs, v);
            if (r >= 0) {
              hrOnQrs(ps.hrm, r / ECG_RATE);
              ps.detections.push(r / ECG_RATE);
            }
          }
        }
        if (n > 0 && n % ECG_RATE === 0) {
          const t = n / ECG_RATE;
          ps.out.push({ type: 'measurement', t, values: { hr: hrMeasure(ps.hrm, t) } });
        }
      },
    );
    ps.n = end + 1;
  }

  /** Emit committed records whose time has come, in time order. */
  private flush(simT: number): void {
    const due: EngineEvent[] = [];
    const keep = (list: EngineEvent[]) =>
      list.filter((e) => {
        const t = (e as { t: number }).t;
        if (t <= simT) {
          due.push(e);
          return false;
        }
        return true;
      });
    this.st.rhythm.records = keep(this.st.rhythm.records);
    this.st.out = keep(this.st.out);
    due.sort((a, b) => (a as { t: number }).t - (b as { t: number }).t);
    for (const e of due) this.emit(e);
  }

  private emit(e: EngineEvent): void {
    for (const l of this.listeners) if (l.types === null || l.types.has(e.type)) l.fn(e);
  }

  private validate(cmd: Command): string | undefined {
    switch (cmd.type) {
      case 'setTarget':
        if (cmd.variable !== 'hr') return `setTarget ${cmd.variable} is not implemented until Stage 2`;
        if (!Number.isFinite(cmd.value) || cmd.value < 0 || cmd.value > 300) return 'hr must be 0–300 bpm';
        if (cmd.ramp && !(cmd.ramp.durationS >= 0)) return 'ramp.durationS must be ≥ 0';
        return undefined;
      case 'setRhythm':
        return cmd.rhythm in RHYTHMS ? undefined : `unknown rhythm ${String(cmd.rhythm)}`;
      case 'setModifiers': {
        const bad = Object.keys(cmd.modifiers).filter((k) => !MOD_KEYS.has(k));
        if (bad.length) return `modifiers not implemented until later stages: ${bad.join(', ')}`;
        const p = cmd.modifiers.pvc;
        if (p && !(p.pattern === 'single' || p.pattern === 'bigeminy')) return 'pvc.pattern must be single or bigeminy in Stage 1';
        if (p && !(p.probability >= 0 && p.probability <= 0.9)) return 'pvc.probability must be 0–0.9';
        return undefined;
      }
      case 'device': {
        const a = cmd.action;
        if (a.device !== 'ecg') return `device ${String(a.device)} is not implemented until later stages`;
        if (a.action === 'filter') return a.value === 'monitor' || a.value === 'diagnostic' ? undefined : 'filter must be monitor or diagnostic';
        if (a.action === 'lead') {
          if (!LEAD_IDS.includes(a.value as LeadId)) return 'lead must be a LeadId';
          return a.lane === 0 || a.lane === 1 || a.lane === 2 ? undefined : 'lane must be 0, 1 or 2';
        }
        return `ecg ${a.action} is not implemented until Stage 4`;
      }
      default:
        return `command type ${(cmd as { type: string }).type} is not implemented until later stages`;
    }
  }

  private apply(cmd: Command, simT: number): void {
    const ps = this.st;
    switch (cmd.type) {
      case 'setTarget':
        ps.hr = retarget(ps.hr, simT, cmd.value, cmd.ramp);
        return;
      case 'setRhythm': {
        const opts = cmd.opts ?? {};
        ps.hr = constantRamp(startRate(cmd.rhythm, opts));
        const respect = cmd.respectRefractory ?? true;
        if (cmd.when === 'nextBeat') ps.rhythm.pendingSwitch = { id: cmd.rhythm, opts, respectRefractory: respect };
        else applyRhythm(ps.rhythm, cmd.rhythm, opts, simT, respect, rhythmCtx(ps));
        return;
      }
      case 'setModifiers': {
        const m = cmd.modifiers;
        ps.mods = { ...ps.mods, ...m, artefact: { ...ps.mods.artefact, ...(m.artefact ?? {}) } };
        return;
      }
      case 'device': {
        const a = cmd.action;
        if (a.action === 'filter') {
          ps.filterMode = a.value as EcgFilterMode;
          ps.laneFilter = ps.lanes.map(() => createFilterState(this.filter(ps.filterMode)));
        } else if (a.action === 'lead') {
          const lane = Math.min(a.lane as number, ps.lanes.length);
          ps.lanes[lane] = a.value as LeadId;
          ps.laneFilter[lane] = createFilterState(this.filter(ps.filterMode));
          this.syncLaneBuffers();
        }
        return;
      }
    }
  }

  /** Make the lane buffers match the current lanes (new leads start empty). */
  private syncLaneBuffers(): void {
    const want = new Set<ChannelId>(this.st.lanes);
    for (const ch of [...this.bufs.keys()]) if (!ch.startsWith('vcg') && !want.has(ch)) this.bufs.delete(ch);
    for (const ch of want) if (!this.bufs.has(ch)) this.bufs.set(ch, new RingBuffer(ECG_RATE, BUFFER_SECONDS));
  }
}

export function createEngine(opts: EngineOptions = {}): MonitorEngine {
  return new Engine(opts);
}
```

`packages/engine-core/src/index.ts` (final Stage 1 version):
```ts
export { version } from './version.ts';
export * from './types.ts';
export * from './clock/clock.ts';
export * from './rng/sfc32.ts';
export { RingBuffer } from './buffers/ring.ts';
export { createEngine, BEEP_DELAY_S } from './engine.ts';
export { RHYTHMS, RHYTHM_IDS } from './l2/ecg/rhythms.ts';
export { defaultModifiers } from './modifiers.ts';
```

- [x] **Step 4: Run to see it pass**

Run: `pnpm --filter @pme/engine-core exec vitest run test/engine && pnpm --filter @pme/engine-core typecheck`
Expected: PASS, 7 tests (the 24 h test takes ≈ 15 s; its timeout is 120 s).

- [x] **Step 5: Commit**

```bash
git add packages/engine-core
git commit -m "feat(engine-core): createEngine with look-ahead pipeline, ring buffers and event stream" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 14: Engine commands, snapshot/restore and lifecycle — verification tests

**Files:**
- Create: `packages/engine-core/test/engine/engine-commands.test.ts`

**Interfaces:**
- Consumes: `createEngine` (Task 13).
- Produces: nothing new.

These tests cover `dispatch` validation, `setRhythm` (`now` / `nextBeat`), `setTarget hr` with `Ramp`, `setModifiers pvc`, `device ecg filter/lead`, `toneCancel`, `snapshot`/`restore` and `start`/`pause`/`setTimeScale`/`step`, all written in Task 13. Expect PASS; fix `engine.ts` if not.

- [x] **Step 1: Write the tests**

`packages/engine-core/test/engine/engine-commands.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { Command, EngineEvent } from '../../src/types.ts';

function cmd(c: Record<string, unknown>, id = 'c'): Command {
  return { id, issuedBy: 'test', ...c } as Command;
}

function collect(e: ReturnType<typeof createEngine>) {
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  return ev;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('engine commands', () => {
  it('dispatch accepts Stage 1 commands for the next tick and rejects the rest with a reason', () => {
    const e = createEngine();
    expect(e.dispatch(cmd({ type: 'setRhythm', rhythm: 'afib' }))).toEqual({ accepted: true, tick: 1 });
    expect(e.dispatch(cmd({ type: 'setTarget', variable: 'sbp', value: 90 })).accepted).toBe(false);
    expect(e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse' })).reason).toMatch(/unknown rhythm/);
    expect(e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'cpr', active: true } })).accepted).toBe(false);
    expect(e.dispatch(cmd({ type: 'device', action: { device: 'ecg', action: 'filter', value: 'surgical' } })).accepted).toBe(false);
    expect(e.dispatch(cmd({ type: 'setModifiers', modifiers: { bbb: 'lbbb' } })).accepted).toBe(false);
    expect(e.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 100, atTick: 50 })).tick).toBe(50);
  });

  it('setRhythm now: the new rhythm starts within one look-ahead window', () => {
    const e = createEngine({ seed: 5 });
    const ev = collect(e);
    e.advanceTo(10);
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vtMono' }));
    e.advanceTo(20);
    const firstVt = ev.find((x) => x.type === 'beat' && x.origin === 'ventricular') as { t: number } | undefined;
    expect(firstVt).toBeDefined();
    expect(firstVt!.t).toBeGreaterThan(10);
    expect(firstVt!.t).toBeLessThan(10.6);
    const after = ev.filter((x) => x.type === 'beat' && x.t > 11);
    expect(after.every((b) => b.type === 'beat' && b.origin === 'ventricular')).toBe(true);
  });

  it("setRhythm nextBeat: switches right after the next ventricular beat", () => {
    const e = createEngine({ seed: 5 });
    const ev = collect(e);
    e.advanceTo(10);
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'asystole', when: 'nextBeat' }));
    e.advanceTo(20);
    const beatsAfter = ev.filter((x) => x.type === 'beat' && x.t > 10.02);
    expect(beatsAfter.length).toBeGreaterThanOrEqual(1);
    expect(beatsAfter.length).toBeLessThanOrEqual(2); // already-planned beat(s) inside the planning window
  });

  it('setTarget hr with a 10 s linear ramp raises the rate gradually', () => {
    const e = createEngine({ seed: 6, patient: { baseline: { hr: 60 } } });
    e.dispatch(cmd({ type: 'setModifiers', modifiers: { hrvScale: 0 } }));
    const beats: number[] = [];
    e.on((x) => x.type === 'beat' && beats.push(x.t), ['beat']);
    e.advanceTo(10);
    e.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 120, ramp: { durationS: 10, curve: 'linear' } }));
    e.advanceTo(30);
    const rrAt = (t: number) => {
      const i = beats.findIndex((b) => b > t);
      return beats[i]! - beats[i - 1]!;
    };
    expect(rrAt(9)).toBeCloseTo(1, 3);
    expect(rrAt(15.2)).toBeGreaterThan(0.6);
    expect(rrAt(15.2)).toBeLessThan(0.85);
    expect(rrAt(25)).toBeCloseTo(0.5, 3);
  });

  it('an accepted command emits toneCancel at the command tick and tones are re-posted after it', () => {
    const e = createEngine({ seed: 7 });
    const ev = collect(e);
    for (let t = 0; t <= 5; t += 0.02) e.advanceTo(t);
    e.dispatch(cmd({ type: 'setModifiers', modifiers: { pvc: { pattern: 'bigeminy', probability: 0 } } }));
    e.advanceTo(5.02);
    const cancel = ev.find((x) => x.type === 'toneCancel');
    expect(cancel).toEqual({ type: 'toneCancel', after: 5.02 });
    for (let t = 5.04; t <= 10; t += 0.02) e.advanceTo(t);
    const tonesAfter = ev.filter((x) => x.type === 'tone' && x.t > 5.02);
    expect(tonesAfter.length).toBeGreaterThan(3);
  });

  it('filter and lead device actions change the displayed channels', () => {
    const e = createEngine({ seed: 8 });
    e.dispatch(cmd({ type: 'device', action: { device: 'ecg', action: 'lead', value: 'V1', lane: 1 } }));
    e.advanceTo(2);
    expect(e.latestSampleIndex('V1')).toBe(1050);
    expect(e.latestSampleIndex('V5')).toBe(-1);
  });

  it('snapshot → restore reproduces the same samples (engine state only) and is JSON-safe', () => {
    const e = createEngine({ seed: 9 });
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'afib' }));
    e.advanceTo(10);
    const snap = JSON.parse(JSON.stringify(e.snapshot()));
    e.advanceTo(20);
    const a = new Float32Array(5000);
    e.readSamples('ecgII', 5001, a);
    e.restore(snap);
    expect(e.now().tick).toBe(500);
    e.advanceTo(20);
    const b = new Float32Array(5000);
    e.readSamples('ecgII', 5001, b);
    expect(Array.from(b)).toEqual(Array.from(a));
  });

  it('start / pause / setTimeScale / step drive the internal wall-clock pump', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] });
    const e = createEngine();
    expect(() => e.setTimeScale(8)).toThrow(RangeError);
    e.start();
    vi.advanceTimersByTime(1000);
    expect(e.now().tick).toBeGreaterThanOrEqual(49);
    expect(e.now().tick).toBeLessThanOrEqual(50);
    e.setTimeScale(2);
    const t0 = e.now().tick;
    vi.advanceTimersByTime(1000);
    expect(e.now().tick - t0).toBeGreaterThanOrEqual(99);
    e.pause();
    const t1 = e.now().tick;
    vi.advanceTimersByTime(1000);
    expect(e.now().tick).toBe(t1);
    e.step(3);
    expect(e.now().tick).toBe(t1 + 3);
    e.resume();
    vi.advanceTimersByTime(100);
    expect(e.now().tick).toBeGreaterThan(t1 + 3);
  });
});
```

- [x] **Step 2: Prove one can fail**

Temporarily comment out the `this.emit({ type: 'toneCancel', after: simT });` line inside `tickOnce` in `engine.ts`, run `pnpm --filter @pme/engine-core exec vitest run test/engine/engine-commands`, expect the toneCancel test to FAIL, restore the line.

- [x] **Step 3: Run the whole package**

Run: `pnpm --filter @pme/engine-core test && pnpm --filter @pme/engine-core typecheck && pnpm --filter @pme/engine-core build`
Expected: `Test Files  18 passed (18)`, `Tests  98 passed (98)`; build `✓ built`.

- [x] **Step 4: Commit**

```bash
git add packages/engine-core/test
git commit -m "test(engine-core): commands, look-ahead invalidation, snapshot/restore and lifecycle" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 15: Renderer — min/max decimation and sweep maths (acceptance test 12)

**Files:**
- Create: `packages/renderer/src/decimate.ts`, `packages/renderer/test/decimate.test.ts`

**Interfaces:**
- Consumes: `sweepPxPerS`, `sweepX` (Stage 0 `calibration.ts`).
- Produces: `interface Column { col; first; last; min; max; maxIndex; minIndex }`, `columnOf(n, rate, pxPerS, dpr)`, `decimateMinMax(samples, count, startIndex, rate, pxPerS, dpr, out?): Column[]`.

- [x] **Step 1: Write the failing test**

`packages/renderer/test/decimate.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { sweepPxPerS, sweepX } from '../src/calibration.ts';
import { columnOf, decimateMinMax } from '../src/decimate.ts';

describe('decimate + sweep maths (acceptance 12)', () => {
  it('x-velocity is 94.5 ± 0.1 CSS px/s at 25 mm/s and 3.78 px/mm, at any frame rate', () => {
    for (const fps of [30, 60, 120]) {
      const t0 = 1.234;
      const frames = fps * 5; // 5 s, no wrap in a 1000 px lane
      let x = sweepX(t0, 25, 3.78, 1000);
      let travelled = 0;
      for (let i = 1; i <= frames; i++) {
        const nx = sweepX(t0 + i / fps, 25, 3.78, 1000);
        travelled += nx >= x ? nx - x : nx + 1000 - x;
        x = nx;
      }
      expect(Math.abs(travelled / 5 - 94.5)).toBeLessThanOrEqual(0.1);
    }
  });

  it('keeps the R-peak maximum exactly, in the column that holds the peak sample (within 1 sample)', () => {
    const rate = 500;
    const pxPerS = sweepPxPerS(25, 3.78);
    for (const dpr of [1, 2, 3]) {
      for (const peakAt of [1000, 1001, 1003, 1007]) {
        const n0 = 900;
        const s = new Float32Array(300);
        for (let i = 0; i < s.length; i++) s[i] = 1.1 * Math.exp(-(((n0 + i - peakAt) / 5) ** 2) / 2); // σ = 10 ms
        const cols = decimateMinMax(s, s.length, n0, rate, pxPerS, dpr);
        const best = cols.reduce((a, c) => (c.max > a.max ? c : a));
        expect(best.max).toBe(Math.max(...s));
        expect(Math.abs(best.maxIndex - peakAt)).toBeLessThanOrEqual(1);
        expect(best.col).toBe(columnOf(peakAt, rate, pxPerS, dpr));
      }
    }
  });

  it('gives 94.5·dpr columns per second, each covering ≈ 5.3/dpr samples', () => {
    const s = new Float32Array(500);
    const cols = decimateMinMax(s, 500, 0, 500, 94.5, 2);
    expect(cols.length).toBeGreaterThanOrEqual(188);
    expect(cols.length).toBeLessThanOrEqual(190);
  });
});
```

- [x] **Step 2: Run to see it fail**

Run: `pnpm --filter @pme/renderer exec vitest run test/decimate`
Expected: FAIL — cannot load `decimate.ts`.

- [x] **Step 3: Implement**

`packages/renderer/src/decimate.ts`:
```ts
// Min/max decimation per DEVICE-pixel column (brief §3.5): 500 Hz at 25 mm/s is 5.3 samples per CSS px
// (2.65 per device px at DPR 2), so each column keeps its first, last, min and max sample. That preserves
// QRS and VF crests exactly (no sample is averaged away).

export interface Column {
  /** Unwrapped device-pixel column index: floor(x_css · dpr), x_css = n / rate · pxPerS. */
  col: number;
  first: number;
  last: number;
  min: number;
  max: number;
  /** Absolute sample index of the max and the min (for tests and overlays). */
  maxIndex: number;
  minIndex: number;
}

/** Unwrapped device column of absolute sample n. */
export function columnOf(n: number, rate: number, pxPerS: number, dpr: number): number {
  return Math.floor(((n / rate) * pxPerS * dpr) + 1e-9);
}

/**
 * Decimate `count` samples (samples[0] is absolute index `startIndex`) into columns, appended to `out`.
 * Returns `out`.
 */
export function decimateMinMax(
  samples: ArrayLike<number>,
  count: number,
  startIndex: number,
  rate: number,
  pxPerS: number,
  dpr: number,
  out: Column[] = [],
): Column[] {
  let cur: Column | null = null;
  for (let i = 0; i < count; i++) {
    const n = startIndex + i;
    const v = samples[i] as number;
    const col = columnOf(n, rate, pxPerS, dpr);
    if (cur === null || col !== cur.col) {
      cur = { col, first: v, last: v, min: v, max: v, maxIndex: n, minIndex: n };
      out.push(cur);
    } else {
      cur.last = v;
      if (v > cur.max) {
        cur.max = v;
        cur.maxIndex = n;
      }
      if (v < cur.min) {
        cur.min = v;
        cur.minIndex = n;
      }
    }
  }
  return out;
}
```

- [x] **Step 4: Run to see it pass**

Run: `pnpm --filter @pme/renderer exec vitest run test/decimate`
Expected: PASS, 3 tests.

- [x] **Step 5: Commit**

```bash
git add packages/renderer
git commit -m "feat(renderer): min/max decimation per device-pixel column (acceptance 12)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 16: Renderer — sweep lane (erase gap, wrap, tail re-stroke, DPR)

**Files:**
- Create: `packages/renderer/src/ctx.ts`, `packages/renderer/src/sweep-lane.ts`, `packages/renderer/test/fake-ctx.ts`, `packages/renderer/test/sweep-lane.test.ts`

**Interfaces:**
- Consumes: `sweepPxPerS` (Stage 0); `decimateMinMax`, `Column` (Task 15).
- Produces: `interface Ctx2D` (Canvas 2D subset satisfied by both `CanvasRenderingContext2D` and `OffscreenCanvasRenderingContext2D`), `interface LaneConfig { x; y; width; height; baseline; rate; mmPerS; pxPerMm; gainMmPerMv; color; background; lineWidth; eraseGapPx }`, `type SampleSource = (from: number, out: Float32Array) => number`, `class SweepLane { cfg; constructor(cfg, dpr); get pxPerS(); reset(ctx, dpr?); xOf(n); draw(ctx, t, read): number /* cursor x in lane */ }`. Test fake `FakeCtx` records calls.

- [x] **Step 1: Write the fake context and the failing test**

`packages/renderer/test/fake-ctx.ts`:
```ts
// A recording stand-in for CanvasRenderingContext2D (tests run in Node without a canvas).
import type { Ctx2D } from '../src/ctx.ts';

export type Call = { op: string; args: number[]; style?: string };

export class FakeCtx implements Ctx2D {
  fillStyle: string | CanvasGradient | CanvasPattern = '#000';
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000';
  lineWidth = 1;
  lineJoin: CanvasLineJoin = 'miter';
  lineCap: CanvasLineCap = 'butt';
  font = '';
  textBaseline: CanvasTextBaseline = 'alphabetic';
  calls: Call[] = [];
  texts: string[] = [];
  fillRect(x: number, y: number, w: number, h: number): void {
    this.calls.push({ op: 'fillRect', args: [x, y, w, h], style: String(this.fillStyle) });
  }
  beginPath(): void {
    this.calls.push({ op: 'beginPath', args: [] });
  }
  moveTo(x: number, y: number): void {
    this.calls.push({ op: 'moveTo', args: [x, y] });
  }
  lineTo(x: number, y: number): void {
    this.calls.push({ op: 'lineTo', args: [x, y] });
  }
  stroke(): void {
    this.calls.push({ op: 'stroke', args: [], style: String(this.strokeStyle) });
  }
  fillText(text: string, x: number, y: number): void {
    this.texts.push(text);
    this.calls.push({ op: 'fillText', args: [x, y] });
  }
  setTransform(): void {}
  save(): void {}
  restore(): void {}
  rect(): void {}
  clip(): void {}
  clear(): void {
    this.calls = [];
  }
}
```

`packages/renderer/test/sweep-lane.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { SweepLane, type LaneConfig } from '../src/sweep-lane.ts';
import { FakeCtx } from './fake-ctx.ts';

const CFG: LaneConfig = {
  x: 50, y: 0, width: 1000, height: 150, baseline: 0.6, rate: 500, mmPerS: 25, pxPerMm: 3.78,
  gainMmPerMv: 10, color: '#0f0', background: '#000', lineWidth: 1.5, eraseGapPx: 16,
};

/** A source that returns a sine for any index (as the engine's ring buffer would). */
const sine = (from: number, out: Float32Array) => {
  for (let i = 0; i < out.length; i++) out[i] = Math.sin((2 * Math.PI * (from + i)) / 500);
  return out.length;
};

describe('SweepLane', () => {
  it('cursor position depends only on sim time, not on the frame rate', () => {
    for (const fps of [30, 60]) {
      const lane = new SweepLane(CFG, 2);
      const ctx = new FakeCtx();
      let x = 0;
      for (let f = 0; f <= 3 * fps; f++) x = lane.draw(ctx, f / fps, sine);
      expect(x).toBeCloseTo((3 * 94.5) % 1000, 6);
    }
  });

  it('clears the erase gap (16 px) just ahead of the cursor on every frame', () => {
    const lane = new SweepLane(CFG, 2);
    const ctx = new FakeCtx();
    lane.draw(ctx, 1, sine);
    ctx.clear();
    lane.draw(ctx, 1 + 1 / 60, sine);
    const clears = ctx.calls.filter((c) => c.op === 'fillRect');
    expect(clears).toHaveLength(1);
    const [x, , w] = clears[0]!.args as [number, number, number, number];
    const cursorLocal = ((Math.floor((1 + 1 / 60) * 500) / 500) * 94.5) % 1000;
    expect(x - CFG.x).toBeLessThanOrEqual(cursorLocal);
    expect(x - CFG.x + w).toBeGreaterThanOrEqual(cursorLocal + 16 - 1);
    expect(w).toBeLessThan(16 + 4);
  });

  it('never draws ahead of the cursor or behind the previous frame (no ghost trail), including at wrap', () => {
    const lane = new SweepLane(CFG, 2);
    const ctx = new FakeCtx();
    let prevCursor = lane.draw(ctx, 0, sine);
    for (let f = 1; f <= 60 * 25; f++) {
      ctx.clear();
      const cursor = lane.draw(ctx, f / 60, sine);
      for (const c of ctx.calls.filter((k) => k.op === 'lineTo' || k.op === 'moveTo')) {
        const lx = c.args[0]! - CFG.x;
        expect(lx).toBeGreaterThanOrEqual(0);
        expect(lx).toBeLessThanOrEqual(CFG.width);
        const wrapped = cursor < prevCursor;
        if (!wrapped) {
          expect(lx).toBeGreaterThanOrEqual(prevCursor - 3); // tail re-stroke reaches ≤ 2 points back
          expect(lx).toBeLessThanOrEqual(cursor + 1);
        }
      }
      prevCursor = cursor;
    }
  });

  it('a jump longer than one lane redraws from a clean lane', () => {
    const lane = new SweepLane(CFG, 1);
    const ctx = new FakeCtx();
    lane.draw(ctx, 1, sine);
    ctx.clear();
    lane.draw(ctx, 60, sine);
    const full = ctx.calls.find((c) => c.op === 'fillRect' && c.args[2] === CFG.width);
    expect(full).toBeDefined();
  });

  it('maps 1 mV to 10 mm (37.8 px) above the baseline', () => {
    const lane = new SweepLane({ ...CFG, x: 0 }, 1);
    const ctx = new FakeCtx();
    lane.draw(ctx, 0, () => 0);
    lane.draw(ctx, 0.5, (from, out) => {
      out.fill(1);
      return out.length;
    });
    const ys = ctx.calls.filter((c) => c.op === 'lineTo').map((c) => c.args[1]!);
    expect(Math.min(...ys)).toBeCloseTo(0.6 * 150 - 37.8, 6);
  });
});
```

- [x] **Step 2: Run to see it fail**

Run: `pnpm --filter @pme/renderer exec vitest run test/sweep-lane`
Expected: FAIL — cannot load `ctx.ts` / `sweep-lane.ts`.

- [x] **Step 3: Implement**

`packages/renderer/src/ctx.ts`:
```ts
// The subset of the Canvas 2D API the renderer uses. Both CanvasRenderingContext2D and
// OffscreenCanvasRenderingContext2D satisfy it, and tests pass a recording fake.
export interface Ctx2D {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  lineJoin: CanvasLineJoin;
  lineCap: CanvasLineCap;
  font: string;
  textBaseline: CanvasTextBaseline;
  fillRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
  fillText(text: string, x: number, y: number): void;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  save(): void;
  restore(): void;
  rect(x: number, y: number, w: number, h: number): void;
  clip(): void;
}
```

`packages/renderer/src/sweep-lane.ts`:
```ts
// One sweep lane (brief §3.5 "Per frame, for each lane"): x comes from sim time, never from frame counts.
// Each frame: (1) take the sample range since the last frame, (2) clear the erase gap ahead of the cursor,
// (3) draw the new samples min/max-decimated per device-pixel column, (4) re-stroke the previous frame's
// last two points so joins are seamless. Static chrome (labels, cal bar) is drawn elsewhere, once.
import { sweepPxPerS } from './calibration.ts';
import type { Ctx2D } from './ctx.ts';
import { decimateMinMax, type Column } from './decimate.ts';

export interface LaneConfig {
  /** Trace area in CSS px. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Baseline as a fraction of the height from the top. */
  baseline: number;
  rate: number; // samples/s of the channel
  mmPerS: number; // 25 by default
  pxPerMm: number; // calibration
  gainMmPerMv: number; // 10 mm/mV default
  color: string;
  background: string;
  lineWidth: number; // 1.5–2 CSS px
  eraseGapPx: number; // 16 CSS px default (brief §3.5)
}

/** Reads samples starting at absolute index `from` into `out`; returns the count (out[0] = sample `from`). */
export type SampleSource = (from: number, out: Float32Array) => number;

type Pt = { x: number; y: number }; // x unwrapped CSS px relative to lane start, y CSS px

export class SweepLane {
  cfg: LaneConfig;
  private dpr: number;
  private lastIndex = -1;
  private tail: Pt[] = [];
  private scratch = new Float32Array(4096);
  private cols: Column[] = [];

  constructor(cfg: LaneConfig, dpr: number) {
    this.cfg = cfg;
    this.dpr = dpr;
  }

  get pxPerS(): number {
    return sweepPxPerS(this.cfg.mmPerS, this.cfg.pxPerMm);
  }

  /** Forget drawn history (after resize, calibration change, or a big time jump). */
  reset(ctx: Ctx2D, dpr: number = this.dpr): void {
    this.dpr = dpr;
    this.lastIndex = -1;
    this.tail = [];
    ctx.fillStyle = this.cfg.background;
    ctx.fillRect(this.cfg.x, this.cfg.y, this.cfg.width, this.cfg.height);
  }

  /** Unwrapped x (CSS px) of absolute sample n. */
  xOf(n: number): number {
    return (n / this.cfg.rate) * this.pxPerS;
  }

  private yOf(mv: number): number {
    const c = this.cfg;
    const y = c.y + c.baseline * c.height - mv * c.gainMmPerMv * c.pxPerMm;
    return Math.min(c.y + c.height, Math.max(c.y, y));
  }

  /** Snap a CSS x to the device-pixel grid. */
  private snap(x: number): number {
    return Math.floor(x * this.dpr) / this.dpr;
  }

  /** Fill [x0, x1) (unwrapped, CSS px) with the background, wrapping at the lane width. */
  private clearSpan(ctx: Ctx2D, x0: number, x1: number): void {
    const c = this.cfg;
    ctx.fillStyle = c.background;
    let a = x0;
    while (a < x1) {
      const lap = Math.floor(a / c.width);
      const end = Math.min(x1, (lap + 1) * c.width);
      const la = this.snap(a - lap * c.width);
      const lb = end - lap * c.width >= c.width ? c.width : this.snap(end - lap * c.width) + 1 / this.dpr;
      ctx.fillRect(c.x + la, c.y, Math.max(0, lb - la), c.height);
      a = end;
    }
  }

  /** Draw everything up to render time `t` (sim seconds). Returns the cursor x inside the lane (CSS px). */
  draw(ctx: Ctx2D, t: number, read: SampleSource): number {
    const c = this.cfg;
    const endIdx = Math.floor(t * c.rate + 1e-9);
    const cursor = this.xOf(endIdx) % c.width;
    if (this.lastIndex < 0 || endIdx - this.lastIndex > (c.width / this.pxPerS) * c.rate) {
      // First frame, or a jump longer than one lane (hidden tab): start clean one sample back.
      this.reset(ctx);
      this.lastIndex = endIdx - 1;
    }
    if (endIdx <= this.lastIndex) return cursor;
    const need = endIdx - this.lastIndex;
    if (this.scratch.length < need) this.scratch = new Float32Array(need * 2);
    const out = this.scratch.subarray(0, need);
    const got = read(this.lastIndex + 1, out);
    if (got <= 0) return cursor;
    const first = this.lastIndex + 1;
    const last = first + got - 1;
    const xFrom = this.tail.length > 0 ? (this.tail[this.tail.length - 1] as Pt).x : this.xOf(first);
    this.clearSpan(ctx, xFrom, this.xOf(last) + c.eraseGapPx);

    this.cols.length = 0;
    decimateMinMax(out, got, first, c.rate, this.pxPerS, this.dpr, this.cols);
    const pts: Pt[] = [...this.tail];
    for (const col of this.cols) {
      const x = (col.col + 0.5) / this.dpr;
      pts.push({ x, y: this.yOf(col.first) });
      if (col.max !== col.min) {
        const minFirst = col.minIndex < col.maxIndex;
        pts.push({ x, y: this.yOf(minFirst ? col.min : col.max) });
        pts.push({ x, y: this.yOf(minFirst ? col.max : col.min) });
      }
      pts.push({ x, y: this.yOf(col.last) });
    }
    this.strokeWrapped(ctx, pts);
    this.tail = pts.slice(-2);
    this.lastIndex = last;
    return cursor;
  }

  /** Stroke a polyline given in unwrapped x, splitting it where it crosses the right edge. */
  private strokeWrapped(ctx: Ctx2D, pts: Pt[]): void {
    const c = this.cfg;
    if (pts.length < 2) return;
    ctx.strokeStyle = c.color;
    ctx.lineWidth = c.lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    let lap = Math.floor((pts[0] as Pt).x / c.width);
    ctx.beginPath();
    ctx.moveTo(c.x + (pts[0] as Pt).x - lap * c.width, (pts[0] as Pt).y);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i] as Pt;
      const l = Math.floor(p.x / c.width);
      if (l !== lap) {
        ctx.stroke();
        ctx.beginPath();
        lap = l;
        ctx.moveTo(c.x + p.x - lap * c.width, p.y);
      } else {
        ctx.lineTo(c.x + p.x - lap * c.width, p.y);
      }
    }
    ctx.stroke();
  }
}
```

- [x] **Step 4: Run to see it pass**

Run: `pnpm --filter @pme/renderer exec vitest run test/sweep-lane && pnpm --filter @pme/renderer typecheck`
Expected: PASS, 5 tests.

- [x] **Step 5: Commit**

```bash
git add packages/renderer
git commit -m "feat(renderer): sweep lane with erase gap, wrap-safe strokes and tail re-stroke" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 17: Renderer — worker protocol and `MonitorCore` (engine + lanes + chrome)

**Files:**
- Create: `packages/renderer/src/protocol.ts`, `packages/renderer/src/monitor-core.ts`, `packages/renderer/test/monitor-core.test.ts`

**Interfaces:**
- Consumes: `createEngine`, `Clock`, `Command`, `DispatchResult`, `EngineEvent`, `EngineOptions`, `LeadId`, `MonitorEngine` from `@pme/engine-core`; `SweepLane` (Task 16); `DEFAULT_PX_PER_MM` (Stage 0); `FakeCtx` (Task 16, tests).
- Produces: `protocol.ts`: `interface Size { cssW; cssH; dpr }`, `interface CoreOptions { engine?; lanes?: LeadId[]; pxPerMm?; fps?: 60|30 }`, `interface ClockAnchor { simT; epochMs; timeScale }`, `type ToWorker` (`init`, `frame`, `catchUp`, `command`, `resize`, `timeScale`, `pause`, `resume`, `fps`, `calibrate`, `visible`), `type FromWorker` (`ready`, `events`, `result`, `error`). `monitor-core.ts`: `THEME`, `LABEL_W = 56`, `interface CanvasTarget { width; height }`, `class MonitorCore { readonly engine; readonly clock; constructor(canvas, ctx, size, opts, post(anchor, events)); command(cmd): DispatchResult; resize(size); calibrate(pxPerMm); setFps(fps); setVisible(v); frame(epochMs); catchUp(epochMs) }`.

- [ ] **Step 1: Write the failing test**

`packages/renderer/test/monitor-core.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '@pme/engine-core';
import { MonitorCore } from '../src/monitor-core.ts';
import type { ClockAnchor } from '../src/protocol.ts';
import { FakeCtx } from './fake-ctx.ts';

function make(fps: 60 | 30 = 60) {
  const ctx = new FakeCtx();
  const canvas = { width: 0, height: 0 };
  const posts: Array<{ anchor: ClockAnchor; events: EngineEvent[] }> = [];
  const core = new MonitorCore(canvas, ctx, { cssW: 1056, cssH: 300, dpr: 2 }, { engine: { seed: 1 }, fps }, (anchor, events) =>
    posts.push({ anchor, events }),
  );
  return { core, ctx, canvas, posts };
}

describe('MonitorCore', () => {
  it('sizes the backing store to CSS size × DPR and draws labels and a calibration bar once', () => {
    const { canvas, ctx } = make();
    expect(canvas).toEqual({ width: 2112, height: 600 });
    expect(ctx.texts).toEqual(['II  M', 'V5  M']);
  });

  it('sim time follows wall time at 60 and at 30 fps', () => {
    for (const fps of [60, 30] as const) {
      const { core } = make(fps);
      const t0 = 1_000_000;
      for (let f = 0; f <= 600; f++) core.frame(t0 + (f * 1000) / 60);
      expect(core.clock.renderT).toBeGreaterThan(9.9);
      expect(core.clock.renderT).toBeLessThanOrEqual(10.0001);
    }
  });

  it('posts engine events with a clock anchor, and measurements arrive about once per second', () => {
    const { core, posts } = make();
    for (let f = 0; f <= 600; f++) core.frame(5000 + (f * 1000) / 60);
    const events = posts.flatMap((p) => p.events);
    expect(events.some((e) => e.type === 'beat')).toBe(true);
    expect(events.some((e) => e.type === 'tone')).toBe(true);
    expect(events.filter((e) => e.type === 'measurement').length).toBeGreaterThanOrEqual(9);
    const a = posts[posts.length - 1]!.anchor;
    expect(a.timeScale).toBe(1);
    expect(a.epochMs).toBeCloseTo(15000, 6);
  });

  it('a filter command updates the chrome letter', () => {
    const { core, ctx } = make();
    ctx.texts = [];
    const r = core.command({ id: 'f', issuedBy: 't', type: 'device', action: { device: 'ecg', action: 'filter', value: 'diagnostic' } });
    expect(r.accepted).toBe(true);
    expect(ctx.texts).toEqual(['II  D', 'V5  D']);
  });
});

describe('MonitorCore hidden-tab catch-up', () => {
  it('advances by the full hidden time in bulk, without the 250 ms clamp', () => {
    const { core } = make();
    core.frame(1000);
    core.frame(1016);
    core.catchUp(61_016);
    expect(core.clock.simT).toBeGreaterThanOrEqual(59.98);
    expect(core.clock.simT).toBeLessThanOrEqual(60.02);
    expect(core.engine.now().simT).toBe(core.clock.simT);
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm --filter @pme/renderer exec vitest run test/monitor-core`
Expected: FAIL — cannot load `monitor-core.ts`.

- [ ] **Step 3: Implement**

`packages/renderer/src/protocol.ts`:
```ts
// Messages between the main thread and the engine+renderer worker (brief §3.4). Raw samples never cross.
import type { Command, DispatchResult, EngineEvent, EngineOptions, LeadId } from '@pme/engine-core';

export interface Size {
  cssW: number;
  cssH: number;
  dpr: number;
}

export interface CoreOptions {
  engine?: EngineOptions;
  /** Displayed ECG leads, one per lane (1–3). Default ['ecgII', 'V5']. */
  lanes?: LeadId[];
  pxPerMm?: number;
  fps?: 60 | 30;
}

/** Wall/sim clock anchor sent with every event batch (brief §3.4). epochMs = timeOrigin + now. */
export interface ClockAnchor {
  simT: number;
  epochMs: number;
  timeScale: number;
}

export type ToWorker =
  | { type: 'init'; canvas: OffscreenCanvas; size: Size; opts: CoreOptions; mainPump: boolean }
  | { type: 'frame'; epochMs: number }
  | { type: 'catchUp'; epochMs: number }
  | { type: 'command'; reqId: number; cmd: Command }
  | { type: 'resize'; size: Size }
  | { type: 'timeScale'; k: number }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'fps'; fps: 60 | 30 }
  | { type: 'calibrate'; pxPerMm: number }
  | { type: 'visible'; visible: boolean };

export type FromWorker =
  | { type: 'ready'; path: 'worker-raf' | 'worker-pump' }
  | { type: 'events'; anchor: ClockAnchor; events: EngineEvent[] }
  | { type: 'result'; reqId: number; result: DispatchResult }
  | { type: 'error'; message: string };
```

`packages/renderer/src/monitor-core.ts`:
```ts
// Engine + sweep lanes + static chrome, driven by frame timestamps. Runs inside the worker (OffscreenCanvas)
// or on the main thread (fallback) unchanged (brief §3.4). The clock is sim time from an accumulator
// (engine-core Clock), and lanes draw at clock.renderT, so sweep speed is independent of frame rate.
import { Clock, createEngine, type Command, type DispatchResult, type EngineEvent, type LeadId, type MonitorEngine } from '@pme/engine-core';
import { DEFAULT_PX_PER_MM } from './calibration.ts';
import type { Ctx2D } from './ctx.ts';
import type { ClockAnchor, CoreOptions, Size } from './protocol.ts';
import { SweepLane } from './sweep-lane.ts';

export const THEME = { background: '#000', ecg: '#00ff66', label: '#00ff66', grid: '#222' } as const; // hard-coded dark theme (Stage 1)
export const LABEL_W = 56; // CSS px reserved at the left of each lane for chrome
const LEAD_LABEL: Record<LeadId, string> = {
  ecgI: 'I', ecgII: 'II', ecgIII: 'III', aVR: 'aVR', aVL: 'aVL', aVF: 'aVF', V1: 'V1', V2: 'V2', V3: 'V3', V4: 'V4', V5: 'V5', V6: 'V6',
};
const EVENT_POST_MS = 250; // post the clock anchor at least this often even without events

export interface CanvasTarget {
  width: number;
  height: number;
}

export class MonitorCore {
  readonly engine: MonitorEngine;
  readonly clock = new Clock();
  private lanes: SweepLane[] = [];
  private leads: LeadId[];
  private size: Size;
  private pxPerMm: number;
  private fps: 60 | 30;
  private filterLetter = 'M';
  private lastEpoch: number | null = null;
  private parity = 0;
  private batch: EngineEvent[] = [];
  private lastPost = -Infinity;
  private visible = true;
  private readonly canvas: CanvasTarget;
  private readonly ctx: Ctx2D;
  private readonly post: (anchor: ClockAnchor, events: EngineEvent[]) => void;

  constructor(
    canvas: CanvasTarget,
    ctx: Ctx2D,
    size: Size,
    opts: CoreOptions,
    post: (anchor: ClockAnchor, events: EngineEvent[]) => void,
  ) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.post = post;
    this.engine = createEngine(opts.engine ?? {});
    this.leads = [...(opts.lanes ?? ['ecgII', 'V5'])];
    this.pxPerMm = opts.pxPerMm ?? DEFAULT_PX_PER_MM;
    this.fps = opts.fps ?? 60;
    this.size = size;
    this.leads.forEach((lead, lane) =>
      this.engine.dispatch({ id: `init-lead-${lane}`, issuedBy: 'renderer', type: 'device', action: { device: 'ecg', action: 'lead', value: lead, lane } }),
    );
    this.engine.on((e) => this.batch.push(e));
    this.layout();
  }

  /** Apply a command (lane/filter changes also update the chrome). */
  command(cmd: Command): DispatchResult {
    const r = this.engine.dispatch(cmd);
    if (r.accepted && cmd.type === 'device' && cmd.action.device === 'ecg') {
      if (cmd.action.action === 'filter') this.filterLetter = cmd.action.value === 'diagnostic' ? 'D' : 'M';
      if (cmd.action.action === 'lead' && typeof cmd.action.lane === 'number') this.leads[cmd.action.lane] = cmd.action.value as LeadId;
      this.layout();
    }
    return r;
  }

  resize(size: Size): void {
    this.size = size;
    this.layout();
  }

  calibrate(pxPerMm: number): void {
    this.pxPerMm = pxPerMm;
    this.layout();
  }

  setFps(fps: 60 | 30): void {
    this.fps = fps;
  }

  setVisible(v: boolean): void {
    this.visible = v;
  }

  /**
   * Hidden tab (brief §3.3): advance sim time by the FULL wall delta (no 250 ms clamp), without drawing.
   * The lanes restart cleanly on the next drawn frame because the jump exceeds one lane.
   */
  catchUp(epochMs: number): void {
    const dt = this.lastEpoch === null ? 0 : Math.max(0, epochMs - this.lastEpoch);
    this.lastEpoch = epochMs;
    if (this.clock.paused || dt === 0) return;
    const target = this.clock.renderT + (dt / 1000) * this.clock.timeScale;
    this.clock.setTick(Math.floor(target * 50 + 1e-6));
    this.engine.advanceTo(this.clock.simT);
  }

  /** One animation frame. `epochMs` = performance.timeOrigin + frame timestamp (ms). */
  frame(epochMs: number): void {
    if (this.fps === 30 && this.parity++ % 2 === 1) return; // 30 fps mode: skip every other frame
    const dt = this.lastEpoch === null ? 0 : epochMs - this.lastEpoch;
    this.lastEpoch = epochMs;
    const ticks = this.clock.advance(dt);
    if (ticks > 0) this.engine.advanceTo(this.clock.simT);
    const t = this.clock.renderT;
    if (this.visible) {
      this.lanes.forEach((lane, i) => {
        const ch = this.leads[i] as LeadId;
        lane.draw(this.ctx, t, (from, out) => this.engine.readSamples(ch, from, out));
      });
    }
    if (this.batch.length > 0 || epochMs - this.lastPost >= EVENT_POST_MS) {
      this.post({ simT: t, epochMs, timeScale: this.clock.timeScale }, this.batch);
      this.batch = [];
      this.lastPost = epochMs;
    }
  }

  private layout(): void {
    const { cssW, cssH, dpr } = this.size;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.fillStyle = THEME.background;
    this.ctx.fillRect(0, 0, cssW, cssH);
    const h = cssH / this.leads.length;
    this.lanes = this.leads.map((_, i) => {
      const lane = new SweepLane(
        {
          x: LABEL_W, y: i * h, width: cssW - LABEL_W, height: h, baseline: 0.6, rate: 500, mmPerS: 25,
          pxPerMm: this.pxPerMm, gainMmPerMv: 10, color: THEME.ecg, background: THEME.background, lineWidth: 1.75, eraseGapPx: 16,
        },
        dpr,
      );
      lane.reset(this.ctx, dpr);
      return lane;
    });
    this.drawChrome();
  }

  /** Static chrome, drawn once per layout (brief §3.5): lead label, filter letter, 1 mV calibration bar. */
  private drawChrome(): void {
    const ctx = this.ctx;
    const h = this.size.cssH / this.leads.length;
    ctx.fillStyle = THEME.label;
    ctx.strokeStyle = THEME.label;
    ctx.font = '14px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    this.leads.forEach((lead, i) => {
      const y0 = i * h;
      ctx.fillText(`${LEAD_LABEL[lead]}  ${this.filterLetter}`, 6, y0 + 6);
      const base = y0 + 0.6 * h;
      const mv = 10 * this.pxPerMm; // 1 mV at 10 mm/mV
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(14, base);
      ctx.lineTo(24, base);
      ctx.lineTo(24, base - mv);
      ctx.lineTo(36, base - mv);
      ctx.lineTo(36, base);
      ctx.lineTo(46, base);
      ctx.stroke();
    });
  }
}
```

- [ ] **Step 4: Run to see it pass**

Run: `pnpm --filter @pme/renderer exec vitest run test/monitor-core && pnpm --filter @pme/renderer typecheck`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/renderer
git commit -m "feat(renderer): MonitorCore drives engine and lanes from frame time, with static chrome" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 18: HR numerics tile

**Files:**
- Create: `packages/renderer/src/numerics-dom.ts`, `packages/renderer/test/numerics-dom.test.ts`

**Interfaces:**
- Consumes: `Measured` from `@pme/engine-core`.
- Produces: `formatNumeric(m: Measured | undefined): string` ('---' when null/invalid/absent), `interface TileOptions { label; unit; color }`, `class NumericTile { readonly el; constructor(parent: HTMLElement, opts); update(m) }` (root element has class `pme-tile`).

- [ ] **Step 1: Write the failing test**

`packages/renderer/test/numerics-dom.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { formatNumeric } from '../src/numerics-dom.ts';

describe('numerics-dom', () => {
  it('shows the rounded value, or dashes when invalid/absent', () => {
    expect(formatNumeric({ value: 72.4, flag: 'valid', at: 1 })).toBe('72');
    expect(formatNumeric({ value: 0, flag: 'valid', at: 1 })).toBe('0');
    expect(formatNumeric({ value: null, flag: 'invalid', at: 1 })).toBe('---');
    expect(formatNumeric(undefined)).toBe('---');
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm --filter @pme/renderer exec vitest run test/numerics-dom`
Expected: FAIL — cannot load `numerics-dom.ts`.

- [ ] **Step 3: Implement**

`packages/renderer/src/numerics-dom.ts`:
```ts
// DOM numeric tiles (brief §3.1: DOM numerics ≤1 Hz). Stage 1 has the HR tile only.
import type { Measured } from '@pme/engine-core';

/** Text for a numeric: dashes when there is no valid value (brief §6.2 "dashes"). */
export function formatNumeric(m: Measured | undefined): string {
  if (!m || m.value === null || m.flag === 'invalid') return '---';
  return String(Math.round(m.value));
}

export interface TileOptions {
  label: string;
  unit: string;
  color: string;
}

export class NumericTile {
  readonly el: HTMLDivElement;
  private readonly valueEl: HTMLDivElement;

  constructor(parent: HTMLElement, opts: TileOptions) {
    const doc = parent.ownerDocument;
    this.el = doc.createElement('div');
    this.el.className = 'pme-tile';
    this.el.style.cssText = `color:${opts.color};font-family:system-ui,sans-serif;padding:8px 12px;line-height:1;`;
    const head = doc.createElement('div');
    head.style.cssText = 'font-size:16px;display:flex;justify-content:space-between;gap:12px;';
    head.innerHTML = `<span>${opts.label}</span><span style="opacity:.8">${opts.unit}</span>`;
    this.valueEl = doc.createElement('div');
    this.valueEl.style.cssText = 'font-size:64px;font-weight:600;text-align:right;font-variant-numeric:tabular-nums;';
    this.valueEl.textContent = '---';
    this.el.append(head, this.valueEl);
    parent.append(this.el);
  }

  update(m: Measured | undefined): void {
    this.valueEl.textContent = formatNumeric(m);
  }
}
```

- [ ] **Step 4: Run to see it pass**

Run: `pnpm --filter @pme/renderer exec vitest run test/numerics-dom`
Expected: PASS, 1 test.

- [ ] **Step 5: Commit**

```bash
git add packages/renderer
git commit -m "feat(renderer): HR numeric tile" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 19: `@pme/audio` — clock map, look-ahead scheduler, QRS beep, unlock

**Files:**
- Create: `packages/audio/src/clock-map.ts`, `packages/audio/src/scheduler.ts`, `packages/audio/src/tones.ts`, `packages/audio/src/context.ts`, `packages/audio/test/clock-map.test.ts`, `packages/audio/test/scheduler.test.ts`
- Modify: `packages/audio/src/index.ts`

**Interfaces:**
- Consumes: nothing from other packages.
- Produces: `clock-map.ts`: `interface Anchor { simT; perfMs; timeScale }`, `interface OutputTimestamp { contextTime; performanceTime }`, `class ClockMap { setAnchor(a); get hasAnchor(); simToPerfMs(t) }`, `perfToAudioTime(perfMs, ts)`. `scheduler.ts`: `TIMER_MS = 25`, `LOOKAHEAD_S = 0.1`, `MAX_LATE_S = 0.03`, `interface ToneRequest { t; id; kind; freqHz? }`, `interface SchedulerDeps { audioNow(); perfToAudio(perfMs); play(tone, when) }`, `interface ToneLogEntry { id; kind; simT; when; lateS; dropped }`, `class ToneScheduler { readonly clock: ClockMap; readonly log; start(); stop(); enqueue(tone); cancelAfter(after); get pending(); pump() }`. `tones.ts`: `BEEP_MS = 60`, `BEEP_RAMP_MS = 5`, `BEEP_HARMONIC2 = 0.3`, `beepEnvelope(g)`, `playBeep(ctx, dest, when, freqHz, gain?)`. `context.ts`: `interface AudioOut { ctx; master; perfToAudio(perfMs) }`, `silentWavDataUri()`, `unlockAudio(): Promise<AudioOut>` (call inside a user gesture).

- [ ] **Step 1: Write the failing tests**

`packages/audio/test/clock-map.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { ClockMap, perfToAudioTime } from '../src/clock-map.ts';

describe('clock-map', () => {
  it('maps sim time to wall time through the anchor and the time scale', () => {
    const m = new ClockMap();
    m.setAnchor({ simT: 10, perfMs: 5000, timeScale: 1 });
    expect(m.simToPerfMs(10.5)).toBe(5500);
    m.setAnchor({ simT: 10, perfMs: 5000, timeScale: 2 });
    expect(m.simToPerfMs(11)).toBe(5500);
    m.setAnchor({ simT: 10, perfMs: 5000, timeScale: 0.25 });
    expect(m.simToPerfMs(10.25)).toBe(6000);
  });

  it('maps wall time to the audio clock with an output timestamp', () => {
    expect(perfToAudioTime(1500, { contextTime: 2, performanceTime: 1000 })).toBeCloseTo(2.5, 12);
  });
});
```

`packages/audio/test/scheduler.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { ToneScheduler, type ToneRequest } from '../src/scheduler.ts';
import { beepEnvelope, BEEP_MS } from '../src/tones.ts';

/** Audio time == perf seconds in this fake. */
function setup(nowPerfMs: { v: number }) {
  const played: Array<{ tone: ToneRequest; when: number }> = [];
  const s = new ToneScheduler({
    audioNow: () => nowPerfMs.v / 1000,
    perfToAudio: (p) => p / 1000,
    play: (tone, when) => played.push({ tone, when }),
  });
  s.clock.setAnchor({ simT: 0, perfMs: 0, timeScale: 1 });
  return { s, played };
}

describe('ToneScheduler', () => {
  it('schedules tones within the 100 ms look-ahead at their exact audio time', () => {
    const now = { v: 1000 };
    const { s, played } = setup(now);
    s.enqueue({ t: 1.05, id: 'a', kind: 'qrs' });
    s.enqueue({ t: 1.5, id: 'b', kind: 'qrs' });
    expect(played.map((p) => p.tone.id)).toEqual(['a']);
    expect(played[0]!.when).toBeCloseTo(1.05, 12);
    now.v = 1420;
    s.pump();
    expect(played.map((p) => p.tone.id)).toEqual(['a', 'b']);
  });

  it('plays a tone up to 30 ms late immediately and drops a later one', () => {
    const now = { v: 2000 };
    const { s, played } = setup(now);
    s.enqueue({ t: 1.98, id: 'late20', kind: 'qrs' });
    s.enqueue({ t: 1.9, id: 'late100', kind: 'qrs' });
    expect(played.map((p) => p.tone.id)).toEqual(['late20']);
    expect(played[0]!.when).toBeCloseTo(2, 12);
    expect(s.log.find((l) => l.id === 'late100')!.dropped).toBe(true);
  });

  it('toneCancel revokes queued tones after the given sim time', () => {
    const now = { v: 0 };
    const { s, played } = setup(now);
    s.enqueue({ t: 0.5, id: 'x', kind: 'qrs' });
    s.enqueue({ t: 0.9, id: 'y', kind: 'qrs' });
    s.cancelAfter(0.6);
    expect(s.pending).toBe(1);
    now.v = 1000;
    s.pump();
    expect(played).toHaveLength(0); // x was 500 ms late → dropped, y cancelled
  });

  it('follows the time scale (beeps follow sim time)', () => {
    const now = { v: 0 };
    const { s, played } = setup(now);
    s.clock.setAnchor({ simT: 0, perfMs: 0, timeScale: 2 });
    s.enqueue({ t: 0.1, id: 'a', kind: 'qrs' });
    expect(played[0]!.when).toBeCloseTo(0.05, 12);
  });

  it('beep envelope: 5 ms attack, 60 ms total, back to zero', () => {
    const env = beepEnvelope(0.5);
    expect(env[1]).toEqual([0.005, 0.5]);
    expect(env[env.length - 1]).toEqual([BEEP_MS / 1000, 0]);
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `pnpm --filter @pme/audio exec vitest run`
Expected: FAIL — cannot load `clock-map.ts` / `scheduler.ts`.

- [ ] **Step 3: Implement**

`packages/audio/src/clock-map.ts`:
```ts
// Sim time → wall time → audio time (brief §3.6 "Clock mapping"; web.dev "A tale of two clocks").
//   wallMs(t) = anchorWall + (t − anchorSim) · 1000 / timeScale
//   audioTime(wallMs) = contextTime + (wallMs − performanceTime) / 1000   (AudioContext.getOutputTimestamp)

export interface Anchor {
  simT: number; // sim seconds shown on screen at perfMs
  perfMs: number; // main-thread performance.now() of that frame
  timeScale: number;
}

export interface OutputTimestamp {
  contextTime: number; // seconds
  performanceTime: number; // ms, performance.now() timebase
}

export class ClockMap {
  private anchor: Anchor | null = null;

  setAnchor(a: Anchor): void {
    this.anchor = { ...a };
  }

  get hasAnchor(): boolean {
    return this.anchor !== null;
  }

  /** performance.now() time (ms) at which sim time t reaches the screen. */
  simToPerfMs(t: number): number {
    const a = this.anchor;
    if (!a) throw new Error('ClockMap: no anchor yet');
    return a.perfMs + ((t - a.simT) * 1000) / a.timeScale;
  }
}

/** Map a performance.now() time to the audio clock using an output timestamp. */
export function perfToAudioTime(perfMs: number, ts: OutputTimestamp): number {
  return ts.contextTime + (perfMs - ts.performanceTime) / 1000;
}
```

`packages/audio/src/scheduler.ts`:
```ts
// Look-ahead tone scheduler (brief §3.6): a 25 ms timer schedules every tone due in the next 100 ms on
// the audio clock. Tones are also tried the moment they arrive. A tone up to 30 ms late plays at once;
// a later one is dropped [ENG]. toneCancel revokes queued tones after a sim time.
import { ClockMap } from './clock-map.ts';

export const TIMER_MS = 25;
export const LOOKAHEAD_S = 0.1;
export const MAX_LATE_S = 0.03;

export interface ToneRequest {
  t: number; // sim seconds
  id: string;
  kind: string;
  freqHz?: number;
}

export interface SchedulerDeps {
  /** Current audio clock (AudioContext.currentTime). */
  audioNow(): number;
  /** Map main-thread performance ms to audio time (uses getOutputTimestamp). */
  perfToAudio(perfMs: number): number;
  /** Actually start the sound at audio time `when`. */
  play(tone: ToneRequest, when: number): void;
}

export interface ToneLogEntry {
  id: string;
  kind: string;
  simT: number;
  when: number; // audio time it was scheduled for
  lateS: number; // > 0 when played late
  dropped: boolean;
}

export class ToneScheduler {
  readonly clock = new ClockMap();
  readonly log: ToneLogEntry[] = [];
  private queue: ToneRequest[] = [];
  private readonly deps: SchedulerDeps;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(deps: SchedulerDeps) {
    this.deps = deps;
  }

  start(): void {
    if (this.timer === null) this.timer = setInterval(() => this.pump(), TIMER_MS);
  }

  stop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  enqueue(tone: ToneRequest): void {
    this.queue.push(tone);
    this.queue.sort((a, b) => a.t - b.t);
    this.pump();
  }

  /** Revoke every queued tone with t > after (engine `toneCancel`). */
  cancelAfter(after: number): void {
    this.queue = this.queue.filter((q) => q.t <= after);
  }

  get pending(): number {
    return this.queue.length;
  }

  /** Schedule everything due within the look-ahead window. */
  pump(): void {
    if (!this.clock.hasAnchor) return;
    const now = this.deps.audioNow();
    while (this.queue.length > 0) {
      const tone = this.queue[0] as ToneRequest;
      const when = this.deps.perfToAudio(this.clock.simToPerfMs(tone.t));
      if (when > now + LOOKAHEAD_S) break;
      this.queue.shift();
      const late = now - when;
      if (late > MAX_LATE_S) {
        this.log.push({ id: tone.id, kind: tone.kind, simT: tone.t, when, lateS: late, dropped: true });
        continue;
      }
      const at = Math.max(when, now);
      this.deps.play(tone, at);
      this.log.push({ id: tone.id, kind: tone.kind, simT: tone.t, when: at, lateS: Math.max(0, late), dropped: false });
      if (this.log.length > 500) this.log.splice(0, this.log.length - 500);
    }
  }
}
```

`packages/audio/src/tones.ts`:
```ts
// QRS / pulse beep (brief §3.6): 60 ms, sine plus 2nd harmonic, 5 ms attack and release [ENG].
// Stage 1 plays a fixed 880 Hz; Stage 3 adds pitch(SpO2) = 880·2^(−(100 − SpO2)·s/12).

export const BEEP_MS = 60;
export const BEEP_RAMP_MS = 5;
export const BEEP_HARMONIC2 = 0.3; // relative amplitude of the 2nd harmonic [ENG]

/** Envelope breakpoints [time offset s, gain] for a beep of peak gain g. */
export function beepEnvelope(g: number): Array<[number, number]> {
  const d = BEEP_MS / 1000;
  const r = BEEP_RAMP_MS / 1000;
  return [
    [0, 0],
    [r, g],
    [d - r, g],
    [d, 0],
  ];
}

export function playBeep(ctx: BaseAudioContext, dest: AudioNode, when: number, freqHz: number, gain = 0.25): void {
  const osc = ctx.createOscillator();
  const wave = ctx.createPeriodicWave(new Float32Array([0, 0, 0]), new Float32Array([0, 1, BEEP_HARMONIC2]));
  osc.setPeriodicWave(wave);
  osc.frequency.value = freqHz;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, when);
  for (const [dt, g] of beepEnvelope(gain)) env.gain.linearRampToValueAtTime(g, when + dt);
  osc.connect(env).connect(dest);
  osc.start(when);
  osc.stop(when + BEEP_MS / 1000 + 0.01);
}
```

`packages/audio/src/context.ts`:
```ts
// Audio context creation and unlock (brief §3.6; research 05 §3.2, §5.5):
// the AudioContext is created AND resumed inside the first user gesture; on iOS a looping silent
// <audio> element keeps Web Audio playing when the ring/silent switch is on (the keep-alive workaround).

export interface AudioOut {
  readonly ctx: AudioContext;
  readonly master: GainNode;
  /** getOutputTimestamp-based mapping from performance.now() ms to audio time. */
  perfToAudio(perfMs: number): number;
}

/** A 0.5 s silent 8 kHz mono 8-bit WAV as a data URI (no external file needed). */
export function silentWavDataUri(): string {
  const n = 4000;
  const bytes = new Uint8Array(44 + n);
  const v = new DataView(bytes.buffer);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + n, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, 8000, true);
  v.setUint32(28, 8000, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true);
  str(36, 'data');
  v.setUint32(40, n, true);
  bytes.fill(128, 44); // 8-bit silence
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return `data:audio/wav;base64,${btoa(bin)}`;
}

/** Must be called from a user-gesture handler (click/touch). */
export async function unlockAudio(): Promise<AudioOut> {
  const keepAlive = document.createElement('audio');
  keepAlive.setAttribute('playsinline', '');
  keepAlive.loop = true;
  keepAlive.src = silentWavDataUri();
  void keepAlive.play().catch(() => undefined);
  const ctx = new AudioContext({ latencyHint: 'interactive' });
  await ctx.resume();
  const master = ctx.createGain();
  master.connect(ctx.destination);
  const perfToAudio = (perfMs: number): number => {
    const ts = ctx.getOutputTimestamp?.();
    if (ts && ts.contextTime !== undefined && ts.performanceTime !== undefined && ts.performanceTime > 0) {
      return ts.contextTime + (perfMs - ts.performanceTime) / 1000;
    }
    return ctx.currentTime + (perfMs - performance.now()) / 1000 + ctx.baseLatency;
  };
  return { ctx, master, perfToAudio };
}
```

`packages/audio/src/index.ts`:
```ts
export const version = '0.0.0';
export * from './clock-map.ts';
export * from './scheduler.ts';
export * from './tones.ts';
export * from './context.ts';
```

- [ ] **Step 4: Run to see them pass**

Run: `pnpm --filter @pme/audio test && pnpm --filter @pme/audio typecheck`
Expected: PASS — 3 files (version, clock-map, scheduler), 8 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/audio
git commit -m "feat(audio): sim→wall→audio clock map, look-ahead tone scheduler, QRS beep, gesture unlock" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 20: Worker entry, worker host, frame pump and fallbacks

**Files:**
- Create: `packages/renderer/src/vite-env.d.ts`, `packages/renderer/src/engine.worker.ts`, `packages/renderer/src/worker-host.ts`
- Modify: `packages/renderer/package.json` (add `@pme/audio` dependency for Task 21)

**Interfaces:**
- Consumes: `MonitorCore` (Task 17), protocol types (Task 17), `Ctx2D` (Task 16).
- Produces: `type RenderPath = 'worker-raf'|'worker-pump'|'main'`, `type EventsHandler = (anchor: ClockAnchor, events: EngineEvent[]) => void`, `type ControlMsg` (resize | timeScale | pause | resume | fps | calibrate), `READY_TIMEOUT_MS = 2000`, `interface Host { readonly canvas; readonly path: Promise<RenderPath>; command(cmd): Promise<DispatchResult>; control(msg); destroy() }`, `canUseWorker()`, `createHost(canvas, size, opts, worker: 'auto'|'off', onEvents): Promise<Host>`.
  Paths: worker with its own rAF → `'worker-raf'`; worker without rAF (main posts each rAF timestamp) → `'worker-pump'`; no `Worker`/`OffscreenCanvas`, blob worker blocked, or no `ready` within 2 s → `'main'` (the transferred canvas is replaced by a fresh clone). Hidden tab: drawing stops and a 1 s interval calls `catchUp` so sim time keeps running (brief §3.3).

This task has no unit test (browser-only APIs); it is verified by type-checking, the IIFE build, and the Playwright smoke in Task 21.

- [ ] **Step 1: Add the Vite client types and the worker entry**

`packages/renderer/src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
```

`packages/renderer/src/engine.worker.ts`:
```ts
// Worker entry: engine + renderer on an OffscreenCanvas (brief §3.4). Uses the worker's own
// requestAnimationFrame when it exists, otherwise waits for 'frame' messages from the main thread.
import { MonitorCore } from './monitor-core.ts';
import type { Ctx2D } from './ctx.ts';
import type { FromWorker, ToWorker } from './protocol.ts';

interface WorkerScope {
  postMessage(msg: FromWorker): void;
  onmessage: ((ev: MessageEvent<ToWorker>) => void) | null;
  requestAnimationFrame?: (cb: (t: number) => void) => number;
}

const scope = self as unknown as WorkerScope;
let core: MonitorCore | null = null;
let useRaf = false;

function loop(t: number): void {
  core?.frame(performance.timeOrigin + t);
  scope.requestAnimationFrame?.(loop);
}

scope.onmessage = (ev) => {
  const m = ev.data;
  try {
    switch (m.type) {
      case 'init': {
        const ctx = m.canvas.getContext('2d', { alpha: false, desynchronized: true }) as unknown as Ctx2D;
        core = new MonitorCore(m.canvas, ctx, m.size, m.opts, (anchor, events) => scope.postMessage({ type: 'events', anchor, events }));
        useRaf = !m.mainPump && typeof scope.requestAnimationFrame === 'function';
        scope.postMessage({ type: 'ready', path: useRaf ? 'worker-raf' : 'worker-pump' });
        if (useRaf) scope.requestAnimationFrame?.(loop);
        return;
      }
      case 'frame':
        if (!useRaf) core?.frame(m.epochMs);
        return;
      case 'catchUp':
        core?.catchUp(m.epochMs);
        return;
      case 'command': {
        const result = core ? core.command(m.cmd) : { accepted: false, tick: 0, reason: 'not initialised' };
        scope.postMessage({ type: 'result', reqId: m.reqId, result });
        return;
      }
      case 'resize':
        core?.resize(m.size);
        return;
      case 'timeScale':
        if (core) core.clock.timeScale = m.k;
        return;
      case 'pause':
        core?.clock.pause();
        return;
      case 'resume':
        core?.clock.resume();
        return;
      case 'fps':
        core?.setFps(m.fps);
        return;
      case 'calibrate':
        core?.calibrate(m.pxPerMm);
        return;
      case 'visible':
        core?.setVisible(m.visible);
        return;
    }
  } catch (err) {
    scope.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
```

- [ ] **Step 2: Write the host**

`packages/renderer/src/worker-host.ts`:
```ts
// Main-thread side of the engine+renderer (brief §3.4): an OffscreenCanvas worker when possible, the same
// MonitorCore on the main thread otherwise. Frame pump: the worker's own rAF if it has one, else the main
// thread posts every rAF timestamp. While the tab is hidden a 1 s interval advances sim time in bulk.
import type { Command, DispatchResult, EngineEvent } from '@pme/engine-core';
import EngineWorker from './engine.worker.ts?worker&inline';
import type { Ctx2D } from './ctx.ts';
import { MonitorCore } from './monitor-core.ts';
import type { ClockAnchor, CoreOptions, FromWorker, Size, ToWorker } from './protocol.ts';

export type RenderPath = 'worker-raf' | 'worker-pump' | 'main';
export type EventsHandler = (anchor: ClockAnchor, events: EngineEvent[]) => void;
export type ControlMsg = Extract<ToWorker, { type: 'resize' | 'timeScale' | 'pause' | 'resume' | 'fps' | 'calibrate' }>;

export const READY_TIMEOUT_MS = 2000;
const HIDDEN_PUMP_MS = 1000;

export interface Host {
  readonly canvas: HTMLCanvasElement;
  readonly path: Promise<RenderPath>;
  command(cmd: Command): Promise<DispatchResult>;
  control(msg: ControlMsg): void;
  destroy(): void;
}

export function canUseWorker(): boolean {
  return (
    typeof Worker !== 'undefined' &&
    typeof HTMLCanvasElement !== 'undefined' &&
    'transferControlToOffscreen' in HTMLCanvasElement.prototype
  );
}

const epochNow = (t: number = performance.now()): number => performance.timeOrigin + t;

function mainHost(canvas: HTMLCanvasElement, size: Size, opts: CoreOptions, onEvents: EventsHandler): Host {
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }) as unknown as Ctx2D;
  const core = new MonitorCore(canvas, ctx, size, opts, onEvents);
  let raf = 0;
  let hiddenTimer: ReturnType<typeof setInterval> | null = null;
  const loop = (t: number) => {
    core.frame(epochNow(t));
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  const onVis = () => {
    const hidden = document.visibilityState === 'hidden';
    core.setVisible(!hidden);
    if (hidden && hiddenTimer === null) hiddenTimer = setInterval(() => core.catchUp(epochNow()), HIDDEN_PUMP_MS);
    if (!hidden && hiddenTimer !== null) {
      clearInterval(hiddenTimer);
      hiddenTimer = null;
      core.catchUp(epochNow());
    }
  };
  document.addEventListener('visibilitychange', onVis);
  return {
    canvas,
    path: Promise.resolve('main'),
    command: (cmd) => Promise.resolve(core.command(cmd)),
    control: (m) => {
      if (m.type === 'resize') core.resize(m.size);
      else if (m.type === 'timeScale') core.clock.timeScale = m.k;
      else if (m.type === 'pause') core.clock.pause();
      else if (m.type === 'resume') core.clock.resume();
      else if (m.type === 'fps') core.setFps(m.fps);
      else core.calibrate(m.pxPerMm);
    },
    destroy: () => {
      cancelAnimationFrame(raf);
      if (hiddenTimer !== null) clearInterval(hiddenTimer);
      document.removeEventListener('visibilitychange', onVis);
    },
  };
}

function workerHost(canvas: HTMLCanvasElement, size: Size, opts: CoreOptions, onEvents: EventsHandler): Host {
  const worker = new EngineWorker();
  const offscreen = canvas.transferControlToOffscreen();
  const pending = new Map<number, (r: DispatchResult) => void>();
  let reqId = 0;
  let raf = 0;
  let pumping = false;
  let hiddenTimer: ReturnType<typeof setInterval> | null = null;
  const post = (m: ToWorker, transfer: Transferable[] = []) => worker.postMessage(m, transfer);
  const path = new Promise<RenderPath>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('worker did not become ready')), READY_TIMEOUT_MS);
    worker.onmessage = (ev: MessageEvent<FromWorker>) => {
      const m = ev.data;
      if (m.type === 'ready') {
        clearTimeout(timer);
        pumping = m.path === 'worker-pump';
        resolve(m.path);
      } else if (m.type === 'events') onEvents(m.anchor, m.events);
      else if (m.type === 'result') {
        pending.get(m.reqId)?.(m.result);
        pending.delete(m.reqId);
      } else {
        clearTimeout(timer);
        reject(new Error(m.message));
      }
    };
    worker.onerror = (e) => {
      clearTimeout(timer);
      reject(new Error(e.message));
    };
  });
  const loop = (t: number) => {
    if (pumping) post({ type: 'frame', epochMs: epochNow(t) });
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  const onVis = () => {
    const hidden = document.visibilityState === 'hidden';
    post({ type: 'visible', visible: !hidden });
    if (hidden && hiddenTimer === null) hiddenTimer = setInterval(() => post({ type: 'catchUp', epochMs: epochNow() }), HIDDEN_PUMP_MS);
    if (!hidden && hiddenTimer !== null) {
      clearInterval(hiddenTimer);
      hiddenTimer = null;
      post({ type: 'catchUp', epochMs: epochNow() });
    }
  };
  document.addEventListener('visibilitychange', onVis);
  post({ type: 'init', canvas: offscreen, size, opts, mainPump: false }, [offscreen]);
  return {
    canvas,
    path,
    command: (cmd) =>
      new Promise<DispatchResult>((resolve) => {
        const id = ++reqId;
        pending.set(id, resolve);
        post({ type: 'command', reqId: id, cmd });
      }),
    control: (m) => post(m),
    destroy: () => {
      cancelAnimationFrame(raf);
      if (hiddenTimer !== null) clearInterval(hiddenTimer);
      document.removeEventListener('visibilitychange', onVis);
      worker.terminate();
    },
  };
}

/**
 * Create the host. With worker 'auto' it tries the OffscreenCanvas worker; if that fails before
 * 'ready', the transferred canvas is replaced by a fresh one and the main-thread path takes over.
 */
export function createHost(
  canvas: HTMLCanvasElement,
  size: Size,
  opts: CoreOptions,
  worker: 'auto' | 'off',
  onEvents: EventsHandler,
): Promise<Host> {
  if (worker === 'off' || !canUseWorker()) return Promise.resolve(mainHost(canvas, size, opts, onEvents));
  let h: Host;
  try {
    h = workerHost(canvas, size, opts, onEvents);
  } catch {
    return Promise.resolve(mainHost(canvas, size, opts, onEvents));
  }
  return h.path.then(
    () => h,
    () => {
      h.destroy();
      const fresh = canvas.cloneNode(false) as HTMLCanvasElement;
      canvas.replaceWith(fresh);
      return mainHost(fresh, size, opts, onEvents);
    },
  );
}
```

- [ ] **Step 3: Add the audio dependency**

`packages/renderer/package.json` (final):
```json
{
  "name": "@pme/renderer",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run --passWithNoTests",
    "build": "vite build"
  },
  "dependencies": {
    "@pme/audio": "workspace:*",
    "@pme/engine-core": "workspace:*"
  }
}
```

Run: `pnpm install`
Expected: `Done`; `pnpm-lock.yaml` updated.

- [ ] **Step 4: Type-check**

Run: `pnpm --filter @pme/renderer typecheck && pnpm --filter @pme/renderer test`
Expected: clean; all renderer tests still pass.

- [ ] **Step 5: Commit**

```bash
git add packages/renderer pnpm-lock.yaml
git commit -m "feat(renderer): OffscreenCanvas worker host with worker-rAF, frame-pump and main-thread fallbacks" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 21: `mountMonitor` (minimal), IIFE exports and the extended smoke test

**Files:**
- Create: `packages/renderer/src/mount.ts`
- Modify: `packages/renderer/src/index.ts`, `apps/demo/e2e/iife-smoke.e2e.ts`

**Interfaces:**
- Consumes: Tasks 17–20; `playBeep`, `ToneScheduler`, `unlockAudio`, `ToneLogEntry` from `@pme/audio`.
- Produces: `interface MountOptions { engine?; skin?: string /* only 'philips-like' in Stage 1 */; layout?; worker?: 'auto'|'off'; lanes?: LeadId[]; fps?: 60|30; pxPerMm? }`, `interface MonitorHandle { dispatch(cmd): Promise<DispatchResult>; on(fn): () => void; calibrate(pxPerMm); enableSound(): Promise<void>; setTimeScale(k); pause(); resume(); setFps(fps); destroy(); readonly renderPath: Promise<RenderPath>; readonly audioLog: readonly ToneLogEntry[]; readonly engine: { dispatch } }`, `mountMonitor(el, opts?): MonitorHandle`. Renderer index exports `version`, `createEngine`, `mountMonitor`, `transports` (an empty registry until Stage 6), plus the lane/geometry modules. The IIFE global therefore has keys `mountMonitor`, `createEngine`, `transports`, `version` (brief §7.6).

- [ ] **Step 1: Extend the smoke test first**

`apps/demo/e2e/iife-smoke.e2e.ts` (replace):
```ts
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';

const smokeUrl = pathToFileURL(resolve(import.meta.dirname, 'iife-smoke.html')).href;

type PM = {
  version?: string;
  createEngine?: unknown;
  transports?: unknown;
  mountMonitor?: (el: HTMLElement, o: object) => { renderPath: Promise<string> };
};

test('the IIFE loads from file:// and exposes window.PatientMonitor.version', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(smokeUrl);
  const version = await page.evaluate(() => (window as unknown as { PatientMonitor?: PM }).PatientMonitor?.version);
  expect(version).toBe('0.0.0');
  expect(errors).toEqual([]);
});

test('Stage 1: mountMonitor draws two ECG lanes and an HR number from file://', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(smokeUrl);
  const shape = await page.evaluate(() => {
    const pm = (window as unknown as { PatientMonitor: PM }).PatientMonitor;
    return [typeof pm.mountMonitor, typeof pm.createEngine, typeof pm.transports];
  });
  expect(shape).toEqual(['function', 'function', 'object']);
  const path = await page.evaluate(async () => {
    const pm = (window as unknown as { PatientMonitor: PM }).PatientMonitor;
    const h = pm.mountMonitor!(document.getElementById('pm')!, { skin: 'philips-like', engine: { seed: 1 } });
    return h.renderPath;
  });
  expect(['worker-raf', 'worker-pump', 'main']).toContain(path);
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.locator('.pme-tile')).toContainText(/HR[\s\S]*\d{2,3}/, { timeout: 15_000 });
  expect(errors).toEqual([]);
});
```

Run: `pnpm build && PW_SYSTEM_CHROME=1 pnpm test:e2e`
Expected: the Stage 0 test passes; the Stage 1 test FAILS (`typeof mountMonitor` is `'undefined'`).

- [ ] **Step 2: Implement `mountMonitor`**

`packages/renderer/src/mount.ts`:
```ts
// mountMonitor (brief §7.6), Stage 1 minimal: two ECG lanes + HR tile, hard-coded dark theme, QRS beep.
// Skins (setSkin), the instructor panel and transports arrive in Stages 4 and 6.
import { playBeep, ToneScheduler, unlockAudio, type ToneLogEntry } from '@pme/audio';
import type { Command, DispatchResult, EngineEvent, EngineOptions, LeadId } from '@pme/engine-core';
import { NumericTile } from './numerics-dom.ts';
import type { ClockAnchor, Size } from './protocol.ts';
import { createHost, type Host, type RenderPath } from './worker-host.ts';

export interface MountOptions {
  engine?: EngineOptions;
  /** Stage 1 accepts only 'philips-like' (hard-coded dark theme). */
  skin?: string;
  layout?: string;
  worker?: 'auto' | 'off';
  lanes?: LeadId[];
  fps?: 60 | 30;
  pxPerMm?: number;
}

export interface MonitorHandle {
  dispatch(cmd: Command): Promise<DispatchResult>;
  on(fn: (e: EngineEvent) => void): () => void;
  calibrate(pxPerMm: number): void;
  /** Must be called from a user gesture (brief §3.6). */
  enableSound(): Promise<void>;
  setTimeScale(k: number): void;
  pause(): void;
  resume(): void;
  setFps(fps: 60 | 30): void;
  destroy(): void;
  /** Which render path is running (worker rAF, worker with main-thread frame pump, or main thread). */
  readonly renderPath: Promise<RenderPath>;
  /** Scheduled/dropped tones, for diagnostics (beep − R alignment). */
  readonly audioLog: readonly ToneLogEntry[];
  /** Worker proxy (brief §7.6 `engine`). */
  readonly engine: { dispatch(cmd: Command): Promise<DispatchResult> };
}

const TILE_W = 190;

export function mountMonitor(el: HTMLElement, opts: MountOptions = {}): MonitorHandle {
  if (opts.skin && opts.skin !== 'philips-like') throw new Error(`skin ${opts.skin} arrives in Stage 4`);
  const doc = el.ownerDocument;
  const root = doc.createElement('div');
  root.style.cssText = 'display:flex;width:100%;height:100%;background:#000;overflow:hidden;';
  const wrap = doc.createElement('div');
  wrap.style.cssText = 'flex:1;position:relative;min-width:0;';
  const canvas = doc.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  wrap.append(canvas);
  const tiles = doc.createElement('div');
  tiles.style.cssText = `width:${TILE_W}px;flex:none;border-left:1px solid #222;`;
  root.append(wrap, tiles);
  el.append(root);
  const hrTile = new NumericTile(tiles, { label: 'HR', unit: 'bpm', color: '#00ff66' });

  const listeners = new Set<(e: EngineEvent) => void>();
  let scheduler: ToneScheduler | null = null;
  const onEvents = (anchor: ClockAnchor, events: EngineEvent[]) => {
    scheduler?.clock.setAnchor({ simT: anchor.simT, perfMs: anchor.epochMs - performance.timeOrigin, timeScale: anchor.timeScale });
    for (const e of events) {
      if (e.type === 'measurement' && e.values.hr) hrTile.update(e.values.hr);
      if (e.type === 'tone') scheduler?.enqueue({ t: e.t, id: e.id, kind: e.kind, ...(e.freqHz !== undefined ? { freqHz: e.freqHz } : {}) });
      if (e.type === 'toneCancel') scheduler?.cancelAfter(e.after);
      for (const fn of listeners) fn(e);
    }
  };

  const sizeOf = (): Size => ({
    cssW: Math.max(200, wrap.clientWidth),
    cssH: Math.max(100, wrap.clientHeight),
    dpr: globalThis.devicePixelRatio || 1,
  });
  const coreOpts = {
    ...(opts.engine ? { engine: opts.engine } : {}),
    ...(opts.lanes ? { lanes: opts.lanes } : {}),
    ...(opts.fps ? { fps: opts.fps } : {}),
    ...(opts.pxPerMm ? { pxPerMm: opts.pxPerMm } : {}),
  };
  const hostP: Promise<Host> = createHost(canvas, sizeOf(), coreOpts, opts.worker ?? 'auto', onEvents);

  // Resize and DPR changes (brief §3.5: backing store = CSS size × DPR; watch DPR through matchMedia).
  const ro = new ResizeObserver(() => void hostP.then((h) => h.control({ type: 'resize', size: sizeOf() })));
  ro.observe(wrap);
  let mq: MediaQueryList | null = null;
  const watchDpr = () => {
    mq?.removeEventListener('change', onDpr);
    mq = matchMedia(`(resolution: ${globalThis.devicePixelRatio || 1}dppx)`);
    mq.addEventListener('change', onDpr);
  };
  const onDpr = () => {
    void hostP.then((h) => h.control({ type: 'resize', size: sizeOf() }));
    watchDpr();
  };
  watchDpr();

  const dispatch = (cmd: Command) => hostP.then((h) => h.command(cmd));
  return {
    dispatch,
    on(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    calibrate: (pxPerMm) => void hostP.then((h) => h.control({ type: 'calibrate', pxPerMm })),
    async enableSound() {
      if (scheduler) return;
      const out = await unlockAudio();
      scheduler = new ToneScheduler({
        audioNow: () => out.ctx.currentTime,
        perfToAudio: out.perfToAudio,
        play: (tone, when) => playBeep(out.ctx, out.master, when, tone.freqHz ?? 880),
      });
      scheduler.start();
    },
    setTimeScale: (k) => void hostP.then((h) => h.control({ type: 'timeScale', k })),
    pause: () => void hostP.then((h) => h.control({ type: 'pause' })),
    resume: () => void hostP.then((h) => h.control({ type: 'resume' })),
    setFps: (fps) => void hostP.then((h) => h.control({ type: 'fps', fps })),
    destroy() {
      ro.disconnect();
      mq?.removeEventListener('change', onDpr);
      scheduler?.stop();
      void hostP.then((h) => h.destroy());
      root.remove();
    },
    renderPath: hostP.then((h) => h.path),
    get audioLog() {
      return scheduler?.log ?? [];
    },
    engine: { dispatch },
  };
}
```

`packages/renderer/src/index.ts`:
```ts
// @pme/renderer public API. The IIFE build exposes this module as window.PatientMonitor (brief §7.6).
export const version = '0.0.0';
export { createEngine } from '@pme/engine-core';
export * from './calibration.ts';
export * from './decimate.ts';
export { SweepLane, type LaneConfig, type SampleSource } from './sweep-lane.ts';
export { MonitorCore } from './monitor-core.ts';
export { NumericTile, formatNumeric } from './numerics-dom.ts';
export { mountMonitor, type MonitorHandle, type MountOptions } from './mount.ts';
export type { RenderPath } from './worker-host.ts';
/** Transport adapters arrive in Stage 6 (brief §7.5); the key exists so the IIFE global has its final shape. */
export const transports: Record<string, never> = {};
```

- [ ] **Step 3: Build and check the IIFE shape**

Run: `pnpm typecheck && pnpm build`
Then:
```bash
node -e "const vm=require('vm');const fs=require('fs');const c={};vm.createContext(c);vm.runInContext(fs.readFileSync('packages/renderer/dist/patient-monitor.iife.js','utf8'),c);console.log(['mountMonitor','createEngine','transports','version'].map(k=>k+':'+typeof c.PatientMonitor[k]).join(' '))"
grep -c 'new Worker' packages/renderer/dist/patient-monitor.iife.js
```
Expected: `mountMonitor:function createEngine:function transports:object version:string`; the grep count ≥ 1 (the worker is inlined as a blob, with a `data:` URL fallback, so it works from `file://`).

- [ ] **Step 4: Run the smoke test green**

Run: `PW_SYSTEM_CHROME=1 pnpm test:e2e` (CI runs Chromium and WebKit)
Expected: `2 passed` per project; the HR tile shows a 2–3 digit number within 15 s.

- [ ] **Step 5: Commit**

```bash
git add packages/renderer apps/demo/e2e
git commit -m "feat(renderer): minimal mountMonitor and IIFE global { mountMonitor, createEngine, transports, version }" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 22: `stage1.html` demo

**Files:**
- Create: `apps/demo/stage1.html`, `apps/demo/src/stage1.ts`
- Modify: `apps/demo/vite.config.ts`, `apps/demo/index.html`

**Interfaces:**
- Consumes: `mountMonitor` (Task 21); `Command`, `RhythmId`, `RhythmOpts` types.
- Produces: the page BUILD-PLAN specifies — dark monitor, lanes II and V5 at 25 mm/s and 10 mm/mV with lead labels, filter letter and 1 mV calibration bars; green HR tile updating at 1 Hz; rhythm dropdown (all 12 rhythms, flutter as 2:1 / 4:1 / variable); HR slider with ramp 0/10/30 s; PVC bigeminy toggle; Monitor/Diagnostic filter toggle; "Enable sound"; 30 fps toggle; a diagnostics line with the render path, beep − R statistics from the audio log and JS heap size.

- [ ] **Step 1: Write the page**

`apps/demo/stage1.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stage 1: ECG + sweep + beep</title>
    <style>
      body { background: #000; color: #ccc; font: 14px system-ui, sans-serif; margin: 12px; }
      #monitor { height: 420px; max-width: 1240px; border: 1px solid #333; }
      .controls { display: flex; flex-wrap: wrap; gap: 12px 20px; align-items: center; margin: 12px 0; max-width: 1240px; }
      .controls label { display: inline-flex; gap: 6px; align-items: center; }
      button, select { font: inherit; }
      button[aria-pressed='true'] { background: #2a2; color: #000; }
      #diag { font: 13px ui-monospace, monospace; white-space: pre; color: #8f8; }
    </style>
  </head>
  <body>
    <div id="monitor"></div>
    <div class="controls">
      <label>Rhythm <select id="rhythm"></select></label>
      <label>HR <input id="hr" type="range" min="20" max="250" value="75" /> <span id="hrVal">75</span> bpm</label>
      <label>Ramp <select id="ramp"><option value="0">0 s</option><option value="10">10 s</option><option value="30">30 s</option></select></label>
      <button id="pvc" aria-pressed="false">PVC bigeminy</button>
      <button id="filter" aria-pressed="false">Filter: Monitor</button>
      <button id="sound">Enable sound</button>
      <button id="fps30" aria-pressed="false">30 fps</button>
    </div>
    <div id="diag"></div>
    <script type="module" src="./src/stage1.ts"></script>
  </body>
</html>
```

`apps/demo/src/stage1.ts`:
```ts
import type { Command, RhythmId, RhythmOpts } from '@pme/engine-core';
import { mountMonitor } from '@pme/renderer';

const RHYTHM_MENU: Array<[string, RhythmId, RhythmOpts?]> = [
  ['Sinus', 'sinus'],
  ['Sinus bradycardia', 'sinusBrady'],
  ['Sinus tachycardia', 'sinusTachy'],
  ['Atrial fibrillation', 'afib'],
  ['Atrial flutter 2:1', 'aflutter', { ratio: 2 }],
  ['Atrial flutter 4:1', 'aflutter', { ratio: 4 }],
  ['Atrial flutter variable', 'aflutter', { ratio: 'variable' }],
  ['SVT (AVNRT)', 'svtAvnrt'],
  ['1st-degree AV block', 'avb1'],
  ['2nd-degree Mobitz I', 'avb2Mobitz1'],
  ['3rd-degree, narrow escape', 'avb3Narrow'],
  ['3rd-degree, wide escape', 'avb3Wide'],
  ['Monomorphic VT', 'vtMono'],
  ['Asystole', 'asystole'],
];

/** A Command without id/issuedBy (distributes over the union so each variant keeps its fields). */
type CommandBody = Command extends infer C ? (C extends Command ? Omit<C, 'id' | 'issuedBy'> : never) : never;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const pm = mountMonitor($('monitor'), { skin: 'philips-like', engine: { seed: 7 }, lanes: ['ecgII', 'V5'] });
let n = 0;
const send = (c: CommandBody) =>
  pm.dispatch({ id: `demo-${++n}`, issuedBy: 'stage1', ...c } as Command).then((r) => {
    if (!r.accepted) console.warn('rejected', c, r.reason);
    return r;
  });

const rhythmSel = $<HTMLSelectElement>('rhythm');
RHYTHM_MENU.forEach(([label], i) => rhythmSel.add(new Option(label, String(i))));
rhythmSel.addEventListener('change', () => {
  const [, rhythm, opts] = RHYTHM_MENU[Number(rhythmSel.value)]!;
  void send({ type: 'setRhythm', rhythm, ...(opts ? { opts } : {}), when: 'now' });
});

const hr = $<HTMLInputElement>('hr');
const hrVal = $('hrVal');
const ramp = $<HTMLSelectElement>('ramp');
hr.addEventListener('input', () => (hrVal.textContent = hr.value));
hr.addEventListener('change', () => {
  const durationS = Number(ramp.value);
  void send({ type: 'setTarget', variable: 'hr', value: Number(hr.value), ...(durationS > 0 ? { ramp: { durationS, curve: 'linear' } } : {}) });
});

const toggle = (id: string, on: (pressed: boolean) => void) => {
  const b = $<HTMLButtonElement>(id);
  b.addEventListener('click', () => {
    const pressed = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(pressed));
    on(pressed);
  });
  return b;
};
toggle('pvc', (p) => void send({ type: 'setModifiers', modifiers: { pvc: p ? { pattern: 'bigeminy', probability: 0 } : null } }));
const filterBtn = toggle('filter', (p) => {
  filterBtn.textContent = `Filter: ${p ? 'Diagnostic' : 'Monitor'}`;
  void send({ type: 'device', action: { device: 'ecg', action: 'filter', value: p ? 'diagnostic' : 'monitor' } });
});
toggle('fps30', (p) => pm.setFps(p ? 30 : 60));
const soundBtn = $<HTMLButtonElement>('sound');
soundBtn.addEventListener('click', () => {
  void pm.enableSound().then(() => {
    soundBtn.textContent = 'Sound on';
    soundBtn.disabled = true;
  });
});

// Diagnostics for the Gate 1 checklist: render path, beep − R, memory.
const beats: number[] = [];
let simT = 0;
pm.on((e) => {
  if (e.type === 'beat') {
    beats.push(e.t);
    if (beats.length > 200) beats.shift();
    simT = e.t;
  }
});
let path = '…';
void pm.renderPath.then((p) => (path = p));
setInterval(() => {
  const played = pm.audioLog.filter((l) => !l.dropped).slice(-20);
  const diffs = played
    .map((l) => l.simT - beats.reduce((b, x) => (Math.abs(x - l.simT) < Math.abs(b - l.simT) ? x : b), -1e9))
    .map((d) => d * 1000);
  const dropped = pm.audioLog.filter((l) => l.dropped).length;
  const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  $('diag').textContent =
    `render path: ${path}   last beat t=${simT.toFixed(2)} s\n` +
    (diffs.length
      ? `beep − R over last ${diffs.length}: min ${Math.min(...diffs).toFixed(0)} ms, mean ${(diffs.reduce((a, b) => a + b, 0) / diffs.length).toFixed(0)} ms, max ${Math.max(...diffs).toFixed(0)} ms; dropped tones ${dropped}\n`
      : 'beep − R: enable sound to measure\n') +
    (mem ? `JS heap: ${(mem.usedJSHeapSize / 1048576).toFixed(1)} MB` : 'JS heap: (not exposed by this browser)');
}, 1000);
```

- [ ] **Step 2: Register it**

`apps/demo/vite.config.ts` (final):
```ts
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Multi-page demo: one page per stage (BUILD-PLAN "Monorepo layout").
const page = (name: string) => resolve(import.meta.dirname, `${name}.html`);

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: { index: page('index'), stage0: page('stage0'), stage1: page('stage1') },
    },
  },
});
```

`apps/demo/index.html` (final):
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Patient-monitor engine demos</title>
    <style>
      body { background: #000; color: #ddd; font: 16px system-ui, sans-serif; margin: 2rem; }
      a { color: #4f4; }
    </style>
  </head>
  <body>
    <h1>Patient-monitor engine demos</h1>
    <ul>
      <li><a href="./stage0.html">Stage 0: sim-time sweep cursor</a></li>
      <li><a href="./stage1.html">Stage 1: ECG rhythm engine, sweep and beep</a></li>
    </ul>
  </body>
</html>
```

- [ ] **Step 3: Type-check, build, run**

Run: `pnpm typecheck && pnpm build && pnpm --filter @pme/demo dev`
Open `/stage1.html`. Expected within 3 s: sinus rhythm at 75 on both lanes, HR tile reads 74–76, diagnostics show `render path: worker-raf` in Chrome. Pick "Monomorphic VT": wide complexes at ~170 within one second; HR tile reaches 165–175 within ~11 s.

- [ ] **Step 4: Commit**

```bash
git add apps/demo
git commit -m "feat(demo): stage1 monitor with rhythm, HR ramp, PVC, filter, sound and 30 fps controls" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 23: Verify-before-gate and the Gate 1 visual checklist

**Files:**
- Create: `docs/gates/stage-1.md`

**Interfaces:**
- Consumes: everything above.
- Produces: the gate note (BUILD-PLAN "Definition of done" item 1).

- [ ] **Step 1: Verify-before-gate (brief §10).** Stage 1 uses no `[VERIFY]` number: the Dower rows and ECGSYN Table I were confirmed in research 03 §11 items 1 and 6; Weissler LVET is confirmed (item 8). Confirm by running `grep -rn "VERIFY" packages/engine-core/src` → no matches. Record in the gate note the two plan decisions that need a ruling: PR60 = 190 ms and the ProSim V1/V4 mismatch (plan header items 1–2).

- [ ] **Step 2: Clean-clone CI rehearsal.** `rm -rf /tmp/pme-ci && git clone "$(pwd)" /tmp/pme-ci && cd /tmp/pme-ci && pnpm install --frozen-lockfile && pnpm typecheck && pnpm test && pnpm build && pnpm check-notices; echo "exit $?"; cd -` → `exit 0`. Record the test totals.

- [ ] **Step 3: Visual checklist on a laptop (Chrome and Safari), `pnpm --filter @pme/demo dev` → `/stage1.html`:**
  1. QRS crisp, no stair-stepping (zoom the browser to 200% and look at the R upstroke).
  2. No gap or ghost trail at the wrap or at the erase gap (watch 3 full sweeps).
  3. Same sweep speed at 30 fps: stopwatch 10 s at 1× with "30 fps" on and off; the cursor moves 945 px ± 5% both times.
  4. Sound: click "Enable sound"; the beep is aligned with the QRS by ear; the diagnostics line shows beep − R min ≥ 20 ms and max ≤ 60 ms over 20 beats in sinus; `dropped tones 0`.
  5. Rhythms at arm's length: sinus, AF, flutter 2:1 and 4:1, CHB narrow/wide, VT look right; HR tile follows within ~6–11 s after a change and never updates faster than 1 Hz.
  6. PVC bigeminy toggle gives N-V-N-V with compensatory pauses; Diagnostic filter shows a more wandering baseline and the "D" letter.

- [ ] **Step 4: iPad Safari.** Serve on the LAN (`pnpm --filter @pme/demo dev --host`), open `/stage1.html` on the iPad, record the render path shown (`worker-raf`, `worker-pump` or `main` — brief §3.4 marks worker rAF on Safari as unverified), check that sound works after "Enable sound" with the ring/silent switch ON (keep-alive workaround).

- [ ] **Step 5: 10-minute soak.** In Chrome with sinus + PVC bigeminy, note "JS heap" at 1 min and at 11 min; growth must be ≤ 5 MB. (Safari does not expose heap size; use Web Inspector › Timelines › Memory instead.)

- [ ] **Step 6: Write `docs/gates/stage-1.md`**

```markdown
# Gate 1 — ECG vertical slice (date: YYYY-MM-DD)

Gate question: "At arm's length, do sinus, AF, flutter, CHB and VT look and sound like a monitor on a laptop and an iPad, and is the HR number behaving like a real device?"

| Check | Result |
|---|---|
| Clean clone typecheck/test/build/check-notices (test totals) | |
| Acceptance tests 1–12 (all in Vitest) | |
| QRS crisp, no stair-stepping | |
| No gap/ghost at wrap or erase gap | |
| Stopwatch 10 s at 60 fps / at 30 fps (px) | |
| Beep aligned by ear; beep − R min/mean/max (ms); dropped tones | |
| iPad Safari: render path; sound with silent switch on | |
| 10-min soak heap growth (MB) | |
| Rhythm look (sinus, AF, flutter, CHB, VT) — laptop / iPad | |
| HR tile response and update rate | |

Decisions needing a ruling: PR60 = 190 ms (test 3); ProSim V1/V4 ratios vs I = 70% (templates.ts).
Notes:
```

- [ ] **Step 7: Commit**

```bash
git add docs/gates/stage-1.md
git commit -m "docs(gates): stage 1 gate evidence" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

Stop here; Stage 2 starts only after the orchestrator's "yes" (R11).

---

## Acceptance-test index (BUILD-PLAN Stage 1 → where it lives)

| # | Test | File (task) |
|---|---|---|
| 1 | Sinus 60, HRV off: mean RR 1.000 ± 0.002 s over 60 beats | `test/l2/ecg/rhythm-sinus.test.ts` (5) |
| 2 | QT 400/317/295 ± 5 ms at 60/120/150 from kernel timing | `test/l2/ecg/rhythm-sinus.test.ts` (5) |
| 3 | P peak inside the preceding T at 150 bpm | `test/l2/ecg/rhythm-sinus.test.ts` (5) |
| 4 | III − (II − I) and aVR + aVL + aVF < 1e-6 mV at every sample | `test/l2/ecg/vcg.test.ts` (3), filtered lanes in `test/engine/engine-pipeline.test.ts` (13) |
| 5 | Mobitz I: decreasing increments, one drop per group, pause < 2·PP | `test/l2/ecg/rhythm-avblock.test.ts` (6) |
| 6 | avb3Narrow: KS p > 0.05, ventricular rate 40–60 | `test/l2/ecg/rhythm-avblock.test.ts` (6) |
| 7 | afib: CV 0.15–0.25, |lag-1 r| < 0.1, no P kernels | `test/l2/ecg/rhythm-atrial.test.ts` (7) |
| 8 | PVC: coupling + pause = 2·RR ± 10 ms; QRS 120–200 ms | `test/l2/ecg/rhythm-pvc.test.ts` (8) |
| 9 | HR 80 → 120 reaches 118–122 within 5–11 s; ≤ 1 update/s | `test/engine/engine-pipeline.test.ts` (13) |
| 10 | Same seed + commands → identical SHA-256 of 60 s ecgII | `test/engine/engine-pipeline.test.ts` (13) |
| 11 | advanceTo(86400) → latestSampleIndex(ecgII) = 43,200,000 + 50 | `test/engine/engine-pipeline.test.ts` (13) |
| 12 | 94.5 ± 0.1 px/s at 3.78 px/mm; decimation keeps the R max within 1 sample | `packages/renderer/test/decimate.test.ts` (15) |
