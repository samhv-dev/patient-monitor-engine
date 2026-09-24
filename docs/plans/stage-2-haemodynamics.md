# Stage 2: Haemodynamics (ABP/CVP/PAP, pleth, NIBP, pressure numerics) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Arterial, central-venous and pulmonary-artery pressure waves, a plethysmogram and a real oscillometric NIBP cycle, all driven by the mechanical beats of the Stage 1 rhythm engine, with measured-not-true device numerics (ABP S/D/M by integral, CVP, PAP, PR, PI, NIBP) and three new sweep lanes plus tiles in a `stage2.html` demo.

**Architecture:** A new L1 module holds the shared `PatientState` targets (ramps, pin/release, control flags). A new haemodynamic pipeline (`src/l2/hemo/pipeline.ts`) is called by the engine right after the ECG in every `advance()`: it reads the rhythm engine's `beat`/`atrial` records (never touching `l2/ecg/**`), turns each beat into an LV/RV ejection (k_rhythm → valve-opening factor E(k), Weissler PEP/LVET, respiratory PPV term, Frank–Starling carry-over), integrates a 4-element Windkessel + aorta→radial resonator + 3-element pulmonary Windkessel with RK4 at 2 ms, passes each pressure through a catheter/transducer model (fn/ζ, flush, zero, levelling …) and a 12 Hz display filter, writes 125 Hz samples by absolute index into ring buffers, and runs the L3 device layer (slope-sum pulse detection, per-beat S/D/M by integral, PR/PI, NIBP cuff state machine). A MANUAL tracker (coupling rule M2) adjusts stroke-volume gain and resistance so the TRUE site pressure meets the instructor's SBP/DBP. All state is plain JSON-safe data because the engine clones it every tick for the 100 ms look-ahead. The renderer gains opt-in waveform lanes (ABP red, pleth cyan, CVP blue, PAP yellow) on the existing `SweepLane` and new DOM tiles.

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2, Vite 6.4, Canvas 2D / OffscreenCanvas; Playwright (system Chrome) for the headless screenshots. No runtime dependencies.

**Spec:** `docs/DESIGN-BRIEF.md` §3 (tick, look-ahead, absolute sample index, 125 Hz, ring buffers, sweep), §4.2 (Windkessel, ejection, Weissler, site transfer, transducer, flush, CVP, PAP, arrest/CPR, PPV, numerics), §4.3 (pleth part only), §4.5 (NIBP), §4.8 (k_rhythm, f_fill), §4.9 (state schema, MANUAL, ramps, flags, pin/release, M1–M3, M6 PPV part), §6.1, §6.2, §6.3, §6.8 (colours, scales), §7.1–7.3 (exact names/types). `docs/BUILD-PLAN.md` "Stage 2" (scope, demo, 11 acceptance tests, gate question). Physiology: `../research/03-waveform-physiology-reference.md` §2, §3.1–3.4, §5, §8.2–8.3 and §11 (verification status). Rulings: `../research/00-orchestrator-rulings.md` (R1–R20; R15–R19 belong to the separate Stage 1.1 pass and are neither implemented nor contradicted here).

## Global Constraints

- Paths are relative to `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo`; run every command from there. Stage 1, the Stage 1.1 gate fixes (R15–R19, merge `e8f00f9`) and Stage 6a (controllers, merge `8e46032`) are on `main`; every find/replace block in this plan was checked to occur exactly once in `8e46032`. If `main` has moved, re-check each block before applying it.
- **Branch and PR (R20):** all work happens on branch `stage-2-haemodynamics` (Task 1 creates it from `main`); the last task pushes it and opens a pull request with `gh pr create`. Never push to `main`, never merge — Ali speaks the merge.
- **Parallel-work partition (binding).** Stage 5 (rhythm library) is being built at the same time on its own branch and owns `packages/engine-core/src/l2/ecg/**` and `packages/engine-core/templates/**`. Stage 6a (`packages/controller/**`, its demo pages) has already merged; this stage touches it only where the grown unions and the delivered engine `state` event require it (one source file, one test file; Tasks 1 and 13). This stage OWNS `src/l1/**`, `src/l2/hemo/**`, `src/l2/pleth/**`, `src/l3/nibp/**`, `src/l3/pressure-numerics/**`, `src/l3/pulse/**`, `src/types-hemo.ts`. Rules: **never edit `src/l2/ecg/**`** (read beats only through `RhythmState.records` and `RhythmState.id`); edits to `engine.ts`, `types.ts` and `index.ts` are ADDITIVE (new lines, each marked `// Stage 2`; no reordering or refactoring of existing code); new public type variants live in `src/types-hemo.ts` and are added to the existing unions with one line each.
- Everything in Stages 0–1's constraints still applies: strict TS with `noUncheckedIndexedAccess` and `erasableSyntaxOnly` (no enums, no parameter properties); `.ts` import extensions; conventional commits; clean-room (no code from ECGSYN, NeuroKit2, Python Anesthesia Simulator or any GPL/unlicensed repo — every equation cites the brief/research section it comes from, or `[ENG]`).
- Commit messages end with the trailer `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>` (if your harness gives you a different attribution line, use that one instead). Commands below show the trailer via `-m`.
- pnpm is not on PATH: use `npx -y pnpm@9.15.9` (Gate 1 lesson). Unit tests: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run <path>` (same with `@pme/renderer`, `@pme/demo`). Full run: `npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices`.
- **No runtime dependencies** in `@pme/engine-core`. **No new NOTICES rows**: nothing is borrowed in this stage (the CVP is parametric, see decision 1).
- **Contract with the parallel Stage 5 (rhythm library):** its plan keeps beat events `{ type:'beat', t, seq, origin, template, qrsMs, qtMs, prMs?, mech: { perfused, kSV, svMl, lvetMs } }` with `mech.perfused === false ⇔ kSV === 0` for PEA (`RhythmOpts.pulseless`), VF and too-early PVCs, and keeps `atrial` records of kind `'p'` at P onset. This stage consumes exactly that and nothing else from `l2/ecg`. Stage 5 also adds brief §7.3's `alarm` event verbatim (identical to this plan's) and touches neighbouring lines of `engine.ts`, `test/engine/engine-commands.test.ts` and `apps/demo/vite.config.ts`: expect trivial merge conflicts and list them in the PR.
- Rates and indexing (brief §3.3): pressures and pleth at **125 Hz**; sample `m` belongs to time `m/125`; a pass that ends at ECG index `end` fills 125 Hz indices up to `floor(end/4)` inclusive; look-ahead 100 ms (so `latestSampleIndex('pleth')` = 12 at creation); ring buffers 120 s.
- Public names are the brief's (§7): commands `setTarget`, `pin`, `release`, `setMode`, `applyEvent` (`kind: 'line' | 'cpr'`), `attachSensor`, `device` (`device: 'nibp'`, actions `start | stat | stop | auto`, `intervalMin`); events `nibp`, `state`, `alarm`, `measurement`; channels `abp`, `cvp`, `pap`, `pleth`; numerics `abpSys`, `abpDia`, `abpMean`, `cvpMean`, `papSys`, `papDia`, `papMean`, `nibpSys`, `nibpDia`, `nibpMean`, `pr`, `pi`. Names this plan defines where the brief is silent are listed once in the Interfaces block of the task that creates them and reused verbatim.
- Visual checks use **headless system Chrome through Playwright** (`channel: 'chrome'`), not the desktop Browser pane: a hidden pane throttles `requestAnimationFrame` and the sweep stalls (Gate 1 lesson).

## Decisions this plan makes where the spec was silent, inconsistent or physically unreachable

1. **CVP is parametric (five Gaussians), not the Infirmary Integrated vertex table.** Brief §4.2 itself specifies five Gaussians timed from ECG events; they re-time themselves per P and QRS (AF → no a wave, P in systole → cannon a wave, CHB → wandering a waves), which a one-cycle vertex table cannot do without the same re-timing; and it avoids an Apache-2.0 `LICENSES/` + NOTICE-ID borrow whose table content could not be verified clean-room in this session. No NOTICES row is needed.
2. **Aorta→radial transfer is a resonant *peaking* filter**, `P_radial = P_aortic + G·(2ζr/ωr)·x'` with `x'' = ωr²(P_aortic − x) − 2ζr·ωr·x'` (f_r 5 Hz, ζ_r 0.3, G 1.5). A plain 2nd-order low-pass (the literal reading of "a 2nd-order filter") also strips the upstroke's harmonics, after which an under-damped transducer (fn 10, ζ 0.2) cannot add the 5–30 mmHg the brief requires (prototype: +2 mmHg). The brief's own phrase "its gain is tuned so radial SBP exceeds aortic SBP by 5–20 mmHg" implies a gain parameter, which the peaking form has.
3. **Ejection skew.** `Q = Qpk·sin(π·(t/LVET)^p)^κ` with p = 0.5 (peak flow at 25% of LVET, as in the aortic flow wave); p = 1 is the brief's plain `sin^κ`. Needed for a steep radial upstroke (same reason as 2).
4. **Valve-opening map E(k) = max(0, (k − 0.25)/0.75)** on the rhythm engine's `beat.mech.kSV`. The rhythm engine (Stage 1, now Stage 5's) already folds k_rhythm × f_fill × PESP into `kSV`; applying f_fill again would double-count. E(k) makes weak beats eject nothing (pulse deficit, "no ejection at coupling < 45%"), and makes VT ≥ 200 (kSV 0.2) pulseless — the scope's "VT > 200 → no pulsatility" — without touching `l2/ecg`. VF/PEA/asystole IDs are also forced to k = 0 (`PULSELESS_RHYTHMS`, which already lists Stage 5's future IDs).
5. **Frank–Starling carry-over (FS_CARRY 0.75).** With k_rhythm 1.2 alone, the long compensatory pause lets the diastolic pressure fall ≈25 mmHg and the post-PVC SBP comes out −28 mmHg (prototype), contradicting "SBP about +12" (brief §4.8) and acceptance 5. The volume a beat fails to eject raises the next beat's EDV and the beat ejects its usual fraction of it: `SV = E·(nominal + 0.75·missed)`. Result: +10.7 mmHg mean over isolated PVCs (0.7 → +7.8, 0.8 → +14.0: keep 0.75).
6. **M3 plateau as a tracker ceiling.** In MANUAL mode the M2 tracker would cancel any HR effect on SV, so "CO plateaus and falls above ~150–180 bpm" is implemented as a cap on the SV gain: `g ≤ 2·min(1, f_fill(RR)/f_fill(0.4 s))`; a binding cap raises the `override` flag on sbp/dbp.
7. **M2 tracker design** (brief gives only "PI tracker, τ ≈ 3 beats"): PP by multiplicative feedback on the 4-beat mean of *reference* beats (α 0.25), R by the steady-state Windkessel inverse `R* = (MAP* − P_floor)/Q̄` (α 0.5). Feeding back MAP itself oscillates (R·C lag). Reference beats are supraventricular, have 0.4 ≤ E ≤ 1.05 and ≤ 25% carry-over, and follow another reference beat — so PVCs, post-PVC beats and tiny AF beats still act, ordinary AF beats still let the instructor move the pressure, and ventricular rhythms (VT, idioventricular) are left to physics (they fall and raise `override`). Targets are the TRUE site pressures, so damping and line faults still show on the display.
8. **NIBP envelope width.** The brief's `w_hi = 0.6–0.8·(SBP − MAP)/√(−ln Rs)` would put the Rs crossing at MAP + 0.7·(SBP − MAP), i.e. a −9 mmHg SBP bias that contradicts its own AAMI acceptance test (bias ≤ 5). This plan uses factor 1.0 (the envelope inverts exactly at the true values for a steady beat); scatter comes from beat variability, 5% per-pulse amplitude noise and the result noise SD 4 mmHg. The inversion is a **curve fit** (Gaussian in ln A on each side), because linear interpolation between 8 mmHg steps biases DBP ≈ +4 mmHg. Each step waits for two pulses within 15% (up to 5 pulses) and then uses the last pair; with irregular pulses this is what lengthens AF cycles and widens their error, as the brief requires.
9. **"One adult cycle lasts 25–35 s"** is tested as the mean of six first cycles (inflate to 165 mmHg) at HR 75 (individual cycles range 27–36 s with respiration-dependent envelopes). Later cycles inflate to previous SBP + 10 (GE rule) and are shorter.
10. **Sites.** The brief's `site` strings are refined so same-limb effects are decidable: `abp` `leftRadial` (default) | `rightRadial` | `femoral`; `spo2` `leftFinger` (default; `finger` is an alias) | `rightFinger` | `ear` | `forehead`; `nibp` `rightArm` (default) | `leftArm` | `leg`. Same limb = left radial/finger with left arm, right with right.
11. **Default sensors:** `abp`, `cvp`, `pap` = `'none'` (no buffer; `latestSampleIndex` stays −1, so the Stage 1 test that expects `latestSampleIndex('abp') === -1` still holds); `spo2` = `'on'`; `nibp` = `'on'`. `PatientProfile.sensors` overrides them.
12. **`fnHz` on the `damp` line event** is a Stage 2 extension (the brief's `line` event has one `value`): `{ kind:'line', line, action:'damp', value: ζ, fnHz }`.
13. **Breathing** is a fixed 15/min positive-pressure clock sharing the ECG's RSA phase (`ps.hrv.phi`), as Stage 1 did for RSA; Stage 3 replaces it with the respiratory driver. Spontaneous-breathing sign reversal is Stage 3.
14. **`exp` ramp τ = duration/3** (brief §4.9); Stage 1 had τ = duration/5. Changed in `l1/ramp.ts` (owned by this stage).
15. **Earlier stages' tests touched:** two tests in `packages/controller/test/session/host-session.test.ts` (Stage 6a: `setTarget sbp` is now accepted; the `state` event now comes from the engine with ramp truth, request E1), two lines in `test/engine/engine-commands.test.ts` (they asserted that `setTarget sbp` and `applyEvent cpr` are rejected — both are now accepted), and acceptance 11 in `test/engine/engine-pipeline.test.ts` becomes async and yields every simulated hour: with the haemodynamics it takes ≈ 55 s and otherwise trips Vitest's 60 s worker-RPC timeout.
16. **Pulseless numerics:** with no detected pulse for 6 s, ABP/PAP S/D/M fall back to the max/min/mean of the last 2 s flagged `questionable`; PR and PI are `invalid`.
17. **NIBP failure INOP** is emitted as a brief §7.3 `alarm` event (`id 'nibp-failed'`, `technical`, `low`); the alarm engine proper is Stage 4.
18. **VF acceptance (test 6)** runs only when `RHYTHMS` contains `vfCoarse` (Stage 5 adds it); until then test 6 runs on asystole and VT 220 (both pulseless here).
19. **AF pulse-deficit test at 150/min.** Stage 1.1's AF rate calibration puts a floor of ≈ 0.35 s under RR below ≈ 140/min, so "beats with RR < 350 ms" only exist at faster AF; the test uses `rateBpm: 150` (115 such beats in 100 s, 76 of them with an upstroke < 5 mmHg).

## Prototype results (numbers the constants below were tuned to)

Prototyped in a scratch copy of current `main` (`8e46032`) with exactly the code in this plan (the plan document was parsed, its files and find/replace blocks applied mechanically, and the result compared byte-for-byte with the prototype): all 177 engine-core tests (112 existing + 65 new), 31 renderer (26 + 5), 97 controller, 19 audio, 6 validation and 1 skins tests pass; `tsc` is clean in every package; `vite build` succeeds; `check-notices` is OK; the 10 Playwright e2e checks (Stage 1 IIFE smoke and Stage 6a) pass on system Chrome; and the `stage2.html` demo runs in headless Chrome (`worker-raf`).

| Check | Result |
|---|---|
| RK4 at 2 ms (4 substeps per 125 Hz sample) | stable for fn up to 40 Hz (ω·h = 0.5); no drift over 24 h |
| Radial vs aortic at SV 70, C 1.5, HR 75 | 122.7/78.4 vs 113.0/79.7: +9.7 mmHg SBP, PP 44.3 (acceptance 4: 40–55), PP amplification 1.33 |
| Engine, sinus, targets 120/80 | displayed ABP 120.7/81.0, 121.0/80.8, 121.0/82.0 at HR 60/90/120; steep upstroke, tidal shoulder, clear dicrotic notch |
| R→radial foot / R→pleth foot / pleth − radial | 180/167/154 ms · 258/255/233 ms · 79/88/79 ms at HR 60/90/120 |
| Notch − (R + PEP + LVET) | 87/89/83 ms → `RADIAL_PTT_S` = 0.085 s |
| Tracker 90/50, 30 s ramp, sinus 80 | 91.9/52.3 ten beats after the ramp (displayed, 6-beat average) |
| Transducer fn 10/ζ 0.2 · ζ 1.2 | SBP +7.3, MAP +0.1 · SBP −1.4, DBP +0.6 |
| Flush | 0.95 s at 300 mmHg; ring period 102.1 ms at fn 10, ζ 0.2 (damped period, within 1/fn ± 5%) |
| PPV at g_hyp 0.05 / 0.2 | 8.0% / 25.0% |
| Asystole, VT 220 | ABP 12.0/11.9 at +20 s; PR invalid; pleth flat |
| CPR 110/min, quality 1 | 94.4/22.2 mmHg; 5 s after stopping 20/18 mmHg |
| AF 150 | 76 of 115 beats with RR < 350 ms had an upstroke < 5 mmHg; PR 88 vs HR 136 |
| Post-PVC SBP | +10.7 mmHg mean over isolated PVCs |
| CVP a wave (displayed) | 89 ms after P onset |
| NIBP, 100 sinus cycles | NIBP − IBP: SBP +0.7 (SD 6.8), DBP +1.5 (SD 5.7), MAP +0.2; first cycle 31.9 s mean (AF 41.1 s); AF error SD 10.4/13.5 |
| NIBP at 45/30 | fails after 2 attempts (56 s) with the INOP |
| 24 h at 125 Hz | `latestSampleIndex('abp')` = 10,800,012; ≈ 70 s wall under Vitest |

## File map

| Path | Responsibility |
|---|---|
| `packages/engine-core/src/types-hemo.ts` | Stage 2 public types (commands, events, sensors, sites) |
| `…/src/types.ts`, `…/src/index.ts` | one-line additions to the unions, `PatientProfile.baseline/sensors`, re-export |
| `…/src/l1/state.ts` | `STATE_SCHEMA`, L1 targets/ramps, flags, pin/release (brief §4.9) |
| `…/src/l1/ramp.ts` | `exp` curve τ = duration/3 |
| `…/src/l2/hemo/params.ts` | constants, Weissler, f_fill, E(k), g_hyp, breath clock, Pmsf |
| `…/src/l2/hemo/ejection.ts` | ejection and CPR pulses (`Pulse`, `makePulse`, `flowAt`, `pressureAt`) |
| `…/src/l2/hemo/circulation.ts` | 4-element Windkessel + radial resonator + pulmonary Windkessel, RK4 |
| `…/src/l2/hemo/line.ts` | catheter/transducer, display filter, flush/zero/sample/disconnect/level/damp |
| `…/src/l2/hemo/cvp.ts` | CVP five-Gaussian generator |
| `…/src/l2/hemo/tracker.ts` | M2 pressure-target tracker |
| `…/src/l2/pleth/pleth.ts` | pleth pulses per mechanical beat |
| `…/src/l3/pulse/detector.ts` | slope-sum pulse detector, pulse rate, PR source rule |
| `…/src/l3/pressure-numerics/numerics.ts` | per-beat S/D/M by integral, averaging, PI, PR |
| `…/src/l3/nibp/nibp.ts` | oscillometric cuff state machine |
| `…/src/l2/hemo/pipeline.ts` | the per-tick Stage 2 work + command hooks + events |
| `…/src/engine.ts` | additive wiring (state, advance, flush, validate/apply hooks, buffers, stageGroup) |
| `packages/renderer/src/wave-lanes.ts`, `numerics-hemo.ts` | lane styles/scales, tiles and formatters |
| `packages/renderer/src/{protocol,monitor-core,mount,index}.ts` | opt-in waveform lanes and tiles |
| `apps/demo/{stage2.html,src/stage2.ts}` | demo page |
| `docs/gates/stage-2.md` | gate evidence |

---
### Task 1: Branch, Stage 2 public types

**Files:**
- Create: `packages/engine-core/src/types-hemo.ts`, `packages/engine-core/test/types-hemo.test.ts`
- Modify: `packages/engine-core/src/types.ts` (5 additive edits), `packages/engine-core/src/index.ts` (1 line), `packages/controller/src/session/controller-session.ts` (2 edits: Stage 6a's log formatter must cover the grown unions)

**Interfaces:**
- Consumes: Stage 1 `types.ts` (`Ramp`, `SimSeconds`, `StateVar`, `Command`, `EngineEvent`, `DeviceAction`, `PatientProfile`).
- Produces (all exported from `@pme/engine-core`): `SensorId`, `LineSensorState = 'none'|'atmosphere'|'connected'|'zeroing'|'damped'`, `PressureChannel = 'abp'|'cvp'|'pap'`, `AbpSite`, `Spo2Site`, `NibpSite`, `HemoClinicalEvent` (`line` with optional `fnHz`, `cpr`), `HemoCommandBody` (`pin`, `release`, `setMode`, `applyEvent`, `attachSensor`), `NibpDeviceAction`, `NibpPhase`, `ControlFlag`, `HemoEvent` (`nibp`, `state`, `alarm`). `Command`, `EngineEvent` and `DeviceAction` now include them; `PatientProfile.baseline` is `Partial<Record<StateVar, number>>` and `PatientProfile.sensors` is `Partial<Record<SensorId, string>>`.

- [x] **Step 1: Create the branch**

```bash
git checkout main && git pull --ff-only && git checkout -b stage-2-haemodynamics
npx -y pnpm@9.15.9 install --frozen-lockfile   # Stage 6a added @pme/controller and ws links; a stale node_modules lacks them
```

- [x] **Step 2: Write the failing test**

`packages/engine-core/test/types-hemo.test.ts`:

```ts
// Compile-time contract for the Stage 2 public types (brief §7.2–§7.3): `pnpm typecheck` fails if a variant
// is missing from the unions; the runtime assertions only keep Vitest honest.
import { describe, expect, it } from 'vitest';
import type { HemoClinicalEvent, LineSensorState } from '../src/types-hemo.ts';
import type { Command, EngineEvent, PatientProfile } from '../src/types.ts';

describe('Stage 2 public types', () => {
  it('Command, EngineEvent and PatientProfile carry the Stage 2 variants', () => {
    const line: HemoClinicalEvent = { kind: 'line', line: 'abp', action: 'damp', value: 0.2, fnHz: 10 };
    const state: LineSensorState = 'connected';
    const cmds: Command[] = [
      { id: '1', issuedBy: 't', type: 'pin', variable: 'sbp', value: 90, ramp: { durationS: 10 } },
      { id: '2', issuedBy: 't', type: 'release', variable: 'all' },
      { id: '3', issuedBy: 't', type: 'setMode', mode: 'manual' },
      { id: '4', issuedBy: 't', type: 'applyEvent', event: line },
      { id: '5', issuedBy: 't', type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 1 } },
      { id: '6', issuedBy: 't', type: 'attachSensor', sensor: 'abp', state, site: 'leftRadial' },
      { id: '7', issuedBy: 't', type: 'device', action: { device: 'nibp', action: 'auto', intervalMin: 5 } },
    ];
    const events: EngineEvent[] = [
      { type: 'nibp', t: 1, phase: 'deflating', cuffMmHg: 141 },
      { type: 'state', t: 1, tick: 50, mode: 'manual', values: { sbp: 120 }, control: { sbp: 'ramping' } },
      { type: 'alarm', t: 1, id: 'nibp-failed', priority: 'low', category: 'technical', state: 'raised', text: 'NBP measurement failed' },
    ];
    const profile: PatientProfile = { baseline: { hr: 80, sbp: 130 }, sensors: { abp: 'connected', spo2: 'on' } };
    expect(cmds.map((c) => c.type)).toEqual(['pin', 'release', 'setMode', 'applyEvent', 'applyEvent', 'attachSensor', 'device']);
    expect(events.map((e) => e.type)).toEqual(['nibp', 'state', 'alarm']);
    expect(profile.baseline?.sbp).toBe(130);
  });
});
```

- [x] **Step 3: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck`
Expected: FAIL — `Cannot find module '../src/types-hemo.ts'` and "Type '"pin"' is not assignable" errors.

- [x] **Step 4: Implement**

`packages/engine-core/src/types-hemo.ts`:

```ts
// Stage 2 public types (brief §7.2–§7.3), kept in their own file so parallel stages do not collide in
// types.ts. types.ts adds `HemoCommandBody`, `NibpDeviceAction` and `HemoEvent` to its unions.
import type { Ramp, SimSeconds, StateVar } from './types.ts';

/** Sensors named in brief §7.2 `attachSensor`. Stage 2 implements abp, cvp, pap, spo2 (pleth) and nibp. */
export type SensorId = 'ecg' | 'spo2' | 'nibp' | 'abp' | 'cvp' | 'pap' | 'co2' | 'temp';
/** Invasive-line sensor states (brief §6.2, CAE semantics). */
export type LineSensorState = 'none' | 'atmosphere' | 'connected' | 'zeroing' | 'damped';
export type PressureChannel = 'abp' | 'cvp' | 'pap';
/** Sites that decide same-limb effects (brief §4.2, §4.5): cuff on the arterial-line or SpO2 arm. */
export type AbpSite = 'leftRadial' | 'rightRadial' | 'femoral';
export type Spo2Site = 'leftFinger' | 'rightFinger' | 'ear' | 'forehead';
export type NibpSite = 'rightArm' | 'leftArm' | 'leg';

/** Brief §7.2 ClinicalEvent, the members Stage 2 implements. `fnHz` is a Stage 2 extension for `damp`. */
export type HemoClinicalEvent =
  | {
      kind: 'line'; line: PressureChannel;
      action: 'flush' | 'zero' | 'sample' | 'disconnect' | 'reconnect' | 'damp' | 'level' | 'wedge';
      /** damp: ζ (default 1.2); level: transducer cm BELOW the phlebostatic axis; wedge: 1 inflate, 0 deflate. */
      value?: number;
      /** damp only: natural frequency in Hz (default: unchanged). */
      fnHz?: number;
    }
  | { kind: 'cpr'; active: boolean; rate?: number; quality?: number; ventilation?: '30:2' | 'continuous' };

/** Command variants added in Stage 2 (brief §7.2). setTarget already exists in types.ts. */
export type HemoCommandBody =
  | { type: 'pin'; variable: StateVar; value?: number; ramp?: Ramp }
  | { type: 'release'; variable: StateVar | 'all'; ramp?: Ramp }
  | { type: 'setMode'; mode: 'manual' | 'modeled' }
  | { type: 'applyEvent'; event: HemoClinicalEvent }
  | {
      type: 'attachSensor'; sensor: SensorId; state: string; site?: string;
      leadSet?: 3 | 5 | 12; sampling?: 'sidestream' | 'mainstream';
    };

/** Brief §7.2 DeviceAction, nibp member. */
export type NibpDeviceAction = { device: 'nibp'; action: 'start' | 'stat' | 'stop' | 'auto'; intervalMin?: number };

export type NibpPhase = 'idle' | 'inflating' | 'deflating' | 'done' | 'failed';
export type ControlFlag = 'modeled' | 'pinned' | 'ramping' | 'override';

/** Event variants added in Stage 2 (brief §7.3). */
export type HemoEvent =
  | {
      type: 'nibp'; t: SimSeconds; phase: NibpPhase; cuffMmHg?: number; nextInS?: number;
      result?: { sys: number; dia: number; map: number; pr: number };
    }
  | {
      type: 'state'; t: SimSeconds; tick: number; mode: 'manual' | 'modeled';
      values: Partial<Record<StateVar, number>>; control: Partial<Record<StateVar, ControlFlag>>;
    }
  | {
      type: 'alarm'; t: SimSeconds; id: string; priority: 'high' | 'medium' | 'low';
      category: 'physiological' | 'technical'; state: 'raised' | 'cleared' | 'acked' | 'silenced' | 'paused'; text: string;
    };
```

Apply these edits to `packages/engine-core/src/types.ts` (every "find" block occurs exactly once in the file; replace it with the block below it):

Edit 1 of 5 — find:

```ts
// the remaining Command variants, EngineEvent variants and MonitorEngine members listed in §7.
```

replace with:

```ts
// the remaining Command variants, EngineEvent variants and MonitorEngine members listed in §7.
import type { HemoCommandBody, HemoEvent, NibpDeviceAction, SensorId } from './types-hemo.ts';
```

Edit 2 of 5 — find:

```ts
export interface PatientProfile {
  baseline?: { hr?: number };
  rhythm?: { id: RhythmId; opts?: RhythmOpts };
}
```

replace with:

```ts
export interface PatientProfile {
  baseline?: Partial<Record<StateVar, number>>; // Stage 2: every StateVar (was { hr?: number })
  rhythm?: { id: RhythmId; opts?: RhythmOpts };
  sensors?: Partial<Record<SensorId, string>>; // Stage 2 (brief §7.4 patient.sensors)
}
```

Edit 3 of 5 — find:

```ts
export type DeviceAction = {
  device: 'ecg';
  action: 'filter' | 'lead' | 'capture12' | 'arrhythmiaAnalysis';
  value?: string | boolean;
  lane?: number;
};
```

replace with:

```ts
export type DeviceAction =
  | {
      device: 'ecg';
      action: 'filter' | 'lead' | 'capture12' | 'arrhythmiaAnalysis';
      value?: string | boolean;
      lane?: number;
    }
  | NibpDeviceAction; // Stage 2
```

Edit 4 of 5 — find:

```ts
    | { type: 'device'; action: DeviceAction }
  );
```

replace with:

```ts
    | { type: 'device'; action: DeviceAction }
    | HemoCommandBody // Stage 2 (types-hemo.ts)
  );
```

Edit 5 of 5 — find:

```ts
  | { type: 'toneCancel'; after: SimSeconds; ids?: string[] };
```

replace with:

```ts
  | { type: 'toneCancel'; after: SimSeconds; ids?: string[] }
  | HemoEvent; // Stage 2 (types-hemo.ts)
```

And to `packages/engine-core/src/index.ts`:

Edit 1 of 1 — find:

```ts
export { defaultModifiers } from './modifiers.ts';
```

replace with:

```ts
export { defaultModifiers } from './modifiers.ts';
export * from './types-hemo.ts'; // Stage 2
```

Stage 6a's `describe()` log formatter switches over every command type and reads `action.value`/`action.lane` on any `device` command; with the grown unions it no longer compiles.

Edit `packages/controller/src/session/controller-session.ts`:

Edit 1 of 2 — find:

```ts
    case 'device':
      return `${c.action.device} ${c.action.action} ${String(c.action.value ?? '')}${c.action.lane !== undefined ? ` lane ${c.action.lane}` : ''}`;
```

replace with:

```ts
    case 'device':
      if (c.action.device === 'nibp') return `nibp ${c.action.action}${c.action.intervalMin !== undefined ? ` every ${c.action.intervalMin} min` : ''}`; // Stage 2
      return `${c.action.device} ${c.action.action} ${String(c.action.value ?? '')}${c.action.lane !== undefined ? ` lane ${c.action.lane}` : ''}`;
```

Edit 2 of 2 — find:

```ts
    case 'setMode':
      return `mode ${c.mode}`;
  }
}
```

replace with:

```ts
    case 'setMode':
      return `mode ${c.mode}`;
    case 'applyEvent': // Stage 2
      return `event ${c.event.kind}${'action' in c.event ? ` ${c.event.action}` : ` ${c.event.active ? 'on' : 'off'}`}`;
    case 'attachSensor': // Stage 2
      return `sensor ${c.sensor} ${c.state}${c.site ? ` @${c.site}` : ''}`;
  }
}
```

- [x] **Step 5: Run it to see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck && npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/types-hemo.test.ts && npx -y pnpm@9.15.9 typecheck`
Expected: PASS (1 test); every package typechecks (the renderer and demo already narrow on `device === 'ecg'`; the controller now handles `nibp`, `applyEvent` and `attachSensor`).

- [x] **Step 6: Commit**

```bash
git add packages/engine-core/src/types-hemo.ts packages/engine-core/src/types.ts packages/engine-core/src/index.ts packages/engine-core/test/types-hemo.test.ts packages/controller/src/session/controller-session.ts
git commit -m "feat(engine-core): stage 2 public types (sensors, line/cpr events, nibp, state, alarm)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: L1 PatientState — schema, MANUAL targets, flags, pin/release

**Files:**
- Create: `packages/engine-core/src/l1/state.ts`, `packages/engine-core/test/l1/state.test.ts`
- Modify: `packages/engine-core/src/l1/ramp.ts` (the `exp` curve), `packages/engine-core/test/l1/ramp.test.ts` (append one test)

**Interfaces:**
- Consumes: `ramp.ts` (`RampState`, `constantRamp`, `rampValue`, `retarget`), `ControlFlag` (Task 1).
- Produces: `interface VarSpec { def; min; max; stage: 2|3|4|5|7; manual: 'target'|'derived' }`, `STATE_SCHEMA: Record<StateVar, VarSpec>`, `STATE_VARS: StateVar[]`, `type L1Var = Exclude<StateVar,'hr'>`, `interface L1State { mode: 'manual'; vars: Record<L1Var, RampState>; pinned: StateVar[] }`, `createL1State(profile?: PatientProfile): L1State`, `l1Value(st, v: L1Var, t): number`, `isRamping(r: RampState, t): boolean`, `validateTarget(variable: StateVar, value: number|undefined, ramp: Ramp|undefined): string|undefined`, `setL1Target(st, v: L1Var, t, value, ramp?)`, `pinVar(st, v: StateVar)`, `releaseVar(st, v: StateVar|'all')`, `l1Flags(st, t, hrRamp: RampState, overrides: readonly StateVar[]): Partial<Record<StateVar, ControlFlag>>`. `hr` stays in the engine's Stage 1 ramp.

- [x] **Step 1: Write the failing tests**

`packages/engine-core/test/l1/state.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { constantRamp } from '../../src/l1/ramp.ts';
import { createL1State, l1Flags, l1Value, pinVar, releaseVar, setL1Target, STATE_SCHEMA, validateTarget } from '../../src/l1/state.ts';

describe('l1/state (brief §4.9 PatientState, MANUAL)', () => {
  it('starts from the schema defaults, overridden by the profile baseline', () => {
    const st = createL1State({ baseline: { sbp: 140 } });
    expect(l1Value(st, 'sbp', 0)).toBe(140);
    expect(l1Value(st, 'dbp', 0)).toBe(STATE_SCHEMA.dbp.def);
    expect(l1Value(st, 'volumeStatus', 0)).toBe(1);
  });

  it('setTarget ramps from the CURRENT value, also mid-ramp', () => {
    const st = createL1State();
    setL1Target(st, 'sbp', 10, 90, { durationS: 30 });
    expect(l1Value(st, 'sbp', 25)).toBeCloseTo(105, 9);
    setL1Target(st, 'sbp', 25, 120, { durationS: 10 });
    expect(l1Value(st, 'sbp', 25)).toBeCloseTo(105, 9);
    expect(l1Value(st, 'sbp', 35)).toBe(120);
  });

  it('validates range, stage and MANUAL role', () => {
    expect(validateTarget('sbp', 90, { durationS: 30 })).toBeUndefined();
    expect(validateTarget('sbp', 400, undefined)).toMatch(/0–300/);
    expect(validateTarget('spo2', 90, undefined)).toMatch(/Stage 3/);
    expect(validateTarget('svr', 1.2, undefined)).toMatch(/derived/);
    expect(validateTarget('dbp', 50, { durationS: 1000 })).toMatch(/0–900/);
  });

  it('flags: override > pinned > ramping', () => {
    const st = createL1State();
    setL1Target(st, 'sbp', 0, 90, { durationS: 30 });
    setL1Target(st, 'cvp', 0, 10, { durationS: 30 });
    pinVar(st, 'cvp');
    const f = l1Flags(st, 5, constantRamp(75), ['dbp']);
    expect(f).toEqual({ sbp: 'ramping', cvp: 'pinned', dbp: 'override' });
    releaseVar(st, 'all');
    expect(l1Flags(st, 40, constantRamp(75), [])).toEqual({});
  });
});
```

Edit `packages/engine-core/test/l1/ramp.test.ts` (appends a describe block):

Edit 1 of 1 — find:

```ts
    expect(rampValue(r2, 20)).toBe(60);
  });
});
```

replace with:

```ts
    expect(rampValue(r2, 20)).toBe(60);
  });
});

describe('l1/ramp exp curve (Stage 2, brief §4.9: τ = duration/3)', () => {
  it('reaches 1 − e^(−1) of the normalised change at one third of the duration', () => {
    const r = retarget(constantRamp(0), 0, 1, { durationS: 30, curve: 'exp' });
    expect(rampValue(r, 10)).toBeCloseTo((1 - Math.exp(-1)) / (1 - Math.exp(-3)), 9);
  });
});
```

- [x] **Step 2: Run them to see them fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l1`
Expected: FAIL — `state.test.ts` cannot load `../../src/l1/state.ts`; the new ramp test fails (Stage 1's curve uses τ = duration/5).

- [x] **Step 3: Implement**

`packages/engine-core/src/l1/state.ts`:

```ts
// L1 patient truth, MANUAL mode (brief §4.9): the shared PatientState schema, instructor targets with
// ramps (linear / exp / sigmoid, delay, mid-ramp retarget from the CURRENT value), control flags and
// pin / release. 'hr' keeps living in the engine's Stage 1 ramp; every other StateVar lives here.
// All state is plain JSON-safe data (the engine clones it every tick for the look-ahead).
import type { ControlFlag } from '../types-hemo.ts';
import type { PatientProfile, Ramp, StateVar } from '../types.ts';
import { constantRamp, rampValue, retarget, type RampState } from './ramp.ts';

export interface VarSpec {
  /** Default adult value (brief §4.9 ranges; research 03 §2, §3.2). */
  def: number;
  min: number;
  max: number;
  /** Build stage whose generators consume the variable; setTarget is accepted from this stage on. */
  stage: 2 | 3 | 4 | 5 | 7;
  /** MANUAL role (brief §4.9 table): instructor target, or derived by a coupling rule. */
  manual: 'target' | 'derived';
}

/** Brief §4.9 shared state schema. Units: bpm, mmHg, %, /min, mL, fraction, °C, mEq/L, ms, mA. */
export const STATE_SCHEMA: Readonly<Record<StateVar, VarSpec>> = {
  hr: { def: 75, min: 0, max: 300, stage: 2, manual: 'target' },
  sbp: { def: 120, min: 0, max: 300, stage: 2, manual: 'target' },
  dbp: { def: 80, min: 0, max: 300, stage: 2, manual: 'target' },
  cvp: { def: 6, min: -5, max: 40, stage: 2, manual: 'target' }, // normal mean 2–8 [03 §2.9]
  papSys: { def: 24, min: 0, max: 120, stage: 2, manual: 'target' }, // 15–30 [03 §2.10]
  papDia: { def: 10, min: 0, max: 60, stage: 2, manual: 'target' }, // 4–12 [03 §2.10]
  pawp: { def: 9, min: 0, max: 40, stage: 2, manual: 'target' }, // 6–12 [03 §2.10]
  spo2: { def: 97, min: 0, max: 100, stage: 3, manual: 'target' },
  pi: { def: 2, min: 0.02, max: 20, stage: 2, manual: 'target' }, // adult median 1.4–1.7, range 0.3–10 [03 §3.2]
  rr: { def: 15, min: 0, max: 80, stage: 3, manual: 'target' },
  vt: { def: 500, min: 0, max: 1500, stage: 3, manual: 'target' },
  etco2: { def: 36, min: 0, max: 150, stage: 3, manual: 'target' },
  fio2: { def: 0.21, min: 0.21, max: 1, stage: 3, manual: 'target' },
  shunt: { def: 0.03, min: 0, max: 0.5, stage: 3, manual: 'target' },
  tempCore: { def: 36.8, min: 25, max: 43, stage: 3, manual: 'target' },
  contractility: { def: 1, min: 0.1, max: 2, stage: 2, manual: 'target' },
  svr: { def: 1.05, min: 0.3, max: 3, stage: 2, manual: 'derived' }, // derived by the M2 tracker in MANUAL
  k: { def: 4.2, min: 2, max: 9, stage: 5, manual: 'target' },
  qtc: { def: 400, min: 300, max: 650, stage: 5, manual: 'target' },
  volumeStatus: { def: 1, min: 0, max: 1, stage: 2, manual: 'target' }, // 1 = normovolaemic, 0 = severe hypovolaemia
  paceThresholdMa: { def: 60, min: 10, max: 200, stage: 4, manual: 'target' },
};

export const STATE_VARS = Object.keys(STATE_SCHEMA) as StateVar[];
export type L1Var = Exclude<StateVar, 'hr'>;

export interface L1State {
  mode: 'manual';
  vars: Record<L1Var, RampState>;
  pinned: StateVar[];
}

export function createL1State(profile?: PatientProfile): L1State {
  const vars = {} as Record<L1Var, RampState>;
  for (const v of STATE_VARS) {
    if (v === 'hr') continue;
    const b = profile?.baseline?.[v];
    vars[v] = constantRamp(b ?? STATE_SCHEMA[v].def);
  }
  return { mode: 'manual', vars, pinned: [] };
}

/** Truth of an L1 variable at time t (sim seconds). */
export function l1Value(st: L1State, v: L1Var, t: number): number {
  return rampValue(st.vars[v], t);
}

/** True while a ramp is still moving at time t (brief §4.9 'ramping' flag). */
export function isRamping(r: RampState, t: number): boolean {
  return r.durationS > 0 && r.from !== r.to && t < r.t0 + r.delayS + r.durationS;
}

/** Validation for setTarget / pin (brief §4.9 ranges). Returns a reason, or undefined when accepted. */
export function validateTarget(variable: StateVar, value: number | undefined, ramp: Ramp | undefined): string | undefined {
  const spec = STATE_SCHEMA[variable];
  if (!spec) return `unknown state variable ${String(variable)}`;
  if (spec.stage > 2) return `${variable} is not implemented until Stage ${spec.stage}`;
  if (spec.manual === 'derived') return `${variable} is derived in MANUAL mode (coupling rule M2)`;
  if (value !== undefined && (!Number.isFinite(value) || value < spec.min || value > spec.max)) {
    return `${variable} must be ${spec.min}–${spec.max}`;
  }
  if (ramp && !(ramp.durationS >= 0 && ramp.durationS <= 900)) return 'ramp.durationS must be 0–900 s';
  if (ramp && ramp.delayS !== undefined && !(ramp.delayS >= 0)) return 'ramp.delayS must be ≥ 0';
  return undefined;
}

/** setTarget (and pin in MANUAL): a new ramp from the current value (brief §4.9 ramp semantics). */
export function setL1Target(st: L1State, v: L1Var, t: number, value: number, ramp?: Ramp): void {
  st.vars[v] = retarget(st.vars[v], t, value, ramp);
}

/** MANUAL pin: the variable is instructor-owned anyway, so pin = optional retarget + the 'pinned' flag. */
export function pinVar(st: L1State, v: StateVar): void {
  if (!st.pinned.includes(v)) st.pinned.push(v);
}

/** MANUAL release: drops the 'pinned' flag and keeps the value (MODELED blends to the model, Stage 7). */
export function releaseVar(st: L1State, v: StateVar | 'all'): void {
  st.pinned = v === 'all' ? [] : st.pinned.filter((x) => x !== v);
}

/**
 * Control flags for the 1 Hz 'state' event (brief §4.9 "Control flags"): override (set by coupling rules)
 * wins over pinned, which wins over ramping.
 */
export function l1Flags(
  st: L1State,
  t: number,
  hrRamp: RampState,
  overrides: readonly StateVar[],
): Partial<Record<StateVar, ControlFlag>> {
  const out: Partial<Record<StateVar, ControlFlag>> = {};
  for (const v of STATE_VARS) {
    const r = v === 'hr' ? hrRamp : st.vars[v];
    if (overrides.includes(v)) out[v] = 'override';
    else if (st.pinned.includes(v)) out[v] = 'pinned';
    else if (isRamping(r, t)) out[v] = 'ramping';
  }
  return out;
}
```

Edit `packages/engine-core/src/l1/ramp.ts`:

Edit 1 of 1 — find:

```ts
/** Shape functions on u ∈ [0,1], each 0 at u=0 and exactly 1 at u=1 [ENG]. */
function shape(curve: RampState['curve'], u: number): number {
  if (curve === 'exp') return (1 - Math.exp(-5 * u)) / (1 - Math.exp(-5));
```

replace with:

```ts
/**
 * Shape functions on u ∈ [0,1], each 0 at u=0 and exactly 1 at u=1. 'exp' uses τ = duration/3 (brief §4.9
 * ramp semantics; Stage 1 had τ = duration/5); 'sigmoid' is logistic with 10–90% inside the middle of the ramp.
 */
function shape(curve: RampState['curve'], u: number): number {
  if (curve === 'exp') return (1 - Math.exp(-3 * u)) / (1 - Math.exp(-3));
```

- [x] **Step 4: Run them to see them pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l1`
Expected: PASS (9 tests).

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l1 packages/engine-core/test/l1
git commit -m "feat(l1): PatientState schema, MANUAL targets with ramps, control flags, pin/release" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Haemodynamic constants and per-beat rules

**Files:**
- Create: `packages/engine-core/src/l2/hemo/params.ts`, `packages/engine-core/test/l2/hemo/params.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: constants `HEMO_RATE` 125, `SUBSTEPS` 4, `H_S` 0.002, `WK_R0`, `WK_C`, `WK_P0`, `WK_CK`, `WK_ZC`, `WK_L`, `SV_REF_ML` 70, `KAPPA`, `EJECTION_SKEW`, `BACKFLOW_FRAC`, `BACKFLOW_S`, `RADIAL_FR_HZ`, `RADIAL_ZETA`, `RADIAL_GAIN`, `RADIAL_DELAY_S`, `RADIAL_PTT_S`, `FINGER_DELAY_S`, `EAR_DELAY_S`, `PA_R0`, `PA_C`, `PA_ZC`, `RV_PEP_LEAD_S`, `RV_LVET_EXTRA_S`, `TRANSDUCER_FN_HZ`, `TRANSDUCER_ZETA`, `DISPLAY_FILTER_HZ`, `FLUSH_MMHG`, `FLUSH_S`, `ZERO_S`, `SAMPLE_S`, `MMHG_PER_CM`, `DAMP_PRESETS`, `ARREST_AFTER_S`, `VENOUS_TAU_S`, `CPR_SV_FRAC`, `CPR_THORACIC_MMHG`, `CPR_DUTY`, `K_OPEN`, `FS_CARRY`, `G_MAX`, `INSUFFLATION_GAIN`, `BREATH_HZ`, `PULSELESS_RHYTHMS`; functions `pmsf(vs)`, `pepS(hr)`, `lvetS(hr)`, `fFill(rr)`, `ejectionFactor(k)`, `gainCeiling(rr)`, `gHyp(vs)`, `volumeStatusForGHyp(g)`, `breathU(t, phi)`, `respFactor(t, rr, phi, g)`.

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l2/hemo/params.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { breathU, ejectionFactor, fFill, gainCeiling, gHyp, lvetS, pepS, respFactor, volumeStatusForGHyp } from '../../../src/l2/hemo/params.ts';

describe('l2/hemo/params', () => {
  it('Weissler LVET and PEP follow HR (brief §4.2; research 03 §2.1)', () => {
    expect(lvetS(60)).toBeCloseTo(0.311, 6);
    expect(lvetS(120)).toBeCloseTo(0.209, 6);
    expect(lvetS(200)).toBe(0.15);
    expect(pepS(60)).toBeCloseTo(0.107, 6);
    expect(pepS(120)).toBeCloseTo(0.083, 6);
  });

  it('f_fill is 1 at RR 1 s and falls at short RR; the M3 ceiling plateaus then falls', () => {
    expect(fFill(1)).toBeCloseTo(1, 9);
    expect(fFill(0.35)).toBeLessThan(0.55);
    expect(gainCeiling(0.8)).toBe(2);
    expect(gainCeiling(0.3)).toBeLessThan(1.2);
  });

  it('E(k): no ejection below K_OPEN, 1 at k = 1, PESP k = 1.2 above 1', () => {
    expect(ejectionFactor(0)).toBe(0);
    expect(ejectionFactor(0.2)).toBe(0);
    expect(ejectionFactor(1)).toBe(1);
    expect(ejectionFactor(1.2)).toBeCloseTo(1.2667, 3);
  });

  it('g_hyp maps volumeStatus 1 → 0.04 and 0 → 0.25; the inverse round-trips', () => {
    expect(gHyp(1)).toBeCloseTo(0.04, 12);
    expect(gHyp(0)).toBeCloseTo(0.25, 12);
    expect(gHyp(volumeStatusForGHyp(0.2))).toBeCloseTo(0.2, 12);
  });

  it('the respiratory SV factor averages 1 over a breath', () => {
    let s = 0;
    for (let i = 0; i < 400; i++) s += respFactor(i * 0.01, 0.8, 0.3, 0.2);
    expect(s / 400).toBeCloseTo(1, 2);
    expect(breathU(0, -Math.PI / 2)).toBeCloseTo(0, 12);
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/hemo/params.test.ts`
Expected: FAIL — cannot load `../../../src/l2/hemo/params.ts`.

- [x] **Step 3: Implement**

`packages/engine-core/src/l2/hemo/params.ts` (every value is the prototype-tuned one; do not change them without re-running Tasks 14–18):

```ts
// Haemodynamic constants and per-beat rules (brief §4.2, §4.8, §4.9 M1–M3; research 03 §2.1, §2.5, §2.8,
// §8.2–8.3). Every number cites its source, or [ENG] when it is an engineering choice tuned by the
// Stage 2 prototype (plan "Prototype results").

export const HEMO_RATE = 125; // ABP/CVP/PAP/pleth sample rate (brief §3.2)
export const SUBSTEPS = 4; // RK4 at 2 ms substeps, four per 125 Hz sample (brief §4.2) [ENG]
export const H_S = 1 / (HEMO_RATE * SUBSTEPS); // 0.002 s

// 4-element Windkessel seeds, adult (brief §4.2 table; research 03 §2.8)
export const WK_R0 = 1.05; // mmHg·s/mL, R 1.0–1.1
export const WK_C = 1.5; // mL/mmHg, C 1.4 ± 0.7, at P0
export const WK_P0 = 95; // mmHg, reference pressure of C0 [ENG]
export const WK_CK = 0.01; // /mmHg, C(P) = C0·e^(−k(P−P0)) [ENG]
export const WK_ZC = 0.05; // mmHg·s/mL, Zc 0.03–0.06
export const WK_L = 0.01; // mmHg·s²/mL, L 0.005–0.01 (upper end: gives the radial PP 40–55 at SV 70, prototype)
export const SV_REF_ML = 70; // reference stroke volume (research 03 §2.8 PP check) [ENG]

// Ejection profile (brief §4.2 "Ejection"; research 03 §2.8)
export const KAPPA = 1.2; // sin^κ, κ 1.0–1.3 normal
/** Skew p in sin(π·u^p)^κ: peak flow at 25% of LVET, as in the aortic flow wave [ENG, prototype]. */
export const EJECTION_SKEW = 0.5;
export const BACKFLOW_FRAC = 0.04; // valve-closure backflow volume / SV → incisura [ENG]
export const BACKFLOW_S = 0.02; // 15–25 ms backflow bump (brief §4.2)

// Aorta → radial transfer (brief §4.2 "Site transfer"; research 03 §2.3, §2.8): a resonance at f_r 4–8 Hz,
// ζ_r 0.2–0.4, "its gain tuned so that radial SBP exceeds aortic SBP by 5–20 mmHg". Prototype at SV 70,
// C 1.5, HR 75: radial 122.7/78.4 vs aortic 113.0/79.7 → +9.7 mmHg, PP 44.3, PP amplification 1.33.
export const RADIAL_FR_HZ = 5;
export const RADIAL_ZETA = 0.3;
export const RADIAL_GAIN = 1.5;
/** Transport delay aortic root → radial on top of the filters' group delay [ENG]. */
export const RADIAL_DELAY_S = 0.045;
/**
 * Effective aortic-root → radial transit AS DISPLAYED (research 03 §2.1: radial PTT 60–110 ms) = transport
 * delay + transfer/transducer/12 Hz display group delays. Prototype: notch − (R + PEP + LVET) = 87 / 89 / 83 ms
 * at HR 60 / 90 / 120. Used by the notch-timing acceptance test.
 */
export const RADIAL_PTT_S = 0.085;
/** Finger PPG pulse origin after aortic valve opening (research 03 §2.1: PPG foot 200–300 ms after R) [ENG]. */
export const FINGER_DELAY_S = 0.1;
export const EAR_DELAY_S = 0.05; // ear / forehead probes are closer to the heart [ENG]

// Pulmonary circulation (brief §4.2 PAP; research 03 §2.10): same Windkessel, R 0.08–0.12, C 3–5.
export const PA_R0 = 0.1;
export const PA_C = 4;
export const PA_ZC = 0.02; // [ENG]
export const RV_PEP_LEAD_S = 0.02; // RV ejects ≈20 ms before the LV [ENG] → PA upstroke leads radial 60–120 ms
export const RV_LVET_EXTRA_S = 0.02; // RV ejection is slightly longer [ENG]

// Transducer and display (brief §4.2 "Transducer and line")
export const TRANSDUCER_FN_HZ = 20; // default fn 20 Hz [ENG]
export const TRANSDUCER_ZETA = 0.45; // default ζ 0.45 [ENG]
export const DISPLAY_FILTER_HZ = 12; // 12 Hz display filter (Philips default)
export const FLUSH_MMHG = 300; // flush bag level (brief §4.2)
export const FLUSH_S = 1.0; // 0.5–2 s square wave
export const ZERO_S = 3.0; // flat 0 line while zeroing [ENG]
export const SAMPLE_S = 10; // blood sampling: stopcock off the patient [ENG]
export const MMHG_PER_CM = 0.74; // levelling (brief §4.2)
export const DAMP_PRESETS = {
  normal: { fnHz: 20, zeta: 0.45 }, // brief default
  under: { fnHz: 12, zeta: 0.2 }, // real ICU lines: fn 10–25, ζ 0.2–0.4 (research 03 §2.6)
  over: { fnHz: 20, zeta: 1.2 }, // air bubble / clot / kink (research 03 §2.6)
} as const;

// Arrest (brief §4.2 "Arrest and CPR"; research 03 §2.7)
export const ARREST_AFTER_S = 3.0; // no ejection for this long (or 2.2 × last RR) = mechanical arrest [ENG]
export const VENOUS_TAU_S = 3.0; // CVP moves toward its target / toward Pmsf with τ 3–6 s
/** MANUAL Pmsf: 7–12 mmHg (brief §4.9 lumped model), scaled by volume status [ENG]. */
export function pmsf(volumeStatus: number): number {
  return 7 + 5 * Math.min(1, Math.max(0, volumeStatus));
}

// CPR pump (brief §4.2; research 03 §2.8 "CPR pump")
export const CPR_SV_FRAC = 0.2; // SV_cpr 15–30% of normal SV, × quality
export const CPR_THORACIC_MMHG = 40; // thoracic-pump term 30–80 mmHg, × quality, on ABP and CVP
export const CPR_DUTY = 0.5; // compression phase = half the cycle [ENG]

/** Weissler PEP ≈ 131 − 0.4·HR ms (brief §4.2; research 03 §2.1, intercept 131/133 unverified by sex). */
export function pepS(hr: number): number {
  return Math.min(0.14, Math.max(0.06, (131 - 0.4 * hr) / 1000));
}

/** Weissler LVET (men) 413 − 1.7·HR ms, floored at 150 ms like the rhythm engine (research 03 §2.1, §11 #8). */
export function lvetS(hr: number): number {
  return Math.max(150, 413 - 1.7 * hr) / 1000;
}

/**
 * f_fill(RR) = 1 − exp(−max(0, RR − t_sys)/τ_fill), t_sys = LVET + 0.08 s, τ_fill 0.18 s, normalised to 1 at
 * RR 1 s (brief §4.8; research 03 §8.2). Used for the M3 stroke-volume ceiling.
 */
export function fFill(rr: number): number {
  const raw = (x: number) => 1 - Math.exp(-Math.max(0, x - (lvetS(60 / x) + 0.08)) / 0.18);
  return raw(rr) / raw(1);
}

/**
 * Valve-opening map E(k) [ENG]: a beat ejects only when its contractile drive k (= beat.mech.kSV, the
 * rhythm engine's k_rhythm × f_fill × PESP) exceeds K_OPEN, the fraction needed to lift LV pressure above
 * aortic diastolic pressure. Below it there is no upstroke → pulse deficit (brief §4.8 PVC "no ejection";
 * research 03 §2.4 AF "short RR → small or absent pulse"). E(1) = 1; PESP k = 1.2 → 1.27.
 */
export const K_OPEN = 0.25;
export function ejectionFactor(k: number): number {
  return Math.max(0, (k - K_OPEN) / (1 - K_OPEN));
}

/**
 * Frank–Starling carry-over [ENG]: the volume a beat fails to eject (vs a normal beat) stays in the ventricle
 * and raises the next beat's end-diastolic volume, so a fraction of it is ejected by the next beat. With the
 * rhythm engine's PESP k = 1.2 this gives the post-PVC SBP +8–15 mmHg (brief §4.8 "SBP about +12") that
 * potentiation alone cannot reach against the long compensatory-pause runoff (prototype: −28 mmHg without it;
 * +7.8 / +10.7 / +14.0 mmHg at 0.7 / 0.75 / 0.8 over isolated PVCs).
 */
export const FS_CARRY = 0.75;

/** M3 stroke-volume ceiling as a tracker gain limit: SV plateaus and falls above ~150–180 bpm (brief §4.9 M3). */
export const G_MAX = 2.0; // [ENG] SV ≤ 140 mL at HR ≤ 150
export function gainCeiling(rr: number): number {
  return G_MAX * Math.min(1, fFill(rr) / fFill(0.4));
}

/**
 * g_hyp from volumeStatus (brief §4.2 "Respiratory variation"): 0.03–0.06 normovolaemic → 0.15–0.25
 * hypovolaemic. volumeStatus 1 → 0.04, 0 → 0.25 [ENG, linear].
 */
export function gHyp(volumeStatus: number): number {
  return 0.04 + 0.21 * (1 - Math.min(1, Math.max(0, volumeStatus)));
}
/** Inverse of gHyp (tests and the demo slider). */
export function volumeStatusForGHyp(g: number): number {
  return 1 - (g - 0.04) / 0.21;
}
export const INSUFFLATION_GAIN = 0.03; // in-phase Δup term 0.02–0.04 (research 03 §2.5)

/**
 * Fixed-rate breath clock until Stage 3's respiratory driver (as Stage 1 did for RSA): 15 breaths/min, phase
 * shared with the ECG's RSA phase φ so RSA and PPV stay coherent. u ∈ [0, 1] is the normalised
 * intrathoracic pressure of a positive-pressure breath (research 03 §2.5 `u(t)`).
 */
export const BREATH_HZ = 0.25;
export function breathU(t: number, phi: number): number {
  return 0.5 * (1 + Math.sin(2 * Math.PI * BREATH_HZ * t + phi));
}

/**
 * Per-beat respiratory SV factor (research 03 §2.5): SV_i = SV_0·(1 − g_hyp·u(t_i − t_lag)) + in-phase
 * insufflation term, t_lag ≈ 2 beats. Normalised so the breath-cycle mean is 1 (the M2 tracker then meets
 * the targets on average).
 */
export function respFactor(t: number, rr: number, phi: number, g: number): number {
  const lagged = breathU(t - 2 * rr, phi);
  return (1 - g * lagged + INSUFFLATION_GAIN * breathU(t, phi)) / (1 - g / 2 + INSUFFLATION_GAIN / 2);
}

/** Rhythms with electrical activity but no mechanical output (brief §4.8: VF, asystole, PEA → k 0). Stage 5 adds the IDs. */
export const PULSELESS_RHYTHMS: ReadonlySet<string> = new Set(['asystole', 'vf', 'vfCoarse', 'vfFine', 'pea']);
```

- [x] **Step 4: Run it to see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/hemo/params.test.ts`
Expected: PASS (5 tests).

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/hemo/params.ts packages/engine-core/test/l2/hemo/params.test.ts
git commit -m "feat(hemo): constants, Weissler PEP/LVET, f_fill, valve-opening map, g_hyp and breath clock" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Ejection pulses and the circulation (4-element Windkessel, radial resonator, pulmonary Windkessel)

**Files:**
- Create: `packages/engine-core/src/l2/hemo/ejection.ts`, `packages/engine-core/src/l2/hemo/circulation.ts`, `packages/engine-core/test/l2/hemo/circulation.test.ts`

**Interfaces:**
- Consumes: `params.ts` (Task 3).
- Produces: `interface Pulse { t0; dur; qpk; kappa; skew; back; cpr? }`, `sinPowIntegral(kappa, skew = 1)`, `makePulse(t0, dur, sv, kappa, backFrac, skew = 1): Pulse`, `flowAt(list, t)`, `pressureAt(list, t)` (thoracic CPR pulses; `qpk` holds mmHg), `prunePulses(list, t)`; `N_CIRC` 5, `interface CircInputs { lv; rv; thor; pFloor; pawp; R; Rp }`, `compliance(p)`, `stepCirculation(s: number[], t, h, x)`, `radialPressure(s, t, x)`, `aorticPressure(s, t, x)`, `paPressure(s, t, x)`, `restState(map, pam): number[]`. State vector `s = [Pc, QL, x, x', Ppa]`.

- [x] **Step 1: Write the failing test (includes BUILD-PLAN acceptance 4)**

`packages/engine-core/test/l2/hemo/circulation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { aorticPressure, radialPressure, restState, stepCirculation, type CircInputs } from '../../../src/l2/hemo/circulation.ts';
import { flowAt, makePulse, sinPowIntegral } from '../../../src/l2/hemo/ejection.ts';
import { BACKFLOW_FRAC, EJECTION_SKEW, H_S, KAPPA, lvetS } from '../../../src/l2/hemo/params.ts';

/** Periodic beats of `sv` mL at `hr`; returns radial and aortic max/min/mean over the last 10 s of 30 s. */
function steady(hr: number, sv: number, R = 1.05) {
  const rr = 60 / hr;
  const lv = Array.from({ length: Math.ceil(31 / rr) }, (_, k) => makePulse(k * rr, lvetS(hr), sv, KAPPA, BACKFLOW_FRAC, EJECTION_SKEW));
  const x: CircInputs = { lv, rv: [], thor: [], pFloor: 5, pawp: 8, R, Rp: 0.1 };
  const s = restState(90, 15);
  const r = { max: -Infinity, min: Infinity, sum: 0, n: 0 };
  const a = { max: -Infinity, min: Infinity };
  for (let i = 0; i < Math.round(30 / H_S); i++) {
    const t = i * H_S;
    stepCirculation(s, t, H_S, x);
    if (t < 20) continue;
    const pr = radialPressure(s, t + H_S, x);
    const pa = aorticPressure(s, t + H_S, x);
    r.max = Math.max(r.max, pr);
    r.min = Math.min(r.min, pr);
    r.sum += pr;
    r.n++;
    a.max = Math.max(a.max, pa);
    a.min = Math.min(a.min, pa);
  }
  return { rSys: r.max, rDia: r.min, rMean: r.sum / r.n, aSys: a.max, aDia: a.min };
}

describe('l2/hemo ejection and circulation (brief §4.2)', () => {
  it('each pulse ejects exactly SV (net of the backflow)', () => {
    const p = makePulse(0, 0.3, 70, KAPPA, BACKFLOW_FRAC, EJECTION_SKEW);
    let v = 0;
    for (let t = 0; t < 0.4; t += 1e-5) v += flowAt([p], t) * 1e-5;
    expect(v).toBeCloseTo(70, 1);
    expect(sinPowIntegral(1)).toBeCloseTo(2 / Math.PI, 5);
  });

  it('acceptance 4: at SV 70 and C 1.5 the radial PP is 40–55 mmHg', () => {
    const r = steady(75, 70);
    expect(r.rSys - r.rDia).toBeGreaterThanOrEqual(40);
    expect(r.rSys - r.rDia).toBeLessThanOrEqual(55);
  });

  it('radial SBP exceeds aortic SBP by 5–20 mmHg with the same mean (research 03 §2.3)', () => {
    const r = steady(75, 70);
    expect(r.rSys - r.aSys).toBeGreaterThanOrEqual(5);
    expect(r.rSys - r.aSys).toBeLessThanOrEqual(20);
  });

  it('MAP = P_floor + R·mean flow in steady state (Windkessel DC gain)', () => {
    const r = steady(75, 70, 1.2);
    expect(r.rMean).toBeCloseTo(5 + 1.2 * ((70 * 75) / 60), 0);
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/hemo/circulation.test.ts`
Expected: FAIL — cannot load `../../../src/l2/hemo/circulation.ts`.

- [x] **Step 3: Implement**

`packages/engine-core/src/l2/hemo/ejection.ts`:

```ts
// Ventricular ejection and CPR pump flows (brief §4.2 "Ejection", "Arrest and CPR"; research 03 §2.8):
//   Q_ej(t) = Qpk·sin(π·(t/LVET)^p)^κ for 0 ≤ t < LVET, then a backflow bump −Qb·sin(π·(t − LVET)/T_b) for
//   T_b = 20 ms (the incisura). Qpk is chosen so that the NET ejected volume ∫Q = SV. The skew p (params
//   EJECTION_SKEW) moves peak flow to the first third of ejection, as in the real aortic flow wave; p = 1 is the
//   brief's plain sin^κ.
//   CPR: Q_cpr = SV_cpr·(π/(2T_c))·sin(πt/T_c) (κ = 1, no backflow) plus a thoracic pressure pulse.
import { BACKFLOW_S } from './params.ts';

/** One scheduled flow pulse (plain data). Times are absolute sim seconds. */
export interface Pulse {
  t0: number;
  dur: number;
  qpk: number; // mL/s
  kappa: number;
  skew: number; // p in sin(π·u^p)^κ
  back: number; // backflow peak, mL/s (0 = none)
  cpr?: boolean; // a chest compression (removed when CPR stops)
}

/** ∫₀¹ sin(π·u^p)^κ du by the 400-point midpoint rule (relative error < 1e-5 for κ 0.5–2, p 0.5–1). */
export function sinPowIntegral(kappa: number, skew = 1): number {
  let s = 0;
  for (let i = 0; i < 400; i++) s += Math.sin(Math.PI * ((i + 0.5) / 400) ** skew) ** kappa;
  return s / 400;
}

/** A pulse whose net volume is `sv` mL: forward volume sv·(1 + backFrac), backflow sv·backFrac. */
export function makePulse(t0: number, dur: number, sv: number, kappa: number, backFrac: number, skew = 1): Pulse {
  const vBack = sv * backFrac;
  return {
    t0,
    dur,
    qpk: (sv + vBack) / (dur * sinPowIntegral(kappa, skew)),
    kappa,
    skew,
    back: backFrac > 0 ? vBack / ((2 * BACKFLOW_S) / Math.PI) : 0,
  };
}

/** Total flow of all pulses at time t (mL/s). */
export function flowAt(list: readonly Pulse[], t: number): number {
  let q = 0;
  for (const p of list) {
    const u = t - p.t0;
    if (u < 0) continue;
    if (u < p.dur) q += p.qpk * Math.sin(Math.PI * (u / p.dur) ** p.skew) ** p.kappa;
    else if (p.back > 0 && u < p.dur + BACKFLOW_S) q -= p.back * Math.sin((Math.PI * (u - p.dur)) / BACKFLOW_S);
  }
  return q;
}

/** Thoracic-pump pressure pulses (CPR), half-sine of amplitude `qpk` mmHg (the field is reused). */
export function pressureAt(list: readonly Pulse[], t: number): number {
  let p = 0;
  for (const x of list) {
    const u = t - x.t0;
    if (u >= 0 && u < x.dur) p += x.qpk * Math.sin((Math.PI * u) / x.dur);
  }
  return p;
}

/** Drop pulses that ended before time t. */
export function prunePulses(list: Pulse[], t: number): Pulse[] {
  return list.filter((p) => p.t0 + p.dur + BACKFLOW_S >= t);
}
```

`packages/engine-core/src/l2/hemo/circulation.ts`:

```ts
// Systemic and pulmonary circulations (brief §4.2; research 03 §2.8, §2.10), integrated together with RK4
// at 2 ms substeps (four per 125 Hz sample). State vector s:
//   s[0] Pc  capacitor (distal) pressure            C·dPc/dt = Q − (Pc − P_floor)/R
//   s[1] QL  inertance flow                          L·dQL/dt = Zc·(Q − QL)
//        P_aortic = Pc + Zc·(Q − QL) + P_thoracic(CPR)            (4-element Windkessel, Stergiopulos)
//   s[2], s[3]  aorta→radial transfer: a 2nd-order resonator driven by P_aortic,
//        x'' = ωr²·(P_aortic − x) − 2ζr·ωr·x',   P_radial = P_aortic + G·(2ζr/ωr)·x'
//        i.e. a resonant PEAKING filter (unity gain at DC and at high frequency, 1 + G at f_r), whose gain G is
//        "tuned so that radial SBP exceeds aortic SBP by 5–20 mmHg" (brief §4.2). A plain low-pass would also
//        strip the upstroke's high frequencies, and an underdamped transducer would then have nothing to ring on.
//   s[4] Ppa pulmonary capacitor pressure           Cp·dPpa/dt = Qrv − (Ppa − PAWP)/Rp ;  PAP = Ppa + Zp·Qrv
import { flowAt, pressureAt, type Pulse } from './ejection.ts';
import { PA_C, PA_ZC, RADIAL_FR_HZ, RADIAL_GAIN, RADIAL_ZETA, WK_C, WK_CK, WK_L, WK_P0, WK_ZC } from './params.ts';

export const N_CIRC = 5;
const WR = 2 * Math.PI * RADIAL_FR_HZ;

export interface CircInputs {
  lv: readonly Pulse[]; // LV flow pulses (radial time) incl. CPR pump flow
  rv: readonly Pulse[]; // RV flow pulses
  thor: readonly Pulse[]; // CPR thoracic pressure pulses (radial time), mmHg
  pFloor: number; // CVP (beating) → Pmsf (arrest)
  pawp: number; // pulmonary outflow pressure
  R: number; // systemic resistance (the M2 tracker's output)
  Rp: number; // pulmonary resistance
}

/** C(P) = C0·exp(−k·(P − P0)), clamped to 0.5–3 × C0 (brief §4.2 table: compliance falls with pressure). */
export function compliance(p: number): number {
  return WK_C * Math.min(3, Math.max(0.5, Math.exp(-WK_CK * (p - WK_P0))));
}

function deriv(t: number, s: readonly number[], d: number[], x: CircInputs): void {
  const q = flowAt(x.lv, t);
  const pc = s[0] as number;
  const ql = s[1] as number;
  const pao = pc + WK_ZC * (q - ql) + pressureAt(x.thor, t);
  d[0] = (q - (pc - x.pFloor) / x.R) / compliance(pc);
  d[1] = (WK_ZC * (q - ql)) / WK_L;
  d[2] = s[3] as number;
  d[3] = WR * WR * (pao - (s[2] as number)) - 2 * RADIAL_ZETA * WR * (s[3] as number);
  d[4] = (flowAt(x.rv, t) - ((s[4] as number) - x.pawp) / x.Rp) / PA_C;
}

const k1 = new Array<number>(N_CIRC).fill(0);
const k2 = new Array<number>(N_CIRC).fill(0);
const k3 = new Array<number>(N_CIRC).fill(0);
const k4 = new Array<number>(N_CIRC).fill(0);
const tmp = new Array<number>(N_CIRC).fill(0);

/** Advance s (in place) from t to t + h with classical RK4. */
export function stepCirculation(s: number[], t: number, h: number, x: CircInputs): void {
  deriv(t, s, k1, x);
  for (let i = 0; i < N_CIRC; i++) tmp[i] = (s[i] as number) + (h / 2) * (k1[i] as number);
  deriv(t + h / 2, tmp, k2, x);
  for (let i = 0; i < N_CIRC; i++) tmp[i] = (s[i] as number) + (h / 2) * (k2[i] as number);
  deriv(t + h / 2, tmp, k3, x);
  for (let i = 0; i < N_CIRC; i++) tmp[i] = (s[i] as number) + h * (k3[i] as number);
  deriv(t + h, tmp, k4, x);
  for (let i = 0; i < N_CIRC; i++) {
    s[i] = (s[i] as number) + (h / 6) * ((k1[i] as number) + 2 * (k2[i] as number) + 2 * (k3[i] as number) + (k4[i] as number));
  }
}

/** Radial (site) pressure at time t for state s. */
export function radialPressure(s: readonly number[], t: number, x: CircInputs): number {
  return aorticPressure(s, t, x) + (RADIAL_GAIN * 2 * RADIAL_ZETA * (s[3] as number)) / WR;
}

/** Aortic root pressure at time t for state s (used by tests and the aortic-vs-radial check). */
export function aorticPressure(s: readonly number[], t: number, x: CircInputs): number {
  return (s[0] as number) + WK_ZC * (flowAt(x.lv, t) - (s[1] as number)) + pressureAt(x.thor, t);
}

/** Pulmonary artery pressure at time t (3-element: Ppa + Zp·Qrv). */
export function paPressure(s: readonly number[], t: number, x: CircInputs): number {
  return (s[4] as number) + PA_ZC * flowAt(x.rv, t);
}

/** A state at rest: every pressure at `map` (systemic) and `pam` (pulmonary). */
export function restState(map: number, pam: number): number[] {
  return [map, 0, map, 0, pam];
}
```

- [x] **Step 4: Run it to see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/hemo/circulation.test.ts`
Expected: PASS (4 tests). Radial PP ≈ 44 mmHg, radial SBP ≈ 10 mmHg above aortic.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/hemo/ejection.ts packages/engine-core/src/l2/hemo/circulation.ts packages/engine-core/test/l2/hemo/circulation.test.ts
git commit -m "feat(hemo): skewed ejection, 4-element Windkessel with radial resonator and pulmonary Windkessel (RK4 2 ms)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Catheter, transducer and line events

**Files:**
- Create: `packages/engine-core/src/l2/hemo/line.ts`, `packages/engine-core/test/l2/hemo/line.test.ts`

**Interfaces:**
- Consumes: `l3/ecg-filter.ts` (`lowpass`, `createFilterState`, `filterSample`, `Biquad` — Stage 1, not owned by Stage 5), `params.ts`, `HemoClinicalEvent`, `LineSensorState` (Task 1).
- Produces: `DISPLAY_FILTER`, `LINE_SENSOR_STATES`, `interface LineState { sensor; fnHz; zeta; levelCm; flushUntil; zeroUntil; sampleUntil; disconnected; x; v; f }`, `createLineState(sensor = 'none')`, `lineActive(ls)`, `lineInput(ls, pPatient, t)`, `lineDynamics(ls)`, `stepTransducer(ls, u0, u1, h)`, `displaySample(ls)`, `settleLine(ls, p)`, `setLineSensor(ls, state, t, pNow)`, `applyLineEvent(ls, ev, t)`, `validateLineEvent(ev): string|undefined`.

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l2/hemo/line.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { applyLineEvent, createLineState, displaySample, lineInput, setLineSensor, stepTransducer } from '../../../src/l2/hemo/line.ts';
import { H_S, SUBSTEPS } from '../../../src/l2/hemo/params.ts';

/** Drive a line with input u(t) for `secs`; returns the displayed 125 Hz samples. */
function drive(ls: ReturnType<typeof createLineState>, u: (t: number) => number, secs: number): number[] {
  const out: number[] = [];
  for (let m = 1; m <= secs * 125; m++) {
    for (let j = 0; j < SUBSTEPS; j++) {
      const ta = (m - 1) / 125 + j * H_S;
      stepTransducer(ls, lineInput(ls, u(ta), ta), lineInput(ls, u(ta + H_S), ta + H_S), H_S);
    }
    out.push(displaySample(ls));
  }
  return out;
}

describe('l2/hemo/line (brief §4.2 transducer and line)', () => {
  it('flush: ≈300 mmHg square wave, then ringing at 1/fn ± 5%', () => {
    const ls = createLineState('connected');
    setLineSensor(ls, 'connected', 0, 12);
    applyLineEvent(ls, { kind: 'line', line: 'abp', action: 'damp', value: 0.2, fnHz: 10 }, 0);
    applyLineEvent(ls, { kind: 'line', line: 'abp', action: 'flush' }, 1);
    const y = drive(ls, () => 12, 4);
    expect(Math.max(...y)).toBeGreaterThan(290);
    const base = y[y.length - 1]!;
    const rel = Math.round(2.0 * 125); // flush ends at 2.0 s
    const zc: number[] = [];
    for (let i = rel + 3; i < y.length - 1; i++) {
      const a = y[i]! - base;
      const b = y[i + 1]! - base;
      if (a < 0 && b >= 0) zc.push(i + -a / (b - a));
    }
    const period = (zc[3]! - zc[0]!) / 3 / 125;
    expect(period).toBeGreaterThan(0.095);
    expect(period).toBeLessThan(0.105);
  });

  it('zero, disconnect and sampling present air (0 mmHg); levelling adds 0.74 mmHg/cm', () => {
    const ls = createLineState('connected');
    applyLineEvent(ls, { kind: 'line', line: 'abp', action: 'zero' }, 0);
    expect(lineInput(ls, 100, 1)).toBe(0);
    expect(lineInput(ls, 100, 4)).toBe(100);
    applyLineEvent(ls, { kind: 'line', line: 'abp', action: 'disconnect' }, 4);
    expect(lineInput(ls, 100, 5)).toBe(0);
    applyLineEvent(ls, { kind: 'line', line: 'abp', action: 'reconnect' }, 5);
    applyLineEvent(ls, { kind: 'line', line: 'abp', action: 'level', value: 10 }, 5);
    expect(lineInput(ls, 100, 6)).toBeCloseTo(107.4, 9);
    applyLineEvent(ls, { kind: 'line', line: 'abp', action: 'sample' }, 6);
    expect(lineInput(ls, 100, 10)).toBe(0);
    expect(lineInput(ls, 100, 16.5)).toBe(300);
  });

  it("'damped' sensor state and 'atmosphere' behave per brief §6.2", () => {
    const ls = createLineState('none');
    setLineSensor(ls, 'atmosphere', 0, 90);
    expect(lineInput(ls, 90, 1)).toBe(0);
    setLineSensor(ls, 'zeroing', 1, 90);
    expect(ls.sensor).toBe('connected');
    expect(lineInput(ls, 90, 2)).toBe(0);
    expect(lineInput(ls, 90, 4.5)).toBe(90);
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/hemo/line.test.ts`
Expected: FAIL — cannot load `../../../src/l2/hemo/line.ts`.

- [x] **Step 3: Implement**

`packages/engine-core/src/l2/hemo/line.ts`:

```ts
// Catheter–tubing–transducer line and display chain (brief §4.2 "Transducer and line"; research 03 §2.6):
//   H(s) = ωn² / (s² + 2ζωn·s + ωn²)  (integrated with RK4 at 2 ms, input linearly interpolated inside a
//   substep), then a 12 Hz display low-pass (RBJ Butterworth biquad at 125 Hz).
// Line modes decide what the transducer sees: the patient (plus 0.74 mmHg/cm levelling offset), the flush
// bag (300 mmHg square wave → ringing at fn on release), air (zero, atmosphere, disconnection, sampling).
import { createFilterState, filterSample, lowpass, type Biquad } from '../../l3/ecg-filter.ts';
import type { HemoClinicalEvent, LineSensorState } from '../../types-hemo.ts';
import {
  DAMP_PRESETS,
  DISPLAY_FILTER_HZ,
  FLUSH_MMHG,
  FLUSH_S,
  HEMO_RATE,
  MMHG_PER_CM,
  SAMPLE_S,
  TRANSDUCER_FN_HZ,
  TRANSDUCER_ZETA,
  ZERO_S,
} from './params.ts';

export const DISPLAY_FILTER: readonly Biquad[] = [lowpass(DISPLAY_FILTER_HZ, HEMO_RATE)];
export const LINE_SENSOR_STATES: readonly LineSensorState[] = ['none', 'atmosphere', 'connected', 'zeroing', 'damped'];

export interface LineState {
  sensor: LineSensorState;
  fnHz: number;
  zeta: number;
  levelCm: number; // transducer below the phlebostatic axis, cm (reads high)
  flushUntil: number;
  zeroUntil: number;
  sampleUntil: number;
  disconnected: boolean;
  x: number; // transducer output (mmHg)
  v: number; // its derivative
  f: number[]; // display filter state
}

export function createLineState(sensor: LineSensorState = 'none'): LineState {
  return {
    sensor,
    fnHz: TRANSDUCER_FN_HZ,
    zeta: TRANSDUCER_ZETA,
    levelCm: 0,
    flushUntil: -1,
    zeroUntil: -1,
    sampleUntil: -1,
    disconnected: false,
    x: 0,
    v: 0,
    f: createFilterState(DISPLAY_FILTER),
  };
}

/** Whether the channel has a trace at all (brief §6.2: 'none' = no trace). */
export function lineActive(ls: LineState): boolean {
  return ls.sensor !== 'none';
}

/** Pressure presented to the transducer at time t, given the patient's pressure at the catheter tip. */
export function lineInput(ls: LineState, pPatient: number, t: number): number {
  if (ls.sensor === 'atmosphere' || ls.sensor === 'zeroing' || t < ls.zeroUntil || t < ls.sampleUntil) return 0;
  if (t < ls.flushUntil) return FLUSH_MMHG;
  if (ls.disconnected) return 0;
  return pPatient + MMHG_PER_CM * ls.levelCm;
}

/** Effective (fn, ζ): the 'damped' sensor state forces the overdamped preset. */
export function lineDynamics(ls: LineState): { fnHz: number; zeta: number } {
  return ls.sensor === 'damped' ? DAMP_PRESETS.over : { fnHz: ls.fnHz, zeta: ls.zeta };
}

/** One RK4 step of the transducer from t to t + h; the input moves linearly from u0 to u1. */
export function stepTransducer(ls: LineState, u0: number, u1: number, h: number): void {
  const { fnHz, zeta } = lineDynamics(ls);
  const w = 2 * Math.PI * fnHz;
  const acc = (x: number, v: number, u: number) => w * w * (u - x) - 2 * zeta * w * v;
  const um = (u0 + u1) / 2;
  const x0 = ls.x;
  const v0 = ls.v;
  const a1 = acc(x0, v0, u0);
  const x2 = x0 + (h / 2) * v0;
  const v2 = v0 + (h / 2) * a1;
  const a2 = acc(x2, v2, um);
  const x3 = x0 + (h / 2) * v2;
  const v3 = v0 + (h / 2) * a2;
  const a3 = acc(x3, v3, um);
  const x4 = x0 + h * v3;
  const v4 = v0 + h * a3;
  const a4 = acc(x4, v4, u1);
  ls.x = x0 + (h / 6) * (v0 + 2 * v2 + 2 * v3 + v4);
  ls.v = v0 + (h / 6) * (a1 + 2 * a2 + 2 * a3 + a4);
}

/** The displayed sample: transducer output through the 12 Hz display filter. */
export function displaySample(ls: LineState): number {
  return filterSample(DISPLAY_FILTER, ls.f, ls.x);
}

/** Put the transducer and display filter at rest on pressure p (no connection transient). */
export function settleLine(ls: LineState, p: number): void {
  ls.x = p;
  ls.v = 0;
  ls.f = createFilterState(DISPLAY_FILTER);
  for (let i = 0; i < 64; i++) filterSample(DISPLAY_FILTER, ls.f, p);
}

/** attachSensor for abp / cvp / pap (brief §6.2). 'zeroing' returns to 'connected' after ZERO_S. */
export function setLineSensor(ls: LineState, state: LineSensorState, t: number, pNow: number): void {
  const was = ls.sensor;
  ls.sensor = state;
  if (state === 'zeroing') {
    ls.zeroUntil = t + ZERO_S;
    ls.sensor = 'connected';
  }
  if (was === 'none' && state !== 'none') settleLine(ls, state === 'atmosphere' ? 0 : pNow);
}

/** applyEvent { kind: 'line' } (brief §7.2): flush, zero, sample, disconnect, reconnect, damp, level. */
export function applyLineEvent(ls: LineState, ev: Extract<HemoClinicalEvent, { kind: 'line' }>, t: number): void {
  switch (ev.action) {
    case 'flush':
      ls.flushUntil = t + FLUSH_S;
      return;
    case 'zero':
      ls.zeroUntil = t + ZERO_S;
      return;
    case 'sample':
      // stopcock off the patient, then the post-sampling flush (research 03 §2.6)
      ls.sampleUntil = t + SAMPLE_S;
      ls.flushUntil = t + SAMPLE_S + FLUSH_S;
      return;
    case 'disconnect':
      ls.disconnected = true;
      return;
    case 'reconnect':
      ls.disconnected = false;
      return;
    case 'damp':
      ls.zeta = ev.value ?? DAMP_PRESETS.over.zeta;
      if (ev.fnHz !== undefined) ls.fnHz = ev.fnHz;
      return;
    case 'level':
      ls.levelCm = ev.value ?? 0;
      return;
    case 'wedge':
      return; // PAP only; handled by the pipeline
  }
}

/** Validation for a 'line' event (brief §4.2 ranges). */
export function validateLineEvent(ev: Extract<HemoClinicalEvent, { kind: 'line' }>): string | undefined {
  if (!['abp', 'cvp', 'pap'].includes(ev.line)) return 'line must be abp, cvp or pap';
  if (ev.action === 'damp') {
    if (ev.value !== undefined && !(ev.value >= 0.05 && ev.value <= 3)) return 'damp ζ must be 0.05–3';
    if (ev.fnHz !== undefined && !(ev.fnHz >= 5 && ev.fnHz <= 40)) return 'damp fnHz must be 5–40';
  }
  if (ev.action === 'level' && ev.value !== undefined && !(Math.abs(ev.value) <= 60)) return 'level must be within ±60 cm';
  if (ev.action === 'wedge' && ev.line !== 'pap') return 'wedge applies to the pap line only';
  return undefined;
}
```

- [x] **Step 4: Run it to see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/hemo/line.test.ts`
Expected: PASS (3 tests); the ring period at fn 10 Hz, ζ 0.2 is ≈ 102 ms.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/hemo/line.ts packages/engine-core/test/l2/hemo/line.test.ts
git commit -m "feat(hemo): transducer (fn/ζ), 12 Hz display filter, flush/zero/sample/disconnect/level/damp" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: CVP generator (five Gaussians from P and QRS events)

**Files:**
- Create: `packages/engine-core/src/l2/hemo/cvp.ts`, `packages/engine-core/test/l2/hemo/cvp.test.ts`

**Interfaces:**
- Consumes: `ejection.ts` (`Pulse`, `pressureAt`), `params.ts` (`breathU`).
- Produces: `interface Wave { t; a; s }`, `CVP_WAVES`, `CANNON_GAIN` 3, `CVP_RESP_MMHG` 3, `interface CvpState { waves; corr; pendingArea; lastOnset; lastQt }`, `createCvpState()`, `cvpOnP(st, tP)`, `cvpOnBeat(st, tR, qrsMs, qtMs, rr)`, `cvpWavesAt(st, t)`, `cvpAt(st, t, pv, phi, thor)`, `pruneCvp(st, t, arrested)`.

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l2/hemo/cvp.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createCvpState, cvpOnBeat, cvpOnP, cvpWavesAt } from '../../../src/l2/hemo/cvp.ts';

describe('l2/hemo/cvp (brief §4.2 CVP; research 03 §2.9)', () => {
  it('a wave peaks 60 ms after P onset in the truth (80–100 ms once displayed); c, v follow the QRS and T', () => {
    const st = createCvpState();
    cvpOnP(st, 1.0);
    cvpOnBeat(st, 1.2, 90, 400, 1);
    let best = 1;
    for (let t = 1; t < 1.15; t += 0.001) if (cvpWavesAt(st, t) > cvpWavesAt(st, best)) best = t;
    expect(best).toBeCloseTo(1.06, 2);
  });

  it('a P wave inside ventricular systole makes a cannon a wave (×3)', () => {
    const st = createCvpState();
    cvpOnBeat(st, 1.0, 90, 400, 1);
    cvpOnP(st, 1.2); // between QRS onset (0.96) and T end (1.36)
    const cannon = st.waves[st.waves.length - 1]!.a;
    cvpOnP(st, 2.0);
    expect(cannon).toBe(3 * st.waves[st.waves.length - 1]!.a);
  });

  it('the mean correction keeps the waves zero-mean over a beat', () => {
    const st = createCvpState();
    for (let k = 0; k < 10; k++) {
      cvpOnP(st, k - 0.16);
      cvpOnBeat(st, k, 90, 400, 1);
    }
    let s = 0;
    for (let t = 5; t < 8; t += 0.001) s += cvpWavesAt(st, t);
    expect(s / 3000).toBeCloseTo(0, 1);
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/hemo/cvp.test.ts`
Expected: FAIL — cannot load `../../../src/l2/hemo/cvp.ts`.

- [x] **Step 3: Implement**

`packages/engine-core/src/l2/hemo/cvp.ts`:

```ts
// CVP (right-atrial pressure) generator (brief §4.2 "CVP"; research 03 §2.9): five Gaussians timed from ECG
// events on top of the venous mean. Parametric, not the Infirmary Integrated vertex table: the brief
// specifies Gaussians, and they re-time themselves to each P and QRS (AF, CHB, cannon a waves), which a
// one-cycle vertex table cannot do without the same re-timing.
//   a  peaks 80–100 ms after P onset (atrial systole)          → P onset + 60 ms (+30 ms display delay)
//   c  end of the QRS (tricuspid bulging)                        → R + QRS − 40 ms
//   x  trough in ventricular systole                             → c + 120 ms
//   v  near the end of the T wave                                → QRS onset + QT
//   y  trough after tricuspid opening                            → v + 160 ms
// AF has no P records, so no a wave. A P wave falling inside ventricular systole gives a cannon a wave.
// Amplitudes a 2–4, v 1–3 mmHg (research 03 §2.9) [ENG within range].
import type { Pulse } from './ejection.ts';
import { pressureAt } from './ejection.ts';
import { breathU } from './params.ts';

export interface Wave {
  t: number; // centre, s
  a: number; // mmHg
  s: number; // σ, s
}

export const CVP_WAVES = {
  a: { a: 3, s: 0.035, dt: 0.06 }, // displayed peak = +60 ms + ≈30 ms transducer/display delay → 80–100 ms
  c: { a: 1.5, s: 0.02 },
  x: { a: -2.5, s: 0.06, dt: 0.12 },
  v: { a: 2.5, s: 0.05 },
  y: { a: -2.5, s: 0.06, dt: 0.16 },
} as const;
export const CANNON_GAIN = 3; // cannon a wave ≈ 3× a [ENG]
export const CVP_RESP_MMHG = 3; // positive-pressure insufflation raises CVP (research 03 §2.9) [ENG 2–5]
const SQRT_2PI = Math.sqrt(2 * Math.PI);

export interface CvpState {
  waves: Wave[];
  /** Mean contribution of the waves per second, subtracted so the displayed mean stays at the venous mean. */
  corr: number;
  pendingArea: number; // area of a waves since the last beat
  lastOnset: number; // QRS onset of the last beat (s)
  lastQt: number; // its QT (s)
}

export function createCvpState(): CvpState {
  return { waves: [], corr: 0, pendingArea: 0, lastOnset: -1e12, lastQt: 0 };
}

const area = (w: { a: number; s: number }) => w.a * w.s * SQRT_2PI;

/** An atrial P wave with onset tP (brief §4.2: cannon a when the P falls in ventricular systole). */
export function cvpOnP(st: CvpState, tP: number): void {
  const inSystole = tP >= st.lastOnset && tP <= st.lastOnset + st.lastQt;
  const a = CVP_WAVES.a.a * (inSystole ? CANNON_GAIN : 1);
  st.waves.push({ t: tP + CVP_WAVES.a.dt, a, s: CVP_WAVES.a.s });
  st.pendingArea += area({ a, s: CVP_WAVES.a.s });
}

/** A ventricular beat with R time tR, QRS and QT in ms, preceded by an RR of rr seconds. */
export function cvpOnBeat(st: CvpState, tR: number, qrsMs: number, qtMs: number, rr: number): void {
  const onset = tR - 0.04;
  const tc = tR + qrsMs / 1000 - 0.04;
  const tv = onset + qtMs / 1000;
  const w: Wave[] = [
    { t: tc, a: CVP_WAVES.c.a, s: CVP_WAVES.c.s },
    { t: tc + CVP_WAVES.x.dt, a: CVP_WAVES.x.a, s: CVP_WAVES.x.s },
    { t: tv, a: CVP_WAVES.v.a, s: CVP_WAVES.v.s },
    { t: tv + CVP_WAVES.y.dt, a: CVP_WAVES.y.a, s: CVP_WAVES.y.s },
  ];
  st.waves.push(...w);
  const beatArea = w.reduce((acc, x) => acc + area(x), st.pendingArea);
  st.corr = beatArea / Math.max(0.25, rr);
  st.pendingArea = 0;
  st.lastOnset = onset;
  st.lastQt = qtMs / 1000;
}

/** Sum of the wave deviations at time t (mean-corrected). */
export function cvpWavesAt(st: CvpState, t: number): number {
  let p = -st.corr;
  for (const w of st.waves) {
    const d = t - w.t;
    if (d > -4 * w.s && d < 4 * w.s) p += w.a * Math.exp((-d * d) / (2 * w.s * w.s));
  }
  return p;
}

/** CVP at time t: venous mean + waves + positive-pressure respiratory swing + CPR thoracic pulses. */
export function cvpAt(st: CvpState, t: number, pv: number, phi: number, thor: readonly Pulse[]): number {
  return pv + cvpWavesAt(st, t) + CVP_RESP_MMHG * (breathU(t, phi) - 0.5) + pressureAt(thor, t);
}

/** Drop waves that can no longer contribute; stop the mean correction when no beat arrives (arrest). */
export function pruneCvp(st: CvpState, t: number, arrested: boolean): void {
  st.waves = st.waves.filter((w) => w.t + 4 * w.s >= t);
  if (arrested) st.corr = 0;
}
```

- [x] **Step 4: Run it to see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/hemo/cvp.test.ts`
Expected: PASS (3 tests).

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/hemo/cvp.ts packages/engine-core/test/l2/hemo/cvp.test.ts
git commit -m "feat(hemo): parametric CVP (a/c/x/v/y Gaussians, cannon a waves, respiratory swing)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: MANUAL pressure-target tracker (coupling rule M2)

**Files:**
- Create: `packages/engine-core/src/l2/hemo/tracker.ts`, `packages/engine-core/test/l2/hemo/tracker.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `TRACK_ALPHA` 0.25, `TRACK_ALPHA_R` 0.5, `TRACK_BEATS` 4, `REF_E_MIN` 0.4, `REF_E_MAX` 1.05, `REF_CARRY_MAX` 0.25, `isReferenceBeat(e, carryMl, nominalMl, ventricular = false)`, `interface TrackerLimits { gMin; gMax; rMin; rMax }`, `interface TrackerState { g; R; ref: number[][]; saturated; lastRefT }`, `createTracker(R0)`, `interface SiteBeat { t; sbp; dbp; map; ref: boolean; sv; dur }`, `trackBeat(tr, b, target: {sbp, dbp}, pFloor, lim, gCap)`.

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l2/hemo/tracker.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createTracker, isReferenceBeat, trackBeat } from '../../../src/l2/hemo/tracker.ts';

const LIM = { gMin: 0.1, gMax: 2, rMin: 0.3, rMax: 4 };

describe('l2/hemo/tracker (brief §4.9 M2)', () => {
  it('reference beats exclude PVCs, potentiated and carried-over beats and ventricular rhythms', () => {
    expect(isReferenceBeat(1, 0, 70)).toBe(true);
    expect(isReferenceBeat(0.6, 12, 70)).toBe(true); // an ordinary AF beat
    expect(isReferenceBeat(0.07, 0, 70)).toBe(false);
    expect(isReferenceBeat(1.27, 0, 70)).toBe(false);
    expect(isReferenceBeat(1, 20, 70)).toBe(false);
    expect(isReferenceBeat(0.5, 0, 70, true)).toBe(false);
  });

  it('a toy linear plant (PP ∝ g, MAP = 5 + R·Q̄) converges on 90/50 within 30 beats', () => {
    const tr = createTracker(1.05);
    let beat = { sbp: 0, dbp: 0, map: 0 };
    for (let k = 0; k < 30; k++) {
      const q = (70 * tr.g) / 0.8;
      const map = 5 + tr.R * q;
      const pp = 40 * tr.g;
      beat = { sbp: map + (2 / 3) * pp, dbp: map - pp / 3, map };
      trackBeat(tr, { t: k, ...beat, ref: true, sv: 70 * tr.g, dur: 0.8 }, { sbp: 90, dbp: 50 }, 5, LIM, 2);
    }
    expect(beat.sbp).toBeCloseTo(90, 0);
    expect(beat.dbp).toBeCloseTo(50, 0);
    expect(tr.saturated).toBe(false);
  });

  it('a binding ceiling saturates (→ the override flag)', () => {
    const tr = createTracker(1.05);
    for (let k = 0; k < 20; k++) trackBeat(tr, { t: k, sbp: 100, dbp: 90, map: 95, ref: true, sv: 70, dur: 0.8 }, { sbp: 200, dbp: 60 }, 5, LIM, 1.1);
    expect(tr.g).toBe(1.1);
    expect(tr.saturated).toBe(true);
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/hemo/tracker.test.ts`
Expected: FAIL — cannot load `../../../src/l2/hemo/tracker.ts`.

- [x] **Step 3: Implement**

`packages/engine-core/src/l2/hemo/tracker.ts`:

```ts
// MANUAL pressure-target tracker (brief §4.9 coupling rule M2): "a per-beat PI tracker adjusts SV (pulse
// pressure) and R (mean) with τ ≈ 3 beats, so site SBP/DBP converge on the targets. AF, PVCs, CPR and line
// faults still act." Implementation [ENG]:
//   - input: the TRUE site pressures of each completed beat (before the transducer, so damping and line
//     faults still show on the display);
//   - only REFERENCE beats enter it: supraventricular, ejection factor 0.4 ≤ E ≤ 1.05, carry-over ≤ 25% of a
//     normal SV, and the previous beat also a reference beat. So PVCs, post-PVC potentiated beats, tiny AF beats
//     and every ventricular rhythm (VT, idioventricular escape) neither drive nor get cancelled by the tracker,
//     while ordinary AF beats still let the instructor move the pressure;
//   - multiplicative updates per reference beat (time constant ≈ 3–4 beats):
//       g ← g·(PP*/PP)^0.25                    PP = mean of the last 4 reference beats
//       R ← R·(R*/R)^0.5,  R* = (MAP* − P_floor)/Q̄  the steady-state Windkessel inverse (MAP = P_floor + R·Q̄),
//     with Q̄ = Σ SV / Σ beat duration over the last 4 reference beats, MAP* = DBP* + ff·PP*, and
//     ff = measured form factor (MAP − DBP)/PP. Feeding back MAP itself would lag by R·C (≈ 2 beats) and
//     oscillate; the inverse does not;
//   - g is capped by the M3 ceiling (SV plateaus above ~150 bpm) and R by [rMin, rMax]; a binding cap sets
//     `saturated`, which the pipeline reports as the 'override' flag on sbp/dbp.

export const TRACK_ALPHA = 0.25; // g: PP feedback (4-beat mean + one beat of intake delay → larger gains ring)
export const TRACK_ALPHA_R = 0.5; // R: steady-state inverse, no feedback lag
export const TRACK_BEATS = 4;
export const REF_E_MIN = 0.4;
export const REF_E_MAX = 1.05;
export const REF_CARRY_MAX = 0.25;

/** Whether a beat may drive the tracker (see header; the "previous beat" rule is applied by the caller). */
export function isReferenceBeat(e: number, carryMl: number, nominalMl: number, ventricular = false): boolean {
  return !ventricular && e >= REF_E_MIN && e <= REF_E_MAX && carryMl <= REF_CARRY_MAX * nominalMl;
}

export interface TrackerLimits {
  gMin: number;
  gMax: number;
  rMin: number;
  rMax: number;
}

export interface TrackerState {
  g: number;
  R: number;
  ref: number[][]; // [sbp, dbp, map, sv, dur] of the last TRACK_BEATS reference beats
  saturated: boolean;
  lastRefT: number;
}

export function createTracker(R0: number): TrackerState {
  return { g: 1, R: R0, ref: [], saturated: false, lastRefT: -1e12 };
}

export interface SiteBeat {
  t: number;
  sbp: number;
  dbp: number;
  map: number;
  ref: boolean; // isReferenceBeat(...) at ejection time
  sv: number; // mL ejected by this beat
  dur: number; // s, from this ejection to the next
}

/** Feed one completed beat. `gCap` is the M3 ceiling for this RR (params.gainCeiling). */
export function trackBeat(
  tr: TrackerState,
  b: SiteBeat,
  target: { sbp: number; dbp: number },
  pFloor: number,
  lim: TrackerLimits,
  gCap: number,
): void {
  if (!b.ref) return;
  tr.lastRefT = b.t;
  tr.ref.push([b.sbp, b.dbp, b.map, b.sv, b.dur]);
  if (tr.ref.length > TRACK_BEATS) tr.ref.shift();
  const sum = (i: number) => tr.ref.reduce((a, r) => a + (r[i] as number), 0);
  const n = tr.ref.length;
  const pp = Math.max(1, (sum(0) - sum(1)) / n);
  const dbp = sum(1) / n;
  const map = sum(2) / n;
  const ppT = Math.max(2, target.sbp - target.dbp);
  const ff = Math.min(0.6, Math.max(0.25, (map - dbp) / pp));
  const mapT = target.dbp + ff * ppT;
  const qBar = sum(3) / Math.max(1e-3, sum(4));
  const rStar = Math.max(1, mapT - pFloor) / Math.max(1, qBar);
  const g = tr.g * (ppT / pp) ** TRACK_ALPHA;
  const r = tr.R * (rStar / tr.R) ** TRACK_ALPHA_R;
  const gHi = Math.min(lim.gMax, gCap);
  tr.g = Math.min(gHi, Math.max(lim.gMin, g));
  tr.R = Math.min(lim.rMax, Math.max(lim.rMin, r));
  tr.saturated = tr.g !== g || tr.R !== r;
}
```

- [x] **Step 4: Run it to see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/hemo/tracker.test.ts`
Expected: PASS (3 tests).

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/hemo/tracker.ts packages/engine-core/test/l2/hemo/tracker.test.ts
git commit -m "feat(hemo): M2 tracker — PP feedback on reference beats, R by the Windkessel inverse, M3 ceiling" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Pleth generator

**Files:**
- Create: `packages/engine-core/src/l2/pleth/pleth.ts`, `packages/engine-core/test/l2/pleth/pleth.test.ts`

**Interfaces:**
- Consumes: `rng/sfc32.ts` (`uniform`, `Sfc32State`), `Spo2Site` (Task 1), `params.ts` (`EAR_DELAY_S`, `FINGER_DELAY_S`, `WK_R0`).
- Produces: `PLETH_KERNEL`, `interface PlethPulse { t0; amp; sc; a2 }`, `interface PlethState { state: 'on'|'off'|'motion'; site: Spo2Site; pulses; motion }`, `createPlethState(state = 'on', site = 'leftFinger')`, `plethDelayS(site)`, `toneRatio(R)`, `addPlethPulse(st, t0, amp, lvet, R)`, `plethShape(p, u)`, `plethAt(st, t, occlusion, pi)`, `prunePleth(st, t)`, `setPlethSensor(st, state, site, rng)`.

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l2/pleth/pleth.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { addPlethPulse, createPlethState, plethAt, plethDelayS, toneRatio } from '../../../src/l2/pleth/pleth.ts';

describe('l2/pleth (brief §4.3 pleth; research 03 §3.1–3.3)', () => {
  it('one pulse of amplitude ≈ PI per mechanical beat, peaking ≈ 260 ms after its origin at LVET 311 ms', () => {
    const st = createPlethState();
    addPlethPulse(st, 1, 2, 0.311, 1.05);
    let best = 1;
    for (let t = 0.8; t < 2.2; t += 0.002) if (plethAt(st, t, 1, 2) > plethAt(st, best, 1, 2)) best = t;
    expect(best - 1).toBeCloseTo(0.259, 2);
    expect(plethAt(st, best, 1, 2)).toBeGreaterThan(1.9);
    expect(plethAt(st, best, 1, 2)).toBeLessThan(2.1);
  });

  it('no pulse when amp ≤ 0 (pulse deficit), flat under an occluding cuff and with the probe off', () => {
    const st = createPlethState();
    addPlethPulse(st, 1, 0, 0.3, 1.05);
    expect(st.pulses).toHaveLength(0);
    addPlethPulse(st, 1, 2, 0.3, 1.05);
    expect(plethAt(st, 1.26, 0, 2)).toBe(0);
    st.state = 'off';
    expect(plethAt(st, 1.26, 1, 2)).toBe(0);
  });

  it('vascular tone sets a2/a1; ear and forehead probes are earlier than the finger', () => {
    expect(toneRatio(1.05)).toBeCloseTo(0.2, 9);
    expect(toneRatio(0.525)).toBeCloseTo(0.5, 9);
    expect(toneRatio(2.1)).toBeCloseTo(0.08, 9);
    expect(plethDelayS('ear')).toBeLessThan(plethDelayS('leftFinger'));
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/pleth`
Expected: FAIL — cannot load `../../../src/l2/pleth/pleth.ts`.

- [x] **Step 3: Implement**

`packages/engine-core/src/l2/pleth/pleth.ts`:

```ts
// Plethysmogram generator (brief §4.3 "Pleth"; research 03 §3.1–3.4). One pulse per MECHANICAL beat (so
// pulse deficits come for free), placed at t_R + PEP + site delay, built from two Gaussian kernels in time
// (Tang et al. 2020 "excellent" pulse, converted from the phase circle at RR 1 s: θ1 −1.5161 → peak 0.259 s,
// b1 0.6303 → σ 0.100 s; θ2 0.8186 → 0.630 s, b2 1.0225 → σ 0.163 s), time-scaled by LVET/311 ms.
// Amplitude = PI × (SV_i/SV_0)^γ with γ = 1, carried in PI units so the L3 PI numeric is measured from
// the trace. Vascular tone sets a2/a1: vasodilated 0.4–0.6, vasoconstricted 0.1–0.2.
import { uniform, type Sfc32State } from '../../rng/sfc32.ts';
import type { Spo2Site } from '../../types-hemo.ts';
import { EAR_DELAY_S, FINGER_DELAY_S, WK_R0 } from '../hemo/params.ts';

export const PLETH_KERNEL = { mu1: 0.259, s1: 0.1003, mu2: 0.63, s2: 0.1627 } as const;
const LVET_REF_S = 0.311; // Weissler LVET at 60 bpm
const SUPPORT_S = 1.3; // μ2 + 4σ2 at scale 1
const LEAD_S = 0.15; // μ1 − 4σ1 ≈ −0.14 s: the systolic kernel starts before its origin (no step at the foot)

export interface PlethPulse {
  t0: number;
  amp: number; // PI units (%)
  sc: number; // time scale (LVET / 311 ms)
  a2: number; // diastolic / systolic kernel ratio
}

export interface PlethState {
  state: 'on' | 'off' | 'motion';
  site: Spo2Site;
  pulses: PlethPulse[];
  motion: number[]; // phases of the motion artefact sinusoids
}

export function createPlethState(state: PlethState['state'] = 'on', site: Spo2Site = 'leftFinger'): PlethState {
  return { state, site, pulses: [], motion: [0, 0, 0] };
}

/** Site delay after aortic valve opening (research 03 §2.1: finger PPG foot 200–300 ms after R). */
export function plethDelayS(site: Spo2Site): number {
  return site === 'ear' || site === 'forehead' ? EAR_DELAY_S : FINGER_DELAY_S;
}

/** a2/a1 from systemic resistance: R halved → 0.5 (vasodilated), R doubled → 0.1 (vasoconstricted) [ENG]. */
export function toneRatio(R: number): number {
  return Math.min(0.6, Math.max(0.08, 0.2 - 0.3 * Math.log2(R / WK_R0)));
}

export function addPlethPulse(st: PlethState, t0: number, amp: number, lvet: number, R: number): void {
  if (!(amp > 0)) return;
  st.pulses.push({ t0, amp, sc: lvet / LVET_REF_S, a2: toneRatio(R) });
}

/** One pulse shape at u seconds after its origin; peak ≈ 1. */
export function plethShape(p: PlethPulse, u: number): number {
  const k = PLETH_KERNEL;
  const d1 = u - k.mu1 * p.sc;
  const d2 = u - k.mu2 * p.sc;
  const s1 = k.s1 * p.sc;
  const s2 = k.s2 * p.sc;
  return (Math.exp((-d1 * d1) / (2 * s1 * s1)) + p.a2 * Math.exp((-d2 * d2) / (2 * s2 * s2))) / (1 + 0.075 * p.a2);
}

/** Pleth sample at time t. `occlusion` ∈ [0, 1] is 1 with no cuff on the same limb. */
export function plethAt(st: PlethState, t: number, occlusion: number, pi: number): number {
  if (st.state === 'off') return 0;
  let v = 0;
  for (const p of st.pulses) {
    const u = t - p.t0;
    if (u > -LEAD_S * p.sc && u < SUPPORT_S * p.sc) v += p.amp * plethShape(p, u);
  }
  v *= occlusion;
  if (st.state === 'motion') {
    // motion artefact 0.5–5 Hz, larger than the pulse (research 03 §3.4) [ENG]
    const m = st.motion;
    v += 1.5 * pi * (Math.sin(2 * Math.PI * 1.3 * t + (m[0] as number)) + 0.6 * Math.sin(2 * Math.PI * 2.7 * t + (m[1] as number)) + 0.4 * Math.sin(2 * Math.PI * 0.7 * t + (m[2] as number)));
  }
  return v;
}

export function prunePleth(st: PlethState, t: number): void {
  st.pulses = st.pulses.filter((p) => p.t0 + SUPPORT_S * p.sc >= t);
}

/** attachSensor spo2 (brief §6.2): on / off / motion, site. Motion phases come from the artefact stream. */
export function setPlethSensor(st: PlethState, state: PlethState['state'], site: Spo2Site | undefined, rng: Sfc32State): void {
  st.state = state;
  if (site) st.site = site;
  if (state === 'motion') st.motion = [0, 1, 2].map(() => 2 * Math.PI * uniform(rng));
}
```

- [x] **Step 4: Run it to see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/pleth`
Expected: PASS (3 tests).

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/pleth packages/engine-core/test/l2/pleth
git commit -m "feat(pleth): two-kernel pleth per mechanical beat with PI amplitude, tone and site delay" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Slope-sum pulse detector, pulse rate and the PR source rule

**Files:**
- Create: `packages/engine-core/src/l3/pulse/detector.ts`, `packages/engine-core/test/l3/pulse/detector.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `DET_RATE` 125, `interface PulseDetState`, `createPulseDet(floor, startIndex = 0)`, `pulseStep(st, x): number` (absolute foot index or −1), `pulseRate(feet: number[]): number|null`, `prSource(spo2: 'on'|'off'|'motion', abpActive: boolean): 'pleth'|'abp'|null`.

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l3/pulse/detector.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createPulseDet, prSource, pulseRate, pulseStep } from '../../../src/l3/pulse/detector.ts';

/** A crude arterial-like wave: fast rise, slow fall, a dicrotic bump; period RR s. */
function wave(t: number, rr: number): number {
  const u = (t % rr) / rr;
  const up = u < 0.12 ? u / 0.12 : Math.exp(-(u - 0.12) * 3);
  const bump = 0.25 * Math.exp(-(((u - 0.4) / 0.05) ** 2));
  return 80 + 40 * (up + bump);
}

describe('l3/pulse detector (slope sum, Zong 2003)', () => {
  it('finds one foot per beat, near the true foot, and ignores the dicrotic wave', () => {
    const st = createPulseDet(3);
    const feet: number[] = [];
    for (let n = 0; n < 125 * 20; n++) {
      const f = pulseStep(st, wave(n / 125, 0.8));
      if (f >= 0) feet.push(f / 125);
    }
    expect(feet.length).toBeGreaterThanOrEqual(24);
    expect(feet.length).toBeLessThanOrEqual(25);
    for (const f of feet.slice(2)) expect(Math.abs(f - Math.round(f / 0.8) * 0.8)).toBeLessThan(0.03);
    expect(pulseRate(feet)).toBeCloseTo(75, 0);
  });

  it('a flat line gives no pulses; PR source rule', () => {
    const st = createPulseDet(3);
    for (let n = 0; n < 1000; n++) expect(pulseStep(st, 12)).toBe(-1);
    expect(prSource('on', true)).toBe('pleth');
    expect(prSource('off', true)).toBe('abp');
    expect(prSource('motion', false)).toBeNull();
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l3/pulse`
Expected: FAIL — cannot load `../../../src/l3/pulse/detector.ts`.

- [x] **Step 3: Implement**

`packages/engine-core/src/l3/pulse/detector.ts`:

```ts
// Pulse (upstroke) detector for ABP, PAP and pleth (brief §4.2 "PR from the ABP uses slope-sum upstroke
// detection"; research 03 §2.2). Slope-sum function after Zong et al. 2003 (written from the paper's
// description): SSF(n) = Σ_{k=n−w+1..n} max(0, x_k − x_{k−1}), w = 128 ms. A pulse is an upward crossing of
// an adaptive threshold (35% of the running SSF-peak average, never below a per-channel floor) outside a
// 250 ms refractory period; its foot is the minimum of the signal in the 128 ms before the crossing.
// Scale-free, so it works on mmHg (ABP/PAP) and on PI units (pleth). All state is plain data.

export const DET_RATE = 125;
const W = 16; // 128 ms at 125 Hz
const HIST = 32; // 256 ms of history for the foot search
const REFRACTORY_N = 31; // 250 ms
const PEAK_TRACK_N = 20; // SSF peak searched for 160 ms after the crossing
const THR_FRACTION = 0.6; // 60% of the recent SSF peaks (Zong 2003)
const SILENCE_N = 375; // after 3 s without a pulse the peak average decays (τ 2 s) [ENG]
const DECAY = Math.exp(-1 / (2 * DET_RATE));

export interface PulseDetState {
  n: number; // absolute index of the NEXT sample
  prev: number;
  inc: number[]; // ring of the last W positive increments
  ssf: number;
  hist: number[]; // ring of the last HIST samples
  floor: number;
  peakAvg: number;
  above: boolean;
  trackUntil: number;
  trackPeak: number;
  lastFoot: number; // absolute index, or -1
}

/** `floor`: minimum SSF threshold in signal units (ABP 3 mmHg, PAP 1.5 mmHg, pleth 0.03 %) [ENG]. */
export function createPulseDet(floor: number, startIndex = 0): PulseDetState {
  return {
    n: startIndex,
    prev: Number.NaN,
    inc: new Array<number>(W).fill(0),
    ssf: 0,
    hist: new Array<number>(HIST).fill(0),
    floor,
    peakAvg: 0,
    above: false,
    trackUntil: -1,
    trackPeak: 0,
    lastFoot: -1,
  };
}

/** Feed one sample. Returns the absolute index of a newly detected pulse foot, or −1. */
export function pulseStep(st: PulseDetState, x: number): number {
  const n = st.n++;
  const d = Number.isNaN(st.prev) ? 0 : Math.max(0, x - st.prev);
  st.prev = x;
  st.ssf += d - (st.inc[n % W] as number);
  st.inc[n % W] = d;
  st.hist[n % HIST] = x;
  if (st.ssf < 1e-9) st.ssf = 0; // float drift
  if (st.trackUntil >= n) {
    st.trackPeak = Math.max(st.trackPeak, st.ssf);
    if (st.trackUntil === n) st.peakAvg = st.peakAvg === 0 ? st.trackPeak : 0.75 * st.peakAvg + 0.25 * st.trackPeak;
  }
  if (st.lastFoot >= 0 && n - st.lastFoot > SILENCE_N) st.peakAvg *= DECAY;
  const thr = Math.max(st.floor, THR_FRACTION * st.peakAvg);
  let foot = -1;
  if (!st.above && st.ssf >= thr && (st.lastFoot < 0 || n - st.lastFoot > REFRACTORY_N)) {
    st.above = true;
    let best = n;
    let bestV = x;
    for (let k = 1; k < W; k++) {
      const v = st.hist[(n - k + HIST) % HIST] as number;
      if (n - k >= 0 && v < bestV) {
        bestV = v;
        best = n - k;
      }
    }
    foot = best;
    st.lastFoot = best;
    st.trackUntil = n + PEAK_TRACK_N;
    st.trackPeak = st.ssf;
  } else if (st.above && st.ssf < 0.5 * thr) {
    st.above = false;
  }
  return foot;
}

/** Pulse rate from foot times (s): 60 / mean of the last ≤ 8 intervals that are 0.2–3 s long. */
export function pulseRate(feet: readonly number[]): number | null {
  const iv: number[] = [];
  for (let i = feet.length - 1; i > 0 && iv.length < 8; i--) {
    const d = (feet[i] as number) - (feet[i - 1] as number);
    if (d >= 0.2 && d <= 3) iv.push(d);
  }
  if (iv.length < 2) return null;
  return 60 / (iv.reduce((a, b) => a + b, 0) / iv.length);
}

/** PR source rule stub (brief §6.1): pleth when the SpO2 probe is on, else the arterial line, else none. */
export function prSource(spo2: 'on' | 'off' | 'motion', abpActive: boolean): 'pleth' | 'abp' | null {
  if (spo2 === 'on') return 'pleth';
  return abpActive ? 'abp' : null;
}
```

- [x] **Step 4: Run it to see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l3/pulse`
Expected: PASS (2 tests).

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l3/pulse packages/engine-core/test/l3/pulse
git commit -m "feat(l3): slope-sum pulse detector, pulse rate and PR source rule" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Pressure numerics (per-beat S/D/M by integral, PI, PR)

**Files:**
- Create: `packages/engine-core/src/l3/pressure-numerics/numerics.ts`, `packages/engine-core/test/l3/pressure-numerics/numerics.test.ts`

**Interfaces:**
- Consumes: `detector.ts` (Task 9), `Measured` (Stage 1).
- Produces: `AVG_BEATS` 6, `interface BeatValues { t; sys; dia; mean; dur }`, `interface WaveNumerics { det; ring; n; prevFoot; beats; feet }`, `createWaveNumerics(floor)`, `numericsStep(wn, m, x): BeatValues|null`, `pressureNumerics(wn, t): { sys: Measured; dia: Measured; mean: Measured }`, `piNumeric(wn, t): Measured`, `prNumeric(wn, t): Measured`.

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l3/pressure-numerics/numerics.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createWaveNumerics, numericsStep, pressureNumerics, prNumeric } from '../../../src/l3/pressure-numerics/numerics.ts';

describe('l3/pressure-numerics (brief §4.2 numerics)', () => {
  it('per-beat max/min and MAP by INTEGRAL, averaged, then the flat-line fallback', () => {
    const wn = createWaveNumerics(3);
    const x = (t: number) => {
      const u = (t % 1) / 1;
      return u < 0.1 ? 80 + 400 * u : 80 + 40 * Math.exp(-(u - 0.1) * 6);
    };
    let sum = 0;
    let n = 0;
    for (let m = 0; m < 125 * 20; m++) {
      const v = x(m / 125);
      numericsStep(wn, m, v);
      if (m >= 125 * 12) {
        sum += v;
        n++;
      }
    }
    const p = pressureNumerics(wn, 20);
    expect(p.sys.flag).toBe('valid');
    expect(Math.abs(p.sys.value! - 120)).toBeLessThan(1.5); // the 125 Hz grid can miss the exact peak
    expect(Math.abs(p.dia.value! - 80)).toBeLessThan(1.5);
    expect(Math.abs(p.mean.value! - sum / n)).toBeLessThan(1);
    expect(prNumeric(wn, 20).value).toBe(60);
    for (let m = 125 * 20; m < 125 * 30; m++) numericsStep(wn, m, 12);
    const flat = pressureNumerics(wn, 30);
    expect(flat.mean.flag).toBe('questionable');
    expect(flat.mean.value).toBeCloseTo(12, 6);
    expect(prNumeric(wn, 30).flag).toBe('invalid');
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l3/pressure-numerics`
Expected: FAIL — cannot load `../../../src/l3/pressure-numerics/numerics.ts`.

- [x] **Step 3: Implement**

`packages/engine-core/src/l3/pressure-numerics/numerics.ts`:

```ts
// Device pressure numerics (brief §4.2 "Numerics (L3)", §6.1; research 03 §2.2): per-beat SBP/DBP = max/min of
// the DISPLAYED (transducer + 12 Hz filter) waveform between two detected feet; MAP = the INTEGRAL of the
// beat (never a formula); values averaged over the last 6 beats (4–8) and emitted at 1 Hz. Also the pleth
// PI (mean peak-to-trough of the last 6 pulses) and the pulse rate from the chosen source.
import type { Measured } from '../../types.ts';
import { createPulseDet, pulseRate, pulseStep, type PulseDetState } from '../pulse/detector.ts';

export const AVG_BEATS = 6; // 4–8 beats (brief §4.2) [ENG]
const RING = 400; // 3.2 s at 125 Hz: the longest beat measured (HR ≥ 19)
const STALE_S = 6; // no beat for 6 s → non-pulsatile [ENG]

export interface BeatValues {
  t: number; // foot time of the beat's end (s)
  sys: number;
  dia: number;
  mean: number;
  dur: number; // s
}

export interface WaveNumerics {
  det: PulseDetState;
  ring: number[];
  n: number; // absolute index of the next sample
  prevFoot: number;
  beats: BeatValues[];
  feet: number[]; // foot times (s), last 10
}

export function createWaveNumerics(floor: number): WaveNumerics {
  return { det: createPulseDet(floor), ring: new Array<number>(RING).fill(0), n: 0, prevFoot: -1, beats: [], feet: [] };
}

/** Feed one displayed sample (absolute index m, 125 Hz). Returns the completed beat, if any. */
export function numericsStep(wn: WaveNumerics, m: number, x: number): BeatValues | null {
  if (wn.n !== m) {
    // a gap (sensor detached/re-attached): restart detection at m
    wn.det = createPulseDet(wn.det.floor, m);
    wn.prevFoot = -1;
  }
  wn.n = m + 1;
  wn.ring[m % RING] = x;
  const f = pulseStep(wn.det, x);
  if (f < 0) return null;
  wn.feet.push(f / 125);
  if (wn.feet.length > 10) wn.feet.shift();
  const p = wn.prevFoot;
  wn.prevFoot = f;
  if (p < 0 || f - p < 25 || f - p > RING - 16 || m - p >= RING) return null;
  let mx = -Infinity;
  let mn = Infinity;
  let sum = 0;
  for (let k = p; k < f; k++) {
    const v = wn.ring[k % RING] as number;
    if (v > mx) mx = v;
    if (v < mn) mn = v;
    sum += v;
  }
  const b = { t: f / 125, sys: mx, dia: mn, mean: sum / (f - p), dur: (f - p) / 125 };
  wn.beats.push(b);
  if (wn.beats.length > AVG_BEATS) wn.beats.shift();
  return b;
}

/** Sys/dia/mean at time t: beat averages, or the flat-line max/min/mean over 2 s when non-pulsatile. */
export function pressureNumerics(wn: WaveNumerics, t: number): { sys: Measured; dia: Measured; mean: Measured } {
  const last = wn.beats[wn.beats.length - 1];
  if (last && t - last.t <= STALE_S) {
    const avg = (k: 'sys' | 'dia' | 'mean') => wn.beats.reduce((a, b) => a + b[k], 0) / wn.beats.length;
    return {
      sys: { value: avg('sys'), flag: 'valid', at: t },
      dia: { value: avg('dia'), flag: 'valid', at: t },
      mean: { value: avg('mean'), flag: 'valid', at: t },
    };
  }
  let mx = -Infinity;
  let mn = Infinity;
  let sum = 0;
  const n = Math.min(250, wn.n);
  for (let k = wn.n - n; k < wn.n; k++) {
    const v = wn.ring[k % RING] as number;
    mx = Math.max(mx, v);
    mn = Math.min(mn, v);
    sum += v;
  }
  if (n === 0) return { sys: { value: null, flag: 'invalid', at: t }, dia: { value: null, flag: 'invalid', at: t }, mean: { value: null, flag: 'invalid', at: t } };
  return {
    sys: { value: mx, flag: 'questionable', at: t },
    dia: { value: mn, flag: 'questionable', at: t },
    mean: { value: sum / n, flag: 'questionable', at: t },
  };
}

/** PI: mean peak-to-trough of the last beats of a pleth WaveNumerics. */
export function piNumeric(wn: WaveNumerics, t: number): Measured {
  const last = wn.beats[wn.beats.length - 1];
  if (!last || t - last.t > STALE_S) return { value: null, flag: 'invalid', at: t };
  return { value: wn.beats.reduce((a, b) => a + (b.sys - b.dia), 0) / wn.beats.length, flag: 'valid', at: t };
}

/** Pulse rate from a WaveNumerics' feet (brief §6.1 PR: its own average, response ≤ 20 s). */
export function prNumeric(wn: WaveNumerics, t: number): Measured {
  const lastFoot = wn.feet[wn.feet.length - 1];
  const pr = pulseRate(wn.feet);
  if (pr === null || lastFoot === undefined || t - lastFoot > STALE_S) return { value: null, flag: 'invalid', at: t };
  return { value: Math.round(pr), flag: 'valid', at: t };
}
```

- [x] **Step 4: Run it to see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l3/pressure-numerics`
Expected: PASS (1 test).

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l3/pressure-numerics packages/engine-core/test/l3/pressure-numerics
git commit -m "feat(l3): per-beat pressure numerics with MAP by integral, PI and PR" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Oscillometric NIBP cuff

**Files:**
- Create: `packages/engine-core/src/l3/nibp/nibp.ts`, `packages/engine-core/test/l3/nibp/nibp.test.ts`

**Interfaces:**
- Consumes: `rng/sfc32.ts` (`normal`, `Sfc32State`), `NibpPhase`, `NibpSite` (Task 1).
- Produces: `NIBP` (constants), `AUTO_INTERVALS_MIN`, `interface NibpResult { sys; dia; map; pr; at }`, `interface NibpState` (fields as in the code), `createNibpState(sensor = 'on', site = 'rightArm')`, `type NibpOut = { kind:'phase'; phase; cuff; nextInS?; result? } | { kind:'cuff'; cuff; phase } | { kind:'failed'; text }`, `nibpMeasuring(nb)`, `nibpCommand(nb, action, t, intervalMin, out): string|undefined`, `nibpOnPulse(nb, t, beat: {sbp,dbp,map}, artefact, rng)`, `invertEnvelope(steps: number[][]): {sys,dia,map} | null | 'repump'`, `nibpStep(nb, t, dt, rng, out)`, `nibpNextIn(nb, t): number|undefined`.

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l3/nibp/nibp.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createNibpState, invertEnvelope, NIBP, nibpCommand, nibpOnPulse, nibpStep, type NibpOut } from '../../../src/l3/nibp/nibp.ts';
import { seedStream } from '../../../src/rng/sfc32.ts';

/** Drive the cuff with a regular pulse train of fixed site pressures until done/failed (or tMax). */
function run(beat: { sbp: number; dbp: number; map: number }, hr = 75, tMax = 200) {
  const nb = createNibpState();
  const rng = seedStream(1, 'measurement');
  const out: NibpOut[] = [];
  nibpCommand(nb, 'start', 0, undefined, out);
  let nextPulse = 0.3;
  for (let t = 0; t < tMax; t += 0.008) {
    if (t >= nextPulse) {
      nibpOnPulse(nb, t, beat, false, rng);
      nextPulse += 60 / hr;
    }
    nibpStep(nb, t, 0.008, rng, out);
    if (out.some((o) => o.kind === 'phase' && (o.phase === 'done' || o.phase === 'failed'))) return { nb, out, t };
  }
  return { nb, out, t: tMax };
}

describe('l3/nibp (brief §4.5, §6.3)', () => {
  it('inverts an exact Gaussian envelope at Rs/Rd', () => {
    const [S, D, M] = [120, 80, 95];
    const steps: number[][] = [];
    for (let pc = 165; pc >= 60; pc -= 8) {
      const w = pc > M ? (S - M) / Math.sqrt(-Math.log(NIBP.RS)) : (M - D) / Math.sqrt(-Math.log(NIBP.RD));
      steps.push([pc, 2 * Math.exp(-(((pc - M) / w) ** 2))]);
    }
    const r = invertEnvelope(steps) as { sys: number; dia: number; map: number };
    expect(r.sys).toBeCloseTo(S, 0);
    expect(r.dia).toBeCloseTo(D, 0);
    expect(r.map).toBeCloseTo(M, 0);
  });

  it('a cycle inflates to 165, steps down, and reports near the truth in ≈ 25–35 s', () => {
    const { out, t } = run({ sbp: 120, dbp: 80, map: 95 });
    const done = out.find((o) => o.kind === 'phase' && o.phase === 'done') as Extract<NibpOut, { kind: 'phase' }>;
    expect(done.result!.sys).toBeGreaterThan(108);
    expect(done.result!.sys).toBeLessThan(132);
    expect(done.result!.dia).toBeGreaterThan(70);
    expect(done.result!.dia).toBeLessThan(90);
    expect(t).toBeGreaterThan(22);
    expect(t).toBeLessThan(38);
  });

  it('SBP 45 (tiny oscillations) fails after 2 attempts with the INOP', () => {
    const { out } = run({ sbp: 45, dbp: 30, map: 36 });
    expect(out.filter((o) => o.kind === 'phase' && o.phase === 'inflating')).toHaveLength(2);
    expect(out.some((o) => o.kind === 'failed' && o.text === 'NBP measurement failed')).toBe(true);
  });

  it('manual start cancels auto; stat repeats; cuff off rejects start', () => {
    const nb = createNibpState();
    const out: NibpOut[] = [];
    nibpCommand(nb, 'auto', 0, 5, out);
    expect(nb.mode).toBe('auto');
    nibpCommand(nb, 'stop', 1, undefined, out);
    expect(nb.nextStartT).toBeCloseTo(301, 9);
    nibpCommand(nb, 'start', 2, undefined, out);
    expect(nb.mode).toBe('manual');
    nibpCommand(nb, 'stat', 3, undefined, out);
    expect(nb.mode).toBe('stat');
    nb.sensor = 'off';
    expect(nibpCommand(createNibpState('off'), 'start', 0, undefined, out)).toBe('cuff not connected');
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l3/nibp`
Expected: FAIL — cannot load `../../../src/l3/nibp/nibp.ts`.

- [x] **Step 3: Implement**

`packages/engine-core/src/l3/nibp/nibp.ts`:

```ts
// Oscillometric NIBP (brief §4.5, §6.3; research 03 §5): a measurement over sim time, never a readout.
//   inflate to 165 mmHg (adult; later cycles previous SBP + 10, GE rule) at 20 mmHg/s → step-deflate by
//   8 mmHg, holding each step for two matched pulses (up to 4 in AF) → oscillation amplitude per pulse sampled
//   from the ACTUAL site beats:  A(Pc) = Amax·exp(−((Pc − MAP)/w)²), Amax = 0.05·PP (1–4 mmHg),
//   w_hi = (SBP − MAP)/√(−ln Rs), w_lo = (MAP − DBP)/√(−ln Rd), Rs 0.50, Rd 0.80 → invert the envelope at
//   Rs/Rd, MAP = envelope peak, + noise SD 4 mmHg → result + timestamp, or fail.
// Failures: Amax < 1 mmHg or SBP < 50 (no reliable envelope, e.g. SBP 45 / no pulse) fail the attempt; the
// second failed attempt raises the "NBP measurement failed" INOP. CPR corrupts every pulse → the cycle runs to
// the 170 s safety deflation and fails. Envelope not bracketed above SBP → one re-pump to +40 mmHg.
import { normal, type Sfc32State } from '../../rng/sfc32.ts';
import type { NibpPhase, NibpSite } from '../../types-hemo.ts';

export const NIBP = {
  INITIAL_TARGET: 165, // adult (Philips 165 ± 15) — paediatric 130, neonatal 100 are Stage 4 skin data
  NEXT_TARGET_ABOVE_SBP: 10, // GE rule (brief §4.5)
  REPUMP_ABOVE: 40, // [ENG]
  INFLATE_RATE: 20, // mmHg/s → under 10 s [ENG rate]
  DUMP_RATE: 50, // mmHg/s final deflation [ENG]
  STEP: 8, // mmHg [ENG]
  STEP_SETTLE_S: 0.2, // pulses in the first 200 ms of a step are ignored [ENG]
  STEP_MIN_WAIT_S: 1.0, // a step with no usable pulses ends after max(1.0 s, 1.5 × RR) [ENG]
  STEP_WAIT_RR: 1.5,
  STEP_MAX_S: 6, // hard cap on one step [ENG]
  MAX_PULSES: 5, // AF/ectopy: up to 5 pulses per step [ENG]
  MATCH: 0.15, // two pulses within 15% are "matched" [ENG]
  MIN_CUFF: 30, // stop deflating below this [ENG]
  RS: 0.5, // Rs 0.45–0.57 → 0.50 (brief §4.5)
  RD: 0.8, // Rd 0.75–0.86 → 0.80
  OSC_PER_PP: 0.05, // Amax = 0.05·PP (1–4 mmHg at PP 20–80) [ENG]
  AMP_NOISE: 0.05, // per-pulse amplitude noise (fraction) [ENG]
  A_DETECT: 0.2, // pulses smaller than this are not seen, mmHg [ENG]
  A_MIN_ENVELOPE: 1.0, // a smaller envelope peak is not a measurement [ENG]
  MIN_SBP: 50, // "SBP below about 50–60 fails" (brief §4.5)
  RESULT_SD: 4, // noise SD on SBP/DBP, mmHg (brief §4.5); MAP gets half
  SAFETY_S: 170, // adult safety auto-deflate (brief §4.5); neonatal 85 s in Stage 4
  STAT_S: 300, // STAT = back-to-back for 5 min
  CUFF_EMIT_S: 0.2, // live cuff pressure at 5 Hz (brief §3.4)
} as const;

export const AUTO_INTERVALS_MIN = [1, 2, 2.5, 3, 5, 10, 15, 20, 30, 45, 60, 120] as const;
const NEVER = 1e12;

export interface NibpResult {
  sys: number;
  dia: number;
  map: number;
  pr: number;
  at: number;
}

export interface NibpState {
  sensor: 'on' | 'off';
  site: NibpSite;
  mode: 'manual' | 'auto' | 'stat';
  intervalMin: number;
  prevMode: 'manual' | 'auto';
  statUntil: number;
  nextStartT: number;
  phase: NibpPhase;
  cuff: number;
  target: number;
  attempt: number;
  repumped: boolean;
  startT: number;
  stepPc: number;
  stepStartT: number;
  stepAmps: number[];
  stepRejects: number; // artefact pulses rejected in this step
  steps: number[][]; // [Pc, A]
  pulseTimes: number[];
  lastSbp: number | null;
  last: NibpResult | null;
  lastEmitT: number;
}

export function createNibpState(sensor: 'on' | 'off' = 'on', site: NibpSite = 'rightArm'): NibpState {
  return {
    sensor, site, mode: 'manual', intervalMin: 15, prevMode: 'manual', statUntil: -1, nextStartT: NEVER,
    phase: 'idle', cuff: 0, target: NIBP.INITIAL_TARGET, attempt: 1, repumped: false, startT: -1,
    stepPc: 0, stepStartT: 0, stepAmps: [], stepRejects: 0, steps: [], pulseTimes: [], lastSbp: null, last: null, lastEmitT: -1,
  };
}

export type NibpOut =
  | { kind: 'phase'; phase: NibpPhase; cuff: number; nextInS?: number; result?: NibpResult }
  | { kind: 'cuff'; cuff: number; phase: NibpPhase }
  | { kind: 'failed'; text: string };

export function nibpMeasuring(nb: NibpState): boolean {
  return nb.phase === 'inflating' || nb.phase === 'deflating';
}

function begin(nb: NibpState, t: number, out: NibpOut[]): void {
  nb.phase = 'inflating';
  nb.startT = t;
  nb.attempt = 1;
  nb.repumped = false;
  nb.target = nb.lastSbp === null ? NIBP.INITIAL_TARGET : Math.max(100, nb.lastSbp + NIBP.NEXT_TARGET_ABOVE_SBP);
  nb.steps = [];
  nb.pulseTimes = [];
  nb.lastEmitT = t;
  out.push({ kind: 'phase', phase: 'inflating', cuff: nb.cuff });
}

/** device nibp commands (brief §4.5 "Modes"; §6.3). Returns a rejection reason or undefined. */
export function nibpCommand(nb: NibpState, action: 'start' | 'stat' | 'stop' | 'auto', t: number, intervalMin: number | undefined, out: NibpOut[]): string | undefined {
  if (action !== 'stop' && nb.sensor !== 'on') return 'cuff not connected';
  switch (action) {
    case 'start':
      nb.mode = 'manual'; // a manual start turns auto-cycling off (CAE, brief §4.5)
      nb.nextStartT = NEVER;
      if (!nibpMeasuring(nb)) begin(nb, t, out);
      return undefined;
    case 'auto':
      nb.mode = 'auto';
      nb.intervalMin = intervalMin ?? nb.intervalMin;
      if (!nibpMeasuring(nb)) begin(nb, t, out);
      return undefined;
    case 'stat':
      nb.prevMode = nb.mode === 'stat' ? nb.prevMode : nb.mode;
      nb.mode = 'stat';
      nb.statUntil = t + NIBP.STAT_S;
      if (!nibpMeasuring(nb)) begin(nb, t, out);
      return undefined;
    case 'stop':
      if (nb.mode === 'stat') nb.mode = nb.prevMode;
      if (nibpMeasuring(nb)) {
        nb.phase = 'done'; // dump the cuff, no result
        out.push({ kind: 'phase', phase: 'idle', cuff: nb.cuff });
      }
      nb.nextStartT = nb.mode === 'auto' ? t + nb.intervalMin * 60 : NEVER;
      return undefined;
  }
}

/** One arterial pulse at the cuff: the site beat's true SBP/DBP/MAP. `artefact` = CPR/motion corruption. */
export function nibpOnPulse(nb: NibpState, t: number, beat: { sbp: number; dbp: number; map: number }, artefact: boolean, rng: Sfc32State): void {
  if (nb.phase !== 'deflating') return;
  nb.pulseTimes.push(t);
  if (t < nb.stepStartT + NIBP.STEP_SETTLE_S) return;
  const pp = Math.max(0, beat.sbp - beat.dbp);
  const amax = NIBP.OSC_PER_PP * pp;
  const pc = nb.stepPc;
  const w = pc > beat.map
    ? Math.max(1, beat.sbp - beat.map) / Math.sqrt(-Math.log(NIBP.RS))
    : Math.max(1, beat.map - beat.dbp) / Math.sqrt(-Math.log(NIBP.RD));
  if (artefact) {
    nb.stepRejects++; // corrupted pulse: rejected, the step is held (brief §4.5 CPR/motion)
    return;
  }
  const a = amax * Math.exp(-(((pc - beat.map) / w) ** 2)) * (1 + NIBP.AMP_NOISE * normal(rng));
  if (a >= NIBP.A_DETECT) nb.stepAmps.push(a);
}

function matched(a: readonly number[]): boolean {
  if (a.length < 2) return false;
  const x = a[a.length - 1] as number;
  const y = a[a.length - 2] as number;
  return Math.abs(x - y) <= NIBP.MATCH * Math.max(x, y);
}

/**
 * Envelope inversion (brief §4.5) by curve fitting, as SuperSTAT-style monitors do: each side of the envelope is
 * Gaussian, so ln(A/Amax) = −((Pc − MAP)/w)². MAP and Amax come from a parabola through ln A at the peak step and
 * its neighbours; w_hi and w_lo are the RMS fits of the steps on each side; then
 *   SBP = MAP + w_hi·√(−ln Rs),   DBP = MAP − w_lo·√(−ln Rd).
 * Linear interpolation between 8 mmHg steps instead would bias DBP ≈ +4 mmHg (the envelope is concave there).
 * Returns null when the envelope is unusable and 'repump' when the top step was not above SBP.
 */
export function invertEnvelope(steps: readonly number[][]): { sys: number; dia: number; map: number } | null | 'repump' {
  if (steps.length < 3) return null;
  let iMax = 0;
  steps.forEach((st, i) => {
    if ((st[1] as number) > ((steps[iMax] as number[])[1] as number)) iMax = i;
  });
  const pk = steps[iMax] as [number, number];
  if (pk[1] < NIBP.A_MIN_ENVELOPE) return null;
  if (iMax === 0 || ((steps[0] as number[])[1] as number) > NIBP.RS * pk[1]) return 'repump';
  let map = pk[0];
  let amax = pk[1];
  const prev = steps[iMax - 1] as [number, number];
  const next = steps[iMax + 1] as [number, number] | undefined;
  if (next && prev[1] > 0 && next[1] > 0) {
    const [la, lb, lc] = [Math.log(prev[1]), Math.log(pk[1]), Math.log(next[1])];
    const den = la - 2 * lb + lc;
    if (den < 0) {
      const h = pk[0] - prev[0]; // negative: cuff pressure falls step by step
      const u = (0.5 * (la - lc)) / den; // vertex offset in steps
      map = pk[0] + u * h;
      amax = Math.exp(lb - 0.25 * (la - lc) * u);
    }
  }
  const width = (side: number): number => {
    let sum = 0;
    let n = 0;
    for (const [pc, a] of steps as [number, number][]) {
      const d = pc - map;
      if (Math.sign(d) !== side || Math.abs(d) < 2 || !(a > 0.15 * amax && a < 0.97 * amax)) continue;
      sum += (d * d) / -Math.log(a / amax);
      n++;
    }
    return n > 0 ? Math.sqrt(sum / n) : Number.NaN;
  };
  const wHi = width(1);
  const wLo = width(-1);
  if (!Number.isFinite(wHi) || !Number.isFinite(wLo)) return null;
  return { sys: map + wHi * Math.sqrt(-Math.log(NIBP.RS)), dia: map - wLo * Math.sqrt(-Math.log(NIBP.RD)), map };
}

function finishAttempt(nb: NibpState, t: number, rng: Sfc32State, out: NibpOut[]): void {
  const inv = invertEnvelope(nb.steps);
  if (inv === 'repump' && !nb.repumped) {
    nb.repumped = true;
    nb.target = ((nb.steps[0] as number[])[0] as number) + NIBP.REPUMP_ABOVE;
    nb.steps = [];
    nb.phase = 'inflating';
    out.push({ kind: 'phase', phase: 'inflating', cuff: nb.cuff });
    return;
  }
  const res = inv === 'repump' ? null : inv;
  const sys = res ? res.sys + NIBP.RESULT_SD * normal(rng) : Number.NaN;
  if (!res || !(sys >= NIBP.MIN_SBP)) {
    if (nb.attempt === 1) {
      nb.attempt = 2; // "fails after 2 attempts" (brief §4.5)
      nb.repumped = false;
      nb.steps = [];
      nb.target = NIBP.INITIAL_TARGET;
      nb.phase = 'inflating';
      out.push({ kind: 'phase', phase: 'inflating', cuff: nb.cuff });
      return;
    }
    fail(nb, t, out);
    return;
  }
  const dia = res.dia + NIBP.RESULT_SD * normal(rng);
  const map = res.map + (NIBP.RESULT_SD / 2) * normal(rng);
  const pts = nb.pulseTimes;
  const pr = pts.length >= 2 ? (60 * (pts.length - 1)) / ((pts[pts.length - 1] as number) - (pts[0] as number)) : 0;
  const r: NibpResult = { sys: Math.round(sys), dia: Math.round(dia), map: Math.round(map), pr: Math.round(pr), at: t };
  nb.last = r;
  nb.lastSbp = r.sys;
  nb.phase = 'done';
  out.push({ kind: 'phase', phase: 'done', cuff: nb.cuff, result: r });
}

function fail(nb: NibpState, _t: number, out: NibpOut[]): void {
  nb.phase = 'failed';
  out.push({ kind: 'phase', phase: 'failed', cuff: nb.cuff });
  out.push({ kind: 'failed', text: 'NBP measurement failed' });
}

/** Advance the cuff by dt seconds at time t (called once per 125 Hz sample). */
export function nibpStep(nb: NibpState, t: number, dt: number, rng: Sfc32State, out: NibpOut[]): void {
  if (nb.phase === 'idle' || nb.phase === 'done' || nb.phase === 'failed') {
    if (nb.cuff > 0) {
      nb.cuff = Math.max(0, nb.cuff - NIBP.DUMP_RATE * dt);
      if (nb.cuff === 0 && nb.phase !== 'idle') {
        nb.phase = 'idle';
        schedule(nb, t);
        const e: NibpOut = { kind: 'phase', phase: 'idle', cuff: 0 };
        if (nb.nextStartT < NEVER) e.nextInS = nb.nextStartT - t;
        out.push(e);
      }
    } else if (nb.phase !== 'idle') {
      nb.phase = 'idle';
      schedule(nb, t);
    }
    if (nb.phase === 'idle' && nb.sensor === 'on' && t >= nb.nextStartT) begin(nb, t, out);
    return;
  }
  if (t - nb.startT >= NIBP.SAFETY_S) {
    fail(nb, t, out); // safety auto-deflate (brief §4.5)
    return;
  }
  if (nb.phase === 'inflating') {
    nb.cuff = Math.min(nb.target, nb.cuff + NIBP.INFLATE_RATE * dt);
    if (nb.cuff >= nb.target) {
      nb.phase = 'deflating';
      nb.stepPc = nb.target;
      nb.stepStartT = t;
      nb.stepAmps = [];
      nb.stepRejects = 0;
      out.push({ kind: 'phase', phase: 'deflating', cuff: nb.cuff });
    }
  } else {
    nb.cuff = nb.stepPc;
    const a = nb.stepAmps;
    const pt = nb.pulseTimes;
    const rr = pt.length >= 2 ? (pt[pt.length - 1] as number) - (pt[pt.length - 2] as number) : 0.8;
    // no usable pulse for max(1.0 s, 1.5 RR) → an empty step; otherwise wait for a matched pair (≤ 4 pulses)
    const waited = t - nb.stepStartT;
    const timedOut = a.length === 0 ? waited >= Math.max(NIBP.STEP_MIN_WAIT_S, NIBP.STEP_WAIT_RR * rr) : waited >= NIBP.STEP_MAX_S;
    if (matched(a) || a.length >= NIBP.MAX_PULSES || timedOut) {
      if (timedOut && a.length === 0 && nb.stepRejects > 0) {
        nb.stepStartT = t; // every pulse was artefact: hold this step until the safety timeout
        nb.stepRejects = 0;
        return;
      }
      // the last pair (matched or not — with irregular pulses the device settles for what it has) [ENG]
      const amp = a.length >= 2 ? ((a[a.length - 1] as number) + (a[a.length - 2] as number)) / 2 : a.length ? (a[0] as number) : 0;
      nb.steps.push([nb.stepPc, amp]);
      // done when the last TWO steps are below Rd·peak on the low side (one noisy dip is not the end)
      const peak = nb.steps.reduce((m, st) => Math.max(m, st[1] as number), 0);
      const iPeak = nb.steps.findIndex((st) => st[1] === peak);
      const n = nb.steps.length;
      const low = (i: number) => i > iPeak && ((nb.steps[i] as number[])[1] as number) < NIBP.RD * peak;
      const pastPeak = peak >= NIBP.A_MIN_ENVELOPE && low(n - 1) && low(n - 2);
      if (pastPeak || nb.stepPc - NIBP.STEP < NIBP.MIN_CUFF) {
        finishAttempt(nb, t, rng, out);
        return;
      }
      nb.stepPc -= NIBP.STEP;
      nb.stepStartT = t;
      nb.stepAmps = [];
      nb.stepRejects = 0;
    }
  }
  if (t - nb.lastEmitT >= NIBP.CUFF_EMIT_S - 1e-9) {
    nb.lastEmitT = t;
    out.push({ kind: 'cuff', cuff: nb.cuff, phase: nb.phase });
  }
}

function schedule(nb: NibpState, t: number): void {
  if (nb.mode === 'stat') {
    if (t < nb.statUntil) {
      nb.nextStartT = t;
      return;
    }
    nb.mode = nb.prevMode;
  }
  nb.nextStartT = nb.mode === 'auto' ? nb.startT + nb.intervalMin * 60 : NEVER;
}

/** Seconds to the next automatic start, or undefined. */
export function nibpNextIn(nb: NibpState, t: number): number | undefined {
  return nb.nextStartT < NEVER ? Math.max(0, nb.nextStartT - t) : undefined;
}
```

- [x] **Step 4: Run it to see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l3/nibp`
Expected: PASS (4 tests).

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l3/nibp packages/engine-core/test/l3/nibp
git commit -m "feat(nibp): oscillometric cycle — inflate, step-deflate with matched pulses, curve-fit inversion, retries, modes" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: The haemodynamic pipeline (per-beat core, 125 Hz loop, L3, events, command hooks)

**Files:**
- Create: `packages/engine-core/src/l2/hemo/pipeline.ts`, `packages/engine-core/test/l2/hemo/pipeline.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–11; `l1/ramp.ts`; `types.ts`.
- Produces: `HEMO_CHANNELS = ['abp','cvp','pap','pleth']`, `type HemoChannel`, `interface RhythmView { id: string; records: readonly EngineEvent[] }` (structural view of the rhythm engine's state, so `l2/ecg` is never imported), `interface HemoCtx { l1; hr: RampState; rhythm: RhythmView; rng; phi }`, `interface SiteBeatStat`, `interface HemoState` (fields as in the code; `out: EngineEvent[]` holds events waiting for their time), `createHemoState(profile, l1, hr0)`, `hemoChannelActive(hs, ch)`, `advanceHemo(hs, ctx, mEnd, write: (ch, m, v) => void)`, `validateHemoCommand(cmd, hs): string|undefined|null` (null = not a Stage 2 command), `applyHemoCommand(hs, l1, cmd, t, setHr, rng): boolean`.

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/l2/hemo/pipeline.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { constantRamp } from '../../../src/l1/ramp.ts';
import { createL1State } from '../../../src/l1/state.ts';
import { advanceHemo, applyHemoCommand, createHemoState, validateHemoCommand, type HemoChannel, type HemoCtx } from '../../../src/l2/hemo/pipeline.ts';
import { createRngState } from '../../../src/rng/sfc32.ts';
import type { Command, EngineEvent } from '../../../src/types.ts';

/** Regular sinus beat and P records at 75 bpm (what the rhythm engine would emit), for `secs` seconds. */
function sinusRecords(secs: number): EngineEvent[] {
  const out: EngineEvent[] = [];
  for (let k = 0; 0.3 + k * 0.8 < secs + 1; k++) {
    const tR = 0.3 + k * 0.8;
    out.push({ type: 'atrial', t: tR - 0.2, kind: 'p', conducted: true });
    out.push({ type: 'beat', t: tR, seq: k, origin: 'sinus', template: 'narrow', qrsMs: 90, qtMs: 380, mech: { perfused: true, kSV: 1, svMl: 70, lvetMs: 277 } });
  }
  return out;
}

function run(secs: number, sensors: Record<string, string>) {
  const l1 = createL1State();
  const hs = createHemoState({ sensors }, l1, 75);
  const ctx: HemoCtx = { l1, hr: constantRamp(75), rhythm: { id: 'sinus', records: sinusRecords(secs) }, rng: createRngState(1), phi: 0 };
  const data: Record<HemoChannel, number[]> = { abp: [], cvp: [], pap: [], pleth: [] };
  advanceHemo(hs, ctx, secs * 125, (ch, m, v) => {
    data[ch][m] = v;
  });
  return { hs, data, l1 };
}

describe('l2/hemo/pipeline', () => {
  it('synthetic sinus 75: the displayed ABP settles on the 120/80 targets, PAP on 24/10, CVP on 6', () => {
    const { data, hs } = run(30, { abp: 'connected', cvp: 'connected', pap: 'connected' });
    const last = (ch: HemoChannel) => data[ch].slice(125 * 25, 125 * 30);
    expect(Math.max(...last('abp'))).toBeGreaterThan(115);
    expect(Math.max(...last('abp'))).toBeLessThan(127);
    expect(Math.min(...last('abp'))).toBeGreaterThan(75);
    expect(Math.min(...last('abp'))).toBeLessThan(85);
    expect(Math.max(...last('pap'))).toBeGreaterThan(20);
    expect(Math.max(...last('pap'))).toBeLessThan(29);
    const cvp = last('cvp');
    expect(cvp.reduce((a, b) => a + b, 0) / cvp.length).toBeCloseTo(6, 0);
    expect(hs.out.some((e) => e.type === 'measurement' && e.values.abpSys?.flag === 'valid')).toBe(true);
    expect(hs.out.filter((e) => e.type === 'state')).toHaveLength(30);
  });

  it("channels with sensor 'none' are not written; pleth always is", () => {
    const { data } = run(3, {});
    expect(data.abp).toHaveLength(0);
    expect(data.pleth.length).toBe(3 * 125 + 1);
  });

  it('command hooks: null for non-Stage-2 commands; sensors and line events apply', () => {
    const { hs, l1 } = run(1, {});
    const c = (b: Record<string, unknown>) => ({ id: 'x', issuedBy: 't', ...b }) as Command;
    expect(validateHemoCommand(c({ type: 'setRhythm', rhythm: 'afib' }), hs)).toBeNull();
    expect(validateHemoCommand(c({ type: 'setTarget', variable: 'hr', value: 80 }), hs)).toBeNull();
    expect(validateHemoCommand(c({ type: 'setTarget', variable: 'sbp', value: 90 }), hs)).toBeUndefined();
    const rng = createRngState(1);
    expect(applyHemoCommand(hs, l1, c({ type: 'attachSensor', sensor: 'abp', state: 'connected', site: 'rightRadial' }), 1, () => {}, rng)).toBe(true);
    expect(hs.lines.abp.sensor).toBe('connected');
    expect(hs.abpSite).toBe('rightRadial');
    applyHemoCommand(hs, l1, c({ type: 'applyEvent', event: { kind: 'line', line: 'pap', action: 'wedge', value: 1 } }), 1, () => {}, rng);
    expect(hs.wedge.on).toBe(true);
    let hr = 0;
    applyHemoCommand(hs, l1, c({ type: 'pin', variable: 'hr', value: 90 }), 1, (v) => (hr = v), rng);
    expect(hr).toBe(90);
    expect(l1.pinned).toEqual(['hr']);
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/hemo/pipeline.test.ts`
Expected: FAIL — cannot load `../../../src/l2/hemo/pipeline.ts`.

- [x] **Step 3: Implement**

`packages/engine-core/src/l2/hemo/pipeline.ts`:

```ts
// Stage 2 haemodynamic pipeline: the per-tick work the engine calls after the ECG (brief §3.3 tick order):
//   L1 targets (l1/state.ts) → per-beat core (beat records → LV/RV ejections, CVP waves, pleth pulses; M1–M3)
//   → circulation RK4 at 2 ms (circulation.ts) → lines/transducers (line.ts) → 125 Hz ring-buffer samples
//   → L3: pulse detection, pressure numerics, PI/PR, NIBP cycle → events (measurement, state, nibp, alarm).
// Reads the rhythm engine ONLY through its beat/atrial records (never edits l2/ecg). All state is plain data.
import { l1Flags, l1Value, pinVar, releaseVar, setL1Target, STATE_SCHEMA, STATE_VARS, validateTarget, type L1State } from '../../l1/state.ts';
import { rampValue, type RampState } from '../../l1/ramp.ts';
import { createNibpState, nibpCommand, nibpNextIn, nibpOnPulse, nibpStep, AUTO_INTERVALS_MIN, type NibpOut, type NibpState } from '../../l3/nibp/nibp.ts';
import { createWaveNumerics, numericsStep, piNumeric, pressureNumerics, prNumeric, type WaveNumerics } from '../../l3/pressure-numerics/numerics.ts';
import { prSource } from '../../l3/pulse/detector.ts';
import type { Sfc32State, StreamName } from '../../rng/sfc32.ts';
import type { AbpSite, HemoClinicalEvent, LineSensorState, NibpSite, PressureChannel, Spo2Site } from '../../types-hemo.ts';
import type { ChannelId, Command, EngineEvent, Measured, NumericId, PatientProfile, Ramp, StateVar } from '../../types.ts';
import { addPlethPulse, createPlethState, plethAt, plethDelayS, prunePleth, setPlethSensor, type PlethState } from '../pleth/pleth.ts';
import { paPressure, radialPressure, restState, stepCirculation, type CircInputs } from './circulation.ts';
import { createCvpState, cvpAt, cvpOnBeat, cvpOnP, cvpWavesAt, pruneCvp, type CvpState } from './cvp.ts';
import { makePulse, prunePulses, type Pulse } from './ejection.ts';
import { applyLineEvent, createLineState, displaySample, lineActive, lineInput, LINE_SENSOR_STATES, setLineSensor, stepTransducer, validateLineEvent, type LineState } from './line.ts';
import {
  ARREST_AFTER_S, BACKFLOW_FRAC, EJECTION_SKEW, FS_CARRY, RADIAL_DELAY_S, CPR_DUTY, CPR_SV_FRAC, CPR_THORACIC_MMHG, ejectionFactor, G_MAX, gainCeiling,
  gHyp, HEMO_RATE, H_S, KAPPA, lvetS, pepS, pmsf, PULSELESS_RHYTHMS, respFactor, RV_LVET_EXTRA_S, RV_PEP_LEAD_S,
  SUBSTEPS, SV_REF_ML, VENOUS_TAU_S,
} from './params.ts';
import { createTracker, isReferenceBeat, trackBeat, type TrackerState } from './tracker.ts';

export const HEMO_CHANNELS = ['abp', 'cvp', 'pap', 'pleth'] as const satisfies readonly ChannelId[];
export type HemoChannel = (typeof HEMO_CHANNELS)[number];
const DT = 1 / HEMO_RATE;
const SYS_LIMITS = { gMin: 0.1, gMax: G_MAX, rMin: 0.3, rMax: 4 };
const PA_LIMITS = { gMin: 0.1, gMax: 3, rMin: 0.02, rMax: 0.6 };
const WEDGE_TAU_S = 0.7; // crossfade within 1–2 beats (brief §4.2 PAP)
const SPO2_SITES: readonly string[] = ['leftFinger', 'rightFinger', 'ear', 'forehead', 'finger'];
const ABP_SITES: readonly string[] = ['leftRadial', 'rightRadial', 'femoral'];
const NIBP_SITES: readonly string[] = ['rightArm', 'leftArm', 'leg'];

/** What the pipeline reads from the rhythm engine (structural, so l2/ecg stays untouched). */
export interface RhythmView {
  id: string;
  records: readonly EngineEvent[];
}

export interface HemoCtx {
  l1: L1State;
  hr: RampState;
  rhythm: RhythmView;
  rng: Record<StreamName, Sfc32State>;
  phi: number; // respiratory phase shared with the ECG's RSA (hrv.phi)
}

interface Win {
  t0: number;
  ref: boolean;
  cpr: boolean;
  sv: number;
  max: number;
  min: number;
  sum: number;
  n: number;
}

export interface SiteBeatStat {
  t: number;
  sbp: number;
  dbp: number;
  map: number;
  ref: boolean; // may drive the M2 tracker
  cpr: boolean; // a chest compression, not a heartbeat
  sv: number;
  dur: number;
}

type Open = { t: number; ref: boolean; cpr: boolean; sv: number };

export interface HemoState {
  m: number; // next 125 Hz sample index to generate
  circ: number[];
  sys: TrackerState;
  pul: TrackerState;
  lv: Pulse[];
  rv: Pulse[];
  thorArt: Pulse[];
  thorCen: Pulse[];
  opens: Open[];
  opensPa: Open[];
  win: Win | null;
  winPa: Win | null;
  missed: number; // mL the previous beat failed to eject (Frank–Starling carry-over)
  prevRef: boolean; // the previous beat was a reference beat
  pv: number; // venous (CVP mean truth) = systemic P_floor
  pla: number; // pulmonary outflow pressure (PAWP truth)
  beatSeq: number;
  lastPT: number;
  lastBeatT: number;
  lastRR: number;
  lastEjT: number;
  lastSite: SiteBeatStat;
  siteBeats: SiteBeatStat[]; // last 16 completed site beats (tests, NIBP truth)
  cvp: CvpState;
  pleth: PlethState;
  lines: Record<PressureChannel, LineState>;
  abpSite: AbpSite;
  cpr: { active: boolean; rate: number; quality: number; nextT: number };
  wedge: { on: boolean; w: number };
  num: { abp: WaveNumerics; pap: WaveNumerics; pleth: WaveNumerics; cvpAvg: number };
  nibp: NibpState;
  out: EngineEvent[];
}

function lineStateOf(v: string | undefined): LineSensorState {
  return v && (LINE_SENSOR_STATES as readonly string[]).includes(v) ? (v as LineSensorState) : 'none';
}
function spo2Site(site: string | undefined): Spo2Site | undefined {
  if (site === undefined) return undefined;
  return site === 'finger' ? 'leftFinger' : (site as Spo2Site);
}

export function createHemoState(profile: PatientProfile | undefined, l1: L1State, hr0: number): HemoState {
  const sbp = l1Value(l1, 'sbp', 0);
  const dbp = l1Value(l1, 'dbp', 0);
  const cvp = l1Value(l1, 'cvp', 0);
  const pawp = l1Value(l1, 'pawp', 0);
  const pas = l1Value(l1, 'papSys', 0);
  const pad = l1Value(l1, 'papDia', 0);
  const map = dbp + 0.4 * (sbp - dbp);
  const pam = pad + 0.4 * (pas - pad);
  const flow = (SV_REF_ML * Math.max(30, hr0)) / 60;
  const sens = profile?.sensors ?? {};
  const spo2 = sens.spo2 === 'off' || sens.spo2 === 'motion' ? sens.spo2 : 'on';
  return {
    m: 0,
    circ: restState(map, pam),
    sys: createTracker(Math.min(4, Math.max(0.3, (map - cvp) / flow))),
    pul: createTracker(Math.min(0.6, Math.max(0.02, (pam - pawp) / flow))),
    lv: [], rv: [], thorArt: [], thorCen: [], opens: [], opensPa: [],
    win: null, winPa: null,
    missed: 0, prevRef: true, pv: cvp, pla: pawp,
    beatSeq: -1, lastPT: -1e12, lastBeatT: -1, lastRR: 60 / Math.max(30, hr0), lastEjT: 0,
    lastSite: { t: 0, sbp, dbp, map, ref: true, cpr: false, sv: SV_REF_ML, dur: 60 / Math.max(30, hr0) }, siteBeats: [],
    cvp: createCvpState(),
    pleth: createPlethState(spo2),
    lines: { abp: createLineState(lineStateOf(sens.abp)), cvp: createLineState(lineStateOf(sens.cvp)), pap: createLineState(lineStateOf(sens.pap)) },
    abpSite: 'leftRadial',
    cpr: { active: false, rate: 110, quality: 1, nextT: 0 },
    wedge: { on: false, w: 0 },
    num: { abp: createWaveNumerics(3), pap: createWaveNumerics(1.5), pleth: createWaveNumerics(0.03), cvpAvg: cvp },
    nibp: createNibpState(sens.nibp === 'off' ? 'off' : 'on'),
    out: [],
  };
}

/** Channels that currently have a trace (brief §6.2: 'none' = no trace; pleth is flat when the probe is off). */
export function hemoChannelActive(hs: HemoState, ch: HemoChannel): boolean {
  return ch === 'pleth' ? true : lineActive(hs.lines[ch]);
}

function isArrested(hs: HemoState, t: number): boolean {
  return t - hs.lastEjT > Math.max(ARREST_AFTER_S, 2.2 * hs.lastRR);
}

function sameLimb(a: AbpSite | Spo2Site, cuff: NibpSite): boolean {
  return ((a === 'leftRadial' || a === 'leftFinger') && cuff === 'leftArm') || ((a === 'rightRadial' || a === 'rightFinger') && cuff === 'rightArm');
}

/** Fraction of the pulse that passes a cuff at pressure `cuff` (1 = no occlusion) [ENG]. */
function passFraction(hs: HemoState, cuff: number): number {
  const s = hs.lastSite;
  return Math.min(1, Math.max(0, (s.sbp - cuff) / Math.max(1, s.sbp - s.dbp)));
}

// --- per-beat core ------------------------------------------------------------------------------------
function onBeat(hs: HemoState, ctx: HemoCtx, b: Extract<EngineEvent, { type: 'beat' }>): void {
  const t = b.t;
  const rr = hs.lastBeatT >= 0 ? Math.max(0.15, t - hs.lastBeatT) : hs.lastRR;
  hs.lastBeatT = t;
  hs.lastRR = rr;
  cvpOnBeat(hs.cvp, t, b.qrsMs, b.qtMs, rr);
  // M1: rhythm → pulse. PEA/VF/asystole have no mechanical output; E(k) maps k_rhythm to ejection.
  const k = PULSELESS_RHYTHMS.has(ctx.rhythm.id) || !b.mech.perfused ? 0 : b.mech.kSV;
  const e = ejectionFactor(k);
  const resp = respFactor(t, rr, ctx.phi, gHyp(l1Value(ctx.l1, 'volumeStatus', t))); // M6 (PPV)
  const nominal = SV_REF_ML * hs.sys.g * resp; // what a normal beat would eject now
  if (e <= 0) {
    hs.missed = nominal; // no upstroke: pulse deficit (brief §4.8); the volume stays for the next beat
    hs.prevRef = false;
    return;
  }
  const carry = e * FS_CARRY * hs.missed; // the residual raises EDV; the beat ejects its usual fraction of it
  const sv = nominal * e + carry;
  const steady = isReferenceBeat(e, carry, nominal, b.origin === 'ventricular');
  const ref = hs.prevRef && steady; // two steady beats in a row
  hs.prevRef = steady;
  hs.missed = Math.max(0, nominal - sv);
  const hr = 60 / rr;
  const pep = pepS(hr); // M3: PEP and LVET follow HR
  const lvet = Math.max(lvetS(hr), b.mech.lvetMs / 1000);
  const kappa = KAPPA * Math.min(1.5, Math.max(0.5, l1Value(ctx.l1, 'contractility', t)));
  const t0 = t + pep + RADIAL_DELAY_S; // radial time: aortic valve opening + transport delay
  hs.lv.push(makePulse(t0, lvet, sv, kappa, BACKFLOW_FRAC, EJECTION_SKEW));
  hs.opens.push({ t: t0, ref, cpr: false, sv });
  hs.lastEjT = t0;
  const t0p = t + pep - RV_PEP_LEAD_S;
  const svp = (sv * hs.pul.g) / hs.sys.g; // RV SV follows the LV beat (same E, resp, carry-over)
  hs.rv.push(makePulse(t0p, lvet + RV_LVET_EXTRA_S, svp, 1, BACKFLOW_FRAC, EJECTION_SKEW));
  hs.opensPa.push({ t: t0p, ref, cpr: false, sv: svp });
  addPlethPulse(hs.pleth, t + pep + plethDelayS(hs.pleth.site), (l1Value(ctx.l1, 'pi', t) * sv) / (SV_REF_ML * hs.sys.g), lvet, hs.sys.R);
}

function intake(hs: HemoState, ctx: HemoCtx): void {
  for (const r of ctx.rhythm.records) {
    if (r.type === 'atrial') {
      if (r.kind === 'p' && r.t > hs.lastPT) {
        hs.lastPT = r.t;
        cvpOnP(hs.cvp, r.t);
      }
    } else if (r.type === 'beat' && r.seq > hs.beatSeq) {
      hs.beatSeq = r.seq;
      onBeat(hs, ctx, r);
    }
  }
}

/** CPR pump (brief §4.2 "Compressions"): flow into the arterial AND venous compartments + thoracic pressure. */
function planCompressions(hs: HemoState, ctx: HemoCtx, until: number): void {
  const c = hs.cpr;
  while (c.active && c.nextT <= until) {
    const tc = c.nextT;
    const dur = (CPR_DUTY * 60) / c.rate;
    const sv = SV_REF_ML * CPR_SV_FRAC * c.quality;
    hs.lv.push({ ...makePulse(tc + RADIAL_DELAY_S, dur, sv, 1, 0), cpr: true });
    hs.rv.push({ ...makePulse(tc, dur, sv, 1, 0), cpr: true });
    hs.thorArt.push({ t0: tc + RADIAL_DELAY_S, dur, qpk: CPR_THORACIC_MMHG * c.quality, kappa: 1, skew: 1, back: 0, cpr: true });
    hs.thorCen.push({ t0: tc, dur, qpk: CPR_THORACIC_MMHG * c.quality, kappa: 1, skew: 1, back: 0, cpr: true });
    hs.opens.push({ t: tc + RADIAL_DELAY_S, ref: false, cpr: true, sv });
    addPlethPulse(hs.pleth, tc + plethDelayS(hs.pleth.site), l1Value(ctx.l1, 'pi', tc) * CPR_SV_FRAC * c.quality, dur, hs.sys.R);
    c.nextT += 60 / c.rate;
  }
}

// --- site beats (true radial) → M2 tracker and NIBP --------------------------------------------------
function closeWin(hs: HemoState, ctx: HemoCtx, t: number): void {
  const w = hs.win;
  if (!w || w.n < 10) return;
  const beat: SiteBeatStat = { t: w.t0, sbp: w.max, dbp: w.min, map: w.sum / w.n, ref: w.ref, cpr: w.cpr, sv: w.sv, dur: t - w.t0 };
  hs.lastSite = beat;
  hs.siteBeats.push(beat);
  if (hs.siteBeats.length > 16) hs.siteBeats.shift();
  const target = { sbp: l1Value(ctx.l1, 'sbp', w.t0), dbp: l1Value(ctx.l1, 'dbp', w.t0) };
  trackBeat(hs.sys, beat, target, hs.pv, SYS_LIMITS, gainCeiling(hs.lastRR));
  nibpOnPulse(hs.nibp, t, beat, hs.cpr.active || beat.cpr, ctx.rng.measurement);
}

function closeWinPa(hs: HemoState, ctx: HemoCtx, t: number): void {
  const w = hs.winPa;
  if (!w || w.n < 10) return;
  const beat = { t: w.t0, sbp: w.max, dbp: w.min, map: w.sum / w.n, ref: w.ref, sv: w.sv, dur: t - w.t0 };
  trackBeat(hs.pul, beat, { sbp: l1Value(ctx.l1, 'papSys', w.t0), dbp: l1Value(ctx.l1, 'papDia', w.t0) }, hs.pla, PA_LIMITS, gainCeiling(hs.lastRR));
}

const newWin = (o: Open): Win => ({ t0: o.t, ref: o.ref, cpr: o.cpr, sv: o.sv, max: -Infinity, min: Infinity, sum: 0, n: 0 });

function accumulate(w: Win | null, p: number): void {
  if (!w) return;
  if (p > w.max) w.max = p;
  if (p < w.min) w.min = p;
  w.sum += p;
  w.n++;
}

// --- events -------------------------------------------------------------------------------------------
function nibpEvents(hs: HemoState, outs: NibpOut[], t: number): void {
  for (const o of outs) {
    if (o.kind === 'failed') {
      hs.out.push({ type: 'alarm', t, id: 'nibp-failed', priority: 'low', category: 'technical', state: 'raised', text: o.text });
    } else if (o.kind === 'cuff') {
      hs.out.push({ type: 'nibp', t, phase: o.phase, cuffMmHg: Math.round(o.cuff) });
    } else {
      const e: EngineEvent = { type: 'nibp', t, phase: o.phase, cuffMmHg: Math.round(o.cuff) };
      if (o.nextInS !== undefined) e.nextInS = o.nextInS;
      if (o.result) {
        e.result = { sys: o.result.sys, dia: o.result.dia, map: o.result.map, pr: o.result.pr };
        hs.out.push(e);
        hs.out.push({
          type: 'measurement', t,
          values: {
            nibpSys: { value: o.result.sys, flag: 'valid', at: t },
            nibpDia: { value: o.result.dia, flag: 'valid', at: t },
            nibpMean: { value: o.result.map, flag: 'valid', at: t },
          },
        });
        continue;
      }
      hs.out.push(e);
    }
  }
}

function overrides(hs: HemoState, t: number): StateVar[] {
  const out: StateVar[] = [];
  const arrested = isArrested(hs, t);
  if (arrested || hs.sys.saturated || (hs.lastBeatT >= 0 && t - hs.sys.lastRefT > 5)) out.push('sbp', 'dbp');
  if (arrested) out.push('cvp', 'pi');
  if (arrested || hs.pul.saturated) out.push('papSys', 'papDia');
  return out;
}

function emitSecond(hs: HemoState, ctx: HemoCtx, t: number): void {
  const v: Partial<Record<NumericId, Measured>> = {};
  if (lineActive(hs.lines.abp)) {
    const p = pressureNumerics(hs.num.abp, t);
    v.abpSys = p.sys;
    v.abpDia = p.dia;
    v.abpMean = p.mean;
  }
  if (lineActive(hs.lines.pap)) {
    const p = pressureNumerics(hs.num.pap, t);
    v.papSys = p.sys;
    v.papDia = p.dia;
    v.papMean = p.mean;
  }
  if (lineActive(hs.lines.cvp)) v.cvpMean = { value: hs.num.cvpAvg, flag: 'valid', at: t };
  const src = prSource(hs.pleth.state, lineActive(hs.lines.abp));
  v.pr = src === 'pleth' ? prNumeric(hs.num.pleth, t) : src === 'abp' ? prNumeric(hs.num.abp, t) : { value: null, flag: 'invalid', at: t };
  v.pi = hs.pleth.state === 'on' ? piNumeric(hs.num.pleth, t) : { value: null, flag: 'invalid', at: t };
  hs.out.push({ type: 'measurement', t, values: v });

  const values: Partial<Record<StateVar, number>> = {};
  for (const s of STATE_VARS) values[s] = s === 'hr' ? rampValue(ctx.hr, t) : l1Value(ctx.l1, s, t);
  values.svr = hs.sys.R;
  hs.out.push({ type: 'state', t, tick: Math.round(t * 50), mode: 'manual', values, control: l1Flags(ctx.l1, t, ctx.hr, overrides(hs, t)) });
  if (hs.nibp.phase === 'idle') {
    const next = nibpNextIn(hs.nibp, t);
    if (next !== undefined) hs.out.push({ type: 'nibp', t, phase: 'idle', nextInS: Math.round(next) });
  }
}

// --- the tick -----------------------------------------------------------------------------------------
/**
 * Generate 125 Hz samples up to and including absolute index `mEnd` (= floor(ECG end index / 4)), so sample m
 * belongs to time m/125 exactly like the ECG's absolute indexing (brief §3.3). `write(ch, m, v)` stores a
 * displayed sample in the engine's ring buffer.
 */
export function advanceHemo(hs: HemoState, ctx: HemoCtx, mEnd: number, write: (ch: HemoChannel, m: number, v: number) => void): void {
  if (mEnd < hs.m) return;
  intake(hs, ctx);
  planCompressions(hs, ctx, mEnd / HEMO_RATE + 0.3);
  const s = hs.circ;
  const ab = hs.lines.abp;
  const cv = hs.lines.cvp;
  const pa = hs.lines.pap;
  const nouts: NibpOut[] = [];
  for (; hs.m <= mEnd; hs.m++) {
    const m = hs.m;
    const t1 = m / HEMO_RATE;
    const t0 = t1 - DT;
    const arrested = isArrested(hs, t1);
    const vs = l1Value(ctx.l1, 'volumeStatus', t1);
    const relax = 1 - Math.exp(-DT / VENOUS_TAU_S);
    hs.pv += ((arrested ? pmsf(vs) : l1Value(ctx.l1, 'cvp', t1)) - hs.pv) * relax;
    hs.pla += ((arrested ? pmsf(vs) : l1Value(ctx.l1, 'pawp', t1)) - hs.pla) * relax;
    hs.wedge.w += ((hs.wedge.on ? 1 : 0) - hs.wedge.w) * (1 - Math.exp(-DT / WEDGE_TAU_S));
    const cuff = hs.nibp.cuff;
    const abpPass = cuff > 0 && sameLimb(hs.abpSite, hs.nibp.site) ? passFraction(hs, cuff) : 1;
    const atCatheter = (p: number) => (abpPass >= 1 ? p : abpPass * p + (1 - abpPass) * Math.min(cuff, hs.lastSite.map));
    const wedged = (p: number, t: number) => (hs.wedge.w < 1e-3 ? p : (1 - hs.wedge.w) * p + hs.wedge.w * (hs.pla + 1.3 * cvpWavesAt(hs.cvp, t)));
    const x: CircInputs = { lv: hs.lv, rv: hs.rv, thor: hs.thorArt, pFloor: hs.pv, pawp: hs.pla, R: hs.sys.R, Rp: hs.pul.R };
    if (m > 0) {
      for (let j = 0; j < SUBSTEPS; j++) {
        const ta = t0 + j * H_S;
        const tb = ta + H_S;
        const pr0 = ab.sensor !== 'none' ? radialPressure(s, ta, x) : 0;
        const pa0 = pa.sensor !== 'none' ? paPressure(s, ta, x) : 0;
        stepCirculation(s, ta, H_S, x);
        if (ab.sensor !== 'none') stepTransducer(ab, lineInput(ab, atCatheter(pr0), ta), lineInput(ab, atCatheter(radialPressure(s, tb, x)), tb), H_S);
        if (pa.sensor !== 'none') stepTransducer(pa, lineInput(pa, wedged(pa0, ta), ta), lineInput(pa, wedged(paPressure(s, tb, x), tb), tb), H_S);
        if (cv.sensor !== 'none') {
          stepTransducer(cv, lineInput(cv, cvpAt(hs.cvp, ta, hs.pv, ctx.phi, hs.thorCen), ta), lineInput(cv, cvpAt(hs.cvp, tb, hs.pv, ctx.phi, hs.thorCen), tb), H_S);
        }
      }
    }
    // true site beats: a window per ejection (radial time), for the M2 tracker and the NIBP oscillations
    while (hs.opens.length > 0 && (hs.opens[0] as { t: number }).t <= t1) {
      const o = hs.opens.shift() as Open;
      closeWin(hs, ctx, t1);
      hs.win = newWin(o);
    }
    if (hs.win && t1 - hs.win.t0 > 3) hs.win = null; // arrest: stop measuring a flat line
    accumulate(hs.win, radialPressure(s, t1, x));
    while (hs.opensPa.length > 0 && (hs.opensPa[0] as { t: number }).t <= t1) {
      const o = hs.opensPa.shift() as Open;
      closeWinPa(hs, ctx, t1);
      hs.winPa = newWin(o);
    }
    if (hs.winPa && t1 - hs.winPa.t0 > 3) hs.winPa = null;
    accumulate(hs.winPa, paPressure(s, t1, x));
    // displayed samples + L3
    if (ab.sensor !== 'none') {
      const v = displaySample(ab);
      write('abp', m, v);
      numericsStep(hs.num.abp, m, v);
    }
    if (pa.sensor !== 'none') {
      const v = displaySample(pa);
      write('pap', m, v);
      numericsStep(hs.num.pap, m, v);
    }
    if (cv.sensor !== 'none') {
      const v = displaySample(cv);
      write('cvp', m, v);
      hs.num.cvpAvg += (v - hs.num.cvpAvg) * (1 - Math.exp(-DT / 2)); // 2 s mean [ENG]
    }
    const plethPass = cuff > 0 && sameLimb(hs.pleth.site, hs.nibp.site) ? passFraction(hs, cuff) : 1;
    const pl = plethAt(hs.pleth, t1, plethPass, l1Value(ctx.l1, 'pi', t1));
    write('pleth', m, pl);
    if (hs.pleth.state !== 'off') numericsStep(hs.num.pleth, m, pl);
    // NIBP cuff
    nouts.length = 0;
    nibpStep(hs.nibp, t1, DT, ctx.rng.measurement, nouts);
    if (nouts.length) nibpEvents(hs, nouts, t1);
    if (m > 0 && m % HEMO_RATE === 0) emitSecond(hs, ctx, t1);
  }
  const tNow = mEnd / HEMO_RATE;
  hs.lv = prunePulses(hs.lv, tNow - 0.1);
  hs.rv = prunePulses(hs.rv, tNow - 0.1);
  hs.thorArt = prunePulses(hs.thorArt, tNow - 0.1);
  hs.thorCen = prunePulses(hs.thorCen, tNow - 0.1);
  prunePleth(hs.pleth, tNow - 0.1);
  pruneCvp(hs.cvp, tNow - 0.1, isArrested(hs, tNow));
}

// --- commands -----------------------------------------------------------------------------------------
/** Validation hook. Returns a rejection reason, undefined (accepted) or null (not a Stage 2 command). */
export function validateHemoCommand(cmd: Command, hs: HemoState): string | undefined | null {
  switch (cmd.type) {
    case 'setTarget':
      return cmd.variable === 'hr' ? null : validateTarget(cmd.variable, cmd.value, cmd.ramp);
    case 'pin':
      return validateTarget(cmd.variable, cmd.value, cmd.ramp);
    case 'release':
      return cmd.variable === 'all' || cmd.variable in STATE_SCHEMA ? undefined : `unknown state variable ${String(cmd.variable)}`;
    case 'setMode':
      return cmd.mode === 'manual' ? undefined : 'MODELED mode arrives in Stage 7';
    case 'applyEvent': {
      const ev = cmd.event as { kind: string };
      if (ev.kind === 'line') return validateLineEvent(cmd.event as Extract<HemoClinicalEvent, { kind: 'line' }>);
      if (ev.kind === 'cpr') {
        const c = cmd.event as Extract<HemoClinicalEvent, { kind: 'cpr' }>;
        if (c.rate !== undefined && !(c.rate >= 60 && c.rate <= 150)) return 'cpr rate must be 60–150/min';
        if (c.quality !== undefined && !(c.quality >= 0 && c.quality <= 1.5)) return 'cpr quality must be 0–1.5';
        return undefined;
      }
      return null;
    }
    case 'attachSensor': {
      const { sensor, state, site } = cmd;
      if (sensor === 'abp' || sensor === 'cvp' || sensor === 'pap') {
        if (!(LINE_SENSOR_STATES as readonly string[]).includes(state)) return `${sensor} state must be ${LINE_SENSOR_STATES.join(', ')}`;
        if (site !== undefined && (sensor !== 'abp' || !ABP_SITES.includes(site))) return `site must be one of ${ABP_SITES.join(', ')} (abp only)`;
        return undefined;
      }
      if (sensor === 'spo2') {
        if (!['on', 'off', 'motion'].includes(state)) return 'spo2 state must be on, off or motion';
        return site === undefined || SPO2_SITES.includes(site) ? undefined : `spo2 site must be one of ${SPO2_SITES.join(', ')}`;
      }
      if (sensor === 'nibp') {
        if (!['on', 'off'].includes(state)) return 'nibp state must be on or off';
        return site === undefined || NIBP_SITES.includes(site) ? undefined : `nibp site must be one of ${NIBP_SITES.join(', ')}`;
      }
      return `${sensor} sensor is not implemented until Stage ${sensor === 'ecg' ? 4 : 3}`;
    }
    case 'device': {
      const a = cmd.action;
      if (a.device !== 'nibp') return null;
      if (!['start', 'stat', 'stop', 'auto'].includes(a.action)) return 'nibp action must be start, stat, stop or auto';
      if (a.action !== 'stop' && hs.nibp.sensor !== 'on') return 'cuff not connected';
      if (a.intervalMin !== undefined && !(AUTO_INTERVALS_MIN as readonly number[]).includes(a.intervalMin)) {
        return `intervalMin must be one of ${AUTO_INTERVALS_MIN.join(', ')}`;
      }
      return undefined;
    }
    default:
      return null;
  }
}

/** Apply hook. Returns true when the command was a Stage 2 command. `setHr` retargets the Stage 1 hr ramp. */
export function applyHemoCommand(
  hs: HemoState,
  l1: L1State,
  cmd: Command,
  t: number,
  setHr: (value: number, ramp?: Ramp) => void,
  rng: Record<StreamName, Sfc32State>,
): boolean {
  switch (cmd.type) {
    case 'setTarget':
      if (cmd.variable === 'hr') return false;
      setL1Target(l1, cmd.variable, t, cmd.value, cmd.ramp);
      return true;
    case 'pin':
      if (cmd.value !== undefined) {
        if (cmd.variable === 'hr') setHr(cmd.value, cmd.ramp);
        else setL1Target(l1, cmd.variable, t, cmd.value, cmd.ramp);
      }
      pinVar(l1, cmd.variable);
      return true;
    case 'release':
      releaseVar(l1, cmd.variable);
      return true;
    case 'setMode':
      return true;
    case 'applyEvent': {
      const ev = cmd.event as HemoClinicalEvent | { kind: string };
      if (ev.kind === 'line') {
        const le = ev as Extract<HemoClinicalEvent, { kind: 'line' }>;
        if (le.action === 'wedge') hs.wedge.on = (le.value ?? 1) !== 0;
        else applyLineEvent(hs.lines[le.line], le, t);
        return true;
      }
      if (ev.kind === 'cpr') {
        const c = ev as Extract<HemoClinicalEvent, { kind: 'cpr' }>;
        if (c.active) {
          const was = hs.cpr.active;
          hs.cpr = { active: true, rate: c.rate ?? 110, quality: c.quality ?? 1, nextT: was ? hs.cpr.nextT : t };
        } else {
          hs.cpr.active = false;
          const keep = (p: Pulse) => !(p.cpr && p.t0 > t);
          hs.lv = hs.lv.filter(keep);
          hs.rv = hs.rv.filter(keep);
          hs.thorArt = hs.thorArt.filter(keep);
          hs.thorCen = hs.thorCen.filter(keep);
          hs.opens = hs.opens.filter((o) => !(o.cpr && o.t > t));
        }
        return true;
      }
      return false;
    }
    case 'attachSensor': {
      const { sensor, state, site } = cmd;
      if (sensor === 'abp' || sensor === 'cvp' || sensor === 'pap') {
        if (sensor === 'abp' && site !== undefined) hs.abpSite = site as AbpSite;
        const pNow = sensor === 'abp' ? (hs.circ[0] as number) : sensor === 'cvp' ? hs.pv : (hs.circ[4] as number);
        setLineSensor(hs.lines[sensor], state as LineSensorState, t, pNow);
        return true;
      }
      if (sensor === 'spo2') {
        setPlethSensor(hs.pleth, state as PlethState['state'], spo2Site(site), rng.artefact);
        return true;
      }
      if (sensor === 'nibp') {
        hs.nibp.sensor = state as 'on' | 'off';
        if (site !== undefined) hs.nibp.site = site as NibpSite;
        if (state === 'off') {
          const outs: NibpOut[] = [];
          nibpCommand(hs.nibp, 'stop', t, undefined, outs);
          nibpEvents(hs, outs, t);
        }
        return true;
      }
      return false;
    }
    case 'device': {
      const a = cmd.action;
      if (a.device !== 'nibp') return false;
      const outs: NibpOut[] = [];
      nibpCommand(hs.nibp, a.action, t, a.intervalMin, outs);
      nibpEvents(hs, outs, t);
      return true;
    }
    default:
      return false;
  }
}
```

- [x] **Step 4: Run it to see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/hemo`
Expected: PASS (all `l2/hemo` files, 21 tests).

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/hemo/pipeline.ts packages/engine-core/test/l2/hemo/pipeline.test.ts
git commit -m "feat(hemo): per-tick haemodynamic pipeline — beats → ejections, circulation, lines, pleth, L3, NIBP, events" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---
### Task 13: Engine wiring (additive) and the Stage 1 tests it changes

**Files:**
- Modify: `packages/engine-core/src/engine.ts` (additive edits, each marked `// Stage 2`), `packages/engine-core/test/engine/engine-commands.test.ts` (2 lines), `packages/engine-core/test/engine/engine-pipeline.test.ts` (acceptance 11 becomes async), `packages/controller/test/session/host-session.test.ts` (2 tests whose Stage 1 premise changes)
- Create: `packages/engine-core/test/helpers/hemo.ts`, `packages/engine-core/test/engine/hemo-engine.test.ts`

**Interfaces:**
- Consumes: `pipeline.ts` (Task 12), `l1/state.ts` (Task 2), `params.ts` (`HEMO_RATE`).
- Produces: `PipelineState.l1: L1State`, `PipelineState.hemo: HemoState`; engine channels `abp`/`cvp`/`pap` (created on the first write, dropped when the sensor goes to `'none'`) and `pleth`; `stageGroup` semantics in `dispatch`. Test helpers (`test/helpers/hemo.ts`): `cmd(body)`, `rig(opts): { e; ev }`, `read(e, ch, t0, t1): Float32Array`, `type Beat`, `beatsOf(ev, t0?, t1?)`, `numeric(ev, id, t0?, t1?)`, `mean`, `sd`, `footAfter(x, t0, tR)`, `notchAfter(x, t0, tR)`, `riseAfter(x, t0, tR, rrNext)`, `rmssd(xs)`.

- [ ] **Step 1: Write the test helpers and the failing wiring test**

`packages/engine-core/test/helpers/hemo.ts`:

```ts
// Test helpers for Stage 2 (haemodynamics): engine set-up, sample reads and waveform fiducials.
import { createEngine } from '../../src/engine.ts';
import type { ChannelId, Command, EngineEvent, MonitorEngine, NumericId, PatientProfile } from '../../src/types.ts';

let seq = 0;
/** A command with a unique id (the body is any Command without id/issuedBy). */
export function cmd(body: Record<string, unknown>): Command {
  return { id: `t${++seq}`, issuedBy: 'test', ...body } as Command;
}

export interface Rig {
  e: MonitorEngine;
  ev: EngineEvent[];
}

/** Engine with the arterial line connected (plus any extra sensors) and every event recorded. */
export function rig(opts: { seed?: number; hr?: number; baseline?: PatientProfile['baseline']; sensors?: PatientProfile['sensors']; hrv?: boolean } = {}): Rig {
  const e = createEngine({
    seed: opts.seed ?? 5,
    patient: { baseline: { hr: opts.hr ?? 75, ...opts.baseline }, sensors: { abp: 'connected', ...opts.sensors } },
  });
  if (opts.hrv === false) e.dispatch(cmd({ type: 'setModifiers', modifiers: { hrvScale: 0 } }));
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  return { e, ev };
}

/** Samples of a 125 Hz channel for sim times [t0, t1). */
export function read(e: MonitorEngine, ch: ChannelId, t0: number, t1: number): Float32Array {
  const out = new Float32Array(Math.round((t1 - t0) * 125));
  e.readSamples(ch, Math.round(t0 * 125), out);
  return out;
}

export type Beat = Extract<EngineEvent, { type: 'beat' }>;
export const beatsOf = (ev: EngineEvent[], t0 = -1, t1 = Infinity): Beat[] =>
  ev.filter((x): x is Beat => x.type === 'beat' && x.t > t0 && x.t < t1);

/** Values of one numeric from the measurement events in [t0, t1]. */
export function numeric(ev: EngineEvent[], id: NumericId, t0 = -1, t1 = Infinity): number[] {
  const out: number[] = [];
  for (const x of ev) {
    if (x.type !== 'measurement' || x.t < t0 || x.t > t1) continue;
    const m = x.values[id];
    if (m && m.value !== null) out.push(m.value);
  }
  return out;
}

export const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
export const sd = (xs: readonly number[]): number => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};

/**
 * Upstroke foot after R (s): the time the signal first crosses min + 10% of (max − min) inside [tR, tR + 0.5 s),
 * searching up from the minimum before the peak (linear interpolation between samples).
 */
export function footAfter(x: Float32Array, t0: number, tR: number): number {
  const i0 = Math.round((tR - t0) * 125);
  const i1 = i0 + 62;
  let imx = i0;
  for (let i = i0; i < i1; i++) if (x[i]! > x[imx]!) imx = i;
  let imn = i0;
  for (let i = i0; i < imx; i++) if (x[i]! <= x[imn]!) imn = i;
  const lvl = x[imn]! + 0.1 * (x[imx]! - x[imn]!);
  for (let i = imn; i < imx; i++) {
    if (x[i]! < lvl && x[i + 1]! >= lvl) return t0 + (i + (lvl - x[i]!) / (x[i + 1]! - x[i]!)) / 125;
  }
  return Number.NaN;
}

/**
 * Dicrotic notch (s): among the local minima in the 320 ms after the systolic peak that follows R, the one
 * followed by the largest rise within 100 ms (the dicrotic wave), which skips the shallow dip before the
 * tidal wave.
 */
export function notchAfter(x: Float32Array, t0: number, tR: number): number {
  const i0 = Math.round((tR - t0) * 125);
  let ip = i0;
  for (let i = i0; i < i0 + 60; i++) if (x[i]! > x[ip]!) ip = i;
  let best = -1;
  let bestRise = 0;
  for (let i = ip + 2; i < ip + 40; i++) {
    if (!(x[i]! < x[i - 1]! && x[i]! <= x[i + 1]!)) continue;
    let mx = x[i]!;
    for (let k = i; k < i + 13; k++) mx = Math.max(mx, x[k]!);
    if (mx - x[i]! > bestRise) {
      bestRise = mx - x[i]!;
      best = i;
    }
  }
  return best < 0 ? Number.NaN : t0 + best / 125;
}

/** Root-mean-square of successive differences (beat-to-beat variability, insensitive to slow respiratory swings). */
export function rmssd(xs: readonly number[]): number {
  let s = 0;
  for (let i = 1; i < xs.length; i++) s += ((xs[i] as number) - (xs[i - 1] as number)) ** 2;
  return Math.sqrt(s / (xs.length - 1));
}

/** Rise of the signal over [tR + 0.12 s, tR + 0.12 + min(0.3, rrNext − 0.02)]: the upstroke a beat produced. */
export function riseAfter(x: Float32Array, t0: number, tR: number, rrNext: number): number {
  const a = Math.round((tR + 0.12 - t0) * 125);
  const b = a + Math.round(Math.min(0.3, rrNext - 0.02) * 125);
  let mx = -Infinity;
  for (let k = a; k <= b; k++) mx = Math.max(mx, x[k]!);
  return mx - x[a]!;
}
```

`packages/engine-core/test/engine/hemo-engine.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent } from '../../src/types.ts';
import { cmd, read, rig } from '../helpers/hemo.ts';

describe('engine + Stage 2 pipeline wiring', () => {
  it('pleth exists by default; abp/cvp/pap exist only once attached, at 125 Hz with the look-ahead filled', () => {
    const e = createEngine({ seed: 1 });
    expect(e.latestSampleIndex('abp')).toBe(-1);
    expect(e.latestSampleIndex('pleth')).toBe(12); // floor(0.100 s × 125)
    e.dispatch(cmd({ type: 'attachSensor', sensor: 'abp', state: 'connected' }));
    e.advanceTo(1);
    expect(e.sampleRate('abp')).toBe(125);
    expect(e.latestSampleIndex('abp')).toBe(137); // floor(1.1 × 125)
    e.dispatch(cmd({ type: 'attachSensor', sensor: 'abp', state: 'none' }));
    e.advanceTo(1.02);
    expect(e.latestSampleIndex('abp')).toBe(-1);
  });

  it('a lead change does not delete the pressure buffers', () => {
    const { e } = rig();
    e.advanceTo(2);
    e.dispatch(cmd({ type: 'device', action: { device: 'ecg', action: 'lead', value: 'V1', lane: 1 } }));
    e.advanceTo(3);
    expect(e.latestSampleIndex('abp')).toBeGreaterThan(300);
  });

  it('validates Stage 2 commands', () => {
    const e = createEngine();
    const r = (c: Record<string, unknown>) => e.dispatch(cmd(c));
    expect(r({ type: 'setTarget', variable: 'sbp', value: 90, ramp: { durationS: 30 } }).accepted).toBe(true);
    expect(r({ type: 'setTarget', variable: 'svr', value: 1.2 }).reason).toMatch(/derived/);
    expect(r({ type: 'pin', variable: 'cvp', value: 12 }).accepted).toBe(true);
    expect(r({ type: 'release', variable: 'all' }).accepted).toBe(true);
    expect(r({ type: 'setMode', mode: 'modeled' }).reason).toMatch(/Stage 7/);
    expect(r({ type: 'attachSensor', sensor: 'abp', state: 'plugged' }).accepted).toBe(false);
    expect(r({ type: 'attachSensor', sensor: 'co2', state: 'on' }).reason).toMatch(/Stage 3/);
    expect(r({ type: 'applyEvent', event: { kind: 'line', line: 'cvp', action: 'wedge' } }).accepted).toBe(false);
    expect(r({ type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 200 } }).accepted).toBe(false);
    expect(r({ type: 'device', action: { device: 'nibp', action: 'auto', intervalMin: 7 } }).accepted).toBe(false);
    r({ type: 'attachSensor', sensor: 'nibp', state: 'off' });
    e.advanceTo(0.1);
    expect(r({ type: 'device', action: { device: 'nibp', action: 'start' } }).reason).toBe('cuff not connected');
  });

  it("emits 'state' at 1 Hz with L1 values and control flags", () => {
    const { e, ev } = rig();
    e.dispatch(cmd({ type: 'setTarget', variable: 'sbp', value: 100, ramp: { durationS: 20 } }));
    e.dispatch(cmd({ type: 'pin', variable: 'cvp', value: 10 }));
    e.advanceTo(5);
    const st = ev.filter((x): x is Extract<EngineEvent, { type: 'state' }> => x.type === 'state');
    expect(st.map((s) => s.t)).toEqual([1, 2, 3, 4, 5]);
    const last = st[st.length - 1]!;
    expect(last.values.sbp).toBeCloseTo(120 - (20 * 4.98) / 20, 1);
    expect(last.values.hr).toBe(75);
    expect(last.control).toMatchObject({ sbp: 'ramping', cvp: 'pinned' });
    expect(last.tick).toBe(250);
  });

  it('commands sharing a stageGroup apply on the same tick', () => {
    const e = createEngine();
    const a = e.dispatch(cmd({ type: 'setTarget', variable: 'sbp', value: 100, atTick: 40, stageGroup: 'g1' }));
    const b = e.dispatch(cmd({ type: 'setTarget', variable: 'dbp', value: 60, stageGroup: 'g1' }));
    expect(a.tick).toBe(40);
    expect(b.tick).toBe(40);
  });

  it("attachSensor spo2 'off' gives a flat pleth and invalid PI", () => {
    const { e, ev } = rig();
    e.advanceTo(10);
    e.dispatch(cmd({ type: 'attachSensor', sensor: 'spo2', state: 'off' }));
    e.advanceTo(20);
    expect(Math.max(...read(e, 'pleth', 12, 20))).toBe(0);
    const m = ev.find((x) => x.type === 'measurement' && x.t === 20 && 'pi' in x.values) as Extract<EngineEvent, { type: 'measurement' }>;
    expect(m.values.pi?.flag).toBe('invalid');
    expect(m.values.pr?.flag).toBe('valid'); // falls back to the arterial line
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/hemo-engine.test.ts`
Expected: FAIL — `latestSampleIndex('pleth')` is −1 and every Stage 2 command is rejected ("not implemented until Stage 2" / "later stages").

- [ ] **Step 3: Wire the pipeline into `packages/engine-core/src/engine.ts`** — additive edits only (each new line is marked `// Stage 2`; the only two changed Stage 1 lines are `const tick` → `let tick` in `dispatch` and the `syncLaneBuffers` deletion condition, which must only touch ECG lanes or a lead change would delete the pressure buffers). `type Ramp` is already imported by Stage 1.1. Every "find" block occurs exactly once.

Edit `packages/engine-core/src/engine.ts`:

Edit 1 of 12 — find:

```ts
import { version } from './version.ts';
```

replace with:

```ts
import { version } from './version.ts';
import { createL1State, type L1State } from './l1/state.ts'; // Stage 2
import {
  advanceHemo,
  applyHemoCommand,
  createHemoState,
  HEMO_CHANNELS,
  hemoChannelActive,
  validateHemoCommand,
  type HemoChannel,
  type HemoState,
} from './l2/hemo/pipeline.ts'; // Stage 2
import { HEMO_RATE } from './l2/hemo/params.ts'; // Stage 2
```

Edit 2 of 12 — find:

```ts
  detections: Detection[]; // QRS detections found during this pass
}
```

replace with:

```ts
  detections: Detection[]; // QRS detections found during this pass
  l1: L1State; // Stage 2: PatientState targets and flags (brief §4.9)
  hemo: HemoState; // Stage 2: pressures, pleth, NIBP (brief §4.2–§4.5)
}
```

Edit 3 of 12 — find:

```ts
  private readonly sections = new Map<EcgFilterMode, Biquad[]>();
```

replace with:

```ts
  private readonly sections = new Map<EcgFilterMode, Biquad[]>();
  private readonly groupTicks = new Map<string, number>(); // Stage 2: stageGroup → tick (brief §4.9)
```

Edit 4 of 12 — find:

```ts
    const ctx: RhythmCtx = { hrAt: (t) => rampValue(hr, t), mods, rng, hrv };
    this.st = {
```

replace with:

```ts
    const ctx: RhythmCtx = { hrAt: (t) => rampValue(hr, t), mods, rng, hrv };
    const l1 = createL1State(opts.patient); // Stage 2
    this.st = {
```

Edit 5 of 12 — find:

```ts
      out: [],
      detections: [],
    };
```

replace with:

```ts
      out: [],
      detections: [],
      l1, // Stage 2
      hemo: createHemoState(opts.patient, l1, hr0), // Stage 2
    };
```

Edit 6 of 12 — find:

```ts
    const tick = Math.max(cmd.atTick ?? this.tick + 1, this.tick + 1);
    if (reason) return { accepted: false, tick: this.tick, reason };
```

replace with:

```ts
    let tick = Math.max(cmd.atTick ?? this.tick + 1, this.tick + 1);
    if (reason) return { accepted: false, tick: this.tick, reason };
    if (cmd.stageGroup !== undefined) {
      // Stage 2: commands sharing a stageGroup apply on the same tick (brief §4.9 "stage then commit")
      const g = this.groupTicks.get(cmd.stageGroup);
      if (g !== undefined && g > this.tick) tick = g;
      else this.groupTicks.set(cmd.stageGroup, tick);
    }
```

Edit 7 of 12 — find:

```ts
    this.syncLaneBuffers();
    for (const b of this.bufs.values()) b.clear();
```

replace with:

```ts
    this.syncLaneBuffers();
    this.syncHemoBuffers(); // Stage 2
    for (const b of this.bufs.values()) b.clear();
```

Edit 8 of 12 — find:

```ts
    ps.n = end + 1;
  }
```

replace with:

```ts
    advanceHemo(
      ps.hemo,
      { l1: ps.l1, hr: ps.hr, rhythm: ps.rhythm, rng: ps.rng, phi: ps.hrv.phi },
      Math.floor(end / 4),
      (ch, m, v) => this.hemoWrite(ch, m, v),
    ); // Stage 2
    ps.n = end + 1;
  }
```

Edit 9 of 12 — find:

```ts
    this.st.out = keep(this.st.out);
```

replace with:

```ts
    this.st.out = keep(this.st.out);
    this.st.hemo.out = keep(this.st.hemo.out); // Stage 2
```

Edit 10 of 12 — find:

```ts
    if (cmd.atTick !== undefined && !(Number.isInteger(cmd.atTick) && cmd.atTick >= 0)) return 'atTick must be a whole tick ≥ 0';
    switch (cmd.type) {
```

replace with:

```ts
    if (cmd.atTick !== undefined && !(Number.isInteger(cmd.atTick) && cmd.atTick >= 0)) return 'atTick must be a whole tick ≥ 0';
    const hemo = validateHemoCommand(cmd, this.st.hemo); // Stage 2
    if (hemo !== null) return hemo;
    switch (cmd.type) {
```

Edit 11 of 12 — find:

```ts
  private apply(cmd: Command, simT: number): void {
    const ps = this.st;
    switch (cmd.type) {
```

replace with:

```ts
  private apply(cmd: Command, simT: number): void {
    const ps = this.st;
    const setHr = (v: number, r?: Ramp) => {
      ps.hr = retarget(ps.hr, simT, v, r);
    };
    if (applyHemoCommand(ps.hemo, ps.l1, cmd, simT, setHr, ps.rng)) {
      this.syncHemoBuffers(); // Stage 2
      return;
    }
    switch (cmd.type) {
```

Edit 12 of 12 — find:

```ts
    for (const ch of [...this.bufs.keys()]) if (!ch.startsWith('vcg') && !want.has(ch)) this.bufs.delete(ch);
    for (const ch of want) if (!this.bufs.has(ch)) this.bufs.set(ch, new RingBuffer(ECG_RATE, BUFFER_SECONDS));
  }
```

replace with:

```ts
    for (const ch of [...this.bufs.keys()]) if (ECG_CHANNELS.has(ch) && !ch.startsWith('vcg') && !want.has(ch)) this.bufs.delete(ch);
    for (const ch of want) if (!this.bufs.has(ch)) this.bufs.set(ch, new RingBuffer(ECG_RATE, BUFFER_SECONDS));
  }

  /** Stage 2: write one 125 Hz sample; the buffer is created on the first write (brief §3.5 ring buffers). */
  private hemoWrite(ch: HemoChannel, m: number, v: number): void {
    let b = this.bufs.get(ch);
    if (!b) {
      b = new RingBuffer(HEMO_RATE, BUFFER_SECONDS);
      this.bufs.set(ch, b);
    }
    b.write(m, v);
  }

  /** Stage 2: a channel whose sensor is 'none' has no trace, so its buffer is dropped (brief §6.2). */
  private syncHemoBuffers(): void {
    for (const ch of HEMO_CHANNELS) if (!hemoChannelActive(this.st.hemo, ch)) this.bufs.delete(ch);
  }
```

What the edits do, in order: imports; `PipelineState.l1/hemo`; the `stageGroup` → tick map; L1 + haemodynamic state in the constructor; `stageGroup` in `dispatch`; drop 'none'-sensor buffers in `restore` (before they are cleared); run `advanceHemo` after the ECG in `advance` (125 Hz indices up to `floor(end/4)`); flush the haemodynamic events; the validate hook (after the `atTick` check); the apply hook (with `setHr` for `pin hr`); the buffer helpers.

- [ ] **Step 4: Update the two Stage 1 tests whose premise Stage 2 changes**

Edit `packages/engine-core/test/engine/engine-commands.test.ts` (the test "dispatch accepts Stage 1 commands …" asserted that `setTarget sbp` and `applyEvent cpr` are rejected; both are Stage 2 commands now):

Edit 1 of 2 — find:

```ts
    expect(e.dispatch(cmd({ type: 'setTarget', variable: 'sbp', value: 90 })).accepted).toBe(false);
```

replace with:

```ts
    expect(e.dispatch(cmd({ type: 'setTarget', variable: 'spo2', value: 90 })).accepted).toBe(false); // Stage 3
```

Edit 2 of 2 — find:

```ts
    expect(e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'cpr', active: true } })).accepted).toBe(false);
```

replace with:

```ts
    expect(e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'defib', action: 'charge' } })).accepted).toBe(false); // Stage 4
```

Edit `packages/engine-core/test/engine/engine-pipeline.test.ts` (acceptance 11 now takes ≈ 55 s and would trip Vitest's 60 s worker-RPC timeout unless it yields):

Edit 1 of 1 — find:

```ts
  it('acceptance 11: no drift — after advanceTo(86400) latestSampleIndex(ecgII) = 43,200,000 + 50', { timeout: 120_000 }, () => {
    const e = createEngine({ seed: 11 });
    e.advanceTo(86_400);
```

replace with:

```ts
  it('acceptance 11: no drift — after advanceTo(86400) latestSampleIndex(ecgII) = 43,200,000 + 50', { timeout: 180_000 }, async () => {
    const e = createEngine({ seed: 11 });
    for (let h = 1; h <= 24; h++) {
      e.advanceTo(h * 3600);
      await new Promise((r) => setTimeout(r, 0)); // Stage 2: the run now takes ~55 s; yield so Vitest's RPC does not time out
    }
```

Stage 6a's host tests encoded two Stage 1 facts that Stage 2 changes (`setTarget sbp` was rejected; the host synthesised `state` because the engine had none — request E1, which this stage delivers, and the host already stops synthesising once the engine emits its own).

Edit `packages/controller/test/session/host-session.test.ts`:

Edit 1 of 3 — find:

```ts
    command({ type: 'setTarget', variable: 'sbp', value: 120 });
```

replace with:

```ts
    command({ type: 'setTarget', variable: 'spo2', value: 90 }); // Stage 2 accepts sbp; spo2 is Stage 3
```

Edit 2 of 3 — find:

```ts
    expect(of('ack')[0]!.reason).toMatch(/Stage 2/);
```

replace with:

```ts
    expect(of('ack')[0]!.reason).toMatch(/Stage 3/);
```

Edit 3 of 3 — find:

```ts
  it('synthesises a target-derived state event with a ramping flag (engine request E1)', async () => {
    const { command, of, events, hs: h, host } = setup();
    command({ type: 'setTarget', variable: 'hr', value: 120, ramp: { durationS: 10 } });
    await waitFor(() => of('ack').length === 1);
    host.advance(1000);
    h.emitState();
    await sleep(5);
    const st = events().filter((e) => e.type === 'state').at(-1) as Extract<ReturnType<typeof events>[number], { type: 'state' }>;
    expect(st.values.hr).toBe(120);
    expect(st.control.hr).toBe('ramping');
    host.advance(10_000);
    h.emitState();
    await sleep(5);
    const st2 = events().filter((e) => e.type === 'state').at(-1) as typeof st;
    expect(st2.control.hr).toBeUndefined();
  });
```

replace with:

```ts
  it("forwards the engine's own state (engine request E1, delivered by Stage 2) with a ramping flag", async () => {
    const { command, of, events, hs: h, host } = setup();
    command({ type: 'setTarget', variable: 'hr', value: 120, ramp: { durationS: 10 } });
    await waitFor(() => of('ack').length === 1);
    host.advance(1000);
    h.emitState(); // a no-op now: the engine emits its own 1 Hz state, with the ramp's truth, not the target
    await sleep(5);
    const st = events().filter((e) => e.type === 'state').at(-1) as Extract<ReturnType<typeof events>[number], { type: 'state' }>;
    expect(st.values.hr).toBeGreaterThan(75);
    expect(st.values.hr).toBeLessThan(120);
    expect(st.control.hr).toBe('ramping');
    host.advance(10_000);
    h.emitState();
    await sleep(5);
    const st2 = events().filter((e) => e.type === 'state').at(-1) as typeof st;
    expect(st2.values.hr).toBe(120);
    expect(st2.control.hr).toBeUndefined();
  });
```

- [ ] **Step 5: Run the engine tests**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/hemo-engine.test.ts test/engine/engine-commands.test.ts && npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/engine-pipeline.test.ts && npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck && npx -y pnpm@9.15.9 --filter @pme/controller test`
Expected: PASS (20 tests, then 8 tests — acceptance 11 takes ≈ 55–65 s — then controller 97 tests). The Stage 1 test "fills the look-ahead at creation" still sees `latestSampleIndex('abp') === -1` because the arterial line defaults to `'none'`, and the Stage 1.1 "chunking invariance" test still passes because the haemodynamics advance only the committed state deterministically.

- [ ] **Step 6: Commit**

```bash
git add packages/engine-core/src/engine.ts packages/engine-core/test/helpers/hemo.ts packages/engine-core/test/engine packages/controller/test/session/host-session.test.ts
git commit -m "feat(engine-core): wire the haemodynamic pipeline, 125 Hz buffers, stageGroup; adapt two Stage 1 tests" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: Acceptance tests 1–3 — timing, MAP by integral, tracker

**Files:**
- Create: `packages/engine-core/test/engine/hemo-acceptance.test.ts` (this task writes the whole file; Tasks 15–16 only run the parts they cover)

**Interfaces:**
- Consumes: helpers (Task 13), `RADIAL_PTT_S`, `pepS`, `lvetS`, `volumeStatusForGHyp` (Task 3), `createHemoState`/`advanceHemo` (Task 12), `RHYTHMS` (Stage 1, read-only).
- Produces: acceptance evidence for BUILD-PLAN tests 1, 2, 3, 5, 6, 7, 8, 10, 11 and the plan's extras (dicrotic-notch timing, post-PVC potentiation, AF PP variability, pulseless-flat).

These tests exercise behaviour built in Tasks 3–13, so they are expected to PASS on the first run. If one fails, do NOT loosen a tolerance: re-check that the constants in `params.ts`, `tracker.ts` and `nibp.ts` match this plan exactly, then report the measured value in the gate note.

- [ ] **Step 1: Write the acceptance file**

`packages/engine-core/test/engine/hemo-acceptance.test.ts`:

```ts
// BUILD-PLAN Stage 2 acceptance tests 1–3 and 5–8, 10, 11 at engine level (4 is in circulation.test.ts,
// 9 in hemo-nibp.test.ts), plus the extra checks the Stage 2 plan adds.
import { describe, expect, it } from 'vitest';
import { createHemoState, advanceHemo, type HemoCtx, type RhythmView } from '../../src/l2/hemo/pipeline.ts';
import { createL1State } from '../../src/l1/state.ts';
import { constantRamp } from '../../src/l1/ramp.ts';
import { lvetS, pepS, RADIAL_PTT_S, volumeStatusForGHyp } from '../../src/l2/hemo/params.ts';
import { RHYTHMS } from '../../src/l2/ecg/rhythms.ts';
import { createRngState } from '../../src/rng/sfc32.ts';
import type { EngineEvent } from '../../src/types.ts';
import { beatsOf, cmd, footAfter, mean, notchAfter, numeric, read, riseAfter, rig, rmssd } from '../helpers/hemo.ts';

describe('Stage 2 acceptance (engine level)', () => {
  it('1. timing at HR 60/90/120: R→radial foot 150–220 ms, pleth foot 200–300 ms after R and 20–100 ms after the radial foot, notch at R + PEP + LVET + PTT ± 20 ms', () => {
    for (const hr of [60, 90, 120]) {
      const { e, ev } = rig({ hr, hrv: false, seed: 3 });
      e.advanceTo(40);
      const abp = read(e, 'abp', 20, 40);
      const pl = read(e, 'pleth', 20, 40);
      for (const b of beatsOf(ev, 25, 38)) {
        const fa = footAfter(abp, 20, b.t) - b.t;
        const fp = footAfter(pl, 20, b.t) - b.t;
        expect(fa).toBeGreaterThanOrEqual(0.15);
        expect(fa).toBeLessThanOrEqual(0.22);
        expect(fp).toBeGreaterThanOrEqual(0.2);
        expect(fp).toBeLessThanOrEqual(0.3);
        expect(fp - fa).toBeGreaterThanOrEqual(0.02);
        expect(fp - fa).toBeLessThanOrEqual(0.1);
        const expected = b.t + pepS(hr) + lvetS(hr) + RADIAL_PTT_S;
        expect(Math.abs(notchAfter(abp, 20, b.t) - expected)).toBeLessThanOrEqual(0.02);
      }
    }
  });

  it('2. MAP by integral: the displayed mean agrees with the time-average of the displayed waveform (±1 mmHg)', () => {
    const { e, ev } = rig({ seed: 2 });
    e.advanceTo(60);
    const wave = read(e, 'abp', 30, 60);
    expect(Math.abs(mean(numeric(ev, 'abpMean', 30.5, 60)) - mean([...wave]))).toBeLessThanOrEqual(1);
  });

  it('3. tracker: 90/50 with a 30 s linear ramp in sinus 80 is met ±3 mmHg 10 beats after the ramp; the ramp is monotonic', () => {
    const { e, ev } = rig({ hr: 80, seed: 4 });
    e.advanceTo(30);
    e.dispatch(cmd({ type: 'setTarget', variable: 'sbp', value: 90, ramp: { durationS: 30, curve: 'linear' } }));
    e.dispatch(cmd({ type: 'setTarget', variable: 'dbp', value: 50, ramp: { durationS: 30, curve: 'linear' } }));
    e.advanceTo(60.02 + 7.5 + 0.5);
    const sys = numeric(ev, 'abpSys', 67.9, 68.1);
    const dia = numeric(ev, 'abpDia', 67.9, 68.1);
    expect(Math.abs(sys[0]! - 90)).toBeLessThanOrEqual(3);
    expect(Math.abs(dia[0]! - 50)).toBeLessThanOrEqual(3);
    const truth = ev.filter((x): x is Extract<EngineEvent, { type: 'state' }> => x.type === 'state' && x.t > 30 && x.t <= 61).map((x) => x.values.sbp!);
    for (let i = 1; i < truth.length; i++) expect(truth[i]!).toBeLessThanOrEqual(truth[i - 1]! + 1e-9);
    const shown = [35, 40, 45, 50, 55, 60].map((t) => mean(numeric(ev, 'abpSys', t - 2, t + 2)));
    for (let i = 1; i < shown.length; i++) expect(shown[i]!).toBeLessThan(shown[i - 1]!);
  });

  it('5a. AF pulse deficit: some beats with RR < 350 ms give PP < 5 mmHg, and PR (pleth) < HR', () => {
    const { e, ev } = rig({ seed: 5 });
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'afib', opts: { rateBpm: 150 } })); // RR floor ≈ 0.35 s below ~140/min
    e.advanceTo(110);
    const abp = read(e, 'abp', 0, 110);
    const b = beatsOf(ev, 10, 108);
    let tiny = 0;
    for (let i = 1; i < b.length - 1; i++) {
      if (b[i]!.t - b[i - 1]!.t < 0.35 && riseAfter(abp, 0, b[i]!.t, b[i + 1]!.t - b[i]!.t) < 5) tiny++;
    }
    expect(tiny).toBeGreaterThan(0);
    expect(mean(numeric(ev, 'pr', 90, 110))).toBeLessThan(mean(numeric(ev, 'hr', 90, 110)) - 10);
  });

  it('5b. a beat with k_rhythm 0 (a PVC coupled below 45%) has no upstroke', () => {
    // Synthetic beat records drive the pipeline directly: identical runs with and without the k = 0 beat must
    // draw the same arterial trace until the next beat's ejection.
    const trace = (withPvc: boolean) => {
      const l1 = createL1State();
      const hs = createHemoState({ sensors: { abp: 'connected' } }, l1, 75);
      const records: EngineEvent[] = [];
      for (let k = 0; k < 20; k++) {
        records.push({ type: 'beat', t: 0.5 + k * 0.8, seq: 2 * k, origin: 'sinus', template: 'narrow', qrsMs: 90, qtMs: 380, mech: { perfused: true, kSV: 1, svMl: 70, lvetMs: 285 } });
        if (withPvc && k === 11) {
          records.push({ type: 'beat', t: 0.5 + k * 0.8 + 0.3, seq: 2 * k + 1, origin: 'ventricular', template: 'pvc', qrsMs: 160, qtMs: 420, mech: { perfused: false, kSV: 0, svMl: 0, lvetMs: 285 } });
        }
      }
      const rhythm: RhythmView = { id: 'sinus', records };
      const ctx: HemoCtx = { l1, hr: constantRamp(75), rhythm, rng: createRngState(1), phi: 0 };
      const abp: number[] = [];
      advanceHemo(hs, ctx, 125 * 16, (ch, m, v) => {
        if (ch === 'abp') abp[m] = v;
      });
      return abp;
    };
    const a = trace(true);
    const b = trace(false);
    const tPvc = 0.5 + 11 * 0.8 + 0.3;
    const tNext = 0.5 + 12 * 0.8;
    let diff = 0;
    for (let m = Math.round(tPvc * 125); m < Math.round((tNext + 0.1) * 125); m++) diff = Math.max(diff, Math.abs(a[m]! - b[m]!));
    expect(diff).toBeLessThan(0.01);
  });

  it('5c. post-PVC potentiation: the next beat SBP is +8–15 mmHg on average over isolated PVCs', () => {
    const { e, ev } = rig({ seed: 5, hrv: false });
    for (const t0 of [20, 35, 50, 65, 80, 95]) {
      e.advanceTo(t0);
      e.dispatch(cmd({ type: 'setModifiers', modifiers: { pvc: { pattern: 'bigeminy', probability: 0 } } }));
      e.advanceTo(t0 + 0.6);
      e.dispatch(cmd({ type: 'setModifiers', modifiers: { pvc: null } }));
    }
    e.advanceTo(110);
    const abp = read(e, 'abp', 0, 110);
    const sbp = (t: number) => Math.max(...abp.subarray(Math.round((t + 0.1) * 125), Math.round((t + 0.5) * 125)));
    const b = beatsOf(ev, 10, 108);
    const d: number[] = [];
    b.forEach((x, i) => {
      if (i > 3 && b[i - 1]!.template === 'pvc') d.push(sbp(x.t) - mean([sbp(b[i - 2]!.t), sbp(b[i - 3]!.t), sbp(b[i - 4]!.t)]));
    });
    expect(d.length).toBeGreaterThanOrEqual(5);
    expect(mean(d)).toBeGreaterThanOrEqual(8);
    expect(mean(d)).toBeLessThanOrEqual(15);
  });

  it('extra: AF beat-to-beat pulse-pressure variability (RMSSD of upstrokes) is > 3× sinus', () => {
    const spread = (rhythm: 'sinus' | 'afib') => {
      const { e, ev } = rig({ seed: 6 });
      if (rhythm === 'afib') e.dispatch(cmd({ type: 'setRhythm', rhythm: 'afib', opts: { rateBpm: 100 } }));
      e.advanceTo(80);
      const abp = read(e, 'abp', 0, 80);
      const b = beatsOf(ev, 20, 78);
      return rmssd(b.slice(0, -1).map((x, i) => riseAfter(abp, 0, x.t, b[i + 1]!.t - x.t)));
    };
    expect(spread('afib')).toBeGreaterThan(3 * spread('sinus'));
  });

  const arrests: Array<[string, Record<string, unknown>]> = [
    ['asystole', { rhythm: 'asystole' }],
    ['VT 220', { rhythm: 'vtMono', opts: { rateBpm: 220 } }],
  ];
  if ('vfCoarse' in RHYTHMS) arrests.push(['VF', { rhythm: 'vfCoarse' }]); // Stage 5 adds VF
  for (const [name, body] of arrests) {
    it(`6. ${name}: ABP flat at 10–15 mmHg within 20 s, pleth flat, PR invalid, sbp/dbp flagged override`, () => {
      const { e, ev } = rig({ seed: 7 });
      e.advanceTo(20);
      e.dispatch(cmd({ type: 'setRhythm', ...body }));
      e.advanceTo(40.02);
      const w = read(e, 'abp', 39, 40);
      expect(Math.min(...w)).toBeGreaterThanOrEqual(10);
      expect(Math.max(...w)).toBeLessThanOrEqual(15);
      expect(Math.max(...w) - Math.min(...w)).toBeLessThan(1);
      expect(Math.max(...read(e, 'pleth', 36, 40))).toBeLessThan(0.01);
      const m = ev.filter((x) => x.type === 'measurement' && x.t === 40 && 'pr' in x.values)[0] as Extract<EngineEvent, { type: 'measurement' }>;
      expect(m.values.pr!.flag).toBe('invalid');
      const st = ev.filter((x) => x.type === 'state').pop() as Extract<EngineEvent, { type: 'state' }>;
      expect(st.control.sbp).toBe('override');
    });
  }

  it('7. CPR at 110/min, quality 1: arterial trace 70–110 / 10–30 mmHg; a pause collapses it within 5 s', () => {
    const { e, ev } = rig({ seed: 8 });
    e.advanceTo(10);
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'asystole' }));
    e.advanceTo(30);
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 1 } }));
    e.advanceTo(50);
    const w = read(e, 'abp', 45, 50);
    expect(Math.max(...w)).toBeGreaterThanOrEqual(70);
    expect(Math.max(...w)).toBeLessThanOrEqual(110);
    expect(Math.min(...w)).toBeGreaterThanOrEqual(10);
    expect(Math.min(...w)).toBeLessThanOrEqual(30);
    expect(mean(numeric(ev, 'pr', 45, 50))).toBeCloseTo(110, -1);
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'cpr', active: false } }));
    e.advanceTo(56);
    const p = read(e, 'abp', 55, 56);
    expect(Math.max(...p) - Math.min(...p)).toBeLessThan(5);
    expect(Math.max(...p)).toBeLessThan(25);
  });

  it('8. transducer: fn 10/ζ 0.2 raises SBP 5–30 with MAP ±2; ζ 1.2 lowers SBP, raises DBP, MAP ±2', () => {
    const run = (fnHz: number, zeta: number) => {
      const { e, ev } = rig({ seed: 9, hrv: false });
      e.advanceTo(30);
      e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'line', line: 'abp', action: 'damp', value: zeta, fnHz } }));
      e.advanceTo(50);
      const avg = (id: 'abpSys' | 'abpDia' | 'abpMean', t0: number, t1: number) => mean(numeric(ev, id, t0, t1));
      return { dS: avg('abpSys', 40, 50) - avg('abpSys', 20, 30), dD: avg('abpDia', 40, 50) - avg('abpDia', 20, 30), dM: avg('abpMean', 40, 50) - avg('abpMean', 20, 30) };
    };
    const under = run(10, 0.2);
    expect(under.dS).toBeGreaterThanOrEqual(5);
    expect(under.dS).toBeLessThanOrEqual(30);
    expect(Math.abs(under.dM)).toBeLessThanOrEqual(2);
    const over = run(20, 1.2);
    expect(over.dS).toBeLessThan(0);
    expect(over.dD).toBeGreaterThan(0);
    expect(Math.abs(over.dM)).toBeLessThanOrEqual(2);
  });

  it('8. flush test: a 300 mmHg square wave, then ringing with period 1/fn ± 5%', () => {
    const { e } = rig({ seed: 10 });
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'line', line: 'abp', action: 'damp', value: 0.2, fnHz: 10 } }));
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'asystole' }));
    e.advanceTo(30);
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'line', line: 'abp', action: 'flush' } }));
    e.advanceTo(34);
    const y = read(e, 'abp', 30, 34);
    expect(y.filter((v) => v > 280).length / 125).toBeGreaterThan(0.5);
    const base = y[y.length - 1]!;
    const rel = y.findIndex((v, i) => i > 10 && v < 280 && y[i - 1]! >= 280);
    const zc: number[] = [];
    for (let i = rel + 3; i < y.length - 1; i++) {
      const a = y[i]! - base;
      const b = y[i + 1]! - base;
      if (a < 0 && b >= 0) zc.push(i + -a / (b - a));
    }
    const period = (zc[3]! - zc[0]!) / 3 / 125;
    expect(period).toBeGreaterThanOrEqual(0.095);
    expect(period).toBeLessThanOrEqual(0.105);
  });

  it('10. PPV: g_hyp 0.05 → 5–10%; g_hyp 0.2 → 15–30%; SPV grows with it', () => {
    const ppvOf = (g: number) => {
      const { e, ev } = rig({ seed: 11, hrv: false });
      e.dispatch(cmd({ type: 'setTarget', variable: 'volumeStatus', value: volumeStatusForGHyp(g) }));
      e.advanceTo(70);
      const abp = read(e, 'abp', 0, 70);
      const beats = beatsOf(ev, 30, 68).map((b) => {
        const w = abp.subarray(Math.round(b.t * 125), Math.round((b.t + 0.8) * 125));
        return { t: b.t, pp: Math.max(...w) - Math.min(...w), sys: Math.max(...w) };
      });
      const ppv: number[] = [];
      const spv: number[] = [];
      for (let t0 = 32; t0 + 4 <= 66; t0 += 4) {
        const s = beats.filter((x) => x.t >= t0 && x.t < t0 + 4);
        const hi = Math.max(...s.map((x) => x.pp));
        const lo = Math.min(...s.map((x) => x.pp));
        ppv.push((100 * (hi - lo)) / ((hi + lo) / 2));
        spv.push(Math.max(...s.map((x) => x.sys)) - Math.min(...s.map((x) => x.sys)));
      }
      return { ppv: mean(ppv), spv: mean(spv) };
    };
    const lo = ppvOf(0.05);
    const hi = ppvOf(0.2);
    expect(lo.ppv).toBeGreaterThanOrEqual(5);
    expect(lo.ppv).toBeLessThanOrEqual(10);
    expect(hi.ppv).toBeGreaterThanOrEqual(15);
    expect(hi.ppv).toBeLessThanOrEqual(30);
    expect(hi.spv).toBeGreaterThan(2 * lo.spv);
  });

  it('11. CVP: the a wave peaks 80–100 ms after P onset; AF has no a wave', () => {
    const { e, ev } = rig({ hr: 60, hrv: false, seed: 12, sensors: { cvp: 'connected' } });
    e.advanceTo(30);
    const cvp = read(e, 'cvp', 0, 30);
    const ps = ev
      .filter((x): x is Extract<EngineEvent, { type: 'atrial' }> => x.type === 'atrial' && x.kind === 'p' && x.t > 20 && x.t < 28)
      .map((x) => x.t);
    expect(ps.length).toBeGreaterThan(5);
    for (const tp of ps) {
      const w = cvp.subarray(Math.round(tp * 125), Math.round((tp + 0.2) * 125));
      const dt = w.indexOf(Math.max(...w)) / 125;
      expect(dt).toBeGreaterThanOrEqual(0.08);
      expect(dt).toBeLessThanOrEqual(0.1);
    }
    // AF: no P waves, so the pre-QRS window carries no a-wave bump
    const bump = (rhythm: 'sinus' | 'afib') => {
      const r = rig({ hr: 60, hrv: false, seed: 12, sensors: { cvp: 'connected' } });
      if (rhythm === 'afib') r.e.dispatch(cmd({ type: 'setRhythm', rhythm: 'afib', opts: { rateBpm: 60 } }));
      r.e.advanceTo(40);
      const c = read(r.e, 'cvp', 0, 40);
      return mean(beatsOf(r.ev, 20, 38).map((b) => c[Math.round((b.t - 0.12) * 125)]! - c[Math.round((b.t - 0.3) * 125)]!));
    };
    expect(bump('sinus')).toBeGreaterThan(1.5);
    expect(Math.abs(bump('afib'))).toBeLessThan(1);
    expect(ev.some((x) => x.type === 'atrial' && x.kind === 'p')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests 1–3**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/hemo-acceptance.test.ts -t "^Stage 2 acceptance \(engine level\) [123]\."`
Expected: PASS (3 tests). Record in the gate note: R→radial foot ≈ 180/168/154 ms, R→pleth foot ≈ 258/254/233 ms, the notch within ±20 ms of R + PEP + LVET + 85 ms; displayed MAP within 1 mmHg of the waveform mean; ≈ 92/52 ten beats after the ramp.

- [ ] **Step 3: Commit**

```bash
git add packages/engine-core/test/engine/hemo-acceptance.test.ts
git commit -m "test(hemo): stage 2 acceptance 1–3 (R→foot/notch timing, MAP by integral, tracker ramp)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: Acceptance tests 5–7 — pulse deficit, PESP, AF variability, arrest, CPR

**Files:**
- Test: `packages/engine-core/test/engine/hemo-acceptance.test.ts` (written in Task 14)

**Interfaces:**
- Consumes: Task 14's file.
- Produces: evidence for BUILD-PLAN tests 5, 6, 7 and the extras "post-PVC potentiation", "AF beat-to-beat pulse-pressure variability", "pulseless → flat within 20 s".

- [ ] **Step 1: Run the tests**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/hemo-acceptance.test.ts -t "(5a|5b|5c|extra|6\.|7\.)"`
Expected: PASS (7 tests with the current rhythm set: 5a, 5b, 5c, extra, 6 asystole, 6 VT 220, 7; an 8th, "6. VF", appears once Stage 5's `vfCoarse` is merged). Record: number of RR < 350 ms beats with an upstroke < 5 mmHg and mean PR vs HR in AF 150 (≈ 76 of 115; PR ≈ 88 vs HR ≈ 136), mean post-PVC ΔSBP (≈ +11), arrest plateau (≈ 12 mmHg), CPR trace (≈ 94/22) and the 5 s post-pause level (≈ 20 mmHg).

- [ ] **Step 2: Check the partition rule once more**

Run: `git diff main --stat -- packages/engine-core/src/l2/ecg packages/engine-core/templates`
Expected: no output (Stage 2 never edits Stage 5's files).

- [ ] **Step 3: Commit** (only if Step 1 required a documented fix; otherwise nothing to commit — go on to Task 16)

---

### Task 16: Acceptance tests 8, 10, 11 — transducer, flush, PPV, CVP

**Files:**
- Test: `packages/engine-core/test/engine/hemo-acceptance.test.ts` (written in Task 14)

**Interfaces:**
- Consumes: Task 14's file.
- Produces: evidence for BUILD-PLAN tests 8, 10, 11 and the extra "PPV/SPV magnitude vs volumeStatus".

- [ ] **Step 1: Run the tests**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/hemo-acceptance.test.ts -t "(8\.|10\.|11\.)"`
Expected: PASS (4 tests). Record: SBP change at fn 10/ζ 0.2 (≈ +7) and ζ 1.2 (≈ −1.4, DBP ≈ +0.6), MAP changes (< 0.5), ring period (≈ 102 ms), PPV (≈ 8% and ≈ 24%), SPV ratio, a-wave delay (≈ 89 ms).

- [ ] **Step 2: Run the whole acceptance file**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/hemo-acceptance.test.ts`
Expected: PASS (14 tests), ≈ 2 s.

---

### Task 17: Acceptance test 9 — NIBP at engine level

**Files:**
- Create: `packages/engine-core/test/engine/hemo-nibp.test.ts`

**Interfaces:**
- Consumes: helpers (Task 13), the engine with the NIBP wired (Tasks 11–13).
- Produces: evidence for BUILD-PLAN test 9 (all six bullets) and the extra "NIBP ≈ IBP MAP".

- [ ] **Step 1: Write the test**

`packages/engine-core/test/engine/hemo-nibp.test.ts`:

```ts
// BUILD-PLAN Stage 2 acceptance test 9 (NIBP) at engine level, plus "NIBP ≈ IBP MAP".
import { describe, expect, it } from 'vitest';
import type { EngineEvent, MonitorEngine } from '../../src/types.ts';
import { cmd, mean, numeric, read, rig, sd } from '../helpers/hemo.ts';

type Nibp = Extract<EngineEvent, { type: 'nibp' }>;
const isEnd = (x: EngineEvent): x is Nibp => x.type === 'nibp' && (x.phase === 'done' || x.phase === 'failed');

/** Start one manual measurement and run until it ends; returns the end event and its duration. */
function measure(e: MonitorEngine, ev: EngineEvent[]): { end: Nibp; dur: number; start: number } {
  const start = e.now().simT;
  e.dispatch(cmd({ type: 'device', action: { device: 'nibp', action: 'start' } }));
  let end: Nibp | undefined;
  for (let k = 0; k < 400 && !end; k++) {
    e.advanceTo(e.now().simT + 0.5);
    end = ev.find((x): x is Nibp => isEnd(x) && x.t > start);
  }
  if (!end) throw new Error('NIBP never finished');
  return { end, dur: end.t - (start + 0.02), start };
}

/**
 * Back-to-back measurements (5 s apart) with the error against the displayed IBP over each window. A failed
 * cycle (possible in AF, brief §4.5) counts in `durs` but has no error.
 */
function series(rhythm: 'sinus' | 'afib', n: number, seed: number) {
  const { e, ev } = rig({ seed });
  if (rhythm === 'afib') e.dispatch(cmd({ type: 'setRhythm', rhythm: 'afib', opts: { rateBpm: 75 } }));
  e.advanceTo(20);
  const out: Array<{ dur: number; dSys: number; dDia: number; dMap: number }> = [];
  const durs: number[] = [];
  for (let i = 0; i < n; i++) {
    const { end, dur, start } = measure(e, ev);
    durs.push(dur);
    e.advanceTo(e.now().simT + 5);
    if (!end.result) continue;
    const r = end.result;
    out.push({
      dur,
      dSys: r.sys - mean(numeric(ev, 'abpSys', start, end.t)),
      dDia: r.dia - mean(numeric(ev, 'abpDia', start, end.t)),
      dMap: r.map - mean(numeric(ev, 'abpMean', start, end.t)),
    });
  }
  return Object.assign(out, { durs });
}

describe('Stage 2 acceptance 9: NIBP', () => {
  it('one adult cycle at HR 75 (inflate to 165) lasts 25–35 s (mean of 6 first cycles)', () => {
    const d: number[] = [];
    for (let seed = 1; seed <= 6; seed++) {
      const { e, ev } = rig({ seed });
      e.advanceTo(20);
      const { end, dur } = measure(e, ev);
      expect(end.phase).toBe('done');
      d.push(dur);
    }
    expect(mean(d)).toBeGreaterThanOrEqual(25);
    expect(mean(d)).toBeLessThanOrEqual(35);
  });

  it('over 100 sinus measurements: bias ≤ 5 and SD ≤ 8 mmHg vs the site pressures; MAP ≈ IBP MAP', { timeout: 60_000 }, () => {
    const s = series('sinus', 100, 9);
    expect(s.length).toBe(100);
    for (const k of ['dSys', 'dDia'] as const) {
      expect(Math.abs(mean(s.map((x) => x[k])))).toBeLessThanOrEqual(5);
      expect(sd(s.map((x) => x[k]))).toBeLessThanOrEqual(8);
    }
    expect(Math.abs(mean(s.map((x) => x.dMap)))).toBeLessThanOrEqual(3);
  });

  it('in AF, the cycle is longer and the error SD larger than in sinus', { timeout: 60_000 }, () => {
    const s = series('sinus', 30, 9);
    const a = series('afib', 30, 9);
    expect(s.length).toBe(30);
    expect(a.length).toBeGreaterThanOrEqual(25); // an occasional AF cycle may fail
    expect(mean(a.durs)).toBeGreaterThan(mean(s.durs));
    expect(sd(a.map((x) => x.dSys))).toBeGreaterThan(sd(s.map((x) => x.dSys)));
  });

  it('at SBP 45 the cycle fails with an INOP after 2 attempts', () => {
    const { e, ev } = rig({ seed: 3, baseline: { sbp: 45, dbp: 30 } });
    e.advanceTo(30);
    const { end } = measure(e, ev);
    expect(end.phase).toBe('failed');
    expect(ev.some((x) => x.type === 'alarm' && x.id === 'nibp-failed' && x.category === 'technical')).toBe(true);
    const phases = ev.filter((x): x is Nibp => x.type === 'nibp').map((x) => x.phase);
    const attempts = phases.filter((p, i) => p === 'inflating' && phases[i - 1] !== 'inflating').length;
    expect(attempts).toBe(2);
  });

  it('a manual start cancels auto; auto reports the countdown', () => {
    const { e, ev } = rig({ seed: 4 });
    e.dispatch(cmd({ type: 'device', action: { device: 'nibp', action: 'auto', intervalMin: 5 } }));
    e.advanceTo(60);
    const idle = ev.filter((x): x is Nibp => x.type === 'nibp' && x.phase === 'idle' && x.nextInS !== undefined);
    expect(idle.length).toBeGreaterThan(0);
    expect(idle[idle.length - 1]!.nextInS!).toBeGreaterThan(200);
    e.dispatch(cmd({ type: 'device', action: { device: 'nibp', action: 'start' } }));
    e.advanceTo(400);
    const starts = ev.filter((x) => x.type === 'nibp' && x.phase === 'inflating' && x.cuffMmHg === 0);
    expect(starts.length).toBe(2); // the auto start at 0 s and the manual one; no auto start at 300 s
  });

  it('with the cuff on the SpO2 arm, the pleth is flat while the cuff is above systolic', () => {
    const { e, ev } = rig({ seed: 5 });
    e.dispatch(cmd({ type: 'attachSensor', sensor: 'spo2', state: 'on', site: 'rightFinger' }));
    e.dispatch(cmd({ type: 'attachSensor', sensor: 'nibp', state: 'on', site: 'rightArm' }));
    e.advanceTo(20);
    const { start } = measure(e, ev);
    const cuff = ev.filter((x): x is Nibp => x.type === 'nibp' && x.t > start && x.cuffMmHg !== undefined && x.cuffMmHg >= 140);
    expect(cuff.length).toBeGreaterThan(10);
    const t0 = cuff[0]!.t + 1;
    const t1 = cuff[cuff.length - 1]!.t;
    expect(Math.max(...read(e, 'pleth', t0, t1))).toBeLessThan(0.05);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/hemo-nibp.test.ts`
Expected: PASS (6 tests), ≈ 10 s. Record: mean first-cycle duration (≈ 32 s), NIBP − IBP bias/SD for SBP and DBP over 100 cycles (≈ +0.7/6.8 and +1.5/5.7), AF vs sinus mean duration and SBP-error SD, how many AF cycles failed, the time to the SBP 45 failure (≈ 56 s).

- [ ] **Step 3: Commit**

```bash
git add packages/engine-core/test/engine/hemo-nibp.test.ts
git commit -m "test(nibp): stage 2 acceptance 9 — cycle time, AAMI bias/SD, AF, failure, auto/manual, same-limb pleth" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 18: Determinism hash and 24 h no-drift at 125 Hz

**Files:**
- Create: `packages/engine-core/test/engine/hemo-longrun.test.ts`

**Interfaces:**
- Consumes: the wired engine.
- Produces: evidence for "determinism hash" and "no drift for 125 Hz over 24 h sim".

- [ ] **Step 1: Write the test**

`packages/engine-core/test/engine/hemo-longrun.test.ts`:

```ts
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { Command } from '../../src/types.ts';
import { cmd } from '../helpers/hemo.ts';

describe('Stage 2 determinism and drift', () => {
  it('same seed + same commands → identical SHA-256 over 60 s of abp, cvp, pap and pleth; another seed differs', () => {
    const script: Array<[number, Command]> = [
      [5, cmd({ type: 'setTarget', variable: 'sbp', value: 100, ramp: { durationS: 10 } })],
      [12, cmd({ type: 'device', action: { device: 'nibp', action: 'start' } })],
      [20, cmd({ type: 'setRhythm', rhythm: 'afib' })],
      [30, cmd({ type: 'applyEvent', event: { kind: 'line', line: 'abp', action: 'flush' } })],
      [40, cmd({ type: 'setModifiers', modifiers: { pvc: { pattern: 'bigeminy', probability: 0 } } })],
    ];
    const run = (seed: number) => {
      const e = createEngine({ seed, patient: { sensors: { abp: 'connected', cvp: 'connected', pap: 'connected' } } });
      const h = createHash('sha256');
      let from = 0;
      for (let t = 0.5; t <= 60 + 1e-9; t += 0.5) {
        for (const [at, c] of script) if (Math.abs(at - t) < 1e-9) e.dispatch(c);
        e.advanceTo(t);
        const to = Math.round(t * 125);
        for (const ch of ['abp', 'cvp', 'pap', 'pleth'] as const) {
          const out = new Float32Array(to - from + 1);
          expect(e.readSamples(ch, from, out)).toBe(out.length);
          h.update(out);
        }
        from = to + 1;
      }
      return h.digest('hex');
    };
    expect(run(42)).toBe(run(42));
    expect(run(42)).not.toBe(run(43));
  });

  it('no drift at 125 Hz: after advanceTo(86400) latestSampleIndex(abp) = latestSampleIndex(pleth) = 10,800,000 + 12', { timeout: 180_000 }, async () => {
    const e = createEngine({ seed: 11, patient: { sensors: { abp: 'connected' } } });
    for (let h = 1; h <= 24; h++) {
      e.advanceTo(h * 3600);
      await new Promise((r) => setTimeout(r, 0)); // yield so Vitest's worker RPC does not time out (60 s)
    }
    expect(e.latestSampleIndex('abp')).toBe(10_800_000 + 12);
    expect(e.latestSampleIndex('pleth')).toBe(10_800_000 + 12);
    expect(e.latestSampleIndex('ecgII')).toBe(43_200_000 + 50);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/hemo-longrun.test.ts`
Expected: PASS (2 tests); the 24 h run takes ≈ 70 s and must not print "Timeout calling onTaskUpdate".

- [ ] **Step 3: Run the whole engine-core suite**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core test && npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck`
Expected: PASS — 35 files, 177 tests (112 existing + 65 new), ≈ 75–80 s.

- [ ] **Step 4: Commit**

```bash
git add packages/engine-core/test/engine/hemo-longrun.test.ts
git commit -m "test(hemo): determinism hash over abp/cvp/pap/pleth and 24 h no-drift at 125 Hz" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---
### Task 19: Renderer — ABP/pleth/CVP/PAP sweep lanes

**Files:**
- Create: `packages/renderer/src/wave-lanes.ts`
- Modify: `packages/renderer/src/protocol.ts`, `packages/renderer/src/monitor-core.ts`, `packages/renderer/src/index.ts`, `packages/renderer/test/monitor-core.test.ts` (append)

**Interfaces:**
- Consumes: `SweepLane`/`LaneConfig` (Stage 1), engine channels `abp`, `cvp`, `pap`, `pleth` (Task 13).
- Produces: `type WaveLaneId = 'abp'|'pleth'|'cvp'|'pap'`, `interface WaveStyle { label; color; range: [lo, hi] | null }`, `WAVE_STYLE` (ABP `#ff3b3b` 0–150, pleth `#00e5ff` auto, CVP `#3d8bff` −5–20, PAP `#ffe14d` 0–40), `scaleFor(lo, hi, height, pxPerMm): { baseline; gainMmPerMv }`, `autoRange(samples, count): [lo, hi]`; `CoreOptions.waves?: WaveLaneId[]` (default `[]`, so Stage 1 layouts and tests are unchanged).

- [ ] **Step 1: Write the failing test** — append to `packages/renderer/test/monitor-core.test.ts`:

```ts
describe('MonitorCore Stage 2 waveform lanes', () => {
  it('adds ABP and pleth lanes below the ECG lanes with label and scale chrome, and draws them in their colours', () => {
    const ctx = new FakeCtx();
    const canvas = { width: 0, height: 0 };
    const core = new MonitorCore(
      canvas,
      ctx,
      { cssW: 1056, cssH: 400, dpr: 1 },
      { engine: { seed: 1, patient: { sensors: { abp: 'connected' } } }, waves: ['abp', 'pleth'] },
      () => {},
    );
    expect(ctx.texts).toEqual(['II  M', 'V5  M', 'ABP', '150', '0', 'Pleth']);
    ctx.clear();
    for (let f = 0; f <= 180; f++) core.frame(1000 + (f * 1000) / 60);
    const styles = new Set(ctx.calls.filter((c) => c.op === 'stroke').map((c) => c.style));
    expect(styles.has('#ff3b3b')).toBe(true);
    expect(styles.has('#00e5ff')).toBe(true);
  });

  it('a lane whose sensor is none draws nothing', () => {
    const ctx = new FakeCtx();
    const core = new MonitorCore({ width: 0, height: 0 }, ctx, { cssW: 800, cssH: 300, dpr: 1 }, { engine: { seed: 1 }, waves: ['cvp'] }, () => {});
    ctx.clear();
    for (let f = 0; f <= 60; f++) core.frame(1000 + (f * 1000) / 60);
    expect(ctx.calls.some((c) => c.op === 'stroke' && c.style === '#3d8bff')).toBe(false);
  });

  it('a lead change on lane 1 does not touch the wave lanes, and the filter letter redraw keeps the wave labels', () => {
    const ctx = new FakeCtx();
    const core = new MonitorCore({ width: 0, height: 0 }, ctx, { cssW: 1056, cssH: 400, dpr: 1 }, { engine: { seed: 1 }, waves: ['pleth'] }, () => {});
    ctx.texts = [];
    core.command({ id: 'l', issuedBy: 't', type: 'device', action: { device: 'ecg', action: 'lead', value: 'V1', lane: 1 } });
    expect(ctx.texts).toEqual(['V1  M']);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run test/monitor-core.test.ts`
Expected: FAIL — `texts` has only the two ECG labels (and a TypeScript error for `waves` if you run `typecheck`).

- [ ] **Step 3: Implement**

`packages/renderer/src/wave-lanes.ts`:

```ts
// Stage 2 waveform lanes (brief §3.5, §6.8 colours): ABP red, pleth cyan, CVP blue, PAP yellow, drawn by the
// existing SweepLane at 125 Hz. SweepLane maps "mV" to y through baseline + gainMmPerMv; a pressure lane maps
// mmHg instead, so the scale range [lo, hi] becomes baseline = hi/(hi − lo) and gain = height/((hi − lo)·pxPerMm).
// The pleth is auto-scaled (brief §4.3: "the display is auto-scaled; PI is kept as a number").
export type WaveLaneId = 'abp' | 'pleth' | 'cvp' | 'pap';

export interface WaveStyle {
  label: string;
  color: string;
  /** Fixed scale in mmHg, or null for auto-scale (pleth). */
  range: readonly [number, number] | null;
}

/** Philips-like defaults (brief §6.8): ABP scale 150 adult; CVP (blue, OR option); PAP yellow. */
export const WAVE_STYLE: Readonly<Record<WaveLaneId, WaveStyle>> = {
  abp: { label: 'ABP', color: '#ff3b3b', range: [0, 150] },
  pleth: { label: 'Pleth', color: '#00e5ff', range: null },
  cvp: { label: 'CVP', color: '#3d8bff', range: [-5, 20] },
  pap: { label: 'PAP', color: '#ffe14d', range: [0, 40] },
};

/** SweepLane baseline and gain that map [lo, hi] onto a lane of `height` CSS px. */
export function scaleFor(lo: number, hi: number, height: number, pxPerMm: number): { baseline: number; gainMmPerMv: number } {
  return { baseline: hi / (hi - lo), gainMmPerMv: height / ((hi - lo) * pxPerMm) };
}

/** Pleth auto-scale [ENG]: the last 4 s fill 80% of the lane, centred; flat traces keep a 0.1 % span. */
export function autoRange(samples: ArrayLike<number>, count: number): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < count; i++) {
    const v = samples[i] as number;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (!Number.isFinite(lo)) return [-0.05, 0.05];
  const span = Math.max(0.1, hi - lo) / 0.8;
  const mid = (hi + lo) / 2;
  return [mid - span / 2, mid + span / 2];
}
```

Edit `packages/renderer/src/protocol.ts`:

Edit 1 of 2 — find:

```ts
import type { Command, DispatchResult, EngineEvent, EngineOptions, LeadId, PatientSnapshot } from '@pme/engine-core';
```

replace with:

```ts
import type { Command, DispatchResult, EngineEvent, EngineOptions, LeadId, PatientSnapshot } from '@pme/engine-core';
import type { WaveLaneId } from './wave-lanes.ts'; // Stage 2
```

Edit 2 of 2 — find:

```ts
  lanes?: LeadId[];
  pxPerMm?: number;
```

replace with:

```ts
  lanes?: LeadId[];
  /** Stage 2: waveform lanes drawn below the ECG lanes, in order (default none). */
  waves?: WaveLaneId[];
  pxPerMm?: number;
```

Edit `packages/renderer/src/monitor-core.ts` (the lead-change guard now compares with `this.leads.length`, since wave lanes follow the ECG lanes in `this.lanes`; wave chrome is drawn by its own method so the Stage 1.1 partial chrome redraws keep working):

Edit 1 of 9 — find:

```ts
import { SweepLane } from './sweep-lane.ts';
```

replace with:

```ts
import { SweepLane } from './sweep-lane.ts';
import { autoRange, scaleFor, WAVE_STYLE, type WaveLaneId } from './wave-lanes.ts'; // Stage 2
```

Edit 2 of 9 — find:

```ts
  private leads: LeadId[];
```

replace with:

```ts
  private leads: LeadId[];
  private waves: WaveLaneId[]; // Stage 2
  private waveLive: boolean[] = []; // Stage 2: the channel had samples on the last frame
  private plethRangeT = -1; // Stage 2: sim time of the last pleth auto-scale
  private readonly plethScratch = new Float32Array(500); // Stage 2
```

Edit 3 of 9 — find:

```ts
    this.leads = [...(opts.lanes ?? ['ecgII', 'V5'])];
```

replace with:

```ts
    this.leads = [...(opts.lanes ?? ['ecgII', 'V5'])];
    this.waves = [...(opts.waves ?? [])]; // Stage 2
```

Edit 4 of 9 — find:

```ts
      } else if (cmd.action.action === 'lead' && typeof cmd.action.lane === 'number' && cmd.action.lane < this.lanes.length) {
```

replace with:

```ts
      } else if (cmd.action.action === 'lead' && typeof cmd.action.lane === 'number' && cmd.action.lane < this.leads.length) { // Stage 2: leads, not lanes (wave lanes follow)
```

Edit 5 of 9 — find:

```ts
    if (this.visible) {
      this.lanes.forEach((lane, i) => {
        const ch = this.leads[i] as LeadId;
        lane.draw(this.ctx, t, (from, out) => this.engine.readSamples(ch, from, out));
      });
    }
```

replace with:

```ts
    if (this.visible) {
      this.lanes.forEach((lane, i) => {
        if (i >= this.leads.length) return; // Stage 2: wave lanes are drawn by drawWaves
        const ch = this.leads[i] as LeadId;
        lane.draw(this.ctx, t, (from, out) => this.engine.readSamples(ch, from, out));
      });
      this.drawWaves(t); // Stage 2
    }
```

Edit 6 of 9 — find:

```ts
  private layout(): void {
```

replace with:

```ts
  /** Stage 2: pressure and pleth lanes (125 Hz), auto-scaled pleth, cleared when a sensor goes to 'none'. */
  private drawWaves(t: number): void {
    this.waves.forEach((w, j) => {
      const lane = this.lanes[this.leads.length + j] as SweepLane;
      const live = this.engine.latestSampleIndex(w) >= 0;
      if (!live) {
        if (this.waveLive[j]) lane.reset(this.ctx);
        this.waveLive[j] = false;
        return;
      }
      this.waveLive[j] = true;
      if (w === 'pleth' && t - this.plethRangeT >= 1) {
        this.plethRangeT = t;
        const n = this.engine.readSamples('pleth', Math.floor((t - 4) * 125), this.plethScratch);
        const [lo, hi] = autoRange(this.plethScratch, n);
        Object.assign(lane.cfg, scaleFor(lo, hi, lane.cfg.height, this.pxPerMm));
      }
      lane.draw(this.ctx, t, (from, out) => this.engine.readSamples(w, from, out));
    });
  }

  private layout(): void {
```

Edit 7 of 9 — find:

```ts
    const h = cssH / this.leads.length;
    this.lanes = this.leads.map((_, i) => {
```

replace with:

```ts
    const h = cssH / (this.leads.length + this.waves.length); // Stage 2: wave lanes share the height
    this.lanes = this.leads.map((_, i) => {
```

Edit 8 of 9 — find:

```ts
    this.drawChrome(this.leads.map((_, i) => i));
  }

  /** Static chrome
```

replace with:

```ts
    // Stage 2: waveform lanes below the ECG lanes
    this.waves.forEach((w, j) => {
      const st = WAVE_STYLE[w];
      const [lo, hi] = st.range ?? [-0.5, 3];
      const lane = new SweepLane(
        {
          x: LABEL_W, y: (this.leads.length + j) * h, width: cssW - LABEL_W, height: h, rate: 125, mmPerS: 25,
          pxPerMm: this.pxPerMm, ...scaleFor(lo, hi, h, this.pxPerMm), color: st.color, background: THEME.background,
          lineWidth: 1.75, eraseGapPx: 16,
        },
        dpr,
      );
      lane.reset(this.ctx, dpr);
      this.lanes.push(lane);
    });
    this.waveLive = this.waves.map(() => false);
    this.plethRangeT = -1;
    this.drawChrome(this.leads.map((_, i) => i));
    this.drawWaveChrome(h); // Stage 2
  }

  /** Stage 2: label and scale of each waveform lane (static chrome, brief §3.5). */
  private drawWaveChrome(h: number): void {
    const ctx = this.ctx;
    ctx.font = '14px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    this.waves.forEach((w, j) => {
      const st = WAVE_STYLE[w];
      const y0 = (this.leads.length + j) * h;
      ctx.fillStyle = st.color;
      ctx.fillText(st.label, 6, y0 + 6);
      if (st.range) {
        ctx.fillText(String(st.range[1]), 6, y0 + 24);
        ctx.fillText(String(st.range[0]), 6, y0 + h - 18);
      }
    });
  }

  /** Static chrome
```

Edit 9 of 9 — find:

```ts
    const h = this.size.cssH / this.leads.length;
    for (const i of lanes) {
```

replace with:

```ts
    const h = this.size.cssH / (this.leads.length + this.waves.length); // Stage 2
    for (const i of lanes) {
```

Edit `packages/renderer/src/index.ts`:

Edit 1 of 1 — find:

```ts
export type { RenderPath } from './worker-host.ts';
```

replace with:

```ts
export type { RenderPath } from './worker-host.ts';
export { WAVE_STYLE, scaleFor, autoRange, type WaveLaneId, type WaveStyle } from './wave-lanes.ts'; // Stage 2
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run && npx -y pnpm@9.15.9 --filter @pme/renderer typecheck`
Expected: PASS (29 tests: 26 existing + 3).

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/wave-lanes.ts packages/renderer/src/protocol.ts packages/renderer/src/monitor-core.ts packages/renderer/src/index.ts packages/renderer/test/monitor-core.test.ts
git commit -m "feat(renderer): opt-in ABP/pleth/CVP/PAP sweep lanes with scale chrome and pleth auto-scale" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 20: Renderer — ABP, CVP, PAP, PR, PI and NIBP tiles in `mountMonitor`

**Files:**
- Create: `packages/renderer/src/numerics-hemo.ts`, `packages/renderer/test/numerics-hemo.test.ts`
- Modify: `packages/renderer/src/mount.ts`, `packages/renderer/src/index.ts`

**Interfaces:**
- Consumes: `Measured`, `EngineEvent` (`nibp`, `measurement`), `WAVE_STYLE` (Task 19).
- Produces: `formatPressure(sys, dia, mean): { main; sub }`, `formatClock(simT): 'hh:mm'`, `interface NibpView { main; sub; status }`, `formatNibp(e, last): NibpView`, `class PressureTile { constructor(parent, label, unit, color); set(main, sub, status = '') }`; `MountOptions.waves?: WaveLaneId[]`, `MountOptions.nibp?: boolean`.

- [ ] **Step 1: Write the failing test**

`packages/renderer/test/numerics-hemo.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatClock, formatNibp, formatPressure } from '../src/numerics-hemo.ts';

describe('numerics-hemo formatters (brief §6.1, §6.3)', () => {
  it('pressure S/D (M), with dashes when invalid', () => {
    const v = (value: number | null, flag: 'valid' | 'invalid' = 'valid') => ({ value, flag, at: 1 });
    expect(formatPressure(v(120.4), v(79.6), v(95.2))).toEqual({ main: '120/80', sub: '(95)' });
    expect(formatPressure(v(null, 'invalid'), v(80), v(95))).toEqual({ main: '---/---', sub: '(95)' });
  });

  it('NIBP: live cuff while measuring, result with hh:mm, countdown in auto, failure text', () => {
    const last = { sys: 118, dia: 76, map: 90, at: 3725 };
    expect(formatClock(3725)).toBe('01:02');
    expect(formatNibp({ type: 'nibp', t: 10, phase: 'deflating', cuffMmHg: 141 }, last)).toEqual({ main: '141', sub: 'mmHg', status: 'NBP measuring' });
    expect(formatNibp({ type: 'nibp', t: 10, phase: 'done', cuffMmHg: 100, result: { sys: 118, dia: 76, map: 90, pr: 74 } }, last).main).toBe('118/76');
    expect(formatNibp({ type: 'nibp', t: 10, phase: 'idle', nextInS: 125 }, last).status).toBe('01:02  next 2:05');
    expect(formatNibp({ type: 'nibp', t: 10, phase: 'failed', cuffMmHg: 30 }, null)).toEqual({ main: '---/---', sub: '(---)', status: 'NBP measurement failed' });
    expect(formatNibp(undefined, null).status).toBe('MANUAL');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run test/numerics-hemo.test.ts`
Expected: FAIL — cannot load `../src/numerics-hemo.ts`.

- [ ] **Step 3: Implement**

`packages/renderer/src/numerics-hemo.ts`:

```ts
// Stage 2 numeric tiles (brief §6.1, §6.3): ABP/PAP "S/D (M)", CVP mean, PR, PI and NIBP with its measuring
// state, live cuff pressure and "hh:mm" timestamp. Pure formatters are exported for tests (Node has no DOM).
import type { EngineEvent, Measured } from '@pme/engine-core';

type NibpEvent = Extract<EngineEvent, { type: 'nibp' }>;

/** "120/80" and "(95)"; dashes when any part is missing or invalid. */
export function formatPressure(sys: Measured | undefined, dia: Measured | undefined, mean: Measured | undefined): { main: string; sub: string } {
  const ok = (m: Measured | undefined): m is Measured & { value: number } => !!m && m.value !== null && m.flag !== 'invalid';
  const main = ok(sys) && ok(dia) ? `${Math.round(sys.value)}/${Math.round(dia.value)}` : '---/---';
  const sub = ok(mean) ? `(${Math.round(mean.value)})` : '(---)';
  return { main, sub };
}

/** Sim seconds → "hh:mm" on a clock that starts at 00:00 when the engine starts. */
export function formatClock(simT: number): string {
  const m = Math.floor(simT / 60);
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export interface NibpView {
  main: string; // last result "S/D" or the live cuff pressure while measuring
  sub: string; // "(M)" or the phase
  status: string; // timestamp, countdown or failure text
}

/** NIBP tile text from the latest nibp event and the last result (brief §6.3 state machine). */
export function formatNibp(e: NibpEvent | undefined, last: { sys: number; dia: number; map: number; at: number } | null): NibpView {
  const res = last ? { main: `${last.sys}/${last.dia}`, sub: `(${last.map})` } : { main: '---/---', sub: '(---)' };
  if (!e) return { ...res, status: last ? formatClock(last.at) : 'MANUAL' };
  if (e.phase === 'inflating' || e.phase === 'deflating') return { main: String(e.cuffMmHg ?? 0), sub: 'mmHg', status: e.phase === 'inflating' ? 'NBP inflating' : 'NBP measuring' };
  if (e.phase === 'failed') return { ...res, status: 'NBP measurement failed' };
  const next = e.nextInS !== undefined ? `  next ${Math.floor(e.nextInS / 60)}:${String(Math.round(e.nextInS % 60)).padStart(2, '0')}` : '';
  return { ...res, status: `${last ? formatClock(last.at) : ''}${next}`.trim() || 'MANUAL' };
}

function tileShell(parent: HTMLElement, label: string, unit: string, color: string) {
  const doc = parent.ownerDocument;
  const el = doc.createElement('div');
  el.className = 'pme-tile';
  el.style.cssText = `color:${color};font-family:system-ui,sans-serif;padding:6px 12px;line-height:1.05;border-top:1px solid #222;`;
  const head = doc.createElement('div');
  head.style.cssText = 'font-size:14px;display:flex;justify-content:space-between;gap:12px;';
  head.innerHTML = `<span>${label}</span><span style="opacity:.8">${unit}</span>`;
  el.append(head);
  parent.append(el);
  const line = (css: string) => {
    const d = doc.createElement('div');
    d.style.cssText = css;
    el.append(d);
    return d;
  };
  return { el, line };
}

/** "S/D" large with "(M)" below (ABP, PAP, NIBP), or a single mean (CVP, PR, PI). */
export class PressureTile {
  private readonly main: HTMLDivElement;
  private readonly sub: HTMLDivElement;
  private readonly status: HTMLDivElement;

  constructor(parent: HTMLElement, label: string, unit: string, color: string) {
    const t = tileShell(parent, label, unit, color);
    this.main = t.line('font-size:34px;font-weight:600;text-align:right;font-variant-numeric:tabular-nums;');
    this.sub = t.line('font-size:20px;text-align:right;font-variant-numeric:tabular-nums;');
    this.status = t.line('font-size:12px;text-align:right;opacity:.85;min-height:14px;');
    this.main.textContent = '---/---';
  }

  set(main: string, sub: string, status = ''): void {
    this.main.textContent = main;
    this.sub.textContent = sub;
    this.status.textContent = status;
  }
}
```

Edit `packages/renderer/src/mount.ts`:

Edit 1 of 6 — find:

```ts
import { NumericTile } from './numerics-dom.ts';
```

replace with:

```ts
import { NumericTile } from './numerics-dom.ts';
import { formatNibp, formatPressure, PressureTile } from './numerics-hemo.ts'; // Stage 2
import { WAVE_STYLE, type WaveLaneId } from './wave-lanes.ts'; // Stage 2
```

Edit 2 of 6 — find:

```ts
  lanes?: LeadId[];
  fps?: 60 | 30;
```

replace with:

```ts
  lanes?: LeadId[];
  /** Stage 2: waveform lanes below the ECG lanes (their tiles appear with them). */
  waves?: WaveLaneId[];
  /** Stage 2: show the NIBP tile. */
  nibp?: boolean;
  fps?: 60 | 30;
```

Edit 3 of 6 — find:

```ts
  tiles.style.cssText = `width:${TILE_W}px;flex:none;border-left:1px solid #222;`;
```

replace with:

```ts
  tiles.style.cssText = `width:${TILE_W}px;flex:none;border-left:1px solid #222;overflow-y:auto;`; // Stage 2: scroll
```

Edit 4 of 6 — find:

```ts
  const hrTile = new NumericTile(tiles, { label: 'HR', unit: 'bpm', color: '#00ff66' });
```

replace with:

```ts
  const hrTile = new NumericTile(tiles, { label: 'HR', unit: 'bpm', color: '#00ff66' });
  // Stage 2 tiles (brief §6.1, §6.3)
  const waves = opts.waves ?? [];
  const abpTile = waves.includes('abp') ? new PressureTile(tiles, 'ABP', 'mmHg', WAVE_STYLE.abp.color) : null;
  const papTile = waves.includes('pap') ? new PressureTile(tiles, 'PAP', 'mmHg', WAVE_STYLE.pap.color) : null;
  const cvpTile = waves.includes('cvp') ? new PressureTile(tiles, 'CVP', 'mmHg', WAVE_STYLE.cvp.color) : null;
  const prTile = waves.includes('pleth') ? new PressureTile(tiles, 'PR', 'bpm', WAVE_STYLE.pleth.color) : null;
  const piTile = waves.includes('pleth') ? new PressureTile(tiles, 'PI', '%', WAVE_STYLE.pleth.color) : null;
  const nibpTile = opts.nibp ? new PressureTile(tiles, 'NBP', 'mmHg', '#ff7ad9') : null;
  let nibpLast: { sys: number; dia: number; map: number; at: number } | null = null;
  const single = (m: { value: number | null; flag: string } | undefined, digits = 0) =>
    m && m.value !== null && m.flag !== 'invalid' ? m.value.toFixed(digits) : '---';
```

Edit 5 of 6 — find:

```ts
      if (e.type === 'measurement' && e.values.hr) hrTile.update(e.values.hr);
```

replace with:

```ts
      if (e.type === 'measurement' && e.values.hr) hrTile.update(e.values.hr);
      if (e.type === 'measurement') {
        // Stage 2 tiles
        const v = e.values;
        if (abpTile && v.abpSys) {
          const p = formatPressure(v.abpSys, v.abpDia, v.abpMean);
          abpTile.set(p.main, p.sub);
        }
        if (papTile && v.papSys) {
          const p = formatPressure(v.papSys, v.papDia, v.papMean);
          papTile.set(p.main, p.sub);
        }
        if (cvpTile && v.cvpMean) cvpTile.set(single(v.cvpMean), '');
        if (prTile && v.pr) prTile.set(single(v.pr), '');
        if (piTile && v.pi) piTile.set(single(v.pi, 1), '');
        if (nibpTile && v.nibpSys && v.nibpSys.value !== null) {
          nibpLast = { sys: v.nibpSys.value, dia: v.nibpDia?.value ?? 0, map: v.nibpMean?.value ?? 0, at: e.t };
          const n = formatNibp(undefined, nibpLast);
          nibpTile.set(n.main, n.sub, n.status);
        }
      }
      if (e.type === 'nibp' && nibpTile) {
        const n = formatNibp(e, nibpLast);
        nibpTile.set(n.main, n.sub, n.status);
      }
```

Edit 6 of 6 — find:

```ts
    ...(opts.lanes ? { lanes: opts.lanes } : {}),
```

replace with:

```ts
    ...(opts.lanes ? { lanes: opts.lanes } : {}),
    ...(opts.waves ? { waves: opts.waves } : {}), // Stage 2
```

Edit `packages/renderer/src/index.ts` (after the Task 19 line):

Edit 1 of 1 — find:

```ts
export { WAVE_STYLE, scaleFor, autoRange, type WaveLaneId, type WaveStyle } from './wave-lanes.ts'; // Stage 2
```

replace with:

```ts
export { WAVE_STYLE, scaleFor, autoRange, type WaveLaneId, type WaveStyle } from './wave-lanes.ts'; // Stage 2
export { PressureTile, formatPressure, formatNibp, formatClock, type NibpView } from './numerics-hemo.ts'; // Stage 2
```

- [ ] **Step 4: Run it to see it pass, and build the IIFE**

Run: `npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run && npx -y pnpm@9.15.9 --filter @pme/renderer typecheck && npx -y pnpm@9.15.9 --filter @pme/renderer build`
Expected: PASS (31 tests); `dist/patient-monitor.iife.js` builds (≈ 150 kB with the Stage 6a transports).

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/numerics-hemo.ts packages/renderer/src/mount.ts packages/renderer/src/index.ts packages/renderer/test/numerics-hemo.test.ts
git commit -m "feat(renderer): ABP/CVP/PAP/PR/PI tiles and NIBP tile with live cuff, phase and hh:mm timestamp" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 21: `stage2.html` demo and a headless smoke screenshot

**Files:**
- Create: `apps/demo/stage2.html`, `apps/demo/src/stage2.ts`
- Modify: `apps/demo/vite.config.ts`, `apps/demo/index.html`

**Interfaces:**
- Consumes: `mountMonitor` with `waves`/`nibp` (Task 20), `RHYTHM_IDS` (Stage 1), all Stage 2 commands.
- Produces: the Gate 2 demo page. (Stage 6a adds its own pages in parallel; if `vite.config.ts` or `index.html` conflict at merge, keep both sets of lines.)

- [ ] **Step 1: Write the page**

`apps/demo/stage2.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stage 2: haemodynamics</title>
    <style>
      body { background: #000; color: #ccc; font: 14px system-ui, sans-serif; margin: 12px; }
      #monitor { height: 600px; max-width: 1240px; border: 1px solid #333; }
      .controls { display: flex; flex-wrap: wrap; gap: 10px 18px; align-items: center; margin: 10px 0; max-width: 1240px; }
      .controls label { display: inline-flex; gap: 6px; align-items: center; }
      fieldset { border: 1px solid #333; padding: 6px 10px; }
      legend { color: #888; }
      button, select, input { font: inherit; }
      button[aria-pressed='true'] { background: #2a2; color: #000; }
      #diag { font: 13px ui-monospace, monospace; white-space: pre; color: #8f8; }
    </style>
  </head>
  <body>
    <div id="monitor"></div>
    <div class="controls">
      <fieldset><legend>Rhythm</legend>
        <select id="rhythm"></select>
        <label>HR <input id="hr" type="range" min="20" max="250" value="75" /> <span id="hrVal">75</span></label>
        <button id="pvc" aria-pressed="false">PVC bigeminy</button>
      </fieldset>
      <fieldset><legend>Targets</legend>
        <label>SBP <input id="sbp" type="number" min="0" max="300" value="120" style="width:4em" /></label>
        <label>DBP <input id="dbp" type="number" min="0" max="300" value="80" style="width:4em" /></label>
        <label>CVP <input id="cvp" type="number" min="-5" max="40" value="6" style="width:4em" /></label>
        <label>Ramp <select id="ramp"><option value="0">0 s</option><option value="10">10 s</option><option value="30" selected>30 s</option><option value="60">60 s</option></select></label>
        <label>Volume <input id="vol" type="range" min="0" max="1" step="0.05" value="1" /></label>
        <button id="apply">Apply targets</button>
      </fieldset>
      <fieldset><legend>Arterial line</legend>
        <select id="damp"><option value="normal">Normal (fn 20, ζ 0.45)</option><option value="under">Under-damped (fn 12, ζ 0.2)</option><option value="over">Over-damped (ζ 1.2)</option></select>
        <button id="flush">Flush</button>
        <button id="zero">Zero</button>
      </fieldset>
      <fieldset><legend>NIBP</legend>
        <button id="nibpStart">Start</button>
        <button id="nibpAuto">Auto 5 min</button>
        <button id="nibpStat">STAT</button>
        <button id="nibpStop">Stop</button>
        <label>Cuff <select id="cuffSite"><option value="rightArm">right arm</option><option value="leftArm">left arm (A-line arm)</option></select></label>
      </fieldset>
      <fieldset><legend>Sensors</legend>
        <button id="sAbp" aria-pressed="true">ABP</button>
        <button id="sCvp" aria-pressed="true">CVP</button>
        <button id="sSpo2" aria-pressed="true">SpO2</button>
        <button id="sNibp" aria-pressed="true">NIBP cuff</button>
      </fieldset>
      <fieldset><legend>Arrest</legend>
        <button id="vf">VF / pulseless</button>
        <button id="cpr" aria-pressed="false">CPR</button>
      </fieldset>
      <button id="sound">Enable sound</button>
    </div>
    <div id="diag"></div>
    <script type="module" src="./src/stage2.ts"></script>
  </body>
</html>
```

`apps/demo/src/stage2.ts`:

```ts
// Stage 2 demo (BUILD-PLAN Stage 2 "Demo"): ECG II + V5, ABP, pleth and CVP lanes; HR, ABP, CVP, PR, PI and
// NIBP tiles; instructor controls for targets with ramps, rhythm, line damping, flush/zero, NIBP and sensors.
import { RHYTHM_IDS, type Command, type RhythmId, type RhythmOpts } from '@pme/engine-core';
import { mountMonitor } from '@pme/renderer';

const RHYTHM_MENU: Array<[string, RhythmId, RhythmOpts?]> = [
  ['Sinus', 'sinus'],
  ['Sinus bradycardia', 'sinusBrady'],
  ['Sinus tachycardia', 'sinusTachy'],
  ['Atrial fibrillation', 'afib'],
  ['Atrial flutter 2:1', 'aflutter', { ratio: 2 }],
  ['Atrial flutter 4:1', 'aflutter', { ratio: 4 }],
  ['SVT (AVNRT)', 'svtAvnrt'],
  ['1st-degree AV block', 'avb1'],
  ['2nd-degree Mobitz I', 'avb2Mobitz1'],
  ['3rd-degree, narrow escape', 'avb3Narrow'],
  ['3rd-degree, wide escape', 'avb3Wide'],
  ['Monomorphic VT 170', 'vtMono'],
  ['Monomorphic VT 220 (pulseless)', 'vtMono', { rateBpm: 220 }],
  ['Asystole', 'asystole'],
];

/** A Command without id/issuedBy (distributes over the union so each variant keeps its fields). */
type CommandBody = Command extends infer C ? (C extends Command ? Omit<C, 'id' | 'issuedBy'> : never) : never;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const pm = mountMonitor($('monitor'), {
  skin: 'philips-like',
  engine: { seed: 7, patient: { sensors: { abp: 'connected', cvp: 'connected', spo2: 'on', nibp: 'on' } } },
  lanes: ['ecgII', 'V5'],
  waves: ['abp', 'pleth', 'cvp'],
  nibp: true,
});
let n = 0;
const send = (c: CommandBody) =>
  pm.dispatch({ id: `demo-${++n}`, issuedBy: 'stage2', ...c } as Command).then((r) => {
    if (!r.accepted) console.warn('rejected', c, r.reason);
    return r;
  });

// Rhythm and HR
const rhythmSel = $<HTMLSelectElement>('rhythm');
RHYTHM_MENU.forEach(([label], i) => rhythmSel.add(new Option(label, String(i))));
rhythmSel.addEventListener('change', () => {
  const [, rhythm, opts] = RHYTHM_MENU[Number(rhythmSel.value)]!;
  void send({ type: 'setRhythm', rhythm, ...(opts ? { opts } : {}), when: 'now' });
});
const hr = $<HTMLInputElement>('hr');
hr.addEventListener('input', () => ($('hrVal').textContent = hr.value));
hr.addEventListener('change', () => void send({ type: 'setTarget', variable: 'hr', value: Number(hr.value), ...ramp() }));

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

// Targets (MANUAL setTarget with ramps; one stageGroup so SBP/DBP/CVP move together)
function ramp(): { ramp?: { durationS: number; curve: 'linear' } } {
  const durationS = Number($<HTMLSelectElement>('ramp').value);
  return durationS > 0 ? { ramp: { durationS, curve: 'linear' } } : {};
}
$('apply').addEventListener('click', () => {
  const g = `targets-${n}`;
  void send({ type: 'setTarget', variable: 'sbp', value: Number($<HTMLInputElement>('sbp').value), ...ramp(), stageGroup: g });
  void send({ type: 'setTarget', variable: 'dbp', value: Number($<HTMLInputElement>('dbp').value), ...ramp(), stageGroup: g });
  void send({ type: 'setTarget', variable: 'cvp', value: Number($<HTMLInputElement>('cvp').value), ...ramp(), stageGroup: g });
});
$('vol').addEventListener('change', () => void send({ type: 'setTarget', variable: 'volumeStatus', value: Number($<HTMLInputElement>('vol').value), ...ramp() }));

// Arterial line
const DAMP = { normal: { value: 0.45, fnHz: 20 }, under: { value: 0.2, fnHz: 12 }, over: { value: 1.2, fnHz: 20 } } as const;
$('damp').addEventListener('change', () => {
  const d = DAMP[$<HTMLSelectElement>('damp').value as keyof typeof DAMP];
  void send({ type: 'applyEvent', event: { kind: 'line', line: 'abp', action: 'damp', ...d } });
});
$('flush').addEventListener('click', () => void send({ type: 'applyEvent', event: { kind: 'line', line: 'abp', action: 'flush' } }));
$('zero').addEventListener('click', () => void send({ type: 'applyEvent', event: { kind: 'line', line: 'abp', action: 'zero' } }));

// NIBP
$('nibpStart').addEventListener('click', () => void send({ type: 'device', action: { device: 'nibp', action: 'start' } }));
$('nibpAuto').addEventListener('click', () => void send({ type: 'device', action: { device: 'nibp', action: 'auto', intervalMin: 5 } }));
$('nibpStat').addEventListener('click', () => void send({ type: 'device', action: { device: 'nibp', action: 'stat' } }));
$('nibpStop').addEventListener('click', () => void send({ type: 'device', action: { device: 'nibp', action: 'stop' } }));
$('cuffSite').addEventListener('change', () => {
  const site = $<HTMLSelectElement>('cuffSite').value;
  // the SpO2 probe sits on the left finger, the A-line in the left radial: a left-arm cuff occludes both
  void send({ type: 'attachSensor', sensor: 'nibp', state: 'on', site });
});

// Sensors
toggle('sAbp', (p) => void send({ type: 'attachSensor', sensor: 'abp', state: p ? 'connected' : 'none' }));
toggle('sCvp', (p) => void send({ type: 'attachSensor', sensor: 'cvp', state: p ? 'connected' : 'none' }));
toggle('sSpo2', (p) => void send({ type: 'attachSensor', sensor: 'spo2', state: p ? 'on' : 'off' }));
toggle('sNibp', (p) => void send({ type: 'attachSensor', sensor: 'nibp', state: p ? 'on' : 'off' }));

// Arrest: VF when the rhythm library has it (Stage 5), else pulseless VT 220
$('vf').addEventListener('click', () => {
  const vf = (RHYTHM_IDS as readonly string[]).includes('vfCoarse');
  void send(vf ? ({ type: 'setRhythm', rhythm: 'vfCoarse' as RhythmId, when: 'now' } as CommandBody) : { type: 'setRhythm', rhythm: 'vtMono', opts: { rateBpm: 220 }, when: 'now' });
});
toggle('cpr', (p) => void send({ type: 'applyEvent', event: { kind: 'cpr', active: p, rate: 110, quality: 1 } }));

const soundBtn = $<HTMLButtonElement>('sound');
soundBtn.addEventListener('click', () => {
  void pm.enableSound().then(() => {
    soundBtn.textContent = 'Sound on';
    soundBtn.disabled = true;
  });
});

// Diagnostics: render path, L1 truth vs displayed ABP, NIBP phase
let path = '…';
void pm.renderPath.then((p) => (path = p));
let truth = '';
let shown = '';
let nibp = '';
pm.on((e) => {
  if (e.type === 'state') truth = `truth ${e.values.sbp?.toFixed(0)}/${e.values.dbp?.toFixed(0)} cvp ${e.values.cvp?.toFixed(1)} svr ${e.values.svr?.toFixed(2)} flags ${JSON.stringify(e.control)}`;
  if (e.type === 'measurement' && e.values.abpSys?.value != null) shown = `shown ${e.values.abpSys.value.toFixed(0)}/${e.values.abpDia?.value?.toFixed(0)} (${e.values.abpMean?.value?.toFixed(0)})`;
  if (e.type === 'nibp') nibp = `nibp ${e.phase}${e.cuffMmHg !== undefined ? ` cuff ${e.cuffMmHg}` : ''}${e.result ? ` → ${e.result.sys}/${e.result.dia} (${e.result.map})` : ''}`;
});
setInterval(() => ($('diag').textContent = `render path: ${path}\n${truth}\n${shown}\n${nibp}`), 1000);
```

Edit `apps/demo/vite.config.ts` (Stages 5 and 6a add their own pages to the same list — keep every entry at merge):

Edit 1 of 1 — find:

```ts
        index: page('index'), stage0: page('stage0'), stage1: page('stage1'),
```

replace with:

```ts
        index: page('index'), stage0: page('stage0'), stage1: page('stage1'),
        stage2: page('stage2'), // Stage 2
```

Edit `apps/demo/index.html`:

Edit 1 of 1 — find:

```html
      <li><a href="./stage1.html">Stage 1: ECG rhythm engine, sweep and beep</a></li>
```

replace with:

```html
      <li><a href="./stage1.html">Stage 1: ECG rhythm engine, sweep and beep</a></li>
      <li><a href="./stage2.html">Stage 2: haemodynamics (ABP, pleth, CVP, NIBP)</a></li>
```

- [ ] **Step 2: Typecheck and build**

Run: `npx -y pnpm@9.15.9 --filter @pme/demo typecheck && npx -y pnpm@9.15.9 --filter @pme/demo build`
Expected: PASS; `dist/stage2.html` and `dist/assets/stage2-*.js` exist.

- [ ] **Step 3: Headless smoke screenshot (system Chrome through Playwright; not the Browser pane)**

Serve the build: `python3 -m http.server 5288 --directory apps/demo/dist` (in a second terminal, or backgrounded). Save this script OUTSIDE the repo, e.g. as `$TMPDIR/pme-stage2-shot.mjs`:

```js
import { chromium } from '/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo/node_modules/@playwright/test/index.mjs';
const out = '/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo/docs/gates/stage-2';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5288/stage2.html');
await page.waitForTimeout(3000);
await page.click('#nibpStart');
await page.waitForTimeout(12000);
await page.screenshot({ path: `${out}/sinus-nibp-measuring.png` });
await page.waitForTimeout(25000);
await page.screenshot({ path: `${out}/sinus-nibp-done.png` });
await page.selectOption('#damp', 'under');
await page.waitForTimeout(8000);
await page.screenshot({ path: `${out}/underdamped.png` });
await page.click('#flush');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/flush.png` });
await page.selectOption('#damp', 'normal');
await page.selectOption('#rhythm', { label: 'Atrial fibrillation' });
await page.waitForTimeout(10000);
await page.screenshot({ path: `${out}/afib.png` });
await page.click('#vf');
await page.waitForTimeout(22000);
await page.screenshot({ path: `${out}/pulseless.png` });
await page.click('#cpr');
await page.waitForTimeout(10000);
await page.screenshot({ path: `${out}/cpr.png` });
console.log('diag:', await page.textContent('#diag'));
console.log('errors:', errors);
await browser.close();
```

Run: `mkdir -p docs/gates/stage-2 && node "$TMPDIR/pme-stage2-shot.mjs"`, then stop the server.
Expected: `render path: worker-raf`; `truth 120/80 … shown 11x/7x-8x`; the NIBP line ends with a result; `errors` lists at most a favicon 404. Look at every PNG: sinus shows steep radial upstrokes with a dicrotic notch, a cyan pleth ≈ 250 ms after each R, a blue CVP with a/c/v; the NBP tile shows the live cuff while measuring and `S/D (M)` + `00:00` afterwards; under-damped shows a spikier ABP; flush shows the clipped square wave and ringing; AF shows irregular pulses with some missing; pulseless shows flat ABP ≈ 12 mmHg and a flat pleth; CPR shows compression pulses ≈ 91–95/20–22 and CVP spikes clipped at the top of the CVP lane.

- [ ] **Step 4: Commit**

```bash
git add apps/demo/stage2.html apps/demo/src/stage2.ts apps/demo/vite.config.ts apps/demo/index.html docs/gates/stage-2/*.png
git commit -m "feat(demo): stage2 monitor — ABP, pleth, CVP lanes, pressure/NIBP tiles and instructor controls" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 22: Verify before the gate, write the gate note, open the pull request

**Files:**
- Create: `docs/gates/stage-2.md`

**Interfaces:**
- Consumes: everything above.
- Produces: the gate evidence and the PR (R20).

- [ ] **Step 1: Verify-before-gate (brief §10).** Run `grep -rn "VERIFY" packages/engine-core/src` → expect no matches. The only research items this stage leans on that §11 still lists as open are the Weissler **PEP intercept** (131 vs 133 ms by sex, slope confirmed; irrelevant at the ±20 ms test tolerance) — note it in the gate file.

- [ ] **Step 2: Partition check.** `git diff main --stat -- packages/engine-core/src/l2/ecg packages/engine-core/templates packages/controller` → no output. `git diff main -- packages/engine-core/src/engine.ts | grep '^-' | grep -v '^---'` → only the two changed lines (`const tick` → `let tick`, and the `syncLaneBuffers` deletion condition).

- [ ] **Step 3: Clean-clone rehearsal.** `rm -rf "$TMPDIR/pme-ci" && git clone "$(pwd)" "$TMPDIR/pme-ci" && cd "$TMPDIR/pme-ci" && git checkout stage-2-haemodynamics && npx -y pnpm@9.15.9 install --frozen-lockfile && npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices; echo "exit $?"; cd -` → `exit 0`. Record the test totals (engine-core 177, renderer 31, controller 97, audio 19, validation 6, skins 1); `check-notices: OK (1 governed files)` (Stage 1.1's vendored cyrb53). Then the browser smoke suite: `PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 test:e2e` → 10 passed (Stage 1 IIFE smoke + Stage 6a host/remote/viewer, latency and screens), ≈ 2 min.

- [ ] **Step 4: Write `docs/gates/stage-2.md`** (fill every cell with measured values from Tasks 14–21):

```markdown
# Gate 2 — Haemodynamics (date: YYYY-MM-DD)

Gate question: "Do the ABP and pleth follow the ECG with the right delay and shape, do the numbers always agree with the drawn waves, and does NIBP behave like a cuff rather than a readout?"

| Check | Result |
|---|---|
| Clean clone typecheck/test/build/check-notices (test totals) | |
| Acceptance 1: R→radial foot, R→pleth foot, pleth − radial, notch error (ms) at HR 60/90/120 | |
| Acceptance 2: displayed MAP − waveform mean (mmHg) | |
| Acceptance 3: ABP 10 beats after the 90/50 ramp | |
| Acceptance 4: radial PP at SV 70, C 1.5 (mmHg) | |
| Acceptance 5: AF short-RR beats with PP < 5; PR vs HR; k = 0 beat; post-PVC ΔSBP | |
| Acceptance 6: asystole / VT 220 (/ VF once Stage 5 lands) plateau and flatness | |
| Acceptance 7: CPR trace and post-pause level | |
| Acceptance 8: ΔSBP/ΔMAP fn 10 ζ 0.2; ΔSBP/ΔDBP/ΔMAP ζ 1.2; ring period | |
| Acceptance 9: first-cycle duration; bias/SD over 100; AF duration/SD; SBP 45 failure; manual cancels auto; same-limb pleth | |
| Acceptance 10: PPV at g 0.05 / 0.2; SPV ratio | |
| Acceptance 11: a-wave delay; AF | |
| Determinism hash; 24 h no drift (125 Hz) | |
| Demo screenshots (docs/gates/stage-2/*.png) reviewed | |
| Realism review (informative): ABP and pleth shape vs Ali's OR monitor | |

Plan decisions needing a ruling: peaking radial transfer (2), ejection skew (3), E(k) valve-opening map (4), Frank–Starling carry-over (5), NIBP envelope width factor 1.0 (8), exp ramp τ = duration/3 (14).
Open research item: Weissler PEP intercept by sex (research 03 §11 #10).
Notes:
```

- [ ] **Step 5: Commit the gate note**

```bash
git add docs/gates/stage-2.md
git commit -m "docs(gates): stage 2 gate evidence" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 6: Push and open the pull request (do not merge)**

```bash
git push -u origin stage-2-haemodynamics
gh pr create --base main --head stage-2-haemodynamics \
  --title "Stage 2: haemodynamics — ABP/CVP/PAP, pleth, NIBP, pressure numerics" \
  --body "$(cat <<'BODY'
Implements BUILD-PLAN Stage 2 per docs/plans/stage-2-haemodynamics.md.

- L1 PatientState (MANUAL targets with ramps, flags, pin/release, stageGroup); M1–M3 coupling; PPV (M6 part)
- 4-element Windkessel + radial resonator + pulmonary Windkessel (RK4, 2 ms), transducer with flush/zero/damping, parametric CVP
- Pleth per mechanical beat; slope-sum PR; per-beat S/D/M by integral; oscillometric NIBP cycle with modes and failures
- Renderer: ABP/pleth/CVP/PAP lanes and tiles; demo `stage2.html`
- All 11 BUILD-PLAN acceptance tests + extras in Vitest; gate evidence in docs/gates/stage-2.md

Partition: no changes under `src/l2/ecg/**`, `templates/**` or `packages/controller/**`; engine.ts/types.ts edits are additive and marked `// Stage 2`. Expected trivial merge conflicts with the parallel stages (keep both sides): Stage 5 edits the neighbouring expectations in `test/engine/engine-commands.test.ts`, the `generateVcg` call just above this stage's `advanceHemo` call in `engine.ts`, and `apps/demo/vite.config.ts`; Stage 5 also adds brief §7.3's `alarm` event verbatim — identical to `HemoEvent`'s `alarm`, so whichever lands second may drop its copy; Stage 6a (already merged) needed two small follow-ups here: its log formatter covers the new command variants, and two of its host tests now see the engine's own `state` (E1) and accept `setTarget sbp`. Its HostSession still rejects `pin`/`release`/`setMode` at the controller level (its own policy, "MODELED only"); the engine accepts them in MANUAL — reconcile in 6b/7. The PEA/VF contract with Stage 5 (`mech.perfused === false ⇔ kSV === 0`) is what `PULSELESS`/E(k) consume.

Decisions needing a ruling are listed at the top of the plan and in the gate note.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

Expected: the PR URL. Stop here: Stage 3 starts only after the orchestrator's gate review and Ali's merge (R11, R20).

---

## Acceptance-test index (BUILD-PLAN Stage 2 → where it lives)

| # | Test | File (task) |
|---|---|---|
| 1 | R→radial foot 150–220 ms at HR 60/90/120; pleth foot 200–300 ms after R and 20–100 ms after the radial foot; notch at PEP + LVET + PTT ± 20 ms | `test/engine/hemo-acceptance.test.ts` (14) |
| 2 | Displayed MAP within ±1 mmHg of the waveform time-average | `test/engine/hemo-acceptance.test.ts` (14); per-beat integral in `test/l3/pressure-numerics/numerics.test.ts` (10) |
| 3 | 90/50 with a 30 s ramp in sinus 80: ±3 mmHg 10 beats after the ramp; monotonic | `test/engine/hemo-acceptance.test.ts` (14) |
| 4 | SV 70, C 1.5 → PP 40–55 | `test/l2/hemo/circulation.test.ts` (4) |
| 5 | AF: RR < 350 ms beats with PP < 5, PR < HR; PVC < 45% coupling no upstroke; post-PVC SBP +8–15 | `test/engine/hemo-acceptance.test.ts` 5a/5b/5c (15) |
| 6 | Pulseless (VF when Stage 5 lands; asystole, VT 220 now): 10–15 mmHg, non-pulsatile within 20 s | `test/engine/hemo-acceptance.test.ts` (15) |
| 7 | CPR 110, quality 1: 70–110/10–30; pause collapses within 5 s | `test/engine/hemo-acceptance.test.ts` (15) |
| 8 | fn 10/ζ 0.2: SBP +5–30, MAP ±2; ζ 1.2: SBP ↓, DBP ↑, MAP ±2; flush period 1/fn ± 5% | `test/engine/hemo-acceptance.test.ts` (16); unit flush in `test/l2/hemo/line.test.ts` (5) |
| 9 | NIBP: 25–35 s; bias ≤ 5 / SD ≤ 8 over 100; AF longer and noisier; SBP 45 fails after 2 attempts with INOP; manual cancels auto; same-limb pleth flat | `test/engine/hemo-nibp.test.ts` (17); unit in `test/l3/nibp/nibp.test.ts` (11) |
| 10 | PPV 5–10% at g 0.05, 15–30% at g 0.2 | `test/engine/hemo-acceptance.test.ts` (16) |
| 11 | CVP a wave 80–100 ms after P onset; none in AF | `test/engine/hemo-acceptance.test.ts` (16); unit in `test/l2/hemo/cvp.test.ts` (6) |
| extra | AF PP variability, PPV/SPV vs volumeStatus, NIBP ≈ IBP MAP, determinism hash, 24 h no drift at 125 Hz | `hemo-acceptance`, `hemo-nibp`, `hemo-longrun` (15–18) |

## Self-review (done while writing)

1. **Spec coverage.** BUILD-PLAN Stage 2 scope → tasks: L1 schema/ramps/flags/stageGroup (2, 13); k_rhythm/f_fill/PESP/Weissler (3, 12); Windkessel RK4 2 ms, radial transfer, transducer, 12 Hz filter (4, 5); M2 tracker (7); arrest decay to Pmsf and CPR pump (3, 12, test 15); CVP (6); PAP incl. wedge (4, 12); pleth with site delay/PI/tone (8); breath clock + PPV (3, 12); line events flush/zero/damp/disconnect/level/sample (5); NIBP envelope/Rs-Rd/modes/failures/same-limb (11, 12, 17); L3 numerics S/D/M by integral, PR from pleth/ABP, PI (9, 10); sensors abp/cvp/pap/spo2/nibp (12, 13); events nibp and state (12, 13); renderer lanes and tiles (19, 20); demo (21). Out of scope as stated: SpO2 numeric (Stage 3), MODELED (Stage 7), alarm engine (Stage 4; only the NIBP INOP is emitted), dropped transducer, motion/shiver events (Stage 5 artefacts).
2. **Placeholder scan.** No TBD/TODO; every code step shows the code; the gate template's empty cells are the gate's measured values by design.
3. **Type consistency.** `SiteBeat.ref` (tracker) matches `SiteBeatStat.ref` (pipeline); `RhythmView` is structurally satisfied by the engine's `RhythmState`; `HemoChannel` ⊂ `ChannelId`; `WaveLaneId` values equal the engine channel IDs; `NibpOut` phases equal `NibpPhase`; every `Measured` flag used (`valid`, `questionable`, `invalid`) exists in Stage 1's type; Stage 6a's `ExtraCommand`/`ExtraEvent` copies of `pin`/`release`/`setMode`/`nibp`/`state`/`alarm` are identical to this plan's shapes, so `WireCommand`/`WireEvent` stay valid (6a's comment says to delete its copies once engine-core exports them — a 6b clean-up).
4. **Mechanical check.** The document itself was parsed (35 created files, 49 find/replace blocks, 1 append), applied to `main` `8e46032`, and compared byte-for-byte with the prototype that passes every suite listed under "Prototype results".
